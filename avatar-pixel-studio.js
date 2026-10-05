(()=>{'use strict';

const ROOT='assets/game/characters/kidscade-avatar-v3/school-starter';
const MANIFEST_URL=ROOT+'/manifest.json';
const SHEET_URL=ROOT+'/school-starter-sheet.png';
const SCHOOL_PACK_URL=ROOT+'/school-starter.json';
const DEFAULT_IMAGE=ROOT+'/guest-default.png';
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const PREVIEW_VERSION_KEY='kidscade-avatar-studio-preview-version';
const PREVIEW_VERSION='pixel-v3-school-starter-11';
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
  shield:{label:'교구',name:'교과서',assetKey:'shieldFront'}
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
let hairCatalog=null;
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
let seeds=0;
let skinPalette=[];
const frameSkinPalettes=new Map();
const skinRemapCache=new Map();
let skinBaseHex='#fce2d2';
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
    img.src=SHEET_URL+'?v=quality-2';
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
async function loadHairCatalog(){
  const rel=manifest?.partCatalogs?.hair||'hair/catalog.json';
  const res=await fetch(ROOT+'/'+rel,{cache:'no-cache'});
  if(!res.ok)throw new Error('헤어 파츠 카탈로그를 불러오지 못했습니다.');
  const data=await res.json();
  if(data?.type!=='kidscade-avatar-hair-catalog'||!Array.isArray(data.items))throw new Error('헤어 파츠 카탈로그 형식이 올바르지 않습니다.');
  hairCatalog=data;hairProtectedKeys=new Set((data.protectedColors||[]).map(color=>color.join(',')));
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
function hairLayerCanvas(id,frameId){
  const cacheKey=id+':'+frameId;if(hairFrameCache.has(cacheKey))return hairFrameCache.get(cacheKey);
  const part=hairParts.get(id);if(!part)return null;
  let source=hairSourceCache.get(id);if(!source){source=pixelsCanvas(part.pixels);hairSourceCache.set(id,source)}
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
  if(part?.type!=='kidscade-avatar-upper-part'||part.id!==id||part.layer!=='upper'||!Array.isArray(part.palette)||part.palette.length!==upperCatalog.sourcePalette.length)throw new Error('상의 파츠 JSON 형식이 올바르지 않습니다: '+id);
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
  if(part?.type!=='kidscade-avatar-lower-part'||part.id!==id||part.layer!=='lower'||!Array.isArray(part.palette)||part.palette.length!==lowerCatalog.sourcePalette.length)throw new Error('하의 파츠 JSON 형식이 올바르지 않습니다: '+id);
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

/* Public school accessories: shoes, earrings, left-hand tools and right-hand teaching aids. */
let schoolPack=null;
let shoeCatalog=null;
let earringCatalog=null;
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
async function loadToolCatalog(){toolCatalog=await loadAccessoryCatalog('weapon','kidscade-avatar-tool-catalog');return toolCatalog}
async function loadTeachingAidCatalog(){teachingAidCatalog=await loadAccessoryCatalog('shield','kidscade-avatar-teaching-aid-catalog');return teachingAidCatalog}
function selectedShoeId(){const id=state.assetIds?.shoes||manifest?.assetIds?.shoes;return shoeCatalog?.items?.some(item=>item.id===id)?id:(shoeCatalog?.defaultId||id)}
function selectedEarringId(){const id=state.assetIds?.earring||manifest?.assetIds?.earring;return earringCatalog?.items?.some(item=>item.id===id)?id:(earringCatalog?.defaultId||id)}
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
function applyShoeSelection(target,frameId,id=selectedShoeId()){
  if(!shoeCatalog||!schoolPack||!id)return false;
  const def=shoeCatalog.items.find(item=>item.id===id);if(!def)return false;
  const pixels=packLayerPixels(frameId,'shoes');
  if(id!==shoeCatalog.defaultId){
    const image=target.getImageData(0,0,SIZE,SIZE),data=image.data;
    for(const p of pixels){const i=(p[1]*SIZE+p[0])*4;if(!sameRgba(data,i,p))continue;writeRgba(data,i,shoeStyledColor(def,p,p[0],p[1],frameId))}
    target.putImageData(image,0,0);
  }
  drawPixelTuples(target,accessoryOutlinePixels(pixels));
  return true
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
function drawFrame(target,index,eyeId=selectedEyeId(),hairId=selectedHairId(),upperId=selectedUpperId(),lowerId=selectedLowerId(),earringId=selectedEarringId(),shoesId=selectedShoeId(),toolId=selectedToolId(),aidId=selectedTeachingAidId()){
  if(!sheet)return;
  const frameId=manifest?.frameOrder?.[index]||'stand-01';
  const base=document.createElement('canvas');base.width=SIZE;base.height=SIZE;
  const baseCtx=base.getContext('2d',{alpha:true});baseCtx.imageSmoothingEnabled=false;
  baseCtx.drawImage(sheet,index*SIZE,0,SIZE,SIZE,0,0,SIZE,SIZE);
  recolorSkin(baseCtx,frameId);
  applyUpperPart(baseCtx,frameId,upperId);
  applyLowerPart(baseCtx,frameId,lowerId);
  const customHair=hairCatalog&&hairId&&hairId!==hairCatalog.defaultId;
  if(customHair)clearBaseHair(baseCtx,frameId);
  applyEyePart(baseCtx,frameId,eyeId);
  if(customHair)paintHairLayer(baseCtx,hairLayerCanvas(hairId,frameId));
  applyShoeSelection(baseCtx,frameId,shoesId);
  applyEarringSelection(baseCtx,frameId,earringId);
  stripDefaultEquipment(baseCtx,frameId);
  target.save();target.setTransform(1,0,0,1,0,0);target.clearRect(0,0,SIZE,SIZE);target.imageSmoothingEnabled=false;
  drawEquipmentPass(target,frameId,'weapon',toolId,'back');
  drawEquipmentPass(target,frameId,'shield',aidId,'back');
  target.drawImage(base,0,0);
  drawEquipmentPass(target,frameId,'shield',aidId,'front');
  drawEquipmentPass(target,frameId,'weapon',toolId,'front');
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
  const fullCtx=full.getContext('2d',{alpha:true});fullCtx.imageSmoothingEnabled=false;drawFrame(fullCtx,0,id,hairCatalog?.defaultId||selectedHairId(),upperCatalog?.defaultId||selectedUpperId());
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
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selected;return `<button type='button' class='option${active?' active':''}' aria-pressed='${active?'true':'false'}' data-hair-id='${item.id}'><span class='hair-thumb'><canvas width='128' height='128' data-hair-thumb='${item.id}' aria-hidden='true'></canvas></span><span class='num'>${active?'✓':index+1}</span><span class='part-name'>${item.label}<small>${item.id}</small></span></button>`}).join('');
  optionGrid.querySelectorAll('canvas[data-hair-thumb]').forEach(el=>{if(el.dataset.hairThumb===hairCatalog.defaultId)drawHairThumbnail(el,el.dataset.hairThumb)});hydrateHairThumbnails();
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
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selected;return `<button type='button' class='option${active?' active':''}' aria-pressed='${active?'true':'false'}' data-upper-id='${item.id}'><span class='hair-thumb'><canvas width='128' height='128' data-upper-thumb='${item.id}' aria-hidden='true'></canvas></span><span class='num'>${active?'✓':index+1}</span><span class='part-name'>${item.label}<small>${item.id}</small></span></button>`}).join('');
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
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selected;return `<button type='button' class='option${active?' active':''}' aria-pressed='${active?'true':'false'}' data-lower-id='${item.id}'><span class='hair-thumb'><canvas width='128' height='128' data-lower-thumb='${item.id}' aria-hidden='true'></canvas></span><span class='num'>${active?'✓':index+1}</span><span class='part-name'>${item.label}<small>${item.id}</small></span></button>`}).join('');
  optionGrid.querySelectorAll('canvas[data-lower-thumb]').forEach(el=>{if(el.dataset.lowerThumb===lowerCatalog.defaultId)drawLowerThumbnail(el,el.dataset.lowerThumb)});hydrateLowerThumbnails();
}

