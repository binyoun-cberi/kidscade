import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

try {
const canvas=document.getElementById("game3d");
const box=document.getElementById("canvasBox");
if(!canvas||!box)throw new Error("History Royale 3D canvas not found.");

const ASSET_ROOT="../../assets/game/history_royale/source_cc0/";
const CHAR_ROOT=ASSET_ROOT+"quaternius_modular_males/gltf/";
const PROP_ROOT=ASSET_ROOT+"quaternius_fantasy_props/gltf/";
const WEAPON_ROOT=ASSET_ROOT+"quaternius_medieval_weapons/fbx/";
const HORSE_URL="../../assets/game/3d/byeokrando/animals/Horse.glb";
const loader=new GLTFLoader();
const fbxLoader=new FBXLoader();

const characterTemplates=new Map();
const propTemplates=new Map();
const weaponTemplates=new Map();
let horseTemplate=null;
const unitMeshes=new Map();
const buildingMeshes=new Map();
const towerMeshes=new Map();
const mixers=new Set();
const projectileMeshes=[];
const fxMeshes=new Map();
let fxSeq=1;
let landmarkKey="";
let landmarkGroup=null;
let currentGameRef=null;
let assaultFx=null;
let assaultAnnounced=false;

let state=null;
let lastTime=performance.now();
let ready=false;
let runtimeFailed=false;
const LOW_POWER=innerWidth<760||((navigator.hardwareConcurrency||8)<=4);
const DEBUG_3D=new URLSearchParams(location.search).get("debug3d")==="1";
let debugEl=null,debugClock=0,debugFrames=0,debugFps=0;
let riverMesh=null;
let riverPhase=0;

const renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x91a972,1);
renderer.shadowMap.enabled=!LOW_POWER;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,LOW_POWER?1:1.6));

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91a972);
scene.fog=new THREE.Fog(0xa9b98a,17,34);

const camera=new THREE.PerspectiveCamera(34,960/620,.1,80);
camera.position.set(0,14.8,16.8);
camera.lookAt(0,.4,-.2);

const hemi=new THREE.HemisphereLight(0xf6edcf,0x33432d,2.3);
scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffefcf,2.7);
sun.position.set(-7,14,8);
sun.castShadow=renderer.shadowMap.enabled;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-13;
sun.shadow.camera.right=13;
sun.shadow.camera.top=11;
sun.shadow.camera.bottom=-11;
scene.add(sun);

const world=new THREE.Group();
scene.add(world);

function mat(color,roughness,metalness){
  return new THREE.MeshStandardMaterial({color:color,roughness:roughness==null?.86:roughness,metalness:metalness==null?0:metalness});
}
function mesh(geo,material,x,y,z){
  const m=new THREE.Mesh(geo,material);
  m.position.set(x||0,y||0,z||0);
  m.castShadow=renderer.shadowMap.enabled;
  m.receiveShadow=true;
  return m;
}
function canvasToWorld(x,y){
  return new THREE.Vector3((x-480)/48,0,(y-310)/48);
}
function worldToCanvas(v){
  return {x:v.x*48+480,y:v.z*48+310};
}
const pointerRay=new THREE.Raycaster();
const pointerNdc=new THREE.Vector2();
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
window.HistoryRoyale3DProjectPointer=function(clientX,clientY){
  const r=box.getBoundingClientRect();
  const inside=clientX>=r.left&&clientX<=r.right&&clientY>=r.top&&clientY<=r.bottom;
  if(!inside)return {x:0,y:0,inside:false};
  pointerNdc.x=((clientX-r.left)/r.width)*2-1;
  pointerNdc.y=-((clientY-r.top)/r.height)*2+1;
  pointerRay.setFromCamera(pointerNdc,camera);
  const hit=new THREE.Vector3();
  if(!pointerRay.ray.intersectPlane(groundPlane,hit))return null;
  const p=worldToCanvas(hit);
  p.inside=true;
  return p;
};
function factionColor(fid){
  const f=state&&state.factions?state.factions[fid]:null;
  return new THREE.Color(f&&f.color?f.color:"#738258");
}
function factionRoof(fid){
  const f=state&&state.factions?state.factions[fid]:null;
  return new THREE.Color(f&&f.roof?f.roof:"#633f32");
}
function cloneMaterialTint(object,color){
  object.traverse(function(o){
    if(!o.isMesh)return;
    o.castShadow=renderer.shadowMap.enabled;
    o.receiveShadow=true;
    const src=Array.isArray(o.material)?o.material:[o.material];
    const next=src.map(function(m){
      if(!m)return m;
      const n=m.clone();
      const name=String(n.name||"").toLowerCase();
      if(!/(skin|eye|hair|eyebrow)/.test(name)&&n.color)n.color.lerp(color,.46);
      n.roughness=Math.max(.65,n.roughness==null?.8:n.roughness);
      return n;
    });
    o.material=Array.isArray(o.material)?next:next[0];
  });
}
function normalizeHeight(object,target){
  object.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(object);
  const h=Math.max(.001,b.max.y-b.min.y);
  object.scale.multiplyScalar(target/h);
  object.updateMatrixWorld(true);
  const b2=new THREE.Box3().setFromObject(object);
  object.position.y-=b2.min.y;
}
function groundBox(w,h,d,color,x,z,y){
  const m=mesh(new THREE.BoxGeometry(w,h,d),mat(color),x,y==null?0:y,z);
  world.add(m);
  return m;
}
function makeTree(x,z,s){
  const g=new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(.09*s,.13*s,.72*s,7),mat(0x62452d),0,.36*s,0));
  g.add(mesh(new THREE.DodecahedronGeometry(.48*s,0),mat(0x4f7447),0,.93*s,0));
  g.add(mesh(new THREE.DodecahedronGeometry(.34*s,0),mat(0x668652),.18*s,1.13*s,.05*s));
  g.position.set(x,0,z);
  world.add(g);
}
function makeHill(x,z,sx,sz,h,color){
  const hill=mesh(new THREE.SphereGeometry(1,18,10),mat(color||0x708553),x,-.62+h*.25,z);
  hill.scale.set(sx,h,sz);
  hill.receiveShadow=true;
  world.add(hill);
}
function makeLaneMarker(x,z,teamColor){
  const post=mesh(new THREE.CylinderGeometry(.035,.045,.78,6),mat(0x60442d),x,.39,z);world.add(post);
  const flag=mesh(new THREE.PlaneGeometry(.48,.24),new THREE.MeshBasicMaterial({color:teamColor,side:THREE.DoubleSide}),x+.24,.63,z);
  flag.rotation.y=Math.PI/2;world.add(flag);
}
function buildWorld(){
  const ground=mesh(new THREE.PlaneGeometry(21,13.5),mat(0x7f985f),0,0,0);
  ground.rotation.x=-Math.PI/2;
  ground.receiveShadow=true;
  world.add(ground);

  [-3.54,3.54].forEach(function(x){
    const road=mesh(new THREE.PlaneGeometry(1.65,13.1),mat(0xb39a70),x,.012,0);
    road.rotation.x=-Math.PI/2;
    world.add(road);
  });

  riverMesh=mesh(new THREE.PlaneGeometry(21,1.45),new THREE.MeshStandardMaterial({color:0x5e8994,roughness:.22,metalness:.08,transparent:true,opacity:.94}),0,.018,0);
  riverMesh.rotation.x=-Math.PI/2;
  world.add(riverMesh);
  groundBox(21,.09,.14,0x655f46,0,-.79,.03);
  groundBox(21,.09,.14,0x655f46,0,.79,.03);

  [-3.54,3.54].forEach(function(x){
    groundBox(2.1,.16,1.62,0x987148,x,0,.12);
    for(let i=-4;i<=4;i++)groundBox(.05,.025,1.7,0x59432f,x+i*.22,0,.22);
    groundBox(2.16,.13,.10,0x5f452d,x,-.77,.28);
    groundBox(2.16,.13,.10,0x5f452d,x,.77,.28);
  });

  makeHill(-8.9,-3.8,2.2,2.0,.72,0x667c4b);
  makeHill(8.9,-3.3,2.0,2.4,.66,0x6f8452);
  makeHill(-8.8,3.6,2.4,2.1,.70,0x6b8050);
  makeHill(8.8,3.9,2.1,2.2,.68,0x738858);
  for(let i=0;i<26;i++){
    const side=i%2?-1:1;
    const x=side*(8.1+(i%3)*.35);
    const z=-5.6+(i*1.73)%11.2;
    makeTree(x,z,.72+(i%4)*.08);
  }
  makeLaneMarker(-4.55,4.8,0x476d9f);makeLaneMarker(4.55,4.8,0x476d9f);
  makeLaneMarker(-4.55,-4.8,0xa4554c);makeLaneMarker(4.55,-4.8,0xa4554c);
  for(let i=0;i<18;i++){
    const a=i*1.71,x=Math.sin(a)*8.2,z=Math.cos(a*1.27)*5.3;
    if(Math.abs(x-3.54)<1.7||Math.abs(x+3.54)<1.7)continue;
    const rock=mesh(new THREE.DodecahedronGeometry(.15+(i%3)*.05,0),mat(i%2?0x77776e:0x868277),x,.08,z);
    rock.scale.y=.55;world.add(rock);
  }
}
buildWorld();

