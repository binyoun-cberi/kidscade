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

  const blocks = fs.readFileSync(path.join(ROOT, 'games/cube3d/index.html'), 'utf8');
  const architect = fs.readFileSync(path.join(ROOT, 'games/cube3d/cube-architect.js'), 'utf8');
  assert.match(blocks, /CUBE/);
  assert.match(blocks, /설계도 챌린지/);
  assert.match(blocks, /전개도 연구실/);
  assert.match(blocks, /아키텍트 월드/);
  assert.match(blocks, /three-global\.js/);
  assert.match(blocks, /cube-architect\.js/);
  assert.doesNotMatch(blocks, /type="module"/);
    assert.doesNotMatch(blocks, /type="module" src="\.\/cube-architect\.js/);
  assert.match(architect, /겨냥도/);
  assert.match(architect, /foldPreview/);
  assert.match(architect, /saveFreeWorld/);
  assert.match(architect, /normalizedShape/);
  assert.match(architect, /rotateShapeY/);
  assert.match(architect, /updateChallengeFly/);
  assert.match(blocks, /challengeFlyHud/);
  assert.match(architect, /window\.CubeArchitect/);
  assert.match(architect, /^\(\(\)=>\{/);
  assert.doesNotMatch(architect, /OrbitControls/);
  assert.match(byId(sourceCatalog, 'cube3d').title, /큐브 아키텍트/);
  assert.match(byId(sourceCatalog, 'cube3d').description, /겨냥도/);
  assert.match(byId(sourceCatalog, 'cube3d').description, /자유 건축/);
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
