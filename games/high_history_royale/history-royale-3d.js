import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const canvas=document.getElementById("game3d");
const box=document.getElementById("canvasBox");
if(!canvas||!box)throw new Error("History Royale 3D canvas not found.");

const ASSET_ROOT="../../assets/game/history_royale/source_cc0/";
const CHAR_ROOT=ASSET_ROOT+"quaternius_modular_males/gltf/";
const PROP_ROOT=ASSET_ROOT+"quaternius_fantasy_props/gltf/";
const WEAPON_ROOT=ASSET_ROOT+"quaternius_medieval_weapons/fbx/";
const loader=new GLTFLoader();
const fbxLoader=new FBXLoader();

const characterTemplates=new Map();
const propTemplates=new Map();
const weaponTemplates=new Map();
const unitMeshes=new Map();
const buildingMeshes=new Map();
const towerMeshes=new Map();
const mixers=new Set();
const projectileMeshes=[];

let state=null;
let lastTime=performance.now();
let ready=false;
let riverMesh=null;
let riverPhase=0;

const renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x91a972,1);
renderer.shadowMap.enabled=innerWidth>760;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<760?1.25:1.6));

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
  g.add(mesh(new THREE.BoxGeometry(baseW,king?1.12:.88,baseD),mat(king?0x8b8170:0x837967),0,king?.56:.44,0));
  g.add(mesh(new THREE.BoxGeometry(baseW*.78,.42,baseD*.78),mat(0xa78255),0,king?1.23:1.00,0));
  const r1=roofMesh(baseW*1.03,baseD*1.15,roof);r1.position.y=king?1.54:1.29;g.add(r1);
  if(king){
    g.add(mesh(new THREE.BoxGeometry(baseW*.48,.38,baseD*.48),mat(0xa78255),0,1.80,0));
    const r2=roofMesh(baseW*.67,baseD*.72,roof);r2.position.y=2.11;g.add(r2);
  }
  g.add(mesh(new THREE.BoxGeometry(.35,.54,.08),mat(0x33271f),0,.28,baseD/2+.045));
  g.add(mesh(new THREE.CylinderGeometry(.025,.025,.85,6),mat(0x4a3828),0,king?2.64:1.92,0));
  const flag=mesh(new THREE.PlaneGeometry(.55,.28),new THREE.MeshBasicMaterial({color:fc,side:THREE.DoubleSide}),.29,king?2.82:2.10,0);
  flag.rotation.y=Math.PI/2;g.add(flag);
  return g;
}
function makeHorse(color){
  const g=new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(.72,.44,1.18),mat(color),0,.64,0));
  const neck=mesh(new THREE.BoxGeometry(.28,.6,.28),mat(color),0,.92,-.48);neck.rotation.x=-.35;g.add(neck);
  g.add(mesh(new THREE.BoxGeometry(.34,.30,.48),mat(color),0,1.16,-.72));
  [-.25,.25].forEach(function(x){[-.38,.38].forEach(function(z){g.add(mesh(new THREE.CylinderGeometry(.065,.055,.62,6),mat(color),x,.30,z));});});
  return g;
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
  if(u.cls==="기병")g.add(makeHorse(0x76533b));
  g.add(mesh(new THREE.CylinderGeometry(.18,.22,.72,8),mat(fc),0,.55+raise,0));
  g.add(mesh(new THREE.SphereGeometry(.16,10,8),mat(0xd4aa7d),0,1.03+raise,0));
  const weapon=makeProceduralWeapon(u.cls,fc);weapon.position.y=raise;g.add(weapon);
  if(u.hero){
    const halo=mesh(new THREE.TorusGeometry(.32,.035,6,20),new THREE.MeshBasicMaterial({color:0xf1ce69}),0,1.40+raise,0);
    halo.rotation.x=Math.PI/2;g.add(halo);
  }
  const health=createHealthBar(u.hero?1.00:.72,1.60+raise);g.add(health);return {root:g,mixer:null,clips:[],anim:null,health:health};
}
function pickCharacter(u){
  if(u.hero)return "King";
  if(u.cls==="궁병")return "Farmer";
  return "Adventurer";
}
function createAnimatedUnit(u,fid){
  const tpl=characterTemplates.get(pickCharacter(u));
  if(!tpl)return makeFallbackUnit(u,fid);
  const holder=new THREE.Group();
  const character=SkeletonUtils.clone(tpl.scene);
  cloneMaterialTint(character,factionColor(fid));
  if(u.cls==="기병"){
    holder.add(makeHorse(0x74513a));
    character.position.y=.83;
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
  const health=createHealthBar(u.hero?1.00:.72,u.cls==="기병"?1.98:(u.hero?1.75:1.48));holder.add(health);return {root:holder,mixer:mixer,clips:tpl.animations,anim:null,character:character,health:health};
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
function createHealthBar(width=.86,y=1.55){
  const group=new THREE.Group();
  group.position.y=y;
  const bg=mesh(new THREE.PlaneGeometry(width,.075),new THREE.MeshBasicMaterial({color:0x241d18,transparent:true,opacity:.82,depthTest:false}),0,0,0);
  const fill=mesh(new THREE.PlaneGeometry(width*.94,.046),new THREE.MeshBasicMaterial({color:0x70c875,depthTest:false}),0,0,.003);
  group.add(bg,fill);group.userData.fill=fill;group.renderOrder=20;return group;
}
function updateHealthBar(bar,ratio,team){
  if(!bar)return;ratio=THREE.MathUtils.clamp(ratio,0,1);
  const fill=bar.userData.fill;if(fill){fill.scale.x=Math.max(.001,ratio);fill.position.x=-(1-ratio)*.40;fill.material.color.setHex(ratio<.28?0xd55245:(team==="player"?0x65b8e5:0xe27668));}
  bar.quaternion.copy(camera.quaternion);
}
function setHitFlash(root,on){
  root.traverse(function(o){if(!o.isMesh||!o.material)return;const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(function(m){if(m&&m.emissive)m.emissive.setHex(on?0x3b0e08:0x000000);});});
}
function createTower(t,g){
  const fid=t.team==="player"?g.playerFaction:g.enemyFaction,root=makeFortress(fid,!!t.king),p=canvasToWorld(t.x,t.y);
  root.position.copy(p);root.position.y=.02;if(t.team==="enemy")root.rotation.y=Math.PI;const health=createHealthBar(t.king?1.35:1.05,t.king?3.18:2.35);root.add(health);world.add(root);return {root:root,health:health};
}
function createBuilding(b,g){
  const fid=b.team==="player"?g.playerFaction:g.enemyFaction,root=buildingBase(b,fid),p=canvasToWorld(b.x,b.y);
  root.position.copy(p);if(b.team==="enemy")root.rotation.y=Math.PI;const health=createHealthBar(.92,1.78);root.add(health);world.add(root);return {root:root,health:health};
}
function syncTowers(g){
  const live=new Set();
  g.towers.forEach(function(t){
    live.add(t.id);let rec=towerMeshes.get(t.id);
    if(!rec){rec=createTower(t,g);towerMeshes.set(t.id,rec);}
    const p=canvasToWorld(t.x,t.y);rec.root.position.x=p.x;rec.root.position.z=p.z;
    updateHealthBar(rec.health,t.hp/t.maxHp,t.team);setHitFlash(rec.root,t.damageFlash>0);if(t.dead){rec.root.rotation.z=.18;rec.root.position.y=-.28;}
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
    const life=b.maxLifetime?Math.max(.78,b.lifetime/b.maxLifetime):1;rec.root.scale.setScalar(.92+.08*life);updateHealthBar(rec.health,b.hp/b.maxHp,b.team);setHitFlash(rec.root,b.hitTimer>0);
    if(b.dead){rec.root.rotation.z=.22;rec.root.position.y=-.18;}
  });
  buildingMeshes.forEach(function(rec,id){if(!live.has(id)){world.remove(rec.root);buildingMeshes.delete(id);}});
}
function syncUnits(g){
  const live=new Set();
  g.units.forEach(function(u){
    live.add(u.id);let rec=unitMeshes.get(u.id);
    if(!rec){const fid=u.team==="player"?g.playerFaction:g.enemyFaction;rec=createAnimatedUnit(u,fid);world.add(rec.root);unitMeshes.set(u.id,rec);}
    const p=canvasToWorld(u.x,u.y);rec.root.position.x=p.x;rec.root.position.z=p.z;rec.root.position.y=u.spawnTimer>0?Math.max(0,.18-u.spawnTimer*.35):0;
    if(u.target&&u.target.x!=null){const q=canvasToWorld(u.target.x,u.target.y);rec.root.rotation.y=Math.atan2(q.x-p.x,q.z-p.z)+Math.PI;}
    else rec.root.rotation.y=u.team==="player"?Math.PI:0;
    setAnimation(rec,animName(u));const spawnScale=u.spawnTimer>0?THREE.MathUtils.clamp(1-u.spawnTimer/.42,.25,1):1;rec.root.scale.setScalar((u.hero?1.12:1)*spawnScale);updateHealthBar(rec.health,u.hp/u.maxHp,u.team);setHitFlash(rec.root,u.hitTimer>0);
  });
  unitMeshes.forEach(function(rec,id){if(!live.has(id)){if(rec.mixer)mixers.delete(rec.mixer);world.remove(rec.root);unitMeshes.delete(id);}});
}
function createProjectileMesh(){
  const arrow=cloneWeaponAsset("Arrow");
  if(arrow){arrow.scale.multiplyScalar(.72);scene.add(arrow);return arrow;}
  const p=mesh(new THREE.CylinderGeometry(.025,.025,.55,5),mat(0xd7c79c,.5,.15),0,.7,0);p.rotation.x=Math.PI/2;scene.add(p);return p;
}
function syncProjectiles(g){
  while(projectileMeshes.length<g.projectiles.length)projectileMeshes.push(createProjectileMesh());
  projectileMeshes.forEach(function(m,i){
    const p=g.projectiles[i];m.visible=!!p;if(!p)return;
    const q=canvasToWorld(p.x,p.y);m.position.set(q.x,.82,q.z);
    if(p.target){const tq=canvasToWorld(p.target.x,p.target.y),dir=tq.clone().sub(q);m.rotation.y=Math.atan2(dir.x,dir.z);m.rotation.z=-.08;}
  });
}
function syncPreview(g){
  const card=g.selectedIndex>=0?g.pHand[g.selectedIndex]:null,p=g.pointer;
  if(!card||!p||!p.inside){previewRing.visible=false;previewFill.visible=false;return;}
  const q=canvasToWorld(p.x,p.y);previewRing.visible=true;previewFill.visible=true;
  previewRing.position.x=previewFill.position.x=q.x;previewRing.position.z=previewFill.position.z=q.z;
  const rule=g.placementRule(card,"player",p.x,p.y),color=rule.ok?0x84e39c:0xe85b50;
  previewRing.material.color.setHex(color);previewFill.material.color.setHex(color);
  const radius=card.kind==="spell"?(card.id==="cavalry_charge"?4.4:3.7):(card.kind==="building"?.78:.58);
  previewRing.scale.setScalar(radius/.5);previewFill.scale.setScalar(radius/.5);
}
function resize(){
  const w=Math.max(1,box.clientWidth),h=Math.max(1,box.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(box);resize();

async function loadAssets(){
  const jobs=[
    loadCharacter("Adventurer"),loadCharacter("Farmer"),loadCharacter("King"),
    loadWeapon("Spear",1.55,"base"),loadWeapon("Bow_Wooden",1.10,"center"),loadWeapon("Sword",.82,"base"),
    loadWeapon("Shield_Round",.66,"center"),loadWeapon("Arrow",.58,"base"),
    ...["Barrel","Crate_Wooden","Bag","Stall_Empty","Chest_Wood","Banner_1","Banner_2","WeaponStand","Dummy","FarmCrate_Empty","Cauldron","Torch_Metal","Vase_2","Pot_1","Pouch_Large","Workbench","Anvil","Shield_Wooden"].map(loadProp)
  ];
  const results=await Promise.allSettled(jobs);
  const failed=results.filter(r=>r.status==="rejected");
  if(failed.length)console.warn("[History Royale 3D] 일부 에셋 로드 실패",failed.map(x=>x.reason));
}
async function init(){
  state=window.HistoryRoyaleState||null;await loadAssets();decorateWithProps();ready=true;window.HistoryRoyale3DReady=true;box.classList.add("three-ready");
  const ast=document.getElementById("assetStatus");if(ast)ast.textContent=`3D · 캐릭터 ${characterTemplates.size} · 무기 ${weaponTemplates.size} · 소품 ${propTemplates.size}`;
}
function loop(now){
  requestAnimationFrame(loop);const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;mixers.forEach(function(m){m.update(dt);});riverPhase+=dt;if(riverMesh){riverMesh.position.y=.018+Math.sin(riverPhase*1.7)*.008;riverMesh.material.opacity=.91+Math.sin(riverPhase*1.2)*.025;}
  state=window.HistoryRoyaleState||state;const g=state&&state.game;
  if(ready&&g&&g.running){syncTowers(g);syncBuildings(g);syncUnits(g);syncProjectiles(g);syncPreview(g);}
  else{previewRing.visible=false;previewFill.visible=false;}
  renderer.render(scene,camera);
}
requestAnimationFrame(loop);
init().catch(function(err){
  console.error("[History Royale 3D] fallback to 2D",err);window.HistoryRoyale3DReady=false;box.classList.remove("three-ready");
  const ast=document.getElementById("assetStatus");if(ast)ast.textContent="2D 폴백 · 3D 로드 실패";
});
