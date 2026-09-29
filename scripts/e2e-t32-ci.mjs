import { execFileSync, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const storage = '.wrangler/e2e-t32';
const markerUrl = 'http://127.0.0.1:5174/__e2e-local';

function wrangler(args) {
  execFileSync(
    process.execPath,
    ['node_modules/wrangler/bin/wrangler.js', ...args],
    { stdio: 'inherit' },
  );
}

async function waitForServer() {
  let lastError = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(markerUrl);
      if (response.ok) {
        const data = await response.json();
        if (data?.storage === storage && data?.localOnly === true) return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`El servidor E2E local no arrancó correctamente: ${lastError instanceof Error ? lastError.message : 'timeout'}`);
}

rmSync(storage, { recursive: true, force: true });
wrangler(['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', storage]);

const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--config', 'vite.e2e.config.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, CI: '1' },
  },
);

try {
  await waitForServer();
  execFileSync(process.execPath, ['scripts/e2e-t32-local.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, CI: '1' },
  });
} finally {
  server.kill('SIGTERM');
}
