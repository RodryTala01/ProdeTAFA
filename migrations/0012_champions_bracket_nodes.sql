PRAGMA foreign_keys = ON;

CREATE TABLE competition_champions_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  node_code TEXT NOT NULL,
  label TEXT NOT NULL,
  branch TEXT NOT NULL CHECK (branch IN ('UPPER', 'LOWER', 'FINAL')),
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  source_a_type TEXT NOT NULL CHECK (source_a_type IN ('SLOT', 'WINNER')),
  source_a_ref TEXT NOT NULL,
  source_b_type TEXT NOT NULL CHECK (source_b_type IN ('SLOT', 'WINNER')),
  source_b_ref TEXT NOT NULL,
  stage_id INTEGER,
  round_link_id INTEGER,
  encounter_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (competition_id, node_code),
  UNIQUE (competition_id, sequence),
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES competition_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (round_link_id) REFERENCES competition_round_links(id) ON DELETE SET NULL,
  FOREIGN KEY (encounter_id) REFERENCES competition_encounters(id) ON DELETE SET NULL
);

CREATE INDEX idx_competition_champions_nodes_competition
ON competition_champions_nodes(competition_id, sequence);
