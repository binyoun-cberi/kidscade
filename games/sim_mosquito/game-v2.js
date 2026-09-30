(function(){
"use strict";

var canvas = document.getElementById("gameCanvas");
var ctx = canvas.getContext("2d");
var W = 1280, H = 720, WORLD_W = 2600, WORLD_H = 1600;
var $ = function(id){ return document.getElementById(id); };
var clamp = function(v,a,b){ return Math.max(a,Math.min(b,v)); };
var lerp = function(a,b,t){ return a+(b-a)*t; };
var dist = function(ax,ay,bx,by){ var dx=ax-bx,dy=ay-by; return Math.sqrt(dx*dx+dy*dy); };
var rand = function(a,b){ return a+Math.random()*(b-a); };

var STAGES = [
 {title:"첫 번째 밤",sub:"잠든 사람",target:55,aware:1.00,attack:5.5,blanket:0,fact:"사람이나 동물의 피를 빠는 것은 암컷 모기입니다. 많은 암컷 모기는 알을 만들기 위해 혈액이 필요해요."},
 {title:"두 번째 밤",sub:"선풍기 바람",target:65,aware:1.05,attack:5.0,blanket:0,fan:true,fact:"모기는 사람의 숨에서 나오는 이산화탄소를 중요한 단서로 이용합니다. 흰 숨결을 따라 사람의 위치를 찾아보세요."},
 {title:"세 번째 밤",sub:"연기 나는 방",target:70,aware:1.10,attack:4.7,blanket:0,incense:true,fact:"모기는 한 가지 감각만 쓰지 않습니다. 냄새, 이산화탄소, 시각 정보와 가까운 거리의 열 단서를 함께 이용해 숙주를 찾습니다."},
 {title:"네 번째 밤",sub:"이불 요새",target:75,aware:1.12,attack:4.4,blanket:2,fact:"피부가 모두 같은 위험도를 가진 것은 아닙니다. 게임에서는 얼굴은 찾기 쉽지만 손 공격 위험이 크고, 발목은 비교적 안전하게 설계했습니다."},
 {title:"다섯 번째 밤",sub:"뒤척이는 사람",target:80,aware:1.18,attack:4.0,blanket:1,moving:true,fact:"모기의 큰 겹눈은 움직임을 감지합니다. 사람도 모기의 움직임과 소리에 반응하므로 오래 머무를수록 들킬 위험이 커집니다."},
 {title:"여섯 번째 밤",sub:"두 사람의 방",target:85,aware:1.22,attack:3.7,blanket:1,moving:true,double:true,fact:"흡혈할 때 모기가 넣는 침에 우리 몸이 반응하면서 붓고 가려울 수 있습니다."},
 {title:"마지막 밤",sub:"한 입만 더",target:90,aware:1.32,attack:3.2,blanket:1,moving:true,double:true,fan:true,incense:true,racket:true,fact:"배를 채우는 것만으로는 끝이 아닙니다. 피를 많이 먹을수록 무거워진 몸으로 안전한 곳까지 돌아와야 합니다."}
];

var input = {keys:{}, pointer:false, bite:false, sx:W/2, sy:H/2};
var game = {
 mode:"title", stageIndex:0, stage:null, blood:0, alert:0, score:0, totalScore:0, time:0,
 returning:false, camera:{x:0,y:0}, attacks:[], particles:[], attackClock:5, hostPulse:0,
 smoke:0, racketClock:0, last:performance.now(), hosts:[], tipTimer:0
};

var mosquito = {
 x:260,y:230,vx:0,vy:0,r:14,heading:0,feeding:false,stun:0,glance:0,swelling:0
};

var nest = {x:245,y:225,r:72};
var fan = {x:420,y:1120};
var incense = {x:2190,y:1190,r:330};

function stage(){ return STAGES[game.stageIndex]; }

function buildHosts(){
 game.hosts = [{x:1370,y:355,phase:0}];
 if(stage().double) game.hosts.push({x:1840,y:355,phase:1.7});
}

function hostOffset(h){
 if(!stage().moving) return {x:0,y:0};
 return {x:Math.sin(game.time*1.15+h.phase)*28,y:Math.sin(game.time*0.72+h.phase)*10};
}

function zonesForHost(h){
 var o=hostOffset(h), x=h.x+o.x, y=h.y+o.y;
 var z=[
  {id:"face",label:"얼굴",x:x,y:y+75,r:76,risk:1.55,rate:1.22},
  {id:"armL",label:"왼팔",x:x-145,y:y+325,r:52,risk:1.02,rate:1.02},
  {id:"armR",label:"오른팔",x:x+145,y:y+325,r:52,risk:1.02,rate:1.02},
  {id:"ankleL",label:"왼발목",x:x-62,y:y+675,r:43,risk:0.72,rate:0.92},
  {id:"ankleR",label:"오른발목",x:x+62,y:y+675,r:43,risk:0.72,rate:0.92}
 ];
 if(stage().blanket===1) z=z.filter(function(a){return a.id==="face"||a.id==="armR"||a.id==="ankleL"||a.id==="ankleR";});
 if(stage().blanket===2) z=z.filter(function(a){return a.id==="face"||a.id==="ankleR";});
 return z;
}

function allZones(){
 var out=[];
 game.hosts.forEach(function(h){ zonesForHost(h).forEach(function(z){out.push(z);}); });
 return out;
}

function currentZone(){
 var zs=allZones(), best=null, bd=1e9;
 for(var i=0;i<zs.length;i++){
  var d=dist(mosquito.x,mosquito.y,zs[i].x,zs[i].y);
  if(d<zs[i].r+25 && d<bd){best=zs[i];bd=d;}
 }
 return best;
}

function setupStage(index, keepScore){
 game.stageIndex=clamp(index,0,STAGES.length-1);
 game.stage=stage();
 game.blood=0; game.alert=0; game.time=0; game.returning=false; game.attacks=[]; game.particles=[];
 game.attackClock=stage().attack; game.smoke=0; game.racketClock=0; game.hostPulse=0;
 if(!keepScore) game.totalScore=0;
 mosquito.x=nest.x; mosquito.y=nest.y; mosquito.vx=0; mosquito.vy=0; mosquito.feeding=false;
 mosquito.stun=0; mosquito.glance=0; mosquito.swelling=0;
 buildHosts();
 game.camera.x=0; game.camera.y=0;
 updateOverlayForStage();
 updateUI();
}

function startGame(){
 audio.init();
 setupStage(0,false);
 game.mode="playing";
 $("startScreen").classList.add("hidden");
 $("resultScreen").classList.add("hidden");
 $("biteBtn").classList.remove("hidden");
 game.last=performance.now();
}

function retryStage(){
 setupStage(game.stageIndex,true);
 game.mode="playing";
 $("resultScreen").classList.add("hidden");
 $("biteBtn").classList.remove("hidden");
 game.last=performance.now();
}

function nextStage(){
 if(game.stageIndex>=STAGES.length-1){ startGame(); return; }
 setupStage(game.stageIndex+1,true);
 game.mode="playing";
 $("resultScreen").classList.add("hidden");
 $("biteBtn").classList.remove("hidden");
 game.last=performance.now();
}

function updateOverlayForStage(){
 $("stageIntro").textContent=stage().title+" · "+stage().sub;
 $("goalText").textContent="혈액 "+stage().target+"만큼 모은 뒤 커튼 둥지로 돌아오세요.";
}

function stageClear(){
 if(game.mode!=="playing") return;
 game.mode="clear";
 $("biteBtn").classList.add("hidden");
 var speedBonus=Math.max(0,Math.round(520-game.time*7));
 var calmBonus=Math.max(0,Math.round((100-game.alert)*3));
 var nightScore=1000+speedBonus+calmBonus;
 game.totalScore+=nightScore;
 var best=parseInt(localStorage.getItem("mosquitoHighScore")||"0",10);
 if(game.totalScore>best) localStorage.setItem("mosquitoHighScore",String(game.totalScore));
 $("resultTitle").textContent=game.stageIndex===STAGES.length-1?"7일 생존 성공!":"밤을 넘겼어요!";
 $("resultDesc").innerHTML="이번 밤 <b>"+nightScore+"점</b> · 누적 <b>"+game.totalScore+"점</b><br><span class='fact'>"+stage().fact+"</span>";
 $("resultBtn").textContent=game.stageIndex===STAGES.length-1?"처음부터 다시":"다음 밤";
 $("resultBtn").onclick=nextStage;
 $("resultScreen").classList.remove("hidden");
 audio.relax();
}

function die(reason){
 if(game.mode!=="playing") return;
 game.mode="dead";
 $("biteBtn").classList.add("hidden");
 $("resultTitle").textContent="찰싹!";
 $("resultDesc").innerHTML=reason+"<br><span class='fact'>피를 오래 빨수록 더 많이 얻지만, 사람의 경계도 빠르게 올라갑니다.</span>";
 $("resultBtn").textContent="이 밤 다시 도전";
 $("resultBtn").onclick=retryStage;
 $("resultScreen").classList.remove("hidden");
 audio.slap();
}

function addAttack(kind){
 var t={kind:kind,x:mosquito.x,y:mosquito.y,t:0,warn:1.05,hit:false,done:false};
 if(kind==="swipe") t.horizontal=Math.random()<0.5;
 game.attacks.push(t);
 game.alert=Math.max(18,game.alert-34);
 game.attackClock=stage().attack+rand(0.4,2.2);
}

function chooseAttack(){
 var r=Math.random();
 if(r<0.46) addAttack("slam");
 else if(r<0.78) addAttack("swipe");
 else addAttack("clap");
}

function updateAttacks(dt){
 for(var i=game.attacks.length-1;i>=0;i--){
  var a=game.attacks[i]; a.t+=dt;
  if(!a.hit && a.t>=a.warn){
   a.hit=true; audio.slap();
   var fatal=false, glance=false;
   if(a.kind==="slam"){
    var d=dist(mosquito.x,mosquito.y,a.x,a.y);
    fatal=d<125; glance=!fatal&&d<160;
   }else if(a.kind==="swipe"){
    if(a.horizontal){
     fatal=Math.abs(mosquito.y-a.y)<56 && Math.abs(mosquito.x-a.x)<470;
     glance=!fatal&&Math.abs(mosquito.y-a.y)<88&&Math.abs(mosquito.x-a.x)<520;
    }else{
     fatal=Math.abs(mosquito.x-a.x)<56 && Math.abs(mosquito.y-a.y)<330;
     glance=!fatal&&Math.abs(mosquito.x-a.x)<88&&Math.abs(mosquito.y-a.y)<380;
    }
   }else{
    fatal=Math.abs(mosquito.x-a.x)<86&&Math.abs(mosquito.y-a.y)<190;
    glance=!fatal&&Math.abs(mosquito.x-a.x)<115&&Math.abs(mosquito.y-a.y)<235;
   }
   if(fatal){die("손 공격을 피하지 못했습니다."); return;}
   if(glance){ mosquito.glance=1.8; }
  }
  if(a.t>a.warn+0.65) game.attacks.splice(i,1);
 }
}

function racketState(){
 if(!stage().racket) return null;
 var cycle=game.racketClock%8.5;
 if(cycle<1.15) return {mode:"warn",x:2280,y:670};
 if(cycle<3.15){
  var p=(cycle-1.15)/2.0;
  return {mode:"active",x:lerp(2280,620,p),y:670+Math.sin(p*Math.PI)*85};
 }
 return null;
}

function updateHazards(dt){
 if(stage().fan){
  var dx=mosquito.x-fan.x, dy=mosquito.y-fan.y;
  if(dx>0&&dx<1050&&Math.abs(dy)<280){
   var strength=(1-dx/1050)*(1-Math.abs(dy)/280);
   mosquito.vx+=520*strength*dt;
   mosquito.vy+=dy*0.55*strength*dt;
  }
 }
 if(stage().incense){
  var d=dist(mosquito.x,mosquito.y,incense.x,incense.y);
  if(d<incense.r){
   game.smoke=clamp(game.smoke+dt*0.8,0,1);
   var nx=(mosquito.x-incense.x)/(d||1),ny=(mosquito.y-incense.y)/(d||1);
   mosquito.vx+=nx*520*dt; mosquito.vy+=ny*520*dt;
   mosquito.stun=Math.max(mosquito.stun,0.12);
  }else game.smoke=Math.max(0,game.smoke-dt*0.45);
  if(game.smoke>=1){die("연기 속에 너무 오래 머물렀습니다.");return;}
 }
 if(stage().racket){
  game.racketClock+=dt;
  var r=racketState();
  if(r&&r.mode==="active"){
   if(Math.abs(mosquito.x-r.x)<38&&Math.abs(mosquito.y-r.y)<175){die("전기 모기채에 닿았습니다.");return;}
  }
 }
}

function updateParticles(dt){
 for(var h=0;h<game.hosts.length;h++){
  var host=game.hosts[h],o=hostOffset(host);
  var mouth={x:host.x+o.x+28,y:host.y+o.y+92};
  if(Math.random()<dt*5){
   game.particles.push({x:mouth.x,y:mouth.y,vx:rand(18,42),vy:rand(-18,18),life:3.5,max:3.5,r:rand(5,10)});
  }
 }
 for(var i=game.particles.length-1;i>=0;i--){
  var p=game.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.r+=4*dt;
  if(p.life<=0) game.particles.splice(i,1);
 }
}

function updateHuman(dt, z, feeding){
 var nearHead=false;
 game.hosts.forEach(function(h){
  var o=hostOffset(h);
  if(dist(mosquito.x,mosquito.y,h.x+o.x,h.y+o.y+70)<210) nearHead=true;
 });
 if(nearHead&&!feeding) game.alert+=2.4*stage().aware*dt;
 if(feeding&&z) game.alert+=7.5*z.risk*stage().aware*dt;
 else game.alert-=3.8*dt;
 game.alert=clamp(game.alert,0,100);
 if(game.alert>54&&game.attacks.length===0){
  game.attackClock-=dt*(0.65+game.alert/100);
  if(game.alert>=96||game.attackClock<=0) chooseAttack();
 }
 if(stage().moving){
  game.hostPulse+=dt;
  if(game.hostPulse>6.2){
   game.hostPulse=0;
   if(feeding){game.alert=clamp(game.alert+18,0,100);mosquito.feeding=false;}
  }
 }
}

function updateMosquito(dt){
 if(mosquito.stun>0) mosquito.stun-=dt;
 if(mosquito.glance>0) mosquito.glance-=dt;
 var bloodRatio=clamp(game.blood/stage().target,0,1);
 var baseSpeed=620*(1-0.28*bloodRatio);
 if(mosquito.glance>0) baseSpeed*=0.58;
 if(mosquito.stun>0) baseSpeed*=0.55;
 var accel=2300;
 var ax=0,ay=0;
 if(input.keys["ArrowLeft"]||input.keys["KeyA"]) ax-=1;
 if(input.keys["ArrowRight"]||input.keys["KeyD"]) ax+=1;
 if(input.keys["ArrowUp"]||input.keys["KeyW"]) ay-=1;
 if(input.keys["ArrowDown"]||input.keys["KeyS"]) ay+=1;
 if(ax||ay){
  var l=Math.sqrt(ax*ax+ay*ay); ax/=l;ay/=l;
  mosquito.vx+=ax*accel*dt;mosquito.vy+=ay*accel*dt;
 }else if(input.pointer){
  var tx=input.sx+game.camera.x,ty=input.sy+game.camera.y;
  var dx=tx-mosquito.x,dy=ty-mosquito.y,l2=Math.sqrt(dx*dx+dy*dy);
  if(l2>18){mosquito.vx+=dx/l2*accel*dt;mosquito.vy+=dy/l2*accel*dt;}
 }
 var z=currentZone();
 var biteHeld=input.bite||input.keys["Space"]||input.keys["KeyE"];
 mosquito.feeding=!!(biteHeld&&z&&!game.returning);
 if(mosquito.feeding){
  mosquito.vx*=Math.pow(0.22,dt);mosquito.vy*=Math.pow(0.22,dt);
  var gain=(7.5+game.blood*0.045)*z.rate*dt;
  game.blood=clamp(game.blood+gain,0,stage().target);
  mosquito.swelling=clamp(mosquito.swelling+dt*8,0,14);
  if(game.blood>=stage().target){game.returning=true;mosquito.feeding=false;audio.chime();}
 }else{
  mosquito.swelling=Math.max(0,mosquito.swelling-dt*5);
 }
 updateHuman(dt,z,mosquito.feeding);
 var friction=Math.pow(0.90,dt*60);
 mosquito.vx*=friction;mosquito.vy*=friction;
 var sp=Math.sqrt(mosquito.vx*mosquito.vx+mosquito.vy*mosquito.vy);
 if(sp>baseSpeed){mosquito.vx=mosquito.vx/sp*baseSpeed;mosquito.vy=mosquito.vy/sp*baseSpeed;sp=baseSpeed;}
 if(sp>45) mosquito.heading=Math.atan2(mosquito.vy,mosquito.vx);
 mosquito.x=clamp(mosquito.x+mosquito.vx*dt,20,WORLD_W-20);
 mosquito.y=clamp(mosquito.y+mosquito.vy*dt,20,WORLD_H-20);
 audio.buzz(sp,mosquito.feeding,game.alert);
 if(game.returning&&dist(mosquito.x,mosquito.y,nest.x,nest.y)<nest.r){stageClear();}
}

function updateCamera(){
 var tx=clamp(mosquito.x-W/2,0,WORLD_W-W),ty=clamp(mosquito.y-H/2,0,WORLD_H-H);
 game.camera.x=lerp(game.camera.x,tx,0.09); game.camera.y=lerp(game.camera.y,ty,0.09);
}

function update(dt){
 game.time+=dt;
 updateMosquito(dt);
 if(game.mode!=="playing") return;
 updateHazards(dt);
 if(game.mode!=="playing") return;
 updateAttacks(dt);
 updateParticles(dt);
 updateCamera();
 updateUI();
}

function humanState(){
 if(game.alert<25) return "😴 깊은 잠";
 if(game.alert<55) return "😐 뒤척임";
 if(game.alert<82) return "😠 눈치챔";
 return "👋 곧 공격!";
}

function updateUI(){
 var pct=clamp(game.blood/stage().target*100,0,100);
 $("bloodFill").style.width=pct+"%";
 $("bloodText").textContent=Math.floor(game.blood)+" / "+stage().target;
 $("alertFill").style.width=game.alert+"%";
 $("alertText").textContent=Math.floor(game.alert)+"%";
 $("nightText").textContent=(game.stageIndex+1)+" / 7";
 $("scoreText").textContent=game.totalScore;
 $("humanText").textContent=humanState();
 $("stageIntro").textContent=stage().title+" · "+stage().sub;
 if(game.returning){
  $("hint").innerHTML="<b>배가 찼어요!</b> 왼쪽 위 커튼의 둥지로 돌아가세요. 피를 많이 먹어 비행 속도가 느려졌습니다.";
 }else{
  var z=currentZone();
  if(z) $("hint").innerHTML="<b>"+z.label+"</b> · 흡혈 가능 · 위험도 "+(z.risk>1.3?"높음":z.risk<0.8?"낮음":"보통");
  else $("hint").textContent="흰 숨결(CO₂)로 사람을 찾고, 가까이 가면 따뜻한 피부 단서를 확인하세요.";
 }
 $("smokeMeter").style.opacity=game.smoke>0.02?"1":"0";
 $("smokeFill").style.width=(game.smoke*100)+"%";
}

function drawRoom(){
 ctx.fillStyle="#392f33";ctx.fillRect(0,0,WORLD_W,WORLD_H);
 ctx.strokeStyle="rgba(255,255,255,.035)";ctx.lineWidth=2;
 for(var y=0;y<WORLD_H;y+=90){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke();}
 for(var x=0;x<WORLD_W;x+=240){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_H);ctx.stroke();}
 ctx.fillStyle="#584953";ctx.fillRect(650,190,1540,1110);
 ctx.fillStyle="#7f6a73";ctx.fillRect(690,230,1460,1030);
 ctx.fillStyle="#eee5dc";ctx.fillRect(760,265,1320,970);
 ctx.fillStyle="#d8ced0";ctx.fillRect(800,290,1240,150);
 ctx.fillStyle="#8a3345";ctx.fillRect(95,70,300,520);
 ctx.fillStyle="#5e2230";ctx.fillRect(120,90,250,480);
 ctx.fillStyle="rgba(255,255,255,.15)";ctx.fillRect(360,85,12,490);
 ctx.fillStyle="#1d2830";ctx.fillRect(65,55,350,36);
 drawNest();
 if(stage().fan) drawFan();
 if(stage().incense) drawIncense();
}

function drawNest(){
 var pulse=1+Math.sin(game.time*4)*0.05;
 ctx.save();ctx.translate(nest.x,nest.y);
 ctx.beginPath();ctx.arc(0,0,nest.r*pulse,0,Math.PI*2);
 ctx.fillStyle=game.returning?"rgba(74,222,128,.24)":"rgba(255,255,255,.08)";ctx.fill();
 ctx.strokeStyle=game.returning?"#6ee7a8":"rgba(255,255,255,.35)";ctx.lineWidth=4;ctx.stroke();
 ctx.fillStyle="#fff";ctx.font="bold 22px sans-serif";ctx.textAlign="center";ctx.fillText("둥지",0,7);
 ctx.restore();
}

function drawFan(){
 ctx.save();ctx.translate(fan.x,fan.y);
 ctx.fillStyle="#b9c9d4";ctx.fillRect(-12,60,24,95);ctx.fillRect(-70,145,140,22);
 ctx.beginPath();ctx.arc(0,0,74,0,Math.PI*2);ctx.strokeStyle="#cdd9df";ctx.lineWidth=10;ctx.stroke();
 for(var i=0;i<3;i++){ctx.save();ctx.rotate(game.time*5+i*Math.PI*2/3);ctx.fillStyle="#8eb0c2";ctx.beginPath();ctx.ellipse(0,-36,22,48,.25,0,Math.PI*2);ctx.fill();ctx.restore();}
 ctx.fillStyle="rgba(170,225,255,.15)";
 for(var j=0;j<4;j++){ctx.fillRect(90+j*90,-160+j*35,720-j*80,5);}
 ctx.restore();
}

function drawIncense(){
 ctx.save();ctx.translate(incense.x,incense.y);
 ctx.fillStyle="#6d412e";ctx.fillRect(-55,35,110,22);
 ctx.strokeStyle="#87a982";ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,20,38,Math.PI*.1,Math.PI*1.9);ctx.stroke();
 var grd=ctx.createRadialGradient(0,0,30,0,0,incense.r);
 grd.addColorStop(0,"rgba(180,210,185,.20)");grd.addColorStop(1,"rgba(180,210,185,0)");
 ctx.fillStyle=grd;ctx.beginPath();ctx.arc(0,0,incense.r,0,Math.PI*2);ctx.fill();
 ctx.restore();
}

