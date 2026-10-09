import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PRIME_WEAPONS, WAVE_NUMBERS, ROUND_SECONDS, isPrime, primeFactors,
  makePrimeChase, startPrimeChase, PRACTICE_WAVES, firePrime, selectEnemy, selectedEnemy,
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
        tickPrimeChase(game, 0.20);
      }
      assert.equal(enemy.number, 1);
      assert.equal(enemy.alive, false);
    }
    // Allow the next pursuit wave to arrive; no timers/network used.
    for (let i = 0; i < 20; i++) tickPrimeChase(game, 0.1);
  }
  return game;
}

test('available ammunition contains only the actual primes for every enemy', () => {
  assert.deepEqual(PRIME_WEAPONS, [2,3,5,7]);
  assert.equal(isPrime(1), false);
  assert.equal(isPrime(2), true);
  assert.equal(isPrime(9), false);
  assert.deepEqual(WAVE_NUMBERS, [[6],[10,15],[8,12],[21,35],[30,49],[84,105]]);
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
    assert.equal(game.destroyed, WAVE_NUMBERS.flat().length);
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
  tickPrimeChase(game, 0.10);
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
  for (let i=0; i<16; i++) tickPrimeChase(game,0.1);
  assert.equal(firePrime(game, 2).kind, 'divided');
});

test('wave 2 appears only after first enemy is destroyed and a small pause', () => {
  const game = startPrimeChase();
  tickPrimeChase(game, 4);
  assert.equal(game.waveIndex, 0);
  firePrime(game, 2);
  tickPrimeChase(game, 0.25);
  tickPrimeChase(game, 0.10);
  firePrime(game, 3);
  tickPrimeChase(game, 0.25);
  assert.equal(activeEnemies(game).length, 0);
  for (let i=0;i<16;i++) tickPrimeChase(game,0.1);
  assert.equal(game.waveIndex, 1);
  assert.deepEqual(activeEnemies(game).map(e=>e.number), [10, 15]);
});

test('a selected enemy can change, but destroyed target cannot be selected again', () => {
  const game = startPrimeChase();
  firePrime(game, 2);tickPrimeChase(game,0.20);tickPrimeChase(game,0.20);firePrime(game,3);
  for(let i=0;i<21;i++)tickPrimeChase(game,0.1);
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


test('advanced waves have repeated and three/four factor targets', () => {
  const lengths = WAVE_NUMBERS.flat().map(n => primeFactors(n).length);
  assert.ok(lengths.some(n => n >= 4));
  assert.ok(WAVE_NUMBERS.flat().includes(49));
  assert.deepEqual(primeFactors(84), [2,2,3,7]);
  assert.deepEqual(primeFactors(105), [3,5,7]);
});

test('guess-spamming consumes shield and takes longer to reload', () => {
  const game = startPrimeChase();
  assert.equal(firePrime(game, 5).kind, 'blocked');
  assert.equal(game.shield, 99);
  assert.equal(firePrime(game, 2).kind, 'cooldown');
  for (let i=0; i<15; i++) tickPrimeChase(game, .1);
  assert.equal(firePrime(game, 7).kind, 'blocked');
  assert.ok(game.shield < 99);
  assert.equal(game.consecutiveWrong, 2);
  for (let i=0; i<15; i++) tickPrimeChase(game, .1);
  assert.equal(firePrime(game, 3).kind, 'divided');
  assert.equal(game.consecutiveWrong, 0);
});

test('steady automatic flight cannot dodge, but steering during lock-on can', () => {
  const straight = startPrimeChase(), id = selectedEnemy(straight).id;
  let p = { x: 0, y: 200, z: 365 };
  let hits=[];
  for (let k=0;k<120;k++) {
    p = { ...p, z:p.z-3.4 };
    hits.push(...tickPrimeChase(straight,.1,{[id]:{distance:70,covered:false}},p).attacks);
  }
  assert.ok(hits.some(x=>x.hit));
  const game=startPrimeChase(), enemyId=selectedEnemy(game).id;
  let dodge={x:0,y:200,z:365}, attacks=[];
  for(let k=0;k<120;k++){
    dodge={...dodge,z:dodge.z-3.4};
    if(k>87)dodge.x+=2;
    attacks.push(...tickPrimeChase(game,.1,{[enemyId]:{distance:70,covered:false}},dodge).attacks);
  }
  assert.ok(attacks.some(x=>!x.hit),'player steering should evade the laser');
});

test('cover stops damage after a visible 2-second warning', () => {
  const game=startPrimeChase(), id=selectedEnemy(game).id;
  let warnings=[],attacks=[];
  for(let k=0;k<115;k++) {
    const result=tickPrimeChase(game,.1,{[id]:{distance:65,covered:true}},{x:0,y:200,z:365});
    warnings.push(...result.warnings);attacks.push(...result.attacks);
  }
  assert.equal(warnings.length,1);
  assert.equal(attacks.length,1);
  assert.equal(attacks[0].hit,false);
  assert.equal(game.shield,100);
  assert.equal(game.dodges,1);
});


test('practice session has three approachable waves and wins after five aircraft', () => {
  assert.deepEqual(PRACTICE_WAVES, [[6],[10,15],[8,12]]);
  const game=startPrimeChase(makePrimeChase(),'practice');
  assert.equal(game.mode,'practice');
  assert.equal(roundStats(game).total,5);
  for(const wave of PRACTICE_WAVES){
    assert.deepEqual(activeEnemies(game).map(e=>e.original),wave);
    for(const enemy of activeEnemies(game)){
      selectEnemy(game,enemy.id);
      for(const prime of primeFactors(enemy.original)){
        const outcome=firePrime(game,prime);
        assert.ok(outcome.kind==='divided'||outcome.kind==='destroyed');
        tickPrimeChase(game,.20);tickPrimeChase(game,.20);
      }
    }
    for(let i=0;i<20;i++)tickPrimeChase(game,.1);
  }
  assert.equal(game.status,'won');
  assert.equal(game.destroyed,5);
});
