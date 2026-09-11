import { recalculateRoundScores } from './scoring';

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
  provider: string;
  provider_fixture_id: string;
  competition_name: string | null;
  home_team_provider_id: string | null;
  home_team_name: string;
  away_team_provider_id: string | null;
  away_team_name: string;
  kickoff_at: string;
  status: string;
  match_type: 'NORMAL' | 'PENALTIES_ONLY';
  home_score_regulation: number | null;
  away_score_regulation: number | null;
  winning_team_provider_id: string | null;
  went_to_penalties: number;
  is_void: number;
};

type PredictionRow = {
  id: number;
  user_id: string;
  match_id: number;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_extra_team_provider_id: string | null;
  is_admin_override: number;
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

async function requireAdmin(request: Request, env: Env) {
  const user = await sessionUser(request, env);
  if (!user) return { user: null, response: error('No autorizado', 401) };
  if (user.role !== 'admin') return { user: null, response: error('Acceso de administrador requerido', 403) };
  return { user, response: null };
}

function scoreValue(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 99) {
    throw new Error('Los goles deben ser números enteros entre 0 y 99');
  }
  return value;
}

function reasonValue(value: unknown) {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < 3) throw new Error('Indicá un motivo para dejar registro de la corrección');
  return reason.slice(0, 500);
}

function validateTeam(teamId: string | null | undefined, match: MatchRow) {
  if (!teamId || (teamId !== match.home_team_provider_id && teamId !== match.away_team_provider_id)) {
    throw new Error('Elegí correctamente un equipo');
  }
  return teamId;
}

async function getRoundMatches(roundId: number, env: Env) {
  const result = await env.DB.prepare(
    `SELECT id, round_id, provider, provider_fixture_id, competition_name,
            home_team_provider_id, home_team_name,
            away_team_provider_id, away_team_name,
            kickoff_at, status, match_type,
            home_score_regulation, away_score_regulation,
            winning_team_provider_id, went_to_penalties, is_void
     FROM matches
     WHERE round_id = ?
     ORDER BY kickoff_at, id`,
  ).bind(roundId).all<MatchRow>();
  return result.results ?? [];
}

async function getCorrectionsData(request: Request, env: Env, roundId: number) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const round = await env.DB.prepare(
    `SELECT id, name, status FROM rounds WHERE id = ? LIMIT 1`,
  ).bind(roundId).first<{ id: number; name: string; status: string }>();
  if (!round) return error('Fecha no encontrada', 404);

  const matches = await getRoundMatches(roundId, env);
  const participantsResult = await env.DB.prepare(
    `SELECT id, full_name
     FROM users
     WHERE role = 'participant' AND is_active = 1
     ORDER BY full_name COLLATE NOCASE`,
  ).all<{ id: string; full_name: string }>();

  const predictionsResult = await env.DB.prepare(
    `SELECT p.id, p.user_id, p.match_id,
            p.predicted_home_score, p.predicted_away_score,
            p.predicted_extra_team_provider_id, p.is_admin_override
     FROM predictions p
     JOIN matches m ON m.id = p.match_id
     WHERE m.round_id = ?`,
  ).bind(roundId).all<PredictionRow>();

  const predictionByUser = new Map<string, PredictionRow[]>();
  for (const prediction of predictionsResult.results ?? []) {
    const list = predictionByUser.get(prediction.user_id) ?? [];
    list.push(prediction);
    predictionByUser.set(prediction.user_id, list);
  }

  const auditResult = await env.DB.prepare(
    `SELECT a.id, a.action, a.entity_type, a.entity_id,
            a.before_json, a.after_json, a.created_at,
            u.full_name AS actor_name
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.actor_user_id
     WHERE (
       a.entity_type = 'match'
       AND a.entity_id IN (SELECT CAST(id AS TEXT) FROM matches WHERE round_id = ?)
     ) OR (
       a.entity_type = 'prediction'
       AND a.entity_id IN (
         SELECT CAST(p.id AS TEXT)
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
         WHERE m.round_id = ?
       )
     )
     ORDER BY a.id DESC
     LIMIT 50`,
  ).bind(roundId, roundId).all<{
    id: number;
    action: string;
    entity_type: string;
    entity_id: string;
    before_json: string | null;
    after_json: string | null;
    created_at: string;
    actor_name: string | null;
  }>();

  return json({
    round,
    matches: matches.map((match) => ({
      id: match.id,
      providerFixtureId: match.provider_fixture_id,
      competitionName: match.competition_name,
      kickoffAt: match.kickoff_at,
      status: match.status,
      matchType: match.match_type,
      manualResult: match.provider === 'manual',
      home: { id: match.home_team_provider_id, name: match.home_team_name },
      away: { id: match.away_team_provider_id, name: match.away_team_name },
      result: {
        homeScore: match.home_score_regulation,
        awayScore: match.away_score_regulation,
        winningTeamId: match.winning_team_provider_id,
        wentToPenalties: Boolean(match.went_to_penalties),
        isVoid: Boolean(match.is_void),
      },
    })),
    participants: (participantsResult.results ?? []).map((participant) => ({
      id: participant.id,
      fullName: participant.full_name,
      predictions: (predictionByUser.get(participant.id) ?? []).map((prediction) => ({
        id: prediction.id,
        matchId: prediction.match_id,
        homeScore: prediction.predicted_home_score,
        awayScore: prediction.predicted_away_score,
        extraTeamId: prediction.predicted_extra_team_provider_id,
        adminOverride: Boolean(prediction.is_admin_override),
      })),
    })),
    audit: (auditResult.results ?? []).map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      before: entry.before_json ? JSON.parse(entry.before_json) : null,
      after: entry.after_json ? JSON.parse(entry.after_json) : null,
      actorName: entry.actor_name,
      createdAt: entry.created_at,
    })),
  });
}

