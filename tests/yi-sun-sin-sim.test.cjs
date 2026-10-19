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

test('일곱 함종의 임무가 구별되고 거북선은 옥포 전투에 등장하지 않는다', async () => {
  const { SHIP_TYPES, SHIP_GUIDE, WAVES } = await simPromise;
  assert.equal(SHIP_GUIDE.length, 7);
  for (const entry of SHIP_GUIDE) assert.ok(SHIP_TYPES[entry.type]);
  assert.ok(SHIP_TYPES.panokseon.boardingDamageTaken < 1);
  assert.ok(SHIP_TYPES.turtle.boardingDamageTaken < SHIP_TYPES.panokseon.boardingDamageTaken);
  assert.equal(SHIP_TYPES.sahuseon.volley, 0, '사후선은 무장 공격선이 아니다');
  assert.ok(SHIP_TYPES.kobaya.speed > SHIP_TYPES.sekibune.speed);
  assert.ok(SHIP_TYPES.sekibune.speed > SHIP_TYPES.atakebune.speed);
  assert.ok(WAVES.every(wave => !wave.ships.includes('turtle')));
});

test('사후선은 총을 쏘지 않고 멀리 있는 적을 미니 레이더에 보고한다', async () => {
  const { createGame, startRun, makeShip, stepGame, radarContacts } = await simPromise;
  const game = createGame(33);
  startRun(game);
  game.spawnClock = 999;
  const remote = makeShip('kobaya', game.player.x + 790, game.player.y, 0, 'remote');
  game.enemies = [remote];
  assert.ok(radarContacts(game).includes(remote), '사후선의 먼 정찰 범위');
  game.allies[1].dead = true;
  assert.ok(!radarContacts(game).includes(remote), '사후선 격침으로 레이더 시야 상실');
  game.allies[1].dead = false;
  game.allies[1].reload = [0, 0];
  game.player.reload = [999, 999];
  game.allies[0].reload = [999, 999];
  remote.reload = [999, 999];
  stepGame(game, {}, .05);
  assert.equal(game.shotsFired, 0, '사후선은 정찰만 하고 화포를 발사하지 않음');
});

test('세키부네의 도선은 접근 예고 후 발동하며 판옥선의 높은 갑판이 피해를 막는다', async () => {
  const { createGame, startRun, makeShip, stepGame, boardingThreat, SHIP_TYPES } = await simPromise;
  const game = createGame(52);
  startRun(game);
  game.spawnClock = 999;
  game.player.reload = [999, 999];
  for (const ally of game.allies) ally.reload = [999, 999];
  const boarder = makeShip('sekibune', game.player.x + 55, game.player.y, 0, 'boarder');
  boarder.reload = [999, 999];
  game.enemies = [boarder];
  stepGame(game, {}, .05);
  assert.ok(boardingThreat(game));
  assert.ok(game.events.some(event => event.kind === 'boarding'));
  for (let i = 0; i < 32; i++) stepGame(game, {}, .05);
  assert.ok(game.events.some(event => event.kind === 'boarded'), '도선 완료 사건');
  const damage = game.player.maxHp - game.player.hp;
  assert.ok(Math.abs(damage - SHIP_TYPES.sekibune.boardingDamage * SHIP_TYPES.panokseon.boardingDamageTaken) < .01, `도선 피해 ${damage}`);
});

test('적선과 거리를 벌리면 도선 진행이 해제되며 재시도에 대기시간이 있다', async () => {
  const { createGame, startRun, makeShip, stepGame, boardingThreat } = await simPromise;
  const game = createGame(53);
  startRun(game);
  game.spawnClock = 999;
  game.player.reload = [999, 999];
  for (const ally of game.allies) ally.reload = [999, 999];
  const enemy = makeShip('sekibune', game.player.x + 56, game.player.y, 0, 'boarder');
  enemy.reload = [999, 999];
  game.enemies = [enemy];
  for (let i = 0; i < 9; i++) stepGame(game, {}, .05);
  assert.ok(boardingThreat(game));
  game.player.x -= 450;
  for (let i = 0; i < 20; i++) stepGame(game, {}, .05);
  assert.equal(boardingThreat(game), null);
  assert.equal(enemy.boardingProgress, 0);
});

