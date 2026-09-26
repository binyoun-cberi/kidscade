const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin'
});

const SESSION_COOKIE = 'kc_session';
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;
const MAX_STATE_BYTES = 96 * 1024;
const MAX_STUDENTS_PER_BATCH = 40;
const LOGIN_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_MINUTES = 10;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, 'cache-control': 'no-store', ...extraHeaders }
  });
}

function nowIso() {
  return new Date().toISOString();
}

function clampInt(value, min, max) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function normalizeLoginId(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidLoginId(value) {
  return /^[A-Z0-9-]{5,32}$/.test(normalizeLoginId(value));
}

export function isValidPin(value) {
  return /^\d{6}$/.test(String(value || ''));
}

export function sanitizeNickname(value) {
  return String(value ?? '')
    .replace(/[<>\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12) || '새싹 게이머';
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function randomBytes(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function randomToken() {
  return bytesToHex(randomBytes(32));
}

function randomCode(length = 5) {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function randomPin() {
  const bytes = randomBytes(4);
  const value = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(100000 + (value % 900000));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPin(loginId, pin, pepper) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(pepper || '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${normalizeLoginId(loginId)}:${String(pin)}`)
  );
  return bytesToHex(new Uint8Array(signature));
}

function secureEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function getBearer(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  const out = {};
  header.split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index < 0) return;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = value;
  });
  return out;
}

export function makeSessionCookie(token, maxAge = SESSION_MAX_AGE_SEC) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie() {
  return makeSessionCookie('', 0);
}

async function parseJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) throw new Error('json-required');
  return request.json();
}

function requireConfig(env, { teacher = false } = {}) {
  if (!env.DB) return json({ ok: false, error: 'account_database_not_configured' }, 503);
  if (!env.KIDSCADE_ACCOUNT_PEPPER) return json({ ok: false, error: 'account_secret_not_configured' }, 503);
  if (teacher && !env.KIDSCADE_ADMIN_KEY) return json({ ok: false, error: 'teacher_admin_not_configured' }, 503);
  return null;
}

