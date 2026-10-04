const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('achievement gallery is parseable and loaded by the lobby runtime', () => {
  const gallery = read('achievement-gallery.js');
  const bootstrap = read('main-bootstrap.js');
  assert.doesNotThrow(() => new Function(gallery));
  assert.match(bootstrap, /achievement-gallery\.js/);
  assert.match(gallery, /kidscade:achievement-unlocked/);
  assert.match(gallery, /kidscade:achievements-changed/);
  assert.match(gallery, /업적 도감/);
  assert.match(gallery, /비밀 업적/);
});

test('Cube Architect reports achievements only through its result boundary', () => {
  const source = read('games/cube3d/cube-architect.js');
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /function reportResult\(kind,score,cleared\)/);
  assert.match(source, /cube3d\.first_blueprint/);
  assert.match(source, /cube3d\.perfect_blueprint/);
  assert.match(source, /cube3d\.net_master/);
  assert.match(source, /cube3d\.landmark_restorer/);
  assert.match(source, /cube3d\.survival_complete/);
});

test('Micro Evolution reports generation and stage achievements', () => {
  const source = read('games/high_micro_evolution/game.js');
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /high_micro_evolution\.first_generation/);
  assert.match(source, /high_micro_evolution\.generations_10/);
  assert.match(source, /high_micro_evolution\.colony/);
  assert.match(source, /high_micro_evolution\.multicellular/);
  assert.match(source, /achievementProgress\?\.\('high_micro_evolution\.generations_10',state\.reproductions\)/);
});

test('Infinite Arithmetic adopts the SDK and reports match achievements', () => {
  const html = read('games/infinite_gugudan/무한 구구단： 무한루.html');
  assert.match(html, /kidscade-game-sdk\.js/);
  assert.match(html, /data-game-id="infinite_gugudan"/);
  assert.match(html, /infinite_gugudan\.first_win/);
  assert.match(html, /infinite_gugudan\.combo_10/);
  assert.match(html, /infinite_gugudan\.combo_20/);
  assert.match(html, /infinite_gugudan\.correct_25/);
  assert.match(html, /infinite_gugudan\.fraction_win/);
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(code => code.trim());
  assert.ok(inlineScripts.length > 0);
  for (const code of inlineScripts) assert.doesNotThrow(() => new Function(code));
});


test('all active catalog games have an achievement plan or an existing pilot set', () => {
  const catalogSource = read('achievement-catalog.js');
  const raw = JSON.parse(read('data/games.json'));
  const games = (Array.isArray(raw) ? raw : raw.games || []).filter(game => !game.disabled);
  const pilotIds = new Set(['cube3d','high_micro_evolution','infinite_gugudan']);
  const planIds = new Set([...catalogSource.matchAll(/^\s{4}"([^"]+)":\[/gm)].map(match => match[1]));
  assert.equal(games.length, 139);
  assert.equal(planIds.size, games.length - pilotIds.size);
  for (const game of games) {
    if (pilotIds.has(game.id)) continue;
    assert.equal(planIds.has(game.id), true, 'missing achievement plan: ' + game.id);
  }
  assert.match(catalogSource, /completionSlot = slot === 'first_finish'/);
  assert.match(catalogSource, /trigger: completionSlot \? 'completion_count' : ''/);
  assert.doesNotMatch(catalogSource, /first_play/);
});

test('achievement catalog registers planned definitions without exposing unfinished ones', () => {
  const catalogSource = read('achievement-catalog.js');
  const raw = JSON.parse(read('data/games.json'));
  const games = (Array.isArray(raw) ? raw : raw.games || []).filter(game => !game.disabled);
  const registered = [];
  const events = [];
  const fakeDocument = {
    readyState:'complete',
    addEventListener(){},
    dispatchEvent(event){ events.push(event); return true; }
  };
  const fakeWindow = {
    KidscadeCatalog:{ games },
    KidscadeAchievements:{ registerDefinitions(defs){ registered.push(...defs); return defs.length; } }
  };
  function FakeCustomEvent(type, init = {}) { this.type = type; this.detail = init.detail; }
  const run = new Function('window','document','CustomEvent','setInterval','clearInterval', catalogSource);
  run(fakeWindow, fakeDocument, FakeCustomEvent, () => 0, () => {});
  assert.equal(registered.length, 680);
  assert.equal(registered.filter(def => def.enabled !== false).length, 423);
  assert.equal(registered.filter(def => def.enabled === false).length, 257);
  assert.equal(registered.filter(def => def.trigger === 'completion_count').length, 408);
  assert.equal(registered.filter(def => def.trigger === 'first_play').length, 0);
  assert.equal(registered.find(def => def.id === 'low_perfect_pitch.finisher_5').target, 5);
  assert.equal(registered.find(def => def.id === 'low_perfect_pitch.finisher_20').target, 20);
  assert.equal(registered.find(def => def.id === 'low_perfect_pitch.mastery').enabled, true);
  assert.equal(registered.find(def => def.id === 'low_perfect_pitch.secret').enabled, true);
  assert.equal(registered.find(def => def.id === 'high_twelve_island.mastery').enabled, false);
  assert.equal(events.some(event => event.type === 'kidscade:achievement-catalog-ready'), true);
});

test('common launcher records visits for analytics without first-play achievements', () => {
  const launcher = read('game-launcher.js');
  const catalog = read('achievement-catalog.js');
  assert.match(launcher, /KidscadeAchievements\?\.recordPlayedGame\?\.\(gameId, startedAt\)/);
  assert.doesNotMatch(catalog, /first_play/);
  assert.match(read('main-bootstrap.js'), /'achievement-catalog\.js',\s*'achievement-gallery\.js'/);
});
