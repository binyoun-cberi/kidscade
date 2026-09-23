import { clampHeight, sanitizePose, nickname } from './multiplayer.mjs';

const DURATION_MS = 180000;
const START_DELAY_MS = 5000;
const ROOM_TTL_MS = 45 * 60 * 1000;
const FINISHED_TTL_MS = 10 * 60 * 1000;

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});

const newToken = () => Array.from(
  crypto.getRandomValues(new Uint8Array(32)),
  b => b.toString(16).padStart(2, '0')
).join('');

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function fail(message, status = 409) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

const iso = ms => new Date(ms).toISOString();

function randomSeed() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return Number(bytes[0] & 0x7fffffff) || 1;
}

function safeSeq(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.min(number, 0x7fffffff);
}

function mergePlayer(player, attachment) {
  if (!player || !attachment || player.id !== attachment.id) return;
  player.currentHeight = clampHeight(attachment.currentHeight);
  player.bestHeight = Math.max(
    clampHeight(player.bestHeight),
    clampHeight(attachment.bestHeight),
    player.currentHeight
  );
  if (attachment.pose) player.pose = sanitizePose(attachment.pose);
}

function connectedMap(ctx) {
  const map = new Map();
  for (const ws of ctx.getWebSockets()) {
    try {
      const attachment = ws.deserializeAttachment();
      if (attachment?.id) map.set(attachment.id, attachment);
    } catch (_) {}
  }
  return map;
}

function resolveWinner(players) {
  if (!Array.isArray(players) || players.length < 2) return null;
  const [a, b] = players;
  if (clampHeight(a.currentHeight) === clampHeight(b.currentHeight)) return null;
  return clampHeight(a.currentHeight) > clampHeight(b.currentHeight) ? a.id : b.id;
}

function playerView(player, selfId, hostId, live) {
  const merged = { ...player };
  mergePlayer(merged, live.get(player.id));
  return {
    nickname: merged.nickname,
    slot: merged.slot,
    ready: Boolean(merged.ready),
    currentHeight: clampHeight(merged.currentHeight),
    bestHeight: clampHeight(merged.bestHeight),
    pose: merged.pose || null,
    finished: Boolean(merged.finishedAt),
    online: live.has(merged.id) || merged.id === selfId,
    isSelf: merged.id === selfId,
    isHost: merged.id === hostId
  };
}

function snapshot(state, auth, ctx) {
  const live = connectedMap(ctx);
  const players = state.players.map(player => playerView(player, auth.id, state.hostId, live));
  const self = players.find(player => player.isSelf) || null;
  const opponent = players.find(player => !player.isSelf) || null;
  let result = null;

  if (state.status === 'finished') {
    let outcome = 'draw';
    if (state.winnerId === auth.id) outcome = 'win';
    else if (state.winnerId) outcome = 'lose';
    result = {
      outcome,
      winnerNickname: state.winnerId
        ? state.players.find(player => player.id === state.winnerId)?.nickname || null
        : null
    };
  }

  return {
    id: state.code,
    code: state.code,
    gameId: 'patience_tower_duel',
    transport: 'v2',
    status: state.status,
    seed: state.seed,
    durationSec: 180,
    startAt: state.startAt ? iso(state.startAt) : null,
    endAt: state.endAt ? iso(state.endAt) : null,
    serverNow: iso(Date.now()),
    self,
    opponent,
    result
  };
}

