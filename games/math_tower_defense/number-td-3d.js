// Number TD 3D v2 - nonblocking mobile-safe loader
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const api=window.__numTD3D;
const canvas=document.getElementById('gameCanvas3d');
const box=canvas?.closest('.canvas-box');
const loading=document.getElementById('td3dLoading');
if(!api||!canvas||!box){const el=document.getElementById('td3dLoading');if(el)el.textContent='3D 연결 오류 · 2D 모드로 플레이할 수 있어요.';throw new Error('Number TD 3D bridge missing')}

const UNIT=1.05;
const MODEL_ROOT=new URL('../../assets/game/3d/',import.meta.url);
const modelUrl=p=>new URL(p,MODEL_ROOT).href;
const MODELS={
  SUB1:modelUrl('weapons/scifi-turrets/gatelng-gun-turret.glb'),
  DIV2:modelUrl('weapons/scifi-turrets/rail-gun-turret.glb'),
  DIV3:modelUrl('weapons/scifi-turrets/plasma-turret.glb'),
  ADD1:modelUrl('weapons/scifi-turrets/emp-turret.glb'),
  DIV5:modelUrl('weapons/scifi-turrets/missile-turret.glb'),
  blob:modelUrl('characters/monsters/ultimate-monsters-bundle/green-blob.glb'),
  spiky:modelUrl('characters/monsters/ultimate-monsters-bundle/green-spiky-blob.glb'),
  golem:modelUrl('characters/monsters/ultimate-monsters-bundle/goleling.glb'),
  golemE:modelUrl('characters/monsters/ultimate-monsters-bundle/goleling-evolved.glb'),
  ghost:modelUrl('characters/monsters/ultimate-monsters-bundle/ghost-skull.glb'),
  orc:modelUrl('characters/monsters/ultimate-monsters-bundle/orc-enemy.glb'),
  mushroom:modelUrl('characters/monsters/ultimate-monsters-bundle/mushroom-king.glb')
};
const TOWER_COLORS={SUB1:0xfb7185,DIV2:0x38bdf8,DIV3:0x22c55e,ADD1:0xfbbf24,DIV5:0xa78bfa};

let scene,camera,renderer,loader,clock,ready=false;
const cache=new Map(),towerNodes=new Map(),enemyNodes=new Map(),textNodes=new Map(),mixers=new Map();
let boardGroup,towerGroup,enemyGroup,fxGroup,uiGroup,coreGroup,hoverPlate,rangeRing;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const hitPoint=new THREE.Vector3();

function cellX(x){return (x-(api.GW-1)/2)*UNIT}
function cellZ(y){return (y-(api.GH-1)/2)*UNIT}
function pxX(px){return (px/api.CELL-(api.GW-1)/2-.5)*UNIT}
function pxZ(py){return (py/api.CELL-(api.GH-1)/2-.5)*UNIT}

