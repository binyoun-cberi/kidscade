// Yi Sun-sin: Battle of Okpo — deterministic browser-side combat simulation.
// Original implementation inspired by MIT-licensed PirateShipGame's component
// boundaries, broadside combat, and bounded wave progression.
export const WORLD = Object.freeze({ width: 2300, height: 1500 });

export const ISLANDS = Object.freeze([
  { x: 320, y: 290, radius: 176, tint: 0 },
  { x: 2010, y: 1170, radius: 210, tint: 1 },
  { x: 1900, y: 260, radius: 110, tint: 2 },
  { x: 430, y: 1210, radius: 120, tint: 1 }
]);

export const SHIP_TYPES = Object.freeze({
  panokseon: { name: '판옥선', side: 'joseon', hp: 320, radius: 27, speed: 185, acceleration: 185, turn: 2.35, reload: 2.0, range: 455, damage: 26, volley: 2 },
  escort: { name: '협선', side: 'joseon', hp: 105, radius: 18, speed: 185, acceleration: 200, turn: 2.8, reload: 3.0, range: 325, damage: 10, volley: 1 },
  kobaya: { name: '고바야', side: 'japan', hp: 54, radius: 16, speed: 143, acceleration: 175, turn: 2.75, reload: 3.6, range: 210, damage: 8, volley: 1 },
  sekibune: { name: '세키부네', side: 'japan', hp: 95, radius: 22, speed: 111, acceleration: 145, turn: 2.3, reload: 3.15, range: 285, damage: 12, volley: 1 },
  atakebune: { name: '아타케부네', side: 'japan', hp: 164, radius: 31, speed: 83, acceleration: 115, turn: 1.65, reload: 3.6, range: 315, damage: 18, volley: 2 }
});

export const WAVES = Object.freeze([
  { name: '옥포 앞바다', note: '정박 중인 적선이 움직이기 시작합니다.', ships: ['kobaya', 'sekibune', 'kobaya', 'kobaya'], interval: 2.4 },
  { name: '적의 반격', note: '빠른 적선이 측면을 노립니다. 아군과 보조를 맞추세요.', ships: ['sekibune', 'kobaya', 'kobaya', 'sekibune', 'kobaya', 'sekibune'], interval: 2.1 },
  { name: '옥포의 결전', note: '큰 배가 나타났습니다. 화포의 사거리를 지키세요.', ships: ['kobaya', 'sekibune', 'atakebune', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'atakebune'], interval: 1.95 }
]);

export const UPGRADES = Object.freeze([
  { id: 'cannon', icon: '砲', title: '화포 정비', text: '모든 함포 피해량 18% 증가' },
  { id: 'reload', icon: '⚙', title: '포수 숙련', text: '함포 재장전 시간 15% 감소' },
  { id: 'hull', icon: '⚒', title: '선체 수리', text: '판옥선 내구도 70 회복' },
  { id: 'rudder', icon: '↶', title: '노련한 키잡이', text: '선회 속도 14% 증가' },
  { id: 'range', icon: '◎', title: '거리 가늠', text: '함포 사거리 14% 증가' }
]);

const TAU = Math.PI * 2;
const cap = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fwd = angle => ({ x: Math.sin(angle), y: -Math.cos(angle) });
const right = angle => ({ x: Math.cos(angle), y: Math.sin(angle) });
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function turnTowards(current, target, step) {
  const delta = wrap(target - current);
  return wrap(current + cap(delta, -step, step));
}

export function seededRandom(state) {
  let value = state.seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.seed = value >>> 0 || 1;
  return state.seed / 4294967296;
}

export function makeShip(type, x, y, angle = 0, id = '') {
  const spec = SHIP_TYPES[type];
  if (!spec) throw new Error(`Unknown vessel: ${type}`);
  return {
    id, type, team: spec.side, x, y, angle, speed: 0, hp: spec.hp, maxHp: spec.hp,
    reload: [0, 0], hitCooldown: 0, dead: false, targetId: '', wakeClock: 0
  };
}

export function createGame(seed = 1592) {
  const game = {
    seed: seed || 1592, mode: 'menu', seconds: 0, waveIndex: 0, spawned: 0,
    spawnClock: 0, kills: 0, hits: 0, shotsFired: 0, score: 0, selected: [],
    bonuses: { damage: 1, reload: 1, range: 1, turn: 1 },
    signalCooldown: 0, signalRemaining: 0, events: [], shots: [], effects: [],
    enemies: [], player: makeShip('panokseon', 1160, 805, -0.25, 'flagship'),
    allies: [makeShip('escort', 1080, 875, -0.25, 'escort-1')]
  };
  return game;
}

