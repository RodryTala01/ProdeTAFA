import {activeHistoricalArchives,archivedUserKey} from './historical-archive';
import {documentedHistoryGroups} from '../src/historical-group-catalog';

type Archive=Awaited<ReturnType<typeof activeHistoricalArchives>>;
type OfficialScore={userId:string;fullName:string;dates:number;points:number;fulls:number;partials:number;errors:number;extras:number;predictions:number};
type Award={seasonNumber:number;code:string;name:string;userId:string;fullName:string;resultCode:string};
type Member={seasonNumber:number;code:string;name:string;userId:string;fullName:string};
type IffhsScore={seasonNumber:number;userId:string;fullName:string;pointsScaled:number};
export type GeneralTotal={userId:string;fullName:string;position:number;points:number;fulls:number|null;partials:number|null;errors:number|null;extras:number|null;dates:number|null;averagePoints:number|null;averageFulls:number|null;averagePartials:number|null;averageErrors:number|null;averageExtras:number|null};
export type PalmarTotal={userId:string;fullName:string;position:number;championships:number;runnerUps:number;participations:number};
export type IffhsTotal={userId:string;fullName:string;position:number;totalPoints:number;seasons:number;average:number;breakdown:Array<{seasonNumber:number;points:number|null}>};
export type TotalsData={seasons:number[];competitions:Array<{code:string;name:string}>;palmares:PalmarTotal[];perCompetition:Record<string,PalmarTotal[]>;iffhsOfficial:{seasons:number[];ranking:IffhsTotal[]};iffhsTotal:IffhsTotal[];general:GeneralTotal[]};

