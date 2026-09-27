ALTER TABLE class_teacher_accounts ADD COLUMN state_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE class_teacher_accounts ADD COLUMN state_revision INTEGER NOT NULL DEFAULT 0;
