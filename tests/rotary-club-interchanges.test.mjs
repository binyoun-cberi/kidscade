import test from 'node:test';
import assert from 'node:assert/strict';
import {RoadWeaver,TOWN_TYPES} from '../games/high_road_weaver/sim-core.mjs';

function intersection(){
  const sim=new RoadWeaver();
  sim.budget=2000;
  assert.equal(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],2).ok,true);
  assert.equal(sim.addRoad([{x:530,y:120},{x:530,y:610}],2).ok,true);
  const junction=[...sim.nodes.values()].find(n=>sim.adj.get(n.id).length>=4);
  assert.ok(junction);
  return {sim,junction};
}

test('the roundabout changes a flat intersection into directed circulation',()=>{
  const {sim,junction}=intersection();
  assert.equal(sim.addRoundabout(junction).ok,true);
  const direct=sim.route(TOWN_TYPES[0],TOWN_TYPES[1]);
  assert.ok(direct?.some(step=>step.edge.kind==='roundabout'));
  for(const edge of sim.edges.filter(e=>e.kind==='roundabout')){
    assert.ok(sim.adj.get(edge.a).some(step=>step.edge===edge&&step.dir===1));
    assert.ok(!sim.adj.get(edge.b).some(step=>step.edge===edge&&step.dir===-1));
  }
  assert.ok(sim.edges.every(e=>e.kind==='roundabout'||e.points.every(p=>Math.hypot(p.x-junction.x,p.y-junction.y)>35)));
});

test('cars really traverse roundabout edges before reaching destination',()=>{
  const {sim,junction}=intersection();
  assert.ok(sim.addRoundabout(junction).ok);
  assert.ok(sim.spawn('home','office'));
  let observed=false;
  for(let i=0;i<2000;i++){
    sim.update(1/30);
    if(sim.cars.some(car=>car.edge.kind==='roundabout'))observed=true;
  }
  assert.ok(observed,'the circular lane is never used');
  assert.ok(sim.delivered>0,'the traffic does not exit the junction');
});

test('traffic island creates a physical, one-way bypass around intersection',()=>{
  const {sim,junction}=intersection();
  const result=sim.addTrafficIsland({x:junction.x-25,y:junction.y-25});
  assert.ok(result.ok);
  const lane=sim.edges.find(e=>e.kind==='slip');
  assert.ok(lane);
  assert.ok(sim.adj.get(lane.a).some(s=>s.edge===lane&&s.dir===1));
  assert.ok(!sim.adj.get(lane.b).some(s=>s.edge===lane&&s.dir===-1));
  assert.ok(sim.route(sim.nodes.get(lane.a),sim.nodes.get(lane.b))?.some(s=>s.edge===lane));
  assert.equal(sim.addTrafficIsland({x:junction.x-25,y:junction.y-25}).ok,false,'duplicate bypass accepted');
  assert.ok(sim.undo().ok);
  assert.equal(sim.edges.some(e=>e.kind==='slip'),false);
});

test('a crossing at another elevation never becomes a flat intersection',()=>{
  const sim=new RoadWeaver();sim.budget=2000;
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],2).ok);
  assert.ok(sim.addRoad([{x:530,y:120},{x:530,y:610}],2,'bridge').ok);
  assert.equal(sim.edges.length,2);
  assert.equal(sim.nodes.size,4);
  assert.equal(sim.route(TOWN_TYPES[0],{x:530,y:120}),null);
});

test('ramps explicitly connect ground and bridge with entry and exit',()=>{
  const sim=new RoadWeaver();sim.budget=2000;
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],2).ok);
  assert.ok(sim.addRoad([{x:530,y:120},{x:530,y:610}],2,'bridge').ok);
  assert.ok(sim.addRoad([{x:350,y:372},{x:530,y:180}],2,'ramp').ok);
  assert.ok(sim.addRoad([{x:730,y:360},{x:530,y:540}],2,'ramp').ok);
  const ramp=sim.edges.find(e=>e.kind==='ramp');
  assert.ok(ramp.a.endsWith('@0')&&ramp.b.endsWith('@1'));
  assert.ok(sim.adj.get(ramp.a).some(s=>s.edge===ramp));
  assert.ok(sim.adj.get(ramp.b).some(s=>s.edge===ramp&&s.dir===-1));
  assert.ok(sim.adj.get(ramp.b).some(s=>s.edge.kind==='bridge'));
  const before=sim.roads.length;
  assert.ok(sim.undo().ok);
  assert.equal(sim.roads.length,before-1);
});

