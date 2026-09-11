import baseWorker, { type Env } from './index';
import { handleLeague } from './league';
import { handleHistory } from './history';
import { participantPasswordResetPolicy, publicationPolicy } from './policies';

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function jsonError(message: string, status: number) {
  return json({ error: message }, status);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
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

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hasAdminSession(request: Request, env: Env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return false;
  const tokenHash = await sha256(token);
  const user = await env.DB.prepare(
    `SELECT u.id
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND julianday(s.expires_at) > julianday('now')
       AND u.is_active = 1
       AND u.role = 'admin'
     LIMIT 1`,
  ).bind(tokenHash).first<{ id: string }>();
  return Boolean(user);
}

export function mutationAllowed(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return false;
  const fetchSite = request.headers.get('sec-fetch-site');
  return fetchSite !== 'cross-site';
}

export async function syncOpenLeagueParticipants(env: Env) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO league_participants (season_id, user_id, eligible_from_slot)
     SELECT
       s.id,
       u.id,
       COALESCE(
         (
           SELECT MIN(lr.slot_number)
           FROM league_rounds lr
           JOIN rounds r ON r.id = lr.round_id
           WHERE lr.season_id = s.id
             AND r.status <> 'finished'
         ),
         (
           SELECT COUNT(*) + 1
           FROM league_rounds lr2
           WHERE lr2.season_id = s.id
         )
       )
     FROM league_seasons s
     CROSS JOIN users u
     WHERE s.status = 'open'
       AND u.role = 'participant'
       AND u.is_active = 1`,
  ).run();
}

async function deepHealth(env: Env) {
  const required = ['league_seasons', 'league_rounds', 'league_participants'];
  const result = await env.DB.prepare(
    `SELECT name FROM sqlite_master
     WHERE type = 'table'
       AND name IN ('league_seasons', 'league_rounds', 'league_participants')`,
  ).all<{ name: string }>();
  const found = new Set((result.results ?? []).map((row) => row.name));
  const missingTables = required.filter((name) => !found.has(name));

  let eligibilityColumnReady = false;
  if (missingTables.length === 0) {
    const columns = await env.DB.prepare('PRAGMA table_info(league_participants)').all<{ name: string }>();
    eligibilityColumnReady = (columns.results ?? []).some((column) => column.name === 'eligible_from_slot');
  }

  const openRound = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM rounds WHERE status = 'open'`,
  ).first<{ total: number }>();
  const openRoundCount = Number(openRound?.total ?? 0);
  const singleOpenRoundReady = openRoundCount <= 1;

  const ok = missingTables.length === 0 && eligibilityColumnReady && singleOpenRoundReady;
  return json({
    ok,
    app: 'prode-tafa',
    leagueSchemaReady: missingTables.length === 0 && eligibilityColumnReady,
    singleOpenRoundReady,
    openRoundCount,
    missingTables,
    missingColumns: eligibilityColumnReady ? [] : ['league_participants.eligible_from_slot'],
  }, ok ? 200 : 503);
}

export async function protectPublishedRoundMatches(request: Request, env: Env) {
  if (request.method !== 'POST' && request.method !== 'DELETE') return null;
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/admin\/rounds\/(\d+)\/matches(?:\/\d+)?$/);
  if (!match) return null;

  const round = await env.DB.prepare('SELECT status FROM rounds WHERE id = ? LIMIT 1')
    .bind(Number(match[1]))
    .first<{ status: string }>();

  if (!round || round.status === 'draft') return null;
  return jsonError('Una fecha publicada o finalizada ya no puede cambiar sus partidos', 409);
}

async function protectParticipantPasswordReset(request: Request, env: Env) {
  if (request.method !== 'PUT') return null;
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/admin\/users\/([^/]+)\/password$/);
  if (!match || !(await hasAdminSession(request, env))) return null;

  const userId = decodeURIComponent(match[1]);
  const target = await env.DB.prepare('SELECT role FROM users WHERE id = ? LIMIT 1')
    .bind(userId)
    .first<{ role: string }>();
  if (!target) return null;

  const policy = participantPasswordResetPolicy(target.role);
  return policy.ok ? null : jsonError(policy.error, policy.status);
}

