import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve('worker/competition-knockout.ts'), 'utf8');
const app = readFileSync(resolve('worker/app.ts'), 'utf8');

describe('generic knockout contract', () => {
  it('scores encounters only from official prediction scores', () => {
    expect(worker).toContain('official_predictions');
    expect(worker).toContain('prediction_scores');
    expect(worker).not.toContain('JOIN predictions ');
  });

  it('adds explicit competition bonuses to entry scores', () => {
    expect(worker).toContain('competition_entry_bonuses');
    expect(worker).toContain('basePoints + bonusPoints');
  });

  it('auto-advances a bye', () => {
    expect(worker).toContain("resolution = 'bye'");
    expect(worker).toContain("status = 'finished'");
  });

  it('does not use plenos, partials, errors or extras as knockout tiebreakers', () => {
    expect(worker).not.toContain('base_points = 3');
    expect(worker).not.toContain('base_points = 1');
    expect(worker).not.toContain('errors ASC');
    expect(worker).not.toContain('extras DESC');
    expect(worker).toContain("tied ? 'tied' : 'finished'");
  });

  it('requires an admin confirmation for an override or tiebreak resolution', () => {
    expect(worker).toContain("'competition.encounter_winner_confirmed'");
    expect(worker).toContain("resolution === 'admin' || encounter.resolution === 'tiebreak'");
  });

  it('blocks generic bracket replacement for competitions with dedicated progression rules', () => {
    for (const code of [
      'COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_CAMPEONES','COPA_PAPA','PROMOCION',
    ]) expect(worker).toContain(code);
    expect(worker).toContain('Configurá esta competición desde su flujo específico');
  });

  it('requires a reason for admin overrides in every dedicated competition flow', () => {
    expect(worker).toContain("COPA_DUOS");
    expect(worker).toContain("COPA_CAMPEONES");
    expect(worker).toContain("COPA_PAPA");
    expect(worker).toContain("PROMOCION");
    expect(worker).toContain("resolution === 'admin' && !reason");
    expect(worker).toContain('Resolvé el desempate desde el flujo TAFA');
  });

  it('prevents replacing encounters that already have tiebreak history', () => {
    expect(worker).toContain('No se pueden reemplazar cruces que ya tienen desempates asociados');
  });

  it('validates entries and round links belong to the same competition/stage', () => {
    expect(worker).toContain('WHERE id = ? AND competition_id = ? LIMIT 1');
    expect(worker).toContain('WHERE id = ? AND competition_id = ? AND stage_id = ? LIMIT 1');
  });

  it('routes knockout before the generic competition engine', () => {
    expect(app).toContain('handleCompetitionKnockout');
    expect(app.indexOf('handleCompetitionKnockout(request, env)')).toBeLessThan(app.indexOf('handleCompetitionEngine(request, env)'));
  });
});
