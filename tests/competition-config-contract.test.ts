import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());
const configWorker = readFileSync(resolve(root, 'worker/competition-config.ts'), 'utf8');
const appWorker = readFileSync(resolve(root, 'worker/app.ts'), 'utf8');

describe('competition configuration contract', () => {
  it('routes competition configuration before the generic competition engine', () => {
    expect(appWorker).toContain('handleCompetitionConfig');
    expect(appWorker).toContain('configResponse');
  });

  it('supports the reusable stage types defined by the competition engine design', () => {
    for (const type of [
      'LEAGUE_TABLE',
      'ACCUMULATIVE_GROUPS',
      'ROUND_ROBIN_GROUPS',
      'SURVIVAL_TABLE',
      'KNOCKOUT',
    ]) {
      expect(configWorker).toContain(`'${type}'`);
    }
  });

  it('supports competition display-name/status updates and stage CRUD', () => {
    expect(configWorker).toContain('competition.updated');
    expect(configWorker).toContain('competition_stage.created');
    expect(configWorker).toContain('competition_stage.updated');
    expect(configWorker).toContain('competition_stage.deleted');
    expect(configWorker).toContain('/competitions\\/(\\d+)\\/stages');
    expect(configWorker).toContain('/stages\\/(\\d+)');
  });

  it('prevents deleting stages that already have sporting usage', () => {
    expect(configWorker).toContain('competition_round_links');
    expect(configWorker).toContain('competition_groups');
    expect(configWorker).toContain('competition_encounters');
    expect(configWorker).toContain('competition_tiebreaks');
    expect(configWorker).toContain('No se puede eliminar una etapa');
  });
});