const previewRing=new THREE.Mesh(new THREE.RingGeometry(.42,.54,48),new THREE.MeshBasicMaterial({color:0x85e39c,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false}));
previewRing.rotation.x=-Math.PI/2;
previewRing.position.y=.055;
previewRing.visible=false;
scene.add(previewRing);

const formationBand=new THREE.Mesh(
  new THREE.PlaneGeometry(19.2,1.0),
  new THREE.MeshBasicMaterial({color:0x7da8d6,transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false})
);
formationBand.rotation.x=-Math.PI/2;formationBand.position.y=.022;formationBand.visible=false;scene.add(formationBand);

const rangePreview=new THREE.Mesh(new THREE.RingGeometry(.94,1,64),new THREE.MeshBasicMaterial({color:0xf0d27a,transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false}));
rangePreview.rotation.x=-Math.PI/2;rangePreview.position.y=.032;rangePreview.visible=false;scene.add(rangePreview);

const previewFill=new THREE.Mesh(new THREE.CircleGeometry(.5,48),new THREE.MeshBasicMaterial({color:0x85e39c,transparent:true,opacity:.11,side:THREE.DoubleSide,depthWrite:false}));
previewFill.rotation.x=-Math.PI/2;
previewFill.position.y=.045;
previewFill.visible=false;
scene.add(previewFill);

