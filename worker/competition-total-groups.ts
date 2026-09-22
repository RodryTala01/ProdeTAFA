import type { Env } from './index';
import { handleIffhs } from './iffhs';

type SessionUser = { id: string; role: 'admin' | 'participant'; is_active: number };
type GroupInput = { code?: string; name?: string; userIds?: string[] };
type EntryLite = { entryId: number; displayName: string };
type FixturePair = [number, number];

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
function bytesToHex(bytes: Uint8Array) { return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''); }
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
    `SELECT cs.id,cs.competition_id,cs.stage_type,cs.status,c.code AS competition_code,c.season_id,s.season_number,c.status AS competition_status,s.status AS season_status
     FROM competition_stages cs JOIN competitions c ON c.id=cs.competition_id
     JOIN tafa_seasons s ON s.id=c.season_id WHERE cs.id=? LIMIT 1`,
  ).bind(stageId).first<{
    id: number; competition_id: number; stage_type: string; status: string;
    competition_code: string; season_id: number; season_number: number; competition_status: string; season_status: string;
  }>();
}

async function ensureTotalStage(env: Env, stageId: number) {
  const stage = await stageInfo(env, stageId);
  if (!stage) return { ok: false as const, error: 'Etapa no encontrada', status: 404 };
  if (stage.competition_code !== 'COPA_TOTAL') return { ok: false as const, error: 'Esta acción corresponde únicamente a Copa Total', status: 409 };
  if (stage.stage_type !== 'ROUND_ROBIN_GROUPS') return { ok: false as const, error: 'La etapa debe ser de grupos con enfrentamientos', status: 409 };
  return { ok: true as const, stage };
}

async function ensureEntries(env: Env, competitionId: number, users: Array<{ user_id: string; full_name: string }>) {
  const existing = await env.DB.prepare(
    `SELECT ce.id,cem.user_id FROM competition_entries ce JOIN competition_entry_members cem ON cem.entry_id=ce.id
     WHERE ce.competition_id=? AND ce.entry_type='INDIVIDUAL'`,
  ).bind(competitionId).all<{ id: number; user_id: string }>();
  const byUser = new Map((existing.results ?? []).map((row) => [row.user_id, Number(row.id)]));
  for (const participant of users) {
    if (byUser.has(participant.user_id)) continue;
    const created = await env.DB.prepare(
      `INSERT INTO competition_entries(competition_id,entry_type,display_name,source_json)
       VALUES (?,'INDIVIDUAL',?,?) RETURNING id`,
    ).bind(competitionId, participant.full_name, JSON.stringify({ source: 'season', userId: participant.user_id }))
      .first<{ id: number }>();
    if (!created) throw new Error('No se pudo crear una entrada de Copa Total');
    await env.DB.prepare(
      `INSERT INTO competition_entry_members(entry_id,user_id) VALUES (?,?)`,
    ).bind(created.id, participant.user_id).run();
    byUser.set(participant.user_id, Number(created.id));
  }
  return byUser;
}

