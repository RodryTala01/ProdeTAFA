import type { Env } from './index';

type Component = {
  userId: string;
  competitionCode: string;
  componentCode: string;
  baseValue: number;
  multiplier: number;
  points: number;
  detail: unknown;
};

type CompetitionMeta = {
  id: number;
  code: string;
  status: string;
};

const CUP_RESULT_POINTS: Record<string, Record<string, number>> = {
  COPA_A: {
    CHAMPION: 75,
    RUNNER_UP: 40,
    SEMIFINAL: 25,
    QUARTERFINAL: 15,
    ROUND_OF_16: 10,
  },
  COPA_B: {
    CHAMPION: 25,
    RUNNER_UP: 18,
    SEMIFINAL: 12,
    QUARTERFINAL: 8,
    ROUND_OF_16: 4,
  },
  COPA_CAMPEONES: {
    CHAMPION: 100,
    RUNNER_UP: 75,
    SEMIFINAL: 50,
    QUARTERFINAL: 40,
    ROUND_OF_16: 25,
    ROUND_OF_32: 15,
    ROUND_OF_64: 10,
  },
  COPA_TOTAL: {
    CHAMPION: 100,
    RUNNER_UP: 75,
    SEMIFINAL: 60,
    QUARTERFINAL: 45,
    ROUND_OF_16: 30,
  },
  COPA_DUOS: {
    CHAMPION: 50,
    RUNNER_UP: 30,
    PHASE_5: 20,
    PHASE_4: 15,
    PHASE_3: 10,
    PHASE_2: 5,
  },
  COPA_PAPA: {
    CHAMPION: 100,
    RUNNER_UP: 75,
    SEMIFINAL: 45,
    QUARTERFINAL: 30,
    ROUND_OF_16: 22,
  },
};

const GROUP_MULTIPLIERS: Record<string, number> = {
  COPA_A: 1.3,
  COPA_B: 0.75,
  COPA_TOTAL: 3.5,
};

function addComponent(
  target: Component[],
  userId: string,
  competitionCode: string,
  componentCode: string,
  baseValue: number,
  multiplier: number,
  detail: unknown,
) {
  const points = Math.round(baseValue * multiplier * 100) / 100;
  target.push({ userId, competitionCode, componentCode, baseValue, multiplier, points, detail });
}

async function competitionByCode(env: Env, seasonId: number, code: string) {
  return env.DB.prepare(
    `SELECT id,code,status FROM competitions WHERE season_id=? AND code=? LIMIT 1`,
  ).bind(seasonId, code).first<CompetitionMeta>();
}

async function validateCompetitionResults(env: Env, competition: CompetitionMeta) {
  const entries = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_entries WHERE competition_id=?`,
  ).bind(competition.id).first<{ total: number }>();
  const entryCount = Number(entries?.total ?? 0);
  if (entryCount === 0) return null;
  if (competition.status !== 'finished') {
    return `${competition.code} todavía no está finalizada`;
  }
  const results = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM competition_results WHERE competition_id=?`,
  ).bind(competition.id).first<{ total: number }>();
  if (Number(results?.total ?? 0) !== entryCount) {
    return `${competition.code} no tiene resultado final confirmado para todas sus entradas`;
  }
  return null;
}

