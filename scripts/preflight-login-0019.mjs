// One-time, approved production release preflight. Fails closed unless the only
// pending D1 migration is 0019_login_rate_limits.sql. No remote writes.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function preflightLogin0019(run = (args) =>
  execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args],
    {encoding:'utf8',stdio:['ignore','pipe','pipe']})) {
  const expected = readdirSync('migrations').filter(name=>name.endsWith('.sql')).sort();
  const approved = '0019_login_rate_limits.sql';
  if(expected.at(-1)!==approved)throw new Error('Versiones de migración inesperadas; intervención requerida');
  const raw = run(['d1','execute','DB','--remote','--config','wrangler.jsonc',
    '--command','SELECT name FROM d1_migrations ORDER BY name','--json']);
  const result = JSON.parse(raw);
  if(!Array.isArray(result)||result.length!==1||result[0]?.success!==true||
    !Array.isArray(result[0]?.results)||result[0].results.some(row=>typeof row.name!=='string'))
    throw new Error('Registro remoto de migraciones no verificable');
  const applied=result[0].results.map(row=>row.name);
  const unknown=applied.filter(name=>!expected.includes(name));
  const missing=expected.filter(name=>!applied.includes(name));
  if(unknown.length || missing.some(name=>name!==approved))
    throw new Error('D1 tiene migraciones faltantes o desconocidas: liberación bloqueada');
  return { approved, needsMigration:missing.includes(approved) };
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const r=preflightLogin0019();
    console.log(r.needsMigration?'Sólo 0019 pendiente; aplicación autorizada.':'Migración 0019 ya aplicada; no hay pendientes.');
  }catch(e){
    console.error(e instanceof Error&&e.message?'Preflight 0019 falló: '+e.message:'Preflight 0019 falló');
    process.exitCode=1;
  }
}
