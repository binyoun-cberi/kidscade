import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const routeSource=await readFile(new URL('./market-customer-route.js',import.meta.url),'utf8');
const {retailPath}=await import('data:text/javascript;base64,'+Buffer.from(routeSource).toString('base64'));
test('routes avoid shelves, keep adjacent steps and reach checkout',()=>{
 const obstacles=[{x:-3.3,z:2.7,w:2,d:1.1},{x:-.15,z:.25,w:2.18,d:1},{x:-3.45,z:-3.35,w:2.15,d:1},{x:2.35,z:-3.35,w:2.05,d:1}];
 for(const goal of [[-3.4,-3.3],[2.3,-3.3],[-3.25,3.75]]){
  const path=retailPath([1,4],goal,obstacles);assert.ok(path?.length);
  for(let i=0;i<path.length;i++){const [x,z]=path[i];assert.ok(!obstacles.some(b=>Math.abs(x-b.x)<b.w/2+.19&&Math.abs(z-b.z)<b.d/2+.19));if(i)assert.ok(Math.hypot(x-path[i-1][0],z-path[i-1][1])<=.251)}
 }
});
test('blocked and disconnected stores fail without crossing fixtures',()=>{
 assert.equal(retailPath([0,0],[2,2],[{x:0,z:0,w:20,d:20}]),null);
 assert.equal(retailPath([-3,0],[3,0],[{x:0,z:0,w:1,d:20}]),null);
});

test('three customers shop concurrently and occupy distinct queue positions',async()=>{
 const src=await readFile(new URL('./market-walk.js',import.meta.url),'utf8'),a=src.indexOf('function moveRetailActor('),b=src.indexOf('function departRetailGuest(',a),code=src.slice(a,b);
 for(let run=0;run<30;run++){
  const guests=Array.from({length:3},(_,i)=>({root:{position:{x:1,y:0,z:4-i*.6},rotation:{y:0,z:0},removeFromParent(){}},bag:{scale:{y:1},rotation:{z:0}},basket:['apple','bread'],stops:[{id:'apple',target:[-3,-2.5]},{id:'bread',target:[2,-2.5]},{id:null,target:[-3.25,3.75]}],index:0,path:null,waypoint:0,pause:0,picked:{},clock:0,queued:false,wait:0,patience:10000,customer:{name:'손님'}}));
  const state={phase:'retailWalk',cashierShift:{spawned:3,target:3,staffActive:false}};let ready=0;
  const vars={retailGuest:null,retailGuests:guests,retailDepartures:[],retailSpawnClock:0,retailSpawning:false,state,colliders:[{x:0,z:0,w:2,d:1},{x:-3.3,z:2.7,w:2,d:1.1},{x:2,z:1.25,w:1.25,d:.65}],retailPath,retailGuestNote(){},toast(){},renderRetailShelfSigns(){},beginRetailGuest(){throw Error('unexpected spawn')},endRetailDay(){throw Error('unexpected end')},takeQueuedCustomer(){ready=guests.filter(g=>g.queued).length}};
  const tick=new Function(...Object.keys(vars),code+';return updateRetailGuests;')(...Object.values(vars));
  for(let frame=0;frame<5000&&ready<3;frame++){tick(.05);ready=guests.filter(g=>g.queued).length}
  assert.equal(ready,3);for(const g of guests)assert.deepEqual(g.picked,{apple:1,bread:1});
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(Math.hypot(guests[i].root.position.x-guests[j].root.position.x,guests[i].root.position.z-guests[j].root.position.z)>=.64);
 }
});
