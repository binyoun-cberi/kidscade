-- Anonymous, per-session event IDs prevent a play from being counted twice
-- when the browser retries a request or sends an unload beacon.
-- No user, device, account, or network identifier is recorded here.
CREATE TABLE IF NOT EXISTS game_play_events (
  event_id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  counted INTEGER NOT NULL DEFAULT 0 CHECK (counted IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_play_events_created
  ON game_play_events (created_at);