async function leagueComponents(
  env: Env,
  competition: CompetitionMeta,
  divisionCode: 'A' | 'B',
  otherDivisionCount: number,
  target: Component[],
) {
  const rows = await env.DB.prepare(
    `SELECT cr.entry_id,cr.final_position,cem.user_id,ce.display_name,
            COALESCE(stats.points,0) AS points,
            COALESCE(stats.fulls,0) AS fulls,
            COALESCE(stats.errors,0) AS errors
     FROM competition_results cr
     JOIN competition_entries ce ON ce.id=cr.entry_id
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     LEFT JOIN (
       SELECT ce2.id AS entry_id,
              COALESCE(SUM(ps.total_points),0) AS points,
              COALESCE(SUM(CASE WHEN ps.base_points=3 THEN 1 ELSE 0 END),0) AS fulls,
              COALESCE(SUM(CASE WHEN ps.base_points=0 AND ps.result_type<>'VOID' THEN 1 ELSE 0 END),0) AS errors
       FROM competition_entries ce2
       JOIN competition_entry_members cem2 ON cem2.entry_id=ce2.id
       JOIN competition_stages cs ON cs.competition_id=ce2.competition_id AND cs.stage_type='LEAGUE_TABLE'
       JOIN competition_round_links crl ON crl.stage_id=cs.id AND crl.purpose='NORMAL'
       JOIN matches m ON m.round_id=crl.round_id
       LEFT JOIN official_predictions op ON op.user_id=cem2.user_id AND op.match_id=m.id
       LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id
       WHERE ce2.competition_id=?
       GROUP BY ce2.id
     ) stats ON stats.entry_id=cr.entry_id
     WHERE cr.competition_id=? AND cr.final_position IS NOT NULL
     ORDER BY cr.final_position`,
  ).bind(competition.id, competition.id).all<{
    entry_id: number; final_position: number; user_id: string; display_name: string;
    points: number; fulls: number; errors: number;
  }>();
  const participants = rows.results ?? [];
  const n = participants.length;
  const pointMultiplier = divisionCode === 'A' ? 1.3 : 0.75;
  const fullMultiplier = divisionCode === 'A' ? 2.25 : 1.5;
  const errorPositionMultiplier = divisionCode === 'A' ? 2 : 1;

  const errorOrdered = [...participants].sort((a, b) =>
    Number(a.errors) - Number(b.errors)
    || Number(a.final_position) - Number(b.final_position)
    || a.display_name.localeCompare(b.display_name));
  const errorRankByUser = new Map<string, number>();
  let previousErrors: number | null = null;
  let previousRank = 0;
  for (let index = 0; index < errorOrdered.length; index += 1) {
    const errors = Number(errorOrdered[index].errors);
    const rank = previousErrors !== null && errors === previousErrors ? previousRank : index + 1;
    errorRankByUser.set(errorOrdered[index].user_id, rank);
    previousErrors = errors;
    previousRank = rank;
  }

  for (const row of participants) {
    const position = Number(row.final_position);
    const code = competition.code;
    if (position === 1) {
      addComponent(target, row.user_id, code, 'TITLE', divisionCode === 'A' ? 100 : 30, 1, { position });
    } else if (position === 2) {
      addComponent(target, row.user_id, code, 'RUNNER_UP', divisionCode === 'A' ? 75 : 20, 1, { position });
    }

    if (position !== 1) {
      const positionBase = (n - position + 1) + otherDivisionCount;
      addComponent(target, row.user_id, code, 'POSITION', positionBase, 1, {
        position,
        participants: n,
        lowerDivisionsParticipants: otherDivisionCount,
      });
    }

    addComponent(target, row.user_id, code, 'SPORT_POINTS', Number(row.points), pointMultiplier, {
      rawPoints: Number(row.points),
    });
    addComponent(target, row.user_id, code, 'FULLS', Number(row.fulls), fullMultiplier, {
      fulls: Number(row.fulls),
    });

    const errorRank = errorRankByUser.get(row.user_id) ?? n;
    const errorPositionBase = n - errorRank + 1;
    addComponent(target, row.user_id, code, 'ERROR_RANK', errorPositionBase, errorPositionMultiplier, {
      errors: Number(row.errors),
      errorRank,
      participants: n,
    });
  }
}

async function groupRawPoints(env: Env, competitionId: number, stageType: 'ACCUMULATIVE_GROUPS' | 'ROUND_ROBIN_GROUPS') {
  const rows = await env.DB.prepare(
    `SELECT cem.user_id,COALESCE(SUM(ps.total_points),0) AS points
     FROM competition_entries ce
     JOIN competition_entry_members cem ON cem.entry_id=ce.id
     JOIN competition_stages cs ON cs.competition_id=ce.competition_id AND cs.stage_type=?
     JOIN competition_round_links crl ON crl.stage_id=cs.id AND crl.purpose='NORMAL'
     JOIN matches m ON m.round_id=crl.round_id
     LEFT JOIN official_predictions op ON op.user_id=cem.user_id AND op.match_id=m.id
     LEFT JOIN prediction_scores ps ON ps.prediction_id=op.id
     WHERE ce.competition_id=?
     GROUP BY cem.user_id`,
  ).bind(stageType, competitionId).all<{ user_id: string; points: number }>();
  return rows.results ?? [];
}

