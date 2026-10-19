// Yi Sun-sin: Battle of Okpo — deterministic browser-side combat simulation.
// Original implementation inspired by MIT-licensed PirateShipGame's component
// boundaries, broadside combat, and bounded wave progression.
export const WORLD = Object.freeze({ width: 2300, height: 1500 });

export const DIFFICULTIES = Object.freeze({
  normal: { label: '보통', description: '측면 포격과 기본 적선 기동을 익히는 해전' },
  hard: { label: '어려움', description: '적선이 포위·도선·함포 사거리를 판단해 협공하는 해전' }
});

export const ISLANDS = Object.freeze([
  { x: 320, y: 290, radius: 176, tint: 0 },
  { x: 2010, y: 1170, radius: 210, tint: 1 },
  { x: 1900, y: 260, radius: 110, tint: 2 },
  { x: 430, y: 1210, radius: 120, tint: 1 }
]);

export const SHIP_TYPES = Object.freeze({
  panokseon: { name: '판옥선', side: 'joseon', hp: 360, radius: 27, speed: 185, acceleration: 185, turn: 2.35, reload: 2.0, range: 455, damage: 26, volley: 2, boardingDamageTaken: .52 },
  escort: { name: '협선', side: 'joseon', hp: 135, radius: 18, speed: 185, acceleration: 200, turn: 2.8, reload: 3.0, range: 350, damage: 12, volley: 1, scoutRange: 680 },
  sahuseon: { name: '사후선', side: 'joseon', hp: 72, radius: 12, speed: 208, acceleration: 225, turn: 3.1, reload: 0, range: 0, damage: 0, volley: 0, scoutRange: 880 },
  kobaya: { name: '고바야', side: 'japan', hp: 54, radius: 16, speed: 161, acceleration: 190, turn: 2.95, reload: 3.0, range: 210, damage: 9, volley: 1 },
  sekibune: { name: '세키부네', side: 'japan', hp: 95, radius: 22, speed: 119, acceleration: 155, turn: 2.3, reload: 2.85, range: 285, damage: 14, volley: 1, boardingDamage: 24, boardingTime: 1.35 },
  atakebune: { name: '아타케부네', side: 'japan', hp: 175, radius: 31, speed: 83, acceleration: 115, turn: 1.65, reload: 3.2, range: 315, damage: 19, volley: 2, boardingDamage: 34, boardingTime: 1.8 },
  // First deployed at Sacheon; intentionally unavailable in the Okpo waves.
  turtle: { name: '거북선', side: 'joseon', hp: 400, radius: 30, speed: 158, acceleration: 160, turn: 2.15, reload: 2.35, range: 430, damage: 31, volley: 2, boardingDamageTaken: .18 }
});

export const SHIP_GUIDE = Object.freeze([
  { type: 'panokseon', period: '옥포 · 아군 주력', role: '높은 전투 갑판 · 좌우 화포', note: '격군을 아래층에 보호하고 높은 갑판에서 포격합니다. 적의 도선 피해를 줄입니다.' },
  { type: 'escort', period: '옥포 · 아군 호위', role: '정찰 · 연락 · 경무장 호위', note: '멀리 나타난 적선을 레이더에 알리고 기함 지휘에 호응합니다.' },
  { type: 'sahuseon', period: '옥포 · 아군 부속정', role: '연락 · 정찰 · 비무장', note: '적선 발견 범위를 넓히지만 화포를 발사하지 않습니다. 격침되면 정비 때 복구할 수 있습니다.' },
  { type: 'kobaya', period: '옥포 · 일본 소형선', role: '빠른 정찰 · 교란', note: '재빠른 방향 전환과 약한 원거리 공격이 특징입니다. 小早는 고바야로 표기합니다.' },
  { type: 'sekibune', period: '옥포 · 일본 중형선', role: '측면 기동 · 도선 접근', note: '포격을 피하며 가까이 접근해 갑판으로 뛰어오르려 합니다.' },
  { type: 'atakebune', period: '옥포 · 일본 대형선', role: '중장갑 누각 · 대형 화포 · 도선', note: '느리지만 견고하며 다층 누각을 갖춘 적 지휘함으로 등장합니다.' },
  { type: 'turtle', period: '사천 해전에서 등장 예정', role: '덮개로 보호된 돌격선', note: '옥포 전투에는 등장하지 않습니다. 덮개와 침입 방지 구조를 사용하며 철판 장갑 여부는 단정하지 않습니다.' }
]);

