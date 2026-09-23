const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin'
});

const SESSION_COOKIE = 'kc_session';
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const ROOM_TTL_MS = 45 * 60 * 1000;
const ONLINE_WINDOW_MS = 45000;
const PRESENCE_WRITE_MS = 15000;
const TURN_MS = 12000;
const START_DELAY_MS = 3000;
const GAME_ID = 'wordchain_arena';
const CHO_KEYS = Object.freeze(['g','gg','n','d','dd','r','m','b','bb','s','ss','ng','j','jj','ch','k','t','p','h']);
const IOTIZED_OR_I = new Set([2,6,7,12,17,20]);
const STARTERS = Object.freeze([
  '사과','기차','나무','바다','학교','토끼','고래','우산','친구','공원',
  '자동차','강아지','시장','노래','과일','도서관','여행','운동장','사진','가방',
  '구름','선물','수박','지도','호수','음악','그림','바람','공책','계단'
]);

const assetCaches = new WeakMap();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function nowIso(ms = Date.now()) {
  return new Date(ms).toISOString();
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
    SELECT a.id AS student_id, a.class_id, a.nickname, a.disabled, s.expires_at
    FROM student_sessions s
    JOIN student_accounts a ON a.id = s.student_id
    WHERE s.token_hash = ?
  `).bind(tokenHash).first();
  if (!row || row.disabled) return { response: json({ ok: false, error: 'not_authenticated' }, 401) };
  if (!row.expires_at || new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM student_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return { response: json({ ok: false, error: 'session_expired' }, 401) };
  }
  return { row };
}

function nickname(value) {
  return String(value || '새싹 게이머').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 12) || '새싹 게이머';
}

export function normalizeWordchainRoomCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
}

function isValidRoomCode(value) {
  return new RegExp(`^[${ROOM_ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(normalizeWordchainRoomCode(value));
}

function randomCode() {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += ROOM_ALPHABET[byte % ROOM_ALPHABET.length];
  return out;
}

function randomSeed() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return Number(bytes[0] & 0x7fffffff) || 1;
}

async function uniqueRoomCode(env) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const code = randomCode();
    const row = await env.DB.prepare('SELECT 1 AS found FROM multiplayer_rooms WHERE room_code = ?').bind(code).first();
    if (!row) return code;
  }
  throw new Error('room-code-exhausted');
}

function normalizeKoreanWord(value) {
  return String(value || '').normalize('NFC').replace(/[\s·ㆍ・\-]/g, '').trim().slice(0, 24);
}

function isHangulWord(value) {
  const chars = [...normalizeKoreanWord(value)];
  return chars.length >= 2 && chars.length <= 24 && chars.every(char => {
    const code = char.codePointAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });
}

function replaceInitial(syllable, nextInitialIndex) {
  const code = syllable.codePointAt(0) - 0xac00;
  if (code < 0 || code > 11171) return syllable;
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  return String.fromCodePoint(0xac00 + (nextInitialIndex * 21 + jung) * 28 + jong);
}

export function allowedWordchainInitials(lastSyllable, useDueum = true) {
  const syllable = String(lastSyllable || '').normalize('NFC').slice(0, 1);
  const codePoint = syllable.codePointAt(0);
  if (!codePoint || codePoint < 0xac00 || codePoint > 0xd7a3) return [];
  const out = [syllable];
  if (!useDueum) return out;
  const code = codePoint - 0xac00;
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  if (cho === 5) out.push(replaceInitial(syllable, IOTIZED_OR_I.has(jung) ? 11 : 2));
  else if (cho === 2 && IOTIZED_OR_I.has(jung)) out.push(replaceInitial(syllable, 11));
  return [...new Set(out)];
}

function bucketKeyForSyllable(value) {
  const syllable = String(value || '').normalize('NFC').slice(0, 1);
  const code = syllable.codePointAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return CHO_KEYS[Math.floor(code / 588)] || null;
}

function cacheFor(env) {
  if (!env?.ASSETS || typeof env.ASSETS.fetch !== 'function') throw new Error('wordchain-static-assets-not-configured');
  let cache = assetCaches.get(env.ASSETS);
  if (!cache) {
    cache = { manifest: null, manifestPromise: null, blocked: null, blockedPromise: null, groups: new Map() };
    assetCaches.set(env.ASSETS, cache);
  }
  return cache;
}