export class TowerRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.state = null;
    this.queue = Promise.resolve();
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.state = await ctx.storage.get('room') || null;
    });
    if (typeof WebSocketRequestResponsePair !== 'undefined') {
      ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    }
  }

  serial(fn) {
    const task = this.queue.then(async () => {
      await this.ready;
      return fn();
    });
    this.queue = task.catch(() => {});
    return task;
  }

  async commit(state) {
    this.state = state;
    await this.ctx.storage.put('room', state);
    const due = state.status === 'playing' && state.endAt ? state.endAt : state.expiresAt;
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 50, due));
  }

  mergeSockets() {
    if (!this.state) return;
    const live = connectedMap(this.ctx);
    for (const player of this.state.players) mergePlayer(player, live.get(player.id));
  }

  broadcast() {
    if (!this.state) return;
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const auth = ws.deserializeAttachment();
        if (auth?.id) ws.send(JSON.stringify({ type: 'state', room: snapshot(this.state, auth, this.ctx) }));
      } catch (_) {
        try { ws.close(1011, 'send_failed'); } catch (_) {}
      }
    }
  }

  broadcastPose(senderId, payload) {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const auth = ws.deserializeAttachment();
        if (auth?.id && auth.id !== senderId) {
          ws.send(JSON.stringify({ type: 'pose', player: payload }));
        }
      } catch (_) {}
    }
  }

  async finish(now = Date.now()) {
    if (!this.state || this.state.status !== 'playing') return;
    this.mergeSockets();
    this.state.status = 'finished';
    this.state.winnerId = resolveWinner(this.state.players);
    this.state.finishedAt = now;
    this.state.expiresAt = now + FINISHED_TTL_MS;
    for (const player of this.state.players) player.finishedAt = player.finishedAt || now;
    await this.commit(this.state);
    this.broadcast();
  }

  async due() {
    if (!this.state) return;
    const now = Date.now();

    if (this.state.status === 'playing' && this.state.endAt && now >= this.state.endAt) {
      await this.finish(this.state.endAt);
      return;
    }

    if (now >= this.state.expiresAt) {
      for (const ws of this.ctx.getWebSockets()) {
        try { ws.close(1000, 'room_expired'); } catch (_) {}
      }
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      this.state = null;
    }
  }

  async authenticate(request) {
    const raw = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
    if (!/^[a-f0-9]{64}$/.test(raw)) fail('not_room_participant', 403);
    const digest = await sha256(raw);
    const player = this.state?.players.find(candidate => candidate.tokenHash === digest);
    if (!player) fail('not_room_participant', 403);
    return {
      id: player.id,
      slot: player.slot,
      role: player.id === this.state.hostId ? 'host' : 'player'
    };
  }

  fetch(request) {
    return this.serial(async () => {
      try {
        return await this.handle(request);
      } catch (error) {
        return json(
          { ok: false, error: error.status ? error.message : 'multiplayer_internal_error' },
          error.status || 500
        );
      }
    });
  }

  async handle(request) {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();
    const body = request.method === 'POST' ? await request.json() : {};
    const now = Date.now();

    await this.due();

    if (action === 'rooms') {
      if (this.state) fail('room_exists');
      const id = request.headers.get('x-kc-student-id');
      const name = nickname(request.headers.get('x-kc-nickname'));
      if (!id) fail('not_authenticated', 401);

      const participantToken = newToken();
      const state = {
        code: url.searchParams.get('code'),
        seed: randomSeed(),
        status: 'waiting',
        hostId: id,
        winnerId: null,
        startAt: null,
        endAt: null,
        finishedAt: null,
        players: [{
          id,
          slot: 1,
          nickname: name,
          ready: false,
          currentHeight: 0,
          bestHeight: 0,
          pose: null,
          finishedAt: null,
          tokenHash: await sha256(participantToken)
        }],
        tickets: {},
        expiresAt: now + ROOM_TTL_MS
      };

      await this.commit(state);
      return json({
        ok: true,
        transport: 'v2',
        participantToken,
        room: snapshot(state, { id, slot: 1, role: 'host' }, this.ctx)
      }, 201);
    }

    if (!this.state) fail('room_not_found', 404);

    if (action === 'join') {
      const id = request.headers.get('x-kc-student-id');
      const name = nickname(request.headers.get('x-kc-nickname'));
      if (!id) fail('not_authenticated', 401);

      let player = this.state.players.find(candidate => candidate.id === id);
      const participantToken = newToken();

      if (player) {
        player.tokenHash = await sha256(participantToken);
      } else {
        if (this.state.status !== 'waiting') fail('room_already_started');
        if (this.state.players.length >= 2) fail('room_full');

        player = {
          id,
          slot: 2,
          nickname: name,
          ready: false,
          currentHeight: 0,
          bestHeight: 0,
          pose: null,
          finishedAt: null,
          tokenHash: await sha256(participantToken)
        };
        this.state.players.push(player);
        for (const candidate of this.state.players) candidate.ready = false;
      }

      this.state.expiresAt = Math.max(this.state.expiresAt, now + ROOM_TTL_MS);
      await this.commit(this.state);
      this.broadcast();

      return json({
        ok: true,
        transport: 'v2',
        participantToken,
        room: snapshot(this.state, {
          id,
          slot: player.slot,
          role: id === this.state.hostId ? 'host' : 'player'
        }, this.ctx)
      }, 201);
    }

    if (action === 'socket') return this.connect(request);

    const auth = await this.authenticate(request);

    if (action === 'state') return json({ ok: true, room: snapshot(this.state, auth, this.ctx) });

    if (action === 'ticket') {
      const ticket = newToken();
      this.state.tickets[auth.id] = {
        hash: await sha256(ticket),
        expiresAt: now + 60000,
        auth
      };
      await this.commit(this.state);
      return json({ ok: true, ticket, expiresIn: 60 });
    }

    const player = this.state.players.find(candidate => candidate.id === auth.id);

    if (action === 'ready') {
      if (this.state.status !== 'waiting') fail('room_already_started');
      player.ready = body.ready !== false;

      if (this.state.players.length === 2 && this.state.players.every(candidate => candidate.ready)) {
        this.state.status = 'playing';
        this.state.startAt = now + START_DELAY_MS;
        this.state.endAt = this.state.startAt + DURATION_MS;
        this.state.expiresAt = this.state.endAt + FINISHED_TTL_MS;
        for (const candidate of this.state.players) {
          candidate.currentHeight = 0;
          candidate.bestHeight = 0;
          candidate.pose = null;
          candidate.finishedAt = null;
        }
      }

      await this.commit(this.state);
      this.broadcast();
      return json({ ok: true, room: snapshot(this.state, auth, this.ctx) });
    }

    if (action === 'leave') {
      if (this.state.status === 'waiting') {
        if (auth.id === this.state.hostId) {
          for (const ws of this.ctx.getWebSockets()) {
            try { ws.close(1000, 'host_left'); } catch (_) {}
          }
          await this.ctx.storage.deleteAlarm();
          await this.ctx.storage.deleteAll();
          this.state = null;
        } else {
          this.state.players = this.state.players.filter(candidate => candidate.id !== auth.id);
          for (const candidate of this.state.players) candidate.ready = false;
          await this.commit(this.state);
          this.broadcast();
        }
        return json({ ok: true, left: true });
      }

      if (this.state.status === 'playing') {
        this.mergeSockets();
        player.currentHeight = 0;
        player.finishedAt = now;
        const opponent = this.state.players.find(candidate => candidate.id !== auth.id);
        this.state.status = 'finished';
        this.state.winnerId = opponent?.id || null;
        this.state.finishedAt = now;
        this.state.expiresAt = now + FINISHED_TTL_MS;
        await this.commit(this.state);
        this.broadcast();
      }

      return json({ ok: true, left: true });
    }

    fail('not_found', 404);
  }

  async connect(request) {
    const url = new URL(request.url);
    if (request.headers.get('origin') !== url.origin) fail('invalid_origin', 403);
    if ((request.headers.get('upgrade') || '').toLowerCase() !== 'websocket') {
      fail('websocket_required', 426);
    }

    const raw = url.searchParams.get('ticket') || '';
    const digest = await sha256(raw);
    const entry = Object.entries(this.state.tickets)
      .find(([, value]) => value.hash === digest && value.expiresAt > Date.now());
    if (!entry) fail('not_room_participant', 403);

    const [id, { auth }] = entry;
    delete this.state.tickets[id];
    await this.commit(this.state);

    for (const old of this.ctx.getWebSockets()) {
      if (old.deserializeAttachment()?.id === id) {
        try { old.close(4001, 'replaced'); } catch (_) {}
      }
    }

    const player = this.state.players.find(candidate => candidate.id === id);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      ...auth,
      currentHeight: player.currentHeight,
      bestHeight: player.bestHeight,
      pose: player.pose,
      lastSeq: 0,
      lastPoseAt: 0
    });
    server.send(JSON.stringify({ type: 'state', room: snapshot(this.state, auth, this.ctx) }));
    this.broadcast();

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    return this.serial(async () => {
      await this.ready;
      if (!this.state) return;

      if (message === 'sync') {
        const auth = ws.deserializeAttachment();
        if (auth?.id) {
          ws.send(JSON.stringify({ type: 'state', room: snapshot(this.state, auth, this.ctx) }));
        }
        return;
      }

      let data;
      try { data = JSON.parse(String(message)); } catch (_) {
        ws.close(1008, 'invalid_message');
        return;
      }
      if (data?.type !== 'pose') return;

      const attachment = ws.deserializeAttachment();
      if (!attachment?.id || this.state.status !== 'playing') return;

      const now = Date.now();
      if (now < (this.state.startAt || 0) - 250 || now > (this.state.endAt || 0) + 500) return;

      const sequence = safeSeq(data.seq);
      if (sequence <= safeSeq(attachment.lastSeq) || now - Number(attachment.lastPoseAt || 0) < 70) return;

      attachment.lastSeq = sequence;
      attachment.lastPoseAt = now;
      attachment.currentHeight = clampHeight(data.currentHeight);
      attachment.bestHeight = Math.max(
        clampHeight(attachment.bestHeight),
        clampHeight(data.bestHeight),
        attachment.currentHeight
      );
      attachment.pose = sanitizePose(data.pose);
      ws.serializeAttachment(attachment);

      const player = this.state.players.find(candidate => candidate.id === attachment.id);
      if (player) {
        player.currentHeight = attachment.currentHeight;
        player.bestHeight = attachment.bestHeight;
        player.pose = attachment.pose;
      }

      this.broadcastPose(attachment.id, {
        nickname: player?.nickname || '상대',
        currentHeight: attachment.currentHeight,
        bestHeight: attachment.bestHeight,
        pose: attachment.pose,
        seq: sequence
      });

      if (now >= this.state.endAt) await this.finish(this.state.endAt);
    });
  }

  webSocketClose(ws) {
    return this.serial(async () => {
      await this.ready;
      if (!this.state) return;
      const attachment = ws.deserializeAttachment();
      const player = this.state.players.find(candidate => candidate.id === attachment?.id);
      if (player) {
        mergePlayer(player, attachment);
        await this.commit(this.state);
      }
      this.broadcast();
    });
  }

  webSocketError(ws) {
    try { ws.close(1011, 'connection_error'); } catch (_) {}
  }

  alarm() {
    return this.serial(async () => {
      await this.ready;
      await this.due();
      if (this.state && this.state.status !== 'finished') await this.commit(this.state);
    });
  }
}
