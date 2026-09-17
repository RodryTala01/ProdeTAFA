import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve('migrations/0007_iffhs.sql'), 'utf8');
const worker = readFileSync(resolve('worker/iffhs.ts'), 'utf8');

describe('IFFHS contract', () => {
  it('stores season totals independently from full historical competition reconstruction', () => {
    expect(migration).toContain('CREATE TABLE iffhs_season_totals');
    expect(migration).toContain('season_number INTEGER NOT NULL');
    expect(migration).not.toContain('REFERENCES tafa_seasons');
  });

  it('keeps auditable per-component storage for calculated seasons', () => {
    expect(migration).toContain('CREATE TABLE iffhs_season_components');
    expect(migration).toContain('competition_code');
    expect(migration).toContain('component_code');
    expect(migration).toContain('multiplier_scaled');
    expect(migration).toContain('points_scaled');
  });

  it('uses a rolling five-season window', () => {
    expect(worker).toContain('throughSeason - 4');
    expect(worker).toContain('BETWEEN ? AND ?');
  });

  it('assigns the exact same ranking position to equal point totals', () => {
    expect(worker).toContain('scaledPoints === previousPoints');
    expect(worker).toContain('? previousPosition');
  });

  it('reports missing historical seasons instead of pretending the window is complete', () => {
    expect(worker).toContain('missingSeasons');
  });

  it('supports importing old season totals with audit', () => {
    expect(worker).toContain("source = 'imported'");
    expect(worker).toContain("'iffhs.season_totals_imported'");
  });
});
