const baseUrl = (process.env.BASE_URL || process.argv[2] || '').replace(/\/$/, '');

if (!baseUrl) {
  console.error('Falta BASE_URL. Ejemplo: BASE_URL=https://prode-tafa.<subdominio>.workers.dev npm run smoke:prod');
  process.exit(1);
}

async function check(path, validate) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  await validate(response);
  console.log(`✓ ${path}`);
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
    if (data?.ok !== true || data?.leagueSchemaReady !== true || !Array.isArray(data?.missingTables) || data.missingTables.length !== 0) {
      throw new Error('/api/health/deep: la D1 desplegada no tiene listo el esquema de Liga');
    }
  });

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

  console.log(`\nSmoke test OK: ${baseUrl}`);
} catch (error) {
  console.error(`\nSmoke test FALLÓ: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
