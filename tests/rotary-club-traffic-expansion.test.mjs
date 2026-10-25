import test from 'node:test';
import assert from 'node:assert/strict';
import {RoadWeaver,TOWN_TYPES,getDemandRate,isWeekend} from '../games/high_road_weaver/sim-core.mjs';

test('seven regions have distinct destinations and weekend clock patterns',()=>{
  assert.deepEqual(TOWN_TYPES.map(t=>t.id),['home','office','factory','mall','farm','tourism','market']);
  assert.equal(isWeekend(1),false);
  assert.equal(isWeekend(6),true);
  assert.equal(isWeekend(7),true);
  assert.equal(isWeekend(8),false);
  assert.ok(getDemandRate('farm','market',6,1)>getDemandRate('farm','market',15,1)*3,'farm delivery is not early');
  assert.ok(getDemandRate('home','tourism',11,6)>getDemandRate('home','tourism',11,2)*3,'weekend tourists missing');
  assert.ok(getDemandRate('home','market',18,2)>getDemandRate('home','market',3,2)*5,'after-work shopping missing');
  assert.ok(getDemandRate('home','office',8,1)>getDemandRate('home','office',8,6)*3,'weekend office trip not reduced');
});

test('cars can safely move around a slow leader on a wider road',()=>{
  const sim=new RoadWeaver();
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],4).ok);
  assert.ok(sim.spawn('home','office'));
  const first=sim.cars[0],follower={...first,id:'other',s:125,lane:0,laneVisual:0,laneCooldown:0};
  first.s=170;first.lane=0;first.laneVisual=0;
  sim.cars.push(follower);
  sim.changeLane(follower,1/30);
  assert.equal(follower.lane,1);
  assert.ok(follower.laneCooldown>0);
  assert.ok(follower.laneVisual>0&&follower.laneVisual<1);
});

test('cars cannot enter occupied side lanes, including from behind',()=>{
  const sim=new RoadWeaver();
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],4).ok);
  assert.ok(sim.spawn('home','office'));
  const original=sim.cars[0];original.s=170;original.lane=0;
  const follower={...original,id:'follower',s:125,lane:0,laneVisual:0,laneCooldown:0};
  const adjacent={...original,id:'side',s:107,lane:1,laneVisual:1,laneCooldown:0};
  sim.cars.push(follower,adjacent);
  sim.changeLane(follower,1/30);
  assert.equal(follower.lane,0,'cut into side lane while another car approaches');
});

test('cars prepare safely before a 4-lane road narrows to 2 lanes',()=>{
  const sim=new RoadWeaver();sim.budget=1000;
  assert.ok(sim.addRoad([{x:164,y:378},{x:530,y:366}],4).ok);
  assert.ok(sim.addRoad([{x:530,y:366},{x:915,y:354}],2).ok);
  const route=sim.route(TOWN_TYPES[0],TOWN_TYPES[1]);assert.equal(route.length,2);
  const car={id:'c-test',from:'home',to:'office',path:route,step:0,edge:route[0].edge,dir:1,
    s:route[0].edge.length-50,lane:1,laneVisual:1,laneCooldown:0,speed:40,maxSpeed:48,kind:'car'};
  sim.cars=[car];
  assert.equal(sim.canGo(car),false,'a two-lane exit accepted an invalid lane');
  sim.changeLane(car,1/30);
  assert.equal(car.lane,0);
  assert.ok(sim.canGo(car),'a safe merge should enter the next edge');
});

test('farm, tourism and hypermarket unlock after a functioning road network',()=>{
  const sim=new RoadWeaver();sim.budget=5000;
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],2).ok);
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[2]],2).ok);
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[3]],2).ok);
  sim.openTowns=4;sim.day=4;sim.delivered=175;
  for(let i=0;i<70;i++)sim.update(1/30);
  assert.equal(sim.openTowns,5,'the farm must appear');
  // Expansion must wait for the farm's real connection, not just completed calendar days.
  sim.day=5;sim.delivered=260;
  for(let i=0;i<70;i++)sim.update(1/30);
  assert.equal(sim.openTowns,5,'the disconnected farm should block the next expansion');
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[4]],2).ok);
  for(let i=0;i<70;i++)sim.update(1/30);
  assert.equal(sim.openTowns,6,'the tourism district must appear after connecting the farm');
  sim.day=6;sim.delivered=400;
  for(let i=0;i<70;i++)sim.update(1/30);
  assert.equal(sim.openTowns,6,'the disconnected tourism region should block the supermarket');
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[5]],2).ok);
  for(let i=0;i<70;i++)sim.update(1/30);
  assert.equal(sim.openTowns,7);
  assert.ok(sim.towns.some(t=>t.type==='대형마트'));
});

test('older saves restore, while v2 saves preserve all seven open regions',()=>{
  const sim=new RoadWeaver();
  sim.openTowns=7;
  const data=sim.snapshot();
  const copied=new RoadWeaver();
  assert.equal(copied.restore(data),true);
  assert.equal(copied.openTowns,7);
  const old={...data,version:1,openTowns:4};
  const migrated=new RoadWeaver();
  assert.equal(migrated.restore(old),true);
  assert.equal(migrated.openTowns,4);
});
