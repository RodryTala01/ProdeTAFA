import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve('worker/competition-promotion.ts'), 'utf8');

describe('Promotion playoff contract', () => {
  it('derives Liga A promotion positions from the bottom of the final table', () => {
    expect(worker).toContain('aSize - 3');
    expect(worker).toContain('aSize - 2');
  });

  it('uses Liga B 2nd and 3rd as the base promotion slots', () => {
    expect(worker).toContain("competition.season_id, 'LIGA_B', 2");
    expect(worker).toContain("competition.season_id, 'LIGA_B', 3");
  });

  it('allows cup-driven slot shifts only through an audited admin replacement', () => {
    expect(worker).toContain('replaced && !requested.reason');
    expect(worker).toContain('por ejemplo Copa A o Copa B');
    expect(worker).toContain('competition.promotion_slots_confirmed');
  });

  it('creates exactly two simultaneous encounters on one round link', () => {
    expect(worker).toContain("'PROMO-1'");
    expect(worker).toContain("'PROMO-2'");
    expect(worker).toContain('roundLinkId, bHigh, aLow');
    expect(worker).toContain('roundLinkId, bLow, aHigh');
  });

  it('requires both results to be resolved and admin confirmed', () => {
    expect(worker).toContain('rows.length !== 2');
    expect(worker).toContain("row.status !== 'finished'");
    expect(worker).toContain('row.admin_confirmed_at == null');
  });

  it('proposes Liga A for each winner and Liga B for each loser', () => {
    expect(worker).toContain("[winner, divisionA, 'WINNER']");
    expect(worker).toContain("[loser, divisionB, 'LOSER']");
    expect(worker).toContain('season_division_movements');
  });

  it('uses shared knockout encounters so the standard TAFA tiebreak applies', () => {
    expect(worker).toContain('competition_encounters');
    expect(worker).toContain("stage.stage_type !== 'KNOCKOUT'");
  });
});
