const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const gameDir = path.join(ROOT, 'games', 'high_body_muscle_lab');
const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'games.json'), 'utf8'));

test('body muscle lab uses the shared game SDK and stable game id', () => {
  assert.match(html, /kidscade-game-sdk\.js/);
  assert.match(html, /data-game-id="high_body_muscle_lab"/);
  assert.doesNotMatch(html + runtime, /postMessage\([^\n]+['"]\*['"]\)/);
});

test('body muscle lab exposes keyboard and touch muscle controls', () => {
  for (const key of ['q', 'w', 'e', 'r']) assert.match(html, new RegExp('data-key="' + key + '"'));
  assert.match(runtime, /pointerdown/);
  assert.match(runtime, /keydown/);
  assert.match(runtime, /toggleXray/);
});

test('body muscle lab ships arm and full-body science missions', () => {
  const missionNames = [
    '팔을 굽혀 보세요',
    '버튼을 눌러 보세요',
    '사과를 바구니에 넣으세요',
    '의자에서 일어나세요',
    '3m 걸어가세요',
    '장애물을 넘어가세요',
    '상자를 옮기세요',
    '급식판을 자리까지!'
  ];
  for (const title of missionNames) assert.ok(runtime.includes(title), 'missing mission: ' + title);
  assert.match(runtime, /위팔 앞쪽 근육이 수축/);
  assert.match(runtime, /왼쪽과 오른쪽 다리의 근육이 번갈아 수축/);
  assert.match(runtime, /전신 협응/);
});

test('full-body missions include staged balance assistance and recoverable falls', () => {
  assert.match(runtime, /assist:\.72/);
  assert.match(runtime, /assist:\.52/);
  assert.match(runtime, /assist:\.38/);
  assert.match(runtime, /assist:\.25/);
  assert.match(runtime, /assist:\.12/);
  assert.match(runtime, /triggerFall/);
  assert.match(runtime, /recoverFromFall/);
  assert.match(runtime, /checkpoint/);
  assert.match(runtime, /trayTilt/);
  assert.match(runtime, /boxGrip/);
});

test('body muscle lab catalog metadata is classroom-ready science simulation', () => {
  const game = catalog.games.find(item => item.id === 'high_body_muscle_lab');
  assert.ok(game);
  assert.equal(game.href, 'games/high_body_muscle_lab/index.html?v=2');
  assert.equal(game.subject, 'science');
  assert.equal(game.genre, 'simulation');
  assert.equal(game.difficulty, 'medium');
  assert.equal(game.classroom, true);
  assert.deepEqual(game.input, ['touch', 'keyboard']);
  assert.ok(game.players.includes('solo'));
  assert.ok(game.players.includes('classroom'));
});
