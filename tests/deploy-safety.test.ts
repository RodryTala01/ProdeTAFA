import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { checkDeploySchema } from '../scripts/check-deploy-schema.mjs';

const files = readdirSync('migrations').filter(f => f.endsWith('.sql')).sort();
const sql = (f: string) => readFileSync(`migrations/${f}`, 'utf8');
const response = (names = files) => JSON.stringify([{success:true,results:names.map(name => ({name}))}]);

describe('Deploy sin escrituras D1', () => {
  it('sólo consulta el registro y acepta todas las migraciones conocidas', () => {
    const run = vi.fn(() => response());
    checkDeploySchema(run, files);
    expect(run).toHaveBeenCalledExactlyOnceWith(['d1','execute','DB','--remote','--config','wrangler.jsonc',
      '--command','SELECT name FROM d1_migrations ORDER BY name','--json']);
  });
  it('bloquea faltantes, versiones desconocidas, errores y respuestas inválidas', () => {
    for (const value of [response(files.slice(0,6)),response([...files,'9999_unknown.sql']),
      '[]','{}','<html>error</html>',JSON.stringify([{success:false,results:[]}])]) {
      expect(() => checkDeploySchema(() => value, files)).toThrow();
    }
    expect(() => checkDeploySchema(() => {throw new Error('network');}, files)).toThrow();
  });
  it('ambos comandos bloquean publicación si falla el preflight y nunca migran', () => {
    const {scripts} = JSON.parse(readFileSync('package.json','utf8'));
    for (const name of ['deploy','deploy:first']) {
      expect(scripts[name]).toContain('npm test && npm run build && node scripts/check-deploy-schema.mjs && wrangler deploy');
      expect(scripts[name]).not.toMatch(/migrat|d1 /);
    }
  });
});

describe('Upgrade 0007–0014 con foreign keys activas', () => {
  it('funciona sin datos deportivos ni usuarios precargados', () => {
    const db = new DatabaseSync(':memory:');
    try {
      for (const file of files) db.exec(sql(file));
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(db.prepare('PRAGMA integrity_check').get()).toEqual({integrity_check:'ok'});
    } finally {db.close();}
  });
  it('preserva datos legacy y agrega members_json sin romper filas/escrituras anteriores', () => {
    const db = new DatabaseSync(':memory:');
    try {
      for (const file of files.filter(f=>f<'0007')) db.exec(sql(file));
      db.exec(`INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES('a','Ficticio','0000','test-hash','admin');
        INSERT INTO rounds(id,name) VALUES(1,'Legacy');
        INSERT INTO league_seasons(id,name) VALUES(1,'Legacy');
        INSERT INTO league_participants(season_id,user_id) VALUES(1,'a');
        INSERT INTO league_rounds(season_id,round_id,slot_number) VALUES(1,1,1);
        INSERT INTO tafa_seasons(id,season_number,name) VALUES(1,32,'Prueba');
        INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES(1,1,'COPA_DUOS','Dúos','Dúos','CUP');
        INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES(1,1,'S','S','SURVIVAL_TABLE',1);
        INSERT INTO competition_entries(id,competition_id,display_name,entry_type) VALUES(1,1,'Dúo','DUO');
        INSERT INTO competition_round_links(id,competition_id,stage_id,round_id,sequence) VALUES(1,1,1,1,1);`);
      const legacyTables = ['users','rounds','league_seasons','league_participants','league_rounds','tafa_seasons','competitions'];
      const before = legacyTables.map(t=>db.prepare(`SELECT * FROM ${t}`).all());
      for (const file of files.filter(f=>f>='0007' && f<'0014')) db.exec(sql(file));
      const oldInsert = `INSERT INTO competition_survival_results(stage_id,round_link_id,entry_id,position,decision,confirmed_by_user_id) VALUES(1,1,1,1,'ACTIVE','a')`;
      db.exec(oldInsert);
      const oldRow = db.prepare('SELECT * FROM competition_survival_results').get();
      db.exec(sql(files.find(f=>f.startsWith('0014'))!));
      expect(db.prepare('SELECT * FROM competition_survival_results').get()).toEqual({...oldRow,members_json:'[]'});
      expect(legacyTables.map(t=>db.prepare(`SELECT * FROM ${t}`).all())).toEqual(before);
      db.exec('DELETE FROM competition_survival_results');
      db.exec(oldInsert);
      expect(db.prepare('SELECT members_json FROM competition_survival_results').get()).toEqual({members_json:'[]'});
      expect(()=>db.exec("UPDATE competition_survival_results SET members_json='invalid'")).toThrow();
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {db.close();}
  });
});