async function publishRoundSafely(request: Request, env: Env) {
  if (request.method !== 'PUT') return null;
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/admin\/publish-round\/(\d+)$/);
  if (!match || !(await hasAdminSession(request, env))) return null;

  const roundId = Number(match[1]);
  const round = await env.DB.prepare('SELECT id, status FROM rounds WHERE id = ? LIMIT 1')
    .bind(roundId)
    .first<{ id: number; status: string }>();
  if (!round) return null;

  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM matches WHERE round_id = ?')
    .bind(roundId)
    .first<{ total: number }>();
  const otherOpen = await env.DB.prepare(
    `SELECT id FROM rounds WHERE status = 'open' AND id <> ? LIMIT 1`,
  ).bind(roundId).first<{ id: number }>();

  const policy = publicationPolicy(round.status, Number(count?.total ?? 0), Boolean(otherOpen));
  if (!policy.ok) return jsonError(policy.error, policy.status);
  if (policy.alreadyOpen) return json({ ok: true, status: 'open' });

  const result = await env.DB.prepare(
    `UPDATE rounds
     SET status = 'open', published_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?
       AND status = 'draft'
       AND NOT EXISTS (
         SELECT 1 FROM rounds other
         WHERE other.status = 'open' AND other.id <> ?
       )`,
  ).bind(roundId, roundId).run();

  if (Number(result.meta.changes ?? 0) !== 1) {
    return jsonError('Ya hay otra fecha publicada. Cerrala antes de publicar una nueva', 409);
  }

  const token = readCookie(request, SESSION_COOKIE)!;
  const tokenHash = await sha256(token);
  const actor = await env.DB.prepare(
    `SELECT u.id
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND u.role = 'admin' LIMIT 1`,
  ).bind(tokenHash).first<{ id: string }>();

  if (actor) {
    await env.DB.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id)
       VALUES (?, 'round.published', 'round', ?)`,
    ).bind(actor.id, String(roundId)).run();
  }

  return json({ ok: true, status: 'open' });
}

function shouldSyncLeagueParticipants(pathname: string, method: string) {
  if (method === 'POST' && pathname === '/api/admin/users') return true;
  return method === 'PUT' && /^\/api\/admin\/users\/[^/]+\/status$/.test(pathname);
}

async function clearResetManualResult(pathname: string, method: string, response: Response, env: Env) {
  if (!response.ok || method !== 'PUT') return;
  const match = pathname.match(/^\/api\/admin\/matches\/(\d+)\/manual-result\/reset$/);
  if (!match) return;

  const matchId = Number(match[1]);
  await env.DB.prepare(
    `UPDATE matches SET
       provider = 'api-football',
       status = 'NS', elapsed_minutes = NULL,
       home_score_current = NULL, away_score_current = NULL,
       home_score_regulation = NULL, away_score_regulation = NULL,
       winning_team_provider_id = NULL, qualified_team_provider_id = NULL,
       went_to_extra_time = 0, went_to_penalties = 0, is_void = 0,
       result_finalized_at = NULL, last_synced_at = NULL,
       updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(matchId).run();

  await env.DB.prepare(
    `DELETE FROM prediction_scores
     WHERE prediction_id IN (SELECT id FROM predictions WHERE match_id = ?)`,
  ).bind(matchId).run();
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    if (request.method === 'GET' && pathname === '/api/health/deep') {
      return deepHealth(env);
    }

    if (pathname.startsWith('/api/') && !mutationAllowed(request)) {
      return jsonError('Origen de solicitud no permitido', 403);
    }

    const passwordResetResponse = await protectParticipantPasswordReset(request, env);
    if (passwordResetResponse) return passwordResetResponse;

    const publishResponse = await publishRoundSafely(request, env);
    if (publishResponse) return publishResponse;

    const immutableRoundResponse = await protectPublishedRoundMatches(request, env);
    if (immutableRoundResponse) return immutableRoundResponse;

    const leagueRoute = pathname === '/api/league' || pathname.startsWith('/api/admin/leagues');

    if (leagueRoute) {
      await syncOpenLeagueParticipants(env);
      const response = await handleLeague(request, env);
      if (response) return response;
    }

    if (pathname === '/api/participant/history') {
      const response = await handleHistory(request, env);
      if (response) return response;
    }

    const response = await baseWorker.fetch(request, env);
    await clearResetManualResult(pathname, request.method, response, env);
    if (response.ok && shouldSyncLeagueParticipants(pathname, request.method)) {
      await syncOpenLeagueParticipants(env);
    }
    return response;
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return baseWorker.scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<Env>;
