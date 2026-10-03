(() => {
'use strict';

const ADMIN_KEY_NAME='kc_teacher_admin_key';
const SAVE_KEY='kidscade-avatar-studio-v3';
const SIZE=128;
const ROOT_X=64;
const GROUND_Y=118;
const LAYERS=['body','hairBack','hairFront','upper','lower'];
const FRAMES=[
  {id:'stand-01',label:'STAND 01',kind:'stand',n:1},
  {id:'stand-02',label:'STAND 02',kind:'stand',n:2},
  ...Array.from({length:4},(_,i)=>({id:'walk-'+String(i+1).padStart(2,'0'),label:'WALK '+String(i+1).padStart(2,'0'),kind:'walk',n:i+1})),
  {id:'jump-01',label:'JUMP 01',kind:'jump',n:1}
];

const $=id=>document.getElementById(id);
const canvas=$('workCanvas');
const ctx=canvas.getContext('2d',{alpha:true});
ctx.imageSmoothingEnabled=false;

let currentFrame='stand-01';
let activeLayer='body';
let tool='pencil';
let drawing=false;
let selection=null;
let selectionStart=null;
let sourceImage=null;
let preparedSource=null;
let sourceCrop=null;
let pixelPreviewReady=false;
let playTimer=0;
let saveTimer=0;

const frames=new Map();
const history=new Map();

function makeCanvas(w=SIZE,h=SIZE){
  const c=document.createElement('canvas');
  c.width=w;c.height=h;
  const cctx=c.getContext('2d',{alpha:true});
  cctx.imageSmoothingEnabled=false;
  return c;
}
for(const frame of FRAMES){
  const rec={};
  for(const layer of LAYERS)rec[layer]=makeCanvas();
  frames.set(frame.id,rec);
}

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function frameRecord(id=currentFrame){return FRAMES.find(f=>f.id===id)||FRAMES[0]}
function layerCanvas(frameId=currentFrame,layer=activeLayer){return frames.get(frameId)?.[layer]||null}
function layerCtx(frameId=currentFrame,layer=activeLayer){return layerCanvas(frameId,layer)?.getContext('2d',{alpha:true})||null}
function historyKey(frameId=currentFrame,layer=activeLayer){return frameId+':'+layer}
function prevFrameId(id=currentFrame){const i=FRAMES.findIndex(f=>f.id===id);return i>0?FRAMES[i-1].id:null}
function setStatus(text,error=false){const el=$('studioStatus');if(!el)return;el.textContent=text;el.className='status'+(error?' error':'')}

function hasInk(c){
  if(!c)return false;
  const d=c.getContext('2d',{alpha:true}).getImageData(0,0,c.width,c.height).data;
  for(let i=3;i<d.length;i+=4)if(d[i])return true;
  return false;
}

function bboxOfCanvas(c,alphaCut=1){
  if(!c)return null;
  const d=c.getContext('2d',{alpha:true}).getImageData(0,0,c.width,c.height).data;
  let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
    if(d[(y*c.width+x)*4+3]<alphaCut)continue;
    if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
  }
  return maxX>=minX?{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,maxX,maxY}:null;
}

function buildFrameButtons(){
  const host=$('frameGrid');host.innerHTML='';
  for(const frame of FRAMES){
    const b=document.createElement('button');
    b.type='button';b.className='frame-btn';b.dataset.frame=frame.id;
    b.addEventListener('click',()=>{stopPlayback();selectFrame(frame.id)});
    host.appendChild(b);
  }
  const ref=$('referenceFrame');
  ref.innerHTML=FRAMES.map(f=>'<option value="'+f.id+'">'+f.label+'</option>').join('');
  ref.value='stand-01';
  refreshFrameButtons();
}

function refreshFrameButtons(){
  document.querySelectorAll('.frame-btn').forEach(b=>{
    const id=b.dataset.frame,rec=frames.get(id),f=frameRecord(id);
    const body=hasInk(rec.body),hair=hasInk(rec.hairBack)||hasInk(rec.hairFront),upper=hasInk(rec.upper),lower=hasInk(rec.lower);
    b.classList.toggle('active',id===currentFrame);
    b.innerHTML='<span>'+f.label+'</span><span class="dots">'+
      '<span class="'+(body?'dot-body':'dot-empty')+'">●</span>'+
      '<span class="'+(hair?'dot-hair':'dot-empty')+'">●</span>'+
      '<span class="'+(upper?'dot-upper':'dot-empty')+'">●</span>'+
      '<span class="'+(lower?'dot-lower':'dot-empty')+'">●</span></span>';
  });
  refreshLayerStatus();
}

function refreshLayerStatus(){
  const host=$('layerStatus');if(!host)return;
  const rec=frames.get(currentFrame);
  const defs=[['body','BODY'],['hairBack','HAIR B'],['hairFront','HAIR F'],['upper','UPPER'],['lower','LOWER']];
  host.innerHTML=defs.map(([id,label])=>'<span class="badge '+(hasInk(rec[id])?'on':'')+'">'+label+'</span>').join('');
}

function selectLayer(layer){
  if(!LAYERS.includes(layer))return;
  activeLayer=layer;selection=null;selectionStart=null;invalidatePixelPreview();
  const map={body:'layerBody',hairBack:'layerHairBack',hairFront:'layerHairFront',upper:'layerUpper',lower:'layerLower'};
  for(const [name,id] of Object.entries(map))$(id).className=name===activeLayer?'active':'secondary';
  if(sourceImage){autoFitStamp(false);pixelizePreview(false)}
  else render();
  setStatus(frameRecord().label+' · '+activeLayer.toUpperCase()+' 편집');
}

function selectFrame(id){
  if(!frames.has(id))return;
  currentFrame=id;selection=null;selectionStart=null;invalidatePixelPreview();refreshFrameButtons();
  if(sourceImage){autoFitStamp(false);pixelizePreview(false)}
  else render();
}

function selectTool(next){
  tool=['pencil','erase','select'].includes(next)?next:'pencil';
  $('toolPencil').className=tool==='pencil'?'':'secondary';
  $('toolErase').className=tool==='erase'?'':'secondary';
  $('toolSelect').className=tool==='select'?'':'secondary';
  setStatus(tool==='select'?'드래그해서 옮길 영역을 선택하세요.':tool==='erase'?'지우개 모드':'연필 모드');
}

function clearSelection(){selection=null;selectionStart=null;render();setStatus('영역 선택 해제')}

function pointFromEvent(e){
  const r=canvas.getBoundingClientRect();
  return {
    x:clamp(Math.floor((e.clientX-r.left)*SIZE/r.width),0,SIZE-1),
    y:clamp(Math.floor((e.clientY-r.top)*SIZE/r.height),0,SIZE-1)
  };
}

function normalizeSelection(a,b){
  if(!a||!b)return null;
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
  return {x,y,w:Math.max(1,Math.abs(a.x-b.x)+1),h:Math.max(1,Math.abs(a.y-b.y)+1)};
}

function snapshot(){
  const c=layerCtx();if(!c)return;
  const key=historyKey(),h=history.get(key)||{undo:[],redo:[]};
  h.undo.push(c.getImageData(0,0,SIZE,SIZE));
  if(h.undo.length>40)h.undo.shift();
  h.redo=[];history.set(key,h);
}

function undo(){
  const c=layerCtx(),h=history.get(historyKey());if(!c||!h?.undo.length)return;
  h.redo.push(c.getImageData(0,0,SIZE,SIZE));c.putImageData(h.undo.pop(),0,0);history.set(historyKey(),h);
  afterEdit('실행 취소');
}
function redo(){
  const c=layerCtx(),h=history.get(historyKey());if(!c||!h?.redo.length)return;
  h.undo.push(c.getImageData(0,0,SIZE,SIZE));c.putImageData(h.redo.pop(),0,0);history.set(historyKey(),h);
  afterEdit('다시 실행');
}

function paintAt(x,y){
  const c=layerCtx();if(!c)return;
  const size=clamp(Math.round(Number($('brushSize').value)||1),1,8);
  const half=Math.floor(size/2),px=clamp(x-half,0,SIZE-1),py=clamp(y-half,0,SIZE-1);
  if(tool==='erase')c.clearRect(px,py,size,size);
  else{c.globalCompositeOperation='source-over';c.fillStyle=$('paintColor').value||'#1677ff';c.fillRect(px,py,size,size)}
  render();
}

function afterEdit(message='수정됨'){
  refreshFrameButtons();scheduleSave();render();setStatus(message+' · 자동 저장 대기');
}
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{saveLocal();setStatus('브라우저에 자동 저장됨')},300);
}

