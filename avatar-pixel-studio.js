(()=>{'use strict';

const ROOT='assets/game/characters/kidscade-avatar-v3/school-starter';
const MANIFEST_URL=ROOT+'/manifest.json';
const SHEET_URL=ROOT+'/school-starter-sheet.png';
const SCHOOL_PACK_URL=ROOT+'/school-starter.json';
const DEFAULT_IMAGE=ROOT+'/guest-default.png';
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const PREVIEW_VERSION_KEY='kidscade-avatar-studio-preview-version';
const PREVIEW_VERSION='pixel-v3-school-starter-29';
const STATE_KEY='kidscade-avatar-v3';
const SIZE=128;
const SKIN_PRESETS=['#f6d2b8','#eac09d','#d99d73','#b97852','#8a563a','#5d3828'];
const PARTS={
  skin:{label:'피부',name:'피부색',assetKey:null},
  hair:{label:'헤어',name:'더벅머리',assetKey:'hair'},
  hairColor:{label:'염색',name:'브라운',assetKey:null},
  eyes:{label:'눈',name:'기본 눈',assetKey:'eyes'},
  mask:{label:'얼굴 장식',name:'착용 안 함',assetKey:'mask'},
  hat:{label:'머리 장식',name:'착용 안 함',assetKey:'hat'},
  mouth:{label:'입',name:'ㅡ 입',assetKey:'mouth'},
  back:{label:'등 장식',name:'착용 안 함',assetKey:'back'},
  earring:{label:'귀걸이',name:'구리 링 귀걸이',assetKey:'earring'},
  upper:{label:'상의',name:'학교 교복 상의',assetKey:'upper'},
  lower:{label:'하의',name:'학교 교복 하의',assetKey:'lower'},
  shoes:{label:'신발',name:'기본 운동화',assetKey:'shoes'},
  effect:{label:'이펙트',name:'없음',assetKey:'effect'},
  weapon:{label:'도구',name:'자',assetKey:'weaponFront'},
  shield:{label:'교구',name:'교과서',assetKey:'shieldFront'}
};

const canvas=document.getElementById('avatarCanvas');
const ctx=canvas.getContext('2d',{alpha:true});
ctx.imageSmoothingEnabled=false;
const tabs=document.getElementById('tabs');
const tabPrevBtn=document.getElementById('tabPrevBtn');
const tabNextBtn=document.getElementById('tabNextBtn');
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
let hairCatalog=null;
let hairColorCatalog=null;
const hairParts=new Map();
const hairSourceCache=new Map();
const hairFrameCache=new Map();
const hairMaskSourceCache=new Map();
const hairMaskCoordCache=new Map();
let hairProtectedKeys=new Set();
let upperCatalog=null;
const upperParts=new Map();
let lowerCatalog=null;
const lowerParts=new Map();
let currentTab='skin';
let previewMode='stand';
let previewStartedAt=0;
let previewRaf=0;
let lastFrameIndex=-1;
let seeds=Math.max(0,parseInt(localStorage.getItem('kidscade_coins')||'0',10)||0);
let skinPalette=[];
const frameSkinPalettes=new Map();
const skinRemapCache=new Map();
let skinBaseHex='#fce2d2';
const economy=window.KidscadeAvatarEconomy;
let state={version:3,setId:'school-starter-01',skinColor:null,hairColorId:'brown',economyVersion:0,avatarPurchaseCount:0,ownedAssets:{}};

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
    if(saved&&saved.version===3&&saved.setId)return {
      ...state,
      ...saved,
      skinColor:normalizeHexColor(saved.skinColor),
      ownedAssets:economy?.normalizeOwned(saved.ownedAssets)||{},
      avatarPurchaseCount:economy?.normalizePurchaseCount(saved.avatarPurchaseCount)||0,
      economyVersion:Math.max(0,Math.trunc(Number(saved.economyVersion)||0))
    };
  }catch(_){}
  return {...state};
}
state=loadState();

function normalizeShopState(){
  state.ownedAssets=economy?.normalizeOwned(state.ownedAssets)||{};
  state.avatarPurchaseCount=economy?.normalizePurchaseCount(state.avatarPurchaseCount)||0;
  state.economyVersion=Math.max(0,Math.trunc(Number(state.economyVersion)||0));
}
function shopDefaultId(category){
  if(category==='hair')return hairCatalog?.defaultId||'';
  if(category==='hairColor')return hairColorCatalog?.defaultId||'brown';
  if(category==='eyes')return eyeCatalog?.defaultId||'';
  if(category==='upper')return upperCatalog?.defaultId||'';
  if(category==='lower')return lowerCatalog?.defaultId||'';
  if(category==='earring')return earringCatalog?.defaultId||'';
  if(category==='shoes')return shoeCatalog?.defaultId||'';
  if(category==='effect')return effectCatalog?.defaultId||'no-effect';
  if(category==='weapon')return toolCatalog?.defaultId||'';
  if(category==='shield')return teachingAidCatalog?.defaultId||'';
  return wardrobe?.category(category)?.defaultId||'';
}
function shopSelectedId(category){
  if(category==='hair')return selectedHairId();
  if(category==='hairColor')return selectedHairColorId();
  if(category==='eyes')return selectedEyeId();
  if(category==='upper')return selectedUpperId();
  if(category==='lower')return selectedLowerId();
  if(category==='earring')return selectedEarringId();
  if(category==='shoes')return selectedShoeId();
  if(category==='effect')return selectedEffectId();
  if(category==='weapon')return selectedToolId();
  if(category==='shield')return selectedTeachingAidId();
  return wardrobe?.normalize(state.assetIds)?.[category]||'';
}
function migrateAvatarEconomy(){
  normalizeShopState();
  if(state.economyVersion>=1)return false;
  for(const category of ['hair','hairColor','eyes','mask','hat','mouth','back','earring','upper','lower','shoes','effect','weapon','shield']){
    const id=shopSelectedId(category),defaultId=shopDefaultId(category);
    if(id&&defaultId&&id!==defaultId)state.ownedAssets=economy.addOwned(state.ownedAssets,category,id,defaultId);
  }
  state.economyVersion=1;
  return true;
}
function shopQuote(category,id,defaultId=shopDefaultId(category)){
  if(!economy)return {category,id,defaultId,free:id===defaultId,owned:id===defaultId,price:0};
  return economy.quote(state.ownedAssets,state.avatarPurchaseCount,category,id,defaultId);
}
function shopButtonDescriptor(button){
  const d=button?.dataset||{};
  if(d.wardrobeCategory&&d.wardrobeId)return [d.wardrobeCategory,d.wardrobeId,shopDefaultId(d.wardrobeCategory)];
  if(d.hairId)return ['hair',d.hairId,shopDefaultId('hair')];
  if(d.hairColorId)return ['hairColor',d.hairColorId,shopDefaultId('hairColor')];
  if(d.eyeId)return ['eyes',d.eyeId,shopDefaultId('eyes')];
  if(d.upperId)return ['upper',d.upperId,shopDefaultId('upper')];
  if(d.lowerId)return ['lower',d.lowerId,shopDefaultId('lower')];
  if(d.earringId)return ['earring',d.earringId,shopDefaultId('earring')];
  if(d.shoesId)return ['shoes',d.shoesId,shopDefaultId('shoes')];
  if(d.effectId)return ['effect',d.effectId,shopDefaultId('effect')];
  if(d.weaponId)return ['weapon',d.weaponId,shopDefaultId('weapon')];
  if(d.shieldId)return ['shield',d.shieldId,shopDefaultId('shield')];
  return null;
}
function decorateShopButtons(){
  if(!optionGrid||!economy)return;
  for(const button of optionGrid.querySelectorAll('.option')){
    const info=shopButtonDescriptor(button);
    button.querySelector(':scope > .shop-badge')?.remove();
    button.classList.remove('locked-shop','owned-shop','free-shop');
    if(!info)continue;
    const quote=shopQuote(...info),badge=document.createElement('span');
    badge.className='shop-badge '+(quote.free?'free':quote.owned?'owned':'locked');
    badge.textContent=quote.free?'기본':quote.owned?'보유':'🌱 '+quote.price.toLocaleString('ko-KR');
    button.classList.add(quote.free?'free-shop':quote.owned?'owned-shop':'locked-shop');
    button.appendChild(badge);
  }
}
function updateSeedBadge(){
  if(!seedBadge)return;
  seedBadge.hidden=false;
  const next=economy?.nextPrice(state.avatarPurchaseCount)||1300;
  seedBadge.textContent='씨앗 '+seeds.toLocaleString('ko-KR')+' · 다음 '+next.toLocaleString('ko-KR');
}
let purchaseRequestSeq=0;
const pendingPurchaseRequests=new Map();
function directSeedSpend(amount,reason){
  const price=Math.max(0,Math.trunc(Number(amount)||0)),before=Math.max(0,parseInt(localStorage.getItem('kidscade_coins')||String(seeds),10)||0);
  if(before<price)return {ok:false,balance:before,error:'insufficient-balance'};
  const balance=before-price;
  localStorage.setItem('kidscade_coins',String(balance));
  try{window.dispatchEvent(new CustomEvent('kidscade-seeds-change',{detail:{balance,delta:-price,reason,source:'avatar-studio'}}))}catch(_){}
  return {ok:true,balance};
}
function requestSeedSpend(amount,reason){
  const price=Math.max(0,Math.trunc(Number(amount)||0));
  if(window.parent===window)return Promise.resolve(directSeedSpend(price,reason));
  return new Promise(resolve=>{
    const requestId='avatar-'+Date.now()+'-'+(++purchaseRequestSeq);
    const timer=setTimeout(()=>{pendingPurchaseRequests.delete(requestId);resolve({ok:false,balance:seeds,error:'wallet-timeout'})},2500);
    pendingPurchaseRequests.set(requestId,result=>{clearTimeout(timer);resolve(result)});
    window.parent.postMessage({type:'kidscade-avatar-purchase-request',requestId,amount:price,reason},location.origin);
  });
}
window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.data?.type!=='kidscade-avatar-purchase-result')return;
  const requestId=String(event.data.requestId||''),resolve=pendingPurchaseRequests.get(requestId);
  if(!resolve)return;
  pendingPurchaseRequests.delete(requestId);
  const balance=Math.max(0,Math.trunc(Number(event.data.balance)||0));
  seeds=balance;updateSeedBadge();
  resolve({ok:Boolean(event.data.ok),balance,error:event.data.error||''});
});
const purchaseLocks=new Map();
async function ensureAssetAccess(category,id,defaultId,label){
  const key=String(category||'')+':'+String(id||'');
  if(purchaseLocks.has(key))return purchaseLocks.get(key);
  const task=(async()=>{
    const quote=shopQuote(category,id,defaultId);
    if(quote.owned)return {ok:true,purchased:false,price:0};
    if(seeds<quote.price){flash('씨앗이 부족해요! · 필요 '+quote.price.toLocaleString('ko-KR'));return {ok:false,purchased:false,price:quote.price}}
    const result=await requestSeedSpend(quote.price,'아바타 '+String(label||id)+' 구매');
    if(!result?.ok){
      if(Number.isFinite(Number(result?.balance)))seeds=Math.max(0,Number(result.balance));
      updateSeedBadge();
      flash(result?.error==='insufficient-balance'?'씨앗이 부족해요!':'구매를 완료하지 못했어요.');
      return {ok:false,purchased:false,price:quote.price};
    }
    seeds=Math.max(0,Number(result.balance)||0);
    state.ownedAssets=economy.addOwned(state.ownedAssets,category,id,defaultId);
    state.avatarPurchaseCount=economy.normalizePurchaseCount(state.avatarPurchaseCount)+1;
    state.economyVersion=1;
    updateSeedBadge();
    publish(false);
    decorateShopButtons();
    return {ok:true,purchased:true,price:quote.price};
  })();
  purchaseLocks.set(key,task);
  try{return await task}finally{purchaseLocks.delete(key)}
}
function assetApplyMessage(access,label,suffix='적용했어요!'){
  return access?.purchased?label+' 구매·적용! · 🌱 '+access.price.toLocaleString('ko-KR'):label+' '+suffix;
}
const optionShopObserver=new MutationObserver(()=>decorateShopButtons());
optionShopObserver.observe(optionGrid,{childList:true});

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
    img.src=SHEET_URL+'?v=quality-2';
  });
}

const BODY_SOURCE_FILES=[
  'ChatGPT 이미지 2026년 10월 3일 오후 08_59_08-1.png',
  'ChatGPT 이미지 2026년 10월 3일 오후 08_59_09-2.png',
  'ChatGPT 이미지 2026년 10월 3일 오후 08_59_10-3.png',
  'ChatGPT 이미지 2026년 10월 3일 오후 08_59_11-4.png',
  'ChatGPT 이미지 2026년 10월 3일 오후 08_59_12-5.png',
  'ChatGPT 이미지 2026년 10월 3일 오후 08_59_13-6.png',
  'ChatGPT 이미지 2026년 10월 3일 오후 08_59_14-7.png'
];
const BODY_SOURCE_FRAME_IDS=['stand-01','stand-02','walk-01','walk-02','walk-03','walk-04','jump-01'];
const BODY_SOURCE_RESOLUTION=64;
const BODY_SOURCE_PALETTE=12;
const BODY_DERIVED_POSES={
  'attack-01':{type:'transform',source:'stand-01'},
  'attack-02':{type:'transform',source:'stand-02',dx:2,angle:3,pivot:[64,118]},
  'attack-03':{type:'attackMix',source:'stand-01',armSource:'jump-01'},
  'attack-04':{type:'attackMix',source:'stand-01',armSource:'jump-01',dx:-5,angle:-4,pivot:[64,118]},
  'attack-05':{type:'transform',source:'stand-02',dx:-1,angle:-2,pivot:[64,118]},
  'hurt-01':{type:'transform',source:'stand-01',dx:2,angle:6,pivot:[64,118]},
  'hurt-02':{type:'transform',source:'stand-01',dx:4,angle:11,scaleY:.98,pivot:[64,118]},
  'dead-01':{type:'transform',source:'stand-01',dx:-4,angle:15,pivot:[64,116]},
  'dead-02':{type:'transform',source:'stand-01',dx:-14,angle:35,pivot:[64,116]},
  'dead-03':{type:'transform',source:'stand-01',dx:-30,angle:60,pivot:[64,116]},
  'dead-04':{type:'transform',source:'stand-01',dx:-44,angle:90,pivot:[64,116]},
  'sit-01':{type:'sitMix',source:'stand-01',legSource:'jump-01',down:7},
  'sit-02':{type:'sitMix',source:'stand-02',legSource:'jump-01',down:12},
  'pickup-01':{type:'transform',source:'stand-01',dx:-1,angle:-7,pivot:[64,110]},
  'pickup-02':{type:'transform',source:'stand-01',dx:-4,dy:4,angle:-15,scaleY:.94,pivot:[64,112]},
  'pickup-03':{type:'transform',source:'stand-02',dx:-2,angle:-7,pivot:[64,110]}
};
const bodyFrameCanvases=new Map();

