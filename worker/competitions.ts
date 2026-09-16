type Env = {
  DB: D1Database;
};

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type SeasonStatus = 'draft' | 'active' | 'finished' | 'archived';
type CompetitionFamily = 'LEAGUE' | 'CUP' | 'PROMOTION';

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();

const DEFAULT_COMPETITIONS: Array<{
  code: string;
  canonicalName: string;
  family: CompetitionFamily;
  divisionCode: 'A' | 'B' | null;
  sortOrder: number;
}> = [
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

async function audit(env: Env, actorUserId: string, action: string, entityType: string, entityId: string, after: unknown = null) {
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(actorUserId, action, entityType, entityId, after == null ? null : JSON.stringify(after)).run();
}

async function seasonPayload(env: Env, seasonId: number) {
  const season = await env.DB.prepare(
    `SELECT id, season_number, name, status, created_at, started_at, finished_at
     FROM tafa_seasons WHERE id = ? LIMIT 1`,
  ).bind(seasonId).first<{
    id: number;
    season_number: number;
    name: string;
    status: SeasonStatus;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
  }>();
  if (!season) return null;

  const divisions = await env.DB.prepare(
    `SELECT d.id, d.code, d.name, d.sort_order, d.is_active,
            COUNT(dm.user_id) AS member_count
     FROM season_divisions d
     LEFT JOIN season_division_members dm ON dm.division_id = d.id AND dm.season_id = d.season_id
     WHERE d.season_id = ?
     GROUP BY d.id, d.code, d.name, d.sort_order, d.is_active
     ORDER BY d.sort_order, d.code`,
  ).bind(seasonId).all<{
    id: number;
    code: string;
    name: string;
    sort_order: number;
    is_active: number;
    member_count: number;
  }>();

  const members = await env.DB.prepare(
    `SELECT dm.user_id, dm.division_id, d.code AS division_code, u.full_name
     FROM season_division_members dm
     JOIN season_divisions d ON d.id = dm.division_id
     JOIN users u ON u.id = dm.user_id
     WHERE dm.season_id = ?
     ORDER BY d.sort_order, u.full_name COLLATE NOCASE`,
  ).bind(seasonId).all<{
    user_id: string;
    division_id: number;
    division_code: string;
    full_name: string;
  }>();

  const competitionsResult = await env.DB.prepare(
    `SELECT c.id, c.code, c.canonical_name, c.display_name, c.family, c.status,
            c.sort_order, c.division_id, d.code AS division_code,
            COUNT(DISTINCT cs.id) AS stage_count,
            COUNT(DISTINCT crl.id) AS linked_round_count
     FROM competitions c
     LEFT JOIN season_divisions d ON d.id = c.division_id
     LEFT JOIN competition_stages cs ON cs.competition_id = c.id
     LEFT JOIN competition_round_links crl ON crl.competition_id = c.id
     WHERE c.season_id = ?
     GROUP BY c.id, c.code, c.canonical_name, c.display_name, c.family, c.status,
              c.sort_order, c.division_id, d.code
     ORDER BY c.sort_order, c.id`,
  ).bind(seasonId).all<{
    id: number;
    code: string;
    canonical_name: string;
    display_name: string;
    family: CompetitionFamily;
    status: string;
    sort_order: number;
    division_id: number | null;
    division_code: string | null;
    stage_count: number;
    linked_round_count: number;
  }>();

  const competitions = [];
  for (const competition of competitionsResult.results ?? []) {
    const stages = await env.DB.prepare(
      `SELECT id, code, name, stage_type, sequence, status
       FROM competition_stages
       WHERE competition_id = ?
       ORDER BY sequence`,
    ).bind(competition.id).all<{
      id: number;
      code: string;
      name: string;
      stage_type: string;
      sequence: number;
      status: string;
    }>();

    const roundLinks = await env.DB.prepare(
      `SELECT crl.id, crl.stage_id, crl.round_id, crl.sequence, crl.purpose, crl.label,
              r.name AS round_name, r.status AS round_status, r.category
       FROM competition_round_links crl
       JOIN rounds r ON r.id = crl.round_id
       WHERE crl.competition_id = ?
       ORDER BY crl.sequence, crl.id`,
    ).bind(competition.id).all<{
      id: number;
      stage_id: number;
      round_id: number;
      sequence: number;
      purpose: string;
      label: string | null;
      round_name: string;
      round_status: string;
      category: string;
    }>();

    competitions.push({
      id: Number(competition.id),
      code: competition.code,
      canonicalName: competition.canonical_name,
      displayName: competition.display_name,
      family: competition.family,
      status: competition.status,
      sortOrder: Number(competition.sort_order),
      divisionId: competition.division_id == null ? null : Number(competition.division_id),
      divisionCode: competition.division_code,
      stageCount: Number(competition.stage_count ?? 0),
      linkedRoundCount: Number(competition.linked_round_count ?? 0),
      stages: (stages.results ?? []).map((stage) => ({
        id: Number(stage.id),
        code: stage.code,
        name: stage.name,
        stageType: stage.stage_type,
        sequence: Number(stage.sequence),
        status: stage.status,
      })),
      roundLinks: (roundLinks.results ?? []).map((link) => ({
        id: Number(link.id),
        stageId: Number(link.stage_id),
        roundId: Number(link.round_id),
        sequence: Number(link.sequence),
        purpose: link.purpose,
        label: link.label,
        roundName: link.round_name,
        roundStatus: link.round_status,
        category: link.category,
      })),
    });
  }

  return {
    id: Number(season.id),
    seasonNumber: Number(season.season_number),
    name: season.name,
    status: season.status,
    createdAt: season.created_at,
    startedAt: season.started_at,
    finishedAt: season.finished_at,
    divisions: (divisions.results ?? []).map((division) => ({
      id: Number(division.id),
      code: division.code,
      name: division.name,
      sortOrder: Number(division.sort_order),
      isActive: Boolean(division.is_active),
      memberCount: Number(division.member_count ?? 0),
    })),
    members: (members.results ?? []).map((member) => ({
      userId: member.user_id,
      fullName: member.full_name,
      divisionId: Number(member.division_id),
      divisionCode: member.division_code,
    })),
    competitions,
  };
}

async function adminState(env: Env) {
  const seasonsResult = await env.DB.prepare(
    `SELECT id FROM tafa_seasons
     ORDER BY season_number DESC, id DESC`,
  ).all<{ id: number }>();

  const seasons = [];
  for (const row of seasonsResult.results ?? []) {
    const payload = await seasonPayload(env, Number(row.id));
    if (payload) seasons.push(payload);
  }

  const participants = await env.DB.prepare(
    `SELECT id, full_name, is_active
     FROM users
     WHERE role = 'participant'
     ORDER BY full_name COLLATE NOCASE`,
  ).all<{ id: string; full_name: string; is_active: number }>();

  const rounds = await env.DB.prepare(
    `SELECT id, name, status, category, published_at, finished_at
     FROM rounds
     ORDER BY id DESC`,
  ).all<{
    id: number;
    name: string;
    status: string;
    category: string;
    published_at: string | null;
    finished_at: string | null;
  }>();

  return {
    seasons,
    participants: (participants.results ?? []).map((participant) => ({
      id: participant.id,
      fullName: participant.full_name,
      isActive: Boolean(participant.is_active),
    })),
    rounds: (rounds.results ?? []).map((round) => ({
      id: Number(round.id),
      name: round.name,
      status: round.status,
      category: round.category,
      publishedAt: round.published_at,
      finishedAt: round.finished_at,
    })),
  };
}

function seasonIdSubquery() {
  return `(SELECT id FROM tafa_seasons WHERE season_number = ? LIMIT 1)`;
}

async function createSeason(request: Request, env: Env, user: SessionUser) {
  const body = await request.json().catch(() => null) as { seasonNumber?: number; name?: string } | null;
  const seasonNumber = Number(body?.seasonNumber);
  if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) return error('Número de temporada inválido');
  const name = body?.name?.trim() || `Temporada ${seasonNumber}`;

  const existing = await env.DB.prepare('SELECT id FROM tafa_seasons WHERE season_number = ? LIMIT 1')
    .bind(seasonNumber).first<{ id: number }>();
  if (existing) return error(`La temporada T${seasonNumber} ya existe`, 409);

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(`INSERT INTO tafa_seasons (season_number, name) VALUES (?, ?)`).bind(seasonNumber, name),
    env.DB.prepare(`INSERT INTO season_divisions (season_id, code, name, sort_order) VALUES (${seasonIdSubquery()}, 'A', 'Liga A', 10)`).bind(seasonNumber),
    env.DB.prepare(`INSERT INTO season_divisions (season_id, code, name, sort_order) VALUES (${seasonIdSubquery()}, 'B', 'Liga B', 20)`).bind(seasonNumber),
  ];

  for (const competition of DEFAULT_COMPETITIONS) {
    const divisionSql = competition.divisionCode
      ? `(SELECT d.id FROM season_divisions d WHERE d.season_id = ${seasonIdSubquery()} AND d.code = ? LIMIT 1)`
      : 'NULL';
    const sql = `INSERT INTO competitions
      (season_id, division_id, code, canonical_name, display_name, family, sort_order)
      VALUES (${seasonIdSubquery()}, ${divisionSql}, ?, ?, ?, ?, ?)`;
    const bindings: Array<string | number> = [seasonNumber];
    if (competition.divisionCode) bindings.push(seasonNumber, competition.divisionCode);
    bindings.push(competition.code, competition.canonicalName, competition.canonicalName, competition.family, competition.sortOrder);
    statements.push(env.DB.prepare(sql).bind(...bindings));
  }

  statements.push(
    env.DB.prepare(
      `INSERT INTO competition_stages (competition_id, code, name, stage_type, sequence)
       SELECT c.id, 'LIGA', 'Liga', 'LEAGUE_TABLE', 1
       FROM competitions c
       JOIN tafa_seasons s ON s.id = c.season_id
       WHERE s.season_number = ? AND c.code IN ('LIGA_A', 'LIGA_B')`,
    ).bind(seasonNumber),
  );

  await env.DB.batch(statements);

  const created = await env.DB.prepare('SELECT id FROM tafa_seasons WHERE season_number = ? LIMIT 1')
    .bind(seasonNumber).first<{ id: number }>();
  if (!created) return error('No se pudo crear la temporada', 500);

  await audit(env, user.id, 'tafa_season.created', 'tafa_season', String(created.id), {
    seasonNumber,
    name,
    template: DEFAULT_COMPETITIONS.map((competition) => competition.code),
  });

  return json({ season: await seasonPayload(env, Number(created.id)) }, { status: 201 });
}

