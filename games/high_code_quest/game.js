const DATA=window.CodeQuestData;
const RuntimeAPI=window.CodeQuestRuntime;
if(!DATA||!RuntimeAPI)throw new Error('Code Quest data/runtime missing');

const $=id=>document.getElementById(id);
const SAVE_KEY='kidscade_game_v1:high_code_quest:progress_v3';
const BLOCKS=DATA.blocks;
const missions=DATA.missions;
const regions=DATA.regions||[];
const canvas=$('world');
const ctx=canvas.getContext('2d');

let progress=loadProgress();
let missionIndex=Math.min(missions.length-1,Math.max(0,progress.current||0));
let mission=missions[missionIndex],worldState=null;
let mainProgram=[],functionProgram=[],codeTarget='main',insertPath=[];
let nodeSeq=0,failures=0,stepSession=false,cleared=false,toastTimer=0;
let executingNodeId='',errorNodeId='',cameraX=0,cameraY=0;
let dpr=Math.min(2,window.devicePixelRatio||1);
let runSpeed=1;
let runToken=0;

const images={};
const imageSources={
 idle:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-idle.png',
 walk1:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-walk1.png',
 walk2:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-walk2.png',
 jump:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-jump.png',
 attack:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-action1.png',
 hurt:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-hurt.png',
 cheer:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-cheer1.png',
 duck:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-duck.png'
};
for(const [k,src] of Object.entries(imageSources)){const im=new Image();im.src=src;images[k]=im;}

const rewardNames={
 boots_basic:'원정대 장화',jump_module:'점프 모듈',hand_module:'수집 모듈',sword_module:'디버그 블레이드',
 loop_core:'반복 코어',enemy_sensor:'적 감지 센서',terrain_sensor:'지형 센서',memory_sensor:'상태 메모리',
 function_slot:'기술 슬롯',ranger_badge:'코드 원정대 배지',reflex_sensor:'반응 센서',altimeter:'고도 센서',
 high_jump_boots:'고점프 부츠',dash_boots:'대시 부츠',forest_core:'버섯 숲 코어'
};

