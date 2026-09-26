import type { Env } from './index';
import { refreshStage } from './competition-knockout';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type StageRow = { id: number; competition_id: number; competition_code: string; stage_type: string; status: string };
type RankedEntry = {
  groupId: number; groupCode: string; position: number; entryId: number; displayName: string;
  points: number; fulls: number; partials: number; errors: number; extras: number;
};
type Options = { mode?: 'MANUAL' | 'AUTOMATIC'; pairs?: number[][]; replace?: boolean; reason?: string; preview?: boolean };
type TargetValidation = { ok: true; target: StageRow } | { ok: false; error: string };
type WinnersResult = {
  ok: true;
  winners: Array<{ entryId: number; displayName: string }>;
} | { ok: false; error: string };

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
  const user = await env.DB.prepare(
    `SELECT u.id, u.role, u.is_active FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1 LIMIT 1`,
  ).bind(await sha256(token)).first<SessionUser>();
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
function freshSeed() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return Number(bytes[0]);
}

async function stageInfo(env: Env, stageId: number) {
  return env.DB.prepare(
    `SELECT cs.id, cs.competition_id, c.code AS competition_code, cs.stage_type, cs.status
     FROM competition_stages cs JOIN competitions c ON c.id=cs.competition_id
     WHERE cs.id=? LIMIT 1`,
  ).bind(stageId).first<StageRow>();
}

