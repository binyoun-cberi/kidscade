(() => {
'use strict';

const ADMIN_KEY_NAME='kc_teacher_admin_key';
const SAVE_KEY='kidscade-avatar-clothing-studio-v1';
const ROOT='/assets/game/characters/kidscade-avatar-v1/runtime';
const SIZE=128;
const FRAMES=[
  {id:'static',label:'STATIC',body:ROOT+'/base/master-base-128.png',kind:'static',n:0},
  ...Array.from({length:4},(_,i)=>({id:'idle-'+String(i+1).padStart(2,'0'),label:'IDLE '+String(i+1).padStart(2,'0'),body:ROOT+'/animation/idle/idle-'+String(i+1).padStart(2,'0')+'.png',kind:'idle',n:i+1})),
  ...Array.from({length:6},(_,i)=>({id:'walk-'+String(i+1).padStart(2,'0'),label:'WALK '+String(i+1).padStart(2,'0'),body:ROOT+'/animation/walk/walk-'+String(i+1).padStart(2,'0')+'.png',kind:'walk',n:i+1}))
];

const $=id=>document.getElementById(id);
const canvas=$('workCanvas');
const ctx=canvas.getContext('2d',{alpha:true});
ctx.imageSmoothingEnabled=false;

let currentFrame='static';
let activeLayer='upper';
let tool='pencil';
let drawing=false;
let sourceImage=null;
let preparedSource=null;
let sourceCrop=null;
let pixelPreviewReady=false;
let playTimer=0;
let saveTimer=0;
const bodyCache=new Map();
const bodyImageCache=new Map();
const frames=new Map();
const history=new Map();

function makeLayerCanvas(){
  const c=document.createElement('canvas');
  c.width=SIZE;c.height=SIZE;
  c.getContext('2d',{alpha:true}).imageSmoothingEnabled=false;
  return c;
}
for(const frame of FRAMES)frames.set(frame.id,{upper:makeLayerCanvas(),lower:makeLayerCanvas()});

function layerCanvas(frameId=currentFrame,layer=activeLayer){return frames.get(frameId)?.[layer]||null}
function layerCtx(frameId=currentFrame,layer=activeLayer){return layerCanvas(frameId,layer)?.getContext('2d',{alpha:true})||null}
function historyKey(frameId=currentFrame,layer=activeLayer){return frameId+':'+layer}
function setStatus(text,error=false){const el=$('studioStatus');if(!el)return;el.textContent=text;el.className='status'+(error?' error':'')}

function frameRecord(id=currentFrame){return FRAMES.find(f=>f.id===id)||FRAMES[0]}
function prevFrameId(id=currentFrame){
  const i=FRAMES.findIndex(f=>f.id===id);
  return i>0?FRAMES[i-1].id:null;
}

function loadBody(url){
  if(bodyCache.has(url))return bodyCache.get(url);
  const p=new Promise((resolve,reject)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{bodyImageCache.set(url,img);resolve(img)};
    img.onerror=()=>reject(new Error('BODY 프레임을 불러오지 못했습니다.'));
    img.src=url+'?v=clothing-studio-1';
  });
  bodyCache.set(url,p);
  return p;
}

function hasInk(c){
  const data=c.getContext('2d').getImageData(0,0,SIZE,SIZE).data;
  for(let i=3;i<data.length;i+=4)if(data[i])return true;
  return false;
}

function buildFrameButtons(){
  const host=$('frameGrid');
  host.innerHTML='';
  for(const frame of FRAMES){
    const b=document.createElement('button');
    b.type='button';
    b.className='frame-btn';
    b.dataset.frame=frame.id;
    b.addEventListener('click',()=>{stopPlayback();selectFrame(frame.id)});
    host.appendChild(b);
  }
  refreshFrameButtons();
}

function refreshFrameButtons(){
  document.querySelectorAll('.frame-btn').forEach(b=>{
    const id=b.dataset.frame;
    const rec=frames.get(id);
    const u=rec&&hasInk(rec.upper);
    const l=rec&&hasInk(rec.lower);
    const f=frameRecord(id);
    b.classList.toggle('active',id===currentFrame);
    b.innerHTML='<span>'+f.label+'</span><span class="dots"><span class="'+(u?'dot-upper':'dot-empty')+'">●</span><span class="'+(l?'dot-lower':'dot-empty')+'">●</span></span>';
  });
}

function makeCanvas(w=SIZE,h=SIZE){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  c.getContext('2d',{alpha:true}).imageSmoothingEnabled=false;
  return c;
}

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

function invalidatePixelPreview(){
  pixelPreviewReady=false;
  const c=$('pixelPreviewCanvas');
  if(c)c.getContext('2d',{alpha:true}).clearRect(0,0,SIZE,SIZE);
}

function refreshPreparedSource(){
  preparedSource=null;sourceCrop=null;invalidatePixelPreview();
  if(!sourceImage)return;
  const w=Math.max(1,sourceImage.naturalWidth||sourceImage.width||1);
  const h=Math.max(1,sourceImage.naturalHeight||sourceImage.height||1);
  const c=makeCanvas(w,h),p=c.getContext('2d',{alpha:true});
  p.imageSmoothingEnabled=true;
  p.drawImage(sourceImage,0,0,w,h);
  const img=p.getImageData(0,0,w,h);
  const d=img.data;

  if($('removeFlatBg')?.checked){
    const cornerIndexes=[0,(w-1)*4,(h-1)*w*4,((h-1)*w+(w-1))*4];
    const opaque=cornerIndexes.filter(i=>d[i+3]>220);
    if(opaque.length>=3){
      const bg=[0,1,2].map(ch=>opaque.reduce((sum,i)=>sum+d[i+ch],0)/opaque.length);
      const threshold2=48*48;
      for(let i=0;i<d.length;i+=4){
        const dr=d[i]-bg[0],dg=d[i+1]-bg[1],db=d[i+2]-bg[2];
        if(dr*dr+dg*dg+db*db<=threshold2)d[i+3]=0;
      }
      p.putImageData(img,0,0);
    }
  }

  let minX=w,minY=h,maxX=-1,maxY=-1;
  const scan=p.getImageData(0,0,w,h).data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const a=scan[(y*w+x)*4+3];
    if(a<8)continue;
    if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
  }
  sourceCrop=maxX>=minX?{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}:{x:0,y:0,w,h};
  preparedSource=c;
}

