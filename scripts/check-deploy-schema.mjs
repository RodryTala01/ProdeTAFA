import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Read only: never apply migrations or initialize a missing migration ledger.
export function checkDeploySchema(run = (args) => execFileSync(process.execPath,
  ['node_modules/wrangler/bin/wrangler.js', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
  expected = readdirSync('migrations').filter(name => name.endsWith('.sql')).sort()) {
  const output = JSON.parse(run(['d1', 'execute', 'DB', '--remote', '--config', 'wrangler.jsonc',
    '--command', 'SELECT name FROM d1_migrations ORDER BY name', '--json']));
  if (!Array.isArray(output) || output.length !== 1 || output[0].success !== true ||
      !Array.isArray(output[0].results) || output[0].results.some(row => typeof row.name !== 'string')) {
    throw new Error('No se pudo verificar el registro de migraciones. Deploy bloqueado.');
  }
  const applied = output[0].results.map(row => row.name);
  const missing = expected.filter(name => !applied.includes(name));
  const unknown = applied.filter(name => !expected.includes(name));
  if (!expected.length || missing.length || unknown.length) {
    throw new Error(`Deploy bloqueado: migraciones pendientes [${missing.join(', ')}]; desconocidas [${unknown.join(', ')}]. Revisar DEPLOY-SAFETY.md. No se modificó D1.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    checkDeploySchema();
    console.log('Registro de migraciones completo. D1 no fue modificada.');
  } catch (error) {
    // Do not print CLI output, credentials or environment on failure.
    console.error(error instanceof Error && !('status' in error)
      ? error.message : 'No se pudo consultar el esquema remoto. Deploy bloqueado; D1 no fue modificada.');
    process.exitCode = 1;
  }
}
