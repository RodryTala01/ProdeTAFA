import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {beforeEach,afterEach,it,expect} from 'vitest';
import {handleCompetitionEngine} from '../worker/competitions';
let db:DatabaseSync;
function env(){return {DB:{prepare(sql:string){if(/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql))throw Error('Read model attempted a write');let args:any[]=[];return {bind(...v:any[]){args=v;return this;},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};}};}} as unknown as D1Database};}
async function request(query='',user='p',method='GET'){return (await handleCompetitionEngine(new Request('http://local/api/competition-engine/overview'+query,{method,headers:user?{cookie:`prode_session=${user}`}:{}}),env()))!;}
beforeEach(()=>{db=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+f,'utf8'));for(const user of ['p','admin']){db.prepare('INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES (?,?,?,?,?)').run(user,user,user,'private hash',user==='admin'?'admin':'participant');db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,'2099-01-01')").run(user,user,createHash('sha256').update(user).digest('hex'));}});
afterEach(()=>db.close());
it('requires participant session and GET',async()=>{expect((await request('','')).status).toBe(401);expect((await request('','admin')).status).toBe(403);expect((await request('','p','POST')).status).toBe(405);});
it('handles empty season without writes',async()=>{expect(await (await request()).json()).toEqual({currentUserId:'p',editions:[],season:null});});
it('exposes all competitions, public history and historical membership without private data or writes',async()=>{
 db.exec("INSERT INTO tafa_seasons(id,season_number,name,status) VALUES (1,32,'T32','active'),(2,31,'T31','finished'),(3,33,'T33','draft'); INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES (1,1,'COPA_A','Copa A','Copa A','CUP'),(2,1,'COPA_B','Copa B','Copa B','CUP'),(3,2,'COPA_A','Copa A','Copa A','CUP'); INSERT INTO rounds(id,name) VALUES(10,'Anterior'),(20,'Actual'); INSERT INTO competition_entries(id,competition_id,display_name) VALUES(1,1,'Participante'),(3,3,'Campeón anterior'); INSERT INTO competition_entry_members(entry_id,user_id,valid_to_round_id) VALUES(1,'p',20); INSERT INTO competition_results(competition_id,entry_id,result_code,final_position,confirmed_by_user_id) VALUES(3,3,'CHAMPION',1,'admin');");
 const response=await request();expect(response.status).toBe(200);const data=await response.json() as any;
 expect(data.season.competitions).toHaveLength(2);expect(data.season.members[0].validTo).toBe(20);expect(data.season.history[0].name).toBe('Campeón anterior');expect(JSON.stringify(data)).not.toMatch(/phone|password|private hash/);
 expect((await (await request('?season=31')).json() as any).season.seasonNumber).toBe(31);expect((await (await request('?season=33')).json() as any).season).toBeNull();
});


it('uses actual historical duo members instead of a generated team name',async()=>{db.exec("INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(1,32,'T32','active'); INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(1,1,'COPA_DUOS','Dúos','Dúos','CUP'); INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES(1,1,'DUO','Equipo inventado'); INSERT INTO competition_entry_members(entry_id,user_id) VALUES(1,'p'),(1,'admin'); INSERT INTO competition_results(competition_id,entry_id,result_code,final_position,confirmed_by_user_id) VALUES(1,1,'CHAMPION',1,'admin');");const data=await(await request()).json() as any;expect(data.season.history[0].name).toBe('p + admin');});
