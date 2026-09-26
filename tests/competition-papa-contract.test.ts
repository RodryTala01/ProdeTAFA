import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve('worker/competition-papa.ts'), 'utf8');

describe('Copa Papa contract', () => {
  it('proposes the initial mirror using previous Liga A best vs Liga B worst', () => {
    expect(worker).toContain("row.competition_code === 'LIGA_A'");
    expect(worker).toContain("row.competition_code === 'LIGA_B'");
    expect(worker).toContain('MIRROR_A_B');
    expect(worker).toContain('sort((x, y) => Number(x.final_position) - Number(y.final_position))');
    expect(worker).toContain('sort((x, y) => Number(y.final_position) - Number(x.final_position))');
  });

  it('starts from a 64-slot bracket at 33+ participants and otherwise 32', () => {
    expect(worker).toContain('count >= 33 ? 64 : 32');
    expect(worker).toContain("count >= 33 ? 'ROUND_OF_32' : 'ROUND_OF_16'");
  });

  it('requires every active participant exactly once in the initial bracket', () => {
    expect(worker).toContain('seen.size !== participants.length');
    expect(worker).toContain('La llave inicial debe incluir exactamente una vez a todos los participantes activos');
  });

  it('supports manual byes in the initial fixed bracket', () => {
    expect(worker).toContain('userBId?: string | null');
    expect(worker).toContain('entryBId: number | null');
  });

  it('advances winners sequentially without any later draw', () => {
    expect(worker).toContain('outcome.winners[index]');
    expect(worker).toContain('outcome.winners[index + 1] ?? null');
    expect(worker).not.toContain('crypto.getRandomValues');
    expect(worker).not.toContain('shuffle');
  });

  it('requires admin-confirmed winners before building the next fixed round', () => {
    expect(worker).toContain("row.status !== 'finished'");
    expect(worker).toContain('row.admin_confirmed_at == null');
  });

  it('builds the third-place match from the two confirmed semifinal losers', () => {
    expect(worker).toContain('outcome.losers.length !== 2');
    expect(worker).toContain("'THIRD'");
    expect(worker).toContain('competition.papa_third_place_built');
  });

  it('uses shared knockout encounters so TAFA tiebreaks remain available', () => {
    expect(worker).toContain('competition_encounters');
    expect(worker).toContain("stage.stage_type !== 'KNOCKOUT'");
  });
});
