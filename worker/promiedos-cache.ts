import {PromiedosError, parsePromiedosGame, promiedosFixture, normalizePromiedosResult, type PromiedosGame} from './promiedos';
import {manualResultSql} from './result-source';
import {argentinaCalendarDate, shiftCalendarDate, utcDate} from '../src/match-time';

export class PromiedosCachePending extends PromiedosError {}

type Env = {DB: D1Database; PROMIEDOS_INGEST_TOKEN?: string};
type Kind = 'day' | 'game';
const dateValid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
const keyValid = (kind: Kind, key: string) => typeof key === 'string' && (kind === 'day' ? dateValid(key) : /^[a-zA-Z0-9_-]{1,100}$/.test(key));
// Pre-release day rows only contain localized strings. Refresh those even if their TTL is still valid.
const verifiedDay = "(json_array_length(payload_json)=0 OR json_type(payload_json,'$[0].kickoffAt')='text')";
const json = (data: unknown, status=200) => Response.json(data,{status,headers:{'cache-control':'no-store'}});

async function queue(db: D1Database, kind: Kind, key: string) {
  await db.prepare(`INSERT INTO promiedos_cache(kind,cache_key,requested_at) VALUES (?,?,datetime('now'))
    ON CONFLICT(kind,cache_key) DO UPDATE SET requested_at=COALESCE(promiedos_cache.requested_at,excluded.requested_at)`)
    .bind(kind,key).run();
}

