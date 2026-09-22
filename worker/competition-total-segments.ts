import type { Env } from './index';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
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
    `SELECT u.id,u.role,u.is_active FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.is_active=1 LIMIT 1`,
  ).bind(await sha256(token)).first<SessionUser>();
  return row ?? null;
}

async function stageInfo(env: Env, stageId: number) {
  return env.DB.prepare(
    `SELECT cs.id,cs.competition_id,cs.stage_type,cs.status,c.code AS competition_code,c.status AS competition_status,s.status AS season_status
     FROM competition_stages cs
     JOIN competitions c ON c.id=cs.competition_id
     JOIN tafa_seasons s ON s.id=c.season_id
     WHERE cs.id=? LIMIT 1`,
  ).bind(stageId).first<{
    id: number; competition_id: number; stage_type: string; status: string;
    competition_code: string; competition_status:string; season_status: string;
  }>();
}

async function readSegments(env: Env, stageId: number) {
  const rows = await env.DB.prepare(
    `SELECT crl.id AS round_link_id,crl.round_id,crl.sequence AS round_sequence,r.name AS round_name,
            crs.id AS segment_id,crs.code,crs.name,crs.sequence AS segment_sequence,
            crsm.match_id,crsm.sequence AS match_sequence,
            m.home_team_name,m.away_team_name,m.kickoff_at
     FROM competition_round_links crl
     JOIN rounds r ON r.id=crl.round_id
     LEFT JOIN competition_round_segments crs ON crs.round_link_id=crl.id
     LEFT JOIN competition_round_segment_matches crsm ON crsm.segment_id=crs.id
     LEFT JOIN matches m ON m.id=crsm.match_id
     WHERE crl.stage_id=? AND crl.purpose='NORMAL'
     ORDER BY crl.sequence,crs.sequence,crsm.sequence`,
  ).bind(stageId).all<{
    round_link_id: number; round_id: number; round_sequence: number; round_name: string;
    segment_id: number | null; code: string | null; name: string | null; segment_sequence: number | null;
    match_id: number | null; match_sequence: number | null; home_team_name: string | null;
    away_team_name: string | null; kickoff_at: string | null;
  }>();

  const bySegment = new Map<number, {
    id: number; code: string; name: string; sequence: number; globalMiniDay: number;
    roundLinkId: number; roundId: number; roundName: string;
    matches: Array<{ matchId: number; sequence: number; home: string; away: string; kickoffAt: string }>;
  }>();

  const roundOrder=new Map<number,number>();
  for (const row of rows.results ?? []) {
    if(!roundOrder.has(row.round_link_id))roundOrder.set(row.round_link_id,roundOrder.size);
    if (row.segment_id == null || row.code == null || row.name == null || row.segment_sequence == null) continue;
    const segmentId = Number(row.segment_id);
    let segment = bySegment.get(segmentId);
    if (!segment) {
      segment = {
        id: segmentId,
        code: row.code,
        name: row.name,
        sequence: Number(row.segment_sequence),
        globalMiniDay: roundOrder.get(row.round_link_id)! * 3 + Number(row.segment_sequence),
        roundLinkId: Number(row.round_link_id),
        roundId: Number(row.round_id),
        roundName: row.round_name,
        matches: [],
      };
      bySegment.set(segmentId, segment);
    }
    if (row.match_id != null && row.match_sequence != null && row.kickoff_at != null) {
      segment.matches.push({
        matchId: Number(row.match_id), sequence: Number(row.match_sequence),
        home: row.home_team_name ?? '', away: row.away_team_name ?? '', kickoffAt: row.kickoff_at,
      });
    }
  }
  return Array.from(bySegment.values()).sort((a, b) => a.globalMiniDay - b.globalMiniDay);
}