function activeSourceCrop(){
  const crop=sourceCrop||{x:0,y:0,w:preparedSource?.width||1,h:preparedSource?.height||1};
  if($('sourceScope')?.value!=='outfit')return crop;
  const upperH=Math.max(1,Math.round(crop.h*.52));
  const lowerY=crop.y+Math.max(0,Math.round(crop.h*.48));
  return activeLayer==='upper'
    ? {x:crop.x,y:crop.y,w:crop.w,h:upperH}
    : {x:crop.x,y:lowerY,w:crop.w,h:Math.max(1,crop.y+crop.h-lowerY)};
}

function drawStamp(target,alpha=1,smoothing=false){
  if(!sourceImage)return;
  if(!preparedSource)refreshPreparedSource();
  if(!preparedSource)return;
  const crop=activeSourceCrop();
  const x=Number($('stampX').value)||0;
  const y=Number($('stampY').value)||0;
  const w=Math.max(1,Number($('stampW').value)||128);
  const h=Math.max(1,Number($('stampH').value)||128);
  const rad=(Number($('stampRotation').value)||0)*Math.PI/180;
  target.save();
  target.imageSmoothingEnabled=Boolean(smoothing);
  target.globalAlpha=alpha;
  target.translate(x+w/2,y+h/2);
  target.rotate(rad);
  target.drawImage(preparedSource,crop.x,crop.y,crop.w,crop.h,-w/2,-h/2,w,h);
  target.restore();
}

function targetRectForLayer(){
  // Base fit zones come from the approved Kidscade body/clothing contact sheets.
  // The zone follows each loaded BODY frame's horizontal center, so walk/idle drift
  // is handled before the artist performs the final 1px cleanup.
  const base=activeLayer==='upper'?{x:38,y:62,w:56,h:38}:{x:45,y:82,w:42,h:39};
  const rec=frameRecord(),img=bodyImageCache.get(rec.body);
  if(!img)return base;
  const c=makeCanvas(),p=c.getContext('2d',{alpha:true});p.drawImage(img,0,0,SIZE,SIZE);
  const d=p.getImageData(0,0,SIZE,SIZE).data;
  let minX=SIZE,maxX=-1;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(d[(y*SIZE+x)*4+3]>24){if(x<minX)minX=x;if(x>maxX)maxX=x}
  if(maxX<minX)return base;
  const center=(minX+maxX)/2;
  return {...base,x:base.x+Math.round(center-65.5)};
}

