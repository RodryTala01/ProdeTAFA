import type { Env } from './index';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type StageRow = {
  id: number;
  competition_id: number;
  competition_code: string;
  stage_type: string;
  status: string;
  season_status: string;
};
type StandingRow = {
  groupId: number;
  groupCode: string;
  groupName: string;
  groupSequence: number;
  position: number;
  entryId: number;
  displayName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  tiedOnAllCriteria: boolean;
};
type PairInput = { entryAId?: number; entryBId?: number | null };

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

async function stageInfo(env: Env, stageId: number) {
  return env.DB.prepare(
    `SELECT cs.id,cs.competition_id,cs.stage_type,cs.status,c.code AS competition_code,s.status AS season_status
     FROM competition_stages cs
     JOIN competitions c ON c.id=cs.competition_id
     JOIN tafa_seasons s ON s.id=c.season_id
     WHERE cs.id=? LIMIT 1`,
  ).bind(stageId).first<StageRow>();
}

async function scoreEntrySegment(env: Env, entryId: number, segmentId: number) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(ps.total_points),0) AS points,
            COUNT(crsm.match_id) AS match_count,
            COALESCE(SUM(CASE WHEN m.result_finalized_at IS NOT NULL OR m.is_void=1 THEN 1 ELSE 0 END),0) AS finalized_count
     FROM competition_round_segment_matches crsm
     JOIN matches m ON m.id=crsm.match_id
     JOIN competition_entry_members cem ON cem.entry_id=?
     LEFT JOIN official_predictions op ON op.user_id=cem.user_id AND op.match_id=m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id
     WHERE crsm.segment_id=?`,
  ).bind(entryId, segmentId).first<{ points: number; match_count: number; finalized_count: number }>();
  return {
    points: Number(row?.points ?? 0),
    complete: Number(row?.match_count ?? 0) === 4 && Number(row?.finalized_count ?? 0) === 4,
  };
}

async function totalStandings(env: Env, stageId: number) {
  const source = await stageInfo(env, stageId);
  if (!source || source.competition_code !== 'COPA_TOTAL' || source.stage_type !== 'ROUND_ROBIN_GROUPS') return null;
  const groupsResult = await env.DB.prepare(
    `SELECT id,code,name,sequence FROM competition_groups WHERE stage_id=? ORDER BY sequence`,
  ).bind(stageId).all<{ id: number; code: string; name: string; sequence: number }>();
  const flat: StandingRow[] = [];
  let provisional = false;

  for (const group of groupsResult.results ?? []) {
    const entriesResult = await env.DB.prepare(
      `SELECT cge.entry_id,ce.display_name
       FROM competition_group_entries cge
       JOIN competition_entries ce ON ce.id=cge.entry_id
       WHERE cge.group_id=?
       ORDER BY cge.seed_position,ce.display_name COLLATE NOCASE`,
    ).bind(group.id).all<{ entry_id: number; display_name: string }>();
    const table = new Map<number, Omit<StandingRow, 'groupId' | 'groupCode' | 'groupName' | 'groupSequence' | 'position' | 'gd' | 'tiedOnAllCriteria'>>();
    for (const entry of entriesResult.results ?? []) {
      table.set(Number(entry.entry_id), {
        entryId: Number(entry.entry_id), displayName: entry.display_name,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
      });
    }

    const encounters = await env.DB.prepare(
      `SELECT entry_a_id,entry_b_id,segment_id
       FROM competition_encounters
       WHERE stage_id=? AND group_id=? ORDER BY id`,
    ).bind(stageId, group.id).all<{ entry_a_id: number; entry_b_id: number; segment_id: number }>();

    for (const encounter of encounters.results ?? []) {
      const [a, b] = await Promise.all([
        scoreEntrySegment(env, Number(encounter.entry_a_id), Number(encounter.segment_id)),
        scoreEntrySegment(env, Number(encounter.entry_b_id), Number(encounter.segment_id)),
      ]);
      if (!a.complete || !b.complete) { provisional = true; continue; }
      const rowA = table.get(Number(encounter.entry_a_id));
      const rowB = table.get(Number(encounter.entry_b_id));
      if (!rowA || !rowB) continue;
      rowA.played += 1; rowB.played += 1;
      rowA.gf += a.points; rowA.ga += b.points;
      rowB.gf += b.points; rowB.ga += a.points;
      if (a.points > b.points) { rowA.won += 1; rowB.lost += 1; rowA.points += 3; }
      else if (a.points < b.points) { rowB.won += 1; rowA.lost += 1; rowB.points += 3; }
      else { rowA.drawn += 1; rowB.drawn += 1; rowA.points += 1; rowB.points += 1; }
    }

    const ordered = Array.from(table.values())
      .map((row) => ({ ...row, gd: row.gf - row.ga }))
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.won - a.won || a.displayName.localeCompare(b.displayName));
    let previous: typeof ordered[number] | null = null;
    let previousPosition = 0;
    for (let index = 0; index < ordered.length; index += 1) {
      const row = ordered[index];
      const same = previous != null && row.points === previous.points && row.gd === previous.gd && row.gf === previous.gf && row.won === previous.won;
      const position = same ? previousPosition : index + 1;
      flat.push({
        groupId: Number(group.id), groupCode: group.code, groupName: group.name,
        groupSequence: Number(group.sequence), position, ...row, tiedOnAllCriteria: same,
      });
      previous = row;
      previousPosition = position;
    }
  }
  return { source, provisional, standings: flat };
}

function sameWildcardScore(a: StandingRow, b: StandingRow) {
  return a.points === b.points && a.gd === b.gd && a.gf === b.gf && a.won === b.won;
}
function wildcardSort(a: StandingRow, b: StandingRow) {
  return b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.won - a.won
    || a.groupSequence - b.groupSequence || a.displayName.localeCompare(b.displayName);
}

async function persistQualifiers(
  env: Env,
  user: SessionUser,
  sourceStageId: number,
  targetStageId: number,
  rows: Array<{ entry: StandingRow; type: 'DIRECT' | 'WILDCARD' | 'MANUAL'; rankingOrder: number; reason: unknown }>,
) {
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`DELETE FROM competition_stage_qualifiers WHERE target_stage_id=?`).bind(targetStageId),
  ];
  for (const row of rows) {
    statements.push(env.DB.prepare(
      `INSERT INTO competition_stage_qualifiers
         (source_stage_id,target_stage_id,entry_id,source_group_id,qualification_type,
          source_position,ranking_order,reason_json,confirmed_by_user_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).bind(
      sourceStageId, targetStageId, row.entry.entryId, row.entry.groupId, row.type,
      row.entry.position, row.rankingOrder, JSON.stringify(row.reason), user.id,
    ));
  }
  await env.DB.batch(statements);
  await audit(env, user.id, 'competition.total_qualifiers_confirmed', 'competition_stage', String(sourceStageId), {
    targetStageId,
    qualifiers: rows.map((row) => ({
      entryId: row.entry.entryId, name: row.entry.displayName, group: row.entry.groupCode,
      position: row.entry.position, type: row.type, rankingOrder: row.rankingOrder,
    })),
  });
}

