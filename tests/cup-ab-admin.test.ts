import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { handleCompetitionGroups } from "../worker/competition-groups";
import { handleCompetitionDraw } from "../worker/competition-draw";
import { handleCompetitionCupAbProgression } from "../worker/competition-cup-ab-progression";
import { handleCompetitionKnockout } from "../worker/competition-knockout";
import { handleCompetitionTiebreak } from "../worker/competition-tiebreak";
let db: DatabaseSync;
function environment() {
  const DB = {
    prepare(sql: string) {
      let values: any[] = [];
      return {
        bind(...args: any[]) {
          values = args;
          return this;
        },
        async first() {
          return db.prepare(sql).get(...values) ?? null;
        },
        async all() {
          return { results: db.prepare(sql).all(...values) };
        },
        async run() {
          const r = db.prepare(sql).run(...values);
          return {
            meta: {
              changes: Number(r.changes),
              last_row_id: Number(r.lastInsertRowid),
            },
          };
        },
      };
    },
    async batch(statements: any[]) {
      db.exec("BEGIN");
      try {
        const out = [];
        for (const s of statements) out.push(await s.run());
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { DB: DB as unknown as D1Database };
}
async function call(
  path: string,
  method = "GET",
  body?: object,
  role = "admin",
) {
  const req = new Request(`http://local/api/${path}`, {
    method,
    headers: {
      cookie: `prode_session=${role}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const handler of [
    handleCompetitionGroups,
    handleCompetitionDraw,
    handleCompetitionCupAbProgression,
    handleCompetitionKnockout,
    handleCompetitionTiebreak,
  ]) {
    const r = await handler(req, environment());
    if (r) return r;
  }
  throw new Error(`No route ${path}`);
}
const base = "admin/competition-engine";
const people = (division = "A") =>
  Array.from(
    { length: 16 },
    (_, i) => `${division}${String(i + 1).padStart(2, "0")}`,
  );
const groups = (division = "A") =>
  Array.from({ length: 4 }, (_, i) => ({
    code: "ABCD"[i],
    name: `Grupo ${"ABCD"[i]}`,
    userIds: people(division).slice(i * 4, i * 4 + 4),
  }));
async function setupGroups() {
  const r = await call(`${base}/stages/1/groups`, "POST", { groups: groups() });
  expect(r.status).toBe(200);
}
function linkDates() {
  db.exec(`INSERT INTO rounds(id,name,status,category) VALUES (1,'Grupos 1','finished','COPA'),(2,'Grupos 2','finished','COPA'),(3,'Octavos','draft','COPA'),(4,'Cuartos','draft','COPA'),(5,'Semifinal','draft','COPA'),(6,'Final','draft','COPA');
  INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES (1,1,1,1,1),(2,1,1,2,2),(3,1,2,3,1),(4,1,3,4,1),(5,1,4,5,1),(6,1,5,6,1);`);
}
const progress = (source: number, action: string) =>
  `${base}/stages/${source}/cup-ab-progression/${action}`;
async function preview(source: number, action: string, target: number) {
  const r = await call(
    `${progress(source, action)}?targetStageId=${target}&roundLinkId=${target + 1}&groupStageId=1`,
  );
  expect(r.status).toBe(200);
  return ((await r.json()) as any).pool as any[];
}
const r16Pairs = (pool: any[]) =>
  pool
    .filter((p) => p.position === 2)
    .map((p, i) => [
      p.entryId,
      pool.filter((p) => p.position === 3)[i].entryId,
    ]);
const adjacent = (pool: any[]) =>
  Array.from({ length: pool.length / 2 }, (_, i) => [
    pool[2 * i].entryId,
    pool[2 * i + 1].entryId,
  ]);
async function savePhase(
  source: number,
  action: string,
  target: number,
  pairs: number[][],
) {
  return call(progress(source, action), "POST", {
    targetStageId: target,
    roundLinkId: target + 1,
    groupStageId: 1,
    mode: "MANUAL",
    pairs,
  });
}
function confirm(stage: number) {
  db.prepare(
    "UPDATE competition_encounters SET status='finished',winner_entry_id=entry_a_id,resolution='admin',admin_confirmed_at=datetime('now') WHERE stage_id=?",
  ).run(stage);
}
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  for (const f of readdirSync("migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(`migrations/${f}`, "utf8"));
  for (const id of ["admin", "participant", ...people(), ...people("B")]) {
    db.prepare(
      "INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES (?,?,?,?,?)",
    ).run(id, id, id, "hash", id === "admin" ? "admin" : "participant");
  }
  for (const role of ["admin", "participant"])
    db.prepare(
      "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,'2099-01-01')",
    ).run(role, role, createHash("sha256").update(role).digest("hex"));
  db.exec(`INSERT INTO tafa_seasons(id,season_number,name) VALUES (1,32,'T32');
    INSERT INTO season_divisions(id,season_id,code,name) VALUES (1,1,'A','A'),(2,1,'B','B');
    INSERT INTO competitions(id,season_id,division_id,code,canonical_name,display_name,family) VALUES (1,1,1,'COPA_A','Copa A','Copa A','CUP'),(2,1,2,'COPA_B','Copa B','Copa B','CUP');`);
  for (const [index, division] of ["A", "B"].entries())
    for (const id of people(division))
      db.prepare(
        "INSERT INTO season_division_members(season_id,division_id,user_id) VALUES (1,?,?)",
      ).run(index + 1, id);
  for (let i = 1; i <= 5; i++)
    db.prepare(
      "INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES (?,1,?,?,?,?)",
    ).run(
      i,
      `S${i}`,
      `Etapa ${i}`,
      i === 1 ? "ACCUMULATIVE_GROUPS" : "KNOCKOUT",
      i,
    );
  db.exec(
    "INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES (6,2,'GROUPS','Grupos B','ACCUMULATIVE_GROUPS',1)",
  );
});
afterEach(() => db.close());
describe("Copa A/B: endpoints reales con SQLite", () => {
  it.each([
    [1, "A"],
    [6, "B"],
  ])(
    "sólo devuelve la división correspondiente etapa %s",
    async (stage, division) => {
      const r = await call(`${base}/stages/${stage}/groups`);
      const c = (await r.json()) as any;
      expect(c.eligible.map((p: any) => p.userId)).toEqual(
        people(String(division)),
      );
    },
  );
  it("protege la administración en backend", async () => {
    expect(
      (await call(`${base}/stages/1/groups`, "GET", undefined, "participant"))
        .status,
    ).toBe(403);
  });
  it("guarda manual, audita sin semilla y exige campeón A1 en ambas Copas", async () => {
    for (const [stage, division] of [
      [1, "A"],
      [6, "B"],
    ] as const) {
      const g = groups(division);
      const bad = await call(`${base}/stages/${stage}/groups`, "POST", {
        groups: g,
        defendingChampionUserId: people(division)[1],
      });
      expect(bad.status).toBe(400);
      expect(
        (
          await call(`${base}/stages/${stage}/groups`, "POST", {
            groups: g,
            defendingChampionUserId: people(division)[0],
          })
        ).status,
      ).toBe(200);
    }
    const audits = db
      .prepare(
        "SELECT after_json FROM audit_log WHERE action='competition.groups_configured'",
      )
      .all();
    expect(audits).toHaveLength(2);
    for (const a of audits) {
      const data = JSON.parse(String(a.after_json));
      expect(data.configurationMode).toBe("MANUAL");
      expect(data).not.toHaveProperty("randomSeed");
    }
  });
  it.each(["duplicate", "foreign", "missing"])(
    "rechaza grupos inválidos %s sin escrituras",
    async (kind) => {
      const g = groups();
      if (kind === "duplicate") g[1].userIds[0] = g[0].userIds[0];
      if (kind === "foreign") g[0].userIds[0] = "B01";
      if (kind === "missing") g[0].userIds.pop();
      expect(
        (await call(`${base}/stages/1/groups`, "POST", { groups: g })).status,
      ).toBe(400);
      expect(
        db.prepare("SELECT COUNT(*) n FROM competition_groups").get()?.n,
      ).toBe(0);
    },
  );
  it("mantiene sorteo por bombos y semilla auditada", async () => {
    const r = await call(`${base}/stages/1/groups/draw`, "POST", {
      rankingUserIds: people(),
      defendingChampionUserId: "A16",
      groupCount: 4,
    });
    expect(r.status).toBe(200);
    const d = (await r.json()) as any;
    expect(d.groups[0].userIds[0]).toBe("A16");
    expect(new Set(d.groups.flatMap((g: any) => g.userIds)).size).toBe(16);
    const a = JSON.parse(
      String(
        db
          .prepare(
            "SELECT after_json FROM audit_log WHERE action='competition.groups_drawn'",
          )
          .get()?.after_json,
      ),
    );
    expect(a.randomSeed).toBe(d.randomSeed);
    expect(a.configurationMode).toBe("AUTOMATIC");
  });
  it("no cambia grupos con fechas vinculadas y tabla sin 2 fechas es provisional", async () => {
    await setupGroups();
    const t = await call("competition-engine/cups/COPA_A/groups?season=32");
    expect(((await t.json()) as any).provisional).toBe(true);
    linkDates();
    expect(
      (await call(`${base}/stages/1/groups`, "POST", { groups: groups() }))
        .status,
    ).toBe(409);
  });
  it("acepta R16 manual 2 contra 3 y audita sin randomSeed", async () => {
    await setupGroups();
    linkDates();
    const pool = await preview(1, "r16", 2);
    const r = await savePhase(1, "r16", 2, r16Pairs(pool));
    expect(r.status).toBe(200);
    const a = JSON.parse(
      String(
        db
          .prepare(
            "SELECT after_json FROM audit_log WHERE action='competition.cup_ab_r16_drawn'",
          )
          .get()?.after_json,
      ),
    );
    expect(a.configurationMode).toBe("MANUAL");
    expect(a).not.toHaveProperty("randomSeed");
  });
  it.each(["second-second", "duplicate", "foreign", "missing"])(
    "rechaza R16 %s en backend",
    async (kind) => {
      await setupGroups();
      linkDates();
      const pool = await preview(1, "r16", 2);
      const pairs = r16Pairs(pool);
      if (kind === "second-second") {
        [pairs[0][1], pairs[1][0]] = [pairs[1][0], pairs[0][1]];
      }
      if (kind === "duplicate") pairs[1][0] = pairs[0][0];
      if (kind === "foreign") pairs[0][0] = 999;
      if (kind === "missing") pairs.pop();
      expect((await savePhase(1, "r16", 2, pairs)).status).toBe(400);
      expect(
        db.prepare("SELECT COUNT(*) n FROM competition_encounters").get()?.n,
      ).toBe(0);
    },
  );
  it("el endpoint genérico no permite eludir la validación A/B", async () => {
    expect(
      (await call(`${base}/stages/2/knockout`, "PUT", { encounters: [] }))
        .status,
    ).toBe(409);
  });
  it("conserva automático y permite corrección auditada sólo antes de publicar", async () => {
    await setupGroups();
    linkDates();
    const path = progress(1, "r16");
    const body = { targetStageId: 2, roundLinkId: 3 };
    expect((await call(path, "POST", body)).status).toBe(200);
    expect((await call(path, "POST", { ...body, replace: true })).status).toBe(
      409,
    );
    expect(
      (
        await call(path, "POST", {
          ...body,
          replace: true,
          reason: "Sorteo externo corregido",
        })
      ).status,
    ).toBe(200);
    db.exec("UPDATE rounds SET published_at=datetime('now') WHERE id=3");
    expect(
      (
        await call(path, "POST", {
          ...body,
          replace: true,
          reason: "No permitido",
        })
      ).status,
    ).toBe(409);
  });
  it("cuartos, semifinal y final usan exactamente ganadores confirmados", async () => {
    await setupGroups();
    linkDates();
    await savePhase(1, "r16", 2, r16Pairs(await preview(1, "r16", 2)));
    expect(
      (
        await call(
          `${progress(2, "quarterfinals")}?targetStageId=3&roundLinkId=4&groupStageId=1`,
        )
      ).status,
    ).toBe(409);
    confirm(2);
    const qf = await preview(2, "quarterfinals", 3);
    expect(qf).toHaveLength(8);
    const bad = adjacent(qf);
    bad[0][0] = 999;
    expect((await savePhase(2, "quarterfinals", 3, bad)).status).toBe(400);
    expect((await savePhase(2, "quarterfinals", 3, adjacent(qf))).status).toBe(
      200,
    );
    confirm(3);
    const sf = await preview(3, "semifinals", 4);
    expect(sf).toHaveLength(4);
    expect((await savePhase(3, "semifinals", 4, adjacent(sf))).status).toBe(
      200,
    );
    confirm(4);
    const final = await preview(4, "final", 5);
    expect(final).toHaveLength(2);
    expect((await savePhase(4, "final", 5, adjacent(final))).status).toBe(200);
    expect(
      db
        .prepare(
          "SELECT COUNT(*) n FROM competition_encounters WHERE stage_id=5",
        )
        .get()?.n,
    ).toBe(1);
  });
  it("no permite usar otra etapa como origen para saltar una fase", async () => {
    await setupGroups();
    linkDates();
    expect(
      (
        await call(progress(2, "semifinals"), "POST", {
          targetStageId: 4,
          roundLinkId: 5,
        })
      ).status,
    ).toBe(409);
  });
  it("empate sigue pendiente, permite TAFA y exige motivo a corrección excepcional", async () => {
    await setupGroups();
    linkDates();
    await savePhase(1, "r16", 2, r16Pairs(await preview(1, "r16", 2)));
    db.exec("UPDATE rounds SET status='finished' WHERE id=3");
    const r = await call("competition-engine/stages/2/knockout");
    const e = ((await r.json()) as any).encounters[0];
    expect(e.status).toBe("tied");
    expect(e.winner).toBeNull();
    const tie = await call(`${base}/encounters/${e.id}/tiebreak`, "POST", {});
    expect(tie.status).toBe(201);
    const id = ((await tie.json()) as any).tiebreak.id;
    expect(
      (await call(`${base}/tiebreaks/${id}/rounds`, "POST", { roundId: 4 }))
        .status,
    ).toBe(200);
    expect(
      (
        await call(`${base}/encounters/${e.id}/winner`, "PUT", {
          winnerEntryId: e.entryA.id,
          resolution: "admin",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(`${base}/encounters/${e.id}/winner`, "PUT", {
          winnerEntryId: e.entryA.id,
          resolution: "admin",
          reason: "Resolución excepcional local",
        })
      ).status,
    ).toBe(200);
    const audit = JSON.parse(
      String(
        db
          .prepare(
            "SELECT after_json FROM audit_log WHERE action='competition.encounter_winner_confirmed'",
          )
          .get()?.after_json,
      ),
    );
    expect(audit.reason).toBe("Resolución excepcional local");
  });
  it("invalida confirmación si una corrección cambia el ganador antes del avance", async () => {
    await setupGroups();
    linkDates();
    await savePhase(1, "r16", 2, r16Pairs(await preview(1, "r16", 2)));
    const e = db
      .prepare("SELECT * FROM competition_encounters WHERE stage_id=2 LIMIT 1")
      .get() as any;
    db.exec("UPDATE rounds SET status='finished' WHERE id=3");
    db.prepare(
      "INSERT INTO competition_entry_bonuses(competition_id,round_link_id,entry_id,points,reason) VALUES (1,3,?,3,'Fixture de prueba')",
    ).run(e.entry_a_id);
    expect(
      (
        await call(`${base}/encounters/${e.id}/winner`, "PUT", {
          winnerEntryId: e.entry_a_id,
          resolution: "normal",
        })
      ).status,
    ).toBe(200);
    expect(
      db
        .prepare(
          "SELECT admin_confirmed_at FROM competition_encounters WHERE id=?",
        )
        .get(e.id)?.admin_confirmed_at,
    ).toBeTruthy();
    db.prepare(
      "UPDATE competition_entry_bonuses SET entry_id=? WHERE entry_id=?",
    ).run(e.entry_b_id, e.entry_a_id);
    expect(
      (
        await call(
          `${progress(2, "quarterfinals")}?targetStageId=3&roundLinkId=4&groupStageId=1`,
        )
      ).status,
    ).toBe(409);
    expect(
      db
        .prepare(
          "SELECT winner_entry_id,admin_confirmed_at FROM competition_encounters WHERE id=?",
        )
        .get(e.id),
    ).toMatchObject({
      winner_entry_id: e.entry_b_id,
      admin_confirmed_at: null,
    });
  });
  it("respeta campeón histórico A1 aunque el cuerpo intente reemplazarlo", async () => {
    db.exec(`INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(2,31,'T31','finished');
      INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(3,2,'COPA_A','Copa A','Copa A','CUP');
      INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES(100,3,'INDIVIDUAL','A02');
      INSERT INTO competition_entry_members(entry_id,user_id) VALUES(100,'A02');
      INSERT INTO competition_results(competition_id,entry_id,result_code) VALUES(3,100,'CHAMPION');`);
    expect(
      (
        await call(`${base}/stages/1/groups`, "POST", {
          groups: groups(),
          defendingChampionUserId: "A01",
        })
      ).status,
    ).toBe(400);
    const g = groups();
    [g[0].userIds[0], g[0].userIds[1]] = [g[0].userIds[1], g[0].userIds[0]];
    expect(
      (await call(`${base}/stages/1/groups`, "POST", { groups: g })).status,
    ).toBe(200);
  });
  it("el sorteo automático de cuartos y semifinales conserva todos los clasificados", async () => {
    await setupGroups();
    linkDates();
    await savePhase(1, "r16", 2, r16Pairs(await preview(1, "r16", 2)));
    confirm(2);
    for (const [source, action, target] of [
      [2, "quarterfinals", 3],
      [3, "semifinals", 4],
    ] as const) {
      const pool = await preview(source, action, target);
      const r = await call(progress(source, action), "POST", {
        targetStageId: target,
        roundLinkId: target + 1,
        groupStageId: 1,
      });
      expect(r.status).toBe(200);
      const result = (await r.json()) as any;
      expect(result.pairs.flat().sort()).toEqual(
        pool.map((p) => p.entryId).sort(),
      );
      expect(result.randomSeed).toEqual(expect.any(Number));
      confirm(target);
    }
  });
});
