-- Classroom economy v4: job capabilities and student job desks.

ALTER TABLE economy_work_logs ADD COLUMN activity_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE economy_work_logs ADD COLUMN activity_summary TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS economy_job_capabilities (
  job_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'execute',
  limit_value INTEGER,
  created_at TEXT NOT NULL,
  PRIMARY KEY (job_id, capability),
  FOREIGN KEY (job_id) REFERENCES economy_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_job_capabilities_class
  ON economy_job_capabilities (class_id, capability, job_id);

CREATE TABLE IF NOT EXISTS economy_clean_plate_records (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  recorder_student_id TEXT NOT NULL,
  target_student_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  result TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (class_id, target_student_id, record_date),
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (recorder_student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (target_student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_clean_plate_class_date
  ON economy_clean_plate_records (class_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_economy_clean_plate_recorder
  ON economy_clean_plate_records (recorder_student_id, record_date DESC);

CREATE TABLE IF NOT EXISTS economy_credit_book_records (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  recorder_student_id TEXT NOT NULL,
  target_student_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  result TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  suggested_delta INTEGER NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  teacher_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (recorder_student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (target_student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_credit_book_class
  ON economy_credit_book_records (class_id, review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_credit_book_target
  ON economy_credit_book_records (target_student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_credit_book_recorder
  ON economy_credit_book_records (recorder_student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS economy_job_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  action_label TEXT NOT NULL,
  target_student_id TEXT,
  source_id TEXT,
  period_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES economy_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (target_student_id) REFERENCES student_accounts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_economy_job_activity_student_period
  ON economy_job_activity (student_id, period_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_economy_job_activity_class
  ON economy_job_activity (class_id, id DESC);
