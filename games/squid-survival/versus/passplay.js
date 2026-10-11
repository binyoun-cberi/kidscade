(() => {
'use strict';
const E=window.SquidPassPlay,T=window.DalgonaTrace,M=window.SquidMiniRules,$=id=>document.getElementById(id);
const W=520,H=340,TRACE_SCALE=.79,TRACE_X=(W-400*TRACE_SCALE)/2,TRACE_Y=(H-400*TRACE_SCALE)/2;
const el={dialog:$('dialog'),title:$('dialogTitle'),lead:$('dialogLead'),eyebrow:$('dialogEyebrow'),
 button:$('dialogButton'),rules:$('dialogRules'),chips:$('resultChips'),chip:[$('result0'),$('result1')],
 round:$('roundTitle'),time:$('time'),track:$('roundTrack'),scores:[$('score0'),$('score1')],
 arena:document.querySelector('.arena'),chipCurrent:$('turnChip'),status:$('status'),
 board:$('board'),detail:$('detail'),hint:$('hint'),progress:$('progress'),
 instruction:$('instruction'),controls:$('controls'),keyHint:$('keyHint'),privacy:$('privacyTip')};
const ctx=el.board.getContext('2d'),saveKey=E.SAVE_KEY;
let state=E.start((Math.random()*0xffffffff)>>>0),countdown=null,frames=0,lastPaint=0,lastUi=0;
let pauseStart=null,pauseDuration=0,pointId=null,holding=false,controlsHTML='',recorded=false;
const record=(()=>{try{const o=JSON.parse(localStorage.getItem(saveKey)||'{}');return{
 matches:Number(o.matches)||0,wins:Array.isArray(o.wins)?o.wins.slice(0,2):[0,0]};}
 catch(_){return{matches:0,wins:[0,0]};}})();
const sdk=(name,data)=>{try{window.KidscadeGame?.[name]?.(data);}catch(_){}};
function clock(){const t=Date.now();return t-pauseDuration-(pauseStart===null?0:t-pauseStart);}
function release(){
 pointId=null;
 if(state.phase==='playing'&&state.game){
   const g=state.game;
   if(g.body)g.body.held=false;
   if(g.traceState)g.traceState.active=false;
 }
 holding=false;
}
function pauseCheck(){
 if(document.hidden){if(pauseStart===null){pauseStart=Date.now();release();}}
 else if(pauseStart!==null){pauseDuration+=Date.now()-pauseStart;pauseStart=null;}
}
document.addEventListener('visibilitychange',pauseCheck);
window.addEventListener('blur',release);
function scoreText(n){return Number.isInteger(n)?String(n):n.toFixed(1);}
function countdownText(ms){const n=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
const lesson={
 dalgona:'노란 출발점에서 모양을 따라 긁으세요. 너무 빠르거나 느리면 금이 가요.',
 bridge:'먼저 초록색으로 나타나는 길을 5초 동안 기억하고 방향 버튼으로 건너세요.',
 redlight:'초록불에는 꾹 누르고, 노란불이 되면 손을 떼세요. 빨간불에 달리면 탈락!',
 tug:'바늘이 초록색 중앙에 왔을 때 당기세요. 빠른 연타는 오히려 손해예요.',
 marbles:'구슬 개수를 세어 조건에 맞는 왼쪽 또는 오른쪽 주머니를 선택하세요.',
 final:'네 가지 모양 순서를 기억하고, 타이밍 두 번을 성공한 뒤 덧셈 문제를 푸세요.',
 overtime:'두 선수는 서로 다른 덧셈 문제를 풉니다. 맞힌 사람이 우선, 둘 다 맞히면 시간이 빠른 사람이 승리합니다.'
};
function modeLabel(){return state.roundIndex===6?'연장전':E.ROUNDS[state.roundIndex].title;}
function finishRecord(){
 if(state.phase!=='finished'||recorded)return;
 recorded=true;record.matches++;record.wins[state.winner]++;
 try{localStorage.setItem(saveKey,JSON.stringify(record));}catch(_){}
 sdk('result',{scope:'run',status:'completed',outcome:'win',mode:'pass-and-play',
  winner:state.winner+1,playerCount:2,score:Math.max(...state.totals),totals:state.totals});
}
function drawDialog(){
 el.dialog.hidden=false;
 el.rules.hidden=state.phase==='round-result'||state.phase==='finished';
 el.chips.hidden=state.phase==='lobby'||state.phase==='handoff';
 el.chip.forEach((x,i)=>x.textContent=scoreText(state.totals[i])+'점');
 el.privacy.hidden=state.phase==='round-result'||state.phase==='finished';
 if(state.phase==='lobby'){
   el.eyebrow.textContent='PASS & PLAY · ALL DEVICES';
   el.title.textContent='번갈아 2인 대전';
   el.lead.textContent='스마트폰·태블릿·PC 모두 한 사람이 화면 전체로 도전합니다. 1·3·5라운드는 1P가, 2·4·6라운드는 2P가 먼저 시작해요.';
   el.button.textContent='대회 시작하기 →';
 }else if(state.phase==='handoff'){
   const p=state.active+1,second=state.turnIndex===1;
   el.eyebrow.textContent=(state.roundIndex===6?'OVERTIME':'ROUND '+(state.roundIndex+1)+' / 06')+' · HANDOVER';
   el.title.textContent=p+'P 차례!';el.lead.textContent=second?
     '이전 선수가 도전을 마쳤어요. 기기를 '+p+'P에게 넘겨주세요. 앞사람의 기록은 두 사람 모두 끝날 때 공개됩니다.':
     '기기를 '+p+'P에게 넘겨주세요. '+modeLabel()+' · '+lesson[state.roundIndex===6?'overtime':E.ROUNDS[state.roundIndex].id];
   el.button.textContent=p+'P 준비 완료 · 3초 후 시작 →';
   el.chips.hidden=true;el.rules.hidden=true;
 }else if(state.phase==='round-result'){
   const r=state.history.at(-1);
   el.eyebrow.textContent='ROUND '+(r.index+1)+' RESULT';
   el.title.textContent=r.winner===null?'이번 판 무승부!':(r.winner+1)+'P 승리! +1점';
   el.lead.textContent='1P '+(r.results[0].clear?'성공':'실패')+' · '+r.results[0].metric+'점 ('+(r.results[0].elapsed/1000).toFixed(1)+'초) / '+
     '2P '+(r.results[1].clear?'성공':'실패')+' · '+r.results[1].metric+'점 ('+(r.results[1].elapsed/1000).toFixed(1)+'초).';
   el.button.textContent=r.index===5?'최종 점수 보기 →':'다음 라운드 →';
 }else if(state.phase==='finished'){
   el.eyebrow.textContent='TOURNAMENT FINISHED';
   el.title.textContent=(state.winner+1)+'P 최종 우승!';
   el.lead.textContent='6라운드의 승점을 모두 합산했어요. 다시 플레이하면 다음 경기에서는 새로운 문제가 출제됩니다.';
   el.button.textContent='새 대회 시작 ↻';
 }
 el.chips.hidden=state.phase==='lobby'||state.phase==='handoff';
 if(state.phase!=='handoff')el.privacy.hidden=true;
 // The previous player's scene is never visible while the device is handed over.
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,el.board.width,el.board.height);
}
function onDialog(){
 if(countdown!==null)return;
 if(state.phase==='lobby'){state=E.begin(state);sdk('start',{mode:'pass-and-play',players:2,rounds:6});drawDialog();return;}
 if(state.phase==='handoff'){
   countdown=clock()+3000;el.button.disabled=true;el.button.textContent='게임 시작까지 3초';
   return;
 }
 if(state.phase==='round-result'){
   state=E.advanceRound(state);if(state.phase==='finished')finishRecord();drawDialog();return;
 }
 if(state.phase==='finished'){
   state=E.begin(state);recorded=false;drawDialog();return;
 }
}
el.button.addEventListener('click',onDialog);
function send(action,value){
 if(state.phase!=='playing'||document.hidden)return;
 const previous=state.phase;
 state=E.input(state,action,value,clock());
 if(previous==='playing'&&state.phase!=='playing'){release();drawDialog();}
}
function shortKeyHelp(id,part){
 if(id==='dalgona')return '터치·마우스로 노란 점에서 시작해 따라 그리기';
 if(id==='bridge')return 'WASD · 방향키로 이동';
 if(id==='redlight')return 'Space · Enter 길게 누르기';
 if(id==='tug')return 'Space · Enter로 박자 맞춰 당기기';
 if(id==='marbles')return 'A / D 또는 ← / →';
 if(id==='final'&&part==='memory')return '1·2·3·4 또는 Q·W·E·R';
 if(id==='final'&&part==='timing')return 'Space · Enter로 타이밍 맞추기';
 if(id==='final'&&part==='math'||id==='overtime')return '숫자 1·2·3 선택';
 return '손가락·마우스로 조작';
}
function choices(){
 if(state.phase!=='playing'||!state.game)return [];
 const g=state.game,kind=g.id;
 if(kind==='bridge')return [['step','up','↑'],['step','left','←'],['step','down','↓'],['step','right','→']];
 if(kind==='redlight')return [['hold','true','꾹 누르고 달리기']];
 if(kind==='tug')return [['tap','','줄 당기기!']];
 if(kind==='marbles')return [['choose','left','왼쪽'],['choose','right','오른쪽']];
 if(kind==='overtime')return g.question.options.map(x=>['answer',String(x),String(x)]);
 if(kind==='final'){
   if(g.body.part==='preview')return [];
   if(g.body.part==='memory')return M.SYMBOLS.map(x=>['symbol',x,x]);
   if(g.body.part==='timing')return [['tap','','타이밍 맞춰 누르기!']];
   return g.body.math.options.map(x=>['answer',String(x),String(x)]);
 }
 return [];
}
function controlUpdate(){
 const items=choices(),key=items.map(x=>x.join('|')).join(',');
 if(key===controlsHTML)return;
 controlsHTML=key;
 el.controls.replaceChildren();
 for(const [action,value,label] of items){
   const b=document.createElement('button');b.type='button';b.dataset.action=action;b.dataset.value=value;b.textContent=label;
   if(items.length===1)b.classList.add('primary-action');el.controls.appendChild(b);
 }
}
function nowDetails(){
 const g=state.game,b=g?.body;
 if(!g)return '';
 if(g.id==='dalgona')return '모양 완성 '+Math.round(E.percentage(g)*100)+'% · 금 '+Math.round(g.traceState.crack)+'%';
 if(g.id==='bridge')return g.phase==='preview'?'정답 길을 기억하는 시간':'현재 '+g.step+' / '+(g.map.path.length-1)+'칸';
 if(g.id==='redlight')return b.signal==='green'?'초록불: 지금 달려요!':b.signal==='warning'?'노란불: 손을 떼세요!':'빨간불: 멈추세요!';
 if(g.id==='tug')return '힘 '+Math.round(b.rope)+'% · 피로 '+Math.round(b.fatigue)+'%';
 if(g.id==='marbles')return b.questions[b.questionIndex]?.prompt||'구슬 승부 완료';
 if(g.id==='final')return {preview:'모양 기억',memory:'모양 순서 입력',timing:'타이밍 맞히기',math:'덧셈 정답 고르기'}[b.part];
 return '연장 계산 문제에 도전하세요.';
}
function renderHUD(){
 const playing=state.phase==='playing',g=state.game;
 el.round.textContent=playing?(state.roundIndex===6?'연장전 · '+(g.player+1)+'P':
   (state.roundIndex+1)+'/6 · '+modeLabel()):'꼴뚜기 · 번갈아 2인 대전';
 el.time.textContent=playing?countdownText(g.limit-g.elapsed):'--:--';
 el.time.parentElement.classList.toggle('urgent',playing&&g.limit-g.elapsed<=10000);
 for(let i=0;i<2;i++)el.scores[i].textContent=scoreText(state.totals[i]);
 for(let i=0;i<6;i++)if(el.track.children[i]){
   el.track.children[i].classList.toggle('passed',i<state.history.length);
   el.track.children[i].classList.toggle('active',i===state.roundIndex);
 }
 const pid=playing?g.player:state.active??0;
 el.arena.dataset.player=String(pid);el.chipCurrent.textContent=(pid+1)+'P 차례';
 el.status.textContent=playing?'도전 중':'다음 선수 대기';
 el.detail.textContent=playing?nowDetails():'문제와 이전 기록은 전달 중 비공개';
 el.instruction.textContent=playing?lesson[g.id]:'한 사람이 화면 전체를 사용합니다.';
 el.keyHint.textContent=playing?shortKeyHelp(g.id,g.body?.part):'스마트폰·태블릿·PC 모두 번갈아 플레이';
 const prog=playing?Math.round(E.percentage(g)*100):0;
 el.progress.style.width=prog+'%';el.progress.parentElement.setAttribute('aria-valuenow',String(prog));
 el.hint.textContent=playing?'누른 뒤 반응이 없으면 다시 터치하세요.':'기기를 전달하세요';
 controlUpdate();
}
function rect(x,y,w,h,fill,round=0){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,round);ctx.fill();}
function circle(x,y,r,fill,stroke='#ffffff22'){ctx.beginPath();ctx.arc(x,y,Math.max(1,r),0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=stroke;ctx.stroke();}
function text(s,x,y,size=19,color='#effded'){ctx.font='900 '+size+'px system-ui';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,x,y);}
function bg(color='#1a423d'){
 const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,color);grad.addColorStop(1,'#0d202c');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 for(let i=0;i<13;i++)rect(i*W/12,0,1,H,'#e6f5d508');
}
function trace(g){
 bg('#614637');ctx.save();ctx.translate(TRACE_X,TRACE_Y);ctx.scale(TRACE_SCALE,TRACE_SCALE);
 circle(200,200,174,'#b88954');circle(200,200,164,'#e7b87a');
 ctx.beginPath();ctx.moveTo(g.trace.path[0].x,g.trace.path[0].y);
 for(const v of g.trace.path.slice(1))ctx.lineTo(v.x,v.y);
 ctx.strokeStyle='#8d6337';ctx.lineWidth=10;ctx.lineJoin='round';ctx.stroke();
 ctx.strokeStyle='#ffdfaa';ctx.lineWidth=4;ctx.stroke();
 const state=g.traceState;
 if(state.progress>0){
  const count=Math.max(1,Math.floor(state.progress/2.5));
  ctx.beginPath();ctx.moveTo(g.trace.path[0].x,g.trace.path[0].y);
  for(let i=1;i<=count&&i<g.trace.path.length;i++)ctx.lineTo(g.trace.path[i].x,g.trace.path[i].y);
  ctx.strokeStyle='#55b18a';ctx.lineWidth=6;ctx.stroke();
 }
 const tip=T.sampleAt(g.trace,state.progress);circle(tip.x,tip.y,9,'#6df7b3');
 ctx.restore();text('노란 점을 따라 그려요',W/2,20,17);
}
function bridge(g){
 bg('#1a4048');const path=g.map.path,w=g.map.width,coords=path.map(n=>({x:n%w,y:Math.floor(n/w)}));
 const xmin=Math.min(...coords.map(a=>a.x)),xmax=Math.max(...coords.map(a=>a.x)),
 ymin=Math.min(...coords.map(a=>a.y)),ymax=Math.max(...coords.map(a=>a.y));
 const tile=Math.min(47,440/(xmax-xmin+2),230/(ymax-ymin+2)),left=(W-(xmax-xmin+1)*tile)/2,top=(H-(ymax-ymin+1)*tile)/2+15;
 const route=new Set(path),current=path[g.step];for(let y=ymin-1;y<=ymax+1;y++)for(let x=xmin-1;x<=xmax+1;x++){
    const cell=y*w+x,px=left+(x-xmin)*tile,py=top+(y-ymin)*tile;
    const onRoute=route.has(cell),at=cell===current;
    rect(px+1,py+1,tile-3,tile-3,g.phase==='preview'&&onRoute?'#a9ffc4':at?'#f8ce90':'#49656a',4);
    if(at)circle(px+tile/2,py+tile/2,Math.min(10,tile*.22),'#27614e');
 }
 text(g.phase==='preview'?'초록색 길을 기억하세요!':'방향 버튼으로 이동하세요',W/2,21,21);
}
function redlight(g){
 bg('#183d46');const b=g.body,signal=b.signal,color=signal==='green'?'#9effc7':signal==='warning'?'#ffe1a2':'#ff9aab';
 rect(0,H*.76,W,H*.24,'#3d644b');rect(25,23,330,70,'#0c2833',10);
 text(signal==='green'?'움직여!':signal==='warning'?'멈출 준비!':'멈춰!',192,58,38,color);
 rect(W*.83,55,56,152,'#152932',12);
 for(let i=0;i<3;i++)circle(W*.83+28,78+i*48,17,
  i===0&&signal==='red'?'#ff758e':i===1&&signal==='warning'?'#ffe09c':i===2&&signal==='green'?'#83ffb1':'#34534c');
 rect(W*.83+25,205,6,H*.76-205,'#bcd7c3');
 const x=27+b.progress/100*(W-110);circle(x,H*.76-65,22,'#f1c8a1');rect(x-21,H*.76-45,42,46,'#82e2ad',6);
 rect(W-54,H*.76-140,5,140,'#efebcf');text(Math.round(b.progress)+'%',W*.25,H-25,22,'#e6f8d9');
}
function tug(g){
 bg('#463b35');const b=g.body,marker=b.elapsed%1000/1000;
 text('초록 구간에서 줄을 당기세요!',W/2,30,22,'#ffe8c0');
 rect(45,69,430,34,'#dd9e85',8);rect(45+430*.40,69,430*.2,34,'#8ff7b9',3);
 rect(45+430*marker-5,59,10,55,'#fffbea',3);
 rect(0,H*.78,W,H*.22,'#4e6550');
 ctx.beginPath();ctx.moveTo(32,H*.6);ctx.lineTo(490,H*.6);ctx.strokeStyle='#e0b88e';ctx.lineWidth=16;ctx.stroke();
 rect(250+b.rope*1.6,H*.6-27,9,56,'#f6a58a',3);
 text('줄 우세 '+Math.round(b.rope)+'% · 피로 '+Math.round(b.fatigue)+'%',W/2,H-28,19);
}
function marble(g){
 bg('#533c33');const q=g.body.questions[g.body.questionIndex];if(!q)return;
 rect(25,18,W-50,53,'#efcea3',8);text(q.prompt,W/2,45,23,'#463329');
 for(const [i,n] of [q.left,q.right].entries()){
   const x=i===0?143:378;circle(x,200,99,i===0?'#815250':'#435f88');
   for(let j=0;j<n;j++)circle(x+(j%4-1.5)*29,183+(Math.floor(j/4)-1)*34,12,
    ['#ffe1aa','#a8efdd','#ffd2d7','#acc8ff'][j%4]);
   text(i===0?'왼쪽':'오른쪽',x,H-26,21);
 }
}
function final(g){
 bg('#2b3e39');const b=g.body,part=b.part;
 const titles=['기억','타이밍','계산'],section=part==='preview'||part==='memory'?0:part==='timing'?1:2;
 for(let i=0;i<3;i++){rect(35+i*158,22,136,34,i===section?'#a8f7c9':'#31564c',5);
   text(titles[i],103+i*158,39,16,i===section?'#173c2a':'#d8eedd');}
 if(part==='preview'||part==='memory'){
  text(part==='preview'?'모양 4개를 기억하세요':'기억한 순서대로 터치!',W/2,96,23);
  for(let j=0;j<4;j++){rect(36+j*117,134,102,111,'#427665',9);
    text(part==='preview'||j<b.entered?b.sequence[j]:'?',87+j*117,191,48);}
  text((part==='preview'?'암기 시간':b.entered+'/4 입력 완료'),W/2,H-25,17);
 }else if(part==='timing'){
  text('초록색일 때 두 번 누르세요!',W/2,99,22);
  rect(57,151,406,34,'#b1897e',6);rect(57+406*.76,151,406*.24,34,'#8af8b9',5);
  rect(57+M.timingPosition(b)*406-5,141,10,53,'#fffce4',3);
  text('성공 '+b.timingHits+'/2 · 실수 '+b.timingMisses+'/3',W/2,264,20);
 }else{text('마지막 덧셈 문제',W/2,110,25,'#ffe5a8');text(b.math.prompt,W/2,199,57);}
}
function overtime(g){bg('#3a453c');text('FINAL TIEBREAK',W/2,88,23,'#ffd9a7');text(g.question.prompt,W/2,180,63);text('아래에서 답을 선택하세요',W/2,270,19);}
function draw(){
 const c=el.board,box=c.getBoundingClientRect();if(box.width<2||box.height<2)return;
 const dpr=Math.min(2,window.devicePixelRatio||1),width=Math.round(box.width*dpr),height=Math.round(box.height*dpr);
 if(c.width!==width||c.height!==height){c.width=width;c.height=height;}
 const scale=Math.min(width/W,height/H),ox=(width-W*scale)/2,oy=(height-H*scale)/2;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#07171b';ctx.fillRect(0,0,width,height);
 ctx.setTransform(scale,0,0,scale,ox,oy);
 const g=state.game;
 if(state.phase!=='playing'||!g){bg();text('다음 도전을 준비합니다',W/2,H/2,27);return;}
 if(g.id==='dalgona')trace(g);
 else if(g.id==='bridge')bridge(g);
 else if(g.id==='redlight')redlight(g);
 else if(g.id==='tug')tug(g);
 else if(g.id==='marbles')marble(g);
 else if(g.id==='final')final(g);
 else overtime(g);
}
function pointerCoords(event){
 const box=el.board.getBoundingClientRect(),k=Math.min(box.width/W,box.height/H);
 const x=(event.clientX-box.left-(box.width-W*k)/2)/k;
 const y=(event.clientY-box.top-(box.height-H*k)/2)/k;
 return {x:(x-TRACE_X)/TRACE_SCALE,y:(y-TRACE_Y)/TRACE_SCALE,vx:x,vy:y};
}
el.board.addEventListener('pointerdown',event=>{
 if(state.phase!=='playing'||pointId!==null)return;
 const g=state.game,p=pointerCoords(event);
 if(g.id==='dalgona'){pointId=event.pointerId;el.board.setPointerCapture?.(event.pointerId);send('trace-start',{x:p.x,y:p.y});}
 else if(g.id==='marbles')send('choose',p.vx<W/2?'left':'right');
 else if(g.id==='tug'||g.id==='final'&&g.body.part==='timing')send('tap');
 else if(g.id==='redlight'){pointId=event.pointerId;el.board.setPointerCapture?.(event.pointerId);holding=true;send('hold',true);}
 event.preventDefault();
});
el.board.addEventListener('pointermove',event=>{
 if(state.phase!=='playing'||state.game.id!=='dalgona'||pointId!==event.pointerId)return;
 const p=pointerCoords(event);send('trace-move',{x:p.x,y:p.y});event.preventDefault();
});
function pointerRelease(event){if(pointId!==event.pointerId)return;
 if(state.phase==='playing'&&state.game.id==='dalgona')send('trace-end');
 if(holding)send('hold',false);
 pointId=null;holding=false;
}
for(const e of ['pointerup','pointercancel','lostpointercapture'])el.board.addEventListener(e,pointerRelease);
el.controls.addEventListener('pointerdown',event=>{
 const b=event.target.closest('button[data-action]');if(!b||state.phase!=='playing')return;
 if(b.dataset.action==='hold'){holding=true;b.setPointerCapture?.(event.pointerId);send('hold',true);}
 else send(b.dataset.action,b.dataset.value);
 b.classList.add('down');event.preventDefault();
});
function buttonRelease(event){
 const b=event.target.closest?.('button[data-action]');if(!b)return;
 if(b.dataset.action==='hold'&&holding){send('hold',false);holding=false;}
 b.classList.remove('down');
}
for(const e of ['pointerup','pointercancel','lostpointercapture'])el.controls.addEventListener(e,buttonRelease);
el.controls.addEventListener('click',event=>{
 if(event.detail!==0)return;
 const b=event.target.closest('button[data-action]');if(!b)return;
 send(b.dataset.action,b.dataset.value);
 if(b.dataset.action==='hold')send('hold',false);
});
const pressed=new Set();
const arrow={KeyW:'up',KeyA:'left',KeyS:'down',KeyD:'right',ArrowUp:'up',ArrowLeft:'left',ArrowDown:'down',ArrowRight:'right'};
document.addEventListener('keydown',event=>{
 const key=event.code;
 if(state.phase!=='playing')return;
 if(!/^(Arrow(Up|Down|Left|Right)|Key[A-Z]|Space|Enter|Digit[1-4]|Numpad[1-4])$/.test(key))return;
 event.preventDefault();if(pressed.has(key)||event.repeat)return;pressed.add(key);
 const g=state.game;
 if(g.id==='bridge'&&arrow[key])send('step',arrow[key]);
 if(g.id==='redlight'&&(key==='Space'||key==='Enter'))send('hold',true);
 if(g.id==='tug'&&(key==='Space'||key==='Enter'))send('tap');
 if(g.id==='marbles'&&['KeyA','ArrowLeft'].includes(key))send('choose','left');
 if(g.id==='marbles'&&['KeyD','ArrowRight'].includes(key))send('choose','right');
 if(g.id==='final'&&g.body?.part==='timing'&&(key==='Space'||key==='Enter'))send('tap');
 const digit=/^(Digit|Numpad)[1-4]$/.test(key)?Number(key.slice(-1))-1:
  ({KeyQ:0,KeyW:1,KeyE:2,KeyR:3})[key];
 if(g.id==='final'&&g.body?.part==='memory'&&digit!==undefined)send('symbol',M.SYMBOLS[digit]);
 if((g.id==='final'&&g.body?.part==='math'||g.id==='overtime')&&digit!==undefined&&digit<3){
   const opts=g.id==='overtime'?g.question.options:g.body.math.options;
   send('answer',opts[digit]);
 }
});
document.addEventListener('keyup',event=>{
 if(!pressed.delete(event.code))return;
 if(state.phase==='playing'&&state.game?.id==='redlight'&&['Space','Enter'].includes(event.code))send('hold',false);
});
function frame(t){
 requestAnimationFrame(frame);pauseCheck();if(document.hidden)return;
 const now=clock();
 if(countdown!==null){
   if(now>=countdown){
     countdown=null;el.button.disabled=false;
     state=E.ready(state,now);el.dialog.hidden=true;pointId=null;holding=false;pressed.clear();controlsHTML='';
   }else{el.button.textContent='게임 시작까지 '+Math.ceil((countdown-now)/1000)+'초';}
 }
 const previous=state.phase;
 if(previous==='playing')state=E.tick(state,now);
 if(previous==='playing'&&state.phase!=='playing'){release();drawDialog();}
 if(t-lastPaint>=30){lastPaint=t;draw();}
 if(t-lastUi>=95){lastUi=t;renderHUD();}
}
drawDialog();renderHUD();requestAnimationFrame(frame);
})();
