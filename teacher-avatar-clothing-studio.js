(() => {
'use strict';

const ADMIN_KEY_NAME='kc_teacher_admin_key';
const SAVE_KEY='kidscade-avatar-studio-v3';
const PANEL_STATE_KEY='kidscade-avatar-studio-panels-v3';
const SIZE=128;
const ROOT_X=64;
const GROUND_Y=118;
const LAYERS=[
  'body','eyes','mouth','mask','upper','lower','shoes','gloves','hair','hat','earring',
  'weaponFront','weaponBack','shieldFront','shieldBack'
];
const FACE_LAYERS=['eyes','mouth'];
const HAIR_LAYERS=['hair','hat'];
const OUTFIT_LAYERS=['upper','lower','shoes','gloves'];
const ACCESSORY_LAYERS=['earring','mask'];
const WEAPON_LAYERS=['weaponBack','weaponFront'];
const SHIELD_LAYERS=['shieldBack','shieldFront'];
const EQUIPMENT_LAYERS=[...WEAPON_LAYERS,...SHIELD_LAYERS];
const RENDER_ORDER=[
  'weaponBack','shieldBack',
  'body','lower','shoes','upper','gloves','eyes','mouth','mask','hair','earring','hat',
  'shieldFront','weaponFront'
];
const LAYER_LABELS={
  body:'BODY',hair:'HAIR',eyes:'눈',mouth:'입',earring:'귀걸이',mask:'가면',
  upper:'상의',lower:'하의',shoes:'신발',gloves:'장갑',hat:'모자',
  weaponBack:'무기 · 뒤',weaponFront:'무기 · 앞',shieldBack:'방패 · 뒤',shieldFront:'방패 · 앞'
};
const LAYER_BUTTON_IDS={
  body:'layerBody',hair:'layerHair',eyes:'layerEyes',mouth:'layerMouth',
  earring:'layerEarring',mask:'layerMask',upper:'layerUpper',lower:'layerLower',
  shoes:'layerShoes',gloves:'layerGloves',hat:'layerHat',
  weaponBack:'layerWeaponBack',weaponFront:'layerWeaponFront',
  shieldBack:'layerShieldBack',shieldFront:'layerShieldFront'
};
const LAYER_ID_FIELDS={
  body:'bodyId',hair:'hairId',eyes:'eyesId',mouth:'mouthId',earring:'earringId',
  mask:'maskId',upper:'upperId',lower:'lowerId',shoes:'shoesId',gloves:'glovesId',hat:'hatId',
  weaponBack:'weaponBackId',weaponFront:'weaponFrontId',shieldBack:'shieldBackId',shieldFront:'shieldFrontId'
};
const LAYER_DEFAULT_IDS={
  body:'maple-lite-body-v3',hair:'toben-like-01',eyes:'eyes-01',mouth:'mouth-01',
  earring:'earring-01',mask:'mask-01',upper:'blue-star-hoodie-01',lower:'denim-cuffed-jeans-01',shoes:'shoes-01',
  gloves:'gloves-01',hat:'hat-01',
  weaponBack:'weapon-back-01',weaponFront:'weapon-front-01',shieldBack:'shield-back-01',shieldFront:'shield-front-01'
};
const LAYER_FOLDERS={
  body:'body',hair:'hair',eyes:'face/eyes',mouth:'face/mouth',
  earring:'accessories/earring',mask:'accessories/mask',hat:'accessories/hat',
  upper:'outfit/upper',lower:'outfit/lower',shoes:'outfit/shoes',gloves:'outfit/gloves',
  weaponBack:'equipment/weapon/back',weaponFront:'equipment/weapon/front',
  shieldBack:'equipment/shield/back',shieldFront:'equipment/shield/front'
};
const ANIMATION_GROUPS={
  stand:{label:'STAND',loop:true,fps:2},
  walk:{label:'WALK',loop:true,fps:6},
  jump:{label:'JUMP',loop:false,fps:1},
  attack:{label:'ATTACK',loop:false,fps:10},
  hurt:{label:'HURT',loop:false,fps:7},
  dead:{label:'DEAD',loop:false,fps:5},
  sit:{label:'SIT',loop:true,fps:3},
  pickup:{label:'PICKUP',loop:false,fps:7}
};
const FRAMES=[
  {id:'stand-01',label:'STAND 01',kind:'stand',n:1,durationMs:500,anchors:{leftHand:[49,91],rightHand:[81,91]}},
  {id:'stand-02',label:'STAND 02',kind:'stand',n:2,durationMs:500,anchors:{leftHand:[49,91],rightHand:[81,91]}},
  ...Array.from({length:4},(_,i)=>({id:'walk-'+String(i+1).padStart(2,'0'),label:'WALK '+String(i+1).padStart(2,'0'),kind:'walk',n:i+1,durationMs:165,anchors:{leftHand:[50,89],rightHand:[82,89]}})),
  {id:'jump-01',label:'JUMP 01',kind:'jump',n:1,durationMs:180,anchors:{leftHand:[45,78],rightHand:[88,80]}},

  {id:'attack-01',label:'ATK 01',kind:'attack',n:1,durationMs:90,derived:true,fallbackFrom:'stand-01',anchors:{leftHand:[49,91],rightHand:[81,91],weaponPivot:[49,91]}},
  {id:'attack-02',label:'ATK 02',kind:'attack',n:2,durationMs:80,derived:true,fallbackFrom:'stand-02',anchors:{leftHand:[47,88],rightHand:[82,91],weaponPivot:[47,88]}},
  {id:'attack-03',label:'ATK 03',kind:'attack',n:3,durationMs:55,derived:true,fallbackFrom:'stand-01',anchors:{leftHand:[45,82],rightHand:[87,82],weaponPivot:[45,82]}},
  {id:'attack-04',label:'ATK 04',kind:'attack',n:4,durationMs:70,derived:true,fallbackFrom:'stand-01',anchors:{leftHand:[39,79],rightHand:[82,84],weaponPivot:[39,79]},event:'hit'},
  {id:'attack-05',label:'ATK 05',kind:'attack',n:5,durationMs:120,derived:true,fallbackFrom:'stand-02',anchors:{leftHand:[49,91],rightHand:[81,91],weaponPivot:[49,91]}},

  {id:'hurt-01',label:'HURT 01',kind:'hurt',n:1,durationMs:110,derived:true,fallbackFrom:'stand-01',anchors:{leftHand:[51,92],rightHand:[82,92]}},
  {id:'hurt-02',label:'HURT 02',kind:'hurt',n:2,durationMs:180,derived:true,fallbackFrom:'stand-01',anchors:{leftHand:[54,94],rightHand:[84,93]},event:'hurtPeak'},

  {id:'dead-01',label:'DEAD 01',kind:'dead',n:1,durationMs:120,derived:true,fallbackFrom:'stand-01'},
  {id:'dead-02',label:'DEAD 02',kind:'dead',n:2,durationMs:120,derived:true,fallbackFrom:'stand-01'},
  {id:'dead-03',label:'DEAD 03',kind:'dead',n:3,durationMs:150,derived:true,fallbackFrom:'stand-01'},
  {id:'dead-04',label:'DEAD 04',kind:'dead',n:4,durationMs:600,derived:true,fallbackFrom:'stand-01',event:'down'},

  {id:'sit-01',label:'SIT 01',kind:'sit',n:1,durationMs:260,derived:true,fallbackFrom:'stand-01',anchors:{leftHand:[51,99],rightHand:[79,101]}},
  {id:'sit-02',label:'SIT 02',kind:'sit',n:2,durationMs:420,derived:true,fallbackFrom:'stand-02',anchors:{leftHand:[51,103],rightHand:[79,104]}},

  {id:'pickup-01',label:'PICK 01',kind:'pickup',n:1,durationMs:120,derived:true,fallbackFrom:'stand-01',anchors:{leftHand:[47,96],rightHand:[80,94]}},
  {id:'pickup-02',label:'PICK 02',kind:'pickup',n:2,durationMs:160,derived:true,fallbackFrom:'stand-01',anchors:{leftHand:[41,108],rightHand:[76,99]},event:'pickup'},
  {id:'pickup-03',label:'PICK 03',kind:'pickup',n:3,durationMs:180,derived:true,fallbackFrom:'stand-02',anchors:{leftHand:[45,100],rightHand:[79,96]}}
];
const SOURCE_BODY_FRAMES=FRAMES.filter(frame=>!frame.derived);
const DERIVED_FRAMES=FRAMES.filter(frame=>frame.derived);
const DERIVED_BODY_POSES={
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
const DRAFT_BODY_SOURCE_SECONDS=[8,9,10,11,12,13,14];
const DRAFT_BODY_SOURCE_RESOLUTION=64;
const DRAFT_BODY_SOURCE_PALETTE=12;
const STARTER_ASSETS={
  hair:{id:'toben-like-01',file:'hair-01_stand-01.png',core:true},
  eyes:{id:'eyes-01',file:'eyes01.png',core:true},
  mouth:{id:'mouth-01',file:'mouth01.png',core:true},
  earring:{id:'earring-01',file:'earing01.png',core:false},
  mask:{id:'mask-01',file:'mask01.png',core:false},
  upper:{id:'blue-star-hoodie-01',file:'hoodie01.png',core:true},
  lower:{id:'denim-cuffed-jeans-01',file:'jenas01.png',core:true},
  shoes:{id:'shoes-01',file:'shoes01.png',core:true},
  gloves:{id:'gloves-01',file:'gloves01.png',core:true},
  hat:{id:'navy-cap-01',file:'hat01.png',core:false}
};
const STARTER_CORE_LAYERS=['hair','eyes','mouth','upper','lower','shoes','gloves'];
const ASSET_CATALOG=[
  {layer:'hair',id:'toben-like-01',label:'토벤풍 기본 머리',file:'hair-01_stand-01.png',core:true},
  {layer:'eyes',id:'eyes-01',label:'기본 갈색 눈',file:'eyes01.png',core:true},
  {layer:'mouth',id:'mouth-01',label:'기본 미소',file:'mouth01.png',core:true},
  {layer:'upper',id:'blue-star-hoodie-01',label:'파란 별 후드',file:'hoodie01.png',core:true},
  {layer:'lower',id:'denim-cuffed-jeans-01',label:'롤업 데님',file:'jenas01.png',core:true},
  {layer:'shoes',id:'shoes-01',label:'기본 스니커즈',file:'shoes01.png',core:true},
  {layer:'gloves',id:'gloves-01',label:'기본 장갑',file:'gloves01.png',core:true},
  {layer:'hat',id:'navy-cap-01',label:'네이비 캡',file:'hat01.png',core:false},
  {layer:'earring',id:'earring-01',label:'골드 귀걸이',file:'earing01.png',core:false},
  {layer:'mask',id:'mask-01',label:'화이트 마스크',file:'mask01.png',core:false}
];
const ASSET_CATEGORY_ORDER=['hair','eyes','mouth','upper','lower','shoes','gloves','hat','earring','mask','weaponFront','weaponBack','shieldFront','shieldBack'];



const $=id=>document.getElementById(id);
const canvas=$('workCanvas');
const ctx=canvas.getContext('2d',{alpha:true});
ctx.imageSmoothingEnabled=false;

let currentFrame='stand-01';
let animationFilterKind='stand';
let activeLayer='body';
let tool='pencil';
let drawing=false;
let selection=null;
let selectionStart=null;
let sourceImage=null;
let preparedSource=null;
let sourceCrop=null;
let sourceRuntimeReady=false;
let pixelPreviewReady=false;
let playTimer=0;
let saveTimer=0;
let pendingCatalogAsset=null;
let catalogLoadToken=0;
let focusPartOnly=false;

const frames=new Map();
const history=new Map();
const selectedAssets=new Map();
const bodySafetySnapshots=new Map();

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
  selectedAssets.set(frame.id,new Map());
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

function anyLayerHasInk(rec,layers){return layers.some(layer=>hasInk(rec?.[layer]))}

function rememberBodyFrame(frameId=currentFrame){
  const c=layerCanvas(frameId,'body');
  if(!hasInk(c))return false;
  bodySafetySnapshots.set(frameId,c.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE));
  return true;
}
function rememberAllBodyFrames(){for(const f of FRAMES)rememberBodyFrame(f.id)}
function restoreBodySafetySnapshot(frameId=currentFrame){
  const data=bodySafetySnapshots.get(frameId);if(!data)return false;
  const c=layerCtx(frameId,'body');c.clearRect(0,0,SIZE,SIZE);c.putImageData(data,0,0);
  return true;
}
function protectBodyAfterMutation(frameId=currentFrame){
  const c=layerCanvas(frameId,'body');
  if(hasInk(c)){rememberBodyFrame(frameId);return true}
  return restoreBodySafetySnapshot(frameId);
}

function assetIdForLayer(layer){
  const field=LAYER_ID_FIELDS[layer],fallback=LAYER_DEFAULT_IDS[layer]||layer+'-01';
  return safeId(field&&$(field)?.value,fallback);
}


function assetMeta(frameId=currentFrame,layer=activeLayer){return selectedAssets.get(frameId)?.get(layer)||null}
function setAssetMeta(frameId,layer,meta){
  const map=selectedAssets.get(frameId)||new Map();
  if(meta)map.set(layer,{...meta});else map.delete(layer);
  selectedAssets.set(frameId,map);
}
function catalogEntry(layer,id){
  return ASSET_CATALOG.find(item=>item.layer===layer&&(!id||item.id===id))||null;
}
function assetEntryUrl(entry){
  return entry?new URL('../assets/game/characters/kidscade-avatar-v3/'+entry.file,window.location.href).href:'';
}
function partLabel(layer){return LAYER_LABELS[layer]||layer}
function syncLayerSelect(){
  const el=$('editLayerSelect');
  if(el&&el.value!==activeLayer)el.value=activeLayer;
}
function buildLayerSelect(){
  const el=$('editLayerSelect');if(!el)return;
  el.innerHTML=LAYERS.map(layer=>'<option value="'+layer+'">'+partLabel(layer)+'</option>').join('');
  el.value=activeLayer;
}
function buildAssetBrowser(){
  const category=$('assetCategory'),grid=$('assetGrid');
  if(!category||!grid)return;
  if(!category.options.length){
    category.innerHTML=ASSET_CATEGORY_ORDER.map(layer=>'<option value="'+layer+'">'+partLabel(layer)+'</option>').join('');
    category.value=ASSET_CATEGORY_ORDER.includes(activeLayer)?activeLayer:'hair';
  }
  renderAssetGrid();
}
function renderAssetGrid(){
  const category=$('assetCategory'),grid=$('assetGrid');if(!category||!grid)return;
  const layer=category.value||'hair';
  const q=String($('assetSearch')?.value||'').trim().toLowerCase();
  const items=ASSET_CATALOG.filter(item=>item.layer===layer&&(!q||(item.label+' '+item.id).toLowerCase().includes(q)));
  grid.innerHTML='';
  if(!items.length){grid.innerHTML='<div class="asset-empty">이 분류에 등록된 기본 에셋이 없습니다.<br>파츠·에셋 JSON 또는 내 이미지 가져오기로 추가할 수 있습니다.</div>';return}
  const current=assetMeta(currentFrame,layer);
  for(const item of items){
    const button=document.createElement('button');
    button.type='button';button.className='asset-card'+(current?.id===item.id?' selected':'');
    button.title=item.label;
    const img=document.createElement('img');img.src=assetEntryUrl(item);img.alt=item.label;
    const name=document.createElement('span');name.className='name';name.textContent=item.label;
    button.append(img,name);
    button.addEventListener('click',()=>loadCatalogAsset(item,{apply:false,announce:true}));
    grid.appendChild(button);
  }
}
function renderSelectedAssetList(){
  const host=$('selectedAssetList');if(!host)return;
  const rec=frames.get(currentFrame),rows=[];
  for(const layer of RENDER_ORDER){
    if(!hasInk(rec?.[layer]))continue;
    const meta=assetMeta(currentFrame,layer);
    const id=meta?.id||assetIdForLayer(layer);
    const entry=meta?.file?meta:catalogEntry(layer,id);
    const thumb=entry?.file?assetEntryUrl(entry):layerCanvas(currentFrame,layer).toDataURL('image/png');
    rows.push({layer,id,thumb,label:meta?.label||catalogEntry(layer,id)?.label||id});
  }
  host.innerHTML='';
  if(!rows.length){host.innerHTML='<div class="asset-empty">현재 프레임에 선택된 파츠가 없습니다.</div>';return}
  for(const row of rows){
    const div=document.createElement('div');div.className='selected-row';div.dataset.layer=row.layer;
    const protectedBody=row.layer==='body';
    div.innerHTML='<div class="selected-thumb"><img alt=""></div><div class="selected-meta"><div class="selected-slot">'+partLabel(row.layer)+'</div><div class="selected-name"></div></div><button class="selected-remove" type="button" title="'+(protectedBody?'BODY는 기본 바디라 제거할 수 없습니다.':'현재 프레임에서 제거')+'">'+(protectedBody?'🔒':'×')+'</button>';
    div.querySelector('img').src=row.thumb;
    div.querySelector('.selected-name').textContent=row.label;
    div.querySelector('.selected-meta').addEventListener('click',()=>selectLayer(row.layer));
    const remove=div.querySelector('.selected-remove');
    if(protectedBody){remove.disabled=true;remove.classList.add('body-locked')}
    else remove.addEventListener('click',()=>{
      const c=layerCtx(currentFrame,row.layer);c.clearRect(0,0,SIZE,SIZE);setAssetMeta(currentFrame,row.layer,null);
      if(activeLayer===row.layer)selection=null;
      afterEdit(partLabel(row.layer)+' 제거');
    });
    host.appendChild(div);
  }
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


function canvasChecksum(c){
  const d=c.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data;
  let hash=0x811c9dc5;
  for(let i=0;i<d.length;i++){hash^=d[i];hash=Math.imul(hash,0x01000193)>>>0}
  return hash.toString(16).padStart(8,'0');
}

function sparsePixelsOfCanvas(c,alphaCut=1){
  const d=c.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data,out=[];
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const i=(y*SIZE+x)*4,a=d[i+3];
    if(a<alphaCut)continue;
    out.push([x,y,d[i],d[i+1],d[i+2],a]);
  }
  return out;
}

function alphaRunsOfCanvas(c,alphaCut=1){
  const d=c.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data,rows=[];
  for(let y=0;y<SIZE;y++){
    const runs=[];let start=-1;
    for(let x=0;x<SIZE;x++){
      const on=d[(y*SIZE+x)*4+3]>=alphaCut;
      if(on&&start<0)start=x;
      if((!on||x===SIZE-1)&&start>=0){
        const end=on&&x===SIZE-1?x:x-1;
        runs.push([start,end]);start=-1;
      }
    }
    if(runs.length)rows.push([y,runs]);
  }
  return rows;
}

function canvasMetrics(c){
  const d=c.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data;
  let count=0,sx=0,sy=0,sa=0;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const a=d[(y*SIZE+x)*4+3];
    if(!a)continue;
    const w=a/255;count++;sx+=x*w;sy+=y*w;sa+=w;
  }
  const box=bboxOfCanvas(c,1);
  return {
    bbox:box?{x:box.x,y:box.y,w:box.w,h:box.h,maxX:box.maxX,maxY:box.maxY}:null,
    pixelCount:count,
    centerOfMass:sa?[Number((sx/sa).toFixed(3)),Number((sy/sa).toFixed(3))]:null,
    checksum:canvasChecksum(c)
  };
}


const GARMENT_COVER_LAYERS=['upper','lower','shoes','gloves'];

function isSkinColorCandidate(r,g,b,a){
  if(a<32)return false;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  return r>=135&&g>=70&&b>=55&&r>=g+8&&g>=b-8&&(max-min)>=18;
}

function componentSummariesFromMask(mask){
  const seen=new Uint8Array(SIZE*SIZE),out=[],queue=[];
  const idx=(x,y)=>y*SIZE+x;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const start=idx(x,y);
    if(!mask[start]||seen[start])continue;
    let minX=x,maxX=x,minY=y,maxY=y,sumX=0,sumY=0,count=0;
    queue.length=0;queue.push(start);seen[start]=1;
    for(let q=0;q<queue.length;q++){
      const n=queue[q],nx=n%SIZE,ny=Math.floor(n/SIZE);
      count++;sumX+=nx;sumY+=ny;
      if(nx<minX)minX=nx;if(nx>maxX)maxX=nx;if(ny<minY)minY=ny;if(ny>maxY)maxY=ny;
      const neighbors=[[nx-1,ny],[nx+1,ny],[nx,ny-1],[nx,ny+1]];
      for(const [px,py] of neighbors){
        if(px<0||py<0||px>=SIZE||py>=SIZE)continue;
        const ni=idx(px,py);if(mask[ni]&&!seen[ni]){seen[ni]=1;queue.push(ni)}
      }
    }
    out.push({
      pixelCount:count,
      bbox:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,maxX,maxY},
      center:[Number((sumX/count).toFixed(3)),Number((sumY/count).toFixed(3))]
    });
  }
  return out.sort((a,b)=>b.pixelCount-a.pixelCount);
}

