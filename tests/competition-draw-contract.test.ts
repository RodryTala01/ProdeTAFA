import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const drawWorker = readFileSync(resolve('worker/competition-draw.ts'), 'utf8');
const appWorker = readFileSync(resolve('worker/app.ts'), 'utf8');

describe('Copa A/B draw contract', () => {
  it('requires the IFFHS order to contain every eligible participant exactly once', () => {
    expect(drawWorker).toContain('El ranking IFFHS debe contener a todos los participantes elegibles exactamente una vez');
    expect(drawWorker).toContain('season_division_members');
  });

  it('moves the eligible defending champion to the first seed and fixes it in Group A', () => {
    expect(drawWorker).toContain('[defendingChampionUserId, ...ranking.filter');
    expect(drawWorker).toContain('groups[0].userIds.push(defendingChampionUserId)');
  });

  it('uses four groups automatically only for the standard field of sixteen', () => {
    expect(drawWorker).toContain('if (participants.length === 16) groupCount = 4');
    expect(drawWorker).toContain('Para una cantidad distinta de 16 participantes indicá cuántos grupos querés usar');
  });

  it('creates consecutive IFFHS pots based on the number of groups', () => {
    expect(drawWorker).toContain('seedOrder.slice(potStart, potStart + groupCount)');
    expect(drawWorker).toContain('potStart += groupCount');
  });

  it('stores a reproducible random seed and the full draw in audit', () => {
    expect(drawWorker).toContain('crypto.getRandomValues');
    expect(drawWorker).toContain('randomSeed');
    expect(drawWorker).toContain("'competition.groups_drawn'");
    expect(drawWorker).toContain('effectiveSeedOrder');
  });

  it('does not redraw a group stage after dates are linked', () => {
    expect(drawWorker).toContain('Desvinculá las Fechas antes de volver a sortear');
  });

  it('routes the draw handler before generic group configuration', () => {
    expect(appWorker.indexOf('handleCompetitionDraw(request, env)')).toBeLessThan(appWorker.indexOf('handleCompetitionGroups(request, env)'));
  });
});
