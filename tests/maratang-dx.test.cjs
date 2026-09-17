const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'games', 'job_maratang_simulator', '마라탕 한 그릇.html');
const source = fs.readFileSync(sourcePath, 'utf8');

const expectedModels = [
  'pot.glb',
  'cabbage.glb',
  'leek.glb',
  'mushroom.glb',
  'sausage.glb',
  'meat-raw.glb'
];

test('Maratang DX is the tracked job_maratang_simulator game', () => {
  assert.match(source, /<title>마라탕 한 그릇 DX<\/title>/);
  assert.match(source, /class MaratangScene/);
  assert.match(source, /GLTFLoader/);
  assert.match(source, /재료 카드를 여기로 끌어다 놓아도 됩니다/);
  assert.match(source, /필수 재료·금지 재료·예산·맵기·양·대기시간/);
});

test('Maratang DX uses local Three.js and tracked food assets only', () => {
  assert.match(source, /\.\.\/\.\.\/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.doesNotMatch(source, /https?:\/\//i, 'Maratang DX must not depend on external CDNs');
  for (const model of expectedModels) {
    assert.ok(fs.existsSync(path.join(root, 'assets', 'game', 'food', model)), `missing Maratang model: ${model}`);
    assert.ok(source.includes(model), `Maratang DX does not reference ${model}`);
  }
});

test('Maratang DX uses valid shared audio catalog keys', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'audio', 'audio-catalog.json'), 'utf8'));
  const used = [...source.matchAll(/sfx\(\s*['"]([a-z0-9_.-]+)['"]/g)].map(match => match[1]);
  assert.ok(used.length >= 4, 'expected several Maratang sound events');
  for (const key of used) assert.ok(catalog.sounds[key], `missing shared audio key used by Maratang DX: ${key}`);
});

test('Maratang DX build output is cache-bumped and keeps shared audio manager injection', () => {
  const distCatalogPath = path.join(root, 'dist', 'data', 'games.json');
  assert.ok(fs.existsSync(distCatalogPath), 'dist must exist before Maratang DX test');
  const catalog = JSON.parse(fs.readFileSync(distCatalogPath, 'utf8'));
  const game = (catalog.games || []).find(item => item && item.id === 'job_maratang_simulator');
  assert.ok(game, 'built Maratang catalog entry missing');
  assert.equal(game.href, 'games/job_maratang_simulator/마라탕 한 그릇.html?v=2');
  const builtPath = path.join(root, 'dist', 'games', 'job_maratang_simulator', '마라탕 한 그릇.html');
  const built = fs.readFileSync(builtPath, 'utf8');
  assert.match(built, /audio-manager\.js\?v=20260917-1/);
  assert.match(built, /assets\/game\/food/);
});
