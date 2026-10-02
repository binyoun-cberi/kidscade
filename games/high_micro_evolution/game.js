(() => {
'use strict';

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const TAU = Math.PI*2;
const rand = (a=1,b=0) => b + Math.random()*(a-b);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const dist2 = (a,b) => { const x=wrappedDelta(a.x,b.x,WORLD.w),y=wrappedDelta(a.y,b.y,WORLD.h); return x*x+y*y; };
const angleDiff = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));

const BIOMES = [
  {id:'pond',icon:'☀️',name:'햇빛 연못',desc:'빛과 먹이가 풍부하지만 경쟁자도 많아요.',color:['#0c5d67','#153d52'],env:{light:92,temp:64,oxygen:78,salt:12,food:80,current:18,turbidity:28}},
  {id:'swamp',icon:'🌿',name:'탁한 습지',desc:'유기물은 많고 시야는 나빠 화학·촉각 감각이 유리해요.',color:['#374d2b','#182f2d'],env:{light:42,temp:72,oxygen:36,salt:16,food:88,current:10,turbidity:91}},
  {id:'coast',icon:'🌊',name:'얕은 바다',desc:'빛은 충분하지만 파도와 물살이 강해요.',color:['#075b83','#092f59'],env:{light:77,temp:58,oxygen:83,salt:78,food:66,current:76,turbidity:35}},
  {id:'deep',icon:'🌌',name:'심해',desc:'빛이 거의 없어 화학 신호와 진동이 생존의 단서가 됩니다.',color:['#051936','#050d21'],env:{light:5,temp:22,oxygen:48,salt:73,food:34,current:28,turbidity:18}},
  {id:'vent',icon:'♨️',name:'열수구',desc:'뜨겁고 화학물질이 풍부한 극한 환경입니다.',color:['#402023','#0a1a22'],env:{light:3,temp:96,oxygen:27,salt:72,food:58,current:55,turbidity:62}},
  {id:'ice',icon:'❄️',name:'빙하 아래',desc:'차갑고 먹이가 적어 에너지 절약이 중요해요.',color:['#235477','#0a2746'],env:{light:31,temp:5,oxygen:88,salt:66,food:27,current:34,turbidity:16}},
  {id:'salt',icon:'🧂',name:'고염 호수',desc:'염도가 매우 높아 튼튼한 막과 삼투 조절이 중요해요.',color:['#57517c','#243653'],env:{light:82,temp:61,oxygen:57,salt:98,food:38,current:8,turbidity:24}}
];

const PARTS = {
  primitiveMouth:{id:'primitiveMouth',cat:'먹이',icon:'◌',name:'원시 섭식구',cost:0,external:true,max:1,starter:true,desc:'작은 영양 입자를 조금씩 흡수하는 초기 기관이에요.',science:'초기의 단순한 섭식은 특정 먹이에 고도로 특화되지 않습니다. 진화가 진행되면 포식·여과·광합성·기생처럼 서로 다른 전략이 더 효율적이 됩니다.'},
  predatorMouth:{id:'predatorMouth',cat:'먹이',icon:'🦷',name:'포식 입',cost:10,external:true,max:2,desc:'떠다니는 먹이보다 다른 생물을 사냥할 때 훨씬 큰 성장을 얻어요.',science:'포식자는 다른 생물을 먹어 유기물에서 에너지를 얻습니다. 입의 위치가 진행 방향과 잘 맞을수록 사냥하기 편해집니다.'},
  filter:{id:'filter',cat:'먹이',icon:'🪭',name:'여과기관',cost:10,external:true,max:3,desc:'플랑크톤 군집 안에서 작은 입자를 빠르게 걸러 생체량을 만들어요.',science:'여과섭식은 물을 통과시키며 작은 먹이 입자를 걸러 먹는 방식입니다. 먹이가 밀집된 곳을 찾는 것이 중요합니다.'},
  chloroplast:{id:'chloroplast',cat:'먹이',icon:'🌱',name:'광합성체',cost:14,external:false,max:4,desc:'밝은 수역에 머물면 에너지뿐 아니라 생체량도 꾸준히 만들어요.',science:'광합성 생물은 빛 에너지를 이용해 유기물을 만듭니다. 빛이 부족하면 같은 기관도 큰 도움이 되지 않습니다.'},
  parasite:{id:'parasite',cat:'먹이',icon:'🪝',name:'기생 흡착기',cost:14,external:true,max:2,desc:'큰 숙주에 달라붙어 에너지와 생체량을 지속적으로 빼앗아요.',science:'기생은 숙주에게서 자원이나 영양을 얻는 생활 방식입니다. 숙주와 가까이 붙어 있어야 합니다.'},

  flagellum:{id:'flagellum',cat:'이동',icon:'〰️',name:'편모',cost:8,external:true,max:6,desc:'긴 채찍 모양 기관. 뒤쪽에 달수록 직진 추진력이 커져요.',science:'편모는 회전하거나 휘어지며 세포를 추진합니다. 이 게임에서는 배치 방향이 추진 효율에 영향을 줍니다.'},
  cilia:{id:'cilia',cat:'이동',icon:'≋',name:'섬모',cost:9,external:true,max:6,desc:'짧은 털을 움직여 방향 전환과 미세 이동을 도와요.',science:'섬모는 짧은 털 모양 구조가 함께 움직여 이동과 물질 운반을 돕습니다.'},
  pseudopod:{id:'pseudopod',cat:'이동',icon:'🫧',name:'위족',cost:12,external:true,max:3,desc:'몸을 늘여 움직이고 가까운 먹이를 감싸 먹기 쉬워져요.',science:'아메바처럼 세포질을 한쪽으로 내밀어 만드는 돌기를 위족이라고 합니다. 이동과 포식에 함께 쓰일 수 있습니다.'},
  anchor:{id:'anchor',cat:'이동',icon:'⚓',name:'부착기관',cost:10,external:true,max:2,desc:'물살에 밀리는 힘을 줄이고 잠깐 고정할 수 있어요.',science:'많은 미생물은 표면에 달라붙어 물살에 휩쓸리는 것을 줄입니다.'},

  eyespot:{id:'eyespot',cat:'감각',icon:'👁️',name:'광수용기',cost:8,external:true,max:4,desc:'1개만 있어도 현재 밝기를 느끼고, 2개부터는 밝기 차이를 비교해 더 밝은 방향까지 알아내요.',science:'광수용 구조는 빛의 세기에 반응할 수 있습니다. 여러 수용기가 서로 다른 방향의 빛을 비교하면 빛이 강한 쪽을 더 잘 구별할 수 있습니다.'},
  chemo:{id:'chemo',cat:'감각',icon:'👃',name:'화학수용체',cost:8,external:true,max:4,desc:'먹이와 생물이 남기는 화학 신호를 멀리서 찾아요.',science:'세포도 주변 화학물질의 농도 차이를 감지해 먹이나 위험 쪽으로 이동하거나 피할 수 있습니다.'},
  mechano:{id:'mechano',cat:'감각',icon:'👂',name:'기계수용체',cost:10,external:true,max:4,desc:'물의 진동으로 가까워지는 큰 생물을 미리 느껴요.',science:'기계수용은 압력·진동·늘어남 같은 물리적 변화를 감지하는 방식입니다. 귀의 먼 조상 기능과 연결해 생각할 수 있습니다.'},
  tactile:{id:'tactile',cat:'감각',icon:'✋',name:'촉각섬모',cost:7,external:true,max:6,desc:'아주 가까운 물체와 물살 변화를 빠르게 알아차려요.',science:'세포막과 섬모는 접촉이나 흐름 변화에 반응할 수 있습니다. 가까운 위험을 알아차리는 데 유리합니다.'},
  thermo:{id:'thermo',cat:'감각',icon:'🌡️',name:'온도수용체',cost:8,external:false,max:2,desc:'위험한 온도 구역에서 경고를 받고 적응력이 좋아져요.',science:'생물은 온도 변화에 따라 단백질 작동과 대사 속도가 달라집니다. 온도를 감지하고 반응하는 것은 중요한 생존 전략입니다.'},
  electro:{id:'electro',cat:'감각',icon:'⚡',name:'전기 감각',cost:16,external:true,max:2,desc:'가까운 생물의 미세한 전기 변화를 감지해요.',science:'일부 동물은 전기장을 감지합니다. 게임에서는 진화가 많이 진행된 감각 계열의 특수 기관으로 단순화했습니다.'},

  membrane:{id:'membrane',cat:'방어',icon:'🛡️',name:'두꺼운 막',cost:10,external:false,max:4,desc:'공격과 염도 변화에 강해지지만 몸이 조금 무거워져요.',science:'세포막은 물질 출입을 조절합니다. 실제 생물의 세포벽·막 조성 변화처럼 환경에 대한 보호 기능을 게임식으로 단순화했습니다.'},
  spike:{id:'spike',cat:'방어',icon:'🔺',name:'가시',cost:10,external:true,max:6,desc:'몸에 부딪힌 포식자에게 피해를 주고 접근을 어렵게 해요.',science:'가시와 돌기는 포식자가 삼키거나 접근하기 어렵게 만드는 방어 형질이 될 수 있습니다.'},
  toxin:{id:'toxin',cat:'방어',icon:'☠️',name:'독소낭',cost:14,external:false,max:3,desc:'특수 행동으로 주변에 독소를 방출할 수 있어요.',science:'미생물도 다른 생물의 성장을 억제하거나 공격하는 화학물질을 만들 수 있습니다.'},
  camouflage:{id:'camouflage',cat:'방어',icon:'🫥',name:'위장색소',cost:12,external:false,max:3,desc:'가만히 있으면 포식자가 나를 알아채기 어려워져요.',science:'몸의 색이나 투명도는 배경과 비슷해져 발견될 가능성을 낮추는 데 도움이 될 수 있습니다.'}
};

const CATS = ['먹이','이동','감각','방어'];
const CAMERA_ZOOM = 1.55;
const WORLD = {w:2300,h:1650};
const SAVE_KEY = window.KidscadeGame?.storageKey?.('high_micro_evolution','save') || 'kidscade_game_v1:high_micro_evolution:save';

let canvas,ctx,dpr=1,viewW=0,viewH=0,last=0,raf=0;
let running=false,paused=false,toastTimer=0,eventTimer=0,senseTimer=0;
let selectedBiome=BIOMES[0],selectedPart=null,activeTab='먹이',editorSnapshot=null;
let keys={},pointerTarget=null,joy={active:false,x:0,y:0,pid:null};
let foods=[],creatures=[],lightPatches=[],foodClusters=[],biomeProps=[],ripples=[],particles=[];
let baseEnv={...BIOMES[0].env},env={...BIOMES[0].env};
let eventDelta={},eventDuration=0;
let state = {
  generation:1,generationClock:0,eventClock:0,dna:4,score:0,survival:0,
  player:null,mission:0,discovered:{},facts:{},started:false,reproductions:0,
  activeEvent:null,activeEventLife:0,editorMode:null
};

