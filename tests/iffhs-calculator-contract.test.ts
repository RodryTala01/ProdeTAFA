import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const calculator = readFileSync(resolve('worker/iffhs-calculator.ts'), 'utf8');
const worker = readFileSync(resolve('worker/iffhs.ts'), 'utf8');
const results = readFileSync(resolve('worker/competition-results.ts'), 'utf8');

describe('automatic IFFHS calculator contract', () => {
  it('uses the confirmed Liga A coefficients', () => {
    expect(calculator).toContain("divisionCode === 'A' ? 1.3 : 0.75");
    expect(calculator).toContain("divisionCode === 'A' ? 2.25 : 1.5");
    expect(calculator).toContain("divisionCode === 'A' ? 2 : 1");
    expect(calculator).toContain("divisionCode === 'A' ? 100 : 30");
    expect(calculator).toContain("divisionCode === 'A' ? 75 : 20");
  });

  it('adds Liga B participant count to Liga A position points and no active Liga C bonus to B', () => {
    expect(calculator).toContain("if (ligaA) await leagueComponents(env, ligaA, 'A', Number(counts.get('B') ?? 0), components)");
    expect(calculator).toContain("if (ligaB) await leagueComponents(env, ligaB, 'B', 0, components)");
  });

  it('stores the confirmed Cup fixed values', () => {
    expect(calculator).toContain('COPA_A');
    expect(calculator).toContain('CHAMPION: 75');
    expect(calculator).toContain('COPA_B');
    expect(calculator).toContain('CHAMPION: 25');
    expect(calculator).toContain('COPA_TOTAL');
    expect(calculator).toContain('RUNNER_UP: 75');
    expect(calculator).toContain('COPA_DUOS');
    expect(calculator).toContain('PHASE_2: 5');
    expect(calculator).toContain('COPA_PAPA');
    expect(calculator).toContain('ROUND_OF_16: 22');
  });

  it('awards third-place finishers the semifinal IFFHS value where third place exists', () => {
    expect(calculator).toContain('COPA_TOTAL');
    expect(calculator).toContain('THIRD: 60');
    expect(calculator).toContain('COPA_PAPA');
    expect(calculator).toContain('THIRD: 45');
  });

  it('distinguishes Campeones 32avos, 16avos and octavos', () => {
    expect(results).toContain("'ROUND_OF_64'");
    expect(calculator).toContain('ROUND_OF_64: 10');
    expect(calculator).toContain('ROUND_OF_32: 15');
    expect(calculator).toContain('ROUND_OF_16: 25');
  });

  it('uses the confirmed group multipliers', () => {
    expect(calculator).toContain('COPA_A: 1.3');
    expect(calculator).toContain('COPA_B: 0.75');
    expect(calculator).toContain('COPA_TOTAL: 3.5');
  });

  it('calculates only from official prediction scores', () => {
    expect(calculator).toContain('official_predictions');
    expect(calculator).toContain('prediction_scores');
    expect(calculator).not.toContain('JOIN predictions ');
  });

  it('refuses silent calculation when a competition has unfinished or incomplete final results', () => {
    expect(calculator).toContain("competition.status !== 'finished'");
    expect(calculator).toContain('no tiene resultado final confirmado para todas sus entradas');
  });

  it('does not overwrite imported historical season totals', () => {
    expect(calculator).toContain("source='imported'");
    expect(calculator).toContain('No se sobrescriben automáticamente');
  });

  it('requires an explicit IFFHS recipient decision for a duo with historical substitutions', () => {
    expect(calculator).toContain('detail.iffhsUserIds');
    expect(calculator).toContain('Copa Dúos tuvo sustituciones');
  });

  it('routes admin calculation and participant-safe component breakdown', () => {
    expect(worker).toContain('/calculate');
    expect(worker).toContain('calculateIffhsSeason');
    expect(worker).toContain('requestedUserId !== user.id');
    expect(worker).toContain('No podés consultar el detalle IFFHS de otro participante');
  });

  it('keeps manual adjustments when recalculating totals', () => {
    expect(calculator).toContain("source='manual_adjustment'");
    expect(calculator).toContain('adjustmentByUser');
  });
});
