import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

const $=id=>document.getElementById(id);
const ui={canvas:$('game'),intro:$('intro'),end:$('end'),endTitle:$('endTitle'),endText:$('endText'),
  mission:$('mission'),detail:$('detail'),progress:$('progress'),health:$('health'),battery:$('battery'),
  time:$('time'),toast:$('toast'),action:$('action'),actionText:$('actionText'),joy:$('joystick'),knob:$('knob'),
  map:$('minimap'),help:$('help'),flash:$('flash'),gaze:$('gaze'),gazeValue:$('gazeValue'),
  navigation:$('navigation'),navArrow:$('navArrow'),navTitle:$('navTitle'),navRange:$('navRange'),
  lesson:$('lesson'),lessonTitle:$('lessonTitle'),lessonText:$('lessonText'),reticle:$('reticle'),gazeLabel:$('gazeLabel')};
const scene=new THREE.Scene();scene.background=new THREE.Color(0x090f19);scene.fog=new THREE.FogExp2(0x090f19,.019);
const renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,90);
scene.add(new THREE.HemisphereLight(0xa3bbef,0x202a2d,1.55));
const moon=new THREE.DirectionalLight(0x9eb1da,1.35);moon.position.set(-7,13,8);scene.add(moon);
const hallLight=new THREE.PointLight(0xb1c6e2,20,23,2);hallLight.position.set(-17.5,3.1,0);scene.add(hallLight);
const officeLight=new THREE.PointLight(0xffcd81,13,13,2);officeLight.position.set(-24.2,3,0);scene.add(officeLight);
const westLight=new THREE.PointLight(0x95aed2,12,23,2);westLight.position.set(-2,3,-12);scene.add(westLight);
const eastLight=new THREE.PointLight(0xb5d3e3,11,23,2);eastLight.position.set(22,3,-12);scene.add(eastLight);
const southLight=new THREE.PointLight(0xc4c5ae,13,28,2);southLight.position.set(8,3,12);scene.add(southLight);
const southEndLight=new THREE.PointLight(0xb4c8de,8,18,2);southEndLight.position.set(26,3,12);scene.add(southEndLight);
const torchTarget=new THREE.Object3D();scene.add(torchTarget);
const torch=new THREE.SpotLight(0xeaf2ff,23,18,.53,.47,1.3);torch.target=torchTarget;scene.add(torch);

const loader=new GLTFLoader(),assetCache=new Map();
const FURN='../../assets/game/3d/interiors/kenney-furniture-kit/';
const MAN='../../assets/game/npcs/glTF/Casual_Male.gltf';
const MONSTER='../../assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost.glb';
const AUDIO='../../assets/kidscade_folklore_night_guard_renamed_assets/';
const SCHOOL={west:-28,east:30,north:-20,south:20,spineEnd:-15,courtyardWest:-15,
  roomCenters:[-10.5,-1.5,7.5,16.5,25.5],guard:{x:-24.2,z:0},
  dokkaebi:{x:-10.5,z:-14.8},science:{x:25.5,z:-15.2},maidenSpawn:{x:25.5,z:-16.8}};
const LIMITS={x1:-28,x2:30,z1:-20,z2:20},walls=[],furniture=[],glowThings=[],mixers=[];
const keys=new Set(),joy={x:0,y:0},player={x:SCHOOL.guard.x,z:SCHOOL.guard.z,yaw:Math.PI/2,root:new THREE.Group(),model:null};
const maiden={x:SCHOOL.maidenSpawn.x,z:SCHOOL.maidenSpawn.z,root:new THREE.Group(),speed:1.2,charge:0,attacks:0};
const disturbed=[];
const stageNames=['','도깨비 장난 조사','처녀귀신 관찰','처녀귀신 봉인','유키온나 난방 복구','유키온나 봉인','달걀귀신 시선 회피','달걀귀신 봉인','저승사자 종소리','저승사자 봉인','늑대인간 소리 유인','늑대인간 봉인','관리실 보고'];
let started=false,ended=false,paused=false,stage=1,fixes=0,hp=3,power=100,flashOn=true,elapsed=0;
let viewYaw=0,turnPointer=null,prevX=0,last=performance.now(),hudClock=0,miniClock=0,toastSeconds=0;
let invulnerable=0,ghostWaiting=0,maidenPhase='approach',tutorialCount=0,lessonTimer=0,lastMistake='';
const guidance={key:'',points:[],mesh:null,clock:0,fromX:0,fromZ:0,goalX:0,goalZ:0};
let gazeLocked=false,ghostNav=null;
const encounter={
 cold:0,heatNodes:[],frost:0,eggCharge:0,eggFear:0,
 bellCount:0,bellClock:0,bellWindow:0,doorClosed:false,doorVisual:null,
 wolf:{x:-1.5,z:16.8,root:new THREE.Group(),nav:null,speed:2.25,grace:5,lureTime:0,ready:false,active:false}
};
const encounterModels={};
const forward=new THREE.Vector3(),modelTime=new THREE.Clock();
scene.add(player.root,maiden.root,encounter.wolf.root);

function mat(color,roughness=.94){return new THREE.MeshStandardMaterial({color,roughness});}
const materials={floor:mat(0x415568),corridor:mat(0x394657),wall:mat(0x7c8995),skirt:mat(0x273646),
  desk:mat(0x765c4d),white:mat(0xced9df),red:mat(0x9b394e),glass:mat(0x7bc8d0)};
