import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const bridge=window.Q17Field3DBridge;
if(!bridge)throw new Error('Q17 field bridge is unavailable');

const ROOT=new URL('../../assets/game/',import.meta.url);
const A={
 tent:'3d/nature/kenney-nature-kit/tent-detailed-open.glb',
 tentSmall:'3d/nature/kenney-nature-kit/tent-small-open.glb',
 bed:'3d/interiors/kenney-furniture-kit/bed-single.glb',
 desk:'3d/interiors/kenney-furniture-kit/desk.glb',
 radio:'3d/interiors/kenney-furniture-kit/radio.glb',
 laptop:'3d/interiors/kenney-furniture-kit/laptop.glb',
 trashcan:'3d/interiors/kenney-furniture-kit/trashcan.glb',
 structureMetal:'3d/survival/kenney-survival-kit/structure-metal.glb',
 structureCanvas:'3d/survival/kenney-survival-kit/structure-canvas.glb',
 fortifiedFence:'3d/survival/kenney-survival-kit/fence-fortified.glb',
 boxLarge:'3d/survival/kenney-survival-kit/box-large.glb',
 barrel:'3d/survival/kenney-survival-kit/barrel.glb',
 fence:'3d/city/kenney-city-kit-roads/construction-fence.glb',
 light:'3d/city/kenney-city-kit-roads/construction-light.glb',
 barrier:'3d/city/kenney-city-kit-roads/construction-barrier.glb',
 ambulance:'3d/vehicles/kenney-car-kit/ambulance.glb',
 police:'3d/vehicles/kenney-car-kit/police.glb',
 van:'3d/vehicles/kenney-car-kit/van.glb',
 dumpster:'3d/city/kenney-city-kit-roads/dumpster.glb',
 turret:'3d/weapons/scifi-turrets/gatelng-gun-turret.glb',
 crate:'3d/survival/kenney-survival-kit/box.glb',
 maleA:'characters/people/character-male-a.glb',
 maleB:'characters/people/character-male-b.glb',
 maleC:'characters/people/character-male-c.glb',
 femaleA:'characters/people/character-female-a.glb',
 femaleB:'characters/people/character-female-b.glb',
 femaleC:'characters/people/character-female-c.glb'
};
const PEOPLE=[A.femaleA,A.maleA,A.femaleB,A.maleB,A.femaleC,A.maleC];
function hashId(s){let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h)}
function actorPath(info,index=0){const female=info?.sprite==='female',arr=female?[A.femaleA,A.femaleB,A.femaleC]:[A.maleA,A.maleB,A.maleC];return arr[hashId(info?.personId||info?.id||index)%arr.length]}
const W=bridge.width||960,H=bridge.height||540,FIELD_W=30,FIELD_D=16.875;
const sx=x=>(x/W-.5)*FIELD_W, sz=y=>(y/H-.5)*FIELD_D;
const wx=x=>(x/FIELD_W+.5)*W, wy=z=>(z/FIELD_D+.5)*H;
const sw=w=>w/W*FIELD_W, sd=h=>h/H*FIELD_D;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const loader=new GLTFLoader(),cache=new Map(),actorMap=new Map(),crateMap=new Map();
const asset=p=>new URL(p,ROOT).href;
function load(path){
 if(!cache.has(path))cache.set(path,new Promise(resolve=>loader.load(asset(path),g=>resolve(g.scene),undefined,()=>resolve(null))));
 return cache.get(path)
}
function cloneMaterials(o){
 o.traverse(n=>{if(!n.isMesh)return;n.geometry=n.geometry?.clone?.()||n.geometry;if(Array.isArray(n.material))n.material=n.material.map(m=>m?.clone?.()||m);else if(n.material)n.material=n.material.clone?.()||n.material;n.castShadow=n.receiveShadow=true})
}
function fit(o,target){
 o.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3()),m=Math.max(s.x,s.y,s.z)||1;
 o.scale.multiplyScalar(target/m);o.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(o);const c=b.getCenter(new THREE.Vector3());
 o.position.x-=c.x;o.position.z-=c.z;o.position.y-=b.min.y;return o
}
function tint(o,color,mix=.4){
 const c=new THREE.Color(color);o.traverse(n=>{if(!n.isMesh)return;const ms=Array.isArray(n.material)?n.material:[n.material];
  ms.forEach(m=>{if(!m)return;if(m.color)m.color.lerp(c,mix);if('roughness'in m)m.roughness=clamp(m.roughness??.7,.35,.92);m.needsUpdate=true})
 })
}
async function cloneAsset(path,target,color=null,mix=.35){
 const base=await load(path);if(!base)return null;const o=base.clone(true);cloneMaterials(o);fit(o,target);if(color!==null)tint(o,color,mix);return o
}
function mat(color,rough=.82,metal=.04){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function box(parent,x,y,z,w,h,d,color,rough=.82){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,rough));m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m
}
function plane(parent,w,d,color,y=.002){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat(color,.97));m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;parent.add(m);return m
}
function circle(parent,x,z,r,color,opacity=.28){
 const m=new THREE.Mesh(new THREE.CircleGeometry(r,42),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));
 m.rotation.x=-Math.PI/2;m.position.set(x,.025,z);parent.add(m);return m
}
function ring(parent,x,z,ri,ro,color,opacity=.75){
 const m=new THREE.Mesh(new THREE.RingGeometry(ri,ro,44),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));
 m.rotation.x=-Math.PI/2;m.position.set(x,.03,z);parent.add(m);return m
}
function labelSprite(text,color='#e8eded'){
 const c=document.createElement('canvas');c.width=512;c.height=104;const g=c.getContext('2d');
 g.fillStyle='rgba(8,13,15,.80)';g.fillRect(0,0,512,104);g.strokeStyle='rgba(160,178,180,.48)';g.lineWidth=3;g.strokeRect(2,2,508,100);
 g.fillStyle=color;g.textAlign='center';g.textBaseline='middle';g.font='800 30px system-ui,sans-serif';g.fillText(text,256,52);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(2.8,.57,1);return s
}
async function addAsset(root,path,x,z,target,color,mix=.35,rot=0){
 const o=await cloneAsset(path,target,color,mix);if(!o)return;o.position.x+=x;o.position.z+=z;o.rotation.y=rot;root.add(o);return o
}
function worldRect(root,x,y,w,h,height,color){
 return box(root,sx(x+w/2),0,sz(y+h/2),sw(w),height,sd(h),color)
}