function freshPlayer(){
  const slots=Array(12).fill(null);
  slots[0]='primitiveMouth';
  slots[6]='flagellum';
  return {x:WORLD.w/2,y:WORLD.h/2,vx:0,vy:0,angle:0,radius:30,energy:100,health:100,biomass:0,
    slots,inside:{chloroplast:0,thermo:0,membrane:0,toxin:0,camouflage:0},
    pulseCd:0,biteCd:0,attached:null,lastMove:0,feedFlash:0,divisionFx:0,feedAudioCd:0,hurtAudioCd:0};
}
function resetState(){
  state={generation:1,generationClock:0,eventClock:0,dna:4,score:0,survival:0,player:freshPlayer(),mission:0,discovered:{},facts:{},started:true,reproductions:0,activeEvent:null,activeEventLife:0,editorMode:null};
}
function countPart(type,p=state.player){
  return p.slots.filter(x=>x===type).length + Number(p.inside[type]||0);
}
function allParts(p=state.player){
  const out={};
  p.slots.forEach(x=>{if(x)out[x]=(out[x]||0)+1});
  Object.entries(p.inside).forEach(([k,v])=>{if(v)out[k]=(out[k]||0)+v});
  return out;
}
function externalAngle(index){ return index/12*TAU; }
function toast(msg){
  const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),1800);
}
const AUDIO_KEYS=Object.freeze({
  click:'ui.click',
  select:'ui.select',
  confirm:'ui.confirm',
  error:'ui.error',
  eat:'collect.coin_pickup',
  reward:'collect.coin_drop',
  bite:'combat.impact_heavy',
  hurt:'combat.hurt_grunt',
  dash:'combat.projectile_whoosh',
  event:'ui.open',
  generation:'ui.confirm'
});
const GAME_AUDIO_KEYS=[...new Set([...Object.values(AUDIO_KEYS),'ambient.underwater'])];
let ambienceHandle=null,ambienceToken=0;
function audioApi(){ return window.KidscadeAudio||null; }
function sound(name,options={}){
  const key=AUDIO_KEYS[name]||name;
  try{return audioApi()?.play?.(key,options)?.catch?.(()=>{})}catch(_){}
}
function preloadAudio(){
  try{return audioApi()?.preload?.(GAME_AUDIO_KEYS)?.catch?.(()=>{})}catch(_){}
}
function stopAmbience(){
  ambienceToken++;
  try{ambienceHandle?.stop?.()}catch(_){}
  ambienceHandle=null;
}
async function startAmbience(){
  const audio=audioApi();if(!audio?.play)return;
  stopAmbience();const token=ambienceToken;
  const volume=selectedBiome.id==='deep'?0.18:selectedBiome.id==='vent'?0.15:selectedBiome.id==='coast'?0.13:0.10;
  const rate=selectedBiome.id==='deep'?0.92:selectedBiome.id==='ice'?1.05:1;
  try{
    const handle=await audio.play('ambient.underwater',{loop:true,volume,rate});
    if(token!==ambienceToken){handle?.stop?.();return}
    ambienceHandle=handle?.ok?handle:null;
  }catch(_){}
}
function sdkStart(){ try{window.KidscadeGame&&KidscadeGame.start({mode:'microbe-evolution',biome:selectedBiome.id})}catch(_){} }
function sdkScore(){ try{window.KidscadeGame&&KidscadeGame.score(Math.round(state.score))}catch(_){} }

function buildBiomeCards(){
  const grid=$('biomeGrid');grid.innerHTML='';
  BIOMES.forEach(b=>{
    const btn=document.createElement('button');btn.className='biome-card';btn.type='button';
    const avg=Math.round((b.env.light+b.env.food+b.env.oxygen)/3/20);
    btn.innerHTML='<span class="icon">'+b.icon+'</span><b>'+b.name+'</b><small>'+b.desc+'</small><div class="mini-bars">'+Array.from({length:5},(_,i)=>'<i class="'+(i<avg?'on':'')+'"></i>').join('')+'</div>';
    btn.addEventListener('click',()=>startGame(b));
    grid.appendChild(btn);
  });
}
function toggleBiomePanel(){ $('biomePanel').classList.toggle('hidden'); }
function randomBiome(){ startGame(pick(BIOMES)); }

function startGame(biome){
  selectedBiome=biome;
  resetState();
  baseEnv={...biome.env};env={...baseEnv};eventDelta={};eventDuration=0;
  $('startScreen').classList.add('hidden');$('gameScreen').classList.remove('hidden');$('editorScreen').classList.add('hidden');
  resize();
  setupWorld();
  refreshHud(true);
  running=true;paused=false;last=performance.now();
  sdkStart();
  preloadAudio();sound('confirm',{volume:.20,rate:1.04});startAmbience();
  cancelAnimationFrame(raf);
  requestAnimationFrame(()=>{ resize(); last=performance.now(); raf=requestAnimationFrame(loop); });
  toast(biome.icon+' '+biome.name+' — 환경을 읽고 살아남아 보세요!');
}
function goHome(){
  running=false;cancelAnimationFrame(raf);stopAmbience();sound('click',{volume:.16});
  $('gameScreen').classList.add('hidden');$('editorScreen').classList.add('hidden');$('startScreen').classList.remove('hidden');
}

function setupWorld(){
  foods=[];creatures=[];lightPatches=[];foodClusters=[];biomeProps=[];ripples=[];particles=[];
  state.player.x=WORLD.w/2;state.player.y=WORLD.h/2;
  const patchCount=selectedBiome.id==='deep'||selectedBiome.id==='vent'?4:6;
  for(let i=0;i<patchCount;i++)lightPatches.push({x:rand(WORLD.w-320,160),y:rand(WORLD.h-320,160),r:rand(330,190),strength:rand(1,.55)});
  buildBiomeProps();
  buildFoodClusters();

  const foodN=Math.round(46+env.food*.42);
  for(let i=0;i<foodN;i++){
    if(i<18){
      const a=rand(TAU),d=rand(470,110);
      spawnFood(i%3===0?'nutrient':'plankton',(state.player.x+Math.cos(a)*d+WORLD.w)%WORLD.w,(state.player.y+Math.sin(a)*d+WORLD.h)%WORLD.h);
    }else spawnFood();
  }

  for(let i=0;i<40;i++){
    if(i<12){
      const a=rand(TAU),d=rand(650,220);
      spawnCreature(i%6,(state.player.x+Math.cos(a)*d+WORLD.w)%WORLD.w,(state.player.y+Math.sin(a)*d+WORLD.h)%WORLD.h);
    }else spawnCreature(i%6);
  }
}
function buildBiomeProps(){
  biomeProps=[];
  const types={
    pond:['plant','bubble','leaf'],swamp:['reed','debris','murk'],coast:['kelp','sand','bubble'],
    deep:['glow','rock','glow'],vent:['vent','rock','plume'],ice:['ice','bubble','crystal'],salt:['crystal','salt','salt']
  }[selectedBiome.id]||['bubble'];
  const count=selectedBiome.id==='deep'?58:46;
  for(let i=0;i<count;i++){
    biomeProps.push({x:rand(WORLD.w),y:rand(WORLD.h),type:pick(types),size:rand(32,10),phase:rand(TAU)});
  }
}
function buildFoodClusters(){
  foodClusters=[];
  const clusterCount=selectedBiome.id==='deep'||selectedBiome.id==='ice'?5:7;
  for(let i=0;i<clusterCount;i++){
    const roll=Math.random();
    let type=roll<.58?'plankton':roll<.9?'nutrient':'meat';
    if(selectedBiome.id==='deep'&&roll<.34)type='meat';
    if(selectedBiome.id==='pond'&&roll<.68)type='plankton';
    foodClusters.push({x:rand(WORLD.w),y:rand(WORLD.h),r:rand(250,130),type,strength:rand(1,.58),phase:rand(TAU)});
  }
}
function pickFoodCluster(type){
  const matches=foodClusters.filter(c=>!type||c.type===type);
  return pick(matches.length?matches:foodClusters);
}
function spawnFood(type,x,y){
  const roll=Math.random();
  type=type||(roll<.56?'plankton':roll<.88?'nutrient':'meat');
  if(x==null||y==null){
    const cluster=pickFoodCluster(type);
    if(cluster){
      const a=rand(TAU),d=Math.sqrt(Math.random())*cluster.r;
      x=(cluster.x+Math.cos(a)*d+WORLD.w)%WORLD.w;
      y=(cluster.y+Math.sin(a)*d+WORLD.h)%WORLD.h;
      type=cluster.type;
    }else{x=rand(WORLD.w);y=rand(WORLD.h)}
  }
  foods.push({x,y,type,r:type==='plankton'?4:type==='nutrient'?6:8,phase:rand(TAU)});
}
function speciesTemplate(seed){
  const diets=['grazer','filter','hunter','photo','scavenger','parasite'];
  const diet=diets[seed%diets.length];
  return {diet,speed:.7+(seed%3)*.18,armor:.5+(seed%4)*.13,sense:.7+(seed%5)*.12,toxin:seed%4===0?.6:0,photo:diet==='photo'?1:0,filter:diet==='filter'?1:0,gen:1};
}
function spawnCreature(seed=0,x,y){
  const traits=speciesTemplate(seed);
  let r=rand(42,18);
  if(traits.diet==='hunter')r=rand(52,28);
  if(traits.diet==='filter')r=rand(38,22);
  creatures.push({x:x==null?rand(WORLD.w):x,y:y==null?rand(WORLD.h):y,vx:0,vy:0,angle:rand(TAU),r,energy:100,health:100,species:seed,traits,age:0,flash:0});
}

function resize(){
  canvas=$('world');dpr=Math.min(2,window.devicePixelRatio||1);viewW=canvas.clientWidth;viewH=canvas.clientHeight;
  canvas.width=Math.round(viewW*dpr);canvas.height=Math.round(viewH*dpr);ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
}
function wrappedDelta(v,center,size){
  let d=v-center;
  if(d>size/2)d-=size;
  if(d<-size/2)d+=size;
  return d;
}
function worldToScreen(x,y){
  const p=state.player;
  return {x:wrappedDelta(x,p.x,WORLD.w)*CAMERA_ZOOM+viewW/2,y:wrappedDelta(y,p.y,WORLD.h)*CAMERA_ZOOM+viewH/2};
}
function directionVector(from,to){
  const dx=wrappedDelta(to.x,from.x,WORLD.w),dy=wrappedDelta(to.y,from.y,WORLD.h);
  const d=Math.hypot(dx,dy)||1;
  return {x:dx/d,y:dy/d,d};
}
function screenToWorld(x,y){
  const p=state.player;
  return {x:(p.x+(x-viewW/2)/CAMERA_ZOOM+WORLD.w)%WORLD.w,y:(p.y+(y-viewH/2)/CAMERA_ZOOM+WORLD.h)%WORLD.h};
}

