(()=>{
'use strict';

const ROOT='assets/game/characters/kidscade-avatar-v1/runtime';
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const STATE_KEY='kidscade-pixel-avatar-v1';
const BASE=ROOT+'/base/master-base-128.png';
const COUNTS={eyes:8,eyebrows:6,noses:4,mouths:8,blush:4};
const DEFAULT={hairSet:'male',hair:1,lower:0,eyes:1,eyebrows:1,noses:1,mouths:1,blush:0};
const labels={hair:'헤어스타일',lower:'하의',eyes:'눈',eyebrows:'눈썹',noses:'코',mouths:'입',blush:'볼터치'};
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
const cache=new Map();

function clampInt(v,min,max,fallback){
  const n=parseInt(v,10);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem(STATE_KEY)||'null')||{};
    return {
      hairSet:raw.hairSet==='female'?'female':'male',
      hair:clampInt(raw.hair,1,24,1),
      lower:clampInt(raw.lower,0,1,0),
      eyes:clampInt(raw.eyes,1,8,1),
      eyebrows:clampInt(raw.eyebrows,1,6,1),
      noses:clampInt(raw.noses,1,4,1),
      mouths:clampInt(raw.mouths,1,8,1),
      blush:clampInt(raw.blush,0,4,0)
    };
  }catch(_){return {...DEFAULT};}
}
let state=loadState();

function pad(n){return String(n).padStart(2,'0');}
function hairPath(layer,set,n){return `${ROOT}/hair/${layer}/${set}/hair-${layer}-${set}-${pad(n)}.png`;}
function lowerPath(n){return n===1?`${ROOT}/clothes/lower/denim-cuffed-jeans-01/static.png`:'';}
function facePath(type,n){
  if(!n)return '';
  return `${ROOT}/face/${folders[type]}/${prefixes[type]}-${pad(n)}.png`;
}
function img(src){
  if(!src)return Promise.resolve(null);
  if(cache.has(src))return cache.get(src);
  const p=new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>resolve(im);
    im.onerror=()=>reject(new Error('asset failed: '+src));
    im.src=src;
  });
  cache.set(src,p);
  return p;
}
async function drawTo(targetCtx,targetState=state){
  const my=++renderToken;
  const layers=[
    hairPath('back',targetState.hairSet,targetState.hair),
    BASE,
    lowerPath(targetState.lower),
    facePath('blush',targetState.blush),
    facePath('eyes',targetState.eyes),
    facePath('eyebrows',targetState.eyebrows),
    facePath('noses',targetState.noses),
    facePath('mouths',targetState.mouths),
    hairPath('front',targetState.hairSet,targetState.hair)
  ].filter(Boolean);
  const images=await Promise.all(layers.map(src=>img(src).catch(()=>null)));
  if(targetCtx===ctx && my!==renderToken)return;
  targetCtx.clearRect(0,0,128,128);
  targetCtx.imageSmoothingEnabled=false;
  images.forEach(im=>{if(im)targetCtx.drawImage(im,0,0,128,128);});
}
function previewData(){try{return canvas.toDataURL('image/png');}catch(_){return '';}}
function publish(showToast=false){
  try{
    localStorage.setItem(STATE_KEY,JSON.stringify(state));
    const data=previewData();
    if(data)localStorage.setItem(PREVIEW_KEY,data);
    window.parent?.postMessage({type:'kidscade-avatar-change',source:'pixel-v1',state:{...state}},location.origin);
    if(showToast)flash('캐릭터를 저장했어요!');
  }catch(_){}
}
async function renderAndPublish(showToast=false){
  await drawTo(ctx);
  updateSummary();
  publish(showToast);
}
function updateSummary(){
  const style=state.hairSet==='female'?'긴 스타일':'짧은 스타일';
  styleSummary.textContent=`${style} ${state.hair} · ${state.lower?'데님 팬츠':'기본 하의'} · 눈 ${state.eyes} · 입 ${state.mouths}`;
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
function lowerThumb(n){
  const overlay=lowerPath(n);
  return `<span class="hair-thumb"><img class="base" alt="" src="${BASE}">${overlay?`<img class="front" alt="" src="${overlay}">`:''}</span>`;
}
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
  if(currentTab==='lower'){
    pickerTitle.textContent='하의';
    const items=[
      optionButton('기본 하의',0,state.lower===0,lowerThumb(0),`data-kind="lower" data-index="0"`),
      optionButton('커프 데님 팬츠',1,state.lower===1,lowerThumb(1),`data-kind="lower" data-index="1"`)
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
  state.lower=Math.random()<.5?0:1;
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
  hairFilter.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.hairSet==='all'));
  selectTab('hair');
  await renderAndPublish(false);
  flash('처음 모습으로 돌아왔어요.');
});
document.getElementById('saveBtn').addEventListener('click',()=>publish(true));

window.KidscadeAvatarShop={
  getPreviewDataURL:()=>previewData(),
  renderPreviewFrame:()=>previewData(),
  setSeeds(value){
    seeds=Math.max(0,parseInt(value,10)||0);
    seedBadge.hidden=false;
    seedBadge.textContent='씨앗 '+seeds.toLocaleString('ko-KR');
  },
  getState:()=>({...state}),
  async setState(next){
    if(!next||typeof next!=='object')return false;
    state={...state,...next};
    state=loadStateFromObject(state);
    renderOptions();
    await renderAndPublish(false);
    return true;
  }
};
function loadStateFromObject(raw){
  return {
    hairSet:raw.hairSet==='female'?'female':'male',
    hair:clampInt(raw.hair,1,24,1),
    lower:clampInt(raw.lower,0,1,0),
    eyes:clampInt(raw.eyes,1,8,1),
    eyebrows:clampInt(raw.eyebrows,1,6,1),
    noses:clampInt(raw.noses,1,4,1),
    mouths:clampInt(raw.mouths,1,8,1),
    blush:clampInt(raw.blush,0,4,0)
  };
}

(async function boot(){
  renderOptions();
  await renderAndPublish(false);
  document.body.dataset.avatarReady='1';
  window.parent?.postMessage({type:'kidscade-avatar-ready',source:'pixel-v1'},location.origin);
})();
})();