function cube(parent,x,y,z,w,h,d,material){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);
  m.receiveShadow=false;parent.add(m);return m;
}
function ground(x,z,w,d,c){cube(scene,x,-.13,z,w,.26,d,mat(c));}
// Adjacent wall and skirt volumes must not share coplanar front/back faces.
// Previously the full-height wall overlapped the skirting from y=0 to y=.38,
// making the two surfaces fight for depth and flash as the camera moved.
const WALL_HEIGHT=3.12,SKIRT_HEIGHT=.38;
function wall(x,z,w,d){
  const upperHeight=WALL_HEIGHT-SKIRT_HEIGHT;
  cube(scene,x,SKIRT_HEIGHT+upperHeight/2,z,w,upperHeight,d,materials.wall);
  cube(scene,x,SKIRT_HEIGHT/2,z,w,SKIRT_HEIGHT,d,materials.skirt);
  walls.push({x,z,hx:w/2,hz:d/2});
}
function wallSplit(z,parts){for(const [x,w] of parts)wall(x,z,w,.29);}
function collides(x,z,rect,r=.34){return Math.abs(x-rect.x)<rect.hx+r&&Math.abs(z-rect.z)<rect.hz+r;}
function onFloor(x,z){
  // ㄷ footprint: western connector + north and south wings, with open-air inner courtyard.
  return (x>-27.75&&x<-14.7&&z>-19.75&&z<19.75)||
    (x>-15.15&&x<29.75&&z>-19.75&&z< -7.1)||
    (x>-15.15&&x<29.75&&z>7.1&&z<19.75);
}
function canWalk(x,z){return onFloor(x,z)&&!walls.some(w=>collides(x,z,w))&&!furniture.some(o=>collides(x,z,o));}
// Shared grid navigation prevents the guide line from crossing walls and desks.
function routePlan(start,goal,reach=1.05){
  // A* instead of an expanding breadth-first search: the larger ㄷ school remains
  // inexpensive to navigate even on tablets, and ghosts share the same safe floor.
  const step=.5,round=v=>Math.round(v/step)*step,key=(x,z)=>Math.round(x/step)+','+Math.round(z/step);
  let sx=round(start.x),sz=round(start.z);
  if(!canWalk(sx,sz)){
    let best=Infinity;
    for(let dx=-1.5;dx<=1.5;dx+=step)for(let dz=-1.5;dz<=1.5;dz+=step){
      const x=sx+dx,z=sz+dz,d=dx*dx+dz*dz;
      if(d<best&&canWalk(x,z)){sx=x;sz=z;best=d;}
    }
    if(!isFinite(best))return [];
  }
  const heuristic=(x,z)=>Math.hypot(x-goal.x,z-goal.z);
  const heap=[];
  const push=item=>{
    heap.push(item);
    for(let i=heap.length-1;i>0;){
      const p=(i-1)>>1;if(heap[p].f<=heap[i].f)break;
      [heap[p],heap[i]]=[heap[i],heap[p]];i=p;
    }
  };
  const pop=()=>{
    const top=heap[0],last=heap.pop();
    if(heap.length){
      heap[0]=last;
      for(let i=0;;){
        const left=i*2+1,right=left+1;
        if(left>=heap.length)break;
        const small=right<heap.length&&heap[right].f<heap[left].f?right:left;
        if(heap[i].f<=heap[small].f)break;
        [heap[i],heap[small]]=[heap[small],heap[i]];i=small;
      }
    }
    return top;
  };
  const nodes=new Map(),startKey=key(sx,sz);
  const first={x:sx,z:sz,g:0,f:heuristic(sx,sz),parent:null};
  nodes.set(startKey,first);push({key:startKey,f:first.f,g:0});
  const closed=new Set();let last=null;
  while(heap.length&&closed.size<16000){
    const current=pop(),node=nodes.get(current.key);
    if(closed.has(current.key)||node.g!==current.g)continue;
    closed.add(current.key);
    if(heuristic(node.x,node.z)<reach){last=node;break;}
    for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){
      const x=node.x+dx,z=node.z+dz,k=key(x,z);
      if(closed.has(k)||!canWalk(x,z))continue;
      const g=node.g+step,prior=nodes.get(k);
      if(prior&&g>=prior.g)continue;
      const next={x,z,g,f:g+heuristic(x,z),parent:node};
      nodes.set(k,next);push({key:k,g,f:next.f});
    }
  }
  if(!last)return [];
  const result=[];for(let n=last;n;n=n.parent)result.push({x:n.x,z:n.z});
  return result.reverse();
}
function navigationTarget(){
  if(stage===1){
    const i=disturbed.findIndex(d=>!d.done);
    if(i>=0)return {key:'fix'+i,x:disturbed[i].x,z:disturbed[i].z,name:'6-1 교실 · '+disturbed[i].name};
    return {key:'dokkaebi',x:SCHOOL.dokkaebi.x,z:SCHOOL.dokkaebi.z,name:'6-1 교실 · 도깨비 봉인진'};
  }
  if(stage===2){
    if(maidenPhase==='approach')return {key:'science',x:SCHOOL.science.x,z:SCHOOL.science.z,name:'북쪽 날개 끝 · 과학실'};
    return {key:'maiden',x:maiden.x,z:maiden.z,name:'처녀귀신을 바라보기'};
  }
  if(stage===3)return {key:'maidenSeal',x:SCHOOL.science.x,z:-13.1,name:'과학실 · 보라색 봉인진'};
  if(stage===4)return {key:'report',x:SCHOOL.guard.x,z:SCHOOL.guard.z,name:'서쪽 연결동 · 관리실 귀환'};
  return null;
}
function setGuidePath(path){
  if(guidance.mesh){scene.remove(guidance.mesh);guidance.mesh.geometry.dispose();guidance.mesh.material.dispose();guidance.mesh=null;}
  guidance.points=path;
  if(path.length<2)return;
  // Thin floor-level line: a trail, not a wall or obstacle.
  const pts=path.map(p=>new THREE.Vector3(p.x,.075,p.z));
  const geom=new THREE.BufferGeometry().setFromPoints(pts);
  const line=new THREE.Line(geom,new THREE.LineDashedMaterial({color:0xf4c878,dashSize:.36,gapSize:.23,transparent:true,opacity:.82,depthWrite:false}));
  line.computeLineDistances();line.frustumCulled=false;scene.add(line);guidance.mesh=line;
}
function updateNavigation(dt,force=false){
  if(!started)return;
  // An explicit beginner tutorial only. After the first repaired anomaly,
  // the school must be explored using room names, missions and the minimap.
  const showTutorialTrail=stage===1&&fixes===0;
  ui.navigation.classList.toggle('hidden',!showTutorialTrail);
  if(!showTutorialTrail){
    if(guidance.mesh)setGuidePath([]);
    guidance.key='';
    return;
  }
  const target=navigationTarget();
  if(!target)return;
  guidance.clock+=dt;
  const changed=target.key!==guidance.key;
  const moved=Math.hypot(player.x-guidance.fromX,player.z-guidance.fromZ)>2.4;
  const targetMoved=Math.hypot(target.x-guidance.goalX,target.z-guidance.goalZ)>2;
  if(force||changed||(guidance.clock>2.8&&(moved||targetMoved))){
    guidance.key=target.key;guidance.clock=0;guidance.fromX=player.x;guidance.fromZ=player.z;
    guidance.goalX=target.x;guidance.goalZ=target.z;
    setGuidePath(routePlan(player,target,1.15));
  }
  const pts=guidance.points;
  let closest=0,closestD=Infinity;
  for(let i=0;i<pts.length;i++){
    const d=Math.hypot(pts[i].x-player.x,pts[i].z-player.z);
    if(d<closestD){closest=i;closestD=d;}
  }
  const upcoming=pts[Math.min(pts.length-1,closest+4)]||target;
  const dx=upcoming.x-player.x,dz=upcoming.z-player.z;
  const fwd=-Math.sin(viewYaw)*dx-Math.cos(viewYaw)*dz;
  const side=Math.cos(viewYaw)*dx-Math.sin(viewYaw)*dz;
  const angle=Math.atan2(side,fwd)*180/Math.PI;
  ui.navArrow.style.transform='rotate('+angle.toFixed(0)+'deg)';
  ui.navTitle.textContent=target.name;
  const destinationDist=Math.round(Math.hypot(target.x-player.x,target.z-player.z));
  ui.navRange.textContent=destinationDist<2?'첫 번째 물건 · 행동 버튼으로 조사':destinationDist+'m · 첫 조사까지 노란 길 안내';
}
function showLesson(title,text,seconds=9){
  ui.lessonTitle.textContent=title;ui.lessonText.textContent=text;
  ui.lesson.classList.remove('hidden');lessonTimer=seconds;
}
function placeFurniture(file,x,z,height,rot=0,boxSize=null){
  if(boxSize)furniture.push({x,z,hx:boxSize[0]/2,hz:boxSize[1]/2});
  const host=new THREE.Group();host.position.set(x,0,z);host.rotation.y=rot;scene.add(host);
  cube(host,0,.35,0,boxSize?boxSize[0]*.85:.5,.68,boxSize?boxSize[1]*.85:.5,materials.desk);
  loadTemplate(FURN+file).then(g=>{
    host.clear();const mesh=g.clone(true);normalize(mesh,height);host.add(mesh);
  }).catch(()=>{});return host;
}
function normalize(root,height){
  root.updateMatrixWorld(true);let b=new THREE.Box3().setFromObject(root),s=b.getSize(new THREE.Vector3());
  root.scale.multiplyScalar(height/(s.y||1));root.updateMatrixWorld(true);
  b=new THREE.Box3().setFromObject(root);const center=b.getCenter(new THREE.Vector3());
  root.position.x-=center.x;root.position.y-=b.min.y;root.position.z-=center.z;
}
function loadTemplate(url){
  if(!assetCache.has(url))assetCache.set(url,loader.loadAsync(url));
  return assetCache.get(url).then(g=>g.scene);
}
function addLabel(text,x,z,color=0xb9dfe9,angle=0){
  const c=document.createElement('canvas');c.width=512;c.height=96;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,512,96);ctx.font='bold 40px sans-serif';ctx.textAlign='center';
  ctx.fillStyle='#071019';ctx.fillText(text,258,59);ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillText(text,256,56);
  const texture=new THREE.CanvasTexture(c),p=new THREE.Mesh(new THREE.PlaneGeometry(4.2,.79),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  p.position.set(x,2.65,z);p.rotation.y=angle;scene.add(p);
}
function createMark(x,z,color){
  const holder=new THREE.Group();holder.position.set(x,.06,z);scene.add(holder);
  const m=new THREE.Mesh(new THREE.RingGeometry(.55,.69,36),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.9}));
  m.rotation.x=-Math.PI/2;holder.add(m);
  const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,0),new THREE.MeshBasicMaterial({color}));
  orb.position.y=.85;holder.add(orb);glowThings.push({holder,orb});
  return holder;
}
// Room metadata is shared by 3D construction and the minimap. North and south
// wings each have five rooms; the western connector contains five support rooms.
const NORTH_ROOMS=['6-1 교실','6-2 교실','음악실','미술실','과학실'];
const SOUTH_ROOMS=['5-1 교실','5-2 교실','컴퓨터실','방송실','가사실'];
const SPINE_ROOMS=['자료실','보건실','관리실','전기실','교무실'];
function windowWall(x,z,width=3.4){
  // A pane framed by non-overlapping sill, glass and lintel: no z-fighting.
  const d=.29;
  cube(scene,x,.55,z,width,1.10,d,materials.wall);
  cube(scene,x,2.77,z,width,.70,d,materials.wall);
  cube(scene,x,1.765,z,width-.12,1.29,.075,new THREE.MeshStandardMaterial({
    color:0x6a9ca9,transparent:true,opacity:.31,roughness:.2,metalness:.08,depthWrite:false,
    side:THREE.DoubleSide
  }));
  walls.push({x,z,hx:width/2,hz:d/2,transparent:true});
}
function courtyardFacade(z){
  // Windows overlook the inner courtyard between the two parallel school wings.
  let cursor=-15;
  for(const cx of SCHOOL.roomCenters){
    const begin=cx-1.7,width=begin-cursor;
    if(width>.01)wall(cursor+width/2,z,width,.29);
    windowWall(cx,z);
    cursor=cx+1.7;
  }
  const remaining=30-cursor;
  if(remaining>.01)wall(cursor+remaining/2,z,remaining,.29);
}
function ceilingFixture(x,z){
  const caseMesh=cube(scene,x,3.08,z,3.7,.10,.42,mat(0xb5bfc3));
  const lamp=cube(scene,x,3.013,z,3.28,.025,.24,new THREE.MeshBasicMaterial({color:0xd6e4ec}));
  caseMesh.userData.decorative=true;lamp.userData.decorative=true;
}
function classroomFurniture(cx,north,index){
  const roomZ=north?-15.25:15.25;
  const zs=north?[-16.7,-13.8]:[13.8,16.7];
  const specialty=(north&&index>1)||(!north&&index>1);
  for(const z of zs)for(const x of [cx-2.1,cx+1.85]){
    // Furniture stays away from the 2.7m door at z +-10.2.
    const prop=(specialty?'table.glb':'desk.glb');
    placeFurniture(prop,x,z,.78,0,[1.13,.66]);
  }
  if(north&&index===1||!north&&index===1)
    placeFurniture('bookcase-open.glb',cx-3.45,roomZ,1.75,Math.PI/2,[.55,.58]);
  if(north&&index===2){
    placeFurniture('bench.glb',cx,roomZ,1.05,0,[1.35,.42]);
  }
  if(north&&index===4){
    // Science lab: separate prep workstation and apparatus shelf.
    placeFurniture('bookcase-open.glb',cx+3.35,-17.4,1.8,Math.PI/2,[.55,.54]);
  }
  if(!north&&index===2){
    for(const x of [cx-2.1,cx+1.85]){
      const monitor=placeFurniture('computer-screen.glb',x,13.8,.5,0);
      monitor.position.y=.80;
    }
  }
  const boardZ=north?-19.72:19.72;
  cube(scene,cx,1.95,boardZ,5.4,1.38,.07,mat(specialty?0x344956:0x284a40));
}
function createRoom(){
  // ㄷ floorplan with WEST connector (management office) and EAST-facing
  // upper/lower wings; the rectangular inner court is outdoors, not a shortcut.
  ground(-21.5,0,13,40,0x46535b);
  ground(7.5,-13.5,45,13,0x495361);
  ground(7.5,13.5,45,13,0x4e555f);
  // Visually accessible courtyard: lower ground is deliberately non-walkable.
  const courtyard=cube(scene,7.5,-.35,0,44.5,.19,13.8,mat(0x263a30));
  courtyard.userData.decorative=true;
  for(const x of [-10,-1,8,17,26]){
    const bed=cube(scene,x,-.205,0,2.7,.08,1.65,mat(0x425e46));
    bed.userData.decorative=true;
    const trunk=cube(scene,x,-.03,0,.20,.62,.2,mat(0x5d5546));
    trunk.userData.decorative=true;
    const leaves=new THREE.Mesh(new THREE.IcosahedronGeometry(.8,1),mat(0x3b665b));
    leaves.position.set(x,.88,0);scene.add(leaves);
  }
  // Outer perimeter walls.
  wall(1,-20,58,.29);wall(1,20,58,.29);
  wall(-28,0,.29,40);
  wall(30,-13.5,.29,13);wall(30,13.5,.29,13);
  wall(-15,0,.29,14);
  courtyardFacade(-7);courtyardFacade(7);
  // Five equal-size rooms along each wing. Every doorway faces its own hallway.
  for(let i=0;i<5;i++){
    const cx=SCHOOL.roomCenters[i];
    const side=3.15,off=2.925;
    for(const z of [-10.2,10.2]){
      wall(cx-off,z,side,.29);
      wall(cx+off,z,side,.29);
    }
    addLabel(NORTH_ROOMS[i],cx,-9.94,0xb9dfe9);
    addLabel(SOUTH_ROOMS[i],cx,9.94,0xb9dfe9,Math.PI);
    classroomFurniture(cx,true,i);
    classroomFurniture(cx,false,i);
    if(i<4){
      const divider=-6+9*i;
      wall(divider,-15.1,.29,9.8);
      wall(divider,15.1,.29,9.8);
    }
    const doorN=createMark(cx,-10.03,0x659aab),doorS=createMark(cx,10.03,0x659aab);
    for(const marker of [doorN,doorS]){
      marker.scale.setScalar(.25);marker.userData.decorative=true;
    }
  }
  // Connecting spine: left-hand office row; through-hall on the right.
  // The guard room sits precisely at the middle of this connecting corridor.
  for(let i=0;i<5;i++){
    const cz=-16+8*i;
    // 2.7m opening into the hall (not a solid wall behind the doorway).
    wall(-20.5,cz-2.675,.29,2.65);
    wall(-20.5,cz+2.675,.29,2.65);
    addLabel(SPINE_ROOMS[i],-20.19,cz,i===2?0xffd09a:0xa8c6d1,Math.PI/2);
    const entrance=createMark(-20.36,cz,i===2?0xf8bd75:0x75afba);
    entrance.scale.setScalar(.28);entrance.userData.decorative=true;
    if(i!==2){
      placeFurniture('bookcase-open.glb',-26.7,cz-1.6,1.72,Math.PI/2,[.55,.55]);
      placeFurniture('table.glb',-24.8,cz+2,.77,0,[1.15,.64]);
    }
  }
  for(const z of [-12,-4,4,12])wall(-24.25,z,7.5,.29);
  // Guard office focal point (desk faces connecting hallway, not its rear wall).
  placeFurniture('table.glb',-25.45,.9,.83,Math.PI/2,[1.24,.64]);
  const monitor=placeFurniture('computer-screen.glb',-25.45,.9,.53,Math.PI/2);
  monitor.position.y=.78;
  placeFurniture('chair-desk.glb',-26.25,.9,.75,-Math.PI/2);
  // Long, readable corridor fixtures, plus contrasting color on the north wing.
  for(const x of [-11,-3,5,13,21,28]){
    ceilingFixture(x,-8.5);ceilingFixture(x,8.5);
  }
  // Color-coded corridor flooring provides orientation without an always-on
  // quest trail. Keep the stripes 2mm above the floor to avoid z-fighting.
  const blueLine=new THREE.MeshBasicMaterial({color:0x5485ae});
  const amberLine=new THREE.MeshBasicMaterial({color:0xb48c62});
  cube(scene,7.5,.013,-8.83,44,.022,.17,blueLine);
  cube(scene,7.5,.013,8.83,44,.022,.17,amberLine);
  cube(scene,-17.45,.013,0,.17,.022,38.2,mat(0x9baeb0));
  for(const z of [-17,-10,-3,4,11,18])ceilingFixture(-17.6,z);
  // Courtyard benches are scenery, not walkable navigation cells.
  const benches=[-5,12,22];
  for(const x of benches){
    cube(scene,x,.28,2.8,2.4,.15,.55,mat(0x826b51));
    cube(scene,x,.07,2.65,2.15,.35,.25,mat(0x474b54));
  }
}

