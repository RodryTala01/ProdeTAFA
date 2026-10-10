-- Provider data only. No links, triggers or writes to sporting tables.
CREATE TABLE promiedos_cache (
  kind TEXT NOT NULL CHECK (kind IN ('day', 'game')),
  cache_key TEXT NOT NULL,
  payload_json TEXT CHECK (payload_json IS NULL OR json_valid(payload_json)),
  fetched_at TEXT,
  expires_at TEXT,
  requested_at TEXT,
  PRIMARY KEY (kind, cache_key),
  CHECK ((payload_json IS NULL AND fetched_at IS NULL AND expires_at IS NULL)
    OR (payload_json IS NOT NULL AND fetched_at IS NOT NULL AND expires_at IS NOT NULL))
);
CREATE INDEX promiedos_cache_requested ON promiedos_cache(requested_at);
