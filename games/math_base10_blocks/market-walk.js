import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

const $=s=>document.querySelector(s);
const fmt=n=>Math.round(n).toLocaleString('ko-KR')+'원';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sum=a=>a.reduce((x,y)=>x+y,0);
const ROOT='../../assets/game/';
const FOOD=ROOT+'food/';
const MARKET=ROOT+'shops/market/';
const KITCHEN=ROOT+'3d/interiors/kenney-furniture-kit/';
const ULTIMATE_FOOD=ROOT+'3d/food/ultimate-food-pack/';
const CHARMING=ROOT+'3d/interiors/charming-kitchen-set/';
const HOME_MODELS=['kitchen-fridge','kitchen-cabinet-upper-double','kitchen-cabinet','kitchen-sink','kitchen-stove-electric','kitchen-microwave','table','chair','desk','chair-desk','bookcase-open','bookcase-open-low','bookcase-closed-wide','bench','rug-rectangle','rug-round','rug-doormat','potted-plant','lamp-round-floor','table-coffee','lounge-chair','computer-screen','computer-keyboard','computer-mouse','trashcan'];
const DISH_MODELS=['plate','egg-cooked','tomato-slice','cutting-board-japanese'];
const MARKET_MODELS=['cash-register','character-employee','shopping-cart','shopping-basket','display-fruit','display-bread','freezer','freezers-standing','shelf-boxes','shelf-bags'];
const PRODUCT_V4={apple:'apple-green.glb',banana:'banana.glb',carrot:'carrot.glb',broccoli:'broccoli.glb',tomato:'tomato.glb',eggplant:'eggplant.glb',egg:'egg.glb',bread:'bread.glb',donut:'donut.glb',chocolate:'chocolate-bar.glb',pizza:'pizza.glb',fries:'fries.glb'};
const HOME_DECOR_MODELS=['pan.glb','toaster.glb','kettle.glb','utensils-cup.glb','mug-yellow.glb','plate.glb','extractor-hood.glb'];
const CITY_DECOR_ASSETS={bench:ROOT+'3d/city/poly-pizza-city-pack/bench.glb',bicycle:ROOT+'3d/city/poly-pizza-city-pack/bicycle.glb',busStop:ROOT+'3d/city/poly-pizza-city-pack/bus-stop.glb',hydrant:ROOT+'3d/city/poly-pizza-city-pack/fire-hydrant.glb',planter:ROOT+'3d/city/poly-pizza-city-pack/planter-and-bushes.glb',trashCan:ROOT+'3d/city/poly-pizza-city-pack/trash-can.glb',mailbox:ROOT+'3d/city/poly-pizza-city-pack/mailbox.glb'};
const CITY_ASSETS={house:ROOT+'3d/buildings/kenney-modular-buildings/building-sample-house-a.glb',tower:ROOT+'3d/buildings/kenney-modular-buildings/building-sample-tower-a.glb',tree:ROOT+'3d/nature/kenney-nature-kit/tree-small.glb',car:ROOT+'3d/vehicles/kenney-car-kit/sedan.glb',personA:ROOT+'characters/people/character-female-a.glb',personB:ROOT+'characters/people/character-male-b.glb',dog:ROOT+'characters/pets/animal-dog.glb'};
const CITY_PEOPLE_ASSETS=[
 ROOT+'characters/people/character-female-a.glb',ROOT+'characters/people/character-male-a.glb',
 ROOT+'characters/people/character-female-b.glb',ROOT+'characters/people/character-male-b.glb',
 ROOT+'characters/people/character-female-c.glb',ROOT+'characters/people/character-male-c.glb',
 ROOT+'characters/people/character-female-d.glb',ROOT+'characters/people/character-male-d.glb',
 ROOT+'characters/people/character-female-e.glb',ROOT+'characters/people/character-male-e.glb',
 ROOT+'characters/people/character-female-f.glb',ROOT+'characters/people/character-male-f.glb'
];
const DAILY_CAL_TARGET=1800;
const BASE_WORK_PAY=28000;
const HOSPITAL_COST={dog:12000,car:30000,sick:8000};
const SAVE_KEY='mart-life-v1';
const SLOTS=['아침','점심','저녁'];
const WEEKLY_BUDGET=35000;

const ZONES={
 produce:{name:'과일 · 채소',color:'#69a65c'},
 protein:{name:'달걀 · 생선',color:'#d57c65'},
 bakery:{name:'빵 · 간식',color:'#d18a52'},
 pantry:{name:'식품 · 과자',color:'#6c8db0'},
 chilled:{name:'냉장 · 냉동',color:'#69a8b0'},
 drinks:{name:'음료',color:'#b66f72'}
};

const PRODUCTS=[
 {id:'apple',name:'사과',price:1200,model:'apple.glb',zone:'produce',storage:'fridge',ready:true,kcal:95,protein:1,veg:2,sugar:9,sodium:1,satiety:17,mood:5,pos:[-7.6,-6.8]},
 {id:'banana',name:'바나나',price:1800,model:'banana.glb',zone:'produce',storage:'pantry',ready:true,kcal:105,protein:1,veg:2,sugar:12,sodium:1,satiety:19,mood:6,pos:[-5.8,-6.8]},
 {id:'carrot',name:'당근',price:900,model:'carrot.glb',zone:'produce',storage:'fridge',ready:true,kcal:40,protein:1,veg:3,sugar:4,sodium:1,satiety:10,mood:1,pos:[-7.6,-5.0]},
 {id:'broccoli',name:'브로콜리',price:1600,model:'broccoli.glb',zone:'produce',storage:'fridge',ready:true,kcal:50,protein:4,veg:4,sugar:2,sodium:1,satiety:13,mood:1,pos:[-5.8,-5.0]},
 {id:'grapes',name:'포도',price:4500,model:'grapes.glb',zone:'produce',storage:'fridge',ready:true,kcal:120,protein:1,veg:2,sugar:16,sodium:1,satiety:15,mood:7,pos:[-7.6,-3.2]},
 {id:'corn',name:'옥수수',price:2200,model:'corn.glb',zone:'produce',storage:'fridge',ready:true,kcal:125,protein:4,veg:2,sugar:5,sodium:1,satiety:25,mood:5,pos:[-5.8,-3.2]},
 {id:'tomato',name:'토마토',price:1400,model:'tomato.glb',zone:'produce',storage:'fridge',ready:true,kcal:30,protein:1,veg:4,sugar:3,sodium:1,satiety:9,mood:3,pos:[-7.6,-1.4]},
 {id:'eggplant',name:'가지',price:1700,model:'eggplant.glb',zone:'produce',storage:'fridge',ready:false,kcal:35,protein:1,veg:4,sugar:2,sodium:1,satiety:10,mood:1,pos:[-5.8,-1.4]},
 {id:'egg',name:'달걀',price:800,model:'egg.glb',zone:'protein',storage:'fridge',ready:false,kcal:80,protein:7,veg:0,sugar:0,sodium:2,satiety:20,mood:4,pos:[-2.8,-4.1]},
 {id:'fish',name:'생선',price:4200,model:'fish.glb',zone:'protein',storage:'fridge',ready:false,kcal:210,protein:24,veg:0,sugar:0,sodium:4,satiety:38,mood:5,pos:[-2.8,-.8]},
 {id:'bread',name:'식빵',price:2300,model:'bread.glb',zone:'bakery',storage:'pantry',ready:true,kcal:180,protein:6,veg:0,sugar:4,sodium:3,satiety:28,mood:5,pos:[6.2,-6.8]},
 {id:'donut',name:'도넛',price:1400,model:'donut.glb',zone:'bakery',storage:'pantry',ready:true,kcal:260,protein:3,veg:0,sugar:17,sodium:3,satiety:25,mood:12,pos:[7.9,-6.8]},
 {id:'muffin',name:'머핀',price:2100,model:'muffin.glb',zone:'bakery',storage:'pantry',ready:true,kcal:310,protein:4,veg:0,sugar:18,sodium:4,satiety:28,mood:11,pos:[6.2,-4.9]},
 {id:'chocolate',name:'초콜릿',price:1700,model:'chocolate.glb',zone:'pantry',storage:'pantry',ready:true,kcal:230,protein:2,veg:0,sugar:21,sodium:1,satiety:14,mood:13,pos:[0,-4.1]},
 {id:'cookie',name:'쿠키',price:1500,model:'cookie.glb',zone:'pantry',storage:'pantry',ready:true,kcal:210,protein:2,veg:0,sugar:16,sodium:3,satiety:14,mood:11,pos:[0,-.8]},
 {id:'sandwich',name:'샌드위치',price:3500,model:'sandwich.glb',zone:'pantry',storage:'fridge',ready:true,kcal:390,protein:15,veg:1,sugar:5,sodium:7,satiety:45,mood:8,pos:[0,2.5]},
 {id:'pizza',name:'냉동 피자',price:6900,model:'pizza.glb',zone:'chilled',storage:'freezer',ready:false,quick:true,kcal:620,protein:23,veg:1,sugar:8,sodium:10,satiety:65,mood:13,pos:[2.8,-4.1]},
 {id:'cheese',name:'치즈',price:3200,model:'cheese.glb',zone:'chilled',storage:'fridge',ready:true,kcal:150,protein:9,veg:0,sugar:1,sodium:5,satiety:20,mood:6,pos:[2.8,-.8]},
 {id:'fries',name:'냉동 감자튀김',price:3800,model:'fries.glb',zone:'chilled',storage:'freezer',ready:false,quick:true,kcal:430,protein:5,veg:1,sugar:1,sodium:7,satiety:43,mood:12,pos:[2.8,2.5]},
 {id:'carton',name:'우유',price:2600,model:'carton.glb',zone:'chilled',storage:'fridge',ready:true,kcal:140,protein:7,veg:0,sugar:7,sodium:2,satiety:22,mood:5,pos:[5.0,4.8]},
 {id:'sodaCan',name:'탄산음료 캔',price:1100,model:'soda-can.glb',zone:'drinks',storage:'pantry',ready:true,kcal:150,protein:0,veg:0,sugar:24,sodium:2,satiety:3,mood:11,pos:[-2.8,4.2]},
 {id:'sodaBottle',name:'탄산음료',price:1900,model:'soda-bottle.glb',zone:'drinks',storage:'pantry',ready:true,kcal:240,protein:0,veg:0,sugar:32,sodium:2,satiety:4,mood:13,pos:[0,4.2]}
];
const productById=id=>PRODUCTS.find(p=>p.id===id);
function productAssetUrl(p){return PRODUCT_V4[p?.id]?ULTIMATE_FOOD+PRODUCT_V4[p.id]:FOOD+p.model}

const CONVENIENCE_ITEMS=[
 {id:'sandwich',price:4500,label:'샌드위치'},
 {id:'sodaCan',price:1600,label:'탄산음료'},
 {id:'donut',price:2100,label:'도넛'}
];
const FAST_FOOD_MENU={
 burger:{name:'치즈버거 세트',price:6900,model:'burger-cheese.glb',nutrition:{kcal:860,protein:27,veg:1,sugar:24,sodium:17,satiety:76,mood:18}},
 double:{name:'더블버거 세트',price:7900,model:'burger-cheese-double.glb',nutrition:{kcal:1080,protein:39,veg:1,sugar:27,sodium:22,satiety:88,mood:20}}
};

const EVENTS=[
 {id:'sports',title:'체육을 신나게 한 날',text:'평소보다 배가 조금 더 고파요. 무엇을 먹을지는 자유예요.',hunger:-12},
 {id:'picnic',title:'내일 소풍!',text:'간식을 챙기고 싶다면 마트에서 골라볼 수 있어요. 꼭 살 필요는 없어요.',moodTag:'snack'},
 {id:'produceSale',title:'과일·채소 할인',text:'오늘 마트의 과일·채소가 20% 할인 중이에요.',discountZone:'produce'},
 {id:'chilledSale',title:'냉장 코너 할인',text:'오늘 냉장·냉동 식품이 15% 할인 중이에요.',discountZone:'chilled'},
 {id:'rain',title:'비 오는 날',text:'따뜻하게 조리한 음식을 먹으면 만족감이 조금 더 올라가요.',warmBonus:5},
 {id:'ordinary',title:'그냥 평범한 하루',text:'특별한 일은 없어요. 오늘 먹고 싶은 걸 천천히 생각해 봐요.'}
];

const ui={
 day:$('#dayStat'),money:$('#moneyStat'),kcal:$('#kcalStat'),nutrition:$('#nutritionStat'),weight:$('#weightStat'),condition:$('#conditionStat'),sound:$('#soundBtn'),cartBtn:$('#cartBtn'),cartCount:$('#cartCount'),location:$('#locationChip'),eventCard:$('#eventCard'),eventTitle:$('#eventTitle'),eventText:$('#eventText'),toast:$('#toast'),labels:$('#productLabels'),heldCard:$('#heldCard'),heldName:$('#heldName'),heldHint:$('#heldHint'),prepCard:$('#prepCard'),prepTitle:$('#prepTitle'),prepText:$('#prepText'),
 interactDock:$('#interactDock'),interactIcon:$('#interactIcon'),interactTitle:$('#interactTitle'),interactSub:$('#interactSub'),interactBtn:$('#interactBtn'),touchInteract:$('#touchInteract'),joystick:$('#joystick'),stick:$('#stick'),
 cartPanel:$('#cartPanel'),closeCart:$('#closeCart'),cartList:$('#cartList'),cartTotal:$('#cartTotal'),
 checkout:$('#checkoutPanel'),checkoutGuide:$('#checkoutGuide'),scanStat:$('#scanStat'),checkoutMoney:$('#checkoutMoney'),checkoutPaid:$('#checkoutPaid'),checkoutChange:$('#checkoutChange'),scanItems:$('#scanItems'),totalSection:$('#totalSection'),totalInput:$('#totalInput'),checkTotal:$('#checkTotal'),receipt:$('#receipt'),paySection:$('#paySection'),cashOptions:$('#cashOptions'),changeSection:$('#changeSection'),changeEquation:$('#changeEquation'),changeInput:$('#changeInput'),checkChange:$('#checkChange'),closeCheckout:$('#closeCheckout'),backToShopping:$('#backToShopping'),finishCheckout:$('#finishCheckout'),
 chaseHud:$('#chaseHud'),chaseTitle:$('#chaseTitle'),chaseText:$('#chaseText'),injuryFlash:$('#injuryFlash'),
 start:$('#startModal'),loadFill:$('#loadFill'),loadText:$('#loadText'),newLife:$('#newLifeBtn'),continueBtn:$('#continueBtn'),
 dayModal:$('#dayModal'),dayReportTitle:$('#dayReportTitle'),dayReportSummary:$('#dayReportSummary'),dayIncome:$('#dayIncome'),dayExpense:$('#dayExpense'),dayKcal:$('#dayKcal'),dayNutrition:$('#dayNutrition'),dayWeight:$('#dayWeight'),dayHealth:$('#dayHealth'),nextDayBtn:$('#nextDayBtn'),
 week:$('#weekModal'),weekSummary:$('#weekSummary'),weekCooked:$('#weekCooked'),weekQuick:$('#weekQuick'),weekMoney:$('#weekMoney'),weekBalance:$('#weekBalance'),nextWeek:$('#nextWeekBtn')
};

const freshStats=()=>({cooked:0,quick:0,spent:0,sugar:0,sodium:0,veg:0,protein:0,meals:0});
const freshDailyNutrition=()=>({protein:0,veg:0,sugar:0,sodium:0});
const starterInventory=()=>[
 {uid:'starter-bread',id:'bread',age:0},
 {uid:'starter-egg-1',id:'egg',age:0},
 {uid:'starter-egg-2',id:'egg',age:0},
 {uid:'starter-carton',id:'carton',age:0},
 {uid:'starter-apple',id:'apple',age:0}
];
let state={location:'home',phase:'loading',running:false,sound:true,day:1,slot:0,money:WEEKLY_BUDGET,hunger:58,dailyKcal:0,condition:75,satisfaction:62,weightKg:35,dailyActivityKcal:0,dailyNutrition:freshDailyNutrition(),dailyIncome:0,dailyExpense:0,dailyIncidents:[],injury:null,treatmentNeeded:false,workedDay:0,dogEventDay:0,gymPassDay:0,gymWorkoutCount:0,inventory:starterInventory(),basket:[],hasCart:false,held:null,prep:[],dish:null,event:null,mealFoods:[],mealCooked:false,mealQuick:false,weekStats:freshStats(),checkoutMistakes:0,totalConfirmed:false,paid:0,changeConfirmed:false,scanned:new Set()};

let audioCtx;
function ensureAudio(){
 if(!state.sound)return null;
 try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();return audioCtx}catch(_){return null}
}
function tone(type){
 const ctx=ensureAudio();if(!ctx)return;
 try{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;const f={pick:510,scan:930,cash:430,good:680,bad:170,cook:560,eat:620,door:320}[type]||300;o.type=type==='scan'?'square':type==='bad'?'sawtooth':'triangle';o.frequency.setValueAtTime(f,t);if(type==='good'||type==='scan'||type==='eat')o.frequency.exponentialRampToValueAtTime(f*1.32,t+.1);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.045,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.18)}catch(_){}
}
function sfxPulse(ctx,start,freq,endFreq,duration,gain=.055,type='sawtooth'){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),start);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq||freq),start+duration);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(gain,start+.008);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g).connect(ctx.destination);o.start(start);o.stop(start+duration+.02)
}
function sfxNoise(ctx,start,duration,gain=.04,filterHz=1400){
 const frames=Math.max(1,Math.floor(ctx.sampleRate*duration)),buffer=ctx.createBuffer(1,frames,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buffer;filter.type='lowpass';filter.frequency.value=filterHz;g.gain.setValueAtTime(gain,start);g.gain.exponentialRampToValueAtTime(.0001,start+duration);src.connect(filter).connect(g).connect(ctx.destination);src.start(start)
}
function playCarImpactSound(){
 const ctx=ensureAudio();if(!ctx)return;const t=ctx.currentTime;
 // 짧은 경적 + 금속성 충돌 + 낮은 둔탁음이 겹쳐져 실제 사고처럼 읽히게 한다.
 sfxPulse(ctx,t,255,185,.22,.065,'square');sfxPulse(ctx,t+.015,86,43,.36,.11,'sine');sfxNoise(ctx,t,.25,.095,2100)
}
function playDogSound(kind='bark'){
 const ctx=ensureAudio();if(!ctx)return;const t=ctx.currentTime;
 if(kind==='bite'){sfxPulse(ctx,t,440,105,.14,.09,'sawtooth');sfxNoise(ctx,t,.11,.06,2800);return}
 // 두 번 끊어 짖는 소리. 추격 중에도 주기적으로 재생한다.
 sfxPulse(ctx,t,215,122,.105,.072,'square');sfxNoise(ctx,t,.075,.035,1200);sfxPulse(ctx,t+.13,190,108,.09,.055,'square')
}
function toast(msg,bad=false){ui.toast.textContent=msg;ui.toast.className='toast '+(bad?'bad ':'')+'show';clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.className='toast',1400)}
function makeUid(id){return id+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function discountedPrice(p){const d=state.event?.discountZone===p.zone?(p.zone==='produce'?.8:.85):1;return Math.round(p.price*d/100)*100}
function save(){
 try{const plain={...state,scanned:[...state.scanned],phase:state.phase==='checkout'?'shopping':state.location,running:true};localStorage.setItem(SAVE_KEY,JSON.stringify(plain));localStorage.setItem('mart-walk-sound',JSON.stringify(state.sound))}catch(_){}}
function hasSave(){try{return !!localStorage.getItem(SAVE_KEY)}catch(_){return false}}
function loadSave(){
 try{const x=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!x)return false;state={...state,...x,dailyNutrition:{...freshDailyNutrition(),...(x.dailyNutrition||{})},dailyIncidents:x.dailyIncidents||[],weightKg:Number(x.weightKg)||35,mealFoods:x.mealFoods||[],mealCooked:!!x.mealCooked,mealQuick:!!x.mealQuick,scanned:new Set(x.scanned||[]),totalConfirmed:false,paid:0,changeConfirmed:false};state.location=x.location||'home';state.phase=state.location==='market'?'shopping':state.location;state.running=true;return true}catch(_){return false}}
