(()=>{'use strict';

const ROOT='assets/game/characters/kidscade-avatar-v3/school-starter';
const MANIFEST_URL=ROOT+'/manifest.json';
const SHEET_URL=ROOT+'/school-starter-sheet.png';
const DEFAULT_IMAGE=ROOT+'/guest-default.png';
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const PREVIEW_VERSION_KEY='kidscade-avatar-studio-preview-version';
const PREVIEW_VERSION='pixel-v3-school-starter-3';
const STATE_KEY='kidscade-avatar-v3';
const SIZE=128;
const SKIN_PRESETS=['#f6d2b8','#eac09d','#d99d73','#b97852','#8a563a','#5d3828'];
const PARTS={
  skin:{label:'피부',name:'피부색',assetKey:null},
  hair:{label:'헤어',name:'더벅머리',assetKey:'hair'},
  eyes:{label:'눈',name:'기본 눈',assetKey:'eyes'},
  mouth:{label:'입',name:'ㅡ 입',assetKey:'mouth'},
  earring:{label:'귀걸이',name:'구리 링 귀걸이',assetKey:'earring'},
  upper:{label:'상의',name:'학교 교복 상의',assetKey:'upper'},
  lower:{label:'하의',name:'학교 교복 하의',assetKey:'lower'},
  shoes:{label:'신발',name:'기본 운동화',assetKey:'shoes'},
  weapon:{label:'도구',name:'자',assetKey:'weaponFront'},
  shield:{label:'책',name:'교과서',assetKey:'shieldFront'}
};

const canvas=document.getElementById('avatarCanvas');
const ctx=canvas.getContext('2d',{alpha:true});
ctx.imageSmoothingEnabled=false;
const tabs=document.getElementById('tabs');
const optionGrid=document.getElementById('optionGrid');
const pickerTitle=document.getElementById('pickerTitle');
const pickerCount=document.getElementById('pickerCount');
const styleSummary=document.getElementById('styleSummary');
const toast=document.getElementById('toast');
const seedBadge=document.getElementById('seedBadge');
const motionControls=document.getElementById('motionControls');

const staticCanvas=document.createElement('canvas');
staticCanvas.width=SIZE;staticCanvas.height=SIZE;
const staticCtx=staticCanvas.getContext('2d',{alpha:true});
staticCtx.imageSmoothingEnabled=false;

let manifest=null;
let sheet=null;
let eyeCatalog=null;
const eyeParts=new Map();
const eyeSourceCache=new Map();
const eyeFrameCache=new Map();
const eyeMaskCache=new Map();
const eyeMaskCoordCache=new Map();
let currentTab='skin';
let previewMode='stand';
let previewStartedAt=0;
let previewRaf=0;
let lastFrameIndex=-1;
let seeds=0;
let skinPalette=[];
let skinBaseHex='#fce2d2';
let skinRemapColor='';
let skinRemap=new Map();
let state={version:3,setId:'school-starter-01',skinColor:null};

function safeJson(raw){try{return raw?JSON.parse(raw):null}catch(_){return null}}
function normalizeHexColor(value){
  const raw=String(value||'').trim();
  if(/^#[0-9a-f]{6}$/i.test(raw))return raw.toLowerCase();
  if(/^#[0-9a-f]{3}$/i.test(raw))return '#'+raw.slice(1).split('').map(ch=>ch+ch).join('').toLowerCase();
  return null;
}
function loadState(){
  try{
    const saved=safeJson(localStorage.getItem(STATE_KEY));
    if(saved&&saved.version===3&&saved.setId)return {...state,...saved,skinColor:normalizeHexColor(saved.skinColor)};
  }catch(_){}
  return {...state};
}
state=loadState();

async function loadManifest(){
  const res=await fetch(MANIFEST_URL,{cache:'no-cache'});
  if(!res.ok)throw new Error('v3 아바타 manifest를 불러오지 못했습니다.');
  manifest=await res.json();
  state.setId=manifest.id||state.setId;
  return manifest;
}
function loadSheet(){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{sheet=img;resolve(img)};
    img.onerror=()=>reject(new Error('v3 아바타 스프라이트를 불러오지 못했습니다.'));
    img.src=SHEET_URL+'?v=1';
  });
}
function hexToRgb(hex){
  const safe=normalizeHexColor(hex)||skinBaseHex;
  return [parseInt(safe.slice(1,3),16),parseInt(safe.slice(3,5),16),parseInt(safe.slice(5,7),16)];
}
function colorKey(r,g,b){return (r<<16)|(g<<8)|b}
function loadSkinPalette(){
  const config=manifest?.customization?.skinColor||{};
  skinBaseHex=normalizeHexColor(config.defaultColor)||'#fce2d2';
  const source=Array.isArray(config.sourcePalette)?config.sourcePalette:[];
  skinPalette=source.map(entry=>{
    const hex=normalizeHexColor(entry?.source);
    const shade=Number(entry?.shade);
    if(!hex||!Number.isFinite(shade)||shade<=0)return null;
    const [r,g,b]=hexToRgb(hex);
    return {key:colorKey(r,g,b),source:hex,shade:Math.max(.05,Math.min(1.25,shade)),role:String(entry?.role||'')};
  }).filter(Boolean);
  if(!skinPalette.length)throw new Error('v3 피부 팔레트가 등록되지 않았습니다.');
  skinRemapColor='';skinRemap=new Map();
  return skinPalette;
}
function ensureSkinRemap(){
  const target=normalizeHexColor(state.skinColor);
  if(!target||!skinPalette.length)return null;
  if(skinRemapColor===target&&skinRemap.size)return skinRemap;
  const targetRgb=hexToRgb(target);
  const next=new Map();
  for(const src of skinPalette){
    next.set(src.key,targetRgb.map(value=>Math.max(0,Math.min(255,Math.round(value*src.shade)))));
  }
  skinRemapColor=target;skinRemap=next;
  return next;
}
function recolorSkin(target){
  const remap=ensureSkinRemap();
  if(!remap?.size)return;
  const image=target.getImageData(0,0,SIZE,SIZE),data=image.data;
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]<1)continue;
    const replacement=remap.get(colorKey(data[i],data[i+1],data[i+2]));
    if(!replacement)continue;
    data[i]=replacement[0];data[i+1]=replacement[1];data[i+2]=replacement[2];
  }
  target.putImageData(image,0,0);
}
async function loadEyeCatalog(){
  const rel=manifest?.partCatalogs?.eyes||'eyes/catalog.json';
  const res=await fetch(ROOT+'/'+rel,{cache:'no-cache'});
  if(!res.ok)throw new Error('눈 파츠 카탈로그를 불러오지 못했습니다.');
  const data=await res.json();
  if(data?.type!=='kidscade-avatar-eye-catalog'||!Array.isArray(data.items))throw new Error('눈 파츠 카탈로그 형식이 올바르지 않습니다.');
  eyeCatalog=data;
  const merged={...(manifest?.assetIds||{}),...(state.assetIds||{})};
  const requested=merged.eyes||data.defaultId||manifest?.assetIds?.eyes||'basic-eyes-01';
  merged.eyes=data.items.some(item=>item.id===requested)?requested:(data.defaultId||'basic-eyes-01');
  state.assetIds=merged;
  if(merged.eyes!==data.defaultId)await loadEyePart(merged.eyes);
  return data;
}
async function loadEyePart(id){
  if(!eyeCatalog||!id||id===eyeCatalog.defaultId)return null;
  if(eyeParts.has(id))return eyeParts.get(id);
  const item=eyeCatalog.items.find(candidate=>candidate.id===id);
  if(!item?.file)throw new Error('등록되지 않은 눈 파츠입니다: '+id);
  const res=await fetch(ROOT+'/eyes/'+item.file,{cache:'no-cache'});
  if(!res.ok)throw new Error('눈 파츠를 불러오지 못했습니다: '+id);
  const part=await res.json();
  if(part?.type!=='kidscade-avatar-eye-part'||part.id!==id||part.layer!=='eyes'||!Array.isArray(part.pixels))throw new Error('눈 파츠 JSON 형식이 올바르지 않습니다: '+id);
  eyeParts.set(id,part);return part;
}
function selectedEyeId(){return state.assetIds?.eyes||manifest?.assetIds?.eyes||eyeCatalog?.defaultId||'basic-eyes-01'}
function pixelsCanvas(pixels,maskOnly=false){
  const out=document.createElement('canvas');out.width=SIZE;out.height=SIZE;
  const c=out.getContext('2d',{alpha:true}),image=c.createImageData(SIZE,SIZE),data=image.data;
  for(const pixel of pixels||[]){
    const x=Number(pixel?.[0]),y=Number(pixel?.[1]);
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=SIZE||y>=SIZE)continue;
    const i=(y*SIZE+x)*4;
    if(maskOnly){data[i]=255;data[i+1]=255;data[i+2]=255;data[i+3]=255;continue}
    data[i]=Math.max(0,Math.min(255,Number(pixel[2])||0));data[i+1]=Math.max(0,Math.min(255,Number(pixel[3])||0));data[i+2]=Math.max(0,Math.min(255,Number(pixel[4])||0));data[i+3]=Math.max(0,Math.min(255,Number(pixel[5])||0));
  }
  c.putImageData(image,0,0);return out;
}
function transformEyeCanvas(source,frameId){
  const out=document.createElement('canvas');out.width=SIZE;out.height=SIZE;
  const c=out.getContext('2d',{alpha:true});c.imageSmoothingEnabled=false;
  const spec=eyeCatalog?.frameTransforms?.[frameId];
  if(!spec){c.drawImage(source,0,0);return out}
  if(spec.type==='sitMix'){const down=Number(spec.down)||0;c.drawImage(source,35,20,60,81,35,20+down,60,81);return out}
  const pivot=spec.pivot||[64,118],dx=Number(spec.dx)||0,dy=Number(spec.dy)||0,angle=(Number(spec.angle)||0)*Math.PI/180;
  const scaleX=Number.isFinite(Number(spec.scaleX))?Number(spec.scaleX):1,scaleY=Number.isFinite(Number(spec.scaleY))?Number(spec.scaleY):1;
  c.save();c.translate(pivot[0]+dx,pivot[1]+dy);c.rotate(angle);c.scale(scaleX,scaleY);c.translate(-pivot[0],-pivot[1]);c.drawImage(source,0,0);c.restore();return out;
}
function eyeLayerCanvas(id,frameId){
  const key=id+':'+frameId;if(eyeFrameCache.has(key))return eyeFrameCache.get(key);
  const part=eyeParts.get(id);if(!part)return null;
  let source=eyeSourceCache.get(id);if(!source){source=pixelsCanvas(part.pixels);eyeSourceCache.set(id,source)}
  const out=transformEyeCanvas(source,frameId);eyeFrameCache.set(key,out);return out;
}
function eyeMaskCoords(frameId){
  if(eyeMaskCoordCache.has(frameId))return eyeMaskCoordCache.get(frameId);
  let mask=eyeMaskCache.get(frameId);if(!mask){mask=transformEyeCanvas(pixelsCanvas(eyeCatalog?.baseClearPixels||[],true),frameId);eyeMaskCache.set(frameId,mask)}
  const data=mask.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data,coords=[];
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(data[(y*SIZE+x)*4+3])coords.push([x,y]);
  eyeMaskCoordCache.set(frameId,coords);return coords;
}
function transformEyePoint(point,frameId){
  const x=Number(point?.[0])||0,y=Number(point?.[1])||0,spec=eyeCatalog?.frameTransforms?.[frameId];
  if(!spec)return [Math.round(x),Math.round(y)];
  if(spec.type==='sitMix')return [Math.round(x),Math.round(y+(Number(spec.down)||0))];
  const pivot=spec.pivot||[64,118],dx=Number(spec.dx)||0,dy=Number(spec.dy)||0,angle=(Number(spec.angle)||0)*Math.PI/180;
  const sx=Number.isFinite(Number(spec.scaleX))?Number(spec.scaleX):1,sy=Number.isFinite(Number(spec.scaleY))?Number(spec.scaleY):1,ux=(x-pivot[0])*sx,uy=(y-pivot[1])*sy;
  return [Math.round(pivot[0]+dx+Math.cos(angle)*ux-Math.sin(angle)*uy),Math.round(pivot[1]+dy+Math.sin(angle)*ux+Math.cos(angle)*uy)];
}
function sampledEyeSkin(image,frameId){
  const values=[];for(const point of eyeCatalog?.skinSamples||[[64,56]]){const [x,y]=transformEyePoint(point,frameId);if(x<0||y<0||x>=SIZE||y>=SIZE)continue;const i=(y*SIZE+x)*4;if(image.data[i+3]>0)values.push([image.data[i],image.data[i+1],image.data[i+2]])}
  if(!values.length)return hexToRgb(state.skinColor||skinBaseHex);
  const median=index=>values.map(v=>v[index]).sort((a,b)=>a-b)[Math.floor(values.length/2)];return [median(0),median(1),median(2)];
}
function applyEyePart(target,frameId,eyeId=selectedEyeId()){
  if(!eyeCatalog||!eyeId||eyeId===eyeCatalog.defaultId)return;
  const layer=eyeLayerCanvas(eyeId,frameId);if(!layer)return;
  const image=target.getImageData(0,0,SIZE,SIZE),skin=sampledEyeSkin(image,frameId);
  for(const [x,y] of eyeMaskCoords(frameId)){const i=(y*SIZE+x)*4;image.data[i]=skin[0];image.data[i+1]=skin[1];image.data[i+2]=skin[2];image.data[i+3]=255}
  target.putImageData(image,0,0);target.drawImage(layer,0,0);
}
function animationFor(mode){
  if(!manifest?.animations)return [];
  const normalized=mode==='idle'||mode==='smile'||mode==='static'?'stand':mode;
  return manifest.animations[normalized]||manifest.animations.stand||[];
}
function frameAt(mode,timeSec=0){
  const frames=animationFor(mode);
  if(!frames.length)return {index:0,id:'stand-01',durationMs:500};
  const total=frames.reduce((n,f)=>n+Math.max(1,Number(f.durationMs)||100),0);
  let ms=(Math.max(0,Number(timeSec)||0)*1000)%total;
  for(const frame of frames){
    const duration=Math.max(1,Number(frame.durationMs)||100);
    if(ms<duration)return frame;
    ms-=duration;
  }
  return frames[frames.length-1];
}
function drawFrame(target,index,eyeId=selectedEyeId()){
  if(!sheet)return;
  target.save();
  target.setTransform(1,0,0,1,0,0);
  target.clearRect(0,0,SIZE,SIZE);
  target.imageSmoothingEnabled=false;
  target.drawImage(sheet,index*SIZE,0,SIZE,SIZE,0,0,SIZE,SIZE);
  recolorSkin(target);
  applyEyePart(target,manifest?.frameOrder?.[index]||'stand-01',eyeId);
  target.restore();
}
function drawStatic(){
  const frame=animationFor('stand')[0]||{index:0};
  drawFrame(staticCtx,frame.index||0);
  drawFrame(ctx,frame.index||0);
  lastFrameIndex=frame.index||0;
}
function previewData(){
  try{return staticCanvas.toDataURL('image/png')}catch(_){return ''}
}
function renderPreviewFrame(mode='stand',time=0){
  if(!sheet)return previewData();
  const frame=frameAt(mode,time);
  const off=document.createElement('canvas');
  off.width=SIZE;off.height=SIZE;
  const offCtx=off.getContext('2d',{alpha:true});
  offCtx.imageSmoothingEnabled=false;
  drawFrame(offCtx,frame.index||0);
  try{return off.toDataURL('image/png')}catch(_){return previewData()}
}
function syncMotionButtons(){
  motionControls?.querySelectorAll('[data-motion]').forEach(button=>{
    const active=button.dataset.motion===previewMode;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',active?'true':'false');
  });
}
function stopPreview(){
  if(previewRaf)cancelAnimationFrame(previewRaf);
  previewRaf=0;
  lastFrameIndex=-1;
}
function tick(now){
  previewRaf=0;
  const elapsed=Math.max(0,(now-previewStartedAt)/1000);
  const frame=frameAt(previewMode,elapsed);
  if(frame.index!==lastFrameIndex){
    drawFrame(ctx,frame.index||0);
    lastFrameIndex=frame.index||0;
  }
  previewRaf=requestAnimationFrame(tick);
}
function setPreviewMode(mode='stand'){
  const normalized=mode==='static'||mode==='idle'||mode==='smile'?'stand':mode;
  previewMode=manifest?.animations?.[normalized]?normalized:'stand';
  stopPreview();
  previewStartedAt=performance.now();
  syncMotionButtons();
  if(animationFor(previewMode).length<=1){
    const frame=frameAt(previewMode,0);
    drawFrame(ctx,frame.index||0);
    lastFrameIndex=frame.index||0;
  }else{
    previewRaf=requestAnimationFrame(tick);
  }
}
function assetIdFor(part){
  const meta=PARTS[part];
  if(!meta?.assetKey||!manifest?.assetIds)return '';
  return state.assetIds?.[meta.assetKey]||manifest.assetIds[meta.assetKey]||'';
}
function skinSwatch(color,label){
  const selected=normalizeHexColor(state.skinColor)===normalizeHexColor(color);
  return `<button type="button" class="skin-swatch${selected?' active':''}" data-skin-color="${color}" style="--skin:${color}" aria-label="${label}" title="${label}"><span></span></button>`;
}
function renderSkinOptions(){
  pickerTitle.textContent='피부색';
  pickerCount.textContent='자유 선택';
  optionGrid.classList.add('skin-mode');
  const current=normalizeHexColor(state.skinColor)||skinBaseHex;
  const presetButtons=SKIN_PRESETS.map((color,index)=>skinSwatch(color,'피부톤 '+(index+1))).join('');
  optionGrid.innerHTML=`<div class="skin-picker-card">
    <div class="skin-picker-copy"><strong>피부색을 마음대로 골라요</strong><span>얼굴·손·다리의 명암은 그대로 유지됩니다.</span></div>
    <div class="skin-presets" role="group" aria-label="피부색 빠른 선택">${presetButtons}</div>
    <label class="skin-custom-row" for="skinColorPicker">
      <span><b>직접 색 고르기</b><small>원하는 어떤 색이든 사용할 수 있어요.</small></span>
      <input id="skinColorPicker" type="color" value="${current}" aria-label="직접 피부색 선택">
    </label>
    <button type="button" class="soft-btn skin-reset" data-skin-reset>원래 피부색으로</button>
  </div>`;
}
function drawEyeThumbnail(canvasElement,id){
  if(!canvasElement)return;const full=document.createElement('canvas');full.width=SIZE;full.height=SIZE;
  const fullCtx=full.getContext('2d',{alpha:true});fullCtx.imageSmoothingEnabled=false;drawFrame(fullCtx,0,id);
  const thumb=canvasElement.getContext('2d',{alpha:true});thumb.imageSmoothingEnabled=false;thumb.clearRect(0,0,SIZE,SIZE);thumb.drawImage(full,42,20,46,46,0,0,SIZE,SIZE);
}
async function hydrateEyeThumbnails(){
  if(!eyeCatalog)return;await Promise.allSettled(eyeCatalog.items.filter(item=>item.id!==eyeCatalog.defaultId).map(item=>loadEyePart(item.id)));
  if(currentTab!=='eyes')return;optionGrid.querySelectorAll('canvas[data-eye-thumb]').forEach(el=>drawEyeThumbnail(el,el.dataset.eyeThumb));
}
function renderEyeOptions(){
  const items=eyeCatalog?.items||[],selected=selectedEyeId();pickerTitle.textContent='눈';pickerCount.textContent=items.length+'가지';optionGrid.classList.remove('skin-mode');
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selected;return `<button type='button' class='option${active?' active':''}' aria-pressed='${active?'true':'false'}' data-eye-id='${item.id}'><span class='hair-thumb'><canvas width='128' height='128' data-eye-thumb='${item.id}' aria-hidden='true'></canvas></span><span class='num'>${active?'✓':index+1}</span><span class='part-name'>${item.label}<small>${item.id}</small></span></button>`}).join('');
  optionGrid.querySelectorAll('canvas[data-eye-thumb]').forEach(el=>{if(el.dataset.eyeThumb===eyeCatalog.defaultId)drawEyeThumbnail(el,el.dataset.eyeThumb)});hydrateEyeThumbnails();
}
function renderOptions(){
  if(currentTab==='skin'){renderSkinOptions();return}
  if(currentTab==='eyes'){renderEyeOptions();return}
  optionGrid.classList.remove('skin-mode');
  const meta=PARTS[currentTab]||PARTS.hair;
  const id=assetIdFor(currentTab);
  pickerTitle.textContent=meta.label;
  pickerCount.textContent='1가지';
  optionGrid.innerHTML=`<button type="button" class="option active" aria-pressed="true" data-v3-part="${currentTab}">
    <span class="hair-thumb"><img class="base" alt="" src="${DEFAULT_IMAGE}?v=1"></span>
    <span class="num">✓</span>
    <span class="part-name">${meta.name}<small>${id}</small></span>
  </button>`;
}
function selectTab(tab){
  if(!PARTS[tab])tab='hair';
  currentTab=tab;
  tabs.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  renderOptions();
}
function flash(text){
  toast.textContent=text;
  toast.classList.add('show');
  clearTimeout(flash.t);
  flash.t=setTimeout(()=>toast.classList.remove('show'),1400);
}
function refreshSkinPreview(){
  skinRemapColor='';skinRemap=new Map();
  const stand=animationFor('stand')[0]||{index:0};
  drawFrame(staticCtx,stand.index||0);
  setPreviewMode(previewMode);
}
async function setEyeAsset(id){
  if(!eyeCatalog?.items?.some(item=>item.id===id))return false;if(id!==eyeCatalog.defaultId)await loadEyePart(id);
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),eyes:id};refreshSkinPreview();renderOptions();publish(false);
  const item=eyeCatalog.items.find(candidate=>candidate.id===id);flash((item?.label||'눈')+' 적용했어요!');return true;
}
function setSkinColor(value,{rerender=false,announce=false}={}){
  state.skinColor=normalizeHexColor(value);
  refreshSkinPreview();
  publish(false);
  if(rerender)renderOptions();
  if(announce)flash(state.skinColor?'피부색을 바꿨어요!':'원래 피부색으로 돌아왔어요.');
}
function publish(showToast=false){
  try{
    const payload={version:3,setId:manifest?.id||state.setId,assetIds:{...(manifest?.assetIds||{}),...(state.assetIds||{})},skinColor:normalizeHexColor(state.skinColor)};
    state=payload;
    localStorage.setItem(STATE_KEY,JSON.stringify(payload));
    const data=previewData();
    if(data){
      localStorage.setItem(PREVIEW_KEY,data);
      localStorage.setItem(PREVIEW_VERSION_KEY,PREVIEW_VERSION);
    }
    window.parent?.postMessage({type:'kidscade-avatar-change',source:'pixel-v3-school',state:{...payload}},location.origin);
    if(showToast)flash('새 v3 캐릭터를 저장했어요!');
  }catch(_){}
}
function resetToDefault(){
  state={version:3,setId:manifest?.id||'school-starter-01',skinColor:null};
  state.assetIds={...(manifest?.assetIds||{})};
  drawStatic();
  setPreviewMode('stand');
  publish(false);
  flash('새 기본 캐릭터로 돌아왔어요.');
}

