import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const canvas=$('world');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.86;
renderer.setPixelRatio(Math.min(devicePixelRatio||1.0,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb4d1c0);
scene.fog=new THREE.Fog(0xb4d1c0,26,47);
const camera=new THREE.PerspectiveCamera(48,1,.1,80);
const hemi=new THREE.HemisphereLight(0xfff8e8,0x8c998e,1.35);scene.add(hemi);
const sunlight=new THREE.DirectionalLight(0xffedd1,1.75);
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
  items:{book:14,pen:8,pillow:10,bag:10,bottle:14,can:12,carton:8,cup:8,toy:12},stains:7,
  littleItems:{book:14,toy:14,bottle:14,cup:8},littleStains:2,
  floor:0xc9ae8c,wall:0xe5cfac},
 {name:'의뢰 2 · 난장판 주방',title:'반짝반짝 주방',description:'바닥에 널린 물건을 치우고 얼룩까지 닦자!',seed:67891,
  items:{cup:18,plate:16,pan:5,bottle:16,can:14,carton:10,bag:8,book:4,pillow:3,toy:4},stains:9,
  littleItems:{cup:14,plate:11,bottle:14,can:7,bag:4},littleStains:2,
  floor:0xb9c9ba,wall:0xd0dfc9}
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
let running=false, level=0, challengeMode=false, elapsed=0, coins=0, sessionCoins=0, cleanCount=0, totalCount=0;
let selected=null, dragging=null, scrubbing=null, mouseDown=null, scrubDistance=0, turn=0, zoom=1, hintTimer=0, activeSound=true;
let pickables=[],things=[],stains=[],stations=[],animations=[],effects=[],decorations=[],decorationsHidden=0,clutterPiles=[],pileFillerMeshes=[],generation=0, ready=false;
let lastFrame=performance.now(),lastClockSecond=-1,previousStage=0,beforeImage='',captureTimeout=0;
let saved={coins:0,unlocked:0,best:{}};
try{const v=JSON.parse(localStorage.getItem(DIRTY_KEY)||'null');if(v&&typeof v==='object')saved={coins:Math.max(0,Number(v.coins)||0),unlocked:Math.min(1,Math.max(0,Number(v.unlocked)||0)),best:v.best||{}}}catch(_){}
coins=saved.coins;
function save(){try{localStorage.setItem(DIRTY_KEY,JSON.stringify(saved))}catch(_){}}
function resize(){
 const w=innerWidth,h=innerHeight;
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
addEventListener('resize',()=>{resize();cameraMove()});resize();
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
function scatterClutter(list,rand){
 // Clusters reflect where belongings would have fallen, not a numbered grid.
 const anchors={
  book:[[-2.8,-1.5],[-.7,-2.35]],pen:[[-2.7,-1.0],[-.65,-2.0]],
  pillow:[[-2.9,-2.25],[1.5,-2.1]],bag:[[-1.4,1.9],[2.4,2.35]],
  bottle:[[2.15,1.2],[1.4,-1.45]],can:[[1.85,1.9],[2.4,-.8]],
  carton:[[1.2,1.35],[2.4,2.15]],cup:[[1.95,-1.55],[-.5,-2.0]],
  plate:[[1.9,-1.5],[-.55,-1.8]],pan:[[1.45,-1.85],[-1.2,-1.25]],
  toy:[[-2.35,2.2],[-1.1,.8]]
 };
 const placements=[];
 for(const key of list){
  let best=null,bestDistance=-1;
  for(let n=0;n<280;n++){
   // Reserve space for fingers without visually reverting to regular rows.
   // Widen the search progressively if the local pile gets dense.
   const independent=n>=140||rand()<.16,centers=anchors[key]||[[-1,0]],a=centers[Math.floor(rand()*centers.length)];
   const radius=.16+Math.sqrt(rand())*1.7,theta=rand()*Math.PI*2;
   const x=THREE.MathUtils.clamp(independent?(rand()-.5)*7.2:a[0]+Math.cos(theta)*radius,-3.65,3.65);
   const z=THREE.MathUtils.clamp(independent?-2.8+rand()*7.25:a[1]+Math.sin(theta)*radius,-2.75,4.35);
   const dist=placements.reduce((min,p)=>Math.min(min,Math.hypot(x-p.x,z-p.z)),100);
   if(dist>bestDistance){best={x,z};bestDistance=dist}
   if(dist>.78)break;
  }
  placements.push(best);
 }
 return placements;
}

const PILE_LAYOUTS=[
 {x:-2.05,z:-1.18,r:1.26,theme:['book','pillow','toy','carton']},
 {x:1.75,z:-1.20,r:1.33,theme:['bottle','can','cup','carton']},
 {x:-2.10,z:2.20,r:1.28,theme:['toy','bag','book','pillow']},
 {x:1.75,z:2.05,r:1.27,theme:['can','bottle','bag','carton']}
];
function createClutterMountains(rand){
 // Four actual three-dimensional mountains. Shared instancing keeps the mobile
 // GPU draw-call budget predictable; real Kidscade GLBs give the upper layers
 // recognizable bottles, books, cups, toys and boxes.
 clutterPiles=PILE_LAYOUTS.map(p=>({...p}));
 const fillerKinds=[
  {geometry:new THREE.DodecahedronGeometry(.30,0),name:'crumpled paper'},
  {geometry:new THREE.BoxGeometry(.48,.15,.33),name:'books and boxes'},
  {geometry:new THREE.CylinderGeometry(.12,.12,.42,6),name:'cans and bottles'}
 ];
 const filler=fillerKinds.map(({geometry})=>{
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,flatShading:true,roughness:.95});
  const instanced=new THREE.InstancedMesh(geometry,mat,120);
  instanced.count=0;instanced.frustumCulled=false;instanced.castShadow=false;instanced.receiveShadow=false;
  root.add(instanced);return instanced;
 });
 pileFillerMeshes=filler;
 const colors=[0x947e65,0xafa08a,0x9caeb0,0xe4b88e,0x8bada0,0xa7806c,0xb5a091,0x789d99,0xc5ad81,0x778da3];
 const temp=new THREE.Object3D();
 const layers=[
  {n:18,r:1.16,y:.21,spread:.25},
  {n:15,r:.92,y:.64,spread:.22},
  {n:12,r:.69,y:1.04,spread:.17},
  {n:9,r:.46,y:1.45,spread:.13},
  {n:6,r:.25,y:1.84,spread:.08}
 ];
 let numActual=0;
 for(let pi=0;pi<clutterPiles.length;pi++){
  const pile=clutterPiles[pi];
  for(const [li,tier] of layers.entries()){
   for(let j=0;j<tier.n;j++){
    const phase=rand()*Math.PI*2;
    const radius=tier.r*(.15+Math.sqrt(rand())*.86);
    const x=pile.x+Math.cos(phase)*radius;
    const z=pile.z+Math.sin(phase)*radius;
    const y=tier.y+(rand()-.5)*tier.spread;
    const size=.50+rand()*.40;
    const kind=pile.theme[Math.floor(rand()*pile.theme.length)];
    // Real GLB meshes are used at the visible crest and on exposed ledges.
    if((li>=2&&j%3===0)||(li<2&&j===0)){
     const obj=itemModel(kind,size,props[kind].color);
     obj.position.set(x,y-.18,z);
     obj.rotation.set((rand()-.5)*.9,rand()*Math.PI*2,(rand()-.5)*.9);
     obj.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=false}});
     root.add(obj);decorations.push({model:obj,height:y,pile:pi,hidden:false});numActual++;
    }else{
     const shape=li<2?(j%2===0?0:1):j%3;
     const instanced=filler[shape],index=instanced.count++;
     temp.position.set(x,y,z);
     temp.rotation.set((rand()-.5)*.9,rand()*Math.PI*2,(rand()-.5)*.9);
     temp.scale.setScalar(size*(shape===1?1.05:1));
     temp.updateMatrix();
     instanced.setMatrixAt(index,temp.matrix);
     instanced.setColorAt(index,new THREE.Color(colors[Math.floor(rand()*colors.length)]));
     decorations.push({mesh:instanced,index,height:y,pile:pi,hidden:false});
    }
   }
  }
 }
 for(const instance of filler){instance.instanceMatrix.needsUpdate=true;if(instance.instanceColor)instance.instanceColor.needsUpdate=true}
 decorations.sort((a,b)=>b.height-a.height);
}
const hiddenMatrix=new THREE.Matrix4().makeScale(0,0,0);
function retreatClutterMountains(){
 // Only draggable objects award coins. The scenery progressively recedes
 // as real tidying advances, and vanishes entirely at 100% completion.
 const ratio=totalCount?cleanCount/totalCount:0;
 const target=ratio>=1?decorations.length:Math.floor(ratio*decorations.length);
 while(decorationsHidden<target){
  const d=decorations[decorationsHidden++];
  if(d.hidden)continue;
  d.hidden=true;
  if(d.model)d.model.visible=false;
  else{d.mesh.setMatrixAt(d.index,hiddenMatrix);d.mesh.instanceMatrix.needsUpdate=true}
 }
}

