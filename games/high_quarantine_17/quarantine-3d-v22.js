import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const booth=document.getElementById('booth');
if(!booth)throw new Error('Quarantine 17 booth is unavailable');

const ROOT=new URL('../../assets/game/',import.meta.url);
const A={
 maleA:'characters/people/character-male-a.glb',
 maleB:'characters/people/character-male-b.glb',
 maleC:'characters/people/character-male-c.glb',
 femaleA:'characters/people/character-female-a.glb',
 femaleB:'characters/people/character-female-b.glb',
 femaleC:'characters/people/character-female-c.glb',
 fence:'3d/city/kenney-city-kit-roads/construction-fence.glb',
 light:'3d/city/kenney-city-kit-roads/construction-light.glb',
 barrier:'3d/city/kenney-city-kit-roads/construction-barrier.glb',
 ambulance:'3d/vehicles/kenney-car-kit/ambulance.glb',
 police:'3d/vehicles/kenney-car-kit/police.glb',
 van:'3d/vehicles/kenney-car-kit/van.glb',
 cone:'3d/vehicles/kenney-car-kit/cone.glb',
 dumpster:'3d/city/kenney-city-kit-roads/dumpster.glb',
 fortifiedFence:'3d/survival/kenney-survival-kit/fence-fortified.glb',
 boxLarge:'3d/survival/kenney-survival-kit/box-large.glb',
 barrel:'3d/survival/kenney-survival-kit/barrel.glb',
 radio:'3d/interiors/kenney-furniture-kit/radio.glb',
 laptop:'3d/interiors/kenney-furniture-kit/laptop.glb',
 trashcan:'3d/interiors/kenney-furniture-kit/trashcan.glb',
 crate:'3d/city/poly-pizza-city-pack/box.glb'
};
const loader=new GLTFLoader(),cache=new Map(),views=[];
const lowPower=innerWidth<720||(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
const asset=p=>new URL(p,ROOT).href;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

function load(path){
 if(!cache.has(path))cache.set(path,new Promise(resolve=>loader.load(asset(path),g=>resolve(g.scene),undefined,()=>resolve(null))));
 return cache.get(path)
}
function cloneMaterials(o){
 o.traverse(n=>{if(!n.isMesh)return;if(Array.isArray(n.material))n.material=n.material.map(m=>m?.clone?.()||m);else if(n.material)n.material=n.material.clone?.()||n.material;n.castShadow=n.receiveShadow=true})
}
function fit(o,target){
 o.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3()),m=Math.max(s.x,s.y,s.z)||1;
 o.scale.multiplyScalar(target/m);o.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(o);const c=b.getCenter(new THREE.Vector3());
 o.position.x-=c.x;o.position.z-=c.z;o.position.y-=b.min.y;return o
}
function tint(o,color,mix=.16){
 const c=new THREE.Color(color);o.traverse(n=>{if(!n.isMesh)return;const ms=Array.isArray(n.material)?n.material:[n.material];
  ms.forEach(m=>{if(!m)return;if(m.color)m.color.lerp(c,mix);if('roughness'in m)m.roughness=clamp(m.roughness??.7,.35,.94);m.needsUpdate=true})
 })
}
async function model(path,target=1,color=null,mix=.16){
 const base=await load(path);if(!base)return null;const o=base.clone(true);cloneMaterials(o);fit(o,target);if(color!==null)tint(o,color,mix);return o
}
function mat(color,rough=.82,metal=.04){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function box(parent,x,y,z,w,h,d,color,rough=.82){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,rough));m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m
}
function plane(parent,w,d,color,y=.001){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat(color,.97));m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;parent.add(m);return m
}
function glow(color,intensity=.8){
 return new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.35})
}
function sign(text,color='#e5eeee',bg='rgba(8,12,14,.82)'){
 const c=document.createElement('canvas');c.width=640;c.height=112;const g=c.getContext('2d');
 g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.strokeStyle='rgba(167,183,186,.5)';g.lineWidth=3;g.strokeRect(2,2,c.width-4,c.height-4);
 g.fillStyle=color;g.font='900 34px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,c.width/2,c.height/2);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(3.2,.56,1);return s
}
function hash(s){let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h)}
function personPath(info){
 const n=hash(info?.id||info?.sprite),female=info?.sprite==='female';
 const arr=female?[A.femaleA,A.femaleB,A.femaleC]:[A.maleA,A.maleB,A.maleC];return arr[n%arr.length]
}
function personTint(info){
 const p=[0x6d879b,0x7d8e66,0xa1765c,0x766d96,0x527f7a,0x8c6868,0x8b825c];return p[hash(info?.id)%p.length]
}
function fallbackPerson(color){
 const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CapsuleGeometry(.24,.72,5,10),mat(color,.75)),head=new THREE.Mesh(new THREE.SphereGeometry(.23,15,10),mat(0xe3bea0,.8));
 body.position.y=.72;head.position.y=1.36;g.add(body,head);return g
}
async function populate(host,info,target=1.7){
 const o=await model(personPath(info),target,personTint(info),.16);if(!o||!host.parent)return;host.clear();host.add(o)
}
async function addAsset(root,path,pos,target,color,mix=.3,rot=0){
 const o=await model(path,target,color,mix);if(!o)return;o.position.add(new THREE.Vector3(...pos));o.rotation.y=rot;root.add(o);return o
}

