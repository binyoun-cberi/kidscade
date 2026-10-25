import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES,ALL_STAGES,ITEMS,createWorld,pickup,throwItem,stepWorld,FIXED_DT,medal} from '../games/physics_lab/sim.mjs';
const step=(w,n=1)=>{for(let i=0;i<n&&w.status==='playing';i++)stepWorld(w,{},FIXED_DT);return w;};
function shot(stage,kind,px,py,angle,power=1){
 const w=createWorld(stage);const item=w.items.find(x=>x.type===kind);
 assert.ok(item,`stage ${stage}: ${kind} exists`);
 w.player.x=px;w.player.y=py;item.x=px+25;item.y=py;
 w.items=[item];assert.equal(pickup(w),true);
 assert.equal(throwItem(w,px+500*Math.cos(angle),py+500*Math.sin(angle),power),true);
 return w;
}
test('the original 24 IDs have authored layouts, original progress order, and progressive mechanics',()=>{
 assert.equal(STAGES.length,24);assert.equal(ALL_STAGES.length,36);
 assert.deepEqual(STAGES.map(s=>s.id),Array.from({length:24},(_,i)=>i+1));
 const signatures=STAGES.map(s=>JSON.stringify([s.goals,s.surfaces,s.bumpers,s.barriers,s.pads,s.gates]));
 assert.equal(new Set(signatures).size,24,'no duplicate mission geometry');
 assert.equal(STAGES[3].barriers.length,1);
 assert.equal(STAGES[8].surfaces[0].type,'carpet');
 assert.equal(STAGES[17].pads[0].requiredMass,3.5);
 assert.equal(STAGES[21].goals[0].requiredBounces,1);
 assert.equal(STAGES[23].goals[0].requiredBounces,1);
});
test('on carpet, moving closer creates a solution instead of only firing from the starting spot',()=>{
 const w=shot(9,'wood',320,300,.16);
 step(w,500);
 assert.equal(w.goals[0].active,true);
 assert.equal(w.status,'won');
});
test('a rebound switch rejects an ordinary direct impact',()=>{
 const w=createWorld(22);const target=w.goals[0];
 const projectile=w.items.find(x=>x.type==='ball');w.items=[projectile];
 projectile.x=target.x-30;projectile.y=target.y;projectile.vx=380;projectile.vy=0;
 step(w,1);
 assert.equal(target.active,false);assert.ok(w.events.some(e=>e.type==='soft-hit'&&e.reason==='bounce'));
});
test('a rebound switch accepts a ricochet that actually occurred',()=>{
 const w=shot(22,'ball',200,300,-.72);
 step(w,600);
 assert.equal(w.goals[0].active,true);
 assert.ok(w.experiments[0].bounces>=1);
 assert.equal(w.experiments[0].reason,'목표 명중');
});
test('rebound final stage also has a reachable physical solution',()=>{
 const w=shot(24,'ball',200,300,.69);
 step(w,600);
 assert.equal(w.goals[0].active,true);
});
test('heavy pressure gate rejects lighter objects, opens with metal, then awards attainable medal',()=>{
 const w=createWorld(18),pad=w.pads[0],g=w.gates[0];
 const light=w.items.find(i=>i.type==='tennis');light.x=pad.x;light.y=pad.y;
 step(w);assert.equal(pad.active,false);assert.equal(g.open,false);
 light.x=220;light.y=200;
 const heavy=w.items.find(i=>i.type==='metal');heavy.x=pad.x;heavy.y=pad.y;
 step(w);assert.equal(pad.active,true);assert.equal(g.open,true);
 w.goals.forEach(target=>target.active=true);w.shots=2;step(w);
 assert.equal(w.status,'won');assert.equal(medal(w),3);
});
test('experiment log closes on goal contact or re-pickup, without duplicate results',()=>{
 const w=shot(1,'ball',200,300,0);
 step(w,300);assert.equal(w.status,'won');
 assert.equal(w.experiments.length,1);assert.equal(w.experiments[0].reason,'목표 명중');
 const a=createWorld(1);const ball=a.items.find(i=>i.type==='ball');ball.x=200;ball.y=300;a.items=[ball];a.player.x=200;a.player.y=300;
 pickup(a);throwItem(a,200,70,.3);step(a,80);
 ball.x=a.player.x+20;ball.y=a.player.y;ball.vx=ball.vy=0;
 assert.equal(pickup(a),true);assert.equal(a.experiments.length,1);assert.equal(a.experiments[0].reason,'다시 집기');
});
test('a launched object moving indefinitely finishes its 7-second observation log',()=>{
 const w=createWorld(1),ball=w.items.find(i=>i.type==='ball');w.items=[ball];w.player.x=ball.x;w.player.y=ball.y;
 pickup(w);throwItem(w,490,120,.8);step(w,450);
 assert.equal(w.experiments.length,1);assert.equal(w.experiments[0].reason,'7초 관찰');
 step(w,300);assert.equal(w.experiments.length,1);
});
test('player never stays embedded at the exact center of an initially closed gate',()=>{
 const w=createWorld(18),gate=w.gates[0];w.player.x=gate.x+gate.w/2;w.player.y=gate.y+gate.h/2;
 step(w,1);assert.ok(w.player.x<=gate.x-w.player.r||w.player.x>=gate.x+gate.w+w.player.r||w.player.y<=gate.y-w.player.r||w.player.y>=gate.y+gate.h+w.player.r);
});
test('experiment journal reports the surface encountered, not just the initial surface',()=>{
 const w=shot(9,'wood',320,300,.16);step(w,500);
 assert.equal(w.status,'won');
 assert.ok(w.experiments[0].surfaceTrail.includes('carpet'));
 assert.equal(w.experiments[0].reason,'목표 명중');
});
