'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const creatureJs=read('games/cube3d/cube-architect-creatures.js');
const assetJs=read('games/cube3d/cube-architect-creature-assets.js');
const html=read('games/cube3d/index.html');
const sandbox={THREE:new Proxy({}, {get(){return class{}}})};

test('v22 creature roster is wired before the main runtime',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(creatureJs));
  assert.match(html,/cube-architect-creatures\.js\?v=20261002-27/);
  assert.match(html,/cube-architect-creature-assets\.js\?v=20261002-27/);
  assert.match(html,/cube-architect\.js\?v=20261002-27/);
  assert.ok(html.indexOf('cube-architect-creatures.js')<html.indexOf('cube-architect.js'));
  assert.match(html,/type="importmap"/);
  assert.match(assetJs,/GLTFLoader/);
});

test('seven new biome creatures cover peaceful wildlife and build-reactive monsters',()=>{
  for(const id of ['deer','frog','camel','shadowBug','slime','burrower','cubeGolem'])
    assert.match(creatureJs,new RegExp(id+':\\{'));
  assert.match(creatureJs,/kind:'passive'/);
  assert.match(creatureJs,/kind:'hostile'/);
  assert.match(creatureJs,/nocturnal:true/);
  assert.match(creatureJs,/elite:true/);
  assert.match(js,/function nearestCreatureLight/);
  assert.match(js,/hardGround=spec\.id==='burrower'/);
  assert.match(js,/creatureStandingMaterial\(root\)/);
  assert.match(js,/dy>1\.15/);
  assert.match(js,/두 칸 높이 벽과 문/);
});

test('existing Kidscade animal and monster assets are reused where they fit',()=>{
  const files=[
    'assets/game/characters/pets/animal-deer.glb',
    'assets/game/3d/characters/quaternius/frog.glb',
    'assets/game/3d/characters/monsters/ultimate-monsters-bundle/green-blob.glb',
    'assets/game/3d/characters/monsters/ultimate-monsters-bundle/green-spiky-blob.glb',
    'assets/game/3d/characters/monsters/ultimate-monsters-bundle/goleling.glb'
  ];
  for(const file of files)assert.ok(fs.existsSync(path.join(root,file)),'missing '+file);
  for(const token of ['animal-deer.glb','frog.glb','green-blob.glb','green-spiky-blob.glb','goleling.glb'])
    assert.ok(assetJs.includes(token),token);
  assert.match(assetJs,/new GLTFLoader\(\)/);
  assert.match(js,/upgradeWildCreatureAsset/);
});

test('survival combat is forgiving and keeps building as a defense',()=>{
  assert.match(html,/id="survivalHealth"/);
  assert.match(js,/survivalHealth=5/);
  assert.match(js,/health:survivalHealth/);
  assert.match(js,/Number\(data\.health\)\|\|5/);
  assert.match(js,/version:11/);
  assert.match(js,/function damageByCreature/);
  assert.match(js,/function returnAfterCreatureDefeat/);
  assert.match(js,/가방의 재료는 그대로/);
  assert.match(js,/if\(!hitWildCreature\(\)\)breakFreeBlock/);
  assert.match(js,/torchFear/);
  assert.match(js,/hardGround/);
});

test('creatures are lazy-upgraded only near the player to protect performance',()=>{
  assert.match(js,/if\(dist>42\)\{root\.visible=false;continue\}/);
  assert.match(js,/upgradeWildCreatureAsset\(root\)/);
  assert.doesNotMatch(js,/registerCreatureMeshes\(root\);upgradeWildCreatureAsset\(root\)/);
  assert.match(js,/worldRules\.WORLD_SCALE/);
});
