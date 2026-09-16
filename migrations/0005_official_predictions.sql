-- Official state is separate from autosaved drafts. Keep migration 0004 and its
-- existing events intact as legacy evidence, but retire its draft-write triggers.
DROP TRIGGER history_prediction_insert;
DROP TRIGGER history_prediction_update;
DROP TRIGGER history_submission_insert;
DROP TRIGGER history_submission_update;

CREATE TABLE official_predictions (
  id INTEGER PRIMARY KEY REFERENCES predictions(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  match_id INTEGER NOT NULL REFERENCES matches(id),
  predicted_home_score INTEGER NOT NULL CHECK(predicted_home_score BETWEEN 0 AND 99),
  predicted_away_score INTEGER NOT NULL CHECK(predicted_away_score BETWEEN 0 AND 99),
  predicted_extra_team_provider_id TEXT,
  is_admin_override INTEGER NOT NULL DEFAULT 0 CHECK(is_admin_override IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('submission','admin','legacy_baseline')),
  UNIQUE(user_id, match_id)
);
CREATE INDEX idx_official_match ON official_predictions(match_id);

-- Recover the latest submitted snapshot where one exists, NOT later draft changes.
-- For pre-audit installations only, preserve the former scoring baseline and mark
-- it explicitly as legacy_baseline; no fabricated historical events are created.
INSERT INTO official_predictions
  (id,user_id,match_id,predicted_home_score,predicted_away_score,
   predicted_extra_team_provider_id,is_admin_override,updated_at,source)
SELECT p.id,p.user_id,p.match_id,
  CASE WHEN h.id IS NULL OR p.is_admin_override=1 THEN p.predicted_home_score ELSE json_extract(j.value,'$.homeScore') END,
  CASE WHEN h.id IS NULL OR p.is_admin_override=1 THEN p.predicted_away_score ELSE json_extract(j.value,'$.awayScore') END,
  CASE WHEN h.id IS NULL OR p.is_admin_override=1 THEN p.predicted_extra_team_provider_id ELSE json_extract(j.value,'$.extraTeamId') END,
  p.is_admin_override, COALESCE(h.created_at,rs.last_submitted_at), 'legacy_baseline'
FROM predictions p JOIN matches m ON m.id=p.match_id
JOIN round_submissions rs ON rs.round_id=m.round_id AND rs.user_id=p.user_id
LEFT JOIN prediction_history h ON h.id=(
  SELECT MAX(h2.id) FROM prediction_history h2 WHERE h2.round_id=m.round_id
    AND h2.user_id=p.user_id AND h2.event_type IN ('first_submit','resubmit'))
LEFT JOIN json_each(COALESCE(h.after_json,'[]')) j ON json_extract(j.value,'$.matchId')=p.match_id
WHERE CASE WHEN h.id IS NULL OR p.is_admin_override=1 THEN p.predicted_home_score ELSE json_extract(j.value,'$.homeScore') END IS NOT NULL
  AND CASE WHEN h.id IS NULL OR p.is_admin_override=1 THEN p.predicted_away_score ELSE json_extract(j.value,'$.awayScore') END IS NOT NULL;

-- Discard only derived scores without a matching official input; never keep stale
-- draft-based scores. Normal result recalculation can regenerate them.
DELETE FROM prediction_scores WHERE prediction_id NOT IN (
 SELECT o.id FROM official_predictions o JOIN predictions p ON p.id=o.id
 WHERE o.predicted_home_score IS p.predicted_home_score
 AND o.predicted_away_score IS p.predicted_away_score
 AND o.predicted_extra_team_provider_id IS p.predicted_extra_team_provider_id);

CREATE TABLE prediction_submission_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL REFERENCES rounds(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  match_id INTEGER REFERENCES matches(id),
  event_type TEXT NOT NULL CHECK(event_type IN ('FIRST_SUBMISSION','PREDICTION_CHANGE','RESUBMISSION')),
  actor_kind TEXT NOT NULL CHECK(actor_kind IN ('participant','admin')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  fields_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(fields_json)),
  before_json TEXT CHECK(before_json IS NULL OR json_valid(before_json)),
  after_json TEXT NOT NULL CHECK(json_valid(after_json))
);
CREATE INDEX idx_official_events ON prediction_submission_events(round_id,user_id,id DESC);
-- Only actual submission snapshots from 0004 are official evidence. Never copy
-- its 'change' autosave events into the new official timeline.
INSERT INTO prediction_submission_events(round_id,user_id,event_type,actor_kind,created_at,after_json)
SELECT round_id,user_id,CASE event_type WHEN 'first_submit' THEN 'FIRST_SUBMISSION' ELSE 'RESUBMISSION' END,
  actor_kind,created_at,after_json FROM prediction_history
WHERE event_type IN ('first_submit','resubmit') ORDER BY id;
CREATE TRIGGER official_events_no_update BEFORE UPDATE ON prediction_submission_events
BEGIN SELECT RAISE(ABORT,'Official history is append-only'); END;
CREATE TRIGGER official_events_no_delete BEFORE DELETE ON prediction_submission_events
BEGIN SELECT RAISE(ABORT,'Official history is append-only'); END;

-- Validate again INSIDE the submission write, avoiding a race with autosave,
-- match rescheduling, or the administrator closing the round.

CREATE TRIGGER validate_official_submission_insert BEFORE INSERT ON round_submissions
BEGIN 
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM rounds WHERE id=NEW.round_id AND status='open')
    THEN RAISE(ABORT,'La fecha no está abierta') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM matches WHERE round_id=NEW.round_id AND julianday(kickoff_at)+1.0/1440 > julianday('now'))
    THEN RAISE(ABORT,'No quedan partidos abiertos para enviar') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM matches m LEFT JOIN predictions p ON p.match_id=m.id AND p.user_id=NEW.user_id
    WHERE m.round_id=NEW.round_id AND julianday(m.kickoff_at)+1.0/1440 > julianday('now')
      AND (p.predicted_home_score IS NULL OR p.predicted_away_score IS NULL
        OR (m.match_type='PENALTIES_ONLY' AND (p.predicted_extra_team_provider_id IS NULL
          OR p.predicted_extra_team_provider_id NOT IN (m.home_team_provider_id,m.away_team_provider_id)))))
    THEN RAISE(ABORT,'Faltan completar partidos todavía abiertos') END;
 END;
