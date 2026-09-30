(() => {
'use strict';
const DATA=window.CodeQuestData;
const RuntimeAPI=window.CodeQuestRuntime;
if(!DATA||!RuntimeAPI)throw new Error('Code Quest data/runtime missing');
const $=id=>document.getElementById(id);
const canvas=$('world'),ctx=canvas.getContext('2d');
const missions=DATA.missions||[],B=DATA.blocks;
const SAVE_KEY='kidscade_game_v1:high_code_quest:topdown_v1';
const TILE=56,GRID_W=20,GRID_H=13;
const DIRS={up:{x:0,y:-1,a:-Math.PI/2},right:{x:1,y:0,a:0},down:{x:0,y:1,a:Math.PI/2},left:{x:-1,y:0,a:Math.PI}};
const DIR_ORDER=['up','right','down','left'];
const GROUPS={move:'이동',combat:'전투',sensor:'센서',flow:'반복',skill:'기술',resource:'장치'};

Object.assign(B,{
 MOVE_UP:{label:'위로 이동',icon:'↑',kind:'action',concept:'이동'},
 MOVE_RIGHT:{label:'오른쪽 이동',icon:'→',kind:'action',concept:'이동'},
 MOVE_DOWN:{label:'아래로 이동',icon:'↓',kind:'action',concept:'이동'},
 MOVE_LEFT:{label:'왼쪽 이동',icon:'←',kind:'action',concept:'이동'},
 DASH:{label:'대시',icon:'»',kind:'action',concept:'이동'},
 SLASH:{label:'디버그 검격',icon:'⚔',kind:'action',concept:'전투'},
 SPIN:{label:'회전 베기',icon:'⟳',kind:'action',concept:'범위 공격'},
 BOLT:{label:'코드 볼트',icon:'✦',kind:'action',concept:'원거리 공격'},
 GUARD:{label:'가드',icon:'◇',kind:'action',concept:'방어'},
 DODGE:{label:'회피',icon:'↯',kind:'action',concept:'방어'},
 WAIT:{label:'한 턴 기다리기',icon:'…',kind:'action',concept:'타이밍'},
 HEAL:{label:'회복 패치',icon:'♥',kind:'action',concept:'변수'},
 IF_ENEMY:{label:'적이 가까이 있다면',icon:'?',kind:'condition',condition:'enemyNear',concept:'조건'},
 IF_LINE:{label:'직선에 적이 있다면',icon:'⌖',kind:'condition',condition:'enemyLine',concept:'센서'},
 IF_PROJECTILE:{label:'탄환이 날아오면',icon:'!',kind:'condition',condition:'projectileThreat',concept:'센서'},
 IF_WINDUP:{label:'적이 기술 준비 중이면',icon:'!',kind:'condition',condition:'enemyCast',concept:'상태·조건'},
 IF_WALL:{label:'앞이 막혀 있다면',icon:'▧',kind:'condition',condition:'wallAhead',concept:'조건'},
 IF_HP_LOW:{label:'HP가 3 이하라면',icon:'♥',kind:'condition',condition:'hpLow',concept:'변수·조건'},
 IF_DATA:{label:'여기에 데이터가 있다면',icon:'◆',kind:'condition',condition:'dataHere',concept:'변수·조건'},
 IF_TERMINAL:{label:'단말기 위라면',icon:'▣',kind:'condition',condition:'terminalHere',concept:'상태·조건'},
 IF_CHARGER:{label:'충전 패드 위라면',icon:'⚡',kind:'condition',condition:'chargerHere',concept:'상태·조건'},
 IF_SWITCH:{label:'스위치 위라면',icon:'◉',kind:'condition',condition:'switchHere',concept:'상태·조건'},
 UNTIL_GOAL:{label:'출구에 닿을 때까지',icon:'↻',kind:'until',condition:'atGoal',concept:'조건 반복',limit:100},
 UNTIL_ENEMIES_GONE:{label:'적이 모두 사라질 때까지',icon:'↻',kind:'until',condition:'enemiesGone',concept:'조건 반복',limit:80},
 COLLECT_DATA:{label:'데이터 줍기',icon:'◆',kind:'action',concept:'변수'},
 UPLOAD:{label:'데이터 업로드',icon:'⇧',kind:'action',concept:'변수'},
 CHARGE:{label:'에너지 충전',icon:'⚡',kind:'action',concept:'자원'},
 TOGGLE:{label:'스위치 작동',icon:'◉',kind:'action',concept:'상태'}
});

const IMAGES={};
function img(key,src){const im=new Image();im.src=src;IMAGES[key]=im;}
img('hero','../../assets/game/characters/people/kenney-top-down-shooter/survivor-1/survivor1-hold.png');
img('heroBolt','../../assets/game/characters/people/kenney-top-down-shooter/survivor-1/survivor1-gun.png');
img('robot','../../assets/game/characters/people/kenney-top-down-shooter/robot-1/robot1-hold.png');
img('robotGun','../../assets/game/characters/people/kenney-top-down-shooter/robot-1/robot1-gun.png');
img('zombie','../../assets/game/characters/people/kenney-top-down-shooter/zombie-1/zoimbie1-hold.png');

let progress=loadProgress();
let missionIndex=Math.min(missions.length-1,Math.max(0,progress.current||0));
let mission=missions[missionIndex];
let world=null;
let mainProgram=[],functionPrograms={a:[],b:[]},codeTarget='main',insertPath=[];
let nodeSeq=0,executingNodeId='',errorNodeId='',paletteGroup='all',runSpeed=1,toastTimer=0,raf=0,lastFrame=0;
let runtime=null,selectionEnemyId='',stepActive=false;

function defaultProgress(){return{current:0,unlocked:1,completed:{},programs:{},best:{},attempts:{},wins:0};}
function loadProgress(){
 let raw={};try{raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')}catch(_){}
 return {...defaultProgress(),...raw,completed:raw.completed||{},programs:raw.programs||{},best:raw.best||{},attempts:raw.attempts||{}};
}
function saveProgress(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress))}catch(_){}}
function clone(v){return JSON.parse(JSON.stringify(v));}
function makeId(){return'n'+(++nodeSeq)}
function sound(key){try{window.KidscadeGame?.sound?.(key)}catch(_){}}
function toast(text,bad=false){const el=$('toast');if(!el)return;el.textContent=text;el.style.background=bad?'#ffdede':'#eef7ff';el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1500)}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function mdist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
function cheb(a,b){return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))}
function key(x,y){return x+','+y}
function seeded(n){let s=(n*1664525+1013904223)>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}

