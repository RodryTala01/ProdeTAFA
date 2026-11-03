import type { Env } from './index';

// Implements RFC 8291 (aes128gcm) and RFC 8292 (VAPID) with Workers WebCrypto.
// No browser subscription endpoints or auth secrets are returned by this API.
type Subscription={id:number;user_id:string;endpoint:string;p256dh:string;auth:string};
type Notice={title:string;body:string;url:string;tag:string};
const enc=new TextEncoder();
const concat=(...items:Uint8Array[])=>{const out=new Uint8Array(items.reduce((n,x)=>n+x.length,0));let p=0;for(const b of items){out.set(b,p);p+=b.length;}return out;};
const b64u=(b:Uint8Array)=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64u=(s:string)=>new Uint8Array(Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0)));
const raw=(s:string)=>enc.encode(s);
async function hmac(key:Uint8Array,value:Uint8Array){
 const k=await crypto.subtle.importKey('raw',key as BufferSource,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return new Uint8Array(await crypto.subtle.sign('HMAC',k,value as BufferSource));
}
async function encrypt(subscription:Subscription,payload:string){
 const ua=unb64u(subscription.p256dh),auth=unb64u(subscription.auth);
 if(ua.length!==65||ua[0]!==4||auth.length!==16)throw Error('Subscription encryption keys invalid');
 const eph=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const uaKey=await crypto.subtle.importKey('raw',ua,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:uaKey},eph.privateKey,256));
 const server=new Uint8Array(await crypto.subtle.exportKey('raw',eph.publicKey));
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const ikm=await hmac(await hmac(auth,shared),concat(raw('WebPush: info'),new Uint8Array([0]),ua,server,new Uint8Array([1])));
 const prk=await hmac(salt,ikm);
 const cek=(await hmac(prk,concat(raw('Content-Encoding: aes128gcm'),new Uint8Array([0,1])))).slice(0,16);
 const nonce=(await hmac(prk,concat(raw('Content-Encoding: nonce'),new Uint8Array([0,1])))).slice(0,12);
 const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,concat(raw(payload),new Uint8Array([2]))));
 const header=concat(salt,new Uint8Array([0,0,16,0,server.length]),server);
 return concat(header,ciphertext);
}
function allowedEndpoint(endpoint:string){
 try {
  if(endpoint.length>2048)return false;
  const url=new URL(endpoint);
  if(url.protocol!=='https:'||url.username||url.password||url.port)return false;
  const host=url.hostname.toLowerCase();
  return host==='fcm.googleapis.com'||host==='android.googleapis.com'
   ||host.endsWith('.push.apple.com')||host.endsWith('.push.services.mozilla.com')
   ||host.endsWith('.notify.windows.com');
 }catch{return false;}
}
async function vapidAuth(endpoint:string,publicKey:string,privateKey:string){
 const bytes=unb64u(publicKey);
 if(bytes.length!==65||bytes[0]!==4)throw Error('Invalid configured VAPID public key');
 const body={aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+12*3600,sub:'https://prode-tafa.rodrytalarico.workers.dev'};
 const [x,y]=[b64u(bytes.slice(1,33)),b64u(bytes.slice(33,65))];
 const signingKey=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x,y,d:privateKey,ext:true},{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const header=b64u(raw(JSON.stringify({typ:'JWT',alg:'ES256'})));
 const message=header+'.'+b64u(raw(JSON.stringify(body)));
 const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},signingKey,raw(message)));
 return 'vapid t='+message+'.'+b64u(sig)+', k='+publicKey;
}
const json=(o:unknown,status=200)=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function session(request:Request,env:Env,role:'admin'|'participant'='participant'){
 const cookie=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('prode_session='));
 if(!cookie)return null;
 let token='';try{token=decodeURIComponent(cookie.slice('prode_session='.length));}catch{return null;}
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw(token))),n=>n.toString(16).padStart(2,'0')).join('');
 return env.DB.prepare("SELECT u.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1 AND u.role=? LIMIT 1").bind(hash,role).first<{id:string}>();
}
async function vapidPublic(env:Env){
 const row=await env.DB.prepare('SELECT public_key FROM push_config WHERE id=1').first<{public_key:string}>();
 return row?.public_key??null;
}
async function send(env:Env,s:Subscription,notice:Notice,eventKey:string){
 if(!env.PUSH_VAPID_PRIVATE_KEY||!allowedEndpoint(s.endpoint))return false;
 const claimed=await env.DB.prepare(`INSERT INTO push_deliveries(subscription_id,event_key) VALUES(?,?)
 ON CONFLICT(subscription_id,event_key) DO UPDATE SET
 status='pending',attempts=attempts+1,attempted_at=datetime('now')
 WHERE status='failed' AND attempts<3 AND attempted_at<=datetime('now','-15 minutes')`).bind(s.id,eventKey).run();
 if(Number(claimed.meta.changes??0)!==1)return false;
 try {
  const publicKey=await vapidPublic(env);
  if(!publicKey)throw Error('VAPID not initialized');
  const message=JSON.stringify(notice);
  const body=await encrypt(s,message);
  if(body.length>4096)throw Error('Push payload too large');
  const result=await fetch(s.endpoint,{method:'POST',headers:{
   'Content-Type':'application/octet-stream','Content-Encoding':'aes128gcm',
   'TTL':'86400','Authorization':await vapidAuth(s.endpoint,publicKey,env.PUSH_VAPID_PRIVATE_KEY),
  },body:body as unknown as BodyInit});
  if(result.ok){
   await env.DB.prepare("UPDATE push_deliveries SET status='sent',sent_at=datetime('now') WHERE subscription_id=? AND event_key=?").bind(s.id,eventKey).run();
   return true;
  }
  if(result.status===404||result.status===410){
   await env.DB.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(s.id).run();
   return false;
  }
  console.error('Push service returned HTTP',result.status);
 }catch(e){console.error('Web Push delivery failed',e instanceof Error?e.message:'Unknown error');}
 await env.DB.prepare("UPDATE push_deliveries SET status='failed' WHERE subscription_id=? AND event_key=?").bind(s.id,eventKey).run();
 return false;
}

