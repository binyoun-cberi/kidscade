import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIGHTER_TYPES, fighterType, fighterSpec, relativeContact, pursuitSlot, damageStage } from '../games/gigacity_lite/prime-tactics.mjs';
import {
  PRIME_WEAPONS, WAVE_NUMBERS, ROUND_SECONDS, isPrime, primeFactors,
  makePrimeChase, startPrimeChase, PRACTICE_WAVES, MAX_BONUS_SECONDS, firePrime, selectEnemy, selectedEnemy,
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
  for(let i=0;i<115;i++)tickPrimeChase(game,0.1,{[id]:55});
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


test('enemy classes have distinct pursuit speed, weapon cooldown and damage', () => {
  assert.equal(fighterType(6),'scout');
  assert.equal(fighterType(49),'armor');
  assert.equal(fighterType(35),'interceptor');
  assert.equal(fighterType(84),'command');
  assert.ok(fighterSpec(21).speed > fighterSpec(8).speed);
  assert.ok(fighterSpec(84).damage > fighterSpec(6).damage);
  assert.ok(fighterSpec(105).warning > fighterSpec(21).warning);
  const game=startPrimeChase();
  assert.equal(selectedEnemy(game).type,'scout');
  assert.equal(Object.keys(FIGHTER_TYPES).length,4);
});

test('radar bearings stay correct for flight yaw, including enemies behind', () => {
  const p={x:0,y:200,z:0};
  const back=relativeContact(p,0,{x:0,y:200,z:65});
  assert.ok(back.behind);
  assert.ok(Math.abs(Math.abs(back.bearing)-Math.PI)<1e-7);
  const ahead=relativeContact(p,0,{x:0,y:200,z:-60});
  assert.equal(ahead.behind,false);
  assert.ok(Math.abs(ahead.bearing)<1e-7);
  const right=relativeContact(p,0,{x:80,y:200,z:0});
  assert.ok(right.x>0);
  const turned=relativeContact(p,Math.PI/2,{x:-80,y:200,z:0});
  assert.ok(Math.abs(turned.bearing)<1e-7);
});

test('distinct ship AI patrols behind and to the flanks without occupying identical slots', () => {
  const player={x:0,y:200,z:0};
  const points=[pursuitSlot(player,0,7.2,1,0,'scout'),pursuitSlot(player,0,7.2,2,1,'interceptor'),
    pursuitSlot(player,0,7.2,3,2,'armor'),pursuitSlot(player,0,7.2,4,3,'command')];
  assert.equal(points.length,4);
  assert.ok(points.every(p=>p.z>0),'enemy slots must remain behind the -Z facing craft');
  assert.ok(new Set(points.map(p=>Math.round(p.x))).size>=3);
  assert.ok(points[1].speed>points[2].speed);
  assert.equal(damageStage(0,4),0);
  assert.equal(damageStage(2,4),.5);
  assert.equal(damageStage(4,4),1);
});

test('predicted laser warning includes aim position, and missed attack follows that aim', () => {
  const game=startPrimeChase(), id=selectedEnemy(game).id;
  let player={x:0,y:200,z:365}, warnings=[], attacks=[];
  for(let k=0;k<115;k++){
    player={...player,z:player.z-3.4};
    const event=tickPrimeChase(game,.1,{[id]:{distance:72,covered:false}},player);
    warnings.push(...event.warnings);
    attacks.push(...event.attacks);
  }
  assert.equal(warnings.length,1);
  assert.ok(warnings[0].seconds>=2);
  assert.ok(warnings[0].lockedAt && Number.isFinite(warnings[0].lockedAt.z));
  assert.ok(attacks.length>=1);
  assert.ok(attacks[0].aim && Number.isFinite(attacks[0].aim.z));
  assert.ok(attacks[0].hit,'the laser should hit straight autopilot when it does not dodge');
});

test('3D breakaway parts and HUD radar are wired to actual fighter damage', () => {
  const root=new URL('../games/gigacity_lite/',import.meta.url);
  const main=readFileSync(new URL('main.js',root),'utf8');
  const html=readFileSync(new URL('index.html',root),'utf8');
  const view=readFileSync(new URL('prime-chase-view.js',root),'utf8');
  const radar=readFileSync(new URL('prime-radar.js',root),'utf8');
  assert.match(main,/drawPrimeRadar/);
  assert.match(main,/pursuitScene\.warnAttack\(warning\.id, warning\.lockedAt/);
  assert.match(main,/pursuitScene\.enemyAttack\(event\.id, event\.aim/);
  assert.match(view,/armorPieces\.shift\(\)/);
  assert.match(view,/kind: 'debris'/);
  assert.match(view,/warnAttack\(id, aim, seconds/);
  assert.match(view,/pursuitSlot\(craft, heading/);
  assert.match(radar,/relativeContact\(pilot,heading/);
  for(const id of ['primeRadar','radarReadout','primeLockMessage','combatHitFlash'])
    assert.match(html,new RegExp('id="'+id+'"'));
});


test('correct prime shots earn bounded time, wrong guesses never earn time', () => {
  const game = startPrimeChase();
  assert.equal(firePrime(game,5).kind,'blocked');
  assert.equal(game.bonusSeconds,0);
  for(let i=0;i<15;i++)tickPrimeChase(game,.1);
  const correct=firePrime(game,2);
  assert.equal(correct.kind,'divided');
  assert.equal(correct.timeBonus,2);
  assert.equal(game.bonusSeconds,2);
  assert.ok(game.remaining > 180 - game.elapsed);
  for(let i=0;i<4;i++)tickPrimeChase(game,.1);
  const last=firePrime(game,3);
  assert.equal(last.kind,'destroyed');
  assert.equal(last.timeBonus,6);
  assert.equal(game.bonusSeconds,8);
  assert.equal(game.shield,100);
  assert.equal(roundStats(game).bonusSeconds,8);
});

test('earned time is capped and cannot be farmed through wrong shots', () => {
  for(const mode of ['standard','practice']){
    const state=startPrimeChase(undefined,mode);
    state.bonusSeconds=MAX_BONUS_SECONDS[mode]-1;
    assert.equal(firePrime(state,2).timeBonus,1);
    for(let j=0;j<4;j++)tickPrimeChase(state,.1);
    assert.equal(firePrime(state,3).timeBonus,0);
    assert.equal(state.bonusSeconds,MAX_BONUS_SECONDS[mode]);
  }
  assert.equal(MAX_BONUS_SECONDS.standard,85);
  assert.equal(MAX_BONUS_SECONDS.practice,32);
});

test('heavy enemy keeps up at 34m/s but boosted pilot escapes', () => {
  for(const type of ['armor','command']){
    const p={x:0,y:200,z:365};
    let enemy={x:0,y:205,z:451};
    for(let i=0;i<600;i++){
      p.z-=3.4;
      const route=pursuitSlot(p,0,i*.1,1,0,type,34);
      const delta={x:route.x-enemy.x,y:route.y-enemy.y,z:route.z-enemy.z};
      const len=Math.hypot(delta.x,delta.y,delta.z);
      const step=Math.min(1,route.speed*.1/Math.max(.001,len));
      enemy={x:enemy.x+delta.x*step,y:enemy.y+delta.y*step,z:enemy.z+delta.z*step};
    }
    assert.ok(Math.hypot(enemy.x-p.x,enemy.z-p.z)<120,type+' failed to catch up');
  }
  const boosted=pursuitSlot({x:0,y:200,z:365},0,3,1,0,'command',145);
  assert.ok(boosted.speed<145);
  assert.ok(boosted.speed>=46);
});

test('3D rear view, earned-time HUD and keyboard shortcut are available', () => {
  const root=new URL('../games/gigacity_lite/',import.meta.url);
  const main=readFileSync(new URL('main.js',root),'utf8');
  const html=readFileSync(new URL('index.html',root),'utf8');
  assert.match(main,/function setRearView\(enabled\)/);
  assert.match(main,/rearView && gameMode === 'chase'/);
  assert.match(main,/event\.code === 'KeyR'/);
  assert.match(html,/id="rearViewButton"/);
  assert.match(html,/id="chaseTimeBonus"/);
  assert.match(main,/pursuitScene\.update\(dt, pilotPosition, yaw, collisionWorld, selectedEnemy\(primeState\)\?\.id, flightSpeed \|\| 34\)/);
});
