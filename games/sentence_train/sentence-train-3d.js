(()=>{
'use strict';
const THREE=window.THREE,GLTFLoader=window.GLTFLoader;
const canvas=document.getElementById('train3d');
if(!THREE||!GLTFLoader||!canvas)return;

const base=(()=>{try{return new URL('.',document.currentScript?.src||location.href)}catch(_){return new URL('.',location.href)}})();
const asset=p=>new URL('../../assets/game/'+p,base).href;
const MODEL={
 loco:asset('3d/rail/kenney-train-kit/train-locomotive-a.glb'),
 blue:asset('3d/rail/kenney-train-kit/train-carriage-container-blue.glb'),
 green:asset('3d/rail/kenney-train-kit/train-carriage-container-green.glb'),
 red:asset('3d/rail/kenney-train-kit/train-carriage-container-red.glb'),
 box:asset('3d/rail/kenney-train-kit/train-carriage-box.glb'),
 connector:asset('3d/rail/kenney-train-kit/train-connector.glb'),
 rail:asset('3d/rail/kenney-train-kit/railroad-straight.glb'),
 tree:asset('3d/nature/kenney-nature-kit/tree-default.glb'),
 stationA:asset('3d/city/kenney-city-kit-suburban/building-type-f.glb'),
 stationB:asset('3d/city/kenney-city-kit-suburban/building-type-h.glb'),
 stationC:asset('3d/city/kenney-city-kit-suburban/building-type-d.glb'),
 stationD:asset('3d/city/kenney-city-kit-suburban/building-type-q.glb'),
 locoPassenger:asset('3d/rail/kenney-train-kit/train-locomotive-passenger-a.glb'),
 diesel:asset('3d/rail/kenney-train-kit/train-diesel-a.glb'),
 electric:asset('3d/rail/kenney-train-kit/train-electric-city-a.glb'),
 woodCar:asset('3d/rail/kenney-train-kit/train-carriage-wood.glb'),
 flatCar:asset('3d/rail/kenney-train-kit/train-carriage-flatbed-wood.glb'),
 bench:asset('3d/interiors/kenney-furniture-kit/bench.glb'),
 lamp:asset('3d/city/kenney-city-kit-roads/light-curved.glb'),
 bush:asset('3d/nature/kenney-nature-kit/plant-bush.glb'),
 flower:asset('3d/nature/kenney-nature-kit/flower-yellow-a.glb'),
 sign:asset('3d/nature/kenney-nature-kit/sign.glb')
};
let scene,camera,renderer,loader,trainGroup,railGroup,decorGroup,stationGroup,trackCurve;
let models=new Map(),ready=false,departT=-1,last=performance.now(),carCount=4,pulse=0,stationIndex=Number(document.body.dataset.stationIndex)||0,trainTheme=document.body.dataset.trainTheme||'easy',trainUnits=[];
const palette=['blue','green','red','box'];
const TRAIN_PALETTES={
 easy:{body:0x58aef0,accent:0xffca52,trim:0x27445c,window:0xbfe9ff},
 normal:{body:0x54b987,accent:0x4d8fca,trim:0x285044,window:0xc8f0ff},
 hard:{body:0xe8635d,accent:0xffaa4d,trim:0x5c3236,window:0xbddfff}
};
const STATION_PALETTES=[
 {body:0xf4d879,accent:0xe78755,trim:0x405d78,window:0xbde8ff},
 {body:0xaed88f,accent:0xf1bf58,trim:0x41684d,window:0xc9efff},
 {body:0xf1b48f,accent:0x6fa3d4,trim:0x724b42,window:0xc8e9ff},
 {body:0xc9a6e6,accent:0xf0c15f,trim:0x574575,window:0xd4edff}
];

function prep(obj){obj.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;if(n.material){const mats=Array.isArray(n.material)?n.material:[n.material];n.material=Array.isArray(n.material)?mats.map(m=>m.clone()):mats[0].clone()}});return obj}
function recolor(obj,pal,kind='train'){
 let idx=0;
 obj.traverse(n=>{
  if(!n.isMesh||!n.material)return;
  const mats=Array.isArray(n.material)?n.material:[n.material];
  const painted=mats.map(m=>{
   const mat=m.clone(),name=((n.name||'')+' '+(m.name||'')).toLowerCase();
   if(!mat.color)return mat;
   const hsl={h:0,s:0,l:0};mat.color.getHSL(hsl);
   let target=pal.body,strength=.46;
   if(/glass|window|screen/.test(name)){target=pal.window;strength=.62}
   else if(/wheel|tire|tyre|axle|metal|rail|under|base/.test(name)||hsl.l<.20){target=pal.trim;strength=.48}
   else if(/roof|door|stripe|line|trim|bumper|front|lamp|light|sign/.test(name)||idx%4===1){target=pal.accent;strength=kind==='station'?.34:.42}
   else if(kind==='station'&&idx%5===2){target=pal.accent;strength=.24}
   mat.color.lerp(new THREE.Color(target),strength);
   if('roughness'in mat)mat.roughness=Math.min(.94,Math.max(.58,mat.roughness??.82));
   if('metalness'in mat)mat.metalness=Math.min(.18,mat.metalness??.03);
   return mat;
  });
  n.material=Array.isArray(n.material)?painted:painted[0];idx++;
 });
 return obj
}
function normalize(obj,target=1,axis='max'){
 obj.updateMatrixWorld(true);
 let b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3());
 let baseSize=axis==='width'?s.x:axis==='height'?s.y:Math.max(s.x,s.y,s.z);
 if(!Number.isFinite(baseSize)||baseSize<=0)baseSize=1;
 obj.scale.multiplyScalar(target/baseSize);obj.updateMatrixWorld(true);
 b=new THREE.Box3().setFromObject(obj);const c=b.getCenter(new THREE.Vector3());
 obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b.min.y;
 return obj;
}
function clone(key,target=1,axis='max'){
 const g=models.get(key);if(!g)return null;
 return normalize(prep(g.scene.clone(true)),target,axis);
}
function load(key,url){return new Promise(resolve=>loader.load(url,g=>{models.set(key,g);resolve(g)},undefined,e=>{console.warn('[Sentence Train 3D] fallback',key,e);resolve(null)}))}
function box(w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.86,metalness:.02}));m.castShadow=true;m.receiveShadow=true;return m}
function clear(g){while(g.children.length)g.remove(g.children[g.children.length-1])}
function makeTrackCurve(){
 trackCurve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(-14,0,2.7),
  new THREE.Vector3(-9,0,2.2),
  new THREE.Vector3(-4,0,1.25),
  new THREE.Vector3(1,0,.05),
  new THREE.Vector3(6,0,-1.25),
  new THREE.Vector3(11,0,-2.35),
  new THREE.Vector3(17,0,-3.0)
 ],false,'catmullrom',.45);
}
function trackPose(obj,t,y=.02){
 if(!trackCurve||!obj)return;
 const clamped=Math.max(0,Math.min(1,t)),p=trackCurve.getPointAt(clamped),tan=trackCurve.getTangentAt(clamped);
 if(t>1)p.add(tan.clone().multiplyScalar((t-1)*34));
 if(t<0)p.add(tan.clone().multiplyScalar(t*34));
 obj.position.set(p.x,p.y+y,p.z);
 obj.rotation.y=Math.PI/2-Math.atan2(tan.z,tan.x);
}
function addRails(){
 clear(railGroup);makeTrackCurve();
 const pieces=24;
 for(let i=0;i<pieces;i++){
  const t=.015+i/(pieces-1)*.955;
  const bed=box(2.25,.10,1.35,0x81776b);trackPose(bed,t,-.105);railGroup.add(bed);
  const r=clone('rail',2.32,'width');
  if(r){trackPose(r,t,-.01);railGroup.add(r)}
  else{const rail=box(2.28,.08,1.05,0x575d63);trackPose(rail,t,-.02);railGroup.add(rail)}
 }
}
function addDecor(){
 clear(decorGroup);
 const ground=box(34,.12,7.2,0xa7c984);ground.position.set(0,-.08,-2.35);ground.receiveShadow=true;decorGroup.add(ground);
 const platform=box(14,.28,2.15,0xa9b2ba);platform.position.set(3.5,.10,-1.38);decorGroup.add(platform);
 const edge=box(14,.12,.18,0xe2bd4d);edge.position.set(3.5,.29,-.28);decorGroup.add(edge);
 for(const x of[-9,-6.4,7.7,10.1]){
   const t=clone('tree',1.8,'height');
   if(t){t.position.set(x,.02,-3.35);t.rotation.y=(x<0?.5:-.4);decorGroup.add(t)}
 }
 for(const x of[-7.5,-5.1,2.1,8.8]){
   const b=clone('bush',.72,'width');if(b){b.position.set(x,.02,-2.35);b.rotation.y=x*.2;decorGroup.add(b)}
 }
 for(const x of[-6.9,-5.9,1.6,2.7,8.2,9.5]){
   const fl=clone('flower',.32,'height');if(fl){fl.position.set(x,.02,-2.15);fl.rotation.y=x;decorGroup.add(fl)}
 }
}
function buildStation(index=stationIndex){
 stationIndex=Math.max(0,Math.min(3,index|0));clear(stationGroup);
 const keys=['stationA','stationB','stationC','stationD'],pal=STATION_PALETTES[stationIndex];
 const building=clone(keys[stationIndex],3.9,'width');
 if(building){recolor(building,pal,'station');building.position.set(6.05,.30,-3.85);building.rotation.y=-.48;stationGroup.add(building)}
 const bench=clone('bench',1.2,'width');
 if(bench){recolor(bench,{...pal,body:0x9a623f,accent:0xd6a66b},'station');bench.position.set(3.8,.30,-2.25);bench.rotation.y=-.15;stationGroup.add(bench)}
 const lamp=clone('lamp',2.15,'height');
 if(lamp){recolor(lamp,{...pal,body:0x42556a,accent:0xffd36a},'station');lamp.position.set(7.4,.30,-2.35);lamp.rotation.y=.18;stationGroup.add(lamp)}
 const sign=clone('sign',.95,'height');
 if(sign){recolor(sign,pal,'station');sign.position.set(2.8,.30,-2.05);sign.rotation.y=.06;stationGroup.add(sign)}
 for(const x of[4.55,5.7,6.75]){
   const b=clone('bush',.68,'width');if(b){b.position.set(x,.30,-2.65);stationGroup.add(b)}
 }
}
function makeFallbackCar(color){
 const g=new THREE.Group(),body=box(1.75,.72,.95,color),top=box(1.48,.26,.82,0xe9eef3);
 body.position.y=.52;top.position.y=1.0;g.add(body,top);
 for(const x of[-.6,.6])for(const z of[-.43,.43]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.12,16),new THREE.MeshStandardMaterial({color:0x29323a,roughness:.8}));w.rotation.x=Math.PI/2;w.position.set(x,.18,z);g.add(w)}
 return g;
}
function positionTrain(offset=0,now=0){
 if(!trackCurve)return;
 const bob=now?Math.sin(now*.004)*.018:0;
 for(const unit of trainUnits)trackPose(unit.obj,unit.baseT+offset,(unit.y||.02)+bob);
}
function buildTrain(count=carCount){
 carCount=Math.max(3,Math.min(8,count||4));
 clear(trainGroup);trainUnits=[];trainGroup.position.set(0,0,0);trainGroup.rotation.set(0,0,0);
 if(!trackCurve)makeTrackCurve();
 const pal=TRAIN_PALETTES[trainTheme]||TRAIN_PALETTES.easy;
 const themeCars=trainTheme==='hard'?['red','box','woodCar','flatCar']:trainTheme==='normal'?['green','blue','box','woodCar']:['blue','green','red','box'];
 const length=Math.max(1,trackCurve.getLength()),step=2.05/length,headT=.69;
 for(let i=0;i<carCount;i++){
  const key=themeCars[i%themeCars.length],car=clone(key,1.9,'width')||makeFallbackCar([0x4f83c7,0x5da66f,0xd45a58,0xa07b4e][i%4]);
  recolor(car,pal,'train');
  const baseT=headT-(carCount-i)*step;
  trainGroup.add(car);trainUnits.push({obj:car,baseT,y:.04});
  if(i<carCount-1){
    const con=clone('connector',.36,'width');
    if(con){recolor(con,pal,'train');const conT=baseT+step*.5;trainGroup.add(con);trainUnits.push({obj:con,baseT:conT,y:.18})}
  }
 }
 const locoKey=trainTheme==='hard'?'electric':trainTheme==='normal'?'diesel':'locoPassenger';
 const loco=clone(locoKey,2.35,'width')||clone('loco',2.2,'width')||makeFallbackCar(0xd9544f);
 recolor(loco,pal,'train');trainGroup.add(loco);trainUnits.push({obj:loco,baseT:headT,y:.04});
 positionTrain(0,0);fitCamera();
}
function fitCamera(){
 if(!camera||!renderer)return;
 const rect=canvas.getBoundingClientRect(),aspect=Math.max(.7,rect.width/Math.max(1,rect.height));
 camera.aspect=aspect;
 const narrow=aspect<1.7;
 camera.position.set(narrow?8.8:10.8,narrow?9.2:7.4,narrow?22:18.5);
 camera.lookAt(narrow?0.5:1.2,.72,-.85);
 camera.updateProjectionMatrix();
}
function init(){
 scene=new THREE.Scene();
 scene.fog=new THREE.Fog(0xddebf4,22,48);
 camera=new THREE.PerspectiveCamera(38,1,.1,100);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(canvas.clientWidth||900,canvas.clientHeight||285,false);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 scene.add(new THREE.HemisphereLight(0xf8fcff,0x688058,2.0));
 const sun=new THREE.DirectionalLight(0xfff0c9,3.2);sun.position.set(-8,12,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;sun.shadow.bias=-.0005;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xaad7ff,1.05);fill.position.set(10,6,-8);scene.add(fill);
 trainGroup=new THREE.Group();railGroup=new THREE.Group();decorGroup=new THREE.Group();stationGroup=new THREE.Group();scene.add(decorGroup,stationGroup,railGroup,trainGroup);
 loader=new GLTFLoader();
 Promise.all(Object.entries(MODEL).map(([k,u])=>load(k,u))).then(()=>{
   addRails();addDecor();buildStation(stationIndex);const liveSlots=document.querySelectorAll('#track .slot').length;buildTrain(liveSlots||carCount);ready=true;document.body.classList.add('sentence-train-3d-ready');resize();
 });
 addEventListener('resize',resize,{passive:true});requestAnimationFrame(loop);
}
function resize(){
 if(!renderer)return;
 const rect=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);fitCamera();
}
function setCars(n){carCount=n; if(ready)buildTrain(n)}
function setTheme(theme){trainTheme=['easy','normal','hard'].includes(theme)?theme:'easy';if(ready)buildTrain(carCount)}
function setStation(index){stationIndex=Math.max(0,Math.min(3,index|0));if(ready)buildStation(stationIndex)}
function reset(){departT=-1;if(trainGroup){trainGroup.visible=true;positionTrain(0,0)}}
function depart(){if(!trainGroup||!trainUnits.length)return;departT=0}
function celebrate(){pulse=.55}
function loop(now){
 requestAnimationFrame(loop);
 if(!renderer||!scene||!camera)return;
 const dt=Math.min(.04,(now-last)/1000||.016);last=now;
 if(ready&&trainGroup){
  if(departT>=0){
   departT+=dt;const p=Math.min(1,departT/2.05),ease=p*p*(3-2*p);
   positionTrain(ease*.48,now);
   if(p>=1){departT=-1}
  }else positionTrain(0,now);
 }
 if(pulse>0){pulse=Math.max(0,pulse-dt);renderer.toneMappingExposure=1.05+pulse*.38}else renderer.toneMappingExposure+=(1.05-renderer.toneMappingExposure)*.12;
 renderer.render(scene,camera);
}
window.SentenceTrain3D={setCars,setTheme,setStation,reset,depart,celebrate,resize,ready:()=>ready};
init();
})();