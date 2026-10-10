(() => {
'use strict';
const rules=window.SquidMiniRules;
const script=document.currentScript;
const mode=script?.dataset?.mode;
if(!rules.MODES[mode])throw new Error('Unsupported survival mini game');
const standalone=!(new URLSearchParams(location.search).get('survival')==='1'&&window.parent!==window);
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
const sprites={};
const ASSET_ROOT=new URL('../../assets/',script.src);
function image(name,url){if(typeof Image==='undefined')return;sprites[name]=new Image();sprites[name].src=new URL(url,ASSET_ROOT).href;}
image('player','game/characters/kidscade-avatar-v3/school-starter/school-starter-sheet.png');
image('coin','game/2d/platformer-art/base/items/coin-gold.png');
image('flag','game/2d/platformer-art/base/items/flag-green.png');
const alive=name=>sprites[name]?.complete&&sprites[name].naturalWidth>0;
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
 ui.status.textContent=model.status==='playing'?'진행 중':model.status==='cleared'?'성공':model.status==='failed'?'탈락':'시작 전';
 let progress=0,metric='';
 if(mode==='redlight'){progress=model.progress;metric='도착까지 '+Math.max(0,Math.round(100-model.progress))+'m';}
 if(mode==='tug'){progress=model.rope;metric='줄 밀기 '+Math.round(model.rope)+'% · 피로 '+Math.round(model.fatigue)+'%';}
 if(mode==='marbles'){progress=model.questionIndex/5*100;metric='맞힌 문제 '+model.correct+'/5 · 실수 '+model.misses+'/2';}
 if(mode==='final'){progress=model.part==='preview'?0:model.part==='memory'?model.entered*8:model.part==='timing'?35+model.timingHits*20:85;metric='최종 과제: '+({preview:'기억하기',memory:'순서 맞히기',timing:'타이밍',math:'계산'}[model.part]);}
 ui.progress.style.width=Math.max(0,Math.min(100,progress))+'%';
 ui.top.textContent=metric;
 controls();
}
function rect(x,y,w,h,fill,r=0){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function text(message,x,y,size=20,color='#efffea',align='center'){
 ctx.font='900 '+size+'px system-ui';ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(message,x,y);
}
function drawPlayer(x,y,size,now){
 if(alive('player')&&sprites.player.naturalWidth>=23*128){
   const frame=mode==='redlight'&&held&&model.signal==='green'?2+Math.floor(now/125)%4:Math.floor(now/520)%2;
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(sprites.player,frame*128,0,128,128,x-size/2,y-size*.85,size,size);
 }else{rect(x-size*.18,y-size*.6,size*.36,size*.6,'#7bfaac',size*.16);rect(x-size*.15,y-size*.9,size*.3,size*.3,'#f5dcbf',size*.15);}
}
function scene(now){
 const w=canvasWidth,h=canvasHeight;
 if(!w||!h)return;
 const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#24545c');gradient.addColorStop(1,'#0d2937');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(!model)return;
 if(mode==='redlight'){
   const s=model,signalColor=s.signal==='green'?'#72f6a6':s.signal==='red'?'#ff7583':'#ffca69';
   rect(0,h*.65,w,h*.35,'#3c6654');rect(0,h*.76,w,h*.07,'#a89a72');
   for(let i=0;i<10;i++)rect(i*w/9,h*.8,w/16,3,'#e7e6b6');
   const goalX=w*.88;rect(goalX-3,h*.42,6,h*.4,'#edfff0');
   if(alive('flag'))ctx.drawImage(sprites.flag,goalX-1,h*.39,43,45);
   rect(w*.18,h*.1,w*.64,h*.16,'#102a33',17);
   text(s.signal==='green'?'움직여!':s.signal==='red'?'멈춰!':'곧 빨간불!',w*.5,h*.18,Math.min(40,w*.075),signalColor);
   const x=w*.08+(w*.74*s.progress/100);
   drawPlayer(x,h*.76,Math.min(114,h*.35),now);
   const signalX=w*.86;rect(signalX,h*.1,40,90,'#142832',13);
   for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(signalX+20,h*.12+17+i*25,10,0,Math.PI*2);ctx.fillStyle=[s.signal==='red'?'#ff6770':'#634549',s.signal==='warning'?'#ffcc57':'#695a42',s.signal==='green'?'#63f7ad':'#2b594e'][i];ctx.fill();}
 }else if(mode==='tug'){
   const s=model;
   rect(0,h*.63,w,h*.37,'#3b5b50');rect(w*.48,h*.30,w*.04,h*.52,'#2c3940',8);
   const offset=(s.rope-29)/110*w*.25;
   const ropeY=h*.55;ctx.beginPath();ctx.moveTo(w*.14+offset,ropeY);ctx.lineTo(w*.87+offset,ropeY);
   ctx.strokeStyle='#f3c796';ctx.lineWidth=Math.max(10,h*.04);ctx.stroke();
   for(let i=0;i<4;i++){
     const x=w*(.22+i*.12)+offset;
     rect(x-13,ropeY-38,27,42,i<2?'#68b6d6':'#eaae86',10);
     ctx.beginPath();ctx.arc(x,ropeY-44,17,0,2*Math.PI);ctx.fillStyle='#efcba7';ctx.fill();
   }
   text('상대 팀',w*.85,h*.26,16,'#ffd8b7');
   const width=Math.min(w*.77,490),start=(w-width)/2,needle=(s.elapsed%1000)/1000;
   rect(start,h*.11,width,22,'#f7ad86',12);rect(start+width*.40,h*.11,width*.20,22,'#7ef3b1',5);
   rect(start+needle*width-3,h*.095,6,43,'#f9fff2',4);
   text('초록 구간에 들어오면 당기기',w*.5,h*.05,16);
   text('힘 '+Math.round(s.rope)+'%    피로 '+Math.round(s.fatigue)+'%',w*.5,h*.89,Math.min(23,w*.047),'#eff5d8');
 }else if(mode==='marbles'){
   const s=model,q=s.questions[s.questionIndex];if(!q)return;
   rect(w*.035,h*.07,w*.93,h*.87,'#5d463b',20);
   rect(w*.07,h*.12,w*.86,h*.12,'#e6c09b',12);
   text(q.prompt,w*.5,h*.18,Math.min(24,w*.046),'#4a3229');
   for(const [i,count] of [q.left,q.right].entries()){
     const x=w*(i===0?.28:.72),radius=Math.min(w*.16,h*.22);
     ctx.beginPath();ctx.ellipse(x,h*.57,radius,radius*.83,0,0,2*Math.PI);ctx.fillStyle=i?'#355f81':'#80504f';ctx.fill();
     for(let j=0;j<count;j++){
       const columns=4,col=j%columns,row=Math.floor(j/columns);
       const px=x+(col-1.5)*radius*.34,py=h*.49+(row-1)*radius*.35;
       ctx.beginPath();ctx.arc(px,py,Math.max(6,Math.min(13,radius*.13)),0,2*Math.PI);
       ctx.fillStyle=['#eecd90','#9debd1','#f2a8b9','#9bade5'][j%4];ctx.fill();
       ctx.beginPath();ctx.arc(px-3,py-3,2.5,0,2*Math.PI);ctx.fillStyle='#ffffffb5';ctx.fill();
     }
     text(i===0?'왼쪽':'오른쪽',x,h*.83,17);
   }
 }else if(mode==='final'){
   const s=model,part=s.part;
   rect(w*.04,h*.10,w*.92,h*.80,'#102e39',18);
   if(part==='preview'){
     text('순서대로 기억하세요!',w*.5,h*.28,Math.min(32,w*.062));
     text(s.sequence.join('   '),w*.5,h*.51,Math.min(56,w*.1),'#ffe59b');
     text('잠시 후 모양이 사라집니다',w*.5,h*.75,17,'#cce4e2');
   }else if(part==='memory'){
     text('기억한 모양을 순서대로',w*.5,h*.28,Math.min(31,w*.05));
     const entered=s.sequence.map((v,i)=>i<s.entered?v:'＿').join('   ');
     text(entered,w*.5,h*.55,Math.min(49,w*.09),'#9cffd5');
   }else if(part==='timing'){
     text('초록색 구간에서 두 번!',w*.5,h*.26,Math.min(31,w*.055));
     const width=Math.min(w*.72,500),x=(w-width)/2;
     rect(x,h*.46,width,30,'#8b6e7b',14);
     rect(x+width*.76,h*.46,width*.24,30,'#4ae5a2',8);
     const pos=rules.timingPosition(s);rect(x+Math.max(0,(pos*width)-4),h*.43,8,54,'#fffdea',5);
     text(s.timingHits+'/2 성공 · '+s.timingMisses+'/3 실수',w*.5,h*.75,19);
   }else{
     text('마지막 문제!',w*.5,h*.29,21,'#a5f3ce');
     text(s.math.prompt,w*.5,h*.55,Math.min(57,w*.12),'#ffe2a0');
   }
 }
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