function autoFitStamp(announce=true){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  if(!preparedSource)refreshPreparedSource();
  const crop=activeSourceCrop(),target=targetRectForLayer();
  const scale=Math.min(target.w/crop.w,target.h/crop.h);
  const w=Math.max(1,Math.round(crop.w*scale));
  const h=Math.max(1,Math.round(crop.h*scale));
  $('stampW').value=String(w);$('stampH').value=String(h);
  $('stampX').value=String(Math.round(target.x+(target.w-w)/2));
  $('stampY').value=String(Math.round(target.y+(target.h-h)/2));
  $('stampRotation').value='0';
  invalidatePixelPreview();render();
  if(announce)setStatus((activeLayer==='upper'?'상의':'하의')+' BODY 영역에 자동 맞춤함');
}

function hardenAlpha(canvas,cut){
  const c=canvas.getContext('2d',{alpha:true}),img=c.getImageData(0,0,SIZE,SIZE),d=img.data;
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]<cut){d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0}
    else d[i+3]=255;
  }
  c.putImageData(img,0,0);
}

function quantizeCanvas(canvas,k){
  if(!k||k<2)return;
  const c=canvas.getContext('2d',{alpha:true}),img=c.getImageData(0,0,SIZE,SIZE),d=img.data;
  const colors=[];
  for(let i=0;i<d.length;i+=4)if(d[i+3]){
    const color=[d[i],d[i+1],d[i+2]];
    if(colors.length<5000||((i>>2)%5===0))colors.push(color);
  }
  if(colors.length<=k)return;

  const centers=[];
  let darkest=colors[0],bestLum=Infinity;
  for(const p of colors){const lum=p[0]*.2126+p[1]*.7152+p[2]*.0722;if(lum<bestLum){bestLum=lum;darkest=p}}
  centers.push([...darkest]);
  while(centers.length<k){
    let pick=colors[0],best=-1;
    for(const p of colors){
      let min=Infinity;
      for(const q of centers){
        const dr=p[0]-q[0],dg=p[1]-q[1],db=p[2]-q[2];
        const dist=dr*dr+dg*dg+db*db;if(dist<min)min=dist;
      }
      if(min>best){best=min;pick=p}
    }
    centers.push([...pick]);
  }

  for(let iter=0;iter<6;iter++){
    const sums=centers.map(()=>[0,0,0,0]);
    for(const p of colors){
      let bi=0,bd=Infinity;
      for(let n=0;n<centers.length;n++){
        const q=centers[n],dr=p[0]-q[0],dg=p[1]-q[1],db=p[2]-q[2],dist=dr*dr+dg*dg+db*db;
        if(dist<bd){bd=dist;bi=n}
      }
      const a=sums[bi];a[0]+=p[0];a[1]+=p[1];a[2]+=p[2];a[3]++;
    }
    sums.forEach((a,n)=>{if(a[3])centers[n]=[Math.round(a[0]/a[3]),Math.round(a[1]/a[3]),Math.round(a[2]/a[3])]});
  }

  for(let i=0;i<d.length;i+=4)if(d[i+3]){
    let bi=0,bd=Infinity;
    for(let n=0;n<centers.length;n++){
      const q=centers[n],dr=d[i]-q[0],dg=d[i+1]-q[1],db=d[i+2]-q[2],dist=dr*dr+dg*dg+db*db;
      if(dist<bd){bd=dist;bi=n}
    }
    d[i]=centers[bi][0];d[i+1]=centers[bi][1];d[i+2]=centers[bi][2];
  }
  c.putImageData(img,0,0);
}

