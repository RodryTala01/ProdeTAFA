import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizePromiedosResult,promiedosKickoff,type PromiedosGame} from '../worker/promiedos';
import {getPromiedosGame} from '../scripts/promiedos-client';
import {handlePromiedosCache,searchCachedFixtures} from '../worker/promiedos-cache';
import {handleAdminRounds} from '../worker/rounds';
import {syncRoundResults,syncEligibleRounds} from '../worker/results';
import {handleAdminCorrections} from '../worker/admin-corrections';
let db:DatabaseSync;
function env(){return {DB:{prepare(sql:string){let args:any[]=[];return {bind(...v:any[]){args=v;return this;},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}};},async batch(ss:any[]){db.exec('BEGIN');try {const out=[];for(const s of ss)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}} as unknown as D1Database,FOOTBALL_API_KEY:'test'};}
const game=(changes:Partial<PromiedosGame>={}):PromiedosGame=>({id:'abc',teams:[{id:'home',name:'Local'},{id:'away',name:'Visita'}],league:{id:'league',name:'Liga'},start_time:'10-10-2026 15:45',status:{enum:3,name:'Finalizado'},scores:[2,1],winner:1,events:[{name:'Fin de los 90 minutos',scores:[2,1]}],...changes});
function cache(kind:string,key:string,payload:unknown,expired=false){db.prepare("INSERT OR REPLACE INTO promiedos_cache(kind,cache_key,payload_json,fetched_at,expires_at) VALUES (?,?,?,datetime('now'),datetime('now',?))").run(kind,key,JSON.stringify(payload),expired?'-1 minute':'+30 minutes');}
function respond(g=game()){cache('game','abc',g);cache('day','2026-10-10',[g]);vi.stubGlobal('fetch',vi.fn(async()=>Response.json({game:g})));}
function req(path:string,body?:unknown){return new Request('https://local/api/admin/'+path,{method:body?'PUT':'GET',headers:{cookie:'prode_session=admin','content-type':'application/json'},body:body?JSON.stringify(body):undefined});}
function insert(provider='promiedos'){db.prepare(`INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_provider_id,away_team_provider_id,home_team_name,away_team_name,kickoff_at,status) VALUES (1,1,?,'abc','home','away','Local','Visita','2026-10-10T18:45:00Z','NS')`).run(provider);}
beforeEach(()=>{db=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+f,'utf8'));db.exec(`INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES ('admin','Admin','1','hash','admin'); INSERT INTO rounds(id,name,status) VALUES (1,'Prueba','draft');`);db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES ('admin','admin',?,'2099-01-01')").run(createHash('sha256').update('admin').digest('hex'));});
afterEach(()=>{db.close();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('converts Buenos Aires explicitly and rejects invalid dates',()=>{expect(promiedosKickoff('10-10-2026 15:45')).toBe('2026-10-10T18:45:00.000Z');expect(()=>promiedosKickoff('31-02-2026 15:45')).toThrow();});
it('search reads seven cached days without provider requests',async()=>{
 vi.stubGlobal('fetch',vi.fn());for(let i=10;i<=16;i++)cache('day','2026-10-'+i,[game(),game({id:'xyz'})]);
 const r=await handleAdminRounds(req('fixtures?from=2026-10-10&to=2026-10-16'),env());
 expect(r?.status).toBe(200);expect(await r!.json()).toMatchObject({requestCount:0,fixtures:[{provider:'promiedos',providerFixtureId:'abc'},{}]});expect(fetch).not.toHaveBeenCalled();
});
it('normal, extra time, penalties and extra + penalties keep regulation separate',()=>{
 expect(normalizePromiedosResult(game())).toMatchObject({status:'FT',regulation:[2,1],current:[2,1],winner:'home',final:true});
 const et=game({scores:[1,0],status:{enum:3,name:'En Tiempo Extra'},events:[{name:'Fin de los 90 minutos',scores:[0,0]},{name:'Suplementario',scores:[1,0]}]});expect(normalizePromiedosResult(et)).toMatchObject({status:'AET',regulation:[0,0],current:[1,0],wentToExtra:true});
 const pen=game({scores:[1,1],penalties:[1,3],winner:2,to_qualify:2,events:[{name:'Fin de los 90 minutos',scores:[1,1]},{name:'Penales',scores:[1,3],is_penalties_stage:true}]});expect(normalizePromiedosResult(pen)).toMatchObject({status:'PEN',regulation:[1,1],winner:'away',qualified:'away',wentToPenalties:true,wentToExtra:false});
 expect(normalizePromiedosResult({...pen,events:[...pen.events!,{name:'Suplementario',scores:[1,1]}]}).wentToExtra).toBe(true);
});
it('live normal is provisional, live extra requires explicit regulation',()=>{expect(normalizePromiedosResult(game({status:{enum:2,name:'2do Tiempo'},events:[]}))).toMatchObject({status:'LIVE',final:false,current:[2,1],regulation:null});expect(()=>normalizePromiedosResult(game({status:{enum:2,name:'Tiempo Extra'},events:[]}))).toThrow();});
it.each([{events:[]},{scores:[9,7]},{winner:2},{status:{enum:4,name:'Suspendido'}}])('rejects ambiguous result %j without writing',async changes=>{insert();db.exec("UPDATE matches SET status='FT',home_score_regulation=2,away_score_regulation=1,home_score_current=2,away_score_current=1,result_finalized_at='2026-10-10'");const before=db.prepare('SELECT * FROM matches').get();respond(game(changes as any));const result=await syncRoundResults(1,env());expect(result.updated).toBe(0);expect(result.warnings).toHaveLength(1);expect(db.prepare('SELECT * FROM matches').get()).toEqual(before);});
it('adds provider from verified game rather than trusting supplied names',async()=>{respond();const r=await handleAdminRounds(new Request('https://local/api/admin/rounds/1/matches',{method:'POST',headers:{cookie:'prode_session=admin'},body:JSON.stringify({fixture:{provider:'promiedos',providerFixtureId:'abc',home:{name:'Fake'},away:{name:'Fake'},kickoffAt:'2026-10-10T18:45:00Z'},matchType:'NORMAL'})}),env());expect(r?.status).toBe(201);expect(db.prepare('SELECT provider,home_team_name,kickoff_at FROM matches').get()).toMatchObject({provider:'promiedos',home_team_name:'Local',kickoff_at:'2026-10-10T18:45:00.000Z'});});
it('sync persists Promiedos and manual override keeps provider and blocks sync until reset',async()=>{insert();db.exec("UPDATE rounds SET status='open'");respond();expect((await syncRoundResults(1,env())).finalized).toBe(1);let r=await handleAdminCorrections(req('matches/1/manual-result',{homeScore:4,awayScore:0,reason:'Corrección comprobada'}),env());expect(r?.status).toBe(200);expect(db.prepare('SELECT provider,home_score_regulation FROM matches').get()).toMatchObject({provider:'promiedos',home_score_regulation:4});vi.mocked(fetch).mockClear();expect((await syncRoundResults(1,env())).updated).toBe(0);expect(fetch).not.toHaveBeenCalled();r=await handleAdminCorrections(req('matches/1/manual-result/reset',{reason:'Recuperar proveedor oficial'}),env());expect(r?.status).toBe(200);expect(db.prepare('SELECT provider,status,home_score_regulation FROM matches').get()).toMatchObject({provider:'promiedos',status:'NS',home_score_regulation:null});expect((await syncRoundResults(1,env())).updated).toBe(1);});
it('legacy manual rows recover original provider from audited history',async()=>{insert('manual');db.exec(`INSERT INTO audit_log(action,entity_type,entity_id,before_json) VALUES ('match.result_override','match','1','{"provider":"api-football"}')`);const r=await handleAdminCorrections(req('matches/1/manual-result/reset',{reason:'Recuperar origen histórico'}),env());expect(r?.status).toBe(200);expect(db.prepare('SELECT provider FROM matches').get()).toMatchObject({provider:'api-football'});});
it('retains all final stages in one idempotent audit snapshot',async()=>{
 insert();respond(game({scores:[2,2],penalties:[4,3],winner:1,to_qualify:1,events:[
  {name:'Fin de los 90 minutos',scores:[1,1]},
  {name:'Suplementario',scores:[2,2]},
  {name:'Penales',scores:[4,3],is_penalties_stage:true}]}));
 await syncRoundResults(1,env());await syncRoundResults(1,env());
 const rows=db.prepare("SELECT after_json FROM audit_log WHERE action='match.promiedos_result'").all();
 expect(rows).toHaveLength(1);
 expect(JSON.parse(rows[0].after_json as string)).toMatchObject({regulation:[1,1],extraTime:[2,2],penalties:[4,3]});
 expect(db.prepare('SELECT home_score_regulation,home_score_current FROM matches').get()).toMatchObject({home_score_regulation:1,home_score_current:2});
});
it('legacy API-Football still uses date and existing result handling',async()=>{insert('api-football');db.exec("UPDATE matches SET provider_fixture_id='100'");vi.stubGlobal('fetch',vi.fn(async()=>Response.json({errors:[],response:[{fixture:{id:100,date:'2026-10-10T18:45:00Z',status:{short:'FT',elapsed:90}},teams:{home:{id:'home',winner:true},away:{id:'away'}},goals:{home:2,away:1},score:{fulltime:{home:2,away:1}}}]})));expect((await syncRoundResults(1,env())).finalized).toBe(1);expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('date=2026-10-10');});
it('cron skips future/finalized and uses only eligible opaque IDs without API key',async()=>{insert();db.exec("UPDATE rounds SET status='open'; UPDATE matches SET kickoff_at=datetime('now','-30 minutes')");respond(game({status:{enum:2,name:'En juego'},events:[]}));await syncEligibleRounds({DB:env().DB});expect(fetch).not.toHaveBeenCalled();expect(db.prepare('SELECT status FROM matches').get()).toMatchObject({status:'LIVE'});});
it('wrong identity is rejected',async()=>{respond(game({id:'other'}));await expect(getPromiedosGame('abc')).rejects.toThrow();});
const ingestionToken='local-test-token-never-production-123456';
const ingestionEnv=()=>({...env(),PROMIEDOS_INGEST_TOKEN:ingestionToken});
const ingest=(entries:unknown[],token=ingestionToken)=>handlePromiedosCache(new Request('https://local/api/internal/promiedos-cache',{
 method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify({entries})}),ingestionEnv());
const entry=(kind='game',key='abc',payload:unknown=game(),fetchedAt=new Date().toISOString())=>({kind,key,payload,fetchedAt});
it('ingestion requires a dedicated token and only writes provider cache',async()=>{
 insert();const before=db.prepare('SELECT * FROM matches').get();
 expect((await ingest([entry()],'wrong'))?.status).toBe(401);
 expect(db.prepare('SELECT count(*) AS n FROM promiedos_cache').get()).toMatchObject({n:0});
 expect((await ingest([entry()]))?.status).toBe(200);
 expect(db.prepare('SELECT * FROM matches').get()).toEqual(before);
 expect(db.prepare('SELECT count(*) AS n FROM audit_log').get()).toMatchObject({n:0});
});
it('invalid identity or stages cannot replace valid cache; batches validate before writing',async()=>{
 expect((await ingest([entry()]))?.status).toBe(200);
 const before=db.prepare('SELECT payload_json FROM promiedos_cache').get();
 expect((await ingest([entry('day','2026-10-10',[game()]),entry('game','abc',game({id:'other'}))]))?.status).toBe(400);
 expect(db.prepare('SELECT payload_json FROM promiedos_cache').get()).toEqual(before);
 expect(db.prepare('SELECT count(*) AS n FROM promiedos_cache').get()).toMatchObject({n:1});
 expect((await ingest([entry('game','abc',game({events:[]}))]))?.status).toBe(400);
});
it('older ingestion cannot roll back the provider cache',async()=>{
 const newer=new Date().toISOString(),older=new Date(Date.now()-60_000).toISOString();
 await ingest([entry('game','abc',game(),newer)]);
 const before=db.prepare('SELECT payload_json,fetched_at FROM promiedos_cache').get();
 await ingest([entry('game','abc',game({scores:[3,1],events:[{name:'Fin de los 90 minutos',scores:[3,1]}]}),older)]);
 expect(db.prepare('SELECT payload_json,fetched_at FROM promiedos_cache').get()).toEqual(before);
});
it('ingestion-to-sync round trip uses cache without any outbound fetch',async()=>{
 insert();vi.stubGlobal('fetch',vi.fn());
 await ingest([entry()]);
 const result=await syncRoundResults(1,env());
 expect(result).toMatchObject({updated:1,finalized:1,requestCount:0,warnings:[]});
 expect(db.prepare('SELECT provider,home_score_regulation,away_score_regulation FROM matches').get())
  .toMatchObject({provider:'promiedos',home_score_regulation:2,away_score_regulation:1});
 expect(fetch).not.toHaveBeenCalled();
});
it('0015 adds only isolated provider storage and preserves existing schema/data',()=>{
 const upgrade=new DatabaseSync(':memory:');
 try {
  for(const f of readdirSync('migrations').filter(x=>x.endsWith('.sql') && x<'0015').sort())upgrade.exec(readFileSync('migrations/'+f,'utf8'));
  upgrade.exec("INSERT INTO rounds(name,status) VALUES ('Existing','draft')");
  const schema=upgrade.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  upgrade.exec(readFileSync('migrations/0015_promiedos_cache.sql','utf8'));
  expect(upgrade.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE 'promiedos_cache%' ORDER BY name").all()).toEqual(schema);
  expect(upgrade.prepare('SELECT name,status FROM rounds').get()).toMatchObject({name:'Existing',status:'draft'});
  expect(upgrade.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
 } finally {upgrade.close();}
});
it('misses request acquisition; expired game preserves previous sporting result and never fetches',async()=>{
 vi.stubGlobal('fetch',vi.fn());
 await expect(searchCachedFixtures('2026-10-10',env().DB)).rejects.toThrow('pendientes');
 expect(db.prepare('SELECT requested_at FROM promiedos_cache').get()?.requested_at).toBeTruthy();
 insert();db.exec("UPDATE matches SET home_score_current=2,away_score_current=1,status='LIVE'");
 const before=db.prepare('SELECT * FROM matches').get();cache('game','abc',game(),true);
 expect((await syncRoundResults(1,env())).warnings).toHaveLength(1);
 expect(db.prepare('SELECT * FROM matches').get()).toEqual(before);expect(fetch).not.toHaveBeenCalled();
});
it('work plan exposes provider IDs only, excludes future, finished and manually corrected matches',async()=>{
 insert();db.exec("UPDATE rounds SET status='open'; UPDATE matches SET kickoff_at=datetime('now','-30 minutes')");
 const request=()=>new Request('https://local/api/internal/promiedos-cache/work',{headers:{authorization:'Bearer '+ingestionToken}});
 const response=await handlePromiedosCache(request(),ingestionEnv());
 expect(await response!.json()).toMatchObject({games:['abc']});
 db.exec("UPDATE matches SET result_finalized_at=datetime('now')");
 expect(await (await handlePromiedosCache(request(),ingestionEnv()))!.json()).toMatchObject({games:[]});
});
it('discovers a published version once and caches it after an invalid payload',async()=>{
 vi.resetModules();const client=await import('../scripts/promiedos-client');
 const mocked=vi.fn().mockResolvedValueOnce(Response.json({}))
  .mockResolvedValueOnce(new Response('<script src="/_next/static/chunks/pages/_app-abc123.js"></script>'))
  .mockResolvedValueOnce(new Response('const headers={"X-VER":"1.11.8.0"}'))
  .mockResolvedValueOnce(Response.json({game:game()}))
  .mockResolvedValueOnce(Response.json({game:game()}));
 vi.stubGlobal('fetch',mocked);const counter={count:0};
 await client.getPromiedosGame('abc',counter);await client.getPromiedosGame('abc',counter);
 expect(counter.count).toBe(5);expect(mocked.mock.calls[3][1].headers).toEqual({'X-VER':'1.11.8.0'});
 expect(mocked.mock.calls[4][1].headers).toEqual({'X-VER':'1.11.8.0'});
});
it('stops after one retry and does not attempt to bypass forbidden responses',async()=>{
 vi.resetModules();const client=await import('../scripts/promiedos-client');
 const mocked=vi.fn().mockResolvedValueOnce(Response.json({}))
  .mockResolvedValueOnce(new Response('<script src="/_next/static/chunks/pages/_app-abc123.js"></script>'))
  .mockResolvedValueOnce(new Response('"X-VER":"1.11.8.0"'))
  .mockResolvedValueOnce(Response.json({}));vi.stubGlobal('fetch',mocked);
 await expect(client.getPromiedosGame('abc')).rejects.toThrow();expect(mocked).toHaveBeenCalledTimes(4);
 mocked.mockReset().mockResolvedValue(new Response('',{status:403}));
 await expect(client.getPromiedosGame('abc')).rejects.toThrow('HTTP 403');expect(mocked).toHaveBeenCalledTimes(1);
});
