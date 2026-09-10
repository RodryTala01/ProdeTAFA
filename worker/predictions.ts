type Env = {
  DB: D1Database;
};

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type MatchRow = {
  id: number;
  round_id: number;
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
  match_type: 'NORMAL' | 'PENALTIES_ONLY';
  home_score_current: number | null;
  away_score_current: number | null;
  home_score_regulation: number | null;
  away_score_regulation: number | null;
  winning_team_provider_id: string | null;
  went_to_penalties: number;
  is_void: number;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_extra_team_provider_id: string | null;
  score_base_points: number | null;
  score_extra_points: number | null;
  score_total_points: number | null;
  score_result_type: string | null;
  score_is_provisional: number | null;
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

function lockTime(kickoffAt: string) {
  return new Date(kickoffAt).getTime() + 60_000;
}

function isLocked(kickoffAt: string) {
  return Date.now() >= lockTime(kickoffAt);
}

function nullableScore(value: unknown) {
  if (value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 99) {
    throw new Error('Los goles deben ser números enteros entre 0 y 99');
  }
  return value;
}

async function publishRound(request: Request, env: Env, roundId: number) {
  const user = await sessionUser(request, env);
  if (!user || user.role !== 'admin') return error('Acceso de administrador requerido', 403);

  const round = await env.DB.prepare('SELECT id, status FROM rounds WHERE id = ? LIMIT 1')
    .bind(roundId)
    .first<{ id: number; status: string }>();
  if (!round) return error('Fecha no encontrada', 404);
  if (round.status === 'open') return json({ ok: true, status: 'open' });
  if (round.status !== 'draft') return error('Esta fecha ya no puede publicarse', 409);

  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM matches WHERE round_id = ?')
    .bind(roundId)
    .first<{ total: number }>();
  if (Number(count?.total ?? 0) !== 12) return error('La fecha debe tener exactamente 12 partidos para publicarse', 409);

  await env.DB.prepare(
    `UPDATE rounds
     SET status = 'open', published_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(roundId).run();

  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id)
     VALUES (?, 'round.published', 'round', ?)`,
  ).bind(user.id, String(roundId)).run();

  return json({ ok: true, status: 'open' });
}

async function getParticipantRound(request: Request, env: Env) {
  const user = await sessionUser(request, env);
  if (!user || user.role !== 'participant') return error('Acceso de participante requerido', 403);

  const round = await env.DB.prepare(
    `SELECT id, name, status, published_at
     FROM rounds
     WHERE status IN ('open', 'finished')
     ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, id DESC
     LIMIT 1`,
  ).first<{ id: number; name: string; status: string; published_at: string | null }>();

  if (!round) return json({ round: null });

  const matches = await env.DB.prepare(
    `SELECT m.id, m.round_id, m.competition_name, m.competition_logo_url,
            m.home_team_provider_id, m.home_team_name, m.home_team_logo_url,
            m.away_team_provider_id, m.away_team_name, m.away_team_logo_url,
            m.kickoff_at, m.status, m.match_type,
            m.home_score_current, m.away_score_current,
            m.home_score_regulation, m.away_score_regulation,
            m.winning_team_provider_id, m.went_to_penalties, m.is_void,
            p.predicted_home_score, p.predicted_away_score,
            p.predicted_extra_team_provider_id,
            ps.base_points AS score_base_points,
            ps.extra_points AS score_extra_points,
            ps.total_points AS score_total_points,
            ps.result_type AS score_result_type,
            ps.is_provisional AS score_is_provisional
     FROM matches m
     LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = ?
     LEFT JOIN prediction_scores ps ON ps.prediction_id = p.id
     WHERE m.round_id = ?
     ORDER BY m.kickoff_at, m.id`,
  ).bind(user.id, round.id).all<MatchRow>();

  const submission = await env.DB.prepare(
    `SELECT first_submitted_at, last_submitted_at, submission_count
     FROM round_submissions
     WHERE round_id = ? AND user_id = ?
     LIMIT 1`,
  ).bind(round.id, user.id).first<{
    first_submitted_at: string;
    last_submitted_at: string;
    submission_count: number;
  }>();

  const resultRows = matches.results ?? [];
  const now = Date.now();
  const pointsTotal = resultRows.reduce((total, match) => total + Number(match.score_total_points ?? 0), 0);

  return json({
    round: {
      id: round.id,
      name: round.name,
      status: round.status,
      publishedAt: round.published_at,
      submitted: Boolean(submission),
      lastSubmittedAt: submission?.last_submitted_at ?? null,
      submissionCount: Number(submission?.submission_count ?? 0),
      pointsTotal,
      serverNow: new Date(now).toISOString(),
      matches: resultRows.map((match) => ({
        id: match.id,
        competitionName: match.competition_name,
        competitionLogoUrl: match.competition_logo_url,
        kickoffAt: match.kickoff_at,
        lockedAt: new Date(lockTime(match.kickoff_at)).toISOString(),
        isLocked: round.status === 'finished' || now >= lockTime(match.kickoff_at),
        status: match.status,
        matchType: match.match_type,
        home: {
          id: match.home_team_provider_id,
          name: match.home_team_name,
          logoUrl: match.home_team_logo_url,
        },
        away: {
          id: match.away_team_provider_id,
          name: match.away_team_name,
          logoUrl: match.away_team_logo_url,
        },
        prediction: {
          homeScore: match.predicted_home_score,
          awayScore: match.predicted_away_score,
          extraTeamId: match.predicted_extra_team_provider_id,
        },
        result: {
          homeCurrent: match.home_score_current,
          awayCurrent: match.away_score_current,
          homeRegulation: match.home_score_regulation,
          awayRegulation: match.away_score_regulation,
          winningTeamId: match.winning_team_provider_id,
          wentToPenalties: Boolean(match.went_to_penalties),
          isVoid: Boolean(match.is_void),
        },
        score: match.score_total_points === null ? null : {
          points: match.score_total_points,
          basePoints: Number(match.score_base_points ?? 0),
          extraPoints: Number(match.score_extra_points ?? 0),
          resultType: match.score_result_type,
          provisional: Boolean(match.score_is_provisional),
        },
      })),
    },
  });
}

async function savePrediction(request: Request, env: Env, matchId: number) {
  const user = await sessionUser(request, env);
  if (!user || user.role !== 'participant') return error('Acceso de participante requerido', 403);

  const match = await env.DB.prepare(
    `SELECT m.id, m.round_id, m.kickoff_at, m.match_type,
            m.home_team_provider_id, m.away_team_provider_id, r.status AS round_status
     FROM matches m
     JOIN rounds r ON r.id = m.round_id
     WHERE m.id = ?
     LIMIT 1`,
  ).bind(matchId).first<{
    id: number;
    round_id: number;
    kickoff_at: string;
    match_type: 'NORMAL' | 'PENALTIES_ONLY';
    home_team_provider_id: string | null;
    away_team_provider_id: string | null;
    round_status: string;
  }>();

  if (!match || match.round_status !== 'open') return error('El partido no pertenece a una fecha abierta', 404);
  if (isLocked(match.kickoff_at)) return error('Este partido ya cerró', 409);

  const body = await request.json().catch(() => null) as {
    homeScore?: number | null;
    awayScore?: number | null;
    extraTeamId?: string | null;
  } | null;
  if (!body) return error('Pronóstico inválido');

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let extraTeamId: string | null = null;

  try {
    homeScore = nullableScore(body.homeScore ?? null);
    awayScore = nullableScore(body.awayScore ?? null);

    if (body.extraTeamId) {
      if (body.extraTeamId !== match.home_team_provider_id && body.extraTeamId !== match.away_team_provider_id) {
        return error(match.match_type === 'PENALTIES_ONLY' ? 'Equipo elegido para penales inválido' : 'Equipo extra inválido');
      }
      extraTeamId = body.extraTeamId;
    }
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'Pronóstico inválido');
  }

  await env.DB.prepare(
    `INSERT INTO predictions (
       user_id, match_id, predicted_home_score, predicted_away_score,
       predicted_extra_team_provider_id, updated_at
     ) VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, match_id) DO UPDATE SET
       predicted_home_score = excluded.predicted_home_score,
       predicted_away_score = excluded.predicted_away_score,
       predicted_extra_team_provider_id = excluded.predicted_extra_team_provider_id,
       updated_at = datetime('now')`,
  ).bind(user.id, matchId, homeScore, awayScore, extraTeamId).run();

  return json({ ok: true, savedAt: new Date().toISOString() });
}