async function overrideResult(request: Request, env: Env, matchId: number) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const match = await env.DB.prepare(
    `SELECT m.id, m.round_id, m.provider, m.provider_fixture_id, m.status, m.match_type,
            m.home_team_provider_id, m.home_team_name,
            m.away_team_provider_id, m.away_team_name,
            m.home_score_regulation, m.away_score_regulation,
            m.winning_team_provider_id, m.went_to_penalties, m.is_void,
            r.status AS round_status
     FROM matches m JOIN rounds r ON r.id = m.round_id
     WHERE m.id = ? LIMIT 1`,
  ).bind(matchId).first<MatchRow & { round_status: string }>();

  if (!match) return error('Partido no encontrado', 404);
  if (match.round_status === 'draft') return error('Publicá la fecha antes de corregir resultados', 409);

  const body = await request.json().catch(() => null) as {
    homeScore?: number;
    awayScore?: number;
    wentToPenalties?: boolean;
    winningTeamId?: string | null;
    isVoid?: boolean;
    reason?: string;
  } | null;
  if (!body) return error('Datos inválidos');

  let reason: string;
  try {
    reason = reasonValue(body.reason);
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'Motivo inválido');
  }

  const before = {
    provider: match.provider,
    status: match.status,
    homeScore: match.home_score_regulation,
    awayScore: match.away_score_regulation,
    winningTeamId: match.winning_team_provider_id,
    wentToPenalties: Boolean(match.went_to_penalties),
    isVoid: Boolean(match.is_void),
  };

  const isVoid = Boolean(body.isVoid);
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let wentToPenalties = false;
  let winningTeamId: string | null = null;
  let status = 'CANC';

  if (!isVoid) {
    if (match.match_type === 'PENALTIES_ONLY') {
      try {
        winningTeamId = validateTeam(body.winningTeamId, match);
      } catch (caught) {
        return error(caught instanceof Error ? caught.message : 'Equipo inválido');
      }
      wentToPenalties = true;
      status = 'PEN';
    } else {
      try {
        homeScore = scoreValue(body.homeScore);
        awayScore = scoreValue(body.awayScore);
      } catch (caught) {
        return error(caught instanceof Error ? caught.message : 'Resultado inválido');
      }

      wentToPenalties = Boolean(body.wentToPenalties);
      if (wentToPenalties) {
        try {
          winningTeamId = validateTeam(body.winningTeamId, match);
        } catch (caught) {
          return error(caught instanceof Error ? caught.message : 'Equipo inválido');
        }
        status = 'PEN';
      } else {
        winningTeamId = homeScore === awayScore
          ? null
          : homeScore > awayScore
            ? match.home_team_provider_id
            : match.away_team_provider_id;
        status = 'FT';
      }
    }
  }

  await env.DB.prepare(
    `UPDATE matches SET
       provider = 'manual', status = ?, elapsed_minutes = NULL,
       home_score_current = ?, away_score_current = ?,
       home_score_regulation = ?, away_score_regulation = ?,
       winning_team_provider_id = ?, qualified_team_provider_id = ?,
       went_to_extra_time = ?, went_to_penalties = ?, is_void = ?,
       result_finalized_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(
    status,
    homeScore,
    awayScore,
    homeScore,
    awayScore,
    winningTeamId,
    winningTeamId,
    match.match_type === 'NORMAL' && wentToPenalties ? 1 : 0,
    wentToPenalties ? 1 : 0,
    isVoid ? 1 : 0,
    matchId,
  ).run();

  const calculated = await recalculateRoundScores(match.round_id, env);
  const after = {
    roundId: match.round_id,
    reason,
    provider: 'manual',
    status,
    homeScore,
    awayScore,
    winningTeamId,
    wentToPenalties,
    isVoid,
    calculated,
  };

  await env.DB.prepare(
    `INSERT INTO audit_log
      (actor_user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, 'match.result_override', 'match', ?, ?, ?)`,
  ).bind(auth.user!.id, String(matchId), JSON.stringify(before), JSON.stringify(after)).run();

  return json({ ok: true, calculated, result: after });
}

async function resetManualResult(request: Request, env: Env, matchId: number) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const match = await env.DB.prepare(
    `SELECT id, round_id, provider, provider_fixture_id, status,
            home_score_regulation, away_score_regulation,
            winning_team_provider_id, went_to_penalties, is_void
     FROM matches WHERE id = ? LIMIT 1`,
  ).bind(matchId).first<MatchRow>();
  if (!match) return error('Partido no encontrado', 404);
  if (match.provider !== 'manual') return error('Este partido no tiene una corrección manual activa', 409);

  const body = await request.json().catch(() => null) as { reason?: string } | null;
  let reason: string;
  try {
    reason = reasonValue(body?.reason);
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'Motivo inválido');
  }

  const before = {
    provider: match.provider,
    status: match.status,
    homeScore: match.home_score_regulation,
    awayScore: match.away_score_regulation,
    winningTeamId: match.winning_team_provider_id,
    wentToPenalties: Boolean(match.went_to_penalties),
    isVoid: Boolean(match.is_void),
  };

  await env.DB.prepare(
    `UPDATE matches SET
       provider = 'api-football',
       result_finalized_at = NULL,
       updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(matchId).run();

  await env.DB.prepare(
    `INSERT INTO audit_log
      (actor_user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, 'match.result_override_reset', 'match', ?, ?, ?)`,
  ).bind(
    auth.user!.id,
    String(matchId),
    JSON.stringify(before),
    JSON.stringify({ roundId: match.round_id, reason, provider: 'api-football' }),
  ).run();

  return json({ ok: true, message: 'Corrección manual desactivada. Actualizá resultados para recuperar el dato oficial.' });
}

