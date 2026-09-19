import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const canvas=document.getElementById('city3d');
const shell=document.getElementById('boardShell');
if(!canvas||!shell)throw new Error('한붓쓱 3D 도시 캔버스를 찾지 못했습니다.');

const ROOT=new URL('./assets/game/',import.meta.url);
const SUBURBAN=new URL('3d/city/kenney-city-kit-suburban/',ROOT).href;
const ROADS=new URL('3d/city/kenney-city-kit-roads/',ROOT).href;
const NATURE=new URL('3d/nature/kenney-nature-kit/',ROOT).href;
const CARS=new URL('3d/vehicles/kenney-car-kit/',ROOT).href;

const MODEL={
  buildingA:SUBURBAN+'building-type-a.glb',
  buildingB:SUBURBAN+'building-type-b.glb',
  buildingC:SUBURBAN+'building-type-c.glb',
  buildingD:SUBURBAN+'building-type-d.glb',
  buildingE:SUBURBAN+'building-type-e.glb',
  buildingF:SUBURBAN+'building-type-f.glb',
  buildingG:SUBURBAN+'building-type-g.glb',
  buildingH:SUBURBAN+'building-type-h.glb',
  buildingI:SUBURBAN+'building-type-i.glb',
  tree:NATURE+'tree-default.glb',
  oak:NATURE+'tree-oak.glb',
  pine:NATURE+'tree-pine-round-a.glb',
  sedan:CARS+'sedan.glb',
  suv:CARS+'suv.glb',
  taxi:CARS+'taxi.glb',
  lamp:ROADS+'light-square.glb',
  cone:ROADS+'construction-cone.glb'
};

const THEME=[
  null,
  {ground:0xcfe0c7,lot:0xdce7d5},
  {ground:0xd8ddca,lot:0xe5dfca},
  {ground:0xcadfc0,lot:0xd8e8cf},
  {ground:0xd1d7db,lot:0xdfe3e6},
  {ground:0x20343b,lot:0x2b4148}
];

const ROOF={
  home:[0xb9684d,0xc98253,0x915d4a,0x7b7450,0xa85f48],
  shop:[0x4e7f88,0x486c86,0x9b6150,0x59656f,0x3f7377],
  cafe:[0xa66858,0x6b7c89,0x507b73,0x8f684d],
  school:[0x536d85,0x6f8294,0x475e73,0x7f7566],
  apartment:[0x5f6872,0x727d87,0x4d5863,0x68747e],
  hub:[0x4f72a8,0x4c7a68,0x666d78,0x8f654d],
  civic:[0x596f7d,0x73858d,0x5d646b,0x736c62]
};
function roofRole(role){
  if(role==='shop')return'shop';
  if(role==='cafe')return'cafe';
  if(role==='school')return'school';
  if(role==='apartment')return'apartment';
  if(role==='hub')return'hub';
  if(role==='park')return'civic';
  return'home';
}
function roofColor(role,variant=0,stage=1){
  const arr=ROOF[role]||ROOF.home;
  return arr[(variant+stage*2)%arr.length];
}
function tintMaterial(mat,color,strength=.82){
  const m=mat.clone();
  if(m.color)m.color.lerp(new THREE.Color(color),strength);
  m.needsUpdate=true;
  return m;
}
function tintRoof(obj,color){
  if(!obj||color==null)return obj;
  obj.updateMatrixWorld(true);
  const rootBox=new THREE.Box3().setFromObject(obj),size=rootBox.getSize(new THREE.Vector3());
  const threshold=rootBox.min.y+size.y*.56;
  const meshes=[];
  obj.traverse(o=>{if(o.isMesh&&o.material)meshes.push(o)});
  let matched=false;
  for(const mesh of meshes){
    const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const names=(mesh.name+' '+mats.map(m=>m.name||'').join(' ')).toLowerCase();
    if(/roof|top|awning|canopy|shingle|tile/.test(names)){
      const next=mats.map(m=>tintMaterial(m,color,.88));
      mesh.material=Array.isArray(mesh.material)?next:next[0];
      matched=true;
    }
  }
  if(matched)return obj;

  // Kenney GLBs do not all expose semantic material names.
  // In those models, tint only meshes that live mostly in the upper half.
  let upper=0;
  for(const mesh of meshes){
    const b=new THREE.Box3().setFromObject(mesh),center=b.getCenter(new THREE.Vector3());
    if(center.y>=threshold){
      const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      const next=mats.map(m=>tintMaterial(m,color,.76));
      mesh.material=Array.isArray(mesh.material)?next:next[0];
      upper++;
    }
  }
  // Last-resort fallback for a one-mesh building: keep original shading and use a mild tint.
  if(!upper&&meshes.length===1){
    const mesh=meshes[0],mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const next=mats.map(m=>tintMaterial(m,color,.34));
    mesh.material=Array.isArray(mesh.material)?next:next[0];
  }
  return obj;
}

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,300);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight(0xf7fbff,0x667d64,2.18));
const sun=new THREE.DirectionalLight(0xfff3d7,3.35);
sun.position.set(-36,65,32);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;
scene.add(sun);
const fill=new THREE.DirectionalLight(0xaedcff,.65);fill.position.set(42,22,-28);scene.add(fill);

