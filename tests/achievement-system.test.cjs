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
