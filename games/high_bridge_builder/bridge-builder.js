(function(){
"use strict";

var canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
var W=1200,H=700,waterY=545,TAU=Math.PI*2;
var el={
 stageTitle:document.getElementById("stageTitle"),stageGoal:document.getElementById("stageGoal"),
 budget:document.getElementById("budgetText"),vehicle:document.getElementById("vehicleText"),status:document.getElementById("statusText"),
 prev:document.getElementById("prevLevel"),next:document.getElementById("nextLevel"),mode:document.getElementById("modeBtn"),
 help:document.getElementById("helpBtn"),sound:document.getElementById("soundBtn"),test:document.getElementById("testBtn"),
 stop:document.getElementById("stopBtn"),undo:document.getElementById("undoBtn"),reset:document.getElementById("resetBtn"),
 toast:document.getElementById("toast"),result:document.getElementById("resultCard"),resultIcon:document.getElementById("resultIcon"),
 resultTitle:document.getElementById("resultTitle"),resultText:document.getElementById("resultText"),stars:document.getElementById("stars"),
 retry:document.getElementById("retryBtn"),cont:document.getElementById("continueBtn"),conditions:document.getElementById("conditionList"),
 campaign:document.getElementById("campaignInfo"),sandbox:document.getElementById("sandboxPanel"),gap:document.getElementById("gapRange"),
 gapValue:document.getElementById("gapValue"),vehicleSelect:document.getElementById("vehicleSelect"),tutorial:document.getElementById("tutorial"),
 tutorialClose:document.getElementById("tutorialClose")
};

var VEHICLES={
 sedan:{label:"승용차",file:"sedan-blue.png",load:1.0,speed:92,scale:2.8},
 bus:{label:"스쿨버스",file:"bus-school.png",load:1.65,speed:76,scale:2.7},
 ambulance:{label:"구급차",file:"ambulance.png",load:1.35,speed:88,scale:2.8},
 firetruck:{label:"소방차",file:"firetruck.png",load:1.9,speed:72,scale:2.8},
 truck:{label:"대형 화물차",file:"truck.png",load:2.65,speed:60,scale:2.55}
};
var vehicleImages={};
Object.keys(VEHICLES).forEach(function(k){
 var im=new Image();im.src="../../assets/game/2d/vehicles/pixel/cars/"+VEHICLES[k].file;vehicleImages[k]=im;
});

var LEVELS=[
 {title:"1. 작은 개울",goal:"승용차 한 대를 안전하게 통과시키세요",gap:340,budget:920,par:700,vehicles:["sedan"],foundations:[[-105,555],[0,570],[105,555]],tip:"아래 고정점과 철제 빔을 이어 삼각형을 만들어 보세요."},
 {title:"2. 학교 가는 길",goal:"무거운 스쿨버스가 지나갈 다리를 만드세요",gap:440,budget:1280,par:980,vehicles:["bus"],foundations:[[-145,575],[0,590],[145,575]],tip:"버스는 승용차보다 무거워요. 도로 아래 뼈대를 촘촘히 보강해 보세요."},
 {title:"3. 깊은 골짜기",goal:"바닥 기둥 없이 골짜기를 건너세요",gap:500,budget:1450,par:1120,vehicles:["sedan"],foundations:[],tip:"바닥 고정점이 없어요. 위쪽 구조와 케이블을 활용해 보세요.",towerAnchors:[[-250,205],[250,205]]},
 {title:"4. 큰 강",goal:"구급차가 흔들리지 않게 통과해야 해요",gap:560,budget:1640,par:1280,vehicles:["ambulance"],foundations:[[-210,590],[210,590]],tip:"긴 다리는 한 곳에 힘이 몰리지 않게 여러 삼각형으로 나누는 게 좋아요."},
 {title:"5. 비바람 다리",goal:"옆바람 속에서도 다리를 지켜내세요",gap:560,budget:1780,par:1380,vehicles:["bus"],foundations:[[-190,585],[0,600],[190,585]],storm:1,tip:"시험 중 바람이 불어요. 좌우 흔들림을 잡을 대각선 빔을 넣어 보세요."},
 {title:"6. 절약 공사",goal:"적은 비용으로 튼튼한 다리를 완성하세요",gap:520,budget:1320,par:1040,vehicles:["sedan"],foundations:[[-170,580],[170,580]],tip:"재료를 많이 쓰는 것보다 힘이 흐르는 길을 잘 만드는 게 중요해요."},
 {title:"7. 긴급 출동",goal:"구급차와 소방차를 연달아 통과시키세요",gap:600,budget:2020,par:1580,vehicles:["ambulance","firetruck"],foundations:[[-220,600],[0,610],[220,600]],tip:"첫 차량이 지나간 뒤에도 구조물이 버텨야 해요."},
 {title:"8. 초대형 화물",goal:"가장 무거운 화물차를 반대편까지 보내세요",gap:640,budget:2320,par:1820,vehicles:["truck"],foundations:[[-245,610],[-80,620],[80,620],[245,610]],tip:"도로 바로 아래를 철제 빔으로 받치고 큰 삼각형 안에 작은 삼각형을 넣어 보세요."}
];

var MAT={
 road:{label:"도로",rate:1.4,max:175,stiff:.93,limit:.032,width:11,color:"#68758a"},
 beam:{label:"철제 빔",rate:.8,max:235,stiff:.80,limit:.055,width:7,color:"#4da8ff"},
 cable:{label:"케이블",rate:.55,max:310,stiff:.52,limit:.085,width:3,color:"#f5d15e"}
};

var S={
 mode:"campaign",level:0,tool:"road",nodes:[],members:[],history:[],nextNode:1,
 bankL:430,bankR:770,deckY:330,budget:0,spent:0,testing:false,simTime:0,
 pointer:{down:false,start:null,x:0,y:0},route:null,vehicle:null,vehicleIndex:0,
 particles:[],sound:true,resultOpen:false,firstBreak:null,finishDelay:0
};

var successAudio=new Audio("../../assets/audio/sfx/success/cheer-yay-01.mp3");
var failAudio=new Audio("../../assets/audio/sfx/failure/fail-sting-01.mp3");
successAudio.volume=.42;failAudio.volume=.38;
var audioCtx=null;
function tone(freq,dur,type){
 if(!S.sound)return;
 try{
  audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended")audioCtx.resume();
  var o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
  o.type=type||"sine";o.frequency.value=freq;o.connect(g);g.connect(audioCtx.destination);
  g.gain.setValueAtTime(.055,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.start(t);o.stop(t+dur);
 }catch(e){}
}
function playSuccess(){if(!S.sound)return;try{successAudio.currentTime=0;successAudio.play();}catch(e){}}
function playFail(){if(!S.sound)return;try{failAudio.currentTime=0;failAudio.play();}catch(e){}}

function currentLevel(){
 if(S.mode==="sandbox"){
  return {title:"샌드박스",goal:"마음껏 만들고 시험해 보세요",gap:Number(el.gap.value)||520,budget:999999,par:0,vehicles:[el.vehicleSelect.value||"sedan"],foundations:[[-240,610],[-120,610],[0,610],[120,610],[240,610]],tip:"예산 제한 없음 · 원하는 만큼 실험해 보세요."};
 }
 return LEVELS[S.level];
}
function toast(msg){
 el.toast.textContent=msg;el.toast.classList.add("show");
 clearTimeout(toast._t);toast._t=setTimeout(function(){el.toast.classList.remove("show");},1500);
}
function setStatus(msg){el.status.textContent=msg}
function snap(v){return Math.round(v/20)*20}
function dist(a,b){var dx=a.x-b.x,dy=a.y-b.y;return Math.hypot(dx,dy)}
function memberCost(a,b,type){return Math.round(dist(a,b)*MAT[type].rate)}
function nodeById(id){for(var i=0;i<S.nodes.length;i++)if(S.nodes[i].id===id)return S.nodes[i];return null}
function memberBetween(a,b,type){
 for(var i=0;i<S.members.length;i++){var m=S.members[i];if((m.a===a&&m.b===b)||(m.a===b&&m.b===a)){if(!type||m.type===type)return m}}
 return null;
}
function addFixed(x,y,kind){
 var n={id:S.nextNode++,x:x,y:y,px:x,py:y,bx:x,by:y,fixed:true,kind:kind||"anchor",ax:0,ay:0};
 S.nodes.push(n);return n;
}
function addNode(x,y){
 var n={id:S.nextNode++,x:x,y:y,px:x,py:y,bx:x,by:y,fixed:false,kind:"joint",ax:0,ay:0};
 S.nodes.push(n);return n;
}
function findNode(x,y,r){
 r=r||18;var best=null,bd=r;
 S.nodes.forEach(function(n){var d=Math.hypot(n.x-x,n.y-y);if(d<bd){bd=d;best=n}});
 return best;
}
function segmentDistance(px,py,a,b){
 var vx=b.x-a.x,vy=b.y-a.y,wx=px-a.x,wy=py-a.y,c1=vx*wx+vy*wy;
 if(c1<=0)return Math.hypot(px-a.x,py-a.y);
 var c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-b.x,py-b.y);
 var t=c1/c2,qx=a.x+t*vx,qy=a.y+t*vy;return Math.hypot(px-qx,py-qy);
}
function nearestMember(x,y){
 var best=null,bd=14;
 S.members.forEach(function(m){var a=nodeById(m.a),b=nodeById(m.b);if(!a||!b)return;var d=segmentDistance(x,y,a,b);if(d<bd){bd=d;best=m}});
 return best;
}
function cleanupNodes(){
 var used={};S.members.forEach(function(m){used[m.a]=1;used[m.b]=1});
 S.nodes=S.nodes.filter(function(n){return n.fixed||used[n.id]});
}
function calcSpent(){
 var sum=0;S.members.forEach(function(m){sum+=m.cost});S.spent=sum;return sum;
}
function snapshot(){
 S.history.push(JSON.stringify({nodes:S.nodes.map(function(n){return {id:n.id,x:n.bx,y:n.by,fixed:n.fixed,kind:n.kind}}),members:S.members.map(function(m){return {id:m.id,a:m.a,b:m.b,type:m.type,rest:m.rest,cost:m.cost}}),nextNode:S.nextNode}));
 if(S.history.length>40)S.history.shift();
}
function restoreSnapshot(raw){
 try{
  var o=JSON.parse(raw);S.nodes=o.nodes.map(function(n){return {id:n.id,x:n.x,y:n.y,px:n.x,py:n.y,bx:n.x,by:n.y,fixed:n.fixed,kind:n.kind,ax:0,ay:0}});
  S.members=o.members.map(function(m){return {id:m.id,a:m.a,b:m.b,type:m.type,rest:m.rest,cost:m.cost,broken:false,stress:0,peak:0}});
  S.nextNode=o.nextNode;calcSpent();updateUI();
 }catch(e){}
}
function undo(){
 if(S.testing||S.history.length<2)return;
 S.history.pop();restoreSnapshot(S.history[S.history.length-1]);tone(250,.06,"triangle");
}
function resetLevel(keepMode){
 stopTest(true);S.resultOpen=false;el.result.classList.add("hidden");
 var lv=currentLevel(),gap=lv.gap;
 S.bankL=600-gap/2;S.bankR=600+gap/2;S.deckY=330;S.budget=lv.budget;S.nodes=[];S.members=[];S.history=[];S.nextNode=1;
 addFixed(S.bankL,S.deckY,"bank-left");addFixed(S.bankR,S.deckY,"bank-right");
 (lv.foundations||[]).forEach(function(p){addFixed(600+p[0],p[1],"foundation")});
 (lv.towerAnchors||[]).forEach(function(p){addFixed(600+p[0],p[1],"tower")});
 calcSpent();snapshot();updateUI();
}
function updateUI(){
 var lv=currentLevel(),names=lv.vehicles.map(function(v){return VEHICLES[v].label}).join(" + ");
 el.stageTitle.textContent=lv.title;el.stageGoal.textContent=lv.goal;el.vehicle.textContent=names;
 el.budget.textContent=S.mode==="sandbox"?"제한 없음":Math.round(S.spent)+" / "+lv.budget;
 el.budget.style.color=S.spent>lv.budget?"#ff6676":"";
 el.prev.disabled=S.mode==="sandbox"||S.level===0;el.next.disabled=S.mode==="sandbox"||S.level===LEVELS.length-1;
 el.mode.textContent=S.mode==="sandbox"?"🏗️ 캠페인":"🧪 샌드박스";
 el.campaign.classList.toggle("hidden",S.mode==="sandbox");el.sandbox.classList.toggle("hidden",S.mode!=="sandbox");
 el.conditions.innerHTML="";
 var items=[];
 if(S.mode==="campaign"){
  items.push("예산 "+lv.budget+" 이하");
  items.push(names+" 안전 통과");
  if(lv.storm)items.push("시험 중 강한 옆바람");
  if((lv.foundations||[]).length===0)items.push("강바닥 고정점 없음");
  items.push(lv.tip);
 }
 items.forEach(function(t){var li=document.createElement("li");li.textContent=t;el.conditions.appendChild(li)});
 setStatus(S.testing?"시험 운행 중":lv.tip);
}
function addMember(a,b,type){
 if(!a||!b||a.id===b.id||type==="erase")return false;
 if(memberBetween(a.id,b.id,type)){toast("이미 같은 재료로 연결되어 있어요.");return false}
 var d=dist(a,b),mat=MAT[type];if(d<22){toast("조금 더 멀리 연결해 주세요.");return false}
 if(d>mat.max){toast(mat.label+"은 한 번에 "+mat.max+"m까지만 연결할 수 있어요.");return false}
 var cost=memberCost(a,b,type),lv=currentLevel();
 if(S.mode!=="sandbox"&&S.spent+cost>lv.budget){toast("예산이 부족해요. 다른 구조를 생각해 보세요.");tone(160,.1,"square");return false}
 S.members.push({id:Date.now()+Math.random(),a:a.id,b:b.id,type:type,rest:d,cost:cost,broken:false,stress:0,peak:0});
 calcSpent();snapshot();updateUI();tone(type==="road"?430:type==="beam"?560:700,.045,"triangle");return true;
}

function canvasPoint(ev){
 var r=canvas.getBoundingClientRect();
 return {x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height};
}
canvas.addEventListener("pointerdown",function(ev){
 if(S.testing||S.resultOpen)return;ev.preventDefault();canvas.setPointerCapture(ev.pointerId);
 var p=canvasPoint(ev);S.pointer.down=true;S.pointer.x=p.x;S.pointer.y=p.y;
 if(S.tool==="erase"){
  var m=nearestMember(p.x,p.y);if(m){S.members=S.members.filter(function(x){return x!==m});cleanupNodes();calcSpent();snapshot();updateUI();tone(180,.05,"square")}else toast("지울 부재를 눌러 주세요.");
  S.pointer.down=false;return;
 }
 var n=findNode(p.x,p.y,21);
 if(!n){n=addNode(snap(p.x),snap(p.y));}
 S.pointer.start=n;
});
canvas.addEventListener("pointermove",function(ev){
 var p=canvasPoint(ev);S.pointer.x=p.x;S.pointer.y=p.y;
});
canvas.addEventListener("pointerup",function(ev){
 if(!S.pointer.down)return;ev.preventDefault();
 var p=canvasPoint(ev),start=S.pointer.start,end=findNode(p.x,p.y,22);
 if(!end)end=addNode(snap(p.x),snap(p.y));
 if(!addMember(start,end,S.tool)){cleanupNodes()}
 S.pointer.down=false;S.pointer.start=null;
});
canvas.addEventListener("pointercancel",function(){S.pointer.down=false;S.pointer.start=null;cleanupNodes()});
canvas.addEventListener("contextmenu",function(e){e.preventDefault()});

document.querySelectorAll(".tool").forEach(function(btn){
 btn.addEventListener("click",function(){
  if(S.testing)return;document.querySelectorAll(".tool").forEach(function(b){b.classList.remove("active")});
  btn.classList.add("active");S.tool=btn.getAttribute("data-tool");tone(330,.04,"sine");
 });
});

function findRoadRoute(){
 var left=S.nodes.find(function(n){return n.kind==="bank-left"}),right=S.nodes.find(function(n){return n.kind==="bank-right"});
 if(!left||!right)return null;
 var adj={};S.nodes.forEach(function(n){adj[n.id]=[]});
 S.members.forEach(function(m){if(m.type!=="road"||m.broken)return;var a=nodeById(m.a),b=nodeById(m.b);if(!a||!b)return;var w=dist(a,b);adj[a.id].push({id:b.id,w:w});adj[b.id].push({id:a.id,w:w})});
 var D={},prev={},open=[];S.nodes.forEach(function(n){D[n.id]=Infinity});D[left.id]=0;open.push(left.id);
 while(open.length){
  open.sort(function(a,b){return D[a]-D[b]});var u=open.shift();if(u===right.id)break;
  (adj[u]||[]).forEach(function(e){var nd=D[u]+e.w;if(nd<D[e.id]){D[e.id]=nd;prev[e.id]=u;if(open.indexOf(e.id)<0)open.push(e.id)}});
 }
 if(!isFinite(D[right.id]))return null;
 var path=[],cur=right.id;while(cur!=null){path.push(cur);if(cur===left.id)break;cur=prev[cur]}path.reverse();
 return path.length>=2?path:null;
}
function resetPhysics(){
 S.nodes.forEach(function(n){n.x=n.bx;n.y=n.by;n.px=n.bx;n.py=n.by;n.ax=0;n.ay=0});
 S.members.forEach(function(m){m.broken=false;m.stress=0;m.peak=0});S.particles=[];S.firstBreak=null;
}
function startTest(){
 if(S.testing)return;
 var route=findRoadRoute();if(!route){toast("먼저 도로로 양쪽 노란 고정점을 이어 주세요.");tone(170,.12,"square");return}
 resetPhysics();S.route=route;S.testing=true;S.simTime=0;S.vehicleIndex=0;S.finishDelay=0;S.resultOpen=false;el.result.classList.add("hidden");
 spawnVehicle();el.test.classList.add("hidden");el.stop.classList.remove("hidden");setStatus("시험 운행 중 · 힘이 큰 곳은 빨갛게 변해요");tone(620,.08,"triangle");
}
function spawnVehicle(){
 var lv=currentLevel(),key=lv.vehicles[Math.min(S.vehicleIndex,lv.vehicles.length-1)],v=VEHICLES[key];
 S.vehicle={key:key,phase:"approach",x:S.bankL-125,y:S.deckY-7,vx:v.speed,vy:0,seg:0,t:0,angle:0,wet:false};
}
function stopTest(silent){
 if(!S.testing&&!silent)return;
 S.testing=false;resetPhysics();S.vehicle=null;S.route=null;el.test.classList.remove("hidden");el.stop.classList.add("hidden");
 if(!silent)setStatus(currentLevel().tip);
}
function roadMemberFor(a,b){var m=memberBetween(a,b,"road");return m&&!m.broken?m:null}
function fail(reason){
 if(!S.testing)return;S.testing=false;el.test.classList.remove("hidden");el.stop.classList.add("hidden");playFail();
 showResult(false,reason||"다리가 버티지 못했어요.");
}
function success(){
 if(!S.testing)return;S.testing=false;el.test.classList.remove("hidden");el.stop.classList.add("hidden");playSuccess();
 var lv=currentLevel(),stars=3;if(S.mode!=="sandbox"){stars=S.spent<=lv.par*.82?3:(S.spent<=lv.par?2:1);saveProgress(stars)}
 showResult(true,S.mode==="sandbox"?"멋진 실험 성공! 다른 차량도 시험해 보세요.":"사용 비용 "+Math.round(S.spent)+" · 기준 비용 "+lv.par,stars);
}
function showResult(ok,text,stars){
 S.resultOpen=true;el.result.classList.remove("hidden");el.resultIcon.textContent=ok?"🏆":"🛠️";el.resultTitle.textContent=ok?"통과 성공!":"다리가 무너졌어요";
 el.resultText.textContent=text;el.stars.textContent=ok&&S.mode!=="sandbox"?"★★★".slice(0,stars)+"☆☆☆".slice(0,3-stars):"";
 el.cont.classList.toggle("hidden",!ok||S.mode==="sandbox"||S.level===LEVELS.length-1);
}
function saveProgress(stars){
 S.bestStars=S.bestStars||{};var key=String(S.level);S.bestStars[key]=Math.max(Number(S.bestStars[key]||0),stars);
}

function breakMember(m){
 if(m.broken)return;m.broken=true;if(!S.firstBreak)S.firstBreak=m;
 var a=nodeById(m.a),b=nodeById(m.b),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
 for(var i=0;i<14;i++)S.particles.push({x:cx+(Math.random()-.5)*18,y:cy+(Math.random()-.5)*10,vx:(Math.random()-.5)*4,vy:-Math.random()*4-1,life:1,type:"debris"});
 tone(95,.11,"sawtooth");
}
function physicsStep(dt){
 var lv=currentLevel(),dts=Math.min(1.5,dt*60);
 S.simTime+=dt;
 var wind=lv.storm?Math.sin(S.simTime*3.1)*.16:0;
 S.nodes.forEach(function(n){n.ax=wind;n.ay=.19});
 applyVehicleLoad(dts);
 S.nodes.forEach(function(n){
  if(n.fixed)return;
  var vx=(n.x-n.px)*.994,vy=(n.y-n.py)*.994,nx=n.x+vx+n.ax*dts*dts,ny=n.y+vy+n.ay*dts*dts;
  n.px=n.x;n.py=n.y;n.x=nx;n.y=ny;
 });
 for(var iter=0;iter<8;iter++){
  S.members.forEach(function(m){
   if(m.broken)return;var a=nodeById(m.a),b=nodeById(m.b);if(!a||!b)return;
   var dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.0001,stretch=(d-m.rest)/m.rest;
   if(m.type==="cable"&&stretch<0){m.stress=Math.max(0,m.stress*.9);return}
   var abs=Math.abs(stretch),mat=MAT[m.type],proxy=abs/mat.limit;
   m.stress=Math.max(proxy,m.stress*.90);m.peak=Math.max(m.peak,m.stress);
   if(S.simTime>.32&&proxy>1.16){breakMember(m);return}
   var diff=(d-m.rest)/d,corr=diff*mat.stiff;
   var cx=dx*corr,cy=dy*corr;
   if(!a.fixed&&!b.fixed){a.x+=cx*.5;a.y+=cy*.5;b.x-=cx*.5;b.y-=cy*.5}
   else if(a.fixed&&!b.fixed){b.x-=cx;b.y-=cy}
   else if(!a.fixed&&b.fixed){a.x+=cx;a.y+=cy}
  });
 }
 S.nodes.forEach(function(n){if(!n.fixed&&n.y>waterY+90){n.y=waterY+90}});
 updateVehicle(dt);
 updateParticles(dt);
}
function applyVehicleLoad(){
 var v=S.vehicle;if(!v||v.phase!=="bridge"||!S.route)return;
 var a=nodeById(S.route[v.seg]),b=nodeById(S.route[v.seg+1]);if(!a||!b)return;
 var load=VEHICLES[v.key].load*(currentLevel().loadMult||1),t=v.t;
 if(!a.fixed)a.ay+=load*.34*(1-t);if(!b.fixed)b.ay+=load*.34*t;
}
function updateVehicle(dt){
 var v=S.vehicle;if(!v)return;var meta=VEHICLES[v.key];
 if(v.phase==="approach"){
  v.x+=meta.speed*dt;v.y=S.deckY-7;if(v.x>=S.bankL){v.phase="bridge";v.x=S.bankL;v.seg=0;v.t=0}return;
 }
 if(v.phase==="fall"){
  v.vy+=420*dt;v.y+=v.vy*dt;v.x+=42*dt;if(v.y>waterY+55&&!v.wet){v.wet=true;splash(v.x,waterY);fail("차량이 물에 빠졌어요. 처음 끊어진 곳을 더 튼튼하게 보강해 보세요.")}return;
 }
 if(v.phase==="exit"){
  v.x+=meta.speed*dt;v.y=S.deckY-7;if(v.x>S.bankR+145){
   S.vehicleIndex++;if(S.vehicleIndex<currentLevel().vehicles.length){spawnVehicle();toast("첫 차량 통과! 다음 차량이 출발해요.")}else success();
  }return;
 }
 if(v.phase==="bridge"){
  var aId=S.route[v.seg],bId=S.route[v.seg+1],m=roadMemberFor(aId,bId);
  if(!m){v.phase="fall";v.vy=0;return}
  var a=nodeById(aId),b=nodeById(bId);if(!a||!b){v.phase="fall";return}
  var len=Math.max(20,dist(a,b));v.t+=meta.speed*dt/len;
  while(v.t>=1){
   v.t-=1;v.seg++;
   if(v.seg>=S.route.length-1){v.phase="exit";v.x=S.bankR;v.y=S.deckY-7;return}
   aId=S.route[v.seg];bId=S.route[v.seg+1];m=roadMemberFor(aId,bId);if(!m){v.phase="fall";v.vy=0;return}
   a=nodeById(aId);b=nodeById(bId);len=Math.max(20,dist(a,b));
  }
  v.x=a.x+(b.x-a.x)*v.t;v.y=a.y+(b.y-a.y)*v.t-7;v.angle=Math.atan2(b.y-a.y,b.x-a.x);
  if(v.y>waterY-6){v.phase="fall";v.vy=40}
 }
}
function splash(x,y){
 for(var i=0;i<22;i++)S.particles.push({x:x+(Math.random()-.5)*30,y:y,vx:(Math.random()-.5)*7,vy:-Math.random()*8-2,life:1,type:"water"});
}
function updateParticles(dt){
 S.particles.forEach(function(p){p.vy+=14*dt*60;p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.life-=dt*1.5});
 S.particles=S.particles.filter(function(p){return p.life>0});
}

function drawBackground(t){
 var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#8ed1ff");g.addColorStop(.62,"#d8f1ff");g.addColorStop(1,"#d6e8d2");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="rgba(255,255,255,.72)";
 for(var i=0;i<5;i++){var cx=110+i*250+Math.sin(t*.06+i)*15,cy=85+(i%2)*45;ctx.beginPath();ctx.arc(cx,cy,28,0,TAU);ctx.arc(cx+32,cy-7,38,0,TAU);ctx.arc(cx+70,cy,25,0,TAU);ctx.fill()}
 ctx.fillStyle="#7aa36d";ctx.beginPath();ctx.moveTo(0,390);ctx.quadraticCurveTo(180,250,360,400);ctx.quadraticCurveTo(520,260,690,405);ctx.quadraticCurveTo(900,235,1200,390);ctx.lineTo(1200,560);ctx.lineTo(0,560);ctx.closePath();ctx.fill();
 ctx.fillStyle="#5b7f54";ctx.beginPath();ctx.moveTo(0,435);ctx.quadraticCurveTo(190,330,400,445);ctx.quadraticCurveTo(690,330,920,445);ctx.quadraticCurveTo(1060,350,1200,420);ctx.lineTo(1200,570);ctx.lineTo(0,570);ctx.closePath();ctx.fill();
 drawBanks();
 var wg=ctx.createLinearGradient(0,waterY,0,H);wg.addColorStop(0,"#47b5e9");wg.addColorStop(1,"#1677ba");ctx.fillStyle=wg;ctx.fillRect(S.bankL,waterY,S.bankR-S.bankL,H-waterY);
 ctx.strokeStyle="rgba(255,255,255,.46)";ctx.lineWidth=3;
 for(var y=waterY+8;y<H;y+=24){ctx.beginPath();for(var x=S.bankL;x<S.bankR;x+=32){var yy=y+Math.sin(x*.035+t*.003+y)*3;if(x===S.bankL)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.stroke()}
}
function drawBanks(){
 ctx.fillStyle="#6c533f";
 ctx.beginPath();ctx.moveTo(0,S.deckY+10);ctx.lineTo(S.bankL,S.deckY+10);ctx.lineTo(S.bankL-22,waterY);ctx.lineTo(0,waterY);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(S.bankR,S.deckY+10);ctx.lineTo(W,S.deckY+10);ctx.lineTo(W,waterY);ctx.lineTo(S.bankR+22,waterY);ctx.closePath();ctx.fill();
 ctx.fillStyle="#5ea955";ctx.fillRect(0,S.deckY-2,S.bankL,18);ctx.fillRect(S.bankR,S.deckY-2,W-S.bankR,18);
 ctx.fillStyle="#384657";ctx.fillRect(0,S.deckY-9,S.bankL,12);ctx.fillRect(S.bankR,S.deckY-9,W-S.bankR,12);
}
function drawGrid(){
 if(S.testing)return;ctx.save();ctx.strokeStyle="rgba(30,70,105,.09)";ctx.lineWidth=1;
 for(var x=20;x<W;x+=20){ctx.beginPath();ctx.moveTo(x,160);ctx.lineTo(x,635);ctx.stroke()}
 for(var y=160;y<635;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.restore();
}
function stressColor(m){
 if(!S.testing)return MAT[m.type].color;
 var s=Math.max(0,Math.min(1,m.stress));var hue=120*(1-s);return "hsl("+hue+",86%,"+(m.type==="cable"?62:55)+"%)";
}
function drawMembers(){
 var order={cable:0,beam:1,road:2};
 S.members.slice().sort(function(a,b){return order[a.type]-order[b.type]}).forEach(function(m){
  if(m.broken)return;var a=nodeById(m.a),b=nodeById(m.b);if(!a||!b)return;ctx.save();
  if(m.type==="road"){
   ctx.strokeStyle="#263241";ctx.lineWidth=15;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
   ctx.strokeStyle=stressColor(m);ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
   ctx.setLineDash([13,13]);ctx.strokeStyle="rgba(255,255,255,.58)";ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }else{
   ctx.strokeStyle="rgba(14,23,36,.55)";ctx.lineWidth=MAT[m.type].width+4;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
   ctx.strokeStyle=stressColor(m);ctx.lineWidth=MAT[m.type].width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.restore();
 });
}
function drawAnchors(){
 S.nodes.forEach(function(n){
  if(n.fixed){
   ctx.save();ctx.translate(n.x,n.y);
   if(n.kind==="foundation"){ctx.fillStyle="#4b5967";ctx.fillRect(-18,5,36,28);ctx.fillStyle="#778797";ctx.fillRect(-24,28,48,8)}
   if(n.kind==="tower"){ctx.fillStyle="#56677a";ctx.fillRect(-13,6,26,52)}
   ctx.beginPath();ctx.arc(0,0,10,0,TAU);ctx.fillStyle="#ffd34e";ctx.fill();ctx.lineWidth=4;ctx.strokeStyle="#7b5e06";ctx.stroke();ctx.restore();
  }else if(!S.testing){
   ctx.beginPath();ctx.arc(n.x,n.y,5.5,0,TAU);ctx.fillStyle="#dce7f4";ctx.fill();ctx.strokeStyle="#52647a";ctx.lineWidth=2;ctx.stroke();
  }
 });
}
function drawPreview(){
 if(!S.pointer.down||!S.pointer.start||S.testing||S.tool==="erase")return;
 var a=S.pointer.start,b={x:snap(S.pointer.x),y:snap(S.pointer.y)},d=dist(a,b),mat=MAT[S.tool],ok=d<=mat.max;
 ctx.save();ctx.setLineDash([10,8]);ctx.lineWidth=MAT[S.tool].width;ctx.strokeStyle=ok?MAT[S.tool].color:"#ff5364";ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle="rgba(13,22,37,.82)";ctx.fillRect((a.x+b.x)/2-40,(a.y+b.y)/2-29,80,20);ctx.fillStyle="#fff";ctx.font="800 10px system-ui";ctx.textAlign="center";ctx.fillText(Math.round(d)+"m",(a.x+b.x)/2,(a.y+b.y)/2-15);ctx.restore();
}
function drawVehicle(){
 var v=S.vehicle;if(!v)return;var im=vehicleImages[v.key],meta=VEHICLES[v.key];ctx.save();ctx.translate(v.x,v.y);ctx.rotate(v.angle||0);
 var iw=im.naturalWidth||48,ih=im.naturalHeight||22,w=iw*meta.scale,h=ih*meta.scale;
 if(im.complete&&im.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(im,-w*.5,-h+4,w,h)}
 else{ctx.fillStyle="#ffcf3f";ctx.fillRect(-35,-24,70,24);ctx.fillStyle="#1f2937";ctx.beginPath();ctx.arc(-20,2,8,0,TAU);ctx.arc(20,2,8,0,TAU);ctx.fill()}
 ctx.restore();
}
function drawParticles(){
 S.particles.forEach(function(p){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.type==="water"?"#bfefff":"#506173";ctx.fillRect(p.x-3,p.y-3,6,6)});ctx.globalAlpha=1;
}
function drawHint(){
 if(S.testing||S.members.length>0||S.mode==="sandbox")return;
 var lv=currentLevel();ctx.save();ctx.fillStyle="rgba(15,29,46,.72)";ctx.fillRect(385,180,430,58);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="900 14px system-ui";ctx.fillText("노란 고정점 사이를 도로로 연결해 보세요",600,204);ctx.fillStyle="#bcd2e7";ctx.font="700 10px system-ui";ctx.fillText(lv.tip,600,222);ctx.restore();
}
function render(t){
 drawBackground(t||0);drawGrid();drawMembers();drawAnchors();drawPreview();drawVehicle();drawParticles();drawHint();
}

var last=performance.now();
function frame(now){
 var dt=Math.min(.033,(now-last)/1000);last=now;if(S.testing)physicsStep(dt);render(now);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

el.test.addEventListener("click",startTest);el.stop.addEventListener("click",function(){stopTest(false)});el.undo.addEventListener("click",undo);
el.reset.addEventListener("click",function(){if(S.testing)return;resetLevel();tone(210,.06,"square")});
el.prev.addEventListener("click",function(){if(S.level>0){S.level--;resetLevel()}});
el.next.addEventListener("click",function(){if(S.level<LEVELS.length-1){S.level++;resetLevel()}});
el.retry.addEventListener("click",function(){S.resultOpen=false;el.result.classList.add("hidden");stopTest(true);setStatus(currentLevel().tip)});
el.cont.addEventListener("click",function(){S.resultOpen=false;el.result.classList.add("hidden");if(S.level<LEVELS.length-1){S.level++;resetLevel()}});
el.mode.addEventListener("click",function(){
 S.mode=S.mode==="campaign"?"sandbox":"campaign";resetLevel();toast(S.mode==="sandbox"?"샌드박스 모드 · 예산 제한이 없어요.":"캠페인으로 돌아왔어요.");
});
el.sound.addEventListener("click",function(){S.sound=!S.sound;el.sound.textContent=S.sound?"🔊":"🔇";if(S.sound)tone(520,.05,"sine")});
el.help.addEventListener("click",function(){el.tutorial.classList.remove("hidden")});
el.tutorialClose.addEventListener("click",function(){el.tutorial.classList.add("hidden");try{sessionStorage.setItem("bridgeBuilderTutorialSeen","1")}catch(e){}});
el.gap.addEventListener("input",function(){el.gapValue.textContent=el.gap.value+"m";if(S.mode==="sandbox")resetLevel()});
el.vehicleSelect.addEventListener("change",function(){if(S.mode==="sandbox")resetLevel()});

try{if(!sessionStorage.getItem("bridgeBuilderTutorialSeen"))el.tutorial.classList.remove("hidden")}catch(e){el.tutorial.classList.remove("hidden")}
resetLevel();
})();