async function submitRound(request: Request, env: Env, roundId: number) {
  const user = await sessionUser(request, env);
  if (!user || user.role !== 'participant') return error('Acceso de participante requerido', 403);

  const round = await env.DB.prepare('SELECT id, status FROM rounds WHERE id = ? LIMIT 1')
    .bind(roundId)
    .first<{ id: number; status: string }>();
  if (!round || round.status !== 'open') return error('La fecha no está abierta', 409);

  const rows = await env.DB.prepare(
    `SELECT m.id, m.kickoff_at, m.match_type,
            p.predicted_home_score, p.predicted_away_score,
            p.predicted_extra_team_provider_id
     FROM matches m
     LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = ?
     WHERE m.round_id = ?
     ORDER BY m.kickoff_at, m.id`,
  ).bind(user.id, roundId).all<{
    id: number;
    kickoff_at: string;
    match_type: 'NORMAL' | 'PENALTIES_ONLY';
    predicted_home_score: number | null;
    predicted_away_score: number | null;
    predicted_extra_team_provider_id: string | null;
  }>();

  const missing: number[] = [];
  let openCount = 0;
  for (const match of rows.results ?? []) {
    if (isLocked(match.kickoff_at)) continue;
    openCount += 1;

    const hasScore = match.predicted_home_score !== null && match.predicted_away_score !== null;
    const complete = match.match_type === 'PENALTIES_ONLY'
      ? hasScore && Boolean(match.predicted_extra_team_provider_id)
      : hasScore;

    if (!complete) missing.push(match.id);
  }

  if (missing.length > 0) {
    return error(`Faltan completar ${missing.length} partido${missing.length === 1 ? '' : 's'} todavía abierto${missing.length === 1 ? '' : 's'}`, 409);
  }
  if (openCount === 0) return error('No quedan partidos abiertos para enviar', 409);

  await env.DB.prepare(
    `INSERT INTO round_submissions (
       round_id, user_id, first_submitted_at, last_submitted_at, submission_count
     ) VALUES (?, ?, datetime('now'), datetime('now'), 1)
     ON CONFLICT(round_id, user_id) DO UPDATE SET
       last_submitted_at = datetime('now'),
       submission_count = submission_count + 1`,
  ).bind(roundId, user.id).run();

  const submission = await env.DB.prepare(
    `SELECT last_submitted_at, submission_count
     FROM round_submissions
     WHERE round_id = ? AND user_id = ?`,
  ).bind(roundId, user.id).first<{ last_submitted_at: string; submission_count: number }>();

  return json({
    ok: true,
    lastSubmittedAt: submission?.last_submitted_at ?? null,
    submissionCount: Number(submission?.submission_count ?? 1),
  });
}

export async function handlePredictions(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const publishMatch = pathname.match(/^\/api\/admin\/publish-round\/(\d+)$/);
  if (publishMatch && request.method === 'PUT') {
    return publishRound(request, env, Number(publishMatch[1]));
  }

  if (!pathname.startsWith('/api/participant/')) return null;

  if (pathname === '/api/participant/round' && request.method === 'GET') {
    return getParticipantRound(request, env);
  }

  const predictionMatch = pathname.match(/^\/api\/participant\/predictions\/(\d+)$/);
  if (predictionMatch && request.method === 'PUT') {
    return savePrediction(request, env, Number(predictionMatch[1]));
  }

  const submitMatch = pathname.match(/^\/api\/participant\/rounds\/(\d+)\/submit$/);
  if (submitMatch && request.method === 'POST') {
    return submitRound(request, env, Number(submitMatch[1]));
  }

  return error('Not found', 404);
}