async function qualify(request: Request, env: Env, user: SessionUser, sourceStageId: number) {
  const payload = await totalStandings(env, sourceStageId);
  if (!payload) return error('La etapa no es una fase de grupos de Copa Total', 409);
  if (payload.provisional) return error('Todavía hay mini-partidos de Copa Total sin resultados definitivos', 409);
  if (payload.standings.length === 0) return error('La fase de grupos no tiene participantes', 409);

  const body = await request.json().catch(() => null) as {
    targetStageId?: number;
    targetSize?: number;
    directPositions?: number[];
    wildcardPosition?: number;
    wildcardCount?: number;
    manualQualifiedEntryIds?: number[];
    manualWildcardEntryIds?: number[];
  } | null;
  const targetStageId = Number(body?.targetStageId);
  if (!Number.isInteger(targetStageId) || targetStageId <= 0) return error('Etapa de Octavos inválida');
  const target = await stageInfo(env, targetStageId);
  if (!target || target.competition_id !== payload.source.competition_id || target.stage_type !== 'KNOCKOUT') {
    return error('La etapa destino debe ser una fase eliminatoria de la misma Copa Total', 409);
  }
  if (target.status === 'finished' || target.status === 'archived') return error('La etapa destino ya está cerrada', 409);

  const targetSize = body?.targetSize == null ? 16 : Number(body.targetSize);
  if (!Number.isInteger(targetSize) || targetSize < 2 || targetSize > payload.standings.length) return error('Cantidad objetivo de clasificados inválida');

  const byId = new Map(payload.standings.map((entry) => [entry.entryId, entry]));
  const manualQualified = Array.isArray(body?.manualQualifiedEntryIds)
    ? body!.manualQualifiedEntryIds!.map(Number)
    : null;
  if (manualQualified) {
    const unique = [...new Set(manualQualified)];
    if (unique.length !== targetSize || unique.some((id) => !Number.isInteger(id) || !byId.has(id))) {
      return error(`La selección manual debe contener exactamente ${targetSize} clasificados válidos`);
    }
    const rows = unique.map((id, index) => ({
      entry: byId.get(id)!, type: 'MANUAL' as const, rankingOrder: index + 1,
      reason: { mode: 'MANUAL', targetSize },
    }));
    await persistQualifiers(env, user, sourceStageId, targetStageId, rows);
    return json({ ok: true, sourceStageId, targetStageId, mode: 'MANUAL', qualifiers: rows });
  }

  const directPositions = Array.isArray(body?.directPositions) && body!.directPositions!.length > 0
    ? [...new Set(body!.directPositions!.map(Number))].sort((a, b) => a - b)
    : [1, 2];
  if (directPositions.some((value) => !Number.isInteger(value) || value <= 0)) return error('Posiciones directas inválidas');
  const wildcardPosition = body?.wildcardPosition == null ? 3 : Number(body.wildcardPosition);
  if (!Number.isInteger(wildcardPosition) || wildcardPosition <= 0) return error('Posición de comodín inválida');

  const directRows: Array<{ entry: StandingRow; type: 'DIRECT'; rankingOrder: number; reason: unknown }> = [];
  const groups = new Map<number, StandingRow[]>();
  for (const entry of payload.standings) {
    const list = groups.get(entry.groupId) ?? [];
    list.push(entry);
    groups.set(entry.groupId, list);
  }
  for (const entries of groups.values()) {
    const selected = entries.filter((entry) => directPositions.includes(entry.position));
    if (selected.length > directPositions.length) {
      return json({
        error: 'Hay un empate total dentro de un grupo justo en el corte de clasificación directa. Elegí los clasificados manualmente.',
        group: selected[0]?.groupCode ?? null,
        tiedEntries: selected.map((entry) => ({ entryId: entry.entryId, name: entry.displayName, position: entry.position })),
      }, { status: 409 });
    }
    for (const entry of selected) {
      directRows.push({
        entry, type: 'DIRECT', rankingOrder: directRows.length + 1,
        reason: { mode: 'GROUP_POSITION', group: entry.groupCode, position: entry.position },
      });
    }
  }
  if (directRows.length > targetSize) {
    return error('La configuración de posiciones directas produce más clasificados que el cuadro. Ajustala o usá selección manual.', 409);
  }

  const neededDefault = targetSize - directRows.length;
  const wildcardCount = body?.wildcardCount == null ? neededDefault : Number(body.wildcardCount);
  if (!Number.isInteger(wildcardCount) || wildcardCount < 0 || directRows.length + wildcardCount !== targetSize) {
    return error('La cantidad de mejores terceros/comodines no completa exactamente el cuadro');
  }
  const directIds = new Set(directRows.map((row) => row.entry.entryId));
  const wildcardCandidates = payload.standings
    .filter((entry) => entry.position === wildcardPosition && !directIds.has(entry.entryId))
    .sort(wildcardSort);
  if (wildcardCandidates.length < wildcardCount) {
    return error('No hay suficientes candidatos en la posición configurada para completar el cuadro', 409);
  }

  let chosenWildcards: StandingRow[] = [];
  let wildcardType: 'WILDCARD' | 'MANUAL' = 'WILDCARD';
  const manualWildcards = Array.isArray(body?.manualWildcardEntryIds)
    ? [...new Set(body!.manualWildcardEntryIds!.map(Number))]
    : null;
  if (manualWildcards) {
    const allowed = new Set(wildcardCandidates.map((entry) => entry.entryId));
    if (manualWildcards.length !== wildcardCount || manualWildcards.some((id) => !allowed.has(id))) {
      return error(`La selección manual de comodines debe contener exactamente ${wildcardCount} candidatos válidos`);
    }
    chosenWildcards = manualWildcards.map((id) => byId.get(id)!);
    wildcardType = 'MANUAL';
  } else if (wildcardCount > 0) {
    const chosen = wildcardCandidates.slice(0, wildcardCount);
    const lastChosen = chosen[chosen.length - 1];
    const firstOut = wildcardCandidates[wildcardCount];
    if (firstOut && sameWildcardScore(lastChosen, firstOut)) {
      const tied = wildcardCandidates.filter((entry) => sameWildcardScore(entry, lastChosen));
      return json({
        error: 'Hay empate total en el corte de mejores terceros/comodines. Elegí manualmente quién clasifica.',
        cutoffTie: tied.map((entry) => ({
          entryId: entry.entryId, name: entry.displayName, group: entry.groupCode,
          points: entry.points, gd: entry.gd, gf: entry.gf, won: entry.won,
        })),
        wildcardCount,
      }, { status: 409 });
    }
    chosenWildcards = chosen;
  }

  const rows = [
    ...directRows,
    ...chosenWildcards.map((entry, index) => ({
      entry,
      type: wildcardType,
      rankingOrder: directRows.length + index + 1,
      reason: {
        mode: wildcardType === 'MANUAL' ? 'MANUAL_WILDCARD' : 'BEST_POSITION',
        sourcePosition: wildcardPosition,
        points: entry.points, gd: entry.gd, gf: entry.gf, won: entry.won,
      },
    })),
  ];
  await persistQualifiers(env, user, sourceStageId, targetStageId, rows);
  return json({
    ok: true, sourceStageId, targetStageId, targetSize, directPositions, wildcardPosition, wildcardCount,
    qualifiers: rows.map((row) => ({
      entryId: row.entry.entryId, name: row.entry.displayName, group: row.entry.groupCode,
      position: row.entry.position, type: row.type,
    })),
  });
}

