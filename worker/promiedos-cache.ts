import {PromiedosError, parsePromiedosGame, promiedosFixture, normalizePromiedosResult, type PromiedosGame} from './promiedos';
import {manualResultSql} from './result-source';

type Env = {DB: D1Database; PROMIEDOS_INGEST_TOKEN?: string};
type Kind = 'day' | 'game';
const dateValid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
const keyValid = (kind: Kind, key: string) => typeof key === 'string' && (kind === 'day' ? dateValid(key) : /^[a-zA-Z0-9_-]{1,100}$/.test(key));
const json = (data: unknown, status=200) => Response.json(data,{status,headers:{'cache-control':'no-store'}});

async function queue(db: D1Database, kind: Kind, key: string) {
  await db.prepare(`INSERT INTO promiedos_cache(kind,cache_key,requested_at) VALUES (?,?,datetime('now'))
    ON CONFLICT(kind,cache_key) DO UPDATE SET requested_at=COALESCE(promiedos_cache.requested_at,excluded.requested_at)`)
    .bind(kind,key).run();
}

async function read(db: D1Database, kind: Kind, key: string) {
  if (!keyValid(kind,key)) throw new PromiedosError('Identificador de caché inválido');
  const row = await db.prepare(`SELECT payload_json FROM promiedos_cache WHERE kind=? AND cache_key=?
    AND julianday(expires_at)>julianday('now')`).bind(kind,key).first<{payload_json:string}>();
  if (!row) {
    await queue(db,kind,key);
    throw new PromiedosError('Datos de Promiedos pendientes o vencidos. Se solicitó una actualización; reintentá después de la próxima carga.');
  }
  return JSON.parse(row.payload_json);
}

export async function searchCachedFixtures(date: string, db: D1Database) {
  const games = await read(db,'day',date) as PromiedosGame[];
  return games.map(g=>promiedosFixture(parsePromiedosGame(g)));
}

export async function getCachedGame(id: string, db: D1Database) {
  return parsePromiedosGame(await read(db,'game',id),id);
}

// Adding a fixture uses the selected day's cached list, not gamecenter.
export async function getCachedFixture(id: string, kickoff: string, db: D1Database) {
  if (!Number.isFinite(Date.parse(kickoff))) throw new PromiedosError('Horario inválido');
  const date = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(kickoff));
  const fixtures = await searchCachedFixtures(date,db);
  const found = fixtures.find(g=>g.providerFixtureId===id);
  if (!found) throw new PromiedosError('El partido no está en la caché de esa fecha. Actualizá la búsqueda.');
  return found;
}

function cleanGame(value: unknown, id?: string): PromiedosGame {
  const g = parsePromiedosGame(value,id);
  // Do not persist advertising, betting information or unrelated provider fields.
  return {id:g.id,teams:g.teams.map(t=>({id:t.id,name:t.name})) as PromiedosGame['teams'],
    start_time:g.start_time,status:{enum:g.status.enum,name:g.status.name},scores:g.scores,
    winner:g.winner,to_qualify:g.to_qualify,penalties:g.penalties,game_time:g.game_time,
    events:g.events?.map(e=>({name:e.name,scores:e.scores,is_penalties_stage:e.is_penalties_stage})),
    league:g.league ? {id:g.league.id,name:g.league.name,country_name:g.league.country_name} : undefined,
    stage_round_name:g.stage_round_name};
}

async function authenticated(request: Request, token?: string) {
  if (!token || token.length<32) return false;
  const supplied = request.headers.get('authorization') ?? '';
  if (supplied.length>1024) return false;
  const hash = async (s:string) => new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [a,b]=await Promise.all([hash(supplied),hash('Bearer '+token)]);
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}

