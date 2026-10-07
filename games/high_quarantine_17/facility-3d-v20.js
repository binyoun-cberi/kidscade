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
function hashId(s){let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h)}
function personAsset(info){const female=info?.sprite==='female',arr=female?[A.femaleA,A.femaleB,A.femaleC]:[A.maleA,A.maleB,A.maleC];return arr[hashId(info?.personId||info?.id)%arr.length]}
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
function cylinder(parent,x,y,z,rt,rb,h,color,segments=20,rough=.76){
 const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),mat(color,rough,.08));m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m
}
function glass(parent,x,y,z,w,h,d,color=0x9fc8d8,opacity=.18){
 const material=new THREE.MeshPhysicalMaterial({color,transparent:true,opacity,roughness:.08,metalness:.06,transmission:0,depthWrite:false,side:THREE.DoubleSide});
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y+h/2,z);parent.add(m);return m
}
function indicator(parent,x,y,z,color=0x6f828b){
 const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.72,roughness:.32});
 const m=new THREE.Mesh(new THREE.SphereGeometry(.115,14,9),material);m.position.set(x,y,z);parent.add(m);return m
}
function roadDash(parent,x,z,w=1.15,d=.08){
 const m=plane(parent,w,d,0xb8aa67,.026);m.position.x=x;m.position.z=z;return m
}
function signPost(parent,text,x,z,color='#dfe8e4'){
 const post=box(parent,x,0,z,.08,1.15,.08,0x59615c);const s=label(text,color);s.scale.set(2.2,.42,1);s.position.set(x,1.34,z);parent.add(s);return post
}
function label(text,color='#dfe8e4'){
 const c=document.createElement('canvas');c.width=512;c.height=96;const x=c.getContext('2d');
 x.fillStyle='rgba(5,10,12,.78)';x.fillRect(0,0,c.width,c.height);x.strokeStyle='rgba(160,184,174,.45)';x.lineWidth=3;x.strokeRect(2,2,c.width-4,c.height-4);
 x.fillStyle=color;x.font='800 31px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,48);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(3.2,.6,1);return s
}
function ring(color){
 const m=new THREE.Mesh(new THREE.RingGeometry(.58,.74,36),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}));
 m.rotation.x=-Math.PI/2;m.position.y=.028;return m
}
function personColor(info){
 if(info.threat)return info.phase==='zombie'?0x6f8b56:0xc08a49;
 if(info.status==='bitten')return 0xd9a33e;
 if(info.status==='positive')return 0xd85d68;
 if(info.status==='turning')return 0xf08a52;
 if(info.status==='exposed')return 0xe0c15e;
 if(info.status==='zombie')return 0x6d8b56;
 const p=[0x4e88a6,0x6f9a68,0xb47a48,0x8a6ca8,0x4e8e82,0x9a6a6a];return p[(info.id||0)%p.length]
}
function fallbackActor(color){
 const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CapsuleGeometry(.27,.78,5,10),mat(color,.72)),head=new THREE.Mesh(new THREE.SphereGeometry(.25,16,10),mat(0xe6c2a5,.78));
 body.position.y=.77;head.position.y=1.48;g.add(body,head);return g
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
  this.camera=new THREE.PerspectiveCamera(kind==='camp'?44:44,16/9,.1,100);this.root=new THREE.Group();this.dynamic=new THREE.Group();this.scene.add(this.root,this.dynamic);
  this.scene.add(new THREE.HemisphereLight(kind==='camp'?0xcadbc8:0xc3d4df,kind==='camp'?0x263025:0x1b2024,1.25));
  const sun=new THREE.DirectionalLight(0xffe0af,2.1);sun.position.set(-8,15,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);this.scene.add(sun);
  const fill=new THREE.DirectionalLight(kind==='camp'?0x78a6a1:0x82aeda,.75);fill.position.set(8,8,-8);this.scene.add(fill);
  if(kind==='camp'){this.camera.position.set(0,13.2,15.8);this.camera.lookAt(0,1.05,0);this.buildCamp()}
  else{this.camera.position.set(0,10.8,12.5);this.camera.lookAt(0,1.05,0);this.buildIsolation()}
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
  // CAMP-17 CCTV now uses the same landmark layout as the playable field mission.
  const X=x=>(x/960-.5)*30,Z=y=>(y/540-.5)*16.875,WW=w=>w/960*30,DD=d=>d/540*16.875;
  plane(this.root,30,16.875,0x444a41);
  const roadH=plane(this.root,28.9,DD(92),0x595b57,.012);roadH.position.z=Z(234);
  const roadV=plane(this.root,WW(82),15.8,0x565a58,.013);roadV.position.x=X(401);
  for(let x=45;x<930;x+=72){const d=plane(this.root,WW(34),.055,0xb6a75f,.03);d.position.set(X(x),.03,Z(234))}
  for(let y=35;y<510;y+=64){const d=plane(this.root,.055,DD(28),0xb6a75f,.031);d.position.set(X(401),.031,Z(y))}

  // Command post, isolation block and supply warehouse mirror the field-mission silhouettes.
  const building=(x,y,w,d,h,color,roof,labelText,labelColor)=>{
   box(this.root,X(x+w/2),0,Z(y+d/2),WW(w),h,DD(d),color);
   box(this.root,X(x+w/2),h,Z(y+7),WW(w),.16,DD(14),roof);
   const l=label(labelText,labelColor);l.scale.set(2.35,.45,1);l.position.set(X(x+w/2),h+.62,Z(y+10));this.root.add(l)
  };
  building(65,55,185,122,2.15,0x4d656a,0x78898a,'지휘소','#d9eceb');
  building(292,52,210,132,2.3,0x555e63,0x7a8588,'A/B 격리동','#d1e4e9');
  building(548,58,184,118,2.15,0x6b604d,0x918269,'보급창고','#efd697');

  // Isolation block has the same visible containment seam as the field renderer.
  box(this.root,X(397),.1,Z(118),.18,2.05,DD(116),0x899398);
  glass(this.root,X(397),.62,Z(118),.10,1.35,DD(82),0xaed4df,.17);

  // Medical tent and residential tents occupy the same lower compound positions as the field map.
  const medPad=plane(this.root,WW(166),DD(116),0x4d5e55,.018);medPad.position.set(X(501),.018,Z(410));
  this.addAsset(A.tent,[X(500),0,Z(410)],2.5,0x75816b,.50,0);
  this.addAsset(A.bed,[X(585),0,Z(390)],1.2,0xb5cfcb,.35,Math.PI/2);
  const ml=label('의무막사','#c8eee4');ml.scale.set(1.9,.38,1);ml.position.set(X(500),2.45,Z(360));this.root.add(ml);
  this.addAsset(A.tentSmall,[X(164),0,Z(338)],1.75,0x81745a,.47,.08);
  this.addAsset(A.tentSmall,[X(280),0,Z(402)],1.75,0x766d55,.47,-.12);
  for(const p of [[138,376],[184,390],[255,444],[305,455]])this.addAsset(A.crate,[X(p[0]),0,Z(p[1])],.58,0x9d7448,.42,0);

  // The eastern service lane carries the same container, ambulance, barricade and gate seen during deployment.
  box(this.root,X(789),0,Z(136),WW(38),2.15,DD(132),0x4d5457);
  this.addAsset(A.ambulance,[X(850),0,Z(356)],2.45,0xe3e7e2,.24,Math.PI/2);
  this.addAsset(A.barrier,[X(672),0,Z(427)],1.3,0xc3953f,.48,0);
  this.addAsset(A.turret,[X(720),0,Z(286)],1.5,0x6f7976,.38,-Math.PI/2);

  // Medical interaction marker and a small supply cluster make the route legible even before an emergency.
  for(const p of [[520,234],[746,446],[350,288]])this.addAsset(A.crate,[X(p[0]),0,Z(p[1])],.70,0xa87542,.42,0);
  const medCircle=new THREE.Mesh(new THREE.CircleGeometry(.48,36),new THREE.MeshBasicMaterial({color:0x79a6a5,transparent:true,opacity:.18,side:THREE.DoubleSide}));
  medCircle.rotation.x=-Math.PI/2;medCircle.position.set(X(610),.028,Z(330));this.root.add(medCircle);

  // Perimeter and gate: enough real fence assets to make the camp visibly enclosed.
  for(const [x,y,r] of [[92,26,0],[245,26,0],[600,26,0],[760,26,0],[925,74,Math.PI/2],[925,120,Math.PI/2],[925,385,Math.PI/2],[925,455,Math.PI/2],[70,510,0],[225,510,0],[650,510,0],[805,510,0],[28,100,Math.PI/2],[28,245,Math.PI/2],[28,420,Math.PI/2]])
   this.addAsset(A.fence,[X(x),0,Z(y)],1.25,0x77837d,.32,r);
  box(this.root,X(900),0,Z(155),.22,2.4,.22,0x7b6868);box(this.root,X(900),0,Z(345),.22,2.4,.22,0x7b6868);
  const gl=label('외곽 검문 게이트','#ffaaa9');gl.scale.set(2.15,.42,1);gl.position.set(X(850),2.75,Z(150));this.root.add(gl);
  for(const p of [[65,205],[738,205],[770,360],[890,360]])this.addAsset(A.light,[X(p[0]),0,Z(p[1])],1.85,0xe5bd55,.28,0);

  // Safe zone is identical to the field mission destination.
  const safeX=X(270),safeZ=Z(205);
  const safe=new THREE.Mesh(new THREE.CircleGeometry(1.05,42),new THREE.MeshBasicMaterial({color:0x6db581,transparent:true,opacity:.19,side:THREE.DoubleSide}));
  safe.rotation.x=-Math.PI/2;safe.position.set(safeX,.03,safeZ);this.root.add(safe);
  const safeRing=new THREE.Mesh(new THREE.RingGeometry(1.05,1.16,42),new THREE.MeshBasicMaterial({color:0xa9dcb4,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));
  safeRing.rotation.x=-Math.PI/2;safeRing.position.copy(safe.position);this.root.add(safeRing);

  this.campBeacon=indicator(this.root,X(900),2.7,Z(155),0xa13e42);
  this.campBeacon.material.emissiveIntensity=.15;this.campDanger=0;
 }
 buildIsolation(){
  // Neutral institutional floor with color concentrated in lighting/fixtures, not giant red/blue floor fills.
  plane(this.root,20,10,0x44494d);
  const wall=0x626b72;box(this.root,0,0,-5,20,3.0,.28,wall);box(this.root,-10,0,0,.28,3.0,10,wall);box(this.root,10,0,0,.28,3.0,10,wall);
  const aPad=plane(this.root,9.55,9.45,0x49565c,.015);aPad.position.x=-5.05;
  const bPad=plane(this.root,9.55,9.45,0x55494c,.016);bPad.position.x=5.05;

  // A/B separation is now a real containment spine: solid walls, observation glass and an air-lock entry.
  box(this.root,0,0,-3.4,.48,2.75,3.2,0x69737a);
  box(this.root,0,0,3.45,.48,2.75,2.9,0x69737a);
  glass(this.root,0,.62,0,.22,1.55,3.45,0x9dc9d8,.22);
  box(this.root,0,0,4.25,2.1,2.55,.34,0x7a858b);
  glass(this.root,0,.58,4.05,1.35,1.45,.08,0xb9d9e4,.18);
  box(this.root,0,2.2,4.05,1.2,.18,.22,0xc3a248);

  const a=label('A 관찰 · 검사실','#b8e3ef');a.scale.set(2.65,.5,1);a.position.set(-5,3.2,-4.55);this.root.add(a);
  const b=label('B 고위험 격리실','#ffb0af');b.scale.set(2.65,.5,1);b.position.set(5,3.2,-4.55);this.root.add(b);

  const slotsA=[[-7.4,-2.4],[-3,-2.4],[-7.4,2.5],[-3,2.5]],slotsB=[[3.2,-1.8],[6.9,1.8]];
  this.isoSlotLights={A:[],B:[]};
  this.isoSlotAssignments={A:new Map(),B:new Map()};
  this.isoActorSlots={A:[[-7.2,-.5],[-3.3,-.5],[-7.2,3],[-3.3,3]],B:[[3.4,-.3],[6.8,2.7]]};

  // Observation bays: beds, half-height dividers, small equipment blocks and one status lamp per patient.
  slotsA.forEach((p,i)=>{
   this.addAsset(A.bed,[p[0],0,p[1]-.85],1.78,0xa9c7ce,.34,Math.PI/2);
   box(this.root,p[0]-1.15,0,p[1],.10,1.05,2.35,0x78868d);
   glass(this.root,p[0]+1.0,0,p[1],.08,1.15,2.1,0xaed4df,.16);
   box(this.root,p[0]+.95,0,p[1]-.95,.58,.82,.44,0x657a82);
   const lamp=indicator(this.root,p[0]+.95,1.06,p[1]-.95,0x6e9eac);this.isoSlotLights.A.push(lamp)
  });
  slotsB.forEach((p,i)=>{
   this.addAsset(A.bed,[p[0],0,p[1]-.75],1.82,0xc99898,.44,Math.PI/2);
   box(this.root,p[0]-1.35,0,p[1],.14,1.45,2.85,0x7a5e62);
   glass(this.root,p[0]+1.25,0,p[1],.10,1.65,2.6,0xd19a9d,.18);
   box(this.root,p[0]+1.1,0,p[1]-1.05,.64,.92,.48,0x785b60);
   const lamp=indicator(this.root,p[0]+1.08,1.18,p[1]-1.05,0x9e5057);this.isoSlotLights.B.push(lamp)
  });

  // Decontamination/response equipment and stronger warning furniture.
  for(const p of [[-8.8,-3.95],[-1.2,-3.95]])this.addAsset(A.light,[p[0],0,p[1]],1.72,0x88d7f1,.32);
  for(const p of [[1.3,-3.95],[8.8,-3.95]])this.addAsset(A.light,[p[0],0,p[1]],1.72,0xff7178,.52);
  this.addAsset(A.barrier,[-1.05,0,4.1],1.22,0xd1ad49,.42,Math.PI/2);this.addAsset(A.barrier,[1.05,0,4.1],1.22,0xd1ad49,.42,Math.PI/2);
  for(const p of [[-8.7,4.15],[-7.7,4.15],[-6.7,4.15]])this.addAsset(A.crate,[p[0],0,p[1]],.52,0x7393a0,.38,0);
  for(const p of [[6.8,4.15],[7.8,4.15],[8.8,4.15]])this.addAsset(A.crate,[p[0],0,p[1]],.52,0x9b6267,.46,0);

  this.isoEmergencyA=indicator(this.root,-.55,2.65,-3.65,0x79c6e1);this.isoEmergencyA.material.emissiveIntensity=.45;
  this.isoEmergencyB=indicator(this.root,.55,2.65,-3.65,0xd7585e);this.isoEmergencyB.material.emissiveIntensity=.45;
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
  const live=s.residents.filter(r=>r.status!=='lost'&&r.status!=='zombie');
  const visible=live.slice().sort((a,b)=>{
   const pa=a.status==='bitten'?-100000:0,pb=b.status==='bitten'?-100000:0;
   if(pa!==pb)return pa-pb;return hashId(a.personId||a.id)-hashId(b.personId||b.id)
  }).slice(0,20);
  visible.forEach(r=>items.push({key:'r'+r.id,...r,threat:false}));
  s.threats.forEach(t=>items.push({key:'t'+t.id,...t,threat:true}));
  const pop=document.getElementById('q17Camp3DPopulation');if(pop)pop.textContent=live.length>20?'3D 표시 '+visible.length+'명 · CAMP 전체 '+live.length+'명':'CAMP 주민 '+live.length+'명';
  this.campDanger=s.threats.filter(t=>t.phase==='infected'||t.phase==='zombie').length+s.residents.filter(r=>r.status==='bitten').length;
  this.syncPeople(items,'camp')
 }
 syncIsolation(){
  const api=window.Q17Outbreak;if(!api?.getIsolationSnapshot)return;const snap=api.getIsolationSnapshot();
  if(!this.isoSlotAssignments)this.isoSlotAssignments={A:new Map(),B:new Map()};
  for(const room of ['A','B']){
   const currentIds=new Set(snap.filter(d=>(d.room||'A')===room).map(d=>String(d.id)));
   for(const id of [...this.isoSlotAssignments[room].keys()])if(!currentIds.has(id))this.isoSlotAssignments[room].delete(id)
  }
  const items=snap.map(d=>{
   const room=d.room||'A',id=String(d.id);
   const other=room==='A'?'B':'A';this.isoSlotAssignments[other].delete(id);
   let slot=this.isoSlotAssignments[room].get(id);
   if(slot===undefined){
    const cap=room==='B'?2:4,used=new Set(this.isoSlotAssignments[room].values());
    slot=Array.from({length:cap},(_,i)=>i).find(i=>!used.has(i));if(slot===undefined)slot=0;
    this.isoSlotAssignments[room].set(id,slot)
   }
   return{key:'i'+(d.personId||d.id),...d,room,slot,threat:d.status==='zombie'}
  });
  if(this.isoSlotLights){
   for(const room of ['A','B']){
    const bySlot=new Map(items.filter(x=>x.room===room).map(x=>[x.slot,x]));
    this.isoSlotLights[room].forEach((lamp,i)=>{
     const d=bySlot.get(i),color=!d?0x65747b:personColor(d);lamp.material.color.setHex(color);lamp.material.emissive.setHex(color);
     lamp.material.emissiveIntensity=!d ? .18 : (d.status==='zombie'||d.status==='turning'||d.status==='positive'?1.65:.78)
    })
   }
  }
  this.syncPeople(items,'isolation')
 }
 syncPeople(items,mode){
  const keep=new Set(items.map(x=>x.key));
  for(const g of [...this.dynamic.children])if(!keep.has(g.userData.key))this.dynamic.remove(g);
  for(const info of items){
   let g=this.dynamic.children.find(x=>x.userData.key===info.key);
   if(!g){
    g=new THREE.Group();g.userData.key=info.key;g.add(fallbackActor(personColor(info)));g.add(ring(info.threat?0xe05b60:0x7cc996));this.dynamic.add(g);
    populateActor(g,personAsset(info),personColor(info),mode==='camp'?1.88:1.72).then(()=>{if(g.parent){g.add(ring(info.threat?0xe05b60:0x7cc996));setInfo(g,info)}})
   }
   setInfo(g,info);
   if(mode==='camp'){
    const tx=(Number(info.x)-50)*.3,tz=(Number(info.y)-50)*.16875;g.position.x+=(tx-g.position.x)*.72;g.position.z+=(tz-g.position.z)*.72;g.position.y=.02;
    const d=Number(info.dir)||1;g.rotation.y=d<0?Math.PI*.5:-Math.PI*.5
   }else{
    const positions=this.isoActorSlots||{A:[[-7.2,-.5],[-3.3,-.5],[-7.2,3],[-3.3,3]],B:[[3.4,-.3],[6.8,2.7]]},p=(positions[info.room]||positions.A)[info.slot]||[0,0];
    g.position.x+=(p[0]-g.position.x)*.8;g.position.z+=(p[1]-g.position.z)*.8;g.position.y=.02;g.rotation.y=Math.PI
   }
   const c=personColor(info);g.traverse(n=>{if(!n.isMesh||n.geometry?.type==='RingGeometry')return;const ms=Array.isArray(n.material)?n.material:[n.material];ms.forEach(m=>{if(m?.color)m.color.lerp(new THREE.Color(c),.08)})})
  }
 }
 update(){if(this.kind==='camp')this.syncCamp();else this.syncIsolation()}
 render(t){
  if(!this.canvas.offsetParent)return;
  if(this.kind==='camp'){
   this.camera.position.x=Math.sin(t*.00008)*.72;
   if(this.campBeacon){
    const alarm=this.campDanger>0,blink=.45+.55*Math.max(0,Math.sin(t*.009));
    this.campBeacon.material.emissiveIntensity=alarm ? .7+blink*1.7 : .14;this.campBeacon.scale.setScalar(alarm?1+blink*.18:1)
   }
  }else if(this.isoEmergencyB){
   const bDanger=this.dynamic.children.some(g=>{const d=g.userData?.info;return d?.room==='B'&&(d.status==='positive'||d.status==='turning'||d.status==='zombie')});
   const pulse=.45+.55*Math.max(0,Math.sin(t*.011));this.isoEmergencyB.material.emissiveIntensity=bDanger ? .8+pulse*1.9 : .38
  }
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
  #q17Camp3D{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:manipulation}\n  #q17Camp3DPopulation{position:absolute;left:10px;top:8px;z-index:10;padding:5px 7px;background:#0b1216cc;border:1px solid #65757b;color:#cad4d7;font:800 9px ui-monospace,monospace;letter-spacing:.04em;pointer-events:none}
  #q17Iso3DWrap{margin:12px 14px 4px;height:min(46vh,410px);min-height:290px;position:relative;border:1px solid #53636d;background:#0e1519;overflow:hidden;box-shadow:inset 0 0 35px #0008}
  #q17Iso3D{width:100%;height:100%;display:block}
  #q17Iso3DWrap:after{content:'CCTV ISO-17  •  LIVE 3D';position:absolute;right:9px;top:7px;color:#aebdc3aa;font:800 9px ui-monospace,monospace;letter-spacing:.1em;pointer-events:none}
  .q17-iso-room{margin-top:5px!important;min-height:180px!important;padding-top:34px!important}
  .q17-iso-room:before{content:'처리 패널 · 3D CCTV에서 상태 확인 후 아래에서 조치'!important}
  @media(max-width:680px){.q17-camp-map.q17-3d-enabled{min-height:355px}#q17Iso3DWrap{height:300px;min-height:250px;margin:7px}.q17-iso-room{margin:7px!important}}
  `;document.head.appendChild(st)
 }
 camp.classList.add('q17-3d-enabled');let cc=document.getElementById('q17Camp3D');
 if(!cc){cc=document.createElement('canvas');cc.id='q17Camp3D';camp.prepend(cc)}\n let pop=document.getElementById('q17Camp3DPopulation');if(!pop){pop=document.createElement('div');pop.id='q17Camp3DPopulation';pop.textContent='CAMP 주민 0명';camp.appendChild(pop)}
 let wrap=document.getElementById('q17Iso3DWrap');
 if(!wrap){wrap=document.createElement('div');wrap.id='q17Iso3DWrap';const ic=document.createElement('canvas');ic.id='q17Iso3D';wrap.appendChild(ic);isoRoom.parentNode.insertBefore(wrap,isoRoom)}
 const campView=new View(cc,'camp'),isoView=new View(document.getElementById('q17Iso3D'),'isolation');
 setInterval(()=>{campView.update();isoView.update()},450);campView.update();isoView.update();
 let last=0;const loop=t=>{if(t-last>16){views.forEach(v=>v.render(t));last=t}requestAnimationFrame(loop)};requestAnimationFrame(loop);
 window.Q17Facility3D=Object.freeze({version:'20.5',camp:campView,isolation:isoView});return true
}
let tries=0;const timer=setInterval(()=>{if(mount()||++tries>80)clearInterval(timer)},50);
