(()=>{
'use strict';

const ROOT='assets/game/characters/kidscade-avatar-v1/runtime';
const ASSET_REV='13';
function rev(src){return src+(src.includes('?')?'&':'?')+'v='+ASSET_REV;}
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const PREVIEW_VERSION_KEY='kidscade-avatar-studio-preview-version';
const PREVIEW_VERSION='pixel-v2-rig-hairfit-3';
const STATE_KEY='kidscade-pixel-avatar-v1';
const LEGACY_EQUIPPED_KEY='kidscade_avatar_equipped';
const BASE=rev(ROOT+'/base/master-base-128.png');
const COUNTS={eyes:8,eyebrows:6,noses:4,mouths:8,blush:4};
const DEFAULT={hairSet:'male',hair:1,upper:1,lower:1,eyes:1,eyebrows:1,noses:1,mouths:1,blush:0};
const labels={hair:'헤어스타일',upper:'상의',lower:'하의',eyes:'눈',eyebrows:'눈썹',noses:'코',mouths:'입',blush:'볼터치'};
const folders={eyes:'eyes',eyebrows:'eyebrows',noses:'noses',mouths:'mouths',blush:'blush'};
const prefixes={eyes:'eyes',eyebrows:'eyebrows',noses:'nose',mouths:'mouth',blush:'blush'};

const canvas=document.getElementById('avatarCanvas');
const ctx=canvas.getContext('2d',{alpha:true});
ctx.imageSmoothingEnabled=false;
const optionGrid=document.getElementById('optionGrid');
const tabs=document.getElementById('tabs');
const hairFilter=document.getElementById('hairFilter');
const pickerTitle=document.getElementById('pickerTitle');
const pickerCount=document.getElementById('pickerCount');
const styleSummary=document.getElementById('styleSummary');
const toast=document.getElementById('toast');
const seedBadge=document.getElementById('seedBadge');

let currentTab='hair';
let hairFilterValue='all';
let seeds=0;
let renderToken=0;
let animationCacheToken=0;
let animationManifest=null;
let animationFrames={idle:[],walk:[]};
let renderer=null;
let extraParts=[];

function clampInt(v,min,max,fallback){
  const n=parseInt(v,10);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function safeJson(raw){
  try{return raw?JSON.parse(raw):null}catch(_){return null}
}
function loadStateFromObject(raw){
  raw=raw&&typeof raw==='object'?raw:{};
  return {
    hairSet:raw.hairSet==='female'?'female':'male',
    hair:clampInt(raw.hair,1,24,DEFAULT.hair),
    upper:clampInt(raw.upper,0,1,DEFAULT.upper),
    lower:clampInt(raw.lower,0,1,DEFAULT.lower),
    eyes:clampInt(raw.eyes,1,8,DEFAULT.eyes),
    eyebrows:clampInt(raw.eyebrows,1,6,DEFAULT.eyebrows),
    noses:clampInt(raw.noses,1,4,DEFAULT.noses),
    mouths:clampInt(raw.mouths,1,8,DEFAULT.mouths),
    blush:clampInt(raw.blush,0,4,DEFAULT.blush)
  };
}
function legacyMigrationState(){
  const old=safeJson(localStorage.getItem(LEGACY_EQUIPPED_KEY));
  if(!old||typeof old!=='object')return {...DEFAULT};
  const femaleHair=['hair_bob','hair_pony','hair_buns','hair_wave','hair_twin'];
  const hairMap={
    hair_short:1,hair_spike:4,hair_curl:8,hair_mushroom:13,
    hair_bob:3,hair_pony:7,hair_buns:10,hair_wave:14,hair_twin:18
  };
  return {
    ...DEFAULT,
    hairSet:femaleHair.includes(old.hair)?'female':'male',
    hair:hairMap[old.hair]||1,
    upper:old.top==='top_hoodie'||old.top==='top_varsity'?1:DEFAULT.upper,
    lower:old.bottom==='bottom_jeans'||old.bottom==='bottom_track'?1:DEFAULT.lower
  };
}
function loadState(){
  try{
    const stored=localStorage.getItem(STATE_KEY);
    if(stored)return loadStateFromObject(safeJson(stored));
    return legacyMigrationState();
  }catch(_){return {...DEFAULT};}
}
let state=loadState();

function pad(n){return String(n).padStart(2,'0');}
function hairPath(layer,set,n){return rev(`${ROOT}/hair/${layer}/${set}/hair-${layer}-${set}-${pad(n)}.png`);}
function upperPath(n,frameFile=''){
  return n===1?rev(`${ROOT}/clothes/upper/blue-star-zip-hoodie-01/${frameFile||'static.png'}`):'';
}
function lowerPath(n,frameFile=''){
  return n===1?rev(`${ROOT}/clothes/lower/denim-cuffed-jeans-01/${frameFile||'static.png'}`):'';
}
function facePath(type,n){
  if(!n)return '';
  return rev(`${ROOT}/face/${folders[type]}/${prefixes[type]}-${pad(n)}.png`);
}
function rendererConfig(s=state,animation='static'){
  return {
    hairSet:s.hairSet,
    hairStyle:s.hair,
    upper:s.upper,
    lower:s.lower,
    eyes:s.eyes,
    eyebrows:s.eyebrows,
    nose:s.noses,
    mouth:s.mouths,
    blush:s.blush,
    animation
  };
}
async function ensureRenderer(){
  if(renderer)return renderer;
  const api=window.KidscadePixelAvatarV2||window.KidscadePixelAvatarV1;
  if(!api?.create)throw new Error('Kidscade avatar rig renderer is missing.');
  renderer=await api.create(canvas,{playing:false,config:rendererConfig(state)});
  animationManifest=renderer.animationManifest;
  return renderer;
}
async function drawTo(targetCtx,targetState=state,frame=null){
  const r=await ensureRenderer();
  const config=rendererConfig(targetState,'static');
  const isMain=targetCtx===ctx;
  if(!isMain){
    await r.renderTo(targetCtx,config,frame,extraParts);
    return;
  }

  const my=++renderToken;
  const off=document.createElement('canvas');
  off.width=128;off.height=128;
  const offCtx=off.getContext('2d',{alpha:true});
  offCtx.imageSmoothingEnabled=false;
  await r.renderTo(offCtx,config,frame,extraParts);
  if(my!==renderToken)return;
  targetCtx.save();
  targetCtx.setTransform(1,0,0,1,0,0);
  targetCtx.clearRect(0,0,128,128);
  targetCtx.imageSmoothingEnabled=false;
  targetCtx.drawImage(off,0,0);
  targetCtx.restore();
}
async function refreshAnimationCache(){
  const token=++animationCacheToken;
  const r=await ensureRenderer();
  const manifest=animationManifest||r.animationManifest;
  const next={idle:[],walk:[]};
  for(const mode of ['idle','walk']){
    const frames=manifest?.frameSets?.[mode]?.frames||[];
    for(const frame of frames){
      const off=document.createElement('canvas');
      off.width=128;off.height=128;
      const offCtx=off.getContext('2d',{alpha:true});
      offCtx.imageSmoothingEnabled=false;
      await r.renderTo(offCtx,rendererConfig(state,'static'),frame,extraParts);
      next[mode].push(off.toDataURL('image/png'));
    }
  }
  if(token===animationCacheToken)animationFrames=next;
}
function previewData(){try{return canvas.toDataURL('image/png');}catch(_){return '';}}
function publish(showToast=false){
  try{
    localStorage.setItem(STATE_KEY,JSON.stringify({version:2,...state}));
    const data=previewData();
    if(data){
      localStorage.setItem(PREVIEW_KEY,data);
      localStorage.setItem(PREVIEW_VERSION_KEY,PREVIEW_VERSION);
    }
    window.parent?.postMessage({type:'kidscade-avatar-change',source:'pixel-v2-rig',state:{...state}},location.origin);
    if(showToast)flash('캐릭터를 저장했어요!');
  }catch(_){}
}
async function renderAndPublish(showToast=false){
  await drawTo(ctx);
  updateSummary();
  await refreshAnimationCache().catch(()=>{});
  publish(showToast);
}
function updateSummary(){
  const style=state.hairSet==='female'?'긴 스타일':'짧은 스타일';
  styleSummary.textContent=`${style} ${state.hair} · ${state.upper?'파란 후드':'기본 상의'} · ${state.lower?'데님 팬츠':'기본 하의'} · 눈 ${state.eyes} · 입 ${state.mouths}`;
}
function flash(text){
  toast.textContent=text;
  toast.classList.add('show');
  clearTimeout(flash.t);
  flash.t=setTimeout(()=>toast.classList.remove('show'),1400);
}
function optionButton(label,index,active,thumbHTML,attrs=''){
  return `<button type="button" class="option${active?' active':''}" ${attrs} aria-label="${label} ${index}">${thumbHTML}<span class="num">${index}</span></button>`;
}
function hairThumb(set,n){
  return `<span class="hair-thumb">
    <img class="back" alt="" src="${hairPath('back',set,n)}">
    <img class="base" alt="" src="${BASE}">
    <img class="front" alt="" src="${hairPath('front',set,n)}">
  </span>`;
}
function clothesThumb(path){
  return `<span class="hair-thumb"><img class="base" alt="" src="${BASE}">${path?`<img class="front" alt="" src="${path}">`:''}</span>`;
}
function upperThumb(n){return clothesThumb(upperPath(n));}
function lowerThumb(n){return clothesThumb(lowerPath(n));}
function partThumb(type,n){
  if(type==='blush'&&n===0)return '<span class="part-thumb" style="font-size:1.8rem">×</span>';
  return `<span class="part-thumb"><img alt="" src="${facePath(type,n)}"></span>`;
}
function renderOptions(){
  if(currentTab==='hair'){
    hairFilter.hidden=false;
    pickerTitle.textContent='헤어스타일';
    const sets=hairFilterValue==='all'?['male','female']:[hairFilterValue];
    const items=[];
    sets.forEach(set=>{
      for(let n=1;n<=24;n++){
        items.push(optionButton('헤어',n,state.hairSet===set&&state.hair===n,hairThumb(set,n),`data-kind="hair" data-set="${set}" data-index="${n}"`));
      }
    });
    optionGrid.innerHTML=items.join('');
    pickerCount.textContent=items.length+'가지';
    return;
  }
  hairFilter.hidden=true;
  if(currentTab==='upper'){
    pickerTitle.textContent='상의';
    const items=[
      optionButton('기본 상의',0,state.upper===0,upperThumb(0),'data-kind="upper" data-index="0"'),
      optionButton('파란 별 집업 후드',1,state.upper===1,upperThumb(1),'data-kind="upper" data-index="1"')
    ];
    optionGrid.innerHTML=items.join('');
    pickerCount.textContent='2가지';
    return;
  }
  if(currentTab==='lower'){
    pickerTitle.textContent='하의';
    const items=[
      optionButton('기본 하의',0,state.lower===0,lowerThumb(0),'data-kind="lower" data-index="0"'),
      optionButton('커프 데님 팬츠',1,state.lower===1,lowerThumb(1),'data-kind="lower" data-index="1"')
    ];
    optionGrid.innerHTML=items.join('');
    pickerCount.textContent='2가지';
    return;
  }
  pickerTitle.textContent=labels[currentTab];
  const max=COUNTS[currentTab];
  const start=currentTab==='blush'?0:1;
  const items=[];
  for(let n=start;n<=max;n++){
    const shown=n===0?'없음':n;
    items.push(optionButton(labels[currentTab],shown,state[currentTab]===n,partThumb(currentTab,n),`data-kind="${currentTab}" data-index="${n}"`));
  }
  optionGrid.innerHTML=items.join('');
  pickerCount.textContent=items.length+'가지';
}
function selectTab(tab){
  currentTab=tab;
  tabs.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  renderOptions();
}
tabs.addEventListener('click',e=>{
  const b=e.target.closest('.tab');
  if(b)selectTab(b.dataset.tab);
});
hairFilter.addEventListener('click',e=>{
  const b=e.target.closest('.filter');
  if(!b)return;
  hairFilterValue=b.dataset.hairSet;
  hairFilter.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));
  renderOptions();
});
optionGrid.addEventListener('click',async e=>{
  const b=e.target.closest('.option');
  if(!b)return;
  const kind=b.dataset.kind;
  const n=parseInt(b.dataset.index,10);
  if(kind==='hair'){
    state.hairSet=b.dataset.set==='female'?'female':'male';
    state.hair=clampInt(n,1,24,1);
  }else{
    state[kind]=n;
  }
  renderOptions();
  await renderAndPublish(false);
});
document.getElementById('randomBtn').addEventListener('click',async()=>{
  state.hairSet=Math.random()<.5?'male':'female';
  state.hair=1+Math.floor(Math.random()*24);
  state.upper=Math.random()<.78?1:0;
  state.lower=Math.random()<.78?1:0;
  state.eyes=1+Math.floor(Math.random()*8);
  state.eyebrows=1+Math.floor(Math.random()*6);
  state.noses=1+Math.floor(Math.random()*4);
  state.mouths=1+Math.floor(Math.random()*8);
  state.blush=Math.floor(Math.random()*5);
  renderOptions();
  await renderAndPublish(false);
  flash('새 조합을 만들었어요!');
});
document.getElementById('resetBtn').addEventListener('click',async()=>{
  state={...DEFAULT};
  hairFilterValue='all';
  extraParts=[];
  hairFilter.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.hairSet==='all'));
  selectTab('hair');
  await renderAndPublish(false);
  flash('기본 코디로 돌아왔어요.');
});
document.getElementById('saveBtn').addEventListener('click',()=>publish(true));

