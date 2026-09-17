const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games', 'job_bogle_bunsik');
const folderHtmlPath = path.join(gameDir, '보글보글 분식집.html');
const rootHtmlPath = path.join(root, '보글보글 분식집.html');
const cssPath = path.join(gameDir, 'bogle-bunsik-dx.css');
const jsPath = path.join(gameDir, 'bogle-bunsik-dx.js');
const folderHtml = fs.readFileSync(folderHtmlPath, 'utf8');
const rootHtml = fs.readFileSync(rootHtmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

const expectedModels = [
  'pot-stew.glb',
  'frying-pan.glb',
  'plate.glb',
  'egg-cooked.glb',
  'leek.glb',
  'corn-dog.glb',
  'cooking-spoon.glb',
  'chopstick.glb'
];

test('Bogle Bunsik DX is split into entry HTML, shared CSS and module JS', () => {
  for (const html of [rootHtml, folderHtml]) {
    assert.match(html, /<title>보글보글 분식집 DX<\/title>/);
    assert.match(html, /id="ramenControls"/);
    assert.match(html, /id="tteokControls"/);
    assert.match(html, /id="sideControls"/);
  }
  assert.match(rootHtml, /games\/job_bogle_bunsik\/bogle-bunsik-dx\.css\?v=1/);
  assert.match(rootHtml, /games\/job_bogle_bunsik\/bogle-bunsik-dx\.js\?v=1/);
  assert.match(folderHtml, /bogle-bunsik-dx\.css\?v=1/);
  assert.match(folderHtml, /bogle-bunsik-dx\.js\?v=1/);
  assert.ok(css.length > 6000, 'expected dedicated Bogle Bunsik DX stylesheet');
  assert.ok(js.length > 12000, 'expected dedicated Bogle Bunsik DX game module');
});

test('Bogle Bunsik DX browser module parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
    input: js,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout || 'module syntax check failed');
});

test('Bogle Bunsik DX uses local Three.js and tracked food assets only', () => {
  assert.match(folderHtml, /\.\.\/\.\.\/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(rootHtml, /assets\/vendor\/three-r160\/three\.module\.js/);
  assert.doesNotMatch(rootHtml + folderHtml + css + js, /https?:\/\//i, 'Bogle Bunsik DX must not depend on external CDNs');
  assert.match(js, /class BunsikScene/);
  for (const model of expectedModels) {
    assert.ok(fs.existsSync(path.join(root, 'assets', 'game', 'food', model)), `missing Bogle Bunsik model: ${model}`);
    assert.ok(js.includes(model), `Bogle Bunsik DX does not reference ${model}`);
  }
});

test('Bogle Bunsik DX keeps three concurrent station state machines and timing pressure', () => {
  assert.match(js, /ramen:\{label:'라면'/);
  assert.match(js, /tteok:\{label:'떡볶이'/);
  assert.match(js, /side:\{label:'사이드'/);
  assert.match(js, /phase:'idle'/);
  assert.match(js, /phase='cooking'/);
  assert.match(js, /phase='ready'/);
  assert.match(js, /phase='burnt'/);
  assert.match(js, /MAX_QUEUE=5/);
  assert.match(js, /SHIFT_SECONDS=90/);
  assert.match(js, /state\.combo/);
  assert.match(js, /state\.uiClock>=\.25/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test('Bogle Bunsik DX uses valid shared audio catalog keys', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'audio', 'audio-catalog.json'), 'utf8'));
  const used = [...js.matchAll(/sfx\(\s*['"]([a-z0-9_.-]+)['"]/g)].map(match => match[1]);
  assert.ok(used.length >= 6, 'expected several Bogle Bunsik sound events');
  for (const key of used) assert.ok(catalog.sounds[key], `missing shared audio key used by Bogle Bunsik DX: ${key}`);
});

test('catalog root entry is a real game shell and build publishes DX resources', () => {
  assert.ok(rootHtml.length > 1000, 'catalog entry must not be a redirect-only shell');
  assert.doesNotMatch(rootHtml, /location\.replace/);

  const sourceCatalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
  const sourceGame = (sourceCatalog.games || []).find(item => item && item.id === 'job_bogle_bunsik');
  assert.ok(sourceGame, 'source Bogle Bunsik catalog entry missing');
  assert.equal(sourceGame.href, '보글보글 분식집.html');

  const distCatalogPath = path.join(root, 'dist', 'data', 'games.json');
  assert.ok(fs.existsSync(distCatalogPath), 'dist must exist before Bogle Bunsik DX test');
  const catalog = JSON.parse(fs.readFileSync(distCatalogPath, 'utf8'));
  const game = (catalog.games || []).find(item => item && item.id === 'job_bogle_bunsik');
  assert.ok(game, 'built Bogle Bunsik catalog entry missing');
  assert.equal(game.href, '보글보글 분식집.html');
  assert.ok(fs.existsSync(path.join(root, 'dist', '보글보글 분식집.html')));
  assert.ok(fs.existsSync(path.join(root, 'dist', 'games', 'job_bogle_bunsik', 'bogle-bunsik-dx.css')));
  assert.ok(fs.existsSync(path.join(root, 'dist', 'games', 'job_bogle_bunsik', 'bogle-bunsik-dx.js')));
  const built = fs.readFileSync(path.join(root, 'dist', '보글보글 분식집.html'), 'utf8');
  assert.match(built, /audio-manager\.js\?v=20260917-1/);
  assert.match(built, /games\/job_bogle_bunsik\/bogle-bunsik-dx\.js\?v=1/);
});
