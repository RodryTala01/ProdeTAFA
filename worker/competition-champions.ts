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

type BracketNodeDefinition = {
  code: string;
  label: string;
  branch: 'UPPER' | 'LOWER' | 'FINAL';
  sequence: number;
  sourceAType: 'SLOT' | 'WINNER';
  sourceARef: string;
  sourceBType: 'SLOT' | 'WINNER';
  sourceBRef: string;
};

const BRACKET_NODES: BracketNodeDefinition[] = [
  { code: 'U1', label: '7.º Liga A vs 3.º Liga A', branch: 'UPPER', sequence: 1, sourceAType: 'SLOT', sourceARef: 'LIGA_A_7', sourceBType: 'SLOT', sourceBRef: 'LIGA_A_3' },
  { code: 'U2', label: 'Ganador U1 vs Campeón Liga B', branch: 'UPPER', sequence: 2, sourceAType: 'WINNER', sourceARef: 'U1', sourceBType: 'SLOT', sourceBRef: 'LIGA_B_CHAMPION' },
  { code: 'U3', label: 'Ganador U2 vs Campeón Copa A', branch: 'UPPER', sequence: 3, sourceAType: 'WINNER', sourceARef: 'U2', sourceBType: 'SLOT', sourceBRef: 'COPA_A_CHAMPION' },
  { code: 'U4', label: 'Ganador U3 vs Campeón Copa Papa', branch: 'UPPER', sequence: 4, sourceAType: 'WINNER', sourceARef: 'U3', sourceBType: 'SLOT', sourceBRef: 'COPA_PAPA_CHAMPION' },
  { code: 'U5', label: 'Ganador U4 vs Campeón Copa Total', branch: 'UPPER', sequence: 5, sourceAType: 'WINNER', sourceARef: 'U4', sourceBType: 'SLOT', sourceBRef: 'COPA_TOTAL_CHAMPION' },

  { code: 'L1', label: '5.º Liga A vs Campeón Copa B', branch: 'LOWER', sequence: 6, sourceAType: 'SLOT', sourceARef: 'LIGA_A_5', sourceBType: 'SLOT', sourceBRef: 'COPA_B_CHAMPION' },
  { code: 'L2', label: '4.º Liga A vs 6.º Liga A', branch: 'LOWER', sequence: 7, sourceAType: 'SLOT', sourceARef: 'LIGA_A_4', sourceBType: 'SLOT', sourceBRef: 'LIGA_A_6' },
  { code: 'L3', label: 'Ganador L1 vs Ganador L2', branch: 'LOWER', sequence: 8, sourceAType: 'WINNER', sourceARef: 'L1', sourceBType: 'WINNER', sourceBRef: 'L2' },
  { code: 'L4', label: 'Ganador L3 vs Dúo 2', branch: 'LOWER', sequence: 9, sourceAType: 'WINNER', sourceARef: 'L3', sourceBType: 'SLOT', sourceBRef: 'DUO_2' },
  { code: 'L5', label: '2.º Liga A vs Dúo 1', branch: 'LOWER', sequence: 10, sourceAType: 'SLOT', sourceARef: 'LIGA_A_2', sourceBType: 'SLOT', sourceBRef: 'DUO_1' },
  { code: 'L6', label: 'Ganador L4 vs Ganador L5', branch: 'LOWER', sequence: 11, sourceAType: 'WINNER', sourceARef: 'L4', sourceBType: 'WINNER', sourceBRef: 'L5' },
  { code: 'L7', label: 'Ganador L6 vs Campeón Liga A', branch: 'LOWER', sequence: 12, sourceAType: 'WINNER', sourceARef: 'L6', sourceBType: 'SLOT', sourceBRef: 'LIGA_A_1' },

  { code: 'F1', label: 'Final Copa Campeones', branch: 'FINAL', sequence: 13, sourceAType: 'WINNER', sourceARef: 'U5', sourceBType: 'WINNER', sourceBRef: 'L7' },
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

  if (await bracketStarted(env, competitionId)) return error('No se pueden modificar cupos después de inicializar la llave', 409);

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

async function bracketStarted(env: Env, competitionId: number) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_champions_nodes WHERE competition_id=?`,
  ).bind(competitionId).first<{ total: number }>();
  return Number(row?.total ?? 0) > 0;
}

async function resolveBracketSource(env: Env, competitionId: number, type: 'SLOT' | 'WINNER', ref: string) {
  if (type === 'SLOT') {
    const row = await env.DB.prepare(
      `SELECT cqs.confirmed_entry_id,ce.display_name,cqs.status
       FROM competition_qualification_slots cqs
       LEFT JOIN competition_entries ce ON ce.id=cqs.confirmed_entry_id
       WHERE cqs.competition_id=? AND cqs.slot_code=? LIMIT 1`,
    ).bind(competitionId, ref).first<{
      confirmed_entry_id: number | null; display_name: string | null; status: string;
    }>();
    if (!row || row.confirmed_entry_id == null || !['confirmed','replaced'].includes(row.status)) {
      return { ready: false as const, entryId: null, displayName: null, source: ref };
    }
    return {
      ready: true as const,
      entryId: Number(row.confirmed_entry_id),
      displayName: row.display_name,
      source: ref,
    };
  }

  const row = await env.DB.prepare(
    `SELECT ce.winner_entry_id,w.display_name,ce.status,ce.admin_confirmed_at
     FROM competition_champions_nodes ccn
     LEFT JOIN competition_encounters ce ON ce.id=ccn.encounter_id
     LEFT JOIN competition_entries w ON w.id=ce.winner_entry_id
     WHERE ccn.competition_id=? AND ccn.node_code=? LIMIT 1`,
  ).bind(competitionId, ref).first<{
    winner_entry_id: number | null; display_name: string | null; status: string | null; admin_confirmed_at: string | null;
  }>();
  if (!row || row.winner_entry_id == null || row.status !== 'finished' || row.admin_confirmed_at == null) {
    return { ready: false as const, entryId: null, displayName: null, source: ref };
  }
  return {
    ready: true as const,
    entryId: Number(row.winner_entry_id),
    displayName: row.display_name,
    source: ref,
  };
}

async function readBracket(env: Env, competitionId: number) {
  const rows = await env.DB.prepare(
    `SELECT ccn.id,ccn.node_code,ccn.label,ccn.branch,ccn.sequence,
            ccn.source_a_type,ccn.source_a_ref,ccn.source_b_type,ccn.source_b_ref,
            ccn.stage_id,ccn.round_link_id,ccn.encounter_id,
            ce.score_a,ce.score_b,ce.status AS encounter_status,ce.winner_entry_id,
            ce.resolution,ce.admin_confirmed_at,w.display_name AS winner_name,
            r.id AS round_id,r.name AS round_name,r.status AS round_status
     FROM competition_champions_nodes ccn
     LEFT JOIN competition_encounters ce ON ce.id=ccn.encounter_id
     LEFT JOIN competition_entries w ON w.id=ce.winner_entry_id
     LEFT JOIN competition_round_links crl ON crl.id=ccn.round_link_id
     LEFT JOIN rounds r ON r.id=crl.round_id
     WHERE ccn.competition_id=?
     ORDER BY ccn.sequence`,
  ).bind(competitionId).all<{
    id: number; node_code: string; label: string; branch: string; sequence: number;
    source_a_type: 'SLOT' | 'WINNER'; source_a_ref: string; source_b_type: 'SLOT' | 'WINNER'; source_b_ref: string;
    stage_id: number | null; round_link_id: number | null; encounter_id: number | null;
    score_a: number | null; score_b: number | null; encounter_status: string | null; winner_entry_id: number | null;
    resolution: string | null; admin_confirmed_at: string | null; winner_name: string | null;
    round_id: number | null; round_name: string | null; round_status: string | null;
  }>();

  const nodes = [];
  for (const row of rows.results ?? []) {
    const [sourceA, sourceB] = await Promise.all([
      resolveBracketSource(env, competitionId, row.source_a_type, row.source_a_ref),
      resolveBracketSource(env, competitionId, row.source_b_type, row.source_b_ref),
    ]);
    nodes.push({
      id: Number(row.id),
      code: row.node_code,
      label: row.label,
      branch: row.branch,
      sequence: Number(row.sequence),
      sourceA,
      sourceB,
      readyToActivate: row.encounter_id == null && sourceA.ready && sourceB.ready,
      stageId: row.stage_id == null ? null : Number(row.stage_id),
      roundLinkId: row.round_link_id == null ? null : Number(row.round_link_id),
      encounter: row.encounter_id == null ? null : {
        id: Number(row.encounter_id),
        scoreA: row.score_a == null ? null : Number(row.score_a),
        scoreB: row.score_b == null ? null : Number(row.score_b),
        status: row.encounter_status,
        winnerEntryId: row.winner_entry_id == null ? null : Number(row.winner_entry_id),
        winnerName: row.winner_name,
        resolution: row.resolution,
        adminConfirmedAt: row.admin_confirmed_at,
      },
      round: row.round_id == null ? null : {
        id: Number(row.round_id),
        name: row.round_name,
        status: row.round_status,
      },
    });
  }
  return nodes;
}

async function initBracket(env: Env, user: SessionUser, competitionId: number) {
  const competition = await championsCompetition(env, competitionId);
  if (!competition || competition.code !== 'COPA_CAMPEONES') return error('Copa Campeones no encontrada', 404);
  const slots = await readSlots(env, competitionId);
  if (slots.length !== SLOT_DEFINITIONS.length
    || slots.some((slot) => !['confirmed','replaced'].includes(slot.status) || slot.confirmedEntryId == null)) {
    return error('Primero confirmá los 14 cupos de Copa Campeones', 409);
  }
  if (await bracketStarted(env, competitionId)) return error('La llave de Copa Campeones ya fue inicializada', 409);

  const statements = BRACKET_NODES.map((node) => env.DB.prepare(
    `INSERT INTO competition_champions_nodes
       (competition_id,node_code,label,branch,sequence,source_a_type,source_a_ref,source_b_type,source_b_ref)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).bind(
    competitionId,node.code,node.label,node.branch,node.sequence,
    node.sourceAType,node.sourceARef,node.sourceBType,node.sourceBRef,
  ));
  await env.DB.batch(statements);

  const bracket = await readBracket(env, competitionId);
  await audit(env, user.id, 'competition.champions_bracket_initialized', String(competitionId), null, bracket);
  return json({ ok: true, competitionId, bracket });
}

