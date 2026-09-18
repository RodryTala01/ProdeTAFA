import type { Env } from './index';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type GroupInput = { code?: string; name?: string; userIds?: string[] };
type EntryLite = { entryId: number; displayName: string };
type FixturePair = [number, number];

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}
function error(message: string, status = 400) { return json({ error: message }, { status }); }
function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}
function bytesToHex(bytes: Uint8Array) { return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''); }
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}
async function sessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id,u.role,u.is_active FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1 LIMIT 1`,
  ).bind(await sha256(token)).first<SessionUser>();
  return row ?? null;
}
async function audit(env: Env, actor: string, action: string, stageId: number, after: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_json)
     VALUES (?,?,'competition_stage',?,?)`,
  ).bind(actor, action, String(stageId), JSON.stringify(after)).run();
}

async function stageInfo(env: Env, stageId: number) {
  return env.DB.prepare(
    `SELECT cs.id,cs.competition_id,cs.stage_type,cs.status,c.code AS competition_code,c.season_id,s.status AS season_status
     FROM competition_stages cs JOIN competitions c ON c.id=cs.competition_id
     JOIN tafa_seasons s ON s.id=c.season_id WHERE cs.id=? LIMIT 1`,
  ).bind(stageId).first<{
    id: number; competition_id: number; stage_type: string; status: string;
    competition_code: string; season_id: number; season_status: string;
  }>();
}

async function ensureTotalStage(env: Env, stageId: number) {
  const stage = await stageInfo(env, stageId);
  if (!stage) return { ok: false as const, error: 'Etapa no encontrada', status: 404 };
  if (stage.competition_code !== 'COPA_TOTAL') return { ok: false as const, error: 'Esta acción corresponde únicamente a Copa Total', status: 409 };
  if (stage.stage_type !== 'ROUND_ROBIN_GROUPS') return { ok: false as const, error: 'La etapa debe ser de grupos con enfrentamientos', status: 409 };
  return { ok: true as const, stage };
}

async function ensureEntries(env: Env, competitionId: number, users: Array<{ user_id: string; full_name: string }>) {
  const existing = await env.DB.prepare(
    `SELECT ce.id,cem.user_id FROM competition_entries ce JOIN competition_entry_members cem ON cem.entry_id=ce.id
     WHERE ce.competition_id=? AND ce.entry_type='INDIVIDUAL'`,
  ).bind(competitionId).all<{ id: number; user_id: string }>();
  const byUser = new Map((existing.results ?? []).map((row) => [row.user_id, Number(row.id)]));
  for (const participant of users) {
    if (byUser.has(participant.user_id)) continue;
    const created = await env.DB.prepare(
      `INSERT INTO competition_entries(competition_id,entry_type,display_name,source_json)
       VALUES (?,'INDIVIDUAL',?,?) RETURNING id`,
    ).bind(competitionId, participant.full_name, JSON.stringify({ source: 'season', userId: participant.user_id }))
      .first<{ id: number }>();
    if (!created) throw new Error('No se pudo crear una entrada de Copa Total');
    await env.DB.prepare(
      `INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)`,
    ).bind(created.id, participant.user_id).run();
    byUser.set(participant.user_id, Number(created.id));
  }
  return byUser;
}

