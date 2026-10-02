/* Kidscade Pixel Avatar v1
   Layered PNG renderer for the 128x128 runtime asset pack.
   Safe to load alongside the legacy avatar studio; it does not mutate legacy storage. */
(function(root){
'use strict';

const CANVAS=128;
const COUNTS={eyes:8,eyebrows:6,nose:4,mouth:8,blush:4,hair:24,upper:1,lower:1};
const HAIR_PIVOT=[65.5,43.5];
const MASTER_HEAD_BBOX=[40,20,91,67];
// Both hair layers share one style transform so front/back never drift apart.
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
    this.cache=new ImageCache();
    this.animationManifest=null;
    this.hairManifest=null;
    this.frameIndex=0;
    this.lastFrameAt=0;
    this.playing=options.playing!==false;
    this.raf=0;
    this.destroyed=false;
    this.drawing=false;
    this.ready=false;
    this.onError=typeof options.onError==='function'?options.onError:console.error;
  }

  url(path){return new URL(path,this.assetRoot).href}

  async init(){
    const [animationManifest,hairManifest]=await Promise.all([
      json(this.url('runtime/animation/animation-manifest.json')),
      json(this.url('runtime/hair/hair-manifest.json'))
    ]);
    this.animationManifest=animationManifest;
    this.hairManifest=hairManifest;
    this.ready=true;
    await this.draw();
    if(this.playing)this.start();
    return this;
  }

  normalizeConfig(next){
    const c={...this.config,...next};
    c.hairSet=c.hairSet==='female'?'female':'male';
    c.hairStyle=clampInt(c.hairStyle,1,COUNTS.hair);
    c.upper=c.upper?1:0;
    c.lower=c.lower?1:0;
    c.eyes=clampInt(c.eyes,1,COUNTS.eyes);
    c.eyebrows=clampInt(c.eyebrows,1,COUNTS.eyebrows);
    c.nose=clampInt(c.nose,1,COUNTS.nose);
    c.mouth=clampInt(c.mouth,1,COUNTS.mouth);
    c.blush=c.blush?clampInt(c.blush,1,COUNTS.blush):0;
    c.animation=['idle','walk','static'].includes(c.animation)?c.animation:'idle';
    return c;
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

  paths(){
    const c=this.normalizeConfig(this.config);
    const hs=c.hairSet, hn=pad(c.hairStyle);
    return {
      base:'runtime/base/master-base-128.png',
      hairBack:`runtime/hair/back/${hs}/hair-back-${hs}-${hn}.png`,
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

  getHairItem(set,n){
    return this.hairManifest?.sets?.[set]?.items?.[Math.max(0,n-1)]||null;
  }

  hairStyleFit(set,n){
    const item=this.getHairItem(set,n);
    const box=item?.backBBox||[12,18,120,112];
    const [x0,y0,x1,y1]=box;
    const [px,py]=HAIR_PIVOT;
    const [hx0,hy0,hx1]=MASTER_HEAD_BBOX;
    const headWidth=hx1-hx0;
    const headCenterX=(hx0+hx1)/2;

    const boxW=Math.max(1,x1-x0);
    const boxH=Math.max(1,y1-y0);
    const targetWidth=headWidth*(set==='female'?1.38:1.30);
    const targetTop=hy0-(set==='female'?8:6);

    let scaleX=targetWidth/boxW;
    scaleX=Math.max(.50,Math.min(.70,scaleX));
    let scaleY=scaleX*1.15;
    scaleY=Math.max(.58,Math.min(.78,scaleY));
    const maxHeight=(set==='female'?86:72);
    scaleY=Math.min(scaleY,maxHeight/boxH);

    const boxCx=(x0+x1)/2;
    const scaledCx=px+(boxCx-px)*scaleX;
    const scaledTop=py+(y0-py)*scaleY;

    return {
      scaleX,
      scaleY,
      offsetX:headCenterX-scaledCx,
      offsetY:targetTop-scaledTop
    };
  }

  hairTransform(set,n,frameTransform=null){
    const fit=this.hairStyleFit(set,n);
    const frameScale=Number(frameTransform?.scale)||1;
    const dest=frameTransform?.destCenter||HAIR_PIVOT;
    return {
      sourceCenter:HAIR_PIVOT,
      destCenter:[
        dest[0]+fit.offsetX*frameScale,
        dest[1]+fit.offsetY*frameScale
      ],
      scaleX:frameScale*fit.scaleX,
      scaleY:frameScale*fit.scaleY
    };
  }

  drawLayer(img,transform){
    const ctx=this.ctx;
    if(!transform){
      ctx.drawImage(img,0,0);
      return;
    }
    const [sx,sy]=transform.sourceCenter;
    const [dx,dy]=transform.destCenter;
    const scaleX=Number(transform.scaleX ?? transform.scale)||1;
    const scaleY=Number(transform.scaleY ?? transform.scale)||1;
    ctx.save();
    ctx.translate(Math.round(dx),Math.round(dy));
    ctx.scale(scaleX,scaleY);
    ctx.translate(-sx,-sy);
    ctx.drawImage(img,0,0);
    ctx.restore();
  }

  async draw(){
    if(!this.ready&&!this.animationManifest)return;
    if(this.drawing)return;
    this.drawing=true;
    try{
      const p=this.paths();
      const frame=this.currentFrame();
      const bodyPath=frame?`runtime/animation/${frame.file}`:p.base;
      const lowerPath=p.lower?(frame?`${p.lower}/${frame.file}`:`${p.lower}/static.png`):null;
      const upperPath=p.upper?(frame?`${p.upper}/${frame.file}`:`${p.upper}/static.png`):null;
      const urls=[p.hairBack,bodyPath,lowerPath,upperPath,p.eyes,p.eyebrows,p.nose,p.mouth,p.blush,p.hairFront].filter(Boolean);
      const imgs=await Promise.all(urls.map(path=>this.cache.load(this.url(path))));
      let i=0;
      const hairBack=imgs[i++], body=imgs[i++], lower=lowerPath?imgs[i++]:null,
            upper=upperPath?imgs[i++]:null, eyes=imgs[i++], eyebrows=imgs[i++], nose=imgs[i++], mouth=imgs[i++],
            blush=p.blush?imgs[i++]:null, hairFront=imgs[i++];
      const headTransform=frame?.headTransform||null;
      const hairTransformValue=this.hairTransform(this.config.hairSet,this.config.hairStyle,headTransform);

      const ctx=this.ctx;
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,CANVAS,CANVAS);
      ctx.imageSmoothingEnabled=false;

      this.drawLayer(hairBack,hairTransformValue);
      ctx.drawImage(body,0,0);
      if(lower)ctx.drawImage(lower,0,0);
      if(upper)ctx.drawImage(upper,0,0);
      this.drawLayer(eyes,headTransform);
      this.drawLayer(eyebrows,headTransform);
      this.drawLayer(nose,headTransform);
      this.drawLayer(mouth,headTransform);
      if(blush)this.drawLayer(blush,headTransform);
      this.drawLayer(hairFront,hairTransformValue);
      ctx.restore();
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

root.KidscadePixelAvatarV1={
  CANVAS,
  COUNTS:{...COUNTS},
  DEFAULT_CONFIG:{...DEFAULT_CONFIG},
  PixelAvatar,
  create,
  assetRoot:defaultAssetRoot
};
})(window);
