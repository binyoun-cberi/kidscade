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
  assert.match(game.href, /벽란도 상행기-launch\.html\?v=6$/);
});
