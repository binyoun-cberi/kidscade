/* Kidscade World v2 - compatibility bridge + current Deluxe avatar actor.
   Garden / wallet data remain read-only in this phase. */
(function(root){
  'use strict';
  const NS=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
  const PREVIEW_KEY='kidscade-avatar-studio-preview';

  function host(){
    try{if(root.parent&&root.parent!==root&&root.parent.location.origin===root.location.origin)return root.parent;}catch(_){}
    return root;
  }
  function safe(fn,fallback=null){try{return fn()}catch(_){return fallback}}
  function parse(raw,fallback=null){try{return raw?JSON.parse(raw):fallback}catch(_){return fallback}}

  function readGarden(){
    const h=host();
    const api=safe(()=>h.KidscadeGarden,null);
    if(api&&typeof api.snapshot==='function'){
      const s=safe(()=>api.snapshot(),null);if(s)return s;
    }
    return parse(localStorage.getItem('kidscade_garden_v1'),{})||{};
  }

  function readSeeds(){
    const h=host();
    const fn=safe(()=>h.getPersistedCoins,null);
    if(typeof fn==='function'){
      const n=Number(safe(()=>fn(),0));if(Number.isFinite(n))return n;
    }
    const n=Number(localStorage.getItem('kidscade_coins'));return Number.isFinite(n)?n:0;
  }

  function readAvatarSVG(){
    const h=host();
    const fn=safe(()=>h.renderAvatarSVG,null);
    if(typeof fn==='function')return safe(()=>fn(),'')||'';
    return '';
  }

  function avatarApi(){
    const h=host();
    const candidates=[
      safe(()=>root.KidscadeAvatarShop,null),
      safe(()=>h.KidscadeAvatarShop,null),
      safe(()=>h.document?.getElementById('kidscade-avatar-studio-frame')?.contentWindow?.KidscadeAvatarShop,null)
    ];
    return candidates.find(api=>api&&typeof api.renderPreviewFrame==='function')||null;
  }

  function storedAvatarPreview(){
    return safe(()=>localStorage.getItem(PREVIEW_KEY),'')||'';
  }

  function svgDataUrl(svg){
    if(!svg)return'';
    const embedded=(svg.match(/<image[^>]+href=["']([^"']+)["']/i)||[])[1];
    if(embedded&&embedded.startsWith('data:image'))return embedded;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }

  function readAvatarSource(){
    const saved=storedAvatarPreview();
    if(saved&&saved.startsWith('data:image'))return saved;
    return svgDataUrl(readAvatarSVG());
  }

  function snapshot(){
    const garden=readGarden();
    const liveFrameApi=!!avatarApi();
    return {
      seeds:readSeeds(),
      avatarSVG:readAvatarSVG(),
      avatarSource:readAvatarSource(),
      garden:{
        owned:Array.isArray(garden?.owned)?[...garden.owned]:[],
        placed:Array.isArray(garden?.placed)?garden.placed.map(v=>({...v})):[],
        stock:garden?.stock&&typeof garden.stock==='object'?{...garden.stock}:{},
        origins:garden?.origins&&typeof garden.origins==='object'?{...garden.origins}:{},
        facilities:safe(()=>host().KidscadeGarden?.facilities,{})||{}
      },
      capabilities:{
        liveGardenApi:!!safe(()=>host().KidscadeGarden,false),
        liveSeedApi:typeof safe(()=>host().getPersistedCoins,null)==='function',
        liveAvatarApi:typeof safe(()=>host().renderAvatarSVG,null)==='function',
        liveAvatarFrameApi:liveFrameApi,
        phase1ReadOnly:true
      }
    };
  }

  class AvatarActor{
    constructor(entity,world,fallbackRender){
      this.entity=entity;
      this.world=world;
      this.fallbackRender=typeof fallbackRender==='function'?fallbackRender:null;
      this.img=new Image();
      this.img.decoding='async';
      this.ready=false;
      this.source='';
      this.facing=1;
      this.lastCapture=0;
      this.lastStaticRefresh=0;
      this.action='';
      this.actionUntil=0;
      this.jumpStart=0;
      this.jumpDuration=0;
      this.img.onload=()=>{this.ready=true;};
      this.img.onerror=()=>{this.ready=false;};
      this.refreshStatic(true);
      AvatarActor.instances.add(this);
    }
    destroy(){AvatarActor.instances.delete(this);}
    setSource(src){
      if(!src||src===this.source)return false;
      this.source=src;
      this.ready=false;
      this.img.src=src;
      return true;
    }
    refreshStatic(force=false){
      const now=performance.now();
      if(!force&&now-this.lastStaticRefresh<1200)return;
      this.lastStaticRefresh=now;
      this.setSource(readAvatarSource());
    }
    play(action,duration=700){
      const now=performance.now();
      this.action=action||'';
      this.actionUntil=now+Math.max(80,duration);
      if(action==='jump'){this.jumpStart=now;this.jumpDuration=Math.max(200,duration);}
    }
    mode(now,moving){
      if(this.action&&now<this.actionUntil){
        if(['jump','smile','walk','idle'].includes(this.action))return this.action;
        return 'smile';
      }
      if(this.action&&now>=this.actionUntil)this.action='';
      return moving?'walk':'idle';
    }
    captureLive(mode,now){
      const api=avatarApi();
      if(!api||now-this.lastCapture<95)return false;
      this.lastCapture=now;
      const data=safe(()=>api.renderPreviewFrame(mode,now/1000),'')||'';
      if(data&&data.startsWith('data:image')){this.setSource(data);return true;}
      return false;
    }
    render(ctx,e){
      const now=performance.now();
      const moving=Math.hypot(e.vx||0,e.vy||0)>1;
      if((e.vx||0)<-1)this.facing=-1;else if((e.vx||0)>1)this.facing=1;
      const mode=this.mode(now,moving);
      if(!this.captureLive(mode,now))this.refreshStatic(false);

      if(!this.ready||!this.img.naturalWidth){
        if(this.fallbackRender)return this.fallbackRender(ctx,e,this.world);
        return;
      }

      const speed=Math.hypot(e.vx||0,e.vy||0);
      const walkPhase=now/82;
      let bob=moving?Math.sin(walkPhase)*2.8:Math.sin(now/820)*0.55;
      let squash=1,stretch=1,lean=0,lift=0;

      if(mode==='jump'){
        const p=Math.max(0,Math.min(1,(now-this.jumpStart)/Math.max(1,this.jumpDuration)));
        const air=Math.sin(p*Math.PI);
        lift=-air*18;
        stretch=1+air*.035;
        squash=1-air*.025;
      }else if(moving){
        const gait=Math.sin(walkPhase);
        squash=1-Math.abs(gait)*.018;
        stretch=1+Math.abs(gait)*.012;
        lean=Math.max(-.055,Math.min(.055,(e.vx||0)/900));
      }

      const feetX=e.centerX,feetY=e.y+e.h+2;
      const targetH=112;
      const ratio=this.img.naturalWidth/Math.max(1,this.img.naturalHeight);
      const targetW=targetH*ratio;
      const shadowLift=Math.min(1,Math.abs(lift)/18);

      ctx.save();
      ctx.globalAlpha=.19-shadowLift*.06;
      ctx.fillStyle='#171d16';
      ctx.beginPath();
      ctx.ellipse(feetX,feetY+2,24*(1-shadowLift*.22),7*(1-shadowLift*.15),0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(feetX,feetY+bob+lift);
      ctx.scale(this.facing*stretch,squash);
      ctx.rotate(lean*this.facing);
      ctx.imageSmoothingEnabled=true;
      ctx.drawImage(this.img,-targetW/2,-targetH*.91,targetW,targetH);
      ctx.restore();
    }
  }
  AvatarActor.instances=new Set();

  function installAvatarActorHook(){
    const World=NS.World;
    if(!World||World.prototype.__kidscadeAvatarActorHook)return;
    World.prototype.__kidscadeAvatarActorHook=true;
    const original=World.prototype.setPlayer;
    World.prototype.setPlayer=function(entity){
      const player=original.call(this,entity);
      if(player?.data?.disableKidscadeAvatar)return player;
      if(player.__kidscadeAvatarActor)return player;
      const fallback=player.render;
      const actor=new AvatarActor(player,this,fallback);
      player.__kidscadeAvatarActor=actor;
      player.render=(ctx,e)=>actor.render(ctx,e);
      return player;
    };
  }

  root.addEventListener('storage',e=>{
    if(e.key!==PREVIEW_KEY)return;
    AvatarActor.instances.forEach(actor=>actor.refreshStatic(true));
  });

  NS.AvatarActor=AvatarActor;
  NS.Bridge={host,readGarden,readSeeds,readAvatarSVG,readAvatarSource,avatarApi,storedAvatarPreview,snapshot,AvatarActor};
  installAvatarActorHook();
})(window);