function movementStats(p=state.player){
  const parts=allParts(p);
  let thrust=0,side=0;
  p.slots.forEach((type,i)=>{
    const a=externalAngle(i);
    if(type==='flagellum'){
      const rear=(1+Math.cos(a-Math.PI))/2;
      thrust+=.38+.82*rear;side+=.22*(1-rear);
    }else if(type==='cilia'){ thrust+=.24;side+=.65; }
    else if(type==='pseudopod'){ thrust+=.18;side+=.28; }
  });
  const armor=1+(parts.membrane||0)*.22;
  const speed=(76+thrust*35)/armor;
  const turn=2.35+side*1.2+(parts.cilia||0)*.5;
  const sense=110+(parts.eyespot||0)*35+(parts.chemo||0)*48+(parts.mechano||0)*42+(parts.tactile||0)*18+(parts.electro||0)*45;
  return {speed,turn,sense,armor,thrust};
}
function lightAt(x,y){
  const ambient=env.light/100*(1-env.turbidity/100*.38)*.42;
  let best=ambient;
  for(const q of lightPatches){
    const d=Math.sqrt(dist2({x,y},q));
    if(d<q.r)best=Math.max(best,ambient+(1-d/q.r)*q.strength*(env.light/100)*(1-env.turbidity/100*.24)*.72);
  }
  return clamp(best,0,1);
}
function lightLevelLabel(percent){
  if(percent<12)return '거의 없음';
  if(percent<30)return '아주 어두움';
  if(percent<48)return '어두움';
  if(percent<67)return '보통';
  if(percent<84)return '밝음';
  return '매우 밝음';
}
function lightCompass(angle){
  if(angle==null)return '·';
  const arrows=['→','↘','↓','↙','←','↖','↑','↗'];
  return arrows[Math.round((((angle%TAU)+TAU)%TAU)/(TAU/8))%8];
}
function lightSenseData(p=state.player){
  const eyes=p?countPart('eyespot',p):0;
  const local=p?lightAt(p.x,p.y):0;
  const percent=Math.round(local*100);
  const range=eyes?210+eyes*175:0;
  let target=null,bestScore=0,distance=Infinity;
  if(p&&eyes>=2){
    for(const q of lightPatches){
      const d=Math.sqrt(dist2(p,q));
      const edge=Math.max(0,d-q.r);
      if(edge>range)continue;
      const score=(q.strength*env.light/100)/(1+edge/170);
      if(score>bestScore){bestScore=score;target=q;distance=d;}
    }
  }
  const angle=target?Math.atan2(wrappedDelta(target.y,p.y,WORLD.h),wrappedDelta(target.x,p.x,WORLD.w)):null;
  return {eyes,local,percent,label:lightLevelLabel(percent),range,target,distance,angle,arrow:lightCompass(angle)};
}
function reproductionRequirement(){
  return 28+Math.min(42,(state.generation-1)*6);
}
function partPurchaseCost(part){
  const owned=countPart(part.id);
  const duplicateScale=1+owned*.32;
  return Math.ceil(part.cost*duplicateScale);
}
function partRefundValue(part){
  if(part.starter)return 0;
  return Math.max(1,Math.floor(part.cost*.45));
}
function reproductionProgress(){
  if(!state.player)return 0;
  const biomass=clamp(state.player.biomass/reproductionRequirement(),0,1);
  const energy=clamp(state.player.energy/78,0,1);
  return Math.min(biomass,energy);
}
function canReproduce(){
  return !!state.player&&state.player.biomass>=reproductionRequirement()&&state.player.energy>=78;
}
function updateEnvironment(dt){
  if(state.activeEventLife>0){
    state.activeEventLife=Math.max(0,state.activeEventLife-dt);
  }
  const fade=state.activeEventLife<=0?0:clamp(state.activeEventLife/Math.min(6,eventDuration||6),0,1);
  for(const key of Object.keys(baseEnv)){
    env[key]=clamp(baseEnv[key]+Number(eventDelta[key]||0)*fade,0,100);
  }
  if(state.activeEventLife<=0&&state.activeEvent){
    state.activeEvent=null;eventDelta={};eventDuration=0;refreshEnvBars();
  }
}
function salinityStress(){
  const membrane=countPart('membrane'),target=50+membrane*13;
  return Math.max(0,Math.abs(env.salt-50)-target*.55)/50;
}
function temperatureStress(){
  const thermo=countPart('thermo'),comfort=34+thermo*10;
  return Math.max(0,Math.abs(env.temp-55)-comfort)/50;
}
function inputVector(){
  let x=0,y=0;
  if(keys.ArrowLeft||keys.a||keys.A)x--;
  if(keys.ArrowRight||keys.d||keys.D)x++;
  if(keys.ArrowUp||keys.w||keys.W)y--;
  if(keys.ArrowDown||keys.s||keys.S)y++;
  if(joy.active){x=joy.x;y=joy.y}
  else if(pointerTarget){
    const dx=pointerTarget.x-viewW/2,dy=pointerTarget.y-viewH/2,d=Math.hypot(dx,dy);
    if(d>38){x=dx/d;y=dy/d}
  }
  const d=Math.hypot(x,y);return d>1?{x:x/d,y:y/d}:{x,y};
}

function updatePlayer(dt){
  const p=state.player,move=inputVector(),stats=movementStats(p),mag=Math.hypot(move.x,move.y);
  if(mag>.05){
    const target=Math.atan2(move.y,move.x),diff=angleDiff(target,p.angle);
    p.angle+=clamp(diff,-stats.turn*dt,stats.turn*dt);
    const align=Math.max(.15,Math.cos(angleDiff(target,p.angle)));
    const speed=stats.speed*align;
    p.vx=lerp(p.vx,Math.cos(p.angle)*speed,clamp(dt*4,0,1));
    p.vy=lerp(p.vy,Math.sin(p.angle)*speed,clamp(dt*4,0,1));
    p.lastMove=state.survival;
  }else{
    p.vx*=Math.pow(.1,dt);p.vy*=Math.pow(.1,dt);
  }
  const flow=env.current/100*28,flowA=.35+Math.sin(state.survival*.05)*.25;
  const anchor=countPart('anchor');
  const flowScale=Math.max(.08,1-anchor*.38);
  p.x+= (p.vx+Math.cos(flowA)*flow*flowScale)*dt;
  p.y+= (p.vy+Math.sin(flowA)*flow*.45*flowScale)*dt;
  p.x=(p.x+WORLD.w)%WORLD.w;p.y=(p.y+WORLD.h)%WORLD.h;

  const moving=Math.hypot(p.vx,p.vy)>15;
  let drain=.55+(moving?.42:0)+stats.thrust*.035;
  drain += salinityStress()*.9 + temperatureStress()*.8;
  p.energy-=drain*dt;

  const chlor=countPart('chloroplast');
  if(chlor){
    const localLight=lightAt(p.x,p.y);
    const gain=chlor*localLight*1.35*dt;
    p.energy+=gain;
    const photoBiomass=gain*(.14+Math.min(.06,chlor*.015));
    p.biomass+=photoBiomass;state.dna+=photoBiomass*.012;
    if(gain>.35)state.score+=gain*.12;
  }

  const filter=countPart('filter');
  if(filter){
    const rr=38+filter*18;
    for(let i=foods.length-1;i>=0;i--){
      const f=foods[i];if(f.type!=='plankton')continue;
      if(dist2(p,f)<rr*rr){consumeFood(i,1.65+filter*.32,'filter');}
    }
  }

  if(p.attached){
    const c=p.attached;
    if(!creatures.includes(c)||dist2(p,c)>Math.pow(p.radius+c.r+24,2)){p.attached=null}
    else if(countPart('parasite')){
      const organs=countPart('parasite');
      const gain=organs*1.05*dt;
      p.energy+=gain;
      p.biomass+=gain*.34;
      c.health-=gain*.72;
      state.dna+=gain*.018;state.score+=gain*.3;
      if(Math.random()<dt*.8)particles.push({x:p.x,y:p.y,vx:rand(24,-24),vy:rand(24,-24),life:.45,color:'#ff9fca'});
    }
  }

  p.pulseCd=Math.max(0,p.pulseCd-dt);p.biteCd=Math.max(0,p.biteCd-dt);
  p.feedAudioCd=Math.max(0,p.feedAudioCd-dt);p.hurtAudioCd=Math.max(0,p.hurtAudioCd-dt);
  p.feedFlash=Math.max(0,p.feedFlash-dt*2.4);p.divisionFx=Math.max(0,p.divisionFx-dt);
  p.energy=clamp(p.energy,0,135);
  if(p.energy<=0)p.health-=7*dt; else if(p.energy>75&&p.health<100)p.health+=.9*dt;
  p.health=clamp(p.health,0,100);
  if(p.health<=0)respawnPlayer();

  const growTarget=30+Math.min(24,Math.sqrt(Math.max(0,p.biomass))*2.1);
  p.radius=lerp(p.radius,growTarget,clamp(dt*.7,0,1));
}
function consumeFood(index,mult=1,why='primitive'){
  const f=foods[index],p=state.player;
  const base=f.type==='meat'?9:f.type==='nutrient'?6:4;
  let biomassScale=.42,dnaScale=.04,energyScale=1;
  if(why==='primitive'){biomassScale=.31;dnaScale=.026;energyScale=.75}
  else if(why==='filter'){biomassScale=.54;dnaScale=.032;energyScale=.92}
  else if(why==='pseudopod'){biomassScale=.45;dnaScale=.034;energyScale=.9}
  else if(why==='predatorLoose'){biomassScale=.25;dnaScale=.018;energyScale=.68}
  p.energy+=base*mult*energyScale;p.biomass+=base*biomassScale*mult;state.dna+=base*dnaScale*mult;state.score+=base*mult;p.feedFlash=.8;
  state.discovered.firstFood=1;
  if(p.feedAudioCd<=0){
    const rate=f.type==='meat'?.72:f.type==='nutrient'?.90:1.12;
    sound('eat',{volume:f.type==='meat'?.17:.12,rate,rateJitter:.045,cooldownMs:70});
    p.feedAudioCd=.075;
  }
  foods.splice(index,1);spawnFood();
  burst(f.x,f.y,f.type==='meat'?'#ff8eb0':'#b9ef78');
  if(why==='filter'&&!state.discovered.filter){state.discovered.filter=1;toast('여과섭식 성공! 작은 입자를 걸러 먹었어요.')}
}
function respawnPlayer(){
  state.player.health=100;state.player.energy=82;state.player.biomass*=.72;state.dna=Math.max(0,state.dna-4);
  state.player.x=WORLD.w/2;state.player.y=WORLD.h/2;sound('error',{volume:.18,rate:.78});toast('세포가 크게 손상되어 안전한 곳에서 다시 시작했어요. DNA 4를 잃었습니다.');
}

