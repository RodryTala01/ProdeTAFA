import { DatabaseSync } from 'node:sqlite';
// Local HTTP integration scenario; requires npm run dev:e2e and isolated D1.
// Fictional credentials only. Checkpoints preserve progress in .wrangler/e2e-t32.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:5174", root = ".wrangler/e2e-t32";
const cfg = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
assert(cfg.d1_databases.every((d) => d.remote === false));
const statePath = root + "/scenario.json";
mkdirSync(root, { recursive: true });
const S = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { done: {}, rounds: {}, stages: {}, links: {} };
const save = () => writeFileSync(statePath, JSON.stringify(S, null, 2));
let adminCookie = "";
const cookies = {};
async function api(path, method = "GET", body, cookie = adminCookie) {
  const r = await fetch(base + path, { method, redirect: "error", signal: AbortSignal.timeout(6e4), headers: { "content-type": "application/json", cookie }, body: body === void 0 ? void 0 : JSON.stringify(body) });
  const raw = await r.text();
  let d;
  try {
    d = JSON.parse(raw);
  } catch {
    throw Error(`${method} ${path} ${r.status}: ${raw.slice(0, 250)}`);
  }
  if (!r.ok) throw Error(`${method} ${path} ${r.status}: ${JSON.stringify(d)}`);
  return { d, cookie: r.headers.get("set-cookie")?.split(";")[0] };
}
const A = "/api/admin/competition-engine", P = "/api/competition-engine";
const call = async (p, m = "GET", b, c) => (await api(p, m, b, c)).d;
async function step(name, fn) {
  if (S.done[name]) return;
  console.log("START " + name);
  await fn();
  S.done[name] = true;
  save();
  console.log("PASS " + name);
}
async function stage(code, name, type = "KNOCKOUT") {
  const key = code + ":" + name;
  if (!S.stages[key]) {
    const d = await call(`${A}/competitions/${S.comps[code].id}/stages`, "POST", { code: name, name, stageType: type });
    S.stages[key] = d.stage.id;
    save();
  }
  return S.stages[key];
}
async function round(name, category = "COPA") {
  if (!S.rounds[name]) {
    const d = await call("/api/admin/rounds", "POST", { name: "E2E T32 " + name });
    S.rounds[name] = d.round.id;
    save();
  }
  const id = S.rounds[name];
  const detail = (await call(`/api/admin/rounds/${id}`)).round;
  for (let n = detail.matches.length; n < 12; n++) await call(`/api/admin/rounds/${id}/matches`, "POST", { matchType: n >= 10 ? "PENALTIES_ONLY" : "NORMAL", fixture: { providerFixtureId: `e2e-${id}-${n}`, kickoffAt: new Date(Date.UTC(2030, 0, 1) + id * 864e5 + n * 6e4).toISOString(), status: "NS", competition: { name: "Ficticio E2E local" }, home: { id: "h" + n, name: "Local " + (n + 1) }, away: { id: "a" + n, name: "Visitante " + (n + 1) }, goals: { home: null, away: null } } });
  return id;
}
async function link(code, st, r, sequence = 1) {
  const k = st + ":" + r;
  if (!S.links[k]) {
    await call(`${A}/competitions/${S.comps[code].id}/rounds`, "POST", { stageId: st, roundId: r, sequence });
    const d = await call(A);
    const c = d.seasons.find((s) => s.id === S.season).competitions.find((c2) => c2.code === code);
    S.links[k] = c.roundLinks.find((l) => l.stageId === st && l.roundId === r).id;
    save();
  }
  return S.links[k];
}
async function loginParticipants() {
  for (const u of S.users) if (!cookies[u.id]) cookies[u.id] = (await api("/api/auth/login", "POST", { phone: u.phone, password: "LocalE2E123!" }, "")).cookie;
}
async function play(name, tie = false) {
  await step("play:" + name, async () => {
    const r = S.rounds[name];
    let detail = (await call(`/api/admin/rounds/${r}`)).round;
    if (detail.status === "finished") return;
    if (detail.status === "draft") await call(`/api/admin/publish-round/${r}`, "PUT", {});
    await loginParticipants();
    for (const [i, u] of S.users.entries()) {
      const pts = tie && i === 1 ? 0 : i;
      for (let n = 0; n < 12; n++) {
        const full = n < Math.floor(pts / 3), partial = n >= Math.floor(pts / 3) && n < Math.floor(pts / 3) + pts % 3;
        await call(`/api/participant/predictions/${detail.matches[n].id}`, "PUT", { homeScore: full ? 1 : partial ? 2 : 0, awayScore: full || partial ? 0 : 1, extraTeamId: n >= 10 ? "h" + n : null }, cookies[u.id]);
      }
      await call(`/api/participant/rounds/${r}/submit`, "POST", {}, cookies[u.id]);
      if (i % 8 === 7) console.log(name + ": " + (i + 1) + " envíos");
    }
    const view = await call(`/api/participant/round?roundId=${r}`, "GET", void 0, cookies[S.users[0].id]);
    assert.equal(view.round.matches.length, 12);
    assert.equal(view.round.submitted, true);
    for (const m of detail.matches) await call(`/api/admin/matches/${m.id}/manual-result`, "PUT", { homeScore: 1, awayScore: 0, wentToPenalties: false, reason: "Resultado ficticio para E2E local" });
    await call(`/api/admin/finish-round/${r}`, "PUT", {});
  });
}
async function encounters(st) {
  return (await call(`${P}/stages/${st}/knockout`)).encounters;
}
async function winners(st, allowTie = false) {
  for (const e of await encounters(st)) {
    if (e.adminConfirmedAt) continue;
    if (e.status === "tied" && allowTie) {
      S.tieEncounter = e.id;
      save();
      continue;
    }
    assert(e.winner, `Sin ganador ${e.id} ${JSON.stringify(e)}`);
    await call(`${A}/encounters/${e.id}/winner`, "PUT", { winnerEntryId: e.winner.id, resolution: "normal" });
  }
}
try {
  const marker = await call("/__e2e-local");
  assert.deepEqual(marker, { storage: root, localOnly: true }, "Use only the isolated E2E server");
  const credentials = { fullName: "Admin E2E Local", phone: "0000032000", password: "LocalE2E123!" };
  if ((await call("/api/setup/status")).setupRequired) await api("/api/setup/admin", "POST", credentials, "");
  adminCookie = (await api("/api/auth/login", "POST", credentials, "")).cookie;
  await step("participants-and-season", async () => {
    S.users = [];
    const old = (await call("/api/admin/users")).users;
    for (let i = 0; i < 32; i++) {
      const phone = "0000032" + String(i + 1).padStart(3, "0");
      let u = old.find((u2) => u2.phone === phone);
      if (!u) u = (await call("/api/admin/users", "POST", { fullName: `E2E ${i < 16 ? "A" : "B"}${String(i % 16 + 1).padStart(2, "0")}`, phone, password: "LocalE2E123!" })).user;
      S.users.push({ id: u.id, phone, name: u.fullName });
    }
    const seasons = (await call(A)).seasons;
    let season = seasons.find((s) => s.seasonNumber === 32);
    if (!season) season = (await call(A + "/seasons", "POST", { seasonNumber: 32, name: "T32 E2E LOCAL" })).season;
    S.season = season.id;
    S.comps = Object.fromEntries(season.competitions.map((c) => [c.code, c]));
    await call(`${A}/seasons/${S.season}/divisions`, "PUT", { assignments: S.users.map((u, i) => ({ userId: u.id, divisionCode: i < 16 ? "A" : "B" })) });
    save();
  });
  await step("configure-all", async () => {
    const g1 = await round("Grupos1"), g2 = await round("Grupos2");
    for (const code of ["COPA_A", "COPA_B"]) {
      const st = await stage(code, "GROUPS", "ACCUMULATIVE_GROUPS");
      for (const r of [g1, g2]) {
        const key = st + ":" + r;
        if (S.links[key]) {
          await call(`${A}/competitions/${S.comps[code].id}/rounds/${S.links[key]}`, "DELETE");
          delete S.links[key];
          save();
        }
      }
      const people = S.users.slice(code === "COPA_A" ? 0 : 16, code === "COPA_A" ? 16 : 32);
      await call(`${A}/stages/${st}/groups`, "POST", { groups: Array.from({ length: 4 }, (_, i) => ({ code: "ABCD"[i], name: "Grupo " + "ABCD"[i], userIds: people.slice(i * 4, i * 4 + 4).map((u) => u.id) })) });
      await link(code, st, g1, 1);
      await link(code, st, g2, 2);
    }
    const total = await stage("COPA_TOTAL", "GROUPS", "ROUND_ROBIN_GROUPS");
    await call(`${A}/stages/${total}/total/groups`, "POST", { groups: Array.from({ length: 8 }, (_, i) => ({ code: "ABCDEFGH"[i], name: "Grupo " + "ABCDEFGH"[i], userIds: S.users.slice(i * 4, i * 4 + 4).map((u) => u.id) })) });
    await link("COPA_TOTAL", total, g1, 1);
    await link("COPA_TOTAL", total, g2, 2);
    await call(`${A}/stages/${total}/total/segments`, "POST", {});
    await call(`${A}/stages/${total}/total/fixture`, "POST", {});
    const duos = await stage("COPA_DUOS", "SURVIVAL", "SURVIVAL_TABLE");
    const dl = await link("COPA_DUOS", duos, g1);
    await call(`${A}/competitions/${S.comps.COPA_DUOS.id}/duos/pairs`, "POST", { pairs: Array.from({ length: 16 }, (_, i) => S.users.slice(i * 2, i * 2 + 2).map((u) => u.id)) });
    await call(`${A}/round-links/${dl}/duos/settings`, "PUT", { eliminateCount: 12, bonusByPosition: {} });
    const papa = await stage("COPA_PAPA", "R32");
    const pl = await link("COPA_PAPA", papa, g1);
    await call(`${P}/competitions/${S.comps.COPA_PAPA.id}/papa/seeding-proposal`);
    await call(`${A}/competitions/${S.comps.COPA_PAPA.id}/papa/initial-bracket`, "POST", { stageId: papa, roundLinkId: pl, pairs: Array.from({ length: 16 }, (_, i) => ({ userAId: S.users[i * 2].id, userBId: S.users[i * 2 + 1].id })) });
    await call(`${A}/seasons/${S.season}/status`, "PUT", { status: "active" });
  });
  await play("Grupos1", true);
  await play("Grupos2");
  await step("papa-tafa", async () => {
    const st = S.stages["COPA_PAPA:R32"];
    await winners(st, true);
    assert(S.tieEncounter);
    const t = await call(`${A}/encounters/${S.tieEncounter}/tiebreak`, "POST", {});
    S.tieId = t.tiebreak.id;
    save();
  });
  for (let n = 1; n <= 5; n++) {
    const name = "Liga" + n;
    await step("configure:" + name, async () => {
      const r = await round(name, "LIGA");
      for (const code of ["LIGA_A", "LIGA_B"]) await link(code, S.comps[code].stages[0].id, r, n);
      if (n === 1) await call(`${A}/tiebreaks/${S.tieId}/rounds`, "POST", { roundId: r });
    });
    await play(name);
    if (n === 1) await step("resolve-tafa", async () => {
      const t = await call(`${A}/tiebreaks/${S.tieId}/refresh`, "POST", {});
      assert(t.winnerEntryId || t.tiebreak.winner_entry_id, JSON.stringify(t));
      S.tafa = t;
      save();
    });
  }
  await step("duos-survival", async () => {
    const st = S.stages["COPA_DUOS:SURVIVAL"], r = S.rounds.Grupos1;
    await call(`${P}/round-links/${S.links[st + ":" + r]}/duos/table`);
    await call(`${A}/round-links/${S.links[st + ":" + r]}/duos/confirm`, "POST", {});
  });
  for (const [idx, phase] of ["R16", "QF", "SF", "FINAL"].entries()) {
    const name = "Eliminatorias-" + phase;
    await step("configure:" + name, async () => {
      const r = await round(name);
      for (const code of ["COPA_A", "COPA_B"]) {
        const st = await stage(code, phase), ln = await link(code, st, r), gs = S.stages[code + ":GROUPS"];
        const source2 = idx === 0 ? gs : S.stages[code + ":" + ["R16", "QF", "SF"][idx - 1]], action = ["r16", "quarterfinals", "semifinals", "final"][idx];
        const pool = (await call(`${A}/stages/${source2}/cup-ab-progression/${action}?targetStageId=${st}&roundLinkId=${ln}&groupStageId=${gs}`)).pool;
        const pairs = idx === 0 ? pool.filter((e) => e.position === 2).map((e, i) => [e.entryId, pool.filter((e2) => e2.position === 3)[i].entryId]) : Array.from({ length: pool.length / 2 }, (_, i) => pool.slice(i * 2, i * 2 + 2).map((e) => e.entryId));
        await call(`${A}/stages/${source2}/cup-ab-progression/${action}`, "POST", { targetStageId: st, roundLinkId: ln, groupStageId: gs, mode: "MANUAL", pairs });
      }
      const ts = await stage("COPA_TOTAL", phase), tl = await link("COPA_TOTAL", ts, r), tg = S.stages["COPA_TOTAL:GROUPS"];
      if (idx === 0) await call(`${A}/stages/${tg}/total/qualify`, "POST", { targetStageId: ts, targetSize: 16, directPositions: [1, 2], wildcardCount: 0 });
      const source = idx === 0 ? tg : S.stages["COPA_TOTAL:" + ["R16", "QF", "SF"][idx - 1]];
      await call(`${A}/stages/${source}/total-progression/${idx === 0 ? "qualified" : "winners"}`, "POST", { targetStageId: ts, roundLinkId: tl, random: true });
      const ps = await stage("COPA_PAPA", phase), pl = await link("COPA_PAPA", ps, r), prev = S.stages["COPA_PAPA:" + ["R32", "R16", "QF", "SF"][idx]];
      await call(`${A}/stages/${prev}/papa/next-round`, "POST", { targetStageId: ps, roundLinkId: pl });
      if (idx >= 2) {
        const ds = await stage("COPA_DUOS", phase), dl = await link("COPA_DUOS", ds, r);
        if (idx === 2) {
          const ss = S.stages["COPA_DUOS:SURVIVAL"];
          await call(`${A}/round-links/${S.links[ss + ":" + S.rounds.Grupos1]}/duos/semifinals`, "POST", { targetStageId: ds, roundLinkId: dl });
        } else await call(`${A}/stages/${S.stages["COPA_DUOS:SF"]}/duos/final`, "POST", { targetStageId: ds, roundLinkId: dl });
      }
      if (idx === 3) for (const code of ["COPA_TOTAL", "COPA_PAPA"]) {
        const third = await stage(code, "THIRD"), ln = await link(code, third, r);
        await call(`${A}/stages/${S.stages[code + ":SF"]}/${code === "COPA_TOTAL" ? "total-progression/third-place" : "papa/third-place"}`, "POST", { targetStageId: third, roundLinkId: ln });
      }
    });
    await play(name);
    await step("confirm:" + phase, async () => {
      for (const code of ["COPA_A", "COPA_B", "COPA_TOTAL", "COPA_PAPA", ...idx >= 2 ? ["COPA_DUOS"] : []]) await winners(S.stages[code + ":" + phase]);
      if (idx === 3) for (const code of ["COPA_TOTAL", "COPA_PAPA"]) await winners(S.stages[code + ":THIRD"]);
    });
  }
  await step("champions-slots", async () => {
    const id = S.comps.COPA_CAMPEONES.id;
    const d = await call(`${A}/competitions/${id}/champions/prefill`, "POST", {});
    await call(`${A}/competitions/${id}/champions/slots`, "PUT", { slots: d.slots.map((slot, i) => ({ slotCode: slot.slotCode, userId: S.users[i].id, reason: "Cupo histórico T31 faltante resuelto manualmente para prueba E2E local" })) });
    await call(`${A}/competitions/${id}/champions/bracket`, "POST", {});
  });
  for (const [index, nodes] of [["U1", "L1", "L2", "L5"], ["U2", "L3"], ["U3", "L4"], ["U4", "L6"], ["U5", "L7"], ["F1"]].entries()) {
    const name = "Campeones-" + (index + 1), code = "COPA_CAMPEONES";
    await step("configure:" + name, async () => {
      const r = await round(name), st = await stage(code, index === 5 ? "FINAL" : "NIVEL" + (index + 1)), ln = await link(code, st, r);
      for (const node of nodes) await call(`${A}/competitions/${S.comps[code].id}/champions/nodes/${node}/activate`, "POST", { stageId: st, roundLinkId: ln });
    });
    await play(name);
    await step("confirm:" + name, () => winners(S.stages[code + ":" + (index === 5 ? "FINAL" : "NIVEL" + (index + 1))]));
  }
  await step("league-results", async () => {
    for (const code of ["LIGA_A", "LIGA_B"]) {
      const c = S.comps[code];
      const table = await call(`${P}/leagues/${code}/standings?season=32`);
      await call(`${A}/competitions/${c.id}/results`, "POST", {});
      const d = await call(`${P}/competitions/${c.id}/results`);
      assert(d.entries.length === 16, "Liga entries faltantes " + JSON.stringify(d.entries));
      await call(`${A}/competitions/${c.id}/results`, "PUT", { results: d.entries.map((e) => ({ entryId: e.entryId, stageId: c.stages[0].id, resultCode: "POSITION", finalPosition: table.standings.find((r) => e.members.some((m) => m.userId === r.userId)).position })) });
      await call(`${A}/competitions/${c.id}`, "PUT", { status: "finished" });
    }
  });
  await step("promotion-setup", async () => {
    const id = S.comps.PROMOCION.id;
    const d = await call(`${A}/competitions/${id}/promotion/prefill`, "POST", {});
    await call(`${A}/competitions/${id}/promotion/slots`, "PUT", { slots: d.slots.map((s) => ({ slotCode: s.slotCode, userId: s.proposedUser.id })) });
    const r = await round("Promocion"), st = await stage("PROMOCION", "PROMOCION"), ln = await link("PROMOCION", st, r);
    await call(`${A}/competitions/${id}/promotion/matches`, "POST", { stageId: st, roundLinkId: ln });
  });
  await play("Promocion");
  await step("promotion-final", async () => {
    const st = S.stages["PROMOCION:PROMOCION"];
    await winners(st);
    const d = await call(`${A}/competitions/${S.comps.PROMOCION.id}/promotion/stages/${st}/finalize`, "POST", {});
    assert.equal(d.movements.length, 4);
  });
  await step("cup-results", async () => {
    for (const code of ["COPA_A", "COPA_B", "COPA_TOTAL", "COPA_DUOS", "COPA_PAPA", "COPA_CAMPEONES"]) {
      const id = S.comps[code].id, d = await call(`${P}/competitions/${id}/results`);
      const result = new Map(d.entries.map((e) => [e.entryId, { entryId: e.entryId, resultCode: code === "COPA_DUOS" ? "ELIMINATED" : code === "COPA_PAPA" || code === "COPA_CAMPEONES" ? "ROUND_OF_64" : "GROUP_STAGE", finalPosition: null }]));
      for (const e of d.encounters.filter((e2) => e2.status === "finished" && e2.confirmedAt)) {
        const stageName = Object.keys(S.stages).find((k) => S.stages[k] === e.stageId)?.split(":")[1];
        const winner = e.winnerId, loser = winner === e.entryAId ? e.entryBId : e.entryAId;
        const set = (entryId, resultCode, finalPosition = null) => {
          if (result.has(entryId)) Object.assign(result.get(entryId), { resultCode, stageId: e.stageId, finalPosition });
        };
        if (stageName === "FINAL") {
          set(winner, "CHAMPION", 1);
          set(loser, "RUNNER_UP", 2);
        } else if (stageName === "THIRD") {
          set(winner, "THIRD", 3);
          set(loser, "SEMIFINAL", 4);
        } else {
          const rc = code === "COPA_DUOS" ? "PHASE_5" : { R32: "ROUND_OF_32", R16: "ROUND_OF_16", QF: "QUARTERFINAL", SF: "SEMIFINAL", NIVEL1: "ROUND_OF_64", NIVEL2: "ROUND_OF_32", NIVEL3: "ROUND_OF_16", NIVEL4: "QUARTERFINAL", NIVEL5: "SEMIFINAL" }[stageName];
          if (rc) set(loser, rc);
        }
      }
      await call(`${A}/competitions/${id}/results`, "PUT", { results: [...result.values()] });
      await call(`${A}/competitions/${id}`, "PUT", { status: "finished" });
    }
  });
  await step("iffhs-transition", async () => {
    const iffhs = await call(`${A}/iffhs/seasons/32/calculate`, "POST", {});
    assert.equal(iffhs.totals.length, 32);
    const plan = (await call(`${A}/seasons/${S.season}/transition-plan`, "POST", {})).plan;
    const assignments = plan.assignments.map((a) => ({ userId: a.userId, divisionCode: a.proposedDivisionCode, reason: a.requiresReview ? "Revisión explícita del corrimiento en escenario E2E local" : null }));
    await call(`${A}/transition-plans/${plan.id}/confirm`, "PUT", { assignments });
    const applied = await call(`${A}/transition-plans/${plan.id}/apply`, "POST", {});
    assert.equal(applied.targetSeason.status, "draft");
    assert.equal(applied.targetSeason.seasonNumber, 33);
    S.targetSeason = applied.targetSeason;
    save();
  });
  await step("participant-history", async () => {
    await loginParticipants();
    const u = S.users[0], r = S.rounds.Grupos1;
    const d = await call(`/api/participant/rounds/${r}/competition-contexts`, "GET", void 0, cookies[u.id]);
    assert(d.contexts.length >= 4);
    const round2 = await call(`/api/participant/round?roundId=${r}`, "GET", void 0, cookies[u.id]);
    assert.equal(round2.round.matches.length, 12);
    S.contexts = d.contexts;
    save();
  });
  // Read-only verification of the persisted local integration outcome.
  const dbDir = root + '/v3/d1/miniflare-D1DatabaseObject';
  const files = readdirSync(dbDir).filter(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
  assert.equal(files.length, 1);
  const db = new DatabaseSync(dbDir + '/' + files[0], {readOnly:true});
  try {
    const count = sql => Number(db.prepare(sql).get().n);
    assert.equal(count("SELECT COUNT(*) n FROM rounds WHERE status='finished' AND name LIKE 'E2E T32 %'"),18);
    assert.equal(count('SELECT COUNT(*) n FROM round_submissions'),576);
    assert.equal(count('SELECT COUNT(*) n FROM official_predictions'),6912);
    assert.equal(count('SELECT COUNT(*) n FROM (SELECT op.user_id,m.round_id FROM official_predictions op JOIN matches m ON m.id=op.match_id GROUP BY op.user_id,m.round_id HAVING COUNT(*)<>12)'),0);
    assert.equal(count('SELECT COUNT(*) n FROM competition_results'),158);
    assert.equal(count("SELECT COUNT(*) n FROM iffhs_season_totals WHERE season_number=32 AND source='calculated'"),32);
    assert.equal(count("SELECT COUNT(*) n FROM competition_encounters e JOIN competition_stages s ON s.id=e.stage_id WHERE s.stage_type='KNOCKOUT' AND e.admin_confirmed_at IS NOT NULL AND e.status='finished'"),88);
    assert.equal(count("SELECT COUNT(*) n FROM tafa_seasons WHERE season_number=33 AND status='draft'"),1);
    assert.equal(count('SELECT COUNT(*) n FROM season_division_members m JOIN tafa_seasons s ON s.id=m.season_id WHERE s.season_number=33'),32);
    console.log('PASS persisted: 18 Fechas, 576 unique submissions, 6912 official predictions, 88 knockout winners, 158 final results, 32 IFFHS totals, T33 draft');
  } finally { db.close(); }
  console.log("E2E COMPLETE: T32 → T33 draft; all competitions, TAFA, IFFHS and participant contexts");
} catch (e) {
  console.error(e.stack);
  save();
  process.exitCode = 1;
}
