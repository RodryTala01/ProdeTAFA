import { handleCompetitionResults } from '../worker/competition-results';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calculateIffhsSeason } from '../worker/iffhs-calculator';
import { handleIffhs } from '../worker/iffhs';

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

let nextEntry = 1;
function addCupResult(competitionId: number, userId: string, resultCode: string, finalPosition: number) {
  const entryId = nextEntry++;
  db.prepare(
    `INSERT INTO competition_entries(id,competition_id,entry_type,display_name)
     VALUES (?,?,'INDIVIDUAL',?)`,
  ).run(entryId, competitionId, userId);
  db.prepare('INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)').run(entryId, userId);
  db.prepare(
    `INSERT INTO competition_results
      (competition_id,entry_id,result_code,final_position,confirmed_by_user_id)
     VALUES (?,?,?,?, 'admin')`,
  ).run(competitionId, entryId, resultCode, finalPosition);
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
     INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family,status) VALUES
       (1,1,'COPA_TOTAL','Copa Total','Copa Total','CUP','finished'),
       (2,1,'COPA_PAPA','Copa Papa','Copa Papa','CUP','finished');`,
  );

  for (let i = 1; i <= 4; i++) {
    const id = 'P' + i;
    db.prepare(
      `INSERT INTO users(id,full_name,phone_normalized,password_hash,role)
       VALUES (?,?,?,?, 'participant')`,
    ).run(id, id, id, 'hash');
    db.prepare(
      'INSERT INTO season_division_members(season_id,division_id,user_id) VALUES (1,?,?)',
    ).run(i <= 2 ? 10 : 11, id);
  }

  addCupResult(1, 'P1', 'THIRD', 3);
  addCupResult(1, 'P2', 'SEMIFINAL', 4);
  addCupResult(2, 'P3', 'THIRD', 3);
  addCupResult(2, 'P4', 'SEMIFINAL', 4);
});

afterEach(() => db.close());

describe('IFFHS funcional', () => {
  it('tercer puesto conserva el valor IFFHS de semifinalista en Total y Papa', async () => {
    const result = await calculateIffhsSeason(env(), 'admin', 32);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const totals = new Map(result.totals.map((row) => [row.userId, row.totalPoints]));
    expect(totals.get('P1')).toBe(60);
    expect(totals.get('P2')).toBe(60);
    expect(totals.get('P3')).toBe(45);
    expect(totals.get('P4')).toBe(45);

    const p1 = db.prepare(
      `SELECT points_scaled FROM iffhs_season_components
       WHERE season_number=32 AND user_id='P1' AND competition_code='COPA_TOTAL' AND component_code='RESULT'`,
    ).get() as any;
    const p3 = db.prepare(
      `SELECT points_scaled FROM iffhs_season_components
       WHERE season_number=32 AND user_id='P3' AND competition_code='COPA_PAPA' AND component_code='RESULT'`,
    ).get() as any;
    expect(Number(p1.points_scaled)).toBe(6000);
    expect(Number(p3.points_scaled)).toBe(4500);
  });

  it('ranking comparte posición cuando el total es exactamente igual', async () => {
    const calculated = await calculateIffhsSeason(env(), 'admin', 32);
    expect(calculated.ok).toBe(true);

    const request = new Request('http://local/api/competition-engine/iffhs/ranking?throughSeason=32', {
      headers: { cookie: 'prode_session=admin' },
    });
    const response = await handleIffhs(request, env());
    expect(response?.status).toBe(200);
    const data = await response!.json() as any;

    const byUser = new Map(data.ranking.map((row: any) => [row.userId, row]));
    expect((byUser.get('P1') as any).position).toBe(1);
    expect((byUser.get('P2') as any).position).toBe(1);
    expect((byUser.get('P3') as any).position).toBe(3);
    expect((byUser.get('P4') as any).position).toBe(3);
    expect(data.includedSeasons).toEqual([28,29,30,31,32]);
    expect(data.missingSeasons).toEqual([28,29,30,31]);
  });
});

const adminRequest=(path:string,method='GET',body?:unknown)=>new Request('http://localhost'+path,{method,headers:{cookie:'prode_session=admin','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
describe('Resultados e IFFHS Admin integrados',()=>{
 it('lee todas las entradas y confirma snapshot completo con autor y auditoría',async()=>{
   db.prepare('DELETE FROM competition_results WHERE competition_id=1').run();
   const path='/api/competition-engine/competitions/1/results';
   const before=await (await handleCompetitionResults(adminRequest(path),env()))!.json() as any;
   expect(before.entries).toHaveLength(2);expect(before.results).toEqual([]);
   const rows=before.entries.map((e:any,i:number)=>({entryId:e.entryId,resultCode:i?'RUNNER_UP':'CHAMPION',finalPosition:i+1}));
   const put='/api/admin/competition-engine/competitions/1/results';
   expect((await handleCompetitionResults(adminRequest(put,'PUT',{results:rows.slice(0,1)}),env()))!.status).toBe(409);
   const response=await handleCompetitionResults(adminRequest(put,'PUT',{results:rows}),env());expect(response!.status).toBe(200);
   const saved=await response!.json() as any;expect(saved.results[0].confirmedBy).toBe('Admin');
   expect((db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='competition.results_confirmed'").get() as any).n).toBe(1);
   const again=await handleCompetitionResults(adminRequest(put,'PUT',{results:rows}),env());expect(again!.status).toBe(200);
   expect((db.prepare('SELECT COUNT(*) n FROM competition_results WHERE competition_id=1').get() as any).n).toBe(2);
   expect((db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='competition.results_confirmed'").get() as any).n).toBe(2);
 });
 it('exige destinatarios históricos explícitos cuando un dúo tuvo sustituciones',async()=>{
   db.exec("UPDATE competition_entries SET entry_type='DUO' WHERE id=1; INSERT INTO competition_entry_members(entry_id,user_id) VALUES (1,'P3'),(1,'P4');");
   const rows=[{entryId:1,resultCode:'CHAMPION',detail:{}},{entryId:2,resultCode:'RUNNER_UP'}];
   const request=()=>adminRequest('/api/admin/competition-engine/competitions/1/results','PUT',{results:rows});
   expect((await handleCompetitionResults(request(),env()))!.status).toBe(409);
   rows[0].detail={iffhsUserIds:['P1','P4']};
   expect((await handleCompetitionResults(request(),env()))!.status).toBe(200);
 });
 it('importa historia sin permitir sobrescritura ni cálculo sobre importados',async()=>{
   const path='/api/admin/competition-engine/iffhs/seasons/32/totals';
   const request=(points:number)=>adminRequest(path,'PUT',{rows:[{userId:'P1',totalPoints:points}]});
   expect((await handleIffhs(request(123.45),env()))!.status).toBe(200);
   expect((await handleIffhs(request(999),env()))!.status).toBe(409);
   expect((db.prepare("SELECT total_points_scaled FROM iffhs_season_totals WHERE user_id='P1'").get() as any).total_points_scaled).toBe(12345);
   expect((await calculateIffhsSeason(env(),'admin',32)).ok).toBe(false);
   const response=await handleIffhs(adminRequest('/api/competition-engine/iffhs/seasons/32/components?userId=P1'),env());
   const detail=await response!.json() as any;expect(detail.rows[0].totalSource).toBe('imported');expect(detail.rows[0].totalPoints).toBe(123.45);
 });
});
