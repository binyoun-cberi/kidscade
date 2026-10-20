import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFarmState,restoreFarmState,FARM_SAVE_VERSION,FARM_UPGRADES,CROPS,fieldById,
  applyFarmStrip,workEnergyCost,advanceFarmDay,fulfillDeliveryOrder,currentDeliveryOrder,
  purchaseFarmUpgrade,BASKET_CAPACITY,basketCount,loadHarvestBasket,unloadHarvestBasket,
  sellBasketProduce,fulfillBasketDeliveryOrder,setSluiceOpening,scoopCompostBatch,restUntilFarmNeedsAttention,
  CART_CAPACITY,cargoCapacity,toggleFarmCart,seasonalFestival,fulfillSeasonalFestival,
  tomorrowForecast,weatherForDay,calendar
} from '../games/korean-farm/farming/farm-sim.mjs';
import {greetNeighbor,neighborAdvice} from '../games/korean-farm/farming/village-people.mjs';
import {nextFarmObjective} from '../games/korean-farm/farming/farm-objectives.mjs';
import {sampleStroke,uniqueStrokeTargets} from '../games/korean-farm/interactions/work-gesture.mjs';

test('V2 saves migrate to V6 without losing field work, money, seedlings or produce',()=>{
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
  assert.deepEqual(restored.upgrades,{sickle:false,hoe:false,channel:false,cart:false});
  assert.deepEqual(restored.cargo,{rice:0,carrot:0,corn:0});
  assert.equal(restored.transport.cartAttached,false);
});

test('V3 to V6 migration preserves open gates and full barn inventory without duplicate cargo',()=>{
  const original=createFarmState();original.inventory.rice=13;
  original.fields[0].gateOpen=true;original.fields[0].gateLevel=2;
  const older=structuredClone(original);older.version=3;delete older.cargo;
  older.fields.forEach(field=>delete field.gateLevel);
  const loaded=restoreFarmState(older);
  assert.equal(loaded.version,FARM_SAVE_VERSION);
  assert.equal(fieldById(loaded,'rice-1').gateLevel,2);
  assert.equal(loaded.inventory.rice,13);
  assert.equal(basketCount(loaded),0);
});

test('V4 save migrates carried basket without inventing a cart or duplicating produce',()=>{
  const s=createFarmState();s.inventory.rice=28;loadHarvestBasket(s,'rice',17);
  const legacy=structuredClone(s);legacy.version=4;delete legacy.transport;delete legacy.village;
  delete legacy.upgrades.cart;
  const restored=restoreFarmState(legacy);
  assert.equal(restored.version,FARM_SAVE_VERSION);
  assert.equal(restored.inventory.rice,11);
  assert.equal(restored.cargo.rice,17);
  assert.equal(cargoCapacity(restored),20);
  assert.equal(restored.upgrades.cart,false);
});

test('V5 saves keep a purchased handcart and villager friendship during festival migration',()=>{
  const state=createFarmState();state.day=40;state.upgrades.cart=true;
  state.transport.cartAttached=true;state.cargo.rice=35;
  state.village={lastTalkDay:39,friendship:4,giftReceived:true};
  const legacy=structuredClone(state);legacy.version=5;delete legacy.festival;delete legacy.stats.festivals;
  const restored=restoreFarmState(legacy);
  assert.equal(restored.version,FARM_SAVE_VERSION);
  assert.equal(restored.transport.cartAttached,true);
  assert.equal(restored.cargo.rice,35);
  assert.equal(restored.village.friendship,4);
  assert.equal(restored.festival.completedKey,'');
  assert.equal(restored.stats.festivals,0);
});

test('all four seasonal gatherings have seven-day windows and distinct materials',()=>{
  const state=createFarmState();
  for(const [day,season,produce] of [[7,'봄','carrot'],[21,'여름','corn'],[35,'가을','rice'],[49,'겨울','carrot']]){
    state.day=day;
    const open=seasonalFestival(state);
    assert.equal(open.season,season);
    assert.equal(open.produce,produce);
    assert.equal(open.open,true);
    assert.equal(open.daysLeft,7);
    state.day=day+6;assert.equal(seasonalFestival(state).open,true);
    state.day=day+7;assert.equal(seasonalFestival(state).open,false);
  }
  state.day=63;assert.equal(seasonalFestival(state).key,'2:봄');
});