function cleanupSingletons(canvas){
  const c=canvas.getContext('2d',{alpha:true}),img=c.getImageData(0,0,SIZE,SIZE),d=img.data,out=new Uint8ClampedArray(d);
  const opaque=(x,y)=>x>=0&&y>=0&&x<SIZE&&y<SIZE&&d[(y*SIZE+x)*4+3]>0;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const i=(y*SIZE+x)*4;if(!d[i+3])continue;
    let neighbors=0;
    for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)if((xx||yy)&&opaque(x+xx,y+yy))neighbors++;
    if(neighbors===0){out[i]=0;out[i+1]=0;out[i+2]=0;out[i+3]=0}
  }
  img.data.set(out);c.putImageData(img,0,0);
}

function addAutoOutline(canvas){
  const c=canvas.getContext('2d',{alpha:true}),img=c.getImageData(0,0,SIZE,SIZE),d=img.data,out=new Uint8ClampedArray(d);
  const alpha=(x,y)=>x>=0&&y>=0&&x<SIZE&&y<SIZE?d[(y*SIZE+x)*4+3]:0;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const i=(y*SIZE+x)*4;if(!d[i+3])continue;
    if(!alpha(x-1,y)||!alpha(x+1,y)||!alpha(x,y-1)||!alpha(x,y+1)){
      out[i]=Math.round(d[i]*.52);out[i+1]=Math.round(d[i+1]*.52);out[i+2]=Math.round(d[i+2]*.52);
    }
  }
  img.data.set(out);c.putImageData(img,0,0);
}

function buildPixelizedCanvas(){
  if(!sourceImage)return null;
  if(!preparedSource)refreshPreparedSource();
  const base=makeCanvas(),bc=base.getContext('2d',{alpha:true});
  drawStamp(bc,1,true);

  const resolution=clamp(Math.round(Number($('pixelResolution').value)||64),32,128);
  let out=base;
  if(resolution<SIZE){
    const small=makeCanvas(resolution,resolution),sc=small.getContext('2d',{alpha:true});
    sc.imageSmoothingEnabled=true;sc.imageSmoothingQuality='high';sc.drawImage(base,0,0,resolution,resolution);
    out=makeCanvas();const oc=out.getContext('2d',{alpha:true});oc.imageSmoothingEnabled=false;oc.drawImage(small,0,0,resolution,resolution,0,0,SIZE,SIZE);
  }

  hardenAlpha(out,clamp(Math.round(Number($('alphaCut').value)||72),1,254));
  quantizeCanvas(out,Math.max(0,Number($('paletteSize').value)||0));
  if($('cleanupNoise').checked)cleanupSingletons(out);
  if($('autoOutline').checked)addAutoOutline(out);
  hardenAlpha(out,1);
  return out;
}

function pixelizePreview(announce=true){
  const out=buildPixelizedCanvas();
  if(!out)return setStatus('먼저 이미지를 불러오세요.',true);
  const p=$('pixelPreviewCanvas').getContext('2d',{alpha:true});
  p.clearRect(0,0,SIZE,SIZE);p.imageSmoothingEnabled=false;p.drawImage(out,0,0);
  pixelPreviewReady=true;
  if(announce)setStatus('픽셀화 미리보기 생성 · '+$('pixelResolution').value+'px / '+($('paletteSize').value==='0'?'원본색':$('paletteSize').value+'색'));
}

function applyPixelized(){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  if(!pixelPreviewReady)pixelizePreview(false);
  const preview=$('pixelPreviewCanvas');
  snapshot();
  const c=layerCtx();c.clearRect(0,0,SIZE,SIZE);c.imageSmoothingEnabled=false;c.drawImage(preview,0,0);
  afterEdit('자동 픽셀화 결과를 '+activeLayer+' '+currentFrame+'에 적용함');
}

