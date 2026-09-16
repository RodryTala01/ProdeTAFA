import { describe, expect, it } from 'vitest';
import { nextPredictionField } from '../src/prediction-focus';

const future = '2099-01-01T00:00:00Z';
const past = '2000-01-01T00:00:00Z';
const matches = [
  { id: 1, lockedAt: future, matchType: 'NORMAL' },
  { id: 2, lockedAt: past, matchType: 'NORMAL' },
  { id: 3, lockedAt: future, matchType: 'PENALTIES_ONLY' },
  { id: 4, lockedAt: future, matchType: 'NORMAL' },
];
const now = Date.parse('2026-09-16T00:00:00Z');
describe('recorrido de campos de pronósticos', () => {
  it('avanza local a visitante', () => {
    expect(nextPredictionField(matches, 1, 'home', now, true, () => true)).toEqual({ id: 1, field: 'away' });
  });
  it('avanza visitante al próximo local omitiendo partidos bloqueados', () => {
    expect(nextPredictionField(matches, 1, 'away', now, true, () => true)).toEqual({ id: 3, field: 'home' });
  });
  it('omite inputs disabled o ausentes', () => {
    expect(nextPredictionField(matches, 1, 'away', now, true, (id) => id !== 3)).toEqual({ id: 4, field: 'home' });
  });
  it('no salta la elección de penales', () => {
    expect(nextPredictionField(matches, 3, 'away', now, true, () => true)).toEqual({ id: 3, field: 'penalty' });
    expect(nextPredictionField(matches, 3, 'away', now, true, () => false)).toBeNull();
  });
  it('avanza luego de elegir penales', () => {
    expect(nextPredictionField(matches, 3, 'penalty', now, true, () => true)).toEqual({ id: 4, field: 'home' });
  });
  it('no avanza después del último partido', () => {
    expect(nextPredictionField(matches, 4, 'away', now, true, () => true)).toBeNull();
  });
  it('no avanza en una fecha no editable o un partido que acaba de cerrar', () => {
    expect(nextPredictionField(matches, 1, 'away', now, false, () => true)).toBeNull();
    expect(nextPredictionField(matches, 1, 'away', Date.parse(future), true, () => true)).toBeNull();
  });
});
