import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve('worker/competition-tiebreak.ts'), 'utf8');
const app = readFileSync(resolve('worker/app.ts'), 'utf8');

describe('TAFA competition tiebreak contract', () => {
  it('uses Buenos Aires calendar days explicitly', () => {
    expect(worker).toContain("America/Argentina/Buenos_Aires");
    expect(worker).toContain('localDay(m.kickoff_at)');
  });

  it('scores tiebreak matches from official predictions only', () => {
    expect(worker).toContain('official_predictions');
    expect(worker).toContain('prediction_scores');
    expect(worker).not.toContain('JOIN predictions ');
  });

  it('waits for a non-final day to be complete before comparing it', () => {
    expect(worker).toContain("state: 'WAITING_DAY'");
    expect(worker).toContain("state: 'RESOLVED_DAY'");
    expect(worker).toContain('day.scoreA !== day.scoreB');
  });

  it('switches to match-by-match sudden difference on the final day', () => {
    expect(worker).toContain("state: 'RESOLVED_MATCH'");
    expect(worker).toContain('runningA += match.scoreA');
    expect(worker).toContain('runningB += match.scoreB');
    expect(worker).toContain('runningA !== runningB');
  });

  it('keeps an exhausted tie unresolved for another round or admin action', () => {
    expect(worker).toContain("state: 'EXHAUSTED_TIED'");
    expect(worker).toContain('El Admin puede agregar otra Fecha Desempate o resolverlo manualmente');
  });

  it('requires a chronologically later date than the original Cup round', () => {
    expect(worker).toContain('La Fecha de desempate debe ser cronológicamente posterior a la Fecha original');
  });

  it('writes the resolved winner back to the original encounter without changing League use of that round', () => {
    expect(worker).toContain("resolution = 'tiebreak'");
    expect(worker).toContain('competition_tiebreak_rounds');
    expect(worker).not.toContain('UPDATE competition_round_links');
  });

  it('routes tiebreak evaluation before generic knockout handling', () => {
    expect(app).toContain('handleCompetitionTiebreak');
    expect(app.indexOf('handleCompetitionTiebreak(request, env)')).toBeLessThan(app.indexOf('handleCompetitionKnockout(request, env)'));
  });
});
