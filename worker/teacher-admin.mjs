import { hashPin, normalizeLoginId, isValidLoginId } from './accounts.mjs';
import { authorizeTeacherAccess, authorizeTeacherForClass, ensureTeacherCredential, listTeacherCredentialsForAdmin } from './teacher-auth.mjs';

const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin'
});
const MAX_ADD_STUDENTS = 40;
const MAX_CLASS_SIZE = 50;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, 'cache-control': 'no-store', ...extraHeaders }
  });
}

function nowIso() {
  return new Date().toISOString();
}

function secureEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function bearer(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function authorizeTeacher(request, env) {
  if (!env.DB) return json({ ok: false, error: 'account_database_not_configured' }, 503);
  if (!env.KIDSCADE_ACCOUNT_PEPPER) return json({ ok: false, error: 'account_secret_not_configured' }, 503);
  if (!env.KIDSCADE_ADMIN_KEY) return json({ ok: false, error: 'teacher_admin_not_configured' }, 503);
  if (!secureEqual(bearer(request), env.KIDSCADE_ADMIN_KEY)) return json({ ok: false, error: 'unauthorized' }, 401);
  return null;
}

async function parseJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) throw new Error('json-required');
  return request.json();
}

function clampInt(value, min, max) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function randomPin() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const value = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(100000 + (value % 900000));
}

export function blankStudentState() {
  return {
    version: 1,
    profile: { version: 1, nickname: '새싹 게이머', createdAt: '', updatedAt: '' },
    seeds: 0,
    avatarInventory: [],
    avatarEquipped: {},
    playHistory: { version: 1, games: {}, recent: [] },
    inventory: {},
    equipped: {},
    pet: {},
    petItems: {},
    gardenState: {}
  };
}

export function summarizeStudentState(value) {
  let state = value;
  if (typeof value === 'string') {
    try { state = JSON.parse(value || '{}'); } catch (_) { state = {}; }
  }
  if (!state || typeof state !== 'object' || Array.isArray(state)) state = {};
  const games = state.playHistory?.games && typeof state.playHistory.games === 'object'
    ? state.playHistory.games
    : {};
  let plays = 0;
  let seconds = 0;
  let gameCount = 0;
  Object.values(games).forEach(game => {
    if (!game || typeof game !== 'object') return;
    const gamePlays = Math.max(0, Math.floor(Number(game.plays || 0)));
    const gameSeconds = Math.max(0, Math.floor(Number(game.seconds || 0)));
    plays += gamePlays;
    seconds += gameSeconds;
    if (gamePlays > 0 || gameSeconds > 0) gameCount += 1;
  });
  return {
    seeds: Math.max(0, Math.floor(Number(state.seeds || 0))),
    plays,
    seconds,
    gameCount,
    gardenLevel: Math.max(0, Math.floor(Number(state.gardenState?.level || 0))),
    petLevel: Math.max(0, Math.floor(Number(state.pet?.level || 0)))
  };
}

export function nextStudentNumber(loginIds, classCode) {
  const prefix = `KC-${String(classCode || '').toUpperCase()}-`;
  let max = 0;
  for (const raw of Array.isArray(loginIds) ? loginIds : []) {
    const id = normalizeLoginId(raw);
    if (!id.startsWith(prefix)) continue;
    const suffix = id.slice(prefix.length);
    if (/^\d+$/.test(suffix)) max = Math.max(max, Number(suffix));
  }
  return max + 1;
}

function cleanClassName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
}

