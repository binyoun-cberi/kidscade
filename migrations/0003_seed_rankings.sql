CREATE TABLE IF NOT EXISTS student_seed_weekly (
  student_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  earned_seeds INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, week_key),
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_seed_weekly_week
  ON student_seed_weekly (week_key, earned_seeds DESC);
