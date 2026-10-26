import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_STAGES,ZONES,ITEMS,createWorld,stepWorld,FIXED_DT,pickup,throwItem,getStage} from '../games/physics_lab/sim.mjs';
const tick=(w,n)=>{for(let j=0;j<n&&w.status==='playing';j++)stepWorld(w,{},FIXED_DT);return w;};
test('36 stable stages retain the original 24 IDs and introduce 12 authored machine missions',()=>{
 assert.equal(ALL_STAGES.length,36);assert.equal(ZONES.length,6);
 for(let i=0;i<36;i++){const s=getStage(i+1);assert.equal(s.id,i+1);for(const k of s.itemTypes)assert.ok(ITEMS[k]);}
 for(let id=25;id<=30;id++){const s=getStage(id);assert.ok(s.dominos.length>=4);assert.ok(s.gates.every(g=>g.key==='chain'));}
 for(let id=31;id<=36;id++){const s=getStage(id);assert.equal(s.pads.length,1);assert.ok(s.belts[0].w>0);}
});
test('chain reaction requires real projectile contact and relays to last domino',()=>{
 const w=createWorld(25);tick(w,200);assert.equal(w.chainComplete,false);assert.equal(w.gates[0].open,false);
 const first=w.dominos[0],ball=w.items[0];ball.x=first.x-ball.r-3;ball.y=first.y;ball.vx=280;ball.vy=0;
 tick(w,120);assert.ok(w.dominos.every(d=>d.fallen));assert.equal(w.chainComplete,true);assert.equal(w.gates[0].open,true);
 assert.equal(w.events.filter(e=>e.type==='gate').length,1);
 tick(w,120);assert.equal(w.events.filter(e=>e.type==='gate').length,1,'gate only opens once');
});
test('domino chain never triggers from a stationary object merely touching it',()=>{
 const w=createWorld(25);const first=w.dominos[0],item=w.items[0];
 item.x=first.x-item.r-2;item.y=first.y;item.vx=0;item.vy=0;tick(w,30);
 assert.equal(w.chainStarted,false);assert.equal(w.gates[0].open,false);
});
test('pressure pad rejects light objects but accepts an eligible heavy object, opening gate once',()=>{
 const w=createWorld(31),pad=w.pads[0];w.items=w.items.filter(i=>i.type==='ball');
 w.items[0].x=pad.x;w.items[0].y=pad.y;tick(w,1);assert.equal(pad.active,false);assert.equal(w.gates[0].open,false);
 const item=w.items[0];item.m=ITEMS.wood.mass;tick(w,1);
 assert.equal(pad.active,true);assert.equal(w.gates[0].open,true);
 tick(w,50);assert.equal(w.events.filter(e=>e.type==='gate').length,1);
});
test('conveyor transports initially resting body and respects belt direction',()=>{
 for(const id of [31,33]){const w=createWorld(id),belt=w.belts[0],item=w.items[0];
 item.x=belt.x+180;item.y=belt.y+belt.h/2;item.vx=item.vy=0;const x=item.x;
 tick(w,40);assert.ok(Math.abs(item.x-x)>10,`${id}: belt moves body`);
 assert.equal(Math.sign(item.x-x),Math.sign(belt.vx));
 }
});
test('closed machine gate prevents winning until the associated mechanism operates',()=>{
 const w=createWorld(25);
 w.goals.forEach(g=>g.active=true);tick(w,1);assert.equal(w.status,'playing');
 w.dominos.forEach(d=>d.fallen=true);tick(w,1);assert.equal(w.status,'won');
});
test('machine stages can make real progress with a physical launch',()=>{
 for(const id of [25,26,27,28,29,30]){
  const w=createWorld(id),d=w.dominos[0],item=w.items[0];w.items=[item];
  w.player.x=160;w.player.y=d.y;item.x=201;item.y=d.y;
  assert.equal(pickup(w),true,id);assert.equal(throwItem(w,d.x,d.y,1),true,id);
  tick(w,120);assert.equal(w.chainComplete,true,`${id}: chain should reach end`);
 }
});
test('every conveyor stage has at least one reachable pressure plate from launch area',()=>{
 for(let id=31;id<=36;id++){
  const stage=getStage(id);let reached=false;
  for(const strength of [.35,.5,.65,.85,1]){
   const w=createWorld(id),pad=w.pads[0],wood=w.items.find(i=>i.type==='wood');
   w.items=[wood];w.player.x=160;w.player.y=pad.y;wood.x=201;wood.y=pad.y;
   pickup(w);throwItem(w,pad.x,pad.y,strength);tick(w,260);
   if(pad.active){reached=true;break;}
  }
  assert.equal(reached,true,`stage ${id}: plate must be reachable without teleporting objects`);
 }
});
