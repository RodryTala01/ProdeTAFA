PRAGMA foreign_keys = ON;

CREATE TABLE league_seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'finished')) DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE TABLE league_rounds (
  season_id INTEGER NOT NULL,
  round_id INTEGER NOT NULL UNIQUE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (season_id, round_id),
  UNIQUE (season_id, slot_number),
  FOREIGN KEY (season_id) REFERENCES league_seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
);

CREATE INDEX idx_league_rounds_season ON league_rounds(season_id);

CREATE TABLE league_participants (
  season_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (season_id, user_id),
  FOREIGN KEY (season_id) REFERENCES league_seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_league_participants_user ON league_participants(user_id);