const canvas=document.createElement('canvas');canvas.id='q17Main3D';canvas.setAttribute('aria-label','제17검역소 3D 검문 현장');
booth.prepend(canvas);booth.classList.add('q17-main3d');

const style=document.createElement('style');style.id='q17Main3DStyle';style.textContent=`
.booth.q17-main3d{background:#11181b!important}
.booth.q17-main3d>.window,.booth.q17-main3d>.hazard,.booth.q17-main3d>.citizen-wrap{display:none!important}
#q17Main3D{position:absolute;left:0;right:0;top:0;bottom:255px;width:100%;height:calc(100% - 255px);display:block;z-index:0;pointer-events:none}
.booth.q17-main3d>.speech{z-index:6;top:54px;right:14px;max-width:190px}
.booth.q17-main3d>.case-tag{z-index:6;background:#101619e8}
.booth.q17-main3d>.id-card,.booth.q17-main3d>.bag-panel,.booth.q17-main3d>.test-review,.booth.q17-main3d>.status-msg,.booth.q17-main3d>.stamp{z-index:12}
.booth.q17-main3d>.desk{z-index:8}
.q17-main3d-badge{position:absolute;left:12px;top:10px;z-index:5;padding:5px 7px;border:1px solid #5a6970;background:#0a1115c9;color:#aebbc0;font:900 9px ui-monospace,monospace;letter-spacing:.08em;pointer-events:none}
.q17-main3d-badge b{color:#d8e0e2}
@media(max-width:680px){#q17Main3D{bottom:390px;height:calc(100% - 390px)}.booth.q17-main3d>.speech{top:39px;right:8px;max-width:145px;font-size:11px;padding:7px 8px}.q17-main3d-badge{font-size:7px;padding:4px 5px}}
`;document.head.appendChild(style);
const badge=document.createElement('div');badge.className='q17-main3d-badge';badge.innerHTML='<b>Q-17 CHECKPOINT</b> · LIVE 3D';booth.appendChild(badge);

const renderer=new THREE.WebGLRenderer({canvas,antialias:!lowPower,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,lowPower?1.15:1.55));renderer.shadowMap.enabled=!lowPower;if(renderer.shadowMap.enabled)renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x172126);scene.fog=new THREE.Fog(0x172126,13,30);
const camera=new THREE.PerspectiveCamera(43,16/9,.1,80);camera.position.set(0,5.7,9.3);camera.lookAt(0,1.1,-1.25);

const world=new THREE.Group(),people=new THREE.Group(),fx=new THREE.Group();scene.add(world,people,fx);
scene.add(new THREE.HemisphereLight(0xc5d3d2,0x242823,1.28));
const keyLight=new THREE.DirectionalLight(0xffdfb3,2.15);keyLight.position.set(-6,12,7);keyLight.castShadow=!lowPower;if(keyLight.castShadow){keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-10;keyLight.shadow.camera.right=10;keyLight.shadow.camera.top=9;keyLight.shadow.camera.bottom=-9}scene.add(keyLight);
const coolFill=new THREE.DirectionalLight(0x789eaf,.55);coolFill.position.set(7,7,-8);scene.add(coolFill);
const emergency=new THREE.PointLight(0xd64f55,0,12,2);emergency.position.set(5,4,-4);scene.add(emergency);
const uvLight=new THREE.PointLight(0x6f63ff,0,7,2);uvLight.position.set(0,3.2,1.2);scene.add(uvLight);