function bodyCanvas(){
  const c=document.createElement('canvas');c.width=SIZE;c.height=SIZE;
  const x=c.getContext('2d',{alpha:true});x.imageSmoothingEnabled=false;
  return c;
}
function bodySourceUrl(index){
  return new URL('assets/game/characters/'+BODY_SOURCE_FILES[index],document.baseURI).href;
}
function loadBodySourceImage(index){
  return new Promise((resolve,reject)=>{
    const img=new Image();img.decoding='async';
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('BODY 원본을 불러오지 못했습니다: '+BODY_SOURCE_FILES[index]));
    img.src=bodySourceUrl(index);
  });
}
function bodyHardenAlpha(cvs,cut){
  const c=cvs.getContext('2d',{alpha:true}),image=c.getImageData(0,0,SIZE,SIZE),d=image.data;
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]<cut)d[i]=d[i+1]=d[i+2]=d[i+3]=0;
    else d[i+3]=255;
  }
  c.putImageData(image,0,0);
}
function bodyQuantize(cvs,k){
  const c=cvs.getContext('2d',{alpha:true}),image=c.getImageData(0,0,SIZE,SIZE),d=image.data,colors=[];
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
  c.putImageData(image,0,0);
}
function rasterBodySource(img){
  const source=document.createElement('canvas');source.width=img.naturalWidth||img.width||1;source.height=img.naturalHeight||img.height||1;
  const sc=source.getContext('2d',{alpha:true});sc.imageSmoothingEnabled=true;sc.imageSmoothingQuality='high';sc.drawImage(img,0,0);
  const base=bodyCanvas(),bc=base.getContext('2d',{alpha:true});bc.imageSmoothingEnabled=true;bc.imageSmoothingQuality='high';bc.drawImage(source,0,0,SIZE,SIZE);
  const low=document.createElement('canvas');low.width=BODY_SOURCE_RESOLUTION;low.height=BODY_SOURCE_RESOLUTION;
  const lc=low.getContext('2d',{alpha:true});lc.imageSmoothingEnabled=true;lc.imageSmoothingQuality='high';lc.drawImage(base,0,0,BODY_SOURCE_RESOLUTION,BODY_SOURCE_RESOLUTION);
  const out=bodyCanvas(),oc=out.getContext('2d',{alpha:true});oc.imageSmoothingEnabled=false;
  oc.drawImage(low,0,0,BODY_SOURCE_RESOLUTION,BODY_SOURCE_RESOLUTION,0,0,SIZE,SIZE);
  bodyHardenAlpha(out,56);bodyQuantize(out,BODY_SOURCE_PALETTE);bodyHardenAlpha(out,1);
  return out;
}
function bodyBounds(cvs){
  const d=cvs.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data;
  let minX=SIZE,minY=SIZE,maxX=-1,maxY=-1;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(d[(y*SIZE+x)*4+3]){
    if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
  }
  return maxX>=minX?{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,maxX,maxY}:null;
}
function shiftBody(source,dx,dy){
  const out=bodyCanvas(),c=out.getContext('2d',{alpha:true});c.drawImage(source,dx,dy);return out;
}
function transformBody(target,source,spec={}){
  const c=target.getContext('2d',{alpha:true}),pivot=spec.pivot||[64,118],dx=Number(spec.dx)||0,dy=Number(spec.dy)||0;
  const angle=(Number(spec.angle)||0)*Math.PI/180,scaleX=Number.isFinite(Number(spec.scaleX))?Number(spec.scaleX):1,scaleY=Number.isFinite(Number(spec.scaleY))?Number(spec.scaleY):1;
  c.save();c.imageSmoothingEnabled=false;c.translate(pivot[0]+dx,pivot[1]+dy);c.rotate(angle);c.scale(scaleX,scaleY);c.translate(-pivot[0],-pivot[1]);c.drawImage(source,0,0);c.restore();
}
function deriveBodyFrame(frameId){
  const spec=BODY_DERIVED_POSES[frameId],out=bodyCanvas();if(!spec)return out;
  const source=bodyFrameCanvases.get(spec.source||'stand-01');if(!source)return out;
  if(spec.type==='attackMix'){
    const mixed=bodyCanvas(),m=mixed.getContext('2d',{alpha:true});m.drawImage(source,0,0);
    m.clearRect(40,72,16,30);m.clearRect(77,72,18,30);
    const arms=bodyFrameCanvases.get(spec.armSource||'jump-01')||source;
    m.drawImage(arms,39,66,20,29,39,72,20,29);m.drawImage(arms,74,66,22,29,74,72,22,29);
    transformBody(out,mixed,spec);return out;
  }
  if(spec.type==='sitMix'){
    const c=out.getContext('2d',{alpha:true}),down=Number(spec.down)||0;c.imageSmoothingEnabled=false;
    c.drawImage(source,35,20,60,81,35,20+down,60,81);
    const legs=bodyFrameCanvases.get(spec.legSource||'jump-01')||source;
    c.drawImage(legs,45,87,45,26,41,92+Math.floor(down/2),45,26);
    return out;
  }
  transformBody(out,source,spec);return out;
}
async function loadBodyFrames(){
  bodyFrameCanvases.clear();
  const raw=[];
  for(let i=0;i<BODY_SOURCE_FILES.length;i++)raw.push(rasterBodySource(await loadBodySourceImage(i)));
  const master=bodyBounds(raw[0]);if(!master)throw new Error('BODY 기준 실루엣을 찾지 못했습니다.');
  const rootX=Number(manifest?.root?.[0])||64,groundY=Number(manifest?.groundY)||118;
  const dx=Math.round(rootX-(master.x+(master.w-1)/2)),dy=groundY-master.maxY;
  for(let i=0;i<BODY_SOURCE_FRAME_IDS.length;i++)bodyFrameCanvases.set(BODY_SOURCE_FRAME_IDS[i],shiftBody(raw[i],dx,dy));
  for(const frameId of manifest?.frameOrder||[])if(!bodyFrameCanvases.has(frameId))bodyFrameCanvases.set(frameId,deriveBodyFrame(frameId));
  return bodyFrameCanvases;
}
function bodyFrameCanvas(frameId){return bodyFrameCanvases.get(frameId)||null}

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
    return {key:colorKey(r,g,b),source:hex,r,g,b,shade:Math.max(.05,Math.min(1.25,shade)),role:String(entry?.role||'')};
  }).filter(Boolean);
  if(!skinPalette.length)throw new Error('v3 피부 팔레트가 등록되지 않았습니다.');
  frameSkinPalettes.clear();
  skinRemapCache.clear();
  return skinPalette;
}
function medianNumber(values){
  if(!values.length)return 0;
  const sorted=[...values].sort((x,y)=>x-y);
  return sorted[Math.floor(sorted.length/2)];
}
function rgbDistance(a,b){
  const dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2];
  return Math.sqrt(dr*dr+dg*dg+db*db);
}
function frameImageData(frameId){
  const body=bodyFrameCanvas(frameId);
  if(body){
    const c=body.getContext('2d',{alpha:true});
    if(c)return c.getImageData(0,0,SIZE,SIZE);
  }
  const index=manifest?.frameOrder?.indexOf(frameId)??-1;
  if(index<0||!sheet)return null;
  const scratch=document.createElement('canvas');
  scratch.width=SIZE;scratch.height=SIZE;
  const c=scratch.getContext('2d',{alpha:true});
  c.imageSmoothingEnabled=false;
  c.drawImage(sheet,index*SIZE,0,SIZE,SIZE,0,0,SIZE,SIZE);
  return c.getImageData(0,0,SIZE,SIZE);
}
function discoverSourceFrameSkinPalette(frameId){
  const image=frameImageData(frameId);
  if(!image)return [];
  const data=image.data,config=manifest?.customization?.skinColor||{};
  const points=Array.isArray(config.samplePoints)&&config.samplePoints.length?config.samplePoints:(eyeCatalog?.skinSamples||[[64,56]]);
  const sampled=[];
  for(const point of points){
    const x=Math.round(Number(point?.[0])||0),y=Math.round(Number(point?.[1])||0);
    if(x<0||y<0||x>=SIZE||y>=SIZE)continue;
    const i=(y*SIZE+x)*4;
    if(data[i+3]>200)sampled.push([data[i],data[i+1],data[i+2]]);
  }
  if(!sampled.length)return [];
  const anchor=[0,1,2].map(axis=>medianNumber(sampled.map(rgb=>rgb[axis])));
  const region=config.sampleRegion||{},x0=Math.max(0,Math.round(Number(region.x)||44)),y0=Math.max(0,Math.round(Number(region.y)||42));
  const w=Math.max(1,Math.round(Number(region.w)||42)),h=Math.max(1,Math.round(Number(region.h)||30));
  const maxDistance=Math.max(1,Number(region.maxMatchDistance)||88),minCount=Math.max(1,Math.round(Number(region.minCount)||2));
  const counts=new Map();
  for(let y=y0;y<Math.min(SIZE,y0+h);y++){
    for(let x=x0;x<Math.min(SIZE,x0+w);x++){
      const i=(y*SIZE+x)*4,a=data[i+3];
      if(a<200)continue;
      const rgbaKey=[data[i],data[i+1],data[i+2],a].join(',');
      if(hairProtectedKeys.has(rgbaKey))continue;
      const key=colorKey(data[i],data[i+1],data[i+2]);
      const rec=counts.get(key)||{key,r:data[i],g:data[i+1],b:data[i+2],count:0};
      rec.count++;counts.set(key,rec);
    }
  }
  const candidates=[...counts.values()].filter(item=>item.count>=minCount);
  const baseRgb=hexToRgb(skinBaseHex),used=new Set(),out=[];
  for(const src of skinPalette){
    const expected=[
      Math.max(0,Math.min(255,anchor[0]+(src.r-baseRgb[0]))),
      Math.max(0,Math.min(255,anchor[1]+(src.g-baseRgb[1]))),
      Math.max(0,Math.min(255,anchor[2]+(src.b-baseRgb[2])))
    ];
    let best=null,bestDistance=Infinity;
    for(const candidate of candidates){
      if(used.has(candidate.key))continue;
      const distance=rgbDistance([candidate.r,candidate.g,candidate.b],expected);
      if(distance<bestDistance){best=candidate;bestDistance=distance}
    }
    if(best&&bestDistance<=maxDistance){
      used.add(best.key);
      out.push({key:best.key,sourceFrame:frameId,shade:src.shade,role:src.role});
    }
  }
  const anchorKey=colorKey(anchor[0],anchor[1],anchor[2]);
  if(!out.some(item=>item.key===anchorKey))out.unshift({key:anchorKey,sourceFrame:frameId,shade:1,role:'frame-base'});
  return out;
}
function loadFrameSkinPalettes(){
  frameSkinPalettes.clear();
  const config=manifest?.customization?.skinColor||{};
  const sourceFrames=Array.isArray(config.sourceFrames)&&config.sourceFrames.length?config.sourceFrames:(hairCatalog?.sourceFrames||['stand-01']);
  for(const frameId of sourceFrames){
    const discovered=discoverSourceFrameSkinPalette(frameId);
    frameSkinPalettes.set(frameId,discovered.length?discovered:skinPalette);
  }
  skinRemapCache.clear();
  return frameSkinPalettes;
}
function skinSourceFrames(frameId){
  const configured=manifest?.customization?.skinColor?.frameSources?.[frameId];
  if(Array.isArray(configured)&&configured.length)return configured;
  return [frameId];
}
function skinPaletteForFrame(frameId){
  const merged=new Map();
  for(const sourceId of skinSourceFrames(frameId)){
    const palette=frameSkinPalettes.get(sourceId)||skinPalette;
    for(const item of palette)if(!merged.has(item.key))merged.set(item.key,item);
  }
  return [...merged.values()];
}
function ensureSkinRemap(frameId='stand-01'){
  const target=normalizeHexColor(state.skinColor);
  if(!target||!skinPalette.length)return null;
  const cacheKey=target+'|'+frameId;
  if(skinRemapCache.has(cacheKey))return skinRemapCache.get(cacheKey);
  const targetRgb=hexToRgb(target),next=new Map();
  for(const src of skinPaletteForFrame(frameId)){
    next.set(src.key,targetRgb.map(value=>Math.max(0,Math.min(255,Math.round(value*src.shade)))));
  }
  skinRemapCache.set(cacheKey,next);
  return next;
}
function recolorSkin(target,frameId='stand-01'){
  const remap=ensureSkinRemap(frameId);
  if(!remap?.size)return;
  const image=target.getImageData(0,0,SIZE,SIZE),data=image.data;
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]<1)continue;
    if(hairProtectedKeys.has([data[i],data[i+1],data[i+2],data[i+3]].join(',')))continue;
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
const LEGACY_DYED_HAIR={
  'neat-short-hair-cherry-pink-01':['neat-short-hair-01','cherry-pink'],
  'neat-short-hair-peach-pink-01':['neat-short-hair-01','peach-pink'],
  'neat-short-hair-mint-01':['neat-short-hair-01','mint'],
  'neat-short-hair-sky-blue-01':['neat-short-hair-01','sky-blue'],
  'neat-short-hair-lavender-01':['neat-short-hair-01','lavender'],
  'neat-short-hair-blue-purple-01':['neat-short-hair-01','blue-purple'],
  'neat-short-hair-rose-gold-01':['neat-short-hair-01','rose-gold'],
  'neat-short-hair-white-blonde-01':['neat-short-hair-01','white-blonde'],
  'school-ponytail-hair-cherry-pink-01':['school-ponytail-hair-02','cherry-pink'],
  'school-ponytail-hair-peach-pink-01':['school-ponytail-hair-02','peach-pink'],
  'school-ponytail-hair-mint-01':['school-ponytail-hair-02','mint'],
  'school-ponytail-hair-sky-blue-01':['school-ponytail-hair-02','sky-blue'],
  'school-ponytail-hair-lavender-01':['school-ponytail-hair-02','lavender'],
  'school-ponytail-hair-blue-purple-01':['school-ponytail-hair-02','blue-purple'],
  'school-ponytail-hair-rose-gold-01':['school-ponytail-hair-02','rose-gold'],
  'school-ponytail-hair-white-blonde-01':['school-ponytail-hair-02','white-blonde']
};
async function loadHairColorCatalog(){
  const rel=manifest?.partCatalogs?.hairColor||'hair-color/catalog.json';
  const res=await fetch(ROOT+'/'+rel,{cache:'no-cache'});
  if(!res.ok)throw new Error('염색 색상 카탈로그를 불러오지 못했습니다.');
  const data=await res.json();
  if(data?.type!=='kidscade-avatar-hair-color-catalog'||!Array.isArray(data.items))throw new Error('염색 색상 카탈로그 형식이 올바르지 않습니다.');
  hairColorCatalog=data;
  if(!data.items.some(item=>item.id===state.hairColorId))state.hairColorId=data.defaultId||'brown';
  return data;
}
function migrateLegacyHairSelection(){
  const current=state.assetIds?.hair,mapped=LEGACY_DYED_HAIR[current];
  if(!mapped)return false;
  state.assetIds={...(state.assetIds||{}),hair:mapped[0]};
  state.hairColorId=mapped[1];
  return true;
}
function selectedHairColorId(){
  const requested=state.hairColorId||hairColorCatalog?.defaultId||'brown';
  return hairColorCatalog?.items?.some(item=>item.id===requested)?requested:(hairColorCatalog?.defaultId||'brown');
}
function hairColorDefinition(id=selectedHairColorId()){
  return hairColorCatalog?.items?.find(item=>item.id===id)||hairColorCatalog?.items?.find(item=>item.id===hairColorCatalog?.defaultId)||null;
}
function recolorHairPixels(pixels,colorId=selectedHairColorId()){
  const catalog=hairColorCatalog,def=hairColorDefinition(colorId);
  if(!catalog||!def)return pixels;
  const source=catalog.sourcePalette||{},mapping=new Map();
  for(const role of ['deepShade','shade','base','light']){
    const from=source[role],to=def[role];
    if(Array.isArray(from)&&Array.isArray(to))mapping.set(from.join(','),to);
  }
  return (pixels||[]).map(pixel=>{const next=mapping.get(pixel.slice(2).join(','));return next?[pixel[0],pixel[1],...next]:pixel});
}
async function loadHairCatalog(){
  const rel=manifest?.partCatalogs?.hair||'hair/catalog.json';
  const res=await fetch(ROOT+'/'+rel,{cache:'no-cache'});
  if(!res.ok)throw new Error('헤어 파츠 카탈로그를 불러오지 못했습니다.');
  const data=await res.json();
  if(data?.type!=='kidscade-avatar-hair-catalog'||!Array.isArray(data.items))throw new Error('헤어 파츠 카탈로그 형식이 올바르지 않습니다.');
  hairCatalog=data;hairProtectedKeys=new Set((data.protectedColors||[]).map(color=>color.join(',')));
  migrateLegacyHairSelection();
  const merged={...(manifest?.assetIds||{}),...(state.assetIds||{})};
  const requested=merged.hair||data.defaultId||manifest?.assetIds?.hair||'basic-tousled-hair-01';
  merged.hair=data.items.some(item=>item.id===requested)?requested:(data.defaultId||'basic-tousled-hair-01');
  state.assetIds=merged;
  if(merged.hair!==data.defaultId)await loadHairPart(merged.hair);
  return data;
}
async function loadHairPart(id){
  if(!hairCatalog||!id||id===hairCatalog.defaultId)return null;
  if(hairParts.has(id))return hairParts.get(id);
  const item=hairCatalog.items.find(candidate=>candidate.id===id);
  if(!item?.file)throw new Error('등록되지 않은 헤어 파츠입니다: '+id);
  const res=await fetch(ROOT+'/hair/'+item.file,{cache:'no-cache'});
  if(!res.ok)throw new Error('헤어 파츠를 불러오지 못했습니다: '+id);
  const part=await res.json();
  if(part?.type!=='kidscade-avatar-hair-part'||part.id!==id||part.layer!=='hair'||!Array.isArray(part.pixels))throw new Error('헤어 파츠 JSON 형식이 올바르지 않습니다: '+id);
  hairParts.set(id,part);return part;
}
function selectedHairId(){return state.assetIds?.hair||manifest?.assetIds?.hair||hairCatalog?.defaultId||'basic-tousled-hair-01'}
function runsCanvas(runs){
  const out=document.createElement('canvas');out.width=SIZE;out.height=SIZE;
  const c=out.getContext('2d',{alpha:true}),image=c.createImageData(SIZE,SIZE),data=image.data;
  for(const row of runs||[]){const y=Number(row?.[0]);for(const run of row?.[1]||[]){const start=Math.max(0,Number(run?.[0])||0),end=Math.min(SIZE,Number(run?.[1])||0);for(let x=start;x<end;x++){const i=(y*SIZE+x)*4;data[i]=255;data[i+1]=255;data[i+2]=255;data[i+3]=255}}}
  c.putImageData(image,0,0);return out;
}
function transformHairCanvas(source,frameId){
  const out=document.createElement('canvas');out.width=SIZE;out.height=SIZE;
  const c=out.getContext('2d',{alpha:true});c.imageSmoothingEnabled=false;
  const spec=hairCatalog?.frameTransforms?.[frameId];
  if(!spec){c.drawImage(source,0,0);return out}
  if(spec.type==='sitMix'){c.drawImage(source,0,Number(spec.down)||0);return out}
  const pivot=spec.pivot||[64,118],dx=Number(spec.dx)||0,dy=Number(spec.dy)||0,angle=(Number(spec.angle)||0)*Math.PI/180;
  const scaleX=Number.isFinite(Number(spec.scaleX))?Number(spec.scaleX):1,scaleY=Number.isFinite(Number(spec.scaleY))?Number(spec.scaleY):1;
  c.save();c.translate(pivot[0]+dx,pivot[1]+dy);c.rotate(angle);c.scale(scaleX,scaleY);c.translate(-pivot[0],-pivot[1]);c.drawImage(source,0,0);c.restore();return out;
}
function hairLayerCanvas(id,frameId,colorId=selectedHairColorId()){
  const cacheKey=id+':'+colorId+':'+frameId;if(hairFrameCache.has(cacheKey))return hairFrameCache.get(cacheKey);
  const part=hairParts.get(id);if(!part)return null;
  const sourceKey=id+':'+colorId;
  let source=hairSourceCache.get(sourceKey);if(!source){source=pixelsCanvas(recolorHairPixels(part.pixels,colorId));hairSourceCache.set(sourceKey,source)}
  const out=transformHairCanvas(source,frameId);hairFrameCache.set(cacheKey,out);return out;
}
function hairMaskCoords(kind,frameId){
  const cacheKey=kind+':'+frameId;if(hairMaskCoordCache.has(cacheKey))return hairMaskCoordCache.get(cacheKey);
  let source=hairMaskSourceCache.get(kind);
  if(!source){const runs=hairCatalog?.clear?.[kind+'Runs']||[];source=runsCanvas(runs);hairMaskSourceCache.set(kind,source)}
  const transformed=transformHairCanvas(source,frameId),data=transformed.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data,coords=[];
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(data[(y*SIZE+x)*4+3])coords.push([x,y]);
  hairMaskCoordCache.set(cacheKey,coords);return coords;
}
function transformHairPoint(point,frameId){
  const x=Number(point?.[0])||0,y=Number(point?.[1])||0,spec=hairCatalog?.frameTransforms?.[frameId];
  if(!spec)return [Math.round(x),Math.round(y)];
  if(spec.type==='sitMix')return [Math.round(x),Math.round(y+(Number(spec.down)||0))];
  const pivot=spec.pivot||[64,118],dx=Number(spec.dx)||0,dy=Number(spec.dy)||0,angle=(Number(spec.angle)||0)*Math.PI/180;
  const sx=Number.isFinite(Number(spec.scaleX))?Number(spec.scaleX):1,sy=Number.isFinite(Number(spec.scaleY))?Number(spec.scaleY):1,ux=(x-pivot[0])*sx,uy=(y-pivot[1])*sy;
  return [Math.round(pivot[0]+dx+Math.cos(angle)*ux-Math.sin(angle)*uy),Math.round(pivot[1]+dy+Math.sin(angle)*ux+Math.cos(angle)*uy)];
}
function sampledHairSkin(image,frameId){
  const values=[];for(const point of hairCatalog?.skinSamples||[[64,56]]){const [x,y]=transformHairPoint(point,frameId);if(x<0||y<0||x>=SIZE||y>=SIZE)continue;const i=(y*SIZE+x)*4;if(image.data[i+3]>0)values.push([image.data[i],image.data[i+1],image.data[i+2]])}
  if(!values.length)return hexToRgb(state.skinColor||skinBaseHex);
  const median=index=>values.map(v=>v[index]).sort((a,b)=>a-b)[Math.floor(values.length/2)];return [median(0),median(1),median(2)];
}
function currentHairOutline(frameId='stand-01'){
  const source=normalizeHexColor(hairCatalog?.clear?.outlineSource)||'#7b5053',[r,g,b]=hexToRgb(source),remap=ensureSkinRemap(frameId);
  return remap?.get(colorKey(r,g,b))||[r,g,b];
}
function isHairProtected(data,i){return hairProtectedKeys.has([data[i],data[i+1],data[i+2],data[i+3]].join(','))}
function clearBaseHair(target,frameId){
  const image=target.getImageData(0,0,SIZE,SIZE),data=image.data,skin=sampledHairSkin(image,frameId),outline=currentHairOutline(frameId);
  for(const [x,y] of hairMaskCoords('transparent',frameId)){const i=(y*SIZE+x)*4;if(isHairProtected(data,i))continue;data[i]=0;data[i+1]=0;data[i+2]=0;data[i+3]=0}
  for(const [x,y] of hairMaskCoords('skin',frameId)){const i=(y*SIZE+x)*4;if(isHairProtected(data,i))continue;data[i]=skin[0];data[i+1]=skin[1];data[i+2]=skin[2];data[i+3]=255}
  for(const [x,y] of hairMaskCoords('outline',frameId)){const i=(y*SIZE+x)*4;if(isHairProtected(data,i))continue;data[i]=outline[0];data[i+1]=outline[1];data[i+2]=outline[2];data[i+3]=255}
  target.putImageData(image,0,0);
}
function paintHairLayer(target,layer){
  if(!layer)return;const base=target.getImageData(0,0,SIZE,SIZE),hair=layer.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE),a=base.data,b=hair.data;
  for(let i=0;i<b.length;i+=4){if(!b[i+3]||isHairProtected(a,i))continue;a[i]=b[i];a[i+1]=b[i+1];a[i+2]=b[i+2];a[i+3]=b[i+3]}
  target.putImageData(base,0,0);
}
function applyHairPart(target,frameId,hairId=selectedHairId()){
  if(!hairCatalog||!hairId||hairId===hairCatalog.defaultId)return false;
  const layer=hairLayerCanvas(hairId,frameId);if(!layer)return false;clearBaseHair(target,frameId);paintHairLayer(target,layer);return true;
}
async function loadUpperCatalog(){
  const rel=manifest?.partCatalogs?.upper||'upper/catalog.json';
  const res=await fetch(ROOT+'/'+rel,{cache:'no-cache'});
  if(!res.ok)throw new Error('상의 파츠 카탈로그를 불러오지 못했습니다.');
  const data=await res.json();
  if(data?.type!=='kidscade-avatar-upper-catalog'||!Array.isArray(data.items)||!Array.isArray(data.sourcePalette))throw new Error('상의 파츠 카탈로그 형식이 올바르지 않습니다.');
  upperCatalog=data;
  const merged={...(manifest?.assetIds||{}),...(state.assetIds||{})};
  const requested=merged.upper||data.defaultId||manifest?.assetIds?.upper||'basic-school-uniform-upper-01';
  merged.upper=data.items.some(item=>item.id===requested)?requested:(data.defaultId||'basic-school-uniform-upper-01');
  state.assetIds=merged;
  if(merged.upper!==data.defaultId)await loadUpperPart(merged.upper);
  return data;
}
async function loadUpperPart(id){
  if(!upperCatalog||!id||id===upperCatalog.defaultId)return null;
  if(upperParts.has(id))return upperParts.get(id);
  const item=upperCatalog.items.find(candidate=>candidate.id===id);
  if(!item?.file)throw new Error('등록되지 않은 상의 파츠입니다: '+id);
  const res=await fetch(ROOT+'/upper/'+item.file,{cache:'no-cache'});
  if(!res.ok)throw new Error('상의 파츠를 불러오지 못했습니다: '+id);
  const part=await res.json();
  if(part?.type==='kidscade-avatar-full-adjustment')window.KidscadeAvatarWardrobe.validate(part,'upper',id,manifest.frameOrder);
  else if(part?.type!=='kidscade-avatar-upper-part'||part.id!==id||part.layer!=='upper'||!Array.isArray(part.palette)||part.palette.length!==upperCatalog.sourcePalette.length)throw new Error('상의 파츠 JSON 형식이 올바르지 않습니다: '+id);
  upperParts.set(id,part);return part;
}
function selectedUpperId(){return state.assetIds?.upper||manifest?.assetIds?.upper||upperCatalog?.defaultId||'basic-school-uniform-upper-01'}
function upperColorIndex(r,g,b,a){
  const palette=upperCatalog?.sourcePalette||[];
  for(let i=0;i<palette.length;i++){const c=palette[i];if(r===c[0]&&g===c[1]&&b===c[2]&&a===c[3])return i}
  return -1;
}
function applyUpperPart(target,frameId,upperId=selectedUpperId()){
  if(!upperCatalog||!upperId||upperId===upperCatalog.defaultId)return false;
  const part=upperParts.get(upperId),box=upperCatalog.frameBounds?.[frameId];
  if(part?.frames){drawPixelTuples(target,part.frames[frameId].layers.upper.operations[0].pixels);return true}
  if(!part||!box)return false;
  const image=target.getImageData(0,0,SIZE,SIZE),data=image.data;
  const x0=Math.max(0,Number(box[0])||0),y0=Math.max(0,Number(box[1])||0),x1=Math.min(SIZE-1,Number(box[2])||0),y1=Math.min(SIZE-1,Number(box[3])||0);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const i=(y*SIZE+x)*4,index=upperColorIndex(data[i],data[i+1],data[i+2],data[i+3]);
    if(index<0)continue;
    const color=part.palette[index];data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=color[3];
  }
  target.putImageData(image,0,0);return true;
}
async function loadLowerCatalog(){
  const rel=manifest?.partCatalogs?.lower||'lower/catalog.json';
  const res=await fetch(ROOT+'/'+rel,{cache:'no-cache'});
  if(!res.ok)throw new Error('하의 파츠 카탈로그를 불러오지 못했습니다.');
  const data=await res.json();
  if(data?.type!=='kidscade-avatar-lower-catalog'||!Array.isArray(data.items)||!Array.isArray(data.sourcePalette))throw new Error('하의 파츠 카탈로그 형식이 올바르지 않습니다.');
  lowerCatalog=data;
  const merged={...(manifest?.assetIds||{}),...(state.assetIds||{})};
  const requested=merged.lower||data.defaultId||manifest?.assetIds?.lower||'basic-school-uniform-lower-01';
  merged.lower=data.items.some(item=>item.id===requested)?requested:(data.defaultId||'basic-school-uniform-lower-01');
  state.assetIds=merged;
  if(merged.lower!==data.defaultId)await loadLowerPart(merged.lower);
  return data;
}
async function loadLowerPart(id){
  if(!lowerCatalog||!id||id===lowerCatalog.defaultId)return null;
  if(lowerParts.has(id))return lowerParts.get(id);
  const item=lowerCatalog.items.find(candidate=>candidate.id===id);
  if(!item?.file)throw new Error('등록되지 않은 하의 파츠입니다: '+id);
  const res=await fetch(ROOT+'/lower/'+item.file,{cache:'no-cache'});
  if(!res.ok)throw new Error('하의 파츠를 불러오지 못했습니다: '+id);
  const part=await res.json();
  if(part?.type==='kidscade-avatar-full-adjustment')window.KidscadeAvatarWardrobe.validate(part,'lower',id,manifest.frameOrder);
  else if(part?.type!=='kidscade-avatar-lower-part'||part.id!==id||part.layer!=='lower'||!Array.isArray(part.palette)||part.palette.length!==lowerCatalog.sourcePalette.length)throw new Error('하의 파츠 JSON 형식이 올바르지 않습니다: '+id);
  lowerParts.set(id,part);return part;
}
function selectedLowerId(){return state.assetIds?.lower||manifest?.assetIds?.lower||lowerCatalog?.defaultId||'basic-school-uniform-lower-01'}
function lowerColorIndex(r,g,b,a){
  const palette=lowerCatalog?.sourcePalette||[];
  for(let i=0;i<palette.length;i++){const c=palette[i];if(r===c[0]&&g===c[1]&&b===c[2]&&a===c[3])return i}
  return -1;
}
function applyLowerPart(target,frameId,lowerId=selectedLowerId()){
  if(!lowerCatalog||!lowerId||lowerId===lowerCatalog.defaultId)return false;
  const part=lowerParts.get(lowerId),box=lowerCatalog.frameBounds?.[frameId];
  if(part?.frames){drawPixelTuples(target,part.frames[frameId].layers.lower.operations[0].pixels);return true}
  if(!part||!box)return false;
  const image=target.getImageData(0,0,SIZE,SIZE),data=image.data;
  const x0=Math.max(0,Number(box[0])||0),y0=Math.max(0,Number(box[1])||0),x1=Math.min(SIZE-1,Number(box[2])||0),y1=Math.min(SIZE-1,Number(box[3])||0);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const i=(y*SIZE+x)*4,index=lowerColorIndex(data[i],data[i+1],data[i+2],data[i+3]);
    if(index<0)continue;
    const color=part.palette[index];data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=color[3];
  }
  target.putImageData(image,0,0);return true;
}

