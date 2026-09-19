(()=>{
'use strict';
const THREE=window.THREE,GLTFLoader=window.GLTFLoader;
const canvas=document.getElementById('city3d');
if(!THREE||!GLTFLoader||!canvas)return;

const base=(()=>{try{return new URL('.',document.currentScript?.src||location.href)}catch(_){return new URL('.',location.href)}})();
const asset=p=>new URL('../../assets/game/'+p,base).href;
const MODEL={
 truck:asset('3d/vehicles/kenney-car-kit/garbage-truck.glb'),
 road:asset('3d/city/kenney-city-kit-roads/road-straight.glb'),
 light:asset('3d/city/kenney-city-kit-roads/traffic-light.glb'),
 dumpster:asset('3d/city/kenney-city-kit-roads/dumpster.glb'),
 tree:asset('3d/nature/kenney-nature-kit/tree-default.glb'),
 oak:asset('3d/nature/kenney-nature-kit/tree-oak.glb'),
 building:asset('3d/city/poly-pizza-city-pack/big-building.glb')
};

let scene,camera,renderer,loader,truck=null,truckWheels=[],models=new Map(),running=false;
let roadTiles=[],laneMarks=[],scenery=[],speed=.095,last=performance.now(),flash=0,shake=0,ready=false;
const clock=new THREE.Clock();

function box(w,h,d,color,rough=.86){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.01}));
 m.receiveShadow=true;m.castShadow=true;return m;
}
function prep(obj){
 obj.traverse(n=>{
  if(!n.isMesh)return;
  n.castShadow=true;n.receiveShadow=true;
  if(n.material){
   const mats=Array.isArray(n.material)?n.material:[n.material];
   n.material=Array.isArray(n.material)?mats.map(x=>x.clone()):mats[0].clone();
  }
 });
 return obj;
}
function normalize(obj,target=1,axis='max'){
 obj.updateMatrixWorld(true);
 let b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3());
 let baseSize=axis==='height'?s.y:axis==='width'?s.x:Math.max(s.x,s.y,s.z);
 if(!Number.isFinite(baseSize)||baseSize<=0)baseSize=1;
 obj.scale.multiplyScalar(target/baseSize);
 obj.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(obj);
 const c=b.getCenter(new THREE.Vector3());
 obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b.min.y;
 return obj;
}
function styleFallback(obj,key){
 const palette={truck:0x45a55b,road:0x46515a,light:0x34444c,dumpster:0x4e7b65,tree:0x4f9b58,oak:0x4d8a50,building:0xb7c4ce};
 obj.traverse(n=>{
  if(!n.isMesh||!n.material)return;
  const mats=Array.isArray(n.material)?n.material:[n.material];
  const styled=mats.map(src=>{
   const m=src.clone(),hasMap=Boolean(m.map?.image);
   if(!hasMap&&palette[key]){
    const name=(n.name||'').toLowerCase();
    m.color.setHex(name.includes('wheel')?0x20282d:palette[key]);
   }
   m.roughness=Math.max(.52,m.roughness??.75);m.metalness=Math.min(.12,m.metalness??0);m.needsUpdate=true;
   return m;
  });
  n.material=Array.isArray(n.material)?styled:styled[0];
 });
 return obj;
}
function clone(key,target=1,axis='max'){
 const g=models.get(key);if(!g)return null;
 return normalize(styleFallback(prep(g.scene.clone(true)),key),target,axis);
}
function load(key,url){
 return new Promise(resolve=>{
  loader.load(url,g=>{models.set(key,g);resolve(g)},undefined,e=>{console.warn('[Trash Runner 3D] asset fallback',key,e);resolve(null)});
 });
}
function addRoad(){
 const asphalt=box(42,.12,5.1,0x3d474f);asphalt.position.set(0,-.07,.6);scene.add(asphalt);
 const curb=box(42,.2,1.4,0xc8c2b6);curb.position.set(0,.02,-2.62);scene.add(curb);
 const grass=box(42,.08,7.5,0x6ca766);grass.position.set(0,-.08,-7);scene.add(grass);
 for(let i=0;i<14;i++){
  const x=-18+i*3;
  const r=clone('road',3.15,'max');
  if(r){r.rotation.y=Math.PI/2;r.position.set(x,.01,.58);scene.add(r);roadTiles.push(r)}
  const mark=box(1.35,.025,.12,0xf7d866,.5);mark.position.set(x,.04,.55);scene.add(mark);laneMarks.push(mark);
 }
}
function addScenery(key,x,z,target,axis='height',rot=0){
 let obj=clone(key,target,axis);
 if(!obj){
  obj=key==='building'?box(3.4,5.4,2.4,0x9eafb9):key==='dumpster'?box(1.1,.8,.7,0x4e7562):box(.7,2.1,.7,0x5d9557);
  obj.position.y=0;
 }
 obj.position.x=x;obj.position.z=z;obj.rotation.y=rot;scene.add(obj);
 scenery.push({obj,key,wrap:26+Math.random()*5});
 return obj;
}
function buildWorld(){
 addRoad();
 addScenery('building',8,-6.2,6,'height',-.25);
 addScenery('building',18,-6.6,5.2,'height',.15);
 addScenery('tree',1.5,-4.1,2.4,'height',.4);
 addScenery('oak',12,-4.35,2.7,'height',-1);
 addScenery('tree',21,-4.2,2.2,'height',.2);
 addScenery('dumpster',5.3,-2.45,1.25,'max',Math.PI/2);
 addScenery('light',14.5,-2.7,2.25,'height',0);
 const t=clone('truck',4.2,'max');
 if(t){
  t.rotation.y=Math.PI/2;t.position.set(-4.7,.03,.65);scene.add(t);truck=t;
  t.traverse(n=>{if(n.isMesh&&/wheel/i.test(n.name||''))truckWheels.push(n)});
 }else{
  truck=new THREE.Group();
  const body=box(3.5,1.25,1.45,0x47a85b);body.position.y=.82;truck.add(body);
  const cab=box(1.15,1.25,1.4,0xf0f4ec);cab.position.set(1.25,.9,0);truck.add(cab);
  for(const x of[-1.1,1.15])for(const z of[-.65,.65]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.22,18),new THREE.MeshStandardMaterial({color:0x20282d,roughness:.8}));w.rotation.x=Math.PI/2;w.position.set(x,.33,z);truck.add(w);truckWheels.push(w)}
  truck.position.set(-4.7,0,.65);scene.add(truck);
 }
}
function init(){
 if(ready)return;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x91d7ea);scene.fog=new THREE.Fog(0x91d7ea,20,43);
 camera=new THREE.PerspectiveCamera(42,innerWidth/Math.max(1,innerHeight),.08,90);
 camera.position.set(6.8,5.3,10.8);camera.lookAt(-1.7,.55,-.5);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));renderer.setSize(innerWidth,innerHeight,false);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 scene.add(new THREE.HemisphereLight(0xf4fbff,0x4e694d,2.4));
 const sun=new THREE.DirectionalLight(0xfff1cc,3.1);sun.position.set(-10,16,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 const fill=new THREE.DirectionalLight(0x9bcfff,.8);fill.position.set(10,7,-10);scene.add(fill);
 loader=new GLTFLoader();
 Promise.all(Object.entries(MODEL).map(([k,u])=>load(k,u))).then(()=>{
  buildWorld();ready=true;document.body.classList.add('three-ready');
 });
 addEventListener('resize',resize,{passive:true});
 requestAnimationFrame(loop);
}
function resize(){
 if(!renderer||!camera)return;
 camera.aspect=innerWidth/Math.max(1,innerHeight);camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));
}
function setScore(score,combo=0){
 speed=Math.min(.22,.09+Math.max(0,score)*.00012+Math.max(0,combo)*.003);
}
function pulse(kind){
 if(kind==='collect')flash=Math.max(flash,.24);
 if(kind==='correct'){flash=Math.max(flash,.5);if(truck)truck.rotation.z=-.035}
 if(kind==='wrong'){shake=.38;if(truck)truck.rotation.z=.06}
}
function loop(now){
 requestAnimationFrame(loop);
 if(!renderer||!scene||!camera)return;
 const dt=Math.min(.04,(now-last)/1000||.016);last=now;
 if(ready&&running){
  const move=speed*dt*60;
  for(const r of roadTiles){r.position.x-=move;if(r.position.x<-20)r.position.x+=42}
  for(const m of laneMarks){m.position.x-=move*1.15;if(m.position.x<-20)m.position.x+=42}
  for(const s of scenery){s.obj.position.x-=move*.82;if(s.obj.position.x<-12)s.obj.position.x+=s.wrap}
  if(truck){
   truck.position.y=.025+Math.sin(now*.012)*.035;
   truck.rotation.z*=.91;
   for(const w of truckWheels)w.rotation.x-=move*1.9;
  }
 }
 if(truck&&!running)truck.position.y=.025+Math.sin(now*.0035)*.018;
 if(shake>0){
  shake=Math.max(0,shake-dt);camera.position.x=6.8+(Math.random()-.5)*shake*.22;camera.position.y=5.3+(Math.random()-.5)*shake*.08;
 }else{camera.position.x+=(6.8-camera.position.x)*.14;camera.position.y+=(5.3-camera.position.y)*.14}
 if(flash>0){flash=Math.max(0,flash-dt);renderer.toneMappingExposure=1.05+flash*.24}else renderer.toneMappingExposure+=(1.05-renderer.toneMappingExposure)*.12;
 renderer.render(scene,camera);
}
window.TrashRunner3D={
 start(){running=true;},
 stop(){running=false;},
 setScore,
 collect(){pulse('collect')},
 correct(){pulse('correct')},
 wrong(){pulse('wrong')},
 ready(){return ready}
};
init();
})();
