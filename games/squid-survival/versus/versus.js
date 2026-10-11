(() => {
'use strict';
const E=window.SquidVersusRules,T=window.DalgonaTrace,M=window.SquidMiniRules,$=id=>document.getElementById(id);
const W=520,H=320,SCALE=.72,OFFX=(W-400*SCALE)/2,OFFY=(H-400*SCALE)/2;
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const el={dialog:$('dialog'),title:$('dialogTitle'),lead:$('dialogLead'),eyebrow:$('dialogEyebrow'),
 button:$('dialogButton'),rules:$('dialogRules'),chips:$('resultChips'),chip:[$('result0'),$('result1')],
 round:$('roundTitle'),timer:$('time'),track:$('roundTrack'),scores:[$('score0'),$('score1')],
 boards:[$('board0'),$('board1')],control:[$('controls0'),$('controls1')],
 status:[$('status0'),$('status1')],detail:[$('detail0'),$('detail1')],
 meter:[$('meter0'),$('meter1')],laneOverlay:[$('laneOverlay0'),$('laneOverlay1')],
 instruction:$('instruction'),keyHint:$('keyHint'),rotate:$('rotate')};
const ctx=el.boards.map(c=>c.getContext('2d'));
let state=E.initial((Math.random()*0xffffffff)>>>0);
let countdownUntil=null,lastPaint=0,lastUi=0,pausingAt=null,pausedTotal=0,recorded=false;
const keys=new Set(),finger=[null,null];
const seedKey=E.saveKey,history=(()=>{try{
 const d=JSON.parse(localStorage.getItem(seedKey)||'{}');return{matches:Math.max(0,Number(d.matches)||0),wins:[Math.max(0,Number(d.wins?.[0])||0),Math.max(0,Number(d.wins?.[1])||0)]};
}catch(_){return{matches:0,wins:[0,0]};}})();
const sdk=(name,value)=>{try{window.KidscadeGame?.[name]?.(value);}catch(_){}};
function portrait(){return window.innerWidth<800&&window.innerHeight>window.innerWidth&&
 (typeof window.matchMedia!=='function'||window.matchMedia('(pointer:coarse)').matches);}
function paused(){return document.hidden||portrait();}
function updatePause(){
 const real=Date.now(),want=paused();
 if(want&&pausingAt===null)pausingAt=real;
 if(!want&&pausingAt!==null){pausedTotal+=real-pausingAt;pausingAt=null;}
 el.rotate.hidden=!portrait();
 if(want){for(let p=0;p<2;p++)releaseAll(p);}
}
function now(){return Date.now()-pausedTotal-(pausingAt!==null?Date.now()-pausingAt:0);}
function save(){try{localStorage.setItem(seedKey,JSON.stringify(history));}catch(_){}}
function clearFinger(id){finger[id]=null;}
function send(id,action,value){
 if(paused()||countdownUntil!==null)return;
 const previous=state.phase;
 state=E.input(state,id,action,value,now());
 if(previous!=='summary'&&state.phase==='summary')showDialog();
 if(previous!=='finished'&&state.phase==='finished'){maybeFinish();showDialog();}
}
function releaseAll(id){
 if(paused()){
   const p=state.round?.players[id];
   if(p?.body&&state.round?.id==='redlight')p.body.held=false;
   if(p?.traceState){p.traceState.active=false;p.hold=false;p.assist=0;}
   clearFinger(id);return;
 }
 if(state.phase==='playing'&&state.round){
  const mode=state.round.id,at=now();
  if(mode==='redlight')state=E.input(state,id,'hold',false,at);
  if(mode==='dalgona'){
    if(finger[id]!==null)state=E.input(state,id,'trace-end',null,at);
    if(state.round.players[id]?.hold)state=E.input(state,id,'hold',false,at);
  }
 }
 clearFinger(id);
}
function pressControl(player,action,value){
 if(state.phase==='tiebreak'){if(action==='answer')send(player,'answer',value);return;}
 if(state.phase!=='playing'||!state.round)return;
 const mode=state.round.id,part=state.round.players[player].body?.part;
 if(action==='hold')send(player,'hold',true);
 if(action==='step')send(player,'step',value);
 if(action==='choose')send(player,'choose',value);
 if(action==='tap')send(player,'tap');
 if(action==='symbol'&&part==='memory')send(player,'symbol',value);
 if(action==='answer'&&part==='math')send(player,'answer',value);
 if(action==='assist'){send(player,'assist',value);send(player,'hold',true);}
}
function clearHeldControl(player,action){
 if(action==='hold')send(player,'hold',false);
 if(action==='assist'){send(player,'hold',false);send(player,'assist',0);}
}
function htmlControls(id){
 if(state.phase==='tiebreak'){
   return state.tie.question.options.map(n=>'<button data-action="answer" data-value="'+n+'">'+n+'</button>').join('');
 }
 if(state.phase!=='playing'||!state.round)return '<span class="control-copy">경기를 준비해 주세요</span>';
 const mode=state.round.id,p=state.round.players[id];
 if(mode==='dalgona')return '<button data-action="assist" data-value="-1" class="primary-control">천천히</button><button data-action="assist" data-value="1" class="primary-control">빠르게</button>';
 if(mode==='bridge')return [['up','↑'],['left','←'],['down','↓'],['right','→']].map(([v,t])=>'<button class="direction" data-action="step" data-value="'+v+'">'+t+'</button>').join('');
 if(mode==='redlight')return '<button class="primary-control" data-action="hold">꾹 누르고 달리기</button>';
 if(mode==='tug')return '<button class="primary-control" data-action="tap">지금 당기기!</button>';
 if(mode==='marbles')return '<button data-action="choose" data-value="left">왼쪽</button><button data-action="choose" data-value="right">오른쪽</button>';
 if(mode==='final'){
   const b=p.body;
   if(b.part==='preview')return '<span class="control-copy">모양 4개를 기억하세요</span>';
   if(b.part==='memory')return M.SYMBOLS.map(x=>'<button data-action="symbol" data-value="'+x+'">'+x+'</button>').join('');
   if(b.part==='timing')return '<button class="primary-control" data-action="tap">초록 구간에 맞춰 누르기!</button>';
   return b.math.options.map(x=>'<button data-action="answer" data-value="'+x+'">'+x+'</button>').join('');
 }
 return '';
}
const controlKeys=['',''];
function updateControls(){
 for(let id=0;id<2;id++){
   const html=htmlControls(id);
   if(html!==controlKeys[id]){controlKeys[id]=html;el.control[id].innerHTML=html;}
 }
}
function renderHud(){
 el.scores.forEach((e,i)=>e.textContent=String(state.totals[i]));
 for(let i=0;i<6;i++){
   const dot=el.track.children[i];
   if(!dot)continue;
   dot.classList.toggle('lit',i===state.index);
   dot.classList.toggle('done',i<state.results.length);
 }
 if(state.phase==='playing'&&state.round){
   const r=state.round;
   el.round.textContent=(state.index+1)+' / 6 · '+r.title;
   el.timer.textContent=clockText(r.limit-r.elapsed);
   el.timer.parentElement.classList.toggle('urgent',r.limit-r.elapsed<=10000);
   for(let i=0;i<2;i++){
     const p=r.players[i],score=E.progressOf(r,p);
     el.meter[i].style.width=(Math.max(0,Math.min(1,score))*100).toFixed(1)+'%';
     el.status[i].textContent=p.done?(p.clear?'완료':'실패'):r.phase==='preview'?'기억 중':'진행 중';
     let desc='';
     if(r.id==='dalgona')desc='완성 '+Math.round(score*100)+'% · 금 '+Math.round(p.traceState.crack)+'%';
     else if(r.id==='bridge')desc='정답 '+p.bridgeStep+' / '+(r.map.path.length-1);
     else if(r.id==='redlight')desc=r.players[i].body.signal==='green'?'초록불 · 이동':'멈춰야 해요!';
     else if(r.id==='tug')desc='우리 쪽 줄 위치 '+Math.round(score*100)+'% · 피로 '+Math.round(p.body.fatigue)+'%';
     else if(r.id==='marbles')desc='정답 '+p.body.correct+'/5 · 실수 '+p.body.misses;
     else desc='결승 과제: '+p.body.part;
     el.detail[i].textContent=desc;
     el.laneOverlay[i].hidden=!p.done;
     if(p.done)el.laneOverlay[i].textContent=p.clear?'통과!':p.reason;
   }
   el.keyHint.textContent=({
     dalgona:'PC: 1P F + A(천천히)/D(빠르게) · 2P Enter + ←/→',
     bridge:'PC: 1P WASD · 2P 방향키',
     redlight:'PC: 1P Space · 2P Enter · 꾹 누르기',
     tug:'PC: 1P Space · 2P Enter · 타이밍에 누르기',
     marbles:'PC: 1P A/D · 2P ←/→',
     final:'PC: 기억 QWER / UIOP · 타이밍 Space / Enter · 계산 1~3 / 7~9'
   })[r.id];
   el.instruction.textContent=({
     dalgona:'각자 노란 출발점을 눌러 선을 따라 긁으세요. 너무 빠르거나 느리면 실패!',
     bridge:r.phase==='preview'?'같은 정답 길을 5초 동안 외우세요.':'발판을 기억해서 ↑↓←→로 순서대로 건너세요.',
     redlight:'같은 신호! 초록불에는 버튼을 누르고 노란불에 손을 떼세요.',
     tug:'하나의 줄을 서로 반대로 당겨요! 초록 타이밍에 당기고 연타는 피하세요.',
     marbles:'각자 문제 조건에 맞는 왼쪽/오른쪽 주머니를 선택하세요.',
     final:'기억한 모양 4개 → 초록 타이밍 2회 → 덧셈 문제의 순서입니다.'
   })[r.id];
 }else if(state.phase==='tiebreak'){
   el.round.textContent='연장 대결 · 수학 퀴즈';
   el.timer.textContent=clockText(state.tie.endsAt-now());
   el.timer.parentElement.classList.toggle('urgent',state.tie.endsAt-now()<5000);
   for(let i=0;i<2;i++){
     el.status[i].textContent=state.tie.answers[i]===null?'선택 대기':'선택 완료';
     el.detail[i].textContent='먼저 정확히 맞히면 최종 우승';
     el.meter[i].style.width=state.tie.answers[i]===null?'0%':'100%';
     el.laneOverlay[i].hidden=true;
   }
   el.instruction.textContent='동점! 같은 덧셈 문제를 풀어 승부를 가립니다.';
 }
 updateControls();
}
function clockText(ms){const sec=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function showDialog(){
 el.dialog.hidden=false;
 el.button.disabled=false;
 countdownUntil=null;
 el.chips.hidden=state.phase==='lobby'||state.phase==='intro';
 el.chip[0].textContent=state.totals[0]+'점';el.chip[1].textContent=state.totals[1]+'점';
 if(state.phase==='lobby'){
   el.eyebrow.textContent='LOCAL 2 PLAYERS';el.title.textContent='꼴뚜기 2인 대전';
   el.lead.textContent='같은 화면에서 두 사람이 동시에 여섯 게임을 겨뤄요. 각 게임 승리 1점, 무승부는 0.5점입니다. 마지막에 동점이면 연장 문제로 결승을 가려요.';
   el.button.textContent='두 사람 모두 준비됐어요 →';el.rules.hidden=false;
 }else if(state.phase==='intro'){
   const r=E.ROUNDS[state.index];
   el.eyebrow.textContent='ROUND '+String(state.index+1).padStart(2,'0')+' / 06';
   el.title.textContent=r.title;
   const ruleText={
     dalgona:'양쪽 달고나의 선을 따라 그리세요. 너무 빠르거나 느려도 깨져요.',
     bridge:'같은 정답 길을 5초 동안 외운 뒤 각자 화살표로 건너세요.',
     redlight:'양쪽 모두 같은 신호를 보고 달립니다. 노란불에 손을 떼야 해요.',
     tug:'한 개의 줄을 양쪽에서 당겨요. 초록색 바늘에 맞춰 반대편 선수를 밀어내세요.',
     marbles:'같은 조건의 구슬 문제 다섯 개. 각자 왼쪽과 오른쪽을 고르세요.',
     final:'모양의 순서를 외우고 → 타이밍 → 계산 문제까지 통과하세요.'
   };
   el.lead.textContent=ruleText[r.id];
   el.button.textContent='3초 뒤 시작하기 →';el.rules.hidden=false;
 }else if(state.phase==='summary'){
   const r=state.results.at(-1),name=r.winner===null?'무승부!':(r.winner+1)+'P 승리!';
   el.eyebrow.textContent='ROUND '+String(r.index+1).padStart(2,'0')+' RESULT';
   el.title.textContent=name;
   el.lead.textContent=r.winner===null?'두 선수가 같은 결과를 기록해 각각 0.5점을 얻었어요.':
     (r.winner+1)+'P가 이 라운드를 가져갔어요! 승점 1점을 획득했습니다.';
   el.rules.hidden=true;el.button.textContent=r.index===5?'최종 결과 확인 →':'다음 라운드 →';
 }else if(state.phase==='finished'){
   el.eyebrow.textContent='TOURNAMENT FINISHED';el.title.textContent=(state.champion+1)+'P 최종 우승!';
   el.lead.textContent='여섯 라운드와 필요한 연장전까지 마쳤어요. 다시 도전하면 새로운 대회를 시작할 수 있어요.';
   el.rules.hidden=true;el.button.textContent='새 대회 시작 ↻';
 }else if(state.phase==='tiebreak'){
   el.eyebrow.textContent='SUDDEN DEATH';
   el.title.textContent='최종 동점! 연장전';
   el.lead.textContent='두 선수의 점수가 같아요. 같은 덧셈 문제를 빠르고 정확하게 골라주세요. 거의 동시에 정답을 고르면 다시 문제를 출제해요.';
   el.rules.hidden=true;el.button.textContent='연장전 시작 →';
 }
}
function onDialog(){
 if(state.phase==='lobby'){
   state=E.start(state);sdk('start',{mode:'local-versus',players:2,rounds:6});showDialog();return;
 }
 if(state.phase==='intro'){
   if(paused())return;
   countdownUntil=now()+2500;el.button.disabled=true;
 }else if(state.phase==='summary'){
   state=E.next(state,now());if(state.phase==='finished')maybeFinish();showDialog();
 }else if(state.phase==='finished'){
   state=E.start(state);recorded=false;showDialog();
 }else if(state.phase==='tiebreak'){
   // Give both players the full tie-break window after they read the instructions.
   state.tie=E.makeTie(state.seed,state.rematch,now());
   el.dialog.hidden=true;renderHud();
 }
}
function maybeFinish(){
 if(state.phase!=='finished'||recorded)return;
 recorded=true;history.matches++;history.wins[state.champion]++;save();
 sdk('score',Math.max(...state.totals));
 sdk('result',{scope:'run',status:'completed',outcome:'win',mode:'local-versus',
   playerCount:2,winner:state.champion+1,totals:state.totals,score:Math.max(...state.totals)});
}
function rounded(x,y,w,h,fill,r=0){const c=activeContext;c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
let activeContext=null;
function label(str,x,y,size=19,color='#e8f8e6'){
 const c=activeContext;c.font='900 '+size+'px system-ui';c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(str,x,y);
}
function dot(x,y,r,fill){const c=activeContext;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();}
function boardBackground(id){
 const c=activeContext,g=c.createLinearGradient(0,0,W,H);
 g.addColorStop(0,id===0?'#174b40':'#61452e');g.addColorStop(1,id===0?'#102c2d':'#251e23');
 c.fillStyle=g;c.fillRect(0,0,W,H);
 for(let x=0;x<W;x+=32)rounded(x,0,1,H,'#ffffff0a');
}
function drawDalgona(r,p){
 const c=activeContext,s=p.traceState,t=r.trace;
 c.save();c.translate(OFFX,OFFY);c.scale(SCALE,SCALE);
 dot(200,205,169,'#c9945d');dot(198,201,160,'#e9ba7b');dot(188,184,142,'#ebbf84');
 c.beginPath();c.moveTo(t.path[0].x,t.path[0].y);
 for(const point of t.path.slice(1))c.lineTo(point.x,point.y);
 c.strokeStyle='#84532e';c.lineWidth=11;c.lineJoin='round';c.stroke();
 c.strokeStyle='#ffe3ab';c.lineWidth=5;c.stroke();
 if(s.progress>0){
   c.beginPath();const n=Math.max(1,Math.floor(s.progress/2.5));
   c.moveTo(t.path[0].x,t.path[0].y);
   for(let i=1;i<=n&&i<t.path.length;i++)c.lineTo(t.path[i].x,t.path[i].y);
   c.strokeStyle=p.id===0?'#357b61':'#b76f36';c.lineWidth=7;c.stroke();
 }
 const tip=T.sampleAt(t,s.progress);dot(tip.x,tip.y,11,p.id===0?'#aaffc7':'#ffdb9b');
 c.restore();label('노란 점에서 따라 그리기',W/2,21,15);
 if(s.crack>4)label('금 '+Math.round(s.crack)+'%  ·  굳기 '+Math.round(s.stuck)+'%',W/2,H-16,14,'#ffe0ba');
}
function drawBridge(r,p){
 const c=activeContext,map=r.map,cw=44,ch=44,gap=3,ox=(W-map.width*cw)/2,oy=(H-map.height*ch)/2+5;
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
   const cell=y*map.width+x,correct=map.path.includes(cell);
   const active=map.path[p.bridgeStep]===cell;
   const seen=r.phase==='preview'&&correct;
   rounded(ox+x*cw,oy+y*ch,cw-gap,ch-gap,seen?'#9effb8':active?'#ffd18c':'#4d6567',4);
   if(active)label('●',ox+x*cw+cw*.46,oy+y*ch+ch*.44,22,'#1d4039');
 }
 label(r.phase==='preview'?'정답 길을 기억하세요!':'방향키로 순서대로 이동',W/2,21,20,r.phase==='preview'?'#b2ffce':'#f3eccf');
}
function drawRedlight(r,p){
 const b=p.body,c=activeContext;
 const col=b.signal==='green'?'#97ffbb':b.signal==='warning'?'#ffdf8b':'#ff8794';
 rounded(14,12,W-28,64,'#081d23bb',8);
 label(b.signal==='green'?'움직여!':b.signal==='warning'?'손을 떼요!':'멈춰!',W/2,46,29,col);
 const floor=H*.84;
 rounded(0,floor,W,H-floor,'#426249');
 rounded(W*.86,floor-120,6,128,'#d6e9c6');
 for(let i=0;i<3;i++)dot(W*.86+25,48+i*38,16,i===0&&b.signal==='red'?'#ff7d8a':i===1&&b.signal==='warning'?'#ffd26f':i===2&&b.signal==='green'?'#81ffa6':'#203e38');
 const x=35+(W-115)*b.progress/100;
 dot(x,floor-66,22,'#edc5a3');rounded(x-20,floor-44,40,42,p.id===0?'#6bc59d':'#e6a36e',9);rounded(x-14,floor-8,8,12,'#d7d7b6',3);rounded(x+6,floor-8,8,12,'#d7d7b6',3);
 label(Math.round(b.progress)+'m / 100m',W*.26,H-24,19);
}
function drawTug(r,p){
 const b=p.body,c=activeContext,barW=380,pos=b.elapsed%1000/1000;
 label('초록 범위에서 당기세요!',W/2,24,19);
 rounded(70,60,barW,35,'#cc9376',8);rounded(70+barW*.4,60,barW*.2,35,'#9cffbb',6);
 rounded(70+pos*barW-5,52,10,52,'#fff6d5',3);
 rounded(0,H*.74,W,H*.26,'#385a49');
 c.beginPath();c.moveTo(48,H*.59);c.lineTo(472,H*.59);c.lineWidth=18;c.strokeStyle='#c9a26d';c.stroke();
 const amount=clamp(E.progressOf(r,p)*100,0,100);
 rounded(W*.5-5+r.tug.offset*(p.id===0?1:-1)*1.7,H*.59-27,10,54,'#ff9f82',4);
 label('줄 우세 '+Math.round(amount)+'%  피로 '+Math.round(b.fatigue)+'%',W/2,H*.89,20);
}
function drawMarbles(r,p){
 const b=p.body,q=b.questions[b.questionIndex];if(!q)return;
 rounded(15,15,W-30,H-30,'#604336',15);
 rounded(40,18,W-80,52,'#eed0a7',8);label(q.prompt,W/2,44,22,'#4a3024');
 for(const [i,num] of [q.left,q.right].entries()){
   const cx=i===0?138:382,cy=186;
   dot(cx,cy,93,i===0?'#684b55':'#395878');
   for(let j=0;j<num;j++){
     const ox=(j%4-1.5)*29,oy=(Math.floor(j/4)-1)*33;
     dot(cx+ox,cy+oy,12,['#ffc59d','#a9e4d9','#dfbedf','#adcbfc'][j%4]);
   }
   label(i?'오른쪽':'왼쪽',cx,H-29,18);
 }
}
function drawFinal(r,p){
 const b=p.body,phase=b.part;
 rounded(16,16,W-32,H-32,'#152c31',12);
 const levels=['기억','타이밍','계산'],phaseNo=phase==='preview'||phase==='memory'?0:phase==='timing'?1:2;
 for(let j=0;j<3;j++){
   rounded(35+j*156,28,140,32,j===phaseNo?'#bff0d2':'#35514a',5);
   label(levels[j],105+j*156,44,15,j===phaseNo?'#163628':'#dfebe3');
 }
 if(phase==='preview'||phase==='memory'){
   label(phase==='preview'?'모양 네 개를 기억하세요':'기억한 순서대로 누르세요',W/2,92,19);
   for(let j=0;j<4;j++){
     rounded(41+j*112,133,96,101,'#376354',9);
     label(phase==='preview'||j<b.entered?b.sequence[j]:'?',89+j*112,184,43);
   }
   label(b.entered+' / 4',W/2,H-23,16);
 }else if(phase==='timing'){
   label('초록 구간에 2번 맞히세요!',W/2,112,22);
   rounded(58,150,404,37,'#a87b74',8);rounded(58+404*.76,150,404*.24,37,'#85f9b9',6);
   rounded(58+M.timingPosition(b)*404-6,141,12,56,'#fffde5',3);
   label(b.timingHits+'/2 성공 · '+b.timingMisses+'/3 실수',W/2,243,20);
 }else{
   label('마지막 덧셈',W/2,120,25,'#ffe1a9');label(b.math.prompt,W/2,198,49);
 }
}
function drawTiebreak(id){rounded(20,30,W-40,H-60,'#173a37',12);label('SUDDEN DEATH',W/2,95,23,'#f7deb3');label(state.tie.question.prompt,W/2,193,56);label('숫자 버튼으로 정답 선택',W/2,268,16);}
function drawBoard(id,time){
 const c=ctx[id],canvas=el.boards[id];
 const dpr=Math.min(2,window.devicePixelRatio||1),rect=canvas.getBoundingClientRect();
 if(rect.width<2||rect.height<2)return;
 const px=Math.max(1,Math.round(rect.width*dpr)),py=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==px||canvas.height!==py){canvas.width=px;canvas.height=py;}
 // Keep geometric shapes truly circular on tall tablets and narrow phones.
 const scale=Math.min(px/W,py/H),ox=(px-W*scale)/2,oy=(py-H*scale)/2;
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#0c1d21';c.fillRect(0,0,px,py);
 c.setTransform(scale,0,0,scale,ox,oy);activeContext=c;
 boardBackground(id);
 if(state.phase==='tiebreak'){drawTiebreak(id);return;}
 if(state.phase!=='playing'||!state.round){label('READY',W/2,H/2,42,id===0?'#a4ffd0':'#ffdfa8');return;}
 const r=state.round,p=r.players[id];
 if(r.id==='dalgona')drawDalgona(r,p);
 if(r.id==='bridge')drawBridge(r,p);
 if(r.id==='redlight')drawRedlight(r,p);
 if(r.id==='tug')drawTug(r,p);
 if(r.id==='marbles')drawMarbles(r,p);
 if(r.id==='final')drawFinal(r,p);
}
function pointerPosition(canvas,event){
 const box=canvas.getBoundingClientRect();
 const scale=Math.min(box.width/W,box.height/H);
 const offX=(box.width-W*scale)/2,offY=(box.height-H*scale)/2;
 const x=(event.clientX-box.left-offX)/scale,y=(event.clientY-box.top-offY)/scale;
 return {x:(x-OFFX)/SCALE,y:(y-OFFY)/SCALE,vx:x,vy:y};
}
for(let id=0;id<2;id++){
 const canvas=el.boards[id],controls=el.control[id];
 canvas.addEventListener('pointerdown',ev=>{
   if(state.phase!=='playing'||paused()||countdownUntil!==null)return;
   const r=state.round,p=r.players[id];if(p.done||finger[id]!==null)return;
   const pt=pointerPosition(canvas,ev);
   if(r.id==='dalgona'){
     finger[id]=ev.pointerId;canvas.setPointerCapture?.(ev.pointerId);
     send(id,'trace-start',{x:pt.x,y:pt.y});
   }else if(r.id==='marbles')send(id,'choose',pt.vx<W/2?'left':'right');
   else if(r.id==='tug'||r.id==='final'&&p.body?.part==='timing')send(id,'tap');
   else if(r.id==='redlight'){finger[id]=ev.pointerId;canvas.setPointerCapture?.(ev.pointerId);send(id,'hold',true);}
   ev.preventDefault();
 });
 canvas.addEventListener('pointermove',ev=>{
   if(finger[id]!==ev.pointerId||state.round?.id!=='dalgona')return;
   const pt=pointerPosition(canvas,ev);send(id,'trace-move',{x:pt.x,y:pt.y});ev.preventDefault();
 });
 const release=ev=>{if(finger[id]!==ev.pointerId)return;
   if(state.round?.id==='dalgona')send(id,'trace-end');
   if(state.round?.id==='redlight')send(id,'hold',false);
   clearFinger(id);
 };
 for(const e of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(e,release);
 controls.addEventListener('pointerdown',ev=>{
   const btn=ev.target.closest('button[data-action]');if(!btn||btn.disabled)return;
   const action=btn.dataset.action,value=btn.dataset.value;
   if(action==='hold'||action==='assist')btn.setPointerCapture?.(ev.pointerId);
   pressControl(id,action,value);btn.classList.add('down');ev.preventDefault();
 });
 function releaseButton(ev){const btn=ev.target.closest?.('button[data-action]');if(!btn)return;
   clearHeldControl(id,btn.dataset.action);btn.classList.remove('down');}
 for(const e of ['pointerup','pointercancel','lostpointercapture'])controls.addEventListener(e,releaseButton);
 controls.addEventListener('click',ev=>{
   if(ev.detail!==0)return;const b=ev.target.closest('button[data-action]');if(!b)return;
   pressControl(id,b.dataset.action,b.dataset.value);if(b.dataset.action==='hold'||b.dataset.action==='assist')clearHeldControl(id,b.dataset.action);
 });
}
function keyboard(){
 const r=state.round,mode=r?.id;
 if(mode==='dalgona'){
   const p1=keys.has('KeyF'),p2=keys.has('Enter');
   for(const [id,pressed,slow,fast] of [[0,p1,'KeyA','KeyD'],[1,p2,'ArrowLeft','ArrowRight']]){
     if(pressed&&!r.players[id].hold){send(id,'hold',true);}
     if(!pressed&&r.players[id].hold)send(id,'hold',false);
     if(pressed){let assist=keys.has(slow)?-1:keys.has(fast)?1:1;send(id,'assist',assist);}
     else if(r.players[id].assist!==0)send(id,'assist',0);
   }
 }
}
const pressMap=(key)=>{
 if(state.phase==='tiebreak'){
   const map={'Digit1':[0,0],'Digit2':[0,1],'Digit3':[0,2],'Numpad1':[0,0],'Numpad2':[0,1],'Numpad3':[0,2],
     'Digit7':[1,0],'Digit8':[1,1],'Digit9':[1,2],'Numpad7':[1,0],'Numpad8':[1,1],'Numpad9':[1,2]};
   if(map[key]){const [id,idx]=map[key];send(id,'answer',state.tie.question.options[idx]);}return;
 }
 if(state.phase!=='playing'||!state.round)return;
 const r=state.round,mode=r.id;
 if(mode==='bridge'){
   const one={KeyW:'up',KeyA:'left',KeyS:'down',KeyD:'right'};
   const two={ArrowUp:'up',ArrowLeft:'left',ArrowDown:'down',ArrowRight:'right'};
   if(one[key])send(0,'step',one[key]);
   if(two[key])send(1,'step',two[key]);
 }else if(mode==='redlight'){
   if(key==='Space')send(0,'hold',true);
   if(key==='Enter')send(1,'hold',true);
 }else if(mode==='tug'){
   if(key==='Space')send(0,'tap');
   if(key==='Enter')send(1,'tap');
 }else if(mode==='marbles'){
   if(key==='KeyA')send(0,'choose','left');
   if(key==='KeyD')send(0,'choose','right');
   if(key==='ArrowLeft')send(1,'choose','left');
   if(key==='ArrowRight')send(1,'choose','right');
 }else if(mode==='final'){
   const a={KeyQ:0,KeyW:1,KeyE:2,KeyR:3},b={KeyU:0,KeyI:1,KeyO:2,KeyP:3};
   if(r.players[0].body?.part==='memory'&&a[key]!==undefined)send(0,'symbol',M.SYMBOLS[a[key]]);
   if(r.players[1].body?.part==='memory'&&b[key]!==undefined)send(1,'symbol',M.SYMBOLS[b[key]]);
   if(key==='Space')send(0,'tap');
   if(key==='Enter')send(1,'tap');
   const ma={Digit1:0,Digit2:1,Digit3:2},mb={Digit7:0,Digit8:1,Digit9:2,Numpad7:0,Numpad8:1,Numpad9:2};
   if(ma[key]!==undefined&&r.players[0].body.part==='math')send(0,'answer',r.players[0].body.math.options[ma[key]]);
   if(mb[key]!==undefined&&r.players[1].body.part==='math')send(1,'answer',r.players[1].body.math.options[mb[key]]);
 }
};
document.addEventListener('keydown',ev=>{
 const key=ev.code;
 if(!/^(Key[A-Z]|Arrow(Up|Down|Left|Right)|Space|Enter|Digit[0-9]|Numpad[0-9])$/.test(key))return;
 if(state.phase!=='playing'&&state.phase!=='tiebreak')return;
 ev.preventDefault();if(keys.has(key)||ev.repeat)return;keys.add(key);
 if(state.round?.id==='dalgona')keyboard();else pressMap(key);
});
document.addEventListener('keyup',ev=>{
 if(!keys.delete(ev.code))return;
 if(state.round?.id==='dalgona')keyboard();
 if(state.round?.id==='redlight'){
   if(ev.code==='Space')send(0,'hold',false);
   if(ev.code==='Enter')send(1,'hold',false);
 }
});
window.addEventListener('blur',()=>{keys.clear();releaseAll(0);releaseAll(1);});
window.addEventListener('resize',updatePause);document.addEventListener('visibilitychange',updatePause);
el.button.addEventListener('click',onDialog);
function frame(t){
 requestAnimationFrame(frame);updatePause();
 if(paused())return;
 const n=now();
 if(countdownUntil!==null){
   if(n>=countdownUntil){
     countdownUntil=null;state=E.launch(state,n);el.dialog.hidden=true;keys.clear();
   }else{
     el.button.textContent='시작까지 '+Math.ceil((countdownUntil-n)/1000)+'초';
   }
 }
 const before=state.phase;
 if(state.phase==='playing'||state.phase==='tiebreak')state=E.tick(state,n);
 if(before==='playing'&&state.phase==='summary'){showDialog();keys.clear();}
 if(before==='tiebreak'&&state.phase==='finished'){maybeFinish();showDialog();}
 if(t-lastPaint>=30){lastPaint=t;drawBoard(0,t);drawBoard(1,t);}
 if(t-lastUi>=75){lastUi=t;renderHud();}
}
updatePause();showDialog();renderHud();requestAnimationFrame(frame);
})();
