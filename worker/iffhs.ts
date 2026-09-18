import type { Env } from './index';
import { calculateIffhsSeason } from './iffhs-calculator';

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type ImportedTotal = {
  userId?: string;
  totalPoints?: number;
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

async function audit(env: Env, actorUserId: string, action: string, entityType: string, entityId: string, after: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(actorUserId, action, entityType, entityId, JSON.stringify(after)).run();
}

function fromScaled(value: number) {
  return Math.round(value) / 100;
}

function toScaled(value: number) {
  return Math.round(value * 100);
}

async function ranking(request: Request, env: Env) {
  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);

  const url = new URL(request.url);
  const requestedThroughSeason = Number(url.searchParams.get('throughSeason'));
  let throughSeason = Number.isInteger(requestedThroughSeason) && requestedThroughSeason > 0
    ? requestedThroughSeason
    : 0;

  if (!throughSeason) {
    const latest = await env.DB.prepare(
      `SELECT MAX(season_number) AS season_number FROM iffhs_season_totals`,
    ).first<{ season_number: number | null }>();
    throughSeason = Number(latest?.season_number ?? 0);
  }

  if (!throughSeason) {
    return json({
      throughSeason: null,
      includedSeasons: [],
      missingSeasons: [],
      ranking: [],
    });
  }

  const firstSeason = Math.max(1, throughSeason - 4);
  const includedSeasons = Array.from({ length: throughSeason - firstSeason + 1 }, (_, index) => firstSeason + index);

  const availableSeasonsResult = await env.DB.prepare(
    `SELECT DISTINCT season_number
     FROM iffhs_season_totals
     WHERE season_number BETWEEN ? AND ?
     ORDER BY season_number`,
  ).bind(firstSeason, throughSeason).all<{ season_number: number }>();
  const availableSeasons = new Set((availableSeasonsResult.results ?? []).map((row) => Number(row.season_number)));
  const missingSeasons = includedSeasons.filter((seasonNumber) => !availableSeasons.has(seasonNumber));

  const totalsResult = await env.DB.prepare(
    `SELECT u.id AS user_id, u.full_name,
            COALESCE(SUM(t.total_points_scaled), 0) AS total_points_scaled
     FROM users u
     LEFT JOIN iffhs_season_totals t
       ON t.user_id = u.id
      AND t.season_number BETWEEN ? AND ?
     WHERE u.role = 'participant'
     GROUP BY u.id, u.full_name
     ORDER BY total_points_scaled DESC, u.full_name COLLATE NOCASE`,
  ).bind(firstSeason, throughSeason).all<{
    user_id: string;
    full_name: string;
    total_points_scaled: number;
  }>();

  const breakdownResult = await env.DB.prepare(
    `SELECT season_number, user_id, total_points_scaled, source
     FROM iffhs_season_totals
     WHERE season_number BETWEEN ? AND ?
     ORDER BY season_number`,
  ).bind(firstSeason, throughSeason).all<{
    season_number: number;
    user_id: string;
    total_points_scaled: number;
    source: string;
  }>();

  const breakdownByUser = new Map<string, Array<{ seasonNumber: number; points: number; source: string }>>();
  for (const row of breakdownResult.results ?? []) {
    const list = breakdownByUser.get(row.user_id) ?? [];
    list.push({
      seasonNumber: Number(row.season_number),
      points: fromScaled(Number(row.total_points_scaled ?? 0)),
      source: row.source,
    });
    breakdownByUser.set(row.user_id, list);
  }

  let previousPoints: number | null = null;
  let previousPosition = 0;
  const rows = (totalsResult.results ?? []).map((row, index) => {
    const scaledPoints = Number(row.total_points_scaled ?? 0);
    const position = previousPoints !== null && scaledPoints === previousPoints
      ? previousPosition
      : index + 1;
    previousPoints = scaledPoints;
    previousPosition = position;

    const userBreakdown = breakdownByUser.get(row.user_id) ?? [];
    const bySeason = new Map(userBreakdown.map((item) => [item.seasonNumber, item]));

    return {
      position,
      userId: row.user_id,
      fullName: row.full_name,
      totalPoints: fromScaled(scaledPoints),
      seasons: includedSeasons.map((seasonNumber) => ({
        seasonNumber,
        points: bySeason.get(seasonNumber)?.points ?? 0,
        source: bySeason.get(seasonNumber)?.source ?? null,
      })),
    };
  });

  return json({
    throughSeason,
    includedSeasons,
    missingSeasons,
    ranking: rows,
  });
}