const sourceCanvas=document.getElementById('q17FieldCanvas');
if(!sourceCanvas)throw new Error('Q17 field canvas is missing');
const stage=document.createElement('div');stage.id='q17FieldStage3D';stage.className='q17-field-stage3d';
const canvas=document.createElement('canvas');canvas.id='q17Field3D';canvas.setAttribute('aria-label','CAMP-17 3D 현장 출동 화면');
sourceCanvas.parentNode.insertBefore(stage,sourceCanvas);stage.append(canvas,sourceCanvas);
sourceCanvas.classList.add('q17-field-input-layer');

const damage=document.createElement('div');damage.className='q17-field-damage3d';stage.appendChild(damage);
const wave=document.createElement('div');wave.className='q17-field-wave3d';stage.appendChild(wave);
const prompt=document.createElement('div');prompt.className='q17-field-interact3d';stage.appendChild(prompt);

const style=document.createElement('style');style.id='q17Field3DStyle';style.textContent=`
.q17-field-stage3d{position:relative;width:100%;aspect-ratio:16/9;background:#172328;overflow:hidden}
#q17Field3D{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair;touch-action:none}
#q17FieldCanvas.q17-field-input-layer{position:absolute;inset:0;width:100%;height:100%;opacity:0!important;pointer-events:none!important}
.q17-field-wave3d{position:absolute;left:10px;top:10px;z-index:3;background:#071015d9;border:1px solid #4a5b61;padding:6px 9px;color:#e5eeee;font:800 10px system-ui,sans-serif;pointer-events:none}
.q17-field-interact3d{position:absolute;left:50%;bottom:12px;z-index:4;transform:translateX(-50%);background:#101716ed;border:1px solid #bba55b;color:#f4e8b0;padding:7px 11px;font:900 11px system-ui,sans-serif;opacity:0;transition:.12s;pointer-events:none;white-space:nowrap}
.q17-field-interact3d.show{opacity:1}
.q17-field-damage3d{position:absolute;inset:0;z-index:3;background:#b4212c;opacity:0;pointer-events:none;mix-blend-mode:screen}
@media(max-width:720px){.q17-field-wave3d{font-size:8px;padding:4px 6px}.q17-field-interact3d{bottom:7px;font-size:9px;padding:5px 8px}}
`;document.head.appendChild(style);

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111a1b);scene.fog=new THREE.Fog(0x111a1b,22,45);
const camera=new THREE.PerspectiveCamera(44,16/9,.1,100);camera.position.set(0,21.5,19.2);
const cameraLook=new THREE.Vector3(0,.2,0);camera.lookAt(cameraLook);
scene.add(new THREE.HemisphereLight(0xbfd4ca,0x252923,1.18));
const sun=new THREE.DirectionalLight(0xffdcaa,2.2);sun.position.set(-8,17,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);
const emergencyLight=new THREE.PointLight(0xd84f55,0,11,2);emergencyLight.position.set(sx(900),4,sz(250));scene.add(emergencyLight);
const blueFill=new THREE.DirectionalLight(0x6f9ca6,.55);blueFill.position.set(9,8,-8);scene.add(blueFill);

