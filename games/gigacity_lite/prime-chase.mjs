// Prime Chase's pure state machine. No DOM or graphics dependency.
export const PRIME_WEAPONS = Object.freeze([2, 3, 5, 7]);
export const WAVE_NUMBERS = Object.freeze([[6], [10, 15], [21, 35]]);
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
    status: 'ready', elapsed: 0, remaining: ROUND_SECONDS, shield: 100,
    score: 0, mistakes: 0, combo: 0, destroyed: 0, shots: 0,
    enemies: [], selectedId: null, nextId: 1, waveIndex: -1,
    waveDelay: 0, cooldown: 0, lastShot: null, reason: ''
  };
}
function enterWave(state, index) {
  state.waveIndex = index;
  const newcomers = WAVE_NUMBERS[index].map(number => ({
    id: state.nextId++, number, original: number, attackIn: 7 + index * 0.5,
    alive: true, divisionCount: 0, wave: index
  }));
  state.enemies.push(...newcomers);
  if (!state.selectedId) state.selectedId = newcomers[0].id;
  state.waveDelay = 0;
  return newcomers;
}
export function startPrimeChase(state = makePrimeChase()) {
  Object.assign(state, makePrimeChase());
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
    state.cooldown = 0.54;
    state.lastShot = { kind: 'blocked', prime, oldValue, id: enemy.id };
    return state.lastShot;
  }
  enemy.number = oldValue / prime;
  enemy.divisionCount++;
  state.combo++;
  state.score += 100 + Math.min(100, (state.combo - 1) * 20);
  state.cooldown = 0.19;
  const destroyed = enemy.number === 1;
  if (destroyed) {
    enemy.alive = false;
    state.destroyed++;
    state.score += 250;
    state.selectedId = activeEnemies(state)[0]?.id ?? null;
    if (state.destroyed === WAVE_NUMBERS.flat().length) {
      state.status = 'won';
      state.reason = '모든 합성수 전투기를 격추했어!';
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
export function tickPrimeChase(state, dt, enemyDistances = {}) {
  if (state.status !== 'playing') return { newEnemies: [], attacks: [] };
  const frame = Math.max(0, Math.min(dt, 0.1));
  state.elapsed += frame;
  state.remaining = Math.max(0, ROUND_SECONDS - state.elapsed);
  if (state.remaining < 0.0001) state.remaining = 0;
  state.cooldown = Math.max(0, state.cooldown - frame);
  if (state.remaining <= 0) {
    state.status = 'lost';
    state.reason = '제한 시간이 끝났어!';
    return { newEnemies: [], attacks: [] };
  }
  const attacks = [];
  for (const enemy of activeEnemies(state)) {
    const distance = enemyDistances[enemy.id] ?? Infinity;
    // Only a nearby pursuer can attack. Missed shots never cause unavoidable damage.
    if (distance > 105) { enemy.attackIn = Math.max(2.0, enemy.attackIn - frame * 0.25); continue; }
    enemy.attackIn -= frame;
    if (enemy.attackIn <= 0) {
      enemy.attackIn += 8.2 + enemy.wave * 1.5;
      damageShield(state, 8);
      attacks.push({ id: enemy.id, damage: 8 });
      if (state.status !== 'playing') break;
    }
  }
  let newEnemies = [];
  if (state.status === 'playing' && !activeEnemies(state).length && state.waveIndex < WAVE_NUMBERS.length - 1) {
    state.waveDelay += frame;
    if (state.waveDelay >= 1.4) newEnemies = enterWave(state, state.waveIndex + 1);
  } else if (activeEnemies(state).length) state.waveDelay = 0;
  return { newEnemies, attacks };
}
export function roundStats(state) {
  return {
    accuracy: state.shots ? Math.round((state.shots - state.mistakes) / state.shots * 100) : 0,
    destroyed: state.destroyed,
    total: WAVE_NUMBERS.flat().length,
    score: state.score,
    timeLeft: Math.ceil(state.remaining)
  };
}
