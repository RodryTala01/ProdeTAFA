import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { handleCompetitionTotalGroups } from '../worker/competition-total-groups';
import { handleCompetitionTotalSegments } from '../worker/competition-total-segments';
import { handleCompetitionTotalProgression } from '../worker/competition-total-progression';
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
    handleCompetitionTotalGroups,
    handleCompetitionTotalSegments,
    handleCompetitionTotalProgression,
    handleCompetitionKnockout,
    handleCompetitionTiebreak,
  ]) {
    const r = await h(req, env());
    if (r) return r;
  }
  throw Error('No route ' + path);
}
const id = (n: number) => 'P' + String(n).padStart(2, '0');
function groups(sizes: number[]) {
  let offset = 1;
  return sizes.map((size, i) => ({
    code: String.fromCharCode(65 + i),
    userIds: Array.from({ length: size }, () => id(offset++)),
  }));
}
function members(n: number) {
  db.prepare('DELETE FROM season_division_members WHERE user_id>?').run(id(n));
}
async function setup(sizes = [4, 4, 4, 4, 4, 4, 4, 4]) {
  members(sizes.reduce((a, b) => a + b, 0));
  const r = await call(`${base}/stages/1/total/groups`, 'POST', {
    groups: groups(sizes),
  });
  expect(r.status).toBe(200);
}
function dates() {
  for (let i = 1; i <= 6; i++) {
    db.prepare("INSERT INTO rounds(id,name,category) VALUES (?,?,'COPA')").run(
      i,
      'Fecha ' + i,
    );
    db.prepare(
      'INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES (?,1,?,?,?)',
    ).run(i, i < 3 ? 1 : i - 1, i, i < 3 ? i : 1);
    for (let j = 1; j <= 12; j++)
      db.prepare(
        "INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_name,away_team_name,kickoff_at) VALUES (?,?,'test',?,'Local','Visitante',?)",
      ).run(
        i * 100 + j,
        i,
        String(i * 100 + j),
        `2099-01-${String(i).padStart(2, '0')}T${String(j).padStart(2, '0')}:00:00Z`,
      );
  }
  db.exec(
    'INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES (7,1,6,6,1)',
  );
}
async function fixture() {
  expect(
    (await call(`${base}/stages/1/total/segments`, 'POST', {})).status,
  ).toBe(200);
  expect(
    (await call(`${base}/stages/1/total/fixture`, 'POST', {})).status,
  ).toBe(200);
}
function results() {
  db.exec(
    "UPDATE matches SET result_finalized_at=datetime('now') WHERE round_id IN (1,2)",
  );
  const entries = db
    .prepare(
      'SELECT m.user_id,g.seed_position FROM competition_group_entries g JOIN competition_entry_members m ON m.entry_id=g.entry_id',
    )
    .all() as any[];
  for (const e of entries)
    for (const m of db
      .prepare('SELECT id FROM matches WHERE round_id IN (1,2)')
      .all() as any[]) {
      const points = e.seed_position === 1 ? 3 : e.seed_position === 2 ? 1 : 0;
      const row = db
        .prepare(
          'INSERT INTO predictions(user_id,match_id,predicted_home_score,predicted_away_score) VALUES (?,?,1,0) RETURNING id',
        )
        .get(e.user_id, m.id) as any;
      db.prepare(
        "INSERT INTO official_predictions(id,user_id,match_id,predicted_home_score,predicted_away_score,updated_at,source) VALUES (?,?,?,1,0,datetime('now'),'admin')",
      ).run(row.id, e.user_id, m.id);
      db.prepare(
        "INSERT INTO prediction_scores(prediction_id,result_type,base_points,total_points,calculated_at) VALUES (?,?,?,?,datetime('now'))",
      ).run(
        row.id,
        points === 3 ? 'FULL' : points === 1 ? 'PARTIAL' : 'ERROR',
        points,
        points,
      );
    }
}
async function qualify(body: any = {}, preview = false) {
  return call(
    `${base}/stages/1/total/qualify${preview ? '/preview' : ''}`,
    'POST',
    { targetStageId: 2, targetSize: 16, ...body },
  );
}
async function progress(
  source: number,
  target: number,
  kind = 'winners',
  body: any = { random: true },
) {
  return call(`${base}/stages/${source}/total-progression/${kind}`, 'POST', {
    targetStageId: target,
    roundLinkId: target === 6 ? 7 : target + 1,
    ...body,
  });
}
function confirmed(stage: number) {
  db.prepare(
    "UPDATE competition_encounters SET status='finished',winner_entry_id=entry_a_id,resolution='admin',admin_confirmed_at=datetime('now') WHERE stage_id=?",
  ).run(stage);
}
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  for (const f of readdirSync('migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    db.exec(readFileSync('migrations/' + f, 'utf8'));
  for (const user of [
    'admin',
    'participant',
    ...Array.from({ length: 32 }, (_, i) => id(i + 1)),
  ])
    db.prepare(
      'INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES (?,?,?,?,?)',
    ).run(user, user, user, 'hash', user === 'admin' ? 'admin' : 'participant');
  for (const role of ['admin', 'participant'])
    db.prepare(
      "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,'2099-01-01')",
    ).run(role, role, createHash('sha256').update(role).digest('hex'));
  db.exec(
    `INSERT INTO tafa_seasons(id,season_number,name) VALUES(1,32,'T32');INSERT INTO season_divisions(id,season_id,code,name) VALUES(1,1,'A','A'),(2,1,'B','B');INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(1,1,'COPA_TOTAL','Copa Total','Copa Total','CUP');`,
  );
  for (let i = 1; i <= 32; i++)
    db.prepare(
      'INSERT INTO season_division_members(season_id,division_id,user_id) VALUES(1,?,?)',
    ).run(i <= 16 ? 1 : 2, id(i));
  for (let i = 1; i <= 6; i++)
    db.prepare(
      'INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES(?,1,?,?,?,?)',
    ).run(
      i,
      'S' + i,
      ['Grupos', 'Octavos', 'Cuartos', 'Semifinal', 'Final', 'Tercer puesto'][
        i - 1
      ],
      i === 1 ? 'ROUND_ROBIN_GROUPS' : 'KNOCKOUT',
      i,
    );
});
afterEach(() => db.close());
describe('Copa Total Admin: DB y endpoints reales', () => {
  it('incluye vigentes A+B y excluye inactivos/no integrantes', async () => {
    db.exec("UPDATE users SET is_active=0 WHERE id='P32'");
    const r = await call(`${base}/stages/1/total/groups`);
    const d = (await r.json()) as any;
    expect(d.eligible).toHaveLength(31);
    expect(new Set(d.eligible.map((p: any) => p.divisionCode))).toEqual(
      new Set(['A', 'B']),
    );
    expect(d.eligible.some((p: any) => p.userId === 'participant')).toBe(false);
  });
  it.each(['min', 'max', 'duplicate', 'missing', 'foreign'])(
    'rechaza configuración %s sin escrituras',
    async (kind) => {
      const g = groups([4, 4, 4, 4, 4, 4, 4, 4]);
      if (kind === 'min') g[0].userIds = g[0].userIds.slice(0, 2);
      if (kind === 'max') g[0].userIds.push('P20', 'P21');
      if (kind === 'duplicate') g[0].userIds[0] = 'P05';
      if (kind === 'missing') g.pop();
      if (kind === 'foreign') g[0].userIds[0] = 'participant';
      expect(
        (await call(`${base}/stages/1/total/groups`, 'POST', { groups: g }))
          .status,
      ).toBe(400);
      expect(
        db.prepare('SELECT COUNT(*) n FROM competition_groups').get()?.n,
      ).toBe(0);
    },
  );
  it('manual auditado, grupos entre 3 y 5, sin semilla', async () => {
    await setup([3, 4, 5]);
    const a = JSON.parse(
      String(
        db
          .prepare(
            "SELECT after_json FROM audit_log WHERE action='competition.total_groups_configured'",
          )
          .get()?.after_json,
      ),
    );
    expect(a.configurationMode).toBe('MANUAL');
    expect(a).not.toHaveProperty('randomSeed');
  });
  it('sorteo usa IFFHS y campeón Total A1, audita semilla', async () => {
    db.exec(
      `INSERT INTO tafa_seasons(id,season_number,name) VALUES(2,31,'T31');INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(2,2,'COPA_TOTAL','Total','Total','CUP');INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES(100,2,'INDIVIDUAL','P32');INSERT INTO competition_entry_members(entry_id,user_id) VALUES(100,'P32');INSERT INTO competition_results(competition_id,entry_id,result_code) VALUES(2,100,'CHAMPION');`,
    );
    const r = await call(`${base}/stages/1/total/groups/draw`, 'POST', {
      groupSizes: Array(8).fill(4),
    });
    expect(r.status).toBe(200);
    const d = (await r.json()) as any;
    expect(d.groups[0].userIds[0]).toBe('P32');
    expect(new Set(d.groups.flatMap((g: any) => g.userIds)).size).toBe(32);
    expect(d.randomSeed).toEqual(expect.any(Number));
    expect(d.configurationMode).toBe('AUTOMATIC');
  });
  it('requiere dos Fechas, 12 partidos cada una', async () => {
    await setup();
    expect(
      (await call(`${base}/stages/1/total/segments`, 'POST', {})).status,
    ).toBe(409);
    dates();
    db.exec('DELETE FROM matches WHERE id=201');
    expect(
      (await call(`${base}/stages/1/total/segments`, 'POST', {})).status,
    ).toBe(409);
  });
  it('congela seis segmentos de cuatro partidos; reordenar kickoff no cambia IDs', async () => {
    await setup();
    dates();
    const r = await call(`${base}/stages/1/total/segments`, 'POST', {});
    const d = (await r.json()) as any;
    expect(d.segments).toHaveLength(6);
    for (const s of d.segments) expect(s.matches).toHaveLength(4);
    const ids = d.segments.map((s: any) =>
      s.matches.map((m: any) => m.matchId),
    );
    db.exec(
      "UPDATE matches SET kickoff_at='2100-01-01T00:00:00Z' WHERE id=101",
    );
    const after = await call(`${base}/stages/1/total/segments`);
    expect(
      ((await after.json()) as any).segments.map((s: any) =>
        s.matches.map((m: any) => m.matchId),
      ),
    ).toEqual(ids);
  });
  it.each([
    [3, 6],
    [4, 12],
    [5, 10],
  ])('fixture grupo %s tiene %s cruces', async (size, count) => {
    await setup([size]);
    dates();
    await fixture();
    const pairs = db
      .prepare(
        'SELECT entry_a_id a,entry_b_id b,segment_id FROM competition_encounters',
      )
      .all() as any[];
    expect(pairs).toHaveLength(count);
    const counts = new Map<string, number>();
    for (const p of pairs) {
      const k = [p.a, p.b].sort().join('-');
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(new Set(counts.values())).toEqual(new Set([size === 5 ? 1 : 2]));
    if (size === 5)
      expect(new Set(pairs.map((p) => p.segment_id)).size).toBe(5);
    expect(
      (await call(`${base}/stages/1/total/fixture`, 'POST', {})).status,
    ).toBe(409);
    expect(
      (await call(`${base}/stages/1/total/segments`, 'POST', {})).status,
    ).toBe(409);
  });
  it('tabla deportiva completa y empate conserva posición', async () => {
    await setup([4]);
    dates();
    await fixture();
    results();
    const d = (await (
      await call('competition-engine/stages/1/total/groups')
    ).json()) as any;
    const rows = d.groups[0].standings;
    expect(rows[0]).toMatchObject({
      played: 6,
      won: 6,
      drawn: 0,
      lost: 0,
      gf: 72,
      ga: 8,
      gd: 64,
      points: 18,
      position: 1,
    });
    expect(rows[2].position).toBe(rows[3].position);
    expect(d.groups[0].provisional).toBe(false);
  });
  it('fase sin fixture y bloques incompletos son provisionales', async () => {
    await setup();
    expect((await qualify()).status).toBe(409);
    dates();
    await fixture();
    expect((await qualify()).status).toBe(409);
  });
  it('clasifica primeros y segundos con preview sin persistir y snapshot confirmado', async () => {
    await setup();
    dates();
    await fixture();
    results();
    const preview = await qualify({}, true);
    expect(preview.status).toBe(200);
    expect(
      db.prepare('SELECT COUNT(*) n FROM competition_stage_qualifiers').get()
        ?.n,
    ).toBe(0);
    expect((await qualify()).status).toBe(200);
    const d = (await (
      await call('competition-engine/stages/1/total/qualifiers')
    ).json()) as any;
    expect(d.qualifiers).toHaveLength(16);
    expect(
      d.qualifiers.every(
        (q: any) => [1, 2].includes(q.sourcePosition) && q.confirmedAt,
      ),
    ).toBe(true);
  });
  it('comodines sin corte empatado completan el cuadro', async () => {
    await setup([3, 3, 3]);
    dates();
    await fixture();
    results();
    expect(
      (
        await qualify({
          targetSize: 9,
          directPositions: [1, 2],
          wildcardPosition: 3,
          wildcardCount: 3,
        })
      ).status,
    ).toBe(200);
    expect(
      db
        .prepare(
          "SELECT COUNT(*) n FROM competition_stage_qualifiers WHERE qualification_type='WILDCARD'",
        )
        .get()?.n,
    ).toBe(3);
  });
  it('empate en corte exige resolución y permite selección manual de comodín', async () => {
    await setup([3, 3, 3]);
    dates();
    await fixture();
    results();
    const r = await qualify({ targetSize: 7, wildcardCount: 1 });
    expect(r.status).toBe(409);
    const data = (await r.json()) as any;
    expect(data.manualResolutionRequired).toBe(true);
    expect(data.cutoffTie).toHaveLength(3);
    expect(
      (
        await qualify({
          targetSize: 7,
          wildcardCount: 1,
          manualWildcardEntryIds: [data.cutoffTie[0].entryId],
        })
      ).status,
    ).toBe(200);
  });
  it('selección excepcional completa requiere entradas válidas únicas y queda auditada', async () => {
    await setup([4]);
    dates();
    await fixture();
    results();
    const entries = (
      db.prepare('SELECT id FROM competition_entries').all() as any[]
    ).map((e) => e.id);
    expect(
      (
        await qualify({
          targetSize: 2,
          manualQualifiedEntryIds: [entries[0], entries[0], entries[1]],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await qualify({
          targetSize: 2,
          manualQualifiedEntryIds: entries.slice(0, 2),
          reason: 'Edición excepcional',
        })
      ).status,
    ).toBe(200);
    const a = JSON.parse(
      String(
        db
          .prepare(
            "SELECT after_json FROM audit_log WHERE action='competition.total_qualifiers_confirmed'",
          )
          .get()?.after_json,
      ),
    );
    expect(a.configurationMode).toBe('MANUAL');
  });
  it.each(['manual', 'automatic'])(
    'Octavos %s usa exactamente clasificados',
    async (mode) => {
      await setup();
      dates();
      await fixture();
      results();
      await qualify();
      const ids = (
        db
          .prepare(
            'SELECT entry_id FROM competition_stage_qualifiers ORDER BY ranking_order',
          )
          .all() as any[]
      ).map((e) => e.entry_id);
      const pairs = Array.from({ length: 8 }, (_, i) => ({
        entryAId: ids[i * 2],
        entryBId: ids[i * 2 + 1],
      }));
      if (mode === 'manual') {
        const bad = structuredClone(pairs);
        bad[1].entryAId = bad[0].entryAId;
        expect((await progress(1, 2, 'qualified', { pairs: bad })).status).toBe(
          409,
        );
      }
      const r = await progress(
        1,
        2,
        'qualified',
        mode === 'manual' ? { pairs } : { random: true },
      );
      expect(r.status).toBe(200);
      const d = (await r.json()) as any;
      expect(d.pairs.flat().sort()).toEqual(ids.sort());
      expect(d.configurationMode).toBe(
        mode === 'manual' ? 'MANUAL' : 'AUTOMATIC',
      );
      expect((await qualify()).status).toBe(409);
    },
  );
  it('Cuartos, Semis, Final y tercer puesto usan confirmados, con Fecha compartida', async () => {
    await setup();
    dates();
    await fixture();
    results();
    await qualify();
    await progress(1, 2, 'qualified');
    expect((await progress(2, 3)).status).toBe(409);
    confirmed(2);
    expect((await progress(2, 3)).status).toBe(200);
    confirmed(3);
    expect((await progress(3, 4)).status).toBe(200);
    confirmed(4);
    const semis = db
      .prepare(
        'SELECT entry_a_id,entry_b_id FROM competition_encounters WHERE stage_id=4',
      )
      .all() as any[];
    expect((await progress(4, 5)).status).toBe(200);
    expect((await progress(4, 6, 'third-place')).status).toBe(200);
    const final = db
      .prepare(
        'SELECT entry_a_id,entry_b_id FROM competition_encounters WHERE stage_id=5',
      )
      .get() as any;
    const third = db
      .prepare(
        'SELECT entry_a_id,entry_b_id FROM competition_encounters WHERE stage_id=6',
      )
      .get() as any;
    expect(Object.values(final).sort()).toEqual(
      semis.map((e) => e.entry_a_id).sort(),
    );
    expect(Object.values(third).sort()).toEqual(
      semis.map((e) => e.entry_b_id).sort(),
    );
  });
  it('desempate TAFA reutilizado y genérico no elude clasificación', async () => {
    await setup();
    dates();
    await fixture();
    results();
    await qualify();
    await progress(1, 2, 'qualified');
    expect(
      (await call(`${base}/stages/2/knockout`, 'PUT', { encounters: [] }))
        .status,
    ).toBe(409);
    db.exec("UPDATE rounds SET status='finished' WHERE id=3");
    const d = (await (
      await call('competition-engine/stages/2/knockout')
    ).json()) as any;
    expect(d.encounters[0].status).toBe('tied');
    expect(
      (
        await call(
          `${base}/encounters/${d.encounters[0].id}/tiebreak`,
          'POST',
          {},
        )
      ).status,
    ).toBe(201);
  });
  it('protege endpoints de administración y temporadas cerradas', async () => {
    expect(
      (
        await call(
          `${base}/stages/1/total/groups`,
          'GET',
          undefined,
          'participant',
        )
      ).status,
    ).toBe(403);
    db.exec("UPDATE tafa_seasons SET status='finished'");
    expect(
      (
        await call(`${base}/stages/1/total/groups`, 'POST', {
          groups: groups(Array(8).fill(4)),
        })
      ).status,
    ).toBe(409);
  });
  it('Cuartos y Semifinal manuales validan todos los ganadores reales',async()=>{
    await setup();dates();await fixture();results();await qualify();await progress(1,2,'qualified');confirmed(2);
    for(const [source,target] of [[2,3],[3,4]]){
      const response=await call(`${base}/stages/${source}/total-progression/winners?targetStageId=${target}&roundLinkId=${target+1}`);
      expect(response.status).toBe(200);const data=await response.json() as any;
      const pairs=Array.from({length:data.pool.length/2},(_,i)=>({entryAId:data.pool[2*i].entryId,entryBId:data.pool[2*i+1].entryId}));
      const bad=structuredClone(pairs);bad[0].entryAId=999;
      expect((await progress(source,target,'winners',{pairs:bad})).status).toBe(409);
      expect((await progress(source,target,'winners',{pairs})).status).toBe(200);confirmed(target);
    }
    expect((await progress(3,6,'third-place')).status).toBe(409);
  });
  it('corrige cruces con motivo antes de publicar, y bloquea después',async()=>{
    await setup();dates();await fixture();results();await qualify();await progress(1,2,'qualified');
    expect((await progress(1,2,'qualified',{random:true,replace:true})).status).toBe(409);
    expect((await progress(1,2,'qualified',{random:true,replace:true,reason:'Corrección local'})).status).toBe(200);
    db.exec("UPDATE rounds SET published_at=datetime('now') WHERE id=3");
    expect((await progress(1,2,'qualified',{random:true,replace:true,reason:'Fuera de plazo'})).status).toBe(409);
  });

});
