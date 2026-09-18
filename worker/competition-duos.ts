import type { Env } from './index';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type CompetitionRow = {
  id: number;
  season_id: number;
  code: string;
  status: string;
  season_status: string;
};
type DuoRoundContext = {
  round_link_id: number;
  stage_id: number;
  competition_id: number;
  competition_code: string;
  stage_type: string;
  stage_status: string;
  round_id: number;
  round_status: string;
  sequence: number;
};
type BonusMap = Record<string, number>;

type ComputedDuoRow = {
  entryId: number;
  displayName: string;
  members: Array<{ userId: string; fullName: string; points: number }>;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  provisional: boolean;
  position: number;
  tiedOnPoints: boolean;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();

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
async function audit(env: Env, actor: string, action: string, entityType: string, entityId: string, after: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_json)
     VALUES (?,?,?,?,?)`,
  ).bind(actor, action, entityType, entityId, JSON.stringify(after)).run();
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled<T>(source: T[], random: () => number) {
  const result = [...source];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

async function competitionInfo(env: Env, competitionId: number) {
  return env.DB.prepare(
    `SELECT c.id,c.season_id,c.code,c.status,s.status AS season_status
     FROM competitions c JOIN tafa_seasons s ON s.id=c.season_id
     WHERE c.id=? LIMIT 1`,
  ).bind(competitionId).first<CompetitionRow>();
}

async function duoRoundContext(env: Env, roundLinkId: number) {
  return env.DB.prepare(
    `SELECT crl.id AS round_link_id,crl.stage_id,crl.competition_id,c.code AS competition_code,
            cs.stage_type,cs.status AS stage_status,crl.round_id,r.status AS round_status,crl.sequence
     FROM competition_round_links crl
     JOIN competition_stages cs ON cs.id=crl.stage_id
     JOIN competitions c ON c.id=crl.competition_id
     JOIN rounds r ON r.id=crl.round_id
     WHERE crl.id=? AND crl.purpose='NORMAL' LIMIT 1`,
  ).bind(roundLinkId).first<DuoRoundContext>();
}

async function ensureDuoRound(env: Env, roundLinkId: number) {
  const context = await duoRoundContext(env, roundLinkId);
  if (!context) return { ok: false as const, error: 'Fecha de competición no encontrada', status: 404 };
  if (context.competition_code !== 'COPA_DUOS') return { ok: false as const, error: 'La Fecha no pertenece a Copa Dúos', status: 409 };
  if (context.stage_type !== 'SURVIVAL_TABLE') return { ok: false as const, error: 'La etapa de Copa Dúos debe ser de tabla eliminatoria', status: 409 };
  return { ok: true as const, context };
}

async function drawDuos(env: Env, user: SessionUser, competitionId: number) {
  const competition = await competitionInfo(env, competitionId);
  if (!competition) return error('Competición no encontrada', 404);
  if (competition.code !== 'COPA_DUOS') return error('Esta acción corresponde únicamente a Copa Dúos', 409);
  if (competition.status === 'finished' || competition.status === 'archived' || competition.season_status === 'finished' || competition.season_status === 'archived') {
    return error('La competición o temporada ya está cerrada', 409);
  }
  const existing = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_entries WHERE competition_id=?`,
  ).bind(competitionId).first<{ total: number }>();
  if (Number(existing?.total ?? 0) > 0) return error('Copa Dúos ya tiene entradas creadas; no se puede repetir el sorteo', 409);

  const participantsResult = await env.DB.prepare(
    `SELECT sdm.user_id,u.full_name
     FROM season_division_members sdm
     JOIN users u ON u.id=sdm.user_id
     WHERE sdm.season_id=? AND u.role='participant' AND u.is_active=1
     ORDER BY u.full_name COLLATE NOCASE`,
  ).bind(competition.season_id).all<{ user_id: string; full_name: string }>();
  const participants = participantsResult.results ?? [];
  if (participants.length < 2) return error('No hay suficientes participantes para formar dúos', 409);
  if (participants.length % 2 !== 0) {
    return error('La cantidad de participantes es impar. Resolvé primero quién queda fuera o cómo se completa el último dúo.', 409);
  }

  const seedBytes = new Uint32Array(1);
  crypto.getRandomValues(seedBytes);
  const randomSeed = Number(seedBytes[0]);
  const ordered = shuffled(participants, mulberry32(randomSeed));
  const pairs: Array<{ entryId: number; displayName: string; members: Array<{ userId: string; fullName: string }> }> = [];

  for (let index = 0; index < ordered.length; index += 2) {
    const first = ordered[index];
    const second = ordered[index + 1];
    const duoNumber = index / 2 + 1;
    const displayName = `Dúo ${duoNumber} · ${first.full_name} + ${second.full_name}`;
    const created = await env.DB.prepare(
      `INSERT INTO competition_entries(competition_id,entry_type,display_name,source_json)
       VALUES (?,'DUO',?,?) RETURNING id`,
    ).bind(competitionId, displayName, JSON.stringify({ source: 'random_draw', randomSeed, duoNumber }))
      .first<{ id: number }>();
    if (!created) return error('No se pudo crear uno de los dúos', 500);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)`).bind(created.id, first.user_id),
      env.DB.prepare(`INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)`).bind(created.id, second.user_id),
    ]);
    pairs.push({
      entryId: Number(created.id), displayName,
      members: [
        { userId: first.user_id, fullName: first.full_name },
        { userId: second.user_id, fullName: second.full_name },
      ],
    });
  }

  await audit(env, user.id, 'competition.duos_drawn', 'competition', String(competitionId), { randomSeed, pairs });
  return json({ ok: true, competitionId, randomSeed, pairs });
}

function normalizeBonusMap(raw: unknown) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const normalized: BonusMap = {};
  for (const [rawPosition, rawPoints] of Object.entries(raw as Record<string, unknown>)) {
    const position = Number(rawPosition);
    const points = Number(rawPoints);
    if (!Number.isInteger(position) || position <= 0 || !Number.isInteger(points) || points < 0) return null;
    normalized[String(position)] = points;
  }
  return normalized;
}

async function saveRoundSettings(request: Request, env: Env, user: SessionUser, roundLinkId: number) {
  const checked = await ensureDuoRound(env, roundLinkId);
  if (!checked.ok) return error(checked.error, checked.status);
  const body = await request.json().catch(() => null) as { eliminateCount?: number; bonusByPosition?: unknown } | null;
  const eliminateCount = Number(body?.eliminateCount ?? 0);
  const bonusByPosition = normalizeBonusMap(body?.bonusByPosition ?? {});
  if (!Number.isInteger(eliminateCount) || eliminateCount < 0) return error('Cantidad de eliminados inválida');
  if (!bonusByPosition) return error('Escala de bonus inválida');

  const active = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_entries
     WHERE competition_id=? AND entry_type='DUO' AND status='active'`,
  ).bind(checked.context.competition_id).first<{ total: number }>();
  const activeCount = Number(active?.total ?? 0);
  if (activeCount === 0) return error('No hay dúos activos en la competencia', 409);
  if (eliminateCount >= activeCount) return error('No se pueden eliminar todos los dúos de una misma Fecha', 409);

  await env.DB.prepare(
    `INSERT INTO competition_survival_round_settings
       (round_link_id,stage_id,eliminate_count,bonus_by_position_json,updated_by_user_id,updated_at)
     VALUES (?,?,?,?,?,datetime('now'))
     ON CONFLICT(round_link_id) DO UPDATE SET
       stage_id=excluded.stage_id,
       eliminate_count=excluded.eliminate_count,
       bonus_by_position_json=excluded.bonus_by_position_json,
       updated_by_user_id=excluded.updated_by_user_id,
       updated_at=datetime('now')`,
  ).bind(roundLinkId, checked.context.stage_id, eliminateCount, JSON.stringify(bonusByPosition), user.id).run();

  await audit(env, user.id, 'competition.duos_round_settings_updated', 'competition_round_link', String(roundLinkId), {
    eliminateCount, bonusByPosition,
  });
  return json({ ok: true, roundLinkId, eliminateCount, bonusByPosition });
}

