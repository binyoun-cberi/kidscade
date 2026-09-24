(()=>{
'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const $=sel=>document.querySelector(sel);
const els={
 missionStep:$('#missionStep'),missionTitle:$('#missionTitle'),missionGoal:$('#missionGoal'),activeMuscle:$('#activeMuscle'),
 measureLabel:$('#measureLabel'),measureText:$('#measureText'),stateLabel:$('#stateLabel'),jointText:$('#jointText'),
 goalText:$('#goalText'),xrayBtn:$('#xrayBtn'),helpBtn:$('#helpBtn'),resetBtn:$('#resetBtn'),hintText:$('#hintText'),
 toast:$('#toast'),card:$('#missionCard'),resultIcon:$('#resultIcon'),resultTitle:$('#resultTitle'),resultText:$('#resultText'),
 scienceTitle:$('#scienceTitle'),scienceText:$('#scienceText'),nextBtn:$('#nextBtn'),tutorial:$('#tutorial'),
 tutorialStart:$('#tutorialStart'),assistBox:$('#assistBox'),assistText:$('#assistText'),assistBar:$('#assistBar'),
 controllerTitle:$('#controllerTitle'),controllerHelp:$('#controllerHelp')
};
const keyButtons=[...document.querySelectorAll('.muscle-key')];
const inputs={q:false,w:false,e:false,r:false};
const activation={q:0,w:0,e:0,r:0};
const ARM_LABELS={
 q:['위팔 앞쪽','팔꿈치를 굽혀요'],
 w:['위팔 뒤쪽','팔꿈치를 펴요'],
 e:['어깨 근육','팔 전체를 들어요'],
 r:['손 근육','물건을 잡아요']
};
const missions=[
 {mode:'arm',title:'팔을 굽혀 보세요',goal:'Q를 눌러 손을 목표선까지 올려 보세요.',hint:'Q와 W는 서로 반대 방향으로 팔꿈치를 움직여요.',keys:['q','w'],target:'bend',result:'팔꿈치를 충분히 굽혔어요!',science:'위팔 앞쪽 근육이 수축하며 아래팔뼈를 당겨 팔꿈치가 굽혀졌어요.',icon:'🔬',labels:ARM_LABELS},
 {mode:'arm',title:'버튼을 눌러 보세요',goal:'Q·W·E를 조절해 손으로 파란 버튼을 누르세요.',hint:'팔꿈치만 움직여서는 닿기 어려워요. E로 어깨까지 함께 움직여 보세요.',keys:['q','w','e'],target:'button',result:'손이 버튼에 닿았어요!',science:'어깨와 팔꿈치 관절이 함께 움직이면서 손의 위치가 바뀌었어요. 한 동작에도 여러 근육이 협력해요.',icon:'🔵',labels:ARM_LABELS},
 {mode:'arm',title:'사과를 바구니에 넣으세요',goal:'손을 사과 가까이 가져간 뒤 R을 누른 채 옮기고, 바구니 위에서 놓으세요.',hint:'R은 토글이 아니라 “잡고 있는 동안” 수축해요. 사과 가까이에서 꾹 눌러 보세요.',keys:['q','w','e','r'],target:'apple',result:'사과를 바구니에 넣었어요!',science:'근육이 뼈를 움직여 손을 사과까지 보내고, 손 근육이 수축해 물건을 붙잡았어요. 여러 관절과 근육의 협응이에요.',icon:'🍎',labels:ARM_LABELS},
 {mode:'body',title:'의자에서 일어나세요',goal:'다리와 몸통 근육을 함께 써서 완전히 일어서세요.',hint:'Q만 누르면 무릎만 펴져 몸이 뒤로 넘어가요. W·E도 함께 쓰고 R로 몸통을 세워 보세요.',keys:['q','w','e','r'],target:'stand',assist:.72,result:'혼자 힘으로 일어섰어요!',science:'허벅지 앞쪽 근육이 무릎을 펴고, 엉덩이 근육이 몸을 일으키며, 종아리와 몸통 근육이 균형을 잡았어요.',icon:'🪑',labels:{q:['허벅지 앞쪽','무릎을 펴요'],w:['엉덩이 근육','엉덩관절을 펴요'],e:['종아리 근육','바닥을 밀어요'],r:['몸통 근육','상체 균형을 잡아요']}},
 {mode:'body',title:'3m 걸어가세요',goal:'왼발과 오른발 근육을 번갈아 써서 결승선까지 걸어가세요.',hint:'Q → W → E → R 리듬을 찾아보세요. 같은 쪽만 계속 쓰면 몸이 크게 흔들려요.',keys:['q','w','e','r'],target:'walk',assist:.52,result:'3m를 걸었어요!',science:'걷기는 한 근육만 반복하는 동작이 아니에요. 왼쪽과 오른쪽 다리의 근육이 번갈아 수축하고, 몸통은 중심을 계속 조절해요.',icon:'🚶',labels:{q:['왼 허벅지','왼다리를 앞으로'],w:['왼 종아리','왼발로 밀기'],e:['오른 허벅지','오른다리를 앞으로'],r:['오른 종아리','오른발로 밀기']}},
 {mode:'body',title:'장애물을 넘어가세요',goal:'걷다가 낮은 장애물 앞에서 다리를 충분히 들어 넘어가세요.',hint:'장애물 가까이에서는 Q 또는 E로 앞다리를 먼저 들어야 해요. 낮게 끌면 걸려 넘어져요.',keys:['q','w','e','r'],target:'obstacle',assist:.38,result:'발을 들어 장애물을 넘었어요!',science:'장애물을 넘을 때는 엉덩관절과 무릎을 더 굽혀 발을 높이고, 반대쪽 다리는 몸을 지지하며 균형을 유지해요.',icon:'🚧',labels:{q:['왼 허벅지','왼다리를 높이 들어요'],w:['왼 종아리','왼발로 밀어요'],e:['오른 허벅지','오른다리를 높이 들어요'],r:['오른 종아리','오른발로 밀어요']}},
 {mode:'body',title:'상자를 옮기세요',goal:'상자를 놓치지 말고 3m 앞 표시까지 옮기세요.',hint:'Q/W로 번갈아 걷고 E를 놓치면 상자가 미끄러져요. R은 몸통을 단단히 잡아 흔들림을 줄여요.',keys:['q','w','e','r'],target:'box',assist:.25,result:'상자를 안전하게 옮겼어요!',science:'무거운 물건을 들면 팔뿐 아니라 다리와 몸통도 더 큰 힘을 써야 해요. 몸 가까이 잡을수록 균형을 잡기 쉬워져요.',icon:'📦',labels:{q:['왼다리 근육','왼발로 한 걸음'],w:['오른다리 근육','오른발로 한 걸음'],e:['팔·손 근육','상자를 꽉 잡아요'],r:['몸통 근육','허리와 몸통을 지지해요']}},
 {mode:'body',title:'급식판을 자리까지!',goal:'급식판을 기울이지 않게 조절하며 4m 앞 자리까지 이동하세요.',hint:'Q/W로 걸으면서 판이 기울면 E는 왼쪽을, R은 오른쪽을 들어 수평을 되찾아요.',keys:['q','w','e','r'],target:'tray',assist:.12,result:'급식판을 무사히 옮겼어요!',science:'걷는 동안 다리 근육은 몸을 이동시키고, 팔과 몸통 근육은 작은 흔들림을 계속 보정해 물체를 수평으로 유지해요. 이것이 전신 협응이에요.',icon:'🍱',labels:{q:['왼다리 근육','왼발로 한 걸음'],w:['오른다리 근육','오른발로 한 걸음'],e:['왼팔 근육','판의 왼쪽을 들어요'],r:['오른팔 근육','판의 오른쪽을 들어요']}}
];
const state={
 mission:0,xray:false,paused:false,finished:false,summary:false,lastTime:performance.now(),toastTimer:0,holdTime:0,
 shoulder:.42,shoulderV:0,elbow:.16,elbowV:0,buttonPressed:false,lastHand:{x:0,y:0},
 apple:{x:548,y:333,vx:0,vy:0,held:false},
 body:{stand:0,lean:0,leanV:0,distance:0,vx:0,gait:0,expected:0,wobble:0,fall:0,checkpoint:0,obstacleCleared:false,boxGrip:1,trayTilt:0,trayV:0,meal:100,lastStepKey:''}
};
const rig={shoulderX:330,shoulderY:330,upper:142,lower:130,handR:23};
const pushButton={x:602,y:322,r:27};
const basket={x:558,y:420,w:92,h:68};
const WALK_SEQUENCE=['q','w','e','r'];

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}
function pt(x,y){return{x,y}}
function currentMission(){return missions[state.mission]}

function armPose(){
 const a=state.shoulder,b=state.shoulder-state.elbow;
 const elbow=pt(rig.shoulderX+Math.cos(a)*rig.upper,rig.shoulderY+Math.sin(a)*rig.upper);
 const hand=pt(elbow.x+Math.cos(b)*rig.lower,elbow.y+Math.sin(b)*rig.lower);
 return{shoulder:pt(rig.shoulderX,rig.shoulderY),elbow,hand,a,b};
}

function setInput(k,on){
 if(!(k in inputs)||!currentMission().keys.includes(k))return;
 const was=inputs[k];
 inputs[k]=on;
 if(on&&!was)handlePress(k);
 syncControls();
}

function handlePress(k){
 const m=currentMission();
 if(m.mode!=='body'||state.finished||state.body.fall>0)return;
 const b=state.body;
 if(m.target==='walk'||m.target==='obstacle'){
  const expected=WALK_SEQUENCE[b.expected];
  if(k===expected){
   b.expected=(b.expected+1)%WALK_SEQUENCE.length;
   b.vx+=m.target==='obstacle'?1:1.08;
   b.gait+=Math.PI/2;
   b.wobble*=.84;
   pulseKey(k,true);
  }else{
   b.wobble+=.16;
   b.leanV+=(k==='q'||k==='w'?-1:1)*.13;
   pulseKey(k,false);
  }
 }else if(m.target==='box'&&(k==='q'||k==='w')){
  const alternating=b.lastStepKey!==k;
  if(alternating){
   b.lastStepKey=k;
   b.vx+=.82;
   b.gait+=Math.PI;
   b.wobble*=.9;
   pulseKey(k,true);
  }else{
   b.wobble+=.2;
   pulseKey(k,false);
  }
 }else if(m.target==='tray'&&(k==='q'||k==='w')){
  const alternating=b.lastStepKey!==k;
  if(alternating){
   b.lastStepKey=k;
   b.vx+=.74;
   b.gait+=Math.PI;
   b.trayV+=(k==='q'?0.12:-0.12);
   pulseKey(k,true);
  }else{
   b.wobble+=.14;
   b.trayV+=(k==='q'?0.18:-0.18);
   pulseKey(k,false);
  }
 }
}

function pulseKey(k,ok){
 const btn=keyButtons.find(x=>x.dataset.key===k);
 if(!btn)return;
 const cls=ok?'correct-pulse':'wrong-pulse';
 btn.classList.remove('correct-pulse','wrong-pulse');
 void btn.offsetWidth;
 btn.classList.add(cls);
 setTimeout(()=>btn.classList.remove(cls),320);
}

function syncControls(){
 const m=currentMission();
 const labels=m.labels||ARM_LABELS;
 keyButtons.forEach(btn=>{
  const k=btn.dataset.key;
  btn.classList.toggle('active',inputs[k]);
  btn.classList.toggle('disabled',!m.keys.includes(k));
  btn.setAttribute('aria-pressed',inputs[k]?'true':'false');
  const copy=labels[k];
  if(copy){
   btn.querySelector('b').textContent=copy[0];
   btn.querySelector('small').textContent=copy[1];
  }
  const bar=btn.querySelector('i span');
  if(bar)bar.style.height=Math.round(activation[k]*100)+'%';
 });
 const active=Object.keys(inputs).filter(k=>inputs[k]&&m.keys.includes(k));
 els.activeMuscle.textContent=active.length?active.map(k=>labels[k]?.[0]||k.toUpperCase()).join(' + '):'쉬는 중';
 els.controllerTitle.textContent=m.mode==='arm'?'근육 조종기':'전신 근육 조종기';
 els.controllerHelp.textContent=m.mode==='arm'?'누르는 동안 근육이 수축해요.':'타이밍과 힘의 조합이 몸의 균형을 바꿔요.';
}

function showToast(msg){
 els.toast.textContent=msg;
 els.toast.classList.add('show');
 clearTimeout(state.toastTimer);
 state.toastTimer=setTimeout(()=>els.toast.classList.remove('show'),1300);
}

function resetBody(){
 state.body={stand:0,lean:0,leanV:0,distance:0,vx:0,gait:0,expected:0,wobble:0,fall:0,checkpoint:0,obstacleCleared:false,boxGrip:1,trayTilt:0,trayV:0,meal:100,lastStepKey:''};
 if(currentMission().target!=='stand')state.body.stand=1;
}

function resetMission(){
 Object.keys(inputs).forEach(k=>inputs[k]=false);
 Object.keys(activation).forEach(k=>activation[k]=0);
 state.finished=false;
 state.summary=false;
 state.holdTime=0;
 state.buttonPressed=false;
 state.shoulder=state.mission===1?.5:.42;
 state.shoulderV=0;
 state.elbow=state.mission===1?.38:.16;
 state.elbowV=0;
 state.apple={x:548,y:333,vx:0,vy:0,held:false};
 state.lastHand={x:0,y:0};
 resetBody();
 els.card.classList.add('hidden');
 syncMissionUI();
 syncControls();
}

function syncMissionUI(){
 const m=currentMission();
 els.missionStep.textContent=(state.mission+1)+' / '+missions.length;
 els.missionTitle.textContent=m.title;
 els.missionGoal.textContent=m.goal;
 els.goalText.textContent=m.title;
 els.hintText.textContent=m.hint;
 els.nextBtn.textContent=state.mission===missions.length-1?'실험 완료':'다음 실험';
 const body=m.mode==='body';
 els.assistBox.classList.toggle('hidden',!body);
 const assist=Math.round((m.assist??0)*100);
 els.assistText.textContent=assist+'%';
 els.assistBar.style.width=assist+'%';
 if(!body){
  els.measureLabel.textContent='팔꿈치';
  els.stateLabel.textContent='관절 상태';
 }else if(m.target==='stand'){
  els.measureLabel.textContent='일어서기';
  els.stateLabel.textContent='몸 균형';
 }else if(m.target==='tray'){
  els.measureLabel.textContent='이동 거리';
  els.stateLabel.textContent='급식판';
 }else{
  els.measureLabel.textContent='이동 거리';
  els.stateLabel.textContent='몸 균형';
 }
}

function finishMission(){
 if(state.finished)return;
 state.finished=true;
 Object.keys(inputs).forEach(k=>inputs[k]=false);
 syncControls();
 const m=currentMission();
 els.resultIcon.textContent=m.icon||'🔬';
 els.resultTitle.textContent=m.result;
 els.resultText.textContent='방금 움직임을 뼈와 근육의 관계로 다시 확인해 봐요.';
 els.scienceTitle.textContent='왜 움직였을까요?';
 els.scienceText.textContent=m.science;
 els.card.classList.remove('hidden');
 try{window.KidscadeGame?.sound?.('correct')}catch(_){}
}

function nextMission(){
 if(state.summary){
  state.mission=0;
  try{window.KidscadeGame?.start?.({restart:true})}catch(_){}
  resetMission();
  return;
 }
 if(state.mission<missions.length-1){
  state.mission++;
  resetMission();
  showToast(state.mission===3?'이제 전신 실험이에요!':'다음 움직임 실험 시작!');
 }else{
  state.summary=true;
  try{
   window.KidscadeGame?.score?.(800);
   window.KidscadeGame?.gameOver?.({score:800,missions:8});
  }catch(_){}
  els.resultIcon.textContent='🏆';
  els.resultTitle.textContent='전신 뼈·근육 실험 완료!';
  els.resultText.textContent='팔의 길항근부터 걷기, 장애물, 짐 운반과 급식판 균형까지 모두 해결했어요.';
  els.scienceTitle.textContent='오늘의 핵심';
  els.scienceText.textContent='뼈는 몸을 지지하고 관절은 움직임의 축이 되며, 근육은 수축하여 뼈를 당겨요. 복잡한 동작은 여러 근육이 순서와 세기를 맞춰 협력해야 가능해요.';
  els.nextBtn.textContent='처음부터 다시';
 }
}

function update(dt){
 if(state.paused||state.finished)return;
 for(const k of Object.keys(activation)){
  activation[k]=lerp(activation[k],inputs[k]?1:0,clamp(dt*10,0,1));
 }
 if(currentMission().mode==='arm')updateArm(dt);
 else updateBody(dt);
 syncControls();
}

function updateArm(dt){
 const elbowDrive=activation.q*6.8-activation.w*6.4;
 const elbowRest=(.18-state.elbow)*1.35;
 state.elbowV+=(elbowDrive+elbowRest-state.elbowV*4.2)*dt;
 state.elbow+=state.elbowV*dt;
 if(state.elbow<.03){state.elbow=.03;state.elbowV=Math.max(0,state.elbowV)*.2}
 if(state.elbow>2.35){state.elbow=2.35;state.elbowV=Math.min(0,state.elbowV)*.2}
 const shoulderDrive=-activation.e*5.4;
 const shoulderRest=(.52-state.shoulder)*2.25;
 state.shoulderV+=(shoulderDrive+shoulderRest-state.shoulderV*4)*dt;
 state.shoulder+=state.shoulderV*dt;
 if(state.shoulder<-1.02){state.shoulder=-1.02;state.shoulderV=0}
 if(state.shoulder>1.18){state.shoulder=1.18;state.shoulderV=0}
 const pose=armPose();
 if(state.mission===2)updateApple(dt,pose);
 checkArmGoal(dt,pose);
 const speed=Math.hypot(pose.hand.x-state.lastHand.x,pose.hand.y-state.lastHand.y)/Math.max(dt,.001);
 state.lastHand=pose.hand;
 els.jointText.textContent=speed>650?'너무 빠름!':speed>350?'빠르게 움직임':'안정적';
 els.measureText.textContent=Math.round(state.elbow*180/Math.PI)+'°';
}

function updateApple(dt,pose){
 const a=state.apple;
 const d=Math.hypot(pose.hand.x-a.x,pose.hand.y-a.y);
 if(inputs.r&&d<42&&!a.held){
  a.held=true;
  showToast('사과를 잡았어요!');
 }
 if(a.held){
  if(inputs.r){
   a.x=lerp(a.x,pose.hand.x,clamp(dt*22,0,1));
   a.y=lerp(a.y,pose.hand.y,clamp(dt*22,0,1));
  }else{
   a.held=false;
   a.vx=(pose.hand.x-state.lastHand.x)/Math.max(dt,.001)*.25;
   a.vy=(pose.hand.y-state.lastHand.y)/Math.max(dt,.001)*.25;
  }
 }
 if(!a.held){
  a.vy+=780*dt;
  a.vx*=Math.pow(.985,dt*60);
  a.vy*=Math.pow(.994,dt*60);
  a.x+=a.vx*dt;
  a.y+=a.vy*dt;
  const deskY=365;
  if(a.y>deskY-16&&a.x>470&&a.x<690&&!(a.x>basket.x&&a.x<basket.x+basket.w)){
   a.y=deskY-16;
   a.vy*=-.18;
   a.vx*=.8;
  }
  if(a.y>516){a.y=516;a.vy*=-.25;a.vx*=.7}
 }
 if(!a.held&&a.x>basket.x+8&&a.x<basket.x+basket.w-8&&a.y>basket.y+8&&a.y<basket.y+basket.h-4)finishMission();
}

function checkArmGoal(dt,pose){
 const target=currentMission().target;
 if(target==='bend'){
  if(state.elbow>1.62)state.holdTime+=dt;
  else state.holdTime=Math.max(0,state.holdTime-dt*.8);
  if(state.holdTime>.55)finishMission();
 }else if(target==='button'){
  const d=Math.hypot(pose.hand.x-pushButton.x,pose.hand.y-pushButton.y);
  state.buttonPressed=d<pushButton.r+rig.handR-8;
  if(state.buttonPressed){
   state.holdTime+=dt;
   if(state.holdTime>.28)finishMission();
  }else state.holdTime=0;
 }
}

function updateBody(dt){
 const m=currentMission();
 const b=state.body;
 if(b.fall>0){
  b.fall-=dt;
  if(b.fall<=0)recoverFromFall();
  return;
 }
 const assist=m.assist??0;
 const damping=2.3+assist*4.2;

 if(m.target==='stand'){
  const legPower=activation.q*.42+activation.w*.34+activation.e*.24;
  const core=activation.r;
  const bad=Math.max(0,activation.q-activation.w-.35);
  b.stand+=((legPower*(.42+.58*core))-bad*.18)*dt*.82;
  b.stand=clamp(b.stand,0,1.05);
  b.leanV+=(bad*.95-(core*.9+b.lean*(2.1+assist*2.3))-b.leanV*damping)*dt;
  b.lean+=b.leanV*dt;
  if(Math.abs(b.lean)>.78)triggerFall('몸통이 뒤로 넘어갔어요. 여러 근육을 같이 써 보세요!');
  if(b.stand>=1&&Math.abs(b.lean)<.34){
   state.holdTime+=dt;
   if(state.holdTime>.55)finishMission();
  }else state.holdTime=Math.max(0,state.holdTime-dt);
  els.measureText.textContent=Math.round(b.stand*100)+'%';
  els.jointText.textContent=Math.abs(b.lean)<.18?'안정적':Math.abs(b.lean)<.42?'휘청거림':'넘어질 듯!';
  return;
 }

 b.vx*=Math.pow(.74,dt*3.5);
 b.distance+=b.vx*dt;
 b.wobble*=Math.pow(.8,dt*2.2);

 if(m.target==='walk'||m.target==='obstacle'){
  const side=(activation.q+activation.w)-(activation.e+activation.r);
  b.leanV+=(side*.55+b.wobble*Math.sin(b.gait)-b.lean*(2.4+assist*3)-b.leanV*damping)*dt;
  b.lean+=b.leanV*dt;
  if(m.target==='obstacle')checkObstacle();
  if(Math.abs(b.lean)>.68-assist*.1||b.wobble>.72)triggerFall('균형을 잃었어요. 왼쪽과 오른쪽을 번갈아 써 보세요!');
  const goal=m.target==='walk'?3:3.4;
  if(b.distance>=goal&&(m.target!=='obstacle'||b.obstacleCleared))finishMission();
 }else if(m.target==='box'){
  const grip=activation.e;
  const core=activation.r;
  b.boxGrip+=(grip>.25?1:-.72)*dt;
  b.boxGrip=clamp(b.boxGrip,0,1);
  b.wobble+=Math.max(0,b.vx-.2)*dt*.035;
  b.leanV+=(b.wobble*Math.sin(b.gait)*.65-b.lean*(1.8+assist*3+core*2.8)-b.leanV*damping)*dt;
  b.lean+=b.leanV*dt;
  if(b.boxGrip<.08){
   showToast('상자를 놓쳤어요! 다시 꽉 잡아 보세요');
   b.distance=Math.max(0,b.distance-.45);
   b.boxGrip=.72;
   b.vx=0;
   b.wobble=.16;
  }
  if(Math.abs(b.lean)>.61)triggerFall('상자 무게 때문에 중심을 잃었어요. R로 몸통을 잡아 주세요!');
  if(b.distance>=3)finishMission();
 }else if(m.target==='tray'){
  b.leanV+=(b.wobble*Math.sin(b.gait)*.45-b.lean*(2+assist*3)-b.leanV*damping)*dt;
  b.lean+=b.leanV*dt;
  const correction=(activation.r-activation.e)*1.45;
  b.trayV+=((b.lean*.75-correction)-b.trayTilt*2.4-b.trayV*3.1)*dt;
  b.trayTilt+=b.trayV*dt;
  if(Math.abs(b.trayTilt)>.24)b.meal-=Math.min(18,Math.abs(b.trayTilt)*22)*dt;
  b.meal=clamp(b.meal,0,100);
  if(b.meal<=0){
   showToast('급식판을 다시 받았어요! 천천히 가 볼까요?');
   b.distance=Math.max(0,b.distance-.65);
   b.meal=100;
   b.trayTilt=0;
   b.trayV=0;
   b.vx=0;
  }
  if(Math.abs(b.lean)>.66)triggerFall('급식판과 함께 휘청! 발걸음을 천천히 번갈아 보세요.');
  if(b.distance>=4&&b.meal>=35)finishMission();
 }

 els.measureText.textContent=b.distance.toFixed(1)+'m';
 if(m.target==='tray')els.jointText.textContent='남은 급식 '+Math.round(b.meal)+'%';
 else els.jointText.textContent=Math.abs(b.lean)<.18?'안정적':Math.abs(b.lean)<.4?'휘청거림':'위험!';
}

function checkObstacle(){
 const b=state.body;
 if(b.obstacleCleared)return;
 const obstacleAt=1.65;
 if(b.distance>obstacleAt-.18&&b.distance<obstacleAt+.28){
  const lift=Math.max(activation.q,activation.e);
  if(lift>.58){
   b.obstacleCleared=true;
   b.vx+=.42;
   showToast('발을 높이 들어 넘었어요!');
  }else if(b.distance>obstacleAt+.08){
   triggerFall('발이 장애물에 걸렸어요. 가까이에서 Q 또는 E로 다리를 들어 보세요!');
  }
 }
}

function triggerFall(message){
 const b=state.body;
 if(b.fall>0)return;
 b.fall=.78;
 b.vx=0;
 b.leanV=0;
 b.checkpoint=Math.max(0,b.distance-.35);
 showToast(message);
 try{window.KidscadeGame?.sound?.('wrong')}catch(_){}
}

function recoverFromFall(){
 const b=state.body;
 b.distance=b.checkpoint;
 b.lean=0;
 b.leanV=0;
 b.wobble=.12;
 b.vx=0;
 b.trayTilt*=.3;
 b.trayV=0;
 Object.keys(inputs).forEach(k=>inputs[k]=false);
 syncControls();
}

function line(a,b,width,color){
 ctx.strokeStyle=color;
 ctx.lineWidth=width;
 ctx.lineCap='round';
 ctx.beginPath();
 ctx.moveTo(a.x,a.y);
 ctx.lineTo(b.x,b.y);
 ctx.stroke();
}
function circle(p,r,fill,stroke){
 ctx.beginPath();
 ctx.arc(p.x,p.y,r,0,Math.PI*2);
 ctx.fillStyle=fill;
 ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
}

function drawRoom(){
 const g=ctx.createLinearGradient(0,0,0,560);
 g.addColorStop(0,state.xray?'#172636':'#dff3f8');
 g.addColorStop(1,state.xray?'#203244':'#f6fbfd');
 ctx.fillStyle=g;
 ctx.fillRect(0,0,960,560);
 ctx.fillStyle=state.xray?'#294154':'#cfe4ea';
 ctx.fillRect(0,500,960,60);
 ctx.fillStyle=state.xray?'rgba(255,255,255,.08)':'rgba(255,255,255,.58)';
 ctx.fillRect(0,0,960,74);
 ctx.fillStyle=state.xray?'#9fc5d9':'#5d7b8b';
 ctx.font='700 15px system-ui';
 ctx.fillText(state.xray?'X-RAY 관찰 모드 · 수축한 근육이 더 굵게 보여요':'근육을 직접 조종해 목표를 해결하세요',28,45);
}

function drawArmObjects(){
 const m=state.mission;
 if(m===0){
  ctx.save();
  ctx.setLineDash([10,8]);
  ctx.strokeStyle=state.xray?'#7dd3fc':'#2f80ed';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(468,300);
  ctx.lineTo(620,300);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle=state.xray?'#bae6fd':'#1d5fb9';
  ctx.font='800 14px system-ui';
  ctx.fillText('손이 이 선 위로 올라오면 성공!',470,282);
  ctx.restore();
 }
 if(m===1){
  ctx.fillStyle=state.xray?'#334b61':'#fff';
  ctx.fillRect(640,170,26,270);
  ctx.fillStyle=state.buttonPressed?'#18a77a':'#3b82f6';
  ctx.beginPath();
  ctx.arc(pushButton.x,pushButton.y,pushButton.r,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#fff';
  ctx.font='900 14px system-ui';
  ctx.textAlign='center';
  ctx.fillText('PUSH',pushButton.x,pushButton.y+5);
  ctx.textAlign='left';
 }
 if(m===2){
  ctx.fillStyle=state.xray?'#355064':'#a77245';
  ctx.fillRect(470,365,220,18);
  ctx.fillRect(490,383,15,117);
  ctx.fillRect(655,383,15,117);
  drawBasket();
  drawApple();
 }
}

function drawBasket(){
 ctx.fillStyle=state.xray?'#d5b36a':'#d99a4e';
 ctx.fillRect(basket.x,basket.y,basket.w,basket.h);
 ctx.fillStyle=state.xray?'#203244':'#b8742c';
 for(let x=basket.x+12;x<basket.x+basket.w;x+=18)ctx.fillRect(x,basket.y+8,5,basket.h-16);
 ctx.strokeStyle=state.xray?'#f0d28c':'#8b5728';
 ctx.lineWidth=5;
 ctx.strokeRect(basket.x,basket.y,basket.w,basket.h);
}

function drawApple(){
 const a=state.apple;
 circle(a,16,state.xray?'#ff8b76':'#ef5144','#b32f28');
 ctx.strokeStyle='#4f7b35';
 ctx.lineWidth=4;
 ctx.beginPath();
 ctx.moveTo(a.x,a.y-15);
 ctx.lineTo(a.x+3,a.y-24);
 ctx.stroke();
 if(a.held){
  ctx.fillStyle='#159a72';
  ctx.font='800 12px system-ui';
  ctx.fillText('잡는 중',a.x-22,a.y-28);
 }
}

function drawArm(){
 const p=armPose();
 if(state.xray){
  line(p.shoulder,p.elbow,22,'rgba(255,255,255,.15)');
  line(p.elbow,p.hand,19,'rgba(255,255,255,.15)');
  line(p.shoulder,p.elbow,8,'#f2eadc');
  line(p.elbow,p.hand,7,'#f2eadc');
  circle(p.shoulder,10,'#f2eadc');
  circle(p.elbow,9,'#f2eadc');
  circle(p.hand,13,'#f2eadc');
  drawArmMuscles(p,true);
 }else{
  line(p.shoulder,p.elbow,36,'#f4b69f');
  line(p.elbow,p.hand,31,'#f4b69f');
  circle(p.shoulder,23,'#f2aa90','#bd765f');
  circle(p.elbow,18,'#f0a88f','#bd765f');
  circle(p.hand,rig.handR,'#f3b298','#bd765f');
  drawArmMuscles(p,false);
 }
 ctx.fillStyle=state.xray?'#dceaf2':'#29465b';
 ctx.beginPath();
 ctx.arc(255,250,62,0,Math.PI*2);
 ctx.fill();
 ctx.fillStyle=state.xray?'rgba(255,255,255,.16)':'#466b82';
 ctx.fillRect(250,295,100,205);
 ctx.fillStyle=state.xray?'#dceaf2':'#f4b69f';
 ctx.beginPath();
 ctx.arc(255,250,48,0,Math.PI*2);
 ctx.fill();
}

function drawArmMuscles(p,xray){
 const q=activation.q,w=activation.w,e=activation.e,r=activation.r;
 const midUpper={x:lerp(p.shoulder.x,p.elbow.x,.5),y:lerp(p.shoulder.y,p.elbow.y,.5)};
 const perp={x:-Math.sin(p.a),y:Math.cos(p.a)};
 const b1={x:p.shoulder.x+perp.x*11,y:p.shoulder.y+perp.y*11};
 const b2={x:p.elbow.x+perp.x*8,y:p.elbow.y+perp.y*8};
 const t1={x:p.shoulder.x-perp.x*11,y:p.shoulder.y-perp.y*11};
 const t2={x:p.elbow.x-perp.x*8,y:p.elbow.y-perp.y*8};
 ctx.globalAlpha=xray?.92:.38;
 line(b1,b2,8+q*11,'#e84c4f');
 line(t1,t2,7+w*10,'#c63c61');
 circle({x:p.shoulder.x-2,y:p.shoulder.y-4},14+e*7,'#ef6b54');
 circle(p.hand,9+r*8,'#d84a76');
 ctx.globalAlpha=1;
 if(xray){
  ctx.fillStyle='#f8d0d0';
  ctx.font='700 12px system-ui';
  if(q>.08)ctx.fillText('위팔 앞쪽 수축',midUpper.x+16,midUpper.y-18);
  if(w>.08)ctx.fillText('위팔 뒤쪽 수축',midUpper.x+12,midUpper.y+28);
  if(e>.08)ctx.fillText('어깨 수축',p.shoulder.x-38,p.shoulder.y-36);
  if(r>.08)ctx.fillText('손 근육 수축',p.hand.x+18,p.hand.y-18);
 }
}

function bodyPose(){
 const b=state.body,m=currentMission(),floor=500;
 const stand=m.target==='stand'?clamp(b.stand,0,1):1;
 const fall=b.fall>0?(1-b.fall/.78):0;
 const lean=b.lean+fall*1;
 const hip={x:360+Math.sin(lean)*18,y:420-stand*108+fall*88};
 const shoulder={x:hip.x+Math.sin(lean)*88,y:hip.y-Math.cos(lean)*118};
 const head={x:shoulder.x+Math.sin(lean)*34,y:shoulder.y-Math.cos(lean)*48};
 const cycle=b.gait;
 let leftStride=Math.sin(cycle)*42;
 let rightStride=Math.sin(cycle+Math.PI)*42;
 let leftLift=Math.max(0,-Math.cos(cycle))*15;
 let rightLift=Math.max(0,-Math.cos(cycle+Math.PI))*15;
 if(m.target==='stand'){
  leftStride=-30*(1-stand);
  rightStride=30*(1-stand);
  leftLift=0;
  rightLift=0;
 }
 const leftFoot={x:hip.x-24+leftStride,y:floor-leftLift};
 const rightFoot={x:hip.x+24+rightStride,y:floor-rightLift};
 const knee=(foot,side)=>{
  const mx=(hip.x+foot.x)/2,my=(hip.y+foot.y)/2;
  const bend=34+(m.target==='stand'?(1-stand)*42:Math.abs(side===0?leftStride:rightStride)*.25);
  return{x:mx+(side===0?-1:1)*bend,y:my+6};
 };
 const leftKnee=knee(leftFoot,0);
 const rightKnee=knee(rightFoot,1);
 const leftHand={x:shoulder.x-54+Math.sin(cycle+Math.PI)*12,y:shoulder.y+80};
 const rightHand={x:shoulder.x+54+Math.sin(cycle)*12,y:shoulder.y+80};
 return{hip,shoulder,head,leftKnee,rightKnee,leftFoot,rightFoot,leftHand,rightHand,lean,stand,floor};
}

function drawBodyScene(){
 const m=currentMission(),b=state.body;
 ctx.strokeStyle=state.xray?'#3d566b':'#aac5d1';
 ctx.lineWidth=2;
 for(let i=0;i<7;i++){
  const x=175+i*110-((b.distance*90)%110);
  ctx.beginPath();
  ctx.moveTo(x,488);
  ctx.lineTo(x,512);
  ctx.stroke();
 }
 ctx.fillStyle=state.xray?'#9fc5d9':'#5d7b8b';
 ctx.font='700 12px system-ui';
 ctx.fillText('이동 '+b.distance.toFixed(1)+'m',760,46);
 if(m.target==='stand'){
  ctx.fillStyle=state.xray?'#405469':'#b77a4b';
  ctx.fillRect(245,382,95,16);
  ctx.fillRect(250,398,13,102);
  ctx.fillRect(318,398,13,102);
 }
 if(m.target==='walk')drawFinishLine(3);
 if(m.target==='obstacle'){drawObstacle();drawFinishLine(3.4)}
 if(m.target==='box')drawFinishLine(3);
 if(m.target==='tray')drawFinishLine(4);
 drawBodyProgress();
}

function worldX(meters){return 360+(meters-state.body.distance)*190}

function drawFinishLine(meters){
 const x=worldX(meters);
 ctx.strokeStyle='#2f80ed';
 ctx.lineWidth=5;
 ctx.setLineDash([12,10]);
 ctx.beginPath();
 ctx.moveTo(x,135);
 ctx.lineTo(x,500);
 ctx.stroke();
 ctx.setLineDash([]);
 ctx.fillStyle='#1d5fb9';
 ctx.font='900 14px system-ui';
 ctx.fillText('목표',x+9,154);
}

function drawObstacle(){
 const x=worldX(1.65);
 ctx.fillStyle=state.xray?'#ae7c54':'#ea8a36';
 ctx.fillRect(x-28,454,56,46);
 ctx.fillStyle=state.xray?'#f4d4a8':'#fff3da';
 ctx.fillRect(x-28,466,56,9);
}

function drawBox(){
 const p=bodyPose();
 const x=(p.leftHand.x+p.rightHand.x)/2-37;
 const y=(p.leftHand.y+p.rightHand.y)/2-12;
 ctx.save();
 ctx.translate(x+37,y+27);
 ctx.rotate(state.body.lean*.16);
 ctx.fillStyle=state.xray?'#b78d59':'#c98b48';
 ctx.fillRect(-37,-27,74,54);
 ctx.strokeStyle='#80542c';
 ctx.lineWidth=3;
 ctx.strokeRect(-37,-27,74,54);
 ctx.restore();
}

function drawTray(){
 const p=bodyPose(),tilt=state.body.trayTilt;
 const x=(p.leftHand.x+p.rightHand.x)/2;
 const y=(p.leftHand.y+p.rightHand.y)/2-5;
 ctx.save();
 ctx.translate(x,y);
 ctx.rotate(tilt);
 ctx.fillStyle=state.xray?'#c7d2da':'#536b7a';
 ctx.fillRect(-64,-7,128,14);
 const meal=state.body.meal/100;
 ctx.fillStyle='#f4d35e';
 ctx.beginPath();
 ctx.arc(-28,-15,13*meal+.5,0,Math.PI*2);
 ctx.fill();
 ctx.fillStyle='#8fcf79';
 ctx.fillRect(2,-25,27*meal,-10);
 ctx.fillStyle='#9ed0e8';
 ctx.fillRect(40,-34,15,27*meal);
 ctx.restore();
}

function drawBodyProgress(){
 const m=currentMission(),b=state.body;
 ctx.fillStyle=state.xray?'rgba(255,255,255,.1)':'rgba(255,255,255,.75)';
 ctx.fillRect(650,84,270,42);
 ctx.fillStyle=state.xray?'#9fc5d9':'#526b7b';
 ctx.font='700 12px system-ui';
 const txt=m.target==='tray'?'급식 남은 양 '+Math.round(b.meal)+'%':m.target==='stand'?'일어서기 '+Math.round(b.stand*100)+'%':'몸 기울기 '+Math.round(Math.abs(b.lean)*100);
 ctx.fillText(txt,665,101);
 ctx.fillStyle='#dfe9ee';
 ctx.fillRect(665,109,236,8);
 ctx.fillStyle=Math.abs(b.lean)>.45?'#e66f62':'#43a783';
 ctx.fillRect(665,109,236*clamp(1-Math.abs(b.lean),0,1),8);
}

function drawFullBody(){
 const p=bodyPose(),m=currentMission();
 const bone=state.xray?'#f2eadc':'#f3b298';
 const joint=state.xray?'#f2eadc':'#d68d77';
 const skin=state.xray?'rgba(255,255,255,.13)':'#f4b69f';
 if(state.xray){
  line(p.hip,p.shoulder,9,bone);
  line(p.hip,p.leftKnee,8,bone);
  line(p.leftKnee,p.leftFoot,7,bone);
  line(p.hip,p.rightKnee,8,bone);
  line(p.rightKnee,p.rightFoot,7,bone);
  line(p.shoulder,p.leftHand,7,bone);
  line(p.shoulder,p.rightHand,7,bone);
  circle(p.hip,10,joint);
  circle(p.leftKnee,9,joint);
  circle(p.rightKnee,9,joint);
  circle(p.head,25,'rgba(242,234,220,.85)');
 }else{
  line(p.hip,p.shoulder,54,skin);
  line(p.hip,p.leftKnee,29,skin);
  line(p.leftKnee,p.leftFoot,25,skin);
  line(p.hip,p.rightKnee,29,skin);
  line(p.rightKnee,p.rightFoot,25,skin);
  line(p.shoulder,p.leftHand,24,skin);
  line(p.shoulder,p.rightHand,24,skin);
  circle(p.head,34,skin,'#bd765f');
  circle(p.leftKnee,14,joint);
  circle(p.rightKnee,14,joint);
  ctx.fillStyle='#42657b';
  ctx.save();
  ctx.translate(p.shoulder.x,p.shoulder.y+50);
  ctx.rotate(p.lean);
  ctx.fillRect(-36,-56,72,112);
  ctx.restore();
 }
 drawBodyMuscles(p);
 if(m.target==='box')drawBox();
 if(m.target==='tray')drawTray();
}

function drawBodyMuscles(p){
 const xray=state.xray,m=currentMission();
 ctx.globalAlpha=xray?.94:.34;
 if(m.target==='stand'){
  line(p.hip,p.leftKnee,8+activation.q*12,'#e84c4f');
  line(p.hip,p.rightKnee,8+activation.q*12,'#e84c4f');
  circle({x:p.hip.x,y:p.hip.y+8},12+activation.w*10,'#c63c61');
  line(p.leftKnee,p.leftFoot,7+activation.e*9,'#ef6b54');
  line(p.rightKnee,p.rightFoot,7+activation.e*9,'#ef6b54');
  line(p.hip,p.shoulder,7+activation.r*10,'#d84a76');
 }else if(m.target==='box'){
  line(p.hip,p.leftKnee,8+activation.q*9,'#e84c4f');
  line(p.hip,p.rightKnee,8+activation.w*9,'#e84c4f');
  line(p.shoulder,p.leftHand,7+activation.e*9,'#ef6b54');
  line(p.shoulder,p.rightHand,7+activation.e*9,'#ef6b54');
  line(p.hip,p.shoulder,7+activation.r*9,'#d84a76');
 }else if(m.target==='tray'){
  line(p.hip,p.leftKnee,8+activation.q*9,'#e84c4f');
  line(p.hip,p.rightKnee,8+activation.w*9,'#c63c61');
  line(p.shoulder,p.leftHand,7+activation.e*9,'#ef6b54');
  line(p.shoulder,p.rightHand,7+activation.r*9,'#d84a76');
 }else{
  line(p.hip,p.leftKnee,8+activation.q*10,'#e84c4f');
  line(p.leftKnee,p.leftFoot,7+activation.w*9,'#ef6b54');
  line(p.hip,p.rightKnee,8+activation.e*10,'#c63c61');
  line(p.rightKnee,p.rightFoot,7+activation.r*9,'#d84a76');
 }
 ctx.globalAlpha=1;
 if(xray){
  ctx.fillStyle='#f8d0d0';
  ctx.font='700 11px system-ui';
  ctx.fillText('근육',p.hip.x-17,p.hip.y-20);
  ctx.fillStyle='#d7effb';
  ctx.fillText('뼈',p.leftKnee.x-8,p.leftKnee.y+28);
 }
}

function render(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 drawRoom();
 if(currentMission().mode==='arm'){
  drawArmObjects();
  drawArm();
  if(state.mission===2&&state.apple.y>500){
   ctx.fillStyle='#b45309';
   ctx.font='800 13px system-ui';
   ctx.fillText('사과가 떨어졌어요. 다시 잡거나 실험을 다시 시작해도 돼요!',510,540);
  }
 }else{
  drawBodyScene();
  drawFullBody();
 }
}

function tick(now){
 const dt=clamp((now-state.lastTime)/1000,0,.033);
 state.lastTime=now;
 update(dt);
 render();
 requestAnimationFrame(tick);
}

function toggleXray(){
 state.xray=!state.xray;
 els.xrayBtn.classList.toggle('on',state.xray);
 els.xrayBtn.setAttribute('aria-pressed',state.xray?'true':'false');
 showToast(state.xray?'뼈와 근육을 관찰해요':'일반 화면으로 돌아왔어요');
}

function showTutorial(){els.tutorial.classList.remove('hidden')}
function hideTutorial(){
 els.tutorial.classList.add('hidden');
 try{localStorage.setItem('kidscade_body_lab_tutorial_v2','1')}catch(_){}
 try{window.KidscadeGame?.start?.({mission:1})}catch(_){}
}

window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();
 if(k in inputs&&!e.repeat){
  e.preventDefault();
  setInput(k,true);
 }
 if(e.key==='Escape'&&!els.tutorial.classList.contains('hidden'))els.tutorial.classList.add('hidden');
});
window.addEventListener('keyup',e=>{
 const k=e.key.toLowerCase();
 if(k in inputs){
  e.preventDefault();
  setInput(k,false);
 }
});
window.addEventListener('blur',()=>Object.keys(inputs).forEach(k=>setInput(k,false)));

