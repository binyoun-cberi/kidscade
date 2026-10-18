import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./market-retail.js',import.meta.url),'utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const products=api.RETAIL_IDS.map((id,i)=>({id,price:900+i*400}));
test('ordering, shelving and selling conserve stock and money',()=>{
 const s=api.createRetail(products),initialCash=s.cash,initialUnits=Object.values(s.items).reduce((n,x)=>n+x.shelf+x.warehouse,0);
 let orderedUnits=0;let seed=48;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let day=0;day<150;day++){
  for(const id of api.RETAIL_IDS){if(api.orderRetail(s,id).ok)orderedUnits+=4;api.restockRetail(s,id);api.priceRetail(s,id,random()<.5?-100:100,products)}
  for(let customer=0;customer<4;customer++){const basket=api.retailBasket(s,products,random),before=JSON.stringify(s);if(!basket.length){assert.equal(JSON.stringify(s),before);continue}const result=api.sellRetail(s,basket);assert.ok(result.ok);assert.ok(result.margin>=0)}
  assert.equal(s.cash,initialCash-s.ordered+s.revenue);
  assert.equal(Object.values(s.items).reduce((n,x)=>n+x.shelf+x.warehouse,0),initialUnits+orderedUnits-s.sold);
  for(const x of Object.values(s.items)){assert.ok(x.shelf>=0&&x.shelf<=8);assert.ok(x.warehouse>=0&&x.warehouse<=40)}
  assert.deepEqual(api.normalizeRetail(JSON.parse(JSON.stringify(s)),products),s);
 }
});
test('failed procurement and overselling do not partially mutate state',()=>{
 const s=api.createRetail(products);s.cash=0;let before=JSON.stringify(s);assert.equal(api.orderRetail(s,'apple').ok,false);assert.equal(JSON.stringify(s),before);
 before=JSON.stringify(s);assert.equal(api.sellRetail(s,['apple','unknown']).ok,false);assert.equal(JSON.stringify(s),before);
 assert.equal(api.sellRetail(s,Array(4).fill('apple')).ok,false);assert.equal(JSON.stringify(s),before);
});
test('empty shelves cannot generate a basket; price bounds hold',()=>{
 const s=api.createRetail(products);for(const x of Object.values(s.items))x.shelf=0;
 assert.deepEqual(api.retailBasket(s,products),[]);
 for(let i=0;i<100;i++)api.priceRetail(s,'apple',-100,products);
 assert.ok(s.items.apple.price>=products[0].price*.8);
 for(let i=0;i<100;i++)api.priceRetail(s,'apple',100,products);
 assert.ok(s.items.apple.price<=products[0].price*1.4);
});

