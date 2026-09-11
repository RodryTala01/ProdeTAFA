import baseWorker, { type Env } from './index';
import { handleLeague } from './league';
import { handleHistory } from './history';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function jsonError(message: string, status: number) {
  return json({ error: message }, status);
}

function mutationAllowed(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return false;
  const fetchSite = request.headers.get('sec-fetch-site');
  return fetchSite !== 'cross-site';
}

async function syncOpenLeagueParticipants(env: Env) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO league_participants (season_id, user_id)
     SELECT s.id, u.id
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
  const missing = required.filter((name) => !found.has(name));
  const ok = missing.length === 0;
  return json({ ok, app: 'prode-tafa', leagueSchemaReady: ok, missingTables: missing }, ok ? 200 : 503);
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

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    if (request.method === 'GET' && pathname === '/api/health/deep') {
      return deepHealth(env);
    }

    const immutableRoundResponse = await protectPublishedRoundMatches(request, env);
    if (immutableRoundResponse) return immutableRoundResponse;

    const leagueRoute = pathname === '/api/league' || pathname.startsWith('/api/admin/leagues');

    if (leagueRoute) {
      if (!mutationAllowed(request)) return jsonError('Origen de solicitud no permitido', 403);
      await syncOpenLeagueParticipants(env);
      const response = await handleLeague(request, env);
      if (response) return response;
    }

    if (pathname === '/api/participant/history') {
      const response = await handleHistory(request, env);
      if (response) return response;
    }

    return baseWorker.fetch(request, env);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return baseWorker.scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<Env>;