export function startRun(game) {
  game.mode = 'playing';
  game.waveIndex = 0;
  game.spawned = 0;
  game.spawnClock = 1.2;
  game.events.push({ kind: 'wave', text: '첫 출전 · 옥포 앞바다' });
  return game;
}

export function getWave(game) {
  return WAVES[game.waveIndex] || null;
}

export function upgradeChoices(game) {
  const options = [...UPGRADES];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(game) * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  if (game.player.hp >= game.player.maxHp - 15) {
    return options.filter(o => o.id !== 'hull').slice(0, 3);
  }
  return options.slice(0, 3);
}

export function takeUpgrade(game, id) {
  if (game.mode !== 'upgrade' || !game.selected.includes(id)) return false;
  if (id === 'cannon') game.bonuses.damage *= 1.18;
  if (id === 'reload') game.bonuses.reload *= 0.85;
  if (id === 'range') game.bonuses.range *= 1.14;
  if (id === 'rudder') game.bonuses.turn *= 1.14;
  if (id === 'hull') game.player.hp = Math.min(game.player.maxHp, game.player.hp + 70);
  game.waveIndex++;
  game.spawned = 0;
  game.spawnClock = 1.6;
  game.selected = [];
  game.mode = 'playing';
  game.events.push({ kind: 'wave', text: `${game.waveIndex + 1}차 교전 · ${getWave(game).name}` });
  return true;
}

export function issueSignal(game) {
  if (game.mode !== 'playing' || game.signalCooldown > 0) return false;
  game.signalCooldown = 24;
  game.signalRemaining = 8;
  game.events.push({ kind: 'signal', text: '집결 신호! 아군이 화력을 집중합니다.' });
  return true;
}

export function togglePause(game) {
  if (game.mode === 'playing') game.mode = 'paused';
  else if (game.mode === 'paused') game.mode = 'playing';
}

function steer(ship, desiredAngle, throttle, dt, bonus = 1) {
  const cfg = SHIP_TYPES[ship.type];
  const baseTurn = cfg.turn * bonus * (0.35 + 0.65 * cap(Math.abs(ship.speed) / 85, 0, 1));
  ship.angle = turnTowards(ship.angle, desiredAngle, baseTurn * dt);
  const acceleration = throttle > 0 ? cfg.acceleration : throttle < 0 ? cfg.acceleration * 1.7 : 0;
  ship.speed += throttle * acceleration * dt;
  ship.speed *= Math.exp(-0.68 * dt);
  ship.speed = cap(ship.speed, -cfg.speed * 0.25, cfg.speed);
  const direction = fwd(ship.angle);
  ship.x += direction.x * ship.speed * dt;
  ship.y += direction.y * ship.speed * dt;
  ship.x = cap(ship.x, cfg.radius + 10, WORLD.width - cfg.radius - 10);
  ship.y = cap(ship.y, cfg.radius + 10, WORLD.height - cfg.radius - 10);
}

function dodgeLand(game, ship, dt) {
  for (const island of ISLANDS) {
    const dx = ship.x - island.x;
    const dy = ship.y - island.y;
    const d = Math.hypot(dx, dy) || 1;
    const min = island.radius + SHIP_TYPES[ship.type].radius * 0.65;
    if (d >= min) continue;
    ship.x = island.x + dx / d * min;
    ship.y = island.y + dy / d * min;
    ship.speed *= -0.12;
    if (ship.hitCooldown <= 0) {
      ship.hp -= 5;
      ship.hitCooldown = 1.3;
      addEffect(game, ship.x, ship.y, 'splash', 0.8);
      if (ship.hp <= 0) sink(game, ship);
    }
  }
  ship.hitCooldown = Math.max(0, ship.hitCooldown - dt);
}

function addEffect(game, x, y, type, duration = 0.7) {
  game.effects.push({ x, y, type, duration, age: 0, seed: seededRandom(game) });
  if (game.effects.length > 140) game.effects.splice(0, game.effects.length - 140);
}

function sink(game, ship) {
  if (ship.dead) return;
  ship.dead = true;
  ship.hp = 0;
  addEffect(game, ship.x, ship.y, 'sink', 1.6);
  if (ship.team === 'japan') {
    game.kills++;
    game.score += ship.type === 'atakebune' ? 250 : ship.type === 'sekibune' ? 130 : 80;
    game.events.push({ kind: 'hit', text: `${SHIP_TYPES[ship.type].name} 격침` });
  } else if (ship.id === 'flagship') {
    game.mode = 'defeat';
    game.events.push({ kind: 'defeat', text: '기함이 더는 항해할 수 없습니다.' });
  }
}

