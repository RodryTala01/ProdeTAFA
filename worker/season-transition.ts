import type { Env } from './index';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type Assignment = {
  userId: string;
  fullName: string;
  fromDivisionCode: 'A' | 'B';
  proposedDivisionCode: 'A' | 'B';
  proposalSource: string;
  proposalReason: string | null;
  requiresReview: boolean;
};

type CompetitionTemplate = {
  code: string;
  canonicalName: string;
  family: 'LEAGUE' | 'CUP' | 'PROMOTION';
  divisionCode: 'A' | 'B' | null;
  sortOrder: number;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();

const COMPETITION_TEMPLATE: CompetitionTemplate[] = [
  { code: 'LIGA_A', canonicalName: 'Liga A', family: 'LEAGUE', divisionCode: 'A', sortOrder: 10 },
  { code: 'LIGA_B', canonicalName: 'Liga B', family: 'LEAGUE', divisionCode: 'B', sortOrder: 20 },
  { code: 'COPA_A', canonicalName: 'Copa A', family: 'CUP', divisionCode: 'A', sortOrder: 30 },
  { code: 'COPA_B', canonicalName: 'Copa B', family: 'CUP', divisionCode: 'B', sortOrder: 40 },
  { code: 'COPA_TOTAL', canonicalName: 'Copa Total', family: 'CUP', divisionCode: null, sortOrder: 50 },
  { code: 'COPA_DUOS', canonicalName: 'Copa Dúos', family: 'CUP', divisionCode: null, sortOrder: 60 },
  { code: 'COPA_CAMPEONES', canonicalName: 'Copa Campeones', family: 'CUP', divisionCode: null, sortOrder: 70 },
  { code: 'COPA_PAPA', canonicalName: 'Copa Papa', family: 'CUP', divisionCode: null, sortOrder: 80 },
  { code: 'PROMOCION', canonicalName: 'Promoción', family: 'PROMOTION', divisionCode: null, sortOrder: 90 },
];

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}
function error(message: string, status = 400) { return json({ error: message }, { status }); }
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
  const row = await env.DB.prepare(
    `SELECT u.id,u.role,u.is_active
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1
     LIMIT 1`,
  ).bind(await sha256(token)).first<SessionUser>();
  return row ?? null;
}
async function audit(env: Env, actor: string, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json)
     VALUES (?,?,?,?,?,?)`,
  ).bind(
    actor, action, entityType, entityId,
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after),
  ).run();
}

async function readPlan(env: Env, planId: number) {
  const plan = await env.DB.prepare(
    `SELECT stp.id,stp.source_season_id,stp.target_season_number,stp.status,stp.issues_json,
            stp.created_at,stp.confirmed_at,stp.applied_at,
            s.season_number AS source_season_number,s.name AS source_season_name
     FROM season_transition_plans stp
     JOIN tafa_seasons s ON s.id=stp.source_season_id
     WHERE stp.id=? LIMIT 1`,
  ).bind(planId).first<{
    id: number; source_season_id: number; target_season_number: number; status: string; issues_json: string | null;
    created_at: string; confirmed_at: string | null; applied_at: string | null;
    source_season_number: number; source_season_name: string;
  }>();
  if (!plan) return null;
  const assignments = await env.DB.prepare(
    `SELECT sta.user_id,u.full_name,sta.from_division_code,sta.proposed_division_code,
            sta.confirmed_division_code,sta.proposal_source,sta.proposal_reason,
            sta.requires_review,sta.confirmation_reason
     FROM season_transition_assignments sta
     JOIN users u ON u.id=sta.user_id
     WHERE sta.plan_id=?
     ORDER BY sta.from_division_code,u.full_name COLLATE NOCASE`,
  ).bind(planId).all<{
    user_id: string; full_name: string; from_division_code: string; proposed_division_code: string;
    confirmed_division_code: string | null; proposal_source: string; proposal_reason: string | null;
    requires_review: number; confirmation_reason: string | null;
  }>();
  return {
    id: Number(plan.id),
    sourceSeasonId: Number(plan.source_season_id),
    sourceSeasonNumber: Number(plan.source_season_number),
    sourceSeasonName: plan.source_season_name,
    targetSeasonNumber: Number(plan.target_season_number),
    status: plan.status,
    issues: plan.issues_json ? JSON.parse(plan.issues_json) : [],
    createdAt: plan.created_at,
    confirmedAt: plan.confirmed_at,
    appliedAt: plan.applied_at,
    assignments: (assignments.results ?? []).map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      fromDivisionCode: row.from_division_code,
      proposedDivisionCode: row.proposed_division_code,
      confirmedDivisionCode: row.confirmed_division_code,
      proposalSource: row.proposal_source,
      proposalReason: row.proposal_reason,
      requiresReview: Boolean(row.requires_review),
      confirmationReason: row.confirmation_reason,
    })),
  };
}

async function leaguePositions(env: Env, seasonId: number, competitionCode: 'LIGA_A' | 'LIGA_B') {
  const competition = await env.DB.prepare(
    `SELECT id,status FROM competitions WHERE season_id=? AND code=? LIMIT 1`,
  ).bind(seasonId, competitionCode).first<{ id: number; status: string }>();
  if (!competition) return { ok: false as const, error: `${competitionCode} no existe` };
  if (competition.status !== 'finished') return { ok: false as const, error: `${competitionCode} todavía no está finalizada` };
  const rows = await env.DB.prepare(
    `SELECT cem.user_id,cr.final_position
     FROM competition_results cr
     JOIN competition_entries ce ON ce.id=cr.entry_id AND ce.entry_type='INDIVIDUAL'
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     WHERE cr.competition_id=? AND cr.final_position IS NOT NULL
     ORDER BY cr.final_position`,
  ).bind(competition.id).all<{ user_id: string; final_position: number }>();
  return {
    ok: true as const,
    positions: new Map((rows.results ?? []).map((row) => [row.user_id, Number(row.final_position)])),
  };
}

async function cupChampion(env: Env, seasonId: number, code: 'COPA_A' | 'COPA_B') {
  const competition = await env.DB.prepare(
    `SELECT id,status FROM competitions WHERE season_id=? AND code=? LIMIT 1`,
  ).bind(seasonId, code).first<{ id: number; status: string }>();
  if (!competition) return { exists: false as const, userId: null, error: null };
  const entries = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_entries WHERE competition_id=?`,
  ).bind(competition.id).first<{ total: number }>();
  if (Number(entries?.total ?? 0) === 0) return { exists: false as const, userId: null, error: null };
  if (competition.status !== 'finished') {
    return { exists: true as const, userId: null, error: `${code} todavía no está finalizada` };
  }
  const winner = await env.DB.prepare(
    `SELECT cem.user_id
     FROM competition_results cr
     JOIN competition_entries ce ON ce.id=cr.entry_id
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     WHERE cr.competition_id=? AND (cr.result_code='CHAMPION' OR cr.final_position=1)
     ORDER BY CASE WHEN cr.result_code='CHAMPION' THEN 0 ELSE 1 END,cr.confirmed_at DESC,cem.id
     LIMIT 1`,
  ).bind(competition.id).first<{ user_id: string }>();
  if (!winner) return { exists: true as const, userId: null, error: `${code} no tiene campeón confirmado` };
  return { exists: true as const, userId: winner.user_id, error: null };
}

