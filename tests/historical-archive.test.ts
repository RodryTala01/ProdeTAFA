import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {beforeEach,afterEach,describe,it,expect} from 'vitest';
import {normalizeArchive,activeHistoricalArchives,historicalStats,handleHistoricalArchive,mergeArchiveBatches,type ArchivePayload} from '../worker/historical-archive';
import type {Env} from '../worker/index';

const source:ArchivePayload={
 version:1,season:{number:1,name:'T1 · Liga A',kind:'LIGA',notes:'Solo se disputó Liga A'},
 participants:[{key:'ANA',name:'Ana histórica',userId:'A',division:'A'},{key:'BETO',name:'Beto',userId:'B',division:'A'}],
 competitions:[{code:'LIGA_A',name:'Liga A',kind:'LEAGUE'}],
 statistics:[{participantKey:'ANA',points:40,fulls:10,partials:10,errors:4,extras:0,dates:2,predictions:24},{participantKey:'BETO',points:35,fulls:9,partials:8,errors:7,extras:0,dates:2,predictions:24}],
 standings:[{competitionCode:'LIGA_A',participantKey:'ANA',position:1,points:40,fulls:10,partials:10,errors:4,extras:0},{competitionCode:'LIGA_A',participantKey:'BETO',position:2,points:35,fulls:9,partials:8,errors:7,extras:0}],
 rounds:[{round:'Fecha 1',participantKey:'ANA',points:18,fulls:4,partials:6,errors:2,extras:0},{round:'Fecha 2',participantKey:'ANA',points:22,fulls:6,partials:4,errors:2,extras:0}],
 results:[{competitionCode:'LIGA_A',participantKey:'ANA',position:1,resultCode:'CHAMPION',teamLabel:null}],
 matches:[],movements:[],iffhs:[{participantKey:'ANA',points:107.5,position:1}],
};
let db:DatabaseSync;
function env():Env{
 return {DB:{
  prepare(sql:string){let values:any[]=[];return {
   bind(...args:any[]){values=args;return this;},
   async first<T>(){return (db.prepare(sql).get(...values)??null) as T|null;},
   async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},
   async run(){const r=db.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};},
  };},
  async batch(statements:any[]){db.exec('BEGIN');try{for(const st of statements)await st.run();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}},
 } as unknown as D1Database} as Env;
}
function request(path:string,token:string,method='GET',data?:unknown){
 return new Request('https://tafa.test/api/'+path,{method,headers:{cookie:'prode_session='+token,'content-type':'application/json'},body:data?JSON.stringify(data):undefined});
}
beforeEach(()=>{
 db=new DatabaseSync(':memory:');
 for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+f,'utf8'));
 db.exec("INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES('A','Ana','A','hash','participant'),('B','Beto','B','hash','participant'),('admin','Admin','admin','hash','admin')");
 for(const t of ['A','B','admin'])db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,'2099-01-01')").run(t,t,createHash('sha256').update(t).digest('hex'));
});
afterEach(()=>db.close());
describe('Archivo histórico por temporada',()=>{
 it('acepta T1 con solo Liga A, sin inventar copas ni Fechas faltantes',()=>{
  const result=normalizeArchive(source);
  expect(result.errors).toEqual([]);
  expect(result.counts).toMatchObject({competitions:1,statistics:2,results:1,matches:0});
 });
 it('rechaza referencias a competiciones/participantes inexistentes y filas duplicadas',()=>{
  const bad={...source,standings:[...source.standings,{...source.standings[0],competitionCode:'COPA_PAPA',participantKey:'OTRA'}]};
  const result=normalizeArchive(bad);
  expect(result.errors.join(' ')).toMatch(/competición inexistente|participante inexistente/);
  expect(normalizeArchive({...source,participants:[...source.participants,source.participants[0]]}).errors.join(' ')).toContain('duplicado');
 });
 it('exige permisos Admin, vista previa y SHA antes de importar',async()=>{
  const preview=await handleHistoricalArchive(request('admin/historical-imports/preview','admin','POST',{data:source}),env());
  expect(preview?.status).toBe(200);const p=await preview!.json() as {sha256:string;ok:boolean};
  expect(p.ok).toBe(true);
  const forbidden=await handleHistoricalArchive(request('admin/historical-imports','A','POST',{data:source,sha256:p.sha256,sourceName:'T1.xlsx'}),env());
  expect(forbidden?.status).toBe(403);
  const badHash=await handleHistoricalArchive(request('admin/historical-imports','admin','POST',{data:source,sha256:'mismatch',sourceName:'T1.xlsx'}),env());
  expect(badHash?.status).toBe(409);
  const inserted=await handleHistoricalArchive(request('admin/historical-imports','admin','POST',{data:source,sha256:p.sha256,sourceName:'T1.xlsx'}),env());
  expect(inserted?.status).toBe(201);
  expect(historicalStats(await activeHistoricalArchives(env().DB)).get('A')?.points).toBe(40);
  const duplicate=await handleHistoricalArchive(request('admin/historical-imports/preview','admin','POST',{data:source}),env());
  expect((await duplicate!.json() as {ok:boolean}).ok).toBe(false);
 });
 it('revertir deja de sumar la temporada y preserva la auditoría',async()=>{
  const p=await (await handleHistoricalArchive(request('admin/historical-imports/preview','admin','POST',{data:source}),env()))!.json() as {sha256:string};
  const inserted=await (await handleHistoricalArchive(request('admin/historical-imports','admin','POST',{data:source,sha256:p.sha256,sourceName:'T1.xlsx'}),env()))!.json() as {id:number};
  const wrong=await handleHistoricalArchive(request('admin/historical-imports/'+inserted.id+'/revert','admin','POST',{seasonNumber:2,sha256:p.sha256,reason:'Corrección de puntos'}),env());
  expect(wrong?.status).toBe(409);
  const r=await handleHistoricalArchive(request('admin/historical-imports/'+inserted.id+'/revert','admin','POST',{seasonNumber:1,sha256:p.sha256,reason:'Corrección de puntos'}),env());
  expect(r?.status).toBe(200);
  expect(await activeHistoricalArchives(env().DB)).toHaveLength(0);
  expect((db.prepare("SELECT status FROM historical_imports WHERE id=?").get(inserted.id) as {status:string}).status).toBe('reverted');
  expect((db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE entity_type='historical_import'").get() as {n:number}).n).toBe(2);
 });
 it('permite sumar campeones e IFFHS a T1 en un segundo lote y revertir solo ese lote',async()=>{
  const first={...source,results:[],iffhs:[]};
  const second={...source,statistics:[],standings:[],rounds:[]};
  const preview=async(data:ArchivePayload)=>await (await handleHistoricalArchive(request('admin/historical-imports/preview','admin','POST',{data}),env()))!.json() as {ok:boolean;sha256:string;errors:string[]};
  const save=async(data:ArchivePayload,sha256:string)=>await (await handleHistoricalArchive(request('admin/historical-imports','admin','POST',{data,sha256,sourceName:'T1-parte.xlsx'}),env()))!.json() as {id:number};
  const p1=await preview(first);expect(p1.ok).toBe(true);
  const s1=await save(first,p1.sha256);
  const p2=await preview(second);expect(p2.ok).toBe(true);
  const s2=await save(second,p2.sha256);
  const archives=await activeHistoricalArchives(env().DB);
  expect(archives).toHaveLength(1);
  expect(archives[0].data.statistics).toHaveLength(2);
  expect(archives[0].data.results).toHaveLength(1);
  expect(historicalStats(archives).get('A')?.points).toBe(40);
  const season=await handleHistoricalArchive(request('admin/historical-imports/season/1','admin'),env());
  expect((await season!.json() as {data:ArchivePayload}).data.iffhs).toHaveLength(1);
  const again=await preview(first);
  expect(again.ok).toBe(false);
  expect(again.errors.join(' ')).toMatch(/Ya existe un registro/);
  const undo=await handleHistoricalArchive(request('admin/historical-imports/'+s2.id+'/revert','admin','POST',{seasonNumber:1,sha256:p2.sha256,reason:'Corregir palmarés'}),env());
  expect(undo?.status).toBe(200);
  const after=await activeHistoricalArchives(env().DB);
  expect(after[0].data.results).toHaveLength(0);
  expect(historicalStats(after).get('A')?.points).toBe(40);
  expect((db.prepare("SELECT status FROM historical_imports WHERE id=?").get(s1.id) as {status:string}).status).toBe('active');
 });
 it('rechaza cambios contradictorios en identidades entre lotes',()=>{
  const result=mergeArchiveBatches([source,{...source,participants:[{...source.participants[0],userId:'B'},source.participants[1]],statistics:[],standings:[],rounds:[],results:[],matches:[],movements:[],iffhs:[]}]);
  expect(result.errors.join(' ')).toContain('contradictorios');
 });
 it('no permite superponer archivo con resultados oficiales ya existentes',async()=>{
  db.exec("INSERT INTO tafa_seasons(id,season_number,name) VALUES(1,1,'T1'); INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(1,1,'LIGA_A','Liga A','Liga A','LEAGUE'); INSERT INTO rounds(id,name) VALUES(1,'Fecha'); INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES(1,1,'LIGA','Liga','LEAGUE_TABLE',1); INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES(1,1,1,1,1)");
  const p=await (await handleHistoricalArchive(request('admin/historical-imports/preview','admin','POST',{data:source}),env()))!.json() as {errors:string[]};
  expect(p.errors.join(' ')).toContain('motor oficial');
 });
});
it('Historia lista y publica Copa América sin inventar Liga, protege lectura y oculta auditoría',async()=>{
 const america:ArchivePayload={...structuredClone(source),season:{number:1,name:'Copa América Brasil 2021',kind:'TOURNAMENT',notes:'nota privada'},competitions:[{code:'COPA_AMERICA_2021',name:'Copa América',kind:'TOURNAMENT'}]};
 for(const r of [...america.standings,...america.results])r.competitionCode='COPA_AMERICA_2021';
 for(const r of america.rounds)r.competitionCode='COPA_AMERICA_2021';
 const norm=normalizeArchive(america);expect(norm.errors).toEqual([]);
 db.prepare("INSERT INTO historical_imports(season_number,season_name,source_name,source_sha256,payload_json,counts_json,created_by) VALUES(1,?,'secreto.xlsx','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',?,'{}','admin')").run(america.season.name,JSON.stringify(norm.payload));
 const unauth=await handleHistoricalArchive(request('participant/history','nobody'),env());expect(unauth?.status).toBe(401);
 const list=await (await handleHistoricalArchive(request('participant/history','A'),env()))!.json() as any;
 expect(list.seasons).toHaveLength(1);expect(list.seasons[0].competitions).toEqual([{code:'COPA_AMERICA_2021',name:'Copa América',kind:'TOURNAMENT',champions:['Ana histórica']}]);
 const detail=await (await handleHistoricalArchive(request('participant/history/1/COPA_AMERICA_2021','B'),env()))!.json() as any;
 expect(detail.data.standings).toHaveLength(2);expect(detail.data.season.notes).toBe('');
 expect(JSON.stringify(detail)).not.toMatch(/privatehash|secreto.xlsx|password_hash|created_by|nota privada/);
 expect((await handleHistoricalArchive(request('participant/history/1/LIGA_A','A'),env()))?.status).toBe(404);
 expect((await handleHistoricalArchive(request('participant/history/1','A','POST',{}),env()))?.status).toBe(405);
 db.exec("UPDATE historical_imports SET status='reverted',reverted_at=datetime('now')");
 expect((await (await handleHistoricalArchive(request('participant/history','A'),env()))!.json() as any).seasons).toEqual([]);
 expect((await handleHistoricalArchive(request('participant/history/1','A'),env()))?.status).toBe(404);
});

it('Fechas del mismo número en competiciones distintas y cuatro cruces Dúos conservan identidades',()=>{
 const data=structuredClone(source);data.competitions.push({code:'COPA_DUOS',name:'Copa Dúos',kind:'CUP'});
 data.rounds=[{...source.rounds[0],competitionCode:'LIGA_A'},{...source.rounds[0],competitionCode:'COPA_DUOS'}];
 data.participants.push({key:'C',name:'C',userId:null,division:null},{key:'D',name:'D',userId:null,division:null});
 data.matches=['ANA:C','ANA:D','BETO:C','BETO:D'].map((pair,i)=>({matchId:'DUO-FINAL-'+i,competitionCode:'COPA_DUOS',stage:'Final',round:'Fecha 1',aKey:pair.split(':')[0],bKey:pair.split(':')[1],pointsA:4,pointsB:0,plenosA:null,plenosB:null,scoreBasis:'DUO'}));
 const normalized=normalizeArchive(data);expect(normalized.errors).toEqual([]);expect(normalized.payload?.matches).toHaveLength(4);
 expect(mergeArchiveBatches([normalized.payload!]).data?.matches).toHaveLength(4);
 const repeated={...data,matches:[...data.matches,{...data.matches[0],bKey:'D'}]};expect(normalizeArchive(repeated).errors.join(' ')).toContain('fila repetida');
 const first={...data,matches:[data.matches[0]],rounds:[data.rounds[0]]};
 const second={...data,statistics:[],standings:[],results:[],iffhs:[],matches:data.matches.slice(1),rounds:[data.rounds[1]]};
 const merged=mergeArchiveBatches([first,second]);expect(merged.errors).toEqual([]);expect(merged.data?.matches).toHaveLength(4);expect(merged.data?.rounds).toHaveLength(2);
 expect(historicalStats([{seasonNumber:1,data:merged.data!}]).get('A')?.points).toBe(40);
});

it('no infiere competición de Fecha ambigua ni títulos de la primera posición',()=>{
 const data=structuredClone(source);data.results=[];data.competitions.push({code:'COPA_A',name:'Copa A',kind:'CUP'});
 expect(normalizeArchive(data).errors.join(' ')).toContain('competitionCode obligatorio');
});

it('Historia oficial completa usa resultados confirmados y no expone temporadas draft/activas',async()=>{
 db.exec("INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(1,32,'T32','finished'),(2,33,'T33','draft'); INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family,status) VALUES(1,1,'COPA_PAPA','Copa Papa','Copa Homenaje','CUP','finished'),(2,1,'COPA_A','Copa A','Copa A','CUP','finished'); INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence,status) VALUES(1,1,'FINAL','Final','KNOCKOUT',1,'finished'); INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES(1,1,'INDIVIDUAL','Ana'),(2,1,'INDIVIDUAL','Beto'),(3,2,'INDIVIDUAL','Ana'); INSERT INTO competition_entry_members(entry_id,user_id) VALUES(1,'A'),(2,'B'),(3,'A'); INSERT INTO competition_results(competition_id,entry_id,result_code,final_position,confirmed_by_user_id) VALUES(1,1,'CHAMPION',1,'admin'),(1,2,'RUNNER_UP',2,'admin'),(2,3,'CHAMPION',1,'admin'); INSERT INTO competition_encounters(slot_key,stage_id,entry_a_id,entry_b_id,score_a,score_b,status,winner_entry_id,admin_confirmed_at) VALUES('FINAL',1,1,2,5,3,'finished',1,datetime('now'))");
 const list=await (await handleHistoricalArchive(request('participant/history','A'),env()))!.json() as any;expect(list.seasons).toHaveLength(1);expect(list.seasons[0]).toMatchObject({number:32,source:'official',participantCount:2});expect(list.seasons[0].competitions).toHaveLength(2);
 const response=await handleHistoricalArchive(request('participant/history/32','B'),env());expect(response?.status).toBe(200);
 const detail=await response!.json() as any;expect(detail.data.results).toHaveLength(3);expect(detail.data.matches).toHaveLength(1);expect(detail.data.matches[0]).toMatchObject({pointsA:5,pointsB:3});expect(detail.data.statistics).toEqual([]);
 expect(JSON.stringify(detail)).not.toMatch(/confirmed_by|admin_confirmed|password|token|detail_json/);
});
it('Historia reutiliza tabla Liga y muestra puntos persistidos por Fecha sin duplicar entre vínculos',async()=>{
 db.exec(`INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(1,32,'T32','finished');
 INSERT INTO season_divisions(id,season_id,code,name) VALUES(1,1,'A','Primera');
 INSERT INTO season_division_members(season_id,division_id,user_id) VALUES(1,1,'A'),(1,1,'B');
 INSERT INTO competitions(id,season_id,division_id,code,canonical_name,display_name,family,status) VALUES(1,1,1,'LIGA_A','Liga A','Primera','LEAGUE','finished');
 INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence,status) VALUES(1,1,'LIGA','Liga','LEAGUE_TABLE',1,'finished');
 INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES(1,1,'INDIVIDUAL','Ana'),(2,1,'INDIVIDUAL','Beto');
 INSERT INTO competition_entry_members(entry_id,user_id) VALUES(1,'A'),(2,'B');
 INSERT INTO rounds(id,name,status) VALUES(1,'Fecha 1','draft');
 INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_name,away_team_name,kickoff_at,status,home_score_regulation,away_score_regulation) VALUES(1,1,'manual','test','Local','Visitante','2099-01-01T20:00:00Z','scheduled',1,0);
 UPDATE rounds SET status='open' WHERE id=1;
 INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES(1,1,1,1,1);
 INSERT INTO predictions(id,user_id,match_id,predicted_home_score,predicted_away_score) VALUES(1,'A',1,1,0);
 INSERT INTO round_submissions(round_id,user_id,first_submitted_at,last_submitted_at) VALUES(1,'A','2026-01-01','2026-01-01');
 UPDATE matches SET status='finished' WHERE id=1; UPDATE rounds SET status='finished' WHERE id=1;
 INSERT INTO prediction_scores(prediction_id,result_type,base_points,total_points,is_provisional,calculated_at) VALUES(1,'FULL',3,3,0,'2026-01-01');`);
 const detail=await (await handleHistoricalArchive(request('participant/history/32','A'),env()))!.json() as any;
 expect(detail.data.standings.find((r:any)=>r.participantKey==='A')).toMatchObject({points:3,fulls:1,position:1});
 expect(detail.data.rounds.find((r:any)=>r.participantKey==='A')).toMatchObject({competitionCode:'LIGA_A',round:'Fecha 1',points:3,fulls:1});
 expect(detail.data.statistics).toEqual([]);expect(detail.officialLinks).toEqual([{code:'LIGA_A',roundId:1,name:'Fecha 1'}]);
});
it('combina temporadas importadas y oficiales en una sola tarjeta sin duplicar competiciones ni títulos',async()=>{
 const archive=structuredClone(source);archive.season.number=32;archive.competitions.push({code:'COPA_PAPA',name:'Copa Papa',kind:'CUP'});archive.results.push({competitionCode:'COPA_PAPA',participantKey:'ANA',position:1,resultCode:'CHAMPION',teamLabel:null});
 db.prepare("INSERT INTO historical_imports(season_number,season_name,source_name,source_sha256,payload_json,counts_json,created_by) VALUES(32,'T32','T32.xlsx',?,?,'{}','admin')").run('b'.repeat(64),JSON.stringify(archive));
 db.exec("INSERT INTO tafa_seasons(id,season_number,name,status) VALUES(1,32,'T32','finished'); INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family,status) VALUES(1,1,'COPA_PAPA','Copa Papa','Copa Papa','CUP','finished'); INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES(1,1,'INDIVIDUAL','Beto'); INSERT INTO competition_entry_members(entry_id,user_id) VALUES(1,'B'); INSERT INTO competition_results(competition_id,entry_id,result_code,final_position) VALUES(1,1,'CHAMPION',1)");
 const list=await (await handleHistoricalArchive(request('participant/history','A'),env()))!.json() as any;
 expect(list.seasons).toHaveLength(1);expect(list.seasons[0].source).toBe('mixed');expect(list.seasons[0].participantCount).toBe(2);expect(list.seasons[0].competitions).toHaveLength(2);expect(list.seasons[0].competitions.find((c:any)=>c.code==='COPA_PAPA').champions).toEqual(['Beto']);
 const detail=await (await handleHistoricalArchive(request('participant/history/32','A'),env()))!.json() as any;
 expect(detail.data.results).toHaveLength(2);expect(detail.data.results.filter((r:any)=>r.competitionCode==='COPA_PAPA')).toHaveLength(1);expect(detail.data.standings).toHaveLength(2);
 expect(detail.data.results.find((r:any)=>r.competitionCode==='LIGA_A').participantKey).toBe('imported:ANA');
 expect(historicalStats(await activeHistoricalArchives(env().DB)).get('A')?.points).toBe(40);
});