function stageProfile(i){
 const arc=mission?.arc||'prologue',boss=Boolean(mission?.boss||i%5===4),tier=Math.floor(i/5);
 return{
  arc,boss,tier,
  enemyCount:i<2?0:boss?Math.min(3,1+Math.floor(i/18)):clamp(1+Math.floor(i/8),1,5),
  resource:i>=25,
  energy:i>=27,
  gates:i>=20,
  validation:i>=30,
  hp:6+Math.floor(i/10),
  objective:boss?'보스의 AI 패턴을 읽고 격파한 뒤 출구에 도착':i>=25?'데이터와 장치를 처리해 출구에 도착':'코드로 전장을 돌파해 출구에 도착'
 };
}
function allowedBlocks(i=missionIndex){
 const out=['MOVE_UP','MOVE_RIGHT','MOVE_DOWN','MOVE_LEFT'];
 if(i>=1)out.push('SLASH');
 if(i>=3)out.push('IF_ENEMY');
 if(i>=5)out.push('REP2','REP3');
 if(i>=7)out.push('DODGE','WAIT','IF_WINDUP');
 if(i>=10)out.push('GUARD','SPIN','IF_HP_LOW','HEAL');
 if(i>=14)out.push('BOLT','IF_LINE','IF_PROJECTILE');
 if(i>=18)out.push('UNTIL_GOAL','UNTIL_ENEMIES_GONE');
 if(i>=20)out.push('TOGGLE','IF_SWITCH','CALL_FN');
 if(i>=24)out.push('CALL_FN_B');
 if(i>=25)out.push('COLLECT_DATA','IF_DATA','UPLOAD','IF_TERMINAL');
 if(i>=27)out.push('CHARGE','IF_CHARGER');
 if(i>=30)out.push('DASH','IF_WALL','REP4');
 return [...new Set(out)];
}
function blockGroup(t){
 if(t.startsWith('MOVE_')||t==='DASH')return'move';
 if(['SLASH','SPIN','BOLT','GUARD','DODGE','WAIT','HEAL'].includes(t))return'combat';
 if(t.startsWith('IF_'))return'sensor';
 if(t.startsWith('REP')||t.startsWith('UNTIL_'))return'flow';
 if(t.startsWith('CALL_FN'))return'skill';
 return'resource';
}
function memoryLimit(){return codeTarget==='main'?18+Math.floor(missionIndex/8)*2:10+Math.floor(missionIndex/15)*2}
function store(){if(!progress.programs[missionIndex])progress.programs[missionIndex]={main:[],a:[],b:[]};return progress.programs[missionIndex]}
function normalizeNodes(list){return(list||[]).filter(n=>B[n.type]).map(n=>{const x={id:n.id||makeId(),type:n.type};if(Array.isArray(n.body))x.body=normalizeNodes(n.body);if(Array.isArray(n.elseBody))x.elseBody=normalizeNodes(n.elseBody);return x})}
function loadCode(){const s=store();mainProgram=normalizeNodes(clone(s.main||[]));functionPrograms={a:normalizeNodes(clone(s.a||[])),b:normalizeNodes(clone(s.b||[]))};insertPath=[]}
function persistCode(){const s=store();s.main=clone(mainProgram);s.a=clone(functionPrograms.a);s.b=clone(functionPrograms.b);progress.current=missionIndex;saveProgress()}
function activeRoot(){return codeTarget==='main'?mainProgram:functionPrograms[codeTarget]}
function resolveContainer(root,path){let list=root;for(const part of path){const[id,branch='body']=String(part).split(':');const n=list.find(v=>v.id===id);if(!n)break;if(!Array.isArray(n[branch]))n[branch]=[];list=n[branch]}return list}

