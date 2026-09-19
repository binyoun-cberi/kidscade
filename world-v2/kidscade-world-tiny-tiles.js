/* Kidscade World v2 - Kenney Tiny Farm/Town terrain bridge.
   Auto-selects opaque terrain tiles from the committed 16px atlases and
   renders them at the World's native 48px grid. */
(function(root){
'use strict';
const K=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
if(K.TinyTiles?.installed)return;

const here=document.currentScript?.src||location.href;
const TILE=16,COLS=12,ROWS=11,W=COLS*TILE,H=ROWS*TILE;
const URLS={
  farm:new URL('../assets/game/2d/tilesets/kenney-tiny-farm/atlas/tilemap-packed.png',here).href,
  town:new URL('../assets/game/2d/tilesets/kenney-tiny-town/atlas/tilemap-packed.png',here).href
};
const atlases={farm:null,town:null};
const palette={grass:[],soil:[],water:[],path:[]};
const listeners=[];
let ready=false,failed=false;

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();img.decoding='async';
    img.onload=()=>resolve(img);img.onerror=reject;img.src=src;
  });
}
function metrics(img){
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=false;x.drawImage(img,0,0);
  const data=x.getImageData(0,0,W,H).data,out=[];
  for(let id=0;id<COLS*ROWS;id++){
    const sx=(id%COLS)*TILE,sy=Math.floor(id/COLS)*TILE;
    let n=0,r=0,g=0,b=0,rr=0,gg=0,bb=0;
    for(let yy=0;yy<TILE;yy++)for(let xx=0;xx<TILE;xx++){
      const i=((sy+yy)*W+(sx+xx))*4,a=data[i+3];
      if(a<220)continue;
      const pr=data[i],pg=data[i+1],pb=data[i+2];
      n++;r+=pr;g+=pg;b+=pb;rr+=pr*pr;gg+=pg*pg;bb+=pb*pb;
    }
    const coverage=n/(TILE*TILE);
    if(!n){out.push({id,coverage,r:0,g:0,b:0,luma:0,sat:255,variance:9999});continue;}
    r/=n;g/=n;b/=n;
    const vr=Math.max(0,rr/n-r*r),vg=Math.max(0,gg/n-g*g),vb=Math.max(0,bb/n-b*b);
    out.push({
      id,coverage,r,g,b,
      luma:r*.299+g*.587+b*.114,
      sat:Math.max(r,g,b)-Math.min(r,g,b),
      variance:Math.sqrt((vr+vg+vb)/3)
    });
  }
  return out;
}
function top(stats,score,count=4){
  return stats
    .filter(t=>t.coverage>.985)
    .map(t=>({...t,score:score(t)}))
    .sort((a,b)=>b.score-a.score)
    .slice(0,count)
    .map(t=>t.id);
}
function choose(farm,town){
  // Full-coverage cells are strongly preferred so object/character sprites
  // cannot accidentally become repeating ground.
  palette.grass=top(farm,t=>
    (t.g-t.r*.62-t.b*.24)*2.1
    -Math.abs(t.luma-132)*.20
    -t.variance*.16,5);
  palette.water=top(farm,t=>
    (t.b+t.g*.55-t.r*.78)*1.8
    -Math.abs(t.luma-142)*.12
    -t.variance*.10,4);
  palette.soil=top(farm,t=>
    (t.r*.86+t.g*.25-t.b*.70)
    -Math.abs(t.luma-116)*.30
    -t.variance*.11,5);
  palette.path=top(town,t=>
    t.luma*.48
    -t.sat*.92
    -Math.abs(t.luma-150)*.18
    -t.variance*.10,5);

  // Never leave a category empty. The early atlas cells are terrain-family
  // cells in Kenney Tiny packs and are still safer than abandoning the layer.
  if(!palette.grass.length)palette.grass=[0];
  if(!palette.soil.length)palette.soil=[1];
  if(!palette.water.length)palette.water=[2];
  if(!palette.path.length)palette.path=[0];
}
function hash(x,y,salt){
  let n=(x*73856093)^(y*19349663)^(salt*83492791);
  n=(n^(n>>>13))*1274126177;
  return (n^(n>>>16))>>>0;
}
function atlasFor(kind){return kind==='path'?atlases.town:atlases.farm;}
function listFor(kind){return palette[kind]||palette.grass;}
function drawTile(ctx,img,id,dx,dy,size){
  const sx=(id%COLS)*TILE,sy=Math.floor(id/COLS)*TILE;
  ctx.drawImage(img,sx,sy,TILE,TILE,dx,dy,size,size);
}
function fill(ctx,kind,x,y,w,h,size=48){
  if(!ready)return false;
  const img=atlasFor(kind),ids=listFor(kind);if(!img||!ids?.length)return false;
  const left=Math.floor(x/size)*size,top=Math.floor(y/size)*size;
  const right=x+w,bottom=y+h,salt={grass:1,soil:2,water:3,path:4}[kind]||0;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  for(let yy=top;yy<bottom;yy+=size){
    for(let xx=left;xx<right;xx+=size){
      const id=ids[hash(Math.floor(xx/size),Math.floor(yy/size),salt)%ids.length];
      drawTile(ctx,img,id,xx,yy,size);
    }
  }
  ctx.restore();return true;
}
function onReady(fn){
  if(typeof fn!=='function')return;
  if(ready)queueMicrotask(fn);else listeners.push(fn);
}
function flush(){while(listeners.length){try{listeners.shift()?.()}catch(_){}}}

Promise.all([loadImage(URLS.farm),loadImage(URLS.town)]).then(([farm,town])=>{
  atlases.farm=farm;atlases.town=town;
  choose(metrics(farm),metrics(town));
  ready=true;flush();
  console.info('[Kidscade World] Tiny terrain ready',palette);
}).catch(err=>{
  failed=true;console.warn('[Kidscade World] Tiny terrain unavailable; using BQ3 fallback',err);flush();
});

K.TinyTiles={
  installed:true,TILE,GRID:48,URLS,palette,fill,onReady,
  ready:()=>ready,failed:()=>failed
};
})(window);