function bodyExposureDiagnostics(frameId){
  const body=layerCanvas(frameId,'body'),bd=body.getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data;
  const garmentData=Object.fromEntries(GARMENT_COVER_LAYERS.map(layer=>[
    layer,layerCanvas(frameId,layer).getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data
  ]));
  const nonBodyLayers=LAYERS.filter(layer=>layer!=='body');
  const allData=Object.fromEntries(nonBodyLayers.map(layer=>[
    layer,layerCanvas(frameId,layer).getContext('2d',{alpha:true}).getImageData(0,0,SIZE,SIZE).data
  ]));
  const skinVisible=[],skinEdge=[],visibleMask=new Uint8Array(SIZE*SIZE),edgeMask=new Uint8Array(SIZE*SIZE);
  const coverageByGarment=Object.fromEntries(GARMENT_COVER_LAYERS.map(layer=>[layer,0]));
  let bodyOpaque=0,garmentCovered=0,anyLayerCovered=0,skinCandidates=0,skinVisibleCount=0;
  const alphaAt=(data,x,y)=>data[(y*SIZE+x)*4+3];
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const i=(y*SIZE+x)*4,ba=bd[i+3];
    if(!ba)continue;
    bodyOpaque++;
    let coveredGarment=false,coveredAny=false;
    for(const layer of GARMENT_COVER_LAYERS){
      if(alphaAt(garmentData[layer],x,y)>0){coverageByGarment[layer]++;coveredGarment=true}
    }
    for(const layer of nonBodyLayers){if(alphaAt(allData[layer],x,y)>0){coveredAny=true;break}}
    if(coveredGarment)garmentCovered++;
    if(coveredAny)anyLayerCovered++;
    if(!isSkinColorCandidate(bd[i],bd[i+1],bd[i+2],ba))continue;
    skinCandidates++;
    if(coveredGarment)continue;
    skinVisibleCount++;visibleMask[y*SIZE+x]=1;
    skinVisible.push([x,y,bd[i],bd[i+1],bd[i+2],ba]);
    let nearGarment=false;
    for(let oy=-1;oy<=1&&!nearGarment;oy++)for(let ox=-1;ox<=1&&!nearGarment;ox++){
      if(!ox&&!oy)continue;
      const px=x+ox,py=y+oy;if(px<0||py<0||px>=SIZE||py>=SIZE)continue;
      for(const layer of GARMENT_COVER_LAYERS){
        if(alphaAt(garmentData[layer],px,py)>0){nearGarment=true;break}
      }
    }
    if(nearGarment){edgeMask[y*SIZE+x]=1;skinEdge.push([x,y,bd[i],bd[i+1],bd[i+2],ba])}
  }
  return {
    note:'Heuristic diagnostic only. Visible skin can be intentional at face, hands, neck, ankles or feet. Use pixel context and BODY pose before treating a region as a leak.',
    garmentCoverageLayers:[...GARMENT_COVER_LAYERS],
    bodyOpaquePixels:bodyOpaque,
    bodyPixelsCoveredByGarments:garmentCovered,
    bodyPixelsCoveredByAnyLayer:anyLayerCovered,
    skinColorCandidatePixels:skinCandidates,
    visibleSkinCandidatePixels:skinVisible,
    visibleSkinCandidateCount:skinVisibleCount,
    garmentEdgeSkinCandidatePixels:skinEdge,
    garmentEdgeSkinCandidateCount:skinEdge.length,
    visibleSkinComponents:componentSummariesFromMask(visibleMask),
    garmentEdgeSkinComponents:componentSummariesFromMask(edgeMask),
    coverageByGarment
  };
}

