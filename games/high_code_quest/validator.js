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
 for(const key of ['start','goal','platforms','crystals','doors','treasures','checkpoints','switches','dataItems','terminals','hazards','rechargeStations','conveyors']){
  if(t[key]!==undefined)m[key]=clone(t[key]);
 }
 for(const key of ['startEnergy','maxEnergy','usesEnergy','requireUploads'])if(t[key]!==undefined)m[key]=t[key];
 if(t.enemies!==undefined)m.enemies=normalizeEnemies(mission.enemies,t.enemies);
 return m;
}
function cycleState(e,defaultCycle){
 const cycle=e.cycle||defaultCycle(e.type);return cycle[(e.stateIndex||0)%cycle.length];
}
function makeWorld(mission,test){
 const m=missionForTest(mission,test),start=m.start||{x:1,y:0};
 const maxEnergy=Number(m.maxEnergy||m.startEnergy||10);
 const state={
  x:start.x,y:start.y,dir:1,hp:Number(m.playerHp||m.maxHp||5),maxHp:Number(m.maxHp||m.playerHp||5),crystalCount:0,dataCount:0,
  energy:Number(m.startEnergy||maxEnergy),maxEnergy,potions:Number(m.potions??1),evade:0,lastAction:'',
  crystals:(m.crystals||[]).map(c=>({...c,taken:false})),
  dataItems:(m.dataItems||[]).map(c=>({...c,taken:false})),
  switches:(m.switches||[]).map(v=>({...v,on:Boolean(v.on)})),
  terminals:(m.terminals||[]).map(v=>({...v,uploaded:false})),
  rechargeStations:clone(m.rechargeStations||[]),
  conveyors:clone(m.conveyors||[]),
  hazards:(m.hazards||[]).map(h=>({...h,stateIndex:Number.isInteger(h.initialStateIndex)?h.initialStateIndex:0})),
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
 function lowerSurface(x,currentY){const c=candidates(x).filter(y=>y<currentY-.4).sort((a,b)=>b-a);return c.length?c[0]:null;}
 function defaultCycle(type){
  if(type==='spitter')return ['idle','windup','shoot','rest'];
  if(type==='bat')return ['hover','windup','swoop','rest'];
  if(type==='shield')return ['guard','open','guard','open'];
  if(type==='boss_mushroom')return ['idle','windup','spore','rest','rest'];
  if(type==='golem')return ['idle','windup','slam','rest'];
  return ['idle','attack'];
 }
 function enemyState(e){return cycleState(e,defaultCycle);}
 function hazardState(h){const c=h.cycle||['safe','danger'];return c[(h.stateIndex||0)%c.length];}
 function enemyAt(x,y,range=.6){return state.enemies.find(e=>!e.dead&&!e.passThrough&&Math.abs(e.x-x)<=range&&sameLevel(e.y,y,1.05));}
 function enemyAhead(range=1.25){
  return state.enemies.filter(e=>!e.dead&&!e.passThrough&&(e.x-state.x)*state.dir>0&&(e.x-state.x)*state.dir<=range&&Math.abs(e.y-state.y)<=1.4)
   .sort((a,b)=>Math.abs(a.x-state.x)-Math.abs(b.x-state.x))[0];
 }
 function doorAhead(range=1.2){return state.doors.find(d=>!d.open&&(d.x-state.x)*state.dir>0&&(d.x-state.x)*state.dir<=range&&sameLevel(d.y,state.y,1));}
 function crystalHere(){return state.crystals.find(c=>!c.taken&&Math.abs(c.x-state.x)<.55&&sameLevel(c.y,state.y,.8));}
 function dataHere(){return state.dataItems.find(c=>!c.taken&&Math.abs(c.x-state.x)<.55&&sameLevel(c.y,state.y,.8));}
 function switchHere(){return state.switches.find(v=>Math.abs(v.x-state.x)<.55&&sameLevel(v.y||0,state.y,.8));}
 function terminalHere(){return state.terminals.find(v=>!v.uploaded&&Math.abs(v.x-state.x)<.55&&sameLevel(v.y||0,state.y,.8));}
 function chargerHere(){return state.rechargeStations.find(v=>Math.abs((v.x??v)-state.x)<.55&&sameLevel(v.y||0,state.y,.8));}
 function hazardAt(x){return state.hazards.find(h=>Math.abs(h.x-x)<.55&&hazardState(h)==='danger');}
 function safeAhead(){return !hazardAt(state.x+state.dir);}
 function threatRange(e){return ['spitter','boss_mushroom','mirage_boss','root_warden','null_core'].includes(e.type)?4.2:e.type==='bat'?2.7:1.7;}
 function windupThreat(){return state.enemies.filter(e=>!e.dead&&enemyState(e)==='windup'&&Math.abs(e.x-state.x)<=threatRange(e)&&Math.abs((e.y||0)-state.y)<=3).sort((a,b)=>Math.abs(a.x-state.x)-Math.abs(b.x-state.x))[0];}
 function spend(cost=1){
  if(!m.usesEnergy)return true;
  if(state.energy<cost)return false;state.energy=Math.max(0,state.energy-cost);return true;
 }
 function openLinkedDoors(){
  for(const d of state.doors){
   if(d.switchId){const sw=state.switches.find(v=>v.id===d.switchId);if(sw?.on)d.open=true;}
   if(d.terminalId){const t=state.terminals.find(v=>v.id===d.terminalId);if(t?.uploaded)d.open=true;}
  }
 }
 const api={
  getTraceState(){
   return {x:state.x,y:state.y,hp:state.hp,crystals:state.crystalCount,data:state.dataCount,energy:state.energy,
    switches:state.switches.map(v=>({id:v.id,on:v.on})),uploads:state.terminals.filter(v=>v.uploaded).length,
    hazards:state.hazards.map(h=>({x:h.x,state:hazardState(h)})),
    enemies:state.enemies.filter(e=>!e.dead).map(e=>({x:e.x,y:e.y,type:e.type,hp:e.hp,state:enemyState(e)}))};
  },
  checkCondition(cond){
   if(cond==='enemyAhead')return Boolean(enemyAhead());
   if(cond==='enemyAheadWindup')return Boolean(windupThreat());
   if(cond==='gapAhead')return surfaceNear(state.x+state.dir,state.y,.75,.9)===null;
   if(cond==='platformAbove'){const x=state.x+state.dir*2;return candidates(x).some(y=>y>state.y+.7&&y<=state.y+5);}
   if(cond==='hpLow')return state.hp<=2;
   if(cond==='enemyWindup')return Boolean(windupThreat());
   if(cond==='crystals3')return state.crystalCount>=3;
   if(cond==='atGoal'){const g=m.goal||{x:0,y:0};return Math.abs(state.x-g.x)<.55&&Math.abs(state.y-g.y)<1;}
   if(cond==='safeAhead')return safeAhead();
   if(cond==='enemiesGone')return !state.enemies.some(e=>!e.dead);
   if(cond==='itemHere')return Boolean(crystalHere());
   if(cond==='doorAhead')return Boolean(doorAhead());
   if(cond==='switchHere')return Boolean(switchHere());
   if(cond==='conveyorAhead')return state.conveyors.some(v=>state.x+state.dir>=v.from&&state.x+state.dir<=v.to);
   if(cond==='dataHere')return Boolean(dataHere());
   if(cond==='data3')return state.dataCount>=3;
   if(cond==='data5')return state.dataCount>=5;
   if(cond==='terminalHere')return Boolean(terminalHere());
   if(cond==='energyLow')return state.energy<=4;
   if(cond==='chargerHere')return Boolean(chargerHere());
   return false;
  },
  async applyAction(type){
   state.lastAction=type;
   if(type==='FWD'||type==='BACK'){
    const dir=type==='BACK'?-state.dir:state.dir,x=state.x+dir,y=surfaceNear(x,state.y,.75,.9);
    if(y===null)return {ok:false,message:'앞이 끊겨 있어요.'};
    if(enemyAt(x,y))return {ok:false,message:'앞에 버그 몬스터가 있어요.'};
    const d=state.doors.find(v=>!v.open&&Math.abs(v.x-x)<.6&&sameLevel(v.y||0,y,1));if(d)return {ok:false,message:'문이 길을 막고 있어요.'};
    if(!spend(1))return {ok:false,message:'에너지가 부족해요. 충전기를 찾아보세요.'};
    state.x=x;state.y=y;return {ok:true};
   }
   if(type==='JUMP'||type==='HIGH_JUMP'){
    const high=type==='HIGH_JUMP',x=state.x+state.dir*2,y=jumpSurface(x,state.y,high);
    if(y===null)return {ok:false,message:'점프해서 착지할 곳이 없어요.'};
    const mid=state.x+state.dir,targetEnemy=enemyAt(x,y);
    const blockingDoor=state.doors.find(d=>!d.open&&(d.x-state.x)*state.dir>0&&(d.x-state.x)*state.dir<=2&&Math.abs((d.y||0)-state.y)<=1.1&&y<=state.y+1.5);
    if(enemyAt(mid,state.y)&&!high)return {ok:false,message:'몬스터가 점프 길을 막고 있어요.'};
    if(targetEnemy)return {ok:false,message:'착지할 곳에 몬스터가 있어요.'};
    if(blockingDoor)return {ok:false,message:'잠긴 문은 점프로 넘을 수 없어요.'};
    if(!spend(high?2:1))return {ok:false,message:'점프할 에너지가 부족해요.'};
    state.x=x;state.y=y;return {ok:true};
   }
   if(type==='DROP'){const y=lowerSurface(state.x,state.y);if(y===null)return {ok:false,message:'바로 아래에 내려갈 길이 없어요.'};if(!spend(1))return {ok:false,message:'에너지가 부족해요.'};state.y=y;return {ok:true};}
   if(type==='DASH'){
    const x=state.x+state.dir*2,y=surfaceNear(x,state.y,1,1.1),mid=state.x+state.dir;
    if(y===null||enemyAt(mid,state.y)||enemyAt(x,y)||doorAhead(2.1))return {ok:false,message:'대시할 길이 막혀 있어요.'};
    if(!spend(2))return {ok:false,message:'대시할 에너지가 부족해요.'};
    state.x=x;state.y=y;return {ok:true};
   }
   if(type==='DODGE'){state.evade=1;const back=state.x-state.dir,by=surfaceNear(back,state.y,.6,.8);if(by!==null&&!enemyAt(back,by)){state.x=back;state.y=by;}return {ok:true};}
   if(type==='ATTACK'){
    const e=enemyAhead(1.35);if(!e)return {ok:false,message:'공격할 적이 바로 앞에 없어요.'};
    if(enemyState(e)==='guard')return {ok:true};e.hp--;if(e.hp<=0)e.dead=true;return {ok:true};
   }
   if(type==='WAIT')return {ok:true};
   if(type==='COLLECT'){
    const c=crystalHere();if(!c)return {ok:false,message:'지금 있는 곳에는 주울 수정이 없어요.'};
    c.taken=true;state.crystalCount++;return {ok:true};
   }
   if(type==='COLLECT_DATA'){
    const d=dataHere();if(!d)return {ok:false,message:'지금 있는 곳에는 데이터가 없어요.'};
    d.taken=true;state.dataCount++;return {ok:true};
   }
   if(type==='TOGGLE'){
    const sw=switchHere();if(!sw)return {ok:false,message:'지금 있는 곳에는 스위치가 없어요.'};
    sw.on=true;openLinkedDoors();return {ok:true};
   }
   if(type==='UPLOAD'){
    const t=terminalHere();if(!t)return {ok:false,message:'지금 있는 곳에는 업로드할 단말기가 없어요.'};
    if(state.dataCount<(t.need||0))return {ok:false,message:'업로드할 데이터가 부족해요.'};
    t.uploaded=true;state.dataCount=Math.max(0,state.dataCount-(t.need||0));openLinkedDoors();return {ok:true};
   }
   if(type==='CHARGE'){
    if(!chargerHere())return {ok:false,message:'지금 있는 곳에는 충전기가 없어요.'};
    state.energy=state.maxEnergy;return {ok:true};
   }
   if(type==='OPEN'){
    const d=doorAhead();if(!d)return {ok:false,message:'바로 앞에 닫힌 문이 없어요.'};
    if(d.switchId||d.terminalId)return {ok:false,message:'이 문은 연결된 장치를 먼저 작동해야 해요.'};
    if(state.crystalCount<(d.need||0))return {ok:false,message:'수정이 부족해요.'};
    d.open=true;return {ok:true};
   }
   if(type==='HEAL'){
    if(state.hp>=state.maxHp||state.potions<=0)return {ok:true};
    state.potions--;state.hp=Math.min(state.maxHp,state.hp+2);return {ok:true};
   }
   return {ok:false,message:'알 수 없는 명령이에요.'};
  },
  async afterPlayerAction(){
   let damage=0;
   const activeHazard=state.hazards.find(h=>Math.abs(h.x-state.x)<.55&&hazardState(h)==='danger');
   if(activeHazard)damage+=1;
   for(const h of state.hazards){const c=h.cycle||['safe','danger'];h.stateIndex=((h.stateIndex||0)+1)%c.length;}
   for(const e of state.enemies){
    if(e.dead)continue;const cycle=e.cycle||defaultCycle(e.type);e.stateIndex=((e.stateIndex||0)+1)%cycle.length;
    const phase=enemyState(e),dx=Math.abs(e.x-state.x),dy=Math.abs((e.y||0)-state.y);let hits=false;
    if((phase==='shoot'||phase==='spore')&&dx<=5&&dy<=2.2)hits=true;
    else if((phase==='swoop'||phase==='slam')&&dx<=2.7&&dy<=1.5)hits=true;
    else if(phase==='attack'&&dx<=1.25&&dy<=1.2)hits=true;
    if(hits){if(state.evade>0){}else damage+=e.boss?2:(e.type==='spitter'||e.type==='golem'?2:1);}
   }
   state.evade=0;
   const cv=state.conveyors.find(v=>state.x>=v.from&&state.x<=v.to);
   if(cv){
    const nx=state.x+(cv.dir||1),ny=surfaceNear(nx,state.y,1,1);
    if(ny!==null&&!enemyAt(nx,ny)&&!state.doors.some(d=>!d.open&&Math.abs(d.x-nx)<.6)){state.x=nx;state.y=ny;}
   }
   if(damage>0)state.hp=Math.max(0,state.hp-damage);
   return {defeat:state.hp<=0};
  },
  isComplete(){
   const g=m.goal||{x:0,y:0},atGoal=Math.abs(state.x-g.x)<.55&&Math.abs(state.y-g.y)<1;
   const bossAlive=state.enemies.some(e=>e.boss&&!e.dead);
   const uploads=state.terminals.filter(t=>t.uploaded).length;
   return atGoal&&!bossAlive&&uploads>=Number(m.requireUploads||0);
  }
 };
 openLinkedDoors();
 return {api,state,mission:m};
}
async function runCase(program,functionPrograms,mission,test){
 const made=makeWorld(mission,test),runtime=new RuntimeAPI.Runtime({world:made.api,delay:0,onEvent(){},onError(){},onDone(){}});
 runtime.maxActions=Number(test?.maxActions||mission.validationMaxActions||360);
 runtime.prepare(clone(program),clone(functionPrograms));
 let result={done:false},guard=0;
 while(!result.done&&guard++<runtime.maxActions+40)result=await runtime.nextAction();
 return {id:test?.id||'test',name:test?.name||'추가 상황',ok:Boolean(result.complete),message:result.message||'',trace:runtime.getTrace(),summary:runtime.getSummary(),state:made.api.getTraceState()};
}
function traceUses(trace,type){return (trace||[]).some(e=>e.type===type&&['action','check','call','loop'].includes(e.kind));}
function conditionStats(traces,type){
 const out={checks:0,trueCount:0,falseCount:0};
 for(const trace of traces)for(const e of trace||[])if(e.kind==='check'&&e.type===type){out.checks++;if(e.result)out.trueCount++;else out.falseCount++;}
 return out;
}
function objectParticle(label){
 const text=String(label||'');const ch=text.charCodeAt(text.length-1);
 if(ch>=0xAC00&&ch<=0xD7A3)return ((ch-0xAC00)%28?'을':'를');
 return '을';
}
function conceptCheck(mission,functionPrograms,traces){
 const f=RuntimeAPI.normalizeFunctions(functionPrograms);
 const calls=traces.flat().filter(e=>e?.kind==='call');
 if(mission.requireFunction&&(!f.a.length||!calls.some(e=>(e.slot||'a')==='a')))return {ok:false,message:'나의 기술 A를 만들고 실제로 불러와 사용해 보세요.'};
 if(mission.requireFunctionB&&(!f.b.length||!calls.some(e=>e.slot==='b')))return {ok:false,message:'나의 기술 B를 만들고 실제로 불러와 사용해 보세요.'};
 const required=[...(mission.requireTypes||[])];if(mission.requireType)required.push(mission.requireType);
 for(const type of required)if(!traces.some(t=>traceUses(t,type))){const label=(window.CodeQuestData?.blocks?.[type]?.label)||type;return {ok:false,message:'이번 구역에서는 '+label+objectParticle(label)+' 실제 실행해 보세요.'};}
 if(mission.requireCallCount&&calls.length<mission.requireCallCount)return {ok:false,message:'나의 기술을 '+mission.requireCallCount+'번 이상 실제로 재사용해 보세요.'};
 if(mission.requireCallSlots){
  for(const [slot,need] of Object.entries(mission.requireCallSlots)){
   const got=calls.filter(e=>(e.slot||'a')===slot).length;
   if(got<need)return {ok:false,message:'나의 기술 '+slot.toUpperCase()+'를 '+need+'번 이상 재사용해 보세요.'};
  }
 }
 if(mission.requireConditionTrue){const c=conditionStats(traces,mission.requireConditionTrue);if(c.trueCount<1){const label=(window.CodeQuestData?.blocks?.[mission.requireConditionTrue]?.label)||mission.requireConditionTrue;return {ok:false,message:'조건이 참이 되는 상황에서 '+label+objectParticle(label)+' 활용해 보세요.'};}}
 if(mission.requireConditionCoverage){const c=conditionStats(traces,mission.requireConditionCoverage);if(c.trueCount<1||c.falseCount<1)return {ok:false,message:'같은 조건이 참일 때와 거짓일 때 모두 올바르게 작동하도록 만들어 보세요.'};}
 return {ok:true};
}
async function validate({mission,program,functionProgram,functionPrograms,visibleTrace=[],visibleSummary={}}){
 const fns=functionPrograms??functionProgram??[],tests=mission.validationTests||[],results=[];
 for(const test of tests)results.push(await runCase(program,fns,mission,test));
 const traces=[visibleTrace,...results.map(r=>r.trace)],concept=conceptCheck(mission,fns,traces),f=RuntimeAPI.normalizeFunctions(fns);
 const stable=results.every(r=>r.ok),mainNodes=RuntimeAPI.countNodes(program),functionANodes=RuntimeAPI.countNodes(f.a),functionBNodes=RuntimeAPI.countNodes(f.b);
 return {
  ok:stable&&concept.ok,stable,concept,results,
  metrics:{mainNodes,functionANodes,functionBNodes,functionNodes:functionANodes+functionBNodes,totalNodes:mainNodes+functionANodes+functionBNodes,actions:Number(visibleSummary.actions)||0,calls:Number(visibleSummary.calls)||0}
 };
}
window.CodeQuestValidator={validate,runCase,makeWorld,missionForTest};
})();