async function qualifiersPayload(env: Env, sourceStageId: number, targetStageId: number | null) {
  const sql = `SELECT q.id,q.source_stage_id,q.target_stage_id,q.entry_id,q.source_group_id,
                      q.qualification_type,q.source_position,q.ranking_order,q.reason_json,q.confirmed_at,
                      ce.display_name,g.code AS group_code,g.name AS group_name,ts.name AS target_stage_name
               FROM competition_stage_qualifiers q
               JOIN competition_entries ce ON ce.id=q.entry_id
               LEFT JOIN competition_groups g ON g.id=q.source_group_id
               JOIN competition_stages ts ON ts.id=q.target_stage_id
               WHERE q.source_stage_id=? ${targetStageId == null ? '' : 'AND q.target_stage_id=?'}
               ORDER BY q.target_stage_id,q.ranking_order,q.id`;
  const statement = env.DB.prepare(sql);
  const rows = targetStageId == null
    ? await statement.bind(sourceStageId).all<any>()
    : await statement.bind(sourceStageId, targetStageId).all<any>();
  return (rows.results ?? []).map((row) => ({
    id: Number(row.id), sourceStageId: Number(row.source_stage_id), targetStageId: Number(row.target_stage_id),
    targetStageName: row.target_stage_name, entryId: Number(row.entry_id), name: row.display_name,
    groupId: row.source_group_id == null ? null : Number(row.source_group_id), groupCode: row.group_code,
    groupName: row.group_name, qualificationType: row.qualification_type,
    sourcePosition: row.source_position == null ? null : Number(row.source_position),
    rankingOrder: row.ranking_order == null ? null : Number(row.ranking_order),
    reason: row.reason_json ? JSON.parse(row.reason_json) : null, confirmedAt: row.confirmed_at,
  }));
}

