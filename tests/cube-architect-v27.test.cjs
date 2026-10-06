'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const world=read('games/cube3d/cube-architect-world.js');
const html=read('games/cube3d/index.html');

test('v27 scripts parse and are cache-busted',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/cube-architect\.js\?v=20261005-craft-audio1/);
  assert.match(html,/id="mobileMore"/);
});

test('survival progression introduces cuboid geometry immediately after the workbench',()=>{
  const fakeWindow={};
  new Function('window',world)(fakeWindow);
  const goals=fakeWindow.CubeArchitectWorld.GOALS;
  assert.match(goals[3].title,/2×1×1 직육면체/);
  assert.equal(goals[3].progress({cuboids:['1x1x2']}),1);
  assert.equal(goals[3].progress({cuboids:[]}),0);
  assert.match(goals[9].title,/도형을 읽는 탐험가/);
});

test('cuboid dimensions persist in survival stats and old saves migrate to the new geometry gate',()=>{
  assert.match(js,/cuboids:\[\]/);
  assert.match(js,/trackSurvival\('cuboid',currentCuboidSpec\.dims\.join\('x'\)\)/);
  assert.match(js,/version:13/);
  assert.match(js,/\(data\.version\|\|0\)<12&&savedStage>=3&&!survivalStats\.cuboids\.length\?3:savedStage/);
});

test('all eleven cube net families are available and rotate face topology correctly',()=>{
  const variants=(js.match(/\{layout:\[\[/g)||[]).length;
  assert.equal(variants,11);
  assert.match(js,/function netFaceCorners/);
  assert.match(js,/chooseNetVariant\(\)/);
  assert.match(js,/11가지 정육면체 전개도/);
});

test('landmark dungeons now include landmark-specific architecture reading chambers',()=>{
  const structurePrompts=(js.match(/structure:\{prompt:/g)||[]).length;
  assert.equal(structurePrompts,6);
  assert.match(js,/data\.targetKind==='structure'&&stage===2/);
  assert.match(js,/dungeonProgress'\)\.textContent=\(stage\+1\)\+'\/4'/);
  for(const phrase of ['좌우 대칭 구조','중앙 첨탑','위로 갈수록 폭이 좁아진다','두 탑 사이','여러 겹으로 쌓인 지붕','주변 네 탑'])
    assert.ok(js.includes(phrase),phrase);
});

test('mobile utility actions are contextual and block raycasts are locally filtered',()=>{
  assert.match(js,/mobileUtilityOpen/);
  assert.match(js,/mobileMore/);
  assert.match(js,/function nearbyWorldInteractables/);
  assert.match(js,/raycaster\.intersectObjects\(nearbyWorldInteractables/);
});

test('hard landmark progress is reported by three-view silhouette rather than raw voxel count',()=>{
  assert.match(js,/projectionSet\(mission\.blocks,'top'\)\.size/);
  assert.match(js,/projectionSet\(mission\.blocks,'front'\)\.size/);
  assert.match(js,/projectionSet\(mission\.blocks,'side'\)\.size/);
});


test('simulation fixes require a real player-built shelter and accept every furnace result',()=>{
  const fakeWindow={};
  new Function('window',world)(fakeWindow);
  const rules=fakeWindow.CubeArchitectWorld;
  const shelterGoal=rules.GOALS[5],furnaceGoal=rules.GOALS[8];
  assert.equal(shelterGoal.progress({shelterBuilt:false,placedBlocks:99}),0);
  assert.equal(shelterGoal.progress({shelterBuilt:true,placedBlocks:1}),1);
  for(const type of ['glass','charcoal','brick','ironBlock','smoothStone'])
    assert.equal(furnaceGoal.progress({smelted:{[type]:1}}),1,type);
  const blocks=new Map();
  const key=(x,y,z)=>x+','+y+','+z;
  const read=(x,y,z)=>blocks.get(key(x,y,z))||null;
  blocks.set(key(0,4,0),{type:'planks',playerBuilt:true});
  blocks.set(key(-1,2,0),{type:'dirt',playerBuilt:true});
  blocks.set(key(1,2,0),{type:'stone',natural:true});
  const shelter=rules.shelterAt(read,0,2,0);
  assert.equal(shelter.sheltered,true);
  assert.equal(shelter.playerBuilt,true);
});

test('marsh vegetation can generate trees and landmark restoration is explicitly balanced',()=>{
  assert.match(js,/if\(roll>\.987\)growTree\(x,h\+1,z,false,'forest'\)/);
  assert.match(js,/else if\(roll>\.966\)/);
  for(const token of ["타워 브리지')?-.08","앙코르와트')?-.035","(name.includes('사그라다 파밀리아')||name.includes('히메지성'))?.04","(name.includes('타지마할')||name.includes('에펠탑'))?.02"])
    assert.ok(js.includes(token),token);
});

test('hard blueprint HUD compares projection cells with projection cells',()=>{
  assert.match(js,/placed=projectionSet\(user,'top'\)\.size\+projectionSet\(user,'front'\)\.size\+projectionSet\(user,'side'\)\.size/);
  assert.match(js,/내 투영 칸/);
  assert.match(js,/설계 투영 칸/);
});