function defaultProgress(){
 return {unlocked:1,completed:{},best:{},current:0,programs:{},inventory:{},treasures:{},memoryBonus:0,rewardClaimed:{},runCount:0};
}
function loadProgress(){
 let raw={};
 try{raw=JSON.parse(localStorage.getItem(SAVE_KEY)||localStorage.getItem('kidscade_game_v1:high_code_quest:progress_v2')||'{}');}catch(_){}
 const p={...defaultProgress(),...raw};
 p.unlocked=Math.max(1,Number(p.unlocked)||1);p.completed=p.completed||{};p.best=p.best||{};p.programs=p.programs||{};p.inventory=p.inventory||{};p.treasures=p.treasures||{};p.rewardClaimed=p.rewardClaimed||{};
 migrateRewards(p);
 return p;
}
function migrateRewards(p){
 let bonus=Number(p.memoryBonus)||0;
 for(let i=0;i<missions.length;i++){
  if(!p.completed[i])continue;
  const r=missions[i].reward;if(!r)continue;
  p.inventory[r.id]=true;
  if(!p.rewardClaimed[i]&&r.memoryBonus){bonus+=r.memoryBonus;p.rewardClaimed[i]=true;}
 }
 p.memoryBonus=bonus;
}
function saveProgress(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch(_){}}
function clone(v){return JSON.parse(JSON.stringify(v));}
function makeId(){return 'n'+(++nodeSeq);}
function normalizeNodes(list){
 return (list||[]).map(n=>{
  const x={id:n.id||makeId(),type:n.type};
  if(Array.isArray(n.body))x.body=normalizeNodes(n.body);
  if(Array.isArray(n.elseBody))x.elseBody=normalizeNodes(n.elseBody);
  return x;
 });
}
function currentStore(){if(!progress.programs[missionIndex])progress.programs[missionIndex]={main:[],fn:[]};return progress.programs[missionIndex];}
function previousCarryStore(){
 for(let i=missionIndex-1;i>=0;i--){if(missions[i].arc===mission.arc&&progress.programs[i])return progress.programs[i];}
 return null;
}
function persistCode(){
 const slot=currentStore();slot.main=clone(mainProgram);slot.fn=clone(functionProgram);progress.current=missionIndex;saveProgress();
}
function sound(key){try{window.KidscadeGame?.sound?.(key);}catch(_){}}
function toast(text,bad=false){
 const el=$('toast');if(!el)return;el.textContent=text;el.classList.add('show');el.style.background=bad?'#ffe2e2':'#eef7ff';
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1600);
}
function setExec(title,detail,mode='idle'){
 $('execTitle').textContent=title;$('execDetail').textContent=detail||'';
 $('execBar').classList.toggle('running',mode==='running');$('execBar').classList.toggle('error',mode==='error');
 $('execIcon').textContent=mode==='running'?'▶':mode==='error'?'!':'●';
}
function setExecuting(on){
 document.body.classList.toggle('executing',on);
 const mini=$('miniCode');if(mini)mini.classList.toggle('hidden',!on);
}
function setRunButtons(running){$('runBtn').classList.toggle('hidden',running);$('stepBtn').classList.toggle('hidden',running);$('stopBtn').classList.toggle('hidden',!running);}
function speedMs(ms){return Math.max(45,ms/runSpeed);}
function resize(){
 dpr=Math.min(2,window.devicePixelRatio||1);
 const r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize',resize);resize();

function tileW(){return Math.max(62,Math.min(86,innerWidth/13));}
function vertUnit(){return Math.max(46,Math.min(64,innerHeight/11));}
function baseGround(){return Math.min(innerHeight*.76,630);}
function sx(x){return x*tileW()-cameraX+innerWidth*.24;}
function sy(y){return baseGround()-y*vertUnit()+cameraY;}
function platformCandidatesAt(x){
 return (mission.platforms||[]).filter(p=>x>=p.x-0.001&&x<p.x+p.w-0.001).map(p=>p.y).sort((a,b)=>a-b);
}
function surfaceNear(x,currentY,maxRise=.75,maxDrop=.9){
 const c=platformCandidatesAt(x).filter(y=>y-currentY<=maxRise&&currentY-y<=maxDrop);
 if(!c.length)return null;
 c.sort((a,b)=>Math.abs(a-currentY)-Math.abs(b-currentY));return c[0];
}
function jumpSurface(x,currentY,high=false){
 let c=platformCandidatesAt(x).filter(y=>y-currentY<=(high?5:2.45)&&currentY-y<=3);
 if(!c.length)return null;
 const above=c.filter(y=>y>currentY+.25);
 if(above.length){above.sort((a,b)=>b-a);return high?above[0]:above[above.length-1];}
 c.sort((a,b)=>Math.abs(a-currentY)-Math.abs(b-currentY));return c[0];
}
function lowerSurface(x,currentY){
 const c=platformCandidatesAt(x).filter(y=>y<currentY-.4).sort((a,b)=>b-a);return c.length?c[0]:null;
}
function groundExists(x,y){return surfaceNear(x,y,0.75,0.9)!==null;}
function sameLevel(a,b,t=.75){return Math.abs(a-b)<=t;}
function enemyAt(x,y,range=.6){return worldState.enemies.find(e=>!e.dead&&Math.abs(e.x-x)<=range&&sameLevel(e.y,y,1.05));}
function enemyAhead(range=1.25){
 const dir=worldState.dir;return worldState.enemies
  .filter(e=>!e.dead&&(e.x-worldState.x)*dir>0&&(e.x-worldState.x)*dir<=range&&Math.abs(e.y-worldState.y)<=1.4)
  .sort((a,b)=>Math.abs(a.x-worldState.x)-Math.abs(b.x-worldState.x))[0];
}
function doorAhead(range=1.2){return worldState.doors.find(d=>!d.open&&(d.x-worldState.x)*worldState.dir>0&&(d.x-worldState.x)*worldState.dir<=range&&sameLevel(d.y,worldState.y,1));}
function crystalHere(){return worldState.crystals.find(c=>!c.taken&&Math.abs(c.x-worldState.x)<.55&&sameLevel(c.y,worldState.y,.8));}
function treasureHere(){return worldState.treasures.find(t=>!t.taken&&Math.abs(t.x-worldState.x)<.6&&sameLevel(t.y,worldState.y,.9));}
function currentEnemyState(e){const cycle=e.cycle||defaultCycle(e.type);return cycle[e.stateIndex%cycle.length];}
function defaultCycle(type){
 if(type==='spitter')return ['idle','windup','shoot','rest'];
 if(type==='bat')return ['hover','windup','swoop','rest'];
 if(type==='shield')return ['guard','open','guard','open'];
 if(type==='boss_mushroom')return ['idle','windup','spore','rest','rest'];
 if(type==='golem')return ['idle','windup','slam','rest'];
 return ['idle','attack'];
}
function buildWorld(){
 mission=applyVariant(missions[missionIndex]);
 const start=mission.start||{x:1,y:0};
 worldState={
  x:start.x,y:start.y,displayX:start.x,displayY:start.y,dir:1,hp:5,maxHp:5,crystalCount:0,potions:1,
  pose:'idle',jumpLift:0,evade:0,lastAction:'',
  crystals:(mission.crystals||[]).map(c=>({...c,taken:false,bob:Math.random()*6.28})),
  treasures:(mission.treasures||[]).map(t=>({...t,taken:Boolean(progress.treasures[t.id]),bob:Math.random()*6.28})),
  doors:(mission.doors||[]).map(d=>({...d,open:false,openT:0})),
  enemies:(mission.enemies||[]).map(e=>({...e,maxHp:e.hp,dead:false,hitT:0,stateIndex:0}))
 };
 cameraX=Math.max(0,(worldState.displayX-2.2)*tileW());cameraY=worldState.displayY*vertUnit()*.2;
 executingNodeId='';errorNodeId='';stepSession=false;
 updateHUD();renderProgram();updateBossHud();
 setExec('코드를 만들고 실행해 보세요.','▶ 실행을 누르면 캐릭터가 코드대로 모험합니다.');
}
function applyVariant(m){
 const c=clone(m);
 if(c.variants?.length){
  const idx=(Number(progress.best['variant_'+missionIndex])||0)%c.variants.length;
  c.enemies=c.variants[idx].map(x=>({x,y:0,type:'blob',hp:1}));
 }
 return c;
}
function tween(ms,update){
 return new Promise(resolve=>{const start=performance.now();function frame(now){const t=Math.min(1,(now-start)/ms);update(1-Math.pow(1-t,3),t);if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
}
async function moveTo(x,y,mode='walk'){
 const fx=worldState.displayX,fy=worldState.displayY;worldState.pose=mode==='dash'?'walk':'walk';
 await tween(speedMs(mode==='dash'?180:270),(q,t)=>{worldState.displayX=fx+(x-fx)*q;worldState.displayY=fy+(y-fy)*q;worldState.jumpLift=mode==='walk'?Math.sin(t*Math.PI)*4:0;});
 worldState.x=x;worldState.y=y;worldState.displayX=x;worldState.displayY=y;worldState.jumpLift=0;worldState.pose='idle';
}
async function jumpTo(x,y,high=false){
 const fx=worldState.displayX,fy=worldState.displayY;worldState.pose='jump';
 await tween(speedMs(high?520:430),(q,t)=>{worldState.displayX=fx+(x-fx)*q;worldState.displayY=fy+(y-fy)*q;worldState.jumpLift=Math.sin(t*Math.PI)*(high?155:105);});
 worldState.x=x;worldState.y=y;worldState.displayX=x;worldState.displayY=y;worldState.jumpLift=0;worldState.pose='idle';
}
async function dropTo(y){
 const fy=worldState.displayY;worldState.pose='jump';
 await tween(speedMs(260),(q)=>{worldState.displayY=fy+(y-fy)*q;worldState.jumpLift=-Math.sin(q*Math.PI)*12;});
 worldState.y=y;worldState.displayY=y;worldState.jumpLift=0;worldState.pose='idle';
}
async function attackEnemy(e){
 worldState.pose='attack';e.hitT=performance.now()+speedMs(230);
 await tween(speedMs(210),()=>{});
 const state=currentEnemyState(e);
 if(e.type==='shield'&&state==='guard'){sound('ui.error');toast('방패에 막혔어! 방어가 풀릴 때를 노려봐.',true);worldState.pose='idle';return {blocked:true};}
 e.hp--;sound('combat.impact_heavy');
 if(e.hp<=0){e.dead=true;toast(e.boss?'보스의 버그 코어가 깨졌다!':'버그 몬스터 제거!');}
 worldState.pose='idle';updateBossHud();return {blocked:false};
}
async function hurtPlayer(amount=1){
 worldState.hp=Math.max(0,worldState.hp-amount);worldState.pose='hurt';sound('combat.hurt_voice');await tween(speedMs(170),()=>{});worldState.pose='idle';updateHUD();
}
async function openDoor(d){sound('ui.confirm');d.open=true;await tween(speedMs(240),q=>{d.openT=q;});}

const worldAPI={
 checkCondition(cond){
  if(cond==='enemyAhead')return Boolean(enemyAhead());
  if(cond==='gapAhead'){
   const x=worldState.x+worldState.dir;return surfaceNear(x,worldState.y,.75,.9)===null;
  }
  if(cond==='platformAbove'){
   const x=worldState.x+worldState.dir*2;return platformCandidatesAt(x).some(y=>y>worldState.y+.7&&y<=worldState.y+5);
  }
  if(cond==='hpLow')return worldState.hp<=2;
  if(cond==='enemyWindup')return worldState.enemies.some(e=>!e.dead&&Math.abs(e.x-worldState.x)<=4.2&&Math.abs(e.y-worldState.y)<=3&&currentEnemyState(e)==='windup');
  if(cond==='crystals3')return worldState.crystalCount>=3;
  return false;
 },
 async applyAction(type){
  errorNodeId='';worldState.lastAction=type;
  if(type==='FWD'||type==='BACK'){
   const dir=type==='BACK'?-worldState.dir:worldState.dir,x=worldState.x+dir;
   const y=surfaceNear(x,worldState.y,.75,.9);
   if(y===null)return {ok:false,message:'앞이 끊겨 있어요. 점프하거나 다른 길을 찾아보세요.'};
   if(enemyAt(x,y))return {ok:false,message:'앞에 버그 몬스터가 있어요. 먼저 처리해야 해요.'};
   const d=worldState.doors.find(v=>!v.open&&Math.abs(v.x-x)<.6&&sameLevel(v.y,y,1));if(d)return {ok:false,message:'문이 길을 막고 있어요.'};
   await moveTo(x,y);sound('ui.tick');updateHUD();return {ok:true,checkpoint:checkpointAt(x)};
  }
  if(type==='JUMP'||type==='HIGH_JUMP'){
   const high=type==='HIGH_JUMP',x=worldState.x+worldState.dir*2,y=jumpSurface(x,worldState.y,high);
   if(y===null)return {ok:false,message:high?'높이 뛰어도 착지할 발판이 없어요.':'점프해서 착지할 곳이 없어요.'};
   const mid=worldState.x+worldState.dir;
   if(enemyAt(mid,worldState.y)&&!high)return {ok:false,message:'몬스터가 점프 길을 막고 있어요.'};
   await jumpTo(x,y,high);sound('ui.confirm');updateHUD();return {ok:true,checkpoint:checkpointAt(x)};
  }
  if(type==='DROP'){
   const y=lowerSurface(worldState.x,worldState.y);if(y===null)return {ok:false,message:'바로 아래에 내려갈 길이 없어요.'};
   await dropTo(y);updateHUD();return {ok:true};
  }
  if(type==='DASH'){
   const x=worldState.x+worldState.dir*2,y=surfaceNear(x,worldState.y,1,1.1),mid=worldState.x+worldState.dir;
   if(y===null||enemyAt(mid,worldState.y)||enemyAt(x,y)||doorAhead(2.1))return {ok:false,message:'대시할 길이 막혀 있어요.'};
   await moveTo(x,y,'dash');sound('ui.confirm');updateHUD();return {ok:true,checkpoint:checkpointAt(x)};
  }
  if(type==='DODGE'){
   worldState.evade=1;worldState.pose='duck';const back=worldState.x-worldState.dir;
   const by=surfaceNear(back,worldState.y,.6,.8);
   if(by!==null&&!enemyAt(back,by))await moveTo(back,by,'dash');else await tween(speedMs(150),()=>{});
   worldState.pose='idle';return {ok:true};
  }
  if(type==='ATTACK'){
   const e=enemyAhead(1.35);if(!e)return {ok:false,message:'공격할 적이 바로 앞에 없어요.'};
   const r=await attackEnemy(e);updateHUD();return {ok:true,events:r.blocked?[{message:'방패가 공격을 튕겨냈어요.'}]:[]};
  }
  if(type==='WAIT'){worldState.pose='idle';await tween(speedMs(210),()=>{});return {ok:true};}
  if(type==='COLLECT'){
   const c=crystalHere();if(c){c.taken=true;worldState.crystalCount++;sound('collect.coin_pickup');updateHUD();return {ok:true};}
   const t=treasureHere();if(t){t.taken=true;claimTreasure(t);sound('success.correct');toast(t.name+' 획득!');return {ok:true};}
   return {ok:false,message:'지금 있는 곳에는 주울 것이 없어요.'};
  }
  if(type==='OPEN'){
   const d=doorAhead();if(!d)return {ok:false,message:'바로 앞에 닫힌 문이 없어요.'};
   if(worldState.crystalCount<d.need)return {ok:false,message:'수정이 '+d.need+'개 필요해요. 지금은 '+worldState.crystalCount+'개예요.'};
   await openDoor(d);return {ok:true};
  }
  if(type==='HEAL'){
   if(worldState.potions<=0)return {ok:false,message:'회복 코어를 이미 사용했어요.'};
   if(worldState.hp>=worldState.maxHp)return {ok:false,message:'지금은 체력이 가득 차 있어요.'};
   worldState.potions--;worldState.hp=Math.min(worldState.maxHp,worldState.hp+2);sound('success.correct');updateHUD();return {ok:true};
  }
  return {ok:false,message:'알 수 없는 명령이에요.'};
 },
 async afterPlayerAction(){
  const events=[];let damage=0;
  for(const e of worldState.enemies){
   if(e.dead)continue;
   const cycle=e.cycle||defaultCycle(e.type);
   e.stateIndex=(e.stateIndex+1)%cycle.length;
   const state=currentEnemyState(e);
   const dx=Math.abs(e.x-worldState.x),dy=Math.abs(e.y-worldState.y);
   let hits=false;
   if((e.type==='spitter'||e.type==='boss_mushroom')&&(state==='shoot'||state==='spore')&&dx<=5&&dy<=2.2)hits=true;
   else if(e.type==='bat'&&state==='swoop'&&dx<=2.7)hits=true;
   else if(e.type==='golem'&&state==='slam'&&dx<=2.2&&dy<=1.2)hits=true;
   else if((e.type==='blob'||e.type==='mush'||e.type==='ghost'||e.type==='shield')&&state==='attack'&&dx<=1.25&&dy<=1.2)hits=true;
   if(hits){
    if(worldState.evade>0){events.push({message:'회피 성공!'});sound('ui.confirm');}
    else damage++;
   }
  }
  if(worldState.evade>0)worldState.evade=0;
  if(damage>0){await hurtPlayer(damage);events.push({message:'버그 공격에 맞았어요!'});}
  updateBossHud();
  return {defeat:worldState.hp<=0,event:events[0]};
 },
 isComplete(){
  const g=mission.goal||{x:0,y:0};
  const atGoal=Math.abs(worldState.x-g.x)<.55&&Math.abs(worldState.y-g.y)<1;
  const bossAlive=worldState.enemies.some(e=>e.boss&&!e.dead);
  return atGoal&&!bossAlive;
 }
};

function checkpointAt(x){
 if(!Array.isArray(mission.checkpoints))return '';
 const c=mission.checkpoints.find(v=>Math.abs(v.x-x)<.4&&!v.hit);
 if(c){c.hit=true;return c.name||'체크포인트';}
 return '';
}
function claimTreasure(t){
 if(progress.treasures[t.id])return;
 progress.treasures[t.id]=true;
 if(t.memoryBonus)progress.memoryBonus+=t.memoryBonus;
 saveProgress();renderInventory();
}
function claimReward(index){
 const r=missions[index]?.reward;if(!r||progress.rewardClaimed[index])return;
 progress.rewardClaimed[index]=true;progress.inventory[r.id]=true;
 if(r.memoryBonus)progress.memoryBonus+=r.memoryBonus;
 saveProgress();renderInventory();
}
function getUnlockedBlocks(){
 const out=new Set();
 Object.entries(progress.inventory).forEach(([id,on])=>{
  if(!on)return;
  for(const m of missions){if(m.reward?.id===id)(m.reward.unlockBlocks||[]).forEach(b=>out.add(b));}
 });
 return out;
}
function allowedBlocks(){
 const s=new Set(mission.available||[]);getUnlockedBlocks().forEach(b=>s.add(b));return [...s];
}
function memoryLimit(){return (mission.functionMemory&&codeTarget==='function'?mission.functionMemory:mission.memory)+(codeTarget==='main'?progress.memoryBonus:0);}
function activeRoot(){return codeTarget==='function'?functionProgram:mainProgram;}
function resolveContainer(root,path,which='body'){
 let list=root;
 for(const part of path){
  const [id,branch='body']=String(part).split(':');
  const node=list.find(n=>n.id===id);if(!node)break;
  if(!Array.isArray(node[branch]))node[branch]=[];
  list=node[branch];
 }
 return list;
}
function invalidateExecution(){runtime.stop();runtime.iterator=null;stepSession=false;executingNodeId='';errorNodeId='';setExecuting(false);setExec('코드가 바뀌었어요.','다시 실행하면 구역 처음부터 확인합니다.');}
function addBlock(type){
 if(!allowedBlocks().includes(type)){toast('아직 잠긴 명령이에요.',true);return;}
 if(codeTarget==='function'&&type==='CALL_FN'){toast('나의 기술 안에서 자기 자신은 부를 수 없어요.',true);return;}
 const root=activeRoot();if(RuntimeAPI.countNodes(root)>=memoryLimit()){toast('메모리가 꽉 찼어요. 반복이나 나의 기술로 코드를 줄여 보세요.',true);sound('ui.error');return;}
 const def=BLOCKS[type],node={id:makeId(),type};if(def.kind==='structure'||def.kind==='condition')node.body=[];if(def.kind==='condition')node.elseBody=[];
 resolveContainer(root,insertPath).push(node);if(node.body)insertPath=insertPath.concat(node.id+':body');
 persistCode();invalidateExecution();renderAllEditor();sound('ui.click');
}
function removeNode(root,id){
 for(let i=0;i<root.length;i++){
  if(root[i].id===id){root.splice(i,1);return true;}
  if(root[i].body&&removeNode(root[i].body,id))return true;
  if(root[i].elseBody&&removeNode(root[i].elseBody,id))return true;
 }return false;
}
function moveNode(root,id,d){
 for(let i=0;i<root.length;i++){
  if(root[i].id===id){const ni=i+d;if(ni<0||ni>=root.length)return true;const n=root.splice(i,1)[0];root.splice(ni,0,n);return true;}
  if(root[i].body&&moveNode(root[i].body,id,d))return true;
  if(root[i].elseBody&&moveNode(root[i].elseBody,id,d))return true;
 }return false;
}
function renderNodes(list,parent,path){
 if(!list.length){const e=document.createElement('div');e.className='program-empty';e.textContent=path.length?'여기에 실행할 명령을 넣어 보세요.':'아래 명령을 눌러 프로그램을 만들어요.';parent.appendChild(e);return;}
 list.forEach((node,index)=>{
  const def=BLOCKS[node.type]||{label:node.type,kind:'action',icon:'·'};
  const el=document.createElement('div');el.className='node '+def.kind+(node.id===executingNodeId?' active':'')+(node.id===errorNodeId?' error':'');el.dataset.nodeId=node.id;
  const row=document.createElement('div');row.className='node-main';
  const idx=document.createElement('span');idx.className='node-index';idx.textContent=index+1;
  const label=document.createElement('span');label.className='node-label';label.textContent=(def.icon||'')+' '+def.label;
  const controls=document.createElement('div');controls.className='node-controls';
  [['↑',-1],['↓',1]].forEach(([t,d])=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.onclick=ev=>{ev.stopPropagation();moveNode(activeRoot(),node.id,d);persistCode();invalidateExecution();renderAllEditor();};controls.appendChild(b);});
  const del=document.createElement('button');del.type='button';del.textContent='×';del.onclick=ev=>{ev.stopPropagation();removeNode(activeRoot(),node.id);insertPath=[];persistCode();invalidateExecution();renderAllEditor();};controls.appendChild(del);
  row.append(idx,label,controls);el.appendChild(row);
  row.onclick=()=>{if(node.body){insertPath=path.concat(node.id+':body');renderAllEditor();toast(def.label+' 안쪽에 명령을 추가합니다.');}};
  if(node.body){
   const body=document.createElement('div');body.className='node-body'+(node.body.length?'':' empty');renderNodes(node.body,body,path.concat(node.id+':body'));el.appendChild(body);
   if(def.kind==='condition'){
    const elseHead=document.createElement('button');elseHead.type='button';elseHead.className='else-head';elseHead.textContent='아니면';
    elseHead.onclick=ev=>{ev.stopPropagation();insertPath=path.concat(node.id+':elseBody');renderAllEditor();toast('조건이 거짓일 때 실행할 명령을 추가합니다.');};
    el.appendChild(elseHead);
    if(node.elseBody?.length){const eb=document.createElement('div');eb.className='node-body else-body';renderNodes(node.elseBody,eb,path.concat(node.id+':elseBody'));el.appendChild(eb);}
   }
  }
  parent.appendChild(el);
 });
}
function findNodeLabel(list,id){
 for(const n of list){if(n.id===id)return BLOCKS[n.type]?.label||n.type;for(const k of ['body','elseBody'])if(n[k]){const v=findNodeLabel(n[k],id);if(v)return v;}}return '';
}
function renderProgram(){
 const root=$('program');root.replaceChildren();renderNodes(activeRoot(),root,[]);
 $('blockValue').textContent=RuntimeAPI.countNodes(activeRoot())+'/'+memoryLimit();$('codeModeTitle').textContent=codeTarget==='function'?'나의 기술':'메인 코드';
 const labels=insertPath.map(p=>findNodeLabel(activeRoot(),String(p).split(':')[0])+(String(p).includes('elseBody')?' / 아니면':'')).filter(Boolean);
 $('insertPath').textContent=labels.length?'추가 위치: '+labels.join(' › '):'여기에 명령이 추가돼요.';
 updateMiniCode();
}
function renderPalette(){
 const root=$('palette');root.replaceChildren();
 allowedBlocks().forEach(type=>{
  if(codeTarget==='function'&&type==='CALL_FN')return;
  const def=BLOCKS[type],b=document.createElement('button');b.type='button';b.className=def.kind||'action';b.innerHTML='<b>'+def.icon+'</b>'+def.label;b.onclick=()=>addBlock(type);root.appendChild(b);
 });
}
function renderAllEditor(){renderProgram();renderPalette();}
function updateMiniCode(){
 const mini=$('miniCodeLines');if(!mini)return;mini.replaceChildren();
 const flat=[];function walk(list,depth=0){for(const n of list||[]){flat.push({n,depth});if(n.body)walk(n.body,depth+1);if(n.elseBody?.length)walk(n.elseBody,depth+1);}}walk(mainProgram);
 const idx=Math.max(0,flat.findIndex(v=>v.n.id===executingNodeId));const from=Math.max(0,idx-1),to=Math.min(flat.length,from+4);
 for(let i=from;i<to;i++){const v=flat[i],d=document.createElement('div');d.className=v.n.id===executingNodeId?'active':'';d.style.paddingLeft=(v.depth*10)+'px';d.textContent=(v.n.id===executingNodeId?'▶ ':'  ')+(BLOCKS[v.n.type]?.label||v.n.type);mini.appendChild(d);}
}
function updateHUD(){
 $('hpValue').textContent=worldState?.hp??5;$('crystalValue').textContent=worldState?.crystalCount??0;$('variableCrystal').textContent=worldState?.crystalCount??0;$('variableHp').textContent=worldState?.hp??5;renderProgram();
}
function updateBossHud(){
 const box=$('bossHud');if(!box||!worldState)return;const boss=worldState.enemies.find(e=>e.boss&&!e.dead);
 if(!boss){box.classList.add('hidden');return;}box.classList.remove('hidden');$('bossName').textContent=boss.type==='boss_mushroom'?'BUGCAP · 왕버섯':'NULL GOLEM';$('bossHp').style.width=(100*boss.hp/boss.maxHp)+'%';$('bossState').textContent=stateLabel(currentEnemyState(boss));
}
function stateLabel(s){return ({idle:'대기',windup:'공격 준비!',shoot:'독포자!',spore:'포자 폭발!',rest:'빈틈',hover:'비행',swoop:'급강하!',guard:'방어 중',open:'빈틈',slam:'내려찍기!'})[s]||s;}
function missionRequirementOK(){
 if(mission.requireFunction&&!functionProgram.length)return {ok:false,message:'나의 기술을 하나 만들어 사용해 보세요.'};
 if(mission.requireType&&!RuntimeAPI.containsType(mainProgram,mission.requireType))return {ok:false,message:'이번 구역은 '+BLOCKS[mission.requireType].label+'을 활용해 해결해 보세요.'};
 return {ok:true};
}
function handleMissionDone(){
 const req=missionRequirementOK();if(!req.ok){failures++;sound('ui.error');setExec('목적지에는 왔지만…',req.message,'error');toast(req.message,true);stepSession=false;setExecuting(false);return;}
 if(cleared)return;cleared=true;worldState.pose='cheer';sound('success.victory_fanfare');setExecuting(false);
 const count=RuntimeAPI.countNodes(mainProgram),short=count<=mission.par,clean=failures===0;
 progress.completed[missionIndex]=true;progress.unlocked=Math.max(progress.unlocked,Math.min(missions.length,missionIndex+2));
 const old=progress.best[missionIndex];progress.best[missionIndex]=!old||count<old?count:old;progress.current=Math.min(missions.length-1,missionIndex+1);
 progress.best['variant_'+missionIndex]=(Number(progress.best['variant_'+missionIndex])||0)+1;claimReward(missionIndex);saveProgress();
 try{window.KidscadeGame?.score?.(Object.keys(progress.completed).filter(k=>progress.completed[k]).length,{unit:'구역'});}catch(_){}
 $('clearTitle').textContent=mission.boss?'지역 정화 완료!':missionIndex===9?'입단 시험 통과!':'구역 돌파!';
 $('clearText').textContent='메인 코드 '+count+'블록으로 해결했어요.';$('shortBadge').classList.toggle('earned',short);$('shortBadge').textContent=(short?'✓':'◇')+' 짧은 코드';$('debugBadge').classList.toggle('earned',clean);$('debugBadge').textContent=(clean?'✓':'◇')+' 한 번에 성공';
 const r=mission.reward;if(r){$('unlockBox').textContent='획득 · '+r.name+' — '+r.desc;$('unlockBox').classList.remove('hidden');}else $('unlockBox').classList.add('hidden');
 $('nextBtn').textContent=missionIndex===9?'월드맵 열기':missionIndex===missions.length-1?'월드맵으로':'다음 구역';
 $('clear').classList.remove('hidden');setExec('임무 해결!','장비와 프로그램은 다음 구역에도 이어집니다.');renderMissionGrid();renderWorldMap();renderInventory();
}
function setMissionText(){
 $('chapterName').textContent=mission.chapter;$('missionName').textContent=mission.name;$('missionKicker').textContent=mission.concept;$('missionTitle').textContent=mission.title;$('missionText').textContent=mission.text;$('objectiveText').textContent=mission.objective;
}
function loadMission(index,resetCode=false){
 missionIndex=Math.max(0,Math.min(missions.length-1,index));mission=missions[missionIndex];nodeSeq=0;cleared=false;failures=0;stepSession=false;insertPath=[];codeTarget='main';
 const slot=currentStore(),carry=mission.carryProgram?previousCarryStore():null;
 if(resetCode){mainProgram=[];functionProgram=[];}
 else if((slot.main?.length||slot.fn?.length)){mainProgram=normalizeNodes(clone(slot.main||[]));functionProgram=normalizeNodes(clone(slot.fn||[]));}
 else if(carry){mainProgram=normalizeNodes(clone(carry.main||[]));functionProgram=normalizeNodes(clone(carry.fn||[]));}
 else{mainProgram=[];functionProgram=[];}
 persistCode();setMissionText();buildWorld();renderAllEditor();renderMissionGrid();document.querySelectorAll('.code-tab').forEach(b=>b.classList.toggle('active',b.dataset.codeTarget==='main'));
 $('missionSelect').classList.add('hidden');$('worldMapOverlay')?.classList.add('hidden');$('clear').classList.add('hidden');
 try{window.KidscadeGame?.start?.({stage:missionIndex+1,title:mission.title});}catch(_){}
}
function renderMissionGrid(){
 const root=$('missionGrid');root.replaceChildren();let lastArc='';
 missions.forEach((m,i)=>{
  if(m.arc!==lastArc){lastArc=m.arc;const h=document.createElement('div');h.className='mission-arc';h.textContent=m.arc==='prologue'?'코드 캠프 · 입단 시험':'버섯 숲 · 첫 원정';root.appendChild(h);}
  const b=document.createElement('button');b.type='button';b.className='mission-item'+(i>=progress.unlocked?' locked':'')+(progress.completed[i]?' done':'');b.innerHTML='<b>'+(progress.completed[i]?'✓ ':'')+m.name+'</b><span>'+m.concept+' · 메모리 '+(m.memory+(progress.memoryBonus||0))+'</span>';b.disabled=i>=progress.unlocked;b.onclick=()=>loadMission(i,false);root.appendChild(b);
 });
}
function renderWorldMap(){
 const root=$('campaignMap');if(!root)return;root.replaceChildren();
 for(const region of regions){
  const locked=region.locked||Number.isInteger(region.requiresMission)&&!progress.completed[region.requiresMission];
  const btn=document.createElement('button');btn.type='button';btn.className='map-node'+(locked?' locked':'');
  btn.style.left=region.x+'%';btn.style.top=region.y+'%';
  const doneCount=Array.from({length:region.end-region.start+1},(_,k)=>region.start+k).filter(i=>progress.completed[i]).length;
  btn.innerHTML='<span>'+region.icon+'</span><b>'+region.name+'</b><small>'+region.subtitle+(locked?' · 잠김':' · '+doneCount+'/'+(region.end-region.start+1))+'</small>';
  btn.disabled=locked;
  btn.onclick=()=>{const next=Array.from({length:region.end-region.start+1},(_,k)=>region.start+k).find(i=>!progress.completed[i]&&i<progress.unlocked)??region.start;loadMission(next,false);};
  root.appendChild(btn);
 }
}
function renderInventory(){
 const root=$('inventoryGrid');if(!root)return;root.replaceChildren();
 const owned=Object.keys(progress.inventory).filter(k=>progress.inventory[k]);
 if(!owned.length){root.innerHTML='<div class="inventory-empty">아직 장비가 없어요. 입단 시험을 진행해 보세요.</div>';return;}
 owned.forEach(id=>{const d=document.createElement('div');d.className='gear-card';d.innerHTML='<span>'+gearIcon(id)+'</span><div><b>'+rewardNames[id]+'</b><small>'+gearDesc(id)+'</small></div>';root.appendChild(d);});
 $('memoryBonusText').textContent='추가 메모리 +'+(progress.memoryBonus||0);
}
function gearIcon(id){if(id.includes('sensor'))return '◉';if(id.includes('boots'))return '⇈';if(id.includes('core'))return '◆';if(id.includes('blade'))return '⚔';if(id.includes('loop'))return '↻';if(id.includes('function'))return 'ƒ';if(id.includes('badge'))return '★';return '▣';}
function gearDesc(id){
 const map={reflex_sensor:'공격 준비 상태 감지 + 회피',altimeter:'위쪽 발판 감지',high_jump_boots:'높이 점프와 하강',dash_boots:'대시 명령',forest_core:'코드 메모리 +4'};
 return map[id]||'코딩 행동과 센서를 확장하는 원정 장비';
}

const runtime=new RuntimeAPI.Runtime({
 world:worldAPI,delay:140,
 onEvent(event){
  if(event.node){executingNodeId=event.node.id;errorNodeId='';renderProgram();}
  if(event.kind==='run-start'){setExecuting(true);setRunButtons(true);}
  else if(event.kind==='run-stop'){setExecuting(false);setRunButtons(false);}
  else if(event.kind==='check'){const def=BLOCKS[event.node.type];$('sensorReadout').textContent='센서: '+(event.result?'참 ✓':'거짓 ✕');setExec(def.label,event.result?'참 → 안쪽 실행':'거짓 → 아니면/다음으로','running');}
  else if(event.kind==='else')setExec('아니면','조건이 거짓이라 이쪽 코드를 실행해요.','running');
  else if(event.kind==='loop')setExec(BLOCKS[event.node.type].label,event.index+' / '+event.total+'번째 반복','running');
  else if(event.kind==='call')setExec('나의 기술','저장한 행동 묶음을 실행합니다.','running');
  else if(event.kind==='action')setExec(BLOCKS[event.node.type].label,'캐릭터가 이 명령을 실행하는 중','running');
  else if(event.kind==='checkpoint'){toast('체크포인트 · '+event.name);}
  else if(event.kind==='enemy-event'&&event.message)toast(event.message,event.message.includes('맞'));
  updateMiniCode();
 },
 onError(node,message){failures++;errorNodeId=node?.id||executingNodeId;renderProgram();sound('ui.error');setExec('여기서 버그 발생',message,'error');toast(message,true);stepSession=false;setExecuting(false);setRunButtons(false);},
 onDone(){handleMissionDone();}
});
function setSpeed(v){
 runSpeed=v;runtime.setDelay(140/v);document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===v));
}

function drawSky(w,h,time){
 const forest=mission?.arc==='forest';
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,forest?'#132d32':'#132a4f');g.addColorStop(.56,forest?'#28614f':'#285c7e');g.addColorStop(1,forest?'#76a85f':'#7cc5b2');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.globalAlpha=.12;ctx.fillStyle='#fff';for(let i=0;i<7;i++){const x=((i*243-cameraX*.11)%(w+260))-130,y=55+(i%3)*50;ctx.beginPath();ctx.ellipse(x,y,78,22,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 ctx.fillStyle=forest?'#173d38':'#183c53';for(let i=-2;i<12;i++){const x=i*230-(cameraX*.25%230);ctx.beginPath();ctx.moveTo(x,h*.72);ctx.lineTo(x+110,h*.33+(i%2)*42);ctx.lineTo(x+250,h*.72);ctx.fill();}
 if(forest){ctx.fillStyle='#1e513f';for(let i=-2;i<22;i++){const x=i*95-(cameraX*.52%95),y=h*.73;ctx.fillRect(x+28,y-110-(i%3)*20,10,120);ctx.beginPath();ctx.arc(x+33,y-125-(i%3)*20,35,0,Math.PI*2);ctx.fill();}}
}
function drawPlatforms(h){
 const tw=tileW(),vu=vertUnit();
 for(const p of mission.platforms||[]){
  const x=sx(p.x)-tw*.5,y=sy(p.y),w=p.w*tw;
  const grad=ctx.createLinearGradient(0,y,0,y+70);grad.addColorStop(0,mission.arc==='forest'?'#6d9c4d':'#63a84b');grad.addColorStop(.16,mission.arc==='forest'?'#385c37':'#294735');grad.addColorStop(1,'#1e3128');
  ctx.fillStyle=grad;ctx.fillRect(x,y,w,Math.max(14,h-y+10));ctx.fillStyle='#9ad86e';ctx.fillRect(x,y,w,5);ctx.fillStyle='#24372c';ctx.fillRect(x,y+13,w,5);
 }
}
function drawGoal(){
 const g=mission.goal,x=sx(g.x),y=sy(g.y);ctx.save();ctx.translate(x,y);ctx.strokeStyle='#91ffe0';ctx.lineWidth=5;ctx.shadowColor='#62f6d1';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,-55,27,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#d9fff4';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillText('EXIT',0,-52);ctx.restore();
}
function drawCrystal(c,time){
 if(c.taken)return;const x=sx(c.x),y=sy(c.y)-38-Math.sin(time*.004+c.bob)*5;ctx.save();ctx.translate(x,y);ctx.rotate(time*.0015+c.bob);ctx.fillStyle='#76eaff';ctx.shadowColor='#4adcfb';ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(10,0);ctx.lineTo(0,15);ctx.lineTo(-10,0);ctx.closePath();ctx.fill();ctx.restore();
}
function drawTreasure(t,time){
 if(t.taken)return;const x=sx(t.x),y=sy(t.y)-27-Math.sin(time*.003+t.bob)*3;ctx.save();ctx.translate(x,y);ctx.fillStyle='#f6c85b';ctx.shadowColor='#ffd969';ctx.shadowBlur=16;ctx.fillRect(-15,-16,30,22);ctx.fillStyle='#9b5d2d';ctx.fillRect(-15,-8,30,5);ctx.fillStyle='#fff0a9';ctx.fillRect(-3,-9,6,8);ctx.restore();
}
function drawDoor(d){if(d.open&&d.openT>=1)return;const x=sx(d.x),y=sy(d.y),scale=1-d.openT;ctx.save();ctx.translate(x,y);ctx.scale(1,Math.max(.02,scale));ctx.fillStyle='#704936';ctx.fillRect(-12,-102,24,102);ctx.fillStyle='#e1ae4c';ctx.fillRect(-8,-95,16,8);ctx.restore();}
function drawEnemy(e,time){
 if(e.dead)return;const x=sx(e.x),y=sy(e.y),state=currentEnemyState(e),hit=e.hitT>performance.now();ctx.save();ctx.translate(x+(hit?Math.sin(time*.09)*5:0),y-28);const boss=e.boss?1.75:1;ctx.scale(boss,boss);
 if(state==='windup'){ctx.shadowColor='#ff6b6b';ctx.shadowBlur=22;ctx.fillStyle='#ff8585';ctx.beginPath();ctx.arc(0,-46,5,0,Math.PI*2);ctx.fill();ctx.font='900 16px system-ui';ctx.fillText('!',-2,-42);}
 if(e.type==='bat'){ctx.fillStyle='#7c67bc';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(-25,-24);ctx.lineTo(-18,2);ctx.lineTo(0,10);ctx.lineTo(18,2);ctx.lineTo(25,-24);ctx.closePath();ctx.fill();}
 else if(e.type==='shield'){ctx.fillStyle='#70889a';ctx.fillRect(-16,-32,32,34);ctx.fillStyle=state==='guard'?'#d0d9e0':'#61707c';ctx.fillRect(-24,-30,12,36);}
 else if(e.type==='boss_mushroom'||e.type==='spitter'||e.type==='mush'){ctx.fillStyle=e.boss?'#b64f87':'#e58b5e';ctx.beginPath();ctx.arc(0,-14,e.boss?25:21,Math.PI,0);ctx.lineTo(e.boss?23:18,-2);ctx.lineTo(e.boss?-23:-18,-2);ctx.closePath();ctx.fill();ctx.fillStyle='#e8d4b7';ctx.fillRect(e.boss?-11:-8,-2,e.boss?22:16,e.boss?28:20);}
 else if(e.type==='golem'){ctx.fillStyle='#8799a8';ctx.fillRect(-19,-35,38,38);ctx.fillStyle='#61717e';ctx.fillRect(-25,-23,8,24);ctx.fillRect(17,-23,8,24);}
 else if(e.type==='ghost'){ctx.fillStyle='#a98ef4';ctx.beginPath();ctx.arc(0,-14,20,Math.PI,0);ctx.lineTo(20,14);ctx.lineTo(10,7);ctx.lineTo(0,14);ctx.lineTo(-10,7);ctx.lineTo(-20,14);ctx.closePath();ctx.fill();}
 else{ctx.fillStyle='#6ed28a';ctx.beginPath();ctx.arc(0,-8,22,Math.PI,0);ctx.quadraticCurveTo(26,14,0,15);ctx.quadraticCurveTo(-26,14,-22,-8);ctx.fill();}
 ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.fillRect(-9,-15,5,6);ctx.fillRect(5,-15,5,6);ctx.fillStyle='#18222a';ctx.fillRect(-7,-13,2,3);ctx.fillRect(7,-13,2,3);
 if(e.maxHp>1&&!e.boss){ctx.fillStyle='#15202a';ctx.fillRect(-23,-46,46,5);ctx.fillStyle='#ef6c6c';ctx.fillRect(-23,-46,46*(e.hp/e.maxHp),5);}
 ctx.restore();
}
function heroImage(){
 if(worldState.pose==='jump')return images.jump;if(worldState.pose==='attack')return images.attack;if(worldState.pose==='hurt')return images.hurt;if(worldState.pose==='cheer')return images.cheer;if(worldState.pose==='duck')return images.duck;if(worldState.pose==='walk')return Math.floor(performance.now()/90)%2?images.walk1:images.walk2;return images.idle;
}
function drawHero(){
 const x=sx(worldState.displayX),y=sy(worldState.displayY)-worldState.jumpLift,im=heroImage();ctx.save();ctx.translate(x,y);if(worldState.dir<0)ctx.scale(-1,1);
 if(im?.complete&&im.naturalWidth){const h=84,w=h*(im.naturalWidth/im.naturalHeight);ctx.drawImage(im,-w*.5,-h+4,w,h);}else{ctx.fillStyle='#5da4ff';ctx.fillRect(-18,-62,36,62);}ctx.restore();
}
function render(time){
 const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h){requestAnimationFrame(render);return;}
 if(worldState){
  const targetX=Math.max(0,worldState.displayX*tileW()-w*.36);cameraX+=(targetX-cameraX)*.075;
  const targetY=worldState.displayY*vertUnit()*.24;cameraY+=(targetY-cameraY)*.06;
 }
 drawSky(w,h,time);if(mission&&worldState){drawPlatforms(h);drawGoal();worldState.crystals.forEach(c=>drawCrystal(c,time));worldState.treasures.forEach(t=>drawTreasure(t,time));worldState.doors.forEach(drawDoor);worldState.enemies.forEach(e=>drawEnemy(e,time));drawHero();}
 requestAnimationFrame(render);
}
requestAnimationFrame(render);

$('newBtn').onclick=()=>{progress=defaultProgress();saveProgress();$('intro').classList.add('hidden');loadMission(0,true);};
$('continueBtn').onclick=()=>{$('intro').classList.add('hidden');loadMission(Math.min(progress.unlocked-1,progress.current||0),false);};
$('continueBtn').classList.toggle('hidden',progress.unlocked<=1&&!Object.keys(progress.completed).length);
$('missionsBtn').onclick=()=>{renderMissionGrid();$('missionSelect').classList.remove('hidden');};
$('closeMissions').onclick=()=>$('missionSelect').classList.add('hidden');
$('helpBtn').onclick=()=>$('help').classList.remove('hidden');
$('closeHelp').onclick=()=>$('help').classList.add('hidden');
$('mapBtn').onclick=()=>{renderWorldMap();$('worldMapOverlay').classList.remove('hidden');};
$('closeWorldMap').onclick=()=>$('worldMapOverlay').classList.add('hidden');
$('inventoryBtn').onclick=()=>{renderInventory();$('inventoryOverlay').classList.remove('hidden');};
$('closeInventory').onclick=()=>$('inventoryOverlay').classList.add('hidden');
document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>setSpeed(Number(b.dataset.speed)));
document.querySelectorAll('.code-tab').forEach(b=>b.onclick=()=>{codeTarget=b.dataset.codeTarget;insertPath=[];document.querySelectorAll('.code-tab').forEach(x=>x.classList.toggle('active',x===b));renderAllEditor();});
$('outBtn').onclick=()=>{if(insertPath.length)insertPath.pop();renderAllEditor();};
$('undoBtn').onclick=()=>{const c=resolveContainer(activeRoot(),insertPath);if(c.length){c.pop();persistCode();invalidateExecution();renderAllEditor();}};
$('clearBtn').onclick=()=>{if(codeTarget==='function')functionProgram=[];else mainProgram=[];insertPath=[];persistCode();invalidateExecution();renderAllEditor();};
$('runBtn').onclick=async()=>{if(!mainProgram.length){toast('먼저 명령을 하나 이상 놓아 주세요.',true);return;}buildWorld();setSpeed(runSpeed);setExecuting(true);setRunButtons(true);await runtime.run(mainProgram,functionProgram);};
$('stepBtn').onclick=async()=>{if(!mainProgram.length){toast('먼저 명령을 하나 이상 놓아 주세요.',true);return;}if(!stepSession){buildWorld();runtime.prepare(mainProgram,functionProgram);stepSession=true;}setRunButtons(true);const res=await runtime.nextAction();setRunButtons(false);if(res?.done)stepSession=false;};
$('stopBtn').onclick=()=>{runtime.stop();stepSession=false;setExecuting(false);setRunButtons(false);setExec('실행을 멈췄어요.','코드를 고친 뒤 다시 실행해 보세요.');};
$('retryBtn').onclick=()=>{$('clear').classList.add('hidden');cleared=false;buildWorld();};
$('nextBtn').onclick=()=>{
 $('clear').classList.add('hidden');
 if(missionIndex===9||missionIndex===missions.length-1){renderWorldMap();$('worldMapOverlay').classList.remove('hidden');}
 else loadMission(missionIndex+1,false);
};

setSpeed(1);setMissionText();buildWorld();renderMissionGrid();renderWorldMap();renderInventory();renderAllEditor();