createRoom();

function repairCharacterSkin(root){
  // Several shared NPCs have near-black Skin material defaults; correct the material,
  // not just the scene lighting, to prevent the familiar "black face" defect.
  root.traverse(node=>{
    if(!node.isMesh)return;
    const fix=m=>{
      if(!m||!(/skin/i.test(m.name||''))||!m.color)return m;
      const copy=m.clone(),c=copy.color;
      if(Math.max(c.r,c.g,c.b)<.28)copy.color.set(0xe8b99a);
      return copy;
    };
    node.material=Array.isArray(node.material)?node.material.map(fix):fix(node.material);
  });
}
function humanoidFallback(){
  const group=new THREE.Group();cube(group,0,.94,0,.48,.9,.28,mat(0x6b8295));
  const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),mat(0xc7ad9b));head.position.y=1.64;group.add(head);
  cube(group,-.15,.37,0,.14,.72,.16,mat(0x263544));
  cube(group,.15,.37,0,.14,.72,.16,mat(0x263544));return group;
}
player.model=humanoidFallback();player.root.add(player.model);
loader.loadAsync(MAN).then(gltf=>{
  const model=cloneSkeleton(gltf.scene);repairCharacterSkin(model);normalize(model,1.7);player.root.remove(player.model);player.model=model;player.root.add(model);
  const clips=gltf.animations||[],idle=clips.find(c=>/idle|stand/i.test(c.name))||clips[0],walk=clips.find(c=>/walk/i.test(c.name));
  if(idle||walk){
    const mixer=new THREE.AnimationMixer(model);
    const stripMotion=c=>c&&new THREE.AnimationClip(c.name,c.duration,c.tracks.filter(t=>!/(?:hips|root|armature)\.position/i.test(t.name)));
    const ia=idle?mixer.clipAction(stripMotion(idle)):null,wa=walk?mixer.clipAction(stripMotion(walk)):null;
    if(ia)ia.play();if(wa){wa.play();wa.setEffectiveWeight(0);}
    player.animation={mixer,idle:ia,walk:wa};mixers.push(mixer);
  }
}).catch(()=>{});
function makeGhostFallback(){
  const g=new THREE.Group();
  const sheet=new THREE.Mesh(new THREE.ConeGeometry(.64,2.1,18,1,true),new THREE.MeshStandardMaterial({color:0xe3efff,transparent:true,opacity:.68,side:THREE.DoubleSide,emissive:0x80a4be,emissiveIntensity:.45}));
  sheet.position.y=1.15;g.add(sheet);
  const h=new THREE.Mesh(new THREE.SphereGeometry(.33,14,12),new THREE.MeshBasicMaterial({color:0xb3c7cf}));h.position.y=2.22;g.add(h);return g;
}
const ghostAura=new THREE.PointLight(0xd6e4ff,8,7,2);maiden.root.add(ghostAura);ghostAura.position.y=1.7;
let ghostModel=makeGhostFallback();maiden.root.add(ghostModel);
loader.loadAsync(MONSTER).then(gltf=>{
  maiden.root.remove(ghostModel);const root=cloneSkeleton(gltf.scene);normalize(root,2.3);
  root.traverse(node=>{if(node.isMesh){node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();const ms=Array.isArray(node.material)?node.material:[node.material];for(const m of ms){m.transparent=true;m.opacity=.88;m.emissive=new THREE.Color(0x284a73);m.emissiveIntensity=.8;}}});
  ghostModel=root;maiden.root.add(root);
  const clip=(gltf.animations||[]).find(c=>/idle|float/i.test(c.name))||(gltf.animations||[])[0];
  if(clip){const mix=new THREE.AnimationMixer(root);mix.clipAction(clip).play();mixers.push(mix);}
}).catch(()=>{});
maiden.root.visible=false;
const fixPositions=[[-12.7,-12.85],[-8.3,-14.2],[-11.3,-18.1]];
const fixLabels=['거꾸로 놓인 화분','공중에 뜬 책','움직이는 시계'];
for(let i=0;i<3;i++){
  const [x,z]=fixPositions[i],marker=createMark(x,z,0xf3b96f);
  const object=new THREE.Group();object.position.set(x,1.15,z);scene.add(object);
  if(i===0){
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(.3,.19,.47,10),mat(0xac6d4f));pot.rotation.z=2.1;object.add(pot);
    cube(object,.18,.35,0,.15,.44,.14,mat(0x69917a));
  }else if(i===1){
    const book=cube(object,0,0,0,.64,.09,.45,mat(0xc1c7df));book.rotation.z=.32;
  }else{
    const clock=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.07,24),mat(0xd4cba6));
    clock.rotation.x=Math.PI/2;object.add(clock);
    cube(object,0,0,.055,.07,.45,.035,mat(0x4a4150));
  }
  disturbed.push({x,z,object,marker,done:false,name:fixLabels[i],phase:i*2.1});
}
const trickCircle=createMark(SCHOOL.dokkaebi.x,SCHOOL.dokkaebi.z,0xf5bd72);trickCircle.visible=false;
const maidenCircle=createMark(SCHOOL.science.x,-13.1,0xc5a1f8);maidenCircle.visible=false;
const exitCircle=createMark(SCHOOL.guard.x,SCHOOL.guard.z,0x82dabe);exitCircle.visible=false;