async function generatePlan(env: Env, user: SessionUser, sourceSeasonId: number) {
  const season = await env.DB.prepare(
    `SELECT id,season_number,name,status FROM tafa_seasons WHERE id=? LIMIT 1`,
  ).bind(sourceSeasonId).first<{ id: number; season_number: number; name: string; status: string }>();
  if (!season) return error('Temporada origen no encontrada', 404);

  const existing = await env.DB.prepare(
    `SELECT id,status FROM season_transition_plans WHERE source_season_id=? LIMIT 1`,
  ).bind(sourceSeasonId).first<{ id: number; status: string }>();
  if (existing && existing.status !== 'cancelled') {
    const payload = await readPlan(env, Number(existing.id));
    return json({ ok: true, reused: true, plan: payload });
  }

  const members = await env.DB.prepare(
    `SELECT sdm.user_id,u.full_name,sd.code AS division_code
     FROM season_division_members sdm
     JOIN users u ON u.id=sdm.user_id
     JOIN season_divisions sd ON sd.id=sdm.division_id
     WHERE sdm.season_id=? AND sd.code IN ('A','B')
     ORDER BY sd.sort_order,u.full_name COLLATE NOCASE`,
  ).bind(sourceSeasonId).all<{ user_id: string; full_name: string; division_code: 'A' | 'B' }>();
  const roster = members.results ?? [];
  if (roster.length === 0) return error('La temporada no tiene participantes asignados a Liga A/B', 409);

  const [ligaA, ligaB] = await Promise.all([
    leaguePositions(env, sourceSeasonId, 'LIGA_A'),
    leaguePositions(env, sourceSeasonId, 'LIGA_B'),
  ]);
  if (!ligaA.ok) return error(ligaA.error, 409);
  if (!ligaB.ok) return error(ligaB.error, 409);

  const aMembers = roster.filter((row) => row.division_code === 'A');
  const bMembers = roster.filter((row) => row.division_code === 'B');
  if (ligaA.positions.size !== aMembers.length || ligaB.positions.size !== bMembers.length) {
    return error('Las posiciones finales de Liga A/B no cubren exactamente a todos los participantes de las divisiones', 409);
  }

  const assignments = new Map<string, Assignment>();
  const aCount = aMembers.length;
  for (const member of roster) {
    const position = member.division_code === 'A'
      ? ligaA.positions.get(member.user_id)
      : ligaB.positions.get(member.user_id);
    if (!position) return error(`Falta posición final para ${member.full_name}`, 409);

    let proposed: 'A' | 'B';
    let source: string;
    let reason: string;
    if (member.division_code === 'A') {
      const directRelegation = position > Math.max(0, aCount - 2);
      proposed = directRelegation ? 'B' : 'A';
      source = directRelegation ? 'LEAGUE_DIRECT_RELEGATION' : 'LEAGUE_STAY';
      reason = directRelegation ? `Liga A posición ${position}: descenso directo base` : `Liga A posición ${position}: permanencia base`;
    } else {
      const directPromotion = position === 1;
      proposed = directPromotion ? 'A' : 'B';
      source = directPromotion ? 'LEAGUE_DIRECT_PROMOTION' : 'LEAGUE_STAY';
      reason = directPromotion ? 'Campeón/1.º Liga B: ascenso directo base' : `Liga B posición ${position}: permanece en B como base`;
    }
    assignments.set(member.user_id, {
      userId: member.user_id,
      fullName: member.full_name,
      fromDivisionCode: member.division_code,
      proposedDivisionCode: proposed,
      proposalSource: source,
      proposalReason: reason,
      requiresReview: false,
    });
  }

  const promotionRows = await env.DB.prepare(
    `SELECT sdm.user_id,td.code AS target_code,sdm.reason
     FROM season_division_movements sdm
     JOIN season_divisions td ON td.id=sdm.to_division_id
     WHERE sdm.season_id=? AND sdm.status IN ('proposed','confirmed')
       AND sdm.reason LIKE 'PROMOCION:%'
     ORDER BY sdm.id`,
  ).bind(sourceSeasonId).all<{ user_id: string; target_code: string; reason: string }>();
  for (const movement of promotionRows.results ?? []) {
    const current = assignments.get(movement.user_id);
    if (!current || !['A','B'].includes(movement.target_code)) continue;
    current.proposedDivisionCode = movement.target_code as 'A' | 'B';
    current.proposalSource = 'PROMOTION_RESULT';
    current.proposalReason = movement.reason;
  }

  const [copaA, copaB] = await Promise.all([
    cupChampion(env, sourceSeasonId, 'COPA_A'),
    cupChampion(env, sourceSeasonId, 'COPA_B'),
  ]);
  if (copaA.error) return error(copaA.error, 409);
  if (copaB.error) return error(copaB.error, 409);

  if (copaA.userId) {
    const champion = assignments.get(copaA.userId);
    if (champion) {
      const changed = champion.proposedDivisionCode !== 'A';
      champion.proposedDivisionCode = 'A';
      champion.proposalSource = changed ? 'COPA_A_GUARANTEE_OVERRIDE' : `${champion.proposalSource}+COPA_A_GUARANTEE`;
      champion.proposalReason = changed
        ? 'Campeón Copa A: permanencia garantizada; el corrimiento restante requiere revisión Admin'
        : 'Campeón Copa A: permanencia garantizada';
      champion.requiresReview = champion.requiresReview || changed;
    }
  }

  if (copaB.userId) {
    const champion = assignments.get(copaB.userId);
    if (champion) {
      const changed = champion.proposedDivisionCode !== 'A';
      champion.proposedDivisionCode = 'A';
      champion.proposalSource = changed ? 'COPA_B_GUARANTEE_OVERRIDE' : `${champion.proposalSource}+COPA_B_GUARANTEE`;
      champion.proposalReason = changed
        ? 'Campeón Copa B: ascenso garantizado; el cupo liberado/corrimiento requiere revisión Admin'
        : 'Campeón Copa B: ascenso garantizado';
      champion.requiresReview = champion.requiresReview || changed;
    }
  }

  const proposedA = [...assignments.values()].filter((row) => row.proposedDivisionCode === 'A').length;
  const issues: Array<{ code: string; message: string; userIds?: string[] }> = [];
  const reviewUsers = [...assignments.values()].filter((row) => row.requiresReview).map((row) => row.userId);
  if (reviewUsers.length > 0) {
    issues.push({
      code: 'CUP_GUARANTEE_SHIFT_REVIEW',
      message: 'Copa A/B modificó un destino base. Confirmá manualmente el corrimiento de los demás cupos.',
      userIds: reviewUsers,
    });
  }
  if (proposedA !== aCount) {
    issues.push({
      code: 'LIGA_A_SIZE_MISMATCH',
      message: `La propuesta deja ${proposedA} participantes en Liga A; T${season.season_number} tenía ${aCount}. Ajustá los corrimientos antes de confirmar.`,
    });
  }

  const targetSeasonNumber = Number(season.season_number) + 1;
  const created = await env.DB.prepare(
    `INSERT INTO season_transition_plans
       (source_season_id,target_season_number,status,issues_json,created_by_user_id)
     VALUES (?,?, 'draft', ?, ?) RETURNING id`,
  ).bind(sourceSeasonId, targetSeasonNumber, JSON.stringify(issues), user.id).first<{ id: number }>();
  if (!created) return error('No se pudo crear el plan de transición', 500);

  for (const assignment of assignments.values()) {
    await env.DB.prepare(
      `INSERT INTO season_transition_assignments
         (plan_id,user_id,from_division_code,proposed_division_code,proposal_source,
          proposal_reason,requires_review)
       VALUES (?,?,?,?,?,?,?)`,
    ).bind(
      created.id,
      assignment.userId,
      assignment.fromDivisionCode,
      assignment.proposedDivisionCode,
      assignment.proposalSource,
      assignment.proposalReason,
      assignment.requiresReview ? 1 : 0,
    ).run();
  }

  const payload = await readPlan(env, Number(created.id));
  await audit(env, user.id, 'season_transition.generated', 'season_transition_plan', String(created.id), null, payload);
  return json({ ok: true, reused: false, plan: payload }, { status: 201 });
}

