const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const gameDir = path.join(__dirname, '..', 'games', 'infinite_gugudan');
const read = name => fs.readFileSync(path.join(gameDir, name), 'utf8');

test('the moonlit shrine SVG is a local, renderable background asset', async () => {
  const svg = read('shrine-night.svg');
  assert.match(svg, /<svg[^>]+viewBox="0 0 1440 560"/);
  assert.match(svg, /id="moon"/);
  assert.match(svg, /id="torii"/);
  assert.match(svg, /Distant shrine roof/);
  assert.match(svg, /stone slabs/);
  assert.match(svg, /Old twisted trunks/);
  assert.doesNotMatch(svg, /<(?:image|script)\\b/i);
  const metadata = await sharp(Buffer.from(svg)).metadata();
  assert.equal(metadata.width, 1440);
  assert.equal(metadata.height, 560);
  assert.ok((await sharp(Buffer.from(svg)).resize({width:360}).png().toBuffer()).length > 1000);
});

test('only the existing duel arena uses the scenery; game rules are untouched', () => {
  const html = read('무한 구구단： 무한루.html');
  assert.match(html, /<link rel="stylesheet" href="shrine-night\.css\?v=1">/);
  assert.equal((html.match(/class="arena shrine-theme" id="arena"/g) || []).length, 1);
  assert.match(html, /<div class="shrine-atmosphere" aria-hidden="true">/);
  assert.match(html, /<div class="beam left"/);
  assert.match(html, /<div class="beam right"/);
  assert.match(html, /<div class="clash"><\/div>/);
  assert.match(html, /class="pressure"/);
  assert.match(html, /data-mode="cpu"/);
  assert.match(html, /data-mode="local"/);
  assert.match(html, /function applyForce\(side,amount\)/);
  assert.match(html, /function pressKey\(side,key\)/);
  assert.match(html, /function startMatch\(\)/);
  assert.match(html, /math-rain\.js\?v=1/);
});

test('atmosphere is beneath energy effects and respects accessibility settings', () => {
  const css = read('shrine-night.css');
  assert.match(css, /url\("\.\/shrine-night\.svg"\)/);
  assert.match(css, /\.shrine-atmosphere\{[^}]*z-index:0;[^}]*pointer-events:none/s);
  assert.match(css, /\.arena\.shrine-theme \.beam\{z-index:3\}/);
  assert.match(css, /\.arena\.shrine-theme \.clash\{z-index:6\}/);
  assert.match(css, /\.arena\.shrine-theme \.pressure\{z-index:7\}/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /@media\(prefers-reduced-data:reduce\)/);
  assert.doesNotMatch(css, /body\s*\{|\.rain-board\s*\{/);
});
