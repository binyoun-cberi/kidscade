(function(root){
  'use strict';
  const PREVIEW_KEY='kidscade-avatar-studio-preview';
  function host(){try{if(parent&&parent!==window&&parent.location.origin===location.origin)return parent}catch(_){}return window}
  function safe(fn,f=''){try{return fn()}catch(_){return f}}
  function api(){
    const h=host();
    return [safe(()=>window.KidscadeAvatarShop,null),safe(()=>h.KidscadeAvatarShop,null),safe(()=>h.document?.getElementById('kidscade-avatar-studio-frame')?.contentWindow?.KidscadeAvatarShop,null)]
      .find(v=>v&&typeof v.renderPreviewFrame==='function')||null;
  }
  function staticSource(){
    const saved=safe(()=>localStorage.getItem(PREVIEW_KEY),'');
    if(saved&&saved.startsWith('data:image'))return saved;
    const h=host(),svg=safe(()=>typeof h.renderAvatarSVG==='function'?h.renderAvatarSVG():'','');
    if(svg){
      const embedded=(svg.match(/<image[^>]+href=["']([^"']+)["']/i)||[])[1];
      if(embedded&&embedded.startsWith('data:image'))return embedded;
      return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    }
    return '';
  }
  class ForgeAvatar{
    constructor(img){
      this.img=img;this.mode='idle';this.until=0;this.last=0;this.flip=1;this.tool=null;this.source='';
      this.setSource(staticSource());
      this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
      addEventListener('storage',e=>{if(e.key===PREVIEW_KEY)this.setSource(staticSource(),true)});
    }
    setSource(src,force=false){if(!src||(!force&&src===this.source))return;this.source=src;this.img.src=src}
    pose(mode='idle',duration=0){this.mode=mode;this.until=duration?performance.now()+duration:0}
    face(dir){this.flip=dir<0?-1:1}
    playForge(kind,duration=760){
      this.tool=kind;this.pose('smile',duration);this.img.closest('.avatar-stage')?.classList.add('forging',kind);
      setTimeout(()=>{const s=this.img.closest('.avatar-stage');s?.classList.remove('forging','add','sub','mul','div');this.tool=null},duration+80);
    }
    celebrate(){this.pose('smile',900);const s=this.img.closest('.avatar-stage');s?.classList.add('celebrate');setTimeout(()=>s?.classList.remove('celebrate'),900)}
    loop(now){
      if(this.until&&now>=this.until){this.mode='idle';this.until=0}
      if(now-this.last>95){
        this.last=now;const a=api();
        if(a){const src=safe(()=>a.renderPreviewFrame(this.mode,now/1000),'');if(src&&src.startsWith('data:image'))this.setSource(src)}
        else if(!this.source)this.setSource(staticSource());
      }
      requestAnimationFrame(this.loop);
    }
  }
  root.FractionSmithAvatar={ForgeAvatar,staticSource,avatarApi:api};
})(window);