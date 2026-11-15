// Independent events by actual match, never by first kickoff in the round.
// The caller provides the existing encrypted sender and its delivery journal.
export type MatchPushSubscription={id:number;user_id:string;endpoint:string;p256dh:string;auth:string};
export type MatchPushNotice={title:string;body:string;url:string;tag:string};
type Deliver=(subscription:MatchPushSubscription,notice:MatchPushNotice,eventKey:string,ttlSeconds?:number)=>Promise<boolean>;
type ReminderRow=MatchPushSubscription&{match_id:number;home_team_name:string;away_team_name:string};
type FinalRow=ReminderRow&{prediction_id:number|null;score_prediction_id:number|null;total_points:number|null;is_provisional:number|null};
const title=(home:string,away:string)=>home+' - '+away;
export function reminderForMatch(home:string,away:string,id:number):MatchPushNotice{
 const game=title(home,away);
 return {title:'¡Falta 1 hora para '+game+'!',body:'En una hora empieza '+game+' y todavía no enviaste tu pronóstico. ¡Entrá a TAFA!',url:'/#/pronosticos',tag:'tafa-match-'+id+'-reminder-1h'};
}
export function finalForMatch(home:string,away:string,id:number,points:number,predicted:boolean):MatchPushNotice{
 return {title:'Terminó '+title(home,away),body:predicted?'Sumaste '+(points===1?'1 punto':points+' puntos')+' en este partido.':'No enviaste pronóstico. Sumaste 0 puntos.',url:'/#/inicio',tag:'tafa-match-'+id+'-finished'};
}
async function deliverBatch<T extends MatchPushSubscription>(items:T[],send:Deliver,build:(row:T)=>[MatchPushNotice,string,number?]){
 let accepted=0;
 for(let i=0;i<items.length;i+=8){
  const results=await Promise.allSettled(items.slice(i,i+8).map(row=>{
   const [notice,eventKey,ttl]=build(row);
   return send(row,notice,eventKey,ttl);
  }));
  accepted+=results.filter(result=>result.status==='fulfilled'&&result.value).length;
 }
 return accepted;
}
export async function sendMatchPushNotifications(db:D1Database,send:Deliver){
 // The user may have submitted previous matches, but not the fourth or fifth.
 // Only official_predictions count as sent; autosaved drafts never do.
 const reminders=(await db.prepare(`
  SELECT ps.id,ps.user_id,ps.endpoint,ps.p256dh,ps.auth,
   m.id AS match_id,m.home_team_name,m.away_team_name
  FROM matches m
  JOIN rounds r ON r.id=m.round_id AND r.status='open'
  CROSS JOIN push_subscriptions ps
  JOIN users u ON u.id=ps.user_id AND u.role='participant' AND u.is_active=1
  LEFT JOIN official_predictions o ON o.match_id=m.id AND o.user_id=ps.user_id
  WHERE m.status IN ('NS','scheduled','TBD') AND m.is_void=0
   AND m.result_finalized_at IS NULL
   AND julianday(m.kickoff_at)>=julianday('now','+55 minutes')
   AND julianday(m.kickoff_at)<=julianday('now','+65 minutes')
   AND o.id IS NULL
  ORDER BY m.kickoff_at,m.id,ps.id
 `).all<ReminderRow>()).results??[];
 const reminderAccepted=await deliverBatch(reminders,send,row=>[
  reminderForMatch(row.home_team_name,row.away_team_name,row.match_id),
  'match:'+row.match_id+':reminder-1h',
  3300 // Avoid delayed reminders after kickoff.
 ]);
 // No provisional scores. Retry next cron if an official prediction hasn't
 // been scored yet. Never guess from a draft or from a live match result.
 const finals=(await db.prepare(`
  SELECT ps.id,ps.user_id,ps.endpoint,ps.p256dh,ps.auth,
   m.id AS match_id,m.home_team_name,m.away_team_name,
   o.id AS prediction_id,s.prediction_id AS score_prediction_id,
   s.total_points,s.is_provisional
  FROM matches m
  JOIN rounds r ON r.id=m.round_id AND r.status IN ('open','finished')
  CROSS JOIN push_subscriptions ps
  JOIN users u ON u.id=ps.user_id AND u.role='participant' AND u.is_active=1
  LEFT JOIN official_predictions o ON o.match_id=m.id AND o.user_id=ps.user_id
  LEFT JOIN prediction_scores s ON s.prediction_id=o.id
  WHERE m.status IN ('FT','AET','PEN') AND m.is_void=0
   AND m.result_finalized_at IS NOT NULL
   AND julianday(m.result_finalized_at)>=julianday('now','-6 hours')
   AND julianday(m.result_finalized_at)<=julianday('now')
   AND (o.id IS NULL OR (s.prediction_id IS NOT NULL AND s.is_provisional=0
     AND julianday(s.calculated_at)>=julianday(m.result_finalized_at)))
  ORDER BY m.result_finalized_at,m.id,ps.id
 `).all<FinalRow>()).results??[];
 const finalAccepted=await deliverBatch(finals,send,row=>[
  finalForMatch(row.home_team_name,row.away_team_name,row.match_id,
   row.prediction_id===null?0:Number(row.total_points),row.prediction_id!==null),
  'match:'+row.match_id+':final'
 ]);
 return {reminders:reminders.length,reminderAccepted,finals:finals.length,finalAccepted};
}