async function read(db: D1Database, kind: Kind, key: string) {
  if (!keyValid(kind,key)) throw new PromiedosError('Identificador de caché inválido');
  const row = await db.prepare(`SELECT payload_json FROM promiedos_cache WHERE kind=? AND cache_key=?
    AND julianday(expires_at)>julianday('now') ${kind==='day' ? 'AND '+verifiedDay : ''}`).bind(kind,key).first<{payload_json:string}>();
  if (!row) {
    await queue(db,kind,key);
    throw new PromiedosCachePending('Datos de Promiedos pendientes o vencidos. Se solicitó una actualización; reintentá después de la próxima carga.');
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

// Repair existing scheduled matches from a fresh, verified instant, leaving
// official predictions, results and explicit admin overrides intact.
export async function repairCachedKickoffTimes(db: D1Database) {
  const matches = await db.prepare(`SELECT m.id,m.provider_fixture_id,m.home_team_provider_id,m.away_team_provider_id,m.kickoff_at
    FROM matches m JOIN rounds r ON r.id=m.round_id
    WHERE m.provider='promiedos' AND m.status='NS'
      AND (r.status='open' OR (r.status='draft' AND julianday(m.kickoff_at)>=julianday('now','-1 day')))
      AND m.result_finalized_at IS NULL AND NOT ${manualResultSql('m')}
      AND NOT EXISTS(SELECT 1 FROM audit_log a WHERE a.action='match.kickoff_corrected'
        AND a.entity_type='match' AND a.entity_id=CAST(m.id AS TEXT))
    ORDER BY r.status='open' DESC, m.kickoff_at, m.id LIMIT 45`)
    .all<{id:number;provider_fixture_id:string;home_team_provider_id:string;away_team_provider_id:string;kickoff_at:string}>();
  if (!matches.results?.length) return 0;

  const ids = [...new Set(matches.results.map(match => match.provider_fixture_id))];
  const placeholders = ids.map(() => '?').join(',');
  const cached = await db.prepare(`SELECT game_json,fixture_id FROM (
    SELECT item.value AS game_json,json_extract(item.value,'$.id') AS fixture_id,c.fetched_at,c.kind
    FROM promiedos_cache c,json_each(c.payload_json) item
    WHERE c.kind='day' AND julianday(c.expires_at)>julianday('now') AND ${verifiedDay}
      AND json_extract(item.value,'$.id') IN (${placeholders})
    UNION ALL
    SELECT payload_json,cache_key,fetched_at,kind FROM promiedos_cache
    WHERE kind='game' AND julianday(expires_at)>julianday('now')
      AND cache_key IN (${placeholders})
    ) ORDER BY julianday(fetched_at) DESC,kind DESC`).bind(...ids,...ids)
    .all<{fixture_id:string;game_json:string}>();

  const games = new Map<string, PromiedosGame>();
  for (const row of cached.results ?? []) {
    if (games.has(row.fixture_id)) continue;
    try {
      const game = parsePromiedosGame(JSON.parse(row.game_json), row.fixture_id);
      if (game.kickoffAt && game.status.enum === 1) games.set(game.id, game);
    } catch { /* Ignore an unusable snapshot. */ }
  }

  let repaired = 0;
  for (const match of matches.results) {
    const game = games.get(match.provider_fixture_id);
    const kickoff = game?.kickoffAt;
    if (!kickoff || +utcDate(match.kickoff_at) === Date.parse(kickoff) ||
        game.teams[0].id !== match.home_team_provider_id || game.teams[1].id !== match.away_team_provider_id) continue;
    const updated = await db.prepare(`UPDATE matches SET kickoff_at=?,updated_at=datetime('now')
      WHERE id=? AND kickoff_at=? AND provider='promiedos' AND status='NS' AND result_finalized_at IS NULL
        AND round_id IN (SELECT id FROM rounds WHERE status IN ('open','draft'))
        AND NOT ${manualResultSql('matches')}
        AND NOT EXISTS(SELECT 1 FROM audit_log a WHERE a.action='match.kickoff_corrected'
          AND a.entity_type='match' AND a.entity_id=CAST(matches.id AS TEXT))`)
      .bind(kickoff,match.id,match.kickoff_at).run();
    repaired += updated.meta.changes ?? 0;
  }
  return repaired;
}

// The date in the cache and in the fixture picker is always the Argentine day.
export async function getCachedFixture(id: string, kickoff: string, db: D1Database) {
  const date = new Date(kickoff);
  if (!Number.isFinite(+date)) throw new PromiedosError('Horario inválido');
  const fixtures = await searchCachedFixtures(argentinaCalendarDate(date),db);
  const found = fixtures.find(g=>g.providerFixtureId===id);
  if (!found) throw new PromiedosError('El partido no está en el calendario actualizado. Volvé a buscarlo.');
  return found;
}

function cleanGame(value: unknown, id?: string): PromiedosGame {
  const g = parsePromiedosGame(value,id);
  // Do not persist advertising, betting information or unrelated provider fields.
  return {id:g.id,teams:g.teams.map(t=>({id:t.id,name:t.name})) as PromiedosGame['teams'],
    start_time:g.start_time,kickoffAt:g.kickoffAt,status:{enum:g.status.enum,name:g.status.name},scores:g.scores,
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

export async function getPromiedosWorkPlan(db:D1Database) {
  const pending = await db.prepare(`SELECT kind,cache_key FROM promiedos_cache WHERE requested_at IS NOT NULL
    AND (kind='day' OR NOT EXISTS (SELECT 1 FROM matches WHERE provider_fixture_id=cache_key
      AND provider IN ('promiedos','manual') AND ${manualResultSql('matches')}))
    ORDER BY requested_at LIMIT 40`).all<{kind:Kind;cache_key:string}>();
  const days=new Set<string>(), games=new Set<string>();
  const today = argentinaCalendarDate(new Date());
  // Refresh the dates that can affect published deadlines ahead of the general week cache.
  const scheduled = await db.prepare(`SELECT kickoff_at FROM matches WHERE provider='promiedos'
    AND NOT ${manualResultSql('matches')} AND result_finalized_at IS NULL
    AND status='NS' AND round_id IN (SELECT id FROM rounds WHERE status='open')
    AND julianday(kickoff_at) BETWEEN julianday('now','-1 day') AND julianday('now','+30 days')
    ORDER BY kickoff_at LIMIT 32`).all<{kickoff_at:string}>();
  const scheduledDays = new Set<string>();
  for (const row of scheduled.results ?? []) {
    const at = utcDate(row.kickoff_at);
    if (Number.isFinite(+at)) scheduledDays.add(argentinaCalendarDate(at));
  }
  for (const date of scheduledDays) {
    const fresh = await db.prepare(`SELECT 1 AS ok FROM promiedos_cache WHERE kind='day' AND cache_key=?
      AND julianday(fetched_at)>julianday('now','-15 minutes') AND ${verifiedDay}`).bind(date).first();
    if (!fresh) days.add(date);
  }
  for (const row of pending.results ?? []) (row.kind === 'day' ? days : games).add(row.cache_key);
  for (let offset=0; offset<7; offset++) {
    const date = shiftCalendarDate(today, offset);
    const fresh = await db.prepare(`SELECT 1 AS ok FROM promiedos_cache WHERE kind='day' AND cache_key=?
      AND julianday(expires_at)>julianday('now') AND ${verifiedDay}`).bind(date).first();
    if (!fresh) days.add(date);
  }
  const active=await db.prepare(`SELECT provider_fixture_id,kickoff_at FROM matches WHERE provider='promiedos'
    AND NOT ${manualResultSql('matches')} AND result_finalized_at IS NULL
    AND round_id IN (SELECT id FROM rounds WHERE status='open')
    AND (status IN ('1H','HT','2H','ET','BT','P','LIVE') OR
      (status='NS' AND julianday(kickoff_at)<=julianday('now','+10 minutes')))`)
    .all<{provider_fixture_id:string;kickoff_at:string}>();
  for(const row of active.results??[])games.add(row.provider_fixture_id);
  const gameDays:Record<string,string>={};
  for (const row of active.results ?? []) {
    const at = utcDate(row.kickoff_at);
    if (Number.isFinite(+at)) gameDays[row.provider_fixture_id] = argentinaCalendarDate(at);
  }
  return {
    verifiedSchedule: true,
    days: [...days].slice(0,14),
    games: [...new Set([...(active.results??[]).map(r=>r.provider_fixture_id),...games])].slice(0,24),
    gameDays,
  };
}

export async function handlePromiedosCache(request: Request, env: Env): Promise<Response|null> {
  const path=new URL(request.url).pathname;
  if (!path.startsWith('/api/internal/promiedos-cache')) return null;
  if (!await authenticated(request,env.PROMIEDOS_INGEST_TOKEN)) return json({error:'Acceso no autorizado'},401);
  if (path==='/api/internal/promiedos-cache/work' && request.method==='GET') return json(await getPromiedosWorkPlan(env.DB));
  if (path==='/api/internal/promiedos-cache/apply' && request.method==='POST') {
    try {
      const body=await request.json() as {games?:unknown};
      if(!Array.isArray(body.games)||body.games.length>24||body.games.some(key=>typeof key!=='string'||!keyValid('game',key)))return json({error:'Identificadores inválidos'},400);
      const ids=[...new Set(body.games as string[])];
      // The authenticated apply step may run after uploading only daily fixtures.
      // Apply their verified kickoff corrections now instead of waiting for cron.
      const repairedKickoffs=await repairCachedKickoffTimes(env.DB);
      if(!ids.length)return json({ok:true,updated:0,calculated:0,repairedKickoffs});
      const placeholders=ids.map(()=>'?').join(',');
      const rows=await env.DB.prepare(`SELECT id,round_id FROM matches WHERE provider='promiedos' AND provider_fixture_id IN (${placeholders})`).bind(...ids).all<{id:number;round_id:number}>();
      const groups=new Map<number,number[]>();
      for(const match of rows.results??[])groups.set(match.round_id,[...(groups.get(match.round_id)??[]),match.id]);
      const {syncRoundResults}=await import('./results/index');
      let updated=0,calculated=0;const warnings:string[]=[];
      for(const [roundId,matchIds] of groups){const result=await syncRoundResults(roundId,env,[],matchIds);updated+=result.updated;calculated+=result.calculated;warnings.push(...result.warnings);}
      return json({ok:true,updated,calculated,repairedKickoffs,warnings});
    }catch{return json({error:'No se pudieron aplicar los datos adquiridos'},500);}
  }
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
        for (const game of games) {
          const fixture = promiedosFixture(game);
          if (argentinaCalendarDate(new Date(fixture.kickoffAt)) !== entry.key) throw new Error();
        }
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