async function confirmPlan(request: Request, env: Env, user: SessionUser, planId: number) {
  const plan = await readPlan(env, planId);
  if (!plan) return error('Plan de transición no encontrado', 404);
  if (plan.status !== 'draft') return error('Sólo se puede confirmar un plan en borrador', 409);

  const body = await request.json().catch(() => null) as {
    assignments?: Array<{ userId?: string; divisionCode?: string; reason?: string | null }>;
  } | null;
  if (!Array.isArray(body?.assignments)) return error('Asignaciones inválidas');
  const incoming = new Map<string, { divisionCode: 'A' | 'B'; reason: string | null }>();
  for (const raw of body.assignments) {
    const userId = raw.userId?.trim() ?? '';
    const code = raw.divisionCode?.trim().toUpperCase() ?? '';
    if (!userId || !['A','B'].includes(code) || incoming.has(userId)) return error('Hay una asignación inválida o duplicada');
    incoming.set(userId, { divisionCode: code as 'A' | 'B', reason: raw.reason?.trim() || null });
  }
  if (incoming.size !== plan.assignments.length || plan.assignments.some((row) => !incoming.has(row.userId))) {
    return error('La confirmación debe incluir exactamente a todos los participantes del plan', 409);
  }

  for (const row of plan.assignments) {
    const requested = incoming.get(row.userId)!;
    const changed = requested.divisionCode !== row.proposedDivisionCode;
    if ((changed || row.requiresReview) && !requested.reason) {
      return error(`Indicá el motivo de confirmación/corrimiento para ${row.fullName}`, 409);
    }
  }

  for (const row of plan.assignments) {
    const requested = incoming.get(row.userId)!;
    await env.DB.prepare(
      `UPDATE season_transition_assignments
       SET confirmed_division_code=?,confirmation_reason=?,updated_at=datetime('now')
       WHERE plan_id=? AND user_id=?`,
    ).bind(requested.divisionCode, requested.reason, planId, row.userId).run();
  }
  await env.DB.prepare(
    `UPDATE season_transition_plans
     SET status='confirmed',confirmed_by_user_id=?,confirmed_at=datetime('now'),updated_at=datetime('now')
     WHERE id=?`,
  ).bind(user.id, planId).run();

  const after = await readPlan(env, planId);
  await audit(env, user.id, 'season_transition.confirmed', 'season_transition_plan', String(planId), plan, after);
  return json({ ok: true, plan: after });
}

