/* Kidscade World v2 - crafting / stamina / tool durability / crop growth.
   Uses only kidscade_world_v2 state and never mutates the legacy garden or seed wallet. */
(function(root){
'use strict';
const K=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
if(K.Progression?.installed)return;

const TOOL={
  axe:{name:'돌도끼',max:18,req:{wood:3,stone:2},work:'chop'},
  pick:{name:'돌곡괭이',max:18,req:{wood:2,stone:3},work:'mine'},
  net:{name:'곤충채집망',max:14,req:{wood:2,stone:1},work:'net'},
  rod:{name:'낚싯대',max:16,req:{wood:3,stone:1},work:'fish'}
};
const CROP={
  potato:{name:'감자',grow:35000,yield:2,color:'#d8b46c',leaf:'#71954d'},
  carrot:{name:'당근',grow:50000,yield:3,color:'#df8344',leaf:'#66904b'},
  tomato:{name:'토마토',grow:70000,yield:3,color:'#cb604e',leaf:'#638c4d'}
};
const WORK_COST={chop:4,mine:5,water:2,harvest:2,net:3,fish:3};
const TOOL_FOR={chop:'axe',mine:'pick',net:'net',fish:'rod'};
const PLOT_TYPES=['potato','carrot','tomato'];
const runtime=new WeakMap();

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function toast(text){const el=document.getElementById('toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(el.__progToast);el.__progToast=setTimeout(()=>el.classList.remove('show'),1550);}
function actor(world){return world?.player?.__kidscadeAvatarActor||null;}
function carrying(world){return K.CarryFishing?.states?.get(world)||null;}
function save(){return K.Storage?.load?.()||{};}
function ensureProgress(){
  const s=save(),p=s.progression||{};
  p.maxEnergy=Math.max(50,Number(p.maxEnergy)||100);p.energy=clamp(Number(p.energy??p.maxEnergy),0,p.maxEnergy);
  p.tools=p.tools&&typeof p.tools==='object'?p.tools:{};
  p.seeds={potato:2,carrot:2,tomato:2,...(p.seeds||{})};
  p.crops=p.crops&&typeof p.crops==='object'?p.crops:{};
  p.crafted=Array.isArray(p.crafted)?p.crafted:[];
  s.progression=p;K.Storage?.save?.(s);return p;
}
function persistProgress(p){const s=save();s.progression=p;K.Storage?.save?.(s);}
function inventory(world){
  const cs=carrying(world);if(cs)return cs.inventory;
  const s=save();return s.inventory||(s.inventory={});
}
function persistInventory(world){
  const inv=inventory(world),s=save();s.inventory={...inv};K.Storage?.save?.(s);
}
function have(inv,req){return Object.entries(req).every(([k,v])=>(Number(inv[k])||0)>=v);}
function consume(inv,req){Object.entries(req).forEach(([k,v])=>inv[k]=Math.max(0,(Number(inv[k])||0)-v));}
function reqText(req){return Object.entries(req).map(([k,v])=>`${itemName(k)} ${v}`).join(' · ');}
function itemName(k){return ({wood:'목재',stone:'돌',potato:'감자',carrot:'당근',tomato:'토마토',fish:'물고기',bug:'곤충',crop:'수확물'})[k]||k;}
function workTool(kind){return TOOL_FOR[kind]||null;}

function spendForWork(world,kind){
  const p=ensureProgress(),cost=WORK_COST[kind]||0,toolKey=workTool(kind);
  if(p.energy<cost){toast('체력이 부족해요. 집의 침대에서 쉬어 보세요.');return false;}
  if(toolKey){
    const def=TOOL[toolKey],t=p.tools[toolKey];
    if(!t||t.dur<=0){toast(`${def.name}가 필요해요. 농장 제작대에서 만들어 보세요.`);return false;}
    t.dur=Math.max(0,t.dur-1);
  }
  p.energy=clamp(p.energy-cost,0,p.maxEnergy);persistProgress(p);return true;
}
function restoreEnergy(amount=100){const p=ensureProgress();p.energy=clamp(p.energy+amount,0,p.maxEnergy);persistProgress(p);}

function wrapInteraction(e,kind){
  const i=e?.interaction;if(!i||typeof i.action!=='function'||i.action.__progressWrapped)return;
  const original=i.action;
  function wrapped(t,w){if(!spendForWork(w,kind))return false;return original(t,w);}wrapped.__progressWrapped=true;
  i.action=wrapped;
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

function cropState(p,id,type){
  let c=p.crops[id];
  if(!c||typeof c!=='object')c=p.crops[id]={type,phase:'empty',plantedAt:0,readyAt:0};
  c.type=type;return c;
}
function growth(c,def){if(c.phase==='ripe')return 1;if(c.phase!=='growing'||!c.readyAt)return 0;const start=c.plantedAt||c.readyAt-def.grow;return clamp((Date.now()-start)/Math.max(1,c.readyAt-start),0,1);}
function cropRender(c,e){
  const p=ensureProgress(),st=cropState(p,e.id,e.data.cropType),def=CROP[st.type],g=growth(st,def);c.save();c.imageSmoothingEnabled=false;
  c.fillStyle='#765438';c.fillRect(e.x,e.y+e.h-8,e.w,8);
  if(st.phase==='empty'){c.strokeStyle='rgba(45,32,20,.35)';c.lineWidth=2;for(let x=e.x+8;x<e.x+e.w-4;x+=14){c.beginPath();c.moveTo(x,e.y+e.h-7);c.lineTo(x+7,e.y+e.h-2);c.stroke();}c.restore();return;}
  const scale=st.phase==='planted'?.28:st.phase==='ripe'?1:Math.max(.38,g);const stemH=8+scale*23;
  for(let i=0;i<3;i++){const x=e.x+14+i*18,y=e.y+e.h-8;c.fillStyle=def.leaf;c.fillRect(x-2,y-stemH,5,stemH);c.fillRect(x-8,y-stemH+5,8,5);c.fillRect(x+3,y-stemH+10,8,5);if(st.phase==='ripe'){c.fillStyle=def.color;if(st.type==='carrot'){c.beginPath();c.moveTo(x-5,y-7);c.lineTo(x+5,y-7);c.lineTo(x,y+4);c.closePath();c.fill();}else{c.beginPath();c.arc(x,y-2,6,0,Math.PI*2);c.fill();}}}
  if(st.phase==='growing'){c.fillStyle='rgba(255,244,186,.9)';c.fillRect(e.x,e.y-10,e.w*g,4);}
  c.restore();
}
function setCropInteraction(world,e,p,st){
  const def=CROP[st.type];
  if(st.phase==='empty'){
    e.interaction={label:`${def.name} 씨앗 심기`,action(t,w){const q=ensureProgress();if((q.seeds[st.type]||0)<=0){toast(`${def.name} 씨앗이 없어요.`);return;}q.seeds[st.type]--;st.phase='planted';st.plantedAt=Date.now();st.readyAt=0;persistProgress(q);const a=actor(w);a?.setPose?.('use',{duration:650,facing:1,rotation:.08,scaleY:.94});setTimeout(()=>a?.clearPose?.(),680);toast(`${def.name} 씨앗을 심었어요. 이제 물을 주세요.`);}};
  }else if(st.phase==='planted'){
    e.interaction={label:`${def.name}에 물주기`,action(t,w){if(!spendForWork(w,'water'))return;K.WorkAnimation?.perform?.(w,'water',t,{message:`${def.name}에 물을 줬어요.`,onHit(){const q=ensureProgress(),cs=cropState(q,t.id,st.type);cs.phase='growing';cs.plantedAt=Date.now();cs.readyAt=Date.now()+def.grow;t.data.watered=true;persistProgress(q);}});}};
  }else if(st.phase==='growing'){
    const sec=Math.max(1,Math.ceil((st.readyAt-Date.now())/1000));e.interaction={label:`${def.name} 성장 중 · ${sec}초`,action(){toast(`${def.name}이 자라고 있어요. 약 ${sec}초 남았어요.`);}};
  }else{
    e.interaction={label:`${def.name} 수확하기`,action(t,w){if(!spendForWork(w,'harvest'))return;K.WorkAnimation?.perform?.(w,'harvest',t,{message:`${def.name}을 수확했어요!`,onHit(){const q=ensureProgress(),cs=cropState(q,t.id,st.type);t.data.__carryHarvestSeen=true;t.data.harvested=false;K.CarryFishing?.spawnPickup?.(w,st.type,t.centerX,t.y+t.h-2,def.yield);cs.phase='empty';cs.plantedAt=0;cs.readyAt=0;q.seeds[st.type]=(q.seeds[st.type]||0)+1;persistProgress(q);}});}};
  }
}
function patchCrops(world){
  const p=ensureProgress();
  PLOT_TYPES.forEach((type,i)=>{const e=world.entities.get(`work-crop-${i+1}`);if(!e)return;e.data.cropType=type;e.data.__progressManaged=true;e.render=cropRender;const st=cropState(p,e.id,type);if(st.phase==='growing'&&Date.now()>=st.readyAt){st.phase='ripe';persistProgress(p);}setCropInteraction(world,e,p,st);});
}

function installStarter(world){
  const p=ensureProgress(),inv=inventory(world),hasTool=Object.values(p.tools).some(t=>t&&t.dur>0),basic=(inv.wood||0)+(inv.stone||0);
  if(hasTool||basic>=5||world.entities.get('starter-mat-1'))return;
  const C=K.CarryFishing;if(!C?.spawnPickup)return;
  C.spawnPickup(world,'wood',2410,990,2,{id:'starter-mat-1'});C.spawnPickup(world,'wood',2490,1025,2,{id:'starter-mat-2'});C.spawnPickup(world,'wood',2570,985,2,{id:'starter-mat-3'});
  C.spawnPickup(world,'stone',2650,1028,2,{id:'starter-mat-4'});C.spawnPickup(world,'stone',2730,990,2,{id:'starter-mat-5'});C.spawnPickup(world,'stone',2810,1025,2,{id:'starter-mat-6'});
}

function stationRender(c,e){c.save();c.imageSmoothingEnabled=false;c.fillStyle='#6d4b32';c.fillRect(e.x+4,e.y+17,e.w-8,e.h-17);c.strokeStyle='#2f2a24';c.lineWidth=3;c.strokeRect(e.x+5.5,e.y+18.5,e.w-11,e.h-20);c.fillStyle='#b68455';c.fillRect(e.x,e.y+8,e.w,17);c.strokeRect(e.x+1.5,e.y+9.5,e.w-3,14);c.fillStyle='#a9aaa1';c.fillRect(e.centerX-20,e.y,40,8);c.fillStyle='#3a3630';c.fillRect(e.centerX-3,e.y-7,6,15);c.restore();}
function ensurePanel(world){
  let panel=document.getElementById('world-v2-craft-panel');if(panel)return panel;
  const st=document.createElement('style');st.id='world-v2-progression-style';st.textContent=`#world-v2-status{position:absolute;right:14px;top:14px;z-index:7;width:210px;padding:9px;background:rgba(43,48,38,.94);border:3px solid #d0bb78;color:#fff1bf;font:900 11px system-ui;box-shadow:4px 4px 0 rgba(0,0,0,.25);pointer-events:none}.wv2bar{height:9px;background:#171b16;border:2px solid #d0bb78;margin:4px 0 6px}.wv2bar>i{display:block;height:100%;background:#8ebd69}.wv2tools{line-height:1.45}.wv2craft{position:absolute;inset:0;z-index:20;background:rgba(18,22,17,.72);display:none;place-items:center}.wv2craft.open{display:grid}.wv2card{width:min(620px,calc(100vw - 28px));max-height:80vh;overflow:auto;background:#f2e4b3;border:4px solid #34372b;box-shadow:8px 8px 0 rgba(0,0,0,.3);padding:14px;color:#303428}.wv2craft h2{margin:0 0 8px}.wv2recipes{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.wv2recipe{border:3px solid #655f49;background:#fff3c7;padding:9px}.wv2recipe button{width:100%;margin-top:7px;padding:7px;border:2px solid #3e4d37;background:#dce9bd;font-weight:900;cursor:pointer}.wv2close{float:right;border:2px solid #554d39;background:#fff7d4;font-weight:900;padding:5px 9px;cursor:pointer}.wv2inv{font-size:11px;margin:8px 0;padding:7px;background:#dfd19f;border:2px solid #756c51}`;document.head.appendChild(st);
  const status=document.createElement('div');status.id='world-v2-status';document.getElementById('app')?.appendChild(status);
  panel=document.createElement('div');panel.id='world-v2-craft-panel';panel.className='wv2craft';panel.innerHTML='<div class="wv2card"><button class="wv2close">닫기</button><h2>제작대</h2><div class="wv2inv"></div><div class="wv2recipes"></div></div>';document.getElementById('app')?.appendChild(panel);
  panel.querySelector('.wv2close').onclick=()=>panel.classList.remove('open');panel.addEventListener('pointerdown',e=>{if(e.target===panel)panel.classList.remove('open');});
  panel.addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)craft(world,b.dataset.tool);});return panel;
}
function panelInventory(world){const inv=inventory(world);return ['wood','stone','potato','carrot','tomato','fish','bug'].filter(k=>(inv[k]||0)>0).map(k=>`${itemName(k)} ${inv[k]}`).join(' · ')||'보관 재료 없음';}
function renderPanel(world){const panel=ensurePanel(world),p=ensureProgress(),inv=inventory(world);panel.querySelector('.wv2inv').textContent=`보관함 · ${panelInventory(world)} / 씨앗 · 감자 ${p.seeds.potato} · 당근 ${p.seeds.carrot} · 토마토 ${p.seeds.tomato}`;panel.querySelector('.wv2recipes').innerHTML=Object.entries(TOOL).map(([k,d])=>{const t=p.tools[k],ok=have(inv,d.req);return `<div class="wv2recipe"><b>${d.name}</b><div>${reqText(d.req)}</div><div>내구도 ${t?.dur??0}/${d.max}</div><button data-tool="${k}" ${ok?'':'disabled'}>${t?'수리/재제작':'제작하기'}</button></div>`;}).join('');}
function openCraft(world){renderPanel(world);ensurePanel(world).classList.add('open');}
function craft(world,key){const d=TOOL[key];if(!d)return;const inv=inventory(world),p=ensureProgress();if(!have(inv,d.req)){toast('재료가 부족해요.');renderPanel(world);return;}consume(inv,d.req);p.tools[key]={dur:d.max,max:d.max,craftedAt:Date.now()};if(!p.crafted.includes(key))p.crafted.push(key);persistInventory(world);persistProgress(p);toast(`${d.name} 완성! 내구도 ${d.max}`);renderPanel(world);}
function installStation(world){if(world.entities.get('progress-craft-station'))return;world.spawn({id:'progress-craft-station',type:'crafting',x:2915,y:895,w:92,h:62,solid:true,tags:['outdoor','crafting'],render:stationRender,interactionRadius:110,interaction:{label:'제작대 사용하기',action(t,w){openCraft(w);}}});}

function patchBed(world){const bed=world.entities.get('bed');if(!bed?.interaction?.action||bed.interaction.action.__restWrapped)return;const original=bed.interaction.action;function wrapped(t,w){const r=original(t,w);setTimeout(()=>{restoreEnergy(100);toast('푹 쉬어서 체력이 모두 회복됐어요.');},2450);return r;}wrapped.__restWrapped=true;bed.interaction.action=wrapped;}
function updateStatus(world){const p=ensureProgress(),el=document.getElementById('world-v2-status');if(!el)return;const pct=Math.round(p.energy/p.maxEnergy*100);const tools=Object.entries(TOOL).map(([k,d])=>{const t=p.tools[k];return `${d.name} ${t?`${t.dur}/${d.max}`:'없음'}`;}).join('<br>');el.innerHTML=`체력 ${Math.round(p.energy)}/${p.maxEnergy}<div class="wv2bar"><i style="width:${pct}%"></i></div><div class="wv2tools">${tools}</div>`;}
function regen(world,dt){const r=runtime.get(world);r.regen+=dt;if(r.regen<2.8)return;r.regen=0;if(K.WorkAnimation?.active?.has(world)||K.CarryFishing?.states?.get(world)?.fishing)return;const p=ensureProgress();if(p.energy<p.maxEnergy){p.energy=Math.min(p.maxEnergy,p.energy+1);persistProgress(p);}}
function extendItems(){const I=K.CarryFishing?.ITEM;if(!I)return;I.potato={name:'감자',color:CROP.potato.color,accent:CROP.potato.leaf};I.carrot={name:'당근',color:CROP.carrot.color,accent:CROP.carrot.leaf};I.tomato={name:'토마토',color:CROP.tomato.color,accent:CROP.tomato.leaf};}
function install(world){
  if(!world||world.__progressionInstalled)return false;world.__progressionInstalled=true;runtime.set(world,{regen:0});ensureProgress();ensurePanel(world);extendItems();installStation(world);installStarter(world);patchBed(world);
  world.events.on('update',({dt})=>{extendItems();patchWorkInteractions(world);patchCrops(world);patchBed(world);regen(world,dt);updateStatus(world);});updateStatus(world);return true;
}
function autoInstall(){let tries=0;const timer=setInterval(()=>{const w=K.activeWorld||root.__kidscadeWorldV2;if(w?.player&&K.WorkAnimation&&K.CarryFishing){clearInterval(timer);install(w);}else if(++tries>240)clearInterval(timer);},50);}

K.Progression={installed:true,TOOL,CROP,WORK_COST,install,craft,openCraft,spendForWork,restoreEnergy,ensureProgress};
autoInstall();
})(window);
