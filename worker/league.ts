type Env = {
  DB: D1Database;
};

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type SeasonRow = {
  id: number;
  name: string;
  status: 'open' | 'finished';
  created_at: string;
  finished_at: string | null;
};

type LeagueStandingRow = {
  user_id: string;
  full_name: string;
  joined_at: string;
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

async function seasonRounds(env: Env, seasonId: number) {
  const result = await env.DB.prepare(
    `SELECT lr.slot_number, r.id, r.name, r.status, r.published_at, r.finished_at,
            COUNT(m.id) AS match_count,
            SUM(CASE WHEN m.result_finalized_at IS NOT NULL OR m.is_void = 1 THEN 1 ELSE 0 END) AS finalized_matches
     FROM league_rounds lr
     JOIN rounds r ON r.id = lr.round_id
     LEFT JOIN matches m ON m.round_id = r.id
     WHERE lr.season_id = ?
     GROUP BY lr.slot_number, r.id, r.name, r.status, r.published_at, r.finished_at
     ORDER BY lr.slot_number`,
  ).bind(seasonId).all<{
    slot_number: number;
    id: number;
    name: string;
    status: string;
    published_at: string | null;
    finished_at: string | null;
    match_count: number;
    finalized_matches: number;
  }>();

  return (result.results ?? []).map((round) => ({
    slot: Number(round.slot_number),
    id: Number(round.id),
    name: round.name,
    status: round.status,
    publishedAt: round.published_at,
    finishedAt: round.finished_at,
    matchCount: Number(round.match_count ?? 0),
    finalizedMatches: Number(round.finalized_matches ?? 0),
  }));
}

async function buildStandings(env: Env, seasonId: number) {
  const result = await env.DB.prepare(
    `SELECT
       lp.user_id,
       u.full_name,
       lp.joined_at,
       COUNT(DISTINCT CASE WHEN rs.id IS NOT NULL THEN lr.round_id END) AS rounds_played,
       COALESCE(SUM(CASE
         WHEN rs.id IS NOT NULL
          AND (m.result_finalized_at IS NOT NULL OR m.is_void = 1)
          AND ps.is_provisional = 0
         THEN ps.total_points ELSE 0 END), 0) AS points,
       COALESCE(SUM(CASE
         WHEN rs.id IS NOT NULL
          AND (m.result_finalized_at IS NOT NULL OR m.is_void = 1)
          AND ps.is_provisional = 0
          AND ps.base_points = 3
         THEN 1 ELSE 0 END), 0) AS fulls,
       COALESCE(SUM(CASE
         WHEN rs.id IS NOT NULL
          AND (m.result_finalized_at IS NOT NULL OR m.is_void = 1)
          AND ps.is_provisional = 0
          AND ps.base_points = 1
         THEN 1 ELSE 0 END), 0) AS partials,
       COALESCE(SUM(CASE
         WHEN rs.id IS NOT NULL
          AND (m.result_finalized_at IS NOT NULL OR m.is_void = 1)
          AND ps.is_provisional = 0
          AND ps.base_points = 0
          AND ps.result_type <> 'VOID'
         THEN 1 ELSE 0 END), 0) AS errors,
       COALESCE(SUM(CASE
         WHEN rs.id IS NOT NULL
          AND (m.result_finalized_at IS NOT NULL OR m.is_void = 1)
          AND ps.is_provisional = 0
         THEN ps.extra_points ELSE 0 END), 0) AS extras
     FROM league_participants lp
     JOIN users u ON u.id = lp.user_id AND u.role = 'participant'
     LEFT JOIN league_rounds lr ON lr.season_id = lp.season_id
     LEFT JOIN round_submissions rs ON rs.round_id = lr.round_id AND rs.user_id = lp.user_id
     LEFT JOIN matches m ON m.round_id = lr.round_id
     LEFT JOIN predictions p ON p.user_id = lp.user_id AND p.match_id = m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id = p.id
     WHERE lp.season_id = ?
     GROUP BY lp.user_id, u.full_name, lp.joined_at
     ORDER BY points DESC, fulls DESC, partials DESC, errors ASC, extras DESC, u.full_name COLLATE NOCASE`,
  ).bind(seasonId).all<LeagueStandingRow>();

  return (result.results ?? []).map((row, index) => ({
    position: index + 1,
    userId: row.user_id,
    fullName: row.full_name,
    joinedAt: row.joined_at,
    roundsPlayed: Number(row.rounds_played ?? 0),
    points: Number(row.points ?? 0),
    fulls: Number(row.fulls ?? 0),
    partials: Number(row.partials ?? 0),
    errors: Number(row.errors ?? 0),
    extras: Number(row.extras ?? 0),
  }));
}

async function seasonPayload(env: Env, season: SeasonRow, currentUserId: string | null = null) {
  const rounds = await seasonRounds(env, season.id);
  const standings = await buildStandings(env, season.id);
  const totalMatches = rounds.reduce((total, round) => total + round.matchCount, 0);
  const finalizedMatches = rounds.reduce((total, round) => total + round.finalizedMatches, 0);
  return {
    id: season.id,
    name: season.name,
    status: season.status,
    createdAt: season.created_at,
    finishedAt: season.finished_at,
    roundCount: rounds.length,
    totalMatches,
    finalizedMatches,
    currentUserId,
    rounds,
    standings,
  };
}

async function createSeason(request: Request, env: Env, user: SessionUser) {
  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = body?.name?.trim() ?? '';
  if (name.length < 3) return error('Ingresá un nombre para la temporada');

  const inserted = await env.DB.prepare(
    `INSERT INTO league_seasons (name) VALUES (?) RETURNING id, name, status, created_at, finished_at`,
  ).bind(name).first<SeasonRow>();
  if (!inserted) return error('No se pudo crear la temporada', 500);

  await env.DB.prepare(
    `INSERT OR IGNORE INTO league_participants (season_id, user_id)
     SELECT ?, id FROM users WHERE role = 'participant' AND is_active = 1`,
  ).bind(inserted.id).run();

  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, 'league.created', 'league_season', ?, ?)`,
  ).bind(user.id, String(inserted.id), JSON.stringify({ name })).run();

  return json({ season: await seasonPayload(env, inserted) }, { status: 201 });
}

async function adminList(request: Request, env: Env, user: SessionUser) {
  const seasonsResult = await env.DB.prepare(
    `SELECT id, name, status, created_at, finished_at
     FROM league_seasons
     ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, id DESC`,
  ).all<SeasonRow>();

  const seasons = [];
  for (const season of seasonsResult.results ?? []) {
    seasons.push(await seasonPayload(env, season));
  }

  const availableRounds = await env.DB.prepare(
    `SELECT r.id, r.name, r.status, r.published_at, r.finished_at
     FROM rounds r
     LEFT JOIN league_rounds lr ON lr.round_id = r.id
     WHERE lr.round_id IS NULL
     ORDER BY r.id DESC`,
  ).all<{
    id: number;
    name: string;
    status: string;
    published_at: string | null;
    finished_at: string | null;
  }>();

  return json({
    userId: user.id,
    seasons,
    availableRounds: (availableRounds.results ?? []).map((round) => ({
      id: round.id,
      name: round.name,
      status: round.status,
      publishedAt: round.published_at,
      finishedAt: round.finished_at,
    })),
  });
}

async function linkRound(request: Request, env: Env, user: SessionUser, seasonId: number) {
  const season = await env.DB.prepare(
    `SELECT id, name, status, created_at, finished_at FROM league_seasons WHERE id = ? LIMIT 1`,
  ).bind(seasonId).first<SeasonRow>();
  if (!season) return error('Temporada no encontrada', 404);
  if (season.status !== 'open') return error('La temporada ya está cerrada', 409);

  const body = await request.json().catch(() => null) as { roundId?: number } | null;
  const roundId = Number(body?.roundId);
  if (!Number.isInteger(roundId) || roundId <= 0) return error('Fecha inválida');

  const round = await env.DB.prepare('SELECT id, name FROM rounds WHERE id = ? LIMIT 1')
    .bind(roundId).first<{ id: number; name: string }>();
  if (!round) return error('Fecha no encontrada', 404);

  const linked = await env.DB.prepare('SELECT season_id FROM league_rounds WHERE round_id = ? LIMIT 1')
    .bind(roundId).first<{ season_id: number }>();
  if (linked) return error('Esa fecha ya está vinculada a una Liga', 409);

  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM league_rounds WHERE season_id = ?')
    .bind(seasonId).first<{ total: number }>();
  const total = Number(count?.total ?? 0);
  if (total >= 5) return error('La Liga ya tiene sus 5 fechas', 409);

  const slot = total + 1;
  await env.DB.prepare(
    `INSERT INTO league_rounds (season_id, round_id, slot_number) VALUES (?, ?, ?)`,
  ).bind(seasonId, roundId, slot).run();

  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, 'league.round_linked', 'league_season', ?, ?)`,
  ).bind(user.id, String(seasonId), JSON.stringify({ roundId, roundName: round.name, slot })).run();

  return json({ ok: true, season: await seasonPayload(env, season) });
}

