import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve('worker/competition-cup-ab-progression.ts'), 'utf8');
const app = readFileSync(resolve('worker/app.ts'), 'utf8');

describe('Copa A/B progression contract', () => {
  it('draws round of 16 strictly second versus third', () => {
    expect(worker).toContain("restriction: 'SECOND_VS_THIRD'");
    expect(worker).toContain('ranking.filter((entry) => entry.position === 2)');
    expect(worker).toContain('ranking.filter((entry) => entry.position === 3)');
  });

  it('requires group dates to be finished before round of 16 draw', () => {
    expect(worker).toContain('La fase de grupos todavía tiene Fechas sin cerrar');
  });

  it('builds quarterfinal pool from group winners plus round-of-16 winners', () => {
    expect(worker).toContain('entry.position === 1');
    expect(worker).toContain('const pool = [...groupWinners, ...winnersResult.winners]');
  });

  it('requires all previous knockout encounters to have a winner', () => {
    expect(worker).toContain('La etapa origen todavía tiene cruces sin resolver');
  });

  it('randomly draws quarterfinals and semifinals, but not the two-team final', () => {
    expect(worker).toContain("action === 'DRAW_SEMIS'");
    expect(worker).toContain('crypto.getRandomValues');
    expect(worker).toContain("action === 'BUILD_FINAL' && ordered.length !== 2");
  });

  it('does not invent a same-group restriction for round of 16', () => {
    expect(worker).not.toContain('same group');
    expect(worker).not.toContain('mismo grupo');
  });

  it('prevents silently redrawing a target stage that already has encounters', () => {
    expect(worker).toContain('La etapa destino ya tiene cruces sorteados');
  });

  it('uses the same official scoring order as group standings', () => {
    expect(worker).toContain('points DESC, fulls DESC, partials DESC, errors ASC, extras DESC');
    expect(worker).toContain('official_predictions');
  });

  it('routes Copa A/B progression before generic competition handling', () => {
    expect(app).toContain('handleCompetitionCupAbProgression');
    expect(app.indexOf('handleCompetitionCupAbProgression(request, env)')).toBeLessThan(app.indexOf('handleCompetitionEngine(request, env)'));
  });
});