function updateFoods(dt){
  const flow=env.current/100*9;
  foods.forEach(f=>{
    f.phase+=dt;
    f.x=(f.x+Math.cos(f.phase*.3)*flow*dt+WORLD.w)%WORLD.w;
    f.y=(f.y+Math.sin(f.phase*.24)*flow*.5*dt+WORLD.h)%WORLD.h;
  });
  const p=state.player;
  const primitive=countPart('primitiveMouth'),predator=countPart('predatorMouth'),pseudo=countPart('pseudopod');
  if(primitive||predator||pseudo){
    for(let i=foods.length-1;i>=0;i--){
      const f=foods[i],rr=p.radius+f.r+4;
      if(dist2(p,f)>=rr*rr)continue;
      if(pseudo)consumeFood(i,1.05,'pseudopod');
      else if(predator&&(f.type==='meat'||f.type==='nutrient'))consumeFood(i,.72,'predatorLoose');
      else if(primitive&&(f.type==='plankton'||f.type==='nutrient'))consumeFood(i,.62,'primitive');
    }
  }
}
function nearestFood(c){
  let best=null,bd=Infinity;
  for(const f of foods){const d=dist2(c,f);if(d<bd){bd=d;best=f}}
  return best;
}
function scanCreatureRelations(c,idx){
  let danger=null,dangerD=Infinity,prey=null,preyD=Infinity,host=null,hostD=Infinity;
  for(let j=0;j<creatures.length;j++){
    if(j===idx)continue;
    const o=creatures[j];if(!o||o.health<=0)continue;
    const d=Math.sqrt(dist2(c,o));
    if(o.traits.diet==='hunter'&&o.r>c.r*1.16&&d<dangerD){danger=o;dangerD=d}
    if(c.traits.diet==='hunter'&&o.r<c.r*.76&&d<preyD){prey=o;preyD=d}
    if(c.traits.diet==='parasite'&&o.r>c.r*1.15&&d<hostD){host=o;hostD=d}
  }
  return {danger,dangerD,prey,preyD,host,hostD};
}
function respawnCreature(c,seed){
  const base=speciesTemplate(seed%6);
  const inherited=mutateTraits({...base,speed:(base.speed+c.traits.speed)/2,armor:(base.armor+c.traits.armor)/2,sense:(base.sense+c.traits.sense)/2},.1);
  let r=inherited.diet==='hunter'?rand(52,28):rand(41,18);
  Object.assign(c,{x:rand(WORLD.w),y:rand(WORLD.h),vx:0,vy:0,angle:rand(TAU),r,energy:100,health:100,traits:inherited,age:0,flash:0});
}
function updateCreatures(dt){
  const p=state.player;
  creatures.forEach((c,idx)=>{
    c.age+=dt;c.flash=Math.max(0,c.flash-dt);
    let tx=0,ty=0,goalStrength=1;
    const dp=Math.sqrt(dist2(c,p));
    const hunter=c.traits.diet==='hunter',parasite=c.traits.diet==='parasite';
    const rel=scanCreatureRelations(c,idx);
    const camouflage=countPart('camouflage'),still=Math.hypot(p.vx,p.vy)<12;
    const playerVisibility=camouflage?clamp((still?.42:.76)-Math.max(0,camouflage-1)*.09,.22,1):1;
    const see=190+c.traits.sense*120;

    if(rel.danger&&rel.dangerD<300+c.traits.sense*35){
      const v=directionVector(c,rel.danger);tx=-v.x;ty=-v.y;goalStrength=1.28;
    }else if(hunter&&rel.prey&&rel.preyD<see){
      const v=directionVector(c,rel.prey);tx=v.x;ty=v.y;goalStrength=1.16;
    }else if(parasite&&rel.host&&rel.hostD<see){
      const v=directionVector(c,rel.host);tx=v.x;ty=v.y;
    }else if(hunter&&c.r>p.radius*.9&&dp<see*1.15*playerVisibility){
      const v=directionVector(c,p);tx=v.x;ty=v.y;goalStrength=1.12;
    }else if(c.r<p.radius*.84&&dp<300){
      const v=directionVector(c,p);tx=-v.x;ty=-v.y;goalStrength=1.2;
    }else{
      const f=nearestFood(c);
      if(f){const v=directionVector(c,f);tx=v.x;ty=v.y}
      else{tx=Math.cos(c.angle);ty=Math.sin(c.angle)}
    }

    if(c.traits.photo>0&&lightAt(c.x,c.y)>.65){tx*=.28;ty*=.28;c.energy+=.5*dt}
    const desired=Math.atan2(ty,tx);
    c.angle+=clamp(angleDiff(desired,c.angle),-2.5*dt,2.5*dt);
    const sp=(38+c.traits.speed*46)/(1+c.traits.armor*.16)*goalStrength;
    c.vx=lerp(c.vx,Math.cos(c.angle)*sp,clamp(dt*3.2,0,1));c.vy=lerp(c.vy,Math.sin(c.angle)*sp,clamp(dt*3.2,0,1));
    c.x=(c.x+c.vx*dt+WORLD.w)%WORLD.w;c.y=(c.y+c.vy*dt+WORLD.h)%WORLD.h;

    const f=nearestFood(c);
    if(f&&dist2(c,f)<Math.pow(c.r+f.r,2)){const i=foods.indexOf(f);if(i>=0){foods.splice(i,1);spawnFood();c.energy+=8}}

    if(hunter&&rel.prey&&rel.preyD<c.r+rel.prey.r+5){
      rel.prey.health-=(15+Math.max(0,c.r-rel.prey.r)*.22)*dt;
      rel.prey.flash=.12;c.energy+=1.2*dt;
      if(rel.prey.health<=0){
        burst(rel.prey.x,rel.prey.y,'#aef18a');c.r=clamp(c.r+1.1,18,58);
        respawnCreature(rel.prey,rel.prey.species);
      }
    }

    const rr=c.r+p.radius,hit=dist2(c,p)<rr*rr;
    if(hit){
      if(hunter&&c.r>p.radius*.86){
        let dmg=(8+c.r*.1)*dt/(1+countPart('membrane')*.32);
        if(countPart('camouflage')&&Math.hypot(p.vx,p.vy)<12)dmg*=.45;
        p.health-=dmg;c.flash=.12;
        if(p.hurtAudioCd<=0){sound('hurt',{volume:.17,rate:.92,rateJitter:.07,cooldownMs:420});p.hurtAudioCd=.44}
        if(countPart('spike')){c.health-=countPart('spike')*2.5*dt;c.vx*=-.75;c.vy*=-.75}
      }
      if(countPart('predatorMouth')&&p.radius>c.r*.78&&p.biteCd<=0){
        const front=Math.abs(angleDiff(Math.atan2(wrappedDelta(c.y,p.y,WORLD.h),wrappedDelta(c.x,p.x,WORLD.w)),p.angle));
        if(front<1.05){c.health-=20+countPart('predatorMouth')*8;p.biteCd=.58;p.feedFlash=.55;sound('bite',{volume:.16,rate:.82,rateJitter:.06,cooldownMs:180});burst(c.x,c.y,'#ff889e')}
      }
      if(countPart('parasite')&&c.r>p.radius*.9&&!p.attached)p.attached=c;
    }
    if(c.health<=0){
      const sizeFactor=clamp((c.r-18)/34,0,1);
      const huntReward=1.35+sizeFactor*1.25;
      const biomassReward=8+sizeFactor*8;
      state.dna+=huntReward;state.score+=30+sizeFactor*20;p.energy+=15+sizeFactor*7;p.biomass+=biomassReward;p.feedFlash=.8;
      sound('reward',{volume:.15,rate:.78+Math.min(.3,huntReward*.08),rateJitter:.04,cooldownMs:160});
      burst(c.x,c.y,'#ff78a4');
      respawnCreature(c,idx%6);
      state.discovered.firstPrey=1;
      if(!state.discovered.predator){state.discovered.predator=1;toast('포식 성공! 작은 생물은 먹이가 되고, 큰 포식자는 반대로 나를 노립니다.')}
    }
    if(c.age>72){c.age=0;c.traits=mutateTraits(c.traits,.08)}
  });
}
function mutateTraits(t,amount=.15){
  const n={...t};n.speed=clamp(n.speed+rand(amount,-amount),.35,1.8);n.armor=clamp(n.armor+rand(amount,-amount),.25,1.8);n.sense=clamp(n.sense+rand(amount,-amount),.3,1.9);
  if(Math.random()<.09)n.toxin=clamp(n.toxin+rand(.25,0),0,1.2);
  return n;
}

function burst(x,y,color){
  for(let i=0;i<8;i++)particles.push({x,y,vx:rand(65,-65),vy:rand(65,-65),life:rand(.7,.35),color});
}
function updateParticles(dt){
  particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;q.vx*=.96;q.vy*=.96});
  particles=particles.filter(q=>q.life>0);
  ripples.forEach(q=>{q.r+=55*dt;q.life-=dt});ripples=ripples.filter(q=>q.life>0);
}

const EVENTS=[
  {id:'rain',icon:'🌧️',title:'폭우',desc:'잠시 영양분과 물살이 크게 늘어납니다.',duration:18,delta:{food:18,current:24}},
  {id:'sun',icon:'☀️',title:'강한 햇빛',desc:'한동안 빛과 수온이 상승합니다.',duration:20,delta:{light:22,temp:13}},
  {id:'murk',icon:'🌫️',title:'탁도 증가',desc:'부유물이 퍼져 잠시 빛이 줄고 시야가 나빠집니다.',duration:18,delta:{turbidity:25,light:-16}},
  {id:'oxygen',icon:'🫧',title:'산소 증가',desc:'일시적으로 물속 산소가 풍부해집니다.',duration:20,delta:{oxygen:20}},
  {id:'evaporate',icon:'🧂',title:'증발',desc:'잠시 물이 농축되어 염도가 높아지고 먹이가 줄어듭니다.',duration:18,delta:{salt:19,food:-8}},
  {id:'bloom',icon:'🌱',title:'플랑크톤 번성',desc:'짧은 시간 플랑크톤 군집이 폭발적으로 늘어납니다.',duration:22,delta:{food:22},burst(){for(let i=0;i<24;i++)spawnFood('plankton')}}
];
function triggerEvent(){
  const e=pick(EVENTS);state.activeEvent=e.id;eventDelta={...e.delta};eventDuration=e.duration||18;state.activeEventLife=eventDuration;e.burst?.();updateEnvironment(0);
  if(e.id==='rain')sound('dash',{volume:.10,rate:.66});
  else if(e.id==='bloom')sound('eat',{volume:.12,rate:1.18});
  else sound('event',{volume:.16,rate:e.id==='sun'?1.12:e.id==='murk'?.86:1});
  $('eventIcon').textContent=e.icon;$('eventTitle').textContent=e.title;$('eventDesc').textContent=e.desc;
  $('eventBanner').classList.remove('hidden');clearTimeout(eventTimer);eventTimer=setTimeout(()=>$('eventBanner').classList.add('hidden'),4000);
  refreshEnvBars();
}
function advanceGeneration(){
  state.generation++;state.reproductions++;state.generationClock=0;state.dna+=2;state.score+=75;
  const p=state.player;
  p.biomass=0;p.energy=clamp(p.energy-18,62,100);p.health=100;p.radius=30;p.divisionFx=1.5;p.attached=null;
  creatures.forEach((c,i)=>{
    const pressure=(env.current>65?.08:0)+(env.food<40?.06:0)+(env.turbidity>65?.05:0);
    c.traits=mutateTraits(c.traits,.1+pressure);c.traits.gen=state.generation;
    if(env.current>65)c.traits.speed=clamp(c.traits.speed+.06,.3,2);
    if(env.food<40)c.traits.sense=clamp(c.traits.sense+.06,.3,2);
    if(state.discovered.predator&&c.r<34)c.traits.armor=clamp(c.traits.armor+.035,.25,2);
  });
  burst(p.x,p.y,'#d6ff9a');ripples.push({x:p.x,y:p.y,r:10,life:1.8});
  toast('🧬 '+state.generation+'세대 탄생! DNA +2 · 환경은 시간이 지나면 평상 상태로 돌아갑니다.');
  sound('generation',{volume:.28,rate:1.03});setTimeout(()=>sound('reward',{volume:.11,rate:.84}),70);save();
}
function updateMissions(){
  const m=state.mission;
  if(m===0&&canReproduce()){state.mission=1;sound('confirm',{volume:.24,rate:1.12});toast('충분히 성장했어요! 이제 번식 · 진화로 다음 세대를 만들어 보세요.')}
  else if(m===1&&state.generation>=2){state.mission=2;state.dna+=1;toast('첫 번식 성공! DNA +1 · 다음 세대에는 감각기관도 시험해 보세요.')}
  else if(m===2&&(countPart('eyespot')+countPart('chemo')+countPart('mechano')+countPart('tactile'))>0){state.mission=3;state.dna+=1;toast('감각기관 획득! 환경을 읽는 방법이 달라졌어요. DNA +1')}
  else if(m===3&&classifyNiche().name!=='초기 미생물'){state.mission=4;state.dna+=2;toast('새 생태적 지위를 만들었어요! DNA +2')}
}
function missionText(){
  if(state.mission===0)return ['먹고 성장하기','먹이와 사냥으로 생체량을 모아 번식할 준비를 하세요.'];
  if(state.mission===1)return ['첫 번식','아래 번식 · 진화 버튼으로 자손의 몸을 설계하세요.'];
  if(state.mission===2)return ['새 감각 시험하기','다음 번식에서 광수용기·화학수용체 같은 감각기관을 달아 보세요.'];
  if(state.mission===3)return ['나만의 생존 전략','기관을 조합해 뚜렷한 생태적 지위를 만들어 보세요.'];
  return ['자유 진화','먹고, 번식하고, 환경과 다른 종의 변화에 맞춰 계통을 이어가세요.'];
}
function classifyNiche(){
  const c=t=>countPart(t),scores=[
    {name:'추격형 포식자',desc:'빠른 이동으로 다른 생물을 쫓아가 잡아먹어요.',s:c('predatorMouth')*3+c('flagellum')*2+c('eyespot')+c('mechano')},
    {name:'여과섭식자',desc:'물속의 작은 먹이 입자를 끊임없이 걸러 먹어요.',s:c('filter')*4+c('cilia')*1.5},
    {name:'매복 포식자',desc:'가만히 숨어 진동을 느끼고 가까운 먹이를 기습해요.',s:c('predatorMouth')*2+c('spike')+c('camouflage')*3+c('mechano')*2},
    {name:'방어형 부착생물',desc:'흐름에 붙어 버티며 단단한 몸으로 공격을 견뎌요.',s:c('membrane')*2.5+c('anchor')*3+c('spike')},
    {name:'광합성 유영생물',desc:'빛을 찾아 이동하며 스스로 에너지를 만들어요.',s:c('chloroplast')*3+c('eyespot')*2+c('flagellum')},
    {name:'숙주 추적 기생생물',desc:'화학 신호를 따라 숙주를 찾고 달라붙어 영양을 얻어요.',s:c('parasite')*5+c('chemo')*2},
    {name:'감각 특화 탐색자',desc:'여러 감각기관으로 넓은 범위를 탐색해요.',s:c('eyespot')+c('chemo')+c('mechano')+c('tactile')+c('electro')*2}
  ];
  scores.sort((a,b)=>b.s-a.s);return scores[0].s>=6?scores[0]:{name:'초기 미생물',desc:'아직 뚜렷한 생활 방식이 없어요.'};
}

