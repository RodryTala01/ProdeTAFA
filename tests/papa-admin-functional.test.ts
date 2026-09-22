import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleCompetitionPapa } from '../worker/competition-papa';

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
  const response = await handleCompetitionPapa(request, env());
  if (!response) throw new Error('No route ' + path);
  return response;
}

function addPreviousCompetition(id: number, code: string) {
  db.prepare(
    `INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family,status)
     VALUES (?,1,?,?,?,'LEAGUE','finished')`,
  ).run(id, code, code, code);
}

function addResult(competitionId: number, userId: string, position: number) {
  const entryId = competitionId * 100 + position;
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
  for (const file of readdirSync('migrations').filter((file) => file.endsWith('.sql')).sort()) {
    db.exec(readFileSync('migrations/' + file, 'utf8'));
  }
  db.exec(
    `INSERT INTO users(id,full_name,phone_normalized,password_hash,role)
       VALUES ('admin','Admin','admin','hash','admin');
     INSERT INTO sessions(id,user_id,token_hash,expires_at)
       VALUES ('admin','admin','${createHash('sha256').update('admin').digest('hex')}','2099-01-01');
     INSERT INTO tafa_seasons(id,season_number,name,status)
       VALUES (1,32,'T32','finished'),(2,33,'T33','draft');
     INSERT INTO season_divisions(id,season_id,code,name,sort_order)
       VALUES (10,2,'A','Liga A',10),(11,2,'B','Liga B',20);`,
  );
  for (let i = 1; i <= 6; i++) {
    const id = 'P' + i;
    db.prepare(
      `INSERT INTO users(id,full_name,phone_normalized,password_hash,role)
       VALUES (?,?,?,?, 'participant')`,
    ).run(id, id, id, 'hash');
    db.prepare(
      'INSERT INTO season_division_members(season_id,division_id,user_id) VALUES (2,?,?)',
    ).run(i <= 3 ? 10 : 11, id);
  }

  addPreviousCompetition(1, 'LIGA_A');
  addPreviousCompetition(2, 'LIGA_B');
  addResult(1, 'P1', 1);
  addResult(1, 'P2', 2);
  addResult(1, 'P3', 3);
  addResult(2, 'P4', 1);
  addResult(2, 'P5', 2);
  addResult(2, 'P6', 3);

  db.exec(
    `INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family,status)
       VALUES (100,2,'COPA_PAPA','Copa Papa','Copa Papa','CUP','draft');
     INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES
       (201,100,'R1','Ronda inicial','KNOCKOUT',1),
       (202,100,'R2','Siguiente','KNOCKOUT',2),
       (203,100,'SF','Semifinal','KNOCKOUT',3),
       (204,100,'THIRD','Tercer puesto','KNOCKOUT',4);
     INSERT INTO rounds(id,name,status,category) VALUES
       (301,'Papa 1','draft','COPA'),
       (302,'Papa 2','draft','COPA'),
       (303,'Papa SF','draft','COPA'),
       (304,'Papa 3ro','draft','COPA');
     INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence,purpose) VALUES
       (401,100,201,301,1,'NORMAL'),
       (402,100,202,302,1,'NORMAL'),
       (403,100,203,303,1,'NORMAL'),
       (404,100,204,304,1,'NORMAL');`,
  );
});

afterEach(() => db.close());

describe('Copa Papa backend funcional', () => {
  it('propone mejor Liga A contra peor Liga B en espejo', async () => {
    const response = await call('competition-engine/competitions/100/papa/seeding-proposal');
    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.participantCount).toBe(6);
    expect(data.proposedPairs[0].userA.id).toBe('P1');
    expect(data.proposedPairs[0].userB.id).toBe('P6');
    expect(data.proposedPairs[1].userA.id).toBe('P2');
    expect(data.proposedPairs[1].userB.id).toBe('P5');
    expect(data.proposedPairs[2].userA.id).toBe('P3');
    expect(data.proposedPairs[2].userB.id).toBe('P4');
  });

  it('permite una llave inicial manual con byes y exige usar a todos exactamente una vez', async () => {
    const invalid = await call(
      'admin/competition-engine/competitions/100/papa/initial-bracket',
      'POST',
      {
        stageId: 201,
        roundLinkId: 401,
        pairs: [
          { userAId: 'P1', userBId: 'P6' },
          { userAId: 'P2', userBId: 'P5' },
          { userAId: 'P3', userBId: null },
        ],
      },
    );
    expect(invalid.status).toBe(409);

    const valid = await call(
      'admin/competition-engine/competitions/100/papa/initial-bracket',
      'POST',
      {
        stageId: 201,
        roundLinkId: 401,
        pairs: [
          { userAId: 'P1', userBId: 'P6' },
          { userAId: 'P2', userBId: 'P5' },
          { userAId: 'P3', userBId: null },
          { userAId: 'P4', userBId: null },
        ],
      },
    );
    expect(valid.status).toBe(200);
    const data = await valid.json() as any;
    expect(data.pairs).toHaveLength(4);
    expect(data.pairs.filter((pair: any) => pair.entryBId == null)).toHaveLength(2);
  });

  it('avanza ganadores en orden fijo y arma tercer puesto con perdedores de semifinal', async () => {
    const initial = await call(
      'admin/competition-engine/competitions/100/papa/initial-bracket',
      'POST',
      {
        stageId: 201,
        roundLinkId: 401,
        pairs: [
          { userAId: 'P1', userBId: 'P6' },
          { userAId: 'P2', userBId: 'P5' },
          { userAId: 'P3', userBId: null },
          { userAId: 'P4', userBId: null },
        ],
      },
    );
    expect(initial.status).toBe(200);
    db.exec(
      `UPDATE competition_encounters
       SET status='finished',winner_entry_id=entry_a_id,resolution='admin',
           admin_confirmed_at=datetime('now')
       WHERE stage_id=201`,
    );

    const next = await call('admin/competition-engine/stages/201/papa/next-round', 'POST', {
      targetStageId: 202,
      roundLinkId: 402,
    });
    expect(next.status).toBe(200);
    const nextData = await next.json() as any;
    expect(nextData.pairs).toHaveLength(2);

    const entries = db.prepare(
      `SELECT id FROM competition_entries WHERE competition_id=100 ORDER BY id LIMIT 4`,
    ).all() as any[];
    db.prepare(
      `INSERT INTO competition_encounters
       (stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status,winner_entry_id,resolution,admin_confirmed_at)
       VALUES (203,403,'SF-1',?,?, 'finished',?,'admin',datetime('now'))`,
    ).run(entries[0].id, entries[1].id, entries[0].id);
    db.prepare(
      `INSERT INTO competition_encounters
       (stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status,winner_entry_id,resolution,admin_confirmed_at)
       VALUES (203,403,'SF-2',?,?, 'finished',?,'admin',datetime('now'))`,
    ).run(entries[2].id, entries[3].id, entries[2].id);

    const third = await call('admin/competition-engine/stages/203/papa/third-place', 'POST', {
      targetStageId: 204,
      roundLinkId: 404,
    });
    expect(third.status).toBe(200);
    const thirdData = await third.json() as any;
    expect(thirdData.entryAId).toBe(entries[1].id);
    expect(thirdData.entryBId).toBe(entries[3].id);
  });
});