// Additional anomalies from 괴담 야간경비, each with a distinct physical counter-rule.
function ghostShape(x,z,color,size=1.7){
  const root=new THREE.Group();root.position.set(x,0,z);scene.add(root);
  const body=new THREE.Mesh(new THREE.ConeGeometry(.48,size,14,1),new THREE.MeshStandardMaterial({
    color,transparent:true,opacity:.82,emissive:color,emissiveIntensity:.18,
    side:THREE.DoubleSide
  }));
  body.position.y=size*.55;root.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.30,18,12),new THREE.MeshStandardMaterial({
    color:0xdce5df,roughness:.8
  }));head.position.y=size+.16;root.add(head);
  return {root,body,head};
}
function dressGhost(url,root,height,tint,blend=.26){
  loader.loadAsync(url).then(gltf=>{
    const model=cloneSkeleton(gltf.scene);normalize(model,height);
    model.traverse(node=>{
      if(!node.isMesh)return;
      const tintMat=m=>{
        const copy=m.clone();
        if(copy.color)copy.color.lerp(new THREE.Color(tint),blend);
        if(copy.emissive)copy.emissive=new THREE.Color(tint);
        if(copy.emissiveIntensity!==undefined)copy.emissiveIntensity=.24;
        return copy;
      };
      node.material=Array.isArray(node.material)?node.material.map(tintMat):tintMat(node.material);
    });
    root.clear();root.add(model);
    const clip=(gltf.animations||[]).find(c=>/idle|walk|float/i.test(c.name))||gltf.animations?.[0];
    if(clip){const mixer=new THREE.AnimationMixer(model);mixer.clipAction(clip).play();mixers.push(mixer);}
  }).catch(()=>{}); // Visible fallback remains if asset isn't reachable.
}
const yuki=ghostShape(25.5,16.95,0xb6edff,1.75);
const egg=ghostShape(7.5,-17.35,0x8e9292,1.7);
const reaper=ghostShape(-25.0,8.0,0x75658d,1.9);
const wolfFallback=new THREE.Group();encounter.wolf.root.add(wolfFallback);
cube(wolfFallback,0,.75,0,.62,.73,1.05,mat(0x61535a));
for(const x of [-.22,.22])for(const z of [-.35,.35])cube(wolfFallback,x,.26,z,.20,.50,.19,mat(0x443c46));
cube(wolfFallback,0,1.04,-.59,.50,.44,.45,mat(0x75666c));
dressGhost('../../assets/game/npcs/glTF/Casual_Female.gltf',yuki.root,1.85,0xa9efff,.70);
dressGhost('../../assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost-skull.glb',reaper.root,2.18,0x75648e,.45);
loader.loadAsync('../../assets/game/cube world/Animals/glTF/Wolf.gltf').then(gltf=>{
  const model=cloneSkeleton(gltf.scene);normalize(model,1.08);
  encounter.wolf.root.clear();encounter.wolf.root.add(model);
  const clip=(gltf.animations||[]).find(c=>/walk|run/i.test(c.name))||gltf.animations?.[0];
  if(clip){const mixer=new THREE.AnimationMixer(model);mixer.clipAction(clip).play();mixers.push(mixer);}
}).catch(()=>{});
for(const [x,z,label] of [
  [23.1,13.0,'난방 배관'],[27.7,15.15,'창가 히터'],[23.7,18.0,'온도 조절기']
]){
  const m=createMark(x,z,0x7bd9f5);
  encounter.heatNodes.push({x,z,label,marker:m,done:false});
}
const coldCircle=createMark(25.5,13.1,0x79e7ee);
const eggCircle=createMark(7.5,-13.1,0xd2d8dd);
const reaperCircle=createMark(-25.3,8,0xaa8ef2);
const wolfSpeaker=createMark(-7.5,8.55,0xf0c27b);
const wolfCircle=createMark(-10.5,14.0,0xf58e69);
// The door occupies the existing open doorway without becoming a permanent collision wall.
const doorHinge=new THREE.Group();doorHinge.position.set(-20.49,0,6.75);scene.add(doorHinge);
cube(doorHinge,0,1.24,1.16,.11,2.48,2.3,mat(0x586377));
doorHinge.rotation.y=-1.30;
encounter.doorVisual=doorHinge;
const eggLocation={x:7.5,z:-17.35},bellDoor={x:-20.35,z:8},wolfTrap={x:-10.5,z:14};
function presentEncounterModels(){
  yuki.root.visible=stage===4||stage===5;
  egg.root.visible=stage===6||stage===7;
  reaper.root.visible=stage===8||stage===9;
  encounter.wolf.root.visible=stage===10||stage===11;
  coldCircle.visible=stage===5;
  eggCircle.visible=stage===7;
  reaperCircle.visible=stage===9;
  wolfSpeaker.visible=stage===10;
  wolfCircle.visible=stage===11;
  encounter.heatNodes.forEach(h=>h.marker.visible=stage===4&&!h.done);
  doorHinge.rotation.y=encounter.doorClosed?0:-1.30;
}
presentEncounterModels();