async function adminPushOverview(request:Request,env:Env){
 if(request.method!=='GET')return json({error:'Método no permitido'},405);
 const admin=await session(request,env,'admin');
 if(!admin)return json({error:'Acceso de administrador requerido'},403);
 // Read-only summary; never expose subscription endpoints, encryption keys or phone numbers.
 const people=await env.DB.prepare(`SELECT u.id,u.full_name AS name,u.is_active AS active,
  COALESCE(s.devices,0) AS devices,s.last_registered_at AS lastRegisteredAt,
  COALESCE(d.sent,0) AS sent,COALESCE(d.failed,0) AS failed
  FROM users u
  LEFT JOIN (
   SELECT user_id,COUNT(*) AS devices,MAX(updated_at) AS last_registered_at
   FROM push_subscriptions GROUP BY user_id
  ) s ON s.user_id=u.id
  LEFT JOIN (
   SELECT ps.user_id,
    SUM(CASE WHEN pd.status='sent' THEN 1 ELSE 0 END) AS sent,
    SUM(CASE WHEN pd.status='failed' THEN 1 ELSE 0 END) AS failed
   FROM push_subscriptions ps
   JOIN push_deliveries pd ON pd.subscription_id=ps.id
   GROUP BY ps.user_id
  ) d ON d.user_id=u.id
  WHERE u.role='participant'
  ORDER BY u.is_active DESC,u.full_name COLLATE NOCASE,u.id`).all<{
   id:string;name:string;active:number;devices:number;lastRegisteredAt:string|null;sent:number;failed:number
  }>();
 const history=await env.DB.prepare(`SELECT pd.id,ps.user_id AS userId,u.full_name AS name,
  pd.event_key AS eventKey,pd.status,pd.attempts,pd.attempted_at AS attemptedAt
  FROM push_deliveries pd
  JOIN push_subscriptions ps ON ps.id=pd.subscription_id
  JOIN users u ON u.id=ps.user_id AND u.role='participant'
  ORDER BY pd.attempted_at DESC,pd.id DESC LIMIT 50`).all<{
   id:number;userId:string;name:string;eventKey:string;status:'pending'|'sent'|'failed';
   attempts:number;attemptedAt:string
  }>();

 const currentRound=await env.DB.prepare("SELECT id,name FROM rounds WHERE status='open' ORDER BY id DESC LIMIT 1").first<{id:number;name:string}>();
 const finishedRound=await env.DB.prepare("SELECT id,name FROM rounds WHERE status='finished' ORDER BY finished_at DESC,id DESC LIMIT 1").first<{id:number;name:string}>();
 const pendingUserIds:string[]=[];
 if(currentRound){
  for(const p of people.results??[]){
   if(p.active&&p.devices>0&&await pending(env,p.id,currentRound.id))pendingUserIds.push(p.id);
  }
 }
 const pastManual=await env.DB.prepare(`SELECT id,created_at AS createdAt,after_json AS payload
  FROM audit_log WHERE action='push.manual_completed'
  ORDER BY id DESC LIMIT 12`).all<{id:number;createdAt:string;payload:string}>();
 const manualMessages=(pastManual.results??[]).flatMap(item=>{
  try{
   const details=JSON.parse(item.payload) as {title:string;body:string;participants:number;devices:number;accepted:number;failed:number;kind:string};
   return [{id:item.id,createdAt:item.createdAt,...details}];
  }catch{return [];}
 });
 return json({
  participants:(people.results??[]).map(p=>({
   ...p,active:Boolean(p.active),devices:Number(p.devices),sent:Number(p.sent),failed:Number(p.failed)
  })),
  deliveries:history.results??[],currentRound:currentRound??null,finishedRound:finishedRound??null,
  pendingUserIds,manualMessages
 });
}


