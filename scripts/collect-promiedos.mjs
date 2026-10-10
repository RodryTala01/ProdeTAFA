import {build} from 'esbuild';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// No Cloudflare API credentials: only a token scoped to provider cache ingestion.
const token=process.env.PROMIEDOS_INGEST_TOKEN;
const target=new URL(process.env.PROMIEDOS_APP_URL??'https://invalid.local');
if(!token || token.length<32 || target.protocol!=='https:' || target.hostname==='invalid.local' || target.username || target.password) {
  throw new Error('Configure PROMIEDOS_APP_URL and PROMIEDOS_INGEST_TOKEN before enabling acquisition.');
}
async function app(path,body) {
  const response=await fetch(target.origin+'/api/internal/promiedos-cache'+path,{
    method:body?'POST':'GET',redirect:'manual',signal:AbortSignal.timeout(30000),
    headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!response.ok)throw new Error('Cache API HTTP '+response.status);
  return response.json();
}
const dir=await mkdtemp(join(tmpdir(),'promiedos-client-'));
try {
  const output=await build({entryPoints:['scripts/promiedos-client.ts'],bundle:true,write:false,format:'esm',platform:'node'});
  const modulePath=join(dir,'client.mjs');await writeFile(modulePath,output.outputFiles[0].text);
  const {getPromiedosDay,getPromiedosGame}=await import(pathToFileURL(modulePath).href);
  const plan=await app('/work');
  if(!Array.isArray(plan.days)||!Array.isArray(plan.games)||plan.days.length>14||plan.games.length>24)throw new Error('Invalid acquisition plan');
  let uploaded=0,failed=0;const counter={count:0};
  for(const [kind,keys] of [['day',plan.days],['game',plan.games]]) for(const key of keys) {
    try {
      const payload=kind==='day'?await getPromiedosDay(key,counter):await getPromiedosGame(key,counter);
      await app('',{entries:[{kind,key,fetchedAt:new Date().toISOString(),payload}]});
      uploaded++;
    }catch{failed++;console.error('Provider cache item failed',kind,key);}
  }
  console.log(JSON.stringify({uploaded,failed,providerRequests:counter.count}));
  if(failed)process.exitCode=1;
}finally{await rm(dir,{recursive:true,force:true});}
