import {expect,it,vi} from 'vitest';
import {preflightLogin0019} from '../scripts/preflight-login-0019.mjs';
import {readdirSync} from 'node:fs';
const all=readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort();
const response=(names:string[])=>JSON.stringify([{success:true,results:names.map(name=>({name}))}]);
it('sólo autoriza la 0019 pendiente y lee el registro sin modificarlo',()=>{
 const runner=vi.fn(()=>response(all.slice(0,-1)));
 expect(preflightLogin0019(runner)).toMatchObject({needsMigration:true,approved:'0019_login_rate_limits.sql'});
 expect(runner).toHaveBeenCalledExactlyOnceWith(['d1','execute','DB','--remote','--config','wrangler.jsonc','--command','SELECT name FROM d1_migrations ORDER BY name','--json']);
});
it('permite reintentar cuando 0019 ya está aplicada',()=>{
 expect(preflightLogin0019(()=>response(all)).needsMigration).toBe(false);
});
it('bloquea otras migraciones pendientes, desconocidas y datos inválidos',()=>{
 for(const names of [all.slice(0,-2),[...all,'9999_unknown.sql']])
  expect(()=>preflightLogin0019(()=>response(names))).toThrow();
 expect(()=>preflightLogin0019(()=>'{invalid')).toThrow();
});
