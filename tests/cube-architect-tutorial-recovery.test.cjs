const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const main=read('games/cube3d/cube-architect.js');
const campSource=read('games/cube3d/cube-architect-camp.js');
const worldSource=read('games/cube3d/cube-architect-world.js');
const css=read('games/cube3d/cube-architect.css');
function loadRules(source,name){
  const context={window:{}};
  vm.runInNewContext(source,context,{filename:name});
  return context.window[name];
}
const camp=loadRules(campSource,'CubeArchitectCamp');
const world=loadRules(worldSource,'CubeArchitectWorld');

test('camp requires the learner to enter a built shelter, not just own one',()=>{
  assert.equal(camp.satisfied('inside',{stats:{shelterBuilt:true},insideShelter:false}),false);
  assert.equal(camp.satisfied('inside',{insideShelter:true}),true);
  assert.equal(camp.satisfied('shelter',{shelterComplete:false,stats:{shelterBuilt:false}}),false);
  assert.equal(camp.satisfied('shelter',{shelterComplete:true}),true);
});

test('the planned six blocks form a real covered interior',()=>{
  const voxels=new Map(camp.SHELTER.map(([x,y,z])=>[[x,y,z].join(','),{type:'planks',playerBuilt:true}]));
  const at=(x,y,z)=>world.shelterAt((a,b,c)=>voxels.get([a,b,c].join(',')),x,y,z);
  assert.equal(at(-3,3,3).playerBuilt,true);
  assert.equal(at(-1,3,3).playerBuilt,false);
});

test('stalled guided steps always have help and an explicit bypass',()=>{
  assert.match(main,/function tutorialRecoveryHint\(step\)/);
  assert.match(main,/tutorialState\.assists\[tutorialState\.index\]=true/);
  assert.match(main,/helpUsed\?'이 단계 넘어가기':'막혔어요 · 도움받기'/);
  assert.match(main,/\$\('tutorialClose'\)\.disabled=false/);
  assert.match(css,/\.tutorial-recovery\{/);
});

test('control readiness reflects a real pointer-lock change',()=>{
  assert.match(main,/if\(document\.pointerLockElement===canvas\)tutorialSignal\('start-control'\)/);
  assert.match(main,/if\(step\.wait==='start-control'&&document\.pointerLockElement===canvas\)/);
  assert.match(main,/function enableMobileFallback\(\)[\s\S]*?tutorialSignal\('start-control'\)/);
});

test('survival help restores reachable practice wood only on request',()=>{
  assert.match(main,/function campEnsurePracticeTree\(\)/);
  assert.match(main,/campHelpTarget=campEnsurePracticeTree\(\)/);
  assert.match(main,/const insideShelter=atShelter&&campShelterComplete\(\)&&/);
});
