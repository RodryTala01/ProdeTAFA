import type {Env} from './index';
import {handleCompetitionLeagues} from './competition-leagues';
import {evaluateTiebreak} from './competition-tiebreak';
import {competitionFamily,historicalCompetitionName,isHistoryOnlyCompetition,isWorldCupOverall} from '../src/historical-competition-family';
import type {GeneralTotal,PalmarTotal,IffhsTotal,TotalsData,PalmarAward,EditionPodium} from '../src/historical-totals-types';
import {scoringAverage} from '../src/scoring-average';
import {activeHistoricalArchives,historicalIdentityResolver} from './historical-archive';
import {documentedHistoryGroups} from '../src/historical-group-catalog';
import {archivedCompetitionFinals,combineCompetitionFinals,officialCompetitionFinals,type HistoricalFinal,type OfficialFinalRow} from '../src/historical-finals';

type Archive=Awaited<ReturnType<typeof activeHistoricalArchives>>;
type OfficialScore={userId:string;fullName:string;dates:number;points:number;fulls:number;partials:number;errors:number;extras:number;predictions:number};
type Award={seasonNumber:number;code:string;name:string;userId:string;fullName:string;resultCode:string;points?:number|null};
type Member={seasonNumber:number;code:string;name:string;userId:string;fullName:string};
type IffhsScore={seasonNumber:number;userId:string;fullName:string;pointsScaled:number};
const champions=new Set(['CHAMPION']);
const runners=new Set(['RUNNER_UP','RUNNERUP','SUBCAMPEON','SUBCHAMPION']);
const officialCodes=new Set(['LIGA_A','COPA_TOTAL','COPA_A','COPA_AMERICA','EUROCOPA','MUNDIAL','MUNDIAL_ORO','COPA_EUROAMERICA','COPA_CAMPEONES','COPA_PAPA']);

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
function knownSum(current:number|null,value:number|null|undefined){
 return value==null?current:(current??0)+value;
}
export function composeHistoricalTotals(
 archives:Archive,
 officialScores:OfficialScore[],
 officialAwards:Award[],
 officialMembers:Member[],
 officialIffhs:IffhsScore[],
 officialSeasons:Array<{seasonNumber:number;userId:string}>=[],
 officialFinalRows:OfficialFinalRow[]=[],
 completedSeasons:number[]=[]
):TotalsData{
 const historyOnly=(value:string)=>/^(AMISTOSO_NO_OFICIAL|DESAFIO_DE_CAMPEONES|DESAFIO_CAMPEONES)(?:_|$)/.test(
  value.normalize('NFD').replace(/\p{M}/gu,'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_')
 );
 const excluded=new Set([
  ...archives.flatMap(({data})=>data.competitions),
  ...officialAwards,...officialMembers
 ].filter(c=>historyOnly(c.name)).map(c=>competitionFamily(c.code)));
 const meaningful=(code:string)=>code!=='PROMOCION'&&!isWorldCupOverall(code)&&!isHistoryOnlyCompetition(code)
  &&!historyOnly(code)&&!excluded.has(competitionFamily(code));
 const archiveId=historicalIdentityResolver(archives);
 const names=new Map<string,string>();
 const participation=new Set<string>();
 const awards=new Map<string,Award>();
 const podiumFallbacks:Award[]=[];
 const iffhs=new Map<string,IffhsScore>();
 const competitionNames=new Map<string,string>();
 const officialSeasonUsers=new Set(officialSeasons.map(s=>s.seasonNumber+':'+s.userId));
 const addName=(id:string,name:string)=>{if(!names.has(id))names.set(id,name);};
 const addCompetition=(code:string,name:string)=>{if(meaningful(code)&&!competitionNames.has(code))competitionNames.set(code,historicalCompetitionName(name));};
 const addAward=(a:Award)=>{
  if(!meaningful(a.code)||(!champions.has(a.resultCode)&&!runners.has(a.resultCode)))return;
  addName(a.userId,a.fullName);addCompetition(a.code,a.name);
  const id=key(a.seasonNumber,competitionFamily(a.code),a.userId);
  const recorded=awards.get(id);
  if(!recorded)awards.set(id,a);
  else if(recorded.points==null&&a.points!=null&&recorded.resultCode===a.resultCode)recorded.points=a.points;
  participation.add(key(a.seasonNumber,competitionFamily(a.code),a.userId));
 };
 for(const a of officialAwards){
  addAward(a);
 }
 for(const a of officialMembers){
  if(!meaningful(a.code))continue;
  addName(a.userId,a.fullName);addCompetition(a.code,a.name);
  participation.add(key(a.seasonNumber,competitionFamily(a.code),a.userId));
 }
 const importedFinals:HistoricalFinal[]=[];
 // Use the same complete records for both sides of the average.
 const scored=new Map<string,{points:number;matches:number}>();
 function addScored(id:string,row:{points:number;fulls:number|null;partials:number|null;errors:number|null}){
  if(scoringAverage(row)===null)return;
  const entry=scored.get(id)??{points:0,matches:0};
  entry.points+=row.points;
  entry.matches+=row.fulls!+row.partials!+row.errors!;
  scored.set(id,entry);
 }
 const general=new Map<string,Omit<GeneralTotal,'position'|'averagePoints'|'averageFulls'|'averagePartials'|'averageErrors'|'averageExtras'>>();
 for(const score of officialScores){
  addName(score.userId,score.fullName);
  addScored(score.userId,score);
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
  importedFinals.push(...archivedCompetitionFinals(data,personKey=>archiveId(data,personKey)));
  for(const person of data.participants)addName(archiveId(data,person.key),person.name);
  const participant=(participantKey:string)=>data.participants.find(p=>p.key===participantKey);
  const display=(participantKey:string)=>participant(participantKey)?.name??participantKey;
  const addPart=(code:string,participantKey:string)=>{
   if(meaningful(code))participation.add(key(data.season.number,competitionFamily(code),archiveId(data,participantKey)));
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
    userId:archiveId(data,r.participantKey),fullName:display(r.participantKey),resultCode:r.resultCode,
    points:data.standings.find(s=>s.competitionCode===r.competitionCode&&s.participantKey===r.participantKey)?.points});
  }
  for(const c of data.competitions){
   if(!meaningful(c.code))continue;
   const standings=data.standings.filter(s=>s.competitionCode===c.code);
   const results=data.results.filter(r=>r.competitionCode===c.code);
   for(const [position,resultCode,codes] of [[1,'CHAMPION',champions],[2,'RUNNER_UP',runners]] as const){
    if(results.some(r=>codes.has(r.resultCode)))continue;
    if(c.kind!=='LEAGUE'&&!results.some(r=>champions.has(r.resultCode)))continue;
    const candidates=standings.filter(s=>s.position===position);
    if(candidates.length!==1)continue;
    const [row]=candidates;
    if(results.some(r=>r.participantKey===row.participantKey))continue;
    podiumFallbacks.push({seasonNumber:data.season.number,code:c.code,name:c.name,userId:archiveId(data,row.participantKey),
     fullName:display(row.participantKey),resultCode,points:row.points});
   }
  }
  for(const r of data.statistics){
   const userId=archiveId(data,r.participantKey);
   if(officialSeasonUsers.has(data.season.number+':'+userId))continue;
   addScored(userId,r);
   const prev=general.get(userId)??{userId,fullName:display(r.participantKey),
     points:0,fulls:null,partials:null,errors:null,extras:null,dates:0};
   general.set(userId,{...prev,points:prev.points+r.points,
     fulls:knownSum(prev.fulls,r.fulls),partials:knownSum(prev.partials,r.partials),
     errors:knownSum(prev.errors,r.errors),extras:knownSum(prev.extras,r.extras),
     dates:numberSum(prev.dates,r.dates)});
  }
  for(const r of data.iffhs){
   const userId=archiveId(data,r.participantKey),id=data.season.number+':'+userId;
   if(!iffhs.has(id))iffhs.set(id,{seasonNumber:data.season.number,userId,fullName:display(r.participantKey),pointsScaled:Math.round(r.points*100)});
  }
 }
 const awardDetails=new Map<string,PalmarAward[]>();
 const podiums=new Map<string,EditionPodium>();
 for(const award of awards.values()){
  const family=competitionFamily(award.code),champion=champions.has(award.resultCode);
  const list=awardDetails.get(award.userId)??[];
  list.push({seasonNumber:award.seasonNumber,code:award.code,name:family==='COPA_AMERICA'?'Copa América':family==='COPA_CAMPEONES'?'Copa Campeones':historicalCompetitionName(award.name),champion});
  awardDetails.set(award.userId,list);
 }
 for(const award of [...awards.values(),...podiumFallbacks]){
  const family=competitionFamily(award.code),champion=champions.has(award.resultCode);
  const key=family+':'+award.seasonNumber;
  const podium=podiums.get(key)??{seasonNumber:award.seasonNumber,entrants:[]};
  if(!podium.entrants.some(p=>p.userId===award.userId))podium.entrants.push({userId:award.userId,name:award.fullName,champion,points:award.points??null});
  podiums.set(key,podium);
 }
 for(const list of awardDetails.values())list.sort((a,b)=>b.seasonNumber-a.seasonNumber||a.name.localeCompare(b.name,'es'));
 const podiumsByCompetition:TotalsData['podiumsByCompetition']={};
 for(const [key,podium] of podiums){
  podium.entrants.sort((a,b)=>Number(b.champion)-Number(a.champion)||a.name.localeCompare(b.name,'es'));
  (podiumsByCompetition[key.split(':')[0]]??=[]).push(podium);
 }
 for(const list of Object.values(podiumsByCompetition))list.sort((a,b)=>b.seasonNumber-a.seasonNumber);
 const counts=new Map<string,{championships:number;runnerUps:number;codes:Map<string,{championships:number;runnerUps:number}>}>();
 for(const a of awards.values()){
  const entry=counts.get(a.userId)??{championships:0,runnerUps:0,codes:new Map()};
  const family=competitionFamily(a.code);
  const item=entry.codes.get(family)??{championships:0,runnerUps:0};
  if(champions.has(a.resultCode)){entry.championships++;item.championships++;}
  else{entry.runnerUps++;item.runnerUps++;}
  entry.codes.set(family,item);counts.set(a.userId,entry);
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
  runnerUps:counts.get(userId)?.runnerUps??0,awards:awardDetails.get(userId),participations:participationsByUser.get(userId)?.size??0
 })),r=>r.championships);
 const perCompetition:Record<string,PalmarTotal[]>={};
 for(const [code] of competitionNames){
  const family=competitionFamily(code);
  const ids=new Set([...participationByCompetition.get(family)?.keys()??[],...[...counts].filter(([,value])=>value.codes.has(family)).map(([id])=>id)]);
  perCompetition[code]=rankSort([...ids].map(userId=>({
   userId,fullName:names.get(userId)??userId,
   championships:counts.get(userId)?.codes.get(family)?.championships??0,
   runnerUps:counts.get(userId)?.codes.get(family)?.runnerUps??0,
   awards:awardDetails.get(userId)?.filter(a=>competitionFamily(a.code)===family),
   participations:participationByCompetition.get(family)?.get(userId)??0
  })),r=>r.championships);
 }
 const palmaresOfficial=rankSort(palmares.flatMap(row=>{
  const participations=[...(participationsByUser.get(row.userId)??[])].filter(id=>officialCodes.has(id.split(':')[1])).length;
  if(!participations)return [];
  const awards=[...(counts.get(row.userId)?.codes??[])].filter(([code])=>officialCodes.has(code)).map(([,award])=>award);
  return [{...row,awards:row.awards?.filter(a=>officialCodes.has(competitionFamily(a.code))),participations,championships:awards.reduce((sum,a)=>sum+a.championships,0),runnerUps:awards.reduce((sum,a)=>sum+a.runnerUps,0)}];
 }),r=>r.championships);
 const latestChampions:TotalsData['latestChampions']={};
 for(const award of awards.values()){
  if(!champions.has(award.resultCode))continue;
  const code=competitionFamily(award.code),last=latestChampions[code],name=names.get(award.userId)??award.userId;
  if(!last||last.seasonNumber<award.seasonNumber)latestChampions[code]={seasonNumber:award.seasonNumber,name};
  else if(last.seasonNumber===award.seasonNumber)last.name+=' · '+name;
 }
 const seasons=[...new Set([...archives.map(a=>a.seasonNumber),...officialIffhs.map(r=>r.seasonNumber),...officialAwards.map(r=>r.seasonNumber)])].sort((a,b)=>b-a);
 const iffhsSeasons=[...new Set([...iffhs.values()].map(r=>r.seasonNumber))].sort((a,b)=>b-a);
 const last=Math.max(0,...iffhsSeasons,...completedSeasons,...archives.map(a=>a.seasonNumber));const officialWindow=Array.from({length:Math.min(5,last)},(_,index)=>last-index);
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
  .map(r=>({...r,averagePoints:scored.has(r.userId)?scored.get(r.userId)!.points/scored.get(r.userId)!.matches:null,
   averageFulls:r.dates&&r.dates>0&&r.fulls!==null?r.fulls/r.dates:null,
   averagePartials:r.dates&&r.dates>0&&r.partials!==null?r.partials/r.dates:null,
   averageErrors:r.dates&&r.dates>0&&r.errors!==null?r.errors/r.dates:null,
   averageExtras:r.dates&&r.dates>0&&r.extras!==null?r.extras/r.dates:null}));
 return {seasons,competitions:[...competitionNames].filter(([code],index,all)=>all.findIndex(([other])=>competitionFamily(other)===competitionFamily(code))===index).map(([code,name])=>({code,name:competitionFamily(code)==='COPA_AMERICA'?'Copa América':competitionFamily(code)==='COPA_CAMPEONES'?'Copa Campeones':name})),
  palmares,palmaresOfficial,latestChampions,perCompetition,podiumsByCompetition,finalsByCompetition:combineCompetitionFinals(importedFinals.filter(f=>meaningful(f.competitionCode)),officialCompetitionFinals(officialFinalRows).filter(f=>meaningful(f.competitionCode))),
  iffhsOfficial:{seasons:officialWindow,ranking:rankedIffhs(officialWindow)},
  iffhsTotal:rankedIffhs([...new Set([...seasons,...iffhsSeasons])].sort((a,b)=>b-a)),general:overall};
}
export async function historicalTotals(request:Request,env:Env):Promise<TotalsData>{
 const db=env.DB;
 const archives=await activeHistoricalArchives(db);
 const scores=(await db.prepare("SELECT u.id AS userId,u.full_name AS fullName, COUNT(DISTINCT r.id) AS dates,COALESCE(SUM(ps.total_points),0) AS points,SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END) AS fulls,SUM(CASE WHEN ps.base_points=1 THEN 1 ELSE 0 END) AS partials,SUM(CASE WHEN ps.base_points=0 AND ps.result_type<>'VOID' THEN 1 ELSE 0 END) AS errors,COALESCE(SUM(ps.extra_points),0) AS extras,COUNT(DISTINCT op.id) AS predictions FROM round_submissions rs JOIN users u ON u.id=rs.user_id AND u.role='participant' JOIN rounds r ON r.id=rs.round_id AND r.status='finished' LEFT JOIN matches m ON m.round_id=r.id LEFT JOIN official_predictions op ON op.user_id=u.id AND op.match_id=m.id LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id AND ps.is_provisional=0 GROUP BY u.id,u.full_name").all<OfficialScore>()).results??[];
 const awards=(await db.prepare("SELECT DISTINCT s.season_number AS seasonNumber,c.code,c.display_name AS name,m.user_id AS userId,u.full_name AS fullName,cr.result_code AS resultCode FROM competition_results cr JOIN competition_entries e ON e.id=cr.entry_id JOIN competitions c ON c.id=cr.competition_id JOIN tafa_seasons s ON s.id=c.season_id JOIN competition_entry_members m ON m.entry_id=e.id JOIN users u ON u.id=m.user_id WHERE cr.confirmed_at IS NOT NULL AND cr.result_code IN ('CHAMPION','RUNNER_UP') AND c.code<>'PROMOCION' AND (e.entry_type<>'DUO' OR (SELECT COUNT(DISTINCT user_id) FROM competition_entry_members WHERE entry_id=e.id)<=2 OR EXISTS (SELECT 1 FROM competition_encounters win JOIN competition_stages ws ON ws.id=win.stage_id JOIN competition_round_links wl ON wl.id=win.round_link_id WHERE ws.competition_id=c.id AND win.winner_entry_id=e.id AND win.admin_confirmed_at IS NOT NULL AND win.status='finished' AND (m.valid_from_round_id IS NULL OR m.valid_from_round_id<=wl.round_id) AND (m.valid_to_round_id IS NULL OR m.valid_to_round_id>wl.round_id)))").all<Award>()).results??[];
 const members=(await db.prepare("SELECT DISTINCT s.season_number AS seasonNumber,c.code,c.display_name AS name,m.user_id AS userId,u.full_name AS fullName FROM competition_entry_members m JOIN competition_entries e ON e.id=m.entry_id JOIN competitions c ON c.id=e.competition_id JOIN tafa_seasons s ON s.id=c.season_id JOIN users u ON u.id=m.user_id WHERE c.code<>'PROMOCION'").all<Member>()).results??[];
 const iffhs=(await db.prepare("SELECT t.season_number AS seasonNumber,t.user_id AS userId,u.full_name AS fullName,t.total_points_scaled AS pointsScaled FROM iffhs_season_totals t JOIN users u ON u.id=t.user_id").all<IffhsScore>()).results??[];
 const linked=(await db.prepare("SELECT DISTINCT s.season_number AS seasonNumber,rs.user_id AS userId FROM round_submissions rs JOIN rounds r ON r.id=rs.round_id AND r.status='finished' JOIN competition_round_links l ON l.round_id=r.id JOIN competitions c ON c.id=l.competition_id JOIN tafa_seasons s ON s.id=c.season_id").all<{seasonNumber:number;userId:string}>()).results??[];
 const finals=(await db.prepare(`SELECT en.id AS encounterId,se.season_number AS seasonNumber,c.code AS competitionCode,
   st.code AS stageCode,st.name AS stageName,
   a.display_name AS aName,b.display_name AS bName,
   CASE WHEN a.entry_type='INDIVIDUAL' THEN (SELECT mem.user_id FROM competition_entry_members mem WHERE mem.entry_id=a.id ORDER BY mem.id LIMIT 1) ELSE NULL END AS aUserId,
   CASE WHEN b.entry_type='INDIVIDUAL' THEN (SELECT mem.user_id FROM competition_entry_members mem WHERE mem.entry_id=b.id ORDER BY mem.id LIMIT 1) ELSE NULL END AS bUserId,
   en.score_a AS scoreA,en.score_b AS scoreB,en.entry_a_id AS entryAId,
   CASE en.winner_entry_id WHEN a.id THEN 'a' WHEN b.id THEN 'b' END AS winner,
   CASE WHEN a.entry_type='DUO' THEN (
    SELECT json_group_array(json_object('userId',userId,'name',name)) FROM (
     SELECT u.id AS userId,u.full_name AS name FROM competition_entry_members mem JOIN users u ON u.id=mem.user_id
     WHERE mem.entry_id=a.id AND (mem.valid_from_round_id IS NULL OR mem.valid_from_round_id<=l.round_id)
      AND (mem.valid_to_round_id IS NULL OR mem.valid_to_round_id>l.round_id)
     ORDER BY mem.id
    )
   ) END AS aMembersJson,
   CASE WHEN b.entry_type='DUO' THEN (
    SELECT json_group_array(json_object('userId',userId,'name',name)) FROM (
     SELECT u.id AS userId,u.full_name AS name FROM competition_entry_members mem JOIN users u ON u.id=mem.user_id
     WHERE mem.entry_id=b.id AND (mem.valid_from_round_id IS NULL OR mem.valid_from_round_id<=l.round_id)
      AND (mem.valid_to_round_id IS NULL OR mem.valid_to_round_id>l.round_id)
     ORDER BY mem.id
    )
   ) END AS bMembersJson,
   (SELECT t.id FROM competition_tiebreaks t WHERE t.encounter_id=en.id AND t.status='resolved' ORDER BY t.id DESC LIMIT 1) AS tieId
  FROM competition_encounters en
  JOIN competition_stages st ON st.id=en.stage_id AND st.stage_type='KNOCKOUT'
  JOIN competitions c ON c.id=st.competition_id
  JOIN tafa_seasons se ON se.id=c.season_id
  JOIN competition_entries a ON a.id=en.entry_a_id
  JOIN competition_entries b ON b.id=en.entry_b_id
  LEFT JOIN competition_round_links l ON l.id=en.round_link_id
  WHERE se.status<>'draft' AND en.status='finished' AND en.admin_confirmed_at IS NOT NULL
   AND (LOWER(st.code) LIKE '%final%' OR LOWER(st.name) LIKE '%final%')
  ORDER BY se.season_number DESC,en.id`).all<OfficialFinalRow&{tieId:number|null;entryAId:number;aMembersJson:string|null;bMembersJson:string|null}>()).results??[];
 for(const final of finals){
  if(final.aMembersJson)final.aMembers=JSON.parse(final.aMembersJson);
  if(final.bMembersJson)final.bMembers=JSON.parse(final.bMembersJson);
 }
 const leagueEditions=new Map<string,Award[]>();
 for(const award of awards){
  if(!['LIGA_A','LIGA_B'].includes(award.code))continue;
  const key=award.code+':'+award.seasonNumber;
  const edition=leagueEditions.get(key)??[];
  edition.push(award);leagueEditions.set(key,edition);
 }
 await Promise.all([
  ...[...leagueEditions.values()].map(async edition=>{
   const [{code,seasonNumber}]=edition;
   const url=new URL('/api/competition-engine/leagues/'+code+'/standings?season='+seasonNumber,request.url);
   const response=await handleCompetitionLeagues(new Request(url,{headers:request.headers}),env);
   if(!response?.ok)return;
   const {standings}=await response.json() as {standings:Array<{userId:string;points:number}>};
   for(const award of edition)award.points=standings.find(row=>row.userId===award.userId)?.points;
  }),
  ...finals.filter(f=>f.tieId!==null&&f.scoreA===f.scoreB).map(async final=>{
   const evaluation=await evaluateTiebreak(env,final.tieId!);
   if(!evaluation||!evaluation.winnerEntryId)return;
   const day=evaluation.days.find((d:{complete:boolean;scoreA:number;scoreB:number;matches:Array<{matchId:number}>})=>
    evaluation.state==='RESOLVED_MATCH'?d.matches.some(m=>m.matchId===evaluation.decidingMatchId):
    evaluation.state==='RESOLVED_DAY'&&d.complete&&d.scoreA!==d.scoreB);
   if(!day)return;
   const scores:{scoreA:number;scoreB:number}=evaluation.state==='RESOLVED_MATCH'
    ?day.matches.slice(0,day.matches.findIndex((m:{matchId:number})=>m.matchId===evaluation.decidingMatchId)+1)
     .reduce((total:{scoreA:number;scoreB:number},m:{scoreA:number;scoreB:number})=>({scoreA:total.scoreA+m.scoreA,scoreB:total.scoreB+m.scoreB}),{scoreA:0,scoreB:0})
    :day;
   const sameSide=evaluation.entries[0].entry_id===final.entryAId;
   final.tieA=sameSide?scores.scoreA:scores.scoreB;
   final.tieB=sameSide?scores.scoreB:scores.scoreA;
  }),
 ]);
 const completed=(await db.prepare("SELECT season_number AS number FROM tafa_seasons WHERE status IN ('finished','archived')").all<{number:number}>()).results??[];
 return composeHistoricalTotals(archives,scores,awards,members,iffhs,linked,finals,completed.map(s=>s.number));
}
