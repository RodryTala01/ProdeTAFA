import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handlePredictions } from '../worker/predictions';
import type {RoundContexts} from '../src/competition-contexts';

let db: DatabaseSync;

function env() {
  const DB = {
    prepare(sql: string) {
      let args: any[] = [];
      return {
        bind(...values: any[]) { args = values; return this; },
        async first() { return db.prepare(sql).get(...args) ?? null; },
        async all() { return { results: db.prepare(sql).all(...args) }; },
        async run() {
          const r = db.prepare(sql).run(...args);
          return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
        },
      };
    },
    async batch(statements: any[]) {
      db.exec('BEGIN');
      try {
        const rows = [];
        for (const statement of statements) rows.push(await statement.run());
        db.exec('COMMIT');
        return rows;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { DB: DB as unknown as D1Database };
}


async function request(round=10,user='p1',query='',method='GET'){
 return (await handlePredictions(new Request(`http://local/api/participant/rounds/${round}/competition-contexts${query}`,{method,headers:user?{cookie:`prode_session=${user}`}:{}}),env()))!;
}
async function contexts(round=10,user='p1'){const r=await request(round,user);expect(r.status).toBe(200);return (await r.json() as RoundContexts).contexts;}
function competition(id:number,code:string,type='KNOCKOUT',round=10){
 db.prepare('INSERT INTO competitions(id,season_id,division_id,code,canonical_name,display_name,family,sort_order) VALUES (?,1,?,?,?,?,?,?)').run(id,code==='LIGA_A'?1:code==='LIGA_B'?2:null,code,code,code,code.startsWith('LIGA')?'LEAGUE':code==='PROMOCION'?'PROMOTION':'CUP',id);
 db.prepare('INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES (?, ?,?, ?,?,1)').run(id,id,type,type,type);
 link(id,id,round,1);
}
function link(id:number,stage:number,round:number,sequence:number){db.prepare('INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES (?,?,?,?,?)').run(id,stage,stage,round,sequence);}
function entry(id:number,comp:number,users:string[],type='INDIVIDUAL'){
 db.prepare('INSERT INTO competition_entries(id,competition_id,entry_type,display_name) VALUES (?,?,?,?)').run(id,comp,type,users.join(' + '));
 for(const u of users)db.prepare('INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)').run(id,u);
}
function encounter(id:number,stage:number,a:number,b:number|null,roundLink=stage){db.prepare('INSERT INTO competition_encounters(id,stage_id,round_link_id,slot_key,entry_a_id,entry_b_id) VALUES (?,?,?,?,?,?)').run(id,stage,roundLink,'MATCH-'+id,a,b);}
function group(stage:number,entryId:number){db.prepare("INSERT OR IGNORE INTO competition_groups(id,stage_id,code,name,sequence) VALUES (?,?,'B','Grupo B',1)").run(stage,stage);db.prepare('INSERT INTO competition_group_entries(group_id,entry_id) VALUES (?,?)').run(stage,entryId);}
function duo(){competition(6,'COPA_DUOS','SURVIVAL_TABLE');link(60,6,20,2);link(61,6,30,3);entry(61,6,['p1','p2'],'DUO');db.exec("UPDATE competition_entry_members SET valid_to_round_id=20 WHERE entry_id=61 AND user_id='p2'; INSERT INTO competition_entry_members(entry_id,user_id,valid_from_round_id) VALUES (61,'p3',20)");}
beforeEach(()=>{
 db=new DatabaseSync(':memory:');for(const file of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+file,'utf8'));
 for(const id of ['admin','p1','p2','p3','p4']){db.prepare('INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES (?,?,?,?,?)').run(id,id,id,'hash',id==='admin'?'admin':'participant');db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,'2099-01-01')").run(id,id,createHash('sha256').update(id).digest('hex'));}
 db.exec("INSERT INTO tafa_seasons(id,season_number,name,status) VALUES (1,32,'T32','active'); INSERT INTO season_divisions(id,season_id,code,name,sort_order) VALUES (1,1,'A','Liga A',1),(2,1,'B','Liga B',2); INSERT INTO season_division_members(season_id,division_id,user_id) VALUES (1,1,'p1'),(1,2,'p2'); INSERT INTO rounds(id,name,status) VALUES (10,'Anterior','finished'),(20,'Actual','open'),(30,'Histórica posterior','finished'),(40,'Oculta','draft');");
});
afterEach(()=>db.close());
describe('Contextos deportivos por Fecha',()=>{
 it('Liga correcta por división, sin entrar en la otra Liga',async()=>{competition(1,'LIGA_A','LEAGUE_TABLE');competition(2,'LIGA_B','LEAGUE_TABLE');expect((await contexts()).map(c=>c.competition.code)).toEqual(['LIGA_A']);expect((await contexts(10,'p2')).map(c=>c.competition.code)).toEqual(['LIGA_B']);});
 it('Liga y TAFA simultáneos sin vínculo TIEBREAK; conserva todos los rivales',async()=>{competition(1,'LIGA_A','LEAGUE_TABLE');competition(5,'COPA_B');entry(51,5,['p1']);entry(52,5,['p2']);entry(53,5,['p3']);db.exec("INSERT INTO competition_tiebreaks(id,competition_id,stage_id,status) VALUES (1,5,5,'resolved'); INSERT INTO competition_tiebreak_entries(tiebreak_id,entry_id) VALUES (1,51),(1,52),(1,53); INSERT INTO competition_tiebreak_rounds(tiebreak_id,round_id,sequence) VALUES (1,10,1)");const c=await contexts();expect(c.map(c=>c.kind)).toEqual(['LEAGUE','TIEBREAK']);const t=c[1];if(t.kind==='TIEBREAK'){expect(t.roundLink).toBeNull();expect(t.competition.code).toBe('COPA_B');expect(t.tiebreak.opponents.map(o=>o.name)).toEqual(['p2','p3']);}});
 it.each(['COPA_A','COPA_B'])('grupo real de %s y deduplicación de membresía',async code=>{competition(3,code,'ACCUMULATIVE_GROUPS');entry(31,3,['p1']);group(3,31);db.exec("INSERT INTO competition_entry_members(entry_id,user_id) VALUES (31,'p1')");const c=await contexts();expect(c).toHaveLength(1);expect(c[0].kind).toBe('ACCUMULATIVE_GROUP');if(c[0].kind==='ACCUMULATIVE_GROUP')expect(c[0].group.name).toBe('Grupo B');expect(await contexts(10,'p2')).toEqual([]);});
 it('knockout histórico conserva rival aunque hoy esté eliminado; no aparece sin cruce futuro',async()=>{competition(3,'COPA_A');link(30,3,20,2);entry(31,3,['p1']);entry(32,3,['p2']);entry(33,3,['p3']);encounter(1,3,31,32);encounter(2,3,32,33,30);db.exec("UPDATE competition_entries SET status='eliminated' WHERE id=31");const c=await contexts();expect(c[0].kind).toBe('KNOCKOUT');if(c[0].kind==='KNOCKOUT')expect(c[0].encounter.opponentName).toBe('p2');expect(await contexts(20)).toEqual([]);});
 it('Copa Total entrega las tres mini-fechas persistidas de la segunda Fecha',async()=>{competition(4,'COPA_TOTAL','ROUND_ROBIN_GROUPS');db.exec('UPDATE competition_round_links SET sequence=2 WHERE id=4');entry(41,4,['p1']);entry(42,4,['p2']);group(4,41);group(4,42);for(let i=1;i<=3;i++){db.prepare('INSERT INTO competition_round_segments(id,round_link_id,code,name,sequence) VALUES (?,4,?,?,?)').run(i,'SEG'+i,'Segmento '+i,i);encounter(i,4,41,42);db.prepare('UPDATE competition_encounters SET segment_id=?,group_id=4 WHERE id=?').run(i,i);}const c=await contexts();expect(c).toHaveLength(1);if(c[0].kind!=='TOTAL_GROUP')throw Error('contexto');expect(c[0].miniFixtures.map(f=>f.miniDay)).toEqual([4,5,6]);expect(c[0].miniFixtures.map(f=>f.opponentName)).toEqual(['p2','p2','p2']);});
 it('Dúos compañero por Fecha y frontera exclusiva de sustitución',async()=>{duo();const past=(await contexts())[0],now=(await contexts(20))[0];if(past.kind!=='DUO_SURVIVAL'||now.kind!=='DUO_SURVIVAL')throw Error('duo');expect(past.partner?.userId).toBe('p2');expect(now.partner?.userId).toBe('p3');expect(past.duoName).toBe('p1 + p2');expect(now.duoName).toBe('p1 + p3');expect(await contexts(20,'p2')).toEqual([]);expect(await contexts(10,'p3')).toEqual([]);expect((await contexts(20,'p3'))[0].kind).toBe('DUO_SURVIVAL');});
 it('Dúos eliminado conserva survival histórico, no fechas posteriores',async()=>{duo();db.exec("INSERT INTO competition_survival_results(stage_id,round_link_id,entry_id,position,decision,confirmed_by_user_id) VALUES (6,6,61,1,'ELIMINATED','admin'); UPDATE competition_entries SET status='eliminated' WHERE id=61");expect((await contexts())[0].kind).toBe('DUO_SURVIVAL');expect(await contexts(20)).toEqual([]);});
 it.each(['Semifinal','Final'])('Dúos %s usa entrada colectiva y compañero vigente',async name=>{duo();db.prepare("UPDATE competition_stages SET stage_type='KNOCKOUT',name=? WHERE id=6").run(name);entry(62,6,['p2','p4'],'DUO');encounter(1,6,61,62,60);const c=(await contexts(20))[0];if(c.kind!=='KNOCKOUT')throw Error('cruce');expect(c.partner?.fullName).toBe('p3');expect(c.encounter.opponentName).toBe('p2 + p4');expect(c.stage?.name).toBe(name);});
 it('Campeones devuelve nodo real sin reconstruir llave',async()=>{competition(7,'COPA_CAMPEONES');entry(71,7,['p1']);entry(72,7,['p2']);encounter(1,7,71,72);db.exec("INSERT INTO competition_champions_nodes(competition_id,node_code,label,branch,sequence,source_a_type,source_a_ref,source_b_type,source_b_ref,encounter_id) VALUES (7,'U1','Rama superior','UPPER',1,'SLOT','A','SLOT','B',1)");const c=(await contexts())[0];if(c.kind!=='KNOCKOUT')throw Error('cruce');expect(c.championNode?.code).toBe('U1');expect(c.championNode?.label).toBe('Rama superior');});
 it.each(['COPA_PAPA','PROMOCION'])('%s devuelve rival de encuentro',async code=>{competition(8,code);entry(81,8,['p1']);entry(82,8,['p2']);encounter(1,8,81,82);const c=(await contexts())[0];if(c.kind!=='KNOCKOUT')throw Error('cruce');expect(c.encounter.opponentName).toBe('p2');});
 it('bye tiene rival null',async()=>{competition(8,'COPA_PAPA');entry(81,8,['p1']);encounter(1,8,81,null);const c=(await contexts())[0];if(c.kind==='KNOCKOUT')expect(c.encounter.opponentName).toBeNull();});
 it('varios contextos no agregan partidos ni pronósticos',async()=>{competition(1,'LIGA_A','LEAGUE_TABLE');competition(3,'COPA_A');entry(31,3,['p1']);entry(32,3,['p2']);encounter(1,3,31,32);for(let i=1;i<=12;i++){db.prepare("INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_name,away_team_name,kickoff_at) VALUES (?,10,'test',?,'Local','Visitante','2099-01-01')").run(i,String(i));db.prepare("INSERT INTO predictions(user_id,match_id,predicted_home_score,predicted_away_score) VALUES ('p1',?,1,0)").run(i);}expect(await contexts()).toHaveLength(2);expect(await contexts()).toHaveLength(2);expect((db.prepare('SELECT COUNT(*) n FROM matches').get() as any).n).toBe(12);expect((db.prepare('SELECT COUNT(*) n FROM predictions').get() as any).n).toBe(12);});
 it('sesión propia, rol, método y fechas visibles obligatorios',async()=>{expect((await request(10,'')).status).toBe(403);expect((await request(10,'admin')).status).toBe(403);expect((await request(10,'p1','?userId=p2')).status).toBe(403);expect((await request(10,'p1','','POST')).status).toBe(405);expect((await request(40)).status).toBe(404);expect((await request(999)).status).toBe(404);db.exec("UPDATE users SET is_active=0 WHERE id='p1'");expect((await request()).status).toBe(403);});
});
