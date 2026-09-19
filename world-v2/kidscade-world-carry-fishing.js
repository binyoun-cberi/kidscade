/* Kidscade World v2 - carry / storage / fishing loop.
   Uses the current Deluxe avatar and works on top of WorkAnimation yields. */
(function(root){
'use strict';
const K=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
if(K.CarryFishing?.installed)return;

const ITEM={
  wood:{name:'목재',color:'#9a6842',accent:'#d1a06b'},
  stone:{name:'돌',color:'#8f938e',accent:'#c1c4bd'},
  iron:{name:'철광석',color:'#7f8c8a',accent:'#d1dfdb'},
  crop:{name:'수확물',color:'#d88b3d',accent:'#74a456'},
  potato:{name:'감자',color:'#d8b46c',accent:'#71954d'},
  carrot:{name:'당근',color:'#df8344',accent:'#66904b'},
  tomato:{name:'토마토',color:'#cb604e',accent:'#638c4d'},
  fish:{name:'물고기',color:'#5c9fb5',accent:'#c4e9ed'},
  bug:{name:'곤충',color:'#e2c45e',accent:'#6b5531'}
};
const states=new WeakMap();
let uid=0,audioCtx=null;

function actorOf(world){return world?.player?.__kidscadeAvatarActor||null;}
function isInside(world){return world?.entities?.byTag?.('indoor').some(e=>e.active);}
function lock(world,on){if(!world?.input)return;world.input.keys?.clear?.();world.input.clearVirtual?.();world.input.enabled=!on;}
function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function toast(text){const el=document.getElementById('toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(el.__carryToast);el.__carryToast=setTimeout(()=>el.classList.remove('show'),1500);}
function tone(a,b=.1,type='sine',gain=.035){try{audioCtx=audioCtx||new (root.AudioContext||root.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain(),n=audioCtx.currentTime;o.connect(g);g.connect(audioCtx.destination);o.type=type;o.frequency.setValueAtTime(a,n);o.frequency.exponentialRampToValueAtTime(Math.max(40,a*.55),n+b);g.gain.setValueAtTime(gain,n);g.gain.exponentialRampToValueAtTime(.001,n+b);o.start(n);o.stop(n+b+.03);}catch(_){}}
function ensureState(world){let s=states.get(world);if(s)return s;const save=K.Storage?.load?.()||{};s={held:null,inventory:{wood:0,stone:0,iron:0,crop:0,fish:0,bug:0,potato:0,carrot:0,tomato:0,...(save.inventory||{})},fishing:null};states.set(world,s);return s;}
function saveInventory(world){const st=ensureState(world);if(!K.Storage)return;const s=K.Storage.load();s.inventory={...st.inventory};K.Storage.save(s);}
function nameOf(item){return ITEM[item]?.name||item;}

function drawItem(c,item,x,y,scale=1){
  const modelKey=item==='wood'?'resourceWood':item==='stone'?'resourceStone':null;
  if(modelKey&&K.ModelSprites?.drawAt?.(modelKey,c,x,y,48*scale,48*scale))return;
  const m=ITEM[item]||ITEM.wood;c.save();c.translate(x,y);c.scale(scale,scale);c.lineWidth=2;c.strokeStyle='#332f27';
  if(item==='wood'){
    c.fillStyle=m.color;c.fillRect(-18,-8,36,16);c.strokeRect(-18,-8,36,16);c.fillStyle=m.accent;c.fillRect(-13,-5,22,4);c.beginPath();c.arc(14,0,6,0,Math.PI*2);c.stroke();
  }else if(item==='stone'){
    c.fillStyle=m.color;c.beginPath();c.moveTo(-17,7);c.lineTo(-12,-7);c.lineTo(3,-13);c.lineTo(17,-4);c.lineTo(14,9);c.lineTo(-4,13);c.closePath();c.fill();c.stroke();c.fillStyle=m.accent;c.fillRect(-5,-7,9,4);
  }else if(item==='iron'){
    c.fillStyle=m.color;c.beginPath();c.moveTo(-17,8);c.lineTo(-12,-8);c.lineTo(1,-14);c.lineTo(17,-5);c.lineTo(14,10);c.lineTo(-4,13);c.closePath();c.fill();c.stroke();c.fillStyle=m.accent;c.fillRect(-7,-7,8,4);c.fillRect(4,0,7,4);
  }else if(item==='crop'){
    c.fillStyle=m.color;c.beginPath();c.ellipse(0,3,12,15,.15,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=m.accent;c.lineWidth=4;c.beginPath();c.moveTo(0,-10);c.lineTo(-7,-19);c.moveTo(0,-10);c.lineTo(7,-18);c.stroke();
  }else if(item==='potato'){
    c.fillStyle=m.color;c.beginPath();c.ellipse(0,2,14,11,-.18,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#9a7747';c.fillRect(-6,-1,3,3);c.fillRect(4,3,3,3);c.strokeStyle=m.accent;c.lineWidth=3;c.beginPath();c.moveTo(0,-8);c.lineTo(-5,-16);c.moveTo(0,-8);c.lineTo(6,-15);c.stroke();
  }else if(item==='carrot'){
    c.fillStyle=m.color;c.beginPath();c.moveTo(-9,-6);c.lineTo(9,-6);c.lineTo(2,18);c.quadraticCurveTo(0,23,-2,18);c.closePath();c.fill();c.stroke();c.strokeStyle=m.accent;c.lineWidth=4;c.beginPath();c.moveTo(0,-6);c.lineTo(-9,-17);c.moveTo(0,-6);c.lineTo(0,-19);c.moveTo(0,-6);c.lineTo(9,-16);c.stroke();
  }else if(item==='tomato'){
    c.fillStyle=m.color;c.beginPath();c.arc(0,3,14,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=m.accent;c.lineWidth=4;c.beginPath();c.moveTo(0,-9);c.lineTo(-7,-15);c.moveTo(0,-9);c.lineTo(7,-15);c.moveTo(0,-9);c.lineTo(0,-18);c.stroke();
  }else if(item==='fish'){
    c.fillStyle=m.color;c.beginPath();c.ellipse(0,0,18,9,0,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.moveTo(-17,0);c.lineTo(-29,-10);c.lineTo(-29,10);c.closePath();c.fill();c.stroke();c.fillStyle=m.accent;c.beginPath();c.arc(9,-2,2,0,Math.PI*2);c.fill();
  }else{
    c.fillStyle=m.color;c.beginPath();c.ellipse(0,0,8,12,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=m.accent;c.beginPath();c.moveTo(-4,-2);c.lineTo(-14,-9);c.moveTo(4,-2);c.lineTo(14,-9);c.moveTo(-4,3);c.lineTo(-14,10);c.moveTo(4,3);c.lineTo(14,10);c.stroke();
  }
  c.restore();
}

function spawnPickup(world,item,x,y,qty=1,options={}){
  const inside=isInside(world),id=options.id||`carry-pickup-${item}-${++uid}`;
  const e=world.spawn({id,type:'pickup',x:x-22,y:y-18,w:44,h:34,solid:false,visible:!inside,active:!inside,tags:['outdoor','carry-pickup'],interactionRadius:92,data:{item,qty,spawnY:y-18},render(c,en){const bob=Math.sin(performance.now()/230+en.x*.01)*3;drawItem(c,en.data.item,en.centerX,en.centerY+bob,.8);c.save();c.globalAlpha=.18;c.fillStyle='#171d16';c.beginPath();c.ellipse(en.centerX,en.y+en.h+4,16,5,0,0,Math.PI*2);c.fill();c.restore();},interaction:{label:`${nameOf(item)} 들기`,action(t,w){pickUp(w,t);}}});
  return e;
}
function pickUp(world,e){const st=ensureState(world);if(st.held){toast(`이미 ${nameOf(st.held.item)}을(를) 들고 있어요.`);return false;}st.held={item:e.data.item,qty:e.data.qty||1,source:e};e.visible=false;e.active=false;actorOf(world)?.play?.('smile',320);tone(620,.08,'sine',.03);toast(`${nameOf(st.held.item)}을(를) 들었어요. Q/놓기 버튼으로 내려놓을 수 있어요.`);return true;}
function holdVirtual(world,item,qty=1){const st=ensureState(world);if(st.held)return false;st.held={item,qty,source:null};tone(720,.08,'sine',.03);return true;}
function dropHeld(world){
  const st=ensureState(world),h=st.held;if(!h)return false;
  if(isInside(world)){toast('집 안에서는 재료를 내려놓을 수 없어요. 밖으로 나가서 놓아 주세요.');return false;}
  const p=world.player,x=p.centerX+(actorOf(world)?.facing||1)*34,y=p.y+p.h-4;
  if(h.source){h.source.x=x-h.source.w/2;h.source.y=y-h.source.h/2;h.source.visible=true;h.source.active=true;}else spawnPickup(world,h.item,x,y,h.qty);
  st.held=null;tone(260,.07,'triangle',.025);toast(`${nameOf(h.item)}을(를) 내려놓았어요.`);return true;
}
function deposit(world){const st=ensureState(world),h=st.held;if(!h){const parts=Object.entries(st.inventory).filter(([,v])=>v>0).map(([k,v])=>`${nameOf(k)} ${v}`).join(' · ');toast(parts||'보관 상자가 비어 있어요.');return false;}st.inventory[h.item]=(st.inventory[h.item]||0)+h.qty;if(h.source)world.entities.remove(h.source.id);st.held=null;saveInventory(world);tone(840,.09,'square',.025);toast(`${nameOf(h.item)} ${h.qty}개를 보관했어요.`);return true;}
function chestRender(c,e,w){
  const st=ensureState(w),sprites=K.ModelSprites;
  const fallback=(ctx,en)=>{ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#6c472f';ctx.fillRect(en.x,en.y+12,en.w,en.h-12);ctx.strokeStyle='#2f2a24';ctx.lineWidth=3;ctx.strokeRect(en.x+1.5,en.y+13.5,en.w-3,en.h-15);ctx.fillStyle='#9a7045';ctx.fillRect(en.x+4,en.y+5,en.w-8,14);ctx.strokeRect(en.x+4.5,en.y+5.5,en.w-9,12);ctx.fillStyle='#d2ae67';ctx.fillRect(en.centerX-5,en.y+23,10,9);ctx.restore();};
  if(sprites?.draw)sprites.draw('storageChest',c,e,fallback);else fallback(c,e);
  if(st.held){c.save();c.globalAlpha=.92;drawItem(c,st.held.item,e.centerX,e.y-12,.55);c.restore();}
}
function installChest(world){if(world.entities.get('carry-storage-chest'))return;const inside=isInside(world);world.spawn({id:'carry-storage-chest',type:'storage',x:2440,y:855,w:72,h:54,solid:true,visible:!inside,active:!inside,tags:['outdoor','storage'],render:chestRender,interactionRadius:108,interaction:{label:'보관 상자 보기',action(t,w){deposit(w);}}});}

function fishingSpotRender(c,e){c.save();c.imageSmoothingEnabled=false;c.fillStyle='#765033';c.fillRect(e.x,e.y+18,e.w,12);for(let i=0;i<4;i++)c.fillRect(e.x+8+i*24,e.y+12,8,28);c.fillStyle='#c9ad72';c.fillRect(e.x+5,e.y+16,e.w-10,4);c.restore();}
function fishingBobber(st){const p=st.phase==='cast'?clamp((performance.now()-st.phaseStart)/650):1,a=actorOf(st.world)?.handAnchor?.(true)||{x:st.world.player.centerX,y:st.world.player.y+18},tx=st.spot.centerX+35,ty=st.spot.y+82;return {x:lerp(a.x,tx,p),y:lerp(a.y-6,ty,p)-Math.sin(p*Math.PI)*42};}
function startFishing(world,spot){const st=ensureState(world);if(st.held){toast('들고 있는 물건을 먼저 보관하거나 내려놓아 주세요.');return false;}if(st.fishing)return false;K.WorkAnimation?.cancel?.(world);K.LifeAnimation?.cancel?.(world,world.player,true);lock(world,true);world.player.vx=0;world.player.vy=0;const actor=actorOf(world),facing=spot.centerX>=world.player.centerX?1:-1;actor?.setPose?.('use',{duration:0,facing,rotation:-.04,bob:.15});const now=performance.now();st.fishing={world,spot,phase:'cast',phaseStart:now,biteAt:0,biteUntil:0,facing};world.interaction.current=null;tone(420,.09,'sine',.025);toast('낚싯대를 던졌어요. 입질을 기다려요.');return true;}
function endFishing(world,message=''){const st=ensureState(world);if(!st.fishing)return false;st.fishing=null;actorOf(world)?.clearPose?.();lock(world,false);if(message)toast(message);return true;}
function reel(world){const st=ensureState(world),f=st.fishing;if(!f||f.phase!=='bite')return false;f.phase='reel';f.phaseStart=performance.now();actorOf(world)?.setPose?.('use',{duration:720,facing:f.facing,rotation:.10,bob:.3});tone(900,.12,'triangle',.04);return true;}
function fishingInput(world,ev){const st=ensureState(world),f=st.fishing;if(!f)return false;if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();endFishing(world,'낚시를 그만뒀어요.');return true;}if(ev.key!=='e'&&ev.key!=='E'&&ev.key!==' ')return false;ev.preventDefault();ev.stopImmediatePropagation();if(f.phase==='wait'){tone(180,.10,'square',.03);endFishing(world,'너무 일찍 당겼어요!');return true;}if(f.phase==='bite'){reel(world);return true;}return true;}
function drawFishing(c,world,f){const actor=actorOf(world),hand=actor?.handAnchor?.(true)||{x:world.player.centerX,y:world.player.y+20},b=fishingBobber(f);c.save();c.lineCap='round';const reel=f.phase==='reel'?clamp((performance.now()-f.phaseStart)/720):0,rodAng=-.55+reel*.42,tip={x:hand.x+f.facing*Math.cos(rodAng)*72,y:hand.y+Math.sin(rodAng)*72};c.strokeStyle='#6b482f';c.lineWidth=5;c.beginPath();c.moveTo(hand.x,hand.y);c.lineTo(tip.x,tip.y);c.stroke();c.strokeStyle='rgba(225,231,220,.8)';c.lineWidth=1.5;c.beginPath();c.moveTo(tip.x,tip.y);c.quadraticCurveTo((tip.x+b.x)/2,b.y-30,b.x,b.y);c.stroke();c.fillStyle='#e2584f';c.fillRect(b.x-4,b.y-7,8,12);c.fillStyle='#f0eee0';c.fillRect(b.x-4,b.y-7,8,5);const pulse=(performance.now()%500)/500;c.strokeStyle=`rgba(230,248,250,${.75*(1-pulse)})`;c.lineWidth=2;c.beginPath();c.ellipse(b.x,b.y+5,10+pulse*26,4+pulse*8,0,0,Math.PI*2);c.stroke();if(f.phase==='bite'){c.strokeStyle='rgba(255,245,180,.85)';c.lineWidth=4;c.beginPath();c.ellipse(b.x,b.y+5,18+pulse*38,7+pulse*12,0,0,Math.PI*2);c.stroke();c.fillStyle='rgba(45,88,100,.48)';c.beginPath();c.ellipse(b.x+28,b.y+24,24,8,-.15,0,Math.PI*2);c.fill();}c.restore();}
function installFishing(world){if(world.entities.get('fishing-spot'))return;const inside=isInside(world);world.spawn({id:'fishing-spot',type:'fishing-spot',x:430,y:1125,w:108,h:42,solid:false,visible:!inside,active:!inside,tags:['outdoor','fishing'],render:fishingSpotRender,interactionRadius:120,interaction:{label:'낚시하기',action(t,w){startFishing(w,t);}}});}
function installFx(world){if(world.entities.get('carry-fishing-fx'))return;world.spawn({id:'carry-fishing-fx',type:'effect',x:0,y:0,w:1,h:1,solid:false,visible:true,active:true,depthOffset:100200,render(c,e,w){const st=ensureState(w),actor=actorOf(w);if(st.held){const a=actor?.handAnchor?.(true)||{x:w.player.centerX,y:w.player.y+18},facing=actor?.facing||1;drawItem(c,st.held.item,a.x-facing*7,a.y+8,.72);}if(st.fishing)drawFishing(c,w,st.fishing);}});}

function scanYields(world){
  const st=ensureState(world);
  if(st.held?.source){st.held.source.visible=false;st.held.source.active=false;}
  for(const e of world.entities.all()){
    if(e.type==='tree'||e.type==='rock'){
      if(e.data?.resource==='iron'){if(e.data?.workDestroyed)e.data.__carryYieldSpawned=true;continue;}
      if(e.data?.workDestroyed&&!e.data.__carryYieldSpawned){e.data.__carryYieldSpawned=true;spawnPickup(world,e.type==='tree'?'wood':'stone',e.centerX,e.y+e.h-5,1);}
    }else if(e.type==='crop'){
      if(e.data?.__progressManaged)continue;
      if(e.data?.harvested&&!e.data.__carryHarvestSeen){e.data.__carryHarvestSeen=true;spawnPickup(world,'crop',e.centerX,e.y+e.h-3,1);}else if(!e.data?.harvested)e.data.__carryHarvestSeen=false;
    }else if(e.type==='bug'){
      if(e.data?.caught){e.visible=false;e.active=false;if(!e.data.__carryCaughtSeen){e.data.__carryCaughtSeen=true;spawnPickup(world,'bug',e.centerX,e.centerY,1);}}
      else e.data.__carryCaughtSeen=false;
    }
  }
}
function updateFishing(world){const st=ensureState(world),f=st.fishing;if(!f)return;const now=performance.now();if(f.phase==='cast'&&now-f.phaseStart>=650){f.phase='wait';f.phaseStart=now;f.biteAt=now+1200+Math.random()*1900;}else if(f.phase==='wait'&&now>=f.biteAt){f.phase='bite';f.phaseStart=now;f.biteUntil=now+950;tone(1050,.10,'square',.04);toast('입질! 지금 행동 버튼 / E / Space!');}else if(f.phase==='bite'&&now>=f.biteUntil){tone(160,.12,'square',.025);endFishing(world,'물고기가 도망갔어요.');}else if(f.phase==='reel'&&now-f.phaseStart>=720){endFishing(world);holdVirtual(world,'fish',1);actorOf(world)?.play?.('smile',520);toast('물고기를 잡았어요! 보관 상자로 가져가 보세요.');}}
function updateChestLabel(world){const c=world.entities.get('carry-storage-chest');if(!c?.interaction)return;const h=ensureState(world).held;c.interaction.label=h?`${nameOf(h.item)} 보관하기`:'보관 상자 보기';}
function install(world){if(!world||world.__carryFishingInstalled)return false;world.__carryFishingInstalled=true;ensureState(world);installChest(world);installFishing(world);installFx(world);world.events.on('update',()=>{scanYields(world);updateFishing(world);updateChestLabel(world);});root.addEventListener('keydown',ev=>{if(fishingInput(world,ev))return;if((ev.key==='q'||ev.key==='Q')&&ensureState(world).held){ev.preventDefault();dropHeld(world);}},true);return true;}
function autoInstall(){let tries=0;const timer=setInterval(()=>{const w=K.activeWorld||root.__kidscadeWorldV2;if(w?.player){clearInterval(timer);install(w);}else if(++tries>160)clearInterval(timer);},50);}

K.CarryFishing={installed:true,ITEM,states,install,spawnPickup,pickUp,dropHeld,deposit,startFishing,endFishing,drawItem};
autoInstall();
})(window);