async function configureSegments(env: Env, user: SessionUser, stageId: number) {
  const stage = await stageInfo(env, stageId);
  if (!stage) return error('Etapa no encontrada', 404);
  if (stage.competition_code !== 'COPA_TOTAL') return error('Esta acción corresponde únicamente a Copa Total', 409);
  if (stage.stage_type !== 'ROUND_ROBIN_GROUPS') return error('La etapa de Copa Total debe ser de grupos con enfrentamientos', 409);
  if (stage.status === 'finished' || stage.status === 'archived') return error('La etapa ya está cerrada', 409);
  if(['finished','archived'].includes(stage.competition_status))return error('La Copa está cerrada',409);
  if (stage.season_status === 'finished' || stage.season_status === 'archived') return error('La temporada ya está cerrada', 409);

  const linksResult = await env.DB.prepare(
    `SELECT crl.id,crl.round_id,crl.sequence,r.name
     FROM competition_round_links crl JOIN rounds r ON r.id=crl.round_id
     WHERE crl.stage_id=? AND crl.purpose='NORMAL'
     ORDER BY crl.sequence`,
  ).bind(stageId).all<{ id: number; round_id: number; sequence: number; name: string }>();
  const links = linksResult.results ?? [];
  if (links.length !== 2) return error('La fase de grupos de Copa Total necesita exactamente 2 Fechas vinculadas', 409);

  const existingUse = await env.DB.prepare(
    `SELECT COUNT(*) AS total
     FROM competition_encounters ce
     JOIN competition_round_segments crs ON crs.id=ce.segment_id
     JOIN competition_round_links crl ON crl.id=crs.round_link_id
     WHERE crl.stage_id=?`,
  ).bind(stageId).first<{ total: number }>();
  if (Number(existingUse?.total ?? 0) > 0) return error('No se pueden regenerar segmentos porque ya existen enfrentamientos asociados', 409);

  const matchIdsByLink = new Map<number, number[]>();
  for (const link of links) {
    const matches = await env.DB.prepare(
      `SELECT id FROM matches WHERE round_id=? ORDER BY kickoff_at,id`,
    ).bind(link.round_id).all<{ id: number }>();
    const ids = (matches.results ?? []).map((row) => Number(row.id));
    if (ids.length !== 12) return error(`${link.name} debe tener exactamente 12 partidos antes de crear sus segmentos`, 409);
    matchIdsByLink.set(Number(link.id), ids);
  }

  const statements:D1PreparedStatement[]=links.map(link=>env.DB.prepare('DELETE FROM competition_round_segments WHERE round_link_id=?').bind(link.id));
  const frozen:unknown[]=[];
  links.forEach((link,linkIndex)=>{
    const ids=matchIdsByLink.get(Number(link.id))!;
    for(let local=1;local<=3;local++){
      const mini=linkIndex*3+local;
      statements.push(env.DB.prepare('INSERT INTO competition_round_segments(round_link_id,code,name,sequence) VALUES (?,?,?,?)').bind(link.id,`MINI_${mini}`,`Mini fecha ${mini}`,local));
      const matchIds=ids.slice((local-1)*4,local*4);
      matchIds.forEach((id,i)=>statements.push(env.DB.prepare(`INSERT INTO competition_round_segment_matches(segment_id,match_id,sequence)
        VALUES ((SELECT id FROM competition_round_segments WHERE round_link_id=? AND code=?),?,?)`).bind(link.id,`MINI_${mini}`,id,i+1)));
      frozen.push({roundLinkId:link.id,miniDay:mini,matchIds});
    }
  });
  statements.push(env.DB.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_json) VALUES (?,'competition.total_segments_configured','competition_stage',?,?)`).bind(user.id,String(stageId),JSON.stringify(frozen)));
  await env.DB.batch(statements);
  const payload = await readSegments(env, stageId);
  return json({ ok: true, stageId, segments: payload });
}

export async function handleCompetitionTotalSegments(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const adminMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/total\/segments$/);
  if (adminMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method === 'POST') return configureSegments(env, user, Number(adminMatch[1]));
    if (request.method === 'GET') return json({ segments: await readSegments(env, Number(adminMatch[1])) });
    return error('Método no permitido', 405);
  }
  return null;
}