async function resultRecipients(env: Env, entryId: number, detailJson: string | null, isDuo: boolean) {
  const rows = await env.DB.prepare(
    `SELECT DISTINCT user_id FROM competition_entry_members WHERE entry_id=? ORDER BY id`,
  ).bind(entryId).all<{ user_id: string }>();
  const memberIds = (rows.results ?? []).map((row) => row.user_id);
  if (!isDuo || memberIds.length <= 2) return { ok: true as const, userIds: memberIds };

  let detail: { iffhsUserIds?: unknown } | null = null;
  try { detail = detailJson ? JSON.parse(detailJson) : null; } catch { detail = null; }
  const explicit = Array.isArray(detail?.iffhsUserIds)
    ? [...new Set((detail!.iffhsUserIds as unknown[]).map(String))]
    : [];
  if (explicit.length === 0 || explicit.some((id) => !memberIds.includes(id))) {
    return {
      ok: false as const,
      error: 'Copa Dúos tuvo sustituciones: el resultado final debe indicar detail.iffhsUserIds para definir quiénes reciben ese aporte IFFHS',
    };
  }
  return { ok: true as const, userIds: explicit };
}

async function cupComponents(env: Env, competition: CompetitionMeta, target: Component[]) {
  const pointsMap = CUP_RESULT_POINTS[competition.code] ?? {};
  const results = await env.DB.prepare(
    `SELECT cr.entry_id,cr.result_code,cr.final_position,cr.detail_json,ce.entry_type
     FROM competition_results cr
     JOIN competition_entries ce ON ce.id=cr.entry_id
     WHERE cr.competition_id=?`,
  ).bind(competition.id).all<{
    entry_id: number; result_code: string; final_position: number | null; detail_json: string | null; entry_type: string;
  }>();

  for (const row of results.results ?? []) {
    const recipients = await resultRecipients(env, Number(row.entry_id), row.detail_json, row.entry_type === 'DUO');
    if (!recipients.ok) return recipients.error;
    const fixedPoints = Number(pointsMap[row.result_code] ?? 0);
    for (const userId of recipients.userIds) {
      addComponent(target, userId, competition.code, 'RESULT', fixedPoints, 1, {
        resultCode: row.result_code,
        finalPosition: row.final_position == null ? null : Number(row.final_position),
        entryId: Number(row.entry_id),
      });
    }
  }

  const groupMultiplier = GROUP_MULTIPLIERS[competition.code];
  if (groupMultiplier != null) {
    const stageType = competition.code === 'COPA_TOTAL' ? 'ROUND_ROBIN_GROUPS' : 'ACCUMULATIVE_GROUPS';
    const groupPoints = await groupRawPoints(env, competition.id, stageType);
    for (const row of groupPoints) {
      addComponent(target, row.user_id, competition.code, 'GROUP_POINTS', Number(row.points), groupMultiplier, {
        rawPoints: Number(row.points),
        stageType,
      });
    }
  }
  return null;
}

function toScaled(value: number) {
  return Math.round(value * 100);
}

