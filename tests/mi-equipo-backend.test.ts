import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {describe,it,expect,afterEach} from 'vitest';
import {handleTeamPage} from '../worker/team-page';
import type {Env} from '../worker/index';

describe('Solo Admin cambia nombre y escudo',()=>{
 let db:DatabaseSync;
 function env(){
  return {DB:{prepare(sql:string){let args:any[]=[];return {bind(...v:any[]){args=v;return this;},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:r.changes}};}};},
   async batch(statements:any[]){db.exec('BEGIN');try{for(const s of statements)await s.run();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}} as unknown as D1Database} as Env;
 }
 const request=(path:string,token:string,method='GET',body?:unknown)=>new Request('https://tafa.test/api/'+path,{method,headers:{cookie:'prode_session='+token,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
 afterEach(()=>{db?.close();});
 it('allows any signed in participant to view, and only admin to edit an audited team',async()=>{
  db=new DatabaseSync(':memory:');
  for(const file of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+file,'utf-8'));
  db.exec("INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES ('A','Ana','A','hash','participant'),('B','Beto','B','hash','participant'),('admin','Admin','admin','hash','admin')");
  for(const token of ['A','B','admin'])db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,'2099-01-01')").run(token,token,createHash('sha256').update(token).digest('hex'));
  const get=await handleTeamPage(request('participant/teams/A','B'),env());
  expect(get?.status).toBe(200);
  const data=await get!.json() as TeamPageData;
  expect(data.identity.teamName).toBe('Equipo de Ana');
  expect(data.encounters).toHaveLength(0);
  expect(data.rankings.general.current).toBeNull();
  expect((await handleTeamPage(request('admin/teams/A','A','PUT',{teamName:'Los Biscochotes'}),env()))?.status).toBe(403);
  expect((await handleTeamPage(request('admin/teams/A','admin','PUT',{teamName:'Los Biscochotes',shieldUrl:'https://bad.example/crest.svg'}),env()))?.status).toBe(400);
  expect((await handleTeamPage(request('admin/teams/A','admin','PUT',{teamName:'Los Biscochotes',shieldUrl:'/teams/biscochotes.png'}),env()))?.status).toBe(200);
  const modified=await (await handleTeamPage(request('participant/teams/A','B'),env()))!.json() as TeamPageData;
  expect(modified.identity).toMatchObject({teamName:'Los Biscochotes',shieldUrl:'/teams/biscochotes.png'});
  expect((db.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action='team.identity_updated'").get() as any).count).toBe(1);
 });
});