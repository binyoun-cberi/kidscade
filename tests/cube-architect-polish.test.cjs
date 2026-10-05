'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const main=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');
const ui=read('games/cube3d/cube-architect-ui.css');

test('tactile survival polish parses and is cache-busted',()=>{
  assert.doesNotThrow(()=>new Function(main));
  assert.match(html,/cube-architect\.js\?v=20261005-craft-audio1/);
  assert.match(html,/cube-architect-ui\.css\?v=20261005-craft-audio1/);
});

test('mining has progressive target crack feedback and flying pickup visuals',()=>{
  assert.match(main,/function updateMiningCrack/);
  assert.match(main,/mining-stage-2/);
  assert.match(main,/mining-stage-3/);
  assert.match(main,/function spawnPickupVisual/);
  assert.match(main,/spawnBreakParticles\(x,y,z,type\)/);
  assert.match(main,/pickupVisualType/);
});

test('combat uses timed impacts, hit confirm and enemy windup instead of instant damage',()=>{
  assert.match(main,/function queuePlayerStrike/);
  assert.match(main,/at:now\+135/);
  assert.match(main,/function updatePendingPlayerStrikes/);
  assert.match(main,/function updateCreatureAttack/);
  assert.match(main,/u\.attackWindupAt=t\+320/);
  assert.match(main,/spawnCombatHitParticles/);
  assert.match(main,/hit-confirm/);
  assert.match(main,/freeHitStopUntil/);
});

test('building shows validity and facing before placement',()=>{
  assert.match(main,/function updateFreePlacementGhost/);
  assert.match(main,/function placementPreviewValid/);
  assert.match(main,/function buildFreePlacementGhost/);
  assert.match(main,/ArrowHelper/);
  assert.match(main,/freePlacementGhostKey/);
  assert.match(main,/PLACEABLE_TYPES\.includes\(selectedType\)/);
});

test('survival goal completion receives a visible pulse and recipe unlock summary',()=>{
  assert.match(main,/function pulseSurvivalQuest/);
  assert.match(main,/제작법 '\+unlocked\.length\+'개 해금/);
  assert.match(ui,/#freeMission\.quest-complete/);
  assert.match(ui,/@keyframes caQuestComplete/);
  assert.match(ui,/#freeHud\.player-hurt::after/);
});