function moveLayerOrSelection(dx,dy){
  const c=layerCtx();if(!c||(!hasInk(layerCanvas())&&!selection))return;
  snapshot();
  if(selection){
    const s=selection;
    const nx=clamp(s.x+dx,0,SIZE-s.w),ny=clamp(s.y+dy,0,SIZE-s.h);
    const temp=makeCanvas(s.w,s.h),tc=temp.getContext('2d',{alpha:true});
    tc.putImageData(c.getImageData(s.x,s.y,s.w,s.h),0,0);
    c.clearRect(s.x,s.y,s.w,s.h);
    c.drawImage(temp,nx,ny);
    selection={...s,x:nx,y:ny};
  }else{
    const temp=makeCanvas();temp.getContext('2d',{alpha:true}).drawImage(layerCanvas(),0,0);
    c.clearRect(0,0,SIZE,SIZE);c.drawImage(temp,dx,dy);
  }
  afterEdit((selection?'선택 영역':'레이어')+' '+dx+','+dy+' 이동');
}

function resizeSelection(delta){
  if(!selection)return setStatus('먼저 영역을 선택하세요.',true);
  const s=selection,newW=clamp(s.w+delta*2,1,SIZE),newH=clamp(s.h+delta*2,1,SIZE);
  const newX=clamp(s.x-delta,0,SIZE-newW),newY=clamp(s.y-delta,0,SIZE-newH);
  const c=layerCtx();snapshot();
  const temp=makeCanvas(s.w,s.h);temp.getContext('2d',{alpha:true}).putImageData(c.getImageData(s.x,s.y,s.w,s.h),0,0);
  c.clearRect(s.x,s.y,s.w,s.h);
  c.save();c.imageSmoothingEnabled=false;c.drawImage(temp,0,0,s.w,s.h,newX,newY,newW,newH);c.restore();
  selection={x:newX,y:newY,w:newW,h:newH};
  afterEdit('선택 영역 크기 '+(delta>0?'+':'')+delta+'px 보정');
}

function alignActiveCenter(){
  const box=bboxOfCanvas(layerCanvas());if(!box)return setStatus('현재 레이어가 비어 있습니다.',true);
  const dx=Math.round(ROOT_X-(box.x+(box.w-1)/2));
  if(dx)moveLayerOrSelection(dx,0);else setStatus('이미 x=64 중심에 정렬되어 있습니다.');
}
function alignActiveGround(){
  const box=bboxOfCanvas(layerCanvas());if(!box)return setStatus('현재 레이어가 비어 있습니다.',true);
  const dy=GROUND_Y-box.maxY;
  if(dy)moveLayerOrSelection(0,dy);else setStatus('이미 y=118 바닥선에 맞습니다.');
}

function referenceBodyCanvas(){
  const id=$('referenceFrame')?.value||'stand-01';
  return layerCanvas(id,'body');
}

