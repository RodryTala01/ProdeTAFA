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
