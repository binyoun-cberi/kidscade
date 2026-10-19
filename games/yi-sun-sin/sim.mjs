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
  panokseon: { name: '판옥선', side: 'joseon', hp: 360, radius: 27, speed: 185, acceleration: 185, turn: 2.35, reload: 2.0, range: 455, damage: 26, volley: 2 },
  escort: { name: '협선', side: 'joseon', hp: 135, radius: 18, speed: 185, acceleration: 200, turn: 2.8, reload: 3.0, range: 350, damage: 12, volley: 1 },
  kobaya: { name: '고바야', side: 'japan', hp: 54, radius: 16, speed: 143, acceleration: 175, turn: 2.75, reload: 3.0, range: 210, damage: 9, volley: 1 },
  sekibune: { name: '세키부네', side: 'japan', hp: 95, radius: 22, speed: 111, acceleration: 145, turn: 2.3, reload: 2.85, range: 285, damage: 14, volley: 1 },
  atakebune: { name: '아타케부네', side: 'japan', hp: 164, radius: 31, speed: 83, acceleration: 115, turn: 1.65, reload: 3.2, range: 315, damage: 19, volley: 2 }
});

export const WAVES = Object.freeze([
  { name: '옥포 앞바다', note: '적은 정면에서도 다가옵니다. 판옥선의 좌우 함포로 맞서세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'kobaya', 'sekibune'], interval: 4 },
  { name: '적의 반격', note: '적선이 양쪽으로 흩어져 포위합니다. 선회하며 사거리를 지키세요.', ships: ['sekibune', 'kobaya', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya', 'sekibune'], interval: 3.7 },
  { name: '옥포의 결전', note: '대형 적선이 포진했습니다. 협선을 지키며 화력을 집중하세요.', ships: ['kobaya', 'sekibune', 'atakebune', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya', 'kobaya', 'atakebune'], interval: 3.5 }
]);

export const UPGRADES = Object.freeze([
  { id: 'cannon', icon: '砲', title: '화포 정비', text: '모든 함포 피해량 18% 증가' },
  { id: 'reload', icon: '⚙', title: '포수 숙련', text: '함포 재장전 시간 15% 감소' },
  { id: 'hull', icon: '⚒', title: '선체 수리', text: '판옥선 내구도 70 회복' },
  { id: 'escort', icon: '⚑', title: '협선 보강', text: '협선을 복구하거나 내구도 95 회복' },
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
    reload: [0, 0], hitCooldown: 0, dead: false, targetId: '', wakeClock: 0,
    flank: 1, aimSteady: 1, turnRate: 0
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
  const escort = game.allies[0];
  const available = options.filter(o =>
    !(o.id === 'hull' && game.player.hp >= game.player.maxHp - 15) &&
    !(o.id === 'escort' && escort && !escort.dead && escort.hp >= escort.maxHp - 15));
  if (escort?.dead) {
    return [UPGRADES.find(o => o.id === 'escort'), ...available.filter(o => o.id !== 'escort').slice(0, 2)];
  }
  return available.slice(0, 3);
}

export function takeUpgrade(game, id) {
  if (game.mode !== 'upgrade' || !game.selected.includes(id)) return false;
  if (id === 'cannon') game.bonuses.damage *= 1.18;
  if (id === 'reload') game.bonuses.reload *= 0.85;
  if (id === 'range') game.bonuses.range *= 1.14;
  if (id === 'rudder') game.bonuses.turn *= 1.14;
  if (id === 'hull') game.player.hp = Math.min(game.player.maxHp, game.player.hp + 70);
  if (id === 'escort') {
    const escort = game.allies[0];
    if (escort?.dead) {
      const behind = fwd(game.player.angle), flank = right(game.player.angle);
      game.allies[0] = makeShip('escort',
        cap(game.player.x - behind.x * 110 - flank.x * 80, 55, WORLD.width - 55),
        cap(game.player.y - behind.y * 110 - flank.y * 80, 55, WORLD.height - 55),
        game.player.angle, 'escort-1');
    } else if (escort) escort.hp = Math.min(escort.maxHp, escort.hp + 95);
  }
  game.waveIndex++;
  game.spawned = 0;
  game.spawnClock = 1.6;
  game.selected = [];
  game.mode = 'playing';
  game.events.push({ kind: 'wave', text: `${game.waveIndex + 1}차 교전 · ${getWave(game).name}` });
  return true;
}

export function issueSignal(game) {
  if (game.mode !== 'playing' || game.signalCooldown > 0 || !game.allies.some(ship => !ship.dead)) return false;
  game.signalCooldown = 24;
  game.signalRemaining = 8;
  game.events.push({ kind: 'signal', text: '호위 집결! 기함과 협선이 함께 속사합니다.' });
  return true;
}

export function togglePause(game) {
  if (game.mode === 'playing') game.mode = 'paused';
  else if (game.mode === 'paused') game.mode = 'playing';
}

function steer(ship, desiredAngle, throttle, dt, bonus = 1) {
  const cfg = SHIP_TYPES[ship.type];
  const baseTurn = cfg.turn * bonus * (0.35 + 0.65 * cap(Math.abs(ship.speed) / 85, 0, 1));
  const beforeTurn = ship.angle;
  ship.angle = turnTowards(ship.angle, desiredAngle, baseTurn * dt);
  ship.turnRate = Math.abs(wrap(ship.angle - beforeTurn)) / Math.max(dt, 0.0001);
  if (ship.id === 'flagship') {
    // The gun crews need a brief steady course; full-rudder circles cannot fire endlessly.
    ship.aimSteady = cap(ship.aimSteady + (ship.turnRate > 1.6 ? -2.8 : 1.8) * dt, 0, 1);
  }
  const acceleration = throttle > 0 ? cfg.acceleration : throttle < 0 ? cfg.acceleration * 1.7 : 0;
  ship.speed += throttle * acceleration * dt;
  ship.speed *= Math.exp(-0.68 * dt);
  ship.speed = cap(ship.speed, -cfg.speed * 0.25, cfg.speed);
  const direction = fwd(ship.angle);
  ship.x += direction.x * ship.speed * dt;
  ship.y += direction.y * ship.speed * dt;
  const boundedX = cap(ship.x, cfg.radius + 10, WORLD.width - cfg.radius - 10);
  const boundedY = cap(ship.y, cfg.radius + 10, WORLD.height - cfg.radius - 10);
  if (ship.x !== boundedX || ship.y !== boundedY) ship.speed *= 0.68;
  ship.x = boundedX;
  ship.y = boundedY;
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
  const validSpawn = (sx, sy) =>
    Math.hypot(sx - game.player.x, sy - game.player.y) >= 375 &&
    ISLANDS.every(island => Math.hypot(sx - island.x, sy - island.y) >= island.radius + 90);
  let found = false;
  // Try alternating flanks first, but never clamp a spawn on top of a cornered player.
  for (let attempt = 0; attempt < 48; attempt++) {
    const theta = attempt < 24
      ? (game.spawned % 2 ? Math.PI : 0) + game.waveIndex * 0.85 + (seededRandom(game) - 0.5) * 1.8
      : seededRandom(game) * TAU;
    const radius = 460 + seededRandom(game) * 160;
    const candidateX = game.player.x + Math.cos(theta) * radius;
    const candidateY = game.player.y + Math.sin(theta) * radius;
    x = cap(candidateX, 90, WORLD.width - 90);
    y = cap(candidateY, 90, WORLD.height - 90);
    if (validSpawn(x, y)) { found = true; break; }
  }
  if (!found) {
    // A corner plus a nearby island can reject every random attempt.
    search: for (const radius of [480, 620, 780, 960, 1160]) {
      for (let segment = 0; segment < 32; segment++) {
        const theta = segment / 32 * TAU;
        const sx = cap(game.player.x + Math.cos(theta) * radius, 90, WORLD.width - 90);
        const sy = cap(game.player.y + Math.sin(theta) * radius, 90, WORLD.height - 90);
        if (!validSpawn(sx, sy)) continue;
        x = sx; y = sy; found = true;
        break search;
      }
    }
  }
  const angle = Math.atan2(game.player.x - x, -(game.player.y - y));
  const ship = makeShip(type, x, y, angle, `enemy-${game.waveIndex}-${game.spawned}`);
  ship.flank = game.spawned % 2 ? -1 : 1;
  game.enemies.push(ship);
  game.spawned++;
  game.events.push({ kind: type === 'atakebune' ? 'boss' : 'spawn', text: type === 'atakebune' ? '대형 적선 출현! 측면 포격을 집중하세요.' : `적선 발견 · ${SHIP_TYPES[type].name}` });
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
  const reloadBonus = game.signalRemaining > 0 ? ship.id === 'escort-1' ? 0.55 : ship.id === 'flagship' ? 0.7 : 1 : 1;
  const range = cfg.range * improved.range;
  for (let i = 0; i < 2; i++) {
    ship.reload[i] = Math.max(0, ship.reload[i] - dt);
    if (ship.reload[i] > 0) continue;
    if (ship.id === 'flagship' && ship.aimSteady < 0.58) continue;
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

function segmentCircleTime(x0, y0, dx, dy, x, y, radius) {
  const a = dx * dx + dy * dy;
  if (a < 1e-8) return Infinity;
  const ox = x0 - x, oy = y0 - y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const b = 2 * (ox * dx + oy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return Infinity;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : Infinity;
}

function updateShots(game, dt) {
  const remaining = [];
  for (const shot of game.shots) {
    const oldX = shot.x, oldY = shot.y;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.traveled += Math.hypot(shot.vx, shot.vy) * dt;
    const targets = shot.team === 'japan' ? [game.player, ...game.allies] : game.enemies;
    const vx = shot.x - oldX, vy = shot.y - oldY;
    let firstHit = null;
    let hitTime = Infinity;
    for (const island of ISLANDS) {
      const t = segmentCircleTime(oldX, oldY, vx, vy, island.x, island.y, island.radius * 0.92);
      if (t < hitTime) { hitTime = t; firstHit = null; }
    }
    for (const target of targets) {
      if (target.dead) continue;
      const targetRadius = SHIP_TYPES[target.type].radius * 0.88 + shot.radius;
      const t = segmentCircleTime(oldX, oldY, vx, vy, target.x, target.y, targetRadius);
      if (t < hitTime) { hitTime = t; firstHit = target; }
    }
    if (hitTime !== Infinity) {
      shot.x = oldX + vx * hitTime;
      shot.y = oldY + vy * hitTime;
      if (firstHit) {
        firstHit.hp -= shot.damage;
      if (shot.team === 'joseon') game.hits++;
        addEffect(game, firstHit.x, firstHit.y, 'impact', 0.62);
        if (firstHit.hp <= 0) sink(game, firstHit);
      } else addEffect(game, shot.x, shot.y, 'splash', 0.65);
    }
    if (hitTime === Infinity && shot.traveled < shot.range && shot.x >= 0 && shot.y >= 0 && shot.x <= WORLD.width && shot.y <= WORLD.height) {
      remaining.push(shot);
    } else if (hitTime === Infinity) {
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
    const turn = Number.isFinite(input.turn) ? cap(input.turn, -1, 1) : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    angle = ship.angle + turn * SHIP_TYPES.panokseon.turn * game.bonuses.turn * dt;
    throttle = Number.isFinite(input.throttle) ? cap(input.throttle, -1, 1) : (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  }
  steer(ship, angle, throttle, dt, game.bonuses.turn);
  dodgeLand(game, ship, dt);
}

function controlEscort(game, escort, dt) {
  if (escort.dead) return;
  const player = game.player;
  const side = right(player.angle), ahead = fwd(player.angle);
  const rallied = game.signalRemaining > 0;
  const waypoint = {
    x: player.x + side.x * (rallied ? -100 : -145) - ahead.x * 92,
    y: player.y + side.y * (rallied ? -100 : -145) - ahead.y * 92
  };
  const target = closest(escort, game.enemies, 430);
  const formationDistance = distance(escort, waypoint);
  let heading = Math.atan2(waypoint.x - escort.x, -(waypoint.y - escort.y));
  let throttle = formationDistance > 80 ? 1 : 0.15;
  if (target && formationDistance < (rallied ? 105 : 180)) {
    const bearing = Math.atan2(target.x - escort.x, -(target.y - escort.y));
    heading = bearing - Math.PI / 2;
    throttle = rallied ? 0.32 : 0.5;
  }
  steer(escort, heading, throttle, dt);
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
  const bearing = Math.atan2(dx, -dy);
  const preferred = cfg.range * (enemy.type === 'kobaya' ? 0.77 : 0.84);
  let heading = bearing;
  let throttle = 1;
  if (d < preferred * 0.52) {
    heading = bearing + Math.PI + enemy.flank * 0.3; // disengage before ramming
  } else if (d < preferred + 95) {
    const towardPort = bearing + Math.PI / 2;
    const towardStarboard = bearing - Math.PI / 2;
    const candidates = enemy.flank > 0 ? [towardStarboard, towardPort] : [towardPort, towardStarboard];
    const safelyInside = a => {
      const direction = fwd(a);
      const nextX = enemy.x + direction.x * 135;
      const nextY = enemy.y + direction.y * 135;
      return nextX > 70 && nextX < WORLD.width - 70 && nextY > 70 && nextY < WORLD.height - 70;
    };
    heading = candidates.find(safelyInside) ?? bearing;
    throttle = d > preferred ? 0.66 : 0.35;
  } else {
    heading = bearing + enemy.flank * 0.18;
  }
  steer(enemy, heading, throttle, dt);
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
