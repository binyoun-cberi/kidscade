"use strict";
window.__policePatrolOwnAudio=true;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const mm=document.getElementById('minimap'),mctx=mm.getContext('2d');
const $=s=>document.querySelector(s);
const ui={shift:$('#shift'),solved:$('#solved'),score:$('#score'),speed:$('#speed'),health:$('#health'),siren:$('#sirenText'),kind:$('#missionKind'),title:$('#missionTitle'),text:$('#missionText'),meta:$('#missionMeta'),radio:$('#radio'),action:$('#actionBtn'),progress:$('#progress'),progressBar:$('#progress i'),start:$('#start'),end:$('#end'),endTitle:$('#endTitle'),endText:$('#endText')};
const ROOT='../../assets/game/2d/racing/kenney-racing-pack/';
const A={
 cars:['car_black_1.png','car_blue_1.png','car_green_1.png','car_red_1.png','car_yellow_1.png','car_black_3.png','car_blue_3.png','car_green_3.png','car_red_3.png','car_yellow_3.png'].map(x=>ROOT+'cars/'+x),
 police:ROOT+'cars/car_blue_1.png',suspect:ROOT+'cars/car_red_2.png',
 lights:ROOT+'objects/lights.png',cone:ROOT+'objects/cone_straight.png',barrier:ROOT+'objects/barrier_red.png',
 tree:ROOT+'objects/tree_large.png',treeSmall:ROOT+'objects/tree_small.png',skid:ROOT+'objects/skidmark_long_1.png',
 grass:ROOT+'tiles/grass/land_grass01.png',road:ROOT+'tiles/asphalt-road/road_asphalt01.png'
};
const images=new Map();
function load(src){const im=new Image(),rec={im,ok:false};images.set(src,rec);im.onload=()=>rec.ok=true;im.src=src}
Object.values(A).flat().forEach(load);
const img=s=>images.get(s)?.ok?images.get(s).im:null;
const TAU=Math.PI*2,WORLD=2300,ROAD_MAIN=280,ROAD_SIDE=190,GRID=720,SHIFT=360;
const roadXs=[-1440,-720,0,720,1440],roadYs=[-1440,-720,0,720,1440],roads=[],blocks=[],decor=[];
let player=null,cars=[],pedestrians=[],mission=null,state='menu',last=performance.now(),score=0,solved=0,shiftTime=0,missionDelay=1.2,radioTimer=0,raf=false,missionIssued=0,lastMissionType='';
const camera={x:0,y:0,zoom:1},view={w:innerWidth,h:innerHeight,dpr:1},keys={w:false,a:false,s:false,d:false,r:false},touch={steer:0,brake:false,reverse:false,boost:false};
const coarse=matchMedia('(hover:none),(pointer:coarse)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),rnd=(a,b)=>a+Math.random()*(b-a);
function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);view.w=Math.max(1,r.width||innerWidth);view.h=Math.max(1,r.height||innerHeight);view.dpr=dpr;canvas.width=Math.round(view.w*dpr);canvas.height=Math.round(view.h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);window.__police3dResize?.()}
function framingZoom(){const aspect=view.w/Math.max(1,view.h);if(coarse&&aspect<.72)return .70;if(aspect<1)return .82;return 1}
addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();
function sfx(k,o={}){try{window.KidscadeAudio?.play?.(k,o)}catch(_){}}
const driveAudio={
 ctx:null,master:null,engine:null,engineGain:null,siren:null,sirenGain:null,
 init(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return}try{const AC=window.AudioContext||window.webkitAudioContext;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.15;this.master.connect(this.ctx.destination);this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;this.engine.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();this.siren=this.ctx.createOscillator();this.siren.type='triangle';this.sirenGain=this.ctx.createGain();this.sirenGain.gain.value=0;this.siren.connect(this.sirenGain);this.sirenGain.connect(this.master);this.siren.start()}catch(_){}},
 update(speed,on,t){if(!this.ctx)return;const now=this.ctx.currentTime,s=Math.abs(speed);this.engine.frequency.setTargetAtTime(48+s*.3,now,.07);this.engineGain.gain.setTargetAtTime(state==='playing'&&s>4?.22:0,now,.08);this.siren.frequency.setTargetAtTime(Math.sin(t*7)>0?980:690,now,.05);this.sirenGain.gain.setTargetAtTime(state==='playing'&&on?.32:0,now,.04)}
};
function radio(text,color='#9dd3ff'){ui.radio.textContent='무전 · '+text;ui.radio.style.color=color;ui.radio.classList.add('show');radioTimer=2.5}
function setMission(kind,title,text){ui.kind.textContent=kind;ui.title.textContent=title;ui.text.textContent=text}