function spawnEnemy(game) {
  const wave = getWave(game);
  if (!wave || game.spawned >= wave.ships.length) return;
  const type = wave.ships[game.spawned];
  let x = 0, y = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    const theta = seededRandom(game) * TAU;
    const radius = 490 + seededRandom(game) * 135;
    x = cap(game.player.x + Math.cos(theta) * radius, 90, WORLD.width - 90);
    y = cap(game.player.y + Math.sin(theta) * radius, 90, WORLD.height - 90);
    if (ISLANDS.every(island => Math.hypot(x - island.x, y - island.y) > island.radius + 100)) break;
  }
  const angle = Math.atan2(game.player.x - x, -(game.player.y - y));
  const ship = makeShip(type, x, y, angle, `enemy-${game.waveIndex}-${game.spawned}`);
  game.enemies.push(ship);
  game.spawned++;
  game.events.push({ kind: 'spawn', text: `적선 발견 · ${SHIP_TYPES[type].name}` });
}

function closest(ship, ships, range = Infinity) {
  let result = null, best = range;
  for (const other of ships) {
    if (other.dead) continue;
    const d = distance(ship, other);
    if (d < best) { best = d; result = other; }
  }
  return result;
}

export function broadsideTarget(ship, targets, side, range = SHIP_TYPES[ship.type].range) {
  const lateral = right(ship.angle);
  let selected = null, closestDistance = range;
  for (const target of targets) {
    if (target.dead) continue;
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const d = Math.hypot(dx, dy);
    if (d < 1 || d >= closestDistance) continue;
    // Fire only when the target lies in a 100-degree broadside cone.
    if ((dx * lateral.x + dy * lateral.y) * side / d < 0.64) continue;
    selected = target;
    closestDistance = d;
  }
  return selected;
}

function fire(ship, targets, game, dt) {
  const cfg = SHIP_TYPES[ship.type];
  const improved = ship.id === 'flagship' ? game.bonuses : { reload: 1, range: 1, damage: 1 };
  const reloadBonus = ship.id === 'escort-1' && game.signalRemaining > 0 ? 0.55 : 1;
  const range = cfg.range * improved.range;
  for (let i = 0; i < 2; i++) {
    ship.reload[i] = Math.max(0, ship.reload[i] - dt);
    if (ship.reload[i] > 0) continue;
    const side = i === 0 ? -1 : 1;
    const target = broadsideTarget(ship, targets, side, range);
    if (!target) continue;
    ship.reload[i] = cfg.reload * improved.reload * reloadBonus;
    const lateral = right(ship.angle);
    const forward = fwd(ship.angle);
    for (let ball = 0; ball < cfg.volley; ball++) {
      const offset = (ball - (cfg.volley - 1) / 2) * 15;
      const sx = ship.x + lateral.x * side * cfg.radius * 0.9 + forward.x * offset;
      const sy = ship.y + lateral.y * side * cfg.radius * 0.9 + forward.y * offset;
      const flight = distance({ x: sx, y: sy }, target) / 475;
      const leadX = target.x + fwd(target.angle).x * target.speed * flight * 0.68;
      const leadY = target.y + fwd(target.angle).y * target.speed * flight * 0.68;
      const baseAngle = Math.atan2(leadY - sy, leadX - sx);
      const spread = (seededRandom(game) - 0.5) * 0.1;
      const angle = baseAngle + spread;
      game.shots.push({ x: sx, y: sy, vx: Math.cos(angle) * 475, vy: Math.sin(angle) * 475,
        traveled: 0, range, damage: cfg.damage * improved.damage, team: ship.team, radius: 5 });
      game.shotsFired++;
    }
    addEffect(game, ship.x + lateral.x * side * cfg.radius, ship.y + lateral.y * side * cfg.radius, 'muzzle', 0.32);
    game.events.push({ kind: 'fire', text: ship.id === 'flagship' ? '함포 발사' : '' });
  }
  if (game.shots.length > 220) game.shots.splice(0, game.shots.length - 220);
}

function updateShots(game, dt) {
  const remaining = [];
  for (const shot of game.shots) {
    const oldX = shot.x, oldY = shot.y;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.traveled += Math.hypot(shot.vx, shot.vy) * dt;
    const targets = shot.team === 'japan' ? [game.player, ...game.allies] : game.enemies;
    let impacted = false;
    for (const target of targets) {
      if (target.dead) continue;
      const targetRadius = SHIP_TYPES[target.type].radius * 0.88 + shot.radius;
      const vx = shot.x - oldX, vy = shot.y - oldY;
      const ratio = cap(((target.x - oldX) * vx + (target.y - oldY) * vy) / (vx * vx + vy * vy || 1), 0, 1);
      const cx = oldX + vx * ratio, cy = oldY + vy * ratio;
      if (Math.hypot(cx - target.x, cy - target.y) > targetRadius) continue;
      target.hp -= shot.damage;
      if (shot.team === 'joseon') game.hits++;
      addEffect(game, target.x, target.y, 'impact', 0.62);
      if (target.hp <= 0) sink(game, target);
      impacted = true;
      break;
    }
    if (!impacted && shot.traveled < shot.range && shot.x >= 0 && shot.y >= 0 && shot.x <= WORLD.width && shot.y <= WORLD.height) {
      remaining.push(shot);
    } else if (!impacted) {
      addEffect(game, shot.x, shot.y, 'splash', 0.65);
    }
  }
  game.shots = remaining;
}