test('four customer payments update store ledger and pay wages once',async()=>{
 const main=await readFile(new URL('./market-walk.js',import.meta.url),'utf8');
 const ex=(a,b)=>{const i=main.indexOf(a),j=main.indexOf(b,i);assert.ok(i>=0&&j>i);return main.slice(i,j)};
 const next=ex('function nextCashierCustomer()','\n\n\nfunction renderCarryControls');
 const actions=ex('function scanItem(','\n\nfunction weekBalanceLabel');
 const endDay=ex('function endRetailDay()','\n\nfunction moveRetailActor(');
 const state={phase:'checkout',running:false,day:1,workedDay:0,money:35000,dailyIncome:0,hunger:60,condition:80,weekStats:{workDays:0},dailyIncidents:[],inventory:[],retail:api.createRetail(products),cashierShift:{active:true,served:0,target:4,mistakes:0,revenue:0,margin:0,spawned:4},basket:[],scanned:new Set()};
 for(const x of Object.values(state.retail.items))x.shelf=8;
 const ui={totalInput:{value:'',blur(){}},changeInput:{value:'',blur(){}},checkout:{classList:{remove(){}},setAttribute(){}},cartPanel:{classList:{add(){}}}};
 const cartTotal=()=>state.basket.reduce((n,id)=>n+state.retail.items[id].price,0);
 const stock=()=>Object.values(state.retail.items).reduce((n,x)=>n+x.shelf,0);
 let run;const args={retailGuests:[1,2,3,4],clearRetailGuests(){args.retailGuests.length=0},takeQueuedCustomer(){run.nextCashierCustomer();state.phase='checkout'},state,ui,PRODUCTS:products,CASHIER_CUSTOMERS:[{name:'손님',emoji:'🙂',line:'계산 부탁해요.'}],cartTotal,retailBasket:api.retailBasket,sellRetail:api.sellRetail,retailStockCount:stock,fmt:n=>n+'원',clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),tone(){},toast(){},renderCheckout(){},renderHud(){},renderRetailShelfSigns(){},departRetailGuest(){args.retailGuests.pop()},openCheckout(){state.phase='checkout'},save(){},showRetailPrep(){},document:{body:{classList:{remove(){}}}}};
 run=new Function(...Object.keys(args),next+endDay+actions+';return {nextCashierCustomer,scanItem,submitTotal,chooseCash,submitChange,finishCheckout};')(...Object.values(args));
 run.nextCashierCustomer();
 for(let n=0;n<4&&state.cashierShift;n++){state.basket.forEach((_,i)=>run.scanItem(i));ui.totalInput.value=String(cartTotal());run.submitTotal();run.chooseCash(state.cashierShift.current.tender);ui.changeInput.value=String(state.paid-cartTotal());run.submitChange();assert.equal(state.changeConfirmed,true);await run.finishCheckout()}
 assert.equal(state.cashierShift,null);assert.equal(state.workedDay,1);assert.equal(state.dailyIncome,12000);assert.equal(state.money,47000);assert.equal(state.inventory.length,0);assert.equal(state.basket.length,0);assert.ok(state.retail.sold>0);assert.equal(state.retail.cash,30000+state.retail.revenue);
 await run.finishCheckout();assert.equal(state.money,47000);
});

test('store expansion persists and raises shelf capacity without free upgrades',()=>{const s=api.createRetail(products);const before=s.cash;assert.equal(api.expandRetail(s).ok,true);assert.equal(s.cash,before-20000);assert.equal(s.capacity,16);assert.equal(s.expansionSpent,20000);const cash=s.cash;assert.equal(api.expandRetail(s).ok,false);assert.equal(s.cash,cash);s.items.apple.warehouse=20;api.restockRetail(s,'apple');assert.equal(s.items.apple.shelf,16);assert.equal(api.normalizeRetail(JSON.parse(JSON.stringify(s)),products).capacity,16)});

test('legacy shop saves preserve cash stock and expanded capacity',async()=>{
 const main=await readFile(new URL('./market-walk.js',import.meta.url),'utf8');
 const a=main.indexOf('function ensureRetail()'),b=main.indexOf('\nconst retailPanel',a);assert.ok(a>=0&&b>a);
 const state={shop:{cash:17700,sales:3500,customers:2,capacity:16,stock:Object.fromEntries(products.map(p=>[p.id,{shelf:7,back:9}]))}};
 const ensure=new Function('state','PRODUCTS','productById','normalizeRetail',main.slice(a,b)+';return ensureRetail;')(state,products,id=>products.find(p=>p.id===id),api.normalizeRetail);
 const s=ensure();assert.equal(s.cash,17700);assert.equal(s.capacity,16);assert.equal(s.items.apple.shelf,7);assert.equal(s.items.apple.warehouse,9);assert.equal(s.revenue-s.costOfGoods,0);assert.equal(state.shop,undefined);assert.deepEqual(ensure(),s);
});

test('one-at-a-time restocking preserves unpacked warehouse stock',()=>{
 const s=api.createRetail(products),item=s.items.apple,total=item.shelf+item.warehouse;
 for(let i=0;i<4;i++){const before=item.shelf;assert.ok(api.restockRetail(s,'apple',1).ok);assert.equal(item.shelf,before+1);assert.equal(item.shelf+item.warehouse,total)}
 assert.equal(api.restockRetail(s,'apple',1).ok,false);
 assert.ok(api.orderRetail(s,'apple').ok);
 const before=JSON.stringify(s);assert.equal(api.restockRetail(s,'apple',0).ok,false);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(api.normalizeRetail(JSON.parse(before),products),s);
});
