import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve('worker/competition-total-segments.ts'), 'utf8');
const app = readFileSync(resolve('worker/app.ts'), 'utf8');

describe('Copa Total segments contract', () => {
  it('accepts the first group date before the second is linked', () => {
    expect(worker).toContain('Vinculá una o dos Fechas para programar progresivamente Copa Total');
  });

  it('requires twelve real matches before splitting a date', () => {
    expect(worker).toContain('debe tener exactamente 12 partidos antes de crear sus segmentos');
  });

  it('creates exactly three four-match segments per date', () => {
    expect(worker).toContain('local<=3');
    expect(worker).toContain('(local-1)*4');
    expect(worker).toContain('ids.slice((local-1)*4,local*4)');
  });

  it('stores explicit match ids instead of a visual index range', () => {
    expect(worker).toContain('competition_round_segment_matches');
    expect(worker).toContain('match_id');
  });

  it('orders the twelve matches by kickoff and id before freezing segment membership', () => {
    expect(worker).toContain('ORDER BY kickoff_at,id');
  });

  it('creates six chronological mini dates across both Cup dates', () => {
    expect(worker).toContain('(Number(link.sequence)-1)*3+local');
    expect(worker).toContain('`MINI_${mini}`');
  });

  it('preserves frozen segments when adding the second date', () => {
    expect(worker).toContain('continue; // Frozen mini-dates remain intact');expect(worker).not.toContain('DELETE FROM competition_round_segments');
  });

  it('routes Total segments before the generic engine', () => {
    expect(app).toContain('handleCompetitionTotalSegments');
    expect(app.indexOf('handleCompetitionTotalSegments(request, env)')).toBeLessThan(app.indexOf('handleCompetitionEngine(request, env)'));
  });
});
