-- Classroom economy for existing Kidscade student accounts.
-- Student identity and authentication stay in student_accounts / student_sessions.

CREATE TABLE IF NOT EXISTS economy_class_settings (
  class_id TEXT PRIMARY KEY,
  currency TEXT NOT NULL DEFAULT '뚝',
  opening_balance INTEGER NOT NULL DEFAULT 100,
  income_tax_rate INTEGER NOT NULL DEFAULT 10,
  consumption_tax_rate INTEGER NOT NULL DEFAULT 10,
  savings_interest_rate INTEGER NOT NULL DEFAULT 1,
  fine_cap_percent INTEGER NOT NULL DEFAULT 30,
  payday_label TEXT NOT NULL DEFAULT '금요일',
  treasury_balance INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS economy_accounts (
  student_id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  savings_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_accounts_class ON economy_accounts (class_id, student_id);

CREATE TABLE IF NOT EXISTS economy_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id TEXT NOT NULL,
  student_id TEXT,
  type TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER,
  savings_after INTEGER,
  treasury_after INTEGER,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_economy_tx_class_date ON economy_transactions (class_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_economy_tx_student_date ON economy_transactions (student_id, id DESC);

CREATE TABLE IF NOT EXISTS economy_certificates (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_cert_class ON economy_certificates (class_id, created_at);

CREATE TABLE IF NOT EXISTS economy_student_certificates (
  student_id TEXT NOT NULL,
  certificate_id TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  PRIMARY KEY (student_id, certificate_id),
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (certificate_id) REFERENCES economy_certificates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS economy_jobs (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  salary INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 1,
  task TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_jobs_class ON economy_jobs (class_id, active, created_at);

CREATE TABLE IF NOT EXISTS economy_job_certificates (
  job_id TEXT NOT NULL,
  certificate_id TEXT NOT NULL,
  PRIMARY KEY (job_id, certificate_id),
  FOREIGN KEY (job_id) REFERENCES economy_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (certificate_id) REFERENCES economy_certificates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS economy_job_applications (
  job_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  PRIMARY KEY (job_id, student_id),
  FOREIGN KEY (job_id) REFERENCES economy_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS economy_job_assignments (
  student_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES economy_jobs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_job_assignments_job ON economy_job_assignments (job_id, student_id);

CREATE TABLE IF NOT EXISTS economy_items (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_items_class ON economy_items (class_id, active, created_at);

CREATE TABLE IF NOT EXISTS economy_payroll_runs (
  class_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  gross_total INTEGER NOT NULL DEFAULT 0,
  tax_total INTEGER NOT NULL DEFAULT 0,
  interest_total INTEGER NOT NULL DEFAULT 0,
  paid_students INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (class_id, period_id),
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS economy_laws (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_fine INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_laws_class ON economy_laws (class_id, active, effective_from);

CREATE TABLE IF NOT EXISTS economy_cases (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  law_id TEXT NOT NULL,
  proposed_fine INTEGER NOT NULL DEFAULT 0,
  applied_fine INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  appeal_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  decided_at TEXT,
  appealed_at TEXT,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (law_id) REFERENCES economy_laws(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_cases_class ON economy_cases (class_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_cases_student ON economy_cases (student_id, created_at DESC);