async function getOverview(request, env) {
  const auth = await authorizeTeacherAccess(request, env);
  if (auth.response) return auth.response;

  const classes = auth.global
    ? await env.DB.prepare(`
        SELECT c.id, c.class_code, c.name, c.created_at,
               COUNT(a.id) AS student_count,
               SUM(CASE WHEN a.disabled = 0 THEN 1 ELSE 0 END) AS active_count,
               SUM(CASE WHEN a.disabled = 1 THEN 1 ELSE 0 END) AS disabled_count
        FROM kidscade_classes c
        LEFT JOIN student_accounts a ON a.class_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `).all()
    : await env.DB.prepare(`
        SELECT c.id, c.class_code, c.name, c.created_at,
               COUNT(a.id) AS student_count,
               SUM(CASE WHEN a.disabled = 0 THEN 1 ELSE 0 END) AS active_count,
               SUM(CASE WHEN a.disabled = 1 THEN 1 ELSE 0 END) AS disabled_count
        FROM kidscade_classes c
        LEFT JOIN student_accounts a ON a.class_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
      `).bind(auth.classId).all();

  const students = auth.global
    ? await env.DB.prepare(`
        SELECT a.id, a.login_id, a.nickname, a.last_login_at, a.disabled,
               a.state_revision, a.state_json, a.updated_at, a.locked_until,
               c.id AS class_id, c.class_code, c.name AS class_name,
               (SELECT COUNT(*) FROM student_sessions s
                 WHERE s.student_id = a.id AND s.expires_at > ?) AS active_sessions
        FROM student_accounts a
        JOIN kidscade_classes c ON c.id = a.class_id
        ORDER BY c.created_at DESC, a.login_id ASC
      `).bind(nowIso()).all()
    : await env.DB.prepare(`
        SELECT a.id, a.login_id, a.nickname, a.last_login_at, a.disabled,
               a.state_revision, a.state_json, a.updated_at, a.locked_until,
               c.id AS class_id, c.class_code, c.name AS class_name,
               (SELECT COUNT(*) FROM student_sessions s
                 WHERE s.student_id = a.id AND s.expires_at > ?) AS active_sessions
        FROM student_accounts a
        JOIN kidscade_classes c ON c.id = a.class_id
        WHERE a.class_id = ?
        ORDER BY a.login_id ASC
      `).bind(nowIso(), auth.classId).all();

  const safeStudents = (students?.results || []).map(row => ({
    id: row.id,
    login_id: row.login_id,
    nickname: row.nickname || '새싹 게이머',
    last_login_at: row.last_login_at || null,
    disabled: Number(row.disabled || 0),
    state_revision: Number(row.state_revision || 0),
    updated_at: row.updated_at || null,
    locked_until: row.locked_until || null,
    class_id: row.class_id,
    class_code: row.class_code,
    class_name: row.class_name,
    active_sessions: Number(row.active_sessions || 0),
    summary: summarizeStudentState(row.state_json)
  }));

  const classRows = classes?.results || [];
  let teacherCredentials = [];
  if (auth.global) {
    for (const classroom of classRows) {
      await ensureTeacherCredential(env, classroom.id, classroom.class_code);
    }
    teacherCredentials = await listTeacherCredentialsForAdmin(env, classRows.map(item => item.id));
  }

  return json({
    ok: true,
    scope: auth.global ? 'global' : 'class',
    teacher: auth.global ? null : {
      loginId: auth.loginId,
      classId: auth.classId,
      className: auth.className,
      classCode: auth.classCode
    },
    classes: classRows,
    students: safeStudents,
    teacherCredentials
  });
}

async function renameClass(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const classId = String(body?.classId || '').trim();
  const name = cleanClassName(body?.name);
  if (!classId) return json({ ok: false, error: 'class_id_required' }, 400);
  if (!name) return json({ ok: false, error: 'class_name_required' }, 400);
  const access = await authorizeTeacherForClass(request, env, classId);
  if (access.response) return access.response;
  const found = await env.DB.prepare('SELECT id FROM kidscade_classes WHERE id = ?').bind(classId).first();
  if (!found) return json({ ok: false, error: 'class_not_found' }, 404);
  await env.DB.prepare('UPDATE kidscade_classes SET name = ? WHERE id = ?').bind(name, classId).run();
  return json({ ok: true, classId, name });
}

