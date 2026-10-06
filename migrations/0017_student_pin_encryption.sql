-- Store a recoverable encrypted copy of each 6-digit student PIN for global-admin display.
-- The login verifier still uses pin_hash; these columns are only decrypted server-side
-- after KIDSCADE_ADMIN_KEY authentication. Existing accounts are backfilled on their
-- next successful login or when the PIN is reissued.
ALTER TABLE student_accounts ADD COLUMN pin_ciphertext TEXT;
ALTER TABLE student_accounts ADD COLUMN pin_iv TEXT;
