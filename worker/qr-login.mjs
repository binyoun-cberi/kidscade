const QR_TOKEN_RE = /^[0-9a-f]{64}$/i;

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(text) {
  const binary = atob(String(text || ''));
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

function randomBytes(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function createQrToken() {
  return bytesToHex(randomBytes(32));
}

export function isValidQrToken(value) {
  return QR_TOKEN_RE.test(String(value || ''));
}

export async function hashQrToken(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
  return bytesToHex(new Uint8Array(digest));
}

async function qrEncryptionKey(pepper) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`kidscade-student-qr:${String(pepper || '')}`)
  );
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptQrToken(token, pepper) {
  if (!isValidQrToken(token)) throw new Error('invalid-qr-token');
  const iv = randomBytes(12);
  const key = await qrEncryptionKey(pepper);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token)
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv)
  };
}

export async function decryptQrToken(ciphertext, iv, pepper) {
  if (!ciphertext || !iv) return '';
  const key = await qrEncryptionKey(pepper);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext)
  );
  const token = new TextDecoder().decode(decrypted);
  if (!isValidQrToken(token)) throw new Error('invalid-qr-token');
  return token;
}

export async function createQrCredential(pepper) {
  const token = createQrToken();
  const tokenHash = await hashQrToken(token);
  const encrypted = await encryptQrToken(token, pepper);
  return {
    token,
    tokenHash,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv
  };
}


export async function ensureStudentQrColumns(env) {
  if (!env?.DB) return false;
  const info = await env.DB.prepare('PRAGMA table_info(student_accounts)').all();
  const names = new Set((info?.results || []).map(row => String(row.name || '')));
  if (!names.size) return false;

  const statements = [];
  if (!names.has('qr_token_hash')) statements.push('ALTER TABLE student_accounts ADD COLUMN qr_token_hash TEXT');
  if (!names.has('qr_token_ciphertext')) statements.push('ALTER TABLE student_accounts ADD COLUMN qr_token_ciphertext TEXT');
  if (!names.has('qr_token_iv')) statements.push('ALTER TABLE student_accounts ADD COLUMN qr_token_iv TEXT');

  for (const sql of statements) {
    try {
      await env.DB.prepare(sql).run();
    } catch (error) {
      const message = String(error?.message || '');
      if (!/duplicate column|already exists/i.test(message)) throw error;
    }
  }

  await env.DB.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_accounts_qr_token_hash
    ON student_accounts(qr_token_hash)
    WHERE qr_token_hash IS NOT NULL
  `).run();
  return true;
}