async function render(){
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,SIZE,SIZE);
  ctx.imageSmoothingEnabled=false;
  const rec=frameRecord();

  if($('showBody').checked){
    try{
      const body=await loadBody(rec.body);
      ctx.globalAlpha=(Number($('bodyOpacity').value)||0)/100;
      ctx.drawImage(body,0,0,SIZE,SIZE);
      ctx.globalAlpha=1;
    }catch(e){setStatus(e.message,true)}
  }

  if($('showOnion').checked){
    const prev=prevFrameId();
    if(prev){
      ctx.globalAlpha=.18;
      if($('showLower').checked)ctx.drawImage(layerCanvas(prev,'lower'),0,0);
      if($('showUpper').checked)ctx.drawImage(layerCanvas(prev,'upper'),0,0);
      ctx.globalAlpha=1;
    }
  }

  if($('showLower').checked)ctx.drawImage(layerCanvas(currentFrame,'lower'),0,0);
  if($('showUpper').checked)ctx.drawImage(layerCanvas(currentFrame,'upper'),0,0);

  if(sourceImage){
    const alpha=Math.max(.05,Math.min(1,Number($('stampOpacity').value)||.75));
    drawStamp(ctx,alpha);
  }

  if($('showGrid').checked){
    ctx.save();
    ctx.globalAlpha=.18;
    ctx.strokeStyle='#4f46e5';
    ctx.lineWidth=.25;
    for(let n=8;n<SIZE;n+=8){
      ctx.beginPath();ctx.moveTo(n+.125,0);ctx.lineTo(n+.125,SIZE);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,n+.125);ctx.lineTo(SIZE,n+.125);ctx.stroke();
    }
    ctx.globalAlpha=.38;
    ctx.strokeStyle='#dc2626';
    ctx.beginPath();ctx.moveTo(64+.125,0);ctx.lineTo(64+.125,SIZE);ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function selectFrame(id){
  if(!frames.has(id))return;
  currentFrame=id;
  invalidatePixelPreview();
  refreshFrameButtons();
  render();
}

function selectLayer(layer){
  activeLayer=layer==='lower'?'lower':'upper';
  invalidatePixelPreview();
  $('layerUpper').className=activeLayer==='upper'?'':'secondary';
  $('layerLower').className=activeLayer==='lower'?'':'secondary';
  if(sourceImage){autoFitStamp(false);pixelizePreview(false)}
  else render();
}

function selectTool(next){
  tool=next==='erase'?'erase':'pencil';
  $('toolPencil').className=tool==='pencil'?'':'secondary';
  $('toolErase').className=tool==='erase'?'':'secondary';
}

function pointFromEvent(e){
  const r=canvas.getBoundingClientRect();
  return {
    x:Math.max(0,Math.min(127,Math.floor((e.clientX-r.left)*SIZE/r.width))),
    y:Math.max(0,Math.min(127,Math.floor((e.clientY-r.top)*SIZE/r.height)))
  };
}

function paintAt(x,y){
  const c=layerCtx();
  const size=Math.max(1,Math.min(8,Math.round(Number($('brushSize').value)||1)));
  const half=Math.floor(size/2);
  const px=Math.max(0,x-half),py=Math.max(0,y-half);
  if(tool==='erase')c.clearRect(px,py,size,size);
  else{c.globalCompositeOperation='source-over';c.fillStyle=$('paintColor').value||'#1677ff';c.fillRect(px,py,size,size)}
  render();
}

function snapshot(){
  const c=layerCtx();
  if(!c)return;
  const key=historyKey();
  const h=history.get(key)||{undo:[],redo:[]};
  h.undo.push(c.getImageData(0,0,SIZE,SIZE));
  if(h.undo.length>30)h.undo.shift();
  h.redo=[];
  history.set(key,h);
}

function undo(){
  const c=layerCtx(),h=history.get(historyKey());
  if(!c||!h?.undo.length)return;
  h.redo.push(c.getImageData(0,0,SIZE,SIZE));
  c.putImageData(h.undo.pop(),0,0);
  history.set(historyKey(),h);
  afterEdit('실행 취소');
}

function redo(){
  const c=layerCtx(),h=history.get(historyKey());
  if(!c||!h?.redo.length)return;
  h.undo.push(c.getImageData(0,0,SIZE,SIZE));
  c.putImageData(h.redo.pop(),0,0);
  history.set(historyKey(),h);
  afterEdit('다시 실행');
}

function afterEdit(message='수정됨'){
  refreshFrameButtons();
  scheduleSave();
  render();
  setStatus(message+' · 자동 저장 대기');
}

function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{saveLocal();setStatus('브라우저에 자동 저장됨')},350);
}

