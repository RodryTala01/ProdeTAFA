PRAGMA foreign_keys = ON;

CREATE TABLE competition_qualification_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  slot_code TEXT NOT NULL,
  slot_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_json TEXT CHECK (source_json IS NULL OR json_valid(source_json)),
  proposed_user_id TEXT,
  confirmed_user_id TEXT,
  confirmed_entry_id INTEGER,
  status TEXT NOT NULL DEFAULT 'vacant'
    CHECK (status IN ('vacant', 'proposed', 'confirmed', 'replaced')),
  replacement_reason TEXT,
  confirmed_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (competition_id, slot_code),
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  FOREIGN KEY (proposed_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (confirmed_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (confirmed_entry_id) REFERENCES competition_entries(id) ON DELETE SET NULL,
  FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_competition_qualification_slots_competition
ON competition_qualification_slots(competition_id, status);
