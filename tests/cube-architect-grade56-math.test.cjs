'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const logic=require('../games/cube3d/cube-architect-math.js');
const main=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');

test('2022 grade 5–6 cube measurements and three pairs of opposite faces',()=>{
 const a=logic.measurements([4,3,2]);
 assert.equal(a.volume,24);
 assert.equal(a.area,52);
 assert.deepEqual(a.faceAreas,[6,6,8,8,12,12]);
 assert.equal(logic.measurements([2,6,2]).volume,24);
 assert.equal(logic.measurements([2,6,2]).area,56);
 assert.equal(logic.measurements([1,1,1]).area,6);
 assert.equal(logic.measurements([0,2,3]),null);
 assert.equal(logic.measurements([3.2,2,4]),null);
});
test('stacking layers, shadows and exterior face counting work for hidden-block puzzles',()=>{
 const solid=[];for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)solid.push([x,y,z]);
 assert.deepEqual(logic.layeredCounts(solid),[{height:1,count:4},{height:2,count:4}]);
 assert.deepEqual(logic.projectionCounts(solid),{top:4,front:4,side:4});
 assert.equal(logic.visibleUnitFaces(solid),24);
 assert.equal(logic.visibleUnitFaces([[0,0,0],[1,0,0]]),10);
});
test('all eleven cube net layouts are connected and fold into six distinct 3D faces',()=>{
 const source=main.split('const NET_VARIANTS=[')[1]?.split('];\nlet netVariantIndex')[0];
 assert.ok(source,'all net variants exist');
 const variants=vm.runInNewContext('['+source+']');
 assert.equal(variants.length,11);
 for(const [idx,v] of variants.entries()){
   const fold=logic.unfoldedLayout(v.layout);
   assert.equal(fold.valid,true,'layout '+(idx+1)+' failed: '+fold.reason);
   assert.equal(fold.hinges.length,5,'six faces need five connected folding hinges');
   assert.equal(new Set(fold.normals).size,6);
 }
});
test('overlapping and self-intersecting paper nets are rejected',()=>{
 for(const layout of [
   [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0]],
   [[0,0],[0,0],[1,0],[1,1],[2,1],[3,1]],
   [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]
 ])assert.equal(logic.unfoldedLayout(layout).valid,false);
});
test('the research room uses correct equal-size square faces and hinges, not arbitrary translations',()=>{
 assert.match(main,/new THREE\.BoxGeometry\(2\.2,2\.2,2\.2\)/);
 assert.match(main,/window\.CubeArchitectMath\.unfoldedLayout\(NET_LAYOUT\)/);
 assert.match(main,/pivot\.position\.set\(dx\*size\/2,-dy\*size\/2,0\)/);
 assert.match(main,/h\.pivot\.rotation\[h\.axis\]=h\.sign\*e\*Math\.PI\/2/);
 assert.doesNotMatch(main,/new THREE\.BoxGeometry\(2\.8,1\.9,1\.55\)/);
 assert.match(html,/aria-label="정육면체 전개도"/);
});
test('workshop predictions and design challenge use live mathematics rather than static pictures',()=>{
 assert.match(html,/id="cuboidVolumeGuess"/);
 assert.match(html,/id="cuboidAreaGuess"/);
 assert.match(html,/id="challengeEstimate"/);
 assert.match(main,/function checkCuboidMath\(reveal=false\)/);
 assert.match(main,/window\.CubeArchitectMath\.measurements\(dims\)/);
 assert.match(main,/function checkChallengeEstimate\(\)/);
 assert.match(main,/window\.CubeArchitectMath\.layeredCounts\(currentChallengeMission\(\)\.blocks\)/);
 assert.match(main,/hard\|\|challengeEstimateDone\?target:'\?'/);
 assert.match(html,/cube-architect-math\.js\?v=/);
});
test('math stays optional for free building and existing survival saves retain their flags',()=>{
 assert.match(main,/currentCuboidSpec=\{dims,faceColors\};putOnHotbar\('cuboid'\)/);
 assert.match(main,/workbenchUsed:false/);
 assert.match(main,/trackSurvival\('workbench','used'\)/);
 const win={};vm.runInNewContext(read('games/cube3d/cube-architect-world.js'),{window:win,Math});
 const goals=win.CubeArchitectWorld.GOALS;
 assert.match(goals.find(x=>x.id==='planks').description,/제작대/);
 assert.match(goals.find(x=>x.id==='workbench').title,/제작대 발견/);
 assert.equal(goals.find(x=>x.id==='workbench').progress({workbenchUsed:true}),1);
 assert.equal(goals.find(x=>x.id==='workbench').progress({placed:{workbench:1}}),1);
});
test('updated scripts parse without browser globals',()=>{
 assert.doesNotThrow(()=>new Function(main));
 for(const p of ['games/cube3d/cube-architect-world.js','games/cube3d/cube-architect-camp.js','games/cube3d/cube-architect-math.js'])
   assert.doesNotThrow(()=>new Function(read(p)));
});
