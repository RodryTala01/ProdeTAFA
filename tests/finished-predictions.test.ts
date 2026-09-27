import { describe, expect, it } from 'vitest';
import { predictionLabel } from '../src/FinishedPredictions';

const match = { id: 1, matchType: 'PENALTIES_ONLY' as const, home: { id: 'h', name: 'Local' }, away: { id: 'a', name: 'Visitante' } };
const prediction = { matchId: 1, homeScore: 2, awayScore: 1, extraTeamId: 'a', points: 3 };

describe('Revelado de pronósticos oficiales', () => {
  it('conserva el marcador de 90 minutos además de la elección de penales', () => {
    expect(predictionLabel(match, prediction)).toBe('2 - 1 · Penales: Visitante');
    expect(predictionLabel(match, { ...prediction, extraTeamId: 'h' })).toBe('2 - 1 · Penales: Local');
  });
  it('distingue un marcador sin elección extra de la ausencia de pronóstico', () => {
    expect(predictionLabel(match, { ...prediction, extraTeamId: null })).toBe('2 - 1 · Penales: Sin selección');
    expect(predictionLabel(match, { ...prediction, homeScore: null })).toBe('Sin pronóstico');
    expect(predictionLabel({ ...match, matchType: 'NORMAL' }, prediction)).toBe('2 - 1');
  });
});