type ManualRequest={
 requestId?:string;
 kind?:'new_round'|'reminder'|'results'|'custom';
 audience?:'all'|'pending'|'selected';
 userIds?:string[];
 title?:string;
 body?:string;
 destination?:'inicio'|'pronosticos'|'competiciones'|'club';
};
async function adminPushSend(request:Request,env:Env):Promise<Response>{
 if(request.method!=='POST')return json({error:'Método no permitido'},405);
 const admin=await session(request,env,'admin');
 if(!admin)return json({error:'Acceso de administrador requerido'},403);
 if(!env.PUSH_VAPID_PRIVATE_KEY||!(await vapidPublic(env)))return json({error:'El servicio push no está configurado'},503);
 if(Number(request.headers.get('content-length')??0)>6000)return json({error:'Solicitud demasiado grande'},413);
 const textBody=await request.text();
 if(textBody.length>6000)return json({error:'Solicitud demasiado grande'},413);
 let b:ManualRequest|null=null;
 try{b=JSON.parse(textBody) as ManualRequest;}catch{return json({error:'Datos inválidos'},400);}
 if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'Datos inválidos'},400);
 const {requestId,kind,audience}=b;
 if(typeof requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
  return json({error:'Identificador de envío inválido'},400);
 if(!['new_round','reminder','results','custom'].includes(kind??'')||!['all','pending','selected'].includes(audience??''))
  return json({error:'Seleccioná un aviso y destinatarios válidos'},400);
 if(kind==='reminder'&&audience!=='pending')return json({error:'Los recordatorios deben enviarse solo a quienes tienen pronósticos pendientes'},400);
 if(audience==='selected'&&(!Array.isArray(b.userIds)||b.userIds.length<1||b.userIds.length>100
  ||b.userIds.some(id=>typeof id!=='string'||id.length>128)))
  return json({error:'Elegí entre 1 y 100 participantes'},400);
 const previous=await env.DB.prepare("SELECT 1 AS found FROM audit_log WHERE action='push.manual_requested' AND entity_id=? LIMIT 1").bind(requestId).first();
 if(previous)return json({error:'Este envío ya fue solicitado. Revisá el historial antes de volver a enviarlo.'},409);
 const recent=await env.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action='push.manual_requested' AND actor_user_id=? AND created_at>=datetime('now','-30 seconds')").bind(admin.id).first<{n:number}>();
 if(Number(recent?.n??0)>0)return json({error:'Para evitar envíos repetidos, esperá 30 segundos antes de enviar otro aviso.'},429);
 const openRound=await env.DB.prepare("SELECT id,name FROM rounds WHERE status='open' ORDER BY id DESC LIMIT 1").first<{id:number;name:string}>();
 const latestFinished=await env.DB.prepare("SELECT id,name FROM rounds WHERE status='finished' ORDER BY finished_at DESC,id DESC LIMIT 1").first<{id:number;name:string}>();
 if((kind==='new_round'||kind==='reminder'||audience==='pending')&&!openRound)
  return json({error:'No hay una Fecha abierta para este aviso'},409);
 if(kind==='results'&&!latestFinished)return json({error:'Todavía no hay una Fecha finalizada'},409);
 let notice:Notice;
 switch(kind){
  case 'new_round':
   notice={title:'⚽ ¡Nueva fecha disponible!',body:openRound!.name+' ya está disponible. ¡Cargá tus pronósticos!',url:'/#/pronosticos',tag:'tafa-manual-'+requestId};
   break;
  case 'reminder':
   notice={title:'⏰ ¡Pronósticos pendientes!',body:'Todavía no enviaste o tenés cambios pendientes en '+openRound!.name+'. ¡Entrá a TAFA!',url:'/#/pronosticos',tag:'tafa-manual-'+requestId};
   break;
  case 'results':
   notice={title:'🏆 ¡Resultados disponibles!',body:'Ya podés consultar los resultados de '+latestFinished!.name+' y tu posición en TAFA.',url:'/#/club/historial',tag:'tafa-manual-'+requestId};
   break;
  default:{
   const title=typeof b.title==='string'?b.title.trim():'';
   const body=typeof b.body==='string'?b.body.trim():'';
   if(title.length<3||title.length>70||body.length<5||body.length>240
    ||/[<>]/.test(title+body)||/[\u0000-\u0008\u000e-\u001f]/.test(title+body))
    return json({error:'El título debe tener 3 a 70 caracteres y el mensaje entre 5 y 240, sin HTML'},400);
   const allowed:{[k:string]:string}={inicio:'/#/inicio',pronosticos:'/#/pronosticos',competiciones:'/#/competiciones',club:'/#/club'};
   if(typeof b.destination!=='string'||!(b.destination in allowed))return json({error:'Elegí un destino válido'},400);
   notice={title,body,url:allowed[b.destination],tag:'tafa-manual-'+requestId};
  }
 }
 const all=(await env.DB.prepare(`SELECT ps.id,ps.user_id,ps.endpoint,ps.p256dh,ps.auth
  FROM push_subscriptions ps JOIN users u ON u.id=ps.user_id
  WHERE u.role='participant' AND u.is_active=1`).all<Subscription>()).results??[];
 const selected=new Set(b.userIds??[]);
 const eligibleUserIds=new Set<string>();
 for(const s of all){
  if(audience==='selected'&&!selected.has(s.user_id))continue;
  eligibleUserIds.add(s.user_id);
 }
 if(audience==='pending'){
  for(const userId of [...eligibleUserIds])if(!(await pending(env,userId,openRound!.id)))eligibleUserIds.delete(userId);
 }
 const targets=all.filter(s=>eligibleUserIds.has(s.user_id));
 if(!targets.length)return json({error:'No hay dispositivos registrados para esos destinatarios'},409);
 if(targets.length>100)return json({error:'Hay más de 100 dispositivos. Seleccioná un grupo más pequeño.'},409);
 const eventKey='manual:'+requestId;
 const audit=JSON.stringify({kind,audience,title:notice.title,body:notice.body,destination:notice.url,
  participants:eligibleUserIds.size,devices:targets.length});
 await env.DB.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_json)
 VALUES(?,'push.manual_requested','push',?,?)`).bind(admin.id,requestId,audit).run();
 let accepted=0,failed=0;
 for(let index=0;index<targets.length;index+=8){
  const delivered=await Promise.all(targets.slice(index,index+8).map(s=>send(env,s,notice,eventKey)));
  accepted+=delivered.filter(Boolean).length;
  failed+=delivered.filter(ok=>!ok).length;
 }
 const report={requestId,kind,audience,title:notice.title,body:notice.body,
  participants:eligibleUserIds.size,devices:targets.length,accepted,failed};
 await env.DB.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_json)
 VALUES(?,'push.manual_completed','push',?,?)`).bind(admin.id,requestId,JSON.stringify(report)).run();
 return json({ok:true,...report});
}