function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function showToast(message){ui.toast.textContent=message;ui.toast.classList.add('show');toastSeconds=3.5;}
function sfx(file,volume=.27){
  try{const a=new Audio(AUDIO+file);a.volume=volume;a.play().catch(()=>{});}catch(_){}
}
const bgm=new Audio(AUDIO+'amb_scary_night.mp3');bgm.loop=true;bgm.volume=.09;
function setStage(next){
  stage=next;
  trickCircle.visible=stage===1&&fixes===3;
  maidenCircle.visible=stage===3;
  exitCircle.visible=stage===12;
  maiden.root.visible=stage===2&&maidenPhase!=='approach';
  if(stage===2){
    maiden.x=SCHOOL.maidenSpawn.x;maiden.z=SCHOOL.maidenSpawn.z;
    maiden.charge=0;ghostNav=null;maidenPhase='approach';ghostWaiting=0;
    showLesson('두 번째 괴이 · 처녀귀신','북쪽 날개 맨 끝 과학실에서 직접 바라보면 멈춥니다. 처음에는 안전하게 연습해요.',12);
  }
  if(stage===3){
    maiden.root.visible=false;
    showLesson('관찰 성공!','과학실의 보라색 봉인진을 찾아 봉인하세요.',9);
  }
  if(stage===4){
    encounter.cold=0;encounter.frost=0;
    showLesson('세 번째 괴이 · 유키온나','남쪽 날개 맨 끝 가사실의 차가운 배관·히터·온도계를 모두 복구하세요. 오래 있으면 얼어붙어요.',15);
    sfx('sfx_school_alarm_bell.mp3',.13);
  }
  if(stage===5){
    showLesson('냉기 해결!','가사실에 생긴 하늘색 봉인진으로 유키온나를 봉인하세요.',9);
  }
  if(stage===6){
    encounter.eggCharge=0;encounter.eggFear=0;
    showLesson('네 번째 괴이 · 달걀귀신','북쪽 음악실에서 달걀귀신에게 등을 돌리고 4초 버텨요. 처녀귀신과는 정반대!',15);
  }
  if(stage===7)showLesson('달걀귀신 물러남','음악실의 흰색 봉인진을 사용하세요.',9);
  if(stage===8){
    encounter.bellCount=0;encounter.bellClock=1;encounter.bellWindow=0;encounter.doorClosed=false;
    showLesson('다섯 번째 괴이 · 저승사자','서쪽 연결동 전기실 문에 다가가세요. 종이 세 번 울린 직후 문을 닫아야 해요.',15);
  }
  if(stage===9)showLesson('저승사자 퇴각','전기실 안쪽의 보랏빛 봉인진을 확인하세요.',9);
  if(stage===10){
    const w=encounter.wolf;w.x=-1.5;w.z=16.8;w.nav=null;w.grace=7;w.lureTime=0;w.soundClock=0;w.ready=false;w.active=false;
    showLesson('마지막 괴이 · 늑대인간','남쪽 복도 스피커를 찾아 소리를 내세요. 늑대가 함정으로 뛰어들면 봉인할 수 있어요.',15);
    sfx('sfx_wolf_howl.mp3',.22);
  }
  if(stage===11)showLesson('소리 유인 시작!','늑대가 5-1 교실의 붉은 함정으로 이동해요. 따라가서 들어온 순간 봉인 버튼을 누르세요.',14);
  if(stage===12){
    showLesson('여섯 괴이 퇴마 성공!','관리실로 돌아가 보고하면 이번 사건이 끝나요.',14);
    showToast('모든 괴이를 봉인했어요. 서쪽 연결동 관리실로 돌아가세요.');
  }
  presentEncounterModels();updateNavigation(0,true);updateHud();
}
function nearAction(){
  if(stage===1){
    for(let i=0;i<disturbed.length;i++){const o=disturbed[i];if(!o.done&&dist(o,player)<1.95)return{type:'fix',i,text:o.name+' 바로잡기'};}
    if(fixes===3&&dist(player,SCHOOL.dokkaebi)<2.15)return{type:'trick',text:'도깨비 봉인하기'};
  }
  if(stage===3&&dist(player,{x:SCHOOL.science.x,z:-13.1})<2.2)return{type:'maiden',text:'처녀귀신 봉인하기'};
  if(stage===4){
    for(let i=0;i<encounter.heatNodes.length;i++){
      const o=encounter.heatNodes[i];
      if(!o.done&&dist(player,o)<2.0)return{type:'heater',i,text:o.label+' 복구하기'};
    }
  }
  if(stage===5&&dist(player,{x:25.5,z:13.1})<2.2)return{type:'yuki',text:'유키온나 봉인하기'};
  if(stage===7&&dist(player,{x:7.5,z:-13.1})<2.2)return{type:'eggSeal',text:'달걀귀신 봉인하기'};
  if(stage===8&&dist(player,bellDoor)<2.7&&encounter.bellCount>=3&&encounter.bellWindow>0)
    return{type:'closeDoor',text:'세 번째 종! 문 닫기 [E]'};
  if(stage===9&&dist(player,{x:-25.3,z:8})<2.2)return{type:'reaperSeal',text:'저승사자 봉인하기'};
  if(stage===10&&dist(player,{x:-7.5,z:8.55})<2.25)return{type:'speaker',text:'유인 스피커 켜기'};
  if(stage===11&&encounter.wolf.ready&&dist(player,wolfTrap)<2.7)return{type:'wolfSeal',text:'늑대 함정 봉인하기'};
  if(stage===12&&dist(player,SCHOOL.guard)<2.3)return{type:'report',text:'퇴마 보고서 제출'};
  return null;
}
function act(){
  if(!started||paused||ended)return;
  const item=nearAction();if(!item){showToast('주변에 지금 조작할 수 있는 물건이 없어요.');return;}
  if(item.type==='fix'){
    const obj=disturbed[item.i];obj.done=true;obj.object.visible=false;obj.marker.visible=false;fixes++;sfx('sfx_child_giggle.mp3',.13);
    showToast('이상현상을 바로잡았어요 · '+fixes+'/3');
    if(fixes===1){
      showLesson('첫 조사 성공 · 튜토리얼 완료','이제 안내선 없이 미니맵의 점과 교실 이름으로 탐색하세요.',12);
      updateNavigation(0,true);
    }
    if(fixes===3){trickCircle.visible=true;showToast('세 장난을 해결했어요. 교실 중앙의 봉인진을 이용하세요.');}
  }else if(item.type==='trick'){sfx('sfx_school_alarm_bell.mp3',.18);setStage(2);}
  else if(item.type==='maiden'){sfx('sfx_school_alarm_bell.mp3',.18);setStage(4);}
  else if(item.type==='heater'){
    const o=encounter.heatNodes[item.i];o.done=true;o.marker.visible=false;
    encounter.cold++;encounter.frost=Math.max(0,encounter.frost-1.7);
    showToast(o.label+' 복구 완료 · '+encounter.cold+'/3');sfx('sfx_school_alarm_bell.mp3',.10);
    if(encounter.cold>=3)setStage(5);
  }else if(item.type==='yuki'){sfx('sfx_school_alarm_bell.mp3',.16);setStage(6);}
  else if(item.type==='eggSeal'){sfx('sfx_school_alarm_bell.mp3',.16);setStage(8);}
  else if(item.type==='closeDoor'){
    encounter.doorClosed=true;encounter.bellWindow=0;encounter.doorVisual.rotation.y=0;
    sfx('sfx_school_alarm_bell.mp3',.23);showToast('세 번째 종에 맞춰 문을 닫았어요!');
    setStage(9);
  }else if(item.type==='reaperSeal'){sfx('sfx_school_alarm_bell.mp3',.16);setStage(10);}
  else if(item.type==='speaker'){
    const w=encounter.wolf;w.lureTime=26;w.soundClock=0;w.nav=null;w.ready=false;w.active=true;
    sfx('sfx_school_alarm_bell.mp3',.28);sfx('sfx_wolf_howl.mp3',.18);setStage(11);
  }else if(item.type==='wolfSeal'){sfx('sfx_school_alarm_bell.mp3',.20);setStage(12);}
  else if(item.type==='report')finish(true);
}
function finish(ok){
  ended=true;started=false;bgm.pause();const score=ok?Math.max(350,2400-Math.round(elapsed)*1.3-(3-hp)*125):0;
  if(ok)ui.progress.style.width='100%';
  ui.endTitle.textContent=ok?'퇴마 성공 · 학교의 평화를 되찾았어요!':'퇴마 실패 · 학교에서 쫓겨났어요';
  ui.endText.textContent=ok?'학교의 여섯 괴이를 모두 봉인했습니다. 소요 시간 '+Math.floor(elapsed/60)+'분 '+Math.floor(elapsed%60)+'초.':'생명이 모두 소진됐어요. '+(lastMistake||'각 괴이는 대응 방법이 달라요.')+' 다시 시작하면 괴이별 규칙을 활용해 보세요.';
  ui.end.classList.remove('hidden');
  window.KidscadeGame?.result?.({scope:'mission',status:ok?'completed':'failed',outcome:ok?'clear':'fail',score,cleared:ok,timeSeconds:Math.round(elapsed)});
}
function reset(){
  fixes=0;hp=3;power=100;flashOn=true;elapsed=0;stage=1;ended=false;paused=false;started=true;
  viewYaw=-Math.PI/2;player.x=SCHOOL.guard.x;player.z=SCHOOL.guard.z;
  player.yaw=Math.PI/2;player.root.rotation.y=player.yaw;
  maiden.attacks=0;maiden.charge=0;invulnerable=0;ghostWaiting=0;
  maidenPhase='approach';ghostNav=null;gazeLocked=false;
  guidance.key='';guidance.points=[];lastMistake='';tutorialCount=0;
  disturbed.forEach(o=>{o.done=false;o.object.visible=true;o.marker.visible=true;});
  encounter.heatNodes.forEach(o=>{o.done=false;o.marker.visible=false;});
  encounter.cold=0;encounter.frost=0;encounter.eggCharge=0;encounter.eggFear=0;
  encounter.bellCount=0;encounter.bellClock=0;encounter.bellWindow=0;encounter.doorClosed=false;
  encounter.wolf.x=-1.5;encounter.wolf.z=16.8;encounter.wolf.nav=null;
  encounter.wolf.ready=false;encounter.wolf.active=false;encounter.wolf.lureTime=0;encounter.wolf.grace=5;encounter.wolf.soundClock=0;
  trickCircle.visible=false;maidenCircle.visible=false;exitCircle.visible=false;maiden.root.visible=false;
  presentEncounterModels();
  ui.intro.classList.add('hidden');ui.end.classList.add('hidden');ui.help.classList.add('hidden');
  bgm.currentTime=0;bgm.play().catch(()=>{});sfx('sfx_school_alarm_bell.mp3',.12);
  window.KidscadeGame?.start?.({mode:'prototype',ghosts:['dokkaebi','maiden','yuki','egg','reaper','wolf']});
  showLesson('첫 임무 · 6-1 교실','ㄷ자 학교 북쪽 날개로 이동하세요. 첫 번째 조사까지만 노란 길이 나오고 이후에는 직접 탐험합니다.',16);
  showToast('연결동 관리실에서 출발합니다. 북쪽 6-1 교실을 조사하세요.');
  updateHud();updateNavigation(0,true);
}
function updateHud(){
  const titles={
    1:'① 도깨비 · 6-1 교실',2:'② 처녀귀신 · 과학실',3:'② 처녀귀신 봉인',
    4:'③ 유키온나 · 남쪽 가사실',5:'③ 유키온나 봉인',
    6:'④ 달걀귀신 · 북쪽 음악실',7:'④ 달걀귀신 봉인',
    8:'⑤ 저승사자 · 연결동 전기실',9:'⑤ 저승사자 봉인',
    10:'⑥ 늑대인간 · 남쪽 복도',11:'⑥ 늑대인간 봉인',12:'퇴마 완료 · 관리실 보고'
  };
  const details={
    1:fixes===3?'6-1 교실 중앙의 주황 봉인진을 작동하세요.':'6-1 교실의 이상한 물건을 바로잡으세요. ('+fixes+'/3)',
    2:maidenPhase==='approach'?'북쪽 날개 끝 과학실로 이동하세요. 처음은 안전한 연습입니다.':
      maidenPhase==='practice'?'바라보면 멈춰요! 화면 중앙에 2초간 바라보세요.':'처녀귀신을 화면 가운데 두고 4초 이상 바라보세요.',
    3:'과학실의 보라색 봉인진을 작동하세요.',
    4:'가사실 난방장치를 복구하세요. 차가운 기운을 오래 견디지 마세요. ('+encounter.cold+'/3)',
    5:'가사실 안 하늘색 봉인진을 작동하세요.',
    6:'음악실의 얼굴 없는 귀신에게 등을 돌리고 4초를 버티세요. 절대 빤히 보지 마세요.',
    7:'음악실의 흰색 봉인진을 작동하세요.',
    8:encounter.bellCount===0?'전기실 문 근처에 가면 저승사자의 종이 울립니다.':
      encounter.bellCount<3?'종소리를 기다리세요. '+encounter.bellCount+'/3':
      encounter.bellWindow>0?'세 번째 종이 울렸어요! E를 눌러 문을 닫으세요!':'종소리 확인 중',
    9:'전기실 안의 보랏빛 봉인진을 작동하세요.',
    10:'남쪽 복도에서 노란 스피커를 찾아 울리세요. 늑대인간은 소리를 따라갑니다.',
    11:encounter.wolf.ready?'늑대인간이 붉은 함정에 도착했어요. 다가가 봉인하세요!':
      '5-1 교실의 붉은 함정으로 이동하세요. 늑대가 소리를 따라가고 있어요.',
    12:'여섯 괴이를 봉인했어요! 서쪽 연결동 중앙 관리실에서 보고서를 제출하세요.'
  };
  ui.mission.textContent=titles[stage]||stageNames[stage];
  ui.detail.textContent=details[stage]||'';
  let partial=0;
  if(stage===1)partial=fixes/3;
  else if(stage===2)partial=maiden.charge/(maidenPhase==='practice'?1.8:4.2);
  else if(stage===4)partial=encounter.cold/3;
  else if(stage===6)partial=encounter.eggCharge/4;
  else if(stage===8)partial=encounter.bellCount/3;
  else if(stage===11)partial=encounter.wolf.ready?1:.35;
  const done=(stage-1+Math.min(1,partial))/12;
  ui.progress.style.width=(Math.min(1,done)*100)+'%';
  ui.health.textContent='♥'.repeat(Math.max(0,hp))+'♡'.repeat(3-Math.max(0,hp));
  ui.battery.textContent=Math.floor(power)+'%';
  ui.flash.textContent=flashOn?'손전등 켜짐 [F]':'손전등 꺼짐 [F]';
  const ghostLesson=stage===2&&maidenPhase!=='approach';
  const threat=[4,6,8,11].includes(stage);
  ui.lesson.classList.toggle('encounter',ghostLesson||threat);
  ui.gaze.classList.toggle('hidden',!ghostLesson&&!threat);
  ui.reticle.classList.toggle('hidden',!ghostLesson&&stage!==6);
  ui.reticle.classList.toggle('active',ghostLesson||stage===6);
  ui.reticle.classList.toggle('locked',ghostLesson&&gazeLocked);
  let gauge=0,label='';
  if(ghostLesson){
    label=maidenPhase==='practice'?'연습 · 유령을 화면 가운데 바라보세요':
      gazeLocked?'관찰 성공 · 계속 바라보세요':'유령을 다시 화면 가운데 맞추세요';
    gauge=maiden.charge/(maidenPhase==='practice'?1.8:4.2);
  }else if(stage===4){
    label='냉기 위험 · 난방장치를 수리하면 감소';gauge=encounter.frost/12;
  }else if(stage===6){
    label='달걀귀신 등 돌리기 · '+Math.floor(encounter.eggCharge/4*100)+'%';
    gauge=encounter.eggCharge/4;
  }else if(stage===8){
    label=encounter.bellWindow>0?'세 번째 종! 문을 닫으세요!':'종소리 '+encounter.bellCount+'/3';
    gauge=encounter.bellWindow>0?encounter.bellWindow/5:encounter.bellCount/3;
  }else if(stage===11){
    label=encounter.wolf.ready?'늑대 함정 포획! 서둘러 봉인':'늑대 유인 · '+Math.ceil(encounter.wolf.lureTime)+'초 남음';
    gauge=encounter.wolf.lureTime/26;
  }
  ui.gazeLabel.textContent=label;
  ui.gazeValue.style.width=(Math.max(0,Math.min(1,gauge))*100)+'%';
  const action=nearAction();ui.action.disabled=!action;
  ui.actionText.textContent=action?action.text:'가까이에서 조사 [E]';
}
// The ghost is not visible through a solid classroom wall.
function segmentHitsRect(ax,az,bx,bz,rect,margin=.012){
  const dx=bx-ax,dz=bz-az;
  let enter=0,exit=1;
  for(const [a,v,lo,hi] of [[ax,dx,rect.x-rect.hx-margin,rect.x+rect.hx+margin],[az,dz,rect.z-rect.hz-margin,rect.z+rect.hz+margin]]){
    if(Math.abs(v)<1e-8){if(a<lo||a>hi)return false;continue;}
    let t0=(lo-a)/v,t1=(hi-a)/v;
    if(t0>t1){const tmp=t0;t0=t1;t1=tmp;}
    enter=Math.max(enter,t0);exit=Math.min(exit,t1);
    if(enter>exit)return false;
  }
  return exit>.015&&enter<.985;
}
function clearGhostSight(ax,az,bx,bz){
  return !walls.some(rect=>!rect.transparent&&segmentHitsRect(ax,az,bx,bz,rect));
}
function gazingAtGhost(){
  const gx=maiden.x-player.x,gz=maiden.z-player.z,d=Math.hypot(gx,gz);
  if(d<.01||d>=12)return false;
  forward.set(-Math.sin(viewYaw),0,-Math.cos(viewYaw));
  return (forward.x*gx+forward.z*gz)/d>.92&&clearGhostSight(player.x,player.z,maiden.x,maiden.z);
}
function advanceGhostToward(target,dt){
  if(!ghostNav||ghostNav.points.length===0||
     Math.hypot(ghostNav.toX-target.x,ghostNav.toZ-target.z)>1.5||
     ghostNav.age>4.5){
    ghostNav={points:routePlan(maiden,target,.65),toX:target.x,toZ:target.z,age:0};
  }
  ghostNav.age+=dt;
  while(ghostNav.points.length>1&&dist(ghostNav.points[0],maiden)<.14)ghostNav.points.shift();
  const waypoint=ghostNav.points[0]||target;
  const dx=waypoint.x-maiden.x,dz=waypoint.z-maiden.z,d=Math.hypot(dx,dz);
  if(d<=.08)return;
  const speed=Math.min(d,maiden.speed*dt);
  const x=maiden.x+dx/d*speed,z=maiden.z+dz/d*speed;
  if(canWalk(x,z)){maiden.x=x;maiden.z=z;}
  else ghostNav=null;
}
function beginMaidenPractice(){
  maidenPhase='practice';maiden.root.visible=true;maiden.charge=0;ghostWaiting=0;
  showLesson('첫 만남 · 안전한 연습','흰 유령은 눈을 돌리면 다가오고 바라보면 멈춰요. 화면 중앙에 맞춰 보세요. 지금은 공격하지 않아요.',16);
  showToast('처녀귀신의 움직임을 관찰하세요. 지금은 연습 시간입니다.');
  sfx('amb_scary_music_box.mp3',.17);
  updateNavigation(0,true);
}
function beginMaidenHunt(){
  maidenPhase='hunt';maiden.charge=0;ghostWaiting=6;ghostNav=null;
  showLesson('관찰 성공! 이제 실제 퇴마','잘했어요! 시선을 유지하면 유령이 멈춥니다. 이번에는 4초 이상 바라봐서 물러나게 하세요.',13);
  showToast('연습 완료! 6초 뒤 처녀귀신이 움직입니다.');
  sfx('sfx_horror_sting_01.mp3',.11);
}
function updateGhost(dt){
  if(stage!==2){gazeLocked=false;return;}
  if(maidenPhase==='approach'){
    gazeLocked=false;
    if(player.x>21&&player.z< -10.45)beginMaidenPractice();
    else return;
  }
  maiden.root.position.set(maiden.x,.12+Math.sin(elapsed*2.8)*.12,maiden.z);
  maiden.root.rotation.y=Math.atan2(player.x-maiden.x,player.z-maiden.z);
  gazeLocked=gazingAtGhost();
  if(maidenPhase==='practice'){
    // She slowly approaches when ignored, then freezes when watched; this is always nonlethal.
    if(!gazeLocked&&dist(maiden,player)>3.3)advanceGhostToward(player,dt*.55);
    maiden.charge=Math.max(0,Math.min(1.8,maiden.charge+dt*(gazeLocked?1:-.1)));
    if(maiden.charge>=1.8)beginMaidenHunt();
    return;
  }
  if(ghostWaiting>0){ghostWaiting=Math.max(0,ghostWaiting-dt);return;}
  if(gazeLocked){
    maiden.charge=Math.min(4.2,maiden.charge+dt);
    if(maiden.charge>=4.2){setStage(3);return;}
  }else{
    maiden.charge=Math.max(0,maiden.charge-dt*.11);
    // Both arms are connected ONLY through the western corridor.
    // Shared A* prevents ghosts from cutting across the open-air courtyard.
    const target={x:player.x,z:player.z};
    advanceGhostToward(target,dt);
  }
  const distance=Math.hypot(maiden.x-player.x,maiden.z-player.z);
  if(distance<1.18&&invulnerable<=0&&clearGhostSight(maiden.x,maiden.z,player.x,player.z)){
    hp--;maiden.attacks++;invulnerable=2.5;player.x=SCHOOL.guard.x;player.z=SCHOOL.guard.z;
    maiden.x=SCHOOL.maidenSpawn.x;maiden.z=SCHOOL.maidenSpawn.z;ghostNav=null;ghostWaiting=10;
    maiden.charge=0;
    sfx('sfx_scream_01.mp3',.25);
    lastMistake='처녀귀신을 똑바로 바라봐야 움직임이 멈춰요. 과학실에 들어가면 먼저 카메라를 돌려 귀신을 찾으세요.';
    if(hp<=0){finish(false);return;}
    showLesson('다시 도전할 기회가 있어요',lastMistake,13);
    showToast('붙잡혔지만 관리실에서 다시 시작합니다. 생명 '+hp+'개 남았어요.');
    updateNavigation(0,true);
  }
}
function takeAnomalyHit(reason,resetToStage=null){
  if(invulnerable>0||!started||ended)return;
  hp--;invulnerable=3;
  player.x=SCHOOL.guard.x;player.z=SCHOOL.guard.z;
  viewYaw=-Math.PI/2;player.yaw=Math.PI/2;
  lastMistake=reason;
  sfx('sfx_horror_sting_01.mp3',.19);
  if(hp<=0){finish(false);return;}
  if(resetToStage!==null)setStage(resetToStage);
  showLesson('다시 도전할 기회가 있어요',reason+' · 관리실에서 다시 시작합니다.',12);
  showToast('생명 '+hp+'개 남았어요. 괴이마다 규칙이 달라요.');
}
function moveWolfToward(target,dt){
  const w=encounter.wolf;
  if(!w.nav||w.nav.path.length===0||w.nav.age>3.8||
     Math.hypot(w.nav.target.x-target.x,w.nav.target.z-target.z)>1.5){
    w.nav={path:routePlan(w,target,.9),age:0,target:{x:target.x,z:target.z}};
  }
  w.nav.age+=dt;
  while(w.nav.path.length>1&&dist(w,w.nav.path[0])<.14)w.nav.path.shift();
  const point=w.nav.path[0]||target,dx=point.x-w.x,dz=point.z-w.z,length=Math.hypot(dx,dz);
  if(length<.08)return;
  const step=Math.min(length,w.speed*dt),newX=w.x+dx/length*step,newZ=w.z+dz/length*step;
  if(canWalk(newX,newZ)){
    w.x=newX;w.z=newZ;
    w.root.rotation.y=Math.atan2(-dx,-dz);
  }else w.nav=null;
}
function updateNewEncounters(dt){
  if(stage===4){
    const inCold=player.x>20&&player.z>10.4;
    encounter.frost=Math.min(12,Math.max(0,encounter.frost+dt*(inCold?.33:-1)));
    // A few repairs restore warmth, even before the entire room is fixed.
    if(encounter.frost>=12){
      encounter.frost=0;takeAnomalyHit('가사실 냉기는 난방장치 세 곳을 복구하면 가라앉아요.');
    }
    yuki.root.position.y=Math.sin(elapsed*2)*.12;
    yuki.root.rotation.y+=dt*.25;
  }
  if(stage===6){
    const d=dist(player,eggLocation);
    const dx=eggLocation.x-player.x,dz=eggLocation.z-player.z;
    const dot=d>0.001?(-Math.sin(viewYaw)*dx-Math.cos(viewYaw)*dz)/d:1;
    const sameRoom=player.x>3.1&&player.x<11.8&&player.z< -10.5;
    const unobstructed=clearGhostSight(player.x,player.z,eggLocation.x,eggLocation.z);
    const away=sameRoom&&d<8.3&&d>1.5&&unobstructed&&dot<-.28;
    const staring=sameRoom&&d<8.3&&unobstructed&&dot>.72;
    encounter.eggCharge=Math.max(0,Math.min(4,encounter.eggCharge+dt*(away?1:-.15)));
    encounter.eggFear=Math.max(0,encounter.eggFear+dt*(staring?1:-1.2));
    ui.reticle.classList.toggle('locked',false);
    ui.reticle.style.borderColor=staring?'#ff777d':'';
    if(encounter.eggCharge>=4){
      encounter.eggCharge=4;encounter.eggFear=0;setStage(7);
    }else if(encounter.eggFear>2.3){
      encounter.eggCharge=0;encounter.eggFear=0;
      takeAnomalyHit('달걀귀신은 바라보면 위험해요. 음악실에 들어가 등을 돌리고 버텨야 합니다.');
    }
  }else ui.reticle.style.borderColor='';
  if(stage===8){
    if(dist(player,bellDoor)<7.2){
      if(encounter.bellCount<3){
        encounter.bellClock-=dt;
        if(encounter.bellClock<=0){
          encounter.bellCount++;encounter.bellClock=2.4;
          sfx('sfx_school_alarm_bell.mp3',.22);
          if(encounter.bellCount===1)showToast('첫 번째 종… 아직 문을 닫지 마세요.');
          else if(encounter.bellCount===2)showToast('두 번째 종… 마지막 종을 기다리세요!');
          else{
            encounter.bellWindow=5.5;
            showToast('세 번째 종! 지금 전기실 문을 닫으세요!');
          }
        }
      }else if(encounter.bellWindow>0){
        encounter.bellWindow-=dt;
        if(encounter.bellWindow<=0){
          encounter.bellWindow=0;encounter.bellCount=0;encounter.bellClock=2.1;
          showToast('종소리 타이밍을 놓쳤어요. 세 번을 다시 세어보세요.');
          sfx('sfx_horror_sting_01.mp3',.12);
        }
      }
    }else{
      // A full new sequence starts when the player returns to the electrical room.
      if(encounter.bellCount<3)encounter.bellClock=Math.max(encounter.bellClock,1);
    }
  }
  const w=encounter.wolf;
  if(stage===10||stage===11){
    w.root.position.set(w.x,.04,w.z);
    if(stage===10){
      if(player.z>6.9&&player.x>-15.1){
        w.active=true;w.grace=Math.max(0,w.grace-dt);
        if(w.grace<=0){
          moveWolfToward(player,dt);
          if(dist(w,player)<1.22&&clearGhostSight(w.x,w.z,player.x,player.z)){
            w.x=-1.5;w.z=16.8;w.nav=null;w.grace=9;
            sfx('sfx_wolf_howl.mp3',.26);
            takeAnomalyHit('늑대인간은 소리를 따라 달려와요. 남쪽 복도의 노란 스피커를 먼저 켜세요.');
          }
        }
      }
    }else{
      w.lureTime=Math.max(0,w.lureTime-dt);
      w.soundClock=(w.soundClock||0)+dt;
      if(w.soundClock>=4.7){w.soundClock=0;sfx('sfx_school_alarm_bell.mp3',.14);}
      if(!w.ready)moveWolfToward(wolfTrap,dt);
      if(dist(w,wolfTrap)<1.8&&!w.ready){
        w.ready=true;w.nav=null;
        showToast('늑대가 붉은 함정에 들어왔어요! 지금 봉인하세요!');
        sfx('sfx_wolf_howl.mp3',.12);
      }
      if(w.lureTime<=0){
        sfx('sfx_wolf_howl.mp3',.2);
        showToast('소리가 멈춰 늑대가 빠져나갔어요. 다시 스피커를 켜세요.');
        setStage(10);
      }
    }
  }
}

