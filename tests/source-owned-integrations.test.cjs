const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('game-specific integrations live in source files instead of deployment mutation', () => {
  const classroom = read('games/high_classroom_war_3d/교실전쟁 3D.html');
  const timing = read('딱! 타임 LCD.html');
  const rhythm = read('리듬 대시.html');
  const patience = read('인내의 탑.html');
  const dog = read('games/low_math_dog_runner/멍멍 곱셈 러너.html');

  assert.match(classroom, /classroom-war-records\.js\?v=20260916-1/);
  assert.match(classroom, /classroom-war-records-observer\.js\?v=20260916-1/);
  assert.match(timing, /timing-exact10-records\.js\?v=20260916-1/);
  assert.match(rhythm, /rhythm-dash-v11\.js\?v=20260916-1/);
  assert.equal((patience.match(/patience-tower-rework\.js/g) || []).length, 1);
  assert.equal((patience.match(/patience-tower-duel-entry\.js/g) || []).length, 1);
  assert.ok(patience.indexOf('patience-tower-rework.js') < patience.indexOf('patience-tower-duel-entry.js'));
  assert.match(dog, /dog-runner-polish\.js\?v=20260917-2/);
  assert.match(dog, /g\.rotation\.y=0;/);
  assert.doesNotMatch(dog, /g\.rotation\.y=Math\.PI\/2;/);
});

test('build scripts no longer mutate game-specific integrations or href versions', () => {
  const integrations = read('scripts/inject-game-integrations.cjs');
  const build = read('scripts/build-cloudflare.cjs');

  assert.doesNotMatch(integrations, /function\s+injectScripts/);
  assert.doesNotMatch(integrations, /function\s+bumpGameHref/);
  assert.doesNotMatch(integrations, /fixDogRunnerGateOrientation/);
  for (const marker of [
    'classroom-war-records.js',
    'timing-exact10-records.js',
    'rhythm-dash-v11.js',
    'patience-tower-rework.js',
    'patience-tower-duel-entry.js',
    'dog-runner-polish.js'
  ]) {
    assert.equal(integrations.includes(marker), false, `${marker} must not be build-injected`);
  }
  assert.doesNotMatch(build, /injectTimingExact10Client/);
});

test('source catalog owns the cache-bumped game hrefs', () => {
  const catalog = JSON.parse(read('data/games.json'));
  const byId = new Map(catalog.games.map(game => [game.id, game]));
  assert.equal(byId.get('patience_tower')?.href, '인내의 탑.html?v=6');
  assert.equal(byId.get('low_math_dog_runner')?.href, 'games/low_math_dog_runner/멍멍 곱셈 러너.html?v=5');
  assert.equal(byId.get('alien_sandwich')?.href, 'games/alien_sandwich/우주 샌드위치 가게.html?v=4');
});
