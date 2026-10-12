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
    assert.match(cover, /^assets\/gate-image\/.+\.(?:png|jpe?g|webp|svg)$/i, `invalid cover path: ${game.id} -> ${game.cover}`);
    const file = path.join(ROOT, cover);
    assert.equal(fs.existsSync(file), true, `missing cover image: ${game.id} -> ${cover}`);
    assert.equal(fs.statSync(file).isFile(), true, `cover is not a file: ${game.id} -> ${cover}`);
    if (/\.svg$/i.test(cover)) {
      const svg = fs.readFileSync(file, 'utf8');
      assert.match(svg, /^\s*<svg\b/i, `SVG cover must have an SVG root: ${cover}`);
      assert.doesNotMatch(svg, /<\s*(?:script|foreignObject)\b|\bon[a-z]+\s*=/i, `SVG cover contains active content: ${cover}`);
      assert.doesNotMatch(svg, /(?:href|xlink:href)\s*=\s*["'](?:https?:|javascript:|data:)/i, `SVG cover must not load remote or inline active resources: ${cover}`);
    }
  }
});

test('each Kidscade entry point declares a favicon and an iOS touch icon', () => {
  const favicon = path.join(ROOT, 'assets/gate-image/favicon.png');
  assert.equal(fs.existsSync(favicon), true);
  assert.ok(fs.statSync(favicon).size > 1000);

  for (const page of ['index.html', 'index_base.html', 'economy.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.match(html, /<link\s+rel="icon"[^>]+href="assets\/gate-image\/favicon\.png"/, page);
    assert.match(html, /<link\s+rel="apple-touch-icon"[^>]+sizes="180x180"[^>]+href="assets\/gate-image\/favicon\.png"/, page);
  }
});

test('Cloudflare build emits versioned icons and the final lobby retains their links', () => {
  const build = fs.readFileSync(path.join(ROOT, 'scripts/build-cloudflare.cjs'), 'utf8');
  const finalizer = fs.readFileSync(path.join(ROOT, 'scripts/finalize-lobby-build.cjs'), 'utf8');
  assert.match(build, /function encodePngIco\(/);
  assert.match(build, /const faviconFile/);
  assert.match(build, /const touchFile/);
  assert.match(finalizer, /Final lobby is missing consistent versioned favicon/);

  const dist = path.join(ROOT, 'dist');
  const indexPath = path.join(dist, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  const html = fs.readFileSync(indexPath, 'utf8');
  const favicon = html.match(/<link\s+rel="icon"[^>]+href="\/(favicon-[a-f0-9]{12}\.png)"/);
  const touch = html.match(/<link\s+rel="apple-touch-icon"[^>]+href="\/(apple-touch-icon-[a-f0-9]{12}\.png)"/);
  assert.ok(favicon, 'final lobby must link the hashed PNG favicon');
  assert.ok(touch, 'final lobby must link the hashed Apple touch icon');
  assert.equal(favicon[1].slice(8, 20), touch[1].slice(17, 29));
  for (const name of [favicon[1], touch[1], 'favicon.ico', 'favicon.png', 'apple-touch-icon.png']) {
    assert.ok(fs.statSync(path.join(dist, name)).size > 100, 'missing or empty ' + name);
  }
  const ico = fs.readFileSync(path.join(dist, 'favicon.ico'));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 2, 'ICO must contain 16px and 32px images');
  assert.ok(fs.readFileSync(path.join(dist, '_headers'), 'utf8').includes('/favicon-*.png'));
});
