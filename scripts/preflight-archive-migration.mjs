import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
const latest='0017_historical_imports.sql';
const expected=readdirSync('migrations').filter(n=>n.endsWith('.sql')).sort();
if(expected.at(-1)!==latest)throw Error('Migración esperada distinta a 0017. Revisión manual obligatoria.');
let remote;
try{
 const output=execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--remote','--config','wrangler.jsonc','--command','SELECT name FROM d1_migrations ORDER BY name','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 remote=JSON.parse(output);
}catch{throw Error('No se pudo consultar el registro remoto; migración abortada');}
if(!Array.isArray(remote)||remote.length!==1||remote[0]?.success!==true||!Array.isArray(remote[0]?.results))
 throw Error('Registro de migraciones inválido; migración abortada');
const applied=remote[0].results.map(r=>r.name);
const pending=expected.filter(x=>!applied.includes(x)),unknown=applied.filter(x=>!expected.includes(x));
if(unknown.length||pending.some(x=>x!==latest))
 throw Error('Esquema remoto inesperado: faltan otras migraciones o hay versiones desconocidas. Migración bloqueada.');
console.log(pending.length?'Verificado: solo falta 0017, migración aditiva autorizada.':'0017 ya aplicada: operación idempotente.');