function newLife(){state={...state,location:'home',phase:'home',running:true,day:1,slot:0,money:WEEKLY_BUDGET,hunger:58,dailyKcal:0,condition:75,satisfaction:62,weightKg:35,dailyActivityKcal:0,dailyNutrition:freshDailyNutrition(),dailyIncome:0,dailyExpense:0,dailyIncidents:[],injury:null,treatmentNeeded:false,workedDay:0,dogEventDay:0,gymPassDay:0,gymWorkoutCount:0,inventory:starterInventory(),basket:[],hasCart:false,held:null,prep:[],dish:null,event:null,mealFoods:[],mealCooked:false,mealQuick:false,weekStats:freshStats(),checkoutMistakes:0,totalConfirmed:false,paid:0,changeConfirmed:false,scanned:new Set()};rollEvent(true);save()}


const canvas=$('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc8dbc7);scene.fog=new THREE.Fog(0xc8dbc7,18,42);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.08,90);scene.add(camera);
const hemi=new THREE.HemisphereLight(0xf8fff0,0x58675c,1.35);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff1d3,1.9);sun.position.set(-7,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;scene.add(sun);
const loader=new GLTFLoader(),cache=new Map();
const world=new THREE.Group(),dynamic=new THREE.Group(),fx=new THREE.Group();scene.add(world,dynamic,fx);
const city=new THREE.Group(),cityMovers=[],roomMixers=[];scene.add(city);let cityReady=null,cityTime=0,trafficSignalMeshes=[];
let dog=null,dogChaseLeft=0,dogSpawnClock=14+Math.random()*10,dogLabelClock=0,dogSpawning=false,dogBarkCooldown=0,carHitCooldown=0,cameraImpact=0,cameraImpactTotal=.4,cameraImpactPower=0;
const injuryParticles=[],impactParticles=[];
const heldRoot=new THREE.Group();heldRoot.position.set(.34,-.34,-.75);camera.add(heldRoot);
let marketDisplays={},marketDisplaySurfaces={},kitchenStorage={},storageOpen={fridge:false,pantry:false},tableTop=.9,counterTop=1.05,dishVisualRevision=0,homeInventoryRevision=0;
let cart=null,cartCargo=null,nearest=null,yaw=Math.PI,pitch=-.04,playerPos=new THREE.Vector3(0,1.62,0),colliders=[],interactables=[],labelViews=[],homeFoodGroup=new THREE.Group();dynamic.add(homeFoodGroup);
let tapStation='fridge',tapBusy=false,freeWalk=true;
const keys={};const touch={x:0,y:0,active:false,pointer:null};let lookPointer=null,lastLook=null;

function clearGroup(g){if(g===world)roomMixers.length=0;while(g.children.length)g.remove(g.children[0])}
async function asset(url){if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(err=>{cache.delete(url);throw err}));return cache.get(url)}
function recolor(root,palette){root.traverse(o=>{if(!o.isMesh)return;const arr=Array.isArray(o.material)?o.material:[o.material];const made=arr.map((m,i)=>{const n=m.clone();if(palette?.length&&n.color)n.color.setHex(palette[i%palette.length]);if('roughness'in n)n.roughness=Math.max(.48,n.roughness??.7);return n});o.material=Array.isArray(o.material)?made:made[0];o.castShadow=true;o.receiveShadow=true})}
async function fitted(url,size=1,palette=null){const g=await asset(url),clone=cloneSkeleton(g.scene),wrap=new THREE.Group();wrap.add(clone);recolor(clone,palette);clone.traverse(n=>{if(n.isSkinnedMesh)n.frustumCulled=false});let b=new THREE.Box3().setFromObject(clone),s=new THREE.Vector3();b.getSize(s);clone.scale.multiplyScalar(size/(Math.max(s.x,s.y,s.z)||1));clone.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(clone);const center=b.getCenter(new THREE.Vector3());clone.position.x-=center.x;clone.position.z-=center.z;clone.position.y-=b.min.y;wrap.userData.animations=g.animations||[];return wrap}
function groundModel(root,surfaceY=0,clearance=.035){
 root.updateMatrixWorld(true);
 const before=new THREE.Box3().setFromObject(root),targetMin=surfaceY+clearance,delta=targetMin-before.min.y;
 root.position.y+=delta;root.updateMatrixWorld(true);
 const after=new THREE.Box3().setFromObject(root);
 root.userData.groundY=root.position.y;
 root.userData.footLocalY=after.min.y-root.position.y;
 root.userData.surfaceY=surfaceY;
 return root.position.y
}
function pedestrianFootY(m){
 const local=Number.isFinite(m?.footLocalY)?m.footLocalY:(Number.isFinite(m?.root?.userData?.footLocalY)?m.root.userData.footLocalY:0);
 return (m?.root?.position?.y||0)+local
}
function keepPedestrianAboveGround(m,minClearance=.02){
 if(!m?.walk)return;
 const surface=Number.isFinite(m.surfaceY)?m.surfaceY:0,target=surface+minClearance,foot=pedestrianFootY(m);
 if(foot<target)m.root.position.y+=target-foot
}
function inPlaceCharacterClip(source){
 if(!source)return null;const clip=source.clone?source.clone():source;
 if(clip?.tracks)clip.tracks=clip.tracks.filter(track=>!/(^|[./])(?:root|bone)\.position$/i.test(String(track.name||'')));
 return clip
}
function startModelAnimation(root,pattern=/walk|run|sprint/i){
 const clips=root?.userData?.animations||[],source=clips.find(c=>pattern.test(c.name||''))||clips.find(c=>/idle/i.test(c.name||''))||clips[0],clip=inPlaceCharacterClip(source);if(!clip)return null;
 const mixer=new THREE.AnimationMixer(root);mixer.clipAction(clip).reset().play();return mixer
}
function box(size,pos,color,rough=.88,parent=world){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:rough}));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function addCollider(x,z,w,d){colliders.push({x,z,w,d})}
function canStand(x,z){
 const bounds=state.location==='market'?[-4.7,4.7,-4.2,4.2]:state.location==='home'?[-3.1,3.1,-2.8,3.1]:state.location==='convenience'?[-3.45,3.45,-2.95,2.95]:state.location==='fastfood'?[-3.75,3.75,-3.15,3.15]:state.location==='gym'?[-4.45,4.45,-3.45,3.45]:state.location==='office'||state.location==='hospital'?[-4.4,4.4,-3.4,3.4]:[-16.5,16.5,-16.5,16.5];
 if(x<bounds[0]||x>bounds[1]||z<bounds[2]||z>bounds[3])return false;for(const c of colliders)if(Math.abs(x-c.x)<c.w/2+.3&&Math.abs(z-c.z)<c.d/2+.3)return false;return true
}
function addCeilingLights(width,depth,height=3.12){const ceiling=box([width,.14,depth],[0,height,0],0xf5f1e8,.92);for(const x of [-width*.24,0,width*.24]){const panel=box([.85,.055,.28],[x,height-.1,0],0xfff6d8,.3);panel.material.emissive=new THREE.Color(0xffefbd);panel.material.emissiveIntensity=.85;const light=new THREE.PointLight(0xffefd0,.75,7,2);light.position.set(x,height-.28,0);world.add(light)}return ceiling}
function flashInjury(){ui.injuryFlash.classList.add('show');setTimeout(()=>ui.injuryFlash.classList.remove('show'),220)}
function injuryBurst(pos){flashInjury();for(let i=0;i<9;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035+Math.random()*.025,6,5),new THREE.MeshBasicMaterial({color:0xc7463f,transparent:true}));m.position.set(pos.x+(Math.random()-.5)*.35,.45+Math.random()*.7,pos.z+(Math.random()-.5)*.35);fx.add(m);injuryParticles.push({m,v:new THREE.Vector3((Math.random()-.5)*1.5,.8+Math.random()*1.2,(Math.random()-.5)*1.5),life:.55+Math.random()*.35})}}
function impactBurst(pos,kind='car'){
 const count=kind==='car'?22:10,color=kind==='car'?0xffd36a:0xff8a72;
 for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.035+Math.random()*.05,.035+Math.random()*.05,.035+Math.random()*.05),new THREE.MeshBasicMaterial({color,transparent:true}));m.position.set(pos.x+(Math.random()-.5)*.55,.45+Math.random()*.85,pos.z+(Math.random()-.5)*.55);fx.add(m);const speed=kind==='car'?3.0:1.7;impactParticles.push({m,v:new THREE.Vector3((Math.random()-.5)*speed,.7+Math.random()*1.8,(Math.random()-.5)*speed),life:.45+Math.random()*.35})}
}
function triggerCameraImpact(power=.16,duration=.42){cameraImpact=Math.max(cameraImpact,duration);cameraImpactTotal=Math.max(.001,duration);cameraImpactPower=Math.max(cameraImpactPower,power)}
function updateCameraImpact(dt){
 camera.rotation.z=0;if(cameraImpact<=0){cameraImpactPower=0;return}
 cameraImpact=Math.max(0,cameraImpact-dt);const k=clamp(cameraImpact/cameraImpactTotal,0,1),p=cameraImpactPower*k;
 camera.position.x+=(Math.random()-.5)*p;camera.position.y+=(Math.random()-.5)*p*.55;camera.position.z+=(Math.random()-.5)*p;camera.rotation.z=(Math.random()-.5)*p*.75;
 if(cameraImpact<=0)cameraImpactPower=0
}
function updateInjuryParticles(dt){
 for(let i=injuryParticles.length-1;i>=0;i--){const p=injuryParticles[i];p.life-=dt;p.v.y-=3.4*dt;p.m.position.addScaledVector(p.v,dt);p.m.material.opacity=clamp(p.life/.5,0,1);if(p.life<=0){p.m.removeFromParent();injuryParticles.splice(i,1)}}
 for(let i=impactParticles.length-1;i>=0;i--){const p=impactParticles[i];p.life-=dt;p.v.y-=4.6*dt;p.m.rotation.x+=dt*9;p.m.rotation.z+=dt*7;p.m.position.addScaledVector(p.v,dt);p.m.material.opacity=clamp(p.life/.4,0,1);if(p.life<=0){p.m.removeFromParent();impactParticles.splice(i,1)}}
}


function sign(text,pos,scale=1,color='#2f7d60',parent=world){const c=document.createElement('canvas');c.width=512;c.height=150;const x=c.getContext('2d');x.fillStyle='#fff8e9';x.fillRect(0,0,512,150);x.fillStyle=color;x.fillRect(0,0,512,23);x.fillStyle='#173b31';x.font='900 46px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,86);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));sp.position.set(...pos);sp.scale.set(4.1*scale,1.2*scale,1);parent.add(sp);return sp}
function wallSign(text,pos,width=1.75,color='#2f7d60',rot=0,parent=world){
 const c=document.createElement('canvas');c.width=768;c.height=220;const x=c.getContext('2d');
 x.fillStyle='#f7f3ea';x.fillRect(0,0,c.width,c.height);
 x.fillStyle=color;x.fillRect(0,0,c.width,24);
 x.fillStyle='#173b31';x.font='900 64px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,c.width/2,c.height*.58);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const h=width*(c.height/c.width),g=new THREE.Group();g.position.set(...pos);g.rotation.y=rot;parent.add(g);
 box([width+.08,h+.08,.055],[0,0,0],0xd8d2c6,.82,g);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(width,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
 face.position.z=.032;g.add(face);return g
}
function storefrontCanopy(x,z,width,colorA,colorB=0xf6eedc){
 const g=new THREE.Group();g.position.set(x,2.12,z);world.add(g);
 box([width,.12,.68],[0,0,0],colorA,.62,g);
 const stripeW=width/6;
 for(let i=0;i<6;i++)box([stripeW-.025,.035,.7],[-width/2+stripeW/2+i*stripeW,.075,0],i%2?colorB:colorA,.55,g);
 return g
}
async function addMarket(name,size,pos,rot=0,palette=null){try{const r=await fitted(MARKET+name+'.glb',size,palette);r.position.set(...pos);r.rotation.y=rot;world.add(r);return r}catch(e){console.warn('asset failed',name,e);return null}}
function interactable(type,name,x,z,range=1.5,extra={}){interactables.push({type,name,x,z,range,...extra})}

// Window walls are built around an actual opening, so there is no opaque wall behind the glass.
function windowWall(width,height,center,rot=0,sill=.95,opening=width-.8){
 const g=new THREE.Group();g.position.set(...center);g.rotation.y=rot;world.add(g);
 const wallColor=0xf2ede2,trimColor=0xc9c2b4,frameColor=0x716b62;
 const wallDepth=.18,headY=height-.34;
 const clearWidth=Math.min(opening,width-.55),side=Math.max(.26,(width-clearWidth)/2);
 // Solid wall pieces surround the windows instead of leaving one huge transparent hole.
 box([width,sill,wallDepth],[0,sill/2,0],wallColor,.94,g);
 box([width,height-headY,wallDepth],[0,(height+headY)/2,0],wallColor,.94,g);
 box([side,headY-sill,wallDepth],[-(clearWidth+side)/2,(headY+sill)/2,0],wallColor,.94,g);
 box([side,headY-sill,wallDepth],[(clearWidth+side)/2,(headY+sill)/2,0],wallColor,.94,g);
 // Split long openings into believable individual window bays.
 const bayGap=.18,maxBay=1.42,bays=Math.max(1,Math.ceil(clearWidth/maxBay));
 const usable=clearWidth-(bays-1)*bayGap,bayW=usable/bays,glassH=Math.max(.7,headY-sill-.18);
 for(let i=0;i<bays;i++){
  const x=-clearWidth/2+bayW/2+i*(bayW+bayGap),cy=(headY+sill)/2;
  const surround=bayGap*.7;
  if(i>0)box([surround,headY-sill,wallDepth+.025],[x-(bayW+bayGap)/2,cy,0],trimColor,.9,g);
  // Outer timber/aluminium frame.
  box([bayW+.08,.075,.23],[x,headY-.04,.005],frameColor,.58,g);
  box([bayW+.08,.075,.23],[x,sill+.04,.005],frameColor,.58,g);
  box([.07,headY-sill,.23],[x-bayW/2,cy,.005],frameColor,.58,g);
  box([.07,headY-sill,.23],[x+bayW/2,cy,.005],frameColor,.58,g);
  // Recessed glass with a subtle reflection tint.
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.3,bayW-.1),glassH),new THREE.MeshStandardMaterial({color:0xb9dfe8,transparent:true,opacity:.32,roughness:.12,metalness:.02,side:THREE.DoubleSide,depthWrite:false}));
  pane.position.set(x,cy,-.105);g.add(pane);
  // One mullion per bay keeps it readable without looking like a cage.
  if(bayW>.95)box([.045,glassH,.19],[x,cy,-.015],frameColor,.62,g);
 }
 // Projecting sill and a thin lintel make the window read as part of the wall.
 box([clearWidth+.24,.085,.34],[0,sill-.015,-.045],trimColor,.82,g);
 box([clearWidth+.18,.07,.25],[0,headY+.015,-.025],trimColor,.84,g);
 return g;
}
function visibleDoor(pos,rot=0,color=0x986b43,glass=false){
 const g=new THREE.Group();g.position.set(...pos);g.rotation.y=rot;world.add(g);
 const frame=0x3d322a;box([1.28,2.28,.16],[0,1.14,0],frame,.7,g);
 box([1.02,2.04,.12],[0,1.04,-.03],color,.72,g);
 if(glass){const pane=new THREE.Mesh(new THREE.PlaneGeometry(.72,.78),new THREE.MeshStandardMaterial({color:0xaedfea,transparent:true,opacity:.42,roughness:.2,metalness:.05,side:THREE.DoubleSide}));pane.position.set(0,1.43,-.105);g.add(pane);box([.78,.055,.035],[0,1.43,-.115],frame,.55,g);box([.055,.82,.035],[0,1.43,-.115],frame,.55,g)}
 const knob=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),new THREE.MeshStandardMaterial({color:0xd7b05d,metalness:.55,roughness:.35}));knob.position.set(.36,1.02,-.115);g.add(knob);
 box([1.18,.07,.38],[0,.035,.12],0xb89b77,.9,g);return g
}
function entryWall(width,height,z,doorX,doorWidth=1.42,sill=.9,color=0x2f7d60,glass=true){
 const left=-width/2,right=width/2,doorL=doorX-doorWidth/2,doorR=doorX+doorWidth/2,wallColor=0xf2ede2;
 const segment=(a,b)=>{
  const w=b-a;if(w<=.02)return;
  const x=(a+b)/2;
  if(w<.78)box([w,height,.18],[x,height/2,z],wallColor,.94);
  else windowWall(w,height,[x,0,z],0,sill,Math.max(.5,w-.48))
 };
 segment(left,doorL);segment(doorR,right);
 const headerH=Math.max(.16,height-2.28);
 box([doorWidth+.16,headerH,.18],[doorX,2.28+headerH/2,z],wallColor,.94);
 return visibleDoor([doorX,0,z-.01],0,color,glass)
}
function cityPose(time,speed,offset,lane){const distance=((time*speed+offset)%32+32)%32-16;return{x:lane,z:distance,y:0,rotation:speed>0?0:Math.PI}}
function trafficPhase(){const t=cityTime%17;return t<8?'cars':t<10?'yellow':'walk'}
function updateTrafficVisual(){const p=trafficPhase();for(const m of trafficSignalMeshes){if(m.userData.kind==='carGreen')m.material.emissiveIntensity=p==='cars'?2.6:.15;if(m.userData.kind==='carYellow')m.material.emissiveIntensity=p==='yellow'?2.6:.15;if(m.userData.kind==='carRed')m.material.emissiveIntensity=p==='walk'?2.6:.15;if(m.userData.kind==='walk')m.material.emissiveIntensity=p==='walk'?2.6:.15}}
function handleCarCollision(){if(state.location!=='town'||carHitCooldown>0||state.phase==='day')return;carHitCooldown=2.5;state.injury='car';state.treatmentNeeded=true;state.condition=clamp(state.condition-38,5,100);state.dailyIncidents.push('🚗 자동차 사고로 병원에 실려 갔어요.');injuryBurst(playerPos);impactBurst(playerPos,'car');playCarImpactSound();triggerCameraImpact(.34,.52);renderHud();save();toast('쾅! 자동차에 부딪혔어요. 구급차로 병원에 이동합니다.',true);setTimeout(()=>{if(state.location==='town')buildHospital('ambulance')},720)}
function wrappedStreetZ(z){while(z>=16)z-=32;while(z< -16)z+=32;return z}
function updateCity(dt){
 if(!state.running||document.hidden)return;cityTime+=dt;carHitCooldown=Math.max(0,carHitCooldown-dt);const vehicleGreen=trafficPhase()==='cars';
 for(const m of cityMovers){
  let moving=true,nextZ=m.z;
  if(m.walk){nextZ=wrappedStreetZ(m.z+m.speed*dt)}
  else{
   const trial=m.z+m.speed*dt;
   if(!vehicleGreen&&m.speed>0&&m.z<=-2.8&&trial>=-2.8){nextZ=-2.8;moving=false}
   else if(!vehicleGreen&&m.speed<0&&m.z>=2.8&&trial<=2.8){nextZ=2.8;moving=false}
   else if(!vehicleGreen&&((m.speed>0&&Math.abs(m.z+2.8)<.001)||(m.speed<0&&Math.abs(m.z-2.8)<.001))){nextZ=m.z;moving=false}
   else nextZ=wrappedStreetZ(trial)
  }
  m.z=nextZ;m.mixer?.update(dt);const baseY=Number.isFinite(m.groundY)?m.groundY:0;m.root.position.set(m.lane,baseY+(m.walk&&!m.mixer?Math.sin(cityTime*7+m.offset)*.015:0),m.z);m.root.rotation.y=m.speed>0?0:Math.PI;
  if(m.walk)keepPedestrianAboveGround(m,.025);
  if(state.location==='town'&&!m.walk&&moving&&Math.hypot(playerPos.x-m.lane,playerPos.z-m.z)<.9)handleCarCollision()
 }
 updateTrafficVisual()
}