export async function totalGroupContext(env: Env, stageId: number) {
  const checked = await ensureTotalStage(env, stageId);
  if (!checked.ok) return null;
  const stage = checked.stage;
  const people = await env.DB.prepare(`SELECT u.id AS userId,u.full_name AS fullName,d.code AS divisionCode
    FROM season_division_members m JOIN users u ON u.id=m.user_id JOIN season_divisions d ON d.id=m.division_id
    WHERE m.season_id=? AND u.role='participant' AND u.is_active=1 ORDER BY u.full_name COLLATE NOCASE`).bind(stage.season_id).all<{userId:string;fullName:string;divisionCode:string}>();
  const assignments=await env.DB.prepare(`SELECT g.code,g.name,m.user_id AS userId FROM competition_groups g
    JOIN competition_group_entries ge ON ge.group_id=g.id JOIN competition_entry_members m ON m.entry_id=ge.entry_id
    WHERE g.stage_id=? ORDER BY g.sequence,ge.seed_position`).bind(stageId).all<{code:string;name:string;userId:string}>();
  const champion=await env.DB.prepare(`SELECT m.user_id FROM competition_results r JOIN competitions c ON c.id=r.competition_id
    JOIN tafa_seasons t ON t.id=c.season_id JOIN competition_entry_members m ON m.entry_id=r.entry_id
    WHERE c.code='COPA_TOTAL' AND t.season_number<? AND r.result_code='CHAMPION' ORDER BY t.season_number DESC,r.confirmed_at DESC LIMIT 1`)
    .bind(stage.season_number).first<{user_id:string}>();
  const last=await env.DB.prepare(`SELECT after_json,created_at FROM audit_log WHERE entity_type='competition_stage' AND entity_id=?
    AND action IN ('competition.total_groups_configured','competition.total_groups_drawn') ORDER BY id DESC LIMIT 1`).bind(String(stageId)).first<{after_json:string;created_at:string}>();
  const fixture=await env.DB.prepare('SELECT COUNT(*) n FROM competition_encounters WHERE stage_id=?').bind(stageId).first<{n:number}>();
  const links=await env.DB.prepare(`SELECT l.id,l.round_id AS roundId,r.name,r.status,COUNT(m.id) AS matchCount FROM competition_round_links l
    JOIN rounds r ON r.id=l.round_id LEFT JOIN matches m ON m.round_id=r.id WHERE l.stage_id=? AND l.purpose='NORMAL' GROUP BY l.id ORDER BY l.sequence,l.id`)
    .bind(stageId).all();
  return {stage,eligible:people.results??[],assignments:assignments.results??[],links:links.results??[],fixtureCount:Number(fixture?.n??0),
    defendingChampionUserId:people.results?.some(p=>p.userId===champion?.user_id)?champion!.user_id:null,
    lastConfiguration:last?{...JSON.parse(last.after_json),createdAt:last.created_at}:null};
}

async function drawGroups(request:Request,env:Env,user:SessionUser,stageId:number) {
  const context=await totalGroupContext(env,stageId);
  if(!context)return error('Etapa de Copa Total no encontrada',404);
  const body=await request.json().catch(()=>null) as {groupSizes?:number[]}|null;
  const sizes=body?.groupSizes;
  if(!Array.isArray(sizes)||!sizes.length||sizes.some(n=>!Number.isInteger(n)||n<3||n>5)||sizes.reduce((a,b)=>a+b,0)!==context.eligible.length) return error('Las plazas deben incluir a todos en grupos de 3 a 5');
  const rankingResponse=await handleIffhs(new Request(new URL(`/api/competition-engine/iffhs/ranking?throughSeason=${context.stage.season_number-1}`,request.url),{headers:request.headers}),env);
  if(!rankingResponse?.ok)return error('No se pudo obtener el ranking IFFHS',409);
  const ranking=await rankingResponse.json() as {ranking:{userId:string;position:number}[]};
  const rank=new Map(ranking.ranking.map(r=>[r.userId,r.position]));
  const ordered=[...context.eligible].sort((a,b)=>(rank.get(a.userId)??Infinity)-(rank.get(b.userId)??Infinity)).map(p=>p.userId);
  const champion=context.defendingChampionUserId;
  const seedOrder=champion?[champion,...ordered.filter(id=>id!==champion)]:ordered;
  const randomSeed=crypto.getRandomValues(new Uint32Array(1))[0];let state=randomSeed;
  const random=()=>{state+=0x6d2b79f5;let v=state;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);return ((v^(v>>>14))>>>0)/4294967296;};
  const shuffle=<T,>(items:T[])=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
  const groups=sizes.map((_,i)=>({code:String.fromCharCode(65+i),name:`Grupo ${String.fromCharCode(65+i)}`,userIds:[] as string[]}));
  let cursor=0;
  for(let pot=0;cursor<seedOrder.length;pot++) {
    const available=groups.map((g,i)=>i).filter(i=>groups[i].userIds.length<sizes[i]);
    let users=seedOrder.slice(cursor,cursor+available.length);cursor+=users.length;
    if(pot===0&&champion){groups[0].userIds.push(champion);users=users.filter(id=>id!==champion);available.splice(available.indexOf(0),1);}
    const targets=shuffle(available);shuffle(users).forEach((id,i)=>groups[targets[i]].userIds.push(id));
  }
  return configureGroups(new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify({groups})}),env,user,stageId,{randomSeed,rankingUserIds:ordered,effectiveSeedOrder:seedOrder,defendingChampionUserId:champion});
}

