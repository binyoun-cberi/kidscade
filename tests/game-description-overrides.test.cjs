const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const sourceCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const REVIEWED_IDS = [
  'trivia_drift_survival',
  'high_kite_wind_rider',
  'cube3d',
  'high_rhythm_dash',
  'patience_tower'
];

function byId(catalog, id) {
  return catalog.games.find(game => game.id === id);
}

test('corrected card descriptions live in the source catalog', () => {
  for (const gameId of REVIEWED_IDS) {
    const game = byId(sourceCatalog, gameId);
    assert.ok(game, `unknown game id: ${gameId}`);
    assert.ok(String(game.description || '').trim().length >= 10, `description too short: ${gameId}`);
  }
});

test('corrected descriptions match the current game implementations', () => {
  const drift = fs.readFileSync(path.join(ROOT, '표류생존기.html'), 'utf8');
  assert.match(drift, /KOREAN ISLAND SURVIVAL/);
  assert.match(drift, /4종 미니게임/);
  assert.match(drift, /10가지 엔딩/);
  assert.doesNotMatch(byId(sourceCatalog, 'trivia_drift_survival').description, /학업|평판|졸업/);
  assert.match(byId(sourceCatalog, 'trivia_drift_survival').description, /무인도/);

  const kite = fs.readFileSync(path.join(ROOT, 'games/high_kite_wind_rider/바람을 타고.html'), 'utf8');
  assert.match(kite, /조작은 딱 두 개/);
  assert.match(kite, /줄 장력/);
  assert.match(kite, /황금 상승기류/);
  assert.doesNotMatch(kite, /남은 시간 45초/);
  assert.match(byId(sourceCatalog, 'high_kite_wind_rider').description, /줄 장력/);
  assert.match(byId(sourceCatalog, 'high_kite_wind_rider').description, /기록형/);

  const blocks = fs.readFileSync(path.join(ROOT, 'games/cube3d/3D 전개도 마스터.html'), 'utf8');
  assert.match(blocks, /쌓기나무 3x3x3 관찰기/);
  assert.match(blocks, /위에서 본 모양/);
  assert.match(blocks, /앞에서 본 모양/);
  assert.match(blocks, /옆에서 본 모양/);
  assert.match(byId(sourceCatalog, 'cube3d').description, /3×3×3/);
  assert.match(byId(sourceCatalog, 'cube3d').description, /위·앞·옆/);
});

test('Cloudflare artifact preserves the source card descriptions', () => {
  const distPath = path.join(ROOT, 'dist/data/games.json');
  assert.ok(fs.existsSync(distPath), 'dist/data/games.json should exist after the Cloudflare build');
  const distCatalog = JSON.parse(fs.readFileSync(distPath, 'utf8'));

  for (const gameId of REVIEWED_IDS) {
    assert.equal(
      byId(distCatalog, gameId)?.description,
      byId(sourceCatalog, gameId)?.description,
      `dist description mismatch: ${gameId}`
    );
  }
});
