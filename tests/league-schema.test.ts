import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const baseMigration = readFileSync(resolve(process.cwd(), 'migrations/0002_league_seasons.sql'), 'utf8');
const entrySlotMigration = readFileSync(resolve(process.cwd(), 'migrations/0003_league_entry_slot.sql'), 'utf8');

describe('league season schema', () => {
  it('limits league slots to the five Liga dates', () => {
    expect(baseMigration).toContain('CHECK (slot_number BETWEEN 1 AND 5)');
  });

  it('prevents one Prode round from belonging to more than one Liga', () => {
    expect(baseMigration).toContain('round_id INTEGER NOT NULL UNIQUE');
  });

  it('prevents duplicate slots inside the same season', () => {
    expect(baseMigration).toContain('UNIQUE (season_id, slot_number)');
  });

  it('keeps each participant only once per season', () => {
    expect(baseMigration).toContain('PRIMARY KEY (season_id, user_id)');
  });

  it('keeps league seasons and their links relationally protected', () => {
    expect(baseMigration).toContain('FOREIGN KEY (season_id) REFERENCES league_seasons(id) ON DELETE CASCADE');
    expect(baseMigration).toContain('FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE');
    expect(baseMigration).toContain('FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
  });

  it('stores the first Liga slot a late participant is eligible to score', () => {
    expect(entrySlotMigration).toContain('eligible_from_slot INTEGER NOT NULL DEFAULT 1');
    expect(entrySlotMigration).toContain('CHECK (eligible_from_slot BETWEEN 1 AND 6)');
  });
});