/* Public school accessories: shoes, earrings, special effects, left-hand tools and right-hand teaching aids. */
let wardrobe=null;
const wardrobeRequests=new Map();
let schoolPack=null;
let shoeCatalog=null;
let earringCatalog=null;
let effectCatalog=null;
let toolCatalog=null;
let teachingAidCatalog=null;
const packLayerMapCache=new Map();
const accessoryShapeCache=new Map();
const FRAME_HAND_ANCHORS={
  'stand-01':{left:[49,91],right:[81,91]},'stand-02':{left:[49,91],right:[81,91]},
  'walk-01':{left:[50,89],right:[82,89]},'walk-02':{left:[50,89],right:[82,89]},'walk-03':{left:[50,89],right:[82,89]},'walk-04':{left:[50,89],right:[82,89]},
  'jump-01':{left:[45,78],right:[88,80]},
  'attack-01':{left:[49,91],right:[81,91]},'attack-02':{left:[47,88],right:[82,91]},'attack-03':{left:[45,82],right:[87,82]},'attack-04':{left:[39,79],right:[82,84]},'attack-05':{left:[49,91],right:[81,91]},
  'hurt-01':{left:[51,92],right:[82,92]},'hurt-02':{left:[54,94],right:[84,93]},
  'dead-01':null,'dead-02':null,'dead-03':null,'dead-04':null,
  'sit-01':{left:[51,99],right:[79,101]},'sit-02':{left:[51,103],right:[79,104]},
  'pickup-01':{left:[47,96],right:[80,94]},'pickup-02':{left:[41,108],right:[76,99]},'pickup-03':{left:[45,100],right:[79,96]}
};
async function loadSchoolPack(){const res=await fetch(SCHOOL_PACK_URL,{cache:'no-cache'});if(!res.ok)throw new Error('v3 학교 기본 레이어 데이터를 불러오지 못했습니다.');schoolPack=await res.json();packLayerMapCache.clear();accessoryShapeCache.clear();return schoolPack}
async function loadAccessoryCatalog(key,expectedType){const rel=manifest?.partCatalogs?.[key];if(!rel)return null;const res=await fetch(ROOT+'/'+rel,{cache:'no-cache'});if(!res.ok)throw new Error(key+' 파츠 카탈로그를 불러오지 못했습니다.');const catalog=await res.json();if(catalog?.type!==expectedType)throw new Error(key+' 파츠 카탈로그 형식이 올바르지 않습니다.');return catalog}
async function loadShoeCatalog(){shoeCatalog=await loadAccessoryCatalog('shoes','kidscade-avatar-shoes-catalog');return shoeCatalog}
async function loadEarringCatalog(){earringCatalog=await loadAccessoryCatalog('earring','kidscade-avatar-earring-catalog');return earringCatalog}
async function loadEffectCatalog(){effectCatalog=await loadAccessoryCatalog('effect','kidscade-avatar-effect-catalog');return effectCatalog}
async function loadToolCatalog(){toolCatalog=await loadAccessoryCatalog('weapon','kidscade-avatar-tool-catalog');return toolCatalog}
async function loadTeachingAidCatalog(){teachingAidCatalog=await loadAccessoryCatalog('shield','kidscade-avatar-teaching-aid-catalog');return teachingAidCatalog}
function selectedShoeId(){const id=state.assetIds?.shoes||manifest?.assetIds?.shoes;return shoeCatalog?.items?.some(item=>item.id===id)?id:(shoeCatalog?.defaultId||id)}
function selectedEarringId(){const id=state.assetIds?.earring||manifest?.assetIds?.earring;return earringCatalog?.items?.some(item=>item.id===id)?id:(earringCatalog?.defaultId||id)}
function selectedEffectId(){const id=state.assetIds?.effect||manifest?.assetIds?.effect||effectCatalog?.defaultId||'no-effect';return effectCatalog?.items?.some(item=>item.id===id)?id:(effectCatalog?.defaultId||'no-effect')}
function selectedToolId(){const id=state.assetIds?.weaponFront||state.assetIds?.weaponBack||manifest?.assetIds?.weaponFront;return toolCatalog?.items?.some(item=>item.id===id)?id:(toolCatalog?.defaultId||id)}
function selectedTeachingAidId(){const id=state.assetIds?.shieldFront||state.assetIds?.shieldBack||manifest?.assetIds?.shieldFront;return teachingAidCatalog?.items?.some(item=>item.id===id)?id:(teachingAidCatalog?.defaultId||id)}
function packLayerPixels(frameId,layer){return schoolPack?.frames?.[frameId]?.layers?.[layer]?.operations?.[0]?.pixels||[]}
function packLayerMap(frameId,layer){const key=frameId+'|'+layer;if(packLayerMapCache.has(key))return packLayerMapCache.get(key);const map=new Map();for(const p of packLayerPixels(frameId,layer))map.set(p[0]+','+p[1],p);packLayerMapCache.set(key,map);return map}
function rgbaFromHex(hex,alpha=255){const rgb=hexToRgb(hex);return [rgb[0],rgb[1],rgb[2],alpha]}
function sameRgba(data,i,p){return !!p&&data[i]===p[2]&&data[i+1]===p[3]&&data[i+2]===p[4]&&data[i+3]===p[5]}
function writeRgba(data,i,rgba){data[i]=rgba[0]||0;data[i+1]=rgba[1]||0;data[i+2]=rgba[2]||0;data[i+3]=rgba[3]??255}
function bboxForPixels(pixels){if(!pixels?.length)return null;let minX=SIZE,minY=SIZE,maxX=-1,maxY=-1;for(const p of pixels){minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1])}return {minX,minY,maxX,maxY,w:maxX-minX+1,h:maxY-minY+1,cx:(minX+maxX)/2,cy:(minY+maxY)/2}}
function sourcePaletteIndex(source,p){if(!source?.length||!p)return -1;for(let i=0;i<source.length;i++){const rgb=rgbaFromHex(source[i]);if(p[2]===rgb[0]&&p[3]===rgb[1]&&p[4]===rgb[2])return i}return -1}
function shoeStyledColor(def,p,x,y,frameId){
  if(!def||def.kind==='default')return p?p.slice(2):[0,0,0,0];
  const idx=sourcePaletteIndex(shoeCatalog?.sourcePalette,p),palette=def.palette||[];let color=rgbaFromHex(palette[Math.max(0,idx)]||palette[0]||'#ffffff');
  const box=bboxForPixels(packLayerPixels(frameId,'shoes'));if(!box)return color;const accent=rgbaFromHex(palette[3]||palette[0]||'#ffffff');
  if(def.pattern==='laces'&&y<=box.minY+3&&((x+2*y)%5===0))color=accent;else if(def.pattern==='high-top'&&y<=box.minY+2)color=accent;else if(def.pattern==='canvas'&&y===box.maxY-1)color=accent;else if(def.pattern==='runner'&&((x+y)%7===0))color=accent;else if(def.pattern==='loafer'&&y===box.minY+2)color=accent;else if(def.pattern==='slip-on'&&x>=Math.floor(box.cx)-1&&x<=Math.ceil(box.cx)+1)color=accent;else if(def.pattern==='indoor'&&y<=box.minY+2)color=accent;return color;
}
function splitShoeComponents(pixels){
  const src=new Map((pixels||[]).map(p=>[p[0]+','+p[1],p])),seen=new Set(),groups=[];
  for(const [key,p] of src){
    if(seen.has(key))continue;
    const group=[],queue=[p];seen.add(key);
    while(queue.length){
      const q=queue.pop();group.push(q);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;const k=(q[0]+dx)+','+(q[1]+dy),next=src.get(k);
        if(next&&!seen.has(k)){seen.add(k);queue.push(next)}
      }
    }
    if(group.length)groups.push(group);
  }
  groups.sort((a,b)=>b.length-a.length);
  if(groups.length>=2)return groups.slice(0,2);
  const box=bboxForPixels(pixels),mid=box?.cx??64,left=(pixels||[]).filter(p=>p[0]<=mid),right=(pixels||[]).filter(p=>p[0]>mid);
  return [left,right].filter(group=>group.length);
}
function shoeSilhouettePixels(def,frameId){
  const src=packLayerPixels(frameId,'shoes'),map=new Map();
  for(const p of src){const color=shoeStyledColor(def,p,p[0],p[1],frameId);plotPixel(map,p[0],p[1],color)}
  if(!def?.shape)return [...map.values()];
  const palette=def.palette||[],base=rgbaFromHex(palette[0]||'#777777'),sole=rgbaFromHex(palette[1]||'#ffffff'),dark=rgbaFromHex(palette[2]||'#222222'),accent=rgbaFromHex(palette[3]||palette[0]||'#ffffff');
  for(const group of splitShoeComponents(src)){
    const box=bboxForPixels(group);if(!box)continue;
    const c=[box.cx,box.cy],toBody=[64-c[0],76-c[1]],mag=Math.hypot(toBody[0],toBody[1])||1,up=[toBody[0]/mag,toBody[1]/mag],down=[-up[0],-up[1]],side=[-up[1],up[0]];
    const center=(u=0,v=0)=>[c[0]+up[0]*u+side[0]*v,c[1]+up[1]*u+side[1]*v];
    const width=Math.max(7,Math.min(13,box.w+2));
    if(def.shape==='hightop-sneaker'){
      paintRotRect(map,center(4),up,width,9,dark);paintRotRect(map,center(4),up,width-2,7,base);paintRotRect(map,center(7),up,width-1,2,accent);paintRotRect(map,center(-2),up,width+2,3,sole);
      for(const v of [-2,2])for(const u of [2,5])plotPixel(map,...center(u,v),sole);
    }else if(def.shape==='basketball-shoe'){
      paintRotRect(map,center(5),up,width+1,11,dark);paintRotRect(map,center(5),up,width-1,9,base);paintRotRect(map,center(9),up,width,3,accent);paintRotRect(map,center(-3),up,width+4,4,sole);
      for(const u of [1,4,7])paintRotRect(map,center(u),up,width-5,1,accent);
    }else if(def.shape==='soccer-cleat'){
      paintRotRect(map,center(1),up,width+3,6,dark);paintRotRect(map,center(1),up,width+1,4,base);paintRotRect(map,center(3),up,width-2,2,accent);paintRotRect(map,center(-3),up,width+4,2,sole);
      for(const v of [-Math.floor(width/3),Math.floor(width/3)]){plotCircle(map,...center(-5,v),1,dark);plotCircle(map,...center(-4,v/2),1,dark)}
    }else if(def.shape==='rain-boot'){
      paintRotRect(map,center(7),up,width,15,dark);paintRotRect(map,center(7),up,width-2,13,base);paintRotRect(map,center(13),up,width+1,3,accent);paintRotRect(map,center(-3),up,width+4,4,sole);
    }else if(def.shape==='fur-boot'){
      paintRotRect(map,center(6),up,width+1,13,dark);paintRotRect(map,center(5),up,width-1,10,base);paintRotRect(map,center(11),up,width+3,4,sole);paintRotRect(map,center(-3),up,width+4,4,dark);
      for(const v of [-4,0,4])plotCircle(map,...center(11,v),2,accent);
    }else if(def.shape==='slipper'){
      paintRotRect(map,center(-1),up,width+5,6,dark);paintRotRect(map,center(-1),up,width+3,4,sole);paintRotRect(map,center(1),up,width-1,3,base);paintRotRect(map,center(2),up,width-5,2,accent);
    }else if(def.shape==='sandal'){
      paintRotRect(map,center(-2),up,width+4,3,dark);paintRotRect(map,center(-2),up,width+2,2,sole);
      for(const u of [0,4])paintRotRect(map,center(u),up,width-2,2,base);
      for(const v of [-3,3])paintSegment(map,center(4,v),up,5,1,accent);
    }else if(def.shape==='roller-skate'){
      paintRotRect(map,center(4),up,width,10,dark);paintRotRect(map,center(4),up,width-2,8,base);paintRotRect(map,center(-3),up,width+4,3,sole);paintRotRect(map,center(-6),up,width+5,1,dark);
      for(const v of [-Math.floor(width/3),Math.floor(width/3)]){plotCircle(map,...center(-7,v),2,dark);plotCircle(map,...center(-7,v),1,accent)}
    }else if(def.shape==='inline-skate'){
      paintRotRect(map,center(4),up,width,10,dark);paintRotRect(map,center(4),up,width-2,8,base);paintRotRect(map,center(2),up,width-4,2,accent);paintRotRect(map,center(-4),up,width+2,2,sole);
      for(const v of [-4,0,4]){plotCircle(map,...center(-7,v),2,dark);plotCircle(map,...center(-7,v),1,accent)}
    }else if(def.shape==='character-slipper'){
      paintRotRect(map,center(-1),up,width+5,7,dark);paintRotRect(map,center(-1),up,width+3,5,base);plotCircle(map,...center(1,-3),2,sole);plotCircle(map,...center(1,3),2,sole);
      plotPixel(map,...center(0,-2),dark);plotPixel(map,...center(0,2),dark);plotPixel(map,...center(-2,0),accent);
      for(const v of [-4,4]){plotCircle(map,...center(3,v),2,dark);plotCircle(map,...center(3,v),1,accent)}
    }
  }
  return [...map.values()];
}
function applyShoeSelection(target,frameId,id=selectedShoeId()){
  if(!shoeCatalog||!schoolPack||!id)return false;
  const def=shoeCatalog.items.find(item=>item.id===id);if(!def)return false;
  const pixels=packLayerPixels(frameId,'shoes');
  if(id!==shoeCatalog.defaultId&&def.shape){
    drawPixelTuples(target,shoeSilhouettePixels(def,frameId),true);return true
  }
  if(id!==shoeCatalog.defaultId){
    const image=target.getImageData(0,0,SIZE,SIZE),data=image.data;
    for(const p of pixels){const i=(p[1]*SIZE+p[0])*4;if(!sameRgba(data,i,p))continue;writeRgba(data,i,shoeStyledColor(def,p,p[0],p[1],frameId))}
    target.putImageData(image,0,0);
  }
  drawPixelTuples(target,accessoryOutlinePixels(pixels));
  return true
}