function update(dt){
  if(paused)return;
  state.survival+=dt;state.generationClock+=dt;state.eventClock+=dt;
  updateEnvironment(dt);
  updatePlayer(dt);updateFoods(dt);updateCreatures(dt);updateParticles(dt);updateMissions();
  if(state.eventClock>=45){state.eventClock=0;triggerEvent()}
  if(Math.random()<dt*.5&&foods.length<112)spawnFood();
  if(Math.random()<dt*.18&&countPart('mechano')){const source=pick(creatures);if(source)ripples.push({x:source.x,y:source.y,r:5,life:1});}
  if(state.survival-senseTimer>.15){senseTimer=state.survival;updateSenseOverlay()}
  refreshHud(false);
}

function drawBackground(){
  const g=ctx.createLinearGradient(0,0,viewW,viewH);g.addColorStop(0,selectedBiome.color[0]);g.addColorStop(1,selectedBiome.color[1]);ctx.fillStyle=g;ctx.fillRect(0,0,viewW,viewH);

  if(selectedBiome.id==='deep'){
    const vignette=ctx.createRadialGradient(viewW/2,viewH/2,40,viewW/2,viewH/2,Math.max(viewW,viewH)*.66);
    vignette.addColorStop(0,'rgba(4,23,48,.02)');vignette.addColorStop(1,'rgba(0,3,15,.52)');ctx.fillStyle=vignette;ctx.fillRect(0,0,viewW,viewH);
  }else if(selectedBiome.id==='vent'){
    const hot=ctx.createRadialGradient(viewW*.55,viewH*.82,0,viewW*.55,viewH*.82,viewH*.62);
    hot.addColorStop(0,'rgba(255,104,54,.13)');hot.addColorStop(1,'rgba(255,104,54,0)');ctx.fillStyle=hot;ctx.fillRect(0,0,viewW,viewH);
  }else if(selectedBiome.id==='ice'){
    ctx.fillStyle='rgba(188,232,255,.06)';ctx.fillRect(0,0,viewW,viewH);
  }else if(selectedBiome.id==='swamp'){
    ctx.fillStyle='rgba(79,87,33,.08)';ctx.fillRect(0,0,viewW,viewH);
  }

  ctx.globalAlpha=.16;
  for(let i=0;i<34;i++){
    const speed=state.activeEvent==='rain'?18:5;
    const x=(i*179+state.survival*speed)%(viewW+120)-60,y=(i*83+Math.sin(i)*30)%viewH;
    ctx.beginPath();ctx.arc(x,y,2+(i%4),0,TAU);ctx.fillStyle=selectedBiome.id==='deep'?'#5bd9ef':'#dffeff';ctx.fill();
  }
  ctx.globalAlpha=1;

  if(state.activeEvent==='rain'){
    ctx.strokeStyle='rgba(168,226,240,.22)';ctx.lineWidth=1.5;
    for(let i=0;i<28;i++){const x=(i*83+state.survival*170)%viewW,y=(i*47+state.survival*90)%viewH;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+42,y+9);ctx.stroke()}
  }else if(state.activeEvent==='sun'){
    ctx.fillStyle='rgba(255,244,145,.07)';ctx.fillRect(0,0,viewW,viewH);
  }else if(state.activeEvent==='murk'){
    ctx.fillStyle='rgba(79,92,57,.16)';ctx.fillRect(0,0,viewW,viewH);
  }else if(state.activeEvent==='evaporate'){
    ctx.strokeStyle='rgba(255,224,184,.11)';for(let y=20;y<viewH;y+=28){ctx.beginPath();ctx.moveTo(0,y+Math.sin(state.survival*2+y)*4);ctx.lineTo(viewW,y);ctx.stroke()}
  }else if(state.activeEvent==='oxygen'){
    ctx.strokeStyle='rgba(202,247,255,.3)';for(let i=0;i<24;i++){const x=(i*97)%viewW,y=(viewH-((state.survival*34+i*61)%(viewH+40)));ctx.beginPath();ctx.arc(x,y,2+(i%4),0,TAU);ctx.stroke()}
  }else if(state.activeEvent==='bloom'){
    ctx.fillStyle='rgba(170,239,116,.2)';for(let i=0;i<46;i++){const x=(i*71+state.survival*5)%viewW,y=(i*43+Math.sin(i)*22)%viewH;ctx.beginPath();ctx.arc(x,y,2+(i%3),0,TAU);ctx.fill()}
  }
}
function drawBiomeScenery(){
  biomeProps.forEach(q=>{
    const p=worldToScreen(q.x,q.y),z=CAMERA_ZOOM,sz=q.size*z;
    if(p.x<-80||p.x>viewW+80||p.y<-80||p.y>viewH+80)return;
    ctx.save();ctx.translate(p.x,p.y);const wave=Math.sin(state.survival*1.8+q.phase);
    if(q.type==='plant'||q.type==='kelp'||q.type==='reed'){
      ctx.strokeStyle=q.type==='reed'?'rgba(177,190,102,.42)':'rgba(92,205,145,.42)';ctx.lineWidth=Math.max(2,sz*.1);ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(0,sz*.55);ctx.quadraticCurveTo(wave*sz*.18,0,wave*sz*.26,-sz*.65);ctx.stroke();
      if(q.type!=='reed'){ctx.fillStyle='rgba(112,224,157,.26)';ctx.beginPath();ctx.ellipse(wave*sz*.18,-sz*.18,sz*.26,sz*.09,wave*.3,0,TAU);ctx.fill()}
    }else if(q.type==='bubble'){
      ctx.strokeStyle='rgba(196,242,255,.23)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-((state.survival*9+q.phase*13)%(sz*2)),Math.max(2,sz*.14),0,TAU);ctx.stroke();
    }else if(q.type==='leaf'||q.type==='debris'||q.type==='murk'){
      ctx.fillStyle=q.type==='leaf'?'rgba(147,195,92,.24)':'rgba(163,137,91,.2)';ctx.beginPath();ctx.ellipse(0,0,sz*.5,sz*.17,q.phase+wave*.08,0,TAU);ctx.fill();
    }else if(q.type==='glow'){
      const rg=ctx.createRadialGradient(0,0,0,0,0,sz);rg.addColorStop(0,'rgba(94,239,255,.38)');rg.addColorStop(1,'rgba(94,239,255,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(0,0,sz,0,TAU);ctx.fill();
      ctx.fillStyle='rgba(190,255,255,.65)';ctx.beginPath();ctx.arc(0,0,Math.max(2,sz*.08),0,TAU);ctx.fill();
    }else if(q.type==='rock'||q.type==='sand'||q.type==='salt'){
      ctx.fillStyle=q.type==='sand'?'rgba(225,210,153,.13)':q.type==='salt'?'rgba(233,238,255,.17)':'rgba(119,139,146,.2)';
      ctx.beginPath();ctx.ellipse(0,0,sz*.65,sz*.34,q.phase,0,TAU);ctx.fill();
    }else if(q.type==='vent'){
      ctx.fillStyle='rgba(67,66,66,.5)';ctx.beginPath();ctx.moveTo(-sz*.35,sz*.55);ctx.lineTo(-sz*.18,-sz*.5);ctx.lineTo(sz*.18,-sz*.62);ctx.lineTo(sz*.38,sz*.55);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(255,124,73,.18)';ctx.beginPath();ctx.arc(0,-sz*.62,sz*.28+wave*2,0,TAU);ctx.fill();
    }else if(q.type==='plume'){
      ctx.fillStyle='rgba(214,202,180,.08)';for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(wave*sz*.2,-k*sz*.3,sz*(.24+k*.08),0,TAU);ctx.fill()}
    }else if(q.type==='ice'||q.type==='crystal'){
      ctx.fillStyle=q.type==='ice'?'rgba(187,236,255,.23)':'rgba(241,247,255,.28)';ctx.beginPath();ctx.moveTo(0,-sz*.7);ctx.lineTo(sz*.38,0);ctx.lineTo(0,sz*.55);ctx.lineTo(-sz*.35,0);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  });
}
function drawPatches(){
  const sense=state.player?lightSenseData(state.player):{eyes:0,target:null};
  lightPatches.forEach(q=>{const p=worldToScreen(q.x,q.y),vr=q.r*CAMERA_ZOOM;if(p.x<-vr||p.x>viewW+vr||p.y<-vr||p.y>viewH+vr)return;
    const sensoryBoost=sense.eyes?Math.min(.16,sense.eyes*.055):0;
    const alpha=q.strength*(.12+sensoryBoost)*env.light/100;
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,vr);g.addColorStop(0,'rgba(244,255,166,'+alpha+')');g.addColorStop(1,'rgba(244,255,166,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,vr,0,TAU);ctx.fill();
    if(sense.eyes>=2&&q===sense.target){
      ctx.save();ctx.strokeStyle='rgba(239,255,133,.3)';ctx.lineWidth=2;ctx.setLineDash([7,9]);ctx.beginPath();ctx.arc(p.x,p.y,vr*.72,0,TAU);ctx.stroke();ctx.restore();
    }
  });
}
function drawFoodClusters(){
  foodClusters.forEach(c=>{
    const p=worldToScreen(c.x,c.y),vr=c.r*CAMERA_ZOOM;
    if(p.x<-vr||p.x>viewW+vr||p.y<-vr||p.y>viewH+vr)return;
    const color=c.type==='plankton'?'168,237,123':c.type==='nutrient'?'255,224,138':'255,140,167';
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,vr);
    g.addColorStop(0,'rgba('+color+','+(0.035*c.strength)+')');g.addColorStop(.65,'rgba('+color+','+(0.018*c.strength)+')');g.addColorStop(1,'rgba('+color+',0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,vr,0,TAU);ctx.fill();
  });
}
function drawFoods(){
  foods.forEach(f=>{
    const p=worldToScreen(f.x,f.y);if(p.x<-28||p.x>viewW+28||p.y<-28||p.y>viewH+28)return;
    const pulse=1+Math.sin(state.survival*3+f.phase)*.12,r=f.r*CAMERA_ZOOM*pulse;
    ctx.save();ctx.globalAlpha=.9;ctx.shadowBlur=8;ctx.shadowColor=f.type==='meat'?'#ff8ca7':f.type==='nutrient'?'#ffe08a':'#a8ed7b';
    ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fillStyle=f.type==='meat'?'#ff8ca7':f.type==='nutrient'?'#ffe08a':'#a8ed7b';ctx.fill();
    if(f.type==='plankton'){ctx.globalAlpha=.38;ctx.beginPath();ctx.arc(p.x+Math.cos(f.phase)*r*1.6,p.y+Math.sin(f.phase)*r*1.6,r*.45,0,TAU);ctx.fill()}
    ctx.restore();
  });
}
function drawOrganism(x,y,r,angle,slots,inside,isPlayer=false,flash=0,tint=null){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  const camo=(inside&&inside.camouflage)||0,armor=(inside&&inside.membrane)||0;
  ctx.globalAlpha=isPlayer?1:clamp(.9-camo*.12,.52,.92);
  const colors=tint||{hi:'#73cfe8',mid:'#2b829e',lo:'#124f62'};
  const body=ctx.createRadialGradient(-r*.25,-r*.25,r*.08,0,0,r);body.addColorStop(0,isPlayer?'#8cffe9':colors.hi);body.addColorStop(.58,isPlayer?'#29b5a7':colors.mid);body.addColorStop(1,flash>0?'#fff':isPlayer?'#0c6570':colors.lo);
  if(isPlayer){ctx.shadowBlur=22;ctx.shadowColor='rgba(95,255,229,.55)'}
  ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,0,r*1.08,r*.9,0,0,TAU);ctx.fill();
  ctx.lineWidth=2+armor*1.6;ctx.strokeStyle=armor?'rgba(202,247,255,.75)':'rgba(255,255,255,.22)';ctx.stroke();
  if(inside&&inside.chloroplast){ctx.fillStyle='#8ce66a';ctx.shadowBlur=10;ctx.shadowColor='#8ce66a';for(let i=0;i<inside.chloroplast*2;i++){const a=i*2.4+state.survival*.08;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.42,Math.sin(a)*r*.35,Math.max(4,r*.1),Math.max(3,r*.06),a,0,TAU);ctx.fill()}ctx.shadowBlur=0}
  ctx.fillStyle=isPlayer?'#c26ea8':'#7165aa';ctx.beginPath();ctx.arc(-r*.08,2,r*.28,0,TAU);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=2;ctx.stroke();

  (slots||[]).forEach((type,i)=>{
    if(!type)return;const a=externalAngle(i),px=Math.cos(a)*r*.96,py=Math.sin(a)*r*.82;ctx.save();ctx.translate(px,py);ctx.rotate(a);
    drawPart(type,r,isPlayer);ctx.restore();
  });
  ctx.restore();
}
function drawPart(type,r,isPlayer){
  const k=clamp(r/30,.75,2.35),t=state.survival;
  ctx.lineCap='round';ctx.lineJoin='round';
  if(type==='flagellum'){
    ctx.strokeStyle=isPlayer?'#8effef':'#8bd8ee';ctx.lineWidth=3.2*k;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(12*k,Math.sin(t*7)*5*k,27*k,-10*k,43*k+Math.sin(t*8)*6*k,Math.cos(t*8)*5*k);ctx.stroke();
  }else if(type==='cilia'||type==='tactile'){
    ctx.strokeStyle=type==='tactile'?'#ffe492':'#b6fff5';ctx.lineWidth=1.5*k;for(let j=-1;j<=1;j++){ctx.beginPath();ctx.moveTo(0,j*4*k);ctx.lineTo((14+Math.sin(t*11+j)*3)*k,j*6*k);ctx.stroke()}
  }else if(type==='pseudopod'){
    const stretch=(1.05+Math.sin(t*4)*.18)*k;ctx.fillStyle='#49b8a8';ctx.beginPath();ctx.ellipse(12*k*stretch,0,18*k*stretch,7*k,0,0,TAU);ctx.fill();
  }else if(type==='anchor'){
    ctx.strokeStyle='#c8e4e8';ctx.lineWidth=3*k;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(18*k,0);ctx.lineTo(13*k,-7*k);ctx.moveTo(18*k,0);ctx.lineTo(13*k,7*k);ctx.stroke();
  }else if(type==='primitiveMouth'){
    ctx.strokeStyle='rgba(226,255,242,.9)';ctx.lineWidth=2*k;ctx.beginPath();ctx.arc(7*k,0,6*k,-1.15,1.15);ctx.stroke();
    ctx.fillStyle='rgba(185,239,120,.38)';ctx.beginPath();ctx.arc(13*k,0,(2.2+Math.sin(t*5)*.6)*k,0,TAU);ctx.fill();
  }else if(type==='predatorMouth'){
    const gape=(8+Math.sin(t*7)*3)*k;ctx.fillStyle='#fff2df';ctx.beginPath();ctx.moveTo(0,-gape);ctx.lineTo(18*k,-3*k);ctx.lineTo(5*k,0);ctx.lineTo(18*k,7*k);ctx.lineTo(0,gape);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(100,35,50,.45)';ctx.lineWidth=1.2*k;ctx.beginPath();ctx.moveTo(4*k,0);ctx.lineTo(17*k,0);ctx.stroke();
  }else if(type==='filter'){
    ctx.strokeStyle='#d5ffb1';ctx.lineWidth=1.5*k;for(let j=-2;j<=2;j++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo((18+Math.sin(t*6+j)*2)*k,j*4.5*k);ctx.stroke()}
  }else if(type==='parasite'){
    ctx.strokeStyle='#ffb2cd';ctx.lineWidth=3*k;ctx.beginPath();ctx.arc(9*k,0,(8+Math.sin(t*5)*1.5)*k,-1.3,1.3);ctx.stroke();
  }else if(type==='spike'){
    ctx.fillStyle='#d8fbff';ctx.beginPath();ctx.moveTo(0,-5*k);ctx.lineTo(22*k,0);ctx.lineTo(0,5*k);ctx.closePath();ctx.fill();
  }else if(type==='eyespot'){
    ctx.shadowBlur=8*k;ctx.shadowColor='#eaff7a';ctx.fillStyle='#eaff7a';ctx.beginPath();ctx.arc(6*k,0,5*k,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#153b42';ctx.beginPath();ctx.arc(8*k,0,2.2*k,0,TAU);ctx.fill();
  }else if(type==='chemo'){
    ctx.fillStyle='#9af6ff';for(let j=0;j<3;j++){ctx.globalAlpha=.65+.25*Math.sin(t*4+j);ctx.beginPath();ctx.arc((4+j*5)*k,(j-1)*3.5*k,2.5*k,0,TAU);ctx.fill()}ctx.globalAlpha=1;
  }else if(type==='mechano'){
    ctx.strokeStyle='#ffdda3';ctx.lineWidth=1.6*k;ctx.beginPath();ctx.arc(4*k,0,7*k,-1.1,1.1);ctx.arc(8*k,0,12*k,-1.1,1.1);ctx.stroke();
  }else if(type==='electro'){
    ctx.strokeStyle='#fff47d';ctx.lineWidth=2.4*k;ctx.beginPath();ctx.moveTo(0,-5*k);ctx.lineTo(6*k,0);ctx.lineTo(2*k,4*k);ctx.lineTo(14*k,2*k);ctx.stroke();
  }
}
function creatureSlots(c){
  const slots=Array(12).fill(null),diet=c.traits.diet;
  if(diet==='hunter'){slots[0]='predatorMouth';slots[6]='flagellum';if(c.traits.speed>1.02)slots[5]='flagellum';if(c.traits.speed>1.32)slots[7]='flagellum'}
  if(diet==='filter'){slots[0]='filter';slots[1]='filter';slots[6]='cilia';slots[7]='cilia';if(c.traits.filter>1)slots[11]='filter'}
  if(diet==='parasite'){slots[0]='parasite';slots[6]='flagellum';slots[5]='chemo'}
  if(diet==='photo'){slots[5]='eyespot';slots[6]='flagellum';if(c.traits.sense>1.05)slots[11]='eyespot'}
  if(diet==='grazer'){slots[0]='pseudopod';slots[6]='cilia'}
  if(c.traits.sense>1.08&&!slots[11])slots[11]='mechano';
  if(c.traits.armor>1.0)slots[3]='spike';
  if(c.traits.armor>1.35)slots[9]='spike';
  return slots;
}
function creatureTint(c){
  if(c.traits.diet==='hunter')return {hi:'#ff9aa7',mid:'#b84d68',lo:'#63273e'};
  if(c.traits.diet==='photo')return {hi:'#b6f28a',mid:'#5eac67',lo:'#2f6247'};
  if(c.traits.diet==='filter')return {hi:'#9ce9ff',mid:'#4f9bc0',lo:'#27516d'};
  if(c.traits.diet==='parasite')return {hi:'#ffafd6',mid:'#af6494',lo:'#5e365d'};
  if(c.traits.diet==='scavenger')return {hi:'#ffe198',mid:'#b79754',lo:'#68512c'};
  return {hi:'#a2e6dd',mid:'#4faaa2',lo:'#285e66'};
}
function drawCreatures(){
  const player=state.player;
  creatures.forEach(c=>{
    const p=worldToScreen(c.x,c.y),vr=c.r*CAMERA_ZOOM;
    if(p.x<-100||p.x>viewW+100||p.y<-100||p.y>viewH+100)return;
    const prey=c.r<player.radius*.78;
    const danger=c.traits.diet==='hunter'&&c.r>player.radius*.92;
    if(prey||danger){
      ctx.save();
      ctx.strokeStyle=prey?'rgba(185,239,120,.32)':'rgba(255,108,125,.48)';
      ctx.lineWidth=danger?3:2;
      ctx.setLineDash(danger?[6,6]:[3,7]);
      ctx.beginPath();ctx.arc(p.x,p.y,vr+9,0,TAU);ctx.stroke();ctx.restore();
    }
    const inside={chloroplast:c.traits.photo?2:0,membrane:c.traits.armor>1.25?1:0,camouflage:0};
    drawOrganism(p.x,p.y,vr,c.angle,creatureSlots(c),inside,false,c.flash,creatureTint(c));
    if(danger&&Math.sqrt(dist2(c,player))<320){
      ctx.save();ctx.fillStyle='rgba(255,133,147,.9)';ctx.font='900 12px system-ui';ctx.textAlign='center';
      ctx.fillText('!',p.x,p.y-vr-14);ctx.restore();
    }
  });
}
function drawPlayer(){
  const p=state.player,vr=p.radius*CAMERA_ZOOM;
  ctx.save();
  const halo=ctx.createRadialGradient(viewW/2,viewH/2,vr*.5,viewW/2,viewH/2,vr*2.25);
  halo.addColorStop(0,'rgba(83,255,224,.14)');halo.addColorStop(1,'rgba(83,255,224,0)');
  ctx.fillStyle=halo;ctx.beginPath();ctx.arc(viewW/2,viewH/2,vr*2.25,0,TAU);ctx.fill();
  if(p.divisionFx>0){ctx.strokeStyle='rgba(220,255,151,'+clamp(p.divisionFx/1.5,0,1)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(viewW/2,viewH/2,vr+(1.5-p.divisionFx)*70,0,TAU);ctx.stroke()}
  ctx.restore();

  drawOrganism(viewW/2,viewH/2,vr,p.angle,p.slots,p.inside,true,p.feedFlash,null);
  const range=movementStats(p).sense*CAMERA_ZOOM;ctx.strokeStyle='rgba(102,245,231,.07)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(viewW/2,viewH/2,Math.min(range,360),0,TAU);ctx.stroke();

  if(countPart('filter')){
    ctx.save();ctx.fillStyle='rgba(207,255,177,.48)';
    for(let i=0;i<8;i++){const a=i*.79+state.survival*.35,d=vr+18+(i%3)*8;ctx.beginPath();ctx.arc(viewW/2+Math.cos(a)*d,viewH/2+Math.sin(a)*d,2+(i%2),0,TAU);ctx.fill()}
    ctx.restore();
  }
  if(p.attached){ctx.strokeStyle='rgba(255,153,190,.55)';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();const q=worldToScreen(p.attached.x,p.attached.y);ctx.moveTo(viewW/2,viewH/2);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.setLineDash([])}
  ctx.save();ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(226,255,250,.74)';ctx.fillText('나',viewW/2,viewH/2-vr-12);ctx.restore();
}
function drawEffects(){
  particles.forEach(q=>{const p=worldToScreen(q.x,q.y);ctx.globalAlpha=clamp(q.life*2,0,1);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(p.x,p.y,3*CAMERA_ZOOM,0,TAU);ctx.fill()});ctx.globalAlpha=1;
  ripples.forEach(q=>{const p=worldToScreen(q.x,q.y);ctx.globalAlpha=q.life;ctx.strokeStyle='#ffd99b';ctx.beginPath();ctx.arc(p.x,p.y,q.r*CAMERA_ZOOM,0,TAU);ctx.stroke()});ctx.globalAlpha=1;
}
function render(){
  if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);drawBackground();drawBiomeScenery();drawPatches();drawFoodClusters();drawFoods();drawCreatures();drawEffects();drawPlayer();
}
function loop(ts){
  if(!running)return;
  if(viewW<10||viewH<10||canvas.width<10||canvas.height<10){resize();last=ts;raf=requestAnimationFrame(loop);return}
  const dt=Math.min(.034,(ts-last)/1000||0);last=ts;update(dt);render();raf=requestAnimationFrame(loop);
}

