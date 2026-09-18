import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve('worker/competition-duos.ts'), 'utf8');

describe('Copa Duos progression contract', () => {
  it('builds semifinals from the confirmed top four', () => {
    expect(worker).toContain("row.decision === 'QUALIFIED'");
    expect(worker).toContain("positions.includes(position)");
    expect(worker).toContain("'SF-1'");
    expect(worker).toContain("'SF-2'");
  });

  it('pairs 1st vs 4th and 2nd vs 3rd', () => {
    expect(worker).toContain('const first = byPosition.get(1)!');
    expect(worker).toContain('const fourth = byPosition.get(4)!');
    expect(worker).toContain('const second = byPosition.get(2)!');
    expect(worker).toContain('const third = byPosition.get(3)!');
    expect(worker).toContain('first, fourth');
    expect(worker).toContain('second, third');
  });

  it('gives exactly +2 to first and second for semifinals', () => {
    expect(worker).toContain("VALUES (?,?,?,?,2,?)");
    expect(worker).toContain('SEMIFINAL_SEED:1');
    expect(worker).toContain('SEMIFINAL_SEED:2');
  });

  it('requires both semifinals to be resolved and admin confirmed before final', () => {
    expect(worker).toContain("encounters.length !== 2");
    expect(worker).toContain("row.status !== 'finished'");
    expect(worker).toContain('row.admin_confirmed_at == null');
  });

  it('builds one final and no third-place encounter', () => {
    expect(worker).toContain("'FINAL'");
    expect(worker).not.toContain("'THIRD'");
    expect(worker).not.toContain('third-place');
  });

  it('uses the shared knockout engine data model so TAFA tiebreaks remain available', () => {
    expect(worker).toContain('competition_encounters');
    expect(worker).toContain("stage_type !== 'KNOCKOUT'");
    expect(worker).toContain('competition_entry_bonuses');
  });

  it('supports audited member substitution from an exact round forward', () => {
    expect(worker).toContain('competition.duos_member_substituted');
    expect(worker).toContain('valid_to_round_id=?');
    expect(worker).toContain('valid_from_round_id)');
    expect(worker).toContain('effectiveRoundId');
  });

  it('does not allow retroactive substitution on a finished round', () => {
    expect(worker).toContain("linkedRound.status === 'finished'");
    expect(worker).toContain('No se puede hacer una sustitución retroactiva');
  });

  it('keeps historical membership periods queryable', () => {
    expect(worker).toContain('duoMemberHistory');
    expect(worker).toContain('validUntilBeforeRoundId');
    expect(worker).toContain('/duos/members');
  });

  it('uses exclusive membership end bounds so the incoming member owns the effective round', () => {
    expect(worker).toContain('valid_to_round_id IS NULL OR cem.valid_to_round_id>?');
  });
});
