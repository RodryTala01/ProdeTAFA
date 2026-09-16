import entryWorker, { mutationAllowed } from './entry';
import type { Env } from './index';
import { handleCompetitionEngine } from './competitions';

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
      || pathname === '/api/competition-engine/current';

    if (competitionRoute) {
      if (!mutationAllowed(request)) return jsonError('Origen de solicitud no permitido', 403);
      const response = await handleCompetitionEngine(request, env);
      if (response) return response;
    }

    return entryWorker.fetch(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    return entryWorker.scheduled(controller, env, ctx);
  },
} satisfies ExportedHandler<Env>;
