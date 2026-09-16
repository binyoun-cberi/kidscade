const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/game-cover-overrides.json'), 'utf8'));
const ids = new Set((catalog.games || []).map(game => game.id));

test('every cover override points to a known catalog game and real image', () => {
  const entries = Object.entries(overrides);
  assert.ok(entries.length > 0);

  for (const [gameId, cover] of entries) {
    assert.equal(ids.has(gameId), true, `unknown game id: ${gameId}`);
    assert.match(cover, /^assets\/gate-image\/.+\.png$/i);
    const file = path.join(ROOT, cover);
    assert.equal(fs.existsSync(file), true, `missing cover image: ${cover}`);
    assert.equal(fs.statSync(file).isFile(), true, `cover is not a file: ${cover}`);
  }
});

test('uploaded Kidscade favicon exists and index declares it', () => {
  const favicon = path.join(ROOT, 'assets/gate-image/favicon.png');
  assert.equal(fs.existsSync(favicon), true);
  assert.ok(fs.statSync(favicon).size > 1000);

  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(index, /<link\s+rel="icon"[^>]+assets\/gate-image\/favicon\.png/);
});
