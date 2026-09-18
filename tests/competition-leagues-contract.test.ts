import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());
const worker = readFileSync(resolve(root, 'worker/competition-leagues.ts'), 'utf8');
const app = readFileSync(resolve(root, 'worker/app.ts'), 'utf8');

describe('T32 league standings contract', () => {
  it('routes the new league standings endpoint through the competition engine app', () => {
    expect(app).toContain('handleCompetitionLeagues');
    expect(app).toContain("pathname.startsWith('/api/competition-engine/')");
  });

  it('uses only official predictions and their derived scores', () => {
    expect(worker).toContain('official_predictions');
    expect(worker).toContain('prediction_scores');
    expect(worker).not.toContain('LEFT JOIN predictions p');
  });

  it('restricts scoring to normal linked rounds from LEAGUE_TABLE stages', () => {
    expect(worker).toContain("crl.purpose = 'NORMAL'");
    expect(worker).toContain("cs.stage_type = 'LEAGUE_TABLE'");
    expect(worker).toContain('competition_round_links');
  });

  it('keeps the TAFA ranking tiebreak order', () => {
    expect(worker).toContain('ORDER BY points DESC, fulls DESC, partials DESC, errors ASC, extras DESC');
  });

  it('returns per-round breakdowns for future movement arrows and participant detail', () => {
    expect(worker).toContain('breakdownByUser');
    expect(worker).toContain('rounds: breakdownByUser.get(row.user_id)');
    expect(worker).toContain('provisional');
  });
});
