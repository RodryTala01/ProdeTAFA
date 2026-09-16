// Datos ficticios exclusivamente para el servidor y D1 locales.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const base = 'http://127.0.0.1:5174';
const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
if (config.d1_databases.some((db) => db.remote !== false)) {
  throw new Error('Se requiere remote: false en todos los bindings D1.');
}
let cookie = '';
async function api(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    redirect: 'error',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${JSON.stringify(data)}`);
  const session = response.headers.get('set-cookie');
  if (session) cookie = session.split(';')[0];
  return data;
}

const admin = { fullName: 'Admin Prueba Local', phone: '0000000001', password: 'Admin123!' };
if ((await api('/api/setup/status')).setupRequired) {
  await api('/api/setup/admin', 'POST', admin);
} else {
  await api('/api/auth/login', 'POST', admin);
}
const participants = ['Rodrigo Prueba', 'Carlos Prueba', 'Vero Prueba', 'Azul Prueba'];
const existing = (await api('/api/admin/users')).users;
for (const [i, fullName] of participants.entries()) {
  const phone = `000000010${i + 1}`;
  if (!existing.some((user) => user.phone === phone)) {
    await api('/api/admin/users', 'POST', { fullName, phone, password: 'Prueba123!' });
  }
}

const rounds = (await api('/api/admin/rounds')).rounds;
for (let slot = 1; slot <= 5; slot++) {
  const name = `LOCAL E2E - Fecha ${slot}`;
  let round = rounds.find((item) => item.name === name);
  if (!round) round = (await api('/api/admin/rounds', 'POST', { name })).round;
  const detail = (await api(`/api/admin/rounds/${round.id}`)).round;
  if (detail.status !== 'draft') {
    console.log(`${name}: se conserva ${detail.status}, sin modificar partidos.`);
    continue;
  }
  for (let match = 1; match <= 12; match++) {
    const providerFixtureId = `local-e2e-${slot}-${match}`;
    if (detail.matches.some((item) => item.providerFixtureId === providerFixtureId)) continue;
    const number = String(match).padStart(2, '0');
    const kickoffAt = new Date(Date.now() + (6 + slot) * 86400000 + match * 3600000).toISOString();
    await api(`/api/admin/rounds/${round.id}/matches`, 'POST', {
      matchType: match >= 11 ? 'PENALTIES_ONLY' : 'NORMAL',
      fixture: {
        providerFixtureId, kickoffAt, status: 'NS', elapsedMinutes: null,
        competition: { name: 'Torneo ficticio LOCAL', logoUrl: null },
        home: { id: `local-home-${match}`, name: `Local ${number}`, logoUrl: null },
        away: { id: `local-away-${match}`, name: `Visitante ${number}`, logoUrl: null },
        goals: { home: null, away: null },
      },
    });
  }
  console.log(`${name}: draft, 12 partidos (10 NORMAL + 2 PENALTIES_ONLY).`);
}

// Excluir sólo estos fixtures ficticios draft de la sincronización del proveedor.
// No se admite URL remota ni se invoca Wrangler sin --local.
const sql = "UPDATE matches SET provider = 'local-test' WHERE provider = 'api-football' AND provider_fixture_id GLOB 'local-e2e-*' AND round_id IN (SELECT id FROM rounds WHERE status = 'draft' AND name GLOB 'LOCAL E2E - Fecha *');";
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--command', sql], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('No se pudieron aislar los fixtures de prueba.');

for (const [i, fullName] of participants.entries()) {
  cookie = '';
  const { user } = await api('/api/auth/login', 'POST', { phone: `000000010${i + 1}`, password: 'Prueba123!' });
  if (user.fullName !== fullName || user.role !== 'participant') throw new Error('Cuenta de prueba inesperada');
  await api('/api/auth/logout', 'POST');
  console.log(`Login verificado: ${fullName}`);
}
console.log('Preparación local completa. No se publicaron fechas ni se creó una Liga.');
