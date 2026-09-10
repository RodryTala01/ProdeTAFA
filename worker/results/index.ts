type Env = {
  DB: D1Database;
  FOOTBALL_API_KEY?: string;
};

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type ScoreSide = { home: number | null; away: number | null } | null;
type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
  };
  teams: {
    home: { id: number; winner?: boolean | null };
    away: { id: number; winner?: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    fulltime: ScoreSide;
    extratime: ScoreSide;
    penalty: ScoreSide;
  };
};
type FixtureResponse = { errors?: Record<string, string> | string[]; response?: ApiFixture[] };

type StoredMatch = {
  id: number;
  provider_fixture_id: string;
  kickoff_at: string;
  status: string;
  result_finalized_at: string | null;
};

type PredictionRow = {
  prediction_id: number;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_extra_team_provider_id: string | null;
  match_type: 'NORMAL' | 'PENALTIES_ONLY';
  status: string;
  home_score_current: number | null;
  away_score_current: number | null;
  home_score_regulation: number | null;
  away_score_regulation: number | null;
  winning_team_provider_id: string | null;
  went_to_penalties: number;
  is_void: number;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();
const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN']);
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);
const VOID_STATUSES = new Set(['CANC', 'ABD', 'AWD', 'WO']);
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

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
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND julianday(s.expires_at) > julianday('now')
       AND u.is_active = 1 LIMIT 1`,
  ).bind(tokenHash).first<SessionUser>();
  return user ?? null;
}

function apiErrors(errors: FixtureResponse['errors']) {
  if (!errors) return '';
  if (Array.isArray(errors)) return errors.filter(Boolean).join(' · ');
  return Object.entries(errors).map(([key, value]) => `${key}: ${value}`).join(' · ');
}

function sign(home: number, away: number) {
  return home === away ? 0 : home > away ? 1 : -1;
}

function hasScore(side: ScoreSide) {
  return Boolean(side && (side.home !== null || side.away !== null));
}

function calendarDateInArgentina(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: 'year' | 'month' | 'day') => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function overallWinner(item: ApiFixture) {
  if (item.teams.home.winner === true) return String(item.teams.home.id);
  if (item.teams.away.winner === true) return String(item.teams.away.id);
  if (item.goals.home !== null && item.goals.away !== null && item.goals.home !== item.goals.away) {
    return item.goals.home > item.goals.away ? String(item.teams.home.id) : String(item.teams.away.id);
  }
  return null;
}

async function fetchFixturesForDate(date: string, env: Env) {
  const endpoint = new URL('https://v3.football.api-sports.io/fixtures');
  endpoint.searchParams.set('date', date);
  endpoint.searchParams.set('timezone', ARGENTINA_TIMEZONE);

  const response = await fetch(endpoint.toString(), {
    headers: { 'x-apisports-key': env.FOOTBALL_API_KEY!, accept: 'application/json' },
  });
  const data = await response.json().catch(() => null) as FixtureResponse | null;
  if (!response.ok || !data) throw new Error(`No se pudo consultar API-Football para ${date}`);
  const details = apiErrors(data.errors);
  if (details) throw new Error(`API-Football (${date}): ${details}`);
  return data.response ?? [];
}

async function calculateScores(roundId: number, env: Env) {
  const rows = await env.DB.prepare(
    `SELECT p.id AS prediction_id, p.predicted_home_score, p.predicted_away_score,
            p.predicted_extra_team_provider_id, m.match_type, m.status,
            m.home_score_current, m.away_score_current,
            m.home_score_regulation, m.away_score_regulation,
            m.winning_team_provider_id, m.went_to_penalties, m.is_void
     FROM predictions p
     JOIN matches m ON m.id = p.match_id
     WHERE m.round_id = ?`,
  ).bind(roundId).all<PredictionRow>();

  let calculated = 0;
  for (const row of rows.results ?? []) {
    if (row.is_void) {
      await env.DB.prepare(
        `INSERT INTO prediction_scores
          (prediction_id, result_type, base_points, extra_points, total_points, is_provisional, calculated_at)
         VALUES (?, 'VOID', 0, 0, 0, 0, datetime('now'))
         ON CONFLICT(prediction_id) DO UPDATE SET
          result_type='VOID', base_points=0, extra_points=0, total_points=0,
          is_provisional=0, calculated_at=datetime('now')`,
      ).bind(row.prediction_id).run();
      calculated += 1;
      continue;
    }

    const final = FINAL_STATUSES.has(row.status);
    const live = LIVE_STATUSES.has(row.status);
    if (!final && !live) continue;

    const actualHome = row.home_score_regulation ?? row.home_score_current;
    const actualAway = row.away_score_regulation ?? row.away_score_current;
    if (actualHome === null || actualAway === null || row.predicted_home_score === null || row.predicted_away_score === null) continue;

    let basePoints = 0;
    let resultType: 'FULL' | 'PARTIAL' | 'ERROR' | 'PENALTIES' = 'ERROR';
    if (row.predicted_home_score === actualHome && row.predicted_away_score === actualAway) {
      basePoints = 3;
      resultType = 'FULL';
    } else if (sign(row.predicted_home_score, row.predicted_away_score) === sign(actualHome, actualAway)) {
      basePoints = 1;
      resultType = 'PARTIAL';
    }

    let extraPoints = 0;
    if (
      final && row.match_type === 'PENALTIES_ONLY' && row.went_to_penalties === 1 &&
      row.predicted_extra_team_provider_id &&
      row.predicted_extra_team_provider_id === row.winning_team_provider_id
    ) {
      extraPoints = 1;
      if (basePoints === 0) resultType = 'PENALTIES';
    }

    await env.DB.prepare(
      `INSERT INTO prediction_scores
        (prediction_id, result_type, base_points, extra_points, total_points, is_provisional, calculated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(prediction_id) DO UPDATE SET
        result_type=excluded.result_type, base_points=excluded.base_points,
        extra_points=excluded.extra_points, total_points=excluded.total_points,
        is_provisional=excluded.is_provisional, calculated_at=datetime('now')`,
    ).bind(
      row.prediction_id,
      resultType,
      basePoints,
      extraPoints,
      basePoints + extraPoints,
      final ? 0 : 1,
    ).run();
    calculated += 1;
  }

  return calculated;
}

async function applyFixture(item: ApiFixture, matchId: number, env: Env) {
  const status = item.fixture.status.short;
  const final = FINAL_STATUSES.has(status);
  const isVoid = VOID_STATUSES.has(status);
  const fulltime = item.score?.fulltime ?? null;
  const currentHome = item.goals?.home ?? null;
  const currentAway = item.goals?.away ?? null;
  const regulationHome = fulltime?.home ?? (status === 'FT' ? currentHome : null);
  const regulationAway = fulltime?.away ?? (status === 'FT' ? currentAway : null);
  const wentToExtra = ['ET', 'BT', 'P', 'AET', 'PEN'].includes(status) || hasScore(item.score?.extratime ?? null);
  const wentToPenalties = ['P', 'PEN'].includes(status) || hasScore(item.score?.penalty ?? null);
  const winner = overallWinner(item);

  await env.DB.prepare(
    `UPDATE matches SET
      kickoff_at = ?, status = ?, elapsed_minutes = ?,
      home_score_current = ?, away_score_current = ?,
      home_score_regulation = COALESCE(?, home_score_regulation),
      away_score_regulation = COALESCE(?, away_score_regulation),
      winning_team_provider_id = ?, qualified_team_provider_id = ?,
      went_to_extra_time = ?, went_to_penalties = ?, is_void = ?,
      result_finalized_at = CASE WHEN ? = 1 THEN COALESCE(result_finalized_at, datetime('now')) ELSE NULL END,
      last_synced_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(
    item.fixture.date,
    status,
    item.fixture.status.elapsed,
    currentHome,
    currentAway,
    regulationHome,
    regulationAway,
    winner,
    winner,
    wentToExtra ? 1 : 0,
    wentToPenalties ? 1 : 0,
    isVoid ? 1 : 0,
    final || isVoid ? 1 : 0,
    matchId,
  ).run();

  return { finalized: final || isVoid };
}