async function addStudents(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const classId = String(body?.classId || '').trim();
  const count = clampInt(body?.count, 1, MAX_ADD_STUDENTS);
  const access = await authorizeTeacherForClass(request, env, classId);
  if (access.response) return access.response;
  const classroom = await env.DB.prepare(`
    SELECT c.id, c.class_code, c.name, COUNT(a.id) AS student_count
    FROM kidscade_classes c
    LEFT JOIN student_accounts a ON a.class_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
  `).bind(classId).first();
  if (!classroom) return json({ ok: false, error: 'class_not_found' }, 404);
  const currentCount = Number(classroom.student_count || 0);
  if (currentCount + count > MAX_CLASS_SIZE) {
    return json({ ok: false, error: 'class_size_limit', max: MAX_CLASS_SIZE, current: currentCount }, 400);
  }
  const ids = await env.DB.prepare('SELECT login_id FROM student_accounts WHERE class_id = ?').bind(classId).all();
  let next = nextStudentNumber((ids?.results || []).map(row => row.login_id), classroom.class_code);
  const now = nowIso();
  const credentials = [];
  const statements = [];
  for (let i = 0; i < count; i += 1) {
    const loginId = `KC-${classroom.class_code}-${String(next + i).padStart(2, '0')}`;
    const pin = randomPin();
    const pinHash = await hashPin(loginId, pin, env.KIDSCADE_ACCOUNT_PEPPER);
    const studentId = crypto.randomUUID();
    credentials.push({ loginId, pin, nickname: '새싹 게이머' });
    statements.push(env.DB.prepare(`
      INSERT INTO student_accounts (
        id, login_id, class_id, nickname, pin_hash, state_json, state_revision,
        failed_attempts, disabled, created_at, updated_at
      ) VALUES (?, ?, ?, '새싹 게이머', ?, '{}', 0, 0, 0, ?, ?)
    `).bind(studentId, loginId, classId, pinHash, now, now));
  }
  if (typeof env.DB.batch === 'function') await env.DB.batch(statements);
  else for (const statement of statements) await statement.run();
  return json({
    ok: true,
    classroom: { id: classroom.id, code: classroom.class_code, name: classroom.name },
    credentials
  }, 201);
}

async function findStudent(env, loginId) {
  const normalized = normalizeLoginId(loginId);
  if (!isValidLoginId(normalized)) return null;
  return env.DB.prepare('SELECT id, login_id, class_id, disabled FROM student_accounts WHERE login_id = ? COLLATE NOCASE').bind(normalized).first();
}

async function setStudentStatus(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const account = await findStudent(env, body?.loginId);
  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);
  const access = await authorizeTeacherForClass(request, env, account.class_id);
  if (access.response) return access.response;
  const disabled = Boolean(body?.disabled);
  await env.DB.prepare(`
    UPDATE student_accounts SET disabled = ?, failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?
  `).bind(disabled ? 1 : 0, nowIso(), account.id).run();
  if (disabled) await env.DB.prepare('DELETE FROM student_sessions WHERE student_id = ?').bind(account.id).run();
  return json({ ok: true, loginId: account.login_id, disabled });
}

async function forceStudentLogout(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const account = await findStudent(env, body?.loginId);
  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);
  const access = await authorizeTeacherForClass(request, env, account.class_id);
  if (access.response) return access.response;
  const result = await env.DB.prepare('DELETE FROM student_sessions WHERE student_id = ?').bind(account.id).run();
  return json({ ok: true, loginId: account.login_id, loggedOutSessions: Number(result?.meta?.changes || 0) });
}

async function forceClassLogout(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const classId = String(body?.classId || '').trim();
  const access = await authorizeTeacherForClass(request, env, classId);
  if (access.response) return access.response;
  const classroom = await env.DB.prepare('SELECT id FROM kidscade_classes WHERE id = ?').bind(classId).first();
  if (!classroom) return json({ ok: false, error: 'class_not_found' }, 404);
  const result = await env.DB.prepare(`
    DELETE FROM student_sessions WHERE student_id IN (SELECT id FROM student_accounts WHERE class_id = ?)
  `).bind(classId).run();
  return json({ ok: true, classId, loggedOutSessions: Number(result?.meta?.changes || 0) });
}

async function resetStudentProgress(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const loginId = normalizeLoginId(body?.loginId);
  const confirmLoginId = normalizeLoginId(body?.confirmLoginId);
  if (!loginId || confirmLoginId !== loginId) return json({ ok: false, error: 'confirmation_mismatch' }, 400);
  const account = await findStudent(env, loginId);
  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);
  const access = await authorizeTeacherForClass(request, env, account.class_id);
  if (access.response) return access.response;
  const now = nowIso();
  const state = blankStudentState();
  state.profile.updatedAt = now;
  await env.DB.prepare(`
    UPDATE student_accounts
       SET state_json = ?, state_revision = state_revision + 1, nickname = '새싹 게이머',
           failed_attempts = 0, locked_until = NULL, updated_at = ?
     WHERE id = ?
  `).bind(JSON.stringify(state), now, account.id).run();
  await env.DB.prepare('DELETE FROM student_sessions WHERE student_id = ?').bind(account.id).run();
  return json({ ok: true, loginId: account.login_id });
}

