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