function previewFrame(mode='idle',time=0){
  const key=mode==='walk'?'walk':'idle';
  const frames=animationFrames[key];
  if(!frames?.length)return previewData();
  const fps=animationManifest?.frameSets?.[key]?.fps||(key==='walk'?6:3);
  const t=Number.isFinite(Number(time))?Math.max(0,Number(time)):performance.now()/1000;
  const index=Math.floor(t*fps)%frames.length;
  return frames[index]||previewData();
}

window.KidscadeAvatarShop={
  version:'pixel-v2-rig-hairfit-3',
  stateKey:STATE_KEY,
  getPreviewDataURL:()=>previewData(),
  renderPreviewFrame:(mode='idle',time=0)=>previewFrame(mode,time),
  getRig:()=>renderer?.rig||null,
  getExtraParts:()=>extraParts.map(part=>({...part})),
  async setExtraParts(parts){
    extraParts=Array.isArray(parts)?parts.filter(Boolean):[];
    await renderAndPublish(false);
    return true;
  },
  setSeeds(value){
    seeds=Math.max(0,parseInt(value,10)||0);
    seedBadge.hidden=false;
    seedBadge.textContent='씨앗 '+seeds.toLocaleString('ko-KR');
  },
  getState:()=>({...state}),
  async setState(next){
    if(!next||typeof next!=='object')return false;
    state=loadStateFromObject({...state,...next});
    renderOptions();
    await renderAndPublish(false);
    return true;
  }
};

(async function boot(){
  await ensureRenderer();
  renderOptions();
  await renderAndPublish(false);
  document.body.dataset.avatarReady='1';
  window.parent?.postMessage({type:'kidscade-avatar-ready',source:'pixel-v2-rig'},location.origin);
})().catch(err=>{
  console.error(err);
  document.body.dataset.avatarReady='error';
  flash('아바타를 불러오지 못했어요.');
});
})();