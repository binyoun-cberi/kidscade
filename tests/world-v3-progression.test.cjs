const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'world-v2','kidscade-world-storage.js'),'utf8');
const furnishing=fs.readFileSync(path.join(root,'world-v3','kidscade-world-furnishing.js'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

test('farm growth physically expands from one plot to nine plots',()=>{
  assert.match(runtime,/FARM_PLOT_COUNTS=\[1,2,3,6,9\]/);
  assert.match(runtime,/function farmPlotCount/);
  assert.match(runtime,/function updateFarmExpansionVisuals/);
  assert.match(runtime,/farmPlotActors\.push/);
  assert.match(runtime,/farmLevel:Math\.max\(1,Math\.min\(5/);
});

test('fishing and mines unlock better gathering results as the village grows',()=>{
  assert.match(runtime,/fishingLevel/);
  assert.match(runtime,/fish\('river'\)/);
  assert.match(runtime,/fish\('beach'\)/);
  assert.match(runtime,/rareFish/);
  assert.match(runtime,/pearl/);
  assert.match(runtime,/stoneMineLevel/);
  assert.match(runtime,/ironMineLevel/);
  assert.match(runtime,/quartz/);
  assert.match(runtime,/copper/);
  assert.match(runtime,/gold/);
});

test('3x3 crafting uses shaped recipes and unlocks semiconductors then a placeable TV',()=>{
  assert.match(runtime,/Array\(9\)\.fill\(''\)/);
  assert.match(runtime,/data-craft-cell/);
  assert.match(runtime,/function gridRecipe/);
  assert.match(runtime,/id:'semiconductor'/);
  assert.match(runtime,/minTech:2/);
  assert.match(runtime,/id:'television'/);
  assert.match(runtime,/minTech:3/);
  assert.match(runtime,/out:\{kind:'furniture',item:'television'/);
  assert.match(furnishing,/television-modern\.glb/);
  assert.match(furnishing,/기술 공방 3단계 · 3×3 제작대/);
});

test('shared seeds fund village upgrades and the lobby displays village stars',()=>{
  assert.match(runtime,/Bridge\?\.spendSeeds\?\.\(cost/);
  assert.match(runtime,/function developmentPanel/);
  assert.match(runtime,/function villageStars/);
  assert.match(integration,/function villageStars/);
  assert.match(integration,/⭐/);
});

test('advanced materials and development levels persist in the World save',()=>{
  for(const key of ['copper:0','quartz:0','gold:0','semiconductor:0','rareFish:0','pearl:0'])assert.match(storage,new RegExp(key));
  assert.match(storage,/development:\{farmLevel:1,fishingLevel:1,stoneMineLevel:1,ironMineLevel:1,techLevel:1\}/);
  assert.match(storage,/development:\{\.\.\.base\.progression\.development/);
});

test('Seed World runtime still parses after crafting and development expansion',()=>{
  const moduleSource=runtime.replace(/^import .*$/gm,'').replace(/^export /gm,'');
  const result=spawnSync(process.execPath,['--check'],{input:moduleSource,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});