const staticRoot=new THREE.Group(),dynamicRoot=new THREE.Group(),bulletRoot=new THREE.Group(),pickupRoot=new THREE.Group();
scene.add(staticRoot,dynamicRoot,bulletRoot,pickupRoot);

function buildPerimeter(){
 plane(staticRoot,FIELD_W,FIELD_D,0x42483f);
 const road1=plane(staticRoot,FIELD_W-1.2,sd(92),0x595b57,.01);road1.position.z=sz(234);
 const road2=plane(staticRoot,sw(82),FIELD_D-1.1,0x565a58,.011);road2.position.x=sx(401);
 for(let x=45;x<930;x+=72){const d=plane(staticRoot,sw(34),.055,0xb6a75f,.03);d.position.set(sx(x),.03,sz(234))}
 for(let y=35;y<510;y+=64){const d=plane(staticRoot,.055,sd(28),0xb6a75f,.031);d.position.set(sx(401),.031,sz(y))}
 // Low metal perimeter walls preserve readable boundaries while leaving the east gate open.
 const rail=0x6d7772;
 box(staticRoot,0,0,sz(9),FIELD_W,.46,.18,rail);box(staticRoot,0,0,sz(531),FIELD_W,.46,.18,rail);
 box(staticRoot,sx(9),0,0,.18,.46,FIELD_D,rail);
 box(staticRoot,sx(951),0,sz(75),.18,.46,sd(130),rail);box(staticRoot,sx(951),0,sz(455),.18,.46,sd(130),rail);
 // East gate framing and warning lamps.
 box(staticRoot,sx(900),0,sz(155),.22,2.4,.22,0x7b6868);box(staticRoot,sx(900),0,sz(345),.22,2.4,.22,0x7b6868);
 const gateLabel=labelSprite('외곽 검문 게이트','#ffaaa9');gateLabel.position.set(sx(850),2.8,sz(150));staticRoot.add(gateLabel);
}
function buildBuildings(){
 worldRect(staticRoot,65,55,185,122,2.2,0x4d656a);worldRect(staticRoot,65,55,185,14,2.36,0x78898a);
 let l=labelSprite('지휘소');l.position.set(sx(157),2.7,sz(58));staticRoot.add(l);

 worldRect(staticRoot,292,52,210,132,2.35,0x555e63);worldRect(staticRoot,292,52,210,14,2.52,0x7a8588);
 // Isolation block gets a central containment seam, matching the CCTV facility language.
 box(staticRoot,sx(397),.05,sz(118),.18,2.15,sd(116),0x889398);
 const glassMat=new THREE.MeshPhysicalMaterial({color:0xaed4df,transparent:true,opacity:.18,roughness:.08,depthWrite:false});
 const glass=new THREE.Mesh(new THREE.BoxGeometry(.1,1.45,sd(82)),glassMat);glass.position.set(sx(397),1.15,sz(118));staticRoot.add(glass);
 l=labelSprite('A/B 격리동','#c8dde4');l.position.set(sx(397),2.9,sz(57));staticRoot.add(l);

 worldRect(staticRoot,548,58,184,118,2.2,0x6b604d);worldRect(staticRoot,548,58,184,14,2.38,0x918269);
 l=labelSprite('보급창고','#efd697');l.position.set(sx(640),2.72,sz(62));staticRoot.add(l);
 addAsset(staticRoot,A.desk,sx(260),sz(102),1.35,0x657276,.18,Math.PI/2);
 addAsset(staticRoot,A.radio,sx(260),sz(102),.34,0x536166,.18,Math.PI/2).then(o=>{if(o)o.position.y=.82});
 addAsset(staticRoot,A.laptop,sx(260),sz(122),.40,0x5f6d70,.16,Math.PI/2).then(o=>{if(o)o.position.y=.82});
 addAsset(staticRoot,A.structureCanvas,sx(615),sz(193),2.4,0x6d6756,.20,0);
 addAsset(staticRoot,A.boxLarge,sx(590),sz(208),.82,0x82664c,.24,.12);
 addAsset(staticRoot,A.barrel,sx(660),sz(206),.72,0x596762,.20,0);

 // Medical obstacle is represented by a low service pad plus a real tent.
 const medPad=plane(staticRoot,sw(166),sd(116),0x4d5e55,.018);medPad.position.set(sx(501),.018,sz(410));
 addAsset(staticRoot,A.tent,sx(500),sz(410),2.5,0x75816b,.5,0);
 addAsset(staticRoot,A.bed,sx(585),sz(390),1.2,0xb5cfcb,.35,Math.PI/2);
 l=labelSprite('의무막사','#c8eee4');l.position.set(sx(500),2.45,sz(360));staticRoot.add(l);

 addAsset(staticRoot,A.tentSmall,sx(164),sz(338),1.75,0x81745a,.47,.08);
 addAsset(staticRoot,A.tentSmall,sx(280),sz(402),1.75,0x766d55,.47,-.12);
 addAsset(staticRoot,A.ambulance,sx(850),sz(356),2.45,0xe3e7e2,.24,Math.PI/2);
 addAsset(staticRoot,A.police,sx(870),sz(430),2.25,0xc8d2d5,.12,Math.PI);
 addAsset(staticRoot,A.van,sx(760),sz(480),2.20,0x69787b,.16,0);
 addAsset(staticRoot,A.dumpster,sx(845),sz(250),1.15,0x5d6b66,.18,Math.PI/2);
 addAsset(staticRoot,A.structureMetal,sx(789),sz(136),2.45,0x596467,.22,Math.PI/2);
 addAsset(staticRoot,A.barrier,sx(672),sz(427),1.3,0xc3953f,.48,0);

 // A handful of actual fence assets make the CCTV-to-field transition recognizable without overloading mobile GPUs.
 for(const [x,y,r] of [[92,26,0],[245,26,0],[600,26,0],[760,26,0],[925,74,Math.PI/2],[925,120,Math.PI/2],[925,385,Math.PI/2],[925,455,Math.PI/2],[70,510,0],[225,510,0],[650,510,0],[805,510,0]])
  addAsset(staticRoot,A.fence,sx(x),sz(y),1.25,0x77837d,.32,r);
 for(const [x,y,r] of [[365,26,0],[480,26,0],[925,245,Math.PI/2]])addAsset(staticRoot,A.fortifiedFence,sx(x),sz(y),1.55,0x6c7772,.18,r);
 for(const [x,y] of [[65,205],[738,205],[770,360],[890,360]])addAsset(staticRoot,A.light,sx(x),sz(y),1.85,0xe5bd55,.28,0);
}
function buildGameplayLandmarks(){
 const safeX=sx(270),safeZ=sz(205);circle(staticRoot,safeX,safeZ,1.05,0x6db581,.20);ring(staticRoot,safeX,safeZ,1.05,1.16,0xa9dcb4,.72);
 const s=labelSprite('안전구역','#d6f0dc');s.scale.set(1.75,.36,1);s.position.set(safeX,1.65,safeZ);staticRoot.add(s);

 const medX=sx(610),medZ=sz(330);circle(staticRoot,medX,medZ,.48,0x79a6a5,.18);ring(staticRoot,medX,medZ,.48,.57,0xbbe2df,.68);
 const crossMat=new THREE.MeshBasicMaterial({color:0xdceeed});box(staticRoot,medX-.02,.08,medZ,.12,.52,.38,0xdceeed);box(staticRoot,medX-.02,.24,medZ,.38,.18,.12,0xdceeed);

 const turretX=sx(720),turretZ=sz(286);ring(staticRoot,turretX,turretZ,.48,.59,0xc7aa4a,.45);
 addAsset(staticRoot,A.turret,turretX,turretZ,1.5,0x6f7976,.38,-Math.PI/2).then(o=>{fieldTurret=o});
 rangeRing=ring(staticRoot,turretX,turretZ,0,190/W*FIELD_W,0xe7cf69,.13);rangeRing.visible=false;
}
buildPerimeter();buildBuildings();let fieldTurret=null,rangeRing=null;buildGameplayLandmarks();

