// Small-store inventory and accounting. Quantities are committed only after payment.
export const RETAIL_IDS=['apple','banana','carrot','bread','donut','tomato'];
export const EXTRA_RETAIL_IDS=['grapes','corn'];
export function warehouseLimit(s){return 40*(s.warehouseLevel||1)}
const safeInt=(n,f=0)=>Number.isFinite(n)?Math.max(0,Math.floor(n)):f;
export function createRetail(products){
 const items={};for(const id of RETAIL_IDS){const p=products.find(p=>p.id===id);if(!p)continue;items[id]={shelf:2,warehouse:4,price:p.price,cost:Math.max(100,Math.round(p.price*.6/100)*100)}}
 return {cash:30000,items,capacity:8,expansionSpent:0,customers:0,revenue:0,costOfGoods:0,ordered:0,sold:0,warehouseLevel:1,unlocked:false,staff:false,staffExpense:0,staffPaidDay:0};
}
export function normalizeRetail(raw,products){
 const s=createRetail(products);if(!raw||typeof raw!=='object')return s;
 s.capacity=raw.capacity===16?16:8;s.warehouseLevel=[2,3].includes(raw.warehouseLevel)?raw.warehouseLevel:1;s.unlocked=!!raw.unlocked&&s.capacity===16;s.staff=!!raw.staff;s.staffExpense=safeInt(raw.staffExpense);s.staffPaidDay=safeInt(raw.staffPaidDay);if(s.unlocked)for(const id of EXTRA_RETAIL_IDS){const p=products.find(p=>p.id===id);if(p)s.items[id]={shelf:0,warehouse:0,price:p.price,cost:Math.max(100,Math.round(p.price*.6/100)*100)}}
 for(const k of ['cash','revenue','costOfGoods','ordered','sold','expansionSpent','customers'])s[k]=safeInt(raw[k],s[k]);
 for(const id of Object.keys(s.items)){const r=raw.items?.[id];if(!r)continue;const base=products.find(p=>p.id===id).price;s.items[id].shelf=Math.min(s.capacity,safeInt(r.shelf,2));s.items[id].warehouse=Math.min(warehouseLimit(s),safeInt(r.warehouse,s.items[id].warehouse));s.items[id].price=Math.max(Math.ceil(base*.8/100)*100,Math.min(Math.floor(base*1.4/100)*100,safeInt(r.price,base)))}
 return s;
}
export function orderRetail(s,id){const item=s.items[id];if(!item)return {ok:false,message:'취급하지 않는 상품이에요.'};const cost=item.cost*4;if(item.warehouse>warehouseLimit(s)-4)return {ok:false,message:'창고가 가득 찼어요. 먼저 진열해 주세요.'};if(s.cash<cost)return {ok:false,message:'가게 운영비가 부족해요.'};s.cash-=cost;s.ordered+=cost;item.warehouse+=4;return {ok:true,message:'한 상자 4개가 입고됐어요.'}}
export function restockRetail(s,id,limit=Infinity){const item=s.items[id];if(!item||!item.warehouse)return {ok:false,message:'창고에 상품이 없어요. 먼저 발주해 주세요.'};const n=Math.min(item.warehouse,s.capacity-item.shelf,Math.max(0,Math.floor(limit)));if(n<=0)return {ok:false,message:'진열대가 가득 찼어요.'};item.warehouse-=n;item.shelf+=n;return {ok:true,message:n+'개를 진열했어요.'}}
export function priceRetail(s,id,delta,products){const item=s.items[id],base=products.find(p=>p.id===id)?.price;if(!item||!base)return;item.price=Math.max(Math.ceil(base*.8/100)*100,Math.min(Math.floor(base*1.4/100)*100,item.price+delta))}
export function retailBasket(s,products,random=Math.random){
 const remaining=Object.fromEntries(Object.entries(s.items).map(([id,x])=>[id,x.shelf])),basket=[],count=2+Math.floor(random()*4);
 for(let i=0;i<count;i++){const choices=Object.keys(remaining).filter(id=>remaining[id]>0);if(!choices.length)break;const weights=choices.map(id=>{const base=products.find(p=>p.id===id).price;return Math.max(.1,2-s.items[id].price/base)});let pick=random()*weights.reduce((a,b)=>a+b,0),id=choices[choices.length-1];for(let j=0;j<choices.length;j++){pick-=weights[j];if(pick<0){id=choices[j];break}}basket.push(id);remaining[id]--}
 return basket;
}
export function sellRetail(s,basket){
 const counts={};for(const id of basket)counts[id]=(counts[id]||0)+1;
 for(const [id,n] of Object.entries(counts))if(!s.items[id]||s.items[id].shelf<n)return {ok:false,revenue:0,margin:0};
 let revenue=0,cost=0;for(const [id,n] of Object.entries(counts)){const x=s.items[id];x.shelf-=n;revenue+=x.price*n;cost+=x.cost*n}
 s.customers++;s.cash+=revenue;s.revenue+=revenue;s.costOfGoods+=cost;s.sold+=basket.length;return {ok:true,revenue,margin:revenue-cost};
}

