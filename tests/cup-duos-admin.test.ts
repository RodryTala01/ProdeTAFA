import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { handleCompetitionDuos } from '../worker/competition-duos';
import { handleCompetitionKnockout } from '../worker/competition-knockout';
import { handleCompetitionTiebreak } from '../worker/competition-tiebreak';
let db: DatabaseSync;
function env() {
  const DB = {
    prepare(sql: string) {
      let args: any[] = [];
      return {
        bind(...v: any[]) {
          args = v;
          return this;
        },
        async first() {
          return db.prepare(sql).get(...args) ?? null;
        },
        async all() {
          return { results: db.prepare(sql).all(...args) };
        },
        async run() {
          const r = db.prepare(sql).run(...args);
          return {
            meta: {
              changes: Number(r.changes),
              last_row_id: Number(r.lastInsertRowid),
            },
          };
        },
      };
    },
    async batch(stmts: any[]) {
      db.exec('BEGIN');
      try {
        const rows = [];
        for (const s of stmts) rows.push(await s.run());
        db.exec('COMMIT');
        return rows;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { DB: DB as unknown as D1Database };
}
const base = 'admin/competition-engine';
async function call(
  path: string,
  method = 'GET',
  body?: object,
  role = 'admin',
) {
  const req = new Request('http://local/api/' + path, {
    method,
    headers: {
      cookie: `prode_session=${role}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const h of [
    handleCompetitionDuos,
    handleCompetitionKnockout,
    handleCompetitionTiebreak,
  ]) {
    const r = await h(req, env());
    if (r) return r;
  }
  throw Error('No route ' + path);
}
const manual = () =>
  call(`${base}/competitions/1/duos/pairs`, 'POST', {
    pairs: Array.from({ length: 8 }, (_, i) => [
      'P' + (i * 2 + 1),
      'P' + (i * 2 + 2),
    ]),
  });
const table = async (n = 1) =>
  (
    await call(`competition-engine/round-links/${n}/duos/table`)
  ).json() as Promise<any>;
const settings = (n = 1, eliminateCount = 2, bonusByPosition = {}) =>
  call(`${base}/round-links/${n}/duos/settings`, 'PUT', {
    eliminateCount,
    bonusByPosition,
  });
const confirm = (n = 1) =>
  call(`${base}/round-links/${n}/duos/confirm`, 'POST', {});
function scalar(sql: string) {
  return Object.values(db.prepare(sql).get()!)[0];
}
function points(user: string, round: number, score: number) {
  const mid = round * 100 + 1;
  const pid = round * 1000 + Number(user.slice(1));
  db.prepare(
    "INSERT INTO predictions(id,user_id,match_id,predicted_home_score,predicted_away_score,updated_at) VALUES (?,?,?,1,0,datetime('now'))",
  ).run(pid, user, mid);
  db.prepare(
    "INSERT INTO official_predictions(id,user_id,match_id,predicted_home_score,predicted_away_score,updated_at,source) VALUES (?,?,?,1,0,datetime('now'),'admin')",
  ).run(pid, user, mid);
  db.prepare(
    "INSERT INTO prediction_scores(prediction_id,result_type,base_points,total_points,calculated_at) VALUES (?,'FULL',?,?,datetime('now'))",
  ).run(pid, score, score);
}
function rank(round = 1) {
  for (let i = 1; i <= 8; i++) points('P' + (i * 2 - 1), round, 24 - i * 2);
}
const substitution = (body: any) =>
  call(`${base}/entries/1/duos/substitute`, 'POST', body);
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  for (const f of readdirSync('migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    db.exec(readFileSync('migrations/' + f, 'utf8'));
  for (const u of [
    'admin',
    'participant',
    ...Array.from({ length: 18 }, (_, i) => 'P' + (i + 1)),
  ])
    db.prepare(
      'INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES (?,?,?,?,?)',
    ).run(u, u, u, 'hash', u === 'admin' ? 'admin' : 'participant');
  for (const role of ['admin', 'participant'])
    db.prepare(
      "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,'2099-01-01')",
    ).run(role, role, createHash('sha256').update(role).digest('hex'));
  db.exec(
    `INSERT INTO tafa_seasons(id,season_number,name) VALUES(1,34,'Prueba');INSERT INTO season_divisions(id,season_id,code,name) VALUES(1,1,'A','A'),(2,1,'B','B');INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(1,1,'COPA_DUOS','Dúos','Dúos','CUP');INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES(1,1,'SURVIVAL','Supervivencia','SURVIVAL_TABLE',1),(2,1,'SF','Semifinal','KNOCKOUT',2),(3,1,'F','Final','KNOCKOUT',3);`,
  );
  for (let i = 1; i <= 16; i++)
    db.prepare(
      'INSERT INTO season_division_members(season_id,division_id,user_id) VALUES(1,?,?)',
    ).run(i <= 8 ? 1 : 2, 'P' + i);
  for (let r = 1; r <= 5; r++) {
    db.prepare(
      "INSERT INTO rounds(id,name,category,status) VALUES (?,?,'COPA',?)",
    ).run(r, 'Fecha ' + r, r < 3 ? 'finished' : 'draft');
    db.prepare(
      "INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence,purpose) VALUES (?,1,?,?,?,'NORMAL')",
    ).run(r, r <= 3 ? 1 : r - 2, r, r <= 3 ? r : 1);
    for (let m = 1; m <= 12; m++)
      db.prepare(
        "INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_name,away_team_name,kickoff_at,status,match_type,result_finalized_at) VALUES (?,?,'test',?,'Local','Visitante',?,'finished','NORMAL',?)",
      ).run(
        r * 100 + m,
        r,
        r * 100 + m,
        r < 3 ? '2020-01-0' + r + 'T12:00:00Z' : '2099-01-0' + r + 'T12:00:00Z',
        r < 3 ? '2020-01-03T00:00:00Z' : null,
      );
  }
});
afterEach(() => db.close());
describe('Copa Dúos Admin real D1', () => {
  it('manual usa todos los A+B y audita sin semilla', async () => {
    expect((await manual()).status).toBe(200);
    expect(scalar('SELECT COUNT(*) FROM competition_entries')).toBe(8);
    expect(scalar('SELECT COUNT(*) FROM competition_entry_members')).toBe(16);
    const log = String(
      scalar(
        "SELECT after_json FROM audit_log WHERE action='competition.duos_manual_configured'",
      ),
    );
    expect(log).toContain('MANUAL');
    expect(log).not.toContain('randomSeed');
  });
  it.each([
    [
      'duplicado',
      [
        ['P1', 'P2'],
        ['P1', 'P3'],
      ],
    ],
    ['consigo mismo', [['P1', 'P1']]],
    ['ajeno', [['P17', 'P18']]],
    ['incompleto', [['P1']]],
    ['faltantes', [['P1', 'P2']]],
  ])('rechaza %s', async (_, pairs) => {
    expect(
      (await call(`${base}/competitions/1/duos/pairs`, 'POST', { pairs }))
        .status,
    ).toBe(400);
    expect(scalar('SELECT COUNT(*) FROM competition_entries')).toBe(0);
  });
  it('rechaza activo fuera de temporada, inactivo y cantidad impar', async () => {
    db.exec("UPDATE users SET is_active=0 WHERE id='P16'");
    expect((await manual()).status).toBe(409);
    expect(
      (await call(`${base}/competitions/1/duos/draw`, 'POST', {})).status,
    ).toBe(409);
  });
  it('automático conserva seed y no permite rearmar', async () => {
    const r = await call(`${base}/competitions/1/duos/draw`, 'POST', {});
    const d: any = await r.json();
    expect(r.status).toBe(200);
    expect(d.randomSeed).toBeTypeOf('number');
    expect(d.pairs).toHaveLength(8);
    expect((await manual()).status).toBe(409);
    expect(
      (await call(`${base}/competitions/1/duos/draw`, 'POST', {})).status,
    ).toBe(409);
  });
  it('protege admin y temporada cerrada', async () => {
    expect(
      (
        await call(
          `${base}/competitions/1/duos/pairs`,
          'POST',
          { pairs: [] },
          'participant',
        )
      ).status,
    ).toBe(403);
    db.exec("UPDATE tafa_seasons SET status='finished'");
    expect((await manual()).status).toBe(409);
  });
  it('suma ambos, ausencia cero y bonus sin acumular fechas', async () => {
    await manual();
    points('P1', 1, 3);
    points('P2', 1, 1);
    points('P1', 2, 1);
    db.exec(
      "INSERT INTO competition_entry_bonuses(competition_id,stage_id,round_link_id,entry_id,points,reason) VALUES(1,1,2,1,5,'test')",
    );
    expect(
      (await table()).rows.find((r: any) => r.entryId === 1),
    ).toMatchObject({ basePoints: 4, totalPoints: 4 });
    expect(
      (await table(2)).rows.find((r: any) => r.entryId === 1),
    ).toMatchObject({ basePoints: 1, bonusPoints: 5, totalPoints: 6 });
  });
  it('confirma snapshot, elimina dos y transporta bonus configurable', async () => {
    await manual();
    rank();
    expect((await settings(1, 2, { '1': 5, '2': 3, '3': 1 })).status).toBe(200);
    expect((await confirm()).status).toBe(200);
    const t = await table();
    expect(t.confirmed).toBe(true);
    expect(t.rows.filter((r: any) => r.decision === 'ELIMINATED')).toHaveLength(
      2,
    );
    expect(t.rows[0].members).toHaveLength(2);
    expect((await table(2)).rows[0].bonusPoints).toBe(5);
    expect((await settings()).status).toBe(409);
    expect((await confirm()).status).toBe(409);
  });
  it('no permite confirmar fechas fuera de orden ni tabla provisional', async () => {
    await manual();
    expect((await confirm(2)).status).toBe(409);
    db.exec("UPDATE rounds SET status='open' WHERE id=1");
    expect((await confirm()).status).toBe(409);
  });
  it('empate en corte bloquea eliminación automática', async () => {
    await manual();
    await settings();
    expect((await table()).boundaryTie).toBe(true);
    expect((await confirm()).status).toBe(409);
    expect(scalar('SELECT COUNT(*) FROM competition_survival_results')).toBe(0);
  });
  it('desempata múltiples dúos en la misma Liga con TAFA', async () => {
    await manual();
    await settings();
    const created: any = await (
      await call(`${base}/round-links/1/duos/tiebreak`, 'POST', {})
    ).json();
    const tid = created.tiebreak.id;
    db.exec("UPDATE rounds SET category='LIGA' WHERE id=2");
    for (let i = 1; i <= 8; i++) points('P' + (i * 2 - 1), 2, i);
    expect(
      (await call(`${base}/tiebreaks/${tid}/rounds`, 'POST', { roundId: 2 }))
        .status,
    ).toBe(200);
    const resolved: any = await (
      await call(`${base}/tiebreaks/${tid}/refresh`, 'POST', {})
    ).json();
    expect(resolved.state).toBe('RESOLVED_GROUP');
    expect((await table()).boundaryTie).toBe(false);
    expect((await confirm()).status).toBe(200);
    expect((await table()).rows[0].entryId).toBe(8);
  });
  it('sustitución exacta conserva pasado y evita retroactividad', async () => {
    await manual();
    db.exec(
      "INSERT INTO season_division_members(season_id,division_id,user_id) VALUES(1,1,'P17')",
    );
    expect(
      (
        await substitution({
          outgoingUserId: 'P1',
          incomingUserId: 'P17',
          effectiveRoundId: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await substitution({
          outgoingUserId: 'P1',
          incomingUserId: 'P17',
          effectiveRoundId: 3,
        })
      ).status,
    ).toBe(200);
    points('P1', 1, 3);
    points('P1', 3, 3);
    points('P17', 3, 1);
    expect(
      (await table()).rows.find((r: any) => r.entryId === 1).basePoints,
    ).toBe(3);
    expect(
      (await table(3)).rows.find((r: any) => r.entryId === 1).basePoints,
    ).toBe(1);
    const history: any = await (
      await call('competition-engine/entries/1/duos/members')
    ).json();
    expect(history.members).toHaveLength(3);
    expect(history.members[0].validUntilBeforeRoundId).toBe(3);
  });
  it('sustitución rechaza otro dúo y propio compañero', async () => {
    await manual();
    expect(
      (
        await substitution({
          outgoingUserId: 'P1',
          incomingUserId: 'P3',
          effectiveRoundId: 3,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await substitution({
          outgoingUserId: 'P1',
          incomingUserId: 'P2',
          effectiveRoundId: 3,
        })
      ).status,
    ).toBe(409);
  });
  it('sustitución rechaza superposición futura en otro dúo', async () => {
    await manual();
    db.exec(
      "INSERT INTO season_division_members(season_id,division_id,user_id) VALUES(1,1,'P17'); INSERT INTO competition_entry_members(entry_id,user_id,valid_from_round_id) VALUES(2,'P17',5)",
    );
    expect(
      (
        await substitution({
          outgoingUserId: 'P1',
          incomingUserId: 'P17',
          effectiveRoundId: 3,
        })
      ).status,
    ).toBe(409);
    expect(
      scalar(
        "SELECT COUNT(*) FROM competition_entry_members WHERE entry_id=1 AND user_id='P17'",
      ),
    ).toBe(0);
  });
  it('al quedar cuatro clasifica, semifinal fija +2 y final de confirmados sin tercer puesto', async () => {
    await manual();
    rank();
    await settings(1, 4);
    expect((await confirm()).status).toBe(200);
    expect(
      (await table()).rows.filter((r: any) => r.decision === 'QUALIFIED'),
    ).toHaveLength(4);
    const r = await call(`${base}/round-links/1/duos/semifinals`, 'POST', {
      targetStageId: 2,
      roundLinkId: 4,
    });
    expect(r.status).toBe(200);
    const pairs: any = (await r.json()).pairs;
    expect(pairs).toEqual([
      { slot: 'SF-1', entryAId: 1, entryBId: 4, bonusA: 2, bonusB: 0 },
      { slot: 'SF-2', entryAId: 2, entryBId: 3, bonusA: 2, bonusB: 0 },
    ]);
    expect(scalar('SELECT COUNT(*) FROM competition_entry_bonuses')).toBe(2);
    expect(
      (
        await call(`${base}/stages/2/duos/final`, 'POST', {
          targetStageId: 3,
          roundLinkId: 5,
        })
      ).status,
    ).toBe(409);
    db.exec("UPDATE rounds SET status='finished' WHERE id=4");
    for (const e of db
      .prepare('SELECT id,entry_a_id FROM competition_encounters')
      .all() as any[])
      expect(
        (
          await call(`${base}/encounters/${e.id}/winner`, 'PUT', {
            winnerEntryId: e.entry_a_id,
            resolution: 'normal',
          })
        ).status,
      ).toBe(200);
    expect(
      (
        await call(`${base}/stages/2/duos/final`, 'POST', {
          targetStageId: 3,
          roundLinkId: 5,
        })
      ).status,
    ).toBe(200);
    expect(
      scalar(
        "SELECT COUNT(*) FROM competition_encounters WHERE slot_key='FINAL'",
      ),
    ).toBe(1);
    expect(scalar('SELECT COUNT(*) FROM competition_encounters')).toBe(3);
  });
  it('knockout usa límite exclusivo de sustitución sin asignar IFFHS automáticamente', async () => {
    await manual();
    db.exec(
      "INSERT INTO season_division_members(season_id,division_id,user_id) VALUES(1,1,'P17')",
    );
    await substitution({
      outgoingUserId: 'P1',
      incomingUserId: 'P17',
      effectiveRoundId: 5,
    });
    db.exec(
      "INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id) VALUES(3,5,'FINAL',1,2)",
    );
    points('P1', 5, 3);
    points('P17', 5, 1);
    db.exec("UPDATE rounds SET status='finished' WHERE id=5");
    const k: any = await (
      await call('competition-engine/stages/3/knockout')
    ).json();
    expect(k.encounters[0].scoreA).toBe(1);
    expect(
      (
        await call(`${base}/encounters/1/winner`, 'PUT', {
          winnerEntryId: 1,
          resolution: 'normal',
        })
      ).status,
    ).toBe(200);
    expect(
      db.prepare('SELECT COUNT(*) AS n FROM competition_results').get(),
    ).toEqual({ n: 0 });
  });
});
describe('Dúos: regresiones de historia y avance', () => {
  it('permite configurar escalas futuras y elimina progresivamente hasta cuatro', async () => {
    await manual();
    expect((await settings(2, 2, { '1': 7, '2': 2 })).status).toBe(200);
    rank(1);
    rank(2);
    await settings(1, 2, { '1': 5, '2': 3 });
    await confirm(1);
    expect((await table(2)).rows).toHaveLength(6);
    expect((await confirm(2)).status).toBe(200);
    expect(
      (await table(2)).rows.filter((r: any) => r.decision === 'QUALIFIED'),
    ).toHaveLength(4);
  });
  it('historia confirmada conserva integrantes y nombres tras sustitución futura', async () => {
    await manual();
    rank();
    await settings(1, 2);
    await confirm();
    const before = await table();
    db.exec(
      "INSERT INTO season_division_members(season_id,division_id,user_id) VALUES(1,1,'P17')",
    );
    expect(
      (
        await substitution({
          outgoingUserId: 'P1',
          incomingUserId: 'P17',
          effectiveRoundId: 3,
        })
      ).status,
    ).toBe(200);
    expect((await table()).rows).toEqual(before.rows);
  });
  it('desempate de sólo dos mantiene pendiente hasta una diferencia TAFA', async () => {
    await manual();
    rank();
    db.exec(
      'UPDATE prediction_scores SET total_points=10 WHERE prediction_id IN(1011,1013)',
    );
    await settings(1, 2);
    const t = await table();
    expect(t.boundaryTie).toBe(true);
    const tie: any = await (
      await call(`${base}/round-links/1/duos/tiebreak`, 'POST', {})
    ).json();
    db.exec("UPDATE rounds SET category='LIGA' WHERE id=2");
    await call(`${base}/tiebreaks/${tie.tiebreak.id}/rounds`, 'POST', {
      roundId: 2,
    });
    await call(`${base}/tiebreaks/${tie.tiebreak.id}/refresh`, 'POST', {});
    expect((await confirm()).status).toBe(409);
    points('P11', 2, 1);
    await call(`${base}/tiebreaks/${tie.tiebreak.id}/refresh`, 'POST', {});
    expect((await confirm()).status).toBe(200);
  });
  it('desempate survival exige Liga posterior', async () => {
    await manual();
    await settings();
    const tie: any = await (
      await call(`${base}/round-links/1/duos/tiebreak`, 'POST', {})
    ).json();
    expect(
      (
        await call(`${base}/tiebreaks/${tie.tiebreak.id}/rounds`, 'POST', {
          roundId: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await call(`${base}/tiebreaks/${tie.tiebreak.id}/rounds`, 'POST', {
          roundId: 2,
        })
      ).status,
    ).toBe(409);
  });
  it('bloquea bypass de parejas en knockout y excepción sin motivo', async () => {
    await manual();
    expect(
      (await call(`${base}/stages/2/knockout`, 'PUT', { encounters: [] }))
        .status,
    ).toBe(409);
    db.exec(
      "INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id) VALUES(2,4,'SF-1',1,2)",
    );
    expect(
      (
        await call(`${base}/encounters/1/winner`, 'PUT', {
          winnerEntryId: 1,
          resolution: 'admin',
        })
      ).status,
    ).toBe(400);
  });
  it('preserva empates de semifinal y permite motor TAFA compartido', async () => {
    await manual();
    db.exec(
      "INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id) VALUES(2,4,'SF-1',1,2);UPDATE rounds SET status='finished' WHERE id=4",
    );
    const k: any = await (
      await call('competition-engine/stages/2/knockout')
    ).json();
    expect(k.encounters[0].status).toBe('tied');
    const response = await call(`${base}/encounters/1/tiebreak`, 'POST', {});
    expect(response.status).toBe(201);
    const tie: any = await response.json();
    expect(
      (
        await call(`${base}/tiebreaks/${tie.tiebreak.id}/rounds`, 'POST', {
          roundId: 5,
        })
      ).status,
    ).toBe(409);
    db.exec("UPDATE rounds SET category='LIGA' WHERE id=5");
    expect(
      (
        await call(`${base}/tiebreaks/${tie.tiebreak.id}/rounds`, 'POST', {
          roundId: 5,
        })
      ).status,
    ).toBe(200);
  });
});
