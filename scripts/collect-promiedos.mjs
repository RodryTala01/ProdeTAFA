import {build} from 'esbuild';
import {mkdtemp,writeFile,appendFile,rm} from 'node:fs/promises';
import {collectProviderCache,acquisitionExitCode} from './promiedos-collection-outcome.mjs';
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
  const {getPromiedosDay,getPromiedosGame,safeDailyLiveGame}=await import(pathToFileURL(modulePath).href);
  const plan=await app('/work');
  if(!Array.isArray(plan.days)||!Array.isArray(plan.games)||plan.days.length>14||plan.games.length>24)throw new Error('Invalid acquisition plan');
  const counter={count:0};
  const days=new Map();
  const getDay=async(date,counter)=>{
    if(days.has(date))return days.get(date);
    const fetched=await getPromiedosDay(date,counter);
    days.set(date,fetched);
    return fetched;
  };
  const report=await collectProviderCache(plan,{
    getDay,getGame:getPromiedosGame,
    fallbackGame:async id=>{
      const date=plan.gameDays?.[id];
      if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
      const games=await getDay(date,counter);
      const matches=games.filter(g=>g.id===id);
      if(matches.length!==1)return null;
      return safeDailyLiveGame(matches[0],id);
    },
    upload:entry=>app('',{entries:[entry]}),
    apply:games=>app('/apply',{games}),
  },counter);
  for(const failure of report.providerFailures){
    const message='Promiedos no disponible · '+failure.kind+' '+failure.key+': '+failure.error;
    console.warn(message);
    // A provider failure is a warning, not a failed TAFA workflow.
    // GitHub sends no failure email for a transient rejected game.
    console.log('::warning title=Promiedos no disponible::'+message);
  }
  for(const failure of report.internalFailures){
    console.error('TAFA cache pipeline failed',failure);
  }
  if(report.applied!==undefined)console.log('Applied fresh games',report.applied);
  const status=report.internalFailures.length?'internal-error':report.providerFailures.length?'provider-warning':'ok';
  const summary={
    status,uploaded:report.uploaded,
    providerFailed:report.providerFailures.length,
    internalFailed:report.internalFailures.length,
    providerRequests:counter.count,liveFallbacks:report.fallbacks.length,
  };
  console.log(JSON.stringify(summary));
  if(report.fallbacks.length)console.log('Daily-list live fallback accepted for',report.fallbacks);
  if(process.env.GITHUB_STEP_SUMMARY){
    const details=[
      '### Promiedos · adquisición de datos',
      '',
      '| Estado | Adquiridos | Advertencias del proveedor | Errores internos |',
      '| --- | ---: | ---: | ---: |',
      '| '+status+' | '+summary.uploaded+' | '+summary.providerFailed+' | '+summary.internalFailed+' |',
      '',
      report.providerFailures.length
        ? 'Los datos no disponibles se volverán a consultar. Los resultados guardados no se modificaron.'
        : 'Sin advertencias del proveedor.',
      '',
    ].join('\n');
    await appendFile(process.env.GITHUB_STEP_SUMMARY,details);
  }
  if(acquisitionExitCode(report))process.exitCode=1;
}finally{await rm(dir,{recursive:true,force:true});}
