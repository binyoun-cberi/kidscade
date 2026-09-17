const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games', 'job_maratang_simulator');
const htmlPath = path.join(gameDir, '마라탕 한 그릇.html');
const cssPath = path.join(gameDir, 'maratang-dx.css');
const uiPath = path.join(gameDir, 'maratang-ui-v4.css');
const jsPath = path.join(gameDir, 'maratang-dx.js');
const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const ui = fs.readFileSync(uiPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

const expectedFoodModels = [
  'pot.glb',
  'cabbage.glb',
  'leek.glb',
  'mushroom.glb',
  'sausage.glb',
  'meat-raw.glb',
  'cooking-spoon.glb',
  'chopstick.glb'
];
const expectedPeopleModels = [
  'character-male-a.glb',
  'character-male-b.glb',
  'character-male-c.glb',
  'character-male-d.glb',
  'character-female-a.glb',
  'character-female-b.glb',
  'character-female-c.glb',
  'character-female-d.glb'
];

test('Maratang DX v4 keeps maintainable gameplay files and adds dedicated mobile UI layer', () => {
  assert.match(html, /<title>마라탕 한 그릇 DX<\/title>/);
  assert.match(html, /maratang-dx\.css\?v=3/);
  assert.match(html, /maratang-ui-v4\.css\?v=1/);
  assert.match(html, /maratang-dx\.js\?v=3/);
  assert.match(html, /document\.documentElement\.classList\.add\('embedded'\)/);
  assert.match(html, /id="focusNeed"/);
  assert.match(html, /id="patienceFill"/);
  assert.match(html, /id="cookBtnMobile"/);
  assert.ok(css.length > 5000, 'expected dedicated Maratang base stylesheet');
  assert.ok(ui.length > 5000, 'expected dedicated Maratang v4 mobile UI stylesheet');
  assert.ok(js.length > 10000, 'expected dedicated Maratang game module');
});

test('Maratang DX browser module parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
    input: js,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout || 'module syntax check failed');
});

test('Maratang DX uses local Three.js and tracked 3D food/customer assets', () => {
  assert.match(html, /\.\.\/\.\.\/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.doesNotMatch(html + css + ui + js, /https?:\/\//i, 'Maratang DX must not depend on external CDNs');
  assert.match(js, /class MaratangScene/);
  assert.match(js, /setCustomer\(order\)/);
  assert.match(js, /reactCustomer\(good\)/);
  assert.match(js, /dropLast/);
  assert.match(js, /this\.bubbles/);

  for (const model of expectedFoodModels) {
    assert.ok(fs.existsSync(path.join(root, 'assets', 'game', 'food', model)), `missing Maratang food model: ${model}`);
    assert.ok(js.includes(model), `Maratang DX does not reference ${model}`);
  }
  for (const model of expectedPeopleModels) {
    assert.ok(fs.existsSync(path.join(root, 'assets', 'game', 'characters', 'people', model)), `missing Maratang customer model: ${model}`);
    assert.ok(js.includes(model), `Maratang DX does not reference ${model}`);
  }
});

test('Maratang DX keeps gameplay scoring, patience and mobile controls', () => {
  assert.match(js, /필수 재료/);
  assert.match(js, /예산 초과/);
  assert.match(js, /대기시간 보너스/);
  assert.match(js, /MAX_PORTIONS=12/);
  assert.match(js, /o\.id===activeId/);
  assert.match(js, /cookBtnMobile/);
  assert.match(js, /serveBtnMobile/);
  assert.match(css + ui, /\.cookActionsMobile/);
});

test('Maratang DX v4 mobile UI prioritizes current task and horizontal secondary lists', () => {
  assert.match(ui, /html\.embedded \.top\{display:none\}/);
  assert.match(ui, /#game\{padding:7px 7px 88px;display:flex;flex-direction:column/);
  assert.match(ui, /\.cook\{order:1/);
  assert.match(ui, /\.ingredients\{order:2/);
  assert.match(ui, /\.orders\{order:3/);
  assert.match(ui, /grid-template-rows:repeat\(2,72px\)/);
  assert.match(ui, /grid-auto-flow:column/);
  assert.match(ui, /\.orderGrid\{display:flex/);
  assert.match(ui, /overflow-x:auto/);
  assert.match(ui, /\.stage\{height:285px;min-height:285px/);
  assert.match(ui, /bottom:max\(7px,env\(safe-area-inset-bottom\)\)/);
  assert.match(ui, /\.modalBack\{align-items:flex-end/);
  assert.match(ui, /\.previewText,\.preview \.badge\{display:none\}/);
});

test('Maratang DX uses valid shared audio catalog keys', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'audio', 'audio-catalog.json'), 'utf8'));
  const used = [...js.matchAll(/sfx\(\s*['"]([a-z0-9_.-]+)['"]/g)].map(match => match[1]);
  assert.ok(used.length >= 6, 'expected several Maratang sound events');
  for (const key of used) assert.ok(catalog.sounds[key], `missing shared audio key used by Maratang DX: ${key}`);
});

test('Maratang DX v4 build output is cache-bumped and keeps shared audio manager injection', () => {
  const distCatalogPath = path.join(root, 'dist', 'data', 'games.json');
  assert.ok(fs.existsSync(distCatalogPath), 'dist must exist before Maratang DX test');
  const catalog = JSON.parse(fs.readFileSync(distCatalogPath, 'utf8'));
  const game = (catalog.games || []).find(item => item && item.id === 'job_maratang_simulator');
  assert.ok(game, 'built Maratang catalog entry missing');
  assert.equal(game.href, 'games/job_maratang_simulator/마라탕 한 그릇.html?v=4');
  const builtDir = path.join(root, 'dist', 'games', 'job_maratang_simulator');
  const builtPath = path.join(builtDir, '마라탕 한 그릇.html');
  const built = fs.readFileSync(builtPath, 'utf8');
  assert.match(built, /audio-manager\.js\?v=20260917-1/);
  assert.match(built, /maratang-ui-v4\.css\?v=1/);
  assert.match(built, /maratang-dx\.js\?v=3/);
  assert.ok(fs.existsSync(path.join(builtDir, 'maratang-dx.css')));
  assert.ok(fs.existsSync(path.join(builtDir, 'maratang-ui-v4.css')));
  assert.ok(fs.existsSync(path.join(builtDir, 'maratang-dx.js')));
});
