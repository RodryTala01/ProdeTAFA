import type {ArchiveCompetition,ArchiveMatch,ArchivePayload,ArchiveStanding} from './historical-schema';
import {leagueZone} from '../worker/league-display-zones';
import {documentedHistoryGroups,type HistoricalGroupEntry} from './historical-group-catalog';

// Promotion decides division membership, it is not a trophy competition.
export function isHistoricalPromotion(c:{code:string;kind?:string}){
 return c.kind==='PROMOTION'||c.code==='PROMOCION';
}
export function visibleArchiveCompetitions<T extends {code:string;kind:string}>(competitions:T[]){
 return competitions.filter(c=>!isHistoricalPromotion(c));
}
export function promotionHomeLeague(data:ArchivePayload){
 const leagues=data.competitions.filter(c=>c.kind==='LEAGUE');
 return leagues.find(c=>c.code==='LIGA_A')??leagues[0]??null;
}
export type ArchiveZone={code:'champion'|'runner-up'|'relegation'|'promotion'|'survived'|'champions'|'playoff';label:string};
export function archiveStandingZone(data:ArchivePayload,competition:ArchiveCompetition,row:ArchiveStanding,source:'imported'|'official'|'mixed'):ArchiveZone|null {
 if(competition.kind!=='LEAGUE')return null;
 const division=competition.code==='LIGA_A'?'A':competition.code==='LIGA_B'?'B':'';
 const moves=data.movements.filter(m=>m.participantKey===row.participantKey&&(!division||m.fromDivision?.toUpperCase()===division));
 if(moves.some(m=>m.type==='DESCENSO'))return {code:'relegation',label:'Descenso confirmado'};
 if(moves.some(m=>m.type==='ASCENSO'))return {code:'promotion',label:'Ascenso confirmado'};
 if(moves.some(m=>m.type==='PERMANENCIA'))return {code:'survived',label:'Permanencia confirmada'};
 const title=data.results.find(r=>r.competitionCode===competition.code&&r.participantKey===row.participantKey);
 if(title?.resultCode==='CHAMPION')return {code:'champion',label:'Campeón'};
 if(title?.resultCode==='RUNNER_UP')return {code:'runner-up',label:'Subcampeón'};
 // Historical ranking positions alone cannot prove a relegation: seasons had different rules.
 // For official seasons, reuse the same visual zones as the live League table.
 if(source!=='imported'&&division){
  const total=data.standings.filter(r=>r.competitionCode===competition.code).length;
  const zone=leagueZone(row.position,total,division);
  if(zone)return {code:zone.code==='relegation'?'relegation':zone.code==='champions'?'champions':zone.code==='playoff'?'playoff':zone.code==='champion'?'champion':'promotion',label:zone.label};
 }
 return null;
}
export type ArchiveStage={key:string;label:string;rank:number;matches:ArchiveMatch[]};
const clean=(s:string)=>s.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function archiveMatchStage(stage:string):{category:'bracket'|'groups'|'other';key:string;label:string;rank:number}{
 const name=clean(stage.trim());
 if(/grupos?|liguilla|group/.test(name))return {category:'groups',key:stage,label:stage,rank:0};
 if(/promocion/.test(name))return {category:'other',key:stage,label:stage,rank:0};
 const tie=/desempate/.test(name);
 let base:string|undefined,rank=0;
 if(/ronda previa|preliminar|clasificatoria|qualifying/.test(name)){base='Ronda previa';rank=5;}
 else if(/treintaidosav|r64/.test(name)){base='Treintaidosavos';rank=10;}
 else if(/dieciseisav|16avos|r32/.test(name)){base='Dieciseisavos';rank=20;}
 else if(/octav|r16|round_of_16/.test(name)){base='Octavos';rank=30;}
 else if(/cuartos|quarter|\bqf\b/.test(name)){base='Cuartos de final';rank=40;}
 else if(/semifinal|\bsf\b/.test(name)){base='Semifinales';rank=50;}
 else if(/tercer puesto|third/.test(name)){base='Tercer puesto';rank=60;}
 else if(/final|\bfinal\b/.test(name)){base='Final';rank=70;}
 if(!base)return {category:'other',key:stage,label:stage,rank:100};
 return {category:'bracket',key:tie?'tie:'+base:base,label:tie?'Desempate · '+base:base,rank:rank+(tie?5:0)};
}
export function historicalMatchLayout(matches:ArchiveMatch[]){
 const stages=new Map<string,ArchiveStage>(),groups:ArchiveMatch[]=[],other:ArchiveMatch[]=[];
 for(const m of matches){
  const stage=archiveMatchStage(m.stage);
  if(stage.category==='groups'){groups.push(m);continue;}
  if(stage.category==='other'){other.push(m);continue;}
  const node=stages.get(stage.key)??{key:stage.key,label:stage.label,rank:stage.rank,matches:[]};
  node.matches.push(m);stages.set(stage.key,node);
 }
 const bracket=[...stages.values()].sort((a,b)=>a.rank-b.rank||a.label.localeCompare(b.label,'es'));
 const additional:ArchiveMatch[]=[];
 // If the source explicitly distinguishes a consolidated score in LIGA and
 // another score in a cup sheet for the SAME final pairing, use LIGA for the
 // headline bracket. The other recorded encounter remains available in details.
 // Never collapse two encounters that lack explicit source evidence.
 const final=bracket.find(stage=>stage.key==='Final');
 if(final){
  const pairs=new Map<string,ArchiveMatch[]>();
  for(const match of final.matches){
   const pair=[match.aKey,match.bKey].sort().join('|');
   pairs.set(pair,[...(pairs.get(pair)??[]),match]);
  }
  const hidden=new Set<ArchiveMatch>();
  for(const pairMatches of pairs.values()){
   if(pairMatches.length<2)continue;
   const liga=pairMatches.filter(m=>/\bliga\b/i.test(m.stage+' '+(m.round??'')));
   if(liga.length!==1)continue;
   for(const m of pairMatches)if(m!==liga[0]){hidden.add(m);additional.push(m);}
  }
  final.matches=final.matches.filter(m=>!hidden.has(m));
 }
 return {bracket,groups,other,additional};
}

