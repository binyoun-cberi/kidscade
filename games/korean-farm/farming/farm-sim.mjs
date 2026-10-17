// Pure farming simulation for Korean Farm. No DOM, Three.js, network or wall-clock dependence.
import {FIELD_DEFS,makeFarmState,validateFarmState} from '../world.mjs';
export const FARM_SAVE_VERSION=2;
export const DAYS_PER_SEASON=14;
export const CROPS=Object.freeze({
  rice:Object.freeze({name:'벼',seed:'rice',produce:'rice',days:14,baseYield:7,growthPerDay:.087,price:240}),
  carrot:Object.freeze({name:'당근',seed:'carrot',produce:'carrot',days:4,baseYield:5,growthPerDay:.29,price:120}),
  corn:Object.freeze({name:'옥수수',seed:'corn',produce:'corn',days:8,baseYield:4,growthPerDay:.15,price:190})
});
export const SEASONS=Object.freeze(['봄','여름','가을','겨울']);
const minmax=(v,min,max)=>Math.max(min,Math.min(max,v));
const validNumber=(v,defaultValue,min,max)=>Number.isFinite(v)?minmax(v,min,max):defaultValue;
function speciesForPlot(def){return def.kind==='rice'?'rice':def.kind==='carrot'?'carrot':'corn'}
function createField(def){
  const rice=def.kind==='rice',growth=rice?[.13,.37,.66,1][def.stage-1]:def.kind==='carrot'?.83:.58;
  return {id:def.id,kind:def.kind,crop:speciesForPlot(def),planted:true,growth,
    tilled:true,waterDepthCm:rice?3:0,gateOpen:false,
    moisture:rice?.85:.6,nitrogen:.74,weeds:.08,health:1,harvestCount:0};
}
export function createFarmState(){
  return {...makeFarmState(),version:FARM_SAVE_VERSION,day:1,minute:7*60,energy:100,
    money:4200,weather:'sunny',inventory:{seedRice:8,seedCarrot:8,seedCorn:6,fertilizer:5,rice:0,carrot:0,corn:0},
    fields:FIELD_DEFS.map(createField),stats:{harvests:0,sales:0,earnings:0},seenPlots:[]};
}
export function restoreFarmState(raw){
  if(!raw||typeof raw!=='object')return createFarmState();
  const current=createFarmState();
  const old=validateFarmState({...raw,version:1});
  current.player={...old.player};current.camera={...old.camera};
  current.selected=old.selected;current.seenPlots=[...old.seenPlots];current.visits=current.seenPlots.length;
  if(raw.version===1){
    // PR 1's editable rice preview stages become starting visual growth levels.
    current.fields.forEach(f=>{
      const oldPlot=old.plots.find(p=>p.id===f.id);
      if(oldPlot&&f.kind==='rice')f.growth=[.13,.37,.66,1][oldPlot.stage-1];
    });
    return current;
  }
  if(raw.version!==FARM_SAVE_VERSION||!Array.isArray(raw.fields))return current;
  current.day=validNumber(raw.day,1,1,100000)|0;
  current.minute=validNumber(raw.minute,420,420,1320)|0;
  current.energy=validNumber(raw.energy,100,0,100);
  current.money=validNumber(raw.money,4200,0,100000000)|0;
  current.weather=typeof raw.weather==='string'&&['sunny','cloudy','rain','storm'].includes(raw.weather)?raw.weather:weatherForDay(current.day);
  const inv=raw.inventory||{};
  for(const k of Object.keys(current.inventory))current.inventory[k]=validNumber(inv[k],current.inventory[k],0,1000000)|0;
  const oldFields=new Map(raw.fields.filter(f=>typeof f?.id==='string').map(f=>[f.id,f]));
  current.fields=FIELD_DEFS.map(def=>{
    const base=createField(def),saved=oldFields.get(def.id);
    if(!saved)return base;
    base.planted=saved.planted===true;
    base.tilled=saved.tilled===true;
    base.growth=validNumber(saved.growth,base.growth,0,1);
    base.waterDepthCm=def.kind==='rice'?validNumber(saved.waterDepthCm,base.waterDepthCm,0,10):0;
    base.gateOpen=def.kind==='rice'&&saved.gateOpen===true;
    for(const key of ['moisture','nitrogen','weeds','health'])base[key]=validNumber(saved[key],base[key],0,1);
    base.harvestCount=validNumber(saved.harvestCount,0,0,1000000)|0;
    if(!base.planted)base.growth=0;
    return base;
  });
  for(const k of Object.keys(current.stats))current.stats[k]=validNumber(raw.stats?.[k],0,0,100000000)|0;
  return current;
}
export function weatherForDay(day){
  if(day===1)return 'sunny';
  const season=Math.floor(((day-1)%56)/14);
  const hash=Math.sin((day+159)*127.1+93.7)*43758.5453;
  const x=hash-Math.floor(hash);
  if(x<(.05+season*.015))return 'storm';
  if(x<(.29+season*.024))return 'rain';
  if(x<.55)return 'cloudy';
  return 'sunny';
}
export function calendar(day){
  const index=(Math.max(1,day)-1)%56;
  return {year:Math.floor((Math.max(1,day)-1)/56)+1,season:SEASONS[Math.floor(index/DAYS_PER_SEASON)],
    seasonDay:index%DAYS_PER_SEASON+1};
}
export function fieldById(state,id){return state.fields.find(f=>f.id===id)||null}
export function visualStage(field){
  if(!field?.planted)return 0;
  if(field.growth<.24)return 1;
  if(field.growth<.49)return 2;
  if(field.growth<.83)return 3;
  return 4;
}
export function fieldCondition(field){
  if(!field.planted)return '비어 있는 밭';
  if(field.growth>=.999)return '수확할 수 있어요';
  if(field.health<.45)return '상태가 좋지 않아요';
  if(field.kind==='rice'&&(field.waterDepthCm<1||field.waterDepthCm>7))return '논물 상태를 살펴보세요';
  if(field.moisture<.25)return '물이 부족해요';
  if(field.nitrogen<.23)return '양분이 부족해요';
  if(field.weeds>.55)return '잡초가 많아요';
  return '잘 자라고 있어요';
}
const seedKey={rice:'seedRice',carrot:'seedCarrot',corn:'seedCorn'};
const energyCost={till:8,plant:5,water:4,gate:2,weed:5,fertilize:4,harvest:7};
function success(state,field,message,extra={}){
  state.energy=minmax(state.energy-(energyCost[extra.action]||0),0,100);
  state.minute=minmax(state.minute+20,420,1320);
  return {ok:true,message,fieldId:field?.id||null,...extra};
}
// Validation is shared by the UI and impact moment. Never charge a cost while
// walking to a plot, and recheck when the tool actually touches its target.
export function canApplyFarmAction(state,id,action){
  const f=fieldById(state,id);
  if(!f)return {ok:false,message:'농사짓는 구역을 선택해 주세요.'};
  if(!Object.hasOwn(energyCost,action))return {ok:false,message:'아직 사용할 수 없는 도구예요.'};
  if(state.energy<energyCost[action])return {ok:false,message:'오늘은 많이 일했어요. 집에서 쉬어 주세요.'};
  if(action==='till'&&f.planted)return {ok:false,message:'작물이 자라는 동안은 땅을 갈 수 없어요.'};
  if(action==='plant'){
    if(f.planted)return {ok:false,message:'이미 작물이 심어져 있어요.'};
    if(!f.tilled)return {ok:false,message:'먼저 괭이로 땅을 갈아 주세요.'};
    if(!state.inventory[seedKey[f.crop]])return {ok:false,message:'씨앗이 부족해요. 장터에서 씨앗을 구입해 주세요.'};
  }
  if(action==='water'&&f.kind==='rice')return {ok:false,message:'논은 물꼬를 열어 물을 관리해요.'};
  if(action==='gate'&&f.kind!=='rice')return {ok:false,message:'물꼬는 논에서만 조절할 수 있어요.'};
  if(action==='fertilize'&&!state.inventory.fertilizer)return {ok:false,message:'퇴비가 다 떨어졌어요.'};
  if(action==='harvest'&&(!f.planted||f.growth<.999))
    return {ok:false,message:'아직 익지 않았어요. 생육 상태를 살펴보세요.'};
  return {ok:true};
}
export function applyFarmAction(state,id,action){
  const validity=canApplyFarmAction(state,id,action);
  if(!validity.ok)return validity;
  const field=fieldById(state,id);
  if(!field)return {ok:false,message:'농사짓는 구역을 선택해 주세요.'};
  if(!Object.hasOwn(energyCost,action))return {ok:false,message:'아직 사용할 수 없는 도구예요.'};
  if(state.energy<energyCost[action])return {ok:false,message:'오늘은 많이 일했어요. 집에서 쉬어 주세요.'};
  if(action==='till'){
    if(field.planted)return {ok:false,message:'작물이 자라는 동안은 땅을 갈 수 없어요.'};
    field.tilled=true;field.weeds=minmax(field.weeds-.3,0,1);
    return success(state,field,'흙을 고르게 갈아 씨앗을 심을 준비를 했어요.',{action});
  }
  if(action==='plant'){
    if(field.planted)return {ok:false,message:'이미 작물이 심어져 있어요.'};
    if(!field.tilled)return {ok:false,message:'먼저 괭이로 땅을 갈아 주세요.'};
    const species=field.crop,key=seedKey[species];
    if(!state.inventory[key])return {ok:false,message:'씨앗이 부족해요. 먼저 수확한 작물을 판매해 보세요.'};
    state.inventory[key]--;
    field.planted=true;field.growth=.025;field.health=1;field.weeds=.03;
    return success(state,field,(species==='rice'?'어린 모를 논에 옮겨 심었어요.':CROPS[species].name+' 씨앗을 심었어요.'),{action});
  }
  if(action==='gate'){
    if(field.kind!=='rice')return {ok:false,message:'물꼬는 논에서만 조절할 수 있어요.'};
    field.gateOpen=!field.gateOpen;
    field.waterDepthCm=minmax(field.waterDepthCm+(field.gateOpen?1.2:-.6),0,10);
    field.moisture=minmax(field.moisture+(field.gateOpen?.04:-.02),0,1);
    return success(state,field,field.gateOpen?'물꼬를 열었어요. 농수로의 물이 논으로 들어옵니다.':'물꼬를 닫았어요. 시간이 지나면 물이 줄어들 수 있어요.',{action});
  }
  if(action==='water'){
    if(field.kind==='rice')return {ok:false,message:'논은 물꼬를 열어 물을 관리해요.'};
    field.moisture=minmax(field.moisture+.37,0,1);
    return success(state,field,'물뿌리개로 밭을 적셨어요.',{action});
  }
  if(action==='weed'){
    field.weeds=minmax(field.weeds-.42,0,1);
    return success(state,field,'잡초를 제거해 농작물이 잘 자라도록 했어요.',{action});
  }
  if(action==='fertilize'){
    if(!state.inventory.fertilizer)return {ok:false,message:'퇴비가 다 떨어졌어요.'};
    state.inventory.fertilizer--;field.nitrogen=minmax(field.nitrogen+.34,0,1);
    return success(state,field,'거름을 줘서 토양의 양분을 보충했어요.',{action});
  }
  if(action==='harvest'){
    if(!field.planted||field.growth<.999)return {ok:false,message:'아직 익지 않았어요. 생육 상태를 살펴보세요.'};
    const crop=CROPS[field.crop];
    const quality=minmax(.55+field.health*.40+field.nitrogen*.15-field.weeds*.15,.45,1.15);
    const quantity=Math.max(1,Math.round(crop.baseYield*quality));
    state.inventory[crop.produce]+=quantity;field.planted=false;field.growth=0;
    field.tilled=false;field.weeds=minmax(field.weeds+.08,0,1);field.harvestCount++;
    state.stats.harvests++;
    return success(state,field,crop.name+' '+quantity+'개를 수확해 창고에 보관했어요.',{action,quantity,produce:crop.produce,quality});
  }
}
export function advanceFarmDay(state){
  const previous=state.day;
  state.day++;
  state.minute=420;state.energy=100;state.weather=weatherForDay(state.day);
  const c=calendar(state.day);
  const rain=state.weather==='storm'?.36:state.weather==='rain'?.23:0;
  const changes=[];
  for(const f of state.fields){
    const before=visualStage(f),oldHealthy=f.health;
    if(f.kind==='rice'){
      // Shallow paddies lose water through drainage/evaporation; open gates refill them.
      const refill=f.gateOpen?2.6:0;
      f.waterDepthCm=minmax(f.waterDepthCm+rain*5+refill-(c.season==='여름'?1.65:1.25),0,10);
      f.moisture=minmax(.35+f.waterDepthCm*.08+rain*.45,0,1);
    }else{
      f.moisture=minmax(f.moisture+rain-(c.season==='여름'?.16:.11),0,1);
    }
    f.weeds=minmax(f.weeds+(.045+rain*.06),0,1);
    if(!f.planted){
      f.nitrogen=minmax(f.nitrogen+.012,0,1);continue;
    }
    const tooDry=f.kind==='rice'?f.waterDepthCm<1:f.moisture<.28;
    const tooWet=f.kind==='rice'?f.waterDepthCm>7:f.moisture>.95;
    const winter=c.season==='겨울';
    const nutrition=f.nitrogen<.18;
    const stress=(tooDry?.072:0)+(tooWet?.045:0)+(nutrition?.035:0)+(f.weeds>.53?.04:0)+(winter?.10:0);
    const recover=stress===0?.018:0;
    f.health=minmax(f.health-stress+recover,.12,1);
    let growth=CROPS[f.crop].growthPerDay;
    if(winter)growth*=.12;
    else if(c.season==='여름')growth*=1.08;
    growth*=minmax(.52+f.health*.48,.2,1);
    if(tooDry||tooWet)growth*=.52;
    if(nutrition)growth*=.55;
    f.growth=minmax(f.growth+growth,0,1);
    f.nitrogen=minmax(f.nitrogen-.029*(f.crop==='rice'?1.15:1),0,1);
    const after=visualStage(f);
    if(before!==after)changes.push({fieldId:f.id,from:before,to:after});
    if(f.growth>=.999&&before!==4)changes.push({fieldId:f.id,ready:true});
    if(oldHealthy>=.45&&f.health<.45)changes.push({fieldId:f.id,warning:true});
  }
  return {ok:true,previousDay:previous,newDay:state.day,weather:state.weather,changes,
    message:c.season+' '+c.seasonDay+'일 아침이에요. '+(state.weather==='rain'?'밤새 비가 내려 논밭이 촉촉해요.':state.weather==='storm'?'거센 비가 지나갔어요.':'새로운 하루가 시작됐어요.')};
}

