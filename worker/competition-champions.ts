import type { Env } from './index';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type SlotDefinition = {
  code: string;
  name: string;
  sourceType: 'league_position' | 'competition_champion' | 'duo_champion_member';
  competitionCode: string;
  position?: number;
  duoMemberIndex?: number;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();

const SLOT_DEFINITIONS: SlotDefinition[] = [
  { code: 'LIGA_A_1', name: 'Campeón Liga A', sourceType: 'league_position', competitionCode: 'LIGA_A', position: 1 },
  { code: 'LIGA_A_2', name: '2.º Liga A', sourceType: 'league_position', competitionCode: 'LIGA_A', position: 2 },
  { code: 'LIGA_A_3', name: '3.º Liga A', sourceType: 'league_position', competitionCode: 'LIGA_A', position: 3 },
  { code: 'LIGA_A_4', name: '4.º Liga A', sourceType: 'league_position', competitionCode: 'LIGA_A', position: 4 },
  { code: 'LIGA_A_5', name: '5.º Liga A', sourceType: 'league_position', competitionCode: 'LIGA_A', position: 5 },
  { code: 'LIGA_A_6', name: '6.º Liga A', sourceType: 'league_position', competitionCode: 'LIGA_A', position: 6 },
  { code: 'LIGA_A_7', name: '7.º Liga A', sourceType: 'league_position', competitionCode: 'LIGA_A', position: 7 },
  { code: 'LIGA_B_CHAMPION', name: 'Campeón Liga B', sourceType: 'competition_champion', competitionCode: 'LIGA_B' },
  { code: 'COPA_A_CHAMPION', name: 'Campeón Copa A', sourceType: 'competition_champion', competitionCode: 'COPA_A' },
  { code: 'COPA_B_CHAMPION', name: 'Campeón Copa B', sourceType: 'competition_champion', competitionCode: 'COPA_B' },
  { code: 'COPA_PAPA_CHAMPION', name: 'Campeón Copa Papa', sourceType: 'competition_champion', competitionCode: 'COPA_PAPA' },
  { code: 'COPA_TOTAL_CHAMPION', name: 'Campeón Copa Total', sourceType: 'competition_champion', competitionCode: 'COPA_TOTAL' },
  { code: 'DUO_1', name: 'Dúo 1', sourceType: 'duo_champion_member', competitionCode: 'COPA_DUOS', duoMemberIndex: 0 },
  { code: 'DUO_2', name: 'Dúo 2', sourceType: 'duo_champion_member', competitionCode: 'COPA_DUOS', duoMemberIndex: 1 },
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
  const user = await env.DB.prepare(
    `SELECT u.id,u.role,u.is_active
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1
     LIMIT 1`,
  ).bind(await sha256(token)).first<SessionUser>();
  return user ?? null;
}
async function audit(env: Env, actor: string, action: string, entityId: string, before: unknown, after: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json)
     VALUES (?,?,'competition',?,?,?)`,
  ).bind(
    actor,
    action,
    entityId,
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after),
  ).run();
}

async function championsCompetition(env: Env, competitionId: number) {
  return env.DB.prepare(
    `SELECT c.id,c.season_id,c.code,c.status,s.season_number,s.status AS season_status
     FROM competitions c JOIN tafa_seasons s ON s.id=c.season_id
     WHERE c.id=? LIMIT 1`,
  ).bind(competitionId).first<{
    id: number; season_id: number; code: string; status: string; season_number: number; season_status: string;
  }>();
}

async function previousSeasonId(env: Env, seasonNumber: number) {
  const row = await env.DB.prepare(
    `SELECT id FROM tafa_seasons WHERE season_number=? LIMIT 1`,
  ).bind(seasonNumber - 1).first<{ id: number }>();
  return row?.id == null ? null : Number(row.id);
}

async function userFromLeaguePosition(env: Env, seasonId: number, competitionCode: string, position: number) {
  const row = await env.DB.prepare(
    `SELECT cem.user_id
     FROM competitions c
     JOIN competition_results cr ON cr.competition_id=c.id
     JOIN competition_entries ce ON ce.id=cr.entry_id AND ce.entry_type='INDIVIDUAL'
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     WHERE c.season_id=? AND c.code=? AND cr.final_position=?
     ORDER BY cr.confirmed_at DESC,cem.id
     LIMIT 1`,
  ).bind(seasonId, competitionCode, position).first<{ user_id: string }>();
  return row?.user_id ?? null;
}

async function championEntry(env: Env, seasonId: number, competitionCode: string) {
  return env.DB.prepare(
    `SELECT cr.entry_id,ce.entry_type
     FROM competitions c
     JOIN competition_results cr ON cr.competition_id=c.id
     JOIN competition_entries ce ON ce.id=cr.entry_id
     WHERE c.season_id=? AND c.code=? AND (cr.result_code='CHAMPION' OR cr.final_position=1)
     ORDER BY CASE WHEN cr.result_code='CHAMPION' THEN 0 ELSE 1 END,cr.confirmed_at DESC
     LIMIT 1`,
  ).bind(seasonId, competitionCode).first<{ entry_id: number; entry_type: string }>();
}

async function championUser(env: Env, seasonId: number, competitionCode: string) {
  const entry = await championEntry(env, seasonId, competitionCode);
  if (!entry) return null;
  const member = await env.DB.prepare(
    `SELECT user_id FROM competition_entry_members WHERE entry_id=? ORDER BY id LIMIT 1`,
  ).bind(entry.entry_id).first<{ user_id: string }>();
  return member?.user_id ?? null;
}

async function duoChampionMembers(env: Env, seasonId: number) {
  const entry = await championEntry(env, seasonId, 'COPA_DUOS');
  if (!entry) return [] as string[];
  const rows = await env.DB.prepare(
    `SELECT user_id FROM competition_entry_members WHERE entry_id=? ORDER BY id LIMIT 2`,
  ).bind(entry.entry_id).all<{ user_id: string }>();
  return (rows.results ?? []).map((row) => row.user_id);
}

async function proposedUserForSlot(env: Env, previousSeason: number, slot: SlotDefinition, duoMembers: string[]) {
  if (slot.sourceType === 'league_position') {
    return userFromLeaguePosition(env, previousSeason, slot.competitionCode, Number(slot.position));
  }
  if (slot.sourceType === 'duo_champion_member') {
    return duoMembers[Number(slot.duoMemberIndex)] ?? null;
  }
  return championUser(env, previousSeason, slot.competitionCode);
}

async function readSlots(env: Env, competitionId: number) {
  const rows = await env.DB.prepare(
    `SELECT cqs.id,cqs.slot_code,cqs.slot_name,cqs.source_type,cqs.source_json,
            cqs.proposed_user_id,pu.full_name AS proposed_name,
            cqs.confirmed_user_id,cu.full_name AS confirmed_name,
            cqs.confirmed_entry_id,cqs.status,cqs.replacement_reason,cqs.updated_at
     FROM competition_qualification_slots cqs
     LEFT JOIN users pu ON pu.id=cqs.proposed_user_id
     LEFT JOIN users cu ON cu.id=cqs.confirmed_user_id
     WHERE cqs.competition_id=?
     ORDER BY cqs.id`,
  ).bind(competitionId).all<{
    id: number; slot_code: string; slot_name: string; source_type: string; source_json: string | null;
    proposed_user_id: string | null; proposed_name: string | null; confirmed_user_id: string | null;
    confirmed_name: string | null; confirmed_entry_id: number | null; status: string;
    replacement_reason: string | null; updated_at: string;
  }>();
  return (rows.results ?? []).map((row) => ({
    id: Number(row.id),
    slotCode: row.slot_code,
    slotName: row.slot_name,
    sourceType: row.source_type,
    source: row.source_json ? JSON.parse(row.source_json) : null,
    proposedUser: row.proposed_user_id == null ? null : { id: row.proposed_user_id, name: row.proposed_name },
    confirmedUser: row.confirmed_user_id == null ? null : { id: row.confirmed_user_id, name: row.confirmed_name },
    confirmedEntryId: row.confirmed_entry_id == null ? null : Number(row.confirmed_entry_id),
    status: row.status,
    replacementReason: row.replacement_reason,
    updatedAt: row.updated_at,
  }));
}

async function prefill(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await championsCompetition(env, competitionId);
  if (!competition || competition.code !== 'COPA_CAMPEONES') return error('Copa Campeones no encontrada', 404);
  if (competition.status === 'finished' || competition.status === 'archived'
    || competition.season_status === 'finished' || competition.season_status === 'archived') {
    return error('La competición o temporada ya está cerrada', 409);
  }
  const encounters = await env.DB.prepare(
    `SELECT COUNT(*) AS total
     FROM competition_encounters ce
     JOIN competition_stages cs ON cs.id=ce.stage_id
     WHERE cs.competition_id=?`,
  ).bind(competitionId).first<{ total: number }>();
  if (Number(encounters?.total ?? 0) > 0) return error('No se pueden recalcular cupos después de iniciar la llave', 409);

  const previousId = await previousSeasonId(env, competition.season_number);
  const before = await readSlots(env, competitionId);
  const duoMembers = previousId == null ? [] : await duoChampionMembers(env, previousId);

  await env.DB.prepare(`DELETE FROM competition_qualification_slots WHERE competition_id=?`).bind(competitionId).run();
  for (const slot of SLOT_DEFINITIONS) {
    const proposedUserId = previousId == null ? null : await proposedUserForSlot(env, previousId, slot, duoMembers);
    const source = {
      previousSeasonNumber: competition.season_number - 1,
      previousSeasonFound: previousId != null,
      competitionCode: slot.competitionCode,
      position: slot.position ?? null,
      duoMemberIndex: slot.duoMemberIndex ?? null,
    };
    await env.DB.prepare(
      `INSERT INTO competition_qualification_slots
         (competition_id,slot_code,slot_name,source_type,source_json,proposed_user_id,status)
       VALUES (?,?,?,?,?,?,?)`,
    ).bind(
      competitionId,
      slot.code,
      slot.name,
      slot.sourceType,
      JSON.stringify(source),
      proposedUserId,
      proposedUserId == null ? 'vacant' : 'proposed',
    ).run();
  }

  const after = await readSlots(env, competitionId);
  await audit(env, user.id, 'competition.champions_slots_prefilled', String(competitionId), before, after);
  return json({
    ok: true,
    competitionId,
    previousSeasonNumber: competition.season_number - 1,
    previousSeasonFound: previousId != null,
    slots: after,
  });
}

async function ensureIndividualEntry(env: Env, competitionId: number, userId: string, fullName: string, slotCode: string) {
  const existing = await env.DB.prepare(
    `SELECT ce.id
     FROM competition_entries ce
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     WHERE ce.competition_id=? AND ce.entry_type='INDIVIDUAL' AND cem.user_id=?
     ORDER BY ce.id LIMIT 1`,
  ).bind(competitionId, userId).first<{ id: number }>();
  if (existing) return Number(existing.id);

  const created = await env.DB.prepare(
    `INSERT INTO competition_entries(competition_id,entry_type,display_name,source_json)
     VALUES (?,'INDIVIDUAL',?,?) RETURNING id`,
  ).bind(competitionId, fullName, JSON.stringify({ source: 'COPA_CAMPEONES_SLOT', slotCode, userId }))
    .first<{ id: number }>();
  if (!created) throw new Error('No se pudo crear una entrada de Copa Campeones');
  await env.DB.prepare(
    `INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)`,
  ).bind(created.id, userId).run();
  return Number(created.id);
}

async function confirmSlots(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await championsCompetition(env, competitionId);
  if (!competition || competition.code !== 'COPA_CAMPEONES') return error('Copa Campeones no encontrada', 404);

  const body = await request.json().catch(() => null) as {
    slots?: Array<{ slotCode?: string; userId?: string; reason?: string | null }>;
  } | null;
  if (!Array.isArray(body?.slots)) return error('Cupós inválidos');

  const definitions = new Map(SLOT_DEFINITIONS.map((slot) => [slot.code, slot]));
  const incoming = new Map<string, { userId: string; reason: string | null }>();
  for (const raw of body.slots) {
    const slotCode = raw.slotCode?.trim().toUpperCase() ?? '';
    const userId = raw.userId?.trim() ?? '';
    if (!definitions.has(slotCode) || !userId) return error('Hay un cupo o participante inválido');
    if (incoming.has(slotCode)) return error('No se puede confirmar dos veces el mismo cupo');
    incoming.set(slotCode, { userId, reason: raw.reason?.trim() || null });
  }
  if (incoming.size !== SLOT_DEFINITIONS.length) {
    return error(`Deben confirmarse exactamente los ${SLOT_DEFINITIONS.length} cupos de Copa Campeones`);
  }
  const uniqueUsers = new Set([...incoming.values()].map((value) => value.userId));
  if (uniqueUsers.size !== SLOT_DEFINITIONS.length) {
    return error('Una misma persona no puede ocupar dos cupos de la llave. Resolvé los duplicados manualmente.', 409);
  }

  const currentSlots = await readSlots(env, competitionId);
  if (currentSlots.length !== SLOT_DEFINITIONS.length) {
    return error('Primero generá/prellená los cupos de Copa Campeones', 409);
  }
  const byCode = new Map(currentSlots.map((slot) => [slot.slotCode, slot]));

  const confirmed: Array<{
    slotCode: string; userId: string; fullName: string; entryId: number; status: 'confirmed' | 'replaced'; reason: string | null;
  }> = [];
  for (const definition of SLOT_DEFINITIONS) {
    const requested = incoming.get(definition.code)!;
    const participant = await env.DB.prepare(
      `SELECT u.id,u.full_name
       FROM season_division_members sdm
       JOIN users u ON u.id=sdm.user_id
       WHERE sdm.season_id=? AND sdm.user_id=? AND u.role='participant' AND u.is_active=1
       LIMIT 1`,
    ).bind(competition.season_id, requested.userId).first<{ id: string; full_name: string }>();
    if (!participant) return error(`El participante elegido para ${definition.name} no está activo en T${competition.season_number}`, 409);

    const original = byCode.get(definition.code)?.proposedUser?.id ?? null;
    const replaced = original !== requested.userId;
    if (replaced && !requested.reason) {
      return error(`El cupo ${definition.name} fue reemplazado o estaba vacante: indicá el motivo`, 409);
    }

    const entryId = await ensureIndividualEntry(env, competitionId, participant.id, participant.full_name, definition.code);
    confirmed.push({
      slotCode: definition.code,
      userId: participant.id,
      fullName: participant.full_name,
      entryId,
      status: replaced ? 'replaced' : 'confirmed',
      reason: requested.reason,
    });
  }

  const before = currentSlots;
  for (const row of confirmed) {
    await env.DB.prepare(
      `UPDATE competition_qualification_slots
       SET confirmed_user_id=?,confirmed_entry_id=?,status=?,replacement_reason=?,
           confirmed_by_user_id=?,updated_at=datetime('now')
       WHERE competition_id=? AND slot_code=?`,
    ).bind(
      row.userId,
      row.entryId,
      row.status,
      row.reason,
      user.id,
      competitionId,
      row.slotCode,
    ).run();
  }
  const after = await readSlots(env, competitionId);
  await audit(env, user.id, 'competition.champions_slots_confirmed', String(competitionId), before, after);
  return json({ ok: true, competitionId, slots: after });
}

export async function handleCompetitionChampions(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const publicMatch = pathname.match(/^\/api\/competition-engine\/competitions\/(\d+)\/champions\/slots$/);
  if (publicMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    return json({ competitionId: Number(publicMatch[1]), slots: await readSlots(env, Number(publicMatch[1])) });
  }

  const prefillMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/champions\/prefill$/);
  if (prefillMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return prefill(request, env, user, Number(prefillMatch[1]));
  }

  const confirmMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/champions\/slots$/);
  if (confirmMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'PUT') return error('Método no permitido', 405);
    return confirmSlots(request, env, user, Number(confirmMatch[1]));
  }

  return null;
}
