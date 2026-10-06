(function(root){
'use strict';
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const HERO_RE=/\/kenney-platformer-characters\/player\/poses\/player-(stand|action1|hurt)\.png(?:[?#]|$)/;
const cache=new Map();
let lastCapture=0,lastX=null,face=1,deadUntil=0;

function safe(fn,f=''){try{return fn()}catch(_){return f}}
function host(){return safe(()=>parent&&parent!==window&&parent.location.origin===location.origin?parent:window,window)}
function api(){
  const h=host();
  return [safe(()=>window.KidscadeAvatarShop,null),safe(()=>h.KidscadeAvatarShop,null),safe(()=>h.document?.getElementById('kidscade-avatar-studio-frame')?.contentWindow?.KidscadeAvatarShop,null)]
    .find(v=>v&&typeof v.renderPreviewFrame==='function')||null;
}
function staticSource(){
  const saved=safe(()=>localStorage.getItem(PREVIEW_KEY),'');
  if(saved&&saved.startsWith('data:image'))return saved;
  const h=host();
  const hostSaved=safe(()=>h.localStorage.getItem(PREVIEW_KEY),'');
  if(hostSaved&&hostSaved.startsWith('data:image'))return hostSaved;
  return '';
}
function modeFor(src){
  if(/player-hurt\.png/.test(src))return 'hurt';
  if(/player-action1\.png/.test(src))return 'attack';
  return 'idle';
}
function liveSource(mode,now){
  if(deadUntil>now)mode='dead';
  const hit=cache.get(mode);
  if(hit&&now-hit.time<90)return hit.src;
  const a=api();
  if(a&&now-lastCapture>72){
    lastCapture=now;
    const src=safe(()=>a.renderPreviewFrame(mode,now/1000),'');
    if(src&&src.startsWith('data:image')){cache.set(mode,{time:now,src});return src}
  }
  return hit?.src||staticSource();
}
const imageCache=new Map();
function imageFor(src){
  if(!src)return null;
  let img=imageCache.get(src);
  if(!img){img=new Image();img.src=src;imageCache.set(src,img)}
  return img.complete&&img.naturalWidth?img:null;
}
function install(){
  const canvas=document.getElementById('game-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx||ctx.__kidscadeHanjaAvatar)return;
  ctx.__kidscadeHanjaAvatar=true;
  const raw=ctx.drawImage.bind(ctx);
  ctx.drawImage=function(img,...args){
    const src=String(img?.currentSrc||img?.src||'');
    if(this.canvas===canvas&&HERO_RE.test(src)&&args.length>=4){
      const now=performance.now(), mode=modeFor(src), avatar=imageFor(liveSource(mode,now));
      if(avatar){
        const dx=args[0],dy=args[1],dw=args[2],dh=args[3];
        if(Number.isFinite(dx)&&lastX!==null&&Math.abs(dx-lastX)>.35)face=dx>lastX?1:-1;
        lastX=dx;
        const scale=Math.min(dw/avatar.naturalWidth,dh/avatar.naturalHeight);
        const w=avatar.naturalWidth*scale,h=avatar.naturalHeight*scale;
        const x=dx+(dw-w)/2,y=dy+dh-h;
        this.save();
        this.imageSmoothingEnabled=false;
        if(face<0){this.translate(x+w,y);this.scale(-1,1);raw(avatar,0,0,w,h)}
        else raw(avatar,x,y,w,h);
        this.restore();
        return;
      }
    }
    return raw(img,...args);
  };
  addEventListener('storage',e=>{if(e.key===PREVIEW_KEY){cache.clear();imageCache.clear()}});
}
root.KidscadeHanjaAvatar={
  install,
  death(duration=1300){deadUntil=performance.now()+duration;cache.delete('dead')},
  reset(){deadUntil=0;lastX=null;face=1}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);
