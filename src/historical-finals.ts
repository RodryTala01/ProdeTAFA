import type {ArchivePayload,ArchiveMatch} from './historical-schema';
import {competitionFamily} from './historical-competition-family';

export type HistoricalFinal={
 id:string;seasonNumber:number;competitionCode:string;
 a:{userId:string|null;name:string};b:{userId:string|null;name:string};
 pointsA:number|null;pointsB:number|null;tieA?:number;tieB?:number;encounters:number;stage:string;
};
export type OfficialFinalRow={
 encounterId:number;seasonNumber:number;competitionCode:string;stageCode:string;stageName:string;
 aName:string;bName:string;aUserId:string|null;bUserId:string|null;
 scoreA:number|null;scoreB:number|null;tieA?:number;tieB?:number;
};
const norm=(value:string)=>value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function isFinalStage(stage:string){
 const name=norm(stage);
 // An Octavos de final or a generic "fase final" is NOT a final match.
 return /(?:^|[\s_\u00b7-])final(?:$|[\s_\u00b7-])/.test(name)
  &&!/semifinal|semi-final|octav|cuart|dieciseisav|treintaidosav|ronda de|tercer puesto|fase final|round.of.(?:16|32|64)|r(?:16|32|64)\b/.test(name);
}
function choose(source:string){
 const value=norm(source);
 if(/desempate/.test(value))return 1;
 if(/\bliga\b/.test(value))return 3;
 return 2;
}
function consolidate(items:HistoricalFinal[],priorities:Map<string,number>){
 const finals=new Map<string,HistoricalFinal>();
 for(const item of items){
  const pair=[item.a,item.b].map(team=>team.userId?team.userId:'name:'+norm(team.name)).sort().join('|');
  const key=item.seasonNumber+':'+competitionFamily(item.competitionCode)+':'+pair;
  const previous=finals.get(key);
  if(!previous){finals.set(key,{...item});continue;}
  const better=(priorities.get(item.id)??0)>(priorities.get(previous.id)??0);
  finals.set(key,{...(better?item:previous),encounters:previous.encounters+item.encounters});
 }
 return [...finals.values()].sort((a,b)=>b.seasonNumber-a.seasonNumber||a.a.name.localeCompare(b.a.name,'es'));
}
export function archivedCompetitionFinals(
 data:ArchivePayload,identify:(participantKey:string)=>string
):HistoricalFinal[]{
 const priorities=new Map<string,number>();
 const finalMatches=data.matches.filter((match:ArchiveMatch)=>isFinalStage(match.stage));
 const isTie=(match:ArchiveMatch)=>/desempate|tiebreak/.test(norm(match.stage+' '+(match.round??'')));
 const items=finalMatches.filter(m=>!isTie(m)).flatMap(m=>{
  const a=data.participants.find(p=>p.key===m.aKey),b=data.participants.find(p=>p.key===m.bKey);
  if(!a||!b||m.competitionCode==='PROMOCION')return [];
  const id='archive:'+data.season.number+':'+(m.matchId??data.matches.indexOf(m));
  priorities.set(id,choose(m.stage+' '+(m.round??'')));
  const ties=finalMatches.filter(t=>isTie(t)&&competitionFamily(t.competitionCode)===competitionFamily(m.competitionCode)&&t.scoreBasis===m.scoreBasis
   &&((t.aKey===m.aKey&&t.bKey===m.bKey)||(t.aKey===m.bKey&&t.bKey===m.aKey)));
  const tie=ties.length===1?ties[0]:null;
  return [{id,seasonNumber:data.season.number,competitionCode:m.competitionCode,
   a:{userId:identify(m.aKey),name:a.name},b:{userId:identify(m.bKey),name:b.name},
   pointsA:m.pointsA,pointsB:m.pointsB,
   ...(tie&&m.pointsA===m.pointsB?{tieA:tie.aKey===m.aKey?tie.pointsA:tie.pointsB,tieB:tie.aKey===m.aKey?tie.pointsB:tie.pointsA}:{}),
   encounters:1,stage:m.stage}];
 });
 return consolidate(items,priorities);
}
export function officialCompetitionFinals(rows:OfficialFinalRow[]):HistoricalFinal[]{
 const priorities=new Map<string,number>();
 const finals=rows.filter(r=>isFinalStage(r.stageCode+' '+r.stageName)).map(r=>{
  const id='official:'+r.encounterId;
  priorities.set(id,choose(r.stageCode+' '+r.stageName));
  return {id,seasonNumber:r.seasonNumber,competitionCode:r.competitionCode,
   a:{userId:r.aUserId,name:r.aName},b:{userId:r.bUserId,name:r.bName},
   pointsA:r.scoreA,pointsB:r.scoreB,tieA:r.tieA,tieB:r.tieB,encounters:1,stage:r.stageName};
 });
 return consolidate(finals,priorities);
}
export function combineCompetitionFinals(archiveFinals:HistoricalFinal[],officialFinals:HistoricalFinal[]):Record<string,HistoricalFinal[]>{
 const existing=new Set(archiveFinals.map(f=>f.seasonNumber+':'+competitionFamily(f.competitionCode)));
 // Imported finals take precedence if the same season and family exists in both sources.
 // We do not concatenate independent source rows or invent a knockout result.
 const result:Record<string,HistoricalFinal[]>={};
 for(const item of [...archiveFinals,...officialFinals.filter(f=>!existing.has(f.seasonNumber+':'+competitionFamily(f.competitionCode)))]){
  const family=competitionFamily(item.competitionCode);
  if(family==='PROMOCION')continue;
  (result[family]??=[]).push(item);
 }
 for(const group of Object.values(result))group.sort((a,b)=>b.seasonNumber-a.seasonNumber||a.a.name.localeCompare(b.a.name,'es'));
 return result;
}
