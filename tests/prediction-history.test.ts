import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handleAdminCorrections } from '../worker/admin-corrections';

let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations').filter((file) => file.endsWith('.sql') && file < '0005').sort()) {
    db.exec(readFileSync(`migrations/${file}`, 'utf8'));
  }
  db.exec(`INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES ('u','Prueba','000001','hash','participant');
    INSERT INTO rounds(id,name,status) VALUES (1,'Fecha','open');
    INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_name,away_team_name,home_team_provider_id,away_team_provider_id,kickoff_at,match_type)
    VALUES (1,1,'local-test','one','Local','Visitante','h','a','2099-01-01T00:00:00Z','PENALTIES_ONLY'),
           (2,1,'local-test','two','Otro Local','Otro Visitante','h2','a2','2000-01-01T00:00:00Z','NORMAL');`);
});
afterEach(() => db.close());
function save(home: number | null = 1, away: number | null = 0, extra: string | null = 'h', admin = 0) {
  db.prepare(`INSERT INTO predictions(user_id,match_id,predicted_home_score,predicted_away_score,predicted_extra_team_provider_id,is_admin_override)
    VALUES ('u',1,?,?,?,?) ON CONFLICT(user_id,match_id) DO UPDATE SET
    predicted_home_score=excluded.predicted_home_score,predicted_away_score=excluded.predicted_away_score,
    predicted_extra_team_provider_id=excluded.predicted_extra_team_provider_id,is_admin_override=excluded.is_admin_override`).run(home, away, extra, admin);
}
function submit() {
  db.exec(`INSERT INTO round_submissions(round_id,user_id,first_submitted_at,last_submitted_at) VALUES (1,'u',datetime('now'),datetime('now'))
    ON CONFLICT(round_id,user_id) DO UPDATE SET last_submitted_at=datetime('now'),submission_count=submission_count+1`);
}
function events() {
  return db.prepare('SELECT * FROM prediction_history ORDER BY id').all().map((row) => ({
    ...row, before: row.before_json ? JSON.parse(String(row.before_json)) : null, after: JSON.parse(String(row.after_json)),
  }));
}

describe('auditoría transaccional de pronósticos', () => {
  it('no registra borradores de quien nunca envió', () => {
    save(); save(2, 2, 'a'); expect(events()).toEqual([]);
  });
  it('primer envío conserva snapshot con nombres y partidos sin pronóstico', () => {
    save(); submit();
    const [event] = events();
    expect(event.event_type).toBe('first_submit');
    expect(event.after).toHaveLength(2);
    expect(event.after.find((item) => item.matchId === 1)).toMatchObject({ homeScore: 1, awayScore: 0, extraTeam: 'Local' });
    expect(event.after.find((item) => item.matchId === 2).homeScore).toBeNull();
    expect(event.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
  it('no duplica eventos al guardar los mismos valores', () => {
    save(); submit(); save(); save(); expect(events()).toHaveLength(1);
  });
  it('registra anterior y nuevo del marcador local después del envío', () => {
    save(); submit(); save(2);
    expect(events()[1]).toMatchObject({ event_type: 'change', before: { homeScore: 1, awayScore: 0 }, after: { homeScore: 2, awayScore: 0 } });
    expect(events()[0].after.find((item) => item.matchId === 1).homeScore).toBe(1);
  });
  it('registra cambio de visitante', () => {
    save(); submit(); save(1, 3);
    expect(events()[1]).toMatchObject({ before: { awayScore: 0 }, after: { awayScore: 3 } });
  });
  it('registra cambio del ganador de penales por nombre', () => {
    save(); submit(); save(1, 0, 'a');
    expect(events()[1]).toMatchObject({ before: { extraTeam: 'Local' }, after: { extraTeam: 'Visitante' } });
  });
  it('registra limpiar valores y no repite el borrado', () => {
    save(); submit(); save(null, null, null); save(null, null, null);
    expect(events()).toHaveLength(2);
    expect(events()[1].after.homeScore).toBeNull();
  });
  it('reenvío registra snapshot aunque no cambien los pronósticos, preserva round_submissions', () => {
    save(); submit(); submit();
    expect(events().map((event) => event.event_type)).toEqual(['first_submit', 'resubmit']);
    expect(events()[1].after).toEqual(events()[0].after);
    expect(db.prepare('SELECT submission_count FROM round_submissions').get()?.submission_count).toBe(2);
  });
  it('registra una primera predicción creada después de enviar', () => {
    submit(); save();
    expect(events()[1]).toMatchObject({ before: null, after: { homeScore: 1 }, event_type: 'change' });
  });
  it('distingue corrección administrativa de cambios posteriores del participante', () => {
    save(); submit(); save(2, 0, 'h', 1); save(3, 0, 'h', 0);
    expect(events().map((event) => event.actor_kind)).toEqual(['participant', 'admin', 'participant']);
  });
  it('no permite actualizar ni borrar eventos', () => {
    save(); submit();
    expect(() => db.exec("UPDATE prediction_history SET event_type='resubmit'")).toThrow('append-only');
    expect(() => db.exec('DELETE FROM prediction_history')).toThrow('append-only');
    expect(events()).toHaveLength(1);
  });
  it('revierte evento y pronóstico juntos si la transacción falla', () => {
    save(); submit(); db.exec('BEGIN'); save(8); db.exec('ROLLBACK');
    expect(events()).toHaveLength(1);
    expect(db.prepare('SELECT predicted_home_score FROM predictions').get()?.predicted_home_score).toBe(1);
  });
  it('no inventa snapshots para envíos previos a la migración', () => {
    const legacy = new DatabaseSync(':memory:');
    legacy.exec(readFileSync('migrations/0001_initial.sql', 'utf8'));
    legacy.exec("INSERT INTO users VALUES ('u','Prueba','000001','hash','participant',1,datetime('now'),datetime('now')); INSERT INTO rounds(id,name) VALUES (1,'Vieja'); INSERT INTO round_submissions(round_id,user_id,first_submitted_at,last_submitted_at) VALUES (1,'u',datetime('now'),datetime('now'));");
    legacy.exec(readFileSync('migrations/0004_prediction_history.sql', 'utf8'));
    expect(legacy.prepare('SELECT COUNT(*) AS count FROM prediction_history').get()?.count).toBe(0);
    legacy.close();
  });
});

describe('protección del historial Admin', () => {
  it('rechaza requests sin sesión', async () => {
    const result = await handleAdminCorrections(new Request('http://local/api/admin/rounds/1/prediction-history'), { DB: {} as D1Database });
    expect(result?.status).toBe(401);
  });
  it('rechaza un participante autenticado', async () => {
    const fakeDb = { prepare: () => ({ bind: () => ({ first: async () => ({ id: 'u', role: 'participant', is_active: 1 }) }) }) };
    const result = await handleAdminCorrections(new Request('http://local/api/admin/rounds/1/prediction-history', { headers: { cookie: 'prode_session=test' } }), { DB: fakeDb as unknown as D1Database });
    expect(result?.status).toBe(403);
  });
});