function buildArena(i,variant=0){
 const rng=seeded(9901+i*97+variant*1009),p=stageProfile(i),walls=new Set();
 for(let x=0;x<GRID_W;x++){walls.add(key(x,0));walls.add(key(x,GRID_H-1))}
 for(let y=0;y<GRID_H;y++){walls.add(key(0,y));walls.add(key(GRID_W-1,y))}
 const pat=(i+variant)%5;
 const addV=(x,gaps)=>{for(let y=2;y<GRID_H-2;y++)if(!gaps.includes(y))walls.add(key(x,y))};
 const addH=(y,gaps)=>{for(let x=2;x<GRID_W-2;x++)if(!gaps.includes(x))walls.add(key(x,y))};
 if(pat===0){addV(7,[3,9]);addV(13,[5,10])}
 if(pat===1){addH(4,[5,15]);addH(8,[8,16])}
 if(pat===2){addV(6,[6,10]);addH(6,[6,12,16]);addV(14,[3,8])}
 if(pat===3){addH(3,[4,11,17]);addV(10,[3,7,10]);addH(9,[6,10,15])}
 if(pat===4){for(let x=5;x<=15;x+=5)for(let y=3;y<=9;y+=3)if((x+y+i)%2)walls.add(key(x,y))}
 const start={x:2,y:GRID_H-2},exit={x:GRID_W-3,y:1};
 walls.delete(key(start.x,start.y));walls.delete(key(exit.x,exit.y));
 const forbidden=new Set([key(start.x,start.y),key(exit.x,exit.y)]);
 const openCell=(nearExit=false)=>{
  for(let k=0;k<100;k++){
   const x=2+Math.floor(rng()*(GRID_W-4)),y=2+Math.floor(rng()*(GRID_H-4));
   const q=key(x,y);if(walls.has(q)||forbidden.has(q))continue;
   if(mdist({x,y},start)<4)continue;if(nearExit&&mdist({x,y},exit)>8)continue;
   forbidden.add(q);return{x,y};
  }
  return{x:3+forbidden.size%12,y:3+forbidden.size%7};
 };
 const enemies=[];
 const source=mission?.enemies||[];
 const n=Math.max(p.enemyCount,Math.min(4,source.length));
 for(let e=0;e<n;e++){
  const pos=openCell(e===n-1),src=source[e]||{},boss=Boolean(src.boss||(p.boss&&e===n-1));
  const kind=boss?'boss':e%4===0&&i>=14?'shooter':e%4===1&&i>=10?'shield':e%4===2&&i>=20?'glitch':'crawler';
  const base=boss?11+Math.floor(i/8):2+Math.floor(i/12)+(kind==='shield'?1:0);
  enemies.push({id:'e'+e,x:pos.x,y:pos.y,kind,hp:Math.max(base,Number(src.hp)||0),maxHp:Math.max(base,Number(src.hp)||0),dead:false,guard:0,cast:0,rule:'',cooldown:0,phase:0,face:'left'});
 }
 const data=[],chargers=[],switches=[],terminals=[];
 if(p.resource){for(let d=0;d<3;d++)data.push({...openCell(),id:'d'+d,taken:false});terminals.push({...openCell(true),id:'term',need:3,uploaded:false})}
 if(p.energy){chargers.push({...openCell(),id:'charge'})}
 if(p.gates){switches.push({...openCell(),id:'sw',on:false})}
 return{walls,start,exit,enemies,data,chargers,switches,terminals};
}
function buildWorld(){
 mission=missions[missionIndex];const variant=(progress.attempts[missionIndex]||0)%3,p=stageProfile(missionIndex),a=buildArena(missionIndex,variant);
 world={
  x:a.start.x,y:a.start.y,drawX:a.start.x,drawY:a.start.y,facing:'right',hp:p.hp,maxHp:p.hp,energy:6,maxEnergy:6,potions:2,guard:0,evade:0,pose:'idle',fx:[],
  walls:a.walls,exit:a.exit,enemies:a.enemies,projectiles:[],data:a.data,dataCount:0,chargers:a.chargers,switches:a.switches,terminals:a.terminals,
  requireUpload:p.resource,turn:0,variant,profile:p,lastAction:'',lastEnemyMessage:''
 };
 selectionEnemyId=world.enemies[0]?.id||'';updateHUD();updateBossHud();renderEnemyCode();
 setExec('코드를 만들고 실행해 보세요.','이제 전장은 위·아래·왼쪽·오른쪽으로 펼쳐집니다.');
}
function occupied(x,y,ignoreEnemy=null){return world.walls.has(key(x,y))||world.enemies.some(e=>!e.dead&&e!==ignoreEnemy&&e.x===x&&e.y===y)}
function canMove(x,y,ignoreEnemy=null){return x>0&&y>0&&x<GRID_W-1&&y<GRID_H-1&&!occupied(x,y,ignoreEnemy)}
function frontCell(dist=1){const d=DIRS[world.facing];return{x:world.x+d.x*dist,y:world.y+d.y*dist}}
function enemyNear(range=2){return world.enemies.filter(e=>!e.dead&&mdist(e,world)<=range).sort((a,b)=>mdist(a,world)-mdist(b,world))[0]||null}
function clearLine(a,b,max=8){
 if(a.x!==b.x&&a.y!==b.y)return false;const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y),dist=mdist(a,b);if(dist>max)return false;
 let x=a.x+dx,y=a.y+dy;while(x!==b.x||y!==b.y){if(world.walls.has(key(x,y)))return false;x+=dx;y+=dy}return true;
}
function enemyInLine(max=7){
 const d=DIRS[world.facing];const candidates=world.enemies.filter(e=>!e.dead&&clearLine(world,e,max)&&((e.x-world.x)*d.x+(e.y-world.y)*d.y)>0);
 candidates.sort((a,b)=>mdist(a,world)-mdist(b,world));return candidates[0]||null;
}
function dataHere(){return world.data.find(d=>!d.taken&&d.x===world.x&&d.y===world.y)}
function terminalHere(){return world.terminals.find(t=>t.x===world.x&&t.y===world.y)}
function chargerHere(){return world.chargers.find(t=>t.x===world.x&&t.y===world.y)}
function switchHere(){return world.switches.find(t=>t.x===world.x&&t.y===world.y)}
function spend(n){if(world.energy<n)return false;world.energy-=n;return true}
function addFx(type,x,y,extra={}){world.fx.push({type,x,y,t:performance.now(),...extra})}
function selectNearestEnemy(){const e=enemyNear(99);if(e)selectionEnemyId=e.id;renderEnemyCode()}
function damageEnemy(e,n){if(!e||e.dead)return 0;if(e.guard>0){e.guard=0;addFx('block',e.x,e.y);sound('ui.error');return 0}e.hp=Math.max(0,e.hp-n);addFx('hit',e.x,e.y,{n});sound('combat.impact_heavy');if(e.hp<=0){e.dead=true;addFx('burst',e.x,e.y);sound('success.correct')}selectNearestEnemy();updateBossHud();return n}
function hurtPlayer(n){if(world.evade>0){world.evade=0;addFx('dodge',world.x,world.y);return 0}if(world.guard>0){world.guard=0;n=Math.max(0,n-2);addFx('block',world.x,world.y)}if(n>0){world.hp=Math.max(0,world.hp-n);addFx('hurt',world.x,world.y,{n});sound('combat.hurt_voice')}updateHUD();return n}
function animateMove(nx,ny,ms=180){const sx=world.drawX,sy=world.drawY;return tween(ms,q=>{world.drawX=sx+(nx-sx)*q;world.drawY=sy+(ny-sy)*q}).then(()=>{world.x=nx;world.y=ny;world.drawX=nx;world.drawY=ny})}
function tween(ms,fn){ms=Math.max(35,ms/runSpeed);return new Promise(res=>{const st=performance.now();function f(t){const q=Math.min(1,(t-st)/ms);fn(1-Math.pow(1-q,3),q);if(q<1)requestAnimationFrame(f);else res()}requestAnimationFrame(f)})}

