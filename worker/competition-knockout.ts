import type { Env } from './index';

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type EncounterInput = {
  slotKey?: string;
  entryAId?: number | null;
  entryBId?: number | null;
  roundLinkId?: number | null;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function error(message: string, status = 400) {
  return json({ error: message }, { status });
}

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
  const tokenHash = await sha256(token);
  const user = await env.DB.prepare(
    `SELECT u.id, u.role, u.is_active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND julianday(s.expires_at) > julianday('now')
       AND u.is_active = 1
     LIMIT 1`,
  ).bind(tokenHash).first<SessionUser>();
  return user ?? null;
}

async function audit(
  env: Env,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  await env.DB.prepare(
    `INSERT INTO audit_log
       (actor_user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(
    actorUserId,
    action,
    entityType,
    entityId,
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after),
  ).run();
}

async function validateStage(env: Env, stageId: number) {
  return env.DB.prepare(
    `SELECT cs.id, cs.competition_id, cs.stage_type, cs.status,
            c.season_id, c.code AS competition_code, c.status AS competition_status,
            s.status AS season_status
     FROM competition_stages cs
     JOIN competitions c ON c.id = cs.competition_id
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE cs.id = ? LIMIT 1`,
  ).bind(stageId).first<{
    id: number;
    competition_id: number;
    stage_type: string;
    status: string;
    season_id: number;
    competition_status: string;
    competition_code: string;
    season_status: string;
  }>();
}

async function entryBelongsToCompetition(env: Env, competitionId: number, entryId: number) {
  const row = await env.DB.prepare(
    `SELECT id FROM competition_entries
     WHERE id = ? AND competition_id = ? LIMIT 1`,
  ).bind(entryId, competitionId).first<{ id: number }>();
  return Boolean(row);
}

async function scoreEntryForRoundLink(env: Env, entryId: number, roundLinkId: number) {
  const row = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(ps.total_points), 0) AS base_points,
       COALESCE((
         SELECT SUM(ceb.points)
         FROM competition_entry_bonuses ceb
         WHERE ceb.entry_id = ? AND ceb.round_link_id = ?
       ), 0) AS bonus_points,
       COALESCE(SUM(CASE WHEN ps.is_provisional = 1 THEN 1 ELSE 0 END), 0) AS provisional_scores
     FROM competition_round_links crl
     JOIN matches m ON m.round_id = crl.round_id
     JOIN competition_entry_members cem
       ON cem.entry_id = ?
      AND (cem.valid_from_round_id IS NULL OR cem.valid_from_round_id <= crl.round_id)
      AND (cem.valid_to_round_id IS NULL OR cem.valid_to_round_id >= crl.round_id)
     LEFT JOIN official_predictions op
       ON op.user_id = cem.user_id AND op.match_id = m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id = op.id
     WHERE crl.id = ?`,
  ).bind(entryId, roundLinkId, entryId, roundLinkId).first<{
    base_points: number;
    bonus_points: number;
    provisional_scores: number;
  }>();

  const basePoints = Number(row?.base_points ?? 0);
  const bonusPoints = Number(row?.bonus_points ?? 0);
  return {
    basePoints,
    bonusPoints,
    totalPoints: basePoints + bonusPoints,
    provisional: Number(row?.provisional_scores ?? 0) > 0,
  };
}

