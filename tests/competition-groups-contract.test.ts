import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const groupsWorker = readFileSync(resolve('worker/competition-groups.ts'), 'utf8');
const appWorker = readFileSync(resolve('worker/app.ts'), 'utf8');

describe('competition groups contract', () => {
  it('scores cumulative groups from official predictions only', () => {
    expect(groupsWorker).toContain('official_predictions');
    expect(groupsWorker).toContain('prediction_scores');
    expect(groupsWorker).not.toContain('LEFT JOIN predictions ');
  });

  it('uses the confirmed Copa A/B tiebreak order', () => {
    expect(groupsWorker).toContain('points DESC, fulls DESC, partials DESC, errors ASC, extras DESC');
  });

  it('maps group positions to the confirmed destinations', () => {
    expect(groupsWorker).toContain("position === 1 ? 'QUARTERFINAL' : position <= 3 ? 'ROUND_OF_16' : 'ELIMINATED'");
  });

  it('requires every division member exactly once when groups are configured', () => {
    expect(groupsWorker).toContain('Un participante no puede aparecer en dos grupos');
    expect(groupsWorker).toContain('Faltan participantes de la división');
    expect(groupsWorker).toContain('season_division_members');
  });

  it('does not allow replacing groups after linked rounds exist', () => {
    expect(groupsWorker).toContain('Desvinculá las Fechas antes de reemplazar los grupos');
  });

  it('routes the group engine before the generic competition handler', () => {
    expect(appWorker).toContain('handleCompetitionGroups');
    expect(appWorker.indexOf('handleCompetitionGroups(request, env)')).toBeLessThan(appWorker.indexOf('handleCompetitionEngine(request, env)'));
  });
});
