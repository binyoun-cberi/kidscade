import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DATA=window.CodeQuestData;
const RuntimeAPI=window.CodeQuestRuntime;
if(!DATA||!RuntimeAPI)throw new Error('Code Quest data/runtime missing');

const $=function(id){return document.getElementById(id);};
const SAVE_KEY='kidscade_game_v1:high_code_quest:progress_v1';
const CELL=1.18;
const BLOCKS=DATA.blocks;
const missions=DATA.missions;
const canvas=$('world');

let progress=loadProgress();
let missionIndex=0;
let mission=null;
let worldState=null;
let mainProgram=[];
let functionProgram=[];
let codeTarget='main';
let insertPath=[];
let nodeSeq=0;
let failures=0;
let stepSession=false;
let cleared=false;
let toastTimer=0;
let worldToken=0;
let executingNodeId='';
let errorNodeId='';

function loadProgress(){
 try{
  const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
  return {unlocked:Math.max(1,Number(raw.unlocked)||1),completed:raw.completed||{},best:raw.best||{},current:Number(raw.current)||0,programs:raw.programs||{}};
 }catch(_){return {unlocked:1,completed:{},best:{},current:0,programs:{}};}
}
function saveProgress(){
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch(_){}
}
function clone(v){return JSON.parse(JSON.stringify(v));}
function makeId(){nodeSeq++;return 'n'+nodeSeq;}
function normalizeNodes(list){
 return (list||[]).map(function(n){
  const x={id:n.id||makeId(),type:n.type};
  if(Array.isArray(n.body))x.body=normalizeNodes(n.body);
  return x;
 });
}
function currentStore(){
 if(!progress.programs[missionIndex])progress.programs[missionIndex]={main:[],fn:[]};
 return progress.programs[missionIndex];
}
function persistCode(){
 const slot=currentStore();
 slot.main=clone(mainProgram);
 slot.fn=clone(functionProgram);
 progress.current=missionIndex;
 saveProgress();
}
function sound(key){try{window.KidscadeGame&&window.KidscadeGame.sound&&window.KidscadeGame.sound(key);}catch(_){}}
function toast(text,bad){
 const el=$('toast');el.textContent=text;el.classList.add('show');el.style.background=bad?'#ffe2e2':'#eef7ff';
 clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove('show');},1500);
}
function setExec(title,detail,mode){
 $('execTitle').textContent=title;
 $('execDetail').textContent=detail||'';
 $('execBar').classList.toggle('running',mode==='running');
 $('execBar').classList.toggle('error',mode==='error');
 $('execIcon').textContent=mode==='running'?'▶':mode==='error'?'!':'●';
}

const renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0b1624);
scene.fog=new THREE.Fog(0x0b1624,10,22);
const camera=new THREE.OrthographicCamera(-6,6,4,-4,0.1,50);
camera.position.set(7.5,8.5,9.5);
camera.lookAt(0,0,0);
const hemi=new THREE.HemisphereLight(0xbfe9ff,0x172218,1.45);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1cf,2.25);sun.position.set(6,10,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;

const worldRoot=new THREE.Group();scene.add(worldRoot);
const boardRoot=new THREE.Group();worldRoot.add(boardRoot);
const entityRoot=new THREE.Group();worldRoot.add(entityRoot);
const decoRoot=new THREE.Group();worldRoot.add(decoRoot);
const loader=new GLTFLoader();
const assetCache=new Map();

function loadAsset(url){
 if(assetCache.has(url))return assetCache.get(url);
 const promise=new Promise(function(resolve){
  loader.load(url,function(g){resolve(g.scene);},undefined,function(){resolve(null);});
 });
 assetCache.set(url,promise);return promise;
}
function fitObject(obj,targetHeight){
 const box=new THREE.Box3().setFromObject(obj);
 const size=new THREE.Vector3();box.getSize(size);
 const h=Math.max(.001,size.y);
 const s=targetHeight/h;obj.scale.multiplyScalar(s);
 box.setFromObject(obj);
 const center=new THREE.Vector3();box.getCenter(center);
 obj.position.x-=center.x;obj.position.z-=center.z;
 obj.position.y-=box.min.y;
 obj.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return obj;
}
function pos3(x,y,height){
 const wx=(x-(mission.w-1)/2)*CELL;
 const wz=(y-(mission.h-1)/2)*CELL;
 return new THREE.Vector3(wx,height||.15,wz);
}
function clearGroup(group){
 while(group.children.length){
  const child=group.children.pop();
  child.traverse&&child.traverse(function(o){
   if(o.geometry&&o.userData&&o.userData.disposeGeometry)o.geometry.dispose();
  });
 }
}
function mat(color,emissive){
 return new THREE.MeshStandardMaterial({color:color,roughness:.78,metalness:.04,emissive:emissive||0x000000,emissiveIntensity:.2});
}
function meshBox(w,h,d,color){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.castShadow=true;m.receiveShadow=true;m.userData.disposeGeometry=true;return m;
}
function makePlayer(){
 const g=new THREE.Group();
 const body=meshBox(.42,.55,.35,0x4f8cff);body.position.y=.38;g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.25,16,12),mat(0xffd1a6));head.position.y=.82;head.castShadow=true;head.userData.disposeGeometry=true;g.add(head);
 const arrow=new THREE.Mesh(new THREE.ConeGeometry(.12,.36,5),mat(0x75f2d1));arrow.rotation.x=Math.PI/2;arrow.position.set(0,.55,-.34);arrow.userData.disposeGeometry=true;g.add(arrow);
 return g;
}
const playerObj=makePlayer();entityRoot.add(playerObj);
let modelPlayer=null;
loadAsset('../../assets/game/characters/people/character-male-a.glb').then(function(asset){
 if(!asset)return;
 modelPlayer=fitObject(asset.clone(true),1.05);
 playerObj.children.forEach(function(c){c.visible=false;});
 playerObj.add(modelPlayer);
});

const enemyUrls={
 blob:'../../assets/game/3d/characters/monsters/ultimate-monsters-bundle/green-blob.glb',
 mush:'../../assets/game/3d/characters/monsters/ultimate-monsters-bundle/mushnub.glb',
 ghost:'../../assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost.glb',
 golem:'../../assets/game/3d/characters/monsters/ultimate-monsters-bundle/goleling-evolved.glb'
};

function makeEnemyVisual(enemy,token){
 const group=new THREE.Group();
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(.34,16,12),mat(enemy.type==='golem'?0x8d9dad:enemy.type==='ghost'?0xa78bfa:0x70d899));
 sphere.position.y=.38;sphere.castShadow=true;sphere.userData.disposeGeometry=true;group.add(sphere);
 const eyeMat=new THREE.MeshBasicMaterial({color:0xffffff});
 [-.12,.12].forEach(function(x){const e=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),eyeMat);e.position.set(x,.43,-.3);group.add(e);});
 enemy.obj=group;entityRoot.add(group);group.position.copy(pos3(enemy.x,enemy.y,.12));
 const url=enemyUrls[enemy.type];
 if(url)loadAsset(url).then(function(asset){
  if(!asset||token!==worldToken||enemy.dead)return;
  const cloneObj=fitObject(asset.clone(true),enemy.type==='golem'?1.15:.78);
  group.children.forEach(function(c){c.visible=false;});
  group.add(cloneObj);
 });
}
function buildDecor(token){
 const url='../../assets/game/3d/nature/kenney-nature-kit/tree-default.glb';
 loadAsset(url).then(function(asset){
  if(!asset||token!==worldToken)return;
  const points=[[-1.2,-1],[-1.2,1],[1.2,-1],[1.2,1]];
  points.forEach(function(p,i){
   const o=fitObject(asset.clone(true),1.8+(i%2)*.3);
   const sx=((mission.w/2)+1.2)*CELL*p[0];
   const sz=((mission.h/2)+.8)*CELL*p[1];
   o.position.set(sx,0,sz);o.rotation.y=i*.9;decoRoot.add(o);
  });
 });
}