function drawAccessoryThumbnail(canvasElement,tab,id){
  if(!canvasElement)return;const full=document.createElement('canvas');full.width=SIZE;full.height=SIZE;const c=full.getContext('2d',{alpha:true});c.imageSmoothingEnabled=false;
  const args=[selectedEyeId(),selectedHairId(),selectedUpperId(),selectedLowerId(),selectedEarringId(),selectedShoeId(),selectedToolId(),selectedTeachingAidId()];
  if(tab==='earring')args[4]=id;else if(tab==='shoes')args[5]=id;else if(tab==='weapon')args[6]=id;else if(tab==='shield')args[7]=id;drawFrame(c,0,...args);
  const t=canvasElement.getContext('2d',{alpha:true});t.imageSmoothingEnabled=false;t.clearRect(0,0,SIZE,SIZE);
  if(tab==='earring')t.drawImage(full,72,42,30,34,0,0,SIZE,SIZE);else if(tab==='shoes')t.drawImage(full,40,96,52,32,0,0,SIZE,SIZE);else if(tab==='weapon')t.drawImage(full,18,50,54,64,0,0,SIZE,SIZE);else t.drawImage(full,66,62,50,56,0,0,SIZE,SIZE);
}
function renderAccessoryOptions(tab,catalog,selectedId){
  const items=catalog?.items||[],label=PARTS[tab]?.label||tab;pickerTitle.textContent=label;pickerCount.textContent=items.length+'가지';optionGrid.classList.remove('skin-mode');const attr=tab+'-id',thumbAttr=tab+'-thumb';
  optionGrid.innerHTML=items.map((item,index)=>{const active=item.id===selectedId;return '<button type="button" class="option'+(active?' active':'')+'" aria-pressed="'+(active?'true':'false')+'" data-'+attr+'="'+item.id+'"><span class="hair-thumb"><canvas width="128" height="128" data-'+thumbAttr+'="'+item.id+'" aria-hidden="true"></canvas></span><span class="num">'+(active?'✓':index+1)+'</span><span class="part-name">'+item.label+'<small>'+item.id+'</small></span></button>'}).join('');
  optionGrid.querySelectorAll('canvas[data-'+thumbAttr+']').forEach(el=>drawAccessoryThumbnail(el,tab,el.getAttribute('data-'+thumbAttr)));
}
function renderEarringOptions(){renderAccessoryOptions('earring',earringCatalog,selectedEarringId())}
function renderShoeOptions(){renderAccessoryOptions('shoes',shoeCatalog,selectedShoeId())}
function renderToolOptions(){renderAccessoryOptions('weapon',toolCatalog,selectedToolId())}
function renderTeachingAidOptions(){renderAccessoryOptions('shield',teachingAidCatalog,selectedTeachingAidId())}