tabs?.addEventListener('click',e=>{
  const button=e.target.closest('.tab');
  if(button)selectTab(button.dataset.tab);
});
optionGrid?.addEventListener('click',e=>{
  const eye=e.target.closest('[data-eye-id]');
  if(eye){setEyeAsset(eye.dataset.eyeId);return}
  const swatch=e.target.closest('[data-skin-color]');
  if(swatch){setSkinColor(swatch.dataset.skinColor,{rerender:true,announce:true});return}
  if(e.target.closest('[data-skin-reset]'))setSkinColor(null,{rerender:true,announce:true});
});
optionGrid?.addEventListener('input',e=>{
  if(e.target?.id==='skinColorPicker')setSkinColor(e.target.value,{rerender:false,announce:false});
});
optionGrid?.addEventListener('change',e=>{
  if(e.target?.id==='skinColorPicker'){renderOptions();flash('피부색을 바꿨어요!')}
});
motionControls?.addEventListener('click',e=>{
  const button=e.target.closest('[data-motion]');
  if(button)setPreviewMode(button.dataset.motion);
});
document.getElementById('saveBtn')?.addEventListener('click',()=>publish(true));
document.getElementById('resetBtn')?.addEventListener('click',resetToDefault);

window.KidscadeAvatarShop={
  version:'pixel-v3-school-starter-3',
  stateKey:STATE_KEY,
  getPreviewDataURL:previewData,
  renderPreviewFrame,
  getPreviewMode:()=>previewMode,
  setPreviewMode,
  getRig:()=>null,
  getExtraParts:()=>[],
  async setExtraParts(){return false},
  setSeeds(value){
    seeds=Math.max(0,parseInt(value,10)||0);
    seedBadge.hidden=false;
    seedBadge.textContent='씨앗 '+seeds.toLocaleString('ko-KR');
  },
  getState:()=>({...state}),
  async setState(next){
    if(!next||typeof next!=='object')return false;
    state={...state,...next,version:3,setId:manifest?.id||state.setId,skinColor:normalizeHexColor(next.skinColor??state.skinColor)};
    state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),...(next.assetIds||{})};
    if(eyeCatalog&&!eyeCatalog.items.some(item=>item.id===state.assetIds.eyes))state.assetIds.eyes=eyeCatalog.defaultId;
    if(state.assetIds.eyes!==eyeCatalog?.defaultId)await loadEyePart(state.assetIds.eyes);
    refreshSkinPreview();
    publish(false);
    return true;
  }
};

(async function boot(){
  await Promise.all([loadManifest(),loadSheet()]);
  await loadEyeCatalog();
  loadSkinPalette();
  drawStatic();
  styleSummary.textContent='학교 탐험가 · 눈 11종 · 피부색 자유 설정 · 23프레임';
  selectTab('skin');
  setPreviewMode('stand');
  publish(false);
  document.body.dataset.avatarReady='1';
  window.parent?.postMessage({type:'kidscade-avatar-ready',source:'pixel-v3-school'},location.origin);
})().catch(err=>{
  console.error(err);
  document.body.dataset.avatarReady='error';
  flash('새 아바타를 불러오지 못했어요.');
});
})();