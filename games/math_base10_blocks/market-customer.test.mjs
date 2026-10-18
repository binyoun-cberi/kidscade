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
test('guest visits shelves, picks only planned goods, then reaches register',async()=>{
 const src=await readFile(new URL('./market-walk.js',import.meta.url),'utf8');
 const start=src.indexOf('function moveRetailActor('),end=src.indexOf('function departRetailGuest(',start),code=src.slice(start,end);
 for(let run=0;run<100;run++){
  const root={position:{x:1,y:0,z:4},rotation:{y:0,z:0},removeFromParent(){}};
  const guest={root,bag:{scale:{y:1}},stops:[{id:'apple',target:[-3,-2.5]},{id:'bread',target:[2,-2.5]},{id:null,target:[-3.25,3.75]}],index:0,path:null,waypoint:0,pause:0,picked:{},clock:0};
  const state={phase:'retailWalk',basket:['apple','apple','bread'],cashierShift:{current:{name:'손님'}}};let opened=0;
  const vars={retailGuest:guest,retailDepartures:[],state,colliders:[{x:0,z:0,w:2,d:1},{x:-3.3,z:2.7,w:2,d:1.1}],retailPath,retailGuestNote(){},productById:id=>({name:id}),renderRetailShelfSigns(){},openCheckout(){opened++},document:{getElementById:()=>({remove(){}})}};
  const tick=new Function(...Object.keys(vars),code+';return updateRetailGuests;')(...Object.values(vars));
  for(let frame=0;frame<3000&&!opened;frame++)tick(.05);
  assert.equal(opened,1);assert.deepEqual(guest.picked,{apple:2,bread:1});assert.equal(state.cashierShift.current.arrived,true);assert.ok(Math.hypot(root.position.x+3.25,root.position.z-3.75)<.01);
 }
});