const champions=new Set(['CHAMPION']);
const runners=new Set(['RUNNER_UP','RUNNERUP','SUBCAMPEON','SUBCHAMPION']);
const meaningful=(code:string)=>code!=='PROMOCION';
const key=(season:number,code:string,user:string)=>season+':'+code+':'+user;
const n=(value:number|null|undefined)=>Number(value??0);
const rankSort=<T extends {fullName:string;userId:string}>(items:T[],metric:(r:T)=>number):Array<T&{position:number}>=>{
 const list=[...items].sort((a,b)=>metric(b)-metric(a)||a.fullName.localeCompare(b.fullName,'es')||a.userId.localeCompare(b.userId));
 let last:number|null=null,position=0;
 return list.map((row,index)=>{const value=metric(row);if(last===null||value!==last)position=index+1;last=value;return {...row,position};});
};
function numberSum(current:number|null,value:number|null|undefined):number|null{
 return current===null||value==null?null:current+Number(value);
}
export function composeHistoricalTotals(
 archives:Archive,
 officialScores:OfficialScore[],
 officialAwards:Award[],
 officialMembers:Member[],
 officialIffhs:IffhsScore[],
 officialSeasons:Array<{seasonNumber:number;userId:string}>=[]
):TotalsData{
 const historicRefs=new Map<string,{names:Set<string>;ids:Set<string>;count:number}>();
 const normal=(value:string)=>value.toLocaleLowerCase('es').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/\\s+/g,' ').trim();
 for(const {data} of archives)for(const p of data.participants){
  const v=historicRefs.get(p.key)??{names:new Set<string>(),ids:new Set<string>(),count:0};
  v.names.add(normal(p.name));if(p.userId)v.ids.add(p.userId);v.count++;
  historicRefs.set(p.key,v);
 }
 // Stable participantKey is an explicit identity reference across seasons.
 // Never merge on name alone, or when a key points at different names/accounts.
 const archiveId=(data:Archive[number]['data'],participantKey:string)=>{
  const p=data.participants.find(x=>x.key===participantKey);
  if(!p)return 'hist:'+data.season.number+':'+participantKey;
  if(p.userId)return p.userId;
  const known=historicRefs.get(participantKey);
  if(known?.names.size===1&&known.ids.size===1)return [...known.ids][0];
  if(known?.names.size===1&&known.count>1&&known.ids.size===0)return 'hist:'+participantKey;
  return archiveId(data,participantKey);
 };
 const names=new Map<string,string>();
 const participation=new Set<string>();
 const awards=new Map<string,{seasonNumber:number;code:string;userId:string;resultCode:string}>();
 const iffhs=new Map<string,IffhsScore>();
 const competitionNames=new Map<string,string>();
 const officialSeasonUsers=new Set(officialSeasons.map(s=>s.seasonNumber+':'+s.userId));
 const addName=(id:string,name:string)=>{if(!names.has(id)||!id.startsWith('hist:'))names.set(id,name);};
 const addCompetition=(code:string,name:string)=>{if(meaningful(code)&&!competitionNames.has(code))competitionNames.set(code,name);};
 const addAward=(a:Award)=>{
  if(!meaningful(a.code)||(!champions.has(a.resultCode)&&!runners.has(a.resultCode)))return;
  addName(a.userId,a.fullName);addCompetition(a.code,a.name);
  const id=key(a.seasonNumber,a.code,a.userId)+':'+(champions.has(a.resultCode)?'champion':'runner');
  awards.set(id,{seasonNumber:a.seasonNumber,code:a.code,userId:a.userId,resultCode:a.resultCode});
  participation.add(key(a.seasonNumber,a.code,a.userId));
 };
 for(const a of officialAwards){
  addAward(a);
 }
 for(const a of officialMembers){
  if(!meaningful(a.code))continue;
  addName(a.userId,a.fullName);addCompetition(a.code,a.name);
  participation.add(key(a.seasonNumber,a.code,a.userId));
 }
 const general=new Map<string,Omit<GeneralTotal,'position'|'averagePoints'|'averageFulls'|'averagePartials'|'averageErrors'|'averageExtras'>>();
 for(const score of officialScores){
  addName(score.userId,score.fullName);
  general.set(score.userId,{userId:score.userId,fullName:score.fullName,
   points:n(score.points),fulls:n(score.fulls),partials:n(score.partials),errors:n(score.errors),
   extras:n(score.extras),dates:n(score.dates)});
 }
 for(const entry of officialIffhs){
  addName(entry.userId,entry.fullName);
  iffhs.set(entry.seasonNumber+':'+entry.userId,entry);
 }
 for(const {data} of archives){
  for(const c of data.competitions)addCompetition(c.code,c.name);
  for(const person of data.participants)addName(archiveId(data,person.key),person.name);
  const participant=(participantKey:string)=>data.participants.find(p=>p.key===participantKey);
  const display=(participantKey:string)=>participant(participantKey)?.name??participantKey;
  const addPart=(code:string,participantKey:string)=>{
   if(meaningful(code))participation.add(key(data.season.number,code,archiveId(data,participantKey)));
  };
  for(const person of data.participants){
   if(person.division)addPart('LIGA_'+person.division.toUpperCase(),person.key);
  }
  for(const r of data.standings)addPart(r.competitionCode,r.participantKey);
  for(const r of data.results)addPart(r.competitionCode,r.participantKey);
  for(const r of data.rounds)if(r.competitionCode)addPart(r.competitionCode,r.participantKey);
  for(const m of data.matches){addPart(m.competitionCode,m.aKey);addPart(m.competitionCode,m.bKey);}
  for(const c of data.competitions){
   for(const group of documentedHistoryGroups(data,c.code))
    for(const entry of group.entries)addPart(c.code,entry.participantKey);
  }
  for(const r of data.results){
   addAward({seasonNumber:data.season.number,code:r.competitionCode,
    name:data.competitions.find(c=>c.code===r.competitionCode)?.name??r.competitionCode,
    userId:archiveId(data,r.participantKey),fullName:display(r.participantKey),resultCode:r.resultCode});
  }
  for(const r of data.statistics){
   const userId=archiveId(data,r.participantKey);
   if(officialSeasonUsers.has(data.season.number+':'+userId))continue;
   const prev=general.get(userId)??{userId,fullName:display(r.participantKey),
     points:0,fulls:0,partials:0,errors:0,extras:0,dates:0};
   general.set(userId,{...prev,points:prev.points+r.points,
     fulls:numberSum(prev.fulls,r.fulls),partials:numberSum(prev.partials,r.partials),
     errors:numberSum(prev.errors,r.errors),extras:numberSum(prev.extras,r.extras),
     dates:numberSum(prev.dates,r.dates)});
  }
  for(const r of data.iffhs){
   const userId=archiveId(data,r.participantKey),id=data.season.number+':'+userId;
   if(!iffhs.has(id))iffhs.set(id,{seasonNumber:data.season.number,userId,fullName:display(r.participantKey),pointsScaled:Math.round(r.points*100)});
  }
 }
 const counts=new Map<string,{championships:number;runnerUps:number;codes:Map<string,{championships:number;runnerUps:number}>}>();
 for(const a of awards.values()){
  const entry=counts.get(a.userId)??{championships:0,runnerUps:0,codes:new Map()};
  const item=entry.codes.get(a.code)??{championships:0,runnerUps:0};
  if(champions.has(a.resultCode)){entry.championships++;item.championships++;}
  else{entry.runnerUps++;item.runnerUps++;}
  entry.codes.set(a.code,item);counts.set(a.userId,entry);
 }
 const participationsByUser=new Map<string,Set<string>>();
 const participationByCompetition=new Map<string,Map<string,number>>();
 for(const p of participation){
  const [season,code,...rest]=p.split(':');const userId=rest.join(':');
  // A historical key contains colons; the separator above deliberately keeps it intact.
  const mine=participationsByUser.get(userId)??new Set<string>();mine.add(season+':'+code);participationsByUser.set(userId,mine);
  const list=participationByCompetition.get(code)??new Map<string,number>();
  list.set(userId,(list.get(userId)??0)+1);participationByCompetition.set(code,list);
 }
 const palmares=rankSort([...new Set([...counts.keys(),...participationsByUser.keys()])].map(userId=>({
  userId,fullName:names.get(userId)??userId,championships:counts.get(userId)?.championships??0,
  runnerUps:counts.get(userId)?.runnerUps??0,participations:participationsByUser.get(userId)?.size??0
 })),r=>r.championships);
 const perCompetition:Record<string,PalmarTotal[]>={};
 for(const [code] of competitionNames){
  const ids=new Set([...participationByCompetition.get(code)?.keys()??[],...[...counts].filter(([,value])=>value.codes.has(code)).map(([id])=>id)]);
  perCompetition[code]=rankSort([...ids].map(userId=>({
   userId,fullName:names.get(userId)??userId,
   championships:counts.get(userId)?.codes.get(code)?.championships??0,
   runnerUps:counts.get(userId)?.codes.get(code)?.runnerUps??0,
   participations:participationByCompetition.get(code)?.get(userId)??0
  })),r=>r.championships);
 }
 const seasons=[...new Set([...archives.map(a=>a.seasonNumber),...officialIffhs.map(r=>r.seasonNumber),...officialAwards.map(r=>r.seasonNumber)])].sort((a,b)=>b-a);
 const iffhsSeasons=[...new Set([...iffhs.values()].map(r=>r.seasonNumber))].sort((a,b)=>b-a);
 const last=iffhsSeasons[0]??0;const officialWindow=Array.from({length:Math.min(5,last)},(_,index)=>last-index);
 function rankedIffhs(selection:number[]):IffhsTotal[]{
  const perUser=new Map<string,{userId:string;fullName:string;totalPoints:number;seasons:number;breakdown:Array<{seasonNumber:number;points:number|null}>}>();
  const byUser=new Map<string,Map<number,number>>();
  for(const entry of iffhs.values()){
   if(!selection.includes(entry.seasonNumber))continue;
   const bySeason=byUser.get(entry.userId)??new Map<number,number>();bySeason.set(entry.seasonNumber,entry.pointsScaled);byUser.set(entry.userId,bySeason);
  }
  for(const [userId,bySeason] of byUser){
   const scaled=[...bySeason.values()].reduce((a,b)=>a+b,0);
   perUser.set(userId,{userId,fullName:names.get(userId)??userId,
    totalPoints:scaled/100,seasons:bySeason.size,
    breakdown:selection.map(seasonNumber=>({seasonNumber,points:bySeason.has(seasonNumber)?bySeason.get(seasonNumber)!/100:null}))});
  }
  return rankSort([...perUser.values()],r=>r.totalPoints).map(r=>({...r,average:r.seasons?r.totalPoints/r.seasons:0}));
 }
 const overall=rankSort([...general.values()].map(r=>({...r,fullName:names.get(r.userId)??r.fullName})),r=>r.points)
  .map(r=>({...r,averagePoints:r.dates&&r.dates>0?r.points/r.dates:null,
   averageFulls:r.dates&&r.dates>0&&r.fulls!==null?r.fulls/r.dates:null,
   averagePartials:r.dates&&r.dates>0&&r.partials!==null?r.partials/r.dates:null,
   averageErrors:r.dates&&r.dates>0&&r.errors!==null?r.errors/r.dates:null,
   averageExtras:r.dates&&r.dates>0&&r.extras!==null?r.extras/r.dates:null}));
 return {seasons,competitions:[...competitionNames].map(([code,name])=>({code,name})),
  palmares,perCompetition,
  iffhsOfficial:{seasons:officialWindow,ranking:rankedIffhs(officialWindow)},
  iffhsTotal:rankedIffhs(iffhsSeasons),general:overall};
}
export async function historicalTotals(db:D1Database):Promise<TotalsData>{
 const archives=await activeHistoricalArchives(db);
 const scores=(await db.prepare("SELECT u.id AS userId,u.full_name AS fullName, COUNT(DISTINCT r.id) AS dates,COALESCE(SUM(ps.total_points),0) AS points,SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END) AS fulls,SUM(CASE WHEN ps.base_points=1 THEN 1 ELSE 0 END) AS partials,SUM(CASE WHEN ps.base_points=0 AND ps.result_type<>'VOID' THEN 1 ELSE 0 END) AS errors,COALESCE(SUM(ps.extra_points),0) AS extras,COUNT(DISTINCT op.id) AS predictions FROM round_submissions rs JOIN users u ON u.id=rs.user_id AND u.role='participant' JOIN rounds r ON r.id=rs.round_id AND r.status='finished' LEFT JOIN matches m ON m.round_id=r.id LEFT JOIN official_predictions op ON op.user_id=u.id AND op.match_id=m.id LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id AND ps.is_provisional=0 GROUP BY u.id,u.full_name").all<OfficialScore>()).results??[];
 const awards=(await db.prepare("SELECT DISTINCT s.season_number AS seasonNumber,c.code,c.display_name AS name,m.user_id AS userId,u.full_name AS fullName,cr.result_code AS resultCode FROM competition_results cr JOIN competition_entries e ON e.id=cr.entry_id JOIN competitions c ON c.id=cr.competition_id JOIN tafa_seasons s ON s.id=c.season_id JOIN competition_entry_members m ON m.entry_id=e.id JOIN users u ON u.id=m.user_id WHERE cr.confirmed_at IS NOT NULL AND cr.result_code IN ('CHAMPION','RUNNER_UP') AND c.code<>'PROMOCION' AND (e.entry_type<>'DUO' OR (SELECT COUNT(DISTINCT user_id) FROM competition_entry_members WHERE entry_id=e.id)<=2 OR EXISTS (SELECT 1 FROM competition_encounters win JOIN competition_stages ws ON ws.id=win.stage_id JOIN competition_round_links wl ON wl.id=win.round_link_id WHERE ws.competition_id=c.id AND win.winner_entry_id=e.id AND win.admin_confirmed_at IS NOT NULL AND win.status='finished' AND (m.valid_from_round_id IS NULL OR m.valid_from_round_id<=wl.round_id) AND (m.valid_to_round_id IS NULL OR m.valid_to_round_id>wl.round_id))))").all<Award>()).results??[];
 const members=(await db.prepare("SELECT DISTINCT s.season_number AS seasonNumber,c.code,c.display_name AS name,m.user_id AS userId,u.full_name AS fullName FROM competition_entry_members m JOIN competition_entries e ON e.id=m.entry_id JOIN competitions c ON c.id=e.competition_id JOIN tafa_seasons s ON s.id=c.season_id JOIN users u ON u.id=m.user_id WHERE c.code<>'PROMOCION'").all<Member>()).results??[];
 const iffhs=(await db.prepare("SELECT t.season_number AS seasonNumber,t.user_id AS userId,u.full_name AS fullName,t.total_points_scaled AS pointsScaled FROM iffhs_season_totals t JOIN users u ON u.id=t.user_id").all<IffhsScore>()).results??[];
 const linked=(await db.prepare("SELECT DISTINCT s.season_number AS seasonNumber,rs.user_id AS userId FROM round_submissions rs JOIN rounds r ON r.id=rs.round_id AND r.status='finished' JOIN competition_round_links l ON l.round_id=r.id JOIN competitions c ON c.id=l.competition_id JOIN tafa_seasons s ON s.id=c.season_id").all<{seasonNumber:number;userId:string}>()).results??[];
 return composeHistoricalTotals(archives,scores,awards,members,iffhs,linked);
}
