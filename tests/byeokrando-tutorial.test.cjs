const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Byeokrando launcher injects the first-voyage tutorial bridge and runtime', () => {
  const launch = read('games/high_byeokrando_voyage/벽란도 상행기-launch.html');
  assert.match(launch, /getGoods:\(\)=>GOODS/);
  assert.match(launch, /getSailState:\(\)=>sailState/);
  assert.match(launch, /persistState,/);
  assert.match(launch, /byeokrando-tutorial\.js\?v=2/);
});

test('Byeokrando tutorial parses and covers one complete trade loop', () => {
  const source = read('games/high_byeokrando_voyage/byeokrando-tutorial.js');
  assert.doesNotThrow(() => new Function(source), 'tutorial runtime must parse as JavaScript');
  assert.match(source, /kidscade_byeokrando_tutorial_v2/);
  assert.match(source, /id:'tavern'/);
  assert.match(source, /id:'rumor'/);
  assert.match(source, /id:'buy'/);
  assert.match(source, /id:'destination'/);
  assert.match(source, /id:'depart'/);
  assert.match(source, /id:'steer'/);
  assert.match(source, /id:'sailing'/);
  assert.match(source, /place === 'mingzhou'/);
  assert.match(source, /id:'sell'/);
  assert.match(source, /id:'complete'/);
});

test('Byeokrando tutorial is replayable, skippable, and suppresses the legacy two-step guide', () => {
  const source = read('games/high_byeokrando_voyage/byeokrando-tutorial.js');
  assert.match(source, /tutorialStartBtn/);
  assert.match(source, /5분 튜토리얼/);
  assert.match(source, /건너뛰기/);
  assert.match(source, /markStatus\('skipped'\)/);
  assert.match(source, /markStatus\('done'\)/);
  assert.match(source, /s\.tutorial = Math\.max\(3/);
});

test('Byeokrando catalog points at the tutorial-aware launcher revision', () => {
  const catalog = JSON.parse(read('data/games.json'));
  const game = (catalog.games || []).find(item => item && item.id === 'high_byeokrando_voyage');
  assert.ok(game, 'Byeokrando catalog entry missing');
  assert.match(game.href, /벽란도 상행기-launch\.html\?v=7$/);
});


test('Byeokrando v7 adds only historical-safe shared props', () => {
  const source = read('games/high_byeokrando_voyage/byeokrando-assets.js');
  assert.doesNotThrow(() => new Function(source));
  for (const file of ['quaternius_cc0-crate-885.glb','quaternius_cc0-well-1471.glb','quaternius_cc0-wood-log-1520.glb','quaternius_cc0-mossy-rock-1303.glb']) {
    assert.match(source, new RegExp(file.replace(/\./g,'\\.')));
  }
  assert.doesNotMatch(source,/school-bus-1323|water-tower-1470|house-1085/);
  const launch = read('games/high_byeokrando_voyage/벽란도 상행기-launch.html');
  assert.match(launch,/byeokrando-assets\.js\?v=4/);
});
