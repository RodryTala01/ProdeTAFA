PRAGMA foreign_keys = ON;

ALTER TABLE rounds
ADD COLUMN category TEXT NOT NULL DEFAULT 'AMISTOSO'
CHECK (category IN ('LIGA', 'COPA', 'DESEMPATE', 'AMISTOSO'));

CREATE TABLE tafa_seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_number INTEGER NOT NULL UNIQUE CHECK (season_number > 0),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'finished', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  finished_at TEXT
);

CREATE UNIQUE INDEX idx_tafa_seasons_single_active
ON tafa_seasons(status)
WHERE status = 'active';

CREATE TABLE season_divisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  code TEXT NOT NULL CHECK (length(code) BETWEEN 1 AND 12),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (season_id, code),
  UNIQUE (id, season_id),
  FOREIGN KEY (season_id) REFERENCES tafa_seasons(id) ON DELETE CASCADE
);

CREATE INDEX idx_season_divisions_season
ON season_divisions(season_id, sort_order);

CREATE TABLE season_division_members (
  season_id INTEGER NOT NULL,
  division_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'admin'
    CHECK (source IN ('admin', 'promotion', 'relegation', 'cup', 'migration')),
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (season_id, user_id),
  FOREIGN KEY (division_id, season_id) REFERENCES season_divisions(id, season_id) ON DELETE CASCADE,
  FOREIGN KEY (season_id) REFERENCES tafa_seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_season_division_members_division
ON season_division_members(division_id, user_id);

CREATE TABLE competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  division_id INTEGER,
  code TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  family TEXT NOT NULL CHECK (family IN ('LEAGUE', 'CUP', 'PROMOTION')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'finished', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  settings_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  UNIQUE (season_id, code),
  UNIQUE (id, season_id),
  FOREIGN KEY (season_id) REFERENCES tafa_seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (division_id, season_id) REFERENCES season_divisions(id, season_id) ON DELETE SET NULL
);

CREATE INDEX idx_competitions_season
ON competitions(season_id, sort_order);

CREATE TABLE competition_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  stage_type TEXT NOT NULL CHECK (
    stage_type IN ('LEAGUE_TABLE', 'ACCUMULATIVE_GROUPS', 'ROUND_ROBIN_GROUPS', 'SURVIVAL_TABLE', 'KNOCKOUT')
  ),
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'finished', 'archived')),
  settings_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (competition_id, code),
  UNIQUE (competition_id, sequence),
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
);

CREATE INDEX idx_competition_stages_competition
ON competition_stages(competition_id, sequence);

CREATE TABLE competition_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'INDIVIDUAL'
    CHECK (entry_type IN ('INDIVIDUAL', 'DUO')),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'eliminated', 'qualified', 'withdrawn', 'finished')),
  seed_position INTEGER,
  source_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
);

CREATE INDEX idx_competition_entries_competition
ON competition_entries(competition_id, status);

CREATE TABLE competition_entry_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  valid_from_round_id INTEGER,
  valid_to_round_id INTEGER,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  left_at TEXT,
  FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (valid_from_round_id) REFERENCES rounds(id) ON DELETE SET NULL,
  FOREIGN KEY (valid_to_round_id) REFERENCES rounds(id) ON DELETE SET NULL
);

CREATE INDEX idx_competition_entry_members_entry
ON competition_entry_members(entry_id, user_id);
CREATE INDEX idx_competition_entry_members_user
ON competition_entry_members(user_id, entry_id);

CREATE TABLE competition_round_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  stage_id INTEGER NOT NULL,
  round_id INTEGER NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  purpose TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (purpose IN ('NORMAL', 'TIEBREAK')),
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (competition_id, stage_id, round_id, purpose),
  UNIQUE (stage_id, sequence, purpose),
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES competition_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
);

CREATE INDEX idx_competition_round_links_round
ON competition_round_links(round_id, competition_id);

CREATE TABLE competition_round_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_link_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (round_link_id, code),
  UNIQUE (round_link_id, sequence),
  FOREIGN KEY (round_link_id) REFERENCES competition_round_links(id) ON DELETE CASCADE
);

CREATE TABLE competition_round_segment_matches (
  segment_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  PRIMARY KEY (segment_id, match_id),
  UNIQUE (segment_id, sequence),
  FOREIGN KEY (segment_id) REFERENCES competition_round_segments(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE competition_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (stage_id, code),
  UNIQUE (stage_id, sequence),
  FOREIGN KEY (stage_id) REFERENCES competition_stages(id) ON DELETE CASCADE
);

CREATE TABLE competition_group_entries (
  group_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  seed_position INTEGER,
  PRIMARY KEY (group_id, entry_id),
  FOREIGN KEY (group_id) REFERENCES competition_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE
);

CREATE TABLE competition_encounters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  group_id INTEGER,
  round_link_id INTEGER,
  segment_id INTEGER,
  slot_key TEXT NOT NULL,
  entry_a_id INTEGER,
  entry_b_id INTEGER,
  score_a INTEGER,
  score_b INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'live', 'tied', 'finished', 'cancelled')),
  winner_entry_id INTEGER,
  resolution TEXT
    CHECK (resolution IS NULL OR resolution IN ('normal', 'bye', 'tiebreak', 'admin')),
  admin_confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (stage_id, slot_key),
  FOREIGN KEY (stage_id) REFERENCES competition_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES competition_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (round_link_id) REFERENCES competition_round_links(id) ON DELETE SET NULL,
  FOREIGN KEY (segment_id) REFERENCES competition_round_segments(id) ON DELETE SET NULL,
  FOREIGN KEY (entry_a_id) REFERENCES competition_entries(id) ON DELETE SET NULL,
  FOREIGN KEY (entry_b_id) REFERENCES competition_entries(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_entry_id) REFERENCES competition_entries(id) ON DELETE SET NULL
);

CREATE INDEX idx_competition_encounters_stage
ON competition_encounters(stage_id, status);

CREATE TABLE competition_entry_bonuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  stage_id INTEGER,
  round_link_id INTEGER,
  entry_id INTEGER NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES competition_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (round_link_id) REFERENCES competition_round_links(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_competition_entry_bonuses_target
ON competition_entry_bonuses(entry_id, round_link_id);

CREATE TABLE competition_tiebreaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  stage_id INTEGER,
  encounter_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'resolved', 'cancelled')),
  winner_entry_id INTEGER,
  resolution TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES competition_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (encounter_id) REFERENCES competition_encounters(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_entry_id) REFERENCES competition_entries(id) ON DELETE SET NULL
);

CREATE TABLE competition_tiebreak_entries (
  tiebreak_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  PRIMARY KEY (tiebreak_id, entry_id),
  FOREIGN KEY (tiebreak_id) REFERENCES competition_tiebreaks(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE
);

CREATE TABLE competition_tiebreak_rounds (
  tiebreak_id INTEGER NOT NULL,
  round_id INTEGER NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  PRIMARY KEY (tiebreak_id, round_id),
  UNIQUE (tiebreak_id, sequence),
  FOREIGN KEY (tiebreak_id) REFERENCES competition_tiebreaks(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
);

CREATE TABLE season_division_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  from_division_id INTEGER,
  to_division_id INTEGER,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'confirmed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  FOREIGN KEY (season_id) REFERENCES tafa_seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_division_id) REFERENCES season_divisions(id) ON DELETE SET NULL,
  FOREIGN KEY (to_division_id) REFERENCES season_divisions(id) ON DELETE SET NULL
);

CREATE INDEX idx_season_division_movements_season
ON season_division_movements(season_id, status);