async function replaceDivisionAssignments(request: Request, env: Env, user: SessionUser, seasonId: number) {
  const season = await env.DB.prepare('SELECT id, status FROM tafa_seasons WHERE id = ? LIMIT 1')
    .bind(seasonId).first<{ id: number; status: SeasonStatus }>();
  if (!season) return error('Temporada no encontrada', 404);
  if (season.status === 'finished' || season.status === 'archived') return error('La temporada ya no admite cambios de división', 409);

  const body = await request.json().catch(() => null) as {
    assignments?: Array<{ userId?: string; divisionCode?: string }>;
  } | null;
  if (!Array.isArray(body?.assignments)) return error('Asignaciones inválidas');

  const divisionsResult = await env.DB.prepare(
    `SELECT id, code FROM season_divisions WHERE season_id = ? AND is_active = 1`,
  ).bind(seasonId).all<{ id: number; code: string }>();
  const divisions = new Map((divisionsResult.results ?? []).map((division) => [division.code, Number(division.id)]));

  const seenUsers = new Set<string>();
  const normalized: Array<{ userId: string; divisionCode: string; divisionId: number }> = [];
  for (const raw of body.assignments) {
    const userId = raw.userId?.trim() ?? '';
    const divisionCode = raw.divisionCode?.trim().toUpperCase() ?? '';
    if (!userId || !divisionCode) return error('Cada asignación necesita participante y división');
    if (seenUsers.has(userId)) return error('Un participante no puede estar en dos divisiones en la misma temporada');
    const divisionId = divisions.get(divisionCode);
    if (!divisionId) return error(`División ${divisionCode} inválida`);
    const participant = await env.DB.prepare(
      `SELECT id FROM users WHERE id = ? AND role = 'participant' AND is_active = 1 LIMIT 1`,
    ).bind(userId).first<{ id: string }>();
    if (!participant) return error('Hay un participante inexistente o inactivo en las asignaciones');
    seenUsers.add(userId);
    normalized.push({ userId, divisionCode, divisionId });
  }

  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM season_division_members WHERE season_id = ?').bind(seasonId),
  ];
  for (const assignment of normalized) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO season_division_members (season_id, division_id, user_id, source)
         VALUES (?, ?, ?, 'admin')`,
      ).bind(seasonId, assignment.divisionId, assignment.userId),
    );
  }
  await env.DB.batch(statements);

  await audit(env, user.id, 'tafa_season.divisions_assigned', 'tafa_season', String(seasonId), {
    assignments: normalized.map(({ userId, divisionCode }) => ({ userId, divisionCode })),
  });

  return json({ ok: true, season: await seasonPayload(env, seasonId) });
}

async function updateSeasonStatus(request: Request, env: Env, user: SessionUser, seasonId: number) {
  const body = await request.json().catch(() => null) as { status?: SeasonStatus } | null;
  const nextStatus = body?.status;
  if (!nextStatus || !['draft', 'active', 'archived'].includes(nextStatus)) {
    return error('Estado inválido');
  }

  const current = await env.DB.prepare('SELECT id, status FROM tafa_seasons WHERE id = ? LIMIT 1')
    .bind(seasonId).first<{ id: number; status: SeasonStatus }>();
  if (!current) return error('Temporada no encontrada', 404);
  if (current.status === 'finished') return error('Una temporada finalizada no puede reabrirse desde esta acción', 409);

  if (nextStatus === 'active') {
    const other = await env.DB.prepare(`SELECT id FROM tafa_seasons WHERE status = 'active' AND id <> ? LIMIT 1`)
      .bind(seasonId).first<{ id: number }>();
    if (other) return error('Ya hay otra temporada activa', 409);
  }

  await env.DB.prepare(
    `UPDATE tafa_seasons
     SET status = ?,
         started_at = CASE WHEN ? = 'active' THEN COALESCE(started_at, datetime('now')) ELSE started_at END,
         updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(nextStatus, nextStatus, seasonId).run();

  await audit(env, user.id, 'tafa_season.status_changed', 'tafa_season', String(seasonId), {
    before: current.status,
    after: nextStatus,
  });

  return json({ ok: true, season: await seasonPayload(env, seasonId) });
}

