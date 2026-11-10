// One-off read-only diagnostic. No tokens, API writes or private user data.
import {build} from 'esbuild';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'tafa-promiedos-diag-'));
try{
 const built=await build({entryPoints:['scripts/promiedos-client.ts'],bundle:true,write:false,platform:'node',format:'esm'});
 const path=join(dir,'client.mjs');
 await writeFile(path,built.outputFiles[0].text);
 const {getPromiedosGame,getPromiedosDay}=await import(pathToFileURL(path).href);
 const describe=g=>({id:g.id,teams:g.teams.map(t=>t.name),start_time:g.start_time,status:g.status,scores:g.scores,game_time:g.game_time,winner:g.winner,to_qualify:g.to_qualify,penalties:g.penalties,events:g.events?.map(e=>({name:e.name,scores:e.scores,is_penalties_stage:e.is_penalties_stage}))});
 for(const id of ['eiefbag']){
  try{console.log('GAME',id,JSON.stringify(describe(await getPromiedosGame(id,{count:0}))));}catch(e){console.error('GAME ERROR',id,e.message);}
 }
 for(const day of ['2026-11-08','2026-11-10']){
  try{const games=await getPromiedosDay(day,{count:0}); console.log('DAY',day,'total',games.length);
   for(const game of games.filter(g=>g.id==='eiefbag'||g.teams.some(t=>/Vasco|Palmeiras/i.test(t.name)))){
    console.log('DAY MATCH',day,JSON.stringify(describe(game)));
    if(game.id!=='eiefbag'){
     try{console.log('GAMECENTER MATCH',JSON.stringify(describe(await getPromiedosGame(game.id,{count:0}))));}catch(e){console.error('GAMECENTER ERROR',game.id,e.message);}
    }
   }
  }catch(e){console.error('DAY ERROR',day,e.message);}
 }
}finally{await rm(dir,{recursive:true,force:true});}