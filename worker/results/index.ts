import {getPromiedosGame, normalizePromiedosResult, PromiedosError} from '../promiedos';
import {manualResultSql} from '../result-source';
import {footballFixtures, FootballError} from '../football-api';
import { recalculateRoundScores } from '../scoring';

type Env = {
  DB: D1Database;
  FOOTBALL_API_KEY?: string;
};

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type ScoreSide = { home: number | null; away: number | null } | null;
type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
  };
  teams: {
    home: { id: number; winner?: boolean | null };
    away: { id: number; winner?: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    fulltime: ScoreSide;
    extratime: ScoreSide;
    penalty: ScoreSide;
  };
};

type StoredMatch = {
  id: number;
  provider_fixture_id: string;
  provider: string;
  home_team_provider_id: string;
  away_team_provider_id: string;
  home_team_name: string;
  away_team_name: string;
  kickoff_at: string;
  status: string;
  result_finalized_at: string | null;
};

const SESSION_COOKIE = 'prode_session';
const encoder = new TextEncoder();
const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN']);
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);
const VOID_STATUSES = new Set(['CANC', 'ABD', 'AWD', 'WO']);
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

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
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND julianday(s.expires_at) > julianday('now')
       AND u.is_active = 1 LIMIT 1`,
  ).bind(tokenHash).first<SessionUser>();
  return user ?? null;
}


function hasScore(side: ScoreSide) {
  return Boolean(side && (side.home !== null || side.away !== null));
}

function calendarDateInArgentina(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: 'year' | 'month' | 'day') => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function overallWinner(item: ApiFixture) {
  if (item.teams.home.winner === true) return String(item.teams.home.id);
  if (item.teams.away.winner === true) return String(item.teams.away.id);
  if (item.goals.home !== null && item.goals.away !== null && item.goals.home !== item.goals.away) {
    return item.goals.home > item.goals.away ? String(item.teams.home.id) : String(item.teams.away.id);
  }
  return null;
}

async function fetchFixturesForDate(date: string, env: Env) {
  return footballFixtures<ApiFixture>({date,timezone:ARGENTINA_TIMEZONE},env.FOOTBALL_API_KEY!);
}

async function applyFixture(item: ApiFixture, matchId: number, env: Env) {
  const status = item.fixture.status.short;
  const final = FINAL_STATUSES.has(status);
  const isVoid = VOID_STATUSES.has(status);
  const fulltime = item.score?.fulltime ?? null;
  const currentHome = item.goals?.home ?? null;
  const currentAway = item.goals?.away ?? null;
  const regulationHome = fulltime?.home ?? (status === 'FT' ? currentHome : null);
  const regulationAway = fulltime?.away ?? (status === 'FT' ? currentAway : null);
  const wentToExtra = ['ET', 'BT', 'P', 'AET', 'PEN'].includes(status) || hasScore(item.score?.extratime ?? null);
  const wentToPenalties = ['P', 'PEN'].includes(status) || hasScore(item.score?.penalty ?? null);
  const winner = overallWinner(item);

  await env.DB.prepare(
    `UPDATE matches SET
      kickoff_at = ?, status = ?, elapsed_minutes = ?,
      home_score_current = ?, away_score_current = ?,
      home_score_regulation = COALESCE(?, home_score_regulation),
      away_score_regulation = COALESCE(?, away_score_regulation),
      winning_team_provider_id = ?, qualified_team_provider_id = ?,
      went_to_extra_time = ?, went_to_penalties = ?, is_void = ?,
      result_finalized_at = CASE WHEN ? = 1 THEN COALESCE(result_finalized_at, datetime('now')) ELSE NULL END,
      last_synced_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND NOT ${manualResultSql('matches')}`,
  ).bind(
    item.fixture.date,
    status,
    item.fixture.status.elapsed,
    currentHome,
    currentAway,
    regulationHome,
    regulationAway,
    winner,
    winner,
    wentToExtra ? 1 : 0,
    wentToPenalties ? 1 : 0,
    isVoid ? 1 : 0,
    final || isVoid ? 1 : 0,
    matchId,
  ).run();

  return { finalized: final || isVoid };
}

export async function syncRoundResults(roundId: number, env: Env, onlyDates?: string[], eligibleIds?: number[]) {
  const rows = await env.DB.prepare(
    `SELECT id, provider_fixture_id, provider, kickoff_at, status, result_finalized_at,
      home_team_provider_id, away_team_provider_id, home_team_name, away_team_name
     FROM matches WHERE round_id = ? AND provider IN ('api-football','promiedos')
       AND NOT ${manualResultSql('matches')}
     ORDER BY kickoff_at, id`,
  ).bind(roundId).all<StoredMatch>();
  const matches = rows.results ?? [];
  const legacy = matches.filter(m => m.provider !== 'promiedos');
  const localByFixture = new Map(legacy.map(m => [m.provider_fixture_id, m]));
  const requestedDates = legacy.length ? (onlyDates?.length ? [...new Set(onlyDates)] : [...new Set(legacy.map(m => calendarDateInArgentina(m.kickoff_at)))]) : [];
  let updated = 0, finalized = 0;
  const counter = {count: 0};
  const warnings: string[] = [];
  if (legacy.length && !env.FOOTBALL_API_KEY) warnings.push('API-Football legacy no está configurada.');
  else for (const date of requestedDates) {
    try {
      counter.count++;
      const fixtures = await fetchFixturesForDate(date, env);
      for (const item of fixtures) {
        const local = localByFixture.get(String(item.fixture.id));
        if (!local) continue;
        const applied = await applyFixture(item, local.id, env);
        updated++; if (applied.finalized) finalized++;
      }
    } catch(e) { warnings.push(e instanceof FootballError ? e.message : 'API-Football no disponible.'); }
  }
  for (const m of matches.filter(m => m.provider === 'promiedos' && (!eligibleIds || eligibleIds.includes(m.id)))) {
    try {
      const game = await getPromiedosGame(m.provider_fixture_id, counter);
      if (game.teams[0].id !== m.home_team_provider_id || game.teams[1].id !== m.away_team_provider_id) throw new PromiedosError('Identidad de equipos inconsistente');
      const r = normalizePromiedosResult(game);
      if (m.result_finalized_at && !r.final) throw new PromiedosError('Resultado final no confirmado');
      if (LIVE_STATUSES.has(m.status) && r.status === 'NS') throw new PromiedosError('Estado regresivo no confirmado');
      const update = env.DB.prepare(`UPDATE matches SET
        kickoff_at = CASE WHEN julianday('now') < julianday(kickoff_at,'+1 minute') THEN ? ELSE kickoff_at END,
        status=?, elapsed_minutes=?, home_score_current=?, away_score_current=?,
        home_score_regulation=?, away_score_regulation=?, winning_team_provider_id=?, qualified_team_provider_id=?,
        went_to_extra_time=?, went_to_penalties=?, is_void=0,
        result_finalized_at=CASE WHEN ? THEN COALESCE(result_finalized_at,datetime('now')) ELSE NULL END,
        last_synced_at=datetime('now'),updated_at=datetime('now')
        WHERE id=? AND provider='promiedos' AND NOT ${manualResultSql('matches')}`).bind(
        r.kickoffAt,r.status,r.elapsed,r.current?.[0]??null,r.current?.[1]??null,
        r.regulation?.[0]??null,r.regulation?.[1]??null,r.winner,r.qualified,
        Number(r.wentToExtra),Number(r.wentToPenalties),Number(r.final),m.id);
      // Preserve all three final stages without adding columns or changing scoring.
      // Repeated identical syncs do not append duplicate snapshots.
      const snapshot = JSON.stringify({providerFixtureId:m.provider_fixture_id,regulation:r.regulation,
        extraTime:r.extraTime,penalties:r.penalties,winner:r.winner,qualified:r.qualified});
      const statements = [update];
      if (r.final) statements.push(env.DB.prepare(`INSERT INTO audit_log(action,entity_type,entity_id,after_json)
        SELECT 'match.promiedos_result','match',?,? WHERE changes()>0 AND COALESCE((
          SELECT after_json FROM audit_log WHERE action='match.promiedos_result'
            AND entity_type='match' AND entity_id=? ORDER BY id DESC LIMIT 1),'')<>?`)
        .bind(String(m.id),snapshot,String(m.id),snapshot));
      const [result] = await env.DB.batch(statements);
      if (result.meta.changes) { updated++; if(r.final) finalized++; }
    } catch {
      warnings.push(`Promiedos no entregó información suficiente para ${m.home_team_name} - ${m.away_team_name}. Requiere revisión.`);
    }
  }
  const calculated = updated ? await recalculateRoundScores(roundId, env) : 0;
  return {updated, finalized, calculated, requestCount:counter.count, dates:requestedDates, warnings};
}

export async function syncEligibleRounds(env: Env) {
  const eligible = await env.DB.prepare(`SELECT round_id, id, kickoff_at FROM matches
    WHERE provider IN ('api-football','promiedos') AND NOT ${manualResultSql('matches')}
      AND result_finalized_at IS NULL
      AND round_id IN (SELECT id FROM rounds WHERE status='open')
      AND (status IN ('1H','HT','2H','ET','BT','P','LIVE') OR
        (julianday(kickoff_at)<=julianday('now','+10 minutes') AND julianday(kickoff_at)>=julianday('now','-4 hours')))
    ORDER BY round_id,kickoff_at`).all<{round_id:number;id:number;kickoff_at:string}>();
  const groups = new Map<number, {dates:Set<string>;ids:number[]}>();
  for(const m of eligible.results??[]) {
    const g=groups.get(m.round_id)??{dates:new Set<string>(),ids:[]};
    g.dates.add(calendarDateInArgentina(m.kickoff_at));g.ids.push(m.id);groups.set(m.round_id,g);
  }
  for(const [id,g] of groups) try {
    const result = await syncRoundResults(id,env,[...g.dates],g.ids);
    if(result.warnings.length) console.error('Scheduled result sync requires review',id,result.warnings);
  } catch { console.error('Scheduled result sync failed',id); }
}

export async function handleResults(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/^\/api\/admin\/sync-round\/(\d+)$/);
  if (!match) return null;
  if (request.method !== 'POST') return error('Método no permitido', 405);

  const user = await sessionUser(request, env);
  if (!user || user.role !== 'admin') return error('Acceso de administrador requerido', 403);

  try {
    const roundId = Number(match[1]);
    const result = await syncRoundResults(roundId, env);
    await env.DB.prepare(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
       VALUES (?, 'round.results_synced', 'round', ?, ?)`,
    ).bind(user.id, String(roundId), JSON.stringify(result)).run();
    return json({ ok: true, ...result });
  } catch (caught) {
    const message = caught instanceof FootballError ? caught.message : 'No se pudieron actualizar los resultados';
    return error(message, 502);
  }
}