async function linkRound(request: Request, env: Env, user: SessionUser, competitionId: number) {
  const competition = await env.DB.prepare(
    `SELECT c.id, c.family, c.status, c.season_id, s.status AS season_status
     FROM competitions c JOIN tafa_seasons s ON s.id = c.season_id
     WHERE c.id = ? LIMIT 1`,
  ).bind(competitionId).first<{
    id: number;
    family: CompetitionFamily;
    status: string;
    season_id: number;
    season_status: SeasonStatus;
  }>();
  if (!competition) return error('Competición no encontrada', 404);
  if (competition.season_status === 'finished' || competition.season_status === 'archived') return error('La temporada ya está cerrada', 409);

  const body = await request.json().catch(() => null) as {
    stageId?: number;
    roundId?: number;
    sequence?: number;
    purpose?: 'NORMAL' | 'TIEBREAK';
    label?: string;
  } | null;
  const stageId = Number(body?.stageId);
  const roundId = Number(body?.roundId);
  const purpose = body?.purpose === 'TIEBREAK' ? 'TIEBREAK' : 'NORMAL';
  if (!Number.isInteger(stageId) || stageId <= 0 || !Number.isInteger(roundId) || roundId <= 0) return error('Etapa o fecha inválida');

  const stage = await env.DB.prepare(
    `SELECT id FROM competition_stages WHERE id = ? AND competition_id = ? LIMIT 1`,
  ).bind(stageId, competitionId).first<{ id: number }>();
  if (!stage) return error('La etapa no pertenece a esta competición', 409);

  const round = await env.DB.prepare('SELECT id, category FROM rounds WHERE id = ? LIMIT 1')
    .bind(roundId).first<{ id: number; category: string }>();
  if (!round) return error('Fecha no encontrada', 404);

  let sequence = Number(body?.sequence);
  if (!Number.isInteger(sequence) || sequence <= 0) {
    const max = await env.DB.prepare(
      `SELECT COALESCE(MAX(sequence), 0) AS max_sequence
       FROM competition_round_links WHERE stage_id = ? AND purpose = ?`,
    ).bind(stageId, purpose).first<{ max_sequence: number }>();
    sequence = Number(max?.max_sequence ?? 0) + 1;
  }

  await env.DB.prepare(
    `INSERT INTO competition_round_links
       (competition_id, stage_id, round_id, sequence, purpose, label)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(competitionId, stageId, roundId, sequence, purpose, body?.label?.trim() || null).run();

  if (round.category === 'AMISTOSO') {
    const category = purpose === 'TIEBREAK' ? 'DESEMPATE' : competition.family === 'LEAGUE' ? 'LIGA' : 'COPA';
    await env.DB.prepare(`UPDATE rounds SET category = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(category, roundId).run();
  }

  await audit(env, user.id, 'competition.round_linked', 'competition', String(competitionId), {
    stageId,
    roundId,
    sequence,
    purpose,
  });

  return json({ ok: true, season: await seasonPayload(env, Number(competition.season_id)) });
}

