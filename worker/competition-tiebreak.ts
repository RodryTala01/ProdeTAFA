import type { Env } from './index';

type SessionUser = {
  id: string;
  role: 'admin' | 'participant';
  is_active: number;
};

type TiebreakEntry = {
  entry_id: number;
  display_name: string;
};

type TiebreakMatch = {
  id: number;
  round_id: number;
  kickoff_at: string;
  result_finalized_at: string | null;
  is_void: number;
  home_team_name: string;
  away_team_name: string;
};

type MatchEvaluation = {
  matchId: number;
  roundId: number;
  kickoffAt: string;
  localDay: string;
  label: string;
  finalized: boolean;
  scoreA: number;
  scoreB: number;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();
const BA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

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

async function audit(
  env: Env,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  after: unknown,
) {
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(actorUserId, action, entityType, entityId, JSON.stringify(after)).run();
}

function localDay(utcTimestamp: string) {
  const date = new Date(utcTimestamp);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

export async function evaluateTiebreak(env: Env, tiebreakId: number): Promise<any> {
  const tiebreak = await env.DB.prepare(
    `SELECT ct.id, ct.competition_id, ct.stage_id, ct.encounter_id,
            ct.status, ct.winner_entry_id, ct.resolution, ct.created_at, ct.resolved_at,
            c.display_name AS competition_name,
            ce.slot_key
     FROM competition_tiebreaks ct
     JOIN competitions c ON c.id = ct.competition_id
     LEFT JOIN competition_encounters ce ON ce.id = ct.encounter_id
     WHERE ct.id = ? LIMIT 1`,
  ).bind(tiebreakId).first<{
    id: number;
    competition_id: number;
    stage_id: number | null;
    encounter_id: number | null;
    status: string;
    winner_entry_id: number | null;
    resolution: string | null;
    created_at: string;
    resolved_at: string | null;
    competition_name: string;
    slot_key: string | null;
  }>();
  if (!tiebreak) return null;

  const entriesResult = await env.DB.prepare(
    `SELECT cte.entry_id, ce.display_name
     FROM competition_tiebreak_entries cte
     JOIN competition_entries ce ON ce.id = cte.entry_id
     WHERE cte.tiebreak_id = ?
     ORDER BY cte.entry_id`,
  ).bind(tiebreakId).all<TiebreakEntry>();
  const entries = entriesResult.results ?? [];
  if(entries.length<2)return {tiebreak,entries,rounds:[],days:[],state:'INVALID',winnerEntryId:null,resolutionDetail:'Se necesitan al menos dos entradas.'};

  const roundsResult = await env.DB.prepare(
    `SELECT ctr.round_id, ctr.sequence, r.name, r.status
     FROM competition_tiebreak_rounds ctr
     JOIN rounds r ON r.id = ctr.round_id
     WHERE ctr.tiebreak_id = ?
     ORDER BY ctr.sequence`,
  ).bind(tiebreakId).all<{
    round_id: number;
    sequence: number;
    name: string;
    status: string;
  }>();
  const rounds = roundsResult.results ?? [];

  if (rounds.length === 0) {
    return {
      tiebreak,
      entries,
      rounds: [],
      days: [],
      state: 'WAITING_ROUND',
      winnerEntryId: null,
      resolutionDetail: 'Falta vincular una Fecha para resolver el desempate.',
    };
  }

  // Load each member score once; all pair comparisons share the same TAFA evaluator.
  const matches: TiebreakMatch[]=[];
  for(const round of rounds){const r=await env.DB.prepare(`SELECT id,round_id,kickoff_at,result_finalized_at,is_void,home_team_name,away_team_name FROM matches WHERE round_id=? ORDER BY kickoff_at,id`).bind(round.round_id).all<TiebreakMatch>();matches.push(...(r.results??[]));}
  const scores=new Map<string,number>();
  for(const match of matches){
    if(!match.result_finalized_at&&!match.is_void)continue;
    const r=await env.DB.prepare(`SELECT cem.entry_id,COALESCE(SUM(ps.total_points),0) points FROM competition_tiebreak_entries te JOIN competition_entry_members cem ON cem.entry_id=te.entry_id LEFT JOIN official_predictions op ON op.user_id=cem.user_id AND op.match_id=? LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id WHERE te.tiebreak_id=? AND (cem.valid_from_round_id IS NULL OR cem.valid_from_round_id<=?) AND (cem.valid_to_round_id IS NULL OR cem.valid_to_round_id>?) GROUP BY cem.entry_id`).bind(match.id,tiebreakId,match.round_id,match.round_id).all<{entry_id:number;points:number}>();
    for(const row of r.results??[])scores.set(`${match.id}:${row.entry_id}`,Number(row.points));
  }
  const compare=(pair:TiebreakEntry[])=>evaluateDays(tiebreak,pair,rounds,matches.map(m=>({matchId:Number(m.id),roundId:Number(m.round_id),kickoffAt:m.kickoff_at,localDay:localDay(m.kickoff_at),label:`${m.home_team_name} vs ${m.away_team_name}`,finalized:!!m.result_finalized_at||!!m.is_void,scoreA:scores.get(`${m.id}:${pair[0].entry_id}`)??0,scoreB:scores.get(`${m.id}:${pair[1].entry_id}`)??0})));
  if(entries.length===2)return compare(entries);
  const wins=new Map(entries.map(e=>[e.entry_id,0]));let pending=false;const comparisons=[];
  const survival=await env.DB.prepare('SELECT source_points_json FROM competition_survival_tiebreaks WHERE tiebreak_id=?').bind(tiebreakId).first<{source_points_json:string}>();
  const original=new Map<number,number>(survival?JSON.parse(survival.source_points_json):[]);
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const a=entries[i],b=entries[j];
    // Sporting totals already order non-tied duos. TAFA only separates equal totals.
    const unequal=original.has(a.entry_id)&&original.get(a.entry_id)!==original.get(b.entry_id);
    const evaluation=unequal?{winnerEntryId:original.get(a.entry_id)!>original.get(b.entry_id)!?a.entry_id:b.entry_id,resolutionDetail:'Orden por puntos de la Fecha original'}:compare([a,b]);
    comparisons.push({entryAId:a.entry_id,entryBId:b.entry_id,winnerEntryId:evaluation.winnerEntryId,detail:evaluation.resolutionDetail});
    if(evaluation.winnerEntryId)wins.set(evaluation.winnerEntryId,wins.get(evaluation.winnerEntryId)!+1);else pending=true;
  }
  const ordered=[...entries].sort((a,b)=>wins.get(b.entry_id)!-wins.get(a.entry_id)!);
  return {tiebreak,entries,rounds,days:[],comparisons,ranking:pending?[]:ordered.map((e,i)=>({...e,position:i+1})),state:pending?'WAITING_GROUP':'RESOLVED_GROUP',winnerEntryId:pending?null:ordered[0].entry_id,resolutionDetail:pending?'Comparación conjunta TAFA pendiente: todos usan la misma Fecha Liga.':'Orden conjunto resuelto por TAFA en la misma Fecha Liga.'};
}
function evaluateDays(tiebreak:any,entries:TiebreakEntry[],rounds:any[],evaluations:MatchEvaluation[]):any {
  evaluations.sort((a, b) => {
    const kickoff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
    return kickoff !== 0 ? kickoff : a.matchId - b.matchId;
  });

  const dayOrder: string[] = [];
  const matchesByDay = new Map<string, MatchEvaluation[]>();
  for (const evaluation of evaluations) {
    if (!matchesByDay.has(evaluation.localDay)) {
      matchesByDay.set(evaluation.localDay, []);
      dayOrder.push(evaluation.localDay);
    }
    matchesByDay.get(evaluation.localDay)!.push(evaluation);
  }

  const days = dayOrder.map((day) => {
    const matches = matchesByDay.get(day) ?? [];
    const complete = matches.length > 0 && matches.every((match) => match.finalized);
    return {
      localDay: day,
      complete,
      scoreA: matches.reduce((sum, match) => sum + match.scoreA, 0),
      scoreB: matches.reduce((sum, match) => sum + match.scoreB, 0),
      matches,
    };
  });

  if (days.length === 0) {
    return {
      tiebreak,
      entries,
      rounds,
      days,
      state: 'WAITING_MATCHES',
      winnerEntryId: null,
      resolutionDetail: 'Las Fechas vinculadas todavía no tienen partidos.',
    };
  }

  const lastDayIndex = days.length - 1;
  for (let index = 0; index < lastDayIndex; index += 1) {
    const day = days[index];
    if (!day.complete) {
      return {
        tiebreak,
        entries,
        rounds,
        days,
        state: 'WAITING_DAY',
        winnerEntryId: null,
        resolutionDetail: `El día ${day.localDay} todavía no terminó.`,
      };
    }
    if (day.scoreA !== day.scoreB) {
      return {
        tiebreak,
        entries,
        rounds,
        days,
        state: 'RESOLVED_DAY',
        winnerEntryId: day.scoreA > day.scoreB ? entries[0].entry_id : entries[1].entry_id,
        resolutionDetail: `Desempate definido por el día completo ${day.localDay}.`,
      };
    }
  }

  const lastDay = days[lastDayIndex];
  let runningA = 0;
  let runningB = 0;
  for (const match of lastDay.matches) {
    if (!match.finalized) {
      return {
        tiebreak,
        entries,
        rounds,
        days,
        state: 'WAITING_LAST_DAY_MATCH',
        winnerEntryId: null,
        resolutionDetail: `Último día: esperando ${match.label}.`,
      };
    }
    runningA += match.scoreA;
    runningB += match.scoreB;
    if (runningA !== runningB) {
      return {
        tiebreak,
        entries,
        rounds,
        days,
        state: 'RESOLVED_MATCH',
        winnerEntryId: runningA > runningB ? entries[0].entry_id : entries[1].entry_id,
        resolutionDetail: `Último día definido partido a partido en ${match.label}.`,
        decidingMatchId: match.matchId,
      };
    }
  }

  return {
    tiebreak,
    entries,
    rounds,
    days,
    state: 'EXHAUSTED_TIED',
    winnerEntryId: null,
    resolutionDetail: 'Terminó la Fecha y siguen empatados. El Admin puede agregar otra Fecha Desempate o resolverlo manualmente.',
  };
}

async function createForEncounter(env: Env, user: SessionUser, encounterId: number) {
  const encounter = await env.DB.prepare(
    `SELECT ce.id, ce.stage_id, ce.entry_a_id, ce.entry_b_id, ce.status,
            cs.competition_id, c.season_id, s.status AS season_status
     FROM competition_encounters ce
     JOIN competition_stages cs ON cs.id = ce.stage_id
     JOIN competitions c ON c.id = cs.competition_id
     JOIN tafa_seasons s ON s.id = c.season_id
     WHERE ce.id = ? LIMIT 1`,
  ).bind(encounterId).first<{
    id: number;
    stage_id: number;
    entry_a_id: number | null;
    entry_b_id: number | null;
    status: string;
    competition_id: number;
    season_id: number;
    season_status: string;
  }>();
  if (!encounter) return error('Cruce no encontrado', 404);
  if (encounter.entry_a_id == null || encounter.entry_b_id == null) return error('El cruce no tiene dos participantes', 409);
  if (encounter.season_status === 'archived') return error('La temporada está archivada', 409);

  const existing = await env.DB.prepare(
    `SELECT id FROM competition_tiebreaks
     WHERE encounter_id = ? AND status IN ('pending', 'active', 'resolved')
     ORDER BY id DESC LIMIT 1`,
  ).bind(encounterId).first<{ id: number }>();
  if (existing) return json(await evaluateTiebreak(env, Number(existing.id)));

  if (encounter.status !== 'tied') return error('Sólo se puede crear un desempate para un cruce empatado', 409);

  const created = await env.DB.prepare(
    `INSERT INTO competition_tiebreaks
       (competition_id, stage_id, encounter_id, status)
     VALUES (?, ?, ?, 'pending') RETURNING id`,
  ).bind(encounter.competition_id, encounter.stage_id, encounterId).first<{ id: number }>();
  if (!created) return error('No se pudo crear el desempate', 500);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO competition_tiebreak_entries (tiebreak_id, entry_id) VALUES (?, ?)`,
    ).bind(created.id, encounter.entry_a_id),
    env.DB.prepare(
      `INSERT INTO competition_tiebreak_entries (tiebreak_id, entry_id) VALUES (?, ?)`,
    ).bind(created.id, encounter.entry_b_id),
  ]);

  await audit(env, user.id, 'competition.tiebreak_created', 'competition_tiebreak', String(created.id), {
    encounterId,
    entryAId: encounter.entry_a_id,
    entryBId: encounter.entry_b_id,
  });

  return json(await evaluateTiebreak(env, Number(created.id)), { status: 201 });
}

async function addRound(request: Request, env: Env, user: SessionUser, tiebreakId: number) {
  const tiebreak = await env.DB.prepare(
    `SELECT ct.id, ct.encounter_id, ct.status,
            ce.round_link_id AS original_round_link_id,
            COALESCE(crl.round_id,sl.round_id) AS original_round_id
     FROM competition_tiebreaks ct
     LEFT JOIN competition_encounters ce ON ce.id = ct.encounter_id
     LEFT JOIN competition_round_links crl ON crl.id = ce.round_link_id
     LEFT JOIN competition_survival_tiebreaks st ON st.tiebreak_id=ct.id
     LEFT JOIN competition_round_links sl ON sl.id=st.round_link_id
     WHERE ct.id = ? LIMIT 1`,
  ).bind(tiebreakId).first<{
    id: number;
    encounter_id: number | null;
    status: string;
    original_round_link_id: number | null;
    original_round_id: number | null;
  }>();
  if (!tiebreak) return error('Desempate no encontrado', 404);
  if (tiebreak.status === 'resolved' || tiebreak.status === 'cancelled') return error('El desempate ya está cerrado', 409);

  const body = await request.json().catch(() => null) as { roundId?: number } | null;
  const roundId = Number(body?.roundId);
  if (!Number.isInteger(roundId) || roundId <= 0) return error('Fecha inválida');
  if (tiebreak.original_round_id === roundId) return error('La Fecha original del cruce no puede usarse como su propio desempate', 409);

  const round = await env.DB.prepare(
    `SELECT r.id, r.name, MIN(m.kickoff_at) AS first_kickoff
     FROM rounds r
     LEFT JOIN matches m ON m.round_id = r.id
     WHERE r.id = ?
     GROUP BY r.id, r.name
     LIMIT 1`,
  ).bind(roundId).first<{ id: number; name: string; first_kickoff: string | null }>();
  if (!round) return error('Fecha no encontrada', 404);

  if (tiebreak.original_round_id != null && round.first_kickoff) {
    const original = await env.DB.prepare(
      `SELECT MAX(kickoff_at) AS last_kickoff FROM matches WHERE round_id = ?`,
    ).bind(tiebreak.original_round_id).first<{ last_kickoff: string | null }>();
    if (original?.last_kickoff && new Date(round.first_kickoff).getTime() <= new Date(original.last_kickoff).getTime()) {
      return error('La Fecha de desempate debe ser cronológicamente posterior a la Fecha original', 409);
    }
  }

    const duo=await env.DB.prepare("SELECT c.id FROM competitions c JOIN competition_tiebreaks t ON t.competition_id=c.id WHERE t.id=? AND c.code='COPA_DUOS'").bind(tiebreakId).first();
  if(duo){const category=await env.DB.prepare('SELECT category FROM rounds WHERE id=?').bind(roundId).first<{category:string}>();if(category?.category!=='LIGA')return error('El desempate de tabla Dúos utiliza una Fecha Liga posterior',409);}
  const previous=await env.DB.prepare('SELECT MAX(m.kickoff_at) last FROM competition_tiebreak_rounds tr JOIN matches m ON m.round_id=tr.round_id WHERE tr.tiebreak_id=?').bind(tiebreakId).first<{last:string|null}>();
  if(previous?.last&&(!round.first_kickoff||new Date(round.first_kickoff)<=new Date(previous.last)))return error('La nueva Fecha debe ser posterior a las ya vinculadas',409);
  if(duo&&!round.first_kickoff)return error('La Fecha necesita partidos con horarios para validar la cronología',409);
  const duplicate = await env.DB.prepare(
    `SELECT 1 AS present FROM competition_tiebreak_rounds
     WHERE tiebreak_id = ? AND round_id = ? LIMIT 1`,
  ).bind(tiebreakId, roundId).first<{ present: number }>();
  if (duplicate) return error('Esa Fecha ya está vinculada al desempate', 409);

  const maxSequence = await env.DB.prepare(
    `SELECT COALESCE(MAX(sequence), 0) AS value
     FROM competition_tiebreak_rounds WHERE tiebreak_id = ?`,
  ).bind(tiebreakId).first<{ value: number }>();
  const sequence = Number(maxSequence?.value ?? 0) + 1;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO competition_tiebreak_rounds (tiebreak_id, round_id, sequence)
       VALUES (?, ?, ?)`,
    ).bind(tiebreakId, roundId, sequence),
    env.DB.prepare(
      `UPDATE competition_tiebreaks SET status = 'active' WHERE id = ? AND status = 'pending'`,
    ).bind(tiebreakId),
  ]);

  await audit(env, user.id, 'competition.tiebreak_round_added', 'competition_tiebreak', String(tiebreakId), {
    roundId,
    roundName: round.name,
    sequence,
  });

  return json(await evaluateTiebreak(env, tiebreakId));
}

