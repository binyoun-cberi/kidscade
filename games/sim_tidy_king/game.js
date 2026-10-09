import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const canvas=$('world');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
renderer.setPixelRatio(Math.min(devicePixelRatio||1.0,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xc5e2d5);
scene.fog=new THREE.Fog(0xc5e2d5,25,46);
const camera=new THREE.PerspectiveCamera(48,1,.1,80);
const hemi=new THREE.HemisphereLight(0xfff8e8,0x819e91,2.4);scene.add(hemi);
const sunlight=new THREE.DirectionalLight(0xffe6c4,2.2);
sunlight.position.set(-5,13,10);sunlight.castShadow=true;
sunlight.shadow.mapSize.set(1024,1024);sunlight.shadow.camera.left=-11;sunlight.shadow.camera.right=11;sunlight.shadow.camera.top=11;sunlight.shadow.camera.bottom=-11;
sunlight.shadow.bias=-.00045;scene.add(sunlight);
const root=new THREE.Group();scene.add(root);
const loader=new GLTFLoader();
const picker=new THREE.Raycaster();
const mouse=new THREE.Vector2();
const models=new Map();
const FURN='../../assets/game/3d/interiors/kenney-furniture-kit/';
const FOOD='../../assets/game/food/';
const STYLOO='../../assets/more%20assets/StylooClassroomAssetPack%20GLTF%20%26%20FBX/classroom/GLTF/';
const KITCHEN='../../assets/game/3d/interiors/charming-kitchen-set/';
const DIRTY_KEY='kidscade-tidy-king-v1';
const catalog={
  shelf:{label:'책장',icon:'📚',hint:'책과 문구류는 책장에 정리해요',color:0xe2bd78},
  laundry:{label:'빨래통',icon:'🧺',hint:'옷과 쿠션은 빨래통에 넣어요',color:0xa17acb},
  recycle:{label:'분리수거함',icon:'♻️',hint:'빈 캔과 병은 분리수거해요',color:0x54bb99},
  trash:{label:'일반쓰레기통',icon:'🗑️',hint:'오염된 쓰레기는 일반쓰레기로!',color:0xe3877d},
  sink:{label:'싱크대',icon:'🍽️',hint:'더러운 그릇은 싱크대로 옮겨요',color:0x7cbde0},
  toys:{label:'장난감 상자',icon:'🧸',hint:'장난감은 상자에 담아요',color:0xf4b65d}
};
const levelDefs=[
 {name:'의뢰 1 · 엉망진창 원룸',title:'우리 집 대청소',description:'지저분해진 원룸을 새집처럼 바꾸자!',seed:12345,
  items:{book:8,pen:4,pillow:5,bag:5,bottle:7,can:5,carton:4,cup:4,toy:4},stains:5,
  floor:0xf5e4ca,wall:0xfff7df},
 {name:'의뢰 2 · 난장판 주방',title:'반짝반짝 주방',description:'바닥에 널린 물건을 치우고 얼룩까지 닦자!',seed:67891,
  items:{cup:11,plate:8,pan:3,bottle:8,can:7,carton:5,bag:5,book:3,pillow:2,toy:2},stains:7,
  floor:0xe5ede5,wall:0xf3f7ed}
];
const props={
 book:{model:'books',path:FURN+'books.glb',kind:'shelf',size:.52,color:0xf0b755,name:'책'},
 pen:{model:'pen',path:STYLOO+'pencil.glb',kind:'shelf',size:.36,color:0xeaba65,name:'연필'},
 pillow:{model:'pillow',path:FURN+'pillow.glb',kind:'laundry',size:.46,color:0xab8ac8,name:'쿠션'},
 bag:{model:'bag',path:FOOD+'bag.glb',kind:'trash',size:.48,color:0x917d69,name:'오염된 봉투'},
 bottle:{model:'bottle',path:FOOD+'soda-bottle.glb',kind:'recycle',size:.45,color:0x6abc9d,name:'빈 페트병'},
 can:{model:'can',path:FOOD+'soda-can.glb',kind:'recycle',size:.34,color:0xec746e,name:'빈 캔'},
 carton:{model:'carton',path:FOOD+'carton-small.glb',kind:'recycle',size:.44,color:0xb8dced,name:'종이팩'},
 cup:{model:'cup',path:KITCHEN+'blue-mug.glb',kind:'sink',size:.43,color:0x8aabdd,name:'컵'},
 plate:{model:'plate',path:KITCHEN+'plate.glb',kind:'sink',size:.46,color:0xf6f8de,name:'접시'},
 pan:{model:'pan',path:KITCHEN+'pan.glb',kind:'sink',size:.52,color:0x566975,name:'프라이팬'},
 toy:{model:'toy',path:FURN+'bear.glb',kind:'toys',size:.48,color:0xcfa16e,name:'인형'}
};
const furniture={
 bed:FURN+'bed-single.glb',
 rug:FURN+'rug-rectangle.glb',
 sofa:FURN+'lounge-sofa.glb',
 bookcase:FURN+'bookcase-open.glb',
 washer:FURN+'washer.glb',
 sink:FURN+'kitchen-sink.glb',
 counter:FURN+'kitchen-cabinet.glb',
 fridge:FURN+'kitchen-fridge.glb',
 table:FURN+'table-coffee.glb',
 box:FURN+'cardboard-box-open.glb',
 trashcan:FURN+'trashcan.glb',
 plant:FURN+'plant-small1.glb'
};
let running=false, level=0, elapsed=0, coins=0, sessionCoins=0, cleanCount=0, totalCount=0;
let selected=null, scrubbing=null, mouseDown=null, scrubDistance=0, turn=0, zoom=1, hintTimer=0, activeSound=true;
let pickables=[],things=[],stains=[],stations=[],animations=[],effects=[],generation=0, ready=false;
let lastFrame=performance.now(),lastClockSecond=-1,previousStage=0;
let saved={coins:0,unlocked:0,best:{}};
try{const v=JSON.parse(localStorage.getItem(DIRTY_KEY)||'null');if(v&&typeof v==='object')saved={coins:Math.max(0,Number(v.coins)||0),unlocked:Math.min(1,Math.max(0,Number(v.unlocked)||0)),best:v.best||{}}}catch(_){}
coins=saved.coins;
function save(){try{localStorage.setItem(DIRTY_KEY,JSON.stringify(saved))}catch(_){}}
function resize(){
 const w=innerWidth,h=innerHeight;
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();
function colorMat(color,more={}){return new THREE.MeshStandardMaterial({color,roughness:.78,...more})}
function mesh(geometry,color){const m=new THREE.Mesh(geometry,colorMat(color));m.castShadow=true;m.receiveShadow=true;return m}
function cuboid(w,h,d,color,x=0,y=0,z=0){const m=mesh(new THREE.BoxGeometry(w,h,d),color);m.position.set(x,y,z);return m}
function makeLabel(text,width=2.1,height=.49,bg='#fffaf0',fg='#315e4d'){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
 ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(3,3,506,122,24);ctx.fill();
 ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 55px system-ui, sans-serif';ctx.fillText(text,256,66,490);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false}));
 s.scale.set(width,height,1);return s;
}
async function preload(){
 if(ready)return;
 const assets={...Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.path])),
  ...Object.fromEntries(Object.entries(furniture).map(([k,v])=>[k,v]))};
 const entries=Object.entries(assets);
 await Promise.all(entries.map(async([k,url])=>{
  try{const gltf=await loader.loadAsync(url);models.set(k,gltf.scene)}
  catch(e){console.warn('[싹싹! 정리왕] 모델 대체:',k,e?.message||e)}
 }));
 ready=true;
}
function itemModel(key,size=.6,color=0xc9ab80){
 const outer=new THREE.Group(),source=models.get(key);
 if(source){
  const obj=source.clone(true);
  obj.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(obj),s=box.getSize(new THREE.Vector3()),ctr=box.getCenter(new THREE.Vector3());
  const max=Math.max(.01,s.x,s.y,s.z),scale=size/max;
  obj.scale.multiplyScalar(scale);obj.position.set(-ctr.x*scale,-box.min.y*scale,-ctr.z*scale);
  obj.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
  outer.add(obj);
 }else{
  outer.add(cuboid(size*.72,size*.58,size*.6,color,0,size*.29,0));
 }
 return outer;
}
function smooth(a,b,t){return a+(b-a)*Math.min(1,Math.max(0,t))}
function seedRandom(seed){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
function buildRoom(){
 generation++;
 root.clear();pickables=[];things=[];stains=[];stations=[];animations=[];effects=[];selected=null;scrubbing=null;elapsed=0;lastClockSecond=-1;cleanCount=0;sessionCoins=0;
 const def=levelDefs[level],rand=seedRandom(def.seed+Math.floor(Math.random()*20000));
 scene.background.set(level===0?0xc5e2d5:0xd3e6de);scene.fog.color.copy(scene.background);
 const floor=cuboid(11.75,.23,11.3,def.floor,0,-.14,0);floor.receiveShadow=true;root.add(floor);
 // Dollhouse: only the back and left walls, keeping every prop visible and selectable.
 const back=cuboid(11.75,3.8,.2,def.wall,0,1.86,-5.62);root.add(back);
 const side=cuboid(.2,3.8,11.3,def.wall,-5.9,1.86,0);root.add(side);
 for(let i=0;i<5;i++){
  const frame=cuboid(.055,3.5,.06,0xe3cdad,-5.75,1.75,-4.3+i*2.16);root.add(frame)
 }
 const strip=cuboid(11.3,.14,.13,0xdcbda1,0,3.5,-5.49);root.add(strip);
 for(let i=0;i<9;i++){const t=cuboid(11.4,.015,.013,0xffffff,0,.008,-4.9+i*1.1);t.material.transparent=true;t.material.opacity=.27;root.add(t)}
 const rug=itemModel('rug',3.9,0x9ad5b7);rug.position.set(0,.012,.26);root.add(rug);
 const furn=level===0?[
  ['bed',2.7,-3.58,-3.6,Math.PI/2],['sofa',2.6,1.65,-3.74,0],
  ['bookcase',2.6,-4.83,-1.7,Math.PI/2],['washer',1.27,-4.48,.43,Math.PI/2],
  ['sink',1.45,4.54,-3.25,-Math.PI/2],['table',1.35,.0,-2.78,0],
  ['plant',1.1,3.78,-4.4,0]]:
  [['counter',2.0,-2.94,-3.93,0],['fridge',2.3,3.18,-4.36,0],
  ['bookcase',2.25,-4.75,-2.55,Math.PI/2],['washer',1.18,-4.43,.35,Math.PI/2],
  ['sink',1.5,4.52,-3.15,-Math.PI/2],['table',1.6,.4,-3.72,0],
  ['plant',1,3.95,-4.66,0]];
 furn.forEach(([key,size,x,z,rot])=>{
  const m=itemModel(key,size,0xe1ba8b);m.position.set(x,.035,z);m.rotation.y=rot;root.add(m);
 });
 const sceneTitle=makeLabel(def.title,3.3,.64);sceneTitle.position.set(.1,3.1,-5.38);root.add(sceneTitle);
 makeStation('shelf',-4.65,-1.75);
 makeStation('laundry',-4.55,.95);
 makeStation('toys',-4.55,3.56);
 makeStation('sink',4.55,-2.2);
 makeStation('recycle',4.55,.55);
 makeStation('trash',4.55,3.24);
 const list=[];
 for(const [key,num] of Object.entries(def.items))for(let i=0;i<num;i++)list.push(key);
 // Fisher-Yates: each replay changes the mess, while keeping safe pickable grid spacing.
 for(let i=list.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
 for(let i=0;i<list.length;i++){
  const col=i%8,row=Math.floor(i/8);
  const x=-2.95+col*.86+(rand()-.5)*.14,z=-1.49+row*.77+(rand()-.5)*.13;
  const key=list[i],def=props[key],g=itemModel(key,def.size,def.color);
  g.position.set(x,.02,z);g.rotation.y=rand()*Math.PI*2;
  g.userData={kind:'item',key,zone:def.kind,name:def.name};
  // Larger invisible grab area makes small stationery usable on phones.
  const grab=new THREE.Mesh(new THREE.SphereGeometry(.30,8,6),new THREE.MeshBasicMaterial({visible:false}));
  grab.position.y=.25;g.add(grab);root.add(g);pickables.push(g);
  things.push({group:g,key,zone:def.kind,done:false,home:g.position.clone(),rot:g.rotation.y});
 }
 const dspots=[[-3.5,2.8],[-1.7,3.55],[.35,3.3],[2.3,3.6],[-3.65,-1.4],[3.55,-1.05],[.8,-2.1]];
 for(let i=0;i<def.stains;i++)makeStain(dspots[i][0],dspots[i][1],rand);
 totalCount=things.length+stains.length;
 $('stageName').textContent=def.name;
 $('roomIndicator').textContent='물건 터치 → 제자리 터치 · 얼룩은 문질러 닦기';
 $('missionIcon').textContent='🧤';
 $('missionText').innerHTML='바닥의 물건을 터치해 보세요<small>정리할 장소가 빛나면 그곳을 누르세요</small>';
 updateHud();
 cameraMove();
}
function makeStation(key,x,z){
 const d=catalog[key];
 const group=new THREE.Group();group.position.set(x,.01,z);
 const plate=new THREE.Mesh(new THREE.CylinderGeometry(.76,.76,.06,24),colorMat(d.color,{emissive:d.color,emissiveIntensity:.16}));
 plate.position.y=.028;plate.receiveShadow=true;group.add(plate);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.76,.055,8,34),new THREE.MeshBasicMaterial({color:0xfff9d8}));
 rim.rotation.x=-Math.PI/2;rim.position.y=.075;group.add(rim);
 const token=makeLabel(d.icon+' '+d.label,1.9,.44,'#fffdf2','#315d50');
 token.position.set(0,.55,0);group.add(token);
 const hit=new THREE.Mesh(new THREE.CylinderGeometry(.94,.94,.17,24),new THREE.MeshBasicMaterial({visible:false}));
 hit.position.y=.10;hit.userData={kind:'station',key};group.add(hit);
 group.userData={kind:'station',key};root.add(group);pickables.push(group);
 const record={group,key,plate,rim,token,hit,x,z,stored:0};
 stations.push(record);
}
function makeStain(x,z,rand){
 const size=.46+rand()*.16;
 const mat=new THREE.MeshBasicMaterial({color:rand()>.5?0x906b4e:0x7e9879,transparent:true,opacity:.62,depthWrite:false,side:THREE.DoubleSide});
 const stain=new THREE.Mesh(new THREE.CircleGeometry(size,18),mat);
 stain.rotation.x=-Math.PI/2;stain.rotation.z=rand()*6.28;stain.position.set(x,.045,z);
 stain.userData={kind:'stain',name:'바닥 얼룩'};root.add(stain);pickables.push(stain);
 const border=new THREE.Mesh(new THREE.RingGeometry(size*.93,size,24),new THREE.MeshBasicMaterial({color:0x674f3e,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false}));
 border.rotation.x=-Math.PI/2;border.position.set(x,.046,z);root.add(border);
 stains.push({mesh:stain,border,done:false,amount:0,position:stain.position.clone()});
}
function progress(){
 cleanCount++;sessionCoins+=5;coins+=5;
 if(cleanCount===totalCount){finish();return}
 updateHud();
}
function updateHud(){
 $('count').textContent=cleanCount+' / '+totalCount;
 $('coins').textContent=coins+' 🪙';
 const p=totalCount?Math.round(cleanCount/totalCount*100):0;
 $('percent').textContent=p+'%';$('barFill').style.width=p+'%';
}
function show(text,time=1250){
 const el=$('hint');el.textContent=text;el.classList.add('show');clearTimeout(hintTimer);
 hintTimer=setTimeout(()=>el.classList.remove('show'),time);
}
function chirp(pitch=620){
 if(!activeSound)return;
 try{
  const A=window.AudioContext||window.webkitAudioContext;
  chirp.ctx??=new A();
  if(chirp.ctx.state==='suspended')chirp.ctx.resume();
  const c=chirp.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime;
  o.type='sine';o.frequency.setValueAtTime(pitch,t);o.frequency.exponentialRampToValueAtTime(pitch*1.25,t+.09);
  g.gain.setValueAtTime(.043,t);g.gain.exponentialRampToValueAtTime(.0001,t+.15);
  o.connect(g).connect(c.destination);o.start(t);o.stop(t+.16);
 }catch(_){}
}
function bounce(item){
 animations.push({kind:'wiggle',item,time:0,length:.25,start:item.rot});
}
function makeSparkles(pos,color=0xffffb0){
 for(let i=0;i<6;i++){
  const m=new THREE.Mesh(new THREE.SphereGeometry(.055,6,5),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1}));
  m.position.copy(pos);root.add(m);
  effects.push({mesh:m,v:new THREE.Vector3((Math.random()-.5)*1.5,.8+Math.random()*1.4,(Math.random()-.5)*1.5),life:.65});
 }
}
function selectItem(item){
 if(!item||item.done)return;
 selected=item;scrubbing=null;
 things.forEach(t=>t.group.scale.setScalar(t===item?1.23:1));
 const s=stations.find(st=>st.key===item.zone);
 if(s){$('missionIcon').textContent=catalog[item.zone].icon;
  $('missionText').innerHTML=itemLabel(item)+'을(를) 집었어요<small>'+catalog[item.zone].hint+'</small>';}
 chirp(490);
}
function itemLabel(item){return props[item.key].name}
function placeItem(item,station){
 if(!item||item.done)return;
 if(station.key!==item.zone){
  bounce(item);show('여기는 '+catalog[station.key].label+'이에요. '+catalog[item.zone].label+'에 놓아 보세요!');
  chirp(230);return;
 }
 item.done=true;selected=null;
 things.forEach(t=>t.group.scale.setScalar(1));
 const end=new THREE.Vector3(station.x,.25,station.z);
 animations.push({kind:'move',item,time:0,length:.43,start:item.group.position.clone(),end,rot:item.group.rotation.y});
 station.stored++;
 $('missionIcon').textContent='✨';
 $('missionText').innerHTML='좋았어! '+itemLabel(item)+' 정리 성공<small>다음 물건을 골라 주세요</small>';
 show('정리 성공! +5 코인',760);chirp(790);progress();
}
function cleanStain(stain,effort){
 if(stain.done)return;
 stain.amount=Math.min(1,stain.amount+effort);
 stain.mesh.material.opacity=.62*(1-stain.amount);
 stain.border.material.opacity=.15*(1-stain.amount);
 stain.mesh.scale.setScalar(1-stain.amount*.22);
 if(stain.amount>=1){
  stain.done=true;
  pickables=pickables.filter(o=>o!==stain.mesh);
  makeSparkles(stain.position,0xc8f9e6);root.remove(stain.mesh,stain.border);
  $('missionIcon').textContent='🧽';
  $('missionText').innerHTML='얼룩이 사라졌어요!<small>다음 물건을 정리해 보세요</small>';
  chirp(920);show('반짝반짝! +5 코인',850);progress();
 }else{
  $('missionIcon').textContent='🧽';$('missionText').innerHTML='얼룩을 문질러 닦는 중!<small>손가락이나 마우스로 여러 번 문질러 주세요</small>';
 }
}
function inViewport(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1)}
function getHit(e){
 inViewport(e);picker.setFromCamera(mouse,camera);
 const hits=picker.intersectObjects(pickables,true);
 for(const h of hits){
  let p=h.object;
  while(p&&!p.userData?.kind)p=p.parent;
  if(p&&p.userData?.kind){
   if(p.userData.kind==='stain'){const s=stains.find(x=>x.mesh===p);if(s&&!s.done)return{kind:'stain',value:s,point:h.point}}
   if(p.userData.kind==='item'){const t=things.find(x=>x.group===p);if(t&&!t.done)return{kind:'item',value:t,point:h.point}}
   if(p.userData.kind==='station'){const s=stations.find(x=>x.key===p.userData.key);if(s)return{kind:'station',value:s,point:h.point}}
  }
 }
 return null;
}
function pointerDown(e){
 if(!running||e.button>0)return;
 mouseDown={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId};
 const hit=getHit(e);
 if(hit?.kind==='stain'){
  scrubbing=hit.value;selected=null;things.forEach(t=>t.group.scale.setScalar(1));scrubDistance=0;
  cleanStain(scrubbing,.17);
  if(!scrubbing.done){try{canvas.setPointerCapture(e.pointerId)}catch(_){}}
  e.preventDefault();
 }
}
function pointerMove(e){
 if(!running)return;
 if(scrubbing&&mouseDown&&mouseDown.id===e.pointerId){
  const dx=e.clientX-mouseDown.x,dy=e.clientY-mouseDown.y;
  const dist=Math.hypot(dx,dy);
  scrubDistance+=dist;mouseDown.x=e.clientX;mouseDown.y=e.clientY;
  if(scrubDistance>=12){const chunks=Math.floor(scrubDistance/12);scrubDistance%=12;cleanStain(scrubbing,Math.min(.25,chunks*.07));if(scrubbing.done)scrubbing=null}
  e.preventDefault();return;
 }
 if(e.pointerType==='mouse'){
  const hit=getHit(e),el=$('label');
  if(hit?.kind==='item'){el.textContent=itemLabel(hit.value);el.style.display='block';el.style.left=e.clientX+'px';el.style.top=(e.clientY-28)+'px'}
  else if(hit?.kind==='station'){el.textContent=catalog[hit.value.key].label;el.style.display='block';el.style.left=e.clientX+'px';el.style.top=(e.clientY-28)+'px'}
  else el.style.display='none';
 }
}
function pointerUp(e){
 if(!running)return;
 const wasScrubbing=Boolean(scrubbing);scrubbing=null;
 try{canvas.releasePointerCapture(e.pointerId)}catch(_){}
 if(wasScrubbing){mouseDown=null;return}
 const hit=getHit(e);
 if(hit?.kind==='item'){selectItem(hit.value)}
 else if(hit?.kind==='station'){
  if(selected)placeItem(selected,hit.value);
  else {show(catalog[hit.value.key].label+'이에요. 먼저 바닥의 물건을 터치해 주세요',1100)}
 }else if(hit?.kind==='stain'){
  if(selected){selected=null;things.forEach(t=>t.group.scale.setScalar(1))}
  cleanStain(hit.value,.22);
 }else if(selected){
  show('빛나는 '+catalog[selected.zone].label+'에 물건을 놓아 주세요',1100);
 }
 mouseDown=null;
}
canvas.addEventListener('pointerdown',pointerDown);
canvas.addEventListener('pointermove',pointerMove);
canvas.addEventListener('pointerup',pointerUp);
canvas.addEventListener('pointercancel',()=>{mouseDown=null;scrubbing=null});
canvas.addEventListener('wheel',e=>{if(!running)return;zoom=THREE.MathUtils.clamp(zoom+Math.sign(e.deltaY)*.07,.79,1.5);cameraMove();e.preventDefault()},{passive:false});
function cameraMove(){
 const angle=.56+turn;const portraitFit=Math.max(1,Math.min(1.65,.78/camera.aspect));const radius=17.8*zoom*portraitFit;
 camera.position.set(Math.sin(angle)*radius,12.9*zoom*portraitFit,Math.cos(angle)*radius);
 camera.lookAt(0,.10,-.2);
}
$('rotateLeft').onclick=()=>{turn=THREE.MathUtils.clamp(turn-.22,-.42,.6);cameraMove()};
$('rotateRight').onclick=()=>{turn=THREE.MathUtils.clamp(turn+.22,-.42,.6);cameraMove()};
$('zoomIn').onclick=()=>{zoom=Math.max(.79,zoom-.1);cameraMove()};
$('zoomOut').onclick=()=>{zoom=Math.min(1.5,zoom+.1);cameraMove()};
$('sound').onclick=()=>{activeSound=!activeSound;$('sound').textContent=activeSound?'♪':'♪̸';show(activeSound?'효과음 켜짐':'효과음 꺼짐',700)};
function startLevel(n){
 level=n;turn=0;zoom=1;running=true;
 $('intro').classList.add('hidden');$('end').classList.add('hidden');
 buildRoom();show(level===0?'어서 와! 먼저 바닥의 책을 골라 봐':'새 의뢰가 도착했어! 주방을 청소하자',1750);
}
$('start').onclick=async()=>{
 if(running){$('intro').classList.add('hidden');return}
 const b=$('start');b.disabled=true;b.textContent='방과 가구를 준비하고 있어요...';
 await preload();startLevel(previousStage);
 b.textContent='계속 청소하기';b.disabled=false;
};
$('help').onclick=()=>{$('intro').classList.remove('hidden');$('start').textContent='계속 청소하기'};
$('replay').onclick=()=>startLevel(level);
$('next').onclick=()=>startLevel(Math.min(1,level+1));
function finish(){
 running=false;scrubbing=null;selected=null;
 const seconds=Math.round(elapsed);
 saved.coins=coins;saved.unlocked=Math.max(saved.unlocked,Math.min(1,level+1));
 if(!saved.best[level]||seconds<saved.best[level])saved.best[level]=seconds;
 save();updateHud();
 const more=level===0;
 $('endTitle').textContent=more?'원룸 청소 성공!':'주방 청소 성공!';
 $('endCaption').textContent=more?'완벽해! 이제 주방 청소 의뢰도 열렸어.':'모든 공간이 반짝반짝해졌어!';
 $('dirtyBefore').textContent=totalCount+'개';
 $('summary').textContent='이번 의뢰 보상 +'+sessionCoins+' 코인 · '+formatTime(seconds)+' · 최고 '+formatTime(saved.best[level]);
 $('next').textContent=more?'다음 의뢰: 주방 청소':'새 주방 다시 청소';
 $('end').classList.remove('hidden');
 makeSparkles(new THREE.Vector3(0,1.5,0),0xffe38f);chirp(1180);
}
function formatTime(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function tick(dt,now){
 if(running){elapsed+=dt;const sec=Math.floor(elapsed);if(sec!==lastClockSecond){lastClockSecond=sec;$('clock').textContent=formatTime(sec)}}
 animations=animations.filter(a=>{
  a.time+=dt;const p=Math.min(1,a.time/a.length);
  if(a.kind==='move'){
   a.item.group.position.lerpVectors(a.start,a.end,p*p*(3-2*p));
   a.item.group.position.y+=Math.sin(p*Math.PI)*.9;
   a.item.group.scale.setScalar(Math.max(.01,1-p));
   if(p>=1){root.remove(a.item.group);makeSparkles(a.end)}
  }else if(a.kind==='wiggle'){a.item.group.rotation.y=a.start+Math.sin(p*Math.PI*4)*.16*(1-p);if(p>=1)a.item.group.rotation.y=a.start}
  return p<1;
 });
 effects=effects.filter(f=>{
  f.life-=dt;f.mesh.position.addScaledVector(f.v,dt);f.v.y-=dt*2;
  f.mesh.material.opacity=Math.max(0,f.life/.65);
  if(f.life<=0){root.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();return false}
  return true;
 });
 stations.forEach((s,i)=>{
  const highlighted=selected&&selected.zone===s.key;
  s.rim.material.color.setHex(highlighted?0x24cf8d:0xfff9d8);
  s.rim.scale.setScalar(highlighted?1.07+Math.sin(now*4+i)*.07:1);
  s.plate.material.emissiveIntensity=highlighted?.36:.16;
 });
}
function frame(now){
 const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
 tick(dt,now/1000);renderer.render(scene,camera);requestAnimationFrame(frame);
}
cameraMove();requestAnimationFrame(frame);
// An unlocked room is playable without relying on cloud account permissions.
$('coins').textContent=coins+' 🪙';
if(saved.unlocked>0){$('introTitle').textContent='다시 찾아온 정리왕!';
 $('start').textContent='원룸 청소 시작';}
