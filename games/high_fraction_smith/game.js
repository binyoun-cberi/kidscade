(()=>{'use strict';
const E=window.FractionSmithMath,P=window.FractionSmithPuzzles,A=window.FractionSmithAvatar;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const el={order:$('#orderCount'),score:$('#score'),heat:$('#heat'),timer:$('#timer'),target:$('#targetValue'),meta:$('#orderMeta'),tray:$('#materialTray'),slotA:$('#slotA'),slotB:$('#slotB'),anvil:$('#anvil'),op:$('#opBadge'),equation:$('#equationLine'),result:$('#resultPop'),toast:$('#toast'),ghost:$('#toolGhost'),fx:$('#fxLayer'),avatar:$('#avatarImg'),avatarFallback:$('#avatarFallback'),stageTool:$('#stageTool'),sound:$('#soundBtn'),hint:$('#hintBtn'),undo:$('#undoBtn'),start:$('#startModal'),finish:$('#finishModal'),finishTitle:$('#finishTitle'),finishText:$('#finishText'),finishScore:$('#finishScore')};
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
let sound=true,avatar=null,state={mode:'practice',puzzle:null,pieces:new Map(),slots:[null,null],score:0,combo:0,heat:1,orders:0,strikes:0,time:0,running:false,busy:false,history:[],resultSeq:0,timerId:0};
function play(key,vol=.45){if(!sound)return;try{const a=new Audio(AUDIO[key]);a.volume=vol;a.play().catch(()=>{})}catch(_){}}
function toast(msg,ms=1350){el.toast.textContent=msg;el.toast.classList.add('show');clearTimeout(el.toast._t);el.toast._t=setTimeout(()=>el.toast.classList.remove('show'),ms)}
function pieceDisplay(p){return E.display(p.value,p.prefer)}
function pieceHTML(p){
 const v=p.value,disp=pieceDisplay(p),decimal=p.prefer==='decimal'&&E.isTerminating(v);
 let vis='';
 if(decimal){const x=Math.max(0,Math.min(1,v.n/v.d));vis='<span class="piece-visual" style="--fill:'+Math.round(x*100)+'%"></span>'}
 else if(v.n>=0&&v.n<=v.d&&v.d<=12){vis='<span class="piece-visual">'+Array.from({length:v.d},(_,i)=>'<i class="'+(i<v.n?'on':'')+'"></i>').join('')+'</span>'}
 else vis='<span class="piece-visual"><i class="on"></i><i></i><i class="on"></i></span>';
 return '<span class="piece-value">'+disp+'</span>'+vis;
}
function snapshot(){return {pieces:[...state.pieces.values()].map(p=>({id:p.id,value:E.make(p.value.n,p.value.d),prefer:p.prefer})),slots:[...state.slots],strikes:state.strikes}}
function restore(s){state.pieces=new Map(s.pieces.map(p=>[p.id,p]));state.slots=[...s.slots];state.strikes=s.strikes;render()}
function newPuzzle(){
 state.puzzle=P.create(state.mode);state.pieces=new Map(state.puzzle.materials.map(p=>[p.id,{...p}]));state.slots=[null,null];state.strikes=0;state.history=[];state.busy=false;
 el.target.textContent=state.puzzle.targetDisplay;el.meta.textContent='최단 '+state.puzzle.bestStrikes+'타';el.op.textContent='?';el.equation.textContent='재료 두 개를 모루에 올려요';render();
 if(state.orders===0&&state.mode==='practice')toast('먼저 숫자 조각 두 개를 모루에 올려 보세요!',2200)
}
function render(){
 el.order.textContent=state.orders;el.score.textContent=state.score;el.heat.textContent='🔥'.repeat(Math.max(1,state.heat));el.timer.textContent=state.mode==='rush'?Math.max(0,Math.ceil(state.time)):'∞';
 el.timer.classList.toggle('danger',state.mode==='rush'&&state.time<=10);
 el.tray.innerHTML='';
 for(const p of state.pieces.values()){
   if(state.slots.includes(p.id))continue;
   const b=document.createElement('button');b.className='piece '+(p.prefer==='decimal'?'decimal':'');b.dataset.id=p.id;b.innerHTML=pieceHTML(p);bindPiece(b,p.id);el.tray.appendChild(b)
 }
 [el.slotA,el.slotB].forEach((slot,i)=>{
   const id=state.slots[i],p=id?state.pieces.get(id):null;slot.classList.toggle('filled',!!p);slot.innerHTML=p?'<span class="piece '+(p.prefer==='decimal'?'decimal':'')+'">'+pieceHTML(p)+'</span>':'<span>'+(i+1)+'</span>';
 });
 if(state.slots[0]&&state.slots[1]){const a=state.pieces.get(state.slots[0]),b=state.pieces.get(state.slots[1]);el.equation.textContent=pieceDisplay(a)+'  ?  '+pieceDisplay(b)+'  =  ?'}else el.equation.textContent='재료 두 개를 모루에 올려요';
 el.undo.disabled=state.history.length===0;el.hint.style.display=state.mode==='practice'?'inline-block':'none';el.undo.style.display=state.mode==='practice'?'inline-block':'none'
}
function putInSlot(id,index=null){
 if(state.busy||!state.pieces.has(id))return;
 const old=state.slots.indexOf(id);if(old>=0)state.slots[old]=null;
 if(index==null)index=state.slots[0]?1:0;
 if(state.slots[index]&&state.slots[index]!==id){const other=index?0:1;if(!state.slots[other])state.slots[other]=state.slots[index];else state.slots[index]=null}
 state.slots[index]=id;play('confirm',.24);render()
}
function bindPiece(node,id){
 let moved=false,startX=0,startY=0,ghost=null;
 node.addEventListener('pointerdown',ev=>{
   if(state.busy)return;node.setPointerCapture?.(ev.pointerId);startX=ev.clientX;startY=ev.clientY;moved=false;
   ghost=node.cloneNode(true);ghost.style.cssText='position:fixed;z-index:1200;pointer-events:none;width:92px;opacity:.92;transform:translate(-50%,-50%) rotate(-3deg);left:'+ev.clientX+'px;top:'+ev.clientY+'px';document.body.appendChild(ghost);play('select',.2)
 });
 node.addEventListener('pointermove',ev=>{if(!ghost)return;const dx=ev.clientX-startX,dy=ev.clientY-startY;if(Math.hypot(dx,dy)>7)moved=true;ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px'});
 node.addEventListener('pointerup',ev=>{if(!ghost)return;ghost.remove();ghost=null;const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.slot');if(target)putInSlot(id,Number(target.dataset.slot));else if(!moved)putInSlot(id)});
 node.addEventListener('pointercancel',()=>{ghost?.remove();ghost=null})
}
$$('.slot').forEach(slot=>slot.addEventListener('click',()=>{const i=Number(slot.dataset.slot);if(state.slots[i]){state.slots[i]=null;play('select',.2);render()}}));
function bindTools(){
 $$('.tool').forEach(btn=>{
   let active=false,moved=false,sx=0,sy=0;
   btn.addEventListener('pointerdown',ev=>{
     if(state.busy)return;active=true;moved=false;sx=ev.clientX;sy=ev.clientY;btn.setPointerCapture?.(ev.pointerId);el.ghost.textContent=btn.querySelector('.tool-art').textContent;el.ghost.style.left=ev.clientX+'px';el.ghost.style.top=ev.clientY+'px';el.ghost.classList.add('show');btn.classList.add('active');play('select',.2)
   });
   btn.addEventListener('pointermove',ev=>{if(!active)return;if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>8)moved=true;el.ghost.style.left=ev.clientX+'px';el.ghost.style.top=ev.clientY+'px'});
   const finish=ev=>{if(!active)return;active=false;el.ghost.classList.remove('show');btn.classList.remove('active');const r=el.anvil.getBoundingClientRect(),inside=ev.clientX>=r.left-30&&ev.clientX<=r.right+30&&ev.clientY>=r.top-30&&ev.clientY<=r.bottom+30;if(inside||!moved)forge(btn.dataset.op)};
   btn.addEventListener('pointerup',finish);btn.addEventListener('pointercancel',()=>{active=false;el.ghost.classList.remove('show');btn.classList.remove('active')})
 })
}
function impactFx(){
 const r=el.anvil.getBoundingClientRect(),x=r.left+r.width*.54,y=r.top+r.height*.55;el.anvil.classList.remove('strike');void el.anvil.offsetWidth;el.anvil.classList.add('strike');
 for(let i=0;i<11;i++){const img=document.createElement('img');img.className='spark';img.src=SPARKS[i%SPARKS.length];img.style.left=x+'px';img.style.top=y+'px';img.style.setProperty('--dx',(Math.random()*180-90)+'px');img.style.setProperty('--dy',(-30-Math.random()*120)+'px');el.fx.appendChild(img);setTimeout(()=>img.remove(),700)}
}
function showResult(p,op){el.result.textContent=E.display(p.value,p.prefer);el.result.classList.remove('show');void el.result.offsetWidth;el.result.classList.add('show');el.op.textContent=op}
function forge(op){
 if(state.busy||!state.running)return;
 const [aId,bId]=state.slots;if(!aId||!bId){play('error',.28);toast('숫자 재료 두 개를 먼저 올려 주세요.');return}
 const a=state.pieces.get(aId),b=state.pieces.get(bId);if(!a||!b)return;
 let value;try{value=E.apply(op,a.value,b.value)}catch(err){play('error',.32);toast('0으로는 나눌 수 없어요!');return}
 if(!E.nice(value,{maxAbs:8,maxDen:40,allowZero:true})||value.n<0){play('error',.3);toast('이 대장간에서는 너무 복잡한 조각은 만들지 않아요.');return}
 const cfg=TOOL[op];state.busy=true;state.history.push(snapshot());state.strikes++;el.op.textContent=op;el.equation.textContent=pieceDisplay(a)+' '+op+' '+pieceDisplay(b)+' = ?';avatar?.playForge(cfg.kind,cfg.duration);el.stageTool.textContent=cfg.emoji;play('whoosh',.34);
 setTimeout(()=>{
   impactFx();play('impact',.48);
   state.pieces.delete(aId);state.pieces.delete(bId);state.slots=[null,null];
   const prefer=(a.prefer==='decimal'&&b.prefer==='decimal'&&E.isTerminating(value))?'decimal':'fraction';
   const p={id:'r'+(++state.resultSeq),value,prefer};state.pieces.set(p.id,p);showResult(p,op);play('drop',.28);render();
   if(E.eq(value,state.puzzle.target))setTimeout(()=>completeOrder(p),300);else {toast('새 재료 '+pieceDisplay(p)+' 제작!');setTimeout(()=>{state.busy=false},220)}
 },cfg.duration*cfg.hit);
 setTimeout(()=>{if(!E.eq(value,state.puzzle.target))state.busy=false},cfg.duration+100)
}
function completeOrder(result){
 const perfect=state.strikes===state.puzzle.bestStrikes;state.orders++;state.combo++;state.heat=Math.min(5,1+Math.floor(state.combo/2));
 const speed=state.mode==='rush'?Math.max(0,Math.round(state.time)):0;const gain=100+state.heat*15+(perfect?90:0)+(state.mode==='rush'?Math.min(50,speed):0);state.score+=gain;
 avatar?.celebrate();play(perfect?'woo':'yay',.45);toast(perfect?'⚒ MASTER FORGE · 최단 타격! +'+gain:'주문 완성! +'+gain,1700);
 saveBest();render();
 setTimeout(()=>{if(!state.running)return;if(state.mode==='master'){finish('마스터 오더 완성!','최단 '+state.puzzle.bestStrikes+'타 · 내가 사용한 '+state.strikes+'타','👑')}else newPuzzle()},1150)
}
function hint(){
 const step=state.puzzle?.recipe?.[0];if(!step)return;toast('힌트: '+E.display(step.a,'fraction')+' '+step.op+' '+E.display(step.b,'fraction')+' 부터 만들어 보세요.',2600)
}
function undo(){if(state.busy||!state.history.length)return;restore(state.history.pop());play('select',.2);toast('한 번 전으로 되돌렸어요.')}
function saveBest(){if(state.mode!=='rush')return;try{const k='kidscade_fraction_smith_best_v1',prev=Number(localStorage.getItem(k)||0);if(state.score>prev)localStorage.setItem(k,String(state.score))}catch(_){}}
function start(mode){
 clearInterval(state.timerId);state={...state,mode,puzzle:null,pieces:new Map(),slots:[null,null],score:0,combo:0,heat:1,orders:0,strikes:0,time:mode==='rush'?60:0,running:true,busy:false,history:[],resultSeq:0,timerId:0};
 el.start.classList.remove('open');el.finish.classList.remove('open');newPuzzle();
 if(mode==='rush'){let last=performance.now();state.timerId=setInterval(()=>{const now=performance.now();state.time-=Math.max(0,(now-last)/1000);last=now;if(state.time<=0){state.time=0;render();finish('러시 종료!','완성한 주문 '+state.orders+'개 · 최고 HEAT '+state.heat,'🔥')}else render()},200)}
}
function finish(title,text,icon='⚒️'){if(!state.running)return;state.running=false;state.busy=false;clearInterval(state.timerId);saveBest();play('fanfare',.42);$('#finishIcon').textContent=icon;el.finishTitle.textContent=title;el.finishText.textContent=text;el.finishScore.textContent=state.score+'점';el.finish.classList.add('open')}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode)));el.hint.addEventListener('click',hint);el.undo.addEventListener('click',undo);
$('#againBtn').addEventListener('click',()=>start(state.mode));$('#modeBtn').addEventListener('click',()=>{el.finish.classList.remove('open');el.start.classList.add('open')});
el.sound.addEventListener('click',()=>{sound=!sound;el.sound.textContent=sound?'🔊':'🔇';if(sound)play('confirm',.2)});
addEventListener('keydown',ev=>{if(!state.running||state.busy)return;if(ev.key==='1')forge('+');else if(ev.key==='2')forge('-');else if(ev.key==='3')forge('×');else if(ev.key==='4')forge('÷');else if(ev.key==='z'&&state.mode==='practice')undo()});
bindTools();
try{avatar=new A.ForgeAvatar(el.avatar);el.avatar.addEventListener('load',()=>{el.avatarFallback.style.opacity='0'});el.avatar.addEventListener('error',()=>{el.avatarFallback.style.opacity='1'})}catch(_){el.avatarFallback.style.opacity='1'}
})();