const world=new THREE.Group(),groundGroup=new THREE.Group(),cityGroup=new THREE.Group();
world.add(groundGroup,cityGroup);scene.add(world);

const loader=new GLTFLoader();
const models=new Map();
let currentLayout=null,buildSerial=0,lastW=0,lastH=0;

function clearGroup(g){while(g.children.length){const o=g.children.pop();o.parent=null}}
function loadModel(key,url){
  return new Promise(resolve=>loader.load(url,g=>{
    g.scene.traverse(o=>{if(o.isMesh&&o.material){o.castShadow=true;o.receiveShadow=true;const list=Array.isArray(o.material)?o.material:[o.material];const copied=list.map(m=>{const n=m.clone();n.roughness=Math.max(.45,n.roughness??.7);n.metalness=Math.min(.18,n.metalness??0);return n});o.material=Array.isArray(o.material)?copied:copied[0]}});
    models.set(key,g.scene);resolve(true);
  },undefined,err=>{console.warn('[한붓쓱 3D] asset fallback',key,err);resolve(false)}));
}
function clone(key){return models.get(key)?.clone(true)||null}
function normalize(obj,{footprint=3,height=null}={}){
  obj.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3());
  let scale=1;
  if(height!=null)scale=height/Math.max(.001,s.y);
  else scale=footprint/Math.max(.001,s.x,s.z);
  obj.scale.multiplyScalar(scale);obj.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(obj);
  const center=b.getCenter(new THREE.Vector3());obj.position.x-=center.x;obj.position.z-=center.z;obj.position.y-=b.min.y;
  return obj;
}

