(()=>{
'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const $=sel=>document.querySelector(sel);
const els={missionStep:$('#missionStep'),missionTitle:$('#missionTitle'),missionGoal:$('#missionGoal'),activeMuscle:$('#activeMuscle'),elbowText:$('#elbowText'),jointText:$('#jointText'),goalText:$('#goalText'),xrayBtn:$('#xrayBtn'),helpBtn:$('#helpBtn'),resetBtn:$('#resetBtn'),hintText:$('#hintText'),toast:$('#toast'),card:$('#missionCard'),resultIcon:$('#resultIcon'),resultTitle:$('#resultTitle'),resultText:$('#resultText'),scienceTitle:$('#scienceTitle'),scienceText:$('#scienceText'),nextBtn:$('#nextBtn'),tutorial:$('#tutorial'),tutorialStart:$('#tutorialStart')};
const keyButtons=[...document.querySelectorAll('.muscle-key')];
const inputs={q:false,w:false,e:false,r:false};
const activation={q:0,w:0,e:0,r:0};
const names={q:'위팔 앞쪽 근육',w:'위팔 뒤쪽 근육',e:'어깨 근육',r:'손 근육'};
const missions=[
 {title:'팔을 굽혀 보세요',goal:'Q를 눌러 손을 목표선까지 올려 보세요.',hint:'Q와 W는 서로 반대 방향으로 팔꿈치를 움직여요.',keys:['q','w'],target:'bend',result:'팔꿈치를 충분히 굽혔어요!',science:'위팔 앞쪽 근육이 수축하며 아래팔뼈를 당겨 팔꿈치가 굽혀졌어요.'},
 {title:'버튼을 눌러 보세요',goal:'Q·W·E를 조절해 손으로 파란 버튼을 누르세요.',hint:'팔꿈치만 움직여서는 닿기 어려워요. E로 어깨까지 함께 움직여 보세요.',keys:['q','w','e'],target:'button',result:'손이 버튼에 닿았어요!',science:'어깨와 팔꿈치 관절이 함께 움직이면서 손의 위치가 바뀌었어요. 한 동작에도 여러 근육이 협력해요.'},
 {title:'사과를 바구니에 넣으세요',goal:'손을 사과 가까이 가져간 뒤 R을 누른 채 옮기고, 바구니 위에서 놓으세요.',hint:'R은 토글이 아니라 “잡고 있는 동안” 수축해요. 사과 가까이에서 꾹 눌러 보세요.',keys:['q','w','e','r'],target:'apple',result:'사과를 바구니에 넣었어요!',science:'근육이 뼈를 움직여 손을 사과까지 보내고, 손 근육이 수축해 물건을 붙잡았어요. 여러 관절과 근육의 협응이에요.'}
];
const state={mission:0,xray:false,paused:false,finished:false,shoulder:0.42,shoulderV:0,elbow:0.16,elbowV:0,holdTime:0,buttonPressed:false,apple:{x:548,y:333,vx:0,vy:0,held:false},lastHand:{x:0,y:0},lastTime:performance.now(),toastTimer:0};
const rig={shoulderX:330,shoulderY:330,upper:142,lower:130,handR:23};
const button={x:602,y:322,r:27};
const basket={x:558,y:420,w:92,h:68};
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}
function pt(x,y){return{x,y}}
function handPose(){
 const a=state.shoulder,b=state.shoulder-state.elbow;
 const elbow=pt(rig.shoulderX+Math.cos(a)*rig.upper,rig.shoulderY+Math.sin(a)*rig.upper);
 const hand=pt(elbow.x+Math.cos(b)*rig.lower,elbow.y+Math.sin(b)*rig.lower);
 return{shoulder:pt(rig.shoulderX,rig.shoulderY),elbow,hand,a,b};
}
function setInput(k,on){if(!(k in inputs))return; if(!missions[state.mission].keys.includes(k))return; inputs[k]=on; syncControls()}
function syncControls(){
 keyButtons.forEach(btn=>{const k=btn.dataset.key;btn.classList.toggle('active',inputs[k]);btn.classList.toggle('disabled',!missions[state.mission].keys.includes(k));btn.setAttribute('aria-pressed',inputs[k]?'true':'false');const bar=btn.querySelector('i span');if(bar)bar.style.height=Math.round(activation[k]*100)+'%'});
 const active=Object.keys(inputs).filter(k=>inputs[k]);els.activeMuscle.textContent=active.length?active.map(k=>names[k]).join(' + '):'쉬는 중';
}
function showToast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>els.toast.classList.remove('show'),1200)}
function resetMission(){
 Object.keys(inputs).forEach(k=>inputs[k]=false);Object.keys(activation).forEach(k=>activation[k]=0);
 state.finished=false;state.holdTime=0;state.buttonPressed=false;state.shoulder=state.mission===1?0.5:0.42;state.shoulderV=0;state.elbow=state.mission===1?0.38:0.16;state.elbowV=0;
 state.apple={x:548,y:333,vx:0,vy:0,held:false};state.lastHand={x:0,y:0};els.card.classList.add('hidden');syncMissionUI();syncControls();
}
function syncMissionUI(){const m=missions[state.mission];els.missionStep.textContent=(state.mission+1)+' / '+missions.length;els.missionTitle.textContent=m.title;els.missionGoal.textContent=m.goal;els.goalText.textContent=m.title;els.hintText.textContent=m.hint;els.nextBtn.textContent=state.mission===missions.length-1?'실험 완료':'다음 실험'}
function finishMission(){
 if(state.finished)return;state.finished=true;Object.keys(inputs).forEach(k=>inputs[k]=false);syncControls();
 const m=missions[state.mission];els.resultIcon.textContent=state.mission===2?'🍎':'🔬';els.resultTitle.textContent=m.result;els.resultText.textContent='방금 움직임을 뼈와 근육의 관계로 다시 확인해 봐요.';els.scienceTitle.textContent='왜 움직였을까요?';els.scienceText.textContent=m.science;els.card.classList.remove('hidden');
 try{window.KidscadeGame?.sound?.('correct')}catch(_){ }
}
function nextMission(){if(state.mission<missions.length-1){state.mission++;resetMission();showToast('새로운 근육이 추가됐어요!')}else{try{window.KidscadeGame?.score?.(300);window.KidscadeGame?.gameOver?.({score:300,missions:3})}catch(_){ } els.resultIcon.textContent='🏆';els.resultTitle.textContent='뼈·근육 실험 완료!';els.resultText.textContent='팔을 굽히고, 펴고, 들어 올리고, 물건을 잡는 동안 뼈와 근육이 함께 일했어요.';els.scienceTitle.textContent='다음 실험에서는';els.scienceText.textContent='다리와 몸통을 추가해 의자에서 일어나기와 걷기처럼 더 복잡한 전신 움직임을 실험할 수 있어요.';els.nextBtn.textContent='처음부터 다시';els.nextBtn.onclick=()=>{state.mission=0;try{window.KidscadeGame?.start?.({restart:true})}catch(_){ } resetMission()}}}
function update(dt){
 if(state.paused||state.finished)return;
 for(const k of Object.keys(activation)) activation[k]=lerp(activation[k],inputs[k]?1:0,clamp(dt*10,0,1));
 const elbowDrive=activation.q*6.8-activation.w*6.4;
 const elbowRest=(0.18-state.elbow)*1.35;
 state.elbowV+=(elbowDrive+elbowRest-state.elbowV*4.2)*dt;state.elbow+=state.elbowV*dt;
 if(state.elbow<0.03){state.elbow=0.03;state.elbowV=Math.max(0,state.elbowV)*0.2}if(state.elbow>2.35){state.elbow=2.35;state.elbowV=Math.min(0,state.elbowV)*0.2}
 const shoulderDrive=-activation.e*5.4;
 const shoulderRest=(0.52-state.shoulder)*2.25;
 state.shoulderV+=(shoulderDrive+shoulderRest-state.shoulderV*4.0)*dt;state.shoulder+=state.shoulderV*dt;
 if(state.shoulder<-1.02){state.shoulder=-1.02;state.shoulderV=0}if(state.shoulder>1.18){state.shoulder=1.18;state.shoulderV=0}
 const pose=handPose();
 if(state.mission===2) updateApple(dt,pose);
 checkGoal(dt,pose);
 const speed=Math.hypot(pose.hand.x-state.lastHand.x,pose.hand.y-state.lastHand.y)/Math.max(dt,0.001);state.lastHand=pose.hand;els.jointText.textContent=speed>650?'너무 빠름!':speed>350?'빠르게 움직임':'안정적';
 els.elbowText.textContent=Math.round(state.elbow*180/Math.PI)+'°';syncControls();
}
function updateApple(dt,pose){
 const a=state.apple;const d=Math.hypot(pose.hand.x-a.x,pose.hand.y-a.y);
 if(inputs.r&&d<42&&!a.held){a.held=true;showToast('사과를 잡았어요!')}
 if(a.held){if(inputs.r){a.vx=(pose.hand.x-a.x)*18;a.vy=(pose.hand.y-a.y)*18;a.x=lerp(a.x,pose.hand.x,clamp(dt*22,0,1));a.y=lerp(a.y,pose.hand.y,clamp(dt*22,0,1))}else{a.held=false;a.vx=(pose.hand.x-state.lastHand.x)/Math.max(dt,0.001)*0.25;a.vy=(pose.hand.y-state.lastHand.y)/Math.max(dt,0.001)*0.25}}
 if(!a.held){a.vy+=780*dt;a.vx*=Math.pow(.985,dt*60);a.vy*=Math.pow(.994,dt*60);a.x+=a.vx*dt;a.y+=a.vy*dt;
  const deskY=365;if(a.y>deskY-16&&a.x>470&&a.x<690&&!(a.x>basket.x&&a.x<basket.x+basket.w)){a.y=deskY-16;a.vy*=-.18;a.vx*=.8}
  const floor=516;if(a.y>floor){a.y=floor;a.vy*=-.25;a.vx*=.7}
 }
 if(!a.held&&a.x>basket.x+8&&a.x<basket.x+basket.w-8&&a.y>basket.y+8&&a.y<basket.y+basket.h-4){finishMission()}
}
function checkGoal(dt,pose){
 const target=missions[state.mission].target;
 if(target==='bend'){
  if(state.elbow>1.62)state.holdTime+=dt;else state.holdTime=Math.max(0,state.holdTime-dt*.8);
  if(state.holdTime>.55)finishMission();
 }else if(target==='button'){
  const d=Math.hypot(pose.hand.x-button.x,pose.hand.y-button.y);
  state.buttonPressed=d<button.r+rig.handR-8;
  if(state.buttonPressed){state.holdTime+=dt;if(state.holdTime>.28)finishMission()}else state.holdTime=0;
 }
}
function line(a,b,width,color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
function circle(p,r,fill,stroke){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function drawRoom(){
 const g=ctx.createLinearGradient(0,0,0,560);g.addColorStop(0,state.xray?'#172636':'#dff3f8');g.addColorStop(1,state.xray?'#203244':'#f6fbfd');ctx.fillStyle=g;ctx.fillRect(0,0,960,560);
 ctx.fillStyle=state.xray?'#294154':'#cfe4ea';ctx.fillRect(0,500,960,60);ctx.fillStyle=state.xray?'rgba(255,255,255,.08)':'rgba(255,255,255,.58)';ctx.fillRect(0,0,960,74);
 ctx.fillStyle=state.xray?'#9fc5d9':'#5d7b8b';ctx.font='700 15px system-ui';ctx.fillText(state.xray?'X-RAY 관찰 모드 · 수축한 근육이 더 굵게 보여요':'근육을 직접 조종해 목표를 해결하세요',28,45);
}
function drawSceneObjects(){
 const m=state.mission;
 if(m===0){ctx.save();ctx.setLineDash([10,8]);ctx.strokeStyle=state.xray?'#7dd3fc':'#2f80ed';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(468,228);ctx.lineTo(620,228);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=state.xray?'#bae6fd':'#1d5fb9';ctx.font='800 14px system-ui';ctx.fillText('손이 이 선 위로 올라오면 성공!',470,210);ctx.restore()}
 if(m===1){ctx.fillStyle=state.xray?'#334b61':'#fff';ctx.fillRect(640,170,26,270);ctx.fillStyle=state.buttonPressed?'#18a77a':'#3b82f6';ctx.beginPath();ctx.arc(button.x,button.y,button.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='900 14px system-ui';ctx.textAlign='center';ctx.fillText('PUSH',button.x,button.y+5);ctx.textAlign='left'}
 if(m===2){ctx.fillStyle=state.xray?'#355064':'#a77245';ctx.fillRect(470,365,220,18);ctx.fillRect(490,383,15,117);ctx.fillRect(655,383,15,117);drawBasket();drawApple()}
}
function drawBasket(){ctx.fillStyle=state.xray?'#d5b36a':'#d99a4e';ctx.fillRect(basket.x,basket.y,basket.w,basket.h);ctx.fillStyle=state.xray?'#203244':'#b8742c';for(let x=basket.x+12;x<basket.x+basket.w;x+=18)ctx.fillRect(x,basket.y+8,5,basket.h-16);ctx.strokeStyle=state.xray?'#f0d28c':'#8b5728';ctx.lineWidth=5;ctx.strokeRect(basket.x,basket.y,basket.w,basket.h)}
function drawApple(){const a=state.apple;circle(a,16,state.xray?'#ff8b76':'#ef5144','#b32f28');ctx.strokeStyle='#4f7b35';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(a.x,a.y-15);ctx.lineTo(a.x+3,a.y-24);ctx.stroke();if(a.held){ctx.fillStyle='#159a72';ctx.font='800 12px system-ui';ctx.fillText('잡는 중',a.x-22,a.y-28)}}
function drawArm(){
 const p=handPose();
 if(state.xray){
  line(p.shoulder,p.elbow,22,'rgba(255,255,255,.15)');line(p.elbow,p.hand,19,'rgba(255,255,255,.15)');
  line(p.shoulder,p.elbow,8,'#f2eadc');line(p.elbow,p.hand,7,'#f2eadc');circle(p.shoulder,10,'#f2eadc');circle(p.elbow,9,'#f2eadc');circle(p.hand,13,'#f2eadc');
  drawMuscles(p,true);
 }else{
  line(p.shoulder,p.elbow,36,'#f4b69f');line(p.elbow,p.hand,31,'#f4b69f');circle(p.shoulder,23,'#f2aa90','#bd765f');circle(p.elbow,18,'#f0a88f','#bd765f');circle(p.hand,rig.handR,'#f3b298','#bd765f');drawMuscles(p,false);
 }
 ctx.fillStyle=state.xray?'#dceaf2':'#29465b';ctx.beginPath();ctx.arc(255,250,62,0,Math.PI*2);ctx.fill();ctx.fillStyle=state.xray?'rgba(255,255,255,.16)':'#466b82';ctx.fillRect(250,295,100,205);ctx.fillStyle=state.xray?'#dceaf2':'#f4b69f';ctx.beginPath();ctx.arc(255,250,48,0,Math.PI*2);ctx.fill();
}
function drawMuscles(p,xray){
 const q=activation.q,w=activation.w,e=activation.e,r=activation.r;
 const midUpper={x:lerp(p.shoulder.x,p.elbow.x,.5),y:lerp(p.shoulder.y,p.elbow.y,.5)};
 const perp={x:-Math.sin(p.a),y:Math.cos(p.a)};
 const b1={x:p.shoulder.x+perp.x*11,y:p.shoulder.y+perp.y*11},b2={x:p.elbow.x+perp.x*8,y:p.elbow.y+perp.y*8};
 const t1={x:p.shoulder.x-perp.x*11,y:p.shoulder.y-perp.y*11},t2={x:p.elbow.x-perp.x*8,y:p.elbow.y-perp.y*8};
 const baseAlpha=xray?.92:.38;
 ctx.globalAlpha=baseAlpha;line(b1,b2,8+q*11,'#e84c4f');line(t1,t2,7+w*10,'#c63c61');circle({x:p.shoulder.x-2,y:p.shoulder.y-4},14+e*7,'#ef6b54');circle(p.hand,9+r*8,'#d84a76');ctx.globalAlpha=1;
 if(xray){ctx.fillStyle='#f8d0d0';ctx.font='700 12px system-ui';if(q>.08)ctx.fillText('위팔 앞쪽 수축',midUpper.x+16,midUpper.y-18);if(w>.08)ctx.fillText('위팔 뒤쪽 수축',midUpper.x+12,midUpper.y+28);if(e>.08)ctx.fillText('어깨 수축',p.shoulder.x-38,p.shoulder.y-36);if(r>.08)ctx.fillText('손 근육 수축',p.hand.x+18,p.hand.y-18)}
}
function render(){ctx.clearRect(0,0,canvas.width,canvas.height);drawRoom();drawSceneObjects();drawArm();if(state.mission===2&&state.apple.y>500){ctx.fillStyle='#b45309';ctx.font='800 13px system-ui';ctx.fillText('사과가 떨어졌어요. 다시 잡거나 실험을 다시 시작해도 돼요!',510,540)}}
function tick(now){const dt=clamp((now-state.lastTime)/1000,0,.033);state.lastTime=now;update(dt);render();requestAnimationFrame(tick)}
function toggleXray(){state.xray=!state.xray;els.xrayBtn.classList.toggle('on',state.xray);els.xrayBtn.setAttribute('aria-pressed',state.xray?'true':'false');showToast(state.xray?'뼈와 근육을 관찰해요':'일반 화면으로 돌아왔어요')}
function showTutorial(){els.tutorial.classList.remove('hidden')}
function hideTutorial(){els.tutorial.classList.add('hidden');try{localStorage.setItem('kidscade_body_lab_tutorial_v1','1')}catch(_){ }try{window.KidscadeGame?.start?.({mission:1})}catch(_){ }}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k in inputs&&!e.repeat){e.preventDefault();setInput(k,true)}if(e.key==='Escape'&&!els.tutorial.classList.contains('hidden'))els.tutorial.classList.add('hidden')});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k in inputs){e.preventDefault();setInput(k,false)}});
window.addEventListener('blur',()=>Object.keys(inputs).forEach(k=>setInput(k,false)));
keyButtons.forEach(btn=>{const k=btn.dataset.key;const on=e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);setInput(k,true)};const off=e=>{e.preventDefault();setInput(k,false)};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('lostpointercapture',off)});
els.xrayBtn.addEventListener('click',toggleXray);els.helpBtn.addEventListener('click',showTutorial);els.resetBtn.addEventListener('click',()=>{resetMission();showToast('현재 실험을 다시 시작했어요')});els.nextBtn.addEventListener('click',nextMission);els.tutorialStart.addEventListener('click',hideTutorial);
try{window.KidscadeGame?.registerPauseHandlers?.({pause(){state.paused=true;Object.keys(inputs).forEach(k=>inputs[k]=false);syncControls()},resume(){state.paused=false;state.lastTime=performance.now()}})}catch(_){ }
resetMission();
let seen=false;try{seen=localStorage.getItem('kidscade_body_lab_tutorial_v1')==='1'}catch(_){ }if(!seen)showTutorial();else try{window.KidscadeGame?.start?.({mission:1})}catch(_){ }
requestAnimationFrame(tick);
})();
