/* Kidscade World v2 - mobile touch controls.
   Adds a virtual joystick and touch action buttons without changing keyboard controls. */
(function(root){
'use strict';
const K=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
if(K.MobileControls?.installed||!K.Input)return;

const proto=K.Input.prototype;
const originalAxis=proto.axis;
const originalPressed=proto.pressed;
const originalDestroy=proto.destroy;

function virtual(input){
  if(!input.__mobileVirtual)input.__mobileVirtual={x:0,y:0,buttons:new Set()};
  return input.__mobileVirtual;
}
proto.setVirtualAxis=function(x=0,y=0){
  const v=virtual(this),m=Math.hypot(Number(x)||0,Number(y)||0),q=m>1?1/m:1;
  v.x=(Number(x)||0)*q;v.y=(Number(y)||0)*q;
};
proto.setVirtualButton=function(key,on){
  const v=virtual(this),k=String(key).toLowerCase();
  if(on)v.buttons.add(k);else v.buttons.delete(k);
};
proto.clearVirtual=function(){const v=virtual(this);v.x=0;v.y=0;v.buttons.clear();};
proto.axis=function(){
  if(!this.enabled)return{x:0,y:0};
  const a=originalAxis.call(this),v=virtual(this);
  let x=a.x+v.x,y=a.y+v.y,m=Math.hypot(x,y);
  if(m>1){x/=m;y/=m;}
  return{x,y};
};
proto.pressed=function(key){
  if(!this.enabled)return false;
  return originalPressed.call(this,key)||virtual(this).buttons.has(String(key).toLowerCase());
};
proto.destroy=function(){this.clearVirtual?.();return originalDestroy.call(this);};

function touchDevice(){return matchMedia?.('(pointer:coarse)')?.matches||navigator.maxTouchPoints>0||'ontouchstart' in root;}
function addStyle(){
  if(document.getElementById('kidscade-world-mobile-style'))return;
  const s=document.createElement('style');s.id='kidscade-world-mobile-style';s.textContent=`
  #wv2-mobile-controls{position:absolute;inset:0;z-index:15;pointer-events:none;display:none;touch-action:none;-webkit-user-select:none;user-select:none}
  #wv2-mobile-controls.show{display:block}
  .wv2-joy{position:absolute;left:max(14px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:116px;height:116px;border-radius:50%;border:3px solid rgba(255,241,191,.78);background:rgba(35,43,32,.48);box-shadow:0 3px 14px rgba(0,0,0,.25);pointer-events:auto;touch-action:none;backdrop-filter:blur(2px)}
  .wv2-joy:before,.wv2-joy:after{content:'';position:absolute;background:rgba(255,241,191,.18);pointer-events:none}.wv2-joy:before{left:54px;top:12px;width:3px;height:92px}.wv2-joy:after{top:54px;left:12px;height:3px;width:92px}
  .wv2-stick{position:absolute;left:50%;top:50%;width:50px;height:50px;transform:translate(-50%,-50%);border-radius:50%;border:3px solid #fff1bf;background:rgba(113,143,91,.92);box-shadow:0 3px 8px rgba(0,0,0,.35);pointer-events:none}
  .wv2-mobile-actions{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));width:148px;height:132px;pointer-events:none}
  .wv2-touch-btn{position:absolute;border:3px solid rgba(255,241,191,.9);background:rgba(43,48,38,.88);color:#fff1bf;font:900 13px system-ui;border-radius:50%;box-shadow:0 4px 10px rgba(0,0,0,.28);pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent}
  .wv2-touch-btn:active,.wv2-touch-btn.pressed{transform:scale(.92);background:rgba(111,145,83,.95)}
  .wv2-touch-action{right:0;bottom:0;width:76px;height:76px;font-size:15px}
  .wv2-touch-drop{left:0;bottom:8px;width:58px;height:58px}
  .wv2-touch-cancel{right:10px;top:0;width:52px;height:52px;font-size:11px}
  #wv2-mobile-controls.locked .wv2-joy,#wv2-mobile-controls.locked .wv2-touch-drop{opacity:.38}
  @media(max-width:700px),(pointer:coarse){
    .hud{left:8px!important;top:8px!important;width:158px!important;max-height:72px!important;padding:7px 8px!important;border-width:2px!important;box-shadow:3px 3px 0 rgba(0,0,0,.22)!important;overflow:hidden!important}
    .hud b{font-size:12px!important;white-space:nowrap}.hud .small{display:none!important}.chips{margin-top:5px!important;gap:3px!important;flex-wrap:nowrap!important;overflow:hidden!important}.chip{font-size:8px!important;padding:2px 4px!important;border-width:1px!important;white-space:nowrap!important}
    .zone{top:84px!important;font-size:11px!important;padding:4px 8px!important;border-width:2px!important}.toast{top:116px!important;max-width:80vw!important;font-size:12px!important;text-align:center}.prompt{bottom:148px!important;max-width:58vw!important;font-size:11px!important;padding:6px 9px!important;border-width:2px!important;white-space:normal!important}
    #world-v2-status{right:8px!important;top:8px!important;width:158px!important;max-height:108px!important;padding:6px!important;border-width:2px!important;font-size:9px!important;line-height:1.24!important;box-shadow:3px 3px 0 rgba(0,0,0,.22)!important;overflow:hidden!important}
    #world-v2-status .wv2bar{height:7px!important;margin:3px 0 4px!important;border-width:1px!important}#world-v2-status .wv2tools{max-height:35px!important;overflow:hidden!important}#world-v2-status .wv2goal{margin-top:4px!important;padding-top:4px!important;max-height:28px!important;overflow:hidden!important}
    .wv2card{width:calc(100vw - 16px)!important;max-height:78vh!important;padding:10px!important}.wv2recipes{grid-template-columns:1fr 1fr!important;gap:6px!important}.wv2recipe{padding:7px!important;font-size:11px!important}
  }
  @media(max-width:430px){.wv2-joy{width:106px;height:106px}.wv2-joy:before{left:49px;top:12px;height:82px}.wv2-joy:after{top:49px;left:12px;width:82px}.wv2-stick{width:46px;height:46px}.wv2-mobile-actions{width:138px;height:126px}.wv2-touch-action{width:72px;height:72px}.wv2-touch-drop{width:54px;height:54px}}
  `;document.head.appendChild(s);
}

function cancelCurrent(world){
  const p=world?.player;
  if(K.LifeAnimation?.active?.has(p)){K.LifeAnimation.cancel(world,p,true);return true;}
  if(K.WorkAnimation?.active?.has(world)){K.WorkAnimation.cancel(world);return true;}
  if(K.CarryFishing?.states?.get(world)?.fishing){K.CarryFishing.endFishing(world,'낚시를 그만뒀어요.');return true;}
  return false;
}
function install(world){
  if(!world||world.__mobileControlsInstalled||!touchDevice())return false;
  world.__mobileControlsInstalled=true;addStyle();
  const app=document.getElementById('app')||document.body;
  const wrap=document.createElement('div');wrap.id='wv2-mobile-controls';wrap.className='show';wrap.innerHTML=`<div class="wv2-joy" aria-label="이동 조이스틱"><div class="wv2-stick"></div></div><div class="wv2-mobile-actions"><button class="wv2-touch-btn wv2-touch-cancel" type="button">취소</button><button class="wv2-touch-btn wv2-touch-drop" type="button">놓기</button><button class="wv2-touch-btn wv2-touch-action" type="button">행동</button></div>`;app.appendChild(wrap);
  const joy=wrap.querySelector('.wv2-joy'),stick=wrap.querySelector('.wv2-stick'),action=wrap.querySelector('.wv2-touch-action'),drop=wrap.querySelector('.wv2-touch-drop'),cancel=wrap.querySelector('.wv2-touch-cancel');
  let joyPointer=null;
  function resetJoy(){joyPointer=null;world.input.setVirtualAxis(0,0);stick.style.transform='translate(-50%,-50%)';}
  function moveJoy(e){
    if(joyPointer!==e.pointerId)return;const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.32;let dx=e.clientX-cx,dy=e.clientY-cy,m=Math.hypot(dx,dy);if(m>max){dx*=max/m;dy*=max/m;m=max;}const dead=max*.12;if(m<dead){dx=0;dy=0;}world.input.setVirtualAxis(dx/max,dy/max);stick.style.transform=`translate(-50%,-50%) translate(${dx}px,${dy}px)`;e.preventDefault();
  }
  joy.addEventListener('pointerdown',e=>{if(!world.input.enabled)return;joyPointer=e.pointerId;joy.setPointerCapture?.(e.pointerId);moveJoy(e);e.preventDefault();});
  joy.addEventListener('pointermove',moveJoy);joy.addEventListener('pointerup',e=>{if(e.pointerId===joyPointer)resetJoy();e.preventDefault();});joy.addEventListener('pointercancel',resetJoy);
  function fishing(){return K.CarryFishing?.states?.get(world)?.fishing;}
  function keyToWindow(key){try{root.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));}catch(_){}}
  action.addEventListener('pointerdown',e=>{action.classList.add('pressed');if(fishing())keyToWindow('e');else if(world.input.enabled)world.input.setVirtualButton('e',true);e.preventDefault();});
  const releaseAction=e=>{action.classList.remove('pressed');world.input.setVirtualButton('e',false);e?.preventDefault?.();};action.addEventListener('pointerup',releaseAction);action.addEventListener('pointercancel',releaseAction);action.addEventListener('pointerleave',releaseAction);
  drop.addEventListener('pointerdown',e=>{if(world.input.enabled)K.CarryFishing?.dropHeld?.(world);drop.classList.add('pressed');e.preventDefault();});drop.addEventListener('pointerup',e=>{drop.classList.remove('pressed');e.preventDefault();});drop.addEventListener('pointercancel',()=>drop.classList.remove('pressed'));
  cancel.addEventListener('pointerdown',e=>{cancelCurrent(world);cancel.classList.add('pressed');world.input.clearVirtual?.();resetJoy();e.preventDefault();});cancel.addEventListener('pointerup',e=>{cancel.classList.remove('pressed');e.preventDefault();});cancel.addEventListener('pointercancel',()=>cancel.classList.remove('pressed'));
  world.events.on('update',()=>{const fish=!!fishing(),locked=!world.input.enabled&&!fish;wrap.classList.toggle('locked',locked);action.textContent=fish?'당기기':(world.interaction?.current?'행동':'행동');drop.style.opacity=K.CarryFishing?.states?.get(world)?.held?'1':'.48';if(!world.input.enabled&&!fish&&joyPointer!==null)resetJoy();});
  root.addEventListener('blur',resetJoy);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetJoy();});
  return true;
}
function autoInstall(){let tries=0;const timer=setInterval(()=>{const w=K.activeWorld||root.__kidscadeWorldV2;if(w?.player){clearInterval(timer);install(w);}else if(++tries>240)clearInterval(timer);},50);}

K.MobileControls={installed:true,install,cancelCurrent};
autoInstall();
})(window);
