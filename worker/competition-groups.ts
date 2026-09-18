import type { Env } from './index';

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type GroupAssignment = {
  code?: string;
  name?: string;
  userIds?: string[];
};

type GroupStandingRow = {
  group_id: number;
  group_code: string;
  group_name: string;
  group_sequence: number;
  entry_id: number;
  entry_name: string;
  user_id: string;
  full_name: string;
  rounds_played: number;
  points: number;
  fulls: number;
  partials: number;
  errors: number;
  extras: number;
  provisional_scores: number;
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

async function audit(env: Env, actorUserId: string, action: string, entityType: string, entityId: string, after: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(actorUserId, action, entityType, entityId, JSON.stringify(after)).run();
}

function normalizedCupCode(raw: string) {
  const code = raw.trim().toUpperCase();
  if (code === 'A') return 'COPA_A';
  if (code === 'B') return 'COPA_B';
  return code;
}

async function configureGroups(request: Request, env: Env, user: SessionUser, stageId: number) {
  const stage = await env.DB.prepare(
    `SELECT cs.id, cs.competition_id, cs.stage_type, cs.status,
            c.code AS competition_code, c.season_id, c.division_id,
            s.status AS season_status
     FROM competition_stages cs
     JOIN competitions c ON c.id = cs.competition_id
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE cs.id = ? LIMIT 1`,
  ).bind(stageId).first<{
    id: number;
    competition_id: number;
    stage_type: string;
    status: string;
    competition_code: string;
    season_id: number;
    division_id: number | null;
    season_status: string;
  }>();

  if (!stage) return error('Etapa no encontrada', 404);
  if (stage.stage_type !== 'ACCUMULATIVE_GROUPS') return error('La etapa no es de grupos acumulativos', 409);
  if (!['COPA_A', 'COPA_B'].includes(stage.competition_code)) return error('Esta configuración sólo corresponde a Copa A/B', 409);
  if (stage.division_id == null) return error('La Copa no tiene una división asociada', 409);
  if (stage.season_status === 'finished' || stage.season_status === 'archived') return error('La temporada ya está cerrada', 409);
  if (stage.status !== 'draft') return error('Los grupos sólo pueden reemplazarse mientras la etapa está en borrador', 409);

  const linkedRounds = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_round_links WHERE stage_id = ?`,
  ).bind(stageId).first<{ total: number }>();
  if (Number(linkedRounds?.total ?? 0) > 0) return error('Desvinculá las Fechas antes de reemplazar los grupos', 409);

  const body = await request.json().catch(() => null) as { groups?: GroupAssignment[] } | null;
  if (!Array.isArray(body?.groups) || body.groups.length === 0) return error('Tenés que enviar al menos un grupo');

  const eligibleResult = await env.DB.prepare(
    `SELECT dm.user_id, u.full_name
     FROM season_division_members dm
     JOIN users u ON u.id = dm.user_id AND u.role = 'participant'
     WHERE dm.season_id = ? AND dm.division_id = ?
     ORDER BY u.full_name COLLATE NOCASE`,
  ).bind(stage.season_id, stage.division_id).all<{ user_id: string; full_name: string }>();
  const eligible = eligibleResult.results ?? [];
  if (eligible.length === 0) return error('La división todavía no tiene participantes asignados', 409);

  const eligibleIds = new Set(eligible.map((row) => row.user_id));
  const seenUsers = new Set<string>();
  const seenCodes = new Set<string>();
  const normalizedGroups: Array<{ code: string; name: string; userIds: string[] }> = [];

  for (let index = 0; index < body.groups.length; index += 1) {
    const raw = body.groups[index];
    const code = (raw.code?.trim() || String.fromCharCode(65 + index)).toUpperCase();
    const name = raw.name?.trim() || `Grupo ${code}`;
    if (!code || seenCodes.has(code)) return error('Los códigos de grupo no pueden repetirse');
    if (!Array.isArray(raw.userIds) || raw.userIds.length === 0) return error(`${name} no tiene participantes`);
    seenCodes.add(code);

    const userIds: string[] = [];
    for (const rawUserId of raw.userIds) {
      const userId = String(rawUserId).trim();
      if (!eligibleIds.has(userId)) return error(`Hay un participante que no pertenece a la división de ${stage.competition_code}`);
      if (seenUsers.has(userId)) return error('Un participante no puede aparecer en dos grupos');
      seenUsers.add(userId);
      userIds.push(userId);
    }
    normalizedGroups.push({ code, name, userIds });
  }

  if (seenUsers.size !== eligibleIds.size) {
    const missing = eligible.filter((row) => !seenUsers.has(row.user_id)).map((row) => row.full_name);
    return error(`Faltan participantes de la división: ${missing.join(', ')}`);
  }

  const existingEntriesResult = await env.DB.prepare(
    `SELECT ce.id, cem.user_id
     FROM competition_entries ce
     JOIN competition_entry_members cem ON cem.entry_id = ce.id
     WHERE ce.competition_id = ? AND ce.entry_type = 'INDIVIDUAL'`,
  ).bind(stage.competition_id).all<{ id: number; user_id: string }>();
  const entryByUser = new Map((existingEntriesResult.results ?? []).map((row) => [row.user_id, Number(row.id)]));

  for (const participant of eligible) {
    if (entryByUser.has(participant.user_id)) continue;
    const inserted = await env.DB.prepare(
      `INSERT INTO competition_entries (competition_id, entry_type, display_name, source_json)
       VALUES (?, 'INDIVIDUAL', ?, ?) RETURNING id`,
    ).bind(stage.competition_id, participant.full_name, JSON.stringify({ source: 'division', userId: participant.user_id }))
      .first<{ id: number }>();
    if (!inserted) return error('No se pudo crear una entrada de Copa', 500);
    const entryId = Number(inserted.id);
    await env.DB.prepare(
      `INSERT INTO competition_entry_members (entry_id, user_id) VALUES (?, ?)`,
    ).bind(entryId, participant.user_id).run();
    entryByUser.set(participant.user_id, entryId);
  }

  const currentGroups = await env.DB.prepare(
    `SELECT id FROM competition_groups WHERE stage_id = ?`,
  ).bind(stageId).all<{ id: number }>();
  const statements: D1PreparedStatement[] = [];
  for (const group of currentGroups.results ?? []) {
    statements.push(env.DB.prepare('DELETE FROM competition_group_entries WHERE group_id = ?').bind(group.id));
  }
  statements.push(env.DB.prepare('DELETE FROM competition_groups WHERE stage_id = ?').bind(stageId));
  if (statements.length > 0) await env.DB.batch(statements);

  for (let groupIndex = 0; groupIndex < normalizedGroups.length; groupIndex += 1) {
    const group = normalizedGroups[groupIndex];
    const createdGroup = await env.DB.prepare(
      `INSERT INTO competition_groups (stage_id, code, name, sequence)
       VALUES (?, ?, ?, ?) RETURNING id`,
    ).bind(stageId, group.code, group.name, groupIndex + 1).first<{ id: number }>();
    if (!createdGroup) return error('No se pudo crear un grupo', 500);

    const membershipStatements: D1PreparedStatement[] = [];
    for (let seedIndex = 0; seedIndex < group.userIds.length; seedIndex += 1) {
      const entryId = entryByUser.get(group.userIds[seedIndex]);
      if (!entryId) return error('No se encontró la entrada de un participante', 500);
      membershipStatements.push(
        env.DB.prepare(
          `INSERT INTO competition_group_entries (group_id, entry_id, seed_position)
           VALUES (?, ?, ?)`,
        ).bind(createdGroup.id, entryId, seedIndex + 1),
      );
    }
    if (membershipStatements.length > 0) await env.DB.batch(membershipStatements);
  }

  await audit(env, user.id, 'competition.groups_configured', 'competition_stage', String(stageId), {
    competitionId: stage.competition_id,
    groups: normalizedGroups,
  });

  return json({ ok: true, stageId, groups: normalizedGroups });
}

async function groupStandings(request: Request, env: Env, cupCodeRaw: string) {
  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);

  const cupCode = normalizedCupCode(cupCodeRaw);
  if (!['COPA_A', 'COPA_B'].includes(cupCode)) return error('Copa inválida', 404);

  const url = new URL(request.url);
  const requestedSeason = Number(url.searchParams.get('season'));
  const useRequestedSeason = Number.isInteger(requestedSeason) && requestedSeason > 0;
  const seasonFilter = useRequestedSeason ? 's.season_number = ?' : "s.status = 'active'";
  const bindings: Array<string | number> = [];
  if (useRequestedSeason) bindings.push(requestedSeason);
  bindings.push(cupCode);

  const stage = await env.DB.prepare(
    `SELECT cs.id, cs.name AS stage_name, cs.status AS stage_status,
            c.id AS competition_id, c.code AS competition_code, c.display_name,
            s.id AS season_id, s.season_number, s.name AS season_name, s.status AS season_status,
            d.code AS division_code, d.name AS division_name
     FROM competition_stages cs
     JOIN competitions c ON c.id = cs.competition_id
     JOIN tafa_seasons s ON s.id = c.season_id
     LEFT JOIN season_divisions d ON d.id = c.division_id
     WHERE ${seasonFilter}
       AND c.code = ?
       AND cs.stage_type = 'ACCUMULATIVE_GROUPS'
     ORDER BY cs.sequence
     LIMIT 1`,
  ).bind(...bindings).first<{
    id: number;
    stage_name: string;
    stage_status: string;
    competition_id: number;
    competition_code: string;
    display_name: string;
    season_id: number;
    season_number: number;
    season_name: string;
    season_status: string;
    division_code: string | null;
    division_name: string | null;
  }>();

  if (!stage) return error('La fase de grupos todavía no está configurada', 404);

  const linkedRoundsResult = await env.DB.prepare(
    `SELECT crl.round_id, crl.sequence, r.name, r.status, r.finished_at
     FROM competition_round_links crl
     JOIN rounds r ON r.id = crl.round_id
     WHERE crl.stage_id = ? AND crl.purpose = 'NORMAL'
     ORDER BY crl.sequence`,
  ).bind(stage.id).all<{
    round_id: number;
    sequence: number;
    name: string;
    status: string;
    finished_at: string | null;
  }>();

  const standingsResult = await env.DB.prepare(
    `SELECT
       g.id AS group_id,
       g.code AS group_code,
       g.name AS group_name,
       g.sequence AS group_sequence,
       ce.id AS entry_id,
       ce.display_name AS entry_name,
       cem.user_id,
       u.full_name,
       COUNT(DISTINCT CASE WHEN op.id IS NOT NULL THEN crl.round_id END) AS rounds_played,
       COALESCE(SUM(ps.total_points), 0) AS points,
       COALESCE(SUM(CASE WHEN ps.base_points = 3 THEN 1 ELSE 0 END), 0) AS fulls,
       COALESCE(SUM(CASE WHEN ps.base_points = 1 THEN 1 ELSE 0 END), 0) AS partials,
       COALESCE(SUM(CASE WHEN ps.base_points = 0 AND ps.result_type <> 'VOID' THEN 1 ELSE 0 END), 0) AS errors,
       COALESCE(SUM(ps.extra_points), 0) AS extras,
       COALESCE(SUM(CASE WHEN ps.is_provisional = 1 THEN 1 ELSE 0 END), 0) AS provisional_scores
     FROM competition_groups g
     JOIN competition_group_entries cge ON cge.group_id = g.id
     JOIN competition_entries ce ON ce.id = cge.entry_id
     JOIN competition_entry_members cem ON cem.entry_id = ce.id
     JOIN users u ON u.id = cem.user_id
     LEFT JOIN competition_round_links crl
       ON crl.stage_id = g.stage_id AND crl.purpose = 'NORMAL'
     LEFT JOIN matches m ON m.round_id = crl.round_id
     LEFT JOIN official_predictions op
       ON op.user_id = cem.user_id AND op.match_id = m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id = op.id
     WHERE g.stage_id = ?
     GROUP BY g.id, g.code, g.name, g.sequence,
              ce.id, ce.display_name, cem.user_id, u.full_name
     ORDER BY g.sequence,
              points DESC, fulls DESC, partials DESC, errors ASC, extras DESC,
              u.full_name COLLATE NOCASE`,
  ).bind(stage.id).all<GroupStandingRow>();

  const groups = new Map<number, {
    id: number;
    code: string;
    name: string;
    sequence: number;
    standings: Array<{
      position: number;
      entryId: number;
      userId: string;
      fullName: string;
      roundsPlayed: number;
      points: number;
      fulls: number;
      partials: number;
      errors: number;
      extras: number;
      provisional: boolean;
      destination: 'QUARTERFINAL' | 'ROUND_OF_16' | 'ELIMINATED';
    }>;
  }>();

  for (const row of standingsResult.results ?? []) {
    let group = groups.get(Number(row.group_id));
    if (!group) {
      group = {
        id: Number(row.group_id),
        code: row.group_code,
        name: row.group_name,
        sequence: Number(row.group_sequence),
        standings: [],
      };
      groups.set(Number(row.group_id), group);
    }

    const position = group.standings.length + 1;
    group.standings.push({
      position,
      entryId: Number(row.entry_id),
      userId: row.user_id,
      fullName: row.full_name,
      roundsPlayed: Number(row.rounds_played ?? 0),
      points: Number(row.points ?? 0),
      fulls: Number(row.fulls ?? 0),
      partials: Number(row.partials ?? 0),
      errors: Number(row.errors ?? 0),
      extras: Number(row.extras ?? 0),
      provisional: Number(row.provisional_scores ?? 0) > 0,
      destination: position === 1 ? 'QUARTERFINAL' : position <= 3 ? 'ROUND_OF_16' : 'ELIMINATED',
    });
  }

  const linkedRounds = linkedRoundsResult.results ?? [];
  const stageProvisional = linkedRounds.some((round) => round.status !== 'finished')
    || Array.from(groups.values()).some((group) => group.standings.some((entry) => entry.provisional));

  return json({
    currentUserId: user.id,
    season: {
      id: Number(stage.season_id),
      seasonNumber: Number(stage.season_number),
      name: stage.season_name,
      status: stage.season_status,
    },
    competition: {
      id: Number(stage.competition_id),
      code: stage.competition_code,
      displayName: stage.display_name,
    },
    division: stage.division_code ? { code: stage.division_code, name: stage.division_name } : null,
    stage: {
      id: Number(stage.id),
      name: stage.stage_name,
      status: stage.stage_status,
      type: 'ACCUMULATIVE_GROUPS',
    },
    linkedRounds: linkedRounds.map((round) => ({
      roundId: Number(round.round_id),
      sequence: Number(round.sequence),
      name: round.name,
      status: round.status,
      finishedAt: round.finished_at,
    })),
    provisional: stageProvisional,
    groups: Array.from(groups.values()).sort((a, b) => a.sequence - b.sequence),
  });
}

export async function handleCompetitionGroups(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const adminMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/groups$/);
  if (adminMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return configureGroups(request, env, user, Number(adminMatch[1]));
  }

  const publicMatch = pathname.match(/^\/api\/competition-engine\/cups\/([^/]+)\/groups$/);
  if (publicMatch) {
    if (request.method !== 'GET') return error('Método no permitido', 405);
    return groupStandings(request, env, decodeURIComponent(publicMatch[1]));
  }

  return null;
}