async function configureGroups(request: Request, env: Env, user: SessionUser, stageId: number) {
  const checked = await ensureTotalStage(env, stageId);
  if (!checked.ok) return error(checked.error, checked.status);
  const stage = checked.stage;
  if (stage.status !== 'draft') return error('Los grupos sólo pueden reemplazarse mientras la etapa está en borrador', 409);

  const encounters = await env.DB.prepare(`SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id=?`)
    .bind(stageId).first<{ total: number }>();
  if (Number(encounters?.total ?? 0) > 0) return error('No se pueden reemplazar grupos después de generar el fixture', 409);

  const body = await request.json().catch(() => null) as { groups?: GroupInput[] } | null;
  if (!Array.isArray(body?.groups) || body.groups.length === 0) return error('Tenés que enviar los grupos de Copa Total');

  const usersResult = await env.DB.prepare(
    `SELECT dm.user_id,u.full_name FROM season_division_members dm JOIN users u ON u.id=dm.user_id
     WHERE dm.season_id=? AND u.role='participant' ORDER BY u.full_name COLLATE NOCASE`,
  ).bind(stage.season_id).all<{ user_id: string; full_name: string }>();
  const participants = usersResult.results ?? [];
  const eligible = new Set(participants.map((row) => row.user_id));
  const seen = new Set<string>();
  const codes = new Set<string>();
  const groups: Array<{ code: string; name: string; userIds: string[] }> = [];

  for (let index = 0; index < body.groups.length; index += 1) {
    const raw = body.groups[index];
    const code = (raw.code?.trim() || String.fromCharCode(65 + index)).toUpperCase();
    const name = raw.name?.trim() || `Grupo ${code}`;
    if (codes.has(code)) return error('Los códigos de grupo no pueden repetirse');
    codes.add(code);
    const userIds = Array.isArray(raw.userIds) ? raw.userIds.map((id) => String(id).trim()) : [];
    if (userIds.length < 3 || userIds.length > 5) return error(`${name} debe tener entre 3 y 5 participantes`);
    for (const userId of userIds) {
      if (!eligible.has(userId)) return error(`${name} contiene un participante fuera de T${stage.season_id}`);
      if (seen.has(userId)) return error('Un participante no puede estar en dos grupos de Copa Total');
      seen.add(userId);
    }
    groups.push({ code, name, userIds });
  }
  if (seen.size !== eligible.size) return error('Todos los participantes de la temporada deben estar exactamente en un grupo de Copa Total');

  let entryByUser: Map<string, number>;
  try { entryByUser = await ensureEntries(env, stage.competition_id, participants); }
  catch (caught) { return error(caught instanceof Error ? caught.message : 'No se pudieron crear las entradas', 500); }

  const oldGroups = await env.DB.prepare(`SELECT id FROM competition_groups WHERE stage_id=?`).bind(stageId).all<{ id: number }>();
  const deletes = (oldGroups.results ?? []).map((row) => env.DB.prepare(`DELETE FROM competition_group_entries WHERE group_id=?`).bind(row.id));
  if (deletes.length) await env.DB.batch(deletes);
  await env.DB.prepare(`DELETE FROM competition_groups WHERE stage_id=?`).bind(stageId).run();

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const created = await env.DB.prepare(
      `INSERT INTO competition_groups(stage_id,code,name,sequence) VALUES (?,?,?,?) RETURNING id`,
    ).bind(stageId, group.code, group.name, groupIndex + 1).first<{ id: number }>();
    if (!created) return error('No se pudo guardar un grupo', 500);
    const statements = group.userIds.map((userId, seedIndex) => env.DB.prepare(
      `INSERT INTO competition_group_entries(group_id,entry_id,seed_position) VALUES (?,?,?)`,
    ).bind(created.id, entryByUser.get(userId), seedIndex + 1));
    await env.DB.batch(statements);
  }

  await audit(env, user.id, 'competition.total_groups_configured', stageId, groups);
  return json({ ok: true, stageId, groups });
}

function singleRoundRobin(entryIds: number[]) {
  const teams: Array<number | null> = [...entryIds];
  if (teams.length % 2 === 1) teams.push(null);
  const rounds: FixturePair[][] = [];
  for (let round = 0; round < teams.length - 1; round += 1) {
    const pairs: FixturePair[] = [];
    for (let index = 0; index < teams.length / 2; index += 1) {
      const a = teams[index];
      const b = teams[teams.length - 1 - index];
      if (a != null && b != null) pairs.push([a, b]);
    }
    rounds.push(pairs);
    const fixed = teams[0];
    const rest = teams.slice(1);
    rest.unshift(rest.pop() ?? null);
    teams.splice(0, teams.length, fixed, ...rest);
  }
  return rounds;
}

function fixtureForGroup(entryIds: number[]) {
  const firstLeg = singleRoundRobin(entryIds);
  if (entryIds.length === 5) return firstLeg;
  const secondLeg = firstLeg.map((round) => round.map(([a, b]) => [b, a] as FixturePair));
  return [...firstLeg, ...secondLeg];
}

