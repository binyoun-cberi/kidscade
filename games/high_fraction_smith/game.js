(()=>{'use strict';
const E=window.FractionSmithMath,P=window.FractionSmithPuzzles,A=window.FractionSmithAvatar,O=window.FractionSmithOrders,F=window.FractionSmithForge,S=window.FractionSmithProgress;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const el={order:$('#orderCount'),score:$('#score'),gold:$('#gold'),heat:$('#heat'),timer:$('#timer'),target:$('#targetValue'),meta:$('#orderMeta'),customer:$('#customerName'),customerIcon:$('#customerIcon'),item:$('#itemName'),request:$('#requestText'),material:$('#materialName'),tray:$('#materialTray'),slotA:$('#slotA'),slotB:$('#slotB'),anvil:$('#anvil'),op:$('#opBadge'),equation:$('#equationLine'),result:$('#resultPop'),toast:$('#toast'),ghost:$('#toolGhost'),fx:$('#fxLayer'),avatar:$('#avatarImg'),avatarFallback:$('#avatarFallback'),stageTool:$('#stageTool'),sound:$('#soundBtn'),hint:$('#hintBtn'),undo:$('#undoBtn'),restart:$('#restartBtn'),start:$('#startModal'),finish:$('#finishModal'),finishTitle:$('#finishTitle'),finishText:$('#finishText'),finishScore:$('#finishScore'),craft:$('#craftModal'),craftStep:$('#craftStep'),craftName:$('#craftOrderName'),craftTitle:$('#craftTitle'),craftInstruction:$('#craftInstruction'),craftScene:$('#craftScene'),craftProduct:$('#craftProduct'),craftBurst:$('#craftBurst'),craftMeter:$('#craftMeter'),craftFill:$('#craftMeterFill'),craftMarker:$('#craftTimingMarker'),craftStatus:$('#craftStatus'),craftAction:$('#craftActionBtn'),craftTip:$('#craftTip'),savedProgress:$('#savedProgress')};
const AUDIO={
 select:'../../assets/audio/ui/kenney_interface/select_002.ogg',
 confirm:'../../assets/audio/ui/kenney_interface/confirmation_001.ogg',
 error:'../../assets/audio/ui/kenney_interface/error_002.ogg',
 whoosh:'../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',
 impact:'../../assets/audio/sfx/combat/impact-heavy-01.mp3',
 drop:'../../assets/audio/sfx/collect/coin-drop-01.mp3',
 pickup:'../../assets/audio/sfx/collect/coin-pickup-01.mp3',
 yay:'../../assets/audio/sfx/success/cheer-yay-01.mp3',
 woo:'../../assets/audio/sfx/success/cheer-woohoo-01.mp3',
 fanfare:'../../assets/audio/sfx/success/victory-fanfare-01.mp3'
};
const TOOL={'+':{kind:'add',emoji:'🔨',hit:.55,duration:720},'-':{kind:'sub',emoji:'🔧',hit:.62,duration:760},'×':{kind:'mul',emoji:'⚒️',hit:.64,duration:900},'÷':{kind:'div',emoji:'🪓',hit:.57,duration:790}};
const SPARKS=[1,2,3,4,5,6,7].map(n=>'../../assets/game/effects/particles/kenney-particle-pack/spark-0'+n+'.png');
let sound=true,avatar=null,sequence=0,progress=S.load(),state={mode:'practice',phase:'menu',puzzle:null,commission:null,craft:null,pieces:new Map(),slots:[null,null],score:0,combo:0,heat:1,orders:0,strikes:0,time:0,running:false,busy:false,history:[],resultSeq:0,timerId:0};
function play(key,vol=.45){if(!sound)return;try{const a=new Audio(AUDIO[key]);a.volume=vol;a.play().catch(()=>{})}catch(_){}}
function toast(msg,ms=1350){el.toast.textContent=msg;el.toast.classList.add('show');clearTimeout(el.toast._t);el.toast._t=setTimeout(()=>el.toast.classList.remove('show'),ms)}
function pieceDisplay(p){return E.display(p.value,p.prefer)}
function pieceHTML(p){
 const v=p.value,disp=pieceDisplay(p),decimal=p.prefer==='decimal'&&E.isTerminating(v);
 let vis='';
 if(v.n>=0&&v.d<=12){
   const whole=Math.floor(v.n/v.d),remainder=v.n%v.d;
   vis='<span class="piece-visual multi">'+Array.from({length:Math.min(whole,5)},()=>'<i class="on whole" title="한 단위"></i>').join('')+
     (remainder?'<span class="partial" style="--fill:'+Math.round(remainder/v.d*100)+'%"></span>':'')+'</span>';
 }else vis='<span class="piece-visual"><i class="on"></i><i></i><i class="on"></i></span>';
 return '<span class="piece-value">'+disp+'</span>'+vis;
}
function snapshot(){return {pieces:[...state.pieces.values()].map(p=>({id:p.id,value:E.make(p.value.n,p.value.d),prefer:p.prefer})),slots:[...state.slots],strikes:state.strikes}}
function restore(s){state.pieces=new Map(s.pieces.map(p=>[p.id,p]));state.slots=[...s.slots];state.strikes=s.strikes;render()}
function newPuzzle(){
 sequence++;
 state.puzzle=P.create(state.mode);state.pieces=new Map(state.puzzle.materials.map(p=>[p.id,{...p}]));state.slots=[null,null];state.strikes=0;state.history=[];state.busy=false;
 state.commission=O.create(state.orders,state.mode);state.phase='math';state.craft=null;
 el.customer.textContent=state.commission.customer.name;el.customerIcon.textContent=state.commission.customer.icon;
 el.item.textContent=state.commission.item.name;el.request.textContent=state.commission.item.request;
 el.material.textContent='필요한 '+state.commission.item.material+' (단위)';
 el.target.textContent=state.puzzle.targetDisplay;el.meta.textContent='최단 '+state.puzzle.bestStrikes+'타';el.op.textContent='?';el.equation.textContent='재료 두 개를 모루에 올려요';render();
 if(state.orders===0&&state.mode==='practice')toast('손님이 주문한 양만큼 재료를 만들어 보세요!',2200)
}
function render(){
 document.body.dataset.heat=String(Math.max(1,state.heat));
 el.order.textContent=state.orders;el.score.textContent=state.score;el.gold.textContent=progress.gold+' G';el.heat.textContent='🔥'.repeat(Math.max(1,state.heat));renderTimer();
 el.tray.innerHTML='';
 for(const p of state.pieces.values()){
   if(state.slots.includes(p.id))continue;
   const b=document.createElement('button');b.className='piece '+(p.prefer==='decimal'?'decimal':'');b.dataset.id=p.id;b.innerHTML=pieceHTML(p);bindPiece(b,p.id);el.tray.appendChild(b)
 }
 [el.slotA,el.slotB].forEach((slot,i)=>{
   const id=state.slots[i],p=id?state.pieces.get(id):null;slot.classList.toggle('filled',!!p);slot.innerHTML=p?'<span class="piece '+(p.prefer==='decimal'?'decimal':'')+'">'+pieceHTML(p)+'</span>':'<span>'+(i+1)+'</span>';
 });
 if(state.slots[0]&&state.slots[1]){const a=state.pieces.get(state.slots[0]),b=state.pieces.get(state.slots[1]);el.equation.textContent=pieceDisplay(a)+'  ?  '+pieceDisplay(b)+'  =  ?'}else el.equation.textContent='재료 두 개를 모루에 올려요';
 el.undo.disabled=state.phase!=='math'||state.history.length===0;el.restart.disabled=state.phase!=='math';el.hint.disabled=state.phase!=='math';
}
function renderTimer(){
 el.timer.textContent=state.mode==='rush'?Math.max(0,Math.ceil(state.time)):'∞';
 el.timer.classList.toggle('danger',state.mode==='rush'&&state.time<=10);
}
function putInSlot(id,index=null){
 if(state.busy||state.phase!=='math'||!state.pieces.has(id))return;
 const old=state.slots.indexOf(id);if(old>=0)state.slots[old]=null;
 if(index==null)index=state.slots[0]?1:0;
 if(state.slots[index]&&state.slots[index]!==id){const other=index?0:1;if(!state.slots[other])state.slots[other]=state.slots[index];else state.slots[index]=null}
 state.slots[index]=id;play('confirm',.24);render()
}
function bindPiece(node,id){
 let moved=false,startX=0,startY=0,ghost=null;
 node.addEventListener('pointerdown',ev=>{
   if(state.busy||state.phase!=='math')return;node.setPointerCapture?.(ev.pointerId);startX=ev.clientX;startY=ev.clientY;moved=false;
   ghost=node.cloneNode(true);ghost.style.cssText='position:fixed;z-index:1200;pointer-events:none;width:92px;opacity:.92;transform:translate(-50%,-50%) rotate(-3deg);left:'+ev.clientX+'px;top:'+ev.clientY+'px';document.body.appendChild(ghost);play('select',.2)
 });
 node.addEventListener('pointermove',ev=>{if(!ghost)return;const dx=ev.clientX-startX,dy=ev.clientY-startY;if(Math.hypot(dx,dy)>7)moved=true;ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px'});
 node.addEventListener('pointerup',ev=>{if(!ghost)return;ghost.remove();ghost=null;node._pointerAt=Date.now();const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.slot');if(target)putInSlot(id,Number(target.dataset.slot));else if(!moved)putInSlot(id)});
 node.addEventListener('pointercancel',()=>{ghost?.remove();ghost=null})
 node.addEventListener('click',()=>{if(Date.now()-(node._pointerAt||0)>350)putInSlot(id)});
}
$$('.slot').forEach(slot=>slot.addEventListener('click',()=>{if(state.phase!=='math'||state.busy)return;const i=Number(slot.dataset.slot);if(state.slots[i]){state.slots[i]=null;play('select',.2);render()}}));
function bindTools(){
 $$('.tool').forEach(btn=>{
   let active=false,moved=false,sx=0,sy=0;
   btn.addEventListener('pointerdown',ev=>{
     if(state.busy||state.phase!=='math')return;active=true;moved=false;sx=ev.clientX;sy=ev.clientY;btn.setPointerCapture?.(ev.pointerId);el.ghost.textContent=btn.querySelector('.tool-art').textContent;el.ghost.style.left=ev.clientX+'px';el.ghost.style.top=ev.clientY+'px';el.ghost.classList.add('show');btn.classList.add('active');play('select',.2)
   });
   btn.addEventListener('pointermove',ev=>{if(!active)return;if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>8)moved=true;el.ghost.style.left=ev.clientX+'px';el.ghost.style.top=ev.clientY+'px'});
   const finish=ev=>{if(!active)return;active=false;btn._pointerAt=Date.now();el.ghost.classList.remove('show');btn.classList.remove('active');const r=el.anvil.getBoundingClientRect(),inside=ev.clientX>=r.left-30&&ev.clientX<=r.right+30&&ev.clientY>=r.top-30&&ev.clientY<=r.bottom+30;if(inside||!moved)forge(btn.dataset.op)};
   btn.addEventListener('pointerup',finish);btn.addEventListener('pointercancel',()=>{active=false;el.ghost.classList.remove('show');btn.classList.remove('active')})
   btn.addEventListener('click',()=>{if(Date.now()-(btn._pointerAt||0)>350)forge(btn.dataset.op)});
 })
}
function impactFx(){
 const r=el.anvil.getBoundingClientRect(),x=r.left+r.width*.54,y=r.top+r.height*.55;el.anvil.classList.remove('strike');void el.anvil.offsetWidth;el.anvil.classList.add('strike');
 document.body.classList.add('forge-hit');clearTimeout(impactFx._flash);impactFx._flash=setTimeout(()=>document.body.classList.remove('forge-hit'),150);
 for(let i=0;i<11;i++){const img=document.createElement('img');img.className='spark';img.src=SPARKS[i%SPARKS.length];img.style.left=x+'px';img.style.top=y+'px';img.style.setProperty('--dx',(Math.random()*180-90)+'px');img.style.setProperty('--dy',(-30-Math.random()*120)+'px');el.fx.appendChild(img);setTimeout(()=>img.remove(),700)}
}
function showResult(p,op){el.result.textContent=E.display(p.value,p.prefer);el.result.classList.remove('show');void el.result.offsetWidth;el.result.classList.add('show');el.op.textContent=op}
function forge(op){
 if(state.busy||!state.running||state.phase!=='math')return;
 const [aId,bId]=state.slots;if(!aId||!bId){play('error',.28);toast('숫자 재료 두 개를 먼저 올려 주세요.');return}
 const a=state.pieces.get(aId),b=state.pieces.get(bId);if(!a||!b)return;
 let value;try{value=E.apply(op,a.value,b.value)}catch(err){state.combo=0;state.heat=1;play('error',.32);toast('0으로는 나눌 수 없어요!');render();return}
 if(!E.nice(value,{maxAbs:8,maxDen:40,allowZero:true})||value.n<0){state.combo=0;state.heat=1;play('error',.3);toast('이 대장간에서는 너무 복잡한 조각은 만들지 않아요.');render();return}
 const cfg=TOOL[op];state.busy=true;state.history.push(snapshot());state.strikes++;el.op.textContent=op;el.equation.textContent=pieceDisplay(a)+' '+op+' '+pieceDisplay(b)+' = ?';avatar?.playForge(cfg.kind,cfg.duration);el.stageTool.textContent=cfg.emoji;play('whoosh',.34);
 const token=sequence;
 setTimeout(()=>{
   if(token!==sequence||!state.running||state.phase!=='math')return;
   impactFx();play('impact',.48);
   state.pieces.delete(aId);state.pieces.delete(bId);state.slots=[null,null];
   const prefer=(a.prefer==='decimal'&&b.prefer==='decimal'&&E.isTerminating(value))?'decimal':'fraction';
   const p={id:'r'+(++state.resultSeq),value,prefer};state.pieces.set(p.id,p);showResult(p,op);play('drop',.28);render();
   if(E.eq(value,state.puzzle.target))setTimeout(()=>{if(token===sequence&&state.running)beginCraft()},320);else {toast('새 재료 '+pieceDisplay(p)+' 제작!');setTimeout(()=>{if(token===sequence)state.busy=false},220)}
 },cfg.duration*cfg.hit);
 setTimeout(()=>{if(token===sequence&&!E.eq(value,state.puzzle.target))state.busy=false},cfg.duration+100)
}
function beginCraft(){
 state.phase='craft';state.craft=F.create();state.busy=false;state.craftStart=performance.now();
 el.craftName.textContent=state.commission.item.name;el.craftProduct.textContent=state.commission.item.icon;
 el.craft.classList.add('open');updateCraft();el.craftAction.focus();
}
let markerFrame=0;
function stopMarker(){cancelAnimationFrame(markerFrame);markerFrame=0}
function tickMarker(){
 if(state.phase!=='craft'||state.craft?.stage!=='hammer')return;
 const timing=((performance.now()-state.craftStart)/1500)%1;
 el.craftMarker.style.left=(timing*100)+'%';
 markerFrame=requestAnimationFrame(tickMarker);
}
function updateCraft(){
 const c=state.craft;if(!c)return;
 el.craftScene.dataset.stage=c.stage;el.craftMeter.classList.toggle('timing',c.stage==='hammer');
 el.craftScene.style.setProperty('--forgeHeat',String(c.pumps/4));
 stopMarker();
 if(c.stage==='heat'){
   el.craftStep.textContent='제작 1/3 · 가열';el.craftTitle.textContent='쇠에 뜨거운 생명을 불어넣어요';
   el.craftInstruction.textContent='풀무를 네 번 눌러 쇠를 붉게 달궈 보세요.';
   el.craftFill.style.width=(c.pumps/4*100)+'%';el.craftStatus.textContent='🔥 가열 '+c.pumps+'/4';el.craftAction.textContent='🌬️ 풀무 누르기';
 }else if(c.stage==='hammer'){
   el.craftStep.textContent='제작 2/3 · 망치질';el.craftTitle.textContent='지금이야! 달궈진 금속을 두드려요';
   el.craftInstruction.textContent='움직이는 표식이 노란 구간에 왔을 때 망치를 내려치세요.';
   el.craftFill.style.width='0%';el.craftStatus.textContent='🔨 망치질 '+c.hits+'/3';el.craftAction.textContent='🔨 망치 내려치기';
   if(!markerFrame)markerFrame=requestAnimationFrame(tickMarker);
 }else if(c.stage==='quench'){
   el.craftStep.textContent='제작 3/3 · 담금질';el.craftTitle.textContent='마지막으로 물에 담가 단단하게!';
   el.craftInstruction.textContent='금속을 물에 담그면 멋진 작품이 완성됩니다.';
   el.craftFill.style.width='100%';el.craftStatus.textContent='💧 담금질 준비 완료';el.craftAction.textContent='💧 물에 담그기';
 }
}
function craftAction(){
 if(!state.running)return;
 if(state.phase==='award'){advanceOrder();return}
 if(state.phase!=='craft')return;
 const before=state.craft.stage,timing=((performance.now()-state.craftStart)/1500)%1;
 F.act(state.craft,timing);
 if(before==='heat'){play('whoosh',.28);el.craftScene.classList.remove('pumped');void el.craftScene.offsetWidth;el.craftScene.classList.add('pumped')}
 if(before==='hammer'){
   play('impact',.45);avatar?.playForge('add',600);
   el.craftBurst.textContent=Math.abs(timing-.75)<.10?'완벽한 타격! ✨':'쾅!';
   el.craftScene.classList.remove('hammer-hit');void el.craftScene.offsetWidth;el.craftScene.classList.add('hammer-hit');
 }
 if(before==='quench'){play('confirm',.45);completeOrder();return}
 if(before!==state.craft.stage){state.craftStart=performance.now();el.craftBurst.textContent=''}
 updateCraft();
}
function completeOrder(){
 if(state.phase!=='craft'||!state.craft.done)return;
 const perfect=state.strikes===state.puzzle.bestStrikes,quality=state.craft.quality;
 state.phase='award';state.orders++;state.combo++;state.heat=Math.min(5,1+Math.floor(state.combo/2));
 const speed=state.mode==='rush'?Math.max(0,Math.round(state.time)):0;
 const gain=100+state.heat*15+(perfect?90:0)+Math.round(quality*.2)+(state.mode==='rush'?Math.min(50,speed):0);
 const earned=30+state.puzzle.bestStrikes*10+Math.round(quality/5);
 state.score+=gain;progress=S.reward(progress,state.commission.item.id,earned);
 avatar?.celebrate();play(perfect?'woo':'yay',.45);saveBest();render();
 el.craftScene.dataset.stage='done';el.craftStep.textContent='주문 완성!';
 el.craftTitle.textContent='✨ '+state.commission.item.name+' 완성!';
 el.craftInstruction.textContent=state.commission.customer.name+' 님이 기뻐합니다. 정밀도 '+quality+'점 · '+state.strikes+'타 제작';
 el.craftStatus.textContent='+'+earned+' G · +'+gain+'점'+(perfect?' · 최단 타격!':'');
 el.craftFill.style.width='100%';el.craftMeter.classList.remove('timing');el.craftAction.textContent=state.mode==='master'?'제작 결과 보기':'다음 주문 받기';
 el.craftTip.textContent='공방 총 제작품 '+progress.crafted+'개 · 보유 '+progress.gold+' G';
 stopMarker();
 if(state.mode==='rush'){
   const token=sequence;setTimeout(()=>{if(token===sequence&&state.phase==='award'&&state.running)advanceOrder()},1600);
 }
}
function advanceOrder(){
 if(state.phase!=='award'||!state.running)return;
 el.craft.classList.remove('open');
 if(state.mode==='master')finish('마스터 주문 성공!','3단계 제작 완료 · 내가 사용한 '+state.strikes+'타','👑');
 else newPuzzle();
}
function hint(){
 if(state.phase!=='math')return;
 const pieces=[...state.pieces.values()];
 const step=state.puzzle?.recipe?.find(s=>pieces.some((a,i)=>pieces.some((b,j)=>i!==j&&E.eq(a.value,s.a)&&E.eq(b.value,s.b))));
 if(step)toast('힌트: '+E.display(step.a,'fraction')+' '+step.op+' '+E.display(step.b,'fraction')+' 재료를 사용해 보세요.',2600);
 else toast('재료가 많이 바뀌었어요. 되돌리거나 주문 다시를 눌러 보세요.',2800)
}
function undo(){if(state.busy||state.phase!=='math'||!state.history.length)return;sequence++;restore(state.history.pop());state.combo=0;state.heat=1;play('select',.2);toast('되돌렸어요. 천천히 다시 만들어 보세요!')}
function restartOrder(){
 if(state.busy||state.phase!=='math'||!state.puzzle)return;
 sequence++;state.pieces=new Map(state.puzzle.materials.map(p=>[p.id,{...p}]));state.slots=[null,null];state.history=[];state.strikes=0;state.combo=0;state.heat=1;
 el.op.textContent='?';render();toast('같은 주문을 처음부터 다시 시작해요.');
}
function saveBest(){if(state.mode!=='rush')return;try{const k='kidscade_fraction_smith_best_v1',prev=Number(localStorage.getItem(k)||0);if(state.score>prev)localStorage.setItem(k,String(state.score))}catch(_){}}
function start(mode){
 sequence++;stopMarker();clearInterval(state.timerId);
 state={...state,mode,phase:'math',puzzle:null,commission:null,craft:null,pieces:new Map(),slots:[null,null],score:0,combo:0,heat:1,orders:0,strikes:0,time:mode==='rush'?90:0,running:true,busy:false,history:[],resultSeq:0,timerId:0};
 el.start.classList.remove('open');el.finish.classList.remove('open');el.craft.classList.remove('open');newPuzzle();
 if(mode==='rush'){let last=performance.now();state.timerId=setInterval(()=>{const now=performance.now();state.time-=Math.max(0,(now-last)/1000);last=now;if(state.time<=0){state.time=0;renderTimer();finish('러시 종료!','완성한 주문 '+state.orders+'개 · 최고 HEAT '+state.heat,'🔥')}else renderTimer()},200)}
}
function finish(title,text,icon='⚒️'){if(!state.running)return;sequence++;state.phase='finish';state.running=false;state.busy=false;stopMarker();clearInterval(state.timerId);el.craft.classList.remove('open');saveBest();play('fanfare',.42);$('#finishIcon').textContent=icon;el.finishTitle.textContent=title;el.finishText.textContent=text;el.finishScore.textContent=state.score+'점 · '+progress.gold+' G 보유';el.finish.classList.add('open')}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode)));el.hint.addEventListener('click',hint);el.undo.addEventListener('click',undo);el.restart.addEventListener('click',restartOrder);el.craftAction.addEventListener('click',craftAction);
$('#againBtn').addEventListener('click',()=>start(state.mode));$('#modeBtn').addEventListener('click',()=>{el.finish.classList.remove('open');el.start.classList.add('open')});
el.sound.addEventListener('click',()=>{sound=!sound;el.sound.textContent=sound?'🔊':'🔇';if(sound)play('confirm',.2)});
addEventListener('keydown',ev=>{
 if(!state.running||state.busy||ev.repeat)return;
 if(state.phase==='craft'&&ev.code==='Space'&&document.activeElement!==el.craftAction){ev.preventDefault();craftAction();return}
 if(state.phase!=='math')return;
 if(ev.key==='1')forge('+');else if(ev.key==='2')forge('-');else if(ev.key==='3')forge('×');else if(ev.key==='4')forge('÷');
 else if(ev.key.toLowerCase()==='z')undo();else if(ev.key.toLowerCase()==='r')restartOrder();
});
el.savedProgress.textContent='지금까지 완성한 제품 '+progress.crafted+'개 · 보유 골드 '+progress.gold+' G';
bindTools();
try{avatar=new A.ForgeAvatar(el.avatar);el.avatar.addEventListener('load',()=>{el.avatarFallback.style.opacity='0'});el.avatar.addEventListener('error',()=>{el.avatarFallback.style.opacity='1'})}catch(_){el.avatarFallback.style.opacity='1'}
})();
