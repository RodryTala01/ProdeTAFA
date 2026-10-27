import {describe,it,expect} from 'vitest';
import {loadSportsProgress} from '../src/competition-sports-readiness';
import type {SetupSeason} from '../src/AdminSeasonCenter';
const codes=['COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_CAMPEONES','COPA_PAPA'] as const;
const season:SetupSeason={id:33,seasonNumber:33,name:'T33',status:'draft',divisions:[],members:[],competitions:codes.map((code,i)=>({
 id:i+1,code,displayName:code,status:'draft',family:'CUP',divisionCode:null,
 stages:[{id:10+i,name:'Grupos',stageType:code==='COPA_TOTAL'?'ROUND_ROBIN_GROUPS':'ACCUMULATIVE_GROUPS',status:'draft',sequence:1}],roundLinks:[]
}))};
describe('Estados deportivos por datos confirmados',()=>{
 it('no marca un sorteo por el mero hecho de existir la etapa',async()=>{
  const sport=await loadSportsProgress(season,async url=>{
   if(url.endsWith('/champions/slots'))return {slots:[]};
   if(url.endsWith('/champions/bracket'))return {bracket:[]};
   if(url.endsWith('/papa/seeding-proposal'))return {initial:{hasEncounters:false,pairs:[]}};
   if(url.endsWith('/duos'))return {eligible:[{userId:'1'},{userId:'2'}],pairs:[]};
   return {eligible:[{userId:'1'},{userId:'2'}],assignments:[]};
  });
  for(const code of codes)expect(sport[code].state).toBe('pending');
 });
 it('distingue grupos, dúos, cupos y llaves realmente guardadas',async()=>{
  const sport=await loadSportsProgress(season,async url=>{
   if(url.endsWith('/champions/slots'))return {slots:Array.from({length:14},()=>({confirmedEntryId:1,status:'confirmed'}))};
   if(url.endsWith('/champions/bracket'))return {bracket:[{code:'A'}]};
   if(url.endsWith('/papa/seeding-proposal'))return {initial:{hasEncounters:true,pairs:[{a:'1'}]}};
   if(url.endsWith('/duos'))return {eligible:[{userId:'1'},{userId:'2'}],pairs:[{members:[{userId:'1',validUntilBeforeRoundId:null},{userId:'2',validUntilBeforeRoundId:null}]}]};
   return {eligible:[{userId:'1'},{userId:'2'}],assignments:[{userId:'1'},{userId:'2'}]};
  });
  for(const code of codes)expect(sport[code].state).toBe('confirmed');
 });
 it('informa error de lectura, no inventa un estado confirmado',async()=>{
   const sport=await loadSportsProgress(season,async()=>{throw Error('offline');});
   for(const code of codes)expect(sport[code].state).toBe('error');
 });
});