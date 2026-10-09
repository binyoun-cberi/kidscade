import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PRIME_WEAPONS, WAVE_NUMBERS, ROUND_SECONDS, isPrime, primeFactors,
  makePrimeChase, startPrimeChase, firePrime, selectEnemy, selectedEnemy,
  activeEnemies, tickPrimeChase, damageShield, roundStats
} from '../games/gigacity_lite/prime-chase.mjs';

function simulateShots(values) {
  const game = startPrimeChase();
  for (const wave of WAVE_NUMBERS) {
    assert.deepEqual(activeEnemies(game).map(x => x.original), wave);
    for (const original of wave) {
      const enemy = activeEnemies(game).find(x => x.original === original);
      assert.ok(enemy);
      selectEnemy(game, enemy.id);
      for (const prime of values(original)) {
        const shot = firePrime(game, prime);
        assert.ok(['divided', 'destroyed'].includes(shot.kind), original + ': ' + JSON.stringify(shot));
        tickPrimeChase(game, 0.20);
      }
      assert.equal(enemy.number, 1);
      assert.equal(enemy.alive, false);
    }
    // Allow the next pursuit wave to arrive; no timers/network used.
    for (let i = 0; i < 16; i++) tickPrimeChase(game, 0.1);
  }
  return game;
}

test('available ammunition contains only the actual primes for every enemy', () => {
  assert.deepEqual(PRIME_WEAPONS, [2,3,5,7]);
  assert.equal(isPrime(1), false);
  assert.equal(isPrime(2), true);
  assert.equal(isPrime(9), false);
  assert.deepEqual(WAVE_NUMBERS, [[6], [10,15], [21,35]]);
  for (const number of WAVE_NUMBERS.flat()) {
    const factors = primeFactors(number);
    assert.ok(factors.length >= 2);
    assert.equal(factors.reduce((a,b)=>a*b,1), number);
    assert.ok(factors.every(p=>PRIME_WEAPONS.includes(p)));
  }
});

test('different correct factor orders both reduce every composite enemy to one', () => {
  const a = simulateShots(n => primeFactors(n));
  const b = simulateShots(n => primeFactors(n).reverse());
  for (const game of [a,b]) {
    assert.equal(game.status, 'won');
    assert.equal(game.destroyed, 5);
    assert.equal(roundStats(game).accuracy, 100);
    assert.equal(game.shield, 100);
    assert.ok(game.remaining > 150);
  }
});

test('6 / 2 / 3 leads to one and an enemy explosion, not a fake health bar', () => {
  const game = startPrimeChase();
  assert.equal(selectedEnemy(game).number, 6);
  assert.deepEqual(firePrime(game, 2).newValue, 3);
  assert.equal(firePrime(game, 3).kind, 'cooldown');
  tickPrimeChase(game, 0.25);
  const shot = firePrime(game, 3);
  assert.equal(shot.kind, 'destroyed');
  assert.equal(shot.newValue, 1);
  assert.equal(game.destroyed, 1);
});

test('wrong prime shots show a deflection without changing the target number', () => {
  const game = startPrimeChase();
  const before = selectedEnemy(game).number;
  const result = firePrime(game, 5);
  assert.equal(result.kind, 'blocked');
  assert.equal(selectedEnemy(game).number, before);
  assert.equal(game.mistakes, 1);
  assert.equal(game.combo, 0);
  assert.equal(firePrime(game, 2).kind, 'cooldown');
  tickPrimeChase(game, 0.1);
  tickPrimeChase(game, 0.1);
  tickPrimeChase(game, 0.1);
  tickPrimeChase(game, 0.1);
  tickPrimeChase(game, 0.1);
  tickPrimeChase(game, 0.1);
  assert.equal(firePrime(game, 2).kind, 'divided');
});

test('wave 2 appears only after first enemy is destroyed and a small pause', () => {
  const game = startPrimeChase();
  tickPrimeChase(game, 4);
  assert.equal(game.waveIndex, 0);
  firePrime(game, 2);
  tickPrimeChase(game, 0.3);
  firePrime(game, 3);
  tickPrimeChase(game, 0.5);
  assert.equal(activeEnemies(game).length, 0);
  for (let i=0;i<10;i++) tickPrimeChase(game,0.1);
  assert.equal(game.waveIndex, 1);
  assert.deepEqual(activeEnemies(game).map(e=>e.number), [10, 15]);
});

test('a selected enemy can change, but destroyed target cannot be selected again', () => {
  const game = startPrimeChase();
  firePrime(game, 2);tickPrimeChase(game,0.2);firePrime(game,3);
  for(let i=0;i<15;i++)tickPrimeChase(game,0.1);
  assert.equal(game.waveIndex,1);
  const [first,second]=activeEnemies(game);
  assert.equal(selectEnemy(game,second.id), true);
  assert.equal(selectedEnemy(game).id,second.id);
  assert.equal(selectEnemy(game,9999),false);
  assert.equal(selectEnemy(game,game.enemies[0].id),false);
  assert.equal(selectedEnemy(game).id,second.id);
  assert.equal(first.alive,true);
});

test('enemy attacks require close proximity, and shields / timer end the round', () => {
  const game = startPrimeChase();
  for(let i=0;i<75;i++)tickPrimeChase(game,0.1,{});
  assert.equal(game.shield,100);
  const id=selectedEnemy(game).id;
  for(let i=0;i<90;i++)tickPrimeChase(game,0.1,{[id]:55});
  assert.ok(game.shield < 100);
  damageShield(game,100);
  assert.equal(game.status,'lost');
  assert.equal(firePrime(game,2).kind,'inactive');
  const timed=startPrimeChase();
  for(let i=0;i<1800;i++)tickPrimeChase(timed,0.1,{});
  assert.equal(timed.status,'lost');
  assert.equal(timed.remaining,0);
  assert.equal(ROUND_SECONDS,180);
});

test('combat modules are wired into the main flight and mobile HUD', () => {
  const root = new URL('../games/gigacity_lite/', import.meta.url);
  const main = readFileSync(new URL('main.js',root),'utf8');
  const html = readFileSync(new URL('index.html',root),'utf8');
  const view = readFileSync(new URL('prime-chase-view.js',root),'utf8');
  assert.match(main,/enterPrimeChase/);
  assert.match(main,/tickPrimeChase\(primeState/);
  assert.match(main,/pursuitScene\.shootEffect/);
  assert.match(view,/labelTexture\(enemy\.number\)/);
  for (const prime of PRIME_WEAPONS) assert.match(html,new RegExp('data-prime="'+prime+'"'));
  for (const id of ['chaseHUD','chaseTargetNumber','chaseShield','chaseTimer','chaseResult','exploreStart']) assert.match(html,new RegExp('id="'+id+'"'));
});