async function ensureCity(){if(cityReady)return cityReady;cityReady=(async()=>{
 box([70,.1,70],[0,-.11,0],0x8eb77b,.98,city);
 // A street along the windows and a cross street beyond the shop.
 box([5,.06,36],[8,-.035,0],0x646e78,.98,city);box([36,.06,5],[0,-.035,-8],0x646e78,.98,city);
 box([1.35,.1,36],[4.8,.01,0],0xd5d0bf,.98,city);box([1.35,.1,36],[11.2,.01,0],0xd5d0bf,.98,city);box([36,.1,1.3],[0,.01,-4.85],0xd5d0bf,.98,city);
 for(let z=-16;z<=16;z+=4)box([.08,.012,1.6],[8,.005,z],0xf8e5a0,1,city);
 for(let x=-1.5;x<=1.5;x+=.6)box([.32,.015,4.2],[x,.015,-8],0xf3f0df,1,city);
 const placeUrl=async(url,size,pos,rot=0,palette=null)=>{const r=await fitted(url,size,palette);r.position.set(...pos);r.rotation.y=rot;r.traverse(o=>{if(o.isMesh)o.castShadow=false});city.add(r);return r};
 const place=(kind,size,pos,rot=0,palette=null)=>placeUrl(CITY_ASSETS[kind],size,pos,rot,palette);
 const decorate=(kind,size,pos,rot=0)=>placeUrl(CITY_DECOR_ASSETS[kind],size,pos,rot);
 const palettes=[[0xf0d59c,0xa85d45,0x425b6c],[0xc8dfcf,0x5f8794,0xead9bb],[0xeab8a6,0x8a5b68,0xf1e3c3],[0xcbd7ec,0x5574a0,0xf3d6a2],[0xf2d58b,0xa95e45,0x466a58],[0xe2c4e8,0x78618f,0xf5dfb3],[0xd9e5c1,0x55715c,0xe8c79a]];
 await Promise.all([[-10,-15],[-3,-15],[4,-15],[15,-12],[15,-3],[15,7],[-13,7]].map(([x,z],i)=>place(i%3===0?'tower':'house',i%3===0?9:6,[x,0,z],x>12?-Math.PI/2:0,palettes[i%palettes.length])));

 await Promise.all([[-5,-5],[4,-4],[4,3],[11,5],[11,-3],[-6,5],[-10,-4]].map(([x,z])=>place('tree',2.7,[x,0,z])));
 await Promise.all([
  ['bench',1.45,[4.42,0,6.7],Math.PI/2],['bicycle',1.15,[11.5,0,4.9],Math.PI/2],['busStop',1.88,[11.58,0,10.8],-Math.PI/2],
  ['hydrant',.68,[4.4,0,-5.8],0],['planter',1.28,[11.5,0,-6.3],Math.PI/2],['trashCan',.68,[4.42,0,11.8],0],['mailbox',.88,[11.5,0,-13.2],Math.PI/2]
 ].map(([kind,size,pos,rot])=>decorate(kind,size,pos,rot)));
 for(const [i,lane]of [6.8,9.2].entries()){const z=-12+i*14,r=await place('car',2.5,[lane,0,z]);cityMovers.push({root:r,lane,z,speed:i?-2.1:2.4,offset:i*17,walk:false})}
 const pedestrianDefs=[
  [5.34,-13,.72,'출근하는 주민'],[5.34,-7,-.62,'장보러 가는 주민'],[5.34,-1,.54,'산책하는 주민'],
  [10.66,-10,-.7,'통근자'],[10.66,-3,.64,'학생'],[10.66,4,-.56,'퇴근하는 주민'],
  [4.58,6.15,0,'벤치에서 쉬는 주민'],[11.0,10.05,0,'버스를 기다리는 주민']
 ];
 for(let i=0;i<pedestrianDefs.length;i++){
  const [lane,z,speed,role]=pedestrianDefs[i],r=await placeUrl(CITY_PEOPLE_ASSETS[i%CITY_PEOPLE_ASSETS.length],1.55,[lane,0,z]),surfaceY=.06,groundY=groundModel(r,surfaceY,.04),mixer=startModelAnimation(r,Math.abs(speed)>.05?/walk|sprint|run/i:/idle/i);
  r.userData.role=role;cityMovers.push({root:r,lane,z,speed,offset:3+i*5,walk:true,groundY,surfaceY,footLocalY:r.userData.footLocalY,mixer,role})
 }
 })().catch(e=>{cityReady=null;clearGroup(city);cityMovers.length=0;throw e});return cityReady}

// Furniture keeps its source proportions. Scale to height (or width for tables),
// center the footprint, and ground the model before deriving closed-body collisions.
async function homeModel(name,value,pos,axis='y',rot=0,solid=true){const data=await asset(KITCHEN+name+'.glb'),clone=data.scene.clone(true),root=new THREE.Group();root.add(clone);recolor(clone,null);let bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3());clone.scale.multiplyScalar(value/(size[axis]||1));bounds=new THREE.Box3().setFromObject(clone);const center=bounds.getCenter(new THREE.Vector3());clone.position.x-=center.x;clone.position.z-=center.z;clone.position.y-=bounds.min.y;root.userData.localBounds=new THREE.Box3().setFromObject(root);root.rotation.y=rot;root.position.set(...pos);world.add(root);bounds=new THREE.Box3().setFromObject(root);size=bounds.getSize(new THREE.Vector3());root.userData.closedBounds=bounds.clone();if(solid)addCollider((bounds.min.x+bounds.max.x)/2,(bounds.min.z+bounds.max.z)/2,size.x,size.z);return root}
async function indoorResident(url,pos,rot=0,role='주민',pattern=/idle/i,surfaceY=pos[1]||0){
 const r=await fitted(url,1.55);r.position.set(...pos);r.rotation.y=rot;r.userData.role=role;world.add(r);groundModel(r,surfaceY,.025);
 const mixer=startModelAnimation(r,pattern);if(mixer)roomMixers.push(mixer);return r
}
function addGymTreadmill(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
 box([.92,.12,1.82],[0,.12,0],0x303842,.72,g);box([.68,.035,1.48],[0,.195,.08],0x171c22,.52,g);
 box([.055,.9,.055],[-.36,.62,-.68],0x707b87,.5,g);box([.055,.9,.055],[.36,.62,-.68],0x707b87,.5,g);
 box([.82,.07,.08],[0,.93,-.68],0x596573,.46,g);box([.46,.26,.08],[0,1.12,-.68],0x4659a6,.38,g);
 addCollider(x,z,.92,1.82);return g
}
function addGymDumbbellRack(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);world.add(g);
 box([1.55,.08,.46],[0,.48,0],0x404852,.65,g);box([.08,.82,.08],[-.66,.41,0],0x69737d,.5,g);box([.08,.82,.08],[.66,.41,0],0x69737d,.5,g);
 const metal=new THREE.MeshStandardMaterial({color:0xa8b0b7,roughness:.38,metalness:.42}),plateMat=new THREE.MeshStandardMaterial({color:0x252b31,roughness:.72});
 for(let j=0;j<5;j++){const dx=-.48+j*.24,bar=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.32,10),metal);bar.rotation.z=Math.PI/2;bar.position.set(dx,.56,0);g.add(bar);for(const ox of [-.14,.14]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.045,12),plateMat);p.rotation.z=Math.PI/2;p.position.set(dx+ox,.56,0);g.add(p)}}
 addCollider(x,z,1.55,.46);return g
}
function addGymMat(x,z,color){
 const g=new THREE.Group();g.position.set(x,.025,z);world.add(g);box([1.55,.045,.68],[0,0,0],color,.84,g);return g
}
async function marketSurfaceModel(name,value,pos,axis='x',rot=0,solid=true){const data=await asset(MARKET+name+'.glb'),clone=data.scene.clone(true),root=new THREE.Group();root.add(clone);recolor(clone,null);let bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3());clone.scale.multiplyScalar(value/(size[axis]||1));bounds=new THREE.Box3().setFromObject(clone);const center=bounds.getCenter(new THREE.Vector3());clone.position.x-=center.x;clone.position.z-=center.z;clone.position.y-=bounds.min.y;root.userData.localBounds=new THREE.Box3().setFromObject(root);root.rotation.y=rot;root.position.set(...pos);world.add(root);bounds=new THREE.Box3().setFromObject(root);size=bounds.getSize(new THREE.Vector3());root.userData.closedBounds=bounds.clone();if(solid)addCollider((bounds.min.x+bounds.max.x)/2,(bounds.min.z+bounds.max.z)/2,size.x,size.z);return root}
async function packDecor(url,size,pos,rot=0,solid=false,palette=null,parent=world){try{const r=await fitted(url,size,palette);r.position.set(pos[0],0,pos[2]);r.rotation.y=rot;groundModel(r,pos[1]??0,.01);parent.add(r);if(solid){const b=new THREE.Box3().setFromObject(r),s=b.getSize(new THREE.Vector3());addCollider((b.min.x+b.max.x)/2,(b.min.z+b.max.z)/2,s.x,s.z)}return r}catch(e){console.warn('optional decor failed',url,e);return null}}
function setStorageDoors(root,open){root.traverse(o=>{if(/^door/.test(o.name))o.rotation.y=open?(o.name==='doorRight'?1:-1)*Math.PI*.62:0})}
async function toggleStorage(kind){storageOpen[kind]=!storageOpen[kind];for(const r of kitchenStorage[kind]||[])setStorageDoors(r,storageOpen[kind]);await syncHomeInventory();toast(storageOpen[kind]?'문을 열었어요. 보이는 식품을 꺼내 보세요.':'문을 닫았어요.')}
async function buildHome(){
 endDog(false);document.body.classList.remove('lifeTown');state.location='home';state.phase='home';colliders=[];interactables=[];kitchenStorage={fridge:[],pantry:[]};storageOpen={fridge:false,pantry:false};ui.labels.innerHTML='';labelViews=[];clearGroup(world);clearGroup(homeFoodGroup);if(cart){cart.removeFromParent();cart=null}scene.background.set(0xb9dce9);scene.fog.color.set(0xb9dce9);scene.fog.near=30;scene.fog.far=65;await ensureCity();
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(6.8,6.4),new THREE.MeshStandardMaterial({color:0xd8c7ad,roughness:.96}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;world.add(floor);
 windowWall(6.8,3.3,[0,0,-3.05],0,1.02,3.0);windowWall(6.4,3.3,[-3.35,0,0],Math.PI/2,.92,2.05);windowWall(6.4,3.3,[3.35,0,0],Math.PI/2,.92,2.05);entryWall(6.8,3.3,3.2,-2.4,1.34,.92,0x9c6a43,false);addCeilingLights(6.8,6.4,3.22);wallSign('우리 집 부엌',[0,2.55,-2.92],1.72,'#ba7c50');
 // The side runs face inward; the back run faces the open side of the U.
 const fridge=await homeModel('kitchen-fridge',2.25,[-2.65,0,-.9],'y',Math.PI/2);kitchenStorage.fridge.push(fridge);interactable('fridge','냉장고',-1.25,-.9,1.7);
 for(const y of [0,1.05])kitchenStorage.pantry.push(await homeModel('kitchen-cabinet-upper-double',1.05,[-2.65,y,.65],'x',Math.PI/2));interactable('pantry','찬장',-1.25,.65,1.7);
 await homeModel('kitchen-sink',1.0,[-1.15,0,-2.35]);interactable('sink','싱크대',-1.15,-1.1,1.55);
 for(const x of [0,1.05]){const r=await homeModel('kitchen-cabinet',1.0,[x,0,-2.35]);counterTop=r.userData.closedBounds.max.y}interactable('counter','조리대',.5,-1.1,1.75);
 const stove=await homeModel('kitchen-stove-electric',1.0,[2.65,0,-.9],'y',-Math.PI/2),stoveTop=stove.userData.closedBounds.max.y;interactable('stove','인덕션',1.25,-.9,1.65);
 const sideCabinet=await homeModel('kitchen-cabinet',1.0,[2.65,0,.65],'y',-Math.PI/2),sideTop=sideCabinet.userData.closedBounds.max.y;await homeModel('kitchen-microwave',.4,[2.65,1,.65],'y',-Math.PI/2,false);interactable('microwave','전자레인지',1.25,.65,1.7);
 const table=await homeModel('table',.78,[0,0,2.1]);tableTop=table.userData.closedBounds.max.y;interactable('table','식탁',0,.9,1.7);
 await homeModel('rug-rectangle',2.55,[0,.012,2.05],'x',0,false);
 for(const x of [-.65,.65])await homeModel('chair',.9,[x,0,2.95],'y',Math.PI);
 await Promise.all([
  homeModel('rug-doormat',1.25,[-2.4,.014,2.72],'x',0,false),
  homeModel('potted-plant',1.05,[2.73,0,2.48],'y',0,false),
  homeModel('bookcase-open-low',1.18,[2.92,0,1.18],'x',-Math.PI/2,true),
  packDecor(CHARMING+'pan.glb',.48,[2.65,stoveTop,-.9],-.35),
  packDecor(CHARMING+'toaster.glb',.38,[.05,counterTop,-2.35],0),
  packDecor(CHARMING+'kettle.glb',.34,[.88,counterTop,-2.35],.25),
  packDecor(CHARMING+'utensils-cup.glb',.28,[2.65,sideTop,.55],0),
  packDecor(CHARMING+'mug-yellow.glb',.2,[.35,tableTop,2.1],.2),
  packDecor(CHARMING+'plate.glb',.28,[-.35,tableTop,2.1],0),
  packDecor(CHARMING+'extractor-hood.glb',.72,[3.02,1.62,-.9],-Math.PI/2),
  packDecor(KITCHEN+'trashcan.glb',.58,[-2.62,0,-2.25],0,false),
  packDecor(KITCHEN+'lamp-wall.glb',.58,[2.42,1.72,-2.86],0,false)
 ]);
 interactable('marketDoor','동네로 나가는 문',-2.4,2.5,1.8);sign('밖으로',[-2.4,2.35,3.02],.28,'#2f7d60');
 await syncHomeInventory();if(state.held){if(state.held.kind==='dish')await showDishHeld(state.held);else await showHeldModel(state.held.id)}
 setSpawn('home');renderHud();
}

async function buildStore(){
 endDog(false);document.body.classList.remove('lifeTown');state.location='market';state.phase='shopping';homeInventoryRevision++;colliders=[];interactables=[];ui.labels.innerHTML='';labelViews=[];clearGroup(world);clearGroup(homeFoodGroup);scene.background.set(0xb9dce9);scene.fog.color.set(0xb9dce9);scene.fog.near=30;scene.fog.far=65;await ensureCity();
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,9),new THREE.MeshStandardMaterial({color:0xd4d0bd,roughness:.98}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;world.add(floor);windowWall(10,3.1,[0,0,-4.4],0,.82,5.2);windowWall(9,3.1,[-4.9,0,0],Math.PI/2,.8,2.7);windowWall(9,3.1,[4.9,0,0],Math.PI/2,.8,2.7);entryWall(10,3.1,4.45,1.05,1.48,.8,0x2f7d60,true);addCeilingLights(10,9,3.22);wallSign('우리 동네 마트',[0,2.5,-4.27],1.78,'#2f7d60');
 marketDisplays={};marketDisplaySurfaces={};
 // Keep a clear central aisle and put goods inside/on their real fixtures instead of at each model's bounding-box peak.
 const displayDefs=[
  ['produceA','display-fruit',-3.45,-3.35,2.15,0],['produceB','display-fruit',-1.05,-3.35,2.15,0],['bakery','display-bread',2.35,-3.35,2.05,0],['chilled','freezer',3.78,-.25,2.35,Math.PI/2],['island',null,-.15,.25,2.18,0]
 ];
 for(const [key,model,x,z,width,rot]of displayDefs){
  const r=model?await marketSurfaceModel(model,width,[x,0,z],'x',rot):await homeModel('table',width,[x,0,z],'x',rot);const b=r.userData.closedBounds,s=b.getSize(new THREE.Vector3());marketDisplays[key]=b;
  marketDisplaySurfaces[key]=key.startsWith('produce')?b.min.y+s.y*.6:key==='bakery'?b.min.y+s.y*.72:b.max.y;
  sign(key.startsWith('produce')?'과일 · 채소':key==='bakery'?'빵 · 간식':key==='chilled'?'냉장 · 냉동':'식품 · 음료',[x,1.52,z],.23,ZONES[key==='bakery'?'bakery':key==='chilled'?'chilled':key.startsWith('produce')?'produce':'pantry'].color);
 }
 await Promise.all([
  packDecor(MARKET+'shelf-boxes.glb',2.0,[-4.18,0,.2],Math.PI/2,true),
  packDecor(MARKET+'shelf-bags.glb',1.85,[-4.18,0,-1.75],Math.PI/2,true),
  packDecor(MARKET+'freezers-standing.glb',2.05,[4.2,0,-2.45],-Math.PI/2,true),
  packDecor(MARKET+'shopping-basket.glb',.78,[2.9,0,3.15],-.25,false)
 ]);
 box([2,.8,1.05],[-3.3,.4,2.7],0x356a55);box([2,.1,1.1],[-3.3,.85,2.7],0x173b31);addCollider(-3.3,2.7,2,1.1);await addMarket('cash-register',.75,[-3.7,.9,2.7],Math.PI);interactable('checkout','셀프 계산대',-3.3,3.7,1.8);sign('계산대',[-3.3,1.8,2.7],.35,'#2f7d60');
 if(!state.hasCart)await addMarket('shopping-cart',1.05,[3.55,0,3.15],-.35);interactable('cartBay','카트 보관소',2.65,3.2,1.8);interactable('homeDoor','동네로 나가기',1.05,3.7,1.8);sign('밖으로',[1.05,2.46,4.27],.22,'#2f7d60');
 await buildMarketProducts();if(state.hasCart)await spawnCart();if(state.held?.id)await showHeldModel(state.held.id);setSpawn('market');renderHud();
}

async function buildTown(from='home'){
 endDog(false);state.location='town';state.phase='town';homeInventoryRevision++;colliders=[];interactables=[];ui.labels.innerHTML='';labelViews=[];clearGroup(world);clearGroup(homeFoodGroup);if(cart){cart.removeFromParent();cart=null}scene.background.set(0xb9dce9);scene.fog.color.set(0xb9dce9);scene.fog.near=35;scene.fog.far=75;await ensureCity();document.body.classList.add('lifeTown');freeWalk=true;
 const buildings=[[-10,-15,5.4,4.5],[-3,-15,5.2,4.5],[4,-15,5.2,4.5],[15,-12,4.5,6],[15,-3,4.5,6],[15,7,4.5,6],[-13,7,5.5,5.5]];for(const [x,z,w,d]of buildings)addCollider(x,z,w,d);for(let z=-1.4;z<=1.4;z+=.55)box([6.4,.016,.28],[8,.018,z],0xf5f1df,1,world);
 visibleDoor([-10,0,-12.68],0,0x9c6a43,false);sign('🏠 우리 집',[-10,2.55,-12.55],.34,'#ba7c50');interactable('homeEntry','우리 집',-10,-11.5,2.2);
 visibleDoor([-3,0,-12.68],0,0x2b8b5b,true);storefrontCanopy(-3,-12.28,2.75,0x2f9c68);wallSign('24시 편의점',[-3,2.72,-12.5],1.75,'#2f8b5b');interactable('convenienceEntry','24시 편의점',-3,-11.5,2.2);
 visibleDoor([4,0,-12.68],0,0xbd4b3f,true);storefrontCanopy(4,-12.28,2.85,0xd85642,0xffd76b);wallSign('버거하우스',[4,2.72,-12.5],1.7,'#d85642');interactable('fastFoodEntry','버거하우스',4,-11.5,2.2);
 visibleDoor([12.68,0,-12],Math.PI/2,0x2f7d60,true);sign('🛒 마트',[12.55,2.55,-12],.34,'#2f7d60');interactable('marketEntry','우리 동네 마트',12.2,-12,2.2);
 visibleDoor([-13,0,4.18],0,0x4d6f91,true);sign('💼 사무실',[-13,2.55,4.32],.34,'#4d7ea8');interactable('officeEntry','사무실',-13,3.8,2.2);
 visibleDoor([12.68,0,-3],Math.PI/2,0x5367d6,true);wallSign('파워짐',[12.53,2.66,-3],1.46,'#5367d6',Math.PI/2);interactable('gymEntry','파워짐 헬스장',12.2,-3,2.2);
 visibleDoor([12.68,0,7],Math.PI/2,0xb94f4b,true);sign('🏥 병원',[12.55,2.55,7],.34,'#d65b52');interactable('hospitalEntry','병원',12.2,7,2.2);
 trafficSignalMeshes=[];for(const z of [-2.1,2.1]){box([.12,2.4,.12],[5.2,1.2,z],0x343d3b,.75,world);const red=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshStandardMaterial({color:0x9a2f2d,emissive:0xff3b35,emissiveIntensity:.15}));red.position.set(5.2,2.0,z);red.userData.kind='carRed';world.add(red);trafficSignalMeshes.push(red);const yellow=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshStandardMaterial({color:0xa98220,emissive:0xffd84f,emissiveIntensity:.15}));yellow.position.set(5.2,1.81,z);yellow.userData.kind='carYellow';world.add(yellow);trafficSignalMeshes.push(yellow);const green=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshStandardMaterial({color:0x277447,emissive:0x47ff83,emissiveIntensity:.15}));green.position.set(5.2,1.62,z);green.userData.kind='carGreen';world.add(green);trafficSignalMeshes.push(green);const walk=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),new THREE.MeshStandardMaterial({color:0x2d7d55,emissive:0x6cff9b,emissiveIntensity:.15}));walk.position.set(10.8,1.65,z);walk.userData.kind='walk';world.add(walk);trafficSignalMeshes.push(walk)}
 const spawns={home:[-10,1.62,-10.4],convenience:[-3,1.62,-10.4],fastfood:[4,1.62,-10.4],market:[11.2,1.62,-12],gym:[11.2,1.62,-3],office:[-13,1.62,2.8],hospital:[11.2,1.62,7],ambulance:[11.2,1.62,7]};const s=spawns[from]||spawns.home;playerPos.set(...s);yaw=(from==='market'||from==='gym')?-Math.PI/2:0;pitch=-.12;camera.position.copy(playerPos);camera.rotation.y=yaw;camera.rotation.x=pitch;dogSpawnClock=12+Math.random()*12;renderHud();save()
}

