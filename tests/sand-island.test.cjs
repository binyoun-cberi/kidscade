'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const game = path.join(root, 'games/sand_island/index.html');
const source = fs.readFileSync(game, 'utf8');

test('sand island game is in the v7 catalog and has valid local assets', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/games.json'), 'utf8'));
  const item = catalog.games.find(g => g.id === 'sand_island');
  assert.ok(item, 'missing game catalog entry');
  assert.equal(item.href, 'games/sand_island/index.html');
  assert.equal(item.age, 'toddler');
  assert.ok(item.players.includes('solo') && item.players.includes('local2'));
  assert.ok(item.input.includes('touch') && item.input.includes('keyboard'));
  for (const file of [item.href, item.cover]) {
    assert.ok(fs.existsSync(path.join(root, file)), file + ' is missing');
  }
});
test('sand island game has valid JS and accessible primary controls', () => {
  const inline = source.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(inline, 'inline game JS missing');
  assert.doesNotThrow(() => new vm.Script(inline[1], { filename: 'sand-island.js' }));
  for (const id of ['startBtn', 'againBtn', 'pauseButton', 'resumeBtn', 'result', 'joy0', 'joy1']) {
    assert.ok(source.includes('id="' + id + '"'), id + ' control missing');
  }
  assert.match(source, /data-game-id="sand_island"/);
  assert.match(source, /KidscadeGame/);
});
test('sand island has independent graphics and a no-fail collection loop', () => {
  assert.match(source, /function collect\(/);
  assert.match(source, /function knockInward\(/);
  assert.match(source, /function aiInput\(/);
  assert.match(source, /function joystickSetup\(/);
  assert.doesNotMatch(source, /data\.win|Double Down\.exe|snd_ocean\.ogg/);
  assert.doesNotMatch(source, /gameOver\(/);
});
