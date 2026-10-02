'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const worldJs=read('games/cube3d/cube-architect-world.js');
const landmarkJs=read('games/cube3d/cube-architect-landmarks.js');
const poiJs=read('games/cube3d/cube-architect-poi.js');
const html=read('games/cube3d/index.html');
const win={};
new Function('window',landmarkJs)(win);
new Function('window',worldJs)(win);
new Function('window',poiJs)(win);
const world=win.CubeArchitectWorld;
const pois=win.CubeArchitectPOI.POIS;

test('v20 keeps Minecraft-like player proportions while expanding the world',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.equal(world.WORLD_SCALE,1.5);
  assert.match(js,/const WORLD_HALF=96/);
  assert.match(js,/WORLD_MAX_Y=48/);
  assert.match(js,/WORLD_VIEW_RADIUS=mobileModeEnabled\?21:30/);
  assert.match(js,/feet=eyeY-1\.62/);
  assert.match(js,/const r=\.27/);
  assert.match(js,/new THREE\.BoxGeometry\(\.14,1\.92,\.9\)/);
  assert.match(html,/cube-architect\.js\?v=20261002-25/);
});

test('biomes stretch horizontally instead of making blocks or the player smaller',()=>{
  assert.deepEqual(world.CENTERS.slice(0,8),[
    [0,0,'meadow'],[-40,-13,'forest'],[-61,-57,'pine'],[-7,-66,'snow'],
    [48,-42,'desert'],[65,35,'badlands'],[8,59,'marsh'],[-51,45,'flowers']
  ]);
  for(const [x,z,id] of world.CENTERS.slice(0,8))assert.equal(world.region(x,z),id);
  assert.equal(world.height(0,0),2);
  assert.equal(world.height(3,3),2);
  assert.match(worldJs,/const sx=x\/WORLD_SCALE,sz=z\/WORLD_SCALE/);
});

test('natural objects are larger relative to the player',()=>{
  assert.match(js,/const height=\(conifer\?7:5\)\+Math\.floor\(hash2\(x\+11,z-7\)\*3\)/);
  assert.match(js,/scene\.fog=new THREE\.Fog\(0x9bd7ff,30,68\)/);
});

test('landmarks use near-original blueprint resolution and occupy the scaled geography',()=>{
  const expected={
    taj:[24,21,22],sagrada:[22,27,21],eiffel:[26,28,26],
    towerBridge:[30,19,12],himeji:[24,23,22],angkor:[28,22,27]
  };
  for(const poi of pois){
    assert.deepEqual(poi.compact.size,expected[poi.id],poi.id);
    assert.equal(world.region(...poi.center),poi.biome,poi.id);
    assert.ok(Math.max(...poi.compact.size)>=22,poi.id);
    assert.ok(Math.max(...poi.compact.size)<=30,poi.id);
    assert.equal(win.CubeArchitectPOI.isLandmarkClearZone(...poi.center),true,poi.id);
  }
  assert.deepEqual(pois.find(p=>p.id==='taj').center,[48,-43]);
  assert.deepEqual(pois.find(p=>p.id==='eiffel').center,[-7,-66]);
  assert.match(poiJs,/function compress\(plan,target=30\)/);
  assert.match(poiJs,/const sy=Math\.min\(1,Math\.max\(\.72,scale\)\)/);
});

test('v20 keeps the v19 dungeon loop and advances save schema',()=>{
  assert.match(js,/function openLandmarkDungeon/);
  assert.match(js,/function dungeonInteract/);
  assert.match(js,/function openDungeonBlueprint/);
  assert.match(js,/const DUNGEON_SPECS=/);
  assert.match(js,/version:11/);
});