test('사후선 격침 후 교전 강화에서 정찰선을 복구한다', async () => {
  const { createGame, startRun, stepGame, takeUpgrade, getWave } = await simPromise;
  const game = createGame(61);
  startRun(game);
  game.allies[1].dead = true;
  game.allies[1].hp = 0;
  game.spawned = getWave(game).ships.length;
  game.spawnClock = 999;
  stepGame(game, {}, .016);
  assert.ok(game.selected.includes('sahuseon'));
  assert.equal(takeUpgrade(game, 'sahuseon'), true);
  assert.equal(game.allies[1].type, 'sahuseon');
  assert.equal(game.allies[1].dead, false);
});

test('정박을 계속하면 노출되며 항해를 재개하면 노출이 해제된다', async () => {
  const { createGame, startRun, stepGame } = await simPromise;
  const game = createGame(117);
  startRun(game);
  game.spawnClock = 999;
  for (let i = 0; i < 130; i++) stepGame(game, {}, .05);
  assert.ok(game.stationarySeconds >= 6, '6초 정박 시 적의 우선 목표가 됨');
  for (let i = 0; i < 55; i++) stepGame(game, { forward: true }, .05);
  assert.ok(game.stationarySeconds < 3, '항해를 재개하면 정박 위험이 사라짐');
  assert.ok(game.tactical.sailed > 100, '실제 이동 거리를 기록');
});

test('같은 포격이라도 정박 노출 중인 기함이 더 큰 피해를 받는다', async () => {
  const { createGame, startRun, stepGame } = await simPromise;
  const regular = createGame(118), exposed = createGame(118);
  for (const game of [regular, exposed]) {
    startRun(game);
    game.spawnClock = 999;
    game.shots.push({ x: game.player.x - 45, y: game.player.y, vx: 475, vy: 0,
      traveled: 0, range: 600, damage: 35, team: 'japan', radius: 5 });
  }
  exposed.stationarySeconds = 6;
  stepGame(regular, {}, .05);
  stepGame(exposed, {}, .05);
  const normalLoss = regular.player.maxHp - regular.player.hp;
  const exposedLoss = exposed.player.maxHp - exposed.player.hp;
  assert.ok(normalLoss >= 35, '기본 피해가 실제 발생');
  assert.ok(exposedLoss > normalLoss * 1.6, '정박 위험이 유의미한 피해 차이로 작용');
  assert.ok(exposed.effects.some(effect => effect.type === 'damage' && effect.friendly && effect.amount >= 60));
});

test('교전마다 별도의 행동형 전술 임무와 수리·전공 보상이 있다', async () => {
  const { createGame, startRun, stepGame, getTacticalObjective, takeUpgrade, getWave } = await simPromise;
  const game = createGame(119);
  startRun(game);
  game.spawnClock = 999;
  game.player.hp = 200;
  assert.equal(getTacticalObjective(game).label, '측면 함포 명중');
  game.tactical.playerHits = 3;
  stepGame(game, {}, .016);
  assert.equal(getTacticalObjective(game).completed, true);
  assert.equal(game.player.hp, 222);
  assert.equal(game.score, 160);
  stepGame(game, {}, .016);
  assert.equal(game.score, 160, '중복 완료 보상 방지');

  game.spawned = getWave(game).ships.length;
  game.enemies = [];
  stepGame(game, {}, .016);
  assert.equal(game.mode, 'upgrade');
  assert.equal(takeUpgrade(game, game.selected[0]), true);
  game.spawnClock = 999;
  assert.equal(getTacticalObjective(game).label, '기함 기동');
  assert.equal(game.tactical.playerHits, 0, '교전 전용 행동 통계 초기화');
  game.tactical.sailed = 260;
  stepGame(game, {}, .016);
  assert.equal(getTacticalObjective(game).completed, true);
  assert.equal(game.score, 390);

  game.spawned = getWave(game).ships.length;
  game.enemies = [];
  stepGame(game, {}, .016);
  assert.equal(takeUpgrade(game, game.selected[0]), true);
  game.spawnClock = 999;
  assert.equal(getTacticalObjective(game).label, '함대 명령 실행');
  game.tactical.orders = 2;
  stepGame(game, {}, .016);
  assert.deepEqual(game.tactical.completed, [true, true, true]);
  assert.equal(game.score, 690);
  assert.equal(game.events.filter(event => event.kind === 'objective').length, 3);
});

