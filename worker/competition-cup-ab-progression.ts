import type { Env } from './index';

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type StageRow = {
  id: number;
  competition_id: number;
  competition_code: string;
  stage_type: string;
  status: string;
};

type RankedEntry = {
  groupId: number;
  groupCode: string;
  position: number;
  entryId: number;
  displayName: string;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();

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

async function audit(env: Env, actorUserId: string, action: string, entityId: string, after: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, 'competition_stage', ?, ?)`,
  ).bind(actorUserId, action, entityId, JSON.stringify(after)).run();
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

async function stageInfo(env: Env, stageId: number) {
  return env.DB.prepare(
    `SELECT cs.id, cs.competition_id, c.code AS competition_code,
            cs.stage_type, cs.status
     FROM competition_stages cs
     JOIN competitions c ON c.id = cs.competition_id
     WHERE cs.id = ? LIMIT 1`,
  ).bind(stageId).first<StageRow>();
}

async function validateTarget(
  env: Env,
  source: StageRow,
  targetStageId: number,
  roundLinkId: number,
) {
  const target = await stageInfo(env, targetStageId);
  if (!target) return { error: 'Etapa destino no encontrada' } as const;
  if (target.competition_id !== source.competition_id) return { error: 'Las etapas no pertenecen a la misma Copa' } as const;
  if (target.stage_type !== 'KNOCKOUT') return { error: 'La etapa destino debe ser eliminatoria' } as const;
  if (target.status === 'finished' || target.status === 'archived') return { error: 'La etapa destino ya está cerrada' } as const;

  const link = await env.DB.prepare(
    `SELECT id FROM competition_round_links
     WHERE id = ? AND competition_id = ? AND stage_id = ? AND purpose = 'NORMAL'
     LIMIT 1`,
  ).bind(roundLinkId, source.competition_id, targetStageId).first<{ id: number }>();
  if (!link) return { error: 'La Fecha no está vinculada a la etapa destino' } as const;

  const encounters = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id = ?`,
  ).bind(targetStageId).first<{ total: number }>();
  if (Number(encounters?.total ?? 0) > 0) return { error: 'La etapa destino ya tiene cruces sorteados' } as const;

  return { target } as const;
}

async function requireFinishedGroupDates(env: Env, groupStageId: number) {
  const rows = await env.DB.prepare(
    `SELECT r.status
     FROM competition_round_links crl
     JOIN rounds r ON r.id = crl.round_id
     WHERE crl.stage_id = ? AND crl.purpose = 'NORMAL'`,
  ).bind(groupStageId).all<{ status: string }>();
  const dates = rows.results ?? [];
  if (dates.length === 0) return 'La fase de grupos todavía no tiene Fechas vinculadas';
  if (dates.some((row) => row.status !== 'finished')) return 'La fase de grupos todavía tiene Fechas sin cerrar';
  return null;
}

async function rankedGroups(env: Env, stageId: number): Promise<RankedEntry[]> {
  const rows = await env.DB.prepare(
    `SELECT
       g.id AS group_id,
       g.code AS group_code,
       g.sequence AS group_sequence,
       ce.id AS entry_id,
       ce.display_name,
       COALESCE(SUM(ps.total_points), 0) AS points,
       COALESCE(SUM(CASE WHEN ps.base_points = 3 THEN 1 ELSE 0 END), 0) AS fulls,
       COALESCE(SUM(CASE WHEN ps.base_points = 1 THEN 1 ELSE 0 END), 0) AS partials,
       COALESCE(SUM(CASE WHEN ps.base_points = 0 AND ps.result_type <> 'VOID' THEN 1 ELSE 0 END), 0) AS errors,
       COALESCE(SUM(ps.extra_points), 0) AS extras
     FROM competition_groups g
     JOIN competition_group_entries cge ON cge.group_id = g.id
     JOIN competition_entries ce ON ce.id = cge.entry_id
     JOIN competition_entry_members cem ON cem.entry_id = ce.id
     LEFT JOIN competition_round_links crl
       ON crl.stage_id = g.stage_id AND crl.purpose = 'NORMAL'
     LEFT JOIN matches m ON m.round_id = crl.round_id
     LEFT JOIN official_predictions op
       ON op.user_id = cem.user_id AND op.match_id = m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id = op.id
     WHERE g.stage_id = ?
     GROUP BY g.id, g.code, g.sequence, ce.id, ce.display_name
     ORDER BY g.sequence,
              points DESC, fulls DESC, partials DESC, errors ASC, extras DESC,
              ce.display_name COLLATE NOCASE`,
  ).bind(stageId).all<{
    group_id: number;
    group_code: string;
    group_sequence: number;
    entry_id: number;
    display_name: string;
    points: number;
    fulls: number;
    partials: number;
    errors: number;
    extras: number;
  }>();

  const positionsByGroup = new Map<number, number>();
  return (rows.results ?? []).map((row) => {
    const groupId = Number(row.group_id);
    const position = (positionsByGroup.get(groupId) ?? 0) + 1;
    positionsByGroup.set(groupId, position);
    return {
      groupId,
      groupCode: row.group_code,
      position,
      entryId: Number(row.entry_id),
      displayName: row.display_name,
      points: Number(row.points ?? 0),
      fulls: Number(row.fulls ?? 0),
      partials: Number(row.partials ?? 0),
      errors: Number(row.errors ?? 0),
      extras: Number(row.extras ?? 0),
    };
  });
}

