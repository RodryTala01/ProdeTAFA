import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/entry';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  MINIMUM_PRODUCTION_MIGRATION,
  REQUIRED_PRODUCTION_COLUMNS,
  REQUIRED_PRODUCTION_TABLES,
  REQUIRED_PRODUCTION_TRIGGERS,
  T32_PRODUCTION_TABLES,
} from '../worker/health-schema';
import { checkProductionConfig } from '../scripts/check-production-config.mjs';

const migrationFiles = readdirSync('migrations').filter((name) => name.endsWith('.sql')).sort();
const allSql = migrationFiles.map((name) => readFileSync(`migrations/${name}`, 'utf8')).join('\n');
const t32Sql = migrationFiles
  .filter((name) => name >= '0006' && name < '0015')
  .map((name) => readFileSync(`migrations/${name}`, 'utf8'))
  .join('\n');

function createdTables(sql: string) {
  return [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([A-Za-z0-9_]+)/gi)]
    .map((match) => match[1])
    .sort();
}

function migratedDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec(allSql);
  db.exec('CREATE TABLE d1_migrations(name TEXT)');
  for(const name of migrationFiles)db.prepare('INSERT INTO d1_migrations VALUES(?)').run(name);
  return db;
}

describe('contrato de health productivo', () => {
  it('cubre todas las tablas creadas por las migraciones actuales', () => {
    expect([...REQUIRED_PRODUCTION_TABLES].sort()).toEqual(createdTables(allSql));
    expect([...T32_PRODUCTION_TABLES].sort()).toEqual(createdTables(t32Sql));
  });

  it('cubre todas las columnas del esquema migrado', () => {
    const requiredColumns = Object.entries(REQUIRED_PRODUCTION_COLUMNS)
      .flatMap(([table, columns]) => columns.map((column) => `${table}.${column}`))
      .sort();
    const db=migratedDatabase();
    try {
      const actual=REQUIRED_PRODUCTION_TABLES.flatMap(table=>db.prepare('PRAGMA table_info('+table+')').all().map(c=>table+'.'+c.name)).sort();
      expect(requiredColumns).toEqual(actual);
    } finally {db.close();}
  });

  it('cubre todos los triggers versionados', () => {
    const db=migratedDatabase();
    try {expect([...REQUIRED_PRODUCTION_TRIGGERS].sort()).toEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").all().map(r=>r.name));}
    finally {db.close();}
  });

  it('exige como mínimo la última migración versionada', () => {
    expect(MINIMUM_PRODUCTION_MIGRATION).toBe(migrationFiles.at(-1));
  });
});

describe('smoke T32 read-only', () => {
  const source = readFileSync('scripts/smoke.mjs', 'utf8');

  it('valida health completo y las principales rutas protegidas sin escribir', () => {
    for (const marker of [
      'competitionEngineSchemaReady',
      'triggerSchemaReady',
      'migrationLedgerReady',
      '/api/admin/competition-engine',
      '/api/competition-engine/current',
      '/api/competition-engine/iffhs/ranking',
      '/api/competition-engine/leagues/A/standings',
      '/api/participant/rounds/1/competition-contexts',
    ]) {
      expect(source).toContain(marker);
    }
    expect(source).not.toMatch(/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
  });
});

describe('preflight de configuración productiva', () => {
  const config = {
    secrets: { required: ['FOOTBALL_API_KEY'] },
    triggers: { crons: ['*/10 * * * *'] },
  };

  it('consulta secreto y deployments sin ejecutar acciones de escritura', () => {
    const run = vi.fn((args: string[]) => {
      if (args[0] === 'secret') return JSON.stringify([{ name: 'FOOTBALL_API_KEY', type: 'secret_text' }]);
      if (args[0] === 'deployments') return JSON.stringify([{ id: 'deployment-1' }]);
      throw new Error(`comando inesperado: ${args.join(' ')}`);
    });

    expect(checkProductionConfig(run, config)).toEqual({
      requiredSecret: 'FOOTBALL_API_KEY',
      requiredCron: '*/10 * * * *',
      deploymentCount: 1,
    });
    expect(run.mock.calls.map(([args]) => args.slice(0, 2))).toEqual([
      ['secret', 'list'],
      ['deployments', 'list'],
    ]);
  });

  it('bloquea secreto, cron o deployment faltantes', () => {
    const goodRun = (args: string[]) => args[0] === 'secret'
      ? JSON.stringify([{ name: 'FOOTBALL_API_KEY' }])
      : JSON.stringify([{ id: 'deployment-1' }]);

    expect(() => checkProductionConfig(goodRun, {
      secrets: { required: [] },
      triggers: { crons: ['*/10 * * * *'] },
    })).toThrow(/FOOTBALL_API_KEY/);

    expect(() => checkProductionConfig(goodRun, {
      secrets: { required: ['FOOTBALL_API_KEY'] },
      triggers: { crons: [] },
    })).toThrow(/Cron/);

    expect(() => checkProductionConfig(
      (args) => args[0] === 'secret' ? JSON.stringify([{ name: 'FOOTBALL_API_KEY' }]) : '[]',
      config,
    )).toThrow(/deployment/);
  });
});

// Exercise health against real migration output, including DROP TRIGGER in 0005.
describe('health profundo sobre SQLite migrada',()=>{
  it.each(['complete','missing-ledger','missing-column','missing-trigger','missing-rounds'])('%s',async(mode)=>{
    const db=migratedDatabase();
    try {
      if(mode==='missing-ledger')db.exec("DELETE FROM d1_migrations WHERE name='0007_iffhs.sql'");
      if(mode==='missing-column')db.exec('ALTER TABLE competition_survival_results DROP COLUMN members_json');
      if(mode==='missing-trigger')db.exec('DROP TRIGGER audit_official_insert');
      if(mode==='missing-rounds'){db.exec('PRAGMA foreign_keys=OFF');db.exec('DROP TABLE rounds');}
      const DB={prepare(sql:string){
        expect(sql).toMatch(/^(SELECT|PRAGMA)/);
        return {async all(){return {results:db.prepare(sql).all()};},async first(){return db.prepare(sql).get()??null;}};
      }};
      const r=await worker.fetch(new Request('http://local/api/health/deep'),{DB} as any,{} as any);
      const body:any=await r.json();
      expect(r.status).toBe(mode==='complete'?200:503);
      expect(body.ok).toBe(mode==='complete');
      if(mode==='complete'){expect(body.missingTriggers).toEqual([]);expect(body.migrationLedgerReady).toBe(true);}
      if(mode==='missing-ledger')expect(body.missingMigrations).toEqual(['0007_iffhs.sql']);
      if(mode==='missing-column')expect(body.missingColumns).toContain('competition_survival_results.members_json');
      if(mode==='missing-trigger')expect(body.missingTriggers).toContain('audit_official_insert');
    } finally {db.close();}
  });
});
