import entryWorker, { mutationAllowed } from './entry';
import type { Env } from './index';
import { handleCompetitionEngine } from './competitions';
import { handleCompetitionConfig } from './competition-config';
import { handleCompetitionLeagues } from './competition-leagues';
import { handleCompetitionGroups } from './competition-groups';
import { handleCompetitionDraw } from './competition-draw';
import { handleCompetitionResults } from './competition-results';
import { handleCompetitionKnockout } from './competition-knockout';
import { handleCompetitionTiebreak } from './competition-tiebreak';
import { handleCompetitionCupAbProgression } from './competition-cup-ab-progression';
import { handleCompetitionTotalSegments } from './competition-total-segments';
import { handleCompetitionTotalGroups } from './competition-total-groups';
import { handleCompetitionTotalProgression } from './competition-total-progression';
import { handleCompetitionDuos } from './competition-duos';
import { handleIffhs } from './iffhs';

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

      const duosResponse = await handleCompetitionDuos(request, env);
      if (duosResponse) return duosResponse;

      const totalProgressionResponse = await handleCompetitionTotalProgression(request, env);
      if (totalProgressionResponse) return totalProgressionResponse;

      const totalGroupsResponse = await handleCompetitionTotalGroups(request, env);
      if (totalGroupsResponse) return totalGroupsResponse;

      const totalSegmentsResponse = await handleCompetitionTotalSegments(request, env);
      if (totalSegmentsResponse) return totalSegmentsResponse;

      const progressionResponse = await handleCompetitionCupAbProgression(request, env);
      if (progressionResponse) return progressionResponse;

      const tiebreakResponse = await handleCompetitionTiebreak(request, env);
      if (tiebreakResponse) return tiebreakResponse;

      const knockoutResponse = await handleCompetitionKnockout(request, env);
      if (knockoutResponse) return knockoutResponse;

      const resultsResponse = await handleCompetitionResults(request, env);
      if (resultsResponse) return resultsResponse;

      const iffhsResponse = await handleIffhs(request, env);
      if (iffhsResponse) return iffhsResponse;

      const drawResponse = await handleCompetitionDraw(request, env);
      if (drawResponse) return drawResponse;

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
