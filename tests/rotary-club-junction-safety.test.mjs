import test from 'node:test';
import assert from 'node:assert/strict';
import {RoadWeaver,TOWN_TYPES,classifyTurn} from '../games/high_road_weaver/sim-core.mjs';

function makeCross(lanes=2){
  const sim=new RoadWeaver();sim.budget=2000;
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],lanes).ok);
  assert.ok(sim.addRoad([{x:530,y:120},{x:530,y:610}],lanes).ok);
  return sim;
}
const makeVehicle=(path,id,lane=0)=>({
  id,from:'home',to:'office',path,step:0,edge:path[0].edge,dir:path[0].dir,
  s:path[0].edge.length-.5,lane,laneVisual:lane,laneCooldown:0,speed:40,maxSpeed:48,kind:'car'
});

test('turn classification matches roads on screen',()=>{
  assert.equal(classifyTurn(0,-Math.PI/2),'left');
  assert.equal(classifyTurn(0,Math.PI/2),'right');
  assert.equal(classifyTurn(0,.1),'straight');
});

test('two conflicting cars cannot enter one intersection at the same instant',()=>{
  const sim=makeCross();
  const east=sim.route(TOWN_TYPES[0],TOWN_TYPES[1]);
  const south=sim.route({x:530,y:120},{x:530,y:610});
  assert.equal(east.length,2);assert.equal(south.length,2);
  const a=makeVehicle(east,'car-east');
  const b=makeVehicle(south,'car-south');
  sim.cars=[a,b];
  sim.advance(1/30);
  assert.equal(a.step+b.step,1,'both cars crossed one junction without priority');
  const waiting=a.step===0?a:b;
  assert.ok(waiting.speed===0||waiting.s<waiting.edge.length);
  assert.equal(sim.canGo(waiting),false,'junction lock did not block the waiting approach');
  sim.tickTime+=1;
  assert.equal(sim.canGo(waiting),true,'intersection stayed blocked after prior vehicle passed');
});

test('opposite-turn cars approach from a suitable lane when room is available',()=>{
  const sim=makeCross(4);
  const route=sim.route(TOWN_TYPES[0],{x:530,y:120});
  assert.ok(route?.length===2);
  const car=makeVehicle(route,'car-turn',1);
  car.s=car.edge.length-70;
  sim.cars=[car];
  assert.equal(sim.getTurn(car),'left');
  sim.changeLane(car,1/30);
  assert.equal(car.lane,0,'left-turning driver did not move to inner lane');
  const rightRoute=sim.route({x:530,y:120},TOWN_TYPES[1]);
  const right=makeVehicle(rightRoute,'car-right',0);
  right.s=right.edge.length-70;
  sim.cars=[right];
  assert.equal(sim.getTurn(right),'right');
  sim.changeLane(right,1/30);
  assert.equal(right.lane,1,'right-turning driver did not move to outside lane');
});

test('vehicle sprite turns continuously when changing graph edges',()=>{
  const sim=makeCross(2),route=sim.route(TOWN_TYPES[0],{x:530,y:120});
  assert.equal(route.length,2);
  const car=makeVehicle(route,'car-render',0);
  car.s=car.edge.length;
  const before=sim.sampleCar(car);
  car.step=1;car.edge=route[1].edge;car.dir=route[1].dir;car.s=0;
  const after=sim.sampleCar(car);
  assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.1,
    'turn transition teleported the sprite');
  assert.ok(Math.abs(Math.atan2(Math.sin(before.angle-after.angle),Math.cos(before.angle-after.angle)))<.05);
});

test('junction rules do not freeze vehicles at a two-town network boundary',()=>{
  const sim=new RoadWeaver();
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],2).ok);
  sim.cars=[];
  for(let i=0;i<3000;i++)sim.update(1/30);
  assert.ok(sim.delivered>10,'new junction safeguards stopped normal commuting');
  assert.equal(sim.junctionReservations.size,0);
});