async function assetText(request, env, path) {
  const url = new URL(path, request.url);
  const response = await env.ASSETS.fetch(new Request(url.toString(), { method: 'GET' }));
  if (!response.ok) throw new Error(`wordchain-asset-${response.status}`);
  return response.text();
}

async function dictionaryManifest(request, env) {
  const cache = cacheFor(env);
  if (cache.manifest) return cache.manifest;
  if (!cache.manifestPromise) {
    cache.manifestPromise = assetText(request, env, '/data/wordchain/manifest.json')
      .then(text => JSON.parse(text))
      .then(manifest => {
        if (!manifest?.groups) throw new Error('invalid-wordchain-manifest');
        cache.manifest = manifest;
        return manifest;
      })
      .catch(error => {
        cache.manifestPromise = null;
        throw error;
      });
  }
  return cache.manifestPromise;
}

async function blockedWords(request, env) {
  const cache = cacheFor(env);
  if (cache.blocked) return cache.blocked;
  if (!cache.blockedPromise) {
    cache.blockedPromise = assetText(request, env, '/data/wordchain/blocked-words.txt')
      .then(text => new Set(text.split(/\r?\n/).map(normalizeKoreanWord).filter(Boolean)))
      .catch(() => new Set())
      .then(set => {
        cache.blocked = set;
        return set;
      });
  }
  return cache.blockedPromise;
}

async function dictionarySetForKey(request, env, key) {
  if (!key) return new Set();
  const cache = cacheFor(env);
  const manifest = await dictionaryManifest(request, env);
  let targetName = null;
  let targetInfo = null;
  for (const [name, info] of Object.entries(manifest.groups || {})) {
    if (Array.isArray(info?.keys) && info.keys.includes(key)) {
      targetName = name;
      targetInfo = info;
      break;
    }
  }
  if (!targetName || !targetInfo?.file) return new Set();
  if (!cache.groups.has(targetName)) {
    cache.groups.set(targetName, (async () => {
      const blocked = await blockedWords(request, env);
      const text = await assetText(request, env, `/data/wordchain/${targetInfo.file}`);
      const byKey = new Map();
      for (const groupKey of targetInfo.keys || []) byKey.set(groupKey, new Set());
      for (const raw of text.split(/\r?\n/)) {
        const word = normalizeKoreanWord(raw);
        if (!word || blocked.has(word)) continue;
        const wordKey = bucketKeyForSyllable([...word][0]);
        if (!byKey.has(wordKey)) byKey.set(wordKey, new Set());
        byKey.get(wordKey).add(word);
      }
      return byKey;
    })().catch(error => {
      cache.groups.delete(targetName);
      throw error;
    }));
  }
  const byKey = await cache.groups.get(targetName);
  return byKey.get(key) || new Set();
}

async function dictionaryLookup(request, env, word) {
  const normalized = normalizeKoreanWord(word);
  const blocked = await blockedWords(request, env);
  if (blocked.has(normalized)) return { exists: false, blocked: true };
  const key = bucketKeyForSyllable([...normalized][0]);
  const set = await dictionarySetForKey(request, env, key);
  return { exists: set.has(normalized), blocked: false };
}

async function hasContinuation(request, env, word, usedWords) {
  const last = [...word].at(-1);
  const initials = allowedWordchainInitials(last, true);
  for (const initial of initials) {
    const key = bucketKeyForSyllable(initial);
    const set = await dictionarySetForKey(request, env, key);
    for (const candidate of set) {
      if (usedWords.has(candidate)) continue;
      if (initials.includes([...candidate][0])) return true;
    }
  }
  return false;
}

function parseHistory(value) {
  try {
    const rows = JSON.parse(String(value || '[]'));
    return Array.isArray(rows) ? rows : [];
  } catch (_) {
    return [];
  }
}

function pushHistory(history, event) {
  const next = [...history, event];
  return next.slice(Math.max(0, next.length - 120));
}

async function cleanupExpired(env, now = Date.now()) {
  await env.DB.prepare('DELETE FROM multiplayer_rooms WHERE expires_at < ?').bind(nowIso(now)).run();
}