async function unlinkRound(env: Env, user: SessionUser, competitionId: number, linkId: number) {
  const link = await env.DB.prepare(
    `SELECT crl.id, crl.round_id, c.season_id
     FROM competition_round_links crl
     JOIN competitions c ON c.id = crl.competition_id
     WHERE crl.id = ? AND crl.competition_id = ? LIMIT 1`,
  ).bind(linkId, competitionId).first<{ id: number; round_id: number; season_id: number }>();
  if (!link) return error('Vínculo no encontrado', 404);

  await env.DB.prepare('DELETE FROM competition_round_links WHERE id = ?').bind(linkId).run();
  await audit(env, user.id, 'competition.round_unlinked', 'competition', String(competitionId), {
    linkId,
    roundId: link.round_id,
  });
  return json({ ok: true, season: await seasonPayload(env, Number(link.season_id)) });
}

async function participantCurrent(env: Env, user: SessionUser) {
  const season = await env.DB.prepare(
    `SELECT id, season_number, name, status
     FROM tafa_seasons
     WHERE status = 'active'
     ORDER BY season_number DESC LIMIT 1`,
  ).first<{ id: number; season_number: number; name: string; status: SeasonStatus }>();
  if (!season) return json({ season: null });

  const membership = await env.DB.prepare(
    `SELECT d.id, d.code, d.name
     FROM season_division_members dm
     JOIN season_divisions d ON d.id = dm.division_id
     WHERE dm.season_id = ? AND dm.user_id = ? LIMIT 1`,
  ).bind(season.id, user.id).first<{ id: number; code: string; name: string }>();

  const competitions = await env.DB.prepare(
    `SELECT DISTINCT c.id, c.code, c.display_name, c.family, c.status
     FROM competitions c
     LEFT JOIN competition_entries ce ON ce.competition_id = c.id
     LEFT JOIN competition_entry_members cem ON cem.entry_id = ce.id AND cem.user_id = ?
     WHERE c.season_id = ?
       AND (
         cem.user_id IS NOT NULL
         OR (c.division_id IS NOT NULL AND c.division_id = ? AND c.code IN ('LIGA_A', 'LIGA_B', 'COPA_A', 'COPA_B'))
       )
     ORDER BY c.sort_order`,
  ).bind(user.id, season.id, membership?.id ?? -1).all<{
    id: number;
    code: string;
    display_name: string;
    family: CompetitionFamily;
    status: string;
  }>();

  return json({
    season: {
      id: Number(season.id),
      seasonNumber: Number(season.season_number),
      name: season.name,
      status: season.status,
      division: membership ? { id: Number(membership.id), code: membership.code, name: membership.name } : null,
      competitions: (competitions.results ?? []).map((competition) => ({
        id: Number(competition.id),
        code: competition.code,
        displayName: competition.display_name,
        family: competition.family,
        status: competition.status,
      })),
    },
  });
}

