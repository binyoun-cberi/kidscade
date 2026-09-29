import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
const SAVE='kidscade_game_v1:high_apocalypse_survival:save';
const KNOW='kidscade_game_v1:high_apocalypse_survival:knowledge';
const DAY_SECONDS=360, CAMP=new THREE.Vector3(0,0,8), RUINS=new THREE.Vector3(43,0,-31), POWER_STATION=new THREE.Vector3(51,0,-27), SURVIVOR_POS=new THREE.Vector3(45,0,-36), RIVER_X=30;
const RESIDENTS={
 taeho:{name:'태호',icon:'🧑‍🔧',color:0x6ea4d9,field:new THREE.Vector3(45,0,-36),camp:new THREE.Vector3(3,0,10),preferred:'technician'},
 mira:{name:'미라',icon:'🧑‍🌾',color:0xc88b62,field:new THREE.Vector3(-31,0,27),camp:new THREE.Vector3(-3,0,10),preferred:'gatherer'},
 junseo:{name:'준서',icon:'🧑‍⚕️',color:0x8c79c6,field:new THREE.Vector3(57,0,-25),camp:new THREE.Vector3(0,0,13),preferred:'medic'}
};
const ITEMS={
  wood:['목재','🪵'],stone:['돌','🪨'],dirtyWater:['강물','🫗'],chemWater:['공장 오염수','☣️'],cleanWater:['깨끗한 물','💧'],
  food:['통조림','🥫'],potato:['감자','🥔'],cookedPotato:['구운 감자','🍠'],spoiledFood:['상한 음식','🤢'],cloth:['천','🧵'],
  scrap:['고철','⚙️'],battery:['배터리','🔋'],axe:['돌도끼','🪓']
};
const BUILD={
  campfire:{name:'모닥불',icon:'🔥',cost:{wood:3,stone:4},model:'campfire-pit.glb',radius:1.2},
  shelter:{name:'간이 쉼터',icon:'⛺',cost:{wood:8,stone:4},model:'structure.glb',radius:2.2},
  workbench:{name:'작업대',icon:'🛠️',cost:{wood:5,stone:2},model:'workbench.glb',radius:1.2},
  farm:{name:'작은 텃밭',icon:'🌱',cost:{wood:4,stone:1},model:'patch-grass-large.glb',radius:2.4},
  cooler:{name:'냉장 보관함',icon:'🧊',cost:{wood:2,scrap:3,battery:1},model:'chest.glb',radius:1.3},
  purifier:{name:'전기 정수기',icon:'🚰',cost:{cloth:2,scrap:2,stone:2},model:'barrel.glb',radius:1.3}
};
const JOBS={
  technician:{name:'기술 담당',icon:'⚙️',desc:'하루가 바뀔 때 수리에 쓸 고철을 1개 확보합니다.'},
  gatherer:{name:'채집 담당',icon:'🪓',desc:'함께 채집해 나무·돌·먹을거리 획득량이 1개 늘어납니다.'},
  medic:{name:'의료 담당',icon:'🩹',desc:'굶주림과 갈증이 안정적일 때 체력 회복 속도가 2배가 됩니다.'}
};
const KNOWLEDGE=[
 ['waterRisk','과학 · 물질','맑아 보여도 안전한 물은 아니다','자연의 물에는 눈에 보이지 않는 생물학적 위험이 있을 수 있습니다.'],
 ['boiling','과학 · 물질','끓이기는 생물학적 위험을 줄인다','충분히 가열하면 많은 미생물 위험을 줄일 수 있지만 모든 화학 오염을 없애는 만능 정수법은 아닙니다.'],
 ['chemicalPollution','과학 · 물질','끓여도 사라지지 않는 오염이 있다','일부 화학 오염은 물을 끓여도 안전해지지 않습니다. 오염원을 피하거나 알맞은 정수 방법과 다른 수원을 찾아야 합니다.'],
 ['combustion','과학 · 에너지','불에는 연료와 산소, 충분한 온도가 필요하다','젖은 연료는 불이 붙기 어렵고 연료가 다하면 불도 꺼집니다.'],
 ['insulation','과학 · 열','쉼터는 열 손실을 줄인다','비와 바람을 피하고 열의 이동을 줄이면 체온을 지키기 쉬워집니다.'],
 ['plantGrowth','과학 · 생명','먹을거리도 다시 자라나는 자원이다','식물은 알맞은 환경과 시간이 있으면 다시 자랄 수 있어 지속적인 식량원이 됩니다.'],
 ['foodPreservation','과학 · 생명','낮은 온도는 음식의 변화를 늦춘다','차갑게 보관하면 미생물의 활동과 여러 변화가 느려져 음식이 상하는 속도를 늦출 수 있습니다.'],
 ['waterTreatment','과학 · 물질','정수는 여러 단계를 조합한다','여과와 소독처럼 서로 다른 처리를 조합하면 물속 위험을 줄이는 데 도움이 됩니다. 오염 종류에 따라 필요한 방법은 달라집니다.'],
 ['electricity','과학 · 전기','전기는 생산·저장·사용이 연결된다','배터리는 에너지를 저장하지만 필요한 곳에 우선순위를 정해 써야 합니다.'],
 ['division','사회 · 공동체','분업은 서로 다른 능력을 연결한다','각자가 잘하는 일을 맡으면 공동체 전체가 더 많은 일을 해낼 수 있습니다.'],
 ['scarcity','사회 · 경제생활','자원이 부족하면 선택이 필요하다','희소한 자원을 어디에 먼저 쓸지 정하면 얻는 것과 포기하는 것이 함께 생깁니다.'],
 ['community','사회 · 공동체','규칙은 함께 살아가기 위한 약속이다','공동체의 규칙은 사람들의 필요와 자원의 상태에 따라 서로 다른 결과를 만들 수 있습니다.'],
 ['riverSettlement','사회 · 지리','강은 정착에 유리하지만 위험도 있다','물과 농업·이동에 유리하지만 홍수 피해에 대비해야 합니다.'],
 ['flood','과학·사회 융합','재난은 자연현상과 사회의 준비가 함께 만든다','같은 폭우라도 지형, 시설, 대피와 자원 준비에 따라 피해가 달라질 수 있습니다.']
].map(x=>({id:x[0],subject:x[1],title:x[2],text:x[3]}));
const MISSIONS={
 1:{title:'깨끗한 물을 확보하라',text:'강에서 물을 뜬 뒤 체육관의 비상 버너를 이용해 첫 식수를 확보하세요.',steps:[['water','강물 뜨기'],['boil','물 끓이기'],['drink','깨끗한 물 마시기']]},
 2:{title:'불과 도구를 준비하라',text:'숲과 바위에서 자원을 모아 돌도끼와 모닥불을 준비하세요.',steps:[['axe','돌도끼 제작'],['campfire','모닥불 설치'],['cook','음식 익히기']]},
 3:{title:'비를 견딜 쉼터를 지어라',text:'오후부터 비가 내립니다. 쉼터를 만들고 비가 올 때 그 안으로 들어가세요.',steps:[['shelter','쉼터 설치'],['rain','비 오는 동안 쉼터에 있기']]},
 4:{title:'폐허 도시의 전력을 되살려라',text:'동쪽 폐허에서 배터리와 고철을 찾고 비상 배전반을 복구하세요.',steps:[['ruins','폐허 도시 도착'],['battery','배터리 확보'],['power','비상 전력 복구']]},
 5:{title:'혼자가 아닌 생존',text:'구조한 생존자에게 공동체에서 맡을 역할을 직접 정해 주세요.',steps:[['rescue','생존자 구조'],['job','역할 배정']]},
 6:{title:'부족한 자원을 함께 나눠라',text:'공동체의 식량과 물이 넉넉하지 않습니다. 배분 원칙을 정하세요.',steps:[['choice','배분 원칙 정하기'],['stock','공동 비축 확보']]},
 7:{title:'강이 넘치기 전에 대비하라',text:'폭우가 계속됩니다. 식수·식량·쉼터를 확인한 뒤 무전기로 구조 신호를 보내세요.',steps:[['ready','비상 물자 준비'],['radio','무전 송신']]}
};
const ui={
 canvas:$('#game'),hud:$('#hud'),start:$('#start'),loading:$('#loading'),loadingText:$('#loadingText'),ending:$('#ending'),decision:$('#decision'),
 newGame:$('#newGame'),continueGame:$('#continueGame'),restartGame:$('#restartGame'),
 day:$('#dayText'),clock:$('#clockText'),weather:$('#weatherText'),missionTitle:$('#missionTitle'),missionText:$('#missionText'),
 missionSteps:$('#missionSteps'),missionKicker:$('#missionKicker'),health:$('#health'),hunger:$('#hunger'),thirst:$('#thirst'),temp:$('#temp'),
 zone:$('#zoneText'),bearing:$('#bearingText'),interact:$('#interactPrompt'),toast:$('#toast'),panel:$('#panel'),panelTitle:$('#panelTitle'),
 panelBody:$('#panelBody'),closePanel:$('#closePanel'),hotWater:$('#hotWater'),hotFood:$('#hotFood'),hotAxe:$('#hotAxe'),hotItems:$('#hotItems'),
 endingText:$('#endingText'),endingStats:$('#endingStats'),joyKnob:$('#joyKnob'),mobileInteract:$('#mobileInteract'),
 mobileBuild:$('#mobileBuild'),mobileTablet:$('#mobileTablet')
};
let scene,camera,renderer,loader,clock,game=null,running=false,paused=false,toastT=0,lastSave=0;
let camYaw=Math.PI,camPitch=.42,camDist=9,drag=false,lastPointer=null,buildMode=null,ghost=null,currentInteract=null;
const keys=new Set(), interactables=[], resources=[], placed=[], colliders=[], models=new Map();
const groups={world:new THREE.Group(),props:new THREE.Group(),dynamic:new THREE.Group(),buildings:new THREE.Group(),weather:new THREE.Group()};
const player={root:new THREE.Group(),visual:new THREE.Group(),speed:0,touch:new THREE.Vector2(),sprite:null};
const tmp=new THREE.Vector3(),tmp2=new THREE.Vector3();

