-- Immutable events; triggers execute atomically with the original write.
CREATE TABLE prediction_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL REFERENCES rounds(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('first_submit', 'change', 'resubmit')),
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('participant', 'admin')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT NOT NULL CHECK (json_valid(after_json))
);
CREATE INDEX idx_prediction_history_lookup ON prediction_history(round_id, user_id, id DESC);

CREATE TRIGGER prediction_history_no_update BEFORE UPDATE ON prediction_history
BEGIN SELECT RAISE(ABORT, 'Prediction history is append-only'); END;
CREATE TRIGGER prediction_history_no_delete BEFORE DELETE ON prediction_history
BEGIN SELECT RAISE(ABORT, 'Prediction history is append-only'); END;

CREATE TRIGGER history_submission_insert AFTER INSERT ON round_submissions

BEGIN
  INSERT INTO prediction_history(round_id, user_id, event_type, actor_kind, after_json)
  SELECT NEW.round_id, NEW.user_id, 'first_submit', 'participant',
    COALESCE((SELECT json_group_array(json(item)) FROM (
      SELECT json_object(
        'matchId', m.id, 'homeName', m.home_team_name, 'awayName', m.away_team_name,
        'matchType', m.match_type,
        'homeScore', p.predicted_home_score, 'awayScore', p.predicted_away_score,
        'extraTeam', CASE p.predicted_extra_team_provider_id
          WHEN m.home_team_provider_id THEN m.home_team_name
          WHEN m.away_team_provider_id THEN m.away_team_name END,
        'extraTeamId', p.predicted_extra_team_provider_id) AS item
      FROM matches m LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = NEW.user_id
      WHERE m.round_id = NEW.round_id ORDER BY m.kickoff_at, m.id
    )), '[]');
END;

CREATE TRIGGER history_submission_update AFTER UPDATE ON round_submissions
WHEN NEW.submission_count > OLD.submission_count
BEGIN
  INSERT INTO prediction_history(round_id, user_id, event_type, actor_kind, after_json)
  SELECT NEW.round_id, NEW.user_id, 'resubmit', 'participant',
    COALESCE((SELECT json_group_array(json(item)) FROM (
      SELECT json_object(
        'matchId', m.id, 'homeName', m.home_team_name, 'awayName', m.away_team_name,
        'matchType', m.match_type,
        'homeScore', p.predicted_home_score, 'awayScore', p.predicted_away_score,
        'extraTeam', CASE p.predicted_extra_team_provider_id
          WHEN m.home_team_provider_id THEN m.home_team_name
          WHEN m.away_team_provider_id THEN m.away_team_name END,
        'extraTeamId', p.predicted_extra_team_provider_id) AS item
      FROM matches m LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = NEW.user_id
      WHERE m.round_id = NEW.round_id ORDER BY m.kickoff_at, m.id
    )), '[]');
END;

CREATE TRIGGER history_prediction_insert AFTER INSERT ON predictions
WHEN (NEW.predicted_home_score IS NOT NULL OR NEW.predicted_away_score IS NOT NULL OR NEW.predicted_extra_team_provider_id IS NOT NULL)
AND EXISTS (SELECT 1 FROM round_submissions s JOIN matches m ON m.round_id = s.round_id
            WHERE m.id = NEW.match_id AND s.user_id = NEW.user_id)
BEGIN
  INSERT INTO prediction_history(round_id, user_id, event_type, actor_kind, before_json, after_json)
  SELECT m.round_id, NEW.user_id, 'change',
    CASE WHEN NEW.is_admin_override = 1 THEN 'admin' ELSE 'participant' END,
    NULL, json_object('matchId', m.id, 'homeName', m.home_team_name,
    'awayName', m.away_team_name, 'matchType', m.match_type,
    'homeScore', NEW.predicted_home_score, 'awayScore', NEW.predicted_away_score,
    'extraTeamId', NEW.predicted_extra_team_provider_id,
    'extraTeam', CASE NEW.predicted_extra_team_provider_id
       WHEN m.home_team_provider_id THEN m.home_team_name
       WHEN m.away_team_provider_id THEN m.away_team_name END)
  FROM matches m WHERE m.id = NEW.match_id;
END;

CREATE TRIGGER history_prediction_update AFTER UPDATE ON predictions
WHEN (OLD.predicted_home_score IS NOT NEW.predicted_home_score OR OLD.predicted_away_score IS NOT NEW.predicted_away_score OR OLD.predicted_extra_team_provider_id IS NOT NEW.predicted_extra_team_provider_id)
AND EXISTS (SELECT 1 FROM round_submissions s JOIN matches m ON m.round_id = s.round_id
            WHERE m.id = NEW.match_id AND s.user_id = NEW.user_id)
BEGIN
  INSERT INTO prediction_history(round_id, user_id, event_type, actor_kind, before_json, after_json)
  SELECT m.round_id, NEW.user_id, 'change',
    CASE WHEN NEW.is_admin_override = 1 THEN 'admin' ELSE 'participant' END,
    json_object('matchId', m.id, 'homeName', m.home_team_name,
    'awayName', m.away_team_name, 'matchType', m.match_type,
    'homeScore', OLD.predicted_home_score, 'awayScore', OLD.predicted_away_score,
    'extraTeamId', OLD.predicted_extra_team_provider_id,
    'extraTeam', CASE OLD.predicted_extra_team_provider_id
       WHEN m.home_team_provider_id THEN m.home_team_name
       WHEN m.away_team_provider_id THEN m.away_team_name END), json_object('matchId', m.id, 'homeName', m.home_team_name,
    'awayName', m.away_team_name, 'matchType', m.match_type,
    'homeScore', NEW.predicted_home_score, 'awayScore', NEW.predicted_away_score,
    'extraTeamId', NEW.predicted_extra_team_provider_id,
    'extraTeam', CASE NEW.predicted_extra_team_provider_id
       WHEN m.home_team_provider_id THEN m.home_team_name
       WHEN m.away_team_provider_id THEN m.away_team_name END)
  FROM matches m WHERE m.id = NEW.match_id;
END;