async function fetchRoomBundle(env, roomId) {
  const room = await env.DB.prepare(`
    SELECT id, room_code, game_id, created_by_student_id, seed, status, max_players,
           start_at, winner_student_id, created_at, updated_at, expires_at
    FROM multiplayer_rooms
    WHERE id = ? AND game_id = ?
  `).bind(roomId, GAME_ID).first();
  if (!room) return null;
  const playersResult = await env.DB.prepare(`
    SELECT room_id, student_id, slot, nickname, ready, current_value, finished_at, last_seen_at, joined_at
    FROM multiplayer_room_players
    WHERE room_id = ?
    ORDER BY slot ASC
  `).bind(roomId).all();
  const state = await env.DB.prepare(`
    SELECT room_id, current_word, current_slot, turn_no, turn_deadline, history_json, updated_at
    FROM wordchain_match_state
    WHERE room_id = ?
  `).bind(roomId).first();
  return { room, players: playersResult.results || [], state };
}

function minPlayers(room) {
  return Number(room?.max_players || 2) > 2 ? 3 : 2;
}

function alivePlayers(players) {
  return players.filter(player => Number(player.current_value || 0) > 0 && !player.finished_at);
}

function nextAliveSlot(players, afterSlot) {
  const alive = alivePlayers(players).sort((a, b) => Number(a.slot) - Number(b.slot));
  if (!alive.length) return null;
  const greater = alive.find(player => Number(player.slot) > Number(afterSlot));
  return Number((greater || alive[0]).slot);
}

function serializePlayer(player, selfId, serverNow, hostId) {
  const seen = player.last_seen_at ? new Date(player.last_seen_at).getTime() : 0;
  const lives = Math.max(0, Math.min(3, Number(player.current_value || 0)));
  return {
    slot: Number(player.slot || 0),
    nickname: nickname(player.nickname),
    ready: Boolean(player.ready),
    lives,
    eliminated: lives <= 0 || Boolean(player.finished_at),
    online: Boolean(seen && serverNow - seen <= ONLINE_WINDOW_MS),
    isSelf: player.student_id === selfId,
    isHost: player.student_id === hostId
  };
}

function serializeRoom(bundle, selfId, serverNow = Date.now()) {
  if (!bundle) return null;
  const { room, players, state } = bundle;
  const serializedPlayers = players.map(player => serializePlayer(player, selfId, serverNow, room.created_by_student_id));
  const self = serializedPlayers.find(player => player.isSelf) || null;
  const history = parseHistory(state?.history_json);
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
  const required = state?.current_word
    ? allowedWordchainInitials([...state.current_word].at(-1), true)
    : [];
  return {
    id: room.id,
    code: room.room_code,
    gameId: room.game_id,
    status: room.status,
    maxPlayers: Number(room.max_players || 2),
    minPlayers: minPlayers(room),
    playerCount: players.length,
    serverNow: nowIso(serverNow),
    startAt: room.start_at || null,
    isHost: room.created_by_student_id === selfId,
    self,
    players: serializedPlayers,
    canStart: room.created_by_student_id === selfId
      && room.status === 'waiting'
      && players.length >= minPlayers(room)
      && players.every(player => Boolean(player.ready)),
    match: {
      currentWord: state?.current_word || '',
      currentSlot: state?.current_slot == null ? null : Number(state.current_slot),
      turnNo: Number(state?.turn_no || 0),
      turnDeadline: state?.turn_deadline || null,
      required,
      history: history.slice(-60)
    },
    result
  };
}

