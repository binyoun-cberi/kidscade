const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT, 'games', 'toddler_photo_coloring');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'games.json'), 'utf8'));

test('Photo Coloring is registered for toddler and low elementary players', () => {
  const game = catalog.games.find((item) => item.id === 'toddler_photo_coloring');
  assert.ok(game);
  assert.equal(game.age, 'toddler');
  assert.deepEqual(game.ages, ['toddler', 'low']);
  assert.match(game.href, /games\/toddler_photo_coloring\/index\.html/);
});

test('Photo Coloring stays local and exposes the planned first-release flow', () => {
  assert.match(html, /type="file"/);
  assert.match(html, /data-preset="simple"/);
  assert.match(html, /data-preset="normal"/);
  assert.match(html, /data-preset="detail"/);
  assert.match(html, /data-game-id="toddler_photo_coloring"/);
  assert.match(js, /sobelMask/);
  assert.match(js, /buildRegions/);
  assert.match(js, /toBlob/);
  assert.match(js, /downloadCanvas/);
  assert.doesNotMatch(js, /fetch\s*\(/);
  assert.doesNotMatch(js, /XMLHttpRequest/);
});
