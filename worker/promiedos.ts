// Promiedos is an internal API: validate every response before using any score.
export class PromiedosError extends Error {}
type Team = { id: string; name: string };
type Stage = { name: string; scores?: number[]; is_penalties_stage?: boolean };
export type PromiedosGame = {
  id: string; teams: [Team, Team]; start_time: string;
  status: { enum: number; name: string }; scores?: number[]; penalties?: number[];
  winner?: number; to_qualify?: number; game_time?: number; events?: Stage[];
  league?: { id: string; name: string; country_name?: string }; stage_round_name?: string;
};
const API = 'https://api.promiedos.com.ar';
export type RequestCounter = { count: number };
function assert(condition: unknown): asserts condition {
  if (!condition) throw new PromiedosError('Promiedos no entregó información suficiente o consistente. Requiere revisión.');
}
const object = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
const idValid = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
export function promiedosKickoff(value: string) {
  const m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/.exec(value);
  assert(m);
  const [, d, mo, y, h, mi] = m;
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  const check = new Date(wall);
  assert(check.getUTCFullYear() === +y && check.getUTCMonth() === +mo - 1 && check.getUTCDate() === +d && +h < 24 && +mi < 60);
  // Resolve the named zone, including historical offsets; never use host timezone.
  const format = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(format.formatToParts(check).map(p => [p.type, p.value]));
  const offset = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - wall;
  const result = new Date(wall - offset);
  const verify = Object.fromEntries(format.formatToParts(result).map(p => [p.type, p.value]));
  assert(verify.day === d && verify.month === mo && verify.year === y && verify.hour === h && verify.minute === mi);
  return result.toISOString();
}
export function parsePromiedosGame(value: unknown, expectedId?: string): PromiedosGame {
  assert(object(value) && idValid(value.id) && (!expectedId || value.id === expectedId));
  assert(Array.isArray(value.teams) && value.teams.length === 2 && value.teams.every((t: unknown) => object(t) && idValid(t.id) && typeof t.name === 'string' && t.name.trim()));
  assert(value.teams[0].id !== value.teams[1].id);
  assert(object(value.status) && Number.isInteger(value.status.enum) && typeof value.status.name === 'string');
  assert(typeof value.start_time === 'string'); promiedosKickoff(value.start_time);
  if (value.events !== undefined) assert(Array.isArray(value.events) && value.events.every((s: unknown) => object(s) && typeof s.name === 'string'));
  return value as PromiedosGame;
}
function score(value: unknown): [number, number] {
  assert(Array.isArray(value) && value.length === 2 && value.every(v => Number.isInteger(v) && v >= 0));
  return value as [number, number];
}
export function promiedosFixture(g: PromiedosGame, league = g.league) {
  assert(league && idValid(league.id) && typeof league.name === 'string');
  const team = (t: Team) => ({ ...t, logoUrl: `${API}/images/team/${t.id}/1` });
  const scores = g.scores === undefined ? [null, null] : score(g.scores);
  return { provider: 'promiedos' as const, providerFixtureId: g.id, kickoffAt: promiedosKickoff(g.start_time),
    status: g.status.enum === 1 ? 'NS' : g.status.enum === 2 ? 'LIVE' : g.status.enum === 3 ? 'FT' : 'PST',
    statusLong: g.status.name, elapsedMinutes: g.game_time != null && g.game_time >= 0 ? g.game_time : null,
    competition: { id: league.id, name: league.name, country: league.country_name ?? '', logoUrl: null, round: g.stage_round_name ?? null },
    home: team(g.teams[0]), away: team(g.teams[1]), goals: { home: scores[0], away: scores[1] } };
}
export function parsePromiedosDay(value: unknown): PromiedosGame[] {
  assert(object(value) && Array.isArray(value.leagues));
  const games: PromiedosGame[] = value.leagues.flatMap((league: any) => {
    assert(object(league) && idValid(league.id) && typeof league.name === 'string' && Array.isArray(league.games));
    return league.games.map((g: unknown) => ({...parsePromiedosGame(g), league: {id: league.id, name: league.name, country_name: league.country_name}}));
  });
  assert(new Set(games.map(g => g.id)).size === games.length);
  return games;
}
export function normalizePromiedosResult(g: PromiedosGame) {
  parsePromiedosGame(g);
  const final = g.status.enum === 3;
  const stages = g.events ?? [];
  const find = (name: string) => { const found = stages.filter(s => s.name === name); assert(found.length <= 1); return found[0]; };
  const regulation = find('Fin de los 90 minutos');
  const extra = find('Suplementario');
  const penalties = stages.filter(s => s.name === 'Penales' || s.is_penalties_stage === true);
  assert(penalties.length <= 1);
  const pen = penalties[0];
  const wentToPenalties = !!pen || g.penalties !== undefined || /penal/i.test(g.status.name);
  const wentToExtra = !!extra || /extra|suplement/i.test(g.status.name);
  assert([1, 2, 3].includes(g.status.enum)); // Unknown/suspended must be reviewed, not voided.
  if (final || wentToExtra || wentToPenalties) assert(regulation);
  const current = g.status.enum === 1 ? null : score(g.scores);
  const reg = regulation ? score(regulation.scores) : null;
  const et = extra ? score(extra.scores) : null;
  if (wentToExtra && final) assert(et);
  if (et && reg) assert(et[0] >= reg[0] && et[1] >= reg[1]);
  if (final) {
    const expected = et ?? reg!;
    assert(current && expected[0] === current[0] && expected[1] === current[1]);
  }
  let winner: string | null = null;
  let qualified: string | null = null;
  const side = (n: number | undefined) => n === 1 || n === 2 ? g.teams[n - 1].id : null;
  if (final && wentToPenalties) {
    assert(pen); const ps = score(pen.scores);
    assert(current && current[0] === current[1]);
    assert(ps[0] !== ps[1]);
    if (g.penalties !== undefined) { const p = score(g.penalties); assert(p[0] === ps[0] && p[1] === ps[1]); }
    winner = side(g.winner); assert(winner && winner === g.teams[ps[0] > ps[1] ? 0 : 1].id);
    qualified = side(g.to_qualify); assert(!qualified || qualified === winner);
  } else if (final && current) {
    winner = current[0] === current[1] ? null : g.teams[current[0] > current[1] ? 0 : 1].id;
    assert(!side(g.winner) || side(g.winner) === winner);
    qualified = side(g.to_qualify);
  }
  return { kickoffAt: promiedosKickoff(g.start_time), status: final ? (wentToPenalties ? 'PEN' : wentToExtra ? 'AET' : 'FT') : g.status.enum === 1 ? 'NS' : wentToPenalties ? 'P' : wentToExtra ? 'ET' : 'LIVE',
    current, regulation: reg, extraTime: et, penalties: pen ? score(pen.scores) : null,
    winner, qualified, wentToExtra, wentToPenalties, final,
    elapsed: g.game_time != null && g.game_time >= 0 ? g.game_time : null };
}
