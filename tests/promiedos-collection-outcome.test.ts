import {describe,it,expect,vi} from 'vitest';
import {collectProviderCache,acquisitionExitCode,safeError} from '../scripts/promiedos-collection-outcome.mjs';

const plan={days:['2026-10-27'],games:['egddcde','another-game']};
describe('Promiedos provider outage handling',()=>{
 it('retains provider failure as warning while continuing other games and applying fresh results',async()=>{
   const uploaded:unknown[]=[];
   const apply=vi.fn(async keys=>({ok:true,keys}));
   const report=await collectProviderCache(plan,{
     getDay:async()=>[],
     getGame:async key=>{
       if(key==='egddcde')throw new Error('Promiedos no disponible (HTTP 404). Reintentá más tarde.');
       return {id:key};
     },
     upload:async entry=>{uploaded.push(entry);},
     apply,
     now:()=>new Date('2026-10-27T22:00:00.000Z').toISOString()
   },{count:0});
   expect(report.uploaded).toBe(2);
   expect(report.providerFailures).toEqual([{kind:'game',key:'egddcde',error:'Promiedos no disponible (HTTP 404). Reintentá más tarde.'}]);
   expect(report.internalFailures).toHaveLength(0);
   expect(report.gameKeys).toEqual(['another-game']);
   expect(apply).toHaveBeenCalledWith(['another-game']);
   expect(acquisitionExitCode(report)).toBe(0);
 });
 it('a provider outage alone does not trigger workflow failure emails',async()=>{
   const report=await collectProviderCache({days:[],games:['egddcde']},{
     getDay:async()=>[],
     getGame:async()=>{throw Error('HTTP 403');},
     upload:async()=>{throw Error('must not upload');},
     apply:async()=>{throw Error('must not apply');},
   },{count:0});
   expect(report.uploaded).toBe(0);
   expect(report.providerFailures).toHaveLength(1);
   expect(report.internalFailures).toHaveLength(0);
   expect(acquisitionExitCode(report)).toBe(0);
 });
 it('a TAFA cache upload failure still fails the workflow',async()=>{
   const report=await collectProviderCache({days:[],games:['game']},{
     getDay:async()=>[],
     getGame:async()=>({id:'game'}),
     upload:async()=>{throw new Error('Cache API HTTP 401');},
     apply:async()=>({}),
   },{count:0});
   expect(report.providerFailures).toHaveLength(0);
   expect(report.internalFailures).toMatchObject([{operation:'cache-upload',kind:'game',key:'game'}]);
   expect(acquisitionExitCode(report)).toBe(1);
 });
 it('a TAFA result-apply failure still fails, even if upload succeeded',async()=>{
   const report=await collectProviderCache({days:[],games:['game']},{
     getDay:async()=>[],
     getGame:async()=>({id:'game'}),
     upload:async()=>({}),
     apply:async()=>{throw new Error('Callback HTTP 500');},
   },{count:0});
   expect(report.uploaded).toBe(1);
   expect(report.internalFailures).toMatchObject([{operation:'cache-apply'}]);
   expect(acquisitionExitCode(report)).toBe(1);
 });
 it('sanitizes provider-controlled messages in GitHub warnings',()=>{
   expect(safeError(new Error('HTTP 403\n::error::%payload'))).toBe('HTTP 403  ::error:: payload');
 });
});