async function createRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const requested = Math.floor(Number(body?.maxPlayers) || 2);
  const maxPlayers = Math.max(2, Math.min(8, requested));
  const now = Date.now();
  await cleanupExpired(env, now);
  const id = crypto.randomUUID();
  const code = await uniqueRoomCode(env);
  const seed = randomSeed();
  const at = nowIso(now);
  const expires = nowIso(now + ROOM_TTL_MS);

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO multiplayer_rooms (
        id, room_code, game_id, created_by_student_id, seed, status, max_players,
        duration_sec, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'waiting', ?, 0, ?, ?, ?)
    `).bind(id, code, GAME_ID, auth.row.student_id, seed, maxPlayers, at, at, expires),
    env.DB.prepare(`
      INSERT INTO multiplayer_room_players (
        room_id, student_id, slot, nickname, ready, current_value, best_value,
        last_seen_at, joined_at
      ) VALUES (?, ?, 1, ?, 1, 3, 3, ?, ?)
    `).bind(id, auth.row.student_id, nickname(auth.row.nickname), at, at),
    env.DB.prepare(`
      INSERT INTO wordchain_match_state (
        room_id, current_word, current_slot, turn_no, turn_deadline, history_json, updated_at
      ) VALUES (?, '', NULL, 0, NULL, '[]', ?)
    `).bind(id, at)
  ]);

  return json({ ok: true, room: serializeRoom(await fetchRoomBundle(env, id), auth.row.student_id, now) });
}

async function joinRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const code = normalizeWordchainRoomCode(body?.code);
  if (!isValidRoomCode(code)) return json({ ok: false, error: 'invalid_room_code' }, 400);
  const now = Date.now();
  await cleanupExpired(env, now);
  const room = await env.DB.prepare(`
    SELECT id, status, max_players
    FROM multiplayer_rooms
    WHERE room_code = ? AND game_id = ?
  `).bind(code, GAME_ID).first();
  if (!room) return json({ ok: false, error: 'room_not_found' }, 404);
  if (room.status !== 'waiting') return json({ ok: false, error: 'room_already_started' }, 409);

  const existing = await env.DB.prepare(
    'SELECT slot FROM multiplayer_room_players WHERE room_id = ? AND student_id = ?'
  ).bind(room.id, auth.row.student_id).first();

  if (!existing) {
    const rows = await env.DB.prepare(
      'SELECT slot FROM multiplayer_room_players WHERE room_id = ? ORDER BY slot'
    ).bind(room.id).all();
    const occupied = new Set((rows.results || []).map(row => Number(row.slot)));
    if (occupied.size >= Number(room.max_players || 2)) return json({ ok: false, error: 'room_full' }, 409);
    let slot = 1;
    while (occupied.has(slot)) slot += 1;
    const at = nowIso(now);
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO multiplayer_room_players (
          room_id, student_id, slot, nickname, ready, current_value, best_value,
          last_seen_at, joined_at
        ) VALUES (?, ?, ?, ?, 0, 3, 3, ?, ?)
      `).bind(room.id, auth.row.student_id, slot, nickname(auth.row.nickname), at, at),
      env.DB.prepare('UPDATE multiplayer_room_players SET ready = 0 WHERE room_id = ?').bind(room.id)
    ]);
  } else {
    await env.DB.prepare(
      'UPDATE multiplayer_room_players SET last_seen_at = ? WHERE room_id = ? AND student_id = ?'
    ).bind(nowIso(now), room.id, auth.row.student_id).run();
  }
  return json({ ok: true, room: serializeRoom(await fetchRoomBundle(env, room.id), auth.row.student_id, now) });
}

async function readyRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const roomId = String(body?.roomId || '');
  const bundle = await fetchRoomBundle(env, roomId);
  if (!bundle) return json({ ok: false, error: 'room_not_found' }, 404);
  if (bundle.room.status !== 'waiting') return json({ ok: false, error: 'room_already_started' }, 409);
  const self = bundle.players.find(player => player.student_id === auth.row.student_id);
  if (!self) return json({ ok: false, error: 'not_room_participant' }, 403);
  const now = Date.now();
  await env.DB.prepare(`
    UPDATE multiplayer_room_players
    SET ready = ?, last_seen_at = ?
    WHERE room_id = ? AND student_id = ?
  `).bind(body?.ready === false ? 0 : 1, nowIso(now), roomId, auth.row.student_id).run();
  return json({ ok: true, room: serializeRoom(await fetchRoomBundle(env, roomId), auth.row.student_id, now) });
}

function pickStarter(seed, turnNo, usedSet) {
  const start = Math.abs((Number(seed) || 1) + Number(turnNo || 0) * 17) % STARTERS.length;
  for (let i = 0; i < STARTERS.length; i += 1) {
    const word = STARTERS[(start + i) % STARTERS.length];
    if (!usedSet.has(word)) return word;
  }
  return STARTERS[start];
}