function buildFullAnalysis(){
  const framesOut={};
  for(const frame of FRAMES){
    const layers={};
    for(const layer of LAYERS){
      const c=layerCanvas(frame.id,layer);
      layers[layer]={
        ...canvasMetrics(c),
        pixels:sparsePixelsOfCanvas(c,1),
        asset:assetMeta(frame.id,layer)||null
      };
    }
    framesOut[frame.id]={
      kind:frame.kind,
      frameNumber:frame.n,
      durationMs:frame.durationMs||null,
      anchors:frame.anchors||null,
      event:frame.event||null,
      derived:!!frame.derived,
      layers,
      composite:{...canvasMetrics(compositeCanvas(frame.id))},
      exposure:bodyExposureDiagnostics(frame.id)
    };
  }
  return {
    version:1,
    type:'kidscade-avatar-full-analysis',
    createdAt:new Date().toISOString(),
    canvas:{width:SIZE,height:SIZE,origin:'top-left'},
    avatar:{facing:'left',logicalRoot:[ROOT_X,82],groundY:GROUND_Y,mirrorForRight:true},
    frameOrder:FRAMES.map(f=>f.id),
    layerOrder:[...RENDER_ORDER],
    groups:{face:[...FACE_LAYERS],hair:[...HAIR_LAYERS],outfit:[...OUTFIT_LAYERS],accessories:[...ACCESSORY_LAYERS],equipment:[...EQUIPMENT_LAYERS],weapon:[...WEAPON_LAYERS],shield:[...SHIELD_LAYERS]},
    assetIds:Object.fromEntries(LAYERS.map(layer=>[layer,assetIdForLayer(layer)])),
    frames:framesOut,
    adjustmentContract:{
      type:'kidscade-avatar-full-adjustment',
      version:1,
      target:{canvas:[SIZE,SIZE],facing:'left'},
      frames:{
        'walk-02':{
          layers:{
            shoes:{
              baseChecksum:'use frames.walk-02.layers.shoes.checksum from this analysis',
              copyFrom:'optional frame id',
              operations:[
                {op:'translate',dx:0,dy:0},
                {op:'moveRect',rect:{x:0,y:0,w:1,h:1},dx:0,dy:0},
                {op:'setPixels',pixels:[[0,0,0,0,0,0]]},
                {op:'replacePixels',pixels:[[0,0,255,255,255,255]]}
              ],
              note:'optional layer-specific explanation'
            }
          },
          note:'optional frame-level explanation'
        }
      },
      rules:[
        'Only include frame/layer entries that need changes.',
        'Coordinates are integer pixels in the 128x128 top-left origin canvas.',
        'replacePixels clears that one layer/frame first; omitted pixels become transparent.',
        'setPixels changes only listed RGBA pixels; alpha 0 clears a pixel.',
        'moveRect moves an existing rectangular region before later operations.',
        'Operations execute in listed order after optional copyFrom.',
        'Do not modify BODY merely to hide clothing leaks unless the BODY itself is wrong; prefer correcting upper/lower/shoes/gloves.',
        'weaponBack/shieldBack render behind BODY; shieldFront/weaponFront render above the avatar.',
        'A single logical weapon or shield may use both front and back layers in different frames for correct occlusion.',
        'Use exposure diagnostics only as hints. Face, neck, hands and feet can be intentionally visible.'
      ]
    }
  };
}

