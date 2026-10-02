/* Kidscade Pixel Avatar v2
   Semantic-anchor paper-doll renderer for the 128x128 runtime asset pack.
   Existing v1 state/API names stay available so games do not need a migration. */
(function(root){
'use strict';

const CANVAS=128;
const ASSET_REV='18';
const RIG_PATH='runtime/avatar-rig-v2.json';
const ANIMATION_PATH='runtime/animation/animation-manifest.json';
const COUNTS={eyes:8,eyebrows:6,nose:4,mouth:8,blush:4,hair:24,upper:1,lower:1};
const DEFAULT_CONFIG={
  hairSet:'male',
  hairStyle:1,
  upper:1,
  lower:1,
  eyes:1,
  eyebrows:1,
  nose:1,
  mouth:1,
  blush:0,
  animation:'idle'
};

function pad(n){return String(n).padStart(2,'0')}
function clampInt(v,min,max){
  v=Math.round(Number(v)||min);
  return Math.max(min,Math.min(max,v));
}
function scriptBase(){
  const scripts=[...document.scripts];
  const current=document.currentScript || scripts.find(s=>/pixel-avatar-renderer\.js(?:\?|$)/.test(s.src||''));
  return current?.src ? new URL('.',current.src) : new URL('.',document.baseURI);
}
function defaultAssetRoot(){
  return new URL('assets/game/characters/kidscade-avatar-v1/',scriptBase()).href;
}
async function json(url){
  const res=await fetch(url,{cache:'no-cache'});
  if(!res.ok)throw new Error('Avatar manifest load failed: '+res.status+' '+url);
  return res.json();
}
function finitePair(value,fallback=[0,0]){
  if(!Array.isArray(value)||value.length<2)return [...fallback];
  const x=Number(value[0]),y=Number(value[1]);
  return [Number.isFinite(x)?x:fallback[0],Number.isFinite(y)?y:fallback[1]];
}
function absoluteSrc(src){
  return /^(?:data:|blob:|https?:|\/\/)/i.test(String(src||''));
}

class ImageCache{
  constructor(){this.map=new Map()}
  load(url){
    if(this.map.has(url))return this.map.get(url);
    const promise=new Promise((resolve,reject)=>{
      const img=new Image();
      img.decoding='async';
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('Avatar image load failed: '+url));
      img.src=url;
    });
    this.map.set(url,promise);
    return promise;
  }
}

class PixelAvatar{
  constructor(canvas,options={}){
    if(!(canvas instanceof HTMLCanvasElement))throw new TypeError('PixelAvatar requires a canvas.');
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d',{alpha:true});
    this.ctx.imageSmoothingEnabled=false;
    this.canvas.width=CANVAS;
    this.canvas.height=CANVAS;

    this.assetRoot=options.assetRoot || defaultAssetRoot();
    this.config={...DEFAULT_CONFIG,...(options.config||{})};
    this.extraParts=Array.isArray(options.extraParts)?options.extraParts.filter(Boolean):[];
    this.cache=new ImageCache();
    this.animationManifest=null;
    this.rig=null;
    this.frameIndex=0;
    this.lastFrameAt=0;
    this.playing=options.playing!==false;
    this.raf=0;
    this.destroyed=false;
    this.drawing=false;
    this.ready=false;
    this.onError=typeof options.onError==='function'?options.onError:console.error;
  }

  url(path){
    if(absoluteSrc(path))return path;
    const u=new URL(path,this.assetRoot);
    if(/\.(?:png|json)$/i.test(u.pathname))u.searchParams.set('v',ASSET_REV);
    return u.href;
  }

  async init(){
    [this.animationManifest,this.rig]=await Promise.all([
      json(this.url(ANIMATION_PATH)),
      json(this.url(RIG_PATH))
    ]);
    this.assertRig();
    this.config=this.normalizeConfig(this.config);
    this.ready=true;
    await this.draw();
    if(this.playing)this.start();
    return this;
  }

  assertRig(){
    if(!this.rig?.canonicalAnchors||!this.rig?.layerSpecs||!this.rig?.zSlots){
      throw new Error('Avatar rig is incomplete.');
    }
    for(const [name,spec] of Object.entries(this.rig.layerSpecs)){
      if(!this.rig.canonicalAnchors[spec.attach]){
        throw new Error('Avatar rig layer '+name+' references missing anchor '+spec.attach);
      }
      if(!(spec.zSlot in this.rig.zSlots)){
        throw new Error('Avatar rig layer '+name+' references missing zSlot '+spec.zSlot);
      }
    }
  }

  normalizeConfig(next){
    const raw={...this.config,...(next||{})};
    if(raw.hair!=null&&raw.hairStyle==null)raw.hairStyle=raw.hair;
    if(raw.noses!=null&&raw.nose==null)raw.nose=raw.noses;
    if(raw.mouths!=null&&raw.mouth==null)raw.mouth=raw.mouths;
    raw.hairSet=raw.hairSet==='female'?'female':'male';
    raw.hairStyle=clampInt(raw.hairStyle,1,COUNTS.hair);
    raw.upper=raw.upper?1:0;
    raw.lower=raw.lower?1:0;
    raw.eyes=clampInt(raw.eyes,1,COUNTS.eyes);
    raw.eyebrows=clampInt(raw.eyebrows,1,COUNTS.eyebrows);
    raw.nose=clampInt(raw.nose,1,COUNTS.nose);
    raw.mouth=clampInt(raw.mouth,1,COUNTS.mouth);
    raw.blush=raw.blush?clampInt(raw.blush,1,COUNTS.blush):0;
    raw.animation=['idle','walk','static'].includes(raw.animation)?raw.animation:'idle';
    return raw;
  }

  async setConfig(patch){
    const before=this.config.animation;
    this.config=this.normalizeConfig(patch||{});
    if(before!==this.config.animation){
      this.frameIndex=0;
      this.lastFrameAt=0;
    }
    await this.draw();
    return this;
  }

  async setExtraParts(parts){
    this.extraParts=Array.isArray(parts)?parts.filter(Boolean):[];
    await this.draw();
    return this;
  }

  setAnimation(name){return this.setConfig({animation:name})}

  start(){
    if(this.destroyed)return;
    this.playing=true;
    if(!this.raf)this.raf=requestAnimationFrame(t=>this.tick(t));
  }

  pause(){
    this.playing=false;
    if(this.raf)cancelAnimationFrame(this.raf);
    this.raf=0;
  }

  destroy(){
    this.pause();
    this.destroyed=true;
  }

  tick(now){
    this.raf=0;
    if(!this.playing||this.destroyed)return;
    const set=this.currentFrameSet();
    if(set){
      const frameMs=1000/Math.max(1,set.fps||6);
      if(!this.lastFrameAt)this.lastFrameAt=now;
      if(now-this.lastFrameAt>=frameMs){
        const advance=Math.max(1,Math.floor((now-this.lastFrameAt)/frameMs));
        this.frameIndex=(this.frameIndex+advance)%set.count;
        this.lastFrameAt+=advance*frameMs;
        if(!this.drawing)this.draw().catch(this.onError);
      }
    }
    this.raf=requestAnimationFrame(t=>this.tick(t));
  }

  currentFrameSet(){
    if(!this.animationManifest||this.config.animation==='static')return null;
    return this.animationManifest.frameSets?.[this.config.animation]||null;
  }

  currentFrame(){
    const set=this.currentFrameSet();
    return set?.frames?.[this.frameIndex%set.frames.length]||null;
  }

  pathsFor(config){
    const c=this.normalizeConfig(config);
    const hs=c.hairSet,hn=pad(c.hairStyle);
    return {
      base:'runtime/base/master-base-128.png',
      hairBack:null,
      hairFront:`runtime/hair/front/${hs}/hair-front-${hs}-${hn}.png`,
      upper:c.upper?'runtime/clothes/upper/blue-star-zip-hoodie-01':null,
      lower:c.lower?'runtime/clothes/lower/denim-cuffed-jeans-01':null,
      eyes:`runtime/face/eyes/eyes-${pad(c.eyes)}.png`,
      eyebrows:`runtime/face/eyebrows/eyebrows-${pad(c.eyebrows)}.png`,
      nose:`runtime/face/noses/nose-${pad(c.nose)}.png`,
      mouth:`runtime/face/mouths/mouth-${pad(c.mouth)}.png`,
      blush:c.blush?`runtime/face/blush/blush-${pad(c.blush)}.png`:null
    };
  }

  paths(){return this.pathsFor(this.config)}

  groupTransform(groupName,frame){
    const group=this.rig.transformGroups?.[groupName]||this.rig.transformGroups?.canvas||{};
    const sourceAnchor=finitePair(this.rig.canonicalAnchors[group.sourceAnchor]||[0,0]);
    const transformName=group.frameTransform;
    const transform=transformName&&frame?.[transformName]?frame[transformName]:null;
    if(!transform){
      return {sourceCenter:sourceAnchor,destCenter:sourceAnchor,scaleX:1,scaleY:1};
    }
    const sourceCenter=finitePair(transform.sourceCenter,sourceAnchor);
    const destCenter=finitePair(transform.destCenter,sourceCenter);
    const scaleX=Number(transform.scaleX ?? transform.scale);
    const scaleY=Number(transform.scaleY ?? transform.scale);
    return {
      sourceCenter,
      destCenter,
      scaleX:Number.isFinite(scaleX)&&scaleX!==0?scaleX:1,
      scaleY:Number.isFinite(scaleY)&&scaleY!==0?scaleY:1
    };
  }

  resolvePlacement(spec,frame){
    if(!spec||spec.visible===false)return null;
    const canonical=finitePair(this.rig.canonicalAnchors[spec.attach]);
    if(!this.rig.canonicalAnchors[spec.attach]){
      throw new Error('Avatar part references missing anchor '+spec.attach);
    }
    const pivot=finitePair(spec.pivot,canonical);
    const origin=finitePair(spec.origin,[0,0]);
    const t=this.groupTransform(spec.transformGroup||'canvas',frame);
    const tweak=spec.renderTweak||{};
    const offsetX=Number(tweak.offsetX);
    const offsetY=Number(tweak.offsetY);
    const anchor=[
      t.destCenter[0]+(canonical[0]-t.sourceCenter[0])*t.scaleX+(Number.isFinite(offsetX)?offsetX:0),
      t.destCenter[1]+(canonical[1]-t.sourceCenter[1])*t.scaleY+(Number.isFinite(offsetY)?offsetY:0)
    ];
    const localScale=Number(spec.scale);
    const scale=Number.isFinite(localScale)&&localScale>0?localScale:1;
    const tweakScaleX=Number(tweak.scaleX);
    const tweakScaleY=Number(tweak.scaleY);
    return {
      anchor,
      pivot,
      origin,
      scaleX:t.scaleX*scale*(Number.isFinite(tweakScaleX)&&tweakScaleX>0?tweakScaleX:1),
      scaleY:t.scaleY*scale*(Number.isFinite(tweakScaleY)&&tweakScaleY>0?tweakScaleY:1),
      z:this.rig.zSlots[spec.zSlot]??0
    };
  }

  drawPart(targetCtx,img,spec,frame){
    if(!img||!spec)return;
    const placement=this.resolvePlacement(spec,frame);
    if(!placement)return;
    const [ax,ay]=placement.anchor;
    const [px,py]=placement.pivot;
    const [ox,oy]=placement.origin;
    targetCtx.save();
    targetCtx.translate(ax,ay);
    targetCtx.scale(placement.scaleX,placement.scaleY);
    targetCtx.translate(-px,-py);
    targetCtx.drawImage(img,ox,oy);
    targetCtx.restore();
  }

  makeBuiltInCalls(config,frame){
    const p=this.pathsFor(config);
    const frameFile=frame?.file||'';
    const bodyPath=frame?`runtime/animation/${frame.file}`:p.base;
    const lowerPath=p.lower?(frame?`${p.lower}/${frameFile}`:`${p.lower}/static.png`):null;
    const upperPath=p.upper?(frame?`${p.upper}/${frameFile}`:`${p.upper}/static.png`):null;
    const defs=this.rig.layerSpecs;
    return [
      ['hairBack',p.hairBack],
      ['base',bodyPath],
      ['lower',lowerPath],
      ['upper',upperPath],
      ['blush',p.blush],
      ['eyes',p.eyes],
      ['eyebrows',p.eyebrows],
      ['nose',p.nose],
      ['mouth',p.mouth],
      ['hairFront',p.hairFront]
    ].filter(([,src])=>Boolean(src)).map(([key,src],order)=>({
      id:key,
      src,
      spec:defs[key],
      order
    }));
  }

  normalizeExtraCall(part,order){
    if(!part?.src)return null;
    const base=part.slot&&this.rig.layerSpecs[part.slot]?this.rig.layerSpecs[part.slot]:{};
    const spec={...base,...part};
    if(!spec.attach||!Array.isArray(spec.pivot)||!spec.zSlot){
      throw new Error('Avatar extra part needs attach, pivot and zSlot: '+(part.id||part.src));
    }
    if(!spec.transformGroup)spec.transformGroup='canvas';
    return {id:part.id||('extra-'+order),src:part.src,spec,order:1000+order};
  }

  async renderTo(targetCtx,config=this.config,frame=this.currentFrame(),extraParts=this.extraParts){
    if(!this.ready)throw new Error('Avatar renderer is not ready.');
    const calls=this.makeBuiltInCalls(config,frame);
    (extraParts||[]).forEach((part,index)=>{
      const call=this.normalizeExtraCall(part,index);
      if(call)calls.push(call);
    });
    for(const call of calls){
      call.placement=this.resolvePlacement(call.spec,frame);
      call.z=call.placement?.z??0;
    }
    calls.sort((a,b)=>a.z-b.z||a.order-b.order);
    const images=await Promise.all(calls.map(call=>this.cache.load(this.url(call.src)).catch(()=>null)));

    targetCtx.save();
    targetCtx.setTransform(1,0,0,1,0,0);
    targetCtx.clearRect(0,0,CANVAS,CANVAS);
    targetCtx.imageSmoothingEnabled=false;
    calls.forEach((call,index)=>{
      const img=images[index];
      if(img)this.drawPart(targetCtx,img,call.spec,frame);
    });
    targetCtx.restore();
  }

  async draw(){
    if(!this.ready)return;
    if(this.drawing)return;
    this.drawing=true;
    try{
      await this.renderTo(this.ctx,this.config,this.currentFrame(),this.extraParts);
    }finally{
      this.drawing=false;
    }
  }

  async snapshot(type='image/png',quality){
    await this.draw();
    return this.canvas.toDataURL(type,quality);
  }
}

async function create(canvas,options={}){
  const avatar=new PixelAvatar(canvas,options);
  return avatar.init();
}

const api={
  version:2,
  CANVAS,
  ASSET_REV,
  RIG_PATH,
  COUNTS:{...COUNTS},
  DEFAULT_CONFIG:{...DEFAULT_CONFIG},
  PixelAvatar,
  create,
  assetRoot:defaultAssetRoot
};
root.KidscadePixelAvatarV2=api;
root.KidscadePixelAvatarV1=api;
})(window);