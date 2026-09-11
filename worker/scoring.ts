type Env = {
  DB: D1Database;
};

export type PredictionScoringInput = {
  prediction_id: number;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_extra_team_provider_id: string | null;
  match_type: 'NORMAL' | 'PENALTIES_ONLY';
  status: string;
  home_score_current: number | null;
  away_score_current: number | null;
  home_score_regulation: number | null;
  away_score_regulation: number | null;
  winning_team_provider_id: string | null;
  qualified_team_provider_id: string | null;
  went_to_extra_time: number;
  went_to_penalties: number;
  is_void: number;
};

export type ScoreCalculation = {
  resultType: 'FULL' | 'PARTIAL' | 'ERROR' | 'PENALTIES' | 'VOID';
  basePoints: number;
  extraPoints: number;
  totalPoints: number;
  provisional: boolean;
};

const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN']);
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);

function sign(home: number, away: number) {
  return home === away ? 0 : home > away ? 1 : -1;
}

export function calculatePredictionScore(row: PredictionScoringInput): ScoreCalculation | null {
  if (row.is_void) {
    return {
      resultType: 'VOID',
      basePoints: 0,
      extraPoints: 0,
      totalPoints: 0,
      provisional: false,
    };
  }

  const final = FINAL_STATUSES.has(row.status);
  const live = LIVE_STATUSES.has(row.status);
  if (!final && !live) return null;

  const actualHome = row.home_score_regulation ?? row.home_score_current;
  const actualAway = row.away_score_regulation ?? row.away_score_current;
  if (
    actualHome === null || actualAway === null ||
    row.predicted_home_score === null || row.predicted_away_score === null
  ) return null;

  let basePoints = 0;
  let resultType: ScoreCalculation['resultType'] = 'ERROR';

  if (row.predicted_home_score === actualHome && row.predicted_away_score === actualAway) {
    basePoints = 3;
    resultType = 'FULL';
  } else if (sign(row.predicted_home_score, row.predicted_away_score) === sign(actualHome, actualAway)) {
    basePoints = 1;
    resultType = 'PARTIAL';
  }

  let extraPoints = 0;
  const resolvedWinner = row.qualified_team_provider_id ?? row.winning_team_provider_id;
  if (
    final && row.match_type === 'PENALTIES_ONLY' && row.went_to_penalties === 1 &&
    row.predicted_extra_team_provider_id &&
    row.predicted_extra_team_provider_id === resolvedWinner
  ) {
    extraPoints = 1;
    if (basePoints === 0) resultType = 'PENALTIES';
  }

  return {
    resultType,
    basePoints,
    extraPoints,
    totalPoints: basePoints + extraPoints,
    provisional: !final,
  };
}

async function saveScore(
  env: Env,
  predictionId: number,
  calculation: ScoreCalculation,
) {
  await env.DB.prepare(
    `INSERT INTO prediction_scores
      (prediction_id, result_type, base_points, extra_points, total_points, is_provisional, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(prediction_id) DO UPDATE SET
      result_type=excluded.result_type, base_points=excluded.base_points,
      extra_points=excluded.extra_points, total_points=excluded.total_points,
      is_provisional=excluded.is_provisional, calculated_at=datetime('now')`,
  ).bind(
    predictionId,
    calculation.resultType,
    calculation.basePoints,
    calculation.extraPoints,
    calculation.totalPoints,
    calculation.provisional ? 1 : 0,
  ).run();
}

export async function recalculateRoundScores(roundId: number, env: Env) {
  const rows = await env.DB.prepare(
    `SELECT p.id AS prediction_id, p.predicted_home_score, p.predicted_away_score,
            p.predicted_extra_team_provider_id, m.match_type, m.status,
            m.home_score_current, m.away_score_current,
            m.home_score_regulation, m.away_score_regulation,
            m.winning_team_provider_id, m.qualified_team_provider_id,
            m.went_to_extra_time, m.went_to_penalties, m.is_void
     FROM predictions p
     JOIN matches m ON m.id = p.match_id
     WHERE m.round_id = ?`,
  ).bind(roundId).all<PredictionScoringInput>();

  let calculated = 0;
  for (const row of rows.results ?? []) {
    const calculation = calculatePredictionScore(row);
    if (!calculation) {
      await env.DB.prepare('DELETE FROM prediction_scores WHERE prediction_id = ?')
        .bind(row.prediction_id)
        .run();
      continue;
    }
    await saveScore(env, row.prediction_id, calculation);
    calculated += 1;
  }

  return calculated;
}