function configureCamera(w,h){
  const aspect=w/Math.max(1,h),vertical=69;
  camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;
  camera.position.set(11,76,58);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
function screenToGround(x,y,w,h){
  const nx=x/w*2-1,ny=-(y/h)*2+1;
  const origin=new THREE.Vector3(nx,ny,-1).unproject(camera);
  const end=new THREE.Vector3(nx,ny,1).unproject(camera);
  const dir=end.sub(origin).normalize();
  const t=(0-origin.y)/dir.y;
  return origin.add(dir.multiplyScalar(t));
}
function pixelRadiusToWorld(x,y,r,w,h){
  const a=screenToGround(x,y,w,h),b=screenToGround(Math.min(w,x+r),y,w,h);
  return Math.max(.5,a.distanceTo(b));
}
function addLot(x,z,r,theme,variant=0){
  const geom=new THREE.BoxGeometry(r*2.35,.11,r*1.82);
  const colors=[theme.lot,theme.lot,theme.ground];
  const mat=new THREE.MeshStandardMaterial({color:colors[variant%colors.length],roughness:.96});
  const lot=new THREE.Mesh(geom,mat);lot.position.set(x,-.055,z);lot.receiveShadow=true;groundGroup.add(lot);
}
function addObject(key,x,z,{size=3,height=null,rot=0,y=.01,roof=null}={}){
  const obj=clone(key);if(!obj)return null;
  normalize(obj,{footprint:size,height});
  if(roof!=null&&key.startsWith('building'))tintRoof(obj,roof);
  obj.position.set(x,y,z);obj.rotation.y=rot;cityGroup.add(obj);return obj;
}
function addTreeCluster(x,z,r,variant){
  const keys=['tree','oak','pine'];const k1=keys[variant%3],k2=keys[(variant+1)%3],k3=keys[(variant+2)%3];
  addObject(k1,x-r*.3,z-r*.05,{size:r*1.48,rot:(variant%4)*.7});
  addObject(k2,x+r*.38,z+r*.12,{size:r*1.08,rot:((variant+2)%4)*.8});
  if(r>1.25)addObject(k3,x+r*.06,z-r*.42,{size:r*.82,rot:((variant+1)%4)*.9});
}
function landmarkKey(role,variant){
  if(role==='hub')return'buildingF';
  if(role==='goal'||role==='home')return variant%2?'buildingA':'buildingG';
  if(role==='shop')return'buildingB';
  if(role==='cafe')return'buildingD';
  if(role==='school')return variant%2?'buildingH':'buildingF';
  if(role==='apartment')return variant%2?'buildingE':'buildingI';
  return ['buildingA','buildingC','buildingG'][variant%3];
}
function decorBuildingKey(variant){
  return ['buildingA','buildingG','buildingC','buildingE','buildingI','buildingB','buildingD'][variant%7];
}
function carKey(variant){return['sedan','suv','taxi'][variant%3]}

function addLandmark(l,w,h,theme){
  const p=screenToGround(l.x,l.y,w,h),r=pixelRadiusToWorld(l.x,l.y,l.r,w,h);
  if(l.role==='park'){
    addLot(p.x,p.z,r*1.42,theme,2);addTreeCluster(p.x-r*.18,p.z,r*1.18,l.variant);
    addTreeCluster(p.x+r*.48,p.z-r*.22,r*.7,l.variant+2);addObject('lamp',p.x-r*.72,p.z+r*.5,{size:r*.42});return;
  }
  addLot(p.x,p.z,r*1.42,theme,l.variant);
  const key=landmarkKey(l.role,l.variant);
  const size=r*(l.role==='apartment'?3.55:(l.role==='school'||l.role==='hub'?3.25:3.05));
  const roof=roofColor(roofRole(l.role),l.variant,currentLayout?.stageNum||1);
  addObject(key,p.x,p.z,{size,rot:(l.variant%4)*Math.PI/2,roof});
  if(l.role==='hub'){
    addObject('taxi',p.x+r*.86,p.z+r*.58,{size:r*.92,rot:Math.PI/2});
    addObject('lamp',p.x-r*.92,p.z+r*.56,{size:r*.46});
    addObject('cone',p.x+r*.98,p.z-r*.32,{size:r*.28});
  }else if(l.role==='school'){
    addObject('suv',p.x+r*.9,p.z+r*.62,{size:r*.96,rot:Math.PI/2});
    addObject('lamp',p.x-r*.88,p.z+r*.5,{size:r*.45});
  }else if(l.role==='goal'||l.role==='home'){
    addObject('lamp',p.x-r*.9,p.z+r*.48,{size:r*.43});
    addTreeCluster(p.x+r*.82,p.z+r*.42,r*.42,l.variant);
  }else if(l.role==='shop'||l.role==='cafe'){
    addObject('lamp',p.x+r*.9,p.z+r*.48,{size:r*.43});
    addObject(l.variant%2?'sedan':'taxi',p.x-r*.92,p.z+r*.58,{size:r*.78,rot:Math.PI/2});
  }
}
function addDecor(o,w,h,theme){
  const p=screenToGround(o.x,o.y,w,h),r=pixelRadiusToWorld(o.x,o.y,o.r,w,h);
  if(o.kind==='building'){
    const lotScale=o.district?1.36:1.24;
    addLot(p.x,p.z,r*lotScale,theme,o.variant);
    const scale=o.district?3.0:2.82;
    const roles=o.edgeId!=null?['home','home','shop','cafe','home','apartment']:['home','apartment','home','civic'];
    const role=roles[(o.variant+(o.district?2:0))%roles.length];
    const roof=roofColor(role,o.variant,currentLayout?.stageNum||1);
    addObject(decorBuildingKey(o.variant),p.x,p.z,{size:r*scale,rot:o.rot||0,roof});
    // Road-facing blocks get a small side prop so they read as occupied streets.
    if(o.edgeId!=null){
      const side=o.roadSide||1;
      if(o.variant%3===0)addObject('lamp',p.x+r*.92*side,p.z+r*.38,{size:r*.38});
      if(o.variant%4===1)addObject(carKey(o.variant),p.x-r*.88*side,p.z+r*.52,{size:r*.72,rot:o.rot||0});
    }
    return;
  }
  if(o.kind==='treeCluster'){
    addLot(p.x,p.z,r*1.18,theme,2);addTreeCluster(p.x,p.z,r*1.06,o.variant);return;
  }
  if(o.kind==='parking'){
    addLot(p.x,p.z,r*1.32,{...theme,lot:0xaeb7b3},0);
    addObject(carKey(o.variant),p.x-r*.34,p.z,{size:r*1.82,rot:o.rot||0});
    if(r>1.1)addObject(carKey(o.variant+1),p.x+r*.46,p.z+r*.12,{size:r*1.55,rot:o.rot||0});
    addObject('lamp',p.x+r*.84,p.z+r*.48,{size:r*.38});return;
  }
  if(o.kind==='plaza'){
    addLot(p.x,p.z,r*1.28,{...theme,lot:0xd7d0ba},0);
    addTreeCluster(p.x-r*.26,p.z,r*.72,o.variant);
    addObject('lamp',p.x+r*.66,p.z+r*.26,{size:r*.36});
    if(o.variant%2===0)addObject('cone',p.x+r*.2,p.z-r*.54,{size:r*.27});return;
  }
  if(o.kind==='car'){addObject(carKey(o.variant),p.x,p.z,{size:r*2.05,rot:o.rot||0});return}
  if(o.kind==='light'){addObject('lamp',p.x,p.z,{size:r*.96});return}
  if(o.kind==='cone'){addObject('cone',p.x,p.z,{size:r*1.04,rot:o.rot||0});return}
}

function addGround(w,h,theme){
  clearGroup(groundGroup);
  const corners=[
    screenToGround(0,0,w,h),screenToGround(w,0,w,h),
    screenToGround(0,h,w,h),screenToGround(w,h,w,h)
  ];
  const minX=Math.min(...corners.map(p=>p.x))-5,maxX=Math.max(...corners.map(p=>p.x))+5;
  const minZ=Math.min(...corners.map(p=>p.z))-6,maxZ=Math.max(...corners.map(p=>p.z))+6;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(maxX-minX,maxZ-minZ),new THREE.MeshStandardMaterial({color:theme.ground,roughness:1}));
  plane.rotation.x=-Math.PI/2;plane.position.set((minX+maxX)/2,-.13,(minZ+maxZ)/2);plane.receiveShadow=true;groundGroup.add(plane);
}

