// Pure farming simulation for Korean Farm. No DOM, Three.js, network or wall-clock dependence.
import {FIELD_DEFS,makeFarmState,validateFarmState} from '../world.mjs';
import {normalizeSeedlings,fullSeedlings,emptySeedlings,seedlingCount} from './rice-transplant.mjs';
import {WORK_STRIPS,PATCH_ENERGY,validWorkStrip,newFieldWork,restoreFieldWork,completedWorkStrips} from './field-work.mjs';
export const FARM_SAVE_VERSION=7;
export const BASKET_CAPACITY=20;
export const CART_CAPACITY=60;
export const DAYS_PER_SEASON=14;
export const CROPS=Object.freeze({
  rice:Object.freeze({name:'벼',seed:'rice',produce:'rice',days:14,baseYield:7,growthPerDay:.087,price:240}),
  carrot:Object.freeze({name:'당근',seed:'carrot',produce:'carrot',days:4,baseYield:5,growthPerDay:.29,price:120}),
  corn:Object.freeze({name:'옥수수',seed:'corn',produce:'corn',days:8,baseYield:4,growthPerDay:.15,price:190})
});
export const SEASONS=Object.freeze(['봄','여름','가을','겨울']);
export const SEASONAL_FESTIVALS=Object.freeze({
  '봄':Object.freeze({title:'봄 모종 나눔',produce:'carrot',count:3,reward:720,seed:'seedRice',seedCount:2,
    story:'봄맞이 모종 나눔에 당근을 가져다주면 이웃들이 볍씨를 나눠 줘요.'}),
  '여름':Object.freeze({title:'여름 새참 잔치',produce:'corn',count:2,reward:820,seed:'seedCarrot',seedCount:3,
    story:'더운 날 함께 일한 마을 사람들에게 옥수수 새참을 대접해요.'}),
  '가을':Object.freeze({title:'가을 추수 잔치',produce:'rice',count:5,reward:1650,seed:'seedCorn',seedCount:2,
    story:'추수를 마친 마을 사람들이 함께 먹을 쌀을 모으고 있어요.'}),
  '겨울':Object.freeze({title:'겨울 이웃 나눔',produce:'carrot',count:3,reward:900,seed:'seedRice',seedCount:3,
    story:'겨울에 자라는 작물은 적어요. 미리 저장한 당근으로 이웃을 도와요.'})
});
export const FARM_UPGRADES=Object.freeze({
  sickle:Object.freeze({name:'잘 드는 낫',price:900,description:'수확 손실을 줄여 수확량이 2개 늘어나고 낫질에 기운이 덜 들어요.'}),
  hoe:Object.freeze({name:'가벼운 괭이',price:1100,description:'괭이질에 쓰는 기운이 절반으로 줄어요.'}),
  channel:Object.freeze({name:'논 수로 정비',price:2200,description:'논의 물이 덜 빠져 가뭄에 대비하기 쉬워져요.'}),
  cart:Object.freeze({name:'농장 손수레',price:900,description:'창고에서 손수레를 끌면 한 번에 60개를 싣고 장터까지 옮길 수 있어요. 대신 걷는 속도는 느려져요.'})
});
const minmax=(v,min,max)=>Math.max(min,Math.min(max,v));
const validNumber=(v,defaultValue,min,max)=>Number.isFinite(v)?minmax(v,min,max):defaultValue;
function speciesForPlot(def){return def.kind==='rice'?'rice':def.kind==='carrot'?'carrot':'corn'}
function createField(def){
  const rice=def.kind==='rice',growth=rice?[.13,.37,.66,1][def.stage-1]:def.kind==='carrot'?.83:.58;
  const practice=def.id==='rice-1';
  return {id:def.id,kind:def.kind,crop:speciesForPlot(def),planted:!practice,growth:practice?0:growth,
    transplants:rice?(practice?emptySeedlings():fullSeedlings()):null,
    tilled:true,work:newFieldWork(true),waterDepthCm:rice?3:0,gateOpen:false,gateLevel:0,
    moisture:rice?.85:.6,nitrogen:.74,weeds:.08,health:1,harvestCount:0};
}
export function createFarmState(){
  return {...makeFarmState(),version:FARM_SAVE_VERSION,day:1,minute:7*60,energy:100,
    money:4200,weather:'sunny',compostStock:24,inventory:{seedRice:8,seedCarrot:8,seedCorn:6,fertilizer:0,rice:0,carrot:0,corn:0},
    fields:FIELD_DEFS.map(createField),cargo:{rice:0,carrot:0,corn:0},transport:{cartAttached:false},
    village:{lastTalkDay:0,friendship:0,giftReceived:false},festival:{completedKey:'',activityKey:'',activityDoneKey:'',activitySteps:[]},
    stats:{harvests:0,sales:0,earnings:0,deliveries:0,festivals:0,festivalActivities:0},
    upgrades:{sickle:false,hoe:false,channel:false,cart:false},market:{lastRepeatDay:0},seenPlots:[]};
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
      if(oldPlot&&f.kind==='rice'){
        f.growth=[.13,.37,.66,1][oldPlot.stage-1];
        f.planted=true;f.transplants=fullSeedlings();
      }
    });
    return current;
  }
  // V2–V5 saves retain their soil, seedlings, harvest strips, cash and crops.
  if(![2,3,4,5,6,FARM_SAVE_VERSION].includes(raw.version)||!Array.isArray(raw.fields))return current;
  current.day=validNumber(raw.day,1,1,100000)|0;
  current.minute=validNumber(raw.minute,420,420,1320)|0;
  current.energy=validNumber(raw.energy,100,0,100);
  current.compostStock=validNumber(raw.compostStock,24,0,24)|0;
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
    if(def.kind==='rice')base.transplants=normalizeSeedlings(saved.transplants,base.planted);
    base.growth=validNumber(saved.growth,base.growth,0,1);
    base.waterDepthCm=def.kind==='rice'?validNumber(saved.waterDepthCm,base.waterDepthCm,0,10):0;
    base.gateOpen=def.kind==='rice'&&saved.gateOpen===true;
    base.gateLevel=def.kind==='rice'?(raw.version>=4?
      validNumber(saved.gateLevel,base.gateOpen?2:0,0,2)|0:(base.gateOpen?2:0)):0;
    base.gateOpen=base.gateLevel>0;
    for(const key of ['moisture','nitrogen','weeds','health'])base[key]=validNumber(saved[key],base[key],0,1);
    base.harvestCount=validNumber(saved.harvestCount,0,0,1000000)|0;
    // Old v2 saves without strip data remain fully tilled and ready to play.
    base.work=restoreFieldWork(saved.work,base);
    if(!base.planted)base.growth=0;
    return base;
  });
  for(const k of Object.keys(current.stats))current.stats[k]=validNumber(raw.stats?.[k],0,0,100000000)|0;
  if(raw.version>=3){
    for(const key of Object.keys(FARM_UPGRADES))current.upgrades[key]=raw.upgrades?.[key]===true;
    current.market.lastRepeatDay=validNumber(raw.market?.lastRepeatDay,0,0,current.day)|0;
  }
  if(raw.version>=5)current.transport.cartAttached=current.upgrades.cart&&raw.transport?.cartAttached===true;
  if(raw.version>=5){
    current.village.lastTalkDay=validNumber(raw.village?.lastTalkDay,0,0,current.day)|0;
    current.village.friendship=validNumber(raw.village?.friendship,0,0,5)|0;
    current.village.giftReceived=raw.village?.giftReceived===true;
  }
  if(raw.version>=6){
    const key=raw.festival?.completedKey;
    current.festival.completedKey=typeof key==='string'&&/^\d{1,5}:(봄|여름|가을|겨울)$/.test(key)?key:'';
  }
  if(raw.version>=7){
    const festivalKey=/^\d{1,5}:(봄|여름|가을|겨울)$/;
    const done=raw.festival?.activityDoneKey;
    const key=raw.festival?.activityKey;
    current.festival.activityDoneKey=typeof done==='string'&&festivalKey.test(done)?done:'';
    current.festival.activityKey=typeof key==='string'&&festivalKey.test(key)?key:'';
    const choices=raw.festival?.activitySteps;
    current.festival.activitySteps=Array.isArray(choices)?choices.filter(x=>typeof x==='string'&&/^[a-z0-9]{1,16}$/.test(x)).slice(0,5):[];
    current.stats.festivalActivities=validNumber(raw.stats?.festivalActivities,0,0,100000)|0;
  }
  if(raw.version>=4)for(const crop of Object.keys(CROPS))
    current.cargo[crop]=validNumber(raw.cargo?.[crop],0,0,CART_CAPACITY)|0;
  // Treat invalid/overfilled imported baskets conservatively: overflow returns to storage.
  let room=cargoCapacity(current);
  for(const crop of Object.keys(CROPS)){
    const count=Math.min(room,current.cargo[crop]);
    current.inventory[crop]+=current.cargo[crop]-count;
    current.cargo[crop]=count;room-=count;
  }
  return current;
}
export function purchaseFarmUpgrade(state,key){
  const upgrade=FARM_UPGRADES[key];
  if(!upgrade)return {ok:false,message:'그 도구는 아직 장터에 없어요.'};
  if(state.upgrades?.[key])return {ok:false,message:'이미 갖고 있는 농장 도구예요.'};
  if((state.stats?.sales||0)<1)return {ok:false,message:'첫 수확을 팔고 나면 농기구를 개선할 수 있어요.'};
  if(state.money<upgrade.price)return {ok:false,message:'돈이 부족해요. 수확물이나 마을 부탁으로 돈을 모아 보세요.'};
  state.money-=upgrade.price;
  state.upgrades[key]=true;
  return {ok:true,key,price:upgrade.price,message:upgrade.name+'을(를) 마련했어요. 농장에서 사용해 보세요!'};
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
export function seasonalFestival(state){
  const c=calendar(state.day),details=SEASONAL_FESTIVALS[c.season];
  const key=c.year+':'+c.season;
  return {...details,key,season:c.season,startsIn:Math.max(0,7-c.seasonDay),daysLeft:Math.max(0,14-c.seasonDay),
    open:c.seasonDay>=7&&c.seasonDay<=13,completed:state.festival?.completedKey===key};
}
export function fulfillSeasonalFestival(state){
  const event=seasonalFestival(state);
  if(event.completed)return {ok:false,message:'이번 계절의 마을 행사는 이미 도왔어요.'};
  if(!event.open)return {ok:false,message:event.startsIn?'행사는 '+event.startsIn+'일 후에 열려요.':'이번 계절의 행사는 끝났어요.'};
  if((state.cargo?.[event.produce]||0)<event.count)
    return {ok:false,event,message:CROPS[event.produce].name+' '+event.count+'개를 창고에서 싣고 와야 해요.'};
  state.cargo[event.produce]-=event.count;
  state.money+=event.reward;
  state.inventory[event.seed]=(state.inventory[event.seed]||0)+event.seedCount;
  state.festival={...state.festival,completedKey:event.key};
  state.stats.festivals=(state.stats.festivals||0)+1;
  return {ok:true,event,reward:event.reward,seed:event.seed,seedCount:event.seedCount,
    message:event.title+'에 참여했어요! '+event.reward.toLocaleString('ko-KR')+'원과 씨앗 '+event.seedCount+'묶음을 받았어요.'};
}
export function tomorrowForecast(state){
  const weather=weatherForDay(state.day+1),c=calendar(state.day+1);
  const advice={sunny:'비가 오지 않아요. 밭의 수분과 논물을 살펴보세요.',
    cloudy:'구름이 많아요. 논밭의 상태를 평소처럼 확인해요.',
    rain:'비가 예보됐어요. 밭의 물주기를 줄이고 논 수위를 살펴보세요.',
    storm:'큰비가 예보됐어요! 수문을 줄여 열거나 닫고 논물이 넘치지 않게 대비하세요.'};
  return {weather,season:c.season,seasonDay:c.seasonDay,advice:advice[weather]};
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
export function fieldCareAdvice(field){
  if(!field)return '논밭을 선택하면 작물 돌보는 법을 볼 수 있어요.';
  if(!field.planted)return '밭이 비어 있어요. 논은 모내기, 밭은 괭이질 뒤 씨앗 심기로 새 작물을 시작해요.';
  if(field.kind==='rice'&&field.waterDepthCm<1)return '논물이 1cm보다 얕아요. 물꼬를 열어 보충해요. 물이 부족하면 벼의 생장과 건강이 나빠질 수 있어요.';
  if(field.kind==='rice'&&field.waterDepthCm>7)return '논물이 7cm보다 깊어요. 물꼬를 닫아 수위를 낮춰요. 너무 깊은 물은 벼의 생장을 늦출 수 있어요.';
  if(field.kind!=='rice'&&field.moisture<.28)return '흙이 말랐어요. 물을 주면 수분 부족으로 느려진 생장을 도울 수 있어요.';
  if(field.kind!=='rice'&&field.moisture>.95)return '흙이 지나치게 젖었어요. 오늘은 물을 더 주지 말고 상태를 살펴보세요.';
  if(field.nitrogen<.18)return '흙의 양분이 부족해요. 퇴비를 주면 작물이 양분 부족으로 받는 부담을 줄일 수 있어요.';
  if(field.weeds>.53)return '잡초가 많아요. 김매기로 잡초를 줄이면 작물이 받는 부담이 줄어요.';
  if(field.growth>=.999)return '수확할 때예요. 다섯 구역을 모두 베면 수확물이 창고에 들어와요.';
  return '현재 물·양분·잡초 상태는 생장 기준 안에 있어요. 하루를 보내고 작물 변화를 살펴보세요.';
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
    if(f.kind==='rice'&&seedlingCount(f)>0)return {ok:false,message:'이 논은 한 포기씩 모내기하는 중이에요. 모내기 화면을 사용해 주세요.'};
    if(!f.tilled)return {ok:false,message:'먼저 괭이로 땅을 갈아 주세요.'};
    if(!state.inventory[seedKey[f.crop]])return {ok:false,message:'씨앗이 부족해요. 장터에서 씨앗을 구입해 주세요.'};
  }
  if(action==='water'&&f.kind==='rice')return {ok:false,message:'논은 물꼬를 열어 물을 관리해요.'};
  if(action==='gate'&&f.kind!=='rice')return {ok:false,message:'물꼬는 논에서만 조절할 수 있어요.'};
  if(action==='fertilize'&&!state.inventory.fertilizer)return {ok:false,message:'퇴비 주머니가 비었어요. 거름 더미에서 퇴비를 퍼 오세요.'};
  if(action==='harvest'&&(!f.planted||f.growth<.999))
    return {ok:false,message:'아직 익지 않았어요. 생육 상태를 살펴보세요.'};
  return {ok:true};
}
export function setSluiceOpening(state,id,level){
  const f=fieldById(state,id);
  if(!f||f.kind!=='rice'||!Number.isInteger(level)||level<0||level>2)
    return {ok:false,message:'논의 물꼬 위치를 다시 확인해 주세요.'};
  if((f.gateLevel??(f.gateOpen?2:0))===level)
    return {ok:false,message:'이미 물꼬가 그 위치에 있어요.'};
  const valid=canApplyFarmAction(state,id,'gate');
  if(!valid.ok)return valid;
  f.gateLevel=level;f.gateOpen=level>0;
  f.waterDepthCm=minmax(f.waterDepthCm+(level===2?1.2:level===1?.6:-.6),0,10);
  f.moisture=minmax(f.moisture+(level===2?.04:level===1?.02:-.02),0,1);
  return success(state,f,['수문을 완전히 닫았어요.','수문을 반쯤 열어 물을 천천히 대요.','수문을 활짝 열어 논에 물을 대요.'][level],{action:'gate',gateLevel:level});
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
    field.tilled=true;field.work.tilled.fill(true);field.weeds=minmax(field.weeds-.3,0,1);
    return success(state,field,'흙을 고르게 갈아 씨앗을 심을 준비를 했어요.',{action});
  }
  if(action==='plant'){
    if(field.kind==='rice')return {ok:false,message:'논은 모내기 화면에서 한 포기씩 심어 주세요.'};
    if(field.planted)return {ok:false,message:'이미 작물이 심어져 있어요.'};
    if(!field.tilled)return {ok:false,message:'먼저 괭이로 땅을 갈아 주세요.'};
    const species=field.crop,key=seedKey[species];
    if(!state.inventory[key])return {ok:false,message:'씨앗이 부족해요. 먼저 수확한 작물을 판매해 보세요.'};
    state.inventory[key]--;
    field.planted=true;field.growth=.025;field.health=1;field.weeds=.03;
    field.work.watered.fill(false);field.work.weeded.fill(false);field.work.harvested.fill(false);
    return success(state,field,(species==='rice'?'어린 모를 논에 옮겨 심었어요.':CROPS[species].name+' 씨앗을 심었어요.'),{action});
  }
  if(action==='gate'){
    return setSluiceOpening(state,id,field.gateOpen?0:2);
  }
  if(action==='water'){
    if(field.kind==='rice')return {ok:false,message:'논은 물꼬를 열어 물을 관리해요.'};
    field.moisture=minmax(field.moisture+.37,0,1);field.work.watered.fill(true);
    return success(state,field,'물뿌리개로 밭을 적셨어요.',{action});
  }
  if(action==='weed'){
    field.weeds=minmax(field.weeds-.42,0,1);field.work.weeded.fill(true);
    return success(state,field,'잡초를 제거해 농작물이 잘 자라도록 했어요.',{action});
  }
  if(action==='fertilize'){
    if(!state.inventory.fertilizer)return {ok:false,message:'퇴비가 다 떨어졌어요.'};
    state.inventory.fertilizer--;field.nitrogen=minmax(field.nitrogen+.34,0,1);
    return success(state,field,'거름을 줘서 토양의 양분을 보충했어요.',{action});
  }
  if(action==='harvest'){
    if(!field.planted||field.growth<.999)return {ok:false,message:'아직 익지 않았어요. 생육 상태를 살펴보세요.'};
    const result=grantHarvest(state,field);
    return success(state,field,result.message,{action,quantity:result.quantity,produce:result.produce,quality:result.quality});
  }
}
// A crop enters the inventory only after all five strips are cut.
// The old one-click API uses the same payout, preserving older tests/saves.
function grantHarvest(state,field){
  const crop=CROPS[field.crop];
  const quality=minmax(.55+field.health*.40+field.nitrogen*.15-field.weeds*.15,.45,1.15);
  const quantity=Math.max(1,Math.round(crop.baseYield*quality)+(state.upgrades?.sickle?2:0));
  state.inventory[crop.produce]+=quantity;field.planted=false;field.growth=0;
  if(field.kind==='rice')field.transplants=emptySeedlings();
  field.tilled=false;field.weeds=minmax(field.weeds+.08,0,1);field.harvestCount++;
  field.work=newFieldWork(false);
  state.stats.harvests++;
  return {quantity,produce:crop.produce,quality,
    message:crop.name+' '+quantity+'개를 거두어 창고에 보관했어요.'};
}
export function canWorkFieldStrip(state,id,action,index){
  const f=fieldById(state,id);
  if(!f||!validWorkStrip(index)||!Object.hasOwn(PATCH_ENERGY,action))
    return {ok:false,message:'작업할 구역을 선택해 주세요.'};
  const cost=workEnergyCost(state,action);
  if(state.energy<cost)return {ok:false,message:'기운이 부족해요. 하루 쉬었다 다시 해 보세요.'};
  const done=f.work?.[action==='till'?'tilled':action==='water'?'watered':action==='weed'?'weeded':action==='fertilize'?'fertilized':'harvested'];
  if(!Array.isArray(done)||done[index])return {ok:false,message:'이미 작업한 구역이에요.'};
  if(action==='till'&&f.planted)return {ok:false,message:'작물이 자라는 땅은 갈 수 없어요.'};
  if(action==='fertilize'&&!state.inventory.fertilizer)return {ok:false,message:'퇴비 주머니가 비었어요. 거름 더미에서 퇴비를 퍼 오세요.'};
  if(action==='water'&&f.kind==='rice')return {ok:false,message:'논은 물꼬를 이용해 물을 대 주세요.'};
  if(action==='weed'&&f.weeds<.12&&!f.work.weeded.some(Boolean))return {ok:false,message:'아직 뽑을 잡초가 없어요.'};
  if(action==='harvest'&&(!f.planted||f.growth<.999))
    return {ok:false,message:'이삭이 충분히 익은 뒤 수확해 주세요.'};
  return {ok:true};
}
export function applyFarmStrip(state,id,action,index){
  const check=canWorkFieldStrip(state,id,action,index);
  if(!check.ok)return check;
  const f=fieldById(state,id);
  const work=f.work;
  state.energy=minmax(state.energy-workEnergyCost(state,action),0,100);
  state.minute=minmax(state.minute+3,420,1320);
  const key=action==='till'?'tilled':action==='water'?'watered':action==='weed'?'weeded':action==='fertilize'?'fertilized':'harvested';
  work[key][index]=true;
  const count=completedWorkStrips(f,action);
  let result=null;
  if(action==='till'){
    f.weeds=minmax(f.weeds-.06,0,1);
    f.tilled=count===WORK_STRIPS;
  }else if(action==='water'){
    f.moisture=minmax(f.moisture+.074,0,1);
  }else if(action==='weed'){
    f.weeds=minmax(f.weeds-.084,0,1);
  }else if(action==='fertilize'){
    state.inventory.fertilizer--;
    f.nitrogen=minmax(f.nitrogen+.34/WORK_STRIPS,0,1);
  }else if(count===WORK_STRIPS){
    result=grantHarvest(state,f);
  }
  const messages={till:'흙을 고르게 뒤집었어요.',water:'흙에 물이 스며들었어요.',
    weed:'잡초를 뽑아냈어요.',fertilize:'밭에 퇴비를 뿌렸어요.',harvest:'낫으로 익은 작물을 베었어요.'};
  const complete=count===WORK_STRIPS;
  return {ok:true,action,fieldId:id,index,count,total:WORK_STRIPS,complete,
    ...result,message:result?.message||messages[action]+' '+count+' / '+WORK_STRIPS+'구역'};
}
export function workEnergyCost(state,action){
  const base=PATCH_ENERGY[action]||0;
  if((action==='harvest'&&state.upgrades?.sickle)||(action==='till'&&state.upgrades?.hoe))return Math.max(1,base-1);
  return base;
}
export function scoopCompost(state){
  return scoopCompostBatch(state,1);
}
export function scoopCompostBatch(state,requested=5){
  if((state.compostStock||0)<=0)return {ok:false,message:'거름 더미가 비었어요. 하루 뒤 다시 와 주세요.'};
  if(state.inventory.fertilizer>=10)return {ok:false,message:'퇴비 주머니가 가득 찼어요. 밭에 뿌리고 다시 와 주세요.'};
  if(state.energy<1)return {ok:false,message:'기운이 부족해요. 집에서 쉬어 주세요.'};
  const amount=Math.min(5,Math.max(1,Number.isFinite(requested)?Math.floor(requested):5),
    state.compostStock,10-state.inventory.fertilizer,Math.floor(state.energy));
  state.compostStock-=amount;state.inventory.fertilizer+=amount;
  state.energy-=amount;state.minute=Math.min(1320,state.minute+amount*2);
  return {ok:true,amount,message:'삽으로 퇴비 '+amount+'주머니를 퍼 담았어요. 밭으로 가져가 뿌려 보세요.'};
}
export function advanceFarmDay(state){
  const previous=state.day;
  state.compostStock=Math.min(24,(state.compostStock||0)+1);
  state.day++;
  state.minute=420;state.energy=100;state.weather=weatherForDay(state.day);
  const c=calendar(state.day);
  const festival=c.seasonDay===7?{type:'opens',...seasonalFestival(state)}:
    c.seasonDay===14?{type:'closes',...seasonalFestival(state)}:null;
  const rain=state.weather==='storm'?.36:state.weather==='rain'?.23:0;
  const changes=[];
  for(const f of state.fields){
    const before=visualStage(f),oldHealthy=f.health;
    f.work.watered.fill(false);f.work.weeded.fill(false);f.work.fertilized.fill(false);
    if(f.kind==='rice'){
      // Shallow paddies lose water through drainage/evaporation; open gates refill them.
      const refill=(f.gateLevel??(f.gateOpen?2:0))*1.3;
      const evaporation=(c.season==='여름'?1.65:1.25)-(state.upgrades?.channel?.5:0);
      f.waterDepthCm=minmax(f.waterDepthCm+rain*5+refill-evaporation,0,10);
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
  return {ok:true,previousDay:previous,newDay:state.day,weather:state.weather,changes,festival,
    message:c.season+' '+c.seasonDay+'일 아침이에요. '+(state.weather==='rain'?'밤새 비가 내려 논밭이 촉촉해요.':state.weather==='storm'?'거센 비가 지나갔어요.':'새로운 하루가 시작됐어요.')};
}
const needsImmediateCare=state=>state.fields.some(f=>{
  if(!f.planted)return false;
  return f.growth>=.999||f.health<.5||f.nitrogen<.2||f.weeds>.55||
    (f.kind==='rice'?(f.waterDepthCm<1||f.waterDepthCm>7):f.moisture<.25);
});
// Sleeping several days is always player-initiated, stops at the first new crop
// stage or care warning, and simulates every intermediate night in sequence.
export function restUntilFarmNeedsAttention(state,maxDays=4){
  const limit=Number.isInteger(maxDays)?Math.max(1,Math.min(4,maxDays)):4;
  const start=state.day,changes=[];
  let latest;
  for(let i=0;i<limit;i++){
    latest=advanceFarmDay(state);changes.push(...latest.changes);
    if(latest.changes.length||latest.festival?.type==='opens'||state.weather==='storm'||needsImmediateCare(state))break;
  }
  return {...latest,previousDay:start,daysPassed:state.day-start,changes,
    message:state.day-start===1?latest.message:
      (state.day-start)+'일 동안 쉬고 '+latest.message};
}

export function basketCount(state){return Object.keys(CROPS).reduce((sum,k)=>sum+(state.cargo?.[k]||0),0)}
export function cargoCapacity(state){return state.upgrades?.cart&&state.transport?.cartAttached?CART_CAPACITY:BASKET_CAPACITY}
export function toggleFarmCart(state){
  if(!state.upgrades?.cart)return {ok:false,message:'장터에서 손수레를 먼저 마련해 주세요.'};
  if(!state.transport)state.transport={cartAttached:false};
  if(state.transport.cartAttached&&basketCount(state)>0)return {ok:false,message:'손수레에 작물이 실려 있어요. 창고에 먼저 내려놓고 분리해 주세요.'};
  state.transport.cartAttached=!state.transport.cartAttached;
  return {ok:true,attached:state.transport.cartAttached,message:state.transport.cartAttached?
    '농부가 손수레 손잡이를 잡았어요. 한 번에 60개까지 실을 수 있어요.':
    '손수레를 창고 앞에 세워 두었어요. 이제 바구니를 들고 움직여요.'};
}
export function loadHarvestBasket(state,crop,requested=cargoCapacity(state)){
  if(!Object.hasOwn(CROPS,crop))return {ok:false,message:'바구니에 담을 작물을 골라 주세요.'};
  if(!Number.isInteger(requested)||requested<1)return {ok:false,message:'담을 수량을 확인해 주세요.'};
  const available=state.inventory[crop]||0;
  const amount=Math.min(requested,available,cargoCapacity(state)-basketCount(state));
  if(amount<=0)return {ok:false,message:available?'실을 곳이 가득 찼어요. 장터에 다녀오세요.':'창고에 그 작물이 없어요.'};
  state.inventory[crop]-=amount;state.cargo[crop]+=amount;
  return {ok:true,crop,amount,message:CROPS[crop].name+' '+amount+'개를 창고에서 '+(state.transport?.cartAttached?'손수레에':'바구니에')+' 담았어요.'};
}
export function unloadHarvestBasket(state){
  const amount=basketCount(state);
  if(!amount)return {ok:false,message:'바구니가 비어 있어요.'};
  for(const crop of Object.keys(CROPS)){
    state.inventory[crop]+=state.cargo[crop];state.cargo[crop]=0;
  }
  return {ok:true,amount,message:'바구니의 작물 '+amount+'개를 창고에 도로 내려놓았어요.'};
}
export function sellBasketProduce(state){
  const sold={},total=Object.keys(CROPS).reduce((sum,crop)=>{
    const count=state.cargo[crop]||0;
    if(count>0)sold[crop]=count;
    return sum+count*CROPS[crop].price;
  },0);
  if(!total)return {ok:false,total:0,message:'바구니가 비었어요. 창고에서 작물을 실어 오세요.'};
  for(const crop of Object.keys(CROPS))state.cargo[crop]=0;
  state.money+=total;state.stats.sales++;state.stats.earnings+=total;
  return {ok:true,sold,total,message:'가져온 수확물을 '+total.toLocaleString('ko-KR')+'원에 팔았어요.'};
}

export const SUPPLY_PRICES=Object.freeze({seedRice:100,seedCarrot:60,seedCorn:80});
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

export const DELIVERY_ORDERS=Object.freeze([
  Object.freeze({produce:'rice',count:5,reward:1400,description:'마을 식당에 햅쌀을 전해 주세요.'}),
  Object.freeze({produce:'carrot',count:3,reward:420,description:'장터 반찬가게에서 당근을 기다려요.'}),
  Object.freeze({produce:'corn',count:3,reward:650,description:'마을 아이들에게 옥수수를 보내 주세요.'})
]);
export const REPEAT_DELIVERY_ORDERS=Object.freeze([
  Object.freeze({produce:'rice',count:4,reward:1120,description:'마을 식당에서 밥 지을 쌀을 기다려요.'}),
  Object.freeze({produce:'carrot',count:3,reward:450,description:'이웃집에서 당근 반찬을 만들려고 해요.'}),
  Object.freeze({produce:'corn',count:2,reward:470,description:'장터에서 옥수수를 더 부탁했어요.'})
]);
export function currentDeliveryOrder(state){
  const completed=state.stats?.deliveries||0;
  if(completed<DELIVERY_ORDERS.length)return DELIVERY_ORDERS[completed];
  if(state.market?.lastRepeatDay===state.day)return null;
  return REPEAT_DELIVERY_ORDERS[(state.day+completed-DELIVERY_ORDERS.length)%REPEAT_DELIVERY_ORDERS.length];
}
function fulfillDeliveryOrderFrom(state,stock){
  const order=currentDeliveryOrder(state);
  if(!order)return {ok:false,complete:true,message:'오늘의 마을 부탁은 마쳤어요. 내일 새로운 부탁이 와요.'};
  const available=stock[order.produce]||0;
  if(available<order.count)return {ok:false,order,available,message:order.description+' '+order.count+'개가 필요해요. 현재 '+available+'개 있어요.'};
  stock[order.produce]-=order.count;
  state.money+=order.reward;
  state.stats.deliveries=(state.stats.deliveries||0)+1;
  if(state.stats.deliveries>=DELIVERY_ORDERS.length)state.market.lastRepeatDay=state.day;
  return {ok:true,order,available:available-order.count,reward:order.reward,
    complete:state.stats.deliveries>=DELIVERY_ORDERS.length,
    message:order.description+' 납품을 마쳤어요. 보상 '+order.reward.toLocaleString('ko-KR')+'원을 받았어요.'};
}
export function fulfillDeliveryOrder(state){return fulfillDeliveryOrderFrom(state,state.inventory)}
export function fulfillBasketDeliveryOrder(state){return fulfillDeliveryOrderFrom(state,state.cargo)}
