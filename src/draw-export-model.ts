import type {DrawBlock,DrawImage,DrawPerson} from './draw-image';
import {cupApi,type CupCompetition} from './cup-ab-api';
import {entryMembers,type Overview} from './participant-competitions';

export function groupDraw(c:CupCompetition,season:number,groups:Array<{name:string;userIds:string[]}>,people:Array<{userId:string;fullName:string}>,preview:boolean,criteria:string[]=[],phase='Fase de grupos'):DrawImage{
 const selected=groups.flatMap(g=>g.userIds);
 if(groups.some(g=>!g.userIds.length)||!selected.length||selected.some(id=>!id)||new Set(selected).size!==selected.length)throw new Error('Completá el armado sin participantes repetidos antes de exportar.');
 return {competitionCode:c.code,competitionName:c.displayName,season,phase,state:preview?'Vista previa':'Confirmado',kind:'groups',criteria,
  blocks:groups.map((group,index)=>({id:String(index),title:group.name,sides:[group.userIds.map(id=>{
   const person=people.find(p=>p.userId===id);
   if(!person)throw new Error('Falta el nombre de un participante. Volvé a cargar la competición.');
   return {userId:id,name:person.fullName};
  })]}))};
}

export async function storedKnockoutDraw(c:CupCompetition,seasonNumber:number,stageId?:number):Promise<DrawImage>{
 const overview=await cupApi<Overview>('/api/admin/competition-engine/draw-overview?season='+seasonNumber);
 const season=overview.season;
 if(!season)throw new Error('No encontramos esta temporada.');
 const stages=season.stages.filter(s=>s.competitionId===c.id&&s.type==='KNOCKOUT'&&(!stageId||s.id===stageId)).sort((a,b)=>a.sequence-b.sequence);
 const blocks:DrawBlock[]=[];
 if(c.code==='COPA_CAMPEONES'&&!stageId){
  type Source={entryId:number|null;displayName:string|null;source:string};
  const result=await cupApi<{bracket:Array<{code:string;label:string;branch:string;sourceA:Source;sourceB:Source}>}>('/api/competition-engine/competitions/'+c.id+'/champions/bracket');
  const codes=new Set(result.bracket.map(node=>node.code));
  const member=(source:Source):DrawPerson[]=>{
   const members=entryMembers(season,source.entryId,null);
   return members.length?members.map(m=>({userId:m.userId,name:m.fullName})):[{name:source.displayName??(codes.has(source.source)?'Ganador '+source.source:source.source.replace(/_/g,' '))}];
  };
  return {competitionCode:c.code,competitionName:c.displayName,season:seasonNumber,phase:'Llave fija',state:'Confirmado',kind:'bracket',
   blocks:result.bracket.map(node=>({id:node.code,title:node.code+' · '+node.label,sides:[member(node.sourceA),member(node.sourceB)],sources:[node.sourceA.source,node.sourceB.source].filter(source=>codes.has(source))}))};
 }

 const side=(entryId:number|null,round:number|null):DrawPerson[]=>{
  if(entryId===null)return [];
  const members=entryMembers(season,entryId,round);
  if(!members.length)throw new Error('Faltan los integrantes de un cruce. Volvé a cargar la competición.');
  return members.map(m=>({userId:m.userId,name:m.fullName}));
 };
 for(const stage of stages){
  for(const encounter of season.encounters.filter(e=>e.stageId===stage.id)){
   // Only persisted, populated encounters are a saved draw.
   if(encounter.entryAId===null&&encounter.entryBId===null)continue;
   blocks.push({id:String(encounter.id),title:stage.name+' · '+encounter.slot,
    sides:[side(encounter.entryAId,encounter.roundId),side(encounter.entryBId,encounter.roundId)],
    bye:encounter.entryAId===null||encounter.entryBId===null,
    sources:[encounter.entryAId,encounter.entryBId].flatMap(entryId=>{
     if(entryId===null)return [];
     const candidates=season.encounters.filter(source=>source.id!==encounter.id&&source.winnerEntryId===entryId&&source.confirmedAt&&
      stages.some(s=>s.id===source.stageId&&s.sequence<stage.sequence));
     const latest=candidates.sort((a,b)=>(stages.find(s=>s.id===b.stageId)?.sequence??0)-(stages.find(s=>s.id===a.stageId)?.sequence??0))[0];
     return latest?[String(latest.id)]:[];
    })});
  }
 }
 if(!blocks.length)throw new Error('Todavía no hay cruces guardados en esta fase.');
 return {competitionCode:c.code,competitionName:c.displayName,season:seasonNumber,phase:stageId?stages[0]?.name??'Eliminatorias':'Llave guardada',state:'Confirmado',kind:'bracket',blocks};
}
