import { expect, it } from 'vitest';
import { verifyFixtureDay } from '../scripts/promiedos-schedule';
import type { PromiedosGame } from '../worker/promiedos';

const day = '2026-11-28';
const pair = [
  ['eiidibb', 'Palmeiras', 'Estudiantes de La Plata'],
  ['eijiief', 'Vélez Sarsfield', 'Independiente'],
  ['eijggea', 'Independiente Santa Fe', 'Atlético Nacional'],
];
const utc = ['2026-11-28T20:00:00.000Z', '2026-11-28T23:00:00.000Z', '2026-11-29T00:30:00.000Z'];
const game = ([id, home, away]: string[], start_time: string): PromiedosGame => ({
  id, teams: [{ id: id + 'h', name: home }, { id: id + 'a', name: away }],
  league: { id: 'league', name: 'Liga' },
  start_time, status: { enum: 1, name: 'Programado' },
});
const reference = pair.map(([, home, away], i) => ({ home, away, utc: Date.parse(utc[i]) }));

it.each([
  ['14:00', '17:00', '18:30'],
  ['12:00', '15:00', '16:30'],
  ['17:00', '20:00', '21:30'],
])('normalizes the screenshot fixtures regardless of the provider clock (%s)', (...local) => {
  const listing = pair.map((row, i) => game(row, '28-11-2026 ' + local[i]));
  expect(verifyFixtureDay(day, [listing], reference).map(fixture => fixture.kickoffAt)).toEqual(utc);
});

it('carries an Argentine midnight fixture from a neighboring provider listing', () => {
  const anchors = pair.map((row, i) => game(row, '28-11-2026 ' + ['12:00', '15:00', '16:30'][i]));
  const localFixture = game(['night', 'Equipo de madrugada', 'Visitante'], '27-11-2026 19:15');
  const lateFixture = game(['late', 'Local 2', 'Visita 2'], '28-11-2026 20:30');
  const schedule = [...reference, { home: 'Equipo de madrugada', away: 'Visitante', utc: Date.parse('2026-11-28T03:15:00Z') }];
  expect(verifyFixtureDay(day, [[localFixture], [...anchors, lateFixture]], schedule).map(game => game.id))
    .toEqual(['night', ...pair.map(([id]) => id)]);
});

it('extrapolates only when multiple anchor pairs agree, preserving exact references otherwise', () => {
  const listing = pair.map((row, i) => game(row, '28-11-2026 ' + ['12:00', '15:00', '16:30'][i]));
  listing.push(game(['extra', 'Sin referencia local', 'Sin referencia visitante'], '28-11-2026 13:15'));
  expect(verifyFixtureDay(day, [listing], reference).at(-1)?.kickoffAt).toBe('2026-11-28T21:15:00.000Z');
  listing[0].start_time = '28-11-2026 11:00';
  expect(verifyFixtureDay(day, [listing], reference).map(fixture => fixture.kickoffAt)).toEqual(utc);
});