function applyVariant(m){
 const copy=clone(m);
 if(copy.variants&&copy.variants.length){
  const v=copy.variants[(Number(progress.best['variant_'+missionIndex])||0)%copy.variants.length];
  copy.enemies=v.map(function(p){return {x:p[0],y:p[1],type:'blob',hp:1,behavior:'guard'};});
 }
 return copy;
}
function buildWorld(){
 worldToken++;const token=worldToken;
 clearGroup(boardRoot);
 entityRoot.children.slice().forEach(function(c){if(c!==playerObj)entityRoot.remove(c);});
 clearGroup(decoRoot);
 mission=applyVariant(missions[missionIndex]);
 worldState={
  x:mission.start[0],y:mission.start[1],dir:mission.dir,hp:5,crystals:0,
  walls:new Set((mission.walls||[]).map(function(p){return p[0]+','+p[1];})),
  crystals:(mission.crystals||[]).map(function(p){return {x:p[0],y:p[1],taken:false,obj:null};}),
  doors:(mission.doors||[]).map(function(d){return {x:d.x,y:d.y,need:d.need||0,open:false,obj:null};}),
  enemies:(mission.enemies||[]).map(function(e){return Object.assign({},e,{dead:false,maxHp:e.hp,obj:null});})
 };
 const groundMat=mat(0x163149);
 const altMat=mat(0x193954);
 for(let y=0;y<mission.h;y++)for(let x=0;x<mission.w;x++){
  const tile=new THREE.Mesh(new THREE.BoxGeometry(CELL*.94,.12,CELL*.94),(x+y)%2?groundMat:altMat);
  tile.position.copy(pos3(x,y,0));tile.receiveShadow=true;tile.userData.disposeGeometry=true;boardRoot.add(tile);
 }
 (mission.walls||[]).forEach(function(p){
  const rock=meshBox(CELL*.82,.8,CELL*.82,0x42566a);rock.position.copy(pos3(p[0],p[1],.45));boardRoot.add(rock);
 });
 const goal=new THREE.Mesh(new THREE.CylinderGeometry(.34,.46,.08,20),new THREE.MeshStandardMaterial({color:0x5eead4,emissive:0x1f9c88,emissiveIntensity:.8}));
 goal.position.copy(pos3(mission.goal[0],mission.goal[1],.13));goal.userData.disposeGeometry=true;boardRoot.add(goal);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.35,.035,8,24),new THREE.MeshBasicMaterial({color:0xbaffef}));
 ring.rotation.x=Math.PI/2;ring.position.copy(pos3(mission.goal[0],mission.goal[1],.22));ring.userData.disposeGeometry=true;goal.add(ring);
 worldState.crystals.forEach(function(c){
  const o=new THREE.Mesh(new THREE.OctahedronGeometry(.25),new THREE.MeshStandardMaterial({color:0x6de7ff,emissive:0x2c93c2,emissiveIntensity:.75,roughness:.25}));
  o.position.copy(pos3(c.x,c.y,.38));o.castShadow=true;o.userData.disposeGeometry=true;c.obj=o;entityRoot.add(o);
 });
 worldState.doors.forEach(function(d){
  const o=meshBox(.16,1.05,CELL*.78,0xc89e58);o.position.copy(pos3(d.x,d.y,.58));d.obj=o;entityRoot.add(o);
 });
 worldState.enemies.forEach(function(e){makeEnemyVisual(e,token);});
 playerObj.position.copy(pos3(worldState.x,worldState.y,.12));playerObj.rotation.y=dirRotation(worldState.dir);
 playerObj.visible=true;
 buildDecor(token);
 updateHUD();
 fitCamera();
 setExec('코드를 만들고 실행해 보세요.','실행은 항상 시작 위치에서 출발합니다.','idle');
 executingNodeId='';errorNodeId='';renderProgram();
}
function dirRotation(dir){return [-Math.PI/2,0,Math.PI/2,Math.PI][dir]||0;}
function delta(dir){return [[0,-1],[1,0],[0,1],[-1,0]][dir];}
function ahead(){
 const d=delta(worldState.dir);return {x:worldState.x+d[0],y:worldState.y+d[1]};
}
function enemyAt(x,y){return worldState.enemies.find(function(e){return !e.dead&&e.x===x&&e.y===y;});}
function doorAt(x,y){return worldState.doors.find(function(d){return !d.open&&d.x===x&&d.y===y;});}
function crystalAt(x,y){return worldState.crystals.find(function(c){return !c.taken&&c.x===x&&c.y===y;});}
function blocked(x,y){
 if(x<0||y<0||x>=mission.w||y>=mission.h)return true;
 if(worldState.walls.has(x+','+y))return true;
 if(doorAt(x,y))return true;
 if(enemyAt(x,y))return true;
 return false;
}
function tween(duration,update){
 return new Promise(function(resolve){
  const start=performance.now();
  function frame(now){
   const t=Math.min(1,(now-start)/duration);const q=1-Math.pow(1-t,3);update(q);
   if(t<1)requestAnimationFrame(frame);else resolve();
  }requestAnimationFrame(frame);
 });
}
async function movePlayer(x,y){
 const a=playerObj.position.clone(),b=pos3(x,y,.12);
 await tween(220,function(t){playerObj.position.lerpVectors(a,b,t);playerObj.position.y=.12+Math.sin(t*Math.PI)*.12;});
 worldState.x=x;worldState.y=y;
}
async function turnPlayer(dir){
 const start=playerObj.rotation.y,end=dirRotation(dir);
 let diff=end-start;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
 await tween(160,function(t){playerObj.rotation.y=start+diff*t;});worldState.dir=dir;
}
async function hitEnemy(e){
 if(!e.obj)return;
 const base=e.obj.scale.clone();
 await tween(120,function(t){const s=1+Math.sin(t*Math.PI)*.28;e.obj.scale.set(base.x*s,base.y*(1-.18*Math.sin(t*Math.PI)),base.z*s);});
 e.obj.scale.copy(base);
}
function fadeRemove(obj){
 if(!obj)return Promise.resolve();
 return tween(180,function(t){obj.scale.setScalar(Math.max(.001,1-t));obj.position.y=.12+t*.7);}).then(function(){entityRoot.remove(obj);});
}
const worldAPI={
 checkCondition:function(cond){
  const a=ahead();
  if(cond==='enemyAhead')return Boolean(enemyAt(a.x,a.y));
  if(cond==='wallAhead')return a.x<0||a.y<0||a.x>=mission.w||a.y>=mission.h||worldState.walls.has(a.x+','+a.y)||Boolean(doorAt(a.x,a.y));
  if(cond==='crystals3')return worldState.crystals>=3;
  return false;
 },
 applyAction:async function(type){
  errorNodeId='';
  const a=ahead();
  if(type==='FWD'){
   if(blocked(a.x,a.y))return {ok:false,message:enemyAt(a.x,a.y)?'앞에 적이 있어요. 먼저 공격해야 해요.':'앞이 막혀 있어요. 방향이나 조건을 확인해 보세요.'};
   await movePlayer(a.x,a.y);sound('ui.tick');updateHUD();return {ok:true};
  }
  if(type==='LEFT'){await turnPlayer((worldState.dir+3)%4);sound('ui.select');return {ok:true};}
  if(type==='RIGHT'){await turnPlayer((worldState.dir+1)%4);sound('ui.select');return {ok:true};}
  if(type==='ATTACK'){
   const e=enemyAt(a.x,a.y);if(!e)return {ok:false,message:'공격할 적이 바로 앞에 없어요.'};
   e.hp--;await hitEnemy(e);sound('combat.impact_heavy');
   if(e.hp<=0){e.dead=true;await fadeRemove(e.obj);toast('버그 몬스터 제거!');}
   return {ok:true};
  }
  if(type==='COLLECT'){
   const c=crystalAt(worldState.x,worldState.y);if(!c)return {ok:false,message:'이 칸에는 주울 수정이 없어요.'};
   c.taken=true;worldState.crystals++;await fadeRemove(c.obj);sound('collect.coin_pickup');updateHUD();return {ok:true};
  }
  if(type==='OPEN'){
   const d=doorAt(a.x,a.y);if(!d)return {ok:false,message:'바로 앞에 닫힌 문이 없어요.'};
   if(worldState.crystals<d.need)return {ok:false,message:'수정이 '+d.need+'개 필요해요. 지금은 '+worldState.crystals+'개예요.'};
   d.open=true;sound('ui.confirm');
   if(d.obj)await tween(220,function(t){d.obj.scale.y=Math.max(.03,1-t);d.obj.position.y=.58*(1-t);});
   if(d.obj)entityRoot.remove(d.obj);return {ok:true};
  }
  return {ok:false,message:'알 수 없는 명령이에요.'};
 },
 afterPlayerAction:async function(){
  const attackers=worldState.enemies.filter(function(e){return !e.dead&&Math.abs(e.x-worldState.x)+Math.abs(e.y-worldState.y)===1;});
  if(!attackers.length)return {defeat:false};
  worldState.hp=Math.max(0,worldState.hp-attackers.length);sound('combat.hurt_voice');
  const original=playerObj.position.y;
  await tween(130,function(t){playerObj.position.x+=Math.sin(t*Math.PI*6)*.008;playerObj.position.y=original+Math.sin(t*Math.PI)*.08;});
  playerObj.position.y=original;updateHUD();
  return {defeat:worldState.hp<=0};
 },
 isComplete:function(){
  const atGoal=worldState.x===mission.goal[0]&&worldState.y===mission.goal[1];
  const enemiesDone=worldState.enemies.every(function(e){return e.dead;});
  return atGoal&&enemiesDone;
 }
};

