import baseWorker, { type Env } from './index';
import { handleLeague } from './league';
import { handleHistory } from './history';

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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    const leagueRoute = pathname === '/api/league' || pathname.startsWith('/api/admin/leagues');

    if (leagueRoute) {
      if (!mutationAllowed(request)) {
        return new Response(JSON.stringify({ error: 'Origen de solicitud no permitido' }), {
          status: 403,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      }
      await syncOpenLeagueParticipants(env);
      const response = await handleLeague(request, env);
      if (response) return response;
    }

    if (pathname === '/api/participant/history') {
      const response = await handleHistory(request, env);
      if (response) return response;
    }

    return baseWorker.fetch(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return baseWorker.scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<Env>;
