import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const ROOT=new URL('../../assets/game/',import.meta.url);
const A={
 tent:'3d/nature/kenney-nature-kit/tent-detailed-open.glb',
 tentSmall:'3d/nature/kenney-nature-kit/tent-small-open.glb',
 bed:'3d/nature/kenney-nature-kit/bed.glb',
 fence:'3d/city/kenney-city-kit-roads/construction-fence.glb',
 light:'3d/city/kenney-city-kit-roads/construction-light.glb',
 barrier:'3d/city/kenney-city-kit-roads/construction-barrier.glb',
 ambulance:'3d/vehicles/kenney-car-kit/ambulance.glb',
 turret:'3d/weapons/scifi-turrets/gatelng-gun-turret.glb',
 crate:'3d/city/poly-pizza-city-pack/box.glb',
 maleA:'characters/people/character-male-a.glb',
 maleB:'characters/people/character-male-b.glb',
 maleC:'characters/people/character-male-c.glb',
 femaleA:'characters/people/character-female-a.glb',
 femaleB:'characters/people/character-female-b.glb',
 femaleC:'characters/people/character-female-c.glb'
};
const PERSON=[A.femaleA,A.maleA,A.femaleB,A.maleB,A.femaleC,A.maleC];
const loader=new GLTFLoader(),cache=new Map(),views=[];
const url=p=>new URL(p,ROOT).href;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function loadModel(path){
 if(!cache.has(path))cache.set(path,new Promise(resolve=>loader.load(url(path),g=>resolve(g.scene),undefined,()=>resolve(null))));
 return cache.get(path)
}
function cloneMaterials(o){
 o.traverse(n=>{if(!n.isMesh)return;if(Array.isArray(n.material))n.material=n.material.map(m=>m?.clone?.()||m);else if(n.material)n.material=n.material.clone?.()||n.material;n.castShadow=n.receiveShadow=true});
}
function fit(o,target){
 o.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3()),m=Math.max(s.x,s.y,s.z)||1;
 o.scale.multiplyScalar(target/m);o.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(o);
 const c=b.getCenter(new THREE.Vector3());o.position.x-=c.x;o.position.z-=c.z;o.position.y-=b.min.y;return o
}
function tint(o,color,mix=.4,emissive=0){
 const col=new THREE.Color(color);
 o.traverse(n=>{if(!n.isMesh)return;const ms=Array.isArray(n.material)?n.material:[n.material];for(const m of ms){if(!m)continue;if(m.color)m.color.lerp(col,mix);if('roughness'in m)m.roughness=clamp(m.roughness??.7,.35,.95);if(emissive&&m.emissive){m.emissive.setHex(color);m.emissiveIntensity=emissive}m.needsUpdate=true}})
}
async function model(path,target=1,color=null,mix=.35){
 const base=await loadModel(path);if(!base)return null;const o=base.clone(true);cloneMaterials(o);fit(o,target);if(color!==null)tint(o,color,mix);return o
}
function mat(color,rough=.82,metal=.04){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function box(parent,x,y,z,w,h,d,color,rough=.82){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,rough));m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m
}
function plane(parent,w,d,color,y=0){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat(color,.96));m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;parent.add(m);return m
}
function label(text,color='#dfe8e4'){
 const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');
 x.fillStyle='rgba(5,10,12,.78)';x.fillRect(0,0,c.width,c.height);x.strokeStyle='rgba(160,184,174,.45)';x.lineWidth=3;x.strokeRect(2,2,c.width-4,c.height-4);
 x.fillStyle=color;x.font='800 31px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,48);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(3.2,.6,1);return s
}
function ring(color){
 const m=new THREE.Mesh(new THREE.RingGeometry(.5,.62,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
 m.rotation.x=-Math.PI/2;m.position.y=.025;return m
}
function personColor(info){
 if(info.threat)return info.phase==='zombie'?0x7e9c67:0xc08a49;
 if(info.status==='bitten')return 0xd6a544;
 if(info.status==='positive'||info.status==='turning'||info.status==='exposed')return 0xd16066;
 if(info.status==='zombie')return 0x738d5d;
 const p=[0x4e88a6,0x6f9a68,0xb47a48,0x8a6ca8,0x4e8e82,0x9a6a6a];return p[(info.id||0)%p.length]
}
function fallbackActor(color){
 const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CapsuleGeometry(.23,.62,5,10),mat(color,.72)),head=new THREE.Mesh(new THREE.SphereGeometry(.23,16,10),mat(0xe6c2a5,.78));
 body.position.y=.65;head.position.y=1.25;g.add(body,head);return g
}
async function populateActor(group,path,color,target=1.55){
 const o=await model(path,target,color,.48);if(!o||!group.isConnected&&group.parent===null)return;
 group.clear();group.add(o)
}
function setInfo(root,info){
 root.userData.info=info;
 root.traverse(n=>{if(n.isMesh)n.userData.actorRoot=root})
}

class View{
 constructor(canvas,kind){
  this.canvas=canvas;this.kind=kind;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(kind==='camp'?0x111b18:0x10161a);
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.camera=new THREE.PerspectiveCamera(kind==='camp'?40:42,16/9,.1,100);this.root=new THREE.Group();this.dynamic=new THREE.Group();this.scene.add(this.root,this.dynamic);
  this.scene.add(new THREE.HemisphereLight(kind==='camp'?0xcadbc8:0xc3d4df,kind==='camp'?0x263025:0x1b2024,1.25));
  const sun=new THREE.DirectionalLight(0xffe0af,2.1);sun.position.set(-8,15,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);this.scene.add(sun);
  const fill=new THREE.DirectionalLight(kind==='camp'?0x78a6a1:0x82aeda,.75);fill.position.set(8,8,-8);this.scene.add(fill);
  if(kind==='camp'){this.camera.position.set(0,15.5,15);this.camera.lookAt(0,0,0);this.buildCamp()}
  else{this.camera.position.set(0,12.2,13.8);this.camera.lookAt(0,.3,0);this.buildIsolation()}
  new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();this.bindRaycast();views.push(this)
 }
 resize(){
  const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;const w=Math.max(320,Math.round(r.width)),h=Math.max(180,Math.round(r.height));
  this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()
 }
 async addAsset(path,pos,scale,color,mix=.32,rot=0){
  const o=await model(path,scale,color,mix);if(!o)return;o.position.add(new THREE.Vector3(...pos));o.rotation.y=rot;this.root.add(o);return o
 }
 buildCamp(){
  plane(this.root,30,15,0x344239);plane(this.root,30,3.1,0x55564e,.012);
  plane(this.root,9.2,12.8,0x3d4d3e,.018).position.x=-9.7;
  plane(this.root,9.3,12.8,0x4b4938,.018).position.x=0;
  plane(this.root,8.8,12.8,0x38423e,.018).position.x=9.8;
  box(this.root,-10.2,0,-4.3,5.5,1.75,2.2,0x7b816e);box(this.root,-10.2,1.75,-4.3,5.5,.16,2.2,0xb5b7a6);
  box(this.root,-.2,0,-4.1,5.2,2.15,2.7,0x69674f);box(this.root,-.2,2.15,-4.1,5.2,.18,2.7,0x8b805c);
  box(this.root,10.1,0,-4.2,3.2,2.45,2.1,0x59665f);box(this.root,10.1,2.45,-4.2,3.2,.16,2.1,0x78877f);
  const l1=label('주거 · 의무');l1.position.set(-9.7,3,-5.1);this.root.add(l1);
  const l2=label('배급 · 작업','#f0d998');l2.position.set(0,3.2,-5.1);this.root.add(l2);
  const l3=label('경계 · 출입','#ffb4ad');l3.position.set(9.7,3.35,-5.1);this.root.add(l3);
  for(let i=0;i<9;i++)this.addAsset(A.fence,[13.8,0,-5.7+i*1.45],1.25,0x7e8b83,.3,Math.PI/2);
  for(let i=0;i<5;i++)this.addAsset(A.fence,[-14+i*1.5,0,6.4],1.25,0x7e8b83,.3,0);
  this.addAsset(A.tent,[-11,0,2.6],2.2,0x8e7b52,.52,.15);this.addAsset(A.tentSmall,[-7.5,0,3.6],1.8,0x6f7658,.45,-.08);
  this.addAsset(A.ambulance,[-7.5,0,-2.7],2.7,0xe9ece6,.25,Math.PI*.5);
  this.addAsset(A.turret,[8.1,0,.7],1.55,0x76817d,.35,-Math.PI*.5);
  for(const p of [[-2.3,2.7],[.1,3.3],[2.1,2.4]])this.addAsset(A.crate,[p[0],0,p[1]],.78,0xa87542,.44,Math.random()*.3);
  for(const p of [[6.6,-2.4],[11.8,2.7]])this.addAsset(A.light,[p[0],0,p[1]],1.9,0xf2c453,.25);
  for(const p of [[8.7,4.9],[10.2,4.9],[11.7,4.9]])this.addAsset(A.barrier,[p[0],0,p[1]],1.3,0xc28d36,.45,0);
  const safe=new THREE.Mesh(new THREE.CircleGeometry(1.25,40),new THREE.MeshBasicMaterial({color:0x78c28a,transparent:true,opacity:.23,side:THREE.DoubleSide}));safe.rotation.x=-Math.PI/2;safe.position.set(-5.8,.03,-.2);this.root.add(safe)
 }
 buildIsolation(){
  plane(this.root,20,10,0x394149);
  const wall=0x4d5961;box(this.root,0,0,-5,20,2.8,.25,wall);box(this.root,-10,0,0,.25,2.8,10,wall);box(this.root,10,0,0,.25,2.8,10,wall);
  box(this.root,0,0,0,.18,2.2,10,0x727b80);box(this.root,0,0,0,.22,.18,10,0xc9a64b);
  plane(this.root,9.7,9.6,0x354951,.015).position.x=-5.05;plane(this.root,9.7,9.6,0x4b3033,.016).position.x=5.05;
  const a=label('A 관찰 · 검사실','#a8d8ea');a.position.set(-5,3,-4.55);this.root.add(a);
  const b=label('B 고위험 격리실','#ffaaa9');b.position.set(5,3,-4.55);this.root.add(b);
  const slotsA=[[-7.4,-2.4],[-3,-2.4],[-7.4,2.5],[-3,2.5]],slotsB=[[3.2,-1.8],[6.9,1.8]];
  slotsA.forEach(p=>this.addAsset(A.bed,[p[0],0,p[1]],1.75,0xa9c7ce,.35,Math.PI/2));
  slotsB.forEach(p=>this.addAsset(A.bed,[p[0],0,p[1]],1.75,0xc99898,.45,Math.PI/2));
  this.addAsset(A.light,[-8.8,0,-3.9],1.7,0x92d9ff,.28);this.addAsset(A.light,[8.8,0,-3.9],1.7,0xff7379,.5);
  this.addAsset(A.barrier,[-.8,0,4.1],1.2,0xd1ad49,.42,Math.PI/2);this.addAsset(A.barrier,[.8,0,4.1],1.2,0xd1ad49,.42,Math.PI/2)
 }
 bindRaycast(){
  if(this.kind!=='camp')return;const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
  this.canvas.addEventListener('pointerdown',e=>{
   const r=this.canvas.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,this.camera);
   const hit=ray.intersectObjects(this.dynamic.children,true).find(h=>{let p=h.object;while(p&&!p.userData?.info)p=p.parent;return !!p});
   if(!hit)return;let p=hit.object;while(p&&!p.userData?.info)p=p.parent;if(!p)return;const info=p.userData.info,box=document.getElementById('q17CampFocus');if(!box)return;
   const danger=info.threat?(info.phase==='zombie'?'좀비':'감염 의심'):(info.status==='bitten'?'물림 · 변이 진행':info.task||'정상');
   box.classList.add('show');box.innerHTML='<b>'+String(info.name||'미확인')+'</b><span>'+(info.threat?'위험 개체':String(info.role||'생존자'))+'</span><small>'+danger+'</small>'
  })
 }
 syncCamp(){
  const api=window.Q17Surveillance;if(!api?.snapshot)return;const s=api.snapshot(),items=[];
  s.residents.forEach(r=>{if(r.status!=='lost'&&r.status!=='zombie')items.push({key:'r'+r.id,...r,threat:false})});
  s.threats.forEach(t=>items.push({key:'t'+t.id,...t,threat:true}));
  this.syncPeople(items,'camp')
 }
 syncIsolation(){
  const api=window.Q17Outbreak;if(!api?.getIsolationSnapshot)return;const snap=api.getIsolationSnapshot(),byRoom={A:0,B:0};
  const items=snap.map((d,i)=>{const room=d.room||'A',slot=byRoom[room]++;return{key:'i'+d.id,...d,room,slot,threat:d.status==='zombie'}});this.syncPeople(items,'isolation')
 }
 syncPeople(items,mode){
  const keep=new Set(items.map(x=>x.key));
  for(const g of [...this.dynamic.children])if(!keep.has(g.userData.key))this.dynamic.remove(g);
  for(const info of items){
   let g=this.dynamic.children.find(x=>x.userData.key===info.key);
   if(!g){
    g=new THREE.Group();g.userData.key=info.key;g.add(fallbackActor(personColor(info)));g.add(ring(info.threat?0xe05b60:0x7cc996));this.dynamic.add(g);
    const idx=(Number(info.id)||info.key.charCodeAt(info.key.length-1)||0)%PERSON.length;populateActor(g,PERSON[idx],personColor(info),1.5).then(()=>{if(g.parent){g.add(ring(info.threat?0xe05b60:0x7cc996));setInfo(g,info)}})
   }
   setInfo(g,info);
   if(mode==='camp'){
    const tx=(Number(info.x)-50)*.27,tz=(Number(info.y)-50)*.12;g.position.x+=(tx-g.position.x)*.72;g.position.z+=(tz-g.position.z)*.72;g.position.y=.02;
    const d=Number(info.dir)||1;g.rotation.y=d<0?Math.PI*.5:-Math.PI*.5
   }else{
    const slotsA=[[-7.2,-.5],[-3.3,-.5],[-7.2,3],[-3.3,3]],slotsB=[[3.4,-.3],[6.8,2.7]],p=(info.room==='B'?slotsB:slotsA)[info.slot]||[0,0];
    g.position.x+=(p[0]-g.position.x)*.8;g.position.z+=(p[1]-g.position.z)*.8;g.position.y=.02;g.rotation.y=Math.PI
   }
   const c=personColor(info);g.traverse(n=>{if(!n.isMesh||n.geometry?.type==='RingGeometry')return;const ms=Array.isArray(n.material)?n.material:[n.material];ms.forEach(m=>{if(m?.color)m.color.lerp(new THREE.Color(c),.08)})})
  }
 }
 update(){if(this.kind==='camp')this.syncCamp();else this.syncIsolation()}
 render(t){
  if(!this.canvas.offsetParent)return;
  if(this.kind==='camp')this.camera.position.x=Math.sin(t*.00008)*1.2;
  this.renderer.render(this.scene,this.camera)
 }
}

