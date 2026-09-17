const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin'
});

const SESSION_COOKIE = 'kc_session';
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const ROOM_TTL_MS = 30 * 60 * 1000;
const RESULT_GRACE_MS = 2500;
const ONLINE_WINDOW_MS = 6000;
const MAX_HEIGHT_M = 2000;
const ALLOWED_DUEL_SKINS = new Set(['green','blue','pink','yellow','beige']);

const GAME_DEFINITIONS = Object.freeze({
  patience_tower_duel: Object.freeze({
    gameId: 'patience_tower_duel',
    maxPlayers: 2,
    durationSec: 180
  })
});

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
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

function nowIso(ms = Date.now()) {
  return new Date(ms).toISOString();
}

export function normalizeRoomCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(value) {
  return new RegExp(`^[${ROOM_ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(normalizeRoomCode(value));
}

export function clampHeight(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(MAX_HEIGHT_M, number));
}

export function sanitizePose(value) {
  const pose = value && typeof value === 'object' ? value : {};
  const finite = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const x = Math.max(0, Math.min(900, finite(pose.x, 92)));
  const y = Math.max(-100000, Math.min(500, finite(pose.y, -22)));
  const vx = Math.max(-1200, Math.min(1200, finite(pose.vx, 0)));
  const vy = Math.max(-1600, Math.min(1600, finite(pose.vy, 0)));
  const face = finite(pose.face, 1) < 0 ? -1 : 1;
  const skin = ALLOWED_DUEL_SKINS.has(String(pose.skin || '')) ? String(pose.skin) : 'blue';
  return { x, y, vx, vy, face, skin, onGround: Boolean(pose.onGround) };
}

function parseStoredPose(value) {
  if (!value) return null;
  try { return sanitizePose(JSON.parse(String(value))); } catch (_) { return null; }
}

export function resolveWinner(players = []) {
  if (!Array.isArray(players) || players.length < 2) return null;
  const ordered = [...players]
    .map(player => ({
      studentId: String(player.student_id || player.studentId || ''),
      current: clampHeight(player.current_value ?? player.currentHeight)
    }))
    .sort((a, b) => b.current - a.current || a.studentId.localeCompare(b.studentId));
  if (!ordered[0].studentId || ordered[0].current === ordered[1].current) return null;
  return ordered[0].studentId;
}

function randomCode() {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += ROOM_ALPHABET[bytes[i] % ROOM_ALPHABET.length];
  return out;
}

function randomSeed() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return Number(bytes[0] & 0x7fffffff) || 1;
}

function nickname(value) {
  return String(value || '새싹 게이머').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 12) || '새싹 게이머';
}

async function uniqueRoomCode(env) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomCode();
    const exists = await env.DB.prepare('SELECT 1 AS found FROM multiplayer_rooms WHERE room_code = ?').bind(code).first();
    if (!exists) return code;
  }
  throw new Error('room-code-exhausted');
}

async function cleanupExpired(env, now = Date.now()) {
  await env.DB.prepare('DELETE FROM multiplayer_rooms WHERE expires_at < ?').bind(nowIso(now)).run();
}

async function fetchRoom(env, roomId) {
  const room = await env.DB.prepare(`
    SELECT id, room_code, game_id, created_by_student_id, seed, status, max_players,
           duration_sec, start_at, end_at, winner_student_id, created_at, updated_at, expires_at
    FROM multiplayer_rooms
    WHERE id = ?
  `).bind(roomId).first();
  if (!room) return null;
  const playerRows = await env.DB.prepare(`
    SELECT room_id, student_id, slot, nickname, ready, current_value, best_value, state_json,
           finished_at, last_seen_at, joined_at
    FROM multiplayer_room_players
    WHERE room_id = ?
    ORDER BY slot ASC
  `).bind(roomId).all();
  return { room, players: playerRows.results || [] };
}

function serializePlayer(player, serverNow) {
  if (!player) return null;
  const lastSeenMs = player.last_seen_at ? new Date(player.last_seen_at).getTime() : 0;
  return {
    nickname: nickname(player.nickname),
    slot: Number(player.slot || 0),
    ready: Boolean(player.ready),
    currentHeight: clampHeight(player.current_value),
    bestHeight: clampHeight(player.best_value),
    pose: parseStoredPose(player.state_json),
    finished: Boolean(player.finished_at),
    online: Boolean(lastSeenMs && serverNow - lastSeenMs <= ONLINE_WINDOW_MS)
  };
}

function serializeRoom(bundle, selfId, serverNow = Date.now()) {
  const { room, players } = bundle;
  const self = players.find(player => player.student_id === selfId) || null;
  const opponent = players.find(player => player.student_id !== selfId) || null;
  let result = null;
  if (room.status === 'finished') {
    let outcome = 'draw';
    if (room.winner_student_id === selfId) outcome = 'win';
    else if (room.winner_student_id) outcome = 'lose';
    result = {
      outcome,
      winnerNickname: room.winner_student_id
        ? nickname(players.find(player => player.student_id === room.winner_student_id)?.nickname)
        : null
    };
  }
  return {
    id: room.id,
    code: room.room_code,
    gameId: room.game_id,
    status: room.status,
    seed: Number(room.seed || 1),
    durationSec: Number(room.duration_sec || 180),
    startAt: room.start_at || null,
    endAt: room.end_at || null,
    serverNow: nowIso(serverNow),
    self: serializePlayer(self, serverNow),
    opponent: serializePlayer(opponent, serverNow),
    result
  };
}

async function ensureParticipant(env, roomId, studentId) {
  return env.DB.prepare(`
    SELECT room_id, student_id, slot, nickname, ready, current_value, best_value, state_json,
           finished_at, last_seen_at, joined_at
    FROM multiplayer_room_players
    WHERE room_id = ? AND student_id = ?
  `).bind(roomId, studentId).first();
}

async function createRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const gameId = String(body?.gameId || '').trim();
  const definition = GAME_DEFINITIONS[gameId];
  if (!definition) return json({ ok: false, error: 'unsupported_multiplayer_game' }, 400);

  const now = Date.now();
  await cleanupExpired(env, now);
  const roomId = crypto.randomUUID();
  const code = await uniqueRoomCode(env);
  const seed = randomSeed();
  const createdAt = nowIso(now);
  const expiresAt = nowIso(now + ROOM_TTL_MS);

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO multiplayer_rooms (
        id, room_code, game_id, created_by_student_id, seed, status, max_players,
        duration_sec, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?, ?)
    `).bind(
      roomId, code, gameId, auth.row.student_id, seed, definition.maxPlayers,
      definition.durationSec, createdAt, createdAt, expiresAt
    ),
    env.DB.prepare(`
      INSERT INTO multiplayer_room_players (
        room_id, student_id, slot, nickname, ready, current_value, best_value,
        last_seen_at, joined_at
      ) VALUES (?, ?, 1, ?, 0, 0, 0, ?, ?)
    `).bind(roomId, auth.row.student_id, nickname(auth.row.nickname), createdAt, createdAt)
  ]);

  const bundle = await fetchRoom(env, roomId);
  return json({ ok: true, room: serializeRoom(bundle, auth.row.student_id, now) });
}

