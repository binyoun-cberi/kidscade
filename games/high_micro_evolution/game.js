(() => {
'use strict';

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const TAU = Math.PI*2;
const rand = (a=1,b=0) => b + Math.random()*(a-b);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const dist2 = (a,b) => { const x=a.x-b.x,y=a.y-b.y; return x*x+y*y; };
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
  predatorMouth:{id:'predatorMouth',cat:'먹이',icon:'🦷',name:'포식 입',cost:5,external:true,max:2,desc:'작은 생물을 물어뜯어 에너지와 DNA를 얻어요.',science:'포식자는 다른 생물을 먹어 유기물에서 에너지를 얻습니다. 입의 위치가 진행 방향과 잘 맞을수록 사냥하기 편해집니다.'},
  filter:{id:'filter',cat:'먹이',icon:'🪭',name:'여과기관',cost:5,external:true,max:3,desc:'주변의 작은 플랑크톤을 자동으로 걸러 먹어요.',science:'여과섭식은 물을 통과시키며 작은 먹이 입자를 걸러 먹는 방식입니다.'},
  chloroplast:{id:'chloroplast',cat:'먹이',icon:'🌱',name:'광합성체',cost:7,external:false,max:4,desc:'빛이 강한 곳에서 천천히 에너지를 만들어요.',science:'광합성 생물은 빛 에너지를 이용해 유기물을 만듭니다. 빛이 부족하면 같은 기관도 큰 도움이 되지 않습니다.'},
  parasite:{id:'parasite',cat:'먹이',icon:'🪝',name:'기생 흡착기',cost:7,external:true,max:2,desc:'큰 생물에 붙어 에너지를 조금씩 빼앗아요.',science:'기생은 숙주에게서 자원이나 영양을 얻는 생활 방식입니다. 숙주와 가까이 붙어 있어야 합니다.'},

  flagellum:{id:'flagellum',cat:'이동',icon:'〰️',name:'편모',cost:4,external:true,max:6,desc:'긴 채찍 모양 기관. 뒤쪽에 달수록 직진 추진력이 커져요.',science:'편모는 회전하거나 휘어지며 세포를 추진합니다. 이 게임에서는 배치 방향이 추진 효율에 영향을 줍니다.'},
  cilia:{id:'cilia',cat:'이동',icon:'≋',name:'섬모',cost:4,external:true,max:6,desc:'짧은 털을 움직여 방향 전환과 미세 이동을 도와요.',science:'섬모는 짧은 털 모양 구조가 함께 움직여 이동과 물질 운반을 돕습니다.'},
  pseudopod:{id:'pseudopod',cat:'이동',icon:'🫧',name:'위족',cost:6,external:true,max:3,desc:'몸을 늘여 움직이고 가까운 먹이를 감싸 먹기 쉬워져요.',science:'아메바처럼 세포질을 한쪽으로 내밀어 만드는 돌기를 위족이라고 합니다. 이동과 포식에 함께 쓰일 수 있습니다.'},
  anchor:{id:'anchor',cat:'이동',icon:'⚓',name:'부착기관',cost:5,external:true,max:2,desc:'물살에 밀리는 힘을 줄이고 잠깐 고정할 수 있어요.',science:'많은 미생물은 표면에 달라붙어 물살에 휩쓸리는 것을 줄입니다.'},

  eyespot:{id:'eyespot',cat:'감각',icon:'👁️',name:'광수용기',cost:4,external:true,max:4,desc:'1개만 있어도 현재 밝기를 느끼고, 2개부터는 밝기 차이를 비교해 더 밝은 방향까지 알아내요.',science:'광수용 구조는 빛의 세기에 반응할 수 있습니다. 여러 수용기가 서로 다른 방향의 빛을 비교하면 빛이 강한 쪽을 더 잘 구별할 수 있습니다.'},
  chemo:{id:'chemo',cat:'감각',icon:'👃',name:'화학수용체',cost:4,external:true,max:4,desc:'먹이와 생물이 남기는 화학 신호를 멀리서 찾아요.',science:'세포도 주변 화학물질의 농도 차이를 감지해 먹이나 위험 쪽으로 이동하거나 피할 수 있습니다.'},
  mechano:{id:'mechano',cat:'감각',icon:'👂',name:'기계수용체',cost:5,external:true,max:4,desc:'물의 진동으로 가까워지는 큰 생물을 미리 느껴요.',science:'기계수용은 압력·진동·늘어남 같은 물리적 변화를 감지하는 방식입니다. 귀의 먼 조상 기능과 연결해 생각할 수 있습니다.'},
  tactile:{id:'tactile',cat:'감각',icon:'✋',name:'촉각섬모',cost:3,external:true,max:6,desc:'아주 가까운 물체와 물살 변화를 빠르게 알아차려요.',science:'세포막과 섬모는 접촉이나 흐름 변화에 반응할 수 있습니다. 가까운 위험을 알아차리는 데 유리합니다.'},
  thermo:{id:'thermo',cat:'감각',icon:'🌡️',name:'온도수용체',cost:4,external:false,max:2,desc:'위험한 온도 구역에서 경고를 받고 적응력이 좋아져요.',science:'생물은 온도 변화에 따라 단백질 작동과 대사 속도가 달라집니다. 온도를 감지하고 반응하는 것은 중요한 생존 전략입니다.'},
  electro:{id:'electro',cat:'감각',icon:'⚡',name:'전기 감각',cost:7,external:true,max:2,desc:'가까운 생물의 미세한 전기 변화를 감지해요.',science:'일부 동물은 전기장을 감지합니다. 게임에서는 진화가 많이 진행된 감각 계열의 특수 기관으로 단순화했습니다.'},

  membrane:{id:'membrane',cat:'방어',icon:'🛡️',name:'두꺼운 막',cost:5,external:false,max:4,desc:'공격과 염도 변화에 강해지지만 몸이 조금 무거워져요.',science:'세포막은 물질 출입을 조절합니다. 실제 생물의 세포벽·막 조성 변화처럼 환경에 대한 보호 기능을 게임식으로 단순화했습니다.'},
  spike:{id:'spike',cat:'방어',icon:'🔺',name:'가시',cost:5,external:true,max:6,desc:'몸에 부딪힌 포식자에게 피해를 주고 접근을 어렵게 해요.',science:'가시와 돌기는 포식자가 삼키거나 접근하기 어렵게 만드는 방어 형질이 될 수 있습니다.'},
  toxin:{id:'toxin',cat:'방어',icon:'☠️',name:'독소낭',cost:7,external:false,max:3,desc:'특수 행동으로 주변에 독소를 방출할 수 있어요.',science:'미생물도 다른 생물의 성장을 억제하거나 공격하는 화학물질을 만들 수 있습니다.'},
  camouflage:{id:'camouflage',cat:'방어',icon:'🫥',name:'위장색소',cost:6,external:false,max:3,desc:'가만히 있으면 포식자가 나를 알아채기 어려워져요.',science:'몸의 색이나 투명도는 배경과 비슷해져 발견될 가능성을 낮추는 데 도움이 될 수 있습니다.'}
};

const CATS = ['먹이','이동','감각','방어'];
const WORLD = {w:2600,h:1900};
const SAVE_KEY = window.KidscadeGame?.storageKey?.('high_micro_evolution','save') || 'kidscade_game_v1:high_micro_evolution:save';

let canvas,ctx,dpr=1,viewW=0,viewH=0,last=0,raf=0;
let running=false,paused=false,toastTimer=0,eventTimer=0,senseTimer=0;
let selectedBiome=BIOMES[0],selectedPart=null,activeTab='먹이',editorSnapshot=null;
let keys={},pointerTarget=null,joy={active:false,x:0,y:0,pid:null};
let foods=[],creatures=[],lightPatches=[],ripples=[],particles=[];
let env={...BIOMES[0].env};
let state = {
  generation:1,generationClock:0,eventClock:0,dna:12,score:0,survival:0,
  player:null,mission:0,discovered:{},facts:{},started:false
};

function freshPlayer(){
  const slots=Array(12).fill(null);
  slots[0]='predatorMouth';
  slots[6]='flagellum';
  return {x:WORLD.w/2,y:WORLD.h/2,vx:0,vy:0,angle:0,radius:30,energy:100,health:100,biomass:0,
    slots,inside:{chloroplast:0,thermo:0,membrane:0,toxin:0,camouflage:0},
    pulseCd:0,biteCd:0,attached:null,lastMove:0};
}
function resetState(){
  state={generation:1,generationClock:0,eventClock:0,dna:12,score:0,survival:0,player:freshPlayer(),mission:0,discovered:{},facts:{},started:true};
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
function sound(name){ try{window.KidscadeGame&&KidscadeGame.sound(name)}catch(_){} }
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
  env={...biome.env};
  $('startScreen').classList.add('hidden');$('gameScreen').classList.remove('hidden');$('editorScreen').classList.add('hidden');
  setupWorld();
  refreshHud(true);
  running=true;paused=false;last=performance.now();
  sdkStart();
  cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  toast(biome.icon+' '+biome.name+' — 환경을 읽고 살아남아 보세요!');
}
function goHome(){
  running=false;cancelAnimationFrame(raf);$('gameScreen').classList.add('hidden');$('editorScreen').classList.add('hidden');$('startScreen').classList.remove('hidden');
}

function setupWorld(){
  foods=[];creatures=[];lightPatches=[];ripples=[];particles=[];
  state.player.x=WORLD.w/2;state.player.y=WORLD.h/2;
  const patchCount=5;
  for(let i=0;i<patchCount;i++)lightPatches.push({x:rand(WORLD.w-400,200),y:rand(WORLD.h-400,200),r:rand(360,180),strength:rand(1,.55)});
  const foodN=Math.round(55+env.food*.75);
  for(let i=0;i<foodN;i++)spawnFood();
  for(let i=0;i<24;i++)spawnCreature(i%6);
}
function spawnFood(type){
  const roll=Math.random();
  type=type||(roll<.56?'plankton':roll<.88?'nutrient':'meat');
  foods.push({x:rand(WORLD.w),y:rand(WORLD.h),type,r:type==='plankton'?4:type==='nutrient'?6:8,phase:rand(TAU)});
}
function speciesTemplate(seed){
  const diets=['grazer','filter','hunter','photo','scavenger','parasite'];
  const diet=diets[seed%diets.length];
  return {diet,speed:.7+(seed%3)*.18,armor:.5+(seed%4)*.13,sense:.7+(seed%5)*.12,toxin:seed%4===0?.6:0,photo:diet==='photo'?1:0,filter:diet==='filter'?1:0,gen:1};
}
function spawnCreature(seed=0){
  const s=speciesTemplate(seed),r=rand(41,18);
  creatures.push({x:rand(WORLD.w),y:rand(WORLD.h),vx:0,vy:0,angle:rand(TAU),r,energy:100,health:100,species:seed,traits:s,age:0,flash:0});
}

function resize(){
  canvas=$('world');dpr=Math.min(2,window.devicePixelRatio||1);viewW=canvas.clientWidth;viewH=canvas.clientHeight;
  canvas.width=Math.round(viewW*dpr);canvas.height=Math.round(viewH*dpr);ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
}
function worldToScreen(x,y){ const p=state.player; return {x:x-p.x+viewW/2,y:y-p.y+viewH/2}; }
function screenToWorld(x,y){ const p=state.player; return {x:x-viewW/2+p.x,y:y-viewH/2+p.y}; }

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
    const d=Math.hypot(x-q.x,y-q.y);
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
  const angle=target?Math.atan2(target.y-p.y,target.x-p.x):null;
  return {eyes,local,percent,label:lightLevelLabel(percent),range,target,distance,angle,arrow:lightCompass(angle)};
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
    const gain=chlor*lightAt(p.x,p.y)*1.4*dt;
    p.energy+=gain;p.biomass+=gain*.05;
    if(gain>.4)state.score+=gain*.12;
  }

  const filter=countPart('filter');
  if(filter){
    const rr=36+filter*15;
    for(let i=foods.length-1;i>=0;i--){
      const f=foods[i];if(f.type!=='plankton')continue;
      if(dist2(p,f)<rr*rr){consumeFood(i,1.1+filter*.12,'filter');}
    }
  }

  if(p.attached){
    const c=p.attached;
    if(!creatures.includes(c)||dist2(p,c)>Math.pow(p.radius+c.r+20,2)){p.attached=null}
    else if(countPart('parasite')){
      const gain=countPart('parasite')*.9*dt;
      p.energy+=gain;c.health-=gain*.35;state.dna+=gain*.035;state.score+=gain*.25;
    }
  }

  p.pulseCd=Math.max(0,p.pulseCd-dt);p.biteCd=Math.max(0,p.biteCd-dt);
  p.energy=clamp(p.energy,0,135);
  if(p.energy<=0)p.health-=7*dt; else if(p.energy>75&&p.health<100)p.health+=.9*dt;
  p.health=clamp(p.health,0,100);
  if(p.health<=0)respawnPlayer();

  const growTarget=30+Math.min(24,Math.sqrt(Math.max(0,p.biomass))*2.1);
  p.radius=lerp(p.radius,growTarget,clamp(dt*.7,0,1));
}
function consumeFood(index,mult=1,why='mouth'){
  const f=foods[index],p=state.player;
  const base=f.type==='meat'?9:f.type==='nutrient'?6:4;
  p.energy+=base*mult;p.biomass+=base*.35*mult;state.dna+=base*.11*mult;state.score+=base*mult;
  foods.splice(index,1);spawnFood();
  burst(f.x,f.y,f.type==='meat'?'#ff8eb0':'#b9ef78');
  if(why==='filter'&&!state.discovered.filter){state.discovered.filter=1;toast('여과섭식 성공! 작은 입자를 걸러 먹었어요.')}
}
function respawnPlayer(){
  state.player.health=100;state.player.energy=82;state.player.biomass*=.72;state.dna=Math.max(0,state.dna-4);
  state.player.x=WORLD.w/2;state.player.y=WORLD.h/2;toast('세포가 크게 손상되어 안전한 곳에서 다시 시작했어요. DNA 4를 잃었습니다.');
}

