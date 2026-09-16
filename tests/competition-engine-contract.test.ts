import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const worker = readFileSync(resolve(process.cwd(), 'worker/competitions.ts'), 'utf8');
const wrapper = readFileSync(resolve(process.cwd(), 'worker/app.ts'), 'utf8');
const adminUi = readFileSync(resolve(process.cwd(), 'src/AdminCompetitions.tsx'), 'utf8');
const appUi = readFileSync(resolve(process.cwd(), 'src/AppV2.tsx'), 'utf8');
const wrangler = readFileSync(resolve(process.cwd(), 'wrangler.jsonc'), 'utf8');

describe('T32 competition engine contracts', () => {
  it('creates the complete habitual T32 competition template', () => {
    for (const code of ['LIGA_A', 'LIGA_B', 'COPA_A', 'COPA_B', 'COPA_TOTAL', 'COPA_DUOS', 'COPA_CAMPEONES', 'COPA_PAPA', 'PROMOCION']) {
      expect(worker).toContain(`code: '${code}'`);
    }
  });

  it('boots Liga A and Liga B with reusable league-table stages', () => {
    expect(worker).toContain("c.code IN ('LIGA_A', 'LIGA_B')");
    expect(worker).toContain("'LEAGUE_TABLE'");
  });

  it('lets the same real round be linked through the generic many-to-many route', () => {
    expect(worker).toContain('const linkMatch = pathname.match(');
    expect(worker).toContain('competition-engine\\/competitions\\/(\\d+)\\/rounds');
    expect(worker).toContain('INSERT INTO competition_round_links');
    expect(adminUi).toContain('La misma Fecha puede usarse en otra competición');
  });

  it('keeps division assignment separate from legacy league_participants', () => {
    expect(worker).toContain('season_division_members');
    expect(worker).not.toContain('INSERT INTO league_participants');
  });

  it('exposes competition administration without removing the legacy Liga screen', () => {
    expect(appUi).toContain("import AdminCompetitions from './AdminCompetitions'");
    expect(appUi).toContain('>Competiciones</button>');
    expect(appUi).toContain('>Liga actual</button>');
  });

  it('keeps the worker on local D1 configuration and routes the new API before the existing worker', () => {
    expect(wrangler).toContain('"main": "./worker/app.ts"');
    expect(wrangler).toContain('"remote": false');
    expect(wrapper).toContain('handleCompetitionEngine');
    expect(wrapper).toContain('entryWorker.fetch');
  });

  it('provides a participant-safe current-season endpoint for future competition context', () => {
    expect(worker).toContain("pathname === '/api/competition-engine/current'");
    expect(worker).toContain('participantCurrent');
  });
});