async function joinRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const code = normalizeRoomCode(body?.code);
  if (!isValidRoomCode(code)) return json({ ok: false, error: 'invalid_room_code' }, 400);

  const now = Date.now();
  await cleanupExpired(env, now);
  const room = await env.DB.prepare(`
    SELECT id, status, max_players, expires_at
    FROM multiplayer_rooms
    WHERE room_code = ? AND game_id = 'patience_tower_duel'
  `).bind(code).first();
  if (!room) return json({ ok: false, error: 'room_not_found' }, 404);
  if (!['waiting'].includes(room.status)) return json({ ok: false, error: 'room_already_started' }, 409);

  const existing = await ensureParticipant(env, room.id, auth.row.student_id);
  if (!existing) {
    const playerRows = await env.DB.prepare('SELECT slot FROM multiplayer_room_players WHERE room_id = ? ORDER BY slot').bind(room.id).all();
    const players = playerRows.results || [];
    if (players.length >= Number(room.max_players || 2)) return json({ ok: false, error: 'room_full' }, 409);
    const occupied = new Set(players.map(player => Number(player.slot)));
    const slot = occupied.has(1) ? 2 : 1;
    const at = nowIso(now);
    await env.DB.prepare(`
      INSERT INTO multiplayer_room_players (
        room_id, student_id, slot, nickname, ready, current_value, best_value,
        last_seen_at, joined_at
      ) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)
    `).bind(room.id, auth.row.student_id, slot, nickname(auth.row.nickname), at, at).run();
  } else {
    await env.DB.prepare('UPDATE multiplayer_room_players SET last_seen_at = ? WHERE room_id = ? AND student_id = ?')
      .bind(nowIso(now), room.id, auth.row.student_id).run();
  }

  const bundle = await fetchRoom(env, room.id);
  return json({ ok: true, room: serializeRoom(bundle, auth.row.student_id, now) });
}