function fresh(){
 return {version:1,day:1,time:430,health:100,hunger:82,thirst:72,temp:36.6,pos:{x:0,z:8},yaw:Math.PI,
  inv:{wood:0,stone:0,dirtyWater:0,chemWater:0,cleanWater:0,food:1,potato:1,cookedPotato:0,cloth:0,scrap:0,battery:0,axe:0},
  flags:{},buildings:[],knowledge:[],survivors:0,job:null,residents:{taeho:{rescued:false,job:null},mira:{rescued:false,job:null},junseo:{rescued:false,job:null}},
  powerKw:0,powerLoads:{light:true,cooler:true,purifier:true},trust:60,communityHealth:70,productivity:70,morale:70,
  distribution:null,floodLevel:0,playSeconds:0,finished:false};
}
function parse(v,d){try{return JSON.parse(v)??d}catch(_){return d}}
function load(){
 const s=parse(localStorage.getItem(SAVE),null);if(!s||s.version!==1)return null;const f=fresh();
 const merged={...f,...s,inv:{...f.inv,...s.inv},flags:{...s.flags},powerLoads:{...f.powerLoads,...(s.powerLoads||{})},buildings:Array.isArray(s.buildings)?s.buildings:[],knowledge:Array.isArray(s.knowledge)?s.knowledge:[],residents:{...f.residents,...(s.residents||{})}};
 if(s.survivors>0&&!merged.residents.taeho?.rescued)merged.residents.taeho={rescued:true,job:s.job||null};
 merged.survivors=Object.values(merged.residents).filter(r=>r?.rescued).length;merged.job=merged.residents.taeho?.job||s.job||null;
 return merged
}
function save(){if(!game)return;game.pos={x:player.root.position.x,z:player.root.position.z};game.yaw=camYaw;localStorage.setItem(SAVE,JSON.stringify(game));localStorage.setItem(KNOW,JSON.stringify([...new Set(game.knowledge)]))}
function withOldKnowledge(g){const old=parse(localStorage.getItem(KNOW),'[]');if(Array.isArray(old))g.knowledge=[...new Set([...g.knowledge,...old])];return g}
function flag(id,val=true){if(game.flags[id]===val)return false;game.flags[id]=val;save();updateMission();return true}
function discover(id){if(game.knowledge.includes(id))return;game.knowledge.push(id);const k=KNOWLEDGE.find(v=>v.id===id);if(k)toast('📖 지식 발견 · '+k.title,'normal',3.2);save();renderOpenPanel()}
function toast(text,tone='normal',sec=2.3){ui.toast.textContent=text;ui.toast.style.borderColor=tone==='danger'?'rgba(255,100,100,.6)':tone==='warn'?'rgba(255,211,106,.6)':'rgba(128,227,162,.42)';ui.toast.classList.add('show');toastT=sec}
function has(cost){return Object.entries(cost).every(([k,v])=>(game.inv[k]||0)>=v)}
function pay(cost){Object.entries(cost).forEach(([k,v])=>game.inv[k]=Math.max(0,(game.inv[k]||0)-v))}
function costText(cost){return Object.entries(cost).map(([k,v])=>(ITEMS[k]?.[1]||'•')+' '+(ITEMS[k]?.[0]||k)+' '+v).join(' · ')}
function addItem(id,n=1){game.inv[id]=(game.inv[id]||0)+n;toast((ITEMS[id]?.[1]||'📦')+' '+(ITEMS[id]?.[0]||id)+' +'+n);save();updateUI()}
function missionDone(day=game.day){const m=MISSIONS[day];return !!m&&m.steps.every(([id])=>!!game.flags[id])}
function terrainHeight(x,z){
 let h=0;
 if(x<-15){const t=clamp((-x-15)/52,0,1);h+=t*(.35+.55*(Math.sin(x*.12)+Math.cos(z*.11))*.5+.7*Math.max(0,Math.sin((x+z)*.07)))}
 if(x<-42&&z>16)h+=1.25*clamp((-x-42)/22,0,1)*clamp((z-16)/35,0,1);
 return Math.max(0,h)
}
function addCollider(x,z,w,d,pad=.55){colliders.push({x,z,hw:w/2+pad,hd:d/2+pad})}
function blockedAt(x,z){
 if(colliders.some(b=>Math.abs(x-b.x)<b.hw&&Math.abs(z-b.z)<b.hd))return true;
 return placed.some(p=>{const id=p.userData.interactable?.building;if(id==='campfire'||id==='farm')return false;const r=(BUILD[id]?.radius||1)+.45;return Math.hypot(x-p.position.x,z-p.position.z)<r})
}
function solidBox(w,h,d,c,x,y,z,pad=.25){const m=box(w,h,d,c,x,y,z);addCollider(x,z,w,d,pad);return m}
function ruinShell(name,x,z,w,d,c=0x777b78){
 const wall=.45,h=3.8,door=2.2;
 solidBox(w,h,wall,c,x,h/2,z-d/2);solidBox(w,h,wall,c,x,h/2,z+d/2);
 solidBox(wall,h,d,c,x-w/2,h/2,z);solidBox(wall,h,(d-door)/2,c,x+w/2,h/2,z-(d+door)/4);solidBox(wall,h,(d-door)/2,c,x+w/2,h/2,z+(d+door)/4);
 const floor=box(w-.6,.08,d-.6,0x5e625f,x,.04,z);label(name,x,h+1,z);return floor
}
function residentCount(){return Object.values(game?.residents||{}).filter(r=>r?.rescued).length}
function jobPower(role){let n=0;for(const [id,r] of Object.entries(game?.residents||{}))if(r?.rescued&&r.job===role)n+=RESIDENTS[id]?.preferred===role?1.25:1;return n}
function hasBuilding(id){return game?.buildings?.some(b=>b.id===id)}
function powerUse(extra=0){let use=0;if(game?.flags?.power&&game.powerLoads?.light)use+=.2;if(hasBuilding('cooler')&&game.powerLoads?.cooler)use+=.8;if(hasBuilding('purifier')&&game.powerLoads?.purifier)use+=1.2;return use+extra}
function devicePowered(id){if(!game?.flags?.power)return false;if(id==='light')return !!game.powerLoads?.light;if(!hasBuilding(id)||!game.powerLoads?.[id])return false;return powerUse()<=game.powerKw+.001}

