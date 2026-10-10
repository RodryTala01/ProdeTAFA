import {afterEach,expect,it,vi} from 'vitest';
import {syncRoundResults,syncEligibleRounds} from '../worker/results';
import {footballFixtures} from '../worker/football-api';
import {safeAdminError} from '../src/safe-admin-error';
const matches=(n=12)=>Array.from({length:n},(_,i)=>({id:i+1,provider_fixture_id:String(i+100),kickoff_at:'2026-10-08T15:00:00Z',status:'NS',result_finalized_at:null}));
function env(n=12){return {FOOTBALL_API_KEY:'test-secret',DB:{prepare(sql:string){return {bind(){return this;},async first(){return {id:'a',role:'admin',is_active:1};},async all(){return {results:sql.includes('SELECT round_id')?[{round_id:1,kickoff_at:'2026-10-08T15:00:00Z'}]:sql.includes('SELECT id, provider_fixture_id')?matches(n):[]};},async run(){return {success:true};}};}} as unknown as D1Database};}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function upstream(){return vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({errors:[],response:[]}))));}
it('Free sync keeps one request per distinct day and cron relevant dates',async()=>{
 upstream();expect((await syncRoundResults(1,env())).requestCount).toBe(1);
 const params=new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams;
 expect(params.get('date')).toBe('2026-10-08');expect(params.has('ids')).toBe(false);
 vi.mocked(fetch).mockClear();await syncEligibleRounds(env());expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([200,429,499,500])('preserves upstream status %s and errors without leaking key',async status=>{
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({errors:{plan:'Free plans do not have access to the Ids parameter. test-secret'},response:[]}),{status})));
 await expect(footballFixtures({ids:'100'},'test-secret')).rejects.toThrow(`HTTP ${status}`);
 try{await footballFixtures({ids:'100'},'test-secret');}catch(e){expect(String(e)).toContain('Free plans');expect(String(e)).not.toContain('test-secret');}
 expect(JSON.stringify(log.mock.calls)).not.toContain('test-secret');
});
it('admin preserves usable errors and hides SQL, stack traces and empty errors',()=>{
 expect(safeAdminError('API-Football: Free plans do not have access to this date.')).toContain('Free plans');
 for(const value of ['',null,{},'D1_ERROR: SELECT secret FROM users','Error\n at read (worker.js:12:4)','api_key=secret'])expect(safeAdminError(value)).toContain('No pudimos');
});