export async function handleCompetitionEngine(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const isRoute = pathname.startsWith('/api/admin/competition-engine') || pathname === '/api/competition-engine/current';
  if (!isRoute) return null;

  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);

  if (pathname === '/api/competition-engine/current' && request.method === 'GET') {
    if (user.role !== 'participant') return error('Acceso de participante requerido', 403);
    return participantCurrent(env, user);
  }

  if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);

  if (pathname === '/api/admin/competition-engine' && request.method === 'GET') {
    return json(await adminState(env));
  }

  if (pathname === '/api/admin/competition-engine/seasons' && request.method === 'POST') {
    return createSeason(request, env, user);
  }

  const assignmentMatch = pathname.match(/^\/api\/admin\/competition-engine\/seasons\/(\d+)\/divisions$/);
  if (assignmentMatch && request.method === 'PUT') {
    return replaceDivisionAssignments(request, env, user, Number(assignmentMatch[1]));
  }

  const statusMatch = pathname.match(/^\/api\/admin\/competition-engine\/seasons\/(\d+)\/status$/);
  if (statusMatch && request.method === 'PUT') {
    return updateSeasonStatus(request, env, user, Number(statusMatch[1]));
  }

  const linkMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/rounds$/);
  if (linkMatch && request.method === 'POST') {
    return linkRound(request, env, user, Number(linkMatch[1]));
  }

  const unlinkMatch = pathname.match(/^\/api\/admin\/competition-engine\/competitions\/(\d+)\/rounds\/(\d+)$/);
  if (unlinkMatch && request.method === 'DELETE') {
    return unlinkRound(env, user, Number(unlinkMatch[1]), Number(unlinkMatch[2]));
  }

  return error('Not found', 404);
}
