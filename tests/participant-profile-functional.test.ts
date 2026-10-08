import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {beforeEach,afterEach,it,expect} from 'vitest';
import {handleHistory} from '../worker/history';
import {handleRanking} from '../worker/ranking';
let db:DatabaseSync;
function env(){return {DB:{prepare(sql:string){if(/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql))throw Error('Unexpected write');let args:any[]=[];return {bind(...v:any[]){args=v;return this;},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};}};}} as unknown as D1Database};}
function req(path:string,token='p',method='GET'){return new Request('http://local/api/participant/'+path,{method,headers:token?{cookie:`prode_session=${token}`}:{}});}
beforeEach(()=>{
 db=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+f,'utf8'));
 for(const id of ['p','other','admin']){db.prepare('INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES (?,?,?,?,?)').run(id,id,'private-phone-'+id,'private-hash',id==='admin'?'admin':'participant');db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,'2099-01-01')").run(id,id,createHash('sha256').update(id).digest('hex'));}
 db.exec("INSERT INTO rounds(id,name,status) VALUES(1,'Finalizada','draft'),(2,'Abierta','draft'),(3,'Borrador','draft'); INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_name,away_team_name,home_team_provider_id,away_team_provider_id,kickoff_at,match_type,home_score_regulation,away_score_regulation,went_to_penalties,winning_team_provider_id) VALUES(1,1,'local','1','Local','Visitante','h','a','2099-01-01','PENALTIES_ONLY',1,1,1,'h'); UPDATE rounds SET status='open' WHERE id=1; INSERT INTO predictions(id,user_id,match_id,predicted_home_score,predicted_away_score,predicted_extra_team_provider_id) VALUES(1,'other',1,1,1,'h'); INSERT INTO round_submissions(round_id,user_id,first_submitted_at,last_submitted_at) VALUES(1,'other','2020-01-01','2020-01-01'); UPDATE predictions SET predicted_home_score=9,predicted_away_score=9 WHERE id=1; INSERT INTO prediction_scores(prediction_id,total_points,base_points,extra_points,result_type,is_provisional,calculated_at) VALUES(1,4,3,1,'FULL',0,'2020-01-01'); UPDATE rounds SET status='finished' WHERE id=1; UPDATE rounds SET status='open' WHERE id=2;");
});
afterEach(()=>db.close());
it('requires participant authentication and rejects admin targets and mutations',async()=>{
 expect((await handleHistory(req('profiles/other',''),env()))?.status).toBe(403);
 expect((await handleHistory(req('profiles/other','admin'),env()))?.status).toBe(403);
 expect((await handleHistory(req('profiles/admin'),env()))?.status).toBe(404);
 expect((await handleHistory(req('profiles/other','p','POST'),env()))?.status).toBe(405);
});
it('public profile exposes only name and finalized history, including inactive history',async()=>{
 db.exec("UPDATE users SET is_active=0 WHERE id='other'");
 const r=await handleHistory(req('profiles/other'),env());expect(r?.status).toBe(200);const data=await r!.json() as any;
 expect(data.participant).toEqual({id:'other',fullName:'other'});expect(data.rounds.map((r:any)=>r.id)).toEqual([1]);expect(data.rounds[0]).toMatchObject({points:4,fulls:1,extras:1});expect(JSON.stringify(data)).not.toMatch(/phone|password|private|is_active|role/);
});
it('preserves own history scope even if a user query is supplied',async()=>{
 const r=await handleHistory(req('history?user=other'),env());expect(await r!.json()).toEqual({rounds:[]});
});
it('keeps reveal locked for open and draft rounds',async()=>{
 for(const id of [2,3])expect((await handleRanking(req(`reveal/${id}`),env()))?.status).toBe(403);
});
it('reveals existing official result and score metadata without recalculation or writes',async()=>{
 const r=await handleRanking(req('reveal/1'),env());const data=await r!.json() as any;
 expect(data.matches[0].result).toEqual({home:1,away:1,penalties:true,winnerId:'h',isVoid:false});expect(data.participants[0].predictions[0]).toMatchObject({homeScore:1,awayScore:1,points:4,score:{basePoints:3,extraPoints:1,resultType:'FULL'}});expect(JSON.stringify(data)).not.toMatch(/private|phone|password/);
});
