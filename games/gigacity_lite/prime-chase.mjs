// Prime Chase's pure state machine. No DOM or graphics dependency.
import { fighterType, fighterSpec } from './prime-tactics.mjs';
export const PRIME_WEAPONS = Object.freeze([2, 3, 5, 7]);
export const WAVE_NUMBERS = Object.freeze([[6], [10, 15], [8, 12], [21, 35], [30, 49], [84, 105]]);
export const PRACTICE_WAVES = Object.freeze([[6], [10,15], [8,12]]);
export const ROUND_SECONDS = 180;

export function isPrime(value) {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let i = 2; i * i <= value; i++) if (value % i === 0) return false;
  return true;
}
export function primeFactors(number) {
  const factors = [];
  let remaining = number;
  for (let n = 2; n * n <= remaining; n++) {
    while (remaining % n === 0) { factors.push(n); remaining /= n; }
  }
  if (remaining > 1) factors.push(remaining);
  return factors;
}
export function makePrimeChase() {
  return {
    status: 'ready', mode: 'standard', waves: WAVE_NUMBERS, elapsed: 0, remaining: ROUND_SECONDS, shield: 100,
    score: 0, mistakes: 0, combo: 0, destroyed: 0, shots: 0,
    enemies: [], selectedId: null, nextId: 1, waveIndex: -1,
    waveDelay: 0, cooldown: 0, consecutiveWrong: 0, dodges: 0, previousPilot: null, lastShot: null, reason: ''
  };
}
function enterWave(state, index) {
  state.waveIndex = index;
  const newcomers = state.waves[index].map((number, slot) => ({
    id: state.nextId++, number, original: number, type: fighterType(number),
    attackIn: 10.5 + index * 0.65 + slot * 2,
    lockedAt: null, preparing: false, alive: true, divisionCount: 0, wave: index
  }));
  state.enemies.push(...newcomers);
  if (!state.selectedId) state.selectedId = newcomers[0].id;
  state.waveDelay = 0;
  return newcomers;
}
export function startPrimeChase(state = makePrimeChase(), mode = 'standard') {
  Object.assign(state, makePrimeChase());
  state.mode = mode === 'practice' ? 'practice' : 'standard';
  state.waves = state.mode === 'practice' ? PRACTICE_WAVES : WAVE_NUMBERS;
  state.status = 'playing';
  enterWave(state, 0);
  return state;
}
export function activeEnemies(state) {
  return state.enemies.filter(e => e.alive);
}
export function selectEnemy(state, id) {
  if (state.status !== 'playing') return false;
  const enemy = state.enemies.find(e => e.id === id && e.alive);
  if (!enemy) return false;
  state.selectedId = id;
  return true;
}
export function selectedEnemy(state) {
  return state.enemies.find(e => e.id === state.selectedId && e.alive) || activeEnemies(state)[0] || null;
}
export function firePrime(state, prime) {
  if (state.status !== 'playing') return { kind: 'inactive' };
  if (!PRIME_WEAPONS.includes(prime) || !isPrime(prime)) return { kind: 'invalid' };
  if (state.cooldown > 0) return { kind: 'cooldown' };
  const enemy = selectedEnemy(state);
  if (!enemy) return { kind: 'no-target' };
  state.shots++;
  const oldValue = enemy.number;
  if (oldValue % prime !== 0) {
    state.mistakes++;
    state.combo = 0;
    state.consecutiveWrong++;
    // Guess-spamming is slower than factorizing, with only a small early penalty.
    state.cooldown = 1.45;
    damageShield(state, Math.min(3, state.consecutiveWrong));
    state.lastShot = { kind: 'blocked', prime, oldValue, id: enemy.id };
    return state.lastShot;
  }
  state.consecutiveWrong = 0;
  enemy.number = oldValue / prime;
  enemy.divisionCount++;
  state.combo++;
  state.score += 100 + Math.min(100, (state.combo - 1) * 20);
  state.cooldown = 0.30;
  const destroyed = enemy.number === 1;
  if (destroyed) {
    enemy.alive = false;
    state.destroyed++;
    state.score += 250;
    state.selectedId = activeEnemies(state)[0]?.id ?? null;
    if (state.destroyed === state.waves.flat().length) {
      state.status = 'won';
      state.reason = '적을 모두 1로 만들었어! 1은 소수도 합성수도 아니야.';
      state.score += Math.ceil(state.remaining) * 10 + Math.round(state.shield) * 5;
    }
  }
  state.lastShot = { kind: destroyed ? 'destroyed' : 'divided', prime, oldValue,
    newValue: enemy.number, id: enemy.id, combo: state.combo };
  return state.lastShot;
}
export function damageShield(state, amount) {
  if (state.status !== 'playing') return;
  state.shield = Math.max(0, state.shield - amount);
  if (state.shield <= 0) {
    state.status = 'lost';
    state.reason = '방어막이 모두 소진됐어!';
  }
}
export function tickPrimeChase(state, dt, enemyDistances = {}, playerPosition = null) {
  if (state.status !== 'playing') return { newEnemies: [], attacks: [], warnings: [] };
  const frame = Math.max(0, Math.min(dt, 0.25));
  state.elapsed += frame;
  state.remaining = Math.max(0, ROUND_SECONDS - state.elapsed);
  if (state.remaining < 0.0001) state.remaining = 0;
  state.cooldown = Math.max(0, state.cooldown - frame);
  if (state.remaining <= 0) {
    state.status = 'lost';
    state.reason = '제한 시간이 끝났어!';
    return { newEnemies: [], attacks: [], warnings: [] };
  }
  const attacks = [], warnings = [];
  // Predict the pilot's normal forward flight. Otherwise just staying on
  // autopilot would trivially dodge every shot without touching the controls.
  const velocity = playerPosition && state.previousPilot && frame > 0
    ? { x: (playerPosition.x - state.previousPilot.x) / frame,
        y: (playerPosition.y - state.previousPilot.y) / frame,
        z: (playerPosition.z - state.previousPilot.z) / frame }
    : { x: 0, y: 0, z: -34 };
  if (playerPosition) state.previousPilot = { ...playerPosition };
  for (const enemy of activeEnemies(state)) {
    const spec = fighterSpec(enemy.original);
    const observation = enemyDistances[enemy.id];
    const distance = typeof observation === 'number' ? observation : observation?.distance ?? Infinity;
    const covered = typeof observation === 'object' && observation !== null && observation.covered === true;
    if (distance > 120) {
      // The pursuer must catch up before it can fire again.
      enemy.attackIn = Math.max(2.5, enemy.attackIn - frame * 0.1);
      enemy.lockedAt = null;
      enemy.preparing = false;
      continue;
    }
    enemy.attackIn -= frame;
    if (enemy.attackIn <= spec.warning && !enemy.preparing) {
      enemy.preparing = true;
      enemy.lockedAt = playerPosition ? {
        x: playerPosition.x + velocity.x * Math.max(0, enemy.attackIn),
        y: playerPosition.y + velocity.y * Math.max(0, enemy.attackIn),
        z: playerPosition.z + velocity.z * Math.max(0, enemy.attackIn)
      } : null;
      warnings.push({ id: enemy.id, seconds: spec.warning, lockedAt: enemy.lockedAt ? { ...enemy.lockedAt } : null });
    }
    if (enemy.attackIn <= 0) {
      const moved = playerPosition && enemy.lockedAt
        ? Math.hypot(playerPosition.x - enemy.lockedAt.x,
            playerPosition.y - enemy.lockedAt.y,
            playerPosition.z - enemy.lockedAt.z)
        : 0;
      const dodged = covered || moved >= 17;
      if (dodged) state.dodges++;
      else damageShield(state, state.mode === 'practice' ? Math.max(3, spec.damage - 2) : spec.damage);
      attacks.push({ id: enemy.id, damage: dodged ? 0 : (state.mode === 'practice' ? Math.max(3, spec.damage - 2) : spec.damage),
        hit: !dodged, aim: enemy.lockedAt ? { ...enemy.lockedAt } : (playerPosition ? { ...playerPosition } : null),
        dodgeReason: covered ? 'cover' : moved >= 17 ? 'move' : null });
      enemy.attackIn += spec.attackCycle + enemy.wave * 0.25;
      enemy.lockedAt = null;
      enemy.preparing = false;
      if (state.status !== 'playing') break;
    }
  }
  let newEnemies = [];
  if (state.status === 'playing' && !activeEnemies(state).length && state.waveIndex < state.waves.length - 1) {
    state.waveDelay += frame;
    if (state.waveDelay >= 1.8) newEnemies = enterWave(state, state.waveIndex + 1);
  } else if (activeEnemies(state).length) state.waveDelay = 0;
  return { newEnemies, attacks, warnings };
}

export function roundStats(state) {
  return {
    accuracy: state.shots ? Math.round((state.shots - state.mistakes) / state.shots * 100) : 0,
    destroyed: state.destroyed,
    total: state.waves.flat().length,
    score: state.score,
    dodges: state.dodges,
    timeLeft: Math.ceil(state.remaining)
  };
}
