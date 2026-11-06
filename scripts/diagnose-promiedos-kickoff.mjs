// Read-only: two provider day requests, no writes, no secrets.
import {build} from 'esbuild';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'tafa-provider-clock-'));
try{
 const output=await build({entryPoints:['scripts/promiedos-client.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const path=join(dir,'client.mjs');await writeFile(path,output.outputFiles[0].text);
 const {getPromiedosDay}=await import(pathToFileURL(path).href);
 const toArg=value=>{const m=/^(\d\d)-(\d\d)-(\d{4}) (\d\d):(\d\d)$/.exec(value);if(!m)return '?';
   const utc=new Date(Date.UTC(+m[3],+m[2]-1,+m[1],+m[4]+5,+m[5]));
   return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(utc)};
 for(const date of ['2026-11-06','2026-11-07']){
  try{
   const games=await getPromiedosDay(date,{count:0});
   const upcoming=games.filter(g=>g.status.enum===1);
   console.log('DAY',date,'total',games.length,'NS',upcoming.length);
   for(const g of upcoming.slice(0,25))console.log(JSON.stringify({id:g.id,match:g.teams.map(t=>t.name).join(' vs '),raw:g.start_time,AR_if_Bogota:toArg(g.start_time),league:g.league?.name}));
  }catch(e){console.error('DAY',date,'provider unavailable',e instanceof Error?e.message:'Unknown');}
 }
}finally{await rm(dir,{recursive:true,force:true});}