function roofMesh(width,depth,color){
  const r=mesh(new THREE.ConeGeometry(Math.max(width,depth)*.67,.48,4),mat(color),0,0,0);
  r.rotation.y=Math.PI/4;
  r.scale.z=depth/width;
  return r;
}
function makeFortress(fid,king){
  const g=new THREE.Group(),fc=factionColor(fid),roof=factionRoof(fid);
  const baseW=king?2.05:1.4,baseD=king?1.28:1.0;
  const stoneColor=fid==="goguryeo"?0x706f6a:(fid==="baekje"?0x8d785f:0x887f6d);
  const woodColor=fid==="baekje"?0xaa7950:0x9b754e;
  g.add(mesh(new THREE.BoxGeometry(baseW,king?1.12:.88,baseD),mat(stoneColor),0,king?.56:.44,0));
  g.add(mesh(new THREE.BoxGeometry(baseW*.78,.42,baseD*.78),mat(woodColor),0,king?1.23:1.00,0));

  if(fid==="goguryeo"){
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const butt=mesh(new THREE.BoxGeometry(.24,king?.82:.62,.24),mat(0x666660),sx*baseW*.43,king?.41:.31,sz*baseD*.40);g.add(butt);
    }
    const r1=roofMesh(baseW*.98,baseD*1.08,roof);r1.position.y=king?1.53:1.28;g.add(r1);
    if(king){const cap=mesh(new THREE.BoxGeometry(baseW*.44,.34,baseD*.44),mat(0x8f6a47),0,1.78,0);g.add(cap);const r2=roofMesh(baseW*.61,baseD*.66,roof);r2.position.y=2.04;g.add(r2);}
  }else if(fid==="baekje"){
    for(const sx of [-.33,.33])for(const sz of [-.28,.28])g.add(mesh(new THREE.CylinderGeometry(.035,.045,king?.75:.58,6),mat(0x70462f),sx*baseW,king?.82:.68,sz*baseD));
    const r1=roofMesh(baseW*1.18,baseD*1.32,roof);r1.scale.y=.82;r1.position.y=king?1.55:1.30;g.add(r1);
    if(king){const upper=mesh(new THREE.BoxGeometry(baseW*.48,.32,baseD*.48),mat(0xa77a52),0,1.78,0);g.add(upper);const r2=roofMesh(baseW*.72,baseD*.78,roof);r2.scale.y=.78;r2.position.y=2.04;g.add(r2);}
  }else{
    const r1=roofMesh(baseW*1.08,baseD*1.18,roof);r1.position.y=king?1.52:1.28;g.add(r1);
    const tier=mesh(new THREE.BoxGeometry(baseW*.56,.28,baseD*.56),mat(0xa17a50),0,king?1.79:1.53,0);g.add(tier);
    const r2=roofMesh(baseW*.77,baseD*.83,new THREE.Color(0x70503d));r2.position.y=king?2.02:1.74;g.add(r2);
    if(king){
      const finial=mesh(new THREE.CylinderGeometry(.035,.055,.42,8),mat(0xc8a94d,.45,.2),0,2.45,0);g.add(finial);
      const orb=mesh(new THREE.SphereGeometry(.075,8,6),mat(0xd7b858,.4,.25),0,2.68,0);g.add(orb);
    }
  }

  g.add(mesh(new THREE.BoxGeometry(.35,.54,.08),mat(0x33271f),0,.28,baseD/2+.045));
  g.add(mesh(new THREE.CylinderGeometry(.025,.025,.85,6),mat(0x4a3828),0,king?2.64:1.92,0));
  const flagY=king?2.82:2.10;
  const flag=mesh(new THREE.PlaneGeometry(.55,.28),new THREE.MeshBasicMaterial({color:fc,side:THREE.DoubleSide}),.29,flagY,0);
  flag.rotation.y=Math.PI/2;g.add(flag);
  return g;
}
function makeProceduralHorse(color){
  const g=new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(.72,.44,1.18),mat(color),0,.64,0));
  const neck=mesh(new THREE.BoxGeometry(.28,.6,.28),mat(color),0,.92,-.48);neck.rotation.x=-.35;g.add(neck);
  g.add(mesh(new THREE.BoxGeometry(.34,.30,.48),mat(color),0,1.16,-.72));
  const legs=[];
  [-.25,.25].forEach(function(x){[-.38,.38].forEach(function(z){const leg=mesh(new THREE.CylinderGeometry(.065,.055,.62,6),mat(color),x,.30,z);legs.push(leg);g.add(leg);});});
  g.userData.legs=legs;
  return {root:g,mixer:null,clips:[]};
}
function createHorse(){
  if(LOW_POWER||!horseTemplate)return makeProceduralHorse(0x74513a);
  const horse=SkeletonUtils.clone(horseTemplate.scene);
  const mixer=new THREE.AnimationMixer(horse);
  mixers.add(mixer);
  return {root:horse,mixer,clips:horseTemplate.animations||[],anim:null};
}
function chooseHorseClip(clips,moving){
  const names=clips.map(c=>c.name);
  const wanted=moving?["run","gallop","walk"]:["idle","stand"];
  for(const w of wanted){const n=names.find(n=>n.toLowerCase().includes(w));if(n)return n;}
  return names[0]||null;
}
function setHorseAnimation(rec,moving){
  if(!rec?.mixer)return;
  const name=chooseHorseClip(rec.clips,moving);
  if(!name||rec.anim===name)return;
  const clip=THREE.AnimationClip.findByName(rec.clips,name);if(!clip)return;
  const a=rec.mixer.clipAction(clip);a.reset().setLoop(THREE.LoopRepeat,Infinity).play();
  if(rec.action&&rec.action!==a)rec.action.fadeOut(.12);
  a.fadeIn(.12);rec.action=a;rec.anim=name;
}
function makeProceduralWeapon(cls,teamColor){
  const g=new THREE.Group();
  if(cls==="창병"){
    const shaft=mesh(new THREE.CylinderGeometry(.018,.018,1.45,6),mat(0x73502f),.30,.78,0);shaft.rotation.z=-.18;g.add(shaft);
    const tip=mesh(new THREE.ConeGeometry(.07,.22,5),mat(0xb8b5aa,.35,.4),.43,1.48,0);tip.rotation.z=-.18;g.add(tip);
  }else if(cls==="궁병"){
    const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(.2,.25,0),new THREE.Vector3(.5,.75,0),new THREE.Vector3(.2,1.25,0));
    g.add(mesh(new THREE.TubeGeometry(curve,12,.018,5,false),mat(0x6b442d)));
  }else{
    const blade=mesh(new THREE.BoxGeometry(.07,.72,.035),mat(0xb9b8b0,.35,.5),.28,.82,0);blade.rotation.z=-.20;g.add(blade);
  }
  if(cls==="보병"){
    const shield=mesh(new THREE.CylinderGeometry(.30,.30,.08,16),mat(teamColor),-.28,.72,.02);
    shield.rotation.z=Math.PI/2;shield.rotation.y=Math.PI/2;g.add(shield);
  }
  return g;
}
function centerWeaponObject(object,mode="center"){
  object.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(object);
  const center=b.getCenter(new THREE.Vector3());
  const min=b.min.clone();
  object.position.x-=center.x;
  object.position.z-=center.z;
  object.position.y-=mode==="base"?min.y:center.y;
}
function normalizeWeapon(object,target,mode="center"){
  object.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(object),size=b.getSize(new THREE.Vector3());
  const longest=Math.max(.001,size.x,size.y,size.z);
  object.scale.multiplyScalar(target/longest);
  object.updateMatrixWorld(true);
  centerWeaponObject(object,mode);
}
async function loadWeapon(name,target,mode="center"){
  const obj=await fbxLoader.loadAsync(WEAPON_ROOT+name+".fbx");
  normalizeWeapon(obj,target,mode);
  obj.traverse(function(o){if(o.isMesh){o.castShadow=renderer.shadowMap.enabled;o.receiveShadow=true;}});
  weaponTemplates.set(name,obj);
}
function cloneWeaponAsset(name){
  const t=weaponTemplates.get(name);return t?t.clone(true):null;
}
const WEAPON_RIG={
  Spear:{hand:"Wrist.R",pos:[.01,.01,.02],rot:[0,0,-.18]},
  Bow_Wooden:{hand:"Wrist.L",pos:[.02,.01,.01],rot:[0,0,Math.PI/2]},
  Sword:{hand:"Wrist.R",pos:[.01,.01,.01],rot:[0,0,-.10]},
  Shield_Round:{hand:"Wrist.L",pos:[.02,.01,.03],rot:[Math.PI/2,0,Math.PI/2]}
};
function attachWeapon(character,name){
  const cfg=WEAPON_RIG[name],weapon=cloneWeaponAsset(name);
  if(!cfg||!weapon)return false;
  const hand=character.getObjectByName(cfg.hand);
  if(!hand)return false;
  weapon.position.set(...cfg.pos);weapon.rotation.set(...cfg.rot);
  hand.add(weapon);return true;
}
function equipActualWeapons(character,u,fid){
  const icon=u.card?.icon||"";
  let used=false;
  if(u.cls==="창병"||icon==="spear")used=attachWeapon(character,"Spear")||used;
  else if(u.cls==="궁병"||icon==="bow"||icon==="horsebow")used=attachWeapon(character,"Bow_Wooden")||used;
  else used=attachWeapon(character,"Sword")||used;
  if(u.cls==="보병"||icon==="shield"||u.hero)used=attachWeapon(character,"Shield_Round")||used;
  return used;
}
function makeFallbackUnit(u,fid){
  const g=new THREE.Group(),fc=factionColor(fid),raise=u.cls==="기병"?.85:0;
  let horseRec=null;if(u.cls==="기병"){horseRec=createHorse();g.add(horseRec.root);}
  g.add(mesh(new THREE.CylinderGeometry(.18,.22,.72,8),mat(fc),0,.55+raise,0));
  g.add(mesh(new THREE.SphereGeometry(.16,10,8),mat(0xd4aa7d),0,1.03+raise,0));
  const weapon=makeProceduralWeapon(u.cls,fc);weapon.position.y=raise;g.add(weapon);
  if(u.hero){
    const halo=mesh(new THREE.TorusGeometry(.32,.035,6,20),new THREE.MeshBasicMaterial({color:0xf1ce69}),0,1.40+raise,0);
    halo.rotation.x=Math.PI/2;g.add(halo);
  }
  const health=createHealthBar(u.hero?1.00:.72,1.60+raise);g.add(health);return {root:g,mixer:null,clips:[],anim:null,health:health,horse:horseRec,disposable:true};
}
function pickCharacter(u){
  if(u.hero)return "King";
  if(u.cls==="궁병")return "Farmer";
  return "Adventurer";
}
function createAnimatedUnit(u,fid){
  if(LOW_POWER&&!u.hero)return makeFallbackUnit(u,fid);
  const tpl=characterTemplates.get(pickCharacter(u));
  if(!tpl)return makeFallbackUnit(u,fid);
  const holder=new THREE.Group();
  const character=SkeletonUtils.clone(tpl.scene);
  cloneMaterialTint(character,factionColor(fid));
  let horseRec=null;
  if(u.cls==="기병"){
    horseRec=createHorse();holder.add(horseRec.root);
    character.position.y=.92;
    character.scale.multiplyScalar(.88);
  }
  holder.add(character);
  const equipped=equipActualWeapons(character,u,fid);
  if(!equipped){const weapon=makeProceduralWeapon(u.cls,factionColor(fid));if(u.cls==="기병")weapon.position.y=.78;holder.add(weapon);}
  if(u.hero){
    const halo=mesh(new THREE.TorusGeometry(.38,.035,6,24),new THREE.MeshBasicMaterial({color:0xf2cf66}),0,1.55,0);
    halo.rotation.x=Math.PI/2;holder.add(halo);
  }
  const mixer=new THREE.AnimationMixer(character);
  mixers.add(mixer);
  addUnitSilhouette(holder,u,fid);const health=createHealthBar(u.hero?1.00:.72,u.cls==="기병"?2.12:(u.hero?1.75:1.48));holder.add(health);return {root:holder,mixer:mixer,clips:tpl.animations,anim:null,character:character,health:health,horse:horseRec};
}
function classRingColor(u){
  if(u.hero)return 0xf3ce68;
  if(u.cls==="기병")return 0xd99b55;
  if(u.cls==="궁병")return 0x72a875;
  if(u.cls==="창병")return 0x6f9eaa;
  return 0xa79578;
}
function heroAuraColor(skill){
  return ({founder:0xe0b85b,aura:0xf1cf66,siege:0xd48b55,trap:0x8d75b8,guard:0x6e9bc1,heal:0x73af78,support:0x65a79e,laststand:0xd66a55,vision:0x9c92cf,combo:0xe2c763,martyr:0xe18a58,late:0xd6b14f})[skill]||0xe0c56a;
}
function addUnitSilhouette(holder,u,fid){
  const fc=factionColor(fid);
  const baseRing=mesh(new THREE.RingGeometry(u.hero?.28:.22,u.hero?.34:.27,24),new THREE.MeshBasicMaterial({color:classRingColor(u),transparent:true,opacity:u.hero?.75:.34,side:THREE.DoubleSide,depthWrite:false}),0,.015,0);
  baseRing.rotation.x=-Math.PI/2;holder.add(baseRing);
  const pole=mesh(new THREE.CylinderGeometry(.012,.016,.62,5),mat(0x59402a),-.25,u.cls==="기병"?1.62:1.18,.06);
  holder.add(pole);
  const banner=mesh(new THREE.PlaneGeometry(.32,.19),new THREE.MeshBasicMaterial({color:fc,side:THREE.DoubleSide}),-.08,u.cls==="기병"?1.80:1.36,.06);
  banner.rotation.y=Math.PI/2;holder.add(banner);
  if(u.hero){
    const aura=mesh(new THREE.RingGeometry(.48,.57,36),new THREE.MeshBasicMaterial({color:heroAuraColor(u.card?.skill),transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}),0,.022,0);
    aura.rotation.x=-Math.PI/2;aura.userData.heroAura=true;holder.add(aura);
  }
  const buffRing=mesh(new THREE.RingGeometry(.31,.36,28),new THREE.MeshBasicMaterial({color:0xf0d16f,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),0,.019,0);
  buffRing.rotation.x=-Math.PI/2;buffRing.userData.buffRing=true;holder.add(buffRing);
  if(u.cls==="창병"){
    const crest=mesh(new THREE.ConeGeometry(.13,.19,6),mat(0x4a4035),0,u.cls==="기병"?1.72:1.25,0);holder.add(crest);
  }else if(u.cls==="보병"){
    const rim=mesh(new THREE.TorusGeometry(.17,.025,5,12),mat(0x6b604f),0,1.25,0);rim.rotation.x=Math.PI/2;holder.add(rim);
  }else if(u.hero){
    if(fid==="goguryeo"){
      const crown=mesh(new THREE.CylinderGeometry(.15,.18,.16,8),mat(0x514b45,.48,.20),0,1.35,0);holder.add(crown);
      const crest=mesh(new THREE.BoxGeometry(.05,.24,.16),mat(0x9d3d35),0,1.51,0);holder.add(crest);
    }else if(fid==="baekje"){
      const crown=mesh(new THREE.CylinderGeometry(.14,.18,.12,8),mat(0xd3aa52,.40,.28),0,1.35,0);holder.add(crown);
      const band=mesh(new THREE.TorusGeometry(.16,.022,5,12),mat(0xe2c36a,.38,.30),0,1.39,0);band.rotation.x=Math.PI/2;holder.add(band);
    }else{
      const band=mesh(new THREE.TorusGeometry(.15,.025,5,12),mat(0xd8b64f,.38,.32),0,1.35,0);band.rotation.x=Math.PI/2;holder.add(band);
      for(const x of [-.09,0,.09]){const branch=mesh(new THREE.BoxGeometry(.025,.25,.025),mat(0xdfbd55,.38,.32),x,1.51,0);branch.rotation.z=x*2;holder.add(branch);}
    }
  }
}
function animName(u){
  if(u.dead)return "Death";
  if(u.hitTimer>0||u.state==="hit")return "HitRecieve";
  if(u.attackAnim>0||u.state==="attack"){
    if(u.cls==="궁병"||u.card?.icon==="bow"||u.card?.icon==="horsebow")return "Gun_Shoot";
    if(u.cls==="창병"||u.card?.icon==="spear")return "Punch_Right";
    return "Sword_Slash";
  }
  if(u.state==="move")return "Run";
  if(u.cls==="궁병"||u.card?.icon==="bow"||u.card?.icon==="horsebow")return "Idle_Gun";
  return "Idle_Sword";
}
function setAnimation(rec,name){
  if(!rec.mixer||rec.anim===name)return;
  let clip=THREE.AnimationClip.findByName(rec.clips,name);
  if(!clip)clip=THREE.AnimationClip.findByName(rec.clips,name==="Run"?"Walk":(name.startsWith("Idle_")?"Idle":"Idle"));
  if(!clip)return;
  const next=rec.mixer.clipAction(clip);next.reset();
  if(name==="Sword_Slash"||name==="HitRecieve"||name==="Death"){next.setLoop(THREE.LoopOnce,1);next.clampWhenFinished=true;}
  else next.setLoop(THREE.LoopRepeat,Infinity);
  if(rec.action&&rec.action!==next)rec.action.fadeOut(.12);
  next.timeScale=name==="Run"?1.15:(name==="Punch_Right"||name==="Sword_Slash"||name==="Gun_Shoot"?1.45:1);next.fadeIn(.12).play();rec.action=next;rec.anim=name;
}
async function loadCharacter(name){
  const gltf=await loader.loadAsync(CHAR_ROOT+name+".gltf");
  normalizeHeight(gltf.scene,1.18);
  characterTemplates.set(name,{scene:gltf.scene,animations:gltf.animations||[]});
}
async function loadHorse(){
  const gltf=await loader.loadAsync(HORSE_URL);
  normalizeHeight(gltf.scene,1.08);
  horseTemplate={scene:gltf.scene,animations:gltf.animations||[]};
}
async function loadProp(name){
  const gltf=await loader.loadAsync(PROP_ROOT+name+".gltf");
  normalizeHeight(gltf.scene,1);
  gltf.scene.traverse(function(o){if(o.isMesh){o.castShadow=renderer.shadowMap.enabled;o.receiveShadow=true;}});
  propTemplates.set(name,gltf.scene);
}
function cloneProp(name,scale){
  const p=propTemplates.get(name);if(!p)return null;
  const c=p.clone(true);c.scale.multiplyScalar(scale==null?1:scale);return c;
}
function addScenicProp(name,x,z,scale,rot){
  const p=cloneProp(name,scale);if(!p)return;
  p.position.set(x,0,z);p.rotation.y=rot||0;world.add(p);
}
function decorateWithProps(){
  [
    ["Barrel",-7.1,4.75,.45,.4],["Crate_Wooden",-6.55,4.95,.42,-.2],["Bag",-7.55,5.05,.38,.5],
    ["FarmCrate_Empty",-6.10,5.12,.36,.15],["Cauldron",-8.0,4.65,.34,.2],["Torch_Metal",-7.85,4.1,.52,0],
    ["Stall_Empty",7.15,4.75,.62,-.5],["Chest_Wood",6.55,5.08,.38,.3],["Banner_1",7.75,5.05,.55,0],
    ["Vase_2",6.05,5.12,.28,.1],["Pot_1",6.35,4.75,.28,-.2],["Pouch_Large",7.62,4.55,.28,.2],
    ["Barrel",-7.15,-4.75,.45,-.4],["Crate_Wooden",-6.55,-5.0,.42,.3],["Bag",-7.55,-5.05,.38,-.5],
    ["FarmCrate_Empty",-6.12,-5.15,.36,-.1],["Workbench",-7.9,-4.65,.40,.2],["Anvil",-8.15,-4.15,.35,.3],
    ["Stall_Empty",7.15,-4.75,.62,.5],["WeaponStand",6.45,-5.05,.50,-.3],["Banner_2",7.75,-5.05,.55,Math.PI],
    ["Dummy",6.1,-4.5,.38,-.2],["Shield_Wooden",7.9,-4.25,.34,.2],["Torch_Metal",7.6,-3.95,.52,0]
  ].forEach(function(a){addScenicProp(a[0],a[1],a[2],a[3],a[4]);});
}
function buildingBase(b,fid){
  const g=new THREE.Group(),fc=factionColor(fid),roof=factionRoof(fid),id=b.card&&b.card.id;
  if(id==="stone_barrier"||id==="b_stockade"){
    for(let i=-3;i<=3;i++){
      const p=mesh(new THREE.BoxGeometry(.25,.74,.28),mat(id==="stone_barrier"?0x77766e:0x755034),i*.26,.37,0);
      if(id==="b_stockade")p.rotation.z=i%2?.08:-.08;g.add(p);
    }
  }else if(id==="beacon"){
    g.add(mesh(new THREE.CylinderGeometry(.36,.56,1.15,8),mat(0x716b5f),0,.57,0));
    g.add(mesh(new THREE.ConeGeometry(.18,.45,7),new THREE.MeshBasicMaterial({color:0xf28a39}),0,1.35,0));
  }else if(id==="cheomseongdae"){
    for(let i=0;i<7;i++){const r=.48-i*.035;g.add(mesh(new THREE.CylinderGeometry(r-.02,r,.18,14),mat(0x9a927f),0,.09+i*.17,0));}
  }else if(id==="b_watchtower"){
    [-.35,.35].forEach(function(x){[-.25,.25].forEach(function(z){g.add(mesh(new THREE.CylinderGeometry(.045,.06,1.25,6),mat(0x6e472c),x,.62,z));});});
    g.add(mesh(new THREE.BoxGeometry(1.05,.12,.82),mat(0x8a6039),0,1.20,0));
    const r=roofMesh(1.18,.95,roof);r.position.y=1.50;g.add(r);
  }else if(id==="trade_post"){
    const stall=cloneProp("Stall_Empty",.72);if(stall)g.add(stall);
    const crate=cloneProp("Crate_Wooden",.34);if(crate){crate.position.set(.62,0,.35);g.add(crate);}
    const chest=cloneProp("Chest_Wood",.30);if(chest){chest.position.set(-.58,0,.34);g.add(chest);}
  }else if(id==="hwarang_camp"){
    const tent=mesh(new THREE.ConeGeometry(.75,.95,4),mat(0x9b7447),-.35,.47,0);tent.rotation.y=Math.PI/4;g.add(tent);
    const stand=cloneProp("WeaponStand",.48);if(stand){stand.position.set(.58,0,.22);g.add(stand);}
    const dummy=cloneProp("Dummy",.46);if(dummy){dummy.position.set(.78,0,-.35);g.add(dummy);}
    const banner=cloneProp("Banner_1",.45);if(banner){banner.position.set(-.75,0,-.25);g.add(banner);}
  }else{
    g.add(mesh(new THREE.BoxGeometry(1.28,.72,.86),mat(id==="mountain_fort"||id==="hill_fort"?0x7b786d:0x98704a),0,.36,0));
    const r=roofMesh(1.42,1.0,roof);r.position.y=.98;g.add(r);
  }
  const ring=mesh(new THREE.RingGeometry(.72,.80,32),new THREE.MeshBasicMaterial({color:fc,transparent:true,opacity:.42,side:THREE.DoubleSide}),0,.025,0);
  ring.rotation.x=-Math.PI/2;g.add(ring);return g;
}
function createLifeBar(width=.76,y=1.66){
  const group=new THREE.Group();group.position.y=y;
  const bg=mesh(new THREE.PlaneGeometry(width,.045),new THREE.MeshBasicMaterial({color:0x282015,transparent:true,opacity:.72,depthTest:false}),0,0,0);
  const fill=mesh(new THREE.PlaneGeometry(width*.94,.027),new THREE.MeshBasicMaterial({color:0xe3bd59,depthTest:false}),0,0,.003);
  group.add(bg,fill);group.userData.fill=fill;group.renderOrder=20;return group;
}
function updateLifeBar(bar,ratio){
  if(!bar)return;ratio=THREE.MathUtils.clamp(ratio,0,1);
  const fill=bar.userData.fill;if(fill){fill.scale.x=Math.max(.001,ratio);fill.position.x=-(1-ratio)*.35;fill.material.color.setHex(ratio<.25?0xdd6a4c:0xe3bd59);}
  faceCameraLocal(bar);
}
function createHealthBar(width=.86,y=1.55){
  const group=new THREE.Group();
  group.position.y=y;
  const bg=mesh(new THREE.PlaneGeometry(width,.075),new THREE.MeshBasicMaterial({color:0x241d18,transparent:true,opacity:.82,depthTest:false}),0,0,0);
  const fill=mesh(new THREE.PlaneGeometry(width*.94,.046),new THREE.MeshBasicMaterial({color:0x70c875,depthTest:false}),0,0,.003);
  group.add(bg,fill);group.userData.fill=fill;group.renderOrder=20;return group;
}
const faceParentQ=new THREE.Quaternion();
function faceCameraLocal(object){
  if(!object?.parent){object.quaternion.copy(camera.quaternion);return;}
  object.parent.getWorldQuaternion(faceParentQ);faceParentQ.invert();
  object.quaternion.copy(faceParentQ.multiply(camera.quaternion));
}
function updateHealthBar(bar,ratio,team){
  if(!bar)return;ratio=THREE.MathUtils.clamp(ratio,0,1);
  const fill=bar.userData.fill;if(fill){fill.scale.x=Math.max(.001,ratio);fill.position.x=-(1-ratio)*.40;fill.material.color.setHex(ratio<.28?0xd55245:(team==="player"?0x65b8e5:0xe27668));}
  faceCameraLocal(bar);
}
function setHitFlash(root,on){
  root.traverse(function(o){if(!o.isMesh||!o.material)return;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(function(m){if(m&&m.emissive)m.emissive.setHex(on?0x3b0e08:0x000000);});});
}
function makeSteppedTomb(){
  const g=new THREE.Group();
  [[1.25,.22],[1.02,.22],[.78,.22],[.52,.22]].forEach(function(a,i){g.add(mesh(new THREE.BoxGeometry(a[0],a[1],a[0]*.75),mat(0x77746c),0,.11+i*.2,0));});
  return g;
}
function makePagoda(levels=5,color=0x784438){
  const g=new THREE.Group();
  for(let i=0;i<levels;i++){
    const y=.18+i*.25,w=.78-i*.09;
    g.add(mesh(new THREE.BoxGeometry(w,.19,w*.66),mat(0xa67e52),0,y,0));
    const r=roofMesh(w*1.18,w*.85,new THREE.Color(color));r.position.y=y+.17;g.add(r);
  }
  return g;
}
function makeRoundTomb(){
  const g=new THREE.Group();
  const mound=mesh(new THREE.SphereGeometry(.7,18,10),mat(0x65754b),0,.05,0);mound.scale.y=.55;g.add(mound);
  const door=mesh(new THREE.BoxGeometry(.26,.28,.08),mat(0x534a3e),0,.10,.55);g.add(door);return g;
}
function makeObservatory(){
  const g=new THREE.Group();
  for(let i=0;i<7;i++){const r=.38-i*.025;g.add(mesh(new THREE.CylinderGeometry(r-.015,r,.15,14),mat(0x999181),0,.075+i*.14,0));}
  return g;
}
function factionCamp(fid){
  const g=new THREE.Group();
  const add=(name,x,z,scale=.35,rot=0)=>{const p=cloneProp(name,scale);if(p){p.position.set(x,0,z);p.rotation.y=rot;g.add(p);}};
  if(fid==="goguryeo"){
    add("WeaponStand",-.45,.05,.48,-.3);add("Shield_Wooden",.35,.10,.34,.4);add("Crate_Wooden",-.15,.50,.32,.1);add("Torch_Metal",.55,.48,.46,0);
  }else if(fid==="baekje"){
    add("Stall_Cart_Empty",-.25,.05,.58,-.2);add("Vase_2",.52,.30,.26,.2);add("Coin_Pile",.34,-.30,.22,0);add("Pouch_Large",-.62,.42,.25,.2);
  }else{
    add("Dummy",-.35,.08,.40,-.2);add("WeaponStand",.38,.08,.45,.25);add("Banner_1",-.64,.46,.45,0);add("Bench",.52,.48,.35,.1);
  }
  return g;
}
function factionLandmark(fid){
  if(fid==="goguryeo")return makeSteppedTomb();
  if(fid==="baekje")return makePagoda(4,0x785548);
  const g=new THREE.Group();const p=makePagoda(5,0x675444);p.position.x=-.55;g.add(p);const o=makeObservatory();o.position.x=.58;g.add(o);return g;
}
function syncFactionLandmarks(g){
  const key=g.playerFaction+"|"+g.enemyFaction;if(key===landmarkKey)return;
  landmarkKey=key;if(landmarkGroup)world.remove(landmarkGroup);
  landmarkGroup=new THREE.Group();
  const enemyBand=mesh(new THREE.PlaneGeometry(20.6,5.25),new THREE.MeshBasicMaterial({color:factionColor(g.enemyFaction),transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false}),0,.016,-3.85);enemyBand.rotation.x=-Math.PI/2;landmarkGroup.add(enemyBand);
  const playerBand=mesh(new THREE.PlaneGeometry(20.6,5.25),new THREE.MeshBasicMaterial({color:factionColor(g.playerFaction),transparent:true,opacity:.060,side:THREE.DoubleSide,depthWrite:false}),0,.016,3.85);playerBand.rotation.x=-Math.PI/2;landmarkGroup.add(playerBand);
  const enemy=factionLandmark(g.enemyFaction);enemy.position.set(-7.2,0,-3.25);enemy.scale.setScalar(.90);landmarkGroup.add(enemy);
  const enemyCamp=factionCamp(g.enemyFaction);enemyCamp.position.set(7.25,0,-4.45);enemyCamp.rotation.y=Math.PI;landmarkGroup.add(enemyCamp);
  const player=factionLandmark(g.playerFaction);player.position.set(7.2,0,3.25);player.rotation.y=Math.PI;player.scale.setScalar(.90);landmarkGroup.add(player);
  const playerCamp=factionCamp(g.playerFaction);playerCamp.position.set(-7.25,0,4.45);landmarkGroup.add(playerCamp);
  world.add(landmarkGroup);
}
function ensureRubble(rec,root,ratio){
  if(ratio>0||rec.rubble)return;
  rec.rubble=new THREE.Group();
  for(let i=0;i<(LOW_POWER?5:9);i++){
    const piece=mesh(new THREE.BoxGeometry(.12+(i%3)*.05,.08+(i%2)*.04,.14+(i%4)*.035),mat(i%2?0x716a5f:0x8a7b65),Math.cos(i*.9)*(.35+(i%3)*.10),.05,Math.sin(i*.9)*(.32+(i%2)*.12));
    piece.rotation.set(i*.13,i*.37,i*.21);rec.rubble.add(piece);
  }
  root.add(rec.rubble);
}
function ensureBuildingAura(rec,b,fid){
  const id=b.card?.id;
  const auraType=["mountain_fort","hill_fort"].includes(id)?"fort":(id==="hwarang_camp"?"camp":null);
  if(!auraType)return;
  if(!rec.aura){
    const color=auraType==="fort"?factionColor(fid):new THREE.Color(0xe1bd62);
    rec.aura=mesh(new THREE.RingGeometry(.88,.93,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}),0,.025,0);
    rec.aura.rotation.x=-Math.PI/2;rec.root.add(rec.aura);
  }
  rec.aura.visible=!b.dead&&b.buildTimer<=0;
  if(rec.aura.visible){const pulse=1+Math.sin(performance.now()*.003)*.05;rec.aura.scale.setScalar(pulse);}
}
function ensureDamageSmoke(rec,ratio){
  if(!rec.smoke){
    rec.smoke=new THREE.Group();
    for(let i=0;i<5;i++){
      const puff=mesh(new THREE.SphereGeometry(.10+i*.018,8,6),new THREE.MeshStandardMaterial({color:0x49433d,transparent:true,opacity:.22,roughness:1}),(-.18+i*.09),1.18+i*.13,(i%2?.10:-.08));
      rec.smoke.add(puff);
    }
    rec.root.add(rec.smoke);
  }
  rec.smoke.visible=ratio<.42;
  if(rec.smoke.visible){const t=performance.now()*.001;rec.smoke.children.forEach((p,i)=>{p.position.y=1.05+i*.13+(Math.sin(t*1.5+i)*.06);p.material.opacity=.12+(1-ratio)*.32;});}
}
function createTower(t,g){
  const fid=t.team==="player"?g.playerFaction:g.enemyFaction,root=makeFortress(fid,!!t.king),p=canvasToWorld(t.x,t.y);
  root.position.copy(p);root.position.y=.02;if(t.team==="enemy")root.rotation.y=Math.PI;
  const health=createHealthBar(t.king?1.35:1.05,t.king?3.18:2.35);root.add(health);
  let protection=null;
  if(t.king){
    protection=mesh(new THREE.RingGeometry(1.15,1.28,48),new THREE.MeshBasicMaterial({color:0xe3cd78,side:THREE.DoubleSide,transparent:true,opacity:.44,depthWrite:false}),0,.045,0);
    protection.rotation.x=-Math.PI/2;root.add(protection);
  }
  world.add(root);return {root:root,health:health,protection:protection};
}
function createBuilding(b,g){
  const fid=b.team==="player"?g.playerFaction:g.enemyFaction,root=buildingBase(b,fid),p=canvasToWorld(b.x,b.y);
  root.position.copy(p);if(b.team==="enemy")root.rotation.y=Math.PI;
  const health=createHealthBar(.92,1.82);root.add(health);
  const life=createLifeBar(.78,1.69);root.add(life);
  world.add(root);return {root:root,health:health,life:life};
}
function syncTowers(g){
  const live=new Set();
  g.towers.forEach(function(t){
    live.add(t.id);let rec=towerMeshes.get(t.id);
    if(!rec){rec=createTower(t,g);towerMeshes.set(t.id,rec);}
    const p=canvasToWorld(t.x,t.y);rec.root.position.x=p.x;rec.root.position.z=p.z;
    const ratio=Math.max(0,t.hp/t.maxHp);updateHealthBar(rec.health,ratio,t.team);setHitFlash(rec.root,t.damageFlash>0);ensureDamageSmoke(rec,ratio);ensureRubble(rec,rec.root,ratio);
    if(t.king&&rec.protection){
      const sideCount=g.towers.filter(x=>x.team===t.team&&!x.king&&!x.dead).length;
      rec.protection.visible=sideCount>0;
      rec.protection.material.opacity=sideCount===2?.46:(sideCount===1?.24:0);
      rec.protection.material.color.setHex(sideCount===2?0xe3cd78:0xd28b56);
      rec.protection.rotation.z+=.006;
    }
    if(t.dead){rec.root.rotation.z=.28;rec.root.rotation.x=.10;rec.root.position.y=-.34;}
  });
  towerMeshes.forEach(function(rec,id){if(!live.has(id)){world.remove(rec.root);towerMeshes.delete(id);}});
}
function syncBuildings(g){
  const live=new Set();
  g.buildings.forEach(function(b){
    const key=b.id||(b.team+"-"+b.card.id+"-"+Math.round(b.x)+"-"+Math.round(b.y));
    live.add(key);let rec=buildingMeshes.get(key);
    if(!rec){rec=createBuilding(b,g);buildingMeshes.set(key,rec);}
    const p=canvasToWorld(b.x,b.y);rec.root.position.x=p.x;rec.root.position.z=p.z;
    const life=b.maxLifetime?Math.max(.78,b.lifetime/b.maxLifetime):1;
    const buildScale=b.buildTimer>0?THREE.MathUtils.lerp(.24,1,1-THREE.MathUtils.clamp(b.buildTimer/.65,0,1)):1;
    rec.root.scale.setScalar((.92+.08*life)*buildScale);
    const ratio=Math.max(0,b.hp/b.maxHp);updateHealthBar(rec.health,ratio,b.team);updateLifeBar(rec.life,b.maxLifetime?b.lifetime/b.maxLifetime:1);setHitFlash(rec.root,b.hitTimer>0);ensureDamageSmoke(rec,ratio);ensureRubble(rec,rec.root,ratio);
    ensureBuildingAura(rec,b,b.team==="player"?g.playerFaction:g.enemyFaction);
    if(b.dead){rec.root.rotation.z=.22;rec.root.position.y=-.18;}
  });
  buildingMeshes.forEach(function(rec,id){if(!live.has(id)){world.remove(rec.root);if(LOW_POWER)disposeFx(rec.root);buildingMeshes.delete(id);}});
}
function syncUnits(g){
  const live=new Set();
  g.units.forEach(function(u){
    live.add(u.id);let rec=unitMeshes.get(u.id);
    if(!rec){const fid=u.team==="player"?g.playerFaction:g.enemyFaction;rec=createAnimatedUnit(u,fid);world.add(rec.root);unitMeshes.set(u.id,rec);}
    const p=canvasToWorld(u.x,u.y);rec.root.position.x=p.x;rec.root.position.z=p.z;rec.root.position.y=u.spawnTimer>0?Math.max(0,.18-u.spawnTimer*.35):0;
    if(u.target&&u.target.x!=null){
      const q=canvasToWorld(u.target.x,u.target.y);
      // Quaternius/Kenney humanoids face +Z at yaw 0. Math.atan2(dx,dz)
      // already yields the correct world yaw; adding PI made run/attack face backward.
      rec.root.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);
    } else rec.root.rotation.y=u.team==="player"?Math.PI:0;
    setAnimation(rec,animName(u));setHorseAnimation(rec.horse,u.state==="move");if(rec.horse&&!rec.horse.mixer&&rec.horse.root.userData.legs){const gait=performance.now()*.012;rec.horse.root.userData.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(gait+(i%2)*Math.PI)*(u.state==="move"?.42:.05));}
    const now=performance.now();
    rec.root.traverse(function(o){
      if(o.userData.heroAura){const pulse=1+Math.sin(now*.004)*.07;o.scale.setScalar(pulse);o.material.opacity=.18+Math.sin(now*.004)*.05;}
      if(o.userData.buffRing){
        const buffed=(u.buffUntil&&now<u.buffUntil)||u.activeGuardUntil&&now<u.activeGuardUntil||u.siegeBuffUntil&&now<u.siegeBuffUntil;
        o.material.opacity=buffed?.42:0;
        if(u.activeGuardUntil&&now<u.activeGuardUntil)o.material.color.setHex(0x70a7cf);
        else if((u.buffSpeed||1)<.8)o.material.color.setHex(0x9276b5);
        else o.material.color.setHex(0xf0d16f);
        if(buffed)o.scale.setScalar(1+Math.sin(now*.006)*.08);
      }
    });
    const spawnScale=u.spawnTimer>0?THREE.MathUtils.clamp(1-u.spawnTimer/.42,.25,1):1;rec.root.scale.setScalar((u.hero?1.12:1)*spawnScale);updateHealthBar(rec.health,u.hp/u.maxHp,u.team);setHitFlash(rec.root,u.hitTimer>0);
  });
  unitMeshes.forEach(function(rec,id){
    if(!live.has(id)){
      if(rec.mixer){rec.mixer.stopAllAction();rec.mixer.uncacheRoot(rec.character||rec.root);mixers.delete(rec.mixer);}
      if(rec.horse?.mixer){rec.horse.mixer.stopAllAction();rec.horse.mixer.uncacheRoot(rec.horse.root);mixers.delete(rec.horse.mixer);}
      world.remove(rec.root);if(rec.disposable)disposeFx(rec.root);unitMeshes.delete(id);
    }
  });
}
function createProjectileMesh(){
  const arrow=cloneWeaponAsset("Arrow");
  if(arrow){arrow.scale.multiplyScalar(.72);scene.add(arrow);return arrow;}
  const p=mesh(new THREE.CylinderGeometry(.025,.025,.55,5),mat(0xd7c79c,.5,.15),0,.7,0);p.rotation.x=Math.PI/2;scene.add(p);return p;
}
function syncProjectiles(g){
  const visualCount=LOW_POWER?Math.min(g.projectiles.length,28):g.projectiles.length;
  while(projectileMeshes.length<visualCount)projectileMeshes.push(createProjectileMesh());
  projectileMeshes.forEach(function(m,i){
    const p=i<visualCount?g.projectiles[i]:null;m.visible=!!p;if(!p)return;
    const q=canvasToWorld(p.x,p.y);m.position.set(q.x,.82,q.z);
    if(p.target){const tq=canvasToWorld(p.target.x,p.target.y),dir=tq.clone().sub(q);m.rotation.y=Math.atan2(dir.x,dir.z);m.rotation.z=-.08;}
  });
}
function syncPreview(g){
  const card=g.selectedIndex>=0?g.pHand[g.selectedIndex]:null,p=g.pointer;
  if(!card||!p||!p.inside){previewRing.visible=false;previewFill.visible=false;formationBand.visible=false;rangePreview.visible=false;return;}
  const q=canvasToWorld(p.x,p.y);previewRing.visible=true;previewFill.visible=true;
  previewRing.position.x=previewFill.position.x=q.x;previewRing.position.z=previewFill.position.z=q.z;
  const rule=g.placementRule(card,"player",p.x,p.y),color=rule.ok?0x84e39c:0xe85b50;
  previewRing.material.color.setHex(color);previewFill.material.color.setHex(color);
  const radius=card.kind==="spell"?(card.id==="cavalry_charge"?4.4:3.7):(card.kind==="building"?.78:.58);
  previewRing.scale.setScalar(radius/.5);previewFill.scale.setScalar(radius/.5);
  const activeHero=card.kind==="hero"&&g.isHeroAlive("player",card.id);
  let tacticalRadius=0;
  if(activeHero)tacticalRadius=190/48;
  else if(card.kind==="spell")tacticalRadius=180/48;
  else if(card.kind==="building"&&card.damage>0)tacticalRadius=(card.range||120)/48;
  else if(card.kind==="unit"&&(card.range||0)>80)tacticalRadius=card.range/48;
  if(tacticalRadius>0){
    rangePreview.visible=true;rangePreview.position.x=q.x;rangePreview.position.z=q.z;rangePreview.scale.setScalar(tacticalRadius);
    rangePreview.material.color.setHex(rule.ok?(activeHero?0xe8c862:0xf0d27a):0xe85b50);
  }else rangePreview.visible=false;
  if((card.kind==="unit"||card.kind==="hero")&&!activeHero){
    const f=g.formationFor("player",p.y);
    const bands={front:{z:1.65,d:1.55,c:0xc98b61},mid:{z:3.25,d:1.62,c:0x7d9fc4},rear:{z:4.92,d:1.58,c:0x77946a}};
    const b=bands[f]||bands.mid;
    formationBand.visible=true;formationBand.position.z=b.z;formationBand.scale.y=b.d;formationBand.material.color.setHex(b.c);
    formationBand.material.opacity=rule.ok?.10:.045;
  }else formationBand.visible=false;
}
function makeTextSprite(text,color="#fff2c4",scale=1){
  const c=document.createElement("canvas");c.width=512;c.height=128;
  const x=c.getContext("2d");x.clearRect(0,0,c.width,c.height);
  x.font="900 48px system-ui, sans-serif";x.textAlign="center";x.textBaseline="middle";
  x.lineJoin="round";x.lineWidth=10;x.strokeStyle="rgba(25,18,13,.82)";x.strokeText(String(text||""),256,64);
  x.fillStyle=color;x.fillText(String(text||""),256,64);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false}));
  sp.scale.set(2.2*scale,.55*scale,1);sp.renderOrder=40;sp.userData.textSprite=true;return sp;
}
function disposeFx(root){
  root.traverse(function(o){
    if(o.material?.map&&o.userData.textSprite)o.material.map.dispose();
    if(o.material)o.material.dispose?.();
    if(o.geometry)o.geometry.dispose?.();
  });
}
function setFxOpacity(root,value){
  root.traverse(function(o){if(!o.material)return;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(function(m){if(m){m.transparent=true;m.opacity=value;}});});
}
function fxColor(f){return f.team==="player"?0x76b8e8:(f.team==="enemy"?0xe07b6f:0xf1d36f);}
function makeFxRoot(f){
  const g=new THREE.Group(),color=fxColor(f);
  if(f.type==="float"){
    const colors={bad:"#ef9078",guard:"#e9dda0",crit:"#ffd15f",damage:"#fff1c8"};
    const sp=makeTextSprite(f.text||"",colors[f.tone]||"#fff1c8",f.tone==="crit"?1.08:.86);sp.position.y=.76;g.add(sp);
  }else if(f.type==="banner"){
    const sp=makeTextSprite(f.text||"",f.team==="player"?"#bfe3ff":"#ffd0c7",1.0);sp.position.y=1.15;g.add(sp);
    const ring=mesh(new THREE.RingGeometry(.42,.50,40),new THREE.MeshBasicMaterial({color:color,side:THREE.DoubleSide,transparent:true,opacity:.72}),0,.045,0);ring.rotation.x=-Math.PI/2;g.add(ring);
  }else if(f.type==="invalid"){
    const a=mesh(new THREE.BoxGeometry(.7,.055,.07),new THREE.MeshBasicMaterial({color:0xef5b50}),0,.12,0);a.rotation.y=.78;g.add(a);
    const b=a.clone();b.rotation.y=-.78;g.add(b);
  }else if(f.type==="hit"||f.type==="deflect"||f.type==="brace"){
    for(let i=0;i<(LOW_POWER?4:7);i++){const spark=mesh(new THREE.BoxGeometry(.025,.025,.26),new THREE.MeshBasicMaterial({color:f.type==="brace"?0xdde8d7:0xffe392}),0,.35,0);spark.rotation.y=i*Math.PI*2/(LOW_POWER?4:7);spark.position.x=Math.cos(i*.9)*.18;spark.position.z=Math.sin(i*.9)*.18;g.add(spark);}
    if(f.type==="brace"){const sp=makeTextSprite(f.text||"돌격 저지!","#e7d77a",.72);sp.position.y=.92;g.add(sp);}
  }else if(f.type==="deathDust"){
    for(let i=0;i<(LOW_POWER?4:8);i++){const dust=mesh(new THREE.DodecahedronGeometry(.07+(i%3)*.02,0),new THREE.MeshStandardMaterial({color:0x9f8b6d,transparent:true,opacity:.55}),Math.cos(i*.8)*.22,.07,Math.sin(i*.8)*.22);g.add(dust);}
  }else if(f.type==="build"){
    const ring=mesh(new THREE.RingGeometry(.42,.49,28),new THREE.MeshBasicMaterial({color:0xe8c986,side:THREE.DoubleSide,transparent:true,opacity:.7}),0,.045,0);ring.rotation.x=-Math.PI/2;g.add(ring);
    for(let i=0;i<5;i++){const beam=mesh(new THREE.BoxGeometry(.025,.75,.025),new THREE.MeshBasicMaterial({color:0xf0dba0,transparent:true,opacity:.5}),Math.cos(i*1.25)*.34,.38,Math.sin(i*1.25)*.34);g.add(beam);}
  }else{
    const ring=mesh(new THREE.RingGeometry(.38,.46,40),new THREE.MeshBasicMaterial({color:color,side:THREE.DoubleSide,transparent:true,opacity:.72}),0,.045,0);ring.rotation.x=-Math.PI/2;g.add(ring);
    if(f.type==="cast"||f.type==="ring"||f.type==="charge"||f.type==="banner"||f.type==="portraitSummon"){
      const ring2=mesh(new THREE.RingGeometry(.62,.66,40),new THREE.MeshBasicMaterial({color:0xf3df91,side:THREE.DoubleSide,transparent:true,opacity:.38}),0,.055,0);ring2.rotation.x=-Math.PI/2;g.add(ring2);
    }
    if(f.type==="deploy"||f.type==="portraitSummon"||f.type==="banner"){
      const pole=mesh(new THREE.CylinderGeometry(.012,.016,.85,5),mat(0x5b412d),0,.43,0);g.add(pole);
      const flag=mesh(new THREE.PlaneGeometry(.46,.24),new THREE.MeshBasicMaterial({color:color,side:THREE.DoubleSide,transparent:true,opacity:.85}),.24,.68,0);flag.rotation.y=Math.PI/2;g.add(flag);
    }
  }
  const q=canvasToWorld(f.x||480,f.y||310);g.position.set(q.x,0,q.z);scene.add(g);return g;
}
function syncFx(g){
  const live=new Set();
  const visualFx=LOW_POWER?g.fx.slice(-20):g.fx;
  for(const f of visualFx){
    if(!f.__v3id)f.__v3id=fxSeq++;
    live.add(f.__v3id);
    let rec=fxMeshes.get(f.__v3id);
    if(!rec){rec={root:makeFxRoot(f),type:f.type};fxMeshes.set(f.__v3id,rec);}
    const q=canvasToWorld(f.x||480,f.y||310);rec.root.position.x=q.x;rec.root.position.z=q.z;
    const t=f.max?THREE.MathUtils.clamp(f.life/f.max,0,1):1,p=1-t;
    if(["ring","cast","charge","deploy","portraitSummon","banner","build"].includes(f.type))rec.root.scale.setScalar(.65+p*1.35);
    if(f.type==="float")rec.root.position.y=.15+p*.75;
    if(f.type==="banner")rec.root.position.y=.08+p*.20;
    if(f.type==="hit"||f.type==="brace"||f.type==="deflect")rec.root.rotation.y+=.15;
    if(f.type==="deathDust")rec.root.children.forEach((o,i)=>{o.position.x+=Math.cos(i*.8)*.01;o.position.z+=Math.sin(i*.8)*.01;o.position.y+=.006;});
    setFxOpacity(rec.root,Math.max(.05,t*.82));
  }
  fxMeshes.forEach(function(rec,id){if(!live.has(id)){scene.remove(rec.root);disposeFx(rec.root);fxMeshes.delete(id);}});
}
function updateAtmosphere(g,dt){
  const assault=g.time<60;
  const targetBg=new THREE.Color(assault?0x756b54:0x91a972);
  const targetFog=new THREE.Color(assault?0x8f795f:0xa9b98a);
  scene.background.lerp(targetBg,Math.min(1,dt*1.4));
  scene.fog.color.lerp(targetFog,Math.min(1,dt*1.4));
  sun.intensity=THREE.MathUtils.lerp(sun.intensity,assault?3.2:2.7,Math.min(1,dt*1.8));
  hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,assault?1.9:2.3,Math.min(1,dt*1.8));
  const targetY=assault?14.15:14.8,targetZ=assault?16.15:16.8;
  camera.position.y=THREE.MathUtils.lerp(camera.position.y,targetY,Math.min(1,dt*.8));
  camera.position.z=THREE.MathUtils.lerp(camera.position.z,targetZ,Math.min(1,dt*.8));
  camera.lookAt(0,.4,-.2);
}
function resize(){
  const w=Math.max(1,box.clientWidth),h=Math.max(1,box.clientHeight);
  renderer.setSize(w,h,false);camera.aspect=w/h;
  camera.fov=camera.aspect<1.15?46:(camera.aspect<1.42?40:34);
  camera.updateProjectionMatrix();
}
if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(box);else addEventListener('resize',resize);resize();

