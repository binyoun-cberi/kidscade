CREATE TABLE IF NOT EXISTS kidscade_classes (
  id TEXT PRIMARY KEY,
  class_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_accounts (
  id TEXT PRIMARY KEY,
  login_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
  class_id TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '새싹 게이머',
  pin_hash TEXT NOT NULL,
  state_json TEXT NOT NULL DEFAULT '{}',
  state_revision INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id)
);

CREATE INDEX IF NOT EXISTS idx_student_accounts_class
  ON student_accounts (class_id, login_id);

CREATE TABLE IF NOT EXISTS student_sessions (
  token_hash TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_student
  ON student_sessions (student_id);

CREATE INDEX IF NOT EXISTS idx_student_sessions_expiry
  ON student_sessions (expires_at);
