-- Team identity is public; only TAFA administrators may change it.
-- Historical predictions, membership and competition data remain untouched.
CREATE TABLE IF NOT EXISTS team_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  shield_url TEXT,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