function drawDifferenceOverlay(){
  if(!$('showDifference').checked)return;
  const ref=referenceBodyCanvas(),cur=layerCanvas(currentFrame,'body');
  if(!hasInk(ref)||!hasInk(cur))return;
  const rd=ref.getContext('2d').getImageData(0,0,SIZE,SIZE).data;
  const cd=cur.getContext('2d').getImageData(0,0,SIZE,SIZE).data;
  const tmp=makeCanvas(),ti=tmp.getContext('2d').createImageData(SIZE,SIZE),o=ti.data;
  for(let i=0;i<o.length;i+=4){
    const ra=rd[i+3]>16,ca=cd[i+3]>16;
    if(ra!==ca){o[i]=239;o[i+1]=68;o[i+2]=68;o[i+3]=185}
  }
  tmp.getContext('2d').putImageData(ti,0,0);ctx.drawImage(tmp,0,0);
}

function render(){
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,SIZE,SIZE);ctx.imageSmoothingEnabled=false;
  const rec=frames.get(currentFrame);
  if($('showReference').checked){
    const ref=referenceBodyCanvas();
    if(hasInk(ref)){
      ctx.globalAlpha=clamp((Number($('referenceOpacity').value)||0)/100,0,1);
      ctx.drawImage(ref,0,0);ctx.globalAlpha=1;
    }
  }

  if($('showHair').checked&&hasInk(rec.hairBack))ctx.drawImage(rec.hairBack,0,0);
  if($('showBody').checked&&hasInk(rec.body))ctx.drawImage(rec.body,0,0);
  if($('showClothes').checked&&hasInk(rec.lower))ctx.drawImage(rec.lower,0,0);
  if($('showClothes').checked&&hasInk(rec.upper))ctx.drawImage(rec.upper,0,0);
  if($('showHair').checked&&hasInk(rec.hairFront))ctx.drawImage(rec.hairFront,0,0);

  drawDifferenceOverlay();

  if(sourceImage){
    const alpha=clamp(Number($('stampOpacity').value)||.4,.05,1);
    drawStamp(ctx,alpha,false);
  }

  if(selection){
    ctx.save();ctx.globalAlpha=.95;ctx.strokeStyle='#e11d48';ctx.lineWidth=.6;ctx.setLineDash([2,1]);
    ctx.strokeRect(selection.x+.3,selection.y+.3,selection.w-.6,selection.h-.6);ctx.restore();
  }

  if($('showGrid').checked){
    ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle='#4f46e5';ctx.lineWidth=.25;
    for(let n=8;n<SIZE;n+=8){ctx.beginPath();ctx.moveTo(n+.125,0);ctx.lineTo(n+.125,SIZE);ctx.stroke();ctx.beginPath();ctx.moveTo(0,n+.125);ctx.lineTo(SIZE,n+.125);ctx.stroke()}
    ctx.globalAlpha=.55;ctx.strokeStyle='#dc2626';ctx.beginPath();ctx.moveTo(ROOT_X+.125,0);ctx.lineTo(ROOT_X+.125,SIZE);ctx.stroke();
    ctx.strokeStyle='#16a34a';ctx.beginPath();ctx.moveTo(0,GROUND_Y+.125);ctx.lineTo(SIZE,GROUND_Y+.125);ctx.stroke();ctx.restore();
  }
  ctx.restore();
}

function refreshPreparedSource(){
  preparedSource=null;sourceCrop=null;invalidatePixelPreview();
  if(!sourceImage)return;
  const w=Math.max(1,sourceImage.naturalWidth||sourceImage.width||1),h=Math.max(1,sourceImage.naturalHeight||sourceImage.height||1);
  const c=makeCanvas(w,h),p=c.getContext('2d',{alpha:true});p.imageSmoothingEnabled=true;p.drawImage(sourceImage,0,0,w,h);
  const img=p.getImageData(0,0,w,h),d=img.data;
  if($('removeFlatBg')?.checked){
    const idx=[0,(w-1)*4,(h-1)*w*4,((h-1)*w+(w-1))*4],opaque=idx.filter(i=>d[i+3]>220);
    if(opaque.length>=3){
      const bg=[0,1,2].map(ch=>opaque.reduce((sum,i)=>sum+d[i+ch],0)/opaque.length),t2=48*48;
      for(let i=0;i<d.length;i+=4){
        const dr=d[i]-bg[0],dg=d[i+1]-bg[1],db=d[i+2]-bg[2];
        if(dr*dr+dg*dg+db*db<=t2)d[i+3]=0;
      }
      p.putImageData(img,0,0);
    }
  }
  const box=bboxOfCanvas(c,8);
  sourceCrop=box?{x:box.x,y:box.y,w:box.w,h:box.h}:{x:0,y:0,w,h};
  preparedSource=c;
}

function activeSourceCrop(){
  const crop=sourceCrop||{x:0,y:0,w:preparedSource?.width||1,h:preparedSource?.height||1};
  if($('sourceScope')?.value!=='outfit'||!['upper','lower'].includes(activeLayer))return crop;
  const upperH=Math.max(1,Math.round(crop.h*.52)),lowerY=crop.y+Math.max(0,Math.round(crop.h*.48));
  return activeLayer==='upper'?{x:crop.x,y:crop.y,w:crop.w,h:upperH}:{x:crop.x,y:lowerY,w:crop.w,h:Math.max(1,crop.y+crop.h-lowerY)};
}