function refreshEnvBars(){
  const labels={light:'평균빛',temp:'온도',oxygen:'산소',salt:'염도',food:'먹이',current:'물살'};
  $('envBars').innerHTML=Object.entries(labels).map(([k,n])=>'<div class="env-row"><span>'+n+'</span><div class="bar"><i style="width:'+env[k]+'%"></i></div><b>'+Math.round(env[k])+'</b></div>').join('');
}
function updateLightSensor(){
  const box=$('lightSensor');if(!box||!state.player)return;
  const sense=lightSenseData(state.player);
  if(!sense.eyes){box.classList.add('hidden');return}
  box.classList.remove('hidden');
  $('eyeCountText').textContent='×'+sense.eyes;
  $('localLightFill').style.width=sense.percent+'%';
  if(sense.eyes===1){
    $('localLightLevel').textContent=sense.label;
    $('localLightLabel').textContent='현재 밝기';
    $('lightDirectionArrow').textContent='?';
    $('lightDirectionText').textContent='광수용기 하나로는 밝은 방향 비교가 어려워요';
  }else{
    $('localLightLevel').textContent=sense.percent+'%';
    $('localLightLabel').textContent=sense.label+' · 현재 위치';
    $('lightDirectionArrow').textContent=sense.arrow;
    if(sense.target){
      const extra=sense.eyes>=3?' · 약 '+Math.round(sense.distance/50)*50+' 거리':'';
      $('lightDirectionText').textContent=sense.arrow+' 쪽이 더 밝아요'+extra;
    }else{
      $('lightDirectionText').textContent='주변 광량이 비슷해 뚜렷한 방향이 없어요';
    }
  }
}
function updateStarterGuide(){
  const box=$('starterGuide');if(!box||!state.player)return;
  const step=$('starterStep'),title=$('starterTitle'),textEl=$('starterText'),hint=$('starterHint');
  const grow=Math.round(reproductionProgress()*100);
  box.classList.remove('done');
  if(!state.discovered.firstFood){
    step.textContent='1';title.textContent='반짝이는 먹이부터 먹어 보세요';
    textEl.textContent='WASD·방향키·마우스로 움직여 가까운 영양 입자 군집을 찾아보세요. 가운데의 “나”가 내 세포예요.';
    hint.textContent='처음의 원시 섭식구는 약해요. 번식 후 포식·여과·광합성·기생 중 하나를 전문화하면 훨씬 빨리 성장합니다.';
  }else if(!canReproduce()){
    step.textContent='2';title.textContent='먹으면서 성장하세요 · '+grow+'%';
    textEl.textContent='지금은 원시 섭식 단계예요. 먹이 군집을 찾아 성장하고 다음 세대에 전문 섭식기관을 선택하세요.';
    hint.textContent='DNA는 장기 진화 자원이에요. 한 세대에 다 쓰기보다 여러 세대 동안 모아 큰 기관을 노려도 돼요.';
  }else if(state.generation===1){
    step.textContent='3';title.textContent='번식 준비 완료!';
    textEl.textContent='아래에서 빛나는 “번식 · 진화” 버튼을 눌러 다음 세대의 몸을 설계하세요.';
    hint.textContent='편모·감각기관·방어기관을 고르면 다음 세대의 생활 방식이 달라져요.';
  }else{
    step.textContent='✓';title.textContent=state.generation+'세대 생존 중';
    textEl.textContent='먹기 → 성장 → 번식 · 진화를 반복하며 환경 변화에 맞춰 계통을 이어가세요.';
    hint.textContent='작은 생물은 먹이, 큰 포식자는 위험. 환경에 따라 유리한 기관이 달라집니다.';
    box.classList.add('done');
  }
}
function refreshHud(force){
  if(!state.player)return;
  const grow=Math.round(reproductionProgress()*100),req=reproductionRequirement(),ready=canReproduce();
  $('biomeIcon').textContent=selectedBiome.icon;$('biomeName').textContent=selectedBiome.name;$('generationText').textContent=state.generation+'세대 · 성장 '+grow+'%';
  $('dnaText').textContent=Math.floor(state.dna);$('energyText').textContent=Math.round(state.player.energy);$('healthText').textContent=Math.round(state.player.health);
  const n=classifyNiche();$('nicheName').textContent=n.name;$('nicheDesc').textContent=n.desc;
  const m=missionText();$('missionTitle').textContent=m[0];$('missionDesc').textContent=m[1];
  const btn=$('editorBtn');if(btn){btn.classList.toggle('ready',ready);$('editorBtnLabel').textContent=ready?'번식 · 진화':'성장 중';$('editorBtnSub').textContent=ready?'다음 세대 만들기':'생체량 '+Math.floor(state.player.biomass)+'/'+req+' · 에너지 78+'}
  updateStarterGuide();
  if(force){refreshEnvBars();updateLightSensor();}
}
function updateSenseOverlay(){
  const el=$('senseOverlay');if(!state.player){el.innerHTML='';return}
  updateLightSensor();
  let html='',p=state.player,range=movementStats(p).sense;
  if(!state.discovered.firstFood){
    let target=null,bd=Infinity;
    for(const c of foodClusters){const d=dist2(p,c);if(d<bd){bd=d;target=c}}
    if(!target){for(const f of foods){const d=dist2(p,f);if(d<bd){bd=d;target=f}}}
    if(target){
      const dx=wrappedDelta(target.x,p.x,WORLD.w),dy=wrappedDelta(target.y,p.y,WORLD.h),a=Math.atan2(dy,dx);
      const lx=viewW/2+Math.cos(a)*100,ly=viewH/2+Math.sin(a)*100;
      html+='<div class="sense-arrow" style="width:88px;height:5px;transform:translate(-4px,-2px) rotate('+a+'rad);background:linear-gradient(90deg,rgba(185,239,120,.98),transparent)"></div>';
      html+='<span class="sense-label" style="left:'+lx+'px;top:'+ly+'px;color:#eaffad;border-color:rgba(185,239,120,.4)">첫 먹이</span>';
    }
  }
  if(countPart('chemo')){
    let target=null,bd=Infinity;for(const f of foods){const d=dist2(p,f);if(d<bd){bd=d;target=f}}
    if(target&&Math.sqrt(bd)<range*2.1){const a=Math.atan2(target.y-p.y,target.x-p.x);html+='<div class="sense-arrow" style="transform:translate(-4px,-2px) rotate('+a+'rad);background:linear-gradient(90deg,rgba(168,237,123,.9),transparent)"></div>'}
  }
  const lightSense=lightSenseData(p);
  if(lightSense.eyes>=2&&lightSense.angle!=null){
    const a=lightSense.angle,width=lightSense.eyes>=3?145:118;
    const lx=viewW/2+Math.cos(a)*(width+24),ly=viewH/2+Math.sin(a)*(width+24);
    html+='<div class="sense-arrow light-arrow" style="width:'+width+'px;--counter-rotate:'+(-a)+'rad;transform:translate(-4px,-3px) rotate('+a+'rad)"></div>';
    html+='<span class="sense-label light-label" style="left:'+lx+'px;top:'+ly+'px">'+lightSense.percent+'% · '+lightSense.label+'</span>';
  }
  if(countPart('mechano')||countPart('electro')){
    creatures.forEach(c=>{const d=Math.sqrt(dist2(p,c));if(d>range*1.2||d<5)return;if(c.r<p.radius*.9&&!countPart('electro'))return;const s=worldToScreen(c.x,c.y);if(s.x<0||s.x>viewW||s.y<0||s.y>viewH)return;html+='<span class="sense-label" style="left:'+s.x+'px;top:'+s.y+'px">'+(c.r>p.radius?'〰 큰 진동':'⚡ 생체 신호')+'</span>'});
  }
  el.innerHTML=html;
}

