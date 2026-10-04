(()=> {
'use strict';

const PREVIEW_KEY='kidscade-avatar-studio-preview';
const PREVIEW_VERSION_KEY='kidscade-avatar-studio-preview-version';
const PREVIEW_VERSION='school-avatar-v3-23f-1';
const STATE_KEY='kidscade-avatar-v3';
const PRESET_ID='school-starter-01';
const PARTS=[
  {slot:'hair',id:'basic-tousled-hair-01',label:'더벅머리',icon:'💇'},
  {slot:'eyes',id:'basic-eyes-01',label:'기본 눈',icon:'👀'},
  {slot:'mouth',id:'basic-flat-mouth-01',label:'ㅡ 입',icon:'🙂'},
  {slot:'earring',id:'copper-ring-earring-01',label:'구리 링 귀걸이',icon:'🟠'},
  {slot:'upper',id:'basic-school-uniform-upper-01',label:'교복 상의',icon:'👕'},
  {slot:'lower',id:'basic-school-uniform-lower-01',label:'교복 하의',icon:'👖'},
  {slot:'shoes',id:'basic-sneakers-01',label:'운동화',icon:'👟'},
  {slot:'weapon',id:'school-ruler-01',label:'자',icon:'📏'},
  {slot:'shield',id:'school-textbook-01',label:'교과서',icon:'📘'}
];
const PART_MAP=Object.fromEntries(PARTS.map(part=>[part.slot,part]));
const DEFAULT_STATE=Object.freeze({
  version:3,
  preset:PRESET_ID,
  assetIds:Object.fromEntries(PARTS.map(part=>[part.slot,part.id]))
});

const canvas=document.getElementById('avatarCanvas');
const styleSummary=document.getElementById('styleSummary');
const optionGrid=document.getElementById('optionGrid');
const tabs=document.getElementById('tabs');
const pickerTitle=document.getElementById('pickerTitle');
const pickerCount=document.getElementById('pickerCount');
const toast=document.getElementById('toast');
const seedBadge=document.getElementById('seedBadge');
const motionControls=document.getElementById('motionControls');
let currentTab='hair';
let previewMode='static';
let previewRaf=0;
let previewStartedAt=0;
let seeds=0;
let avatar=null;
let manifest=null;
let frameCache=[];

function safeJson(raw){try{return raw?JSON.parse(raw):null}catch(_){return null}}
function loadState(){
  const stored=safeJson(localStorage.getItem(STATE_KEY));
  return stored?.preset===PRESET_ID?{...DEFAULT_STATE,...stored,assetIds:{...DEFAULT_STATE.assetIds,...(stored.assetIds||{})}}:{...DEFAULT_STATE,assetIds:{...DEFAULT_STATE.assetIds}};
}
let state=loadState();

function flash(text){
  if(!toast)return;
  toast.textContent=text;
  toast.classList.add('show');
  clearTimeout(flash.timer);
  flash.timer=setTimeout(()=>toast.classList.remove('show'),1400);
}
function previewData(){
  try{return frameCache[0]||canvas.toDataURL('image/png')}catch(_){return ''}
}
function publish(showToast=false){
  try{
    localStorage.setItem(STATE_KEY,JSON.stringify(state));
    const data=previewData();
    if(data){
      localStorage.setItem(PREVIEW_KEY,data);
      localStorage.setItem(PREVIEW_VERSION_KEY,PREVIEW_VERSION);
    }
    window.parent?.postMessage({type:'kidscade-avatar-change',source:'school-avatar-v3',state:{...state}},location.origin);
    if(showToast)flash('캐릭터를 저장했어요!');
  }catch(_){}
}
function cacheFrames(){
  if(!avatar||!manifest)return;
  frameCache=manifest.frameOrder.map((_,index)=>{
    const off=document.createElement('canvas');
    off.width=128;off.height=128;
    const ctx=off.getContext('2d',{alpha:true});
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(avatar.sheet,index*128,0,128,128,0,0,128,128);
    return off.toDataURL('image/png');
  });
}
function normalizedMode(mode){
  return window.KidscadeSchoolAvatarV3.normalizeMode(mode==='static'?'stand':mode);
}
function frameRecord(mode,timeSec=0){
  return window.KidscadeSchoolAvatarV3.frameAt(manifest,normalizedMode(mode),timeSec,true);
}
function renderPreviewFrame(mode='idle',time=0){
  if(!manifest||!frameCache.length)return previewData();
  const record=frameRecord(mode,time);
  return frameCache[record.index]||previewData();
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
}
function startPreviewMode(mode='static'){
  const allowed=['static','stand','walk','jump','attack','hurt','dead','sit','pickup'];
  previewMode=allowed.includes(mode)?mode:'static';
  stopPreview();
  previewStartedAt=performance.now();
  syncMotionButtons();
  if(!avatar)return;
  if(previewMode==='static'){
    avatar.draw('stand',0,true);
    return;
  }
  const tick=now=>{
    previewRaf=0;
    const elapsed=Math.max(0,(now-previewStartedAt)/1000);
    avatar.draw(normalizedMode(previewMode),elapsed,true);
    previewRaf=requestAnimationFrame(tick);
  };
  previewRaf=requestAnimationFrame(tick);
}
function updateSummary(){
  if(styleSummary)styleSummary.textContent='학교 탐험가 기본 세트 · 9종 파츠 · 23프레임';
}
function renderOptions(){
  const part=PART_MAP[currentTab]||PARTS[0];
  pickerTitle.textContent=part.label;
  pickerCount.textContent='기본 제공 1종';
  optionGrid.innerHTML=`
    <button type="button" class="option active" aria-pressed="true" data-kind="${part.slot}">
      <span class="part-thumb" style="font-size:2rem">${part.icon}</span>
      <span class="num">기본</span>
    </button>
    <div class="tip-card" style="grid-column:1/-1;margin-top:8px">
      <strong>${part.label}</strong>
      <span>새 v3 캐릭터의 등록 파츠입니다. 추가 파츠가 승인되면 이 목록에 자동으로 늘어납니다.</span>
    </div>`;
}
function selectTab(tab){
  currentTab=PART_MAP[tab]?tab:'hair';
  tabs.querySelectorAll('.tab').forEach(button=>button.classList.toggle('active',button.dataset.tab===currentTab));
  renderOptions();
}

tabs?.addEventListener('click',event=>{
  const button=event.target.closest('.tab');
  if(button)selectTab(button.dataset.tab);
});
motionControls?.addEventListener('click',event=>{
  const button=event.target.closest('[data-motion]');
  if(button)startPreviewMode(button.dataset.motion);
});
document.getElementById('resetBtn')?.addEventListener('click',()=>{
  state={...DEFAULT_STATE,assetIds:{...DEFAULT_STATE.assetIds}};
  selectTab('hair');
  startPreviewMode('static');
  publish(false);
  flash('기본 캐릭터로 돌아왔어요.');
});
document.getElementById('saveBtn')?.addEventListener('click',()=>publish(true));

window.KidscadeAvatarShop={
  version:PREVIEW_VERSION,
  stateKey:STATE_KEY,
  getPreviewDataURL:()=>previewData(),
  renderPreviewFrame,
  getPreviewMode:()=>previewMode,
  setPreviewMode:startPreviewMode,
  getRig:()=>manifest?{version:3,canvas:manifest.canvas,root:manifest.root,groundY:manifest.groundY,frameOrder:[...manifest.frameOrder],animations:manifest.animations}:null,
  getExtraParts:()=>[],
  async setExtraParts(){return false},
  setSeeds(value){
    seeds=Math.max(0,parseInt(value,10)||0);
    if(seedBadge){
      seedBadge.hidden=false;
      seedBadge.textContent='씨앗 '+seeds.toLocaleString('ko-KR');
    }
  },
  getState:()=>({...state,assetIds:{...state.assetIds}}),
  async setState(next){
    if(!next||typeof next!=='object')return false;
    state={...DEFAULT_STATE,...next,preset:PRESET_ID,assetIds:{...DEFAULT_STATE.assetIds,...(next.assetIds||{})}};
    publish(false);
    return true;
  }
};

(async function boot(){
  const runtime=window.KidscadeSchoolAvatarV3;
  if(!runtime?.create)throw new Error('KIDSCADE Avatar v3 runtime is missing.');
  avatar=await runtime.create(canvas,{playing:false,mode:'stand'});
  manifest=avatar.manifest;
  cacheFrames();
  updateSummary();
  selectTab('hair');
  startPreviewMode('static');
  publish(false);
  document.body.dataset.avatarReady='1';
  window.parent?.postMessage({type:'kidscade-avatar-ready',source:'school-avatar-v3'},location.origin);
})().catch(error=>{
  console.error(error);
  document.body.dataset.avatarReady='error';
  flash('아바타를 불러오지 못했어요.');
});
})();