'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const main=read('games/cube3d/cube-architect.js');
const world=read('games/cube3d/cube-architect-world.js');
const creatures=read('games/cube3d/cube-architect-creatures.js');
const worldAssets=read('games/cube3d/cube-architect-world-assets.js');
const html=read('games/cube3d/index.html');

test('hunting and gathering runtime parses and is exposed in the controls',()=>{
  assert.doesNotThrow(()=>new Function(main));
  assert.doesNotThrow(()=>new Function(world));
  assert.doesNotThrow(()=>new Function(creatures));
  assert.match(html,/id="mobileInteract"/);
  assert.match(html,/F 생물 상호작용/);
  assert.match(html,/cube-architect\.js\?v=20261005-avatar-actions1/);
  assert.match(html,/cube-architect-world\.js\?v=20261005-hunt1/);
  assert.match(html,/cube-architect-creatures\.js\?v=20261005-hunt1/);
  assert.match(html,/cube-architect-world-assets\.js\?v=20261005-hunt1/);
});

test('peaceful wildlife gives renewable resources without becoming hunting targets',()=>{
  assert.match(creatures,/sheep:.*forage:\{reward:\{wool:1\},cooldown:75/);
  assert.match(creatures,/chicken:.*forage:\{reward:\{egg:1\},cooldown:55/);
  assert.match(main,/function interactWildCreature/);
  assert.match(main,/if\(spec\.kind==='hostile'\)/);
  assert.match(main,/creatureForageAt\[spec\.id\]/);
  assert.match(main,/생물 관찰/);
});

test('hostile hunting has dedicated swords and keeps mining tool tiers separate',()=>{
  for(const id of ['woodSword','stoneSword','ironSword']){
    assert.ok(world.includes("id:'"+id+"'"),id+' recipe');
    assert.ok(main.includes(id+':{name:'),id+' item');
  }
  assert.match(main,/tool\.endsWith\('Sword'\)/);
  assert.match(main,/tool==='ironSword'\?4:tool==='stoneSword'\?3:tool==='woodSword'\?2/);
  assert.match(main,/trackSurvival\('hunt',u\.spec\.id,1\)/);
  assert.match(worldAssets,/Tools\/glTF\/Sword_Wood\.gltf/);
  assert.match(worldAssets,/Tools\/glTF\/Sword_Stone\.gltf/);
  assert.match(worldAssets,/Tools\/glTF\/Sword_Gold\.gltf/);
});

test('foraging feeds the survival loop through berries eggs wool and food healing',()=>{
  assert.match(main,/wildBerry:\{name:'산딸기'/);
  assert.match(main,/cookedEgg:\{name:'구운 달걀'/);
  assert.match(main,/wool:\{name:'양털'/);
  assert.match(main,/const CONSUMABLE_TYPES=/);
  assert.match(main,/function consumeFood/);
  assert.match(main,/input:'egg',output:'cookedEgg'/);
  assert.match(main,/biomeId==='forest'\|\|biomeId==='flowers'/);
  assert.match(world,/id:'woolMat'/);
});

test('animal gathering cooldown and survival records survive reloads',()=>{
  assert.match(main,/creatureForageAt:\{\.\.\.creatureForageAt\}/);
  assert.match(main,/creatureForageAt=data\.creatureForageAt/);
  assert.match(main,/foraged:\{\},hunted:\{\},foodsEaten:0/);
  assert.match(main,/action==='forage'\|\|action==='hunt'/);
  assert.match(main,/action==='eat'/);
});