async function generateFixtures(env: Env, user: SessionUser, stageId: number) {
  const checked = await ensureTotalStage(env, stageId);
  if (!checked.ok) return error(checked.error, checked.status);
  const existing = await env.DB.prepare(`SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id=?`)
    .bind(stageId).first<{ total: number }>();
  if (Number(existing?.total ?? 0) > 0) return error('El fixture de Copa Total ya fue generado', 409);

  const segmentsResult = await env.DB.prepare(
    `SELECT crs.id,crs.round_link_id,((crl.sequence-1)*3+crs.sequence) AS mini_day
     FROM competition_round_segments crs JOIN competition_round_links crl ON crl.id=crs.round_link_id
     WHERE crl.stage_id=? AND crl.purpose='NORMAL' ORDER BY mini_day`,
  ).bind(stageId).all<{ id: number; round_link_id: number; mini_day: number }>();
  const segments = segmentsResult.results ?? [];
  if (segments.length !== 6) return error('Primero generá los 6 segmentos de Copa Total', 409);

  const groupsResult = await env.DB.prepare(
    `SELECT id,code,name FROM competition_groups WHERE stage_id=? ORDER BY sequence`,
  ).bind(stageId).all<{ id: number; code: string; name: string }>();
  const groups = groupsResult.results ?? [];
  if (groups.length === 0) return error('Primero configurá los grupos de Copa Total', 409);

  const createdSummary: Array<{ group: string; miniDay: number; pairs: FixturePair[] }> = [];
  for (const group of groups) {
    const entriesResult = await env.DB.prepare(
      `SELECT cge.entry_id,ce.display_name FROM competition_group_entries cge
       JOIN competition_entries ce ON ce.id=cge.entry_id WHERE cge.group_id=? ORDER BY cge.seed_position,ce.id`,
    ).bind(group.id).all<{ entry_id: number; display_name: string }>();
    const entryIds = (entriesResult.results ?? []).map((row) => Number(row.entry_id));
    if (entryIds.length < 3 || entryIds.length > 5) return error(`${group.name} debe tener entre 3 y 5 participantes`, 409);
    const schedule = fixtureForGroup(entryIds);

    for (let miniDay = 1; miniDay <= 6; miniDay += 1) {
      const pairs = schedule[miniDay - 1] ?? [];
      const segment = segments[miniDay - 1];
      const statements = pairs.map((pair, pairIndex) => env.DB.prepare(
        `INSERT INTO competition_encounters
           (stage_id,group_id,round_link_id,segment_id,slot_key,entry_a_id,entry_b_id,status)
         VALUES (?,?,?,?,?,?,?,'pending')`,
      ).bind(stageId, group.id, segment.round_link_id, segment.id, `${group.code}-M${miniDay}-${pairIndex + 1}`, pair[0], pair[1]));
      if (statements.length) await env.DB.batch(statements);
      createdSummary.push({ group: group.code, miniDay, pairs });
    }
  }

  await audit(env, user.id, 'competition.total_fixture_generated', stageId, createdSummary);
  return json({ ok: true, stageId, fixture: createdSummary });
}

