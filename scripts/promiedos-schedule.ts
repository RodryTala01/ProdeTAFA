import { ARGENTINA_TIME_ZONE, argentinaCalendarDate, shiftCalendarDate } from '../src/match-time';
import { PromiedosError, promiedosWallTime, type PromiedosGame } from '../worker/promiedos';
import { getPromiedosDay, type RequestCounter } from './promiedos-client';
export { getPromiedosGame, safeDailyLiveGame } from './promiedos-client';

type ScheduleFixture = { home: string; away: string; utc: number };
const minute = 60_000;

function teamKey(name: string) {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function pairKey(home: string, away: string) {
  return teamKey(home) + '|' + teamKey(away);
}

async function getSchedule(date: string, counter: RequestCounter): Promise<ScheduleFixture[]> {
  const day = date.split('-').reverse().join('/');
  const query = new URLSearchParams({
    appTypeId: '5', langId: '29', sports: '1',
    timezoneName: ARGENTINA_TIME_ZONE, startDate: day, endDate: day,
  });
  counter.count++;
  const response = await fetch('https://webws.365scores.com/web/games/?' + query, {
    signal: AbortSignal.timeout(15_000), redirect: 'error',
    headers: { accept: 'application/json' },
  }).catch(() => null);
  if (!response?.ok) throw new PromiedosError('No se pudo verificar el horario de los partidos.');
  const data = await response.json().catch(() => null) as { games?: unknown } | null;
  if (!Array.isArray(data?.games)) throw new PromiedosError('No se pudo leer el calendario de referencia.');

  const schedule: ScheduleFixture[] = [];
  for (const fixture of data.games) {
    if (fixture?.sportId !== 1 || fixture.isHomeAwayInverted ||
        typeof fixture?.homeCompetitor?.name !== 'string' || typeof fixture?.awayCompetitor?.name !== 'string' ||
        typeof fixture.startTime !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(fixture.startTime)) continue;
    const at = new Date(fixture.startTime);
    if (!Number.isFinite(+at) || argentinaCalendarDate(at) !== date) continue;
    schedule.push({ home: fixture.homeCompetitor.name, away: fixture.awayCompetitor.name, utc: +at });
  }
  return schedule;
}

// Promiedos localizes its unzoned clock by request. Verify each listing separately.
// An unchanged pair and a plausible UTC offset link the two schedules. Only
// extrapolate to unlisted matches when multiple independent pairs agree.
function resolveListing(games: PromiedosGame[], schedule: ScheduleFixture[]) {
  const referenceByPair = new Map<string, ScheduleFixture | null>();
  for (const item of schedule) {
    const key = pairKey(item.home, item.away);
    referenceByPair.set(key, referenceByPair.has(key) ? null : item);
  }

  const seen = new Set<string>();
  const repeated = new Set<string>();
  const rows = games.map(game => {
    const key = pairKey(game.teams[0].name, game.teams[1].name);
    if (seen.has(key)) repeated.add(key);
    seen.add(key);
    return { game, key, wall: promiedosWallTime(game.start_time) };
  });

  const anchors = new Map<string, number>();
  for (const { key, wall } of rows) {
    const reference = referenceByPair.get(key);
    if (!reference || repeated.has(key)) continue;
    const offset = reference.utc - wall;
    if (offset >= -14 * 60 * minute && offset <= 12 * 60 * minute && offset % (15 * minute) === 0) {
      anchors.set(key, offset);
    }
  }
  const offsets = new Set(anchors.values());
  const verifiedOffset = anchors.size >= 3 && offsets.size === 1 ? [...offsets][0] : undefined;
  return rows.flatMap(({ game, key, wall }) => {
    const offset = anchors.get(key) ?? verifiedOffset;
    return offset === undefined ? [] : [{ ...game, kickoffAt: new Date(wall + offset).toISOString() }];
  });
}

export function verifyFixtureDay(date: string, listings: PromiedosGame[][], schedule: ScheduleFixture[]) {
  const verified = new Map<string, PromiedosGame | null>();
  for (const listing of listings) {
    for (const game of resolveListing(listing, schedule)) {
      if (argentinaCalendarDate(new Date(game.kickoffAt)) !== date) continue;
      const previous = verified.get(game.id);
      if (previous === null) continue;
      if (previous && (previous.kickoffAt !== game.kickoffAt ||
          previous.teams[0].id !== game.teams[0].id || previous.teams[1].id !== game.teams[1].id)) {
        verified.set(game.id, null);
      } else {
        verified.set(game.id, game);
      }
    }
  }
  const fixtures = [...verified.values()].filter(game => game !== null);
  if (!fixtures.length && schedule.length > 0) {
    throw new PromiedosError('No se encontraron horarios coincidentes para ese día. Se conserva el calendario anterior.');
  }
  return fixtures;
}

export function createPromiedosSchedule() {
  const rawDays = new Map<string, Promise<PromiedosGame[]>>();
  function rawDay(date: string, counter: RequestCounter) {
    const pending = rawDays.get(date);
    if (pending) return pending;
    // Memoize per acquisition so adjacent Argentine dates reuse their listings.
    const next = getPromiedosDay(date, counter);
    rawDays.set(date, next);
    return next;
  }

  function listings(date: string, counter: RequestCounter) {
    return Promise.all([-1, 0, 1].map(offset => rawDay(shiftCalendarDate(date, offset), counter)));
  }

  return {
    async getDay(date: string, counter: RequestCounter) {
      const [games, reference] = await Promise.all([listings(date, counter), getSchedule(date, counter)]);
      return verifyFixtureDay(date, games, reference);
    },
    async findListedGame(date: string, id: string, counter: RequestCounter) {
      const days = await Promise.allSettled([-1, 0, 1].map(offset => rawDay(shiftCalendarDate(date, offset), counter)));
      const games = days.flatMap(day => day.status === 'fulfilled' ? day.value : []).filter(game => game.id === id);
      return games.length === 1 ? games[0] : null;
    },
  };
}