const worldAPI={
 getTraceState(){return{x:world.x,y:world.y,hp:world.hp,energy:world.energy,data:world.dataCount,enemies:world.enemies.filter(e=>!e.dead).map(e=>({x:e.x,y:e.y,hp:e.hp,kind:e.kind,rule:e.rule})),projectiles:world.projectiles.map(p=>({x:p.x,y:p.y}))}},
 checkCondition(c){
  if(c==='enemyNear')return Boolean(enemyNear(2));
  if(c==='enemyLine')return Boolean(enemyInLine(7));
  if(c==='projectileThreat')return world.projectiles.some(p=>{let x=p.x,y=p.y;for(let k=0;k<3;k++){x+=p.dx;y+=p.dy;if(x===world.x&&y===world.y)return true;if(world.walls.has(key(x,y)))break}return false});
  if(c==='enemyCast')return world.enemies.some(e=>!e.dead&&e.cast>0&&mdist(e,world)<=6);
  if(c==='wallAhead'){const f=frontCell();return!canMove(f.x,f.y)}
  if(c==='hpLow')return world.hp<=3;
  if(c==='dataHere')return Boolean(dataHere());
  if(c==='terminalHere')return Boolean(terminalHere());
  if(c==='chargerHere')return Boolean(chargerHere());
  if(c==='switchHere')return Boolean(switchHere());
  if(c==='atGoal')return world.x===world.exit.x&&world.y===world.exit.y;
  if(c==='enemiesGone')return!world.enemies.some(e=>!e.dead);
  return false;
 },
 async applyAction(type){
  errorNodeId='';world.lastAction=type;
  const moveMap={MOVE_UP:'up',MOVE_RIGHT:'right',MOVE_DOWN:'down',MOVE_LEFT:'left'};
  if(moveMap[type]){const dir=moveMap[type],d=DIRS[dir],nx=world.x+d.x,ny=world.y+d.y;world.facing=dir;if(!canMove(nx,ny))return{ok:false,message:'그 방향은 벽이나 버그 몬스터가 막고 있어요.'};await animateMove(nx,ny);sound('ui.tick');updateHUD();return{ok:true}}
  if(type==='DASH'){if(!spend(1))return{ok:false,message:'대시할 에너지가 부족해요.'};const d=DIRS[world.facing];let nx=world.x,ny=world.y;for(let i=0;i<2;i++){const tx=nx+d.x,ty=ny+d.y;if(!canMove(tx,ty))break;nx=tx;ny=ty}if(nx===world.x&&ny===world.y)return{ok:false,message:'대시할 길이 막혀 있어요.'};await animateMove(nx,ny,120);addFx('dash',nx,ny);updateHUD();return{ok:true}}
  if(type==='SLASH'){
   world.pose='slash';const d=DIRS[world.facing],targets=world.enemies.filter(e=>!e.dead&&cheb(e,world)<=1&&((e.x-world.x)*d.x+(e.y-world.y)*d.y)>=0);if(!targets.length){await tween(120,()=>{});world.pose='idle';return{ok:true}};targets.sort((a,b)=>mdist(a,world)-mdist(b,world));damageEnemy(targets[0],2);await tween(140,()=>{});world.pose='idle';return{ok:true};
  }
  if(type==='SPIN'){if(!spend(2))return{ok:false,message:'회전 베기에 필요한 에너지가 부족해요.'};world.pose='spin';let hit=0;world.enemies.forEach(e=>{if(!e.dead&&cheb(e,world)<=1)hit+=damageEnemy(e,2)});addFx('spin',world.x,world.y);await tween(180,()=>{});world.pose='idle';updateHUD();return{ok:true,events:hit?[{message:'주변 버그를 한꺼번에 베었어요.'}]:[]}}
  if(type==='BOLT'){if(!spend(2))return{ok:false,message:'코드 볼트를 쓸 에너지가 부족해요.'};const e=enemyInLine(7);world.pose='bolt';addFx('bolt',world.x,world.y,{facing:world.facing});await tween(150,()=>{});if(e)damageEnemy(e,2);world.pose='idle';updateHUD();return{ok:true}}
  if(type==='GUARD'){world.guard=1;addFx('guard',world.x,world.y);await tween(100,()=>{});return{ok:true}}
  if(type==='DODGE'){world.evade=1;const d=DIRS[world.facing],nx=world.x-d.x,ny=world.y-d.y;if(canMove(nx,ny))await animateMove(nx,ny,105);addFx('dodge',world.x,world.y);return{ok:true}}
  if(type==='WAIT'){await tween(110,()=>{});return{ok:true}}
  if(type==='HEAL'){if(world.potions<=0||world.hp>=world.maxHp)return{ok:true};world.potions--;world.hp=Math.min(world.maxHp,world.hp+3);addFx('heal',world.x,world.y);sound('success.correct');updateHUD();return{ok:true}}
  if(type==='COLLECT_DATA'){const d=dataHere();if(!d)return{ok:false,message:'현재 칸에는 데이터가 없어요.'};d.taken=true;world.dataCount++;addFx('collect',world.x,world.y);sound('collect.coin_pickup');updateHUD();return{ok:true}}
  if(type==='UPLOAD'){const t=terminalHere();if(!t)return{ok:false,message:'현재 칸에는 업로드 단말기가 없어요.'};if(world.dataCount<t.need)return{ok:false,message:'데이터가 '+t.need+'개 필요해요.'};world.dataCount-=t.need;t.uploaded=true;addFx('upload',world.x,world.y);sound('success.correct');updateHUD();return{ok:true}}
  if(type==='CHARGE'){if(!chargerHere())return{ok:false,message:'현재 칸에는 충전 패드가 없어요.'};world.energy=world.maxEnergy;addFx('charge',world.x,world.y);sound('success.correct');updateHUD();return{ok:true}}
  if(type==='TOGGLE'){const s=switchHere();if(!s)return{ok:false,message:'현재 칸에는 스위치가 없어요.'};s.on=!s.on;addFx('switch',world.x,world.y);sound('ui.confirm');return{ok:true}}
  return{ok:false,message:'이 전장에서는 사용할 수 없는 명령이에요.'};
 },
 async afterPlayerAction(){world.turn++;tickProjectiles();await tickEnemies();tickProjectiles();world.guard=Math.max(0,world.guard);world.evade=0;updateHUD();updateBossHud();renderEnemyCode();return{defeat:world.hp<=0,event:world.lastEnemyMessage?{message:world.lastEnemyMessage}:null}},
 isComplete(){const at=world.x===world.exit.x&&world.y===world.exit.y,bossAlive=world.enemies.some(e=>e.kind==='boss'&&!e.dead),uploadOk=!world.requireUpload||world.terminals.some(t=>t.uploaded);return at&&!bossAlive&&uploadOk}
};