async function individualRoundPoints(env: Env, userId: string, roundId: number) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(ps.total_points),0) AS points,
            COALESCE(SUM(CASE WHEN ps.is_provisional=1 THEN 1 ELSE 0 END),0) AS provisional_scores
     FROM matches m
     LEFT JOIN official_predictions op ON op.user_id=? AND op.match_id=m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id
     WHERE m.round_id=?`,
  ).bind(userId, roundId).first<{ points: number; provisional_scores: number }>();
  return { points: Number(row?.points ?? 0), provisional: Number(row?.provisional_scores ?? 0) > 0 };
}

async function computedTable(env: Env, roundLinkId: number) {
  const checked = await ensureDuoRound(env, roundLinkId);
  if (!checked.ok) return null;
  const context = checked.context;
  const settingsRow = await env.DB.prepare(
    `SELECT eliminate_count,bonus_by_position_json
     FROM competition_survival_round_settings WHERE round_link_id=? LIMIT 1`,
  ).bind(roundLinkId).first<{ eliminate_count: number; bonus_by_position_json: string }>();
  const eliminateCount = Number(settingsRow?.eliminate_count ?? 0);
  const bonusByPosition = settingsRow?.bonus_by_position_json ? JSON.parse(settingsRow.bonus_by_position_json) as BonusMap : {};

  const entriesResult = await env.DB.prepare(
    `SELECT id,display_name FROM competition_entries
     WHERE competition_id=? AND entry_type='DUO' AND status='active'
     ORDER BY id`,
  ).bind(context.competition_id).all<{ id: number; display_name: string }>();
  const rows: Array<Omit<ComputedDuoRow, 'position' | 'tiedOnPoints'>> = [];
  for (const entry of entriesResult.results ?? []) {
    const membersResult = await env.DB.prepare(
      `SELECT cem.user_id,u.full_name
       FROM competition_entry_members cem
       JOIN users u ON u.id=cem.user_id
       WHERE cem.entry_id=?
         AND (cem.valid_from_round_id IS NULL OR cem.valid_from_round_id<=?)
         AND (cem.valid_to_round_id IS NULL OR cem.valid_to_round_id>=?)
       ORDER BY cem.id`,
    ).bind(entry.id, context.round_id, context.round_id).all<{ user_id: string; full_name: string }>();
    const members = [];
    let basePoints = 0;
    let provisional = context.round_status !== 'finished';
    for (const member of membersResult.results ?? []) {
      const score = await individualRoundPoints(env, member.user_id, context.round_id);
      basePoints += score.points;
      provisional = provisional || score.provisional;
      members.push({ userId: member.user_id, fullName: member.full_name, points: score.points });
    }
    const bonusRow = await env.DB.prepare(
      `SELECT COALESCE(SUM(points),0) AS points
       FROM competition_entry_bonuses WHERE entry_id=? AND round_link_id=?`,
    ).bind(entry.id, roundLinkId).first<{ points: number }>();
    const bonusPoints = Number(bonusRow?.points ?? 0);
    rows.push({
      entryId: Number(entry.id), displayName: entry.display_name, members,
      basePoints, bonusPoints, totalPoints: basePoints + bonusPoints, provisional,
    });
  }

  const ordered = rows.sort((a, b) => b.totalPoints - a.totalPoints || a.displayName.localeCompare(b.displayName));
  let previousTotal: number | null = null;
  let previousPosition = 0;
  const ranked: ComputedDuoRow[] = ordered.map((row, index) => {
    const tied = previousTotal != null && row.totalPoints === previousTotal;
    const position = tied ? previousPosition : index + 1;
    previousTotal = row.totalPoints;
    previousPosition = position;
    return { ...row, position, tiedOnPoints: tied };
  });

  const cutIndex = eliminateCount > 0 ? ranked.length - eliminateCount : ranked.length;
  let boundaryTie = false;
  let boundaryScore: number | null = null;
  let tiedAtBoundary: ComputedDuoRow[] = [];
  if (eliminateCount > 0 && cutIndex > 0 && cutIndex < ranked.length) {
    const safe = ranked[cutIndex - 1];
    const eliminated = ranked[cutIndex];
    if (safe.totalPoints === eliminated.totalPoints) {
      boundaryTie = true;
      boundaryScore = safe.totalPoints;
      tiedAtBoundary = ranked.filter((row) => row.totalPoints === boundaryScore);
    }
  }
  const wouldEliminate = boundaryTie || eliminateCount === 0 ? [] : ranked.slice(cutIndex).map((row) => row.entryId);

  return {
    context,
    settings: { eliminateCount, bonusByPosition },
    rows: ranked,
    boundaryTie,
    boundaryScore,
    tiedAtBoundary: tiedAtBoundary.map((row) => ({ entryId: row.entryId, displayName: row.displayName, totalPoints: row.totalPoints })),
    wouldEliminate,
  };
}

async function snapshotPayload(env: Env, roundLinkId: number) {
  const rows = await env.DB.prepare(
    `SELECT csr.entry_id,ce.display_name,csr.base_points,csr.bonus_points,csr.total_points,
            csr.position,csr.decision,csr.next_bonus_points,csr.confirmed_at
     FROM competition_survival_results csr
     JOIN competition_entries ce ON ce.id=csr.entry_id
     WHERE csr.round_link_id=? ORDER BY csr.position,ce.display_name COLLATE NOCASE`,
  ).bind(roundLinkId).all<{
    entry_id: number; display_name: string; base_points: number; bonus_points: number; total_points: number;
    position: number; decision: string; next_bonus_points: number; confirmed_at: string;
  }>();
  return (rows.results ?? []).map((row) => ({
    entryId: Number(row.entry_id), displayName: row.display_name,
    basePoints: Number(row.base_points), bonusPoints: Number(row.bonus_points), totalPoints: Number(row.total_points),
    position: Number(row.position), decision: row.decision, nextBonusPoints: Number(row.next_bonus_points),
    confirmedAt: row.confirmed_at,
  }));
}

async function tablePayload(env: Env, roundLinkId: number) {
  const checked = await ensureDuoRound(env, roundLinkId);
  if (!checked.ok) return { error: checked.error, status: checked.status } as const;
  const snapshot = await snapshotPayload(env, roundLinkId);
  if (snapshot.length > 0) {
    const settings = await env.DB.prepare(
      `SELECT eliminate_count,bonus_by_position_json FROM competition_survival_round_settings WHERE round_link_id=?`,
    ).bind(roundLinkId).first<{ eliminate_count: number; bonus_by_position_json: string }>();
    return {
      confirmed: true,
      context: checked.context,
      settings: {
        eliminateCount: Number(settings?.eliminate_count ?? 0),
        bonusByPosition: settings?.bonus_by_position_json ? JSON.parse(settings.bonus_by_position_json) : {},
      },
      rows: snapshot,
    } as const;
  }
  const computed = await computedTable(env, roundLinkId);
  return computed ? { confirmed: false, ...computed } as const : { error: 'No se pudo calcular la tabla', status: 500 } as const;
}

async function nextNormalRoundLink(env: Env, context: DuoRoundContext) {
  return env.DB.prepare(
    `SELECT id FROM competition_round_links
     WHERE stage_id=? AND purpose='NORMAL' AND sequence>?
     ORDER BY sequence LIMIT 1`,
  ).bind(context.stage_id, context.sequence).first<{ id: number }>();
}

async function confirmRound(env: Env, user: SessionUser, roundLinkId: number) {
  const checked = await ensureDuoRound(env, roundLinkId);
  if (!checked.ok) return error(checked.error, checked.status);
  if (checked.context.round_status !== 'finished') return error('La Fecha debe estar cerrada antes de confirmar la tabla de Dúos', 409);
  const existing = await snapshotPayload(env, roundLinkId);
  if (existing.length > 0) return error('Esta Fecha de Copa Dúos ya fue confirmada', 409);
  const computed = await computedTable(env, roundLinkId);
  if (!computed) return error('No se pudo calcular la tabla de Dúos', 500);
  if (computed.rows.some((row) => row.provisional)) return error('Todavía hay puntajes provisionales en esta Fecha', 409);
  if (computed.boundaryTie) {
    return json({
      error: 'Hay empate en el corte de eliminación. Debe resolverse con el desempate TAFA antes de confirmar eliminados.',
      roundLinkId,
      boundaryScore: computed.boundaryScore,
      tiedAtBoundary: computed.tiedAtBoundary,
    }, { status: 409 });
  }

  const eliminated = new Set(computed.wouldEliminate);
  const survivors = computed.rows.filter((row) => !eliminated.has(row.entryId));
  const reachesSemifinals = survivors.length === 4;
  const nextLink = await nextNormalRoundLink(env, checked.context);
  const bonusMap = computed.settings.bonusByPosition;
  const awards = computed.rows.map((row) => ({
    row,
    nextBonus: Number(bonusMap[String(row.position)] ?? 0),
  }));
  if (!nextLink && awards.some((award) => !eliminated.has(award.row.entryId) && award.nextBonus > 0) && !reachesSemifinals) {
    return error('Hay bonus para la próxima jornada pero todavía no existe una Fecha siguiente vinculada a esta etapa', 409);
  }

  const snapshotStatements: D1PreparedStatement[] = [];
  for (const award of awards) {
    const isEliminated = eliminated.has(award.row.entryId);
    const decision = isEliminated ? 'ELIMINATED' : reachesSemifinals ? 'QUALIFIED' : 'ACTIVE';
    snapshotStatements.push(env.DB.prepare(
      `INSERT INTO competition_survival_results
         (stage_id,round_link_id,entry_id,base_points,bonus_points,total_points,position,decision,next_bonus_points,confirmed_by_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      checked.context.stage_id, roundLinkId, award.row.entryId, award.row.basePoints, award.row.bonusPoints,
      award.row.totalPoints, award.row.position, decision, isEliminated ? 0 : award.nextBonus, user.id,
    ));
  }
  if (snapshotStatements.length) await env.DB.batch(snapshotStatements);

  for (const entryId of eliminated) {
    await env.DB.prepare(`UPDATE competition_entries SET status='eliminated',updated_at=datetime('now') WHERE id=?`).bind(entryId).run();
  }
  if (reachesSemifinals) {
    for (const survivor of survivors) {
      await env.DB.prepare(`UPDATE competition_entries SET status='qualified',updated_at=datetime('now') WHERE id=?`).bind(survivor.entryId).run();
    }
  }

  if (nextLink && !reachesSemifinals) {
    const bonusStatements = awards
      .filter((award) => !eliminated.has(award.row.entryId) && award.nextBonus !== 0)
      .map((award) => env.DB.prepare(
        `INSERT INTO competition_entry_bonuses(competition_id,stage_id,round_link_id,entry_id,points,reason)
         VALUES (?,?,?,?,?,?)`,
      ).bind(
        checked.context.competition_id, checked.context.stage_id, nextLink.id, award.row.entryId, award.nextBonus,
        `COPA_DUOS:${roundLinkId}:POSITION:${award.row.position}`,
      ));
    if (bonusStatements.length) await env.DB.batch(bonusStatements);
  }

  const snapshot = await snapshotPayload(env, roundLinkId);
  await audit(env, user.id, 'competition.duos_round_confirmed', 'competition_round_link', String(roundLinkId), {
    eliminatedEntryIds: [...eliminated], reachesSemifinals, nextRoundLinkId: nextLink?.id ?? null, snapshot,
  });
  return json({ ok: true, roundLinkId, reachesSemifinals, eliminatedEntryIds: [...eliminated], rows: snapshot });
}