async function deleteStudent(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const loginId = normalizeLoginId(body?.loginId);
  const confirmLoginId = normalizeLoginId(body?.confirmLoginId);
  if (!loginId || confirmLoginId !== loginId) return json({ ok: false, error: 'confirmation_mismatch' }, 400);
  const account = await findStudent(env, loginId);
  if (!account) return json({ ok: false, error: 'account_not_found' }, 404);
  const access = await authorizeTeacherForClass(request, env, account.class_id);
  if (access.response) return access.response;
  const statements = [
    env.DB.prepare('DELETE FROM student_sessions WHERE student_id = ?').bind(account.id),
    env.DB.prepare('DELETE FROM student_accounts WHERE id = ?').bind(account.id)
  ];
  if (typeof env.DB.batch === 'function') await env.DB.batch(statements);
  else for (const statement of statements) await statement.run();
  return json({ ok: true, loginId: account.login_id });
}

async function deleteClass(request, env) {
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const classId = String(body?.classId || '').trim();
  const confirmName = cleanClassName(body?.confirmName);
  const access = await authorizeTeacherForClass(request, env, classId);
  if (access.response) return access.response;
  const classroom = await env.DB.prepare(`
    SELECT c.id, c.name, COUNT(a.id) AS student_count
    FROM kidscade_classes c
    LEFT JOIN student_accounts a ON a.class_id = c.id
    WHERE c.id = ? GROUP BY c.id
  `).bind(classId).first();
  if (!classroom) return json({ ok: false, error: 'class_not_found' }, 404);
  if (confirmName !== classroom.name) return json({ ok: false, error: 'confirmation_mismatch' }, 400);
  const statements = [
    env.DB.prepare(`DELETE FROM student_sessions WHERE student_id IN (SELECT id FROM student_accounts WHERE class_id = ?)`).bind(classId),
    env.DB.prepare('DELETE FROM class_teacher_sessions WHERE class_id = ?').bind(classId),
    env.DB.prepare('DELETE FROM class_teacher_accounts WHERE class_id = ?').bind(classId),
    env.DB.prepare('DELETE FROM student_accounts WHERE class_id = ?').bind(classId),
    env.DB.prepare('DELETE FROM kidscade_classes WHERE id = ?').bind(classId)
  ];
  if (typeof env.DB.batch === 'function') await env.DB.batch(statements);
  else for (const statement of statements) await statement.run();
  return json({ ok: true, classId, deletedStudents: Number(classroom.student_count || 0) });
}

function methodNotAllowed(allow) {
  return json({ ok: false, error: 'method_not_allowed' }, 405, { allow });
}

export async function handleTeacherManagementRequest(request, env) {
  const path = new URL(request.url).pathname;
  const paths = new Set([
    '/api/teacher/overview',
    '/api/teacher/class',
    '/api/teacher/add-students',
    '/api/teacher/student-status',
    '/api/teacher/student-logout',
    '/api/teacher/class-logout',
    '/api/teacher/reset-progress',
    '/api/teacher/student',
    '/api/teacher/class-delete'
  ]);
  if (!paths.has(path)) return null;
  try {
    if (path === '/api/teacher/overview') return request.method === 'GET' ? getOverview(request, env) : methodNotAllowed('GET');
    if (path === '/api/teacher/class') return request.method === 'PATCH' ? renameClass(request, env) : methodNotAllowed('PATCH');
    if (path === '/api/teacher/add-students') return request.method === 'POST' ? addStudents(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/student-status') return request.method === 'POST' ? setStudentStatus(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/student-logout') return request.method === 'POST' ? forceStudentLogout(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/class-logout') return request.method === 'POST' ? forceClassLogout(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/reset-progress') return request.method === 'POST' ? resetStudentProgress(request, env) : methodNotAllowed('POST');
    if (path === '/api/teacher/student') return request.method === 'DELETE' ? deleteStudent(request, env) : methodNotAllowed('DELETE');
    if (path === '/api/teacher/class-delete') return request.method === 'DELETE' ? deleteClass(request, env) : methodNotAllowed('DELETE');
  } catch (error) {
    const message = String(error?.message || '');
    if (/class_teacher_accounts|class_teacher_sessions/i.test(message)) return json({ ok: false, error: 'teacher_schema_not_ready' }, 503);
    if (/no such table|SQLITE_ERROR/i.test(message)) return json({ ok: false, error: 'account_schema_not_ready' }, 503);
    console.error('[Kidscade teacher management API]', error);
    return json({ ok: false, error: 'account_server_error' }, 500);
  }
  return null;
}
