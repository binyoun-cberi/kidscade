const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const css=read('games/cube3d/cube-architect.css');

test('survival tutorial follows the real first-day progression',()=>{
  assert.doesNotThrow(()=>new Function(js));
  for(const wait of [
    'survival-wood3',
    'survival-planks',
    'survival-workbench-crafted',
    'survival-workbench-placed',
    'survival-planks2',
    'survival-shape-open',
    'survival-cuboid-ready',
    'survival-cuboid',
    'survival-sticks',
    'survival-woodpick'
  ]) assert.match(js,new RegExp(wait));
  assert.match(js,/원목 3개 모으기/);
  assert.match(js,/2×1×1 직육면체 설계/);
  assert.match(js,/나무 곡괭이 완성/);
});

test('survival tutorial has live progress and uses actual survival state',()=>{
  assert.match(js,/function tutorialWaitSatisfied/);
  assert.match(js,/function tutorialLiveStatus/);
  assert.match(js,/tutorialRefreshProgress\(\)/);
  assert.match(js,/survivalStats\.harvestedWood/);
  assert.match(js,/survivalStats\.crafted\?\.woodPick/);
  assert.match(js,/survivalStats\.placed\?\.workbench/);
  assert.match(js,/bagCount\('planks'\)>=2/);
  assert.match(css,/tutorial-live-status/);
});

test('survival crafting UI exposes recipe ids and shape completion refreshes the coach',()=>{
  assert.match(js,/b\.dataset\.recipeId=recipe\.id/);
  assert.match(js,/currentCuboidSpec=\{dims,faceColors\};putOnHotbar\('cuboid'\).*tutorialRefreshProgress/);
  assert.match(js,/cubeArchitectGuidedTutorial_v3_/);
});
