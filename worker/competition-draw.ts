import type { Env } from './index';
import { configureGroups } from './competition-groups';
import { cupGroupContext } from './cup-ab-context';

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type Participant = {
  user_id: string;
  full_name: string;
};

type DrawBody = {
  reason?: string;
  rankingUserIds?: string[];
  defendingChampionUserId?: string | null;
  groupCount?: number;
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

function groupCode(index: number) {
  if (index < 26) return String.fromCharCode(65 + index);
  return `G${index + 1}`;
}

async function ensureEntries(env: Env, competitionId: number, participants: Participant[], seedOrder: string[]) {
  const existingResult = await env.DB.prepare(
    `SELECT ce.id, cem.user_id
     FROM competition_entries ce
     JOIN competition_entry_members cem ON cem.entry_id = ce.id
     WHERE ce.competition_id = ? AND ce.entry_type = 'INDIVIDUAL'`,
  ).bind(competitionId).all<{ id: number; user_id: string }>();
  const entryByUser = new Map((existingResult.results ?? []).map((row) => [row.user_id, Number(row.id)]));
  const participantById = new Map(participants.map((participant) => [participant.user_id, participant]));

  for (let seedIndex = 0; seedIndex < seedOrder.length; seedIndex += 1) {
    const userId = seedOrder[seedIndex];
    const participant = participantById.get(userId);
    if (!participant) throw new Error('Participante de sorteo inválido');

    let entryId = entryByUser.get(userId);
    if (!entryId) {
      const created = await env.DB.prepare(
        `INSERT INTO competition_entries
           (competition_id, entry_type, display_name, seed_position, source_json)
         VALUES (?, 'INDIVIDUAL', ?, ?, ?) RETURNING id`,
      ).bind(
        competitionId,
        participant.full_name,
        seedIndex + 1,
        JSON.stringify({ source: 'division', userId }),
      ).first<{ id: number }>();
      if (!created) throw new Error('No se pudo crear la entrada de Copa');
      entryId = Number(created.id);
      await env.DB.prepare(
        `INSERT INTO competition_entry_members (entry_id, user_id) VALUES (?, ?)`,
      ).bind(entryId, userId).run();
      entryByUser.set(userId, entryId);
    } else {
      await env.DB.prepare(
        `UPDATE competition_entries
         SET display_name = ?, seed_position = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).bind(participant.full_name, seedIndex + 1, entryId).run();
    }
  }

  return entryByUser;
}

async function drawGroups(request: Request, env: Env, user: SessionUser, stageId: number) {
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
  if (!['COPA_A', 'COPA_B'].includes(stage.competition_code)) return error('El sorteo por bombos de este bloque sólo aplica a Copa A/B', 409);
  if (stage.division_id == null) return error('La Copa no tiene división asociada', 409);
  if (stage.status !== 'draft') return error('El sorteo sólo puede rehacerse mientras la etapa está en borrador', 409);
  if (stage.season_status === 'finished' || stage.season_status === 'archived') return error('La temporada ya está cerrada', 409);

  const linkedRounds = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_round_links WHERE stage_id = ?`,
  ).bind(stageId).first<{ total: number }>();
  if (Number(linkedRounds?.total ?? 0) > 0) return error('Desvinculá las Fechas antes de volver a sortear', 409);

  const participantsResult = await env.DB.prepare(
    `SELECT dm.user_id, u.full_name
     FROM season_division_members dm
     JOIN users u ON u.id = dm.user_id AND u.role = 'participant'
     WHERE dm.season_id = ? AND dm.division_id = ?
     ORDER BY u.full_name COLLATE NOCASE`,
  ).bind(stage.season_id, stage.division_id).all<Participant>();
  const participants = participantsResult.results ?? [];
  if (participants.length === 0) return error('La división todavía no tiene participantes', 409);

  const body = await request.json().catch(() => null) as DrawBody | null;
  if (!Array.isArray(body?.rankingUserIds)) return error('Falta el orden IFFHS de los participantes');

  const eligibleIds = new Set(participants.map((participant) => participant.user_id));
  const ranking = body.rankingUserIds.map((value) => String(value).trim());
  const rankingSet = new Set(ranking);
  if (ranking.length !== participants.length || rankingSet.size !== participants.length) {
    return error('El ranking IFFHS debe contener a todos los participantes elegibles exactamente una vez');
  }
  for (const userId of ranking) {
    if (!eligibleIds.has(userId)) return error('El ranking contiene un participante que no pertenece a esta división');
  }

  let groupCount = Number(body.groupCount);
  if (!Number.isInteger(groupCount) || groupCount <= 0) {
    if (participants.length === 16) groupCount = 4;
    else return error('Para una cantidad distinta de 16 participantes indicá cuántos grupos querés usar');
  }
  if (groupCount < 2 || groupCount > participants.length) return error('Cantidad de grupos inválida');

  const context=await cupGroupContext(env,stageId);
  if(context && ['finished','archived'].includes(context.stage.competition_status)) return error('La Copa está cerrada',409);
  const defendingChampionUserId = context?.championKnown ? context.defendingChampionUserId :
    body.defendingChampionUserId !== undefined ? (body.defendingChampionUserId?.trim() || null) : context?.defendingChampionUserId ?? null;
  if (defendingChampionUserId && !eligibleIds.has(defendingChampionUserId)) {
    return error('El campeón vigente indicado no es elegible para esta Copa');
  }

  const seedOrder = defendingChampionUserId
    ? [defendingChampionUserId, ...ranking.filter((userId) => userId !== defendingChampionUserId)]
    : [...ranking];

  const randomSeedBytes = new Uint32Array(1);
  crypto.getRandomValues(randomSeedBytes);
  const randomSeed = Number(randomSeedBytes[0]);
  const random = mulberry32(randomSeed);

  const groups: Array<{ code: string; name: string; userIds: string[]; pots: number[] }> = Array.from(
    { length: groupCount },
    (_, index) => ({ code: groupCode(index), name: `Grupo ${groupCode(index)}`, userIds: [], pots: [] }),
  );

  for (let potStart = 0, potNumber = 1; potStart < seedOrder.length; potStart += groupCount, potNumber += 1) {
    const pot = seedOrder.slice(potStart, potStart + groupCount);
    const groupIndexes = Array.from({ length: groupCount }, (_, index) => index);

    if (potNumber === 1 && defendingChampionUserId && pot.includes(defendingChampionUserId)) {
      groups[0].userIds.push(defendingChampionUserId);
      groups[0].pots.push(potNumber);
      const remainingUsers = shuffled(pot.filter((userId) => userId !== defendingChampionUserId), random);
      const remainingGroups = shuffled(groupIndexes.slice(1), random);
      remainingUsers.forEach((userId, index) => {
        const targetGroup = remainingGroups[index];
        groups[targetGroup].userIds.push(userId);
        groups[targetGroup].pots.push(potNumber);
      });
      continue;
    }

    const shuffledUsers = shuffled(pot, random);
    const shuffledGroups = shuffled(groupIndexes, random);
    shuffledUsers.forEach((userId, index) => {
      const targetGroup = shuffledGroups[index];
      groups[targetGroup].userIds.push(userId);
      groups[targetGroup].pots.push(potNumber);
    });
  }

  let entryByUser: Map<string, number>;
  try {
    entryByUser = await ensureEntries(env, stage.competition_id, participants, seedOrder);
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'No se pudieron crear las entradas de Copa', 500);
  }

  const resultGroups=groups.map(group=>({...group,participants:group.userIds.map((userId,index)=>({userId,fullName:participants.find(p=>p.user_id===userId)?.full_name,pot:group.pots[index]}))}));
  const configured=await configureGroups(new Request(request.url,{method:'POST',headers:request.headers,
     body:JSON.stringify({groups,defendingChampionUserId,reason:body.reason})}),env,user,stageId,{
      randomSeed,groupCount,defendingChampionUserId,rankingUserIds:ranking,effectiveSeedOrder:seedOrder,
    });
  if(!configured.ok) return configured;
  return json({
    ok: true,
    stageId,
    competitionCode: stage.competition_code,
    randomSeed,
    groupCount,
    defendingChampionUserId,
    effectiveSeedOrder: seedOrder,
    groups: resultGroups,
  });
}

export async function handleCompetitionDraw(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/groups\/draw$/);
  if (!match) return null;

  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);
  if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
  if (request.method !== 'POST') return error('Método no permitido', 405);

  return drawGroups(request, env, user, Number(match[1]));
}
