import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { handleCompetitionEngine } from '../worker/competitions';
let db: DatabaseSync;
const env = { DB: { prepare(sql: string) {
  let args: any[] = [];
  return { bind(...values: any[]) { args = values; return this; }, async first() { return db.prepare(sql).get(...args) ?? null; }, async all() { return { results: db.prepare(sql).all(...args) }; } };
} } as unknown as D1Database };
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations').filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync('migrations/' + file, 'utf8'));
  db.exec("INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES ('p','Persona','000','hash','participant'); INSERT INTO tafa_seasons(id,season_number,name,status) VALUES (1,32,'T32','active'),(2,33,'T33','draft'); INSERT INTO season_divisions(id,season_id,code,name,sort_order) VALUES (1,1,'B','Liga B',2); INSERT INTO season_division_members(season_id,division_id,user_id) VALUES (1,1,'p'); INSERT INTO competitions(id,season_id,division_id,code,canonical_name,display_name,family,sort_order) VALUES (1,1,1,'LIGA_B','Liga B','Liga B','LEAGUE',2),(2,1,null,'COPA_TOTAL','Copa Total','Copa Total','CUP',3),(3,2,null,'COPA_PAPA','Copa Papa','Copa Papa','CUP',4);");
  db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES ('s','p',?,'2099-01-01')").run(createHash('sha256').update('token').digest('hex'));
});
afterEach(() => db.close());
it('catálogo completo sólo de temporada activa, membresía histórica intacta y lectura sin escrituras', async () => {
  const before = db.prepare('SELECT total_changes() AS n').get()!.n;
  const response = await handleCompetitionEngine(new Request('http://local/api/competition-engine/current', { headers: { cookie: 'prode_session=token' } }), env);
  expect(response!.status).toBe(200);
  const body = await response!.json() as any;
  expect(body.season.competitionCatalog.map((c: any) => c.code)).toEqual(['LIGA_B','COPA_TOTAL']);
  expect(body.season.competitions.map((c: any) => c.code)).toEqual(['LIGA_B']);
  expect(body.season.competitionMembershipScope).toBe('SEASON_HISTORY');
  expect(JSON.stringify(body)).not.toMatch(/password|phone|hash/);
  expect(db.prepare('SELECT total_changes() AS n').get()!.n).toBe(before);
});
it('catálogo mantiene autenticación y no inventa temporada activa', async () => {
  expect((await handleCompetitionEngine(new Request('http://local/api/competition-engine/current'), env))!.status).toBe(401);
  db.exec("UPDATE tafa_seasons SET status='finished' WHERE id=1");
  const result = await handleCompetitionEngine(new Request('http://local/api/competition-engine/current', { headers: { cookie: 'prode_session=token' } }), env);
  expect(await result!.json()).toEqual({ season: null });
});
