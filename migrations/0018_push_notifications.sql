-- Web Push subscriptions and idempotent delivery journal. No changes to sports data.
CREATE TABLE push_config (
 id INTEGER PRIMARY KEY CHECK(id=1),
 public_key TEXT NOT NULL
);
CREATE TABLE push_subscriptions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 endpoint TEXT NOT NULL UNIQUE,
 p256dh TEXT NOT NULL,
 auth TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE TABLE push_deliveries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 subscription_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
 event_key TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','sent','failed')) DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 1,
 attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
 sent_at TEXT,
 UNIQUE(subscription_id,event_key)
);
CREATE INDEX idx_push_deliveries_event ON push_deliveries(event_key,status);