async function validateTargetLink(env: Env, source: StageRow, targetStageId: number, roundLinkId: number) {
  const target = await stageInfo(env, targetStageId);
  if (!target || target.competition_id !== source.competition_id || target.stage_type !== 'KNOCKOUT') {
    return { ok: false as const, error: 'La etapa destino debe ser eliminatoria y pertenecer a la misma Copa Total' };
  }
  if (target.status === 'finished' || target.status === 'archived') return { ok: false as const, error: 'La etapa destino ya está cerrada' };
  const link = await env.DB.prepare(
    `SELECT id FROM competition_round_links
     WHERE id=? AND competition_id=? AND stage_id=? AND purpose='NORMAL' LIMIT 1`,
  ).bind(roundLinkId, source.competition_id, targetStageId).first<{ id: number }>();
  if (!link) return { ok: false as const, error: 'La Fecha indicada no está vinculada a la etapa destino' };
  const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id=?`)
    .bind(targetStageId).first<{ total: number }>();
  if (Number(count?.total ?? 0) > 0) return { ok: false as const, error: 'La etapa destino ya tiene cruces' };
  return { ok: true as const, target };
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

function pairParticipants(available: number[], body: { random?: boolean; pairs?: PairInput[] }) {
  const uniqueAvailable = [...new Set(available)];
  if (uniqueAvailable.length !== available.length) return { ok: false as const, error: 'Hay clasificados duplicados' };
  if (Array.isArray(body.pairs)) {
    const seen = new Set<number>();
    const pairs: Array<[number, number | null]> = [];
    for (const raw of body.pairs) {
      const a = Number(raw.entryAId);
      const b = raw.entryBId == null ? null : Number(raw.entryBId);
      if (!Number.isInteger(a) || !uniqueAvailable.includes(a)) return { ok: false as const, error: 'Cruce manual con participante A inválido' };
      if (b != null && (!Number.isInteger(b) || !uniqueAvailable.includes(b))) return { ok: false as const, error: 'Cruce manual con participante B inválido' };
      if (b === a) return { ok: false as const, error: 'Un participante no puede enfrentarse consigo mismo' };
      if (seen.has(a) || (b != null && seen.has(b))) return { ok: false as const, error: 'Un participante aparece en más de un cruce' };
      seen.add(a); if (b != null) seen.add(b);
      pairs.push([a, b]);
    }
    if (seen.size !== uniqueAvailable.length) return { ok: false as const, error: 'Los cruces manuales deben usar exactamente todos los clasificados una sola vez' };
    return { ok: true as const, pairs, randomSeed: null };
  }
  if (body.random !== true) return { ok: false as const, error: 'Indicá los cruces manualmente o pedí sorteo aleatorio' };
  const seedBytes = new Uint32Array(1);
  crypto.getRandomValues(seedBytes);
  const randomSeed = Number(seedBytes[0]);
  const ordered = shuffled(uniqueAvailable, mulberry32(randomSeed));
  const pairs: Array<[number, number | null]> = [];
  for (let index = 0; index < ordered.length; index += 2) pairs.push([ordered[index], ordered[index + 1] ?? null]);
  return { ok: true as const, pairs, randomSeed };
}

async function confirmedOutcome(env: Env, stageId: number) {
  const rows = await env.DB.prepare(
    `SELECT id,entry_a_id,entry_b_id,winner_entry_id,status,admin_confirmed_at
     FROM competition_encounters WHERE stage_id=? ORDER BY id`,
  ).bind(stageId).all<{
    id: number; entry_a_id: number | null; entry_b_id: number | null; winner_entry_id: number | null;
    status: string; admin_confirmed_at: string | null;
  }>();
  const encounters = rows.results ?? [];
  if (encounters.length === 0) return { ok: false as const, error: 'La etapa origen no tiene cruces' };
  if (encounters.some((row) => row.status !== 'finished' || row.winner_entry_id == null || row.admin_confirmed_at == null)) {
    return { ok: false as const, error: 'Todos los cruces de la etapa origen deben estar resueltos y confirmados por Admin' };
  }
  const winners = encounters.map((row) => Number(row.winner_entry_id));
  const losers = encounters.map((row) => {
    const winner = Number(row.winner_entry_id);
    if (row.entry_a_id != null && Number(row.entry_a_id) !== winner) return Number(row.entry_a_id);
    if (row.entry_b_id != null && Number(row.entry_b_id) !== winner) return Number(row.entry_b_id);
    return null;
  }).filter((value): value is number => value != null);
  return { ok: true as const, winners, losers };
}

async function insertPairs(
  env: Env, user: SessionUser, sourceStageId: number, targetStageId: number, roundLinkId: number,
  available: number[], body: { random?: boolean; pairs?: PairInput[] }, slotPrefix: string, action: string,
) {
  const source = await stageInfo(env, sourceStageId);
  if (!source || source.competition_code !== 'COPA_TOTAL') return error('La etapa origen no pertenece a Copa Total', 409);
  const targetCheck = await validateTargetLink(env, source, targetStageId, roundLinkId);
  if (!targetCheck.ok) return error(targetCheck.error, 409);
  const paired = pairParticipants(available, body);
  if (!paired.ok) return error(paired.error, 409);
  const statements = paired.pairs.map((pair, index) => env.DB.prepare(
    `INSERT INTO competition_encounters(stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status)
     VALUES (?,?,?,?,?,'pending')`,
  ).bind(targetStageId, roundLinkId, `${slotPrefix}-${index + 1}`, pair[0], pair[1]));
  if (statements.length) await env.DB.batch(statements);
  await audit(env, user.id, action, 'competition_stage', String(targetStageId), {
    sourceStageId, targetStageId, roundLinkId, randomSeed: paired.randomSeed, pairs: paired.pairs,
  });
  return json({ ok: true, sourceStageId, targetStageId, roundLinkId, randomSeed: paired.randomSeed, pairs: paired.pairs });
}

async function buildProgression(request: Request, env: Env, user: SessionUser, sourceStageId: number, mode: string) {
  const body = await request.json().catch(() => null) as {
    targetStageId?: number; roundLinkId?: number; random?: boolean; pairs?: PairInput[];
  } | null;
  const targetStageId = Number(body?.targetStageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(targetStageId) || targetStageId <= 0) return error('Etapa destino inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha destino inválida');

  if (mode === 'qualified') {
    const rows = await env.DB.prepare(
      `SELECT entry_id FROM competition_stage_qualifiers
       WHERE source_stage_id=? AND target_stage_id=? ORDER BY ranking_order,id`,
    ).bind(sourceStageId, targetStageId).all<{ entry_id: number }>();
    const available = (rows.results ?? []).map((row) => Number(row.entry_id));
    if (available.length === 0) return error('Primero confirmá los clasificados desde la fase de grupos', 409);
    return insertPairs(env, user, sourceStageId, targetStageId, roundLinkId, available, body ?? {}, 'R16', 'competition.total_r16_built');
  }

  const outcome = await confirmedOutcome(env, sourceStageId);
  if (!outcome.ok) return error(outcome.error, 409);
  if (mode === 'third-place') {
    if (outcome.losers.length !== 2) return error('El tercer puesto necesita exactamente los dos perdedores de semifinales', 409);
    return insertPairs(env, user, sourceStageId, targetStageId, roundLinkId, outcome.losers, { pairs: [{ entryAId: outcome.losers[0], entryBId: outcome.losers[1] }] }, 'THIRD', 'competition.total_third_place_built');
  }
  const prefix = outcome.winners.length === 2 ? 'FINAL' : outcome.winners.length === 4 ? 'SF' : 'KO';
  return insertPairs(env, user, sourceStageId, targetStageId, roundLinkId, outcome.winners, body ?? {}, prefix, 'competition.total_next_round_built');
}

export async function handleCompetitionTotalProgression(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const qualifyMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/total\/qualify$/);
  if (qualifyMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return qualify(request, env, user, Number(qualifyMatch[1]));
  }

  const qualifiersMatch = pathname.match(/^\/api\/competition-engine\/stages\/(\d+)\/total\/qualifiers$/);
  if (qualifiersMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const targetParam = new URL(request.url).searchParams.get('targetStageId');
    const targetStageId = targetParam == null ? null : Number(targetParam);
    if (targetStageId != null && (!Number.isInteger(targetStageId) || targetStageId <= 0)) return error('Etapa destino inválida');
    return json({ sourceStageId: Number(qualifiersMatch[1]), qualifiers: await qualifiersPayload(env, Number(qualifiersMatch[1]), targetStageId) });
  }

  const progressionMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/total-progression\/(qualified|winners|third-place)$/);
  if (progressionMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return buildProgression(request, env, user, Number(progressionMatch[1]), progressionMatch[2]);
  }

  return null;
}
