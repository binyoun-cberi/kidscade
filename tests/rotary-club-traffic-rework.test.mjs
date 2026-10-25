import test from 'node:test';
import assert from 'node:assert/strict';
import {RoadWeaver,TOWN_TYPES,getDemandRate} from '../games/high_road_weaver/sim-core.mjs';

const [home,office]=TOWN_TYPES;
function commute(type='direct',lanes=2){
  const sim=new RoadWeaver();sim.budget=3000;sim.minutes=0;sim.growthClock=-1e8;
  assert.ok(sim.addRoad([home,office],lanes).ok);
  if(type!=='direct'){
    assert.ok(sim.addRoad([{x:530,y:120},{x:530,y:610}],2).ok);
    if(type==='signal')assert.ok(sim.toggleLight({x:530,y:366}).ok);
  }
  return sim;
}
test('empty perpendicular road does not halve an unrelated commute',()=>{
  const results=['direct','cross','signal'].map(type=>{
    const s=commute(type);for(let i=0;i<2400;i++)s.update(.1);return s.delivered;
  });
  assert.ok(results[1]>=results[0]*.93,JSON.stringify(results));
  assert.ok(results[2]>=results[0]*.93,JSON.stringify(results));
});
test('initial materials suffice for a six-lane first road',()=>{
  const s=new RoadWeaver();
  assert.ok(s.addRoad([home,office],6).ok);
  assert.ok(s.budget>=0);
});
test('tractor travels slower than a car along the same road',()=>{
  const s=commute();
  const edge=s.edges[0],mk=(kind)=>({
    id:'c1',kind,edge,dir:1,lane:0,laneVisual:0,laneCooldown:0,s:50,
    speed:35,maxSpeed:56,step:0,path:[{edge,dir:1}],from:'home',to:'office'
  });
  const travel=kind=>{const car=mk(kind);s.cars=[car];for(let i=0;i<15;i++)s.advance(.1);return car.s};
  assert.ok(travel('tractor')<travel('car')-10);
});
test('no delivery, no free materials from endlessly skipping days',()=>{
  const s=new RoadWeaver(),before=s.budget;
  for(let i=0;i<4800;i++)s.update(.1);
  assert.equal(s.delivered,0);
  assert.equal(s.budget,before);
});
test('v3 save restores moving cars, their positions and subsequent arrivals',()=>{
  const s=commute('cross',4);
  for(let i=0;i<750;i++)s.update(1/30);
  assert.ok(s.cars.length>5);
  const snap=s.snapshot(),restored=new RoadWeaver();
  assert.equal(snap.version,3);assert.ok(snap.cars.length>0);
  assert.ok(restored.restore(snap));
  assert.equal(restored.cars.length,s.cars.length);
  for(const car of s.cars.slice(0,6)){
    const copy=restored.cars.find(c=>c.id===car.id);
    assert.ok(copy);
    assert.equal(copy.s,car.s);assert.equal(copy.speed,car.speed);
    assert.equal(copy.edge.id,car.edge.id);
    assert.ok(Math.hypot(restored.sampleCar(copy).x-s.sampleCar(car).x,
      restored.sampleCar(copy).y-s.sampleCar(car).y)<.01);
  }
  for(let i=0;i<1250;i++)restored.update(1/30);
  assert.ok(restored.delivered>snap.delivered);
});
test('v3 saves retain vehicle routes from an edited road graph',()=>{
  const s=commute();
  assert.ok(s.spawn('home','office'));
  for(let i=0;i<50;i++)s.update(1/30);
  const oldCar=s.cars[0],before=oldCar.s;
  assert.ok(s.addRoad([{x:530,y:120},{x:530,y:610}],2).ok);
  assert.ok(s.oldRoads.length>0);
  const snap=s.snapshot(),copy=new RoadWeaver();
  assert.ok(copy.restore(snap));
  assert.equal(copy.cars.length,s.cars.length);
  assert.ok(copy.oldRoads.length>0);
  assert.equal(copy.cars.find(c=>c.id===oldCar.id).s,before);
  for(let i=0;i<1000;i++)copy.advance(1/30);
  assert.ok(copy.delivered>=1);
  assert.equal(copy.oldRoads.length,0);
});
test('old version 1 and 2 saves remain readable, even if they lack cars',()=>{
  const s=commute();
  const current=s.snapshot();
  for(const version of [1,2]){
    const old={...current,version};delete old.cars;delete old.edgePool;
    const copy=new RoadWeaver();
    assert.ok(copy.restore(old));
    assert.ok(copy.route(home,office));
  }
});
test('drawing preview marks new at-grade intersections but ignores an overpass',()=>{
  const s=commute();
  const candidate=[{x:530,y:150},{x:530,y:600}];
  const ground=s.previewCrossings(candidate,'ground');
  assert.equal(ground.length,1);
  assert.ok(Math.hypot(ground[0].x-530,ground[0].y-366)<5);
  assert.equal(s.previewCrossings(candidate,'bridge').length,0);
});
test('weekday tourist difference remains but weekend peak is less extreme',()=>{
  const weekday=getDemandRate('home','tourism',11,1);
  const saturday=getDemandRate('home','tourism',11,6);
  assert.ok(saturday>weekday*3&&saturday<weekday*4);
});

