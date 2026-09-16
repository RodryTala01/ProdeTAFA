import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { handlePredictions } from '../worker/predictions';
import { handleAdminCorrections } from '../worker/admin-corrections';
import { recalculateRoundScores } from '../worker/scoring';
import { handleRanking } from '../worker/ranking';

let db: DatabaseSync;
function adapter() {
  return {
    prepare(sql: string) {
      let values: (number | string | null)[] = [];
      return {
        bind(...args: typeof values) { values = args; return this; },
        async first() { return db.prepare(sql).get(...values) ?? null; },
        async all() { return { results: db.prepare(sql).all(...values) }; },
        async run() { const result = db.prepare(sql).run(...values); return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; },
      };
    },
    async batch(statements: { run: () => Promise<unknown> }[]) {
      db.exec('BEGIN');
      try { const results = []; for (const statement of statements) results.push(await statement.run()); db.exec('COMMIT'); return results; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  } as unknown as D1Database;
}
const env = () => ({ DB: adapter() });
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations').filter((name) => name.endsWith('.sql')).sort()) db.exec(readFileSync(`migrations/${file}`, 'utf8'));
  for (const id of ['u','v','admin']) {
    db.prepare('INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES (?,?,?,?,?)')
      .run(id,id,id+'000000','hash',id === 'admin' ? 'admin' : 'participant');
    db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,'2099-01-01T00:00:00Z')")
      .run(id,id,createHash('sha256').update(id).digest('hex'));
  }
  db.exec(`INSERT INTO rounds(id,name,status) VALUES (1,'Fecha prueba','open');
    INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_provider_id,away_team_provider_id,home_team_name,away_team_name,kickoff_at,match_type)
    VALUES (1,1,'local-test','one','h','a','Local','Visitante','2099-01-01T00:00:00Z','NORMAL'),
      (2,1,'local-test','two','h2','a2','Local penales','Visitante penales','2099-01-01T01:00:00Z','PENALTIES_ONLY'),
      (3,1,'local-test','three','h3','a3','Local cerrado','Visitante cerrado','2000-01-01T00:00:00Z','NORMAL');`);
});
afterEach(() => db.close());
async function call(path: string, method = 'GET', body?: object, user = 'u') {
  const request = new Request(`http://local/api/${path}`, {
    method, headers: { cookie: `prode_session=${user}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return path.startsWith('admin/') ? handleAdminCorrections(request, env()) : handlePredictions(request, env());
}
const save = (home = 1, away = 0, user = 'u') => call('participant/predictions/1','PUT',{ homeScore: home, awayScore: away },user);
const penalty = (team = 'h2') => call('participant/predictions/2','PUT',{ homeScore: 1, awayScore: 1, extraTeamId: team });
const submit = () => call('participant/rounds/1/submit','POST',{});
const official = () => db.prepare('SELECT * FROM official_predictions WHERE user_id=? AND match_id=1').get('u');
const events = () => db.prepare('SELECT * FROM prediction_submission_events ORDER BY id').all();
const points = () => Number(db.prepare('SELECT COALESCE(SUM(total_points),0) AS points FROM prediction_scores').get()?.points);
async function ready() { await save(); await penalty(); }
function result(status = 'FT') {
  db.prepare('UPDATE matches SET status=?,home_score_current=1,away_score_current=0,home_score_regulation=1,away_score_regulation=0 WHERE id=1').run(status);
}

describe('borrador, oficial, auditoría y scoring', () => {
  it('autosave previo al primer envío no genera oficial, historial ni puntos', async () => {
    await ready(); result(); await recalculateRoundScores(1,env());
    expect(official()).toBeUndefined(); expect(events()).toHaveLength(0); expect(points()).toBe(0);
  });
  it('primer envío promueve los partidos abiertos, con snapshot y timestamps UTC', async () => {
    await ready(); expect((await submit())?.status).toBe(200);
    expect(official()?.predicted_home_score).toBe(1);
    expect(db.prepare('SELECT COUNT(*) AS n FROM official_predictions').get()?.n).toBe(2);
    expect(events().map((event) => event.event_type)).toEqual(['FIRST_SUBMISSION']);
    expect(JSON.parse(String(events()[0].after_json))).toHaveLength(3);
    expect(events()[0].created_at).toMatch(/Z$/);
  });
  it('cambiar borrador no altera oficial, historial ni scoring incluso tras recálculo', async () => {
    await ready(); result(); await submit(); expect(points()).toBe(3);
    await save(2); await recalculateRoundScores(1,env());
    expect(official()?.predicted_home_score).toBe(1); expect(points()).toBe(3); expect(events()).toHaveLength(1);
  });
  it('reenviar reemplaza oficial, recalcula y registra diferencia oficial anterior/nueva', async () => {
    await ready(); result(); await submit(); await save(5); await save(2); await submit();
    expect(points()).toBe(1); expect(official()?.predicted_home_score).toBe(2);
    expect(events().map((event) => event.event_type)).toEqual(['FIRST_SUBMISSION','PREDICTION_CHANGE','RESUBMISSION']);
    const change = events()[1];
    expect(JSON.parse(String(change.before_json)).homeScore).toBe(1);
    expect(JSON.parse(String(change.after_json)).homeScore).toBe(2);
    expect(JSON.parse(String(change.fields_json))).toEqual(['homeScore']);
    expect(db.prepare('SELECT submission_count FROM round_submissions').get()?.submission_count).toBe(2);
  });
  it('audita cambio de visitante', async () => {
    await ready(); await submit(); await save(1,2); await submit();
    expect(JSON.parse(String(events()[1].fields_json))).toEqual(['awayScore']);
  });
  it('penales sólo cambia puntos y se audita al reenviar', async () => {
    await ready();
    db.exec("UPDATE matches SET status='PEN',home_score_regulation=1,away_score_regulation=1,winning_team_provider_id='h2',went_to_penalties=1 WHERE id=2");
    await submit(); expect(points()).toBe(4);
    await penalty('a2'); await recalculateRoundScores(1,env()); expect(points()).toBe(4);
    await submit(); expect(points()).toBe(3);
    expect(JSON.parse(String(events()[1].fields_json))).toEqual(['extraTeamId']);
    expect(JSON.parse(String(events()[1].after_json)).extraTeam).toBe('Visitante penales');
  });
  it('valor idéntico y borrador revertido no generan cambio oficial; sí registra cada reenvío', async () => {
    await ready(); await submit(); await save(2); await save(1); await save(1); await submit();
    expect(events().map((event) => event.event_type)).toEqual(['FIRST_SUBMISSION','RESUBMISSION']);
  });
  it('conserva oficial bloqueado aunque el borrador haya cambiado antes del cierre', async () => {
    await ready(); await submit(); await save(4);
    db.exec("UPDATE matches SET kickoff_at='2000-01-01T00:00:00Z' WHERE id=1");
    expect((await save(5))?.status).toBe(409);
    await penalty('a2'); expect((await submit())?.status).toBe(200);
    expect(official()?.predicted_home_score).toBe(1);
    const data = await (await call('participant/round?roundId=1'))!.json() as any;
    expect(data.round.matches.find((match: any) => match.id === 1).prediction.homeScore).toBe(1);
  });
  it('un borrador que cierra antes del primer envío no se vuelve oficial retroactivamente', async () => {
    await ready(); db.exec("UPDATE matches SET kickoff_at='2000-01-01T00:00:00Z' WHERE id=1");
    await submit(); expect(official()).toBeUndefined();
  });
  it('la validación dentro de D1 impide envíos incompletos y no deja eventos parciales', () => {
    expect(() => db.exec("INSERT INTO round_submissions(round_id,user_id,first_submitted_at,last_submitted_at) VALUES(1,'u',datetime('now'),datetime('now'))")).toThrow('Faltan completar');
    expect(events()).toHaveLength(0); expect(official()).toBeUndefined();
  });
  it('mantiene provisional/final y limpieza cuando el resultado deja de ser scorable', async () => {
    await ready(); result('1H'); await submit(); expect(points()).toBe(3);
    expect(db.prepare('SELECT is_provisional FROM prediction_scores').get()?.is_provisional).toBe(1);
    result('FT'); await recalculateRoundScores(1,env());
    expect(db.prepare('SELECT is_provisional FROM prediction_scores').get()?.is_provisional).toBe(0);
    result('NS'); await recalculateRoundScores(1,env()); expect(points()).toBe(0);
  });
  it('corrección Admin cambia oficial, recalcula y conserva motivo y autor', async () => {
    await ready(); result(); await submit();
    const response = await call('admin/rounds/1/users/u/matches/1/prediction','PUT',{homeScore:2,awayScore:0,reason:'Corrección de prueba'},'admin');
    expect(response?.status).toBe(200); expect(points()).toBe(1); expect(official()?.source).toBe('admin');
    expect(events()[1].actor_kind).toBe('admin');
    expect(JSON.parse(String(db.prepare("SELECT after_json FROM audit_log WHERE action='prediction.admin_override'").get()?.after_json)).reason).toBe('Corrección de prueba');
    await save(3); expect(official()?.predicted_home_score).toBe(2);
    await submit(); expect(events()[2].actor_kind).toBe('participant');
  });
  it('Admin no convierte a un no-presentado en participante de la fecha', async () => {
    const response = await call('admin/rounds/1/users/v/matches/1/prediction','PUT',{homeScore:1,awayScore:0,reason:'Prueba sin envío'},'admin');
    expect(response?.status).toBe(200); expect(points()).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM official_predictions').get()?.n).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM audit_log').get()?.n).toBe(1);
  });
  it('rechaza cambios y borrado del historial oficial', async () => {
    await ready(); await submit();
    expect(() => db.exec('DELETE FROM prediction_submission_events')).toThrow('append-only');
    expect(() => db.exec("UPDATE prediction_submission_events SET actor_kind='admin'")).toThrow('append-only');
  });
});

describe('privacidad y filtros', () => {
  it('participante sólo puede consultar su propio historial', async () => {
    await ready(); await submit();
    const response = await call('participant/rounds/1/prediction-history');
    const data = await response!.json() as any;
    expect(data.participants.map((participant: any) => participant.id)).toEqual(['u']);
    expect(data.events).toHaveLength(1);
    expect((await call('participant/rounds/1/prediction-history?userId=v'))?.status).toBe(403);
    expect((await call('admin/rounds/1/prediction-history?userId=v'))?.status).toBe(403);
  });
  it('Admin puede consultar cualquier participante y ver quién presentó', async () => {
    await ready(); await submit();
    const data = await (await call('admin/rounds/1/prediction-history?userId=u','GET',undefined,'admin'))!.json() as any;
    expect(data.events).toHaveLength(1);
    expect(data.participants.find((user: any) => user.id === 'u').count).toBe(1);
    expect(data.participants.find((user: any) => user.id === 'v').count).toBe(0);
    const other = await (await call('admin/rounds/1/prediction-history?userId=v','GET',undefined,'admin'))!.json() as any;
    expect(other.events).toHaveLength(0);
  });
  it('filtra tipo de evento en backend y rechaza tipos inválidos', async () => {
    await ready(); await submit(); await save(2); await submit();
    const data = await (await call('participant/rounds/1/prediction-history?type=PREDICTION_CHANGE'))!.json() as any;
    expect(data.events).toHaveLength(1); expect(data.events[0].fields).toEqual(['homeScore']);
    expect((await call('participant/rounds/1/prediction-history?type=BAD'))?.status).toBe(400);
  });
});

describe('compatibilidad y consistencia', () => {
  it('el ranking y revelado consumen el oficial, nunca el borrador pendiente', async () => {
    await ready(); result(); await submit(); await save(9);
    const ranking = await handleRanking(new Request('http://local/api/admin/ranking/1', { headers: { cookie: 'prode_session=admin' } }),env());
    expect(ranking?.status).toBe(200);
    const data = await ranking!.json() as any;
    expect(data.ranking[0].points).toBe(3);
    db.exec("UPDATE rounds SET status='finished' WHERE id=1");
    const round = await (await call('participant/round?roundId=1'))!.json() as any;
    expect(round.round.matches.find((match: any) => match.id === 1).prediction.homeScore).toBe(1);
  });
  it('migra el último snapshot enviado y conserva la auditoría antigua sin convertir autosaves en cambios oficiales', () => {
    const legacy = new DatabaseSync(':memory:');
    for (const file of readdirSync('migrations').filter((name) => name.endsWith('.sql') && name < '0005').sort()) legacy.exec(readFileSync(`migrations/${file}`,'utf8'));
    legacy.exec(`INSERT INTO users(id,full_name,phone_normalized,password_hash) VALUES('u','Prueba','0000','hash');
      INSERT INTO rounds(id,name,status) VALUES(1,'Legado','open');
      INSERT INTO matches(id,round_id,provider,provider_fixture_id,home_team_name,away_team_name,kickoff_at)
      VALUES(1,1,'local','1','Local','Visitante','2099-01-01T00:00:00Z');
      INSERT INTO predictions(user_id,match_id,predicted_home_score,predicted_away_score) VALUES('u',1,1,0);
      INSERT INTO round_submissions(round_id,user_id,first_submitted_at,last_submitted_at) VALUES(1,'u',datetime('now'),datetime('now'));
      UPDATE predictions SET predicted_home_score=7;`);
    legacy.exec(readFileSync('migrations/0005_official_predictions.sql','utf8'));
    expect(legacy.prepare('SELECT predicted_home_score FROM official_predictions').get()?.predicted_home_score).toBe(1);
    expect(legacy.prepare('SELECT predicted_home_score FROM predictions').get()?.predicted_home_score).toBe(7);
    expect(legacy.prepare('SELECT COUNT(*) AS n FROM prediction_history').get()?.n).toBe(2);
    expect(legacy.prepare('SELECT COUNT(*) AS n FROM prediction_submission_events').get()?.n).toBe(1);
    legacy.close();
  });
  it('un recálculo antiguo no pisa el puntaje de una nueva versión oficial', async () => {
    await ready(); result(); await submit();
    let changed = false;
    const base = adapter();
    const racing = { ...base, prepare(sql: string) {
      const statement = base.prepare(sql);
      if (!sql.includes('INSERT INTO prediction_scores')) return statement;
      return { bind(...args: unknown[]) {
        const bound = statement.bind(...args);
        return { async run() {
          if (!changed) { changed = true; await save(2); await submit(); }
          return bound.run();
        } };
      } };
    } } as unknown as D1Database;
    await recalculateRoundScores(1,{ DB: racing });
    expect(points()).toBe(1);
  });
});
