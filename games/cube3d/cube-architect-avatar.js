/* Pixel-avatar billboard adapter for Cube Architect.
   Uses the same Kidscade Pixel Avatar v1 state and renderPreviewFrame API as the main site. */
(()=>{
'use strict';

const STATE_KEY='kidscade-pixel-avatar-v1';
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const DEFAULTS={
  hairId:'male-short-01',upper:1,lower:1,
  eyes:1,eyebrows:1,noses:1,mouths:1,blush:0
};

function host(){
  try{if(parent&&parent!==window&&parent.location.origin===location.origin)return parent}catch(_){}
  return window;
}
function safeJson(raw){
  try{return raw?JSON.parse(raw):null}catch(_){return null}
}
function readEquipment(){
  const h=host();
  let saved=null;
  try{saved=safeJson(h.localStorage?.getItem(STATE_KEY))}catch(_){}
  if(!saved)try{saved=safeJson(localStorage.getItem(STATE_KEY))}catch(_){}
  saved=saved&&typeof saved==='object'?saved:{};
  return {
    ...DEFAULTS,
    ...saved,
    hairId:typeof saved.hairId==='string'&&saved.hairId?saved.hairId:DEFAULTS.hairId,
    upper:saved.upper==null?DEFAULTS.upper:(saved.upper?1:0),
    lower:saved.lower==null?DEFAULTS.lower:(saved.lower?1:0),
    eyes:Math.max(1,Math.min(8,parseInt(saved.eyes,10)||DEFAULTS.eyes)),
    eyebrows:Math.max(1,Math.min(6,parseInt(saved.eyebrows,10)||DEFAULTS.eyebrows)),
    noses:Math.max(1,Math.min(4,parseInt(saved.noses,10)||DEFAULTS.noses)),
    mouths:Math.max(1,Math.min(8,parseInt(saved.mouths,10)||DEFAULTS.mouths)),
    blush:Math.max(0,Math.min(4,parseInt(saved.blush,10)||0))
  };
}
function signature(e=readEquipment()){
  return [
    e.hairId,e.upper,e.lower,e.eyes,e.eyebrows,e.noses,e.mouths,e.blush
  ].join('|');
}
function avatarApi(){
  const h=host();
  const candidates=[];
  try{candidates.push(window.KidscadeAvatarShop)}catch(_){}
  try{candidates.push(h.KidscadeAvatarShop)}catch(_){}
  try{
    const f=h.document?.getElementById('kidscade-avatar-studio-frame');
    candidates.push(f?.contentWindow?.KidscadeAvatarShop);
  }catch(_){}
  return candidates.find(v=>v&&typeof v.renderPreviewFrame==='function')||null;
}
function storedPreview(){
  const h=host();
  try{
    const s=h.localStorage?.getItem(PREVIEW_KEY)||'';
    if(s.startsWith('data:image/'))return s;
  }catch(_){}
  try{
    const s=localStorage.getItem(PREVIEW_KEY)||'';
    if(s.startsWith('data:image/'))return s;
  }catch(_){}
  return '';
}
function setSource(rig,src){
  if(!src||src===rig.source)return false;
  rig.source=src;
  rig.image.src=src;
  return true;
}
function create(equipment=readEquipment()){
  const root=new THREE.Group();
  root.name='CubeArchitectPixelAvatar';

  const canvas=document.createElement('canvas');
  canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d',{alpha:true});
  ctx.imageSmoothingEnabled=false;

  const texture=new THREE.CanvasTexture(canvas);
  texture.magFilter=THREE.NearestFilter;
  texture.minFilter=THREE.NearestFilter;
  texture.generateMipmaps=false;
  texture.colorSpace=THREE.SRGBColorSpace||texture.colorSpace;

  const material=new THREE.MeshBasicMaterial({
    map:texture,transparent:true,alphaTest:.03,side:THREE.DoubleSide,depthWrite:false
  });
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.46,2.28),material);
  plane.position.set(0,1.14,0);
  plane.renderOrder=5;
  root.add(plane);

  const shadowMat=new THREE.MeshBasicMaterial({
    color:0x111827,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide
  });
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.46,24),shadowMat);
  shadow.rotation.x=-Math.PI/2;
  shadow.position.set(0,.025,0);
  root.add(shadow);

  const image=new Image();
  image.decoding='async';
  const rig={
    canvas,ctx,texture,plane,shadow,image,source:'',
    lastFrameAt:0,lastMode:'idle',equipment:{...equipment}
  };
  image.onload=()=>{
    ctx.clearRect(0,0,128,128);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,0,0,128,128);
    texture.needsUpdate=true;
  };
  image.onerror=()=>{};

  root.userData.avatarRig=rig;
  root.userData.avatarSignature=signature(equipment);
  setSource(rig,storedPreview());
  return root;
}
function animate(root,time,moving,onGround=true,motion='ground',action=null){
  const rig=root?.userData?.avatarRig;
  if(!rig)return;

  const swimming=motion==='swim',airborne=motion==='air'&&!onGround;
  const actionMode=action&&typeof action.kind==='string'?action.kind:'';
  const mode=actionMode||(airborne?'jump':swimming&&moving?'walk':moving&&onGround?'walk':'stand');
  const frameTime=actionMode?Math.max(0,Number(action.elapsedMs)||0)/1000:time/1000;
  if(time-rig.lastFrameAt>=72||mode!==rig.lastMode){
    rig.lastFrameAt=time;
    rig.lastMode=mode;
    const api=avatarApi();
    let src='';
    try{src=api?.renderPreviewFrame?.(mode,frameTime)||''}catch(_){}
    if(!src)src=storedPreview();
    setSource(rig,src);
  }

  const phase=time/115;
  if(actionMode==='dead'){
    rig.plane.position.y=1.14;
    rig.plane.rotation.x=0;
    rig.plane.rotation.z=0;
    rig.plane.scale.set(1,1,1);
    rig.shadow.scale.setScalar(1.08);
    rig.shadow.material.opacity=.13;
    return;
  }
  if(swimming&&!actionMode){
    const stroke=Math.sin(time/175);
    rig.plane.position.y=.98+Math.sin(time/260)*.045;
    rig.plane.rotation.x=-.78+stroke*.06;
    rig.plane.rotation.z=stroke*.045;
    rig.plane.scale.set(1.02,.98,1);
    rig.shadow.scale.setScalar(.72);
    rig.shadow.material.opacity=.045;
    return;
  }
  rig.plane.rotation.x=0;rig.plane.rotation.z=0;
  const step=!actionMode&&moving&&onGround?Math.abs(Math.sin(phase*Math.PI)):0;
  const actionBounce=actionMode==='attack'?Math.sin(Math.min(1,frameTime/.42)*Math.PI)*.035:
    actionMode==='hurt'?Math.sin(Math.min(1,frameTime/.29)*Math.PI)*.025:
    actionMode==='pickup'?Math.sin(Math.min(1,frameTime/.46)*Math.PI)*.02:0;
  rig.plane.position.y=1.14+step*.035+(airborne?Math.sin(time/170)*.025:0)+actionBounce;
  rig.plane.scale.set(1+(1-step)*.012,1-step*.018,1);
  rig.shadow.scale.setScalar(airborne?.72:1-step*.14);
  rig.shadow.material.opacity=airborne?.08:.2-step*.04;
}
window.CubeArchitectAvatar={
  STATE_KEY,PREVIEW_KEY,DEFAULTS,readEquipment,signature,create,animate
};
})();