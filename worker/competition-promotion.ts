import type { Env } from './index';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();

const PROMOTION_SLOTS = [
  { code: 'A_HIGH_PROMO', name: 'Liga A · Promoción superior', sourceType: 'league_position' },
  { code: 'A_LOW_PROMO', name: 'Liga A · Promoción inferior', sourceType: 'league_position' },
  { code: 'B_HIGH_PROMO', name: 'Liga B · Promoción superior', sourceType: 'league_position' },
  { code: 'B_LOW_PROMO', name: 'Liga B · Promoción inferior', sourceType: 'league_position' },
] as const;

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
async function audit(env: Env, actor: string, action: string, competitionId: number, before: unknown, after: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json)
     VALUES (?,?,'competition',?,?,?)`,
  ).bind(
    actor, action, String(competitionId),
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after),
  ).run();
}

async function promotionCompetition(env: Env, competitionId: number) {
  return env.DB.prepare(
    `SELECT c.id,c.season_id,c.code,c.status,s.season_number,s.status AS season_status
     FROM competitions c JOIN tafa_seasons s ON s.id=c.season_id
     WHERE c.id=? LIMIT 1`,
  ).bind(competitionId).first<{
    id: number; season_id: number; code: string; status: string; season_number: number; season_status: string;
  }>();
}

async function leaguePositionUser(env: Env, seasonId: number, competitionCode: string, position: number) {
  const row = await env.DB.prepare(
    `SELECT cem.user_id,u.full_name
     FROM competitions c
     JOIN competition_results cr ON cr.competition_id=c.id
     JOIN competition_entries ce ON ce.id=cr.entry_id AND ce.entry_type='INDIVIDUAL'
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     JOIN users u ON u.id=cem.user_id
     WHERE c.season_id=? AND c.code=? AND cr.final_position=?
     ORDER BY cr.confirmed_at DESC,cem.id
     LIMIT 1`,
  ).bind(seasonId, competitionCode, position).first<{ user_id: string; full_name: string }>();
  return row ?? null;
}

async function leagueSize(env: Env, seasonId: number, competitionCode: string) {
  const row = await env.DB.prepare(
    `SELECT MAX(cr.final_position) AS max_position
     FROM competitions c
     JOIN competition_results cr ON cr.competition_id=c.id
     WHERE c.season_id=? AND c.code=? AND cr.final_position IS NOT NULL`,
  ).bind(seasonId, competitionCode).first<{ max_position: number | null }>();
  return row?.max_position == null ? 0 : Number(row.max_position);
}

async function readSlots(env: Env, competitionId: number) {
  const rows = await env.DB.prepare(
    `SELECT cqs.slot_code,cqs.slot_name,cqs.source_json,cqs.proposed_user_id,pu.full_name AS proposed_name,
            cqs.confirmed_user_id,cu.full_name AS confirmed_name,cqs.confirmed_entry_id,cqs.status,
            cqs.replacement_reason
     FROM competition_qualification_slots cqs
     LEFT JOIN users pu ON pu.id=cqs.proposed_user_id
     LEFT JOIN users cu ON cu.id=cqs.confirmed_user_id
     WHERE cqs.competition_id=? ORDER BY cqs.id`,
  ).bind(competitionId).all<{
    slot_code: string; slot_name: string; source_json: string | null; proposed_user_id: string | null;
    proposed_name: string | null; confirmed_user_id: string | null; confirmed_name: string | null;
    confirmed_entry_id: number | null; status: string; replacement_reason: string | null;
  }>();
  return (rows.results ?? []).map((row) => ({
    slotCode: row.slot_code,
    slotName: row.slot_name,
    source: row.source_json ? JSON.parse(row.source_json) : null,
    proposedUser: row.proposed_user_id == null ? null : { id: row.proposed_user_id, name: row.proposed_name },
    confirmedUser: row.confirmed_user_id == null ? null : { id: row.confirmed_user_id, name: row.confirmed_name },
    confirmedEntryId: row.confirmed_entry_id == null ? null : Number(row.confirmed_entry_id),
    status: row.status,
    replacementReason: row.replacement_reason,
  }));
}

async function prefill(env: Env, user: SessionUser, competitionId: number) {
  const competition = await promotionCompetition(env, competitionId);
  if (!competition || competition.code !== 'PROMOCION') return error('Promoción no encontrada', 404);

  const encounters = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_encounters ce
     JOIN competition_stages cs ON cs.id=ce.stage_id
     WHERE cs.competition_id=?`,
  ).bind(competitionId).first<{ total: number }>();
  if (Number(encounters?.total ?? 0) > 0) return error('No se pueden recalcular cupos después de crear los cruces', 409);

  const aSize = await leagueSize(env, competition.season_id, 'LIGA_A');
  const aHighPosition = aSize >= 4 ? aSize - 3 : 0;
  const aLowPosition = aSize >= 4 ? aSize - 2 : 0;
  const proposals = new Map<string, { userId: string | null; source: unknown }>();

  const aHigh = aHighPosition > 0 ? await leaguePositionUser(env, competition.season_id, 'LIGA_A', aHighPosition) : null;
  const aLow = aLowPosition > 0 ? await leaguePositionUser(env, competition.season_id, 'LIGA_A', aLowPosition) : null;
  const bHigh = await leaguePositionUser(env, competition.season_id, 'LIGA_B', 2);
  const bLow = await leaguePositionUser(env, competition.season_id, 'LIGA_B', 3);

  proposals.set('A_HIGH_PROMO', { userId: aHigh?.user_id ?? null, source: { competitionCode: 'LIGA_A', position: aHighPosition } });
  proposals.set('A_LOW_PROMO', { userId: aLow?.user_id ?? null, source: { competitionCode: 'LIGA_A', position: aLowPosition } });
  proposals.set('B_HIGH_PROMO', { userId: bHigh?.user_id ?? null, source: { competitionCode: 'LIGA_B', position: 2 } });
  proposals.set('B_LOW_PROMO', { userId: bLow?.user_id ?? null, source: { competitionCode: 'LIGA_B', position: 3 } });

  const before = await readSlots(env, competitionId);
  await env.DB.prepare(`DELETE FROM competition_qualification_slots WHERE competition_id=?`).bind(competitionId).run();
  for (const slot of PROMOTION_SLOTS) {
    const proposal = proposals.get(slot.code)!;
    await env.DB.prepare(
      `INSERT INTO competition_qualification_slots
         (competition_id,slot_code,slot_name,source_type,source_json,proposed_user_id,status)
       VALUES (?,?,?,?,?,?,?)`,
    ).bind(
      competitionId,slot.code,slot.name,slot.sourceType,JSON.stringify(proposal.source),proposal.userId,
      proposal.userId == null ? 'vacant' : 'proposed',
    ).run();
  }
  const after = await readSlots(env, competitionId);
  await audit(env, user.id, 'competition.promotion_slots_prefilled', competitionId, before, after);
  return json({
    ok: true,
    competitionId,
    leagueASize: aSize,
    basePositions: { aHigh: aHighPosition, aLow: aLowPosition, bHigh: 2, bLow: 3 },
    slots: after,
  });
}

