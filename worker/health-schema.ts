export const CORE_PRODUCTION_TABLES = [
  'users',
  'sessions',
  'rounds',
  'matches',
  'predictions',
  'round_submissions',
  'prediction_scores',
  'audit_log',
  'league_seasons',
  'league_rounds',
  'league_participants',
  'prediction_history',
  'official_predictions',
  'prediction_submission_events',
] as const;

export const T32_PRODUCTION_TABLES = [
  'tafa_seasons',
  'season_divisions',
  'season_division_members',
  'competitions',
  'competition_stages',
  'competition_entries',
  'competition_entry_members',
  'competition_round_links',
  'competition_round_segments',
  'competition_round_segment_matches',
  'competition_groups',
  'competition_group_entries',
  'competition_encounters',
  'competition_entry_bonuses',
  'competition_tiebreaks',
  'competition_tiebreak_entries',
  'competition_tiebreak_rounds',
  'season_division_movements',
  'iffhs_season_components',
  'iffhs_season_totals',
  'competition_results',
  'competition_stage_qualifiers',
  'competition_survival_round_settings',
  'competition_survival_results',
  'competition_qualification_slots',
  'competition_champions_nodes',
  'season_transition_plans',
  'season_transition_assignments',
  'competition_survival_tiebreaks',
] as const;

export const REQUIRED_PRODUCTION_TABLES = [
  ...CORE_PRODUCTION_TABLES,
  ...T32_PRODUCTION_TABLES,
] as const;

export const REQUIRED_PRODUCTION_COLUMNS = {
  league_participants: ['eligible_from_slot'],
  rounds: ['category'],
  competition_survival_results: ['members_json'],
} as const;

export const REQUIRED_PRODUCTION_TRIGGERS = [
  'prediction_history_no_update',
  'prediction_history_no_delete',
  'history_submission_insert',
  'history_submission_update',
  'history_prediction_insert',
  'history_prediction_update',
  'official_events_no_update',
  'official_events_no_delete',
  'validate_official_submission_insert',
  'promote_official_submission_insert',
  'validate_official_submission_update',
  'promote_official_submission_update',
  'audit_official_insert',
  'invalidate_official_score_insert',
  'audit_official_update',
  'invalidate_official_score_update',
] as const;

export const MINIMUM_PRODUCTION_MIGRATION = '0014_duos_admin.sql';
