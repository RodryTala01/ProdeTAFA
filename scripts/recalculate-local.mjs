// Maintenance after a local migration. Never enables remote bindings.
import { readFileSync } from 'node:fs';
import { getPlatformProxy } from 'wrangler';
import { recalculateRoundScores } from '../worker/scoring.ts';

const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
if (config.d1_databases.some((binding) => binding.remote !== false)) throw new Error('D1 must be explicitly local');
const proxy = await getPlatformProxy({ configPath: 'wrangler.jsonc', remoteBindings: false, persist: { path: '.wrangler/state/v3' } });
try {
  const rounds = await proxy.env.DB.prepare('SELECT id FROM rounds').all();
  for (const round of rounds.results) {
    const count = await recalculateRoundScores(round.id, { DB: proxy.env.DB });
    console.log(`Local round ${round.id}: ${count} official scores calculated`);
  }
} finally { await proxy.dispose(); }
