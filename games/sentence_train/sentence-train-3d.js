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
let scene,camera,renderer,loader,trainGroup,railGroup,decorGroup,stationGroup;
let models=new Map(),ready=false,departT=-1,last=performance.now(),carCount=4,pulse=0,stationIndex=0,trainTheme='easy';
const palette=['blue','green','red','box'];

function prep(obj){obj.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;if(n.material){const mats=Array.isArray(n.material)?n.material:[n.material];n.material=Array.isArray(n.material)?mats.map(m=>m.clone()):mats[0].clone()}});return obj}
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
function addRails(){
 clear(railGroup);
 for(let i=-7;i<=7;i++){
  const r=clone('rail',2.6,'width');
  if(r){r.rotation.y=Math.PI/2;r.position.set(i*2.35,-.02,0);railGroup.add(r)}
  else{const rail=box(2.4,.08,1.2,0x6e6558);rail.position.set(i*2.35,-.03,0);railGroup.add(rail)}
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
 const keys=['stationA','stationB','stationC','stationD'];
 const building=clone(keys[stationIndex],3.5,'width');
 if(building){building.position.set(5.15,.02,-3.05);building.rotation.y=-.52;stationGroup.add(building)}
 const bench=clone('bench',1.15,'width');
 if(bench){bench.position.set(3.55,.02,-1.95);bench.rotation.y=-.18;stationGroup.add(bench)}
 const lamp=clone('lamp',1.95,'height');
 if(lamp){lamp.position.set(6.85,.02,-1.95);lamp.rotation.y=.18;stationGroup.add(lamp)}
 const sign=clone('sign',.85,'height');
 if(sign){sign.position.set(2.75,.02,-1.85);sign.rotation.y=.08;stationGroup.add(sign)}
 for(const x of[4.25,5.8,6.45]){
   const b=clone('bush',.65,'width');if(b){b.position.set(x,.02,-2.25);stationGroup.add(b)}
 }
}
function makeFallbackCar(color){
 const g=new THREE.Group(),body=box(1.75,.72,.95,color),top=box(1.48,.26,.82,0xe9eef3);
 body.position.y=.52;top.position.y=1.0;g.add(body,top);
 for(const x of[-.6,.6])for(const z of[-.43,.43]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.12,16),new THREE.MeshStandardMaterial({color:0x29323a,roughness:.8}));w.rotation.x=Math.PI/2;w.position.set(x,.18,z);g.add(w)}
 return g;
}
function buildTrain(count=carCount){
 carCount=Math.max(3,Math.min(8,count||4));
 clear(trainGroup);trainGroup.position.set(0,0,0);trainGroup.rotation.set(0,0,0);
 const spacing=2.18,total=(carCount+1)*spacing;
 const themeCars=trainTheme==='hard'?['red','box','woodCar','flatCar']:trainTheme==='normal'?['green','blue','box','woodCar']:['blue','green','red','box'];
 for(let i=0;i<carCount;i++){
  const key=themeCars[i%themeCars.length],car=clone(key,1.86,'width')||makeFallbackCar([0x4f83c7,0x5da66f,0xd45a58,0xa07b4e][i%4]);
  car.rotation.y=Math.PI/2;
  car.position.set(-total/2+i*spacing,.02,.02);
  trainGroup.add(car);
  if(i<carCount-1){
    const con=clone('connector',.36,'width');if(con){con.rotation.y=Math.PI/2;con.position.set(-total/2+i*spacing+spacing*.5,.19,.02);trainGroup.add(con)}
  }
 }
 const locoKey=trainTheme==='hard'?'electric':trainTheme==='normal'?'diesel':'locoPassenger';
 const loco=clone(locoKey,2.25,'width')||clone('loco',2.2,'width')||makeFallbackCar(0xd9544f);
 loco.rotation.y=Math.PI/2;loco.position.set(-total/2+carCount*spacing,.02,.02);trainGroup.add(loco);
 fitCamera();
}
function fitCamera(){
 if(!camera)return;
 const width=Math.max(11,(carCount+1)*2.3);
 camera.left=-width*.55;camera.right=width*.55;camera.top=4.2;camera.bottom=-1.15;camera.updateProjectionMatrix();
}
function init(){
 scene=new THREE.Scene();
 camera=new THREE.OrthographicCamera(-8,8,4.2,-1.15,-20,40);
 camera.position.set(8.6,5.8,11.8);camera.lookAt(.8,.55,-.55);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(canvas.clientWidth||900,canvas.clientHeight||285,false);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 scene.add(new THREE.HemisphereLight(0xf8fcff,0x5f7750,2.3));
 const sun=new THREE.DirectionalLight(0xffefc4,3);sun.position.set(-7,10,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
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
function reset(){departT=-1;if(trainGroup){trainGroup.position.x=0;trainGroup.rotation.z=0;trainGroup.visible=true}}
function depart(){if(!trainGroup)return;departT=0}
function celebrate(){pulse=.55}
function loop(now){
 requestAnimationFrame(loop);
 if(!renderer||!scene||!camera)return;
 const dt=Math.min(.04,(now-last)/1000||.016);last=now;
 if(ready&&trainGroup){
  if(departT>=0){
   departT+=dt;const p=Math.min(1,departT/2.05),ease=p*p*(3-2*p);
   trainGroup.position.x=ease*22;trainGroup.position.y=Math.sin(now*.05)*.025;
   if(p>=1){departT=-1}
  }else{
   trainGroup.position.y=.015+Math.sin(now*.004)*.025;
   trainGroup.rotation.z=Math.sin(now*.003)*.004;
  }
 }
 if(pulse>0){pulse=Math.max(0,pulse-dt);renderer.toneMappingExposure=1.05+pulse*.38}else renderer.toneMappingExposure+=(1.05-renderer.toneMappingExposure)*.12;
 renderer.render(scene,camera);
}
window.SentenceTrain3D={setCars,setTheme,setStation,reset,depart,celebrate,resize,ready:()=>ready};
init();
})();