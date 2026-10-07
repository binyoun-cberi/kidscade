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
@media(max-width:680px){#q17Main3D{bottom:255px;height:calc(100% - 255px)}.booth.q17-main3d>.speech{top:39px;right:8px;max-width:145px;font-size:11px;padding:7px 8px}.q17-main3d-badge{font-size:7px;padding:4px 5px}}
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

 // scanner arch
 box(world,-1.35,0,.18,.13,2.75,.16,0x667379);box(world,1.35,0,.18,.13,2.75,.16,0x667379);box(world,0,2.62,.18,2.83,.13,.16,0x77858b);
 const scanBar=box(world,0,2.42,.12,2.4,.08,.06,0x5f777e);scanBar.material=glow(0x82d2de,.18);
 world.userData.scanBar=scanBar;world.userData.analyzer=analyzer;world.userData.tempHead=tempHead;

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
 gateLights.quarantine=gate(4.65,-4.45,'고위험 격리',0xc34f56);

 // lane dividers and security furniture
 for(const p of [[-3.0,-3.7],[-3.0,-1.0],[3.0,-3.7],[3.0,-1.0]])addAsset(world,A.barrier,[p[0],0,p[1]],1.05,0xc0963f,.42,Math.PI/2);
 for(const p of [[-5.5,-.8],[5.5,-.3]])addAsset(world,A.crate,[p[0],0,p[1]],.65,0x8d6947,.36,0);

 addAsset(world,A.ambulance,[-5.3,0,-7.1],2.55,0xe4e8e4,.22,Math.PI/2).then(o=>{ambulance=o;if(o)o.visible=false});
 for(const p of [[-5.3,-4.3],[5.3,-5.1],[-4.8,-5.25]])addAsset(world,A.barrier,[p[0],0,p[1]],1.12,0xc0913c,.48,0).then(o=>{if(o){o.visible=false;lateBarricades.push(o)}});
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
 currentActor=createActor(info,1.78);currentActor.root.position.set(-2.15,0,-4.35);currentActor.root.rotation.y=0;
 currentActor.enteredAt=performance.now();currentActor.epoch=caseEpoch;decision=null
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
 effect={tool,until:performance.now()+(tool==='blood'?1150:tool==='uv'?1050:760)};
 if(tool==='uv')uvLight.intensity=3.4;
 if(tool==='temp'&&world.userData.tempHead)world.userData.tempHead.material.emissiveIntensity=2.0;
 if(tool==='blood'&&world.userData.analyzer)world.userData.analyzer.material.emissiveIntensity=2.2;
}
function decide(action){
 if(!currentActor)return;decision={action,start:performance.now(),actor:currentActor};
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
  const p=clamp((t-decision.start)/620,0,1),ease=1-Math.pow(1-p,3);
  const targets={pass:[-4.65,-2.1],retest:[4.1,-1.45],quarantine:[4.65,-4.45]},to=targets[decision.action]||[0,-3];
  a.root.position.x=lerp(0,to[0],ease);a.root.position.z=lerp(.25,to[1],ease);
  a.root.rotation.y=Math.atan2(to[0]-a.root.position.x,to[1]-a.root.position.z);
  if(p>=1)a.root.visible=false;return
 }
 a.root.visible=true;
 const enter=clamp((t-(a.enteredAt||t))/480,0,1),e=1-Math.pow(1-enter,3);
 a.root.position.x=lerp(-2.15,0,e);a.root.position.z=lerp(-4.35,.25,e);
 const idle=Math.sin(t*.0025+hash(c?.id)*.001);
 a.root.position.y=.02+idle*.025;
 a.root.rotation.y=idle*.018;
 if(c?.cough&&Math.sin(t*.006)> .72){a.root.rotation.z=Math.sin(t*.028)*.045;a.root.position.x+=.035}else a.root.rotation.z=0;
 if(Number(c?.temp)>=38.5)a.root.rotation.y+=Math.sin(t*.018)*.012
}
function updateQueue(t){
 let i=0;for(const a of queueActors.values()){a.root.position.y=.01+Math.sin(t*.0017+i*.9)*.018;a.root.rotation.y=Math.sin(t*.0012+i)*.025;i++}
}
function updateEffects(t){
 if(t>effect.until){
  uvLight.intensity*=.86;if(uvLight.intensity<.03)uvLight.intensity=0;
  if(world.userData.tempHead)world.userData.tempHead.material.emissiveIntensity=lerp(world.userData.tempHead.material.emissiveIntensity,.18,.18);
  if(world.userData.analyzer)world.userData.analyzer.material.emissiveIntensity=lerp(world.userData.analyzer.material.emissiveIntensity,.12,.18);
  effect.tool=null
 }else if(effect.tool==='uv'){
  uvLight.intensity=2.7+Math.max(0,Math.sin(t*.018))*1.5
 }else if(effect.tool==='temp'&&world.userData.tempHead){
  world.userData.tempHead.material.emissiveIntensity=1.3+Math.max(0,Math.sin(t*.025))*1.5
 }else if(effect.tool==='blood'&&world.userData.analyzer){
  world.userData.analyzer.material.emissiveIntensity=.8+Math.max(0,Math.sin(t*.02))*2.1
 }
 if(decision){
  const elapsed=t-decision.start;if(elapsed>760){pulseGate('',.25);decision=null}else pulseGate(decision.action,1.2+Math.max(0,Math.sin(t*.024))*1.5)
 }
 const risk=lastSnapshot?.infection||0;if(risk>=24)emergency.intensity=1.4+Math.max(0,Math.sin(t*.009))*2.1
}
function resize(){
 const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(Math.round(r.width),Math.round(r.height),false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()
}
new ResizeObserver(resize).observe(booth);resize();

let lastSync=0;
function frame(t){
 if(t-lastSync>300){syncSnapshot(snapshot());lastSync=t}
 updateCurrent(t);updateQueue(t);updateEffects(t);
 renderer.render(scene,camera);requestAnimationFrame(frame)
}
syncSnapshot(snapshot(),true);requestAnimationFrame(frame);

window.Q17Quarantine3D=Object.freeze({active:true,version:'22.0',scene,camera,renderer,sync:()=>syncSnapshot(snapshot(),true)});
