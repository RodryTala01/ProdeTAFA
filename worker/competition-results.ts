import type { Env } from './index';

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type ResultInput = {
  entryId?: number;
  stageId?: number | null;
  resultCode?: string;
  finalPosition?: number | null;
  detail?: unknown;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();
const RESULT_CODES = new Set([
  'CHAMPION',
  'RUNNER_UP',
  'THIRD',
  'SEMIFINAL',
  'QUARTERFINAL',
  'ROUND_OF_16',
  'ROUND_OF_32',
  'ROUND_OF_64',
  'PHASE_5',
  'PHASE_4',
  'PHASE_3',
  'PHASE_2',
  'GROUP_STAGE',
  'POSITION',
  'ELIMINATED',
  'QUALIFIED',
  'OTHER',
]);

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function error(message: string, status = 400) {
  return json({ error: message }, { status });
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function sessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const user = await env.DB.prepare(
    `SELECT u.id, u.role, u.is_active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND julianday(s.expires_at) > julianday('now')
       AND u.is_active = 1
     LIMIT 1`,
  ).bind(tokenHash).first<SessionUser>();
  return user ?? null;
}

async function readResults(env: Env, competitionId: number) {
  const competition = await env.DB.prepare(
    `SELECT c.id, c.code, c.display_name, c.status,
            s.season_number, s.name AS season_name
     FROM competitions c
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE c.id = ? LIMIT 1`,
  ).bind(competitionId).first<{
    id: number;
    code: string;
    display_name: string;
    status: string;
    season_number: number;
    season_name: string;
  }>();
  if (!competition) return null;

  const rows = await env.DB.prepare(
    `SELECT cr.id, cr.entry_id, cr.stage_id, cr.result_code, cr.final_position,
            cr.detail_json, cr.confirmed_at, u.full_name AS confirmed_by,
            ce.display_name AS entry_name, ce.entry_type,
            cs.name AS stage_name
     FROM competition_results cr
     LEFT JOIN users u ON u.id = cr.confirmed_by_user_id
     JOIN competition_entries ce ON ce.id = cr.entry_id
     LEFT JOIN competition_stages cs ON cs.id = cr.stage_id
     WHERE cr.competition_id = ?
     ORDER BY
       CASE WHEN cr.final_position IS NULL THEN 1 ELSE 0 END,
       cr.final_position,
       ce.display_name COLLATE NOCASE`,
  ).bind(competitionId).all<{
    id: number;
    entry_id: number;
    stage_id: number | null;
    result_code: string;
    final_position: number | null;
    detail_json: string | null;
    confirmed_at: string; confirmed_by: string;
    entry_name: string;
    entry_type: string;
    stage_name: string | null;
  }>();

  const results = [];
  for (const row of rows.results ?? []) {
    const members = await env.DB.prepare(
      `SELECT cem.user_id, u.full_name
       FROM competition_entry_members cem
       JOIN users u ON u.id = cem.user_id
       WHERE cem.entry_id = ?
       ORDER BY cem.id`,
    ).bind(row.entry_id).all<{ user_id: string; full_name: string }>();

    results.push({
      id: Number(row.id),
      entryId: Number(row.entry_id),
      entryName: row.entry_name,
      entryType: row.entry_type,
      stageId: row.stage_id == null ? null : Number(row.stage_id),
      stageName: row.stage_name,
      resultCode: row.result_code,
      finalPosition: row.final_position == null ? null : Number(row.final_position),
      detail: row.detail_json ? JSON.parse(row.detail_json) : null,
      confirmedAt: row.confirmed_at, confirmedBy: row.confirmed_by,
      members: (members.results ?? []).map((member) => ({
        userId: member.user_id,
        fullName: member.full_name,
      })),
    });
  }

  return {
    competition: {
      id: Number(competition.id),
      code: competition.code,
      displayName: competition.display_name,
      status: competition.status,
      seasonNumber: Number(competition.season_number),
      seasonName: competition.season_name,
    },
    results,
  };
}

async function resultEvidence(env: Env, competitionId: number) {
  const entries = await env.DB.prepare(`SELECT id AS entryId,display_name AS entryName,entry_type AS entryType FROM competition_entries WHERE competition_id=? ORDER BY id`).bind(competitionId).all<{entryId:number;entryName:string;entryType:string}>();
  const members = await env.DB.prepare(`SELECT m.entry_id AS entryId,m.user_id AS userId,u.full_name AS fullName,m.valid_from_round_id AS validFrom,m.valid_to_round_id AS validTo FROM competition_entry_members m JOIN users u ON u.id=m.user_id JOIN competition_entries e ON e.id=m.entry_id WHERE e.competition_id=? ORDER BY m.id`).bind(competitionId).all<{entryId:number;userId:string;fullName:string;validFrom:number|null;validTo:number|null}>();
  // Group fixtures may end in a draw; only knockout encounters need a confirmed winner.
  const encounters = await env.DB.prepare(`SELECT e.id,e.stage_id AS stageId,e.slot_key AS slotKey,e.entry_a_id AS entryAId,e.entry_b_id AS entryBId,e.winner_entry_id AS winnerId,e.status,e.admin_confirmed_at AS confirmedAt,s.code AS stageCode,s.sequence FROM competition_encounters e JOIN competition_stages s ON s.id=e.stage_id WHERE s.competition_id=? AND s.stage_type='KNOCKOUT' ORDER BY s.sequence,e.id`).bind(competitionId).all();
  const survival = await env.DB.prepare(`SELECT r.entry_id AS entryId,r.stage_id AS stageId,l.sequence,r.decision FROM competition_survival_results r JOIN competition_stages s ON s.id=r.stage_id JOIN competition_round_links l ON l.id=r.round_link_id WHERE s.competition_id=? ORDER BY l.sequence`).bind(competitionId).all();
  const groups = await env.DB.prepare(`SELECT ge.entry_id AS entryId,g.stage_id AS stageId FROM competition_group_entries ge JOIN competition_groups g ON g.id=ge.group_id JOIN competition_stages s ON s.id=g.stage_id WHERE s.competition_id=?`).bind(competitionId).all();
  return {entries:(entries.results??[]).map(e=>({...e,members:(members.results??[]).filter(m=>m.entryId===e.entryId)})),encounters:(encounters.results??[]) as {status:string;confirmedAt:string|null;winnerId:number|null}[],survival:survival.results??[],groups:groups.results??[]};
}

async function prepareLeagueResults(env: Env, user: SessionUser, competitionId: number) {
  const c = await env.DB.prepare(`SELECT c.season_id,c.division_id,c.code,c.status,s.status AS season_status
    FROM competitions c JOIN tafa_seasons s ON s.id=c.season_id WHERE c.id=?`).bind(competitionId)
    .first<{season_id:number;division_id:number;code:string;status:string;season_status:string}>();
  if (!c) return error('Competición no encontrada',404);
  if (!['LIGA_A','LIGA_B'].includes(c.code)) return error('Esta preparación corresponde sólo a Liga',409);
  if ([c.status,c.season_status].includes('archived')) return error('La temporada o competición está archivada',409);
  const rounds = await env.DB.prepare(`SELECT r.status FROM competition_round_links l JOIN rounds r ON r.id=l.round_id
    JOIN competition_stages s ON s.id=l.stage_id WHERE s.competition_id=? AND s.stage_type='LEAGUE_TABLE' AND l.purpose='NORMAL'`).bind(competitionId).all<{status:string}>();
  if (rounds.results.length!==5 || rounds.results.some(r=>r.status!=='finished')) return error('La Liga necesita sus cinco Fechas finalizadas',409);
  const members = await env.DB.prepare(`SELECT u.id,u.full_name FROM season_division_members m JOIN users u ON u.id=m.user_id
    WHERE m.season_id=? AND m.division_id=? ORDER BY u.id`).bind(c.season_id,c.division_id).all<{id:string;full_name:string}>();
  const existing = await resultEvidence(env,competitionId);
  if (existing.entries.some(e=>e.entryType!=='INDIVIDUAL'||e.members.length!==1||!members.results.some(m=>m.id===e.members[0].userId)))
    return error('Las entradas históricas de Liga no coinciden con la división; requiere revisión Admin',409);
  const statements:D1PreparedStatement[]=[];
  for (const m of members.results) {
    if (existing.entries.some(e=>e.members.some(member=>member.userId===m.id))) continue;
    const source=JSON.stringify({leagueResultUserId:m.id});
    statements.push(env.DB.prepare(`INSERT INTO competition_entries(competition_id,entry_type,display_name,source_json)
      SELECT ?,'INDIVIDUAL',?,? WHERE NOT EXISTS (SELECT 1 FROM competition_entries e JOIN competition_entry_members m ON m.entry_id=e.id WHERE e.competition_id=? AND m.user_id=?)`)
      .bind(competitionId,m.full_name,source,competitionId,m.id));
    statements.push(env.DB.prepare(`INSERT INTO competition_entry_members(entry_id,user_id)
      SELECT e.id,? FROM competition_entries e WHERE e.competition_id=? AND e.source_json=?
      AND NOT EXISTS (SELECT 1 FROM competition_entry_members m WHERE m.entry_id=e.id AND m.user_id=?)`).bind(m.id,competitionId,source,m.id));
  }
  if (statements.length) {
    statements.push(env.DB.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_json)
      VALUES (?,'competition.league_result_entries_prepared','competition',?,?)`).bind(user.id,String(competitionId),JSON.stringify({userIds:members.results.map(m=>m.id)})));
    await env.DB.batch(statements);
  }
  return json({...await readResults(env,competitionId),...await resultEvidence(env,competitionId)});
}

async function replaceResults(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await env.DB.prepare(
    `SELECT c.id, c.status, c.season_id, s.status AS season_status
     FROM competitions c
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE c.id = ? LIMIT 1`,
  ).bind(competitionId).first<{
    id: number;
    status: string;
    season_id: number;
    season_status: string;
  }>();
  if (!competition) return error('Competición no encontrada', 404);
  if (competition.status === 'archived' || competition.season_status === 'archived') {
    return error('Una competición archivada no admite cambios de resultados', 409);
  }

  const body = await request.json().catch(() => null) as { results?: ResultInput[] } | null;
  if (!Array.isArray(body?.results)) return error('Resultados inválidos');

  const seenEntries = new Set<number>();
  const normalized: Array<{
    entryId: number;
    stageId: number | null;
    resultCode: string;
    finalPosition: number | null;
    detailJson: string | null;
  }> = [];

  for (const raw of body.results) {
    const entryId = Number(raw.entryId);
    if (!Number.isInteger(entryId) || entryId <= 0) return error('Hay una entrada inválida');
    if (seenEntries.has(entryId)) return error('Una entrada no puede tener dos resultados finales');

    const entry = await env.DB.prepare(
      `SELECT id FROM competition_entries WHERE id = ? AND competition_id = ? LIMIT 1`,
    ).bind(entryId, competitionId).first<{ id: number }>();
    if (!entry) return error('Hay una entrada que no pertenece a esta competición');

    let stageId: number | null = null;
    if (raw.stageId != null) {
      stageId = Number(raw.stageId);
      if (!Number.isInteger(stageId) || stageId <= 0) return error('Etapa inválida');
      const stage = await env.DB.prepare(
        `SELECT id FROM competition_stages WHERE id = ? AND competition_id = ? LIMIT 1`,
      ).bind(stageId, competitionId).first<{ id: number }>();
      if (!stage) return error('La etapa indicada no pertenece a esta competición');
    }

    const resultCode = raw.resultCode?.trim().toUpperCase() ?? '';
    if (!RESULT_CODES.has(resultCode)) return error(`Código de resultado no permitido: ${resultCode || '(vacío)'}`);

    let finalPosition: number | null = null;
    if (raw.finalPosition != null) {
      finalPosition = Number(raw.finalPosition);
      if (!Number.isInteger(finalPosition) || finalPosition <= 0) return error('Posición final inválida');
    }

    let detailJson: string | null = null;
    if (raw.detail !== undefined) detailJson = JSON.stringify(raw.detail);

    seenEntries.add(entryId);
    normalized.push({ entryId, stageId, resultCode, finalPosition, detailJson });
  }

  const evidence = await resultEvidence(env, competitionId);
  const pending = await env.DB.prepare(`SELECT 1 FROM competition_round_links l JOIN rounds r ON r.id=l.round_id
    WHERE l.competition_id=? AND r.status<>'finished' LIMIT 1`).bind(competitionId).first();
  if (pending) return error('Hay Fechas vinculadas sin finalizar',409);
  if (!normalized.length || normalized.length !== evidence.entries.length) return error('Confirmá un snapshot completo: una fila por entrada',409);
  if (evidence.encounters.some(e=>e.status!=='finished'||!e.confirmedAt||!e.winnerId)) return error('Hay encuentros sin ganador confirmado',409);
  for (const row of normalized) {
    const entry = evidence.entries.find(e=>e.entryId===row.entryId)!;
    const ids = [...new Set(entry.members.map(m=>m.userId))];
    if (entry.entryType==='DUO' && ids.length>2) {
      const detail = row.detailJson ? JSON.parse(row.detailJson) : null;
      const chosen = detail?.iffhsUserIds;
      if (!Array.isArray(chosen) || !chosen.length || new Set(chosen).size!==chosen.length || chosen.some(id=>!ids.includes(id))) return error('Elegí explícitamente los integrantes históricos que reciben IFFHS',409);
    }
  }
  const before = await readResults(env, competitionId);
  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM competition_results WHERE competition_id = ?').bind(competitionId),
  ];
  for (const result of normalized) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO competition_results
           (competition_id, entry_id, stage_id, result_code, final_position,
            detail_json, confirmed_by_user_id, confirmed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      ).bind(
        competitionId,
        result.entryId,
        result.stageId,
        result.resultCode,
        result.finalPosition,
        result.detailJson,
        user.id,
      ),
    );
  }
  statements.push(env.DB.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json) VALUES (?,?,'competition',?,?,?)`).bind(user.id,'competition.results_confirmed',String(competitionId),JSON.stringify(before?.results??[]),JSON.stringify(normalized.map(r=>({...r,detail:r.detailJson?JSON.parse(r.detailJson):null})))));
  await env.DB.batch(statements);
  const after = await readResults(env, competitionId);

  return json(after);
}

export async function handleCompetitionResults(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const publicMatch = pathname.match(/^\/api\/competition-engine\/competitions\/(\d+)\/results$/);
  if (publicMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const payload = await readResults(env, Number(publicMatch[1]));
    return payload ? json(user.role==='admin' ? {...payload,...await resultEvidence(env,Number(publicMatch[1]))} : payload) : error('Competición no encontrada', 404);
  }

  const adminMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/results$/);
  if (adminMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method === 'POST') return prepareLeagueResults(env,user,Number(adminMatch[1]));
    if (request.method !== 'PUT') return error('Método no permitido', 405);
    return replaceResults(request, env, user, Number(adminMatch[1]));
  }

  return null;
}
