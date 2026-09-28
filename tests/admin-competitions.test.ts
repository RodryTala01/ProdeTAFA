import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import CompetitionConfigPanel from '../src/CompetitionConfigPanel';
import { initialSeasonId, STAGE_OPTIONS } from '../src/competition-presentation';
import { handleCompetitionConfig } from '../worker/competition-config';
import { handleCompetitionEngine } from '../worker/competitions';

describe('Admin Competiciones: presentación', () => {
  it('elige la temporada activa aunque la más reciente sea un borrador, sin asumir su ID', () => {
    expect(initialSeasonId([{ id: 91, status: 'draft' }, { id: 47, status: 'active' }])).toBe(47);
    expect(initialSeasonId([{ id: 91, status: 'draft' }])).toBe(91);
    expect(initialSeasonId([])).toBeNull();
  });
  it('conserva acceso Admin y lista/detalle basados en Competition Engine', () => {
    const app = readFileSync('src/AppV2.tsx', 'utf8');
    const ui = readFileSync('src/AdminCompetitions.tsx', 'utf8');
    expect(app).toContain('>Competiciones</button>');
    expect(app).toContain('<AdminCompetitions />');
    expect(ui).toContain("'/api/admin/competition-engine'");
    expect(ui).toContain('selected.competitions.filter');
    expect(ui).toContain('setSelectedCompetitionId(competition.id)');
    expect(ui).toContain('Volver a competiciones');
    expect(ui).not.toMatch(/seasons\/32|competitions\/\d/);
  });
  it('renderiza los cinco tipos controlados, etapas ordenadas y sus Fechas', () => {
    const html = renderToStaticMarkup(createElement(CompetitionConfigPanel, {
      competition: { id: 123, code: 'COPA_PAPA', canonicalName: 'Copa Papa', displayName: 'Copa Miguel Ángel Russo', status: 'draft',
        stages: [
          { id: 10, code: 'FINAL', name: 'Final', stageType: 'KNOCKOUT', sequence: 2, status: 'draft' },
          { id: 8, code: 'GRUPOS', name: 'Fase inicial', stageType: 'ACCUMULATIVE_GROUPS', sequence: 1, status: 'active' },
        ], roundLinks: [{ id: 3, stageId: 8, sequence: 1, roundName: 'Fecha Copa local', roundStatus: 'open' }] },
      onChanged() {},
    }));
    expect(STAGE_OPTIONS.map((option) => option.value)).toEqual(['LEAGUE_TABLE', 'ACCUMULATIVE_GROUPS', 'ROUND_ROBIN_GROUPS', 'SURVIVAL_TABLE', 'KNOCKOUT']);
    for (const option of STAGE_OPTIONS) expect(html).toContain(`value="${option.value}"`);
    expect(html).toContain('Copa Miguel Ángel Russo');
    expect(html).toContain('Fecha Copa local');
    expect(html.indexOf('<strong>Fase inicial')).toBeLessThan(html.indexOf('<strong>Final'));
    expect(html).toContain('Editar Fase inicial');
    expect(html).toMatch(/disabled="">Eliminar Fase inicial/);
  });
});

let db: DatabaseSync;
function env() {
  return { DB: { prepare(sql: string) {
    let values: (number | string | null)[] = [];
    return {
      bind(...args: typeof values) { values = args; return this; },
      async first() { return db.prepare(sql).get(...values) ?? null; },
      async all() { return { results: db.prepare(sql).all(...values) }; },
      async run() { const r = db.prepare(sql).run(...values); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    };
  } } as unknown as D1Database };
}
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations').filter((f) => f.endsWith('.sql')).sort()) db.exec(readFileSync(`migrations/${file}`, 'utf8'));
  for (const role of ['admin', 'participant']) {
    db.prepare('INSERT INTO users(id,full_name,phone_normalized,password_hash,role) VALUES (?,?,?,?,?)').run(role, role, role, 'hash', role);
    db.prepare("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,'2099-01-01')").run(role, role, createHash('sha256').update(role).digest('hex'));
  }
  db.exec(`INSERT INTO tafa_seasons(id,season_number,name,status) VALUES (47,32,'Temporada 32','active');
    INSERT INTO competitions(id,season_id,code,canonical_name,display_name,family) VALUES (123,47,'COPA_PAPA','Copa Papa','Copa Papa','CUP');`);
});
afterEach(() => db.close());
async function call(path: string, method: string, body?: object, role = 'admin') {
  return handleCompetitionConfig(new Request(`http://local/api/admin/competition-engine/${path}`, {
    method, headers: { cookie: `prode_session=${role}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }), env());
}
describe('contrato real de edición usado por Admin', () => {
  it('lista la competición y renombra Copa Papa sin cambiar el código, con auditoría', async () => {
    const response = await handleCompetitionEngine(new Request('http://local/api/admin/competition-engine', { headers: { cookie: 'prode_session=admin' } }), env());
    const data = await response!.json() as any;
    expect(data.seasons[0].id).toBe(47);
    expect(data.seasons[0].competitions[0]).toMatchObject({ id: 123, code: 'COPA_PAPA', stageCount: 0 });
    expect((await call('competitions/123', 'PUT', { displayName: 'Copa Miguel Ángel Russo', status: 'draft' }))!.status).toBe(200);
    expect(db.prepare('SELECT code,display_name FROM competitions WHERE id=123').get()).toMatchObject({ code: 'COPA_PAPA', display_name: 'Copa Miguel Ángel Russo' });
    expect(db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action='competition.updated'").get()?.n).toBe(1);
  });
  it('crea, edita y elimina una etapa libre, rechazando tipos arbitrarios', async () => {
    expect((await call('competitions/123/stages', 'POST', { name: 'Invalid', stageType: 'ARBITRARY' }))!.status).toBe(400);
    const created = await call('competitions/123/stages', 'POST', { name: 'Final', stageType: 'KNOCKOUT' });
    expect(created!.status).toBe(201);
    const { stage } = await created!.json() as any;
    expect((await call(`stages/${stage.id}`, 'PUT', { name: 'Final de Copa', status: 'active' }))!.status).toBe(200);
    expect(db.prepare('SELECT name,status FROM competition_stages WHERE id=?').get(stage.id)).toMatchObject({ name: 'Final de Copa', status: 'active' });
    expect((await call(`stages/${stage.id}`, 'DELETE'))!.status).toBe(200);
  });
  it('rechaza eliminar etapas con Fechas y editar temporadas cerradas', async () => {
    db.exec(`INSERT INTO competition_stages(id,competition_id,code,name,stage_type,sequence) VALUES (8,123,'FINAL','Final','KNOCKOUT',1);
      INSERT INTO rounds(id,name) VALUES (99,'Fecha local');
      INSERT INTO competition_round_links(competition_id,stage_id,round_id,sequence) VALUES (123,8,99,1);`);
    expect((await call('stages/8', 'DELETE'))!.status).toBe(409);
    db.exec("UPDATE tafa_seasons SET status='finished' WHERE id=47");
    expect((await call('competitions/123', 'PUT', { displayName: 'Otro' }))!.status).toBe(409);
    expect((await call('stages/8', 'PUT', { name: 'Otra' }))!.status).toBe(409);
  });
  it('impide a participantes editar competiciones', async () => {
    expect((await call('competitions/123', 'PUT', { displayName: 'Otro' }, 'participant'))!.status).toBe(403);
  });
});