export async function syncRoundResults(roundId: number, env: Env, onlyDates?: string[]) {
  if (!env.FOOTBALL_API_KEY) throw new Error('Falta configurar FOOTBALL_API_KEY');

  const rows = await env.DB.prepare(
    `SELECT id, provider_fixture_id, kickoff_at, status, result_finalized_at
     FROM matches
     WHERE round_id = ? AND provider = 'api-football'
     ORDER BY kickoff_at, id`,
  ).bind(roundId).all<StoredMatch>();

  const matches = rows.results ?? [];
  if (matches.length === 0) throw new Error('La fecha no tiene partidos de API-Football');

  const localByFixture = new Map(matches.map((match) => [match.provider_fixture_id, match]));
  const requestedDates = onlyDates?.length
    ? Array.from(new Set(onlyDates))
    : Array.from(new Set(matches.map((match) => calendarDateInArgentina(match.kickoff_at))));

  let updated = 0;
  let finalized = 0;
  let requestCount = 0;

  for (const date of requestedDates) {
    const fixtures = await fetchFixturesForDate(date, env);
    requestCount += 1;

    for (const item of fixtures) {
      const local = localByFixture.get(String(item.fixture.id));
      if (!local) continue;
      const applied = await applyFixture(item, local.id, env);
      updated += 1;
      if (applied.finalized) finalized += 1;
    }
  }

  const calculated = await calculateScores(roundId, env);
  return { updated, finalized, calculated, requestCount, dates: requestedDates };
}

