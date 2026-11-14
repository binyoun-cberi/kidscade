import * as THREE from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const M=window.CornMaze,$=id=>document.getElementById(id);
const ui={hud:$('hud'),mapViewport:$('mapViewport'),mapZoomIn:$('mapZoomIn'),mapZoomOut:$('mapZoomOut'),mapReset:$('mapReset'),mapZoomValue:$('mapZoomValue'),mapGuessReadout:$('mapGuessReadout'),canvas:$('world'),time:$('time'),heading:$('heading'),status:$('chaseStatus'),caught:$('caughtCount'),notice:$('notice'),interact:$('interact'),touchInteract:$('touchInteract'),map:$('mapOverlay'),mapCanvas:$('mapCanvas'),intro:$('startOverlay'),end:$('endOverlay'),summary:$('endSummary'),seed:$('seed'),stick:$('joystick'),thumb:$('thumb'),run:$('run')};
const renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.2:1.45));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.13;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa9bda0);scene.fog=new THREE.Fog(0xa9bda0,25,56);
const camera=new THREE.PerspectiveCamera(75,1,.08,110);camera.rotation.order='YXZ';scene.add(camera);
const light=new THREE.HemisphereLight(0xffedc2,0x385c35,2.65);scene.add(light);
const sun=new THREE.DirectionalLight(0xffd69b,2.2);sun.position.set(-28,38,-22);scene.add(sun);
const world=new THREE.Group();scene.add(world);
const hunterGroup=new THREE.Group();scene.add(hunterGroup);hunterGroup.visible=false;
const state={running:false,won:false,maze:null,hunter:null,mode:'normal',player:{x:0,z:0},yaw:0,pitch:0,elapsed:0,keys:new Set(),joy:{x:0,y:0},runningTouch:false,stationsVisited:new Set(),checkpoint:0,mapOpen:false,guess:-1,interactType:null,interactCell:-1,noticeUntil:0,noticeText:'',generation:0,monsterMixer:null};
const NAMES=['북','동','남','서'];
const LANDMARK_OFFSET=1.4;
const mapView={zoom:1,x:0,y:0,pointers:new Map(),pinchDistance:0,pinchZoom:1,gesture:false};
function randomFor(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
const cornFallback=()=>{
 const stalk=new THREE.Group(),mat=new THREE.MeshLambertMaterial({color:0x5b7e33,side:THREE.DoubleSide});
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.075,.10,3.45,5),mat);stem.position.y=1.72;stalk.add(stem);
 for(let j=0;j<5;j++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.34,1.9,3),mat);leaf.position.y=.65+j*.49;leaf.rotation.z=j%2?.66:-.66;leaf.rotation.y=j*.85;stalk.add(leaf);}
 return stalk;
};
let template=null;
function clearWorld(){for(const child of [...world.children]){world.remove(child);child.traverse(obj=>{if(obj.isMesh){obj.geometry?.dispose?.();if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose?.());else obj.material?.dispose?.();}if(obj.isSprite)obj.material?.map?.dispose?.();});}}
function mesh(mat,geo,x=0,y=0,z=0){const a=new THREE.Mesh(geo,mat);a.position.set(x,y,z);return a;}
function banner(text,w=2.1,h=.76){const cv=document.createElement('canvas');cv.width=512;cv.height=190;const c=cv.getContext('2d');c.fillStyle='#e8d5a5';c.fillRect(0,0,512,190);c.fillStyle='#544027';c.strokeStyle='#614528';c.lineWidth=14;c.strokeRect(7,7,498,176);c.textAlign='center';c.font='bold 94px system-ui';c.fillText(text,256,126);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;return mesh(new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}),new THREE.PlaneGeometry(w,h));}
function standAt(cell,label,color=0x876d46){
 const p=M.center(state.maze,cell),g=new THREE.Group();g.position.set(p.x+1.65,0,p.z+(cell===state.maze.start?-1.65:1.65));
 const wood=new THREE.MeshLambertMaterial({color});
 g.add(mesh(wood,new THREE.BoxGeometry(.17,2.55,.17),0,1.28,0));
 g.add(mesh(wood,new THREE.BoxGeometry(1.45,1.05,.12),0,1.82,0));
 const front=banner(label,1.35,.63);front.position.set(0,1.85,.073);g.add(front);
 const back=banner(label,1.35,.63);back.position.set(0,1.85,-.073);back.rotation.y=Math.PI;g.add(back);
 // A small lantern makes a map post findable above the corn, without a point light.
 g.add(mesh(new THREE.MeshBasicMaterial({color:0xffd98d}),new THREE.OctahedronGeometry(.27),0,3.75,0));
 world.add(g);return g;
}
function buildLandmark(info){
 const p=M.center(state.maze,info.cell),g=new THREE.Group();g.position.set(p.x+LANDMARK_OFFSET,0,p.z+LANDMARK_OFFSET);g.scale.setScalar(info.type===2?.60:.80);
 const wood=new THREE.MeshLambertMaterial({color:0x8f6a3d}),stone=new THREE.MeshLambertMaterial({color:0xabb0a0}),roof=new THREE.MeshLambertMaterial({color:0x76513b}),blue=new THREE.MeshLambertMaterial({color:0x6f8b8a});
 if(info.type===0){g.add(mesh(wood,new THREE.CylinderGeometry(.55,.9,5.2,6),0,2.6,0));const blades=new THREE.Group();blades.position.set(0,4.8,.84);for(let i=0;i<4;i++){const b=mesh(new THREE.MeshLambertMaterial({color:0xe8d2a1}),new THREE.BoxGeometry(.38,2.0,.13),0,1,0);b.rotation.z=i*Math.PI/2;blades.add(b);}g.add(blades);}
 if(info.type===1){g.add(mesh(stone,new THREE.CylinderGeometry(.9,.9,.8,12),0,.5,0));g.add(mesh(blue,new THREE.CylinderGeometry(.67,.67,.1,12),0,.95,0));g.add(mesh(wood,new THREE.BoxGeometry(.13,2.2,.13),-1.05,1.3,0));g.add(mesh(wood,new THREE.BoxGeometry(.13,2.2,.13),1.05,1.3,0));g.add(mesh(roof,new THREE.BoxGeometry(2.5,.18,1.7),0,2.5,0));}
 if(info.type===2){g.add(mesh(wood,new THREE.BoxGeometry(2.5,2.3,2.3),0,1.15,0));const r=mesh(roof,new THREE.ConeGeometry(2.1,1.3,4),0,2.8,0);r.rotation.y=Math.PI/4;g.add(r);}
 if(info.type===3){g.add(mesh(stone,new THREE.CylinderGeometry(.17,.24,3.8,8),0,1.9,0));g.add(mesh(blue,new THREE.CylinderGeometry(1.1,1.1,1.6,10),0,4.0,0));}
 g.add(banner(info.name,1.5,.52));g.children[g.children.length-1].position.set(0,3.1,1.0);
 world.add(g);
}
function canWalk(x,z,radius=.48){
 if(!M.canStand(state.maze,x,z,radius))return false;
 // The buildings and map posts must not be walk-through decorations.
 for(const info of state.maze.landmarks){
  const p=M.center(state.maze,info.cell),dx=x-p.x-LANDMARK_OFFSET,dz=z-p.z-LANDMARK_OFFSET;
  const obstacle=[.72,.72,.78,.28][info.type]+radius;
  if(dx*dx+dz*dz<obstacle*obstacle)return false;
 }
 for(const cell of state.maze.stations){
  const p=M.center(state.maze,cell),dx=x-p.x-1.65,dz=z-p.z-(cell===state.maze.start?-1.65:1.65);
  if(dx*dx+dz*dz<(radius+.24)**2)return false;
 }
 return true;
}
function addGround(){
 const m=state.maze,side=m.size*m.cell;
 const grass=mesh(new THREE.MeshLambertMaterial({color:0x73864d}),new THREE.PlaneGeometry(side+90,side+90));grass.rotation.x=-Math.PI/2;grass.position.y=-.09;world.add(grass);
 const ground=new THREE.InstancedMesh(new THREE.PlaneGeometry(m.cell+.025,m.cell+.025),new THREE.MeshLambertMaterial({color:0x827a5d}),m.links.length);
 const dummy=new THREE.Object3D(),rand=randomFor(m.seed);
 for(let i=0;i<m.links.length;i++){const p=M.center(m,i);dummy.position.set(p.x,-.065,p.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();ground.setMatrixAt(i,dummy.matrix);ground.setColorAt(i,new THREE.Color().setHSL(.115+rand()*.015,.20,.39+rand()*.045));}
 ground.instanceMatrix.needsUpdate=true;world.add(ground);
}
function cornPositions(){
 const m=state.maze,positions=[],random=randomFor(m.seed^0xfa23ba),S=m.size;
 function segment(x1,z1,x2,z2){const normalX=z2-z1?1:0,normalZ=x2-x1?1:0;for(let row=0;row<2;row++)for(let j=0;j<(row?3:4);j++){const slots=row?3:4,f=(j+.18+random()*.64)/slots;const x=x1+(x2-x1)*f,z=z1+(z2-z1)*f,offset=(row? .27:-.27)+(random()-.5)*.22;positions.push({x:x+normalX*offset,z:z+normalZ*offset,s:.88+random()*.27,rot:random()*Math.PI*2});}}
 for(let i=0;i<m.links.length;i++){const col=i%S,row=Math.floor(i/S),p=M.center(m,i),h=m.cell/2,link=m.links[i];
  if(!(link&2)&&!(i===m.exit&&col===S-1))segment(p.x+h,p.z-h,p.x+h,p.z+h);
  if(!(link&4)&&!(i===m.exit&&row===S-1))segment(p.x-h,p.z+h,p.x+h,p.z+h);
  if(col===0)segment(p.x-h,p.z-h,p.x-h,p.z+h);
  if(row===0)segment(p.x-h,p.z-h,p.x+h,p.z-h);
 }
 return positions;
}
function populateCorn(group,positions){
 const bbox=new THREE.Box3().setFromObject(group),sz=bbox.getSize(new THREE.Vector3()),cen=bbox.getCenter(new THREE.Vector3()),factor=3.7/Math.max(sz.y,.01);
 group.updateMatrixWorld(true);
 const templates=[];group.traverse(n=>{if(n.isMesh&&n.geometry){const geo=n.geometry.clone();geo.applyMatrix4(n.matrixWorld);geo.translate(-cen.x,-bbox.min.y,-cen.z);geo.scale(factor,factor,factor);templates.push(geo);}});
 if(!templates.length)throw new Error('Empty corn model');
 // Frustum-cull spatial buckets instead of rendering every stalk behind the player.
 const chunkSize=state.maze.cell*6,side=state.maze.size*state.maze.cell,chunkCount=Math.ceil(side/chunkSize),buckets=new Map();
 for(const plant of positions){
  const bx=Math.max(0,Math.min(chunkCount-1,Math.floor((plant.x+side/2)/chunkSize))),bz=Math.max(0,Math.min(chunkCount-1,Math.floor((plant.z+side/2)/chunkSize))),key=bx+','+bz;
  if(!buckets.has(key))buckets.set(key,[]);
  buckets.get(key).push(plant);
 }
 const collection=new THREE.Group();collection.userData.cornfield=true;
 const materials=templates.map((_,k)=>new THREE.MeshLambertMaterial({color:k%3===0?0x638835:k%3===1?0x78944a:0x527432,side:THREE.DoubleSide}));
 for(const plants of buckets.values()){
  const chunk=new THREE.Group(),dummy=new THREE.Object3D(),midX=plants.reduce((n,p)=>n+p.x,0)/plants.length,midZ=plants.reduce((n,p)=>n+p.z,0)/plants.length;
  chunk.userData={x:midX,z:midZ,radius:chunkSize*.85};
  for(let k=0;k<templates.length;k++){
   const leaf=new THREE.InstancedMesh(templates[k],materials[k],plants.length);
   for(let i=0;i<plants.length;i++){
    const a=plants[i];dummy.position.set(a.x,0,a.z);dummy.rotation.set(0,a.rot,0);dummy.scale.setScalar(a.s);dummy.updateMatrix();leaf.setMatrixAt(i,dummy.matrix);
   }
   leaf.instanceMatrix.needsUpdate=true;leaf.computeBoundingSphere();
   chunk.add(leaf);
  }
  collection.add(chunk);
 }
 world.add(collection);return collection;
}
async function loadCorn(token,positions,fallback){
 try{const root=await new FBXLoader().loadAsync('../../assets/game/crops/FBX/Corn_4.fbx');if(token!==state.generation)return;
  const built=populateCorn(root,positions);if(fallback.parent){fallback.parent.remove(fallback);fallback.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});}return built;
 }catch(e){console.warn('Corn model fallback',e.message);}
}
let hunterVisual=null;
function makeHunter(){
 hunterGroup.clear();const wood=new THREE.MeshLambertMaterial({color:0x3d3226}),cloth=new THREE.MeshLambertMaterial({color:0x624832}),eyes=new THREE.MeshBasicMaterial({color:0xffd997});
 hunterGroup.add(mesh(wood,new THREE.CylinderGeometry(.17,.23,2.8,7),0,1.4,0));
 hunterGroup.add(mesh(cloth,new THREE.ConeGeometry(.78,1.8,5),0,1.65,0));
 hunterGroup.add(mesh(wood,new THREE.BoxGeometry(2.05,.15,.15),0,2.55,0));
 hunterGroup.add(mesh(cloth,new THREE.SphereGeometry(.37,8,6),0,2.8,0));
 hunterGroup.add(mesh(wood,new THREE.CylinderGeometry(.7,.7,.10,9),0,3.06,0));
 hunterGroup.add(mesh(wood,new THREE.CylinderGeometry(.31,.31,.45,9),0,3.28,0));
 for(const x of [-.15,.15])hunterGroup.add(mesh(eyes,new THREE.SphereGeometry(.058,8,8),x,2.82,.33));
 hunterVisual=hunterGroup;
 const token=state.generation;
 new GLTFLoader().loadAsync('../../assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost.glb').then(g=>{
  if(token!==state.generation)return;
  const visual=g.scene,box=new THREE.Box3().setFromObject(visual),sz=box.getSize(new THREE.Vector3());visual.scale.setScalar(2.8/Math.max(sz.y,.01));const scaled=new THREE.Box3().setFromObject(visual);visual.position.y-=scaled.min.y;
  hunterGroup.clear();hunterGroup.add(visual);
  if(g.animations?.length){state.monsterMixer=new THREE.AnimationMixer(visual);state.monsterMixer.clipAction(g.animations.find(c=>/walk|run|idle/i.test(c.name))||g.animations[0]).play();}
 }).catch(()=>{});
}
function construct(){
 clearWorld();addGround();const positions=cornPositions(),f=populateCorn(cornFallback(),positions);
 loadCorn(state.generation,positions,f);
 state.maze.stations.forEach(i=>standAt(i,'지도'));
 state.maze.landmarks.forEach(buildLandmark);
 const p=M.center(state.maze,state.maze.exit),gate=new THREE.Group();gate.position.set(p.x,0,p.z);
 // Open the outer corn fence and face the sign toward the arriving player.
 gate.rotation.y=state.maze.exit%state.maze.size===state.maze.size-1?-Math.PI/2:Math.PI;
 const gold=new THREE.MeshLambertMaterial({color:0xd5ae60}),dark=new THREE.MeshLambertMaterial({color:0x5a3a23});
 gate.add(mesh(dark,new THREE.BoxGeometry(.33,4,.35),-1.65,2,0));
 gate.add(mesh(dark,new THREE.BoxGeometry(.33,4,.35),1.65,2,0));
 gate.add(mesh(gold,new THREE.BoxGeometry(3.7,.32,.4),0,4.1,0));
 const sign=banner('출구',1.6,.55);sign.position.set(0,3.55,0);gate.add(sign);world.add(gate);
 makeHunter();
}
function notify(message,seconds=3){state.noticeText=message;state.noticeUntil=state.elapsed+seconds;ui.notice.textContent=message;}
function begin(){
 const raw=Number(ui.seed.value),seed=Number.isFinite(raw)&&raw>0?Math.min(999999999,Math.floor(raw)):20261110;
 state.mode=document.querySelector('.mode.selected')?.dataset.mode||'normal';
 state.generation++;resetMapView();state.maze=M.generate(seed);state.hunter=M.createHunter(state.maze,state.mode);
 state.player=M.center(state.maze,0);state.stationsVisited.clear();state.checkpoint=0;state.elapsed=0;state.guess=-1;state.won=false;state.mapOpen=false;state.keys.clear();state.running=true;state.monsterMixer=null;
 const next=M.adjacent(state.maze,0)[0],q=M.center(state.maze,next);state.yaw=Math.atan2(-(q.x-state.player.x),-(q.z-state.player.z));state.pitch=0;
 construct();ui.intro.classList.add('hidden');ui.end.classList.add('hidden');ui.map.classList.add('hidden');
 try{window.KidscadeGame?.start?.();}catch(_){}
 notify('출구를 찾으세요. 지도판에서 내가 있는 곳을 추리해 보세요.',6);
}
function compass(){const v=(((-state.yaw*180/Math.PI)%360)+360)%360;const idx=Math.round(v/90)%4;ui.heading.textContent=NAMES[idx]+' · '+Math.round(v)+'°';}
function nearAction(){
 let nearest=-1,dist=Infinity;
 for(const s of state.maze.stations){const p=M.center(state.maze,s),d=Math.hypot(p.x-state.player.x,p.z-state.player.z);if(d<dist){dist=d;nearest=s;}}
 const exit=M.center(state.maze,state.maze.exit),endD=Math.hypot(exit.x-state.player.x,exit.z-state.player.z);
 if(endD<2.4)return{type:'exit',cell:state.maze.exit,label:'탈출하기 [E]'};
 if(dist<2.75)return{type:'map',cell:nearest,label:'지도 살펴보기 [E]'};
 return null;
}
function interact(){
 if(!state.running||state.mapOpen)return;
 const action=nearAction();if(!action)return;
 if(action.type==='exit')return win();
 state.checkpoint=action.cell;state.stationsVisited.add(action.cell);state.mapOpen=true;ui.map.classList.remove('hidden');document.exitPointerLock?.();updateMapView();drawMap();ui.mapGuessReadout.textContent=state.guess>=0?'이전에 표시한 예상 위치를 확인하세요.':'지도의 한 칸을 눌러 위치를 추측하세요.';$('closeMap').focus();
}
function closeMap(){state.mapOpen=false;ui.map.classList.add('hidden');notify('갈림길과 주변 건물을 기억하며 이동하세요.',3);}
function win(){state.running=false;state.won=true;hunterGroup.visible=false;document.exitPointerLock?.();const minutes=Math.floor(state.elapsed/60),seconds=Math.floor(state.elapsed%60);ui.summary.textContent='탈출 시간 '+minutes+'분 '+seconds+'초 · 지도판 '+state.stationsVisited.size+'곳 · 붙잡힘 '+state.hunter.caught+'회 · 미로 번호 '+state.maze.seed;ui.end.classList.remove('hidden');try{window.KidscadeGame?.result?.({scope:'run',status:'completed',outcome:'clear',cleared:true,score:Math.max(1,Math.round(1000-state.elapsed-state.hunter.caught*70)),seconds:Math.round(state.elapsed),seed:state.maze.seed});}catch(_){}}
function drawMap(){
 const cvs=ui.mapCanvas,c=cvs.getContext('2d'),s=state.maze.size,P=32,T=(cvs.width-P*2)/s,m=state.maze;
 c.fillStyle='#ecddba';c.fillRect(0,0,cvs.width,cvs.height);
 c.strokeStyle='#715b3a';c.lineWidth=2.6;c.lineCap='square';
 for(let i=0;i<m.links.length;i++){const x=P+(i%s)*T,y=P+Math.floor(i/s)*T,l=m.links[i];c.beginPath();if(!(l&1)){c.moveTo(x,y);c.lineTo(x+T,y);}if(!(l&8)){c.moveTo(x,y);c.lineTo(x,y+T);}if(i%s===s-1&&!(l&2)){c.moveTo(x+T,y);c.lineTo(x+T,y+T);}if(Math.floor(i/s)===s-1&&!(l&4)){c.moveTo(x,y+T);c.lineTo(x+T,y+T);}c.stroke();}
 const at=i=>[P+(i%s+.5)*T,P+(Math.floor(i/s)+.5)*T];
 c.textAlign='center';c.textBaseline='middle';
 m.stations.forEach(i=>{const[x,y]=at(i);c.fillStyle='#5a7483';c.fillRect(x-5,y-5,10,10);});
 m.landmarks.forEach(info=>{const[x,y]=at(info.cell);c.fillStyle='#84582f';c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill();c.font='bold 14px system-ui';c.fillStyle='#3e4a28';c.fillText(info.name,x,y-16);});
 const[x,y]=at(m.exit);c.font='bold 20px system-ui';c.fillStyle='#ae6b29';c.fillText('★',x,y);const[sx,sy]=at(m.start);c.font='bold 16px system-ui';c.fillStyle='#425a35';c.fillText('입',sx,sy);
 if(state.guess>=0){const[gx,gy]=at(state.guess);c.strokeStyle='#ad362a';c.lineWidth=3;c.beginPath();c.arc(gx,gy,8,0,Math.PI*2);c.stroke();c.fillStyle='#ad362a';c.beginPath();c.arc(gx,gy,3,0,Math.PI*2);c.fill();}
 c.font='bold 20px system-ui';c.fillStyle='#674b2c';c.fillText('N ↑',cvs.width-50,20);
}
function updateMapView(){
 const {zoom}=mapView,view=ui.mapViewport;
 const limitX=Math.max(0,(zoom-1)*view.clientWidth/2),limitY=Math.max(0,(zoom-1)*view.clientHeight/2);
 mapView.x=Math.max(-limitX,Math.min(limitX,mapView.x));mapView.y=Math.max(-limitY,Math.min(limitY,mapView.y));
 ui.mapCanvas.style.transform='translate('+mapView.x+'px,'+mapView.y+'px) scale('+zoom+')';
 ui.mapZoomValue.textContent=Math.round(zoom*100)+'%';
 ui.mapZoomOut.disabled=zoom<=1;ui.mapZoomIn.disabled=zoom>=4;
}
function setMapZoom(zoom){mapView.zoom=Math.max(1,Math.min(4,Math.round(zoom*100)/100));updateMapView();}
function resetMapView(){mapView.zoom=1;mapView.x=0;mapView.y=0;mapView.pointers.clear();mapView.gesture=false;mapView.pinchDistance=0;updateMapView();}
function markMapGuess(clientX,clientY){
 if(!state.mapOpen)return;
 const rect=ui.mapCanvas.getBoundingClientRect(),x=(clientX-rect.left)*ui.mapCanvas.width/rect.width,y=(clientY-rect.top)*ui.mapCanvas.height/rect.height;
 const size=state.maze.size,padding=32,cell=(ui.mapCanvas.width-padding*2)/size;
 const col=Math.floor((x-padding)/cell),row=Math.floor((y-padding)/cell);
 if(col<0||row<0||col>=size||row>=size)return;
 state.guess=row*size+col;
 ui.mapGuessReadout.textContent='예상 위치를 표시했어요. 주변 지형지물과 길 모양을 다시 비교해 보세요.';
 drawMap();
}
ui.mapZoomIn.addEventListener('click',()=>setMapZoom(mapView.zoom+.65));
ui.mapZoomOut.addEventListener('click',()=>setMapZoom(mapView.zoom-.65));
ui.mapReset.addEventListener('click',resetMapView);
ui.mapViewport.addEventListener('wheel',e=>{if(!state.mapOpen)return;e.preventDefault();setMapZoom(mapView.zoom+(e.deltaY<0?.3:-.3));},{passive:false});
ui.mapViewport.addEventListener('pointerdown',e=>{
 if(!state.mapOpen)return;
 mapView.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false});
 if(mapView.pointers.size===2){
  const [a,b]=[...mapView.pointers.values()];mapView.pinchDistance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));mapView.pinchZoom=mapView.zoom;mapView.gesture=true;
 }
 try{ui.mapViewport.setPointerCapture(e.pointerId)}catch(_){}
});
ui.mapViewport.addEventListener('pointermove',e=>{
 const p=mapView.pointers.get(e.pointerId);if(!p)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 p.x=e.clientX;p.y=e.clientY;
 if(Math.hypot(p.x-p.sx,p.y-p.sy)>7)p.moved=true;
 if(mapView.pointers.size>=2){
  const [a,b]=[...mapView.pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
  if(mapView.pinchDistance)setMapZoom(mapView.pinchZoom*distance/mapView.pinchDistance);
 }else if(mapView.zoom>1){mapView.x+=dx;mapView.y+=dy;updateMapView();}
});
function finishMapPointer(e,cancelled){
 const p=mapView.pointers.get(e.pointerId);if(!p)return;
 const tap=mapView.pointers.size===1&&!mapView.gesture&&!p.moved&&Math.hypot(e.clientX-p.sx,e.clientY-p.sy)<8;
 mapView.pointers.delete(e.pointerId);
 if(mapView.pointers.size<2)mapView.pinchDistance=0;
 if(mapView.pointers.size===0)mapView.gesture=false;
 if(tap&&!cancelled)markMapGuess(e.clientX,e.clientY);
}
ui.mapViewport.addEventListener('pointerup',e=>finishMapPointer(e,false));
ui.mapViewport.addEventListener('pointercancel',e=>finishMapPointer(e,true));
ui.mapViewport.addEventListener('keydown',e=>{
 if(!state.mapOpen)return;
 if(e.key==='+'||e.key==='='){e.preventDefault();setMapZoom(mapView.zoom+.5);}
 else if(e.key==='-'){e.preventDefault();setMapZoom(mapView.zoom-.5);}
 else if(e.key==='0'){e.preventDefault();resetMapView();}
 else if(e.key==='Enter'){e.preventDefault();const r=ui.mapViewport.getBoundingClientRect();markMapGuess(r.left+r.width/2,r.top+r.height/2);}
 else if(e.key.startsWith('Arrow')){e.preventDefault();mapView.x+=e.key==='ArrowLeft'?26:e.key==='ArrowRight'?-26:0;mapView.y+=e.key==='ArrowUp'?26:e.key==='ArrowDown'?-26:0;updateMapView();}
});
function step(dt){
 if(!state.running)return;
 state.elapsed+=dt;
 const keys=state.keys;
 if(!state.mapOpen){
  let side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+state.joy.x;
  let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-state.joy.y;
  const len=Math.hypot(side,forward);if(len>1){side/=len;forward/=len;}
  const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')||state.runningTouch?4.55:3.65),vx=(-Math.sin(state.yaw)*forward+Math.cos(state.yaw)*side)*speed*dt,vz=(-Math.cos(state.yaw)*forward-Math.sin(state.yaw)*side)*speed*dt;
  if(canWalk(state.player.x+vx,state.player.z,.48))state.player.x+=vx;
  if(canWalk(state.player.x,state.player.z+vz,.48))state.player.z+=vz;
 }
 const h=M.stepHunter(state.maze,state.hunter,dt,state.player);
 if(h.caught){state.player=M.center(state.maze,state.checkpoint);state.guess=-1;state.mapOpen=false;ui.map.classList.add('hidden');notify('괴물에게 들켰어요! 마지막으로 발견한 지도판으로 돌아왔습니다.',5);}
 hunterGroup.visible=state.hunter.phase==='chase';
 hunterGroup.position.set(state.hunter.x,0,state.hunter.z);
 if(state.hunter.phase==='chase'&&state.hunter.path?.length>1){const p=M.center(state.maze,state.hunter.path[1]);hunterGroup.rotation.y=Math.atan2(p.x-state.hunter.x,p.z-state.hunter.z);}
 state.monsterMixer?.update(dt);
 const status=state.hunter.phase;ui.status.textContent=status==='chase'?'괴물이 따라오고 있어요!':status==='warning'?'옥수수 사이에서 소리가 들립니다…':status==='disabled'?'안전 탐험':'출구를 찾아보세요';
 ui.caught.textContent='붙잡힘 '+state.hunter.caught+'회';
 ui.notice.classList.toggle('alert',status==='chase'||status==='warning');
 ui.hud.classList.toggle('warning',status==='warning');ui.hud.classList.toggle('chasing',status==='chase');
 if(state.elapsed>state.noticeUntil){ui.notice.textContent=status==='chase'?'괴물은 나보다 조금 느려요. 모퉁이를 활용하세요.':status==='warning'?'주변을 둘러보세요!':'지도판에서 나의 위치를 추측하고 출구를 찾아보세요.';}
 ui.time.textContent=String(Math.floor(state.elapsed/60)).padStart(2,'0')+':'+String(Math.floor(state.elapsed%60)).padStart(2,'0');
 compass();
 const a=state.mapOpen?null:nearAction();ui.interact.hidden=!a;ui.interact.textContent=a?.label||'';
 ui.touchInteract.hidden=!a;ui.touchInteract.textContent=a?.type==='exit'?'탈출하기':'지도 보기';state.interactType=a?.type||null;
 for(const corn of world.children)if(corn.userData.cornfield)for(const chunk of corn.children){const {x,z,radius}=chunk.userData;chunk.visible=Math.hypot(state.player.x-x,state.player.z-z)<scene.fog.far+radius;}
 camera.position.set(state.player.x,1.67,state.player.z);camera.rotation.set(state.pitch,state.yaw,0,'YXZ');
}
function resize(){const w=ui.canvas.clientWidth||innerWidth,h=ui.canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-(loop.last||now))/1000);loop.last=now;step(dt);renderer.render(scene,camera);}resize();addEventListener('resize',resize);requestAnimationFrame(loop);
document.querySelectorAll('.mode').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('selected',b===btn));}));
$('startButton').addEventListener('click',begin);
$('closeMap').addEventListener('click',closeMap);
$('retry').addEventListener('click',()=>{ui.seed.value=String((Number(ui.seed.value)||20261110)+1);begin();});
ui.interact.addEventListener('click',interact);ui.touchInteract.addEventListener('click',interact);
document.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&state.mapOpen){closeMap();return;}if(e.code==='KeyE'&&!e.repeat){interact();return;}state.keys.add(e.code);});
document.addEventListener('keyup',e=>state.keys.delete(e.code));addEventListener('blur',()=>{state.keys.clear();state.runningTouch=false;state.joy.x=state.joy.y=0;});
const coarse=()=>matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
ui.canvas.addEventListener('click',()=>{if(!coarse()&&state.running&&!state.mapOpen&&document.pointerLockElement!==ui.canvas)ui.canvas.requestPointerLock?.();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===ui.canvas&&!state.mapOpen){state.yaw-=e.movementX*.0023;state.pitch=Math.max(-.5,Math.min(.5,state.pitch-e.movementY*.0021));}});
let aim=null;
ui.canvas.addEventListener('pointerdown',e=>{if(!coarse()||!state.running||state.mapOpen)return;if(e.clientX<innerWidth*.33)return;aim={id:e.pointerId,x:e.clientX,y:e.clientY};ui.canvas.setPointerCapture(e.pointerId);});
ui.canvas.addEventListener('pointermove',e=>{if(!aim||aim.id!==e.pointerId)return;const dx=e.clientX-aim.x,dy=e.clientY-aim.y;state.yaw-=dx*.005;state.pitch=Math.max(-.5,Math.min(.5,state.pitch-dy*.004));aim.x=e.clientX;aim.y=e.clientY;});
ui.canvas.addEventListener('pointerup',e=>{if(aim?.id===e.pointerId)aim=null;});ui.canvas.addEventListener('pointercancel',()=>aim=null);
let stickId=null;
function stickMove(e){const r=ui.stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),scale=Math.min(1,46/Math.max(len,1));state.joy.x=dx*scale/46;state.joy.y=dy*scale/46;ui.thumb.style.transform='translate('+(state.joy.x*43)+'px,'+(state.joy.y*43)+'px)';}
ui.stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;ui.stick.setPointerCapture(stickId);stickMove(e);});
ui.stick.addEventListener('pointermove',e=>{if(stickId===e.pointerId)stickMove(e);});
function releaseStick(e){if(e&&stickId!==e.pointerId)return;stickId=null;state.joy.x=state.joy.y=0;ui.thumb.style.transform='translate(0,0)';}
ui.stick.addEventListener('pointerup',releaseStick);ui.stick.addEventListener('pointercancel',releaseStick);
ui.run.addEventListener('pointerdown',e=>{state.runningTouch=true;ui.run.classList.add('active');ui.run.setPointerCapture(e.pointerId);});for(const name of ['pointerup','pointercancel','lostpointercapture'])ui.run.addEventListener(name,()=>{state.runningTouch=false;ui.run.classList.remove('active');});
