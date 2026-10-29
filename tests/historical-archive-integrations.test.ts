import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {it,expect} from 'vitest';
import {handleHistoricalArchive} from '../worker/historical-archive';
import {handleTeamPage} from '../worker/team-page';
import {handleHistory} from '../worker/history';
import {handleIffhs} from '../worker/iffhs';
import type {Env} from '../worker/index';

it('T1 importada alimenta Mi Club, ranking general, IFFHS y cruces; al revertir desaparece sin tocar el motor oficial',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  for(const name of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+name,'utf8'));
  db.exec("INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES('A','Ana','111','hash','participant'),('B','Beto','222','hash','participant'),('admin','Admin','333','hash','admin')");
  for(const token of ['A','B','admin'])db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,'2099-01-01')").run(token,token,createHash('sha256').update(token).digest('hex'));
  const env={DB:{prepare(sql:string){let args:any[]=[];return {bind(...v:any[]){args=v;return this},async first<T>(){return (db.prepare(sql).get(...args)??null) as T|null},async all<T>(){return {results:db.prepare(sql).all(...args) as T[]}},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}}},async batch(statements:any[]){db.exec('BEGIN');try{for(const st of statements)await st.run();db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}} as unknown as D1Database} as Env;
  const req=(path:string,token='admin',method='GET',data?:unknown)=>new Request('https://tafa.test/api/'+path,{method,headers:{cookie:'prode_session='+token,'content-type':'application/json'},body:data?JSON.stringify(data):undefined});
  const payload={version:1,season:{number:1,name:'T1',kind:'LIGA',notes:'Solo Liga A'},
   participants:[{key:'ANA',name:'Ana histórica',userId:'A',division:'A'},{key:'BETO',name:'Beto',userId:'B',division:'A'}],
   competitions:[{code:'LIGA_A',name:'Liga A',kind:'LEAGUE'}],
   statistics:[{participantKey:'ANA',points:52,fulls:14,partials:10,errors:4,extras:0,dates:5,predictions:60},{participantKey:'BETO',points:45,fulls:10,partials:15,errors:5,extras:0,dates:5,predictions:60}],
   standings:[{competitionCode:'LIGA_A',participantKey:'ANA',position:1,points:52,fulls:14,partials:10,errors:4,extras:0},{competitionCode:'LIGA_A',participantKey:'BETO',position:2,points:45,fulls:10,partials:15,errors:5,extras:0}],
   rounds:[],results:[{competitionCode:'LIGA_A',participantKey:'ANA',position:1,resultCode:'CHAMPION',teamLabel:''}],
   matches:[{competitionCode:'LIGA_A',stage:'Final',round:'Fecha 5',aKey:'ANA',bKey:'BETO',pointsA:17,pointsB:13,plenosA:4,plenosB:3,scoreBasis:'INDIVIDUAL'}],
   movements:[{participantKey:'BETO',type:'DESCENSO',fromDivision:'A',toDivision:'B',detail:'Último puesto'}],
   iffhs:[{participantKey:'ANA',points:120.5,position:1},{participantKey:'BETO',points:91,position:2}],
  };
  const preview=await (await handleHistoricalArchive(req('admin/historical-imports/preview','admin','POST',{data:payload}),env))!.json() as {ok:boolean;sha256:string};
  expect(preview.ok).toBe(true);
  const save=await handleHistoricalArchive(req('admin/historical-imports','admin','POST',{data:payload,sha256:preview.sha256,sourceName:'T1.xlsx'}),env);
  expect(save?.status).toBe(201);
  const id=(await save!.json() as {id:number}).id;
  const club=await (await handleTeamPage(req('participant/teams/A','A'),env))!.json() as {
   stats:{points:number;fulls:number};titles:Array<{code:string}>;encounters:Array<{rivalPoints:number;opponentId:string}>;rankings:{general:{current:number};iffhs:{current:number}};
   historicalSeasons:Array<{seasonNumber:number}>;identity:{foundedSeason:number}};
  expect(club.stats).toMatchObject({points:52,fulls:14});
  expect(club.titles).toMatchObject([{code:'LIGA_A'}]);
  expect(club.encounters).toMatchObject([{rivalPoints:13,opponentId:'B'}]);
  expect(club.rankings.general.current).toBe(1);
  expect(club.rankings.iffhs.current).toBe(1);
  expect(club.identity.foundedSeason).toBe(1);
  expect(club.historicalSeasons[0].seasonNumber).toBe(1);
  const all=(await (await handleHistory(req('participant/history-ranking','A'),env))!.json() as {standings:Array<{userId:string;points:number}>}).standings;
  expect(all).toMatchObject([{userId:'A',points:52},{userId:'B',points:45}]);
  const iff=(await (await handleIffhs(req('competition-engine/iffhs/ranking?throughSeason=1','A'),env))!.json() as {ranking:Array<{userId:string;totalPoints:number}>}).ranking;
  expect(iff[0]).toMatchObject({userId:'A',totalPoints:120.5});
  const reversed=await handleHistoricalArchive(req('admin/historical-imports/'+id+'/revert','admin','POST',{seasonNumber:1,sha256:preview.sha256,reason:'Corregir la tabla T1'}),env);
  expect(reversed?.status).toBe(200);
  const clubAfter=await (await handleTeamPage(req('participant/teams/A','A'),env))!.json() as {stats:{points:number};titles:unknown[];encounters:unknown[]};
  expect(clubAfter.stats.points).toBe(0);
  expect(clubAfter.titles).toHaveLength(0);
  expect(clubAfter.encounters).toHaveLength(0);
 }finally{db.close();}
});