function drawStamp(target,alpha=1,smoothing=false){
  if(!sourceImage)return;if(!preparedSource)refreshPreparedSource();if(!preparedSource)return;
  const crop=activeSourceCrop(),x=Number($('stampX').value)||0,y=Number($('stampY').value)||0,w=Math.max(1,Number($('stampW').value)||128),h=Math.max(1,Number($('stampH').value)||128),rad=(Number($('stampRotation').value)||0)*Math.PI/180;
  target.save();target.imageSmoothingEnabled=Boolean(smoothing);target.globalAlpha=alpha;target.translate(x+w/2,y+h/2);target.rotate(rad);
  target.drawImage(preparedSource,crop.x,crop.y,crop.w,crop.h,-w/2,-h/2,w,h);target.restore();
}

function bodyGuideBox(){
  const current=layerCanvas(currentFrame,'body'),ref=referenceBodyCanvas();
  return bboxOfCanvas(current)||bboxOfCanvas(ref)||{x:28,y:8,w:72,h:111,maxX:99,maxY:118};
}

function targetRectForLayer(){
  const body=bodyGuideBox();
  if(activeLayer==='body')return {x:22,y:6,w:84,h:113,ground:true};
  if(activeLayer==='hairBack'||activeLayer==='hairFront'){
    return {x:Math.max(0,body.x-5),y:Math.max(0,body.y-4),w:Math.min(SIZE-body.x+5,body.w+10),h:Math.min(72,Math.round(body.h*.56)+6)};
  }
  if(activeLayer==='upper'){
    return {x:Math.max(0,Math.round(body.x+body.w*.12)),y:Math.round(body.y+body.h*.46),w:Math.round(body.w*.76),h:Math.round(body.h*.30)};
  }
  return {x:Math.max(0,Math.round(body.x+body.w*.16)),y:Math.round(body.y+body.h*.65),w:Math.round(body.w*.68),h:Math.round(body.h*.30)};
}

function autoFitStamp(announce=true){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  if(!preparedSource)refreshPreparedSource();
  const crop=activeSourceCrop(),target=targetRectForLayer(),scale=Math.min(target.w/crop.w,target.h/crop.h);
  const w=Math.max(1,Math.round(crop.w*scale)),h=Math.max(1,Math.round(crop.h*scale));
  let x=Math.round(target.x+(target.w-w)/2),y=Math.round(target.y+(target.h-h)/2);
  if(activeLayer==='body'){x=Math.round(ROOT_X-w/2);y=Math.round(GROUND_Y-h+1)}
  $('stampW').value=String(w);$('stampH').value=String(h);$('stampX').value=String(x);$('stampY').value=String(y);$('stampRotation').value='0';
  invalidatePixelPreview();render();
  if(announce)setStatus(activeLayer.toUpperCase()+' 자동 맞춤 · 최종 정합은 1px 보정으로 마감하세요.');
}

function invalidatePixelPreview(){
  pixelPreviewReady=false;const c=$('pixelPreviewCanvas');if(c)c.getContext('2d',{alpha:true}).clearRect(0,0,SIZE,SIZE);
}

function hardenAlpha(cvs,cut){
  const c=cvs.getContext('2d',{alpha:true}),img=c.getImageData(0,0,SIZE,SIZE),d=img.data;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<cut){d[i]=d[i+1]=d[i+2]=d[i+3]=0}else d[i+3]=255}
  c.putImageData(img,0,0);
}

function quantizeCanvas(cvs,k){
  if(!k||k<2)return;
  const c=cvs.getContext('2d',{alpha:true}),img=c.getImageData(0,0,SIZE,SIZE),d=img.data,colors=[];
  for(let i=0;i<d.length;i+=4)if(d[i+3])colors.push([d[i],d[i+1],d[i+2]]);
  if(colors.length<=k)return;
  const centers=[];let darkest=colors[0],bestLum=Infinity;
  for(const p of colors){const lum=p[0]*.2126+p[1]*.7152+p[2]*.0722;if(lum<bestLum){bestLum=lum;darkest=p}}
  centers.push([...darkest]);
  while(centers.length<k){
    let pick=colors[0],best=-1;
    for(let n=0;n<colors.length;n+=Math.max(1,Math.floor(colors.length/5000))){
      const p=colors[n];let min=Infinity;
      for(const q of centers){const dr=p[0]-q[0],dg=p[1]-q[1],db=p[2]-q[2],dist=dr*dr+dg*dg+db*db;if(dist<min)min=dist}
      if(min>best){best=min;pick=p}
    }
    centers.push([...pick]);
  }
  for(let iter=0;iter<5;iter++){
    const sums=centers.map(()=>[0,0,0,0]);
    for(const p of colors){let bi=0,bd=Infinity;for(let n=0;n<centers.length;n++){const q=centers[n],dr=p[0]-q[0],dg=p[1]-q[1],db=p[2]-q[2],dist=dr*dr+dg*dg+db*db;if(dist<bd){bd=dist;bi=n}}const a=sums[bi];a[0]+=p[0];a[1]+=p[1];a[2]+=p[2];a[3]++}
    sums.forEach((a,n)=>{if(a[3])centers[n]=[Math.round(a[0]/a[3]),Math.round(a[1]/a[3]),Math.round(a[2]/a[3])]});
  }
  for(let i=0;i<d.length;i+=4)if(d[i+3]){let bi=0,bd=Infinity;for(let n=0;n<centers.length;n++){const q=centers[n],dr=d[i]-q[0],dg=d[i+1]-q[1],db=d[i+2]-q[2],dist=dr*dr+dg*dg+db*db;if(dist<bd){bd=dist;bi=n}}d[i]=centers[bi][0];d[i+1]=centers[bi][1];d[i+2]=centers[bi][2]}
  c.putImageData(img,0,0);
}