async function scoreEntrySegment(env: Env, entryId: number, segmentId: number) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(ps.total_points),0) AS points,
            COUNT(crsm.match_id) AS match_count,
            COALESCE(SUM(CASE WHEN m.result_finalized_at IS NOT NULL OR m.is_void=1 THEN 1 ELSE 0 END),0) AS finalized_count
     FROM competition_round_segment_matches crsm
     JOIN matches m ON m.id=crsm.match_id
     JOIN competition_entry_members cem ON cem.entry_id=?
     LEFT JOIN official_predictions op ON op.user_id=cem.user_id AND op.match_id=m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id
     WHERE crsm.segment_id=?`,
  ).bind(entryId, segmentId).first<{ points: number; match_count: number; finalized_count: number }>();
  return {
    points: Number(row?.points ?? 0),
    complete: Number(row?.match_count ?? 0) === 4 && Number(row?.finalized_count ?? 0) === 4,
  };
}

async function standings(env: Env, stageId: number) {
  const checked = await ensureTotalStage(env, stageId);
  if (!checked.ok) return null;
  const groupsResult = await env.DB.prepare(
    `SELECT id,code,name,sequence FROM competition_groups WHERE stage_id=? ORDER BY sequence`,
  ).bind(stageId).all<{ id: number; code: string; name: string; sequence: number }>();

  const groups = [];
  for (const group of groupsResult.results ?? []) {
    const entriesResult = await env.DB.prepare(
      `SELECT cge.entry_id,ce.display_name FROM competition_group_entries cge
       JOIN competition_entries ce ON ce.id=cge.entry_id WHERE cge.group_id=? ORDER BY cge.seed_position,ce.display_name COLLATE NOCASE`,
    ).bind(group.id).all<{ entry_id: number; display_name: string }>();
    const table = new Map<number, {
      entryId: number; displayName: string; played: number; won: number; drawn: number; lost: number;
      gf: number; ga: number; gd: number; points: number;
    }>();
    for (const entry of entriesResult.results ?? []) {
      table.set(Number(entry.entry_id), {
        entryId: Number(entry.entry_id), displayName: entry.display_name,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
      });
    }

    const encounters = await env.DB.prepare(
      `SELECT id,entry_a_id,entry_b_id,segment_id FROM competition_encounters
       WHERE stage_id=? AND group_id=? ORDER BY id`,
    ).bind(stageId, group.id).all<{ id: number; entry_a_id: number; entry_b_id: number; segment_id: number }>();
    let provisional = false;
    const fixtures = [];
    for (const encounter of encounters.results ?? []) {
      const [a, b] = await Promise.all([
        scoreEntrySegment(env, Number(encounter.entry_a_id), Number(encounter.segment_id)),
        scoreEntrySegment(env, Number(encounter.entry_b_id), Number(encounter.segment_id)),
      ]);
      fixtures.push({ id: Number(encounter.id), entryAId: Number(encounter.entry_a_id), entryBId: Number(encounter.entry_b_id), scoreA: a.points, scoreB: b.points, complete: a.complete && b.complete });
      if (!a.complete || !b.complete) { provisional = true; continue; }
      const rowA = table.get(Number(encounter.entry_a_id));
      const rowB = table.get(Number(encounter.entry_b_id));
      if (!rowA || !rowB) continue;
      rowA.played += 1; rowB.played += 1;
      rowA.gf += a.points; rowA.ga += b.points; rowB.gf += b.points; rowB.ga += a.points;
      if (a.points > b.points) { rowA.won += 1; rowB.lost += 1; rowA.points += 3; }
      else if (a.points < b.points) { rowB.won += 1; rowA.lost += 1; rowB.points += 3; }
      else { rowA.drawn += 1; rowB.drawn += 1; rowA.points += 1; rowB.points += 1; }
    }

    const ordered = Array.from(table.values()).map((row) => ({ ...row, gd: row.gf - row.ga }))
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.won - a.won || a.displayName.localeCompare(b.displayName));
    let previous: typeof ordered[number] | null = null;
    let previousPosition = 0;
    const ranked = ordered.map((row, index) => {
      const sameSportingScore = previous != null && row.points === previous.points && row.gd === previous.gd && row.gf === previous.gf && row.won === previous.won;
      const position = sameSportingScore ? previousPosition : index + 1;
      previous = row; previousPosition = position;
      return { position, ...row, tiedOnAllCriteria: sameSportingScore };
    });
    groups.push({ id: Number(group.id), code: group.code, name: group.name, provisional, standings: ranked, fixtures });
  }
  return { stageId, groups };
}

export async function handleCompetitionTotalGroups(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const configureMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/total\/groups$/);
  if (configureMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return configureGroups(request, env, user, Number(configureMatch[1]));
  }
  const fixtureMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/total\/fixture$/);
  if (fixtureMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return generateFixtures(env, user, Number(fixtureMatch[1]));
  }
  const publicMatch = pathname.match(/^\/api\/competition-engine\/stages\/(\d+)\/total\/groups$/);
  if (publicMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const payload = await standings(env, Number(publicMatch[1]));
    return payload ? json(payload) : error('Etapa de Copa Total no encontrada', 404);
  }
  return null;
}
