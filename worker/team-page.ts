import type {Env} from './index';

type Who={id:string;role:string};
type RivalRow={id:number;seasonNumber:number;competitionCode:string;competitionName:string;stageName:string;roundName:string|null;opponentId:string;opponentName:string;ownPoints:number;rivalPoints:number;plenos:number|null};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8'}});
const fail=(message:string,status=400)=>json({error:message},status);
async function session(request:Request,db:D1Database):Promise<Who|null>{
 const cookie=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('prode_session='));
 if(!cookie)return null;
 const token=decodeURIComponent(cookie.slice('prode_session='.length));
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 return await db.prepare(`SELECT u.id,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1 LIMIT 1`).bind(hash).first<Who>();
}
type Scored={userId:string;seasonNumber:number;points:number};
export function rankedPositions(rows:Scored[], target:string){
 const seasons=[...new Set(rows.map(r=>r.seasonNumber))].sort((a,b)=>a-b);
 const cumulative=new Map<string,number>();let best:{position:number;seasonNumber:number}|null=null;
 for(const number of seasons){
  const present=new Set<string>();
  for(const r of rows.filter(x=>x.seasonNumber===number)){
   cumulative.set(r.userId,(cumulative.get(r.userId)??0)+r.points);
   present.add(r.userId);
  }
  if(!cumulative.has(target))continue;
  const points=[...cumulative.values()].sort((a,b)=>b-a);
  const position=1+points.filter(v=>v>(cumulative.get(target)??0)).length;
  if(!best||position<best.position)best={position,seasonNumber:number};
 }
 return best;
}
export function iffhsPositions(rows:Scored[],target:string){
 const seasons=[...new Set(rows.map(r=>r.seasonNumber))].sort((a,b)=>a-b);
 let current:number|null=null, best:{position:number;seasonNumber:number}|null=null;
 for(const number of seasons){
  const points=new Map<string,number>();
  for(const r of rows.filter(x=>x.seasonNumber>=number-4&&x.seasonNumber<=number))
   points.set(r.userId,(points.get(r.userId)??0)+r.points);
  if(!points.has(target))continue;
  const position=1+[...points.values()].filter(v=>v>points.get(target)!).length;
  current=position;
  if(!best||position<best.position)best={position,seasonNumber:number};
 }
 return {current,best,throughSeason:seasons.at(-1)??null};
}
async function teamRead(db:D1Database,id:string){
 const identity=await db.prepare(`SELECT u.id,u.full_name AS participantName,p.team_name AS teamName,p.shield_url AS shieldUrl,
 (SELECT MIN(s.season_number) FROM tafa_seasons s JOIN season_division_members m ON m.season_id=s.id WHERE m.user_id=u.id) AS foundedSeason
 FROM users u LEFT JOIN team_profiles p ON p.user_id=u.id WHERE u.id=? AND u.role='participant'`).bind(id).first<{id:string;participantName:string;teamName:string|null;shieldUrl:string|null;foundedSeason:number|null}>();
 if(!identity)return null;
 const stat=await db.prepare(`SELECT COUNT(DISTINCT rs.round_id) AS dates,
 COALESCE(SUM(ps.total_points),0) AS points,
 COALESCE(SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END),0) AS fulls,
 COALESCE(SUM(CASE WHEN ps.base_points=1 THEN 1 ELSE 0 END),0) AS partials,
 COALESCE(SUM(CASE WHEN ps.base_points=0 AND ps.result_type<>'VOID' THEN 1 ELSE 0 END),0) AS errors,
 COALESCE(SUM(ps.extra_points),0) AS extras, COUNT(DISTINCT CASE WHEN ps.prediction_id IS NOT NULL THEN op.id END) AS predictions
 FROM round_submissions rs JOIN rounds r ON r.id=rs.round_id AND r.status='finished'
 LEFT JOIN matches m ON m.round_id=r.id
 LEFT JOIN official_predictions op ON op.user_id=rs.user_id AND op.match_id=m.id
 LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id AND ps.is_provisional=0
 WHERE rs.user_id=?`).bind(id).first();
 const titles=await db.prepare(`SELECT c.code,c.display_name AS name,s.season_number AS seasonNumber
 FROM competition_results cr JOIN competition_entries e ON e.id=cr.entry_id
 JOIN competitions c ON c.id=cr.competition_id JOIN tafa_seasons s ON s.id=c.season_id
 WHERE cr.result_code='CHAMPION' AND cr.confirmed_at IS NOT NULL AND EXISTS (
 SELECT 1 FROM competition_entry_members m WHERE m.entry_id=e.id AND m.user_id=?)
 GROUP BY c.id,c.code,c.display_name,s.season_number
 ORDER BY s.season_number DESC,c.sort_order`).bind(id).all();
 const general=await db.prepare(`WITH totals AS (
 SELECT u.id,COALESCE(SUM(ps.total_points),0) AS points
 FROM users u JOIN round_submissions rs ON rs.user_id=u.id JOIN rounds r ON r.id=rs.round_id AND r.status='finished'
 LEFT JOIN matches m ON m.round_id=r.id LEFT JOIN official_predictions op ON op.user_id=u.id AND op.match_id=m.id
 LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id AND ps.is_provisional=0
 WHERE u.role='participant' GROUP BY u.id
 ) SELECT id,points,RANK() OVER(ORDER BY points DESC) AS position FROM totals`).all<{id:string;points:number;position:number}>();
 const seasonal=await db.prepare(`WITH period AS(
 SELECT l.round_id, MIN(s.season_number) AS seasonNumber
 FROM competition_round_links l JOIN competitions c ON c.id=l.competition_id
 JOIN tafa_seasons s ON s.id=c.season_id JOIN rounds r ON r.id=l.round_id AND r.status='finished'
 GROUP BY l.round_id
 ) SELECT rs.user_id AS userId,period.seasonNumber AS seasonNumber,COALESCE(SUM(ps.total_points),0) AS points
 FROM round_submissions rs JOIN period ON period.round_id=rs.round_id
 LEFT JOIN matches m ON m.round_id=rs.round_id LEFT JOIN official_predictions op ON op.user_id=rs.user_id AND op.match_id=m.id
 LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id AND ps.is_provisional=0
 GROUP BY rs.user_id,period.seasonNumber`).all<Scored>();
 const iffhs=await db.prepare(`SELECT season_number AS seasonNumber,user_id AS userId,total_points_scaled AS points FROM iffhs_season_totals ORDER BY season_number`).all<Scored>();
 const generalEntry=(general.results??[]).find(r=>r.id===id);
 // Older rounds with no linked TAFA season cannot be assigned to a seasonal snapshot.
 const linkedCoverage=await db.prepare(`SELECT COUNT(*) AS total, COUNT(CASE WHEN EXISTS(SELECT 1 FROM competition_round_links l JOIN competitions c ON c.id=l.competition_id JOIN tafa_seasons s ON s.id=c.season_id WHERE l.round_id=r.id) THEN 1 END) AS linked
 FROM rounds r WHERE r.status='finished'`).first<{total:number;linked:number}>();
 const generalBest=Number(linkedCoverage?.total??0)===Number(linkedCoverage?.linked??-1)?rankedPositions(seasonal.results??[],id):null;
 const iffhsRank=iffhsPositions(iffhs.results??[],id);
 const encounters=await db.prepare(`SELECT e.id,s.season_number AS seasonNumber,c.code AS competitionCode,c.display_name AS competitionName,
 st.name AS stageName,r.name AS roundName,enemy.user_id AS opponentId,u.full_name AS opponentName,
 CASE WHEN mine.entry_id=e.entry_a_id THEN e.score_a ELSE e.score_b END AS ownPoints,
 CASE WHEN mine.entry_id=e.entry_a_id THEN e.score_b ELSE e.score_a END AS rivalPoints,
 (SELECT COUNT(*) FROM official_predictions op JOIN matches mm ON mm.id=op.match_id JOIN prediction_scores ps ON ps.prediction_id=op.id
 WHERE e.round_link_id IS NOT NULL AND mm.round_id=l.round_id AND op.user_id=mine.user_id AND ps.base_points=3 AND ps.is_provisional=0) AS plenos
 FROM competition_encounters e JOIN competition_stages st ON st.id=e.stage_id
 JOIN competitions c ON c.id=st.competition_id JOIN tafa_seasons s ON s.id=c.season_id
 JOIN competition_entry_members mine ON mine.entry_id IN(e.entry_a_id,e.entry_b_id) AND mine.user_id=?
 LEFT JOIN competition_round_links l ON l.id=e.round_link_id LEFT JOIN rounds r ON r.id=l.round_id
 JOIN competition_entry_members enemy ON enemy.entry_id=CASE WHEN mine.entry_id=e.entry_a_id THEN e.entry_b_id ELSE e.entry_a_id END
 JOIN users u ON u.id=enemy.user_id
 WHERE e.admin_confirmed_at IS NOT NULL AND e.status='finished' AND e.score_a IS NOT NULL AND e.score_b IS NOT NULL
 AND enemy.user_id<>mine.user_id
 AND (l.round_id IS NULL OR ((mine.valid_from_round_id IS NULL OR mine.valid_from_round_id<=l.round_id) AND (mine.valid_to_round_id IS NULL OR mine.valid_to_round_id>l.round_id)
 AND (enemy.valid_from_round_id IS NULL OR enemy.valid_from_round_id<=l.round_id) AND (enemy.valid_to_round_id IS NULL OR enemy.valid_to_round_id>l.round_id)))
 GROUP BY e.id,enemy.user_id
 ORDER BY s.season_number DESC,e.id DESC`).bind(id).all<RivalRow>();
 const latestDivision=await db.prepare(`SELECT d.name AS name,s.season_number AS seasonNumber FROM season_division_members m
 JOIN tafa_seasons s ON s.id=m.season_id JOIN season_divisions d ON d.id=m.division_id
 WHERE m.user_id=? AND s.status<>'draft' ORDER BY s.season_number DESC LIMIT 1`).bind(id).first();
 return {identity:{...identity,teamName:identity.teamName??'Equipo de '+identity.participantName},division:latestDivision,
   stats:stat,titles:titles.results??[],
   rankings:{general:{current:generalEntry?Number(generalEntry.position):null,best:generalBest},iffhs:iffhsRank},
   encounters:encounters.results??[]};
}
export async function handleTeamPage(request:Request,env:Env):Promise<Response|null>{
 const pathname=new URL(request.url).pathname;
 const publicMatch=pathname.match(/^\/api\/participant\/teams\/([^/]+)$/);
 const adminMatch=pathname.match(/^\/api\/admin\/teams\/([^/]+)$/);
 if(!publicMatch&&!adminMatch)return null;
 const who=await session(request,env.DB);
 if(!who)return fail('No autorizado',401);
 const id=decodeURIComponent((publicMatch??adminMatch)![1]);
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
