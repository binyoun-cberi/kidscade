(() => {
'use strict';
const rules=window.SquidMiniRules;
const script=document.currentScript;
const mode=script?.dataset?.mode;
if(!rules.MODES[mode])throw new Error('Unsupported survival mini game');
const standalone=!(new URLSearchParams(location.search).get('survival')==='1'&&window.parent!==window);
document.body.dataset.mode=mode;
document.body.dataset.survival=String(!standalone);
const $=id=>document.getElementById(id);
const ui={canvas:$('scene'),title:$('title'),hint:$('hint'),time:$('time'),sub:$('sub'),progress:$('progress'),
action:$('action'),choice:$('choices'),intro:$('intro'),result:$('result'),resultTitle:$('resultTitle'),resultText:$('resultText'),
start:$('start'),restart:$('restart'),help:$('help'),status:$('status'),top:$('modeTag'),best:$('best')};
const canvas=ui.canvas,ctx=canvas.getContext('2d');
const label=rules.MODES[mode];
let model=null,held=false,previousFrame=0,finished=false,canvasWidth=0,canvasHeight=0,choiceKey='';
const keys=Object.freeze({
  redlight:'kidscade_squid_mini_redlight_v1',
  tug:'kidscade_squid_mini_tug_v1',
  marbles:'kidscade_squid_mini_marbles_v1',
  final:'kidscade_squid_mini_final_v1'
});
const key=keys[mode];
let best=0;try{best=Math.max(0,Number(JSON.parse(localStorage.getItem(key)||'{}').best)||0);}catch(_){}
function statusLabel(){
 if(!model)return label.hint;
 if(model.status==='failed')return model.reason;
 if(model.status==='cleared')return '통과! 다음 게임으로 넘어가요.';
 if(mode==='redlight')return model.signal==='green'?'초록불! 버튼을 누르고 달리세요.':model.signal==='warning'?'곧 빨간불! 지금 손을 떼세요.':'빨간불! 멈춰 있어야 해요.';
 if(mode==='tug')return model.combo>1?'연속 성공 '+model.combo+'번!':'중앙 초록 구간을 지나갈 때 당기세요.';
 if(mode==='marbles')return model.questions[model.questionIndex]?.prompt||'구슬 승부 완료';
 if(model.part==='preview')return '모양이 나타나는 순서를 기억하세요.';
 if(model.part==='memory')return '기억한 모양을 순서대로 누르세요.';
 if(model.part==='timing')return '표시가 초록색 구간에 들어오면 두 번 터치하세요.';
 return model.math.prompt;
}
function timerText(ms){const n=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function sdk(name,data){try{window.KidscadeGame?.[name]?.(data);}catch(_){}}
function setHidden(el,hidden){el.hidden=hidden;}
function launch(){
 model=rules.create(mode,Math.floor(Math.random()*4294967295));
 rules.start(model,Date.now());
 finished=false;held=false;previousFrame=0;choiceKey='';
 setHidden(ui.intro,true);setHidden(ui.result,true);
 ui.title.textContent=label.name;ui.hint.textContent=label.hint;ui.best.textContent=best+'점';
 sdk('start',{mode});
 render();requestAnimationFrame(frame);
}
function complete(){
 if(!model||finished||model.status==='playing'||model.status==='ready')return;
 finished=true;held=false;
 ui.action.classList.remove('held');
 const win=model.status==='cleared';
 if(win&&standalone){best=Math.max(best,model.score);try{localStorage.setItem(key,JSON.stringify({best}));}catch(_){}}
 sdk('result',{scope:'stage',status:win?'completed':'failed',outcome:win?'clear':'loss',
   ...(standalone?{score:win?model.score:0}:{}),reason:model.reason,mode,round:mode});
 if(standalone){
   ui.resultTitle.textContent=win?'도전 성공!':'이번엔 탈락!';
   ui.resultText.textContent=win?'최종 점수 '+model.score+'점. 다음 서바이벌 라운드도 도전해 보세요.':model.reason;
   setHidden(ui.result,false);
 }
}
function update(now){
 if(!model||finished)return;
 rules.advance(model,now);
 if(model.status!=='playing')complete();
}
function choose(action,value){
 if(!model||finished)return;
 rules.act(model,action,value,Date.now());render();
 if(model.status!=='playing')complete();
}
function hold(value){
 if(mode!=='redlight'||!model||model.status!=='playing')return;
 held=value;ui.action.classList.toggle('held',held);choose('hold',held);
}
function fire(){
 if(!model||model.status!=='playing')return;
 if(mode==='tug')choose('pull');
 if(mode==='final'&&model.part==='timing')choose('hit');
}
function controls(){
 const s=model;
 let options=[];
 if(mode==='marbles'&&s.status==='playing'){
   options=[{value:'left',label:'왼쪽 주머니'},{value:'right',label:'오른쪽 주머니'}];
 }else if(mode==='final'&&s.part==='memory')options=rules.SYMBOLS.map(x=>({value:x,label:x}));
 else if(mode==='final'&&s.part==='math')options=s.math.options.map(x=>({value:x,label:String(x)}));
 const nextKey=s.status+'|'+s.part+'|'+s.questionIndex+'|'+options.map(o=>o.value).join(',');
 if(choiceKey!==nextKey){
   choiceKey=nextKey;
   ui.choice.innerHTML='';
   for(const option of options){
     const b=document.createElement('button');b.type='button';b.className='choice';b.textContent=option.label;
     const action=mode==='marbles'?'choose':s.part==='memory'?'symbol':'answer';
     b.addEventListener('click',()=>choose(action,option.value));
     ui.choice.appendChild(b);
   }
 }
 const actionVisible=mode==='redlight'||mode==='tug'||(mode==='final'&&s.part==='timing');
 ui.action.hidden=!actionVisible;
 if(mode==='redlight')ui.action.textContent=s.signal==='green'?'누르고 달리기':s.signal==='warning'?'지금 손 떼기!':'정지!';
 if(mode==='tug')ui.action.textContent='지금 줄 당기기!';
 if(mode==='final')ui.action.textContent='타이밍 맞춰 누르기';
 ui.action.disabled=mode==='redlight'&&s.signal==='red';
}
function render(){
 if(!model)return;
 ui.title.textContent=label.name;
 ui.sub.textContent=statusLabel();ui.time.textContent=timerText(model.limit-model.elapsed);
 ui.time.parentElement?.classList?.toggle('urgent',model.limit-model.elapsed<=10000);
 ui.status.textContent=model.status==='playing'?'도전 중':model.status==='cleared'?'성공':model.status==='failed'?'탈락':'준비';
 if(mode==='redlight')document.body.dataset.signal=model.signal;
 let progress=0,metric='';
 if(mode==='redlight'){progress=model.progress;metric='도착까지 '+Math.max(0,Math.round(100-model.progress))+'m';}
 if(mode==='tug'){progress=model.rope;metric='줄 밀기 '+Math.round(model.rope)+'% · 피로 '+Math.round(model.fatigue)+'%';}
 if(mode==='marbles'){progress=model.questionIndex/5*100;metric='맞힌 문제 '+model.correct+'/5 · 실수 '+model.misses+'/2';}
 if(mode==='final'){progress=model.part==='preview'?0:model.part==='memory'?model.entered*8:model.part==='timing'?35+model.timingHits*20:85;metric='최종 과제: '+({preview:'기억하기',memory:'순서 맞히기',timing:'타이밍',math:'계산'}[model.part]);}
 ui.progress.style.width=Math.max(0,Math.min(100,progress))+'%';
 ui.progress.parentElement?.setAttribute('aria-valuenow',String(Math.round(progress)));
 ui.top.textContent=metric;
 controls();
}
function rect(x,y,w,h,fill,r=0){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function text(message,x,y,size=20,color='#efffea',align='center'){
 ctx.font='900 '+size+'px system-ui';ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(message,x,y);
}
function disk(x,y,r,fill,stroke='#ffffff45',width=1){
 ctx.beginPath();ctx.arc(x,y,Math.max(1,r),0,2*Math.PI);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();
}
function ellipse(x,y,rx,ry,fill){
 ctx.beginPath();ctx.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,2*Math.PI);ctx.fillStyle=fill;ctx.fill();
}
function glow(x,y,r,color){
 const g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function character(x,y,size,shirt,now,run=false,flip=false){
 ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
 const step=run?Math.sin(now/100)*.19:0;
 ellipse(0,0,size*.22,size*.045,'#0007');
 ctx.lineWidth=Math.max(3,size*.06);ctx.lineCap='round';ctx.strokeStyle='#1d292a';ctx.beginPath();
 ctx.moveTo(-size*.07,-size*.32);ctx.lineTo(-size*(.11+step),0);ctx.moveTo(size*.07,-size*.32);ctx.lineTo(size*(.11+step),0);ctx.stroke();
 rect(-size*.17,-size*.64,size*.34,size*.34,shirt,size*.07);
 ctx.strokeStyle='#e8b693';ctx.lineWidth=Math.max(3,size*.07);ctx.beginPath();
 ctx.moveTo(-size*.14,-size*.57);ctx.lineTo(-size*(.27+step*.5),-size*.36);
 ctx.moveTo(size*.14,-size*.57);ctx.lineTo(size*(.27-step*.5),-size*.36);ctx.stroke();
 disk(0,-size*.77,size*.155,'#f1c9a8','#dcaa82',2);
 rect(-size*.14,-size*.88,size*.28,size*.06,'#253b37',size*.018);
 rect(-size*.073,-size*.57,size*.146,size*.13,'#ecf0d6',size*.025);
 text(flip?'2':'1',0,-size*.51,Math.max(8,size*.1),'#244e43');
 ctx.restore();
}
function stageBack(w,h,top,bottom){
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bottom);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 for(let i=0;i<12;i++)rect((i+.5)*w/12,0,1,h,'#effff008');
 glow(w*.45,h*.2,Math.max(w,h)*.54,'#9ef7cd14');
}
function stadium(w,h){
 rect(0,h*.54,w,h*.46,'#3d5c4d');
 for(let i=0;i<7;i++)rect(0,h*(.57+i*.04),w,1,'#d7e5bf22');
 for(let i=0;i<19;i++)rect(i*w/18,h*.48,w/23,4,i%2?'#bcebc866':'#e5d49a55');
}
function drawTraffic(s,now,w,h){
 stageBack(w,h,'#183c41','#0b1d28');stadium(w,h);
 const floor=h*.80,goalX=w*.85;
 rect(w*.04,h*.08,w*.66,Math.min(80,h*.23),'#0b2227e8',8);
 const signal=s.signal==='green'?'움직여!':s.signal==='warning'?'곧 빨간불!':'멈춰!';
 const tint=s.signal==='green'?'#97ffc2':s.signal==='warning'?'#ffe0a4':'#ff9da9';
 glow(w*.38,h*.18,w*.32,s.signal==='red'?'#ff5b7d44':'#adffd722');
 text(signal,w*.37,h*.18,Math.min(48,w*.085,h*.17),tint);
 rect(w*.05,h*.04,w*.69,8,'#34584d',4);
 rect(w*.05,h*.04,w*.69*s.progress/100,8,'#a6ffca',4);
 rect(goalX,floor-h*.20,5,h*.20,'#e9eaca',3);
 ctx.beginPath();ctx.moveTo(goalX+5,floor-h*.20);ctx.lineTo(goalX+45,floor-h*.17);ctx.lineTo(goalX+5,floor-h*.14);ctx.closePath();ctx.fillStyle='#ffe4a8';ctx.fill();
 const boxX=w*.79,boxY=h*.08,bw=Math.min(78,w*.14),bh=Math.min(175,h*.49);
 rect(boxX,boxY,bw,bh,'#0b1e23',14);rect(boxX+bw*.46,boxY+bh,bw*.08,floor-boxY-bh,'#334e4a',3);
 for(let i=0;i<3;i++){
  const on=(i===0&&s.signal==='red')||(i===1&&s.signal==='warning')||(i===2&&s.signal==='green');
  const c=['#ff6f88','#ffd177','#82f4b2'][i],cy=boxY+bh*(i+.5)/3;
  if(on)glow(boxX+bw/2,cy,bw*.6,c+'66');
  disk(boxX+bw/2,cy,Math.min(bw*.29,bh*.12),on?c:'#31514a','#ffffff25',2);
 }
 character(w*.09+w*.73*s.progress/100,floor,Math.min(123,h*.38),'#73cdae',now,s.held&&s.signal==='green');
 for(let i=0;i<7;i++)rect(w*.06+i*w*.12,floor+10,w*.045,3,'#e8efde66',1);
}
function drawTug(s,now,w,h){
 stageBack(w,h,'#443a3b','#1a2930');stadium(w,h);
 const y=h*.65,offset=(s.rope-29)*w*.0013,mid=w*.50;
 rect(mid-3,h*.38,6,h*.48,'#eacb9e',3);
 ctx.beginPath();ctx.moveTo(w*.17+offset,y);ctx.lineTo(w*.83+offset,y);ctx.strokeStyle='#c79765';ctx.lineWidth=Math.max(9,h*.04);ctx.lineCap='round';ctx.stroke();
 for(let i=0;i<13;i++){
  const x=w*.18+offset+i*w*.053;
  ctx.beginPath();ctx.moveTo(x-4,y-5);ctx.lineTo(x+5,y+6);ctx.lineWidth=2;ctx.strokeStyle='#ffe0a8bb';ctx.stroke();
 }
 for(let i=0;i<3;i++)character(w*(.22+i*.11)+offset,y+14,Math.min(100,h*.31),'#6fd5b3',now,true);
 for(let i=0;i<3;i++)character(w*(.66+i*.10)+offset,y+14,Math.min(100,h*.31),'#d98787',now,true,true);
 rect(mid+offset-4,y-34,8,54,'#fa777f',2);
 const barWidth=Math.min(w*.73,530),bx=(w-barWidth)/2,by=h*.13,needle=(s.elapsed%1000)/1000;
 rect(bx-8,by-8,barWidth+16,43,'#0c2328',8);
 rect(bx,by,barWidth,24,'#cd947c',5);rect(bx+barWidth*.40,by,barWidth*.20,24,'#91ffbd',4);
 rect(bx+barWidth*needle-4,by-12,8,48,'#fff8db',3);
 text('초록 구간에 맞춰 당겨!',w*.5,h*.068,Math.min(27,w*.052),'#fff1d9');
 rect(w*.15,h*.91,w*.7,9,'#5b3b40',5);
 rect(w*.15,h*.91,w*.7*s.rope/100,9,'#89f2b1',5);
 text('우리 팀  '+Math.round(s.rope)+'%',w*.24,h*.85,Math.min(16,w*.043),'#e1fce1');
 text('피로  '+Math.round(s.fatigue)+'%',w*.76,h*.85,Math.min(16,w*.043),s.fatigue>65?'#ffa3ac':'#f3dbb4');
}
function marble(x,y,r,color,variant){
 disk(x,y,r,color,'#ffffff80',1);disk(x-r*.29,y-r*.3,Math.max(1,r*.21),'#ffffffb9','transparent',0);
}
function drawMarbles(s,w,h){
 stageBack(w,h,'#67473e','#262332');
 const q=s.questions[s.questionIndex];if(!q)return;
 rect(w*.035,h*.06,w*.93,h*.88,'#51392f',14);
 for(let i=0;i<8;i++)rect(w*.05,h*(.13+i*.095),w*.9,1,'#d4ad7844');
 rect(w*.10,h*.08,w*.80,Math.max(41,h*.15),'#eed0aa',8);
 text(q.prompt,w*.5,h*.15,Math.min(26,w*.05,h*.085),'#48342a');
 for(const [i,count] of [q.left,q.right].entries()){
   const x=w*(i?.72:.28),radius=Math.min(w*.195,h*.30);
   ellipse(x,h*.64,radius*1.05,radius*.76,'#1a1d23a9');
   ellipse(x,h*.57,radius,radius*.73,i?'#42608b':'#865552');
   ellipse(x,h*.55,radius*.89,radius*.61,i?'#304b70':'#663d3a');
   const rr=Math.min(17,radius*.13),dx=radius*.37,dy=radius*.40;
   for(let j=0;j<count;j++){
     const px=x+(j%4-1.5)*dx,py=h*.52+(Math.floor(j/4)-1)*dy;
     marble(px,py,rr,['#ffd4a8','#adebd8','#f5b4c7','#b3c8ff'][(j+i*2)%4]);
   }
   rect(x-radius*.72,h*.81,radius*1.44,Math.max(26,h*.09),i?'#395880':'#855450',5);
   text(i?'오른쪽 선택':'왼쪽 선택',x,h*.81+Math.max(26,h*.09)/2,Math.min(20,w*.04,h*.07),'#fff4e6');
 }
 rect(w*.495,h*.34,w*.01,h*.53,'#ebd5b538',2);
}
function finalCard(symbol,x,y,w,h,lit=false){
 rect(x,y,w,h,lit?'#3d7052':'#203d3a',Math.min(10,w*.1));
 ctx.strokeStyle=lit?'#d0ffe5':'#77988d';ctx.lineWidth=2;ctx.strokeRect(x+3,y+3,w-6,h-6);
 text(symbol,x+w/2,y+h/2,Math.min(60,w*.6,h*.6),'#fff3cc');
}
function drawFinal(s,w,h){
 stageBack(w,h,'#31483c','#131c2e');
 rect(w*.04,h*.07,w*.92,h*.85,'#102a2d',10);
 const part=s.part,c=['preview','memory'].includes(part)?0:part==='timing'?1:2;
 const names=['기억력','타이밍','계산'];
 for(let i=0;i<3;i++){
   const cw=w*.24,x=w*(.11+i*.295),y=h*.125;
   rect(x,y,cw,Math.min(h*.115,34),i===c?'#b2f5cf':'#27443e',4);
   text((i+1)+' '+names[i],x+cw/2,y+Math.min(h*.115,34)/2,Math.min(16,w*.027),i===c?'#163829':'#d8eddf');
 }
 if(part==='preview'||part==='memory'){
   text(part==='preview'?'순서를 기억하세요!':'같은 순서로 입력하세요',w*.5,h*.37,Math.min(29,w*.05,h*.11));
   const cw=Math.min(w*.18,h*.27),ch=Math.min(h*.29,130),gap=Math.min(14,w*.022),left=(w-4*cw-3*gap)/2;
   for(let i=0;i<4;i++){
    const shown=part==='preview'||i<s.entered,lit=part==='memory'&&i<s.entered;
    finalCard(shown?s.sequence[i]:'?',left+i*(cw+gap),h*.48,cw,ch,lit);
   }
   text(part==='preview'?'잠시 후 카드가 닫힙니다':s.entered+' / 4 입력 완료',w*.5,h*.88,Math.min(15,w*.042),'#b4dfcb');
 }else if(part==='timing'){
   text('초록색일 때 두 번!',w*.5,h*.39,Math.min(31,w*.054));
   const width=Math.min(w*.73,510),x=(w-width)/2,y=h*.56,needle=rules.timingPosition(s);
   rect(x-6,y-7,width+12,39,'#0a1c21',7);rect(x,y,width,25,'#957383',5);rect(x+width*.76,y,width*.24,25,'#8cf6b9',3);rect(x+needle*width-5,y-12,10,49,'#fffce1',4);
   for(let i=0;i<2;i++)disk(w*.44+i*w*.12,h*.78,Math.min(17,h*.05),i<s.timingHits?'#f3dc9b':'#294742');
   text('성공 '+s.timingHits+'/2 · 실수 '+s.timingMisses+'/3',w*.5,h*.88,Math.min(17,w*.04),'#d9ede1');
 }else{
   text('마지막 관문 · 덧셈',w*.5,h*.37,Math.min(26,w*.052),'#f5d395');
   text(s.math.prompt,w*.5,h*.64,Math.min(74,w*.14,h*.29),'#fff3c8');
   text('아래에서 정답을 선택하세요',w*.5,h*.85,Math.min(17,w*.043),'#bfdbcf');
 }
}
function scene(now){
 const w=canvasWidth,h=canvasHeight;if(!w||!h)return;
 ctx.clearRect(0,0,w,h);if(!model){stageBack(w,h,'#183437','#0e1a1c');return;}
 if(mode==='redlight')drawTraffic(model,now,w,h);
 else if(mode==='tug')drawTug(model,now,w,h);
 else if(mode==='marbles')drawMarbles(model,w,h);
 else drawFinal(model,w,h);
}
function resize(){
 const bounds=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 canvasWidth=Math.max(1,bounds.width);canvasHeight=Math.max(1,bounds.height);
 canvas.width=Math.ceil(canvasWidth*dpr);canvas.height=Math.ceil(canvasHeight*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
function frame(time){
 if(!model||finished)return;
 requestAnimationFrame(frame);
 if(time-previousFrame<25)return;previousFrame=time;
 update(Date.now());scene(time);
 if(model&&model.status==='playing')render();
}
ui.action.addEventListener('pointerdown',event=>{
 if(mode==='redlight'){ui.action.setPointerCapture?.(event.pointerId);hold(true);}
 else fire();
 event.preventDefault?.();
});
ui.action.addEventListener('pointerup',()=>hold(false));
ui.action.addEventListener('pointercancel',()=>hold(false));
ui.action.addEventListener('lostpointercapture',()=>hold(false));
canvas.addEventListener('pointerdown',event=>{
 if(mode==='redlight'){canvas.setPointerCapture?.(event.pointerId);hold(true);}
 else if(mode==='tug'||(mode==='final'&&model?.part==='timing'))fire();
 else if(mode==='marbles'&&model&&model.status==='playing'){
   const x=event.clientX-canvas.getBoundingClientRect().left;choose('choose',x<canvasWidth*.5?'left':'right');
 }
 event.preventDefault?.();
});
canvas.addEventListener('pointerup',()=>hold(false));
canvas.addEventListener('pointercancel',()=>hold(false));
canvas.addEventListener('lostpointercapture',()=>hold(false));
window.addEventListener('pointerup',()=>hold(false));
window.addEventListener('pointercancel',()=>hold(false));
window.addEventListener('blur',()=>hold(false));
document.addEventListener('keydown',event=>{
 if(event.code==='Space'){event.preventDefault?.();if(event.repeat)return;
   if(mode==='redlight')hold(true);else fire();
 }
 if(mode==='marbles'&&['ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault?.();choose('choose',event.code==='ArrowLeft'?'left':'right');}
 if(mode==='final'){
   if(model?.part==='memory'&&/^Digit[1-4]$/.test(event.code))choose('symbol',rules.SYMBOLS[Number(event.code.slice(-1))-1]);
   if(model?.part==='math'&&/^Digit[1-3]$/.test(event.code))choose('answer',model.math.options[Number(event.code.slice(-1))-1]);
 }
});
document.addEventListener('keyup',event=>{if(event.code==='Space')hold(false);});
ui.start.addEventListener('click',launch);
ui.restart.addEventListener('click',launch);
ui.help.textContent=label.hint;
ui.title.textContent=label.name;
ui.hint.textContent=label.hint;
ui.best.textContent=best+'점';
window.addEventListener('resize',resize);
if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
resize();
if(!standalone)launch();
else{model=rules.create(mode,1137);render();scene(0);}
})();
