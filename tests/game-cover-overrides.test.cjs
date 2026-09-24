const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const gamesWithCovers = (catalog.games || []).filter(game => game.cover);

test('catalog covers point directly to real gate images', () => {
  assert.ok(gamesWithCovers.length >= 80, `unexpectedly few catalog covers: ${gamesWithCovers.length}`);

  for (const game of gamesWithCovers) {
    const cover = String(game.cover || '').split(/[?#]/, 1)[0];
    assert.match(cover, /^assets\/gate-image\/.+\.(?:png|jpe?g|webp)$/i, `invalid cover path: ${game.id} -> ${game.cover}`);
    const file = path.join(ROOT, cover);
    assert.equal(fs.existsSync(file), true, `missing cover image: ${game.id} -> ${cover}`);
    assert.equal(fs.statSync(file).isFile(), true, `cover is not a file: ${game.id} -> ${cover}`);
  }
});

test('uploaded Kidscade favicon exists and index declares it', () => {
  const favicon = path.join(ROOT, 'assets/gate-image/favicon.png');
  assert.equal(fs.existsSync(favicon), true);
  assert.ok(fs.statSync(favicon).size > 1000);

  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(index, /<link\s+rel="icon"[^>]+assets\/gate-image\/favicon\.png/);
});
