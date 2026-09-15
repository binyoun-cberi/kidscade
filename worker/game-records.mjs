const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin'
});

const SESSION_COOKIE = 'kc_session';
const CLASSROOM_WAR_GAME_ID = 'high_classroom_war_3d';
const CLASSROOM_WAR_METRIC = 'score';
const CLASSROOM_WAR_MODE = 'v4';
const TIMING_GAME_ID = 'math_timing_lcd';
const TIMING_EXACT_METRIC = 'exact_10_hits';
const TIMING_EXACT_MODE = 'classic_v1';
const TIMING_EXACT_COOLDOWN_MS = 8000;

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

function integer(value, min, max, fallback = NaN) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

export function computeClassroomWarScore(details = {}) {
  const survivalTenths = integer(details.survivalTenths, 0, 144000);
  const kills = integer(details.kills, 0, 200000);
  const bossKills = integer(details.bossKills, 0, 20000);
  const hazardsDestroyed = integer(details.hazardsDestroyed, 0, 50000);
  const maxArmy = integer(details.maxArmy, 1, 99999);
  if (![survivalTenths, kills, bossKills, hazardsDestroyed, maxArmy].every(Number.isFinite)) return null;
  if (bossKills > kills) return null;
  return Math.floor(
    survivalTenths +
    kills * 18 +
    bossKills * 260 +
    hazardsDestroyed * 75 +
    maxArmy / 20
  );
}

function normalizeClassroomWarDetails(raw = {}) {
  const survivalTenths = integer(raw.survivalTenths, 0, 144000);
  const kills = integer(raw.kills, 0, 200000);
  const bossKills = integer(raw.bossKills, 0, 20000);
  const hazardsDestroyed = integer(raw.hazardsDestroyed, 0, 50000);
  const maxArmy = integer(raw.maxArmy, 1, 99999);
  if (![survivalTenths, kills, bossKills, hazardsDestroyed, maxArmy].every(Number.isFinite)) return null;
  if (bossKills > kills) return null;
  return {
    survivalTenths,
    kills,
    bossKills,
    hazardsDestroyed,
    maxArmy,
    period: Math.floor((survivalTenths / 10) / 30) + 1
  };
}

export function normalizeExact10Details(raw = {}) {
  const targetHundredths = integer(raw.targetHundredths, 0, 9999);
  const elapsedHundredths = integer(raw.elapsedHundredths, 0, 9999);
  if (targetHundredths !== 1000 || elapsedHundredths !== 1000) return null;
  return { targetHundredths, elapsedHundredths };
}

function definitionFor(gameId, metric, mode) {
  if (gameId === CLASSROOM_WAR_GAME_ID && metric === CLASSROOM_WAR_METRIC && mode === CLASSROOM_WAR_MODE) {
    return {
      normalizeDetails: normalizeClassroomWarDetails,
      computeValue: computeClassroomWarScore,
      strategy: 'best'
    };
  }
  if (gameId === TIMING_GAME_ID && metric === TIMING_EXACT_METRIC && mode === TIMING_EXACT_MODE) {
    return {
      normalizeDetails: normalizeExact10Details,
      computeValue: () => 1,
      strategy: 'sum',
      cooldownMs: TIMING_EXACT_COOLDOWN_MS
    };
  }
  return null;
}

function parseDetails(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch (_) { return {}; }
}

export function rankGameRecordRows(rows, selfId) {
  return [...rows]
    .map(row => ({
      studentId: String(row.student_id || ''),
      nickname: String(row.nickname || '새싹 게이머').slice(0, 12),
      value: Math.max(0, Math.floor(Number(row.value || 0))),
      details: parseDetails(row.details_json),
      achievedAt: row.achieved_at || null
    }))
    .sort((a, b) =>
      b.value - a.value ||
      String(a.achievedAt || '').localeCompare(String(b.achievedAt || '')) ||
      a.nickname.localeCompare(b.nickname, 'ko') ||
      a.studentId.localeCompare(b.studentId)
    )
    .map((row, index) => ({
      rank: index + 1,
      nickname: row.nickname,
      value: row.value,
      details: row.details,
      achievedAt: row.achievedAt,
      self: row.studentId === selfId
    }));
}