function buildBodyReferenceAnalysis(){
  const missing=FRAMES.filter(f=>!hasInk(layerCanvas(f.id,'body'))).map(f=>f.id);
  if(missing.length)throw new Error('BODY가 비어 있는 프레임이 있습니다: '+missing.join(', ')+' · 먼저 BODY 복구가 필요합니다.');
  const framesOut={};
  for(const frame of FRAMES){
    const body=layerCanvas(frame.id,'body');
    framesOut[frame.id]={
      kind:frame.kind,
      frameNumber:frame.n,
      durationMs:frame.durationMs||null,
      anchors:frame.anchors||null,
      event:frame.event||null,
      derived:!!frame.derived,
      ...canvasMetrics(body),
      alphaRuns:alphaRunsOfCanvas(body,1),
      pixels:sparsePixelsOfCanvas(body,1)
    };
  }
  return {
    version:2,
    type:'kidscade-avatar-body-reference',
    createdAt:new Date().toISOString(),
    canvas:{width:SIZE,height:SIZE,origin:'top-left',transparent:true},
    avatar:{bodyId:assetIdForLayer('body'),facing:'left',logicalRoot:[ROOT_X,82],groundY:GROUND_Y,mirrorForRight:true},
    frameOrder:FRAMES.map(f=>f.id),
    frames:framesOut,
    assetGenerationContract:{
      bodyIsReferenceOnly:true,
      outputCanvas:[SIZE,SIZE],
      transparentBackground:true,
      coordinateOrigin:'top-left',
      pixelFormat:'[x,y,r,g,b,a]',
      frameOrder:FRAMES.map(f=>f.id),
      rules:[
        'Do not paint or replace BODY pixels in generated wearable assets.',
        'Generate only the requested wearable or cosmetic layer on a transparent 128x128 canvas.',
        'Use BODY pixels, bbox, alphaRuns, logicalRoot, groundY and per-frame anchors as the fit reference.',
        'Keep frame alignment consistent across STAND, WALK, JUMP, ATTACK, HURT, DEAD, SIT and PICKUP.',
        'ATTACK weaponPivot is the left-hand weapon grip pivot; shield equipment follows the rightHand anchor.',
        'weaponBack/weaponFront and shieldBack/shieldFront are separate occlusion passes for the same logical equipment slot.',
        'Mirror the full avatar and equipment together for right-facing play.',
        'For derived action frames, regenerate or hand-correct wearable/equipment pixels when the automatic fallback no longer matches the pose.'
      ]
    }
  };
}
function exportBodyReferenceFile(){
  try{
    const data=buildBodyReferenceAnalysis();
    downloadBlob('kidscade-avatar-body-reference.json',new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
    setStatus('맨몸 BODY 기준 JSON 저장됨 · 이 파일을 ChatGPT에 올려 새 에셋 제작 기준으로 사용할 수 있습니다.');
  }catch(e){setStatus(e?.message||String(e),true)}
}

function exportFullAnalysisFile(){
  const data=buildFullAnalysis();
  downloadBlob('kidscade-avatar-full-analysis.json',new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
  setStatus('전체 아바타 분석 JSON 저장됨 · 모든 파츠/프레임과 피부 노출 진단 포함');
}

function validateFullAdjustmentFile(data){
  if(!data||data.type!=='kidscade-avatar-full-adjustment'||Number(data.version)!==1)throw new Error('Kidscade 전체 AI 보정 파일 형식이 아닙니다.');
  if(data.target?.canvas&&(Number(data.target.canvas[0])!==SIZE||Number(data.target.canvas[1])!==SIZE))throw new Error('128×128 전체 보정 파일만 적용할 수 있습니다.');
  if(!data.frames||typeof data.frames!=='object')throw new Error('frames 보정 정보가 없습니다.');
  for(const [frameId,framePlan] of Object.entries(data.frames)){
    if(!frames.has(frameId))throw new Error('알 수 없는 프레임: '+frameId);
    if(!framePlan?.layers||typeof framePlan.layers!=='object')throw new Error(frameId+'에 layers가 없습니다.');
    for(const [layer,plan] of Object.entries(framePlan.layers)){
      if(!LAYERS.includes(layer))throw new Error(frameId+'에 알 수 없는 파츠가 있습니다: '+layer);
      if(plan?.copyFrom&&!frames.has(plan.copyFrom))throw new Error(frameId+' '+layer+'의 copyFrom 프레임을 찾을 수 없습니다.');
      for(const op of Array.isArray(plan?.operations)?plan.operations:[]){
        if(!['translate','moveRect','setPixels','replacePixels'].includes(op?.op))throw new Error(frameId+' '+layer+'에 지원하지 않는 op가 있습니다: '+String(op?.op));
      }
    }
  }
  return true;
}

function applyLayerAdjustmentPlan(frameId,layer,plan,assetId){
  const before=layer==='body'?layerCtx(frameId,'body').getImageData(0,0,SIZE,SIZE):null;
  snapshotFrameLayer(frameId,layer);
  if(plan?.copyFrom){
    const dst=layerCtx(frameId,layer),src=layerCanvas(plan.copyFrom,layer);
    dst.clearRect(0,0,SIZE,SIZE);dst.drawImage(src,0,0);
    setAssetMeta(frameId,layer,assetMeta(plan.copyFrom,layer));
  }
  for(const op of Array.isArray(plan?.operations)?plan.operations:[]){
    if(op.op==='translate')shiftLayerFrame(frameId,layer,op.dx,op.dy);
    else if(op.op==='moveRect')moveRectOnFrame(frameId,layer,op.rect,op.dx,op.dy);
    else if(op.op==='setPixels')applyPixelTuples(frameId,layer,op.pixels,{replace:false});
    else if(op.op==='replacePixels')applyPixelTuples(frameId,layer,op.pixels,{replace:true});
  }
  if(layer==='body'&&!hasInk(layerCanvas(frameId,'body'))){
    const c=layerCtx(frameId,'body');c.clearRect(0,0,SIZE,SIZE);if(before)c.putImageData(before,0,0);
    rememberBodyFrame(frameId);
    throw new Error(frameId+' BODY가 비어 버리는 AI 보정은 안전장치가 차단했습니다.');
  }
  if(layer==='body')rememberBodyFrame(frameId);
  if(assetId||!assetMeta(frameId,layer)){
    const id=assetId||assetIdForLayer(layer);
    setAssetMeta(frameId,layer,{layer,id,label:id+' · AI 보정',file:null,custom:true});
  }
}

async function applyFullAdjustment(data){
  validateFullAdjustmentFile(data);
  const mismatches=[],sourceTouchedLayers=new Set(),explicitDerivedByLayer=new Map();
  for(const [frameId,framePlan] of Object.entries(data.frames)){
    const frame=frameRecord(frameId);
    for(const [layer,plan] of Object.entries(framePlan.layers)){
      if(plan?.baseChecksum&&canvasChecksum(layerCanvas(frameId,layer))!==String(plan.baseChecksum))mismatches.push(frameId+' / '+partLabel(layer));
      if(frame.derived){
        const set=explicitDerivedByLayer.get(layer)||new Set();set.add(frameId);explicitDerivedByLayer.set(layer,set);
      }else sourceTouchedLayers.add(layer);
    }
  }
  if(mismatches.length&&!confirm('분석 이후 '+mismatches.join(', ')+' 픽셀이 바뀌었습니다. 그래도 전체 AI 보정을 적용할까요?'))return false;

  let layerChanges=0,derivedChanges=0;
  for(const [frameId,framePlan] of Object.entries(data.frames)){
    for(const [layer,plan] of Object.entries(framePlan.layers)){
      const assetId=data.assetIds?.[layer]||data.target?.assetIds?.[layer];
      applyLayerAdjustmentPlan(frameId,layer,plan,assetId);
      if(assetId&&$(LAYER_ID_FIELDS[layer]))$(LAYER_ID_FIELDS[layer]).value=assetId;
      layerChanges++;
    }
  }
  for(const layer of sourceTouchedLayers){
    derivedChanges+=seedDerivedFramesForLayer(layer,{force:true,skipIds:explicitDerivedByLayer.get(layer)||new Set()});
  }
  stopPlayback();selection=null;
  refreshFrameButtons();renderSelectedAssetList();renderAssetGrid();refreshAdjustmentSummary();refreshPartSizeStatus();render();saveLocal();
  setStatus('전체 AI 보정 적용 완료 · 직접 '+layerChanges+'개 + 파생 '+derivedChanges+'개 갱신');
  return true;
}

function buildPartAnalysis(layer=activeLayer){
  if(!LAYERS.includes(layer))throw new Error('지원하지 않는 파츠입니다: '+layer);
  const framesOut={};
  for(const frame of FRAMES){
    const part=layerCanvas(frame.id,layer),body=layerCanvas(frame.id,'body');
    framesOut[frame.id]={
      kind:frame.kind,
      frameNumber:frame.n,
      durationMs:frame.durationMs||null,
      anchors:frame.anchors||null,
      event:frame.event||null,
      derived:!!frame.derived,
      part:{
        ...canvasMetrics(part),
        pixels:sparsePixelsOfCanvas(part,1)
      },
      bodyGuide:{
        ...canvasMetrics(body),
        alphaRuns:alphaRunsOfCanvas(body,24)
      }
    };
  }
  const meta=assetMeta(currentFrame,layer);
  return {
    version:1,
    type:'kidscade-avatar-part-analysis',
    createdAt:new Date().toISOString(),
    canvas:{width:SIZE,height:SIZE,origin:'top-left'},
    avatar:{facing:'left',logicalRoot:[ROOT_X,82],groundY:GROUND_Y,mirrorForRight:true},
    target:{
      layer,
      label:partLabel(layer),
      assetId:assetIdForLayer(layer),
      selectedAsset:meta||null
    },
    frameOrder:FRAMES.map(f=>f.id),
    frames:framesOut,
    adjustmentContract:{
      type:'kidscade-avatar-part-adjustment',
      version:1,
      target:{layer,assetId:assetIdForLayer(layer),canvas:[SIZE,SIZE]},
      frames:{
        'walk-02':{
          baseChecksum:'use frames.walk-02.part.checksum from this analysis',
          copyFrom:'optional frame id, e.g. stand-01',
          operations:[
            {op:'translate',dx:0,dy:0},
            {op:'moveRect',rect:{x:0,y:0,w:1,h:1},dx:0,dy:0},
            {op:'setPixels',pixels:[[0,0,0,0,0,0]]},
            {op:'replacePixels',pixels:[[0,0,255,255,255,255]]}
          ],
          note:'optional explanation'
        }
      },
      rules:[
        'Only include frames that need changes.',
        'Coordinates are integer pixels in the 128x128 top-left origin canvas.',
        'replacePixels clears the target frame first; omitted pixels become transparent.',
        'setPixels changes only listed pixels. RGBA alpha 0 clears a pixel.',
        'moveRect moves an existing rectangular pixel region before later operations.',
        'Operations execute in listed order after optional copyFrom.',
        'If an old JSON only supplies STAND/WALK/JUMP, the studio derives ATTACK/HURT/DEAD/SIT/PICKUP automatically.',
        'Weapons use the leftHand/weaponPivot anchor; shields use rightHand.',
        'Use weaponBack/weaponFront or shieldBack/shieldFront to move the same logical item behind/in front of BODY per frame.',
        'For best quality, explicitly provide action-frame pixels when clothing, hair or equipment needs pose-specific deformation.'
      ]
    }
  };
}

function exportPartAnalysisFile(){
  const data=buildPartAnalysis(activeLayer);
  const name=safeId(assetIdForLayer(activeLayer),activeLayer)+'_'+activeLayer+'_analysis.json';
  downloadBlob(name,new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
  setStatus(partLabel(activeLayer)+' 분석 파일 저장됨 · ChatGPT에 업로드해 보정 JSON을 요청할 수 있습니다.');
}

function snapshotFrameLayer(frameId,layer){
  const c=layerCtx(frameId,layer);if(!c)return;
  const key=historyKey(frameId,layer),h=history.get(key)||{undo:[],redo:[]};
  h.undo.push(c.getImageData(0,0,SIZE,SIZE));
  if(h.undo.length>40)h.undo.shift();
  h.redo=[];history.set(key,h);
}

function translateCanvasInPlace(c,dx,dy){
  const temp=makeCanvas();temp.getContext('2d',{alpha:true}).drawImage(c.canvas||c,0,0);
}

function shiftLayerFrame(frameId,layer,dx,dy){
  const cvs=layerCanvas(frameId,layer),c=layerCtx(frameId,layer);
  if(!cvs||!c)return;
  const temp=makeCanvas();temp.getContext('2d',{alpha:true}).drawImage(cvs,0,0);
  c.clearRect(0,0,SIZE,SIZE);c.drawImage(temp,Math.round(dx)||0,Math.round(dy)||0);
}

function moveRectOnFrame(frameId,layer,rect,dx,dy){
  const c=layerCtx(frameId,layer);if(!c)return;
  const x=clamp(Math.round(Number(rect?.x)||0),0,SIZE-1),y=clamp(Math.round(Number(rect?.y)||0),0,SIZE-1);
  const w=clamp(Math.round(Number(rect?.w)||1),1,SIZE-x),h=clamp(Math.round(Number(rect?.h)||1),1,SIZE-y);
  const nx=clamp(x+(Math.round(Number(dx)||0)),0,SIZE-w),ny=clamp(y+(Math.round(Number(dy)||0)),0,SIZE-h);
  const temp=makeCanvas(w,h),tc=temp.getContext('2d',{alpha:true});
  tc.putImageData(c.getImageData(x,y,w,h),0,0);
  c.clearRect(x,y,w,h);c.drawImage(temp,nx,ny);
}

function applyPixelTuples(frameId,layer,pixels,{replace=false}={}){
  const c=layerCtx(frameId,layer);if(!c)return;
  if(replace)c.clearRect(0,0,SIZE,SIZE);
  const img=c.getImageData(0,0,SIZE,SIZE),d=img.data;
  for(const p of Array.isArray(pixels)?pixels:[]){
    if(!Array.isArray(p)||p.length<6)continue;
    const x=Math.round(Number(p[0])),y=Math.round(Number(p[1]));
    if(x<0||y<0||x>=SIZE||y>=SIZE)continue;
    const i=(y*SIZE+x)*4;
    d[i]=clamp(Math.round(Number(p[2])||0),0,255);
    d[i+1]=clamp(Math.round(Number(p[3])||0),0,255);
    d[i+2]=clamp(Math.round(Number(p[4])||0),0,255);
    d[i+3]=clamp(Math.round(Number(p[5])||0),0,255);
  }
  c.putImageData(img,0,0);
}

function validateAdjustmentFile(data){
  if(!data||data.type!=='kidscade-avatar-part-adjustment'||Number(data.version)!==1)throw new Error('Kidscade AI 보정 파일 형식이 아닙니다.');
  const layer=data.target?.layer;
  if(!LAYERS.includes(layer))throw new Error('알 수 없는 대상 파츠: '+String(layer||'없음'));
  if(data.target?.canvas&&(Number(data.target.canvas[0])!==SIZE||Number(data.target.canvas[1])!==SIZE))throw new Error('128×128 보정 파일만 적용할 수 있습니다.');
  if(!data.frames||typeof data.frames!=='object')throw new Error('frames 보정 정보가 없습니다.');
  for(const [frameId,plan] of Object.entries(data.frames)){
    if(!frames.has(frameId))throw new Error('알 수 없는 프레임: '+frameId);
    if(plan?.copyFrom&&!frames.has(plan.copyFrom))throw new Error(frameId+'의 copyFrom 프레임을 찾을 수 없습니다.');
    for(const op of Array.isArray(plan?.operations)?plan.operations:[]){
      if(!['translate','moveRect','setPixels','replacePixels'].includes(op?.op))throw new Error(frameId+'에 지원하지 않는 op가 있습니다: '+String(op?.op));
    }
  }
  return layer;
}

async function applyPartAdjustment(data){
  const layer=validateAdjustmentFile(data),mismatches=[];
  for(const [frameId,plan] of Object.entries(data.frames)){
    if(plan?.baseChecksum&&canvasChecksum(layerCanvas(frameId,layer))!==String(plan.baseChecksum))mismatches.push(frameId);
  }
  if(mismatches.length&&!confirm('분석 이후 '+mismatches.join(', ')+' 프레임의 픽셀이 바뀌었습니다. 그래도 AI 보정을 적용할까요?'))return false;

  const assetId=safeId(data.target?.assetId||assetIdForLayer(layer),layer+'-01');
  let changed=0;
  for(const [frameId,plan] of Object.entries(data.frames)){
    applyLayerAdjustmentPlan(frameId,layer,plan,assetId);
    setAssetMeta(frameId,layer,{layer,id:assetId,label:assetId,file:null,custom:true});
    changed++;
  }
  const field=LAYER_ID_FIELDS[layer];
  if(field&&$(field))$(field).value=assetId;
  seedDerivedFramesForLayer(layer,{force:true,skipIds:new Set(Object.keys(data.frames||{}))});
  stopPlayback();selectLayer(layer);
  refreshFrameButtons();renderSelectedAssetList();renderAssetGrid();refreshAdjustmentSummary();refreshPartSizeStatus();render();saveLocal();
  setStatus(partLabel(layer)+' JSON 적용 완료 · '+assetId+' · '+changed+'개 프레임');
  return true;
}

function refreshAdjustmentSummary(){
  const el=$('adjustmentSummary');if(!el)return;
  const filled=FRAMES.filter(f=>hasInk(layerCanvas(f.id,activeLayer))).length;
  el.textContent='대상: '+partLabel(activeLayer)+' · '+assetIdForLayer(activeLayer)+' · 픽셀 존재 '+filled+' / '+FRAMES.length+' 프레임';
}

function draftBodySourceUrl(index){
  const sec=String(DRAFT_BODY_SOURCE_SECONDS[index]).padStart(2,'0');
  const file='ChatGPT 이미지 2026년 10월 3일 오후 08_59_'+sec+'-'+String(index+1)+'.png';
  return new URL('../assets/game/characters/'+file,window.location.href).href;
}

function loadImageUrl(url,timeoutMs=10000){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    let settled=false;
    const timer=setTimeout(()=>{
      if(settled)return;settled=true;img.src='';
      reject(new Error('10초 안에 이미지를 받지 못했습니다: '+decodeURI(url)));
    },timeoutMs);
    img.onload=()=>{if(settled)return;settled=true;clearTimeout(timer);resolve(img)};
    img.onerror=()=>{if(settled)return;settled=true;clearTimeout(timer);reject(new Error('이미지를 불러오지 못했습니다: '+decodeURI(url)))};
    img.src=url;
  });
}


function starterAssetUrl(layer){return assetEntryUrl(catalogEntry(layer)||STARTER_ASSETS[layer])}

async function loadCatalogAsset(entry,{apply=false,announce=true}={}){
  if(!entry)return false;
  const layer=entry.layer;
  stopPlayback();
  if(sourceImage||pendingCatalogAsset)clearStamp();
  if(currentFrame!=='stand-01')selectFrame('stand-01');
  selectLayer(layer);
  const loadToken=++catalogLoadToken;
  try{
    const category=$('assetCategory');if(category&&ASSET_CATEGORY_ORDER.includes(layer))category.value=layer;
    const field=LAYER_ID_FIELDS[layer];
    if(field&&$(field))$(field).value=entry.id;
    pendingCatalogAsset={layer:entry.layer,id:entry.id,label:entry.label||entry.id,file:entry.file};
    if(announce)setStatus('GitHub '+partLabel(layer)+' · '+(entry.label||entry.id)+' 불러오는 중…');
    const url=assetEntryUrl(entry);
    const img=await loadImageUrl(url,12000);
    if(loadToken!==catalogLoadToken||activeLayer!==layer||currentFrame!=='stand-01')return false;
    sourceImage=img;$('sourcePreview').src=url;$('sourcePreview').classList.remove('hidden');
    refreshPreparedSource();
    if(sourceRuntimeReady){
      $('stampX').value='0';$('stampY').value='0';$('stampW').value=String(SIZE);$('stampH').value=String(SIZE);$('stampRotation').value='0';
      pixelizePreview(false);
    }else{autoFitStamp(false);pixelizePreview(false)}
    refreshNudgeMode();render();renderAssetGrid();
    if(apply){applyPixelized();return true}
    if(announce)setStatus(partLabel(layer)+' 미리보기 · 화살표로 맞춘 뒤 적용하세요.');
    return true;
  }catch(e){
    if(loadToken!==catalogLoadToken)return false;
    setStatus('에셋 불러오기 실패 · '+partLabel(layer)+' · '+(e?.message||e),true);
    clearStamp();return false;
  }
}
async function loadStarterAsset(layer,opts={}){return loadCatalogAsset(catalogEntry(layer)||STARTER_ASSETS[layer],opts)}

async function loadSchoolStarterSet(){
  const button=$('loadSchoolStarterSet');
  if(!confirm('학교 탐험가 기본 9종을 23프레임에 적용할까요? BODY는 유지되며 해당 파츠만 교체됩니다.'))return;
  if(button)button.disabled=true;
  try{
    const response=await fetch('/assets/game/characters/kidscade-avatar-v3/school-starter/school-starter.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('v3 기본 세트 파일을 불러오지 못했습니다.');
    const data=await response.json();
    await applyFullAdjustment(data);
    selectFrame('stand-01');selectLayer('hair');
    setStatus('v3 학교 탐험가 기본 9종 · 23프레임 적용 완료 · 자/교과서 앞뒤 패스 포함');
  }catch(error){setStatus(error.message||String(error),true)}
  finally{if(button)button.disabled=false}
}

async function loadStarterSet(){
  const button=$('loadStarterSet'),old=button?.textContent||'';
  const rec=frames.get('stand-01');
  const occupied=STARTER_CORE_LAYERS.some(layer=>hasInk(rec?.[layer]));
  if(occupied&&!confirm('STAND-01의 기본 파츠를 GitHub 기본 세트로 덮어쓸까요? BODY는 유지됩니다.'))return;
  if(button){button.disabled=true;button.textContent='기본 세트 연결 중…'}
  try{
    selectFrame('stand-01');
    for(let i=0;i<STARTER_CORE_LAYERS.length;i++){
      const layer=STARTER_CORE_LAYERS[i];
      if(button)button.textContent='기본 세트 '+(i+1)+' / '+STARTER_CORE_LAYERS.length;
      setStatus('기본 세트 연결 중 · '+(i+1)+' / '+STARTER_CORE_LAYERS.length+' · '+(LAYER_LABELS[layer]||layer));
      const ok=await loadStarterAsset(layer,{apply:true,announce:false});
      if(!ok)throw new Error((LAYER_LABELS[layer]||layer)+' 연결 실패');
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    selectLayer('hair');
    refreshFrameButtons();saveLocal();
    setStatus('기본 세트 연결 완료 · STAND-01에서 각 파츠 위치를 확인하고 필요한 파츠만 모든 프레임으로 복사하세요.');
  }catch(e){
    setStatus('기본 세트 연결 중단: '+(e?.message||e),true);
  }finally{
    clearStamp();
    selectFrame('stand-01');
    selectLayer('hair');
    if(button){button.disabled=false;button.textContent=old}
  }
}

function rasterDraftBodyImage(img){
  const source=makeCanvas(img.naturalWidth||img.width||1,img.naturalHeight||img.height||1);
  const sc=source.getContext('2d',{alpha:true});
  sc.imageSmoothingEnabled=true;
  sc.imageSmoothingQuality='high';
  sc.drawImage(img,0,0,source.width,source.height);

  const base=makeCanvas(),bc=base.getContext('2d',{alpha:true});
  bc.imageSmoothingEnabled=true;
  bc.imageSmoothingQuality='high';
  bc.drawImage(source,0,0,SIZE,SIZE);

  const low=makeCanvas(DRAFT_BODY_SOURCE_RESOLUTION,DRAFT_BODY_SOURCE_RESOLUTION);
  const lc=low.getContext('2d',{alpha:true});
  lc.imageSmoothingEnabled=true;
  lc.imageSmoothingQuality='high';
  lc.drawImage(base,0,0,DRAFT_BODY_SOURCE_RESOLUTION,DRAFT_BODY_SOURCE_RESOLUTION);

  const out=makeCanvas(),oc=out.getContext('2d',{alpha:true});
  oc.imageSmoothingEnabled=false;
  oc.drawImage(low,0,0,DRAFT_BODY_SOURCE_RESOLUTION,DRAFT_BODY_SOURCE_RESOLUTION,0,0,SIZE,SIZE);
  hardenAlpha(out,56);
  quantizeCanvas(out,DRAFT_BODY_SOURCE_PALETTE);
  hardenAlpha(out,1);
  return out;
}

function shiftCanvas(source,dx,dy){
  const out=makeCanvas(),o=out.getContext('2d',{alpha:true});
  o.imageSmoothingEnabled=false;
  o.drawImage(source,dx,dy);
  return out;
}

function drawTransformedLayer(target,source,spec={}){
  const c=target.getContext('2d',{alpha:true});
  const pivot=spec.pivot||[ROOT_X,GROUND_Y],dx=Number(spec.dx)||0,dy=Number(spec.dy)||0;
  const angle=(Number(spec.angle)||0)*Math.PI/180;
  const scaleX=Number.isFinite(Number(spec.scaleX))?Number(spec.scaleX):1;
  const scaleY=Number.isFinite(Number(spec.scaleY))?Number(spec.scaleY):1;
  c.save();c.imageSmoothingEnabled=false;
  c.translate(pivot[0]+dx,pivot[1]+dy);
  c.rotate(angle);c.scale(scaleX,scaleY);
  c.translate(-pivot[0],-pivot[1]);
  c.drawImage(source,0,0);
  c.restore();
}

const EQUIPMENT_ATTACK_ANGLES={
  'attack-01':0,'attack-02':-26,'attack-03':-62,'attack-04':-105,'attack-05':-12
};
function equipmentAnchor(frame,layer){
  const anchors=frame?.anchors||{};
  if(WEAPON_LAYERS.includes(layer))return anchors.weaponPivot||anchors.leftHand||null;
  if(SHIELD_LAYERS.includes(layer))return anchors.rightHand||null;
  return null;
}
function derivedEquipmentCanvas(frameId,layer,spec){
  const out=makeCanvas(),sourceId=spec.source||'stand-01',source=layerCanvas(sourceId,layer);
  if(!source||!hasInk(source))return out;
  const sourceFrame=frameRecord(sourceId),targetFrame=frameRecord(frameId);
  const from=equipmentAnchor(sourceFrame,layer),to=equipmentAnchor(targetFrame,layer);
  if(!from||!to){drawTransformedLayer(out,source,spec);return out}
  const c=out.getContext('2d',{alpha:true});c.save();c.imageSmoothingEnabled=false;
  const angle=WEAPON_LAYERS.includes(layer)&&targetFrame.kind==='attack'
    ? Number(EQUIPMENT_ATTACK_ANGLES[frameId]||0)
    : Number(spec.angle||0);
  c.translate(to[0],to[1]);c.rotate(angle*Math.PI/180);c.translate(-from[0],-from[1]);c.drawImage(source,0,0);c.restore();
  return out;
}

function derivedLayerCanvas(frameId,layer){
  const spec=DERIVED_BODY_POSES[frameId],out=makeCanvas();
  if(!spec)return out;
  const source=layerCanvas(spec.source||'stand-01',layer);
  if(!source||!hasInk(source))return out;

  if(EQUIPMENT_LAYERS.includes(layer))return derivedEquipmentCanvas(frameId,layer,spec);

  if(spec.type==='attackMix'){
    const mixed=makeCanvas(),m=mixed.getContext('2d',{alpha:true});m.imageSmoothingEnabled=false;
    m.drawImage(source,0,0);
    m.clearRect(40,72,16,30);m.clearRect(77,72,18,30);
    const armCandidate=layerCanvas(spec.armSource||'jump-01',layer);
    const arms=armCandidate&&hasInk(armCandidate)?armCandidate:source;
    m.drawImage(arms,39,66,20,29,39,72,20,29);
    m.drawImage(arms,74,66,22,29,74,72,22,29);
    drawTransformedLayer(out,mixed,spec);
    return out;
  }

  if(spec.type==='sitMix'){
    const c=out.getContext('2d',{alpha:true});c.imageSmoothingEnabled=false;
    const down=Number(spec.down)||0;
    c.drawImage(source,35,20,60,81,35,20+down,60,81);
    const legCandidate=layerCanvas(spec.legSource||'jump-01',layer);
    const legs=legCandidate&&hasInk(legCandidate)?legCandidate:source;
    c.drawImage(legs,45,87,45,26,41,92+Math.floor(down/2),45,26);
    return out;
  }

  drawTransformedLayer(out,source,spec);
  return out;
}

function seedDerivedFramesForLayer(layer,{force=false,skipIds=null}={}){
  let changed=0;
  for(const frame of DERIVED_FRAMES){
    if(skipIds?.has(frame.id))continue;
    const target=layerCanvas(frame.id,layer);
    if(!force&&hasInk(target))continue;
    const generated=derivedLayerCanvas(frame.id,layer),ctx=layerCtx(frame.id,layer);
    ctx.clearRect(0,0,SIZE,SIZE);
    if(hasInk(generated)){
      ctx.drawImage(generated,0,0);
      const sourceId=DERIVED_BODY_POSES[frame.id]?.source||frame.fallbackFrom||'stand-01';
      const meta=assetMeta(sourceId,layer);
      if(meta)setAssetMeta(frame.id,layer,{...meta,derived:true,derivedFrom:sourceId});
      else if(layer==='body')setAssetMeta(frame.id,'body',{layer:'body',id:assetIdForLayer('body'),label:assetIdForLayer('body'),file:null,custom:true,derived:true,derivedFrom:sourceId});
      changed++;
    }else setAssetMeta(frame.id,layer,null);
  }
  return changed;
}

function seedDerivedFrames({force=false}={}){
  let changed=0;
  for(const layer of LAYERS)changed+=seedDerivedFramesForLayer(layer,{force});
  if(changed){rememberAllBodyFrames();refreshFrameButtons();renderSelectedAssetList();refreshAdjustmentSummary();refreshPartSizeStatus();render();saveLocal()}
  return changed;
}

function regenerateDerivedFrames(){
  if(!confirm('ATTACK·HURT·DEAD·SIT·PICKUP 파생 프레임을 현재 STAND/JUMP 기준으로 다시 만들까요? 파생 프레임에서 직접 수정한 내용은 덮어씁니다.'))return;
  const changed=seedDerivedFrames({force:true});
  setStatus('파생 동작 프레임 다시 생성 완료 · '+changed+'개 레이어/프레임 갱신');
}

function allBodyFramesEmpty(){
  return FRAMES.every(f=>!hasInk(layerCanvas(f.id,'body')));
}
function missingBodyFrames(){return FRAMES.filter(f=>!hasInk(layerCanvas(f.id,'body')))}

async function repairMissingBodyFrames(announce=true){
  const missing=missingBodyFrames();
  if(!missing.length){rememberAllBodyFrames();return 0}
  try{
    const sourceMissing=SOURCE_BODY_FRAMES.filter(f=>!hasInk(layerCanvas(f.id,'body')));
    if(sourceMissing.length){
      const masterImg=await loadImageUrl(draftBodySourceUrl(0));
      const masterRaw=rasterDraftBodyImage(masterImg),masterBox=bboxOfCanvas(masterRaw,8);
      if(!masterBox)throw new Error('기준 STAND-01 BODY 실루엣을 찾지 못했습니다.');
      const masterCenter=masterBox.x+(masterBox.w-1)/2;
      const dx=Math.round(ROOT_X-masterCenter),dy=GROUND_Y-masterBox.maxY;
      for(const frame of sourceMissing){
        const index=SOURCE_BODY_FRAMES.findIndex(f=>f.id===frame.id);
        const raw=index===0?masterRaw:rasterDraftBodyImage(await loadImageUrl(draftBodySourceUrl(index)));
        const shifted=shiftCanvas(raw,dx,dy),target=layerCtx(frame.id,'body');
        target.clearRect(0,0,SIZE,SIZE);target.drawImage(shifted,0,0);
        rememberBodyFrame(frame.id);
      }
    }
    const derivedChanged=seedDerivedFramesForLayer('body',{force:false});
    refreshFrameButtons();renderSelectedAssetList();refreshAdjustmentSummary();refreshPartSizeStatus();render();saveLocal();
    if(announce)setStatus('누락 BODY 자동 복구 완료 · 기본 '+sourceMissing.length+'프레임 + 파생 '+derivedChanged+'프레임');
    return sourceMissing.length+derivedChanged;
  }catch(e){
    if(announce)setStatus('누락 BODY 복구 실패: '+(e?.message||e),true);
    return 0;
  }
}

async function loadDraftBodySet(announce=true){
  const button=$('loadDraftBodySet');
  const oldText=button?.textContent||'';
  if(button){button.disabled=true;button.textContent='기본 BODY 불러오는 중…'}
  try{
    if(!allBodyFramesEmpty()&&announce&&!confirm('현재 BODY를 기본 7프레임으로 다시 불러오고 ATTACK·HURT·DEAD·SIT·PICKUP 동작을 다시 생성할까요? HAIR/의상 레이어는 유지됩니다.'))return false;
    setStatus('기본 BODY 7프레임 준비 중 · 0 / '+SOURCE_BODY_FRAMES.length);
    const raw=[];
    for(let i=0;i<SOURCE_BODY_FRAMES.length;i++){
      const frame=SOURCE_BODY_FRAMES[i];
      setStatus('기본 BODY 준비 중 · '+(i+1)+' / '+SOURCE_BODY_FRAMES.length+' · '+frame.label);
      if(button)button.textContent='BODY '+(i+1)+' / '+SOURCE_BODY_FRAMES.length;
      const img=await loadImageUrl(draftBodySourceUrl(i));
      await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
      raw.push(rasterDraftBodyImage(img));
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const masterBox=bboxOfCanvas(raw[0],8);
    if(!masterBox)throw new Error('STAND-01에서 캐릭터 실루엣을 찾지 못했습니다.');
    const masterCenter=masterBox.x+(masterBox.w-1)/2;
    const dx=Math.round(ROOT_X-masterCenter);
    const dy=GROUND_Y-masterBox.maxY;

    for(let i=0;i<SOURCE_BODY_FRAMES.length;i++){
      const target=layerCtx(SOURCE_BODY_FRAMES[i].id,'body');
      target.clearRect(0,0,SIZE,SIZE);
      target.drawImage(shiftCanvas(raw[i],dx,dy),0,0);
    }
    const derivedCount=seedDerivedFramesForLayer('body',{force:true});
    selection=null;history.clear();$('referenceFrame').value='stand-01';rememberAllBodyFrames();
    refreshFrameButtons();render();saveLocal();
    setStatus('BODY '+FRAMES.length+'프레임 준비 완료 · 기본 7 + 파생 '+derivedCount+' · ATTACK/HURT/DEAD/SIT/PICKUP 편집 가능');
    return true;
  }catch(e){
    setStatus('BODY 초안 불러오기 실패: '+(e?.message||e),true);
    return false;
  }finally{
    if(button){button.disabled=false;button.textContent=oldText}
  }
}

function renderAnimationModeButtons(){
  const host=$('animationModeButtons');if(!host)return;
  host.innerHTML='';
  for(const [kind,group] of Object.entries(ANIMATION_GROUPS)){
    const b=document.createElement('button');b.type='button';b.className='secondary anim-mode-btn';
    b.dataset.kind=kind;b.textContent=group.label;
    b.classList.toggle('active',animationFilterKind===kind);
    b.addEventListener('click',()=>startPlayback(kind));
    host.appendChild(b);
  }
  const stop=document.createElement('button');stop.type='button';stop.className='secondary';stop.textContent='정지';stop.addEventListener('click',stopPlayback);host.appendChild(stop);
}
function renderFrameButtonsForKind(kind=animationFilterKind){
  animationFilterKind=ANIMATION_GROUPS[kind]?kind:'stand';
  const host=$('frameGrid');host.innerHTML='';
  for(const frame of FRAMES.filter(f=>f.kind===animationFilterKind)){
    const b=document.createElement('button');
    b.type='button';b.className='frame-btn';b.dataset.frame=frame.id;
    b.addEventListener('click',()=>{stopPlayback();selectFrame(frame.id)});
    host.appendChild(b);
  }
  renderAnimationModeButtons();
}
function buildFrameButtons(){
  renderFrameButtonsForKind('stand');
  const ref=$('referenceFrame');
  ref.innerHTML=FRAMES.map(f=>'<option value="'+f.id+'">'+f.label+'</option>').join('');
  ref.value='stand-01';
  refreshFrameButtons();
}

function refreshFrameButtons(){
  document.querySelectorAll('.frame-btn').forEach(b=>{
    const id=b.dataset.frame,rec=frames.get(id),f=frameRecord(id);
    const body=hasInk(rec.body);
    const face=anyLayerHasInk(rec,FACE_LAYERS);
    const style=anyLayerHasInk(rec,HAIR_LAYERS);
    const gear=anyLayerHasInk(rec,[...OUTFIT_LAYERS,...ACCESSORY_LAYERS,...EQUIPMENT_LAYERS]);
    b.classList.toggle('active',id===currentFrame);
    b.innerHTML='<span>'+f.label+'</span><span class="dots">'+
      '<span class="'+(body?'dot-body':'dot-empty')+'">●</span>'+
      '<span class="'+(face?'dot-hair':'dot-empty')+'">●</span>'+
      '<span class="'+(style?'dot-upper':'dot-empty')+'">●</span>'+
      '<span class="'+(gear?'dot-lower':'dot-empty')+'">●</span></span>';
  });
  refreshLayerStatus();
}

function refreshLayerStatus(){
  const host=$('layerStatus');if(!host)return;
  const rec=frames.get(currentFrame);
  const defs=[
    ['BODY',hasInk(rec.body)],
    ['FACE',anyLayerHasInk(rec,FACE_LAYERS)],
    ['HAIR',anyLayerHasInk(rec,HAIR_LAYERS)],
    ['OUTFIT',anyLayerHasInk(rec,OUTFIT_LAYERS)],
    ['EQUIP',anyLayerHasInk(rec,EQUIPMENT_LAYERS)],
    ['ACC',anyLayerHasInk(rec,ACCESSORY_LAYERS)]
  ];
  host.innerHTML=defs.map(([label,on])=>'<span class="badge '+(on?'on':'')+'">'+label+'</span>').join('');
}

function selectLayer(layer){
  if(!LAYERS.includes(layer))return;
  if(layer!==activeLayer&&(sourceImage||pendingCatalogAsset))clearStamp();
  activeLayer=layer;selection=null;selectionStart=null;invalidatePixelPreview();
  for(const [name,id] of Object.entries(LAYER_BUTTON_IDS)){
    const el=$(id);if(el)el.className=name===activeLayer?'active':'secondary';
  }
  if(sourceImage){autoFitStamp(false);pixelizePreview(false)}
  else render();
  refreshNudgeMode();syncLayerSelect();
  const category=$('assetCategory');if(category&&ASSET_CATEGORY_ORDER.includes(activeLayer)){category.value=activeLayer;renderAssetGrid()}
  renderSelectedAssetList();refreshFocusToggle();refreshAdjustmentSummary();refreshPartSizeStatus();
  setStatus(frameRecord().label+' · '+(LAYER_LABELS[activeLayer]||activeLayer)+' 편집');
}

function selectFrame(id){
  if(!frames.has(id))return;
  if(id!==currentFrame&&(sourceImage||pendingCatalogAsset))clearStamp();
  const nextKind=frameRecord(id).kind;
  if(nextKind!==animationFilterKind)renderFrameButtonsForKind(nextKind);
  currentFrame=id;selection=null;selectionStart=null;invalidatePixelPreview();refreshFrameButtons();
  if(sourceImage){autoFitStamp(false);pixelizePreview(false)}
  else render();
  renderSelectedAssetList();renderAssetGrid();refreshPartSizeStatus();
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
  let bodyBlocked=false;
  if(activeLayer==='body'&&!hasInk(layerCanvas(currentFrame,'body'))){
    bodyBlocked=restoreBodySafetySnapshot(currentFrame);
  }else if(activeLayer==='body')rememberBodyFrame(currentFrame);
  refreshFrameButtons();renderSelectedAssetList();renderAssetGrid();refreshAdjustmentSummary();refreshPartSizeStatus();scheduleSave();render();
  setStatus(bodyBlocked?'BODY가 완전히 사라지는 편집을 안전장치가 되돌렸습니다.':message+' · 자동 저장 대기',bodyBlocked);
}
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{saveLocal();setStatus('브라우저에 자동 저장됨')},300);
}

function refreshNudgeMode(){
  const el=$('nudgeMode');if(!el)return;
  const strong=el.querySelector('strong');if(!strong)return;
  strong.textContent=sourceImage?'불러온 이미지 배치':'현재 '+activeLayer.toUpperCase()+' 레이어';
}

function nudgeCurrent(dx,dy){
  if(sourceImage){
    $('stampX').value=String((Number($('stampX').value)||0)+dx);
    $('stampY').value=String((Number($('stampY').value)||0)+dy);
    invalidatePixelPreview();
    pixelizePreview(false);
    render();
    refreshNudgeMode();
    setStatus('불러온 이미지 '+(dx||0)+','+(dy||0)+'px 이동 · 적용 전 위치 조정 중');
    return;
  }
  moveLayerOrSelection(dx,dy);
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
    if(activeLayer==='body'){
      const box=bboxOfCanvas(layerCanvas());
      if(box){
        dx=clamp(dx,-box.x,SIZE-1-box.maxX);
        dy=clamp(dy,-box.y,SIZE-1-box.maxY);
      }
    }
    const temp=makeCanvas();temp.getContext('2d',{alpha:true}).drawImage(layerCanvas(),0,0);
    c.clearRect(0,0,SIZE,SIZE);c.drawImage(temp,dx,dy);
  }
  afterEdit((selection?'선택 영역':'레이어')+' '+dx+','+dy+' 이동');
}

function refreshPartSizeStatus(){
  const el=$('partSizeStatus');if(!el)return;
  const strong=el.querySelector('strong');if(!strong)return;
  const box=bboxOfCanvas(layerCanvas());
  strong.textContent=box?(box.w+'×'+box.h+'px'):'비어 있음';
}

function partScaleAnchor(layer,box){
  const bottomAnchored=['body','lower','shoes'].includes(layer);
  return {
    x:box.x+box.w/2,
    y:bottomAnchored?box.y+box.h:box.y+box.h/2,
    bottom:bottomAnchored
  };
}

function scaledDimension(value,factor){
  if(!Number.isFinite(factor)||factor<=0)return value;
  let next=Math.round(value*factor);
  if(factor>1&&next===value)next=value+1;
  if(factor<1&&next===value)next=value-1;
  return clamp(next,1,SIZE);
}

function resizeActiveLayer({uniformPixels=0,factor=1,dw=0,dh=0}={}){
  if(sourceImage)return setStatus('불러온 이미지를 먼저 현재 파츠에 적용한 뒤 크기를 조절하세요.',true);
  const src=layerCanvas(),box=bboxOfCanvas(src);
  if(!box)return setStatus('현재 파츠가 비어 있습니다.',true);

  let newW=box.w,newH=box.h;
  if(uniformPixels){
    const longest=Math.max(box.w,box.h);
    const target=clamp(longest+uniformPixels,1,SIZE);
    const ratio=target/longest;
    newW=scaledDimension(box.w,ratio);
    newH=scaledDimension(box.h,ratio);
  }else if(factor!==1){
    newW=scaledDimension(box.w,factor);
    newH=scaledDimension(box.h,factor);
  }
  newW=clamp(newW+dw,1,SIZE);
  newH=clamp(newH+dh,1,SIZE);
  if(newW===box.w&&newH===box.h)return setStatus('현재 크기에서 더 조절할 수 없습니다.',true);

  const anchor=partScaleAnchor(activeLayer,box);
  let newX=Math.round(anchor.x-newW/2);
  let newY=anchor.bottom?Math.round(anchor.y-newH):Math.round(anchor.y-newH/2);
  newX=clamp(newX,0,SIZE-newW);
  newY=clamp(newY,0,SIZE-newH);

  snapshot();
  const crop=makeCanvas(box.w,box.h),cropCtx=crop.getContext('2d',{alpha:true});
  cropCtx.imageSmoothingEnabled=false;
  cropCtx.drawImage(src,box.x,box.y,box.w,box.h,0,0,box.w,box.h);
  const c=layerCtx();c.clearRect(0,0,SIZE,SIZE);c.save();c.imageSmoothingEnabled=false;
  c.drawImage(crop,0,0,box.w,box.h,newX,newY,newW,newH);c.restore();
  selection=null;selectionStart=null;
  afterEdit(partLabel(activeLayer)+' 크기 '+box.w+'×'+box.h+' → '+newW+'×'+newH+'px');
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

function refreshFocusToggle(){
  const button=$('focusPartToggle');if(!button)return;
  button.setAttribute('aria-pressed',focusPartOnly?'true':'false');
  button.textContent=focusPartOnly?'모든 파츠 보기':'선택 파츠만 보기';
  button.className=focusPartOnly?'primary-wide':'secondary primary-wide';
}

function toggleFocusPart(){
  focusPartOnly=!focusPartOnly;
  refreshFocusToggle();
  render();
  setStatus(focusPartOnly
    ? partLabel(activeLayer)+' 집중 보기 · BODY와 현재 파츠만 표시'
    : '전체 파츠 보기 · 현재 조합을 모두 표시');
}

function layerVisible(layer){
  if(layer==='body')return $('showBody').checked;
  if(FACE_LAYERS.includes(layer))return $('showFace').checked;
  if(HAIR_LAYERS.includes(layer))return $('showHair').checked;
  if(OUTFIT_LAYERS.includes(layer))return $('showClothes').checked;
  if(EQUIPMENT_LAYERS.includes(layer))return $('showEquipment').checked;
  if(ACCESSORY_LAYERS.includes(layer))return $('showAccessories').checked;
  return true;
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

  for(const layer of RENDER_ORDER){
    const focusVisible=!focusPartOnly||layer==='body'||layer===activeLayer;
    if(focusVisible&&layerVisible(layer)&&hasInk(rec[layer]))ctx.drawImage(rec[layer],0,0);
  }

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
  preparedSource=null;sourceCrop=null;sourceRuntimeReady=false;invalidatePixelPreview();
  if(!sourceImage)return;
  const w=Math.max(1,sourceImage.naturalWidth||sourceImage.width||1),h=Math.max(1,sourceImage.naturalHeight||sourceImage.height||1);
  sourceRuntimeReady=w===SIZE&&h===SIZE;
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
  const head={x:body.x,y:body.y,w:body.w,h:Math.max(1,Math.round(body.h*.55))};
  if(activeLayer==='body')return {x:22,y:6,w:84,h:113,ground:true};
  if(activeLayer==='hair'){
    return {x:Math.max(0,head.x-5),y:Math.max(0,head.y-4),w:Math.min(SIZE-head.x+5,head.w+10),h:Math.min(72,head.h+7)};
  }
  if(activeLayer==='hat'){
    return {x:Math.max(0,head.x-7),y:Math.max(0,head.y-12),w:Math.min(SIZE-head.x+7,head.w+14),h:Math.min(58,Math.round(head.h*.72))};
  }
  if(activeLayer==='eyes'){
    return {x:Math.round(head.x+head.w*.04),y:Math.round(head.y+head.h*.34),w:Math.max(10,Math.round(head.w*.58)),h:Math.max(8,Math.round(head.h*.22))};
  }
  if(activeLayer==='mouth'){
    return {x:Math.round(head.x+head.w*.04),y:Math.round(head.y+head.h*.61),w:Math.max(9,Math.round(head.w*.38)),h:Math.max(7,Math.round(head.h*.16))};
  }
  if(activeLayer==='mask'){
    return {x:Math.max(0,Math.round(head.x-head.w*.03)),y:Math.round(head.y+head.h*.24),w:Math.round(head.w*.70),h:Math.round(head.h*.52)};
  }
  if(activeLayer==='earring'){
    return {x:Math.round(head.x+head.w*.72),y:Math.round(head.y+head.h*.43),w:Math.max(8,Math.round(head.w*.23)),h:Math.max(10,Math.round(head.h*.28))};
  }
  if(activeLayer==='upper'){
    return {x:Math.max(0,Math.round(body.x+body.w*.12)),y:Math.round(body.y+body.h*.46),w:Math.round(body.w*.76),h:Math.round(body.h*.30)};
  }
  if(activeLayer==='lower'){
    return {x:Math.max(0,Math.round(body.x+body.w*.16)),y:Math.round(body.y+body.h*.65),w:Math.round(body.w*.68),h:Math.round(body.h*.30)};
  }
  if(activeLayer==='shoes'){
    return {x:Math.max(0,Math.round(body.x+body.w*.08)),y:Math.round(body.y+body.h*.84),w:Math.round(body.w*.84),h:Math.max(10,Math.round(body.h*.18))};
  }
  if(activeLayer==='gloves'){
    return {x:Math.max(0,Math.round(body.x-body.w*.04)),y:Math.round(body.y+body.h*.50),w:Math.min(SIZE,Math.round(body.w*1.08)),h:Math.round(body.h*.28)};
  }
  return {x:body.x,y:body.y,w:body.w,h:body.h};
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
  const base=makeCanvas(),bc=base.getContext('2d',{alpha:true});drawStamp(bc,1,!sourceRuntimeReady);
  if(sourceRuntimeReady){
    hardenAlpha(base,1);
    return base;
  }
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
  const appliedLayer=activeLayer,applied=partLabel(activeLayer);
  const meta=pendingCatalogAsset&&pendingCatalogAsset.layer===activeLayer?{...pendingCatalogAsset}:{layer:activeLayer,id:assetIdForLayer(activeLayer),label:'사용자 '+applied,file:null,custom:true};
  setAssetMeta(currentFrame,activeLayer,meta);
  clearStamp();
  afterEdit(applied+' · '+currentFrame+'에 적용함');
}

function fitStamp(){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  $('stampX').value='0';$('stampY').value='0';$('stampW').value='128';$('stampH').value='128';$('stampRotation').value='0';invalidatePixelPreview();render();setStatus('원본을 128×128 전체 캔버스에 맞춤');
}
function commitStamp(){
  if(!sourceImage)return setStatus('먼저 이미지를 불러오세요.',true);
  snapshot();const c=layerCtx();c.clearRect(0,0,SIZE,SIZE);drawStamp(c,1,false);selection=null;
  const appliedLayer=activeLayer,applied=partLabel(activeLayer);
  const meta=pendingCatalogAsset&&pendingCatalogAsset.layer===activeLayer?{...pendingCatalogAsset}:{layer:activeLayer,id:assetIdForLayer(activeLayer),label:'사용자 '+applied,file:null,custom:true};
  setAssetMeta(currentFrame,activeLayer,meta);
  clearStamp();afterEdit('원본 '+applied+' 적용함');
}
function clearStamp(){
  catalogLoadToken++;
  sourceImage=null;preparedSource=null;sourceCrop=null;sourceRuntimeReady=false;pixelPreviewReady=false;pendingCatalogAsset=null;
  $('sourcePreview').src='';$('sourcePreview').classList.add('hidden');$('sourceFile').value='';
  $('pixelPreviewCanvas').getContext('2d').clearRect(0,0,SIZE,SIZE);
  refreshNudgeMode();render();
}

function copyLayerToAllFrames(){
  if(sourceImage)return setStatus('먼저 불러온 이미지를 현재 파츠에 적용해 주세요.',true);
  const src=layerCanvas();
  if(!hasInk(src))return setStatus('현재 파츠가 비어 있습니다.',true);
  if(!confirm((LAYER_LABELS[activeLayer]||activeLayer)+'을(를) 모든 애니메이션 프레임에 같은 좌표로 복사할까요?'))return;
  for(const f of FRAMES){
    if(f.id===currentFrame)continue;
    const dst=layerCtx(f.id,activeLayer);dst.clearRect(0,0,SIZE,SIZE);dst.drawImage(src,0,0);
    setAssetMeta(f.id,activeLayer,assetMeta(currentFrame,activeLayer));
  }
  history.clear();selection=null;afterEdit((LAYER_LABELS[activeLayer]||activeLayer)+'을 모든 프레임에 복사함');
}

function copyPrevious(){
  const prev=prevFrameId();if(!prev)return setStatus('이전 프레임이 없습니다.',true);
  snapshot();const dst=layerCtx(),src=layerCanvas(prev,activeLayer);dst.clearRect(0,0,SIZE,SIZE);dst.drawImage(src,0,0);setAssetMeta(currentFrame,activeLayer,assetMeta(prev,activeLayer));selection=null;afterEdit(prev+' → '+currentFrame+' '+partLabel(activeLayer)+' 복사');
}

function stopPlayback(){
  if(playTimer){clearTimeout(playTimer);clearInterval(playTimer);playTimer=0}
  renderAnimationModeButtons();
}
function startPlayback(kind){
  stopPlayback();
  const group=ANIMATION_GROUPS[kind],items=FRAMES.filter(f=>f.kind===kind);if(!group||!items.length)return;
  animationFilterKind=kind;renderFrameButtonsForKind(kind);
  let i=frameRecord(currentFrame).kind===kind?Math.max(0,items.findIndex(f=>f.id===currentFrame)):0;
  const step=()=>{
    const frame=items[i];selectFrame(frame.id);
    if(!group.loop&&i===items.length-1){playTimer=0;renderAnimationModeButtons();return}
    const delay=Math.max(40,Number(frame.durationMs)||Math.round(1000/(group.fps||6)));
    playTimer=setTimeout(()=>{i=(i+1)%items.length;step()},delay);
  };
  step();
}

function clearCurrent(){
  if(activeLayer==='body')return setStatus('BODY는 아바타의 기준 바디라 비울 수 없습니다. 필요하면 BODY 전체 다시 만들기를 사용하세요.',true);
  if(!hasInk(layerCanvas()))return;
  if(!confirm(currentFrame+' '+activeLayer+' 레이어를 비울까요?'))return;
  snapshot();layerCtx().clearRect(0,0,SIZE,SIZE);setAssetMeta(currentFrame,activeLayer,null);selection=null;afterEdit('현재 파츠를 비움');
}
function clearAll(){
  if(!confirm('BODY는 유지하고 헤어·얼굴·의상·장식만 모든 프레임에서 비울까요?'))return;
  for(const f of FRAMES){
    const existing=selectedAssets.get(f.id)||new Map(),bodyMeta=existing.get('body')||null;
    for(const layer of LAYERS)if(layer!=='body')layerCtx(f.id,layer).clearRect(0,0,SIZE,SIZE);
    selectedAssets.set(f.id,bodyMeta?new Map([['body',bodyMeta]]):new Map());
  }
  history.clear();selection=null;rememberAllBodyFrames();saveLocal();refreshFrameButtons();renderSelectedAssetList();renderAssetGrid();render();setStatus('착용 파츠 전체 초기화 완료 · BODY는 유지됨');
}

function readProject(){
  const assetIds=Object.fromEntries(LAYERS.map(layer=>[layer,assetIdForLayer(layer)]));
  const out={version:4,type:'kidscade-avatar-studio-project',canvas:[128,128],root:[ROOT_X,82],groundY:GROUND_Y,facing:'left',mirrorRight:true,
    assetIds,
    bodyId:assetIds.body,hairId:assetIds.hair,upperId:assetIds.upper,lowerId:assetIds.lower,
    selectedAssets:Object.fromEntries(FRAMES.map(f=>[f.id,Object.fromEntries(selectedAssets.get(f.id)||[])])),
    frames:{}};
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
    const legacyIds={body:project.bodyId,hair:project.hairId,upper:project.upperId,lower:project.lowerId};
    const ids={...legacyIds,...(project.assetIds||{})};
    for(const layer of LAYERS){
      const field=LAYER_ID_FIELDS[layer],value=ids[layer];
      if(field&&value&&$(field))$(field).value=value;
    }
    for(const f of FRAMES){
      const src=project.frames?.[f.id];if(!src)continue;
      for(const layer of LAYERS)if(src[layer])await loadDataUrl(layerCanvas(f.id,layer),src[layer]);
      if(!src.hair&&(src.hairBack||src.hairFront)){
        const target=layerCtx(f.id,'hair');target.clearRect(0,0,SIZE,SIZE);
        const legacy=makeCanvas();
        if(src.hairBack){await loadDataUrl(legacy,src.hairBack);target.drawImage(legacy,0,0)}
        if(src.hairFront){legacy.getContext('2d').clearRect(0,0,SIZE,SIZE);await loadDataUrl(legacy,src.hairFront);target.drawImage(legacy,0,0)}
      }
    }
  }else throw new Error('Kidscade 아바타 제작실 프로젝트가 아닙니다.');
  if(project.selectedAssets){
    for(const f of FRAMES){
      const items=project.selectedAssets[f.id]||{};
      selectedAssets.set(f.id,new Map(Object.entries(items)));
    }
  }else{
    for(const f of FRAMES){
      const map=new Map();for(const layer of LAYERS)if(hasInk(layerCanvas(f.id,layer)))map.set(layer,{layer,id:assetIdForLayer(layer),label:assetIdForLayer(layer),file:null,custom:true});
      selectedAssets.set(f.id,map);
    }
  }
  history.clear();selection=null;
  for(const layer of LAYERS)if(layer!=='body')seedDerivedFramesForLayer(layer,{force:false});
  if(missingBodyFrames().length)await repairMissingBodyFrames(false);
  rememberAllBodyFrames();refreshFrameButtons();renderSelectedAssetList();renderAssetGrid();render();saveLocal();
}
async function restoreLocal(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw)return false;
    await applyProject(JSON.parse(raw));
    return true;
  }catch(_){return false}
}