const runtime=new RuntimeAPI.Runtime({
 world:worldAPI,delay:160,
 onEvent:function(event){
  if(event.node){executingNodeId=event.node.id;errorNodeId='';renderProgram();}
  if(event.kind==='check'){
   const def=BLOCKS[event.node.type];
   $('sensorReadout').textContent='센서: '+(event.result?'참 ✓':'거짓 ✕');
   setExec(def.label,event.result?'조건이 참이라 안쪽 코드를 실행해요.':'조건이 거짓이라 안쪽 코드를 건너뛰어요.','running');
  }else if(event.kind==='loop'){
   setExec(BLOCKS[event.node.type].label,event.index+' / '+event.total+'번째 반복','running');
  }else if(event.kind==='call'){
   setExec('나의 함수 호출','함수에 저장한 명령을 실행합니다.','running');
  }else if(event.kind==='action'){
   setExec(BLOCKS[event.node.type].label,'이 명령을 실행하는 중이에요.','running');
  }else if(event.kind==='run-stop'||event.kind==='step-stop'){
   $('runBtn').classList.remove('hidden');$('stepBtn').classList.remove('hidden');$('stopBtn').classList.add('hidden');
  }
 },
 onError:function(node,message){
  failures++;errorNodeId=node&&node.id||executingNodeId;renderProgram();sound('ui.error');
  setExec('여기서 멈췄어요',message,'error');toast(message,true);stepSession=false;
  $('runBtn').classList.remove('hidden');$('stepBtn').classList.remove('hidden');$('stopBtn').classList.add('hidden');
 },
 onDone:function(){handleMissionDone();}
});