async function validateTarget(env: Env, source: StageRow, targetStageId: number, roundLinkId: number, options: Options = {}): Promise<TargetValidation> {
  const target = await stageInfo(env, targetStageId);
  if (!target) return { ok: false, error: 'Etapa destino no encontrada' };
  if (target.competition_id !== source.competition_id) return { ok: false, error: 'Las etapas no pertenecen a la misma Copa' };
  if (target.stage_type !== 'KNOCKOUT') return { ok: false, error: 'La etapa destino debe ser eliminatoria' };
  if (target.status === 'finished' || target.status === 'archived') return { ok: false, error: 'La etapa destino ya está cerrada' };

  const link = await env.DB.prepare(
    `SELECT id FROM competition_round_links
     WHERE id = ? AND competition_id = ? AND stage_id = ? AND purpose = 'NORMAL' LIMIT 1`,
  ).bind(roundLinkId, source.competition_id, targetStageId).first<{ id: number }>();
  if (!link) return { ok: false, error: 'La Fecha no está vinculada a la etapa destino' };

  const lock = await env.DB.prepare(`SELECT r.status, r.published_at,
      EXISTS(SELECT 1 FROM matches m WHERE m.round_id=r.id AND julianday(m.kickoff_at)<=julianday('now')) AS started
    FROM competition_round_links l JOIN rounds r ON r.id=l.round_id WHERE l.id=?`).bind(roundLinkId)
    .first<{ status: string; published_at: string | null; started: number }>();
  if (lock?.status !== 'draft' || lock.published_at || lock.started) return { ok: false, error: 'La Fecha destino ya fue publicada o iniciada; no se pueden reemplazar sus cruces' };
  const closed = await env.DB.prepare(`SELECT c.status, s.status AS season_status FROM competitions c JOIN tafa_seasons s ON s.id=c.season_id WHERE c.id=?`)
    .bind(source.competition_id).first<{status:string;season_status:string}>();
  if (closed && [closed.status,closed.season_status].some((v)=>['finished','archived'].includes(v))) return {ok:false,error:'La Copa o temporada está cerrada'};
  if (target.id === source.id) return {ok:false,error:'La etapa origen y destino deben ser diferentes'};
  const unsafe = await env.DB.prepare(`SELECT COUNT(*) AS n FROM competition_encounters e
    LEFT JOIN competition_round_links l ON l.id=e.round_link_id LEFT JOIN rounds r ON r.id=l.round_id
    WHERE e.stage_id=? AND (e.admin_confirmed_at IS NOT NULL OR r.status<>'draft' OR r.published_at IS NOT NULL
      OR EXISTS(SELECT 1 FROM matches m WHERE m.round_id=r.id AND julianday(m.kickoff_at)<=julianday('now'))
      OR EXISTS(SELECT 1 FROM competition_tiebreaks t WHERE t.encounter_id=e.id))`).bind(targetStageId).first<{n:number}>();
  if (Number(unsafe?.n)>0) return {ok:false,error:'La etapa ya tiene actividad deportiva; no se pueden reemplazar sus cruces'};
  const encounters = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id=?`,
  ).bind(targetStageId).first<{ total: number }>();
  if (Number(encounters?.total ?? 0) > 0 && !options.replace && !options.preview) return { ok: false, error: 'La etapa destino ya tiene cruces sorteados' };
  if (options.replace && !options.preview && !options.reason?.trim()) return {ok:false,error:'Indicá el motivo de la corrección'};
  return { ok: true, target };
}

async function requireFinishedGroupDates(env: Env, groupStageId: number) {
  const rows = await env.DB.prepare(
    `SELECT r.status FROM competition_round_links crl JOIN rounds r ON r.id=crl.round_id
     WHERE crl.stage_id=? AND crl.purpose='NORMAL'`,
  ).bind(groupStageId).all<{ status: string }>();
  const dates = rows.results ?? [];
  if (dates.length !== 2) return 'La fase de grupos necesita exactamente dos Fechas vinculadas';
  if (dates.some((row) => row.status !== 'finished')) return 'La fase de grupos todavía tiene Fechas sin cerrar';
  return null;
}

async function rankedGroups(env: Env, stageId: number): Promise<RankedEntry[]> {
  const rows = await env.DB.prepare(
    `SELECT g.id AS group_id, g.code AS group_code, g.sequence AS group_sequence,
       ce.id AS entry_id, ce.display_name,
       COALESCE(SUM(ps.total_points),0) AS points,
       COALESCE(SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END),0) AS fulls,
       COALESCE(SUM(CASE WHEN ps.base_points=1 THEN 1 ELSE 0 END),0) AS partials,
       COALESCE(SUM(CASE WHEN ps.base_points=0 AND ps.result_type<>'VOID' THEN 1 ELSE 0 END),0) AS errors,
       COALESCE(SUM(ps.extra_points),0) AS extras
     FROM competition_groups g
     JOIN competition_group_entries cge ON cge.group_id=g.id
     JOIN competition_entries ce ON ce.id=cge.entry_id
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     LEFT JOIN competition_round_links crl ON crl.stage_id=g.stage_id AND crl.purpose='NORMAL'
     LEFT JOIN matches m ON m.round_id=crl.round_id
     LEFT JOIN official_predictions op ON op.user_id=cem.user_id AND op.match_id=m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id
     WHERE g.stage_id=?
     GROUP BY g.id,g.code,g.sequence,ce.id,ce.display_name
     ORDER BY g.sequence, points DESC, fulls DESC, partials DESC, errors ASC, extras DESC, ce.display_name COLLATE NOCASE`,
  ).bind(stageId).all<{
    group_id: number; group_code: string; group_sequence: number; entry_id: number; display_name: string;
    points: number; fulls: number; partials: number; errors: number; extras: number;
  }>();
  const positions = new Map<number, number>();
  return (rows.results ?? []).map((row) => {
    const groupId = Number(row.group_id);
    const position = (positions.get(groupId) ?? 0) + 1;
    positions.set(groupId, position);
    return {
      groupId, groupCode: row.group_code, position, entryId: Number(row.entry_id), displayName: row.display_name,
      points: Number(row.points ?? 0), fulls: Number(row.fulls ?? 0), partials: Number(row.partials ?? 0),
      errors: Number(row.errors ?? 0), extras: Number(row.extras ?? 0),
    };
  });
}

async function stageWinners(env: Env, stageId: number): Promise<WinnersResult> {
  await refreshStage(env, stageId);
  const encounters = await env.DB.prepare(
    `SELECT ce.winner_entry_id, ce.status, ce.admin_confirmed_at, e.display_name
     FROM competition_encounters ce LEFT JOIN competition_entries e ON e.id=ce.winner_entry_id
     WHERE ce.stage_id=? ORDER BY ce.id`,
  ).bind(stageId).all<{ winner_entry_id: number | null; status: string; admin_confirmed_at: string | null; display_name: string | null }>();
  const rows = encounters.results ?? [];
  if (rows.length === 0) return { ok: false, error: 'La etapa origen no tiene cruces' };
  if (rows.some((row) => row.status !== 'finished' || row.winner_entry_id == null || !row.admin_confirmed_at)) {
    return { ok: false, error: 'La etapa origen todavía tiene cruces sin resolver' };
  }
  return {
    ok: true,
    winners: rows.map((row) => ({
      entryId: Number(row.winner_entry_id), displayName: row.display_name ?? `Entrada ${row.winner_entry_id}`,
    })),
  };
}

function manualPairs(raw: unknown, pool: Array<{entryId:number}>, seconds?: Set<number>, thirds?: Set<number>) {
  if (!Array.isArray(raw) || raw.length*2!==pool.length) throw new Error('Usá todos los clasificados exactamente una vez');
  const allowed=new Set(pool.map(e=>e.entryId)), seen=new Set<number>();
  const pairs: Array<[number,number]> = [];
  for (const pair of raw) {
    if (!Array.isArray(pair) || pair.length!==2 || pair.some(id=>!Number.isInteger(id)||!allowed.has(id)||seen.has(id)) || pair[0]===pair[1]) throw new Error('Cruce con participante repetido o no clasificado');
    if (seconds && thirds && !(seconds.has(pair[0]) && thirds.has(pair[1]))) throw new Error('Octavos requiere siempre 2.º vs 3.º');
    pair.forEach(id=>seen.add(id)); pairs.push([pair[0],pair[1]]);
  }
  if(seen.size!==allowed.size) throw new Error('Usá todos los clasificados exactamente una vez');
  return pairs;
}
async function persistPairs(env: Env, user: SessionUser, targetStageId: number, roundLinkId: number,
  pairs: Array<[number, number | null]>, prefix: string, action: string, detail: object, options: Options) {
  const before=await env.DB.prepare('SELECT * FROM competition_encounters WHERE stage_id=? ORDER BY id').bind(targetStageId).all();
  const statements: D1PreparedStatement[]=[];
  if(options.replace) statements.push(env.DB.prepare('DELETE FROM competition_encounters WHERE stage_id=?').bind(targetStageId));
  statements.push(...pairs.map((pair,index)=>env.DB.prepare(`INSERT INTO competition_encounters
    (stage_id,round_link_id,slot_key,entry_a_id,entry_b_id,status) VALUES (?,?,?,?,?,'pending')`)
    .bind(targetStageId,roundLinkId,`${prefix}-${index+1}`,pair[0],pair[1])));
  statements.push(env.DB.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json)
    VALUES (?,?,'competition_stage',?,?,?)`).bind(user.id,action,String(targetStageId),JSON.stringify(before.results ?? []),
    JSON.stringify({...detail,configurationMode:options.mode ?? 'AUTOMATIC',reason:options.reason?.trim() || null,pairs})));
  await env.DB.batch(statements);
}
function pairSequential(entries: Array<{ entryId: number }>) {
  const pairs: Array<[number, number | null]> = [];
  for (let index = 0; index < entries.length; index += 2) {
    pairs.push([entries[index].entryId, entries[index + 1]?.entryId ?? null]);
  }
  return pairs;
}