function mount(){
 const camp=document.getElementById('q17CampMap'),isoRoom=document.getElementById('q17IsoRoom');if(!camp||!isoRoom)return false;
 if(!document.getElementById('q173DStyle')){
  const st=document.createElement('style');st.id='q173DStyle';st.textContent=`
  .q17-camp-map.q17-3d-enabled{min-height:420px;background:#101815!important}
  .q17-camp-map.q17-3d-enabled>.q17-map-ground-road,.q17-camp-map.q17-3d-enabled>.q17-zone-mark,.q17-camp-map.q17-3d-enabled>.q17-tent,.q17-camp-map.q17-3d-enabled>.q17-med,.q17-camp-map.q17-3d-enabled>.q17-warehouse,.q17-camp-map.q17-3d-enabled>.q17-water,.q17-camp-map.q17-3d-enabled>.q17-crate,.q17-camp-map.q17-3d-enabled>.q17-tower,.q17-camp-map.q17-3d-enabled>.q17-gatehouse,.q17-camp-map.q17-3d-enabled>.q17-fence,.q17-camp-map.q17-3d-enabled>#q17CampEntityLayer{display:none!important}
  .q17-camp-map.q17-3d-enabled:before{z-index:8;pointer-events:none}.q17-camp-map.q17-3d-enabled:after{z-index:9}
  #q17Camp3D{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:manipulation}
  #q17Iso3DWrap{margin:12px 14px 4px;height:min(46vh,410px);min-height:290px;position:relative;border:1px solid #53636d;background:#0e1519;overflow:hidden;box-shadow:inset 0 0 35px #0008}
  #q17Iso3D{width:100%;height:100%;display:block}
  #q17Iso3DWrap:after{content:'CCTV ISO-17  •  LIVE 3D';position:absolute;right:9px;top:7px;color:#aebdc3aa;font:800 9px ui-monospace,monospace;letter-spacing:.1em;pointer-events:none}
  .q17-iso-room{margin-top:5px!important;min-height:180px!important;padding-top:34px!important}
  .q17-iso-room:before{content:'처리 패널 · 3D CCTV에서 상태 확인 후 아래에서 조치'!important}
  @media(max-width:680px){.q17-camp-map.q17-3d-enabled{min-height:355px}#q17Iso3DWrap{height:300px;min-height:250px;margin:7px}.q17-iso-room{margin:7px!important}}
  `;document.head.appendChild(st)
 }
 camp.classList.add('q17-3d-enabled');let cc=document.getElementById('q17Camp3D');
 if(!cc){cc=document.createElement('canvas');cc.id='q17Camp3D';camp.prepend(cc)}
 let wrap=document.getElementById('q17Iso3DWrap');
 if(!wrap){wrap=document.createElement('div');wrap.id='q17Iso3DWrap';const ic=document.createElement('canvas');ic.id='q17Iso3D';wrap.appendChild(ic);isoRoom.parentNode.insertBefore(wrap,isoRoom)}
 const campView=new View(cc,'camp'),isoView=new View(document.getElementById('q17Iso3D'),'isolation');
 setInterval(()=>{campView.update();isoView.update()},450);campView.update();isoView.update();
 let last=0;const loop=t=>{if(t-last>16){views.forEach(v=>v.render(t));last=t}requestAnimationFrame(loop)};requestAnimationFrame(loop);
 window.Q17Facility3D=Object.freeze({version:'20.0',camp:campView,isolation:isoView});return true
}
let tries=0;const timer=setInterval(()=>{if(mount()||++tries>80)clearInterval(timer)},50);