function downloadBlob(name,blob){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),900);
}
function canvasBlob(c){return new Promise(resolve=>c.toBlob(blob=>resolve(blob),'image/png'))}
async function downloadCanvas(c,name){const blob=await canvasBlob(c);if(blob)downloadBlob(name,blob)}
function safeId(v,fallback){return String(v||fallback).trim().replace(/[^a-zA-Z0-9_-]+/g,'-')||fallback}
function layerId(layer){return assetIdForLayer(layer)}
function layerFileName(layer,frameId=currentFrame){return layerId(layer)+'_'+frameId+'.png'}
function compositeCanvas(frameId=currentFrame){
  const rec=frames.get(frameId),out=makeCanvas(),o=out.getContext('2d',{alpha:true});
  for(const layer of RENDER_ORDER)if(hasInk(rec[layer]))o.drawImage(rec[layer],0,0);
  return out;
}
function exportCurrent(){downloadCanvas(layerCanvas(),layerFileName(activeLayer));setStatus('현재 '+(LAYER_LABELS[activeLayer]||activeLayer)+' PNG 내보냄')}
function exportComposite(){downloadCanvas(compositeCanvas(),assetIdForLayer('body')+'_'+currentFrame+'_composite.png');setStatus('현재 합성 PNG 내보냄')}
function exportCurrentBody(){downloadCanvas(layerCanvas(currentFrame,'body'),assetIdForLayer('body')+'_'+currentFrame+'.png');setStatus('현재 BODY PNG 내보냄')}
function exportCurrentHair(){downloadCanvas(layerCanvas(currentFrame,'hair'),assetIdForLayer('hair')+'_'+currentFrame+'.png');setStatus('현재 HAIR PNG 내보냄')}