async function ensureEntry(env: Env, competitionId: number, userId: string, fullName: string, slotCode: string) {
  const existing = await env.DB.prepare(
    `SELECT ce.id FROM competition_entries ce
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     WHERE ce.competition_id=? AND ce.entry_type='INDIVIDUAL' AND cem.user_id=?
     ORDER BY ce.id LIMIT 1`,
  ).bind(competitionId, userId).first<{ id: number }>();
  if (existing) return Number(existing.id);
  const created = await env.DB.prepare(
    `INSERT INTO competition_entries(competition_id,entry_type,display_name,source_json)
     VALUES (?,'INDIVIDUAL',?,?) RETURNING id`,
  ).bind(competitionId, fullName, JSON.stringify({ source: 'PROMOTION_SLOT', slotCode, userId }))
    .first<{ id: number }>();
  if (!created) throw new Error('No se pudo crear una entrada de Promoción');
  await env.DB.prepare(`INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)`)
    .bind(created.id, userId).run();
  return Number(created.id);
}

async function confirmSlots(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await promotionCompetition(env, competitionId);
  if (!competition || competition.code !== 'PROMOCION') return error('Promoción no encontrada', 404);
  const body = await request.json().catch(() => null) as {
    slots?: Array<{ slotCode?: string; userId?: string; reason?: string | null }>;
  } | null;
  if (!Array.isArray(body?.slots)) return error('Cupós inválidos');

  const allowed = new Set(PROMOTION_SLOTS.map((slot) => slot.code));
  const incoming = new Map<string, { userId: string; reason: string | null }>();
  for (const raw of body.slots) {
    const slotCode = raw.slotCode?.trim().toUpperCase() ?? '';
    const userId = raw.userId?.trim() ?? '';
    if (!allowed.has(slotCode as typeof PROMOTION_SLOTS[number]['code']) || !userId) return error('Hay un cupo o participante inválido');
    if (incoming.has(slotCode)) return error('No se puede confirmar dos veces el mismo cupo');
    incoming.set(slotCode, { userId, reason: raw.reason?.trim() || null });
  }
  if (incoming.size !== PROMOTION_SLOTS.length) return error('Deben confirmarse exactamente los cuatro cupos de Promoción');
  if (new Set([...incoming.values()].map((value) => value.userId)).size !== PROMOTION_SLOTS.length) {
    return error('Una misma persona no puede ocupar dos cupos de Promoción', 409);
  }

  const current = await readSlots(env, competitionId);
  if (current.length !== PROMOTION_SLOTS.length) return error('Primero generá la propuesta de cupos', 409);
  const byCode = new Map(current.map((slot) => [slot.slotCode, slot]));

  const confirmed = [];
  for (const slot of PROMOTION_SLOTS) {
    const requested = incoming.get(slot.code)!;
    const participant = await env.DB.prepare(
      `SELECT u.id,u.full_name
       FROM season_division_members sdm JOIN users u ON u.id=sdm.user_id
       WHERE sdm.season_id=? AND sdm.user_id=? AND u.role='participant' AND u.is_active=1 LIMIT 1`,
    ).bind(competition.season_id, requested.userId).first<{ id: string; full_name: string }>();
    if (!participant) return error(`El participante elegido para ${slot.name} no está activo en la temporada`, 409);

    const proposed = byCode.get(slot.code)?.proposedUser?.id ?? null;
    const replaced = proposed !== participant.id;
    if (replaced && !requested.reason) {
      return error(`El cupo ${slot.name} fue corrido/reemplazado: indicá el motivo (por ejemplo Copa A o Copa B)`, 409);
    }
    const entryId = await ensureEntry(env, competitionId, participant.id, participant.full_name, slot.code);
    confirmed.push({ slotCode: slot.code, userId: participant.id, entryId, reason: requested.reason, replaced });
  }

  const before = current;
  for (const row of confirmed) {
    await env.DB.prepare(
      `UPDATE competition_qualification_slots
       SET confirmed_user_id=?,confirmed_entry_id=?,status=?,replacement_reason=?,
           confirmed_by_user_id=?,updated_at=datetime('now')
       WHERE competition_id=? AND slot_code=?`,
    ).bind(
      row.userId,row.entryId,row.replaced ? 'replaced' : 'confirmed',row.reason,user.id,competitionId,row.slotCode,
    ).run();
  }
  const after = await readSlots(env, competitionId);
  await audit(env, user.id, 'competition.promotion_slots_confirmed', competitionId, before, after);
  return json({ ok: true, competitionId, slots: after });
}