async function buildConvenienceStore(){
 endDog(false);state.location='convenience';state.phase='convenience';colliders=[];interactables=[];ui.labels.innerHTML='';labelViews=[];clearGroup(world);clearGroup(homeFoodGroup);document.body.classList.remove('lifeTown');scene.background.set(0xc7e3e4);scene.fog.color.set(0xc7e3e4);scene.fog.near=26;scene.fog.far=55;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(7.2,6.2),new THREE.MeshStandardMaterial({color:0xd9d6c8,roughness:.96}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;world.add(floor);
 windowWall(7.2,3.1,[0,0,-3.0],0,.84,4.2);windowWall(6.2,3.1,[-3.55,0,0],Math.PI/2,.84,2.1);windowWall(6.2,3.1,[3.55,0,0],Math.PI/2,.84,2.1);entryWall(7.2,3.1,3.0,-2.65,1.3,.84,0x2f8b5b,true);addCeilingLights(7.2,6.2,3.18);wallSign('24시 편의점',[0,2.5,-2.87],1.7,'#2f8b5b');
 await Promise.all([
  packDecor(MARKET+'shelf-boxes.glb',1.85,[-2.65,0,-.7],Math.PI/2,true),
  packDecor(MARKET+'shelf-bags.glb',1.75,[-2.65,0,1.0],Math.PI/2,true),
  packDecor(MARKET+'freezers-standing.glb',1.85,[2.72,0,-1.35],-Math.PI/2,true),
  packDecor(MARKET+'shopping-basket.glb',.65,[2.55,0,2.15],-.2,false)
 ]);
 box([3.8,.72,.72],[0,.36,-.55],0x547b6a,.86);box([3.9,.08,.82],[0,.76,-.55],0xe9e2cf,.72);addCollider(0,-.55,3.9,.82);
 const itemXs=[-1.25,0,1.25];
 for(let i=0;i<CONVENIENCE_ITEMS.length;i++){
  const item=CONVENIENCE_ITEMS[i],p=productById(item.id),root=await fitted(productAssetUrl(p),.3);root.position.set(itemXs[i],.8,-.55);world.add(root);
  sign(item.label+' '+fmt(item.price),[itemXs[i],1.42,-.52],.15,'#2f8b5b');
  interactable('convenienceBuy',item.label,itemXs[i],.2,1.12,{productId:item.id,price:item.price})
 }
 box([2.1,.76,.68],[1.15,.38,-2.35],0x315d50,.84);box([2.18,.08,.76],[1.15,.8,-2.35],0xe8dfc8,.72);addCollider(1.15,-2.35,2.18,.76);await addMarket('cash-register',.62,[1.15,.84,-2.35],0);await addMarket('character-employee',1.48,[1.15,0,-2.78],Math.PI,[0x2f8b5b,0xf4ead8,0x334a43]);sign('빠른 계산 · 카트 필요 없음',[1.15,1.62,-2.27],.18,'#2f8b5b');
 interactable('convenienceExit','동네로 나가기',-2.65,2.35,1.8);sign('밖으로',[-2.65,2.42,2.88],.21,'#2f8b5b');setSpawn('convenience');renderHud();save()
}
function buyConvenienceItem(productId,price){
 const p=productById(productId);if(!p)return;if(state.money<price)return toast('돈이 부족해요. 편의점은 빠르지만 마트보다 조금 비싸요.',true);
 state.money-=price;state.dailyExpense+=price;state.weekStats.spent+=price;state.inventory.push({uid:makeUid(productId),id:productId,age:0});state.dailyIncidents.push('🏪 편의점에서 '+p.name+'을(를) '+fmt(price)+'에 샀어요.');
 tone('cash');renderHud();save();toast(p.name+' 구입 완료! 카트 없이 바로 샀어요.')
}
async function buildFastFood(){
 endDog(false);state.location='fastfood';state.phase='fastfood';colliders=[];interactables=[];ui.labels.innerHTML='';labelViews=[];clearGroup(world);clearGroup(homeFoodGroup);document.body.classList.remove('lifeTown');scene.background.set(0xead8ca);scene.fog.color.set(0xead8ca);scene.fog.near=26;scene.fog.far=55;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(7.8,6.6),new THREE.MeshStandardMaterial({color:0xd6c4a8,roughness:.94}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;world.add(floor);
 windowWall(7.8,3.15,[0,0,-3.2],0,.88,4.6);windowWall(6.6,3.15,[-3.85,0,0],Math.PI/2,.88,2.15);windowWall(6.6,3.15,[3.85,0,0],Math.PI/2,.88,2.15);entryWall(7.8,3.15,3.2,-3.0,1.34,.88,0xc8503e,true);addCeilingLights(7.8,6.6,3.2);wallSign('버거하우스',[0,2.55,-3.07],1.72,'#d85642');
 box([5.5,.86,.82],[0,.43,-2.15],0xa53f34,.78);box([5.65,.09,.92],[0,.9,-2.15],0xffd36b,.62);addCollider(0,-2.15,5.65,.92);
 const menuKeys=['burger','double'],menuXs=[-1.25,1.25];
 for(let i=0;i<menuKeys.length;i++){
  const key=menuKeys[i],m=FAST_FOOD_MENU[key],root=await fitted(FOOD+m.model,.42);root.position.set(menuXs[i],.96,-2.15);world.add(root);
  sign(m.name+' '+fmt(m.price),[menuXs[i],1.72,-2.02],.17,'#d85642');interactable('fastFoodOrder',m.name,menuXs[i],-1.05,1.15,{menuKey:key})
 }
 await addMarket('character-employee',1.48,[0,0,-2.78],Math.PI,[0xd85642,0xffd76b,0x3d2f2a]);
 await Promise.all([
  packDecor(FOOD+'fries.glb',.32,[0,.96,-2.15],.2,false),
  homeModel('table',1.25,[-2.25,0,.65],'x',0,true),
  homeModel('table',1.25,[1.3,0,.65],'x',0,true),
  homeModel('chair-desk',.78,[-2.25,0,1.55],'y',Math.PI,true),
  homeModel('chair-desk',.78,[1.3,0,1.55],'y',Math.PI,true)
 ]);
 interactable('fastFoodExit','동네로 나가기',-3.0,2.45,1.8);sign('밖으로',[-3,2.46,3.08],.21,'#d85642');setSpawn('fastfood');renderHud();save()
}
function orderFastFood(menuKey){
 const m=FAST_FOOD_MENU[menuKey];if(!m)return;if(state.money<m.price)return toast('돈이 부족해요. 다른 메뉴를 고르거나 집에서 먹어도 돼요.',true);
 state.money-=m.price;state.dailyExpense+=m.price;state.weekStats.spent+=m.price;
 applyMeal({name:m.name,nutrition:m.nutrition},false,true);state.weekStats.meals++;state.weekStats.quick++;state.dailyIncidents.push('🍔 '+m.name+'을(를) '+fmt(m.price)+'에 사 먹었어요.');
 state.mealFoods=[];state.mealCooked=false;state.mealQuick=false;tone('eat');renderHud();save();advanceMeal();toast(m.name+'을 바로 먹었어요. 빠르지만 비용과 영양도 함께 생각해 볼 수 있어요.')
}

const GYM_DAY_PASS=3500;
const GYM_WORKOUTS={
 run:{name:'러닝머신 20분',burn:180,hunger:12,condition:-1,satisfaction:4},
 weights:{name:'근력 운동',burn:120,hunger:9,condition:-1,satisfaction:3},
 stretch:{name:'스트레칭',burn:35,hunger:3,condition:1,satisfaction:2}
};
async function buildGym(){
 endDog(false);state.location='gym';state.phase='gym';colliders=[];interactables=[];ui.labels.innerHTML='';labelViews=[];clearGroup(world);clearGroup(homeFoodGroup);document.body.classList.remove('lifeTown');await ensureCity();
 scene.background.set(0xd5e0e6);scene.fog.color.set(0xd5e0e6);scene.fog.near=25;scene.fog.far=58;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(9.2,7.2),new THREE.MeshStandardMaterial({color:0xb8bec3,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;world.add(floor);
 windowWall(9.2,3.25,[0,0,-3.5],0,.92,4.6);windowWall(7.2,3.25,[-4.55,0,0],Math.PI/2,.9,2.25);windowWall(7.2,3.25,[4.55,0,0],Math.PI/2,.9,2.25);entryWall(9.2,3.25,3.5,-3.25,1.38,.9,0x5367d6,true);addCeilingLights(9.2,7.2,3.28);wallSign('파워짐',[0,2.6,-3.37],1.58,'#5367d6');
 const reception=await homeModel('desk',1.5,[2.8,0,2.55],'x',Math.PI),receptionTop=reception.userData.closedBounds.max.y;
 await Promise.all([
  homeModel('chair-desk',.78,[2.8,0,3.12],'y',0),
  homeModel('bookcase-closed-wide',1.9,[4.08,0,.65],'y',Math.PI/2,true),
  homeModel('bench',1.42,[2.55,0,1.4],'x',Math.PI/2,true),
  packDecor(KITCHEN+'computer-screen.glb',.42,[2.8,receptionTop+.01,2.55],0,false),
  packDecor(KITCHEN+'potted-plant.glb',.95,[4.0,0,2.65],0,false),
  packDecor(KITCHEN+'trashcan.glb',.55,[1.7,0,2.9],0,false),
  addMarket('character-employee',1.48,[2.8,0,3.25],0,[0x5367d6,0xeef2ff,0x26324a])
 ]);
 wallSign('1일 이용권 '+fmt(GYM_DAY_PASS),[2.78,2.15,3.28],1.24,'#5367d6',Math.PI);sign('락커 · 휴식',[3.35,1.55,1.35],.17,'#5367d6');
 addGymTreadmill(-2.65,-1.45);addGymTreadmill(-.85,-1.45);sign('유산소',[-1.75,1.72,-2.22],.22,'#5367d6');interactable('gymRun','러닝머신 20분',-1.75,-.15,1.35);
 addGymDumbbellRack(3.35,-2.15);await homeModel('bench',1.48,[2.25,0,-.55],'x',0,true);box([5.0,1.25,.045],[1.65,1.72,-3.37],0xc4d7df,.22);
 sign('웨이트 존',[2.55,1.65,-2.65],.19,'#394b9a');interactable('gymWeights','근력 운동',2.25,.55,1.35);
 addGymMat(-1.25,1.45,0x6f8fd8);addGymMat(.55,1.45,0x74a786);sign('스트레칭',[-.35,1.25,1.44],.18,'#5576b9');interactable('gymStretch','스트레칭',-.35,2.15,1.2);
 interactable('gymRest','잠깐 쉬기',2.45,1.9,1.2);
 await Promise.all([
  indoorResident(CITY_PEOPLE_ASSETS[2],[-2.65,0,-1.35],Math.PI,'러닝하는 주민',/run|sprint|walk/i,.24),
  indoorResident(CITY_PEOPLE_ASSETS[5],[3.55,0,-.55],-Math.PI/2,'운동하는 주민')
 ]);
 interactable('gymExit','동네로 나가기',-3.25,2.72,1.8);sign('밖으로',[-3.25,2.5,3.38],.2,'#5367d6');setSpawn('gym');renderHud();save()
}
function gymPassReady(){
 if(state.gymPassDay===state.day)return true;
 if(state.money<GYM_DAY_PASS){toast('헬스장 1일 이용권 '+fmt(GYM_DAY_PASS)+'이 필요해요.',true);return false}
 state.money-=GYM_DAY_PASS;state.dailyExpense+=GYM_DAY_PASS;state.weekStats.spent+=GYM_DAY_PASS;state.gymPassDay=state.day;state.dailyIncidents.push('🏋️ 파워짐 1일 이용권 '+fmt(GYM_DAY_PASS)+'을 샀어요.');tone('cash');return true
}
function doGymWorkout(kind){
 const w=GYM_WORKOUTS[kind];if(!w)return;
 if(state.treatmentNeeded)return toast('다친 상태에서는 운동하지 말고 병원에서 먼저 치료받는 게 좋아요.',true);
 if((kind==='run'||kind==='weights')&&state.condition<32)return toast('컨디션이 너무 낮아요. 오늘은 스트레칭이나 휴식을 선택해 보세요.',true);
 if((state.gymWorkoutCount||0)>=2)return toast('오늘 운동은 충분히 했어요. 무리하지 말고 쉬어 주세요.',true);
 if(!gymPassReady())return;
 state.gymWorkoutCount=(state.gymWorkoutCount||0)+1;state.dailyActivityKcal=(state.dailyActivityKcal||0)+w.burn;
 state.hunger=clamp(state.hunger-w.hunger,0,100);state.condition=clamp(state.condition+w.condition,5,100);state.satisfaction=clamp(state.satisfaction+w.satisfaction,20,100);
 state.dailyIncidents.push('🏃 '+w.name+' · 활동 '+w.burn+' kcal');tone('good');renderHud();save();toast(w.name+' 완료! 운동 뒤에는 배가 더 고플 수 있어요.')
}
function restAtGym(){tone('good');toast('벤치에서 잠깐 쉬었어요. 오늘 운동은 최대 2번까지 할 수 있어요.')}

async function buildOffice(){
 endDog(false);state.location='office';state.phase='office';colliders=[];interactables=[];ui.labels.innerHTML='';labelViews=[];clearGroup(world);scene.background.set(0xc9dce5);scene.fog.near=25;scene.fog.far=55;document.body.classList.remove('lifeTown');
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(9,7),new THREE.MeshStandardMaterial({color:0xc9b99e,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;world.add(floor);
 windowWall(9,3.2,[0,0,-3.35],0,.88,4.4);windowWall(7,3.2,[-4.45,0,0],Math.PI/2,.86,2.2);windowWall(7,3.2,[4.45,0,0],Math.PI/2,.86,2.2);entryWall(9,3.2,3.35,-3.5,1.38,.86,0x4d6f91,true);addCeilingLights(9,7,3.25);wallSign('우리 사무실',[0,2.5,-3.22],1.6,'#4d7ea8');
 const deskXs=[-2.35,0,2.35],deskTops=[];
 for(let i=0;i<deskXs.length;i++){
  const x=deskXs[i],desk=await homeModel('desk',1.5,[x,0,-1.35],'x',0),top=desk.userData.closedBounds.max.y;deskTops.push(top);
  await homeModel('chair-desk',.8,[x,0,-.15],'y',Math.PI);
  await Promise.all([
   packDecor(KITCHEN+'computer-screen.glb',.44,[x,top+.012,-1.35],Math.PI,false),
   packDecor(KITCHEN+'computer-keyboard.glb',.34,[x-.1,top+.01,-1.02],Math.PI,false),
   packDecor(KITCHEN+'computer-mouse.glb',.16,[x+.42,top+.01,-1.02],Math.PI,false)
  ])
 }
 interactable('workDesk','내 자리',0,.35,1.75);
 await Promise.all([
  homeModel('bookcase-open',1.62,[-4.02,0,-1.8],'y',Math.PI/2,true),
  homeModel('bookcase-open-low',1.35,[-4.0,0,.45],'x',Math.PI/2,true),
  homeModel('potted-plant',1.15,[3.82,0,-2.58],'y',0,false),
  homeModel('rug-round',2.15,[2.55,.012,1.85],'x',0,false),
  homeModel('table-coffee',1.25,[2.55,0,1.85],'x',0,true),
  homeModel('lounge-chair',1.02,[1.45,0,2.25],'y',Math.PI/2,true),
  homeModel('lounge-chair',1.02,[3.55,0,2.25],'y',-Math.PI/2,true)
 ]);
 await Promise.all([
  packDecor(FOOD+'cup-coffee.glb',.22,[2.55,.66,1.85],.2,false),
  packDecor(KITCHEN+'trashcan.glb',.58,[3.82,0,.05],0,false),
  packDecor(KITCHEN+'lamp-round-floor.glb',1.65,[3.92,0,2.75],0,false),
  indoorResident(CITY_PEOPLE_ASSETS[8],[-2.35,0,.25],Math.PI,'동료 직원'),
  indoorResident(CITY_PEOPLE_ASSETS[9],[2.35,0,.25],Math.PI,'동료 직원')
 ]);
 sign('업무 공간',[0,2.02,-2.45],.2,'#4d7ea8');sign('휴게 코너',[2.55,1.55,1.85],.18,'#7b6f9c');
 interactable('officeExit','퇴근 · 밖으로',-3.5,2.6,1.8);sign('밖으로',[-3.5,2.46,3.17],.22,'#4d7ea8');setSpawn('office');renderHud();save()
}
async function buildHospital(source='walk'){endDog(false);state.location='hospital';state.phase='hospital';colliders=[];interactables=[];ui.labels.innerHTML='';labelViews=[];clearGroup(world);scene.background.set(0xdbe9e8);scene.fog.near=25;scene.fog.far=55;document.body.classList.remove('lifeTown');const floor=new THREE.Mesh(new THREE.PlaneGeometry(9,7),new THREE.MeshStandardMaterial({color:0xdde2dd,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;world.add(floor);windowWall(9,3.2,[0,0,-3.35],0,.88,3.8);windowWall(7,3.2,[-4.45,0,0],Math.PI/2,.86,2.2);windowWall(7,3.2,[4.45,0,0],Math.PI/2,.86,2.2);entryWall(9,3.2,3.35,-3.5,1.38,.86,0xb94f4b,true);addCeilingLights(9,7,3.25);wallSign('동네 병원',[0,2.5,-3.22],1.58,'#d65b52');box([2.8,.85,.8],[0,.43,-1.25],0xe6f1ed);box([2.7,.08,.72],[0,.88,-1.25],0x4d7ea8);interactable('treat','진료 접수',0,-.15,2.0);sign(state.treatmentNeeded?'진료가 필요해요':'진료 접수',[0,1.65,-1.25],.32,'#d65b52');interactable('hospitalExit','밖으로',-3.5,2.6,1.8);sign('밖으로',[-3.5,2.32,3.16],.27,'#2f7d60');setSpawn('hospital');if(source==='ambulance')toast('응급실에 도착했어요. 접수대에서 치료를 받아야 해요.',true);renderHud();save()}
function workOffice(){if(state.workedDay===state.day)return toast('오늘 근무는 이미 마쳤어요. 내일 다시 출근해요.');const healthFactor=.55+.45*(state.condition/100),injuryFactor=state.treatmentNeeded ? .72 : 1,pay=Math.max(9000,Math.round(BASE_WORK_PAY*healthFactor*injuryFactor/100)*100);state.money+=pay;state.dailyIncome+=pay;state.workedDay=state.day;state.hunger=clamp(state.hunger-16,0,100);state.condition=clamp(state.condition-7,5,100);state.dailyIncidents.push('💼 사무실에서 '+fmt(pay)+'을 벌었어요'+(state.treatmentNeeded?' (몸이 좋지 않아 급여가 줄었어요).':'.'));tone('cash');renderHud();save();toast('오늘 근무 완료! '+fmt(pay)+'이 들어왔어요.')}
function treatAtHospital(){if(!state.treatmentNeeded)return toast('지금은 꼭 치료가 필요한 상태가 아니에요.');const kind=state.injury||'sick',cost=HOSPITAL_COST[kind]||HOSPITAL_COST.sick;state.money-=cost;state.dailyExpense+=cost;state.condition=kind==='car'?clamp(state.condition+32,0,100):clamp(state.condition+24,0,100);state.dailyIncidents.push('🏥 '+(kind==='dog'?'강아지 물림':kind==='car'?'교통사고':'몸 상태')+' 치료비 '+fmt(cost)+'을 냈어요.');state.injury=null;state.treatmentNeeded=false;tone('good');renderHud();save();toast('치료를 받았어요. 진료비 '+fmt(cost)+'이 나갔어요.')}

function productPlacement(p){
 const zoneItems=PRODUCTS.filter(x=>x.zone===p.zone),i=zoneItems.indexOf(p);let key,index;
 if(p.zone==='produce'){key=i<4?'produceA':'produceB';index=i%4}else if(p.zone==='bakery'){key='bakery';index=i}else if(p.zone==='chilled'||p.zone==='protein'){key='chilled';index=p.zone==='protein'?i:i+2}else{key='island';index=p.zone==='pantry'?i:i+3}
 const b=marketDisplays[key],size=b.getSize(new THREE.Vector3()),surface=(marketDisplaySurfaces[key]??b.max.y)+.015;let x,z;
 if(key.startsWith('produce')){const slots=[[.2,.36],[.4,.64],[.6,.36],[.8,.64]],q=slots[index]||slots[0];x=b.min.x+.22+q[0]*(size.x-.44);z=b.min.z+.1+q[1]*(size.z-.2)}
 else if(key==='bakery'){const u=[.2,.5,.8][index]??.5;x=b.min.x+.22+u*(size.x-.44);z=(b.min.z+b.max.z)/2}
 else if(key==='chilled'){x=(b.min.x+b.max.x)/2;z=b.min.z+.26+index*(size.z-.52)/5}
 else{const slots=[[.18,.35],[.5,.35],[.82,.35],[.34,.7],[.66,.7]],q=slots[index]||slots[0];x=b.min.x+.2+q[0]*(size.x-.4);z=b.min.z+.12+q[1]*(size.z-.24)}
 return [x,surface,z];
}
function marketProductVisualSize(p){return p.zone==='produce'?.255:p.zone==='bakery'?.275:p.zone==='chilled'||p.zone==='protein'?.285:.29}
async function buildMarketProducts(){
 for(const p of PRODUCTS){const root=await fitted(productAssetUrl(p),marketProductVisualSize(p),p.zone==='drinks'?[0x4e8bb6,0xd95d55]:null),pos=productPlacement(p);root.position.set(...pos);p.pos=[pos[0],pos[2]];root.userData.productId=p.id;world.add(root);interactable('marketProduct',p.name,pos[0],pos[2],1.35,{productId:p.id});const label=document.createElement('button');label.className='productTag';label.innerHTML=p.name+'<small>'+fmt(discountedPrice(p))+(discountedPrice(p)<p.price?' · 할인':'')+'</small>';label.onclick=()=>tryTakeMarketProduct(p.id);ui.labels.appendChild(label);labelViews.push({kind:'market',id:p.id,root,label})}
}

async function syncHomeInventory(){
 const revision=++homeInventoryRevision;clearGroup(homeFoodGroup);for(const v of labelViews)if(v.label?.isConnected)v.label.remove();labelViews=[];const positions={fridge:[],freezer:[],pantry:[]};const fill=(root,bucket,rows,low,high)=>{if(!root)return;const b=root.userData.localBounds;root.updateMatrixWorld(true);for(let row=0;row<rows;row++)for(let col=0;col<4;col++){const v=new THREE.Vector3(b.min.x+.14+col*(b.max.x-b.min.x-.28)/3,low+(high-low)*row/Math.max(1,rows-1),b.max.z-.12);root.localToWorld(v);positions[bucket].push(v.toArray())}};fill(kitchenStorage.fridge[0],'fridge',4,.2,1.3);fill(kitchenStorage.fridge[0],'freezer',2,1.65,1.92);for(const r of kitchenStorage.pantry)fill(r,'pantry',2,.14,.64);const used={fridge:0,freezer:0,pantry:0};
 const shown=new Set();for(const item of state.inventory){const p=productById(item.id);if(!p)continue;const bucket=p.storage==='freezer'?'freezer':p.storage==='pantry'?'pantry':'fridge';if(!storageOpen[bucket==='pantry'?'pantry':'fridge']||shown.has(item.id))continue;shown.add(item.id);const pos=positions[bucket][used[bucket]++];if(!pos)continue;let root;try{root=await fitted(productAssetUrl(p),.35)}catch(_){root=box([.22,.22,.22],[0,0,0],0xd0aa6c,.8,homeFoodGroup)}if(revision!==homeInventoryRevision||state.location!=='home')return;if(root.parent!==homeFoodGroup)homeFoodGroup.add(root);root.position.set(...pos);root.userData.invUid=item.uid;const label=document.createElement('button');label.className='productTag storage';label.innerHTML=p.name+'<small>'+storageName(p.storage)+' · '+state.inventory.filter(x=>x.id===item.id).length+'개</small>';label.onclick=()=>takeHomeItem(item.uid);ui.labels.appendChild(label);labelViews.push({kind:'home',id:item.uid,root,label})}
 if(state.prep.length){const board=await fitted(FOOD+'cutting-board-japanese.glb',.85);if(revision!==homeInventoryRevision)return;board.position.set(.5,counterTop+.01,-2.35);homeFoodGroup.add(board);const surface=new THREE.Box3().setFromObject(board).max.y;for(const [i,item]of state.prep.slice(0,6).entries()){const model=await fitted(FOOD+productById(item.id).model,.24);if(revision!==homeInventoryRevision)return;model.position.set(.25+(i%3)*.23,surface+.01,-2.45+Math.floor(i/3)*.23);homeFoodGroup.add(model)}}
 if(state.dish){const d=await dishModel(state.dish,1.0);if(revision!==homeInventoryRevision)return;d.position.set(0,tableTop+.02,2.1);homeFoodGroup.add(d)}
}
function storageName(s){return s==='freezer'?'냉동실':s==='pantry'?'찬장':'냉장고'}
async function spawnCart(){if(cart)cart.removeFromParent();try{cart=await fitted(MARKET+'shopping-cart.glb',1.3,[0x477b9a,0xc8d5d3,0x444e52]);cartCargo=new THREE.Group();cart.add(cartCargo);dynamic.add(cart);await syncCartCargo()}catch(e){console.warn('cart failed',e)}}
async function syncCartCargo(){if(!cartCargo)return;clearGroup(cartCargo);const show=state.basket.slice(0,7);for(let i=0;i<show.length;i++){const p=productById(show[i]);if(!p)continue;try{const r=await fitted(productAssetUrl(p),.26);r.position.set((i%3-.9)*.25,.45+Math.floor(i/3)*.16,-.05+((i%2)*.18));r.rotation.y=i*.8;cartCargo.add(r)}catch(_){}}
}
function setSpawn(where){let x=0,z=.9;if(where==='market'){x=1.6;z=3.6}else if(where==='convenience'||where==='fastfood'){x=0;z=2.15}else if(where==='gym'){x=-2.85;z=2.58}else if(where==='office'||where==='hospital'){x=0;z=2.2}playerPos.set(x,1.62,z);yaw=0;pitch=-.12;camera.position.copy(playerPos);camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch}


function nutritionText(){const n=state.dailyNutrition||freshDailyNutrition();if(!(state.dailyKcal||0))return'아직 식사 전';if(n.veg>=7&&n.protein>=25&&n.sugar<=50&&n.sodium<=22)return'균형 좋음';if(n.veg<4)return'채소·과일 부족';if(n.protein<16)return'단백질 부족';if(n.sugar>65)return'당류 많음';if(n.sodium>28)return'나트륨 많음';return'무난함'}
function conditionText(){if(state.treatmentNeeded)return state.injury==='car'?'사고 · 치료 필요':state.injury==='dog'?'물림 · 치료 필요':'치료 필요';return state.condition>=80?'아주 좋음':state.condition>=60?'좋음':state.condition>=42?'보통':'조금 지침'}
function locationText(){return({market:'🛒 우리 동네 마트',convenience:'🏪 24시 편의점',fastfood:'🍔 버거하우스',gym:'🏋️ 파워짐',home:'🏠 집 · 부엌',town:'🏘️ 우리 동네',office:'💼 사무실',hospital:'🏥 동네 병원'})[state.location]||'우리 동네'}
function renderHud(){ui.day.textContent=state.day+'일차 · '+SLOTS[state.slot];ui.money.textContent=fmt(state.money);ui.cartBtn.classList.toggle('hidden',state.location!=='market'||!state.hasCart);ui.cartCount.textContent=state.basket.length;ui.kcal.textContent=Math.round(state.dailyKcal||0).toLocaleString()+' kcal';ui.nutrition.textContent=nutritionText();ui.weight.textContent=(state.weightKg||35).toFixed(1)+' kg';ui.condition.textContent=conditionText();ui.location.textContent=locationText();ui.heldCard.classList.toggle('hidden',!state.held);if(state.held){ui.heldName.textContent=heldName();ui.heldHint.textContent=state.location==='market'?'카트에 넣거나 진열대에 돌려놓을 수 있어요.':'조리대에 올리거나 식탁에서 먹을 수 있어요.'}ui.prepCard.classList.toggle('hidden',state.location!=='home'||!state.prep.length);if(state.prep.length){ui.prepTitle.textContent=state.prep.map(x=>productById(x.id)?.name||'재료').join(' + ');ui.prepText.textContent='인덕션에서 요리하거나 다시 냉장고로 돌려놓을 수 있어요.'}renderEvent();renderCartPanel();renderTapControls()}
function hungerText(){return state.hunger>=75?'든든함':state.hunger>=50?'보통':state.hunger>=28?'배고픔':'많이 배고픔'}

function heldName(){if(!state.held)return '-';if(state.held.kind==='dish')return state.held.name;return productById(state.held.id)?.name||'음식'}
function renderEvent(){if(dog||!state.event){ui.eventCard.classList.add('hidden');return}ui.eventCard.classList.remove('hidden');ui.eventTitle.textContent=state.event.title;ui.eventText.textContent=state.event.text}
function renderCartPanel(){const groups=new Map();state.basket.forEach((id,i)=>{if(!groups.has(id))groups.set(id,{i,count:0});groups.get(id).count++});ui.cartList.innerHTML=groups.size?[...groups].map(([id,g])=>{const p=productById(id);return '<div class="cartItem"><div><b>'+p.name+' × '+g.count+'</b><small>'+fmt(discountedPrice(p))+' × '+g.count+'</small></div><button data-remove="'+g.i+'">1개 빼기</button></div>'}).join(''):'<div class="cartItem"><small>아직 담은 물건이 없어요.</small></div>';const remaining=state.money-cartTotal();ui.cartTotal.textContent=state.basket.length+'개 · 예상 '+fmt(cartTotal())+' · '+(remaining<0?'식비 초과 '+fmt(-remaining):'구입 후 '+fmt(remaining))}

async function returnPrep(){if(state.location!=='home'||!state.prep.length)return;state.inventory.push(...state.prep);state.prep=[];await syncHomeInventory();renderHud();save();toast('조리대 재료를 모두 보관했어요.')}


const FOOD_ICONS={egg:'🥚',bread:'🍞',apple:'🍎',banana:'🍌',tomato:'🍅',carrot:'🥕',broccoli:'🥦',fish:'🐟',pizza:'🍕',corn:'🌽',donut:'🍩',sandwich:'🥪'};
function foodIcon(id){return FOOD_ICONS[id]||'🍽️'}
function jumpToStation(kind){const spots={fridge:[-1.25,-.9,-2.65,-.9],pantry:[-1.25,.65,-2.65,.65],counter:[.5,-1.1,.5,-2.35],table:[0,.9,0,2.1],checkout:[-3.3,3.7,-3.3,2.7],produce:[-1.7,-1.8,-1.7,-3.4],protein:[2.2,-.7,3.85,-.7],bakery:[2.6,-1.8,2.6,-3.4],pantryZone:[0,1.5,0,0],chilled:[2.2,.4,3.85,.4],drinks:[0,1.5,.8,0]};const q=spots[kind];if(!q)return;playerPos.set(q[0],1.62,q[1]);yaw=Math.atan2(-(q[2]-q[0]),-(q[3]-q[1]));pitch=-.18;camera.position.copy(playerPos);camera.rotation.y=yaw;camera.rotation.x=pitch;nearest=kind==='table'?{type:'table'}:null}
function renderTapControls(){const active=state.running&&state.phase!=='checkout'&&!freeWalk&&['home','market'].includes(state.location);$('#tapControls').classList.toggle('hidden',!active);document.body.classList.toggle('simpleControls',!freeWalk&&['home','market'].includes(state.location));if(!active)return;$('#walkToggle').textContent='직접 걷기';const market=state.location==='market';if(market&&!['produce','protein','bakery','pantryZone','chilled','drinks','checkout'].includes(tapStation))tapStation='produce';if(!market&&!['fridge','pantry','counter','table'].includes(tapStation))tapStation='fridge';const primary=market?[['home','🚪 밖으로'],['produce','🛒 마트'],['checkout','🧾 계산']]:[['fridge','🏠 집'],['market','🚪 밖으로'],['counter','🍳 요리']];const local=market?[['produce','🥬 채소'],['protein','🥚 단백질'],['bakery','🍞 빵'],['pantryZone','🥫 식품'],['chilled','🧊 냉장'],['drinks','🥤 음료']]:[['fridge','🧊 냉장고'],['pantry','🥫 찬장'],['table','🍽️ 식탁']];const buttons=list=>list.map(([id,label])=>'<button data-place="'+id+'" class="'+(tapStation===id?'selected':'')+'" '+(tapBusy?'disabled':'')+'>'+label+'</button>').join('');$('#placeButtons').innerHTML=buttons(primary);$('#localPlaces').innerHTML=buttons(local);let html='',title='';if(market){title='상품을 누르면 카트에 담겨요';const zone=tapStation==='pantryZone'?'pantry':tapStation;html=PRODUCTS.filter(p=>p.zone===zone).map(p=>'<button data-buy="'+p.id+'"><span>'+foodIcon(p.id)+'</span><b>'+p.name+'</b><small>'+fmt(discountedPrice(p))+'</small></button>').join('');if(tapStation==='checkout'){title='계산대';html='<button data-action="checkout">🧾 직접 계산하기</button>'}}else if(tapStation==='fridge'||tapStation==='pantry'){title='식품을 누르면 조리대 쟁반에 담겨요';const counts=new Map();for(const item of state.inventory){const p=productById(item.id);if((p.storage==='pantry')!==(tapStation==='pantry'))continue;if(!counts.has(item.id))counts.set(item.id,{uid:item.uid,n:0});counts.get(item.id).n++}html=[...counts].map(([id,g])=>'<button data-food="'+g.uid+'"><span>'+foodIcon(id)+'</span><b>'+productById(id).name+'</b><small>'+g.n+'개 · 담기</small></button>').join('')||'<p>보관한 식품이 없어요. 마트에서 골라 보세요.</p>'}else if(tapStation==='counter'){title=state.prep.length?state.prep.map(x=>productById(x.id).name).join(' + '):'재료를 골라 와 보세요';if(state.prep.length){const quick=state.prep.some(x=>productById(x.id).quick);html='<button data-action="cook">'+(quick?'♨️ 간편식 데우기':'🍳 '+recipeFromPrep().name+' 만들기')+'</button>';if(state.prep.every(x=>productById(x.id).ready))html+='<button data-action="eatPrep">🍽️ 그대로 먹기</button>';html+='<button data-action="return">↩️ 재료 다시 보관</button>'}}else{title=state.dish?state.dish.name:'식탁에서 한 끼를 차려요';if(state.dish||state.held)html+='<button data-action="eat">😋 먹기</button>';if(state.mealFoods.length)html+='<button data-action="finish">☀️ 식사 마치기</button>';if(!html)html='<button data-action="skip">⏭️ 이번 끼니 건너뛰기</button>'}$('#tapTitle').textContent=title;$('#tapItems').innerHTML=html;$('#tapItems').querySelectorAll('button').forEach(b=>b.disabled=tapBusy);$('#trayNote').textContent=state.location==='home'&&state.prep.length?'쟁반: '+state.prep.map(x=>productById(x.id).name).join(' + '):state.location==='market'?'카트 '+state.basket.length+'개 · 예상 '+fmt(cartTotal()):state.mealFoods.length?'먹은 음식: '+state.mealFoods.join(' + '):'한 번 누르면 바로 시작해요'}

async function choosePlace(kind){if(tapBusy||!state.running||state.phase==='checkout')return;tapBusy=true;renderTapControls();try{if(kind==='market'){await goMarket();if(state.location==='market'){state.hasCart=true;await spawnCart();tapStation='produce';jumpToStation(tapStation);save()}}else if(kind==='home'){await goHomeWithoutCheckout();if(state.location==='home')tapStation='fridge'}else{tapStation=kind;jumpToStation(kind);if(kind==='fridge'||kind==='pantry'){storageOpen[kind]=true;for(const r of kitchenStorage[kind])setStorageDoors(r,true);await syncHomeInventory()}tone('pick')}}finally{tapBusy=false;renderHud()}}
async function selectTapFood(uid){if(tapBusy||state.location!=='home'||!state.running||state.held)return;const item=state.inventory.find(x=>x.uid===uid);if(!item)return;state.inventory=state.inventory.filter(x=>x.uid!==uid);state.prep.push(item);tone('pick');renderHud();save();toast(productById(item.id).name+' → 쟁반에 담겼어요!');await syncHomeInventory()}
async function tapAction(action){if(tapBusy||!state.running)return;tapBusy=true;renderTapControls();try{if(action==='checkout'){openCheckout();return}if(action==='return'){await returnPrep();return}jumpToStation('table');if(action==='finish'){finishMeal();return}if(action==='skip'){skipMeal();return}if(action==='eat'){await eatAtTable();return}if(action==='eatPrep'){if(state.prep.some(x=>!productById(x.id).ready))return;while(state.prep.length){const item=state.prep.shift();state.held={kind:'home',...item};await eatAtTable()}tapStation='table';return}if(action==='cook'){if(state.held||state.dish){tapStation='table';return toast('완성한 음식을 먼저 식탁에서 먹어 보세요.',true)}const quick=state.prep.filter(x=>productById(x.id).quick);if(quick.length){if(state.prep.length!==1)return toast('간편식은 하나만 골라 데워 주세요. 재료를 다시 보관할 수 있어요.',true);const item=state.prep.shift();state.held={kind:'home',...item};await microwaveHeld()}else await cookPrep();if(state.held?.kind==='dish'){state.dish=state.held;state.held=null;clearHeldModel();tapStation='table';await syncHomeInventory();save();tone('good');toast(state.dish.name+' 완성! 😋 먹어 볼까요?')}}}finally{tapBusy=false;renderHud()}}
const onPlaceClick=e=>{const b=e.target.closest('[data-place]');if(b)choosePlace(b.dataset.place)};$('#placeButtons').onclick=onPlaceClick;$('#localPlaces').onclick=onPlaceClick;
$('#tapItems').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.buy)tryTakeMarketProduct(b.dataset.buy);else if(b.dataset.food)selectTapFood(b.dataset.food);else if(b.dataset.action)tapAction(b.dataset.action)};
$('#walkToggle').onclick=()=>{freeWalk=!freeWalk;for(const k in keys)keys[k]=false;touch.active=false;touch.x=touch.y=0;renderHud()};

function cartTotal(){return sum(state.basket.map(id=>discountedPrice(productById(id))))}

function nearestInteractable(){let best=null,d=999;for(const it of interactables){const x=playerPos.x-it.x,z=playerPos.z-it.z,dist=Math.hypot(x,z);if(dist<it.range&&dist<d){best=it;d=dist}}return best}
function nearestHomeFood(){if(state.location!=='home'||state.held)return null;let best=null,d=999;for(const v of labelViews.filter(x=>x.kind==='home')){const p=new THREE.Vector3();v.root.getWorldPosition(p);const dist=Math.hypot(playerPos.x-p.x,playerPos.z-p.z);if(dist<1.75&&dist<d){best=v;d=dist}}return best}
function nearestMarketProduct(){if(state.location!=='market'||state.held)return null;let best=null,d=999;for(const p of PRODUCTS){const dist=Math.hypot(playerPos.x-p.pos[0],playerPos.z-p.pos[1]);if(dist<1.55&&dist<d){best=p;d=dist}}return best}
function updateInteraction(){
 if(!state.running||state.phase==='checkout'||state.phase==='day'){nearest=null;return}const food=nearestHomeFood(),mp=nearestMarketProduct(),it=nearestInteractable();
 if(state.held){
  if(state.location==='market'){nearest={type:'heldAction'};ui.interactIcon.textContent='🛒';ui.interactTitle.textContent=state.hasCart?'카트에 '+heldName()+' 담기':'먼저 카트를 잡아 주세요';ui.interactSub.textContent=state.hasCart?'버튼을 누르면 카트에 넣어요.':'입구 오른쪽 카트 보관소로 가세요.';ui.interactBtn.textContent=state.hasCart?'카트에 담기':'카트 필요';ui.interactBtn.disabled=!state.hasCart;syncTouchInteract();return}
  if(state.location==='home'&&it&&['counter','sink','microwave','table'].includes(it.type)){nearest=it;const p=state.held.kind==='dish'?null:productById(state.held.id);const map={counter:['🔪','조리대에 올리기','재료를 여기 모아서 요리할 수 있어요.','올리기'],sink:['🚰','식품 씻기',p?.zone==='produce'?'물을 틀어 깨끗이 씻어요.':'필요한 식품만 씻으면 돼요.','씻기'],microwave:['♨️','전자레인지',p?.quick?'간편식을 빠르게 데울 수 있어요.':'이 음식은 전자레인지용이 아니에요.','데우기'],table:['🍽️','식탁에서 먹기',state.held.kind==='dish'||p?.ready?'지금 먹을 수 있어요.':'먼저 조리하거나 데워 주세요.','먹기']};const m=map[it.type];ui.interactIcon.textContent=m[0];ui.interactTitle.textContent=m[1];ui.interactSub.textContent=m[2];ui.interactBtn.textContent=m[3];ui.interactBtn.disabled=(it.type==='microwave'&&!p?.quick)||(it.type==='table'&&state.held.kind!=='dish'&&!p?.ready);syncTouchInteract();return}
  nearest={type:'heldAction'};ui.interactIcon.textContent=state.held.kind==='dish'?'🍳':'🥣';ui.interactTitle.textContent=heldName()+'을(를) 들고 있어요';ui.interactSub.textContent=state.held.kind==='dish'?'완성한 음식을 식탁으로 가져가 보세요.':'필요한 장소 가까이 가 보세요.';ui.interactBtn.textContent=state.held.kind==='dish'?'식탁으로 가져가기':'제자리 두기';ui.interactBtn.disabled=state.held.kind==='dish';syncTouchInteract();return
 }
 if(food){nearest={type:'homeFood',uid:food.id};const item=state.inventory.find(x=>x.uid===food.id),p=productById(item?.id);ui.interactIcon.textContent='🥕';ui.interactTitle.textContent=(p?.name||'식품')+' 꺼내기';ui.interactSub.textContent=storageName(p?.storage);ui.interactBtn.textContent='집기';ui.interactBtn.disabled=false;syncTouchInteract();return}
 if(mp){nearest={type:'marketProduct',productId:mp.id};ui.interactIcon.textContent='🏷️';ui.interactTitle.textContent=mp.name+' · '+fmt(discountedPrice(mp));ui.interactSub.textContent=state.hasCart?'누르면 바로 카트에 담겨요.':'먼저 카트를 잡아 주세요.';ui.interactBtn.textContent=state.hasCart?'카트에 담기':'카트 필요';ui.interactBtn.disabled=!state.hasCart;syncTouchInteract();return}
 if(it){nearest=it;const map={
  fridge:['🧊','냉장고','문을 열면 보관한 식품을 꺼낼 수 있어요.',storageOpen.fridge?'문 닫기':'문 열기'],pantry:['🥫','찬장','문을 열면 상온 식품을 꺼낼 수 있어요.',storageOpen.pantry?'문 닫기':'문 열기'],counter:['🔪','조리대',state.prep.length?'재료가 올려져 있어요.':'들고 온 재료를 올려 요리 준비를 해요.','사용'],sink:['🚰','싱크대','채소와 과일을 씻을 수 있어요.','씻기'],stove:['🍳','인덕션',state.prep.length?'조리대 재료로 한 접시를 만들어요.':'먼저 조리대에 재료를 올려 주세요.','요리'],microwave:['♨️','전자레인지','냉동 피자 같은 간편식을 빠르게 데워요.','데우기'],table:['🍽️','식탁',state.dish?'완성된 음식이 놓여 있어요.':state.mealFoods.length?'먹은 음식으로 식사를 마칠 수 있어요.':'먹지 않고 다음 끼니로 넘어갈 수도 있어요.',state.dish?'먹기':state.mealFoods.length?'식사 마치기':'끼니 건너뛰기'],
  marketDoor:['🚪','동네로 나가기','밖으로 나가 직접 마트·사무실·병원까지 걸어가요.','밖으로'],cartBay:['🛒','카트 보관소',state.hasCart?'이미 카트를 끌고 있어요.':'카트를 하나 빼서 직접 끌고 다녀요.','카트 잡기'],homeDoor:['🚪','동네로 나가기',state.basket.length?'카트의 물건을 먼저 계산하거나 빼 주세요.':'밖으로 나가요.','밖으로'],checkout:['🧾','셀프 계산대',state.basket.length?'바코드를 찍고 총액을 직접 계산해요.':'카트가 비어 있어요.','계산'],
  homeEntry:['🏠','우리 집','집에 들어가 요리하고 식사할 수 있어요.','들어가기'],marketEntry:['🛒','우리 동네 마트','직접 카트를 끌며 장을 봐요.','들어가기'],officeEntry:['💼','사무실',state.workedDay===state.day?'오늘은 이미 근무했어요.':'컨디션이 좋을수록 급여를 온전히 받아요.','출근하기'],hospitalEntry:['🏥','동네 병원',state.treatmentNeeded?'치료가 필요한 상태예요.':'필요할 때 진료를 받을 수 있어요.','들어가기'],workDesk:['💼','내 자리',state.workedDay===state.day?'오늘 근무 완료':'몸 상태에 따라 오늘 급여가 달라져요.','일하기'],officeExit:['🚪','퇴근하기','동네로 나가요.','밖으로'],treat:['🏥','진료 접수',state.treatmentNeeded?'치료비가 들지만 몸 상태를 회복해요.':'현재 꼭 필요한 치료는 없어요.','진료받기'],hospitalExit:['🚪','병원 나가기','동네로 돌아가요.','밖으로']
 };const m=map[it.type]||['•',it.name,'','사용'];ui.interactIcon.textContent=m[0];ui.interactTitle.textContent=m[1];ui.interactSub.textContent=m[2];ui.interactBtn.textContent=m[3];ui.interactBtn.disabled=(it.type==='stove'&&!state.prep.length)||(it.type==='checkout'&&!state.basket.length)||(it.type==='cartBay'&&state.hasCart)||(it.type==='homeDoor'&&(state.basket.length>0||!!state.held))||(it.type==='workDesk'&&state.workedDay===state.day);syncTouchInteract();return}
 const idle={town:['🏘️','동네를 돌아다녀 보세요','집 · 마트 · 사무실 · 병원을 직접 찾아가요.'],office:['💼','사무실','내 자리로 가서 오늘 일을 해요.'],hospital:['🏥','병원','접수대에서 필요한 치료를 받아요.'],market:['🛒','마트를 둘러보세요',state.hasCart?'상품을 눌러 카트에 담고 계산대로 끌고 가요.':'입구 오른쪽에서 카트를 잡아 보세요.'],home:['🏠','부엌을 둘러보세요','냉장고·찬장·조리대·식탁을 직접 사용해 보세요.']}[state.location]||['•','둘러보세요',''];ui.interactIcon.textContent=idle[0];ui.interactTitle.textContent=idle[1];ui.interactSub.textContent=idle[2];ui.interactBtn.textContent='사용';ui.interactBtn.disabled=true;syncTouchInteract()
}

function syncTouchInteract(){ui.touchInteract.textContent=ui.interactBtn.textContent;ui.touchInteract.disabled=ui.interactBtn.disabled}

async function tryTakeMarketProduct(id){if(!state.running||state.phase==='checkout'||state.location!=='market'||tapBusy)return;const p=productById(id);if(!p)return;if(!state.hasCart)return toast('먼저 입구에서 카트를 잡아 주세요.',true);if(state.held)return toast('손에 든 상품을 먼저 카트에 넣어 주세요.',true);state.basket.push(id);tone('pick');await syncCartCargo();renderHud();save();toast(p.name+' → 카트에 담겼어요!')}

async function takeHomeItem(uid){if(state.location!=='home'||state.held)return;const item=state.inventory.find(x=>x.uid===uid);if(!item)return;const v=labelViews.find(x=>x.kind==='home'&&x.id===uid);if(v){const p=new THREE.Vector3();v.root.getWorldPosition(p);if(Math.hypot(playerPos.x-p.x,playerPos.z-p.z)>1.9)return toast('조금 더 가까이 가서 꺼내 주세요.',true)}state.inventory=state.inventory.filter(x=>x.uid!==uid);state.held={kind:'home',id:item.id,uid:item.uid,age:item.age||0};await showHeldModel(item.id);await syncHomeInventory();tone('pick');renderHud();save()}
async function showHeldModel(id){dishVisualRevision++;clearGroup(heldRoot);try{const p=productById(id),r=await fitted(productAssetUrl(p),.32);r.rotation.y=.5;heldRoot.add(r)}catch(_){}}
function dishIngredients(d){if(d.ingredients?.length)return d.ingredients;const n=d.name||'';return n.includes('피자')?['pizza']:n.includes('생선')?['fish']:n.includes('달걀')?(n.includes('토스트')?['bread','egg']:['egg']):['broccoli','carrot']}
async function dishModel(d,size){const group=new THREE.Group(),plate=await fitted(FOOD+'plate.glb',size);group.add(plate);const surface=new THREE.Box3().setFromObject(plate).max.y;const ids=[...new Set(dishIngredients(d))].slice(0,5);for(let i=0;i<ids.length;i++){const p=productById(ids[i]);if(!p)continue;const model=ids[i]==='egg'?'egg-cooked.glb':ids[i]==='tomato'?'tomato-slice.glb':p.model;const r=await fitted(FOOD+model,size*(ids.length===1?.58:.34));const angle=i*Math.PI*2/ids.length,spread=ids.length===1?0:size*.19;r.position.set(Math.cos(angle)*spread,surface+.006,Math.sin(angle)*spread);group.add(r)}return group}
async function showDishHeld(d){const revision=++dishVisualRevision;clearGroup(heldRoot);try{const model=await dishModel(d,.48);if(revision!==dishVisualRevision||state.held!==d)return;model.rotation.x=.35;heldRoot.add(model)}catch(err){console.warn('dish asset failed',err);toast('음식 모습은 불러오지 못했지만 식탁에서 먹을 수 있어요.',true)}}

function clearHeldModel(){dishVisualRevision++;clearGroup(heldRoot)}
async function putHeldInCart(){if(!state.held||state.held.kind!=='market'||!state.hasCart)return;state.basket.push(state.held.id);state.held=null;clearHeldModel();await syncCartCargo();tone('pick');renderHud();save();toast('카트에 담았어요. 계산대에 가기 전까지 뺄 수도 있어요.')}
async function dropHeldHome(){if(!state.held||state.location!=='home')return;const h=state.held;if(h.kind==='dish')return toast('완성한 음식은 식탁으로 가져가 보세요.');state.inventory.push({uid:h.uid||makeUid(h.id),id:h.id,age:h.age||0});state.held=null;clearHeldModel();await syncHomeInventory();renderHud();save()}
async function putOnCounter(){if(!state.held||state.location!=='home'||state.held.kind==='dish')return;const h=state.held;state.prep.push({id:h.id,uid:h.uid||makeUid(h.id),age:h.age||0});state.held=null;clearHeldModel();await syncHomeInventory();tone('pick');renderHud();save();toast('조리대에 '+productById(h.id).name+'을(를) 올렸어요.')}
function washHeld(){if(!state.held||state.held.kind==='dish')return toast('씻을 식품을 들고 와 보세요.',true);const p=productById(state.held.id);if(!p||p.zone!=='produce')return toast('이 식품은 따로 씻지 않아도 돼요.');state.held.washed=true;tone('good');toast(p.name+'을(를) 깨끗이 씻었어요.');renderHud()}
function recipeFromPrep(){const ids=state.prep.map(x=>x.id),ps=ids.map(productById).filter(Boolean),veg=ps.filter(p=>p.veg>=2).length;let name='따뜻한 한 접시',color=0xd7a45f;if(ids.includes('fish')&&veg)name='생선 채소구이';else if(ids.includes('fish'))name='생선구이';else if(ids.includes('egg')&&ids.includes('tomato'))name='토마토 달걀볶음';else if(ids.includes('egg')&&ids.includes('bread'))name='달걀 토스트';else if(ids.includes('egg')&&veg)name='채소 달걀볶음';else if(veg>=2)name='알록달록 채소볶음';else if(ids.includes('egg'))name='달걀구이';else if(ids.includes('corn'))name='구운 옥수수';const nutrition=combineNutrition(ps);nutrition.satiety+=ps.length*2;return{name,nutrition,color,ingredients:ids}}
function combineNutrition(ps){return ps.reduce((a,p)=>({kcal:a.kcal+p.kcal,protein:a.protein+p.protein,veg:a.veg+p.veg,sugar:a.sugar+p.sugar,sodium:a.sodium+p.sodium,satiety:a.satiety+p.satiety,mood:a.mood+p.mood}),{kcal:0,protein:0,veg:0,sugar:0,sodium:0,satiety:0,mood:0})}
async function cookPrep(){if(state.held)return toast('손에 든 음식을 먼저 정리해 주세요.',true);if(!state.prep.length)return toast('조리대에 재료를 먼저 올려 주세요.',true);if(state.prep.some(x=>productById(x.id)?.quick)){return toast('냉동 간편식은 전자레인지에 하나씩 데워 보세요.',true)}const d=recipeFromPrep();state.prep=[];state.dish=null;state.held={kind:'dish',name:d.name,nutrition:d.nutrition,cooked:true,color:d.color,ingredients:d.ingredients};showDishHeld(state.held);tone('cook');await syncHomeInventory();renderHud();save();toast(d.name+' 완성! 직접 식탁으로 가져가 보세요.')}
async function microwaveHeld(){if(!state.held||state.held.kind==='dish')return toast('데울 간편식을 들고 와 보세요.',true);const p=productById(state.held.id);if(!p?.quick)return toast('이건 그냥 먹거나 다른 방식으로 조리해도 돼요.');const d={kind:'dish',name:'따뜻한 '+p.name,nutrition:{kcal:p.kcal,protein:p.protein,veg:p.veg,sugar:p.sugar,sodium:p.sodium,satiety:p.satiety,mood:p.mood+2},cooked:false,color:0xd9a85e,ingredients:[p.id]};state.held=d;state.dish=null;showDishHeld(d);tone('cook');await syncHomeInventory();renderHud();save();toast(d.name+' 준비 완료! 식탁으로 가져가 보세요.')}
async function eatAtTable(){
 let food=null,cooked=false,quick=false;if(state.held){if(state.held.kind==='dish'){food={name:state.held.name,nutrition:state.held.nutrition};cooked=!!state.held.cooked;quick=!cooked;state.held=null;clearHeldModel()}else{const p=productById(state.held.id);if(!p.ready)return toast(p.name+'은(는) 조리하거나 데워서 먹는 게 좋아요.',true);food={name:p.name,nutrition:{kcal:p.kcal,protein:p.protein,veg:p.veg,sugar:p.sugar,sodium:p.sodium,satiety:p.satiety,mood:p.mood}};quick=!!p.quick;state.held=null;clearHeldModel()}}else if(state.dish){food={name:state.dish.name,nutrition:state.dish.nutrition};cooked=!!state.dish.cooked;quick=!cooked;state.dish=null}else return toast('먹을 음식을 들고 오거나 식탁에 차려 보세요.',true);
 applyMeal(food,cooked,quick);tone('eat');await syncHomeInventory();renderHud();save();toast(food.name+' 잘 먹었어요! 다른 음식도 먹거나 식사를 마칠 수 있어요.');
}
function applyMeal(food,cooked,quick){const n=food.nutrition;state.dailyKcal=(state.dailyKcal||0)+n.kcal;state.dailyNutrition=state.dailyNutrition||{protein:0,veg:0,sugar:0,sodium:0};state.dailyNutrition.protein+=n.protein;state.dailyNutrition.veg+=n.veg;state.dailyNutrition.sugar+=n.sugar;state.dailyNutrition.sodium+=n.sodium;state.hunger=clamp(state.hunger+Math.min(72,n.satiety),0,100);const balance=n.veg*2+n.protein*.25-n.sugar*.12-n.sodium*.8;state.condition=clamp(state.condition+clamp(balance*.08,-2,2),5,100);const mood=n.mood+(state.event?.warmBonus&&cooked?state.event.warmBonus:0);state.satisfaction=clamp(state.satisfaction+mood*.22-1,20,100);state.weekStats.sugar+=n.sugar;state.weekStats.sodium+=n.sodium;state.weekStats.veg+=n.veg;state.weekStats.protein+=n.protein;state.mealFoods.push(food.name);state.mealCooked ||= cooked;state.mealQuick ||= quick}
function finishMeal(){if(!state.running||state.location!=='home'||!nearest||nearest.type!=='table')return toast('식탁 가까이에서 식사를 마쳐 주세요.',true);if(!state.mealFoods.length)return toast('먼저 음식을 먹어 보세요.',true);state.weekStats.meals++;if(state.mealCooked)state.weekStats.cooked++;if(state.mealQuick)state.weekStats.quick++;state.mealFoods=[];state.mealCooked=false;state.mealQuick=false;advanceMeal();toast('식사를 마쳤어요. 다음 끼니까지 자유롭게 생활해 보세요.')}
function skipMeal(){if(!state.running||state.location!=='home')return;const meal=SLOTS[state.slot];state.hunger=clamp(state.hunger-8,0,100);state.condition=clamp(state.condition-2,5,100);state.satisfaction=clamp(state.satisfaction-2,20,100);state.dailyIncidents.push('⏭️ '+meal+' 끼니를 건너뛰었어요.');tone('bad');advanceMeal();toast(meal+'을(를) 건너뛰었어요. 다음 끼니까지 배고픔과 컨디션이 더 떨어질 수 있어요.',true)}
function projectedWeight(){const net=(state.dailyKcal||0)-(state.dailyActivityKcal||0),delta=clamp((net-DAILY_CAL_TARGET)/7700,-.15,.15);return clamp((state.weightKg||35)+delta,25,120)}
function showDayReport(){state.running=false;state.phase='day';const events=state.dailyIncidents||[],nutrition=nutritionText(),nextW=projectedWeight();ui.dayReportTitle.textContent=state.day+'일차 생활 기록';ui.dayReportSummary.textContent=events.length?events.join(' '):'큰 사건 없이 하루를 보냈어요. 오늘의 선택이 내일의 돈과 컨디션으로 이어집니다.';ui.dayIncome.textContent='+'+fmt(state.dailyIncome||0);ui.dayExpense.textContent='-'+fmt(state.dailyExpense||0);ui.dayKcal.textContent=Math.round(state.dailyKcal||0).toLocaleString()+' kcal';ui.dayNutrition.textContent=nutrition;ui.dayWeight.textContent=(state.weightKg||35).toFixed(1)+' → '+nextW.toFixed(1)+' kg';ui.dayHealth.textContent=conditionText();ui.dayModal.classList.remove('hidden');save()}
function completeDay(){
 state.weightKg=projectedWeight();const nutrition=nutritionText();let sleepRecovery=(state.dailyKcal||0)<700?2:6;if(nutrition==='균형 좋음')sleepRecovery+=3;else if(nutrition==='무난함')sleepRecovery+=1;sleepRecovery+=Math.min(4,(state.gymWorkoutCount||0)*2);if(state.treatmentNeeded)sleepRecovery=Math.max(0,sleepRecovery-2);state.condition=clamp(state.condition+sleepRecovery,5,100);
 state.slot=0;state.day++;state.dailyKcal=0;state.dailyActivityKcal=0;state.gymWorkoutCount=0;state.dailyNutrition=freshDailyNutrition();state.dailyIncome=0;state.dailyExpense=0;state.dailyIncidents=[];for(const item of state.inventory)item.age=(item.age||0)+1;ui.dayModal.classList.add('hidden');if(state.day>7){showWeekReport();return}
 if(!state.treatmentNeeded&&state.condition<45&&Math.random()<.35){state.injury='sick';state.treatmentNeeded=true;state.dailyIncidents.push('🤒 몸 상태가 나빠져 아침부터 아파요. 병원에 가면 회복할 수 있어요.')}
 state.phase=state.location==='market'?'shopping':state.location;state.running=true;rollEvent();dogSpawnClock=12+Math.random()*12;save();renderHud();toast(state.injury==='sick'?'몸이 좋지 않아요. 병원에 갈지 결정해 보세요.':'잠을 자고 컨디션이 '+sleepRecovery+' 회복됐어요.',state.injury==='sick')
}

function advanceMeal(){state.hunger=clamp(state.hunger-12,0,100);state.condition=clamp(state.condition-(state.hunger<28?5:1),5,100);if(state.slot<2){state.slot++;save();renderHud();return}showDayReport()}

function rollEvent(force=false){if(force||Math.random()<.42){state.event=EVENTS[Math.floor(Math.random()*EVENTS.length)];if(state.event.hunger)state.hunger=clamp(state.hunger+state.event.hunger,0,100)}else state.event=null}

function interact(){if(!nearest)return;if(nearest.type==='heldAction'){if(state.location==='market')putHeldInCart();else dropHeldHome();return}if(nearest.type==='homeFood'){takeHomeItem(nearest.uid);return}if(nearest.type==='marketProduct'){tryTakeMarketProduct(nearest.productId);return}switch(nearest.type){case'fridge':case'pantry':toggleStorage(nearest.type);break;case'counter':if(state.held)putOnCounter();else if(state.prep.length)toast('재료가 준비됐어요. 인덕션에서 요리해 보세요.');else toast('냉장고나 찬장에서 재료를 꺼내 와 보세요.');break;case'sink':washHeld();break;case'stove':cookPrep();break;case'microwave':microwaveHeld();break;case'table':if(state.held||state.dish)eatAtTable();else if(state.mealFoods.length)finishMeal();else skipMeal();break;case'marketDoor':goMarket();break;case'cartBay':grabCart();break;case'homeDoor':goHomeWithoutCheckout();break;case'checkout':openCheckout();break;case'homeEntry':buildHome();break;case'convenienceEntry':buildConvenienceStore();break;case'fastFoodEntry':buildFastFood();break;case'marketEntry':buildStore();break;case'gymEntry':buildGym();break;case'officeEntry':buildOffice();break;case'hospitalEntry':buildHospital('walk');break;case'convenienceBuy':buyConvenienceItem(nearest.productId,nearest.price);break;case'fastFoodOrder':orderFastFood(nearest.menuKey);break;case'gymRun':doGymWorkout('run');break;case'gymWeights':doGymWorkout('weights');break;case'gymStretch':doGymWorkout('stretch');break;case'gymRest':restAtGym();break;case'convenienceExit':buildTown('convenience');break;case'fastFoodExit':buildTown('fastfood');break;case'gymExit':buildTown('gym');break;case'workDesk':workOffice();break;case'officeExit':buildTown('office');break;case'treat':treatAtHospital();break;case'hospitalExit':buildTown('hospital');break}}

async function grabCart(){if(state.hasCart)return;state.hasCart=true;await spawnCart();tone('pick');renderHud();save();toast('카트를 잡았어요. 이제 원하는 식품을 골라 담아 보세요.')}
async function goMarket(){if(state.held||state.prep.length)return toast('들고 있는 음식이나 조리대 재료를 먼저 정리해 주세요.',true);tone('door');await buildTown('home');save()}
async function goHomeWithoutCheckout(){if(state.held||state.basket.length)return toast('카트의 물건을 계산하거나 모두 빼고 나가 주세요.',true);state.hasCart=false;tone('door');await buildTown('market');save()}

function openCheckout(){if(state.location!=='market'||!state.basket.length)return;state.phase='checkout';state.running=false;state.scanned=new Set();state.totalConfirmed=false;state.paid=0;state.changeConfirmed=false;ui.totalInput.value='';ui.changeInput.value='';ui.checkout.classList.add('show');ui.checkout.setAttribute('aria-hidden','false');renderCheckout();tone('scan')}
function closeCheckout(){if(state.phase!=='checkout')return;state.phase='shopping';state.running=true;ui.checkout.classList.remove('show');ui.checkout.setAttribute('aria-hidden','true');renderHud()}
function checkoutStage(){return state.scanned.size<state.basket.length?'scan':!state.totalConfirmed?'total':!state.paid?'pay':'change'}
function renderCheckoutStage(){const stage=checkoutStage(),ids=['scan','total','pay','change'];for(const id of ids)$('#'+id+'Section').classList.toggle('hidden',id!==stage);$('#checkoutStep').textContent=(ids.indexOf(stage)+1)+' / 4 · '+({scan:'상품 스캔',total:'총액 계산',pay:'낼 돈 선택',change:'거스름돈 계산'}[stage]);ui.finishCheckout.classList.toggle('hidden',!state.changeConfirmed);ui.checkout.querySelector('.checkoutCard').scrollTop=0}
function renderCheckout(){const all=state.scanned.size===state.basket.length;ui.scanStat.textContent=state.scanned.size+' / '+state.basket.length;ui.checkoutMoney.textContent=fmt(state.money);ui.checkoutPaid.textContent=state.paid?fmt(state.paid):'-';ui.checkoutChange.textContent=state.changeConfirmed?'✓':'?';ui.scanItems.innerHTML=state.basket.map((id,i)=>{const p=productById(id),scanned=state.scanned.has(i);return '<button class="scanItem '+(scanned?'scanned':'')+'" data-scan="'+i+'"><span><b>'+(scanned?'✓ ':'')+p.name+'</b><small>'+ZONES[p.zone].name+'</small></span><strong>'+fmt(discountedPrice(p))+'</strong></button>'}).join('');ui.receipt.innerHTML=[...state.scanned].sort((a,b)=>a-b).map(i=>{const p=productById(state.basket[i]);return '<div class="receiptLine"><span>'+p.name+'</span><b>'+fmt(discountedPrice(p))+'</b></div>'}).join('')||'<div class="receiptLine"><span>스캔한 상품이 여기에 표시돼요.</span></div>';ui.totalSection.classList.toggle('locked',!all);ui.paySection.classList.toggle('locked',!state.totalConfirmed);ui.changeSection.classList.toggle('locked',!state.paid);ui.checkoutGuide.textContent=!all?'상품을 하나씩 눌러 바코드를 스캔하세요.':!state.totalConfirmed?'가격을 모두 더해서 총액을 직접 입력하세요.':!state.paid?'낼 현금을 고르세요.':'낸 돈에서 총액을 빼서 거스름돈을 직접 입력하세요.';if(state.totalConfirmed){const total=cartTotal(),opts=[10000,20000,30000,50000,state.money].filter(v=>v>=total&&v<=state.money);if(total<=5000&&state.money>=5000)opts.unshift(5000);ui.cashOptions.innerHTML=[...new Set(opts)].slice(0,4).map(v=>'<button class="cashBtn '+(state.paid===v?'selected':'')+'" data-cash="'+v+'">'+fmt(v)+'</button>').join('')}else ui.cashOptions.innerHTML='<button class="cashBtn" disabled>총액을 먼저 맞혀 주세요</button>';ui.changeEquation.textContent=state.paid?state.paid.toLocaleString()+' − 내가 계산한 총액 = ?':'낸 돈 − 총액 = ?';ui.finishCheckout.disabled=!state.changeConfirmed;renderCheckoutStage()}
function scanItem(i){if(state.phase!=='checkout'||state.scanned.has(i))return;state.scanned.add(i);tone('scan');renderCheckout()}
function submitTotal(){if(state.scanned.size!==state.basket.length)return toast('상품을 먼저 모두 스캔해 주세요.',true);const v=Number(String(ui.totalInput.value).replace(/\D/g,'')),real=cartTotal();if(v!==real){state.checkoutMistakes++;tone('bad');toast('같은 상품끼리 묶어 더한 뒤, 천 원과 백 원 자리를 나누어 확인해 보세요.',true);return}if(real>state.money){tone('bad');toast('계산은 맞았지만 가진 식비보다 '+fmt(real-state.money)+' 많아요. 카트에서 물건을 빼 주세요.',true);closeCheckout();ui.cartPanel.classList.remove('hidden');return}state.totalConfirmed=true;ui.totalInput.blur();tone('good');renderCheckout();toast('총액이 맞아요!')}
function chooseCash(v){if(!state.totalConfirmed||v<cartTotal()||v>state.money)return;state.paid=v;state.changeConfirmed=false;ui.changeInput.value='';tone('cash');renderCheckout()}
function submitChange(){if(!state.paid)return;const v=Number(String(ui.changeInput.value).replace(/\D/g,'')),target=state.paid-cartTotal();if(v!==target){state.checkoutMistakes++;tone('bad');toast('총액에서 낸 돈까지 얼마를 더해야 하는지 차례로 세어 보세요.',true);return}state.changeConfirmed=true;ui.changeInput.blur();tone('good');renderCheckout();toast('거스름돈도 정확해요!')}
async function finishCheckout(){if(!state.changeConfirmed)return;const total=cartTotal();state.money-=total;state.dailyExpense+=total;state.weekStats.spent+=total;for(const id of state.basket)state.inventory.push({uid:makeUid(id),id,age:0});state.basket=[];state.hasCart=false;state.held=null;state.scanned=new Set();state.phase='town';state.running=true;ui.checkout.classList.remove('show');ui.checkout.setAttribute('aria-hidden','true');ui.cartPanel.classList.add('hidden');tone('door');await buildTown('market');renderHud();save();toast('계산 완료! 장본 식품을 가지고 집으로 돌아가 보세요.')}

function weekBalanceLabel(){const s=state.weekStats;if(!s.meals)return'기록 없음';const score=s.veg*2+s.protein*.18-s.sugar*.08-s.sodium*.5;return score>24?'다양하게 먹음':score>8?'무난함':'조금 치우침'}
function showWeekReport(){state.running=false;state.phase='week';const s=state.weekStats;let notes=[];if(s.veg<10)notes.push('채소·과일이 조금 적었어요.');else notes.push('채소·과일을 여러 번 먹었어요.');if(s.sugar>95)notes.push('단 음식과 음료가 자주 있었어요.');if(s.sodium>55)notes.push('짠 간편식이 조금 많았어요.');if(s.cooked>=3)notes.push('직접 요리한 끼니가 꽤 있었어요.');if(!notes.length)notes.push('먹고 싶은 것과 필요한 것을 적당히 섞어 먹었어요.');ui.weekSummary.textContent=notes.join(' ');ui.weekCooked.textContent=s.cooked+'회';ui.weekQuick.textContent=s.quick+'회';ui.weekMoney.textContent=fmt(state.money);ui.weekBalance.textContent=weekBalanceLabel();ui.week.classList.remove('hidden');save()}
function nextWeek(){state.day=1;state.slot=0;state.dailyKcal=0;state.dailyNutrition=freshDailyNutrition();state.dailyIncome=0;state.dailyExpense=0;state.dailyIncidents=[];state.weekStats=freshStats();state.mealFoods=[];state.mealCooked=false;state.mealQuick=false;state.hunger=clamp(state.hunger,45,75);state.condition=clamp(state.condition+4,20,100);state.workedDay=0;state.dogEventDay=0;state.phase='home';state.running=true;rollEvent(true);ui.week.classList.add('hidden');save();renderHud();toast('새로운 한 주가 시작됐어요. 가진 돈은 그대로 이어집니다.')}

function makeDogLabel(){
 const c=document.createElement('canvas');c.width=256;c.height=96;const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sp.scale.set(1.9,.72,1);sp.userData.canvas=c;sp.userData.tex=tex;return sp
}
function paintDogLabel(sp){const c=sp.userData.canvas,x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='rgba(255,253,247,.95)';x.beginPath();if(x.roundRect)x.roundRect(8,8,240,78,22);else x.rect(8,8,240,78);x.fill();x.strokeStyle='#d65b52';x.lineWidth=5;x.stroke();x.fillStyle='#9f3e39';x.font='900 34px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('🐕 '+Math.max(0,dogChaseLeft).toFixed(1)+'초',128,47);sp.userData.tex.needsUpdate=true}
async function spawnDog(){
 if(dog||dogSpawning||state.location!=='town'||state.dogEventDay===state.day)return;dogSpawning=true;state.dogEventDay=state.day;save();
 try{
  let spawn=null;
  for(let tries=0;tries<16&&!spawn;tries++){const angle=Math.random()*Math.PI*2,radius=8+Math.random()*2.5,x=clamp(playerPos.x+Math.cos(angle)*radius,-14.5,14.5),z=clamp(playerPos.z+Math.sin(angle)*radius,-14.5,14.5);if(canStand(x,z)&&Math.hypot(x-playerPos.x,z-playerPos.z)>7)spawn={x,z}}
  if(!spawn)spawn={x:clamp(playerPos.x+8,-14.5,14.5),z:clamp(playerPos.z+4,-14.5,14.5)};
  dog=await fitted(CITY_ASSETS.dog,1.35);dog.position.set(spawn.x,0,spawn.z);const label=makeDogLabel();label.position.set(0,2.0,0);dog.add(label);dog.userData.label=label;dog.userData.mixer=startModelAnimation(dog,/run|sprint|walk/i);dynamic.add(dog);dogChaseLeft=10+Math.random()*10;dogLabelClock=0;dogBarkCooldown=1.1;ui.chaseHud.classList.remove('hidden');ui.chaseTitle.textContent='강아지가 쫓아와요!';playDogSound('bark');toast('멍! 강아지가 달려옵니다. 컨디션이 좋으면 쉽게 따돌릴 수 있어요!',true);paintDogLabel(label)
 }catch(e){console.warn('dog spawn failed',e);dog=null}finally{dogSpawning=false}
}

function endDog(success=true){if(dog){dog.userData.mixer?.stopAllAction();dog.removeFromParent();dog=null}dogChaseLeft=0;dogBarkCooldown=0;ui.chaseHud.classList.add('hidden');renderEvent();if(success&&state.location==='town')toast('강아지를 따돌렸어요!')}
function dogBite(){if(!dog)return;state.injury='dog';state.treatmentNeeded=true;state.condition=clamp(state.condition-24,5,100);state.dailyIncidents.push('🐕 강아지에게 물려 상처가 났어요. 병원 치료가 필요해요.');injuryBurst(playerPos);impactBurst(playerPos,'dog');playDogSound('bite');triggerCameraImpact(.2,.34);endDog(false);renderHud();save();toast('악! 강아지에게 물렸어요. 병원에 가서 치료받으세요.',true)}
function updateDog(dt){
 if(state.location!=='town'||!state.running){if(dog)endDog(false);return}
 if(!dog){if(state.dogEventDay!==state.day&&!dogSpawning){dogSpawnClock-=dt;if(dogSpawnClock<=0){dogSpawnClock=999;spawnDog()}}return}
 dogChaseLeft-=dt;dogLabelClock-=dt;dogBarkCooldown=Math.max(0,dogBarkCooldown-dt);dog.userData.mixer?.update(dt);const dx=playerPos.x-dog.position.x,dz=playerPos.z-dog.position.z,dist=Math.hypot(dx,dz)||.001;const dogSpeed=4.45;if(dogBarkCooldown<=0&&dist<6.5){playDogSound('bark');dogBarkCooldown=1.35+Math.random()*1.15}
 if(dist>.03){
  const vx=dx/dist*dogSpeed*dt,vz=dz/dist*dogSpeed*dt;let moved=false;
  if(canStand(dog.position.x+vx,dog.position.z)){dog.position.x+=vx;moved=true}
  if(canStand(dog.position.x,dog.position.z+vz)){dog.position.z+=vz;moved=true}
  if(!moved){const sideX=-dz/dist*dogSpeed*.72*dt,sideZ=dx/dist*dogSpeed*.72*dt;if(canStand(dog.position.x+sideX,dog.position.z))dog.position.x+=sideX;if(canStand(dog.position.x,dog.position.z+sideZ))dog.position.z+=sideZ}
  dog.rotation.y=Math.atan2(dx,dz)
 }
 if(dogLabelClock<=0){dogLabelClock=.12;paintDogLabel(dog.userData.label);ui.chaseText.textContent=Math.max(0,dogChaseLeft).toFixed(1)+'초만 더 도망가세요 · 현재 컨디션 '+Math.round(state.condition)}
 if(Math.hypot(playerPos.x-dog.position.x,playerPos.z-dog.position.z)<.78){dogBite();return}if(dogChaseLeft<=0)endDog(true)
}


function updateMovement(dt){if(!state.running||state.phase==='checkout'||state.phase==='day')return;let f=0,r=0;if(keys.KeyW||keys.ArrowUp)f+=1;if(keys.KeyS||keys.ArrowDown)f-=1;if(keys.KeyD||keys.ArrowRight)r+=1;if(keys.KeyA||keys.ArrowLeft)r-=1;if(touch.active){r+=touch.x;f-=touch.y}const len=Math.hypot(f,r);if(freeWalk&&len>.01){f/=Math.max(1,len);r/=Math.max(1,len);const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),v=forward.multiplyScalar(f).add(right.multiplyScalar(r));let speed=state.location==='market'&&state.hasCart?3.4:3.8;if(state.location==='town'){speed=3.4+1.4*clamp(state.condition,0,100)/100;if(state.treatmentNeeded)speed*=.84}const c=playerPos.clone().addScaledVector(v,speed*dt);if(canStand(c.x,playerPos.z))playerPos.x=c.x;if(canStand(playerPos.x,c.z))playerPos.z=c.z}camera.position.copy(playerPos);camera.rotation.y=yaw;camera.rotation.x=pitch;if(cart&&state.location==='market'&&state.hasCart){const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));const target=playerPos.clone().addScaledVector(forward,.92);target.y=0;if(freeWalk){cart.position.lerp(target,Math.min(1,dt*8));cart.rotation.y=yaw+Math.PI}else{cart.position.set(3.65,0,3.15);cart.rotation.y=-.4}}}

function updateLabels(){for(const v of labelViews){let show=false;if(state.location==='market'&&v.kind==='market'){const p=productById(v.id),d=Math.hypot(playerPos.x-p.pos[0],playerPos.z-p.pos[1]);show=d<3.4}else if(state.location==='home'&&v.kind==='home'){const wp=new THREE.Vector3();v.root.getWorldPosition(wp);show=Math.hypot(playerPos.x-wp.x,playerPos.z-wp.z)<2.6}v.label.style.display=show?'block':'none';if(!show)continue;const w=new THREE.Vector3();v.root.getWorldPosition(w);w.y+=.5;w.project(camera);if(w.z>1||Math.abs(w.x)>1.3||Math.abs(w.y)>1.3){v.label.style.display='none';continue}v.label.style.left=(w.x*.5+.5)*innerWidth+'px';v.label.style.top=(-w.y*.5+.5)*innerHeight+'px'}}
function setStick(e){const r=ui.joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx0=e.clientX-cx,dy0=e.clientY-cy,max=r.width*.34,len=Math.hypot(dx0,dy0)||1,s=Math.min(1,max/len),dx=dx0*s,dy=dy0*s;ui.stick.style.transform='translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px))';touch.x=dx/max;touch.y=dy/max}
function endStick(e){if(e.pointerId!==touch.pointer)return;touch.active=false;touch.x=touch.y=0;touch.pointer=null;ui.stick.style.transform='translate(-50%,-50%)'}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6))}

window.addEventListener('resize',resize);resize();window.addEventListener('pointerdown',()=>ensureAudio(),{once:true});window.addEventListener('keydown',()=>ensureAudio(),{once:true});window.addEventListener('keydown',e=>{if(e.target.matches('input,textarea')||!freeWalk)return;keys[e.code]=true;if((e.code==='Space'||e.code==='KeyE')&&state.running&&state.phase!=='checkout'){e.preventDefault();interact()}if(e.code==='Escape'&&state.phase==='checkout')closeCheckout()});window.addEventListener('keyup',e=>{keys[e.code]=false});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){lookPointer=e.pointerId;lastLook={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);return}if(e.clientX>innerWidth*.42){lookPointer=e.pointerId;lastLook={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId)}});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||!lastLook)return;const dx=e.clientX-lastLook.x,dy=e.clientY-lastLook.y;lastLook={x:e.clientX,y:e.clientY};yaw-=dx*.006;pitch=clamp(pitch-dy*.0045,-.72,.52)});canvas.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer){lookPointer=null;lastLook=null}});canvas.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer){lookPointer=null;lastLook=null}});
ui.joystick.addEventListener('pointerdown',e=>{touch.active=true;touch.pointer=e.pointerId;ui.joystick.setPointerCapture(e.pointerId);setStick(e)});ui.joystick.addEventListener('pointermove',e=>{if(touch.active&&e.pointerId===touch.pointer)setStick(e)});ui.joystick.addEventListener('pointerup',endStick);ui.joystick.addEventListener('pointercancel',endStick);
ui.interactBtn.onclick=interact;ui.touchInteract.onclick=interact;ui.sound.onclick=()=>{state.sound=!state.sound;ui.sound.textContent=state.sound?'🔊':'🔇';save();if(state.sound)tone('cash')};ui.cartBtn.onclick=()=>{renderCartPanel();ui.cartPanel.classList.remove('hidden')};ui.closeCart.onclick=()=>ui.cartPanel.classList.add('hidden');ui.cartList.onclick=async e=>{const b=e.target.closest('[data-remove]');if(!b)return;const i=+b.dataset.remove;if(i<0||i>=state.basket.length)return;const id=state.basket.splice(i,1)[0];await syncCartCargo();renderHud();save();toast(productById(id).name+'을(를) 카트에서 뺐어요.')};
ui.scanItems.onclick=e=>{const b=e.target.closest('[data-scan]');if(b)scanItem(+b.dataset.scan)};ui.checkTotal.onclick=submitTotal;ui.cashOptions.onclick=e=>{const b=e.target.closest('[data-cash]');if(b)chooseCash(+b.dataset.cash)};ui.checkChange.onclick=submitChange;ui.closeCheckout.onclick=closeCheckout;ui.backToShopping.onclick=closeCheckout;ui.finishCheckout.onclick=finishCheckout;ui.nextDayBtn.onclick=completeDay;ui.newLife.onclick=async()=>{if(state.phase==='assetError'){ui.newLife.disabled=true;await preload();return}newLife();try{await buildHome();storageOpen.fridge=true;for(const r of kitchenStorage.fridge)setStorageDoors(r,true);await syncHomeInventory();ui.start.classList.add('hidden');renderHud()}catch(err){state.running=false;console.error(err);ui.loadText.textContent='부엌을 준비하지 못했어요. 다시 눌러 주세요.'}};ui.continueBtn.onclick=async()=>{if(!loadSave())newLife();try{if(state.location==='market')await buildStore();else if(state.location==='convenience')await buildConvenienceStore();else if(state.location==='fastfood')await buildFastFood();else if(state.location==='gym')await buildGym();else if(state.location==='town')await buildTown('home');else if(state.location==='office')await buildOffice();else if(state.location==='hospital')await buildHospital('walk');else await buildHome();if(state.location==='home'){storageOpen.fridge=true;for(const r of kitchenStorage.fridge)setStorageDoors(r,true);await syncHomeInventory()}ui.start.classList.add('hidden');renderHud()}catch(err){state.running=false;console.error(err);ui.loadText.textContent='공간을 준비하지 못했어요. 이어하기를 다시 눌러 주세요.'}};ui.nextWeek.onclick=nextWeek;

