const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const gameDir = path.join(ROOT, 'games', 'high_body_muscle_lab');
const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
const css = fs.readFileSync(path.join(gameDir, 'style.css'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'games.json'), 'utf8'));

test('muscle boxing keeps the stable game id and shared SDK', () => {
  assert.match(html, /kidscade-game-sdk\.js/);
  assert.match(html, /data-game-id="high_body_muscle_lab"/);
  assert.doesNotMatch(html + runtime, /postMessage\([^\n]+['"]\*['"]\)/);
});

test('QWER directly control named antagonist upper-arm muscles', () => {
  for (const key of ['q', 'w', 'e', 'r']) assert.match(html, new RegExp('data-key="' + key + '"'));
  assert.match(html, /왼팔 상완이두근/);
  assert.match(html, /왼팔 상완삼두근/);
  assert.match(html, /오른팔 상완이두근/);
  assert.match(html, /오른팔 상완삼두근/);
  assert.match(html, /수축 → 팔꿈치 굽힘/);
  assert.match(html, /수축 → 팔꿈치 폄/);
  assert.match(runtime, /const MUSCLES=/);
  assert.match(runtime, /role:'flexor'/);
  assert.match(runtime, /role:'extensor'/);
});

test('boxing has no punch or guard action button and derives both from elbow state', () => {
  assert.doesNotMatch(html, /data-action="(?:punch|guard)"/);
  assert.match(runtime, /arm\.flex>=\.66/);
  assert.match(runtime, /crossedContact/);
  assert.match(runtime, /fastExtension/);
  assert.match(runtime, /resolvePlayerPunch/);
  assert.match(runtime, /resolveEnemyPunch/);
  assert.match(html, /충분히 굽혀져 있으면 <strong>자동으로 가드<\/strong>/);
  assert.match(html, /빠르게 쭉 펴서/);
});

test('boxing is toe-to-toe without player step controls', () => {
  assert.doesNotMatch(html, /스텝|이동 키|방향키/);
  assert.doesNotMatch(runtime, /playerX|playerVelocity|walk|dash|stepLeft|stepRight/);
  assert.match(runtime, /playerArmPose/);
  assert.match(runtime, /enemyArmPose/);
});

test('xray view labels biceps and triceps and explains the simplified model', () => {
  assert.match(runtime, /상완이두근\(굽힘\)/);
  assert.match(runtime, /상완삼두근\(폄\)/);
  assert.match(runtime, /길항근/);
  assert.match(runtime, /실제 복싱은 어깨·가슴·몸통·다리 근육도 함께 사용/);
  assert.match(runtime, /toggleXray/);
});

test('muscle boxing supports keyboard and touch', () => {
  assert.match(runtime, /pointerdown/);
  assert.match(runtime, /keydown/);
  assert.match(runtime, /pointercancel/);
  assert.match(css, /touch-action:none/);
});

test('catalog describes the new science sports game', () => {
  const game = catalog.games.find(item => item.id === 'high_body_muscle_lab');
  assert.ok(game);
  assert.equal(game.href, 'games/high_body_muscle_lab/index.html?v=5');
  assert.equal(game.subject, 'science');
  assert.equal(game.genre, 'sports');
  assert.equal(game.difficulty, 'medium');
  assert.equal(game.classroom, true);
  assert.deepEqual(game.input, ['touch', 'keyboard']);
  assert.ok(game.players.includes('solo'));
  assert.match(game.description, /상완이두근.*상완삼두근/);
});