CREATE TRIGGER promote_official_submission_insert AFTER INSERT ON round_submissions
BEGIN
  INSERT INTO official_predictions
    (id,user_id,match_id,predicted_home_score,predicted_away_score,predicted_extra_team_provider_id,updated_at,source)
  SELECT p.id,p.user_id,p.match_id,p.predicted_home_score,p.predicted_away_score,
    CASE WHEN m.match_type='PENALTIES_ONLY' THEN p.predicted_extra_team_provider_id ELSE NULL END,
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),'submission'
  FROM predictions p JOIN matches m ON m.id=p.match_id
  WHERE p.user_id=NEW.user_id AND m.round_id=NEW.round_id
    AND julianday(m.kickoff_at)+1.0/1440 > julianday('now')
  ON CONFLICT(id) DO UPDATE SET
    predicted_home_score=excluded.predicted_home_score,
    predicted_away_score=excluded.predicted_away_score,
    predicted_extra_team_provider_id=excluded.predicted_extra_team_provider_id,
    is_admin_override=0, source='submission', updated_at=excluded.updated_at,
    version=official_predictions.version+1
  WHERE official_predictions.predicted_home_score IS NOT excluded.predicted_home_score
     OR official_predictions.predicted_away_score IS NOT excluded.predicted_away_score
     OR official_predictions.predicted_extra_team_provider_id IS NOT excluded.predicted_extra_team_provider_id;
  INSERT INTO prediction_submission_events(round_id,user_id,event_type,actor_kind,after_json)
  SELECT NEW.round_id,NEW.user_id,'FIRST_SUBMISSION','participant',
    (SELECT json_group_array(json(item)) FROM (
      SELECT json_object('matchId',m.id,'homeName',m.home_team_name,'awayName',m.away_team_name,
 'matchType',m.match_type,'homeScore',p.predicted_home_score,'awayScore',p.predicted_away_score,
 'extraTeamId',p.predicted_extra_team_provider_id,
 'extraTeam',CASE p.predicted_extra_team_provider_id
 WHEN m.home_team_provider_id THEN m.home_team_name WHEN m.away_team_provider_id THEN m.away_team_name END) AS item
      FROM matches m LEFT JOIN official_predictions p ON p.match_id=m.id AND p.user_id=NEW.user_id
      WHERE m.round_id=NEW.round_id ORDER BY m.kickoff_at,m.id));