function avatarEffectBounds(frameId){
  const layers=['hair','eyes','upper','lower','shoes'],pixels=layers.flatMap(layer=>packLayerPixels(frameId,layer)),box=bboxForPixels(pixels);
  return box||{minX:42,minY:20,maxX:86,maxY:116,w:45,h:97,cx:64,cy:68};
}
function effectStar(map,x,y,r,base,light){
  plotPixel(map,x,y,light);for(let t=1;t<=r;t++){plotPixel(map,x+t,y,base);plotPixel(map,x-t,y,base);plotPixel(map,x,y+t,base);plotPixel(map,x,y-t,base)}
  if(r>2)for(const [dx,dy] of [[2,2],[-2,2],[2,-2],[-2,-2]])plotPixel(map,x+dx,y+dy,light);
}
function effectHeart(map,x,y,base,light){
  for(const [dx,dy] of [[-2,-2],[-1,-3],[0,-2],[1,-3],[2,-2],[-3,-1],[3,-1],[-3,0],[3,0],[-2,1],[2,1],[-1,2],[1,2],[0,3]])plotPixel(map,x+dx,y+dy,base);
  plotPixel(map,x-1,y-1,light);
}
function effectSnowflake(map,x,y,base,light){
  for(let t=-4;t<=4;t++){plotPixel(map,x+t,y,base);plotPixel(map,x,y+t,base)}
  for(let t=-3;t<=3;t++){plotPixel(map,x+t,y+t,light);plotPixel(map,x+t,y-t,light)}
}
function effectFlame(map,x,y,outline,base,light){
  for(let row=0;row<10;row++){const half=Math.max(1,Math.round((9-row)*.42));for(let dx=-half;dx<=half;dx++)plotPixel(map,x+dx,y-row,row>5?light:base)}
  plotPixel(map,x,y-11,light);plotPixel(map,x-2,y-7,outline);plotPixel(map,x+2,y-7,outline);
}
function effectLightning(map,x,y,base,light,flip=1){
  const pts=[[0,-7],[3*flip,-4],[1*flip,-4],[4*flip,0],[1*flip,0],[3*flip,6],[-3*flip,1],[0,1],[-3*flip,-2],[0,-2]];
  for(const [dx,dy] of pts)plotCircle(map,x+dx,y+dy,1,base);plotPixel(map,x,y-4,light);
}
function effectMusicNote(map,x,y,base,light,flip=1){
  plotCircle(map,x,y+5,3,base);for(let t=0;t<11;t++)plotPixel(map,x+3*flip,y+4-t,base);
  for(let t=0;t<5;t++)plotPixel(map,x+(3+t)*flip,y-6+Math.round(t/2),light);
}
function effectLeaf(map,x,y,base,light,flip=1){
  for(const [dx,dy] of [[0,-3],[1*flip,-2],[2*flip,-1],[2*flip,0],[1*flip,1],[0,2],[-1*flip,1],[-1*flip,0]])plotPixel(map,x+dx,y+dy,base);
  plotPixel(map,x,y-1,light);plotPixel(map,x+1*flip,y,light);
}
function effectPixels(def,frameId,pass){
  if(!def||def.kind==='none'||(def.pass||'front')!==pass)return [];
  const box=avatarEffectBounds(frameId),map=new Map(),colors=(def.colors||[]).map(c=>rgbaFromHex(c)),c0=colors[0]||[255,255,255,255],c1=colors[1]||c0,c2=colors[2]||c1,c3=colors[3]||c2,c4=colors[4]||c3;
  const phase=Math.max(0,manifest?.frameOrder?.indexOf(frameId)||0),bob=(phase%3)-1;
  const left=Math.max(10,box.minX-12),right=Math.min(117,box.maxX+12),top=Math.max(9,box.minY-8),bottom=Math.min(116,box.maxY-2),cx=Math.round(box.cx);
  if(def.kind==='sparkle'){
    for(const [i,p] of [[0,[left,top+18]],[1,[right,top+30]],[2,[left+4,bottom-20]],[3,[right-3,bottom-38]],[4,[cx,top-1]]])effectStar(map,p[0],p[1]+((phase+i)%3)-1,i%2?2:4,c0,i%2?c3:c2);
  }else if(def.kind==='stars'){
    for(const [i,p] of [[0,[left,top+12]],[1,[right,top+20]],[2,[left+3,bottom-26]],[3,[right-4,bottom-46]],[4,[cx+18,top-2]]])effectStar(map,p[0],p[1]+((phase+i)%4)-2,i%2?3:4,c0,i%2?c3:c1);
  }else if(def.kind==='hearts'){
    for(const [i,p] of [[0,[left,top+22]],[1,[right,top+14]],[2,[left+2,bottom-28]],[3,[right-3,bottom-44]]])effectHeart(map,p[0],p[1]+((phase+i)%4)-2,i%2?c1:c0,c2);
  }else if(def.kind==='snow'){
    for(const [i,p] of [[0,[left,top+8]],[1,[right,top+18]],[2,[left+5,top+42]],[3,[right-4,top+52]],[4,[cx+20,bottom-25]]])effectSnowflake(map,p[0],p[1]+((phase+i*2)%5)-2,i%2?c1:c0,c2);
  }else if(def.kind==='flame'){
    effectFlame(map,left+3,bottom+1,c0,c1,c2);effectFlame(map,right-3,bottom+1,c0,c1,c3);effectFlame(map,cx,bottom+4,c0,c1,c2);
  }else if(def.kind==='lightning'){
    effectLightning(map,left,top+30+bob,c0,c2,1);effectLightning(map,right,top+18-bob,c0,c1,-1);effectLightning(map,right-2,bottom-30+bob,c0,c2,-1);
  }else if(def.kind==='music-notes'){
    effectMusicNote(map,left,top+22+bob,c0,c2,1);effectMusicNote(map,right,top+36-bob,c1,c3,-1);effectMusicNote(map,right-4,bottom-30+bob,c0,c2,-1);
  }else if(def.kind==='small-cloud'){
    const cloud=(x,y,s)=>{plotCircle(map,x-4*s,y,5*s,c0);plotCircle(map,x+3*s,y-2*s,6*s,c1);plotCircle(map,x+9*s,y+1*s,4*s,c2);paintRotRect(map,[x+2*s,y+3*s],[0,1],18*s,5*s,c1)};
    cloud(left+3,top+26+bob,1);cloud(right-8,top+46-bob,1);
  }else if(def.kind==='leaves'){
    for(const [i,p] of [[0,[left,top+18]],[1,[right,top+26]],[2,[left+4,bottom-25]],[3,[right-3,bottom-38]],[4,[cx+20,top+2]]])effectLeaf(map,p[0],p[1]+((phase+i)%5)-2,i%2?c0:c1,c2,i%2?1:-1);
  }else if(def.kind==='rainbow'){
    const center=[cx,Math.min(82,top+53)],palette=[c0,c1,c2,c3,c4];
    for(let band=0;band<5;band++){const r=42-band*3,col=palette[band];for(let deg=205;deg<=335;deg+=2){const a=deg*Math.PI/180;plotPixel(map,center[0]+Math.cos(a)*r,center[1]+Math.sin(a)*r,col)}}
    plotCircle(map,left+5,center[1]+6,6,c2);plotCircle(map,right-5,center[1]+6,6,c2);
  }
  return [...map.values()];
}
function drawEffectPass(target,frameId,id=selectedEffectId(),pass='front'){
  const def=effectCatalog?.items?.find(item=>item.id===id)||effectCatalog?.items?.find(item=>item.id===effectCatalog?.defaultId);
  if(def)drawPixelTuples(target,effectPixels(def,frameId,pass),false);
}

