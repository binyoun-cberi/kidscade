/* KIDSCADE Avatar v3 public runtime.
   Uses the approved 23-frame school starter sprite sheet.
   JSON editing/import stays in the global-admin teacher studio. */
(function(root){
'use strict';

const SIZE=128;
const ASSET_ROOT='../school-starter/';
const MANIFEST_FILE='manifest.json';
const SHEET_FILE='school-starter-sheet.png';
const MODE_ALIAS=Object.freeze({
  static:'stand',idle:'stand',smile:'stand',
  stand:'stand',walk:'walk',jump:'jump',attack:'attack',
  hurt:'hurt',dead:'dead',sit:'sit',pickup:'pickup'
});
const LOOPING=new Set(['stand','walk','sit']);

function scriptBase(){
  const scripts=[...document.scripts];
  const current=document.currentScript||scripts.find(s=>/school-avatar-runtime\.js(?:\?|$)/.test(s.src||''));
  return current?.src?new URL('.',current.src):new URL('.',document.baseURI);
}
function assetUrl(name){return new URL(ASSET_ROOT+name,scriptBase()).href}
async function loadJson(url){
  const response=await fetch(url,{cache:'no-cache'});
  if(!response.ok)throw new Error('Avatar manifest load failed: '+response.status);
  return response.json();
}
function loadImage(url){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.decoding='async';
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('Avatar sprite sheet load failed.'));
    image.src=url;
  });
}
function normalizeMode(mode){return MODE_ALIAS[String(mode||'').toLowerCase()]||'stand'}
function finiteTime(value){
  const n=Number(value);
  return Number.isFinite(n)&&n>=0?n:0;
}
function frameAt(manifest,mode,timeSec,loop=true){
  const key=normalizeMode(mode);
  const frames=manifest?.animations?.[key]||manifest?.animations?.stand||[];
  if(!frames.length)return {index:0,id:'stand-01',durationMs:500};
  const durations=frames.map(frame=>Math.max(1,Number(frame.durationMs)||100));
  const total=durations.reduce((sum,n)=>sum+n,0);
  let elapsed=finiteTime(timeSec)*1000;
  if(loop||LOOPING.has(key)) elapsed=total?elapsed%total:0;
  else elapsed=Math.min(elapsed,Math.max(0,total-1));
  let cursor=0;
  for(let i=0;i<frames.length;i++){
    cursor+=durations[i];
    if(elapsed<cursor)return frames[i];
  }
  return frames[frames.length-1];
}
function createCanvas(){
  const canvas=document.createElement('canvas');
  canvas.width=SIZE;canvas.height=SIZE;
  return canvas;
}

let resourcesPromise=null;
async function resources(){
  if(!resourcesPromise){
    resourcesPromise=Promise.all([
      loadJson(assetUrl(MANIFEST_FILE)),
      loadImage(assetUrl(SHEET_FILE))
    ]).then(([manifest,sheet])=>({manifest,sheet}));
  }
  return resourcesPromise;
}
function drawIndex(ctx,sheet,index){
  const safe=Math.max(0,Math.floor(Number(index)||0));
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,SIZE,SIZE);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(sheet,safe*SIZE,0,SIZE,SIZE,0,0,SIZE,SIZE);
  ctx.restore();
}
function dataUrlForFrame(res,index){
  const canvas=createCanvas();
  const ctx=canvas.getContext('2d',{alpha:true});
  ctx.imageSmoothingEnabled=false;
  drawIndex(ctx,res.sheet,index);
  return canvas.toDataURL('image/png');
}

class SchoolAvatar{
  constructor(canvas,res,options={}){
    if(!(canvas instanceof HTMLCanvasElement))throw new TypeError('SchoolAvatar requires a canvas.');
    this.canvas=canvas;
    this.canvas.width=SIZE;this.canvas.height=SIZE;
    this.ctx=canvas.getContext('2d',{alpha:true});
    this.ctx.imageSmoothingEnabled=false;
    this.manifest=res.manifest;
    this.sheet=res.sheet;
    this.mode=normalizeMode(options.mode||options.animation||'stand');
    this.playing=options.playing!==false;
    this.startedAt=performance.now();
    this.raf=0;
    this.destroyed=false;
    this.lastIndex=-1;
    this.draw(this.mode,0);
    if(this.playing)this.start();
  }
  record(mode=this.mode,timeSec=0,loop=true){
    return frameAt(this.manifest,mode,timeSec,loop);
  }
  draw(mode=this.mode,timeSec=0,loop=true,targetCtx=this.ctx){
    const record=this.record(mode,timeSec,loop);
    drawIndex(targetCtx,this.sheet,record.index);
    if(targetCtx===this.ctx)this.lastIndex=record.index;
    return record;
  }
  renderTo(targetCtx,mode='stand',timeSec=0,loop=true){
    return this.draw(mode,timeSec,loop,targetCtx);
  }
  frameDataURL(mode='stand',timeSec=0,loop=true){
    const record=this.record(mode,timeSec,loop);
    return dataUrlForFrame({sheet:this.sheet},record.index);
  }
  snapshot(type='image/png'){return Promise.resolve(this.canvas.toDataURL(type))}
  setAnimation(mode){
    this.mode=normalizeMode(mode);
    this.startedAt=performance.now();
    this.draw(this.mode,0);
    return Promise.resolve(this);
  }
  start(){
    if(this.destroyed||this.raf)return;
    this.playing=true;
    const tick=now=>{
      this.raf=0;
      if(!this.playing||this.destroyed)return;
      const elapsed=Math.max(0,(now-this.startedAt)/1000);
      const record=this.record(this.mode,elapsed,true);
      if(record.index!==this.lastIndex)this.draw(this.mode,elapsed,true);
      this.raf=requestAnimationFrame(tick);
    };
    this.raf=requestAnimationFrame(tick);
  }
  pause(){
    this.playing=false;
    if(this.raf)cancelAnimationFrame(this.raf);
    this.raf=0;
  }
  destroy(){this.pause();this.destroyed=true}
}

async function create(canvas,options={}){
  const res=await resources();
  return new SchoolAvatar(canvas,res,options);
}
async function preload(){return resources()}
async function frameDataURL(mode='stand',timeSec=0,loop=true){
  const res=await resources();
  const record=frameAt(res.manifest,mode,timeSec,loop);
  return dataUrlForFrame(res,record.index);
}

root.KidscadeSchoolAvatarV3=Object.freeze({
  version:'school-avatar-v3-23f-1',
  size:SIZE,
  create,
  preload,
  normalizeMode,
  frameAt,
  frameDataURL,
  assetRoot:assetUrl('')
});
})(window);