/** Real group membership/official points from T3/T4 supplemental worksheets
 * plus any group match actually stored in the archive. */
export function archiveHistoryGroups(data:ArchivePayload,competitionCode:string,matches:ArchiveMatch[]){
 const fromWorkbook=documentedHistoryGroups(data,competitionCode);
 const names=new Map<string,{name:string;entries:HistoricalGroupEntry[];matches:ArchiveMatch[]}>();
 for(const g of fromWorkbook)names.set(clean(g.name),{...g,matches:[]});
 const groupMatches=historicalMatchLayout(matches).groups;
 for(const m of groupMatches){
  const label=(m.round??'')+' '+m.stage;
  const found=label.match(/\bgrupo\s*([0-9a-z]+)/i);
  const name=found?'Grupo '+found[1]:'Grupo sin identificar';
  const id=clean(name);
  const group=names.get(id)??{name,entries:[],matches:[]};
  group.matches.push(m);
  // For imported seasons without documented tables, show known participants
  // but never derive official group points/rankings by adding match scores.
  for(const k of [m.aKey,m.bKey]){
   if(!group.entries.some(e=>e.participantKey===k))
    group.entries.push({participantKey:k,points:NaN,position:null});
  }
  names.set(id,group);
 }
 return [...names.values()].sort((a,b)=>{
  const an=Number(a.name.match(/\d+/)?.[0]??Number.MAX_SAFE_INTEGER);
  const bn=Number(b.name.match(/\d+/)?.[0]??Number.MAX_SAFE_INTEGER);
  return an-bn||a.name.localeCompare(b.name,'es');
 }).map(g=>({...g,entries:[...g.entries].sort((a,b)=>
  a.position!==null&&b.position!==null?a.position-b.position: (Number.isFinite(b.points)?b.points:-Infinity)-(Number.isFinite(a.points)?a.points:-Infinity)
 )}));
}