function readProject(){
  const out={
    version:1,
    type:'kidscade-avatar-clothing-studio-project',
    canvas:[128,128],
    upperId:$('upperId').value.trim()||'upper-item',
    lowerId:$('lowerId').value.trim()||'lower-item',
    frames:{}
  };
  for(const f of FRAMES){
    const rec=frames.get(f.id);
    out.frames[f.id]={upper:rec.upper.toDataURL('image/png'),lower:rec.lower.toDataURL('image/png')};
  }
  return out;
}

function saveLocal(){
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(readProject()))}catch(_){}
}

function loadDataUrl(canvasTarget,url){
  return new Promise(resolve=>{
    if(!url){resolve();return}
    const img=new Image();
    img.onload=()=>{
      const c=canvasTarget.getContext('2d');
      c.clearRect(0,0,SIZE,SIZE);c.imageSmoothingEnabled=false;c.drawImage(img,0,0,SIZE,SIZE);resolve();
    };
    img.onerror=()=>resolve();
    img.src=url;
  });
}

async function applyProject(project){
  if(!project||project.type!=='kidscade-avatar-clothing-studio-project')throw new Error('Kidscade 의상 프로젝트 JSON이 아닙니다.');
  if(project.upperId)$('upperId').value=project.upperId;
  if(project.lowerId)$('lowerId').value=project.lowerId;
  for(const f of FRAMES){
    const src=project.frames?.[f.id];
    if(!src)continue;
    await Promise.all([
      loadDataUrl(layerCanvas(f.id,'upper'),src.upper),
      loadDataUrl(layerCanvas(f.id,'lower'),src.lower)
    ]);
  }
  history.clear();
  refreshFrameButtons();render();saveLocal();
}

async function restoreLocal(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(raw)await applyProject(JSON.parse(raw));
  }catch(_){}
}

function copyPrevious(){
  const prev=prevFrameId();
  if(!prev)return setStatus('이전 프레임이 없습니다.',true);
  snapshot();
  const dst=layerCtx(),src=layerCanvas(prev,activeLayer);
  dst.clearRect(0,0,SIZE,SIZE);dst.drawImage(src,0,0);
  afterEdit(prev+' → '+currentFrame+' '+activeLayer+' 복사');
}

function stopPlayback(){
  if(playTimer){clearInterval(playTimer);playTimer=0}
}

function startPlayback(kind){
  stopPlayback();
  const ids=FRAMES.filter(f=>f.kind===kind).map(f=>f.id);
  if(!ids.length)return;
  let i=Math.max(0,ids.indexOf(currentFrame));
  selectFrame(ids[i]);
  const fps=kind==='walk'?6:3;
  playTimer=setInterval(()=>{i=(i+1)%ids.length;selectFrame(ids[i])},1000/fps);
}

function fitStamp(){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  $('stampX').value='0';$('stampY').value='0';$('stampW').value='128';$('stampH').value='128';$('stampRotation').value='0';
  invalidatePixelPreview();render();setStatus('선택한 원본 영역을 128×128 전체 캔버스에 맞춤');
}

function commitStamp(){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  snapshot();
  drawStamp(layerCtx(),1,false);
  afterEdit('가져온 원본을 '+activeLayer+' 레이어에 그대로 적용함');
}

function clearStamp(){
  sourceImage=null;preparedSource=null;sourceCrop=null;pixelPreviewReady=false;
  $('sourcePreview').src='';
  $('sourcePreview').classList.add('hidden');
  $('sourceFile').value='';
  const p=$('pixelPreviewCanvas');if(p)p.getContext('2d').clearRect(0,0,SIZE,SIZE);
  render();
}

function clearCurrent(){
  if(!hasInk(layerCanvas()))return;
  if(!confirm(currentFrame+' '+activeLayer+' 레이어를 비울까요?'))return;
  snapshot();layerCtx().clearRect(0,0,SIZE,SIZE);afterEdit('현재 레이어를 비움');
}

function clearAll(){
  if(!confirm('상의·하의의 모든 프레임을 비울까요? 이 작업은 되돌리기 어렵습니다.'))return;
  for(const f of FRAMES)for(const layer of ['upper','lower'])layerCtx(f.id,layer).clearRect(0,0,SIZE,SIZE);
  history.clear();saveLocal();refreshFrameButtons();render();setStatus('모든 의상 프레임을 초기화함');
}

