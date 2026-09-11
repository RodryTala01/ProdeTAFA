import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const backend = readFileSync(resolve(process.cwd(), 'worker/admin-corrections.ts'), 'utf8');
const frontend = readFileSync(resolve(process.cwd(), 'src/AdminCorrections.tsx'), 'utf8');

describe('manual result corrections for penalty-marked matches', () => {
  it('uses the actual wentToPenalties flag instead of forcing penalties from match type', () => {
    expect(backend).toContain('wentToPenalties = Boolean(body.wentToPenalties)');
    expect(backend).not.toContain("if (match.match_type === 'PENALTIES_ONLY') {\n      try {\n        winningTeamId = validateTeam");
  });

  it('only requires a shootout winner when the correction says penalties actually happened', () => {
    expect(frontend).toContain('winningTeamId: wentToPenalties ? winningTeamId || null : null');
    expect(frontend).toContain('!isVoid && wentToPenalties && (');
  });

  it('explains the penalty bonus condition in the admin UI', () => {
    expect(frontend).toContain('el punto extra se aplica únicamente en ese caso');
  });
});
