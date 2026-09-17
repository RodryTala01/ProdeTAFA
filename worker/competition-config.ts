import type { Env } from './index';

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type CompetitionStatus = 'draft' | 'active' | 'finished' | 'archived';
type StageStatus = 'draft' | 'active' | 'finished' | 'archived';
type StageType = 'LEAGUE_TABLE' | 'ACCUMULATIVE_GROUPS' | 'ROUND_ROBIN_GROUPS' | 'SURVIVAL_TABLE' | 'KNOCKOUT';

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();
const STAGE_TYPES: StageType[] = [
  'LEAGUE_TABLE',
  'ACCUMULATIVE_GROUPS',
  'ROUND_ROBIN_GROUPS',
  'SURVIVAL_TABLE',
  'KNOCKOUT',
];

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
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json)
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

function normalizeStageCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

async function competitionById(env: Env, competitionId: number) {
  return env.DB.prepare(
    `SELECT c.id, c.season_id, c.code, c.canonical_name, c.display_name, c.status,
            s.status AS season_status
     FROM competitions c
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE c.id = ?
     LIMIT 1`,
  ).bind(competitionId).first<{
    id: number;
    season_id: number;
    code: string;
    canonical_name: string;
    display_name: string;
    status: CompetitionStatus;
    season_status: CompetitionStatus;
  }>();
}