async function refreshEncounter(env: Env, encounterId: number) {
  const encounter = await env.DB.prepare(
    `SELECT ce.id, ce.stage_id, ce.round_link_id, ce.entry_a_id, ce.entry_b_id,
            ce.winner_entry_id, ce.resolution,
            crl.round_id, r.status AS round_status
     FROM competition_encounters ce
     LEFT JOIN competition_round_links crl ON crl.id = ce.round_link_id
     LEFT JOIN rounds r ON r.id = crl.round_id
     WHERE ce.id = ? LIMIT 1`,
  ).bind(encounterId).first<{
    id: number;
    stage_id: number;
    round_link_id: number | null;
    entry_a_id: number | null;
    entry_b_id: number | null;
    winner_entry_id: number | null;
    resolution: string | null;
    round_id: number | null;
    round_status: string | null;
  }>();
  if (!encounter) return null;

  if (encounter.entry_a_id == null && encounter.entry_b_id == null) {
    await env.DB.prepare(
      `UPDATE competition_encounters
       SET score_a = NULL, score_b = NULL, status = 'pending',
           winner_entry_id = NULL, resolution = NULL, updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(encounterId).run();
    return encounterId;
  }

  if (encounter.entry_a_id == null || encounter.entry_b_id == null) {
    const winnerEntryId = encounter.entry_a_id ?? encounter.entry_b_id;
    await env.DB.prepare(
      `UPDATE competition_encounters
       SET score_a = CASE WHEN entry_a_id IS NULL THEN NULL ELSE 0 END,
           score_b = CASE WHEN entry_b_id IS NULL THEN NULL ELSE 0 END,
           status = 'finished', winner_entry_id = ?, resolution = 'bye',
           admin_confirmed_at = COALESCE(admin_confirmed_at, datetime('now')),
           updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(winnerEntryId, encounterId).run();
    return encounterId;
  }

  if (encounter.round_link_id == null) {
    await env.DB.prepare(
      `UPDATE competition_encounters
       SET score_a = NULL, score_b = NULL, status = 'ready', updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(encounterId).run();
    return encounterId;
  }

  const [scoreA, scoreB] = await Promise.all([
    scoreEntryForRoundLink(env, encounter.entry_a_id, encounter.round_link_id),
    scoreEntryForRoundLink(env, encounter.entry_b_id, encounter.round_link_id),
  ]);

  const tied = scoreA.totalPoints === scoreB.totalPoints;
  const roundFinished = encounter.round_status === 'finished';

  let status = roundFinished ? (tied ? 'tied' : 'finished') : encounter.round_status === 'draft' ? 'pending' : 'live';
  let winnerEntryId: number | null = null;
  let resolution: string | null = null;

  if (roundFinished && !tied) {
    winnerEntryId = scoreA.totalPoints > scoreB.totalPoints ? encounter.entry_a_id : encounter.entry_b_id;
    resolution = 'normal';
  }

  if (encounter.resolution === 'admin' || encounter.resolution === 'tiebreak') {
    status = 'finished';
    winnerEntryId = encounter.winner_entry_id;
    resolution = encounter.resolution;
  }

  await env.DB.prepare(
    `UPDATE competition_encounters
     SET admin_confirmed_at = CASE WHEN winner_entry_id IS ? THEN admin_confirmed_at ELSE NULL END,
         score_a = ?, score_b = ?, status = ?, winner_entry_id = ?, resolution = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(winnerEntryId, scoreA.totalPoints, scoreB.totalPoints, status, winnerEntryId, resolution, encounterId).run();

  return encounterId;
}

async function encounterPayload(env: Env, stageId: number) {
  const rows = await env.DB.prepare(
    `SELECT ce.id, ce.slot_key, ce.round_link_id, ce.entry_a_id, ce.entry_b_id,
            ce.score_a, ce.score_b, ce.status, ce.winner_entry_id, ce.resolution,
            ce.admin_confirmed_at,
            a.display_name AS entry_a_name, b.display_name AS entry_b_name,
            w.display_name AS winner_name,
            crl.sequence AS round_sequence, crl.label AS round_label,
            r.id AS round_id, r.name AS round_name, r.status AS round_status
     FROM competition_encounters ce
     LEFT JOIN competition_entries a ON a.id = ce.entry_a_id
     LEFT JOIN competition_entries b ON b.id = ce.entry_b_id
     LEFT JOIN competition_entries w ON w.id = ce.winner_entry_id
     LEFT JOIN competition_round_links crl ON crl.id = ce.round_link_id
     LEFT JOIN rounds r ON r.id = crl.round_id
     WHERE ce.stage_id = ?
     ORDER BY ce.id`,
  ).bind(stageId).all<{
    id: number;
    slot_key: string;
    round_link_id: number | null;
    entry_a_id: number | null;
    entry_b_id: number | null;
    score_a: number | null;
    score_b: number | null;
    status: string;
    winner_entry_id: number | null;
    resolution: string | null;
    admin_confirmed_at: string | null;
    entry_a_name: string | null;
    entry_b_name: string | null;
    winner_name: string | null;
    round_sequence: number | null;
    round_label: string | null;
    round_id: number | null;
    round_name: string | null;
    round_status: string | null;
  }>();

  return (rows.results ?? []).map((row) => ({
    id: Number(row.id),
    slotKey: row.slot_key,
    roundLinkId: row.round_link_id == null ? null : Number(row.round_link_id),
    round: row.round_id == null ? null : {
      id: Number(row.round_id),
      sequence: row.round_sequence == null ? null : Number(row.round_sequence),
      label: row.round_label,
      name: row.round_name,
      status: row.round_status,
    },
    entryA: row.entry_a_id == null ? null : { id: Number(row.entry_a_id), name: row.entry_a_name },
    entryB: row.entry_b_id == null ? null : { id: Number(row.entry_b_id), name: row.entry_b_name },
    scoreA: row.score_a == null ? null : Number(row.score_a),
    scoreB: row.score_b == null ? null : Number(row.score_b),
    status: row.status,
    winner: row.winner_entry_id == null ? null : { id: Number(row.winner_entry_id), name: row.winner_name },
    resolution: row.resolution,
    adminConfirmedAt: row.admin_confirmed_at,
  }));
}

async function replaceEncounters(request: Request, env: Env, user: SessionUser, stageId: number) {
  const stage = await validateStage(env, stageId);
  if (!stage) return error('Etapa no encontrada', 404);
  if (stage.stage_type !== 'KNOCKOUT') return error('La etapa no es eliminatoria', 409);
  if (stage.status === 'finished' || stage.status === 'archived') return error('La etapa ya está cerrada', 409);
  if (stage.season_status === 'finished' || stage.season_status === 'archived') return error('La temporada ya está cerrada', 409);

  if (['COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_CAMPEONES','COPA_PAPA','PROMOCION'].includes(stage.competition_code)) return error('Configurá esta competición desde su flujo específico para validar todos los clasificados y las restricciones correspondientes',409);

  const body = await request.json().catch(() => null) as { encounters?: EncounterInput[] } | null;
  if (!Array.isArray(body?.encounters)) return error('Cruces inválidos');

  const seenSlots = new Set<string>();
  const normalized: Array<{
    slotKey: string;
    entryAId: number | null;
    entryBId: number | null;
    roundLinkId: number | null;
  }> = [];

  for (const raw of body.encounters) {
    const slotKey = raw.slotKey?.trim() ?? '';
    if (!slotKey) return error('Cada cruce necesita una clave de llave');
    if (seenSlots.has(slotKey)) return error('No se puede repetir la misma clave de llave');
    seenSlots.add(slotKey);

    const entryAId = raw.entryAId == null ? null : Number(raw.entryAId);
    const entryBId = raw.entryBId == null ? null : Number(raw.entryBId);
    if (entryAId != null && (!Number.isInteger(entryAId) || entryAId <= 0)) return error('Entrada A inválida');
    if (entryBId != null && (!Number.isInteger(entryBId) || entryBId <= 0)) return error('Entrada B inválida');
    if (entryAId != null && entryBId != null && entryAId === entryBId) return error('Una entrada no puede enfrentarse consigo misma');
    if (entryAId != null && !(await entryBelongsToCompetition(env, stage.competition_id, entryAId))) return error('La entrada A no pertenece a la competición');
    if (entryBId != null && !(await entryBelongsToCompetition(env, stage.competition_id, entryBId))) return error('La entrada B no pertenece a la competición');

    let roundLinkId: number | null = null;
    if (raw.roundLinkId != null) {
      roundLinkId = Number(raw.roundLinkId);
      if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Vínculo de Fecha inválido');
      const link = await env.DB.prepare(
        `SELECT id FROM competition_round_links
         WHERE id = ? AND competition_id = ? AND stage_id = ? LIMIT 1`,
      ).bind(roundLinkId, stage.competition_id, stageId).first<{ id: number }>();
      if (!link) return error('La Fecha indicada no pertenece a esta etapa');
    }

    normalized.push({ slotKey, entryAId, entryBId, roundLinkId });
  }

  const before = await encounterPayload(env, stageId);
  const existing = await env.DB.prepare(
    `SELECT COUNT(*) AS total
     FROM competition_tiebreaks ct
     JOIN competition_encounters ce ON ce.id = ct.encounter_id
     WHERE ce.stage_id = ? AND ct.status IN ('pending', 'active', 'resolved')`,
  ).bind(stageId).first<{ total: number }>();
  if (Number(existing?.total ?? 0) > 0) return error('No se pueden reemplazar cruces que ya tienen desempates asociados', 409);

  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM competition_encounters WHERE stage_id = ?').bind(stageId),
  ];
  for (const encounter of normalized) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO competition_encounters
           (stage_id, round_link_id, slot_key, entry_a_id, entry_b_id, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
      ).bind(stageId, encounter.roundLinkId, encounter.slotKey, encounter.entryAId, encounter.entryBId),
    );
  }
  await env.DB.batch(statements);

  const created = await env.DB.prepare(
    `SELECT id FROM competition_encounters WHERE stage_id = ? ORDER BY id`,
  ).bind(stageId).all<{ id: number }>();
  for (const row of created.results ?? []) await refreshEncounter(env, Number(row.id));

  const after = await encounterPayload(env, stageId);
  await audit(env, user.id, 'competition.knockout_configured', 'competition_stage', String(stageId), before, after);
  return json({ ok: true, stageId, encounters: after });
}

