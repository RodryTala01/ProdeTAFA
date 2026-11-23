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
it('admin draw export reads draft seasons without writes and blocks participant access',async()=>{
 db.exec("INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(1,33,'T33','draft')");
 const url='http://local/api/admin/competition-engine/draw-overview?season=33';
 const call=(user:string)=>handleCompetitionEngine(new Request(url,{headers:user?{cookie:`prode_session=${user}`}:{}}),env());
 expect((await call(''))!.status).toBe(401);
 expect((await call('p'))!.status).toBe(403);
 const response=(await call('admin'))!;expect(response.status).toBe(200);
 expect((await response.json() as any).season.seasonNumber).toBe(33);
});

import {totalGroupStandings,scoreEntrySegment} from '../worker/competition-total-groups';
it('Total exposes planned group fixtures and batches the same segment scores as the existing scorer',async()=>{
 db.exec(`INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(1,32,'T32','active');
 INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(1,1,'COPA_TOTAL','Copa Total','Copa Total','CUP');
 INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES(1,1,'GROUPS','Grupos','ROUND_ROBIN_GROUPS',1);
 INSERT INTO competition_entries(id,competition_id,display_name) VALUES(1,1,'p'),(2,1,'admin');
 INSERT INTO competition_entry_members(entry_id,user_id) VALUES(1,'p'),(2,'admin');
 INSERT INTO competition_groups(id,stage_id,code,name,sequence) VALUES(1,1,'A','Grupo A',1);
 INSERT INTO competition_group_entries(group_id,entry_id,seed_position) VALUES(1,1,1),(1,2,2);
 INSERT INTO competition_encounters(id,stage_id,group_id,slot_key,entry_a_id,entry_b_id) VALUES(1,1,1,'A-M1-1',1,2);`);
 const planned=await(await request()).json() as any;
 expect(planned.season.encounters[0]).toMatchObject({id:1,groupId:1,roundId:null,slot:'A-M1-1'});
 expect((await totalGroupStandings(env() as any,1))?.groups[0].fixtures[0]).toMatchObject({segmentId:null,complete:false});
 db.exec(`INSERT INTO rounds(id,name) VALUES(1,'Fecha Copas');
 INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES(1,1,1,1,1);
 INSERT INTO competition_round_segments(id,round_link_id,code,name,sequence) VALUES(1,1,'F1','F1',1);
 UPDATE competition_encounters SET round_link_id=1,segment_id=1 WHERE id=1;`);
 for(let i=1;i<=4;i++){
  db.prepare("INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_name,away_team_name,kickoff_at,result_finalized_at) VALUES (?,1,'manual',?,'Local','Visitante','2099-01-01','2099-01-01')").run(i,String(i));
  db.prepare('INSERT INTO competition_round_segment_matches(segment_id,match_id,sequence) VALUES(1,?,?)').run(i,i);
  db.prepare('INSERT INTO predictions(id,user_id,match_id,predicted_home_score,predicted_away_score) VALUES(?,?,?,1,0)').run(i,'p',i);
  db.prepare("INSERT INTO official_predictions(id,user_id,match_id,predicted_home_score,predicted_away_score,updated_at,source) VALUES(?,'p',?,1,0,'2099-01-01','submission')").run(i,i);
  db.prepare("INSERT INTO prediction_scores(prediction_id,result_type,base_points,total_points,calculated_at) VALUES(?,'FULL',3,3,'2099-01-01')").run(i);
 }
 const expected=await scoreEntrySegment(env() as any,1,1);
 const groups=await totalGroupStandings(env() as any,1);
 expect(groups!.groups[0].fixtures[0]).toMatchObject({scoreA:expected.points,scoreB:0,complete:expected.complete});
 expect(groups!.groups[0].standings[0]).toMatchObject({entryId:1,points:3,gf:12,gd:12,won:1});
});

import {handleCompetitionDuos} from '../worker/competition-duos';
it('Dúos reads stage elimination defaults without accumulating other Fechas or dropping shields',async()=>{
 db.exec(`INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(1,32,'T32','active');
 INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(1,1,'COPA_DUOS','Dúos','Dúos','CUP');
 INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence,settings_json) VALUES(1,1,'SURVIVAL','Survival','SURVIVAL_TABLE',1,'{"eliminateCount":1}');
 INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES(1,1,'DUO','Dúo 1'),(2,1,'DUO','Dúo 2');
 INSERT INTO competition_entry_members(entry_id,user_id) VALUES(1,'p'),(2,'admin');
 INSERT INTO rounds(id,name) VALUES(1,'Anterior'),(2,'Actual');
 INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES(1,1,1,1,1),(2,1,1,2,2);
 INSERT INTO competition_entry_bonuses(competition_id,stage_id,round_link_id,entry_id,points,reason) VALUES(1,1,1,1,100,'Anterior'),(1,1,2,1,2,'Actual');`);
 const response=await handleCompetitionDuos(new Request('http://local/api/competition-engine/round-links/2/duos/table',{headers:{cookie:'prode_session=p'}}),env() as any);
 const data=await response!.json() as any;
 expect(data.settings.eliminateCount).toBe(1);expect(data.rows[0]).toMatchObject({entryId:1,basePoints:0,bonusPoints:2,totalPoints:2});
 expect(data.rows[0].members[0].userId).toBe('p');
});
