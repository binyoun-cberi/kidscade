(function(){
'use strict';

const RuntimeAPI=window.CodeQuestRuntime;

function clone(v){return JSON.parse(JSON.stringify(v));}
function sameLevel(a,b,t=.75){return Math.abs(a-b)<=t;}
function normalizeEnemies(base,override){
 if(!override)return clone(base||[]);
 return override.map((e,i)=>{
  if(typeof e==='number'){
   const seed=(base||[])[i]||(base||[])[0]||{type:'blob',hp:1,y:0};
   return {...clone(seed),x:e,y:seed.y||0};
  }
  return clone(e);
 });
}
function missionForTest(mission,test){
 const m=clone(mission),t=test||{};
 for(const key of ['start','goal','platforms','crystals','doors','treasures','checkpoints']){
  if(t[key]!==undefined)m[key]=clone(t[key]);
 }
 if(t.enemies!==undefined)m.enemies=normalizeEnemies(mission.enemies,t.enemies);
 return m;
}
function makeWorld(mission,test){
 const m=missionForTest(mission,test),start=m.start||{x:1,y:0};
 const state={
  x:start.x,y:start.y,dir:1,hp:5,maxHp:5,crystalCount:0,potions:1,evade:0,
  crystals:(m.crystals||[]).map(c=>({...c,taken:false})),
  doors:(m.doors||[]).map(d=>({...d,open:false})),
  enemies:(m.enemies||[]).map(e=>({...e,maxHp:e.hp,dead:false,stateIndex:Number.isInteger(e.initialStateIndex)?e.initialStateIndex:0}))
 };
 function candidates(x){return (m.platforms||[]).filter(p=>x>=p.x-.001&&x<p.x+p.w-.001).map(p=>p.y).sort((a,b)=>a-b);}
 function surfaceNear(x,currentY,maxRise=.75,maxDrop=.9){
  const c=candidates(x).filter(y=>y-currentY<=maxRise&&currentY-y<=maxDrop);
  if(!c.length)return null;c.sort((a,b)=>Math.abs(a-currentY)-Math.abs(b-currentY));return c[0];
 }
 function jumpSurface(x,currentY,high=false){
  let c=candidates(x).filter(y=>y-currentY<=(high?5:2.45)&&currentY-y<=3);
  if(!c.length)return null;
  const above=c.filter(y=>y>currentY+.25);
  if(above.length){above.sort((a,b)=>b-a);return high?above[0]:above[above.length-1];}
  c.sort((a,b)=>Math.abs(a-currentY)-Math.abs(b-currentY));return c[0];
 }
 function lowerSurface(x,currentY){
  const c=candidates(x).filter(y=>y<currentY-.4).sort((a,b)=>b-a);return c.length?c[0]:null;
 }
 function enemyAt(x,y,range=.6){return state.enemies.find(e=>!e.dead&&Math.abs(e.x-x)<=range&&sameLevel(e.y,y,1.05));}
 function enemyAhead(range=1.25){
  return state.enemies.filter(e=>!e.dead&&(e.x-state.x)*state.dir>0&&(e.x-state.x)*state.dir<=range&&Math.abs(e.y-state.y)<=1.4)
   .sort((a,b)=>Math.abs(a.x-state.x)-Math.abs(b.x-state.x))[0];
 }
 function doorAhead(range=1.2){return state.doors.find(d=>!d.open&&(d.x-state.x)*state.dir>0&&(d.x-state.x)*state.dir<=range&&sameLevel(d.y,state.y,1));}
 function crystalHere(){return state.crystals.find(c=>!c.taken&&Math.abs(c.x-state.x)<.55&&sameLevel(c.y,state.y,.8));}
 function defaultCycle(type){
  if(type==='spitter')return ['idle','windup','shoot','rest'];
  if(type==='bat')return ['hover','windup','swoop','rest'];
  if(type==='shield')return ['guard','open','guard','open'];
  if(type==='boss_mushroom')return ['idle','windup','spore','rest','rest'];
  if(type==='golem')return ['idle','windup','slam','rest'];
  return ['idle','attack'];
 }
 function enemyState(e){const cycle=e.cycle||defaultCycle(e.type);return cycle[e.stateIndex%cycle.length];}
 const api={
  getTraceState(){return {x:state.x,y:state.y,hp:state.hp,crystals:state.crystalCount,enemies:state.enemies.filter(e=>!e.dead).map(e=>({x:e.x,y:e.y,type:e.type,hp:e.hp,state:enemyState(e)}))};},
  checkCondition(cond){
   if(cond==='enemyAhead')return Boolean(enemyAhead());
   if(cond==='gapAhead')return surfaceNear(state.x+state.dir,state.y,.75,.9)===null;
   if(cond==='platformAbove'){const x=state.x+state.dir*2;return candidates(x).some(y=>y>state.y+.7&&y<=state.y+5);}
   if(cond==='hpLow')return state.hp<=2;
   if(cond==='enemyWindup')return state.enemies.some(e=>!e.dead&&Math.abs(e.x-state.x)<=4.2&&Math.abs(e.y-state.y)<=3&&enemyState(e)==='windup');
   if(cond==='crystals3')return state.crystalCount>=3;
   return false;
  },
  async applyAction(type){
   if(type==='FWD'||type==='BACK'){
    const dir=type==='BACK'?-state.dir:state.dir,x=state.x+dir,y=surfaceNear(x,state.y,.75,.9);
    if(y===null)return {ok:false,message:'앞이 끊겨 있어요.'};
    if(enemyAt(x,y))return {ok:false,message:'앞에 버그 몬스터가 있어요.'};
    const d=state.doors.find(v=>!v.open&&Math.abs(v.x-x)<.6&&sameLevel(v.y,y,1));if(d)return {ok:false,message:'문이 길을 막고 있어요.'};
    state.x=x;state.y=y;return {ok:true};
   }
   if(type==='JUMP'||type==='HIGH_JUMP'){
    const high=type==='HIGH_JUMP',x=state.x+state.dir*2,y=jumpSurface(x,state.y,high);
    if(y===null)return {ok:false,message:'점프해서 착지할 곳이 없어요.'};
    const mid=state.x+state.dir,targetEnemy=enemyAt(x,y);
    const blockingDoor=state.doors.find(d=>!d.open&&(d.x-state.x)*state.dir>0&&(d.x-state.x)*state.dir<=2&&Math.abs(d.y-state.y)<=1.1&&y<=state.y+1.5);
    if(enemyAt(mid,state.y)&&!high)return {ok:false,message:'몬스터가 점프 길을 막고 있어요.'};
    if(targetEnemy)return {ok:false,message:'착지할 곳에 몬스터가 있어요.'};
    if(blockingDoor)return {ok:false,message:'잠긴 문은 점프로 넘을 수 없어요.'};
    state.x=x;state.y=y;return {ok:true};
   }
   if(type==='DROP'){const y=lowerSurface(state.x,state.y);if(y===null)return {ok:false,message:'바로 아래에 내려갈 길이 없어요.'};state.y=y;return {ok:true};}
   if(type==='DASH'){
    const x=state.x+state.dir*2,y=surfaceNear(x,state.y,1,1.1),mid=state.x+state.dir;
    if(y===null||enemyAt(mid,state.y)||enemyAt(x,y)||doorAhead(2.1))return {ok:false,message:'대시할 길이 막혀 있어요.'};
    state.x=x;state.y=y;return {ok:true};
   }
   if(type==='DODGE'){
    state.evade=1;const back=state.x-state.dir,by=surfaceNear(back,state.y,.6,.8);
    if(by!==null&&!enemyAt(back,by)){state.x=back;state.y=by;}return {ok:true};
   }
   if(type==='ATTACK'){
    const e=enemyAhead(1.35);if(!e)return {ok:false,message:'공격할 적이 바로 앞에 없어요.'};
    if(e.type==='shield'&&enemyState(e)==='guard')return {ok:true};
    e.hp--;if(e.hp<=0)e.dead=true;return {ok:true};
   }
   if(type==='WAIT')return {ok:true};
   if(type==='COLLECT'){
    const c=crystalHere();if(!c)return {ok:false,message:'지금 있는 곳에는 주울 것이 없어요.'};
    c.taken=true;state.crystalCount++;return {ok:true};
   }
   if(type==='OPEN'){
    const d=doorAhead();if(!d)return {ok:false,message:'바로 앞에 닫힌 문이 없어요.'};
    if(state.crystalCount<d.need)return {ok:false,message:'수정이 부족해요.'};
    d.open=true;return {ok:true};
   }
   if(type==='HEAL'){
    if(state.potions<=0||state.hp>=state.maxHp)return {ok:false,message:'지금은 회복할 수 없어요.'};
    state.potions--;state.hp=Math.min(state.maxHp,state.hp+2);return {ok:true};
   }
   return {ok:false,message:'알 수 없는 명령이에요.'};
  },
  async afterPlayerAction(){
   let damage=0;
   for(const e of state.enemies){
    if(e.dead)continue;const cycle=e.cycle||defaultCycle(e.type);e.stateIndex=(e.stateIndex+1)%cycle.length;
    const phase=enemyState(e),dx=Math.abs(e.x-state.x),dy=Math.abs(e.y-state.y);let hits=false;
    if((e.type==='spitter'||e.type==='boss_mushroom')&&(phase==='shoot'||phase==='spore')&&dx<=5&&dy<=2.2)hits=true;
    else if(e.type==='bat'&&phase==='swoop'&&dx<=2.7)hits=true;
    else if(e.type==='golem'&&phase==='slam'&&dx<=2.2&&dy<=1.2)hits=true;
    else if((e.type==='blob'||e.type==='mush'||e.type==='ghost'||e.type==='shield')&&phase==='attack'&&dx<=1.25&&dy<=1.2)hits=true;
    if(hits){if(state.evade>0){}else if(e.type==='boss_mushroom')damage+=3;else if(e.type==='spitter'||e.type==='golem')damage+=2;else damage+=1;}
   }
   state.evade=0;if(damage>0)state.hp=Math.max(0,state.hp-damage);
   return {defeat:state.hp<=0};
  },
  isComplete(){
   const g=m.goal||{x:0,y:0},atGoal=Math.abs(state.x-g.x)<.55&&Math.abs(state.y-g.y)<1,bossAlive=state.enemies.some(e=>e.boss&&!e.dead);
   return atGoal&&!bossAlive;
  }
 };
 return {api,state,mission:m};
}
async function runCase(program,functionProgram,mission,test){
 const made=makeWorld(mission,test),runtime=new RuntimeAPI.Runtime({world:made.api,delay:0,onEvent(){},onError(){},onDone(){}});
 runtime.maxActions=Number(test?.maxActions||mission.validationMaxActions||220);
 runtime.prepare(clone(program),clone(functionProgram));
 let result={done:false},guard=0;
 while(!result.done&&guard++<runtime.maxActions+20)result=await runtime.nextAction();
 return {id:test?.id||'test',name:test?.name||'추가 상황',ok:Boolean(result.complete),message:result.message||'',trace:runtime.getTrace(),summary:runtime.getSummary(),state:made.api.getTraceState()};
}
function traceUses(trace,type){
 return (trace||[]).some(e=>e.type===type&&(e.kind==='action'||e.kind==='check'||e.kind==='call'||e.kind==='loop'));
}
function conceptCheck(mission,functionProgram,traces){
 if(mission.requireFunction){
  const called=traces.some(t=>(t||[]).some(e=>e.kind==='call'));
  if(!functionProgram?.length||!called)return {ok:false,message:'나의 기술을 만들고 실제로 불러와 사용해 보세요.'};
 }
 if(mission.requireType){
  const used=traces.some(t=>traceUses(t,mission.requireType));
  if(!used)return {ok:false,message:'이번 구역에서는 '+((window.CodeQuestData?.blocks?.[mission.requireType]?.label)||mission.requireType)+'을 실제 실행해 보세요.'};
 }
 return {ok:true};
}
async function validate({mission,program,functionProgram,visibleTrace=[],visibleSummary={}}){
 const tests=mission.validationTests||[],results=[];
 for(const test of tests)results.push(await runCase(program,functionProgram,mission,test));
 const traces=[visibleTrace,...results.map(r=>r.trace)],concept=conceptCheck(mission,functionProgram,traces);
 const stable=results.every(r=>r.ok),totalNodes=RuntimeAPI.countProgramNodes(program,functionProgram);
 return {
  ok:stable&&concept.ok,stable,concept,results,
  metrics:{mainNodes:RuntimeAPI.countNodes(program),functionNodes:RuntimeAPI.countNodes(functionProgram),totalNodes,actions:Number(visibleSummary.actions)||0,calls:Number(visibleSummary.calls)||0}
 };
}
window.CodeQuestValidator={validate,runCase,makeWorld,missionForTest};
})();