function seasonIdSql() {
  return '(SELECT id FROM tafa_seasons WHERE season_number=? LIMIT 1)';
}

async function createTargetSeason(env: Env, seasonNumber: number) {
  const name = `Temporada ${seasonNumber}`;
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`INSERT INTO tafa_seasons(season_number,name) VALUES (?,?)`).bind(seasonNumber, name),
    env.DB.prepare(`INSERT INTO season_divisions(season_id,code,name,sort_order) VALUES (${seasonIdSql()},'A','Liga A',10)`).bind(seasonNumber),
    env.DB.prepare(`INSERT INTO season_divisions(season_id,code,name,sort_order) VALUES (${seasonIdSql()},'B','Liga B',20)`).bind(seasonNumber),
  ];
  for (const competition of COMPETITION_TEMPLATE) {
    const divisionSql = competition.divisionCode
      ? `(SELECT d.id FROM season_divisions d WHERE d.season_id=${seasonIdSql()} AND d.code=? LIMIT 1)`
      : 'NULL';
    const sql = `INSERT INTO competitions
      (season_id,division_id,code,canonical_name,display_name,family,sort_order)
      VALUES (${seasonIdSql()},${divisionSql},?,?,?,?,?)`;
    const bindings: Array<string | number> = [seasonNumber];
    if (competition.divisionCode) bindings.push(seasonNumber, competition.divisionCode);
    bindings.push(competition.code, competition.canonicalName, competition.canonicalName, competition.family, competition.sortOrder);
    statements.push(env.DB.prepare(sql).bind(...bindings));
  }
  statements.push(
    env.DB.prepare(
      `INSERT INTO competition_stages(competition_id,code,name,stage_type,sequence)
       SELECT c.id,'LIGA','Liga','LEAGUE_TABLE',1
       FROM competitions c JOIN tafa_seasons s ON s.id=c.season_id
       WHERE s.season_number=? AND c.code IN ('LIGA_A','LIGA_B')`,
    ).bind(seasonNumber),
  );
  await env.DB.batch(statements);
  return env.DB.prepare(`SELECT id FROM tafa_seasons WHERE season_number=? LIMIT 1`)
    .bind(seasonNumber).first<{ id: number }>();
}