function upperStyledTuple(p){const id=selectedUpperId(),part=upperParts.get(id);if(!upperCatalog||id===upperCatalog.defaultId||!part)return p?.slice(2)||null;const idx=upperColorIndex(p?.[2],p?.[3],p?.[4],p?.[5]);return idx>=0?(part.palette?.[idx]||p.slice(2)):p.slice(2)}
function lowerStyledTuple(p){const id=selectedLowerId(),part=lowerParts.get(id);if(!lowerCatalog||id===lowerCatalog.defaultId||!part)return p?.slice(2)||null;const idx=lowerColorIndex(p?.[2],p?.[3],p?.[4],p?.[5]);return idx>=0?(part.palette?.[idx]||p.slice(2)):p.slice(2)}
function knownUnderlyingPixel(frameId,x,y,order){
  for(const layer of order){const p=packLayerMap(frameId,layer).get(x+','+y);if(!p)continue;
    if(layer==='upper')return upperStyledTuple(p);if(layer==='lower')return lowerStyledTuple(p);
    if(layer==='shoes'){const def=shoeCatalog?.items?.find(item=>item.id===selectedShoeId());return def&&def.kind!=='default'?shoeStyledColor(def,p,x,y,frameId):p.slice(2)}
    if(layer==='hair'&&hairCatalog&&selectedHairId()!==hairCatalog.defaultId){const c=hairLayerCanvas(selectedHairId(),frameId);if(c){const d=c.getContext('2d',{alpha:true}).getImageData(x,y,1,1).data;if(d[3])return [d[0],d[1],d[2],d[3]]}continue}
    return p.slice(2);
  }return null;
}
function stripPackedLayers(target,frameId,layers,underOrder){
  if(!schoolPack)return;const image=target.getImageData(0,0,SIZE,SIZE),data=image.data,original=new Uint8ClampedArray(data),excluded=new Set(),coords=new Map();
  for(const layer of layers)for(const p of packLayerPixels(frameId,layer)){const key=p[0]+','+p[1];excluded.add(key);if(!coords.has(key))coords.set(key,[p[0],p[1]])}
  for(const [key,[x,y]] of coords){const i=(y*SIZE+x)*4;let visible=false;for(const layer of layers){const p=packLayerMap(frameId,layer).get(key);if(sameRgba(original,i,p)){visible=true;break}}if(!visible)continue;
    const known=knownUnderlyingPixel(frameId,x,y,underOrder);if(known){writeRgba(data,i,known);continue}
    const neighbors=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=SIZE||ny>=SIZE||excluded.has(nx+','+ny))continue;const ni=(ny*SIZE+nx)*4;if(original[ni+3]>0)neighbors.push([original[ni],original[ni+1],original[ni+2],original[ni+3]])}
    if(neighbors.length>=3)writeRgba(data,i,neighbors[Math.floor(neighbors.length/2)]);else writeRgba(data,i,[0,0,0,0]);
  }target.putImageData(image,0,0);
}
function plotPixel(map,x,y,color){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=SIZE||y>=SIZE)return;map.set(x+','+y,[x,y,color[0],color[1],color[2],color[3]??255])}
function plotCircle(map,cx,cy,r,color,ring=false){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){const q=x*x+y*y;if(ring?(q<=r*r&&q>=(r-2)*(r-2)):(q<=r*r))plotPixel(map,cx+x,cy+y,color)}}
function paintSegment(map,anchor,direction,length,width,color,start=0){const dx=direction[0],dy=direction[1],nx=-dy,ny=dx,half=Math.max(0,Math.floor(width/2));for(let t=start;t<=length;t++)for(let w=-half;w<=half;w++)plotPixel(map,anchor[0]+dx*t+nx*w,anchor[1]+dy*t+ny*w,color)}
function paintRotRect(map,center,direction,w,h,color){const dx=direction[0],dy=direction[1],nx=-dy,ny=dx;for(let v=-Math.floor(h/2);v<=Math.floor(h/2);v++)for(let u=-Math.floor(w/2);u<=Math.floor(w/2);u++)plotPixel(map,center[0]+nx*u+dx*v,center[1]+ny*u+dy*v,color)}
function combinedEquipmentPixels(frameId,slot){const layers=slot==='weapon'?['weaponBack','weaponFront']:['shieldBack','shieldFront'];return layers.flatMap(layer=>packLayerPixels(frameId,layer))}
function equipmentAnchorAndDirection(frameId,slot){const hand=FRAME_HAND_ANCHORS[frameId]?.[slot==='weapon'?'left':'right']||null,pixels=combinedEquipmentPixels(frameId,slot);if(!pixels.length)return {anchor:hand||[64,90],direction:[0,-1],pixels};if(!hand){const box=bboxForPixels(pixels);return {anchor:[box.cx,box.cy],direction:[0,-1],pixels}}let far=pixels[0],best=-1;for(const p of pixels){const q=(p[0]-hand[0])**2+(p[1]-hand[1])**2;if(q>best){best=q;far=p}}let dx=far[0]-hand[0],dy=far[1]-hand[1],mag=Math.hypot(dx,dy)||1;return {anchor:hand,direction:[dx/mag,dy/mag],pixels}}
function ballCenter(anchor,direction,size){return [anchor[0]+direction[0]*(size+2),anchor[1]+direction[1]*(size+2)]}
function drawSoccerBall(map,anchor,direction,size,outline,base,light,accent){
  const c=ballCenter(anchor,direction,size);
  plotCircle(map,c[0],c[1],size,outline);plotCircle(map,c[0],c[1],size-1,base);
  plotCircle(map,c[0],c[1],2,outline);
  for(const [u,v] of [[-4,-3],[4,-3],[-4,3],[4,3]])plotCircle(map,c[0]+u,c[1]+v,1,outline);
}
function drawBasketball(map,anchor,direction,size,outline,base,light,accent){
  const c=ballCenter(anchor,direction,size);
  plotCircle(map,c[0],c[1],size,outline);plotCircle(map,c[0],c[1],size-1,base);
  for(let t=-size+1;t<=size-1;t++){plotPixel(map,c[0]+t,c[1],outline);plotPixel(map,c[0],c[1]+t,outline)}
  for(let t=-size+2;t<=size-2;t++){plotPixel(map,c[0]+Math.round(t*.55),c[1]+t,outline);plotPixel(map,c[0]-Math.round(t*.55),c[1]+t,outline)}
  plotPixel(map,c[0]-2,c[1]-3,light);
}
function drawVolleyball(map,anchor,direction,size,outline,base,light,accent){
  const c=ballCenter(anchor,direction,size);
  plotCircle(map,c[0],c[1],size,outline);plotCircle(map,c[0],c[1],size-1,base);
  for(let t=-size+2;t<=size-2;t++){
    plotPixel(map,c[0]+t,c[1]+Math.round(t/3),light);
    plotPixel(map,c[0]-Math.round(t/3),c[1]+t,accent);
    if(t%2===0)plotPixel(map,c[0]+Math.round(t/2),c[1]-t,outline);
  }
  plotCircle(map,c[0]+2,c[1]-2,1,light);
}
function equipmentShapePixels(def,frameId,slot){
  const cacheKey=(def?.id||'')+'|'+frameId+'|'+slot;if(accessoryShapeCache.has(cacheKey))return accessoryShapeCache.get(cacheKey);if(!def||def.kind==='default'){accessoryShapeCache.set(cacheKey,[]);return []}
  const info=equipmentAnchorAndDirection(frameId,slot),map=new Map(),colors=(def.colors||[]).map(c=>rgbaFromHex(c)),outline=colors[0]||[40,40,40,255],base=colors[1]||outline,light=colors[2]||base,accent=colors[3]||outline;
  if(frameId.startsWith('dead-')){for(const p of info.pixels){const tone=((p[0]+p[1])%4===0)?light:(((p[0]+p[1])%3===0)?accent:base);plotPixel(map,p[0],p[1],tone)}const out=[...map.values()];accessoryShapeCache.set(cacheKey,out);return out}
  const a=info.anchor,d=info.direction,n=[-d[1],d[0]],len=Number(def.length)||24,w=Number(def.width)||3,size=Number(def.size)||7,far=[a[0]+d[0]*len,a[1]+d[1]*len];
  if(def.kind==='pencil'){paintSegment(map,a,d,len,w+2,outline);paintSegment(map,a,d,len-3,w,base);paintSegment(map,[far[0]-d[0]*3,far[1]-d[1]*3],d,3,1,outline);paintSegment(map,a,d,3,w,accent)}
  else if(def.kind==='colored-pencils'){for(const off of [-3,0,3]){const aa=[a[0]+n[0]*off,a[1]+n[1]*off],col=off<0?base:(off>0?accent:light);paintSegment(map,aa,d,len,2,outline);paintSegment(map,aa,d,len-2,1,col)}}
  else if(def.kind==='marker'){paintSegment(map,a,d,len,w+2,outline);paintSegment(map,a,d,len-5,w,base);paintSegment(map,[far[0]-d[0]*5,far[1]-d[1]*5],d,5,w,accent)}
  else if(def.kind==='crayon'){paintSegment(map,a,d,len,w+2,outline);paintSegment(map,a,d,len-3,w,base);paintSegment(map,[a[0]+d[0]*7,a[1]+d[1]*7],d,5,w,light)}
  else if(def.kind==='brush'){paintSegment(map,a,d,len-7,3,outline);paintSegment(map,a,d,len-7,1,base);paintRotRect(map,[far[0]-d[0]*3,far[1]-d[1]*3],d,7,7,accent);paintSegment(map,[far[0]-d[0]*5,far[1]-d[1]*5],d,4,3,light)}
  else if(def.kind==='flute'||def.kind==='recorder'){paintSegment(map,a,d,len,w+2,outline);paintSegment(map,a,d,len,w,base);for(let t=7;t<len-3;t+=5)plotPixel(map,a[0]+d[0]*t+n[0],a[1]+d[1]*t+n[1],accent);if(def.kind==='recorder')paintRotRect(map,[far[0]-d[0]*2,far[1]-d[1]*2],d,w+3,5,light)}
  else if(def.kind==='broom'){paintSegment(map,a,d,len-7,2,outline);paintSegment(map,a,d,len-7,1,base);paintRotRect(map,[far[0]-d[0]*3,far[1]-d[1]*3],d,11,7,accent)}
  else if(def.kind==='rocket'){paintRotRect(map,[a[0]+d[0]*10,a[1]+d[1]*10],d,7,16,outline);paintRotRect(map,[a[0]+d[0]*10,a[1]+d[1]*10],d,5,14,base);plotPixel(map,far[0],far[1],accent);plotPixel(map,far[0]+n[0]*2-d[0]*2,far[1]+n[1]*2-d[1]*2,accent);plotPixel(map,far[0]-n[0]*2-d[0]*2,far[1]-n[1]*2-d[1]*2,accent);paintRotRect(map,[a[0]+d[0]*3+n[0]*4,a[1]+d[1]*3+n[1]*4],d,4,5,accent);paintRotRect(map,[a[0]+d[0]*3-n[0]*4,a[1]+d[1]*3-n[1]*4],d,4,5,accent)}
  else if(def.kind==='scissors'){const d1=[d[0]*.94+n[0]*.34,d[1]*.94+n[1]*.34],d2=[d[0]*.94-n[0]*.34,d[1]*.94-n[1]*.34];paintSegment(map,a,d1,len,2,outline);paintSegment(map,a,d2,len,2,light);plotCircle(map,a[0]+n[0]*4-d[0]*2,a[1]+n[1]*4-d[1]*2,3,base,true);plotCircle(map,a[0]-n[0]*4-d[0]*2,a[1]-n[1]*4-d[1]*2,3,base,true)}
  else if(def.kind==='wand'){paintSegment(map,a,d,len-5,2,outline);paintSegment(map,a,d,len-5,1,base);const c=[far[0]-d[0]*2,far[1]-d[1]*2],pts=[[0,-5],[2,-1],[5,0],[2,2],[3,5],[0,3],[-3,5],[-2,2],[-5,0],[-2,-1]];for(const [u,v] of pts)plotPixel(map,c[0]+n[0]*u+d[0]*v,c[1]+n[1]*u+d[1]*v,accent);plotCircle(map,c[0],c[1],2,light)}
  else if(def.kind==='soccer-ball'){drawSoccerBall(map,a,d,size,outline,base,light,accent)}
  else if(def.kind==='basketball'){drawBasketball(map,a,d,size,outline,base,light,accent)}
  else if(def.kind==='volleyball'){drawVolleyball(map,a,d,size,outline,base,light,accent)}
  else if(def.kind==='handheld-game'){
    const c=[a[0]+d[0]*9,a[1]+d[1]*9];paintRotRect(map,c,d,19,12,outline);paintRotRect(map,c,d,17,10,base);paintRotRect(map,[c[0]+n[0]*1-d[0],c[1]+n[1]*1-d[1]],d,8,6,light);
    plotPixel(map,c[0]-n[0]*6,c[1]-n[1]*6,accent);plotPixel(map,c[0]-n[0]*4+d[0]*2,c[1]-n[1]*4+d[1]*2,accent);plotCircle(map,c[0]+n[0]*6,c[1]+n[1]*6,1,accent)
  }
  else if(def.kind==='camera'){
    const c=[a[0]+d[0]*9,a[1]+d[1]*9];paintRotRect(map,c,d,17,12,outline);paintRotRect(map,c,d,15,10,base);plotCircle(map,c[0],c[1],4,outline);plotCircle(map,c[0],c[1],3,light);plotCircle(map,c[0],c[1],1,accent);paintRotRect(map,[c[0]-d[0]*6+n[0]*4,c[1]-d[1]*6+n[1]*4],d,5,3,accent)
  }
  else if(def.kind==='magnifier'){
    paintSegment(map,a,d,len-8,4,outline);paintSegment(map,a,d,len-8,2,base);const c=[a[0]+d[0]*(len-3),a[1]+d[1]*(len-3)];plotCircle(map,c[0],c[1],size,outline,true);plotCircle(map,c[0],c[1],size-2,light,true);plotPixel(map,c[0]-2,c[1]-2,accent)
  }
  else if(def.kind==='telescope'){
    paintSegment(map,a,d,len,7,outline);paintSegment(map,a,d,len-2,5,base);for(const t of [5,12,20])paintRotRect(map,[a[0]+d[0]*t,a[1]+d[1]*t],d,8,3,accent);paintRotRect(map,[far[0]-d[0]*2,far[1]-d[1]*2],d,10,5,light)
  }
  else if(def.kind==='microphone'){
    paintSegment(map,a,d,len-6,5,outline);paintSegment(map,a,d,len-6,3,base);const c=[far[0]-d[0]*2,far[1]-d[1]*2];plotCircle(map,c[0],c[1],5,outline);plotCircle(map,c[0],c[1],4,light);for(const off of [-2,0,2])plotPixel(map,c[0]+n[0]*off,c[1]+n[1]*off,accent)
  }
  else if(def.kind==='guitar'||def.kind==='ukulele'){
    const small=def.kind==='ukulele',bodyR=small?5:7,bodyT=small?12:15,neckEnd=len;paintSegment(map,a,d,neckEnd,4,outline);paintSegment(map,a,d,neckEnd-2,2,light);
    const c=[a[0]+d[0]*bodyT,a[1]+d[1]*bodyT];plotCircle(map,c[0]+n[0]*2,c[1]+n[1]*2,bodyR,outline);plotCircle(map,c[0]-n[0]*2,c[1]-n[1]*2,bodyR,outline);plotCircle(map,c[0],c[1],bodyR-1,base);plotCircle(map,c[0],c[1],2,outline);paintRotRect(map,[far[0]-d[0],far[1]-d[1]],d,7,5,accent)
  }
  else if(def.kind==='fishing-rod'){
    paintSegment(map,a,d,len,3,outline);paintSegment(map,a,d,len,1,base);plotCircle(map,a[0]+d[0]*5+n[0]*4,a[1]+d[1]*5+n[1]*4,3,accent,true);
    for(let t=0;t<=12;t++){const bend=Math.round((t*t)/18);plotPixel(map,far[0]+n[0]*Math.round(t/3)+d[0]*bend,far[1]+n[1]*Math.round(t/3)+d[1]*bend,light)}plotCircle(map,far[0]+n[0]*4+d[0]*8,far[1]+n[1]*4+d[1]*8,1,accent)
  }
  else if(def.kind==='bug-net'){
    paintSegment(map,a,d,len-6,3,outline);paintSegment(map,a,d,len-6,1,base);const c=[far[0]-d[0]*2,far[1]-d[1]*2];plotCircle(map,c[0],c[1],size,outline,true);for(let t=-size+2;t<=size-2;t+=3){plotPixel(map,c[0]+n[0]*t+d[0]*Math.round(t/2),c[1]+n[1]*t+d[1]*Math.round(t/2),light);plotPixel(map,c[0]+n[0]*t-d[0]*Math.round(t/2),c[1]+n[1]*t-d[1]*Math.round(t/2),light)}
  }
  else if(def.kind==='water-gun'){
    const c=[a[0]+d[0]*8,a[1]+d[1]*8];paintRotRect(map,c,d,14,9,outline);paintRotRect(map,c,d,12,7,base);paintSegment(map,[c[0]+d[0]*5,c[1]+d[1]*5],d,len-9,4,outline);paintSegment(map,[c[0]+d[0]*5,c[1]+d[1]*5],d,len-11,2,light);paintRotRect(map,[c[0]-d[0]*2-n[0]*6,c[1]-d[1]*2-n[1]*6],d,5,9,accent);plotCircle(map,c[0]+n[0]*4,c[1]+n[1]*4,2,light)
  }
  else if(def.kind==='balloon'){
    paintSegment(map,a,d,len-8,1,outline);const c=[far[0]-d[0]*2,far[1]-d[1]*2];plotCircle(map,c[0],c[1],size,outline);plotCircle(map,c[0],c[1],size-1,base);plotCircle(map,c[0]-2,c[1]-3,1,light);plotPixel(map,c[0]-d[0]*(size+1),c[1]-d[1]*(size+1),accent)
  }
  else if(def.kind==='bouquet'){
    for(const off of [-2,0,2])paintSegment(map,[a[0]+n[0]*off,a[1]+n[1]*off],d,len-6,1,base);const c=[far[0]-d[0]*3,far[1]-d[1]*3];for(const off of [-5,0,5]){plotCircle(map,c[0]+n[0]*off,c[1]+n[1]*off,3,outline);plotCircle(map,c[0]+n[0]*off,c[1]+n[1]*off,2,off===0?accent:light)}paintRotRect(map,[a[0]+d[0]*8,a[1]+d[1]*8],d,8,7,accent)
  }
  else if(def.kind==='ice-cream'){
    for(let t=0;t<len-7;t++){const half=Math.max(1,Math.round((len-7-t)/5));for(let off=-half;off<=half;off++)plotPixel(map,a[0]+d[0]*t+n[0]*off,a[1]+d[1]*t+n[1]*off,t%3===0?light:base)}const c=[far[0]-d[0]*3,far[1]-d[1]*3];plotCircle(map,c[0],c[1],size,outline);plotCircle(map,c[0],c[1],size-1,accent);plotCircle(map,c[0]-2,c[1]-2,1,light)
  }
  else if(def.kind==='cotton-candy'){
    paintSegment(map,a,d,len-8,3,outline);paintSegment(map,a,d,len-8,1,base);const c=[far[0]-d[0]*3,far[1]-d[1]*3];for(const [u,v,r] of [[0,0,size],[4,-2,size-2],[-4,-2,size-2],[0,-5,size-2]]){plotCircle(map,c[0]+n[0]*u+d[0]*v,c[1]+n[1]*u+d[1]*v,r,outline);plotCircle(map,c[0]+n[0]*u+d[0]*v,c[1]+n[1]*u+d[1]*v,Math.max(1,r-1),light)}plotCircle(map,c[0]-2,c[1]-3,1,accent)
  }
  else if(def.kind==='hamburger'){
    const c=ballCenter(a,d,size);paintRotRect(map,[c[0]-d[0]*4,c[1]-d[1]*4],d,15,5,outline);paintRotRect(map,[c[0]-d[0]*4,c[1]-d[1]*4],d,13,3,base);paintRotRect(map,c,d,14,4,accent);paintRotRect(map,[c[0]+d[0]*3,c[1]+d[1]*3],d,14,3,light);paintRotRect(map,[c[0]+d[0]*6,c[1]+d[1]*6],d,15,5,outline);paintRotRect(map,[c[0]+d[0]*6,c[1]+d[1]*6],d,13,3,base)
  }
  else if(def.kind==='drink'){
    const c=[a[0]+d[0]*8,a[1]+d[1]*8];paintRotRect(map,c,d,10,14,outline);paintRotRect(map,c,d,8,12,base);paintRotRect(map,[c[0]+d[0]*2,c[1]+d[1]*2],d,6,6,light);paintSegment(map,[c[0]+n[0]*2+d[0]*5,c[1]+n[1]*2+d[1]*5],d,len-10,2,accent)
  }
  else if(def.kind==='lantern'){
    const c=[a[0]+d[0]*8,a[1]+d[1]*8];paintRotRect(map,c,d,12,14,outline);paintRotRect(map,c,d,9,10,base);paintRotRect(map,c,d,6,7,light);plotCircle(map,c[0],c[1],2,accent);plotCircle(map,c[0]-d[0]*8,c[1]-d[1]*8,6,outline,true)
  }
  else if(def.kind==='treasure-map'){
    const c=[a[0]+d[0]*8,a[1]+d[1]*8];paintRotRect(map,c,d,18,15,outline);paintRotRect(map,c,d,16,13,light);for(const off of [-8,8])plotCircle(map,c[0]+n[0]*off,c[1]+n[1]*off,2,base);
    for(const [u,v] of [[-5,-4],[-2,-2],[1,-1],[3,2]])plotCircle(map,c[0]+n[0]*u+d[0]*v,c[1]+n[1]*u+d[1]*v,1,accent);for(const [u,v] of [[5,4],[3,6],[5,6],[3,4]])plotPixel(map,c[0]+n[0]*u+d[0]*v,c[1]+n[1]*u+d[1]*v,accent)
  }
  else if(def.kind==='eraser'){paintRotRect(map,[a[0]+d[0]*6,a[1]+d[1]*6],d,11,7,outline);paintRotRect(map,[a[0]+d[0]*6,a[1]+d[1]*6],d,9,5,base);paintRotRect(map,[a[0]+d[0]*8,a[1]+d[1]*8],d,4,5,light)}
  else if(def.kind==='tablet'){paintRotRect(map,[a[0]+d[0]*8,a[1]+d[1]*8],d,12,17,outline);paintRotRect(map,[a[0]+d[0]*8,a[1]+d[1]*8],d,9,13,base);paintRotRect(map,[a[0]+d[0]*9,a[1]+d[1]*9],d,7,9,light)}
  else if(def.kind==='dustpan'){paintSegment(map,a,d,13,2,outline);paintSegment(map,a,d,12,1,base);paintRotRect(map,[a[0]+d[0]*17,a[1]+d[1]*17],d,15,9,outline);paintRotRect(map,[a[0]+d[0]*17,a[1]+d[1]*17],d,12,6,base)}
  else if(def.kind==='sharpener'){const c=[a[0]+d[0]*7,a[1]+d[1]*7];paintRotRect(map,c,d,11,10,outline);paintRotRect(map,c,d,9,8,base);plotCircle(map,c[0]+n[0]*2,c[1]+n[1]*2,2,accent)}
  else if(def.kind==='teddy'){const c=[a[0]+d[0]*9,a[1]+d[1]*9];plotCircle(map,c[0],c[1]-4,5,outline);plotCircle(map,c[0],c[1]-4,4,base);plotCircle(map,c[0]+n[0]*5,c[1]-4+n[1]*5,2,base);plotCircle(map,c[0]-n[0]*5,c[1]-4-n[1]*5,2,base);plotCircle(map,c[0],c[1]+4,5,outline);plotCircle(map,c[0],c[1]+4,4,light);plotPixel(map,c[0],c[1]-3,accent)}
  else if(def.kind==='pillow'){const c=[a[0]+d[0]*8,a[1]+d[1]*8];paintRotRect(map,c,d,15,11,outline);paintRotRect(map,c,d,13,9,base);paintRotRect(map,c,d,7,5,light)}
  const out=[...map.values()];accessoryShapeCache.set(cacheKey,out);return out;
}
function equipmentPassPixels(def,frameId,slot,pass){if(def?.kind==='default'){const layer=slot==='weapon'?(pass==='back'?'weaponBack':'weaponFront'):(pass==='back'?'shieldBack':'shieldFront');return packLayerPixels(frameId,layer)}const all=equipmentShapePixels(def,frameId,slot);if(!all.length)return [];if(slot==='weapon'&&toolCatalog?.attackBackFrames?.includes(frameId))return pass==='back'?all:[];const backLayer=slot==='weapon'?'weaponBack':'shieldBack',backCoords=packLayerPixels(frameId,backLayer).map(p=>[p[0],p[1]]),isBack=p=>backCoords.some(([x,y])=>Math.abs(x-p[0])+Math.abs(y-p[1])<=2);return all.filter(p=>(pass==='back')===isBack(p))}
const ACCESSORY_OUTLINE=[24,20,23,255];
function accessoryOutlinePixels(pixels,color=ACCESSORY_OUTLINE){
  const src=new Set((pixels||[]).map(p=>p[0]+','+p[1])),out=new Map();
  const dirs=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  for(const p of pixels||[]){
    for(const [dx,dy] of dirs){
      const x=p[0]+dx,y=p[1]+dy,key=x+','+y;
      if(x<0||y<0||x>=SIZE||y>=SIZE||src.has(key)||out.has(key))continue;
      out.set(key,[x,y,color[0],color[1],color[2],color[3]]);
    }
  }
  return [...out.values()];
}
function drawPixelTuples(target,pixels,withOutline=false){
  if(withOutline){
    for(const p of accessoryOutlinePixels(pixels)){target.fillStyle='rgba('+p[2]+','+p[3]+','+p[4]+','+(p[5]/255)+')';target.fillRect(p[0],p[1],1,1)}
  }
  for(const p of pixels){target.fillStyle='rgba('+p[2]+','+p[3]+','+p[4]+','+(p[5]/255)+')';target.fillRect(p[0],p[1],1,1)}
}
function drawEquipmentPass(target,frameId,slot,id,pass){const catalog=slot==='weapon'?toolCatalog:teachingAidCatalog,def=catalog?.items?.find(item=>item.id===id)||catalog?.items?.find(item=>item.id===catalog?.defaultId);if(def)drawPixelTuples(target,equipmentPassPixels(def,frameId,slot,pass),true)}
function stripDefaultEquipment(target,frameId){stripPackedLayers(target,frameId,['weaponBack','weaponFront','shieldBack','shieldFront'],['earring','hair','mouth','eyes','upper','shoes','lower'])}
function earringShapePixels(def,frameId){
  const key=(def?.id||'')+'|'+frameId+'|earring';if(accessoryShapeCache.has(key))return accessoryShapeCache.get(key);const base=packLayerPixels(frameId,'earring'),box=bboxForPixels(base);if(!def||def.kind==='default'||!box){accessoryShapeCache.set(key,[]);return []}
  const map=new Map(),colors=(def.colors||[]).map(c=>rgbaFromHex(c)),outline=colors[0],fill=colors[1],light=colors[2]||fill,cx=Math.round(box.cx),cy=Math.round(box.cy);
  if(def.kind==='star'){for(const [x,y] of [[0,-4],[1,-1],[4,-1],[2,1],[3,4],[0,2],[-3,4],[-2,1],[-4,-1],[-1,-1]])plotPixel(map,cx+x,cy+y,fill);plotCircle(map,cx,cy,1,light)}
  else if(def.kind==='crescent'){plotCircle(map,cx,cy,4,fill);for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)if((x-2)*(x-2)+y*y<=10)map.delete((cx+x)+','+(cy+y))}
  else if(def.kind==='ring')plotCircle(map,cx,cy,4,fill,true);
  else if(def.kind==='pearl'){plotCircle(map,cx,cy+1,3,fill);plotCircle(map,cx-1,cy,1,light);plotPixel(map,cx,cy-3,outline)}
  else if(def.kind==='heart'){for(const [x,y] of [[-2,-2],[-1,-3],[0,-2],[1,-3],[2,-2],[-3,-1],[-2,0],[-1,1],[0,2],[1,1],[2,0],[3,-1]])plotPixel(map,cx+x,cy+y,fill);plotPixel(map,cx,cy-1,light)}
  else if(def.kind==='flower'){plotCircle(map,cx,cy,1,light);for(const [x,y] of [[0,-3],[3,0],[0,3],[-3,0],[2,-2],[-2,-2],[2,2],[-2,2]])plotCircle(map,cx+x,cy+y,1,fill)}
  else if(def.kind==='bolt'){for(const [x,y] of [[1,-4],[-2,0],[0,0],[-1,4],[3,-1],[1,-1]])plotPixel(map,cx+x,cy+y,fill);plotPixel(map,cx,cy-2,light)}
  else if(def.kind==='drop'){plotCircle(map,cx,cy+1,3,fill);for(let t=0;t<4;t++)plotPixel(map,cx,cy-4+t,fill);plotPixel(map,cx-1,cy,light)}
  else if(def.kind==='bow'){plotCircle(map,cx-3,cy,2,fill);plotCircle(map,cx+3,cy,2,fill);plotCircle(map,cx,cy,1,light);plotPixel(map,cx-2,cy+3,fill);plotPixel(map,cx+2,cy+3,fill)}
  else if(def.kind==='gem'){for(let y=-3;y<=3;y++){const span=3-Math.abs(y);for(let x=-span;x<=span;x++)plotPixel(map,cx+x,cy+y,fill)}plotPixel(map,cx-1,cy-1,light)}
  const out=[...map.values()];accessoryShapeCache.set(key,out);return out;
}
function applyEarringSelection(target,frameId,id=selectedEarringId()){
  if(!earringCatalog||!schoolPack||!id)return false;
  if(id===earringCatalog.defaultId){drawPixelTuples(target,accessoryOutlinePixels(packLayerPixels(frameId,'earring')));return true}
  const def=earringCatalog.items.find(item=>item.id===id);if(!def)return false;
  stripPackedLayers(target,frameId,['earring'],['hair','mouth','eyes','upper','shoes','lower']);
  drawPixelTuples(target,earringShapePixels(def,frameId),true);return true
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

const COMBAT_GEAR_PALETTES={
  padded:{dark:'#8f8175',mid:'#d8cec3',light:'#f4efe9',accent:'#b89f83'},
  iron:{dark:'#5f6973',mid:'#aeb9c3',light:'#e6edf2',accent:'#7e91a3'},
  wood:{dark:'#5d402a',mid:'#9b6c43',light:'#d3a06b',accent:'#6d4b31'}
};
function combatGearFamily(type){
  if(String(type||'').startsWith('iron'))return 'iron';
  if(String(type||'').startsWith('padded'))return 'padded';
  if(String(type||'').startsWith('wood'))return 'wood';
  return 'iron';
}
function combatGearPalette(type){
  const p=COMBAT_GEAR_PALETTES[combatGearFamily(type)]||COMBAT_GEAR_PALETTES.iron;
  return {dark:rgbaFromHex(p.dark),mid:rgbaFromHex(p.mid),light:rgbaFromHex(p.light),accent:rgbaFromHex(p.accent)};
}
function combatShadePixel(p,palette){
  const lum=(Number(p?.[2])||0)+(Number(p?.[3])||0)+(Number(p?.[4])||0);
  const c=lum>610?palette.light:lum<310?palette.dark:palette.mid;
  return [p[0],p[1],c[0],c[1],c[2],p[5]??255];
}
function combatLayerPixels(frameId,layer,type){
  const palette=combatGearPalette(type);
  return packLayerPixels(frameId,layer).map(p=>combatShadePixel(p,palette));
}
function combatHelmetPixels(frameId,type){
  const src=packLayerPixels(frameId,'hair'),box=bboxForPixels(src);if(!box)return [];
  const palette=combatGearPalette(type),cut=box.minY+Math.max(7,Math.round(box.h*.58)),map=new Map();
  for(const p of src){
    if(p[1]>cut)continue;
    const c=combatShadePixel(p,palette);plotPixel(map,c[0],c[1],c.slice(2));
  }
  // A small brow rim makes the helmet readable without covering the eyes.
  for(let x=Math.ceil(box.minX+3);x<=Math.floor(box.maxX-3);x++){
    if((x+frameId.length)%3!==0)continue;
    plotPixel(map,x,Math.min(cut,box.minY+Math.round(box.h*.50)),palette.accent);
  }
  return [...map.values()];
}
function combatShieldPixels(frameId,type){
  const palette=combatGearPalette(type),info=equipmentAnchorAndDirection(frameId,'shield'),anchor=info.anchor;
  if(!anchor)return [];
  const dir=info.direction||[1,0],cx=anchor[0]+dir[0]*8,cy=anchor[1]+dir[1]*8,map=new Map();
  for(let y=-9;y<=9;y++)for(let x=-7;x<=7;x++){
    const q=(x*x)/(7*7)+(y*y)/(9*9);
    if(q<=1){
      const edge=q>.72,c=edge?palette.dark:((x+y)%7===0?palette.light:palette.mid);
      plotPixel(map,cx+x,cy+y,c);
    }
  }
  for(let y=-5;y<=5;y++)plotPixel(map,cx,cy+y,palette.accent);
  return [...map.values()];
}
function combatWeaponPixels(frameId,type){
  if(!type)return [];
  const palette=combatGearPalette(type.includes('iron')?'iron':type.includes('stone')?'iron':'wood');
  const info=equipmentAnchorAndDirection(frameId,'weapon'),anchor=info.anchor;if(!anchor)return [];
  const dir=info.direction||[0,-1],nx=-dir[1],ny=dir[0],map=new Map();
  const sword=String(type).endsWith('Sword'),pick=String(type).endsWith('Pick');
  if(!sword&&!pick)return [];
  const shaft=pick?palette.accent:palette.dark;
  paintSegment(map,anchor,dir,pick?19:22,pick?2:3,shaft,1);
  if(sword){
    for(let t=7;t<=22;t++){
      const c=t>=20?palette.light:palette.mid;
      plotPixel(map,anchor[0]+dir[0]*t,anchor[1]+dir[1]*t,c);
      plotPixel(map,anchor[0]+dir[0]*t+nx,anchor[1]+dir[1]*t+ny,c);
    }
    for(let w=-5;w<=5;w++)plotPixel(map,anchor[0]+dir[0]*5+nx*w,anchor[1]+dir[1]*5+ny*w,palette.accent);
  }else{
    const tx=anchor[0]+dir[0]*19,ty=anchor[1]+dir[1]*19;
    for(let w=-7;w<=7;w++){
      const c=Math.abs(w)>5?palette.light:palette.mid;
      plotPixel(map,tx+nx*w,ty+ny*w,c);
    }
  }
  return [...map.values()];
}
function drawCombatGearOverlay(target,frameId,gear){
  if(!gear||typeof gear!=='object')return;
  if(gear.legs)drawPixelTuples(target,combatLayerPixels(frameId,'lower',gear.legs));
  if(gear.chest)drawPixelTuples(target,combatLayerPixels(frameId,'upper',gear.chest));
  if(gear.feet)drawPixelTuples(target,combatLayerPixels(frameId,'shoes',gear.feet));
  if(gear.head)drawPixelTuples(target,combatHelmetPixels(frameId,gear.head),true);
  if(gear.shield)drawPixelTuples(target,combatShieldPixels(frameId,gear.shield),true);
  if(gear.weapon)drawPixelTuples(target,combatWeaponPixels(frameId,gear.weapon),true);
}

function drawFrame(target,index,eyeId=selectedEyeId(),hairId=selectedHairId(),upperId=selectedUpperId(),lowerId=selectedLowerId(),earringId=selectedEarringId(),shoesId=selectedShoeId(),toolId=selectedToolId(),aidId=selectedTeachingAidId(),hairColorId=selectedHairColorId(),wardrobeOverrides={},effectId=selectedEffectId()){
  if(!sheet)return;
  const frameId=manifest?.frameOrder?.[index]||'stand-01';
  const base=document.createElement('canvas');base.width=SIZE;base.height=SIZE;
  const baseCtx=base.getContext('2d',{alpha:true});baseCtx.imageSmoothingEnabled=false;
  const customHair=hairCatalog&&hairId&&hairId!==hairCatalog.defaultId;
  const coloredHair=hairColorCatalog&&hairColorId&&hairColorId!==hairColorCatalog.defaultId;
  const cleanBody=bodyFrameCanvas(frameId)||wardrobe?.body(frameId);
  const wardrobeIds={...state.assetIds,...wardrobeOverrides};

  if(cleanBody){
    baseCtx.drawImage(cleanBody,0,0);
    recolorSkin(baseCtx,frameId);
    drawPixelTuples(baseCtx,packLayerPixels(frameId,'eyes'));
    if(wardrobe)wardrobe.draw(baseCtx,frameId,'mouth',wardrobeIds);
    else drawPixelTuples(baseCtx,packLayerPixels(frameId,'mouth'));
    if(!lowerParts.get(lowerId)?.frames)drawPixelTuples(baseCtx,packLayerPixels(frameId,'lower'));
    applyLowerPart(baseCtx,frameId,lowerId);
    if(!upperParts.get(upperId)?.frames)drawPixelTuples(baseCtx,packLayerPixels(frameId,'upper'));
    applyUpperPart(baseCtx,frameId,upperId);
    drawPixelTuples(baseCtx,packLayerPixels(frameId,'shoes'));
    applyEyePart(baseCtx,frameId,eyeId);
    if(customHair)paintHairLayer(baseCtx,hairLayerCanvas(hairId,frameId,hairColorId));
    else drawPixelTuples(baseCtx,recolorHairPixels(packLayerPixels(frameId,'hair'),hairColorId));
    applyShoeSelection(baseCtx,frameId,shoesId);
    drawPixelTuples(baseCtx,packLayerPixels(frameId,'earring'));
    applyEarringSelection(baseCtx,frameId,earringId);
  }else{
    baseCtx.drawImage(sheet,index*SIZE,0,SIZE,SIZE,0,0,SIZE,SIZE);
    recolorSkin(baseCtx,frameId);
    applyUpperPart(baseCtx,frameId,upperId);
    applyLowerPart(baseCtx,frameId,lowerId);
    if(customHair||coloredHair)clearBaseHair(baseCtx,frameId);
    applyEyePart(baseCtx,frameId,eyeId);
    if(customHair)paintHairLayer(baseCtx,hairLayerCanvas(hairId,frameId,hairColorId));
    else if(coloredHair)drawPixelTuples(baseCtx,recolorHairPixels(packLayerPixels(frameId,'hair'),hairColorId));
    applyShoeSelection(baseCtx,frameId,shoesId);
    applyEarringSelection(baseCtx,frameId,earringId);
    stripDefaultEquipment(baseCtx,frameId);
  }

  if(wardrobe){wardrobe.draw(baseCtx,frameId,'mask',wardrobeIds);wardrobe.draw(baseCtx,frameId,'hat',wardrobeIds)}
  target.save();target.setTransform(1,0,0,1,0,0);target.clearRect(0,0,SIZE,SIZE);target.imageSmoothingEnabled=false;
  drawEffectPass(target,frameId,effectId,'back');
  if(wardrobe)wardrobe.draw(target,frameId,'back',wardrobeIds);
  if(toolId!=='__none__')drawEquipmentPass(target,frameId,'weapon',toolId,'back');
  if(aidId!=='__none__')drawEquipmentPass(target,frameId,'shield',aidId,'back');
  target.drawImage(base,0,0);
  if(aidId!=='__none__')drawEquipmentPass(target,frameId,'shield',aidId,'front');
  if(toolId!=='__none__')drawEquipmentPass(target,frameId,'weapon',toolId,'front');
  drawEffectPass(target,frameId,effectId,'front');
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
function renderPreviewFrame(mode='stand',time=0,options={}){
  if(!sheet)return previewData();
  const frame=frameAt(mode,time),gear=options?.combatGear&&typeof options.combatGear==='object'?options.combatGear:null;
  const off=document.createElement('canvas');
  off.width=SIZE;off.height=SIZE;
  const offCtx=off.getContext('2d',{alpha:true});
  offCtx.imageSmoothingEnabled=false;
  drawFrame(offCtx,frame.index||0,selectedEyeId(),selectedHairId(),selectedUpperId(),selectedLowerId(),
    selectedEarringId(),selectedShoeId(),gear?.weapon?'__none__':selectedToolId(),
    gear?.shield?'__none__':selectedTeachingAidId(),selectedHairColorId(),{},selectedEffectId());
  drawCombatGearOverlay(offCtx,frame.id||manifest?.frameOrder?.[frame.index||0]||'stand-01',gear);
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
  const fullCtx=full.getContext('2d',{alpha:true});fullCtx.imageSmoothingEnabled=false;drawFrame(fullCtx,0,id,hairCatalog?.defaultId||selectedHairId(),upperCatalog?.defaultId||selectedUpperId());
  const thumb=canvasElement.getContext('2d',{alpha:true});thumb.imageSmoothingEnabled=false;thumb.clearRect(0,0,SIZE,SIZE);thumb.drawImage(full,42,20,46,46,0,0,SIZE,SIZE);
}
async function hydrateEyeThumbnails(){
  if(!eyeCatalog)return;await Promise.allSettled(eyeCatalog.items.filter(item=>item.id!==eyeCatalog.defaultId).map(item=>loadEyePart(item.id)));
  if(currentTab!=='eyes')return;optionGrid.querySelectorAll('canvas[data-eye-thumb]').forEach(el=>drawEyeThumbnail(el,el.dataset.eyeThumb));
}
function renderEyeOptions(){
  const items=eyeCatalog?.items||[],selected=selectedEyeId();pickerTitle.textContent='눈';pickerCount.textContent=items.length+'가지';optionGrid.classList.remove('skin-mode');
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selected;return `<button type='button' class='option${active?' active':''}' aria-pressed='${active?'true':'false'}' data-eye-id='${item.id}'><span class='hair-thumb'><canvas width='128' height='128' data-eye-thumb='${item.id}' aria-hidden='true'></canvas></span><span class='num'>${active?'✓':index+1}</span><span class='part-name'>${item.label}</span></button>`}).join('');
  optionGrid.querySelectorAll('canvas[data-eye-thumb]').forEach(el=>{if(el.dataset.eyeThumb===eyeCatalog.defaultId)drawEyeThumbnail(el,el.dataset.eyeThumb)});hydrateEyeThumbnails();
}
function drawHairThumbnail(canvasElement,id){
  if(!canvasElement)return;const full=document.createElement('canvas');full.width=SIZE;full.height=SIZE;
  const fullCtx=full.getContext('2d',{alpha:true});fullCtx.imageSmoothingEnabled=false;drawFrame(fullCtx,0,eyeCatalog?.defaultId||selectedEyeId(),id,upperCatalog?.defaultId||selectedUpperId());
  const thumb=canvasElement.getContext('2d',{alpha:true});thumb.imageSmoothingEnabled=false;thumb.clearRect(0,0,SIZE,SIZE);thumb.drawImage(full,32,10,72,72,0,0,SIZE,SIZE);
}
async function hydrateHairThumbnails(){
  if(!hairCatalog)return;await Promise.allSettled(hairCatalog.items.filter(item=>item.id!==hairCatalog.defaultId).map(item=>loadHairPart(item.id)));
  if(currentTab!=='hair')return;optionGrid.querySelectorAll('canvas[data-hair-thumb]').forEach(el=>drawHairThumbnail(el,el.dataset.hairThumb));
}
function renderHairOptions(){
  const items=hairCatalog?.items||[],selected=selectedHairId();pickerTitle.textContent='헤어';pickerCount.textContent=items.length+'가지';optionGrid.classList.remove('skin-mode');
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selected;return `<button type='button' class='option${active?' active':''}' aria-pressed='${active?'true':'false'}' data-hair-id='${item.id}'><span class='hair-thumb'><canvas width='128' height='128' data-hair-thumb='${item.id}' aria-hidden='true'></canvas></span><span class='num'>${active?'✓':index+1}</span><span class='part-name'>${item.label}</span></button>`}).join('');
  optionGrid.querySelectorAll('canvas[data-hair-thumb]').forEach(el=>{if(el.dataset.hairThumb===hairCatalog.defaultId)drawHairThumbnail(el,el.dataset.hairThumb)});hydrateHairThumbnails();
}
function drawHairColorThumbnail(canvasElement,colorId){
  if(!canvasElement)return;
  const full=document.createElement('canvas');full.width=SIZE;full.height=SIZE;
  const c=full.getContext('2d',{alpha:true});c.imageSmoothingEnabled=false;
  drawFrame(c,0,eyeCatalog?.defaultId||selectedEyeId(),selectedHairId(),upperCatalog?.defaultId||selectedUpperId(),lowerCatalog?.defaultId||selectedLowerId(),selectedEarringId(),selectedShoeId(),selectedToolId(),selectedTeachingAidId(),colorId);
  const thumb=canvasElement.getContext('2d',{alpha:true});thumb.imageSmoothingEnabled=false;thumb.clearRect(0,0,SIZE,SIZE);thumb.drawImage(full,32,10,72,72,0,0,SIZE,SIZE);
}
function renderHairColorOptions(){
  const items=hairColorCatalog?.items||[],selected=selectedHairColorId();
  pickerTitle.textContent='염색';pickerCount.textContent=items.length+'가지';optionGrid.classList.remove('skin-mode');
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selected;return '<button type="button" class="option'+(active?' active':'')+'" aria-pressed="'+(active?'true':'false')+'" data-hair-color-id="'+item.id+'"><span class="hair-thumb"><canvas width="128" height="128" data-hair-color-thumb="'+item.id+'" aria-hidden="true"></canvas></span><span class="num">'+(active?'✓':index+1)+'</span><span class="part-name">'+item.label+'</span></button>'}).join('');
  optionGrid.querySelectorAll('canvas[data-hair-color-thumb]').forEach(el=>drawHairColorThumbnail(el,el.dataset.hairColorThumb));
}