function activeRoot(){return codeTarget==='function'?functionProgram:mainProgram;}
function memoryLimit(){return codeTarget==='function'?(mission.functionMemory||6):mission.memory;}
function resolveContainer(root,path){
 let list=root;
 for(const id of path){
  const node=list.find(function(n){return n.id===id;});
  if(!node||!Array.isArray(node.body))break;
  list=node.body;
 }
 return list;
}
function invalidateExecution(){
 runtime.stop();runtime.iterator=null;stepSession=false;executingNodeId='';errorNodeId='';setExec('코드가 바뀌었어요.','다시 실행하면 시작 위치부터 확인합니다.','idle');
}
function addBlock(type){
 if(!(mission.available||[]).includes(type)){toast('아직 잠긴 명령이에요.',true);return;}
 if(codeTarget==='function'&&type==='CALL_FN'){toast('함수 안에서 자기 자신은 부를 수 없어요.',true);return;}
 const root=activeRoot();
 const count=RuntimeAPI.countNodes(root);
 if(count>=memoryLimit()){toast('코드 메모리가 꽉 찼어요. 반복이나 함수를 써서 줄여 보세요.',true);sound('ui.error');return;}
 const def=BLOCKS[type];const node={id:makeId(),type:type};if(def.kind==='structure'||def.kind==='condition')node.body=[];
 resolveContainer(root,insertPath).push(node);
 if(node.body)insertPath=insertPath.concat(node.id);
 persistCode();invalidateExecution();renderAllEditor();sound('ui.click');
}
function removeNode(root,id){
 for(let i=0;i<root.length;i++){
  if(root[i].id===id){root.splice(i,1);return true;}
  if(root[i].body&&removeNode(root[i].body,id))return true;
 }return false;
}
function moveNode(root,id,deltaN){
 for(let i=0;i<root.length;i++){
  if(root[i].id===id){
   const ni=i+deltaN;if(ni<0||ni>=root.length)return true;
   const item=root.splice(i,1)[0];root.splice(ni,0,item);return true;
  }
  if(root[i].body&&moveNode(root[i].body,id,deltaN))return true;
 }return false;
}
function renderNodes(list,parent,path){
 if(!list.length){const empty=document.createElement('div');empty.className='program-empty';empty.textContent=path.length?'이 블록 안에 실행할 명령을 넣어 보세요.':'아래 명령을 눌러 코드를 만들어요.';parent.appendChild(empty);return;}
 list.forEach(function(node,index){
  const def=BLOCKS[node.type]||{label:node.type,kind:'action',icon:'·'};
  const el=document.createElement('div');
  el.className='node '+def.kind+(node.id===executingNodeId?' active':'')+(node.id===errorNodeId?' error':'');
  if(insertPath[insertPath.length-1]===node.id)el.classList.add('selected');
  el.dataset.nodeId=node.id;
  const row=document.createElement('div');row.className='node-main';
  const idx=document.createElement('span');idx.className='node-index';idx.textContent=String(index+1);
  const label=document.createElement('span');label.className='node-label';label.textContent=(def.icon||'')+' '+def.label;
  const controls=document.createElement('div');controls.className='node-controls';
  [['↑',-1],['↓',1]].forEach(function(pair){
   const b=document.createElement('button');b.type='button';b.textContent=pair[0];
   b.onclick=function(ev){ev.stopPropagation();moveNode(activeRoot(),node.id,pair[1]);persistCode();invalidateExecution();renderAllEditor();};controls.appendChild(b);
  });
  const del=document.createElement('button');del.type='button';del.textContent='×';del.onclick=function(ev){ev.stopPropagation();removeNode(activeRoot(),node.id);insertPath=[];persistCode();invalidateExecution();renderAllEditor();};controls.appendChild(del);
  row.append(idx,label,controls);el.appendChild(row);
  row.onclick=function(){
   if(node.body){insertPath=path.concat(node.id);renderAllEditor();toast(def.label+' 안에 명령을 추가합니다.');}
  };
  if(node.body){
   const body=document.createElement('div');body.className='node-body'+(node.body.length?'':' empty');
   renderNodes(node.body,body,path.concat(node.id));el.appendChild(body);
  }
  parent.appendChild(el);
 });
}
function renderProgram(){
 const root=$('program');root.replaceChildren();renderNodes(activeRoot(),root,[]);
 const count=RuntimeAPI.countNodes(activeRoot());
 $('blockValue').textContent=count+'/'+memoryLimit();
 $('codeModeTitle').textContent=codeTarget==='function'?'나의 함수':'메인 코드';
 const labels=insertPath.map(function(id){return findNodeLabel(activeRoot(),id);}).filter(Boolean);
 $('insertPath').textContent=labels.length?'추가 위치: '+labels.join(' › ')+' 안':'여기에 명령이 추가돼요.';
}
function findNodeLabel(list,id){
 for(const n of list){if(n.id===id)return BLOCKS[n.type].label;if(n.body){const v=findNodeLabel(n.body,id);if(v)return v;}}return '';
}
function renderPalette(){
 const root=$('palette');root.replaceChildren();
 (mission.available||[]).forEach(function(type){
  if(codeTarget==='function'&&type==='CALL_FN')return;
  const def=BLOCKS[type];const b=document.createElement('button');b.type='button';b.className=def.kind||'action';
  b.innerHTML='<b>'+def.icon+'</b>'+def.label;b.onclick=function(){addBlock(type);};root.appendChild(b);
 });
}
function renderAllEditor(){renderProgram();renderPalette();}
function updateHUD(){
 $('hpValue').textContent=worldState?worldState.hp:5;
 $('crystalValue').textContent=worldState?worldState.crystals:0;
 $('variableCrystal').textContent=worldState?worldState.crystals:0;
 $('variableHp').textContent=worldState?worldState.hp:5;
 renderProgram();
}
function missionRequirementOK(){
 if(mission.requireFunction&&!functionProgram.length)return {ok:false,message:'나의 함수 탭에 재사용할 행동을 만들어야 해요.'};
 if(mission.requireType&&!RuntimeAPI.containsType(mainProgram,mission.requireType))return {ok:false,message:'이번 임무는 '+BLOCKS[mission.requireType].label+' 블록을 사용해 해결해 보세요.'};
 return {ok:true};
}
function handleMissionDone(){
 const req=missionRequirementOK();
 if(!req.ok){
  failures++;sound('ui.error');setExec('목표에는 도착했지만…',req.message,'error');toast(req.message,true);stepSession=false;return;
 }
 if(cleared)return;cleared=true;sound('success.victory_fanfare');
 const mainCount=RuntimeAPI.countNodes(mainProgram);
 const short=mainCount<=mission.par;
 const clean=failures===0;
 progress.completed[missionIndex]=true;
 progress.unlocked=Math.max(progress.unlocked,Math.min(missions.length,missionIndex+2));
 const old=progress.best[missionIndex];
 progress.best[missionIndex]=!old||mainCount<old?mainCount:old;
 progress.current=Math.min(missions.length-1,missionIndex+1);
 progress.best['variant_'+missionIndex]=(Number(progress.best['variant_'+missionIndex])||0)+1;
 saveProgress();
 try{window.KidscadeGame&&window.KidscadeGame.score&&window.KidscadeGame.score(Object.keys(progress.completed).filter(function(k){return progress.completed[k];}).length,{unit:'임무'});}catch(_){}
 $('clearTitle').textContent=missionIndex===missions.length-1?'코드 원정대 완주!':'작동 성공!';
 $('clearText').textContent='메인 코드 '+mainCount+'블록으로 임무를 해결했어요.';
 $('shortBadge').classList.toggle('earned',short);$('shortBadge').textContent=(short?'✓':'◇')+' 짧은 코드';
 $('debugBadge').classList.toggle('earned',clean);$('debugBadge').textContent=(clean?'✓':'◇')+' 한 번에 성공';
 if(mission.unlock){$('unlockBox').textContent='새로 배운 것 · '+mission.unlock;$('unlockBox').classList.remove('hidden');}else $('unlockBox').classList.add('hidden');
 $('nextBtn').textContent=missionIndex===missions.length-1?'처음부터 다시 보기':'다음 임무';
 $('clear').classList.remove('hidden');
 setExec('임무 해결!','다른 코드로 더 짧게 만들 수도 있어요.','idle');
 renderMissionGrid();
}
function setMissionText(){
 $('chapterName').textContent=mission.chapter;$('missionName').textContent=mission.name;
 $('missionKicker').textContent=mission.concept;$('missionTitle').textContent=mission.title;
 $('missionText').textContent=mission.text;$('objectiveText').textContent=mission.objective;
}
function loadMission(index,resetCode){
 missionIndex=Math.max(0,Math.min(missions.length-1,index));
 mission=missions[missionIndex];nodeSeq=0;cleared=false;failures=0;stepSession=false;insertPath=[];codeTarget='main';
 const slot=currentStore();
 if(resetCode){mainProgram=[];functionProgram=[];}else{mainProgram=normalizeNodes(clone(slot.main||[]));functionProgram=normalizeNodes(clone(slot.fn||[]));}
 executingNodeId='';errorNodeId='';persistCode();setMissionText();buildWorld();renderAllEditor();renderMissionGrid();
 document.querySelectorAll('.code-tab').forEach(function(b){b.classList.toggle('active',b.dataset.codeTarget==='main');});
 $('missionSelect').classList.add('hidden');$('clear').classList.add('hidden');
 try{window.KidscadeGame&&window.KidscadeGame.start&&window.KidscadeGame.start({stage:missionIndex+1,title:mission.title});}catch(_){}
}
function renderMissionGrid(){
 const root=$('missionGrid');root.replaceChildren();
 missions.forEach(function(m,i){
  const b=document.createElement('button');b.type='button';b.className='mission-item'+(i>=progress.unlocked?' locked':'')+(progress.completed[i]?' done':'');
  b.innerHTML='<b>'+(progress.completed[i]?'✓ ':'')+m.name+'</b><span>'+m.concept+' · 메모리 '+m.memory+'</span>';
  b.disabled=i>=progress.unlocked;b.onclick=function(){loadMission(i,false);};root.appendChild(b);
 });
}
function fitCamera(){
 const aspect=innerWidth/innerHeight;
 const span=Math.max(mission?mission.w*CELL:7,mission?mission.h*CELL:5);
 const v=Math.max(5.4,span*.72);
 camera.left=-v*aspect;camera.right=v*aspect;camera.top=v;camera.bottom=-v;camera.updateProjectionMatrix();
 camera.position.set(v*.78,v*.92,v*.98);camera.lookAt(0,0,0);
 renderer.setSize(innerWidth,innerHeight,false);
}
window.addEventListener('resize',fitCamera);
function animate(t){
 if(worldState){
  worldState.crystals.forEach(function(c,i){if(!c.taken&&c.obj){c.obj.rotation.y=t*.0015+i;c.obj.position.y=.38+Math.sin(t*.003+i)*.06;}});
  worldState.enemies.forEach(function(e,i){if(!e.dead&&e.obj)e.obj.position.y=.12+Math.sin(t*.0025+i)*.035;});
 }
 renderer.render(scene,camera);requestAnimationFrame(animate);
}requestAnimationFrame(animate);

