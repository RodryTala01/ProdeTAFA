type Env = { DB: D1Database };

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };

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

export async function handleHistory(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (pathname !== '/api/participant/history') return null;
  if (request.method !== 'GET') return error('Método no permitido', 405);

  const user = await sessionUser(request, env);
  if (!user || user.role !== 'participant') return error('Acceso de participante requerido', 403);

  const result = await env.DB.prepare(
    `SELECT r.id, r.name, r.finished_at, rs.last_submitted_at, rs.submission_count,
            COALESCE(SUM(ps.total_points), 0) AS points,
            COALESCE(SUM(CASE WHEN ps.base_points = 3 THEN 1 ELSE 0 END), 0) AS fulls,
            COALESCE(SUM(CASE WHEN ps.base_points = 1 THEN 1 ELSE 0 END), 0) AS partials,
            COALESCE(SUM(CASE WHEN ps.base_points = 0 AND ps.result_type <> 'VOID' THEN 1 ELSE 0 END), 0) AS errors,
            COALESCE(SUM(ps.extra_points), 0) AS extras
     FROM round_submissions rs
     JOIN rounds r ON r.id = rs.round_id AND r.status = 'finished'
     LEFT JOIN matches m ON m.round_id = r.id
     LEFT JOIN predictions p ON p.user_id = rs.user_id AND p.match_id = m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id = p.id AND ps.is_provisional = 0
     WHERE rs.user_id = ?
     GROUP BY r.id, r.name, r.finished_at, rs.last_submitted_at, rs.submission_count
     ORDER BY r.id DESC`,
  ).bind(user.id).all<{
    id: number;
    name: string;
    finished_at: string | null;
    last_submitted_at: string;
    submission_count: number;
    points: number;
    fulls: number;
    partials: number;
    errors: number;
    extras: number;
  }>();

  return json({
    rounds: (result.results ?? []).map((round) => ({
      id: round.id,
      name: round.name,
      finishedAt: round.finished_at,
      lastSubmittedAt: round.last_submitted_at,
      submissionCount: Number(round.submission_count ?? 0),
      points: Number(round.points ?? 0),
      fulls: Number(round.fulls ?? 0),
      partials: Number(round.partials ?? 0),
      errors: Number(round.errors ?? 0),
      extras: Number(round.extras ?? 0),
    })),
  });
}