function drawUpperThumbnail(canvasElement,id){
  if(!canvasElement)return;const full=document.createElement('canvas');full.width=SIZE;full.height=SIZE;
  const fullCtx=full.getContext('2d',{alpha:true});fullCtx.imageSmoothingEnabled=false;drawFrame(fullCtx,0,eyeCatalog?.defaultId||selectedEyeId(),hairCatalog?.defaultId||selectedHairId(),id);
  const thumb=canvasElement.getContext('2d',{alpha:true});thumb.imageSmoothingEnabled=false;thumb.clearRect(0,0,SIZE,SIZE);thumb.drawImage(full,40,62,54,46,0,0,SIZE,SIZE);
}
async function hydrateUpperThumbnails(){
  if(!upperCatalog)return;await Promise.allSettled(upperCatalog.items.filter(item=>item.id!==upperCatalog.defaultId).map(item=>loadUpperPart(item.id)));
  if(currentTab!=='upper')return;optionGrid.querySelectorAll('canvas[data-upper-thumb]').forEach(el=>drawUpperThumbnail(el,el.dataset.upperThumb));
}
function renderUpperOptions(){
  const items=upperCatalog?.items||[],selected=selectedUpperId();pickerTitle.textContent='상의';pickerCount.textContent=items.length+'가지';optionGrid.classList.remove('skin-mode');
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selected;return `<button type='button' class='option${active?' active':''}' aria-pressed='${active?'true':'false'}' data-upper-id='${item.id}'><span class='hair-thumb'><canvas width='128' height='128' data-upper-thumb='${item.id}' aria-hidden='true'></canvas></span><span class='num'>${active?'✓':index+1}</span><span class='part-name'>${item.label}</span></button>`}).join('');
  optionGrid.querySelectorAll('canvas[data-upper-thumb]').forEach(el=>{if(el.dataset.upperThumb===upperCatalog.defaultId)drawUpperThumbnail(el,el.dataset.upperThumb)});hydrateUpperThumbnails();
}
function drawLowerThumbnail(canvasElement,id){
  if(!canvasElement)return;const full=document.createElement('canvas');full.width=SIZE;full.height=SIZE;
  const fullCtx=full.getContext('2d',{alpha:true});fullCtx.imageSmoothingEnabled=false;drawFrame(fullCtx,0,eyeCatalog?.defaultId||selectedEyeId(),hairCatalog?.defaultId||selectedHairId(),upperCatalog?.defaultId||selectedUpperId(),id);
  const thumb=canvasElement.getContext('2d',{alpha:true});thumb.imageSmoothingEnabled=false;thumb.clearRect(0,0,SIZE,SIZE);thumb.drawImage(full,45,84,44,34,0,0,SIZE,SIZE);
}
async function hydrateLowerThumbnails(){
  if(!lowerCatalog)return;await Promise.allSettled(lowerCatalog.items.filter(item=>item.id!==lowerCatalog.defaultId).map(item=>loadLowerPart(item.id)));
  if(currentTab!=='lower')return;optionGrid.querySelectorAll('canvas[data-lower-thumb]').forEach(el=>drawLowerThumbnail(el,el.dataset.lowerThumb));
}
function renderLowerOptions(){
  const items=lowerCatalog?.items||[],selected=selectedLowerId();pickerTitle.textContent='하의';pickerCount.textContent=items.length+'가지';optionGrid.classList.remove('skin-mode');
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selected;return `<button type='button' class='option${active?' active':''}' aria-pressed='${active?'true':'false'}' data-lower-id='${item.id}'><span class='hair-thumb'><canvas width='128' height='128' data-lower-thumb='${item.id}' aria-hidden='true'></canvas></span><span class='num'>${active?'✓':index+1}</span><span class='part-name'>${item.label}</span></button>`}).join('');
  optionGrid.querySelectorAll('canvas[data-lower-thumb]').forEach(el=>{if(el.dataset.lowerThumb===lowerCatalog.defaultId)drawLowerThumbnail(el,el.dataset.lowerThumb)});hydrateLowerThumbnails();
}

