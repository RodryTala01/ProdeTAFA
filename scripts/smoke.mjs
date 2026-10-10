const baseUrl = (process.env.BASE_URL || process.argv[2] || '').replace(/\/$/, '');

if (!baseUrl) {
  console.error('Falta BASE_URL. Ejemplo: BASE_URL=https://prode-tafa.<subdominio>.workers.dev npm run smoke:prod');
  process.exit(1);
}

async function request(path) {
  return fetch(`${baseUrl}${path}`, { redirect: 'follow' });
}

async function check(path, validate) {
  const response = await request(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  await validate(response);
  console.log(`✓ ${path}`);
}

async function checkStatus(path, expectedStatus) {
  const response = await request(path);
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: HTTP ${response.status}; se esperaba ${expectedStatus}`);
  }
  console.log(`✓ ${path} → HTTP ${expectedStatus}`);
}

try {
  await check('/api/health', async (response) => {
    const data = await response.json();
    if (data?.ok !== true || data?.app !== 'prode-tafa') {
      throw new Error('/api/health: respuesta inesperada');
    }
  });

  await check('/api/health/deep', async (response) => {
    const data = await response.json();
    const missingTables = Array.isArray(data?.missingTables) ? data.missingTables : null;
    const missingColumns = Array.isArray(data?.missingColumns) ? data.missingColumns : null;
    const missingTriggers = Array.isArray(data?.missingTriggers) ? data.missingTriggers : null;
    if (
      data?.ok !== true ||
      data?.schemaReady !== true ||
      data?.leagueSchemaReady !== true ||
      data?.competitionEngineSchemaReady !== true ||
      data?.officialPredictionsReady !== true ||
      data?.triggerSchemaReady !== true ||
      data?.migrationLedgerReady !== true ||
      data?.minimumMigration !== '0015_promiedos_cache.sql' ||
      data?.singleOpenRoundReady !== true ||
      missingTables === null || missingTables.length !== 0 ||
      missingColumns === null || missingColumns.length !== 0 ||
      missingTriggers === null || missingTriggers.length !== 0
    ) {
      throw new Error('/api/health/deep: esquema productivo T32, triggers o consistencia de Fechas inválidos');
    }
  });

  await check('/api/setup/status', async (response) => {
    const data = await response.json();
    if (data?.setupRequired !== false) {
      throw new Error('/api/setup/status: producción no tiene administrador inicial configurado');
    }
  });

  // Read-only route probes: these must exist and reject anonymous access.
  await checkStatus('/api/auth/me', 401);
  await checkStatus('/api/admin/competition-engine', 401);
  await checkStatus('/api/competition-engine/current', 401);
  await checkStatus('/api/competition-engine/iffhs/ranking', 401);
  await checkStatus('/api/competition-engine/leagues/A/standings', 401);
  await checkStatus('/api/participant/rounds/1/competition-contexts', 403);

  await check('/', async (response) => {
    const html = await response.text();
    if (!html.includes('id="root"') || !html.includes('Prode TAFA')) {
      throw new Error('/: no parece ser el frontend de Prode TAFA');
    }
  });

  await check('/manifest.webmanifest', async (response) => {
    const manifest = await response.json();
    const iconSizes = new Set((manifest?.icons ?? []).map((icon) => icon?.sizes));
    if (!manifest?.name || !manifest?.start_url || manifest?.display !== 'standalone') {
      throw new Error('/manifest.webmanifest: manifest inválido');
    }
    if (!iconSizes.has('192x192') || !iconSizes.has('512x512')) {
      throw new Error('/manifest.webmanifest: faltan iconos instalables 192x192 o 512x512');
    }
  });

  await check('/sw.js', async (response) => {
    const source = await response.text();
    if (!source.includes('fetch') || !source.includes('/api/')) {
      throw new Error('/sw.js: service worker inesperado');
    }
  });

  console.log(`\nSmoke test T32 OK: ${baseUrl}`);
} catch (error) {
  console.error(`\nSmoke test FALLÓ: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