function cleanupSingletons(cvs){
  const c=cvs.getContext('2d',{alpha:true}),img=c.getImageData(0,0,SIZE,SIZE),d=img.data,out=new Uint8ClampedArray(d);
  const opaque=(x,y)=>x>=0&&y>=0&&x<SIZE&&y<SIZE&&d[(y*SIZE+x)*4+3]>0;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const i=(y*SIZE+x)*4;if(!d[i+3])continue;let neighbors=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)if((xx||yy)&&opaque(x+xx,y+yy))neighbors++;if(neighbors===0){out[i]=out[i+1]=out[i+2]=out[i+3]=0}}
  img.data.set(out);c.putImageData(img,0,0);
}

function addAutoOutline(cvs){
  const c=cvs.getContext('2d',{alpha:true}),img=c.getImageData(0,0,SIZE,SIZE),d=img.data,out=new Uint8ClampedArray(d),alpha=(x,y)=>x>=0&&y>=0&&x<SIZE&&y<SIZE?d[(y*SIZE+x)*4+3]:0;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const i=(y*SIZE+x)*4;if(!d[i+3])continue;if(!alpha(x-1,y)||!alpha(x+1,y)||!alpha(x,y-1)||!alpha(x,y+1)){out[i]=Math.round(d[i]*.52);out[i+1]=Math.round(d[i+1]*.52);out[i+2]=Math.round(d[i+2]*.52)}}
  img.data.set(out);c.putImageData(img,0,0);
}

function buildPixelizedCanvas(){
  if(!sourceImage)return null;if(!preparedSource)refreshPreparedSource();
  const base=makeCanvas(),bc=base.getContext('2d',{alpha:true});drawStamp(bc,1,true);
  const resolution=clamp(Math.round(Number($('pixelResolution').value)||64),32,128);
  let out=base;
  if(resolution<SIZE){
    const small=makeCanvas(resolution,resolution),sc=small.getContext('2d',{alpha:true});sc.imageSmoothingEnabled=true;sc.imageSmoothingQuality='high';sc.drawImage(base,0,0,resolution,resolution);
    out=makeCanvas();const oc=out.getContext('2d',{alpha:true});oc.imageSmoothingEnabled=false;oc.drawImage(small,0,0,resolution,resolution,0,0,SIZE,SIZE);
  }
  hardenAlpha(out,clamp(Math.round(Number($('alphaCut').value)||72),1,254));
  quantizeCanvas(out,Math.max(0,Number($('paletteSize').value)||0));
  if($('cleanupNoise').checked)cleanupSingletons(out);
  if($('autoOutline').checked)addAutoOutline(out);
  hardenAlpha(out,1);return out;
}

function pixelizePreview(announce=true){
  const out=buildPixelizedCanvas();if(!out)return setStatus('먼저 이미지를 불러오세요.',true);
  const p=$('pixelPreviewCanvas').getContext('2d',{alpha:true});p.clearRect(0,0,SIZE,SIZE);p.imageSmoothingEnabled=false;p.drawImage(out,0,0);pixelPreviewReady=true;
  if(announce)setStatus('픽셀화 미리보기 · '+$('pixelResolution').value+'px / '+($('paletteSize').value==='0'?'원본색':$('paletteSize').value+'색'));
}

function applyPixelized(){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  if(!pixelPreviewReady)pixelizePreview(false);
  snapshot();const c=layerCtx();c.clearRect(0,0,SIZE,SIZE);c.drawImage($('pixelPreviewCanvas'),0,0);selection=null;
  afterEdit('픽셀화 결과를 '+activeLayer.toUpperCase()+' '+currentFrame+'에 적용함');
}

function fitStamp(){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  $('stampX').value='0';$('stampY').value='0';$('stampW').value='128';$('stampH').value='128';$('stampRotation').value='0';invalidatePixelPreview();render();setStatus('원본을 128×128 전체 캔버스에 맞춤');
}
function commitStamp(){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  snapshot();const c=layerCtx();c.clearRect(0,0,SIZE,SIZE);drawStamp(c,1,false);selection=null;afterEdit('원본을 '+activeLayer.toUpperCase()+'에 적용함');
}
function clearStamp(){
  sourceImage=null;preparedSource=null;sourceCrop=null;pixelPreviewReady=false;
  $('sourcePreview').src='';$('sourcePreview').classList.add('hidden');$('sourceFile').value='';
  $('pixelPreviewCanvas').getContext('2d').clearRect(0,0,SIZE,SIZE);render();
}

function copyPrevious(){
  const prev=prevFrameId();if(!prev)return setStatus('이전 프레임이 없습니다.',true);
  snapshot();const dst=layerCtx(),src=layerCanvas(prev,activeLayer);dst.clearRect(0,0,SIZE,SIZE);dst.drawImage(src,0,0);selection=null;afterEdit(prev+' → '+currentFrame+' '+activeLayer+' 복사');
}

function stopPlayback(){if(playTimer){clearInterval(playTimer);playTimer=0}}
function startPlayback(kind){
  stopPlayback();const ids=FRAMES.filter(f=>f.kind===kind).map(f=>f.id);if(!ids.length)return;
  let i=Math.max(0,ids.indexOf(currentFrame));selectFrame(ids[i]);const fps=kind==='walk'?6:2;
  playTimer=setInterval(()=>{i=(i+1)%ids.length;selectFrame(ids[i])},1000/fps);
}

function clearCurrent(){
  if(!hasInk(layerCanvas()))return;
  if(!confirm(currentFrame+' '+activeLayer+' 레이어를 비울까요?'))return;
  snapshot();layerCtx().clearRect(0,0,SIZE,SIZE);selection=null;afterEdit('현재 레이어를 비움');
}
function clearAll(){
  if(!confirm('BODY·HAIR·의상의 모든 프레임을 비울까요?'))return;
  for(const f of FRAMES)for(const layer of LAYERS)layerCtx(f.id,layer).clearRect(0,0,SIZE,SIZE);
  history.clear();selection=null;saveLocal();refreshFrameButtons();render();setStatus('모든 프레임을 초기화함');
}

