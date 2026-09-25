const DATA=window.CodeQuestData;
const RuntimeAPI=window.CodeQuestRuntime;
if(!DATA||!RuntimeAPI)throw new Error('Code Quest data/runtime missing');

const $=id=>document.getElementById(id);
const SAVE_KEY='kidscade_game_v1:high_code_quest:progress_v2';
const BLOCKS=DATA.blocks;
const missions=DATA.missions;
const canvas=$('world');
const ctx=canvas.getContext('2d');

let progress=loadProgress();
let missionIndex=0,mission=null,worldState=null;
let mainProgram=[],functionProgram=[],codeTarget='main',insertPath=[];
let nodeSeq=0,failures=0,stepSession=false,cleared=false,toastTimer=0;
let executingNodeId='',errorNodeId='',cameraX=0,lastTime=0;
let dpr=Math.min(2,window.devicePixelRatio||1);

const images={};
const imageSources={
 idle:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-idle.png',
 stand:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',
 walk1:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-walk1.png',
 walk2:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-walk2.png',
 jump:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-jump.png',
 attack:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-action1.png',
 hurt:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-hurt.png',
 cheer:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-cheer1.png'
};
for(const [k,src] of Object.entries(imageSources)){const im=new Image();im.src=src;images[k]=im;}

function loadProgress(){
 try{
  const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||localStorage.getItem('kidscade_game_v1:high_code_quest:progress_v1')||'{}');
  return {unlocked:Math.max(1,Number(raw.unlocked)||1),completed:raw.completed||{},best:raw.best||{},current:Number(raw.current)||0,programs:raw.programs||{}};
 }catch(_){return {unlocked:1,completed:{},best:{},current:0,programs:{}};}
}
function saveProgress(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch(_){}}
function clone(v){return JSON.parse(JSON.stringify(v));}
function makeId(){return 'n'+(++nodeSeq);}
function normalizeNodes(list){return (list||[]).map(n=>{const x={id:n.id||makeId(),type:n.type};if(Array.isArray(n.body))x.body=normalizeNodes(n.body);return x;});}
function currentStore(){if(!progress.programs[missionIndex])progress.programs[missionIndex]={main:[],fn:[]};return progress.programs[missionIndex];}
function persistCode(){const slot=currentStore();slot.main=clone(mainProgram);slot.fn=clone(functionProgram);progress.current=missionIndex;saveProgress();}
function sound(key){try{window.KidscadeGame?.sound?.(key);}catch(_){}}
function toast(text,bad=false){const el=$('toast');el.textContent=text;el.classList.add('show');el.style.background=bad?'#ffe2e2':'#eef7ff';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1550);}
function setExec(title,detail,mode='idle'){$('execTitle').textContent=title;$('execDetail').textContent=detail||'';$('execBar').classList.toggle('running',mode==='running');$('execBar').classList.toggle('error',mode==='error');$('execIcon').textContent=mode==='running'?'▶':mode==='error'?'!':'●';}

function resize(){
 dpr=Math.min(2,window.devicePixelRatio||1);
 const r=canvas.getBoundingClientRect();
 canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resize);resize();

function groundY(){return Math.min(innerHeight*.74,610);}
function tileW(){return Math.max(58,Math.min(82,innerWidth/14));}
function screenX(tile){return tile*tileW()-cameraX+innerWidth*.22;}
function groundExists(x){return x>=0&&x<mission.length&&!mission.gaps.includes(x);}
function enemyAt(x){return worldState.enemies.find(e=>!e.dead&&e.x===x);}
function doorAt(x){return worldState.doors.find(d=>!d.open&&d.x===x);}
function crystalAt(x){return worldState.crystals.find(c=>!c.taken&&c.x===x);}
function aheadX(){return worldState.x+worldState.dir;}
function blocked(x){return !groundExists(x)||Boolean(enemyAt(x))||Boolean(doorAt(x));}
function gapAhead(){return !groundExists(aheadX());}