function renderOptions(){
  if(currentTab==='skin'){renderSkinOptions();return}
  if(currentTab==='hair'){renderHairOptions();return}
  if(currentTab==='eyes'){renderEyeOptions();return}
  if(currentTab==='upper'){renderUpperOptions();return}
  if(currentTab==='lower'){renderLowerOptions();return}
  if(currentTab==='earring'){renderEarringOptions();return}
  if(currentTab==='shoes'){renderShoeOptions();return}
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
  skinRemapCache.clear();
  const stand=animationFor('stand')[0]||{index:0};
  drawFrame(staticCtx,stand.index||0);
  setPreviewMode(previewMode);
}

function setEarringAsset(id){if(!earringCatalog?.items?.some(item=>item.id===id))return false;state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),earring:id};refreshSkinPreview();renderOptions();publish(false);const item=earringCatalog.items.find(candidate=>candidate.id===id);flash((item?.label||'귀걸이')+' 적용했어요!');return true}
function setShoeAsset(id){if(!shoeCatalog?.items?.some(item=>item.id===id))return false;state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),shoes:id};refreshSkinPreview();renderOptions();publish(false);const item=shoeCatalog.items.find(candidate=>candidate.id===id);flash((item?.label||'신발')+' 적용했어요!');return true}
function setToolAsset(id){if(!toolCatalog?.items?.some(item=>item.id===id))return false;state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),weaponFront:id,weaponBack:id};refreshSkinPreview();renderOptions();publish(false);const item=toolCatalog.items.find(candidate=>candidate.id===id);flash((item?.label||'도구')+' 적용했어요!');return true}
function setTeachingAidAsset(id){if(!teachingAidCatalog?.items?.some(item=>item.id===id))return false;state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),shieldFront:id,shieldBack:id};refreshSkinPreview();renderOptions();publish(false);const item=teachingAidCatalog.items.find(candidate=>candidate.id===id);flash((item?.label||'교구')+' 적용했어요!');return true}

