import { allowedWordchainInitials, normalizeKoreanWord, isHangulWord } from './wordchain-dictionary.mjs';

export const TURN_MS = 12000;
export const START_DELAY_MS = 3000;
export const ROOM_TTL_MS = 45 * 60 * 1000;
export const FINISHED_TTL_MS = 10 * 60 * 1000;
const STARTERS = Object.freeze([
  '사과','기차','나무','바다','학교','토끼','고래','우산','친구','공원',
  '자동차','강아지','시장','노래','과일','도서관','여행','운동장','사진','가방',
  '구름','선물','수박','지도','호수','음악','그림','바람','공책','계단'
]);

export class WordchainError extends Error {
  constructor(message, status = 409, extra = null) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
export function fail(message, status = 409, extra = null) { throw new WordchainError(message, status, extra); }

export function sanitizeNickname(value) {
  return String(value || '새싹 게이머').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 12) || '새싹 게이머';
}

function minPlayersFor(maxPlayers) { return Number(maxPlayers || 2) > 2 ? 3 : 2; }
function alivePlayers(state) { return state.players.filter(p => p.lives > 0 && !p.finishedAt); }
function playerById(state, id) { return state.players.find(p => p.id === id) || null; }

function nextAliveSlot(state, afterSlot) {
  const alive = alivePlayers(state).sort((a,b) => a.slot - b.slot);
  if (!alive.length) return null;
  const greater = alive.find(p => p.slot > Number(afterSlot));
  return (greater || alive[0]).slot;
}

function pushHistory(state, event) {
  state.history.push(event);
  if (state.history.length > 120) state.history.splice(0, state.history.length - 120);
}

function pickStarter(state) {
  const start = Math.abs((Number(state.seed) || 1) + Number(state.turnNo || 0) * 17) % STARTERS.length;
  for (let i = 0; i < STARTERS.length; i += 1) {
    const word = STARTERS[(start + i) % STARTERS.length];
    if (!state.usedWords.includes(word)) return word;
  }
  return STARTERS[start];
}

function finish(state, winnerId, now) {
  state.status = 'finished';
  state.winnerId = winnerId || null;
  state.currentSlot = null;
  state.turnDeadline = null;
  state.updatedAt = now;
  state.expiresAt = now + FINISHED_TTL_MS;
  state.version += 1;
}

function recordAction(state, actionId, playerId, result) {
  state.actions[actionId] = { playerId, result };
  state.actionOrder.push(actionId);
  while (state.actionOrder.length > 256) {
    const oldest = state.actionOrder.shift();
    delete state.actions[oldest];
  }
}

export function createState(code, identity, tokenHash, maxPlayers, now, seed) {
  const cap = Math.max(2, Math.min(8, Math.floor(Number(maxPlayers) || 2)));
  return {
    id: code,
    code,
    version: 1,
    status: 'waiting',
    maxPlayers: cap,
    hostId: identity.id,
    seed: Number(seed) || 1,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + ROOM_TTL_MS,
    startAt: null,
    winnerId: null,
    players: [{
      id: identity.id,
      nickname: sanitizeNickname(identity.nickname),
      slot: 1,
      ready: true,
      lives: 3,
      finishedAt: null,
      tokenHash
    }],
    currentWord: '',
    currentSlot: null,
    turnNo: 0,
    turnDeadline: null,
    history: [],
    usedWords: [],
    actions: {},
    actionOrder: [],
    tickets: {}
  };
}

export function addOrReconnect(state, identity, tokenHash, now) {
  const existing = playerById(state, identity.id);
  if (existing) {
    existing.tokenHash = tokenHash;
    existing.nickname = sanitizeNickname(identity.nickname || existing.nickname);
    state.updatedAt = now;
    state.expiresAt = Math.max(state.expiresAt, now + ROOM_TTL_MS);
    state.version += 1;
    return { player: existing, reconnected: true };
  }
  if (state.status !== 'waiting') fail('room_already_started', 409);
  if (state.players.length >= state.maxPlayers) fail('room_full', 409);
  const occupied = new Set(state.players.map(p => p.slot));
  let slot = 1;
  while (occupied.has(slot)) slot += 1;
  state.players.forEach(p => { p.ready = false; });
  const player = {
    id: identity.id,
    nickname: sanitizeNickname(identity.nickname),
    slot,
    ready: false,
    lives: 3,
    finishedAt: null,
    tokenHash
  };
  state.players.push(player);
  state.updatedAt = now;
  state.expiresAt = now + ROOM_TTL_MS;
  state.version += 1;
  return { player, reconnected: false };
}

export function authForHash(state, digest) {
  const player = state.players.find(p => p.tokenHash === digest);
  return player ? { id: player.id } : null;
}

