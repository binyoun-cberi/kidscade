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
    {name:"민수",char:"player",imp:.84,soc:.84,persist:.34,energy:.84,skill:.48,move:.78,hands:.82,visual:.38,verbal:.46,noise:.42,compete:.72,react:.78,empathy:.48,rule:.38,assert:.76,helpful:.45,rejection:.58,reading:.25,sports:.82,creative:.42,mischief:.78},
    {name:"지우",char:"female",imp:.35,soc:.73,persist:.68,energy:.75,skill:.66,move:.38,hands:.63,visual:.70,verbal:.68,noise:.35,compete:.38,react:.38,empathy:.72,rule:.68,assert:.56,helpful:.74,rejection:.48,reading:.66,sports:.45,creative:.58,mischief:.30},
    {name:"서연",char:"female",imp:.18,soc:.36,persist:.91,energy:.72,skill:.84,move:.20,hands:.56,visual:.83,verbal:.81,noise:.28,compete:.54,react:.34,empathy:.78,rule:.82,assert:.44,helpful:.68,rejection:.64,reading:.91,sports:.27,creative:.63,mischief:.12},
    {name:"준호",char:"adventurer",imp:.67,soc:.79,persist:.55,energy:.88,skill:.61,move:.72,hands:.86,visual:.43,verbal:.55,noise:.40,compete:.84,react:.66,empathy:.55,rule:.46,assert:.76,helpful:.50,rejection:.46,reading:.32,sports:.90,creative:.46,mischief:.66},
    {name:"태호",char:"player",imp:.43,soc:.44,persist:.47,energy:.62,skill:.30,move:.42,hands:.90,visual:.76,verbal:.34,noise:.50,compete:.46,react:.58,empathy:.62,rule:.59,assert:.42,helpful:.63,rejection:.72,reading:.54,sports:.43,creative:.78,mischief:.34},
    {name:"유나",char:"female",imp:.29,soc:.59,persist:.74,energy:.49,skill:.73,move:.28,hands:.52,visual:.78,verbal:.72,noise:.33,compete:.31,react:.34,empathy:.80,rule:.74,assert:.48,helpful:.79,rejection:.55,reading:.80,sports:.28,creative:.70,mischief:.18},
    {name:"현우",char:"soldier",imp:.76,soc:.50,persist:.28,energy:.80,skill:.55,move:.91,hands:.93,visual:.34,verbal:.42,noise:.47,compete:.77,react:.80,empathy:.42,rule:.34,assert:.70,helpful:.38,rejection:.45,reading:.20,sports:.94,creative:.33,mischief:.84},
    {name:"소라",char:"adventurer",imp:.22,soc:.42,persist:.84,energy:.74,skill:.44,move:.25,hands:.64,visual:.91,verbal:.62,noise:.61,compete:.29,react:.30,empathy:.76,rule:.79,assert:.38,helpful:.72,rejection:.68,reading:.88,sports:.23,creative:.90,mischief:.16}
  ];

  var relationSeed={
    "민수|지우":{affinity:.88,irritation:.04,rivalry:.18},
    "민수|준호":{affinity:.78,irritation:.08,rivalry:.52},
    "지우|서연":{affinity:.57,irritation:.03,rivalry:.12},
    "준호|현우":{affinity:.71,irritation:.08,rivalry:.58},
    "소라|유나":{affinity:.77,irritation:.02,rivalry:.08},
    "태호|유나":{affinity:.48,irritation:.04,rivalry:.10},
    "민수|태호":{affinity:.26,irritation:.16,rivalry:.30},
    "서연|소라":{affinity:.55,irritation:.02,rivalry:.10}
  };

  var relations={};
  var socialCircles=[];
  var circleByStudent={};
  var circleHistory={};
  var circleAccumulator=0;
  var students=[];
  var gameSec=520*60;
  var periodIndex=0;
  var running=true;
  var selected=null;
  var swapMode=false;
  var connectMode=false;
  var activeActionCategory="observe";
  var teacherTask=null;
  var lessonState={phase:"ready",phaseStart:0,history:[],presenterId:null};
  var teacherScene="classroom";
  var teacher={x:50,y:22};
  var stats=null;
  var feed=[];
  var reportOpen=false;
  var lastFrame=performance.now();
  var aiAccumulator=0;
  var renderAccumulator=0;

  function pairKey(a,b){return [a,b].sort().join("|")}
  function relation(a,b){
    var k=pairKey(a.name,b.name);
    if(!relations[k]){
      relations[k]={
        affinity:.34,
        irritation:.06,
        rivalry:clamp(((a.compete||.3)+(b.compete||.3))*.18,.04,.42),
        positive:0,
        negative:0,
        timeTogether:0
      };
    }
    return relations[k];
  }
  function changeRelation(a,b,delta){
    if(!a||!b||a===b)return;
    var r=relation(a,b);
    if(delta.affinity)r.affinity=clamp(r.affinity+delta.affinity);
    if(delta.irritation)r.irritation=clamp(r.irritation+delta.irritation);
    if(delta.rivalry)r.rivalry=clamp(r.rivalry+delta.rivalry);
    if((delta.affinity||0)>0||(delta.irritation||0)<0)r.positive=(r.positive||0)+1;
    if((delta.affinity||0)<0||(delta.irritation||0)>0)r.negative=(r.negative||0)+1;
  }
  function resetRelations(){
    relations={};
    Object.keys(relationSeed).forEach(function(k){relations[k]=Object.assign({positive:0,negative:0,timeTogether:0},relationSeed[k])});
  }
  function interestSimilarity(a,b){
    var keys=["reading","sports","creative","mischief","helpful","rule","compete"];
    var sum=0;
    keys.forEach(function(k){sum+=1-Math.abs((a[k]||0)-(b[k]||0))});
    return sum/keys.length;
  }
  function bondStrength(a,b){
    var r=relation(a,b);
    var history=(r.positive||0)/((r.positive||0)+(r.negative||0)+4);
    var time=Math.min(.12,(r.timeTogether||0)/180);
    return clamp(r.affinity*.52 + interestSimilarity(a,b)*.26 + history*.14 + time - r.irritation*.44);
  }
  function circleProfile(members){
    var profile={reading:0,sports:0,creative:0,mischief:0,helpful:0,rule:0,compete:0};
    members.forEach(function(s){Object.keys(profile).forEach(function(k){profile[k]+=s[k]||0})});
    Object.keys(profile).forEach(function(k){profile[k]/=members.length||1});
    return profile;
  }
  function circleLabel(profile){
    var scored=[
      ["책·이야기",profile.reading],
      ["운동·활동",profile.sports],
      ["만들기·표현",profile.creative],
      ["장난·규칙 이탈",profile.mischief*(1-profile.rule*.35)],
      ["도움·모범",profile.helpful*.55+profile.rule*.45],
      ["승부·경쟁",profile.compete]
    ].sort(function(a,b){return b[1]-a[1]});
    if(scored[0][1]-scored[1][1]<.08)return scored[0][0]+" + "+scored[1][0];
    return scored[0][0];
  }
  function rebuildSocialCircles(){
    var parent=students.map(function(_,i){return i});
    function find(x){while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x}
    function union(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a}
    for(var i=0;i<students.length;i++){
      for(var j=i+1;j<students.length;j++){
        var a=students[i],b=students[j];
        if(bondStrength(a,b)>.49)union(i,j);
      }
    }
    var buckets={};
    students.forEach(function(s,i){var r=find(i);(buckets[r]||(buckets[r]=[])).push(s)});
    socialCircles=[];circleByStudent={};
    Object.keys(buckets).forEach(function(k){
      var members=buckets[k];
      if(members.length<2)return;
      var ids=members.map(function(s){return s.id}).sort(function(a,b){return a-b});
      var key=ids.join("-");
      var profile=circleProfile(members);
      var old=circleHistory[key]||{cohesion:.5};
      var cohesion=members.length<2?0:members.reduce(function(total,a){
        return total+members.reduce(function(t,b){return t+(a===b?0:bondStrength(a,b))},0);
      },0)/(members.length*(members.length-1));
      var circle={
        id:"circle-"+key,
        key:key,
        members:ids,
        profile:profile,
        label:circleLabel(profile),
        cohesion:old.cohesion*.65+cohesion*.35
      };
      circleHistory[key]={cohesion:circle.cohesion,label:circle.label};
      socialCircles.push(circle);
      ids.forEach(function(id){circleByStudent[id]=circle});
    });
  }
  function circleOf(s){return circleByStudent[s.id]||null}
  function circlePeers(s,scene){
    var c=circleOf(s);
    if(!c)return [];
    return c.members.map(studentById).filter(function(o){return o&&o!==s&&(!scene||o.scene===scene)});
  }
  function circleNormBoost(s,action){
    var c=circleOf(s);if(!c)return 0;
    var p=c.profile;
    if(action==="READ")return p.reading*.18;
    if(action==="PLAY")return p.sports*.18;
    if(action==="COMPETE")return p.compete*.16;
    if(action==="RUN")return p.mischief*.12+p.sports*.08;
    if(action==="TALK")return s.scene==="classroom"?p.mischief*.09:p.helpful*.02+p.mischief*.06;
    if(action==="HELP_PEER"||action==="SHARE")return p.helpful*.18+p.rule*.06;
    if(action==="CLEAN")return p.rule*.15+p.helpful*.08;
    return 0;
  }
  function current(){return schedule[Math.min(periodIndex,schedule.length-1)]}
  function gameMinute(){return Math.floor(gameSec/60)}
  function fmtMin(m){return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
  function posePath(s,pose){return ASSET+s.char+"/poses/"+s.char+"-"+pose+".png"}
  function fallbackPose(s){return posePath(s,"stand")}
  function studentById(id){return students.find(function(s){return s.id===id})||null}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function activePair(s){
    return s.pairWith!==null&&s.pairUntil>gameSec?studentById(s.pairWith):null;
  }
  function groupMembers(groupId){
    return groupId?students.filter(function(s){return s.groupId===groupId}):[];
  }

  function resetStudents(){
    students=templates.map(function(t,i){
      var p=seats[i];
      return Object.assign({},t,{
        id:i,seat:i,scene:"classroom",targetScene:null,arrivalAt:0,x:p.x,y:p.y,dx:p.x,dy:p.y,
        focus:.72,boredom:.14,talkNeed:.14,moveNeed:t.move*.14,helpNeed:.08,sleepNeed:(1-t.energy)*.24,
        socialNeed:.16+t.soc*.12,mood:.70,belonging:.62,frustration:.08,
        action:"READ",intent:null,intentTicks:0,actionTicks:rand(2,5),trust:.62,learned:0,interventions:0,
        memory:[],moving:false,observation:0,observedWork:false,teacherUse:{},socialTarget:null,socialGoal:null,groupId:null,
        conflictWith:null,conflictUntil:0,avoidId:null,avoidUntil:0,
        pairWith:null,pairUntil:0,lessonPartner:null,role:null,roleUntil:0,correctionLoad:0,
        severeCooldown:0,victimStress:0,teacherDefiance:0,lastSeriousIncident:null
      });
    });
  }
  function newStats(){
    stats={
      events:[],fitSamples:[],engageSamples:[],learningStart:students.map(function(s){return s.skill}),
      teacherActs:0,disruptions:0,helped:0,praises:0,lateTicks:0,
      conflicts:0,reconciled:0,connections:0,roles:0,
      instructionMoves:[],phaseSamples:{},phaseTransitions:0,
      seriousIncidents:0,peerHarm:0,teacherIncidents:0,safetyInterventions:0
    };
    resetLessonState();
  }
  function remember(s,text,weight){
    s.memory.unshift({text:text,weight:weight||.5,time:gameMinute()});
    s.memory=s.memory.slice(0,10);
  }
  function log(text,type,scene){
    type=type||"normal";scene=scene||teacherScene;
    var item={stamp:fmtMin(gameMinute()),text:text,type:type,scene:scene};
    feed.unshift(item);feed=feed.slice(0,14);
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
    var p=spotFor(s,scene,free);s.dx=p.x;s.dy=p.y;
  }
  function setNear(s,target,range){
    range=range||7;
    var angle=((s.id+target.id)*1.7)%6.28;
    s.dx=clamp(target.x+Math.cos(angle)*range,6,94);
    s.dy=clamp(target.y+Math.sin(angle)*range,18,91);
  }
  function sendToScene(s,target,free){
    s.groupId=null;s.socialTarget=null;s.socialGoal=null;
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
    var paired=activePair(s);
    if(paired&&paired.scene==="hallway")return "hallway";
    var hallwayScore=s.move*.45+s.soc*.35+s.imp*.20+rand(-.12,.12);
    return hallwayScore>.48?"hallway":"classroom";
  }
  function chooseLunchPlayScene(s){
    var paired=activePair(s);
    if(paired&&paired.scene)return paired.scene==="cafeteria"?"playground":paired.scene;
    var outside=s.move*.48+s.soc*.24+s.energy*.18+rand(-.12,.12);
    if(outside>.50)return "playground";
    return s.soc>.56?"hallway":"classroom";
  }
  function assignPeriodDestinations(){
    var p=current();
    students.forEach(function(s){
      var target="classroom",free=false;
      s.groupId=null;s.socialTarget=null;s.socialGoal=null;s.intent=null;
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

  function teacherNear(s){
    if(s.scene!==teacherScene)return 0;
    return clamp(1-Math.hypot(s.x-teacher.x,s.y-teacher.y)/48);
  }
  var LESSON_PHASES={
    ready:{label:"수업 준비",desc:"아직 본격적인 수업 행동을 시작하지 않았습니다.",dims:{verbal:.25,visual:.25,hands:.15,social:.10,activity:.10,independent:.25}},
    explain:{label:"설명 듣기",desc:"교사의 설명을 중심으로 개념을 만나는 시간입니다.",dims:{verbal:.92,visual:.32,hands:.05,social:.04,activity:.04,independent:.12}},
    question:{label:"질문과 응답",desc:"질문을 던지고 학생의 생각과 이해 정도를 확인합니다.",dims:{verbal:.78,visual:.28,hands:.08,social:.34,activity:.12,independent:.20}},
    demo:{label:"시범·예시",desc:"말보다 실제 예시나 시범을 보여주며 이해를 돕습니다.",dims:{verbal:.46,visual:.88,hands:.62,social:.08,activity:.18,independent:.12}},
    individual:{label:"개별 활동",desc:"학생이 자기 속도로 문제나 과제를 해결합니다.",dims:{verbal:.18,visual:.40,hands:.34,social:.04,activity:.14,independent:.94}},
    pair:{label:"짝 활동",desc:"두 학생이 이야기하고 서로 확인하며 과제를 해결합니다.",dims:{verbal:.48,visual:.35,hands:.42,social:.94,activity:.42,independent:.30}},
    presentation:{label:"발표·공유",desc:"한 학생의 생각이나 결과를 학급과 공유합니다.",dims:{verbal:.86,visual:.48,hands:.16,social:.62,activity:.18,independent:.18}},
    closure:{label:"정리하기",desc:"핵심 내용을 다시 모으고 오늘 배운 것을 확인합니다.",dims:{verbal:.66,visual:.46,hands:.10,social:.16,activity:.06,independent:.42}}
  };
  function resetLessonState(){
    lessonState={phase:"ready",phaseStart:gameSec,history:[],presenterId:null};
    students.forEach(function(s){s.lessonPartner=null});
  }
  function currentPhase(){
    return LESSON_PHASES[lessonState.phase]||LESSON_PHASES.ready;
  }
  function subjectFit(s){
    var p=current();
    if(p.subject==="체육")return .58*s.move+.24*s.soc+.18*s.compete;
    if(p.subject==="미술")return .52*s.hands+.34*s.visual+.14*s.creative;
    if(p.subject==="국어")return .46*s.verbal+.34*s.reading+.20*s.visual;
    if(p.subject==="과학")return .38*s.hands+.34*s.visual+.28*s.persist;
    if(p.subject==="사회")return .40*s.verbal+.30*s.reading+.30*s.soc;
    return .46*s.persist+.30*s.visual+.24*s.hands;
  }
  function lessonFit(s){
    var d=currentPhase().dims;
    var phaseScore=
      d.verbal*s.verbal+
      d.visual*s.visual+
      d.hands*s.hands+
      d.social*s.soc+
      d.activity*s.move+
      d.independent*s.persist;
    var total=d.verbal+d.visual+d.hands+d.social+d.activity+d.independent;
    return clamp((phaseScore/(total||1))*.78+subjectFit(s)*.22);
  }
  function assignLessonPairs(){
    var ordered=students.filter(function(s){return s.scene===current().loc}).slice().sort(function(a,b){return a.seat-b.seat});
    ordered.forEach(function(s){s.lessonPartner=null});
    for(var i=0;i<ordered.length-1;i+=2){
      ordered[i].lessonPartner=ordered[i+1].id;
      ordered[i+1].lessonPartner=ordered[i].id;
    }
  }
  function setLessonPhase(action){
    lessonState.phase=action.phase;
    lessonState.phaseStart=gameSec;
    lessonState.presenterId=null;
    students.forEach(function(s){s.lessonPartner=null;s.intent=null;s.intentTicks=0});
    if(action.phase==="pair")assignLessonPairs();
    if(action.phase==="presentation"){
      var candidates=students.filter(function(s){return s.scene===current().loc});
      candidates.sort(function(a,b){return (b.focus+b.skill+b.assert)-(a.focus+a.skill+a.assert)});
      var presenter=candidates[0]||null;
      if(presenter){lessonState.presenterId=presenter.id;presenter.action="PRESENT";presenter.actionTicks=action.duration}
    }
    lessonState.history.push({id:action.id,phase:action.phase,label:action.label,time:gameMinute()});
    if(stats){
      stats.instructionMoves.push(action.id);
      stats.phaseTransitions++;
    }
    log(action.label+"으로 수업 흐름을 전환했다.","teacher",teacherScene);
  }
  function nearbyStudents(s,maxDist){
    return students.filter(function(o){return o!==s&&o.scene===s.scene&&!o.targetScene&&distance(s,o)<=maxDist});
  }
  function chooseSocialTarget(s,purpose){
    var lp=(current().kind==="lesson"&&lessonState.phase==="pair"&&s.lessonPartner!==null)?studentById(s.lessonPartner):null;
    if(lp&&lp.scene===s.scene&&lp.id!==s.avoidId)return lp;
    var pair=activePair(s);
    if(pair&&pair.scene===s.scene&&pair.id!==s.avoidId)return pair;
    var preferred=circlePeers(s,s.scene).filter(function(o){return !(s.avoidUntil>gameSec&&s.avoidId===o.id)});
    var candidates=(preferred.length&&Math.random()<.72?preferred:students).filter(function(o){
      return o!==s&&o.scene===s.scene&&!o.targetScene&&!(s.avoidUntil>gameSec&&s.avoidId===o.id);
    });
    if(!candidates.length)return null;
    var best=null,bestScore=-99;
    candidates.forEach(function(o){
      var r=relation(s,o),d=distance(s,o),score=0;
      if(purpose==="COMPETE"){
        score=r.rivalry*.46+s.compete*.22+o.compete*.13+r.affinity*.08-r.irritation*.12-d*.001;
      }else if(purpose==="HELP"){
        score=(1-o.skill)*.32+o.helpNeed*.32+s.helpful*.20+r.affinity*.12-r.irritation*.18;
      }else{
        score=r.affinity*.56-r.irritation*.34+s.soc*.12+o.soc*.08+s.socialNeed*.12-d*.002;
        if(o.groupId)score-=Math.max(0,groupMembers(o.groupId).length-2)*.025;
      }
      score+=rand(-.04,.04);
      if(score>bestScore){bestScore=score;best=o}
    });
    return best;
  }
  function conflictPartner(s){
    var p=s.conflictWith!==null?studentById(s.conflictWith):null;
    if(p&&p.scene===s.scene&&s.conflictUntil>gameSec)return p;
    var candidates=students.filter(function(o){return o!==s&&o.scene===s.scene&&relation(s,o).irritation>.23});
    candidates.sort(function(a,b){return relation(s,b).irritation-relation(s,a).irritation});
    return candidates[0]||null;
  }
  function createGroup(a,b){
    var id=a.groupId||b.groupId||("g"+Math.min(a.id,b.id)+"-"+Math.max(a.id,b.id)+"-"+Math.floor(gameSec));
    a.groupId=id;b.groupId=id;
    return id;
  }
  function joinAcceptance(s,target){
    var r=relation(s,target),size=target.groupId?groupMembers(target.groupId).length:1;
    var paired=(activePair(s)===target||activePair(target)===s)? .26:0;
    return clamp(.20+r.affinity*.48+target.soc*.12+target.mood*.10+paired-r.irritation*.42-size*.035);
  }
  function beginSeek(s,target,goal){
    if(!target)return false;
    s.socialTarget=target.id;s.socialGoal=goal;s.action="SEEK";s.actionTicks=7;setNear(s,target,7);
    return true;
  }
  function acceptJoin(s,target,goal){
    createGroup(s,target);
    s.socialNeed=clamp(s.socialNeed-.22);s.belonging=clamp(s.belonging+.08);s.mood=clamp(s.mood+.045);s.frustration=clamp(s.frustration-.08);
    target.belonging=clamp(target.belonging+.025);
    changeRelation(s,target,{affinity:.012,irritation:-.012});
    s.action=goal==="COMPETE"?"COMPETE":goal==="PLAY"?"PLAY":"TALK";
    s.actionTicks=rand(4,8);s.socialTarget=target.id;
    if(target.action==="WAIT"||target.action==="REST"||target.action==="READ")target.action=s.action==="COMPETE"?"COMPETE":s.action==="PLAY"?"PLAY":"TALK";
    if(Math.random()<.30)log(s.name+"이(가) "+target.name+"에게 다가가 함께 "+(s.action==="PLAY"?"놀기":"COMPETE"===s.action?"겨루기":"이야기")+" 시작했다.","social",s.scene);
  }
  function rejectJoin(s,target){
    var r=relation(s,target);
    s.action="REJECTED";s.actionTicks=rand(2.5,4.5);s.socialTarget=null;s.groupId=null;
    s.frustration=clamp(s.frustration+.10+.13*s.rejection);s.belonging=clamp(s.belonging-.055);s.mood=clamp(s.mood-.055);
    changeRelation(s,target,{affinity:-.008,irritation:.025+.025*s.rejection});
    remember(s,target.name+"에게 함께하자고 했지만 받아들여지지 않음",.58);
    log(s.name+"이(가) "+target.name+" 쪽에 다가갔지만 자연스럽게 함께하지 못했다.","social",s.scene);
    var confront=(s.react*.48+s.frustration*.40+s.assert*.12)*(1-teacherNear(s)*.55);
    if(confront>.54&&r.irritation>.12)beginConflict(s,target,"거절 뒤 감정이 올라감");
  }
  function resolveSeek(s){
    var target=studentById(s.socialTarget);
    if(!target||target.scene!==s.scene){s.socialTarget=null;s.socialGoal=null;s.action="WAIT";s.actionTicks=2;return}
    setNear(s,target,6);
    if(distance(s,target)>9)return;
    var goal=s.socialGoal||"TALK";
    if(["BORROW_ITEM","COMFORT","TEASE"].indexOf(goal)>=0){
      startAction(s,goal,target);
    }else if(Math.random()<joinAcceptance(s,target))acceptJoin(s,target,goal);
    else rejectJoin(s,target);
    s.socialGoal=null;
  }
  function beginConflict(a,b,reason){
    if(!a||!b||a.scene!==b.scene)return;
    createGroup(a,b);
    a.conflictWith=b.id;b.conflictWith=a.id;
    a.conflictUntil=gameSec+5*60;b.conflictUntil=gameSec+5*60;
    a.socialTarget=b.id;b.socialTarget=a.id;
    a.action="ARGUE";b.action="ARGUE";a.actionTicks=rand(4,7);b.actionTicks=rand(4,7);
    a.frustration=clamp(a.frustration+.10);b.frustration=clamp(b.frustration+.08);
    changeRelation(a,b,{affinity:-.018,irritation:.07,rivalry:.015});
    stats.conflicts++;
    remember(a,b.name+"와 말다툼이 생김",.62);remember(b,a.name+"와 말다툼이 생김",.62);
    log(a.name+"와 "+b.name+" 사이에 "+reason+" 작은 말다툼이 시작됐다.","incident",a.scene);
    nearbyStudents(a,24).forEach(function(o){
      if(o!==b&&Math.random()<o.soc*.28){o.action="WATCH";o.actionTicks=rand(2,4);o.mood=clamp(o.mood-.015)}
    });
  }
  function maybeEscalateConflict(s){
    var target=conflictPartner(s);
    if(!target)return;
    var r=relation(s,target);
    var chance=(s.react*.34+s.imp*.24+s.frustration*.28+r.irritation*.22)*(1-teacherNear(s)*.72);
    if(chance>.58&&Math.random()<.34){
      s.action="SHOVE";s.actionTicks=2.5;target.action="HURT";target.actionTicks=2.5;
      s.frustration=clamp(s.frustration+.08);target.frustration=clamp(target.frustration+.15);
      changeRelation(s,target,{affinity:-.025,irritation:.08});
      remember(s,target.name+"와 갈등 중 거친 몸짓이 나옴",.8);remember(target,s.name+"와 갈등 중 거친 몸짓을 겪음",.8);
      log(s.name+"의 거친 몸짓 때문에 "+target.name+"이(가) 뒤로 물러났다.","incident",s.scene);
    }else{
      s.action="WAIT";s.actionTicks=rand(2,4);
      setDestination(s,s.scene,true);
    }
  }
  function beginPeerHelp(s,target){
    if(!target)return false;
    s.socialTarget=target.id;s.socialGoal="HELP";s.action="HELP_PEER";s.actionTicks=7;setNear(s,target,6);return true;
  }
  function resolvePeerHelp(s){
    var target=studentById(s.socialTarget);
    if(!target||target.scene!==s.scene){s.socialTarget=null;s.action="WAIT";return}
    setNear(s,target,6);
    if(distance(s,target)>9)return;
    target.helpNeed=clamp(target.helpNeed-.12);target.focus=clamp(target.focus+.05);target.skill=clamp(target.skill+.0035);
    s.belonging=clamp(s.belonging+.035);s.mood=clamp(s.mood+.02);changeRelation(s,target,{affinity:.01,irritation:-.008});
    remember(s,target.name+"을 도와줌",.38);remember(target,s.name+"에게 도움받음",.38);
    if(Math.random()<.34)log(s.name+"이(가) "+target.name+"을(를) 잠깐 도와주었다.","social",s.scene);
    s.action="WAIT";s.actionTicks=2;s.socialTarget=null;s.socialGoal=null;
  }

  function isSevereAction(s){
    return ["THREATEN","HIT","TAKE_ITEM_FORCE","EXCLUDE_TARGET","SHOUT_TEACHER","INSULT_TEACHER","THROW_AT_TEACHER"].indexOf(s.action)>=0;
  }
  function isPeerHarmAction(s){
    return ["TEASE","EXCLUDE_TARGET","TAKE_ITEM_FORCE","THREATEN","HIT"].indexOf(s.action)>=0;
  }
  function seriousTarget(s){
    return s.socialTarget!==null?studentById(s.socialTarget):null;
  }
  function chooseVulnerablePeer(s){
    var candidates=students.filter(function(o){return o!==s&&o.scene===s.scene&&!o.targetScene});
    if(!candidates.length)return null;
    var best=null,bestScore=-99;
    candidates.forEach(function(o){
      var r=relation(s,o);
      var outsider=circleOf(s)&&circleOf(o)!==circleOf(s)?.12:0;
      var score=r.irritation*.48+(1-r.affinity)*.21+(1-o.belonging)*.12+outsider+(r.negative||0)*.025+rand(-.035,.035);
      if(score>bestScore){bestScore=score;best=o}
    });
    return best;
  }
  function recordSeriousIncident(actor,target,kind,text){
    actor.lastSeriousIncident={kind:kind,targetId:target?target.id:null,time:gameMinute()};
    actor.severeCooldown=gameSec+10*60;
    stats.seriousIncidents++;
    if(target){
      stats.peerHarm++;
      target.victimStress=clamp(target.victimStress+.18);
      target.mood=clamp(target.mood-.10);
      target.belonging=clamp(target.belonging-.07);
      remember(target,actor.name+"에게서 심각한 또래 갈등 행동을 겪음",.88);
    }else{
      stats.teacherIncidents++;
      actor.teacherDefiance=clamp(actor.teacherDefiance+.12);
    }
    remember(actor,text,.82);
    log(text,"incident",actor.scene);
    if(target){
      nearbyStudents(target,24).filter(function(o){return o!==actor}).forEach(function(o){
        var sameActorCircle=circleOf(actor)&&circleOf(o)===circleOf(actor);
        if(o.empathy>.68&&relation(o,target).affinity>.38&&Math.random()<.34){
          o.action="DEFEND_PEER";o.actionTicks=3;o.socialTarget=target.id;
          target.victimStress=clamp(target.victimStress-.025);target.belonging=clamp(target.belonging+.018);
          changeRelation(o,target,{affinity:.006});
          if(Math.random()<.35)log(o.name+"이(가) "+target.name+" 곁으로 가서 상황을 멈추려 했다.","social",actor.scene);
        }else if(o.rule>.70&&o.trust>.55&&Math.random()<.22){
          o.action="REPORT_INCIDENT";o.actionTicks=3;
          if(Math.random()<.45)log(o.name+"이(가) 심각한 상황을 교사에게 알리려 했다.","social",actor.scene);
        }else if(sameActorCircle&&o.rule<.48&&o.mischief>.58&&Math.random()<.20){
          o.action="WATCH";o.actionTicks=3;
          target.victimStress=clamp(target.victimStress+.012);
        }else if(Math.random()<.35){
          o.action="WATCH";o.actionTicks=2;
        }
      });
    }
  }
  function maybeSeriousIncident(s){
    if(s.severeCooldown>gameSec||s.targetScene||s.scene!==teacherScene&&current().kind==="lesson")return false;

    var circle=circleOf(s);
    var normRisk=circle?circle.profile.mischief*.18+(1-circle.profile.rule)*.12:0;
    var peer=chooseVulnerablePeer(s);
    if(peer){
      var r=relation(s,peer);
      var peerRisk=
        s.frustration*.27+s.react*.17+s.imp*.12+(1-s.rule)*.15+s.mischief*.12+
        r.irritation*.20+Math.min(.12,(r.negative||0)*.02)+normRisk-
        teacherNear(s)*.16;
      if(peerRisk>.68&&Math.random()<.0017){
        var severe=(peerRisk>.82||r.irritation>.48||(r.negative||0)>=4);
        var action;
        if(severe){
          action=pick(["THREATEN","HIT","TAKE_ITEM_FORCE","EXCLUDE_TARGET"]);
        }else{
          action=pick(["TEASE","EXCLUDE_TARGET","TAKE_ITEM_FORCE"]);
        }
        startAction(s,action,peer);
        return true;
      }
    }

    if(current().kind==="lesson"){
      var teacherRisk=
        s.frustration*.28+s.react*.18+s.imp*.12+(1-s.rule)*.18+
        (1-s.trust)*.18+s.correctionLoad*.22+s.teacherDefiance*.12+normRisk;
      if(teacherRisk>.72&&Math.random()<.00135){
        var teacherAction=teacherRisk>.86?pick(["INSULT_TEACHER","THROW_AT_TEACHER","SHOUT_TEACHER"]):pick(["REFUSE_INSTRUCTION","SHOUT_TEACHER"]);
        startAction(s,teacherAction,null);
        return true;
      }
    }
    return false;
  }

  function startAction(s,a,target){
    s.action=a;s.actionTicks=rand(2.5,6);
    if(target){s.socialTarget=target.id}
    var p=target||chooseSocialTarget(s,a==="COMPETE"?"COMPETE":"SOCIAL");

    if(a==="TALK"){
      s.talkNeed=clamp(s.talkNeed-.15);s.socialNeed=clamp(s.socialNeed-.08);
      if(current().kind==="lesson"&&lessonState.phase!=="pair"){
        stats.disruptions++;
        if(Math.random()<.48)log(s.name+"이(가) "+(p?p.name+"에게":"옆자리 쪽으로")+" 말을 걸기 시작했다.","incident",s.scene);
      }else if(p){
        changeRelation(s,p,{affinity:.005,irritation:-.003});
        if(Math.random()<.25)log(s.name+"와 "+p.name+"이(가) 이야기를 나누고 있다.","social",s.scene);
      }
    }
    if(a==="PAIR_WORK"&&p){
      s.socialNeed=clamp(s.socialNeed-.10);s.focus=clamp(s.focus+.018);s.socialTarget=p.id;
      changeRelation(s,p,{affinity:.003,irritation:-.002});
      if(Math.random()<.18)log(s.name+"와 "+p.name+"이(가) 짝 과제를 함께 확인하고 있다.","learning",s.scene);
    }
    if(a==="MOVE"&&current().kind==="lesson"&&Math.random()<.40){stats.disruptions++;log(s.name+"이(가) 몸을 크게 움직여 주변의 시선을 끌었다.","incident",s.scene)}
    if(a==="SLEEP")log(s.name+"이(가) 점점 고개를 떨구기 시작했다.","incident",s.scene);
    if(a==="HELP")log(s.name+"이(가) 문제에서 막혀 도움을 기다리고 있다.","learning",s.scene);

    if(a==="BORROW_ITEM"&&p){
      changeRelation(s,p,{affinity:.003});
      if(Math.random()<.35)log(s.name+"이(가) "+p.name+"에게 연필이나 준비물을 빌렸다.","social",s.scene);
    }
    if(a==="LOOK_OUTSIDE"){s.boredom=clamp(s.boredom-.035);s.focus=clamp(s.focus-.018);}
    if(a==="STRETCH"){s.moveNeed=clamp(s.moveNeed-.10);s.energy=clamp(s.energy+.015);}
    if(a==="DRINK_WATER"){s.focus=clamp(s.focus+.012);s.energy=clamp(s.energy+.012);}
    if(a==="DROP_ITEM"){
      if(Math.random()<.50)log(s.name+"의 필기구가 바닥에 떨어졌다.","ambient",s.scene);
    }
    if(a==="ASK_BATHROOM"){
      s.moveNeed=clamp(s.moveNeed-.04);s.actionTicks=3;
      if(Math.random()<.40)log(s.name+"이(가) 화장실에 다녀와도 되는지 손짓으로 물었다.","ambient",s.scene);
    }
    if(a==="PASS_NOTE"&&p){
      s.talkNeed=clamp(s.talkNeed-.05);p.talkNeed=clamp(p.talkNeed+.035);
      if(current().kind==="lesson")stats.disruptions++;
      if(Math.random()<.34)log(s.name+"이(가) "+p.name+" 쪽으로 쪽지를 슬쩍 건넸다.","incident",s.scene);
    }
    if(a==="COMFORT"&&p){
      p.victimStress=clamp(p.victimStress-.07);p.mood=clamp(p.mood+.04);p.belonging=clamp(p.belonging+.035);
      changeRelation(s,p,{affinity:.012,irritation:-.008});
      log(s.name+"이(가) 기분이 가라앉은 "+p.name+" 곁에 잠깐 머물렀다.","social",s.scene);
    }
    if(a==="TEASE"&&p){
      changeRelation(s,p,{affinity:-.010,irritation:.035});
      p.frustration=clamp(p.frustration+.07);p.mood=clamp(p.mood-.045);
      remember(p,s.name+"의 놀림을 받음",.48);
      log(s.name+"이(가) "+p.name+"을(를) 놀리자 표정이 굳었다.","incident",s.scene);
    }
    if(a==="EXCLUDE_TARGET"&&p){
      changeRelation(s,p,{affinity:-.018,irritation:.055});
      p.belonging=clamp(p.belonging-.12);p.victimStress=clamp(p.victimStress+.12);p.action="REJECTED";p.actionTicks=4;
      recordSeriousIncident(s,p,"exclusion",s.name+"과(와) 주변 친구들이 "+p.name+"을(를) 반복해서 놀이에서 밀어내려는 모습이 나타났다.");
    }
    if(a==="TAKE_ITEM_FORCE"&&p){
      changeRelation(s,p,{affinity:-.022,irritation:.065});
      p.frustration=clamp(p.frustration+.13);p.victimStress=clamp(p.victimStress+.13);
      recordSeriousIncident(s,p,"taking",s.name+"이(가) "+p.name+"의 물건을 원하지 않는데도 억지로 가져가려 했다.");
    }
    if(a==="THREATEN"&&p){
      changeRelation(s,p,{affinity:-.030,irritation:.080});
      p.frustration=clamp(p.frustration+.17);p.victimStress=clamp(p.victimStress+.18);
      recordSeriousIncident(s,p,"threat",s.name+"이(가) "+p.name+"에게 위협적인 말과 태도를 보였다.");
    }
    if(a==="HIT"&&p){
      changeRelation(s,p,{affinity:-.040,irritation:.095});
      p.frustration=clamp(p.frustration+.22);p.victimStress=clamp(p.victimStress+.22);p.action="HURT";p.actionTicks=3;
      recordSeriousIncident(s,p,"physical",s.name+"이(가) 갈등 중 "+p.name+"을(를) 거칠게 밀치거나 때리는 행동을 했다.");
    }
    if(a==="REFUSE_INSTRUCTION"){
      s.teacherDefiance=clamp(s.teacherDefiance+.06);s.focus=clamp(s.focus-.04);
      log(s.name+"이(가) 교사의 안내를 듣고도 일부러 과제를 하지 않겠다고 버텼다.","incident",s.scene);
    }
    if(a==="SHOUT_TEACHER"){
      s.trust=clamp(s.trust-.035);s.frustration=clamp(s.frustration+.05);
      recordSeriousIncident(s,null,"teacher_shout",s.name+"이(가) 교사를 향해 큰소리로 반발하며 수업 흐름을 끊었다.");
    }
    if(a==="INSULT_TEACHER"){
      s.trust=clamp(s.trust-.055);s.frustration=clamp(s.frustration+.07);
      recordSeriousIncident(s,null,"teacher_insult",s.name+"이(가) 교사에게 모욕적인 말을 했다.");
    }
    if(a==="THROW_AT_TEACHER"){
      s.trust=clamp(s.trust-.07);s.frustration=clamp(s.frustration+.08);
      recordSeriousIncident(s,null,"teacher_throw",s.name+"이(가) 화가 난 상태에서 교사 쪽으로 물건을 던지는 행동을 했다.");
    }

    if(a==="RUN"){
      setDestination(s,s.scene,true);
      var near=nearbyStudents(s,13)[0];
      if(near&&Math.random()<s.imp*.18){
        log(s.name+"이(가) 뛰다가 "+near.name+"과(와) 부딪힐 뻔했다.","incident",s.scene);
        remember(s,"빠르게 움직이다 친구와 부딪힐 뻔함",.42);
        if(s.react>.65&&near.react>.55&&Math.random()<.18)beginConflict(s,near,"부딪힐 뻔한 일로");
      }
    }
    if(a==="PLAY"&&p){
      createGroup(s,p);changeRelation(s,p,{affinity:.008,irritation:-.005});s.belonging=clamp(s.belonging+.03);
    }
    if(a==="COMPETE"&&p){
      createGroup(s,p);
      var r=relation(s,p);
      if(Math.random()<(.08+s.imp*.07+s.compete*.08+r.rivalry*.11+r.irritation*.12)){
        beginConflict(s,p,"승부를 두고");
      }else{
        changeRelation(s,p,{affinity:.004,rivalry:.006});
        if(Math.random()<.18)log(s.name+"와 "+p.name+"이(가) 승부를 즐기고 있다.","social",s.scene);
      }
    }
    if(a==="SHARE"&&p){
      changeRelation(s,p,{affinity:.012,irritation:-.006});s.belonging=clamp(s.belonging+.02);
      log(s.name+"이(가) "+p.name+"에게 반찬을 건넸다.","social","cafeteria");
    }
    if(a==="EAT"&&Math.random()<.025+s.imp*.02)log(s.name+"이(가) 식판에서 음식 하나를 떨어뜨렸다.","incident","cafeteria");

    var peers=circlePeers(s,s.scene);
    peers.forEach(function(o){
      if(distance(s,o)>24)return;
      if(a==="RUN"){o.moveNeed=clamp(o.moveNeed+.025*(.5+o.move));}
      if(a==="TALK"){o.talkNeed=clamp(o.talkNeed+.018*(.5+o.soc));}
      if(a==="PLAY"){o.socialNeed=clamp(o.socialNeed+.018);o.mood=clamp(o.mood+.008);}
      if(a==="HELP_PEER"||a==="SHARE"){o.belonging=clamp(o.belonging+.008);o.mood=clamp(o.mood+.006);}
      if(a==="ARGUE"||a==="SHOVE"){o.frustration=clamp(o.frustration+.01*o.react);}
    });
  }

  function decideLesson(s){
    if(s.scene!==current().loc||s.targetScene){s.action="WALK";return}

    if(s.action==="SEEK"){resolveSeek(s);return}
    if(s.action==="HELP_PEER"){resolvePeerHelp(s);return}
    if(s.action==="ARGUE"){
      if(s.actionTicks<=0)maybeEscalateConflict(s);
      return;
    }
    if(s.action==="SHOVE"||s.action==="HURT"){
      if(s.actionTicks<=0){s.action="WAIT";s.actionTicks=2;setDestination(s,s.scene,true)}
      return;
    }
    if(s.action==="REJECTED"&&s.actionTicks>0)return;
    if(["TEASE","EXCLUDE_TARGET","TAKE_ITEM_FORCE","THREATEN","HIT","REFUSE_INSTRUCTION","SHOUT_TEACHER","INSULT_TEACHER","THROW_AT_TEACHER","DEFEND_PEER","REPORT_INCIDENT"].indexOf(s.action)>=0&&s.actionTicks>0)return;
    if(s.actionTicks<=0&&maybeSeriousIncident(s))return;

    var phase=lessonState.phase,fit=lessonFit(s),near=teacherNear(s),hard=clamp(.70-s.skill+.16),target=chooseSocialTarget(s,"SOCIAL");
    var roleActive=s.roleUntil>gameSec;
    var vals={
      WORK:.24+s.persist*.22+s.focus*.20+fit*.18+(roleActive?.05:0),
      ATTEND:.18+s.focus*.26+fit*.24+s.rule*.08,
      TALK:s.talkNeed*.42+s.soc*.22+s.imp*.16+(target?relation(s,target).affinity*.18:0)-near*s.trust*.48+(1-fit)*.14+rand(-.035,.035),
      DOODLE:s.boredom*.50+s.imp*.12+(1-fit)*.22-near*.20+rand(-.03,.03),
      HELP:s.helpNeed*.48+hard*.38+s.persist*.08+near*.08,
      SLEEP:s.sleepNeed*.64+(1-s.energy)*.25-near*.18,
      MOVE:s.moveNeed*.57+s.move*.22+s.imp*.15-near*.36+rand(-.03,.03),
      LOOK_OUTSIDE:s.boredom*.30+(1-fit)*.12-near*.10,
      STRETCH:s.moveNeed*.25+s.move*.09-near*.12,
      DRINK_WATER:(1-s.energy)*.16+.035,
      BORROW_ITEM:s.helpNeed*.10+s.soc*.06+.025,
      DROP_ITEM:.015+s.imp*.025,
      ASK_BATHROOM:.012+(1-s.energy)*.025,
      PASS_NOTE:.012+s.soc*.035+s.mischief*.045-near*.04
    };

    if(["explain","demo","closure","presentation"].indexOf(phase)>=0){
      vals.ATTEND+=.24;vals.WORK-=.13;
    }
    if(phase==="question"){
      vals.ATTEND+=.10;
      vals.RAISE_HAND=.18+s.verbal*.24+s.assert*.19+s.skill*.15+s.focus*.16;
      vals.WORK-=.10;
    }
    if(phase==="individual"){
      vals.WORK+=.26;vals.ATTEND-=.10;vals.TALK-=.06;
    }
    if(phase==="pair"){
      var lp=s.lessonPartner!==null?studentById(s.lessonPartner):null;
      vals.PAIR_WORK=.34+s.soc*.24+fit*.20+s.focus*.15+(lp?relation(s,lp).affinity*.09:0);
      vals.WORK+=.04;vals.TALK-=.03;vals.ATTEND-=.08;
    }
    if(phase==="presentation"&&lessonState.presenterId===s.id){
      vals.PRESENT=1.3;vals.ATTEND=-1;vals.WORK=-1;vals.TALK=-1;vals.DOODLE=-1;
    }

    var helpTarget=roleActive?chooseSocialTarget(s,"HELP"):null;
    if(roleActive&&helpTarget&&helpTarget.helpNeed>.18)vals.HELP_PEER=.37+s.helpful*.32+helpTarget.helpNeed*.28-near*.02;

    if(current().subject==="체육"&&["individual","pair"].indexOf(phase)>=0){
      var rival=chooseSocialTarget(s,"COMPETE");
      vals.PLAY=.36+s.move*.30+s.energy*.18+s.soc*.10;
      vals.COMPETE=.22+s.compete*.38+s.soc*.14+s.energy*.12+(rival?relation(s,rival).rivalry*.12:0);
      vals.REST=.12+(1-s.energy)*.40;
      if(phase==="pair")vals.PAIR_WORK+=.12;
    }

    var best=Object.keys(vals)[0];
    Object.keys(vals).forEach(function(k){if(vals[k]>vals[best])best=k});

    var productive=["WORK","ATTEND","PAIR_WORK","RAISE_HAND","PRESENT"].indexOf(best)>=0;
    if(productive){
      s.intent=null;s.intentTicks=0;
      s.action=best;s.actionTicks=best==="PRESENT"?6:rand(2.5,5);
      if(best==="PAIR_WORK"){
        var partner=s.lessonPartner!==null?studentById(s.lessonPartner):null;
        if(partner)s.socialTarget=partner.id;
      }
      return;
    }

    if(vals[best]>.54){
      if(s.intent===best)s.intentTicks++;else{s.intent=best;s.intentTicks=1}
      if(s.intentTicks>=2){
        if(best==="HELP_PEER")beginPeerHelp(s,helpTarget);
        else if((best==="PLAY"||best==="COMPETE")&&target&&distance(s,target)>11)beginSeek(s,best==="COMPETE"?chooseSocialTarget(s,"COMPETE"):target,best);
        else {
          var chosenTarget=best==="COMPETE"?chooseSocialTarget(s,"COMPETE"):target;
          if(["BORROW_ITEM","PASS_NOTE"].indexOf(best)>=0)chosenTarget=chooseSocialTarget(s,"SOCIAL");
          startAction(s,best,chosenTarget);
        }
        s.intent=null;s.intentTicks=0;
      }
    }else{
      s.intent=null;s.intentTicks=0;
      if(s.actionTicks<=0)s.action=phase==="individual"?"WORK":"ATTEND";
    }
  }

  function decideFree(s){
    if(s.targetScene){s.action="WALK";return}
    if(s.action==="SEEK"){resolveSeek(s);return}
    if(s.action==="HELP_PEER"){resolvePeerHelp(s);return}
    if(s.action==="ARGUE"){
      if(s.actionTicks<=0)maybeEscalateConflict(s);
      return;
    }
    if(s.action==="SHOVE"||s.action==="HURT"){
      if(s.actionTicks<=0){s.action="WAIT";s.actionTicks=2;setDestination(s,s.scene,true)}
      return;
    }
    if(s.action==="REJECTED"&&s.actionTicks>0)return;
    if(["TEASE","EXCLUDE_TARGET","TAKE_ITEM_FORCE","THREATEN","HIT","DEFEND_PEER","REPORT_INCIDENT"].indexOf(s.action)>=0&&s.actionTicks>0)return;
    if(s.actionTicks<=0&&maybeSeriousIncident(s))return;

    var paired=activePair(s);
    if(paired&&paired.scene===s.scene&&distance(s,paired)>12&&Math.random()<.65){
      beginSeek(s,paired,current().kind==="lunchplay"?"PLAY":"TALK");return;
    }

    if(s.roleUntil>gameSec&&Math.random()<.38){
      var helpTarget=chooseSocialTarget(s,"HELP");
      if(helpTarget&&(helpTarget.belonging<.5||helpTarget.helpNeed>.22)){beginPeerHelp(s,helpTarget);return}
    }

    var conflict=conflictPartner(s);
    if(conflict&&s.conflictUntil>gameSec&&s.frustration>.48&&s.react>.54&&Math.random()<.24*(1-teacherNear(s))){
      beginConflict(s,conflict,"쌓인 감정 때문에");return;
    }

    if(s.socialNeed>.34&&Math.random()<.62){
      var socialTarget=chooseSocialTarget(s,"SOCIAL");
      if(socialTarget&&distance(s,socialTarget)>9){
        var socialGoal=current().kind==="lunchplay"&&s.scene==="playground"?"PLAY":"TALK";
        beginSeek(s,socialTarget,socialGoal);return;
      }
    }

    var p=current(),choices=[];
    if(p.kind==="morning"){
      choices=[["READ",.36+s.persist*.28+circleNormBoost(s,"READ")],["TALK",.18+s.soc*.35+circleNormBoost(s,"TALK")],["BORROW_ITEM",.035+s.soc*.05],["DRINK_WATER",.035],["STRETCH",.03+s.move*.04],["DROP_ITEM",.012+s.imp*.018],["WALK",.10+s.move*.20]];
    }else if(p.kind==="break"){
      if(s.scene==="hallway")choices=[["WALK",.20],["RUN",.08+s.move*.35+s.imp*.18+circleNormBoost(s,"RUN")],["TALK",.16+s.soc*.38+circleNormBoost(s,"TALK")],["TEASE",.018+s.mischief*.035],["COMFORT",.012+s.empathy*.045],["WAIT",.12]];
      else choices=[["READ",.16+s.persist*.22+circleNormBoost(s,"READ")],["TALK",.18+s.soc*.38+circleNormBoost(s,"TALK")],["BORROW_ITEM",.035+s.soc*.045],["COMFORT",.012+s.empathy*.04],["DOODLE",.12+s.visual*.22],["WALK",.09+s.move*.18]];
    }else if(p.kind==="lunch"){
      choices=[["EAT",.45],["TALK",.12+s.soc*.30+circleNormBoost(s,"TALK")],["SHARE",.05+s.soc*.16+circleNormBoost(s,"SHARE")],["COMFORT",.012+s.empathy*.035],["TEASE",.012+s.mischief*.025],["WAIT",.08]];
    }else if(p.kind==="lunchplay"){
      if(s.scene==="playground")choices=[["PLAY",.20+s.move*.35+s.soc*.12+circleNormBoost(s,"PLAY")],["COMPETE",.08+s.compete*.30+circleNormBoost(s,"COMPETE")],["RUN",.10+s.move*.25+circleNormBoost(s,"RUN")],["TALK",.12+s.soc*.28+circleNormBoost(s,"TALK")],["TEASE",.015+s.mischief*.035],["COMFORT",.010+s.empathy*.035],["REST",.12+(1-s.energy)*.25]];
      else choices=[["TALK",.16+s.soc*.36+circleNormBoost(s,"TALK")],["READ",.14+s.persist*.18+circleNormBoost(s,"READ")],["WALK",.12+s.move*.22]];
    }else if(p.kind==="closing"){
      choices=[["CLEAN",.42+s.persist*.15+circleNormBoost(s,"CLEAN")],["TALK",.12+s.soc*.24+circleNormBoost(s,"TALK")],["WALK",.10+s.move*.14]];
    }

    if(!choices.length){s.action="WAIT";s.actionTicks=2;return}
    var total=choices.reduce(function(a,c){return a+c[1]},0),r=Math.random()*total,chosen=choices[0][0];
    for(var i=0;i<choices.length;i++){r-=choices[i][1];if(r<=0){chosen=choices[i][0];break}}

    var target=null;
    if(["TALK","PLAY","SHARE","BORROW_ITEM"].indexOf(chosen)>=0)target=chooseSocialTarget(s,"SOCIAL");
    if(chosen==="COMFORT")target=students.filter(function(o){return o!==s&&o.scene===s.scene&&(o.victimStress>.05||o.mood<.56)}).sort(function(a,b){return b.victimStress-a.victimStress})[0]||chooseSocialTarget(s,"SOCIAL");
    if(chosen==="TEASE")target=chooseVulnerablePeer(s);
    if(chosen==="COMPETE")target=chooseSocialTarget(s,"COMPETE");

    if(target&&["TALK","PLAY","COMPETE","BORROW_ITEM","COMFORT","TEASE"].indexOf(chosen)>=0&&distance(s,target)>10){beginSeek(s,target,chosen);return}
    startAction(s,chosen,target);
    if(["WALK","RUN"].indexOf(chosen)>=0)setDestination(s,s.scene,true);
  }

  function updateStudent(s){
    if(s.actionTicks>0)s.actionTicks-=.6;

    s.frustration=clamp(s.frustration-.006);
    s.correctionLoad=clamp(s.correctionLoad-.004);
    s.victimStress=clamp(s.victimStress-.0015);
    if(s.victimStress>.18){s.focus=clamp(s.focus-.003);s.socialNeed=clamp(s.socialNeed-.002);}
    if(s.pairUntil<=gameSec){s.pairWith=null;s.pairUntil=0}
    if(s.roleUntil<=gameSec){s.role=null;s.roleUntil=0}
    if(s.avoidUntil<=gameSec){s.avoidId=null;s.avoidUntil=0}
    if(s.conflictUntil<=gameSec&&s.conflictWith!==null){
      s.conflictWith=null;
      if(s.action==="ARGUE")s.action="WAIT";
    }

    if(current().kind==="lesson"){
      var fit=lessonFit(s);
      s.talkNeed=clamp(s.talkNeed+.018*s.soc+.014*(1-fit));
      s.moveNeed=clamp(s.moveNeed+.016*s.move);
      s.helpNeed=clamp(s.helpNeed+.015*clamp(.69-s.skill));
      s.sleepNeed=clamp(s.sleepNeed+.006*(1-s.energy));
      s.socialNeed=clamp(s.socialNeed+.006*s.soc);
      s.boredom=clamp(s.boredom+.013*(1-fit)-.006*s.persist);
      if(s.scene!==current().loc)stats.lateTicks++;

      var nearby=nearbyStudents(s,18);
      nearby.forEach(function(o){
        if(o.action==="TALK"||o.action==="MOVE"){s.focus=clamp(s.focus-.004*(.5+s.noise));s.talkNeed=clamp(s.talkNeed+.003*s.soc)}
        if(o.action==="ARGUE"||o.action==="SHOVE"||isSevereAction(o)){s.focus=clamp(s.focus-.014);s.mood=clamp(s.mood-.010)}
        if(o.action==="DEFEND_PEER"||o.action==="REPORT_INCIDENT"){s.belonging=clamp(s.belonging+.002)}
      });

      if(s.action==="WORK"&&s.scene===current().loc){
        s.focus=clamp(s.focus+.009*fit-.006*s.boredom);
        var gain=.00165*fit*s.focus;s.skill=clamp(s.skill+gain);s.learned+=gain;
      }else if(s.action==="ATTEND"){
        s.focus=clamp(s.focus+.006*fit-.004*s.boredom);
        var listenGain=.00105*fit*s.focus;s.skill=clamp(s.skill+listenGain);s.learned+=listenGain;
      }else if(s.action==="PAIR_WORK"){
        var partner=s.lessonPartner!==null?studentById(s.lessonPartner):null;
        var pairFit=partner?relation(s,partner).affinity:.35;
        s.focus=clamp(s.focus+.005*fit-.002*s.boredom);
        var pairGain=.00145*fit*s.focus*(.82+pairFit*.22);s.skill=clamp(s.skill+pairGain);s.learned+=pairGain;
      }else if(s.action==="RAISE_HAND"){
        s.focus=clamp(s.focus+.012);s.mood=clamp(s.mood+.006);
        var qGain=.0008*fit;s.skill=clamp(s.skill+qGain);s.learned+=qGain;
      }else if(s.action==="PRESENT"){
        s.focus=clamp(s.focus+.01);s.mood=clamp(s.mood+.008);
        var pGain=.0009*fit;s.skill=clamp(s.skill+pGain);s.learned+=pGain;
      }else if(s.action==="TALK"){s.focus=clamp(s.focus-(lessonState.phase==="pair"?.012:.03))}
      else if(s.action==="DOODLE"){s.boredom=clamp(s.boredom-.09);s.focus=clamp(s.focus-.018)}
      else if(s.action==="SLEEP"){s.focus=clamp(s.focus-.03);s.sleepNeed=clamp(s.sleepNeed-.07)}
      else if(s.action==="MOVE"){s.moveNeed=clamp(s.moveNeed-.10);s.focus=clamp(s.focus-.015)}
      else if(s.action==="LOOK_OUTSIDE"){s.focus=clamp(s.focus-.014);s.boredom=clamp(s.boredom-.03)}
      else if(s.action==="STRETCH"){s.moveNeed=clamp(s.moveNeed-.08)}
      else if(s.action==="PASS_NOTE"){s.focus=clamp(s.focus-.022)}
      else if(s.action==="ASK_BATHROOM"){s.focus=clamp(s.focus-.006)}

      if(s.actionTicks<=0||s.action==="WORK")decideLesson(s);
    }else{
      s.talkNeed=clamp(s.talkNeed+.008*s.soc);
      s.moveNeed=clamp(s.moveNeed+.006*s.move);
      s.socialNeed=clamp(s.socialNeed+.012*s.soc-.004*s.belonging);
      if(s.groupId&&groupMembers(s.groupId).length>1){s.socialNeed=clamp(s.socialNeed-.014);s.belonging=clamp(s.belonging+.004)}
      if(s.actionTicks<=0)decideFree(s);
    }
  }

  function updateSocialTracking(){
    students.forEach(function(s){
      var target=studentById(s.socialTarget);
      if(!target||target.scene!==s.scene)return;
      if(["SEEK","HELP_PEER","ARGUE","TEASE","EXCLUDE_TARGET","TAKE_ITEM_FORCE","THREATEN","HIT"].indexOf(s.action)>=0)setNear(s,target,["ARGUE","THREATEN","HIT"].indexOf(s.action)>=0?5:7);
      if(s.groupId&&["TALK","PLAY","COMPETE"].indexOf(s.action)>=0&&distance(s,target)>13)setNear(s,target,8);
    });
    students.forEach(function(s){
      var peers=circlePeers(s,s.scene);
      peers.forEach(function(p){
        if(distance(s,p)<18){
          var r=relation(s,p);r.timeTogether=(r.timeTogether||0)+.12;
          if(current().kind!=="lesson"&&s.action!=="REJECTED"&&p.action!=="REJECTED"){
            s.belonging=clamp(s.belonging+.0007);
          }
        }
      });
      if(current().kind!=="lesson"&&!s.socialTarget&&peers.length&&s.socialNeed>.30&&Math.random()<.02){
        beginSeek(s,pick(peers),current().kind==="lunchplay"&&s.scene==="playground"?"PLAY":"TALK");
      }
    });
  }
  function updateMovement(dt,speed){
    students.forEach(function(s){
      var dx=s.dx-s.x,dy=s.dy-s.y,d=Math.hypot(dx,dy);
      s.moving=d>.7;
      if(d>.7){
        var boost=s.action==="RUN"?1.55:1;
        var step=Math.min(d,dt*(8+speed*3)*boost);
        s.x+=dx/d*step;s.y+=dy/d*step;
        if(s.action!=="RUN"&&["SEEK","HELP_PEER","ARGUE"].indexOf(s.action)<0)s.action="WALK";
      }
    });
  }
  function sampleStats(){
    if(current().kind!=="lesson")return;
    var fit=students.reduce(function(a,s){return a+lessonFit(s)},0)/students.length;
    var eng=students.reduce(function(a,s){
      if(s.scene!==current().loc)return a+.05;
      var good=["WORK","HELP","PLAY","COMPETE","HELP_PEER"].indexOf(s.action)>=0;
      return a+(good?s.focus:Math.max(.10,s.focus-.27));
    },0)/students.length;
    stats.fitSamples.push(fit);stats.engageSamples.push(eng);
    stats.phaseSamples[lessonState.phase]=(stats.phaseSamples[lessonState.phase]||0)+1;
  }

  function mediateConflict(s){
    var other=conflictPartner(s);
    if(!other){log(s.name+" 주변에는 지금 중재할 만한 갈등이 뚜렷하지 않다.","teacher",teacherScene);return}
    var r=relation(s,other);
    var success=clamp(.34+(s.trust+other.trust)*.16+(s.empathy+other.empathy)*.09-r.irritation*.28);
    s.action="WAIT";other.action="WAIT";s.actionTicks=2;other.actionTicks=2;
    s.frustration=clamp(s.frustration-.20*success);other.frustration=clamp(other.frustration-.20*success);
    changeRelation(s,other,{irritation:-.14-.10*success,affinity:.008*success});
    s.conflictUntil=gameSec+60;other.conflictUntil=gameSec+60;
    if(success>.55){
      s.conflictWith=null;other.conflictWith=null;stats.reconciled++;
      s.trust=clamp(s.trust+.018);other.trust=clamp(other.trust+.018);
      remember(s,"선생님 중재로 "+other.name+"와 갈등을 정리함",.58);remember(other,"선생님 중재로 "+s.name+"와 갈등을 정리함",.58);
      log("두 학생의 말을 차례로 듣자 "+s.name+"와 "+other.name+"의 목소리가 차분해졌다.","teacher",teacherScene);
    }else{
      log("중재로 다툼은 멈췄지만 "+s.name+"와 "+other.name+" 사이 감정은 아직 남아 보인다.","teacher",teacherScene);
    }
  }
  function separateConflict(s){
    var other=conflictPartner(s);
    s.action="WAIT";s.groupId=null;s.socialTarget=null;s.frustration=clamp(s.frustration-.13);
    if(other){
      s.avoidId=other.id;s.avoidUntil=gameSec+6*60;other.avoidId=s.id;other.avoidUntil=gameSec+6*60;
      s.conflictUntil=gameSec+90;other.conflictUntil=gameSec+90;
      s.dx=clamp(other.x>50?18:82,8,92);s.dy=clamp(78+rand(-7,7),25,90);
      remember(s,other.name+"와 잠시 떨어져 진정함",.42);
      log(s.name+"을(를) "+other.name+"에게서 잠시 떨어뜨려 진정할 시간을 주었다.","teacher",teacherScene);
    }else{
      setDestination(s,s.scene,true);
      log(s.name+"에게 잠시 다른 자리에서 정리할 시간을 주었다.","teacher",teacherScene);
    }
  }
  function giveRole(s){
    stats.roles++;
    s.role="helper";s.roleUntil=gameSec+12*60;s.belonging=clamp(s.belonging+.09);s.mood=clamp(s.mood+.045);
    circlePeers(s,s.scene).forEach(function(o){if(distance(s,o)<28)o.helpful=clamp(o.helpful+.003)});
    s.focus=clamp(s.focus+.055);s.talkNeed=clamp(s.talkNeed-.06);s.moveNeed=clamp(s.moveNeed-.06);
    remember(s,"선생님에게 도움 역할을 맡음",.58);
    log(s.name+"에게 친구를 돕거나 정리를 맡는 작은 역할을 주었다.","teacher",teacherScene);
  }
  function connectStudents(a,b){
    if(!a||!b||a===b||a.scene!==b.scene)return;
    stats.teacherActs++;stats.connections++;
    a.pairWith=b.id;b.pairWith=a.id;a.pairUntil=gameSec+8*60;b.pairUntil=gameSec+8*60;
    a.socialNeed=clamp(a.socialNeed+.08);b.socialNeed=clamp(b.socialNeed+.05);
    a.groupId=null;b.groupId=null;
    remember(a,"선생님이 "+b.name+"와 함께 해보도록 연결함",.42);remember(b,"선생님이 "+a.name+"와 함께 해보도록 연결함",.42);
    log("선생님이 "+a.name+"와 "+b.name+"에게 함께 해볼 기회를 만들어 주었다.","teacher",teacherScene);
    if(a.conflictWith===b.id||b.conflictWith===a.id){
      a.frustration=clamp(a.frustration+.035);b.frustration=clamp(b.frustration+.035);
    }else{
      beginSeek(a,b,current().kind==="lunchplay"?"PLAY":"TALK");
    }
  }

  function isOffTask(s){
    return ["TALK","DOODLE","SLEEP","MOVE","RUN","REJECTED","REFUSE_INSTRUCTION","SHOUT_TEACHER","INSULT_TEACHER"].indexOf(s.action)>=0;
  }
  function isPositiveAction(s){
    return ["WORK","READ","HELP_PEER","CLEAN","SHARE","PLAY"].indexOf(s.action)>=0;
  }
  function teacherIsBusy(){
    return !!teacherTask&&teacherTask.end>gameSec;
  }
  function actionCompatibility(action,s){
    if(!s)return 1;
    var v=.78;
    if(action.id==="gesture")v=.62+s.rule*.22+s.trust*.10-s.imp*.08;
    if(action.id==="proximity")v=.72+s.trust*.18+(1-s.assert)*.08;
    if(action.id==="quietCall")v=.62+s.rule*.15+s.trust*.14-s.rejection*.07;
    if(action.id==="redirect")v=.65+s.persist*.12+s.trust*.12;
    if(action.id==="chalk")v=.83-s.rejection*.18-s.correctionLoad*.25;
    if(action.id==="hint")v=.68+s.persist*.12+s.visual*.08;
    if(action.id==="firstStep")v=.74+(1-s.skill)*.16+s.hands*.06;
    if(action.id==="simplify")v=.72+(1-s.skill)*.18;
    if(action.id==="movementJob")v=.65+s.move*.28;
    if(action.id==="praise")v=.72+s.trust*.15+s.rejection*.06;
    if(action.id==="listen")v=.70+s.rejection*.15+s.trust*.08;
    if(action.id==="role")v=.66+s.helpful*.16+s.soc*.08;
    return clamp(v,.35,1.12);
  }
  function repeatMultiplier(action,s){
    if(!s)return 1;
    var uses=s.teacherUse[action.id]||0;
    return clamp(1-uses*(action.repeatPenalty||.05),.45,1);
  }
  function effectMultiplier(action,s){
    return actionCompatibility(action,s)*repeatMultiplier(action,s);
  }
  function actionById(id){
    return TEACHER_ACTIONS[id]||CLASS_ACTIONS[id]||INSTRUCTION_ACTIONS[id]||null;
  }
  function finishTeacherTask(){
    if(!teacherTask)return;
    var task=teacherTask;
    teacherTask=null;
    var action=actionById(task.actionId);
    var s=task.targetId===null?null:studentById(task.targetId);
    if(s&&s.scene!==task.scene){
      log((s?s.name+"의 ":"")+"상황이 바뀌어 교사 행동이 중간에 끊겼다.","teacher",task.scene);
      render();return;
    }
    if(action){
      if(!action.instruction)stats.teacherActs++;
      if(s){
        s.teacherUse[action.id]=(s.teacherUse[action.id]||0)+1;
        s.interventions++;
      }
      action.effect(s,task.multiplier,task);
    }
    render();
  }
  function updateTeacherTask(){
    if(teacherTask&&gameSec>=teacherTask.end)finishTeacherTask();
  }
  function startTeacherTask(action,s){
    if(!action||teacherIsBusy())return;
    if(s&&s.scene!==teacherScene)return;
    if(action.mode==="seat"){
      swapMode=true;connectMode=false;render();return;
    }
    if(action.mode==="connect"){
      connectMode=true;swapMode=false;render();return;
    }
    if(action.near&&s){
      teacher.x=clamp(s.x-7,5,95);teacher.y=clamp(s.y-10,15,91);
    }
    if(action.instruction)setLessonPhase(action);
    var duration=action.duration||10;
    teacherTask={
      actionId:action.id,
      targetId:s?s.id:null,
      start:gameSec,
      end:gameSec+duration,
      duration:duration,
      multiplier:effectMultiplier(action,s),
      scene:teacherScene
    };
    if(!action.instruction)log((s?s.name+"에게 ":"")+action.label+"을(를) 시작했다.","teacher",teacherScene);
    render();
  }
  function consumeTeacherTime(label,duration){
    if(teacherIsBusy())return false;
    teacherTask={actionId:null,targetId:null,start:gameSec,end:gameSec+duration,duration:duration,multiplier:1,label:label};
    return true;
  }

  var INSTRUCTION_ACTIONS={
    explain:{
      id:"explain",instruction:true,phase:"explain",label:"설명하기",duration:35,
      desc:"핵심 개념을 짧게 설명합니다. 오래 이어지면 일부 학생의 집중이 빠르게 떨어집니다.",
      effect:function(){
        students.filter(function(s){return s.scene===current().loc}).forEach(function(s){s.focus=clamp(s.focus+.018*lessonFit(s));});
      }
    },
    question:{
      id:"question",instruction:true,phase:"question",label:"질문 던지기",duration:22,
      desc:"학생의 생각을 묻고 손들기·응답을 유도합니다.",
      effect:function(){
        var raised=students.filter(function(s){return s.scene===current().loc&&s.action==="RAISE_HAND"});
        if(raised.length){var r=pick(raised);r.mood=clamp(r.mood+.018);r.focus=clamp(r.focus+.025);log(r.name+"이(가) 질문에 답하며 자신의 생각을 설명했다.","learning",teacherScene);}
        else log("질문을 던졌지만 바로 손을 드는 학생은 없었다.","learning",teacherScene);
      }
    },
    demo:{
      id:"demo",instruction:true,phase:"demo",label:"시범 보이기",duration:35,
      desc:"판서·교구·실제 예시를 보여주며 말로만 설명하지 않습니다.",
      effect:function(){
        students.filter(function(s){return s.scene===current().loc}).forEach(function(s){s.focus=clamp(s.focus+.015*s.visual+.012*s.hands);});
      }
    },
    individual:{
      id:"individual",instruction:true,phase:"individual",label:"개별활동 시작",duration:15,
      desc:"학생들이 자기 속도로 문제나 과제를 해결하게 합니다. 교사는 이때 돌아다니며 관찰·지원할 수 있습니다.",
      effect:function(){
        students.filter(function(s){return s.scene===current().loc}).forEach(function(s){s.action="WORK";s.actionTicks=2;});
      }
    },
    pair:{
      id:"pair",instruction:true,phase:"pair",label:"짝활동 전환",duration:20,
      desc:"자리 가까운 학생끼리 짝을 만들어 서로 설명하고 확인하게 합니다. 관계가 좋다고 항상 학습적인 대화가 되는 것은 아닙니다.",
      effect:function(){
        students.filter(function(s){return s.scene===current().loc&&s.lessonPartner!==null}).forEach(function(s){s.action="PAIR_WORK";s.actionTicks=3;});
      }
    },
    presentation:{
      id:"presentation",instruction:true,phase:"presentation",label:"발표시키기",duration:28,
      desc:"한 학생의 생각이나 결과를 학급 전체와 공유합니다. 발표자는 경험을 얻고 다른 학생은 듣는 시간이 됩니다.",
      effect:function(){
        var presenter=studentById(lessonState.presenterId);
        if(presenter){presenter.mood=clamp(presenter.mood+.025);presenter.belonging=clamp(presenter.belonging+.018);remember(presenter,"수업 중 학급 앞에서 발표함",.42);}
      }
    },
    closure:{
      id:"closure",instruction:true,phase:"closure",label:"정리하기",duration:25,
      desc:"수업의 핵심을 다시 모으고 학생들이 무엇을 배웠는지 짧게 확인합니다.",
      effect:function(){
        students.filter(function(s){return s.scene===current().loc}).forEach(function(s){s.focus=clamp(s.focus+.015);});
      }
    }
  };

  var TEACHER_ACTIONS={
    watch:{
      id:"watch",category:"observe",label:"잠시 지켜보기",duration:20,repeatPenalty:.01,
      desc:"바로 개입하지 않고 행동의 원인과 다음 반응을 관찰합니다.",
      when:function(s){return !!s},
      recommended:function(s){return !!s.intent||s.action==="REJECTED"||s.action==="ARGUE"},
      effect:function(s,m){s.observation+=1;remember(s,"선생님이 바로 개입하지 않고 상황을 관찰함",.18);log(s.name+"의 행동을 잠시 지켜보며 맥락을 확인했다.","teacher",teacherScene)}
    },
    inspectWork:{
      id:"inspectWork",category:"observe",label:"활동지·과제 확인",duration:30,near:true,repeatPenalty:.025,
      desc:"정답보다 풀이 흔적과 막히는 지점을 확인합니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene&&teacherScene==="classroom"},
      recommended:function(s){return s.action==="HELP"||s.helpNeed>.16||s.skill<.52},
      effect:function(s,m){s.observation+=2;s.observedWork=true;s.helpNeed=clamp(s.helpNeed-.025*m);remember(s,"선생님이 풀이 과정을 확인함",.30);log(s.name+"의 과제를 살펴보며 어디에서 막히는지 확인했다.","learning",teacherScene)}
    },
    checkQuestion:{
      id:"checkQuestion",category:"observe",label:"확인 질문하기",duration:25,near:true,repeatPenalty:.04,
      desc:"짧은 질문으로 이해한 정도를 확인합니다. 틀려도 바로 정답을 주지는 않습니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene},
      recommended:function(s){return s.action==="HELP"||s.helpNeed>.13},
      effect:function(s,m){s.observation+=1;s.focus=clamp(s.focus+.025*m);s.observedWork=true;remember(s,"선생님의 확인 질문에 답해봄",.28);log(s.name+"에게 짧은 확인 질문을 해 이해 정도를 살폈다.","learning",teacherScene)}
    },

    hint:{
      id:"hint",category:"support",label:"힌트 하나 주기",duration:30,near:true,repeatPenalty:.07,
      desc:"해결 방향만 짚어 스스로 다음 단계를 찾게 합니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene&&(s.action==="HELP"||s.helpNeed>.08||s.skill<.62)},
      recommended:function(s){return s.action==="HELP"&&s.skill>.34},
      effect:function(s,m){s.helpNeed=clamp(s.helpNeed-.14*m);s.skill=clamp(s.skill+.006*m);s.focus=clamp(s.focus+.07*m);stats.helped++;remember(s,"힌트를 받고 다시 문제에 접근함",.50);log(s.name+"에게 정답 대신 작은 힌트를 주었다.","learning",teacherScene)}
    },
    firstStep:{
      id:"firstStep",category:"support",label:"첫 단계 같이 하기",duration:45,near:true,repeatPenalty:.09,
      desc:"막힘이 큰 학생과 첫 단계만 함께 해결합니다. 효과는 크지만 교사 시간이 많이 듭니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene&&(s.action==="HELP"||s.skill<.55)},
      recommended:function(s){return s.skill<.40||s.helpNeed>.24},
      effect:function(s,m){s.helpNeed=clamp(s.helpNeed-.22*m);s.skill=clamp(s.skill+.011*m);s.focus=clamp(s.focus+.10*m);s.trust=clamp(s.trust+.012);stats.helped++;remember(s,"선생님과 첫 단계를 함께 해결함",.58);log(s.name+"과 첫 단계를 함께 풀고 나머지는 스스로 이어가게 했다.","learning",teacherScene)}
    },
    simplify:{
      id:"simplify",category:"support",label:"과제를 작게 나누기",duration:35,near:true,repeatPenalty:.05,
      desc:"해야 할 일을 더 작은 단계로 나누어 부담을 낮춥니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene&&(s.skill<.58||s.frustration>.24)},
      recommended:function(s){return s.frustration>.34||s.skill<.34},
      effect:function(s,m){s.frustration=clamp(s.frustration-.13*m);s.helpNeed=clamp(s.helpNeed-.11*m);s.focus=clamp(s.focus+.055*m);s.boredom=clamp(s.boredom-.025);remember(s,"과제를 작은 단계로 나눠 다시 시작함",.48);log(s.name+"의 과제를 더 작은 단계로 나누어 다시 시작하게 했다.","learning",teacherScene)}
    },
    movementJob:{
      id:"movementJob",category:"support",label:"움직이는 심부름 주기",duration:25,repeatPenalty:.06,
      desc:"움직임 욕구를 억누르기보다 짧은 이동 역할로 풀어낸 뒤 돌아오게 합니다.",
      when:function(s){return s.scene===teacherScene&&(s.action==="MOVE"||s.moveNeed>.30)&&current().kind!=="lunch"},
      recommended:function(s){return s.moveNeed>.48},
      effect:function(s,m){s.moveNeed=clamp(s.moveNeed-.28*m);s.focus=clamp(s.focus+.06*m);s.role="errand";s.roleUntil=gameSec+3*60;s.action="WALK";setDestination(s,s.scene,true);remember(s,"짧은 심부름 역할로 움직임을 해결함",.42);log(s.name+"에게 짧게 움직일 수 있는 심부름을 맡겼다.","teacher",teacherScene)}
    },

    gesture:{
      id:"gesture",category:"guide",label:"시선·손짓으로 신호",duration:8,repeatPenalty:.04,
      desc:"수업 흐름을 끊지 않고 비언어적으로 주의를 환기합니다.",
      when:function(s){return s.scene===teacherScene&&isOffTask(s)&&s.action!=="REJECTED"},
      recommended:function(s){return isOffTask(s)&&s.correctionLoad<.18},
      effect:function(s,m){s.focus=clamp(s.focus+.065*m);s.talkNeed=clamp(s.talkNeed-.055*m);s.moveNeed=clamp(s.moveNeed-.045*m);if(m>.55)s.action=current().subject==="체육"?"PLAY":"WORK";s.correctionLoad=clamp(s.correctionLoad+.025);log(s.name+"에게 시선과 손짓으로 조용히 신호를 보냈다.","teacher",teacherScene)}
    },
    proximity:{
      id:"proximity",category:"guide",label:"가까이 서 있기",duration:20,near:true,repeatPenalty:.035,
      desc:"공개적으로 지적하지 않고 교사의 위치 자체로 행동을 조절합니다.",
      when:function(s){return s.scene===teacherScene&&(isOffTask(s)||s.action==="ARGUE")},
      recommended:function(s){return isOffTask(s)&&s.trust>.48},
      effect:function(s,m){s.focus=clamp(s.focus+.08*m);s.frustration=clamp(s.frustration-.025*m);if(s.action!=="ARGUE")s.action=current().subject==="체육"?"PLAY":"WORK";s.correctionLoad=clamp(s.correctionLoad+.02);log(s.name+" 가까이에 머물며 행동이 스스로 정돈되는지 살폈다.","teacher",teacherScene)}
    },
    quietCall:{
      id:"quietCall",category:"guide",label:"조용히 이름 불러 재안내",duration:12,repeatPenalty:.09,
      desc:"짧고 분명하게 이름을 부르고 지금 해야 할 행동을 다시 알려줍니다.",
      when:function(s){return s.scene===teacherScene&&isOffTask(s)&&s.action!=="REJECTED"},
      recommended:function(s){return isOffTask(s)&&s.correctionLoad<.35},
      effect:function(s,m){s.focus=clamp(s.focus+.12*m);s.action=current().subject==="체육"?"PLAY":"WORK";s.intent=null;s.correctionLoad=clamp(s.correctionLoad+.10);s.trust=clamp(s.trust-.004*(1-m));remember(s,"선생님이 조용히 이름을 불러 재안내함",.34);log(s.name+"에게 짧게 이름을 부르고 지금 할 일을 다시 알려주었다.","teacher",teacherScene)}
    },
    redirect:{
      id:"redirect",category:"guide",label:"해야 할 행동 다시 제시",duration:20,near:true,repeatPenalty:.06,
      desc:"하지 말라는 말 대신 지금 해야 할 구체적인 행동을 제시합니다.",
      when:function(s){return s.scene===teacherScene&&isOffTask(s)},
      recommended:function(s){return s.action==="DOODLE"||s.action==="MOVE"||s.action==="TALK"},
      effect:function(s,m){s.focus=clamp(s.focus+.09*m);s.boredom=clamp(s.boredom-.035*m);s.action=current().subject==="체육"?"PLAY":"WORK";s.intent=null;s.correctionLoad=clamp(s.correctionLoad+.055);log(s.name+"에게 지금 해야 할 행동을 짧고 구체적으로 다시 제시했다.","teacher",teacherScene)}
    },
    seatAdjust:{
      id:"seatAdjust",category:"guide",label:"자리 조정하기",duration:0,mode:"seat",
      desc:"반복적으로 영향을 주고받는 두 학생의 물리적 거리를 바꿉니다.",
      when:function(s){return teacherScene==="classroom"&&s.scene==="classroom"},
      recommended:function(s){return current().kind==="lesson"&&s.talkNeed>.28&&nearbyStudents(s,28).some(function(p){return relation(s,p).affinity>.68})},
      effect:function(){}
    },
    separate:{
      id:"separate",category:"guide",label:"잠깐 거리 두게 하기",duration:35,near:true,repeatPenalty:.04,
      desc:"감정이 높을 때 해결을 강요하지 않고 먼저 물리적 거리를 확보합니다.",
      when:function(s){return s.scene===teacherScene&&(!!conflictPartner(s)||s.frustration>.42)},
      recommended:function(s){return s.action==="SHOVE"||s.frustration>.62},
      effect:function(s){separateConflict(s)}
    },
    chalk:{
      id:"chalk",category:"guide",label:"분필 톡으로 즉시 환기",duration:6,repeatPenalty:.18,
      desc:"즉시 효과는 크지만 공개적이고 반복 사용 시 신뢰와 효과가 빠르게 떨어지는 강한 개입입니다.",
      when:function(s){return teacherScene==="classroom"&&current().kind==="lesson"&&s.scene===teacherScene&&isOffTask(s)},
      recommended:function(s){return false},
      effect:function(s,m){s.focus=clamp(s.focus+.18*m);s.trust=clamp(s.trust-.015-.025*s.correctionLoad);s.correctionLoad=clamp(s.correctionLoad+.20);s.action="WORK";s.intent=null;students.forEach(function(o){if(o.scene===s.scene&&distance(o,s)<28)o.focus=clamp(o.focus+.02)});remember(s,"분필 톡으로 공개적인 주의 환기를 받음",.32);log("분필 톡으로 "+s.name+"과 주변의 주의를 즉시 돌렸다.","teacher",teacherScene)}
    },

    immediateStop:{
      id:"immediateStop",category:"guide",label:"즉시 중단·거리 확보",duration:8,near:true,repeatPenalty:0,
      desc:"심각한 신체·위협 행동이 보일 때 다른 목표보다 먼저 행동을 멈추고 거리를 확보합니다.",
      when:function(s){return s.scene===teacherScene&&(isSevereAction(s)||s.action==="SHOVE")},
      recommended:function(s){return isSevereAction(s)||s.action==="SHOVE"},
      effect:function(s){
        var target=seriousTarget(s);
        s.action="WAIT";s.actionTicks=3;s.frustration=clamp(s.frustration-.07);s.socialTarget=null;
        if(target){target.action="WAIT";target.actionTicks=2;target.dx=clamp(target.x+(target.x<50?-10:10),7,93)}
        stats.safetyInterventions++;
        log("교사가 즉시 행동을 중단시키고 학생들 사이의 거리를 확보했다.","teacher",teacherScene);
      }
    },
    checkSafety:{
      id:"checkSafety",category:"support",label:"피해 학생 안전 확인",duration:30,near:true,repeatPenalty:0,
      desc:"갈등 해결보다 먼저 다친 곳·불안·안전 상태를 확인하고 보호합니다.",
      when:function(s){return s.scene===teacherScene&&(s.victimStress>.10||s.action==="HURT")},
      recommended:function(s){return s.victimStress>.16||s.action==="HURT"},
      effect:function(s,m){
        s.victimStress=clamp(s.victimStress-.18*m);s.frustration=clamp(s.frustration-.10*m);s.trust=clamp(s.trust+.035*m);s.mood=clamp(s.mood+.05*m);
        stats.safetyInterventions++;remember(s,"교사가 먼저 안전과 상태를 확인해 줌",.72);
        log(s.name+"의 안전과 상태를 먼저 확인하고 잠시 보호했다.","teacher",teacherScene);
      }
    },
    requestSupport:{
      id:"requestSupport",category:"guide",label:"지원 인력 요청",duration:20,repeatPenalty:0,
      desc:"혼자 처리하기 어려운 심각 상황에서 다른 교직원의 지원을 요청합니다.",
      when:function(s){return s.scene===teacherScene&&(isSevereAction(s)||s.teacherDefiance>.22||s.victimStress>.20)},
      recommended:function(s){return isSevereAction(s)&&(["HIT","THROW_AT_TEACHER","THREATEN"].indexOf(s.action)>=0)},
      effect:function(s){
        s.frustration=clamp(s.frustration-.11);s.action="WAIT";s.actionTicks=4;s.severeCooldown=Math.max(s.severeCooldown,gameSec+12*60);
        stats.safetyInterventions++;remember(s,"심각 상황에서 추가 교직원 지원이 요청됨",.62);
        log("상황을 혼자 끌지 않고 다른 교직원의 지원을 요청했다.","teacher",teacherScene);
      }
    },
    documentIncident:{
      id:"documentIncident",category:"observe",label:"사건 경과 기록",duration:35,repeatPenalty:0,
      desc:"심각 사건의 행동·대상·전후 맥락을 관찰 사실 중심으로 기록합니다.",
      when:function(s){return s.scene===teacherScene&&!!s.lastSeriousIncident},
      recommended:function(s){return !!s.lastSeriousIncident},
      effect:function(s){
        s.observation+=2;remember(s,"교사가 심각 사건의 경과를 사실 중심으로 기록함",.65);
        log(s.name+" 관련 심각 사건의 전후 상황을 기록했다.","teacher",teacherScene);
      }
    },

    praise:{
      id:"praise",category:"relationship",label:"구체적으로 인정하기",duration:15,repeatPenalty:.05,
      desc:"결과보다 실제 시도와 행동을 짧게 짚어 인정합니다.",
      when:function(s){return s.scene===teacherScene&&isPositiveAction(s)},
      recommended:function(s){return isPositiveAction(s)&&s.trust<.72},
      effect:function(s,m){s.focus=clamp(s.focus+.045*m);s.trust=clamp(s.trust+.035*m);s.mood=clamp(s.mood+.035*m);s.belonging=clamp(s.belonging+.022*m);circlePeers(s,s.scene).forEach(function(o){if(distance(s,o)<25)o.belonging=clamp(o.belonging+.006*m)});stats.praises++;remember(s,"구체적인 행동을 인정받음",.50);log(s.name+"이 잘한 구체적인 행동을 짧게 인정했다.","teacher",teacherScene)}
    },
    listen:{
      id:"listen",category:"relationship",label:"잠깐 이야기 듣기",duration:40,near:true,repeatPenalty:.025,
      desc:"해결책을 먼저 말하지 않고 학생의 현재 감정과 상황을 짧게 듣습니다.",
      when:function(s){return s.scene===teacherScene&&(s.frustration>.18||s.action==="REJECTED"||s.action==="HURT"||!!conflictPartner(s))},
      recommended:function(s){return s.action==="REJECTED"||s.frustration>.45},
      effect:function(s,m){s.frustration=clamp(s.frustration-.18*m);s.mood=clamp(s.mood+.065*m);s.trust=clamp(s.trust+.04*m);remember(s,"선생님이 먼저 이야기를 들어줌",.58);log(s.name+"의 이야기를 먼저 듣고 상황을 확인했다.","teacher",teacherScene)}
    },
    mediate:{
      id:"mediate",category:"relationship",label:"둘 사이 갈등 중재",duration:70,near:true,repeatPenalty:.02,
      desc:"두 학생의 말을 차례로 듣고 관계 회복을 시도합니다. 시간이 많이 들지만 장기 효과가 큽니다.",
      when:function(s){return s.scene===teacherScene&&!!conflictPartner(s)},
      recommended:function(s){return !!conflictPartner(s)&&s.action!=="SHOVE"},
      effect:function(s){mediateConflict(s)}
    },
    connectPeer:{
      id:"connectPeer",category:"relationship",label:"함께할 친구 연결",duration:0,mode:"connect",
      desc:"두 학생에게 자연스럽게 함께할 기회를 만듭니다. 관계가 너무 나쁘면 역효과가 날 수도 있습니다.",
      when:function(s){return s.scene===teacherScene&&!conflictPartner(s)},
      recommended:function(s){return s.belonging<.52||s.action==="REJECTED"},
      effect:function(){}
    },
    role:{
      id:"role",category:"relationship",label:"의미 있는 역할 맡기기",duration:25,repeatPenalty:.08,
      desc:"도움·정리·준비 역할을 줘 행동 에너지를 학급에 기여하는 방향으로 돌립니다.",
      when:function(s){return s.scene===teacherScene},
      recommended:function(s){return (s.moveNeed>.30||s.mischief>.62)&&s.roleUntil<=gameSec},
      effect:function(s){giveRole(s)}
    },
    circleRole:{
      id:"circleRole",category:"relationship",label:"무리에 공동 역할 주기",duration:40,repeatPenalty:.06,
      desc:"자주 어울리는 무리 전체에 공동 책임을 줘 집단 규범을 다른 방향으로 유도합니다.",
      when:function(s){var circle=circleOf(s);return s.scene===teacherScene&&circle&&circle.members.filter(function(id){var o=studentById(id);return o&&o.scene===s.scene}).length>=2},
      recommended:function(s){var circle=circleOf(s);return !!circle&&circle.profile.mischief>.58},
      effect:function(s,m){
        var circle=circleOf(s);if(!circle)return;
        circle.members.map(studentById).filter(Boolean).filter(function(o){return o.scene===s.scene}).forEach(function(o){
          o.role="team-helper";o.roleUntil=gameSec+8*60;o.belonging=clamp(o.belonging+.045*m);o.helpful=clamp(o.helpful+.006*m);o.mischief=clamp(o.mischief-.003*m);
        });
        stats.roles++;log(s.name+"이 속한 무리에게 함께 책임질 작은 역할을 맡겼다.","teacher",teacherScene);
      }
    }
  };

  var CLASS_ACTIONS={
    scanRoom:{
      id:"scanRoom",category:"observe",label:"교실 전체 훑어보기",duration:20,repeatPenalty:0,
      desc:"한 학생에게 바로 붙지 않고 현재 공간 전체의 행동 흐름을 살핍니다.",
      when:function(){return true},
      recommended:function(){return true},
      effect:function(){students.filter(function(s){return s.scene===teacherScene}).forEach(function(s){s.observation+=.35});log(SCENE_NAME[teacherScene]+" 전체를 잠시 훑어보며 분위기를 확인했다.","teacher",teacherScene)}
    },
    microBreak:{
      id:"microBreak",category:"support",label:"짧은 움직임 전환",duration:20,
      desc:"수업 전체의 몸 움직임 욕구가 높을 때 잠깐 일어나 움직이고 다시 앉게 합니다.",
      when:function(){return current().kind==="lesson"&&students.filter(function(s){return s.scene===teacherScene&&s.moveNeed>.34}).length>=3},
      recommended:function(){return students.filter(function(s){return s.scene===teacherScene&&s.moveNeed>.42}).length>=3},
      effect:function(){students.filter(function(s){return s.scene===teacherScene}).forEach(function(s){s.moveNeed=clamp(s.moveNeed-.16);s.boredom=clamp(s.boredom-.06);s.focus=clamp(s.focus+.025)});log("학급 전체가 짧게 몸을 움직이고 다시 활동으로 돌아왔다.","teacher",teacherScene)}
    },
    attentionSignal:{
      id:"attentionSignal",category:"guide",label:"전체 집중 신호",duration:8,
      desc:"짧은 공동 신호로 학급 전체의 시선을 한 번 모읍니다. 반복하면 효과가 줄어듭니다.",
      when:function(){return current().kind==="lesson"},
      recommended:function(){return students.filter(function(s){return s.scene===teacherScene&&isOffTask(s)}).length>=3},
      effect:function(){students.filter(function(s){return s.scene===teacherScene}).forEach(function(s){s.focus=clamp(s.focus+.045);s.talkNeed=clamp(s.talkNeed-.025)});log("짧은 전체 집중 신호로 학급의 시선을 다시 모았다.","teacher",teacherScene)}
    },
    classPraise:{
      id:"classPraise",category:"relationship",label:"학급의 좋은 흐름 짚기",duration:15,
      desc:"막연한 칭찬 대신 지금 학급에서 잘 이루어지는 구체적인 행동을 전체에 알려줍니다.",
      when:function(){return current().kind==="lesson"||current().kind==="closing"},
      recommended:function(){return students.filter(function(s){return s.scene===teacherScene&&isPositiveAction(s)}).length>=5},
      effect:function(){students.filter(function(s){return s.scene===teacherScene}).forEach(function(s){s.belonging=clamp(s.belonging+.012);s.mood=clamp(s.mood+.012)});log("지금 학급에서 잘 이루어지는 행동을 구체적으로 짚어 주었다.","teacher",teacherScene)}
    }
  };

  function availableActions(s,category){
    var source=s?TEACHER_ACTIONS:CLASS_ACTIONS;
    return Object.keys(source).map(function(k){return source[k]}).filter(function(a){
      return a.category===category&&(!a.when||a.when(s));
    });
  }
  function executeTeacherAction(id){
    var s=studentById(selected);
    var action=(s?TEACHER_ACTIONS:CLASS_ACTIONS)[id];
    if(!action||teacherIsBusy()||!action.when(s))return;
    startTeacherTask(action,s);
  }
  function teacherAction(kind){
    var map={approach:"proximity",call:"quietCall",praise:"praise",hint:"hint",chalk:"chalk",mediate:"mediate",separate:"separate",role:"role"};
    if(map[kind])executeTeacherAction(map[kind]);
  }

  function scoreReport(){
    var p=current();
    var fitAvg=stats.fitSamples.length?stats.fitSamples.reduce(function(a,b){return a+b},0)/stats.fitSamples.length:.60;
    var engAvg=stats.engageSamples.length?stats.engageSamples.reduce(function(a,b){return a+b},0)/stats.engageSamples.length:.55;
    var gain=students.reduce(function(a,s,i){return a+Math.max(0,s.skill-stats.learningStart[i])},0)/students.length;
    var phases=Object.keys(stats.phaseSamples);
    var structure=42;
    if(phases.indexOf("explain")>=0||phases.indexOf("demo")>=0)structure+=12;
    if(phases.indexOf("question")>=0)structure+=8;
    if(phases.indexOf("individual")>=0||phases.indexOf("pair")>=0)structure+=15;
    if(phases.indexOf("closure")>=0)structure+=11;
    if(stats.instructionMoves.length>=3)structure+=7;
    if(stats.instructionMoves.length>9)structure-=Math.min(14,(stats.instructionMoves.length-9)*3);
    structure=clamp(structure/100);
    var design=Math.round((fitAvg*.64+structure*.36)*100);
    var engage=Math.round(engAvg*100);
    var learning=Math.round(Math.min(100,52+gain*3500+stats.helped*3));
    var latenessPenalty=Math.min(14,stats.lateTicks*.22);
    var conflictPenalty=Math.min(18,stats.conflicts*5);
    var seriousPenalty=Math.min(26,stats.seriousIncidents*8);
    var recoveryBonus=Math.min(10,stats.reconciled*4);
    var climate=Math.round(clamp((92-stats.disruptions*7-latenessPenalty-conflictPenalty-seriousPenalty+recoveryBonus+Math.min(8,stats.teacherActs*.9)+Math.min(8,stats.safetyInterventions*2))/100)*100);
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
    q("#reportSub").textContent=fmtMin(r.p.start)+"~"+fmtMin(r.p.end)+" · 수업 행동 "+stats.instructionMoves.length+"회";
    q("#grade").textContent=r.grade;q("#mDesign").textContent=r.design;q("#mEngage").textContent=r.engage;q("#mLearn").textContent=r.learning;q("#mClimate").textContent=r.climate;
    var events=stats.events.filter(function(e){return e.type!=="ambient"}).slice(-10);
    q("#incidentList").innerHTML=events.length?events.map(function(e){return "<li><strong>"+e.stamp+"</strong> ["+SCENE_NAME[e.scene]+"] "+e.text+"</li>"}).join(""):"<li>큰 사건 없이 수업이 진행되었다.</li>";
    var findings=[];
    if(lessonState.history.length){
      findings.push("수업 흐름: "+lessonState.history.map(function(h){return h.label}).join(" → "));
    }
    students.filter(function(s){return s.focus<.48}).sort(function(a,b){return a.focus-b.focus}).slice(0,2).forEach(function(s){findings.push(s.name+"은(는) 이번 시간에 집중을 오래 유지하지 못했다.")});
    var support=students.slice().sort(function(a,b){return a.skill-b.skill})[0];
    if(support)findings.push(support.name+"은(는) 현재 개념을 추가로 확인할 필요가 있어 보인다.");
    var isolated=students.slice().sort(function(a,b){return a.belonging-b.belonging})[0];
    if(isolated&&isolated.belonging<.53)findings.push(isolated.name+"은(는) 또래 활동에서 소속감이 낮아진 모습이 보였다.");
    if(stats.conflicts) findings.push("수업 중 또래 갈등 "+stats.conflicts+"건이 행동과 집중에 영향을 주었다.");
    if(stats.peerHarm)findings.push("반복 배제·위협·거친 신체행동 등 심각한 또래 사건이 "+stats.peerHarm+"건 발생해 안전과 관계 회복이 우선 과제가 되었다.");
    if(stats.teacherIncidents)findings.push("교사를 향한 고성·모욕적 말·물건 던지기 등 심각한 수업 방해 상황이 "+stats.teacherIncidents+"건 발생했다.");
    if(stats.safetyInterventions)findings.push("심각 상황에서 안전 확보·보호·지원 요청을 "+stats.safetyInterventions+"회 실시했다.");
    if(stats.reconciled) findings.push("교사 중재로 "+stats.reconciled+"건의 갈등이 비교적 안정적으로 정리되었다.");
    if(stats.roles) findings.push("역할을 맡긴 학생의 행동 방향이 도움·정리 쪽으로 바뀌는 장면이 있었다.");
    if(stats.connections) findings.push("교사가 연결한 또래 관계가 이후 상호작용의 기회를 만들었다.");
    if(stats.helped>0)findings.push("개별 힌트를 받은 학생에게 즉각적인 학습 회복이 나타났다.");
    if(stats.instructionMoves.length<2)findings.push("수업 방식의 전환이 거의 없어 한 가지 흐름이 오래 지속되었다.");
    if(!stats.phaseSamples.closure)findings.push("수업 마무리 단계 없이 시간이 끝나 핵심 내용을 다시 모을 기회가 적었다.");
    if(stats.phaseSamples.pair&&stats.disruptions>2)findings.push("짝활동 중 일부 대화가 학습에서 벗어나 생활지도 부담으로 이어졌다.");
    socialCircles.slice().sort(function(a,b){return b.cohesion-a.cohesion}).slice(0,2).forEach(function(circle){
      var names=circle.members.map(studentById).filter(Boolean).map(function(x){return x.name}).join("·");
      findings.push(names+"이(가) 반복적으로 함께 움직이며 '"+circle.label+"' 성향의 무리를 형성하고 있다.");
    });
    q("#findingList").innerHTML=findings.map(function(x){return "<li>"+x+"</li>"}).join("");
    q("#report").hidden=false;
  }

  function nextPeriod(){
    reportOpen=false;q("#report").hidden=true;
    var old=current();gameSec=old.end*60;periodIndex=Math.min(periodIndex+1,schedule.length-1);
    if(gameSec<current().start*60)gameSec=current().start*60;
    teacherTask=null;newStats();assignPeriodDestinations();running=true;selected=null;connectMode=false;
    log(current().name+"이(가) 시작되었다.","ambient",teacherScene);render();
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
      periodIndex=idx;teacherTask=null;newStats();assignPeriodDestinations();selected=null;connectMode=false;
      log(current().name+"이(가) 시작되었다.","ambient",teacherScene);
    }
    return true;
  }

  function poseFor(s){
    if(s.moving)return Math.floor(gameSec)%2?"walk1":"walk2";
    var map={
      WORK:"action1",READ:"stand",TALK:"action2",DOODLE:"action1",HELP:"cheer1",SLEEP:"duck",MOVE:"idle",
      WALK:"walk1",RUN:"walk2",WAIT:"idle",PLAY:"jump",COMPETE:"kick",REST:"duck",EAT:"hold1",SHARE:"hold2",
      CLEAN:"action1",SEEK:"walk1",JOIN:"stand",REJECTED:"hurt",ARGUE:"action2",SHOVE:"kick",HURT:"hurt",
      WATCH:"stand",HELP_PEER:"hold1",ATTEND:"stand",PAIR_WORK:"action2",RAISE_HAND:"cheer1",PRESENT:"cheer2",
      BORROW_ITEM:"hold1",LOOK_OUTSIDE:"stand",STRETCH:"cheer1",DRINK_WATER:"hold1",DROP_ITEM:"duck",COMFORT:"hold2",
      TEASE:"action2",EXCLUDE_TARGET:"action2",TAKE_ITEM_FORCE:"hold2",THREATEN:"action2",HIT:"kick",
      REFUSE_INSTRUCTION:"idle",SHOUT_TEACHER:"action2",INSULT_TEACHER:"action2",THROW_AT_TEACHER:"action1",
      ASK_BATHROOM:"cheer1",PASS_NOTE:"hold2",DEFEND_PEER:"hold2",REPORT_INCIDENT:"cheer1"
    };
    return map[s.action]||"stand";
  }
  function actionClass(s){
    var a=s.action.toLowerCase();if(s.moving)a="walk";return a;
  }
  function seated(s){
    if(s.scene!=="classroom")return false;
    return ["WORK","READ","TALK","DOODLE","HELP","SLEEP","ATTEND","PAIR_WORK","RAISE_HAND"].indexOf(s.action)>=0&&current().kind!=="closing";
  }
  function thoughtMark(s){
    var map={TALK:"•••",DOODLE:"✎",HELP:"?",SLEEP:"Z",MOVE:"↔",PLAY:"○",COMPETE:"!",SEEK:"→",HELP_PEER:"+",ARGUE:"!"};
    return s.intent?map[s.intent]||"":"";
  }
  function renderProps(){
    var world=q("#world"),scene=teacherScene;
    world.className="world scene-"+scene;q("#sceneTitle").textContent=SCENE_NAME[scene];
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
    if(p.kind==="lesson")return p.subject+" · "+currentPhase().label;
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
      var img=document.createElement("img");img.className="sprite";img.alt="";img.src=posePath(s,poseFor(s));
      img.onerror=function(){if(this.dataset.fallback)return;this.dataset.fallback="1";this.src=fallbackPose(s)};
      var wrap=document.createElement("span");wrap.className="sprite-wrap";wrap.appendChild(img);
      if(mark){var th=document.createElement("span");th.className="thought";th.textContent=mark;b.appendChild(th)}
      b.appendChild(wrap);
      var mask=document.createElement("span");mask.className="student-desk-mask";b.appendChild(mask);
      var nm=document.createElement("span");nm.className="student-name";nm.textContent=s.name;b.appendChild(nm);

      b.addEventListener("click",function(){
        if(connectMode&&selected!==null&&selected!==s.id){
          var first=studentById(selected);
          if(first&&first.scene===s.scene&&!teacherIsBusy()){
            connectStudents(first,s);connectMode=false;consumeTeacherTime("친구 연결",30);
          }
          selected=s.id;render();return;
        }
        if(swapMode&&selected!==null&&selected!==s.id&&teacherScene==="classroom"){
          var a=studentById(selected);
          if(a&&a.scene==="classroom"&&s.scene==="classroom"){
            var tmp=a.seat;a.seat=s.seat;s.seat=tmp;
            if(current().kind==="lesson"){setDestination(a,"classroom",false);setDestination(s,"classroom",false)}
            swapMode=false;stats.teacherActs++;consumeTeacherTime("자리 조정",35);log(a.name+"와 "+s.name+"의 자리를 바꾸었다.","teacher","classroom");
          }
        }
        selected=s.id;render();
      });
      layer.appendChild(b);
    });
    q("#offscreen").textContent=visible.length+"명 보임 · 다른 공간 "+(students.length-visible.length)+"명";
  }

  function humanAction(s){
    var map={
      WORK:"문제를 풀고 있음",READ:"읽고 있음",TALK:"친구와 이야기 중",DOODLE:"과제와 다른 일을 하고 있음",HELP:"도움을 기다리고 있음",
      SLEEP:"졸고 있음",MOVE:"몸을 움직이고 있음",WALK:"이동 중",RUN:"뛰는 중",WAIT:"잠시 머무는 중",PLAY:"친구와 놀이 중",
      COMPETE:"승부 활동 중",REST:"쉬는 중",EAT:"식사 중",SHARE:"음식을 나누는 중",CLEAN:"정리 중",SEEK:"친구에게 다가가는 중",
      REJECTED:"함께하지 못해 머뭇거리는 중",ARGUE:"친구와 말다툼 중",SHOVE:"거친 몸짓이 나온 상태",HURT:"뒤로 물러난 상태",
      WATCH:"친구들 상황을 지켜보는 중",HELP_PEER:"친구를 도우러 가는 중",ATTEND:"수업을 듣고 있음",PAIR_WORK:"짝과 과제를 함께 확인 중",RAISE_HAND:"손을 들고 답할 준비 중",PRESENT:"학급 앞에서 발표 중",
      BORROW_ITEM:"친구에게 준비물을 빌리는 중",LOOK_OUTSIDE:"창밖을 보고 있음",STRETCH:"몸을 풀고 있음",DRINK_WATER:"물을 마시는 중",DROP_ITEM:"떨어진 물건을 줍는 중",COMFORT:"친구 곁에서 위로하는 중",
      TEASE:"친구를 놀리는 중",EXCLUDE_TARGET:"친구를 놀이에서 밀어내는 중",TAKE_ITEM_FORCE:"친구 물건을 억지로 가져가려는 중",THREATEN:"친구를 위협하는 중",HIT:"거친 신체행동이 나온 상태",
      REFUSE_INSTRUCTION:"교사 안내를 거부하고 있음",SHOUT_TEACHER:"교사에게 큰소리로 반발 중",INSULT_TEACHER:"교사에게 모욕적인 말을 한 상태",THROW_AT_TEACHER:"교사 쪽으로 물건을 던진 상태",
      ASK_BATHROOM:"화장실에 가고 싶어 함",PASS_NOTE:"친구에게 쪽지를 건네는 중",DEFEND_PEER:"친구를 보호하려 다가가는 중",REPORT_INCIDENT:"교사에게 상황을 알리려는 중"
    };
    return s.moving?"이동 중":(map[s.action]||"주변을 살피는 중");
  }
  function observationText(s){
    var target=studentById(s.socialTarget);
    if(s.intent)return "행동으로 넘어가기 전의 작은 전조가 보인다.";
    if(s.action==="SEEK"&&target)return target.name+" 쪽으로 계속 시선과 몸이 향한다.";
    if(s.action==="HELP_PEER"&&target)return target.name+"에게 다가가 도와주려는 모습이다.";
    if(s.action==="ARGUE"&&target)return target.name+"과(와) 서로 물러서지 않고 있다.";
    if(isSevereAction(s))return target?target.name+"에게 향한 행동의 강도가 높아 즉시 안전 확인이 필요하다.":"교사를 향한 행동의 강도가 높아 수업보다 안전과 진정이 우선이다.";
    if(s.action==="TEASE"&&target)return target.name+"의 반응을 보면서도 놀림을 이어가고 있다.";
    if(s.action==="REFUSE_INSTRUCTION")return "단순 산만함보다 교사의 안내 자체에 반발하고 있다.";
    if(s.action==="REJECTED")return "친구에게 다가간 뒤 잠시 혼자 머뭇거리고 있다.";
    if(s.action==="HELP")return "문제를 보다가 손을 들고 교사 쪽을 살핀다.";
    if(s.action==="TALK")return "몸과 시선이 가까운 친구 쪽으로 향해 있다.";
    if(s.action==="SLEEP")return "고개가 자꾸 아래로 떨어진다.";
    if(s.action==="RUN")return "주변보다 빠르게 이동하고 있다.";
    if(s.action==="COMPETE")return "승부 상황에 강하게 몰입하고 있다.";
    if(s.roleUntil>gameSec)return "맡은 역할을 의식해 주변 학생과 정리를 자주 살핀다.";
    return "현재 몸짓과 시선에서 특별한 이상은 크게 보이지 않는다.";
  }
  function renderTeacherBusy(){
    var busy=teacherIsBusy();
    var el=q("#teacherBusy"),fill=q("#teacherBusyFill"),txt=q("#teacherBusyText");
    q("#teacher").classList.toggle("busy",busy);
    if(!busy){
      txt.textContent="지금 개입 가능";fill.style.width="0%";return;
    }
    var action=actionById(teacherTask.actionId);
    var target=teacherTask.targetId===null?null:studentById(teacherTask.targetId);
    var done=clamp((gameSec-teacherTask.start)/teacherTask.duration);
    txt.textContent=(target?target.name+" · ":"")+(action?action.label:(teacherTask.label||"교사 행동"))+" 중";
    fill.style.width=(done*100)+"%";
  }
  function renderActionPanel(s){
    qa("#actionTabs button").forEach(function(b){b.classList.toggle("active",b.dataset.category===activeActionCategory)});
    var actions=availableActions(s,activeActionCategory);
    var wrap=q("#contextActions");
    if(!actions.length){
      wrap.innerHTML='<div class="action-empty">지금 이 상황에서 사용할 행동이 없습니다.</div>';
      q("#actionDetail").textContent="다른 범주를 보거나 상황을 조금 더 관찰해 보세요.";
      return;
    }
    wrap.innerHTML="";
    actions.forEach(function(a){
      var b=document.createElement("button");b.type="button";b.className="context-action"+(a.recommended&&a.recommended(s)?" recommended":"");
      b.disabled=teacherIsBusy();
      var cost=a.mode?"두 학생 선택":(a.duration+"초");
      b.innerHTML="<strong>"+a.label+"</strong><span class=\"cost\">"+cost+"</span><small>"+a.desc+"</small>";
      b.addEventListener("click",function(){executeTeacherAction(a.id)});
      b.addEventListener("mouseenter",function(){q("#actionDetail").textContent=a.label+" · "+a.desc});
      b.addEventListener("focus",function(){q("#actionDetail").textContent=a.label+" · "+a.desc});
      wrap.appendChild(b);
    });
    q("#actionDetail").textContent=teacherIsBusy()?"교사가 다른 행동을 수행 중입니다. 그동안 학생들의 상황은 계속 변합니다.":"테두리가 강조된 행동은 현재 상황과 비교적 잘 맞는 선택입니다. 정답을 뜻하지는 않습니다.";
  }
  function renderPanel(){
    var s=studentById(selected);
    if(!s){
      q("#studentName").textContent="학급 운영";
      q("#studentSummary").textContent="학생을 선택하지 않으면 현재 공간 전체에 할 수 있는 행동이 나타납니다.";
      q("#studentState").textContent=SCENE_NAME[teacherScene]+" 전체 관찰";
      q("#memory").textContent="개별 학생을 선택하면 행동 원인과 관계 상황에 맞는 개별 행동으로 바뀝니다.";
      renderTeacherBusy();renderActionPanel(null);return;
    }
    q("#studentName").textContent=s.name;q("#studentState").textContent=humanAction(s);
    q("#studentSummary").textContent=connectMode?"함께 해볼 두 번째 학생을 선택하세요.":swapMode?"자리를 바꿀 두 번째 학생을 선택하세요.":observationText(s);
    var notes=[];
    if(s.memory.length)notes.push("최근 관찰: "+s.memory[0].text);
    if(s.observedWork)notes.push("과제 풀이 과정 확인됨");
    if(s.observation>=1){
      if(s.moveNeed>.38)notes.push("관찰 단서: 오래 앉아 있을수록 몸 움직임이 커짐");
      if(s.socialNeed>.38)notes.push("관찰 단서: 또래 쪽으로 시선과 접근이 자주 향함");
      if(s.frustration>.34)notes.push("관찰 단서: 막히거나 거절된 뒤 감정이 오래 남는 편");
    }
    if(s.observedWork&&s.skill<.45)notes.push("학습 단서: 현재 과제의 기초 단계부터 다시 확인할 필요가 있어 보임");
    if(s.roleUntil>gameSec)notes.push("현재 역할을 맡고 있음");
    var pair=activePair(s);if(pair)notes.push(pair.name+"와 함께 해보도록 연결된 상태");
    var conflict=conflictPartner(s);if(conflict)notes.push(conflict.name+"와 감정이 남아 있음");
    var circle=circleOf(s);
    if(circle){
      var names=circle.members.map(studentById).filter(Boolean).map(function(x){return x.name}).join("·");
      notes.push("자주 어울리는 무리: "+names+" / "+circle.label);
    }
    q("#memory").textContent=notes.join(" · ")||"최근에 특별히 기록된 일 없음";
    renderTeacherBusy();renderActionPanel(s);
  }
  function renderFeed(){
    var list=feed.filter(function(e){return e.scene===teacherScene}).slice(0,8);
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
  function recommendedInstruction(id){
    var h=lessonState.history.map(function(x){return x.id});
    if(id==="explain")return h.length===0;
    if(id==="question")return ["explain","demo"].indexOf(lessonState.phase)>=0;
    if(id==="demo")return lessonState.phase==="explain";
    if(id==="individual")return ["explain","demo","question"].indexOf(lessonState.phase)>=0;
    if(id==="pair")return lessonState.phase==="individual"&&students.some(function(s){return s.socialNeed>.26});
    if(id==="presentation")return ["individual","pair"].indexOf(lessonState.phase)>=0;
    if(id==="closure")return (gameMinute()>=current().end-7)&&lessonState.phase!=="closure";
    return false;
  }
  function renderLessonFlow(){
    var box=q("#lessonFlow");
    if(current().kind!=="lesson"){
      box.hidden=true;return;
    }
    box.hidden=false;
    var phase=currentPhase();
    q("#lessonPhaseName").textContent=phase.label;
    q("#lessonPhaseDesc").textContent=phase.desc;
    var elapsed=Math.max(0,Math.floor(gameSec-lessonState.phaseStart));
    q("#lessonPhaseTimer").textContent=Math.floor(elapsed/60)+"분 "+String(elapsed%60).padStart(2,"0")+"초";
    var wrap=q("#instructionActions");wrap.innerHTML="";
    Object.keys(INSTRUCTION_ACTIONS).forEach(function(id){
      var a=INSTRUCTION_ACTIONS[id],b=document.createElement("button");b.type="button";
      b.className="instruction-action"+(lessonState.phase===a.phase?" current":"")+(recommendedInstruction(id)?" recommended":"");
      b.disabled=teacherIsBusy()||teacherScene!==current().loc;
      b.innerHTML="<strong>"+a.label+"</strong><small>"+a.duration+"초 · "+a.desc+"</small>";
      b.addEventListener("click",function(){if(!teacherIsBusy())startTeacherTask(a,null)});
      wrap.appendChild(b);
    });
    q("#lessonHistory").innerHTML=lessonState.history.length?lessonState.history.map(function(h,i){
      return '<span class="lesson-chip '+(i===lessonState.history.length-1?"active":"")+'">'+fmtMin(h.time)+" "+h.label+"</span>";
    }).join(""):'<span class="lesson-chip active">수업 행동을 선택하세요</span>';
  }

  function renderHeader(){
    var p=current();
    q("#time").textContent=fmtMin(gameMinute());q("#periodName").textContent=p.name;
    q("#periodDesc").textContent=p.kind==="lesson"?"학생의 몸짓·학습·관계를 보며 수업을 운영하세요.":p.kind==="break"?"아이들이 친구를 찾아가거나 혼자 머무르며 관계가 움직입니다.":p.kind==="lunch"?"급식실에서는 자리·친구·나눔 행동이 드러납니다.":p.kind==="lunchplay"?"아이들이 원하는 공간과 친구를 찾아 움직입니다.":"하루 일과를 준비하거나 정리하는 시간입니다.";
    q("#locationName").textContent=SCENE_NAME[teacherScene];
    q("#progress").style.width=(clamp((gameSec/60-p.start)/(p.end-p.start))*100)+"%";
  }
  function render(){
    renderHeader();renderLessonFlow();renderProps();renderStudents();renderSceneNav();renderSchedule();renderPanel();renderFeed();
    q("#teacher").style.left=teacher.x+"%";q("#teacher").style.top=teacher.y+"%";
  }
  function openScene(scene){
    if(teacherIsBusy()){log("지금은 교사 행동을 수행 중이라 다른 공간으로 바로 이동할 수 없다.","teacher",teacherScene);return}
    teacherScene=scene;teacher.x=50;teacher.y=18;selected=null;connectMode=false;swapMode=false;
    log("선생님이 "+SCENE_NAME[scene]+" 쪽으로 이동했다.","teacher",scene);render();
  }
  function reset(){
    gameSec=520*60;periodIndex=0;running=true;selected=null;swapMode=false;connectMode=false;activeActionCategory="observe";teacherTask=null;teacherScene="classroom";teacher.x=50;teacher.y=22;feed=[];reportOpen=false;
    resetRelations();resetStudents();rebuildSocialCircles();newStats();assignPeriodDestinations();q("#report").hidden=true;
    log("학생들이 하나둘 교실로 들어오기 시작했다.","ambient","classroom");render();
  }

  function loop(now){
    if(!document.body.contains(app))return;
    var dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
    if(running&&!reportOpen){
      var speed=Number(q("#speed").value)||1;
      gameSec+=dt*10*speed;
      if(handlePeriodChange()){
        updateTransit();updateTeacherTask();updateSocialTracking();updateMovement(dt,speed);
        aiAccumulator+=dt*speed;renderAccumulator+=dt;
        if(aiAccumulator>=.55){
          aiAccumulator=0;
          students.forEach(updateStudent);sampleStats();
          circleAccumulator+=.55*speed;
          if(circleAccumulator>=7){circleAccumulator=0;rebuildSocialCircles();}
        }
        if(renderAccumulator>=.10){renderAccumulator=0;render()}
      }
    }
    requestAnimationFrame(loop);
  }

  q("#pause").addEventListener("click",function(){running=!running;this.textContent=running?"일시정지":"계속하기"});
  qa("#actionTabs button").forEach(function(b){
    b.addEventListener("click",function(){
      activeActionCategory=this.dataset.category;
      renderPanel();
    });
  });
  q("#showReport").addEventListener("click",function(){
    if(current().kind==="lesson")openReport(true);
    else{
      var next=-1;for(var i=periodIndex+1;i<schedule.length;i++){if(schedule[i].kind==="lesson"){next=i;break}}
      if(next>=0){periodIndex=next;gameSec=schedule[next].start*60;teacherTask=null;newStats();assignPeriodDestinations();render();log(current().name+"으로 이동했다.","ambient",teacherScene)}
    }
  });
  q("#continueBtn").addEventListener("click",nextPeriod);
  q("#reset").addEventListener("click",reset);
  qa(".scene-nav button").forEach(function(b){b.addEventListener("click",function(){openScene(this.dataset.scene)})});

  reset();
  requestAnimationFrame(loop);
})();