async function applyPlan(env: Env, user: SessionUser, planId: number) {
  const plan = await readPlan(env, planId);
  if (!plan) return error('Plan de transición no encontrado', 404);
  if (plan.status !== 'confirmed') return error('El plan debe estar confirmado antes de aplicarlo', 409);
  if (plan.assignments.some((row) => !row.confirmedDivisionCode)) return error('Faltan destinos confirmados', 409);

  const existingTarget = await env.DB.prepare(
    `SELECT id FROM tafa_seasons WHERE season_number=? LIMIT 1`,
  ).bind(plan.targetSeasonNumber).first<{ id: number }>();
  if (existingTarget) return error(`T${plan.targetSeasonNumber} ya existe; no se aplica el plan automáticamente sobre una temporada existente`, 409);

  const iffhsCount = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM iffhs_season_totals WHERE season_number=?`,
  ).bind(plan.sourceSeasonNumber).first<{ total: number }>();
  if (Number(iffhsCount?.total ?? 0) < plan.assignments.length) {
    return error(`Primero calculá/completá la IFFHS de T${plan.sourceSeasonNumber}`, 409);
  }

  const createdSeason = await createTargetSeason(env, plan.targetSeasonNumber);
  if (!createdSeason) return error('No se pudo crear la temporada destino', 500);

  const divisions = await env.DB.prepare(
    `SELECT id,code FROM season_divisions WHERE season_id=? AND code IN ('A','B')`,
  ).bind(createdSeason.id).all<{ id: number; code: string }>();
  const divisionIds = new Map((divisions.results ?? []).map((row) => [row.code, Number(row.id)]));

  for (const row of plan.assignments) {
    const divisionId = divisionIds.get(row.confirmedDivisionCode!);
    if (!divisionId) return error('No se encontró la división destino', 500);
    await env.DB.prepare(
      `INSERT INTO season_division_members(season_id,division_id,user_id,source)
       VALUES (?,?,?,'migration')`,
    ).bind(createdSeason.id, divisionId, row.userId).run();
  }

  await env.DB.prepare(
    `UPDATE season_transition_plans
     SET status='applied',applied_by_user_id=?,applied_at=datetime('now'),updated_at=datetime('now')
     WHERE id=?`,
  ).bind(user.id, planId).run();

  const after = await readPlan(env, planId);
  await audit(env, user.id, 'season_transition.applied', 'season_transition_plan', String(planId), plan, {
    plan: after,
    targetSeasonId: Number(createdSeason.id),
    targetSeasonNumber: plan.targetSeasonNumber,
  });
  return json({
    ok: true,
    plan: after,
    targetSeason: { id: Number(createdSeason.id), seasonNumber: plan.targetSeasonNumber, status: 'draft' },
  });
}

export async function handleSeasonTransition(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const generateMatch = pathname.match(/^\/api\/admin\/competition-engine\/seasons\/(\d+)\/transition-plan$/);
  if (generateMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return generatePlan(env, user, Number(generateMatch[1]));
  }

  const publicMatch = pathname.match(/^\/api\/admin\/competition-engine\/transition-plans\/(\d+)$/);
  if (publicMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const payload = await readPlan(env, Number(publicMatch[1]));
    return payload ? json({ plan: payload }) : error('Plan no encontrado', 404);
  }

  const confirmMatch = pathname.match(/^\/api\/admin\/competition-engine\/transition-plans\/(\d+)\/confirm$/);
  if (confirmMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'PUT') return error('Método no permitido', 405);
    return confirmPlan(request, env, user, Number(confirmMatch[1]));
  }

  const applyMatch = pathname.match(/^\/api\/admin\/competition-engine\/transition-plans\/(\d+)\/apply$/);
  if (applyMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return applyPlan(env, user, Number(applyMatch[1]));
  }

  return null;
}