function serializePlayer(player, auth, connected) {
  return {
    slot: player.slot,
    nickname: sanitizeNickname(player.nickname),
    ready: Boolean(player.ready),
    lives: Math.max(0, Math.min(3, Number(player.lives || 0))),
    eliminated: player.lives <= 0 || Boolean(player.finishedAt),
    online: connected.has(player.id) || player.id === auth.id,
    isSelf: player.id === auth.id,
    isHost: player.id === stateHost(connected.state || null)
  };
}
function stateHost(state) { return state?.hostId || null; }

export function snapshot(state, auth, connectedIds = new Set(), now = Date.now()) {
  const players = state.players
    .slice()
    .sort((a,b) => a.slot - b.slot)
    .map(player => ({
      slot: player.slot,
      nickname: sanitizeNickname(player.nickname),
      ready: Boolean(player.ready),
      lives: Math.max(0, Math.min(3, Number(player.lives || 0))),
      eliminated: player.lives <= 0 || Boolean(player.finishedAt),
      online: connectedIds.has(player.id) || player.id === auth.id,
      isSelf: player.id === auth.id,
      isHost: player.id === state.hostId
    }));
  const self = players.find(p => p.isSelf) || null;
  let result = null;
  if (state.status === 'finished') {
    let outcome = 'draw';
    if (state.winnerId === auth.id) outcome = 'win';
    else if (state.winnerId) outcome = 'lose';
    result = {
      outcome,
      winnerNickname: state.winnerId ? sanitizeNickname(state.players.find(p => p.id === state.winnerId)?.nickname) : null
    };
  }
  return {
    id: state.id,
    code: state.code,
    gameId: 'wordchain_arena',
    status: state.status,
    maxPlayers: state.maxPlayers,
    minPlayers: minPlayersFor(state.maxPlayers),
    playerCount: players.length,
    serverNow: new Date(now).toISOString(),
    startAt: state.startAt ? new Date(state.startAt).toISOString() : null,
    isHost: state.hostId === auth.id,
    self,
    players,
    canStart: state.hostId === auth.id
      && state.status === 'waiting'
      && players.length >= minPlayersFor(state.maxPlayers)
      && players.every(p => p.ready),
    match: {
      currentWord: state.currentWord,
      currentSlot: state.currentSlot,
      turnNo: state.turnNo,
      turnDeadline: state.turnDeadline ? new Date(state.turnDeadline).toISOString() : null,
      required: state.currentWord ? allowedWordchainInitials([...state.currentWord].at(-1), true) : [],
      history: state.history.slice(-60)
    },
    result
  };
}

export function setReady(state, playerId, ready, now) {
  if (state.status !== 'waiting') fail('room_already_started', 409);
  const player = playerById(state, playerId);
  if (!player) fail('not_room_participant', 403);
  player.ready = ready !== false;
  state.updatedAt = now;
  state.expiresAt = now + ROOM_TTL_MS;
  state.version += 1;
}

export function startMatch(state, playerId, now) {
  if (state.hostId !== playerId) fail('host_only', 403);
  if (state.status !== 'waiting') fail('room_already_started', 409);
  if (state.players.length < minPlayersFor(state.maxPlayers)) fail('not_enough_players', 409);
  if (!state.players.every(p => p.ready)) fail('players_not_ready', 409);
  state.players.forEach(p => { p.lives = 3; p.finishedAt = null; });
  state.status = 'playing';
  state.startAt = now + START_DELAY_MS;
  state.winnerId = null;
  state.turnNo = 0;
  state.history = [];
  state.usedWords = [];
  state.actions = {};
  state.actionOrder = [];
  const starter = pickStarter(state);
  state.usedWords.push(starter);
  state.currentWord = starter;
  const ordered = state.players.slice().sort((a,b) => a.slot - b.slot);
  state.currentSlot = ordered[Math.abs(Number(state.seed || 1)) % ordered.length].slot;
  state.turnDeadline = state.startAt + TURN_MS;
  pushHistory(state, { kind: 'starter', word: starter, turn: 0, at: new Date(now).toISOString() });
  state.updatedAt = now;
  state.expiresAt = now + ROOM_TTL_MS;
  state.version += 1;
}

export function advanceDeadline(state, now) {
  if (state.status !== 'playing' || !state.turnDeadline || now < state.turnDeadline) return false;
  if (state.startAt && now < state.startAt) return false;
  const current = state.players.find(p => p.slot === state.currentSlot);
  if (!current) return false;
  current.lives = Math.max(0, current.lives - 1);
  if (current.lives <= 0 && !current.finishedAt) current.finishedAt = now;
  pushHistory(state, {
    kind: 'timeout',
    slot: current.slot,
    nickname: sanitizeNickname(current.nickname),
    lostLife: 1,
    turn: state.turnNo,
    at: new Date(now).toISOString()
  });
  const alive = alivePlayers(state);
  if (alive.length <= 1) {
    finish(state, alive[0]?.id || null, now);
    return true;
  }
  state.currentSlot = nextAliveSlot(state, current.slot);
  state.turnNo += 1;
  state.turnDeadline = now + TURN_MS;
  state.updatedAt = now;
  state.expiresAt = now + ROOM_TTL_MS;
  state.version += 1;
  return true;
}

