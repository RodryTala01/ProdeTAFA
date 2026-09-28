import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

const { unstable_splitSqlQuery: split } = createRequire(import.meta.url)('wrangler');
const migration = readFileSync('migrations/0005_official_predictions.sql', 'utf8');

describe('0005 compatible con el separador SQL de Wrangler', () => {
  for (const newline of ['\n', '\r\n']) it(`aplica desde 0004 por sentencias completas (${JSON.stringify(newline)})`, () => {
    const db = new DatabaseSync(':memory:');
    try {
      for (const name of ['0001_initial','0002_league_seasons','0003_league_entry_slot','0004_prediction_history']) {
        db.exec(readFileSync(`migrations/${name}.sql`, 'utf8'));
      }
      const statements: string[] = split(migration.replace(/\r?\n/g, newline));
      expect(statements).toHaveLength(21);
      expect(statements.filter(s => s.startsWith('CREATE TRIGGER'))).toHaveLength(10);
      // Unlike exec(fullFile), exercise each boundary used by Wrangler.
      for (const statement of statements) db.prepare(statement).run();
      expect(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='trigger' AND name LIKE '%official%'").get()).toEqual({n:10});
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      for (const statement of statements.filter(s => s.startsWith('CREATE TRIGGER'))) {
        // D1's remote splitter can mistake a bare CASE END; for the trigger end.
        expect(statement).not.toMatch(/SELECT\s+CASE\b/i);
      }
    } finally { db.close(); }
  });
});