END;

CREATE TRIGGER validate_official_submission_update BEFORE UPDATE ON round_submissions
BEGIN 
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM rounds WHERE id=NEW.round_id AND status='open')
    THEN RAISE(ABORT,'La fecha no está abierta') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM matches WHERE round_id=NEW.round_id AND julianday(kickoff_at)+1.0/1440 > julianday('now'))
    THEN RAISE(ABORT,'No quedan partidos abiertos para enviar') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM matches m LEFT JOIN predictions p ON p.match_id=m.id AND p.user_id=NEW.user_id
    WHERE m.round_id=NEW.round_id AND julianday(m.kickoff_at)+1.0/1440 > julianday('now')
      AND (p.predicted_home_score IS NULL OR p.predicted_away_score IS NULL
        OR (m.match_type='PENALTIES_ONLY' AND (p.predicted_extra_team_provider_id IS NULL
          OR p.predicted_extra_team_provider_id NOT IN (m.home_team_provider_id,m.away_team_provider_id)))))
    THEN RAISE(ABORT,'Faltan completar partidos todavía abiertos') END;
 END;
CREATE TRIGGER promote_official_submission_update AFTER UPDATE ON round_submissions
BEGIN
  INSERT INTO official_predictions
    (id,user_id,match_id,predicted_home_score,predicted_away_score,predicted_extra_team_provider_id,updated_at,source)
  SELECT p.id,p.user_id,p.match_id,p.predicted_home_score,p.predicted_away_score,
    CASE WHEN m.match_type='PENALTIES_ONLY' THEN p.predicted_extra_team_provider_id ELSE NULL END,
    strftime('%Y-%m-%dT%H:%M:%fZ','now'),'submission'
  FROM predictions p JOIN matches m ON m.id=p.match_id
  WHERE p.user_id=NEW.user_id AND m.round_id=NEW.round_id
    AND julianday(m.kickoff_at)+1.0/1440 > julianday('now')
  ON CONFLICT(id) DO UPDATE SET
    predicted_home_score=excluded.predicted_home_score,
    predicted_away_score=excluded.predicted_away_score,
    predicted_extra_team_provider_id=excluded.predicted_extra_team_provider_id,
    is_admin_override=0, source='submission', updated_at=excluded.updated_at,
    version=official_predictions.version+1
  WHERE official_predictions.predicted_home_score IS NOT excluded.predicted_home_score
     OR official_predictions.predicted_away_score IS NOT excluded.predicted_away_score
     OR official_predictions.predicted_extra_team_provider_id IS NOT excluded.predicted_extra_team_provider_id;
  INSERT INTO prediction_submission_events(round_id,user_id,event_type,actor_kind,after_json)
  SELECT NEW.round_id,NEW.user_id,'RESUBMISSION','participant',
    (SELECT json_group_array(json(item)) FROM (
      SELECT json_object('matchId',m.id,'homeName',m.home_team_name,'awayName',m.away_team_name,
 'matchType',m.match_type,'homeScore',p.predicted_home_score,'awayScore',p.predicted_away_score,
 'extraTeamId',p.predicted_extra_team_provider_id,
 'extraTeam',CASE p.predicted_extra_team_provider_id
 WHEN m.home_team_provider_id THEN m.home_team_name WHEN m.away_team_provider_id THEN m.away_team_name END) AS item
      FROM matches m LEFT JOIN official_predictions p ON p.match_id=m.id AND p.user_id=NEW.user_id
      WHERE m.round_id=NEW.round_id ORDER BY m.kickoff_at,m.id));
END;

