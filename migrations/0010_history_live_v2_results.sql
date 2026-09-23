CREATE TABLE IF NOT EXISTS history_live_v2_results (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  results_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