async function unlinkRound(env: Env, user: SessionUser, seasonId: number, roundId: number) {
  const season = await env.DB.prepare(
    `SELECT id, name, status, created_at, finished_at FROM league_seasons WHERE id = ? LIMIT 1`,
  ).bind(seasonId).first<SeasonRow>();
  if (!season) return error('Temporada no encontrada', 404);
  if (season.status !== 'open') return error('La temporada ya está cerrada', 409);

  const target = await env.DB.prepare(
    `SELECT slot_number FROM league_rounds WHERE season_id = ? AND round_id = ? LIMIT 1`,
  ).bind(seasonId, roundId).first<{ slot_number: number }>();
  if (!target) return error('La fecha no pertenece a esta Liga', 404);

  await env.DB.prepare('DELETE FROM league_rounds WHERE season_id = ? AND round_id = ?')
    .bind(seasonId, roundId).run();

  await env.DB.prepare(
    `UPDATE league_rounds
     SET slot_number = slot_number - 1
     WHERE season_id = ? AND slot_number > ?`,
  ).bind(seasonId, target.slot_number).run();

  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json)
     VALUES (?, 'league.round_unlinked', 'league_season', ?, ?)`,
  ).bind(user.id, String(seasonId), JSON.stringify({ roundId, slot: target.slot_number })).run();

  return json({ ok: true, season: await seasonPayload(env, season) });
}

async function finishSeason(env: Env, user: SessionUser, seasonId: number) {
  const season = await env.DB.prepare(
    `SELECT id, name, status, created_at, finished_at FROM league_seasons WHERE id = ? LIMIT 1`,
  ).bind(seasonId).first<SeasonRow>();
  if (!season) return error('Temporada no encontrada', 404);
  if (season.status === 'finished') return json({ ok: true, status: 'finished' });

  const linked = await env.DB.prepare(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN r.status = 'finished' THEN 1 ELSE 0 END) AS finished
     FROM league_rounds lr
     JOIN rounds r ON r.id = lr.round_id
     WHERE lr.season_id = ?`,
  ).bind(seasonId).first<{ total: number; finished: number }>();

  if (Number(linked?.total ?? 0) !== 5) return error('La Liga necesita exactamente 5 fechas para cerrarse', 409);
  if (Number(linked?.finished ?? 0) !== 5) return error('Las 5 fechas deben estar cerradas antes de finalizar la Liga', 409);

  await env.DB.prepare(
    `UPDATE league_seasons
     SET status = 'finished', finished_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(seasonId).run();

  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id)
     VALUES (?, 'league.finished', 'league_season', ?)`,
  ).bind(user.id, String(seasonId)).run();

  return json({ ok: true, status: 'finished' });
}