async function startRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const roomId = String(body?.roomId || '');
  const bundle = await fetchRoomBundle(env, roomId);
  if (!bundle) return json({ ok: false, error: 'room_not_found' }, 404);
  if (bundle.room.created_by_student_id !== auth.row.student_id) return json({ ok: false, error: 'host_only' }, 403);
  if (bundle.room.status !== 'waiting') return json({ ok: false, error: 'room_already_started' }, 409);
  if (bundle.players.length < minPlayers(bundle.room)) return json({ ok: false, error: 'not_enough_players' }, 409);
  if (!bundle.players.every(player => Boolean(player.ready))) return json({ ok: false, error: 'players_not_ready' }, 409);

  const now = Date.now();
  const startMs = now + START_DELAY_MS;
  const starter = pickStarter(bundle.room.seed, 0, new Set());
  const ordered = [...bundle.players].sort((a,b) => Number(a.slot) - Number(b.slot));
  const first = ordered[Math.abs(Number(bundle.room.seed || 1)) % ordered.length];
  const history = [{ kind: 'starter', word: starter, turn: 0, at: nowIso(now) }];

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE multiplayer_rooms
      SET status = 'playing', start_at = ?, updated_at = ?, expires_at = ?
      WHERE id = ? AND status = 'waiting'
    `).bind(nowIso(startMs), nowIso(now), nowIso(now + ROOM_TTL_MS), roomId),
    env.DB.prepare(`
      UPDATE multiplayer_room_players
      SET current_value = 3, best_value = 3, finished_at = NULL, last_seen_at = ?
      WHERE room_id = ?
    `).bind(nowIso(now), roomId),
    env.DB.prepare('DELETE FROM wordchain_used_words WHERE room_id = ?').bind(roomId),
    env.DB.prepare('DELETE FROM wordchain_actions WHERE room_id = ?').bind(roomId),
    env.DB.prepare(`
      UPDATE wordchain_match_state
      SET current_word = ?, current_slot = ?, turn_no = 0, turn_deadline = ?,
          history_json = ?, updated_at = ?
      WHERE room_id = ?
    `).bind(starter, Number(first.slot), nowIso(startMs + TURN_MS), JSON.stringify(history), nowIso(now), roomId),
    env.DB.prepare(`
      INSERT OR IGNORE INTO wordchain_used_words (room_id, word, student_id, turn_no, created_at)
      VALUES (?, ?, NULL, 0, ?)
    `).bind(roomId, starter, nowIso(now))
  ]);

  return json({ ok: true, room: serializeRoom(await fetchRoomBundle(env, roomId), auth.row.student_id, now) });
}

async function finishRoom(env, bundle, winnerId, now, history = null) {
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE multiplayer_rooms
      SET status = 'finished', winner_student_id = ?, updated_at = ?, expires_at = ?
      WHERE id = ? AND status = 'playing'
    `).bind(winnerId || null, nowIso(now), nowIso(now + 10 * 60 * 1000), bundle.room.id),
    env.DB.prepare(`
      UPDATE wordchain_match_state
      SET current_slot = NULL, turn_deadline = NULL,
          history_json = COALESCE(?, history_json), updated_at = ?
      WHERE room_id = ?
    `).bind(history ? JSON.stringify(history) : null, nowIso(now), bundle.room.id)
  ]);
}

