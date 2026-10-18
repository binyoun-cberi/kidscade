import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./market-retail.js',import.meta.url),'utf8');
const a=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const products=[...a.RETAIL_IDS,...a.EXTRA_RETAIL_IDS].map((id,i)=>({id,price:900+i*400}));
test('upgrades follow rack, warehouse, unlock and staff order without duplicate costs',()=>{
 const s=a.createRetail(products);s.cash=200000;
 assert.equal(a.unlockRetail(s,products).ok,false);assert.equal(a.upgradeWarehouse(s).ok,false);assert.equal(a.hireRetailStaff(s).ok,false);
 assert.ok(a.expandRetail(s).ok);assert.ok(a.upgradeWarehouse(s).ok);assert.ok(a.unlockRetail(s,products).ok);assert.ok(a.hireRetailStaff(s).ok);
 assert.equal(s.cash,143000);assert.equal(s.expansionSpent,57000);assert.equal(Object.keys(s.items).length,8);assert.equal(a.warehouseLimit(s),80);
 const cash=s.cash;assert.equal(a.unlockRetail(s,products).ok,false);assert.equal(a.hireRetailStaff(s).ok,false);assert.equal(s.cash,cash);
 assert.deepEqual(a.normalizeRetail(JSON.parse(JSON.stringify(s)),products),s);
});
test('staff wages charge once per working day and never create debt',()=>{
 const s=a.createRetail(products);s.staff=true;s.cash=3000;
 assert.equal(a.payRetailStaff(s,1).paid,2000);assert.equal(a.payRetailStaff(s,1).paid,0);assert.equal(s.cash,1000);assert.equal(a.payRetailStaff(s,2).ok,false);assert.equal(s.staffPaidDay,1);assert.equal(s.cash,1000);
});
test('three simultaneous baskets reserve distinct stock and settle without overselling',()=>{
 let seed=44;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let run=0;run<1000;run++){
  const s=a.createRetail(products),reservations=[];for(let n=0;n<3;n++)reservations.push(a.reservedRetailBasket(s,products,reservations,random));
  for(const id of a.RETAIL_IDS)assert.ok(reservations.flat().filter(x=>x===id).length<=s.items[id].shelf);
  const before=s.cash;let revenue=0;for(const basket of reservations)if(basket.length){const sale=a.sellRetail(s,basket);assert.ok(sale.ok);revenue+=sale.revenue}
  assert.equal(s.cash,before+revenue);assert.ok(Object.values(s.items).every(x=>x.shelf>=0));
 }
});
test('warehouse expansion raises ordering limits and round trips old saves',()=>{
 const s=a.createRetail(products);s.cash=200000;a.expandRetail(s);a.upgradeWarehouse(s);s.items.apple.warehouse=76;assert.ok(a.orderRetail(s,'apple').ok);assert.equal(a.orderRetail(s,'apple').ok,false);
 const old={cash:1000,capacity:8,items:{apple:{shelf:5,warehouse:30,price:900}}};const loaded=a.normalizeRetail(old,products);assert.equal(loaded.items.apple.warehouse,30);assert.equal(loaded.warehouseLevel,1);assert.equal(loaded.staff,false);
});
test('hired staff walks to a shelf and transfers stock without buying new goods',async()=>{
 const main=await readFile(new URL('./market-walk.js',import.meta.url),'utf8');
 const routeSource=await readFile(new URL('./market-customer-route.js',import.meta.url),'utf8');const {retailPath}=await import('data:text/javascript;base64,'+Buffer.from(routeSource).toString('base64'));
 const fn=main.slice(main.indexOf('function updateRetailStaff('),main.indexOf('function buildRetailExpansion('));
 const motion=main.slice(main.indexOf('function moveRetailActor('),main.indexOf('function updateRetailGuests('));
 const state={retail:a.createRetail(products),cashierShift:{stockClosed:true}},root={position:{x:3.1,y:0,z:1.8},rotation:{y:0}},actor={root,product:null,path:null,waypoint:0,clock:0};let placed=0;
 const args={chooseRetailRestock:a.chooseRetailRestock,retailGuests:[],state,retailStaffModel:actor,retailStaffClock:0,productById:id=>({id,pos:[-3,-2]}),colliders:[],retailPath,restockRetail:a.restockRetail,animateRetailPlacement(){placed++},renderRetailShelfSigns(){},save(){}};
 const tick=new Function(...Object.keys(args),motion+fn+';return updateRetailStaff;')(...Object.values(args));for(let i=0;i<1000&&!placed;i++)tick(.05);
 assert.equal(placed,1);assert.equal(state.retail.items.apple.shelf,3);assert.equal(state.retail.items.apple.warehouse,3);assert.equal(state.cashierShift.stockClosed,false);assert.equal(state.retail.cash,30000);
});
