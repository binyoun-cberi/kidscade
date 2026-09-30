'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'games/cube3d/cube-architect.js'),'utf8');
const worldJs=fs.readFileSync(path.join(root,'games/cube3d/cube-architect-world.js'),'utf8');
const html=fs.readFileSync(path.join(root,'games/cube3d/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'games/cube3d/cube-architect.css'),'utf8');
const w={};new Function('window',worldJs)(w);
const rules=w.CubeArchitectWorld;
function stats(){
  return {harvestedWood:0,harvestedStone:0,crafted:{},placed:{},
    placedBlocks:0,paintedFaces:[],smelted:{},biomes:['meadow'],found:[],restored:[]};
}
test('v17 scripts parse and survival features connect to the launcher',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotThrow(()=>new Function(worldJs));
  assert.match(html,/cube-architect\.js\?v=20260930-18/);
  assert.ok(html.indexOf('cube-architect-world.js')<html.indexOf('cube-architect.js'));
  assert.match(html,/id="survivalSafety"/);
  assert.match(html,/id="survivalReturn"/);
  assert.match(css,/#survivalReturn/);
  assert.match(js,/worldChunksGenerated=new Set/);
  assert.match(js,/generateWorldChunk\(bx,bz\)/);
  assert.match(js,/version:6/);
});
test('survival has a finishable, action-driven sequence',()=>{
  assert.ok(rules.GOALS.length>=11);
  const s=stats();
  assert.equal(rules.goalProgress(rules.GOALS[0],s),0);
  s.harvestedWood=3;
  assert.equal(rules.goalProgress(rules.GOALS[0],s),3);
  s.crafted.planks=1;s.placed.workbench=1;s.crafted.woodPick=1;
  s.placedBlocks=6;s.harvestedStone=8;s.biomes.push('forest');
  s.placed.furnace=1;s.smelted.glass=1;s.placed.cuboid=1;
  s.paintedFaces=['block:0','block:2'];s.found=['bp1'];s.restored=['taj'];
  for(const goal of rules.GOALS)
    assert.equal(rules.goalProgress(goal,s),goal.need,goal.title);
  const empty=stats();empty.harvestedStone=8;
  assert.equal(rules.goalProgress(rules.GOALS[5],empty),1);
  empty.biomes.push('desert');
  assert.equal(rules.goalProgress(rules.GOALS[5],empty),2);
});
test('a roof and two enclosing walls protect the player',()=>{
  const blocks=new Map();
  const key=(x,y,z)=>x+','+y+','+z;
  const read=(x,y,z)=>blocks.get(key(x,y,z))||null;
  assert.equal(rules.shelterAt(read,0,3,0).sheltered,false);
  blocks.set(key(0,5,0),{type:'planks'});
  blocks.set(key(-1,3,0),{type:'stone'});
  assert.equal(rules.shelterAt(read,0,3,0).sheltered,false);
  blocks.set(key(1,3,0),{type:'stone'});
  assert.equal(rules.shelterAt(read,0,3,0).sheltered,true);
  const cold=rules.exposureStep(20,10,{night:true,cold:true});
  assert.ok(cold>20);
  assert.ok(rules.exposureStep(cold,10,{night:true,sheltered:true})<cold);
  assert.ok(rules.exposureStep(cold,10,{night:true,lit:true})<cold);
  assert.equal(rules.exposureStep(100,100,{night:true,cold:true}),100);
});
test('each biome has a usable regional reward or clue',()=>{
  assert.equal(Object.keys(rules.BIOMES).length,8);
  assert.equal(Object.keys(rules.BIOME_REWARDS).length,8);
  for(const id of Object.keys(rules.BIOMES)){
    assert.ok(rules.BIOME_REWARDS[id].resource);
    assert.ok(rules.BIOME_REWARDS[id].hint.length>=8);
  }
  assert.equal(rules.RECIPES.find(r=>r.id==='flowerDye').needs.flower,2);
  assert.equal(rules.RECIPES.find(r=>r.id==='reedMat').needs.reed,3);
  assert.equal(rules.RECIPES.find(r=>r.id==='snowBrick').needs.snow,4);
  assert.match(js,/trackSurvival\('biome',region\)/);
  assert.match(js,/trackSurvival\('paint',worldKey\(x,y,z\)/);
  assert.match(js,/const prizes=\{bp1:/);
});
