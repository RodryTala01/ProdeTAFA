import entryWorker, { mutationAllowed } from './entry';
import type { Env } from './index';
import { handleCompetitionEngine } from './competitions';
import { handleCompetitionConfig } from './competition-config';
import { handleCompetitionLeagues } from './competition-leagues';
import { handleCompetitionGroups } from './competition-groups';

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    const competitionRoute = pathname.startsWith('/api/admin/competition-engine')
      || pathname.startsWith('/api/competition-engine/');

    if (competitionRoute) {
      if (!mutationAllowed(request)) return jsonError('Origen de solicitud no permitido', 403);

      const groupResponse = await handleCompetitionGroups(request, env);
      if (groupResponse) return groupResponse;

      const leagueResponse = await handleCompetitionLeagues(request, env);
      if (leagueResponse) return leagueResponse;

      const configResponse = await handleCompetitionConfig(request, env);
      if (configResponse) return configResponse;

      const response = await handleCompetitionEngine(request, env);
      if (response) return response;
    }

    return entryWorker.fetch(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return entryWorker.scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<Env>;