function drawHosts(){
 game.hosts.forEach(function(h){drawHost(h);});
}

function drawHost(h){
 var o=hostOffset(h),x=h.x+o.x,y=h.y+o.y;
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle="#f1c7a5";ctx.beginPath();ctx.arc(0,75,78,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#4b3842";ctx.beginPath();ctx.arc(-10,40,68,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillStyle="#344358";ctx.fillRect(-112,160,224,410);
 ctx.fillStyle="#f1c7a5";ctx.beginPath();ctx.arc(-145,325,52,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(145,325,52,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#59677b";ctx.fillRect(-115,500,230,190);
 ctx.fillStyle="#f1c7a5";ctx.beginPath();ctx.arc(-62,675,43,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(62,675,43,0,Math.PI*2);ctx.fill();
 if(stage().blanket){
  ctx.fillStyle=stage().blanket===2?"#7d6da6":"#6e7f9c";
  ctx.beginPath();ctx.roundRect(-165,250,330,stage().blanket===2?455:350,44);ctx.fill();
  if(stage().blanket===2){ctx.fillStyle="#f1c7a5";ctx.beginPath();ctx.arc(62,675,43,0,Math.PI*2);ctx.fill();}
 }
 ctx.fillStyle="#684f4f";ctx.beginPath();ctx.arc(24,84,4,0,Math.PI*2);ctx.fill();
 ctx.restore();
 var zs=zonesForHost(h);
 for(var i=0;i<zs.length;i++){
  var z=zs[i],d=dist(mosquito.x,mosquito.y,z.x,z.y);
  if(d<470){
   var alpha=clamp(1-d/470,0,1)*0.22;
   var g=ctx.createRadialGradient(z.x,z.y,5,z.x,z.y,z.r+70);
   g.addColorStop(0,"rgba(255,142,83,"+alpha+")");g.addColorStop(1,"rgba(255,142,83,0)");
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(z.x,z.y,z.r+70,0,Math.PI*2);ctx.fill();
  }
 }
}

function drawCO2(){
 for(var i=0;i<game.particles.length;i++){
  var p=game.particles[i],a=p.life/p.max*.34;
  ctx.fillStyle="rgba(235,245,248,"+a+")";ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
 }
}

function drawAttacks(){
 for(var i=0;i<game.attacks.length;i++){
  var a=game.attacks[i],warning=a.t<a.warn,fade=clamp(1-(a.t-a.warn)/.65,0,1);
  ctx.save();ctx.translate(a.x,a.y);
  ctx.fillStyle=warning?"rgba(255,54,54,.28)":"rgba(241,199,165,"+(.76*fade)+")";
  ctx.strokeStyle=warning?"rgba(255,85,85,.95)":"rgba(255,255,255,.45)";ctx.lineWidth=6;
  if(a.kind==="slam"){ctx.beginPath();ctx.arc(0,0,warning?145:125,0,Math.PI*2);ctx.fill();ctx.stroke();}
  else if(a.kind==="swipe"){
   if(a.horizontal){ctx.fillRect(-470,-56,940,112);ctx.strokeRect(-470,-56,940,112);}
   else{ctx.fillRect(-56,-330,112,660);ctx.strokeRect(-56,-330,112,660);}
  }else{
   var gap=warning?170:0;ctx.fillRect(-gap-88,-190,88,380);ctx.fillRect(gap,-190,88,380);
  }
  ctx.restore();
 }
}

function drawRacket(){
 var r=racketState(); if(!r) return;
 ctx.save();ctx.translate(r.x,r.y);
 if(r.mode==="warn"){
  ctx.strokeStyle="rgba(255,235,80,.8)";ctx.lineWidth=5;ctx.setLineDash([20,18]);
  ctx.beginPath();ctx.moveTo(0,-210);ctx.lineTo(0,210);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="#fff59d";ctx.font="bold 24px sans-serif";ctx.fillText("전기 모기채!",18,-185);
 }else{
  ctx.strokeStyle="#7ef0ff";ctx.lineWidth=9;ctx.strokeRect(-32,-170,64,340);
  ctx.strokeStyle="rgba(126,240,255,.55)";ctx.lineWidth=2;
  for(var y=-150;y<=150;y+=25){ctx.beginPath();ctx.moveTo(-30,y);ctx.lineTo(30,y);ctx.stroke();}
  ctx.fillStyle="#333";ctx.fillRect(-11,170,22,120);
 }
 ctx.restore();
}

function drawMosquito(){
 var ratio=clamp(game.blood/stage().target,0,1),t=performance.now()/1000;
 ctx.save();ctx.translate(mosquito.x,mosquito.y);ctx.rotate(mosquito.heading);
 ctx.strokeStyle="#332c31";ctx.lineWidth=2;
 for(var s=-1;s<=1;s+=2){
  ctx.beginPath();ctx.moveTo(-2,s*4);ctx.lineTo(-22,s*20);ctx.lineTo(-38,s*30);ctx.stroke();
  ctx.beginPath();ctx.moveTo(7,s*4);ctx.lineTo(30,s*14);ctx.lineTo(43,s*25);ctx.stroke();
 }
 var flap=Math.sin(t*(mosquito.feeding?8:46))*.55;
 ctx.fillStyle="rgba(210,238,245,.55)";
 ctx.save();ctx.rotate(flap);ctx.beginPath();ctx.ellipse(-5,-14,25,8,-.25,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.rotate(-flap);ctx.beginPath();ctx.ellipse(-5,14,25,8,.25,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.fillStyle="rgb("+Math.floor(70+ratio*150)+",35,42)";
 ctx.beginPath();ctx.ellipse(-9-mosquito.swelling*.5,0,18+ratio*13+mosquito.swelling,10+ratio*7,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#252228";ctx.beginPath();ctx.arc(12,0,8,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#c0a69d";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(39,0);ctx.stroke();
 if(mosquito.feeding){ctx.fillStyle="#ff5a6d";ctx.beginPath();ctx.arc(39,0,3.5,0,Math.PI*2);ctx.fill();}
 if(mosquito.glance>0){ctx.strokeStyle="#ffe66d";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,35,0,Math.PI*2);ctx.stroke();}
 ctx.restore();
}

function draw(){
 ctx.clearRect(0,0,W,H);
 ctx.save();ctx.translate(-game.camera.x,-game.camera.y);
 drawRoom();drawHosts();drawCO2();drawRacket();drawAttacks();drawMosquito();
 ctx.restore();
 if(game.mode==="playing"&&stage().moving&&game.hostPulse>5.2){
  ctx.fillStyle="rgba(255,255,255,.7)";ctx.font="bold 23px sans-serif";ctx.textAlign="center";
  ctx.fillText("뒤척…",W/2,95);ctx.textAlign="left";
 }
}

function loop(now){
 var dt=Math.min(.035,(now-game.last)/1000||0);game.last=now;
 if(game.mode==="playing") update(dt);
 draw();
 requestAnimationFrame(loop);
}

function pointerPos(e){
 var r=canvas.getBoundingClientRect();
 input.sx=(e.clientX-r.left)*W/r.width;input.sy=(e.clientY-r.top)*H/r.height;
}
canvas.addEventListener("pointerdown",function(e){ if(game.mode!=="playing")return; input.pointer=true;pointerPos(e);canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",function(e){pointerPos(e);});
canvas.addEventListener("pointerup",function(){input.pointer=false;});
canvas.addEventListener("pointercancel",function(){input.pointer=false;});
window.addEventListener("keydown",function(e){input.keys[e.code]=true;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code)>=0)e.preventDefault();});
window.addEventListener("keyup",function(e){input.keys[e.code]=false;});
["pointerdown","touchstart"].forEach(function(ev){$("biteBtn").addEventListener(ev,function(e){e.preventDefault();input.bite=true;});});
["pointerup","pointercancel","touchend","touchcancel"].forEach(function(ev){window.addEventListener(ev,function(){input.bite=false;});});
$("startBtn").addEventListener("click",startGame);

var audio={
 ctx:null,buzzOsc:null,buzzGain:null,master:null,
 init:function(){
  if(this.ctx){if(this.ctx.state==="suspended")this.ctx.resume();return;}
  var A=window.AudioContext||window.webkitAudioContext;if(!A)return;
  this.ctx=new A();this.master=this.ctx.createGain();this.master.gain.value=.34;this.master.connect(this.ctx.destination);
  this.buzzOsc=this.ctx.createOscillator();this.buzzGain=this.ctx.createGain();
  this.buzzOsc.type="sawtooth";this.buzzOsc.frequency.value=420;this.buzzGain.gain.value=0;
  var f=this.ctx.createBiquadFilter();f.type="bandpass";f.frequency.value=1050;f.Q.value=1.6;
  this.buzzOsc.connect(f);f.connect(this.buzzGain);this.buzzGain.connect(this.master);this.buzzOsc.start();
 },
 buzz:function(speed,feeding,alert){
  if(!this.ctx)return;
  this.buzzOsc.frequency.setTargetAtTime(feeding?260:420+speed*.18,this.ctx.currentTime,.08);
  this.buzzGain.gain.setTargetAtTime(feeding?.08:.018+Math.min(.04,speed/18000),this.ctx.currentTime,.08);
  this.master.gain.setTargetAtTime(.26+alert/500,this.ctx.currentTime,.2);
 },
 tone:function(freq,dur,vol){
  if(!this.ctx)return;var o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.value=freq;g.gain.value=vol;
  o.connect(g);g.connect(this.master);o.start();g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+dur);o.stop(this.ctx.currentTime+dur);
 },
 slap:function(){this.tone(82,.18,.7);this.tone(130,.12,.4);},
 chime:function(){this.tone(640,.16,.25);var self=this;setTimeout(function(){self.tone(880,.2,.22);},120);},
 relax:function(){if(this.buzzGain)this.buzzGain.gain.setTargetAtTime(0,this.ctx.currentTime,.1);}
};

setupStage(0,false);
requestAnimationFrame(loop);
})();