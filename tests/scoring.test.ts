import { describe, expect, it } from 'vitest';
import { calculatePredictionScore, type PredictionScoringInput } from '../worker/scoring';

function row(overrides: Partial<PredictionScoringInput> = {}): PredictionScoringInput {
  return {
    prediction_id: 1,
    predicted_home_score: 2,
    predicted_away_score: 1,
    predicted_extra_team_provider_id: null,
    match_type: 'NORMAL',
    status: 'FT',
    home_score_current: 2,
    away_score_current: 1,
    home_score_regulation: 2,
    away_score_regulation: 1,
    winning_team_provider_id: 'home',
    qualified_team_provider_id: 'home',
    went_to_extra_time: 0,
    went_to_penalties: 0,
    is_void: 0,
    ...overrides,
  };
}

describe('calculatePredictionScore', () => {
  it('gives 3 points for an exact 90-minute score', () => {
    expect(calculatePredictionScore(row())).toMatchObject({
      resultType: 'FULL',
      basePoints: 3,
      extraPoints: 0,
      totalPoints: 3,
      provisional: false,
    });
  });

  it('gives 1 point for the correct sign with the wrong score', () => {
    expect(calculatePredictionScore(row({
      predicted_home_score: 1,
      predicted_away_score: 0,
    }))).toMatchObject({
      resultType: 'PARTIAL',
      basePoints: 1,
      totalPoints: 1,
    });
  });

  it('gives 0 points for the wrong sign', () => {
    expect(calculatePredictionScore(row({
      predicted_home_score: 0,
      predicted_away_score: 1,
    }))).toMatchObject({
      resultType: 'ERROR',
      basePoints: 0,
      totalPoints: 0,
    });
  });

  it('adds the penalty bonus to a full score for a penalty-marked match', () => {
    expect(calculatePredictionScore(row({
      match_type: 'PENALTIES_ONLY',
      status: 'PEN',
      predicted_extra_team_provider_id: 'home',
      went_to_penalties: 1,
      winning_team_provider_id: 'home',
      qualified_team_provider_id: 'home',
    }))).toMatchObject({
      resultType: 'FULL',
      basePoints: 3,
      extraPoints: 1,
      totalPoints: 4,
    });
  });

  it('can award only the penalty bonus when the 90-minute prediction is wrong', () => {
    expect(calculatePredictionScore(row({
      match_type: 'PENALTIES_ONLY',
      status: 'PEN',
      predicted_home_score: 0,
      predicted_away_score: 1,
      predicted_extra_team_provider_id: 'home',
      went_to_penalties: 1,
      winning_team_provider_id: 'home',
      qualified_team_provider_id: 'home',
    }))).toMatchObject({
      resultType: 'PENALTIES',
      basePoints: 0,
      extraPoints: 1,
      totalPoints: 1,
    });
  });

  it('does not award the penalty bonus when the match did not reach penalties', () => {
    expect(calculatePredictionScore(row({
      match_type: 'PENALTIES_ONLY',
      predicted_extra_team_provider_id: 'home',
      went_to_penalties: 0,
    }))).toMatchObject({
      basePoints: 3,
      extraPoints: 0,
      totalPoints: 3,
    });
  });

  it('does not award the penalty bonus to a normal match', () => {
    expect(calculatePredictionScore(row({
      match_type: 'NORMAL',
      status: 'PEN',
      predicted_extra_team_provider_id: 'home',
      went_to_penalties: 1,
    }))).toMatchObject({
      basePoints: 3,
      extraPoints: 0,
      totalPoints: 3,
    });
  });

  it('marks live scores as provisional', () => {
    expect(calculatePredictionScore(row({
      status: '2H',
      home_score_regulation: null,
      away_score_regulation: null,
    }))).toMatchObject({
      totalPoints: 3,
      provisional: true,
    });
  });

  it('turns a void match into 0 points without an error result', () => {
    expect(calculatePredictionScore(row({ is_void: 1 }))).toEqual({
      resultType: 'VOID',
      basePoints: 0,
      extraPoints: 0,
      totalPoints: 0,
      provisional: false,
    });
  });

  it('does not calculate a scheduled match', () => {
    expect(calculatePredictionScore(row({ status: 'NS' }))).toBeNull();
  });
});
