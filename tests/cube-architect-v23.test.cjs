'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const creatures=read('games/cube3d/cube-architect-creatures.js');
const assets=read('games/cube3d/cube-architect-creature-assets.js');
const html=read('games/cube3d/index.html');

test('v23 creature rework parses and is cache-busted',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(creatures));
  assert.match(html,/cube-architect-creatures\.js\?v=20261005-hunt1/);
  assert.match(html,/cube-architect-creature-assets\.js\?v=20261003-31/);
  assert.match(html,/cube-architect\.js\?v=20261005-hunt1/);
  assert.match(html,/cube-architect\.css\?v=20261003-29/);
});

test('creatures spawn around exploration rather than fixed landmark coordinates',()=>{
  assert.match(js,/function spawnDynamicCreature/);
  assert.match(js,/function maintainWildCreatures/);
  assert.match(js,/const angle=Math\.random\(\)\*Math\.PI\*2,dist=18\+Math\.random\(\)\*13/);
  assert.match(js,/poiRules\.isLandmarkClearZone/);
  assert.match(js,/const max=mobileModeEnabled\?5:7/);
  assert.match(js,/if\(root\.userData\.dead\|\|dist>56\)despawnWildCreature/);
});

test('combat has rhythm, knockback and chase pressure without removing escape',()=>{
  assert.match(js,/now-lastCreatureAttackAt<480/);
  assert.match(js,/u\.knockbackUntil=now\+230/);
  assert.match(js,/speed\*=1\.55/);
  assert.match(creatures,/shadowBug:.*speed:1\.45/);
  assert.match(creatures,/burrower:.*speed:1\.9/);
  assert.match(creatures,/cubeGolem:.*hp:9.*speed:\.82/);
  assert.match(js,/if\(survivalHealth>=5\)healthRegenClock=0/);
  assert.match(js,/lastCreatureDamage=t;healthRegenClock=0/);
});

test('third person crosshair drives block and creature raycasts',()=>{
  assert.match(js,/function thirdPersonCameraPosition/);
  assert.match(js,/function setFreeInteractionRay/);
  assert.match(js,/if\(freeViewMode==='third'\)raycaster\.set\(thirdPersonCameraPosition\(eye\),dir\)/);
  assert.match(js,/function withinPlayerReach/);
  assert.match(js,/function freeCenterHit/);
  assert.match(js,/function creatureRayHit/);
});

test('real GLB animation clips and cube golem assembly are active',()=>{
  assert.match(assets,/SkeletonUtils\.clone/);
  assert.match(assets,/new THREE\.AnimationMixer/);
  assert.match(assets,/walk\|run\|move\|crawl\|swim/);
  assert.match(assets,/attack\|hit\|bite\|slam\|punch/);
  assert.match(js,/function startCubeGolemAssembly/);
  assert.match(js,/function updateCubeGolemAssembly/);
  assert.match(js,/assemblyDuration=1500/);
  assert.match(js,/CubeArchitectCreatureAssets\?\.update/);
});

test('day cycle and creature farming state survive reload and page exit',()=>{
  assert.match(js,/version:12/);
  assert.match(js,/dayTime,cuboidSpec/);
  assert.match(js,/worldTime:survivalWorldTime/);
  assert.match(js,/creatureDefeats:\{\.\.\.creatureDefeats\}/);
  assert.match(js,/seenCreatures:\[\.\.\.seenCreatureKinds\]/);
  assert.match(js,/survivalWorldTime=Math\.max\(0,Number\(data\.worldTime\)\|\|0\)/);
  assert.match(js,/creatureDefeats=data\.creatureDefeats/);
  assert.match(js,/creatureDefeats\[u\.spec\.id\]=survivalWorldTime/);
  assert.match(js,/addEventListener\('pagehide',persistFreeWorldOnExit\)/);
  assert.match(js,/visibilitychange/);
});