function downloadBlob(name,blob){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),800);
}
function downloadCanvas(c,name){
  c.toBlob(blob=>{if(blob)downloadBlob(name,blob)},'image/png');
}
function safeId(v,fallback){return String(v||fallback).trim().replace(/[^a-zA-Z0-9_-]+/g,'-')||fallback}
function frameFilename(layer,id){
  const item=safeId(layer==='upper'?$('upperId').value:$('lowerId').value,layer+'-item');
  return item+'_'+id+'.png';
}
function exportCurrent(){downloadCanvas(layerCanvas(),frameFilename(activeLayer,currentFrame));setStatus('128×128 PNG 내보냄')}
function exportBoth(){
  downloadCanvas(layerCanvas(currentFrame,'upper'),frameFilename('upper',currentFrame));
  setTimeout(()=>downloadCanvas(layerCanvas(currentFrame,'lower'),frameFilename('lower',currentFrame)),180);
  setStatus('현재 프레임 상의·하의 PNG를 각각 내보냄');
}

function availability(layer){
  const has=id=>hasInk(layerCanvas(id,layer));
  return {
    static:has('static'),
    idle:[1,2,3,4].filter(n=>has('idle-'+String(n).padStart(2,'0'))).length,
    walk:[1,2,3,4,5,6].filter(n=>has('walk-'+String(n).padStart(2,'0'))).length
  };
}
function exportManifest(){
  const manifest={
    version:3,
    type:'kidscade-frame-synced-clothing-bundle',
    canvas:[128,128],
    origin:[0,0],
    renderMode:'full-canvas-frame',
    items:[
      {id:safeId($('upperId').value,'upper-item'),slot:'upper',supportedAnimations:availability('upper'),runtimeScale:1,runtimeOffset:[0,0]},
      {id:safeId($('lowerId').value,'lower-item'),slot:'lower',supportedAnimations:availability('lower'),runtimeScale:1,runtimeOffset:[0,0]}
    ],
    frameNames:FRAMES.map(f=>f.id),
    note:'All exported PNG frames are full-canvas 128x128 assets drawn at (0,0).'
  };
  downloadBlob('kidscade-clothing-manifest.json',new Blob([JSON.stringify(manifest,null,2)+'\n'],{type:'application/json'}));
  setStatus('의상 manifest를 내보냄');
}
function saveProjectFile(){
  downloadBlob('kidscade-clothing-project.json',new Blob([JSON.stringify(readProject())],{type:'application/json'}));
  setStatus('프로젝트 JSON을 내보냄');
}

async function verifyAdmin(){
  const gate=$('gate'),studio=$('studio');
  let key='';
  try{key=sessionStorage.getItem(ADMIN_KEY_NAME)||''}catch(_){}
  if(!key){
    gate.innerHTML='<h2>전역 관리자 로그인이 필요합니다.</h2><div class="muted">관리자 화면에서 전역 관리 코드로 로그인한 뒤 다시 열어 주세요.</div><p><a href="/teacher/">관리자 화면으로 이동</a></p>';
    return false;
  }
  try{
    const res=await fetch('/api/teacher/overview',{credentials:'same-origin',headers:{authorization:'Bearer '+key}});
    const body=await res.json().catch(()=>({}));
    if(!res.ok||!body.ok||body.scope!=='global')throw new Error('global admin required');
    gate.classList.add('hidden');studio.classList.remove('hidden');return true;
  }catch(_){
    gate.innerHTML='<h2>전역 관리자 권한을 확인하지 못했습니다.</h2><div class="muted">관리자 화면에서 다시 로그인해 주세요.</div><p><a href="/teacher/">관리자 화면으로 이동</a></p>';
    return false;
  }
}

