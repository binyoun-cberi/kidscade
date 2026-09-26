-- Classroom economy v3: work logs, credit/loans, inventory, companies,
-- government debt, payslips, public spending and duplicate-request protection.

ALTER TABLE economy_class_settings ADD COLUMN loan_interest_rate INTEGER NOT NULL DEFAULT 5;
ALTER TABLE economy_class_settings ADD COLUMN government_debt_balance INTEGER NOT NULL DEFAULT 0;

ALTER TABLE economy_accounts ADD COLUMN credit_score INTEGER NOT NULL DEFAULT 700;

ALTER TABLE economy_items ADD COLUMN fulfillment_type TEXT NOT NULL DEFAULT 'inventory';

ALTER TABLE economy_cases ADD COLUMN salary_snapshot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE economy_cases ADD COLUMN fine_cap_snapshot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE economy_cases ADD COLUMN appeal_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE economy_cases ADD COLUMN severity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE economy_cases ADD COLUMN final_note TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS economy_work_logs (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  work_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  pay_percent INTEGER NOT NULL DEFAULT 100,
  teacher_note TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  decided_at TEXT,
  UNIQUE (student_id, period_id),
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES economy_jobs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_work_logs_class_period
  ON economy_work_logs (class_id, period_id, status);
CREATE INDEX IF NOT EXISTS idx_economy_work_logs_student
  ON economy_work_logs (student_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS economy_loans (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  principal INTEGER NOT NULL,
  outstanding INTEGER NOT NULL,
  rate_percent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TEXT NOT NULL,
  decided_at TEXT,
  last_interest_period TEXT,
  teacher_note TEXT NOT NULL DEFAULT '',
  closed_at TEXT,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_loans_student
  ON economy_loans (student_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_loans_class
  ON economy_loans (class_id, status, requested_at DESC);

CREATE TABLE IF NOT EXISTS economy_inventory (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'class_store',
  source_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused',
  purchased_at TEXT NOT NULL,
  use_requested_at TEXT,
  used_at TEXT,
  teacher_note TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_inventory_student
  ON economy_inventory (student_id, status, purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_inventory_class
  ON economy_inventory (class_id, status, purchased_at DESC);

CREATE TABLE IF NOT EXISTS economy_payslips (
  class_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  job_name TEXT NOT NULL DEFAULT '',
  base_salary INTEGER NOT NULL DEFAULT 0,
  work_percent INTEGER NOT NULL DEFAULT 0,
  gross_pay INTEGER NOT NULL DEFAULT 0,
  income_tax INTEGER NOT NULL DEFAULT 0,
  net_pay INTEGER NOT NULL DEFAULT 0,
  savings_interest INTEGER NOT NULL DEFAULT 0,
  savings_rate_percent INTEGER NOT NULL DEFAULT 0,
  loan_interest INTEGER NOT NULL DEFAULT 0,
  loan_rate_percent INTEGER NOT NULL DEFAULT 0,
  credit_grade TEXT NOT NULL DEFAULT 'B',
  created_at TEXT NOT NULL,
  PRIMARY KEY (class_id, period_id, student_id),
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_payslips_student
  ON economy_payslips (student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS economy_public_spending (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount INTEGER NOT NULL,
  treasury_used INTEGER NOT NULL DEFAULT 0,
  debt_increase INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_public_spending_class
  ON economy_public_spending (class_id, created_at DESC);

CREATE TABLE IF NOT EXISTS economy_credit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  score_after INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_credit_student
  ON economy_credit_events (student_id, id DESC);

CREATE TABLE IF NOT EXISTS economy_companies (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  owner_student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  cash_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  teacher_note TEXT NOT NULL DEFAULT '',
  closed_at TEXT,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_companies_class
  ON economy_companies (class_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_companies_owner
  ON economy_companies (owner_student_id, status);

CREATE TABLE IF NOT EXISTS economy_company_products (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER,
  fulfillment_type TEXT NOT NULL DEFAULT 'inventory',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES economy_companies(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_company_products
  ON economy_company_products (class_id, company_id, active);

CREATE TABLE IF NOT EXISTS economy_company_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  buyer_student_id TEXT NOT NULL,
  gross_amount INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL,
  net_amount INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES economy_companies(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES economy_company_products(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_company_sales_company
  ON economy_company_sales (company_id, id DESC);

CREATE TABLE IF NOT EXISTS economy_request_keys (
  request_key TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_economy_request_keys_created
  ON economy_request_keys (created_at);