test('city hub supports sustained seven-town traffic without a universal junction lock',()=>{
  const sim=new RoadWeaver();sim.budget=10000;sim.openTowns=7;
  sim.day=1;sim.minutes=0;sim.growthClock=-1e8;
  for(const town of TOWN_TYPES.slice(1))assert.ok(sim.addRoad([home,town],4).ok);
  for(let i=0;i<1200;i++)sim.update(.1);
  assert.ok(sim.delivered>=400,'city hub throttled by overlong reservations');
  assert.ok(sim.waiting<50,'unnecessary queue accumulated at city hub');
});


test('roundabout with many connecting streets widens its circulation rather than choking the hub',()=>{
  const sim=new RoadWeaver();sim.budget=10000;sim.openTowns=7;
  const center={x:535,y:366};
  assert.equal(sim.addRoad([TOWN_TYPES[0],center],4).ok,true);
  for(const town of TOWN_TYPES.slice(1))assert.equal(sim.addRoad([center,town],4).ok,true);
  const built=sim.addRoundabout(center);
  assert.equal(built.ok,true);
  assert.equal(built.lanes,4);
  assert.equal(built.cost,95);
  assert.ok(sim.edges.filter(e=>e.kind==='roundabout').every(e=>e.lanes===4));
  const saved=sim.snapshot(),copy=new RoadWeaver();
  assert.ok(copy.restore(saved));
  assert.equal(copy.roundabouts[0].lanes,4);
  assert.ok(copy.edges.filter(e=>e.kind==='roundabout').every(e=>e.lanes===4));
});

test('ordinary four-way junctions remain affordable two-lane roundabouts',()=>{
  const sim=commute('cross');
  const ring=sim.addRoundabout({x:530,y:366});
  assert.equal(ring.ok,true);
  assert.equal(ring.cost,75);
  assert.equal(ring.lanes,2);
  const legacy={...sim.snapshot(),version:2,
    roundabouts:sim.roundabouts.map(({lanes,...old})=>old)};
  const copy=new RoadWeaver();
  assert.equal(copy.restore(legacy),true);
  assert.equal(copy.roundabouts[0].lanes,undefined);
  assert.ok(copy.edges.filter(e=>e.kind==='roundabout').every(e=>e.lanes===2));
});

test('crowded roundabout keeps a substantial fraction of the hub throughput on a weekend',()=>{
  const make=roundabout=>{
    const sim=new RoadWeaver();sim.budget=10000;sim.openTowns=7;
    sim.day=6;sim.minutes=0;sim.growthClock=-1e9;
    const center={x:535,y:366};
    sim.addRoad([home,center],4);
    for(const town of TOWN_TYPES.slice(1))sim.addRoad([center,town],4);
    if(roundabout)assert.ok(sim.addRoundabout(center).ok);
    for(let i=0;i<1000;i++)sim.update(.1);
    return sim;
  };
  const baseline=make(false),rotary=make(true);
  assert.ok(rotary.delivered>0);
  assert.ok(rotary.delivered>=baseline.delivered*.68,
    'a wide roundabout is throttling the whole city');
  assert.ok(rotary.cars.length<=180);
});
