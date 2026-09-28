PRAGMA foreign_keys = ON;

CREATE TABLE competition_survival_round_settings (
  round_link_id INTEGER PRIMARY KEY,
  stage_id INTEGER NOT NULL,
  eliminate_count INTEGER NOT NULL DEFAULT 0 CHECK (eliminate_count >= 0),
  bonus_by_position_json TEXT NOT NULL DEFAULT '{}',
  updated_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (round_link_id) REFERENCES competition_round_links(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES competition_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE competition_survival_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  round_link_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  base_points INTEGER NOT NULL DEFAULT 0,
  bonus_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL CHECK (position > 0),
  decision TEXT NOT NULL CHECK (decision IN ('ACTIVE', 'ELIMINATED', 'QUALIFIED', 'TIE_PENDING')),
  next_bonus_points INTEGER NOT NULL DEFAULT 0,
  confirmed_by_user_id TEXT NOT NULL,
  confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (round_link_id, entry_id),
  FOREIGN KEY (stage_id) REFERENCES competition_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (round_link_id) REFERENCES competition_round_links(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_competition_survival_results_stage
ON competition_survival_results(stage_id, round_link_id, position);

CREATE INDEX idx_competition_survival_results_entry
ON competition_survival_results(entry_id, round_link_id);