function buildRoom(){
 generation++;
 for(const m of pileFillerMeshes){m.geometry.dispose();m.material.dispose()}
 pileFillerMeshes=[];
 root.clear();clearTimeout(captureTimeout);beforeImage='';pickables=[];things=[];stains=[];stations=[];animations=[];effects=[];decorations=[];decorationsHidden=0;clutterPiles=[];selected=null;dragging=null;scrubbing=null;canvas.style.cursor='grab';$('dropGuide').hidden=true;elapsed=0;lastClockSecond=-1;cleanCount=0;sessionCoins=0;
 const def=levelDefs[level],rand=seedRandom(def.seed+Math.floor(Math.random()*20000));
 scene.background.set(level===0?0xb4d1c0:0xaec6b7);scene.fog.color.copy(scene.background);
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
  ['table',1.35,.0,-2.78,0],
  ['plant',1.1,3.78,-4.4,0]]:
  [['counter',2.0,-2.94,-3.93,0],['fridge',2.3,3.18,-4.36,0],
  ['table',1.6,.4,-3.72,0],
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
 // Scenery never enters the raycast pick list, so foreground props remain draggable.
 createClutterMountains(rand);
 const list=[];
 for(const [key,num] of Object.entries(challengeMode?def.items:def.littleItems))for(let i=0;i<num;i++)list.push(key);
 // Fisher-Yates: each replay changes the mess, while keeping safe pickable grid spacing.
 for(let i=list.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
 const scatter=scatterClutter(list,rand);
 for(let i=0;i<list.length;i++){
  const {x,z}=scatter[i];
  const key=list[i],def=props[key],g=itemModel(key,def.size,def.color);
  g.position.set(x,.055,z);
  g.rotation.set((rand()-.5)*.18,rand()*Math.PI*2,(rand()-.5)*.22);
  g.userData={kind:'item',key,zone:def.kind,name:def.name};
  // Larger invisible grab area makes small stationery usable on phones.
  const grab=new THREE.Mesh(new THREE.SphereGeometry(.30,8,6),new THREE.MeshBasicMaterial({visible:false}));
  grab.position.y=.25;g.add(grab);root.add(g);pickables.push(g);
  things.push({group:g,key,zone:def.kind,done:false,home:g.position.clone(),rot:g.rotation.y,tilt:g.rotation.clone()});
 }
 const spillables=things.filter(t=>['cup','bottle','can','carton','plate'].includes(t.key));
 for(let i=0;i<(challengeMode?def.stains:def.littleStains);i++){
  const source=spillables[(i*7+3)%spillables.length];
  const theta=rand()*Math.PI*2,radius=.34+rand()*.55;
  const x=THREE.MathUtils.clamp(source.home.x+Math.cos(theta)*radius,-3.75,3.75);
  const z=THREE.MathUtils.clamp(source.home.z+Math.sin(theta)*radius,-2.8,4.35);
  makeStain(x,z,rand);
 }
 totalCount=things.length+stains.length;
 $('stageName').textContent=(challengeMode?'🏔️ ':'🌼 ')+def.name;
 $('roomIndicator').textContent=challengeMode?'물건을 끌어 수납함에 놓기 · 얼룩은 문지르기':'🧸 끌어서 쏙! 얼룩은 문질문질!';
 $('missionIcon').textContent='🧤';
 $('missionText').innerHTML=challengeMode?'물건을 눌러 끌어 보세요<small>손가락을 떼면 수납 · 얼룩은 문질러 닦아요</small>':'🧸 물건을 끌어서 집에 보내요!<small>초록빛이 나는 곳에 쏙 넣어요</small>';
 updateHud();
 cameraMove();
 beforeImage=captureScene();
}
function stationModel(key){
 const propsByStation={
  shelf:['bookcase',2.0,0xa27a52],
  laundry:['box',1.12,0xac8c66],
  toys:['box',1.22,0xc39b69],
  sink:['sink',1.42,0xe0e4e1],
  recycle:['trashcan',1.12,0x709a8d],
  trash:['trashcan',1.12,0x9a7c69]
 };
 const [asset,size,fallback]=propsByStation[key];
 const model=itemModel(asset,size,fallback);
 // Touchable physical receptacles replace the previous flat sorting discs.
 if(key==='laundry'||key==='toys'){
  const rim=mesh(new THREE.TorusGeometry(.43,.048,7,24),key==='laundry'?0x936bbf:0xe5a240);
  rim.rotation.x=-Math.PI/2;rim.position.y=.68;model.add(rim);
 }
 if(key==='recycle'||key==='trash'){
  const edge=mesh(new THREE.TorusGeometry(.35,.06,8,24),key==='recycle'?0x299a72:0xc86d5c);
  edge.rotation.x=-Math.PI/2;edge.position.y=.82;model.add(edge);
 }
 return model;
}
function makeStation(key,x,z){
 const d=catalog[key],group=new THREE.Group();group.position.set(x,.01,z);
 const physical=stationModel(key);group.add(physical);
 const plate=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.055,24),colorMat(d.color,{emissive:d.color,emissiveIntensity:.09,transparent:true,opacity:.45}));
 plate.position.y=.02;plate.receiveShadow=true;group.add(plate);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.72,.038,8,34),new THREE.MeshBasicMaterial({color:0xfff4d8,transparent:true,opacity:.52}));
 rim.rotation.x=-Math.PI/2;rim.position.y=.06;group.add(rim);
 const token=makeLabel(d.icon+' '+d.label,1.88,.46,'#fffaf0','#264f41');
 token.position.set(0,key==='shelf'?2.24:1.53,.05);group.add(token);
 const hit=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,key==='shelf'?2.05:1.35,24),new THREE.MeshBasicMaterial({visible:false}));
 hit.position.y=key==='shelf'?1.02:.65;hit.userData={kind:'station',key};group.add(hit);
 group.userData={kind:'station',key};root.add(group);pickables.push(group);
 const record={group,key,plate,rim,token,hit,x,z,stored:0};
 stations.push(record);
}
function depositPosition(station){
 const n=station.stored;
 // A few miniature props visibly accumulate on the shelf or inside each bin.
 const shelf=station.key==='shelf';
 const cols=shelf?3:4,row=Math.floor(n/cols),col=n%cols;
 const x=station.x+(col-(cols-1)/2)*(shelf?.31:.21);
 const z=station.z+(shelf?(.1+(row%2)*.16):((row%2)-.5)*.19);
 const y=shelf?.35+(row%4)*.28:(station.key==='sink'?.58:.39)+Math.floor(row/2)*.055;
 return new THREE.Vector3(x,y,z);
}
function captureScene(){
 try{
  // Render and read back synchronously: no permanent preserveDrawingBuffer cost.
  renderer.render(scene,camera);
  const preview=document.createElement('canvas');
  const sourceW=Math.min(canvas.width,canvas.height*1.1),sourceH=Math.min(canvas.height,canvas.width/1.1);
  preview.width=480;preview.height=Math.max(1,Math.round(480*sourceH/sourceW));
  preview.getContext('2d').drawImage(canvas,(canvas.width-sourceW)/2,(canvas.height-sourceH)/2,sourceW,sourceH,0,0,preview.width,preview.height);
  return preview.toDataURL('image/jpeg',.78);
 }catch(e){console.warn('[정리왕] 화면 비교 저장 실패:',e);return''}
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
 retreatClutterMountains();
 if(cleanCount===totalCount){finish();return}
 updateHud();
 if(!challengeMode&&cleanCount%5===0){show('우와! 반짝반짝! '+(totalCount-cleanCount)+'개 남았어!',1350);chirp(900)}
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
  $('missionText').innerHTML=challengeMode?itemLabel(item)+'을(를) 끌고 있어요<small>'+catalog[item.zone].hint+' · 손을 떼면 수납!</small>':catalog[item.zone].icon+' '+itemLabel(item)+'의 집을 찾아요!<small>반짝반짝 빛나는 '+catalog[item.zone].label+'에 쏙!</small>'; }
 chirp(490);
}
function itemLabel(item){return props[item.key].name}
function placeItem(item,station){
 if(!item||item.done)return;
 if(station.key!==item.zone){
  bounce(item);show('여기는 '+catalog[station.key].label+'이에요. '+catalog[item.zone].label+'에 놓아 보세요!');
  chirp(challengeMode?230:480);return;
 }
 item.done=true;selected=null;dragging=null;canvas.style.cursor='grab';$('dropGuide').hidden=true;
 things.forEach(t=>t.group.scale.setScalar(1));
 const end=depositPosition(station);
 animations.push({kind:'move',item,time:0,length:.53,start:item.group.position.clone(),end,rot:item.group.rotation.y,finalScale:station.key==='shelf'?.55:.36});
 station.stored++;
 $('missionIcon').textContent='✨';
 $('missionText').innerHTML=challengeMode?'좋았어! '+itemLabel(item)+' 정리 성공<small>다음 물건을 골라 주세요</small>':'🌟 잘했어! '+itemLabel(item)+' 쏙!<small>다음 물건도 찾아볼까?</small>';
 show(challengeMode?'정리 성공! +5 코인':'참 잘했어요! 🌟',760);chirp(790);progress();
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
  chirp(920);show(challengeMode?'반짝반짝! +5 코인':'깨끗해졌어요! ✨',850);progress();
 }else{
  $('missionIcon').textContent='🧽';$('missionText').innerHTML='얼룩을 문질러 닦는 중!<small>손가락이나 마우스로 여러 번 문질러 주세요</small>';
 }
}
function inViewport(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1)}
function getHit(e){
 // Project each clutter center onto the viewport. A small screen-space
 // grab radius prevents tiny props from becoming inaccessible on phones.
 // Nearest-center wins when projected meshes overlap.
 if(!selected&&!dragging){
  let closest=null,distance=Infinity;
  const anchor=new THREE.Vector3();
  for(const item of things){
   if(item.done)continue;
   anchor.set(item.group.position.x,.25,item.group.position.z).project(camera);
   if(anchor.z>1||anchor.z< -1)continue;
   const sx=(anchor.x+1)*innerWidth/2,sy=(1-anchor.y)*innerHeight/2;
   const d=Math.hypot(e.clientX-sx,e.clientY-sy);
   if(d<distance){distance=d;closest=item}
  }
  if(closest&&distance<(challengeMode?(e.pointerType==='touch'?22:18):(e.pointerType==='touch'?34:26))){
   return{kind:'item',value:closest,point:closest.group.position};
  }
 }
 inViewport(e);picker.setFromCamera(mouse,camera);
 const hits=picker.intersectObjects(pickables,true),candidates=[];
 for(const h of hits){
  let p=h.object;
  while(p&&!p.userData?.kind)p=p.parent;
  if(!p?.userData?.kind)continue;
  if(p.userData.kind==='stain'){
   const stain=stains.find(x=>x.mesh===p);
   if(stain&&!stain.done)candidates.push({kind:'stain',value:stain,point:h.point});
  }else if(p.userData.kind==='item'){
   const item=things.find(x=>x.group===p);
   if(item&&!item.done)candidates.push({kind:'item',value:item,point:h.point});
  }else if(p.userData.kind==='station'){
   const station=stations.find(x=>x.key===p.userData.key);
   if(station)candidates.push({kind:'station',value:station,point:h.point});
  }
 }
 // Selecting clutter has priority over a nearby large receptacle's hit proxy.
 // Once holding an item, the receptacle takes priority for reliable placement.
 const priority=selected?['station','item','stain']:['item','stain','station'];
 for(const kind of priority){
  const found=candidates.find(hit=>hit.kind===kind);
  if(found)return found;
 }
 return null;
}
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const dragWorld=new THREE.Vector3(),dropProject=new THREE.Vector3();
function groundAt(e,out=dragWorld){
 inViewport(e);
 picker.setFromCamera(mouse,camera);
 return picker.ray.intersectPlane(groundPlane,out);
}
function candidateAt(e){
 const stationsOnly=stations.map(s=>s.hit);
 inViewport(e);picker.setFromCamera(mouse,camera);
 const intersections=picker.intersectObjects(stationsOnly,false);
 if(intersections.length){
  const key=intersections[0].object.userData.key;
  const target=stations.find(s=>s.key===key);
  if(target)return target;
 }
 let nearest=null,best=Infinity;
 for(const s of stations){
  const y=s.key==='shelf'?1.08:.62;
  dropProject.set(s.x,y,s.z).project(camera);
  const x=(dropProject.x+1)*innerWidth/2,yScreen=(1-dropProject.y)*innerHeight/2;
  const distance=Math.hypot(e.clientX-x,e.clientY-yScreen);
  if(distance<best){best=distance;nearest=s}
 }
 return best<(challengeMode?(e.pointerType==='touch'?64:56):(e.pointerType==='touch'?90:76))?nearest:null;
}
function resetDrag(restore=true){
 if(dragging&&restore&&!dragging.item.done){
  dragging.item.group.position.copy(dragging.home);
  dragging.item.group.rotation.copy(dragging.item.tilt);
 }
 dragging=null;selected=null;canvas.style.cursor='grab';$('dropGuide').hidden=true;
 things.forEach(t=>{if(!t.done)t.group.scale.setScalar(1)});
 stations.forEach(st=>st.group.userData.dropHover=false);
}
function beginDrag(item,e){
 selectItem(item);
 const point=groundAt(e,new THREE.Vector3());
 dragging={item,id:e.pointerId,home:item.group.position.clone(),
  startX:e.clientX,startY:e.clientY,moved:false,hover:null,
  offset:point?item.group.position.clone().sub(point):new THREE.Vector3()};
 canvas.style.cursor='grabbing';
 try{canvas.setPointerCapture(e.pointerId)}catch(_){}
 e.preventDefault();
}
function moveDrag(e){
 if(!dragging||e.pointerId!==dragging.id)return;
 const state=dragging;
 const distance=Math.hypot(e.clientX-state.startX,e.clientY-state.startY);
 if(distance>7)state.moved=true;
 if(!state.moved)return;
 const pos=groundAt(e,new THREE.Vector3());
 if(pos){
  const v=pos.add(state.offset);
  state.item.group.position.set(THREE.MathUtils.clamp(v.x,-5.3,5.3),.54,
   THREE.MathUtils.clamp(v.z,-4.6,4.85));
 }
 const hover=candidateAt(e);
 state.hover=hover;
 const guide=$('dropGuide');
 guide.hidden=false;
 guide.style.left=THREE.MathUtils.clamp(e.clientX,65,innerWidth-65)+'px';
 guide.style.top=THREE.MathUtils.clamp(e.clientY-42,140,innerHeight-82)+'px';
 guide.textContent=hover?(hover.key===state.item.zone?'✨ 여기에 쏙!':'다른 친구의 집이에요'):'🏠 빛나는 집으로!';
 guide.dataset.valid=hover?.key===state.item.zone?'yes':hover?'no':'none';
 for(const station of stations)station.group.userData.dropHover=station===hover;
 e.preventDefault();
}
function pointerDown(e){
 if(!running||!$('intro').classList.contains('hidden')||e.button>0)return;
 mouseDown={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId};
 const hit=getHit(e);
 if(hit?.kind==='item'){beginDrag(hit.value,e);return}
 if(hit?.kind==='stain'){
  scrubbing=hit.value;selected=null;scrubDistance=0;
  cleanStain(scrubbing,.17);
  if(scrubbing&&!scrubbing.done){try{canvas.setPointerCapture(e.pointerId)}catch(_){}}
  e.preventDefault();
 }
}
function pointerMove(e){
 if(!running)return;
 if(dragging&&dragging.id===e.pointerId){moveDrag(e);return}
 if(scrubbing&&mouseDown&&mouseDown.id===e.pointerId){
  const dx=e.clientX-mouseDown.x,dy=e.clientY-mouseDown.y;
  const dist=Math.hypot(dx,dy);
  scrubDistance+=dist;mouseDown.x=e.clientX;mouseDown.y=e.clientY;
  if(scrubDistance>=12){
   const chunks=Math.floor(scrubDistance/12);scrubDistance%=12;
   const active=scrubbing;cleanStain(active,Math.min(.25,chunks*.07));
   if(active.done)scrubbing=null;
  }
  e.preventDefault();return;
 }
 if(e.pointerType==='mouse'){
  const hit=getHit(e),el=$('label');
  if(hit?.kind==='item'){el.textContent=itemLabel(hit.value)+' · 끌어서 정리';el.style.display='block';el.style.left=e.clientX+'px';el.style.top=(e.clientY-28)+'px'}
  else el.style.display='none';
 }
}
function pointerUp(e){
 if(!running)return;
 try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch(_){}
 if(dragging&&dragging.id===e.pointerId){
  const state=dragging,station=state.moved?candidateAt(e):null;
  if(station&&station.key===state.item.zone){
   state.item.group.position.y=.54;
   placeItem(state.item,station);
  }else{
   resetDrag(true);
   if(station){
    show(challengeMode?'여기는 '+catalog[station.key].label+'이에요. 올바른 수납함으로 끌어 주세요':'여긴 아니에요! '+catalog[state.item.zone].icon+' 빛나는 집으로 가요!',1400);
    chirp(230);
   }else if(state.moved){show(challengeMode?'수납함 위에서 손을 떼어 보세요!':'빛나는 집까지 데려가 주세요!',1000)}
   else show('물건을 누른 채 수납함까지 끌어 주세요!',1400);
  }
  mouseDown=null;return;
 }
 if(scrubbing&&mouseDown?.id===e.pointerId){scrubbing=null;mouseDown=null;return}
 scrubbing=null;mouseDown=null;
}
function pointerCancel(e){
 if(dragging&&dragging.id===e.pointerId)resetDrag();
 scrubbing=null;mouseDown=null;
}
canvas.addEventListener('pointerdown',pointerDown);
canvas.addEventListener('pointermove',pointerMove);
canvas.addEventListener('pointerup',pointerUp);
canvas.addEventListener('pointercancel',pointerCancel);
canvas.addEventListener('wheel',e=>{if(!running)return;zoom=THREE.MathUtils.clamp(zoom+Math.sign(e.deltaY)*.07,.79,1.5);cameraMove();e.preventDefault()},{passive:false});
function cameraMove(){
 const angle=.56+turn;
 const portraitFit=Math.max(1,Math.min(1.90,.87/camera.aspect));
 const landscapeFit=camera.aspect>1.80?.86:1;
 const radius=14.9*zoom*portraitFit*landscapeFit;
 camera.position.set(Math.sin(angle)*radius,10.8*zoom*portraitFit*landscapeFit,Math.cos(angle)*radius);
 camera.lookAt(0,.10,camera.aspect>1.80?1.05:-.2);
}
$('rotateLeft').onclick=()=>{turn=THREE.MathUtils.clamp(turn-.22,-.42,.6);cameraMove()};
$('rotateRight').onclick=()=>{turn=THREE.MathUtils.clamp(turn+.22,-.42,.6);cameraMove()};
$('zoomIn').onclick=()=>{zoom=Math.max(.79,zoom-.1);cameraMove()};
$('zoomOut').onclick=()=>{zoom=Math.min(1.5,zoom+.1);cameraMove()};
$('sound').onclick=()=>{activeSound=!activeSound;$('sound').textContent=activeSound?'♪':'♪̸';show(activeSound?'효과음 켜짐':'효과음 꺼짐',700)};
function setMode(big){
 if(running)return;
 challengeMode=!!big;
 document.body.classList.toggle('preschool',!challengeMode);
 $('modeEasy').setAttribute('aria-pressed',String(!challengeMode));
 $('modeBig').setAttribute('aria-pressed',String(challengeMode));
 $('modeHint').textContent=challengeMode?'쓰레기 산을 끝까지 정리해요!':'물건 50개를 정리하고 얼룩 2개를 닦아요!';
}
$('modeEasy').onclick=()=>setMode(false);
$('modeBig').onclick=()=>setMode(true);
function showStageButtons(){
 const kitchen=$('startKitchen');
 kitchen.disabled=!saved.unlocked;
 kitchen.textContent=saved.unlocked?'🍽️ 주방 정리!':'🍽️ 주방 잠김';
 kitchen.hidden=running;
}
function startLevel(n){
 level=n;turn=0;zoom=1;running=true;
 $('intro').classList.add('hidden');$('end').classList.add('hidden');
 showStageButtons();buildRoom();window.KidscadeGame?.start?.({stage:level+1});show(level===0?'어서 와! 먼저 바닥의 책을 골라 봐':'새 의뢰가 도착했어! 주방을 청소하자',1750);
}
async function launchStage(n){
 if(running){$('intro').classList.add('hidden');return}
 const a=$('start'),b=$('startKitchen');a.disabled=true;b.disabled=true;
 a.textContent='🏠 방을 준비해요...';
 try{await preload();startLevel(n)}catch(e){show('방을 준비할 수 없어요. 다시 시도해 주세요.',2000);console.error(e)}
 finally{a.textContent='🏠 우리 집 정리!';a.disabled=false;showStageButtons()}
}
$('start').onclick=()=>launchStage(0);
$('startKitchen').onclick=()=>{if(saved.unlocked)launchStage(1)};
$('help').onclick=()=>{$('intro').classList.remove('hidden');$('start').textContent='계속 청소하기';showStageButtons()};
$('replay').onclick=()=>startLevel(level);
$('next').onclick=()=>startLevel(Math.min(1,level+1));
function finish(){
 running=false;scrubbing=null;selected=null;
 const seconds=Math.round(elapsed);
 saved.coins=coins;saved.unlocked=Math.max(saved.unlocked,Math.min(1,level+1));
 if(!saved.best[level]||seconds<saved.best[level])saved.best[level]=seconds;
 save();updateHud();
 // Wait for the final object to land before photographing the clean room.
 const completedGeneration=generation;
 captureTimeout=setTimeout(()=>{
  if(generation!==completedGeneration)return;
  const before=$('beforePhoto'),after=$('afterPhoto');
  if(beforeImage){before.src=beforeImage;before.alt='청소 전 어질러진 공간';}
  const clean=captureScene();if(clean){after.src=clean;after.alt='청소 후 정리된 공간';}
 },700);
 showStageButtons();
 window.KidscadeGame?.result?.({scope:'mission',status:'completed',outcome:'clear',score:totalCount,level:level+1,cleaned:cleanCount,durationSeconds:seconds});
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
 if(running&&$('intro').classList.contains('hidden')){elapsed+=dt;const sec=Math.floor(elapsed);if(sec!==lastClockSecond){lastClockSecond=sec;$('clock').textContent=formatTime(sec)}}
 animations=animations.filter(a=>{
  a.time+=dt;const p=Math.min(1,a.time/a.length);
  if(a.kind==='move'){
   a.item.group.position.lerpVectors(a.start,a.end,p*p*(3-2*p));
   a.item.group.position.y+=Math.sin(p*Math.PI)*1.15;
   a.item.group.scale.setScalar(1+(a.finalScale-1)*p);
   if(p>=1){a.item.group.position.copy(a.end);a.item.group.scale.setScalar(a.finalScale);makeSparkles(a.end)}
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
  const highlighted=selected&&selected.zone===s.key,hover=s.group.userData.dropHover;
  s.rim.material.color.setHex(hover?(highlighted?0x12d98f:0xe76b5e):(highlighted?0x24cf8d:0xfff9d8));
  s.rim.scale.setScalar(hover?1.22:highlighted?(challengeMode?1.07:1.15)+Math.sin(now*4+i)*.08:1);
  s.plate.material.emissiveIntensity=hover?.56:highlighted?.36:.16;
 });
}
function frame(now){
 const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
 tick(dt,now/1000);renderer.render(scene,camera);requestAnimationFrame(frame);
}
cameraMove();requestAnimationFrame(frame);
// An unlocked room is playable without relying on cloud account permissions.
$('coins').textContent=coins+' 🪙';
if(saved.unlocked>0){$('introTitle').textContent='다시 찾아온 정리왕!';}
setMode(false);
showStageButtons();
