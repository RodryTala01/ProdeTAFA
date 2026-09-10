PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'participant')) DEFAULT 'participant',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'finished')) DEFAULT 'draft',
  published_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_fixture_id TEXT NOT NULL,
  competition_name TEXT,
  competition_logo_url TEXT,
  home_team_provider_id TEXT,
  home_team_name TEXT NOT NULL,
  home_team_logo_url TEXT,
  away_team_provider_id TEXT,
  away_team_name TEXT NOT NULL,
  away_team_logo_url TEXT,
  kickoff_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  elapsed_minutes INTEGER,
  match_type TEXT NOT NULL CHECK (match_type IN ('NORMAL', 'PENALTIES_ONLY')) DEFAULT 'NORMAL',
  home_score_current INTEGER,
  away_score_current INTEGER,
  home_score_regulation INTEGER,
  away_score_regulation INTEGER,
  winning_team_provider_id TEXT,
  qualified_team_provider_id TEXT,
  went_to_extra_time INTEGER NOT NULL DEFAULT 0 CHECK (went_to_extra_time IN (0, 1)),
  went_to_penalties INTEGER NOT NULL DEFAULT 0 CHECK (went_to_penalties IN (0, 1)),
  is_void INTEGER NOT NULL DEFAULT 0 CHECK (is_void IN (0, 1)),
  result_finalized_at TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  UNIQUE (round_id, provider, provider_fixture_id)
);

CREATE INDEX idx_matches_round_id ON matches(round_id);
CREATE INDEX idx_matches_kickoff_at ON matches(kickoff_at);
CREATE INDEX idx_matches_status ON matches(status);

CREATE TABLE predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  match_id INTEGER NOT NULL,
  predicted_home_score INTEGER CHECK (predicted_home_score IS NULL OR predicted_home_score >= 0),
  predicted_away_score INTEGER CHECK (predicted_away_score IS NULL OR predicted_away_score >= 0),
  predicted_extra_team_provider_id TEXT,
  is_admin_override INTEGER NOT NULL DEFAULT 0 CHECK (is_admin_override IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  UNIQUE (user_id, match_id)
);

CREATE INDEX idx_predictions_user_id ON predictions(user_id);
CREATE INDEX idx_predictions_match_id ON predictions(match_id);

CREATE TABLE round_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  first_submitted_at TEXT NOT NULL,
  last_submitted_at TEXT NOT NULL,
  submission_count INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (round_id, user_id)
);

CREATE TABLE prediction_scores (
  prediction_id INTEGER PRIMARY KEY,
  result_type TEXT NOT NULL CHECK (result_type IN ('FULL', 'PARTIAL', 'ERROR', 'PENALTIES', 'VOID')),
  base_points INTEGER NOT NULL DEFAULT 0,
  extra_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  is_provisional INTEGER NOT NULL DEFAULT 0 CHECK (is_provisional IN (0, 1)),
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