function manifestObject(){
  return {version:4,type:'kidscade-avatar-v3',canvas:[128,128],logicalRoot:[ROOT_X,82],groundY:GROUND_Y,facing:'left',mirrorForRight:true,
    frameSets:Object.fromEntries(Object.keys(ANIMATION_GROUPS).map(kind=>[kind,FRAMES.filter(f=>f.kind===kind).map(f=>f.id)])),
    animationMeta:Object.fromEntries(Object.entries(ANIMATION_GROUPS).map(([kind,meta])=>[kind,{...meta,frames:FRAMES.filter(f=>f.kind===kind).map(f=>f.id)}])),
    frameMeta:Object.fromEntries(FRAMES.map(f=>[f.id,{durationMs:f.durationMs||null,anchors:f.anchors||null,event:f.event||null,derived:!!f.derived}])),
    hairMode:'single',
    layerOrder:[...RENDER_ORDER],
    groups:{face:[...FACE_LAYERS],hair:[...HAIR_LAYERS],outfit:[...OUTFIT_LAYERS],accessories:[...ACCESSORY_LAYERS],equipment:[...EQUIPMENT_LAYERS],weapon:[...WEAPON_LAYERS],shield:[...SHIELD_LAYERS]},
    ids:Object.fromEntries(LAYERS.map(layer=>[layer,assetIdForLayer(layer)])),
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
    const files=[],folder={...LAYER_FOLDERS};
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

async function applyAdjustmentJsonFile(file){
  if(!file)return false;
  const data=JSON.parse(await file.text());
  if(data?.type==='kidscade-avatar-part-adjustment')return applyPartAdjustment(data);
  if(data?.type==='kidscade-avatar-full-adjustment')return applyFullAdjustment(data);
  throw new Error('지원하지 않는 JSON입니다. 파츠 조정 또는 전체 조정 JSON을 선택하세요.');
}

function setupCollapsiblePanels(){
  const panels=[...document.querySelectorAll('[data-panel-key]')];
  try{
    const saved=JSON.parse(localStorage.getItem(PANEL_STATE_KEY)||'{}');
    for(const panel of panels){
      const key=panel.dataset.panelKey;
      if(Object.prototype.hasOwnProperty.call(saved,key))panel.open=!!saved[key];
    }
  }catch(_){}
  const save=()=>{
    const state={};
    for(const panel of panels)state[panel.dataset.panelKey]=!!panel.open;
    try{localStorage.setItem(PANEL_STATE_KEY,JSON.stringify(state))}catch(_){}
  };
  for(const panel of panels)panel.addEventListener('toggle',save);
  $('collapseAllPanels')?.addEventListener('click',()=>{for(const panel of panels)panel.open=false;save()});
  $('expandAllPanels')?.addEventListener('click',()=>{for(const panel of panels)panel.open=true;save()});
}

function bind(){
  buildFrameButtons();buildLayerSelect();buildAssetBrowser();setupCollapsiblePanels();
  $('editLayerSelect')?.addEventListener('change',e=>selectLayer(e.target.value));
  $('focusPartToggle')?.addEventListener('click',toggleFocusPart);
  $('assetCategory')?.addEventListener('change',e=>{selectLayer(e.target.value);renderAssetGrid()});
  $('assetSearch')?.addEventListener('input',renderAssetGrid);
  for(const [layer,id] of Object.entries(LAYER_BUTTON_IDS)){
    $(id)?.addEventListener('click',()=>selectLayer(layer));
  }
  $('toolPencil').addEventListener('click',()=>selectTool('pencil'));
  $('toolErase').addEventListener('click',()=>selectTool('erase'));
  $('toolSelect').addEventListener('click',()=>selectTool('select'));
  $('clearSelection').addEventListener('click',clearSelection);
  $('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
  $('loadDraftBodySet').addEventListener('click',()=>loadDraftBodySet(true));
  $('loadSchoolStarterSet')?.addEventListener('click',()=>loadSchoolStarterSet());
  $('loadStarterSet')?.addEventListener('click',()=>loadStarterSet());

  $('exportPartAnalysis')?.addEventListener('click',exportPartAnalysisFile);
  $('exportBodyReference')?.addEventListener('click',exportBodyReferenceFile);
  $('exportFullAnalysis')?.addEventListener('click',exportFullAnalysisFile);
  const bindAdjustmentImport=id=>$(id)?.addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{
      setStatus('JSON 읽는 중 · '+file.name);
      await applyAdjustmentJsonFile(file);
    }catch(err){
      setStatus('JSON 적용 실패: '+(err?.message||err),true);
    }
    e.target.value='';
  });
  bindAdjustmentImport('importFullAdjustment');
  bindAdjustmentImport('importPartAdjustment');

  $('copyLayerAllFrames').addEventListener('click',copyLayerToAllFrames);
  $('copyPrev').addEventListener('click',copyPrevious);
  $('regenerateDerivedFrames')?.addEventListener('click',regenerateDerivedFrames);

  ['showReference','showDifference','showGrid','showBody','showFace','showHair','showClothes','showEquipment','showAccessories'].forEach(id=>$(id).addEventListener('change',render));
  $('referenceOpacity').addEventListener('input',render);$('referenceFrame').addEventListener('change',render);
  Object.values(LAYER_ID_FIELDS).forEach(id=>$(id)?.addEventListener('input',scheduleSave));

  $('nudgeUp').addEventListener('click',()=>nudgeCurrent(0,-1));
  $('nudgeDown').addEventListener('click',()=>nudgeCurrent(0,1));
  $('nudgeLeft').addEventListener('click',()=>nudgeCurrent(-1,0));
  $('nudgeRight').addEventListener('click',()=>nudgeCurrent(1,0));
  $('alignCenter').addEventListener('click',alignActiveCenter);
  $('alignGround').addEventListener('click',alignActiveGround);
  $('shrinkSelection').addEventListener('click',()=>resizeSelection(-1));
  $('growSelection').addEventListener('click',()=>resizeSelection(1));
  $('scalePartDown1').addEventListener('click',()=>resizeActiveLayer({uniformPixels:-1}));
  $('scalePartUp1').addEventListener('click',()=>resizeActiveLayer({uniformPixels:1}));
  $('scalePartDown5').addEventListener('click',()=>resizeActiveLayer({factor:.95}));
  $('scalePartUp5').addEventListener('click',()=>resizeActiveLayer({factor:1.05}));
  $('scalePartWidthDown').addEventListener('click',()=>resizeActiveLayer({dw:-1}));
  $('scalePartWidthUp').addEventListener('click',()=>resizeActiveLayer({dw:1}));
  $('scalePartHeightDown').addEventListener('click',()=>resizeActiveLayer({dh:-1}));
  $('scalePartHeightUp').addEventListener('click',()=>resizeActiveLayer({dh:1}));

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
    const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{pendingCatalogAsset=null;sourceImage=img;$('sourcePreview').src=reader.result;$('sourcePreview').classList.remove('hidden');refreshPreparedSource();if($('autoFitOnLoad').checked)autoFitStamp(false);else fitStamp();pixelizePreview(false);refreshNudgeMode();setStatus('원본을 불러왔습니다 · 화살표로 위치를 맞춘 뒤 현재 레이어에 적용하세요.')};img.src=reader.result};reader.readAsDataURL(file);
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
    if(e.key==='ArrowLeft'){e.preventDefault();nudgeCurrent(-1,0)}
    else if(e.key==='ArrowRight'){e.preventDefault();nudgeCurrent(1,0)}
    else if(e.key==='ArrowUp'){e.preventDefault();nudgeCurrent(0,-1)}
    else if(e.key==='ArrowDown'){e.preventDefault();nudgeCurrent(0,1)}
    else if(e.key==='Escape')clearSelection();
  });
  window.addEventListener('beforeunload',()=>{stopPlayback();saveLocal()});
}

async function init(){
  if(!await verifyAdmin())return;
  bind();$('pixelResolutionValue').value=$('pixelResolution').value;$('alphaCutValue').value=$('alphaCut').value;
  await restoreLocal();
  selectLayer('body');selectTool('pencil');selectFrame('stand-01');
  if(allBodyFramesEmpty())await loadDraftBodySet(false);
  else if(missingBodyFrames().length)await repairMissingBodyFrames(false);
  rememberAllBodyFrames();
  renderSelectedAssetList();renderAssetGrid();syncLayerSelect();refreshFocusToggle();refreshAdjustmentSummary();refreshPartSizeStatus();
  if(!allBodyFramesEmpty())setStatus('아바타 제작실 준비됨 · 왼쪽 에셋을 눌러 조합하세요.');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
