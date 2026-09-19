(()=>{
'use strict';
const THREE=window.THREE,GLTFLoader=window.GLTFLoader;
const canvas=document.getElementById('city3d');
if(!THREE||!GLTFLoader||!canvas){
  document.dispatchEvent(new CustomEvent('trashrunner3d-error',{detail:'3D 엔진을 불러오지 못했습니다.'}));
  return;
}
const asset=p=>new URL('../../assets/game/'+p,location.href).href;
const MODEL={
 truck:asset('3d/vehicles/kenney-car-kit/garbage-truck.glb'),
 road:asset('3d/city/kenney-city-kit-roads/road-straight.glb'),
 light:asset('3d/city/kenney-city-kit-roads/traffic-light.glb'),
 dumpster:asset('3d/city/kenney-city-kit-roads/dumpster.glb'),
 tree:asset('3d/nature/kenney-nature-kit/tree-default.glb'),
 oak:asset('3d/nature/kenney-nature-kit/tree-oak.glb'),
 building:asset('3d/city/poly-pizza-city-pack/big-building.glb'),
 bottle:asset('food/soda-bottle.glb'),
 oilBottle:asset('food/bottle-oil.glb'),
 can:asset('food/soda-can.glb'),
 tin:asset('food/can.glb'),
 cup:asset('food/cup.glb'),
 bowl:asset('food/bowl-soup.glb'),
 carton:asset('food/carton.glb'),
 cartonSmall:asset('food/carton-small.glb'),
 bag:asset('food/bag.glb'),
 pizzaBox:asset('food/pizza-box.glb'),
 apple:asset('food/apple-half.glb'),
 banana:asset('food/banana.glb'),
 bread:asset('food/bread.glb'),
 orange:asset('food/orange.glb'),
 egg:asset('food/egg-half.glb'),
 onion:asset('food/onion-half.glb'),
 leek:asset('food/leek.glb')
};
const TRASH_MODEL={
 g1:'bowl',p1:'bottle',p2:'cartonSmall',p3:'oilBottle',p4:'cup',
 c1:'can',c2:'tin',c3:'bottle',c4:'bottle',pa1:'pizzaBox',pa3:'carton',pa4:'bag',
 f1:'apple',f2:'banana',f3:'bread',f4:'orange',g6:'egg',g9:'onion',g10:'leek'
};
let scene,camera,renderer,loader,truck=null,truckWheels=[],models=new Map(),running=false,ready=false;
let roadTiles=[],laneMarks=[],scenery=[],trashEntries=[],speed=.095,last=performance.now(),flash=0,shake=0;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function box(w,h,d,color,rough=.86){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:rough,metalness:.01}));m.receiveShadow=m.castShadow=true;return m}
function prep(obj){obj.traverse(n=>{if(!n.isMesh)return;n.castShadow=n.receiveShadow=true;if(n.material){const a=Array.isArray(n.material)?n.material:[n.material];const b=a.map(m=>m.clone());n.material=Array.isArray(n.material)?b:b[0]}});return obj}
function normalize(obj,target=1,axis='max'){
 obj.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3());
 let v=axis==='height'?s.y:axis==='width'?s.x:Math.max(s.x,s.y,s.z);if(!Number.isFinite(v)||v<=0)v=1;
 obj.scale.multiplyScalar(target/v);obj.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(obj);const c=b.getCenter(new THREE.Vector3());
 obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b.min.y;return obj
}
function style(obj,key){
 const palette={truck:0x45a55b,road:0x46515a,light:0x34444c,dumpster:0x4e7b65,tree:0x4f9b58,oak:0x4d8a50,building:0xb7c4ce};
 obj.traverse(n=>{if(!n.isMesh||!n.material)return;const a=Array.isArray(n.material)?n.material:[n.material];const b=a.map(src=>{const m=src.clone();if(!m.map?.image&&palette[key])m.color.setHex(/wheel/i.test(n.name||'')?0x20282d:palette[key]);m.roughness=Math.max(.5,m.roughness??.75);m.metalness=Math.min(.14,m.metalness??0);m.needsUpdate=true;return m});n.material=Array.isArray(n.material)?b:b[0]});return obj
}
function clone(key,target=1,axis='max'){const g=models.get(key);return g?normalize(style(prep(g.scene.clone(true)),key),target,axis):null}
function load(key,url){return new Promise(resolve=>loader.load(url,g=>{models.set(key,g);resolve(true)},undefined,e=>{console.warn('[Trash Runner 3D] model unavailable',key,e);resolve(false)}))}
function addRoad(){
 const asphalt=box(44,.12,5.5,0x3b454c);asphalt.position.set(0,-.07,.7);scene.add(asphalt);
 const curb=box(44,.2,1.2,0xd0cbc0);curb.position.set(0,.02,-2.65);scene.add(curb);
 const grass=box(44,.08,8.5,0x69a862);grass.position.set(0,-.08,-7.2);scene.add(grass);
 for(let i=0;i<15;i++){const x=-20+i*3;const r=clone('road',3.2,'max');if(r){r.rotation.y=Math.PI/2;r.position.set(x,.01,.65);scene.add(r);roadTiles.push(r)}const mark=box(1.35,.025,.12,0xf8dc62,.5);mark.position.set(x,.05,.65);scene.add(mark);laneMarks.push(mark)}
}
function addScenery(key,x,z,target,axis='height',rot=0){let obj=clone(key,target,axis);if(!obj)obj=key==='building'?box(3.4,5.4,2.4,0x9eafb9):key==='dumpster'?box(1.1,.8,.7,0x4e7562):box(.7,2.1,.7,0x5d9557);obj.position.set(x,obj.position.y,z);obj.rotation.y=rot;scene.add(obj);scenery.push({obj,wrap:27+Math.random()*5});return obj}
function buildWorld(){
 addRoad();
 [[8,-6.2,6,-.25],[18,-6.6,5.2,.15]].forEach(v=>addScenery('building',v[0],v[1],v[2],'height',v[3]));
 addScenery('tree',1.5,-4.1,2.4,'height',.4);addScenery('oak',12,-4.35,2.7,'height',-1);addScenery('tree',21,-4.2,2.2,'height',.2);
 addScenery('dumpster',5.3,-2.45,1.25,'max',Math.PI/2);addScenery('light',14.5,-2.7,2.25,'height',0);
 const t=clone('truck',4.2,'max');
 if(t){t.rotation.y=Math.PI/2;t.position.set(-4.7,.03,.65);scene.add(t);truck=t;t.traverse(n=>{if(n.isMesh&&/wheel/i.test(n.name||''))truckWheels.push(n)})}
 else{truck=new THREE.Group();const body=box(3.5,1.25,1.45,0x47a85b);body.position.y=.82;truck.add(body);const cab=box(1.15,1.25,1.4,0xf0f4ec);cab.position.set(1.25,.9,0);truck.add(cab);for(const x of[-1.1,1.15])for(const z of[-.65,.65]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.22,18),new THREE.MeshStandardMaterial({color:0x20282d,roughness:.8}));w.rotation.x=Math.PI/2;w.position.set(x,.33,z);truck.add(w);truckWheels.push(w)}truck.position.set(-4.7,0,.65);scene.add(truck)}
}
function mat(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.75,metalness:.02,...extra})}
function proceduralTrash(data){
 const g=new THREE.Group(),id=data.id;
 if(id==='g2'||id==='pa2'){
   const col=id==='g2'?0xf4f1e9:0xd9d2bf;for(let i=0;i<4;i++){const p=box(.65,.035,.48,col,.95);p.position.set((i%2-.5)*.08,.04+i*.035,(i%3-1)*.04);p.rotation.y=(i-.5)*.18;g.add(p)}
 }else if(id==='g3'){
   const h=box(1.05,.12,.16,0x45a5d9);h.position.y=.13;g.add(h);const b=box(.26,.22,.24,0xf4f4ef);b.position.set(.57,.2,0);g.add(b);for(let i=0;i<4;i++){const br=box(.025,.18,.025,0xeef7ff);br.position.set(.48+i*.045,.38,0);g.add(br)}
 }else if(id==='g4'){
   for(let i=0;i<5;i++){const geo=new THREE.ConeGeometry(.18+.04*Math.random(),.45+.18*Math.random(),3);const m=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({color:0xbdefff,transparent:true,opacity:.62,roughness:.08,metalness:0,transmission:.15}));m.position.set((i-2)*.13,.18,((i%2)-.5)*.18);m.rotation.set(Math.random(),Math.random(),Math.random());g.add(m)}
 }else if(id==='g5'){
   const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.72,14),mat(0xeee2c7));shaft.rotation.z=Math.PI/2;shaft.position.y=.24;g.add(shaft);for(const x of[-.39,.39])for(const z of[-.09,.09]){const end=new THREE.Mesh(new THREE.SphereGeometry(.15,12,10),mat(0xeee2c7));end.position.set(x,.24,z);g.add(end)}
 }else if(id==='g7'){
   for(const x of[-.14,.14]){const s=new THREE.Mesh(new THREE.SphereGeometry(.3,16,10),mat(0xd9c2a0));s.scale.set(1,.28,.8);s.position.set(x,.12,0);s.rotation.z=x<0?.28:-.28;g.add(s)}
 }else if(id==='g8'){
   const n=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),mat(0x8c5f38));n.position.y=.34;n.scale.set(1,.85,1);g.add(n)
 }else{
   const col=data.type==='plastic'?0x68b9ef:data.type==='paper'?0xd6c49a:data.type==='food'?0xd78738:data.type==='can_glass'?0xb9c4cb:0x8a7d73;
   const body=box(.7,.55,.55,col);body.position.y=.3;g.add(body)
 }
 prep(g);return g
}
function createLabel(text,level){
 const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='rgba(17,36,48,.88)';x.beginPath();x.roundRect(8,8,496,112,30);x.fill();x.fillStyle='#fff';x.font='900 42px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,52);x.fillStyle='#bde8c8';x.font='800 22px system-ui,sans-serif';x.fillText('난이도 '+level,256,91);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sp.scale.set(2.5,.62,1);sp.position.y=1.25;return sp
}
function tintForId(obj,id){
 if(id!=='c4'&&id!=='p3'&&id!=='c3')return;const tint=id==='c4'?0x5aa367:id==='p3'?0x5fa8dc:0xc56b56;
 obj.traverse(n=>{if(!n.isMesh||!n.material)return;const a=Array.isArray(n.material)?n.material:[n.material];for(const m of a){if(!m.map?.image)m.color.setHex(tint)}})
}
function makeTrashVisual(data){
 const key=TRASH_MODEL[data.id];let o=key?clone(key,.78,'max'):null;if(!o)o=proceduralTrash(data);tintForId(o,data.id);
 const group=new THREE.Group();group.add(o);group.add(createLabel(data.name,data.level));group.userData.trashData=data;group.traverse(n=>n.userData.trashRoot=group);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.52,.68,28),new THREE.MeshBasicMaterial({color:0xffd45f,transparent:true,opacity:.7,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;group.add(ring);group.userData.ring=ring;return group
}
function spawnTrash(data,duration=5.5){if(!ready||!running||!data)return false;const group=makeTrashVisual(data);const z=1.95+(Math.random()-.5)*1.2;group.position.set(14.5,.08,z);group.rotation.y=(Math.random()-.5)*.7;scene.add(group);trashEntries.push({group,data,speed:25/Math.max(2.2,duration),phase:Math.random()*6.28,collecting:false,collectT:0});return true}
function removeEntry(entry){const i=trashEntries.indexOf(entry);if(i>=0)trashEntries.splice(i,1);scene.remove(entry.group)}
function clearTrash(){for(const e of [...trashEntries])removeEntry(e)}
function trashFromObject(obj){let n=obj;while(n){if(n.userData?.trashData)return n;n=n.parent}return null}
function pick(e){if(!ready||!running)return;const r=canvas.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(trashEntries.map(t=>t.group),true);if(!hits.length)return;const root=trashFromObject(hits[0].object);if(!root)return;const entry=trashEntries.find(t=>t.group===root);if(!entry||entry.collecting)return;const accepted=window.TrashRunnerGame?.onCollect?.(entry.data,e.clientX,e.clientY);if(accepted===false)return;entry.collecting=true;entry.collectT=0;entry.startPos=entry.group.position.clone();entry.startScale=entry.group.scale.clone();flash=Math.max(flash,.22)}
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x8ed6eb);scene.fog=new THREE.Fog(0x8ed6eb,22,46);
 camera=new THREE.PerspectiveCamera(42,innerWidth/Math.max(1,innerHeight),.08,90);camera.position.set(6.8,5.3,10.8);camera.lookAt(-1.7,.55,-.5);
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 scene.add(new THREE.HemisphereLight(0xf4fbff,0x4e694d,2.4));const sun=new THREE.DirectionalLight(0xfff1cc,3.1);sun.position.set(-10,16,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);const fill=new THREE.DirectionalLight(0x9bcfff,.8);fill.position.set(10,7,-10);scene.add(fill);
 loader=new GLTFLoader();Promise.all(Object.entries(MODEL).map(([k,u])=>load(k,u))).then(()=>{buildWorld();ready=true;document.body.classList.add('three-ready');document.dispatchEvent(new CustomEvent('trashrunner3d-ready'))}).catch(err=>{console.error(err);document.dispatchEvent(new CustomEvent('trashrunner3d-error',{detail:'3D 자산 준비에 실패했습니다.'}))});
 addEventListener('resize',resize,{passive:true});canvas.addEventListener('pointerdown',pick,{passive:true});requestAnimationFrame(loop)
}
function resize(){if(!renderer||!camera)return;camera.aspect=innerWidth/Math.max(1,innerHeight);camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55))}
function setScore(score,combo=0){speed=Math.min(.22,.09+Math.max(0,score)*.00012+Math.max(0,combo)*.003)}
function pulse(kind){if(kind==='collect')flash=Math.max(flash,.24);if(kind==='correct'){flash=Math.max(flash,.5);if(truck)truck.rotation.z=-.035}if(kind==='wrong'){shake=.38;if(truck)truck.rotation.z=.06}}
function loop(now){
 requestAnimationFrame(loop);if(!renderer||!scene||!camera)return;const dt=Math.min(.04,(now-last)/1000||.016);last=now;
 if(ready&&running){const move=speed*dt*60;for(const r of roadTiles){r.position.x-=move;if(r.position.x<-20)r.position.x+=44}for(const m of laneMarks){m.position.x-=move*1.15;if(m.position.x<-20)m.position.x+=45}for(const s of scenery){s.obj.position.x-=move*.82;if(s.obj.position.x<-13)s.obj.position.x+=s.wrap}
   for(const e of [...trashEntries]){if(e.collecting){e.collectT+=dt;const t=Math.min(1,e.collectT/.34),k=1-Math.pow(1-t,3);const target=truck?truck.position.clone().add(new THREE.Vector3(.2,1.2,.25)):new THREE.Vector3(-4,1,.5);e.group.position.lerpVectors(e.startPos,target,k);e.group.scale.copy(e.startScale).multiplyScalar(1-k*.86);e.group.rotation.y+=dt*10;if(t>=1){removeEntry(e);pulse('collect')}}else{e.group.position.x-=e.speed*dt;e.group.position.y=.08+Math.sin(now*.004+e.phase)*.08;e.group.rotation.y+=dt*.55;if(e.group.userData.ring)e.group.userData.ring.rotation.z-=dt*1.5;if(e.group.position.x<-10.5){window.TrashRunnerGame?.onMiss?.(e.data);removeEntry(e)}}}
   if(truck){truck.position.y=.025+Math.sin(now*.012)*.035;truck.rotation.z*=.91;for(const w of truckWheels)w.rotation.x-=move*1.9}}
 if(truck&&!running)truck.position.y=.025+Math.sin(now*.0035)*.018;
 if(shake>0){shake=Math.max(0,shake-dt);camera.position.x=6.8+(Math.random()-.5)*shake*.22;camera.position.y=5.3+(Math.random()-.5)*shake*.08}else{camera.position.x+=(6.8-camera.position.x)*.14;camera.position.y+=(5.3-camera.position.y)*.14}
 if(flash>0){flash=Math.max(0,flash-dt);renderer.toneMappingExposure=1.05+flash*.24}else renderer.toneMappingExposure+=(1.05-renderer.toneMappingExposure)*.12;renderer.render(scene,camera)
}
window.TrashRunner3D={start(){running=true},stop(){running=false},setScore,spawnTrash,clearTrash,collect(){pulse('collect')},correct(){pulse('correct')},wrong(){pulse('wrong')},ready(){return ready}};
init();
})();