CREATE TRIGGER audit_official_insert AFTER INSERT ON official_predictions
WHEN (NEW.source='admin' OR EXISTS (SELECT 1 FROM round_submissions s JOIN matches m ON m.round_id=s.round_id
 WHERE m.id=NEW.match_id AND s.user_id=NEW.user_id AND s.submission_count>1))
 
BEGIN
 INSERT INTO prediction_submission_events(round_id,user_id,match_id,event_type,actor_kind,fields_json,before_json,after_json)
 SELECT m.round_id,NEW.user_id,m.id,'PREDICTION_CHANGE',
   CASE WHEN NEW.source='admin' THEN 'admin' ELSE 'participant' END,
   '["homeScore","awayScore","extraTeamId"]',
   NULL,json_object('matchId',m.id,'homeName',m.home_team_name,'awayName',m.away_team_name,
 'matchType',m.match_type,'homeScore',NEW.predicted_home_score,'awayScore',NEW.predicted_away_score,
 'extraTeamId',NEW.predicted_extra_team_provider_id,
 'extraTeam',CASE NEW.predicted_extra_team_provider_id
 WHEN m.home_team_provider_id THEN m.home_team_name WHEN m.away_team_provider_id THEN m.away_team_name END)
 FROM matches m WHERE m.id=NEW.match_id;
END;
CREATE TRIGGER invalidate_official_score_insert AFTER INSERT ON official_predictions
BEGIN DELETE FROM prediction_scores WHERE prediction_id=NEW.id; END;

CREATE TRIGGER audit_official_update AFTER UPDATE ON official_predictions
WHEN (NEW.source='admin' OR EXISTS (SELECT 1 FROM round_submissions s JOIN matches m ON m.round_id=s.round_id
 WHERE m.id=NEW.match_id AND s.user_id=NEW.user_id AND s.submission_count>1))
 AND (OLD.predicted_home_score IS NOT NEW.predicted_home_score
 OR OLD.predicted_away_score IS NOT NEW.predicted_away_score
 OR OLD.predicted_extra_team_provider_id IS NOT NEW.predicted_extra_team_provider_id)
BEGIN
 INSERT INTO prediction_submission_events(round_id,user_id,match_id,event_type,actor_kind,fields_json,before_json,after_json)
 SELECT m.round_id,NEW.user_id,m.id,'PREDICTION_CHANGE',
   CASE WHEN NEW.source='admin' THEN 'admin' ELSE 'participant' END,
   (SELECT json_group_array(field) FROM (
     SELECT 'homeScore' AS field WHERE OLD.predicted_home_score IS NOT NEW.predicted_home_score
     UNION ALL SELECT 'awayScore' WHERE OLD.predicted_away_score IS NOT NEW.predicted_away_score
     UNION ALL SELECT 'extraTeamId' WHERE OLD.predicted_extra_team_provider_id IS NOT NEW.predicted_extra_team_provider_id)),
   json_object('matchId',m.id,'homeName',m.home_team_name,'awayName',m.away_team_name,
 'matchType',m.match_type,'homeScore',OLD.predicted_home_score,'awayScore',OLD.predicted_away_score,
 'extraTeamId',OLD.predicted_extra_team_provider_id,
 'extraTeam',CASE OLD.predicted_extra_team_provider_id
 WHEN m.home_team_provider_id THEN m.home_team_name WHEN m.away_team_provider_id THEN m.away_team_name END),json_object('matchId',m.id,'homeName',m.home_team_name,'awayName',m.away_team_name,
 'matchType',m.match_type,'homeScore',NEW.predicted_home_score,'awayScore',NEW.predicted_away_score,
 'extraTeamId',NEW.predicted_extra_team_provider_id,
 'extraTeam',CASE NEW.predicted_extra_team_provider_id
 WHEN m.home_team_provider_id THEN m.home_team_name WHEN m.away_team_provider_id THEN m.away_team_name END)
 FROM matches m WHERE m.id=NEW.match_id;
END;
CREATE TRIGGER invalidate_official_score_update AFTER UPDATE ON official_predictions
BEGIN DELETE FROM prediction_scores WHERE prediction_id=NEW.id; END;