const sharedBulletGeo=new THREE.SphereGeometry(.07,8,6),bulletMat=new THREE.MeshBasicMaterial({color:0xffe99b});
const pickupGeo=new THREE.OctahedronGeometry(.18,0);
const aimMarker=new THREE.Mesh(new THREE.RingGeometry(.18,.24,28),new THREE.MeshBasicMaterial({color:0xf1d56e,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
aimMarker.rotation.x=-Math.PI/2;aimMarker.position.y=.035;scene.add(aimMarker);aimMarker.visible=false;

function fallbackActor(color,zombie=false){
 const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.68,5,9),mat(color,.72)),head=new THREE.Mesh(new THREE.SphereGeometry(.22,14,9),mat(zombie?0x8c9a6f:0xe2bea2,.76));
 body.position.y=.68;head.position.y=1.28;g.add(body,head);if(zombie){body.rotation.z=.12;g.rotation.z=.04}return g
}
async function populate(host,path,target,color,mix){
 const o=await cloneAsset(path,target,color,mix);if(!o||!host.parent)return;host.clear();host.add(o)
}
function getActor(key,type,index,elite=false,info={}){
 let a=actorMap.get(key);if(a)return a;
 const root=new THREE.Group(),modelHost=new THREE.Group();root.add(modelHost);dynamicRoot.add(root);
 let color=0x6b9b78,target=1.55,path=actorPath(info,index),mix=.28;
 if(type==='zombie'){color=elite?0x7d4f55:0x758b58;target=elite?1.85:1.65;mix=.68}
 else if(type==='survivor'){color=[0x6f9b78,0x6d8eaa,0xaa7c62,0x8d79a7][hashId(info?.personId||info?.id||index)%4];target=1.55;mix=.38}
 modelHost.add(fallbackActor(color,type==='zombie'));populate(modelHost,path,target,color,mix);
 const r=new THREE.Mesh(new THREE.RingGeometry(.32,.39,30),new THREE.MeshBasicMaterial({color:type==='zombie'?0xd85960:0x7fc68e,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false}));
 r.rotation.x=-Math.PI/2;r.position.y=.024;root.add(r);
 a={root,modelHost,ring:r,lastX:null,lastY:null,type};actorMap.set(key,a);return a
}
function removeMissing(prefix,keys){
 for(const [key,a] of actorMap)if(key.startsWith(prefix)&&!keys.has(key)){dynamicRoot.remove(a.root);actorMap.delete(key)}
}

const playerRoot=new THREE.Group(),playerHost=new THREE.Group();playerRoot.add(playerHost);dynamicRoot.add(playerRoot);
playerHost.add(fallbackActor(0x526a78,false));
cloneAsset(A.maleC,1.72,0x526a78,.22).then(o=>{if(o&&playerHost.parent){playerHost.clear();playerHost.add(o)}});
const playerRing=new THREE.Mesh(new THREE.RingGeometry(.33,.42,30),new THREE.MeshBasicMaterial({color:0xe5cf68,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false}));
playerRing.rotation.x=-Math.PI/2;playerRing.position.y=.024;playerRoot.add(playerRing);playerRoot.visible=false;

async function ensureCrate(q){
 if(crateMap.has(q.id))return crateMap.get(q.id);
 const host=new THREE.Group();host.position.set(sx(q.x),0,sz(q.y));staticRoot.add(host);crateMap.set(q.id,host);
 const placeholder=box(host,0,0,0,.55,.42,.55,0x9a7044);
 const o=await cloneAsset(A.crate,.7,0xa87542,.42);if(o&&host.parent){host.remove(placeholder);host.add(o)}
 return host
}

function syncActors(s,t){
 const zombieKeys=new Set(),survivorKeys=new Set();
 s.zombies.forEach((z,i)=>{
  const key='z'+String(z.id??i);zombieKeys.add(key);const a=getActor(key,'zombie',i,z.elite,z);
  const x=sx(z.x),zz=sz(z.y),dx=a.lastX===null?0:z.x-a.lastX,dy=a.lastY===null?0:z.y-a.lastY;
  a.root.position.set(x,.02,zz);if(Math.hypot(dx,dy)>.05)a.root.rotation.y=Math.atan2(dx,dy);
  a.root.position.y=.02+Math.sin(t*.006+(z.phase||0))*.035;a.root.scale.setScalar(z.hit>0?1.08:1);
  a.ring.material.color.setHex(z.elite?0xff8d79:0xd85960);a.ring.material.opacity=z.elite ? .9 : .62;a.lastX=z.x;a.lastY=z.y
 });
 removeMissing('z',zombieKeys);

 s.survivors.forEach((p,i)=>{
  const key='s'+String(p.id??i);survivorKeys.add(key);const a=getActor(key,'survivor',i,false,p);
  a.root.visible=!!p.alive&&!p.rescued;if(!a.root.visible)return;
  const dx=a.lastX===null?0:p.x-a.lastX,dy=a.lastY===null?0:p.y-a.lastY;
  a.root.position.set(sx(p.x),.02,sz(p.y));if(Math.hypot(dx,dy)>.05)a.root.rotation.y=Math.atan2(dx,dy);
  a.root.position.y=.02+Math.sin(t*.005+i)*.02;a.ring.material.color.setHex(p.escorted?0xa8e0af:0x7fc68e);a.ring.material.opacity=p.escorted ? .9 : .55;
  a.lastX=p.x;a.lastY=p.y
 });
 removeMissing('s',survivorKeys);

 if(s.player){
  playerRoot.visible=true;playerRoot.position.set(sx(s.player.x),.02,sz(s.player.y));
  const aimDx=Number(s.player.aimX)-Number(s.player.x),aimDy=Number(s.player.aimY)-Number(s.player.y);
  if(Number.isFinite(aimDx)&&Number.isFinite(aimDy)&&Math.hypot(aimDx,aimDy)>.01)playerRoot.rotation.y=Math.atan2(aimDx,aimDy);
  else playerRoot.rotation.y=s.player.facing>0?-Math.PI/2:Math.PI/2;
  playerHost.position.y=Math.sin(t*.008)*.018;playerRoot.traverse(n=>{if(n.isMesh&&n.material)n.material.opacity=s.player.ifr > 0 ? .62 : 1})
 }else playerRoot.visible=false
}
function syncBullets(s){
 for(const o of bulletRoot.children)if(o.isLine){o.geometry?.dispose?.();o.material?.dispose?.()}
 bulletRoot.clear();
 for(const b of s.bullets){
  if(b.beam&&Number.isFinite(b.tx)&&Number.isFinite(b.ty)){
   const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sx(b.x),.72,sz(b.y)),new THREE.Vector3(sx(b.tx),.72,sz(b.ty))]);
   bulletRoot.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffdf68,transparent:true,opacity:.8})))
  }else{
   const m=new THREE.Mesh(sharedBulletGeo,bulletMat);m.position.set(sx(b.x),.72,sz(b.y));bulletRoot.add(m)
  }
 }
}
function syncPickups(s,t){
 pickupRoot.clear();for(const p of s.pickups){
  const color=p.type==='ammo'?0xe0c865:p.type==='med'?0xd75f65:0x76a9ad;
  const m=new THREE.Mesh(pickupGeo,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.28,roughness:.45}));
  m.position.set(sx(p.x),.35+Math.sin(t*.006+p.id)*.08,sz(p.y));m.rotation.y=t*.0015;pickupRoot.add(m)
 }
}
function syncGameplay(s,t){
 const crateIds=new Set((s.crates||[]).map(q=>q.id));
 for(const [id,o] of crateMap)if(!crateIds.has(id))o.visible=false;
 for(const q of s.crates||[]){let o=crateMap.get(q.id);if(!o){ensureCrate(q);o=crateMap.get(q.id)}if(o)o.visible=!q.opened}
 if(fieldTurret){fieldTurret.rotation.y=-Math.PI/2+Math.sin(t*.002)*.18;fieldTurret.traverse(n=>{if(!n.isMesh)return;const ms=Array.isArray(n.material)?n.material:[n.material];ms.forEach(m=>{if(m?.emissive){m.emissive.setHex(s.turret?.active?0xe6c654:0x24282a);m.emissiveIntensity=s.turret?.active ? .7 : .08}})})}
 if(rangeRing)rangeRing.visible=!!s.turret?.active;
 emergencyLight.intensity=(s.zombies.length+s.spawnQueue)>0?2.1+Math.max(0,Math.sin(t*.012))*2.2:0;
 wave.textContent=s.started?'웨이브 '+Math.max(1,s.wave)+' / '+Math.max(1,s.waveCount)+' · 남은 위협 '+(s.zombies.length+s.spawnQueue):'현장 진입 대기';
 damage.style.opacity=String(clamp((s.flash||0)*.72,0,.3));

 prompt.classList.remove('show');
 if(s.started&&s.player){
  const near=(a,b,r)=>Math.hypot(s.player.x-a,s.player.y-b)<r;
  let text='';
  const crate=(s.crates||[]).find(q=>!q.opened&&near(q.x,q.y,44));if(crate)text='E · 보급상자 열기';
  else if(s.turret&&!s.turret.active&&near(s.turret.x,s.turret.y,50))text='E · 자동포탑 재가동 · 부품 3';
  else if(near(610,330,60))text=s.medCharges>0?'E · 의무소 응급 보급':'의무소 물품 소진';
  if(text){prompt.textContent=text;prompt.classList.add('show')}
 }
}
function updateCamera(s,t){
 let tx=0,tz=0;if(s.player){tx=sx(s.player.x)*.13;tz=sz(s.player.y)*.10}
 cameraLook.lerp(new THREE.Vector3(tx,.25,tz),.06);
 const shake=(s.shake||0)*.004;camera.position.x=Math.sin(t*.002)*.16+(Math.random()-.5)*shake;camera.position.y=21.5+(Math.random()-.5)*shake;camera.position.z=19.2+(Math.random()-.5)*shake;
 camera.lookAt(cameraLook)
}