// Fictionalised loadouts: historical-style names describe the role of each gun,
// while the numbers and special effects are arcade rules, not period statistics.
export const WEAPONS = Object.freeze({
  standard: { name: '기본 화포', damage: 26, volley: 2, reload: 2, range: 455, speed: 475, spread: .1, burn: 0, burnTime: 0 },
  rapid: { name: '속사 화포', damage: 17, volley: 2, reload: 1.15, range: 390, speed: 510, spread: .14, burn: 0, burnTime: 0 },
  heavy: { name: '대형 총통', damage: 68, volley: 1, reload: 2.85, range: 490, speed: 445, spread: .055, burn: 0, burnTime: 0 },
  scatter: { name: '근접 산탄', damage: 15, volley: 4, reload: 2.3, range: 310, speed: 455, spread: .34, burn: 0, burnTime: 0 },
  fire: { name: '화염탄', damage: 19, volley: 2, reload: 2.65, range: 420, speed: 465, spread: .12, burn: 7, burnTime: 2.8 }
});

export const WAVES = Object.freeze([
  { name: '옥포 앞바다', note: '적은 정면에서도 다가옵니다. 판옥선의 좌우 함포로 맞서세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'kobaya', 'sekibune'], interval: 4 },
  { name: '적의 반격', note: '세키부네가 측면으로 다가와 도선을 노립니다. 거리를 벌리며 사격하세요.', ships: ['sekibune', 'kobaya', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya', 'sekibune'], interval: 3.7 },
  { name: '옥포의 결전', note: '다층 누각의 아타케부네를 포함한 적선이 몰려옵니다. 협선을 지휘하며 화력을 집중하세요.', ships: ['kobaya', 'sekibune', 'atakebune', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya', 'kobaya', 'atakebune'], interval: 4.7 }
]);

export const UPGRADES = Object.freeze([
  { id: 'cannon', icon: '砲', title: '화포 정비', text: '모든 함포 피해량 18% 증가' },
  { id: 'reload', icon: '⚙', title: '포수 숙련', text: '함포 재장전 시간 15% 감소' },
  { id: 'hull', icon: '⚒', title: '선체 수리', text: '판옥선 내구도 70 회복' },
  { id: 'escort', icon: '⚑', title: '협선 보강', text: '협선을 복구하거나 내구도 95 회복' },
  { id: 'sahuseon', icon: '目', title: '사후선 복구', text: '정찰·연락용 사후선을 복구' },
  { id: 'rudder', icon: '↶', title: '노련한 키잡이', text: '선회 속도 14% 증가' },
  { id: 'range', icon: '◎', title: '거리 가늠', text: '함포 사거리 14% 증가' },
  ...['rapid', 'heavy', 'scatter', 'fire'].flatMap(weapon => [
    { id: `port_${weapon}`, icon: '左', title: `좌현 · ${WEAPONS[weapon].name}`, text: weapon === 'rapid' ? '장전이 빠른 화포로 교체' : weapon === 'heavy' ? '강력한 한 발로 적선을 공격' : weapon === 'scatter' ? '가까운 적선에 여러 발을 발사' : '적선에 불을 붙여 지속 피해', slot: 'port', weapon },
    { id: `starboard_${weapon}`, icon: '右', title: `우현 · ${WEAPONS[weapon].name}`, text: weapon === 'rapid' ? '장전이 빠른 화포로 교체' : weapon === 'heavy' ? '강력한 한 발로 적선을 공격' : weapon === 'scatter' ? '가까운 적선에 여러 발을 발사' : '적선에 불을 붙여 지속 피해', slot: 'starboard', weapon }
  ])
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
    aiMode: 'approach', aiTargetId: '',
    flank: 1, aimSteady: 1, turnRate: 0, burnRemaining: 0, burnDps: 0,
    tacticClock: 3.5, boardingRun: type === 'sekibune', boardingProgress: 0,
    boardingTargetId: '', boardingCooldown: 0
  };
}

export function createGame(seed = 1592, difficulty = 'normal') {
  const game = {
    difficulty: DIFFICULTIES[difficulty] ? difficulty : 'normal',
    seed: seed || 1592, mode: 'menu', seconds: 0, waveIndex: 0, spawned: 0,
    spawnClock: 0, kills: 0, hits: 0, shotsFired: 0, score: 0, selected: [],
    bonuses: { damage: 1, reload: 1, range: 1, turn: 1 },
    signalCooldown: 0, signalRemaining: 0, signalOrder: 'rally', focusTargetId: '',
    stationarySeconds: 0,
    tactical: { playerHits: 0, sailed: 0, orders: 0, completed: [false, false, false] },
    arsenal: { port: 'standard', starboard: 'standard' },
    events: [], shots: [], effects: [],
    enemies: [], player: makeShip('panokseon', 1160, 805, -0.25, 'flagship'),
    allies: [makeShip('escort', 1080, 875, -0.25, 'escort-1'), makeShip('sahuseon', 1220, 935, -0.25, 'sahuseon-1')]
  };
  return game;
}

export function startRun(game) {
  game.mode = 'playing';
  game.waveIndex = 0;
  game.spawned = 0;
  game.spawnClock = 1.2;
  game.events.push({ kind: 'wave', text: game.difficulty === 'hard' ? '어려움 · 적선의 협공과 도선에 대비하세요!' : '첫 출전 · 옥포 앞바다' });
  return game;
}

export function getWave(game) {
  return WAVES[game.waveIndex] || null;
}

export function getTacticalObjective(game) {
  const goals = [
    { label: '측면 함포 명중', value: game.tactical.playerHits, target: 3 },
    { label: '기함 기동', value: Math.floor(game.tactical.sailed), target: 260, unit: 'm' },
    { label: '함대 명령 실행', value: game.tactical.orders, target: 2 }
  ];
  const goal = goals[game.waveIndex] || goals[2];
  return { ...goal, completed: game.tactical.completed[game.waveIndex] };
}

function awardTacticalObjective(game) {
  if (game.mode !== 'playing' || game.player.dead) return;
  const goal = getTacticalObjective(game);
  if (goal.completed || goal.value < goal.target) return;
  game.tactical.completed[game.waveIndex] = true;
  game.score += Math.round((160 + game.waveIndex * 70) * (game.difficulty === 'hard' ? 1.3 : 1));
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 22);
  game.events.push({ kind: 'objective', text: `전술 임무 달성 · ${goal.label}! 전공과 긴급 수리 획득` });
}

export function upgradeChoices(game) {
  const shuffled = options => {
    const result = [...options];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(game) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const port = shuffled(UPGRADES.filter(o => o.slot === 'port' && game.arsenal.port !== o.weapon))[0];
  const starboard = shuffled(UPGRADES.filter(o => o.slot === 'starboard' && game.arsenal.starboard !== o.weapon))[0];
  const escort = game.allies[0];
  const available = shuffled(UPGRADES.filter(o => !o.slot &&
    !(o.id === 'hull' && game.player.hp >= game.player.maxHp - 15) &&
    !(o.id === 'escort' && escort && !escort.dead && escort.hp >= escort.maxHp - 15) &&
    !(o.id === 'sahuseon' && game.allies.some(ally => ally.type === 'sahuseon' && !ally.dead))));
  const support = escort?.dead ? UPGRADES.find(o => o.id === 'escort') :
    game.allies.some(ally => ally.type === 'sahuseon' && ally.dead) ? UPGRADES.find(o => o.id === 'sahuseon') : available[0];
  return shuffled([port, starboard, support].filter(Boolean));
}

export function takeUpgrade(game, id) {
  if (game.mode !== 'upgrade' || !game.selected.includes(id)) return false;
  // The crews patch ordinary damage between engagements; the hull upgrade adds
  // a further, meaningful repair instead of becoming a compulsory pick.
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 75);
  if (id === 'cannon') game.bonuses.damage *= 1.18;
  if (id === 'reload') game.bonuses.reload *= 0.85;
  if (id === 'range') game.bonuses.range *= 1.14;
  if (id === 'rudder') game.bonuses.turn *= 1.14;
  if (id === 'hull') game.player.hp = Math.min(game.player.maxHp, game.player.hp + 70);
  const weaponUpgrade = UPGRADES.find(option => option.id === id && option.slot);
  if (weaponUpgrade) game.arsenal[weaponUpgrade.slot] = weaponUpgrade.weapon;
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
  if (id === 'sahuseon') {
    const behind = fwd(game.player.angle), side = right(game.player.angle);
    game.allies[1] = makeShip('sahuseon',
      cap(game.player.x - behind.x * 100 + side.x * 90, 35, WORLD.width - 35),
      cap(game.player.y - behind.y * 100 + side.y * 90, 35, WORLD.height - 35), game.player.angle, 'sahuseon-1');
  }
  game.waveIndex++;
  game.spawned = 0;
  game.spawnClock = 1.6;
  game.stationarySeconds = 0;
  game.tactical.playerHits = 0;
  game.tactical.sailed = 0;
  game.tactical.orders = 0;
  game.selected = [];
  game.mode = 'playing';
  game.events.push({ kind: 'wave', text: `${game.waveIndex + 1}차 교전 · ${getWave(game).name}` });
  return true;
}

export function issueSignal(game) {
  return issueOrder(game, 'rally');
}

export function issueOrder(game, order) {
  if (!['rally', 'focus', 'guard'].includes(order) || game.mode !== 'playing' || game.signalCooldown > 0 || !game.allies.some(ship => ship.type === 'escort' && !ship.dead)) return false;
  if (order === 'focus') {
    const priority = game.enemies.filter(ship => !ship.dead).sort((a, b) =>
      (b.type === 'atakebune') - (a.type === 'atakebune') || distance(a, game.player) - distance(b, game.player))[0];
    if (!priority) return false;
    game.focusTargetId = priority.id;
  } else game.focusTargetId = '';
  game.signalCooldown = 24;
  game.signalRemaining = 8;
  game.signalOrder = order;
  game.tactical.orders++;
  game.events.push({ kind: 'signal', text: order === 'rally' ? '호위 집결! 기함과 협선이 함께 속사합니다.' : order === 'focus' ? '집중 공격! 지정 적선을 함께 공격합니다.' : '기함 엄호! 협선이 가까이서 적의 공격을 막습니다.' });
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

function addEffect(game, x, y, type, duration = 0.7, details = {}) {
  game.effects.push({ x, y, type, duration, age: 0, seed: seededRandom(game), ...details });
  if (game.effects.length > 140) game.effects.splice(0, game.effects.length - 140);
}

function sink(game, ship) {
  if (ship.dead) return;
  ship.dead = true;
  ship.hp = 0;
  addEffect(game, ship.x, ship.y, 'sink', 1.6);
  if (ship.team === 'japan') {
    game.kills++;
    const points = ship.type === 'atakebune' ? 250 : ship.type === 'sekibune' ? 130 : 80;
    game.score += Math.round(points * (game.difficulty === 'hard' ? 1.3 : 1));
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
  ship.tacticClock = 2.8 + seededRandom(game) * 2.2;
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

export function broadsideTarget(ship, targets, side, range = SHIP_TYPES[ship.type].range, preferredId = '') {
  const lateral = right(ship.angle);
  let selected = null, preferred = null, closestDistance = range;
  for (const target of targets) {
    if (target.dead) continue;
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const d = Math.hypot(dx, dy);
    if (d < 1 || d >= range) continue;
    // Fire only when the target lies in a 100-degree broadside cone.
    if ((dx * lateral.x + dy * lateral.y) * side / d < 0.64) continue;
    if (target.id === preferredId) preferred = target;
    if (d < closestDistance) { selected = target; closestDistance = d; }
  }
  return preferred || selected;
}

export function radarContacts(game) {
  return game.enemies.filter(enemy => !enemy.dead && (
    distance(enemy, game.player) < 390 || game.allies.some(ally =>
      !ally.dead && distance(enemy, ally) < (SHIP_TYPES[ally.type].scoutRange || 0))
  ));
}

export function boardingThreat(game) {
  return game.enemies.filter(enemy => !enemy.dead && enemy.boardingProgress > 0 &&
    enemy.boardingTargetId === game.player.id).sort((a, b) => b.boardingProgress - a.boardingProgress)[0] || null;
}

function fire(ship, targets, game, dt) {
  const cfg = SHIP_TYPES[ship.type];
  if (!cfg.volley || !cfg.range) return; // Sahu boats carry dispatches, not cannons.
  const improved = ship.id === 'flagship' ? game.bonuses : { reload: 1, range: 1, damage: 1 };
  const rallied = game.signalRemaining > 0 && game.signalOrder === 'rally';
  const focused = game.signalRemaining > 0 && game.signalOrder === 'focus';
  const reloadBonus = rallied ? ship.id === 'escort-1' ? .55 : ship.id === 'flagship' ? .7 : 1 : focused && ship.id === 'escort-1' ? .8 : 1;
  const exposedFlagship = ship.team === 'japan' && game.stationarySeconds >= 6;
  for (let i = 0; i < 2; i++) {
    ship.reload[i] = Math.max(0, ship.reload[i] - dt);
    if (ship.reload[i] > 0) continue;
    if (ship.id === 'flagship' && ship.aimSteady < 0.58) continue;
    const side = i === 0 ? -1 : 1;
    const weapon = ship.id === 'flagship' ? WEAPONS[game.arsenal[i === 0 ? 'port' : 'starboard']] || WEAPONS.standard : null;
    const range = (weapon?.range ?? cfg.range) * improved.range;
    const target = broadsideTarget(ship, targets, side, range, focused ? game.focusTargetId : '');
    if (!target) continue;
    // Coordinated Japanese broadsides are dangerous, but a lone player should
    // still have a readable interval to turn and escape between salvos.
    const enemyCadence = game.difficulty === 'hard' ? (exposedFlagship ? .76 : 1.08) : (exposedFlagship ? .88 : 1.45);
    ship.reload[i] = (weapon?.reload ?? cfg.reload) * improved.reload * reloadBonus * (ship.team === 'japan' ? enemyCadence : 1);
    const lateral = right(ship.angle);
    const forward = fwd(ship.angle);
    const volley = weapon?.volley ?? cfg.volley;
    for (let ball = 0; ball < volley; ball++) {
      const offset = (ball - (volley - 1) / 2) * 13;
      const sx = ship.x + lateral.x * side * cfg.radius * 0.9 + forward.x * offset;
      const sy = ship.y + lateral.y * side * cfg.radius * 0.9 + forward.y * offset;
      const speed = weapon?.speed ?? 475;
      const flight = distance({ x: sx, y: sy }, target) / speed;
      const leadX = target.x + fwd(target.angle).x * target.speed * flight * 0.68;
      const leadY = target.y + fwd(target.angle).y * target.speed * flight * 0.68;
      const baseAngle = Math.atan2(leadY - sy, leadX - sx);
      const spread = weapon?.name === WEAPONS.scatter.name
        ? (ball - (volley - 1) / 2) * .115 + (seededRandom(game) - .5) * .06
        : (seededRandom(game) - .5) * (weapon?.spread ?? (game.difficulty === 'hard' && ship.team === 'japan' ? .065 : .1));
      const angle = baseAngle + spread;
      game.shots.push({ x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        traveled: 0, range, damage: (weapon?.damage ?? cfg.damage) * improved.damage * (game.difficulty === 'hard' && ship.team === 'japan' ? 1.16 : 1),
        sourceId: ship.id,
        team: ship.team, radius: weapon === WEAPONS.heavy ? 7.5 : 5,
        weapon: weapon ? game.arsenal[i === 0 ? 'port' : 'starboard'] : 'standard',
        burn: weapon?.burn ?? 0, burnTime: weapon?.burnTime ?? 0 });
      game.shotsFired++;
    }
    addEffect(game, ship.x + lateral.x * side * cfg.radius, ship.y + lateral.y * side * cfg.radius, 'muzzle', 0.32);
    game.events.push({ kind: 'fire', weapon: weapon === WEAPONS.heavy ? 'heavy' : 'standard', text: ship.id === 'flagship' ? '함포 발사' : '' });
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

function damageShip(game, target, amount) {
  const guarding = target.id === 'flagship' && game.signalRemaining > 0 && game.signalOrder === 'guard' &&
    game.allies.some(ally => ally.type === 'escort' && !ally.dead && distance(ally, target) <= 185);
  const exposure = target.id !== 'flagship' ? 1 : game.stationarySeconds >= 6 ? 1.72 : Math.abs(target.speed) >= 55 ? .82 : 1;
  const actualDamage = amount * exposure * (guarding ? .64 : 1);
  target.hp -= actualDamage;
  return actualDamage;
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
        const dealt = damageShip(game, firstHit, shot.damage);
        if (shot.burn && firstHit.team === 'japan') {
          firstHit.burnRemaining = Math.max(firstHit.burnRemaining, shot.burnTime);
          firstHit.burnDps = Math.max(firstHit.burnDps, shot.burn);
        }
        if (shot.team === 'joseon') game.hits++;
        if (shot.sourceId === 'flagship' && firstHit.team === 'japan') game.tactical.playerHits++;
        addEffect(game, firstHit.x, firstHit.y, shot.weapon === 'heavy' ? 'heavy-impact' : 'impact', shot.weapon === 'heavy' ? .88 : .62);
        addEffect(game, firstHit.x, firstHit.y - SHIP_TYPES[firstHit.type].radius - 9, 'damage', .85,
          { amount: Math.ceil(dealt), friendly: firstHit.team === 'joseon' });
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
  const previousX = ship.x, previousY = ship.y;
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
  game.tactical.sailed += Math.hypot(ship.x - previousX, ship.y - previousY);
  game.stationarySeconds = Math.abs(ship.speed) < 32
    ? Math.min(30, game.stationarySeconds + dt)
    : Math.max(0, game.stationarySeconds - dt * 2.5);
}

function controlEscort(game, escort, dt) {
  if (escort.dead) return;
  const player = game.player;
  const side = right(player.angle), ahead = fwd(player.angle);
  const rallied = game.signalRemaining > 0 && game.signalOrder === 'rally';
  const guarding = game.signalRemaining > 0 && game.signalOrder === 'guard';
  const messenger = escort.type === 'sahuseon';
  const offset = messenger ? 115 : guarding ? -65 : rallied ? -100 : -145;
  const trail = messenger ? 135 : guarding ? 45 : 92;
  const waypoint = {
    x: player.x + side.x * offset - ahead.x * trail,
    y: player.y + side.y * offset - ahead.y * trail
  };
  const focused = game.signalRemaining > 0 && game.signalOrder === 'focus';
  const target = focused ? game.enemies.find(enemy => enemy.id === game.focusTargetId && !enemy.dead) || closest(escort, game.enemies, 550) : closest(escort, game.enemies, 430);
  const formationDistance = distance(escort, waypoint);
  let heading = Math.atan2(waypoint.x - escort.x, -(waypoint.y - escort.y));
  let throttle = formationDistance > 80 ? 1 : 0.15;
  if (!messenger && !guarding && target && (focused || formationDistance < (rallied ? 105 : 180))) {
    const bearing = Math.atan2(target.x - escort.x, -(target.y - escort.y));
    heading = bearing - Math.PI / 2;
    throttle = focused ? 1 : rallied ? .32 : .5;
  }
  steer(escort, heading, throttle, dt);
  dodgeLand(game, escort, dt);
}

// Hard-mode captains use a small role-based decision layer: fast boats try
// flanking lanes, boarders alternate approach and pinning, and heavy ships
// hold their broadsides at standoff range. Steering stays in the same bounded
// motion model as Normal, with no teleporting or omniscient firing.
function hardManeuver(enemy, target, cfg, dist) {
  const targetForward = fwd(target.angle);
  const targetSide = right(target.angle);
  const leadTime = cap(dist / 570, .12, .8);
  const predicted = {
    x: target.x + targetForward.x * target.speed * leadTime,
    y: target.y + targetForward.y * target.speed * leadTime
  };
  const bearingTo = point => Math.atan2(point.x - enemy.x, -(point.y - enemy.y));
  const side = enemy.flank;
  let heading = bearingTo(predicted);
  let throttle = 1;
  let mode = '추격';

  if (enemy.type === 'kobaya') {
    const anchor = {
      x: predicted.x + targetSide.x * side * 175 - targetForward.x * 45,
      y: predicted.y + targetSide.y * side * 175 - targetForward.y * 45
    };
    const toAnchor = distance(enemy, anchor);
    if (toAnchor > 125 && dist > 145) {
      heading = bearingTo(anchor);
      throttle = .94;
      mode = '측면 침투';
    } else {
      heading = bearingTo(target) + side * Math.PI / 2;
      throttle = .52;
      mode = '측면 교란';
    }
  } else if (enemy.type === 'sekibune') {
    const boardingReach = cfg.radius + SHIP_TYPES[target.type].radius + 26;
    if (enemy.boardingRun && dist < 345) {
      heading = bearingTo(predicted);
      throttle = dist > boardingReach + 12 ? 1 : .18;
      mode = '도선 돌입';
    } else if (dist < 210) {
      heading = bearingTo(target) + side * 1.25;
      throttle = .7;
      mode = '측면 압박';
    } else {
      const anchor = {
        x: predicted.x + targetSide.x * side * 190 - targetForward.x * 65,
        y: predicted.y + targetSide.y * side * 190 - targetForward.y * 65
      };
      heading = bearingTo(anchor);
      throttle = .93;
      mode = '도선 접근';
    }
  } else if (enemy.type === 'atakebune') {
    if (dist < 185) {
      heading = bearingTo(target) + Math.PI + side * .35;
      throttle = .62;
      mode = '거리 확보';
    } else if (dist < 290) {
      heading = bearingTo(target) + side * Math.PI / 2;
      throttle = .48;
      mode = '측면 포격';
    } else {
      mode = '포격 진입';
    }
  }

  // Steer away from known shallows before the hull clips an island. This
  // lookahead is local to each vessel and needs no pathfinding mesh.
  const lookahead = 115 + Math.abs(enemy.speed) * .25;
  const projected = {
    x: enemy.x + fwd(heading).x * lookahead,
    y: enemy.y + fwd(heading).y * lookahead
  };
  for (const island of ISLANDS) {
    const danger = island.radius + cfg.radius + 34;
    if (distance(projected, island) < danger) {
      const outward = Math.atan2(enemy.x - island.x, -(enemy.y - island.y));
      heading = outward + side * .65;
      mode = '암초 회피';
      break;
    }
  }
  return { heading, throttle, mode };
}

function controlEnemy(game, enemy, dt) {
  if (enemy.dead) return;
  // Boarding crews favor fighting ships; dispatch boats are not their primary objective.
  // A stationary flagship is an easy, obvious objective. Leaving it at anchor
  // should invite concentrated fire and boarding rather than a free auto-win.
  const hard = game.difficulty === 'hard';
  const prioritiesFlagship = hard && (enemy.type === 'kobaya' || enemy.type === 'atakebune' || game.player.hp < game.player.maxHp * .42);
  const target = game.stationarySeconds >= 6 || prioritiesFlagship
    ? game.player
    : closest(enemy, [game.player, ...game.allies.filter(ally => ally.type !== 'sahuseon')]) || game.player;
  enemy.aiTargetId = target.id;
  if (!target) return;
  const cfg = SHIP_TYPES[enemy.type];
  const d = distance(enemy, target);
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const bearing = Math.atan2(dx, -dy);
  const preferred = cfg.range * (enemy.type === 'kobaya' ? 0.77 : 0.84);
  enemy.tacticClock -= dt;
  if (enemy.tacticClock <= 0) {
    if (enemy.type === 'kobaya' && (!hard || d < 250)) enemy.flank *= -1; // Feint near the player.
    if (cfg.boardingDamage) enemy.boardingRun = !enemy.boardingRun;
    enemy.tacticClock = enemy.type === 'kobaya' ? 3.2 : enemy.type === 'sekibune' ? 6.8 : 8.5;
  }
  let heading = bearing;
  let throttle = 1;
  const boardingRange = cfg.radius + SHIP_TYPES[target.type].radius + 26;
  const finalFlagship = enemy.type === 'atakebune' && game.enemies.length === 1 &&
    game.spawned === getWave(game)?.ships.length;
  if (finalFlagship && d > boardingRange + 35) {
    // A lone flagship must close the final duel rather than orbit forever.
    heading = bearing;
    throttle = 1;
  } else if (cfg.boardingDamage && enemy.boardingRun && d < (enemy.type === 'sekibune' ? 295 : 205)) {
    heading = bearing; // Close to grappling distance instead of taking a broadside arc.
    throttle = d < boardingRange + 5 ? 0 : d < boardingRange + 42 ? .3 : .88;
  } else if (d < preferred * 0.52) {
    heading = bearing + Math.PI + enemy.flank * 0.3; // disengage before ramming
  } else if (enemy.type === 'kobaya' && d < preferred + 80) {
    heading = bearing + enemy.flank * 1.05; // Fast boats make repeated darting passes.
    throttle = .82;
  } else if (enemy.type === 'sekibune' && d > preferred + 95) {
    heading = bearing + enemy.flank * .45; // Medium boats approach from the wings.
    throttle = .9;
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
  if (hard && !finalFlagship) {
    const maneuver = hardManeuver(enemy, target, cfg, d);
    heading = maneuver.heading;
    throttle = maneuver.throttle;
    enemy.aiMode = maneuver.mode;
  } else if (hard && finalFlagship) {
    enemy.aiMode = '결전 돌입';
  }
  steer(enemy, heading, throttle, dt);
  dodgeLand(game, enemy, dt);
  enemy.boardingCooldown = Math.max(0, enemy.boardingCooldown - dt);
  const inReach = cfg.boardingDamage && distance(enemy, target) <= boardingRange;
  if (inReach && enemy.boardingCooldown <= 0) {
    if (enemy.boardingTargetId !== target.id || enemy.boardingProgress === 0) {
      enemy.boardingTargetId = target.id;
      if (target.id === 'flagship') game.events.push({ kind: 'boarding', text: `${cfg.name} 접근! 키를 돌려 도선을 막으세요.` });
    }
    enemy.boardingProgress += dt / cfg.boardingTime;
    if (enemy.boardingProgress >= 1) {
      damageShip(game, target, cfg.boardingDamage * (SHIP_TYPES[target.type].boardingDamageTaken ?? 1));
      enemy.boardingProgress = 0;
      enemy.boardingCooldown = 3;
      addEffect(game, target.x, target.y, 'boarding', 0.8);
      if (target.id === 'flagship') game.events.push({ kind: 'boarded', text: '적 도선 시도! 높은 판옥선 갑판이 피해를 줄였습니다.' });
      if (target.hp <= 0) sink(game, target);
    }
  } else {
    enemy.boardingProgress = Math.max(0, enemy.boardingProgress - dt * 2.3);
    if (enemy.boardingProgress === 0) enemy.boardingTargetId = '';
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
  for (const enemy of game.enemies) {
    if (enemy.dead || enemy.burnRemaining <= 0) continue;
    const burnedTime = Math.min(dt, enemy.burnRemaining);
    enemy.burnRemaining = Math.max(0, enemy.burnRemaining - dt);
    enemy.hp -= burnedTime * enemy.burnDps;
    if (enemy.hp <= 0) sink(game, enemy);
  }
  controlPlayer(game, input, dt);
  for (const ally of game.allies) controlEscort(game, ally, dt);
  for (const enemy of game.enemies) controlEnemy(game, enemy, dt);
  fire(game.player, game.enemies, game, dt);
  for (const ally of game.allies) if (!ally.dead) fire(ally, game.enemies, game, dt);
  for (const enemy of game.enemies) if (!enemy.dead) fire(enemy, [game.player, ...game.allies], game, dt);
  updateShots(game, dt);
  awardTacticalObjective(game);
  game.enemies = game.enemies.filter(ship => !ship.dead);
  if (game.mode === 'defeat') return game;

  const wave = getWave(game);
  if (!wave) return game;
  game.spawnClock -= dt;
  if (game.spawned < wave.ships.length && game.spawnClock <= 0) {
    spawnEnemy(game);
    game.spawnClock = wave.interval * (game.difficulty === 'hard' ? .85 : 1);
  }
  if (game.spawned === wave.ships.length && game.enemies.length === 0) {
    game.shots = [];
    if (game.waveIndex === WAVES.length - 1) {
      game.mode = 'victory';
      game.score += Math.round(game.player.hp * (game.difficulty === 'hard' ? 2.6 : 2));
      game.events.push({ kind: 'victory', text: '옥포 앞바다의 적선을 물리쳤습니다.' });
    } else {
      game.mode = 'upgrade';
      game.selected = upgradeChoices(game).map(option => option.id);
      game.events.push({ kind: 'upgrade', text: '교전 종료 · 다음 출전을 준비하세요.' });
    }
  }
  return game;
}
