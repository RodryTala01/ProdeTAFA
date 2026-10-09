import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getPromiedosGame,normalizePromiedosResult,promiedosKickoff,searchPromiedosFixtures,type PromiedosGame} from '../worker/promiedos';
import {handleAdminRounds} from '../worker/rounds';
import {syncRoundResults,syncEligibleRounds} from '../worker/results';
import {handleAdminCorrections} from '../worker/admin-corrections';
let db:DatabaseSync;
function env(){return {DB:{prepare(sql:string){let args:any[]=[];return {bind(...v:any[]){args=v;return this;},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}};},async batch(ss:any[]){db.exec('BEGIN');try {const out=[];for(const s of ss)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}} as unknown as D1Database,FOOTBALL_API_KEY:'test'};}
const game=(changes:Partial<PromiedosGame>={}):PromiedosGame=>({id:'abc',teams:[{id:'home',name:'Local'},{id:'away',name:'Visita'}],league:{id:'league',name:'Liga'},start_time:'10-10-2026 15:45',status:{enum:3,name:'Finalizado'},scores:[2,1],winner:1,events:[{name:'Fin de los 90 minutos',scores:[2,1]}],...changes});
const respond=(g=game())=>vi.stubGlobal('fetch',vi.fn(async()=>Response.json({game:g})));
function req(path:string,body?:unknown){return new Request('https://local/api/admin/'+path,{method:body?'PUT':'GET',headers:{cookie:'prode_session=admin','content-type':'application/json'},body:body?JSON.stringify(body):undefined});}
function insert(provider='promiedos'){db.prepare(`INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_provider_id,away_team_provider_id,home_team_name,away_team_name,kickoff_at,status) VALUES (1,1,?,'abc','home','away','Local','Visita','2026-10-10T18:45:00Z','NS')`).run(provider);}
beforeEach(()=>{db=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+f,'utf8'));db.exec(`INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES ('admin','Admin','1','hash','admin'); INSERT INTO rounds(id,name,status) VALUES (1,'Prueba','draft');`);db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES ('admin','admin',?,'2099-01-01')").run(createHash('sha256').update('admin').digest('hex'));});
afterEach(()=>{db.close();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('converts Buenos Aires explicitly and rejects invalid dates',()=>{expect(promiedosKickoff('10-10-2026 15:45')).toBe('2026-10-10T18:45:00.000Z');expect(()=>promiedosKickoff('31-02-2026 15:45')).toThrow();});
it('search parses all games, opaque IDs, logos and range',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json({leagues:[{id:'league',name:'Liga',games:[game(),game({id:'xyz'})]}]})));expect(await searchPromiedosFixtures('2026-10-10')).toHaveLength(2);const r=await handleAdminRounds(req('fixtures?from=2026-10-10&to=2026-10-16'),env());expect(r?.status).toBe(200);expect(await r!.json()).toMatchObject({requestCount:7,fixtures:[{provider:'promiedos',providerFixtureId:'abc',home:{logoUrl:'https://api.promiedos.com.ar/images/team/home/1'}},{}]});expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/games/10-10-2026');});
it('normal, extra time, penalties and extra + penalties keep regulation separate',()=>{
 expect(normalizePromiedosResult(game())).toMatchObject({status:'FT',regulation:[2,1],current:[2,1],winner:'home',final:true});
 const et=game({scores:[1,0],status:{enum:3,name:'En Tiempo Extra'},events:[{name:'Fin de los 90 minutos',scores:[0,0]},{name:'Suplementario',scores:[1,0]}]});expect(normalizePromiedosResult(et)).toMatchObject({status:'AET',regulation:[0,0],current:[1,0],wentToExtra:true});
 const pen=game({scores:[1,1],penalties:[1,3],winner:2,to_qualify:2,events:[{name:'Fin de los 90 minutos',scores:[1,1]},{name:'Penales',scores:[1,3],is_penalties_stage:true}]});expect(normalizePromiedosResult(pen)).toMatchObject({status:'PEN',regulation:[1,1],winner:'away',qualified:'away',wentToPenalties:true,wentToExtra:false});
 expect(normalizePromiedosResult({...pen,events:[...pen.events!,{name:'Suplementario',scores:[1,1]}]}).wentToExtra).toBe(true);
});
it('live normal is provisional, live extra requires explicit regulation',()=>{expect(normalizePromiedosResult(game({status:{enum:2,name:'2do Tiempo'},events:[]}))).toMatchObject({status:'LIVE',final:false,current:[2,1],regulation:null});expect(()=>normalizePromiedosResult(game({status:{enum:2,name:'Tiempo Extra'},events:[]}))).toThrow();});
it.each([{events:[]},{scores:[9,7]},{winner:2},{status:{enum:4,name:'Suspendido'}}])('rejects ambiguous result %j without writing',async changes=>{insert();db.exec("UPDATE matches SET status='FT',home_score_regulation=2,away_score_regulation=1,home_score_current=2,away_score_current=1,result_finalized_at='2026-10-10'");const before=db.prepare('SELECT * FROM matches').get();respond(game(changes as any));const result=await syncRoundResults(1,env());expect(result.updated).toBe(0);expect(result.warnings).toHaveLength(1);expect(db.prepare('SELECT * FROM matches').get()).toEqual(before);});
it('adds provider from verified game rather than trusting supplied names',async()=>{respond();const r=await handleAdminRounds(new Request('https://local/api/admin/rounds/1/matches',{method:'POST',headers:{cookie:'prode_session=admin'},body:JSON.stringify({fixture:{provider:'promiedos',providerFixtureId:'abc',home:{name:'Fake'},away:{name:'Fake'},kickoffAt:'2026-10-10'},matchType:'NORMAL'})}),env());expect(r?.status).toBe(201);expect(db.prepare('SELECT provider,home_team_name,kickoff_at FROM matches').get()).toMatchObject({provider:'promiedos',home_team_name:'Local',kickoff_at:'2026-10-10T18:45:00.000Z'});});
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
it('cron skips future/finalized and uses only eligible opaque IDs without API key',async()=>{insert();db.exec("UPDATE rounds SET status='open'; UPDATE matches SET kickoff_at=datetime('now','-30 minutes')");respond(game({status:{enum:2,name:'En juego'},events:[]}));await syncEligibleRounds({DB:env().DB});expect(fetch).toHaveBeenCalledTimes(1);expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/gamecenter/abc');});
it('wrong identity is rejected',async()=>{respond(game({id:'other'}));await expect(getPromiedosGame('abc')).rejects.toThrow();});
it('discovers a published version once and caches it after an invalid payload',async()=>{
 vi.resetModules();const client=await import('../worker/promiedos');
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
 vi.resetModules();const client=await import('../worker/promiedos');
 const mocked=vi.fn().mockResolvedValueOnce(Response.json({}))
  .mockResolvedValueOnce(new Response('<script src="/_next/static/chunks/pages/_app-abc123.js"></script>'))
  .mockResolvedValueOnce(new Response('"X-VER":"1.11.8.0"'))
  .mockResolvedValueOnce(Response.json({}));vi.stubGlobal('fetch',mocked);
 await expect(client.getPromiedosGame('abc')).rejects.toThrow();expect(mocked).toHaveBeenCalledTimes(4);
 mocked.mockReset().mockResolvedValue(new Response('',{status:403}));
 await expect(client.getPromiedosGame('abc')).rejects.toThrow('HTTP 403');expect(mocked).toHaveBeenCalledTimes(1);
});