const gateLights={pass:null,retest:null,quarantine:null};
let ambulance=null,lateBarricades=[],weekProps=[];

function buildWorld(){
 plane(world,15,13,0x4a4d49);
 const lane=plane(world,4.1,10.5,0x555b5d,.012);lane.position.z=-1;
 for(let z=-5.5;z<4;z+=1.15){const d=plane(world,.08,.52,0xc2aa55,.025);d.position.set(-2.05,.025,z)}
 for(let z=-5.5;z<4;z+=1.15){const d=plane(world,.08,.52,0xc2aa55,.025);d.position.set(2.05,.025,z)}
 const stop=plane(world,4.0,.16,0xd3b650,.03);stop.position.z=.55;

 // inspection desk and devices
 box(world,0,0,2.15,4.9,.72,1.0,0x4b4035);box(world,0,.72,2.15,5.05,.14,1.05,0x655441);
 box(world,-1.65,.84,1.72,.58,.45,.56,0x4b5960);box(world,1.55,.84,1.72,.72,.52,.62,0x4f5c61);
 const tempHead=box(world,-1.68,1.3,1.5,.18,.18,.32,0x6f858c);tempHead.material=glow(0x88cbd5,.18);
 const analyzer=box(world,1.55,1.36,1.7,.6,.18,.48,0x39454a);analyzer.material=glow(0x5e7f87,.12);
 for(let i=0;i<3;i++){const led=new THREE.Mesh(new THREE.SphereGeometry(.035,10,8),glow([0x65b7ca,0xd4b456,0xb85a5f][i],.3));led.position.set(1.36+i*.18,1.53,1.38);world.add(led)}
 addAsset(world,A.laptop,[-.65,.91,2.08],.48,0x77888e,.16,Math.PI);
 addAsset(world,A.radio,[.25,.91,2.07],.40,0x606d71,.18,Math.PI);
 addAsset(world,A.trashcan,[2.85,0,2.35],.55,0x5f6869,.20,0);

 // scanner arch
 box(world,-1.35,0,.18,.13,2.75,.16,0x667379);box(world,1.35,0,.18,.13,2.75,.16,0x667379);box(world,0,2.62,.18,2.83,.13,.16,0x77858b);
 const scanBar=box(world,0,2.42,.12,2.4,.08,.06,0x5f777e);scanBar.material=glow(0x82d2de,.18);
 const idScanner=box(world,-.88,.86,1.74,.52,.10,.62,0x4d5d63);idScanner.material=glow(0x6b9ba6,.14);
 const docPad=box(world,-.22,.86,1.72,.58,.07,.66,0x544f43);docPad.material=glow(0xc2a65a,.10);
 const respSensor=box(world,.78,.86,1.72,.16,.62,.16,0x4d5f63);respSensor.material=glow(0x70a8af,.10);
 const bagTray=new THREE.Group();box(bagTray,0,0,0,1.05,.10,.72,0x5a554c);box(bagTray,-.48,.1,0,.08,.18,.72,0x777167);box(bagTray,.48,.1,0,.08,.18,.72,0x777167);bagTray.position.set(2.18,.88,1.72);world.add(bagTray);
 const breathRing=new THREE.Mesh(new THREE.TorusGeometry(.24,.035,8,28),new THREE.MeshBasicMaterial({color:0x8ed9dc,transparent:true,opacity:0,depthWrite:false}));breathRing.rotation.y=Math.PI/2;breathRing.position.set(.55,1.72,.38);fx.add(breathRing);
 const uvSpots=new THREE.Group();
 for(const p of [[-.22,1.18,.23],[.25,1.42,.16]]){const m=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),new THREE.MeshBasicMaterial({color:0x61f1ff,transparent:true,opacity:0,depthWrite:false}));m.position.set(...p);uvSpots.add(m)}
 fx.add(uvSpots);
 world.userData.scanBar=scanBar;world.userData.analyzer=analyzer;world.userData.tempHead=tempHead;world.userData.idScanner=idScanner;world.userData.docPad=docPad;world.userData.respSensor=respSensor;world.userData.bagTray=bagTray;world.userData.breathRing=breathRing;world.userData.uvSpots=uvSpots;

 // background wall/fence
 box(world,0,0,-6.1,14,.5,.22,0x6b7472);
 for(let x=-6;x<=6;x+=1.6)addAsset(world,A.fence,[x,0,-6.0],1.25,0x7b8580,.3,0);
 for(const x of [-5.8,5.8])addAsset(world,A.light,[x,0,-5.2],1.8,0xe3bf59,.24,0);

 // destination corridors/gates
 const gate=(x,z,labelText,color)=>{
  box(world,x-.82,0,z,.15,2.45,.18,0x66706e);box(world,x+.82,0,z,.15,2.45,.18,0x66706e);box(world,x,2.25,z,1.8,.16,.18,0x747e7b);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),glow(color,.28));lamp.position.set(x,2.62,z);world.add(lamp);
  const s=sign(labelText,'#f2f3ed');s.scale.set(2.0,.38,1);s.position.set(x,3.12,z);world.add(s);return lamp
 };
 gateLights.pass=gate(-4.65,-2.1,'통과 · CAMP-17',0x58b870);
 gateLights.retest=gate(4.1,-1.45,'A 추가검사',0xd1a94d);
 gateLights.quarantine=gate(4.65,-4.45,'격리 · 소각 처리',0xc34f56);

 // lane dividers and security furniture
 for(const p of [[-3.0,-3.7],[-3.0,-1.0],[3.0,-3.7],[3.0,-1.0]])addAsset(world,A.barrier,[p[0],0,p[1]],1.05,0xc0963f,.42,Math.PI/2);
 for(const p of [[-2.65,-5.0],[2.65,-5.0],[-2.65,.72],[2.65,.72]])addAsset(world,A.cone,[p[0],0,p[1]],.42,0xd89136,.16,0);
 for(const p of [[-5.5,-.8],[5.5,-.3]])addAsset(world,A.crate,[p[0],0,p[1]],.65,0x8d6947,.36,0);
 addAsset(world,A.boxLarge,[-6.2,0,-2.8],.82,0x846348,.28,.12);
 addAsset(world,A.barrel,[-6.15,0,-3.75],.72,0x5f6d69,.24,0);
 addAsset(world,A.dumpster,[6.1,0,-2.9],1.05,0x65716c,.22,-Math.PI/2);

 addAsset(world,A.police,[5.25,0,-7.05],2.45,0xcbd6da,.12,-Math.PI/2);
 addAsset(world,A.ambulance,[-5.3,0,-7.1],2.55,0xe4e8e4,.22,Math.PI/2).then(o=>{ambulance=o;if(o)o.visible=false});
 addAsset(world,A.van,[3.35,0,-7.35],2.25,0x6e7d80,.18,-Math.PI/2).then(o=>{if(o){o.visible=false;weekProps.push(o)}});
 for(const p of [[-5.3,-4.3],[5.3,-5.1],[-4.8,-5.25]])addAsset(world,A.barrier,[p[0],0,p[1]],1.12,0xc0913c,.48,0).then(o=>{if(o){o.visible=false;lateBarricades.push(o)}});
 for(const x of [-4.0,4.0])addAsset(world,A.fortifiedFence,[x,0,-5.95],1.55,0x6d7772,.18,0);
}
buildWorld();

