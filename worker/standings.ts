type Env = {
  DB: D1Database;
};

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type StandingRow = {
  user_id: string;
  full_name: string;
  rounds_played: number;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
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

async function overallStandings(request: Request, env: Env) {
  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);

  const rounds = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM rounds WHERE status = 'finished'`,
  ).first<{ total: number }>();

  const result = await env.DB.prepare(
    `SELECT
       u.id AS user_id,
       u.full_name,
       COUNT(DISTINCT rs.round_id) AS rounds_played,
       COALESCE(SUM(ps.total_points), 0) AS points,
       COALESCE(SUM(CASE WHEN ps.base_points = 3 THEN 1 ELSE 0 END), 0) AS fulls,
       COALESCE(SUM(CASE WHEN ps.base_points = 1 THEN 1 ELSE 0 END), 0) AS partials,
       COALESCE(SUM(CASE WHEN ps.base_points = 0 AND ps.result_type <> 'VOID' THEN 1 ELSE 0 END), 0) AS errors,
       COALESCE(SUM(ps.extra_points), 0) AS extras
     FROM round_submissions rs
     JOIN rounds r ON r.id = rs.round_id AND r.status = 'finished'
     JOIN users u ON u.id = rs.user_id AND u.role = 'participant'
     LEFT JOIN matches m ON m.round_id = r.id
     LEFT JOIN predictions p ON p.user_id = u.id AND p.match_id = m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id = p.id
     GROUP BY u.id, u.full_name
     ORDER BY points DESC, fulls DESC, partials DESC, errors ASC, extras DESC, u.full_name COLLATE NOCASE`,
  ).all<StandingRow>();

  const standings = (result.results ?? []).map((row, index) => {
    const points = Number(row.points ?? 0);
    const roundsPlayed = Number(row.rounds_played ?? 0);
    return {
      position: index + 1,
      userId: row.user_id,
      fullName: row.full_name,
      roundsPlayed,
      points,
      averagePoints: roundsPlayed > 0 ? Math.round((points / roundsPlayed) * 100) / 100 : 0,
      fulls: Number(row.fulls ?? 0),
      partials: Number(row.partials ?? 0),
      errors: Number(row.errors ?? 0),
      extras: Number(row.extras ?? 0),
    };
  });

  return json({
    finishedRounds: Number(rounds?.total ?? 0),
    currentUserId: user.id,
    standings,
  });
}

export async function handleStandings(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api/standings/overall' && request.method === 'GET') {
    return overallStandings(request, env);
  }
  return null;
}