async function advanceExpiredTurn(env, roomId, now = Date.now(), existingBundle = null) {
  let bundle = existingBundle || await fetchRoomBundle(env, roomId);
  if (!bundle || bundle.room.status !== 'playing' || !bundle.state) return bundle;
  const startMs = bundle.room.start_at ? new Date(bundle.room.start_at).getTime() : NaN;
  if (Number.isFinite(startMs) && now < startMs) return bundle;
  const deadline = bundle.state.turn_deadline ? new Date(bundle.state.turn_deadline).getTime() : NaN;
  if (!Number.isFinite(deadline) || now < deadline) return bundle;

  const currentSlot = Number(bundle.state.current_slot);
  const current = bundle.players.find(player => Number(player.slot) === currentSlot);
  if (!current) return bundle;
  const nextLives = Math.max(0, Number(current.current_value || 0) - 1);
  const projected = bundle.players.map(player => player.student_id === current.student_id
    ? { ...player, current_value: nextLives, finished_at: nextLives <= 0 ? nowIso(now) : player.finished_at }
    : player);
  const alive = alivePlayers(projected);
  let history = pushHistory(parseHistory(bundle.state.history_json), {
    kind: 'timeout', slot: currentSlot, nickname: nickname(current.nickname),
    lostLife: 1, turn: Number(bundle.state.turn_no || 0), at: nowIso(now)
  });

  if (alive.length <= 1) {
    await env.DB.prepare(`
      UPDATE multiplayer_room_players
      SET current_value = ?, finished_at = CASE WHEN ? <= 0 THEN COALESCE(finished_at, ?) ELSE finished_at END,
          last_seen_at = last_seen_at
      WHERE room_id = ? AND student_id = ?
    `).bind(nextLives, nextLives, nowIso(now), roomId, current.student_id).run();
    await finishRoom(env, bundle, alive[0]?.student_id || null, now, history);
    return fetchRoomBundle(env, roomId);
  }

  const nextSlot = nextAliveSlot(projected, currentSlot);
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE multiplayer_room_players
      SET current_value = ?, finished_at = CASE WHEN ? <= 0 THEN COALESCE(finished_at, ?) ELSE finished_at END
      WHERE room_id = ? AND student_id = ?
    `).bind(nextLives, nextLives, nowIso(now), roomId, current.student_id),
    env.DB.prepare(`
      UPDATE wordchain_match_state
      SET current_slot = ?, turn_no = turn_no + 1, turn_deadline = ?, history_json = ?, updated_at = ?
      WHERE room_id = ?
    `).bind(nextSlot, nowIso(now + TURN_MS), JSON.stringify(history), nowIso(now), roomId)
  ]);
  return fetchRoomBundle(env, roomId);
}

async function usedWordSet(env, roomId) {
  const rows = await env.DB.prepare('SELECT word FROM wordchain_used_words WHERE room_id = ?').bind(roomId).all();
  return new Set((rows.results || []).map(row => String(row.word || '')));
}

function actionId(value) {
  const out = String(value || '').trim().slice(0, 80);
  return /^[A-Za-z0-9_-]{8,80}$/.test(out) ? out : '';
}

async function submitWord(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const roomId = String(body?.roomId || '');
  const idempotencyKey = actionId(body?.actionId);
  if (!roomId || !idempotencyKey) return json({ ok: false, error: 'invalid_action' }, 400);

  const existingAction = await env.DB.prepare(`
    SELECT response_json FROM wordchain_actions WHERE room_id = ? AND action_id = ? AND student_id = ?
  `).bind(roomId, idempotencyKey, auth.row.student_id).first();
  if (existingAction?.response_json) {
    try { return json(JSON.parse(existingAction.response_json)); } catch (_) {}
  }

  const now = Date.now();
  let bundle = await advanceExpiredTurn(env, roomId, now);
  if (!bundle) return json({ ok: false, error: 'room_not_found' }, 404);
  const self = bundle.players.find(player => player.student_id === auth.row.student_id);
  if (!self) return json({ ok: false, error: 'not_room_participant' }, 403);
  if (bundle.room.status !== 'playing') return json({ ok: false, error: 'match_not_playing' }, 409);
  const startMs = bundle.room.start_at ? new Date(bundle.room.start_at).getTime() : NaN;
  if (Number.isFinite(startMs) && now < startMs) return json({ ok: false, error: 'match_not_started' }, 409);
  if (Number(bundle.state?.current_slot) !== Number(self.slot)) return json({ ok: false, error: 'not_your_turn' }, 409);
  if (Number(self.current_value || 0) <= 0 || self.finished_at) return json({ ok: false, error: 'player_eliminated' }, 409);

  const word = normalizeKoreanWord(body?.word);
  if (!isHangulWord(word)) return json({ ok: false, error: 'invalid_hangul_word' }, 400);
  const previous = normalizeKoreanWord(bundle.state?.current_word);
  const required = allowedWordchainInitials([...previous].at(-1), true);
  if (previous && !required.includes([...word][0])) {
    return json({ ok: false, error: 'wrong_initial', required }, 422);
  }

  const used = await usedWordSet(env, roomId);
  if (used.has(word)) return json({ ok: false, error: 'already_used' }, 409);
  const lookup = await dictionaryLookup(request, env, word);
  if (lookup.blocked) return json({ ok: false, error: 'word_not_allowed' }, 422);
  if (!lookup.exists) return json({ ok: false, error: 'word_not_found' }, 404);

  used.add(word);
  const currentTurn = Number(bundle.state?.turn_no || 0);
  let history = pushHistory(parseHistory(bundle.state?.history_json), {
    kind: 'word', word, slot: Number(self.slot), nickname: nickname(self.nickname),
    turn: currentTurn + 1, at: nowIso(now)
  });
  const projectedAlive = alivePlayers(bundle.players);
  let nextSlot = nextAliveSlot(bundle.players, Number(self.slot));
  let nextWord = word;
  let deadline = now + TURN_MS;
  let oneShot = false;
  let penalty = null;
  let winnerId = null;

  const continuation = await hasContinuation(request, env, word, used);
  if (!continuation && projectedAlive.length > 1 && nextSlot != null) {
    oneShot = true;
    const victim = bundle.players.find(player => Number(player.slot) === Number(nextSlot));
    if (victim) {
      const victimLives = Math.max(0, Number(victim.current_value || 0) - 1);
      penalty = { player: victim, lives: victimLives };
      const projected = bundle.players.map(player => player.student_id === victim.student_id
        ? { ...player, current_value: victimLives, finished_at: victimLives <= 0 ? nowIso(now) : player.finished_at }
        : player);
      const alive = alivePlayers(projected);
      history = pushHistory(history, {
        kind: 'one-shot', slot: Number(victim.slot), nickname: nickname(victim.nickname),
        lostLife: 1, turn: currentTurn + 1, at: nowIso(now)
      });
      if (alive.length <= 1) {
        winnerId = alive[0]?.student_id || null;
        nextSlot = null;
        deadline = null;
      } else {
        const starter = pickStarter(bundle.room.seed, currentTurn + 1, used);
        used.add(starter);
        nextWord = starter;
        nextSlot = victimLives > 0 ? Number(victim.slot) : nextAliveSlot(projected, Number(victim.slot));
        history = pushHistory(history, {
          kind: 'starter', word: starter, turn: currentTurn + 1, at: nowIso(now)
        });
      }
    }
  }

  const statements = [
    env.DB.prepare(`
      INSERT INTO wordchain_used_words (room_id, word, student_id, turn_no, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(roomId, word, auth.row.student_id, currentTurn + 1, nowIso(now))
  ];

  if (penalty) {
    statements.push(env.DB.prepare(`
      UPDATE multiplayer_room_players
      SET current_value = ?, finished_at = CASE WHEN ? <= 0 THEN COALESCE(finished_at, ?) ELSE finished_at END
      WHERE room_id = ? AND student_id = ?
    `).bind(penalty.lives, penalty.lives, nowIso(now), roomId, penalty.player.student_id));
  }

  if (oneShot && nextWord !== word && !winnerId) {
    statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO wordchain_used_words (room_id, word, student_id, turn_no, created_at)
      VALUES (?, ?, NULL, ?, ?)
    `).bind(roomId, nextWord, currentTurn + 1, nowIso(now)));
  }

  statements.push(env.DB.prepare(`
    UPDATE wordchain_match_state
    SET current_word = ?, current_slot = ?, turn_no = turn_no + 1,
        turn_deadline = ?, history_json = ?, updated_at = ?
    WHERE room_id = ? AND current_slot = ? AND turn_no = ?
  `).bind(
    nextWord, nextSlot, deadline ? nowIso(deadline) : null, JSON.stringify(history),
    nowIso(now), roomId, Number(self.slot), currentTurn
  ));

  await env.DB.batch(statements);

  if (winnerId !== null) {
    bundle = await fetchRoomBundle(env, roomId);
    await finishRoom(env, bundle, winnerId, now, history);
  }

  bundle = await fetchRoomBundle(env, roomId);
  const payload = {
    ok: true,
    accepted: true,
    oneShot,
    room: serializeRoom(bundle, auth.row.student_id, now)
  };
  await env.DB.prepare(`
    INSERT OR REPLACE INTO wordchain_actions (room_id, action_id, student_id, response_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(roomId, idempotencyKey, auth.row.student_id, JSON.stringify(payload), nowIso(now)).run();
  return json(payload);
}

async function stateRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const roomId = String(body?.roomId || '');
  let bundle = await fetchRoomBundle(env, roomId);
  if (!bundle) return json({ ok: false, error: 'room_not_found' }, 404);
  const self = bundle.players.find(player => player.student_id === auth.row.student_id);
  if (!self) return json({ ok: false, error: 'not_room_participant' }, 403);
  const now = Date.now();
  const seen = Date.parse(self.last_seen_at);
  if (!Number.isFinite(seen) || now - seen >= PRESENCE_WRITE_MS) {
    await env.DB.prepare(`
      UPDATE multiplayer_room_players SET last_seen_at = ? WHERE room_id = ? AND student_id = ?
    `).bind(nowIso(now), roomId, auth.row.student_id).run();
    self.last_seen_at = nowIso(now);
  }
  bundle = await advanceExpiredTurn(env, roomId, now, bundle);
  return json({ ok: true, room: serializeRoom(bundle, auth.row.student_id, now) });
}

async function leaveRoom(request, env) {
  const auth = await requireStudent(request, env);
  if (auth.response) return auth.response;
  let body;
  try { body = await parseJson(request); } catch (_) { return json({ ok: false, error: 'invalid_json' }, 400); }
  const roomId = String(body?.roomId || '');
  let bundle = await fetchRoomBundle(env, roomId);
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
        env.DB.prepare('UPDATE multiplayer_room_players SET ready = 0 WHERE room_id = ?').bind(roomId)
      ]);
    }
    return json({ ok: true, left: true });
  }

  if (bundle.room.status === 'playing') {
    await env.DB.prepare(`
      UPDATE multiplayer_room_players
      SET current_value = 0, finished_at = COALESCE(finished_at, ?), last_seen_at = ?
      WHERE room_id = ? AND student_id = ?
    `).bind(nowIso(now), nowIso(now), roomId, auth.row.student_id).run();
    bundle = await fetchRoomBundle(env, roomId);
    const alive = alivePlayers(bundle.players);
    let history = pushHistory(parseHistory(bundle.state?.history_json), {
      kind: 'leave', slot: Number(self.slot), nickname: nickname(self.nickname), turn: Number(bundle.state?.turn_no || 0), at: nowIso(now)
    });
    if (alive.length <= 1) {
      await finishRoom(env, bundle, alive[0]?.student_id || null, now, history);
    } else if (Number(bundle.state?.current_slot) === Number(self.slot)) {
      await env.DB.prepare(`
        UPDATE wordchain_match_state
        SET current_slot = ?, turn_no = turn_no + 1, turn_deadline = ?, history_json = ?, updated_at = ?
        WHERE room_id = ?
      `).bind(nextAliveSlot(bundle.players, Number(self.slot)), nowIso(now + TURN_MS), JSON.stringify(history), nowIso(now), roomId).run();
    } else {
      await env.DB.prepare(`
        UPDATE wordchain_match_state SET history_json = ?, updated_at = ? WHERE room_id = ?
      `).bind(JSON.stringify(history), nowIso(now), roomId).run();
    }
  }
  return json({ ok: true, left: true });
}

export async function handleWordchainMatchRequest(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/multiplayer/wordchain/')) return null;
  try {
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/wordchain/rooms') return createRoom(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/wordchain/join') return joinRoom(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/wordchain/ready') return readyRoom(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/wordchain/start') return startRoom(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/wordchain/state') return stateRoom(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/wordchain/submit') return submitWord(request, env);
    if (request.method === 'POST' && url.pathname === '/api/multiplayer/wordchain/leave') return leaveRoom(request, env);
    return json({ ok: false, error: 'not_found' }, 404);
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/no such table|wordchain_match_state|wordchain_used_words|wordchain_actions/i.test(message)) {
      return json({ ok: false, error: 'multiplayer_database_not_ready' }, 503);
    }
    if (/wordchain-static-assets-not-configured|wordchain-asset-|invalid-wordchain-manifest/i.test(message)) {
      console.error('wordchain static dictionary failed', error);
      return json({ ok: false, error: 'wordchain_dictionary_not_ready' }, 503);
    }
    console.error('wordchain multiplayer failed', error);
    return json({ ok: false, error: 'multiplayer_internal_error' }, 500);
  }
}