function init3D(){
 renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:!matchMedia('(pointer:coarse)').matches,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=true;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9ac8da);scene.fog=new THREE.Fog(0x9ac8da,50,120);
 camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,180);clock=new THREE.Clock();loader=new GLTFLoader();
 Object.values(groups).forEach(g=>scene.add(g));
 scene.add(new THREE.HemisphereLight(0xe6f7ff,0x607054,1.7));
 const sun=new THREE.DirectionalLight(0xfff0d0,2.3);sun.position.set(-32,48,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);scene.userData.sun=sun;
 const groundGeo=new THREE.PlaneGeometry(140,140,36,36),gp=groundGeo.attributes.position;for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=-gp.getY(i);gp.setZ(i,terrainHeight(x,z))}gp.needsUpdate=true;groundGeo.computeVertexNormals();
 const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({color:0x66865a,roughness:.95,flatShading:true}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;groups.world.add(ground);
 const river=new THREE.Mesh(new THREE.PlaneGeometry(14,140),new THREE.MeshPhysicalMaterial({color:0x4fabc6,transparent:true,opacity:.84,roughness:.2}));river.rotation.x=-Math.PI/2;river.position.set(RIVER_X,.08,0);groups.world.add(river);scene.userData.river=river;
 box(44,.025,64,0x55764f,-39,.012,16);box(39,.025,48,0x767873,49,.014,-33);
 box(7,.08,120,0x4b5153,16,.04,-2);box(95,.08,6,0x4b5153,8,.05,-27);box(15,.35,5.5,0x765c42,RIVER_X,.3,-4);
 solidBox(13,5.5,9,0xc2aa85,-5,2.75,18,.15);box(14,.8,10,0x586a68,-5,5.9,18);label('폐교 체육관',-5,6.9,18);
 const rest=box(2.4,.12,1.2,0x526c55,1,.08,11);addInteract(rest,'rest','체육관 매트에서 쉬기');
 const burner=box(.8,.38,.7,0x4c5456,2,.19,9.4);addInteract(burner,'burner','비상 버너로 물 끓이기');label('비상 버너',2,1.25,9.4);
 const lampPole=box(.18,4,.18,0x4a5457,-2,2,10);const campLamp=new THREE.PointLight(0xffe2a1,0,18,2);campLamp.position.set(-2,3.8,10);scene.add(campLamp);scene.userData.campLamp=campLamp;
 for(let i=0;i<18;i++)spawnResource('tree',-57+Math.random()*42,-15+Math.random()*70);
 for(let i=0;i<13;i++)spawnResource('rock',-58+Math.random()*46,-55+Math.random()*39);
 [[-8,8],[-11,13],[-7,3],[-12,5]].forEach(p=>spawnResource('tree',p[0],p[1]));
 [[-8,-2],[-12,-4],[-6,-6],[-14,0],[-10,2]].forEach(p=>spawnResource('rock',p[0],p[1]));
 [[-22,18],[-28,8],[-34,22],[-18,30],[-40,5],[-25,-8]].forEach(p=>spawnResource('forage',p[0],p[1]));
 ruinShell('폐마트',44,-32,12,10,0x8b8375);ruinShell('폐진료소',58,-25,10,9,0x7a8587);ruinShell('정비 창고',50,-47,11,8,0x6f7778);
 solidBox(6,7,6,0x85817a,62,3.5,-43,.2);solidBox(7,5,5,0x737c80,39,2.5,-48,.2);label('폐허 도시',49,9,-31);
 const shelfA=box(1.8,1.4,.6,0x6f573e,41,.7,-31);addInteract(shelfA,'ruinCache','마트 진열대 뒤지기',{cache:'market'});
 const shelfB=box(1.5,1.1,.55,0xd5d8d2,56,.55,-25);addInteract(shelfB,'ruinCache','진료소 캐비닛 뒤지기',{cache:'clinic'});
 const shelfC=box(1.7,1.2,.7,0x596064,48,.6,-46);addInteract(shelfC,'ruinCache','정비함 뒤지기',{cache:'garage'});
 const crate=box(1.3,1.1,1.3,0x715638,42,.58,-29);addInteract(crate,'crate','폐허 보급 상자 열기');
 const powerbox=solidBox(1.4,1.9,.75,0x51625d,POWER_STATION.x,.95,POWER_STATION.z,.1);addInteract(powerbox,'powerbox','비상 배전반 복구');label('비상 배전반',POWER_STATION.x,2.8,POWER_STATION.z);
 const wasteTank=solidBox(2.2,2.2,2.2,0x68735f,57,1.1,-42,.1);addInteract(wasteTank,'pollutedWater','이상한 냄새의 물 조사');label('파손된 저장탱크',57,3.2,-42);
 const pole=box(.35,5,.35,0x525d61,-4,2.5,12);addInteract(pole,'radio','비상 무전기 확인');label('비상 무전',-4,5.8,12);
 scene.userData.survivorNodes={};scene.userData.campResidents={};
 for(const [id,rdef] of Object.entries(RESIDENTS)){
   const field=new THREE.Group();field.position.copy(rdef.field);field.position.y=terrainHeight(field.position.x,field.position.z);const body=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.35,4,8),new THREE.MeshStandardMaterial({color:rdef.color}));body.position.y=1.2;field.add(body);const fl=makeLabel(id==='taeho'?'구조 요청':rdef.name+' 구조 요청');fl.position.y=3.4;fl.scale.multiplyScalar(.66);field.add(fl);field.visible=false;groups.dynamic.add(field);addInteract(field,'survivor',rdef.name+' 구조',{resident:id});scene.userData.survivorNodes[id]=field;
   const camp=new THREE.Group();camp.position.copy(rdef.camp);const cb=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.35,4,8),new THREE.MeshStandardMaterial({color:rdef.color}));cb.position.y=1.2;camp.add(cb);const cn=makeLabel(rdef.name);cn.position.y=3.4;cn.scale.multiplyScalar(.6);camp.add(cn);camp.visible=false;groups.dynamic.add(camp);scene.userData.campResidents[id]=camp;
 }
 scene.userData.survivor=scene.userData.survivorNodes.taeho;scene.userData.campSurvivor=scene.userData.campResidents.taeho;
 const rz=new THREE.Object3D();rz.position.set(RIVER_X-6.3,0,5);groups.dynamic.add(rz);addInteract(rz,'river','강물 뜨기');
 player.root.position.copy(CAMP);player.root.add(player.visual);scene.add(player.root);createAvatar();
 bindInput();resize();addEventListener('resize',resize);
}
function box(w,h,d,c,x=0,y=h/2,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.9}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;groups.props.add(m);return m}
function makeLabel(text){const c=document.createElement('canvas');c.width=320;c.height=72;const x=c.getContext('2d');x.fillStyle='rgba(5,12,15,.76)';x.roundRect(4,4,312,64,18);x.fill();x.strokeStyle='rgba(255,255,255,.22)';x.stroke();x.fillStyle='#eef8ef';x.font='800 26px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,160,36);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(6.6,1.48,1);return s}
function label(text,x,y,z){const s=makeLabel(text);s.position.set(x,y,z);groups.dynamic.add(s);return s}
function addInteract(o,type,labelText,data={}){o.userData.interactable={type,label:labelText,...data};interactables.push(o)}
async function model(url){if(models.has(url))return models.get(url).clone(true);return new Promise(resolve=>loader.load(url,g=>{models.set(url,g.scene);resolve(g.scene.clone(true))},undefined,()=>resolve(null)))}
function normalize(o,target){const b=new THREE.Box3().setFromObject(o),sz=b.getSize(tmp),mx=Math.max(sz.x,sz.y,sz.z)||1;o.scale.multiplyScalar(target/mx);const b2=new THREE.Box3().setFromObject(o);o.position.y-=b2.min.y;o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}})}
function spawnResource(type,x,z){
 const r=new THREE.Group();r.position.set(x,terrainHeight(x,z),z);groups.props.add(r);
 let fallback;
 if(type==='tree'){fallback=new THREE.Mesh(new THREE.CylinderGeometry(.45,.65,4.6,7),new THREE.MeshStandardMaterial({color:0x6a5138}));fallback.position.y=2.3;r.add(fallback);const crown=new THREE.Mesh(new THREE.ConeGeometry(2.3,4.5,8),new THREE.MeshStandardMaterial({color:0x416a46}));crown.position.y=5.1;r.add(crown)}
 else if(type==='rock'){fallback=new THREE.Mesh(new THREE.DodecahedronGeometry(1.05),new THREE.MeshStandardMaterial({color:0x818681}));fallback.position.y=.8;r.add(fallback)}
 else{fallback=new THREE.Mesh(new THREE.DodecahedronGeometry(.9,1),new THREE.MeshStandardMaterial({color:0x5d8449}));fallback.scale.set(1.5,.65,1.5);fallback.position.y=.48;r.add(fallback)}
 r.userData={resource:type,available:true,respawn:0};resources.push(r);
 const labels={tree:'나무 채집',rock:'돌 채집',forage:'야생 감자 채집'};addInteract(r,type,labels[type]||'채집');
 const file=type==='tree'?'tree.glb':type==='rock'?'rock-a.glb':'patch-grass-large.glb';
 model('../../assets/game/3d/survival/kenney-survival-kit/'+file).then(o=>{if(!o)return;r.clear();normalize(o,type==='tree'?4.7:type==='rock'?1.55:2.2);r.add(o)})
}
function createAvatar(){let src='';try{const h=parent&&parent!==window&&parent.location.origin===location.origin?parent:window;if(typeof h.renderAvatarSVG==='function')src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(h.renderAvatarSVG())}catch(_){}
 if(src)new THREE.TextureLoader().load(src,t=>{t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(2.5,3.35,1);s.position.y=1.6;player.visual.add(s);player.sprite=s},undefined,avatarFallback);else avatarFallback()
}
function avatarFallback(){const m=new THREE.Mesh(new THREE.CapsuleGeometry(.55,1.25,5,8),new THREE.MeshStandardMaterial({color:0x4aa96c}));m.position.y=1.25;player.visual.add(m)}
function bindInput(){
 addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target?.tagName))return;keys.add(e.code);if(e.code==='KeyE')interact();if(e.code==='KeyI')openPanel('inventory');if(e.code==='KeyC')openPanel('craft');if(e.code==='KeyB')openPanel('build');if(e.code==='Tab'){e.preventDefault();togglePanel()}if(e.code==='Digit1')useItem('cleanWater');if(e.code==='Digit2')useItem('food');if(e.code==='Escape'){if(buildMode)cancelBuild();else closePanel()}});
 addEventListener('keyup',e=>keys.delete(e.code));
 ui.canvas.addEventListener('pointerdown',e=>{drag=true;lastPointer=[e.clientX,e.clientY];ui.canvas.setPointerCapture?.(e.pointerId)});
 ui.canvas.addEventListener('pointermove',e=>{if(!drag||!lastPointer)return;camYaw-=(e.clientX-lastPointer[0])*.005;camPitch=clamp(camPitch+(e.clientY-lastPointer[1])*.003,.18,.82);lastPointer=[e.clientX,e.clientY]});
 ui.canvas.addEventListener('pointerup',()=>{drag=false;lastPointer=null});ui.canvas.addEventListener('wheel',e=>camDist=clamp(camDist+e.deltaY*.008,5.8,12),{passive:true});
 ui.mobileInteract?.addEventListener('click',interact);ui.mobileBuild?.addEventListener('click',()=>openPanel('build'));ui.mobileTablet?.addEventListener('click',togglePanel);
 ui.closePanel.addEventListener('click',closePanel);$$('#hotbar button').forEach(b=>b.addEventListener('click',()=>b.dataset.use?useItem(b.dataset.use):openPanel(b.dataset.open)));
 $$('#panel nav button').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.tab,true)));$$('#decision [data-choice]').forEach(b=>b.addEventListener('click',()=>chooseDistribution(b.dataset.choice)));
 bindJoy();
}
function bindJoy(){const base=$('.joy-base');if(!base)return;let pid=null;function move(e){const r=base.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),m=Math.min(42,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);player.touch.set(Math.cos(a)*m/42,Math.sin(a)*m/42);ui.joyKnob.style.transform='translate('+(Math.cos(a)*m)+'px,'+(Math.sin(a)*m)+'px)'}base.addEventListener('pointerdown',e=>{pid=e.pointerId;base.setPointerCapture(pid);move(e)});base.addEventListener('pointermove',e=>{if(e.pointerId===pid)move(e)});function end(e){if(e.pointerId!==pid)return;pid=null;player.touch.set(0,0);ui.joyKnob.style.transform=''}base.addEventListener('pointerup',end);base.addEventListener('pointercancel',end)}
function riverHalfWidth(){return 7*(scene?.userData?.river?.scale?.x||1)}
function updatePlayer(dt){if(!running||paused||!ui.panel.classList.contains('hidden')||!ui.decision.classList.contains('hidden')||buildMode){player.speed=damp(player.speed,0,10,dt);return}let x=0,y=0;if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;if(keys.has('KeyW')||keys.has('ArrowUp'))y--;if(keys.has('KeyS')||keys.has('ArrowDown'))y++;if(Math.abs(player.touch.x)>.05||Math.abs(player.touch.y)>.05){x+=player.touch.x;y+=player.touch.y}const len=Math.hypot(x,y);if(len>1){x/=len;y/=len}const target=len?(keys.has('ShiftLeft')?8.2:5.4):0;player.speed=damp(player.speed,target,10,dt);if(len){const f=tmp.set(Math.sin(camYaw),0,Math.cos(camYaw)),r=tmp2.set(f.z,0,-f.x),dir=new THREE.Vector3().addScaledVector(r,x).addScaledVector(f,-y).normalize(),ox=player.root.position.x,oz=player.root.position.z;player.root.position.addScaledVector(dir,player.speed*dt);player.root.position.x=clamp(player.root.position.x,-68,68);player.root.position.z=clamp(player.root.position.z,-68,68);const rw=riverHalfWidth(),riverBlocked=Math.abs(player.root.position.x-RIVER_X)<rw&&Math.abs(player.root.position.z+4)>3.5;if(blockedAt(player.root.position.x,player.root.position.z)||riverBlocked){player.root.position.x=ox;player.root.position.z=oz;player.speed*=.45}player.root.rotation.y=Math.atan2(dir.x,dir.z);if(player.sprite)player.sprite.position.y=1.6+Math.sin(performance.now()*.012)*.04}player.root.position.y=terrainHeight(player.root.position.x,player.root.position.z)
function updateCamera(dt){const t=tmp.set(player.root.position.x,player.root.position.y+1.5,player.root.position.z),cp=Math.cos(camPitch),desired=tmp2.set(t.x+Math.sin(camYaw)*cp*camDist,t.y+Math.sin(camPitch)*camDist,t.z+Math.cos(camYaw)*cp*camDist);camera.position.lerp(desired,1-Math.exp(-8*dt));camera.lookAt(t)}
function updateInteract(){if(!running||buildMode)return;let best=null,bd=3.6;for(const o of interactables){if(!o.visible)continue;const d=o.getWorldPosition(tmp).distanceTo(player.root.position);if(d<bd){best=o;bd=d}}currentInteract=best;ui.interact.classList.toggle('hidden',!best);if(best)ui.interact.querySelector('span').textContent=best.userData.interactable?.label||'상호작용'}
function interact(){if(!running||paused)return;if(buildMode){confirmBuild();return}if(!currentInteract)return;const d=currentInteract.userData.interactable||{},t=d.type;
 if(t==='river'){if(game.inv.dirtyWater>=4)return toast('들고 있는 강물이 많습니다. 먼저 처리해 보세요.','warn');game.inv.dirtyWater++;discover('waterRisk');flag('water');toast('🫗 강물을 떴습니다. 비상 버너나 모닥불에서 끓여 보세요.');save();return}
 if(t==='tree'||t==='rock'||t==='forage')return gather(currentInteract,t);if(t==='burner')return useBurner();if(t==='crate')return openCrate();if(t==='ruinCache')return lootRuin(d.cache);if(t==='powerbox')return repairPower();if(t==='pollutedWater')return samplePollutedWater();if(t==='survivor')return rescue(d.resident||'taeho');if(t==='radio')return useRadio();
 if(t==='rest'){if(missionDone())advanceDay();else toast('오늘의 생존 목표를 먼저 해결해 보세요.','warn');return}if(t==='placed')usePlaced(d.building,currentInteract)
}
function gather(r,t){
 if(!r.userData.available)return;r.userData.available=false;r.visible=false;r.userData.respawn=t==='forage'?65:45;
 const id=t==='tree'?'wood':t==='rock'?'stone':'potato';
 let n=t==='tree'&&game.inv.axe?2:1;if(game.job==='gatherer'&&game.survivors)n++;
 if(t==='forage')discover('plantGrowth');addItem(id,n)
}
function useBurner(){
 if(game.flags.burnerSpent)return toast('비상 버너의 남은 연료가 없습니다. 이제 직접 불을 피워야 합니다.','warn');
 if(game.inv.dirtyWater<1)return toast('먼저 강에서 물을 떠 오세요.','warn');
 game.inv.dirtyWater--;game.inv.cleanWater++;game.flags.burnerSpent=true;discover('boiling');flag('boil');toast('🔥 남은 연료로 강물을 충분히 끓였습니다. 깨끗한 물 +1','normal',3);save();updateUI()
}
function syncPowerVisual(){if(scene?.userData?.campLamp)scene.userData.campLamp.intensity=game?.flags?.power&&game.powerLoads?.light&&powerUse()<=game.powerKw+.001?3.2:0}
function repairPower(){
 if(game.day<4)return toast('배전반은 고장 나 있습니다. 먼저 필요한 부품을 찾아야 합니다.','warn');
 if(game.flags.power)return toast('⚡ 비상 전력망이 안정적으로 작동 중입니다. '+game.powerKw.toFixed(1)+' kW');
 if(game.inv.battery<1||game.inv.scrap<2)return toast('배터리 1개와 고철 2개가 필요합니다. 폐허를 더 조사하세요.','warn');
 game.inv.battery--;game.inv.scrap-=2;game.powerKw=2.4;discover('electricity');flag('power');syncPowerVisual();toast('⚡ 배전반 복구 완료 · 야영지 비상등과 무전기에 전력이 공급됩니다.','normal',4);save();updateUI()
}
function lootRuin(id){
 const key='loot_'+id;if(game.flags[key])return toast('이미 필요한 물자를 챙겼습니다.');
 const loot=id==='market'?{food:2,potato:2}:id==='clinic'?{cloth:2,food:1}:id==='garage'?{scrap:2,wood:1}:{scrap:1};
 for(const [item,n] of Object.entries(loot))game.inv[item]=(game.inv[item]||0)+n;game.flags[key]=true;toast('🎒 폐허 수색 · '+Object.entries(loot).map(([k,n])=>(ITEMS[k]?.[0]||k)+' +'+n).join(' · '),'normal',3.5);save();updateUI()
}
function samplePollutedWater(){
 if(game.flags.chemSample)return toast('코를 찌르는 냄새가 납니다. 이 물은 식수로 쓰지 않는 편이 안전해 보입니다.','warn');
 game.flags.chemSample=true;game.inv.chemWater++;toast('☣️ 공장 오염수 샘플을 얻었습니다. 모닥불에서 가열하면 어떻게 될까요?','warn',3.8);save();updateUI()
}
function openCrate(){if(game.flags.crate)return toast('이미 확인한 상자입니다.');game.flags.crate=true;game.inv.scrap+=3;game.inv.battery++;game.inv.cloth++;game.inv.food+=2;flag('battery');toast('🔋 배터리 · 고철 · 천 · 식량을 확보했습니다. 배전반을 찾아 실제로 연결해 보세요.','normal',3);save();updateUI()}
function rescue(id='taeho'){
 if(game.day<5)return toast('아직 인기척이 없습니다.');const r=game.residents?.[id],def=RESIDENTS[id];if(!r||!def||r.rescued)return;
 r.rescued=true;game.survivors=residentCount();if(id==='taeho')game.job=null;
 const field=scene.userData.survivorNodes?.[id],camp=scene.userData.campResidents?.[id];if(field)field.visible=false;if(camp)camp.visible=true;
 if(id==='taeho')flag('rescue');toast(def.icon+' '+def.name+'를 구조했습니다. 캠프로 이동했습니다. 역할을 정해 주세요.','normal',3.5);save();setTimeout(()=>openPanel('settlement'),550)
}
function assignJob(id,role){
 const r=game.residents?.[id],def=RESIDENTS[id];if(!r?.rescued||r.job||!JOBS[role])return;r.job=role;if(id==='taeho')game.job=role;
 discover('division');if(id==='taeho')flag('job');save();renderOpenPanel();const bonus=def.preferred===role?' · 특기와 잘 맞아 효과가 더 큽니다.':'';toast(JOBS[role].icon+' '+def.name+' → '+JOBS[role].name+bonus,'normal',4)
}
function useRadio(){
 if(game.day<7)return toast('…치직… 아직 응답이 없습니다.');if(!game.flags.power)return toast('무전기를 쓸 전력이 없습니다. 폐허의 비상 전력망부터 복구하세요.','warn');
 if(powerUse(.8)>game.powerKw+.001)return toast('⚡ 무전 송신에 0.8kW가 더 필요합니다. 정착지에서 냉장고나 정수기 전원을 잠시 꺼 보세요.','warn',4);
 if(!readyFlood())return toast('폭우 속 장거리 이동 전에 물 2, 식량 2, 쉼터와 전력을 확보하세요.','warn');discover('flood');flag('radio');finish()
}
function usePlaced(id,obj){if(id==='campfire'){if(game.inv.dirtyWater>0&&game.inv.wood>0){game.inv.dirtyWater--;game.inv.wood--;game.inv.cleanWater++;discover('boiling');flag('boil');toast('🔥 강물을 충분히 끓였습니다. 깨끗한 물 +1');save();return}if(game.inv.chemWater>0&&!game.flags.chemBoilTried){if(game.inv.wood<1)return toast('가열할 장작이 필요합니다.','warn');game.inv.wood--;game.flags.chemBoilTried=true;discover('chemicalPollution');toast('☣️ 물은 끓었지만 이상한 냄새가 남아 있습니다. 화학 오염은 끓이기만 해서는 해결되지 않았습니다.','warn',5);save();return}if(game.inv.potato>0&&game.inv.wood>0){game.inv.potato--;game.inv.wood--;game.inv.cookedPotato++;discover('combustion');flag('cook');toast('🍠 감자를 구웠습니다.');save();return}return toast('끓일 강물이나 익힐 음식, 장작이 필요합니다.','warn')}if(id==='farm'){
 const st=obj?.userData?.buildState;if(!st)return;if(!st.planted){if(game.inv.potato<1)return toast('씨감자로 쓸 감자 1개가 필요합니다.','warn');game.inv.potato--;st.planted=true;st.growth=0;discover('plantGrowth');toast('🌱 감자를 심었습니다. 비와 시간이 작물을 자라게 합니다.');save();return}
 if((st.growth||0)<360)return toast('🌱 아직 자라는 중입니다. 성장 '+Math.round((st.growth||0)/3.6)+'%');
 st.planted=false;st.growth=0;game.inv.potato+=4;toast('🥔 감자 4개를 수확했습니다.');save();updateUI();return
 }if(id==='cooler'){toast(devicePowered('cooler')?'🧊 냉장 보관함 작동 중 · 하루가 지나도 식량 부패가 억제됩니다.':'냉장 보관함에 전력이 공급되지 않습니다.','normal',3);return}
 if(id==='purifier'){if(!devicePowered('purifier'))return toast('🚰 정수기에 전력이 공급되지 않습니다.','warn');if(game.inv.dirtyWater<1)return toast('처리할 강물이 없습니다.','warn');game.inv.dirtyWater--;game.inv.cleanWater++;discover('waterTreatment');toast('🚰 여과·소독 장치를 거쳐 깨끗한 물 +1');save();updateUI();return}
 if(id==='shelter'){if(missionDone())advanceDay();else toast('오늘의 목표를 조금 더 해결해 보세요.','warn')}else toast('작업대가 준비되었습니다.')}
function useItem(id){if(!game||!running)return;if(id==='cleanWater'){if(game.inv.cleanWater<1)return toast('깨끗한 물이 없습니다.','warn');game.inv.cleanWater--;game.thirst=clamp(game.thirst+38,0,100);flag('drink');toast('💧 깨끗한 물을 마셨습니다.')}else{const f=game.inv.cookedPotato>0?'cookedPotato':'food';if(game.inv[f]<1)return toast('먹을 것이 없습니다.','warn');game.inv[f]--;game.hunger=clamp(game.hunger+(f==='cookedPotato'?28:35),0,100);toast((ITEMS[f]?.[1]||'🍽')+' 식사했습니다.')}save();updateUI()}
function openPanel(tab='inventory'){if(!game)return;ui.panel.classList.remove('hidden');ui.panel.dataset.tab=tab;$$('#panel nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));renderPanel(tab)}
function closePanel(){ui.panel.classList.add('hidden')}
function togglePanel(){ui.panel.classList.contains('hidden')?openPanel('inventory'):closePanel()}
function renderOpenPanel(){if(!ui.panel.classList.contains('hidden'))renderPanel(ui.panel.dataset.tab||'inventory')}
function renderPanel(tab){
 const titles={inventory:'가방',craft:'제작',build:'건축',knowledge:'생존 도감',map:'지도',settlement:'정착지'};ui.panelTitle.textContent=titles[tab]||'생존 태블릿';
 if(tab==='inventory'){ui.panelBody.innerHTML='<div class="grid-cards">'+Object.entries(ITEMS).map(([id,d])=>'<div class="item-card"><b>'+d[1]+' '+d[0]+'</b><strong>'+(game.inv[id]||0)+'</strong><span>'+itemHint(id)+'</span></div>').join('')+'</div>';return}
 if(tab==='craft'||tab==='build'){const recipes=tab==='craft'?[{id:'axe',name:'돌도끼',icon:'🪓',cost:{wood:3,stone:2},desc:'나무 채집량이 늘어납니다.'}]:Object.entries(BUILD).map(([id,d])=>({id,...d,desc:'캠프에 배치하는 생존 시설입니다.'}));ui.panelBody.innerHTML='<div class="grid-cards">'+recipes.map(r=>'<div class="recipe-card"><b>'+r.icon+' '+r.name+'</b><p>'+r.desc+'<br><small>'+costText(r.cost)+'</small></p><button data-recipe="'+r.id+'" '+(!has(r.cost)||(r.id==='axe'&&game.inv.axe)?'disabled':'')+'>'+(tab==='build'?'배치하기':'제작하기')+'</button></div>').join('')+'</div>';ui.panelBody.querySelectorAll('[data-recipe]').forEach(b=>b.addEventListener('click',()=>tab==='build'?beginBuild(b.dataset.recipe):craft(b.dataset.recipe)));return}
 if(tab==='knowledge'){ui.panelBody.innerHTML='<div class="grid-cards">'+KNOWLEDGE.map(k=>{const on=game.knowledge.includes(k.id);return '<div class="knowledge-card '+(on?'':'locked')+'"><small>'+(on?k.subject:'???')+'</small><b>'+(on?k.title:'아직 발견하지 못한 지식')+'</b><p>'+(on?k.text:'게임 속 행동과 결과를 통해 직접 발견해 보세요.')+'</p></div>'}).join('')+'</div>';return}
 if(tab==='map'){
   const px=clamp((player.root.position.x+70)/140*100,4,96),pz=clamp((player.root.position.z+70)/140*100,4,96),o=currentObjective();
   ui.panelBody.innerHTML='<div class="map-board"><span class="map-zone forest">서쪽 숲</span><span class="map-zone city">폐허 도시</span><span class="map-zone river">강</span><span class="map-landmark camp">⌂ 야영지</span><span class="map-landmark ruins">▦ 폐허</span><span class="map-player" style="left:'+px+'%;top:'+pz+'%">●</span></div><div class="settlement-card"><b>현재 위치 · '+ui.zone.textContent+'</b><p>'+(o?'다음 목표: '+o.name+' · 약 '+Math.round(player.root.position.distanceTo(o.pos))+'m':'오늘의 주요 목표를 모두 해결했습니다.')+'</p><p>강은 동쪽을 남북으로 가로지르고, 다리는 중앙 도로에 있습니다. 폭우 때에는 강폭이 넓어집니다.</p></div>';return
 }
 const residentRows=Object.entries(game.residents||{}).filter(([,r])=>r?.rescued).map(([id,r])=>'<div class="resident-row"><b>'+RESIDENTS[id].icon+' '+RESIDENTS[id].name+'</b><span>'+(r.job?(JOBS[r.job]?.name||r.job):'역할 미정')+(r.job===RESIDENTS[id].preferred?' · 특기 일치':'')+'</span></div>').join('');
 const jobChoice=Object.entries(game.residents||{}).filter(([,r])=>r?.rescued&&!r.job).map(([rid])=>'<div class="job-choice"><h3>'+RESIDENTS[rid].name+'의 역할 정하기</h3><p>특기는 '+JOBS[RESIDENTS[rid].preferred].name+'이지만 다른 역할도 맡길 수 있습니다.</p>'+Object.entries(JOBS).map(([id,j])=>'<button data-resident="'+rid+'" data-job="'+id+'"><b>'+j.icon+' '+j.name+'</b><span>'+j.desc+(RESIDENTS[rid].preferred===id?' · 특기 보너스':'')+'</span></button>').join('')+'</div>').join('');
 const powerCard=game.flags.power?'<div class="power-card"><h3>⚡ 전력망 '+powerUse().toFixed(1)+' / '+game.powerKw.toFixed(1)+' kW</h3><p>무전 송신에는 순간적으로 0.8kW의 여유 전력이 필요합니다.</p>'+[['light','야영지 조명','.2'],['cooler','냉장 보관함','.8'],['purifier','전기 정수기','1.2']].map(([id,n,kw])=>{const exists=id==='light'||hasBuilding(id);return exists?'<button data-power="'+id+'">'+(game.powerLoads[id]?'ON':'OFF')+' · '+n+' ('+kw+'kW)</button>':''}).join('')+'</div>':'';
 ui.panelBody.innerHTML='<div class="settlement-card"><h3>한빛 야영지</h3><p>👥 인구 '+(1+residentCount())+'명 · 🤝 신뢰 '+Math.round(game.trust)+' · ❤️ 공동체 건강 '+Math.round(game.communityHealth)+' · 🛠 생산성 '+Math.round(game.productivity)+' · 🙂 사기 '+Math.round(game.morale)+'</p><p>⚡ 비상 전력 '+(game.flags.power?game.powerKw.toFixed(1)+' kW':'복구 전')+' · ⛺ 쉼터 '+game.buildings.filter(b=>b.id==='shelter').length+' · 🌱 텃밭 '+game.buildings.filter(b=>b.id==='farm').length+'</p><div class="resident-list">'+(residentRows||'<p>아직 혼자입니다. 구조 신호를 찾아보세요.</p>')+'</div><p>'+(game.distribution?'배분 원칙: '+distributionName(game.distribution):'배분 원칙은 아직 정하지 않았습니다.')+'</p></div>'+powerCard+jobChoice;
 ui.panelBody.querySelectorAll('[data-job]').forEach(b=>b.addEventListener('click',()=>assignJob(b.dataset.resident,b.dataset.job)));ui.panelBody.querySelectorAll('[data-power]').forEach(b=>b.addEventListener('click',()=>togglePowerLoad(b.dataset.power)))
}
function itemHint(id){return {dirtyWater:'바로 마시기 안전하지 않을 수 있습니다.',chemWater:'공장 주변에서 얻었습니다. 끓인다고 반드시 안전해지는 것은 아닙니다.',cleanWater:'갈증을 회복합니다.',spoiledFood:'먹지 않는 것이 좋습니다. 음식 보관의 중요성을 보여주는 흔적입니다.',wood:'불과 건축의 기본 자원입니다.',stone:'도구와 모닥불에 쓰입니다.',battery:'전기 에너지 저장 장치입니다.',scrap:'기계 제작에 쓸 수 있습니다.',cloth:'쉼터와 생활용품 재료입니다.',axe:'나무 채집량이 증가합니다.'}[id]||'생존에 사용할 수 있는 물자입니다.'}
function craft(id){if(id!=='axe')return;if(!has({wood:3,stone:2}))return toast('재료가 부족합니다.','warn');pay({wood:3,stone:2});game.inv.axe=1;flag('axe');toast('🪓 돌도끼를 만들었습니다.');renderOpenPanel();save()}
function beginBuild(id){const d=BUILD[id];if(!d||!has(d.cost))return toast('재료가 부족합니다.','warn');buildMode=id;closePanel();makeGhost(id);toast('건축 위치 선택 · 마우스로 방향을 보고 E로 설치 · Esc 취소')}
function makeGhost(id){cancelGhost();const d=BUILD[id];ghost=new THREE.Mesh(id==='campfire'?new THREE.CylinderGeometry(1,.9,.25,12):new THREE.BoxGeometry(id==='shelter'?3.8:2.2,id==='shelter'?2.7:1.1,id==='shelter'?3:1.4),new THREE.MeshBasicMaterial({color:0x63e895,transparent:true,opacity:.38,depthWrite:false}));if(id!=='campfire')ghost.position.y=id==='shelter'?1.35:.55;groups.dynamic.add(ghost)}
function updateGhost(){if(!ghost||!buildMode)return;const f=tmp.set(Math.sin(camYaw),0,Math.cos(camYaw)).multiplyScalar(-5.2);ghost.position.x=Math.round(player.root.position.x+f.x);ghost.position.z=Math.round(player.root.position.z+f.z);ghost.position.y=terrainHeight(ghost.position.x,ghost.position.z)+(buildMode==='shelter'?1.35:(buildMode==='workbench'||buildMode==='cooler'||buildMode==='purifier')?.55:buildMode==='farm'?.09:0);const valid=canBuild(ghost.position,BUILD[buildMode]);ghost.userData.valid=valid;ghost.material.color.setHex(valid?0x63e895:0xff6b6b)}
function canBuild(pos,d){if(Math.abs(pos.x-RIVER_X)<8||new THREE.Vector2(pos.x-CAMP.x,pos.z-CAMP.z).length()>28||blockedAt(pos.x,pos.z))return false;return !placed.some(p=>Math.hypot(p.position.x-pos.x,p.position.z-pos.z)<d.radius+(BUILD[p.userData.interactable?.building]?.radius||1))}
function cancelGhost(){if(ghost){groups.dynamic.remove(ghost);ghost.geometry.dispose();ghost.material.dispose();ghost=null}}
function cancelBuild(){buildMode=null;cancelGhost();toast('건축을 취소했습니다.')}
async function confirmBuild(){if(!buildMode||!ghost?.userData.valid)return toast('여기에는 설치하기 어렵습니다.','warn');const id=buildMode,d=BUILD[id];if(!has(d.cost)){cancelBuild();return toast('재료가 부족합니다.','warn')}pay(d.cost);const pos=ghost.position.clone();cancelGhost();buildMode=null;const state={id,x:pos.x,z:pos.z,planted:false,growth:0};game.buildings.push(state);await spawnPlaced(id,pos,state);flag(id);if(id==='shelter')discover('insulation');if(id==='campfire')discover('combustion');toast(d.icon+' '+d.name+' 설치 완료');save()}
async function spawnPlaced(id,pos,state=null){const d=BUILD[id],r=new THREE.Group();r.position.copy(pos);r.position.y=terrainHeight(pos.x,pos.z);groups.buildings.add(r);placed.push(r);
 const labels={campfire:'모닥불 사용',shelter:'쉼터에서 쉬기',workbench:'작업대 사용',farm:'텃밭 관리',cooler:'냉장 보관함 확인',purifier:'전기 정수기 사용'};r.userData.interactable={type:'placed',label:labels[id]||d.name+' 사용',building:id};r.userData.buildState=state;interactables.push(r);let f=id==='campfire'?new THREE.Mesh(new THREE.CylinderGeometry(.9,.8,.25,12),new THREE.MeshStandardMaterial({color:0x76523a})):id==='farm'?new THREE.Mesh(new THREE.BoxGeometry(4,.18,3.2),new THREE.MeshStandardMaterial({color:0x6a4b32})):new THREE.Mesh(new THREE.BoxGeometry(id==='shelter'?3.5:2.2,id==='shelter'?2.6:1.1,id==='shelter'?2.8:1.3),new THREE.MeshStandardMaterial({color:id==='shelter'?0x9b8964:0x74553b}));f.position.y=id==='campfire'?.15:id==='farm'?.09:(id==='shelter'?1.3:.55);r.add(f);const o=await model('../../assets/game/3d/survival/kenney-survival-kit/'+d.model);if(o){r.clear();normalize(o,id==='shelter'?4:id==='campfire'?1.8:id==='farm'?3.5:2.2);r.add(o)}}
async function restoreBuildings(){for(const p of placed)groups.buildings.remove(p);placed.length=0;for(let i=interactables.length-1;i>=0;i--)if(interactables[i].userData.interactable?.building)interactables.splice(i,1);for(const b of game.buildings)await spawnPlaced(b.id,new THREE.Vector3(b.x,terrainHeight(b.x,b.z),b.z),b)}
function updateMission(){if(!game)return;const m=MISSIONS[Math.min(7,game.day)];ui.missionTitle.textContent=m.title;ui.missionText.textContent=m.text;ui.missionSteps.innerHTML=m.steps.map(([id,label])=>'<span class="'+(game.flags[id]?'done':'')+'">'+(game.flags[id]?'✓':'○')+' '+label+'</span>').join('');ui.missionKicker.textContent=missionDone()&&game.day<7?'오늘의 목표 완료 · 쉬면 다음 날':'오늘의 생존 목표'}
function togglePowerLoad(id){
 if(!game.flags.power||!(id in game.powerLoads))return;game.powerLoads[id]=!game.powerLoads[id];if(powerUse()>game.powerKw+.001){game.powerLoads[id]=false;toast('⚡ 발전 용량을 넘습니다. 다른 장치를 먼저 꺼 주세요.','warn');return}syncPowerVisual();save();renderOpenPanel()
}
function updateFarms(dt){
 const gameMinutes=dt*(1440/DAY_SECONDS);for(const b of game.buildings||[])if(b.id==='farm'&&b.planted)b.growth=Math.min(360,(b.growth||0)+gameMinutes*(getWeather()==='rain'?1.25:1))
}
function spoilFood(){
 if(devicePowered('cooler')){discover('foodPreservation');return 0}if((game.inv.potato||0)<1)return 0;
 const lost=Math.min(game.inv.potato,Math.max(1,Math.floor(game.inv.potato*.25)));game.inv.potato-=lost;game.inv.spoiledFood=(game.inv.spoiledFood||0)+lost;return lost
}
function advanceDay(){
 if(game.day>=7)return;game.day++;game.time=420;game.hunger=clamp(game.hunger-12,0,100);game.thirst=clamp(game.thirst-10,0,100);
 const tech=jobPower('technician'),gather=jobPower('gatherer'),medic=jobPower('medic');if(tech)game.inv.scrap+=Math.max(1,Math.floor(tech));if(gather){game.inv.wood+=Math.max(1,Math.floor(gather*2));game.inv.stone+=Math.max(1,Math.floor(gather))}if(medic)game.health=clamp(game.health+Math.round(12*medic),0,100);
 const spoiled=spoilFood();player.root.position.copy(CAMP);player.root.position.y=terrainHeight(CAMP.x,CAMP.z);applyDayStart();save();toast('🌅 멸망 '+game.day+'일째.'+(spoiled?' 냉장되지 않은 감자 '+spoiled+'개가 상했습니다.':'')+(tech||gather||medic?' 주민들의 역할 효과가 적용되었습니다.':''),'normal',4)
}
function applyDayStart(){
 for(const [id,rdef] of Object.entries(RESIDENTS)){const state=game.residents?.[id],field=scene.userData.survivorNodes?.[id],camp=scene.userData.campResidents?.[id];if(field)field.visible=game.day>=5&&!state?.rescued;if(camp)camp.visible=!!state?.rescued}
 if(game.day===6&&!game.flags.choice)setTimeout(()=>ui.decision.classList.remove('hidden'),800);if(game.day>=7){discover('riverSettlement');toast('⚠️ 폭우 경보 · 강 수위가 실제로 상승하기 시작합니다.','warn',4)}syncPowerVisual();updateMission()}
function chooseDistribution(c){
 const effect={
  equal:{trust:6,health:-2,productivity:0,morale:7,note:'불만은 적지만 몸이 약한 사람에게는 몫이 부족했습니다.'},
  need:{trust:2,health:8,productivity:-3,morale:2,note:'건강은 좋아졌지만 일할 수 있는 사람의 몫이 줄어 생산성이 조금 낮아졌습니다.'},
  work:{trust:-3,health:0,productivity:9,morale:-4,note:'생산성은 높아졌지만 일부 주민이 배분을 불공평하게 느꼈습니다.'}
 }[c];if(!effect)return;
 game.distribution=c;game.trust=clamp(game.trust+effect.trust,0,100);game.communityHealth=clamp(game.communityHealth+effect.health,0,100);game.productivity=clamp(game.productivity+effect.productivity,0,100);game.morale=clamp(game.morale+effect.morale,0,100);
 discover('scarcity');discover('community');ui.decision.classList.add('hidden');flag('choice');toast('배분 결과 · '+effect.note,'normal',4.5);save()
}
function distributionName(c){return c==='equal'?'같은 양':c==='need'?'필요에 따라':c==='work'?'노동량 고려':'미정'}
function readyFlood(){return game.inv.cleanWater>=2&&(game.inv.food+game.inv.cookedPotato)>=2&&game.buildings.some(b=>b.id==='shelter')&&!!game.flags.power}
function derived(){if(game.day>=2&&game.inv.axe)flag('axe');if(game.day>=3&&getWeather()==='rain'){const s=placed.find(p=>p.userData.interactable?.building==='shelter');if(s&&player.root.position.distanceTo(s.position)<5)flag('rain')}if(game.day>=4&&player.root.position.distanceTo(RUINS)<15)flag('ruins');if(game.day>=6&&game.inv.cleanWater>=2&&(game.inv.food+game.inv.cookedPotato)>=2)flag('stock');if(game.day>=7&&readyFlood())flag('ready')}
function getWeather(){if(game.day===3&&game.time>=480)return'rain';if(game.day>=7)return'rain';return game.day===6?'cloud':'clear'}
function updateWeather(dt){
 const w=getWeather(),flood=game.day>=7?clamp((game.time-420)/600,0,1):0;game.floodLevel=flood;
 const river=scene.userData.river;if(river){river.scale.x=damp(river.scale.x,1+flood*.7,2.2,dt);river.position.y=damp(river.position.y,.08+flood*.28,2.2,dt);river.material.opacity=.84+flood*.1}
 ui.weather.textContent=w==='rain'?(game.day>=7?'🌧 폭우 · 수위 '+Math.round(flood*100)+'%':'🌧 비'):w==='cloud'?'☁ 흐림':'☀ 맑음';
 const t=w==='rain'?new THREE.Color(0x526b78):w==='cloud'?new THREE.Color(0x91a7ad):new THREE.Color(0x9ac8da);scene.background.lerp(t,dt*.35);scene.fog.color.copy(scene.background);scene.userData.sun.intensity=damp(scene.userData.sun.intensity,w==='rain'?.7:2.3,1.5,dt);
 if(w==='rain'){while(groups.weather.children.length<80){const r=new THREE.Mesh(new THREE.BoxGeometry(.025,.65,.025),new THREE.MeshBasicMaterial({color:0xb9def1,transparent:true,opacity:.5}));r.position.set(Math.random()*34-17,Math.random()*18+3,Math.random()*34-17);groups.weather.add(r)}for(const r of groups.weather.children){r.position.y-=dt*18;if(r.position.y<0)r.position.y=20;r.position.x=player.root.position.x+(r.position.x-player.root.position.x)*.96;r.position.z=player.root.position.z+(r.position.z-player.root.position.z)*.96}}else groups.weather.clear()
}
function updateNeeds(dt){game.playSeconds+=dt;game.time+=dt*(1440/DAY_SECONDS);if(game.time>=1430){game.time=1430;if(missionDone()&&game.day<7&&Math.floor(game.playSeconds)%8===0)toast('오늘의 목표를 마쳤습니다. 캠프나 쉼터에서 쉬어 다음 날로 넘어가세요.')}
 const move=player.speed>1;game.hunger=clamp(game.hunger-dt*(move?.055:.035),0,100);game.thirst=clamp(game.thirst-dt*(move?.085:.052),0,100);const s=placed.find(p=>p.userData.interactable?.building==='shelter'),covered=s&&player.root.position.distanceTo(s.position)<4.8,target=getWeather()==='rain'&&!covered?35.5:36.6;game.temp=damp(game.temp,target,.05,dt);if(game.hunger<=0||game.thirst<=0||game.temp<35.2)game.health=clamp(game.health-dt*.7,0,100);else if(game.hunger>40&&game.thirst>40)game.health=clamp(game.health+dt*(jobPower('medic')?.025+.025),0,100);if(game.health<=0){game.health=60;game.hunger=Math.max(25,game.hunger);game.thirst=Math.max(25,game.thirst);player.root.position.copy(CAMP);toast('구조되었습니다. 발견한 지식은 유지됩니다. 캠프로 돌아왔습니다.','danger',4)}derived()}
function updateResources(dt){resources.forEach(r=>{if(!r.userData.available){r.userData.respawn-=dt;if(r.userData.respawn<=0){r.userData.available=true;r.visible=true}}})}
function updateNpc(){
 if(!game)return;let i=0;for(const [id,n] of Object.entries(scene?.userData?.campResidents||{})){if(!n?.visible)continue;const a=game.playSeconds*(.16+i*.025)+i*2.1,base=RESIDENTS[id].camp;n.position.x=base.x+Math.sin(a)*1.45;n.position.z=base.z+Math.cos(a*.82)*1.25;n.position.y=terrainHeight(n.position.x,n.position.z);n.rotation.y=a+Math.PI*.5;i++}
}
function currentObjective(){
 if(!game)return null;const nearestBuilding=id=>placed.find(p=>p.userData.interactable?.building===id)?.position||CAMP;
 if(game.day===1){if(!game.flags.water)return{name:'강',pos:new THREE.Vector3(RIVER_X-6.3,0,5)};if(!game.flags.boil)return{name:'비상 버너',pos:new THREE.Vector3(2,0,9.4)};if(!game.flags.drink)return{name:'깨끗한 물 마시기',pos:CAMP}}
 if(game.day===2){if(!game.flags.axe)return{name:'서쪽 숲·바위',pos:new THREE.Vector3(-12,0,2)};if(!game.flags.campfire)return{name:'캠프 건축 구역',pos:CAMP};if(!game.flags.cook)return{name:'모닥불',pos:nearestBuilding('campfire')}}
 if(game.day===3){if(!game.flags.shelter)return{name:'캠프 건축 구역',pos:CAMP};if(!game.flags.rain)return{name:'쉼터',pos:nearestBuilding('shelter')}}
 if(game.day===4){if(!game.flags.ruins)return{name:'폐허 도시',pos:RUINS};if(!game.flags.battery)return{name:'보급 상자',pos:new THREE.Vector3(42,0,-29)};if(!game.flags.power)return{name:'비상 배전반',pos:POWER_STATION}}
 if(game.day===5){if(!game.flags.rescue)return{name:'구조 요청',pos:SURVIVOR_POS};if(!game.flags.job)return{name:'정착지 태블릿',pos:CAMP}}
 if(game.day===6){if(!game.flags.choice)return{name:'공동체 회의',pos:CAMP};if(!game.flags.stock)return{name:'비상 물자 비축',pos:CAMP}}
 if(game.day===7){if(!game.flags.ready)return{name:'폭우 대비',pos:CAMP};if(!game.flags.radio)return{name:'비상 무전기',pos:new THREE.Vector3(-4,0,12)}}
 return null
}
function updateUI(){if(!game)return;ui.health.textContent=Math.round(game.health);ui.hunger.textContent=Math.round(game.hunger);ui.thirst.textContent=Math.round(game.thirst);ui.temp.textContent=game.temp.toFixed(1);ui.hotWater.textContent=game.inv.cleanWater;ui.hotFood.textContent=game.inv.food+game.inv.cookedPotato;ui.hotAxe.textContent=game.inv.axe?'✓':'-';ui.hotItems.textContent=Object.values(game.inv).reduce((a,b)=>a+b,0);const m=Math.floor(game.time),h=Math.floor(m/60),mm=m%60;ui.day.textContent='멸망 '+game.day+'일째';ui.clock.textContent=String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0');const p=player.root.position;if(Math.abs(p.x-RIVER_X)<10)ui.zone.textContent='강변';else if(p.distanceTo(RUINS)<19)ui.zone.textContent='폐허 도시';else if(p.x<-18)ui.zone.textContent='서쪽 숲';else ui.zone.textContent='학교 야영지';const o=currentObjective();ui.bearing.textContent=o?'목표 · '+o.name+' '+Math.round(p.distanceTo(o.pos))+'m':'캠프 '+Math.round(p.distanceTo(CAMP))+'m';updateMission()}
function finish(){if(game.finished)return;game.finished=true;save();running=false;ui.hud.classList.add('hidden');ui.ending.classList.remove('hidden');ui.endingText.textContent=(1+residentCount())+'명이 함께 살아남았습니다. 과학·사회 지식 '+game.knowledge.length+'개를 발견하고 '+game.buildings.length+'개의 시설을 세웠습니다.';ui.endingStats.innerHTML='<div><b>'+(1+residentCount())+'</b><small>인구</small></div><div><b>'+game.knowledge.length+'</b><small>발견 지식</small></div><div><b>'+game.buildings.length+'</b><small>시설</small></div><div><b>'+Math.round(game.trust)+'</b><small>신뢰</small></div>';window.KidscadeGame?.gameOver?.({score:game.knowledge.length*500+game.buildings.length*200+Math.round(game.trust)*10,day:7})}
async function start(freshRun){game=freshRun?withOldKnowledge(fresh()):withOldKnowledge(load()||fresh());camYaw=game.yaw||Math.PI;player.root.position.set(game.pos?.x||0,terrainHeight(game.pos?.x||0,game.pos?.z??8),game.pos?.z??8);game.survivors=residentCount();ui.start.classList.add('hidden');ui.ending.classList.add('hidden');ui.hud.classList.remove('hidden');running=true;paused=false;await restoreBuildings();applyDayStart();syncPowerVisual();updateUI();window.KidscadeGame?.start?.({day:game.day});toast('E 상호작용 · C 제작 · B 건축 · TAB 생존 태블릿','normal',4)}
function resize(){renderer?.setSize(innerWidth,innerHeight,false);if(camera){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}}
function loop(){requestAnimationFrame(loop);if(!renderer)return;const dt=Math.min(.05,clock.getDelta());if(running&&!paused){updatePlayer(dt);updateCamera(dt);updateInteract();updateGhost();updateNeeds(dt);updateResources(dt);updateFarms(dt);updateNpc();updateWeather(dt);if(performance.now()-lastSave>20000){lastSave=performance.now();save()}if(toastT>0){toastT-=dt;if(toastT<=0)ui.toast.classList.remove('show')}updateUI()}else updateCamera(dt);renderer.render(scene,camera)}
async function boot(){init3D();ui.loadingText.textContent='기존 Kidscade 생존 에셋을 연결하고 있어요.';await Promise.all(['campfire-pit.glb','structure.glb','workbench.glb'].map(f=>model('../../assets/game/3d/survival/kenney-survival-kit/'+f)));ui.loading.classList.add('hidden');ui.continueGame.disabled=!load();ui.continueGame.textContent=load()?'이어하기':'저장된 생존 없음';ui.newGame.addEventListener('click',()=>{localStorage.removeItem(SAVE);start(true)});ui.continueGame.addEventListener('click',()=>load()&&start(false));ui.restartGame.addEventListener('click',()=>{ui.ending.classList.add('hidden');localStorage.removeItem(SAVE);start(true)});window.KidscadeGame?.registerPauseHandlers?.({pause(){paused=true},resume(){paused=false;clock.getDelta()}});loop()}
boot().catch(err=>{console.error(err);ui.loadingText.textContent='월드를 준비하지 못했습니다. 새로고침해 주세요.';window.KidscadeGame?.reportError?.(err,{code:'APOCALYPSE_BOOT',fatal:true})});