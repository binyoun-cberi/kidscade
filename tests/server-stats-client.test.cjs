const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'server-stats.js'), 'utf8');

function statsClient(fetch) {
  const values = new Map();
  const beacons = [];
  const storage = {
    getJson(key, fallback) { return values.has(key) ? values.get(key) : fallback; },
    setJson(key, value) { values.set(key, structuredClone(value)); return true; },
    getRaw() { return ''; },
    setRaw() { return true; }
  };
  const window = { KidscadeStorage:storage };
  const context = {
    window, fetch, Blob,
    navigator:{ sendBeacon(url, body) { beacons.push({ url, body }); return true; } },
    document:{ getElementById() { return null; } },
    setTimeout() { return 1; },
    console
  };
  vm.runInNewContext(source, context, { filename:'server-stats.js' });
  return { api:window.KidscadeServerStats, values, beacons };
}

test('play events survive network failure, unload, and later retry without client duplicates', async () => {
  let reachable = false;
  const requests = [];
  const client = statsClient(async (url, options) => {
    requests.push({ url, data:JSON.parse(options.body) });
    if (!reachable) throw new Error('offline');
    return {
      ok:true,
      json:async () => ({
        ok:true, counted:true, weekKey:'2026-10-19',
        game:{ weeklyPlays:1, totalPlays:1 }
      })
    };
  });
  const eventId = '550e8400-e29b-41d4-a716-446655440000';
  const pending = client.api.recordPlay('demo', 31, eventId);
  assert.equal(client.values.get('statsPendingPlays').length, 1, 'enqueue must persist before awaiting fetch');
  await pending;
  assert.equal(client.values.get('statsPendingPlays').length, 1, 'failed request must not discard the play');

  client.api.flushPending({ unloading:true });
  assert.equal(client.beacons.length, 1);
  assert.equal(client.beacons[0].body.type, 'application/json');
  assert.equal(client.values.get('statsPendingPlays').length, 1, 'a beacon alone is not an acknowledgement');

  reachable = true;
  await client.api.flushPending();
  assert.equal(client.values.get('statsPendingPlays').length, 0);
  assert.equal(client.api.current.games.demo.weeklyPlays, 1);
  const prior = requests.length;
  await client.api.recordPlay('demo', 40, eventId);
  assert.equal(requests.length, prior, 'same session must not send again after acknowledgement');
});

test('duplicate record calls with the same pending session ID share one upload', async () => {
  let resolveRequest;
  const requests = [];
  const client = statsClient(async (url, options) => {
    requests.push(JSON.parse(options.body));
    return new Promise(resolve => { resolveRequest = resolve; });
  });
  const eventId = '550e8400-e29b-41d4-a716-446655440001';
  const first = client.api.recordPlay('demo', 30, eventId);
  const second = client.api.recordPlay('demo', 35, eventId);
  assert.equal(client.values.get('statsPendingPlays').length, 1);
  assert.equal(requests.length, 1);
  resolveRequest({ ok:true, json:async () => ({ ok:true, weekKey:'2026-10-19', game:{ weeklyPlays:1,totalPlays:1 } }) });
  await Promise.all([first, second]);
  assert.equal(requests.length, 1);
  assert.equal(client.values.get('statsPendingPlays').length, 0);
});

test('stats update dispatch is wired to refresh the recommended home rail', () => {
  const home = fs.readFileSync(path.resolve(__dirname, '..', 'home-v2.js'), 'utf8');
  assert.match(source, /kidscade:server-stats-updated/);
  assert.match(home, /addEventListener\('kidscade:server-stats-updated', scheduleRender\)/);
});

test('standalone game counts one session after real interaction and ignores iframe use', () => {
  const tracker = fs.readFileSync(path.resolve(__dirname, '..', 'app/platform/standalone-play-stats.js'), 'utf8');
  const listeners = new Map();
  const documentListeners = new Map();
  const queued = [];
  const timers = [];
  let clock = 1000;
  const window = {
    addEventListener(name, callback) { listeners.set(name, callback); },
    KidscadeServerStats: {
      recordPlay(...args) { queued.push(args); },
      flushPending() {}
    }
  };
  window.top = window.self = window;
  const document = {
    currentScript:{ dataset:{ gameId:'demo' } },
    addEventListener(name, callback) { documentListeners.set(name, callback); },
    visibilityState:'visible'
  };
  const context = {
    window, document, Date:{ now:() => clock },
    setTimeout(callback) { timers.push(callback); },
    console
  };
  vm.runInNewContext(tracker, context);
  clock = 2000;
  listeners.get('pointerdown')();
  clock = 31000;
  listeners.get('pagehide')();
  assert.equal(queued.length, 0, '29 seconds is not a completed session');
  clock = 32100;
  timers[0]();
  assert.equal(queued.length, 1);
  assert.equal(queued[0][0], 'demo');
  assert.ok(queued[0][1] >= 30);
  listeners.get('pagehide')();
  assert.equal(queued.length, 1, 'unloading after the first count cannot enqueue a second play');

  const iframe = { ...window, top:{}, self:{} };
  const iframeListeners = [];
  iframe.addEventListener = name => iframeListeners.push(name);
  vm.runInNewContext(tracker, { ...context, window:iframe });
  assert.deepEqual(iframeListeners, [], 'lobby iframes must leave counting to the launcher');
});

test('Cloudflare injects direct-link play tracking into each catalog game', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'scripts/inject-game-integrations.cjs'), 'utf8');
  assert.match(source, /standalone-play-stats\.js/);
  assert.match(source, /\/app\/platform\/standalone-play-stats\.js/);
  assert.match(source, /data-game-id/);
  assert.match(source, /data-kc-standalone/);
});