async function setUpperAsset(id){
  if(!upperCatalog?.items?.some(item=>item.id===id))return false;if(id!==upperCatalog.defaultId)await loadUpperPart(id);
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),upper:id};refreshSkinPreview();renderOptions();publish(false);
  const item=upperCatalog.items.find(candidate=>candidate.id===id);flash((item?.label||'상의')+' 적용했어요!');return true;
}
async function setLowerAsset(id){
  if(!lowerCatalog?.items?.some(item=>item.id===id))return false;if(id!==lowerCatalog.defaultId)await loadLowerPart(id);
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),lower:id};refreshSkinPreview();renderOptions();publish(false);
  const item=lowerCatalog.items.find(candidate=>candidate.id===id);flash((item?.label||'하의')+' 적용했어요!');return true;
}
async function setHairAsset(id){
  if(!hairCatalog?.items?.some(item=>item.id===id))return false;if(id!==hairCatalog.defaultId)await loadHairPart(id);
  state.assetIds={...(manifest?.assetIds||{}),...(state.assetIds||{}),hair:id};refreshSkinPreview();renderOptions();publish(false);
  const item=hairCatalog.items.find(candidate=>candidate.id===id);flash((item?.label||'헤어')+' 적용했어요!');return true;
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
  const aid=e.target.closest('[data-shield-id]');if(aid){setTeachingAidAsset(aid.dataset.shieldId);return}
  const tool=e.target.closest('[data-weapon-id]');if(tool){setToolAsset(tool.dataset.weaponId);return}
  const shoes=e.target.closest('[data-shoes-id]');if(shoes){setShoeAsset(shoes.dataset.shoesId);return}
  const earring=e.target.closest('[data-earring-id]');if(earring){setEarringAsset(earring.dataset.earringId);return}
  const lower=e.target.closest('[data-lower-id]');
  if(lower){setLowerAsset(lower.dataset.lowerId);return}
  const upper=e.target.closest('[data-upper-id]');
  if(upper){setUpperAsset(upper.dataset.upperId);return}
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
  version:'pixel-v3-school-starter-11',
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
    if(hairCatalog&&!hairCatalog.items.some(item=>item.id===state.assetIds.hair))state.assetIds.hair=hairCatalog.defaultId;
    if(state.assetIds.hair!==hairCatalog?.defaultId)await loadHairPart(state.assetIds.hair);
    if(upperCatalog&&!upperCatalog.items.some(item=>item.id===state.assetIds.upper))state.assetIds.upper=upperCatalog.defaultId;
    if(state.assetIds.upper!==upperCatalog?.defaultId)await loadUpperPart(state.assetIds.upper);
    if(lowerCatalog&&!lowerCatalog.items.some(item=>item.id===state.assetIds.lower))state.assetIds.lower=lowerCatalog.defaultId;
    if(state.assetIds.lower!==lowerCatalog?.defaultId)await loadLowerPart(state.assetIds.lower);
    if(shoeCatalog&&!shoeCatalog.items.some(item=>item.id===state.assetIds.shoes))state.assetIds.shoes=shoeCatalog.defaultId;
    if(earringCatalog&&!earringCatalog.items.some(item=>item.id===state.assetIds.earring))state.assetIds.earring=earringCatalog.defaultId;
    if(toolCatalog&&!toolCatalog.items.some(item=>item.id===state.assetIds.weaponFront)){state.assetIds.weaponFront=toolCatalog.defaultId;state.assetIds.weaponBack=toolCatalog.defaultId}else if(toolCatalog)state.assetIds.weaponBack=state.assetIds.weaponFront;
    if(teachingAidCatalog&&!teachingAidCatalog.items.some(item=>item.id===state.assetIds.shieldFront)){state.assetIds.shieldFront=teachingAidCatalog.defaultId;state.assetIds.shieldBack=teachingAidCatalog.defaultId}else if(teachingAidCatalog)state.assetIds.shieldBack=state.assetIds.shieldFront;
    refreshSkinPreview();
    publish(false);
    return true;
  }
};

(async function boot(){
  await Promise.all([loadManifest(),loadSheet(),loadSchoolPack()]);
  await loadEyeCatalog();
  await loadHairCatalog();
  await loadUpperCatalog();
  await loadLowerCatalog();
  await Promise.all([loadShoeCatalog(),loadEarringCatalog(),loadToolCatalog(),loadTeachingAidCatalog()]);
  loadSkinPalette();
  loadFrameSkinPalettes();
  drawStatic();
  styleSummary.textContent='학교 탐험가 · 헤어 27종 · 눈 11종 · 상의 11종 · 하의 11종 · 신발 11종 · 귀걸이 11종 · 도구 15종 · 교구 7종 · 23프레임';
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