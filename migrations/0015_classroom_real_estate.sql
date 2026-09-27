-- Classroom economy v4: classroom-seat real estate, government rentals,
-- historical/teacher-entered bank loans, and rent payment records.

ALTER TABLE economy_loans ADD COLUMN source_type TEXT NOT NULL DEFAULT 'student_request';
ALTER TABLE economy_loans ADD COLUMN purpose TEXT NOT NULL DEFAULT '';
ALTER TABLE economy_loans ADD COLUMN occurred_at TEXT;
ALTER TABLE economy_loans ADD COLUMN property_id TEXT;

CREATE TABLE IF NOT EXISTS economy_properties (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  purchase_price INTEGER NOT NULL DEFAULT 0,
  owner_type TEXT NOT NULL DEFAULT 'government',
  owner_student_id TEXT,
  acquired_at TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_student_id) REFERENCES student_accounts(id) ON DELETE SET NULL,
  UNIQUE (class_id, name)
);
CREATE INDEX IF NOT EXISTS idx_economy_properties_class
  ON economy_properties (class_id, owner_type, name);
CREATE INDEX IF NOT EXISTS idx_economy_properties_owner
  ON economy_properties (owner_student_id, class_id);

CREATE TABLE IF NOT EXISTS economy_property_leases (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  tenant_student_id TEXT NOT NULL,
  landlord_type TEXT NOT NULL DEFAULT 'government',
  landlord_student_id TEXT,
  rent_amount INTEGER NOT NULL DEFAULT 0,
  start_period TEXT NOT NULL,
  last_paid_period TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES economy_properties(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_student_id) REFERENCES student_accounts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_economy_property_leases_class
  ON economy_property_leases (class_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_property_leases_tenant
  ON economy_property_leases (tenant_student_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_economy_property_active_lease
  ON economy_property_leases (property_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_economy_tenant_active_lease
  ON economy_property_leases (tenant_student_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS economy_rent_payments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  lease_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  tenant_student_id TEXT NOT NULL,
  landlord_type TEXT NOT NULL,
  landlord_student_id TEXT,
  period_id TEXT NOT NULL,
  amount_due INTEGER NOT NULL DEFAULT 0,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  paid_at TEXT,
  FOREIGN KEY (class_id) REFERENCES kidscade_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (lease_id) REFERENCES economy_property_leases(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES economy_properties(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_student_id) REFERENCES student_accounts(id) ON DELETE SET NULL,
  UNIQUE (lease_id, period_id)
);
CREATE INDEX IF NOT EXISTS idx_economy_rent_payments_class
  ON economy_rent_payments (class_id, period_id, status);
CREATE INDEX IF NOT EXISTS idx_economy_rent_payments_tenant
  ON economy_rent_payments (tenant_student_id, created_at DESC);