let currentActor=null,queueActors=new Map(),lastSnapshot=null,effect={tool:null,until:0},decision=null,caseEpoch=0;

function createActor(info,target=1.74){
 const root=new THREE.Group(),host=new THREE.Group();root.add(host);host.add(fallbackPerson(personTint(info)));people.add(root);
 populate(host,info,target);return{root,host,info,lastX:0,lastZ:0}
}
function removeActor(a){if(a?.root?.parent)a.root.parent.remove(a.root)}
function spawnCurrent(info){
 caseEpoch++;
 if(currentActor)removeActor(currentActor);
 const queued=queueActors.get(info?.id);
 if(queued){queueActors.delete(info.id);currentActor=queued;currentActor.info=info}
 else{currentActor=createActor(info,1.78);currentActor.root.position.set(-2.15,0,-4.65)}
 currentActor.entryStart={x:currentActor.root.position.x,z:currentActor.root.position.z};
 currentActor.root.rotation.y=0;currentActor.enteredAt=performance.now();currentActor.epoch=caseEpoch;decision=null
}
function syncQueue(queue){
 const keep=new Set((queue||[]).map(q=>q.id));
 for(const [id,a] of queueActors)if(!keep.has(id)){removeActor(a);queueActors.delete(id)}
 (queue||[]).slice(0,lowPower?2:3).forEach((q,i)=>{
  let a=queueActors.get(q.id);if(!a){a=createActor(q,1.48);queueActors.set(q.id,a)}
  const spots=[[-2.35,-4.9],[-2.35,-6.25],[1.95,-6.3]],p=spots[i]||spots.at(-1);a.root.position.set(p[0],0,p[1]);a.root.rotation.y=0;a.info=q
 })
}
function snapshot(){return window.Q17Bridge?.getMain3DSnapshot?.()||null}
function syncSnapshot(s,force=false){
 if(!s)return;
 const changed=!lastSnapshot||s.current?.id!==lastSnapshot.current?.id;
 if(changed||force)spawnCurrent(s.current);
 syncQueue(s.queue||[]);
 lastSnapshot=s;
 ambulance&&(ambulance.visible=s.weekIndex>=3);
 lateBarricades.forEach((o,i)=>o.visible=s.weekIndex>=4+i%2);
 weekProps.forEach(o=>o.visible=s.weekIndex>=5);
 const risk=clamp((s.infection-8)/24,0,1);
 scene.fog.near=lerp(14,10,risk);scene.fog.far=lerp(31,22,risk);
 scene.background.setHex(risk>.65?0x20191b:risk>.3?0x1b2021:0x172126);
 emergency.intensity=s.infection>=24?1.2+risk*2.2:0;
 badge.innerHTML='<b>Q-17 CHECKPOINT</b> · '+s.week+'주차 · 감염 '+s.infection+'%'
}
function pulseGate(action,intensity){
 for(const [k,l] of Object.entries(gateLights))if(l){l.material.emissiveIntensity=k===action?intensity:.25;l.scale.setScalar(k===action?1.18:1)}
}
function inspect(tool){
 effect={tool,until:performance.now()+(tool==='blood'?1150:tool==='uv'?1050:tool==='bag'?900:760)};
 if(tool==='uv')uvLight.intensity=3.4;
 if(tool==='temp'&&world.userData.tempHead)world.userData.tempHead.material.emissiveIntensity=2.0;
 if(tool==='blood'&&world.userData.analyzer)world.userData.analyzer.material.emissiveIntensity=2.2;
 if(tool==='id'&&world.userData.idScanner)world.userData.idScanner.material.emissiveIntensity=2.0;
 if(tool==='doc'&&world.userData.docPad)world.userData.docPad.material.emissiveIntensity=2.0;
 if(tool==='resp'&&world.userData.respSensor)world.userData.respSensor.material.emissiveIntensity=2.2;
}
const DECISION_PATHS={
 pass:[[0,.25],[-1.65,.45],[-4.65,.32],[-4.65,-2.1]],
 retest:[[0,.25],[1.65,.48],[4.1,.35],[4.1,-1.45]],
 quarantine:[[0,.25],[1.35,-.35],[1.8,-2.65],[4.65,-2.65],[4.65,-4.45]]
};
function pathPoint(points,p){
 if(!points?.length)return{x:0,z:0};
 const segs=[],lens=[];let total=0;
 for(let i=1;i<points.length;i++){const l=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lens.push(l);total+=l}
 let d=clamp(p,0,1)*total;
 for(let i=0;i<lens.length;i++){if(d<=lens[i]){const q=lens[i]?d/lens[i]:1;return{x:lerp(points[i][0],points[i+1][0],q),z:lerp(points[i][1],points[i+1][1],q)}}d-=lens[i]}
 const last=points[points.length-1];return{x:last[0],z:last[1]}
}
function walkPose(a,t,speed=1){
 if(!a?.host)return;
 const phase=t*.012*speed+hash(a.info?.id)*.001;a.host.position.y=Math.abs(Math.sin(phase))*.045;a.host.rotation.z=Math.sin(phase)*.018;a.host.rotation.x=Math.sin(phase*2)*.008
}
function idlePose(a,t){
 if(!a?.host)return;const phase=t*.0023+hash(a.info?.id)*.001;a.host.position.y=Math.sin(phase)*.012;a.host.rotation.z=Math.sin(phase*.8)*.006;a.host.rotation.x=0
}
function decide(action){
 if(!currentActor)return;decision={action,start:performance.now(),actor:currentActor,path:DECISION_PATHS[action]||DECISION_PATHS.pass};
 pulseGate(action,2.2)
}
window.addEventListener('q17-main3d',e=>{
 const d=e.detail||{};if(d.snapshot)syncSnapshot(d.snapshot,d.type==='case');
 if(d.type==='inspect')inspect(d.tool);
 if(d.type==='decision')decide(d.action)
});

