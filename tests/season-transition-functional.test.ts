import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleSeasonTransition } from '../worker/season-transition';

let db: DatabaseSync;

function env() {
  const DB = {
    prepare(sql: string) {
      let args: any[] = [];
      return {
        bind(...values: any[]) { args = values; return this; },
        async first() { return db.prepare(sql).get(...args) ?? null; },
        async all() { return { results: db.prepare(sql).all(...args) }; },
        async run() {
          const r = db.prepare(sql).run(...args);
          return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
        },
      };
    },
    async batch(statements: any[]) {
      db.exec('BEGIN');
      try {
        const rows = [];
        for (const statement of statements) rows.push(await statement.run());
        db.exec('COMMIT');
        return rows;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { DB: DB as unknown as D1Database };
}

async function call(path: string, method = 'GET', body?: object) {
  const request = new Request('http://local/api/' + path, {
    method,
    headers: { cookie: 'prode_session=admin', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const response = await handleSeasonTransition(request, env());
  if (!response) throw new Error('No route ' + path);
  return response;
}

let nextEntry = 1;
function addLeagueResult(competitionId: number, userId: string, position: number) {
  const entryId = nextEntry++;
  db.prepare(
    `INSERT INTO competition_entries(id,competition_id,entry_type,display_name)
     VALUES (?,?,'INDIVIDUAL',?)`,
  ).run(entryId, competitionId, userId);
  db.prepare('INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)').run(entryId, userId);
  db.prepare(
    `INSERT INTO competition_results
      (competition_id,entry_id,result_code,final_position,confirmed_by_user_id)
     VALUES (?,?,'POSITION',?,'admin')`,
  ).run(competitionId, entryId, position);
}

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  nextEntry = 1;
  for (const file of readdirSync('migrations').filter((file) => file.endsWith('.sql')).sort()) {
    db.exec(readFileSync('migrations/' + file, 'utf8'));
  }

  db.prepare(
    `INSERT INTO users(id,full_name,phone_normalized,password_hash,role)
     VALUES ('admin','Admin','admin','hash','admin')`,
  ).run();
  db.prepare(
    `INSERT INTO sessions(id,user_id,token_hash,expires_at)
     VALUES ('admin','admin',?,'2099-01-01')`,
  ).run(createHash('sha256').update('admin').digest('hex'));

  db.exec(
    `INSERT INTO tafa_seasons(id,season_number,name,status) VALUES (1,32,'T32','finished');
     INSERT INTO season_divisions(id,season_id,code,name,sort_order) VALUES
       (10,1,'A','Liga A',10),(11,1,'B','Liga B',20);
     INSERT INTO competitions(id,season_id,division_id,code,canonical_name,display_name,family,status) VALUES
       (1,1,10,'LIGA_A','Liga A','Liga A','LEAGUE','finished'),
       (2,1,11,'LIGA_B','Liga B','Liga B','LEAGUE','finished');`,
  );

  for (let i = 1; i <= 8; i++) {
    const id = 'P' + i;
    db.prepare(
      `INSERT INTO users(id,full_name,phone_normalized,password_hash,role)
       VALUES (?,?,?,?, 'participant')`,
    ).run(id, id, id, 'hash');
    db.prepare(
      'INSERT INTO season_division_members(season_id,division_id,user_id) VALUES (1,?,?)',
    ).run(i <= 4 ? 10 : 11, id);
  }

  for (let position = 1; position <= 4; position += 1) {
    addLeagueResult(1, 'P' + position, position);
    addLeagueResult(2, 'P' + (position + 4), position);
  }
});

afterEach(() => db.close());

describe('Transicion de temporada funcional', () => {
  it('genera un plan auditable y marca el desbalance que requiere revision Admin', async () => {
    const response = await call('admin/competition-engine/seasons/1/transition-plan', 'POST', {});
    expect(response.status).toBe(201);
    const data = await response.json() as any;
    expect(data.plan.sourceSeasonNumber).toBe(32);
    expect(data.plan.targetSeasonNumber).toBe(33);
    expect(data.plan.assignments).toHaveLength(8);
    expect(data.plan.issues.some((issue: any) => issue.code === 'LIGA_A_SIZE_MISMATCH')).toBe(true);

    const byUser = new Map(data.plan.assignments.map((row: any) => [row.userId, row]));
    expect((byUser.get('P3') as any).proposedDivisionCode).toBe('B');
    expect((byUser.get('P4') as any).proposedDivisionCode).toBe('B');
    expect((byUser.get('P5') as any).proposedDivisionCode).toBe('A');
  });

  it('exige IFFHS antes de aplicar y crea T33 draft con las divisiones confirmadas', async () => {
    const generated = await call('admin/competition-engine/seasons/1/transition-plan', 'POST', {});
    const plan = (await generated.json() as any).plan;

    const assignments = plan.assignments.map((row: any) => ({
      userId: row.userId,
      divisionCode: row.userId === 'P6' ? 'A' : row.proposedDivisionCode,
      reason: row.userId === 'P6' ? 'Corrimiento manual para mantener cuatro participantes en A' : null,
    }));

    const confirmed = await call(
      `admin/competition-engine/transition-plans/${plan.id}/confirm`,
      'PUT',
      { assignments },
    );
    expect(confirmed.status).toBe(200);

    const blocked = await call(
      `admin/competition-engine/transition-plans/${plan.id}/apply`,
      'POST',
      {},
    );
    expect(blocked.status).toBe(409);
    expect(String((await blocked.json() as any).error)).toContain('IFFHS');

    for (let i = 1; i <= 8; i++) {
      db.prepare(
        `INSERT INTO iffhs_season_totals(season_number,user_id,total_points_scaled,source)
         VALUES (32,?,?,'imported')`,
      ).run('P' + i, i * 100);
    }

    const applied = await call(
      `admin/competition-engine/transition-plans/${plan.id}/apply`,
      'POST',
      {},
    );
    expect(applied.status).toBe(200);
    const data = await applied.json() as any;
    expect(data.targetSeason.seasonNumber).toBe(33);
    expect(data.targetSeason.status).toBe('draft');

    const season = db.prepare('SELECT id,status FROM tafa_seasons WHERE season_number=33').get() as any;
    expect(season.status).toBe('draft');

    const counts = db.prepare(
      `SELECT sd.code,COUNT(*) total
       FROM season_division_members sdm
       JOIN season_divisions sd ON sd.id=sdm.division_id
       WHERE sdm.season_id=?
       GROUP BY sd.code ORDER BY sd.code`,
    ).all(season.id) as any[];
    expect(counts).toEqual([
      { code: 'A', total: 4 },
      { code: 'B', total: 4 },
    ]);

    const codes = db.prepare(
      'SELECT code FROM competitions WHERE season_id=? ORDER BY sort_order,code',
    ).all(season.id) as any[];
    expect(codes.map((row) => row.code)).toEqual(
      expect.arrayContaining([
        'LIGA_A','LIGA_B','COPA_A','COPA_B','COPA_TOTAL',
        'COPA_DUOS','COPA_CAMPEONES','COPA_PAPA','PROMOCION',
      ]),
    );
  });
});

async function confirmedPlan(){
 const response=await call('admin/competition-engine/seasons/1/transition-plan','POST',{});
 const plan=(await response.json() as any).plan;
 const assignments=plan.assignments.map((a:any)=>({userId:a.userId,divisionCode:a.proposedDivisionCode,reason:'Revisión Admin de destinos'}));
 expect((await call(`admin/competition-engine/transition-plans/${plan.id}/confirm`,'PUT',{assignments})).status).toBe(200);
 return plan;
}
function completeIffhs(){for(let i=1;i<=8;i++)db.prepare("INSERT INTO iffhs_season_totals(season_number,user_id,total_points_scaled,source) VALUES (32,?,100,'calculated')").run('P'+i);}
describe('Transición Admin: bloqueos actuales y recuperación',()=>{
 it('recupera el plan sin crearlo al consultar la temporada',async()=>{
  expect(await (await call('admin/competition-engine/seasons/1/transition-plan')).json()).toEqual({plan:null});
  expect((db.prepare('SELECT COUNT(*) n FROM season_transition_plans').get() as any).n).toBe(0);
  const p=await confirmedPlan();
  const loaded=await (await call('admin/competition-engine/seasons/1/transition-plan')).json() as any;
  expect(loaded.plan.id).toBe(p.id);expect(loaded.plan.status).toBe('confirmed');
  expect(loaded.plan.applicationBlockers.some((b:any)=>b.code==='IFFHS_INCOMPLETE')).toBe(true);
 });
 it('bloquea inactivos sin excluirlos, reactivarlos ni crear T33',async()=>{
  db.exec("UPDATE users SET is_active=0 WHERE id='P3'");
  const p=await confirmedPlan();completeIffhs();
  const loaded=await (await call(`admin/competition-engine/transition-plans/${p.id}`)).json() as any;
  expect(loaded.plan.assignments).toHaveLength(8);expect(loaded.plan.assignments.find((a:any)=>a.userId==='P3').isActive).toBe(false);
  expect(loaded.plan.applicationBlockers.find((b:any)=>b.code==='INACTIVE_POLICY_UNDEFINED').userIds).toEqual(['P3']);
  const response=await call(`admin/competition-engine/transition-plans/${p.id}/apply`,'POST',{});
  expect(response.status).toBe(409);expect((await response.json() as any).error).toContain('inactivos');
  expect(db.prepare('SELECT id FROM tafa_seasons WHERE season_number=33').get()).toBeUndefined();
  expect((db.prepare("SELECT is_active FROM users WHERE id='P3'").get() as any).is_active).toBe(0);
 });
 it('revalida desactivación ocurrida después de confirmar el plan',async()=>{
  const p=await confirmedPlan();completeIffhs();db.exec("UPDATE users SET is_active=0 WHERE id='P2'");
  expect((await call(`admin/competition-engine/transition-plans/${p.id}/apply`,'POST',{})).status).toBe(409);
  expect(db.prepare('SELECT id FROM tafa_seasons WHERE season_number=33').get()).toBeUndefined();
 });
 it('no acepta totales de otras personas como IFFHS del roster',async()=>{
  const p=await confirmedPlan();completeIffhs();db.exec("DELETE FROM iffhs_season_totals WHERE user_id='P8'; INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES ('outsider','Otro','other','hash','participant'); INSERT INTO iffhs_season_totals(season_number,user_id,total_points_scaled,source) VALUES (32,'outsider',100,'imported');");
  const response=await call(`admin/competition-engine/transition-plans/${p.id}/apply`,'POST',{});
  expect(response.status).toBe(409);expect((await response.json() as any).error).toContain('P8');
  expect(db.prepare('SELECT id FROM tafa_seasons WHERE season_number=33').get()).toBeUndefined();
 });
 it('no modifica una T33 existente y muestra su estado real',async()=>{
  const p=await confirmedPlan();completeIffhs();db.exec("INSERT INTO tafa_seasons(season_number,name,status) VALUES (33,'Existente','draft')");
  const response=await call(`admin/competition-engine/transition-plans/${p.id}/apply`,'POST',{});expect(response.status).toBe(409);
  expect((db.prepare('SELECT name FROM tafa_seasons WHERE season_number=33').get() as any).name).toBe('Existente');
  const loaded=await (await call(`admin/competition-engine/transition-plans/${p.id}`)).json() as any;expect(loaded.plan.targetSeason.status).toBe('draft');
 });
 it('exige motivo al cambiar propuesta o al revisar aunque conserve destino',async()=>{
  const p=(await (await call('admin/competition-engine/seasons/1/transition-plan','POST',{})).json() as any).plan;
  const assignments=p.assignments.map((a:any)=>({userId:a.userId,divisionCode:a.proposedDivisionCode,reason:''}));assignments[0].divisionCode=assignments[0].divisionCode==='A'?'B':'A';
  expect((await call(`admin/competition-engine/transition-plans/${p.id}/confirm`,'PUT',{assignments})).status).toBe(409);
  assignments[0].divisionCode=p.assignments[0].proposedDivisionCode;db.prepare('UPDATE season_transition_assignments SET requires_review=1 WHERE plan_id=? AND user_id=?').run(p.id,assignments[0].userId);
  expect((await call(`admin/competition-engine/transition-plans/${p.id}/confirm`,'PUT',{assignments})).status).toBe(409);
  assignments[0].reason='Corrimiento revisado por Admin';expect((await call(`admin/competition-engine/transition-plans/${p.id}/confirm`,'PUT',{assignments})).status).toBe(200);
 });
});
