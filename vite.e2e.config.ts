import { readFileSync } from 'node:fs';
import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const storage = '.wrangler/e2e-t32';
const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
if (!config.d1_databases.every((db: { remote?: boolean }) => db.remote === false)) {
  throw new Error('E2E requires explicitly local D1 bindings');
}

export default defineConfig({
  plugins: [
    {
      name: 'local-e2e-marker',
      configureServer(server) {
        server.middlewares.use('/__e2e-local', (_request, response) => {
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({ storage, localOnly: true }));
        });
      },
    },
    react(),
    cloudflare({ persistState: { path: storage } }),
  ],
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
});