async function updateCompetition(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await competitionById(env, competitionId);
  if (!competition) return error('Competición no encontrada', 404);
  if (competition.season_status === 'finished' || competition.season_status === 'archived') {
    return error('La temporada ya está cerrada', 409);
  }

  const body = await request.json().catch(() => null) as {
    displayName?: string;
    status?: CompetitionStatus;
  } | null;

  const displayName = body?.displayName == null ? competition.display_name : body.displayName.trim();
  const status = body?.status ?? competition.status;

  if (!displayName) return error('El nombre visible no puede quedar vacío');
  if (!['draft', 'active', 'finished', 'archived'].includes(status)) return error('Estado de competición inválido');

  if (competition.status === 'finished' && status !== 'finished' && status !== 'archived') {
    return error('Una competición finalizada no puede volver a estado activo/borrador', 409);
  }

  await env.DB.prepare(
    `UPDATE competitions
     SET display_name = ?,
         status = ?,
         finished_at = CASE WHEN ? = 'finished' THEN COALESCE(finished_at, datetime('now')) ELSE finished_at END,
         updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(displayName, status, status, competitionId).run();

  await audit(
    env,
    user.id,
    'competition.updated',
    'competition',
    String(competitionId),
    { displayName: competition.display_name, status: competition.status },
    { displayName, status },
  );

  return json({ ok: true, competitionId, displayName, status });
}

async function createStage(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await competitionById(env, competitionId);
  if (!competition) return error('Competición no encontrada', 404);
  if (competition.season_status === 'finished' || competition.season_status === 'archived') {
    return error('La temporada ya está cerrada', 409);
  }

  const body = await request.json().catch(() => null) as {
    code?: string;
    name?: string;
    stageType?: StageType;
    sequence?: number;
    settings?: unknown;
  } | null;

  const name = body?.name?.trim() ?? '';
  const stageType = body?.stageType;
  if (!name) return error('La etapa necesita un nombre');
  if (!stageType || !STAGE_TYPES.includes(stageType)) return error('Tipo de etapa inválido');

  let code = normalizeStageCode(body?.code || name);
  if (!code) return error('No se pudo generar un código de etapa válido');

  let sequence = Number(body?.sequence);
  if (!Number.isInteger(sequence) || sequence <= 0) {
    const max = await env.DB.prepare(
      `SELECT COALESCE(MAX(sequence), 0) AS max_sequence
       FROM competition_stages
       WHERE competition_id = ?`,
    ).bind(competitionId).first<{ max_sequence: number }>();
    sequence = Number(max?.max_sequence ?? 0) + 1;
  }

  const duplicate = await env.DB.prepare(
    `SELECT id FROM competition_stages
     WHERE competition_id = ? AND (code = ? OR sequence = ?)
     LIMIT 1`,
  ).bind(competitionId, code, sequence).first<{ id: number }>();
  if (duplicate) return error('Ya existe una etapa con ese código o posición', 409);

  const result = await env.DB.prepare(
    `INSERT INTO competition_stages
       (competition_id, code, name, stage_type, sequence, settings_json)
     VALUES (?, ?, ?, ?, ?, ?)` ,
  ).bind(
    competitionId,
    code,
    name,
    stageType,
    sequence,
    body?.settings == null ? null : JSON.stringify(body.settings),
  ).run();

  const stageId = Number(result.meta.last_row_id);
  await audit(
    env,
    user.id,
    'competition_stage.created',
    'competition_stage',
    String(stageId),
    null,
    { competitionId, code, name, stageType, sequence },
  );

  return json({
    stage: { id: stageId, competitionId, code, name, stageType, sequence, status: 'draft' },
  }, { status: 201 });
}

async function stageById(env: Env, stageId: number) {
  return env.DB.prepare(
    `SELECT cs.id, cs.competition_id, cs.code, cs.name, cs.stage_type, cs.sequence,
            cs.status, cs.settings_json, c.season_id, s.status AS season_status
     FROM competition_stages cs
     JOIN competitions c ON c.id = cs.competition_id
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE cs.id = ?
     LIMIT 1`,
  ).bind(stageId).first<{
    id: number;
    competition_id: number;
    code: string;
    name: string;
    stage_type: StageType;
    sequence: number;
    status: StageStatus;
    settings_json: string | null;
    season_id: number;
    season_status: CompetitionStatus;
  }>();
}

async function updateStage(request: Request, env: Env, user: SessionUser, stageId: number) {
  const stage = await stageById(env, stageId);
  if (!stage) return error('Etapa no encontrada', 404);
  if (stage.season_status === 'finished' || stage.season_status === 'archived') return error('La temporada ya está cerrada', 409);

  const body = await request.json().catch(() => null) as {
    name?: string;
    status?: StageStatus;
    settings?: unknown;
  } | null;

  const name = body?.name == null ? stage.name : body.name.trim();
  const status = body?.status ?? stage.status;
  if (!name) return error('El nombre de la etapa no puede quedar vacío');
  if (!['draft', 'active', 'finished', 'archived'].includes(status)) return error('Estado de etapa inválido');

  const settingsJson = body && Object.prototype.hasOwnProperty.call(body, 'settings')
    ? (body.settings == null ? null : JSON.stringify(body.settings))
    : stage.settings_json;

  await env.DB.prepare(
    `UPDATE competition_stages
     SET name = ?, status = ?, settings_json = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(name, status, settingsJson, stageId).run();

  await audit(
    env,
    user.id,
    'competition_stage.updated',
    'competition_stage',
    String(stageId),
    { name: stage.name, status: stage.status, settingsJson: stage.settings_json },
    { name, status, settingsJson },
  );

  return json({ ok: true, stageId, name, status });
}

async function deleteStage(env: Env, user: SessionUser, stageId: number) {
  const stage = await stageById(env, stageId);
  if (!stage) return error('Etapa no encontrada', 404);
  if (stage.season_status === 'finished' || stage.season_status === 'archived') return error('La temporada ya está cerrada', 409);

  const usage = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM competition_round_links WHERE stage_id = ?) AS round_links,
       (SELECT COUNT(*) FROM competition_groups WHERE stage_id = ?) AS groups_count,
       (SELECT COUNT(*) FROM competition_encounters WHERE stage_id = ?) AS encounters_count,
       (SELECT COUNT(*) FROM competition_tiebreaks WHERE stage_id = ?) AS tiebreaks_count`,
  ).bind(stageId, stageId, stageId, stageId).first<{
    round_links: number;
    groups_count: number;
    encounters_count: number;
    tiebreaks_count: number;
  }>();

  const inUse = Number(usage?.round_links ?? 0)
    + Number(usage?.groups_count ?? 0)
    + Number(usage?.encounters_count ?? 0)
    + Number(usage?.tiebreaks_count ?? 0);
  if (inUse > 0) return error('No se puede eliminar una etapa que ya tiene Fechas, grupos, cruces o desempates asociados', 409);

  await env.DB.prepare('DELETE FROM competition_stages WHERE id = ?').bind(stageId).run();
  await audit(
    env,
    user.id,
    'competition_stage.deleted',
    'competition_stage',
    String(stageId),
    { competitionId: stage.competition_id, code: stage.code, name: stage.name },
    null,
  );

  return json({ ok: true, stageId });
}

export async function handleCompetitionConfig(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const competitionMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)$/);
  const createStageMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/stages$/);
  const stageMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)$/);
  if (!competitionMatch && !createStageMatch && !stageMatch) return null;

  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);
  if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);

  if (competitionMatch && request.method === 'PUT') {
    return updateCompetition(request, env, user, Number(competitionMatch[1]));
  }

  if (createStageMatch && request.method === 'POST') {
    return createStage(request, env, user, Number(createStageMatch[1]));
  }

  if (stageMatch && request.method === 'PUT') {
    return updateStage(request, env, user, Number(stageMatch[1]));
  }

  if (stageMatch && request.method === 'DELETE') {
    return deleteStage(env, user, Number(stageMatch[1]));
  }

  return error('Método no permitido', 405);
}
