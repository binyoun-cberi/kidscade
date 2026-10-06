const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('games/cube3d/cube-architect.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'(');let n=0,end=source.indexOf('{',start);for(let i=end;i<source.length;i++){if(source[i]==='{')n++;if(source[i]==='}'&&!--n)return source.slice(start,i+1)}}
function harness(){
 const blocks=new Map();for(let x=-8;x<=8;x++)for(let z=-8;z<=8;z++)blocks.set(`${x},0,${z}`,{type:'stone'});
 const pos={x:0,y:2.62,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};
 const c={camera:{position:pos},getBlock:(x,y,z)=>blocks.get(`${x},${y},${z}`),isSolidData:d=>!!d&&!['water','lava','fire'].includes(d.type),WORLD_MIN_Y:-8,WORLD_MAX_Y:30,WORLD_HALF:8,freeVelocityY:0,onGround:true,freePhysicsY:2.62,freeStepHop:0,freeFallPeakY:2.62,freeFluidKind:'',freeKeys:{},jumpQueuedUntil:0,lastGroundedAt:-Infinity,FREE_JUMP_SPEED:6.4,landedThisFrame:false,damageByFall:()=>false,THREE:{MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}},performance:{now:()=>c.time},time:0,fluidHeight:()=>1,mode:'free',freeAvatarDefeated:false,overlapSeconds:0,stopMining(){},toast(){}};
 vm.createContext(c);
 for(const name of ['blockCoordFromWorld','stairHighHalf','collisionTopForData','thinBlockContains','pointHitsWorldBlock','playerCollidesAt','groundTopBelow','stepHeightAt','moveFreeHorizontal','queueFreeJump','safeFreeSpot','playerEnvironmentState','escapeFreeOverlap'])vm.runInContext(fn(name),c);
 const start=source.indexOf('    const physicsSteps=Math.max'),end=source.indexOf('\n  camera.position.x=THREE.MathUtils.clamp',start);
 // Execute the exact production integration body, excluding its outer else brace.
 const body=source.slice(start,end).replace(/\n  }\s*$/,'');
 vm.runInContext('function tick(dt,t,move){'+body+';freePhysicsY=camera.position.y}',c);
 return {c,blocks,pos,tick(dt,dx=0){c.time+=dt*1000;c.tick(dt,c.time,{x:dx,z:0})}};
}
for(const dt of [.008,1/60,.04])test(`one-block jump succeeds at frame interval ${dt}`,()=>{const h=harness();h.blocks.set('1,1,0',{type:'stone'});h.c.queueFreeJump();for(let i=0;i<Math.ceil(.8/dt);i++)h.tick(dt,4*dt);assert.ok(h.pos.x>1.8,`blocked at ${h.pos.x}`);assert.ok(h.pos.y>=2.62-1e-6)});
test('two-block wall cannot be jumped through',()=>{const h=harness();h.blocks.set('1,1,0',{type:'stone'});h.blocks.set('1,2,0',{type:'stone'});h.c.queueFreeJump();for(let i=0;i<60;i++)h.tick(1/60,4/60);assert.ok(h.pos.x<.24)});
test('jump pressed just before landing runs after landing',()=>{const h=harness();h.pos.y=2.68;h.c.onGround=false;h.c.freeVelocityY=-2;h.c.queueFreeJump();for(let i=0;i<5;i++)h.tick(1/60);assert.ok(h.c.freeVelocityY>0);assert.ok(h.pos.y>2.7)});
test('jump remains available briefly after walking off an edge',()=>{const h=harness();h.c.onGround=false;h.c.lastGroundedAt=0;h.c.time=60;h.c.queueFreeJump();h.tick(1/60);assert.ok(h.c.freeVelocityY>0)});
test('low ceiling stops ascent without leaving the body inside blocks',()=>{const h=harness();h.blocks.set('0,3,0',{type:'stone'});h.c.queueFreeJump();for(let i=0;i<40;i++){h.tick(1/60);assert.equal(h.c.playerCollidesAt(h.pos.x,h.pos.y,h.pos.z),false)}assert.equal(h.c.onGround,true)});
test('fall catches a raised floor instead of passing through it',()=>{const h=harness();h.blocks.set('0,3,0',{type:'stone'});h.pos.y=7;h.c.onGround=false;h.c.freeVelocityY=-20;for(let i=0;i<30;i++)h.tick(.04);assert.ok(Math.abs(h.pos.y-5.62)<.001)});
test('escape finds nearby safe floor without changing health or inventory',()=>{const h=harness();h.blocks.set('0,1,0',{type:'stone'});h.c.survivalHealth=2;h.c.survivalBag={log:3};assert.equal(h.c.escapeFreeOverlap(true),true);assert.equal(h.c.playerCollidesAt(h.pos.x,h.pos.y,h.pos.z),false);assert.equal(h.c.survivalHealth,2);assert.equal(h.c.survivalBag.log,3)});