function drawAccessoryThumbnail(canvasElement,tab,id){
  if(!canvasElement)return;const full=document.createElement('canvas');full.width=SIZE;full.height=SIZE;const c=full.getContext('2d',{alpha:true});c.imageSmoothingEnabled=false;
  const args=[selectedEyeId(),selectedHairId(),selectedUpperId(),selectedLowerId(),selectedEarringId(),selectedShoeId(),selectedToolId(),selectedTeachingAidId()];
  if(tab==='earring')args[4]=id;else if(tab==='shoes')args[5]=id;else if(tab==='weapon')args[6]=id;else if(tab==='shield')args[7]=id;
  if(tab==='effect')drawFrame(c,0,...args,selectedHairColorId(),{},id);else drawFrame(c,0,...args);
  const t=canvasElement.getContext('2d',{alpha:true});t.imageSmoothingEnabled=false;t.clearRect(0,0,SIZE,SIZE);
  if(tab==='earring')t.drawImage(full,72,42,30,34,0,0,SIZE,SIZE);else if(tab==='shoes')t.drawImage(full,40,96,52,32,0,0,SIZE,SIZE);else if(tab==='weapon')t.drawImage(full,18,50,54,64,0,0,SIZE,SIZE);else if(tab==='effect')t.drawImage(full,8,4,112,120,0,0,SIZE,SIZE);else t.drawImage(full,66,62,50,56,0,0,SIZE,SIZE);
}
function renderAccessoryOptions(tab,catalog,selectedId){
  const items=catalog?.items||[],label=PARTS[tab]?.label||tab;pickerTitle.textContent=label;pickerCount.textContent=items.length+'가지';optionGrid.classList.remove('skin-mode');const attr=tab+'-id',thumbAttr=tab+'-thumb';
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selectedId;return '<button type="button" class="option'+(active?' active':'')+'" aria-pressed="'+(active?'true':'false')+'" data-'+attr+'="'+item.id+'"><span class="hair-thumb"><canvas width="128" height="128" data-'+thumbAttr+'="'+item.id+'" aria-hidden="true"></canvas></span><span class="num">'+(active?'✓':index+1)+'</span><span class="part-name">'+item.label+'</span></button>'}).join('');
  optionGrid.querySelectorAll('canvas[data-'+thumbAttr+']').forEach(el=>drawAccessoryThumbnail(el,tab,el.getAttribute('data-'+thumbAttr)));
}
function renderEarringOptions(){renderAccessoryOptions('earring',earringCatalog,selectedEarringId())}
function renderShoeOptions(){renderAccessoryOptions('shoes',shoeCatalog,selectedShoeId())}
function renderEffectOptions(){renderAccessoryOptions('effect',effectCatalog,selectedEffectId())}
function renderToolOptions(){renderAccessoryOptions('weapon',toolCatalog,selectedToolId())}
function renderTeachingAidOptions(){renderAccessoryOptions('shield',teachingAidCatalog,selectedTeachingAidId())}

