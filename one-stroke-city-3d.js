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

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,300);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

scene.add(new THREE.HemisphereLight(0xf7fbff,0x718a6f,2.0));
const sun=new THREE.DirectionalLight(0xfff3d7,3.0);
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
  const aspect=w/Math.max(1,h),vertical=72;
  camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;
  camera.position.set(0,82,48);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
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
  const geom=new THREE.BoxGeometry(r*2.05,.11,r*1.55);
  const colors=[theme.lot,theme.lot,theme.ground];
  const mat=new THREE.MeshStandardMaterial({color:colors[variant%colors.length],roughness:.96});
  const lot=new THREE.Mesh(geom,mat);lot.position.set(x,-.055,z);lot.receiveShadow=true;groundGroup.add(lot);
}
function addObject(key,x,z,{size=3,height=null,rot=0,y=.01}={}){
  const obj=clone(key);if(!obj)return null;normalize(obj,{footprint:size,height});obj.position.set(x,y,z);obj.rotation.y=rot;cityGroup.add(obj);return obj;
}
function addTreeCluster(x,z,r,variant){
  const keys=['tree','oak','pine'];const k1=keys[variant%3],k2=keys[(variant+1)%3];
  addObject(k1,x-r*.28,z,{size:r*1.25,rot:(variant%4)*.7});
  addObject(k2,x+r*.35,z+r*.12,{size:r*.9,rot:((variant+2)%4)*.8});
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
  if(l.role==='park'){addLot(p.x,p.z,r*1.08,theme,2);addTreeCluster(p.x,p.z,r*.95,l.variant);return}
  addLot(p.x,p.z,r*1.05,theme,l.variant);
  const key=landmarkKey(l.role,l.variant);
  addObject(key,p.x,p.z,{size:r*2.15,rot:(l.variant%4)*Math.PI/2});
  if(l.role==='hub'){addObject('taxi',p.x+r*.65,p.z+r*.42,{size:r*.65,rot:Math.PI/2});addObject('lamp',p.x-r*.72,p.z+r*.4,{size:r*.36})}
  else if(l.role==='school'){addObject('suv',p.x+r*.72,p.z+r*.46,{size:r*.72,rot:Math.PI/2});addObject('lamp',p.x-r*.7,p.z+r*.38,{size:r*.35})}
  else if(l.role==='goal'||l.role==='home'){addObject('lamp',p.x-r*.72,p.z+r*.36,{size:r*.34})}
  else if(l.role==='shop'||l.role==='cafe'){addObject('lamp',p.x+r*.72,p.z+r*.36,{size:r*.34})}
}
function addDecor(o,w,h,theme){
  const p=screenToGround(o.x,o.y,w,h),r=pixelRadiusToWorld(o.x,o.y,o.r,w,h);
  if(o.kind==='building'){
    addLot(p.x,p.z,r*1.05,theme,o.variant);addObject(decorBuildingKey(o.variant),p.x,p.z,{size:r*2.0,rot:o.rot||0});return;
  }
  if(o.kind==='treeCluster'){addLot(p.x,p.z,r*.95,theme,2);addTreeCluster(p.x,p.z,r*.85,o.variant);return}
  if(o.kind==='parking'){
    addLot(p.x,p.z,r*1.1,{...theme,lot:0xaeb7b3},0);
    addObject(carKey(o.variant),p.x,p.z,{size:r*1.45,rot:o.rot||0});
    if(o.variant%2===0)addObject('lamp',p.x+r*.72,p.z+r*.42,{size:r*.32});return;
  }
  if(o.kind==='plaza'){
    addLot(p.x,p.z,r*1.08,{...theme,lot:0xd7d0ba},0);
    addObject('tree',p.x-r*.35,p.z,{size:r*.8,rot:o.rot||0});
    addObject('lamp',p.x+r*.5,p.z+r*.15,{size:r*.3});return;
  }
  if(o.kind==='car'){addObject(carKey(o.variant),p.x,p.z,{size:r*1.7,rot:o.rot||0});return}
  if(o.kind==='light'){addObject('lamp',p.x,p.z,{size:r*.75});return}
  if(o.kind==='cone'){addObject('cone',p.x,p.z,{size:r*.85,rot:o.rot||0});return}
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
  configureCamera(w,h);addGround(w,h,THEME[layout.theme]||THEME[1]);clearGroup(cityGroup);
  const theme=THEME[layout.theme]||THEME[1];

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

function animate(){
  requestAnimationFrame(animate);
  if(!currentLayout)return;
  // Static city, but render continuously at low visual cost so CSS/layout changes stay smooth.
  renderer.render(scene,camera);
}
animate();
