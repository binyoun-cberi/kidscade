const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, '코드 브레이커.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'games', 'code_breaker', 'code-breaker-dx.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'games', 'code_breaker', 'code-breaker-dx.js'), 'utf8');

test('Code Breaker DX uses split local files and no external CDN', () => {
  assert.match(html, /<title>코드 브레이커<\/title>/);
  assert.match(html, /games\/code_breaker\/code-breaker-dx\.css\?v=3/);
  assert.match(html, /games\/code_breaker\/code-breaker-dx\.js\?v=3/);
  assert.doesNotMatch(html + css + js, /https?:\/\//i);
  assert.doesNotMatch(html, /cdn\.tailwindcss|fonts\.googleapis/i);
});

test('Code Breaker DX browser JavaScript parses', () => {
  const result = spawnSync(process.execPath, ['--check'], { input: js, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout || 'Code Breaker DX syntax check failed');
});

test('Code Breaker DX keeps 24-tile deduction rules and two AI levels', () => {
  assert.match(js, /for \(let n = 0; n <= 11; n\+\+\)/);
  assert.match(js, /color:'black'/);
  assert.match(js, /color:'white'/);
  assert.match(js, /a\.number === b\.number \? \(a\.color === 'black' \? -1 : 1\)/);
  assert.match(js, /candidateNumbersFor/);
  assert.match(js, /aiDifficulty==='hard'/);
  assert.match(js, /aiDifficulty==='easy'/);
  assert.match(js, /turnState='FORCE_REVEAL'/);
  assert.match(js, /continueGuessing/);
  assert.match(js, /passTurn/);
});

test('Code Breaker DX uses tracked local boardgame card assets', () => {
  const assets = [
    'assets/game/2d/boardgame/cards/cardBack_blue2.png',
    'assets/game/2d/boardgame/cards/cardBack_red2.png',
    'assets/game/2d/boardgame/chips/chipBlackWhite.png',
    'assets/game/2d/boardgame/chips/chipWhite.png',
    'assets/game/2d/boardgame/chips/chipBlue.png'
  ];
  for (const asset of assets) assert.ok(fs.existsSync(path.join(root, asset)), 'missing asset: ' + asset);
  assert.match(css, /cardBack_blue2\.png/);
  assert.match(css, /cardBack_red2\.png/);
  assert.match(css, /chipBlackWhite\.png/);
  assert.match(css, /chipWhite\.png/);
  assert.match(css, /chipBlue\.png/);
});

test('Code Breaker DX owns its shared-audio events without legacy hook duplication', () => {
  const audioCatalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'audio', 'audio-catalog.json'), 'utf8'));
  const used = [...js.matchAll(/audio\(\s*['"]([a-z0-9_.-]+)['"]/g)].map(m=>m[1]);
  assert.ok(used.length >= 4);
  for (const key of used) assert.ok(audioCatalog.sounds[key], 'missing audio key: ' + key);
  assert.match(js, /window\.__codeBreakerDxOwnAudio = true/);
  const hook = fs.readFileSync(path.join(root, 'game-audio-hooks-v4.js'), 'utf8');
  assert.match(hook, /if \(window\.__codeBreakerDxOwnAudio\) return;/);
});

test('Code Breaker catalog cache-bumps DX root entry', () => {
  const sourceCatalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
  const source = sourceCatalog.games.find(g=>g.id==='code_breaker');
  assert.ok(source);
  assert.equal(source.title, '코드 브레이커');
  assert.equal(source.href, '코드 브레이커.html?v=3');

  const distCatalogPath = path.join(root, 'dist', 'data', 'games.json');
  assert.ok(fs.existsSync(distCatalogPath), 'dist catalog must exist');
  const distCatalog = JSON.parse(fs.readFileSync(distCatalogPath, 'utf8'));
  const built = distCatalog.games.find(g=>g.id==='code_breaker');
  assert.equal(built.href, source.href);

  const builtHtml = fs.readFileSync(path.join(root, 'dist', '코드 브레이커.html'), 'utf8');
  assert.match(builtHtml, /audio-manager\.js\?v=20260917-1/);
  assert.match(builtHtml, /game-audio-hooks-v4\.js\?v=20260917-1/);
  assert.ok(fs.existsSync(path.join(root, 'dist', 'games', 'code_breaker', 'code-breaker-dx.css')));
  assert.ok(fs.existsSync(path.join(root, 'dist', 'games', 'code_breaker', 'code-breaker-dx.js')));
});

test('Code Breaker DX keeps compact mobile board layout', () => {
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /grid-template-areas:"deck mission" "logic logic"/);
  assert.match(css, /overflow-x:auto/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});