function buildWorld(){
 mission=applyVariant(missions[missionIndex]);
 worldState={
  x:mission.start,displayX:mission.start,dir:1,hp:5,crystalCount:0,
  pose:'idle',poseUntil:0,jumpLift:0,
  crystals:(mission.crystals||[]).map(x=>({x,taken:false,bob:Math.random()*6.2})),
  doors:(mission.doors||[]).map(d=>({...d,open:false,openT:0})),
  enemies:(mission.enemies||[]).map(e=>({...e,maxHp:e.hp,dead:false,hitT:0}))
 };
 cameraX=Math.max(0,(worldState.displayX-2.4)*tileW());
 executingNodeId='';errorNodeId='';stepSession=false;
 updateHUD();renderProgram();
 setExec('코드를 만들고 실행해 보세요.','▶ 실행을 누르면 캐릭터가 코드대로 움직입니다.');
}
function applyVariant(m){
 const c=clone(m);
 if(c.variants?.length){
  const idx=(Number(progress.best['variant_'+missionIndex])||0)%c.variants.length;
  c.enemies=c.variants[idx].map(x=>({x,type:'blob',hp:1}));
 }
 return c;
}
function tween(ms,update){
 return new Promise(resolve=>{const start=performance.now();function frame(now){const t=Math.min(1,(now-start)/ms);update(1-Math.pow(1-t,3),t);if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
}
async function walkTo(x){
 const from=worldState.displayX,to=x;worldState.pose='walk';worldState.poseUntil=performance.now()+260;
 await tween(260,(q,t)=>{worldState.displayX=from+(to-from)*q;worldState.jumpLift=Math.sin(t*Math.PI)*5;});
 worldState.x=x;worldState.displayX=x;worldState.jumpLift=0;worldState.pose='idle';
}
async function jumpTo(x){
 const from=worldState.displayX,to=x;worldState.pose='jump';worldState.poseUntil=performance.now()+430;
 await tween(430,(q,t)=>{worldState.displayX=from+(to-from)*q;worldState.jumpLift=Math.sin(t*Math.PI)*110;});
 worldState.x=x;worldState.displayX=x;worldState.jumpLift=0;worldState.pose='idle';
}
async function attackEnemy(e){
 worldState.pose='attack';worldState.poseUntil=performance.now()+240;e.hitT=performance.now()+220;
 await tween(210,()=>{});
 e.hp--;sound('combat.impact_heavy');
 if(e.hp<=0){e.dead=true;toast('버그 몬스터 제거!');}
 worldState.pose='idle';
}
async function openDoor(d){
 sound('ui.confirm');d.open=true;
 await tween(260,q=>{d.openT=q;});
}
async function hurtPlayer(){
 worldState.pose='hurt';worldState.poseUntil=performance.now()+200;sound('combat.hurt_voice');
 await tween(180,()=>{});worldState.pose='idle';
}

const worldAPI={
 checkCondition(cond){
  if(cond==='enemyAhead')return Boolean(enemyAt(aheadX()));
  if(cond==='gapAhead')return gapAhead();
  if(cond==='crystals3')return worldState.crystalCount>=3;
  return false;
 },
 async applyAction(type){
  errorNodeId='';
  if(type==='FWD'){
   const x=aheadX();
   if(!groundExists(x))return {ok:false,message:'앞이 낭떠러지예요. 점프가 필요해요.'};
   if(enemyAt(x))return {ok:false,message:'앞에 버그 몬스터가 있어요. 먼저 공격해야 해요.'};
   if(doorAt(x))return {ok:false,message:'문이 막고 있어요. 먼저 문을 열어야 해요.'};
   await walkTo(x);sound('ui.tick');updateHUD();return {ok:true};
  }
  if(type==='LEFT'){worldState.dir=-1;worldState.pose='idle';sound('ui.select');return {ok:true};}
  if(type==='RIGHT'){worldState.dir=1;worldState.pose='idle';sound('ui.select');return {ok:true};}
  if(type==='JUMP'){
   const mid=aheadX(),land=worldState.x+worldState.dir*2;
   if(!groundExists(land))return {ok:false,message:'점프해서 착지할 바닥이 없어요.'};
   if(enemyAt(mid)||doorAt(mid))return {ok:false,message:'적이나 문을 뛰어넘을 수는 없어요.'};
   if(enemyAt(land)||doorAt(land))return {ok:false,message:'착지할 곳이 막혀 있어요.'};
   await jumpTo(land);sound('ui.confirm');updateHUD();return {ok:true};
  }
  if(type==='ATTACK'){
   const e=enemyAt(aheadX());if(!e)return {ok:false,message:'바로 앞에 공격할 적이 없어요.'};
   await attackEnemy(e);updateHUD();return {ok:true};
  }
  if(type==='COLLECT'){
   const c=crystalAt(worldState.x);if(!c)return {ok:false,message:'지금 서 있는 곳에는 주울 수정이 없어요.'};
   c.taken=true;worldState.crystalCount++;sound('collect.coin_pickup');updateHUD();return {ok:true};
  }
  if(type==='OPEN'){
   const d=doorAt(aheadX());if(!d)return {ok:false,message:'바로 앞에 닫힌 문이 없어요.'};
   if(worldState.crystalCount<d.need)return {ok:false,message:'수정이 '+d.need+'개 필요해요. 지금은 '+worldState.crystalCount+'개예요.'};
   await openDoor(d);return {ok:true};
  }
  return {ok:false,message:'알 수 없는 명령이에요.'};
 },
 async afterPlayerAction(){
  const danger=worldState.enemies.filter(e=>!e.dead&&Math.abs(e.x-worldState.x)===1);
  if(!danger.length)return {defeat:false};
  worldState.hp=Math.max(0,worldState.hp-danger.length);await hurtPlayer();updateHUD();
  return {defeat:worldState.hp<=0};
 },
 isComplete(){
  return worldState.x===mission.goal&&worldState.enemies.every(e=>e.dead);
 }
};

const runtime=new RuntimeAPI.Runtime({
 world:worldAPI,delay:135,
 onEvent(event){
  if(event.node){executingNodeId=event.node.id;errorNodeId='';renderProgram();}
  if(event.kind==='check'){
   const def=BLOCKS[event.node.type];$('sensorReadout').textContent='센서: '+(event.result?'참 ✓':'거짓 ✕');
   setExec(def.label,event.result?'조건이 참 → 안쪽 명령 실행':'조건이 거짓 → 안쪽 명령 건너뜀','running');
  }else if(event.kind==='loop')setExec(BLOCKS[event.node.type].label,event.index+' / '+event.total+'번째 반복','running');
  else if(event.kind==='call')setExec('나의 함수 호출','저장해 둔 행동 묶음을 실행합니다.','running');
  else if(event.kind==='action')setExec(BLOCKS[event.node.type].label,'캐릭터가 이 명령을 실행하는 중이에요.','running');
  else if(event.kind==='run-stop'||event.kind==='step-stop')setRunButtons(false);
 },
 onError(node,message){
  failures++;errorNodeId=node?.id||executingNodeId;renderProgram();sound('ui.error');setExec('여기서 버그 발생',message,'error');toast(message,true);stepSession=false;setRunButtons(false);
 },
 onDone(){handleMissionDone();}
});

function setRunButtons(running){$('runBtn').classList.toggle('hidden',running);$('stepBtn').classList.toggle('hidden',running);$('stopBtn').classList.toggle('hidden',!running);}
function activeRoot(){return codeTarget==='function'?functionProgram:mainProgram;}
function memoryLimit(){return codeTarget==='function'?(mission.functionMemory||6):mission.memory;}
function resolveContainer(root,path){let list=root;for(const id of path){const node=list.find(n=>n.id===id);if(!node||!Array.isArray(node.body))break;list=node.body;}return list;}
function invalidateExecution(){runtime.stop();runtime.iterator=null;stepSession=false;executingNodeId='';errorNodeId='';setExec('코드가 바뀌었어요.','다시 실행하면 스테이지 처음부터 확인합니다.');}
function addBlock(type){
 if(!mission.available.includes(type)){toast('아직 잠긴 명령이에요.',true);return;}
 if(codeTarget==='function'&&type==='CALL_FN'){toast('함수 안에서 자기 자신은 부를 수 없어요.',true);return;}
 const root=activeRoot();if(RuntimeAPI.countNodes(root)>=memoryLimit()){toast('코드 메모리가 꽉 찼어요. 반복이나 함수를 사용해 줄여 보세요.',true);sound('ui.error');return;}
 const def=BLOCKS[type],node={id:makeId(),type};if(def.kind==='structure'||def.kind==='condition')node.body=[];
 resolveContainer(root,insertPath).push(node);if(node.body)insertPath=insertPath.concat(node.id);
 persistCode();invalidateExecution();renderAllEditor();sound('ui.click');
}
function removeNode(root,id){for(let i=0;i<root.length;i++){if(root[i].id===id){root.splice(i,1);return true;}if(root[i].body&&removeNode(root[i].body,id))return true;}return false;}
function moveNode(root,id,d){for(let i=0;i<root.length;i++){if(root[i].id===id){const ni=i+d;if(ni<0||ni>=root.length)return true;const n=root.splice(i,1)[0];root.splice(ni,0,n);return true;}if(root[i].body&&moveNode(root[i].body,id,d))return true;}return false;}
function renderNodes(list,parent,path){
 if(!list.length){const e=document.createElement('div');e.className='program-empty';e.textContent=path.length?'이 블록 안에 명령을 넣어 보세요.':'아래 명령을 눌러 코드를 만들어요.';parent.appendChild(e);return;}
 list.forEach((node,index)=>{
  const def=BLOCKS[node.type]||{label:node.type,kind:'action',icon:'·'};
  const el=document.createElement('div');el.className='node '+def.kind+(node.id===executingNodeId?' active':'')+(node.id===errorNodeId?' error':'')+(insertPath.at(-1)===node.id?' selected':'');el.dataset.nodeId=node.id;
  const row=document.createElement('div');row.className='node-main';
  const idx=document.createElement('span');idx.className='node-index';idx.textContent=index+1;
  const label=document.createElement('span');label.className='node-label';label.textContent=(def.icon||'')+' '+def.label;
  const controls=document.createElement('div');controls.className='node-controls';
  [['↑',-1],['↓',1]].forEach(([t,d])=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.onclick=ev=>{ev.stopPropagation();moveNode(activeRoot(),node.id,d);persistCode();invalidateExecution();renderAllEditor();};controls.appendChild(b);});
  const del=document.createElement('button');del.type='button';del.textContent='×';del.onclick=ev=>{ev.stopPropagation();removeNode(activeRoot(),node.id);insertPath=[];persistCode();invalidateExecution();renderAllEditor();};controls.appendChild(del);
  row.append(idx,label,controls);el.appendChild(row);row.onclick=()=>{if(node.body){insertPath=path.concat(node.id);renderAllEditor();toast(def.label+' 안에 명령을 추가합니다.');}};
  if(node.body){const body=document.createElement('div');body.className='node-body'+(node.body.length?'':' empty');renderNodes(node.body,body,path.concat(node.id));el.appendChild(body);}
  parent.appendChild(el);
 });
}
function findNodeLabel(list,id){for(const n of list){if(n.id===id)return BLOCKS[n.type].label;if(n.body){const v=findNodeLabel(n.body,id);if(v)return v;}}return '';}
function renderProgram(){
 const root=$('program');root.replaceChildren();renderNodes(activeRoot(),root,[]);
 $('blockValue').textContent=RuntimeAPI.countNodes(activeRoot())+'/'+memoryLimit();
 $('codeModeTitle').textContent=codeTarget==='function'?'나의 함수':'메인 코드';
 const labels=insertPath.map(id=>findNodeLabel(activeRoot(),id)).filter(Boolean);$('insertPath').textContent=labels.length?'추가 위치: '+labels.join(' › ')+' 안':'여기에 명령이 추가돼요.';
}
function renderPalette(){
 const root=$('palette');root.replaceChildren();
 mission.available.forEach(type=>{if(codeTarget==='function'&&type==='CALL_FN')return;const def=BLOCKS[type],b=document.createElement('button');b.type='button';b.className=def.kind||'action';b.innerHTML='<b>'+def.icon+'</b>'+def.label;b.onclick=()=>addBlock(type);root.appendChild(b);});
}
function renderAllEditor(){renderProgram();renderPalette();}
function updateHUD(){
 $('hpValue').textContent=worldState?.hp??5;$('crystalValue').textContent=worldState?.crystalCount??0;$('variableCrystal').textContent=worldState?.crystalCount??0;$('variableHp').textContent=worldState?.hp??5;renderProgram();
}
function missionRequirementOK(){
 if(mission.requireFunction&&!functionProgram.length)return {ok:false,message:'나의 함수 탭에 재사용할 행동을 만들어야 해요.'};
 if(mission.requireType&&!RuntimeAPI.containsType(mainProgram,mission.requireType))return {ok:false,message:'이번 임무는 '+BLOCKS[mission.requireType].label+' 블록을 사용해 해결해 보세요.'};
 return {ok:true};
}
function handleMissionDone(){
 const req=missionRequirementOK();if(!req.ok){failures++;sound('ui.error');setExec('목표에는 도착했지만…',req.message,'error');toast(req.message,true);stepSession=false;return;}
 if(cleared)return;cleared=true;worldState.pose='cheer';sound('success.victory_fanfare');
 const count=RuntimeAPI.countNodes(mainProgram),short=count<=mission.par,clean=failures===0;
 progress.completed[missionIndex]=true;progress.unlocked=Math.max(progress.unlocked,Math.min(missions.length,missionIndex+2));const old=progress.best[missionIndex];progress.best[missionIndex]=!old||count<old?count:old;progress.current=Math.min(missions.length-1,missionIndex+1);progress.best['variant_'+missionIndex]=(Number(progress.best['variant_'+missionIndex])||0)+1;saveProgress();
 try{window.KidscadeGame?.score?.(Object.keys(progress.completed).filter(k=>progress.completed[k]).length,{unit:'임무'});}catch(_){}
 $('clearTitle').textContent=missionIndex===missions.length-1?'코드 원정대 완주!':'작동 성공!';$('clearText').textContent='메인 코드 '+count+'블록으로 스테이지를 돌파했어요.';
 $('shortBadge').classList.toggle('earned',short);$('shortBadge').textContent=(short?'✓':'◇')+' 짧은 코드';$('debugBadge').classList.toggle('earned',clean);$('debugBadge').textContent=(clean?'✓':'◇')+' 한 번에 성공';
 if(mission.unlock){$('unlockBox').textContent='새로 배운 것 · '+mission.unlock;$('unlockBox').classList.remove('hidden');}else $('unlockBox').classList.add('hidden');
 $('nextBtn').textContent=missionIndex===missions.length-1?'처음부터 다시 보기':'다음 임무';$('clear').classList.remove('hidden');setExec('임무 해결!','다른 코드로 더 짧게 만들 수도 있어요.');renderMissionGrid();
}
function setMissionText(){$('chapterName').textContent=mission.chapter;$('missionName').textContent=mission.name;$('missionKicker').textContent=mission.concept;$('missionTitle').textContent=mission.title;$('missionText').textContent=mission.text;$('objectiveText').textContent=mission.objective;}
function loadMission(index,resetCode=false){
 missionIndex=Math.max(0,Math.min(missions.length-1,index));mission=missions[missionIndex];nodeSeq=0;cleared=false;failures=0;stepSession=false;insertPath=[];codeTarget='main';
 const slot=currentStore();if(resetCode){mainProgram=[];functionProgram=[];}else{mainProgram=normalizeNodes(clone(slot.main||[]));functionProgram=normalizeNodes(clone(slot.fn||[]));}
 persistCode();setMissionText();buildWorld();renderAllEditor();renderMissionGrid();document.querySelectorAll('.code-tab').forEach(b=>b.classList.toggle('active',b.dataset.codeTarget==='main'));$('missionSelect').classList.add('hidden');$('clear').classList.add('hidden');
 try{window.KidscadeGame?.start?.({stage:missionIndex+1,title:mission.title});}catch(_){}
}
function renderMissionGrid(){
 const root=$('missionGrid');root.replaceChildren();missions.forEach((m,i)=>{const b=document.createElement('button');b.type='button';b.className='mission-item'+(i>=progress.unlocked?' locked':'')+(progress.completed[i]?' done':'');b.innerHTML='<b>'+(progress.completed[i]?'✓ ':'')+m.name+'</b><span>'+m.concept+' · 코드 '+m.memory+'칸</span>';b.disabled=i>=progress.unlocked;b.onclick=()=>loadMission(i,false);root.appendChild(b);});
}

function drawSky(w,h,time){
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#132a4f');g.addColorStop(.58,'#285c7e');g.addColorStop(1,'#7cc5b2');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.globalAlpha=.15;ctx.fillStyle='#fff';for(let i=0;i<7;i++){const x=((i*243-cameraX*.12)%(w+260))-130,y=70+(i%3)*55;ctx.beginPath();ctx.ellipse(x,y,80,24,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 ctx.fillStyle='#183c53';for(let i=-2;i<10;i++){const x=i*240-(cameraX*.28%240);ctx.beginPath();ctx.moveTo(x,h*.68);ctx.lineTo(x+120,h*.31+(i%2)*45);ctx.lineTo(x+260,h*.68);ctx.fill();}
 ctx.fillStyle='#1d5b59';for(let i=-2;i<18;i++){const x=i*120-(cameraX*.55%120);const y=h*.67;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+45,y-100-(i%3)*20);ctx.lineTo(x+85,y);ctx.fill();}
}
function drawGround(w,h){
 const gy=groundY(),tw=tileW();for(let x=0;x<mission.length;x++){if(!groundExists(x))continue;const sx=screenX(x)-tw*.5;ctx.fillStyle='#294735';ctx.fillRect(sx,gy,tw+1,h-gy);ctx.fillStyle='#63a84b';ctx.fillRect(sx,gy,tw+1,13);ctx.fillStyle='#89ce65';ctx.fillRect(sx,gy,tw+1,4);ctx.fillStyle='#22382e';ctx.fillRect(sx,gy+13,tw+1,7);}
 for(const gap of mission.gaps){const sx=screenX(gap);ctx.fillStyle='#101722';ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(sx,gy+22,tw*.4,14,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
}
function drawGoal(){
 const sx=screenX(mission.goal),gy=groundY();ctx.save();ctx.translate(sx,gy);ctx.strokeStyle='#91ffe0';ctx.lineWidth=5;ctx.shadowColor='#62f6d1';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,-58,28,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#caffef';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('EXIT',0,-54);ctx.restore();
}
function drawCrystal(c,time){
 if(c.taken)return;const x=screenX(c.x),y=groundY()-42-Math.sin(time*.004+c.bob)*6;ctx.save();ctx.translate(x,y);ctx.rotate(time*.0015+c.bob);ctx.fillStyle='#76eaff';ctx.shadowColor='#4adcfb';ctx.shadowBlur=15;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(11,0);ctx.lineTo(0,16);ctx.lineTo(-11,0);ctx.closePath();ctx.fill();ctx.restore();
}
function drawDoor(d){
 if(d.open&&d.openT>=1)return;const x=screenX(d.x),gy=groundY(),scale=1-d.openT;ctx.save();ctx.translate(x,gy);ctx.scale(1,Math.max(.02,scale));ctx.fillStyle='#6a4536';ctx.fillRect(-12,-105,24,105);ctx.fillStyle='#d9a84d';ctx.fillRect(-8,-98,16,8);ctx.fillStyle='#f6d87e';ctx.beginPath();ctx.arc(5,-48,3,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawEnemy(e,time){
 if(e.dead)return;const x=screenX(e.x),gy=groundY(),hit=e.hitT>performance.now();ctx.save();ctx.translate(x+(hit?Math.sin(time*.08)*5:0),gy-31);const size=e.type==='golem'?1.35:1;ctx.scale(size,size);
 if(e.type==='ghost'){ctx.fillStyle='#a98ef4';ctx.beginPath();ctx.arc(0,-14,20,Math.PI,0);ctx.lineTo(20,14);ctx.lineTo(10,7);ctx.lineTo(0,14);ctx.lineTo(-10,7);ctx.lineTo(-20,14);ctx.closePath();ctx.fill();}
 else if(e.type==='mush'){ctx.fillStyle='#f09c6c';ctx.beginPath();ctx.arc(0,-13,21,Math.PI,0);ctx.lineTo(18,-2);ctx.lineTo(-18,-2);ctx.closePath();ctx.fill();ctx.fillStyle='#e4d2b7';ctx.fillRect(-9,-2,18,21);}
 else if(e.type==='golem'){ctx.fillStyle='#8799a8';ctx.fillRect(-19,-35,38,38);ctx.fillStyle='#62727f';ctx.fillRect(-25,-23,8,24);ctx.fillRect(17,-23,8,24);}
 else {ctx.fillStyle='#6ed28a';ctx.beginPath();ctx.arc(0,-8,22,Math.PI,0);ctx.quadraticCurveTo(26,14,0,15);ctx.quadraticCurveTo(-26,14,-22,-8);ctx.fill();}
 ctx.fillStyle='#fff';ctx.fillRect(-9,-15,5,6);ctx.fillRect(5,-15,5,6);ctx.fillStyle='#15202a';ctx.fillRect(-7,-13,2,3);ctx.fillRect(7,-13,2,3);
 if(e.maxHp>1){ctx.fillStyle='#1b2530';ctx.fillRect(-23,-45,46,5);ctx.fillStyle='#f16d6d';ctx.fillRect(-23,-45,46*(e.hp/e.maxHp),5);}
 ctx.restore();
}
function heroImage(){
 if(worldState.pose==='jump')return images.jump;if(worldState.pose==='attack')return images.attack;if(worldState.pose==='hurt')return images.hurt;if(worldState.pose==='cheer')return images.cheer;if(worldState.pose==='walk')return (Math.floor(performance.now()/100)%2?images.walk1:images.walk2);return images.idle;
}
function drawHero(){
 const x=screenX(worldState.displayX),y=groundY()-worldState.jumpLift;const im=heroImage();ctx.save();ctx.translate(x,y);if(worldState.dir<0)ctx.scale(-1,1);if(im?.complete&&im.naturalWidth){const h=82,w=h*(im.naturalWidth/im.naturalHeight);ctx.drawImage(im,-w*.5,-h+4,w,h);}else{ctx.fillStyle='#5da4ff';ctx.fillRect(-18,-62,36,62);}ctx.restore();
}
function drawSensorHint(){
 if(!worldState)return;const x=screenX(worldState.x),y=groundY()-108;ctx.save();ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#d9f7ff';ctx.globalAlpha=.75;ctx.fillText('코드가 이 캐릭터를 움직여요',x,y);ctx.restore();
}
function render(time){
 const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h){requestAnimationFrame(render);return;}
 const targetCam=Math.max(0,(worldState?.displayX??0)*tileW()-w*.35);cameraX+=(targetCam-cameraX)*.08;
 drawSky(w,h,time);if(mission&&worldState){drawGround(w,h);drawGoal();worldState.crystals.forEach(c=>drawCrystal(c,time));worldState.doors.forEach(drawDoor);worldState.enemies.forEach(e=>drawEnemy(e,time));drawHero();drawSensorHint();}
 requestAnimationFrame(render);lastTime=time;
}
requestAnimationFrame(render);

$('newBtn').onclick=()=>{progress={unlocked:1,completed:{},best:{},current:0,programs:{}};saveProgress();$('intro').classList.add('hidden');loadMission(0,true);};
$('continueBtn').onclick=()=>{$('intro').classList.add('hidden');loadMission(Math.min(progress.unlocked-1,progress.current||0),false);};
$('continueBtn').classList.toggle('hidden',progress.unlocked<=1&&!Object.keys(progress.completed).length);
$('missionsBtn').onclick=()=>{renderMissionGrid();$('missionSelect').classList.remove('hidden');};
$('closeMissions').onclick=()=>$('missionSelect').classList.add('hidden');
$('helpBtn').onclick=()=>$('help').classList.remove('hidden');
$('closeHelp').onclick=()=>$('help').classList.add('hidden');
document.querySelectorAll('.code-tab').forEach(b=>b.onclick=()=>{codeTarget=b.dataset.codeTarget;insertPath=[];document.querySelectorAll('.code-tab').forEach(x=>x.classList.toggle('active',x===b));renderAllEditor();});
$('outBtn').onclick=()=>{if(insertPath.length)insertPath.pop();renderAllEditor();};
$('undoBtn').onclick=()=>{const c=resolveContainer(activeRoot(),insertPath);if(c.length){c.pop();persistCode();invalidateExecution();renderAllEditor();}};
$('clearBtn').onclick=()=>{if(codeTarget==='function')functionProgram=[];else mainProgram=[];insertPath=[];persistCode();invalidateExecution();renderAllEditor();};
$('runBtn').onclick=async()=>{if(!mainProgram.length){toast('먼저 명령을 하나 이상 놓아 주세요.',true);return;}buildWorld();setRunButtons(true);await runtime.run(mainProgram,functionProgram);};
$('stepBtn').onclick=async()=>{if(!mainProgram.length){toast('먼저 명령을 하나 이상 놓아 주세요.',true);return;}if(!stepSession){buildWorld();runtime.prepare(mainProgram,functionProgram);stepSession=true;}setRunButtons(true);const res=await runtime.nextAction();setRunButtons(false);if(res?.done)stepSession=false;};
$('stopBtn').onclick=()=>{runtime.stop();stepSession=false;setRunButtons(false);setExec('실행을 멈췄어요.','코드를 고친 뒤 다시 실행해 보세요.');};
$('retryBtn').onclick=()=>{$('clear').classList.add('hidden');cleared=false;buildWorld();};
$('nextBtn').onclick=()=>{$('clear').classList.add('hidden');loadMission(missionIndex===missions.length-1?0:missionIndex+1,false);};

missionIndex=Math.min(missions.length-1,Math.max(0,progress.current||0));mission=missions[missionIndex];setMissionText();buildWorld();renderMissionGrid();renderAllEditor();
