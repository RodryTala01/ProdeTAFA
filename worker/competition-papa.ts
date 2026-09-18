import type { Env } from './index';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type PairInput = { userAId?: string; userBId?: string | null };

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
function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}
async function sessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id,u.role,u.is_active
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1
     LIMIT 1`,
  ).bind(await sha256(token)).first<SessionUser>();
  return row ?? null;
}
async function audit(env: Env, actor: string, action: string, entityId: string, after: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_json)
     VALUES (?,?,'competition',?,?)`,
  ).bind(actor, action, entityId, JSON.stringify(after)).run();
}

async function papaCompetition(env: Env, competitionId: number) {
  return env.DB.prepare(
    `SELECT c.id,c.season_id,c.code,c.status,s.season_number,s.status AS season_status
     FROM competitions c JOIN tafa_seasons s ON s.id=c.season_id
     WHERE c.id=? LIMIT 1`,
  ).bind(competitionId).first<{
    id: number; season_id: number; code: string; status: string; season_number: number; season_status: string;
  }>();
}

async function previousSeasonId(env: Env, seasonNumber: number) {
  const row = await env.DB.prepare(
    `SELECT id FROM tafa_seasons WHERE season_number=? LIMIT 1`,
  ).bind(seasonNumber - 1).first<{ id: number }>();
  return row?.id == null ? null : Number(row.id);
}

async function currentParticipants(env: Env, seasonId: number) {
  const rows = await env.DB.prepare(
    `SELECT sdm.user_id,u.full_name,sd.code AS division_code
     FROM season_division_members sdm
     JOIN users u ON u.id=sdm.user_id
     JOIN season_divisions sd ON sd.id=sdm.division_id
     WHERE sdm.season_id=? AND u.role='participant' AND u.is_active=1
     ORDER BY sd.sort_order,u.full_name COLLATE NOCASE`,
  ).bind(seasonId).all<{ user_id: string; full_name: string; division_code: string }>();
  return rows.results ?? [];
}

async function previousLeaguePositions(env: Env, seasonId: number) {
  const rows = await env.DB.prepare(
    `SELECT c.code AS competition_code,cr.final_position,cem.user_id,u.full_name
     FROM competitions c
     JOIN competition_results cr ON cr.competition_id=c.id
     JOIN competition_entries ce ON ce.id=cr.entry_id AND ce.entry_type='INDIVIDUAL'
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     JOIN users u ON u.id=cem.user_id
     WHERE c.season_id=? AND c.code IN ('LIGA_A','LIGA_B') AND cr.final_position IS NOT NULL
     ORDER BY c.code,cr.final_position`,
  ).bind(seasonId).all<{
    competition_code: string; final_position: number; user_id: string; full_name: string;
  }>();
  return rows.results ?? [];
}

async function seedingProposal(env: Env, competitionId: number) {
  const competition = await papaCompetition(env, competitionId);
  if (!competition || competition.code !== 'COPA_PAPA') return null;

  const participants = await currentParticipants(env, competition.season_id);
  const eligible = new Map(participants.map((row) => [row.user_id, row]));
  const previousId = await previousSeasonId(env, competition.season_number);
  const history = previousId == null ? [] : await previousLeaguePositions(env, previousId);

  const a = history
    .filter((row) => row.competition_code === 'LIGA_A' && eligible.has(row.user_id))
    .sort((x, y) => Number(x.final_position) - Number(y.final_position));
  const b = history
    .filter((row) => row.competition_code === 'LIGA_B' && eligible.has(row.user_id))
    .sort((x, y) => Number(y.final_position) - Number(x.final_position));

  const used = new Set<string>();
  const proposedPairs = [];
  const crossPairs = Math.min(a.length, b.length);
  for (let index = 0; index < crossPairs; index += 1) {
    const first = a[index];
    const second = b[index];
    used.add(first.user_id);
    used.add(second.user_id);
    proposedPairs.push({
      sequence: index + 1,
      userA: { id: first.user_id, name: first.full_name, previousDivision: 'A', previousPosition: Number(first.final_position) },
      userB: { id: second.user_id, name: second.full_name, previousDivision: 'B', previousPosition: Number(second.final_position) },
      reason: 'MIRROR_A_B',
    });
  }

  const unpaired = participants
    .filter((row) => !used.has(row.user_id))
    .map((row) => {
      const prior = history.find((item) => item.user_id === row.user_id);
      return {
        id: row.user_id,
        name: row.full_name,
        currentDivision: row.division_code,
        previousDivision: prior?.competition_code === 'LIGA_A' ? 'A' : prior?.competition_code === 'LIGA_B' ? 'B' : null,
        previousPosition: prior?.final_position == null ? null : Number(prior.final_position),
      };
    });

  const count = participants.length;
  const bracketSize = count >= 33 ? 64 : 32;
  return {
    competitionId,
    seasonNumber: competition.season_number,
    previousSeasonNumber: competition.season_number - 1,
    previousSeasonFound: previousId != null,
    participantCount: count,
    recommendedStart: count >= 33 ? 'ROUND_OF_32' : 'ROUND_OF_16',
    bracketSize,
    byesNeeded: Math.max(0, bracketSize - count),
    proposedPairs,
    unpaired,
  };
}

