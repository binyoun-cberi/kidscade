import test from 'node:test';
import assert from 'node:assert/strict';
import {FIXED_DT,STAGES,createWorld,stepWorld,pickup,throwItem,surfaceAt,medal,ITEMS,SURFACES} from '../games/physics_lab/sim.mjs';

test('24 deterministic stages across four science zones have valid geometry and reachable switch corridors',()=>{
 assert.equal(STAGES.length,24);assert.deepEqual([...new Set(STAGES.map(s=>s.zone))],[0,1,2,3]);
 for(const s of STAGES){assert.ok(s.goals.length>=1&&s.goals.length<=2);assert.equal(s.itemTypes.every(type=>Boolean(ITEMS[type])),true);
  assert.ok(s.goals.every(g=>g.x>=550&&g.x<920&&g.y>55&&g.y<550),`stage ${s.id} switch bounds`);
  assert.ok(s.barriers.every(b=>b.x>260&&b.x+b.w<900),`stage ${s.id} obstacles`);
  assert.equal(createWorld(s.id).items.length,s.itemTypes.length);
 }
});
test('pickup requires proximity, throw transfers mass-aware momentum',()=>{
 const w=createWorld(1);assert.equal(pickup(w),true);
 const it=w.items.find(x=>x.held);assert.equal(it.type,'wood');
 const ok=throwItem(w,760,300,1);assert.equal(ok,true);assert.equal(w.shots,1);assert.equal(w.player.held,null);
 assert.ok(it.vx>300&&it.vy===0);assert.equal(pickup(w),false);
});
test('different surfaces produce distinct deceleration over equal time',()=>{
 const rates={};for(const type of ['ice','normal','carpet']){
  const w=createWorld(1);w.stage={...w.stage,surfaces:[{x:0,y:0,w:960,h:600,type}]};const item=w.items[1];
  item.vx=150;item.vy=0;for(let i=0;i<60;i++)stepWorld(w,{},FIXED_DT);rates[type]=item.vx;
 }
 assert.ok(rates.ice>rates.normal&&rates.normal>rates.carpet,JSON.stringify(rates));
});
test('light and heavy object differ in launch speed and momentum',()=>{
 function launch(kind){const w=createWorld(1);w.items=[{...w.items[0],id:9,type:kind,m:ITEMS[kind].mass,r:ITEMS[kind].radius,x:175,y:300}];
  assert.equal(pickup(w),true);throwItem(w,820,300,1);const i=w.items[0];return {speed:Math.hypot(i.vx,i.vy),momentum:Math.hypot(i.vx,i.vy)*i.m};}
 const a=launch('tennis'),b=launch('metal');assert.ok(a.speed>b.speed);assert.ok(b.momentum>a.momentum);
});
test('simple targets can be activated by a physically simulated throw',()=>{
 for(const id of [1,2,3,7,8,13,14,15,19,20,21]){
  const w=createWorld(id);const g=w.goals[0];
  if(id>=13&&id<=18){const iron=w.items.find(x=>x.type==='metal');iron.x=205;iron.y=300;w.items=w.items.filter(x=>x===iron);}
  else {const ball=w.items.find(x=>x.type==='ball');ball.x=205;ball.y=300;w.items=w.items.filter(x=>x===ball);}
  assert.equal(pickup(w),true,`${id} pickup`);throwItem(w,g.x,g.y,1);
  for(let k=0;k<360;k++)stepWorld(w,{},FIXED_DT);
  assert.equal(w.goals[0].active,true,`${id}: direct target reachable`);
 }
});
test('goal clear changes mode and grants medals, with no repeated clear event',()=>{
 const w=createWorld(1),g=w.goals[0];const ball=w.items.find(x=>x.type==='ball');ball.x=205;ball.y=300;w.items=[ball];pickup(w);throwItem(w,g.x,g.y,1);
 for(let i=0;i<360&&w.status==='playing';i++)stepWorld(w,{},FIXED_DT);
 assert.equal(w.status,'won');assert.equal(medal(w),3);assert.equal(w.events.filter(x=>x.type==='won').length,1);
 stepWorld(w,{},FIXED_DT);assert.equal(w.events.filter(x=>x.type==='won').length,1);
});
test('arcade waves spawn, advance, and terminate on exhausted hearts',()=>{
 const w=createWorld(1,'arcade');w.items=[];for(let i=0;i<2600;i++)stepWorld(w,{},FIXED_DT);
 assert.equal(w.status,'lost');assert.ok(w.spawnCount>=3);assert.equal(w.hearts,0);
});
test('physics stays finite for long mixed simulation and bodies remain bounded',()=>{
 const w=createWorld(24);for(const item of w.items){item.vx=5000;item.vy=-2500;}
 for(let i=0;i<5000;i++){stepWorld(w,{dx:(i%3)-1,dy:(i%5)-2},FIXED_DT);}
 for(const item of w.items){assert.ok(Number.isFinite(item.x)&&Number.isFinite(item.vx));assert.ok(item.x>=36+item.r-.01&&item.x<=924-item.r+.01);}
});