export function authorizeTeacher(request, env) {
  const missing = requireConfig(env, { teacher: true });
  if (missing) return missing;
  if (!secureEqual(getBearer(request), env.KIDSCADE_ADMIN_KEY)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  return null;
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function safeArray(value, limit = 400) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function cleanStringArray(value, limit = 400) {
  return safeArray(value, limit)
    .map(item => String(item || '').trim().slice(0, 100))
    .filter(Boolean);
}

function cleanStringMap(value, maxEntries = 80) {
  const input = safeObject(value);
  const out = {};
  Object.entries(input).slice(0, maxEntries).forEach(([key, entry]) => {
    const safeKey = String(key || '').trim().slice(0, 80);
    if (!safeKey || ['__proto__', 'prototype', 'constructor'].includes(safeKey)) return;
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean' || entry === null) {
      out[safeKey] = typeof entry === 'string' ? entry.slice(0, 180) : entry;
    }
  });
  return out;
}

function boundedJsonObject(value, byteLimit = 48 * 1024) {
  const input = safeObject(value);
  const text = JSON.stringify(input);
  if (new TextEncoder().encode(text).byteLength > byteLimit) return {};
  return JSON.parse(text);
}

export function sanitizeSyncState(input) {
  const state = safeObject(input);
  const profile = safeObject(state.profile);
  const out = {
    version: 1,
    profile: {
      version: 1,
      nickname: sanitizeNickname(profile.nickname),
      createdAt: typeof profile.createdAt === 'string' ? profile.createdAt.slice(0, 40) : '',
      updatedAt: typeof profile.updatedAt === 'string' ? profile.updatedAt.slice(0, 40) : ''
    },
    seeds: clampInt(state.seeds, 0, 1_000_000_000),
    avatarInventory: cleanStringArray(state.avatarInventory, 500),
    avatarEquipped: cleanStringMap(state.avatarEquipped, 40),
    playHistory: boundedJsonObject(state.playHistory, 56 * 1024),
    inventory: boundedJsonObject(state.inventory, 16 * 1024),
    equipped: cleanStringMap(state.equipped, 80),
    pet: boundedJsonObject(state.pet, 12 * 1024),
    petItems: boundedJsonObject(state.petItems, 12 * 1024),
    gardenState: boundedJsonObject(state.gardenState, 32 * 1024)
  };
  const bytes = new TextEncoder().encode(JSON.stringify(out)).byteLength;
  if (bytes > MAX_STATE_BYTES) throw new Error('state-too-large');
  return out;
}

function accountPayload(row) {
  let state = {};
  try { state = row?.state_json ? JSON.parse(row.state_json) : {}; } catch (_) {}
  return {
    account: {
      loginId: row.login_id,
      nickname: row.nickname || '새싹 게이머',
      className: row.class_name || '',
      classCode: row.class_code || '',
      revision: Number(row.state_revision || 0),
      lastLoginAt: row.last_login_at || null
    },
    state
  };
}

export async function requireStudent(request, env) {
  const missing = requireConfig(env);
  if (missing) return { response: missing };
  const token = parseCookies(request)[SESSION_COOKIE] || '';
  if (!/^[0-9a-f]{64}$/i.test(token)) return { response: json({ ok: false, error: 'not_authenticated' }, 401) };
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT s.token_hash, s.expires_at,
           a.id AS student_id, a.class_id, a.login_id, a.nickname, a.state_json, a.state_revision,
           a.last_login_at, a.disabled,
           c.name AS class_name, c.class_code
    FROM student_sessions s
    JOIN student_accounts a ON a.id = s.student_id
    JOIN kidscade_classes c ON c.id = a.class_id
    WHERE s.token_hash = ?
  `).bind(tokenHash).first();
  if (!row || row.disabled) return { response: json({ ok: false, error: 'not_authenticated' }, 401, { 'set-cookie': clearSessionCookie() }) };
  if (!row.expires_at || new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM student_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return { response: json({ ok: false, error: 'session_expired' }, 401, { 'set-cookie': clearSessionCookie() }) };
  }
  return { row, tokenHash };
}

async function login(request, env) {
  const missing = requireConfig(env);
  if (missing) return missing;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const loginId = normalizeLoginId(body?.loginId);
  const pin = String(body?.pin || '');
  if (!isValidLoginId(loginId) || !isValidPin(pin)) return json({ ok: false, error: 'invalid_credentials' }, 401);

  const row = await env.DB.prepare(`
    SELECT a.*, c.name AS class_name, c.class_code
    FROM student_accounts a
    JOIN kidscade_classes c ON c.id = a.class_id
    WHERE a.login_id = ? COLLATE NOCASE
  `).bind(loginId).first();
  if (!row || row.disabled) return json({ ok: false, error: 'invalid_credentials' }, 401);

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    const retryAfterSec = Math.max(1, Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 1000));
    return json({ ok: false, error: 'temporarily_locked', retryAfterSec }, 429, { 'retry-after': String(retryAfterSec) });
  }

  const expected = await hashPin(loginId, pin, env.KIDSCADE_ACCOUNT_PEPPER);
  if (!secureEqual(expected, row.pin_hash)) {
    const failures = Number(row.failed_attempts || 0) + 1;
    const lockedUntil = failures >= LOGIN_LOCK_THRESHOLD
      ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000).toISOString()
      : null;
    await env.DB.prepare(`
      UPDATE student_accounts SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?
    `).bind(lockedUntil ? 0 : failures, lockedUntil, nowIso(), row.id).run();
    return json({ ok: false, error: lockedUntil ? 'temporarily_locked' : 'invalid_credentials' }, lockedUntil ? 429 : 401);
  }

  const token = randomToken();
  const tokenHash = await sha256(token);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000).toISOString();
  await env.DB.prepare('DELETE FROM student_sessions WHERE student_id = ? AND expires_at <= ?').bind(row.id, createdAt).run();
  await env.DB.prepare(`
    INSERT INTO student_sessions (token_hash, student_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(tokenHash, row.id, createdAt, expiresAt).run();
  await env.DB.prepare(`
    UPDATE student_accounts SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?
  `).bind(createdAt, createdAt, row.id).run();

  row.last_login_at = createdAt;
  return json({ ok: true, ...accountPayload(row) }, 200, { 'set-cookie': makeSessionCookie(token) });
}

async function logout(request, env) {
  const token = parseCookies(request)[SESSION_COOKIE] || '';
  if (env.DB && /^[0-9a-f]{64}$/i.test(token)) {
    const tokenHash = await sha256(token);
    await env.DB.prepare('DELETE FROM student_sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}

async function me(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  return json({ ok: true, ...accountPayload(auth.row) });
}

async function syncState(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  let state;
  try { state = sanitizeSyncState(body?.state); } catch (error) {
    return json({ ok: false, error: error?.message === 'state-too-large' ? 'state_too_large' : 'invalid_state' }, 400);
  }
  const nickname = sanitizeNickname(state.profile?.nickname);
  const now = nowIso();
  await env.DB.prepare(`
    UPDATE student_accounts
    SET state_json = ?, state_revision = state_revision + 1, nickname = ?, updated_at = ?
    WHERE id = ?
  `).bind(JSON.stringify(state), nickname, now, auth.row.student_id).run();
  const updated = await env.DB.prepare(`
    SELECT a.*, c.name AS class_name, c.class_code
    FROM student_accounts a
    JOIN kidscade_classes c ON c.id = a.class_id
    WHERE a.id = ?
  `).bind(auth.row.student_id).first();
  return json({ ok: true, ...accountPayload(updated) });
}

async function uniqueClassCode(env) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomCode(5);
    const found = await env.DB.prepare('SELECT id FROM kidscade_classes WHERE class_code = ?').bind(code).first();
    if (!found) return code;
  }
  throw new Error('class-code-exhausted');
}

async function createClass(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const name = String(body?.name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const count = clampInt(body?.count, 1, MAX_STUDENTS_PER_BATCH);
  if (!name) return json({ ok: false, error: 'class_name_required' }, 400);

  const classCode = await uniqueClassCode(env);
  const classId = crypto.randomUUID();
  const createdAt = nowIso();
  await env.DB.prepare(`
    INSERT INTO kidscade_classes (id, class_code, name, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(classId, classCode, name, createdAt).run();

  const credentials = [];
  const statements = [];
  for (let index = 1; index <= count; index += 1) {
    const loginId = `KC-${classCode}-${String(index).padStart(2, '0')}`;
    const pin = randomPin();
    const pinHash = await hashPin(loginId, pin, env.KIDSCADE_ACCOUNT_PEPPER);
    const studentId = crypto.randomUUID();
    credentials.push({ loginId, pin, nickname: '새싹 게이머' });
    statements.push(env.DB.prepare(`
      INSERT INTO student_accounts (
        id, login_id, class_id, nickname, pin_hash, state_json, state_revision,
        failed_attempts, disabled, created_at, updated_at
      ) VALUES (?, ?, ?, '새싹 게이머', ?, '{}', 0, 0, 0, ?, ?)
    `).bind(studentId, loginId, classId, pinHash, createdAt, createdAt));
  }
  if (typeof env.DB.batch === 'function') await env.DB.batch(statements);
  else for (const statement of statements) await statement.run();

  return json({
    ok: true,
    classroom: { id: classId, code: classCode, name, studentCount: count, createdAt },
    credentials
  }, 201);
}

async function listClasses(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;
  const classes = await env.DB.prepare(`
    SELECT c.id, c.class_code, c.name, c.created_at, COUNT(a.id) AS student_count
    FROM kidscade_classes c
    LEFT JOIN student_accounts a ON a.class_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();
  const students = await env.DB.prepare(`
    SELECT a.id, a.login_id, a.nickname, a.last_login_at, a.disabled,
           a.state_revision, c.id AS class_id, c.class_code, c.name AS class_name
    FROM student_accounts a
    JOIN kidscade_classes c ON c.id = a.class_id
    ORDER BY c.created_at DESC, a.login_id ASC
  `).all();
  return json({ ok: true, classes: classes?.results || [], students: students?.results || [] });
}

async function resetPin(request, env) {
  const denied = authorizeTeacher(request, env);
  if (denied) return denied;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const loginId = normalizeLoginId(body?.loginId);
  if (!isValidLoginId(loginId)) return json({ ok: false, error: 'invalid_login_id' }, 400);
  const account = await env.DB.prepare('SELECT id FROM student_accounts WHERE login_id = ? COLLATE NOCASE').bind(loginId).first();
  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);
  const pin = randomPin();
  const pinHash = await hashPin(loginId, pin, env.KIDSCADE_ACCOUNT_PEPPER);
  const now = nowIso();
  await env.DB.prepare(`
    UPDATE student_accounts
    SET pin_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = ?
    WHERE id = ?
  `).bind(pinHash, now, account.id).run();
  await env.DB.prepare('DELETE FROM student_sessions WHERE student_id = ?').bind(account.id).run();
  return json({ ok: true, loginId, pin });
}

function methodNotAllowed(allow) {
  return json({ ok: false, error: 'method_not_allowed' }, 405, { allow });
}

export async function handleAccountRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const accountPaths = new Set([
    '/api/account/login', '/api/account/logout', '/api/account/me', '/api/account/sync',
    '/api/teacher/classes', '/api/teacher/reset-pin'
  ]);
  if (!accountPaths.has(path)) return null;

  try {
    if (path === '/api/account/login') return request.method === 'POST' ? login(request, env) : methodNotAllowed('POST');
    if (path === '/api/account/logout') return request.method === 'POST' ? logout(request, env) : methodNotAllowed('POST');
    if (path === '/api/account/me') return request.method === 'GET' ? me(request, env) : methodNotAllowed('GET');
    if (path === '/api/account/sync') return request.method === 'POST' ? syncState(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/classes') {
      if (request.method === 'GET') return listClasses(request, env);
      if (request.method === 'POST') return createClass(request, env);
      return methodNotAllowed('GET, POST');
    }
    if (path === '/api/teacher/reset-pin') return request.method === 'POST' ? resetPin(request, env) : methodNotAllowed('POST');
  } catch (error) {
    const message = String(error?.message || '');
    if (/no such table|SQLITE_ERROR/i.test(message)) {
      return json({ ok: false, error: 'account_schema_not_ready' }, 503);
    }
    console.error('[Kidscade account API]', error);
    return json({ ok: false, error: 'account_server_error' }, 500);
  }
  return null;
}
