// Read-only external integration check in workerd, with no D1/secrets bindings.
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const bundled = await build({stdin:{contents:`
import {searchPromiedosFixtures,getPromiedosGame,normalizePromiedosResult} from './worker/promiedos.ts';
export default {async fetch(){try {
 const counter={count:0};
 const fixtures=await searchPromiedosFixtures('2026-10-10',counter);
 const games=[];
 for(const id of ['egddcgb','egjhhie','ebhcbac','eaaiife']){
  const game=await getPromiedosGame(id,counter);
  games.push({id,teams:game.teams.map(t=>t.name),result:normalizePromiedosResult(game)});
 }
 return Response.json({fixtures:fixtures.length,argentina:fixtures.filter(f=>f.competition.id==='hc').length,games,requestCount:counter.count});
}catch(e){return Response.json({error:String(e),stack:e.stack},{status:500});}}};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
if(process.argv.includes('--prepare-preview')) {
 const dir=mkdtempSync(join(tmpdir(),'tafa-provider-check-'));
 writeFileSync(join(dir,'worker.js'),bundled.outputFiles[0].text);
 writeFileSync(join(dir,'wrangler.json'),JSON.stringify({name:'tafa-provider-check',main:'worker.js',compatibility_date:'2026-09-10',workers_dev:false}));
 console.log(dir);
 process.exit(0);
}
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-09-10'}));
try {
 const response=await mf.dispatchFetch('http://local/check');
 if(!response.ok) throw new Error(`Runtime check failed: HTTP ${response.status}: ${await response.text()}`);
 const data=await response.json();
 if(data.fixtures<12 || !data.argentina || data.games.length!==4) throw new Error('Incomplete live provider response');
 console.log(JSON.stringify(data,null,2));
} finally {await mf.dispose();}