async function rebuild(layout){
  if(!layout||!models.size)return;
  const serial=++buildSerial,w=layout.w,h=layout.h;
  if(w<10||h<10)return;
  configureCamera(w,h);
  const theme=THEME[layout.theme]||THEME[1];
  scene.background=new THREE.Color(theme.ground);
  addGround(w,h,theme);clearGroup(cityGroup);

  // Landmarks are always full-size; background blocks remain smaller so roads stay readable.
  for(const l of layout.landmarks||[])addLandmark(l,w,h,theme);
  for(const o of layout.decor||[])addDecor(o,w,h,theme);
  if(serial!==buildSerial)return;
  renderer.render(scene,camera);
  if(!window.__oneStroke3DReady){
    window.__oneStroke3DReady=true;
    window.dispatchEvent(new Event('one-stroke-3d-ready'));
  }
}
function resize(){
  const r=shell.getBoundingClientRect();if(!r.width||!r.height)return;
  const w=Math.round(r.width),h=Math.round(r.height);
  renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setSize(w,h,false);configureCamera(w,h);
  lastW=w;lastH=h;
  if(currentLayout){
    const next={...currentLayout,w,h};
    currentLayout=next;rebuild(next);
  }else renderer.render(scene,camera);
}

const assetEntries=Object.entries(MODEL);
await Promise.all(assetEntries.map(([k,u])=>loadModel(k,u)));
resize();
if(window.__oneStrokeCityLayout){currentLayout=window.__oneStrokeCityLayout;rebuild(currentLayout)}
window.addEventListener('one-stroke-city-layout',e=>{currentLayout=e.detail;rebuild(currentLayout)});
new ResizeObserver(()=>resize()).observe(shell);