function updateFoods(dt){
  const flow=env.current/100*9;
  foods.forEach(f=>{
    f.phase+=dt;
    f.x=(f.x+Math.cos(f.phase*.3)*flow*dt+WORLD.w)%WORLD.w;
    f.y=(f.y+Math.sin(f.phase*.24)*flow*.5*dt+WORLD.h)%WORLD.h;
  });
  const p=state.player,hasMouth=countPart('predatorMouth')||countPart('pseudopod');
  if(hasMouth){
    for(let i=foods.length-1;i>=0;i--){
      const f=foods[i],rr=p.radius+f.r+4;
      if(dist2(p,f)<rr*rr)consumeFood(i,countPart('pseudopod')?1.15:1,'mouth');
    }
  }
}
function nearestFood(c){
  let best=null,bd=Infinity;
  for(const f of foods){const d=dist2(c,f);if(d<bd){bd=d;best=f}}
  return best;
}
function updateCreatures(dt){
  const p=state.player;
  creatures.forEach((c,idx)=>{
    c.age+=dt;c.flash=Math.max(0,c.flash-dt);
    let tx=0,ty=0;
    const dp=Math.sqrt(dist2(c,p));
    const hunter=c.traits.diet==='hunter',parasite=c.traits.diet==='parasite';
    if((hunter&&c.r>p.radius*.78)||parasite){
      const see=180+c.traits.sense*100;
      if(dp<see){tx=(p.x-c.x)/Math.max(1,dp);ty=(p.y-c.y)/Math.max(1,dp)}
    }else if(c.r<p.radius*.82&&dp<150){
      tx=(c.x-p.x)/Math.max(1,dp);ty=(c.y-p.y)/Math.max(1,dp);
    }else{
      const f=nearestFood(c);
      if(f){const d=Math.sqrt(dist2(c,f));tx=(f.x-c.x)/Math.max(1,d);ty=(f.y-c.y)/Math.max(1,d)}
    }
    if(c.traits.photo>0&&lightAt(c.x,c.y)>.65){tx*=.25;ty*=.25;c.energy+=.4*dt}
    c.angle+=clamp(angleDiff(Math.atan2(ty,tx),c.angle),-2.2*dt,2.2*dt);
    const sp=(36+c.traits.speed*43)/(1+c.traits.armor*.16);
    c.vx=lerp(c.vx,Math.cos(c.angle)*sp,clamp(dt*2.8,0,1));c.vy=lerp(c.vy,Math.sin(c.angle)*sp,clamp(dt*2.8,0,1));
    c.x=(c.x+c.vx*dt+WORLD.w)%WORLD.w;c.y=(c.y+c.vy*dt+WORLD.h)%WORLD.h;

    const f=nearestFood(c);
    if(f&&dist2(c,f)<Math.pow(c.r+f.r,2)){const i=foods.indexOf(f);if(i>=0){foods.splice(i,1);spawnFood();c.energy+=8}}

    const rr=c.r+p.radius,hit=dist2(c,p)<rr*rr;
    if(hit){
      if(hunter&&c.r>p.radius*.86){
        let dmg=(7+c.r*.08)*dt/(1+countPart('membrane')*.32);
        if(countPart('camouflage')&&Math.hypot(p.vx,p.vy)<12)dmg*=.45;
        p.health-=dmg;c.flash=.12;
        if(countPart('spike'))c.health-=countPart('spike')*2.2*dt;
      }
      if(countPart('predatorMouth')&&p.radius>c.r*.78&&p.biteCd<=0){
        const front=Math.abs(angleDiff(Math.atan2(c.y-p.y,c.x-p.x),p.angle));
        if(front<1.05){c.health-=18+countPart('predatorMouth')*8;p.biteCd=.75;burst(c.x,c.y,'#ff889e')}
      }
      if(countPart('parasite')&&c.r>p.radius*.9&&!p.attached)p.attached=c;
    }
    if(c.health<=0){
      state.dna+=2.4;state.score+=25;p.energy+=12;p.biomass+=4;
      burst(c.x,c.y,'#ff78a4');
      Object.assign(c,{x:rand(WORLD.w),y:rand(WORLD.h),health:100,energy:100,r:rand(41,18),traits:mutateTraits(speciesTemplate(idx%6),.22)});
      if(!state.discovered.predator){state.discovered.predator=1;toast('포식 성공! 다른 생물을 먹는 것도 하나의 생태 전략입니다.')}
    }
    if(c.age>70){c.age=0;c.traits=mutateTraits(c.traits,.08)}
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
  {icon:'🌧️',title:'폭우',desc:'영양분이 흘러들어오지만 물살이 강해졌어요.',apply(){env.food=clamp(env.food+18,0,100);env.current=clamp(env.current+24,0,100)}},
  {icon:'☀️',title:'강한 햇빛',desc:'빛은 늘었지만 수온도 함께 올랐어요.',apply(){env.light=clamp(env.light+22,0,100);env.temp=clamp(env.temp+13,0,100)}},
  {icon:'🌫️',title:'탁도 증가',desc:'물이 탁해져 빛을 이용하기 어려워졌어요.',apply(){env.turbidity=clamp(env.turbidity+25,0,100);env.light=clamp(env.light-16,0,100)}},
  {icon:'🫧',title:'산소 증가',desc:'물속 산소가 늘어 활발한 생물이 많아집니다.',apply(){env.oxygen=clamp(env.oxygen+20,0,100)}},
  {icon:'🧂',title:'증발',desc:'물이 줄며 염도가 올라갔어요.',apply(){env.salt=clamp(env.salt+19,0,100);env.food=clamp(env.food-8,0,100)}},
  {icon:'🌱',title:'플랑크톤 번성',desc:'작은 먹이 입자가 크게 늘어났어요.',apply(){env.food=clamp(env.food+26,0,100);for(let i=0;i<22;i++)spawnFood('plankton')}}
];
function triggerEvent(){
  const e=pick(EVENTS);e.apply();$('eventIcon').textContent=e.icon;$('eventTitle').textContent=e.title;$('eventDesc').textContent=e.desc;
  $('eventBanner').classList.remove('hidden');clearTimeout(eventTimer);eventTimer=setTimeout(()=>$('eventBanner').classList.add('hidden'),4000);
  refreshEnvBars();
}
function advanceGeneration(){
  state.generation++;state.generationClock=0;state.dna+=5;state.score+=50;
  creatures.forEach((c,i)=>{
    const pressure=(env.current>65?.07:0)+(env.food<40?.05:0)+(env.turbidity>65?.04:0);
    c.traits=mutateTraits(c.traits,.09+pressure);c.traits.gen=state.generation;
    if(env.current>65)c.traits.speed=clamp(c.traits.speed+.05,.3,2);
    if(env.food<40)c.traits.sense=clamp(c.traits.sense+.05,.3,2);
  });
  triggerEvent();toast('🧬 '+state.generation+'세대 — AI 생물도 살아남은 방향으로 조금씩 변이합니다. +DNA 5');
  sound('levelup');save();
}
function updateMissions(){
  const m=state.mission,p=state.player;
  if(m===0&&state.dna>=8){state.mission=1;toast('미션 완료! 이제 감각기관을 하나 달아 보세요.')}
  else if(m===1&&(countPart('eyespot')+countPart('chemo')+countPart('mechano')+countPart('tactile'))>0){state.mission=2;state.dna+=2;toast('감각기관 획득! +DNA 2')}
  else if(m===2&&state.generation>=2){state.mission=3;state.dna+=3;toast('한 세대를 생존했어요! +DNA 3')}
  else if(m===3&&classifyNiche().name!=='초기 미생물'){state.mission=4;state.dna+=4;toast('새 생태적 지위를 만들었어요! +DNA 4')}
}
function missionText(){
  if(state.mission===0)return ['첫 DNA 모으기','먹이를 먹어 DNA 8을 모아 보세요.'];
  if(state.mission===1)return ['세상을 느껴 보기','진화 편집기에서 감각기관을 하나 달아 보세요.'];
  if(state.mission===2)return ['한 세대 살아남기','환경 사건을 버티고 다음 세대까지 생존하세요.'];
  if(state.mission===3)return ['나만의 생존 전략','기관을 조합해 뚜렷한 생태적 지위를 만들어 보세요.'];
  return ['자유 진화','환경 변화와 다른 종의 진화에 맞서 오래 살아남아 보세요.'];
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
  updatePlayer(dt);updateFoods(dt);updateCreatures(dt);updateParticles(dt);updateMissions();
  if(state.generationClock>=55)advanceGeneration();
  else if(state.eventClock>=27){state.eventClock=0;triggerEvent()}
  if(Math.random()<dt*.8&&foods.length<160)spawnFood();
  if(Math.random()<dt*.15&&countPart('mechano')){const source=pick(creatures);if(source)ripples.push({x:source.x,y:source.y,r:5,life:1});}
  if(state.survival-senseTimer>.15){senseTimer=state.survival;updateSenseOverlay()}
  refreshHud(false);
}

function drawBackground(){
  const g=ctx.createLinearGradient(0,0,viewW,viewH);g.addColorStop(0,selectedBiome.color[0]);g.addColorStop(1,selectedBiome.color[1]);ctx.fillStyle=g;ctx.fillRect(0,0,viewW,viewH);
  ctx.globalAlpha=.12;
  for(let i=0;i<22;i++){const x=(i*179+state.survival*4)%(viewW+100)-50,y=(i*83)%viewH;ctx.beginPath();ctx.arc(x,y,3+(i%5),0,TAU);ctx.fillStyle='#dffeff';ctx.fill()}
  ctx.globalAlpha=1;
}
function drawPatches(){
  const sense=state.player?lightSenseData(state.player):{eyes:0,target:null};
  lightPatches.forEach(q=>{const s=worldToScreen(q.x,q.y);if(s.x<-q.r||s.x>viewW+q.r||s.y<-q.r||s.y>viewH+q.r)return;
    const sensoryBoost=sense.eyes?Math.min(.16,sense.eyes*.055):0;
    const alpha=q.strength*(.12+sensoryBoost)*env.light/100;
    const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,q.r);g.addColorStop(0,'rgba(244,255,166,'+alpha+')');g.addColorStop(1,'rgba(244,255,166,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,q.r,0,TAU);ctx.fill();
    if(sense.eyes>=2&&q===sense.target){
      ctx.save();ctx.strokeStyle='rgba(239,255,133,.26)';ctx.lineWidth=2;ctx.setLineDash([7,9]);ctx.beginPath();ctx.arc(s.x,s.y,q.r*.72,0,TAU);ctx.stroke();ctx.restore();
    }
  });
}
function drawFoods(){
  foods.forEach(f=>{const s=worldToScreen(f.x,f.y);if(s.x<-20||s.x>viewW+20||s.y<-20||s.y>viewH+20)return;
    ctx.beginPath();ctx.arc(s.x,s.y,f.r,0,TAU);
    ctx.fillStyle=f.type==='meat'?'#ff8ca7':f.type==='nutrient'?'#ffe08a':'#a8ed7b';ctx.globalAlpha=.82;ctx.fill();ctx.globalAlpha=1;
  });
}
function drawOrganism(x,y,r,angle,slots,inside,isPlayer=false,flash=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  const camo=(inside&&inside.camouflage)||0,armor=(inside&&inside.membrane)||0;
  ctx.globalAlpha=isPlayer?1:clamp(.9-camo*.12,.52,.92);
  const body=ctx.createRadialGradient(-r*.25,-r*.25,r*.08,0,0,r);body.addColorStop(0,isPlayer?'#6ef6dd':'#73cfe8');body.addColorStop(.58,isPlayer?'#239e9a':'#2b829e');body.addColorStop(1,flash>0?'#fff':'#124f62');
  ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(0,0,r*1.08,r*.9,0,0,TAU);ctx.fill();
  ctx.lineWidth=2+armor*1.6;ctx.strokeStyle=armor?'rgba(202,247,255,.75)':'rgba(255,255,255,.22)';ctx.stroke();
  if(inside&&inside.chloroplast){ctx.fillStyle='#8ce66a';for(let i=0;i<inside.chloroplast*2;i++){const a=i*2.4;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.42,Math.sin(a)*r*.35,5,3,a,0,TAU);ctx.fill()}}
  ctx.fillStyle=isPlayer?'#c26ea8':'#7165aa';ctx.beginPath();ctx.arc(-r*.08,2,r*.28,0,TAU);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=2;ctx.stroke();

  (slots||[]).forEach((type,i)=>{
    if(!type)return;const a=externalAngle(i),px=Math.cos(a)*r*.96,py=Math.sin(a)*r*.82;ctx.save();ctx.translate(px,py);ctx.rotate(a);
    drawPart(type,r,isPlayer);ctx.restore();
  });
  ctx.restore();
}
function drawPart(type,r,isPlayer){
  ctx.lineCap='round';ctx.lineJoin='round';
  if(type==='flagellum'){ctx.strokeStyle=isPlayer?'#7affec':'#8bd8ee';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(18,8,30,-10,48+Math.sin(state.survival*8)*7,4);ctx.stroke()}
  else if(type==='cilia'||type==='tactile'){ctx.strokeStyle=type==='tactile'?'#ffe492':'#b6fff5';ctx.lineWidth=2;for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(0,k*5);ctx.lineTo(17+Math.sin(state.survival*10+k)*3,k*7);ctx.stroke()}}
  else if(type==='pseudopod'){ctx.fillStyle='#49b8a8';ctx.beginPath();ctx.ellipse(12,0,19,8,0,0,TAU);ctx.fill()}
  else if(type==='anchor'){ctx.strokeStyle='#c8e4e8';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(20,0);ctx.lineTo(15,-8);ctx.moveTo(20,0);ctx.lineTo(15,8);ctx.stroke()}
  else if(type==='predatorMouth'){ctx.fillStyle='#fff2df';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(18,-3);ctx.lineTo(4,1);ctx.lineTo(18,8);ctx.lineTo(0,10);ctx.closePath();ctx.fill()}
  else if(type==='filter'){ctx.strokeStyle='#d5ffb1';ctx.lineWidth=2;for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(19,k*5);ctx.stroke()}}
  else if(type==='parasite'){ctx.strokeStyle='#ffb2cd';ctx.lineWidth=4;ctx.beginPath();ctx.arc(11,0,10,-1.3,1.3);ctx.stroke()}
  else if(type==='spike'){ctx.fillStyle='#d8fbff';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(24,0);ctx.lineTo(0,6);ctx.closePath();ctx.fill()}
  else if(type==='eyespot'){ctx.fillStyle='#eaff7a';ctx.beginPath();ctx.arc(7,0,6,0,TAU);ctx.fill();ctx.fillStyle='#153b42';ctx.beginPath();ctx.arc(9,0,2.5,0,TAU);ctx.fill()}
  else if(type==='chemo'){ctx.fillStyle='#9af6ff';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(5+i*6,(i-1)*4,3,0,TAU);ctx.fill()}}
  else if(type==='mechano'){ctx.strokeStyle='#ffdda3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(5,0,8,-1.1,1.1);ctx.arc(9,0,13,-1.1,1.1);ctx.stroke()}
  else if(type==='electro'){ctx.strokeStyle='#fff47d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(7,0);ctx.lineTo(2,5);ctx.lineTo(15,2);ctx.stroke()}
}
function creatureSlots(c){
  const s=Array(12).fill(null),diet=c.traits.diet;
  if(diet==='hunter'){s[0]='predatorMouth';s[6]='flagellum';if(c.traits.speed>1)s[5]='flagellum'}
  if(diet==='filter'){s[0]='filter';s[1]='filter';s[6]='cilia';s[7]='cilia'}
  if(diet==='parasite'){s[0]='parasite';s[6]='flagellum';s[5]='chemo'}
  if(diet==='photo'){s[5]='eyespot';s[6]='flagellum'}
  if(c.traits.sense>1.15)s[11]='mechano';if(c.traits.armor>1.1)s[3]='spike';
  return s;
}
function drawCreatures(){
  creatures.forEach(c=>{const s=worldToScreen(c.x,c.y);if(s.x<-80||s.x>viewW+80||s.y<-80||s.y>viewH+80)return;
    const inside={chloroplast:c.traits.photo?2:0,membrane:c.traits.armor>1.25?1:0,camouflage:0};drawOrganism(s.x,s.y,c.r,c.angle,creatureSlots(c),inside,false,c.flash);
  });
}
function drawPlayer(){
  const p=state.player;drawOrganism(viewW/2,viewH/2,p.radius,p.angle,p.slots,p.inside,true,0);
  const range=movementStats(p).sense;ctx.strokeStyle='rgba(102,245,231,.08)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(viewW/2,viewH/2,Math.min(range,280),0,TAU);ctx.stroke();
  if(p.attached){ctx.strokeStyle='rgba(255,153,190,.5)';ctx.setLineDash([5,5]);ctx.beginPath();const s=worldToScreen(p.attached.x,p.attached.y);ctx.moveTo(viewW/2,viewH/2);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.setLineDash([])}
}
function drawEffects(){
  particles.forEach(q=>{const s=worldToScreen(q.x,q.y);ctx.globalAlpha=clamp(q.life*2,0,1);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(s.x,s.y,3,0,TAU);ctx.fill()});ctx.globalAlpha=1;
  ripples.forEach(q=>{const s=worldToScreen(q.x,q.y);ctx.globalAlpha=q.life;ctx.strokeStyle='#ffd99b';ctx.beginPath();ctx.arc(s.x,s.y,q.r,0,TAU);ctx.stroke()});ctx.globalAlpha=1;
}
function render(){
  if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);drawBackground();drawPatches();drawFoods();drawCreatures();drawEffects();drawPlayer();
}
function loop(ts){
  if(!running)return;const dt=Math.min(.034,(ts-last)/1000||0);last=ts;update(dt);render();raf=requestAnimationFrame(loop);
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
function refreshHud(force){
  if(!state.player)return;
  $('biomeIcon').textContent=selectedBiome.icon;$('biomeName').textContent=selectedBiome.name;$('generationText').textContent=state.generation+'세대 · '+Math.max(0,Math.ceil(55-state.generationClock))+'초';
  $('dnaText').textContent=Math.floor(state.dna);$('energyText').textContent=Math.round(state.player.energy);$('healthText').textContent=Math.round(state.player.health);
  const n=classifyNiche();$('nicheName').textContent=n.name;$('nicheDesc').textContent=n.desc;
  const m=missionText();$('missionTitle').textContent=m[0];$('missionDesc').textContent=m[1];
  if(force){refreshEnvBars();updateLightSensor();}
}
function updateSenseOverlay(){
  const el=$('senseOverlay');if(!state.player){el.innerHTML='';return}
  updateLightSensor();
  let html='',p=state.player,range=movementStats(p).sense;
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
  const p=state.player;if(p.pulseCd>0){toast('특수 행동 재사용까지 '+p.pulseCd.toFixed(1)+'초');return}
  if(countPart('toxin')){
    p.pulseCd=8;creatures.forEach(c=>{const d=Math.sqrt(dist2(p,c));if(d<150)c.health-=12+countPart('toxin')*10});ripples.push({x:p.x,y:p.y,r:10,life:1.7});toast('☠️ 독소를 방출했습니다.');
  }else if(countPart('anchor')&&env.current>40){
    p.pulseCd=5;p.vx*=.1;p.vy*=.1;toast('⚓ 부착기관으로 물살을 버팁니다.');
  }else{
    p.pulseCd=4;p.vx+=Math.cos(p.angle)*150;p.vy+=Math.sin(p.angle)*150;p.energy-=5;toast('💥 순간적으로 몸을 수축해 빠르게 벗어났어요.');
  }
}

function openEditor(){
  if(!state.started)return;
  paused=true;editorSnapshot=JSON.parse(JSON.stringify({slots:state.player.slots,inside:state.player.inside,dna:state.dna}));
  $('gameScreen').classList.add('hidden');$('editorScreen').classList.remove('hidden');
  selectedPart=null;activeTab='먹이';renderEditor();
}
function closeEditor(saveChanges){
  if(!saveChanges&&editorSnapshot){state.player.slots=[...editorSnapshot.slots];state.player.inside={...editorSnapshot.inside};state.dna=editorSnapshot.dna}
  $('editorScreen').classList.add('hidden');$('gameScreen').classList.remove('hidden');paused=false;selectedPart=null;
  if(saveChanges){save();const n=classifyNiche();toast('🧬 진화 완료 — '+n.name);sound('success')}
  updateLightSensor();updateSenseOverlay();last=performance.now();
}
function renderEditor(){
  $('editorDnaText').textContent=Math.floor(state.dna);
  const tabs=$('partTabs');tabs.innerHTML='';
  CATS.forEach(cat=>{const b=document.createElement('button');b.className='part-tab'+(cat===activeTab?' active':'');b.textContent=cat;b.addEventListener('click',()=>{activeTab=cat;selectedPart=null;renderEditor()});tabs.appendChild(b)});
  const list=$('partList');list.innerHTML='';
  Object.values(PARTS).filter(p=>p.cat===activeTab).forEach(part=>{
    const count=countPart(part.id),locked=count>=part.max;
    const b=document.createElement('button');b.className='part-card'+(selectedPart===part.id?' selected':'')+(locked?' locked':'');b.type='button';
    b.innerHTML='<div class="part-line"><span class="part-icon">'+part.icon+'</span><span class="cost">🧬 '+part.cost+'</span></div><b>'+part.name+' '+(count?'×'+count:'')+'</b><small>'+part.desc+'</small>';
    b.addEventListener('click',()=>choosePart(part));list.appendChild(b);
  });
  renderSlots();drawEditorPreview();updateTraitSummary();updateScienceCard();
}
function choosePart(part){
  updateScienceCard(part);
  if(countPart(part.id)>=part.max){toast('이 기관은 더 이상 달 수 없어요.');return}
  if(state.dna<part.cost){toast('DNA가 부족해요. 먹고 살아남아 DNA를 더 모아 보세요.');return}
  if(part.external){selectedPart=selectedPart===part.id?null:part.id;$('placementTip').textContent=selectedPart?part.icon+' '+part.name+'을(를) 둘레 슬롯에 배치하세요.':'부품을 선택하면 배치 가능한 위치가 빛나요.';renderEditor()}
  else{
    state.player.inside[part.id]=(state.player.inside[part.id]||0)+1;state.dna-=part.cost;selectedPart=null;sound('click');renderEditor();toast(part.icon+' '+part.name+' 추가');
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
function slotClick(i){
  const old=state.player.slots[i];
  if(selectedPart){
    const part=PARTS[selectedPart];if(state.dna<part.cost){toast('DNA가 부족해요.');return}
    if(old){state.dna+=Math.ceil(PARTS[old].cost*.7)}
    state.player.slots[i]=selectedPart;state.dna-=part.cost;sound('click');selectedPart=null;renderEditor();
  }else if(old){
    state.player.slots[i]=null;state.dna+=Math.ceil(PARTS[old].cost*.7);toast(PARTS[old].name+' 제거 · DNA 일부 회수');renderEditor();
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
  $('randomStartBtn').addEventListener('click',randomBiome);$('toggleBiomeBtn').addEventListener('click',toggleBiomePanel);$('rerollBtn').addEventListener('click',()=>{buildBiomeCards();toast('생태계 목록을 다시 살펴보세요.')});
  $('openTutorialBtn').addEventListener('click',()=>$('tutorial').classList.remove('hidden'));$('tutorialCloseBtn').addEventListener('click',()=>$('tutorial').classList.add('hidden'));$('tutorialPlayBtn').addEventListener('click',()=>{$('tutorial').classList.add('hidden');randomBiome()});
  $('homeBtn').addEventListener('click',goHome);$('editorBtn').addEventListener('click',openEditor);$('editorCloseBtn').addEventListener('click',()=>closeEditor(false));$('finishEvolutionBtn').addEventListener('click',()=>closeEditor(true));$('undoEvolutionBtn').addEventListener('click',()=>{if(editorSnapshot){state.player.slots=[...editorSnapshot.slots];state.player.inside={...editorSnapshot.inside};state.dna=editorSnapshot.dna;selectedPart=null;renderEditor();toast('이번 편집을 처음 상태로 되돌렸어요.')}});
  $('pulseBtn').addEventListener('click',useSpecial);$('pauseBtn').addEventListener('click',()=>{paused=!paused;$('pauseBtn').querySelector('b').textContent=paused?'계속하기':'일시정지';last=performance.now()});
  $('envInfoBtn').addEventListener('click',openEnvInfo);$('infoCloseBtn').addEventListener('click',()=>$('infoModal').classList.add('hidden'));

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
}

document.addEventListener('DOMContentLoaded',()=>{canvas=$('world');resize();setupControls();refreshEnvBars();});
})();