function tickProjectiles(){
 const next=[];for(const p of world.projectiles){const nx=p.x+p.dx,ny=p.y+p.dy;if(world.walls.has(key(nx,ny)))continue;if(nx===world.x&&ny===world.y){hurtPlayer(p.damage||1);world.lastEnemyMessage='코드 탄환에 맞았어요!';continue}next.push({...p,x:nx,y:ny,life:p.life-1})}world.projectiles=next.filter(p=>p.life>0);
}
function stepToward(e,target,away=false){
 const opts=DIR_ORDER.map(n=>({n,...DIRS[n]})).map(d=>({d,x:e.x+d.x,y:e.y+d.y})).filter(v=>canMove(v.x,v.y,e));if(!opts.length)return false;
 opts.sort((a,b)=>(away?-1:1)*(mdist(a,target)-mdist(b,target)));
 const v=opts[0];e.x=v.x;e.y=v.y;e.face=v.d.n;return true;
}
function strafe(e){const opts=DIR_ORDER.map(n=>({n,...DIRS[n]})).map(d=>({d,x:e.x+d.x,y:e.y+d.y})).filter(v=>canMove(v.x,v.y,e)&&mdist(v,world)>=2);if(!opts.length)return stepToward(e,world);const v=opts[(world.turn+e.x+e.y)%opts.length];e.x=v.x;e.y=v.y;e.face=v.d.n;return true}
function fireAt(e){const dx=Math.sign(world.x-e.x),dy=Math.sign(world.y-e.y);if(e.x!==world.x&&e.y!==world.y)return false;world.projectiles.push({x:e.x,y:e.y,dx,dy,life:8,damage:e.kind==='boss'?2:1});addFx('shot',e.x,e.y,{dx,dy});return true}
function enemyProgram(e){
 if(e.kind==='crawler')return[['거리 ≤ 1','공격'],['거리 ≤ 6','추적'],['그 외','순찰']];
 if(e.kind==='shooter')return[['직선 시야','코드 탄환'],['거리 ≤ 2','후퇴'],['그 외','측면 이동']];
 if(e.kind==='shield')return[['공격 준비 턴','방패 들기'],['거리 ≤ 1','밀치기'],['그 외','추적']];
 if(e.kind==='glitch')return[['HP 절반 이하','순간 이동'],['거리 ≤ 1','오류 폭발'],['그 외','추적']];
 return[['HP 50% 이하','2단계 패턴'],['직선 시야','강화 탄환'],['거리 ≤ 1','코어 강타'],['그 외','추적']];
}
async function tickEnemies(){
 world.lastEnemyMessage='';
 for(const e of world.enemies){
  if(e.dead)continue;e.cast=Math.max(0,e.cast-1);e.guard=Math.max(0,e.guard-1);const d=mdist(e,world),line=clearLine(e,world,8);
  if(e.kind==='crawler'){
   if(d<=1){e.rule='거리 ≤ 1 → 공격';hurtPlayer(1);world.lastEnemyMessage='추적 버그가 공격했어요!'}
   else if(d<=6){e.rule='거리 ≤ 6 → 추적';stepToward(e,world)}
   else{e.rule='그 외 → 순찰';if((world.turn+e.x)%2===0)strafe(e)}
  }else if(e.kind==='shooter'){
   if(line&&d<=7){e.rule='직선 시야 → 코드 탄환';e.cast=1;fireAt(e)}
   else if(d<=2){e.rule='거리 ≤ 2 → 후퇴';stepToward(e,world,true)}
   else{e.rule='그 외 → 측면 이동';strafe(e)}
  }else if(e.kind==='shield'){
   if((world.turn+e.x)%3===0){e.rule='공격 준비 턴 → 방패';e.guard=2;e.cast=1}
   else if(d<=1){e.rule='거리 ≤ 1 → 밀치기';hurtPlayer(2);world.lastEnemyMessage='방패 버그가 밀쳐냈어요!'}
   else{e.rule='그 외 → 추적';stepToward(e,world)}
  }else if(e.kind==='glitch'){
   if(e.hp<=e.maxHp/2&&(world.turn+e.y)%3===0){e.rule='HP 절반 이하 → 순간 이동';const spots=DIR_ORDER.map(n=>DIRS[n]).map(v=>({x:world.x+v.x*2,y:world.y+v.y*2})).filter(v=>canMove(v.x,v.y,e));if(spots.length){const v=spots[world.turn%spots.length];e.x=v.x;e.y=v.y;addFx('teleport',e.x,e.y)}}
   else if(d<=1){e.rule='거리 ≤ 1 → 오류 폭발';hurtPlayer(2);world.lastEnemyMessage='글리치 폭발에 휘말렸어요!'}
   else{e.rule='그 외 → 추적';stepToward(e,world)}
  }else{
   const phase=e.hp<=e.maxHp/2?2:1;e.phase=phase;
   if(line&&d<=8&&(world.turn%2===0)){e.rule=(phase===2?'2단계 · ':'')+'직선 시야 → 강화 탄환';e.cast=1;fireAt(e);if(phase===2)fireAt(e)}
   else if(d<=1){e.rule='거리 ≤ 1 → 코어 강타';hurtPlayer(phase===2?3:2);world.lastEnemyMessage='보스의 코어 강타!'}
   else{e.rule=(phase===2?'2단계 · ':'')+'추적';stepToward(e,world);if(phase===2&&d>4)stepToward(e,world)}
  }
  await tween(55,()=>{});if(world.hp<=0)break;
 }
 selectNearestEnemy();
}

