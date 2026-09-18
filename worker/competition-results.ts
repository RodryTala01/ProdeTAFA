import type { Env } from './index';

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type ResultInput = {
  entryId?: number;
  stageId?: number | null;
  resultCode?: string;
  finalPosition?: number | null;
  detail?: unknown;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();
const RESULT_CODES = new Set([
  'CHAMPION',
  'RUNNER_UP',
  'THIRD',
  'SEMIFINAL',
  'QUARTERFINAL',
  'ROUND_OF_16',
  'ROUND_OF_32',
  'ROUND_OF_64',
  'PHASE_5',
  'PHASE_4',
  'PHASE_3',
  'PHASE_2',
  'GROUP_STAGE',
  'POSITION',
  'ELIMINATED',
  'QUALIFIED',
  'OTHER',
]);

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

async function readResults(env: Env, competitionId: number) {
  const competition = await env.DB.prepare(
    `SELECT c.id, c.code, c.display_name, c.status,
            s.season_number, s.name AS season_name
     FROM competitions c
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE c.id = ? LIMIT 1`,
  ).bind(competitionId).first<{
    id: number;
    code: string;
    display_name: string;
    status: string;
    season_number: number;
    season_name: string;
  }>();
  if (!competition) return null;

  const rows = await env.DB.prepare(
    `SELECT cr.id, cr.entry_id, cr.stage_id, cr.result_code, cr.final_position,
            cr.detail_json, cr.confirmed_at,
            ce.display_name AS entry_name, ce.entry_type,
            cs.name AS stage_name
     FROM competition_results cr
     JOIN competition_entries ce ON ce.id = cr.entry_id
     LEFT JOIN competition_stages cs ON cs.id = cr.stage_id
     WHERE cr.competition_id = ?
     ORDER BY
       CASE WHEN cr.final_position IS NULL THEN 1 ELSE 0 END,
       cr.final_position,
       ce.display_name COLLATE NOCASE`,
  ).bind(competitionId).all<{
    id: number;
    entry_id: number;
    stage_id: number | null;
    result_code: string;
    final_position: number | null;
    detail_json: string | null;
    confirmed_at: string;
    entry_name: string;
    entry_type: string;
    stage_name: string | null;
  }>();

  const results = [];
  for (const row of rows.results ?? []) {
    const members = await env.DB.prepare(
      `SELECT cem.user_id, u.full_name
       FROM competition_entry_members cem
       JOIN users u ON u.id = cem.user_id
       WHERE cem.entry_id = ?
       ORDER BY cem.id`,
    ).bind(row.entry_id).all<{ user_id: string; full_name: string }>();

    results.push({
      id: Number(row.id),
      entryId: Number(row.entry_id),
      entryName: row.entry_name,
      entryType: row.entry_type,
      stageId: row.stage_id == null ? null : Number(row.stage_id),
      stageName: row.stage_name,
      resultCode: row.result_code,
      finalPosition: row.final_position == null ? null : Number(row.final_position),
      detail: row.detail_json ? JSON.parse(row.detail_json) : null,
      confirmedAt: row.confirmed_at,
      members: (members.results ?? []).map((member) => ({
        userId: member.user_id,
        fullName: member.full_name,
      })),
    });
  }

  return {
    competition: {
      id: Number(competition.id),
      code: competition.code,
      displayName: competition.display_name,
      status: competition.status,
      seasonNumber: Number(competition.season_number),
      seasonName: competition.season_name,
    },
    results,
  };
}

async function replaceResults(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await env.DB.prepare(
    `SELECT c.id, c.status, c.season_id, s.status AS season_status
     FROM competitions c
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE c.id = ? LIMIT 1`,
  ).bind(competitionId).first<{
    id: number;
    status: string;
    season_id: number;
    season_status: string;
  }>();
  if (!competition) return error('Competición no encontrada', 404);
  if (competition.status === 'archived' || competition.season_status === 'archived') {
    return error('Una competición archivada no admite cambios de resultados', 409);
  }

  const body = await request.json().catch(() => null) as { results?: ResultInput[] } | null;
  if (!Array.isArray(body?.results)) return error('Resultados inválidos');

  const seenEntries = new Set<number>();
  const normalized: Array<{
    entryId: number;
    stageId: number | null;
    resultCode: string;
    finalPosition: number | null;
    detailJson: string | null;
  }> = [];

  for (const raw of body.results) {
    const entryId = Number(raw.entryId);
    if (!Number.isInteger(entryId) || entryId <= 0) return error('Hay una entrada inválida');
    if (seenEntries.has(entryId)) return error('Una entrada no puede tener dos resultados finales');

    const entry = await env.DB.prepare(
      `SELECT id FROM competition_entries WHERE id = ? AND competition_id = ? LIMIT 1`,
    ).bind(entryId, competitionId).first<{ id: number }>();
    if (!entry) return error('Hay una entrada que no pertenece a esta competición');

    let stageId: number | null = null;
    if (raw.stageId != null) {
      stageId = Number(raw.stageId);
      if (!Number.isInteger(stageId) || stageId <= 0) return error('Etapa inválida');
      const stage = await env.DB.prepare(
        `SELECT id FROM competition_stages WHERE id = ? AND competition_id = ? LIMIT 1`,
      ).bind(stageId, competitionId).first<{ id: number }>();
      if (!stage) return error('La etapa indicada no pertenece a esta competición');
    }

    const resultCode = raw.resultCode?.trim().toUpperCase() ?? '';
    if (!RESULT_CODES.has(resultCode)) return error(`Código de resultado no permitido: ${resultCode || '(vacío)'}`);

    let finalPosition: number | null = null;
    if (raw.finalPosition != null) {
      finalPosition = Number(raw.finalPosition);
      if (!Number.isInteger(finalPosition) || finalPosition <= 0) return error('Posición final inválida');
    }

    let detailJson: string | null = null;
    if (raw.detail !== undefined) detailJson = JSON.stringify(raw.detail);

    seenEntries.add(entryId);
    normalized.push({ entryId, stageId, resultCode, finalPosition, detailJson });
  }

  const before = await readResults(env, competitionId);
  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM competition_results WHERE competition_id = ?').bind(competitionId),
  ];
  for (const result of normalized) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO competition_results
           (competition_id, entry_id, stage_id, result_code, final_position,
            detail_json, confirmed_by_user_id, confirmed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      ).bind(
        competitionId,
        result.entryId,
        result.stageId,
        result.resultCode,
        result.finalPosition,
        result.detailJson,
        user.id,
      ),
    );
  }
  await env.DB.batch(statements);

  const after = await readResults(env, competitionId);
  await audit(
    env,
    user.id,
    'competition.results_confirmed',
    'competition',
    String(competitionId),
    before?.results ?? null,
    after?.results ?? null,
  );

  return json(after);
}

export async function handleCompetitionResults(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const publicMatch = pathname.match(/^\/api\/competition-engine\/competitions\/(\d+)\/results$/);
  if (publicMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const payload = await readResults(env, Number(publicMatch[1]));
    return payload ? json(payload) : error('Competición no encontrada', 404);
  }

  const adminMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/results$/);
  if (adminMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'PUT') return error('Método no permitido', 405);
    return replaceResults(request, env, user, Number(adminMatch[1]));
  }

  return null;
}
