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
let playTimer=0;
let saveTimer=0;
const bodyCache=new Map();
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
    img.onload=()=>resolve(img);
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

function drawStamp(target,alpha=1){
  if(!sourceImage)return;
  const x=Number($('stampX').value)||0;
  const y=Number($('stampY').value)||0;
  const w=Math.max(1,Number($('stampW').value)||128);
  const h=Math.max(1,Number($('stampH').value)||128);
  const rad=(Number($('stampRotation').value)||0)*Math.PI/180;
  target.save();
  target.imageSmoothingEnabled=false;
  target.globalAlpha=alpha;
  target.translate(x+w/2,y+h/2);
  target.rotate(rad);
  target.drawImage(sourceImage,-w/2,-h/2,w,h);
  target.restore();
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
  refreshFrameButtons();
  render();
}

function selectLayer(layer){
  activeLayer=layer==='lower'?'lower':'upper';
  $('layerUpper').className=activeLayer==='upper'?'':'secondary';
  $('layerLower').className=activeLayer==='lower'?'':'secondary';
  render();
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
  if(!sourceImage)return setStatus('먼저 PNG를 불러오세요.',true);
  $('stampX').value='0';$('stampY').value='0';$('stampW').value='128';$('stampH').value='128';$('stampRotation').value='0';render();
}

function commitStamp(){
  if(!sourceImage)return setStatus('먼저 PNG를 불러오세요.',true);
  snapshot();
  drawStamp(layerCtx(),1);
  afterEdit('가져온 이미지를 '+activeLayer+' 레이어에 적용함');
}

function clearStamp(){
  sourceImage=null;
  $('sourcePreview').src='';
  $('sourcePreview').classList.add('hidden');
  $('sourceFile').value='';
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
  ['stampX','stampY','stampW','stampH','stampRotation','stampOpacity'].forEach(id=>$(id).addEventListener('input',render));
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
        sourceImage=img;$('sourcePreview').src=reader.result;$('sourcePreview').classList.remove('hidden');fitStamp();setStatus('원본 이미지를 불러옴 · 위치/크기를 조절하세요.');
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
  $('fitStamp').addEventListener('click',fitStamp);$('commitStamp').addEventListener('click',commitStamp);$('clearStamp').addEventListener('click',clearStamp);
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
  await restoreLocal();
  selectLayer('upper');selectTool('pencil');selectFrame('static');
  Promise.all(FRAMES.map(f=>loadBody(f.body).catch(()=>null))).then(()=>render());
  setStatus('준비됨 · 모든 작업은 실제 128×128 좌표로 저장됩니다.');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
