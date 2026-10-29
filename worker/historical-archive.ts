import type {Env} from './index';

export type ArchiveRow={id:number;season_number:number;season_name:string;source_name:string;source_sha256:string;payload_json:string;counts_json:string;status:string;created_at:string;reverted_at:string|null;revert_reason:string|null};
import {archiveTables,archiveColumns,type ArchivePayload,type ArchiveParticipant,type ArchiveCompetition,type ArchiveStatistic,type ArchiveStanding,type ArchiveRound,type ArchiveResult,type ArchiveMatch,type ArchiveMovement,type ArchiveIffhs} from '../src/historical-schema';
type R=Record<string,unknown>;
const obj=(x:unknown):x is R=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=(x:unknown)=>x===null||x===undefined?'':String(x).trim();
const text=(x:unknown,max=120)=>str(x).slice(0,max);
const number=(x:unknown,required=false,decimal=false):number|null=>{
 if(x===null||x===undefined||x==='')return required?NaN:null;
 const n=Number(x);
 return Number.isFinite(n)&&n>=0&&n<=100000000&&(decimal||Number.isInteger(n))?n:NaN;
};
const positive=(x:unknown)=>{const n=number(x,true);return n!==null&&Number.isFinite(n)&&n>0?n:NaN;};
function validateRecord(row:unknown,columns:readonly string[],label:string,index:number,errors:string[]):R{
 if(!obj(row)){errors.push(label+' fila '+(index+2)+': no es un registro');return {};}
 const unknown=Object.keys(row).filter(x=>!columns.includes(x));
 if(unknown.length)errors.push(label+' fila '+(index+2)+': columnas desconocidas '+unknown.join(', '));
 return row;
}
export function normalizeArchive(value:unknown){
 const errors:string[]=[],warnings:string[]=[];
 if(!obj(value)||value.version!==1||!obj(value.season)){
  return {payload:null as ArchivePayload|null,errors:['Archivo inválido: versión o metadatos de temporada ausentes'],warnings,counts:{}};
 }
 const n=positive(value.season.number);
 if(!Number.isFinite(n)||n>500)errors.push('Número de temporada inválido');
 const name=text(value.season.name,120)||'Temporada '+n;
 const payload:ArchivePayload={version:1,season:{number:n,name,kind:text(value.season.kind,60)||'MIXTA',notes:text(value.season.notes,4000)},
 participants:[],competitions:[],statistics:[],standings:[],rounds:[],results:[],matches:[],movements:[],iffhs:[]};
 for(const table of archiveTables){
  const raw=value[table];if(!Array.isArray(raw)){errors.push('Falta la hoja '+table);continue;}
  if(raw.length>20000)errors.push('Demasiadas filas en '+table);
  for(const [i,item] of raw.entries()){
   const r=validateRecord(item,archiveColumns[table],table,i,errors);
   const context=table+' fila '+(i+2);
   const field=(field:string,max=120)=>text(r[field],max);
   const count=(field:string,required=false,decimal=false)=>{
    const x=number(r[field],required,decimal);
    if(Number.isNaN(x))errors.push(context+': '+field+' debe ser un número válido');
    return x;
   };
   if(table==='participants'){
    const x:ArchiveParticipant={key:field('key',80),name:field('name',120),userId:field('userId',80)||null,division:field('division',20)||null};
    if(!x.key||!x.name)errors.push(context+': clave y nombre obligatorios');
    payload.participants.push(x);
   }else if(table==='competitions'){
    const kind=field('kind').toUpperCase() as ArchiveCompetition['kind'];
    const x:ArchiveCompetition={code:field('code',40).toUpperCase(),name:field('name'),kind};
    if(!/^[A-Z0-9_]{2,40}$/.test(x.code)||!x.name||!['LEAGUE','CUP','TOURNAMENT','PROMOTION'].includes(kind))errors.push(context+': código, nombre o tipo de competencia inválidos');
    payload.competitions.push(x);
   }else if(table==='statistics'){
    payload.statistics.push({participantKey:field('participantKey',80),points:count('points',true)!,fulls:count('fulls'),partials:count('partials'),errors:count('errors'),extras:count('extras'),dates:count('dates'),predictions:count('predictions')});
   }else if(table==='standings'){
    payload.standings.push({competitionCode:field('competitionCode').toUpperCase(),participantKey:field('participantKey',80),position:positive(r.position),points:count('points',true)!,fulls:count('fulls'),partials:count('partials'),errors:count('errors'),extras:count('extras')});
    if(!Number.isFinite(positive(r.position)))errors.push(context+': posición inválida');
   }else if(table==='rounds'){
    const round=field('round');
    if(!round)errors.push(context+': Fecha obligatoria');
    payload.rounds.push({round,participantKey:field('participantKey',80),points:count('points',true)!,fulls:count('fulls'),partials:count('partials'),errors:count('errors'),extras:count('extras')});
   }else if(table==='results'){
    payload.results.push({competitionCode:field('competitionCode').toUpperCase(),participantKey:field('participantKey',80),position:count('position'),resultCode:field('resultCode').toUpperCase(),teamLabel:field('teamLabel')||null});
   }else if(table==='matches'){
    const basis=(field('scoreBasis').toUpperCase()||'INDIVIDUAL') as ArchiveMatch['scoreBasis'];
    if(!['INDIVIDUAL','DUO'].includes(basis))errors.push(context+': tipo de cruce inválido');
    payload.matches.push({competitionCode:field('competitionCode').toUpperCase(),stage:field('stage'),round:field('round')||null,aKey:field('aKey',80),bKey:field('bKey',80),pointsA:count('pointsA',true)!,pointsB:count('pointsB',true)!,plenosA:count('plenosA'),plenosB:count('plenosB'),scoreBasis:basis});
   }else if(table==='movements'){
    const type=field('type').toUpperCase() as ArchiveMovement['type'];
    if(!['ASCENSO','DESCENSO','PERMANENCIA','OTRO'].includes(type))errors.push(context+': tipo de movimiento inválido');
    payload.movements.push({participantKey:field('participantKey',80),fromDivision:field('fromDivision')||null,toDivision:field('toDivision')||null,type,detail:field('detail',500)||null});
   }else if(table==='iffhs'){
    const position=count('position');
    payload.iffhs.push({participantKey:field('participantKey',80),points:count('points',true,true)!,position:position===null?null:position});
   }
  }
 }
 const keys=new Set<string>(),users=new Set<string>(),codes=new Set<string>();
 for(const p of payload.participants){
  if(keys.has(p.key))errors.push('Participante duplicado: '+p.key);
  keys.add(p.key);
  if(p.userId){if(users.has(p.userId))errors.push('ID de usuario repetido: '+p.userId);users.add(p.userId);}
 }
 for(const c of payload.competitions){if(codes.has(c.code))errors.push('Competencia duplicada: '+c.code);codes.add(c.code);}
 const unique=new Set<string>();
 const check=(label:string,key:string,participantKeys:string[],competitionCode?:string)=>{
  if(competitionCode&&!codes.has(competitionCode))errors.push(label+': competición inexistente '+competitionCode);
  for(const p of participantKeys)if(!keys.has(p))errors.push(label+': participante inexistente '+p);
  if(unique.has(key))errors.push(label+': fila repetida');else unique.add(key);
 };
 for(const s of payload.statistics)check('Estadísticas','stat:'+s.participantKey,[s.participantKey]);
 for(const s of payload.standings)check('Tabla','table:'+s.competitionCode+':'+s.participantKey,[s.participantKey],s.competitionCode);
 for(const r of payload.rounds)check('Fecha','round:'+r.round+':'+r.participantKey,[r.participantKey]);
 for(const r of payload.results)check('Resultado','result:'+r.competitionCode+':'+r.participantKey+':'+r.teamLabel,[r.participantKey],r.competitionCode);
 for(const m of payload.matches){
  check('Cruce','match:'+m.competitionCode+':'+m.stage+':'+m.round+':'+[m.aKey,m.bKey].sort().join(':'),[m.aKey,m.bKey],m.competitionCode);
  if(!m.stage||m.aKey===m.bKey)errors.push('Cruce con instancia vacía o rival idéntico');
 }
 for(const m of payload.movements)check('Movimiento','movement:'+m.participantKey+':'+m.type,[m.participantKey]);
 for(const i of payload.iffhs)check('IFFHS','iffhs:'+i.participantKey,[i.participantKey]);
 if(!payload.competitions.length)errors.push('La temporada debe declarar al menos una competición realmente disputada');
 if(!payload.participants.length)errors.push('La temporada debe contener participantes');
 if(!payload.statistics.length)warnings.push('Sin estadísticas generales: puntos históricos no se sumarán hasta completarlas');
 if(!payload.rounds.length)warnings.push('Sin Fechas individuales: solo estarán disponibles los totales de temporada');
 if(!payload.matches.length)warnings.push('Sin cruces oficiales: el historial de rivales no incorporará esta temporada');
 if(!payload.iffhs.length)warnings.push('Sin IFFHS: esa temporada aparecerá como faltante en IFFHS');
 const unlinked=payload.participants.filter(p=>!p.userId);
 if(unlinked.length)warnings.push(unlinked.length+' participantes aún no vinculados a una cuenta actual; sus datos se conservan con clave histórica.');
 const stats=new Map(payload.statistics.map(s=>[s.participantKey,s]));
 if(payload.rounds.length){
  const grouped=new Map<string,number>();
  for(const r of payload.rounds)grouped.set(r.participantKey,(grouped.get(r.participantKey)??0)+r.points);
  for(const [key,total] of grouped){const s=stats.get(key);if(s&&total!==s.points)warnings.push(key+': Fechas '+total+' PTS frente al total general '+s.points+' PTS. Revisar cobertura de Fechas');}
 }
 const counts=Object.fromEntries(archiveTables.map(t=>[t,payload[t].length]));
 return {payload,errors:[...new Set(errors)].slice(0,100),warnings:[...new Set(warnings)].slice(0,100),counts};
}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const error=(msg:string,status=400)=>json({error:msg},status);
async function loggedIn(request:Request,env:Env){
 const cookie=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('prode_session='));
 if(!cookie)return null;
 const token=decodeURIComponent(cookie.slice('prode_session='.length));
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
 const hash=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return env.DB.prepare("SELECT u.id,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1 LIMIT 1")
 .bind(hash).first<{id:string;role:string}>();
}
export async function activeHistoricalArchives(db:D1Database):Promise<Array<{seasonNumber:number;data:ArchivePayload}>>{
 const rows=await db.prepare("SELECT season_number,payload_json FROM historical_imports WHERE status='active' ORDER BY season_number")
 .all<{season_number:number;payload_json:string}>();
 return (rows.results??[]).map(r=>({seasonNumber:r.season_number,data:JSON.parse(r.payload_json) as ArchivePayload}));
}
export function archivedUserKey(data:ArchivePayload,key:string){
 const p=data.participants.find(p=>p.key===key);
 return p?.userId??('hist:'+data.season.number+':'+key);
}
export function historicalStats(archives:Awaited<ReturnType<typeof activeHistoricalArchives>>){
 const totals=new Map<string,{userId:string;fullName:string;points:number;fulls:number;partials:number;errors:number;extras:number;dates:number;predictions:number;seasons:number[]}>();
 for(const {data} of archives){
  for(const s of data.statistics){
   const p=data.participants.find(p=>p.key===s.participantKey);
   if(!p)continue;
   const uid=archivedUserKey(data,s.participantKey);
   const total=totals.get(uid)??{userId:uid,fullName:p.name,points:0,fulls:0,partials:0,errors:0,extras:0,dates:0,predictions:0,seasons:[]};
   total.points+=s.points;total.fulls+=s.fulls??0;total.partials+=s.partials??0;total.errors+=s.errors??0;
   total.extras+=s.extras??0;total.dates+=s.dates??0;total.predictions+=s.predictions??0;
   total.seasons.push(data.season.number);totals.set(uid,total);
  }
 }
 return totals;
}
export async function handleHistoricalArchive(request:Request,env:Env):Promise<Response|null>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/admin/historical-imports')&&!path.startsWith('/api/participant/historical-archive/'))return null;
 const user=await loggedIn(request,env);if(!user)return error('No autorizado',401);
 if(path.startsWith('/api/participant/historical-archive/')){
  if(request.method!=='GET')return error('Método inválido',405);
  let id='';try{id=decodeURIComponent(path.split('/').at(-1)??'');}catch{return error('ID inválido');}
  const archives=await activeHistoricalArchives(env.DB);
  const seasons=archives.flatMap(({data})=>{
    const participants=data.participants.filter(p=>archivedUserKey(data,p.key)===id);
    return participants.map(p=>({seasonNumber:data.season.number,seasonName:data.season.name,
      participantName:p.name,division:p.division,
      stats:data.statistics.find(s=>s.participantKey===p.key)??null,
      rounds:data.rounds.filter(r=>r.participantKey===p.key),
      standings:data.standings.filter(r=>r.participantKey===p.key),
      results:data.results.filter(r=>r.participantKey===p.key),
      movements:data.movements.filter(r=>r.participantKey===p.key),
      iffhs:data.iffhs.find(r=>r.participantKey===p.key)??null}));
  });
  return json({seasons});
 }
 if(user.role!=='admin')return error('Solo administradores',403);
 const simple=path==='/api/admin/historical-imports';
 if(simple&&request.method==='GET'){
  const rows=await env.DB.prepare("SELECT h.id,h.season_number AS seasonNumber,h.season_name AS seasonName,h.source_name AS sourceName,h.source_sha256 AS sha256,h.counts_json AS counts,h.status,h.created_at AS createdAt,h.reverted_at AS revertedAt,h.revert_reason AS revertReason,u.full_name AS createdBy FROM historical_imports h LEFT JOIN users u ON u.id=h.created_by ORDER BY h.id DESC")
  .all();return json({imports:(rows.results??[]).map((r:R)=>({...r,counts:JSON.parse(String(r.counts))}))});
 }
 const match=path.match(/^\/api\/admin\/historical-imports\/(\d+)$/);
 if(match&&request.method==='GET'){
  const row=await env.DB.prepare("SELECT * FROM historical_imports WHERE id=?").bind(Number(match[1])).first<ArchiveRow>();
  return row?json({import:{id:row.id,status:row.status,seasonNumber:row.season_number,sourceName:row.source_name,sha256:row.source_sha256,data:JSON.parse(row.payload_json)}}):error('Importación inexistente',404);
 }
 const revert=path.match(/^\/api\/admin\/historical-imports\/(\d+)\/revert$/);
 if(revert&&request.method==='POST'){
  const id=Number(revert[1]);const body=await request.json().catch(()=>null) as R|null;
  const row=await env.DB.prepare("SELECT id,season_number,status,source_sha256 FROM historical_imports WHERE id=?").bind(id).first<{id:number;season_number:number;status:string;source_sha256:string}>();
  if(!row)return error('Importación no encontrada',404);
  if(row.status!=='active')return error('Esta importación ya está revertida',409);
  if(!obj(body)||Number(body.seasonNumber)!==row.season_number||str(body.sha256)!==row.source_sha256)return error('Confirmación de temporada o huella incorrecta',409);
  const reason=text(body.reason,500);
  if(reason.length<5)return error('Explicá el motivo de la reversión (mínimo 5 caracteres)');
  await env.DB.batch([
   env.DB.prepare("UPDATE historical_imports SET status='reverted',reverted_by=?,reverted_at=datetime('now'),revert_reason=? WHERE id=? AND status='active'").bind(user.id,reason,id),
   env.DB.prepare("INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json) VALUES(?,'historical_import.reverted','historical_import',?,?,?)").bind(user.id,String(id),JSON.stringify(row),JSON.stringify({reason})),
  ]);
  return json({ok:true,reverted:id});
 }
 const preview=path==='/api/admin/historical-imports/preview'&&request.method==='POST';
 if((simple&&request.method==='POST')||preview){
  const body=await request.json().catch(()=>null) as R|null;
  if(!obj(body)||!obj(body.data)||JSON.stringify(body.data).length>1800000)return error('Archivo inválido o demasiado grande (máximo 1,8 MB)');
  const normalized=normalizeArchive(body.data);
  const unknown:string[]=[];
  for(const p of normalized.payload?.participants??[]){
   if(!p.userId)continue;
   const exists=await env.DB.prepare("SELECT id FROM users WHERE id=? AND role='participant'").bind(p.userId).first();
   if(!exists)unknown.push(p.name+' ('+p.userId+')');
  }
  if(unknown.length)normalized.errors.push('IDs de participantes no registrados: '+unknown.slice(0,12).join(', '));
  if(normalized.payload){
   const season=normalized.payload.season.number;
   const active=await env.DB.prepare("SELECT id FROM historical_imports WHERE season_number=? AND status='active'").bind(season).first();
   if(active)normalized.errors.push('Ya existe una importación activa de T'+season+'. Revertí primero la carga anterior.');
   const official=await env.DB.prepare("SELECT COUNT(*) AS n FROM tafa_seasons s JOIN competitions c ON c.season_id=s.id LEFT JOIN competition_results res ON res.competition_id=c.id LEFT JOIN competition_round_links l ON l.competition_id=c.id WHERE s.season_number=? AND (res.id IS NOT NULL OR l.id IS NOT NULL)").bind(season).first<{n:number}>();
   if(Number(official?.n??0)>0)normalized.errors.push('T'+season+' contiene resultados o Fechas del motor oficial; para evitar duplicados no puede importarse como archivo independiente.');
  }
  const content=normalized.payload?JSON.stringify(normalized.payload):'';
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)));
  const sha=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
  if(preview)return json({ok:normalized.errors.length===0,errors:normalized.errors,warnings:normalized.warnings,counts:normalized.counts,sha256:sha,season:normalized.payload?.season??null});
  if(normalized.errors.length)return error('La importación tiene errores: '+normalized.errors.join(' | '),422);
  if(str(body.sha256)!==sha)return error('La vista previa está desactualizada. Volvé a validar antes de importar.',409);
  const sourceName=text(body.sourceName,180);
  if(!sourceName)return error('Indicá el archivo de origen');
  const p=normalized.payload!;
  const insert=await env.DB.prepare("INSERT INTO historical_imports(season_number,season_name,source_name,source_sha256,payload_json,counts_json,created_by) VALUES(?,?,?,?,?,?,?) RETURNING id")
   .bind(p.season.number,p.season.name,sourceName,sha,content,JSON.stringify(normalized.counts),user.id).first<{id:number}>().catch(()=>null);
  if(!insert)return error('No se pudo confirmar. Revisá si T'+p.season.number+' ya fue importada.',409);
  await env.DB.prepare("INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json) VALUES(?,'historical_import.committed','historical_import',?,NULL,?)")
   .bind(user.id,String(insert.id),JSON.stringify({seasonNumber:p.season.number,sha256:sha,counts:normalized.counts})).run();
  return json({ok:true,id:insert.id,seasonNumber:p.season.number,counts:normalized.counts},201);
 }
 return error('Ruta o método no permitido',405);
}
