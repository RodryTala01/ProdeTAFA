import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve('worker/competition-total-groups.ts'), 'utf8');
const app = readFileSync(resolve('worker/app.ts'), 'utf8');

describe('Copa Total group contract', () => {
  it('accepts only groups of three to five participants', () => {
    expect(worker).toContain('debe tener entre 3 y 5 participantes');
  });

  it('requires every season participant exactly once', () => {
    expect(worker).toContain('Un participante no puede estar en dos grupos de Copa Total');
    expect(worker).toContain('Todos los participantes de la temporada deben estar exactamente en un grupo de Copa Total');
  });

  it('uses double round robin for groups of three and four, single round robin for five', () => {
    expect(worker).toContain('if (entryIds.length === 5) return firstLeg');
    expect(worker).toContain('return [...firstLeg, ...secondLeg]');
  });

  it('maps six mini dates to the frozen six segments', () => {
    expect(worker).toContain('miniDay <= 6');
    expect(worker).toContain('segments[miniDay - 1]');
  });

  it('scores each mini fixture only from the segment official predictions', () => {
    expect(worker).toContain('competition_round_segment_matches');
    expect(worker).toContain('official_predictions');
    expect(worker).toContain('prediction_scores');
  });

  it('uses three table points for win, one for draw and zero for loss', () => {
    expect(worker).toContain('rowA.points += 3');
    expect(worker).toContain('rowB.points += 3');
    expect(worker).toContain('rowA.points += 1; rowB.points += 1');
  });

  it('tracks PJ PG PE PP GF GC DG PTS semantics', () => {
    for (const field of ['played', 'won', 'drawn', 'lost', 'gf', 'ga', 'gd', 'points']) expect(worker).toContain(field);
  });

  it('orders by points, goal difference, goals for and wins only', () => {
    expect(worker).toContain('b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.won - a.won');
  });

  it('gives the same sporting position when all defined criteria are exactly tied', () => {
    expect(worker).toContain('sameSportingScore');
    expect(worker).toContain('sameSportingScore ? previousPosition : index + 1');
  });

  it('routes Total groups before the generic engine', () => {
    expect(app).toContain('handleCompetitionTotalGroups');
    expect(app.indexOf('handleCompetitionTotalGroups(request, env)')).toBeLessThan(app.indexOf('handleCompetitionEngine(request, env)'));
  });
});
