import type {Env} from './index';
import {activeHistoricalArchives,archivedUserKey,historicalStats} from './historical-archive';

type Who={id:string;role:string};
type RivalRow={id:number;seasonNumber:number;competitionCode:string;competitionName:string;stageName:string;roundName:string|null;opponentId:string;opponentName:string;opponentParticipantName:string;opponentShieldUrl:string|null;scoreBasis:string;resolution:string|null;ownPoints:number;rivalPoints:number;plenos:number|null};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});
const fail=(message:string,status=400)=>json({error:message},status);
async function session(request:Request,db:D1Database):Promise<Who|null>{
 const cookie=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('prode_session='));
 if(!cookie)return null;
 let token:string;try{token=decodeURIComponent(cookie.slice('prode_session='.length));}catch{return null;}
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 return await db.prepare(`SELECT u.id,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1 LIMIT 1`).bind(hash).first<Who>();
}
type Scored={userId:string;seasonNumber:number;points:number;fulls?:number;partials?:number;errors?:number;extras?:number;fullName?:string};
// Same General tie-breaks as /api/standings/overall (including deterministic names).
const asciiKey=(value:string)=>value.replace(/[A-Z]/g,c=>c.toLowerCase());
function generalOrder(a:Scored,b:Scored){
 for(const [key,direction] of [['points',-1],['fulls',-1],['partials',-1],['errors',1],['extras',-1]] as const){
  const difference=((a[key]??0)-(b[key]??0))*direction;if(difference)return difference;
 }
 const x=asciiKey(a.fullName??a.userId),y=asciiKey(b.fullName??b.userId);
 return x<y?-1:x>y?1:a.userId<b.userId?-1:a.userId>b.userId?1:0;
}
export function rankedPositions(rows:Scored[],target:string){
 const seasons=[...new Set(rows.map(r=>r.seasonNumber))].sort((a,b)=>a-b);
 const cumulative=new Map<string,Scored>();let best:{position:number;seasonNumber:number}|null=null;
 for(const number of seasons){
  for(const row of rows.filter(r=>r.seasonNumber===number)){
   const total=cumulative.get(row.userId)??{...row,points:0,fulls:0,partials:0,errors:0,extras:0};
   for(const key of ['points','fulls','partials','errors','extras'] as const)total[key]=(total[key]??0)+(row[key]??0);
   cumulative.set(row.userId,total);
  }
  if(!cumulative.has(target))continue;
  const position=[...cumulative.values()].sort(generalOrder).findIndex(row=>row.userId===target)+1;
  if(!best||position<best.position)best={position,seasonNumber:number};
 }
 return best;
}
export function iffhsPositions(rows:Scored[],target:string,participants:string[]=[]){
 const seasons=[...new Set(rows.map(r=>r.seasonNumber))].sort((a,b)=>a-b);
 let current:number|null=null,best:{position:number;seasonNumber:number}|null=null;
 for(const number of seasons){
  const points=new Map<string,number>();
  for(const row of rows.filter(r=>r.seasonNumber>=number-4&&r.seasonNumber<=number))points.set(row.userId,(points.get(row.userId)??0)+row.points);
  const represented=points.has(target);
  if(number===seasons.at(-1))for(const user of participants)if(!points.has(user))points.set(user,0);
  if(!points.has(target))continue;
  const position=1+[...points.values()].filter(value=>value>points.get(target)!).length;
  if(number===seasons.at(-1))current=position;
  if(represented&&(!best||position<best.position))best={position,seasonNumber:number};
 }
 const throughSeason=seasons.at(-1)??null;
 const missingSeasons=throughSeason?Array.from({length:Math.min(5,throughSeason)},(_,i)=>throughSeason-i).filter(n=>!seasons.includes(n)):[];
 return {current,best,throughSeason,missingSeasons};
}
async function teamRead(db:D1Database,id:string){
 const identity=await db.prepare(`SELECT u.id,u.full_name AS participantName,p.team_name AS teamName,p.shield_url AS shieldUrl,
 (SELECT MIN(s.season_number) FROM tafa_seasons s JOIN season_division_members m ON m.season_id=s.id WHERE m.user_id=u.id AND s.status<>'draft') AS foundedSeason
 FROM users u LEFT JOIN team_profiles p ON p.user_id=u.id WHERE u.id=? AND u.role='participant'`).bind(id).first<{id:string;participantName:string;teamName:string|null;shieldUrl:string|null;foundedSeason:number|null}>();
 if(!identity)return null;
 const archives=await activeHistoricalArchives(db);
 const archiveTotals=historicalStats(archives);
 const archiveUser=archiveTotals.get(id);
 const archiveSeasonNumbers=archives.filter(a=>a.data.participants.some(p=>p.userId===id)).map(a=>a.seasonNumber);
 const stat=await db.prepare(`SELECT COUNT(DISTINCT rs.round_id) AS dates,
 COALESCE(SUM(ps.total_points),0) AS points,
 COALESCE(SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END),0) AS fulls,
 COALESCE(SUM(CASE WHEN ps.base_points=1 THEN 1 ELSE 0 END),0) AS partials,
 COALESCE(SUM(CASE WHEN ps.base_points=0 AND ps.result_type<>'VOID' THEN 1 ELSE 0 END),0) AS errors,
 COALESCE(SUM(ps.extra_points),0) AS extras, COUNT(DISTINCT op.id) AS predictions
 FROM round_submissions rs JOIN rounds r ON r.id=rs.round_id AND r.status='finished'
 LEFT JOIN matches m ON m.round_id=r.id
 LEFT JOIN official_predictions op ON op.user_id=rs.user_id AND op.match_id=m.id
 LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id AND ps.is_provisional=0
 WHERE rs.user_id=?`).bind(id).first();
 const combinedStats={
    dates:Number(stat?.dates??0)+(archiveUser?.dates??0),
    points:Number(stat?.points??0)+(archiveUser?.points??0),
    fulls:Number(stat?.fulls??0)+(archiveUser?.fulls??0),
    partials:Number(stat?.partials??0)+(archiveUser?.partials??0),
    errors:Number(stat?.errors??0)+(archiveUser?.errors??0),
    extras:Number(stat?.extras??0)+(archiveUser?.extras??0),
    predictions:Number(stat?.predictions??0)+(archiveUser?.predictions??0),
 };
 const historicTitles=archives.flatMap(({data})=>data.results.filter(r=>r.resultCode==='CHAMPION'&&archivedUserKey(data,r.participantKey)===id).map(row=>{
   const competition=data.competitions.find(c=>c.code===row.competitionCode);
   return {code:row.competitionCode,name:competition?.name??row.competitionCode,seasonNumber:data.season.number};
 }));
 const titles=await db.prepare(`SELECT c.code,c.display_name AS name,s.season_number AS seasonNumber
 FROM competition_results cr JOIN competition_entries e ON e.id=cr.entry_id
 JOIN competitions c ON c.id=cr.competition_id JOIN tafa_seasons s ON s.id=c.season_id
 WHERE cr.result_code='CHAMPION' AND cr.confirmed_at IS NOT NULL AND EXISTS (
 SELECT 1 FROM competition_entry_members m WHERE m.entry_id=e.id AND m.user_id=?
 AND (e.entry_type<>'DUO' OR
   (SELECT COUNT(DISTINCT user_id) FROM competition_entry_members WHERE entry_id=e.id)<=2 OR
   EXISTS (SELECT 1 FROM competition_encounters win
     JOIN competition_stages ws ON ws.id=win.stage_id JOIN competition_round_links wl ON wl.id=win.round_link_id
     WHERE ws.competition_id=c.id AND win.winner_entry_id=e.id AND win.admin_confirmed_at IS NOT NULL
       AND win.status='finished' AND ws.sequence=(SELECT MAX(last_stage.sequence) FROM competition_encounters last_win
         JOIN competition_stages last_stage ON last_stage.id=last_win.stage_id WHERE last_stage.competition_id=c.id
         AND last_win.winner_entry_id=e.id AND last_win.admin_confirmed_at IS NOT NULL AND last_win.status='finished')
       AND (m.valid_from_round_id IS NULL OR m.valid_from_round_id<=wl.round_id)
       AND (m.valid_to_round_id IS NULL OR m.valid_to_round_id>wl.round_id))))
 GROUP BY c.id,c.code,c.display_name,s.season_number ORDER BY s.season_number DESC,c.sort_order`).bind(id).all();
 const general=await db.prepare(`WITH totals AS (
 SELECT u.id,u.full_name,COALESCE(SUM(ps.total_points),0) AS points,
 SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END) AS fulls,SUM(CASE WHEN ps.base_points=1 THEN 1 ELSE 0 END) AS partials,
 SUM(CASE WHEN ps.base_points=0 AND ps.result_type<>'VOID' THEN 1 ELSE 0 END) AS errors,COALESCE(SUM(ps.extra_points),0) AS extras
 FROM users u JOIN round_submissions rs ON rs.user_id=u.id JOIN rounds r ON r.id=rs.round_id AND r.status='finished'
 LEFT JOIN matches m ON m.round_id=r.id LEFT JOIN official_predictions op ON op.user_id=u.id AND op.match_id=m.id
 LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id AND ps.is_provisional=0
 WHERE u.role='participant' GROUP BY u.id
 ) SELECT id,full_name AS fullName,points,fulls,partials,errors,extras,ROW_NUMBER() OVER(ORDER BY points DESC,fulls DESC,partials DESC,errors ASC,extras DESC,full_name COLLATE NOCASE,id) AS position FROM totals`).all<{id:string;fullName:string;points:number;fulls:number;partials:number;errors:number;extras:number;position:number}>();
 const generalMap=new Map<string,Scored>();
 for(const row of general.results??[])generalMap.set(row.id,{userId:row.id,seasonNumber:0,fullName:row.fullName,points:Number(row.points),fulls:Number(row.fulls??0),partials:Number(row.partials??0),errors:Number(row.errors??0),extras:Number(row.extras??0)});
 for(const [uid,arch] of archiveTotals){
   const existing=generalMap.get(uid)??{userId:uid,seasonNumber:0,fullName:arch.fullName,points:0,fulls:0,partials:0,errors:0,extras:0};
   existing.points+=arch.points;existing.fulls=(existing.fulls??0)+arch.fulls;existing.partials=(existing.partials??0)+arch.partials;existing.errors=(existing.errors??0)+arch.errors;existing.extras=(existing.extras??0)+arch.extras;
   generalMap.set(uid,existing);
 }
 const combinedGeneral=[...generalMap.values()].sort(generalOrder);
 const seasonal=await db.prepare(`WITH period AS(
 SELECT l.round_id, MIN(s.season_number) AS seasonNumber
 FROM competition_round_links l JOIN competitions c ON c.id=l.competition_id
 JOIN tafa_seasons s ON s.id=c.season_id JOIN rounds r ON r.id=l.round_id AND r.status='finished'
 GROUP BY l.round_id HAVING COUNT(DISTINCT s.season_number)=1
 ) SELECT rs.user_id AS userId,period.seasonNumber AS seasonNumber,u.full_name AS fullName,COALESCE(SUM(ps.total_points),0) AS points,
 SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END) AS fulls,SUM(CASE WHEN ps.base_points=1 THEN 1 ELSE 0 END) AS partials,
 SUM(CASE WHEN ps.base_points=0 AND ps.result_type<>'VOID' THEN 1 ELSE 0 END) AS errors,COALESCE(SUM(ps.extra_points),0) AS extras
 FROM round_submissions rs JOIN users u ON u.id=rs.user_id AND u.role='participant' JOIN period ON period.round_id=rs.round_id
 LEFT JOIN matches m ON m.round_id=rs.round_id LEFT JOIN official_predictions op ON op.user_id=rs.user_id AND op.match_id=m.id
 LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id AND ps.is_provisional=0
 GROUP BY rs.user_id,period.seasonNumber`).all<Scored>();
 const iffhs=await db.prepare(`SELECT season_number AS seasonNumber,user_id AS userId,total_points_scaled AS points FROM iffhs_season_totals ORDER BY season_number`).all<Scored>();
 const iffhsRows=[...(iffhs.results??[])];
 const iffhsAlready=new Set(iffhsRows.map(x=>x.seasonNumber+':'+x.userId));
 for(const {data} of archives)for(const r of data.iffhs){
   const uid=archivedUserKey(data,r.participantKey),key=data.season.number+':'+uid;
   if(!iffhsAlready.has(key)){iffhsRows.push({userId:uid,seasonNumber:data.season.number,points:Math.round(r.points*100)});iffhsAlready.add(key);}
 }
 const currentPosition=combinedGeneral.findIndex(r=>r.userId===id);
 const generalEntry=currentPosition>=0?{position:currentPosition+1}:null;
 // Older rounds with no linked TAFA season cannot be assigned to a seasonal snapshot.
 const linkedCoverage=await db.prepare(`SELECT COUNT(*) AS total, COUNT(CASE WHEN (SELECT COUNT(DISTINCT s.season_number) FROM competition_round_links l JOIN competitions c ON c.id=l.competition_id JOIN tafa_seasons s ON s.id=c.season_id WHERE l.round_id=r.id)=1 THEN 1 END) AS linked
 FROM rounds r WHERE r.status='finished'`).first<{total:number;linked:number}>();
 const historicalSeasonal:Scored[]=archives.flatMap(({data})=>data.statistics.map(s=>({
   userId:archivedUserKey(data,s.participantKey),seasonNumber:data.season.number,points:s.points,fulls:s.fulls??0,partials:s.partials??0,errors:s.errors??0,extras:s.extras??0,
   fullName:data.participants.find(p=>p.key===s.participantKey)?.name??s.participantKey,
 })));
 const generalBest=Number(linkedCoverage?.total??0)===Number(linkedCoverage?.linked??-1)
   ?rankedPositions([...historicalSeasonal,...(seasonal.results??[])],id):null;
 const people=await db.prepare("SELECT id FROM users WHERE role='participant'").all<{id:string}>();
 const iffhsRank=iffhsPositions(iffhsRows,id,[...(people.results??[]).map(p=>p.id),...archiveTotals.keys()]);
 const encounters=await db.prepare(`SELECT e.id,s.season_number AS seasonNumber,c.code AS competitionCode,c.display_name AS competitionName,
 st.name AS stageName,r.name AS roundName,enemy.user_id AS opponentId,COALESCE(tp.team_name,'Equipo de '||u.full_name) AS opponentName,u.full_name AS opponentParticipantName,tp.shield_url AS opponentShieldUrl,ea.entry_type AS scoreBasis,e.resolution,
 CASE WHEN mine.entry_id=e.entry_a_id THEN e.score_a ELSE e.score_b END AS ownPoints,
 CASE WHEN mine.entry_id=e.entry_a_id THEN e.score_b ELSE e.score_a END AS rivalPoints,
 (SELECT CASE WHEN COUNT(ps.prediction_id)=0 THEN NULL ELSE SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END) END FROM official_predictions op JOIN matches mm ON mm.id=op.match_id JOIN prediction_scores ps ON ps.prediction_id=op.id
 WHERE e.round_link_id IS NOT NULL AND mm.round_id=l.round_id AND op.user_id=mine.user_id AND ps.is_provisional=0 AND (e.segment_id IS NULL OR EXISTS(SELECT 1 FROM competition_round_segment_matches sm WHERE sm.segment_id=e.segment_id AND sm.match_id=mm.id))) AS plenos
 FROM competition_encounters e JOIN competition_entries ea ON ea.id=e.entry_a_id JOIN competition_stages st ON st.id=e.stage_id
 JOIN competitions c ON c.id=st.competition_id JOIN tafa_seasons s ON s.id=c.season_id
 JOIN competition_entry_members mine ON mine.entry_id IN(e.entry_a_id,e.entry_b_id) AND mine.user_id=?
 LEFT JOIN competition_round_links l ON l.id=e.round_link_id LEFT JOIN rounds r ON r.id=l.round_id
 JOIN competition_entry_members enemy ON enemy.entry_id=CASE WHEN mine.entry_id=e.entry_a_id THEN e.entry_b_id ELSE e.entry_a_id END
 JOIN users u ON u.id=enemy.user_id LEFT JOIN team_profiles tp ON tp.user_id=u.id
 WHERE e.admin_confirmed_at IS NOT NULL AND e.status='finished' AND e.score_a IS NOT NULL AND e.score_b IS NOT NULL
 AND enemy.user_id<>mine.user_id
 AND (ea.entry_type<>'DUO' OR l.round_id IS NOT NULL)
 AND (l.round_id IS NULL OR ((mine.valid_from_round_id IS NULL OR mine.valid_from_round_id<=l.round_id) AND (mine.valid_to_round_id IS NULL OR mine.valid_to_round_id>l.round_id)
 AND (enemy.valid_from_round_id IS NULL OR enemy.valid_from_round_id<=l.round_id) AND (enemy.valid_to_round_id IS NULL OR enemy.valid_to_round_id>l.round_id)))
 GROUP BY e.id,enemy.user_id
 ORDER BY s.season_number DESC,e.id DESC`).bind(id).all<RivalRow>();
 const historicMatches=archives.flatMap(({data})=>data.matches.flatMap((m,index)=>{
   const a=archivedUserKey(data,m.aKey),b=archivedUserKey(data,m.bKey);
   if(a!==id&&b!==id)return [];
   const other=a===id?m.bKey:m.aKey,otherId=a===id?b:a;
   const person=data.participants.find(p=>p.key===other);
   return [{id:-100000*data.season.number-index-1,seasonNumber:data.season.number,competitionCode:m.competitionCode,
    competitionName:data.competitions.find(c=>c.code===m.competitionCode)?.name??m.competitionCode,stageName:m.stage,roundName:m.round,
    opponentId:otherId,opponentName:person?.name??other,opponentParticipantName:person?.name??other,opponentShieldUrl:null,
    ownPoints:a===id?m.pointsA:m.pointsB,rivalPoints:a===id?m.pointsB:m.pointsA,plenos:a===id?m.plenosA:m.plenosB,
    scoreBasis:m.scoreBasis,resolution:null}];
 }));
 const historicMovements=archives.flatMap(({data})=>data.movements.filter(m=>archivedUserKey(data,m.participantKey)===id).map(m=>({...m,seasonNumber:data.season.number})));
 const historicDivisions=archives.flatMap(({data})=>data.participants.filter(p=>p.userId===id&&p.division).map(p=>({name:'Liga '+p.division,seasonNumber:data.season.number}))).sort((a,b)=>b.seasonNumber-a.seasonNumber);
 const latestDivision=await db.prepare(`SELECT d.name AS name,s.season_number AS seasonNumber FROM season_division_members m
 JOIN tafa_seasons s ON s.id=m.season_id JOIN season_divisions d ON d.id=m.division_id
 WHERE m.user_id=? AND s.status<>'draft' ORDER BY s.season_number DESC LIMIT 1`).bind(id).first();
 const founding=[identity.foundedSeason,...archiveSeasonNumbers].filter(x=>x!=null).map(Number).sort((a,b)=>a-b)[0]??null;
 const division=latestDivision&&Number((latestDivision as {seasonNumber:number}).seasonNumber)>=(historicDivisions[0]?.seasonNumber??0)?latestDivision:historicDivisions[0]??latestDivision;
 return {identity:{...identity,foundedSeason:founding,teamName:identity.teamName??'Equipo de '+identity.participantName},division,
   stats:combinedStats,titles:[...(titles.results??[]),...historicTitles],
   rankings:{general:{current:generalEntry?Number(generalEntry.position):null,best:generalBest},iffhs:iffhsRank},
   encounters:[...(encounters.results??[]),...historicMatches],historicalMovements:historicMovements};

}
export async function handleTeamPage(request:Request,env:Env):Promise<Response|null>{
 const pathname=new URL(request.url).pathname;
 const publicMatch=pathname.match(/^\/api\/participant\/teams\/([^/]+)$/);
 const adminMatch=pathname.match(/^\/api\/admin\/teams\/([^/]+)$/);
 if(!publicMatch&&!adminMatch)return null;
 const who=await session(request,env.DB);
 if(!who)return fail('No autorizado',401);
 let id:string;try{id=decodeURIComponent((publicMatch??adminMatch)![1]);}catch{return fail('Identificador de equipo inválido');}
 if(publicMatch){
  if(request.method!=='GET')return fail('Método no permitido',405);
  const team=await teamRead(env.DB,id);
  return team?json(team):fail('Equipo no encontrado',404);
 }
 if(who.role!=='admin')return fail('Solo el administrador puede cambiar el nombre y el escudo',403);
 if(request.method!=='PUT')return fail('Método no permitido',405);
 const person=await env.DB.prepare("SELECT id FROM users WHERE id=? AND role='participant'").bind(id).first();
 if(!person)return fail('Participante no encontrado',404);
 const data=await request.json().catch(()=>null) as {teamName?:unknown;shieldUrl?:unknown}|null;
 if(!data||typeof data.teamName!=='string'||data.teamName.trim().length<3||data.teamName.trim().length>48)return fail('El nombre del equipo debe tener entre 3 y 48 caracteres');
 const name=data.teamName.trim().replace(/\s+/g,' ');
 if(/[<>\u0000-\u001f\u007f]/.test(name))return fail('Nombre de equipo inválido');
 if(data.shieldUrl!=null&&typeof data.shieldUrl!=='string')return fail('Escudo inválido');
 const shield=(data.shieldUrl??'').trim();
 // Admin only: use TAFA-hosted asset paths, never arbitrary images or third-party URLs.
 if(shield&&!/^\/(?:participants|teams)\/[a-zA-Z0-9_-]+\.(?:png|webp|svg)$/.test(shield))return fail('Usá una imagen publicada en /participants/ o /teams/ (PNG, WebP o SVG)');
 const previous=await env.DB.prepare('SELECT team_name,shield_url FROM team_profiles WHERE user_id=?').bind(id).first();
 await env.DB.batch([
  env.DB.prepare(`INSERT INTO team_profiles(user_id,team_name,shield_url,updated_by) VALUES(?,?,?,?)
  ON CONFLICT(user_id) DO UPDATE SET team_name=excluded.team_name,shield_url=excluded.shield_url,updated_by=excluded.updated_by,updated_at=datetime('now')`).bind(id,name,shield||null,who.id),
  env.DB.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json)
   VALUES(?,'team.identity_updated','team_profile',?,?,?)`).bind(who.id,id,JSON.stringify(previous??null),JSON.stringify({teamName:name,shieldUrl:shield||null}))
 ]);
 return json({ok:true,teamName:name,shieldUrl:shield||null});
}