async function drawRoundOf16(env: Env, user: SessionUser, groupStage: StageRow, targetStageId: number, roundLinkId: number, options: Options = {}) {
  if (groupStage.stage_type !== 'ACCUMULATIVE_GROUPS') return error('La etapa origen no es una fase de grupos acumulativos', 409);
  const dateError = await requireFinishedGroupDates(env, groupStage.id);
  if (dateError) return error(dateError, 409);
  const validation = await validateTarget(env, groupStage, targetStageId, roundLinkId, options);
  if (!validation.ok) return error(validation.error, 409);

  const ranking = await rankedGroups(env, groupStage.id);
  const seconds = ranking.filter((entry) => entry.position === 2);
  const thirds = ranking.filter((entry) => entry.position === 3);
  if (seconds.length === 0 || seconds.length !== thirds.length) return error('La fase de grupos no produce la misma cantidad de segundos y terceros', 409);

  const pool=[...seconds,...thirds];
  if(options.preview) return json({pool,restriction:'SECOND_VS_THIRD'});
  const randomSeed=options.mode==='MANUAL'?undefined:freshSeed();
  const random=mulberry32(randomSeed ?? 0);
  const shuffledThirds=shuffled(thirds,random);
  const pairs=options.mode==='MANUAL'
    ? manualPairs(options.pairs,pool,new Set(seconds.map(e=>e.entryId)),new Set(thirds.map(e=>e.entryId)))
    : shuffled(seconds,random).map((second,index):[number,number]=>[second.entryId,shuffledThirds[index].entryId]);
  await persistPairs(env,user,targetStageId,roundLinkId,pairs,'R16','competition.cup_ab_r16_drawn',{
    sourceGroupStageId:groupStage.id,randomSeed,restriction: 'SECOND_VS_THIRD',
  },options);
  return json({ok:true,action:'DRAW_R16',configurationMode:options.mode ?? 'AUTOMATIC',randomSeed,pairs});
}