function readProject(){
  const out={version:3,type:'kidscade-avatar-studio-project',canvas:[128,128],root:[ROOT_X,82],groundY:GROUND_Y,facing:'left',mirrorRight:true,
    bodyId:$('bodyId').value.trim()||'maple-lite-body-v3',hairId:$('hairId').value.trim()||'hair-01',upperId:$('upperId').value.trim()||'upper-01',lowerId:$('lowerId').value.trim()||'lower-01',frames:{}};
  for(const f of FRAMES){const rec=frames.get(f.id);out.frames[f.id]={};for(const layer of LAYERS)out.frames[f.id][layer]=rec[layer].toDataURL('image/png')}
  return out;
}
function saveLocal(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(readProject()))}catch(_){}}

function loadDataUrl(target,url){
  return new Promise(resolve=>{if(!url){resolve();return}const img=new Image();img.onload=()=>{const c=target.getContext('2d');c.clearRect(0,0,SIZE,SIZE);c.imageSmoothingEnabled=false;c.drawImage(img,0,0,SIZE,SIZE);resolve()};img.onerror=()=>resolve();img.src=url});
}
async function applyProject(project){
  if(!project)throw new Error('프로젝트 데이터가 없습니다.');
  if(project.type==='kidscade-avatar-clothing-studio-project'){
    const map={'static':'stand-01','idle-01':'stand-02','walk-01':'walk-01','walk-02':'walk-02','walk-03':'walk-03','walk-04':'walk-04'};
    for(const [oldId,newId] of Object.entries(map)){const src=project.frames?.[oldId];if(!src)continue;await Promise.all([loadDataUrl(layerCanvas(newId,'upper'),src.upper),loadDataUrl(layerCanvas(newId,'lower'),src.lower)])}
  }else if(project.type==='kidscade-avatar-studio-project'){
    if(project.bodyId)$('bodyId').value=project.bodyId;if(project.hairId)$('hairId').value=project.hairId;if(project.upperId)$('upperId').value=project.upperId;if(project.lowerId)$('lowerId').value=project.lowerId;
    for(const f of FRAMES){const src=project.frames?.[f.id];if(!src)continue;await Promise.all(LAYERS.map(layer=>loadDataUrl(layerCanvas(f.id,layer),src[layer])))}
  }else throw new Error('Kidscade 아바타 제작실 프로젝트가 아닙니다.');
  history.clear();selection=null;refreshFrameButtons();render();saveLocal();
}
async function restoreLocal(){try{const raw=localStorage.getItem(SAVE_KEY);if(raw)await applyProject(JSON.parse(raw))}catch(_){}}

function downloadBlob(name,blob){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),900);
}
function canvasBlob(c){return new Promise(resolve=>c.toBlob(blob=>resolve(blob),'image/png'))}
async function downloadCanvas(c,name){const blob=await canvasBlob(c);if(blob)downloadBlob(name,blob)}
function safeId(v,fallback){return String(v||fallback).trim().replace(/[^a-zA-Z0-9_-]+/g,'-')||fallback}
function layerId(layer){
  if(layer==='body')return safeId($('bodyId').value,'body');
  if(layer==='hairBack'||layer==='hairFront')return safeId($('hairId').value,'hair');
  if(layer==='upper')return safeId($('upperId').value,'upper');
  return safeId($('lowerId').value,'lower');
}
function layerFileName(layer,frameId=currentFrame){
  const suffix=layer==='hairBack'?'back':layer==='hairFront'?'front':layer;
  return layerId(layer)+'_'+suffix+'_'+frameId+'.png';
}
function compositeCanvas(frameId=currentFrame){
  const rec=frames.get(frameId),out=makeCanvas(),o=out.getContext('2d',{alpha:true});
  for(const layer of ['hairBack','body','lower','upper','hairFront'])if(hasInk(rec[layer]))o.drawImage(rec[layer],0,0);
  return out;
}
function exportCurrent(){downloadCanvas(layerCanvas(),layerFileName(activeLayer));setStatus('현재 '+activeLayer.toUpperCase()+' PNG 내보냄')}
function exportComposite(){downloadCanvas(compositeCanvas(),safeId($('bodyId').value,'avatar')+'_'+currentFrame+'_composite.png');setStatus('현재 합성 PNG 내보냄')}
function exportCurrentBody(){downloadCanvas(layerCanvas(currentFrame,'body'),safeId($('bodyId').value,'body')+'_'+currentFrame+'.png');setStatus('현재 BODY PNG 내보냄')}
function exportCurrentHair(){
  downloadCanvas(layerCanvas(currentFrame,'hairBack'),safeId($('hairId').value,'hair')+'_back_'+currentFrame+'.png');
  setTimeout(()=>downloadCanvas(layerCanvas(currentFrame,'hairFront'),safeId($('hairId').value,'hair')+'_front_'+currentFrame+'.png'),180);
  setStatus('현재 HAIR BACK/FRONT PNG 내보냄');
}
function manifestObject(){
  return {version:3,type:'kidscade-avatar-v3',canvas:[128,128],logicalRoot:[ROOT_X,82],groundY:GROUND_Y,facing:'left',mirrorForRight:true,
    frameSets:{stand:['stand-01','stand-02'],walk:['walk-01','walk-02','walk-03','walk-04'],jump:['jump-01']},
    layerOrder:['hairBack','body','lower','upper','hairFront'],
    ids:{body:safeId($('bodyId').value,'body'),hair:safeId($('hairId').value,'hair'),upper:safeId($('upperId').value,'upper'),lower:safeId($('lowerId').value,'lower')},
    availability:Object.fromEntries(FRAMES.map(f=>[f.id,Object.fromEntries(LAYERS.map(layer=>[layer,hasInk(layerCanvas(f.id,layer))]))]))
  };
}
function exportManifest(){downloadBlob('avatar-v3-manifest.json',new Blob([JSON.stringify(manifestObject(),null,2)+'\n'],{type:'application/json'}));setStatus('manifest.json 내보냄')}
function saveProjectFile(){downloadBlob('kidscade-avatar-studio-project.json',new Blob([JSON.stringify(readProject())],{type:'application/json'}));setStatus('프로젝트 JSON 내보냄')}