function validActionId(value) {
  const out = String(value || '').trim().slice(0, 80);
  return /^[A-Za-z0-9_-]{8,80}$/.test(out) ? out : '';
}

export function validateSubmission(state, playerId, body, now) {
  const actionId = validActionId(body?.actionId);
  if (!actionId) fail('invalid_action', 400);
  const prior = state.actions[actionId];
  if (prior && prior.playerId === playerId) return { duplicate: true, actionId, result: prior.result };
  if (state.status !== 'playing') fail('match_not_playing', 409);
  if (state.startAt && now < state.startAt) fail('match_not_started', 409);
  const player = playerById(state, playerId);
  if (!player) fail('not_room_participant', 403);
  if (state.currentSlot !== player.slot) fail('not_your_turn', 409);
  if (player.lives <= 0 || player.finishedAt) fail('player_eliminated', 409);
  const word = normalizeKoreanWord(body?.word);
  if (!isHangulWord(word)) fail('invalid_hangul_word', 400);
  const required = state.currentWord ? allowedWordchainInitials([...state.currentWord].at(-1), true) : [];
  if (state.currentWord && !required.includes([...word][0])) fail('wrong_initial', 422, { required });
  if (state.usedWords.includes(word)) fail('already_used', 409);
  return { duplicate: false, actionId, player, word, required };
}

export function applySubmission(state, check, continuation, now) {
  if (check.duplicate) return { duplicate: true, ...check.result };
  const { actionId, player, word } = check;
  state.usedWords.push(word);
  state.turnNo += 1;
  pushHistory(state, {
    kind: 'word',
    word,
    slot: player.slot,
    nickname: sanitizeNickname(player.nickname),
    turn: state.turnNo,
    at: new Date(now).toISOString()
  });
  let oneShot = false;
  let nextSlot = nextAliveSlot(state, player.slot);
  let nextWord = word;

  if (!continuation && alivePlayers(state).length > 1 && nextSlot != null) {
    oneShot = true;
    const victim = state.players.find(p => p.slot === nextSlot);
    if (victim) {
      victim.lives = Math.max(0, victim.lives - 1);
      if (victim.lives <= 0 && !victim.finishedAt) victim.finishedAt = now;
      pushHistory(state, {
        kind: 'one-shot',
        slot: victim.slot,
        nickname: sanitizeNickname(victim.nickname),
        lostLife: 1,
        turn: state.turnNo,
        at: new Date(now).toISOString()
      });
      const alive = alivePlayers(state);
      if (alive.length <= 1) {
        finish(state, alive[0]?.id || null, now);
        const result = { accepted: true, oneShot: true };
        recordAction(state, actionId, player.id, result);
        return { duplicate: false, ...result };
      }
      nextWord = pickStarter(state);
      if (!state.usedWords.includes(nextWord)) state.usedWords.push(nextWord);
      nextSlot = victim.lives > 0 ? victim.slot : nextAliveSlot(state, victim.slot);
      pushHistory(state, { kind: 'starter', word: nextWord, turn: state.turnNo, at: new Date(now).toISOString() });
    }
  }

  state.currentWord = nextWord;
  state.currentSlot = nextSlot;
  state.turnDeadline = now + TURN_MS;
  state.updatedAt = now;
  state.expiresAt = now + ROOM_TTL_MS;
  state.version += 1;
  const result = { accepted: true, oneShot };
  recordAction(state, actionId, player.id, result);
  return { duplicate: false, ...result };
}

export function leaveMatch(state, playerId, now) {
  const player = playerById(state, playerId);
  if (!player) return { left: true, closed: false };
  if (state.status === 'waiting') {
    if (state.hostId === playerId) {
      state.status = 'closed';
      state.updatedAt = now;
      state.version += 1;
      return { left: true, closed: true };
    }
    state.players = state.players.filter(p => p.id !== playerId);
    state.players.forEach(p => { p.ready = false; });
    state.updatedAt = now;
    state.expiresAt = now + ROOM_TTL_MS;
    state.version += 1;
    return { left: true, closed: false };
  }
  if (state.status === 'playing') {
    player.lives = 0;
    if (!player.finishedAt) player.finishedAt = now;
    pushHistory(state, {
      kind: 'leave',
      slot: player.slot,
      nickname: sanitizeNickname(player.nickname),
      turn: state.turnNo,
      at: new Date(now).toISOString()
    });
    const alive = alivePlayers(state);
    if (alive.length <= 1) {
      finish(state, alive[0]?.id || null, now);
      return { left: true, closed: false };
    }
    if (state.currentSlot === player.slot) {
      state.currentSlot = nextAliveSlot(state, player.slot);
      state.turnNo += 1;
      state.turnDeadline = now + TURN_MS;
    }
    state.updatedAt = now;
    state.expiresAt = now + ROOM_TTL_MS;
    state.version += 1;
  }
  return { left: true, closed: false };
}