export const SUPPLY_PRICES=Object.freeze({seedRice:100,seedCarrot:60,seedCorn:80,fertilizer:130});
export function buyFarmSupply(state,key,count=1){
  if(!Object.hasOwn(SUPPLY_PRICES,key))return {ok:false,message:'그 물건은 이 장터에서 팔지 않아요.'};
  if(!Number.isInteger(count)||count<1||count>99)return {ok:false,message:'구매 수량을 확인해 주세요.'};
  const price=SUPPLY_PRICES[key]*count;
  if(state.money<price)return {ok:false,message:'돈이 부족해요. 수확물을 판매해 보세요.'};
  state.money-=price;state.inventory[key]=(state.inventory[key]||0)+count;
  return {ok:true,count,cost:price,message:'농자재를 '+price.toLocaleString('ko-KR')+'원에 구입했어요.'};
}
export function sellAllProduce(state){
  const sold={},total=Object.keys(CROPS).reduce((sum,k)=>{
    const count=state.inventory[k]||0;if(count>0)sold[k]=count;
    return sum+count*CROPS[k].price;
  },0);
  if(!total)return {ok:false,total:0,message:'아직 판매할 수확물이 없어요.'};
  for(const key of Object.keys(CROPS))state.inventory[key]=0;
  state.money+=total;state.stats.sales++;state.stats.earnings+=total;
  return {ok:true,sold,total,message:'수확물을 '+total.toLocaleString('ko-KR')+'원에 판매했어요.'};
}
