/* KIDSCADE Avatar v3 billboard adapter for Cube Architect.
   Uses the shared v3 state and renderPreviewFrame API from the main site. */
(()=>{
'use strict';

const STATE_KEY='kidscade-avatar-v3';
const PREVIEW_KEY='kidscade-avatar-studio-preview';
const DEFAULTS={version:3,preset:'school-starter-01'};

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
  return {...DEFAULTS,...saved,preset:'school-starter-01'};
}
function signature(e=readEquipment()){
  return [e.version||3,e.preset||'school-starter-01',JSON.stringify(e.assetIds||{})].join('|');
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
function animate(root,time,moving,onGround=true,motion='ground'){
  const rig=root?.userData?.avatarRig;
  if(!rig)return;

  const swimming=motion==='swim',airborne=motion==='air';
  const groundMode=moving&&onGround?'walk':'idle';
  const mode=swimming&&moving?'walk':groundMode;
  if(time-rig.lastFrameAt>=92||mode!==rig.lastMode){
    rig.lastFrameAt=time;
    rig.lastMode=mode;
    const api=avatarApi();
    let src='';
    try{src=api?.renderPreviewFrame?.(mode,time/1000)||''}catch(_){}
    if(!src)src=storedPreview();
    setSource(rig,src);
  }

  const phase=time/115;
  if(swimming){
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
  const step=moving&&onGround?Math.abs(Math.sin(phase*Math.PI)):0;
  rig.plane.position.y=1.14+step*.035+(airborne?Math.sin(time/170)*.025:0);
  rig.plane.scale.set(1+(1-step)*.012,1-step*.018,1);
  rig.shadow.scale.setScalar(airborne?.72:1-step*.14);
  rig.shadow.material.opacity=airborne?.08:.2-step*.04;
}
window.CubeArchitectAvatar={
  STATE_KEY,PREVIEW_KEY,DEFAULTS,readEquipment,signature,create,animate
};
})();