async function loadAssets(){
  const jobs=LOW_POWER
    ? [loadCharacter("King")]
    : [
        loadCharacter("Adventurer"),loadCharacter("Farmer"),loadCharacter("King"),loadHorse(),
        loadWeapon("Spear",1.55,"base"),loadWeapon("Bow_Wooden",1.10,"center"),loadWeapon("Sword",.82,"base"),
        loadWeapon("Shield_Round",.66,"center"),loadWeapon("Arrow",.58,"base"),
        ...["Barrel","Crate_Wooden","Bag","Stall_Empty","Stall_Cart_Empty","Chest_Wood","Coin_Pile","Banner_1","Banner_2","WeaponStand","Dummy","FarmCrate_Empty","Cauldron","Torch_Metal","Vase_2","Pot_1","Pouch_Large","Workbench","Anvil","Shield_Wooden","Bench"].map(loadProp)
      ];
  const results=await Promise.allSettled(jobs);
  const failed=results.filter(r=>r.status==="rejected");
  if(failed.length)console.warn("[History Royale 3D] 일부 에셋 로드 실패",failed.map(x=>x.reason));
}
function createAssaultFx(){
  const g=new THREE.Group();
  const ring=mesh(new THREE.RingGeometry(1.0,1.08,64),new THREE.MeshBasicMaterial({color:0xf0bd61,transparent:true,opacity:.70,side:THREE.DoubleSide,depthWrite:false}),0,.08,0);ring.rotation.x=-Math.PI/2;g.add(ring);
  const ring2=mesh(new THREE.RingGeometry(1.55,1.61,64),new THREE.MeshBasicMaterial({color:0xdc7858,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false}),0,.07,0);ring2.rotation.x=-Math.PI/2;g.add(ring2);
  const text=makeTextSprite("총공세","#ffe18b",1.45);text.position.y=1.45;g.add(text);
  g.position.set(0,0,0);scene.add(g);return {root:g,life:1.8,max:1.8};
}
function updateAssaultFx(dt){
  if(!assaultFx)return;assaultFx.life-=dt;
  const p=1-Math.max(0,assaultFx.life)/assaultFx.max,t=Math.max(0,assaultFx.life/assaultFx.max);
  assaultFx.root.scale.setScalar(.65+p*2.2);setFxOpacity(assaultFx.root,t*.82);
  if(assaultFx.life<=0){scene.remove(assaultFx.root);disposeFx(assaultFx.root);assaultFx=null;}
}
function clearBattleObjects(){
  unitMeshes.forEach(rec=>{
    if(rec.mixer){rec.mixer.stopAllAction();rec.mixer.uncacheRoot(rec.character||rec.root);mixers.delete(rec.mixer);}
    if(rec.horse?.mixer){rec.horse.mixer.stopAllAction();rec.horse.mixer.uncacheRoot(rec.horse.root);mixers.delete(rec.horse.mixer);}
    world.remove(rec.root);if(rec.disposable)disposeFx(rec.root);
  });unitMeshes.clear();
  buildingMeshes.forEach(rec=>{world.remove(rec.root);if(LOW_POWER)disposeFx(rec.root);});buildingMeshes.clear();
  towerMeshes.forEach(rec=>{world.remove(rec.root);if(LOW_POWER)disposeFx(rec.root);});towerMeshes.clear();
  projectileMeshes.forEach(m=>scene.remove(m));projectileMeshes.length=0;
  fxMeshes.forEach(rec=>{scene.remove(rec.root);disposeFx(rec.root);});fxMeshes.clear();
  mixers.clear();
  if(landmarkGroup){world.remove(landmarkGroup);if(LOW_POWER)disposeFx(landmarkGroup);landmarkGroup=null;}
  landmarkKey="";assaultAnnounced=false;if(assaultFx){scene.remove(assaultFx.root);disposeFx(assaultFx.root);assaultFx=null;}
  previewRing.visible=false;previewFill.visible=false;formationBand.visible=false;rangePreview.visible=false;
}
function initDebug(){
  if(!DEBUG_3D||debugEl)return;
  debugEl=document.createElement("div");
  debugEl.style.cssText="position:absolute;right:8px;top:42px;z-index:20;background:rgba(10,13,15,.82);color:#dff2df;padding:7px 9px;border:1px solid rgba(255,255,255,.18);border-radius:7px;font:700 11px/1.45 ui-monospace,monospace;pointer-events:none;white-space:pre";
  debugEl.textContent="3D 진단 준비";
  box.appendChild(debugEl);
}
function updateDebug(dt,g){
  if(!DEBUG_3D)return;
  initDebug();debugClock+=dt;debugFrames++;
  if(debugClock>=.5){
    debugFps=Math.round(debugFrames/debugClock);debugClock=0;debugFrames=0;
    const ri=renderer.info.render;
    debugEl.textContent=[
      `FPS ${debugFps} ${LOW_POWER?"LOW":"FULL"}`,
      `units ${g?.units?.length||0} / buildings ${g?.buildings?.length||0}`,
      `draw ${ri.calls} / triangles ${ri.triangles}`,
      `weapons ${weaponTemplates.size} / props ${propTemplates.size}`,
      `horse ${horseTemplate?"GLB":"fallback"}`
    ].join("\n");
  }
}
window.HistoryRoyale3DDebug=function(){
  const g=window.HistoryRoyaleState?.game;
  return {ready,lowPower:LOW_POWER,units:g?.units?.length||0,buildings:g?.buildings?.length||0,characters:characterTemplates.size,weapons:weaponTemplates.size,props:propTemplates.size,horse:!!horseTemplate,render:{...renderer.info.render}};
};
async function init(){
  state=window.HistoryRoyaleState||null;await loadAssets();if(!LOW_POWER)decorateWithProps();ready=true;window.HistoryRoyale3DReady=true;initDebug();
  window.HistoryRoyale3DStatus=`3D · 캐릭터 ${characterTemplates.size} · 무기 ${weaponTemplates.size} · 소품 ${propTemplates.size} · 말 ${horseTemplate?"실제 에셋":"대체"}${LOW_POWER?" · 모바일 초경량 모드":""}`;
  box.classList.add("three-ready");
  const ast=document.getElementById("assetStatus");if(ast)ast.textContent=window.HistoryRoyale3DStatus;
}
function use2DFallback(err,phase){
  if(runtimeFailed)return;runtimeFailed=true;ready=false;window.HistoryRoyale3DReady=false;
  box.classList.remove("three-ready");
  const ast=document.getElementById("assetStatus");if(ast)ast.textContent="2D 안정 모드";
  console.warn("[History Royale 3D] "+phase+" fallback to 2D",err);
}
function loop(now){
  requestAnimationFrame(loop);if(runtimeFailed)return;
  try{
    const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
    state=window.HistoryRoyaleState||state;const g=state&&state.game;updateDebug(dt,g);
    if(document.hidden||!g||!g.running)return;
    mixers.forEach(function(m){m.update(dt);});riverPhase+=dt;if(riverMesh){riverMesh.position.y=.018+Math.sin(riverPhase*1.7)*.008;riverMesh.material.opacity=.91+Math.sin(riverPhase*1.2)*.025;}
    if(g!==currentGameRef){clearBattleObjects();currentGameRef=g;}
    if(ready&&g&&g.running){
      updateAtmosphere(g,dt);
      if(g.time<60&&!assaultAnnounced){assaultAnnounced=true;assaultFx=createAssaultFx();}
      updateAssaultFx(dt);syncFactionLandmarks(g);syncTowers(g);syncBuildings(g);syncUnits(g);syncProjectiles(g);syncFx(g);syncPreview(g);
    }
    else{previewRing.visible=false;previewFill.visible=false;formationBand.visible=false;rangePreview.visible=false;}
    renderer.render(scene,camera);
  }catch(err){use2DFallback(err,"runtime");}
}
requestAnimationFrame(loop);
init().catch(function(err){use2DFallback(err,"init");});
} catch (err) {
  window.HistoryRoyale3DReady=false;
  const fallbackBox=document.getElementById("canvasBox");fallbackBox?.classList?.remove("three-ready");
  const ast=document.getElementById("assetStatus");if(ast)ast.textContent="2D 안정 모드";
  console.warn("[History Royale 3D] boot fallback to 2D",err);
}