async function maybeStartRoom(env, roomId, now) {
  const bundle = await fetchRoom(env, roomId);
  if (!bundle || bundle.room.status !== 'waiting') return bundle;
  const players = bundle.players;
  if (players.length !== Number(bundle.room.max_players || 2) || !players.every(player => Boolean(player.ready))) return bundle;

  const startMs = now + 5000;
  const endMs = startMs + Number(bundle.room.duration_sec || 180) * 1000;
  await env.DB.prepare(`
    UPDATE multiplayer_rooms
    SET status = 'playing', start_at = ?, end_at = ?, updated_at = ?, expires_at = ?
    WHERE id = ? AND status = 'waiting' AND start_at IS NULL
  `).bind(
    nowIso(startMs), nowIso(endMs), nowIso(now), nowIso(endMs + 10 * 60 * 1000), roomId
  ).run();
  return fetchRoom(env, roomId);
}

async function setReady(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const roomId = String(body?.roomId || '').trim();
  if (!roomId) return json({ ok: false, error: 'room_required' }, 400);
  const participant = await ensureParticipant(env, roomId, auth.row.student_id);
  if (!participant) return json({ ok: false, error: 'not_room_participant' }, 403);
  const bundle = await fetchRoom(env, roomId);
  if (!bundle) return json({ ok: false, error: 'room_not_found' }, 404);
  if (bundle.room.status !== 'waiting') return json({ ok: false, error: 'room_already_started' }, 409);

  const now = Date.now();
  await env.DB.prepare(`
    UPDATE multiplayer_room_players
    SET ready = ?, last_seen_at = ?
    WHERE room_id = ? AND student_id = ?
  `).bind(body?.ready === false ? 0 : 1, nowIso(now), roomId, auth.row.student_id).run();
  const startedBundle = await maybeStartRoom(env, roomId, now);
  return json({ ok: true, room: serializeRoom(startedBundle, auth.row.student_id, now) });
}

async function finalizeRoomIfNeeded(env, bundle, now) {
  if (!bundle || bundle.room.status !== 'playing' || !bundle.room.end_at) return bundle;
  const endMs = new Date(bundle.room.end_at).getTime();
  if (!Number.isFinite(endMs) || now < endMs) return bundle;
  const players = bundle.players;
  const bothFinished = players.length >= 2 && players.every(player => Boolean(player.finished_at));
  if (!bothFinished && now < endMs + RESULT_GRACE_MS) return bundle;

  const winnerStudentId = resolveWinner(players);
  await env.DB.prepare(`
    UPDATE multiplayer_rooms
    SET status = 'finished', winner_student_id = ?, updated_at = ?, expires_at = ?
    WHERE id = ? AND status = 'playing'
  `).bind(winnerStudentId, nowIso(now), nowIso(now + 10 * 60 * 1000), bundle.room.id).run();
  return fetchRoom(env, bundle.room.id);
}

