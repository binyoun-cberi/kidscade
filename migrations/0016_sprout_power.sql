CREATE TABLE IF NOT EXISTS student_sprout_weekly (
  student_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  earned_power INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, week_key),
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_sprout_weekly_week
  ON student_sprout_weekly (week_key, earned_power DESC);