function useSpecial(){
  const p=state.player;if(p.pulseCd>0){sound('error',{volume:.10,rate:1.2});toast('특수 행동 재사용까지 '+p.pulseCd.toFixed(1)+'초');return}
  if(countPart('toxin')){
    p.pulseCd=8;sound('bite',{volume:.18,rate:.58});creatures.forEach(c=>{const d=Math.sqrt(dist2(p,c));if(d<150)c.health-=12+countPart('toxin')*10});ripples.push({x:p.x,y:p.y,r:10,life:1.7});toast('☠️ 독소를 방출했습니다.');
  }else if(countPart('anchor')&&env.current>40){
    p.pulseCd=5;p.vx*=.1;p.vy*=.1;sound('confirm',{volume:.14,rate:.75});toast('⚓ 부착기관으로 물살을 버팁니다.');
  }else{
    p.pulseCd=4;p.vx+=Math.cos(p.angle)*150;p.vy+=Math.sin(p.angle)*150;p.energy-=5;sound('dash',{volume:.14,rate:1.08,rateJitter:.03});toast('💥 순간적으로 몸을 수축해 빠르게 벗어났어요.');
  }
}

function openEditor(){
  if(!state.started||!$('editorScreen').classList.contains('hidden'))return;
  if(!canReproduce()){
    const req=reproductionRequirement();sound('error',{volume:.13});
    toast('아직 번식할 수 없어요 · 생체량 '+Math.floor(state.player.biomass)+'/'+req+', 에너지 '+Math.round(state.player.energy)+'/78');
    return;
  }
  state.editorMode='reproduction';paused=true;editorSnapshot=JSON.parse(JSON.stringify({slots:state.player.slots,inside:state.player.inside,dna:state.dna}));
  $('gameScreen').classList.add('hidden');$('editorScreen').classList.remove('hidden');
  sound('event',{volume:.16,rate:1.08});selectedPart=null;activeTab='먹이';renderEditor();
}
function closeEditor(saveChanges){
  if(!saveChanges&&editorSnapshot){state.player.slots=[...editorSnapshot.slots];state.player.inside={...editorSnapshot.inside};state.dna=editorSnapshot.dna}
  $('editorScreen').classList.add('hidden');$('gameScreen').classList.remove('hidden');paused=false;selectedPart=null;
  if(saveChanges&&state.editorMode==='reproduction'){const n=classifyNiche();advanceGeneration();save();toast('🧬 '+state.generation+'세대 · '+n.name+' 계통이 이어집니다.')}
  else if(!saveChanges){sound('click',{volume:.12})}
  state.editorMode=null;updateLightSensor();updateSenseOverlay();last=performance.now();
}
function renderEditor(){
  $('editorDnaText').textContent=Math.floor(state.dna);
  const tabs=$('partTabs');tabs.innerHTML='';
  CATS.forEach(cat=>{const b=document.createElement('button');b.className='part-tab'+(cat===activeTab?' active':'');b.textContent=cat;b.addEventListener('click',()=>{activeTab=cat;selectedPart=null;sound('select',{volume:.09});renderEditor()});tabs.appendChild(b)});
  const list=$('partList');list.innerHTML='';
  Object.values(PARTS).filter(p=>p.cat===activeTab&&!p.starter).forEach(part=>{
    const count=countPart(part.id),locked=count>=part.max,cost=partPurchaseCost(part);
    const b=document.createElement('button');b.className='part-card'+(selectedPart===part.id?' selected':'')+(locked?' locked':'');b.type='button';
    b.innerHTML='<div class="part-line"><span class="part-icon">'+part.icon+'</span><span class="cost">🧬 '+cost+'</span></div><b>'+part.name+' '+(count?'×'+count:'')+'</b><small>'+part.desc+(count?' · 같은 기관을 더 달면 DNA 비용이 증가해요.':'')+'</small>';
    b.addEventListener('click',()=>choosePart(part));list.appendChild(b);
    if(!part.external&&count>0){
      const remove=document.createElement('button');remove.type='button';remove.className='part-remove';
      remove.textContent='− '+part.name+' 제거 · DNA '+partRefundValue(part)+' 회수';
      remove.addEventListener('click',()=>removeInternalPart(part));
      list.appendChild(remove);
    }
  });
  renderSlots();drawEditorPreview();updateTraitSummary();updateScienceCard();
}
function choosePart(part){
  updateScienceCard(part);
  if(countPart(part.id)>=part.max){sound('error',{volume:.12});toast('이 기관은 더 이상 달 수 없어요.');return}
  const cost=partPurchaseCost(part);
  if(state.dna<cost){sound('error',{volume:.12});toast('DNA가 '+(cost-state.dna).toFixed(1)+' 부족해요. 여러 세대 동안 모으거나 큰 먹이를 노려 보세요.');return}
  if(part.external){selectedPart=selectedPart===part.id?null:part.id;sound('select',{volume:.12,rate:selectedPart?1.04:.92});$('placementTip').textContent=selectedPart?part.icon+' '+part.name+' 배치 · 필요 DNA '+cost:'부품을 선택하면 배치 가능한 위치가 빛나요.';renderEditor()}
  else{
    state.player.inside[part.id]=(state.player.inside[part.id]||0)+1;state.dna-=cost;selectedPart=null;sound('confirm',{volume:.18,rate:1.04});renderEditor();toast(part.icon+' '+part.name+' 추가 · DNA -'+cost);
  }
}
function renderSlots(){
  const layer=$('slotLayer');layer.innerHTML='';const cx=50,cy=50,rr=40;
  state.player.slots.forEach((type,i)=>{
    const a=externalAngle(i),b=document.createElement('button');b.type='button';b.className='part-slot'+(selectedPart?' available':'')+(type?' occupied':'');
    b.style.left=(cx+Math.cos(a)*rr)+'%';b.style.top=(cy+Math.sin(a)*rr)+'%';b.textContent=type?PARTS[type].icon:'+';
    b.title=type?PARTS[type].name:'빈 슬롯';
    b.addEventListener('click',()=>slotClick(i));layer.appendChild(b);
  });
}
function removeInternalPart(part){
  const current=Number(state.player.inside[part.id]||0);
  if(current<=0)return;
  state.player.inside[part.id]=current-1;
  const refund=partRefundValue(part);state.dna+=refund;selectedPart=null;
  sound('click',{volume:.12,rate:.86});toast(part.name+' 제거 · DNA '+refund+' 회수');renderEditor();
}
function slotClick(i){
  const old=state.player.slots[i];
  if(selectedPart){
    const part=PARTS[selectedPart],cost=partPurchaseCost(part);if(state.dna<cost){sound('error',{volume:.12});toast('DNA가 부족해요. 필요 '+cost);return}
    if(old){state.dna+=partRefundValue(PARTS[old])}
    state.player.slots[i]=selectedPart;state.dna-=cost;sound('confirm',{volume:.17,rate:1.08});selectedPart=null;renderEditor();
  }else if(old){
    const refund=partRefundValue(PARTS[old]);state.player.slots[i]=null;state.dna+=refund;sound('click',{volume:.12,rate:.86});toast(PARTS[old].name+' 제거 · DNA '+refund+' 회수');renderEditor();
  }
}
function updateScienceCard(part){
  const box=$('scienceCard');
  if(!part){box.innerHTML='<span class="kicker">과학 노트</span><b>부품을 골라 보세요</b><p>기관마다 실제 생물에서 하는 일이 달라요.</p>';return}
  box.innerHTML='<span class="kicker">과학 노트</span><b>'+part.icon+' '+part.name+'</b><p>'+part.science+'</p>';
}
function drawEditorPreview(){
  const c=$('editorCanvas'),g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);
  const bg=g.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.48);bg.addColorStop(0,'rgba(71,196,190,.12)');bg.addColorStop(1,'rgba(6,24,31,0)');g.fillStyle=bg;g.fillRect(0,0,w,h);
  const oldCtx=ctx,oldW=viewW,oldH=viewH;ctx=g;viewW=w;viewH=h;drawOrganism(w/2,h/2,105,0,state.player.slots,state.player.inside,true,0);ctx=oldCtx;viewW=oldW;viewH=oldH;
}
function updateTraitSummary(){
  const s=movementStats(state.player);$('traitSpeed').textContent=(s.speed/76).toFixed(1)+'×';$('traitTurn').textContent=(s.turn/2.35).toFixed(1)+'×';$('traitSense').textContent=(s.sense/110).toFixed(1)+'×';$('traitArmor').textContent=s.armor.toFixed(1)+'×';
}

