import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve('migrations/0009_stage_qualifiers.sql'), 'utf8');
const worker = readFileSync(resolve('worker/competition-total-progression.ts'), 'utf8');
const app = readFileSync(resolve('worker/app.ts'), 'utf8');

describe('Copa Total progression contract', () => {
  it('persists an auditable qualification snapshot', () => {
    expect(migration).toContain('CREATE TABLE competition_stage_qualifiers');
    expect(migration).toContain("qualification_type IN ('DIRECT', 'WILDCARD', 'MANUAL')");
    expect(migration).toContain('UNIQUE (target_stage_id, entry_id)');
    expect(worker).toContain("'competition.total_qualifiers_confirmed'");
  });

  it('uses the confirmed Copa Total group criteria for wildcard ranking', () => {
    expect(worker).toContain('b.points - a.points');
    expect(worker).toContain('b.gd - a.gd');
    expect(worker).toContain('b.gf - a.gf');
    expect(worker).toContain('b.won - a.won');
  });

  it('does not invent a tiebreak at the wildcard cutoff', () => {
    expect(worker).toContain('Hay empate total en el corte de mejores terceros/comodines');
    expect(worker).toContain('manualWildcardEntryIds');
  });

  it('supports the ideal first and second places plus configurable wildcards', () => {
    expect(worker).toContain(': [1, 2]');
    expect(worker).toContain('wildcardPosition');
    expect(worker).toContain('wildcardCount');
    expect(worker).toContain('manualQualifiedEntryIds');
  });

  it('requires Admin-confirmed winners before building the next round', () => {
    expect(worker).toContain('admin_confirmed_at == null');
    expect(worker).toContain('confirmados por Admin');
  });

  it('supports manual pairings, random draws, final and third place', () => {
    expect(worker).toContain('Indicá los cruces manualmente o pedí sorteo aleatorio');
    expect(worker).toContain('randomSeed');
    expect(worker).toContain("mode === 'third-place'");
    expect(worker).toContain("'competition.total_third_place_built'");
  });

  it('is routed through the competition engine without touching the legacy API', () => {
    expect(app).toContain('handleCompetitionTotalProgression');
    expect(app).toContain('totalProgressionResponse');
  });
});