async function syncRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const roomId = String(body?.roomId || '').trim();
  if (!roomId) return json({ ok: false, error: 'room_required' }, 400);
  const participant = await ensureParticipant(env, roomId, auth.row.student_id);
  if (!participant) return json({ ok: false, error: 'not_room_participant' }, 403);

  let bundle = await fetchRoom(env, roomId);
  if (!bundle) return json({ ok: false, error: 'room_not_found' }, 404);
  const now = Date.now();
  const room = bundle.room;
  const startMs = room.start_at ? new Date(room.start_at).getTime() : NaN;
  const endMs = room.end_at ? new Date(room.end_at).getTime() : NaN;
  const canReportHeight = room.status === 'playing' && Number.isFinite(startMs) && now >= startMs - 750;
  const withinFinalGrace = !Number.isFinite(endMs) || now <= endMs + RESULT_GRACE_MS;

  if (canReportHeight && withinFinalGrace) {
    const current = clampHeight(body?.currentHeight);
    const best = Math.max(current, clampHeight(body?.bestHeight));
    const poseJson = body?.pose ? JSON.stringify(sanitizePose(body.pose)) : null;
    const markFinished = Boolean(body?.finished) && Number.isFinite(endMs) && now >= endMs - 1250;
    await env.DB.prepare(`
      UPDATE multiplayer_room_players
      SET current_value = ?,
          best_value = CASE WHEN best_value > ? THEN best_value ELSE ? END,
          state_json = COALESCE(?, state_json),
          finished_at = CASE WHEN ? = 1 THEN COALESCE(finished_at, ?) ELSE finished_at END,
          last_seen_at = ?
      WHERE room_id = ? AND student_id = ?
    `).bind(
      current, best, best, poseJson, markFinished ? 1 : 0, nowIso(now), nowIso(now), roomId, auth.row.student_id
    ).run();
  } else {
    await env.DB.prepare(`
      UPDATE multiplayer_room_players
      SET last_seen_at = ?
      WHERE room_id = ? AND student_id = ?
    `).bind(nowIso(now), roomId, auth.row.student_id).run();
  }

  bundle = await fetchRoom(env, roomId);
  bundle = await finalizeRoomIfNeeded(env, bundle, now);
  return json({ ok: true, room: serializeRoom(bundle, auth.row.student_id, now) });
}

async function leaveRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const roomId = String(body?.roomId || '').trim();
  if (!roomId) return json({ ok: false, error: 'room_required' }, 400);
  const bundle = await fetchRoom(env, roomId);
  if (!bundle) return json({ ok: true, left: true });
  const self = bundle.players.find(player => player.student_id === auth.row.student_id);
  if (!self) return json({ ok: true, left: true });
  const now = Date.now();

  if (bundle.room.status === 'waiting') {
    if (bundle.room.created_by_student_id === auth.row.student_id) {
      await env.DB.prepare('DELETE FROM multiplayer_rooms WHERE id = ?').bind(roomId).run();
    } else {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM multiplayer_room_players WHERE room_id = ? AND student_id = ?').bind(roomId, auth.row.student_id),
        env.DB.prepare(`
          UPDATE multiplayer_room_players SET ready = 0 WHERE room_id = ?
        `).bind(roomId)
      ]);
    }
    return json({ ok: true, left: true });
  }

  if (bundle.room.status === 'playing') {
    const opponent = bundle.players.find(player => player.student_id !== auth.row.student_id) || null;
    await env.DB.prepare(`
      UPDATE multiplayer_room_players
      SET current_value = 0, finished_at = COALESCE(finished_at, ?), last_seen_at = ?
      WHERE room_id = ? AND student_id = ?
    `).bind(nowIso(now), nowIso(now), roomId, auth.row.student_id).run();
    await env.DB.prepare(`
      UPDATE multiplayer_rooms
      SET status = 'finished', winner_student_id = ?, updated_at = ?, expires_at = ?
      WHERE id = ? AND status = 'playing'
    `).bind(opponent?.student_id || null, nowIso(now), nowIso(now + 10 * 60 * 1000), roomId).run();
  }
  return json({ ok: true, left: true });
}

export async function handleMultiplayerRequest(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/multiplayer/')) return null;
  try {
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/rooms') return createRoom(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/join') return joinRoom(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/ready') return setReady(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/sync') return syncRoom(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/leave') return leaveRoom(request, env);
    return json({ ok: false, error: 'not_found' }, 404);
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/no such table|multiplayer_rooms|multiplayer_room_players/i.test(message)) {
      return json({ ok: false, error: 'multiplayer_database_not_ready' }, 503);
    }
    console.error('multiplayer request failed', error);
    return json({ ok: false, error: 'multiplayer_internal_error' }, 500);
  }
}