async function buildMatches(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await promotionCompetition(env, competitionId);
  if (!competition || competition.code !== 'PROMOCION') return error('Promoción no encontrada', 404);
  const slots = await readSlots(env, competitionId);
  const byCode = new Map(slots.map((slot) => [slot.slotCode, slot]));
  if (PROMOTION_SLOTS.some((slot) => byCode.get(slot.code)?.confirmedEntryId == null)) {
    return error('Primero confirmá los cuatro cupos de Promoción', 409);
  }

  const body = await request.json().catch(() => null) as { stageId?: number; roundLinkId?: number } | null;
  const stageId = Number(body?.stageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(stageId) || stageId <= 0) return error('Etapa inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha inválida');

  const stage = await env.DB.prepare(
    `SELECT id,stage_type,status FROM competition_stages WHERE id=? AND competition_id=? LIMIT 1`,
  ).bind(stageId, competitionId).first<{ id: number; stage_type: string; status: string }>();
  if (!stage || stage.stage_type !== 'KNOCKOUT') return error('La etapa de Promoción debe ser eliminatoria', 409);
  const link = await env.DB.prepare(
    `SELECT id FROM competition_round_links
     WHERE id=? AND competition_id=? AND stage_id=? AND purpose='NORMAL' LIMIT 1`,
  ).bind(roundLinkId, competitionId, stageId).first<{ id: number }>();
  if (!link) return error('La Fecha no está vinculada a Promoción', 409);
  const existing = await env.DB.prepare(`SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id=?`)
    .bind(stageId).first<{ total: number }>();
  if (Number(existing?.total ?? 0) > 0) return error('Los cruces de Promoción ya fueron creados', 409);

  const bHigh = Number(byCode.get('B_HIGH_PROMO')!.confirmedEntryId);
  const bLow = Number(byCode.get('B_LOW_PROMO')!.confirmedEntryId);
  const aHigh = Number(byCode.get('A_HIGH_PROMO')!.confirmedEntryId);
  const aLow = Number(byCode.get('A_LOW_PROMO')!.confirmedEntryId);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
       VALUES (?,?, 'PROMO-1', ?, ?, 'pending')`,
    ).bind(stageId, roundLinkId, bHigh, aLow),
    env.DB.prepare(
      `INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
       VALUES (?,?, 'PROMO-2', ?, ?, 'pending')`,
    ).bind(stageId, roundLinkId, bLow, aHigh),
  ]);

  const pairs = [
    { slotKey: 'PROMO-1', entryAId: bHigh, entryBId: aLow },
    { slotKey: 'PROMO-2', entryAId: bLow, entryBId: aHigh },
  ];
  await audit(env, user.id, 'competition.promotion_matches_built', competitionId, null, { stageId, roundLinkId, pairs });
  return json({ ok: true, competitionId, stageId, roundLinkId, pairs });
}

async function finalizeMovements(env: Env, user: SessionUser, competitionId: number, stageId: number) {
  const competition = await promotionCompetition(env, competitionId);
  if (!competition || competition.code !== 'PROMOCION') return error('Promoción no encontrada', 404);

  const encounters = await env.DB.prepare(
    `SELECT ce.id,ce.entry_a_id,ce.entry_b_id,ce.winner_entry_id,ce.status,ce.admin_confirmed_at,
            aem.user_id AS user_a,bem.user_id AS user_b,wem.user_id AS winner_user
     FROM competition_encounters ce
     JOIN competition_entry_members aem ON aem.entry_id=ce.entry_a_id
     JOIN competition_entry_members bem ON bem.entry_id=ce.entry_b_id
     LEFT JOIN competition_entry_members wem ON wem.entry_id=ce.winner_entry_id
     WHERE ce.stage_id=? ORDER BY ce.id`,
  ).bind(stageId).all<{
    id: number; entry_a_id: number; entry_b_id: number; winner_entry_id: number | null; status: string;
    admin_confirmed_at: string | null; user_a: string; user_b: string; winner_user: string | null;
  }>();
  const rows = encounters.results ?? [];
  if (rows.length !== 2) return error('Promoción debe tener exactamente dos cruces', 409);
  if (rows.some((row) => row.status !== 'finished' || row.winner_user == null || row.admin_confirmed_at == null)) {
    return error('Los dos cruces deben estar resueltos y confirmados por Admin', 409);
  }

  const divisions = await env.DB.prepare(
    `SELECT id,code FROM season_divisions WHERE season_id=? AND code IN ('A','B')`,
  ).bind(competition.season_id).all<{ id: number; code: string }>();
  const divisionByCode = new Map((divisions.results ?? []).map((row) => [row.code, Number(row.id)]));
  const divisionA = divisionByCode.get('A');
  const divisionB = divisionByCode.get('B');
  if (!divisionA || !divisionB) return error('No están configuradas Liga A y Liga B para la temporada', 409);

  const before = await env.DB.prepare(
    `SELECT id,user_id,to_division_id,reason,status FROM season_division_movements
     WHERE season_id=? AND reason LIKE 'PROMOCION:%'`,
  ).bind(competition.season_id).all();
  await env.DB.prepare(
    `DELETE FROM season_division_movements WHERE season_id=? AND reason LIKE 'PROMOCION:%' AND status='proposed'`,
  ).bind(competition.season_id).run();

  const movements = [];
  for (const encounter of rows) {
    const winner = encounter.winner_user!;
    const loser = encounter.user_a === winner ? encounter.user_b : encounter.user_a;
    for (const [participant, toDivision, result] of [
      [winner, divisionA, 'WINNER'],
      [loser, divisionB, 'LOSER'],
    ] as const) {
      const from = await env.DB.prepare(
        `SELECT division_id FROM season_division_members WHERE season_id=? AND user_id=? LIMIT 1`,
      ).bind(competition.season_id, participant).first<{ division_id: number }>();
      const reason = `PROMOCION:${encounter.id}:${result}`;
      const created = await env.DB.prepare(
        `INSERT INTO season_division_movements(season_id,user_id,from_division_id,to_division_id,reason,status)
         VALUES (?,?,?,?,?,'proposed') RETURNING id`,
      ).bind(competition.season_id, participant, from?.division_id ?? null, toDivision, reason).first<{ id: number }>();
      movements.push({ id: Number(created?.id), userId: participant, toDivisionId: toDivision, result });
    }
  }

  await audit(env, user.id, 'competition.promotion_movements_proposed', competitionId, before.results ?? [], movements);
  return json({ ok: true, competitionId, stageId, movements });
}

export async function handleCompetitionPromotion(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const publicSlots = pathname.match(/^\/api\/competition-engine\/competitions\/(\d+)\/promotion\/slots$/);
  if (publicSlots) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    return json({ competitionId: Number(publicSlots[1]), slots: await readSlots(env, Number(publicSlots[1])) });
  }

  const prefillMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/promotion\/prefill$/);
  if (prefillMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return prefill(env, user, Number(prefillMatch[1]));
  }

  const confirmMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/promotion\/slots$/);
  if (confirmMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'PUT') return error('Método no permitido', 405);
    return confirmSlots(request, env, user, Number(confirmMatch[1]));
  }

  const buildMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/promotion\/matches$/);
  if (buildMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return buildMatches(request, env, user, Number(buildMatch[1]));
  }

  const finalizeMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/promotion\/stages\/(\d+)\/finalize$/);
  if (finalizeMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return finalizeMovements(env, user, Number(finalizeMatch[1]), Number(finalizeMatch[2]));
  }

  return null;
}
