PRAGMA foreign_keys = ON;

CREATE TABLE competition_stage_qualifiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_stage_id INTEGER NOT NULL,
  target_stage_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  source_group_id INTEGER,
  qualification_type TEXT NOT NULL
    CHECK (qualification_type IN ('DIRECT', 'WILDCARD', 'MANUAL')),
  source_position INTEGER,
  ranking_order INTEGER,
  reason_json TEXT,
  confirmed_by_user_id TEXT NOT NULL,
  confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (target_stage_id, entry_id),
  FOREIGN KEY (source_stage_id) REFERENCES competition_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (target_stage_id) REFERENCES competition_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (source_group_id) REFERENCES competition_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_competition_stage_qualifiers_source
ON competition_stage_qualifiers(source_stage_id, target_stage_id, qualification_type);

CREATE INDEX idx_competition_stage_qualifiers_target
ON competition_stage_qualifiers(target_stage_id, ranking_order, entry_id);
