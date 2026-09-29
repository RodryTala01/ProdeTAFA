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
  .filter((name) => name >= '0006')
  .map((name) => readFileSync(`migrations/${name}`, 'utf8'))
  .join('\n');

function createdTables(sql: string) {
  return [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([A-Za-z0-9_]+)/gi)]
    .map((match) => match[1])
    .sort();
}

function createdTriggers(sql: string) {
  return [...sql.matchAll(/CREATE TRIGGER(?: IF NOT EXISTS)?\s+([A-Za-z0-9_]+)/gi)]
    .map((match) => match[1])
    .sort();
}

function addedColumns(sql: string) {
  return [...sql.matchAll(/ALTER TABLE\s+([A-Za-z0-9_]+)\s+ADD COLUMN\s+([A-Za-z0-9_]+)/gi)]
    .map((match) => `${match[1]}.${match[2]}`)
    .sort();
}

describe('contrato de health productivo', () => {
  it('cubre todas las tablas creadas por las migraciones actuales', () => {
    expect([...REQUIRED_PRODUCTION_TABLES].sort()).toEqual(createdTables(allSql));
    expect([...T32_PRODUCTION_TABLES].sort()).toEqual(createdTables(t32Sql));
  });

  it('cubre las columnas agregadas por ALTER TABLE', () => {
    const requiredColumns = Object.entries(REQUIRED_PRODUCTION_COLUMNS)
      .flatMap(([table, columns]) => columns.map((column) => `${table}.${column}`))
      .sort();
    expect(requiredColumns).toEqual(addedColumns(allSql));
  });

  it('cubre todos los triggers versionados', () => {
    expect([...REQUIRED_PRODUCTION_TRIGGERS].sort()).toEqual(createdTriggers(allSql));
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