async function drawQuarterfinals(env: Env, user: SessionUser, r16Stage: StageRow, groupStageId: number, targetStageId: number, roundLinkId: number, options: Options = {}) {
  if (r16Stage.stage_type !== 'KNOCKOUT') return error('La etapa de octavos no es eliminatoria', 409);
  const groupStage = await stageInfo(env, groupStageId);
  if (!groupStage || groupStage.competition_id !== r16Stage.competition_id || groupStage.stage_type !== 'ACCUMULATIVE_GROUPS') {
    return error('La fase de grupos indicada no corresponde a esta Copa', 409);
  }
  const validation = await validateTarget(env, r16Stage, targetStageId, roundLinkId, options);
  if (!validation.ok) return error(validation.error, 409);
  const winnersResult = await stageWinners(env, r16Stage.id);
  if (!winnersResult.ok) return error(winnersResult.error, 409);

  const groupRanking = await rankedGroups(env, groupStageId);
  const groupWinners = groupRanking.filter((entry) => entry.position === 1)
    .map((entry) => ({ entryId: entry.entryId, displayName: entry.displayName }));
  const pool = [...groupWinners, ...winnersResult.winners];
  if (pool.length < 2 || pool.length % 2 !== 0) return error('La cantidad de clasificados a cuartos no permite formar cruces completos', 409);
  if (new Set(pool.map((entry) => entry.entryId)).size !== pool.length) return error('Hay una entrada duplicada entre los clasificados a cuartos', 409);

  const dateError=await requireFinishedGroupDates(env,groupStageId);
  if(dateError) return error(dateError,409);
  if(options.preview) return json({pool});
  const randomSeed=options.mode==='MANUAL'?undefined:freshSeed();
  const pairs=options.mode==='MANUAL'?manualPairs(options.pairs,pool):pairSequential(shuffled(pool,mulberry32(randomSeed!)));
  await persistPairs(env,user,targetStageId,roundLinkId,pairs,'QF','competition.cup_ab_qf_drawn',{
    sourceGroupStageId:groupStageId,sourceRoundOf16StageId:r16Stage.id,randomSeed,
  },options);
  return json({ok:true,action:'DRAW_QF',configurationMode:options.mode ?? 'AUTOMATIC',randomSeed,pairs});
}