function prep(obj){
  obj.traverse(n=>{
    if(!n.isMesh)return;
    n.castShadow=true;n.receiveShadow=true;
    const mats=Array.isArray(n.material)?n.material:[n.material];
    const clones=mats.map(src=>{const m=src.clone();m.roughness=Math.max(.48,m.roughness??.7);m.metalness=Math.min(.25,m.metalness??0);m.needsUpdate=true;return m});
    n.material=Array.isArray(n.material)?clones:clones[0];
  });
  return obj;
}
function normalize(obj,target=1){
  obj.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3()),base=Math.max(s.x,s.y,s.z)||1;
  obj.scale.multiplyScalar(target/base);obj.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(obj);const c=b.getCenter(new THREE.Vector3());
  obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b.min.y;
  return obj;
}
function load(key,url,timeoutMs=7000){return new Promise(resolve=>{let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};const timer=setTimeout(()=>{console.warn('[NumberTD3D] asset timeout',key,url);finish(null)},timeoutMs);loader.load(url,g=>{clearTimeout(timer);cache.set(key,g);finish(g)},undefined,e=>{clearTimeout(timer);console.warn('[NumberTD3D] fallback',key,e);finish(null)})})}
function cloneModel(key,target=1,skinned=false){
  const g=cache.get(key);if(!g)return null;
  const obj=prep(g.scene.clone(true));
  return normalize(obj,target);
}
function meshBox(w,h,d,color,rough=.86){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.03}));
  m.castShadow=true;m.receiveShadow=true;return m
}
function makeTextSprite(text,color='#fff',small=''){
  const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
  x.clearRect(0,0,256,128);x.fillStyle='rgba(3,9,20,.90)';x.beginPath();x.roundRect(12,10,232,106,26);x.fill();
  x.strokeStyle=color;x.lineWidth=7;x.stroke();
  x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font='900 54px system-ui';x.fillText(String(text),128,61);
  if(small){x.fillStyle=color;x.font='900 19px system-ui';x.fillText(small,128,96)}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(1.4,.7,1);s.renderOrder=30;return s
}
function makeOpSprite(text,color){
  const c=document.createElement('canvas');c.width=160;c.height=80;const x=c.getContext('2d');x.fillStyle='rgba(3,9,20,.86)';x.beginPath();x.roundRect(4,4,152,72,22);x.fill();x.strokeStyle=color;x.lineWidth=5;x.stroke();x.fillStyle='#fff';x.font='900 34px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,80,42);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(.85,.42,1);s.renderOrder=22;return s
}
function makeRing(radius,color,opacity=.35){
  const m=new THREE.Mesh(new THREE.RingGeometry(Math.max(.02,radius-.045),radius,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.y=.035;return m
}
function buildBoard(){
  boardGroup.clear();uiGroup.clear();
  const floor=meshBox(api.GW*UNIT+.7,.12,api.GH*UNIT+.7,0x07111f,.98);floor.position.y=-.08;boardGroup.add(floor);
  const pathSet=new Set(api.PATH.map(p=>p.x+','+p.y));
  for(let y=0;y<api.GH;y++)for(let x=0;x<api.GW;x++){
    const path=pathSet.has(x+','+y),tile=meshBox(UNIT*.94,path?.12:.07,UNIT*.94,path?0x0f3857:((x+y)%2?0x0a1828:0x0c1d30),.9);
    tile.position.set(cellX(x),path?.035:.012,cellZ(y));boardGroup.add(tile);
    if(path){const line=makeRing(.34,0x38bdf8,.17);line.position.set(cellX(x),.105,cellZ(y));boardGroup.add(line)}
  }
  for(let x=0;x<=api.GW;x++){const g=meshBox(.018,.018,api.GH*UNIT,0x18324d);g.position.set((x-api.GW/2)*UNIT,.055,0);boardGroup.add(g)}
  for(let y=0;y<=api.GH;y++){const g=meshBox(api.GW*UNIT,.018,.018,0x18324d);g.position.set(0,.055,(y-api.GH/2)*UNIT);boardGroup.add(g)}
  const start=api.PATH[0],end=api.PATH[api.PATH.length-1];
  const portal=new THREE.Group(),r1=makeRing(.43,0x67e8f9,.9),r2=makeRing(.29,0xffffff,.45);r1.position.y=.12;r2.position.y=.13;portal.add(r1,r2);portal.position.set(cellX(start.x),0,cellZ(start.y));boardGroup.add(portal);
  coreGroup=new THREE.Group();const base=new THREE.Mesh(new THREE.CylinderGeometry(.48,.58,.28,8),new THREE.MeshStandardMaterial({color:0x123e63,roughness:.42,metalness:.28}));base.position.y=.16;coreGroup.add(base);
  const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color:0x38bdf8,emissive:0x0ea5e9,emissiveIntensity:1.7,roughness:.22,metalness:.18}));orb.position.y=.64;coreGroup.add(orb);
  const coreRing=new THREE.Mesh(new THREE.TorusGeometry(.49,.045,10,36),new THREE.MeshBasicMaterial({color:0x67e8f9}));coreRing.rotation.x=Math.PI/2;coreRing.position.y=.54;coreGroup.add(coreRing);coreGroup.userData.orb=orb;coreGroup.userData.ring=coreRing;
  coreGroup.position.set(cellX(end.x),0,cellZ(end.y));boardGroup.add(coreGroup);
  hoverPlate=meshBox(UNIT*.9,.045,UNIT*.9,0x22c55e);hoverPlate.material.transparent=true;hoverPlate.material.opacity=.28;hoverPlate.visible=false;uiGroup.add(hoverPlate);
  rangeRing=makeRing(1,0xffffff,.18);rangeRing.visible=false;uiGroup.add(rangeRing);
}
function enemyKind(e){
  const n=e.max;
  if(n>=35)return 'orc';
  if(n>=25)return 'golemE';
  if(api.isPrime(n))return 'ghost';
  if(n%5===0)return 'golem';
  if(n%3===0)return 'spiky';
  if(n%2===0)return 'blob';
  return 'mushroom';
}
function actionFor(g){
  const clips=g?.animations||[];if(!clips.length)return null;
  return clips.find(c=>/walk/i.test(c.name))||clips.find(c=>/run/i.test(c.name))||clips.find(c=>/idle/i.test(c.name))||clips[0]
}
function createEnemyNode(e){
  const key=enemyKind(e),root=new THREE.Group(),g=cache.get(key),model=cloneModel(key,key==='orc'?1.05:key==='golemE'?1:.82,true);
  if(model){root.add(model);if(g?.animations?.length){const mixer=new THREE.AnimationMixer(model),clip=actionFor(g);if(clip){const a=mixer.clipAction(clip);a.play()}mixers.set(e,mixer)}}
  else{const fallback=new THREE.Mesh(new THREE.IcosahedronGeometry(.35,1),new THREE.MeshStandardMaterial({color:parseInt(api.eColor(e.hp).slice(1),16),emissive:0x07111f}));fallback.position.y=.35;root.add(fallback)}
  const halo=makeRing(.46,parseInt(api.eColor(e.hp).slice(1),16),.45);root.add(halo);root.userData.halo=halo;
  const label=makeTextSprite(e.hp,api.eColor(e.hp),api.isPrime(e.hp)?'소수':'');label.position.y=1.17;root.add(label);root.userData.label=label;root.userData.value=e.hp;
  enemyGroup.add(root);enemyNodes.set(e,root);return root
}
function removeEnemy(e,node){enemyGroup.remove(node);enemyNodes.delete(e);const mixer=mixers.get(e);if(mixer){mixer.stopAllAction();mixers.delete(e)}}
function createTowerNode(t){
  const root=new THREE.Group(),color=TOWER_COLORS[t.id]||0xffffff;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.43,.51,.18,10),new THREE.MeshStandardMaterial({color:0x14263b,roughness:.45,metalness:.28}));base.position.y=.11;root.add(base);
  const ring=makeRing(.48,color,.62);ring.position.y=.205;root.add(ring);
  const model=cloneModel(t.id,1.0,false);if(model){model.position.y=.2;root.add(model);root.userData.model=model}else{const f=meshBox(.45,.6,.45,color,.4);f.position.y=.5;root.add(f)}
  const op=makeOpSprite(t.op,t.color);op.position.y=1.25;root.add(op);
  towerGroup.add(root);towerNodes.set(t,root);return root
}
function updateTowerRotation(t,node){
  const shot=api.state.shots.find(s=>Math.abs(s.x1-t.px)<1&&Math.abs(s.y1-t.py)<1);
  if(!shot)return;const tx=pxX(shot.x2),tz=pxZ(shot.y2),dx=tx-node.position.x,dz=tz-node.position.z;if(Math.hypot(dx,dz)>.01)node.rotation.y=Math.atan2(dx,dz)
}
function syncTowers(){
  const live=new Set(api.state.towers);for(const [t,n] of [...towerNodes])if(!live.has(t)){towerGroup.remove(n);towerNodes.delete(t)}
  for(const t of api.state.towers){let n=towerNodes.get(t)||createTowerNode(t);n.position.set(cellX(t.x),.07,cellZ(t.y));const grow=1+t.level*.055;n.scale.setScalar(grow);updateTowerRotation(t,n)}
}
function syncEnemies(dt,time){
  const live=new Set(api.state.enemies);for(const [e,n] of [...enemyNodes])if(!live.has(e))removeEnemy(e,n);
  for(const e of api.state.enemies){
    let n=enemyNodes.get(e)||createEnemyNode(e);n.position.set(pxX(e.px),.1,pxZ(e.py));
    const next=api.PATH[Math.min(e.seg+1,api.PATH.length-1)];if(next){const dx=cellX(next.x)-n.position.x,dz=cellZ(next.y)-n.position.z;if(Math.hypot(dx,dz)>.02)n.rotation.y=Math.atan2(dx,dz)}
    if(n.userData.value!==e.hp){n.remove(n.userData.label);n.userData.label.material.map.dispose();n.userData.label.material.dispose();const label=makeTextSprite(e.hp,api.eColor(e.hp),api.isPrime(e.hp)?'소수':'');label.position.y=1.17;n.add(label);n.userData.label=label;n.userData.value=e.hp}
    const col=parseInt(api.eColor(e.hp).slice(1),16);n.userData.halo.material.color.setHex(col);n.userData.halo.rotation.z=time*.35;
    if(e.flash>0)n.scale.setScalar(1+Math.sin(time*36)*.08);else n.scale.lerp(new THREE.Vector3(1,1,1),.2)
    mixers.get(e)?.update(dt*Math.max(1,api.state.speed*.7));
  }
}
function clearGroup(g){while(g.children.length){const c=g.children[g.children.length-1];g.remove(c)}}
function syncShots(){
  clearGroup(fxGroup);
  for(const s of api.state.shots){
    const a=new THREE.Vector3(pxX(s.x1),.82,pxZ(s.y1)),b=new THREE.Vector3(pxX(s.x2),.7,pxZ(s.y2));
    const geom=new THREE.BufferGeometry().setFromPoints([a,b]),mat=new THREE.LineBasicMaterial({color:s.color,transparent:true,opacity:Math.min(1,s.life/.1)});
    const line=new THREE.Line(geom,mat);fxGroup.add(line);
    const orb=new THREE.Mesh(new THREE.SphereGeometry(.07,8,8),new THREE.MeshBasicMaterial({color:s.color}));orb.position.copy(b);fxGroup.add(orb)
  }
}
function syncTexts(){
  const live=new Set(api.state.texts);for(const [t,s] of [...textNodes])if(!live.has(t)){uiGroup.remove(s);s.material.map.dispose();s.material.dispose();textNodes.delete(t)}
  for(const t of api.state.texts){let s=textNodes.get(t);if(!s){s=makeTextSprite(t.text,t.color);s.scale.multiplyScalar(.72);uiGroup.add(s);textNodes.set(t,s)}s.position.set(pxX(t.x),1.72,pxZ(t.y));s.material.opacity=Math.max(0,Math.min(1,t.life))}
}
function syncSelection(){
  const st=api.state,sel=st.selectedBuilt||(st.selectedTower&&st.hover?{...api.TOWERS[st.selectedTower],x:st.hover.x,y:st.hover.y}:null);
  if(sel){rangeRing.visible=true;rangeRing.position.set(cellX(sel.x),.06,cellZ(sel.y));const r=sel.range*UNIT;rangeRing.scale.set(r,r,r);rangeRing.material.color.set(sel.color||'#fff')}else rangeRing.visible=false;
  if(st.hover&&st.selectedTower){const {x,y}=st.hover,def=api.TOWERS[st.selectedTower],blocked=api.isPathCell(x,y)||api.towerAt(x,y)||st.money<def.cost;hoverPlate.visible=true;hoverPlate.position.set(cellX(x),.075,cellZ(y));hoverPlate.material.color.setHex(blocked?0xfb7185:0x22c55e)}else hoverPlate.visible=false
}
function syncCore(time){
  if(!coreGroup)return;const pct=Math.max(0,api.state.lives/api.state.maxLives);coreGroup.userData.orb.material.color.setHSL(.52*pct,.85,.55);coreGroup.userData.orb.material.emissiveIntensity=.8+1.5*pct;coreGroup.userData.ring.rotation.z=time*.8;coreGroup.userData.orb.scale.setScalar(1+Math.sin(time*3)*.05)
}
function pointerCell(ev){
  const r=canvas.getBoundingClientRect();pointer.x=((ev.clientX-r.left)/r.width)*2-1;pointer.y=-((ev.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);if(!raycaster.ray.intersectPlane(ground,hitPoint))return null;
  const x=Math.round(hitPoint.x/UNIT+(api.GW-1)/2),y=Math.round(hitPoint.z/UNIT+(api.GH-1)/2);return{x,y}
}
canvas.addEventListener('pointermove',e=>{if(!ready)return;const p=pointerCell(e);if(p&&p.x>=0&&p.y>=0&&p.x<api.GW&&p.y<api.GH)api.setHover(p.x,p.y);else api.setHover(null,null)});
canvas.addEventListener('pointerleave',()=>api.setHover(null,null));
canvas.addEventListener('pointerdown',e=>{if(!ready)return;const p=pointerCell(e);if(p)api.interactCell(p.x,p.y)});

function resize(){
  if(!renderer||!camera)return;const r=box.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
  const aspect=Math.max(.55,r.width/Math.max(1,r.height)),boardW=api.GW*UNIT,boardD=api.GH*UNIT;
  const portrait=aspect<1;
  camera.fov=portrait?48:42;camera.aspect=aspect;camera.updateProjectionMatrix();
  const d=portrait?18.6:16.2;camera.position.set(portrait?10.2:11.8,portrait?16.5:14.5,portrait?15.5:13.2);camera.lookAt(0,0,0);camera.far=80;camera.updateProjectionMatrix()
}
async function init(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x020713);scene.fog=new THREE.Fog(0x020713,20,42);
  camera=new THREE.PerspectiveCamera(42,1,.05,80);renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  loader=new GLTFLoader();clock=new THREE.Clock();
  scene.add(new THREE.HemisphereLight(0x9fd8ff,0x07111f,2.4));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-8,14,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;scene.add(sun);
  const rim=new THREE.DirectionalLight(0x7c3aed,1.1);rim.position.set(9,5,-9);scene.add(rim);
  boardGroup=new THREE.Group();towerGroup=new THREE.Group();enemyGroup=new THREE.Group();fxGroup=new THREE.Group();uiGroup=new THREE.Group();scene.add(boardGroup,towerGroup,enemyGroup,fxGroup,uiGroup);
  buildBoard();resize();addEventListener('resize',resize);
  ready=true;box.classList.add('td3d-ready');
  if(loading)loading.textContent='3D 모델 불러오는 중…';
  requestAnimationFrame(loop);
  const results=await Promise.allSettled(Object.entries(MODELS).map(([k,u])=>load(k,u)));
  // Recreate any fallback actors now that real models are available.
  for(const [t,n] of [...towerNodes]){towerGroup.remove(n);towerNodes.delete(t)}
  for(const [e,n] of [...enemyNodes])removeEnemy(e,n);
  loading?.classList.add('done');
  console.info('[NumberTD3D] assets ready',results.length,cache.size)
}
function loop(){
  requestAnimationFrame(loop);const dt=Math.min(.05,clock.getDelta()),time=performance.now()/1000;
  syncTowers();syncEnemies(dt,time);syncShots();syncTexts();syncSelection();syncCore(time);
  renderer.render(scene,camera)
}
init().catch(err=>{console.error('[NumberTD3D]',err);if(loading)loading.textContent='3D 로딩 실패 · 2D 모드로 계속 플레이할 수 있어요.'});
