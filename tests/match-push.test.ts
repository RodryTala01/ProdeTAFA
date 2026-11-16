import {DatabaseSync} from 'node:sqlite';
import {describe,it,expect} from 'vitest';
import {sendMatchPushNotifications,reminderForMatch,finalForMatch,type MatchPushNotice,type MatchPushSubscription} from '../worker/match-push';

function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`
 CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT,is_active INTEGER);
 CREATE TABLE rounds(id INTEGER PRIMARY KEY,status TEXT);
 CREATE TABLE matches(id INTEGER PRIMARY KEY,round_id INTEGER,home_team_name TEXT,away_team_name TEXT,kickoff_at TEXT,status TEXT,is_void INTEGER,result_finalized_at TEXT);
 CREATE TABLE predictions(id INTEGER PRIMARY KEY,user_id TEXT,match_id INTEGER,predicted_home_score INTEGER);
 CREATE TABLE official_predictions(id INTEGER PRIMARY KEY,user_id TEXT,match_id INTEGER);
 CREATE TABLE prediction_scores(prediction_id INTEGER PRIMARY KEY,total_points INTEGER,is_provisional INTEGER,calculated_at TEXT);
 CREATE TABLE push_subscriptions(id INTEGER PRIMARY KEY,user_id TEXT,endpoint TEXT,p256dh TEXT,auth TEXT);
 CREATE TABLE push_deliveries(id INTEGER PRIMARY KEY,subscription_id INTEGER,event_key TEXT,status TEXT,attempts INTEGER,attempted_at TEXT,UNIQUE(subscription_id,event_key));
 `);
 db.exec("INSERT INTO users VALUES ('A','participant',1),('B','participant',1),('C','participant',1),('D','participant',0)");
 db.exec("INSERT INTO rounds VALUES (1,'open'),(2,'finished')");
 const now=Date.now();
 const stamp=(minutes:number)=>new Date(now+minutes*60_000).toISOString();
 const insert=db.prepare("INSERT INTO matches VALUES (?,1,?,?,?,? ,0,?)");
 insert.run(1,'Arsenal','Chelsea',stamp(-720),'FT',stamp(-600));
 insert.run(2,'Bayer','Borussia',stamp(-125),'FT',stamp(-4));
 insert.run(3,'Valencia','Real Madrid',stamp(-120),'FT',stamp(-110));
 insert.run(4,'Boca','River',stamp(60),'NS',null);
 insert.run(5,'Palmeiras','Flamengo',stamp(120),'NS',null);
 insert.run(6,'Estudiantes','Racing',stamp(60),'1H',null);
 insert.run(7,'Tarde','Mañana',stamp(60),'NS',null);
 db.prepare('UPDATE matches SET round_id=2 WHERE id=7').run();
 const sub=db.prepare("INSERT INTO push_subscriptions VALUES (?,?,?,?,?)");
 for(const [i,u] of [[10,'A'],[11,'B'],[12,'C'],[13,'D'],[14,'A']] as const)sub.run(i,u,'https://fcm.googleapis.com/test/'+i,'key','key');
 // A has officially submitted the fourth match; B has only saved a DRAFT.
 db.exec("INSERT INTO predictions VALUES(100,'A',4,2),(101,'B',4,1),(102,'A',2,3),(103,'C',2,1)");
 db.exec("INSERT INTO official_predictions VALUES(100,'A',4),(102,'A',2),(103,'C',2)");
 db.exec("INSERT INTO prediction_scores VALUES (102,3,0,datetime('now')),(103,1,1,datetime('now'))");
 const D1={prepare(sql:string){let args:unknown[]=[];return {bind(...v:unknown[]){args=v;return this;},async all<T>(){return {results:db.prepare(sql).all(...args) as T[]}}};}} as unknown as D1Database;
 const sent:Array<{user:string;message:MatchPushNotice;key:string;ttl:number|undefined;subscription:number}>=[];
 const delivery=async(s:MatchPushSubscription,message:MatchPushNotice,key:string,ttl?:number)=>{
  const created=db.prepare("INSERT OR IGNORE INTO push_deliveries(subscription_id,event_key,status,attempts,attempted_at) VALUES (?,?,'sent',1,datetime('now'))").run(s.id,key);
  if(created.changes===0)return false;
  sent.push({user:s.user_id,message,key,ttl,subscription:s.id});
  return true;
 };
 return {db,D1,sent,delivery};
}
describe('Notificaciones automáticas por partido',()=>{
 it('construye textos personalizados y diferencia 0, 1 y 3 puntos',()=>{
  expect(reminderForMatch('Boca','River',3).body).toContain('todavía no enviaste tu pronóstico');
  expect(finalForMatch('Bayer','Borussia',2,3,true)).toMatchObject({title:'Terminó Bayer - Borussia',body:'Sumaste 3 puntos en este partido.'});
  expect(finalForMatch('Bayer','Borussia',2,1,true).body).toBe('Sumaste 1 punto en este partido.');
  expect(finalForMatch('Bayer','Borussia',2,0,false).body).toContain('0 puntos');
 });
 it('avisa una hora antes del cuarto partido aunque los anteriores hayan terminado, pero no al que ya lo envió',async()=>{
  const f=fixture();
  try{
   const report=await sendMatchPushNotifications(f.D1,f.delivery);
   expect(report.reminders).toBe(2);
   expect(f.sent.filter(x=>x.key==='match:4:reminder-1h').map(x=>x.user).sort()).toEqual(['B','C']);
   expect(f.sent.some(x=>x.key==='match:5:reminder-1h')).toBe(false);
   expect(f.sent.some(x=>x.key==='match:6:reminder-1h')).toBe(false);
   expect(f.sent.some(x=>x.key==='match:7:reminder-1h')).toBe(false);
   expect(f.sent.filter(x=>x.key==='match:4:reminder-1h').every(x=>x.ttl===3300)).toBe(true);
   // User B eventually submits after the reminder: the next cron must skip them.
   f.db.exec("INSERT INTO official_predictions VALUES(101,'B',4)");
   f.sent.length=0;
   await sendMatchPushNotifications(f.D1,f.delivery);
   expect(f.sent.filter(x=>x.key==='match:4:reminder-1h')).toHaveLength(0); // Duplicate event blocked.
  }finally{f.db.close();}
 });
 it('emite puntos por usuario solo después de finalizar y calcular un puntaje definitivo; sin envío son cero',async()=>{
  const f=fixture();
  try{
   await sendMatchPushNotifications(f.D1,f.delivery);
   const notices=f.sent.filter(x=>x.key==='match:2:final');
   expect(notices).toHaveLength(3); // A has two devices, B has no prediction.
   expect(notices.filter(x=>x.user==='A').map(x=>x.message.body)).toEqual([
    'Sumaste 3 puntos en este partido.','Sumaste 3 puntos en este partido.']);
   expect(notices.find(x=>x.user==='B')?.message.body).toContain('No enviaste pronóstico');
   expect(notices.some(x=>x.user==='C')).toBe(false); // Provisional score is not final.
   expect(f.sent.some(x=>x.key==='match:1:final')).toBe(false); // Beyond six hours.
   f.db.exec("UPDATE prediction_scores SET is_provisional=0,calculated_at=datetime('now') WHERE prediction_id=103");
   f.sent.length=0;
   await sendMatchPushNotifications(f.D1,f.delivery);
   expect(f.sent.filter(x=>x.key==='match:2:final').find(x=>x.user==='C')?.message.body).toBe('Sumaste 1 punto en este partido.');
  }finally{f.db.close();}
 });
 it('no avisa un resultado antes de que el score final esté calculado',async()=>{
  const f=fixture();
  try{
   f.db.exec("DELETE FROM prediction_scores WHERE prediction_id=102");
   await sendMatchPushNotifications(f.D1,f.delivery);
   expect(f.sent.filter(x=>x.key==='match:2:final').some(x=>x.user==='A')).toBe(false);
   f.db.exec("INSERT INTO prediction_scores VALUES(102,0,0,datetime('now'))");
   f.sent.length=0;
   await sendMatchPushNotifications(f.D1,f.delivery);
   expect(f.sent.filter(x=>x.key==='match:2:final').find(x=>x.user==='A')?.message.body).toBe('Sumaste 0 puntos en este partido.');
  }finally{f.db.close();}
 });
});

it('recupera un aviso final pendiente si el intento anterior quedó interrumpido',async()=>{
 const f=fixture();
 try{
  f.db.exec("INSERT INTO push_deliveries(subscription_id,event_key,status,attempts,attempted_at) SELECT id,'match:2:final','pending',1,datetime('now','-20 minutes') FROM push_subscriptions WHERE user_id='A'");
  f.db.exec("INSERT INTO push_deliveries(subscription_id,event_key,status,attempts,attempted_at) SELECT id,'match:2:final','pending',1,datetime('now') FROM push_subscriptions WHERE user_id='B'");
  const selected:string[]=[];
  await sendMatchPushNotifications(f.D1,async(s,_notice,key)=>{
   if(key==='match:2:final')selected.push(s.user_id);
   return true;
  });
  expect(selected).toEqual(['A','A']);
 }finally{f.db.close();}
});
