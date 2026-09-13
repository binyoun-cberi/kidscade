/* Kidscade World v2 - complete progression loop.
   Crafting, stamina, tool tiers, crops, iron, resource respawn, fish dex and cooking.
   Uses kidscade_world_v2 only; legacy garden/life saves and the main seed wallet stay untouched. */
(function(root){
'use strict';
const K=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
if(K.Progression?.installed)return;

const TOOL={
  axe:{name:'돌도끼',tier:'stone',max:18,req:{wood:3,stone:2},work:'chop'},
  pick:{name:'돌곡괭이',tier:'stone',max:18,req:{wood:2,stone:3},work:'mine'},
  net:{name:'곤충채집망',tier:'basic',max:14,req:{wood:2,stone:1},work:'net'},
  rod:{name:'낚싯대',tier:'basic',max:16,req:{wood:3,stone:1},work:'fish'}
};
const IRON_UPGRADE={
  axe:{name:'철도끼',max:40,req:{wood:2,iron:3},speed:520},
  pick:{name:'철곡괭이',max:42,req:{wood:2,iron:4},speed:560}
};
const CROP={
  potato:{name:'감자',grow:35000,yield:2,color:'#d8b46c',leaf:'#71954d'},
  carrot:{name:'당근',grow:50000,yield:3,color:'#df8344',leaf:'#66904b'},
  tomato:{name:'토마토',grow:70000,yield:3,color:'#cb604e',leaf:'#638c4d'}
};
const RECIPES={
  potatoSoup:{name:'감자수프',req:{potato:2,carrot:1},chops:4,heat:[52,68],energy:35},
  farmGrill:{name:'농장 채소구이',req:{potato:1,carrot:1,tomato:1},chops:6,heat:[60,75],energy:42},
  fishStew:{name:'토마토 생선스튜',req:{tomato:2,fish:1,potato:1},chops:5,heat:[55,72],energy:52},
  grilledFish:{name:'생선구이',req:{fish:1,tomato:1},chops:3,heat:[64,80],energy:46}
};
const FISH=[
  {name:'피라미',rarity:'흔함',weight:45},
  {name:'붕어',rarity:'보통',weight:30},
  {name:'메기',rarity:'희귀',weight:18},
  {name:'쏘가리',rarity:'매우 희귀',weight:7}
];
const WORK_COST={chop:4,mine:5,water:2,harvest:2,net:3,fish:3};
const TOOL_FOR={chop:'axe',mine:'pick',net:'net',fish:'rod'};
const PLOT_TYPES=['potato','carrot','tomato'];
const runtime=new WeakMap();
let progressCache=null;

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function toast(text){const el=document.getElementById('toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(el.__progToast);el.__progToast=setTimeout(()=>el.classList.remove('show'),1700);}
function actor(world){return world?.player?.__kidscadeAvatarActor||null;}
function carry(world){return K.CarryFishing?.states?.get(world)||null;}
function loadSave(){return K.Storage?.load?.()||{};}
function ensureProgress(){
  if(progressCache)return progressCache;
  const s=loadSave(),raw=s.progression||{},max=Math.max(50,Number(raw.maxEnergy)||100);
  progressCache={
    energy:clamp(Number(raw.energy??max),0,max),maxEnergy:max,
    tools:raw.tools&&typeof raw.tools==='object'?raw.tools:{},
    seeds:{potato:2,carrot:2,tomato:2,...(raw.seeds||{})},
    crops:raw.crops&&typeof raw.crops==='object'?raw.crops:{},
    crafted:Array.isArray(raw.crafted)?raw.crafted:[],
    food:raw.food&&typeof raw.food==='object'?raw.food:{},
    fishDex:raw.fishDex&&typeof raw.fishDex==='object'?raw.fishDex:{},
    kitchen:raw.kitchen&&typeof raw.kitchen==='object'?raw.kitchen:{pending:null}
  };
  s.progression=progressCache;K.Storage?.save?.(s);return progressCache;
}
function persistProgress(p=ensureProgress()){progressCache=p;const s=loadSave();s.progression=p;K.Storage?.save?.(s);}
function inventory(world){const c=carry(world);if(c)return c.inventory;const s=loadSave();return s.inventory||(s.inventory={});}
function persistInventory(world){const s=loadSave();s.inventory={...inventory(world)};K.Storage?.save?.(s);}
function have(inv,req){return Object.entries(req).every(([k,v])=>(Number(inv[k])||0)>=v);}
function consume(inv,req){Object.entries(req).forEach(([k,v])=>inv[k]=Math.max(0,(Number(inv[k])||0)-v));}
function itemName(k){return ({wood:'목재',stone:'돌',iron:'철광석',potato:'감자',carrot:'당근',tomato:'토마토',fish:'물고기',bug:'곤충',crop:'수확물'})[k]||k;}
function reqText(req){return Object.entries(req).map(([k,v])=>`${itemName(k)} ${v}`).join(' · ');}
function toolTier(p,key){return p.tools[key]?.tier||'stone';}
function syncToolDefs(){
  const p=ensureProgress();
  for(const key of ['axe','pick']){
    const iron=toolTier(p,key)==='iron',u=IRON_UPGRADE[key],d=TOOL[key];
    if(iron){d.name=u.name;d.tier='iron';d.max=u.max;d.req={...u.req};}
    else if(key==='axe'){d.name='돌도끼';d.tier='stone';d.max=18;d.req={wood:3,stone:2};}
    else{d.name='돌곡괭이';d.tier='stone';d.max=18;d.req={wood:2,stone:3};}
  }
}
function applyWorkBalance(){
  const p=ensureProgress(),cfg=K.WorkAnimation?.CFG;if(!cfg)return;
  cfg.chop.duration=toolTier(p,'axe')==='iron'?IRON_UPGRADE.axe.speed:760;
  cfg.mine.duration=toolTier(p,'pick')==='iron'?IRON_UPGRADE.pick.speed:820;
  cfg.net.duration=850;cfg.water.duration=1250;cfg.harvest.duration=760;
}
function spendForWork(world,kind){
  const p=ensureProgress(),cost=WORK_COST[kind]||0,key=TOOL_FOR[kind];syncToolDefs();
  if(p.energy<cost){toast('체력이 부족해요. 집의 침대에서 쉬거나 음식을 먹어 보세요.');return false;}
  if(key){const d=TOOL[key],t=p.tools[key];if(!t||t.dur<=0){toast(`${d.name}가 필요해요. 농장 제작대에서 만들어 보세요.`);return false;}t.dur=Math.max(0,t.dur-1);}
  p.energy=clamp(p.energy-cost,0,p.maxEnergy);persistProgress(p);return true;
}
function restoreEnergy(amount=100){const p=ensureProgress();p.energy=clamp(p.energy+amount,0,p.maxEnergy);persistProgress(p);}
function wrapInteraction(e,kind){
  const i=e?.interaction;if(!i||typeof i.action!=='function'||i.action.__progressWrapped)return;
  const original=i.action;
  function wrapped(t,w){if(!spendForWork(w,kind))return false;if((kind==='chop'||kind==='mine')&&t?.data)t.data.__usedTier=toolTier(ensureProgress(),kind==='chop'?'axe':'pick');return original(t,w);}
  wrapped.__progressWrapped=true;i.action=wrapped;
}
function patchWorkInteractions(world){
  for(const e of world.entities.all()){
    if(!e.active||!e.interaction)continue;
    if(e.type==='tree'&&!e.data?.workDestroyed)wrapInteraction(e,'chop');
    else if(e.type==='rock'&&!e.data?.workDestroyed)wrapInteraction(e,'mine');
    else if(e.type==='bug'&&!e.data?.caught)wrapInteraction(e,'net');
    else if(e.type==='fishing-spot')wrapInteraction(e,'fish');
  }
}

function cropState(p,id,type){let c=p.crops[id];if(!c||typeof c!=='object')c=p.crops[id]={type,phase:'empty',plantedAt:0,readyAt:0};c.type=type;return c;}
function growth(c,def){if(c.phase==='ripe')return 1;if(c.phase!=='growing'||!c.readyAt)return 0;const start=c.plantedAt||c.readyAt-def.grow;return clamp((Date.now()-start)/Math.max(1,c.readyAt-start),0,1);}
function cropRender(c,e){
  const p=ensureProgress(),st=cropState(p,e.id,e.data.cropType),def=CROP[st.type],g=growth(st,def);c.save();c.imageSmoothingEnabled=false;c.fillStyle='#765438';c.fillRect(e.x,e.y+e.h-8,e.w,8);
  if(st.phase==='empty'){c.strokeStyle='rgba(45,32,20,.35)';c.lineWidth=2;for(let x=e.x+8;x<e.x+e.w-4;x+=14){c.beginPath();c.moveTo(x,e.y+e.h-7);c.lineTo(x+7,e.y+e.h-2);c.stroke();}c.restore();return;}
  const scale=st.phase==='planted'?.28:st.phase==='ripe'?1:Math.max(.38,g),stemH=8+scale*23;
  for(let i=0;i<3;i++){const x=e.x+14+i*18,y=e.y+e.h-8;c.fillStyle=def.leaf;c.fillRect(x-2,y-stemH,5,stemH);c.fillRect(x-8,y-stemH+5,8,5);c.fillRect(x+3,y-stemH+10,8,5);if(st.phase==='ripe'){c.fillStyle=def.color;if(st.type==='carrot'){c.beginPath();c.moveTo(x-5,y-7);c.lineTo(x+5,y-7);c.lineTo(x,y+4);c.closePath();c.fill();}else{c.beginPath();c.arc(x,y-2,6,0,Math.PI*2);c.fill();}}}
  if(st.phase==='growing'){c.fillStyle='rgba(255,244,186,.9)';c.fillRect(e.x,e.y-10,e.w*g,4);}c.restore();
}
function setCropInteraction(world,e,st){
  const def=CROP[st.type];
  if(st.phase==='empty')e.interaction={label:`${def.name} 씨앗 심기`,action(t,w){const p=ensureProgress();if((p.seeds[st.type]||0)<=0){toast(`${def.name} 씨앗이 없어요.`);return;}p.seeds[st.type]--;st.phase='planted';st.plantedAt=Date.now();st.readyAt=0;persistProgress(p);const a=actor(w),f=t.centerX>=w.player.centerX?1:-1;a?.setPose?.('use',{duration:650,facing:f,rotation:f*.08,scaleY:.94});setTimeout(()=>a?.clearPose?.(),680);toast(`${def.name} 씨앗을 심었어요. 이제 물을 주세요.`);}};
  else if(st.phase==='planted')e.interaction={label:`${def.name}에 물주기`,action(t,w){if(!spendForWork(w,'water'))return;K.WorkAnimation?.perform?.(w,'water',t,{message:`${def.name}에 물을 줬어요.`,onHit(){const p=ensureProgress(),cs=cropState(p,t.id,st.type);cs.phase='growing';cs.plantedAt=Date.now();cs.readyAt=Date.now()+def.grow;t.data.watered=true;persistProgress(p);}});}};
  else if(st.phase==='growing'){const sec=Math.max(1,Math.ceil((st.readyAt-Date.now())/1000));e.interaction={label:`${def.name} 성장 중 · ${sec}초`,action(){toast(`${def.name}이 자라고 있어요. 약 ${sec}초 남았어요.`);}};}
  else e.interaction={label:`${def.name} 수확하기`,action(t,w){if(!spendForWork(w,'harvest'))return;K.WorkAnimation?.perform?.(w,'harvest',t,{message:`${def.name}을 수확했어요!`,onHit(){const p=ensureProgress(),cs=cropState(p,t.id,st.type);t.data.__carryHarvestSeen=true;t.data.harvested=false;K.CarryFishing?.spawnPickup?.(w,st.type,t.centerX,t.y+t.h-2,def.yield);cs.phase='empty';cs.plantedAt=0;cs.readyAt=0;p.seeds[st.type]=(p.seeds[st.type]||0)+1;persistProgress(p);}});}};
}
function patchCrops(world){
  const p=ensureProgress();
  PLOT_TYPES.forEach((type,i)=>{const e=world.entities.get(`work-crop-${i+1}`);if(!e)return;e.data.cropType=type;e.data.__progressManaged=true;e.render=cropRender;const st=cropState(p,e.id,type);if(st.phase==='growing'&&Date.now()>=st.readyAt){st.phase='ripe';persistProgress(p);}setCropInteraction(world,e,st);});
}

function installStarter(world){
  const p=ensureProgress(),inv=inventory(world),hasTool=Object.values(p.tools).some(t=>t&&t.dur>0),basic=(inv.wood||0)+(inv.stone||0);if(hasTool||basic>=5||world.entities.get('starter-mat-1'))return;
  const C=K.CarryFishing;if(!C?.spawnPickup)return;
  [['wood',2410,990],['wood',2490,1025],['wood',2570,985],['stone',2650,1028],['stone',2730,990],['stone',2810,1025]].forEach((v,i)=>C.spawnPickup(world,v[0],v[1],v[2],2,{id:`starter-mat-${i+1}`}));
}
function stationRender(c,e){c.save();c.imageSmoothingEnabled=false;c.fillStyle='#6d4b32';c.fillRect(e.x+4,e.y+17,e.w-8,e.h-17);c.strokeStyle='#2f2a24';c.lineWidth=3;c.strokeRect(e.x+5.5,e.y+18.5,e.w-11,e.h-20);c.fillStyle='#b68455';c.fillRect(e.x,e.y+8,e.w,17);c.strokeRect(e.x+1.5,e.y+9.5,e.w-3,14);c.fillStyle='#a9aaa1';c.fillRect(e.centerX-20,e.y,40,8);c.fillStyle='#3a3630';c.fillRect(e.centerX-3,e.y-7,6,15);c.restore();}
function setWorldInput(world,on){if(!world?.input)return;world.input.keys?.clear?.();world.input.enabled=on;}
function closeCraft(world){document.getElementById('world-v2-craft-panel')?.classList.remove('open');setWorldInput(world,true);}
function ensureCraftPanel(world){
  let panel=document.getElementById('world-v2-craft-panel');if(panel)return panel;
  const st=document.createElement('style');st.id='world-v2-progression-style';st.textContent=`#world-v2-status{position:absolute;right:14px;top:14px;z-index:7;width:230px;padding:9px;background:rgba(43,48,38,.94);border:3px solid #d0bb78;color:#fff1bf;font:900 11px system-ui;box-shadow:4px 4px 0 rgba(0,0,0,.25);pointer-events:none}.wv2bar{height:9px;background:#171b16;border:2px solid #d0bb78;margin:4px 0 6px}.wv2bar>i{display:block;height:100%;background:#8ebd69}.wv2tools{line-height:1.45}.wv2goal{margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,241,191,.45);font-weight:700}.wv2modal{position:absolute;inset:0;z-index:20;background:rgba(18,22,17,.72);display:none;place-items:center}.wv2modal.open{display:grid}.wv2card{width:min(650px,calc(100vw - 28px));max-height:82vh;overflow:auto;background:#f2e4b3;border:4px solid #34372b;box-shadow:8px 8px 0 rgba(0,0,0,.3);padding:14px;color:#303428}.wv2card h2{margin:0 0 8px}.wv2recipes{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.wv2recipe{border:3px solid #655f49;background:#fff3c7;padding:9px}.wv2recipe button,.wv2action{width:100%;margin-top:7px;padding:8px;border:2px solid #3e4d37;background:#dce9bd;font-weight:900;cursor:pointer}.wv2recipe button:disabled,.wv2action:disabled{opacity:.42}.wv2close{float:right;border:2px solid #554d39;background:#fff7d4;font-weight:900;padding:5px 9px;cursor:pointer}.wv2inv{font-size:11px;margin:8px 0;padding:7px;background:#dfd19f;border:2px solid #756c51}.wv2section{margin-top:12px;padding-top:10px;border-top:3px solid #756c51}.wv2heat{height:22px;border:3px solid #3e4038;background:linear-gradient(90deg,#7db7c5,#e5d276,#d87a54);position:relative;margin:12px 0}.wv2needle{position:absolute;top:-7px;width:4px;height:32px;background:#272820}.wv2chops{display:flex;gap:5px;margin:10px 0}.wv2chops i{display:block;width:24px;height:12px;border:2px solid #594a35;background:#d9c590}.wv2chops i.done{background:#83a85f}.wv2dex{display:flex;gap:6px;flex-wrap:wrap}.wv2dex span{border:2px solid #6b654e;padding:5px;background:#fff3c7}`;document.head.appendChild(st);
  const status=document.createElement('div');status.id='world-v2-status';document.getElementById('app')?.appendChild(status);
  panel=document.createElement('div');panel.id='world-v2-craft-panel';panel.className='wv2modal';panel.innerHTML='<div class="wv2card"><button class="wv2close">닫기</button><h2>제작대</h2><div class="wv2inv"></div><div class="wv2recipes"></div><div class="wv2section wv2iron"></div></div>';document.getElementById('app')?.appendChild(panel);
  panel.querySelector('.wv2close').onclick=()=>closeCraft(world);panel.addEventListener('pointerdown',e=>{if(e.target===panel)closeCraft(world);});panel.addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)craft(world,b.dataset.tool);const u=e.target.closest('[data-upgrade]');if(u)upgradeIron(world,u.dataset.upgrade);});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();closeCraft(world);}},true);return panel;
}
function panelInventory(world){const inv=inventory(world);return ['wood','stone','iron','potato','carrot','tomato','fish','bug'].filter(k=>(inv[k]||0)>0).map(k=>`${itemName(k)} ${inv[k]}`).join(' · ')||'보관 재료 없음';}
function renderCraftPanel(world){
  syncToolDefs();const panel=ensureCraftPanel(world),p=ensureProgress(),inv=inventory(world);
  panel.querySelector('.wv2inv').textContent=`보관함 · ${panelInventory(world)} / 씨앗 · 감자 ${p.seeds.potato} · 당근 ${p.seeds.carrot} · 토마토 ${p.seeds.tomato}`;
  panel.querySelector('.wv2recipes').innerHTML=Object.entries(TOOL).map(([k,d])=>{const t=p.tools[k],ok=have(inv,d.req);return `<div class="wv2recipe"><b>${d.name}</b><div>${reqText(d.req)}</div><div>내구도 ${t?.dur??0}/${d.max}</div><button data-tool="${k}" ${ok?'':'disabled'}>${t?'수리/재제작':'제작하기'}</button></div>`;}).join('');
  panel.querySelector('.wv2iron').innerHTML='<b>철도구 업그레이드</b><div class="wv2recipes">'+['axe','pick'].map(k=>{const u=IRON_UPGRADE[k],t=p.tools[k],iron=t?.tier==='iron',ok=!!t&&have(inv,u.req);return `<div class="wv2recipe"><b>${u.name}</b><div>${reqText(u.req)}</div><div>${iron?'현재 철도구 사용 중':'돌도구가 먼저 필요합니다.'}</div><button data-upgrade="${k}" ${ok?'':'disabled'}>${iron?'철도구 수리':'업그레이드'}</button></div>`;}).join('')+'</div>';
}
function openCraft(world){renderCraftPanel(world);ensureCraftPanel(world).classList.add('open');setWorldInput(world,false);}
function craft(world,key){const p=ensureProgress();syncToolDefs();const d=TOOL[key],inv=inventory(world);if(!d)return;if(!have(inv,d.req)){toast('재료가 부족해요.');renderCraftPanel(world);return;}consume(inv,d.req);p.tools[key]={dur:d.max,max:d.max,tier:d.tier,craftedAt:Date.now()};if(!p.crafted.includes(key))p.crafted.push(key);persistInventory(world);persistProgress(p);toast(`${d.name} 완성! 내구도 ${d.max}`);renderCraftPanel(world);}
function upgradeIron(world,key){const p=ensureProgress(),u=IRON_UPGRADE[key],inv=inventory(world),t=p.tools[key];if(!u||!t){toast('돌도구를 먼저 만들어야 해요.');return;}if(!have(inv,u.req)){toast('철광석과 목재가 부족해요.');return;}consume(inv,u.req);p.tools[key]={dur:u.max,max:u.max,tier:'iron',craftedAt:Date.now()};persistInventory(world);persistProgress(p);syncToolDefs();applyWorkBalance();toast(`${u.name} 완성! 작업 속도와 수확량이 좋아졌어요.`);renderCraftPanel(world);}
function installStation(world){if(world.entities.get('progress-craft-station'))return;world.spawn({id:'progress-craft-station',type:'crafting',x:2915,y:895,w:92,h:62,solid:true,tags:['outdoor','crafting'],render:stationRender,interactionRadius:110,interaction:{label:'제작대 사용하기',action(t,w){openCraft(w);}}});}

