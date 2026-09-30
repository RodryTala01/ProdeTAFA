import { contextLabel, type CompetitionContext } from './competition-contexts';

export type Competition = { id: number; code: string; displayName: string; family: string; status: string };
export type CurrentSeason = {
  id: number; name: string; seasonNumber: number;
  division: { code: string; name: string } | null;
  competitions: Competition[];
  competitionCatalog?: Competition[];
};
type Prediction = { homeScore: number | null; awayScore: number | null; extraTeamId: string | null };
export type HomeRound = {
  id: number; name: string; status: string; submitted: boolean; serverNow: string;
  matches: { kickoffAt: string; lockedAt: string; isLocked: boolean; prediction: Prediction; officialPrediction: Prediction }[];
};
export type LeagueSummary = {
  competition: { code: string; displayName: string };
  currentUserId: string;
  provisional: boolean;
  standings: { userId: string; position: number; points: number }[];
};
export type HomeData = {
  season: CurrentSeason | null; round: HomeRound | null; league: LeagueSummary | null;
  contexts: CompetitionContext[]; errors: string[];
};
export const emptyHome: HomeData = { season: null, round: null, league: null, contexts: [], errors: [] };

async function read<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('No disponible');
  return response.json() as Promise<T>;
}

// Read-only aggregation of existing APIs; never derive classifications or winners here.
export async function loadHome(signal?: AbortSignal): Promise<HomeData> {
  const data: HomeData = { ...emptyHome, errors: [], contexts: [] };
  const [season, round] = await Promise.allSettled([
    read<{ season: CurrentSeason | null }>('/api/competition-engine/current', signal),
    read<{ round: HomeRound | null }>('/api/participant/round', signal),
  ]);
  if (season.status === 'fulfilled') data.season = season.value.season;
  else data.errors.push('No pudimos cargar las competiciones.');
  if (round.status === 'fulfilled') data.round = round.value.round?.status === 'open' ? round.value.round : null;
  else data.errors.push('No pudimos cargar la próxima Fecha.');
  const tasks: Promise<void>[] = [];
  const division = data.season?.division?.code;
  if (division === 'A' || division === 'B') tasks.push(
    read<LeagueSummary>(`/api/competition-engine/leagues/LIGA_${division}/standings`, signal)
      .then(value => { data.league = value; })
      .catch(() => { data.errors.push('No pudimos cargar tu posición en Liga.'); }),
  );
  if (data.round) tasks.push(
    read<{ contexts: CompetitionContext[] }>(`/api/participant/rounds/${data.round.id}/competition-contexts`, signal)
      .then(value => { data.contexts = value.contexts; })
      .catch(() => { data.errors.push('No pudimos cargar tus competiciones de esta Fecha.'); }),
  );
  await Promise.all(tasks);
  return data;
}

export function predictionState(round: HomeRound): string {
  const editable = round.matches.filter(m => !m.isLocked);
  const fields = ['homeScore', 'awayScore', 'extraTeamId'] as const;
  if (round.submitted) {
    return editable.some(m => fields.some(f => m.prediction[f] !== m.officialPrediction[f]))
      ? 'Tenés cambios pendientes de reenviar.' : 'Pronóstico enviado';
  }
  return editable.some(m => fields.some(f => m.prediction[f] !== null))
    ? 'Tenés un borrador sin enviar.' : 'Todavía no enviaste tu pronóstico.';
}

export function competitionRows(data: HomeData) {
  const season = data.season;
  if (!season) return [];
  const ownLeague = `LIGA_${season.division?.code}`;
  return [...(season.competitionCatalog ?? season.competitions)]
    .sort((a,b) => Number(b.code === ownLeague) - Number(a.code === ownLeague))
    .map(c => {
      const contexts = data.contexts.filter(ctx => ctx.competition.id === c.id);
      const registered = season.competitions.some(member => member.id === c.id);
      const mine = c.code === data.league?.competition.code
        ? data.league.standings.find(row => row.userId === data.league!.currentUserId) : null;
      return {
        ...c,
        name: c.displayName,
        monogram: c.displayName.split(' ').map(part => part[0]).join('').slice(0, 3),
        status: contexts.length ? 'En esta Fecha' : registered ? 'Participación registrada' : 'No participa',
        detail: contexts.length ? contexts.map(contextLabel).join(' · ')
          : registered ? 'Registrada en esta temporada. Consultá cada Fecha para ver tu participación.'
          : 'No participás en esta competencia.',
        position: mine ? `${mine.position}.º` : undefined,
        points: mine?.points,
      };
    });
}

export function timeRemaining(target: number, now: number) {
  const seconds = Math.max(0, Math.ceil((target - now) / 1000));
  if (!seconds) return 'El horario ya llegó';
  if (seconds >= 86400) return `Faltan ${Math.floor(seconds / 86400)} días ${Math.floor(seconds % 86400 / 3600)} h`;
  return `Faltan ${[Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':')}`;
}
