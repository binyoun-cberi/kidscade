'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const worldJs=read('games/cube3d/cube-architect-world.js');
const landmarks=read('games/cube3d/cube-architect-landmarks.js');
const html=read('games/cube3d/index.html');
const css=read('games/cube3d/cube-architect.css');
const win={};
new Function('window',worldJs)(win);
const world=win.CubeArchitectWorld;

test('v16 modules parse and biome data loads before the game script',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(worldJs));
  assert.equal(Object.keys(world.BIOMES).length,8);
  assert.ok(html.indexOf('cube-architect-world.js')<html.indexOf('cube-architect.js'));
  assert.match(html,/cube-architect\.js\?v=20261001-21/);
  for(const id of ['freeQuestTitle','freeQuestDescription','biomeState','survivalCraftPanel',
    'survivalCraftList','inventoryTitle','inventorySubtitle']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.match(css,/survival-inventory/);
});
test('biomes are deterministic and the spawn is flat and dry',()=>{
  assert.equal(world.WORLD_SCALE,1.5);
  const samples=[
    [0,0,'meadow'],[-40,-13,'forest'],[-61,-57,'pine'],[-7,-66,'snow'],
    [48,-42,'desert'],[65,35,'badlands'],[8,59,'marsh'],[-51,45,'flowers']
  ];
  for(const [x,z,id] of samples){
    assert.equal(world.region(x,z),id);
    const height=world.height(x,z);
    assert.equal(height,world.height(x,z));
    assert.ok(height>=-3&&height<=10);
  }
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)
    if(Math.hypot(x,z)<=4)
      assert.equal(world.height(x,z),2,'starter x='+x+' z='+z);
});
test('survival crafting has tool gates and cannot skip expensive items',()=>{
  assert.equal(world.toolNeeded('stone'),'woodPick');
  assert.equal(world.toolNeeded('ironOre'),'stonePick');
  assert.equal(world.toolNeeded('obsidian'),'ironPick');
  const plank=world.RECIPES.find(r=>r.id==='planks');
  const bench=world.RECIPES.find(r=>r.id==='workbench');
  const woodPick=world.RECIPES.find(r=>r.id==='woodPick');
  const furnace=world.RECIPES.find(r=>r.id==='furnace');
  assert.equal(plank.stage,0);
  assert.equal(bench.stage,1);
  assert.equal(woodPick.bench,true);
  assert.equal(furnace.needs.stone,8);
  assert.ok(world.GOALS.length>=6);
});
test('camera stepping is visually smoothed and rendering is limited around the player',()=>{
  assert.match(js,/let stepped=false/);
  assert.match(js,/if\(onGround&&!stepped/);
  assert.match(js,/const displayEye=camera\.position\.y/);
  assert.match(js,/freePhysicsY=camera\.position\.y/);
  assert.match(js,/maxChange=\(delta>=0\?4\.5:5\.1\)/);
  assert.match(js,/streamWorldMeshes\(\)/);
  assert.match(js,/const WORLD_HALF=96/);
  assert.match(js,/WORLD_VIEW_RADIUS=mobileModeEnabled\?21:30/);
  assert.match(js,/cubeArchitectWorldSaveV4_/);
  assert.match(js,/cubeArchitectWorldSaveV3/);
  assert.match(js,/if\(e\.code==='KeyF'&&gameFreeMode==='creative'\)/);
  assert.match(js,/if\(e\.code==='KeyR'&&gameFreeMode==='creative'\)/);
});
