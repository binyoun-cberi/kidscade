import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCADE_ITEM_TYPES,ITEMS,FIXED_DT,createWorld,pickup,throwItem,stepWorld,STAGES} from '../games/physics_lab/sim.mjs';
const ticks=(w,n)=>{for(let i=0;i<n && w.status==='playing';i++)stepWorld(w,{},FIXED_DT);};
function enemy(x,y,id){return {id,x,y,r:19,m:1.5,vx:0,vy:0,angle:0,turn:999,speed:0,knock:0,hitCooldown:0,voice:0,dead:false};}
test('40 original-free illustrated object definitions and independent survival arena',()=>{
 const w=createWorld(1,'arcade');
 assert.equal(ARCADE_ITEM_TYPES.length,40);
 assert.equal(new Set(ARCADE_ITEM_TYPES).size,40);
 assert.ok(ARCADE_ITEM_TYPES.every(key=>ITEMS[key]?.name&&ITEMS[key].mass>0));
 assert.equal(w.goals.length,0);
 assert.equal(w.crates.length,3);
 assert.equal(w.items.length,9);
 assert.equal(w.player.x,480);
 assert.equal(STAGES.length,24,'existing stage numbering unchanged');
});
test('warning appears before enemies actually enter from multiple arena edges',()=>{
 const w=createWorld(1,'arcade');w.spawnTimer=0.01;
 ticks(w,1);assert.equal(w.bots.length,0);assert.equal(w.spawnWarnings.length,1);
 const pos={...w.spawnWarnings[0]};
 ticks(w,50);assert.equal(w.spawnWarnings.length,0);assert.equal(w.bots.length,1);
 assert.ok(Math.hypot(w.bots[0].x-pos.x,w.bots[0].y-pos.y)<200);
});
test('throwing the same object again resets one-throw combo',()=>{
 const w=createWorld(1,'arcade');w.bots=[];w.spawnTimer=999;
 w.items=[{...w.items[0],x:480,y:305,vx:0,vy:0}];
 assert.equal(pickup(w),true);
 w.combo=6;assert.equal(throwItem(w,850,305,1),true);
 assert.equal(w.combo,0);assert.equal(w.shots,1);
 w.items[0].x=w.player.x;w.items[0].y=w.player.y;w.items[0].vx=w.items[0].vy=0;
 assert.equal(pickup(w),true);w.combo=3;throwItem(w,850,305,1);
 assert.equal(w.combo,0);assert.equal(w.shots,2);assert.equal(w.items[0].arcadeShot,2);
});
test('projectile actually hits and knocks a wandering enemy',()=>{
 const w=createWorld(1,'arcade');w.spawnTimer=999;w.crates=[];
 w.bots=[enemy(595,305,8000)];
 w.items=[{...w.items[0],x:481,y:305,vx:0,vy:0}];
 assert.equal(pickup(w),true);assert.equal(throwItem(w,900,305,1),true);
 ticks(w,30);
 assert.ok(w.survivalHits>=1,JSON.stringify({bots:w.bots,events:w.events}));
 assert.equal(w.hits,w.survivalHits);assert.ok(w.score>=25);assert.ok(w.combo>=1);
});
test('crates break only on sufficiently strong item impact and grant a new item',()=>{
 const w=createWorld(1,'arcade');w.bots=[];w.spawnTimer=999;
 const c=w.crates[0];w.crates=[c];w.items=[{...w.items[0],x:c.x-30,y:c.y,vx:500,vy:0}];
 const n=w.items.length;
 ticks(w,2);
 assert.equal(w.cratesBroken,1);assert.equal(w.crates.length,0);assert.equal(w.items.length,n+1);
 assert.ok(w.events.some(e=>e.type==='crate-break'));
});
test('enemy colliding with player hurts once during temporary invulnerability',()=>{
 const w=createWorld(1,'arcade');w.spawnTimer=999;w.bots=[enemy(480,305,9)];
 ticks(w,1);assert.equal(w.hearts,2);
 ticks(w,20);assert.equal(w.hearts,2,'no stacked hits during invulnerability');
});
test('survival stress never creates unbounded enemies or items',()=>{
 const w=createWorld(1,'arcade');w.player.invulnerable=1e7;
 for(let i=0;i<6500;i++)stepWorld(w,{},FIXED_DT);
 assert.equal(w.status,'playing');assert.ok(w.bots.length<=16);assert.ok(w.items.length<=45);
 assert.ok(w.bots.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.vx)));
});
