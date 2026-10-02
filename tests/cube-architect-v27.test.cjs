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
  assert.match(html,/cube-architect\.js\?v=20261002-27/);
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
  assert.match(js,/version:12/);
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
