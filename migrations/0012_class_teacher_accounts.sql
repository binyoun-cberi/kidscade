CREATE TABLE IF NOT EXISTS class_teacher_accounts (
  class_id TEXT PRIMARY KEY,
  login_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_ciphertext TEXT NOT NULL,
  password_iv TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_class_teacher_accounts_login
  ON class_teacher_accounts (login_id);

CREATE TABLE IF NOT EXISTS class_teacher_sessions (
  token_hash TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_class_teacher_sessions_class
  ON class_teacher_sessions (class_id);

CREATE INDEX IF NOT EXISTS idx_class_teacher_sessions_expiry
  ON class_teacher_sessions (expires_at);
