const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games', 'tod_hidden_emoji');
const originalHtml = fs.readFileSync(path.join(gameDir, '신나는 이모지 숨은그림찾기.html'), 'utf8');
const html = fs.readFileSync(path.join(gameDir, 'animal-face-search.html'), 'utf8');
const css = fs.readFileSync(path.join(gameDir, 'animal-face-search.css'), 'utf8');
const js = fs.readFileSync(path.join(gameDir, 'animal-face-search.js'), 'utf8');

test('animal face mode uses local images and preserves the original emoji game', () => {
  assert.match(html, /<title>동물 얼굴 숨은그림찾기<\/title>/);
  assert.match(html, /animal-face-search\.css\?v=2/);
  assert.match(html, /animal-face-search\.js\?v=2/);
  assert.match(html, /\.\.\/\.\.\/audio-manager\.js/);
  assert.match(html, /href="신나는 이모지 숨은그림찾기\.html"/);
  assert.match(originalHtml, /<title>신나는 이모지 숨은그림찾기<\/title>/);
  assert.match(originalHtml, /href="animal-face-search\.html"/);
  assert.doesNotMatch(html + js, /target\.emoji|emoji\s*:/i);
  assert.doesNotMatch(html + css + js, /https?:\/\//i);
  assert.match(js, /assets\/game\/2d\/animals\/round/);
  assert.match(js, /hidden-animal/);
  assert.match(js, /target-card/);
  assert.match(js, /<img src=/);
});

test('animal face search JavaScript parses', () => {
  const result = spawnSync(process.execPath, ['--check'], { input: js, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout || 'animal face search syntax check failed');
});

test('all animal face PNG files referenced by the manifest exist', () => {
  const files = [...js.matchAll(/\['[^']+','([a-z-]+\.png)'\]/g)].map(match => match[1]);
  assert.ok(files.length >= 24, 'expected a broad local animal face set');
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(root, 'assets', 'game', '2d', 'animals', 'round', file)), `missing animal face asset: ${file}`);
  }
});

test('game keeps multiple themed stages and child-friendly responsive UI', () => {
  const stageCount = (js.match(/\{name:'/g) || []).length;
  assert.ok(stageCount >= 12, 'expected at least twelve animal search stages');
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /scroll-snap-type:x proximity/);
  assert.match(css, /\.hidden-animal\.found/);
  assert.match(js, /hint\(\)/);
  assert.match(js, /success\.victory_fanfare/);
});

test('catalog retains the original hidden emoji game and exposes animal mode from its menu', () => {
  const sourceCatalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
  const source = sourceCatalog.games.find(game => game.id === 'tod_hidden_emoji');
  assert.ok(source);
  assert.match(source.title, /이모지/);
  assert.match(source.href, /신나는 이모지 숨은그림찾기\.html/);
  assert.match(originalHtml, /동물 얼굴 숨은그림찾기 시작/);
  const distCatalogPath = path.join(root, 'dist', 'data', 'games.json');
  if (fs.existsSync(distCatalogPath)) {
    const distCatalog = JSON.parse(fs.readFileSync(distCatalogPath, 'utf8'));
    const built = distCatalog.games.find(game => game.id === 'tod_hidden_emoji');
    assert.equal(built.href, source.href);
    const builtDir = path.join(root, 'dist', 'games', 'tod_hidden_emoji');
    for (const name of ['animal-face-search.css', 'animal-face-search.js', 'animal-face-search.html']) {
      assert.ok(fs.existsSync(path.join(builtDir, name)), 'built animal mode missing: ' + name);
    }
  }
});