export async function handlePush(request:Request,env:Env):Promise<Response|null>{
 const path=new URL(request.url).pathname;
 if(path==='/api/admin/push/overview')return adminPushOverview(request,env);
 if(path==='/api/admin/push/send')return adminPushSend(request,env);
 if(!path.startsWith('/api/participant/push/'))return null;
 const user=await session(request,env);
 if(!user)return json({error:'Sesión de participante requerida'},401);
 if(request.method==='GET'&&path==='/api/participant/push/config'){
  const publicKey=await vapidPublic(env);
  const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id=?').bind(user.id).first<{n:number}>();
  return json({publicKey,ready:Boolean(publicKey&&env.PUSH_VAPID_PRIVATE_KEY),devices:Number(count?.n??0)});
 }
 if(request.method==='POST'&&path==='/api/participant/push/status'){
  const b=await request.json().catch(()=>null) as {endpoint?:string}|null;
  const row=await env.DB.prepare('SELECT 1 AS present FROM push_subscriptions WHERE endpoint=? AND user_id=? LIMIT 1').bind(b?.endpoint??'',user.id).first();
  return json({enabled:Boolean(row)});
 }
 if(request.method==='POST'&&path==='/api/participant/push/subscribe'){
  const b=await request.json().catch(()=>null) as {endpoint?:string;keys?:{p256dh?:string;auth?:string}}|null;
  const endpoint=b?.endpoint||'',p256dh=b?.keys?.p256dh||'',auth=b?.keys?.auth||'';
  if(!allowedEndpoint(endpoint)||!p256dh||!auth)return json({error:'Suscripción inválida'},400);
  try{if(unb64u(p256dh).length!==65||unb64u(auth).length!==16)throw Error();}catch{return json({error:'Claves de suscripción inválidas'},400);}
  if(!env.PUSH_VAPID_PRIVATE_KEY||!(await vapidPublic(env)))return json({error:'Notificaciones aún no configuradas'},503);
  await env.DB.prepare(`INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth) VALUES(?,?,?,?)
   ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,updated_at=datetime('now')`).bind(user.id,endpoint,p256dh,auth).run();
  return json({ok:true});
 }
 if(request.method==='POST'&&path==='/api/participant/push/unsubscribe'){
  const b=await request.json().catch(()=>null) as {endpoint?:string}|null;
  if(typeof b?.endpoint!=='string')return json({error:'Suscripción inválida'},400);
  await env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?').bind(user.id,b.endpoint).run();
  return json({ok:true});
 }
 if(request.method==='POST'&&path==='/api/participant/push/test'){
  const b=await request.json().catch(()=>null) as {endpoint?:string}|null;
  const target=await env.DB.prepare('SELECT * FROM push_subscriptions WHERE user_id=? AND endpoint=?').bind(user.id,b?.endpoint??'').first<Subscription>();
  if(!target)return json({error:'Primero activá las notificaciones en este dispositivo'},409);
  const recent=await env.DB.prepare("SELECT 1 AS one FROM push_deliveries WHERE subscription_id=? AND event_key LIKE 'test:%' AND attempted_at>datetime('now','-5 minutes') LIMIT 1").bind(target.id).first();
  if(recent)return json({error:'Ya enviaste una prueba hace poco. Probá en cinco minutos.'},429);
  const ok=await send(env,target,{title:'Prode TAFA',body:'¡Notificaciones activadas! Este es un aviso de prueba.',url:'/#/club',tag:'tafa-test'},'test:'+Date.now());
  return json(ok?{ok:true}:{error:'No se pudo entregar la prueba al servicio de notificaciones'},ok?200:502);
 }
 return json({error:'Ruta no encontrada'},404);
}
async function pending(env:Env,userId:string,roundId:number){
 const row=await env.DB.prepare(`SELECT
 (NOT EXISTS(SELECT 1 FROM round_submissions rs WHERE rs.round_id=? AND rs.user_id=?)
 OR EXISTS(
 SELECT 1 FROM matches m JOIN predictions p ON p.match_id=m.id AND p.user_id=?
 LEFT JOIN official_predictions o ON o.match_id=m.id AND o.user_id=p.user_id
 WHERE m.round_id=? AND julianday(m.kickoff_at)+1.0/1440>julianday('now')
 AND (p.predicted_home_score IS NOT o.predicted_home_score
 OR p.predicted_away_score IS NOT o.predicted_away_score
 OR p.predicted_extra_team_provider_id IS NOT o.predicted_extra_team_provider_id)
 )) AS missing`).bind(roundId,userId,userId,roundId).first<{missing:number}>();
 return Boolean(row?.missing);
}
export async function sendDuePushNotifications(env:Env){
 if(!env.PUSH_VAPID_PRIVATE_KEY||!(await vapidPublic(env)))return;
 const subscriptions=(await env.DB.prepare(`SELECT ps.* FROM push_subscriptions ps JOIN users u ON u.id=ps.user_id WHERE u.is_active=1 AND u.role='participant'`).all<Subscription>()).results??[];
 if(!subscriptions.length)return;
 const rounds=(await env.DB.prepare(`SELECT r.id,r.name,r.status,r.published_at,r.finished_at,
 MIN(m.kickoff_at) AS kickoff,COUNT(m.id) AS games,
 SUM(CASE WHEN m.result_finalized_at IS NOT NULL OR m.is_void=1 THEN 0 ELSE 1 END) AS unfinished
 FROM rounds r JOIN matches m ON m.round_id=r.id WHERE r.status IN('open','finished')
 AND (r.status='open' OR r.finished_at>=datetime('now','-24 hours'))
 GROUP BY r.id ORDER BY r.id DESC LIMIT 20`).all<{id:number;name:string;status:string;published_at:string|null;finished_at:string|null;kickoff:string;games:number;unfinished:number}>()).results??[];
 const now=Date.now();
 for(const r of rounds){
  if(!r.games)continue;
  const start=Date.parse(r.kickoff.endsWith('Z')?r.kickoff:r.kickoff.replace(' ','T')+'Z')+60_000;
  const sincePublished=r.published_at?now-Date.parse(r.published_at.replace(' ','T')+'Z'):Infinity;
  const sinceFinished=r.finished_at?now-Date.parse(r.finished_at.replace(' ','T')+'Z'):Infinity;
  const until=start-now;
  const events:Array<{code:string;notice:Notice;onlyPending:boolean}>=[];
  if(r.status==='open'){
   if(sincePublished>=0&&sincePublished<24*3600_000)events.push({code:'published',onlyPending:false,notice:{title:'¡Nueva fecha en TAFA!',body:r.name+' ya está disponible. ¡Hacé tus pronósticos!',url:'/#/pronosticos',tag:'tafa-'+r.id+'-published'}});
   if(until<=24*3600_000&&until>23*3600_000)events.push({code:'reminder24',onlyPending:true,notice:{title:'Pronósticos pendientes',body:'Falta aproximadamente un día para el primer cierre de '+r.name+'. Revisá tu envío.',url:'/#/pronosticos',tag:'tafa-'+r.id+'-24h'}});
   if(until<=2*3600_000&&until>3600_000)events.push({code:'reminder2',onlyPending:true,notice:{title:'¡Último aviso de TAFA!',body:'Faltan unas dos horas para el primer cierre de '+r.name+'. ¿Ya enviaste?',url:'/#/pronosticos',tag:'tafa-'+r.id+'-2h'}});
  }
  if(r.status==='finished'&&Number(r.unfinished)===0&&sinceFinished>=0&&sinceFinished<24*3600_000){
   events.push({code:'finished',onlyPending:false,notice:{title:'Terminó '+r.name,body:'Ya podés consultar tus puntos y la clasificación en Prode TAFA.',url:'/#/club/historial',tag:'tafa-'+r.id+'-finished'}});
  }
  for(const event of events){
   const eligibility=new Map<string,boolean>();
   for(const s of subscriptions){
    if(event.onlyPending){
     if(!eligibility.has(s.user_id))eligibility.set(s.user_id,await pending(env,s.user_id,r.id));
     if(!eligibility.get(s.user_id))continue;
    }
    await send(env,s,event.notice,'round:'+r.id+':'+event.code);
   }
  }
 }
}
