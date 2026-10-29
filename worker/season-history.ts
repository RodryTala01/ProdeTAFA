import type {Env} from './index';
import type {ArchivePayload} from '../src/historical-schema';
import type {HistorySummary,HistoryDetail} from '../src/history-types';
import {activeHistoricalArchives} from './historical-archive';
import {handleCompetitionLeagues} from './competition-leagues';

const rows=async <T>(db:D1Database,sql:string,...args:(string|number)[]) => (await db.prepare(sql).bind(...args).all<T>()).results??[];
export function importedSummary(data:ArchivePayload):HistorySummary{
 return {number:data.season.number,name:data.season.name,source:'imported',participantCount:data.participants.length,
 competitions:data.competitions.map(c=>({...c,champions:data.results.filter(r=>r.competitionCode===c.code&&r.resultCode==='CHAMPION').map(r=>r.teamLabel||data.participants.find(p=>p.key===r.participantKey)?.name||'Participante no disponible')}))};
}
export async function historySummaries(db:D1Database){
 const imported=(await activeHistoricalArchives(db)).map(({data})=>importedSummary(data));
 const seasons=await rows<{number:number;name:string;participantCount:number}>(db,`SELECT s.season_number AS number,s.name,
 (SELECT COUNT(DISTINCT m.user_id) FROM competition_entry_members m JOIN competition_entries e ON e.id=m.entry_id JOIN competitions c ON c.id=e.competition_id WHERE c.season_id=s.id) AS participantCount
 FROM tafa_seasons s WHERE s.status IN ('finished','archived') AND EXISTS(SELECT 1 FROM competitions c WHERE c.season_id=s.id AND (EXISTS(SELECT 1 FROM competition_results r WHERE r.competition_id=c.id) OR EXISTS(SELECT 1 FROM competition_round_links l JOIN rounds rd ON rd.id=l.round_id WHERE l.competition_id=c.id AND rd.status='finished'))) ORDER BY s.season_number`);
 const result:HistorySummary[]=[...imported];
 for(const s of seasons){
  // Old imports and official seasons must never produce duplicate season cards.
  const importedIndex=result.findIndex(x=>x.number===s.number);
  const competitions=await rows<{code:string;name:string;kind:string}>(db,`SELECT c.code,c.display_name AS name,c.family AS kind FROM competitions c JOIN tafa_seasons s ON s.id=c.season_id WHERE s.season_number=? AND (EXISTS(SELECT 1 FROM competition_results r WHERE r.competition_id=c.id) OR EXISTS(SELECT 1 FROM competition_round_links l JOIN rounds rd ON rd.id=l.round_id WHERE l.competition_id=c.id AND rd.status='finished')) ORDER BY c.sort_order,c.id`,s.number);
  const champions=await rows<{code:string;name:string}>(db,`SELECT c.code,e.display_name AS name FROM competition_results r JOIN competitions c ON c.id=r.competition_id JOIN tafa_seasons s ON s.id=c.season_id JOIN competition_entries e ON e.id=r.entry_id WHERE s.season_number=? AND r.result_code='CHAMPION'`,s.number);
  const official={...s,source:'official' as const,competitions:competitions.map(c=>({...c,champions:champions.filter(x=>x.code===c.code).map(x=>x.name)}))};
  if(importedIndex<0)result.push(official);
  else {
   const old=result[importedIndex];
   const members=await rows<{id:string}>(db,`SELECT DISTINCT m.user_id AS id FROM competition_entry_members m JOIN competition_entries e ON e.id=m.entry_id JOIN competitions c ON c.id=e.competition_id JOIN tafa_seasons s ON s.id=c.season_id WHERE s.season_number=?`,s.number);
   const archived=(await activeHistoricalArchives(db)).find(x=>x.seasonNumber===s.number)!.data;
   const ids=new Set([...members.map(m=>m.id),...archived.participants.map(p=>p.userId||'historical:'+p.key)]);
   result[importedIndex]={...official,source:'mixed',participantCount:ids.size,competitions:[...old.competitions.filter(c=>!competitions.some(o=>o.code===c.code)),...official.competitions]};
  }
 }
 return result.sort((a,b)=>a.number-b.number);
}
export async function historyDetail(request:Request,env:Env,number:number):Promise<HistoryDetail|null>{
 const summary=(await historySummaries(env.DB)).find(s=>s.number===number);if(!summary)return null;
 if(summary.source==='imported'){
  const data=(await activeHistoricalArchives(env.DB)).find(x=>x.seasonNumber===number)!.data;
  // Explicit public projection: never return source file, audit records or payload metadata.
  return {summary,data:{...data,season:{...data.season,notes:''}},officialLinks:[],unavailable:[]};
 }
 const db=env.DB;
 const imported=summary.source==='mixed'?(await activeHistoricalArchives(db)).find(x=>x.seasonNumber===number)!.data:null;
 const data:ArchivePayload={version:1,season:{number,name:summary.name,kind:'OFICIAL',notes:''},participants:[],competitions:summary.competitions.map(c=>({code:c.code,name:c.name,kind:c.kind as 'LEAGUE'|'CUP'|'PROMOTION'})),statistics:[],standings:[],rounds:[],results:[],matches:[],movements:[],iffhs:[]};
 const entries=await rows<{id:number;name:string;userId:string|null;fullName:string|null}>(db,`SELECT e.id,e.display_name AS name,CASE WHEN e.entry_type='INDIVIDUAL' THEN m.user_id END AS userId,u.full_name AS fullName FROM competition_entries e JOIN competitions c ON c.id=e.competition_id JOIN tafa_seasons s ON s.id=c.season_id LEFT JOIN competition_entry_members m ON m.entry_id=e.id AND e.entry_type='INDIVIDUAL' LEFT JOIN users u ON u.id=m.user_id WHERE s.season_number=? GROUP BY e.id`,number);
 data.participants=entries.map(e=>({key:'entry:'+e.id,name:e.fullName||e.name,userId:e.userId,division:null}));
 const results=await rows<{code:string;entryId:number;position:number|null;resultCode:string}>(db,`SELECT c.code,r.entry_id AS entryId,r.final_position AS position,r.result_code AS resultCode FROM competition_results r JOIN competitions c ON c.id=r.competition_id JOIN tafa_seasons s ON s.id=c.season_id WHERE s.season_number=? ORDER BY c.sort_order,r.final_position,r.id`,number);
 data.results=results.map(r=>({competitionCode:r.code,participantKey:'entry:'+r.entryId,position:r.position,resultCode:r.resultCode,teamLabel:null}));
 data.matches=await rows(db,`SELECT CAST(e.id AS TEXT) AS matchId,c.code AS competitionCode,st.name AS stage,rd.name AS round,'entry:'||e.entry_a_id AS aKey,'entry:'||e.entry_b_id AS bKey,e.score_a AS pointsA,e.score_b AS pointsB,NULL AS plenosA,NULL AS plenosB,CASE WHEN a.entry_type='DUO' THEN 'DUO' ELSE 'INDIVIDUAL' END AS scoreBasis FROM competition_encounters e JOIN competition_stages st ON st.id=e.stage_id JOIN competitions c ON c.id=st.competition_id JOIN tafa_seasons s ON s.id=c.season_id JOIN competition_entries a ON a.id=e.entry_a_id LEFT JOIN competition_round_links l ON l.id=e.round_link_id LEFT JOIN rounds rd ON rd.id=l.round_id WHERE s.season_number=? AND e.admin_confirmed_at IS NOT NULL AND e.status='finished' AND e.entry_b_id IS NOT NULL AND e.score_a IS NOT NULL AND e.score_b IS NOT NULL ORDER BY st.sequence,e.id`,number);
 const officialLinks=await rows<{code:string;roundId:number;name:string}>(db,`SELECT DISTINCT c.code,l.round_id AS roundId,r.name FROM competition_round_links l JOIN competitions c ON c.id=l.competition_id JOIN tafa_seasons s ON s.id=c.season_id JOIN rounds r ON r.id=l.round_id WHERE s.season_number=? AND r.status='finished' ORDER BY l.sequence`,number);
 // Reuse the canonical Liga read model rather than calculating another ranking.
 for(const c of summary.competitions.filter(c=>c.kind==='LEAGUE')){
  const response=await handleCompetitionLeagues(new Request(new URL('/api/competition-engine/leagues/'+c.code+'/standings?season='+number,request.url),{headers:request.headers}),env);
  if(!response?.ok)continue;
  const league=await response.json() as {standings:Array<{userId:string;fullName:string;position:number;points:number;fulls:number;partials:number;errors:number;extras:number;rounds:Array<{roundId:number;name:string;status:string;points:number;fulls:number;partials:number;errors:number;extras:number}>}>};
  for(const r of league.standings){
   const key=r.userId; if(!data.participants.some(p=>p.key===key))data.participants.push({key,name:r.fullName,userId:r.userId,division:null});
   data.standings.push({competitionCode:c.code,participantKey:key,position:r.position,points:r.points,fulls:r.fulls,partials:r.partials,errors:r.errors,extras:r.extras});
   for(const rd of r.rounds.filter(rd=>rd.status==='finished'))data.rounds.push({competitionCode:c.code,round:rd.name||officialLinks.find(l=>l.roundId===rd.roundId)?.name||String(rd.roundId),participantKey:key,points:rd.points,fulls:rd.fulls,partials:rd.partials,errors:rd.errors,extras:rd.extras});
  }
 }
 // Public per-Fecha statistics from persisted scores only; no new sporting calculation.
 const cupRounds=await rows<ArchivePayload['rounds'][number]&{name:string;userId:string}>(db,`WITH targets AS (
 SELECT DISTINCT c.code AS competitionCode,l.round_id AS roundId,r.name AS round,u.id AS participantKey,u.full_name AS name,u.id AS userId
 FROM competition_round_links l JOIN competitions c ON c.id=l.competition_id AND c.family<>'LEAGUE' JOIN tafa_seasons s ON s.id=c.season_id
 JOIN rounds r ON r.id=l.round_id AND r.status='finished' JOIN competition_entries e ON e.competition_id=c.id
 JOIN competition_entry_members mem ON mem.entry_id=e.id AND (mem.valid_from_round_id IS NULL OR mem.valid_from_round_id<=r.id) AND (mem.valid_to_round_id IS NULL OR mem.valid_to_round_id>r.id)
 JOIN users u ON u.id=mem.user_id WHERE s.season_number=? AND (EXISTS(SELECT 1 FROM competition_encounters ce WHERE ce.round_link_id=l.id AND (ce.entry_a_id=e.id OR ce.entry_b_id=e.id)) OR EXISTS(SELECT 1 FROM competition_survival_results sr WHERE sr.round_link_id=l.id AND sr.entry_id=e.id))
 ) SELECT t.competitionCode,t.round,t.participantKey,t.name,t.userId,SUM(ps.total_points) AS points,SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END) AS fulls,SUM(CASE WHEN ps.base_points=1 THEN 1 ELSE 0 END) AS partials,SUM(CASE WHEN ps.base_points=0 AND m.status<>'void' THEN 1 ELSE 0 END) AS errors,SUM(ps.extra_points) AS extras
 FROM targets t JOIN round_submissions rs ON rs.round_id=t.roundId AND rs.user_id=t.userId
 JOIN matches m ON m.round_id=t.roundId JOIN official_predictions op ON op.match_id=m.id AND op.user_id=t.userId
 JOIN prediction_scores ps ON ps.prediction_id=op.id AND ps.is_provisional=0
 WHERE m.status IN ('finished','void') GROUP BY t.competitionCode,t.roundId,t.userId ORDER BY t.roundId,t.userId`,number);
 for(const r of cupRounds){if(!data.participants.some(p=>p.key===r.userId))data.participants.push({key:r.userId,name:r.name,userId:r.userId,division:null});data.rounds.push({competitionCode:r.competitionCode,round:r.round,participantKey:r.userId,points:r.points,fulls:r.fulls,partials:r.partials,errors:r.errors,extras:r.extras});}
 const iffhs=await rows<{userId:string;name:string;points:number;position:number}>(db,`SELECT RANK() OVER(ORDER BY t.total_points_scaled DESC) AS position,t.user_id AS userId,u.full_name AS name,t.total_points_scaled/100.0 AS points FROM iffhs_season_totals t JOIN users u ON u.id=t.user_id WHERE t.season_number=? ORDER BY t.total_points_scaled DESC,u.full_name`,number);
 for(const p of iffhs){if(!data.participants.some(x=>x.key===p.userId))data.participants.push({key:p.userId,name:p.name,userId:p.userId,division:null});data.iffhs.push({participantKey:p.userId,points:p.points,position:p.position});}
 const movements=await rows<{userId:string;name:string;fromDivision:string|null;toDivision:string|null}>(db,`SELECT m.user_id AS userId,u.full_name AS name,f.code AS fromDivision,t.code AS toDivision FROM season_division_movements m JOIN tafa_seasons s ON s.id=m.season_id JOIN users u ON u.id=m.user_id LEFT JOIN season_divisions f ON f.id=m.from_division_id LEFT JOIN season_divisions t ON t.id=m.to_division_id WHERE s.season_number=? AND m.status='confirmed'`,number);
 for(const m of movements){if(!data.participants.some(p=>p.key===m.userId))data.participants.push({key:m.userId,name:m.name,userId:m.userId,division:null});data.movements.push({participantKey:m.userId,fromDivision:m.fromDivision,toDivision:m.toDivision,type:m.fromDivision==='B'&&m.toDivision==='A'?'ASCENSO':m.fromDivision==='A'&&m.toDivision==='B'?'DESCENSO':m.fromDivision&&m.fromDivision===m.toDivision?'PERMANENCIA':'OTRO',detail:null});}
 if(imported){
  const officialCodes=new Set((await rows<{code:string}>(db,`SELECT DISTINCT c.code FROM competitions c JOIN tafa_seasons s ON s.id=c.season_id WHERE s.season_number=? AND (EXISTS(SELECT 1 FROM competition_results r WHERE r.competition_id=c.id) OR EXISTS(SELECT 1 FROM competition_round_links l JOIN rounds rd ON rd.id=l.round_id WHERE l.competition_id=c.id AND rd.status='finished'))`,number)).map(c=>c.code));
  const key=(k:string)=>'imported:'+k;
  data.participants.push(...imported.participants.map(p=>({...p,key:key(p.key)})));
  data.standings.push(...imported.standings.filter(r=>!officialCodes.has(r.competitionCode)).map(r=>({...r,participantKey:key(r.participantKey)})));
  data.rounds.push(...imported.rounds.filter(r=>r.competitionCode&&!officialCodes.has(r.competitionCode)).map(r=>({...r,participantKey:key(r.participantKey)})));
  data.results.push(...imported.results.filter(r=>!officialCodes.has(r.competitionCode)).map(r=>({...r,participantKey:key(r.participantKey)})));
  data.matches.push(...imported.matches.filter(r=>!officialCodes.has(r.competitionCode)).map(r=>({...r,matchId:'imported:'+r.matchId,aKey:key(r.aKey),bKey:key(r.bKey)})));
  for(const r of imported.iffhs){const p=imported.participants.find(p=>p.key===r.participantKey);if(!data.iffhs.some(o=>o.participantKey===p?.userId))data.iffhs.push({...r,participantKey:key(r.participantKey)});}
  for(const r of imported.movements){const p=imported.participants.find(p=>p.key===r.participantKey);if(!data.movements.some(o=>o.participantKey===p?.userId&&o.type===r.type))data.movements.push({...r,participantKey:key(r.participantKey)});}
 }
 return {summary,data,officialLinks,unavailable:[]};
}
