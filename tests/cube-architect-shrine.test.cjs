const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');
const css=read('games/cube3d/cube-architect.css');

test('landmark dungeons start the reusable shrine puzzle flow',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(js,/const DUNGEON_SHRINE_OBJECTIVES=/);
  assert.match(js,/const DUNGEON_VOXEL_VARIANTS=/);
  assert.match(js,/shrineVersion:1/);
  assert.match(js,/puzzleState:\{/);
  assert.match(js,/buildShrineDungeonPuzzles\(poi,theme\)/);
});

test('first shrine room checks three orthographic projections instead of an answer button',()=>{
  assert.match(js,/function dungeonShadowScores/);
  assert.match(js,/\['top','front','side'\]\.map/);
  assert.match(js,/overlapScore\(projectionSet\(active,view\),projectionSet\(def\.target,view\)\)/);
  assert.match(js,/scores\.every\(v=>v===100\)/);
  assert.match(js,/addDungeonProjectionPanel/);
});

test('second shrine room requires the exact voxel build shown by the diagram',()=>{
  assert.match(js,/function dungeonBuildStats/);
  assert.match(js,/active\.size===target\.size&&common===target\.size/);
  assert.match(js,/addDungeonIsometricPanel/);
  assert.match(js,/겨냥도를 보고 똑같이 쌓기/);
});

test('players directly touch voxel sockets to change the central puzzle model',()=>{
  assert.match(js,/targetKind:'shrineCell'/);
  assert.match(js,/data\.targetKind==='shrineVoxel'\|\|data\.targetKind==='shrineCell'/);
  assert.match(js,/dungeonSetVoxel\(stage,data\.voxelKey,on\)/);
  assert.match(js,/renderDungeonVoxelPuzzle\(stage,theme\)/);
  assert.match(js,/new THREE\.BoxGeometry\(\.76,\.76,\.76\)/);
  assert.match(js,/wireframe:true/);
  assert.match(js,/new THREE\.TorusGeometry\(1\.55,\.045,8,40\)/);
});

test('third shrine room offers spatial net candidates and visibly folds them',()=>{
  assert.match(js,/const DUNGEON_INVALID_NETS=/);
  assert.match(js,/function dungeonNetChoices/);
  assert.match(js,/function addDungeonNetCandidates/);
  assert.match(js,/function animateDungeonNetChoice/);
  assert.match(js,/if\(!visual\.valid\)ends\[5\]=ends\[4\]\.clone\(\)/);
  assert.match(js,/접는 도중 면이 겹쳤어요/);
  assert.match(js,/전개도가 정확히 정육면체로 접혔어요/);
});

test('solving the three rooms unlocks the landmark reward inside the dungeon',()=>{
  assert.match(js,/dungeonSession\.stage=1/);
  assert.match(js,/dungeonSession\.stage=2/);
  assert.match(js,/dungeonSession\.stage=3/);
  assert.match(js,/targetKind==='shrinePortal'/);
  assert.match(js,/function completeDungeonShrine/);
  assert.match(js,/completeLandmarkPoi\(id\)/);
});

test('dungeon HUD explains live mathematical progress on desktop and mobile',()=>{
  assert.match(html,/id="dungeonPuzzleStatus"/);
  assert.match(css,/#dungeonPuzzleStatus/);
  assert.match(js,/function dungeonPuzzleStatusText/);
  assert.match(js,/그림자 일치 · 위/);
  assert.match(js,/정확한 블록/);
  assert.match(js,/세 전개도를 걸어 다니며 조사/);
  assert.match(js,/WASD로 퍼즐 방을 걸어 다니고/);
});

test('older dungeon and restoration entry points remain for compatibility',()=>{
  assert.match(js,/function openDungeonBlueprint/);
  assert.match(js,/restorationSession=\{poiId:poi\.id,missionIndex:poi\.missionIndex,completed:false,fromDungeon:true\}/);
  assert.match(js,/data\.targetKind==='seal'&&stage===0/);
  assert.match(js,/data\.targetKind==='mirror'&&stage===1/);
  assert.match(js,/data\.targetKind==='structure'&&stage===2/);
});
