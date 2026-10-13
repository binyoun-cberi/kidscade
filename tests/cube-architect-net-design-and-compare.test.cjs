'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const math=require('../games/cube3d/cube-architect-math.js');
const main=fs.readFileSync(path.join(root,'games/cube3d/cube-architect.js'),'utf8');
const html=fs.readFileSync(path.join(root,'games/cube3d/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'games/cube3d/cube-architect.css'),'utf8');
const valid=[[1,1],[3,1],[0,0],[0,2],[0,1],[2,1]];
test('a learner can place six squares and see they fold into one cube',()=>{
 let draft=Array(6).fill(null);
 for(let i=0;i<6;i++){
   draft=math.draftPlace(draft,i,...valid[i]);
   assert.ok(draft,'valid placement '+i);
   assert.equal(math.draftReport(draft).placed,i+1);
   if(i<5)assert.equal(math.draftReport(draft).reason,'incomplete');
 }
 const result=math.draftReport(draft);
 assert.equal(result.valid,true);
 assert.equal(result.hinges.length,5);
 assert.equal(new Set(result.normals).size,6);
});
test('touch-edit positions reject duplicate cells, out of bounds and invalid shapes without deleting earlier tiles',()=>{
 let draft=Array(6).fill(null);
 draft=math.draftPlace(draft,0,2,2);
 assert.equal(math.draftPlace(draft,1,2,2),null);
 assert.equal(math.draftPlace(draft,1,6,3),null);
 assert.equal(math.draftPlace(draft,1,-1,3),null);
 assert.deepEqual(draft[0],[2,2]);
 const moved=math.draftPlace(draft,0,3,3);
 assert.deepEqual(moved[0],[3,3]);
 assert.deepEqual(draft[0],[2,2],'editing should be immutable for undo');
 assert.equal(math.draftReport(draft).valid,false);
 assert.equal(math.draftReport(Array(6).fill([0,0])).valid,false);
});
test('disconnected and overlapping nets fail rather than showing a false fold success',()=>{
 const separated=[[0,0],[1,0],[2,0],[3,0],[4,0],[5,5]];
 const overlap=[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0]];
 assert.equal(math.draftReport(separated).valid,false);
 assert.equal(math.draftReport(separated).reason,'disconnected');
 assert.equal(math.draftReport(overlap).valid,false);
 assert.equal(math.draftReport(overlap).reason,'overlap');
});
test('compare two distinct areas with identical volume, not identical materials',()=>{
 const cube=math.measurements([2,2,2]);
 const alternative=math.equalVolumeAlternative(cube.dimensions);
 assert.equal(cube.volume,8);
 assert.equal(cube.area,24);
 assert.ok(alternative);
 assert.equal(alternative.volume,cube.volume);
 assert.notEqual(alternative.area,cube.area);
 assert.equal(math.equalVolumeAlternative([1,1,2]),null,'small prime volume has no meaningfully different shape');
 const stick=math.measurements([1,1,4]),compact=math.equalVolumeAlternative([1,1,4]);
 assert.equal(stick.area,18);
 assert.equal(compact.area,16);
 assert.equal(compact.volume,4);
 assert.equal(math.equalVolumeAlternative([0,0,1]),null);
});
test('the editable net grid has touch-safe controls and does not mix with existing quiz board',()=>{
 for(const id of ['netDesignPanel','netDesignPalette','netDesignGrid','netDesignStatus',
   'netDesignUndo','netDesignReset','netDesignExample','netDesignCheck']){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/data-net-mode="design"/);
 assert.match(css,/\.net-design-cell\{[^}]*aspect-ratio:1/);
 assert.match(main,/netDesignLayout=Array\(6\)\.fill\(null\)/);
 assert.match(main,/window\.CubeArchitectMath\.draftPlace/);
 assert.match(main,/window\.CubeArchitectMath\.draftReport/);
 assert.match(main,/const activeLayout=custom\?netDesignLayout:NET_LAYOUT/);
 assert.match(main,/const showOverlap=custom&&geometry\.reason==='overlap'/);
 assert.match(main,/plane\.material\.color\.set\(0xff9999\)/);
 assert.match(main,/if\(!geometry\.valid&&!showOverlap\)/);
 assert.match(main,/reportResult\('net-design',100,true\)/);
});
test('same-volume decision updates actual construction dimensions only when unlocked',()=>{
 for(const id of ['cuboidCompareCard','cuboidCompareOptions','cuboidCompareA',
  'cuboidCompareB','cuboidCompareFeedback','cuboidCompareApply']){
    assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(main,/function renderCuboidComparison\(dims\)/);
 assert.match(main,/function answerCuboidComparison\(choice\)/);
 assert.match(main,/function applyCuboidComparison\(\)/);
 assert.match(main,/p\.alt\.dimensions\.some\(d=>d>survivalCuboidMax\(\)\)/);
 assert.match(main,/\$\('shapeW'\)\.value=w/);
 assert.match(main,/updateCuboidMathPrompt\(\)/);
 assert.match(html,/math=20261013-2/);
});
test('both runtime files parse and both learn-from-mistakes paths remain available',()=>{
 assert.doesNotThrow(()=>new Function(main));
 assert.match(main,/function undoNetDesign\(\)/);
 assert.match(main,/function resetNetDesign\(example=false\)/);
 assert.match(main,/function checkCuboidMath\(reveal=false\)/);
 assert.match(main,/function checkChallengeEstimate\(\)/);
});
