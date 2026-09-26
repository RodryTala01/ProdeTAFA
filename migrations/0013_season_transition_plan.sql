PRAGMA foreign_keys = ON;

CREATE TABLE season_transition_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_season_id INTEGER NOT NULL UNIQUE,
  target_season_number INTEGER NOT NULL UNIQUE CHECK (target_season_number > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'applied', 'cancelled')),
  issues_json TEXT CHECK (issues_json IS NULL OR json_valid(issues_json)),
  created_by_user_id TEXT NOT NULL,
  confirmed_by_user_id TEXT,
  applied_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  applied_at TEXT,
  FOREIGN KEY (source_season_id) REFERENCES tafa_seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (applied_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE season_transition_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  from_division_code TEXT NOT NULL CHECK (from_division_code IN ('A', 'B')),
  proposed_division_code TEXT NOT NULL CHECK (proposed_division_code IN ('A', 'B')),
  confirmed_division_code TEXT CHECK (confirmed_division_code IS NULL OR confirmed_division_code IN ('A', 'B')),
  proposal_source TEXT NOT NULL,
  proposal_reason TEXT,
  requires_review INTEGER NOT NULL DEFAULT 0 CHECK (requires_review IN (0, 1)),
  confirmation_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (plan_id, user_id),
  FOREIGN KEY (plan_id) REFERENCES season_transition_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_season_transition_assignments_plan
ON season_transition_assignments(plan_id, proposed_division_code, confirmed_division_code);
