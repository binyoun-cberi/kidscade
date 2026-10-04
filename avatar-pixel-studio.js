(()=>{'use strict';

const ROOT='assets/game/characters/kidscade-avatar-v3/school-starter';
const MANIFEST_URL=ROOT+'/manifest.json';
const SHEET_URL=ROOT+'/school-starter-sheet.png';
const DEFAULT_IMAGE=ROOT+'/guest-default.png';
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const PREVIEW_VERSION_KEY='kidscade-avatar-studio-preview-version';
const PREVIEW_VERSION='pixel-v3-school-starter-2';
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
let currentTab='skin';
let previewMode='stand';
let previewStartedAt=0;
let previewRaf=0;
let lastFrameIndex=-1;
let seeds=0;
let skinPalette=[];
let skinBaseHex='#f2b89d';
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
function rgbToHsl(r,g,b){
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;
  const l=(max+min)/2;
  const sat=d===0?0:d/(1-Math.abs(2*l-1));
  if(d){
    if(max===r)h=((g-b)/d)%6;
    else if(max===g)h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60;if(h<0)h+=360;
  }
  return {h,s:sat,l};
}
function hslToRgb(h,s,l){
  h=((h%360)+360)%360;
  const c=(1-Math.abs(2*l-1))*s;
  const x=c*(1-Math.abs((h/60)%2-1));
  const m=l-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}
  else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
  return [r,g,b].map(v=>Math.max(0,Math.min(255,Math.round((v+m)*255))));
}
function hexToRgb(hex){
  const safe=normalizeHexColor(hex)||skinBaseHex;
  return [parseInt(safe.slice(1,3),16),parseInt(safe.slice(3,5),16),parseInt(safe.slice(5,7),16)];
}
function rgbToHex(r,g,b){return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
function colorKey(r,g,b){return (r<<16)|(g<<8)|b}
function isLikelySkin(r,g,b,a){
  if(a<200)return false;
  const hsl=rgbToHsl(r,g,b),value=Math.max(r,g,b)/255;
  return value>=.54&&hsl.s>=.12&&hsl.s<=.62&&hsl.h>=5&&hsl.h<=42&&r>g&&g>=b*.92;
}
function buildSkinPalette(){
  if(!sheet)return [];
  const counts=new Map();
  const scratch=document.createElement('canvas');
  scratch.width=SIZE;scratch.height=SIZE;
  const sc=scratch.getContext('2d',{alpha:true});
  sc.imageSmoothingEnabled=false;
  for(const index of [0,1]){
    sc.clearRect(0,0,SIZE,SIZE);
    sc.drawImage(sheet,index*SIZE,0,SIZE,SIZE,0,0,SIZE,SIZE);
    const data=sc.getImageData(40,22,50,52).data;
    for(let i=0;i<data.length;i+=4){
      const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      if(!isLikelySkin(r,g,b,a))continue;
      const key=colorKey(r,g,b);
      const rec=counts.get(key)||{key,r,g,b,count:0,hsl:rgbToHsl(r,g,b)};
      rec.count++;counts.set(key,rec);
    }
  }
  skinPalette=[...counts.values()].filter(item=>item.count>=4).sort((a,b)=>b.count-a.count).slice(0,8);
  if(skinPalette.length){
    const base=skinPalette[0];
    skinBaseHex=rgbToHex(base.r,base.g,base.b);
  }
  skinRemapColor='';skinRemap=new Map();
  return skinPalette;
}
function ensureSkinRemap(){
  const target=normalizeHexColor(state.skinColor);
  if(!target||!skinPalette.length)return null;
  if(skinRemapColor===target&&skinRemap.size)return skinRemap;
  const [tr,tg,tb]=hexToRgb(target),targetHsl=rgbToHsl(tr,tg,tb);
  const ref=skinPalette[0],refHsl=ref.hsl||rgbToHsl(ref.r,ref.g,ref.b);
  const next=new Map();
  for(const src of skinPalette){
    const srcHsl=src.hsl||rgbToHsl(src.r,src.g,src.b);
    const light=Math.max(.025,Math.min(.975,targetHsl.l+(srcHsl.l-refHsl.l)*.92));
    const sat=Math.max(0,Math.min(1,targetHsl.s*(.88+Math.min(1,srcHsl.s/(refHsl.s||.01))*.12)));
    next.set(src.key,hslToRgb(targetHsl.h,sat,light));
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
function drawFrame(target,index){
  if(!sheet)return;
  target.save();
  target.setTransform(1,0,0,1,0,0);
  target.clearRect(0,0,SIZE,SIZE);
  target.imageSmoothingEnabled=false;
  target.drawImage(sheet,index*SIZE,0,SIZE,SIZE,0,0,SIZE,SIZE);
  recolorSkin(target);
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
  return manifest.assetIds[meta.assetKey]||'';
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
function renderOptions(){
  if(currentTab==='skin'){renderSkinOptions();return}
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
function setSkinColor(value,{rerender=false,announce=false}={}){
  state.skinColor=normalizeHexColor(value);
  refreshSkinPreview();
  publish(false);
  if(rerender)renderOptions();
  if(announce)flash(state.skinColor?'피부색을 바꿨어요!':'원래 피부색으로 돌아왔어요.');
}
function publish(showToast=false){
  try{
    const payload={version:3,setId:manifest?.id||state.setId,assetIds:{...(manifest?.assetIds||{})},skinColor:normalizeHexColor(state.skinColor)};
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
  version:'pixel-v3-school-starter-2',
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
    refreshSkinPreview();
    publish(false);
    return true;
  }
};

(async function boot(){
  await Promise.all([loadManifest(),loadSheet()]);
  buildSkinPalette();
  drawStatic();
  styleSummary.textContent='학교 탐험가 · 피부색 자유 설정 · 23프레임';
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