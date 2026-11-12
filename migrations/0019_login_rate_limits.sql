-- Defensive, short-lived limits for bad login attempts. No personal identifiers
-- are stored: each subject_key is a SHA-256 digest.
CREATE TABLE login_attempts (
  subject_key TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK(failed_attempts >= 0),
  window_started_at INTEGER NOT NULL,
  last_failed_at INTEGER NOT NULL
);
CREATE INDEX idx_login_attempts_last_failed ON login_attempts(last_failed_at);
