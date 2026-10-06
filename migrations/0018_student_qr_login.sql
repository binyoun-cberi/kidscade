ALTER TABLE student_accounts ADD COLUMN qr_token_hash TEXT;
ALTER TABLE student_accounts ADD COLUMN qr_token_ciphertext TEXT;
ALTER TABLE student_accounts ADD COLUMN qr_token_iv TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_accounts_qr_token_hash
  ON student_accounts(qr_token_hash)
  WHERE qr_token_hash IS NOT NULL;
