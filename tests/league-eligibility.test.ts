import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const leagueSource = readFileSync(resolve(process.cwd(), 'worker/league.ts'), 'utf8');
const entrySource = readFileSync(resolve(process.cwd(), 'worker/entry.ts'), 'utf8');

describe('Liga late entrant contract', () => {
  it('only joins Liga rounds from the participant eligibility slot onward', () => {
    expect(leagueSource).toContain('lr.slot_number >= lp.eligible_from_slot');
  });

  it('reindexes participant eligibility when a Liga round is unlinked', () => {
    expect(leagueSource).toContain('SET eligible_from_slot = eligible_from_slot - 1');
    expect(leagueSource).toContain('eligible_from_slot > ?');
  });

  it('assigns new active participants to the first unfinished or next Liga slot', () => {
    expect(entrySource).toContain('MIN(lr.slot_number)');
    expect(entrySource).toContain("r.status <> 'finished'");
    expect(entrySource).toContain('COUNT(*) + 1');
  });

  it('syncs Liga membership after participant creation or status changes', () => {
    expect(entrySource).toContain("method === 'POST' && pathname === '/api/admin/users'");
    expect(entrySource).toContain("method === 'PUT' && /^\\/api\\/admin\\/users\\/[^/]+\\/status$/.test(pathname)");
  });
});