async function refreshAndResolve(env: Env, user: SessionUser, tiebreakId: number) {
  const evaluation = await evaluateTiebreak(env, tiebreakId);
  if (!evaluation) return error('Desempate no encontrado', 404);
  if (!evaluation.winnerEntryId) return json(evaluation);

  if (evaluation.tiebreak.status !== 'resolved') {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE competition_tiebreaks
         SET status = 'resolved', winner_entry_id = ?, resolution = ?, resolved_at = datetime('now')
         WHERE id = ?`,
      ).bind(evaluation.winnerEntryId, evaluation.state, tiebreakId),
      env.DB.prepare(
        `UPDATE competition_encounters
         SET status = 'finished', winner_entry_id = ?, resolution = 'tiebreak',
             admin_confirmed_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
      ).bind(evaluation.winnerEntryId, evaluation.tiebreak.encounter_id),
    ]);

    await audit(env, user.id, 'competition.tiebreak_resolved', 'competition_tiebreak', String(tiebreakId), {
      winnerEntryId: evaluation.winnerEntryId,
      state: evaluation.state,
      resolutionDetail: evaluation.resolutionDetail,
      decidingMatchId: 'decidingMatchId' in evaluation ? evaluation.decidingMatchId : null,
    });
  }

  return json(await evaluateTiebreak(env, tiebreakId));
}

export async function handleCompetitionTiebreak(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;

  const publicMatch = pathname.match(/^\/api\/competition-engine\/tiebreaks\/(\d+)$/);
  if (publicMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const evaluation = await evaluateTiebreak(env, Number(publicMatch[1]));
    return evaluation ? json(evaluation) : error('Desempate no encontrado', 404);
  }

  const createMatch = pathname.match(/^\/api\/admin\/competition-engine\/encounters\/(\d+)\/tiebreak$/);
  if (createMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return createForEncounter(env, user, Number(createMatch[1]));
  }

  const roundMatch = pathname.match(/^\/api\/admin\/competition-engine\/tiebreaks\/(\d+)\/rounds$/);
  if (roundMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return addRound(request, env, user, Number(roundMatch[1]));
  }

  const refreshMatch = pathname.match(/^\/api\/admin\/competition-engine\/tiebreaks\/(\d+)\/refresh$/);
  if (refreshMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return refreshAndResolve(env, user, Number(refreshMatch[1]));
  }

  return null;
}
