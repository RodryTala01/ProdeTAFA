type Env = {
  DB: D1Database;
  FOOTBALL_API_KEY?: string;
};

type UserRow = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type FixtureApiResponse = {
  errors?: Record<string, string> | string[];
  response?: ApiFixture[];
};

type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string | null;
    round: string | null;
  };
  teams: {
    home: { id: number; name: string; logo: string | null; winner?: boolean | null };
    away: { id: number; name: string; logo: string | null; winner?: boolean | null };
  };
  goals: { home: number | null; away: number | null };
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

async function requireAdmin(request: Request, env: Env): Promise<UserRow | null> {
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
       AND u.role = 'admin'
     LIMIT 1`,
  ).bind(tokenHash).first<UserRow>();
  return user ?? null;
}

function fixtureToPublic(item: ApiFixture) {
  return {
    providerFixtureId: String(item.fixture.id),
    kickoffAt: item.fixture.date,
    status: item.fixture.status.short,
    statusLong: item.fixture.status.long,
    elapsedMinutes: item.fixture.status.elapsed,
    competition: {
      id: String(item.league.id),
      name: item.league.name,
      country: item.league.country,
      logoUrl: item.league.logo,
      round: item.league.round,
    },
    home: {
      id: String(item.teams.home.id),
      name: item.teams.home.name,
      logoUrl: item.teams.home.logo,
    },
    away: {
      id: String(item.teams.away.id),
      name: item.teams.away.name,
      logoUrl: item.teams.away.logo,
    },
    goals: {
      home: item.goals.home,
      away: item.goals.away,
    },
  };
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function utcDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function dateFromUtc(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function apiErrorMessage(errors: FixtureApiResponse['errors']) {
  if (!errors) return '';
  if (Array.isArray(errors)) return errors.filter(Boolean).join(' · ');
  return Object.entries(errors)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}

async function listRounds(env: Env) {
  const result = await env.DB.prepare(
    `SELECT r.id, r.name, r.status, r.published_at, r.finished_at,
            r.created_at, COUNT(m.id) AS match_count
     FROM rounds r
     LEFT JOIN matches m ON m.round_id = r.id
     GROUP BY r.id
     ORDER BY r.id DESC`,
  ).all<{
    id: number;
    name: string;
    status: string;
    published_at: string | null;
    finished_at: string | null;
    created_at: string;
    match_count: number;
  }>();

  return json({
    rounds: (result.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      publishedAt: row.published_at,
      finishedAt: row.finished_at,
      createdAt: row.created_at,
      matchCount: Number(row.match_count ?? 0),
    })),
  });
}

async function createRound(request: Request, env: Env, admin: UserRow) {
  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = body?.name?.trim() ?? '';
  if (name.length < 2) return error('Ingresá un nombre para la fecha');

  const result = await env.DB.prepare(
    `INSERT INTO rounds (name, status) VALUES (?, 'draft')`,
  ).bind(name).run();

  const id = Number(result.meta.last_row_id);
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, 'round.created', 'round', ?, ?)`,
  ).bind(admin.id, String(id), JSON.stringify({ name })).run();

  return json({ round: { id, name, status: 'draft', matchCount: 0 } }, { status: 201 });
}