test('64개 전투에서 정박 관전보다 실제 항해·선회·지휘가 유의미하게 유리하다', async () => {
  const { createGame, startRun, stepGame, takeUpgrade, issueOrder } = await simPromise;
  const play = (seed, tactical) => {
    const game = createGame(seed);
    startRun(game);
    for (let i = 0; i < 7200 && ['playing', 'upgrade'].includes(game.mode); i++) {
      if (game.mode === 'upgrade') {
        takeUpgrade(game, game.selected.includes('hull') ? 'hull' : game.selected[0]);
        continue;
      }
      if (tactical && game.signalCooldown <= 0 && game.enemies.length)
        issueOrder(game, game.player.hp < 170 ? 'guard' : 'rally');
      const enemy = game.enemies[0];
      if (!tactical) stepGame(game, {}, 1 / 30);
      else if (!enemy) stepGame(game, { forward: true }, 1 / 30);
      else {
        const aimAngle = Math.atan2(enemy.x - game.player.x, -(enemy.y - game.player.y)) + Math.PI / 2;
        const distance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
        stepGame(game, { aimAngle, throttle: distance > 300 ? 1 : 0 }, 1 / 30);
      }
    }
    assert.ok(['victory', 'defeat'].includes(game.mode), `씨앗 ${seed}: 전투 종료`);
    return game.mode === 'victory';
  };
  let passiveWins = 0, tacticalWins = 0;
  for (let seed = 1; seed <= 64; seed++) {
    passiveWins += Number(play(seed, false));
    tacticalWins += Number(play(seed, true));
  }
  assert.ok(passiveWins <= 20, `정박만으로 승리하는 경우가 너무 많음: ${passiveWins}/64`);
  assert.ok(tacticalWins >= 30, `적극적으로 플레이해도 전투가 너무 어려움: ${tacticalWins}/64`);
  assert.ok(tacticalWins - passiveWins >= 20, `조작과 지휘의 실효성이 부족함: ${tacticalWins} 대 ${passiveWins}`);
});

test('난이도는 보통이 기본이며 어려움은 명시적으로 선택해야 한다', async () => {
  const { createGame, DIFFICULTIES } = await simPromise;
  assert.deepEqual(Object.keys(DIFFICULTIES), ['normal', 'hard']);
  assert.equal(createGame().difficulty, 'normal');
  assert.equal(createGame(5, 'unknown').difficulty, 'normal');
  assert.equal(createGame(5, 'hard').difficulty, 'hard');
});

test('어려움 AI는 적 함종별 전술을 선택하며 기함 측면을 노린다', async () => {
  const { createGame, startRun, makeShip, stepGame } = await simPromise;
  const hard = createGame(151, 'hard');
  startRun(hard);
  hard.spawnClock = 999;
  for (const ally of hard.allies) ally.dead = true;
  const ships = [
    makeShip('kobaya', hard.player.x + 400, hard.player.y - 120, 0, 'fast'),
    makeShip('sekibune', hard.player.x - 310, hard.player.y + 80, 0, 'boarder'),
    makeShip('atakebune', hard.player.x + 390, hard.player.y + 130, 0, 'heavy')
  ];
  hard.enemies = ships;
  stepGame(hard, {}, .05);
  assert.equal(ships[0].aiTargetId, 'flagship', '고바야가 기함을 측면 목표로 지정');
  assert.ok(['측면 침투', '측면 교란'].includes(ships[0].aiMode));
  assert.ok(['도선 돌입', '도선 접근', '측면 압박'].includes(ships[1].aiMode));
  assert.ok(['포격 진입', '측면 포격', '거리 확보'].includes(ships[2].aiMode));
  const normal = createGame(151);
  startRun(normal);
  normal.spawnClock = 999;
  normal.enemies = [makeShip('kobaya', normal.player.x + 400, normal.player.y - 120, 0, 'fast')];
  stepGame(normal, {}, .05);
  assert.equal(normal.enemies[0].aiMode, 'approach', '기존 보통 AI 경로 유지');
});

