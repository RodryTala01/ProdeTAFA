type Env = {
  DB: D1Database;
};

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type RankingRow = {
  user_id: string;
  full_name: string;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
  provisional_count: number;
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

async function roundInfo(roundId: number, env: Env) {
  return env.DB.prepare(
    `SELECT id, name, status, published_at, finished_at
     FROM rounds WHERE id = ? LIMIT 1`,
  ).bind(roundId).first<{
    id: number;
    name: string;
    status: 'draft' | 'open' | 'finished';
    published_at: string | null;
    finished_at: string | null;
  }>();
}

async function buildRanking(roundId: number, env: Env) {
  const result = await env.DB.prepare(
    `SELECT
       u.id AS user_id,
       u.full_name,
       COALESCE(SUM(ps.total_points), 0) AS points,
       COALESCE(SUM(CASE WHEN ps.base_points = 3 THEN 1 ELSE 0 END), 0) AS fulls,
       COALESCE(SUM(CASE WHEN ps.base_points = 1 THEN 1 ELSE 0 END), 0) AS partials,
       COALESCE(SUM(CASE WHEN ps.base_points = 0 AND ps.result_type <> 'VOID' THEN 1 ELSE 0 END), 0) AS errors,
       COALESCE(SUM(ps.extra_points), 0) AS extras,
       COALESCE(SUM(CASE WHEN ps.is_provisional = 1 THEN 1 ELSE 0 END), 0) AS provisional_count
     FROM round_submissions rs
     JOIN users u ON u.id = rs.user_id
     LEFT JOIN predictions p ON p.user_id = u.id
       AND p.match_id IN (SELECT id FROM matches WHERE round_id = ?)
     LEFT JOIN prediction_scores ps ON ps.prediction_id = p.id
     WHERE rs.round_id = ?
       AND u.role = 'participant'
       AND u.is_active = 1
     GROUP BY u.id, u.full_name
     ORDER BY points DESC, fulls DESC, partials DESC, errors ASC, extras DESC, u.full_name COLLATE NOCASE`,
  ).bind(roundId, roundId).all<RankingRow>();

  return (result.results ?? []).map((row, index) => ({
    position: index + 1,
    userId: row.user_id,
    fullName: row.full_name,
    points: Number(row.points ?? 0),
    fulls: Number(row.fulls ?? 0),
    partials: Number(row.partials ?? 0),
    errors: Number(row.errors ?? 0),
    extras: Number(row.extras ?? 0),
    provisional: Number(row.provisional_count ?? 0) > 0,
  }));
}

async function adminRanking(request: Request, env: Env, roundId: number) {
  const user = await sessionUser(request, env);
  if (!user || user.role !== 'admin') return error('Acceso de administrador requerido', 403);

  const round = await roundInfo(roundId, env);
  if (!round) return error('Fecha no encontrada', 404);
  if (round.status === 'draft') return error('Publicá la fecha antes de consultar el ranking', 409);

  return json({
    round: {
      id: round.id,
      name: round.name,
      status: round.status,
      finishedAt: round.finished_at,
    },
    ranking: await buildRanking(roundId, env),
  });
}

async function participantRanking(request: Request, env: Env, roundId: number) {
  const user = await sessionUser(request, env);
  if (!user || user.role !== 'participant') return error('Acceso de participante requerido', 403);

  const round = await roundInfo(roundId, env);
  if (!round) return error('Fecha no encontrada', 404);
  if (round.status !== 'finished') return error('El ranking se habilita cuando finaliza la fecha', 403);

  return json({
    round: {
      id: round.id,
      name: round.name,
      status: round.status,
      finishedAt: round.finished_at,
    },
    ranking: await buildRanking(roundId, env),
  });
}

async function finishRound(request: Request, env: Env, roundId: number) {
  const user = await sessionUser(request, env);
  if (!user || user.role !== 'admin') return error('Acceso de administrador requerido', 403);

  const round = await roundInfo(roundId, env);
  if (!round) return error('Fecha no encontrada', 404);
  if (round.status === 'finished') return json({ ok: true, status: 'finished' });
  if (round.status !== 'open') return error('Solo se puede cerrar una fecha publicada', 409);

  const unresolved = await env.DB.prepare(
    `SELECT COUNT(*) AS total
     FROM matches
     WHERE round_id = ?
       AND result_finalized_at IS NULL
       AND is_void = 0`,
  ).bind(roundId).first<{ total: number }>();

  const pending = Number(unresolved?.total ?? 0);
  if (pending > 0) {
    return error(`Todavía hay ${pending} partido${pending === 1 ? '' : 's'} sin resultado definitivo`, 409);
  }

  await env.DB.prepare(
    `UPDATE rounds
     SET status = 'finished', finished_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(roundId).run();

  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id)
     VALUES (?, 'round.finished', 'round', ?)`,
  ).bind(user.id, String(roundId)).run();

  return json({ ok: true, status: 'finished' });
}

export async function handleRanking(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const adminRankingMatch = pathname.match(/^\/api\/admin\/ranking\/(\d+)$/);
  if (adminRankingMatch && request.method === 'GET') {
    return adminRanking(request, env, Number(adminRankingMatch[1]));
  }

  const participantRankingMatch = pathname.match(/^\/api\/participant\/ranking\/(\d+)$/);
  if (participantRankingMatch && request.method === 'GET') {
    return participantRanking(request, env, Number(participantRankingMatch[1]));
  }

  const finishMatch = pathname.match(/^\/api\/admin\/finish-round\/(\d+)$/);
  if (finishMatch && request.method === 'PUT') {
    return finishRound(request, env, Number(finishMatch[1]));
  }

  return null;
}
