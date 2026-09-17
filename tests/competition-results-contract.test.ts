import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve('migrations/0008_competition_results.sql'), 'utf8');
const worker = readFileSync(resolve('worker/competition-results.ts'), 'utf8');

describe('competition results contract', () => {
  it('stores one confirmed final result per competition entry', () => {
    expect(migration).toContain('CREATE TABLE competition_results');
    expect(migration).toContain('UNIQUE (competition_id, entry_id)');
  });

  it('keeps the stage and final position that explain the result', () => {
    expect(migration).toContain('stage_id INTEGER');
    expect(migration).toContain('result_code TEXT NOT NULL');
    expect(migration).toContain('final_position INTEGER');
  });

  it('supports all result codes needed by the currently defined Cups', () => {
    for (const code of ['CHAMPION', 'RUNNER_UP', 'SEMIFINAL', 'QUARTERFINAL', 'ROUND_OF_16', 'ROUND_OF_32', 'PHASE_5', 'PHASE_2']) {
      expect(worker).toContain(`'${code}'`);
    }
  });

  it('validates entries and stages against the selected competition', () => {
    expect(worker).toContain('entry_id = ? AND competition_id = ?');
    expect(worker).toContain('id = ? AND competition_id = ?');
  });

  it('audits replacements instead of silently overwriting sporting history', () => {
    expect(worker).toContain("'competition.results_confirmed'");
    expect(worker).toContain('before_json');
    expect(worker).toContain('after_json');
  });
});