test('어려움에서는 적 포격 속도·피해·적선 증원 간격이 강화된다', async () => {
  const { createGame, startRun, makeShip, stepGame, WAVES } = await simPromise;
  const games = ['normal', 'hard'].map(difficulty => createGame(152, difficulty));
  for (const game of games) {
    startRun(game);
    game.spawnClock = 999;
    game.player.reload = [999, 999];
    for (const ally of game.allies) ally.dead = true;
    game.enemies = [makeShip('atakebune', game.player.x, game.player.y - 220, Math.PI / 2, 'test-cannon')];
    stepGame(game, {}, .05);
  }
  const normalShot = games[0].shots.find(shot => shot.team === 'japan');
  const hardShot = games[1].shots.find(shot => shot.team === 'japan');
  assert.ok(normalShot && hardShot, '동일 배치에서 양 난이도 모두 발포');
  assert.ok(hardShot.damage > normalShot.damage, '어려움의 적 포격 피해 증가');
  assert.ok(games[1].enemies[0].reload.some((reload, i) => reload < games[0].enemies[0].reload[i] && reload > 0), '어려움의 재장전 단축');
  for (const game of games) {
    game.enemies = [];
    game.spawnClock = 0;
    stepGame(game, {}, .05);
  }
  assert.ok(games[1].spawnClock < games[0].spawnClock);
  assert.ok(games[1].spawnClock < WAVES[0].interval);
});

test('64시드 어려움은 보통보다 어렵지만 조작으로 승리 가능하고 교착하지 않는다', async () => {
  const { createGame, startRun, stepGame, takeUpgrade, issueOrder } = await simPromise;
  const play = (seed, difficulty, tactical) => {
    const game = createGame(seed, difficulty);
    startRun(game);
    for (let i = 0; i < 7200 && ['playing', 'upgrade'].includes(game.mode); i++) {
      if (game.mode === 'upgrade') {
        takeUpgrade(game, game.selected.includes('hull') ? 'hull' : game.selected[0]);
        continue;
      }
      if (tactical && game.signalCooldown <= 0 && game.enemies.length)
        issueOrder(game, game.player.hp < 170 ? 'guard' : 'rally');
      const enemy = game.enemies[0];
      if (!tactical) stepGame(game, {}, 1 / 30);
      else if (!enemy) stepGame(game, { forward: true }, 1 / 30);
      else {
        const aimAngle = Math.atan2(enemy.x - game.player.x, -(enemy.y - game.player.y)) + Math.PI / 2;
        const distance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
        stepGame(game, { aimAngle, throttle: distance > 300 ? 1 : 0 }, 1 / 30);
      }
    }
    assert.ok(['victory', 'defeat'].includes(game.mode), `${difficulty} 씨앗 ${seed}: 교착 없이 종료`);
    return Number(game.mode === 'victory');
  };
  let normalWins = 0, hardWins = 0, hardPassiveWins = 0;
  for (let seed = 1; seed <= 64; seed++) {
    normalWins += play(seed, 'normal', true);
    hardWins += play(seed, 'hard', true);
    hardPassiveWins += play(seed, 'hard', false);
  }
  assert.ok(hardWins >= 20, `어려움도 전략으로 극복 가능해야 함: ${hardWins}/64`);
  assert.ok(normalWins - hardWins >= 7, `두 난이도의 실질적 차이가 부족함: 보통 ${normalWins}, 어려움 ${hardWins}`);
  assert.ok(hardPassiveWins <= 10, `어려움에서 무조작 승리가 과도함: ${hardPassiveWins}`);
});
