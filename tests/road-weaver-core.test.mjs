import test from 'node:test';
import assert from 'node:assert/strict';
import {RoadWeaver,pointOnPath,costOfRoad,getDemandRate} from '../games/high_road_weaver/sim-core.mjs';

test('straight road connects two towns and cars reach the other city',()=>{
  const sim=new RoadWeaver();
  assert.equal(sim.route({x:164,y:378},{x:915,y:354}),null);
  const res=sim.addRoad([{x:164,y:378},{x:400,y:360},{x:700,y:350},{x:915,y:354}],2);
  assert.equal(res.ok,true);
  assert.ok(sim.route({x:164,y:378},{x:915,y:354}).length>0);
  assert.equal(sim.spawn('home','office'),true);
  for(let i=0;i<1250;i++)sim.update(1/30);
  assert.ok(sim.delivered>0);
});
test('junction formed by crossing drawn roads connects the graph',()=>{
  const sim=new RoadWeaver();
  sim.addRoad([{x:164,y:378},{x:915,y:354}],2);
  const r=sim.addRoad([{x:520,y:125},{x:530,y:365},{x:540,y:610}],2);
  assert.equal(r.ok,true);
  const crossings=[...sim.nodes.values()].filter(n=>Math.abs(n.x-530)<50&&Math.abs(n.y-366)<30);
  assert.ok(crossings.length>0);
  assert.ok(sim.edges.length>=4);
});
test('road materials and widening prices are finite and enforced',()=>{
  const sim=new RoadWeaver();
  const p=[{x:164,y:378},{x:915,y:354}];
  assert.ok(costOfRoad(p,4)>costOfRoad(p,2));
  const a=sim.addRoad(p,2);
  assert.equal(a.ok,true);
  const before=sim.budget;
  assert.equal(sim.widenRoad({x:520,y:365}).ok,true);
  assert.ok(sim.budget<before);
  assert.equal(sim.undo().ok,true);
  assert.equal(sim.roads[0].lanes,2);
});
test('commute demand changes direction by time of day',()=>{
  assert.ok(getDemandRate('home','office',8)>getDemandRate('office','home',8));
  assert.ok(getDemandRate('office','home',18)>getDemandRate('home','office',18));
});
test('snapshot restores geometry and guards malformed saves',()=>{
  const s=new RoadWeaver();s.addRoad([{x:164,y:378},{x:915,y:354}],2);
  const t=new RoadWeaver();
  assert.equal(t.restore(s.snapshot()),true);
  assert.ok(t.route({x:164,y:378},{x:915,y:354}));
  assert.equal(t.restore({version:1,roads:[{lanes:2,points:[{x:NaN,y:0},{x:2,y:2}]}]}),false);
});
test('point sampling traverses the path',()=>{
  const p=pointOnPath([{x:0,y:0},{x:100,y:0}],50);
  assert.equal(p.x,50);assert.equal(p.y,0);
});
