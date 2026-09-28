import type { Env } from './index';

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
  provisional_scores: number;
};

type RoundBreakdownRow = {
  user_id: string;
  round_id: number;
  sequence: number;
  round_name: string;
  round_status: string;
  submitted: number;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
  provisional_scores: number;
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

function normalizedLeagueCode(raw: string) {
  const code = raw.trim().toUpperCase();
  if (code === 'A') return 'LIGA_A';
  if (code === 'B') return 'LIGA_B';
  return code;
}

async function leagueStandings(request: Request, env: Env, leagueCodeRaw: string) {
  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);

  const url = new URL(request.url);
  const leagueCode = normalizedLeagueCode(leagueCodeRaw);
  if (!['LIGA_A', 'LIGA_B'].includes(leagueCode)) return error('Liga inválida', 404);

  const requestedSeason = Number(url.searchParams.get('season'));
  const seasonFilter = Number.isInteger(requestedSeason) && requestedSeason > 0
    ? 's.season_number = ?'
    : "s.status = 'active'";
  const bindings: Array<string | number> = [];
  if (seasonFilter === 's.season_number = ?') bindings.push(requestedSeason);
  bindings.push(leagueCode);

  const competition = await env.DB.prepare(
    `SELECT c.id, c.code, c.display_name, c.status,
            s.id AS season_id, s.season_number, s.name AS season_name, s.status AS season_status,
            d.id AS division_id, d.code AS division_code, d.name AS division_name
     FROM competitions c
     JOIN tafa_seasons s ON s.id = c.season_id
     JOIN season_divisions d ON d.id = c.division_id
     WHERE ${seasonFilter} AND c.code = ? AND c.family = 'LEAGUE'
     ORDER BY s.season_number DESC
     LIMIT 1`,
  ).bind(...bindings).first<{
    id: number;
    code: string;
    display_name: string;
    status: string;
    season_id: number;
    season_number: number;
    season_name: string;
    season_status: string;
    division_id: number;
    division_code: string;
    division_name: string;
  }>();
  if (!competition) return error('Liga/temporada no encontrada', 404);

  const roundsResult = await env.DB.prepare(
    `SELECT crl.round_id, crl.sequence, r.name, r.status, r.category, r.finished_at
     FROM competition_round_links crl
     JOIN competition_stages cs ON cs.id = crl.stage_id
     JOIN rounds r ON r.id = crl.round_id
     WHERE crl.competition_id = ?
       AND crl.purpose = 'NORMAL'
       AND cs.stage_type = 'LEAGUE_TABLE'
     ORDER BY crl.sequence, crl.id`,
  ).bind(competition.id).all<{
    round_id: number;
    sequence: number;
    name: string;
    status: string;
    category: string;
    finished_at: string | null;
  }>();

  const standingsResult = await env.DB.prepare(
    `SELECT
       dm.user_id,
       u.full_name,
       COUNT(DISTINCT CASE WHEN op.id IS NOT NULL THEN crl.round_id END) AS rounds_played,
       COALESCE(SUM(ps.total_points), 0) AS points,
       COALESCE(SUM(CASE WHEN ps.base_points = 3 THEN 1 ELSE 0 END), 0) AS fulls,
       COALESCE(SUM(CASE WHEN ps.base_points = 1 THEN 1 ELSE 0 END), 0) AS partials,
       COALESCE(SUM(CASE WHEN ps.base_points = 0 AND ps.result_type <> 'VOID' THEN 1 ELSE 0 END), 0) AS errors,
       COALESCE(SUM(ps.extra_points), 0) AS extras,
       COALESCE(SUM(CASE WHEN ps.is_provisional = 1 THEN 1 ELSE 0 END), 0) AS provisional_scores
     FROM season_division_members dm
     JOIN users u ON u.id = dm.user_id
     LEFT JOIN competition_round_links crl
       ON crl.competition_id = ? AND crl.purpose = 'NORMAL'
     LEFT JOIN competition_stages cs
       ON cs.id = crl.stage_id AND cs.stage_type = 'LEAGUE_TABLE'
     LEFT JOIN matches m
       ON m.round_id = crl.round_id AND cs.id IS NOT NULL
     LEFT JOIN official_predictions op
       ON op.user_id = dm.user_id AND op.match_id = m.id
     LEFT JOIN prediction_scores ps
       ON ps.prediction_id = op.id
     WHERE dm.season_id = ? AND dm.division_id = ?
     GROUP BY dm.user_id, u.full_name
     ORDER BY points DESC, fulls DESC, partials DESC, errors ASC, extras DESC, u.full_name COLLATE NOCASE`,
  ).bind(competition.id, competition.season_id, competition.division_id).all<StandingRow>();

  const breakdownResult = await env.DB.prepare(
    `SELECT
       dm.user_id,
       crl.round_id,
       crl.sequence,
       r.name AS round_name,
       r.status AS round_status,
       CASE WHEN EXISTS (
         SELECT 1 FROM official_predictions op2
         JOIN matches m2 ON m2.id = op2.match_id
         WHERE op2.user_id = dm.user_id AND m2.round_id = crl.round_id
       ) THEN 1 ELSE 0 END AS submitted,
       COALESCE(SUM(ps.total_points), 0) AS points,
       COALESCE(SUM(CASE WHEN ps.base_points = 3 THEN 1 ELSE 0 END), 0) AS fulls,
       COALESCE(SUM(CASE WHEN ps.base_points = 1 THEN 1 ELSE 0 END), 0) AS partials,
       COALESCE(SUM(CASE WHEN ps.base_points = 0 AND ps.result_type <> 'VOID' THEN 1 ELSE 0 END), 0) AS errors,
       COALESCE(SUM(ps.extra_points), 0) AS extras,
       COALESCE(SUM(CASE WHEN ps.is_provisional = 1 THEN 1 ELSE 0 END), 0) AS provisional_scores
     FROM season_division_members dm
     JOIN competition_round_links crl
       ON crl.competition_id = ? AND crl.purpose = 'NORMAL'
     JOIN competition_stages cs
       ON cs.id = crl.stage_id AND cs.stage_type = 'LEAGUE_TABLE'
     JOIN rounds r ON r.id = crl.round_id
     LEFT JOIN matches m ON m.round_id = crl.round_id
     LEFT JOIN official_predictions op
       ON op.user_id = dm.user_id AND op.match_id = m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id = op.id
     WHERE dm.season_id = ? AND dm.division_id = ?
     GROUP BY dm.user_id, crl.round_id, crl.sequence, r.name, r.status
     ORDER BY dm.user_id, crl.sequence`,
  ).bind(competition.id, competition.season_id, competition.division_id).all<RoundBreakdownRow>();

  const breakdownByUser = new Map<string, Array<{
    roundId: number;
    sequence: number;
    name: string;
    status: string;
    submitted: boolean;
    points: number;
    fulls: number;
    partials: number;
    errors: number;
    extras: number;
    provisional: boolean;
  }>>();

  for (const row of breakdownResult.results ?? []) {
    const list = breakdownByUser.get(row.user_id) ?? [];
    list.push({
      roundId: Number(row.round_id),
      sequence: Number(row.sequence),
      name: row.round_name,
      status: row.round_status,
      submitted: Boolean(row.submitted),
      points: Number(row.points ?? 0),
      fulls: Number(row.fulls ?? 0),
      partials: Number(row.partials ?? 0),
      errors: Number(row.errors ?? 0),
      extras: Number(row.extras ?? 0),
      provisional: Number(row.provisional_scores ?? 0) > 0 || row.round_status !== 'finished',
    });
    breakdownByUser.set(row.user_id, list);
  }

  const standings = (standingsResult.results ?? []).map((row, index) => ({
    position: index + 1,
    userId: row.user_id,
    fullName: row.full_name,
    roundsPlayed: Number(row.rounds_played ?? 0),
    points: Number(row.points ?? 0),
    fulls: Number(row.fulls ?? 0),
    partials: Number(row.partials ?? 0),
    errors: Number(row.errors ?? 0),
    extras: Number(row.extras ?? 0),
    provisional: Number(row.provisional_scores ?? 0) > 0,
    rounds: breakdownByUser.get(row.user_id) ?? [],
  }));

  return json({
    currentUserId: user.id,
    season: {
      id: Number(competition.season_id),
      seasonNumber: Number(competition.season_number),
      name: competition.season_name,
      status: competition.season_status,
    },
    competition: {
      id: Number(competition.id),
      code: competition.code,
      displayName: competition.display_name,
      status: competition.status,
    },
    division: {
      id: Number(competition.division_id),
      code: competition.division_code,
      name: competition.division_name,
    },
    linkedRounds: (roundsResult.results ?? []).map((round) => ({
      roundId: Number(round.round_id),
      sequence: Number(round.sequence),
      name: round.name,
      status: round.status,
      category: round.category,
      finishedAt: round.finished_at,
    })),
    provisional: standings.some((row) => row.provisional),
    standings,
  });
}

export async function handleCompetitionLeagues(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/competition-engine\/leagues\/([^/]+)\/standings$/);
  if (!match) return null;
  if (request.method !== 'GET') return error('Método no permitido', 405);
  return leagueStandings(request, env, decodeURIComponent(match[1]));
}