function updatePlayer(dt){
  let f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-joy.y;
  let r=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x;
  const mag=Math.hypot(f,r);if(mag>1){f/=mag;r/=mag;}
  const run=keys.has('shift')&&mag>.1;
  const speed=run?5.0:3.25;
  const fx=-Math.sin(viewYaw),fz=-Math.cos(viewYaw),rx=Math.cos(viewYaw),rz=-Math.sin(viewYaw);
  const vx=(fx*f+rx*r)*speed*dt,vz=(fz*f+rz*r)*speed*dt;
  if(canWalk(player.x+vx,player.z))player.x+=vx;
  if(canWalk(player.x,player.z+vz))player.z+=vz;
  // Casual_Male.gltf, as in the teacher classroom simulator, faces LOCAL +Z.
  // Forward movement in world -Z therefore needs yaw PI, not zero.
  // Use actual input velocity rather than the camera look angle.
  if(mag>.07)player.yaw=Math.atan2(fx*f+rx*r,fz*f+rz*r);
  player.root.position.set(player.x,invulnerable>0&&Math.floor(elapsed*10)%2===0?-.03:0,player.z);
  player.root.rotation.y=player.yaw;
  const anim=player.animation;
  if(anim){if(anim.walk)anim.walk.setEffectiveWeight(Math.min(1,mag));if(anim.idle)anim.idle.setEffectiveWeight(1-Math.min(1,mag));}
}
function updateCamera(dt){
  const fx=-Math.sin(viewYaw),fz=-Math.cos(viewYaw);
  const origin=new THREE.Vector3(player.x,1.76,player.z);
  const far=new THREE.Vector3(player.x-fx*8.5,6.1,player.z-fz*8.5);
  let safe=far;
  // Sweep between player and trailing camera; do not let solid walls obscure the view.
  for(let t=.03;t<=1.001;t+=.025){
    const p=origin.clone().lerp(far,Math.min(1,t));
    if(p.y<3.23&&walls.some(w=>collides(p.x,p.z,w,.16))){
      safe=origin.clone().lerp(far,Math.max(.05,t-.065));break;
    }
  }
  camera.position.lerp(safe,Math.min(1,dt*11));
  camera.lookAt(player.x+fx*10,1.6,player.z+fz*10);
  torch.position.set(player.x,1.85,player.z);torchTarget.position.set(player.x+fx*4,1.30,player.z+fz*4);
  torch.intensity=flashOn&&power>0?23:0;
}
function updateProps(dt){
  for(const [i,o] of disturbed.entries())if(!o.done){
    o.object.rotation.y+=dt*(i===2?1.8:.7);
    o.object.position.y=1.2+Math.sin(elapsed*2.5+o.phase)*.20;
  }
  for(const m of glowThings){
    m.orb.position.y=.75+Math.sin(elapsed*2.3+m.holder.position.x)*.14;
    m.holder.rotation.y+=dt*.25;
  }
  westLight.intensity=8.5+Math.sin(elapsed*4)*.55;
  eastLight.intensity=stage>=2?6.8+Math.sin(elapsed*8)*1.3:8;
}
function drawMap(){
  const ctx=ui.map.getContext('2d'),w=ui.map.width,h=ui.map.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#08131bea';ctx.fillRect(0,0,w,h);
  const tx=x=>(x+29)/60*w,tz=z=>(z+21)/42*h;
  const cells=[
    {x:-28,z:-20,w:13,h:40},
    {x:-15,z:-20,w:45,h:13},
    {x:-15,z:7,w:45,h:13}
  ];
  for(const p of cells){
    ctx.fillStyle='#38495b';ctx.fillRect(tx(p.x),tz(p.z),p.w/60*w,p.h/42*h);
    ctx.strokeStyle='#809ba78b';ctx.strokeRect(tx(p.x),tz(p.z),p.w/60*w,p.h/42*h);
  }
  // Unwalkable courtyard visually separates the arms of the ㄷ.
  ctx.fillStyle='#263f34';ctx.fillRect(tx(-15),tz(-7),45/60*w,14/42*h);
  ctx.strokeStyle='#6a8c7c66';ctx.strokeRect(tx(-15),tz(-7),45/60*w,14/42*h);
  // Connecting spine corridor and both wing halls.
  ctx.fillStyle='#6d80925a';
  ctx.fillRect(tx(-20.5),tz(-19.6),5.5/60*w,39.2/42*h);
  ctx.fillRect(tx(-15),tz(-10.2),45/60*w,3.2/42*h);
  ctx.fillRect(tx(-15),tz(7),45/60*w,3.2/42*h);
  ctx.fillStyle='#a9d4fb';ctx.font='bold 9px system-ui';ctx.fillText('북쪽 동',tx(1),tz(-8.2));
  ctx.fillStyle='#eec89b';ctx.fillText('남쪽 동',tx(1),tz(9.0));
  ctx.fillStyle='#dfd3b5';ctx.save();ctx.translate(tx(-18),tz(1));ctx.rotate(-Math.PI/2);
  ctx.fillText('연결동',0,0);ctx.restore();
  ctx.strokeStyle='#a3b3bf55';ctx.lineWidth=.8;
  for(const x of [-6,3,12,21]){
    for(const [za,zb] of [[-20,-10.2],[10.2,20]]){
      ctx.beginPath();ctx.moveTo(tx(x),tz(za));ctx.lineTo(tx(x),tz(zb));ctx.stroke();
    }
  }
  for(const z of [-12,-4,4,12]){
    ctx.beginPath();ctx.moveTo(tx(-28),tz(z));ctx.lineTo(tx(-20.5),tz(z));ctx.stroke();
  }
  const marker=(x,z,c,r=3)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(tx(x),tz(z),r,0,Math.PI*2);ctx.fill();};
  marker(SCHOOL.guard.x,SCHOOL.guard.z,'#e8c78f',3.8);
  if(stage===1){
    for(const item of disturbed)if(!item.done)marker(item.x,item.z,'#f5b869',2.5);
    if(fixes===3)marker(SCHOOL.dokkaebi.x,SCHOOL.dokkaebi.z,'#ffc86f',4);
  }
  if(stage===2)marker(SCHOOL.science.x,SCHOOL.science.z,'#c4b1ff',4);
  if(stage===3)marker(SCHOOL.science.x,-13.1,'#ca99ff',4);
  if(stage===4)for(const o of encounter.heatNodes)if(!o.done)marker(o.x,o.z,'#7bd9f5',3);
  if(stage===5)marker(25.5,13.1,'#79e7ee',4);
  if(stage===6||stage===7)marker(7.5,-13.1,'#d2d8dd',4);
  if(stage===8)marker(bellDoor.x,bellDoor.z,'#aa8ef2',4);
  if(stage===9)marker(-25.3,8,'#aa8ef2',4);
  if(stage===10)marker(-7.5,8.55,'#f0c27b',4);
  if(stage===11)marker(wolfTrap.x,wolfTrap.z,'#f58e69',4);
  if(stage===12)marker(SCHOOL.guard.x,SCHOOL.guard.z,'#79e0bd',4);
  marker(player.x,player.z,'#7ddaf4',4);
  ctx.strokeStyle='#7ddaf4';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(tx(player.x),tz(player.z));
  ctx.lineTo(tx(player.x)-Math.sin(viewYaw)*7,tz(player.z)-Math.cos(viewYaw)*7);ctx.stroke();
}
function loop(now){
  requestAnimationFrame(loop);const dt=Math.min(.045,Math.max(0,(now-last)/1000));last=now;
  if(started&&!paused&&!ended){
    elapsed+=dt;invulnerable=Math.max(0,invulnerable-dt);
    if(flashOn)power=Math.max(0,power-dt*.28);else power=Math.min(100,power+dt*2.8);
    if(power===0)flashOn=false;
    updatePlayer(dt);updateGhost(dt);updateNewEncounters(dt);updateProps(dt);
    updateNavigation(dt);
    if(lessonTimer>0){lessonTimer-=dt;if(lessonTimer<=0)ui.lesson.classList.add('hidden');}
    for(const mixer of mixers)mixer.update(dt);
    hudClock+=dt;miniClock+=dt;
    if(hudClock>.12){updateHud();hudClock=0;}
    if(miniClock>.25){drawMap();miniClock=0;}
    if(toastSeconds>0){toastSeconds-=dt;if(toastSeconds<=0)ui.toast.classList.remove('show');}
  }
  updateCamera(dt);ui.time.textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0');
  renderer.render(scene,camera);
}
requestAnimationFrame(loop);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize);
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k))e.preventDefault();
  keys.add(k);if(e.repeat)return;
  if(k==='e'||k===' ')act();
  if(k==='f'&&started){flashOn=!flashOn;updateHud();}
  if(k==='escape'&&started){paused=!paused;ui.help.classList.toggle('hidden',!paused);}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();joy.x=joy.y=0;ui.knob.style.transform='translate(0,0)';});
