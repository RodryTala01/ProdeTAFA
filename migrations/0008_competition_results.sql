PRAGMA foreign_keys = ON;

CREATE TABLE competition_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  stage_id INTEGER,
  result_code TEXT NOT NULL,
  final_position INTEGER CHECK (final_position IS NULL OR final_position > 0),
  detail_json TEXT CHECK (detail_json IS NULL OR json_valid(detail_json)),
  confirmed_by_user_id TEXT,
  confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (competition_id, entry_id),
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES competition_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_competition_results_competition
ON competition_results(competition_id, result_code, final_position);