function bind(){
  buildFrameButtons();
  $('layerUpper').addEventListener('click',()=>selectLayer('upper'));
  $('layerLower').addEventListener('click',()=>selectLayer('lower'));
  $('toolPencil').addEventListener('click',()=>selectTool('pencil'));
  $('toolErase').addEventListener('click',()=>selectTool('erase'));
  $('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
  $('copyPrev').addEventListener('click',copyPrevious);
  $('playIdle').addEventListener('click',()=>startPlayback('idle'));
  $('playWalk').addEventListener('click',()=>startPlayback('walk'));
  $('stopPlay').addEventListener('click',stopPlayback);

  ['showBody','showOnion','showGrid','showUpper','showLower'].forEach(id=>$(id).addEventListener('change',render));
  $('bodyOpacity').addEventListener('input',render);
  ['stampX','stampY','stampW','stampH','stampRotation'].forEach(id=>$(id).addEventListener('input',()=>{invalidatePixelPreview();render()}));
  $('stampOpacity').addEventListener('input',render);
  $('upperId').addEventListener('input',scheduleSave);$('lowerId').addEventListener('input',scheduleSave);

  canvas.addEventListener('pointerdown',e=>{
    if(sourceImage)return setStatus('가져온 이미지 미리보기가 열려 있습니다. 먼저 레이어에 찍거나 닫아 주세요.',true);
    drawing=true;snapshot();canvas.setPointerCapture(e.pointerId);const p=pointFromEvent(e);paintAt(p.x,p.y);
  });
  canvas.addEventListener('pointermove',e=>{
    const p=pointFromEvent(e);$('cursorX').value=p.x;$('cursorY').value=p.y;
    if(drawing)paintAt(p.x,p.y);
  });
  const end=()=>{if(drawing){drawing=false;afterEdit('픽셀 수정됨')}};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('pointerleave',()=>{});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  $('sourceFile').addEventListener('change',e=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        sourceImage=img;
        $('sourcePreview').src=reader.result;$('sourcePreview').classList.remove('hidden');
        refreshPreparedSource();
        if($('autoFitOnLoad').checked)autoFitStamp(false);else fitStamp();
        pixelizePreview(false);
        setStatus('원본을 불러와 자동 픽셀화 미리보기를 만들었습니다.');
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
  $('autoFitStamp').addEventListener('click',()=>{autoFitStamp();pixelizePreview(false)});
  $('pixelizePreview').addEventListener('click',()=>pixelizePreview());
  $('applyPixelized').addEventListener('click',applyPixelized);
  $('fitStamp').addEventListener('click',()=>{fitStamp();pixelizePreview(false)});
  $('commitStamp').addEventListener('click',commitStamp);$('clearStamp').addEventListener('click',clearStamp);

  $('pixelResolution').addEventListener('input',()=>{
    $('pixelResolutionValue').value=$('pixelResolution').value;invalidatePixelPreview();if(sourceImage)pixelizePreview(false);
  });
  $('alphaCut').addEventListener('input',()=>{
    $('alphaCutValue').value=$('alphaCut').value;invalidatePixelPreview();if(sourceImage)pixelizePreview(false);
  });
  ['paletteSize','cleanupNoise','autoOutline'].forEach(id=>$(id).addEventListener('change',()=>{invalidatePixelPreview();if(sourceImage)pixelizePreview(false)}));
  $('removeFlatBg').addEventListener('change',()=>{refreshPreparedSource();if(sourceImage){autoFitStamp(false);pixelizePreview(false)}});
  $('sourceScope').addEventListener('change',()=>{invalidatePixelPreview();if(sourceImage){autoFitStamp(false);pixelizePreview(false)}});
  $('exportCurrent').addEventListener('click',exportCurrent);$('exportBoth').addEventListener('click',exportBoth);$('exportManifest').addEventListener('click',exportManifest);$('saveProject').addEventListener('click',saveProjectFile);
  $('clearFrame').addEventListener('click',clearCurrent);$('clearAll').addEventListener('click',clearAll);
  $('loadProject').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{await applyProject(JSON.parse(await file.text()));setStatus('프로젝트를 불러옴')}catch(err){setStatus(err.message||'프로젝트를 불러오지 못했습니다.',true)}
    e.target.value='';
  });

  window.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}
  });
  window.addEventListener('beforeunload',()=>{stopPlayback();saveLocal()});
}

async function init(){
  if(!await verifyAdmin())return;
  bind();
  $('pixelResolutionValue').value=$('pixelResolution').value;
  $('alphaCutValue').value=$('alphaCut').value;
  await restoreLocal();
  selectLayer('upper');selectTool('pencil');selectFrame('static');
  Promise.all(FRAMES.map(f=>loadBody(f.body).catch(()=>null))).then(()=>render());
  setStatus('준비됨 · 모든 작업은 실제 128×128 좌표로 저장됩니다.');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
