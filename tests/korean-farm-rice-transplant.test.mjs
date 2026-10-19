import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFarmState,restoreFarmState,applyFarmAction} from '../games/korean-farm/farming/farm-sim.mjs';
import {TRANSPLANT_COUNT,emptySeedlings,fullSeedlings,seedlingCount,nextEmptySeedling,
  seedlingPosition,seedlingAtPoint,canPlantSeedling,plantSeedling} from '../games/korean-farm/farming/rice-transplant.mjs';
import {FIELD_DEFS} from '../games/korean-farm/world.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('the first paddy is a playable empty transplanting area on a new farm',()=>{
  const s=createFarmState();
  const first=s.fields.find(x=>x.id==='rice-1');
  assert.equal(first.planted,false);
  assert.equal(first.tilled,true);
  assert.deepEqual(first.transplants,emptySeedlings());
  for(const id of ['rice-2','rice-3','rice-4']){
    const f=s.fields.find(x=>x.id===id);
    assert.equal(f.planted,true);
    assert.deepEqual(f.transplants,fullSeedlings());
  }
  assert.equal(TRANSPLANT_COUNT,25);
});
test('planting a single spot only changes that spot; bundle charges once',()=>{
  const s=createFarmState();
  const stock=s.inventory.seedRice;
  const energy=s.energy;
  const field=s.fields.find(x=>x.id==='rice-1');
  const first=plantSeedling(s,field.id,12);
  assert.equal(first.ok,true);
  assert.equal(first.complete,false);
  assert.equal(first.count,1);
  assert.equal(s.inventory.seedRice,stock-1);
  assert.equal(s.energy,energy-1);
  assert.equal(field.planted,false);
  assert.equal(field.transplants[12],true);
  assert.equal(field.transplants.filter(Boolean).length,1);
  assert.equal(plantSeedling(s,field.id,12).ok,false,'no double planting');
  const next=plantSeedling(s,field.id,13);
  assert.equal(next.count,2);
  assert.equal(s.inventory.seedRice,stock-1,'one starter bundle covers all cells');
  assert.equal(nextEmptySeedling(field,12),0);
});
test('complete rice patch transitions to growing paddy on the last contact',()=>{
  const s=createFarmState();
  const f=s.fields.find(x=>x.id==='rice-1');
  for(let i=0;i<24;i++){
    const r=plantSeedling(s,f.id,i);
    assert.equal(r.complete,false);
    assert.equal(f.planted,false);
    assert.equal(f.growth,0);
  }
  const last=plantSeedling(s,f.id,24);
  assert.equal(last.count,25);
  assert.equal(last.complete,true);
  assert.equal(f.planted,true);
  assert.equal(f.growth,.025);
  assert.equal(nextEmptySeedling(f),-1);
  assert.equal(s.inventory.seedRice,7);
  assert.equal(s.energy,75);
});
test('empty bundle, empty stamina and untended ground reject planting without mutating state',()=>{
  const s=createFarmState();
  s.inventory.seedRice=0;
  const before=JSON.stringify(s);
  assert.equal(canPlantSeedling(s,'rice-1',0).ok,false);
  assert.equal(JSON.stringify(s),before);
  s.inventory.seedRice=1;
  s.energy=0;
  assert.equal(canPlantSeedling(s,'rice-1',0).ok,false);
  s.energy=99;
  s.fields[0].tilled=false;
  assert.equal(canPlantSeedling(s,'rice-1',0).ok,false);
  assert.equal(canPlantSeedling(s,'rice-1',99).ok,false);
});
test('save and reload preserves 25 individual slots without changing old saved fields',()=>{
  const s=createFarmState();
  plantSeedling(s,'rice-1',0);
  plantSeedling(s,'rice-1',9);
  plantSeedling(s,'rice-1',20);
  const restored=restoreFarmState(JSON.parse(JSON.stringify(s)));
  const f=restored.fields.find(x=>x.id==='rice-1');
  assert.deepEqual(f.transplants,s.fields[0].transplants);
  assert.equal(seedlingCount(f),3);
  assert.equal(f.planted,false);
  assert.equal(restored.inventory.seedRice,7);
  const old=createFarmState();
  for(const f of old.fields)delete f.transplants;
  const oldRestore=restoreFarmState(old);
  assert.deepEqual(oldRestore.fields.find(x=>x.id==='rice-4').transplants,fullSeedlings());
});
test('rice harvest clears old seedlings before the next 25-slot planting',()=>{
  const s=createFarmState();
  const crop=s.fields.find(x=>x.id==='rice-4');
  assert.equal(crop.growth,1);
  assert.equal(applyFarmAction(s,crop.id,'harvest').ok,true);
  assert.deepEqual(crop.transplants,emptySeedlings());
  assert.equal(crop.planted,false);
  assert.equal(applyFarmAction(s,crop.id,'till').ok,true);
  assert.equal(plantSeedling(s,crop.id,4).ok,true);
  assert.equal(seedlingCount(crop),1);
});
test('five by five seedling positions are ordered and map back from ground coordinates',()=>{
  const plot=FIELD_DEFS.find(f=>f.id==='rice-1');
  for(let i=0;i<25;i++){
    const point=seedlingPosition(plot,i);
    assert.equal(seedlingAtPoint(plot,point),i);
    assert.ok(Math.abs(point.x-plot.x)<=plot.w/2);
    assert.ok(Math.abs(point.z-plot.z)<=plot.d/2);
  }
  assert.equal(seedlingPosition(plot,25),null);
  assert.equal(seedlingAtPoint(plot,{x:100,z:100}),-1);
});
test('game UI transplants by clicking empty field spots and saves at tool contact',()=>{
  const game=fs.readFileSync(path.join(root,'games/korean-farm/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'games/korean-farm/index.html'),'utf8');
  const scene=fs.readFileSync(path.join(root,'games/korean-farm/rendering/rice-planting-grid.js'),'utf8');
  for(const tag of ['plantingHud','seedlingProgress','exitPlanting'])assert.match(html,new RegExp('id="'+tag+'"'));
  for(const tag of ['seedlingGrid','plantOne'])assert.doesNotMatch(html,new RegExp('id="'+tag+'"'));
  assert.match(game,/fieldEffects\?\.emit\(event\.action/);
  assert.match(game,/plantSeedling\(state,plot\.id,event\.cellIndex\)/);
  assert.match(game,/runSeedlingPlant\(cell\.userData\.cellIndex\)/);
  assert.match(scene,/RingGeometry/);
  assert.match(scene,/availableToPlant/);
  assert.match(scene,/targets\[i\]\.visible=true/);
});