function ironRockRender(c,e){c.save();c.imageSmoothingEnabled=false;c.fillStyle='#606b6a';c.strokeStyle='#292e2c';c.lineWidth=3;c.beginPath();c.moveTo(e.x+4,e.y+e.h-3);c.lineTo(e.x+9,e.y+10);c.lineTo(e.x+27,e.y+2);c.lineTo(e.x+e.w-5,e.y+13);c.lineTo(e.x+e.w-2,e.y+e.h-4);c.closePath();c.fill();c.stroke();c.fillStyle='#bac9c5';c.fillRect(e.x+14,e.y+12,9,5);c.fillRect(e.x+31,e.y+20,8,5);c.fillStyle='#8da19e';c.fillRect(e.x+23,e.y+28,11,5);c.restore();}
function installIronVeins(world){
  const pos=[[3190,420],[3260,735],[3115,980]];
  pos.forEach((p,i)=>{if(world.entities.get(`iron-vein-${i+1}`))return;const e=world.spawn({id:`iron-vein-${i+1}`,type:'rock',x:p[0],y:p[1],w:52,h:40,solid:true,tags:['outdoor','iron-vein'],data:{resource:'iron',scale:.7},render:ironRockRender});K.WorkAnimation?.bindResource?.(e,'mine',3);});
}
function spawnIronChunk(world,x,y,qty=1){
  const id=`iron-chunk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
  world.spawn({id,type:'iron-pickup',x:x-18,y:y-14,w:36,h:28,solid:false,tags:['outdoor'],interactionRadius:90,data:{qty},render(c,e){const b=Math.sin(performance.now()/230+e.x*.01)*2;c.save();c.translate(0,b);c.fillStyle='#788684';c.strokeStyle='#2d3331';c.lineWidth=2;c.beginPath();c.moveTo(e.x+3,e.y+20);c.lineTo(e.x+8,e.y+5);c.lineTo(e.x+23,e.y+2);c.lineTo(e.x+33,e.y+14);c.lineTo(e.x+27,e.y+25);c.closePath();c.fill();c.stroke();c.fillStyle='#d1dfdb';c.fillRect(e.x+12,e.y+9,7,4);c.restore();},interaction:{label:`철광석 ${qty}개 줍기`,action(t,w){const inv=inventory(w);inv.iron=(inv.iron||0)+qty;persistInventory(w);w.entities.remove(t.id);toast(`철광석 +${qty}`);}}});
}
function resetResource(e,kind){
  e.data.workDestroyed=false;e.data.workHp=e.data.workMaxHp||((kind==='mine')?2:3);e.data.__carryYieldSpawned=false;e.data.__destroyedAt=0;e.data.__finalBonus=false;e.data.__ironGranted=false;e.data.__usedTier='';e.solid=true;
  e.interaction={label:`${kind==='chop'?'도끼질하기':'곡괭이질하기'} · ${e.data.workHp}`,action(t,w){K.WorkAnimation?.perform?.(w,kind,t);}};
}
function resourceLifecycle(world){
  const now=Date.now();
  for(const e of world.entities.all()){
    if((e.type!=='tree'&&e.type!=='rock')||!e.data?.workDestroyed)continue;
    const kind=e.type==='tree'?'chop':'mine';if(!e.data.__destroyedAt)e.data.__destroyedAt=now;
    if(e.data.resource==='iron'&&!e.data.__ironGranted){e.data.__ironGranted=true;const q=e.data.__usedTier==='iron'?2:1;spawnIronChunk(world,e.centerX,e.y+e.h-3,q);}
    if(e.data.resource!=='iron'&&e.data.__usedTier==='iron'&&!e.data.__finalBonus){e.data.__finalBonus=true;K.CarryFishing?.spawnPickup?.(world,e.type==='tree'?'wood':'stone',e.centerX+28,e.y+e.h-4,1);}
    const wait=e.data.resource==='iron'?70000:e.type==='tree'?90000:75000;if(now-e.data.__destroyedAt>=wait)resetResource(e,kind);
  }
}

function patchBed(world){const bed=world.entities.get('bed');if(!bed?.interaction?.action||bed.interaction.action.__restWrapped)return;const original=bed.interaction.action;function wrapped(t,w){const r=original(t,w);setTimeout(()=>{restoreEnergy(100);toast('푹 쉬어서 체력이 모두 회복됐어요.');},2450);return r;}wrapped.__restWrapped=true;bed.interaction.action=wrapped;}
function animateFurniture(world,e,type,duration=460){const now=performance.now();e.data=e.data||{};e.data.lifeAnim={kind:type,start:now,end:now+duration};const a=actor(world),f=e.centerX>=world.player.centerX?1:-1;a?.setPose?.(type==='stove'||type==='counter'?'cook':'use',{duration,facing:f,rotation:f*.04,bob:.25});}

function closeKitchen(world){const rt=runtime.get(world);if(rt?.heatTimer){clearInterval(rt.heatTimer);rt.heatTimer=0;const p=ensureProgress();if(p.kitchen?.pending?.step==='heating'){p.kitchen.pending.step='ready';p.kitchen.pending.temp=20;persistProgress(p);}}document.getElementById('world-v2-kitchen-panel')?.classList.remove('open');setWorldInput(world,true);}
function ensureKitchenPanel(world){
  let panel=document.getElementById('world-v2-kitchen-panel');if(panel)return panel;
  panel=document.createElement('div');panel.id='world-v2-kitchen-panel';panel.className='wv2modal';panel.innerHTML='<div class="wv2card"><button class="wv2close">닫기</button><div class="wv2kitchen"></div></div>';document.getElementById('app')?.appendChild(panel);
  panel.querySelector('.wv2close').onclick=()=>closeKitchen(world);panel.addEventListener('pointerdown',e=>{if(e.target===panel)closeKitchen(world);});
  panel.addEventListener('click',e=>{const r=e.target.closest('[data-recipe]');if(r)startRecipe(world,r.dataset.recipe);const ch=e.target.closest('[data-chop]');if(ch)chopRecipe(world);const heat=e.target.closest('[data-heat]');if(heat)startHeat(world);const stop=e.target.closest('[data-stop]');if(stop)stopHeat(world);const eat=e.target.closest('[data-eat]');if(eat)eatMeal(world,eat.dataset.eat);});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();closeKitchen(world);}},true);return panel;
}
function foodLabel(key){const [recipe,quality]=key.split('|'),r=RECIPES[recipe];return `${quality==='perfect'?'완벽한':quality==='good'?'잘 익은':quality==='under'?'덜 익은':'조금 탄'} ${r?.name||recipe}`;}
function renderKitchen(world,mode){
  const panel=ensureKitchenPanel(world),box=panel.querySelector('.wv2kitchen'),p=ensureProgress(),inv=inventory(world),pending=p.kitchen.pending;
  if(mode==='fridge'){
    const ingredients=['potato','carrot','tomato','fish'].map(k=>`${itemName(k)} ${inv[k]||0}`).join(' · '),meals=Object.entries(p.food).filter(([,v])=>v>0).map(([k,v])=>`${foodLabel(k)} ${v}`).join('<br>')||'완성된 음식 없음',dex=FISH.map(f=>`<span>${p.fishDex[f.name]?`${f.name} ${p.fishDex[f.name]}회`:'???'}</span>`).join('');
    box.innerHTML=`<h2>냉장고</h2><div class="wv2inv">${ingredients}</div><div class="wv2section"><b>완성 음식</b><div>${meals}</div></div><div class="wv2section"><b>물고기 도감</b><div class="wv2dex">${dex}</div></div>`;
  }else if(mode==='counter'){
    if(pending){const r=RECIPES[pending.key];if(pending.step==='prep'){box.innerHTML=`<h2>${r.name} 준비</h2><div>${reqText(r.req)}</div><div class="wv2chops">${Array.from({length:r.chops},(_,i)=>`<i class="${i<pending.chops?'done':''}"></i>`).join('')}</div><button class="wv2action" data-chop>칼질하기</button><p>필요 횟수만큼 썰면 가스레인지에서 가열할 수 있어요.</p>`;}else box.innerHTML=`<h2>${r.name}</h2><p>재료 준비가 끝났어요. 가스레인지로 이동해 가열하세요.</p>`;}
    else box.innerHTML=`<h2>조리대 · 메뉴 선택</h2><div class="wv2inv">${panelInventory(world)}</div><div class="wv2recipes">${Object.entries(RECIPES).map(([k,r])=>`<div class="wv2recipe"><b>${r.name}</b><div>${reqText(r.req)}</div><button data-recipe="${k}" ${have(inv,r.req)?'':'disabled'}>재료 준비</button></div>`).join('')}</div>`;
  }else if(mode==='stove'){
    if(!pending||!['ready','heating'].includes(pending.step)){box.innerHTML='<h2>가스레인지</h2><p>먼저 조리대에서 재료를 준비해 주세요.</p>';}
    else{const r=RECIPES[pending.key],temp=Math.round(pending.temp||20);box.innerHTML=`<h2>${r.name} 가열</h2><div>적정 온도 ${r.heat[0]}~${r.heat[1]}℃</div><div class="wv2heat"><i class="wv2needle" style="left:${clamp(temp,0,100)}%"></i></div><b class="wv2temp">현재 ${temp}℃</b>${pending.step==='ready'?'<button class="wv2action" data-heat>불 켜기</button>':'<button class="wv2action" data-stop>불 끄기</button>'}`;}
  }else{
    const entries=Object.entries(p.food).filter(([,v])=>v>0);box.innerHTML=`<h2>식탁 · 식사하기</h2>${entries.length?`<div class="wv2recipes">${entries.map(([k,v])=>{const [rk,q]=k.split('|'),r=RECIPES[rk],bonus=q==='perfect'?10:q==='burnt'?-10:q==='under'?-5:0;return `<div class="wv2recipe"><b>${foodLabel(k)}</b><div>${v}개 · 체력 +${Math.max(10,r.energy+bonus)}</div><button data-eat="${k}">먹기</button></div>`;}).join('')}</div>`:'<p>먹을 음식이 없어요. 조리대와 가스레인지에서 요리해 보세요.</p>'}`;
  }
}
function openKitchen(world,mode,e){animateFurniture(world,e,mode==='table'?'diningTable':mode);const panel=ensureKitchenPanel(world);renderKitchen(world,mode);panel.dataset.mode=mode;panel.classList.add('open');setWorldInput(world,false);}
function startRecipe(world,key){const r=RECIPES[key],inv=inventory(world),p=ensureProgress();if(!r||!have(inv,r.req)){toast('재료가 부족해요.');renderKitchen(world,'counter');return;}consume(inv,r.req);persistInventory(world);p.kitchen.pending={key,step:'prep',chops:0,temp:20};persistProgress(p);actor(world)?.play?.('smile',350);renderKitchen(world,'counter');}
function chopRecipe(world){const p=ensureProgress(),x=p.kitchen.pending;if(!x||x.step!=='prep')return;const r=RECIPES[x.key];x.chops++;actor(world)?.play?.('smile',180);if(x.chops>=r.chops){x.step='ready';toast('재료 준비 완료! 가스레인지로 가져가세요.');}persistProgress(p);renderKitchen(world,'counter');}
function startHeat(world){const p=ensureProgress(),x=p.kitchen.pending;if(!x||x.step!=='ready')return;const rt=runtime.get(world);x.step='heating';x.temp=20;persistProgress(p);renderKitchen(world,'stove');clearInterval(rt.heatTimer);rt.heatTimer=setInterval(()=>{const q=ensureProgress().kitchen.pending;if(!q||q.step!=='heating'){clearInterval(rt.heatTimer);rt.heatTimer=0;return;}q.temp=Math.min(100,(q.temp||20)+2.2);const panel=document.getElementById('world-v2-kitchen-panel'),needle=panel?.querySelector('.wv2needle'),label=panel?.querySelector('.wv2temp');if(needle)needle.style.left=q.temp+'%';if(label)label.textContent=`현재 ${Math.round(q.temp)}℃`;if(q.temp>=100)stopHeat(world);},180);}
function stopHeat(world){const p=ensureProgress(),x=p.kitchen.pending;if(!x||x.step!=='heating')return;const rt=runtime.get(world);if(rt.heatTimer){clearInterval(rt.heatTimer);rt.heatTimer=0;}const r=RECIPES[x.key],t=x.temp||20;let q='good';if(t>=r.heat[0]&&t<=r.heat[1])q='perfect';else if(t<r.heat[0])q='under';else if(t>r.heat[1]+12)q='burnt';const key=`${x.key}|${q}`;p.food[key]=(p.food[key]||0)+1;p.kitchen.pending=null;persistProgress(p);toast(`${foodLabel(key)} 완성! 식탁에서 먹을 수 있어요.`);renderKitchen(world,'stove');actor(world)?.play?.('smile',520);}
function eatMeal(world,key){const p=ensureProgress(),n=p.food[key]||0;if(n<=0)return;const [rk,q]=key.split('|'),r=RECIPES[rk];p.food[key]=n-1;persistProgress(p);const bonus=q==='perfect'?10:q==='burnt'?-10:q==='under'?-5:0;restoreEnergy(Math.max(10,r.energy+bonus));toast(`${foodLabel(key)}을 먹고 체력을 회복했어요.`);renderKitchen(world,'table');actor(world)?.play?.('smile',500);}
function patchKitchenFurniture(world){
  const map={fridge:'fridge',counter:'counter',stove:'stove',table:'table'};
  Object.entries(map).forEach(([id,mode])=>{const e=world.entities.get(id);if(!e||e.data.__kitchenPatched)return;e.data.__kitchenPatched=true;e.interaction={label:mode==='fridge'?'냉장고 열기':mode==='counter'?'요리 준비하기':mode==='stove'?'가열하기':'식사하기',action(t,w){openKitchen(w,mode,t);}};});
}

function rollFish(){let n=Math.random()*100;for(const f of FISH){n-=f.weight;if(n<=0)return f;}return FISH[0];}
function trackFish(world){const st=carry(world),h=st?.held;if(!h||h.item!=='fish'||h.__speciesAssigned)return;h.__speciesAssigned=true;const f=rollFish(),p=ensureProgress();p.fishDex[f.name]=(p.fishDex[f.name]||0)+1;persistProgress(p);toast(`${f.rarity} 물고기 · ${f.name}을 잡았어요!`);}
function carrySpeed(world){const rt=runtime.get(world),h=carry(world)?.held;if(!rt)return;if(!h){world.playerSpeed=rt.baseSpeed;return;}const qty=Math.max(1,Number(h.qty)||1);world.playerSpeed=Math.max(170,rt.baseSpeed-(qty>1?50:28));}
function regen(world,dt){const rt=runtime.get(world);rt.regen+=dt;if(rt.regen<2.8)return;rt.regen=0;if(K.WorkAnimation?.active?.has(world)||carry(world)?.fishing)return;const p=ensureProgress();if(p.energy<p.maxEnergy){p.energy=Math.min(p.maxEnergy,p.energy+1);persistProgress(p);}}
function objective(p,inv){if(!p.tools.axe||!p.tools.pick)return '다음 목표 · 시작 재료를 상자에 넣고 돌도구 만들기';if(toolTier(p,'axe')!=='iron'||toolTier(p,'pick')!=='iron')return '다음 목표 · 철광맥을 캐서 철도구로 업그레이드';if(!(inv.potato||inv.carrot||inv.tomato))return '다음 목표 · 밭에서 작물을 길러 보관하기';if(!Object.keys(p.fishDex).length)return '다음 목표 · 연못에서 물고기 발견하기';if(!Object.values(p.food).some(v=>v>0))return '다음 목표 · 집 조리대와 가스레인지에서 요리하기';return '생활 루프 완성 · 원하는 활동을 자유롭게 이어가세요.';}
function updateStatus(world){syncToolDefs();const p=ensureProgress(),el=document.getElementById('world-v2-status');if(!el)return;const pct=Math.round(p.energy/p.maxEnergy*100),tools=Object.entries(TOOL).map(([k,d])=>{const t=p.tools[k];return `${d.name} ${t?`${t.dur}/${d.max}`:'없음'}`;}).join('<br>');el.innerHTML=`체력 ${Math.round(p.energy)}/${p.maxEnergy}<div class="wv2bar"><i style="width:${pct}%"></i></div><div class="wv2tools">${tools}</div><div class="wv2goal">${objective(p,inventory(world))}</div>`;}
function extendItems(){const I=K.CarryFishing?.ITEM;if(!I)return;I.potato={name:'감자',color:CROP.potato.color,accent:CROP.potato.leaf};I.carrot={name:'당근',color:CROP.carrot.color,accent:CROP.carrot.leaf};I.tomato={name:'토마토',color:CROP.tomato.color,accent:CROP.tomato.leaf};I.iron={name:'철광석',color:'#7f8c8a',accent:'#d1dfdb'};}

function install(world){
  if(!world||world.__progressionInstalled)return false;world.__progressionInstalled=true;runtime.set(world,{regen:0,heatTimer:0,baseSpeed:world.playerSpeed});ensureProgress();ensureCraftPanel(world);ensureKitchenPanel(world);extendItems();installStation(world);installStarter(world);installIronVeins(world);patchBed(world);syncToolDefs();applyWorkBalance();
  world.events.on('update',({dt})=>{extendItems();syncToolDefs();applyWorkBalance();patchWorkInteractions(world);patchCrops(world);patchBed(world);patchKitchenFurniture(world);resourceLifecycle(world);trackFish(world);carrySpeed(world);regen(world,dt);updateStatus(world);});updateStatus(world);return true;
}
function autoInstall(){let tries=0;const timer=setInterval(()=>{const w=K.activeWorld||root.__kidscadeWorldV2;if(w?.player&&K.WorkAnimation&&K.CarryFishing){clearInterval(timer);install(w);}else if(++tries>240)clearInterval(timer);},50);}

K.Progression={installed:true,TOOL,IRON_UPGRADE,CROP,RECIPES,FISH,WORK_COST,install,craft,upgradeIron,openCraft,closeCraft,spendForWork,restoreEnergy,ensureProgress,openKitchen};
autoInstall();
})(window);