async function work(db:D1Database) {
  const pending = await db.prepare(`SELECT kind,cache_key FROM promiedos_cache WHERE requested_at IS NOT NULL
    ORDER BY requested_at LIMIT 40`).all<{kind:Kind;cache_key:string}>();
  const days=new Set<string>(), games=new Set<string>();
  for(const row of pending.results??[]) (row.kind==='day'?days:games).add(row.cache_key);
  const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'});
  // Warm a week of fixtures, only when absent/expired; no continuous worldwide polling.
  for(let i=0;i<7;i++) {
    const date=dateFormat.format(new Date(Date.now()+i*86400000));
    const fresh=await db.prepare(`SELECT 1 AS ok FROM promiedos_cache WHERE kind='day' AND cache_key=? AND julianday(expires_at)>julianday('now')`).bind(date).first();
    if(!fresh)days.add(date);
  }
  const active=await db.prepare(`SELECT provider_fixture_id FROM matches WHERE provider='promiedos'
    AND NOT ${manualResultSql('matches')} AND result_finalized_at IS NULL
    AND round_id IN (SELECT id FROM rounds WHERE status='open')
    AND (status IN ('1H','HT','2H','ET','BT','P','LIVE') OR
      julianday(kickoff_at) BETWEEN julianday('now','-4 hours') AND julianday('now','+10 minutes'))`)
    .all<{provider_fixture_id:string}>();
  for(const row of active.results??[])games.add(row.provider_fixture_id);
  return {days:[...days].slice(0,14),games:[...new Set([...(active.results??[]).map(r=>r.provider_fixture_id),...games])].slice(0,24)};
}

export async function handlePromiedosCache(request: Request, env: Env): Promise<Response|null> {
  const path=new URL(request.url).pathname;
  if (!path.startsWith('/api/internal/promiedos-cache')) return null;
  if (!await authenticated(request,env.PROMIEDOS_INGEST_TOKEN)) return json({error:'Acceso no autorizado'},401);
  if (path==='/api/internal/promiedos-cache/work' && request.method==='GET') return json(await work(env.DB));
  if (path!=='/api/internal/promiedos-cache' || request.method!=='POST') return json({error:'Ruta o método no permitido'},405);
  try {
    const reader=request.body?.getReader();if(!reader)return json({error:'Cuerpo requerido'},400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4_000_000){await reader.cancel();return json({error:'Carga demasiado grande'},413);}chunks.push(value);}
    const buffer=new Uint8Array(size);let offset=0;for(const c of chunks){buffer.set(c,offset);offset+=c.length;}
    const body=JSON.parse(new TextDecoder().decode(buffer));
    if(!Array.isArray(body.entries)||!body.entries.length||body.entries.length>20)throw new Error();
    const keys=new Set<string>();
    const statements=body.entries.map((entry:{kind:Kind;key:string;fetchedAt:string;payload:unknown})=>{
      if(!['day','game'].includes(entry.kind)||!keyValid(entry.kind,entry.key)||keys.has(entry.kind+':'+entry.key))throw new Error();
      keys.add(entry.kind+':'+entry.key);
      const at=Date.parse(entry.fetchedAt);
      if(!Number.isFinite(at)||at>Date.now()+60_000||at<Date.now()-30*60_000)throw new Error();
      let payload:unknown;
      if(entry.kind==='day') {
        if(!Array.isArray(entry.payload)||entry.payload.length>5000)throw new Error();
        const games=entry.payload.map(g=>cleanGame(g));
        if(new Set(games.map(g=>g.id)).size!==games.length)throw new Error();
        for(const game of games)promiedosFixture(game);
        payload=games;
      }else{
        const game=cleanGame(entry.payload,entry.key);normalizePromiedosResult(game);payload=game;
      }
      const expires=new Date(at+(entry.kind==='day'?6*60:30)*60_000).toISOString();
      return env.DB.prepare(`INSERT INTO promiedos_cache(kind,cache_key,payload_json,fetched_at,expires_at)
        VALUES (?,?,?,?,?) ON CONFLICT(kind,cache_key) DO UPDATE SET payload_json=excluded.payload_json,
        fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,requested_at=NULL
        WHERE (promiedos_cache.fetched_at IS NULL OR julianday(excluded.fetched_at)>julianday(promiedos_cache.fetched_at))
          AND (excluded.kind='day' OR COALESCE(json_extract(promiedos_cache.payload_json,'$.status.enum'),0)
            <= json_extract(excluded.payload_json,'$.status.enum'))`)
        .bind(entry.kind,entry.key,JSON.stringify(payload),new Date(at).toISOString(),expires);
    });
    const results=await env.DB.batch(statements);
    return json({ok:true,updated:results.reduce((n,r)=>n+(r.meta.changes??0),0)});
  }catch{return json({error:'Carga de proveedor inválida; caché conservada'},400);}
}
