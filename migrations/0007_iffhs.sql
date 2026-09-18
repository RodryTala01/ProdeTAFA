PRAGMA foreign_keys = ON;

CREATE TABLE iffhs_season_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_number INTEGER NOT NULL CHECK (season_number > 0),
  user_id TEXT NOT NULL,
  competition_code TEXT NOT NULL,
  component_code TEXT NOT NULL,
  base_value_scaled INTEGER NOT NULL DEFAULT 0,
  multiplier_scaled INTEGER NOT NULL DEFAULT 100,
  points_scaled INTEGER NOT NULL,
  detail_json TEXT CHECK (detail_json IS NULL OR json_valid(detail_json)),
  source TEXT NOT NULL DEFAULT 'calculated'
    CHECK (source IN ('calculated', 'imported', 'manual_adjustment')),
  calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (season_number, user_id, competition_code, component_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_iffhs_components_season_user
ON iffhs_season_components(season_number, user_id);

CREATE TABLE iffhs_season_totals (
  season_number INTEGER NOT NULL CHECK (season_number > 0),
  user_id TEXT NOT NULL,
  total_points_scaled INTEGER NOT NULL CHECK (total_points_scaled >= 0),
  source TEXT NOT NULL DEFAULT 'calculated'
    CHECK (source IN ('calculated', 'imported')),
  calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (season_number, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_iffhs_totals_season_points
ON iffhs_season_totals(season_number, total_points_scaled DESC);