const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=Math.min(.05,clock.getDelta());updateMovement(dt);updateCity(dt);for(const mixer of roomMixers)mixer.update(dt);updateDog(dt);updateCameraImpact(dt);updateInjuryParticles(dt);updateInteraction();updateLabels();renderer.render(scene,camera)}requestAnimationFrame(animate);

async function preload(){const critical=[...MARKET_MODELS.map(n=>MARKET+n+'.glb'),...PRODUCTS.map(productAssetUrl),...HOME_MODELS.map(n=>KITCHEN+n+'.glb'),...HOME_DECOR_MODELS.map(n=>CHARMING+n),...DISH_MODELS.map(n=>FOOD+n+'.glb'),...Object.values(CITY_ASSETS),...CITY_PEOPLE_ASSETS.slice(0,8),...Object.values(CITY_DECOR_ASSETS),...Object.values(FAST_FOOD_MENU).map(m=>FOOD+m.model),KITCHEN+'chair-desk.glb'];const unique=[...new Set(critical)];let done=0;const failed=[];await Promise.all(unique.map(async u=>{try{await asset(u)}catch(e){console.warn('preload failed',u,e);failed.push(u)}finally{done++;const pct=Math.round(done/unique.length*100);ui.loadFill.style.width=pct+'%';ui.loadText.textContent='집과 동네 상점을 준비하고 있어요… '+pct+'%'}}));if(failed.length){state.phase='assetError';ui.loadText.textContent='일부 에셋을 불러오지 못했어요. 다시 준비를 눌러 주세요.';ui.newLife.textContent='다시 준비';ui.newLife.disabled=false;ui.continueBtn.disabled=true;return}ui.newLife.textContent='새 생활 시작';ui.loadFill.style.width='100%';ui.loadText.textContent='준비 완료!';ui.newLife.disabled=false;ui.continueBtn.disabled=!hasSave();ui.sound.textContent=state.sound?'🔊':'🔇';state.phase='ready'}
preload().catch(err=>{console.error(err);ui.loadText.textContent='3D 에셋을 불러오지 못했어요. 새로고침해 주세요.'});
