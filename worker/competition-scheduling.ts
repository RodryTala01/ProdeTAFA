type Env={DB:D1Database};
type Actor={id:string};
const json=(data:unknown,status=200)=>Response.json(data,{status});
export async function schedulingRoundError(db:D1Database,id:number):Promise<string|null>{
 const r=await db.prepare(`SELECT r.status,r.published_at,
 EXISTS(SELECT 1 FROM matches m WHERE m.round_id=r.id AND (julianday(m.kickoff_at)<=julianday('now') OR m.result_finalized_at IS NOT NULL)) AS started,
 (EXISTS(SELECT 1 FROM round_submissions rs WHERE rs.round_id=r.id) OR EXISTS(SELECT 1 FROM prediction_scores ps JOIN official_predictions op ON op.id=ps.prediction_id JOIN matches m ON m.id=op.match_id WHERE m.round_id=r.id)) AS submitted
 FROM rounds r WHERE r.id=?`).bind(id).first<{status:string;published_at:string|null;started:number;submitted:number}>();
 if(!r)return 'Fecha no encontrada.';
 if(r.status!=='draft'||r.published_at||r.started||r.submitted)return 'Las vinculaciones sólo se pueden editar antes de publicar o iniciar la Fecha y sin envíos ni resultados.';
 return null;
}
async function linkInfo(db:D1Database,id:number){
 return db.prepare(`SELECT l.*,c.code,c.family,c.status AS competition_status,c.season_id,s.status AS season_status,st.stage_type,st.status AS stage_status
 FROM competition_round_links l JOIN competitions c ON c.id=l.competition_id JOIN tafa_seasons s ON s.id=c.season_id JOIN competition_stages st ON st.id=l.stage_id WHERE l.id=?`).bind(id).first<{id:number;round_id:number;stage_id:number;competition_id:number;season_id:number;code:string;family:string;competition_status:string;season_status:string;stage_type:string;stage_status:string;purpose:string}>();
}
async function protectedLink(db:D1Database,link:NonNullable<Awaited<ReturnType<typeof linkInfo>>>){
 if(link.purpose!=='NORMAL')return 'Los desempates conservan su vinculación desde la herramienta TAFA.';
 if([link.competition_status,link.season_status,link.stage_status].some(s=>['finished','archived'].includes(s)))return 'La competición o temporada ya está cerrada.';
 const error=await schedulingRoundError(db,link.round_id);if(error)return error;
 const results=await db.prepare('SELECT id FROM competition_results WHERE competition_id=? LIMIT 1').bind(link.competition_id).first();
 if(results)return 'La competición ya tiene un snapshot de resultados confirmados.';
 const snapshot=await db.prepare(`SELECT 1 AS found FROM competition_survival_results WHERE round_link_id=? LIMIT 1`).bind(link.id).first();
 if(snapshot)return 'Esta vinculación tiene resultados deportivos confirmados.';
 const encounters=await db.prepare(`SELECT 1 AS found FROM competition_encounters e WHERE e.round_link_id=? AND (
 (COALESCE(e.resolution,'')<>'bye' AND (e.score_a IS NOT NULL OR e.score_b IS NOT NULL OR e.admin_confirmed_at IS NOT NULL OR e.winner_entry_id IS NOT NULL))
 OR EXISTS(SELECT 1 FROM competition_tiebreaks t WHERE t.encounter_id=e.id)) LIMIT 1`).bind(link.id).first();
 return encounters?'Hay cruces con puntajes, ganadores o desempates; la vinculación está bloqueada.':null;
}
function audit(db:D1Database,user:Actor,action:string,id:number,before:unknown,after:unknown){
 return db.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json) VALUES (?,?,'competition_round_link',?,?,?)`).bind(user.id,action,String(id),JSON.stringify(before),JSON.stringify(after));
}
export async function removeScheduledLink(env:Env,user:Actor,id:number,competitionId?:number){
 const link=await linkInfo(env.DB,id);if(!link||(competitionId&&link.competition_id!==competitionId))return json({error:'Vínculo no encontrado'},404);
 const blocked=await protectedLink(env.DB,link);if(blocked)return json({error:blocked},409);
 const segments=await env.DB.prepare('SELECT id FROM competition_round_segments WHERE round_link_id=? LIMIT 1').bind(id).first();
 const settings=await env.DB.prepare('SELECT round_link_id FROM competition_survival_round_settings WHERE round_link_id=? LIMIT 1').bind(id).first();
 if(segments||settings)return json({error:'Esta vinculación tiene segmentos o configuración deportiva. Mové la vinculación a otra Fecha para conservarlos.'},409);
 await env.DB.batch([
  env.DB.prepare('UPDATE competition_encounters SET round_link_id=NULL WHERE round_link_id=?').bind(id),
  env.DB.prepare('UPDATE competition_champions_nodes SET round_link_id=NULL WHERE round_link_id=?').bind(id),
  env.DB.prepare('UPDATE competition_entry_bonuses SET round_link_id=NULL WHERE round_link_id=?').bind(id),
  env.DB.prepare('DELETE FROM competition_round_links WHERE id=?').bind(id),
  audit(env.DB,user,'competition.round_unlinked',id,link,null),
 ]);
 return json({ok:true,seasonId:link.season_id});
}
export async function handleScheduling(request:Request,env:Env,user:Actor):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname;
 const roundMatch=path.match(/^\/api\/admin\/competition-engine\/scheduling\/rounds\/(\d+)$/);
 if(roundMatch&&request.method==='GET'){
  const id=Number(roundMatch[1]);
  const [stages,links,encounters]=await Promise.all([
   env.DB.prepare(`SELECT st.id,st.competition_id AS competitionId,st.name,st.stage_type AS type,c.display_name AS competitionName,c.code,s.season_number AS seasonNumber FROM competition_stages st JOIN competitions c ON c.id=st.competition_id JOIN tafa_seasons s ON s.id=c.season_id WHERE c.status NOT IN ('finished','archived') AND s.status NOT IN ('finished','archived') AND st.status NOT IN ('finished','archived') ORDER BY s.season_number DESC,c.sort_order,st.sequence`).all(),
   env.DB.prepare(`SELECT l.id,l.competition_id AS competitionId,l.stage_id AS stageId,l.purpose,l.sequence,st.name AS stageName,c.display_name AS competitionName FROM competition_round_links l JOIN competition_stages st ON st.id=l.stage_id JOIN competitions c ON c.id=l.competition_id WHERE l.round_id=? ORDER BY c.sort_order,st.sequence,l.sequence`).bind(id).all(),
   env.DB.prepare(`SELECT e.id,e.stage_id AS stageId,e.slot_key AS slot,e.round_link_id AS roundLinkId,l.round_id AS roundId,a.display_name AS nameA,b.display_name AS nameB FROM competition_encounters e JOIN competition_stages st ON st.id=e.stage_id JOIN competitions c ON c.id=st.competition_id JOIN tafa_seasons s ON s.id=c.season_id LEFT JOIN competition_entries a ON a.id=e.entry_a_id LEFT JOIN competition_entries b ON b.id=e.entry_b_id LEFT JOIN competition_round_links l ON l.id=e.round_link_id WHERE s.status NOT IN ('finished','archived') ORDER BY st.sequence,e.id`).all(),
  ]);
  return json({stages:stages.results,links:links.results,encounters:encounters.results,lockedReason:await schedulingRoundError(env.DB,id)});
 }
 const linkMatch=path.match(/^\/api\/admin\/competition-engine\/scheduling\/links\/(\d+)$/);
 if(!linkMatch)return null;
 const id=Number(linkMatch[1]);
 if(request.method==='DELETE')return removeScheduledLink(env,user,id);
 if(!['PUT','PATCH'].includes(request.method))return json({error:'Método no permitido'},405);
 const link=await linkInfo(env.DB,id);if(!link)return json({error:'Vínculo no encontrado'},404);
 const blocked=await protectedLink(env.DB,link);if(blocked)return json({error:blocked},409);
 const body=await request.json().catch(()=>null) as {encounterIds?:number[];roundId?:number}|null;
 if(request.method==='PATCH'){
  const roundId=Number(body?.roundId);if(!Number.isInteger(roundId)||roundId<=0)return json({error:'Fecha inválida'},400);
  const problem=await schedulingRoundError(env.DB,roundId);if(problem)return json({error:problem},409);
  const mapped=await env.DB.prepare('SELECT sm.match_id FROM competition_round_segment_matches sm JOIN competition_round_segments seg ON seg.id=sm.segment_id WHERE seg.round_link_id=? LIMIT 1').bind(id).first();
  if(mapped)return json({error:'Esta fase tiene partidos asignados a sus segmentos. Quitá esa asignación desde Competiciones antes de moverla.'},409);
  const duplicate=await env.DB.prepare('SELECT id FROM competition_round_links WHERE competition_id=? AND stage_id=? AND round_id=? AND purpose=(SELECT purpose FROM competition_round_links WHERE id=?) AND id<>?').bind(link.competition_id,link.stage_id,roundId,id,id).first();
  if(duplicate)return json({error:'La fase ya está vinculada a esa Fecha. Editá sus enfrentamientos.'},409);
  if(link.code==='PROMOCION'){
   const league=await env.DB.prepare("SELECT id FROM competition_round_links WHERE competition_id IN (SELECT id FROM competitions WHERE season_id=? AND code IN ('LIGA_A','LIGA_B')) AND round_id=? LIMIT 1").bind(link.season_id,roundId).first();
   const r=await env.DB.prepare('SELECT category FROM rounds WHERE id=?').bind(roundId).first<{category:string}>();
   if(league||!['AMISTOSO','LIGA'].includes(r?.category??''))return json({error:'Promoción requiere una Fecha de Liga distinta de las cinco regulares.'},409);
  }
  await env.DB.batch([env.DB.prepare('UPDATE competition_round_links SET round_id=? WHERE id=?').bind(roundId,id),env.DB.prepare("UPDATE rounds SET category=? WHERE id=? AND category='AMISTOSO'").bind(['LEAGUE','PROMOTION'].includes(link.family)?'LIGA':'COPA',roundId),audit(env.DB,user,'competition.round_rescheduled',id,link,{roundId})]);
  return json({ok:true});
 }
 if(link.stage_type!=='KNOCKOUT')return json({error:'Esta fase se vincula completa; no tiene cruces eliminatorios seleccionables.'},409);
 if(!Array.isArray(body?.encounterIds)||body.encounterIds.some(n=>!Number.isInteger(n)||n<=0)||new Set(body.encounterIds).size!==body.encounterIds.length)return json({error:'Enfrentamientos inválidos'},400);
 const rows=await env.DB.prepare('SELECT id,round_link_id,score_a,score_b,admin_confirmed_at,resolution,winner_entry_id FROM competition_encounters WHERE stage_id=?').bind(link.stage_id).all<{id:number;round_link_id:number|null;score_a:number|null;score_b:number|null;admin_confirmed_at:string|null;resolution:string|null;winner_entry_id:number|null}>();
 const selected=new Set(body.encounterIds),all=rows.results??[];
 if([...selected].some(n=>!all.some(e=>e.id===n)))return json({error:'Un cruce no pertenece a esta fase.'},400);
 if(link.code==='PROMOCION'&&(selected.size!==2||all.length!==2))return json({error:'Promoción debe vincular sus dos cruces a la misma Fecha.'},409);
 const changed=all.filter(e=>(e.round_link_id===id)!==selected.has(e.id));
 for(const e of changed){
  if(selected.has(e.id)&&e.round_link_id!==null&&e.round_link_id!==id)return json({error:'El cruce ya está vinculado a otra Fecha. Desvinculalo allí primero.'},409);
  const tie=await env.DB.prepare('SELECT id FROM competition_tiebreaks WHERE encounter_id=? LIMIT 1').bind(e.id).first();
  if(tie||(e.resolution!=='bye'&&(e.score_a!==null||e.score_b!==null||e.admin_confirmed_at!==null||e.winner_entry_id!==null)))return json({error:'No se puede mover un cruce con puntaje, ganador o desempate.'},409);
 }
 const statements:D1PreparedStatement[]=[];
 for(const e of changed){
  const target=selected.has(e.id)?id:null;
  statements.push(env.DB.prepare('UPDATE competition_encounters SET round_link_id=? WHERE id=?').bind(target,e.id));
  statements.push(env.DB.prepare('UPDATE competition_champions_nodes SET round_link_id=? WHERE encounter_id=?').bind(target,e.id));
  // Preserve the existing +2 semifinal bonuses when the match is scheduled later.
  statements.push(env.DB.prepare(`UPDATE competition_entry_bonuses SET round_link_id=? WHERE stage_id=? AND (round_link_id=? OR round_link_id IS NULL) AND entry_id IN (SELECT entry_a_id FROM competition_encounters WHERE id=? UNION SELECT entry_b_id FROM competition_encounters WHERE id=?)`).bind(target,link.stage_id,id,e.id,e.id));
 }
 statements.push(audit(env.DB,user,'competition.encounters_scheduled',id,all.filter(e=>e.round_link_id===id).map(e=>e.id),body.encounterIds));
 await env.DB.batch(statements);return json({ok:true});
}