async function overridePrediction(
  request: Request,
  env: Env,
  roundId: number,
  userId: string,
  matchId: number,
) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const match = await env.DB.prepare(
    `SELECT id, round_id, match_type,
            home_team_provider_id, away_team_provider_id
     FROM matches WHERE id = ? AND round_id = ? LIMIT 1`,
  ).bind(matchId, roundId).first<{
    id: number;
    round_id: number;
    match_type: 'NORMAL' | 'PENALTIES_ONLY';
    home_team_provider_id: string | null;
    away_team_provider_id: string | null;
  }>();
  if (!match) return error('Partido no encontrado en esta fecha', 404);

  const participant = await env.DB.prepare(
    `SELECT id, full_name FROM users
     WHERE id = ? AND role = 'participant' AND is_active = 1 LIMIT 1`,
  ).bind(userId).first<{ id: string; full_name: string }>();
  if (!participant) return error('Participante no encontrado', 404);

  const body = await request.json().catch(() => null) as {
    homeScore?: number;
    awayScore?: number;
    extraTeamId?: string | null;
    reason?: string;
  } | null;
  if (!body) return error('Datos inválidos');

  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let reason: string;
  try {
    if (match.match_type === 'NORMAL') {
      homeScore = scoreValue(body.homeScore);
      awayScore = scoreValue(body.awayScore);
    }
    reason = reasonValue(body.reason);
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'Pronóstico inválido');
  }

  let extraTeamId: string | null = null;
  if (body.extraTeamId) {
    if (body.extraTeamId !== match.home_team_provider_id && body.extraTeamId !== match.away_team_provider_id) {
      return error('Equipo extra inválido');
    }
    extraTeamId = body.extraTeamId;
  }
  if (match.match_type === 'PENALTIES_ONLY' && !extraTeamId) {
    return error('Indicá qué equipo fue pronosticado como ganador por penales');
  }

  const existing = await env.DB.prepare(
    `SELECT id, predicted_home_score, predicted_away_score,
            predicted_extra_team_provider_id, is_admin_override
     FROM predictions
     WHERE user_id = ? AND match_id = ? LIMIT 1`,
  ).bind(userId, matchId).first<PredictionRow>();

  const before = existing ? {
    homeScore: existing.predicted_home_score,
    awayScore: existing.predicted_away_score,
    extraTeamId: existing.predicted_extra_team_provider_id,
    adminOverride: Boolean(existing.is_admin_override),
  } : null;

  await env.DB.prepare(
    `INSERT INTO predictions
      (user_id, match_id, predicted_home_score, predicted_away_score,
       predicted_extra_team_provider_id, is_admin_override, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
     ON CONFLICT(user_id, match_id) DO UPDATE SET
       predicted_home_score = excluded.predicted_home_score,
       predicted_away_score = excluded.predicted_away_score,
       predicted_extra_team_provider_id = excluded.predicted_extra_team_provider_id,
       is_admin_override = 1,
       updated_at = datetime('now')`,
  ).bind(userId, matchId, homeScore, awayScore, extraTeamId).run();

  const saved = await env.DB.prepare(
    `SELECT id FROM predictions WHERE user_id = ? AND match_id = ? LIMIT 1`,
  ).bind(userId, matchId).first<{ id: number }>();
  if (!saved) return error('No se pudo guardar la corrección', 500);

  const calculated = await recalculateRoundScores(roundId, env);
  const after = {
    roundId,
    participantId: userId,
    participantName: participant.full_name,
    matchId,
    homeScore,
    awayScore,
    extraTeamId,
    adminOverride: true,
    reason,
    calculated,
  };

  await env.DB.prepare(
    `INSERT INTO audit_log
      (actor_user_id, action, entity_type, entity_id, before_json, after_json)
     VALUES (?, 'prediction.admin_override', 'prediction', ?, ?, ?)`,
  ).bind(
    auth.user!.id,
    String(saved.id),
    before ? JSON.stringify(before) : null,
    JSON.stringify(after),
  ).run();

  return json({ ok: true, predictionId: saved.id, calculated });
}