async function ensureDuoKnockoutTarget(
  env: Env,
  competitionId: number,
  stageId: number,
  roundLinkId: number,
) {
  const stage = await env.DB.prepare(
    \`SELECT cs.id,cs.competition_id,cs.stage_type,cs.status,c.code AS competition_code
     FROM competition_stages cs
     JOIN competitions c ON c.id=cs.competition_id
     WHERE cs.id=? LIMIT 1\`,
  ).bind(stageId).first<{
    id: number; competition_id: number; stage_type: string; status: string; competition_code: string;
  }>();
  if (!stage) return { ok: false as const, error: 'Etapa eliminatoria no encontrada' };
  if (stage.competition_id !== competitionId || stage.competition_code !== 'COPA_DUOS') {
    return { ok: false as const, error: 'La etapa no pertenece a esta Copa Dúos' };
  }
  if (stage.stage_type !== 'KNOCKOUT') return { ok: false as const, error: 'La etapa destino debe ser eliminatoria' };
  if (stage.status === 'finished' || stage.status === 'archived') return { ok: false as const, error: 'La etapa destino ya está cerrada' };

  const link = await env.DB.prepare(
    \`SELECT id,round_id FROM competition_round_links
     WHERE id=? AND competition_id=? AND stage_id=? AND purpose='NORMAL'
     LIMIT 1\`,
  ).bind(roundLinkId, competitionId, stageId).first<{ id: number; round_id: number }>();
  if (!link) return { ok: false as const, error: 'La Fecha indicada no pertenece a la etapa destino' };

  const existing = await env.DB.prepare(
    \`SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id=?\`,
  ).bind(stageId).first<{ total: number }>();
  if (Number(existing?.total ?? 0) > 0) return { ok: false as const, error: 'La etapa destino ya tiene cruces configurados' };

  return { ok: true as const, stage, link };
}

async function buildSemifinals(request: Request, env: Env, user: SessionUser, sourceRoundLinkId: number) {
  const source = await ensureDuoRound(env, sourceRoundLinkId);
  if (!source.ok) return error(source.error, source.status);

  const body = await request.json().catch(() => null) as { targetStageId?: number; roundLinkId?: number } | null;
  const targetStageId = Number(body?.targetStageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(targetStageId) || targetStageId <= 0) return error('Etapa de semifinal inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha de semifinal inválida');

  const snapshot = await snapshotPayload(env, sourceRoundLinkId);
  const qualified = snapshot
    .filter((row) => row.decision === 'QUALIFIED')
    .sort((a, b) => a.position - b.position);
  if (qualified.length !== 4) {
    return error('La última tabla confirmada debe dejar exactamente 4 dúos clasificados a semifinales', 409);
  }
  const positions = qualified.map((row) => row.position);
  if (new Set(positions).size !== 4 || ![1, 2, 3, 4].every((position) => positions.includes(position))) {
    return error('Para armar semifinales deben estar definidos los puestos 1.º, 2.º, 3.º y 4.º', 409);
  }

  const target = await ensureDuoKnockoutTarget(env, source.context.competition_id, targetStageId, roundLinkId);
  if (!target.ok) return error(target.error, 409);

  const byPosition = new Map(qualified.map((row) => [row.position, row.entryId]));
  const first = byPosition.get(1)!;
  const second = byPosition.get(2)!;
  const third = byPosition.get(3)!;
  const fourth = byPosition.get(4)!;

  await env.DB.batch([
    env.DB.prepare(
      \`INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
       VALUES (?,?, 'SF-1', ?, ?, 'pending')\`,
    ).bind(targetStageId, roundLinkId, first, fourth),
    env.DB.prepare(
      \`INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
       VALUES (?,?, 'SF-2', ?, ?, 'pending')\`,
    ).bind(targetStageId, roundLinkId, second, third),
    env.DB.prepare(
      \`INSERT INTO competition_entry_bonuses(competition_id,stage_id,round_link_id,entry_id,points,reason)
       VALUES (?,?,?,?,2,?)\`,
    ).bind(source.context.competition_id, targetStageId, roundLinkId, first, \`COPA_DUOS:\${sourceRoundLinkId}:SEMIFINAL_SEED:1\`),
    env.DB.prepare(
      \`INSERT INTO competition_entry_bonuses(competition_id,stage_id,round_link_id,entry_id,points,reason)
       VALUES (?,?,?,?,2,?)\`,
    ).bind(source.context.competition_id, targetStageId, roundLinkId, second, \`COPA_DUOS:\${sourceRoundLinkId}:SEMIFINAL_SEED:2\`),
  ]);

  const pairs = [
    { slot: 'SF-1', entryAId: first, entryBId: fourth, bonusA: 2, bonusB: 0 },
    { slot: 'SF-2', entryAId: second, entryBId: third, bonusA: 2, bonusB: 0 },
  ];
  await audit(env, user.id, 'competition.duos_semifinals_built', 'competition_stage', String(targetStageId), {
    sourceRoundLinkId, roundLinkId, pairs,
  });
  return json({ ok: true, sourceRoundLinkId, targetStageId, roundLinkId, pairs });
}

async function buildFinal(request: Request, env: Env, user: SessionUser, semifinalStageId: number) {
  const semifinalStage = await env.DB.prepare(
    \`SELECT cs.id,cs.competition_id,cs.stage_type,c.code AS competition_code
     FROM competition_stages cs
     JOIN competitions c ON c.id=cs.competition_id
     WHERE cs.id=? LIMIT 1\`,
  ).bind(semifinalStageId).first<{
    id: number; competition_id: number; stage_type: string; competition_code: string;
  }>();
  if (!semifinalStage || semifinalStage.competition_code !== 'COPA_DUOS' || semifinalStage.stage_type !== 'KNOCKOUT') {
    return error('La etapa origen no es una semifinal de Copa Dúos válida', 409);
  }

  const semis = await env.DB.prepare(
    \`SELECT id,entry_a_id,entry_b_id,winner_entry_id,status,admin_confirmed_at
     FROM competition_encounters WHERE stage_id=? ORDER BY id\`,
  ).bind(semifinalStageId).all<{
    id: number; entry_a_id: number | null; entry_b_id: number | null; winner_entry_id: number | null;
    status: string; admin_confirmed_at: string | null;
  }>();
  const encounters = semis.results ?? [];
  if (encounters.length !== 2) return error('La semifinal debe tener exactamente dos cruces', 409);
  if (encounters.some((row) => row.status !== 'finished' || row.winner_entry_id == null || row.admin_confirmed_at == null)) {
    return error('Las dos semifinales deben estar resueltas y confirmadas por Admin', 409);
  }

  const body = await request.json().catch(() => null) as { targetStageId?: number; roundLinkId?: number } | null;
  const targetStageId = Number(body?.targetStageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(targetStageId) || targetStageId <= 0) return error('Etapa final inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha final inválida');

  const target = await ensureDuoKnockoutTarget(env, semifinalStage.competition_id, targetStageId, roundLinkId);
  if (!target.ok) return error(target.error, 409);

  const winners = encounters.map((row) => Number(row.winner_entry_id));
  const losers = encounters.map((row) => {
    const winner = Number(row.winner_entry_id);
    return Number(row.entry_a_id) === winner ? Number(row.entry_b_id) : Number(row.entry_a_id);
  });

  await env.DB.prepare(
    \`INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
     VALUES (?,?, 'FINAL', ?, ?, 'pending')\`,
  ).bind(targetStageId, roundLinkId, winners[0], winners[1]).run();

  for (const loser of losers) {
    if (Number.isInteger(loser) && loser > 0) {
      await env.DB.prepare(
        \`UPDATE competition_entries SET status='eliminated',updated_at=datetime('now') WHERE id=?\`,
      ).bind(loser).run();
    }
  }
  for (const winner of winners) {
    await env.DB.prepare(
      \`UPDATE competition_entries SET status='qualified',updated_at=datetime('now') WHERE id=?\`,
    ).bind(winner).run();
  }

  await audit(env, user.id, 'competition.duos_final_built', 'competition_stage', String(targetStageId), {
    semifinalStageId, roundLinkId, finalistEntryIds: winners, eliminatedEntryIds: losers,
  });
  return json({ ok: true, semifinalStageId, targetStageId, roundLinkId, finalistEntryIds: winners });
}

export async function handleCompetitionDuos(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const drawMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/duos\/draw$/);
  if (drawMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return drawDuos(env, user, Number(drawMatch[1]));
  }

  const settingsMatch = pathname.match(/^\/api\/admin\/competition-engine\/round-links\/(\d+)\/duos\/settings$/);
  if (settingsMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'PUT') return error('Método no permitido', 405);
    return saveRoundSettings(request, env, user, Number(settingsMatch[1]));
  }

  const confirmMatch = pathname.match(/^\/api\/admin\/competition-engine\/round-links\/(\d+)\/duos\/confirm$/);
  if (confirmMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return confirmRound(env, user, Number(confirmMatch[1]));
  }

  const semifinalMatch = pathname.match(/^\/api\/admin\/competition-engine\/round-links\/(\d+)\/duos\/semifinals$/);
  if (semifinalMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return buildSemifinals(request, env, user, Number(semifinalMatch[1]));
  }

  const finalMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/duos\/final$/);
  if (finalMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return buildFinal(request, env, user, Number(finalMatch[1]));
  }

  const tableMatch = pathname.match(/^\/api\/competition-engine\/round-links\/(\d+)\/duos\/table$/);
  if (tableMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const payload = await tablePayload(env, Number(tableMatch[1]));
    if ('error' in payload) return error(String(payload.error ?? 'No se pudo cargar la tabla de Dúos'), Number(payload.status ?? 500));
    return json(payload);
  }

  return null;
}