const raycaster=new THREE.Raycaster(),pointerNdc=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
function aimFromEvent(e,fire=false){
 const r=canvas.getBoundingClientRect();pointerNdc.x=((e.clientX-r.left)/r.width)*2-1;pointerNdc.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointerNdc,camera);
 if(!raycaster.ray.intersectPlane(ground,hit))return;
 hit.x=clamp(hit.x,-FIELD_W/2,FIELD_W/2);hit.z=clamp(hit.z,-FIELD_D/2,FIELD_D/2);aimMarker.position.set(hit.x,.035,hit.z);aimMarker.visible=true;
 const x=clamp(wx(hit.x),0,W),y=clamp(wy(hit.z),0,H);if(fire)bridge.aimAt(x,y,true);else bridge.setAim(x,y)
}
canvas.addEventListener('pointermove',e=>aimFromEvent(e,false));
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture?.(e.pointerId);aimFromEvent(e,true)});
canvas.addEventListener('pointerup',e=>{bridge.setFire(false);canvas.releasePointerCapture?.(e.pointerId)});
canvas.addEventListener('pointercancel',()=>bridge.setFire(false));
canvas.addEventListener('pointerleave',()=>{bridge.setFire(false);aimMarker.visible=false});

function resize(){
 const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(Math.round(r.width),Math.round(r.height),false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(stage);resize();

let last=0;
function frame(t){
 const s=bridge.snapshot();
 if(!s.active){last=t;requestAnimationFrame(frame);return}
 if(t-last>15){
  syncActors(s,t);syncBullets(s);syncPickups(s,t);syncGameplay(s,t);updateCamera(s,t);renderer.render(scene,camera);last=t
 }
 requestAnimationFrame(frame)
}
requestAnimationFrame(frame);
window.Q17Field3D=Object.freeze({active:true,version:'21.4',scene,camera,renderer});
