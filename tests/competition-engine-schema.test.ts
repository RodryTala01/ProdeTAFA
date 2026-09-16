import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'migrations/0006_competition_engine.sql'), 'utf8');

describe('generic competition engine schema', () => {
  it('creates a global TAFA season independent from the legacy Liga season', () => {
    expect(migration).toContain('CREATE TABLE tafa_seasons');
    expect(migration).toContain('season_number INTEGER NOT NULL UNIQUE');
    expect(migration).toContain("status IN ('draft', 'active', 'finished', 'archived')");
  });

  it('stores exactly one division per participant inside a season', () => {
    expect(migration).toContain('CREATE TABLE season_division_members');
    expect(migration).toContain('PRIMARY KEY (season_id, user_id)');
  });

  it('allows one Prode round to feed multiple competitions', () => {
    expect(migration).toContain('CREATE TABLE competition_round_links');
    expect(migration).toContain('round_id INTEGER NOT NULL,');
    expect(migration).toContain('UNIQUE (competition_id, stage_id, round_id, purpose)');
    expect(migration).not.toContain('CREATE TABLE competition_round_links (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  competition_id INTEGER NOT NULL,\n  stage_id INTEGER NOT NULL,\n  round_id INTEGER NOT NULL UNIQUE');
  });

  it('supports the five reusable stage families needed by TAFA', () => {
    for (const stageType of ['LEAGUE_TABLE', 'ACCUMULATIVE_GROUPS', 'ROUND_ROBIN_GROUPS', 'SURVIVAL_TABLE', 'KNOCKOUT']) {
      expect(migration).toContain(stageType);
    }
  });

  it('supports individual and duo competition entries with historical membership windows', () => {
    expect(migration).toContain("entry_type IN ('INDIVIDUAL', 'DUO')");
    expect(migration).toContain('valid_from_round_id INTEGER');
    expect(migration).toContain('valid_to_round_id INTEGER');
  });

  it('supports explicit match segments for Copa Total', () => {
    expect(migration).toContain('CREATE TABLE competition_round_segments');
    expect(migration).toContain('CREATE TABLE competition_round_segment_matches');
    expect(migration).toContain('FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE');
  });

  it('stores generic groups, encounters, bonuses and tiebreaks', () => {
    expect(migration).toContain('CREATE TABLE competition_groups');
    expect(migration).toContain('CREATE TABLE competition_encounters');
    expect(migration).toContain('CREATE TABLE competition_entry_bonuses');
    expect(migration).toContain('CREATE TABLE competition_tiebreaks');
    expect(migration).toContain('CREATE TABLE competition_tiebreak_rounds');
  });

  it('adds the requested primary round categories without restricting sporting reuse', () => {
    expect(migration).toContain("CHECK (category IN ('LIGA', 'COPA', 'DESEMPATE', 'AMISTOSO'))");
  });

  it('keeps promotion and relegation decisions explicit and auditable', () => {
    expect(migration).toContain('CREATE TABLE season_division_movements');
    expect(migration).toContain("status IN ('proposed', 'confirmed', 'cancelled')");
  });
});