export function expandRetail(s){if(s.capacity>=16)return {ok:false,message:'진열대 확장을 이미 마쳤어요.'};if(s.cash<20000)return {ok:false,message:'확장에는 운영비 20,000원이 필요해요.'};s.cash-=20000;s.expansionSpent+=20000;s.capacity=16;return {ok:true,message:'상품마다 16개까지 진열할 수 있어요.'}}

export function upgradeWarehouse(s){if(s.capacity<16)return {ok:false,message:'먼저 추가 진열대를 설치해 주세요.'};if(s.warehouseLevel>=3)return {ok:false,message:'창고 확장을 모두 마쳤어요.'};const cost=15000*(s.warehouseLevel||1);if(s.cash<cost)return {ok:false,message:'창고 확장 운영비가 부족해요.'};s.cash-=cost;s.expansionSpent+=cost;s.warehouseLevel=(s.warehouseLevel||1)+1;return {ok:true,message:'창고 선반을 늘렸어요. 상품마다 '+warehouseLimit(s)+'개까지 보관해요.'}}
export function unlockRetail(s,products){if(s.capacity<16||s.warehouseLevel<2)return {ok:false,message:'추가 진열대와 창고 2단계가 필요해요.'};if(s.unlocked)return {ok:false,message:'이미 새 상품을 취급하고 있어요.'};if(s.cash<10000)return {ok:false,message:'새 상품 계약에는 10,000원이 필요해요.'};const goods=EXTRA_RETAIL_IDS.map(id=>products.find(p=>p.id===id));if(goods.some(p=>!p))return {ok:false,message:'새 상품 자료를 준비하지 못했어요.'};s.cash-=10000;s.expansionSpent+=10000;s.unlocked=true;for(const p of goods)s.items[p.id]={shelf:0,warehouse:0,price:p.price,cost:Math.max(100,Math.round(p.price*.6/100)*100)};return {ok:true,message:'포도와 옥수수 발주가 열렸어요.'}}
export function hireRetailStaff(s){if(!s.unlocked)return {ok:false,message:'새 상품을 취급한 뒤 직원을 고용할 수 있어요.'};if(s.staff)return {ok:false,message:'이미 진열 직원과 일하고 있어요.'};if(s.cash<12000)return {ok:false,message:'채용에는 12,000원이 필요해요.'};s.cash-=12000;s.expansionSpent+=12000;s.staff=true;return {ok:true,message:'진열 직원을 고용했어요. 출근일마다 급여 2,000원이 들어요.'}}
export function payRetailStaff(s,day){if(!s.staff||s.staffPaidDay===day)return {ok:true,paid:0};if(s.cash<2000)return {ok:false,message:'직원 급여 2,000원이 부족해요. 오늘은 직접 진열해 주세요.'};s.cash-=2000;s.staffExpense+=2000;s.staffPaidDay=day;return {ok:true,paid:2000}}
export function reservedRetailBasket(s,products,reservations,random=Math.random){
 const available={...s,items:Object.fromEntries(Object.entries(s.items).map(([id,x])=>[id,{...x}]))};
 for(const basket of reservations)for(const id of basket)if(available.items[id])available.items[id].shelf=Math.max(0,available.items[id].shelf-1);
 return retailBasket(available,products,random);
}
