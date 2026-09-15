CREATE TABLE IF NOT EXISTS game_records (
  student_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'default',
  value INTEGER NOT NULL DEFAULT 0,
  details_json TEXT NOT NULL DEFAULT '{}',
  achieved_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, game_id, metric, mode),
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_records_leaderboard
  ON game_records (game_id, metric, mode, value DESC);

CREATE INDEX IF NOT EXISTS idx_game_records_student
  ON game_records (student_id, game_id);