async function participantLeague(request: Request, env: Env, user: SessionUser) {
  const requestedRaw = new URL(request.url).searchParams.get('seasonId');
  const requestedId = requestedRaw ? Number(requestedRaw) : null;
  if (requestedRaw && (!Number.isInteger(requestedId) || Number(requestedId) <= 0)) return error('Temporada inválida');

  const season = requestedId
    ? await env.DB.prepare(
      `SELECT s.id, s.name, s.status, s.created_at, s.finished_at
       FROM league_seasons s
       JOIN league_participants lp ON lp.season_id = s.id AND lp.user_id = ?
       WHERE s.id = ? LIMIT 1`,
    ).bind(user.id, requestedId).first<SeasonRow>()
    : await env.DB.prepare(
      `SELECT s.id, s.name, s.status, s.created_at, s.finished_at
       FROM league_seasons s
       JOIN league_participants lp ON lp.season_id = s.id AND lp.user_id = ?
       ORDER BY CASE s.status WHEN 'open' THEN 0 ELSE 1 END, s.id DESC
       LIMIT 1`,
    ).bind(user.id).first<SeasonRow>();

  if (!season) return json({ season: null, seasons: [] });

  const seasonsResult = await env.DB.prepare(
    `SELECT s.id, s.name, s.status, s.finished_at
     FROM league_seasons s
     JOIN league_participants lp ON lp.season_id = s.id AND lp.user_id = ?
     ORDER BY CASE s.status WHEN 'open' THEN 0 ELSE 1 END, s.id DESC`,
  ).bind(user.id).all<{ id: number; name: string; status: string; finished_at: string | null }>();

  return json({
    season: await seasonPayload(env, season, user.id),
    seasons: (seasonsResult.results ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      finishedAt: item.finished_at,
    })),
  });
}

export async function handleLeague(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (!pathname.startsWith('/api/league') && !pathname.startsWith('/api/admin/leagues')) return null;

  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);

  if (pathname === '/api/league' && request.method === 'GET') {
    if (user.role !== 'participant') return error('Acceso de participante requerido', 403);
    return participantLeague(request, env, user);
  }

  if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);

  if (pathname === '/api/admin/leagues' && request.method === 'GET') {
    return adminList(request, env, user);
  }

  if (pathname === '/api/admin/leagues' && request.method === 'POST') {
    return createSeason(request, env, user);
  }

  const roundsMatch = pathname.match(/^\/api\/admin\/leagues\/(\d+)\/rounds$/);
  if (roundsMatch && request.method === 'POST') {
    return linkRound(request, env, user, Number(roundsMatch[1]));
  }

  const unlinkMatch = pathname.match(/^\/api\/admin\/leagues\/(\d+)\/rounds\/(\d+)$/);
  if (unlinkMatch && request.method === 'DELETE') {
    return unlinkRound(env, user, Number(unlinkMatch[1]), Number(unlinkMatch[2]));
  }

  const finishMatch = pathname.match(/^\/api\/admin\/leagues\/(\d+)\/finish$/);
  if (finishMatch && request.method === 'PUT') {
    return finishSeason(env, user, Number(finishMatch[1]));
  }

  return error('Not found', 404);
}