function crc32(bytes){
  let c=0xffffffff;
  for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}
  return (c^0xffffffff)>>>0;
}
function le16(v){return new Uint8Array([v&255,(v>>>8)&255])}
function le32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255])}
function zipDateTime(date=new Date()){
  const year=Math.max(1980,date.getFullYear());
  const time=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1);
  const day=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,day};
}
function concatBytes(parts){
  const total=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(total);let off=0;
  for(const p of parts){out.set(p,off);off+=p.length}return out;
}
async function buildZip(files){
  const enc=new TextEncoder(),locals=[],centrals=[];let offset=0,centralSize=0;const dt=zipDateTime();
  for(const file of files){
    const name=enc.encode(file.name),data=file.data,crc=crc32(data);
    const localHead=concatBytes([le32(0x04034b50),le16(20),le16(0),le16(0),le16(dt.time),le16(dt.day),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),name]);
    locals.push(localHead,data);
    const central=concatBytes([le32(0x02014b50),le16(20),le16(20),le16(0),le16(0),le16(dt.time),le16(dt.day),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name]);
    centrals.push(central);centralSize+=central.length;offset+=localHead.length+data.length;
  }
  const eocd=concatBytes([le32(0x06054b50),le16(0),le16(0),le16(files.length),le16(files.length),le32(centralSize),le32(offset),le16(0)]);
  return new Blob([...locals,...centrals,eocd],{type:'application/zip'});
}
async function canvasBytes(c){
  const blob=await canvasBlob(c);return new Uint8Array(await blob.arrayBuffer());
}
async function exportBundle(){
  const btn=$('exportBundle'),old=btn.textContent;btn.disabled=true;btn.textContent='ZIP 만드는 중';
  try{
    const files=[],folder={body:'body',hairBack:'hair/back',hairFront:'hair/front',upper:'upper',lower:'lower'};
    for(const f of FRAMES){
      for(const layer of LAYERS){const c=layerCanvas(f.id,layer);if(hasInk(c))files.push({name:folder[layer]+'/'+f.id+'.png',data:await canvasBytes(c)})}
      const comp=compositeCanvas(f.id);if(hasInk(comp))files.push({name:'composite/'+f.id+'.png',data:await canvasBytes(comp)});
    }
    files.push({name:'manifest.json',data:new TextEncoder().encode(JSON.stringify(manifestObject(),null,2)+'\n')});
    const zip=await buildZip(files);downloadBlob('kidscade-avatar-v3-bundle.zip',zip);setStatus('전체 아바타 ZIP 내보냄 · '+files.length+'개 파일');
  }catch(e){setStatus('ZIP 생성 실패: '+(e?.message||e),true)}
  finally{btn.disabled=false;btn.textContent=old}
}

async function verifyAdmin(){
  const gate=$('gate'),studio=$('studio');let key='';try{key=sessionStorage.getItem(ADMIN_KEY_NAME)||''}catch(_){}
  if(!key){gate.innerHTML='<h2>전역 관리자 로그인이 필요합니다.</h2><div class="muted">관리자 화면에서 전역 관리 코드로 로그인한 뒤 다시 열어 주세요.</div><p><a href="/teacher/">관리자 화면으로 이동</a></p>';return false}
  try{
    const res=await fetch('/api/teacher/overview',{credentials:'same-origin',headers:{authorization:'Bearer '+key}}),body=await res.json().catch(()=>({}));
    if(!res.ok||!body.ok||body.scope!=='global')throw new Error('global admin required');
    gate.classList.add('hidden');studio.classList.remove('hidden');return true;
  }catch(_){gate.innerHTML='<h2>전역 관리자 권한을 확인하지 못했습니다.</h2><div class="muted">관리자 화면에서 다시 로그인해 주세요.</div><p><a href="/teacher/">관리자 화면으로 이동</a></p>';return false}
}