export async function handleAdminCorrections(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const dataMatch = pathname.match(/^\/api\/admin\/rounds\/(\d+)\/corrections$/);
  if (dataMatch && request.method === 'GET') {
    return getCorrectionsData(request, env, Number(dataMatch[1]));
  }

  const resultMatch = pathname.match(/^\/api\/admin\/matches\/(\d+)\/manual-result$/);
  if (resultMatch && request.method === 'PUT') {
    return overrideResult(request, env, Number(resultMatch[1]));
  }

  const resetMatch = pathname.match(/^\/api\/admin\/matches\/(\d+)\/manual-result\/reset$/);
  if (resetMatch && request.method === 'PUT') {
    return resetManualResult(request, env, Number(resetMatch[1]));
  }

  const predictionMatch = pathname.match(
    /^\/api\/admin\/rounds\/(\d+)\/users\/([^/]+)\/matches\/(\d+)\/prediction$/,
  );
  if (predictionMatch && request.method === 'PUT') {
    return overridePrediction(
      request,
      env,
      Number(predictionMatch[1]),
      decodeURIComponent(predictionMatch[2]),
      Number(predictionMatch[3]),
    );
  }

  if (pathname.startsWith('/api/admin/') && pathname.includes('/corrections')) {
    return error('Método no permitido', 405);
  }

  return null;
}
