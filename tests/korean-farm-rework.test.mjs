import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFarmState,restoreFarmState,FARM_SAVE_VERSION,FARM_UPGRADES,fieldById,
  applyFarmStrip,workEnergyCost,advanceFarmDay,fulfillDeliveryOrder,currentDeliveryOrder,
  purchaseFarmUpgrade
} from '../games/korean-farm/farming/farm-sim.mjs';
import {nextFarmObjective} from '../games/korean-farm/farming/farm-objectives.mjs';
import {sampleStroke,uniqueStrokeTargets} from '../games/korean-farm/interactions/work-gesture.mjs';

test('V2 saves migrate to V3 without losing field work, money, seedlings or produce',()=>{
  const original=createFarmState();
  original.money=5771;original.inventory.rice=9;original.fields[0].transplants[5]=true;
  original.fields[3].work.harvested[0]=true;original.day=8;
  const legacy=JSON.parse(JSON.stringify(original));
  legacy.version=2;delete legacy.upgrades;delete legacy.market;
  const restored=restoreFarmState(legacy);
  assert.equal(restored.version,FARM_SAVE_VERSION);
  assert.equal(restored.money,5771);
  assert.equal(restored.inventory.rice,9);
  assert.equal(restored.day,8);
  assert.equal(restored.fields[0].transplants[5],true);
  assert.equal(restored.fields[3].work.harvested[0],true);
  assert.deepEqual(restored.upgrades,{sickle:false,hoe:false,channel:false});
});

test('first sale unlocks meaningful upgrades that persist and affect farming',()=>{
  const state=createFarmState();
  assert.equal(purchaseFarmUpgrade(state,'sickle').ok,false);
  state.stats.sales=1;
  const money=state.money;
  assert.equal(purchaseFarmUpgrade(state,'sickle').ok,true);
  assert.equal(state.money,money-FARM_UPGRADES.sickle.price);
  assert.equal(workEnergyCost(state,'harvest'),1);
  assert.equal(purchaseFarmUpgrade(state,'sickle').ok,false);
  const restored=restoreFarmState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.upgrades.sickle,true);
  assert.equal(workEnergyCost(restored,'harvest'),1);
  const ripe=fieldById(restored,'rice-4');
  const before=restored.inventory.rice;
  for(let i=0;i<5;i++)assert.equal(applyFarmStrip(restored,ripe.id,'harvest',i).ok,true);
  assert.ok(restored.inventory.rice-before>=2);
});

test('channel upgrade slows daily drainage without freezing weather simulation',()=>{
  const normal=createFarmState(),upgraded=createFarmState();
  upgraded.stats.sales=1;
  purchaseFarmUpgrade(upgraded,'channel');
  advanceFarmDay(normal);advanceFarmDay(upgraded);
  assert.ok(fieldById(upgraded,'rice-1').waterDepthCm>fieldById(normal,'rice-1').waterDepthCm);
});

test('village repeats one stable request per new day after introductory deliveries',()=>{
  const state=createFarmState();
  for(let i=0;i<3;i++){
    const order=currentDeliveryOrder(state);
    state.inventory[order.produce]=order.count;
    assert.equal(fulfillDeliveryOrder(state).ok,true);
  }
  assert.equal(currentDeliveryOrder(state),null);
  advanceFarmDay(state);
  const repeat=currentDeliveryOrder(state);
  assert.ok(repeat);
  assert.equal(currentDeliveryOrder(state),repeat);
  state.inventory[repeat.produce]=repeat.count;
  assert.equal(fulfillDeliveryOrder(state).ok,true);
  assert.equal(currentDeliveryOrder(state),null);
  const restored=restoreFarmState(JSON.parse(JSON.stringify(state)));
  assert.equal(currentDeliveryOrder(restored),null);
  advanceFarmDay(restored);
  assert.ok(currentDeliveryOrder(restored));
});

test('first-play guidance advances into a contextual daily task after an upgrade',()=>{
  const state=createFarmState();
  assert.equal(nextFarmObjective(state).kind,'field');
  state.seenPlots=['rice-1'];assert.equal(nextFarmObjective(state).target,'rice-4');
  state.stats.harvests=1;assert.equal(nextFarmObjective(state).kind,'market');
  state.stats.sales=1;assert.match(nextFarmObjective(state).title,/농기구/);
  state.upgrades.sickle=true;
  assert.equal(nextFarmObjective(state).intro,undefined);
  assert.ok(nextFarmObjective(state).description);
});

test('drag interpolation visits short strips and avoids double tool activation',()=>{
  const pixels=sampleStroke([{x:0,y:0},{x:0,y:92}],18);
  assert.ok(pixels.length>=6);
  assert.deepEqual(uniqueStrokeTargets([0,1,1,4,4,-1,2]),[0,1,4,2]);
  assert.ok(sampleStroke([{x:0,y:0},{x:10000,y:0}]).length<=160);
});
