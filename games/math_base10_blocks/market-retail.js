// Small-store inventory and accounting. Quantities are committed only after payment.
export const RETAIL_IDS=['apple','banana','carrot','bread','donut','tomato'];
const safeInt=(n,f=0)=>Number.isFinite(n)?Math.max(0,Math.floor(n)):f;
export function createRetail(products){
 const items={};for(const id of RETAIL_IDS){const p=products.find(p=>p.id===id);if(!p)continue;items[id]={shelf:2,warehouse:4,price:p.price,cost:Math.max(100,Math.round(p.price*.6/100)*100)}}
 return {cash:30000,items,capacity:8,expansionSpent:0,customers:0,revenue:0,costOfGoods:0,ordered:0,sold:0};
}
export function normalizeRetail(raw,products){
 const s=createRetail(products);if(!raw||typeof raw!=='object')return s;
 s.capacity=raw.capacity===16?16:8;
 for(const k of ['cash','revenue','costOfGoods','ordered','sold','expansionSpent','customers'])s[k]=safeInt(raw[k],s[k]);
 for(const id of Object.keys(s.items)){const r=raw.items?.[id];if(!r)continue;const base=products.find(p=>p.id===id).price;s.items[id].shelf=Math.min(s.capacity,safeInt(r.shelf,2));s.items[id].warehouse=Math.min(40,safeInt(r.warehouse,4));s.items[id].price=Math.max(Math.ceil(base*.8/100)*100,Math.min(Math.floor(base*1.4/100)*100,safeInt(r.price,base)))}
 return s;
}
export function orderRetail(s,id){const item=s.items[id];if(!item)return {ok:false,message:'취급하지 않는 상품이에요.'};const cost=item.cost*4;if(item.warehouse>36)return {ok:false,message:'창고가 가득 찼어요. 먼저 진열해 주세요.'};if(s.cash<cost)return {ok:false,message:'가게 운영비가 부족해요.'};s.cash-=cost;s.ordered+=cost;item.warehouse+=4;return {ok:true,message:'한 상자 4개가 입고됐어요.'}}
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