function updateCurrent(t){
 if(!currentActor)return;
 const a=currentActor,s=lastSnapshot,c=s?.current||a.info;
 if(decision&&decision.actor===a){
  const p=clamp((t-decision.start)/930,0,1),pos=pathPoint(decision.path,p),ahead=pathPoint(decision.path,Math.min(1,p+.02));
  a.root.position.x=pos.x;a.root.position.z=pos.z;a.root.position.y=.02;a.root.rotation.y=Math.atan2(ahead.x-pos.x,ahead.z-pos.z);walkPose(a,t,1.25);
  if(p>=1)a.root.visible=false;return
 }
 a.root.visible=true;
 const enter=clamp((t-(a.enteredAt||t))/760,0,1),e=1-Math.pow(1-enter,2);
 const start=a.entryStart||{x:-2.15,z:-4.65},p1={x:-1.55,z:-3.05},p2={x:-1.05,z:-1.25};
 let pos;
 if(e<.42){const q=e/.42;pos={x:lerp(start.x,p1.x,q),z:lerp(start.z,p1.z,q)}}
 else if(e<.78){const q=(e-.42)/.36;pos={x:lerp(p1.x,p2.x,q),z:lerp(p1.z,p2.z,q)}}
 else{const q=(e-.78)/.22;pos={x:lerp(p2.x,0,q),z:lerp(p2.z,.25,q)}}
 a.root.position.x=pos.x;a.root.position.z=pos.z;a.root.position.y=.02;
 if(enter<1){const q2=Math.min(1,enter+.025),ahead=q2<.42?{x:lerp(start.x,p1.x,q2/.42),z:lerp(start.z,p1.z,q2/.42)}:q2<.78?{x:lerp(p1.x,p2.x,(q2-.42)/.36),z:lerp(p1.z,p2.z,(q2-.42)/.36)}:{x:lerp(p2.x,0,(q2-.78)/.22),z:lerp(p2.z,.25,(q2-.78)/.22)};a.root.rotation.y=Math.atan2(ahead.x-pos.x,ahead.z-pos.z);walkPose(a,t,1.05)}
 else{a.root.rotation.y=Math.sin(t*.0018)*.018;idlePose(a,t)}
 if(c?.cough&&enter>=1&&Math.sin(t*.006)>.72){a.host.rotation.z+=Math.sin(t*.028)*.045}
 if(Number(c?.temp)>=38.5&&enter>=1)a.root.rotation.y+=Math.sin(t*.018)*.012
}
function updateQueue(t){
 let i=0;for(const a of queueActors.values()){a.root.position.y=.01;idlePose(a,t+i*120);a.root.rotation.y=Math.sin(t*.0012+i)*.025;i++}
}
function updateEffects(t){
 const u=world.userData;
 if(t>effect.until){
  uvLight.intensity*=.86;if(uvLight.intensity<.03)uvLight.intensity=0;
  for(const [obj,base] of [[u.tempHead,.18],[u.analyzer,.12],[u.idScanner,.14],[u.docPad,.10],[u.respSensor,.10]])if(obj)obj.material.emissiveIntensity=lerp(obj.material.emissiveIntensity,base,.18);
  if(u.breathRing)u.breathRing.material.opacity=lerp(u.breathRing.material.opacity,0,.22);
  if(u.uvSpots)u.uvSpots.children.forEach(m=>m.material.opacity=lerp(m.material.opacity,0,.2));
  if(u.bagTray){u.bagTray.position.x=lerp(u.bagTray.position.x,2.18,.18);u.bagTray.rotation.y=lerp(u.bagTray.rotation.y,0,.18)}
  effect.tool=null
 }else if(effect.tool==='uv'){
  uvLight.intensity=2.7+Math.max(0,Math.sin(t*.018))*1.5;
  if(u.uvSpots){u.uvSpots.position.set(currentActor?.root.position.x||0,0,currentActor?.root.position.z||.25);u.uvSpots.children.forEach(m=>m.material.opacity=lastSnapshot?.current?.uv?.9:.08)}
 }else if(effect.tool==='temp'&&u.tempHead){
  u.tempHead.material.emissiveIntensity=1.3+Math.max(0,Math.sin(t*.025))*1.5
 }else if(effect.tool==='blood'&&u.analyzer){
  u.analyzer.material.emissiveIntensity=.8+Math.max(0,Math.sin(t*.02))*2.1
 }else if(effect.tool==='id'&&u.idScanner){
  u.idScanner.material.emissiveIntensity=.8+Math.max(0,Math.sin(t*.025))*2.0;if(u.scanBar)u.scanBar.material.emissiveIntensity=1.2+Math.max(0,Math.sin(t*.02))*1.4
 }else if(effect.tool==='doc'&&u.docPad){
  u.docPad.material.emissiveIntensity=.7+Math.max(0,Math.sin(t*.022))*2.0
 }else if(effect.tool==='resp'&&u.respSensor){
  u.respSensor.material.emissiveIntensity=.7+Math.max(0,Math.sin(t*.02))*2.2;
  if(u.breathRing){u.breathRing.position.x=(currentActor?.root.position.x||0)+.42;u.breathRing.position.z=(currentActor?.root.position.z||.25)+.06;u.breathRing.material.opacity=.35+Math.max(0,Math.sin(t*.018))*.55;u.breathRing.scale.setScalar(1+Math.max(0,Math.sin(t*.018))*.28)}
 }else if(effect.tool==='bag'&&u.bagTray){
  const p=clamp((effect.until-t)/900,0,1);u.bagTray.position.x=lerp(1.2,2.18,p);u.bagTray.rotation.y=Math.sin(t*.012)*.04
 }
 if(u.scanBar&&effect.tool!=='id')u.scanBar.material.emissiveIntensity=lerp(u.scanBar.material.emissiveIntensity,.18,.15);
 if(decision){
  const elapsed=t-decision.start;if(elapsed>1040){pulseGate('',.25);decision=null}else pulseGate(decision.action,1.2+Math.max(0,Math.sin(t*.024))*1.5)
 }
 const risk=lastSnapshot?.infection||0;if(risk>=24)emergency.intensity=1.4+Math.max(0,Math.sin(t*.009))*2.1
}
function resize(){
 const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(Math.round(r.width),Math.round(r.height),false);camera.aspect=r.width/r.height;
 if(camera.aspect<.9){camera.fov=52;camera.position.set(0,6.25,12.6);camera.lookAt(0,1.05,-1.55)}
 else{camera.fov=43;camera.position.set(0,5.7,9.3);camera.lookAt(0,1.1,-1.25)}
 camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(booth);resize();

function mainSceneVisible(){
 if(document.visibilityState==='hidden'||!canvas.offsetParent)return false;
 if(document.querySelector('.modal.show'))return false;
 if(document.getElementById('q17Isolation')?.classList.contains('show'))return false;
 if(document.getElementById('q17Camp')?.classList.contains('show'))return false;
 if(document.getElementById('q17Outbreak')?.classList.contains('show'))return false;
 return true
}
let lastSync=0;
function frame(t){
 if(!mainSceneVisible()){lastSync=t;requestAnimationFrame(frame);return}
 if(t-lastSync>300){syncSnapshot(snapshot());lastSync=t}
 updateCurrent(t);updateQueue(t);updateEffects(t);
 renderer.render(scene,camera);requestAnimationFrame(frame)
}
syncSnapshot(snapshot(),true);requestAnimationFrame(frame);

window.Q17Quarantine3D=Object.freeze({active:true,version:'22.1',scene,camera,renderer,sync:()=>syncSnapshot(snapshot(),true)});
