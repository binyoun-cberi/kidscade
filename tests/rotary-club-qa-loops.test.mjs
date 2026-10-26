import test from 'node:test';
import assert from 'node:assert/strict';
import {RoadWeaver,TOWN_TYPES} from '../games/high_road_weaver/sim-core.mjs';

test('QA 1: repeated edits retain only roads actually needed by moving cars',()=>{
  const sim=new RoadWeaver();sim.budget=10000;
  assert.equal(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],2).ok,true);
  assert.equal(sim.spawn('home','office'),true);
  for(let i=0;i<12;i++){
    assert.equal(sim.addRoad([{x:300+i*7,y:80},{x:450+i*8,y:240}],2).ok,true);
  }
  assert.equal(sim.oldRoads.length,1,'ghost network duplicates after repeated edits');
  assert.ok(sim.oldRoads[0].edges.length<=2,'too many unrelated roads kept as ghosts');
  for(let i=0;i<1300;i++)sim.advance(1/30);
  assert.equal(sim.delivered,1);
  assert.equal(sim.oldRoads.length,0,'retired road overlay remains after the car arrived');
});

test('QA 1: long freehand lines never create progress that cannot be reloaded',()=>{
  const sim=new RoadWeaver();sim.budget=10000;
  const pts=Array.from({length:410},(_,i)=>({x:i%2?180:160,y:150+i*1.1}));
  const before=sim.budget;
  const result=sim.addRoad(pts,2);
  assert.equal(result.ok,false,'overlong road would make its save invalid');
  assert.match(result.reason,/단순/);
  assert.equal(sim.roads.length,0);
  assert.equal(sim.budget,before,'failed draw charged materials');
  const copy=new RoadWeaver();
  assert.equal(copy.restore(sim.snapshot()),true);
});

test('QA 1: invalid points cannot be committed into a valid road',()=>{
  const sim=new RoadWeaver();sim.budget=1000;
  const result=sim.addRoad([null,{x:NaN,y:400},{x:165,y:378},{x:800,y:360}],2);
  assert.equal(result.ok,true);
  assert.ok(sim.roads[0].points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  assert.equal(new RoadWeaver().restore(sim.snapshot()),true);
});

test('QA 3: unconnected new towns are not falsely reported as road congestion',()=>{
  const sim=new RoadWeaver();
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],4).ok);
  sim.openTowns=3; // factory appears before its road is built
  for(let i=0;i<1650;i++)sim.update(1/30);
  assert.ok(sim.waiting>40,'the disconnected district did not produce queued demand');
  assert.equal(sim.route(TOWN_TYPES[0],TOWN_TYPES[2]),null);
  const state=sim.trafficOverview();
  assert.equal(state.flow,'원활','waiting in disconnected district mislabeled as a traffic jam');
  assert.equal(state.queue,'새 지역 연결 필요');
});

test('QA 3: actual stopped vehicles correctly signal a severe bottleneck',()=>{
  const sim=new RoadWeaver();
  assert.ok(sim.addRoad([TOWN_TYPES[0],TOWN_TYPES[1]],2).ok);
  assert.ok(sim.spawn('home','office'));
  const template=sim.cars[0];
  sim.cars=Array.from({length:12},(_,i)=>({
    ...template,id:'blocked-'+i,s:45+i*23,speed:0,maxSpeed:50
  }));
  assert.equal(sim.trafficOverview().flow,'심한 정체');
});

test('QA 3: an empty road network must clearly tell the player to connect cities',()=>{
  const sim=new RoadWeaver();
  assert.deepEqual(sim.trafficOverview(),{flow:'연결 전',queue:'도로 연결 필요'});
});