async function ensurePapaEntry(env: Env, competitionId: number, userId: string, fullName: string) {
  const existing = await env.DB.prepare(
    `SELECT ce.id
     FROM competition_entries ce
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     WHERE ce.competition_id=? AND ce.entry_type='INDIVIDUAL' AND cem.user_id=?
     ORDER BY ce.id LIMIT 1`,
  ).bind(competitionId, userId).first<{ id: number }>();
  if (existing) return Number(existing.id);

  const created = await env.DB.prepare(
    `INSERT INTO competition_entries(competition_id,entry_type,display_name,source_json)
     VALUES (?,'INDIVIDUAL',?,?) RETURNING id`,
  ).bind(competitionId, fullName, JSON.stringify({ source: 'COPA_PAPA_INITIAL_BRACKET', userId }))
    .first<{ id: number }>();
  if (!created) throw new Error('No se pudo crear una entrada de Copa Papa');
  await env.DB.prepare(
    `INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)`,
  ).bind(created.id, userId).run();
  return Number(created.id);
}

async function validateTarget(env: Env, competitionId: number, stageId: number, roundLinkId: number) {
  const stage = await env.DB.prepare(
    `SELECT id,stage_type,status FROM competition_stages
     WHERE id=? AND competition_id=? LIMIT 1`,
  ).bind(stageId, competitionId).first<{ id: number; stage_type: string; status: string }>();
  if (!stage || stage.stage_type !== 'KNOCKOUT') return { ok: false as const, error: 'La etapa debe ser eliminatoria y pertenecer a Copa Papa' };
  if (stage.status === 'finished' || stage.status === 'archived') return { ok: false as const, error: 'La etapa ya está cerrada' };
  const link = await env.DB.prepare(
    `SELECT id FROM competition_round_links
     WHERE id=? AND competition_id=? AND stage_id=? AND purpose='NORMAL' LIMIT 1`,
  ).bind(roundLinkId, competitionId, stageId).first<{ id: number }>();
  if (!link) return { ok: false as const, error: 'La Fecha no está vinculada a la etapa indicada' };
  const existing = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id=?`,
  ).bind(stageId).first<{ total: number }>();
  if (Number(existing?.total ?? 0) > 0) return { ok: false as const, error: 'La etapa ya tiene cruces configurados' };
  return { ok: true as const };
}

async function confirmInitialBracket(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await papaCompetition(env, competitionId);
  if (!competition || competition.code !== 'COPA_PAPA') return error('Copa Papa no encontrada', 404);
  const body = await request.json().catch(() => null) as {
    stageId?: number; roundLinkId?: number; pairs?: PairInput[];
  } | null;
  const stageId = Number(body?.stageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(stageId) || stageId <= 0) return error('Etapa inicial inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha inicial inválida');
  if (!Array.isArray(body?.pairs) || body.pairs.length === 0) return error('Tenés que confirmar los cruces iniciales');

  const target = await validateTarget(env, competitionId, stageId, roundLinkId);
  if (!target.ok) return error(target.error, 409);

  const participants = await currentParticipants(env, competition.season_id);
  const byUser = new Map(participants.map((row) => [row.user_id, row]));
  const seen = new Set<string>();
  const normalized: Array<{ userAId: string; userBId: string | null }> = [];
  for (const raw of body.pairs) {
    const userAId = raw.userAId?.trim() ?? '';
    const userBId = raw.userBId?.trim() || null;
    if (!userAId || !byUser.has(userAId)) return error('Hay un participante A inválido');
    if (userBId != null && !byUser.has(userBId)) return error('Hay un participante B inválido');
    if (userBId === userAId) return error('Un participante no puede enfrentarse consigo mismo');
    if (seen.has(userAId) || (userBId != null && seen.has(userBId))) return error('Un participante aparece más de una vez en la llave inicial');
    seen.add(userAId);
    if (userBId != null) seen.add(userBId);
    normalized.push({ userAId, userBId });
  }
  if (seen.size !== participants.length) {
    return error('La llave inicial debe incluir exactamente una vez a todos los participantes activos', 409);
  }

  const inserted = [];
  for (let index = 0; index < normalized.length; index += 1) {
    const pair = normalized[index];
    const userA = byUser.get(pair.userAId)!;
    const entryAId = await ensurePapaEntry(env, competitionId, userA.user_id, userA.full_name);
    let entryBId: number | null = null;
    if (pair.userBId != null) {
      const userB = byUser.get(pair.userBId)!;
      entryBId = await ensurePapaEntry(env, competitionId, userB.user_id, userB.full_name);
    }
    const slotKey = `PAPA-R1-${String(index + 1).padStart(2, '0')}`;
    const created = await env.DB.prepare(
      `INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
       VALUES (?,?,?,?,?,'pending') RETURNING id`,
    ).bind(stageId, roundLinkId, slotKey, entryAId, entryBId).first<{ id: number }>();
    inserted.push({ encounterId: Number(created?.id), slotKey, entryAId, entryBId });
  }

  await audit(env, user.id, 'competition.papa_initial_bracket_confirmed', String(competitionId), {
    stageId, roundLinkId, pairs: inserted,
  });
  return json({ ok: true, competitionId, stageId, roundLinkId, pairs: inserted });
}

async function confirmedOutcome(env: Env, stageId: number) {
  const rows = await env.DB.prepare(
    `SELECT id,entry_a_id,entry_b_id,winner_entry_id,status,admin_confirmed_at
     FROM competition_encounters WHERE stage_id=? ORDER BY id`,
  ).bind(stageId).all<{
    id: number; entry_a_id: number | null; entry_b_id: number | null; winner_entry_id: number | null;
    status: string; admin_confirmed_at: string | null;
  }>();
  const encounters = rows.results ?? [];
  if (encounters.length === 0) return { ok: false as const, error: 'La etapa origen no tiene cruces' };
  if (encounters.some((row) => row.status !== 'finished' || row.winner_entry_id == null || row.admin_confirmed_at == null)) {
    return { ok: false as const, error: 'Todos los cruces deben estar resueltos y confirmados por Admin' };
  }
  const winners = encounters.map((row) => Number(row.winner_entry_id));
  const losers = encounters.map((row) => {
    const winner = Number(row.winner_entry_id);
    if (row.entry_a_id != null && Number(row.entry_a_id) !== winner) return Number(row.entry_a_id);
    if (row.entry_b_id != null && Number(row.entry_b_id) !== winner) return Number(row.entry_b_id);
    return null;
  }).filter((value): value is number => value != null);
  return { ok: true as const, winners, losers };
}

async function buildNextRound(request: Request, env: Env, user: SessionUser, sourceStageId: number) {
  const source = await env.DB.prepare(
    `SELECT cs.id,cs.competition_id,c.code AS competition_code
     FROM competition_stages cs JOIN competitions c ON c.id=cs.competition_id
     WHERE cs.id=? LIMIT 1`,
  ).bind(sourceStageId).first<{ id: number; competition_id: number; competition_code: string }>();
  if (!source || source.competition_code !== 'COPA_PAPA') return error('La etapa origen no pertenece a Copa Papa', 409);

  const outcome = await confirmedOutcome(env, sourceStageId);
  if (!outcome.ok) return error(outcome.error, 409);

  const body = await request.json().catch(() => null) as { targetStageId?: number; roundLinkId?: number } | null;
  const targetStageId = Number(body?.targetStageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(targetStageId) || targetStageId <= 0) return error('Etapa destino inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha destino inválida');
  const target = await validateTarget(env, source.competition_id, targetStageId, roundLinkId);
  if (!target.ok) return error(target.error, 409);

  const pairs: Array<[number, number | null]> = [];
  for (let index = 0; index < outcome.winners.length; index += 2) {
    pairs.push([outcome.winners[index], outcome.winners[index + 1] ?? null]);
  }
  const statements = pairs.map((pair, index) => env.DB.prepare(
    `INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
     VALUES (?,?,?,?,?,'pending')`,
  ).bind(targetStageId, roundLinkId, `PAPA-NEXT-${String(index + 1).padStart(2, '0')}`, pair[0], pair[1]));
  if (statements.length) await env.DB.batch(statements);

  await audit(env, user.id, 'competition.papa_next_round_built', String(source.competition_id), {
    sourceStageId, targetStageId, roundLinkId, pairs,
  });
  return json({ ok: true, sourceStageId, targetStageId, roundLinkId, pairs });
}

async function buildThirdPlace(request: Request, env: Env, user: SessionUser, semifinalStageId: number) {
  const source = await env.DB.prepare(
    `SELECT cs.id,cs.competition_id,c.code AS competition_code
     FROM competition_stages cs JOIN competitions c ON c.id=cs.competition_id
     WHERE cs.id=? LIMIT 1`,
  ).bind(semifinalStageId).first<{ id: number; competition_id: number; competition_code: string }>();
  if (!source || source.competition_code !== 'COPA_PAPA') return error('La etapa origen no pertenece a Copa Papa', 409);
  const outcome = await confirmedOutcome(env, semifinalStageId);
  if (!outcome.ok) return error(outcome.error, 409);
  if (outcome.losers.length !== 2) return error('El tercer puesto requiere exactamente dos perdedores de semifinales', 409);

  const body = await request.json().catch(() => null) as { targetStageId?: number; roundLinkId?: number } | null;
  const targetStageId = Number(body?.targetStageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(targetStageId) || targetStageId <= 0) return error('Etapa de tercer puesto inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha de tercer puesto inválida');
  const target = await validateTarget(env, source.competition_id, targetStageId, roundLinkId);
  if (!target.ok) return error(target.error, 409);

  const created = await env.DB.prepare(
    `INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
     VALUES (?,?, 'THIRD', ?, ?, 'pending') RETURNING id`,
  ).bind(targetStageId, roundLinkId, outcome.losers[0], outcome.losers[1]).first<{ id: number }>();

  await audit(env, user.id, 'competition.papa_third_place_built', String(source.competition_id), {
    semifinalStageId, targetStageId, roundLinkId, encounterId: Number(created?.id),
    entryAId: outcome.losers[0], entryBId: outcome.losers[1],
  });
  return json({ ok: true, encounterId: Number(created?.id), entryAId: outcome.losers[0], entryBId: outcome.losers[1] });
}

export async function handleCompetitionPapa(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const proposalMatch = pathname.match(/^\/api\/competition-engine\/competitions\/(\d+)\/papa\/seeding-proposal$/);
  if (proposalMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const payload = await seedingProposal(env, Number(proposalMatch[1]));
    return payload ? json(payload) : error('Copa Papa no encontrada', 404);
  }

  const initialMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/papa\/initial-bracket$/);
  if (initialMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return confirmInitialBracket(request, env, user, Number(initialMatch[1]));
  }

  const nextMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/papa\/next-round$/);
  if (nextMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return buildNextRound(request, env, user, Number(nextMatch[1]));
  }

  const thirdMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/papa\/third-place$/);
  if (thirdMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return buildThirdPlace(request, env, user, Number(thirdMatch[1]));
  }

  return null;
}
