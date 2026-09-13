/* Kidscade World v2 - reusable life/furniture animation layer.
   Keeps the current Deluxe avatar intact and animates it with transforms, masking and prop FX. */
(function(root){
'use strict';
const K=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
const active=new WeakMap();

const ACTIONS={
  bed:{pose:'sleep',duration:2600,message:'포근하게 누워 잠깐 쉬었어요.'},
  sofa:{pose:'sit',duration:2100,message:'소파에 편하게 앉았어요.'},
  desk:{pose:'sit',duration:2100,message:'책상에 앉아 잠깐 쉬었어요.'},
  diningTable:{pose:'sit',duration:1900,message:'식탁에 앉았어요.'},
  fridge:{pose:'use',duration:1450,message:'냉장고를 열어 안을 살펴봤어요.'},
  sink:{pose:'wash',duration:1850,message:'싱크대에서 손을 씻었어요.'},
  counter:{pose:'cook',duration:1800,message:'조리대를 살펴봤어요.'},
  stove:{pose:'cook',duration:1800,message:'가스레인지 앞에 섰어요.'},
  bookshelf:{pose:'read',duration:2100,message:'책장에서 책을 한 권 꺼내 봤어요.'},
  rug:{pose:'smile',duration:950,message:'러그 위에서 한 바퀴 기분 좋게 움직였어요.'}
};

function actorOf(player){return player?.__kidscadeAvatarActor||null;}
function lockInput(world,on){
  if(!world?.input)return;
  world.input.keys?.clear?.();
  world.input.enabled=!on;
}
function ease(p){return .5-Math.cos(Math.max(0,Math.min(1,p))*Math.PI)/2;}
function animState(target){
  const a=target?.data?.lifeAnim;
  if(!a)return null;
  const now=performance.now();
  if(now>=a.end){delete target.data.lifeAnim;return null;}
  const p=(now-a.start)/Math.max(1,a.end-a.start);
  return {...a,p:Math.max(0,Math.min(1,p)),wave:Math.sin(Math.max(0,Math.min(1,p))*Math.PI)};
}
function placement(type,target,player){
  const center=target.centerX;
  if(type==='bed')return {x:center-player.w/2,y:target.centerY-player.h/2,renderX:center,renderY:target.centerY+7,facing:1};
  if(type==='sofa')return {x:center-player.w/2,y:target.y+target.h-player.h*.72,renderX:center,renderY:target.y+target.h-2,facing:1};
  if(type==='desk'||type==='diningTable')return {x:center-player.w/2,y:target.y+target.h-player.h*.66,renderX:center,renderY:target.y+target.h+1,facing:1};
  if(type==='fridge'||type==='bookshelf')return {x:target.x-player.w-8,y:target.y+target.h-player.h-2,renderX:target.x-8,renderY:target.y+target.h,facing:1};
  if(type==='sink'||type==='counter'||type==='stove')return {x:center-player.w/2,y:target.y+target.h-player.h+10,renderX:center,renderY:target.y+target.h+10,facing:1};
  return {x:player.x,y:player.y,renderX:player.centerX,renderY:player.y+player.h+2,facing:1};
}
function finish(world,player,target,restore=true){
  const state=active.get(player);if(!state)return;
  clearTimeout(state.timer);
  actorOf(player)?.clearPose();
  if(restore){player.x=state.x;player.y=state.y;}
  player.vx=0;player.vy=0;
  if(target?.data?.lifeAnim)delete target.data.lifeAnim;
  lockInput(world,false);
  active.delete(player);
  world?.camera?.snap?.();
}
function cancel(world,player,restore=true){
  const state=active.get(player);if(!state)return false;
  finish(world,player,state.target,restore);return true;
}
function perform(world,player,target,type,options={}){
  const cfg=ACTIONS[type];if(!cfg||!player||!target)return false;
  if(active.has(player))cancel(world,player,true);
  const actor=actorOf(player);
  const duration=Math.max(300,Number(options.duration)||cfg.duration);
  const place=placement(type,target,player);
  const previous={x:player.x,y:player.y,target};
  const now=performance.now();
  target.data=target.data||{};
  target.data.lifeAnim={kind:type,start:now,end:now+duration};
  lockInput(world,true);
  player.vx=0;player.vy=0;player.x=place.x;player.y=place.y;
  if(actor){
    const poseName=cfg.pose==='smile'?'use':cfg.pose;
    actor.setPose(poseName,{duration,renderX:place.renderX,renderY:place.renderY,facing:place.facing});
    if(cfg.pose==='smile')actor.play('smile',duration);
  }
  world.interaction.current=null;
  world.camera.snap?.();
  const timer=setTimeout(()=>{
    const state=active.get(player);if(!state||state.target!==target)return;
    const msg=options.message||cfg.message;
    finish(world,player,target,true);
    if(msg)options.toast?.(msg);
  },duration+30);
  active.set(player,{...previous,timer,type,start:now,end:now+duration});
  return true;
}

function drawFront(type,c,e,world,target=e){
  const F=K.LifeFurniture;if(!F)return;
  const P=F.PAL||{};c.save();c.imageSmoothingEnabled=false;
  if(type==='sofa'){
    c.fillStyle=P.cloth2||'#91aa82';
    c.fillRect(e.x,e.y+25,12,e.h-27);c.fillRect(e.x+e.w-12,e.y+25,12,e.h-27);
    c.fillRect(e.x+14,e.y+e.h-25,e.w-28,20);
    c.fillStyle=P.ink||'#302b24';c.fillRect(e.x+14,e.y+e.h-7,e.w-28,3);
  }else if(type==='bed'){
    const a=animState(target);
    if(a?.kind==='bed'){
      c.fillStyle=P.cloth||'#66876e';c.fillRect(e.x+7,e.y+27,e.w-14,e.h-37);
      c.fillStyle=P.cloth2||'#91aa82';c.fillRect(e.x+7,e.y+27,e.w-14,6);
      c.globalAlpha=.28+.18*a.wave;c.fillStyle='#fff';c.fillRect(e.x+16,e.y+32,e.w-35,3);
    }
  }
  c.restore();
}
function makeFrontLayer(type,target,options={}){
  if(!['bed','sofa'].includes(type))return null;
  return {id:options.id||target.id+'-front',type:'furniture-front',x:target.x,y:target.y,w:target.w,h:target.h,solid:false,depthOffset:420,data:{targetId:target.id,furniture:type},render(c,e,w){const t=w.entities.get(e.data.targetId);if(!t)return;drawFront(type,c,t,w,t);}};
}

function drawFurnitureFx(type,c,e){
  const a=animState(e);if(!a)return;
  const F=K.LifeFurniture,P=F?.PAL||{};const q=ease(a.p),pulse=a.wave;
  c.save();c.imageSmoothingEnabled=false;
  if(type==='fridge'){
    const open=Math.sin(Math.min(1,a.p)*Math.PI)*.94;
    const doorW=Math.max(18,(e.w-12)*(1-open*.56));
    const dx=e.x+e.w-8;
    c.fillStyle=P.metal2||'#d0d1c7';c.fillRect(dx,e.y+3,doorW,e.h-6);
    c.strokeStyle=P.ink||'#302b24';c.lineWidth=3;c.strokeRect(dx+1.5,e.y+4.5,doorW-3,e.h-9);
    c.fillStyle='rgba(205,236,239,.45)';c.fillRect(e.x+11,e.y+18,e.w-22,e.h-31);
  }else if(type==='sink'){
    c.fillStyle=P.water||'#66a9bd';
    for(let i=0;i<4;i++){const yy=e.y+18+((performance.now()/7+i*14)%26);c.fillRect(e.centerX-2+i%2*5,yy,3,6);}
    c.globalAlpha=.25+.25*pulse;c.fillStyle='#dff8ff';c.fillRect(e.x+16,e.y+18,e.w-32,4);
  }else if(type==='counter'||type==='stove'){
    c.globalAlpha=.25+.25*pulse;c.fillStyle='#f3e3aa';
    c.fillRect(e.centerX-15,e.y-7,4,8);c.fillRect(e.centerX,e.y-13,4,10);c.fillRect(e.centerX+14,e.y-5,4,7);
  }else if(type==='bookshelf'){
    c.translate(e.centerX,e.y+18-pulse*7);c.rotate((q-.5)*.12);c.fillStyle=P.cream||'#e8d7ad';c.fillRect(-17,-10,34,21);c.fillStyle=P.red||'#a45f54';c.fillRect(-2,-10,4,21);c.strokeStyle=P.ink||'#302b24';c.lineWidth=2;c.strokeRect(-17,-10,34,21);
  }
  c.restore();
}

function decorateRenderer(type,base){
  return function(c,e,w){base?.(c,e,w);drawFurnitureFx(type,c,e,w);};
}

function loadWorkAnimation(){
  if(K.WorkAnimation||document.getElementById('kidscade-world-work-animation-script'))return;
  const here=document.currentScript?.src||location.href;
  const s=document.createElement('script');
  s.id='kidscade-world-work-animation-script';
  s.src=new URL('kidscade-world-work-animation.js',here).href;
  s.async=false;
  document.head.appendChild(s);
}

K.LifeAnimation={ACTIONS,perform,cancel,active,animState,makeFrontLayer,drawFront,drawFurnitureFx,decorateRenderer};
loadWorkAnimation();
})(window);
