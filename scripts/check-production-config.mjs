import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const REQUIRED_SECRET = 'FOOTBALL_API_KEY';
const REQUIRED_CRON = '*/10 * * * *';

function defaultRun(args) {
  return execFileSync(
    process.execPath,
    ['node_modules/wrangler/bin/wrangler.js', ...args],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label}: Wrangler no devolvió JSON válido.`);
  }
}

export function checkProductionConfig(
  run = defaultRun,
  config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8')),
) {
  const declaredSecrets = config?.secrets?.required;
  if (!Array.isArray(declaredSecrets) || !declaredSecrets.includes(REQUIRED_SECRET)) {
    throw new Error(`wrangler.jsonc no declara ${REQUIRED_SECRET} como secreto obligatorio.`);
  }

  const crons = config?.triggers?.crons;
  if (!Array.isArray(crons) || !crons.includes(REQUIRED_CRON)) {
    throw new Error(`wrangler.jsonc no declara el Cron requerido ${REQUIRED_CRON}.`);
  }

  const secrets = parseJson(
    run(['secret', 'list', '--format', 'json', '--config', 'wrangler.jsonc']),
    'secret list',
  );
  if (!Array.isArray(secrets) || !secrets.some((item) => item?.name === REQUIRED_SECRET)) {
    throw new Error(`Producción no informa el secreto ${REQUIRED_SECRET}.`);
  }

  const deployments = parseJson(
    run(['deployments', 'list', '--json', '--config', 'wrangler.jsonc']),
    'deployments list',
  );
  if (!Array.isArray(deployments) || deployments.length === 0) {
    throw new Error('No se encontró ningún deployment remoto del Worker.');
  }

  return {
    requiredSecret: REQUIRED_SECRET,
    requiredCron: REQUIRED_CRON,
    deploymentCount: deployments.length,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkProductionConfig();
    console.log(`Configuración productiva read-only OK: secreto ${result.requiredSecret}, Cron ${result.requiredCron}, deployments visibles ${result.deploymentCount}.`);
    console.log('Nota: la presencia efectiva del Cron remoto debe confirmarse también en Cloudflare Dashboard.');
  } catch (error) {
    console.error(error instanceof Error && !('status' in error)
      ? error.message
      : 'No se pudo consultar la configuración remota de Cloudflare.');
    process.exitCode = 1;
  }
}
