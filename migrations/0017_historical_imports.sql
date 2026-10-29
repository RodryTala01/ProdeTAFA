-- Immutable historical import payloads with reversible activation.
-- No updates to official predictions, competitions, scores, or IFFHS totals.
CREATE TABLE historical_imports (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 season_number INTEGER NOT NULL CHECK (season_number > 0),
 season_name TEXT NOT NULL CHECK (length(season_name) BETWEEN 1 AND 120),
 source_name TEXT NOT NULL CHECK (length(source_name) BETWEEN 1 AND 180),
 source_sha256 TEXT NOT NULL CHECK (length(source_sha256)=64),
 payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
 counts_json TEXT NOT NULL CHECK (json_valid(counts_json)),
 status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','reverted')),
 created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 reverted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 reverted_at TEXT,
 revert_reason TEXT,
 CHECK ((status='active' AND reverted_at IS NULL) OR (status='reverted' AND reverted_at IS NOT NULL))
);
-- A season can be loaded in independent, reversible batches (table today,
-- titles tomorrow). The API checks collisions at the individual record level.
CREATE INDEX idx_historical_imports_active_season
 ON historical_imports(season_number,status);
CREATE INDEX idx_historical_imports_history
 ON historical_imports(season_number,created_at DESC);
