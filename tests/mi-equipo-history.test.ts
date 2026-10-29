import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {beforeEach,afterEach,expect,it} from 'vitest';
import {handleTeamPage} from '../worker/team-page';
import type {Env} from '../worker/index';
let db:DatabaseSync;
function env(){return {DB:{prepare(sql:string){let args:any[]=[];return {bind(...values:any[]){args=values;return this;},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};},async batch(statements:any[]){db.exec('BEGIN');try{for(const s of statements)await s.run();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}} as unknown as D1Database} as Env;}
const read=async(id='A')=>await (await handleTeamPage(new Request('https://local/api/participant/teams/'+id,{headers:{cookie:'prode_session=B'}}),env()))!.json() as any;
beforeEach(()=>{
 db=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+f,'utf8'));
 for(const id of ['A','B','C','D','E'])db.prepare("INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES (?,?,?,'hash','participant')").run(id,id,id);
 db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES ('b','B',?,'2099-01-01')").run(createHash('sha256').update('B').digest('hex'));
 db.exec(`INSERT INTO rounds(id,name,status) VALUES (1,'Fecha real','open'),(2,'Segunda','draft'),(3,'Tercera','draft');
 INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_name,away_team_name,kickoff_at) VALUES (1,1,'manual','1','Local','Visita','2098-01-01'),(2,1,'manual','2','Local','Visita','2098-01-01');
 INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(1,32,'T32','active');
 INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES (1,1,'COPA_A','Copa A','Copa A','CUP'),(2,1,'COPA_TOTAL','Copa Total','Copa Total','CUP'),(3,1,'COPA_DUOS','Copa Duos','Copa Duos','CUP');
 INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES (1,1,'QF','Cuartos','KNOCKOUT',1),(2,2,'SF','Semifinal','KNOCKOUT',1),(3,3,'SF','Semifinal','KNOCKOUT',1),(4,3,'FINAL','Final','KNOCKOUT',2);
 INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES (1,1,1,1,1),(2,2,2,1,1),(3,3,3,1,1),(4,3,4,2,1);
 INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES(10,1,'INDIVIDUAL','A'),(20,1,'INDIVIDUAL','B'),(11,2,'INDIVIDUAL','A'),(21,2,'INDIVIDUAL','B'),(30,3,'DUO','Actual'),(40,3,'DUO','Rivales');
 INSERT INTO competition_entry_members(entry_id,user_id,valid_to_round_id) VALUES(10,'A',3);
 INSERT INTO competition_entry_members(entry_id,user_id,valid_from_round_id) VALUES(10,'A',3);
 INSERT INTO competition_entry_members(entry_id,user_id) VALUES(20,'B'),(11,'A'),(21,'B'),(30,'C'),(40,'B'),(40,'E');
 INSERT INTO competition_entry_members(entry_id,user_id,valid_to_round_id) VALUES(30,'A',2);
 INSERT INTO competition_entry_members(entry_id,user_id,valid_from_round_id) VALUES(30,'D',2);
 INSERT INTO competition_encounters(id,stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,score_a,score_b,status,winner_entry_id,resolution,admin_confirmed_at)
 VALUES(1,1,1,'QF',10,20,3,4,'finished',20,'tiebreak',datetime('now')),
 (2,3,3,'SF',30,40,10,20,'finished',40,'normal',datetime('now')),
 (3,4,4,'FINAL',30,40,30,20,'finished',30,'normal',datetime('now'));
 INSERT INTO team_profiles(user_id,team_name,shield_url) VALUES('B','Equipo Rival','/teams/rival.png');`);
 for(const user of ['A','B']){
  for(const match of [1,2])db.prepare('INSERT INTO predictions(user_id,match_id,predicted_home_score,predicted_away_score) VALUES(?,?,1,0)').run(user,match);
  db.prepare("INSERT INTO round_submissions(round_id,user_id,first_submitted_at,last_submitted_at) VALUES(1,?,datetime('now'),datetime('now'))").run(user);
 }
 for(const user of ['A','B'])for(const match of [1,2]){
  const points=user==='A'?(match===1?3:0):(match===1?1:3);
  const op=db.prepare('SELECT id FROM official_predictions WHERE user_id=? AND match_id=?').get(user,match) as any;
  db.prepare("INSERT INTO prediction_scores(prediction_id,base_points,extra_points,total_points,result_type,is_provisional,calculated_at) VALUES(?,?,0,?,?,0,datetime('now'))").run(op.id,points,points,points===3?'FULL':points===1?'PARTIAL':'ERROR');
 }
 db.exec("UPDATE rounds SET status='finished' WHERE id=1");
});
afterEach(()=>db.close());
it('shared round links and memberships do not multiply stats or encounters; rivals use their team identity',async()=>{
 const data=await read();expect(data.stats).toMatchObject({points:3,fulls:1,partials:0,errors:1,predictions:2,dates:1});
 expect(data.rankings.general.current).toBe(2);
 expect(data.encounters.filter((m:any)=>m.id===1)).toHaveLength(1);
 expect(data.encounters.find((m:any)=>m.id===1)).toMatchObject({opponentName:'Equipo Rival',opponentParticipantName:'B',opponentShieldUrl:'/teams/rival.png',resolution:'tiebreak',plenos:1});
 expect(JSON.stringify(data)).not.toMatch(/phone_normalized|password_hash|token_hash/);
});
it('segment plenos count only the segment and unknown scoring stays null',async()=>{
 db.exec(`INSERT INTO competition_round_segments(id,round_link_id,code,name,sequence) VALUES(1,2,'MINI','Mini',1);
 INSERT INTO competition_round_segment_matches(segment_id,match_id,sequence) VALUES(1,2,1);
 INSERT INTO competition_encounters(id,stage_id,round_link_id,segment_id,slot_key,entry_a_id,entry_b_id,score_a,score_b,status,admin_confirmed_at)
 VALUES(4,2,2,1,'mini',11,21,0,3,'finished',datetime('now'));`);
 expect((await read()).encounters.find((m:any)=>m.id===4).plenos).toBe(0);
 db.exec('DELETE FROM prediction_scores');
 const data=await read();expect(data.encounters.find((m:any)=>m.id===4).plenos).toBeNull();expect(data.stats.predictions).toBe(2);
});
it('duos respect substitutions historically and do not award the championship to an ex member',async()=>{
 db.exec("INSERT INTO competition_results(competition_id,entry_id,stage_id,result_code,detail_json) VALUES(3,30,4,'CHAMPION','{\"iffhsUserIds\":[\"C\",\"D\"]}')");
 const old=await read('A'),replacement=await read('D'),partner=await read('C');
 expect(old.encounters.filter((m:any)=>m.competitionCode==='COPA_DUOS').map((m:any)=>m.id)).toEqual([2,2]);
 expect(replacement.encounters.map((m:any)=>m.id)).toEqual([3,3]);
 expect(old.titles).toHaveLength(0);expect(replacement.titles).toHaveLength(1);expect(partner.titles).toHaveLength(1);
});
it('excludes unconfirmed, byes and duos without a historical round; handles multi-season history',async()=>{
 db.exec(`INSERT INTO competition_encounters(stage_id,slot_key,entry_a_id,entry_b_id,score_a,score_b,status) VALUES(1,'unconfirmed',10,20,1,0,'finished');
 INSERT INTO competition_encounters(stage_id,slot_key,entry_a_id,score_a,score_b,status,admin_confirmed_at) VALUES(1,'bye',10,1,0,'finished',datetime('now'));
 INSERT INTO competition_encounters(stage_id,slot_key,entry_a_id,entry_b_id,score_a,score_b,status,admin_confirmed_at) VALUES(3,'no-round',30,40,1,0,'finished',datetime('now'));
 INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(2,31,'T31','finished');
 INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(4,2,'COPA_PAPA','Copa Papa','Copa Papa','CUP');
 INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES(5,4,'FINAL','Final','KNOCKOUT',1);
 INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES(50,4,'INDIVIDUAL','A'),(60,4,'INDIVIDUAL','B');
 INSERT INTO competition_entry_members(entry_id,user_id) VALUES(50,'A'),(60,'B');
 INSERT INTO competition_encounters(id,stage_id,slot_key,entry_a_id,entry_b_id,score_a,score_b,status,admin_confirmed_at) VALUES(7,5,'final',50,60,1,0,'finished',datetime('now'));`);
 const data=await read();expect(data.encounters).toHaveLength(4);expect(data.encounters.find((m:any)=>m.id===7).seasonNumber).toBe(31);
});
it('0016 is additive and leaves existing sporting schema/data untouched',()=>{
 const before=new DatabaseSync(':memory:');try{
  for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')&&f<'0016').sort())before.exec(readFileSync('migrations/'+f,'utf8'));
  before.exec("INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES('old','Old','old','hash','participant')");
  const schema=before.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  before.exec(readFileSync('migrations/0016_team_profiles.sql','utf8'));
  expect(before.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name<>'team_profiles' ORDER BY name").all()).toEqual(schema);
  expect(before.prepare('SELECT full_name FROM users').get()?.full_name).toBe('Old');expect(before.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
 }finally{before.close();}
});