async function configureGroups(request: Request, env: Env, user: SessionUser, stageId: number, automatic?:Record<string,unknown>) {
  const checked = await ensureTotalStage(env, stageId);
  if (!checked.ok) return error(checked.error, checked.status);
  const stage = checked.stage;
  if ([stage.season_status,stage.competition_status].some(v=>['finished','archived'].includes(v))) return error('La Copa o temporada está cerrada',409);
  if (stage.status !== 'draft') return error('Los grupos sólo pueden reemplazarse mientras la etapa está en borrador', 409);

  const encounters = await env.DB.prepare(`SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id=?`)
    .bind(stageId).first<{ total: number }>();
  if (Number(encounters?.total ?? 0) > 0) return error('No se pueden reemplazar grupos después de generar el fixture', 409);

  const body = await request.json().catch(() => null) as { groups?: GroupInput[] } | null;
  if (!Array.isArray(body?.groups) || body.groups.length === 0) return error('Tenés que enviar los grupos de Copa Total');

  const usersResult = await env.DB.prepare(
    `SELECT dm.user_id,u.full_name FROM season_division_members dm JOIN users u ON u.id=dm.user_id
     WHERE dm.season_id=? AND u.role='participant' AND u.is_active=1 ORDER BY u.full_name COLLATE NOCASE`,
  ).bind(stage.season_id).all<{ user_id: string; full_name: string }>();
  const participants = usersResult.results ?? [];
  const eligible = new Set(participants.map((row) => row.user_id));
  const seen = new Set<string>();
  const codes = new Set<string>();
  const groups: Array<{ code: string; name: string; userIds: string[] }> = [];

  for (let index = 0; index < body.groups.length; index += 1) {
    const raw = body.groups[index];
    const code = (raw.code?.trim() || String.fromCharCode(65 + index)).toUpperCase();
    const name = raw.name?.trim() || `Grupo ${code}`;
    if (codes.has(code)) return error('Los códigos de grupo no pueden repetirse');
    codes.add(code);
    const userIds = Array.isArray(raw.userIds) ? raw.userIds.map((id) => String(id).trim()) : [];
    if (userIds.length < 3 || userIds.length > 5) return error(`${name} debe tener entre 3 y 5 participantes`);
    for (const userId of userIds) {
      if (!eligible.has(userId)) return error(`${name} contiene un participante fuera de T${stage.season_id}`);
      if (seen.has(userId)) return error('Un participante no puede estar en dos grupos de Copa Total');
      seen.add(userId);
    }
    groups.push({ code, name, userIds });
  }
  if (seen.size !== eligible.size) return error('Todos los participantes de la temporada deben estar exactamente en un grupo de Copa Total');

  let entryByUser: Map<string, number>;
  try { entryByUser = await ensureEntries(env, stage.competition_id, participants); }
  catch (caught) { return error(caught instanceof Error ? caught.message : 'No se pudieron crear las entradas', 500); }

  const before=await totalGroupContext(env,stageId);
  const statements:D1PreparedStatement[]=[env.DB.prepare('DELETE FROM competition_groups WHERE stage_id=?').bind(stageId)];
  groups.forEach((group,i)=>{
    statements.push(env.DB.prepare('INSERT INTO competition_groups(stage_id,code,name,sequence) VALUES (?,?,?,?)').bind(stageId,group.code,group.name,i+1));
    group.userIds.forEach((id,j)=>statements.push(env.DB.prepare(`INSERT INTO competition_group_entries(group_id,entry_id,seed_position)
      VALUES ((SELECT id FROM competition_groups WHERE stage_id=? AND code=?),?,?)`).bind(stageId,group.code,entryByUser.get(id)!,j+1)));
  });
  statements.push(env.DB.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,before_json,after_json) VALUES (?,?,'competition_stage',?,?,?)`)
    .bind(user.id,automatic?'competition.total_groups_drawn':'competition.total_groups_configured',String(stageId),JSON.stringify(before?.assignments??[]),JSON.stringify({configurationMode:automatic?'AUTOMATIC':'MANUAL',groups,...automatic})));
  await env.DB.batch(statements);
  return json({ ok: true, stageId, groups,configurationMode:automatic?'AUTOMATIC':'MANUAL',...automatic });
}

function singleRoundRobin(entryIds: number[]) {
  const teams: Array<number | null> = [...entryIds];
  if (teams.length % 2 === 1) teams.push(null);
  const rounds: FixturePair[][] = [];
  for (let round = 0; round < teams.length - 1; round += 1) {
    const pairs: FixturePair[] = [];
    for (let index = 0; index < teams.length / 2; index += 1) {
      const a = teams[index];
      const b = teams[teams.length - 1 - index];
      if (a != null && b != null) pairs.push([a, b]);
    }
    rounds.push(pairs);
    const fixed = teams[0];
    const rest = teams.slice(1);
    rest.unshift(rest.pop() ?? null);
    teams.splice(0, teams.length, fixed, ...rest);
  }
  return rounds;
}

function fixtureForGroup(entryIds: number[]) {
  const firstLeg = singleRoundRobin(entryIds);
  if (entryIds.length === 5) return firstLeg;
  const secondLeg = firstLeg.map((round) => round.map(([a, b]) => [b, a] as FixturePair));
  return [...firstLeg, ...secondLeg];
}

async function generateFixtures(env: Env, user: SessionUser, stageId: number) {
  const checked = await ensureTotalStage(env, stageId);
  if (!checked.ok) return error(checked.error, checked.status);
  if ([checked.stage.status,checked.stage.season_status,checked.stage.competition_status].some(v=>['finished','archived'].includes(v)))return error('La Copa, etapa o temporada está cerrada',409);
  const existing = await env.DB.prepare(`SELECT COUNT(*) AS total FROM competition_encounters WHERE stage_id=?`)
    .bind(stageId).first<{ total: number }>();
  if (Number(existing?.total ?? 0) > 0) return error('El fixture de Copa Total ya fue generado', 409);

  const segmentsResult = await env.DB.prepare(
    `SELECT crs.id,crs.round_link_id,((crl.sequence-1)*3+crs.sequence) AS mini_day
     FROM competition_round_segments crs JOIN competition_round_links crl ON crl.id=crs.round_link_id
     WHERE crl.stage_id=? AND crl.purpose='NORMAL' ORDER BY mini_day`,
  ).bind(stageId).all<{ id: number; round_link_id: number; mini_day: number }>();
  const segments = segmentsResult.results ?? [];
  if (segments.length !== 6) return error('Primero generá los 6 segmentos de Copa Total', 409);

  const groupsResult = await env.DB.prepare(
    `SELECT id,code,name FROM competition_groups WHERE stage_id=? ORDER BY sequence`,
  ).bind(stageId).all<{ id: number; code: string; name: string }>();
  const groups = groupsResult.results ?? [];
  if (groups.length === 0) return error('Primero configurá los grupos de Copa Total', 409);

  const allStatements:D1PreparedStatement[]=[];
  const createdSummary: Array<{ group: string; miniDay: number; pairs: FixturePair[] }> = [];
  for (const group of groups) {
    const entriesResult = await env.DB.prepare(
      `SELECT cge.entry_id,ce.display_name FROM competition_group_entries cge
       JOIN competition_entries ce ON ce.id=cge.entry_id WHERE cge.group_id=? ORDER BY cge.seed_position,ce.id`,
    ).bind(group.id).all<{ entry_id: number; display_name: string }>();
    const entryIds = (entriesResult.results ?? []).map((row) => Number(row.entry_id));
    if (entryIds.length < 3 || entryIds.length > 5) return error(`${group.name} debe tener entre 3 y 5 participantes`, 409);
    const schedule = fixtureForGroup(entryIds);

    for (let miniDay = 1; miniDay <= 6; miniDay += 1) {
      const pairs = schedule[miniDay - 1] ?? [];
      const segment = segments[miniDay - 1];
      const statements = pairs.map((pair, pairIndex) => env.DB.prepare(
        `INSERT INTO competition_encounters
           (stage_id,group_id,round_link_id,segment_id,slot_key,entry_a_id,entry_b_id,status)
         VALUES (?,?,?,?,?,?,?,'pending')`,
      ).bind(stageId, group.id, segment.round_link_id, segment.id, `${group.code}-M${miniDay}-${pairIndex + 1}`, pair[0], pair[1]));
      allStatements.push(...statements);
      createdSummary.push({ group: group.code, miniDay, pairs });
    }
  }

  allStatements.push(env.DB.prepare(`INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_json) VALUES (?,'competition.total_fixture_generated','competition_stage',?,?)`).bind(user.id,String(stageId),JSON.stringify(createdSummary)));
  await env.DB.batch(allStatements);
  return json({ ok: true, stageId, fixture: createdSummary });
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

export async function totalGroupStandings(env: Env, stageId: number) {
  const checked = await ensureTotalStage(env, stageId);
  if (!checked.ok) return null;
  const groupsResult = await env.DB.prepare(
    `SELECT id,code,name,sequence FROM competition_groups WHERE stage_id=? ORDER BY sequence`,
  ).bind(stageId).all<{ id: number; code: string; name: string; sequence: number }>();

  const coverage=await env.DB.prepare(`SELECT COUNT(DISTINCT l.id) links,COUNT(DISTINCT seg.id) segments,COUNT(sm.match_id) matches,
    SUM(CASE WHEN m.result_finalized_at IS NOT NULL OR m.is_void=1 THEN 1 ELSE 0 END) finalized
    FROM competition_round_links l LEFT JOIN competition_round_segments seg ON seg.round_link_id=l.id
    LEFT JOIN competition_round_segment_matches sm ON sm.segment_id=seg.id LEFT JOIN matches m ON m.id=sm.match_id
    WHERE l.stage_id=? AND l.purpose='NORMAL'`).bind(stageId).first<{links:number;segments:number;matches:number;finalized:number}>();
  const incomplete=coverage?.links!==2||coverage?.segments!==6||coverage?.matches!==24||coverage?.finalized!==24;
  const groups = [];
  for (const group of groupsResult.results ?? []) {
    const entriesResult = await env.DB.prepare(
      `SELECT cge.entry_id,ce.display_name FROM competition_group_entries cge
       JOIN competition_entries ce ON ce.id=cge.entry_id WHERE cge.group_id=? ORDER BY cge.seed_position,ce.display_name COLLATE NOCASE`,
    ).bind(group.id).all<{ entry_id: number; display_name: string }>();
    const table = new Map<number, {
      entryId: number; displayName: string; played: number; won: number; drawn: number; lost: number;
      gf: number; ga: number; gd: number; points: number;
    }>();
    for (const entry of entriesResult.results ?? []) {
      table.set(Number(entry.entry_id), {
        entryId: Number(entry.entry_id), displayName: entry.display_name,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
      });
    }

    const encounters = await env.DB.prepare(
      `SELECT id,entry_a_id,entry_b_id,segment_id FROM competition_encounters
       WHERE stage_id=? AND group_id=? ORDER BY id`,
    ).bind(stageId, group.id).all<{ id: number; entry_a_id: number; entry_b_id: number; segment_id: number }>();
    let provisional = incomplete || !(encounters.results?.length);
    const fixtures = [];
    for (const encounter of encounters.results ?? []) {
      const [a, b] = await Promise.all([
        scoreEntrySegment(env, Number(encounter.entry_a_id), Number(encounter.segment_id)),
        scoreEntrySegment(env, Number(encounter.entry_b_id), Number(encounter.segment_id)),
      ]);
      fixtures.push({ segmentId:Number(encounter.segment_id), id: Number(encounter.id), entryAId: Number(encounter.entry_a_id), entryBId: Number(encounter.entry_b_id), scoreA: a.points, scoreB: b.points, complete: a.complete && b.complete });
      if (!a.complete || !b.complete) { provisional = true; continue; }
      const rowA = table.get(Number(encounter.entry_a_id));
      const rowB = table.get(Number(encounter.entry_b_id));
      if (!rowA || !rowB) continue;
      rowA.played += 1; rowB.played += 1;
      rowA.gf += a.points; rowA.ga += b.points; rowB.gf += b.points; rowB.ga += a.points;
      if (a.points > b.points) { rowA.won += 1; rowB.lost += 1; rowA.points += 3; }
      else if (a.points < b.points) { rowB.won += 1; rowA.lost += 1; rowB.points += 3; }
      else { rowA.drawn += 1; rowB.drawn += 1; rowA.points += 1; rowB.points += 1; }
    }

    const ordered = Array.from(table.values()).map((row) => ({ ...row, gd: row.gf - row.ga }))
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.won - a.won || a.displayName.localeCompare(b.displayName));
    let previous: typeof ordered[number] | null = null;
    let previousPosition = 0;
    const ranked = ordered.map((row, index) => {
      const sameSportingScore = previous != null && row.points === previous.points && row.gd === previous.gd && row.gf === previous.gf && row.won === previous.won;
      const position = sameSportingScore ? previousPosition : index + 1;
      previous = row; previousPosition = position;
      return { position, ...row, tiedOnAllCriteria: sameSportingScore };
    });
    groups.push({ id: Number(group.id), code: group.code, name: group.name, sequence:group.sequence, provisional, standings: ranked, fixtures });
  }
  return { stageId, groups };
}

export async function handleCompetitionTotalGroups(request: Request, env: Env): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const drawMatch=pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/total\/groups\/draw$/);
  if(drawMatch){const user=await sessionUser(request,env);if(!user)return error('No autorizado',401);if(user.role!=='admin')return error('Acceso de administrador requerido',403);if(request.method!=='POST')return error('Método no permitido',405);return drawGroups(request,env,user,Number(drawMatch[1]));}
  const configureMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/total\/groups$/);
  if (configureMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if(request.method==='GET'){const c=await totalGroupContext(env,Number(configureMatch[1]));return c?json(c):error('Etapa no encontrada',404);}
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return configureGroups(request, env, user, Number(configureMatch[1]));
  }
  const fixtureMatch = pathname.match(/^\/api\/admin\/competition-engine\/stages\/(\d+)\/total\/fixture$/);
  if (fixtureMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (user.role !== 'admin') return error('Acceso de administrador requerido', 403);
    if (request.method !== 'POST') return error('Método no permitido', 405);
    return generateFixtures(env, user, Number(fixtureMatch[1]));
  }
  const publicMatch = pathname.match(/^\/api\/competition-engine\/stages\/(\d+)\/total\/groups$/);
  if (publicMatch) {
    const user = await sessionUser(request, env);
    if (!user) return error('No autorizado', 401);
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const payload = await totalGroupStandings(env, Number(publicMatch[1]));
    return payload ? json(payload) : error('Etapa de Copa Total no encontrada', 404);
  }
  return null;
}