async function submitRecord(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;

  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }

  const gameId = String(body?.gameId || '').trim();
  const metric = String(body?.metric || '').trim();
  const mode = String(body?.mode || 'default').trim();
  const definition = definitionFor(gameId, metric, mode);
  if (!definition) return json({ ok: false, error: 'unsupported_game_record' }, 400);

  const details = definition.normalizeDetails(body?.details || {});
  if (!details) return json({ ok: false, error: 'invalid_record_details' }, 400);
  const computedValue = definition.computeValue(details);
  if (!Number.isFinite(computedValue) || computedValue < 0) {
    return json({ ok: false, error: 'invalid_record_value' }, 400);
  }

  const submittedValue = integer(body?.value, 0, 1000000000);
  if (!Number.isFinite(submittedValue) || submittedValue !== computedValue) {
    return json({ ok: false, error: 'record_value_mismatch', expected: computedValue }, 400);
  }

  const existing = await env.DB.prepare(`
    SELECT value, updated_at FROM game_records
    WHERE student_id = ? AND game_id = ? AND metric = ? AND mode = ?
  `).bind(auth.row.student_id, gameId, metric, mode).first();

  const previousBest = existing ? Math.max(0, Number(existing.value || 0)) : null;
  const nowDate = new Date();
  const now = nowDate.toISOString();

  if (definition.strategy === 'sum') {
    const previousUpdatedAt = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
    if (previousUpdatedAt && Number.isFinite(previousUpdatedAt) && nowDate.getTime() - previousUpdatedAt < Number(definition.cooldownMs || 0)) {
      return json({
        ok: true,
        accepted: false,
        duplicate: true,
        improved: false,
        previousBest,
        best: previousBest ?? 0,
        details,
        achievedAt: existing?.updated_at || now
      });
    }

    await env.DB.prepare(`
      INSERT INTO game_records (
        student_id, game_id, metric, mode, value, details_json, achieved_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, game_id, metric, mode) DO UPDATE SET
        value = game_records.value + excluded.value,
        details_json = excluded.details_json,
        achieved_at = excluded.achieved_at,
        updated_at = excluded.updated_at
    `).bind(
      auth.row.student_id,
      gameId,
      metric,
      mode,
      submittedValue,
      JSON.stringify(details),
      now,
      now
    ).run();
  } else {
    const improved = previousBest === null || submittedValue > previousBest;
    if (improved) {
      await env.DB.prepare(`
        INSERT INTO game_records (
          student_id, game_id, metric, mode, value, details_json, achieved_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, game_id, metric, mode) DO UPDATE SET
          value = excluded.value,
          details_json = excluded.details_json,
          achieved_at = excluded.achieved_at,
          updated_at = excluded.updated_at
        WHERE excluded.value > game_records.value
      `).bind(
        auth.row.student_id,
        gameId,
        metric,
        mode,
        submittedValue,
        JSON.stringify(details),
        now,
        now
      ).run();
    }
  }

  const saved = await env.DB.prepare(`
    SELECT value, details_json, achieved_at
    FROM game_records
    WHERE student_id = ? AND game_id = ? AND metric = ? AND mode = ?
  `).bind(auth.row.student_id, gameId, metric, mode).first();

  const savedValue = Math.max(0, Number(saved?.value || submittedValue));
  const improved = definition.strategy === 'sum' ? true : previousBest === null || submittedValue > previousBest;
  return json({
    ok: true,
    accepted: true,
    improved,
    previousBest,
    best: savedValue,
    details: parseDetails(saved?.details_json || JSON.stringify(details)),
    achievedAt: saved?.achieved_at || now
  });
}

async function getRanking(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const gameId = String(url.searchParams.get('gameId') || '').trim();
  const metric = String(url.searchParams.get('metric') || '').trim();
  const mode = String(url.searchParams.get('mode') || 'default').trim();
  if (!definitionFor(gameId, metric, mode)) {
    return json({ ok: false, error: 'unsupported_game_record' }, 400);
  }

  const result = await env.DB.prepare(`
    SELECT a.id AS student_id,
           a.nickname,
           r.value,
           r.details_json,
           r.achieved_at
    FROM game_records r
    JOIN student_accounts a ON a.id = r.student_id
    WHERE a.class_id = ?
      AND a.disabled = 0
      AND r.game_id = ?
      AND r.metric = ?
      AND r.mode = ?
  `).bind(auth.row.class_id, gameId, metric, mode).all();

  const rows = result?.results || [];
  const ranked = rankGameRecordRows(rows, auth.row.student_id);
  const classCountRow = await env.DB.prepare(`
    SELECT COUNT(*) AS count
    FROM student_accounts
    WHERE class_id = ? AND disabled = 0
  `).bind(auth.row.class_id).first();

  return json({
    ok: true,
    gameId,
    metric,
    mode,
    className: auth.row.class_name || '',
    memberCount: Math.max(0, Number(classCountRow?.count || 0)),
    participantCount: ranked.length,
    top: ranked.slice(0, 10),
    self: ranked.find(row => row.self) || null
  });
}

function methodNotAllowed(allow) {
  return json({ ok: false, error: 'method_not_allowed' }, 405, { allow });
}

export async function handleGameRecordRequest(request, env) {
  const path = new URL(request.url).pathname;
  if (path !== '/api/account/game-records/submit' && path !== '/api/account/game-records/ranking') return null;
  try {
    if (path === '/api/account/game-records/submit') {
      return request.method === 'POST' ? submitRecord(request, env) : methodNotAllowed('POST');
    }
    return request.method === 'GET' ? getRanking(request, env) : methodNotAllowed('GET');
  } catch (error) {
    const message = String(error?.message || '');
    if (/no such table: game_records|SQLITE_ERROR.*game_records/i.test(message)) {
      return json({ ok: false, error: 'game_records_schema_not_ready' }, 503);
    }
    if (/no such table|SQLITE_ERROR/i.test(message)) {
      return json({ ok: false, error: 'account_schema_not_ready' }, 503);
    }
    console.error('[Kidscade game records API]', error);
    return json({ ok: false, error: 'game_records_server_error' }, 500);
  }
}