export async function syncEligibleRounds(env: Env) {
  if (!env.FOOTBALL_API_KEY) return;

  const eligible = await env.DB.prepare(
    `SELECT round_id, kickoff_at
     FROM matches
     WHERE result_finalized_at IS NULL
       AND round_id IN (SELECT id FROM rounds WHERE status = 'open')
       AND (
         status IN ('1H','HT','2H','ET','BT','P','LIVE') OR
         (julianday(kickoff_at) <= julianday('now', '+10 minutes')
          AND julianday(kickoff_at) >= julianday('now', '-4 hours'))
       )
     ORDER BY round_id, kickoff_at`,
  ).all<{ round_id: number; kickoff_at: string }>();

  const datesByRound = new Map<number, Set<string>>();
  for (const row of eligible.results ?? []) {
    const dates = datesByRound.get(row.round_id) ?? new Set<string>();
    dates.add(calendarDateInArgentina(row.kickoff_at));
    datesByRound.set(row.round_id, dates);
  }

  for (const [roundId, dates] of datesByRound) {
    try {
      await syncRoundResults(roundId, env, Array.from(dates));
    } catch (caught) {
      console.error('Scheduled result sync failed', roundId, caught);
    }
  }
}

export async function handleResults(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/admin\/sync-round\/(\d+)$/);
  if (!match) return null;
  if (request.method !== 'POST') return error('Método no permitido', 405);

  const user = await sessionUser(request, env);
  if (!user || user.role !== 'admin') return error('Acceso de administrador requerido', 403);

  try {
    const roundId = Number(match[1]);
    const result = await syncRoundResults(roundId, env);
    await env.DB.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
       VALUES (?, 'round.results_synced', 'round', ?, ?)`,
    ).bind(user.id, String(roundId), JSON.stringify(result)).run();
    return json({ ok: true, ...result });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'No se pudieron actualizar los resultados';
    return error(message, 502);
  }
}