async function getRound(env: Env, roundId: number) {
  const round = await env.DB.prepare(
    `SELECT id, name, status, published_at, finished_at, created_at
     FROM rounds WHERE id = ? LIMIT 1`,
  ).bind(roundId).first<{
    id: number;
    name: string;
    status: string;
    published_at: string | null;
    finished_at: string | null;
    created_at: string;
  }>();
  if (!round) return error('Fecha no encontrada', 404);

  const matches = await env.DB.prepare(
    `SELECT id, provider_fixture_id, competition_name, competition_logo_url,
            home_team_provider_id, home_team_name, home_team_logo_url,
            away_team_provider_id, away_team_name, away_team_logo_url,
            kickoff_at, status, elapsed_minutes, match_type,
            home_score_current, away_score_current
     FROM matches
     WHERE round_id = ?
     ORDER BY kickoff_at, id`,
  ).bind(roundId).all<{
    id: number;
    provider_fixture_id: string;
    competition_name: string | null;
    competition_logo_url: string | null;
    home_team_provider_id: string | null;
    home_team_name: string;
    home_team_logo_url: string | null;
    away_team_provider_id: string | null;
    away_team_name: string;
    away_team_logo_url: string | null;
    kickoff_at: string;
    status: string;
    elapsed_minutes: number | null;
    match_type: 'NORMAL' | 'PENALTIES_ONLY';
    home_score_current: number | null;
    away_score_current: number | null;
  }>();

  return json({
    round: {
      id: round.id,
      name: round.name,
      status: round.status,
      publishedAt: round.published_at,
      finishedAt: round.finished_at,
      createdAt: round.created_at,
      matches: (matches.results ?? []).map((match) => ({
        id: match.id,
        providerFixtureId: match.provider_fixture_id,
        competitionName: match.competition_name,
        competitionLogoUrl: match.competition_logo_url,
        home: { id: match.home_team_provider_id, name: match.home_team_name, logoUrl: match.home_team_logo_url },
        away: { id: match.away_team_provider_id, name: match.away_team_name, logoUrl: match.away_team_logo_url },
        kickoffAt: match.kickoff_at,
        status: match.status,
        elapsedMinutes: match.elapsed_minutes,
        matchType: match.match_type,
        goals: { home: match.home_score_current, away: match.away_score_current },
      })),
    },
  });
}

async function fetchFixturesForDate(date: string, env: Env) {
  const endpoint = new URL('https://v3.football.api-sports.io/fixtures');
  endpoint.searchParams.set('date', date);
  endpoint.searchParams.set('timezone', 'America/Argentina/Buenos_Aires');

  const response = await fetch(endpoint.toString(), {
    headers: {
      'x-apisports-key': env.FOOTBALL_API_KEY!,
      accept: 'application/json',
    },
  });

  const data = await response.json().catch(() => null) as FixtureApiResponse | null;
  if (!response.ok || !data) {
    throw new Error(`No se pudo consultar API-Football para ${date}`);
  }

  const details = apiErrorMessage(data.errors);
  if (details) {
    throw new Error(`API-Football (${date}): ${details}`);
  }

  return data.response ?? [];
}

async function searchFixtures(url: URL, env: Env) {
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  if (!validDate(from) || !validDate(to)) return error('Rango inválido. Usá fechas AAAA-MM-DD');

  const fromTime = utcDay(from);
  const toTime = utcDay(to);
  const rangeDays = Math.round((toTime - fromTime) / 86_400_000) + 1;
  if (toTime < fromTime) return error('La fecha Hasta no puede ser anterior a Desde');
  if (rangeDays > 7) return error('La búsqueda puede abarcar como máximo 7 días');
  if (!env.FOOTBALL_API_KEY) return error('Falta configurar FOOTBALL_API_KEY', 503);

  const dates = Array.from({ length: rangeDays }, (_, index) =>
    dateFromUtc(fromTime + index * 86_400_000),
  );

  try {
    const dailyResults = await Promise.all(dates.map((date) => fetchFixturesForDate(date, env)));
    const byId = new Map<number, ApiFixture>();
    for (const day of dailyResults) {
      for (const fixture of day) byId.set(fixture.fixture.id, fixture);
    }

    const fixtures = Array.from(byId.values())
      .map(fixtureToPublic)
      .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));

    return json({
      from,
      to,
      rangeDays,
      requestCount: dates.length,
      fixtures,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'API-Football devolvió un error';
    console.error(caught);
    return error(message, 502);
  }
}