function setExec(title,detail,mode='idle'){const b=$('execBar');$('execTitle').textContent=title;$('execDetail').textContent=detail||'';$('execIcon').textContent=mode==='running'?'▶':mode==='error'?'!':'●';b.classList.toggle('running',mode==='running');b.classList.toggle('error',mode==='error')}
function runtimeEvent(ev){
 if(ev.node?.id)executingNodeId=ev.node.id;refreshExecutionHighlights();
 if(ev.kind==='check')setExec((B[ev.node.type]?.label||'조건')+' '+(ev.result?'✓':'✕'),'조건을 확인하고 분기합니다.','running');
 if(ev.kind==='loop')setExec(B[ev.node.type]?.label||'반복','반복 '+ev.index+'회째','running');
 if(ev.kind==='call')setExec('나의 기술 '+String(ev.slot||'a').toUpperCase(),'저장된 행동 묶음을 호출합니다.','running');
 if(ev.kind==='action')setExec(B[ev.node.type]?.label||ev.node.type,'전장에서 실행 중','running');
}
function makeRuntime(){return new RuntimeAPI.Runtime({world:worldAPI,delay:Math.max(25,170/runSpeed),onEvent:runtimeEvent,onError(node,msg){errorNodeId=node?.id||executingNodeId;refreshExecutionHighlights();setExec('여기서 코드가 멈췄어요',msg,'error');toast(msg,true);setRunButtons(false);document.body.classList.remove('executing')},onDone(){missionClear()}})}
async function runProgram(step=false){
 if(!mainProgram.length){toast('먼저 명령을 넣어 주세요.',true);return}
 if(!step||!stepActive){buildWorld();runtime=makeRuntime();errorNodeId='';executingNodeId='';stepActive=Boolean(step)}
 setRunButtons(true);document.body.classList.add('executing');
 if(step){const result=await runtime.step(mainProgram,functionPrograms);if(result?.done)stepActive=false;setRunButtons(false);document.body.classList.remove('executing')}
 else{stepActive=false;await runtime.run(mainProgram,functionPrograms)}
}
function stopRun(){runtime?.stop();stepActive=false;setRunButtons(false);document.body.classList.remove('executing');setExec('실행을 멈췄어요.','코드를 고치고 다시 실행할 수 있어요.')}
function setRunButtons(running){$('runBtn').classList.toggle('hidden',running);$('stepBtn').classList.toggle('hidden',running);$('stopBtn').classList.toggle('hidden',!running)}
function invalidateExecution(){runtime?.stop();stepActive=false;executingNodeId='';errorNodeId='';setRunButtons(false);document.body.classList.remove('executing');setExec('코드가 바뀌었어요.','다시 실행하면 전장 처음부터 시작합니다.')}
function addBlock(type){if(!allowedBlocks().includes(type))return toast('아직 잠긴 명령이에요.',true);if(codeTarget!=='main'&&type.startsWith('CALL_FN'))return toast('기술 안에서는 다른 기술을 부르지 않아요.',true);if(RuntimeAPI.countNodes(activeRoot())>=memoryLimit())return toast('메모리가 꽉 찼어요.',true);const d=B[type],n={id:makeId(),type};if(['structure','condition','until'].includes(d.kind))n.body=[];if(d.kind==='condition')n.elseBody=[];resolveContainer(activeRoot(),insertPath).push(n);if(n.body)insertPath.push(n.id+':body');persistCode();invalidateExecution();renderEditor();sound('ui.click')}
function removeNode(a,id){for(let i=0;i<a.length;i++){if(a[i].id===id){a.splice(i,1);return true}if(a[i].body&&removeNode(a[i].body,id))return true;if(a[i].elseBody&&removeNode(a[i].elseBody,id))return true}return false}
function moveNode(a,id,d){for(let i=0;i<a.length;i++){if(a[i].id===id){const j=i+d;if(j>=0&&j<a.length){const n=a.splice(i,1)[0];a.splice(j,0,n)}return true}if(a[i].body&&moveNode(a[i].body,id,d))return true;if(a[i].elseBody&&moveNode(a[i].elseBody,id,d))return true}return false}
function renderNodes(a,p,path=[]){if(!a.length){const e=document.createElement('div');e.className='program-empty';e.textContent=path.length?'여기에 명령을 넣어 보세요.':'아래 명령으로 프로그램을 만들어요.';p.append(e);return}a.forEach((n,i)=>{const d=B[n.type]||{label:n.type,kind:'action',icon:'·'},el=document.createElement('div');el.className='node '+d.kind+(n.id===executingNodeId?' active':'')+(n.id===errorNodeId?' error':'');el.dataset.nodeId=n.id;const r=document.createElement('div');r.className='node-main';r.innerHTML='<span class="node-index">'+(i+1)+'</span><span class="node-label">'+(d.icon||'')+' '+d.label+'</span>';const c=document.createElement('div');c.className='node-controls';[['↑',-1],['↓',1]].forEach(([t,x])=>{const b=document.createElement('button');b.textContent=t;b.onclick=ev=>{ev.stopPropagation();moveNode(activeRoot(),n.id,x);persistCode();invalidateExecution();renderEditor()};c.append(b)});const x=document.createElement('button');x.textContent='×';x.onclick=ev=>{ev.stopPropagation();removeNode(activeRoot(),n.id);insertPath=[];persistCode();invalidateExecution();renderEditor()};c.append(x);r.append(c);el.append(r);r.onclick=()=>{if(n.body){insertPath=path.concat(n.id+':body');renderEditor()}};if(n.body){const q=document.createElement('div');q.className='node-body'+(n.body.length?'':' empty');renderNodes(n.body,q,path.concat(n.id+':body'));el.append(q);if(d.kind==='condition'){const eb=document.createElement('button');eb.className='else-head';eb.textContent='아니면';eb.onclick=ev=>{ev.stopPropagation();insertPath=path.concat(n.id+':elseBody');renderEditor()};el.append(eb);if(n.elseBody?.length){const z=document.createElement('div');z.className='node-body else-body';renderNodes(n.elseBody,z,path.concat(n.id+':elseBody'));el.append(z)}}}p.append(el)})}
function renderEditor(){const p=$('program');p.replaceChildren();renderNodes(activeRoot(),p);$('blockValue').textContent=RuntimeAPI.countNodes(activeRoot())+'/'+memoryLimit();$('codeModeTitle').textContent=codeTarget==='main'?'메인 코드':'나의 기술 '+codeTarget.toUpperCase();$('insertPath').textContent=insertPath.length?'선택한 블록 안쪽에 추가 중':'여기에 명령이 추가돼요.';const root=$('palette');root.replaceChildren();const types=allowedBlocks().filter(t=>!(codeTarget!=='main'&&t.startsWith('CALL_FN')));const tabs=document.createElement('div');tabs.className='palette-groups';[['all','전체'],...Object.entries(GROUPS)].forEach(([id,l])=>{if(id!=='all'&&!types.some(t=>blockGroup(t)===id))return;const b=document.createElement('button');b.className='palette-group'+(paletteGroup===id?' active':'');b.textContent=l;b.onclick=()=>{paletteGroup=id;renderEditor()};tabs.append(b)});root.append(tabs);(paletteGroup==='all'?types:types.filter(t=>blockGroup(t)===paletteGroup)).forEach(t=>{const d=B[t],b=document.createElement('button');b.className=d.kind||'action';b.innerHTML='<b>'+d.icon+'</b>'+d.label;b.onclick=()=>addBlock(t);root.append(b)})}
function refreshExecutionHighlights(){document.querySelectorAll('#program .node').forEach(e=>{e.classList.toggle('active',e.dataset.nodeId===executingNodeId);e.classList.toggle('error',e.dataset.nodeId===errorNodeId)})}
function updateHUD(){if(!world)return;$('hpValue').textContent=world.hp+'/'+world.maxHp;$('crystalValue').textContent=world.profile.resource?world.dataCount:world.energy;$('variableHp').textContent=world.hp;$('variableCrystal').textContent=world.profile.resource?world.dataCount:world.energy;$('variableData').textContent=world.dataCount;$('variableEnergy').textContent=world.energy;$('dataStat').classList.toggle('hidden',!world.profile.resource);$('energyStat').classList.remove('hidden');$('sensorReadout').textContent='방향 '+({up:'↑',right:'→',down:'↓',left:'←'}[world.facing]||'')}
function updateBossHud(){if(!world)return;const e=world.enemies.find(v=>v.kind==='boss'&&!v.dead),box=$('bossHud');if(!e)return box.classList.add('hidden');box.classList.remove('hidden');$('bossName').textContent='NULL CORE · '+(e.phase===2?'PHASE 2':'PHASE 1');$('bossHp').style.width=100*e.hp/e.maxHp+'%';$('bossState').textContent=e.rule||'AI 분석 중'}
function enemyName(e){return({crawler:'추적 버그',shooter:'사수 버그',shield:'방패 버그',glitch:'글리치',boss:'NULL CORE'}[e.kind]||'버그')}
function renderEnemyCode(){let hud=$('enemyCodeHud');if(!hud){hud=document.createElement('aside');hud.id='enemyCodeHud';hud.className='enemy-code-hud glass';hud.innerHTML='<small>ENEMY PROGRAM</small><b id="enemyCodeName"></b><span id="enemyCodeHp"></span><div id="enemyCodeLines"></div>';document.getElementById('app').append(hud)}if(!world)return;const e=world.enemies.find(v=>v.id===selectionEnemyId&&!v.dead)||enemyNear(99);if(!e)return hud.classList.add('hidden');hud.classList.remove('hidden');$('enemyCodeName').textContent=enemyName(e);$('enemyCodeHp').textContent='HP '+e.hp+' / '+e.maxHp;const q=$('enemyCodeLines');q.replaceChildren();enemyProgram(e).forEach(([c,a])=>{const d=document.createElement('div');d.className=e.rule&&e.rule.includes(c)?'active':'';d.innerHTML='<span>IF '+c+'</span><b>→ '+a+'</b>';q.append(d)});if(e.rule){const em=document.createElement('em');em.textContent='현재: '+e.rule;q.append(em)}}
function missionClear(){runtime?.stop();document.body.classList.remove('executing');setRunButtons(false);progress.completed[missionIndex]=true;progress.unlocked=Math.max(progress.unlocked,missionIndex+2);progress.best[missionIndex]=Math.min(progress.best[missionIndex]||999,RuntimeAPI.countProgramNodes(mainProgram,functionPrograms));saveProgress();$('clearTitle').textContent='전장 디버그 성공!';$('clearText').textContent='적의 AI와 공간을 읽는 코드가 끝까지 작동했어요.';$('stableBadge').classList.add('earned');$('stableBadge').textContent='✓ 전장 적응';$('shortBadge').classList.toggle('earned',RuntimeAPI.countProgramNodes(mainProgram,functionPrograms)<=memoryLimit()-4);$('debugBadge').classList.add('earned');$('clearMetrics').innerHTML='<span>코드 <b>'+RuntimeAPI.countProgramNodes(mainProgram,functionPrograms)+'</b></span><span>남은 HP <b>'+world.hp+'</b></span><span>변형 전장 <b>#'+(world.variant+1)+'</b></span>';$('testSummary').innerHTML='';$('unlockBox').classList.add('hidden');$('nextBtn').textContent=missionIndex===missions.length-1?'원정 지도':'다음 구역';$('clear').classList.remove('hidden');sound('success.correct')}
function theme(){return{prologue:['#15273a','#234d5d'],forest:['#152a23','#346344'],mine:['#241f2b','#594c63'],city:['#151c2b','#304c70'],desert:['#332819','#786139'],citadel:['#261923','#653a51'],null:['#170f20','#4d285f']}[mission?.arc]||['#15273a','#234d5d']}
function metrics(){const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight,s=Math.max(28,Math.min(52,(w-400)/GRID_W,(h-120)/GRID_H));return{s,ox:Math.max(8,(w-s*GRID_W)/2-40),oy:Math.max(82,(h-s*GRID_H)/2)}}
function draw(){if(!world)return;const dpr=Math.min(2,devicePixelRatio||1),w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);const [a,b]=theme(),m=metrics();ctx.fillStyle=a;ctx.fillRect(0,0,w,h);const cell=(x,y)=>({x:m.ox+x*m.s,y:m.oy+y*m.s});for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++){const p=cell(x,y);ctx.fillStyle=world.walls.has(key(x,y))?b:((x+y)%2?'#112232':'#132738');ctx.fillRect(p.x,p.y,m.s+1,m.s+1);if(world.walls.has(key(x,y))){ctx.fillStyle='#ffffff0c';ctx.fillRect(p.x+3,p.y+3,m.s-6,5)}}const portal=cell(world.exit.x,world.exit.y);ctx.strokeStyle='#76f2dc';ctx.lineWidth=3;ctx.beginPath();ctx.arc(portal.x+m.s/2,portal.y+m.s/2,m.s*.31,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#76f2dc33';ctx.fill();world.data.forEach(v=>{if(v.taken)return;const p=cell(v.x,v.y);ctx.fillStyle='#73d8ff';ctx.beginPath();ctx.moveTo(p.x+m.s/2,p.y+8);ctx.lineTo(p.x+m.s-8,p.y+m.s/2);ctx.lineTo(p.x+m.s/2,p.y+m.s-8);ctx.lineTo(p.x+8,p.y+m.s/2);ctx.fill()});world.chargers.forEach(v=>{const p=cell(v.x,v.y);ctx.fillStyle='#f6d36555';ctx.fillRect(p.x+8,p.y+8,m.s-16,m.s-16);ctx.fillStyle='#ffe17b';ctx.font='bold '+Math.round(m.s*.45)+'px sans-serif';ctx.fillText('⚡',p.x+m.s*.25,p.y+m.s*.69)});world.switches.forEach(v=>{const p=cell(v.x,v.y);ctx.fillStyle=v.on?'#5eead4':'#56657a';ctx.beginPath();ctx.arc(p.x+m.s/2,p.y+m.s/2,m.s*.18,0,Math.PI*2);ctx.fill()});world.terminals.forEach(v=>{const p=cell(v.x,v.y);ctx.fillStyle=v.uploaded?'#52d69a':'#9c7aea';ctx.fillRect(p.x+10,p.y+8,m.s-20,m.s-16);ctx.fillStyle='#fff';ctx.font='bold '+Math.round(m.s*.22)+'px monospace';ctx.fillText(v.uploaded?'OK':'DATA',p.x+12,p.y+m.s*.58)});world.projectiles.forEach(v=>{const p=cell(v.x,v.y);ctx.fillStyle='#ffcf5c';ctx.shadowBlur=12;ctx.shadowColor='#ffcf5c';ctx.beginPath();ctx.arc(p.x+m.s/2,p.y+m.s/2,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0});world.enemies.filter(e=>!e.dead).forEach(e=>drawActor(e,false,m));drawActor(world,true,m);const now=performance.now();world.fx=world.fx.filter(f=>now-f.t<650);world.fx.forEach(f=>{const p=cell(f.x,f.y),q=(now-f.t)/650;ctx.globalAlpha=1-q;ctx.strokeStyle=f.type==='hurt'?'#ff6677':f.type==='heal'?'#70f0af':'#ffe47a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x+m.s/2,p.y+m.s/2,m.s*(.18+.4*q),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1});raf=requestAnimationFrame(draw)}
function drawActor(e,hero,m){const p={x:m.ox+(e.drawX??e.x)*m.s,y:m.oy+(e.drawY??e.y)*m.s},cx=p.x+m.s/2,cy=p.y+m.s/2,imgObj=hero?IMAGES.hero:(e.kind==='crawler'?IMAGES.zombie:IMAGES.robot);ctx.save();ctx.translate(cx,cy);const face=hero?world.facing:(e.face||'left');ctx.rotate(DIRS[face]?.a||0);if(imgObj?.complete&&imgObj.naturalWidth)ctx.drawImage(imgObj,-m.s*.32,-m.s*.32,m.s*.64,m.s*.64);else{ctx.fillStyle=hero?'#69e4cf':e.kind==='boss'?'#e05aa8':'#e67575';ctx.beginPath();ctx.arc(0,0,m.s*.25,0,Math.PI*2);ctx.fill()}ctx.restore();if(!hero){ctx.fillStyle='#35131b';ctx.fillRect(p.x+5,p.y+2,m.s-10,5);ctx.fillStyle=e.kind==='boss'?'#ff69b4':'#ff7e7e';ctx.fillRect(p.x+5,p.y+2,(m.s-10)*e.hp/e.maxHp,5);if(e.cast){ctx.strokeStyle='#ffd36a';ctx.lineWidth=2;ctx.strokeRect(p.x+3,p.y+3,m.s-6,m.s-6)}if(e.guard){ctx.strokeStyle='#82b8ff';ctx.beginPath();ctx.arc(cx,cy,m.s*.35,0,Math.PI*2);ctx.stroke()}if(e.id===selectionEnemyId){ctx.strokeStyle='#ffe47a';ctx.lineWidth=2;ctx.strokeRect(p.x+1,p.y+1,m.s-2,m.s-2)}}else{ctx.fillStyle='#06131dcc';ctx.fillRect(p.x,p.y-9,m.s,6);ctx.fillStyle='#70e6aa';ctx.fillRect(p.x,p.y-9,m.s*world.hp/world.maxHp,6)}}
function renderMission(){
 const p=stageProfile(missionIndex),n=missionIndex+1;
 const arcNames={prologue:'코드 캠프',forest:'버그 숲',mine:'수정 광산',city:'기계 도시',desert:'데이터 사막',citadel:'버그 성채',null:'NULL CORE'};
 const arc=arcNames[mission.arc]||'버그 월드';
 $('chapterName').textContent=arc;
 $('missionName').textContent=n+'. '+(p.boss?'코어 보스전':'탑뷰 코드 작전');
 $('missionKicker').textContent=(mission.concept||'알고리즘')+' · '+arc;
 $('missionTitle').textContent=p.boss?'AI 코어를 분석하라':'전장을 코드로 돌파하라';
 $('missionText').textContent=p.boss?'보스의 현재 AI 규칙과 공격 예고를 읽고 기술을 조합하세요.':'장애물과 적 배치를 보고 사방 이동, 조건, 반복을 조합해 같은 코드가 여러 상황에서 작동하게 만드세요.';
 $('objectiveText').textContent=p.objective;
}
function loadMission(i){stopRun();missionIndex=clamp(i,0,missions.length-1);mission=missions[missionIndex];progress.current=missionIndex;progress.attempts[missionIndex]=(progress.attempts[missionIndex]||0)+1;saveProgress();loadCode();buildWorld();renderMission();renderEditor();$('missionSelect').classList.add('hidden');$('clear').classList.add('hidden')}
function renderMissionGrid(){
 const r=$('missionGrid'),arcNames={prologue:'코드 캠프',forest:'버그 숲',mine:'수정 광산',city:'기계 도시',desert:'데이터 사막',citadel:'버그 성채',null:'NULL CORE'};r.replaceChildren();
 missions.forEach((m,i)=>{const p=stageProfile(i),b=document.createElement('button');b.className='mission-item'+(i>=progress.unlocked?' locked':'')+(progress.completed[i]?' done':'');b.disabled=i>=progress.unlocked;b.innerHTML='<b>'+(progress.completed[i]?'✓ ':'')+(i+1)+'. '+(p.boss?'코어 보스전':'탑뷰 코드 작전')+'</b><span>'+(arcNames[m.arc]||'버그 월드')+' · '+(m.concept||'알고리즘')+'</span>';b.onclick=()=>loadMission(i);r.append(b)});
}
function renderMap(){const r=$('campaignMap');r.innerHTML='';(DATA.regions||[]).forEach(z=>{const b=document.createElement('button');b.className='map-node';b.style.left=z.x+'%';b.style.top=z.y+'%';b.innerHTML='<span>'+z.icon+'</span><b>'+z.name+'</b><small>'+z.subtitle+'</small>';b.onclick=()=>{const i=Math.min(z.start,progress.unlocked-1);if(i>=0)loadMission(i)};r.append(b)})}
function renderInventory(){const r=$('inventoryGrid');r.innerHTML='<div class="gear-card"><span>⚔</span><div><b>디버그 블레이드</b><small>검격·회전 베기·가드·회피</small></div></div><div class="gear-card"><span>⌁</span><div><b>AI 스캐너</b><small>적의 조건과 현재 실행 규칙 표시</small></div></div><div class="gear-card"><span>✦</span><div><b>코드 볼트</b><small>직선 시야를 이용한 원거리 공격</small></div></div>';$('memoryBonusText').textContent='미션 '+(missionIndex+1)+' · 메모리 '+memoryLimit()}
function boot(){document.body.classList.add('topdown-code-quest');renderEnemyCode();loadCode();buildWorld();renderMission();renderEditor();renderMissionGrid();renderMap();renderInventory();$('newBtn').onclick=()=>{$('intro').classList.add('hidden');loadMission(0)};$('continueBtn').classList.toggle('hidden',!progress.current&&!Object.keys(progress.completed).length);$('continueBtn').onclick=()=>{$('intro').classList.add('hidden');loadMission(progress.current||0)};$('runBtn').onclick=()=>runProgram(false);$('stepBtn').onclick=()=>runProgram(true);$('stopBtn').onclick=stopRun;$('undoBtn').onclick=()=>{const a=resolveContainer(activeRoot(),insertPath);if(a.length)a.pop();persistCode();invalidateExecution();renderEditor()};$('clearBtn').onclick=()=>{activeRoot().splice(0);insertPath=[];persistCode();invalidateExecution();renderEditor()};$('outBtn').onclick=()=>{insertPath.pop();renderEditor()};document.querySelectorAll('.code-tab').forEach(b=>b.onclick=()=>{codeTarget=b.dataset.codeTarget||'main';insertPath=[];document.querySelectorAll('.code-tab').forEach(x=>x.classList.toggle('active',x===b));renderEditor()});document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{runSpeed=Number(b.dataset.speed)||1;document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',x===b))});const toggle=(id,on)=>$(id).classList.toggle('hidden',!on);$('missionsBtn').onclick=()=>{renderMissionGrid();toggle('missionSelect',true)};$('closeMissions').onclick=()=>toggle('missionSelect',false);$('mapBtn').onclick=()=>{renderMap();toggle('worldMapOverlay',true)};$('closeWorldMap').onclick=()=>toggle('worldMapOverlay',false);$('inventoryBtn').onclick=()=>{renderInventory();toggle('inventoryOverlay',true)};$('closeInventory').onclick=()=>toggle('inventoryOverlay',false);$('helpBtn').onclick=()=>toggle('help',true);$('closeHelp').onclick=()=>toggle('help',false);$('retryBtn').onclick=()=>{$('clear').classList.add('hidden');loadMission(missionIndex)};$('nextBtn').onclick=()=>{if(missionIndex<missions.length-1)loadMission(missionIndex+1);else{renderMap();toggle('worldMapOverlay',true)}$('clear').classList.add('hidden')};canvas.addEventListener('pointerdown',ev=>{const m=metrics(),r=canvas.getBoundingClientRect(),x=Math.floor((ev.clientX-r.left-m.ox)/m.s),y=Math.floor((ev.clientY-r.top-m.oy)/m.s),e=world.enemies.find(v=>!v.dead&&v.x===x&&v.y===y);if(e){selectionEnemyId=e.id;renderEnemyCode()}});if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(draw)}
boot();
})();
