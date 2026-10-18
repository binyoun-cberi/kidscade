import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./market-retail.js',import.meta.url),'utf8'),api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const main=await readFile(new URL('./market-walk.js',import.meta.url),'utf8');
const products=[...api.RETAIL_IDS,...api.EXTRA_RETAIL_IDS].map((id,i)=>({id,price:900+i*400}));
test('checkout serves queue join order rather than spawn order and waits for the head',()=>{
 const code=main.slice(main.indexOf('function takeQueuedCustomer('),main.indexOf('function endRetailDay('));
 const first={queueTicket:1,queued:true,basket:['apple'],customer:{name:'first'}},later={queueTicket:2,queued:true,basket:['bread'],customer:{name:'later'}};
 const state={cashierShift:{active:true}},args={retailGuests:[later,first],retailGuest:null,retailCarry:null,state,document:{getElementById(){}},openCheckout(){}};
 const take=new Function(...Object.keys(args),code+';return takeQueuedCustomer;')(...Object.values(args));take();assert.equal(state.cashierShift.current.name,'first');
 first.queued=false;state.cashierShift.current=null;take();assert.equal(state.cashierShift.current,null);
});
test('queue compacts after a gap without resetting patience or serving customer',()=>{
 const code=main.slice(main.indexOf('function retailQueueSlot('),main.indexOf('function updateRetailGuests('));
 const active={queueTicket:1,queued:true},last={queueTicket:3,queued:true,path:[[1,1]],wait:40};
 const run=new Function('retailGuests','retailGuest',code+';return {slot:retailQueueSlot,compact:compactRetailQueue};')([last,active],active);
 assert.equal(run.slot(last),1);run.compact();assert.equal(last.queued,false);assert.equal(last.path,null);assert.equal(last.wait,40);assert.equal(active.queued,true);
});
test('actors stop before another person and can move away from an overlap',()=>{
 const code=main.slice(main.indexOf('function moveRetailActor('),main.indexOf('function retailQueueSlot('));
 const move=new Function('colliders','retailPath',code+';return moveRetailActor;')([],()=>null);
 const root=(x,z)=>({position:{x,y:0,z},rotation:{y:0}}),blocker={root:root(.5,0)},actor={root:root(0,0),path:[[1,0]],waypoint:0};actor.neighbors=[actor,blocker];
 for(let n=0;n<30;n++)move(actor,.05);assert.ok(Math.abs(actor.root.position.x-blocker.root.position.x)>=.48);
 actor.root.position.x=.3;actor.path=[[-1,0]];move(actor,.05);assert.ok(actor.root.position.x<.3);
});
test('opposing shoppers detour and both reach their destinations',async()=>{
 const {retailPath}=await import('./market-customer-route.js'),code=main.slice(main.indexOf('function moveRetailActor('),main.indexOf('function retailQueueSlot('));
 const move=new Function('colliders','retailPath',code+';return moveRetailActor;')([],retailPath);
 const actor=(x,goal)=>({root:{position:{x,y:0,z:0},rotation:{y:0}},path:retailPath([x,0],[goal,0],[]),waypoint:0});
 const a=actor(-1,1),b=actor(1,-1);a.neighbors=b.neighbors=[a,b];
 for(let n=0;n<600;n++){move(a,.05);move(b,.05)}
 assert.ok(Math.hypot(a.root.position.x-1,a.root.position.z)<.1,JSON.stringify([a,b].map(x=>({p:x.root.position,path:x.path,w:x.waypoint}))));assert.ok(Math.hypot(b.root.position.x+1,b.root.position.z)<.1);
});
test('owner drawings transfer real cash and never pay out a loss',()=>{const s=api.createRetail(products),before=s.cash;assert.equal(api.ownerRetailDraw(s,10000,2000),2400);assert.equal(s.cash,before-2400);assert.equal(s.drawn,2400);assert.equal(api.ownerRetailDraw(s,1000,2000),0);s.cash=100;assert.equal(api.ownerRetailDraw(s,10000),100);assert.equal(s.cash,0)});
test('employee picks a nearly empty reserved shelf ahead of the first product',()=>{const s=api.createRetail(products);s.items.apple.shelf=6;s.items.tomato.shelf=2;assert.equal(api.chooseRetailRestock(s,[['tomato','tomato']]),'tomato');s.items.tomato.warehouse=0;assert.notEqual(api.chooseRetailRestock(s,[['tomato']]),'tomato')});
test('customer profiles respect budgets and record demand for unavailable goods',()=>{
 const s=api.createRetail(products);api.recordRetailDemand(s,api.RETAIL_PROFILES[1]);assert.equal(s.demand.grapes,1);
 for(let n=0;n<1000;n++){const p=api.RETAIL_PROFILES[n%3],cart=api.profileRetailBasket(s,products,[],p);assert.ok(cart.reduce((sum,id)=>sum+s.items[id].price,0)<=p.budget);for(const id of new Set(cart))assert.ok(cart.filter(x=>x===id).length<=s.items[id].shelf)}
 assert.deepEqual(api.normalizeRetail(JSON.parse(JSON.stringify(s)),products),s);
});
test('store opens with movement enabled and resumes completed payments after reload',()=>{
 const a=main.indexOf('function startRetailCustomers('),b=main.indexOf('function takeQueuedCustomer(',a),code=main.slice(a,b);
 const state={day:2,retail:api.createRetail(products),retailSession:{day:2,served:2,target:6,margin:4000,revenue:10000,mistakes:1,staffWage:2000}};
 const args={state,payRetailStaff:api.payRetailStaff,retailSpawnClock:0,retailStaffClock:0,save(){},renderHud(){},retailGuestNote(){},beginRetailGuest(){}};
 const start=new Function(...Object.keys(args),code+';return startRetailCustomers;')(...Object.values(args));start();assert.equal(state.running,true);assert.equal(state.cashierShift.served,2);assert.equal(state.cashierShift.spawned,2);assert.equal(state.cashierShift.margin,4000);assert.equal(state.cashierShift.staffWage,2000);assert.equal(state.workedDay,undefined);
});
test('stepping away from checkout keeps its scanned goods and payment',()=>{
 const a=main.indexOf('function hideRetailCheckout('),b=main.indexOf('let checkoutGoods=',a),code=main.slice(a,b),state={phase:'checkout',running:false,scanned:new Set([0,1]),paid:10000,totalConfirmed:true};
 const args={state,clearCheckoutGoods(){},ui:{checkout:{classList:{remove(){}},setAttribute(){}}},document:{body:{classList:{remove(){}}}},renderHud(){},save(){}};
 const pause=new Function(...Object.keys(args),code+';return hideRetailCheckout;')(...Object.values(args));pause();assert.equal(state.running,true);assert.equal(state.phase,'retailWalk');assert.equal(state.scanned.size,2);assert.equal(state.paid,10000);
});
test('saving an open shop keeps paid progress but discards unpaid customer baskets',()=>{
 const a=main.indexOf('function save(){'),b=main.indexOf('function hasSave(',a),code=main.slice(a,b);let value;
 const state={day:2,retail:api.createRetail(products),scanned:new Set([0]),basket:['apple'],cashierShift:{active:true,served:1,target:4,mistakes:0,revenue:2000,margin:900,staffWage:0}};
 const save=new Function('state','SAVE_KEY','localStorage',code+';return save;')(state,'test',{setItem(key,v){if(key==='test')value=JSON.parse(v)}});save();assert.equal(value.retailSession.served,1);assert.equal(value.retailSession.margin,900);assert.deepEqual(value.basket,[]);assert.equal(value.cashierShift,null);assert.equal(value.retail.drawn,0);
});
test('a blocked shopper leaves without closing the store for other customers',async()=>{
 const routeSource=await readFile(new URL('./market-customer-route.js',import.meta.url),'utf8'),{retailPath}=await import('data:text/javascript;base64,'+Buffer.from(routeSource).toString('base64'));
 const a=main.indexOf('function moveRetailActor('),b=main.indexOf('function departRetailGuest(',a),code=main.slice(a,b);
 const guests=[4,1].map(x=>({root:{position:{x,y:0,z:4},rotation:{y:0,z:0},removeFromParent(){}},bag:{scale:{y:1},rotation:{z:0}},basket:['apple'],stops:[{id:'apple',target:[-2,0]},{id:null,target:[-3.25,3.75]}],index:0,path:null,waypoint:0,pause:0,picked:{},queued:false,wait:0,patience:10000}));let ended=0;
 const state={phase:'retailWalk',cashierShift:{spawned:2,target:2,staffActive:false}},args={retailGuests:guests,retailGuest:null,retailDepartures:[],retailSpawnClock:1000,retailSpawning:false,state,colliders:[],retailPath:(from,to,c)=>from[0]===4?null:retailPath(from,to,c),retailGuestNote(){},renderRetailShelfSigns(){},toast(){},endRetailDay(){ended++}};
 const run=new Function(...Object.keys(args),code+';return {tick:updateRetailGuests,guests:()=>retailGuests};')(...Object.values(args));for(let n=0;n<1000;n++)run.tick(.05);
 assert.equal(ended,0);assert.equal(run.guests().length,1);assert.equal(run.guests()[0].queued,true);assert.equal(state.cashierShift.target,2);
});