test('existing v1 saves still load and v2 keeps roundabouts/overpasses',()=>{
  const {sim,junction}=intersection();
  assert.ok(sim.addRoundabout(junction).ok);
  assert.equal(sim.snapshot().version,2);
  const saved=sim.snapshot(),reloaded=new RoadWeaver();
  assert.ok(reloaded.restore(saved));
  assert.equal(reloaded.roundabouts.length,1);
  assert.equal(reloaded.route(TOWN_TYPES[0],TOWN_TYPES[1]).some(s=>s.edge.kind==='roundabout'),true);
  const legacy={...saved,version:1,roads:saved.roads.map(({kind,...rest})=>rest)};
  delete legacy.roundabouts;
  const old=new RoadWeaver();assert.ok(old.restore(legacy));
  assert.ok(old.route(TOWN_TYPES[0],TOWN_TYPES[1]));
});

test('malformed facilities cannot break loading',()=>{
  const sim=new RoadWeaver(),data=sim.snapshot();
  assert.equal(sim.restore({...data,roundabouts:[{id:'broken',x:20,y:20,radius:-1}]}),false);
  assert.equal(sim.restore({...data,roads:[{id:'rX',kind:'bridge',lanes:2,points:[{x:1,y:2},{x:Infinity,y:20}]}]}),false);
  assert.equal(sim.restore({...data,roads:[{id:'rX',kind:'slip',lanes:6,points:[{x:1,y:2},{x:200,y:20}]}]}),false);
});

test('editing while cars are on the road preserves those cars',()=>{
  const sim=new RoadWeaver();sim.budget=2000;
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],2).ok);
  assert.ok(sim.spawn('home','office'));
  for(let i=0;i<70;i++)sim.update(1/30);
  const car=sim.cars.find(c=>c.from==='home');
  assert.ok(car);
  assert.ok(sim.addRoad([{x:530,y:120},{x:530,y:610}],2).ok);
  assert.ok(sim.cars.includes(car));
  for(let i=0;i<100;i++)sim.update(1/30);
  assert.ok(Number.isFinite(sim.sampleCar(car).x));
});

test('a disconnected pair of cities can connect exclusively through elevated roads and two ramps',()=>{
  const sim=new RoadWeaver();sim.budget=2500;
  assert.ok(sim.addRoad([{x:164,y:378},{x:345,y:372}],2).ok);
  assert.ok(sim.addRoad([{x:730,y:360},{x:915,y:354}],2).ok);
  assert.equal(sim.route(TOWN_TYPES[0],TOWN_TYPES[1]),null);
  assert.ok(sim.addRoad([{x:530,y:140},{x:530,y:560}],2,'bridge').ok);
  assert.equal(sim.route(TOWN_TYPES[0],TOWN_TYPES[1]),null,'a bridge directly joins ground roads');
  assert.ok(sim.addRoad([{x:345,y:372},{x:530,y:180}],2,'ramp').ok);
  assert.ok(sim.addRoad([{x:730,y:360},{x:530,y:540}],2,'ramp').ok);
  const path=sim.route(TOWN_TYPES[0],TOWN_TYPES[1]);
  assert.deepEqual(path.map(s=>s.edge.kind),['ground','ramp','bridge','ramp','ground']);
  assert.ok(path.some(s=>s.dir===-1&&s.edge.kind==='ramp'),'exit ramp is not traversable downhill');
  assert.ok(sim.spawn('home','office'));
  let observed=false;
  for(let i=0;i<2300;i++){
    sim.update(1/30);
    if(sim.cars.some(car=>car.edge.kind==='bridge'))observed=true;
  }
  assert.ok(observed,'cars never use the elevated road');
  assert.ok(sim.delivered>0,'cars never reach the other town via ramps');
});

test('traffic lights affect actual junction movement and legacy signal IDs migrate',()=>{
  const {sim,junction}=intersection();
  const on=sim.toggleLight(junction);
  assert.ok(on.ok&&on.enabled);
  assert.ok(sim.lights.has(junction.id));
  assert.ok(sim.spawn('home','office'));
  const car=sim.cars.find(c=>c.from==='home');
  assert.ok(car);
  sim.tickTime=6; // north-south green; east-west waits
  assert.equal(sim.canGo(car),false);
  sim.tickTime=0; // east-west green
  assert.equal(sim.canGo(car),true);
  const old={...sim.snapshot(),version:1,lights:[junction.id.split('@')[0]],roundabouts:[]};
  const copy=new RoadWeaver();assert.ok(copy.restore(old));
  assert.ok(copy.lights.has(junction.id),'old signal keys must be attached to ground layer');
});

test('a ramp with no bridge access is rejected without wasting materials',()=>{
  const sim=new RoadWeaver();
  const initial=sim.budget;
  assert.ok(sim.addRoad([{x:164,y:378},{x:330,y:370}],2).ok);
  const current=sim.budget;
  const result=sim.addRoad([{x:330,y:370},{x:550,y:190}],2,'ramp');
  assert.equal(result.ok,false);
  assert.equal(sim.budget,current);
  assert.ok(sim.budget<initial);
});