ui.canvas.addEventListener('pointerdown',e=>{turnPointer=e.pointerId;prevX=e.clientX;ui.canvas.setPointerCapture(e.pointerId);});
ui.canvas.addEventListener('pointermove',e=>{
  if(turnPointer!==e.pointerId||!started||paused)return;
  viewYaw+=Math.max(-55,Math.min(55,e.clientX-prevX))*.0064;prevX=e.clientX;
});
for(const evt of ['pointerup','pointercancel'])ui.canvas.addEventListener(evt,e=>{if(turnPointer===e.pointerId)turnPointer=null;});
let joyPointer=null;
function setJoy(e){const b=ui.joy.getBoundingClientRect(),x=e.clientX-(b.left+b.width/2),y=e.clientY-(b.top+b.height/2);
  const n=Math.hypot(x,y)||1,scale=Math.min(1,47/n);joy.x=x*scale/47;joy.y=y*scale/47;
  ui.knob.style.transform='translate('+(joy.x*47)+'px,'+(joy.y*47)+'px)';
}
ui.joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;ui.joy.setPointerCapture(e.pointerId);setJoy(e);});
ui.joy.addEventListener('pointermove',e=>{if(joyPointer===e.pointerId)setJoy(e);});
for(const evt of ['pointerup','pointercancel'])ui.joy.addEventListener(evt,e=>{if(joyPointer===e.pointerId){joyPointer=null;joy.x=joy.y=0;ui.knob.style.transform='translate(0,0)';}});
ui.action.addEventListener('click',act);
$('start').addEventListener('click',reset);
$('retry').addEventListener('click',reset);
$('helpButton').addEventListener('click',()=>{paused=true;ui.help.classList.remove('hidden');});
$('closeHelp').addEventListener('click',()=>{paused=false;ui.help.classList.add('hidden');});
ui.flash.addEventListener('click',()=>{if(started){flashOn=!flashOn;updateHud();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){paused=true;ui.help.classList.remove('hidden');bgm.pause();}else if(started&&!paused){bgm.play().catch(()=>{});}});
updateHud();drawMap();