async function addMatch(request: Request, env: Env, admin: UserRow, roundId: number) {
  const round = await env.DB.prepare('SELECT id FROM rounds WHERE id = ? LIMIT 1').bind(roundId).first();
  if (!round) return error('Fecha no encontrada', 404);

  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM matches WHERE round_id = ?')
    .bind(roundId).first<{ total: number }>();
  if (Number(count?.total ?? 0) >= 12) return error('La fecha ya tiene 12 partidos', 409);

  const body = await request.json().catch(() => null) as {
    fixture?: ReturnType<typeof fixtureToPublic>;
    matchType?: 'NORMAL' | 'PENALTIES_ONLY';
  } | null;
  const fixture = body?.fixture;
  if (!fixture?.providerFixtureId || !fixture.home?.name || !fixture.away?.name || !fixture.kickoffAt) {
    return error('Partido inválido');
  }

  const matchType = body?.matchType === 'PENALTIES_ONLY' ? 'PENALTIES_ONLY' : 'NORMAL';

  try {
    const result = await env.DB.prepare(
      `INSERT INTO matches (
        round_id, provider, provider_fixture_id,
        competition_name, competition_logo_url,
        home_team_provider_id, home_team_name, home_team_logo_url,
        away_team_provider_id, away_team_name, away_team_logo_url,
        kickoff_at, status, elapsed_minutes, match_type,
        home_score_current, away_score_current, last_synced_at
      ) VALUES (?, 'api-football', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).bind(
      roundId,
      fixture.providerFixtureId,
      fixture.competition?.name ?? null,
      fixture.competition?.logoUrl ?? null,
      fixture.home.id ?? null,
      fixture.home.name,
      fixture.home.logoUrl ?? null,
      fixture.away.id ?? null,
      fixture.away.name,
      fixture.away.logoUrl ?? null,
      fixture.kickoffAt,
      fixture.status ?? 'NS',
      fixture.elapsedMinutes ?? null,
      matchType,
      fixture.goals?.home ?? null,
      fixture.goals?.away ?? null,
    ).run();

    const id = Number(result.meta.last_row_id);
    await env.DB.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
       VALUES (?, 'match.added', 'match', ?, ?)`,
    ).bind(admin.id, String(id), JSON.stringify({ roundId, providerFixtureId: fixture.providerFixtureId })).run();

    return json({ ok: true, matchId: id }, { status: 201 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : '';
    if (message.includes('UNIQUE')) return error('Ese partido ya está agregado a la fecha', 409);
    throw caught;
  }
}

async function removeMatch(env: Env, admin: UserRow, roundId: number, matchId: number) {
  const target = await env.DB.prepare(
    'SELECT id FROM matches WHERE id = ? AND round_id = ? LIMIT 1',
  ).bind(matchId, roundId).first();
  if (!target) return error('Partido no encontrado', 404);

  await env.DB.prepare('DELETE FROM matches WHERE id = ? AND round_id = ?').bind(matchId, roundId).run();
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, 'match.removed', 'match', ?, ?)`,
  ).bind(admin.id, String(matchId), JSON.stringify({ roundId })).run();
  return json({ ok: true });
}

export async function handleAdminRounds(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/admin/rounds') && pathname !== '/api/admin/fixtures') return null;

  const admin = await requireAdmin(request, env);
  if (!admin) return error('Acceso de administrador requerido', 403);

  if (pathname === '/api/admin/fixtures' && request.method === 'GET') {
    return searchFixtures(url, env);
  }

  if (pathname === '/api/admin/rounds' && request.method === 'GET') {
    return listRounds(env);
  }

  if (pathname === '/api/admin/rounds' && request.method === 'POST') {
    return createRound(request, env, admin);
  }

  const roundMatch = pathname.match(/^\/api\/admin\/rounds\/(\d+)$/);
  if (roundMatch && request.method === 'GET') {
    return getRound(env, Number(roundMatch[1]));
  }

  const addMatchRoute = pathname.match(/^\/api\/admin\/rounds\/(\d+)\/matches$/);
  if (addMatchRoute && request.method === 'POST') {
    return addMatch(request, env, admin, Number(addMatchRoute[1]));
  }

  const removeMatchRoute = pathname.match(/^\/api\/admin\/rounds\/(\d+)\/matches\/(\d+)$/);
  if (removeMatchRoute && request.method === 'DELETE') {
    return removeMatch(env, admin, Number(removeMatchRoute[1]), Number(removeMatchRoute[2]));
  }

  return error('Not found', 404);
}