function bind(){
  buildFrameButtons();
  $('layerBody').addEventListener('click',()=>selectLayer('body'));
  $('layerHairBack').addEventListener('click',()=>selectLayer('hairBack'));
  $('layerHairFront').addEventListener('click',()=>selectLayer('hairFront'));
  $('layerUpper').addEventListener('click',()=>selectLayer('upper'));
  $('layerLower').addEventListener('click',()=>selectLayer('lower'));
  $('toolPencil').addEventListener('click',()=>selectTool('pencil'));
  $('toolErase').addEventListener('click',()=>selectTool('erase'));
  $('toolSelect').addEventListener('click',()=>selectTool('select'));
  $('clearSelection').addEventListener('click',clearSelection);
  $('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
  $('copyPrev').addEventListener('click',copyPrevious);
  $('playStand').addEventListener('click',()=>startPlayback('stand'));
  $('playWalk').addEventListener('click',()=>startPlayback('walk'));
  $('showJump').addEventListener('click',()=>{stopPlayback();selectFrame('jump-01')});
  $('stopPlay').addEventListener('click',stopPlayback);

  ['showReference','showDifference','showGrid','showBody','showHair','showClothes'].forEach(id=>$(id).addEventListener('change',render));
  $('referenceOpacity').addEventListener('input',render);$('referenceFrame').addEventListener('change',render);
  ['bodyId','hairId','upperId','lowerId'].forEach(id=>$(id).addEventListener('input',scheduleSave));

  $('nudgeUp').addEventListener('click',()=>moveLayerOrSelection(0,-1));
  $('nudgeDown').addEventListener('click',()=>moveLayerOrSelection(0,1));
  $('nudgeLeft').addEventListener('click',()=>moveLayerOrSelection(-1,0));
  $('nudgeRight').addEventListener('click',()=>moveLayerOrSelection(1,0));
  $('alignCenter').addEventListener('click',alignActiveCenter);
  $('alignGround').addEventListener('click',alignActiveGround);
  $('shrinkSelection').addEventListener('click',()=>resizeSelection(-1));
  $('growSelection').addEventListener('click',()=>resizeSelection(1));

  canvas.addEventListener('pointerdown',e=>{
    const p=pointFromEvent(e);canvas.setPointerCapture(e.pointerId);
    if(tool==='select'){drawing=true;selectionStart=p;selection={x:p.x,y:p.y,w:1,h:1};render();return}
    drawing=true;snapshot();paintAt(p.x,p.y);
  });
  canvas.addEventListener('pointermove',e=>{
    const p=pointFromEvent(e);$('cursorX').value=p.x;$('cursorY').value=p.y;
    if(!drawing)return;
    if(tool==='select'){selection=normalizeSelection(selectionStart,p);render()}else paintAt(p.x,p.y);
  });
  const end=()=>{if(!drawing)return;drawing=false;if(tool==='select'){setStatus('영역 선택됨 · 화살표 버튼으로 1px 이동 가능')}else afterEdit('픽셀 수정됨')};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('contextmenu',e=>e.preventDefault());

  $('sourceFile').addEventListener('change',e=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{sourceImage=img;$('sourcePreview').src=reader.result;$('sourcePreview').classList.remove('hidden');refreshPreparedSource();if($('autoFitOnLoad').checked)autoFitStamp(false);else fitStamp();pixelizePreview(false);setStatus('원본을 불러와 '+activeLayer.toUpperCase()+'용 픽셀 미리보기를 만들었습니다.')};img.src=reader.result};reader.readAsDataURL(file);
  });
  $('autoFitStamp').addEventListener('click',()=>{autoFitStamp();pixelizePreview(false)});
  $('pixelizePreview').addEventListener('click',()=>pixelizePreview());
  $('applyPixelized').addEventListener('click',applyPixelized);
  $('fitStamp').addEventListener('click',()=>{fitStamp();pixelizePreview(false)});
  $('commitStamp').addEventListener('click',commitStamp);$('clearStamp').addEventListener('click',clearStamp);

  ['stampX','stampY','stampW','stampH','stampRotation'].forEach(id=>$(id).addEventListener('input',()=>{invalidatePixelPreview();render()}));
  $('stampOpacity').addEventListener('input',render);
  $('pixelResolution').addEventListener('input',()=>{$('pixelResolutionValue').value=$('pixelResolution').value;invalidatePixelPreview();if(sourceImage)pixelizePreview(false)});
  $('alphaCut').addEventListener('input',()=>{$('alphaCutValue').value=$('alphaCut').value;invalidatePixelPreview();if(sourceImage)pixelizePreview(false)});
  ['paletteSize','cleanupNoise','autoOutline'].forEach(id=>$(id).addEventListener('change',()=>{invalidatePixelPreview();if(sourceImage)pixelizePreview(false)}));
  $('removeFlatBg').addEventListener('change',()=>{refreshPreparedSource();if(sourceImage){autoFitStamp(false);pixelizePreview(false)}});
  $('sourceScope').addEventListener('change',()=>{invalidatePixelPreview();if(sourceImage){autoFitStamp(false);pixelizePreview(false)}});

  $('exportCurrent').addEventListener('click',exportCurrent);
  $('exportComposite').addEventListener('click',exportComposite);
  $('exportCurrentBody').addEventListener('click',exportCurrentBody);
  $('exportCurrentHair').addEventListener('click',exportCurrentHair);
  $('exportManifest').addEventListener('click',exportManifest);
  $('exportBundle').addEventListener('click',exportBundle);
  $('saveProject').addEventListener('click',saveProjectFile);
  $('clearFrame').addEventListener('click',clearCurrent);$('clearAll').addEventListener('click',clearAll);
  $('loadProject').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{await applyProject(JSON.parse(await file.text()));setStatus('프로젝트를 불러옴')}catch(err){setStatus(err.message||'프로젝트를 불러오지 못했습니다.',true)}e.target.value=''});

  window.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();return}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return}
    if(e.target&&['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
    if(e.key==='ArrowLeft'){e.preventDefault();moveLayerOrSelection(-1,0)}
    else if(e.key==='ArrowRight'){e.preventDefault();moveLayerOrSelection(1,0)}
    else if(e.key==='ArrowUp'){e.preventDefault();moveLayerOrSelection(0,-1)}
    else if(e.key==='ArrowDown'){e.preventDefault();moveLayerOrSelection(0,1)}
    else if(e.key==='Escape')clearSelection();
  });
  window.addEventListener('beforeunload',()=>{stopPlayback();saveLocal()});
}

async function init(){
  if(!await verifyAdmin())return;
  bind();$('pixelResolutionValue').value=$('pixelResolution').value;$('alphaCutValue').value=$('alphaCut').value;
  await restoreLocal();selectLayer('body');selectTool('pencil');selectFrame('stand-01');
  setStatus('V3 제작실 준비됨 · STAND-01 BODY부터 넣고 x=64 / y=118을 기준으로 맞추세요.');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