async function loadWardrobe(){
  wardrobe=await window.KidscadeAvatarWardrobe.create({rootUrl:ROOT,manifest,
    fetchJson:async url=>{const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw new Error('복장 데이터를 불러오지 못했어요.');return response.json()},
    loadImage:url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url}),
    createCanvas:()=>document.createElement('canvas')});
  state.assetIds=await wardrobe.prepare(state.assetIds);
}
function drawWardrobeThumbnail(el,key,id){
  const full=document.createElement('canvas');full.width=SIZE;full.height=SIZE;
  const overrides={[key]:id};if(key==='mouth')overrides.mask='no-mask';
  drawFrame(full.getContext('2d'),0,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,overrides);
  const ctx=el.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,SIZE,SIZE);
  const crops={mask:[41,41,44,30],hat:[31,2,66,57],mouth:[52,53,23,17],back:[20,28,88,92]};ctx.drawImage(full,...(crops[key]||[20,18,88,100]),0,0,SIZE,SIZE);
}
async function renderWardrobeOptions(){
  const key=currentTab,group=wardrobe.category(key),selected=wardrobe.normalize(state.assetIds)[key];
  pickerTitle.textContent=group.label;pickerCount.textContent=group.items.length+'가지';optionGrid.classList.remove('skin-mode');
  optionGrid.innerHTML=group.items.map((item,index)=>`<button type="button" class="option${item.id===selected?' active':''}" aria-pressed="${item.id===selected}" data-wardrobe-category="${key}" data-wardrobe-id="${item.id}"><span class="hair-thumb"><canvas width="128" height="128" data-wardrobe-thumb="${item.id}" aria-hidden="true"></canvas></span><span class="num">${item.id===selected?'✓':index+1}</span><span class="part-name">${item.label}</span></button>`).join('');
  await Promise.allSettled(group.items.map(async item=>{await wardrobe.load(key,item.id);if(currentTab!==key)return;const el=optionGrid.querySelector('canvas[data-wardrobe-thumb="'+item.id+'"]');if(el)drawWardrobeThumbnail(el,key,item.id)}));
}
async function setWardrobeAsset(key,id){
  const group=wardrobe?.category(key),item=group?.items.find(candidate=>candidate.id===id);if(!item)return false;
  const request=(wardrobeRequests.get(key)||0)+1;wardrobeRequests.set(key,request);
  try{
    await wardrobe.load(key,id);if(wardrobeRequests.get(key)!==request)return false;
    const access=await ensureAssetAccess(key,id,group.defaultId,item.label);if(!access.ok)return false;
    state.assetIds={...state.assetIds,[key]:id};refreshSkinPreview();renderOptions();publish(false);flash(assetApplyMessage(access,item.label));return true;
  }catch(error){console.error(error);if(wardrobeRequests.get(key)===request)flash('파츠를 불러오지 못했어요. 다시 골라 주세요.');return false}
}
function renderOptions(){
  if(wardrobe?.category(currentTab)){renderWardrobeOptions();return}
  if(currentTab==='skin'){renderSkinOptions();return}
  if(currentTab==='hair'){renderHairOptions();return}
  if(currentTab==='hairColor'){renderHairColorOptions();return}
  if(currentTab==='eyes'){renderEyeOptions();return}
  if(currentTab==='upper'){renderUpperOptions();return}
  if(currentTab==='lower'){renderLowerOptions();return}
  if(currentTab==='earring'){renderEarringOptions();return}
  if(currentTab==='shoes'){renderShoeOptions();return}
  if(currentTab==='effect'){renderEffectOptions();return}
  if(currentTab==='weapon'){renderToolOptions();return}
  if(currentTab==='shield'){renderTeachingAidOptions();return}
  optionGrid.classList.remove('skin-mode');
  const meta=PARTS[currentTab]||PARTS.hair;
  const id=assetIdFor(currentTab);
  pickerTitle.textContent=meta.label;
  pickerCount.textContent='1가지';
  optionGrid.innerHTML=`<button type="button" class="option active" aria-pressed="true" data-v3-part="${currentTab}">
    <span class="hair-thumb"><img class="base" alt="" src="${DEFAULT_IMAGE}?v=quality-2"></span>
    <span class="num">✓</span>
    <span class="part-name">${meta.name}</span>
  </button>`;
}
function updateTabScrollButtons(){
  if(!tabs)return;
  const max=Math.max(0,tabs.scrollWidth-tabs.clientWidth),left=Math.max(0,tabs.scrollLeft);
  if(tabPrevBtn)tabPrevBtn.disabled=left<=2;
  if(tabNextBtn)tabNextBtn.disabled=left>=max-2||max<=2;
}
function scrollCategoryTabs(direction){
  if(!tabs)return;
  const amount=Math.max(160,Math.round(tabs.clientWidth*.72));
  tabs.scrollBy({left:direction*amount,behavior:'smooth'});
  window.setTimeout(updateTabScrollButtons,220);
}
function revealActiveTab(button,behavior='smooth'){
  if(!tabs||!button)return;
  const left=button.offsetLeft,right=left+button.offsetWidth,viewLeft=tabs.scrollLeft,viewRight=viewLeft+tabs.clientWidth;
  if(left<viewLeft+4)tabs.scrollTo({left:Math.max(0,left-8),behavior});
  else if(right>viewRight-4)tabs.scrollTo({left:Math.max(0,right-tabs.clientWidth+8),behavior});
  window.setTimeout(updateTabScrollButtons,behavior==='smooth'?220:0);
}
function selectTab(tab){
  if(!PARTS[tab])tab='hair';
  currentTab=tab;
  let activeButton=null;
  tabs.querySelectorAll('.tab').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);if(active)activeButton=b});
  revealActiveTab(activeButton);
  renderOptions();
}
function flash(text){
  toast.textContent=text;
  toast.classList.add('show');
  clearTimeout(flash.t);
  flash.t=setTimeout(()=>toast.classList.remove('show'),1400);
}
function refreshSkinPreview(){
  skinRemapCache.clear();
  const stand=animationFor('stand')[0]||{index:0};
  drawFrame(staticCtx,stand.index||0);
  setPreviewMode(previewMode);
}

async function setEarringAsset(id){
  const item=earringCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;
  const access=await ensureAssetAccess('earring',id,earringCatalog.defaultId,item.label);if(!access.ok)return false;
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),earring:id};refreshSkinPreview();renderOptions();publish(false);flash(assetApplyMessage(access,item.label));return true;
}
async function setShoeAsset(id){
  const item=shoeCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;
  const access=await ensureAssetAccess('shoes',id,shoeCatalog.defaultId,item.label);if(!access.ok)return false;
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),shoes:id};refreshSkinPreview();renderOptions();publish(false);flash(assetApplyMessage(access,item.label));return true;
}
async function setEffectAsset(id){
  const item=effectCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;
  const access=await ensureAssetAccess('effect',id,effectCatalog.defaultId,item.label);if(!access.ok)return false;
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),effect:id};refreshSkinPreview();renderOptions();publish(false);flash(assetApplyMessage(access,item.label));return true;
}
async function setToolAsset(id){
  const item=toolCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;
  const access=await ensureAssetAccess('weapon',id,toolCatalog.defaultId,item.label);if(!access.ok)return false;
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),weaponFront:id,weaponBack:id};refreshSkinPreview();renderOptions();publish(false);flash(assetApplyMessage(access,item.label));return true;
}
async function setTeachingAidAsset(id){
  const item=teachingAidCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;
  const access=await ensureAssetAccess('shield',id,teachingAidCatalog.defaultId,item.label);if(!access.ok)return false;
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),shieldFront:id,shieldBack:id};refreshSkinPreview();renderOptions();publish(false);flash(assetApplyMessage(access,item.label));return true;
}

async function setUpperAsset(id){
  const item=upperCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;if(id!==upperCatalog.defaultId)await loadUpperPart(id);
  const access=await ensureAssetAccess('upper',id,upperCatalog.defaultId,item.label);if(!access.ok)return false;
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),upper:id};refreshSkinPreview();renderOptions();publish(false);
  flash(assetApplyMessage(access,item.label));return true;
}
async function setLowerAsset(id){
  const item=lowerCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;if(id!==lowerCatalog.defaultId)await loadLowerPart(id);
  const access=await ensureAssetAccess('lower',id,lowerCatalog.defaultId,item.label);if(!access.ok)return false;
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),lower:id};refreshSkinPreview();renderOptions();publish(false);
  flash(assetApplyMessage(access,item.label));return true;
}
async function setHairAsset(id){
  const item=hairCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;if(id!==hairCatalog.defaultId)await loadHairPart(id);
  const access=await ensureAssetAccess('hair',id,hairCatalog.defaultId,item.label);if(!access.ok)return false;
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),hair:id};refreshSkinPreview();renderOptions();publish(false);
  flash(assetApplyMessage(access,item.label));return true;
}
async function setHairColorAsset(id){
  const item=hairColorCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;
  const access=await ensureAssetAccess('hairColor',id,hairColorCatalog.defaultId,item.label);if(!access.ok)return false;
  state.hairColorId=id;refreshSkinPreview();renderOptions();publish(false);
  flash(assetApplyMessage(access,item.label,'색으로 바꿨어요!'));return true;
}

async function setEyeAsset(id){
  const item=eyeCatalog?.items?.find(candidate=>candidate.id===id);if(!item)return false;if(id!==eyeCatalog.defaultId)await loadEyePart(id);
  const access=await ensureAssetAccess('eyes',id,eyeCatalog.defaultId,item.label);if(!access.ok)return false;
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),eyes:id};refreshSkinPreview();renderOptions();publish(false);
  flash(assetApplyMessage(access,item.label));return true;
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
    normalizeShopState();
    const payload={
      version:3,
      setId:manifest?.id||state.setId,
      assetIds:{...(manifest?.assetIds||{}),...(state.assetIds||{})},
      skinColor:normalizeHexColor(state.skinColor),
      hairColorId:selectedHairColorId(),
      economyVersion:Math.max(1,state.economyVersion||0),
      avatarPurchaseCount:economy?.normalizePurchaseCount(state.avatarPurchaseCount)||0,
      ownedAssets:economy?.normalizeOwned(state.ownedAssets)||{}
    };
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
  for(const [key,request] of wardrobeRequests)wardrobeRequests.set(key,request+1);
  normalizeShopState();
  const shopState={
    economyVersion:Math.max(1,state.economyVersion||0),
    avatarPurchaseCount:state.avatarPurchaseCount,
    ownedAssets:state.ownedAssets
  };
  state={version:3,setId:manifest?.id||'school-starter-01',skinColor:null,hairColorId:hairColorCatalog?.defaultId||'brown',...shopState};
  state.assetIds={...(manifest?.assetIds||{})};
  renderOptions();
  drawStatic();
  setPreviewMode('stand');
  publish(false);
  flash('기본 세트로 돌아왔어요. 구매한 파츠는 그대로 보유해요!');
}

tabs?.addEventListener('click',e=>{
  const button=e.target.closest('.tab');
  if(button)selectTab(button.dataset.tab);
});
tabPrevBtn?.addEventListener('click',()=>scrollCategoryTabs(-1));
tabNextBtn?.addEventListener('click',()=>scrollCategoryTabs(1));
tabs?.addEventListener('scroll',updateTabScrollButtons,{passive:true});
window.addEventListener('resize',updateTabScrollButtons);
optionGrid?.addEventListener('click',e=>{
  const option=e.target.closest('[data-wardrobe-id]');if(option){setWardrobeAsset(option.dataset.wardrobeCategory,option.dataset.wardrobeId);return}
  const aid=e.target.closest('[data-shield-id]');if(aid){setTeachingAidAsset(aid.dataset.shieldId);return}
  const tool=e.target.closest('[data-weapon-id]');if(tool){setToolAsset(tool.dataset.weaponId);return}
  const shoes=e.target.closest('[data-shoes-id]');if(shoes){setShoeAsset(shoes.dataset.shoesId);return}
  const effect=e.target.closest('[data-effect-id]');if(effect){setEffectAsset(effect.dataset.effectId);return}
  const earring=e.target.closest('[data-earring-id]');if(earring){setEarringAsset(earring.dataset.earringId);return}
  const lower=e.target.closest('[data-lower-id]');
  if(lower){setLowerAsset(lower.dataset.lowerId);return}
  const upper=e.target.closest('[data-upper-id]');
  if(upper){setUpperAsset(upper.dataset.upperId);return}
  const hairColor=e.target.closest('[data-hair-color-id]');
  if(hairColor){setHairColorAsset(hairColor.dataset.hairColorId);return}
  const hair=e.target.closest('[data-hair-id]');
  if(hair){setHairAsset(hair.dataset.hairId);return}
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
  version:'pixel-v3-school-starter-armor-30',
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
    updateSeedBadge();
    decorateShopButtons();
  },
  getState:()=>({...state}),
  async setState(next){
    if(!next||typeof next!=='object')return false;
    state={
      ...state,
      ...next,
      version:3,
      setId:manifest?.id||state.setId,
      skinColor:normalizeHexColor(next.skinColor??state.skinColor),
      hairColorId:next.hairColorId??state.hairColorId,
      economyVersion:Math.max(0,Math.trunc(Number(next.economyVersion??state.economyVersion)||0)),
      avatarPurchaseCount:economy?.normalizePurchaseCount(next.avatarPurchaseCount??state.avatarPurchaseCount)||0,
      ownedAssets:economy?.normalizeOwned(next.ownedAssets??state.ownedAssets)||{}
    };
    state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),...(next.assetIds||{})};
    migrateLegacyHairSelection();
    if(hairColorCatalog&&!hairColorCatalog.items.some(item=>item.id===state.hairColorId))state.hairColorId=hairColorCatalog.defaultId;
    if(eyeCatalog&&!eyeCatalog.items.some(item=>item.id===state.assetIds.eyes))state.assetIds.eyes=eyeCatalog.defaultId;
    if(state.assetIds.eyes!==eyeCatalog?.defaultId)await loadEyePart(state.assetIds.eyes);
    if(hairCatalog&&!hairCatalog.items.some(item=>item.id===state.assetIds.hair))state.assetIds.hair=hairCatalog.defaultId;
    if(state.assetIds.hair!==hairCatalog?.defaultId)await loadHairPart(state.assetIds.hair);
    if(upperCatalog&&!upperCatalog.items.some(item=>item.id===state.assetIds.upper))state.assetIds.upper=upperCatalog.defaultId;
    if(state.assetIds.upper!==upperCatalog?.defaultId)await loadUpperPart(state.assetIds.upper);
    if(lowerCatalog&&!lowerCatalog.items.some(item=>item.id===state.assetIds.lower))state.assetIds.lower=lowerCatalog.defaultId;
    if(state.assetIds.lower!==lowerCatalog?.defaultId)await loadLowerPart(state.assetIds.lower);
    if(shoeCatalog&&!shoeCatalog.items.some(item=>item.id===state.assetIds.shoes))state.assetIds.shoes=shoeCatalog.defaultId;
    if(effectCatalog&&!effectCatalog.items.some(item=>item.id===state.assetIds.effect))state.assetIds.effect=effectCatalog.defaultId;
    if(earringCatalog&&!earringCatalog.items.some(item=>item.id===state.assetIds.earring))state.assetIds.earring=earringCatalog.defaultId;
    if(toolCatalog&&!toolCatalog.items.some(item=>item.id===state.assetIds.weaponFront)){state.assetIds.weaponFront=toolCatalog.defaultId;state.assetIds.weaponBack=toolCatalog.defaultId}else if(toolCatalog)state.assetIds.weaponBack=state.assetIds.weaponFront;
    if(teachingAidCatalog&&!teachingAidCatalog.items.some(item=>item.id===state.assetIds.shieldFront)){state.assetIds.shieldFront=teachingAidCatalog.defaultId;state.assetIds.shieldBack=teachingAidCatalog.defaultId}else if(teachingAidCatalog)state.assetIds.shieldBack=state.assetIds.shieldFront;
    if(wardrobe)state.assetIds=await wardrobe.prepare(state.assetIds);
    migrateAvatarEconomy();
    refreshSkinPreview();
    updateSeedBadge();
    renderOptions();
    publish(false);
    return true;
  }
};

(async function boot(){
  await Promise.all([loadManifest(),loadSheet(),loadSchoolPack()]);
  try{await loadBodyFrames()}catch(error){console.warn('BODY-first renderer fallback:',error)}
  await loadEyeCatalog();
  await loadHairColorCatalog();
  await loadHairCatalog();
  await loadUpperCatalog();
  await loadLowerCatalog();
  await Promise.all([loadShoeCatalog(),loadEarringCatalog(),loadEffectCatalog(),loadToolCatalog(),loadTeachingAidCatalog()]);
  await loadWardrobe();
  migrateAvatarEconomy();
  loadSkinPalette();
  loadFrameSkinPalettes();
  updateSeedBadge();
  drawStatic();
  styleSummary.textContent='헤어 '+(hairCatalog?.items?.length||0)+'종 · 염색 '+(hairColorCatalog?.items?.length||0)+'종 · 다양한 복장과 얼굴 장식을 골라 보세요.';
  selectTab('skin');
  updateTabScrollButtons();
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
