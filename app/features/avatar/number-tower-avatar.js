(function(root){
'use strict';
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const HERO_RE=/\/kenney-platformer-characters\/player\/poses\/player-(stand|walk1|action1|hurt)\.png(?:[?#]|$)/;
const frames=new Map(),images=new Map();
let lastCapture=0,deadUntil=0;

function safe(fn,f=''){try{return fn()}catch(_){return f}}
function host(){return safe(()=>parent&&parent!==window&&parent.location.origin===location.origin?parent:window,window)}
function api(){
 const h=host();
 return [safe(()=>window.KidscadeAvatarShop,null),safe(()=>h.KidscadeAvatarShop,null),safe(()=>h.document?.getElementById('kidscade-avatar-studio-frame')?.contentWindow?.KidscadeAvatarShop,null)]
  .find(v=>v&&typeof v.renderPreviewFrame==='function')||null;
}
function fallback(){
 const h=host(),a=safe(()=>localStorage.getItem(PREVIEW_KEY),'')||safe(()=>h.localStorage.getItem(PREVIEW_KEY),'');
 return a&&a.startsWith('data:image')?a:'';
}
function mode(src){
 if(deadUntil>performance.now())return 'dead';
 if(/walk1/.test(src))return 'walk';
 if(/action1/.test(src))return 'attack';
 if(/hurt/.test(src))return 'hurt';
 return 'idle';
}
function source(kind,now){
 const hit=frames.get(kind);if(hit&&now-hit.time<90)return hit.src;
 const a=api();
 if(a&&now-lastCapture>70){
  lastCapture=now;const out=safe(()=>a.renderPreviewFrame(kind,now/1000),'');
  if(out&&out.startsWith('data:image')){frames.set(kind,{src:out,time:now});return out}
 }
 return hit?.src||fallback();
}
function ready(src){
 if(!src)return null;let im=images.get(src);
 if(!im){im=new Image();im.src=src;images.set(src,im)}
 return im.complete&&im.naturalWidth?im:null;
}
function apply(rootNode=document){
 rootNode.querySelectorAll?.('.asset-hero').forEach(box=>{
  if(box.dataset.kcAvatar==='1')return;box.dataset.kcAvatar='1';
  const avatar=document.createElement('img');avatar.className='kc-number-avatar';avatar.alt='내 키즈케이드 아바타';avatar.draggable=false;box.appendChild(avatar);
 });
}
function tick(now){
 apply();
 document.querySelectorAll('.asset-hero').forEach(box=>{
  const wanted=deadUntil>now?'dead':box.closest('.battle.counter')?'hurt':box.closest('.battle.attack')?'attack':box.closest('#hero.run')?'walk':'idle';
  const img=box.querySelector('.kc-number-avatar'),src=source(wanted,now),im=ready(src);
  if(img&&im){if(img.src!==src)img.src=src;img.dataset.mode=wanted;box.classList.add('kc-live')}
  else box.classList.remove('kc-live');
 });
 requestAnimationFrame(tick);
}
root.KidscadeNumberTowerAvatar={
 install(){apply();requestAnimationFrame(tick)},
 death(ms=1400){deadUntil=performance.now()+ms;frames.delete('dead')},
 reset(){deadUntil=0;frames.clear()},
 apply
};
addEventListener('storage',e=>{if(e.key===PREVIEW_KEY){frames.clear();images.clear()}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>root.KidscadeNumberTowerAvatar.install(),{once:true});else root.KidscadeNumberTowerAvatar.install();
})(window);
