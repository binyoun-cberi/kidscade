-- QR quick-login bearer tokens are random, server-hashed for lookup, and encrypted for re-printing.
ALTER TABLE student_accounts ADD COLUMN qr_token_hash TEXT;
ALTER TABLE student_accounts ADD COLUMN qr_token_ciphertext TEXT;
ALTER TABLE student_accounts ADD COLUMN qr_token_iv TEXT;
ALTER TABLE student_accounts ADD COLUMN qr_token_updated_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_accounts_qr_token_hash
  ON student_accounts (qr_token_hash)
  WHERE qr_token_hash IS NOT NULL;
