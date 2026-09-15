const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin'
});

const SESSION_COOKIE = 'kc_session';
const MAX_EARNED_DELTA = 100000;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
  });
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return bytesToHex(new Uint8Array(digest));
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

async function parseJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) throw new Error('json-required');
  return request.json();
}

async function requireStudent(request, env) {
  if (!env.DB) return { response: json({ ok: false, error: 'account_database_not_configured' }, 503) };
  const token = parseCookies(request)[SESSION_COOKIE] || '';
  if (!/^[0-9a-f]{64}$/i.test(token)) return { response: json({ ok: false, error: 'not_authenticated' }, 401) };
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT a.id AS student_id, a.class_id, a.nickname, a.disabled,
           c.name AS class_name, c.class_code,
           s.expires_at
    FROM student_sessions s
    JOIN student_accounts a ON a.id = s.student_id
    JOIN kidscade_classes c ON c.id = a.class_id
    WHERE s.token_hash = ?
  `).bind(tokenHash).first();
  if (!row || row.disabled) return { response: json({ ok: false, error: 'not_authenticated' }, 401) };
  if (!row.expires_at || new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM student_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return { response: json({ ok: false, error: 'session_expired' }, 401) };
  }
  return { row };
}

export function kstWeekKey(date = new Date()) {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const weekday = shifted.getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  shifted.setUTCDate(shifted.getUTCDate() - mondayOffset);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function rankRows(rows, key, selfId) {
  return [...rows]
    .map(row => ({
      studentId: String(row.student_id || ''),
      nickname: String(row.nickname || '새싹 게이머').slice(0, 12),
      value: Math.max(0, Math.floor(Number(row[key] || 0)))
    }))
    .sort((a, b) => b.value - a.value || a.nickname.localeCompare(b.nickname, 'ko') || a.studentId.localeCompare(b.studentId))
    .map((row, index) => ({
      rank: index + 1,
      nickname: row.nickname,
      value: row.value,
      self: row.studentId === selfId
    }));
}

async function recordSeedEarned(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const delta = Math.floor(Number(body?.delta || 0));
  if (!Number.isFinite(delta) || delta < 1 || delta > MAX_EARNED_DELTA) {
    return json({ ok: false, error: 'invalid_seed_delta' }, 400);
  }
  const weekKey = kstWeekKey();
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO student_seed_weekly (student_id, week_key, earned_seeds, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(student_id, week_key) DO UPDATE SET
      earned_seeds = student_seed_weekly.earned_seeds + excluded.earned_seeds,
      updated_at = excluded.updated_at
  `).bind(auth.row.student_id, weekKey, delta, now).run();
  const saved = await env.DB.prepare(`
    SELECT earned_seeds FROM student_seed_weekly WHERE student_id = ? AND week_key = ?
  `).bind(auth.row.student_id, weekKey).first();
  return json({ ok: true, weekKey, weeklyEarned: Math.max(0, Number(saved?.earned_seeds || 0)) });
}

async function getSeedRanking(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  const weekKey = kstWeekKey();
  const result = await env.DB.prepare(`
    SELECT a.id AS student_id,
           a.nickname,
           CAST(COALESCE(json_extract(a.state_json, '$.seeds'), 0) AS INTEGER) AS seed_balance,
           COALESCE(w.earned_seeds, 0) AS weekly_earned
    FROM student_accounts a
    LEFT JOIN student_seed_weekly w
      ON w.student_id = a.id AND w.week_key = ?
    WHERE a.class_id = ? AND a.disabled = 0
  `).bind(weekKey, auth.row.class_id).all();
  const rows = result?.results || [];
  const balance = rankRows(rows, 'seed_balance', auth.row.student_id);
  const weekly = rankRows(rows, 'weekly_earned', auth.row.student_id);
  return json({
    ok: true,
    className: auth.row.class_name || '',
    weekKey,
    memberCount: rows.length,
    balance: {
      top: balance.slice(0, 10),
      self: balance.find(row => row.self) || null
    },
    weekly: {
      top: weekly.slice(0, 10),
      self: weekly.find(row => row.self) || null
    }
  });
}

function methodNotAllowed(allow) {
  return json({ ok: false, error: 'method_not_allowed' }, 405, { allow });
}

export async function handleSeedRankingRequest(request, env) {
  const path = new URL(request.url).pathname;
  if (path !== '/api/account/seed-earned' && path !== '/api/account/seed-ranking') return null;
  try {
    if (path === '/api/account/seed-earned') {
      return request.method === 'POST' ? recordSeedEarned(request, env) : methodNotAllowed('POST');
    }
    return request.method === 'GET' ? getSeedRanking(request, env) : methodNotAllowed('GET');
  } catch (error) {
    const message = String(error?.message || '');
    if (/no such table: student_seed_weekly|SQLITE_ERROR.*student_seed_weekly/i.test(message)) {
      return json({ ok: false, error: 'seed_ranking_schema_not_ready' }, 503);
    }
    if (/no such table|SQLITE_ERROR/i.test(message)) {
      return json({ ok: false, error: 'account_schema_not_ready' }, 503);
    }
    console.error('[Kidscade seed ranking API]', error);
    return json({ ok: false, error: 'seed_ranking_server_error' }, 500);
  }
}