async function stageWinners(env: Env, stageId: number) {
  const encounters = await env.DB.prepare(
    `SELECT ce.id, ce.winner_entry_id, ce.status, e.display_name
     FROM competition_encounters ce
     LEFT JOIN competition_entries e ON e.id = ce.winner_entry_id
     WHERE ce.stage_id = ?
     ORDER BY ce.id`,
  ).bind(stageId).all<{
    id: number;
    winner_entry_id: number | null;
    status: string;
    display_name: string | null;
  }>();

  const rows = encounters.results ?? [];
  if (rows.length === 0) return { error: 'La etapa origen no tiene cruces' } as const;
  if (rows.some((row) => row.status !== 'finished' || row.winner_entry_id == null)) {
    return { error: 'La etapa origen todavía tiene cruces sin resolver' } as const;
  }
  return {
    winners: rows.map((row) => ({
      entryId: Number(row.winner_entry_id),
      displayName: row.display_name ?? `Entrada ${row.winner_entry_id}`,
    })),
  } as const;
}

async function insertPairs(
  env: Env,
  targetStageId: number,
  roundLinkId: number,
  pairs: Array<[number, number | null]>,
  slotPrefix: string,
) {
  const statements: D1PreparedStatement[] = pairs.map((pair, index) => env.DB.prepare(
    `INSERT INTO competition_encounters
       (stage_id, round_link_id, slot_key, entry_a_id, entry_b_id, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
  ).bind(targetStageId, roundLinkId, `${slotPrefix}-${index + 1}`, pair[0], pair[1]));
  if (statements.length > 0) await env.DB.batch(statements);
}

function pairSequential(entries: Array<{ entryId: number }>) {
  const pairs: Array<[number, number | null]> = [];
  for (let index = 0; index < entries.length; index += 2) {
    pairs.push([entries[index].entryId, entries[index + 1]?.entryId ?? null]);
  }
  return pairs;
}

async function drawRoundOf16(
  env: Env,
  user: SessionUser,
  groupStage: StageRow,
  targetStageId: number,
  roundLinkId: number,
) {
  if (groupStage.stage_type !== 'ACCUMULATIVE_GROUPS') return error('La etapa origen no es una fase de grupos acumulativos', 409);
  const dateError = await requireFinishedGroupDates(env, groupStage.id);
  if (dateError) return error(dateError, 409);

  const validation = await validateTarget(env, groupStage, targetStageId, roundLinkId);
  if ('error' in validation) return error(validation.error, 409);

  const ranking = await rankedGroups(env, groupStage.id);
  const seconds = ranking.filter((entry) => entry.position === 2);
  const thirds = ranking.filter((entry) => entry.position === 3);
  if (seconds.length === 0 || seconds.length !== thirds.length) return error('La fase de grupos no produce la misma cantidad de segundos y terceros', 409);

  const randomSeedBytes = new Uint32Array(1);
  crypto.getRandomValues(randomSeedBytes);
  const randomSeed = Number(randomSeedBytes[0]);
  const random = mulberry32(randomSeed);
  const shuffledSeconds = shuffled(seconds, random);
  const shuffledThirds = shuffled(thirds, random);
  const pairs: Array<[number, number | null]> = shuffledSeconds.map((second, index) => [second.entryId, shuffledThirds[index].entryId]);

  await insertPairs(env, targetStageId, roundLinkId, pairs, 'R16');
  await audit(env, user.id, 'competition.cup_ab_r16_drawn', String(targetStageId), {
    sourceGroupStageId: groupStage.id,
    randomSeed,
    restriction: 'SECOND_VS_THIRD',
    pairs,
  });

  return json({ ok: true, action: 'DRAW_R16', randomSeed, pairs });
}

async function drawQuarterfinals(
  env: Env,
  user: SessionUser,
  r16Stage: StageRow,
  groupStageId: number,
  targetStageId: number,
  roundLinkId: number,
) {
  if (r16Stage.stage_type !== 'KNOCKOUT') return error('La etapa de octavos no es eliminatoria', 409);
  const groupStage = await stageInfo(env, groupStageId);
  if (!groupStage || groupStage.competition_id !== r16Stage.competition_id || groupStage.stage_type !== 'ACCUMULATIVE_GROUPS') {
    return error('La fase de grupos indicada no corresponde a esta Copa', 409);
  }
  const validation = await validateTarget(env, r16Stage, targetStageId, roundLinkId);
  if ('error' in validation) return error(validation.error, 409);

  const winnersResult = await stageWinners(env, r16Stage.id);
  if ('error' in winnersResult) return error(winnersResult.error, 409);
  const groupRanking = await rankedGroups(env, groupStageId);
  const groupWinners = groupRanking.filter((entry) => entry.position === 1)
    .map((entry) => ({ entryId: entry.entryId, displayName: entry.displayName }));

  const pool = [...groupWinners, ...winnersResult.winners];
  if (pool.length < 2 || pool.length % 2 !== 0) return error('La cantidad de clasificados a cuartos no permite formar cruces completos', 409);
  if (new Set(pool.map((entry) => entry.entryId)).size !== pool.length) return error('Hay una entrada duplicada entre los clasificados a cuartos', 409);

  const randomSeedBytes = new Uint32Array(1);
  crypto.getRandomValues(randomSeedBytes);
  const randomSeed = Number(randomSeedBytes[0]);
  const random = mulberry32(randomSeed);
  const shuffledPool = shuffled(pool, random);
  const pairs = pairSequential(shuffledPool);

  await insertPairs(env, targetStageId, roundLinkId, pairs, 'QF');
  await audit(env, user.id, 'competition.cup_ab_qf_drawn', String(targetStageId), {
    sourceGroupStageId: groupStageId,
    sourceRoundOf16StageId: r16Stage.id,
    randomSeed,
    pairs,
  });

  return json({ ok: true, action: 'DRAW_QF', randomSeed, pairs });
}

async function drawWinnersStage(
  env: Env,
  user: SessionUser,
  sourceStage: StageRow,
  targetStageId: number,
  roundLinkId: number,
  action: 'DRAW_SEMIS' | 'BUILD_FINAL',
) {
  if (sourceStage.stage_type !== 'KNOCKOUT') return error('La etapa origen no es eliminatoria', 409);
  const validation = await validateTarget(env, sourceStage, targetStageId, roundLinkId);
  if ('error' in validation) return error(validation.error, 409);

  const winnersResult = await stageWinners(env, sourceStage.id);
  if ('error' in winnersResult) return error(winnersResult.error, 409);
  if (winnersResult.winners.length < 2) return error('No hay suficientes ganadores para la siguiente fase', 409);

  let ordered = [...winnersResult.winners];
  let randomSeed: number | null = null;
  if (action === 'DRAW_SEMIS') {
    const randomSeedBytes = new Uint32Array(1);
    crypto.getRandomValues(randomSeedBytes);
    randomSeed = Number(randomSeedBytes[0]);
    ordered = shuffled(ordered, mulberry32(randomSeed));
  }
  if (action === 'BUILD_FINAL' && ordered.length !== 2) return error('La final necesita exactamente dos semifinalistas ganadores', 409);
  if (action === 'DRAW_SEMIS' && ordered.length % 2 !== 0) return error('La cantidad de semifinalistas no permite formar cruces completos', 409);

  const pairs = pairSequential(ordered);
  await insertPairs(env, targetStageId, roundLinkId, pairs, action === 'DRAW_SEMIS' ? 'SF' : 'FINAL');
  await audit(env, user.id, action === 'DRAW_SEMIS' ? 'competition.cup_ab_semis_drawn' : 'competition.cup_ab_final_built', String(targetStageId), {
    sourceStageId: sourceStage.id,
    randomSeed,
    pairs,
  });

  return json({ ok: true, action, randomSeed, pairs });
}

export async function handleCompetitionCupAbProgression(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/cup-ab-progression\/(r16|quarterfinals|semifinals|final)$/);
  if (!match) return null;

  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);
  if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
  if (request.method !== 'POST') return error('Método no permitido', 405);

  const sourceStageId = Number(match[1]);
  const action = match[2];
  const sourceStage = await stageInfo(env, sourceStageId);
  if (!sourceStage) return error('Etapa origen no encontrada', 404);
  if (!['COPA_A', 'COPA_B'].includes(sourceStage.competition_code)) return error('Este avance sólo corresponde a Copa A/B', 409);

  const body = await request.json().catch(() => null) as {
    targetStageId?: number;
    roundLinkId?: number;
    groupStageId?: number;
  } | null;
  const targetStageId = Number(body?.targetStageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(targetStageId) || targetStageId <= 0) return error('Etapa destino inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha destino inválida');

  if (action === 'r16') {
    return drawRoundOf16(env, user, sourceStage, targetStageId, roundLinkId);
  }
  if (action === 'quarterfinals') {
    const groupStageId = Number(body?.groupStageId);
    if (!Number.isInteger(groupStageId) || groupStageId <= 0) return error('Falta indicar la fase de grupos de origen');
    return drawQuarterfinals(env, user, sourceStage, groupStageId, targetStageId, roundLinkId);
  }
  if (action === 'semifinals') {
    return drawWinnersStage(env, user, sourceStage, targetStageId, roundLinkId, 'DRAW_SEMIS');
  }
  return drawWinnersStage(env, user, sourceStage, targetStageId, roundLinkId, 'BUILD_FINAL');
}
