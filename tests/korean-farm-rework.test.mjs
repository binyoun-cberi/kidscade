import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFarmState,restoreFarmState,FARM_SAVE_VERSION,FARM_UPGRADES,CROPS,fieldById,
  applyFarmStrip,workEnergyCost,advanceFarmDay,fulfillDeliveryOrder,currentDeliveryOrder,
  purchaseFarmUpgrade,BASKET_CAPACITY,basketCount,loadHarvestBasket,unloadHarvestBasket,
  sellBasketProduce,fulfillBasketDeliveryOrder,setSluiceOpening,scoopCompostBatch,restUntilFarmNeedsAttention
} from '../games/korean-farm/farming/farm-sim.mjs';
import {nextFarmObjective} from '../games/korean-farm/farming/farm-objectives.mjs';
import {sampleStroke,uniqueStrokeTargets} from '../games/korean-farm/interactions/work-gesture.mjs';

test('V2 saves migrate to V4 without losing field work, money, seedlings or produce',()=>{
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
  assert.deepEqual(restored.cargo,{rice:0,carrot:0,corn:0});
});

test('V3 to V4 migration preserves open gates and full barn inventory without duplicate cargo',()=>{
  const original=createFarmState();original.inventory.rice=13;
  original.fields[0].gateOpen=true;original.fields[0].gateLevel=2;
  const older=structuredClone(original);older.version=3;delete older.cargo;
  older.fields.forEach(field=>delete field.gateLevel);
  const loaded=restoreFarmState(older);
  assert.equal(loaded.version,4);
  assert.equal(fieldById(loaded,'rice-1').gateLevel,2);
  assert.equal(loaded.inventory.rice,13);
  assert.equal(basketCount(loaded),0);
});

test('a physical harvest basket cannot sell warehouse stock remotely or overflow on trips',()=>{
  const state=createFarmState();state.inventory.rice=30;state.inventory.carrot=7;
  assert.equal(sellBasketProduce(state).ok,false);
  assert.equal(state.inventory.rice,30);
  assert.equal(loadHarvestBasket(state,'rice').amount,BASKET_CAPACITY);
  assert.equal(loadHarvestBasket(state,'carrot').ok,false);
  assert.equal(basketCount(state),20);
  const saved=restoreFarmState(structuredClone(state));
  assert.equal(saved.cargo.rice,20);
  assert.equal(saved.inventory.rice,10);
  assert.equal(sellBasketProduce(saved).ok,true);
  assert.equal(saved.money,4200+20*CROPS.rice.price);
  assert.equal(saved.inventory.rice,10);
  assert.equal(saved.cargo.rice,0);
  assert.equal(loadHarvestBasket(saved,'carrot').amount,7);
  assert.equal(unloadHarvestBasket(saved).ok,true);
  assert.equal(saved.inventory.carrot,7);
  assert.equal(basketCount(saved),0);
});

test('village deliveries consume carried crops only and preserve unsold stock',()=>{
  const state=createFarmState();state.inventory.rice=12;
  assert.equal(fulfillBasketDeliveryOrder(state).ok,false);
  loadHarvestBasket(state,'rice',7);
  assert.equal(fulfillBasketDeliveryOrder(state).ok,true);
  assert.equal(state.cargo.rice,2);
  assert.equal(state.inventory.rice,5);
  assert.equal(state.stats.deliveries,1);
});

test('water gate has three physical levels and restored saves preserve the chosen opening',()=>{
  const state=createFarmState();const f=fieldById(state,'rice-1');
  assert.equal(setSluiceOpening(state,'carrot-1',2).ok,false);
  assert.equal(setSluiceOpening(state,'rice-1',1).ok,true);
  assert.equal(f.gateOpen,true);assert.equal(f.gateLevel,1);
  assert.equal(setSluiceOpening(state,'rice-1',1).ok,false);
  const half=restoreFarmState(structuredClone(state));
  assert.equal(fieldById(half,'rice-1').gateLevel,1);
  advanceFarmDay(half);
  assert.ok(fieldById(half,'rice-1').waterDepthCm>0);
  assert.equal(setSluiceOpening(half,'rice-1',0).ok,true);
  assert.equal(fieldById(half,'rice-1').gateOpen,false);
});

test('one shovel action gathers five compost charges within energy and bag caps',()=>{
  const state=createFarmState();
  assert.equal(scoopCompostBatch(state).amount,5);
  assert.equal(state.inventory.fertilizer,5);
  assert.equal(state.compostStock,19);
  state.energy=2;
  assert.equal(scoopCompostBatch(state).amount,2);
  assert.equal(scoopCompostBatch(state).ok,false);
});

test('rest until attention stops after a care need or growth change, never skipping more than 4 days',()=>{
  const state=createFarmState();
  const report=restUntilFarmNeedsAttention(state);
  assert.ok(report.daysPassed>=1&&report.daysPassed<=4);
  assert.equal(state.day,report.newDay);
  const old=state.day;
  const next=restUntilFarmNeedsAttention(state,99);
  assert.ok(state.day-old>=1&&state.day-old<=4);
  assert.equal(next.previousDay,old);
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
  state.stats.harvests=1;assert.equal(nextFarmObjective(state).kind,'barn');
  state.cargo.rice=3;assert.equal(nextFarmObjective(state).kind,'market');
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
