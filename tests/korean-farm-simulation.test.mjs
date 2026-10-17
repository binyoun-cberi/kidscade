import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FARM_SAVE_VERSION,createFarmState,restoreFarmState,fieldById,visualStage,
  applyFarmAction,advanceFarmDay,sellAllProduce,buyFarmSupply,calendar,
  weatherForDay,CROPS
} from '../games/korean-farm/farming/farm-sim.mjs';
import {plantSeedling,seedlingCount} from '../games/korean-farm/farming/rice-transplant.mjs';

test('farm v2 initializes a 25-slot practice paddy, ripe crop and stable calendar',()=>{
  const state=createFarmState();
  assert.equal(state.version,FARM_SAVE_VERSION);
  assert.equal(state.fields.length,6);
  assert.equal(state.money,4200);
  assert.equal(fieldById(state,'rice-4').growth,1);
  assert.equal(visualStage(fieldById(state,'rice-1')),0);
  assert.equal(seedlingCount(fieldById(state,'rice-1')),0);
  assert.equal(calendar(1).season,'봄');
  assert.equal(calendar(15).season,'여름');
  assert.equal(calendar(57).year,2);
  assert.equal(weatherForDay(1),'sunny');
  assert.equal(weatherForDay(9),weatherForDay(9));
});
test('complete farming loop: harvest, prepare soil, plant, grow, and sell',()=>{
  const state=createFarmState();
  const failed=applyFarmAction(state,'rice-1','harvest');
  assert.equal(failed.ok,false);
  const before=state.inventory.rice;
  const harvested=applyFarmAction(state,'rice-4','harvest');
  assert.equal(harvested.ok,true);
  assert.ok(state.inventory.rice>before);
  assert.equal(fieldById(state,'rice-4').planted,false);
  assert.equal(applyFarmAction(state,'rice-4','plant').ok,false);
  assert.equal(applyFarmAction(state,'rice-4','till').ok,true);
  for(let slot=0;slot<25;slot++)assert.equal(plantSeedling(state,'rice-4',slot).ok,true);
  assert.equal(fieldById(state,'rice-4').planted,true);
  assert.equal(state.inventory.seedRice,7);
  for(let i=0;i<24;i++)advanceFarmDay(state);
  assert.equal(state.day,25);
  assert.ok(fieldById(state,'rice-4').growth>0);
  const earned=state.inventory.rice*CROPS.rice.price;
  const startMoney=state.money;
  assert.equal(sellAllProduce(state).ok,true);
  assert.equal(state.money,startMoney+earned);
  assert.equal(state.inventory.rice,0);
  assert.equal(sellAllProduce(state).ok,false);
});
test('paddy gate works and ordinary vegetable beds cannot use it',()=>{
  const state=createFarmState(),rice=fieldById(state,'rice-1');
  const before=rice.waterDepthCm;
  assert.equal(applyFarmAction(state,'rice-1','gate').ok,true);
  assert.equal(rice.gateOpen,true);
  assert.ok(rice.waterDepthCm>before);
  assert.equal(applyFarmAction(state,'carrot-1','gate').ok,false);
  const morning=rice.waterDepthCm;
  advanceFarmDay(state);
  assert.ok(rice.waterDepthCm>morning);
  assert.ok(rice.waterDepthCm<=10);
});
test('field care consumes energy and fertilizer but never creates negative stock',()=>{
  const state=createFarmState(),energy=state.energy;
  const f=fieldById(state,'carrot-1');
  f.moisture=.1;f.weeds=.8;
  assert.equal(applyFarmAction(state,f.id,'water').ok,true);
  assert.ok(f.moisture>.1);
  assert.equal(applyFarmAction(state,f.id,'weed').ok,true);
  assert.ok(f.weeds<.8);
  assert.equal(applyFarmAction(state,f.id,'fertilize').ok,true);
  assert.equal(state.inventory.fertilizer,4);
  assert.ok(state.energy<energy);
  state.energy=0;
  assert.equal(applyFarmAction(state,f.id,'weed').ok,false);
});
test('supplies can be bought and validated against balance',()=>{
  const state=createFarmState();
  assert.equal(buyFarmSupply(state,'seedCarrot',2).ok,true);
  assert.equal(state.inventory.seedCarrot,10);
  assert.equal(state.money,4080);
  assert.equal(buyFarmSupply(state,'fake',2).ok,false);
  assert.equal(buyFarmSupply(state,'seedRice',-1).ok,false);
  state.money=0;
  assert.equal(buyFarmSupply(state,'fertilizer',1).ok,false);
});
test('save roundtrip persists farm, stock, water, and season across reload',()=>{
  const state=createFarmState();
  applyFarmAction(state,'rice-1','gate');
  applyFarmAction(state,'rice-4','harvest');
  advanceFarmDay(state);
  state.player={x:7,z:2};state.seenPlots=['rice-1'];state.visits=1;
  const next=restoreFarmState(JSON.parse(JSON.stringify(state)));
  assert.equal(next.version,2);
  assert.equal(next.fields.length,6);
  assert.equal(next.day,2);
  assert.equal(next.fields[0].gateOpen,true);
  assert.equal(next.fields[3].planted,false);
  assert.ok(next.inventory.rice>0);
  assert.equal(next.player.x,7);
  assert.deepEqual(next.seenPlots,['rice-1']);
});
test('prototype v1 saves migrate without resetting coordinates or rice stage',()=>{
  const old={version:1,plots:[{id:'rice-1',stage:4}],player:{x:3,z:2},
    camera:{zoom:30,angle:.8},selected:'rice-1',seenPlots:['rice-2']};
  const state=restoreFarmState(old);
  assert.equal(state.version,2);
  assert.equal(state.player.x,3);
  assert.equal(state.camera.zoom,30);
  assert.equal(state.fields[0].growth,1);
  assert.equal(state.fields[0].planted,true);
  assert.equal(seedlingCount(state.fields[0]),25);
  assert.deepEqual(state.seenPlots,['rice-2']);
});
test('corrupt values cannot escape simulation limits',()=>{
  const corrupted={version:2,fields:[{id:'rice-1',planted:true,growth:99,
    waterDepthCm:NaN,health:-99,nitrogen:Infinity,moisture:.3,weeds:9}],
    inventory:{seedRice:-12,rice:NaN},money:Infinity,day:-100,energy:-5};
  const state=restoreFarmState(corrupted);
  assert.equal(state.day,1);
  assert.equal(state.energy,0);
  assert.equal(state.fields[0].growth,1);
  assert.ok(state.fields[0].waterDepthCm>=0);
  assert.equal(state.fields[0].health,0);
  assert.equal(state.fields[0].weeds,1);
  assert.equal(state.inventory.seedRice,0);
  assert.equal(state.inventory.rice,0);
  assert.equal(state.money,4200);
});