async function drawWinnersStage(
  env: Env, user: SessionUser, sourceStage: StageRow, targetStageId: number, roundLinkId: number,
  action: 'DRAW_SEMIS' | 'BUILD_FINAL', options: Options = {},
) {
  if (sourceStage.stage_type !== 'KNOCKOUT') return error('La etapa origen no es eliminatoria', 409);
  const validation = await validateTarget(env, sourceStage, targetStageId, roundLinkId, options);
  if (!validation.ok) return error(validation.error, 409);
  const winnersResult = await stageWinners(env, sourceStage.id);
  if (!winnersResult.ok) return error(winnersResult.error, 409);
  if (winnersResult.winners.length < 2) return error('No hay suficientes ganadores para la siguiente fase', 409);

  let ordered = [...winnersResult.winners];
  let randomSeed: number | null = null;
  if (action === 'DRAW_SEMIS' && options.mode !== 'MANUAL' && !options.preview) {
    randomSeed = freshSeed();
    ordered = shuffled(ordered, mulberry32(randomSeed));
  }
  if (action === 'BUILD_FINAL' && ordered.length !== 2) return error('La final necesita exactamente dos semifinalistas ganadores', 409);
  if (action === 'DRAW_SEMIS' && ordered.length % 2 !== 0) return error('La cantidad de semifinalistas no permite formar cruces completos', 409);
  if(options.preview) return json({pool:ordered});
  const pairs=options.mode==='MANUAL'?manualPairs(options.pairs,ordered):pairSequential(ordered);
  await persistPairs(env,user,targetStageId,roundLinkId,pairs,action==='DRAW_SEMIS'?'SF':'FINAL',
    action==='DRAW_SEMIS'?'competition.cup_ab_semis_drawn':'competition.cup_ab_final_built',
    {sourceStageId:sourceStage.id,...(options.mode==='MANUAL'?{}:{randomSeed})},options);
  return json({ok:true,action,configurationMode:options.mode ?? 'AUTOMATIC',...(options.mode==='MANUAL'?{}:{randomSeed}),pairs});
}

export async function handleCompetitionCupAbProgression(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/cup-ab-progression\/(r16|quarterfinals|semifinals|final)$/);
  if (!match) return null;
  const user = await sessionUser(request, env);
  if (!user) return error('No autorizado', 401);
  if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
  if (!['POST','GET'].includes(request.method)) return error('Método no permitido', 405);

  const sourceStageId = Number(match[1]);
  const action = match[2];
  const sourceStage = await stageInfo(env, sourceStageId);
  if (!sourceStage) return error('Etapa origen no encontrada', 404);
  if (!['COPA_A', 'COPA_B'].includes(sourceStage.competition_code)) return error('Este avance sólo corresponde a Copa A/B', 409);

  const body = (request.method === 'GET' ? Object.fromEntries(new URL(request.url).searchParams) : await request.json().catch(() => null)) as ({ targetStageId?: number; roundLinkId?: number; groupStageId?: number } & Options) | null;
  const options: Options = {...body,preview:request.method==='GET'};
  if(options.mode && !['MANUAL','AUTOMATIC'].includes(options.mode)) return error('Modo inválido');
  if(options.pairs && options.mode!=='MANUAL') return error('Los cruces explícitos requieren modo MANUAL');
  const targetStageId = Number(body?.targetStageId);
  const roundLinkId = Number(body?.roundLinkId);
  if (!Number.isInteger(targetStageId) || targetStageId <= 0) return error('Etapa destino inválida');
  if (!Number.isInteger(roundLinkId) || roundLinkId <= 0) return error('Fecha destino inválida');

  // Phase identity follows the configured stage order, never arbitrary database IDs.
  const stages = await env.DB.prepare(`SELECT id FROM competition_stages WHERE competition_id=? AND stage_type='KNOCKOUT' ORDER BY sequence,id`)
    .bind(sourceStage.competition_id).all<{id:number}>();
  const index = ['r16','quarterfinals','semifinals','final'].indexOf(action);
  const ordered = stages.results ?? [];
  if (ordered[index]?.id !== targetStageId || (index > 0 && ordered[index-1]?.id !== sourceStageId)) {
    return error('Las etapas deben seguir el orden Octavos, Cuartos, Semifinal y Final',409);
  }

  try {
  if (action === 'r16') return await drawRoundOf16(env, user, sourceStage, targetStageId, roundLinkId, options);
  if (action === 'quarterfinals') {
    const groupStageId = Number(body?.groupStageId);
    if (!Number.isInteger(groupStageId) || groupStageId <= 0) return error('Falta indicar la fase de grupos de origen');
    return await drawQuarterfinals(env, user, sourceStage, groupStageId, targetStageId, roundLinkId, options);
  }
  if (action === 'semifinals') return await drawWinnersStage(env, user, sourceStage, targetStageId, roundLinkId, 'DRAW_SEMIS', options);
  return await drawWinnersStage(env, user, sourceStage, targetStageId, roundLinkId, 'BUILD_FINAL', options);
  } catch(caught) { return error(caught instanceof Error ? caught.message : 'No se pudo configurar la ronda',400); }
}
