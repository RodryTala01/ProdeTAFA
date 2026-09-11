import { describe, expect, it } from 'vitest';
import { recalculateRoundScores, type PredictionScoringInput } from '../worker/scoring';

function scheduledRow(): PredictionScoringInput {
  return {
    prediction_id: 42,
    predicted_home_score: 1,
    predicted_away_score: 0,
    predicted_extra_team_provider_id: null,
    match_type: 'NORMAL',
    status: 'NS',
    home_score_current: null,
    away_score_current: null,
    home_score_regulation: null,
    away_score_regulation: null,
    winning_team_provider_id: null,
    qualified_team_provider_id: null,
    went_to_extra_time: 0,
    went_to_penalties: 0,
    is_void: 0,
  };
}

describe('recalculateRoundScores cleanup', () => {
  it('deletes a stale prediction score when the match is no longer scorable', async () => {
    const deletedPredictionIds: number[] = [];
    const DB = {
      prepare(sql: string) {
        if (sql.includes('SELECT p.id AS prediction_id')) {
          return {
            bind: () => ({ all: async () => ({ results: [scheduledRow()] }) }),
          };
        }
        if (sql.includes('DELETE FROM prediction_scores WHERE prediction_id = ?')) {
          return {
            bind: (predictionId: number) => ({
              run: async () => {
                deletedPredictionIds.push(predictionId);
                return { success: true };
              },
            }),
          };
        }
        throw new Error(`SQL inesperado en test: ${sql}`);
      },
    };

    const calculated = await recalculateRoundScores(9, { DB } as never);

    expect(calculated).toBe(0);
    expect(deletedPredictionIds).toEqual([42]);
  });
});