async function importSeasonTotals(request: Request, env: Env, user: SessionUser, seasonNumber: number) {
  if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) return error('Temporada IFFHS inválida');

  const body = await request.json().catch(() => null) as { rows?: ImportedTotal[] } | null;
  if (!Array.isArray(body?.rows) || body.rows.length === 0) return error('No hay totales para importar');

  const normalized: Array<{ userId: string; totalPoints: number; totalScaled: number }> = [];
  const seen = new Set<string>();

  for (const row of body.rows) {
    const userId = row.userId?.trim() ?? '';
    const totalPoints = Number(row.totalPoints);
    if (!userId || !Number.isFinite(totalPoints) || totalPoints < 0) return error('Hay una fila IFFHS inválida');
    if (seen.has(userId)) return error('Un participante aparece más de una vez en la misma temporada IFFHS');

    const participant = await env.DB.prepare(
      `SELECT id FROM users WHERE id = ? AND role = 'participant' LIMIT 1`,
    ).bind(userId).first<{ id: string }>();
    if (!participant) return error('La importación contiene un participante inexistente');

    seen.add(userId);
    normalized.push({ userId, totalPoints, totalScaled: toScaled(totalPoints) });
  }

  const statements: D1PreparedStatement[] = [];
  for (const row of normalized) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO iffhs_season_totals
           (season_number, user_id, total_points_scaled, source, calculated_at)
         VALUES (?, ?, ?, 'imported', datetime('now'))
         ON CONFLICT(season_number, user_id) DO UPDATE SET
           total_points_scaled = excluded.total_points_scaled,
           source = 'imported',
           calculated_at = excluded.calculated_at`,
      ).bind(seasonNumber, row.userId, row.totalScaled),
    );
  }
  await env.DB.batch(statements);

  await audit(env, user.id, 'iffhs.season_totals_imported', 'iffhs_season', String(seasonNumber), {
    seasonNumber,
    rows: normalized.map(({ userId, totalPoints }) => ({ userId, totalPoints })),
  });

  return json({
    ok: true,
    seasonNumber,
    imported: normalized.length,
  });
}

async function seasonComponents(request: Request, env: Env, seasonNumber: number) {
  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);
  if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) return error('Temporada IFFHS inválida');

  const url = new URL(request.url);
  const requestedUserId = url.searchParams.get('userId')?.trim() || null;
  if (requestedUserId && user.role !== 'admin' && requestedUserId !== user.id) {
    return error('No podés consultar el detalle IFFHS de otro participante', 403);
  }
  const effectiveUserId = requestedUserId ?? (user.role === 'participant' ? user.id : null);

  const params: unknown[] = [seasonNumber];
  let where = 'isc.season_number = ?';
  if (effectiveUserId) {
    where += ' AND isc.user_id = ?';
    params.push(effectiveUserId);
  }

  const rows = await env.DB.prepare(
    `SELECT isc.user_id,u.full_name,isc.competition_code,isc.component_code,
            isc.base_value_scaled,isc.multiplier_scaled,isc.points_scaled,
            isc.detail_json,isc.source,isc.calculated_at
     FROM iffhs_season_components isc
     JOIN users u ON u.id=isc.user_id
     WHERE ${where}
     ORDER BY u.full_name COLLATE NOCASE,isc.competition_code,isc.component_code`,
  ).bind(...params).all<{
    user_id: string; full_name: string; competition_code: string; component_code: string;
    base_value_scaled: number; multiplier_scaled: number; points_scaled: number;
    detail_json: string | null; source: string; calculated_at: string;
  }>();

  const totalRows = await env.DB.prepare(
    effectiveUserId
      ? `SELECT user_id,total_points_scaled,source,calculated_at
         FROM iffhs_season_totals WHERE season_number=? AND user_id=?`
      : `SELECT user_id,total_points_scaled,source,calculated_at
         FROM iffhs_season_totals WHERE season_number=?`,
  ).bind(...(effectiveUserId ? [seasonNumber, effectiveUserId] : [seasonNumber])).all<{
    user_id: string; total_points_scaled: number; source: string; calculated_at: string;
  }>();
  const totals = new Map((totalRows.results ?? []).map((row) => [row.user_id, {
    points: fromScaled(Number(row.total_points_scaled ?? 0)),
    source: row.source,
    calculatedAt: row.calculated_at,
  }]));

  const byUser = new Map<string, {
    userId: string; fullName: string; totalPoints: number; totalSource: string | null;
    calculatedAt: string | null;
    components: Array<{
      competitionCode: string; componentCode: string; baseValue: number; multiplier: number;
      points: number; detail: unknown; source: string; calculatedAt: string;
    }>;
  }>();

  for (const row of rows.results ?? []) {
    const total = totals.get(row.user_id);
    const item = byUser.get(row.user_id) ?? {
      userId: row.user_id,
      fullName: row.full_name,
      totalPoints: total?.points ?? 0,
      totalSource: total?.source ?? null,
      calculatedAt: total?.calculatedAt ?? null,
      components: [],
    };
    item.components.push({
      competitionCode: row.competition_code,
      componentCode: row.component_code,
      baseValue: fromScaled(Number(row.base_value_scaled ?? 0)),
      multiplier: Number(row.multiplier_scaled ?? 0) / 100,
      points: fromScaled(Number(row.points_scaled ?? 0)),
      detail: row.detail_json ? JSON.parse(row.detail_json) : null,
      source: row.source,
      calculatedAt: row.calculated_at,
    });
    byUser.set(row.user_id, item);
  }

  if (effectiveUserId && !byUser.has(effectiveUserId)) {
    const participant = await env.DB.prepare(
      `SELECT id,full_name FROM users WHERE id=? AND role='participant' LIMIT 1`,
    ).bind(effectiveUserId).first<{ id: string; full_name: string }>();
    if (participant) {
      const total = totals.get(effectiveUserId);
      byUser.set(effectiveUserId, {
        userId: participant.id,
        fullName: participant.full_name,
        totalPoints: total?.points ?? 0,
        totalSource: total?.source ?? null,
        calculatedAt: total?.calculatedAt ?? null,
        components: [],
      });
    }
  }

  return json({ seasonNumber, rows: [...byUser.values()] });
}

async function calculateSeason(env: Env, user: SessionUser, seasonNumber: number) {
  if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) return error('Temporada IFFHS inválida');
  const result = await calculateIffhsSeason(env, user.id, seasonNumber);
  if (!result.ok) return error(result.error, 409);
  return json({
    ok: true,
    seasonNumber,
    componentCount: result.components.length,
    totals: result.totals,
  });
}

export async function handleIffhs(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  if (pathname === '/api/competition-engine/iffhs/ranking') {
    if (request.method !== 'GET') return error('Método no permitido', 405);
    return ranking(request, env);
  }

  const componentsMatch = pathname.match(/^\/api\/competition-engine\/iffhs\/seasons\/(\d+)\/components$/);
  if (componentsMatch) {
    if (request.method !== 'GET') return error('Método no permitido', 405);
    return seasonComponents(request, env, Number(componentsMatch[1]));
  }

  const calculateMatch = pathname.match(/^\/api\/admin\/competition-engine\/iffhs\/seasons\/(\d+)\/calculate$/);
  if (calculateMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return calculateSeason(env, user, Number(calculateMatch[1]));
  }

  const importMatch = pathname.match(/^\/api\/admin\/competition-engine\/iffhs\/seasons\/(\d+)\/totals$/);
  if (importMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'PUT') return error('Método no permitido', 405);
    return importSeasonTotals(request, env, user, Number(importMatch[1]));
  }

  return null;
}
