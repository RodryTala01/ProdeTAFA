import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleCompetitionPromotion } from '../worker/competition-promotion';
import { handleCompetitionKnockout } from '../worker/competition-knockout';

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
  for (const handler of [handleCompetitionPromotion, handleCompetitionKnockout]) {
    const response = await handler(request, env());
    if (response) return response;
  }
  throw new Error('No route ' + path);
}

let entryId = 1;
function addLeagueResult(competitionId: number, userId: string, position: number) {
  const id = entryId++;
  db.prepare(
    `INSERT INTO competition_entries(id,competition_id,entry_type,display_name)
     VALUES (?,?,'INDIVIDUAL',?)`,
  ).run(id, competitionId, userId);
  db.prepare('INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)').run(id, userId);
  db.prepare(
    `INSERT INTO competition_results
      (competition_id,entry_id,result_code,final_position,confirmed_by_user_id)
     VALUES (?,?,'POSITION',?,'admin')`,
  ).run(competitionId, id, position);
}

beforeEach(() => {
  db = new DatabaseSync(':memory:');
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
    `INSERT INTO tafa_seasons(id,season_number,name,status) VALUES (1,32,'T32','active');
     INSERT INTO season_divisions(id,season_id,code,name,sort_order) VALUES
       (10,1,'A','Liga A',10),(11,1,'B','Liga B',20);
     INSERT INTO competitions(id,season_id,division_id,code,canonical_name,display_name,family,status) VALUES
       (1,1,10,'LIGA_A','Liga A','Liga A','LEAGUE','finished'),
       (2,1,11,'LIGA_B','Liga B','Liga B','LEAGUE','finished'),
       (100,1,NULL,'PROMOCION','Promocion','Promocion','PROMOTION','draft');
     INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence)
       VALUES (200,100,'PROMO','Promocion','KNOCKOUT',1);
     INSERT INTO rounds(id,name,status,category) VALUES (300,'Fecha Promocion','draft','COPA');
     INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence,purpose)
       VALUES (400,100,200,300,1,'NORMAL');`,
  );

  for (let i = 1; i <= 10; i++) {
    const id = 'P' + String(i).padStart(2, '0');
    db.prepare(
      `INSERT INTO users(id,full_name,phone_normalized,password_hash,role)
       VALUES (?,?,?,?, 'participant')`,
    ).run(id, id, id, 'hash');
    db.prepare(
      'INSERT INTO season_division_members(season_id,division_id,user_id) VALUES (1,?,?)',
    ).run(i <= 6 ? 10 : 11, id);
  }
  for (let pos = 1; pos <= 6; pos++) addLeagueResult(1, 'P' + String(pos).padStart(2, '0'), pos);
  for (let pos = 1; pos <= 4; pos++) addLeagueResult(2, 'P' + String(pos + 6).padStart(2, '0'), pos);
});

afterEach(() => db.close());

describe('Promocion backend funcional', () => {
  it('propone los dos cupos de A desde abajo y B2/B3', async () => {
    const response = await call('admin/competition-engine/competitions/100/promotion/prefill', 'POST', {});
    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.leagueASize).toBe(6);
    expect(data.basePositions).toEqual({ aHigh: 3, aLow: 4, bHigh: 2, bLow: 3 });
    const byCode = new Map(data.slots.map((slot: any) => [slot.slotCode, slot]));
    expect((byCode.get('A_HIGH_PROMO') as any).proposedUser.id).toBe('P03');
    expect((byCode.get('A_LOW_PROMO') as any).proposedUser.id).toBe('P04');
    expect((byCode.get('B_HIGH_PROMO') as any).proposedUser.id).toBe('P08');
    expect((byCode.get('B_LOW_PROMO') as any).proposedUser.id).toBe('P09');
  });

  it('exige motivo si Admin corre un cupo', async () => {
    const pref = await call('admin/competition-engine/competitions/100/promotion/prefill', 'POST', {});
    const slots = (await pref.json() as any).slots;
    const changed = slots.map((slot: any) => ({
      slotCode: slot.slotCode,
      userId: slot.proposedUser.id,
    }));
    changed.find((slot: any) => slot.slotCode === 'B_HIGH_PROMO').userId = 'P10';

    const invalid = await call('admin/competition-engine/competitions/100/promotion/slots', 'PUT', { slots: changed });
    expect(invalid.status).toBe(409);

    changed.find((slot: any) => slot.slotCode === 'B_HIGH_PROMO').reason = 'Campeon Copa B libera cupo';
    const valid = await call('admin/competition-engine/competitions/100/promotion/slots', 'PUT', { slots: changed });
    expect(valid.status).toBe(200);
  });

  it('crea los dos cruces exactos y propone ganador a A / perdedor a B', async () => {
    const pref = await call('admin/competition-engine/competitions/100/promotion/prefill', 'POST', {});
    const slots = (await pref.json() as any).slots;
    const confirm = await call('admin/competition-engine/competitions/100/promotion/slots', 'PUT', {
      slots: slots.map((slot: any) => ({ slotCode: slot.slotCode, userId: slot.proposedUser.id })),
    });
    expect(confirm.status).toBe(200);

    const build = await call('admin/competition-engine/competitions/100/promotion/matches', 'POST', {
      stageId: 200,
      roundLinkId: 400,
    });
    expect(build.status).toBe(200);
    const built = await build.json() as any;
    expect(built.pairs).toHaveLength(2);

    const encounterRows = db.prepare(
      `SELECT id,entry_a_id FROM competition_encounters WHERE stage_id=200 ORDER BY slot_key`,
    ).all() as any[];
    for (const row of encounterRows) {
      const response = await call(
        `admin/competition-engine/encounters/${row.id}/winner`,
        'PUT',
        { winnerEntryId: row.entry_a_id, resolution: 'admin', reason: 'Prueba' },
      );
      expect(response.status).toBe(200);
    }

    const finalize = await call('admin/competition-engine/competitions/100/promotion/stages/200/finalize', 'POST', {});
    expect(finalize.status).toBe(200);
    const data = await finalize.json() as any;
    expect(data.movements).toHaveLength(4);

    const divisionA = 10;
    const divisionB = 11;
    expect(data.movements.filter((m: any) => m.result === 'WINNER').every((m: any) => m.toDivisionId === divisionA)).toBe(true);
    expect(data.movements.filter((m: any) => m.result === 'LOSER').every((m: any) => m.toDivisionId === divisionB)).toBe(true);
  });
});
