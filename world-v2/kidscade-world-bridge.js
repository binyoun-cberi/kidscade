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

  function changeSeeds(delta,reason='씨앗 월드'){
    const amount=Math.trunc(Number(delta)||0),h=host();
    const wallet=safe(()=>h.KidscadeSeedWallet,null);
    if(wallet?.change)return safe(()=>wallet.change(amount,{reason,source:'seed-world'}),{ok:false,balance:readSeeds(),delta:amount});
    const before=readSeeds(),next=before+amount;
    if(next<0)return {ok:false,balance:before,delta:amount,error:'insufficient-balance'};
    localStorage.setItem('kidscade_coins',String(next));
    try{h.dispatchEvent(new CustomEvent('kidscade-seeds-change',{detail:{balance:next,delta:amount,reason}}))}catch(_){}
    return {ok:true,balance:next,delta:amount,reason};
  }
  function spendSeeds(amount,reason='씨앗 월드 꾸미기'){
    return changeSeeds(-Math.abs(Math.trunc(Number(amount)||0)),reason);
  }
  function earnSeeds(amount,reason='씨앗 월드 보상'){
    return changeSeeds(Math.abs(Math.trunc(Number(amount)||0)),reason);
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
        liveSeedWriteApi:!!safe(()=>host().KidscadeSeedWallet?.change,false),
        liveAvatarApi:typeof safe(()=>host().renderAvatarSVG,null)==='function',
        liveAvatarFrameApi:liveFrameApi,
        phase1ReadOnly:false
      }
    };
  }

  const POSE_PRESETS={
    sit:{mode:'idle',scaleY:.78,scaleX:1.02,offsetY:9,bob:0,shadow:true},
    sleep:{mode:'idle',rotation:-Math.PI/2,scaleX:.92,scaleY:.92,targetH:94,offsetY:-2,bob:0,shadow:false},
    use:{mode:'smile',rotation:.055,scaleY:.97,offsetY:2,bob:.7,shadow:true},
    wash:{mode:'smile',rotation:.08,scaleY:.96,offsetY:3,bob:.9,shadow:true},
    read:{mode:'idle',rotation:-.035,scaleY:.96,offsetY:3,bob:.35,shadow:true},
    cook:{mode:'smile',rotation:.06,scaleY:.97,offsetY:2,bob:.8,shadow:true},
    carry:{mode:'idle',scaleY:.98,offsetY:1,bob:.4,shadow:true}
  };

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
      this.pose=null;
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
    setPose(name,options={}){
      const now=performance.now();
      const preset=POSE_PRESETS[name]||{};
      const duration=Math.max(0,Number(options.duration)||0);
      this.pose={name,start:now,until:duration?now+duration:0,...preset,...options};
      if(Number(options.facing))this.facing=options.facing<0?-1:1;
      return this.pose;
    }
    clearPose(name=''){
      if(name&&this.pose?.name!==name)return false;
      this.pose=null;
      return true;
    }
    currentPose(now=performance.now()){
      if(this.pose?.until&&now>=this.pose.until)this.pose=null;
      return this.pose;
    }
    isPosing(name=''){
      const p=this.currentPose();
      return !!p&&(!name||p.name===name);
    }
    mode(now,moving){
      const pose=this.currentPose(now);
      if(pose)return pose.mode||'idle';
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
    handAnchor(front=true,options={}){
      const p=this.currentPose();
      const x=p?.renderX??this.entity.centerX;
      const y=p?.renderY??(this.entity.y+this.entity.h+2);
      const side=(front?1:-1)*this.facing;
      const reach=Number(options.reach)||19;
      const lift=Number(options.lift)||50;
      return {x:x+side*reach,y:y-lift,facing:this.facing};
    }
    render(ctx,e){
      const now=performance.now();
      const pose=this.currentPose(now);
      const moving=!pose&&Math.hypot(e.vx||0,e.vy||0)>1;
      if(!pose){if((e.vx||0)<-1)this.facing=-1;else if((e.vx||0)>1)this.facing=1;}
      const mode=this.mode(now,moving);
      if(!this.captureLive(mode,now))this.refreshStatic(false);

      if(!this.ready||!this.img.naturalWidth){
        if(this.fallbackRender)return this.fallbackRender(ctx,e,this.world);
        return;
      }

      const walkPhase=now/82;
      let bob=moving?Math.sin(walkPhase)*2.8:Math.sin(now/820)*0.55;
      let squash=1,stretch=1,lean=0,lift=0,rotation=0,offsetX=0,offsetY=0,targetH=112;
      let drawShadow=true;

      if(mode==='jump'&&!pose){
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

      if(pose){
        const elapsed=(now-pose.start)/1000;
        const pulse=pose.bob?Math.sin(elapsed*6)*pose.bob:0;
        bob=pulse;
        squash*=Number(pose.scaleY)||1;
        stretch*=Number(pose.scaleX)||1;
        rotation=Number(pose.rotation)||0;
        offsetX=Number(pose.offsetX)||0;
        offsetY=Number(pose.offsetY)||0;
        targetH=Math.max(64,Number(pose.targetH)||112);
        drawShadow=pose.shadow!==false;
      }

      const feetX=pose?.renderX??e.centerX;
      const feetY=pose?.renderY??(e.y+e.h+2);
      const ratio=this.img.naturalWidth/Math.max(1,this.img.naturalHeight);
      const targetW=targetH*ratio;
      const shadowLift=Math.min(1,Math.abs(lift)/18);

      if(drawShadow){
        ctx.save();
        ctx.globalAlpha=.19-shadowLift*.06;
        ctx.fillStyle='#171d16';
        ctx.beginPath();
        ctx.ellipse(feetX+offsetX,feetY+2,24*(1-shadowLift*.22),7*(1-shadowLift*.15),0,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(feetX+offsetX,feetY+bob+lift+offsetY);
      ctx.scale(this.facing*stretch,squash);
      ctx.rotate(rotation+lean*this.facing);
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
  NS.Bridge={host,readGarden,readSeeds,changeSeeds,spendSeeds,earnSeeds,readAvatarSVG,readAvatarSource,avatarApi,storedAvatarPreview,snapshot,AvatarActor};
  installAvatarActorHook();
})(window);