/* ===== 3D CITY RENDERER v4 ===== */
const T3=window.THREE||null,GLTF3=window.GLTFLoader||null,SCALE3=.012;
const scriptBase3=(()=>{try{return new URL('.',document.currentScript?.src||location.href)}catch(_){return new URL('.',location.href)}})();
const modelUrl3=p=>new URL('../../assets/game/3d/'+p,scriptBase3).href;
const gameAssetUrl3=p=>new URL('../../assets/game/'+p,scriptBase3).href;
const MODEL3={
 police:modelUrl3('vehicles/kenney-car-kit/police.glb'),
 sedan:modelUrl3('vehicles/kenney-car-kit/sedan.glb'),
 suv:modelUrl3('vehicles/kenney-car-kit/suv.glb'),
 hatch:modelUrl3('vehicles/kenney-car-kit/hatchback-sports.glb'),
 taxi:modelUrl3('vehicles/kenney-car-kit/taxi.glb'),
 truck:modelUrl3('vehicles/kenney-car-kit/truck.glb'),
 tree:modelUrl3('nature/kenney-nature-kit/tree-default.glb'),
 oak:modelUrl3('nature/kenney-nature-kit/tree-oak.glb'),
 pine:modelUrl3('nature/kenney-nature-kit/tree-pine-round-a.glb'),
 trafficLight:modelUrl3('city/kenney-city-kit-roads/traffic-light.glb'),
 cone:modelUrl3('city/kenney-city-kit-roads/construction-cone.glb'),
 barrier:modelUrl3('city/kenney-city-kit-roads/construction-barrier.glb'),
 bigBuilding:modelUrl3('city/poly-pizza-city-pack/big-building.glb'),
 dumpster:modelUrl3('city/poly-pizza-city-pack/dumpster.glb'),
 pedA:gameAssetUrl3('characters/people/character-male-a.glb'),
 pedB:gameAssetUrl3('characters/people/character-male-b.glb'),
 pedC:gameAssetUrl3('characters/people/character-female-b.glb'),
 pedD:gameAssetUrl3('characters/people/character-female-c.glb')
};
const MODEL_COLOR3={police:0xf4f7fa,sedan:0x4f86d9,suv:0x45b878,hatch:0xe85d5d,taxi:0xf2c94c,truck:0xe89445,trafficLight:0x34454d,cone:0xf08a36,barrier:0xe7e1d5};
let scene3=null,cam3=null,renderer3=null,loader3=null,world3=null,cars3=null,people3=null,mission3=null,models3=new Map(),carNodes3=new Map(),pedNodes3=new Map(),prepare3Promise=null,threeReady3=false;
let missionKey3='',missionMarker3=null,missionArrow3=null,missionBang3=null,lastRender3=performance.now(),cameraShake3=0,spark3=[],lastHealth3=100;
let buildingMeshes3=[],fadedMeshes3=new Set();const occlusionRay3=T3?new T3.Raycaster():null;
const v3=(x,y,h=0)=>new T3.Vector3(x*SCALE3,h,y*SCALE3);
function box3(w,h,d,color,rough=.82){const m=new T3.Mesh(new T3.BoxGeometry(w,h,d),new T3.MeshStandardMaterial({color,roughness:rough,metalness:.02}));m.castShadow=true;m.receiveShadow=true;return m}
function clear3(g){if(!g)return;while(g.children.length)g.remove(g.children[g.children.length-1])}
function normalize3(obj,target=1){obj.updateMatrixWorld(true);let b=new T3.Box3().setFromObject(obj),s=b.getSize(new T3.Vector3()),base=Math.max(s.x,s.y,s.z);if(!Number.isFinite(base)||base<=0)base=1;obj.scale.multiplyScalar(target/base);obj.updateMatrixWorld(true);b=new T3.Box3().setFromObject(obj);const c=b.getCenter(new T3.Vector3());obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b.min.y;return obj}
function style3(obj,key,tint=null){obj.traverse(n=>{if(!n.isMesh||!n.material)return;n.castShadow=true;n.receiveShadow=true;const list=Array.isArray(n.material)?n.material:[n.material];const styled=list.map(src=>{const m=src.clone(),name=(n.name||'').toLowerCase(),hasMap=Boolean(m.map?.image);if(tint!=null){m.color.setHex(tint);if(name.includes('wheel'))m.color.setHex(0x242b30)}else if(!hasMap&&MODEL_COLOR3[key]){m.color.setHex(name.includes('wheel')?0x242b30:MODEL_COLOR3[key])}m.roughness=Math.max(.48,m.roughness??.7);m.metalness=Math.min(.18,m.metalness??0);m.needsUpdate=true;return m});n.material=Array.isArray(n.material)?styled:styled[0]});return obj}
function clone3(key,target=1,tint=null){const g=models3.get(key);if(!g)return null;const obj=style3(g.scene.clone(true),key,tint);return normalize3(obj,target)}
function load3(key,url){return new Promise(resolve=>{loader3.load(url,g=>{models3.set(key,g);resolve(g)},undefined,e=>{console.warn('[Police3D] fallback',key,e);resolve(null)})})}
function init3D(){
 if(threeReady3||!T3||!GLTF3)return threeReady3;
 try{
   const c=document.getElementById('game3d');if(!c)return false;
   scene3=new T3.Scene();scene3.background=new T3.Color(0x86c8e4);scene3.fog=new T3.Fog(0x86c8e4,30,66);
   cam3=new T3.PerspectiveCamera(49,innerWidth/Math.max(1,innerHeight),.08,120);
   renderer3=new T3.WebGLRenderer({canvas:c,antialias:true,powerPreference:'high-performance'});
   renderer3.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer3.setSize(innerWidth,innerHeight,false);
   renderer3.shadowMap.enabled=true;renderer3.shadowMap.type=T3.PCFSoftShadowMap;renderer3.outputColorSpace=T3.SRGBColorSpace;
   renderer3.toneMapping=T3.ACESFilmicToneMapping;renderer3.toneMappingExposure=1.08;
   scene3.add(new T3.HemisphereLight(0xeaf8ff,0x476448,2.25));
   const sun=new T3.DirectionalLight(0xfff1cf,3.2);sun.position.set(-18,28,14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;scene3.add(sun);
   const fill=new T3.DirectionalLight(0x91c9ff,.72);fill.position.set(14,10,-18);scene3.add(fill);
   world3=new T3.Group();cars3=new T3.Group();people3=new T3.Group();mission3=new T3.Group();scene3.add(world3,cars3,people3,mission3);
   loader3=new GLTF3();threeReady3=true;document.body.classList.add('three-ready');resize3D();return true;
 }catch(e){console.error('[Police3D] init failed',e);return false}
}
function resize3D(){if(!threeReady3||!renderer3||!cam3)return;cam3.aspect=innerWidth/Math.max(1,innerHeight);cam3.updateProjectionMatrix();renderer3.setSize(innerWidth,innerHeight,false);renderer3.setPixelRatio(Math.min(devicePixelRatio||1,1.65))}
window.__police3dResize=resize3D;
function prepare3D(){
 if(prepare3Promise)return prepare3Promise;
 prepare3Promise=(async()=>{if(!init3D())return false;await Promise.all(Object.entries(MODEL3).map(([k,u])=>load3(k,u)));rebuildCity3D();clearCarNodes3();return true})();
 return prepare3Promise
}
function addWindowStrip3(group,w,d,h){
 const glassMat=new T3.MeshStandardMaterial({color:0x8fc5d7,roughness:.28,metalness:.05,emissive:0x16313c,emissiveIntensity:.16});
 const fw=new T3.Mesh(new T3.BoxGeometry(Math.max(.9,w*.62),Math.max(.35,h*.38),.035),glassMat);fw.position.set(0,h*.57,d/2+.02);group.add(fw);
 const sw=new T3.Mesh(new T3.BoxGeometry(.035,Math.max(.35,h*.38),Math.max(.9,d*.54)),glassMat.clone());sw.position.set(w/2+.02,h*.57,0);group.add(sw);
}
function registerBuildingOccluder3(root){
 if(!root)return;const meshes=[];
 root.traverse(n=>{if(!n.isMesh||!n.material)return;n.userData.occluder=true;n.userData.occluderRoot=root;buildingMeshes3.push(n);meshes.push(n)});
 root.userData.occluderMeshes=meshes
}
function restoreOccluders3(){
 for(const m of fadedMeshes3){
  const list=Array.isArray(m.material)?m.material:[m.material];
  for(const mat of list){if(mat.userData.__occOpacity!=null){mat.opacity=mat.userData.__occOpacity;mat.transparent=mat.userData.__occTransparent;mat.depthWrite=mat.userData.__occDepthWrite}}
 }
 fadedMeshes3.clear()
}
function fadeOccluderMesh3(mesh){
 const list=Array.isArray(mesh.material)?mesh.material:[mesh.material];
 for(const mat of list){
  if(mat.userData.__occOpacity==null){mat.userData.__occOpacity=mat.opacity;mat.userData.__occTransparent=mat.transparent;mat.userData.__occDepthWrite=mat.depthWrite}
  mat.transparent=true;mat.opacity=Math.min(.16,mat.userData.__occOpacity);mat.depthWrite=false
 }
 fadedMeshes3.add(mesh)
}
function fadeOccluder3(mesh){
 const root=mesh?.userData?.occluderRoot,list=root?.userData?.occluderMeshes;
 if(Array.isArray(list)&&list.length){for(const m of list)fadeOccluderMesh3(m)}
 else if(mesh)fadeOccluderMesh3(mesh)
}
function updateCameraOcclusion3(target){
 restoreOccluders3();if(!occlusionRay3||!cam3||!target||!buildingMeshes3.length)return;
 scene3?.updateMatrixWorld(true);
 const dir=target.clone().sub(cam3.position),distance=dir.length();if(distance<.1)return;dir.normalize();occlusionRay3.set(cam3.position,dir);occlusionRay3.far=Math.max(.1,distance-.45);
 const hits=occlusionRay3.intersectObjects(buildingMeshes3,false);
 for(const h of hits.slice(0,10))fadeOccluder3(h.object)
}
function addParkingLines3(group,b){
 const x0=b.x*SCALE3,z0=b.y*SCALE3,w=b.w*SCALE3,d=b.h*SCALE3;
 for(let i=-2;i<=2;i++){const line=box3(.035,.012,d*.72,0xece9d8,.95);line.position.set(x0+w/2+i*w*.12,.055,z0+d/2);group.add(line)}
}
function rebuildCity3D(){
 if(!threeReady3||!world3)return;restoreOccluders3();buildingMeshes3=[];clear3(world3);
 const ground=box3(WORLD*2*SCALE3+.8,.12,WORLD*2*SCALE3+.8,0x78b96d,.98);ground.position.y=-.08;world3.add(ground);
 for(const r of roads){
   const w=r.w*SCALE3,d=r.h*SCALE3,road=box3(w,.07,d,0x4c5358,.96);road.position.set((r.x+r.w/2)*SCALE3,.01,(r.y+r.h/2)*SCALE3);world3.add(road);
   if(r.axis==='v'){
     for(const side of[-1,1]){const walk=box3(.42,.08,d,0xcfc8af,.93);walk.position.set((r.x+r.w/2)*SCALE3+side*(w/2+.21),.055,(r.y+r.h/2)*SCALE3);world3.add(walk)}
     const center=box3(.055,.014,d*.98,0xf0c84c,.86);center.position.set((r.x+r.w/2)*SCALE3,.055,(r.y+r.h/2)*SCALE3);world3.add(center);
   }else{
     for(const side of[-1,1]){const walk=box3(w,.08,.42,0xcfc8af,.93);walk.position.set((r.x+r.w/2)*SCALE3,.055,(r.y+r.h/2)*SCALE3+side*(d/2+.21));world3.add(walk)}
     const center=box3(w*.98,.014,.055,0xf0c84c,.86);center.position.set((r.x+r.w/2)*SCALE3,.055,(r.y+r.h/2)*SCALE3);world3.add(center);
   }
 }
 const buildingColors=[0xb76d5c,0x6687a2,0x8e7ca6,0xb08a5f];
 for(const b of blocks){
   const x=(b.x+b.w/2)*SCALE3,z=(b.y+b.h/2)*SCALE3,w=Math.max(2.7,b.w*SCALE3*.76),d=Math.max(2.7,b.h*SCALE3*.76);
   if(b.type==='park'){
     const park=box3(w,.12,d,0x68a960,.98);park.position.set(x,.04,z);world3.add(park);
   }else if(b.type==='parking'){
     const lot=box3(w,.08,d,0x777e80,.94);lot.position.set(x,.03,z);world3.add(lot);addParkingLines3(world3,b);
   }else{
     const landmark=models3.has('bigBuilding')&&((Math.abs(Math.round(b.x/GRID))+Math.abs(Math.round(b.y/GRID))+b.shade)%3===0);
     if(landmark){
       const city=clone3('bigBuilding',Math.min(w,d)*.92);if(city){city.position.set(x,.02,z);city.rotation.y=b.shade%2?Math.PI/2:0;registerBuildingOccluder3(city);world3.add(city)}
     }else{
       const h=2.7+b.shade*.55+((Math.abs(Math.floor(b.x+b.y))%3)*.32),g=new T3.Group(),body=box3(w,h,d,buildingColors[b.shade%buildingColors.length],.78);body.position.y=h/2;g.add(body);
       const roof=box3(w*.9,.18,d*.9,0x48555b,.9);roof.position.y=h+.09;g.add(roof);addWindowStrip3(g,w,d,h);g.position.set(x,0,z);registerBuildingOccluder3(g);world3.add(g);
     }
     if(models3.has('dumpster')&&((Math.abs(Math.round(b.x/GRID))+b.shade)%2===0)){const dump=clone3('dumpster',.55);if(dump){dump.position.set(x+w*.43,.07,z+d*.43);dump.rotation.y=b.shade%2?Math.PI/2:0;world3.add(dump)}}
   }
 }
 const treeKeys=['tree','oak','pine'];
 for(let i=0;i<decor.length;i++){const d=decor[i],key=treeKeys[i%treeKeys.length],tree=clone3(key,d.small?.75:1.05);if(tree){tree.position.set(d.x*SCALE3,.06,d.y*SCALE3);tree.rotation.y=(i*.73)%TAU;world3.add(tree)}else{const trunk=box3(.16,.75,.16,0x6c4a2e);trunk.position.set(d.x*SCALE3,.38,d.y*SCALE3);world3.add(trunk);const crown=box3(.72,.78,.72,0x418b50);crown.position.set(d.x*SCALE3,1.08,d.y*SCALE3);world3.add(crown)}}
 const inner=[-720,0,720];for(const x of inner)for(const y of inner){const light=clone3('trafficLight',1.25);if(light){light.position.set((x+120)*SCALE3,.05,(y+120)*SCALE3);light.rotation.y=((x+y)/720)%2?Math.PI:0;world3.add(light)}}
}
function hash3(s=''){let h=2166136261;for(let i=0;i<s.length;i++)h=(h^s.charCodeAt(i))*16777619;return Math.abs(h|0)}
function clearCarNodes3(){for(const g of carNodes3.values())cars3?.remove(g);carNodes3.clear()}
function makeCarNode3(c,isPolice=false){
 const key=isPolice?'police':c.suspect?'hatch':['sedan','suv','hatch','taxi','truck'][hash3(c.sprite)%5],group=new T3.Group(),tint=c.suspect?0xe33f4f:null,model=clone3(key,isPolice?1.42:1.16,tint);
 if(model){model.position.y=.04;group.add(model)}else{const body=box3(1.08,.42,.56,isPolice?0xeaf2f8:c.suspect?0xe33f4f:MODEL_COLOR3[key]||0x5c8ad8,.62);body.position.y=.28;group.add(body)}
 if(isPolice){
   const stripe=box3(.9,.06,.58,0x2f67ad,.5);stripe.position.y=.28;group.add(stripe);
   const base=box3(.46,.055,.18,0x202a31,.42);base.position.y=.64;group.add(base);
   const red=box3(.2,.08,.16,0xff3348,.2),blue=box3(.2,.08,.16,0x3185ff,.2);red.position.set(-.12,.7,0);blue.position.set(.12,.7,0);group.add(red,blue);
   const rl=new T3.PointLight(0xff243b,0,5),bl=new T3.PointLight(0x2d7fff,0,5);rl.position.set(-.12,.72,0);bl.position.set(.12,.72,0);
   const glowGeo=new T3.CircleGeometry(.82,24),redGlow=new T3.Mesh(glowGeo,new T3.MeshBasicMaterial({color:0xff2941,transparent:true,opacity:0,depthWrite:false,blending:T3.AdditiveBlending})),blueGlow=new T3.Mesh(glowGeo,new T3.MeshBasicMaterial({color:0x2f75ff,transparent:true,opacity:0,depthWrite:false,blending:T3.AdditiveBlending}));
   redGlow.rotation.x=blueGlow.rotation.x=-Math.PI/2;redGlow.position.set(-.35,.015,0);blueGlow.position.set(.35,.016,0);group.add(redGlow,blueGlow,rl,bl);group.userData.siren={red,blue,rl,bl,redGlow,blueGlow};
 }
 if(c.suspect){const halo=new T3.Mesh(new T3.TorusGeometry(.82,.055,8,28),new T3.MeshBasicMaterial({color:0xff5364,transparent:true,opacity:.72}));halo.rotation.x=Math.PI/2;halo.position.y=.05;group.add(halo);group.userData.halo=halo}
 cars3.add(group);carNodes3.set(c,group);return group
}
function syncCars3D(time){
 if(!threeReady3||!player)return;
 const live=new Set(cars);live.add(player);
 for(const [c,g] of [...carNodes3])if(!live.has(c)){cars3.remove(g);carNodes3.delete(c)}
 const all=[...cars,player];for(const c of all){let g=carNodes3.get(c);if(!g)g=makeCarNode3(c,c===player);g.position.set(c.x*SCALE3,.08,c.y*SCALE3);g.rotation.y=Math.PI/2-c.a;
   if(g.userData.halo){const p=1+Math.sin(time*6)*.08;g.userData.halo.scale.setScalar(p)}
   if(c===player&&g.userData.siren){const s=g.userData.siren,on=Boolean(player.siren),phase=Math.sin(time*12)>0;s.red.material.emissive=new T3.Color(0xff263d);s.blue.material.emissive=new T3.Color(0x225fff);s.red.material.emissiveIntensity=on&&phase?2.8:.08;s.blue.material.emissiveIntensity=on&&!phase?2.8:.08;s.rl.intensity=on&&phase?2.5:0;s.bl.intensity=on&&!phase?2.5:0;s.redGlow.material.opacity=on&&phase?.22:0;s.blueGlow.material.opacity=on&&!phase?.22:0}
 }
}
function clearPedNodes3(){for(const g of pedNodes3.values())people3?.remove(g);pedNodes3.clear()}
function makePedNode3(p){
 const keys=['pedA','pedB','pedC','pedD'],key=keys[p.variant%keys.length],group=new T3.Group(),model=clone3(key,.72);
 if(model){model.position.y=.02;group.add(model)}else{
   const body=box3(.18,.52,.16,[0x4b75a8,0xb65e65,0x4e8f68,0xa7864f][p.variant%4],.82);body.position.y=.37;group.add(body);
   const head=new T3.Mesh(new T3.SphereGeometry(.11,10,8),new T3.MeshStandardMaterial({color:0xd3a37f,roughness:.8}));head.position.y=.76;group.add(head)
 }
 people3.add(group);pedNodes3.set(p,group);return group
}
function syncPedestrians3D(time){
 if(!threeReady3||!people3)return;
 const live=new Set(pedestrians);
 for(const [p,g] of [...pedNodes3])if(!live.has(p)){people3.remove(g);pedNodes3.delete(p)}
 for(const p of pedestrians){
  let g=pedNodes3.get(p);if(!g)g=makePedNode3(p);
  g.position.set(p.x*SCALE3,.07+Math.sin(time*7+p.phase)*.018,p.y*SCALE3);
  const a=p.axis==='h'?(p.dir>0?0:Math.PI):(p.dir>0?Math.PI/2:-Math.PI/2);
  g.rotation.y=Math.PI/2-a;g.rotation.z=Math.sin(time*7+p.phase)*.012
 }
}
function markerColor3(){return mission?.type==='pursuit'?0xff5364:mission?.type==='traffic'?0xffd85e:mission?.type==='crosswalk'?0x63d997:0x50a9ff}
function bangSprite3(color=0xffd75e){const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');x.fillStyle='#152232';x.beginPath();x.arc(64,64,45,0,TAU);x.fill();x.strokeStyle='#ffffff';x.lineWidth=7;x.stroke();x.fillStyle='#ffd75e';x.font='900 74px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText('!',64,67);const tex=new T3.CanvasTexture(c);tex.colorSpace=T3.SRGBColorSpace;const s=new T3.Sprite(new T3.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(.72,.72,.72);s.renderOrder=20;return s}
function addProp3(key,x,y,target=1,rot=0,tint=null){const o=clone3(key,target,tint);if(!o)return null;o.position.set(x*SCALE3,.06,y*SCALE3);o.rotation.y=rot;mission3.add(o);return o}
function rebuildMissionProps3(){
 if(!threeReady3||!mission3)return;clear3(mission3);missionMarker3=null;missionArrow3=null;missionBang3=null;if(!mission){missionKey3='';return}
 const col=markerColor3(),mat=new T3.MeshBasicMaterial({color:col,transparent:true,opacity:.78}),ring=new T3.Mesh(new T3.TorusGeometry(mission.type==='pursuit'?.6:.72,.045,8,34),mat);ring.rotation.x=Math.PI/2;ring.position.y=.075;mission3.add(ring);missionMarker3=ring;
 const bang=bangSprite3(col);mission3.add(bang);missionBang3=bang;
 const arrow=new T3.ArrowHelper(new T3.Vector3(1,0,0),new T3.Vector3(),1.45,0xffd75e,.34,.21);mission3.add(arrow);missionArrow3=arrow;
 if(mission.type==='accident'){const t=mission.scene;for(let i=-1;i<=1;i++)addProp3('cone',t.x+58,t.y+i*36,.52);addProp3('barrier',t.x-58,t.y,.8,Math.PI/2);const wreck=clone3('sedan',1.12,0x777b7e);if(wreck){wreck.position.set(t.x*SCALE3,.08,t.y*SCALE3);wreck.rotation.y=.45;mission3.add(wreck)}}
 else if(mission.type==='traffic'){for(let i=0;i<mission.index;i++){const p=mission.points[i];addProp3('cone',p.x,p.y,.56)}}
 else if(mission.type==='obstacle'){const t=mission.scene;addProp3('barrier',t.x,t.y,.86,Math.PI/2);addProp3('cone',t.x+38,t.y+30,.56)}
 else if(mission.type==='crosswalk'){
   const t=mission.point;
   for(let i=-2;i<=2;i++){const stripe=box3(.18,.018,1.25,0xf1efe4,.95);stripe.position.set((t.x*SCALE3)+i*.34,.07,t.y*SCALE3);mission3.add(stripe)}
   for(const [key,dx,dz,rot] of [['pedC',-42,-36,0],['pedA',38,38,Math.PI],['pedD',-68,34,Math.PI]]){
     const person=clone3(key,.7);if(person){person.position.set((t.x+dx)*SCALE3,.07,(t.y+dz)*SCALE3);person.rotation.y=rot;mission3.add(person)}
   }
 }
 missionKey3=mission.type+':'+(mission.index||0)
}
function syncMission3D(time){
 if(!threeReady3)return;const key=mission?mission.type+':'+(mission.index||0):'';if(key!==missionKey3)rebuildMissionProps3();if(!mission)return;const t=missionTarget();if(!t)return;
 if(missionMarker3){missionMarker3.position.x=t.x*SCALE3;missionMarker3.position.z=t.y*SCALE3;const p=1+Math.sin(time*4.4)*.06;missionMarker3.scale.setScalar(p)}
 if(missionBang3){missionBang3.position.set(t.x*SCALE3,1.08+Math.sin(time*3.3)*.08,t.y*SCALE3)}
 if(missionArrow3&&player){const raw=dist(player,t);missionArrow3.visible=raw>180;const origin=v3(player.x,player.y,.32),target=v3(t.x,t.y,.32),dir=target.clone().sub(origin);dir.y=0;if(dir.lengthSq()>.001){dir.normalize();missionArrow3.position.copy(origin);missionArrow3.setDirection(dir);missionArrow3.setLength(1.5,.34,.21)}}
}
function sparkBurst3(power=.6){
 if(!threeReady3||!player)return;cameraShake3=Math.max(cameraShake3,.35+power*.65);const pos=v3(player.x,player.y,.42);
 for(let i=0;i<10;i++){const m=box3(.055,.055,.055,i%2?0xffd05b:0xff7b42,.3);m.position.copy(pos);scene3.add(m);spark3.push({m,v:new T3.Vector3((Math.random()-.5)*3,1.2+Math.random()*2.2,(Math.random()-.5)*3),life:.3+Math.random()*.35})}
}
function updateFX3(dt){for(let i=spark3.length-1;i>=0;i--){const p=spark3[i];p.life-=dt;p.v.y-=6*dt;p.m.position.addScaledVector(p.v,dt);p.m.scale.multiplyScalar(.965);if(p.life<=0){scene3.remove(p.m);spark3.splice(i,1)}}cameraShake3=Math.max(0,cameraShake3-dt*2.2)}
function render3D(time){
 if(!threeReady3||!renderer3||!cam3)return;const now=performance.now(),dt=Math.min(.05,(now-lastRender3)/1000||.016);lastRender3=now;syncCars3D(time);syncPedestrians3D(time);syncMission3D(time);updateFX3(dt);
 if(player){
   const pos=v3(player.x,player.y,.26),fwd=new T3.Vector3(Math.cos(player.a),0,Math.sin(player.a)),portrait=coarse&&innerHeight>innerWidth,pull=Math.min(2.0,Math.abs(player.speed)*.0055);
   const distBack=(portrait?7.0:7.6)+pull,height=portrait?5.15:4.55,target=pos.clone().addScaledVector(fwd,portrait?3.15:3.5);target.y=.48;let desired=pos.clone().addScaledVector(fwd,-distBack);desired.y=height;
   if(cameraShake3>0){const s=cameraShake3*.22;desired.x+=(Math.random()-.5)*s;desired.y+=(Math.random()-.5)*s;desired.z+=(Math.random()-.5)*s}
   cam3.position.lerp(desired,1-Math.pow(.0008,dt));cam3.lookAt(target);updateCameraOcclusion3(target);
   if(player.health<lastHealth3-.3)sparkBurst3(clamp((lastHealth3-player.health)/10,.25,1));lastHealth3=player.health;
 }
 renderer3.render(scene3,cam3)
}
/* ===== END 3D CITY RENDERER ===== */

function buildWorld(){
 roads.length=0;blocks.length=0;decor.length=0;
 roadXs.forEach(x=>roads.push({x:x-(x===0?ROAD_MAIN:ROAD_SIDE)/2,y:-WORLD,w:x===0?ROAD_MAIN:ROAD_SIDE,h:WORLD*2,axis:'v'}));
 roadYs.forEach(y=>roads.push({x:-WORLD,y:y-(y===0?ROAD_MAIN:ROAD_SIDE)/2,w:WORLD*2,h:y===0?ROAD_MAIN:ROAD_SIDE,axis:'h'}));
 const halfX=x=>x===0?ROAD_MAIN/2:ROAD_SIDE/2,halfY=y=>y===0?ROAD_MAIN/2:ROAD_SIDE/2;
 for(let xi=0;xi<roadXs.length-1;xi++)for(let yi=0;yi<roadYs.length-1;yi++){
   const l=roadXs[xi]+halfX(roadXs[xi])+22,r=roadXs[xi+1]-halfX(roadXs[xi+1])-22,t=roadYs[yi]+halfY(roadYs[yi])+22,b=roadYs[yi+1]-halfY(roadYs[yi+1])-22;
   const type=(xi+yi)%5===0?'park':(xi*3+yi)%4===0?'parking':'building';
   blocks.push({x:l,y:t,w:r-l,h:b-t,type,shade:(xi+yi)%4});
   if(type==='park'){for(let k=0;k<6;k++)decor.push({type:'tree',x:l+45+Math.random()*(r-l-90),y:t+45+Math.random()*(b-t-90),small:k%2===0})}
   else{for(let k=0;k<2;k++)decor.push({type:'tree',x:l+25+(k?Math.max(20,r-l-50):0),y:t+30+Math.random()*Math.max(20,b-t-60),small:true})}
 }
}
function onRoad(x,y,m=0){return roads.some(r=>x>r.x-m&&x<r.x+r.w+m&&y>r.y-m&&y<r.y+r.h+m)}
function buildingHit(x,y,r=15){if(Math.abs(x)>WORLD-r||Math.abs(y)>WORLD-r)return true;return blocks.some(b=>b.type==='building'&&x+r>b.x+10&&x-r<b.x+b.w-10&&y+r>b.y+10&&y-r<b.y+b.h-10)}
function nearRoad(x,y){let best={x,y,d:1e9};for(const rx of roadXs){const d=Math.abs(x-rx);if(d<best.d)best={x:rx,y:clamp(y,-WORLD+70,WORLD-70),d}}for(const ry of roadYs){const d=Math.abs(y-ry);if(d<best.d)best={x:clamp(x,-WORLD+70,WORLD-70),y:ry,d}}return best}
function nearestIntersection(x,y){let out={x:0,y:0,d:1e9};for(const rx of roadXs)for(const ry of roadYs){const d=Math.hypot(x-rx,y-ry);if(d<out.d)out={x:rx,y:ry,d}}return out}
function roadPoint(origin,min=400,max=950){for(let i=0;i<80;i++){const vertical=Math.random()<.5,p=vertical?{x:roadXs[Math.floor(Math.random()*roadXs.length)]+(Math.random()<.5?-34:34),y:origin.y+(Math.random()*2-1)*max}:{x:origin.x+(Math.random()*2-1)*max,y:roadYs[Math.floor(Math.random()*roadYs.length)]+(Math.random()<.5?-34:34)};p.x=clamp(p.x,-WORLD+100,WORLD-100);p.y=clamp(p.y,-WORLD+100,WORLD-100);const d=Math.hypot(p.x-origin.x,p.y-origin.y);if(d>=min&&d<=max&&onRoad(p.x,p.y,10))return p}return{x:origin.x+500,y:origin.y}}
function laneOffsetForAngle(a){
 const horiz=Math.abs(Math.cos(a))>.7;
 return horiz?(Math.cos(a)>=0?34:-34):(Math.sin(a)>=0?-34:34)
}
function trafficSpawnPoint(){
 const horizontal=Math.random()<.5,dir=Math.random()<.5?-1:1;
 if(horizontal){
  const center=roadYs[Math.floor(Math.random()*roadYs.length)],a=dir>0?0:Math.PI;
  return{x:rnd(-WORLD+120,WORLD-120),y:center+laneOffsetForAngle(a),a}
 }
 const center=roadXs[Math.floor(Math.random()*roadXs.length)],a=dir>0?Math.PI/2:-Math.PI/2;
 return{x:center+laneOffsetForAngle(a),y:rnd(-WORLD+120,WORLD-120),a}
}
function trafficSpawnNear(origin,min=420,max=900){
 for(let i=0;i<90;i++){const p=trafficSpawnPoint(),d=Math.hypot(p.x-origin.x,p.y-origin.y);if(d>=min&&d<=max)return p}
 return trafficSpawnPoint()
}
function trafficDesiredSpeed(car,desired){
 let best=1e9;
 for(const other of cars){
  if(other===car||other.stopped)continue;
  const dx=other.x-car.x,dy=other.y-car.y,front=dx*Math.cos(car.a)+dy*Math.sin(car.a),lat=Math.abs(-dx*Math.sin(car.a)+dy*Math.cos(car.a));
  if(front>0&&front<best&&lat<42)best=front
 }
 if(best<48)return Math.min(desired,0);
 if(best<90)return Math.min(desired,(best-45)*1.7);
 if(best<145)return Math.min(desired,75+(best-90)*.75);
 return desired
}
function snapTrafficToLane(car,inter=null){
 const horiz=Math.abs(Math.cos(car.a))>.7;
 if(horiz){
  const ry=inter?inter.y:roadYs.reduce((a,b)=>Math.abs(b-car.y)<Math.abs(a-car.y)?b:a,roadYs[0]);
  car.y=ry+laneOffsetForAngle(car.a)
 }else{
  const rx=inter?inter.x:roadXs.reduce((a,b)=>Math.abs(b-car.x)<Math.abs(a-car.x)?b:a,roadXs[0]);
  car.x=rx+laneOffsetForAngle(car.a)
 }
}
function spawnPedestrians(n=24){
 pedestrians=[];
 for(let i=0;i<n;i++){
  const axis=Math.random()<.5?'h':'v',dir=Math.random()<.5?-1:1,side=Math.random()<.5?-1:1;
  if(axis==='h'){
   const road=roadYs[Math.floor(Math.random()*roadYs.length)],width=road===0?ROAD_MAIN:ROAD_SIDE;
   pedestrians.push({axis,dir,side,x:rnd(-WORLD+90,WORLD-90),y:road+side*(width/2+18),speed:rnd(20,34),variant:i%4,phase:rnd(0,TAU),wait:0})
  }else{
   const road=roadXs[Math.floor(Math.random()*roadXs.length)],width=road===0?ROAD_MAIN:ROAD_SIDE;
   pedestrians.push({axis,dir,side,x:road+side*(width/2+18),y:rnd(-WORLD+90,WORLD-90),speed:rnd(20,34),variant:i%4,phase:rnd(0,TAU),wait:0})
  }
 }
 clearPedNodes3()
}
function updatePedestrians(dt){
 for(const p of pedestrians){
  const near=player&&dist(player,p)<105&&Math.abs(player.speed)>55;
  if(near)p.wait=Math.max(p.wait,.7);
  if(p.wait>0){p.wait-=dt;continue}
  if(p.axis==='h')p.x+=p.dir*p.speed*dt;else p.y+=p.dir*p.speed*dt;
  if(p.x<-WORLD+70||p.x>WORLD-70||p.y<-WORLD+70||p.y>WORLD-70)p.dir*=-1
 }
}
function separateTrafficCars(){
 for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){
  const a=cars[i],b=cars[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=31;
  if(d>0&&d<min){const nx=dx/d,ny=dy/d,over=(min-d)*.5;a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;a.speed*=.82;b.speed*=.82}
 }
}
class Car{
 constructor(x,y,a=0,sprite=A.cars[0]){this.x=x;this.y=y;this.a=a;this.speed=0;this.sprite=sprite;this.radius=17;this.health=100;this.target=145+Math.random()*28;this.turnCd=0;this.stopped=false;this.suspect=false;this.fleeing=false;this.yield=0}
 move(dt){const nx=this.x+Math.cos(this.a)*this.speed*dt,ny=this.y+Math.sin(this.a)*this.speed*dt;if(buildingHit(nx,ny,this.radius)){const impact=Math.abs(this.speed);this.speed*=-.12;if(this===player&&impact>70){this.health=clamp(this.health-(impact-60)*.04,0,100);sfx('combat.impact_heavy',{volume:.18,cooldownMs:150});sparkBurst3(clamp((impact-60)/170,.25,1))}}else{this.x=nx;this.y=ny}}
}
class Player extends Car{
 constructor(){super(32,360,-Math.PI/2,A.police);this.siren=false;this.cooldown=0}
 update(dt){this.cooldown=Math.max(0,this.cooldown-dt);let throttle=0,brake=false,rev=false;if(coarse){throttle=touch.boost?1:0;brake=touch.brake;rev=touch.reverse;if(brake||rev)throttle=0}else{throttle=keys.w?1:0;brake=keys.s;rev=keys.r}
  if(throttle){if(this.speed<0)this.speed=Math.min(0,this.speed+380*dt);else this.speed+=285*throttle*dt}
  if(brake)this.speed=this.speed>0?Math.max(0,this.speed-470*dt):Math.min(0,this.speed+470*dt);
  if(rev&&!brake)this.speed=this.speed>0?Math.max(0,this.speed-480*dt):this.speed-200*dt;
  if(!throttle&&!brake&&!rev)this.speed+=(this.speed>0?-1:1)*Math.min(Math.abs(this.speed),115*dt);
  this.speed=clamp(this.speed,-105,270);
  const steer=coarse?touch.steer:(keys.a?-1:0)+(keys.d?1:0),grip=clamp(Math.abs(this.speed)/40,0,1);
  if(Math.abs(this.speed)>2)this.a+=steer*1.85*grip*(1-.32*Math.abs(this.speed)/270)*dt*(this.speed>=0?1:-1);
  this.move(dt);if(!onRoad(this.x,this.y,18))this.speed*=Math.pow(.978,dt*60)
 }
}
class TrafficCar extends Car{
 update(dt){
  if(this.stopped){this.speed=Math.max(0,this.speed-300*dt);return}
  this.turnCd=Math.max(0,this.turnCd-dt);
  let desired=this.suspect&&this.fleeing?(this.commandStop?0:(this.fleeSpeed||195)):this.target;
  if(this.yield>0){
   this.yield-=dt;desired=Math.min(desired,55);
   const side=this.yieldSide||1,isH=Math.abs(Math.cos(this.a))>.7,inter=nearestIntersection(this.x,this.y);
   if(isH)this.y=lerp(this.y,inter.y+side*70,dt*1.1);
   else this.x=lerp(this.x,inter.x+side*70,dt*1.1)
  }
  if(!this.suspect)desired=trafficDesiredSpeed(this,desired);
  if(this.speed<desired)this.speed=Math.min(desired,this.speed+105*dt);else this.speed=Math.max(desired,this.speed-150*dt);
  const inter=nearestIntersection(this.x,this.y);
  if(inter.d<38&&this.turnCd<=0&&this.yield<=0){
   let turn=Math.random()<.64?0:(Math.random()<.5?-1:1);
   if(this.suspect&&this.fleeing)turn=Math.random()<.48?0:(Math.random()<.5?-1:1);
   this.a+=turn*Math.PI/2;
   const horiz=Math.abs(Math.cos(this.a))>.7;
   if(horiz){this.x=inter.x+Math.cos(this.a)*62;this.y=inter.y+laneOffsetForAngle(this.a)}
   else{this.x=inter.x+laneOffsetForAngle(this.a);this.y=inter.y+Math.sin(this.a)*62}
   this.turnCd=1.25
  }
  if(Math.abs(Math.cos(this.a))>.7){
   const ry=roadYs.reduce((a,b)=>Math.abs(b-this.y)<Math.abs(a-this.y)?b:a,roadYs[0]),lane=ry+laneOffsetForAngle(this.a);this.y=lerp(this.y,lane,clamp(dt*2.4,0,1))
  }else{
   const rx=roadXs.reduce((a,b)=>Math.abs(b-this.x)<Math.abs(a-this.x)?b:a,roadXs[0]),lane=rx+laneOffsetForAngle(this.a);this.x=lerp(this.x,lane,clamp(dt*2.4,0,1))
  }
  this.move(dt)
 }
}
function spawnTraffic(n=18){
 cars=[];
 for(let i=0;i<n;i++){const p=trafficSpawnPoint(),c=new TrafficCar(p.x,p.y,p.a,A.cars[i%A.cars.length]);c.target=118+Math.random()*34;cars.push(c)}
}
function updateYield(){if(!player.siren)return;for(const c of cars){if(c.suspect)continue;const d=dist(player,c);if(d<330){c.yield=Math.max(c.yield,1.2);c.yieldSide=((c.x+c.y)%2>0?1:-1)}}}
function collisions(){for(const c of cars){const dx=c.x-player.x,dy=c.y-player.y,d=Math.hypot(dx,dy);if(d>0&&d<34){const nx=dx/d,ny=dy/d,over=34-d;player.x-=nx*over*.5;player.y-=ny*over*.5;c.x+=nx*over*.5;c.y+=ny*over*.5;const impact=Math.abs(player.speed-c.speed);player.speed*=.73;c.speed*=.73;if(impact>100){player.health=clamp(player.health-(impact-90)*.025,0,100);sfx('combat.impact_heavy',{volume:.16,cooldownMs:120});sparkBurst3(clamp((impact-90)/180,.25,1))}}}}
function missionTarget(){if(!mission)return null;if(mission.type==='pursuit')return mission.suspect;if(mission.type==='accident'||mission.type==='obstacle')return mission.scene;if(mission.type==='traffic')return mission.points[Math.min(mission.index,2)];return mission.point}
function spawnMission(){
 const roll=Math.random();let type=missionIssued===0?'pursuit':roll<.43?'pursuit':roll<.63?'accident':roll<.76?'crosswalk':roll<.88?'traffic':'obstacle';
 if(type===lastMissionType&&type!=='pursuit')type=Math.random()<.52?'pursuit':(type==='accident'?'crosswalk':'accident');
 missionIssued++;lastMissionType=type;
 if(type==='pursuit')spawnPursuit();else if(type==='accident')spawnAccident();else if(type==='crosswalk')spawnCrosswalkMission();else if(type==='traffic')spawnTrafficMission();else spawnObstacle()
}
function spawnPursuit(){
 const p=trafficSpawnNear(player,480,920),s=new TrafficCar(p.x,p.y,p.a,A.suspect),variants=[
  ['긴급 신고','수배 차량 추격','수배 차량을 발견했습니다. 사이렌을 켜고 가까운 거리에서 정차 명령을 유지하세요.'],
  ['뺑소니 신고','도주 차량 추격','사고 현장을 이탈한 차량입니다. 무리한 충돌 대신 사이렌으로 압박해 안전하게 정차시키세요.'],
  ['난폭 운전','위험 차량 추격','난폭 운전 차량이 도주 중입니다. 차량을 시야에 두고 정차 명령 게이지를 채우세요.']
 ],v=variants[Math.floor(Math.random()*variants.length)];
 s.suspect=true;s.target=165;s.fleeSpeed=205+Math.random()*22;s.commandStop=false;cars.push(s);
 mission={type:'pursuit',suspect:s,time:0,max:72,progress:0,phase:'locate',variant:v[1]};missionKey3='';
 setMission(v[0],v[1],v[2]);radio('용의 차량 위치 전송. 추격 중 민간 차량과 보행자를 주의하세요.','#ff8290')
}
function spawnAccident(){const p=roadPoint(player,380,760);mission={type:'accident',scene:p,time:0,max:55};missionKey3='';setMission('교통 사고','현장 안전 확보','사고 현장에 정차한 뒤 2차 사고를 막고 현장 조치를 완료하세요.');radio('접촉 사고 신고. 2차 사고 예방이 우선입니다.')}
function spawnCrosswalkMission(){
 const guess=nearestIntersection(player.x+(Math.random()<.5?GRID:-GRID),player.y+(Math.random()<.5?GRID:-GRID)),p={x:guess.x,y:guess.y};
 mission={type:'crosswalk',point:p,time:0,max:55,progress:0,active:false};missionKey3='';
 setMission('생활 안전','횡단보도 보행자 보호','현장에 정차한 뒤 통행 보호를 시작하고, 주변 차량이 속도를 줄이도록 경광 사이렌을 켜세요.');
 radio('보행자 통행 보호 요청. 횡단보도 주변 차량에 주의하세요.','#8ef0ac')
}
function spawnTrafficMission(){const c=nearestIntersection(player.x+(Math.random()<.5?GRID:-GRID),player.y+(Math.random()<.5?GRID:-GRID)),pts=[{x:c.x-150,y:c.y-30},{x:c.x+30,y:c.y-150},{x:c.x+150,y:c.y+30}];mission={type:'traffic',points:pts,index:0,time:0,max:62};missionKey3='';setMission('교통 정리','안전콘 설치','노란 표시 3곳에 정차해 안전콘을 설치하세요.');radio('교차로 혼잡 신고. 안전 구역을 만들어 주세요.','#ffe18b')}
function spawnObstacle(){const p=roadPoint(player,350,720);mission={type:'obstacle',scene:p,time:0,max:50};missionKey3='';setMission('도로 위험','낙하물 정리','도로 장애물 주변에 정차한 뒤 안전하게 치우세요.');radio('차로에 장애물이 있다는 신고입니다.','#ffd17a')}
function finish(points,msg){score+=points;solved++;mission=null;missionKey3='';missionDelay=2.6;setMission('순찰','다음 신고 대기 중','주변을 순찰하며 무전을 기다리세요.');ui.meta.textContent='';setAction();setProgress();radio(msg,'#8ef0ac');sfx('success.cheer_yay',{volume:.2,cooldownMs:500})}
function fail(msg){if(mission?.suspect){const i=cars.indexOf(mission.suspect);if(i>=0)cars.splice(i,1)}mission=null;missionKey3='';missionDelay=2.2;setMission('순찰','신고 재배정','다음 신고를 확인하고 있습니다.');ui.meta.textContent='';setAction();setProgress();radio(msg,'#ff9aa4')}
function setProgress(pct=null,color='#ff5a67'){if(pct==null){ui.progress.style.display='none';return}ui.progress.style.display='block';ui.progressBar.style.width=clamp(pct,0,100)+'%';ui.progressBar.style.background=color}
function setAction(label,fn){if(!label){ui.action.style.display='none';ui.action.onclick=null;return}ui.action.style.display='block';ui.action.textContent=label;ui.action.onclick=fn||null}
function updateMission(dt){
 if(!mission){missionDelay-=dt;if(missionDelay<=0)spawnMission();return}
 mission.time+=dt;if(mission.time>mission.max)return fail('처리 시간이 지나 다음 신고로 넘어갑니다.');
 const t=missionTarget(),d=t?dist(player,t):0;ui.meta.textContent='목표 '+Math.max(1,Math.round(d*.12))+'m · '+Math.ceil(mission.max-mission.time)+'초';
 if(mission.type==='pursuit'){
  const s=mission.suspect;
  if(d<420&&player.siren){s.fleeing=true;mission.phase='chase'}
  if(!s.fleeing){setProgress(d<500?12:null);ui.meta.textContent+=' · 사이렌으로 추격 시작';}
  else{
   const close=player.siren&&d<205,veryClose=player.siren&&d<125;
   if(close)mission.progress+=dt*(veryClose?1.35:1);else mission.progress=Math.max(0,mission.progress-dt*.42);
   const pct=clamp(mission.progress/4.2*100,0,100);setProgress(pct,'#ff5a67');ui.meta.textContent+=' · 정차 명령 '+Math.round(pct)+'%';
   if(mission.progress>=3.35)s.commandStop=true;
   if(s.commandStop)s.speed=Math.max(0,s.speed-190*dt);
   if(mission.progress>=4.2&&s.speed<22&&d<190){
    s.stopped=true;const i=cars.indexOf(s);if(i>=0)cars.splice(i,1);finish(1.8,'도주 차량을 안전하게 정차시켰습니다.')
   }
  }
 }
 else if(mission.type==='accident'){const parked=d<118&&Math.abs(player.speed)<8;setProgress(d<150?(parked?100:55):null,'#4aa8ff');if(d<135)setAction(parked?'현장 안전 확보 (Enter)':'완전히 정차하세요',parked?()=>finish(1,'사고 현장 수습 완료'):null);else setAction()}
 else if(mission.type==='crosswalk'){
   const parked=d<125&&Math.abs(player.speed)<8;
   if(!mission.active){
     setProgress(d<155?(parked?20:8):null,'#63d997');
     if(d<135)setAction(parked?'보행자 통행 보호 시작 (Enter)':'횡단보도 옆에 완전히 정차하세요',parked?()=>{mission.active=true;setAction();radio('통행 보호 시작. 사이렌을 켜 접근 차량을 감속시키세요.','#8ef0ac')}:null);else setAction()
   }else{
     const safe=parked&&player.siren;if(safe)mission.progress+=dt;else mission.progress=Math.max(0,mission.progress-dt*.45);
     setProgress(mission.progress/3.2*100,'#63d997');ui.meta.textContent+=' · 통행 보호 '+Math.round(clamp(mission.progress/3.2*100,0,100))+'%';
     setAction(safe?'보행자 통행 중':'정차 + 사이렌 유지');if(mission.progress>=3.2)finish(1.3,'보행자들이 안전하게 횡단했습니다.')
   }
 }
 else if(mission.type==='traffic'){const p=mission.points[mission.index],dd=dist(player,p),parked=dd<82&&Math.abs(player.speed)<8;if(dd<90)setAction(parked?'안전콘 설치 '+(mission.index+1)+'/3':'이 지점에 정차하세요',parked?()=>{mission.index++;missionKey3='';sfx('collect.coin_drop',{volume:.15,cooldownMs:100});if(mission.index>=3)finish(1.2,'교차로 안전 확보 완료')}:null);else setAction()}
 else if(mission.type==='obstacle'){const parked=d<105&&Math.abs(player.speed)<8;if(d<120)setAction(parked?'장애물 치우기':'차량을 정차하세요',parked?()=>finish(1,'도로 장애물 제거 완료'):null);else setAction()}
}
function toggleSiren(){if(state!=='playing')return;player.siren=!player.siren;ui.siren.textContent=player.siren?'ON':'OFF';ui.siren.style.color=player.siren?'#6bb6ff':'#eef5ff';sfx(player.siren?'collect.coin_pickup':'collect.coin_drop',{volume:.14,cooldownMs:100})}
function recover(){if(!player||state!=='playing'||player.cooldown>0)return;const p=nearRoad(player.x,player.y);player.x=p.x;player.y=p.y;player.speed=0;player.cooldown=4;radio('가까운 도로로 복귀했습니다.')}
function drawSprite(src,x,y,w,h,a=0,alpha=1){const im=img(src);if(!im)return false;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();return true}
let grassPattern=null,roadPattern=null;
function patterns(){if(!grassPattern&&img(A.grass))grassPattern=ctx.createPattern(img(A.grass),'repeat');if(!roadPattern&&img(A.road))roadPattern=ctx.createPattern(img(A.road),'repeat')}
function drawWorld(){
 patterns();ctx.fillStyle=grassPattern||'#476f3f';ctx.fillRect(-WORLD,-WORLD,WORLD*2,WORLD*2);
 for(const b of blocks){if(b.type==='park'){ctx.fillStyle='rgba(81,137,73,.72)';ctx.fillRect(b.x,b.y,b.w,b.h)}
 else if(b.type==='parking'){ctx.fillStyle='#6f7578';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=3;for(let y=b.y+30;y<b.y+b.h-20;y+=48){ctx.beginPath();ctx.moveTo(b.x+20,y);ctx.lineTo(b.x+b.w-20,y);ctx.stroke()}}
 else{const colors=['#6f7d89','#8a786d','#71887d','#80758b'];ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(b.x+10,b.y+12,b.w-4,b.h-4);ctx.fillStyle=colors[b.shade];ctx.fillRect(b.x,b.y,b.w-10,b.h-10);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(b.x+14,b.y+14,b.w-38,16);ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=4;ctx.strokeRect(b.x,b.y,b.w-10,b.h-10)}}
 for(const r of roads){ctx.fillStyle=roadPattern||'#555b60';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.fillStyle='rgba(45,48,51,.66)';ctx.fillRect(r.x,r.y,r.w,r.h)}
 ctx.strokeStyle='#f3c94f';ctx.lineWidth=4;for(const x of roadXs){ctx.beginPath();ctx.moveTo(x,-WORLD);ctx.lineTo(x,WORLD);ctx.stroke()}for(const y of roadYs){ctx.beginPath();ctx.moveTo(-WORLD,y);ctx.lineTo(WORLD,y);ctx.stroke()}
 ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=2;ctx.setLineDash([22,20]);for(const x of roadXs){ctx.beginPath();ctx.moveTo(x-55,-WORLD);ctx.lineTo(x-55,WORLD);ctx.stroke();ctx.beginPath();ctx.moveTo(x+55,-WORLD);ctx.lineTo(x+55,WORLD);ctx.stroke()}for(const y of roadYs){ctx.beginPath();ctx.moveTo(-WORLD,y-55);ctx.lineTo(WORLD,y-55);ctx.stroke();ctx.beginPath();ctx.moveTo(-WORLD,y+55);ctx.lineTo(WORLD,y+55);ctx.stroke()}ctx.setLineDash([]);
 for(const d of decor)drawSprite(d.small?A.treeSmall:A.tree,d.x,d.y,d.small?42:58,d.small?42:58,-Math.PI/2)
}
function drawPedestrians2D(){
 for(const p of pedestrians){
  ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=['#4b75a8','#b65e65','#4e8f68','#a7864f'][p.variant%4];ctx.beginPath();ctx.arc(0,0,7,0,TAU);ctx.fill();
  ctx.fillStyle='#d7aa86';ctx.beginPath();ctx.arc(0,-8,4,0,TAU);ctx.fill();ctx.restore()
 }
}
function drawCar(c,police=false){const ok=drawSprite(c.sprite,c.x,c.y,police?46:42,police?82:76,c.a);if(!ok){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);ctx.fillStyle=police?'#3d8deb':'#ddd';ctx.fillRect(-36,-17,72,34);ctx.restore()}if(police){drawSprite(A.lights,c.x,c.y,18,34,c.a);if(player.siren){ctx.save();ctx.globalAlpha=.25+.15*Math.sin(shiftTime*12);ctx.fillStyle=Math.sin(shiftTime*12)>0?'#ff3348':'#3387ff';ctx.beginPath();ctx.arc(c.x,c.y,46,0,TAU);ctx.fill();ctx.restore()}}}
function drawMission(){
 if(!mission)return;const t=missionTarget();if(!t)return;const col=mission.type==='pursuit'?'#ff586a':mission.type==='traffic'?'#ffd85e':'#53aaff';
 ctx.save();ctx.strokeStyle=col;ctx.lineWidth=5;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(t.x,t.y,mission.type==='pursuit'?62:90,0,TAU);ctx.stroke();ctx.globalAlpha=.14;ctx.fillStyle=col;ctx.fill();ctx.restore();
 if(mission.type==='accident'){for(let i=-1;i<=1;i++){drawSprite(A.cone,t.x+55,t.y+i*34,24,30,-Math.PI/2);drawSprite(A.skid,t.x-18+i*20,t.y+14+i*8,45,11,.25)}drawSprite(A.barrier,t.x-55,t.y,46,24,-Math.PI/2)}
 if(mission.type==='traffic')for(let i=0;i<mission.index;i++)drawSprite(A.cone,mission.points[i].x,mission.points[i].y,24,30,-Math.PI/2);
 if(mission.type==='obstacle'){drawSprite(A.barrier,t.x,t.y,52,28,-Math.PI/2);drawSprite(A.cone,t.x+35,t.y+28,22,28,-Math.PI/2)}
 if(mission.type==='crosswalk'){ctx.save();ctx.fillStyle='rgba(245,245,235,.85)';for(let i=-2;i<=2;i++)ctx.fillRect(t.x+i*22-6,t.y-50,12,100);ctx.fillStyle='#f1b08b';for(const p of [[-46,-34],[40,36],[-70,32]]){ctx.beginPath();ctx.arc(t.x+p[0],t.y+p[1],8,0,TAU);ctx.fill()}ctx.restore()}
}
function drawArrow(){if(!mission)return;const t=missionTarget();if(!t)return;const a=Math.atan2(t.y-player.y,t.x-player.x);ctx.save();ctx.translate(player.x,player.y);ctx.rotate(a);ctx.fillStyle='rgba(255,214,91,.95)';ctx.beginPath();ctx.moveTo(96,0);ctx.lineTo(67,-13);ctx.lineTo(67,13);ctx.closePath();ctx.fill();ctx.restore()}
function drawMinimap(){const w=mm.width,h=mm.height,range=1550,sc=w*.46/range;mctx.clearRect(0,0,w,h);mctx.save();mctx.translate(w/2,h/2);mctx.scale(sc,sc);mctx.translate(-player.x,-player.y);mctx.fillStyle='#355b36';mctx.fillRect(-WORLD,-WORLD,WORLD*2,WORLD*2);mctx.fillStyle='#656b70';for(const r of roads)mctx.fillRect(r.x,r.y,r.w,r.h);if(mission){const t=missionTarget();if(t){mctx.strokeStyle='#ffda5b';mctx.lineWidth=20;mctx.globalAlpha=.55;mctx.beginPath();mctx.moveTo(player.x,player.y);mctx.lineTo(t.x,player.y);mctx.lineTo(t.x,t.y);mctx.stroke();mctx.globalAlpha=1;mctx.fillStyle='#ffda5b';mctx.beginPath();mctx.arc(t.x,t.y,30,0,TAU);mctx.fill()}}mctx.fillStyle='#49a8ff';mctx.beginPath();mctx.arc(player.x,player.y,27,0,TAU);mctx.fill();mctx.restore()}
function update(dt){
 if(state!=='playing')return;shiftTime+=dt;if(shiftTime>=SHIFT){endGame();return}
 player.update(dt);for(const c of cars)c.update(dt);separateTrafficCars();updatePedestrians(dt);updateYield();collisions();updateMission(dt);driveAudio.update(player.speed,player.siren,shiftTime);
 camera.x=lerp(camera.x,player.x,1-Math.pow(.002,dt));camera.y=lerp(camera.y,player.y,1-Math.pow(.002,dt));const frame=framingZoom(),targetZoom=frame*clamp(1.03-Math.abs(player.speed)/1350,.84,1.02);camera.zoom=lerp(camera.zoom,targetZoom,1-Math.pow(.03,dt));
 if(radioTimer>0&&(radioTimer-=dt)<=0)ui.radio.classList.remove('show');
 if(player.health<=0){const p=nearRoad(player.x,player.y);player.x=p.x;player.y=p.y;player.speed=0;player.health=65;radio('차량이 견인되어 65% 상태로 복귀했습니다.','#ffb074')}
 ui.speed.textContent=Math.round(Math.abs(player.speed)*.44);ui.health.textContent=Math.round(player.health)+'%';ui.health.style.color=player.health<35?'#ff6879':'#eef5ff';ui.solved.textContent=solved;ui.score.textContent=score.toFixed(1);
 const remain=Math.max(0,SHIFT-shiftTime),m=Math.floor(remain/60),s=Math.floor(remain%60);ui.shift.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')
}
function render(){const t=performance.now()/1000;if(threeReady3){render3D(t)}else{ctx.clearRect(0,0,view.w,view.h);ctx.save();ctx.translate(view.w/2,view.h/2);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);drawWorld();drawPedestrians2D();drawMission();drawArrow();for(const c of cars)drawCar(c);if(player)drawCar(player,true);ctx.restore()}if(player)drawMinimap()}
function loop(now){const dt=clamp((now-last)/1000,0,.05);last=now;update(dt);render();requestAnimationFrame(loop)}
function resetInputs(){for(const k of Object.keys(keys))keys[k]=false;touch.steer=0;touch.brake=false;touch.reverse=false;touch.boost=false;if(typeof knob!=='undefined'&&knob)knob.style.transform='translate(0,0)'}
function startGame(){driveAudio.init();resetInputs();resize();score=0;solved=0;shiftTime=0;mission=null;missionDelay=.8;missionKey3='';missionIssued=0;lastMissionType='';buildWorld();if(threeReady3){rebuildCity3D();clearCarNodes3();clearPedNodes3()}player=new Player();spawnTraffic();spawnPedestrians();lastHealth3=player.health;camera.x=player.x;camera.y=player.y;camera.zoom=framingZoom();state='playing';ui.start.classList.remove('show');ui.end.classList.remove('show');setMission('순찰','근무 시작','첫 신고를 기다리며 주변을 순찰하세요.');setAction();setProgress();radio('순찰 근무를 시작합니다. 안전 운전하세요.');prepare3D().then(ok=>{if(ok){rebuildCity3D();clearCarNodes3();resize3D()}}).catch(err=>console.warn('[Police3D] preload failed, using 2D fallback',err));if(!raf){raf=true;last=performance.now();requestAnimationFrame(loop)}}
function endGame(){state='end';player.siren=false;driveAudio.update(0,false,shiftTime);setAction();setProgress();ui.endTitle.textContent=solved>=7?'베테랑 순찰팀':solved>=4?'안정적인 순찰 완료':'오늘의 순찰 완료';ui.endText.textContent='6분 동안 '+solved+'건을 해결하고 실적 '+score.toFixed(1)+'점을 기록했어요.';ui.end.classList.add('show')}
addEventListener('keydown',e=>{if(state!=='playing')return;const k=e.key.toLowerCase();if(k==='w'||k==='arrowup')keys.w=true;if(k==='s'||k==='arrowdown')keys.s=true;if(k==='a'||k==='arrowleft')keys.a=true;if(k==='d'||k==='arrowright')keys.d=true;if(k==='r')keys.r=true;if(k===' '&&!e.repeat){e.preventDefault();toggleSiren()}if(k==='enter'&&!e.repeat&&ui.action.onclick)ui.action.onclick();if(k==='t'&&!e.repeat)recover()});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='w'||k==='arrowup')keys.w=false;if(k==='s'||k==='arrowdown')keys.s=false;if(k==='a'||k==='arrowleft')keys.a=false;if(k==='d'||k==='arrowright')keys.d=false;if(k==='r')keys.r=false});
function hold(el,key){const on=e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);touch[key]=true},off=e=>{e.preventDefault();touch[key]=false};el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('lostpointercapture',off)}
hold($('#brakeBtn'),'brake');hold($('#reverseBtn'),'reverse');hold($('#boostBtn'),'boost');$('#sirenBtn').addEventListener('pointerdown',e=>{e.preventDefault();toggleSiren()});
let joyId=null;const joy=$('#joy'),knob=$('#knob');
function joyMove(e){const r=joy.getBoundingClientRect(),dx=clamp(e.clientX-(r.left+r.width/2),-36,36);touch.steer=dx/36;knob.style.transform='translate('+dx+'px,0)'}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture?.(e.pointerId);joyMove(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e)});
function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;touch.steer=0;knob.style.transform='translate(0,0)'}
joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);joy.addEventListener('lostpointercapture',joyEnd);
addEventListener('blur',resetInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInputs()});addEventListener('pointerup',()=>{touch.brake=false;touch.reverse=false;touch.boost=false});addEventListener('pointercancel',()=>{touch.brake=false;touch.reverse=false;touch.boost=false});
$('#startBtn').addEventListener('click',startGame);$('#restartBtn').addEventListener('click',startGame);
buildWorld();render();prepare3D().then(ok=>{if(ok){rebuildCity3D();resize3D();render()}}).catch(err=>console.warn('[Police3D] background preload failed',err));
