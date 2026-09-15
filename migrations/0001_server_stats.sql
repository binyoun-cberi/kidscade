-- Kidscade anonymous usage counters.
-- No IP address, name, school, account identifier, or user agent is stored.

CREATE TABLE IF NOT EXISTS site_counters (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_visitors INTEGER NOT NULL DEFAULT 0,
  current_week_key TEXT NOT NULL DEFAULT '',
  current_week_visitors INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_counters (id) VALUES (1);

CREATE TABLE IF NOT EXISTS visitor_registry (
  visitor_hash TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_week_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_counters (
  game_id TEXT PRIMARY KEY,
  total_plays INTEGER NOT NULL DEFAULT 0,
  current_week_key TEXT NOT NULL DEFAULT '',
  current_week_plays INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_counters_week
  ON game_counters (current_week_key, current_week_plays DESC);
