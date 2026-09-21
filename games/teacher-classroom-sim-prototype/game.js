(function(){
  "use strict";
  var app=document.getElementById("app");
  if(!app||app.dataset.ready)return;
  app.dataset.ready="1";
  var q=function(s){return app.querySelector(s)};
  var qa=function(s){return Array.from(app.querySelectorAll(s))};
  var clamp=function(v,min,max){min=min===undefined?0:min;max=max===undefined?1:max;return Math.max(min,Math.min(max,v))};
  var rand=function(a,b){return a+Math.random()*(b-a)};
  var pick=function(arr){return arr[Math.floor(Math.random()*arr.length)]};

  var ASSET="../../assets/game/characters/people/kenney-platformer-characters/";
  var SCENES=["classroom","hallway","gym","playground","cafeteria"];
  var SCENE_NAME={classroom:"교실",hallway:"복도",gym:"체육관",playground:"운동장",cafeteria:"급식실"};

  var schedule=[
    {start:520,end:540,name:"등교·아침활동",loc:"classroom",kind:"morning"},
    {start:540,end:580,name:"1교시 · 수학",loc:"classroom",kind:"lesson",subject:"수학"},
    {start:580,end:590,name:"쉬는시간",loc:"free",kind:"break"},
    {start:590,end:630,name:"2교시 · 국어",loc:"classroom",kind:"lesson",subject:"국어"},
    {start:630,end:640,name:"쉬는시간",loc:"free",kind:"break"},
    {start:640,end:680,name:"3교시 · 체육",loc:"gym",kind:"lesson",subject:"체육"},
    {start:680,end:690,name:"쉬는시간",loc:"free",kind:"break"},
    {start:690,end:730,name:"4교시 · 과학",loc:"classroom",kind:"lesson",subject:"과학"},
    {start:730,end:755,name:"점심시간 · 식사",loc:"cafeteria",kind:"lunch"},
    {start:755,end:780,name:"점심시간 · 놀이",loc:"freeLunch",kind:"lunchplay"},
    {start:780,end:820,name:"5교시 · 사회",loc:"classroom",kind:"lesson",subject:"사회"},
    {start:820,end:830,name:"쉬는시간",loc:"free",kind:"break"},
    {start:830,end:870,name:"6교시 · 미술",loc:"classroom",kind:"lesson",subject:"미술"},
    {start:870,end:890,name:"청소·종례",loc:"classroom",kind:"closing"}
  ];

  var seats=[
    {x:15,y:44},{x:38,y:44},{x:61,y:44},{x:84,y:44},
    {x:15,y:73},{x:38,y:73},{x:61,y:73},{x:84,y:73}
  ];
  var sceneSpots={
    classroom:[{x:15,y:44},{x:38,y:44},{x:61,y:44},{x:84,y:44},{x:15,y:73},{x:38,y:73},{x:61,y:73},{x:84,y:73},{x:26,y:86},{x:73,y:86}],
    hallway:[{x:10,y:42},{x:25,y:58},{x:40,y:42},{x:55,y:61},{x:70,y:43},{x:86,y:59},{x:20,y:82},{x:48,y:82},{x:77,y:81}],
    gym:[{x:18,y:35},{x:31,y:65},{x:44,y:40},{x:56,y:65},{x:68,y:39},{x:82,y:65},{x:38,y:82},{x:64,y:82}],
    playground:[{x:22,y:34},{x:37,y:60},{x:51,y:35},{x:65,y:61},{x:79,y:36},{x:28,y:78},{x:53,y:78},{x:76,y:77}],
    cafeteria:[{x:23,y:42},{x:37,y:42},{x:63,y:42},{x:77,y:42},{x:23,y:70},{x:37,y:70},{x:63,y:70},{x:77,y:70}]
  };

  var templates=[
    {name:"민수",char:"player",imp:.84,soc:.84,persist:.34,energy:.84,skill:.48,move:.78,hands:.82,visual:.38,verbal:.46,noise:.42,compete:.72},
    {name:"지우",char:"female",imp:.35,soc:.73,persist:.68,energy:.75,skill:.66,move:.38,hands:.63,visual:.70,verbal:.68,noise:.35,compete:.38},
    {name:"서연",char:"female",imp:.18,soc:.36,persist:.91,energy:.72,skill:.84,move:.20,hands:.56,visual:.83,verbal:.81,noise:.28,compete:.54},
    {name:"준호",char:"adventurer",imp:.67,soc:.79,persist:.55,energy:.88,skill:.61,move:.72,hands:.86,visual:.43,verbal:.55,noise:.40,compete:.84},
    {name:"태호",char:"player",imp:.43,soc:.44,persist:.47,energy:.62,skill:.30,move:.42,hands:.90,visual:.76,verbal:.34,noise:.50,compete:.46},
    {name:"유나",char:"female",imp:.29,soc:.59,persist:.74,energy:.49,skill:.73,move:.28,hands:.52,visual:.78,verbal:.72,noise:.33,compete:.31},
    {name:"현우",char:"soldier",imp:.76,soc:.50,persist:.28,energy:.80,skill:.55,move:.91,hands:.93,visual:.34,verbal:.42,noise:.47,compete:.77},
    {name:"소라",char:"adventurer",imp:.22,soc:.42,persist:.84,energy:.74,skill:.44,move:.25,hands:.64,visual:.91,verbal:.62,noise:.61,compete:.29}
  ];

  var relations={
    "민수|지우":.88,"민수|준호":.78,"지우|서연":.57,"준호|현우":.71,
    "소라|유나":.77,"태호|유나":.48,"민수|태호":.26,"서연|소라":.55
  };

  var students=[];
  var gameSec=520*60;
  var periodIndex=0;
  var running=true;
  var selected=null;
  var swapMode=false;
  var teacherScene="classroom";
  var teacher={x:50,y:22};
  var stats=null;
  var feed=[];
  var reportOpen=false;
  var lastFrame=performance.now();
  var aiAccumulator=0;
  var renderAccumulator=0;

  function pairKey(a,b){return [a,b].sort().join("|")}
  function friendship(a,b){
    var v=relations[pairKey(a.name,b.name)];
    return v===undefined?.34:v;
  }
  function changeFriendship(a,b,delta){
    var k=pairKey(a.name,b.name);
    relations[k]=clamp((relations[k]===undefined?.34:relations[k])+delta);
  }
  function current(){return schedule[Math.min(periodIndex,schedule.length-1)]}
  function gameMinute(){return Math.floor(gameSec/60)}
  function fmtMin(m){return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
  function posePath(s,pose){return ASSET+s.char+"/poses/"+s.char+"-"+pose+".png"}
  function fallbackPose(s){return posePath(s,"stand")}

  function resetStudents(){
    students=templates.map(function(t,i){
      var p=seats[i];
      return Object.assign({},t,{
        id:i,seat:i,scene:"classroom",targetScene:null,arrivalAt:0,x:p.x,y:p.y,dx:p.x,dy:p.y,
        focus:.72,boredom:.14,talkNeed:.14,moveNeed:t.move*.14,helpNeed:.08,sleepNeed:(1-t.energy)*.24,
        action:"READ",intent:null,intentTicks:0,actionTicks:rand(2,5),trust:.62,learned:0,interventions:0,
        memory:[],lastObserved:"등교 준비 중",moving:false
      });
    });
  }
  function newStats(){
    stats={
      events:[],fitSamples:[],engageSamples:[],learningStart:students.map(function(s){return s.skill}),
      teacherActs:0,disruptions:0,helped:0,praises:0,lateTicks:0
    };
  }
  function remember(s,text,weight){
    s.memory.unshift({text:text,weight:weight||.5,time:gameMinute()});
    s.memory=s.memory.slice(0,8);
  }
  function log(text,type,scene){
    type=type||"normal";
    scene=scene||teacherScene;
    var item={stamp:fmtMin(gameMinute()),text:text,type:type,scene:scene};
    feed.unshift(item);feed=feed.slice(0,10);
    if(stats&&current().kind==="lesson"&&type!=="ambient")stats.events.push(item);
    renderFeed();
  }
  function spotFor(s,scene,free){
    if(scene==="classroom"&&!free&&current().kind==="lesson")return seats[s.seat];
    var list=sceneSpots[scene]||sceneSpots.classroom;
    var base=list[s.id%list.length];
    return {x:clamp(base.x+rand(-4,4),6,94),y:clamp(base.y+rand(-4,4),18,90)};
  }
  function setDestination(s,scene,free){
    var p=spotFor(s,scene,free);
    s.dx=p.x;s.dy=p.y;
  }
  function sendToScene(s,target,free){
    if(s.scene===target&&!s.targetScene){setDestination(s,target,free);return}
    if(s.scene!==target){
      if(s.scene!=="hallway"&&target!=="hallway"){
        s.scene="hallway";s.targetScene=target;s.arrivalAt=gameSec+rand(18,38);setDestination(s,"hallway",true);
      }else{
        s.scene=target;s.targetScene=null;s.arrivalAt=0;setDestination(s,target,free);
      }
      s.action="WALK";s.actionTicks=3;
    }
  }
  function chooseBreakScene(s){
    var hallwayScore=s.move*.45+s.soc*.35+s.imp*.20+rand(-.12,.12);
    return hallwayScore>.48?"hallway":"classroom";
  }
  function chooseLunchPlayScene(s){
    var outside=s.move*.48+s.soc*.24+s.energy*.18+rand(-.12,.12);
    if(outside>.50)return "playground";
    return s.soc>.56?"hallway":"classroom";
  }
  function assignPeriodDestinations(){
    var p=current();
    students.forEach(function(s){
      var target="classroom",free=false;
      if(p.kind==="lesson"){target=p.loc;free=false}
      else if(p.kind==="morning"){target="classroom";free=true}
      else if(p.kind==="break"){target=chooseBreakScene(s);free=true}
      else if(p.kind==="lunch"){target="cafeteria";free=true}
      else if(p.kind==="lunchplay"){target=chooseLunchPlayScene(s);free=true}
      else if(p.kind==="closing"){target="classroom";free=true}
      sendToScene(s,target,free);
    });
    if(p.loc!=="free"&&p.loc!=="freeLunch")teacherScene=p.loc;
    else if(p.kind==="break")teacherScene="hallway";
    else if(p.kind==="lunchplay")teacherScene="playground";
    teacher.x=50;teacher.y=20;
  }
  function updateTransit(){
    students.forEach(function(s){
      if(s.targetScene&&gameSec>=s.arrivalAt){
        var target=s.targetScene;s.targetScene=null;s.scene=target;s.arrivalAt=0;setDestination(s,target,current().kind!=="lesson");
        s.action="WALK";s.actionTicks=2;
        if(current().kind==="lesson"&&target===current().loc&&Math.random()<.28)log(s.name+"이(가) 조금 늦게 "+SCENE_NAME[target]+"에 도착했다.","incident",target);
      }
    });
  }
  function nearestPartner(s,maxDist){
    var best=null,bestD=999;
    students.forEach(function(o){
      if(o===s||o.scene!==s.scene)return;
      var d=Math.hypot(o.x-s.x,o.y-s.y);
      if(d<maxDist&&d<bestD){bestD=d;best=o}
    });
    return best;
  }
  function teacherNear(s){
    if(s.scene!==teacherScene)return 0;
    return clamp(1-Math.hypot(s.x-teacher.x,s.y-teacher.y)/48);
  }
  function lessonFit(s){
    var p=current(),mode=q("#lesson").value;
    if(p.subject==="체육")return .62*s.move+.23*s.soc+.15*s.compete;
    if(p.subject==="미술")return .55*s.hands+.45*s.visual;
    if(mode==="hands")return s.hands;
    if(mode==="pair")return s.soc;
    if(mode==="quiz")return .45*s.verbal+.30*s.soc+.25*s.persist;
    return .55*s.verbal+.45*s.persist;
  }
  function startAction(s,a){
    s.action=a;s.actionTicks=rand(2.5,6);
    var p=nearestPartner(s,25);
    if(a==="TALK"){
      s.talkNeed=clamp(s.talkNeed-.15);
      if(current().kind==="lesson"){
        stats.disruptions++;
        if(Math.random()<.48)log(s.name+"이(가) "+(p?p.name+"에게":"옆자리 쪽으로")+" 말을 걸기 시작했다.","incident",s.scene);
      }else if(p&&Math.random()<.36){
        changeFriendship(s,p,.006);log(s.name+"와 "+p.name+"이(가) 이야기를 나누고 있다.","social",s.scene);
      }
    }
    if(a==="MOVE"&&current().kind==="lesson"&&Math.random()<.40){stats.disruptions++;log(s.name+"이(가) 몸을 크게 움직여 주변의 시선을 끌었다.","incident",s.scene)}
    if(a==="SLEEP")log(s.name+"이(가) 점점 고개를 떨구기 시작했다.","incident",s.scene);
    if(a==="HELP")log(s.name+"이(가) 문제에서 막혀 도움을 기다리고 있다.","learning",s.scene);
    if(a==="RUN"&&p&&Math.random()<s.imp*.15){
      log(s.name+"이(가) 뛰다가 "+p.name+"과(와) 부딪힐 뻔했다.","incident",s.scene);remember(s,"복도에서 뛰다 부딪힐 뻔함",.45);
    }
    if(a==="PLAY"&&p&&Math.random()<.16){
      changeFriendship(s,p,.01);log(s.name+"와 "+p.name+"이(가) 함께 놀이를 시작했다.","social",s.scene);
    }
    if(a==="COMPETE"&&p){
      if(Math.random()<(.12+s.imp*.11+s.compete*.10)){
        changeFriendship(s,p,-.012);log(s.name+"와 "+p.name+" 사이에 승부 때문에 작은 실랑이가 생겼다.","incident",s.scene);
      }else if(Math.random()<.22){
        changeFriendship(s,p,.006);log(s.name+"와 "+p.name+"이(가) 승부를 즐기고 있다.","social",s.scene);
      }
    }
    if(a==="SHARE"&&p){
      changeFriendship(s,p,.012);log(s.name+"이(가) "+p.name+"에게 반찬을 건넸다.","social","cafeteria");
    }
    if(a==="EAT"&&Math.random()<.025+s.imp*.02){
      log(s.name+"이(가) 식판에서 음식 하나를 떨어뜨렸다.","incident","cafeteria");
    }
  }
  function decideLesson(s){
    if(s.scene!==current().loc||s.targetScene){s.action="WALK";return}
    var fit=lessonFit(s),near=teacherNear(s),hard=clamp(.70-s.skill+.16),p=nearestPartner(s,27);
    var vals={
      WORK:.38+s.persist*.25+s.focus*.25+fit*.22,
      TALK:s.talkNeed*.42+s.soc*.22+s.imp*.16+(p?friendship(s,p)*.18:0)-near*s.trust*.48+(1-fit)*.14+rand(-.035,.035),
      DOODLE:s.boredom*.50+s.imp*.12+(1-fit)*.22-near*.20+rand(-.03,.03),
      HELP:s.helpNeed*.48+hard*.38+s.persist*.08+near*.08,
      SLEEP:s.sleepNeed*.64+(1-s.energy)*.25-near*.18,
      MOVE:s.moveNeed*.57+s.move*.22+s.imp*.15-near*.36+rand(-.03,.03)
    };
    if(current().subject==="체육"){
      vals.PLAY=.42+s.move*.30+s.energy*.18+s.soc*.10;
      vals.COMPETE=.25+s.compete*.38+s.soc*.14+s.energy*.12;
      vals.REST=.16+(1-s.energy)*.45;
      vals.WORK=-1;vals.DOODLE=-1;vals.HELP=-1;
    }
    var best=Object.keys(vals)[0];
    Object.keys(vals).forEach(function(k){if(vals[k]>vals[best])best=k});
    if(best!=="WORK"&&vals[best]>.54){
      if(s.intent===best)s.intentTicks++;else{s.intent=best;s.intentTicks=1}
      if(s.intentTicks>=2){startAction(s,best);s.intent=null;s.intentTicks=0}
    }else{
      s.intent=null;s.intentTicks=0;
      if(s.actionTicks<=0)s.action=current().subject==="체육"?"PLAY":"WORK";
    }
  }
  function decideFree(s){
    if(s.targetScene){s.action="WALK";return}
    var p=current(),choices=[];
    if(p.kind==="morning"){
      choices=[["READ",.36+s.persist*.28],["TALK",.18+s.soc*.35],["WALK",.10+s.move*.20]];
    }else if(p.kind==="break"){
      if(s.scene==="hallway")choices=[["WALK",.20],["RUN",.08+s.move*.35+s.imp*.18],["TALK",.16+s.soc*.38],["WAIT",.12]];
      else choices=[["READ",.16+s.persist*.22],["TALK",.18+s.soc*.38],["DOODLE",.12+s.visual*.22],["WALK",.09+s.move*.18]];
    }else if(p.kind==="lunch"){
      choices=[["EAT",.45],["TALK",.12+s.soc*.30],["SHARE",.05+s.soc*.16],["WAIT",.08]];
    }else if(p.kind==="lunchplay"){
      if(s.scene==="playground")choices=[["PLAY",.20+s.move*.35+s.soc*.12],["COMPETE",.08+s.compete*.30],["RUN",.10+s.move*.25],["TALK",.12+s.soc*.28],["REST",.12+(1-s.energy)*.25]];
      else choices=[["TALK",.16+s.soc*.36],["READ",.14+s.persist*.18],["WALK",.12+s.move*.22]];
    }else if(p.kind==="closing"){
      choices=[["CLEAN",.42+s.persist*.15],["TALK",.12+s.soc*.24],["WALK",.10+s.move*.14]];
    }
    if(!choices.length){s.action="WAIT";return}
    var total=choices.reduce(function(a,c){return a+c[1]},0),r=Math.random()*total,chosen=choices[0][0];
    for(var i=0;i<choices.length;i++){r-=choices[i][1];if(r<=0){chosen=choices[i][0];break}}
    startAction(s,chosen);
    if(chosen==="WALK"||chosen==="RUN"||chosen==="PLAY"||chosen==="COMPETE")setDestination(s,s.scene,true);
  }
  function updateStudent(s){
    if(s.actionTicks>0)s.actionTicks-=.6;
    if(current().kind==="lesson"){
      var fit=lessonFit(s);
      s.talkNeed=clamp(s.talkNeed+.018*s.soc+.014*(1-fit));
      s.moveNeed=clamp(s.moveNeed+.016*s.move);
      s.helpNeed=clamp(s.helpNeed+.015*clamp(.69-s.skill));
      s.sleepNeed=clamp(s.sleepNeed+.006*(1-s.energy));
      s.boredom=clamp(s.boredom+.013*(1-fit)-.006*s.persist);
      if(s.scene!==current().loc)stats.lateTicks++;
      if(s.action==="WORK"&&s.scene===current().loc){
        s.focus=clamp(s.focus+.009*fit-.006*s.boredom);
        var gain=.00155*fit*s.focus;s.skill=clamp(s.skill+gain);s.learned+=gain;
      }else if(s.action==="TALK"){s.focus=clamp(s.focus-.03)}
      else if(s.action==="DOODLE"){s.boredom=clamp(s.boredom-.09);s.focus=clamp(s.focus-.018)}
      else if(s.action==="SLEEP"){s.focus=clamp(s.focus-.03);s.sleepNeed=clamp(s.sleepNeed-.07)}
      else if(s.action==="MOVE"){s.moveNeed=clamp(s.moveNeed-.10);s.focus=clamp(s.focus-.015)}
      if(s.actionTicks<=0)decideLesson(s);
      else if(s.action==="WORK")decideLesson(s);
    }else{
      s.talkNeed=clamp(s.talkNeed+.008*s.soc);
      s.moveNeed=clamp(s.moveNeed+.006*s.move);
      if(s.actionTicks<=0)decideFree(s);
    }
  }
  function updateMovement(dt,speed){
    students.forEach(function(s){
      var dx=s.dx-s.x,dy=s.dy-s.y,d=Math.hypot(dx,dy);
      s.moving=d>.7;
      if(d>.7){
        var step=Math.min(d,dt*(8+speed*3));
        s.x+=dx/d*step;s.y+=dy/d*step;
        if(s.action!=="RUN")s.action="WALK";
      }
    });
  }
  function sampleStats(){
    if(current().kind!=="lesson")return;
    var fit=students.reduce(function(a,s){return a+lessonFit(s)},0)/students.length;
    var eng=students.reduce(function(a,s){
      if(s.scene!==current().loc)return a+.05;
      var v=(s.action==="WORK"||s.action==="HELP"||s.action==="PLAY"||s.action==="COMPETE")?s.focus:Math.max(.12,s.focus-.25);
      return a+v;
    },0)/students.length;
    stats.fitSamples.push(fit);stats.engageSamples.push(eng);
  }
  function teacherAction(kind){
    var s=students.find(function(x){return x.id===selected});
    if(!s||s.scene!==teacherScene)return;
    stats.teacherActs++;s.interventions++;
    if(kind==="approach"){
      teacher.x=clamp(s.x-7,5,95);teacher.y=clamp(s.y-10,15,91);s.focus=clamp(s.focus+.07);s.action=current().subject==="체육"?"PLAY":"WORK";s.intent=null;
      log("선생님이 "+s.name+" 가까이 다가갔다.","teacher",teacherScene);
    }else if(kind==="call"){
      s.focus=clamp(s.focus+.13);s.action=current().subject==="체육"?"PLAY":"WORK";s.intent=null;remember(s,"선생님이 이름을 불러 주의를 환기함",.35);
      log(s.name+"의 이름을 불러 다시 활동으로 시선을 돌렸다.","teacher",teacherScene);
    }else if(kind==="praise"){
      s.focus=clamp(s.focus+.08);s.trust=clamp(s.trust+.04);stats.praises++;remember(s,"선생님에게 칭찬받음",.55);
      log(s.name+"의 시도나 행동을 구체적으로 칭찬했다.","teacher",teacherScene);
    }else if(kind==="hint"){
      s.helpNeed=clamp(s.helpNeed-.16);s.skill=clamp(s.skill+.008);s.focus=clamp(s.focus+.08);stats.helped++;remember(s,"선생님에게 힌트를 받아 문제를 해결함",.55);
      log(s.name+"에게 문제의 핵심을 짚는 힌트를 주었다.","learning",teacherScene);
    }else if(kind==="chalk"){
      s.focus=clamp(s.focus+.18);s.trust=clamp(s.trust-.02);s.action="WORK";s.intent=null;remember(s,"분필 톡으로 주의를 환기당함",.3);
      students.forEach(function(o){if(o.scene===s.scene&&Math.hypot(o.x-s.x,o.y-s.y)<28)o.focus=clamp(o.focus+.025)});
      log("분필이 책상 가까이에 톡 닿자 "+s.name+"과 주변 학생들이 잠시 조용해졌다.","teacher",teacherScene);
    }
    render();
  }
  function scoreReport(){
    var p=current();
    var fitAvg=stats.fitSamples.length?stats.fitSamples.reduce(function(a,b){return a+b},0)/stats.fitSamples.length:.60;
    var engAvg=stats.engageSamples.length?stats.engageSamples.reduce(function(a,b){return a+b},0)/stats.engageSamples.length:.55;
    var gain=students.reduce(function(a,s,i){return a+Math.max(0,s.skill-stats.learningStart[i])},0)/students.length;
    var design=Math.round(fitAvg*100);
    var engage=Math.round(engAvg*100);
    var learning=Math.round(Math.min(100,52+gain*3500+stats.helped*3));
    var latenessPenalty=Math.min(14,stats.lateTicks*.22);
    var climate=Math.round(clamp((92-stats.disruptions*7-latenessPenalty+Math.min(9,stats.teacherActs*1.3))/100)*100);
    var avg=(design+engage+learning+climate)/4;
    var grade=avg>=90?"A+":avg>=84?"A":avg>=78?"B+":avg>=70?"B":avg>=62?"C+":"C";
    return {p:p,design:design,engage:engage,learning:learning,climate:climate,grade:grade};
  }
  function openReport(force){
    if(reportOpen)return;
    if(current().kind!=="lesson"&&!force)return;
    reportOpen=true;running=false;
    var r=scoreReport();
    q("#reportTitle").textContent=r.p.name+" 결과";
    q("#reportSub").textContent=fmtMin(r.p.start)+"~"+fmtMin(r.p.end)+" · "+q("#lesson").selectedOptions[0].textContent;
    q("#grade").textContent=r.grade;q("#mDesign").textContent=r.design;q("#mEngage").textContent=r.engage;q("#mLearn").textContent=r.learning;q("#mClimate").textContent=r.climate;
    var events=stats.events.filter(function(e){return e.type!=="ambient"}).slice(-9);
    q("#incidentList").innerHTML=events.length?events.map(function(e){return "<li><strong>"+e.stamp+"</strong> ["+SCENE_NAME[e.scene]+"] "+e.text+"</li>"}).join(""):"<li>큰 사건 없이 수업이 진행되었다.</li>";
    var findings=[];
    var low=students.filter(function(s){return s.focus<.48}).sort(function(a,b){return a.focus-b.focus}).slice(0,2);
    low.forEach(function(s){findings.push(s.name+"은(는) 이번 시간에 집중을 오래 유지하지 못했다.")});
    var support=students.slice().sort(function(a,b){return a.skill-b.skill})[0];
    if(support)findings.push(support.name+"은(는) 현재 개념을 추가로 확인할 필요가 있어 보인다.");
    var strong=students.slice().sort(function(a,b){return b.focus-a.focus})[0];
    if(strong)findings.push(strong.name+"은(는) 현재 수업 구조에 안정적으로 참여했다.");
    if(stats.disruptions>=3)findings.push("작은 행동이 주변 학생에게 번지며 수업 흐름이 여러 번 흔들렸다.");
    if(stats.lateTicks>7)findings.push("이동 전환에 시간이 걸려 수업 시작에 늦은 학생이 있었다.");
    if(stats.helped>0)findings.push("개별 힌트를 받은 학생에게 즉각적인 학습 회복이 나타났다.");
    q("#findingList").innerHTML=findings.map(function(x){return "<li>"+x+"</li>"}).join("");
    q("#report").hidden=false;
  }
  function nextPeriod(){
    reportOpen=false;q("#report").hidden=true;
    var old=current();gameSec=old.end*60;periodIndex=Math.min(periodIndex+1,schedule.length-1);
    if(gameSec<current().start*60)gameSec=current().start*60;
    newStats();assignPeriodDestinations();running=true;selected=null;log(current().name+"이(가) 시작되었다.","ambient",teacherScene);render();
  }
  function periodForMinute(m){
    for(var i=0;i<schedule.length;i++)if(m>=schedule[i].start&&m<schedule[i].end)return i;
    return schedule.length-1;
  }
  function handlePeriodChange(){
    var idx=periodForMinute(gameMinute());
    if(idx!==periodIndex){
      var old=schedule[periodIndex];
      if(old.kind==="lesson"){gameSec=old.end*60-1;openReport(false);return false}
      periodIndex=idx;newStats();assignPeriodDestinations();selected=null;log(current().name+"이(가) 시작되었다.","ambient",teacherScene);
    }
    return true;
  }
  function poseFor(s){
    if(s.moving)return Math.floor(gameSec)%2?"walk1":"walk2";
    var map={WORK:"action1",READ:"stand",TALK:"action2",DOODLE:"action1",HELP:"cheer1",SLEEP:"duck",MOVE:"idle",WALK:"walk1",RUN:"walk2",WAIT:"idle",PLAY:"jump",COMPETE:"kick",REST:"duck",EAT:"hold1",SHARE:"hold2",CLEAN:"action1"};
    return map[s.action]||"stand";
  }
  function actionClass(s){
    var a=s.action.toLowerCase();
    if(s.moving)a="walk";
    return a;
  }
  function seated(s){
    if(s.scene!=="classroom")return false;
    return ["WORK","READ","TALK","DOODLE","HELP","SLEEP"].indexOf(s.action)>=0&&current().kind!=="closing";
  }
  function thoughtMark(s){
    var map={TALK:"•••",DOODLE:"✎",HELP:"?",SLEEP:"Z",MOVE:"↔",PLAY:"○",COMPETE:"!"};
    return s.intent?map[s.intent]||"": "";
  }
  function renderProps(){
    var world=q("#world"),scene=teacherScene;
    world.className="world scene-"+scene;
    q("#sceneTitle").textContent=SCENE_NAME[scene];
    var html="";
    if(scene==="classroom"){
      html+='<div class="room-prop class-board">'+boardText()+'</div><div class="room-prop teacher-desk"></div><div class="room-prop class-window"></div><div class="room-prop class-door"></div><div class="room-prop class-shelf"></div>';
      seats.forEach(function(p){html+='<div class="fixed-desk" style="left:'+p.x+'%;top:'+p.y+'%"></div>'});
    }else if(scene==="hallway"){
      html+='<div class="room-prop hall-lockers">'+new Array(8).fill("<i></i>").join("")+'</div><div class="room-prop hall-line"></div><div class="room-prop hall-windows"><i></i><i></i><i></i></div>';
    }else if(scene==="gym"){
      html+='<div class="room-prop gym-line"></div><div class="room-prop gym-mid"></div><div class="room-prop gym-key-l"></div><div class="room-prop gym-key-r"></div><div class="room-prop hoop-l"></div><div class="room-prop hoop-r"></div>';
    }else if(scene==="playground"){
      html+='<div class="room-prop play-track"></div><div class="room-prop play-field"></div><div class="room-prop goal-l"></div><div class="room-prop goal-r"></div><div class="room-prop tree t1"></div><div class="room-prop tree t2"></div>';
    }else if(scene==="cafeteria"){
      html+='<div class="room-prop cafe-counter"></div><div class="cafe-table" style="left:30%;top:44%"></div><div class="cafe-table" style="left:70%;top:44%"></div><div class="cafe-table" style="left:30%;top:73%"></div><div class="cafe-table" style="left:70%;top:73%"></div>';
    }
    q("#props").innerHTML=html;
  }
  function boardText(){
    var p=current();
    if(p.kind==="lesson")return p.subject+" · "+q("#lesson").selectedOptions[0].textContent;
    if(p.kind==="morning")return "가방 정리 · 아침 독서";
    if(p.kind==="closing")return "청소 · 오늘 하루 돌아보기";
    return "우리 반";
  }
  function renderStudents(){
    var layer=q("#students");layer.innerHTML="";
    var visible=students.filter(function(s){return s.scene===teacherScene});
    visible.forEach(function(s){
      var b=document.createElement("button");b.type="button";
      b.className="student "+actionClass(s)+(seated(s)?" seated":"")+(selected===s.id?" selected":"");
      b.style.left=s.x+"%";b.style.top=s.y+"%";b.setAttribute("aria-label",s.name+" "+humanAction(s));
      var mark=thoughtMark(s);
      var img=document.createElement("img");img.className="sprite";img.alt="";img.src=posePath(s,poseFor(s));img.onerror=function(){if(this.dataset.fallback)return;this.dataset.fallback="1";this.src=fallbackPose(s)};
      var wrap=document.createElement("span");wrap.className="sprite-wrap";wrap.appendChild(img);
      if(mark){var th=document.createElement("span");th.className="thought";th.textContent=mark;b.appendChild(th)}
      b.appendChild(wrap);
      var mask=document.createElement("span");mask.className="student-desk-mask";b.appendChild(mask);
      var nm=document.createElement("span");nm.className="student-name";nm.textContent=s.name;b.appendChild(nm);
      b.addEventListener("click",function(){
        if(swapMode&&selected!==null&&selected!==s.id&&teacherScene==="classroom"){
          var a=students.find(function(x){return x.id===selected});
          if(a&&a.scene==="classroom"&&s.scene==="classroom"){
            var tmp=a.seat;a.seat=s.seat;s.seat=tmp;
            if(current().kind==="lesson"){setDestination(a,"classroom",false);setDestination(s,"classroom",false)}
            swapMode=false;log(a.name+"와 "+s.name+"의 자리를 바꾸었다.","teacher","classroom");
          }
        }
        selected=s.id;renderPanel();renderStudents();
      });
      layer.appendChild(b);
    });
    q("#offscreen").textContent=visible.length+"명 보임 · 다른 공간 "+(students.length-visible.length)+"명";
  }
  function humanAction(s){
    var map={WORK:"문제를 풀고 있음",READ:"읽고 있음",TALK:"친구와 이야기 중",DOODLE:"다른 것을 그리고 있음",HELP:"도움을 기다림",SLEEP:"졸고 있음",MOVE:"몸을 움직이고 있음",WALK:"이동 중",RUN:"뛰는 중",WAIT:"기다리는 중",PLAY:"놀이 중",COMPETE:"경쟁 활동 중",REST:"쉬는 중",EAT:"식사 중",SHARE:"친구에게 음식을 건네는 중",CLEAN:"정리 중"};
    return s.moving?"이동 중":(map[s.action]||"주변을 살피는 중");
  }
  function observationText(s){
    if(s.intent)return "행동으로 넘어가기 전의 작은 전조가 보인다.";
    if(s.action==="HELP")return "문제를 보다가 손을 들고 교사 쪽을 살핀다.";
    if(s.action==="TALK")return "몸과 시선이 가까운 친구 쪽으로 향해 있다.";
    if(s.action==="SLEEP")return "고개가 자꾸 아래로 떨어진다.";
    if(s.action==="RUN")return "주변보다 빠르게 이동하고 있다.";
    if(s.action==="COMPETE")return "승부 상황에 강하게 몰입하고 있다.";
    return "현재 몸짓과 시선에서 특별한 이상은 크게 보이지 않는다.";
  }
  function renderPanel(){
    var s=students.find(function(x){return x.id===selected});
    var buttons=["#approach","#call","#praise","#hint","#chalk","#seat"];
    buttons.forEach(function(id){q(id).disabled=!s||s.scene!==teacherScene});
    q("#seat").disabled=!s||teacherScene!=="classroom"||s.scene!=="classroom";
    if(!s){
      q("#studentName").textContent="학생 선택";q("#studentSummary").textContent="학생을 눌러 직접 개입할 수 있습니다. 다른 공간의 일은 직접 이동해서 확인해야 합니다.";q("#studentState").textContent="—";q("#memory").textContent="";return;
    }
    q("#studentName").textContent=s.name;q("#studentState").textContent=humanAction(s);q("#studentSummary").textContent=observationText(s);
    q("#seat").textContent=swapMode?"바꿀 학생 선택 중":"자리 바꾸기";
    q("#memory").textContent=s.memory.length?"최근 관찰: "+s.memory[0].text:"최근에 특별히 기록된 일 없음";
  }
  function renderFeed(){
    var list=feed.filter(function(e){return e.scene===teacherScene}).slice(0,7);
    q("#feed").innerHTML=list.length?list.map(function(x){return '<div class="feed-item '+x.type+'"><span class="feed-time">'+x.stamp+"</span>"+x.text+"</div>"}).join(""):'<div class="feed-item">이 공간에서 아직 눈에 띄는 일이 없다.</div>';
  }
  function renderSceneNav(){
    qa(".scene-nav button").forEach(function(b){
      var scene=b.dataset.scene,count=students.filter(function(s){return s.scene===scene}).length;
      b.classList.toggle("active",scene===teacherScene);
      var c=b.querySelector(".count");if(c)c.textContent=count;
    });
  }
  function renderSchedule(){
    q("#schedule").innerHTML=schedule.map(function(p,i){
      return '<div class="sched '+(i===periodIndex?"now":i<periodIndex?"done":"")+'">'+fmtMin(p.start)+"<br>"+p.name.replace(/ · /g," ")+"</div>";
    }).join("");
  }
  function renderHeader(){
    var p=current();
    q("#time").textContent=fmtMin(gameMinute());q("#periodName").textContent=p.name;
    q("#periodDesc").textContent=p.kind==="lesson"?"학생의 몸짓과 학습 반응을 보며 수업을 운영하세요.":p.kind==="break"?"아이들이 교실과 복도로 흩어집니다. 직접 이동해 관찰하세요.":p.kind==="lunch"?"급식실에서는 자리·친구·식사 행동이 드러납니다.":p.kind==="lunchplay"?"아이들이 각자 원하는 공간으로 흩어져 놉니다.":"하루 일과를 준비하거나 정리하는 시간입니다.";
    q("#locationName").textContent=SCENE_NAME[teacherScene];
    q("#progress").style.width=(clamp((gameSec/60-p.start)/(p.end-p.start))*100)+"%";
  }
  function render(){
    renderHeader();renderProps();renderStudents();renderSceneNav();renderSchedule();renderPanel();renderFeed();
    q("#teacher").style.left=teacher.x+"%";q("#teacher").style.top=teacher.y+"%";
  }
  function openScene(scene){
    teacherScene=scene;teacher.x=50;teacher.y=18;selected=null;
    log("선생님이 "+SCENE_NAME[scene]+" 쪽으로 이동했다.","teacher",scene);render();
  }
  function reset(){
    gameSec=520*60;periodIndex=0;running=true;selected=null;swapMode=false;teacherScene="classroom";teacher.x=50;teacher.y=22;feed=[];reportOpen=false;
    relations={"민수|지우":.88,"민수|준호":.78,"지우|서연":.57,"준호|현우":.71,"소라|유나":.77,"태호|유나":.48,"민수|태호":.26,"서연|소라":.55};
    resetStudents();newStats();assignPeriodDestinations();q("#report").hidden=true;log("학생들이 하나둘 교실로 들어오기 시작했다.","ambient","classroom");render();
  }
  function handlePeriodChange(){
    var idx=periodForMinute(gameMinute());
    if(idx!==periodIndex){
      var old=schedule[periodIndex];
      if(old.kind==="lesson"){gameSec=old.end*60-1;openReport(false);return false}
      periodIndex=idx;newStats();assignPeriodDestinations();selected=null;log(current().name+"이(가) 시작되었다.","ambient",teacherScene);render();
    }
    return true;
  }
  function loop(now){
    if(!document.body.contains(app))return;
    var dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
    if(running&&!reportOpen){
      var speed=Number(q("#speed").value)||1;
      gameSec+=dt*10*speed;
      if(handlePeriodChange()){
        updateTransit();updateMovement(dt,speed);
        aiAccumulator+=dt*speed;renderAccumulator+=dt;
        if(aiAccumulator>=.55){
          aiAccumulator=0;
          students.forEach(updateStudent);sampleStats();
        }
        if(renderAccumulator>=.10){renderAccumulator=0;render()}
      }
    }
    requestAnimationFrame(loop);
  }

  q("#pause").addEventListener("click",function(){running=!running;this.textContent=running?"일시정지":"계속하기"});
  q("#lesson").addEventListener("change",function(){log("수업 방식을 "+this.selectedOptions[0].textContent+"로 조정했다.","teacher",teacherScene);render()});
  q("#approach").addEventListener("click",function(){teacherAction("approach")});
  q("#call").addEventListener("click",function(){teacherAction("call")});
  q("#praise").addEventListener("click",function(){teacherAction("praise")});
  q("#hint").addEventListener("click",function(){teacherAction("hint")});
  q("#chalk").addEventListener("click",function(){teacherAction("chalk")});
  q("#seat").addEventListener("click",function(){swapMode=!swapMode;renderPanel()});
  q("#showReport").addEventListener("click",function(){
    if(current().kind==="lesson")openReport(true);
    else{
      var next=-1;for(var i=periodIndex+1;i<schedule.length;i++){if(schedule[i].kind==="lesson"){next=i;break}}
      if(next>=0){periodIndex=next;gameSec=schedule[next].start*60;newStats();assignPeriodDestinations();render();log(current().name+"으로 이동했다.","ambient",teacherScene)}
    }
  });
  q("#continueBtn").addEventListener("click",nextPeriod);
  q("#reset").addEventListener("click",reset);
  qa(".scene-nav button").forEach(function(b){b.addEventListener("click",function(){openScene(this.dataset.scene)})});

  reset();
  requestAnimationFrame(loop);
})();