function openEnvInfo(){
  $('infoTitle').textContent=selectedBiome.icon+' '+selectedBiome.name;
  const data=[['빛','광합성에 사용할 수 있는 에너지. 탁한 물이나 심해에서는 낮습니다.'],['온도','너무 높거나 낮으면 대사에 부담을 줍니다. 온도 감각과 적응 기관이 도움이 됩니다.'],['산소','활발한 생물 활동과 연결되는 환경 조건입니다.'],['염도','세포 안팎의 물 이동에 영향을 줍니다. 극단적인 염도에서는 막 보호가 중요합니다.'],['먹이','주변에 떠다니는 유기물과 플랑크톤의 양입니다.'],['물살','세포를 밀어내는 힘입니다. 편모로 헤엄치거나 부착기관으로 버틸 수 있습니다.']];
  $('infoBody').innerHTML=data.map(x=>'<div class="info-row"><b>'+x[0]+'</b><p>'+x[1]+'</p></div>').join('');$('infoModal').classList.remove('hidden');
}

function save(){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({biome:selectedBiome.id,generation:state.generation,dna:state.dna,score:state.score,slots:state.player.slots,inside:state.player.inside,discovered:state.discovered}));
    sdkScore();
  }catch(_){}
}

function setupControls(){
  buildBiomeCards();
  $('randomStartBtn').addEventListener('click',randomBiome);$('toggleBiomeBtn').addEventListener('click',()=>{sound('click',{volume:.10});toggleBiomePanel()});$('rerollBtn').addEventListener('click',()=>{sound('select',{volume:.10});buildBiomeCards();toast('생태계 목록을 다시 살펴보세요.')});
  $('openTutorialBtn').addEventListener('click',()=>{sound('event',{volume:.12});$('tutorial').classList.remove('hidden')});$('tutorialCloseBtn').addEventListener('click',()=>{sound('click',{volume:.10});$('tutorial').classList.add('hidden')});$('tutorialPlayBtn').addEventListener('click',()=>{$('tutorial').classList.add('hidden');randomBiome()});
  $('homeBtn').addEventListener('click',goHome);$('editorBtn').addEventListener('click',openEditor);$('editorCloseBtn').addEventListener('click',()=>closeEditor(false));$('finishEvolutionBtn').addEventListener('click',()=>closeEditor(true));$('undoEvolutionBtn').addEventListener('click',()=>{if(editorSnapshot){state.player.slots=[...editorSnapshot.slots];state.player.inside={...editorSnapshot.inside};state.dna=editorSnapshot.dna;selectedPart=null;renderEditor();toast('이번 편집을 처음 상태로 되돌렸어요.')}});
  $('pulseBtn').addEventListener('click',useSpecial);$('pauseBtn').addEventListener('click',()=>{paused=!paused;sound('click',{volume:.10});if(paused)stopAmbience();else startAmbience();$('pauseBtn').querySelector('b').textContent=paused?'계속하기':'일시정지';last=performance.now()});
  $('envInfoBtn').addEventListener('click',()=>{sound('event',{volume:.10});openEnvInfo()});$('infoCloseBtn').addEventListener('click',()=>{sound('click',{volume:.09});$('infoModal').classList.add('hidden')});

  window.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key==='e'||e.key==='E')openEditor();if(e.key===' ')useSpecial();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault()});
  window.addEventListener('keyup',e=>{keys[e.key]=false});
  window.addEventListener('resize',resize);

  canvas=$('world');
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')pointerTarget={x:e.clientX,y:e.clientY}});
  canvas.addEventListener('pointerleave',()=>pointerTarget=null);

  const joyEl=$('joystick'),stick=$('stick');
  function joyMove(e){
    if(!joy.active||e.pointerId!==joy.pid)return;const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.34,d=Math.hypot(dx,dy)||1,scale=Math.min(1,max/d);joy.x=dx/d*scale;joy.y=dy/d*scale;stick.style.transform='translate(calc(-50% + '+(joy.x*max)+'px),calc(-50% + '+(joy.y*max)+'px))';
  }
  joyEl.addEventListener('pointerdown',e=>{joy.active=true;joy.pid=e.pointerId;joyEl.setPointerCapture(e.pointerId);joyMove(e)});
  joyEl.addEventListener('pointermove',joyMove);
  function joyEnd(e){if(e.pointerId!==joy.pid)return;joy.active=false;joy.x=joy.y=0;joy.pid=null;stick.style.transform='translate(-50%,-50%)'}
  joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);
  try{
    KidscadeGame?.registerPauseHandlers?.({
      pause(){paused=true;stopAmbience();$('pauseBtn')?.querySelector('b')&&( $('pauseBtn').querySelector('b').textContent='계속하기');},
      resume(){paused=false;if(running)startAmbience();last=performance.now();$('pauseBtn')?.querySelector('b')&&( $('pauseBtn').querySelector('b').textContent='일시정지');}
    });
  }catch(_){}
}

document.addEventListener('DOMContentLoaded',()=>{canvas=$('world');resize();setupControls();refreshEnvBars();});
})();