export async function calculateIffhsSeason(
  env: Env,
  actorUserId: string,
  seasonNumber: number,
): Promise<{ ok: true; components: Component[]; totals: Array<{ userId: string; totalPoints: number }> } | { ok: false; error: string }> {
  const season = await env.DB.prepare(
    `SELECT id,season_number,status FROM tafa_seasons WHERE season_number=? LIMIT 1`,
  ).bind(seasonNumber).first<{ id: number; season_number: number; status: string }>();
  if (!season) return { ok: false, error: 'Temporada no encontrada' };

  const imported = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM iffhs_season_totals WHERE season_number=? AND source='imported'`,
  ).bind(seasonNumber).first<{ total: number }>();
  if (Number(imported?.total ?? 0) > 0) {
    return { ok: false, error: 'Esta temporada tiene totales IFFHS importados. No se sobrescriben automáticamente.' };
  }

  const codes = ['LIGA_A','LIGA_B','COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_CAMPEONES','COPA_PAPA'];
  const competitions = new Map<string, CompetitionMeta>();
  for (const code of codes) {
    const competition = await competitionByCode(env, season.id, code);
    if (competition) competitions.set(code, competition);
  }

  for (const competition of competitions.values()) {
    const validationError = await validateCompetitionResults(env, competition);
    if (validationError) return { ok: false, error: validationError };
  }

  const divisionCounts = await env.DB.prepare(
    `SELECT sd.code,COUNT(sdm.user_id) AS total
     FROM season_divisions sd
     LEFT JOIN season_division_members sdm ON sdm.division_id=sd.id AND sdm.season_id=sd.season_id
     WHERE sd.season_id=? AND sd.code IN ('A','B')
     GROUP BY sd.code`,
  ).bind(season.id).all<{ code: string; total: number }>();
  const counts = new Map((divisionCounts.results ?? []).map((row) => [row.code, Number(row.total)]));

  const components: Component[] = [];
  const ligaA = competitions.get('LIGA_A');
  const ligaB = competitions.get('LIGA_B');
  if (ligaA) await leagueComponents(env, ligaA, 'A', Number(counts.get('B') ?? 0), components);
  if (ligaB) await leagueComponents(env, ligaB, 'B', 0, components);

  for (const code of ['COPA_A','COPA_B','COPA_TOTAL','COPA_DUOS','COPA_CAMPEONES','COPA_PAPA']) {
    const competition = competitions.get(code);
    if (!competition) continue;
    const cupError = await cupComponents(env, competition, components);
    if (cupError) return { ok: false, error: cupError };
  }

  const participantRows = await env.DB.prepare(
    `SELECT DISTINCT sdm.user_id
     FROM season_division_members sdm
     JOIN users u ON u.id=sdm.user_id
     WHERE sdm.season_id=? AND u.role='participant'`,
  ).bind(season.id).all<{ user_id: string }>();
  const participantIds = (participantRows.results ?? []).map((row) => row.user_id);

  await env.DB.prepare(
    `DELETE FROM iffhs_season_components WHERE season_number=? AND source='calculated'`,
  ).bind(seasonNumber).run();

  for (const component of components) {
    await env.DB.prepare(
      `INSERT INTO iffhs_season_components
         (season_number,user_id,competition_code,component_code,base_value_scaled,
          multiplier_scaled,points_scaled,detail_json,source,calculated_at)
       VALUES (?,?,?,?,?,?,?,?, 'calculated',datetime('now'))
       ON CONFLICT(season_number,user_id,competition_code,component_code) DO UPDATE SET
         base_value_scaled=excluded.base_value_scaled,
         multiplier_scaled=excluded.multiplier_scaled,
         points_scaled=excluded.points_scaled,
         detail_json=excluded.detail_json,
         source='calculated',
         calculated_at=excluded.calculated_at`,
    ).bind(
      seasonNumber,
      component.userId,
      component.competitionCode,
      component.componentCode,
      toScaled(component.baseValue),
      Math.round(component.multiplier * 100),
      toScaled(component.points),
      JSON.stringify(component.detail),
    ).run();
  }

  const manualAdjustments = await env.DB.prepare(
    `SELECT user_id,COALESCE(SUM(points_scaled),0) AS points_scaled
     FROM iffhs_season_components
     WHERE season_number=? AND source='manual_adjustment'
     GROUP BY user_id`,
  ).bind(seasonNumber).all<{ user_id: string; points_scaled: number }>();
  const adjustmentByUser = new Map((manualAdjustments.results ?? []).map((row) => [row.user_id, Number(row.points_scaled)]));

  const totals: Array<{ userId: string; totalPoints: number }> = [];
  for (const userId of participantIds) {
    const totalScaled = components
      .filter((component) => component.userId === userId)
      .reduce((sum, component) => sum + toScaled(component.points), 0)
      + Number(adjustmentByUser.get(userId) ?? 0);
    await env.DB.prepare(
      `INSERT INTO iffhs_season_totals(season_number,user_id,total_points_scaled,source,calculated_at)
       VALUES (?,?,?,'calculated',datetime('now'))
       ON CONFLICT(season_number,user_id) DO UPDATE SET
         total_points_scaled=excluded.total_points_scaled,
         source='calculated',
         calculated_at=excluded.calculated_at`,
    ).bind(seasonNumber, userId, totalScaled).run();
    totals.push({ userId, totalPoints: totalScaled / 100 });
  }

  await env.DB.prepare(
    `INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,after_json)
     VALUES (?,'iffhs.season_calculated','iffhs_season',?,?)`,
  ).bind(actorUserId, String(seasonNumber), JSON.stringify({
    seasonNumber,
    componentCount: components.length,
    totals,
  })).run();

  return { ok: true, components, totals };
}
