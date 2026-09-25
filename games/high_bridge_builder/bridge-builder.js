(function(){
"use strict";

var canvas=document.getElementById("game");
var ctx=canvas.getContext("2d");
var W=1200,H=700,TAU=Math.PI*2;
var SAMPLE_STEP=5;
var MAX_JOIN_Y=145;
var MAX_POINTS=900;

var el={
  stageTitle:document.getElementById("stageTitle"),
  stageGoal:document.getElementById("stageGoal"),
  prev:document.getElementById("prevLevel"),
  next:document.getElementById("nextLevel"),
  help:document.getElementById("helpBtn"),
  reset:document.getElementById("resetBtn"),
  hint:document.getElementById("hint"),
  toast:document.getElementById("toast"),
  result:document.getElementById("resultCard"),
  resultIcon:document.getElementById("resultIcon"),
  resultTitle:document.getElementById("resultTitle"),
  resultText:document.getElementById("resultText"),
  stars:document.getElementById("stars"),
  retry:document.getElementById("retryBtn"),
  cont:document.getElementById("continueBtn"),
  tutorial:document.getElementById("tutorial"),
  tutorialClose:document.getElementById("tutorialClose")
};

var VEHICLES={
  sedan:{label:"노란 자동차",speed:150},
  bus:{label:"스쿨버스",speed:132},
  ambulance:{label:"구급차",speed:144},
  firetruck:{label:"소방차",speed:126},
  truck:{label:"화물차",speed:118}
};

var LEVELS=[
  {title:"1. 작은 개울",goal:"차 앞에서 반대쪽 벽까지 길을 그려 주세요",gap:330,vehicle:"sedan",leftY:408,rightY:408,waterY:590},
  {title:"2. 학교 가는 길",goal:"조금 더 긴 틈을 한 줄로 이어 주세요",gap:410,vehicle:"bus",leftY:408,rightY:398,waterY:590},
  {title:"3. 언덕 건너기",goal:"높이가 다른 두 벽을 자연스럽게 이어 주세요",gap:470,vehicle:"sedan",leftY:420,rightY:370,waterY:590},
  {title:"4. 긴급 출동",goal:"구급차가 달릴 길을 한 번에 그려 주세요",gap:520,vehicle:"ambulance",leftY:395,rightY:415,waterY:588},
  {title:"5. 깊은 골짜기",goal:"물에 닿지 않게 길을 그려 주세요",gap:565,vehicle:"bus",leftY:392,rightY:392,waterY:555},
  {title:"6. 높은 건너편",goal:"오른쪽 높은 벽까지 부드럽게 이어 주세요",gap:545,vehicle:"sedan",leftY:430,rightY:345,waterY:585},
  {title:"7. 소방차 출동",goal:"긴 틈을 끊기지 않는 선 하나로 이어 주세요",gap:610,vehicle:"firetruck",leftY:402,rightY:385,waterY:575},
  {title:"8. 마지막 협곡",goal:"가장 긴 골짜기를 한 줄로 건너 보세요",gap:650,vehicle:"truck",leftY:420,rightY:360,waterY:565}
];

var S={
  level:0,
  mode:"build",
  points:[],
  roadProfile:null,
  drawing:false,
  drawLength:0,
  bridgeReady:false,
  vehicle:null,
  pointer:null,
  pointerAngle:0,
  last:performance.now(),
  paused:false,
  toastTimer:0,
  hintTimer:0,
  autoTimer:0,
  smoke:[]
};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function level(){return LEVELS[S.level]}

function banks(){
  var L=level(),cx=W/2;
  return{
    leftX:cx-L.gap/2,
    rightX:cx+L.gap/2,
    leftY:L.leftY,
    rightY:L.rightY,
    waterY:L.waterY
  };
}

function pointFromEvent(e){
  var r=canvas.getBoundingClientRect();
  return{
    x:clamp((e.clientX-r.left)*W/r.width,0,W),
    y:clamp((e.clientY-r.top)*H/r.height,0,H)
  };
}

function showToast(msg){
  el.toast.textContent=msg;
  el.toast.classList.add("show");
  clearTimeout(S.toastTimer);
  S.toastTimer=setTimeout(function(){el.toast.classList.remove("show")},1450);
}

function showHint(msg,fade){
  clearTimeout(S.hintTimer);
  el.hint.textContent=msg;
  el.hint.classList.remove("fade");
  if(fade!==false)S.hintTimer=setTimeout(function(){el.hint.classList.add("fade")},2200);
}

function parkVehicle(){
  var b=banks(),v=VEHICLES[level().vehicle];
  S.vehicle={
    x:b.leftX-58,
    y:b.leftY-29,
    angle:0,
    speed:v.speed,
    fall:false,
    vy:0,
    wobble:0
  };
}

function resetLevel(){
  clearTimeout(S.autoTimer);
  S.mode="build";
  S.points=[];
  S.roadProfile=null;
  S.drawing=false;
  S.drawLength=0;
  S.bridgeReady=false;
  S.pointer=null;
  S.smoke=[];
  el.result.classList.add("hidden");
  el.stageTitle.textContent=level().title;
  el.stageGoal.textContent=level().goal;
  parkVehicle();
  showHint("차 앞에서 반대쪽 벽까지 선을 그리면 자동으로 출발해요.",false);
}

function startStroke(p){
  if(S.paused||S.mode!=="build")return;
  clearTimeout(S.autoTimer);
  S.points=[];
  S.roadProfile=null;
  S.bridgeReady=false;
  S.drawLength=0;
  S.drawing=true;
  S.pointer=p;
  S.pointerAngle=0;
  S.smoke=[];
  parkVehicle();
  appendPoint(p,true);
}

function appendPoint(p,force){
  var pts=S.points;
  if(pts.length>=MAX_POINTS)return;
  var last=pts.length?pts[pts.length-1]:null;
  if(last){
    var d=dist(last,p);
    if(!force&&d<4)return;
    S.drawLength+=d;
    S.pointerAngle=Math.atan2(p.y-last.y,p.x-last.x);
  }
  pts.push({x:p.x,y:p.y});
  S.pointer={x:p.x,y:p.y};
}

function extendStroke(p){
  if(!S.drawing||S.paused)return;
  appendPoint(p,false);
}

function segmentYAtX(a,b,x){
  var dx=b.x-a.x;
  if(Math.abs(dx)<0.001){
    if(Math.abs(x-a.x)<=SAMPLE_STEP)return Math.min(a.y,b.y);
    return null;
  }
  var t=(x-a.x)/dx;
  if(t<0||t>1)return null;
  return a.y+(b.y-a.y)*t;
}

function smoothProfile(profile){
  if(profile.length<3)return profile;
  var out=profile.slice();
  for(var pass=0;pass<2;pass++){
    var next=out.slice();
    for(var i=1;i<out.length-1;i++){
      next[i]=out[i-1]*.2+out[i]*.6+out[i+1]*.2;
    }
    out=next;
  }
  return out;
}

function buildRoadProfile(){
  var b=banks();
  var count=Math.ceil((b.rightX-b.leftX)/SAMPLE_STEP)+1;
  var profile=new Array(count);

  for(var i=0;i<count;i++){
    var x=Math.min(b.rightX,b.leftX+i*SAMPLE_STEP);
    var best=null;
    for(var j=1;j<S.points.length;j++){
      var a=S.points[j-1],c=S.points[j];
      var minX=Math.min(a.x,c.x)-1,maxX=Math.max(a.x,c.x)+1;
      if(x<minX||x>maxX)continue;
      var y=segmentYAtX(a,c,x);
      if(y!==null&&(best===null||y<best))best=y;
    }
    profile[i]=best;
  }

  for(var k=0;k<profile.length;k++){
    if(profile[k]===null)return null;
  }

  if(Math.abs(profile[0]-b.leftY)>MAX_JOIN_Y)return null;
  if(Math.abs(profile[profile.length-1]-b.rightY)>MAX_JOIN_Y)return null;

  var blend=Math.min(10,Math.floor(profile.length/4));
  for(var n=0;n<=blend;n++){
    var t=n/Math.max(1,blend);
    profile[n]=b.leftY*(1-t)+profile[n]*t;
    var r=profile.length-1-n;
    profile[r]=b.rightY*(1-t)+profile[r]*t;
  }

  profile[0]=b.leftY;
  profile[profile.length-1]=b.rightY;
  return smoothProfile(profile);
}

function finishStroke(){
  if(!S.drawing)return;
  S.drawing=false;
  S.pointer=null;

  if(S.points.length<2||S.drawLength<40){
    S.points=[];
    S.roadProfile=null;
    S.bridgeReady=false;
    showToast("차 앞에서 반대쪽까지 길게 그려 주세요");
    return;
  }

  S.roadProfile=buildRoadProfile();
  if(!S.roadProfile){
    S.bridgeReady=false;
    showToast("선이 양쪽 벽까지 이어져야 해요");
    showHint("벽 위에서 시작해 반대쪽 벽 위까지 쭉 그려 주세요.",false);
    return;
  }

  S.bridgeReady=true;
  showHint("좋아! 자동차가 출발합니다.",false);
  clearTimeout(S.autoTimer);
  S.autoTimer=setTimeout(function(){
    if(S.mode==="build"&&S.bridgeReady&&!S.drawing)startTest();
  },420);
}

function clearBridge(){
  if(S.paused||S.mode==="run")return;
  clearTimeout(S.autoTimer);
  S.mode="build";
  S.points=[];
  S.roadProfile=null;
  S.bridgeReady=false;
  S.drawing=false;
  S.pointer=null;
  S.drawLength=0;
  S.smoke=[];
  el.result.classList.add("hidden");
  parkVehicle();
  showHint("다시 한 줄 그리면 돼요.",false);
}

function roadYAt(x){
  var b=banks();
  if(x<=b.leftX)return b.leftY;
  if(x>=b.rightX)return b.rightY;
  if(!S.roadProfile)return null;
  var pos=(x-b.leftX)/SAMPLE_STEP;
  var i=Math.floor(pos);
  var t=pos-i;
  var a=S.roadProfile[clamp(i,0,S.roadProfile.length-1)];
  var c=S.roadProfile[clamp(i+1,0,S.roadProfile.length-1)];
  if(a==null||c==null)return null;
  return a+(c-a)*t;
}

function roadAngleAt(x){
  var y1=roadYAt(x-8),y2=roadYAt(x+8);
  if(y1==null||y2==null)return 0;
  return Math.atan2(y2-y1,16);
}

function startTest(){
  if(S.paused||S.mode!=="build"||!S.bridgeReady||!S.roadProfile)return;
  var b=banks(),v=VEHICLES[level().vehicle];
  S.mode="run";
  S.vehicle={
    x:b.leftX-58,
    y:b.leftY-29,
    angle:0,
    speed:v.speed,
    fall:false,
    vy:0,
    wobble:0
  };
  S.smoke=[];
  showHint("내가 그린 선 위로 달리는 중!",true);
  try{window.KidscadeGame?.start?.({level:S.level+1})}catch(_){}
}

function fail(msg){
  if(S.mode!=="run")return;
  S.mode="build";
  S.smoke=[];
  parkVehicle();
  showToast(msg);
  showHint("화면에 새 선을 그리면 바로 다시 도전해요.",false);
  try{window.KidscadeGame?.sound?.("wrong")}catch(_){}
}

function succeed(){
  if(S.mode!=="run")return;
  S.mode="end";
  var b=banks();
  var direct=Math.hypot(b.rightX-b.leftX,b.rightY-b.leftY);
  var efficiency=S.drawLength/Math.max(1,direct);
  var stars=efficiency<1.18?3:efficiency<1.48?2:1;
  el.resultIcon.textContent="🏁";
  el.resultTitle.textContent="건넜다!";
  el.resultText.textContent=stars===3?"짧고 매끈한 길이에요!":"자동차가 무사히 건넜어요.";
  el.stars.textContent="★".repeat(stars)+"☆".repeat(3-stars);
  el.result.classList.remove("hidden");
  try{
    window.KidscadeGame?.score?.((S.level+1)*100+stars*10);
    window.KidscadeGame?.sound?.("correct");
  }catch(_){}
}

function addSmoke(x,y){
  if(S.smoke.length>18)S.smoke.shift();
  S.smoke.push({x:x,y:y,r:5+Math.random()*4,life:1});
}

function updateRun(dt){
  if(S.mode!=="run"||S.paused||!S.vehicle)return;
  var b=banks(),v=S.vehicle;

  if(v.fall){
    v.vy+=760*dt;
    v.y+=v.vy*dt;
    v.angle+=2.1*dt;
    if(v.y>H+80)fail("차가 아래로 떨어졌어요");
    return;
  }

  v.x+=v.speed*dt;
  var y=roadYAt(v.x);
  if(y==null){
    v.fall=true;
    v.vy=0;
    return;
  }

  if(v.x>=b.leftX&&v.x<=b.rightX&&y>b.waterY-18){
    v.fall=true;
    v.vy=35;
    return;
  }

  var targetAngle=roadAngleAt(v.x);
  v.angle+=(targetAngle-v.angle)*Math.min(1,dt*12);
  v.wobble+=dt*8;
  v.y=y-28+Math.sin(v.wobble)*1.2;

  if(Math.random()<dt*7&&v.x>b.leftX-25)addSmoke(v.x-35,v.y+5);

  for(var i=S.smoke.length-1;i>=0;i--){
    var s=S.smoke[i];
    s.x-=20*dt;
    s.y-=18*dt;
    s.r+=8*dt;
    s.life-=dt*1.35;
    if(s.life<=0)S.smoke.splice(i,1);
  }

  if(v.x>b.rightX+90)succeed();
}

function drawCloud(x,y,s){
  ctx.fillStyle="rgba(255,255,255,.82)";
  ctx.beginPath();
  ctx.arc(x,y,26*s,0,TAU);
  ctx.arc(x+28*s,y-8*s,21*s,0,TAU);
  ctx.arc(x+55*s,y,25*s,0,TAU);
  ctx.fill();
}

function drawBricks(x,y,w,h){
  ctx.save();
  ctx.beginPath();
  ctx.rect(x,y,w,h);
  ctx.clip();

  var grad=ctx.createLinearGradient(0,y,0,H);
  grad.addColorStop(0,"#f47126");
  grad.addColorStop(1,"#c84220");
  ctx.fillStyle=grad;
  ctx.fillRect(x,y,w,h);

  ctx.strokeStyle="rgba(255,199,107,.62)";
  ctx.lineWidth=4;
  var bh=36,bw=82;
  for(var yy=y;yy<y+h;yy+=bh){
    ctx.beginPath();
    ctx.moveTo(x,yy);
    ctx.lineTo(x+w,yy);
    ctx.stroke();
    var row=Math.floor((yy-y)/bh);
    var offset=row%2?bw/2:0;
    for(var xx=x-bw+offset;xx<x+w+bw;xx+=bw){
      ctx.beginPath();
      ctx.moveTo(xx,yy);
      ctx.lineTo(xx,Math.min(yy+bh,y+h));
      ctx.stroke();
    }
  }

  ctx.fillStyle="rgba(255,188,72,.75)";
  ctx.fillRect(x,y,w,10);
  ctx.restore();
}

function drawEndpoint(x,y,active){
  ctx.save();
  ctx.strokeStyle=active?"rgba(255,216,72,.98)":"rgba(255,255,255,.92)";
  ctx.fillStyle=active?"rgba(255,216,72,.26)":"rgba(255,255,255,.18)";
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.arc(x,y,12,0,TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBackground(){
  var b=banks();
  var sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,"#1db8ea");
  sky.addColorStop(1,"#77dbf7");
  ctx.fillStyle=sky;
  ctx.fillRect(0,0,W,H);

  drawCloud(95,105,1);
  drawCloud(380,145,.72);
  drawCloud(930,112,.88);

  ctx.fillStyle="rgba(22,128,196,.26)";
  ctx.fillRect(b.leftX,b.waterY,b.rightX-b.leftX,H-b.waterY);
  ctx.strokeStyle="rgba(255,255,255,.25)";
  ctx.lineWidth=2;
  for(var y=b.waterY+14;y<H;y+=20){
    ctx.beginPath();
    ctx.moveTo(b.leftX+8,y);
    for(var x=b.leftX+8;x<b.rightX-10;x+=38){
      ctx.quadraticCurveTo(x+12,y-5,x+25,y);
    }
    ctx.stroke();
  }

  drawBricks(0,b.leftY,b.leftX,H-b.leftY);
  drawBricks(b.rightX,b.rightY,W-b.rightX,H-b.rightY);

  ctx.fillStyle="rgba(20,39,54,.28)";
  ctx.fillRect(0,b.leftY-4,b.leftX,4);
  ctx.fillRect(b.rightX,b.rightY-4,W-b.rightX,4);

  if(S.mode==="build"){
    drawEndpoint(b.leftX,b.leftY,S.drawing);
    drawEndpoint(b.rightX,b.rightY,S.drawing);
  }
}

function drawBridge(){
  if(S.points.length<2)return;

  ctx.lineCap="round";
  ctx.lineJoin="round";

  ctx.strokeStyle="rgba(8,20,30,.28)";
  ctx.lineWidth=22;
  ctx.beginPath();
  ctx.moveTo(S.points[0].x,S.points[0].y+6);
  for(var i=1;i<S.points.length;i++)ctx.lineTo(S.points[i].x,S.points[i].y+6);
  ctx.stroke();

  ctx.strokeStyle=S.bridgeReady?"#20252b":"#323941";
  ctx.lineWidth=17;
  ctx.beginPath();
  ctx.moveTo(S.points[0].x,S.points[0].y);
  for(var j=1;j<S.points.length;j++)ctx.lineTo(S.points[j].x,S.points[j].y);
  ctx.stroke();

  ctx.strokeStyle="rgba(255,255,255,.18)";
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(S.points[0].x,S.points[0].y-3);
  for(var k=1;k<S.points.length;k++)ctx.lineTo(S.points[k].x,S.points[k].y-3);
  ctx.stroke();
}

function drawSmoke(){
  for(var i=0;i<S.smoke.length;i++){
    var s=S.smoke[i];
    ctx.fillStyle="rgba(255,255,255,"+(s.life*.75)+")";
    ctx.beginPath();
    ctx.arc(s.x,s.y,s.r,0,TAU);
    ctx.fill();
  }
}

function drawCar(){
  var v=S.vehicle;
  if(!v)return;

  ctx.save();
  ctx.translate(v.x,v.y);
  ctx.rotate(clamp(v.angle,-1.15,1.15));

  ctx.fillStyle="#f8cf08";
  ctx.beginPath();
  ctx.roundRect(-34,-15,68,27,8);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-20,-15);
  ctx.lineTo(-6,-31);
  ctx.quadraticCurveTo(0,-36,14,-33);
  ctx.lineTo(27,-15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle="#a7def5";
  ctx.beginPath();
  ctx.moveTo(-13,-16);
  ctx.lineTo(-4,-28);
  ctx.lineTo(3,-29);
  ctx.lineTo(3,-16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(7,-29);
  ctx.lineTo(14,-28);
  ctx.lineTo(22,-16);
  ctx.lineTo(7,-16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle="#20242b";
  ctx.beginPath();
  ctx.arc(-20,12,10,0,TAU);
  ctx.arc(21,12,10,0,TAU);
  ctx.fill();

  ctx.fillStyle="#f5f7f9";
  ctx.beginPath();
  ctx.arc(-20,12,5,0,TAU);
  ctx.arc(21,12,5,0,TAU);
  ctx.fill();

  ctx.fillStyle="#fff7b3";
  ctx.beginPath();
  ctx.arc(33,-4,4,0,TAU);
  ctx.fill();
  ctx.restore();
}

function drawMarker(){
  if(!S.drawing||!S.pointer)return;
  var p=S.pointer;
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(S.pointerAngle+.22);
  ctx.fillStyle="#1769ff";
  ctx.beginPath();
  ctx.roundRect(18,-9,78,18,8);
  ctx.fill();
  ctx.fillStyle="#eef5ff";
  ctx.fillRect(7,-9,23,18);
  ctx.fillStyle="#22262d";
  ctx.beginPath();
  ctx.moveTo(7,-9);
  ctx.lineTo(-5,0);
  ctx.lineTo(7,9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function render(){
  ctx.clearRect(0,0,W,H);
  drawBackground();
  drawBridge();
  drawSmoke();
  drawCar();
  drawMarker();
}

function fitCanvas(){
  var wrap=canvas.parentElement;
  var r=wrap.getBoundingClientRect();
  var scale=Math.min(r.width/W,r.height/H);
  canvas.style.width=Math.max(1,Math.floor(W*scale))+"px";
  canvas.style.height=Math.max(1,Math.floor(H*scale))+"px";
}

function tick(now){
  var dt=Math.min(.04,Math.max(0,(now-S.last)/1000));
  S.last=now;
  if(!S.paused)updateRun(dt);
  render();
  requestAnimationFrame(tick);
}

function changeLevel(delta){
  if(S.mode==="run"||S.paused)return;
  S.level=(S.level+delta+LEVELS.length)%LEVELS.length;
  resetLevel();
}

canvas.addEventListener("pointerdown",function(e){
  if(S.paused||S.mode!=="build")return;
  e.preventDefault();
  if(canvas.setPointerCapture)canvas.setPointerCapture(e.pointerId);
  startStroke(pointFromEvent(e));
});

canvas.addEventListener("pointermove",function(e){
  if(!S.drawing||S.paused)return;
  e.preventDefault();
  extendStroke(pointFromEvent(e));
});

["pointerup","pointercancel","lostpointercapture"].forEach(function(type){
  canvas.addEventListener(type,function(e){
    if(!S.drawing)return;
    if(e.clientX!=null&&e.clientY!=null)appendPoint(pointFromEvent(e),false);
    e.preventDefault();
    finishStroke();
  });
});

el.reset.addEventListener("click",clearBridge);
el.retry.addEventListener("click",function(){
  el.result.classList.add("hidden");
  clearBridge();
});
el.cont.addEventListener("click",function(){
  S.level=(S.level+1)%LEVELS.length;
  resetLevel();
});
el.prev.addEventListener("click",function(){changeLevel(-1)});
el.next.addEventListener("click",function(){changeLevel(1)});
el.help.addEventListener("click",function(){el.tutorial.classList.remove("hidden")});
el.tutorialClose.addEventListener("click",function(){el.tutorial.classList.add("hidden")});
window.addEventListener("resize",fitCanvas);

try{
  window.KidscadeGame?.registerPauseHandlers?.({
    pause:function(){
      if(S.drawing)finishStroke();
      clearTimeout(S.autoTimer);
      S.paused=true;
    },
    resume:function(){
      S.paused=false;
      S.last=performance.now();
    }
  });
}catch(_){}

resetLevel();
fitCanvas();
requestAnimationFrame(tick);
})();