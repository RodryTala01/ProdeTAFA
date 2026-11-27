import {describe,it,expect,vi} from 'vitest';
import {safeDailyLiveGame,normalizePromiedosResult} from '../worker/promiedos';
import {collectProviderCache} from '../scripts/promiedos-collection-outcome.mjs';

const game={
 id:'egddcde',teams:[{id:'home',name:'Local'},{id:'away',name:'Visitante'}],
 start_time:'27-10-2026 16:45',status:{enum:2,name:'Segundo tiempo'},
 scores:[2,1],game_time:68
};
describe('Respaldo conservador de Promiedos',()=>{
 it('acepta un marcador vivo de los 90 minutos sin darlo por final',()=>{
   const safe=safeDailyLiveGame(game,'egddcde');
   expect(safe).not.toBeNull();
   expect(normalizePromiedosResult(safe!)).toMatchObject({status:'LIVE',current:[2,1],final:false,regulation:null});
 });
 it('rechaza finales, penales, tiempo extra, ID ajeno y datos incompletos',()=>{
  for(const bad of [
    {...game,status:{enum:3,name:'Finalizado'}},
    {...game,status:{enum:2,name:'Tiempo extra'}},
    {...game,penalties:[3,4]},
    {...game,scores:undefined},
    {...game,id:'otro'},
    {...game,events:[{name:'Fin de los 90 minutos',scores:[1,1]}]},
    {...game,game_time:120}
  ])expect(safeDailyLiveGame(bad,'egddcde')).toBeNull();
 });
 it('una falla de Gamecenter usa listado diario si es seguro, sin inventar finales',async()=>{
   const uploaded:any[]=[];
   const apply=vi.fn(async()=>({ok:true}));
   const result=await collectProviderCache({days:[],games:['egddcde']},{
      getDay:async()=>[game],
      getGame:async()=>{throw Error('Promiedos no disponible (HTTP 404)');},
      fallbackGame:async()=>safeDailyLiveGame(game,'egddcde'),
      upload:async entry=>{uploaded.push(entry);},
      apply
    },{count:0});
   expect(result.fallbacks).toEqual(['egddcde']);
   expect(result.uploaded).toBe(1);
   expect(result.providerFailures).toHaveLength(0);
   expect(uploaded[0]).toMatchObject({kind:'game',key:'egddcde',payload:{scores:[2,1]}});
   expect(apply).toHaveBeenCalledWith(['egddcde']);
 });
 it('un partido final sin datos completos queda pendiente',async()=>{
   const result=await collectProviderCache({days:[],games:['egddcde']},{
      getDay:async()=>[],
      getGame:async()=>{throw Error('HTTP 404');},
      fallbackGame:async()=>safeDailyLiveGame({...game,status:{enum:3,name:'Finalizado'}},'egddcde'),
      upload:async()=>{throw Error('No se debe subir un final ambiguo');},
      apply:async()=>{throw Error('No se debe aplicar un final ambiguo');},
    },{count:0});
   expect(result.providerFailures).toHaveLength(1);
   expect(result.uploaded).toBe(0);
   expect(result.internalFailures).toHaveLength(0);
 });
});