$('newBtn').onclick=function(){progress={unlocked:1,completed:{},best:{},current:0,programs:{}};saveProgress();$('intro').classList.add('hidden');loadMission(0,true);};
$('continueBtn').onclick=function(){$('intro').classList.add('hidden');loadMission(Math.min(progress.unlocked-1,progress.current||0),false);};
$('continueBtn').classList.toggle('hidden',progress.unlocked<=1&&!Object.keys(progress.completed).length);
$('missionsBtn').onclick=function(){renderMissionGrid();$('missionSelect').classList.remove('hidden');};
$('closeMissions').onclick=function(){$('missionSelect').classList.add('hidden');};
$('helpBtn').onclick=function(){$('help').classList.remove('hidden');};
$('closeHelp').onclick=function(){$('help').classList.add('hidden');};
document.querySelectorAll('.code-tab').forEach(function(b){b.onclick=function(){codeTarget=b.dataset.codeTarget;insertPath=[];document.querySelectorAll('.code-tab').forEach(function(x){x.classList.toggle('active',x===b);});renderAllEditor();};});
$('outBtn').onclick=function(){if(insertPath.length)insertPath.pop();renderAllEditor();};
$('undoBtn').onclick=function(){const c=resolveContainer(activeRoot(),insertPath);if(c.length){c.pop();persistCode();invalidateExecution();renderAllEditor();}};
$('clearBtn').onclick=function(){if(codeTarget==='function')functionProgram=[];else mainProgram=[];insertPath=[];persistCode();invalidateExecution();renderAllEditor();};
$('runBtn').onclick=async function(){
 if(!mainProgram.length){toast('먼저 명령을 하나 이상 놓아 주세요.',true);return;}
 buildWorld();stepSession=false;executingNodeId='';errorNodeId='';
 $('runBtn').classList.add('hidden');$('stepBtn').classList.add('hidden');$('stopBtn').classList.remove('hidden');
 await runtime.run(mainProgram,functionProgram);
};
$('stepBtn').onclick=async function(){
 if(!mainProgram.length){toast('먼저 명령을 하나 이상 놓아 주세요.',true);return;}
 if(!stepSession){buildWorld();runtime.prepare(mainProgram,functionProgram);stepSession=true;}
 $('runBtn').classList.add('hidden');$('stepBtn').classList.add('hidden');$('stopBtn').classList.remove('hidden');
 const res=await runtime.nextAction();
 $('runBtn').classList.remove('hidden');$('stepBtn').classList.remove('hidden');$('stopBtn').classList.add('hidden');
 if(res&&res.done)stepSession=false;
};
$('stopBtn').onclick=function(){runtime.stop();stepSession=false;$('runBtn').classList.remove('hidden');$('stepBtn').classList.remove('hidden');$('stopBtn').classList.add('hidden');setExec('실행을 멈췄어요.','코드를 고친 뒤 다시 실행해 보세요.','idle');};
$('retryBtn').onclick=function(){$('clear').classList.add('hidden');cleared=false;buildWorld();};
$('nextBtn').onclick=function(){
 $('clear').classList.add('hidden');
 if(missionIndex===missions.length-1){loadMission(0,false);}else loadMission(missionIndex+1,false);
};

missionIndex=Math.min(missions.length-1,Math.max(0,progress.current||0));
mission=missions[missionIndex];
setMissionText();buildWorld();renderMissionGrid();renderAllEditor();
