import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleCompetitionChampions } from '../worker/competition-champions';
import { handleCompetitionKnockout } from '../worker/competition-knockout';

let db: DatabaseSync;

function env() {
  const DB = {
    prepare(sql: string) {
      let args: any[] = [];
      return {
        bind(...values: any[]) {
          args = values;
          return this;
        },
        async first() {
          return db.prepare(sql).get(...args) ?? null;
        },
        async all() {
          return { results: db.prepare(sql).all(...args) };
        },
        async run() {
          const result = db.prepare(sql).run(...args);
          return {
            meta: {
              changes: Number(result.changes),
              last_row_id: Number(result.lastInsertRowid),
            },
          };
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
    headers: {
      cookie: 'prode_session=admin',
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const handler of [handleCompetitionChampions, handleCompetitionKnockout]) {
    const response = await handler(request, env());
    if (response) return response;
  }
  throw new Error('No route ' + path);
}

function participant(index: number) {
  return 'P' + String(index).padStart(2, '0');
}

function addCompetition(id: number, code: string) {
  db.prepare(
    `INSERT INTO competitions
      (id,season_id,code,canonical_name,display_name,family,status)
     VALUES (?,1,?,?,?,'CUP','finished')`,
  ).run(id, code, code, code);
}

let nextEntryId = 1;
function addIndividualResult(competitionId: number, userId: string, resultCode: string, finalPosition: number | null) {
  const entryId = nextEntryId++;
  db.prepare(
    `INSERT INTO competition_entries(id,competition_id,entry_type,display_name)
     VALUES (?,?,'INDIVIDUAL',?)`,
  ).run(entryId, competitionId, userId);
  db.prepare(
    'INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)',
  ).run(entryId, userId);
  db.prepare(
    `INSERT INTO competition_results
      (competition_id,entry_id,result_code,final_position,confirmed_by_user_id)
     VALUES (?,?,?,?, 'admin')`,
  ).run(competitionId, entryId, resultCode, finalPosition);
  return entryId;
}

function addDuoChampion(competitionId: number, first: string, second: string) {
  const entryId = nextEntryId++;
  db.prepare(
    `INSERT INTO competition_entries(id,competition_id,entry_type,display_name)
     VALUES (?,?,'DUO','Duo campeon')`,
  ).run(entryId, competitionId);
  db.prepare('INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)').run(entryId, first);
  db.prepare('INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)').run(entryId, second);
  db.prepare(
    `INSERT INTO competition_results
      (competition_id,entry_id,result_code,final_position,confirmed_by_user_id)
     VALUES (?,?,'CHAMPION',1,'admin')`,
  ).run(competitionId, entryId);
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

  for (let index = 1; index <= 14; index += 1) {
    const id = participant(index);
    db.prepare(
      `INSERT INTO users(id,full_name,phone_normalized,password_hash,role)
       VALUES (?,?,?,?, 'participant')`,
    ).run(id, id, id, 'hash');
  }

  db.exec(
    `INSERT INTO tafa_seasons(id,season_number,name,status) VALUES
       (1,32,'T32','finished'),
       (2,33,'T33','draft');
     INSERT INTO season_divisions(id,season_id,code,name,sort_order) VALUES
       (10,2,'A','Liga A',10),
       (11,2,'B','Liga B',20);`,
  );
  for (let index = 1; index <= 14; index += 1) {
    db.prepare(
      'INSERT INTO season_division_members(season_id,division_id,user_id) VALUES (2,?,?)',
    ).run(index <= 7 ? 10 : 11, participant(index));
  }

  addCompetition(1, 'LIGA_A');
  addCompetition(2, 'LIGA_B');
  addCompetition(3, 'COPA_A');
  addCompetition(4, 'COPA_B');
  addCompetition(5, 'COPA_PAPA');
  addCompetition(6, 'COPA_TOTAL');
  addCompetition(7, 'COPA_DUOS');

  for (let position = 1; position <= 7; position += 1) {
    addIndividualResult(1, participant(position), position === 1 ? 'CHAMPION' : 'POSITION', position);
  }
  addIndividualResult(2, participant(8), 'CHAMPION', 1);
  addIndividualResult(3, participant(9), 'CHAMPION', 1);
  addIndividualResult(4, participant(10), 'CHAMPION', 1);
  addIndividualResult(5, participant(11), 'CHAMPION', 1);
  addIndividualResult(6, participant(12), 'CHAMPION', 1);
  addDuoChampion(7, participant(13), participant(14));

  db.exec(
    `INSERT INTO competitions
      (id,season_id,code,canonical_name,display_name,family,status)
     VALUES (100,2,'COPA_CAMPEONES','Copa Campeones','Copa Campeones','CUP','draft');
     INSERT INTO competition_stages
      (id,competition_id,code,name,stage_type,sequence)
     VALUES (200,100,'KO','Llave','KNOCKOUT',1);
     INSERT INTO rounds(id,name,status,category)
     VALUES (300,'Fecha Campeones','draft','COPA');
     INSERT INTO competition_round_links
      (id,competition_id,stage_id,round_id,sequence,purpose)
     VALUES (400,100,200,300,1,'NORMAL');`,
  );
});

afterEach(() => db.close());

describe('Copa Campeones backend funcional', () => {
  it('bloquea mutaciones en temporada cerrada y regeneración después de inicializar', async () => {
    const pref:any=await (await call('admin/competition-engine/competitions/100/champions/prefill','POST',{})).json();
    await call('admin/competition-engine/competitions/100/champions/slots','PUT',{slots:pref.slots.map((s:any)=>({slotCode:s.slotCode,userId:s.proposedUser.id}))});
    expect((await call('admin/competition-engine/competitions/100/champions/bracket','POST',{})).status).toBe(200);
    expect((await call('admin/competition-engine/competitions/100/champions/prefill','POST',{})).status).toBe(409);
    db.exec("UPDATE tafa_seasons SET status='finished' WHERE id=2");
    for(const [path,method] of [['slots','PUT'],['bracket','POST'],['nodes/U1/activate','POST'],['prefill','POST']]) expect((await call('admin/competition-engine/competitions/100/champions/'+path,method,{})).status).toBe(409);
  });
  it('prellena exactamente los 14 cupos deportivos desde la temporada anterior', async () => {
    const response = await call('admin/competition-engine/competitions/100/champions/prefill', 'POST', {});
    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.slots).toHaveLength(14);
    expect(data.slots.find((slot: any) => slot.slotCode === 'LIGA_A_1').proposedUser.id).toBe('P01');
    expect(data.slots.find((slot: any) => slot.slotCode === 'COPA_TOTAL_CHAMPION').proposedUser.id).toBe('P12');
    expect(data.slots.find((slot: any) => slot.slotCode === 'DUO_1').proposedUser.id).toBe('P13');
    expect(data.slots.find((slot: any) => slot.slotCode === 'DUO_2').proposedUser.id).toBe('P14');
  });

  it('rechaza confirmar un mismo participante en dos cupos', async () => {
    const pref = await call('admin/competition-engine/competitions/100/champions/prefill', 'POST', {});
    const slots = (await pref.json() as any).slots;
    const body = slots.map((slot: any) => ({
      slotCode: slot.slotCode,
      userId: slot.proposedUser.id,
    }));
    body[13].userId = body[12].userId;
    const response = await call('admin/competition-engine/competitions/100/champions/slots', 'PUT', { slots: body });
    expect(response.status).toBe(409);
    expect(String((await response.json() as any).error)).toContain('dos cupos');
  });

  it('inicializa la llave fija y desbloquea nodos sólo al confirmar sus fuentes', async () => {
    const pref = await call('admin/competition-engine/competitions/100/champions/prefill', 'POST', {});
    const slots = (await pref.json() as any).slots;
    const confirm = await call('admin/competition-engine/competitions/100/champions/slots', 'PUT', {
      slots: slots.map((slot: any) => ({
        slotCode: slot.slotCode,
        userId: slot.proposedUser.id,
      })),
    });
    expect(confirm.status).toBe(200);

    const init = await call('admin/competition-engine/competitions/100/champions/bracket', 'POST', {});
    expect(init.status).toBe(200);
    const bracket = (await init.json() as any).bracket;
    expect(bracket).toHaveLength(13);
    expect(bracket.find((node: any) => node.code === 'U1').readyToActivate).toBe(true);
    expect(bracket.find((node: any) => node.code === 'L1').readyToActivate).toBe(true);
    expect(bracket.find((node: any) => node.code === 'L2').readyToActivate).toBe(true);
    expect(bracket.find((node: any) => node.code === 'L5').readyToActivate).toBe(true);
    expect(bracket.find((node: any) => node.code === 'U2').readyToActivate).toBe(false);

    const activate = await call(
      'admin/competition-engine/competitions/100/champions/nodes/U1/activate',
      'POST',
      { stageId: 200, roundLinkId: 400 },
    );
    expect(activate.status).toBe(200);
    const activated = await activate.json() as any;
    const encounterId = activated.encounterId;

    const winner = await call(
      `admin/competition-engine/encounters/${encounterId}/winner`,
      'PUT',
      { winnerEntryId: activated.bracket.find((node: any) => node.code === 'U1').sourceA.entryId, resolution: 'admin', reason: 'Prueba' },
    );
    expect(winner.status).toBe(200);

    const after = await call('competition-engine/competitions/100/champions/bracket');
    expect(after.status).toBe(200);
    const nextBracket = (await after.json() as any).bracket;
    expect(nextBracket.find((node: any) => node.code === 'U2').readyToActivate).toBe(true);
  });
});
