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

test('협선이 침몰하면 정비 선택에서 복구할 수 있다', async () => {
  const { createGame, startRun, stepGame, takeUpgrade, WAVES } = await simPromise;
  const game = createGame(11);
  startRun(game);
  game.allies[0].dead = true;
  game.allies[0].hp = 0;
  game.spawned = WAVES[0].ships.length;
  game.enemies = [];
  stepGame(game, {}, 1 / 60);
  assert.equal(game.mode, 'upgrade');
  assert.ok(game.selected.includes('escort'), '침몰 시에는 협선 복구 선택지를 제공');
  assert.equal(takeUpgrade(game, 'escort'), true);
  assert.equal(game.allies[0].dead, false);
  assert.equal(game.allies[0].hp, game.allies[0].maxHp);
  assert.equal(game.mode, 'playing');
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

test('세 차례 실제 전투에서 지휘 신호와 두 번의 강화를 활용해 승리할 수 있다', async () => {
  const { createGame, startRun, stepGame, takeUpgrade, issueOrder, WAVES } = await simPromise;
  const game = createGame(1);
  startRun(game);
  let upgrades = 0;
  let orders = 0;
  for (let i = 0; i < 240 * 30 && ['playing', 'upgrade'].includes(game.mode); i++) {
    if (game.mode === 'upgrade') {
      upgrades++;
      assert.equal(takeUpgrade(game, game.selected.includes('hull') ? 'hull' : game.selected[0]), true);
      continue;
    }
    if (game.signalCooldown <= 0 && game.enemies.length > 0) {
      if (issueOrder(game, game.player.hp < 170 ? 'guard' : 'rally')) orders++;
    }
    const enemy = game.enemies[0];
    if (enemy) {
      const angle = Math.atan2(enemy.x - game.player.x, -(enemy.y - game.player.y)) + Math.PI / 2;
      const distance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
      stepGame(game, { aimAngle: angle, throttle: distance > 300 ? 1 : 0 }, 1 / 30);
    } else stepGame(game, { forward: true }, 1 / 30);
  }
  assert.equal(game.mode, 'victory');
  assert.equal(upgrades, 2);
  assert.ok(orders >= 2, '실제 교전에서 지휘 신호를 여러 번 사용해야 한다');
  assert.equal(game.kills, WAVES.reduce((sum, wave) => sum + wave.ships.length, 0));
});

test('교전 정비는 좌현·우현 개별 무장과 지원 중 세 가지 선택을 제공한다', async () => {
  const { createGame, startRun, stepGame, takeUpgrade, getWave, UPGRADES, WEAPONS } = await simPromise;
  const game = createGame(102);
  startRun(game);
  game.player.hp = 190;
  game.spawned = getWave(game).ships.length;
  stepGame(game, {}, .016);
  assert.equal(game.mode, 'upgrade');
  const selected = game.selected.map(id => UPGRADES.find(option => option.id === id));
  assert.equal(selected.length, 3);
  assert.ok(selected.some(option => option.slot === 'port'));
  assert.ok(selected.some(option => option.slot === 'starboard'));
  assert.ok(selected.some(option => !option.slot));
  const port = selected.find(option => option.slot === 'port');
  assert.ok(WEAPONS[port.weapon]);
  assert.equal(takeUpgrade(game, port.id), true);
  assert.equal(game.arsenal.port, port.weapon);
  assert.equal(game.arsenal.starboard, 'standard');
  assert.equal(game.player.hp, 265, '교전 사이 기초 수리가 적용된다');
});

test('강화한 대형 총통은 해당 현에만 무거운 포탄 한 발을 발사한다', async () => {
  const { createGame, startRun, stepGame, makeShip, WEAPONS } = await simPromise;
  const game = createGame(12);
  startRun(game);
  game.spawnClock = 999;
  game.arsenal.starboard = 'heavy';
  game.enemies = [makeShip('atakebune', game.player.x + 175, game.player.y, 0, 'dummy')];
  stepGame(game, {}, 1 / 60);
  const heavyShots = game.shots.filter(shot => shot.weapon === 'heavy');
  assert.equal(heavyShots.length, WEAPONS.heavy.volley);
  assert.ok(heavyShots[0].damage > WEAPONS.standard.damage);
  assert.ok(heavyShots[0].radius > 5);
  assert.equal(game.arsenal.port, 'standard');
});

test('집중 공격은 큰 적선을 우선 지정하고 측면 목표 선택에도 반영된다', async () => {
  const { createGame, startRun, makeShip, issueOrder, broadsideTarget } = await simPromise;
  const game = createGame(19);
  startRun(game);
  const small = makeShip('kobaya', game.player.x + 130, game.player.y, 0, 'small');
  const boss = makeShip('atakebune', game.player.x + 210, game.player.y, 0, 'boss');
  game.enemies = [small, boss];
  assert.equal(issueOrder(game, 'focus'), true);
  assert.equal(game.focusTargetId, 'boss');
  assert.equal(broadsideTarget(game.player, game.enemies, 1, 455, game.focusTargetId)?.id, 'boss');
  assert.equal(issueOrder(game, 'guard'), false, '함대 명령은 재사용 대기시간을 공유한다');
});

test('엄호 명령은 협선이 가까이 있을 때 기함이 받는 포탄 피해를 줄인다', async () => {
  const { createGame, startRun, stepGame, issueOrder } = await simPromise;
  const regular = createGame(21), guarded = createGame(21);
  for (const game of [regular, guarded]) {
    startRun(game);
    game.spawnClock = 999;
    game.shots.push({ x: game.player.x - 45, y: game.player.y, vx: 475, vy: 0, traveled: 0, range: 600, damage: 50, team: 'japan', radius: 5 });
  }
  assert.equal(issueOrder(guarded, 'guard'), true);
  stepGame(regular, {}, .05);
  stepGame(guarded, {}, .05);
  assert.ok(guarded.player.hp > regular.player.hp);
  assert.ok(guarded.player.hp < guarded.player.maxHp);
});

test('화염탄에 맞은 적선은 이후에도 불타며 체력이 감소한다', async () => {
  const { createGame, startRun, makeShip, stepGame } = await simPromise;
  const game = createGame(36);
  startRun(game);
  game.spawnClock = 999;
  game.player.reload = [999, 999];
  game.allies[0].reload = [999, 999];
  const enemy = makeShip('atakebune', game.player.x + 135, game.player.y, 0, 'burning');
  game.enemies = [enemy];
  game.shots.push({ x: enemy.x - 50, y: enemy.y, vx: 475, vy: 0, traveled: 0, range: 400, damage: 12, team: 'joseon', radius: 5, weapon: 'fire', burn: 7, burnTime: 2.8 });
  for (let i = 0; i < 3 && enemy.burnRemaining <= 0; i++) stepGame(game, {}, .05);
  assert.ok(enemy.burnRemaining > 0);
  const hpAfterImpact = enemy.hp;
  game.shots = [];
  stepGame(game, {}, .05);
  assert.ok(enemy.hp < hpAfterImpact);
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

test('모바일 아날로그 선회·전후진은 키보드와 같은 항로를 따른다', async () => {
  const { createGame, startRun, stepGame } = await simPromise;
  const keyboard = createGame(15);
  const touch = createGame(15);
  for (const game of [keyboard, touch]) {
    startRun(game);
    game.spawnClock = 1000;
  }
  for (let frame = 0; frame < 120; frame++) {
    stepGame(keyboard, { forward: true, right: true }, 1 / 60);
    stepGame(touch, { throttle: 1, turn: 1 }, 1 / 60);
  }
  for (const key of ['x', 'y', 'angle', 'speed', 'aimSteady']) {
    assert.equal(touch.player[key], keyboard.player[key], `${key} 움직임 일치`);
  }
});

test('연속 급선회는 함포를 흔들고 선회를 멈추면 다시 발사 준비된다', async () => {
  const { createGame, startRun, stepGame } = await simPromise;
  const game = createGame(17);
  startRun(game);
  game.spawnClock = 1000;
  for (let i = 0; i < 180; i++) stepGame(game, { forward: true, right: true }, 1 / 60);
  assert.ok(game.player.aimSteady < 0.58, '무한 선회 시 포격 불가');
  for (let i = 0; i < 80; i++) stepGame(game, { forward: true }, 1 / 60);
  assert.ok(game.player.aimSteady >= 0.58, '항로가 안정되면 포격 재개');
});

test('협선 격침 시 집결 신호는 소모되지 않으며 살아 있을 때는 기함도 속사한다', async () => {
  const { createGame, startRun, issueSignal, stepGame, makeShip } = await simPromise;
  const withSignal = createGame(22);
  const withoutSignal = createGame(22);
  for (const game of [withSignal, withoutSignal]) {
    startRun(game);
    game.spawnClock = 999;
    game.enemies = [makeShip('kobaya', game.player.x + 180, game.player.y, 0, 'dummy')];
  }
  assert.equal(issueSignal(withSignal), true);
  stepGame(withSignal, {}, 1 / 60);
  stepGame(withoutSignal, {}, 1 / 60);
  assert.ok(withSignal.player.reload[1] < withoutSignal.player.reload[1]);
  const sunk = createGame(23);
  startRun(sunk);
  sunk.allies[0].dead = true;
  assert.equal(issueSignal(sunk), false);
  assert.equal(sunk.signalCooldown, 0);
});

test('섬은 포탄을 가로막고 충돌 효과를 낸다', async () => {
  const { createGame, startRun, stepGame } = await simPromise;
  const game = createGame(7);
  startRun(game);
  game.spawnClock = 999;
  game.shots.push({ x: 100, y: 290, vx: 475, vy: 0, traveled: 0, range: 600, damage: 20, team: 'joseon', radius: 5 });
  for (let i = 0; i < 12; i++) stepGame(game, {}, 0.05);
  assert.equal(game.shots.length, 0);
  assert.ok(game.effects.some(effect => effect.type === 'splash'));
});

test('맵 모서리에서도 적선이 적절한 거리에서 출현하고 전투는 끝난다', async () => {
  const { createGame, startRun, stepGame, takeUpgrade, WORLD, ISLANDS } = await simPromise;
  for (let seed = 1; seed <= 64; seed++) {
    for (const [x, y] of [[37, 37], [WORLD.width - 37, 37], [37, WORLD.height - 37], [WORLD.width - 37, WORLD.height - 37]]) {
      const edge = createGame(seed);
      startRun(edge);
      edge.player.x = x;
      edge.player.y = y;
      for (let i = 0; i < 30 && !edge.spawned; i++) stepGame(edge, {}, 0.05);
      const enemy = edge.enemies[0];
      assert.ok(enemy, `씨앗 ${seed}: 적선 출현`);
      assert.ok(Math.hypot(enemy.x - edge.player.x, enemy.y - edge.player.y) >= 375);
      assert.ok(ISLANDS.every(island => Math.hypot(enemy.x - island.x, enemy.y - island.y) >= island.radius + 90));
    }
  }
  for (let seed = 1; seed <= 12; seed++) {
    const game = createGame(seed);
    startRun(game);
    for (let i = 0; i < 5400 && ['playing', 'upgrade'].includes(game.mode); i++) {
      if (game.mode === 'upgrade') {
        takeUpgrade(game, game.selected.includes('hull') ? 'hull' : game.selected[0]);
      } else stepGame(game, { forward: true }, 1 / 30);
    }
    assert.notEqual(game.mode, 'playing', `씨앗 ${seed}: 끝나지 않는 교전`);
  }
});