async function activateNode(
  request: Request,
  env: Env,
  user: SessionUser,
  competitionId: number,
  nodeCode: string,
) {
  const competition = await championsCompetition(env, competitionId);
  if (!competition || competition.code !== 'COPA_CAMPEONES') return error('Copa Campeones no encontrada', 404);

  const node = await env.DB.prepare(
    `SELECT id,node_code,source_a_type,source_a_ref,source_b_type,source_b_ref,encounter_id
     FROM competition_champions_nodes
     WHERE competition_id=? AND node_code=? LIMIT 1`,
  ).bind(competitionId, nodeCode).first<{
    id: number; node_code: string; source_a_type: 'SLOT' | 'WINNER'; source_a_ref: string;
    source_b_type: 'SLOT' | 'WINNER'; source_b_ref: string; encounter_id: number | null;
  }>();
  if (!node) return error('Nodo de llave no encontrado', 404);
  if (node.encounter_id != null) return error('Este cruce ya fue activado', 409);

  const [sourceA, sourceB] = await Promise.all([
    resolveBracketSource(env, competitionId, node.source_a_type, node.source_a_ref),
    resolveBracketSource(env, competitionId, node.source_b_type, node.source_b_ref),
  ]);
  if (!sourceA.ready || !sourceB.ready || sourceA.entryId == null || sourceB.entryId == null) {
    return json({
      error: 'Todavía no están resueltas las dos fuentes de este cruce',
      nodeCode,
      sourceA,
      sourceB,
    }, { status: 409 });
  }

  const body = await request.json().catch(() => null) as { stageId?: number; roundLinkId?: number } | null;
  const stageId = Number(body?.stageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(stageId) || stageId <= 0) return error('Etapa inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha inválida');

  const stage = await env.DB.prepare(
    `SELECT id,stage_type,status FROM competition_stages
     WHERE id=? AND competition_id=? LIMIT 1`,
  ).bind(stageId, competitionId).first<{ id: number; stage_type: string; status: string }>();
  if (!stage || stage.stage_type !== 'KNOCKOUT') return error('La etapa debe ser eliminatoria y pertenecer a Copa Campeones', 409);
  if (stage.status === 'finished' || stage.status === 'archived') return error('La etapa ya está cerrada', 409);

  const link = await env.DB.prepare(
    `SELECT id FROM competition_round_links
     WHERE id=? AND competition_id=? AND stage_id=? AND purpose='NORMAL'
     LIMIT 1`,
  ).bind(roundLinkId, competitionId, stageId).first<{ id: number }>();
  if (!link) return error('La Fecha no está vinculada a la etapa elegida', 409);

  const created = await env.DB.prepare(
    `INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
     VALUES (?,?,?,?,?,'pending') RETURNING id`,
  ).bind(stageId, roundLinkId, nodeCode, sourceA.entryId, sourceB.entryId).first<{ id: number }>();
  if (!created) return error('No se pudo activar el cruce', 500);

  await env.DB.prepare(
    `UPDATE competition_champions_nodes
     SET stage_id=?,round_link_id=?,encounter_id=?,updated_at=datetime('now')
     WHERE id=?`,
  ).bind(stageId, roundLinkId, created.id, node.id).run();

  const bracket = await readBracket(env, competitionId);
  await audit(env, user.id, 'competition.champions_node_activated', String(competitionId), null, {
    nodeCode,
    stageId,
    roundLinkId,
    encounterId: Number(created.id),
    entryAId: sourceA.entryId,
    entryBId: sourceB.entryId,
  });
  return json({ ok: true, competitionId, nodeCode, encounterId: Number(created.id), bracket });
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

  const bracketGetMatch = pathname.match(/^\/api\/competition-engine\/competitions\/(\d+)\/champions\/bracket$/);
  if (bracketGetMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    return json({ competitionId: Number(bracketGetMatch[1]), bracket: await readBracket(env, Number(bracketGetMatch[1])) });
  }

  const bracketInitMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/champions\/bracket$/);
  if (bracketInitMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return initBracket(env, user, Number(bracketInitMatch[1]));
  }

  const activateMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/champions\/nodes\/([A-Z0-9_-]+)\/activate$/);
  if (activateMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return activateNode(request, env, user, Number(activateMatch[1]), activateMatch[2]);
  }

  return null;
}