function controlPlayer(game, input, dt) {
  const ship = game.player;
  let angle = ship.angle;
  let throttle = 0;
  if (Number.isFinite(input.aimAngle)) {
    angle = input.aimAngle;
    throttle = input.throttle ?? 1;
  } else {
    const turn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    angle = ship.angle + turn * SHIP_TYPES.panokseon.turn * game.bonuses.turn * dt;
    throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  }
  steer(ship, angle, throttle, dt, game.bonuses.turn);
  dodgeLand(game, ship, dt);
}

function controlEscort(game, escort, dt) {
  if (escort.dead) return;
  const player = game.player;
  const target = closest(escort, game.enemies, 340);
  let waypoint = { x: player.x - 92, y: player.y + 75 };
  if (target && game.signalRemaining > 0) waypoint = target;
  const heading = Math.atan2(waypoint.x - escort.x, -(waypoint.y - escort.y));
  steer(escort, heading, distance(escort, waypoint) > 95 ? 1 : 0.2, dt);
  dodgeLand(game, escort, dt);
}

function controlEnemy(game, enemy, dt) {
  if (enemy.dead) return;
  const target = closest(enemy, [game.player, ...game.allies]);
  if (!target) return;
  const cfg = SHIP_TYPES[enemy.type];
  const d = distance(enemy, target);
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  let heading;
  if (d < cfg.range * 0.72 && enemy.type !== 'kobaya') {
    heading = Math.atan2(-dy, dx); // orbit broadside-on instead of charging head-on
  } else {
    heading = Math.atan2(dx, -dy);
  }
  steer(enemy, heading, d > 84 ? 1 : 0, dt);
  dodgeLand(game, enemy, dt);
  if (d < cfg.radius + SHIP_TYPES[target.type].radius + 4 && enemy.hitCooldown <= 0) {
    target.hp -= enemy.type === 'atakebune' ? 18 : 7;
    enemy.hitCooldown = 1.1;
    addEffect(game, target.x, target.y, 'impact', 0.6);
    if (target.hp <= 0) sink(game, target);
  }
}

export function stepGame(game, input = {}, dt = 1 / 60) {
  if (game.mode !== 'playing') return game;
  dt = cap(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  game.seconds += dt;
  game.signalCooldown = Math.max(0, game.signalCooldown - dt);
  game.signalRemaining = Math.max(0, game.signalRemaining - dt);
  for (const effect of game.effects) effect.age += dt;
  game.effects = game.effects.filter(effect => effect.age < effect.duration);
  controlPlayer(game, input, dt);
  for (const ally of game.allies) controlEscort(game, ally, dt);
  for (const enemy of game.enemies) controlEnemy(game, enemy, dt);
  fire(game.player, game.enemies, game, dt);
  for (const ally of game.allies) if (!ally.dead) fire(ally, game.enemies, game, dt);
  for (const enemy of game.enemies) if (!enemy.dead) fire(enemy, [game.player, ...game.allies], game, dt);
  updateShots(game, dt);
  game.enemies = game.enemies.filter(ship => !ship.dead);
  if (game.mode === 'defeat') return game;

  const wave = getWave(game);
  if (!wave) return game;
  game.spawnClock -= dt;
  if (game.spawned < wave.ships.length && game.spawnClock <= 0) {
    spawnEnemy(game);
    game.spawnClock = wave.interval;
  }
  if (game.spawned === wave.ships.length && game.enemies.length === 0) {
    game.shots = [];
    if (game.waveIndex === WAVES.length - 1) {
      game.mode = 'victory';
      game.score += Math.round(game.player.hp * 2);
      game.events.push({ kind: 'victory', text: '옥포 앞바다의 적선을 물리쳤습니다.' });
    } else {
      game.mode = 'upgrade';
      game.selected = upgradeChoices(game).map(option => option.id);
      game.events.push({ kind: 'upgrade', text: '교전 종료 · 다음 출전을 준비하세요.' });
    }
  }
  return game;
}
