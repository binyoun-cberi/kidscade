const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const sourceCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/game-description-overrides.json'), 'utf8'));

function byId(catalog, id) {
  return catalog.games.find(game => game.id === id);
}

test('description overrides only reference real catalog games', () => {
  for (const [gameId, description] of Object.entries(overrides)) {
    assert.ok(byId(sourceCatalog, gameId), `unknown game id: ${gameId}`);
    assert.ok(String(description).trim().length >= 10, `description too short: ${gameId}`);
  }
});

test('corrected descriptions match the current game implementations', () => {
  const drift = fs.readFileSync(path.join(ROOT, '표류생존기.html'), 'utf8');
  assert.match(drift, /KOREAN ISLAND SURVIVAL/);
  assert.match(drift, /4종 미니게임/);
  assert.match(drift, /10가지 엔딩/);
  assert.doesNotMatch(overrides.trivia_drift_survival, /학업|평판|졸업/);
  assert.match(overrides.trivia_drift_survival, /무인도/);

  const kite = fs.readFileSync(path.join(ROOT, 'games/high_kite_wind_rider/바람을 타고.html'), 'utf8');
  assert.match(kite, /조작은 딱 두 개/);
  assert.match(kite, /45초/);
  assert.match(kite, /황금 돌풍/);
  assert.doesNotMatch(overrides.high_kite_wind_rider, /줄이 끊|게임 오버/);

  const blocks = fs.readFileSync(path.join(ROOT, 'games/cube3d/3D 전개도 마스터.html'), 'utf8');
  assert.match(blocks, /쌓기나무 3x3x3 관찰기/);
  assert.match(blocks, /위에서 본 모양/);
  assert.match(blocks, /앞에서 본 모양/);
  assert.match(blocks, /옆에서 본 모양/);
  assert.match(overrides.cube3d, /3×3×3/);
  assert.match(overrides.cube3d, /위·앞·옆/);
});

test('Cloudflare artifact contains the corrected card descriptions', () => {
  const distPath = path.join(ROOT, 'dist/data/games.json');
  assert.ok(fs.existsSync(distPath), 'dist/data/games.json should exist after the Cloudflare build');
  const distCatalog = JSON.parse(fs.readFileSync(distPath, 'utf8'));

  for (const [gameId, description] of Object.entries(overrides)) {
    assert.equal(byId(distCatalog, gameId)?.description, description, `dist description mismatch: ${gameId}`);
  }
});
