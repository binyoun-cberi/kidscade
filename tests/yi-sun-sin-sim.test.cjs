'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const simPromise = import('../games/yi-sun-sin/sim.mjs');

test('옥포 캠페인은 출전과 3차 교전 상태를 제공한다', async () => {
  const { createGame, startRun, WAVES, stepGame } = await simPromise;
  const game = createGame();
  assert.equal(game.mode, 'menu');
  assert.equal(WAVES.length, 3);
  startRun(game);
  for (let i = 0; i < 30; i++) stepGame(game, {}, 0.05);
  assert.equal(game.mode, 'playing');
  assert.equal(game.spawned, 1);
  assert.equal(game.enemies.length, 1);
});

test('측면에 있는 적만 좌현·우현 자동 포격 대상으로 고른다', async () => {
  const { makeShip, broadsideTarget } = await simPromise;
  const player = makeShip('panokseon', 400, 400, 0);
  const east = makeShip('kobaya', 590, 400);
  const west = makeShip('kobaya', 210, 400);
  const north = makeShip('kobaya', 400, 200);
  assert.equal(broadsideTarget(player, [east, north], 1)?.id, east.id);
  assert.equal(broadsideTarget(player, [west, north], -1), west);
  assert.equal(broadsideTarget(player, [north], 1), null);
  assert.equal(broadsideTarget(player, [east], -1), null);
});

test('속도·선회·국경 밖 이동 제한이 실제로 작동한다', async () => {
  const { createGame, startRun, stepGame, WORLD } = await simPromise;
  const game = createGame();
  startRun(game);
  const initial = { x: game.player.x, y: game.player.y, angle: game.player.angle };
  for (let i = 0; i < 30; i++) stepGame(game, { forward: true, right: true }, 0.05);
  assert.notEqual(game.player.angle, initial.angle);
  assert.ok(Math.hypot(game.player.x - initial.x, game.player.y - initial.y) > 10);
  assert.ok(game.player.x > 0 && game.player.x < WORLD.width);
  assert.ok(game.player.y > 0 && game.player.y < WORLD.height);
});

test('적선에 화포 피해를 주고 침몰을 기록할 수 있다', async () => {
  const { createGame, startRun, stepGame, makeShip } = await simPromise;
  const game = createGame();
  startRun(game);
  game.spawnClock = 999;
  game.enemies = [makeShip('kobaya', game.player.x + 170, game.player.y, 0, 'test-ship')];
  for (let i = 0; i < 130; i++) stepGame(game, {}, 1 / 60);
  assert.ok(game.shotsFired > 0, '함포가 실제 발사되어야 한다');
  assert.ok(game.hits > 0 || game.kills > 0, '함포가 적선을 타격해야 한다');
});

test('교전 뒤 선택한 강화만 적용되고 다음 전투로 이어진다', async () => {
  const { createGame, startRun, stepGame, WAVES, takeUpgrade } = await simPromise;
  const game = createGame();
  startRun(game);
  game.spawned = WAVES[0].ships.length;
  game.enemies = [];
  stepGame(game, {}, 0.016);
  assert.equal(game.mode, 'upgrade');
  assert.equal(game.selected.length, 3);
  assert.equal(takeUpgrade(game, 'invalid'), false);
  const selection = game.selected[0];
  assert.equal(takeUpgrade(game, selection), true);
  assert.equal(game.mode, 'playing');
  assert.equal(game.waveIndex, 1);
  assert.equal(game.spawned, 0);
});

test('최종 교전을 모두 끝내면 승리하며 새 적선은 생기지 않는다', async () => {
  const { createGame, startRun, stepGame, WAVES } = await simPromise;
  const game = createGame();
  startRun(game);
  game.waveIndex = WAVES.length - 1;
  game.spawned = WAVES.at(-1).ships.length;
  game.enemies = [];
  stepGame(game, {}, 0.016);
  assert.equal(game.mode, 'victory');
  assert.ok(game.score > 0);
  const enemyCount = game.enemies.length;
  stepGame(game, {}, 0.05);
  assert.equal(game.enemies.length, enemyCount);
});

test('집결 명령은 재사용 대기시간을 지킨다', async () => {
  const { createGame, startRun, issueSignal, stepGame } = await simPromise;
  const game = createGame();
  assert.equal(issueSignal(game), false);
  startRun(game);
  assert.equal(issueSignal(game), true);
  assert.equal(issueSignal(game), false);
  for (let i = 0; i < 500; i++) {
    if (game.mode !== 'playing') break;
    stepGame(game, {}, 0.05);
  }
  assert.ok(game.signalRemaining === 0);
});

test('세 차례 실제 전투와 두 번의 강화 선택을 거쳐 승리할 수 있다', async () => {
  const { createGame, startRun, stepGame, takeUpgrade, WAVES } = await simPromise;
  const game = createGame(1);
  startRun(game);
  let upgrades = 0;
  for (let i = 0; i < 240 * 30 && ['playing', 'upgrade'].includes(game.mode); i++) {
    if (game.mode === 'upgrade') {
      upgrades++;
      assert.equal(takeUpgrade(game, game.selected.includes('hull') ? 'hull' : game.selected[0]), true);
      continue;
    }
    const enemy = game.enemies[0];
    const angle = enemy ? Math.atan2(enemy.x - game.player.x, -(enemy.y - game.player.y)) + Math.PI / 2 : game.player.angle;
    const distance = enemy ? Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) : 0;
    stepGame(game, { aimAngle: angle, throttle: enemy ? (distance > 300 ? 1 : 0) : 0.6 }, 1 / 30);
  }
  assert.equal(game.mode, 'victory');
  assert.equal(upgrades, 2);
  assert.equal(game.kills, WAVES.reduce((sum, wave) => sum + wave.ships.length, 0));
});

test('기함이 침몰하면 패배하며 정지 중에는 시간이 흐르지 않는다', async () => {
  const { createGame, startRun, stepGame, togglePause, ISLANDS } = await simPromise;
  const game = createGame();
  startRun(game);
  togglePause(game);
  stepGame(game, { forward: true }, 0.05);
  assert.equal(game.seconds, 0);
  togglePause(game);
  game.player.hp = 2;
  game.player.x = ISLANDS[0].x + 2;
  game.player.y = ISLANDS[0].y;
  stepGame(game, {}, 0.05);
  assert.equal(game.mode, 'defeat');
  assert.equal(game.player.hp, 0);
});