test('a gathering requires physical cargo, pays once, grants seeds and survives reload',()=>{
  const state=createFarmState();
  assert.equal(fulfillSeasonalFestival(state).ok,false,'not open yet');
  state.day=7;
  assert.equal(fulfillSeasonalFestival(state).ok,false,'empty basket');
  state.inventory.carrot=10;loadHarvestBasket(state,'carrot',5);
  const initial={money:state.money,seeds:state.inventory.seedRice,inventory:state.inventory.carrot};
  const first=fulfillSeasonalFestival(state);
  assert.equal(first.ok,true);
  assert.equal(state.cargo.carrot,2);
  assert.equal(state.inventory.carrot,initial.inventory);
  assert.equal(state.money,initial.money+first.reward);
  assert.equal(state.inventory.seedRice,initial.seeds+first.seedCount);
  assert.equal(state.stats.festivals,1);
  assert.equal(fulfillSeasonalFestival(state).ok,false,'no infinite pay');
  const reload=restoreFarmState(structuredClone(state));
  assert.equal(seasonalFestival(reload).completed,true);
  assert.equal(fulfillSeasonalFestival(reload).ok,false);
  reload.day=21;
  assert.equal(seasonalFestival(reload).completed,false);
  assert.equal(fulfillSeasonalFestival(reload).ok,false,'summer asks for corn');
});

test('weather forecast matches deterministic next day and rest stops at a festival opening',()=>{
  const state=createFarmState();
  for(const day of [1,2,10,35,55,100]){
    state.day=day;
    assert.equal(tomorrowForecast(state).weather,weatherForDay(day+1));
    assert.equal(tomorrowForecast(state).season,calendar(day+1).season);
  }
  state.day=6;
  const report=restUntilFarmNeedsAttention(state,4);
  assert.equal(report.newDay,7);
  assert.equal(report.festival?.type,'opens');
});

test('handcart must be purchased, keeps cargo conserved through loading, saving and unloading',()=>{
  const s=createFarmState();s.inventory.rice=93;
  assert.equal(toggleFarmCart(s).ok,false);
  s.stats.sales=1;
  assert.equal(purchaseFarmUpgrade(s,'cart').ok,true);
  assert.equal(toggleFarmCart(s).attached,true);
  assert.equal(cargoCapacity(s),CART_CAPACITY);
  assert.equal(loadHarvestBasket(s,'rice').amount,CART_CAPACITY);
  assert.equal(s.inventory.rice,33);
  assert.equal(toggleFarmCart(s).ok,false,'loaded cart cannot disappear');
  assert.equal(loadHarvestBasket(s,'rice').ok,false,'cart refuses overflow');
  const reload=restoreFarmState(structuredClone(s));
  assert.equal(reload.transport.cartAttached,true);
  assert.equal(reload.cargo.rice,60);
  assert.equal(unloadHarvestBasket(reload).ok,true);
  assert.equal(reload.inventory.rice,93);
  assert.equal(basketCount(reload),0);
  assert.equal(toggleFarmCart(reload).attached,false);
  assert.equal(cargoCapacity(reload),BASKET_CAPACITY);
});

test('malformed imported cart state returns over-limit stock safely to the shed',()=>{
  const s=createFarmState();
  s.upgrades.cart=true;s.transport.cartAttached=true;
  s.cargo.rice=60;s.cargo.carrot=52;s.cargo.corn=45;
  const result=restoreFarmState(structuredClone(s));
  assert.equal(basketCount(result),60);
  assert.equal(result.inventory.carrot,52);
  assert.equal(result.inventory.corn,45);
  assert.equal(result.inventory.rice+result.cargo.rice,60);
  s.upgrades.cart=false;
  const invalid=restoreFarmState(structuredClone(s));
  assert.equal(invalid.transport.cartAttached,false);
  assert.equal(basketCount(invalid),20);
});

test('neighbor remembers one greeting a day and gives exactly one friendship gift',()=>{
  const s=createFarmState();
  const start=s.inventory.seedCarrot;
  assert.match(neighborAdvice(s),/봄|논밭/);
  const first=greetNeighbor(s);assert.equal(first.friendship,1);
  assert.equal(greetNeighbor(s).friendship,1);
  advanceFarmDay(s);assert.equal(greetNeighbor(s).friendship,2);
  advanceFarmDay(s);const third=greetNeighbor(s);
  assert.equal(third.friendship,3);assert.equal(third.gift,2);
  assert.equal(s.inventory.seedCarrot,start+2);
  const reloaded=restoreFarmState(structuredClone(s));
  assert.equal(greetNeighbor(reloaded).gift,0);
  advanceFarmDay(reloaded);
  assert.equal(greetNeighbor(reloaded).gift,0);
  assert.equal(reloaded.village.friendship,4);
  assert.equal(reloaded.inventory.seedCarrot,start+2);
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