keyButtons.forEach(btn=>{
 const k=btn.dataset.key;
 const on=e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);setInput(k,true)};
 const off=e=>{e.preventDefault();setInput(k,false)};
 btn.addEventListener('pointerdown',on);
 btn.addEventListener('pointerup',off);
 btn.addEventListener('pointercancel',off);
 btn.addEventListener('lostpointercapture',off);
});

els.xrayBtn.addEventListener('click',toggleXray);
els.helpBtn.addEventListener('click',showTutorial);
els.resetBtn.addEventListener('click',()=>{resetMission();showToast('현재 실험을 다시 시작했어요')});
els.nextBtn.addEventListener('click',nextMission);
els.tutorialStart.addEventListener('click',hideTutorial);

try{
 window.KidscadeGame?.registerPauseHandlers?.({
  pause(){state.paused=true;Object.keys(inputs).forEach(k=>inputs[k]=false);syncControls()},
  resume(){state.paused=false;state.lastTime=performance.now()}
 });
}catch(_){}

resetMission();
let seen=false;
try{seen=localStorage.getItem('kidscade_body_lab_tutorial_v2')==='1'}catch(_){}
if(!seen)showTutorial();
else try{window.KidscadeGame?.start?.({mission:1})}catch(_){}
requestAnimationFrame(tick);
})();