export async function refreshStage(env: Env, stageId: number) {
  const stage = await validateStage(env, stageId);
  if (!stage) return error('Etapa no encontrada', 404);
  if (stage.stage_type !== 'KNOCKOUT') return error('La etapa no es eliminatoria', 409);

  const rows = await env.DB.prepare(
    `SELECT id FROM competition_encounters WHERE stage_id = ? ORDER BY id`,
  ).bind(stageId).all<{ id: number }>();
  for (const row of rows.results ?? []) await refreshEncounter(env, Number(row.id));

  return json({ stageId, encounters: await encounterPayload(env, stageId) });
}

async function confirmWinner(request: Request, env: Env, user: SessionUser, encounterId: number) {
  const encounter = await env.DB.prepare(
    `SELECT ce.id, ce.stage_id, ce.entry_a_id, ce.entry_b_id,
            ce.winner_entry_id, ce.resolution,
            cs.competition_id, cs.stage_type,
            c.season_id, c.code AS competition_code, s.status AS season_status
     FROM competition_encounters ce
     JOIN competition_stages cs ON cs.id = ce.stage_id
     JOIN competitions c ON c.id = cs.competition_id
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE ce.id = ? LIMIT 1`,
  ).bind(encounterId).first<{
    id: number;
    stage_id: number;
    entry_a_id: number | null;
    entry_b_id: number | null;
    winner_entry_id: number | null;
    resolution: string | null;
    competition_id: number;
    stage_type: string;
    competition_code: string;
    season_id: number;
    season_status: string;
  }>();
  if (!encounter) return error('Cruce no encontrado', 404);
  if (encounter.stage_type !== 'KNOCKOUT') return error('El cruce no pertenece a una etapa eliminatoria', 409);
  if (encounter.season_status === 'finished' || encounter.season_status === 'archived') return error('La temporada ya está cerrada', 409);

  const body = await request.json().catch(() => null) as {
    winnerEntryId?: number;
    resolution?: 'normal' | 'tiebreak' | 'admin';
    reason?: string;
  } | null;
  const winnerEntryId = Number(body?.winnerEntryId);
  if (!Number.isInteger(winnerEntryId) || winnerEntryId <= 0) return error('Ganador inválido');
  if (winnerEntryId !== encounter.entry_a_id && winnerEntryId !== encounter.entry_b_id) return error('El ganador debe ser uno de los participantes del cruce');

  const requestedResolution = body?.resolution;
  const resolution = requestedResolution === 'tiebreak' || requestedResolution === 'normal' ? requestedResolution : 'admin';
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (['COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_CAMPEONES','COPA_PAPA','PROMOCION'].includes(encounter.competition_code)) {
    if (resolution === 'admin' && !reason) return error('Indicá el motivo de la corrección');
    if (resolution === 'tiebreak') return error('Resolvé el desempate desde el flujo TAFA',409);
  }
  if (resolution === 'normal') {
    await refreshEncounter(env, encounterId);
    const recalculated = await env.DB.prepare(
      `SELECT winner_entry_id, resolution, status FROM competition_encounters WHERE id = ? LIMIT 1`,
    ).bind(encounterId).first<{ winner_entry_id: number | null; resolution: string | null; status: string }>();
    if (recalculated?.winner_entry_id !== winnerEntryId || recalculated.resolution !== 'normal') {
      return error('El resultado automático no coincide con el ganador indicado', 409);
    }
  }

  const before = { winnerEntryId: encounter.winner_entry_id, resolution: encounter.resolution };
  const after = { winnerEntryId, resolution, reason: reason || null };
  await env.DB.batch([
    env.DB.prepare(`UPDATE competition_encounters
      SET winner_entry_id = ?, resolution = ?, status = 'finished',
          admin_confirmed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
      .bind(winnerEntryId, resolution, encounterId),
    env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json)
      VALUES (?, 'competition.encounter_winner_confirmed', 'competition_encounter', ?, ?, ?)`)
      .bind(user.id, String(encounterId), JSON.stringify(before), JSON.stringify(after)),
  ]);
  return json({ ok: true, encounterId, winnerEntryId, resolution });
}

export async function handleCompetitionKnockout(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const stageMatch = pathname.match(/^\/api\/competition-engine\/stages\/(\d+)\/knockout$/);
  if (stageMatch && request.method === 'GET') {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    const stageId = Number(stageMatch[1]);
    const stage = await validateStage(env, stageId);
    if (!stage) return error('Etapa no encontrada', 404);
    if (stage.stage_type !== 'KNOCKOUT') return error('La etapa no es eliminatoria', 409);
    await refreshStage(env, stageId);
    return json({ stageId, encounters: await encounterPayload(env, stageId) });
  }

  const adminStageMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/knockout$/);
  if (adminStageMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    const stageId = Number(adminStageMatch[1]);
    if (request.method === 'PUT') return replaceEncounters(request, env, user, stageId);
    if (request.method === 'POST') return refreshStage(env, stageId);
    return error('Método no permitido', 405);
  }

  const confirmMatch = pathname.match(/^\/api\/admin\/competition-engine\/encounters\/(\d+)\/winner$/);
  if (confirmMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'PUT') return error('Método no permitido', 405);
    return confirmWinner(request, env, user, Number(confirmMatch[1]));
  }

  return null;
}
