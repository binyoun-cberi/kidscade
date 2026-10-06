(function(root){
'use strict';
const KEY='kidscade-avatar-studio-preview',cache=new Map();let last=0;
function safe(fn,f=''){try{return fn()}catch(_){return f}}
function host(){return safe(()=>parent&&parent!==window&&parent.location.origin===location.origin?parent:window,window)}
function api(){const h=host();return [safe(()=>window.KidscadeAvatarShop,null),safe(()=>h.KidscadeAvatarShop,null),safe(()=>h.document?.getElementById('kidscade-avatar-studio-frame')?.contentWindow?.KidscadeAvatarShop,null)].find(x=>x&&typeof x.renderPreviewFrame==='function')||null}
function fallback(){const h=host();return safe(()=>localStorage.getItem(KEY),'')||safe(()=>h.localStorage.getItem(KEY),'')}
function mode(m){return ({stand:'idle',idle:'idle',run:'walk',walk:'walk',charge:'idle',fire:'attack',attack:'attack',hit:'hurt',hurt:'hurt',lose:'dead',dead:'dead',win:'idle',cheer:'idle',pickup:'pickup',sit:'sit'})[m]||'idle'}
function frame(m='idle',t=performance.now()){m=mode(m);const old=cache.get(m);if(old&&t-old.t<85)return old.src;const a=api();if(a&&t-last>65){last=t;const src=safe(()=>a.renderPreviewFrame(m,t/1000),'');if(src&&src.startsWith('data:image')){cache.set(m,{src,t});return src}}return old?.src||fallback()}
function isAvailable(){return !!(api()||fallback())}
function applyImg(img,m='idle'){if(!img)return false;const src=frame(m);if(!src)return false;if(img.src!==src)img.src=src;img.dataset.kidscadeAvatar='1';return true}
root.KidscadeGameAvatar={frame,applyImg,isAvailable,clear(){cache.clear();last=0}};
addEventListener('storage',e=>{if(e.key===KEY)root.KidscadeGameAvatar.clear()});
})(window);