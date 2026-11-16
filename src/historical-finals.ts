import type {ArchivePayload,ArchiveMatch} from './historical-schema';
import {competitionFamily,isHistoricalFriendly} from './historical-competition-family';

type FinalPerson={userId:string|null;name:string};
type FinalSide=FinalPerson&{members?:FinalPerson[]};
export type HistoricalFinal={
 id:string;seasonNumber:number;competitionCode:string;
 a:FinalSide;b:FinalSide;winner?:'a'|'b';
 pointsA:number|null;pointsB:number|null;tieA?:number;tieB?:number;encounters:number;stage:string;
};
export type OfficialFinalRow={
 encounterId:number;seasonNumber:number;competitionCode:string;stageCode:string;stageName:string;
 aName:string;bName:string;aUserId:string|null;bUserId:string|null;
 scoreA:number|null;scoreB:number|null;tieA?:number;tieB?:number;
 aMembers?:FinalPerson[];bMembers?:FinalPerson[];winner?:'a'|'b';
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
function scoreWinner(final:HistoricalFinal):'a'|'b'|undefined {
 const {pointsA,pointsB,tieA,tieB}=final;
 if(pointsA===null||pointsB===null)return undefined;
 if(pointsA!==pointsB)return pointsA>pointsB?'a':'b';
 if(tieA!==undefined&&tieB!==undefined&&tieA!==tieB)return tieA>tieB?'a':'b';
}

function groupDuoFinals(finals:HistoricalFinal[]):HistoricalFinal[]{
 const byCompetition=new Map<string,HistoricalFinal[]>();
 for(const final of finals){
  const group=byCompetition.get(final.competitionCode)??[];
  group.push(final);
  byCompetition.set(final.competitionCode,group);
 }
 return [...byCompetition.values()].flatMap(group=>{
  if(group.length!==4)return group;
  const [first]=group;
  const a=new Map<string,FinalPerson>(),b=new Map<string,FinalPerson>();
  const edges=new Set<string>();
  const oppositeFirst=new Set(group.flatMap(edge=>edge.a.userId===first.a.userId?[edge.b.userId]:edge.b.userId===first.a.userId?[edge.a.userId]:[]));
  for(const edge of group){
   const reverse=oppositeFirst.has(edge.a.userId);
   const left=reverse?edge.b:edge.a,right=reverse?edge.a:edge.b;
   const pointsA=reverse?edge.pointsB:edge.pointsA,pointsB=reverse?edge.pointsA:edge.pointsB;
   const tieA=reverse?edge.tieB:edge.tieA,tieB=reverse?edge.tieA:edge.tieB;
   if(!left.userId||!right.userId||!oppositeFirst.has(right.userId)||oppositeFirst.has(left.userId)||
    pointsA!==first.pointsA||pointsB!==first.pointsB||
    (tieA!==undefined&&first.tieA!==undefined&&(tieA!==first.tieA||tieB!==first.tieB)))return group;
   a.set(left.userId,left);b.set(right.userId,right);
   edges.add(JSON.stringify([left.userId,right.userId]));
  }
  if(a.size!==2||b.size!==2||edges.size!==4)return group;
  const side=(people:Map<string,FinalPerson>)=>{
   const members=[...people.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
   return {userId:null,name:members.map(member=>member.name).join(' y '),members};
  };
  const withTie=group.find(edge=>edge.tieA!==undefined&&edge.tieB!==undefined);
  const reverseTie=withTie&&oppositeFirst.has(withTie.a.userId);
  return [{...first,a:side(a),b:side(b),encounters:1,
   tieA:reverseTie?withTie?.tieB:withTie?.tieA,tieB:reverseTie?withTie?.tieA:withTie?.tieB}];
 });
}

export function archivedCompetitionFinals(
 data:ArchivePayload,identify:(participantKey:string)=>string
):HistoricalFinal[]{
 const priorities=new Map<string,number>();
 const finalMatches=data.matches.filter((match:ArchiveMatch)=>isFinalStage(match.stage));
 const isTie=(match:ArchiveMatch)=>/desempate|tiebreak/.test(norm(match.stage+' '+(match.round??'')));
 const items=finalMatches.filter(m=>!isTie(m)).flatMap(m=>{
  const a=data.participants.find(p=>p.key===m.aKey),b=data.participants.find(p=>p.key===m.bKey);
  if(!a||!b||(m.competitionCode==='PROMOCION'||isHistoricalFriendly(m.competitionCode)))return [];
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
 const consolidated=consolidate(items,priorities);
 const finals=[
  ...consolidated.filter(f=>competitionFamily(f.competitionCode)!=='COPA_DUOS'),
  ...groupDuoFinals(consolidated.filter(f=>competitionFamily(f.competitionCode)==='COPA_DUOS'))
 ];
 return finals.map(final=>{
  const champions=new Set(data.results.filter(r=>r.resultCode==='CHAMPION'&&competitionFamily(r.competitionCode)===competitionFamily(final.competitionCode)).map(r=>identify(r.participantKey)));
  const isChampion=(side:FinalSide)=>(side.members??[side]).every(p=>p.userId!==null&&champions.has(p.userId));
  const a=isChampion(final.a),b=isChampion(final.b);
  const winner=a!==b?(a?'a':'b'):scoreWinner(final);
  if(winner==='b'&&final.a.members&&final.b.members)return {
   ...final,a:final.b,b:final.a,pointsA:final.pointsB,pointsB:final.pointsA,tieA:final.tieB,tieB:final.tieA,winner:'a',
  };
  return {...final,winner};
 });
}
export function officialCompetitionFinals(rows:OfficialFinalRow[]):HistoricalFinal[]{
 const priorities=new Map<string,number>();
 const finals=rows.filter(r=>isFinalStage(r.stageCode+' '+r.stageName)).map(r=>{
  const id='official:'+r.encounterId;
  priorities.set(id,choose(r.stageCode+' '+r.stageName));
  return {id,seasonNumber:r.seasonNumber,competitionCode:r.competitionCode,
   a:{userId:r.aUserId,name:r.aName,members:r.aMembers},b:{userId:r.bUserId,name:r.bName,members:r.bMembers},
   winner:r.winner,
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
  if(family==='PROMOCION'||isHistoricalFriendly(family))continue;
  (result[family]??=[]).push(item);
 }
 for(const group of Object.values(result))group.sort((a,b)=>b.seasonNumber-a.seasonNumber||a.a.name.localeCompare(b.a.name,'es'));
 return result;
}
