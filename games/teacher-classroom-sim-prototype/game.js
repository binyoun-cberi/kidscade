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
        pairWith:null,pairUntil:0,role:null,roleUntil:0,correctionLoad:0
      });
    });
  }
  function newStats(){
    stats={
      events:[],fitSamples:[],engageSamples:[],learningStart:students.map(function(s){return s.skill}),
      teacherActs:0,disruptions:0,helped:0,praises:0,lateTicks:0,
      conflicts:0,reconciled:0,connections:0,roles:0
    };
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
  function lessonFit(s){
    var p=current(),mode=q("#lesson").value;
    if(p.subject==="체육")return .62*s.move+.23*s.soc+.15*s.compete;
    if(p.subject==="미술")return .55*s.hands+.45*s.visual;
    if(mode==="hands")return s.hands;
    if(mode==="pair")return s.soc;
    if(mode==="quiz")return .45*s.verbal+.30*s.soc+.25*s.persist;
    return .55*s.verbal+.45*s.persist;
  }
  function nearbyStudents(s,maxDist){
    return students.filter(function(o){return o!==s&&o.scene===s.scene&&!o.targetScene&&distance(s,o)<=maxDist});
  }
  function chooseSocialTarget(s,purpose){
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
    if(Math.random()<joinAcceptance(s,target))acceptJoin(s,target,goal);
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

  function startAction(s,a,target){
    s.action=a;s.actionTicks=rand(2.5,6);
    if(target){s.socialTarget=target.id}
    var p=target||chooseSocialTarget(s,a==="COMPETE"?"COMPETE":"SOCIAL");

    if(a==="TALK"){
      s.talkNeed=clamp(s.talkNeed-.15);s.socialNeed=clamp(s.socialNeed-.08);
      if(current().kind==="lesson"&&q("#lesson").value!=="pair"){
        stats.disruptions++;
        if(Math.random()<.48)log(s.name+"이(가) "+(p?p.name+"에게":"옆자리 쪽으로")+" 말을 걸기 시작했다.","incident",s.scene);
      }else if(p){
        changeRelation(s,p,{affinity:.005,irritation:-.003});
        if(Math.random()<.25)log(s.name+"와 "+p.name+"이(가) 이야기를 나누고 있다.","social",s.scene);
      }
    }
    if(a==="MOVE"&&current().kind==="lesson"&&Math.random()<.40){stats.disruptions++;log(s.name+"이(가) 몸을 크게 움직여 주변의 시선을 끌었다.","incident",s.scene)}
    if(a==="SLEEP")log(s.name+"이(가) 점점 고개를 떨구기 시작했다.","incident",s.scene);
    if(a==="HELP")log(s.name+"이(가) 문제에서 막혀 도움을 기다리고 있다.","learning",s.scene);

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

    var fit=lessonFit(s),near=teacherNear(s),hard=clamp(.70-s.skill+.16),target=chooseSocialTarget(s,"SOCIAL");
    var roleActive=s.roleUntil>gameSec;
    var vals={
      WORK:.38+s.persist*.25+s.focus*.25+fit*.22+(roleActive?.06:0),
      TALK:s.talkNeed*.42+s.soc*.22+s.imp*.16+(target?relation(s,target).affinity*.18:0)-near*s.trust*.48+(1-fit)*.14+rand(-.035,.035),
      DOODLE:s.boredom*.50+s.imp*.12+(1-fit)*.22-near*.20+rand(-.03,.03),
      HELP:s.helpNeed*.48+hard*.38+s.persist*.08+near*.08,
      SLEEP:s.sleepNeed*.64+(1-s.energy)*.25-near*.18,
      MOVE:s.moveNeed*.57+s.move*.22+s.imp*.15-near*.36+rand(-.03,.03)
    };

    var helpTarget=roleActive?chooseSocialTarget(s,"HELP"):null;
    if(roleActive&&helpTarget&&helpTarget.helpNeed>.18)vals.HELP_PEER=.37+s.helpful*.32+helpTarget.helpNeed*.28-near*.02;

    if(current().subject==="체육"){
      var rival=chooseSocialTarget(s,"COMPETE");
      vals.PLAY=.42+s.move*.30+s.energy*.18+s.soc*.10;
      vals.COMPETE=.25+s.compete*.38+s.soc*.14+s.energy*.12+(rival?relation(s,rival).rivalry*.12:0);
      vals.REST=.16+(1-s.energy)*.45;
      vals.WORK=-1;vals.DOODLE=-1;vals.HELP=-1;vals.HELP_PEER=-1;
    }

    var best=Object.keys(vals)[0];
    Object.keys(vals).forEach(function(k){if(vals[k]>vals[best])best=k});
    if(best!=="WORK"&&vals[best]>.54){
      if(s.intent===best)s.intentTicks++;else{s.intent=best;s.intentTicks=1}
      if(s.intentTicks>=2){
        if(best==="HELP_PEER")beginPeerHelp(s,helpTarget);
        else if((best==="PLAY"||best==="COMPETE")&&target&&distance(s,target)>11)beginSeek(s,best==="COMPETE"?chooseSocialTarget(s,"COMPETE"):target,best);
        else startAction(s,best,best==="COMPETE"?chooseSocialTarget(s,"COMPETE"):target);
        s.intent=null;s.intentTicks=0;
      }
    }else{
      s.intent=null;s.intentTicks=0;
      if(s.actionTicks<=0)s.action=current().subject==="체육"?"PLAY":"WORK";
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
      choices=[["READ",.36+s.persist*.28+circleNormBoost(s,"READ")],["TALK",.18+s.soc*.35+circleNormBoost(s,"TALK")],["WALK",.10+s.move*.20]];
    }else if(p.kind==="break"){
      if(s.scene==="hallway")choices=[["WALK",.20],["RUN",.08+s.move*.35+s.imp*.18+circleNormBoost(s,"RUN")],["TALK",.16+s.soc*.38+circleNormBoost(s,"TALK")],["WAIT",.12]];
      else choices=[["READ",.16+s.persist*.22+circleNormBoost(s,"READ")],["TALK",.18+s.soc*.38+circleNormBoost(s,"TALK")],["DOODLE",.12+s.visual*.22],["WALK",.09+s.move*.18]];
    }else if(p.kind==="lunch"){
      choices=[["EAT",.45],["TALK",.12+s.soc*.30+circleNormBoost(s,"TALK")],["SHARE",.05+s.soc*.16+circleNormBoost(s,"SHARE")],["WAIT",.08]];
    }else if(p.kind==="lunchplay"){
      if(s.scene==="playground")choices=[["PLAY",.20+s.move*.35+s.soc*.12+circleNormBoost(s,"PLAY")],["COMPETE",.08+s.compete*.30+circleNormBoost(s,"COMPETE")],["RUN",.10+s.move*.25+circleNormBoost(s,"RUN")],["TALK",.12+s.soc*.28+circleNormBoost(s,"TALK")],["REST",.12+(1-s.energy)*.25]];
      else choices=[["TALK",.16+s.soc*.36+circleNormBoost(s,"TALK")],["READ",.14+s.persist*.18+circleNormBoost(s,"READ")],["WALK",.12+s.move*.22]];
    }else if(p.kind==="closing"){
      choices=[["CLEAN",.42+s.persist*.15+circleNormBoost(s,"CLEAN")],["TALK",.12+s.soc*.24+circleNormBoost(s,"TALK")],["WALK",.10+s.move*.14]];
    }

    if(!choices.length){s.action="WAIT";s.actionTicks=2;return}
    var total=choices.reduce(function(a,c){return a+c[1]},0),r=Math.random()*total,chosen=choices[0][0];
    for(var i=0;i<choices.length;i++){r-=choices[i][1];if(r<=0){chosen=choices[i][0];break}}

    var target=null;
    if(["TALK","PLAY","SHARE"].indexOf(chosen)>=0)target=chooseSocialTarget(s,"SOCIAL");
    if(chosen==="COMPETE")target=chooseSocialTarget(s,"COMPETE");

    if(target&&["TALK","PLAY","COMPETE"].indexOf(chosen)>=0&&distance(s,target)>10){beginSeek(s,target,chosen);return}
    startAction(s,chosen,target);
    if(["WALK","RUN"].indexOf(chosen)>=0)setDestination(s,s.scene,true);
  }

  function updateStudent(s){
    if(s.actionTicks>0)s.actionTicks-=.6;

    s.frustration=clamp(s.frustration-.006);
    s.correctionLoad=clamp(s.correctionLoad-.004);
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
        if(o.action==="ARGUE"||o.action==="SHOVE"){s.focus=clamp(s.focus-.012);s.mood=clamp(s.mood-.008)}
      });

      if(s.action==="WORK"&&s.scene===current().loc){
        s.focus=clamp(s.focus+.009*fit-.006*s.boredom);
        var gain=.00155*fit*s.focus;s.skill=clamp(s.skill+gain);s.learned+=gain;
      }else if(s.action==="TALK"){s.focus=clamp(s.focus-.03)}
      else if(s.action==="DOODLE"){s.boredom=clamp(s.boredom-.09);s.focus=clamp(s.focus-.018)}
      else if(s.action==="SLEEP"){s.focus=clamp(s.focus-.03);s.sleepNeed=clamp(s.sleepNeed-.07)}
      else if(s.action==="MOVE"){s.moveNeed=clamp(s.moveNeed-.10);s.focus=clamp(s.focus-.015)}

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
      if(["SEEK","HELP_PEER","ARGUE"].indexOf(s.action)>=0)setNear(s,target,s.action==="ARGUE"?5:7);
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
    return ["TALK","DOODLE","SLEEP","MOVE","RUN","REJECTED"].indexOf(s.action)>=0;
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
  function finishTeacherTask(){
    if(!teacherTask)return;
    var task=teacherTask;
    teacherTask=null;
    var action=TEACHER_ACTIONS[task.actionId]||CLASS_ACTIONS[task.actionId];
    var s=task.targetId===null?null:studentById(task.targetId);
    if(s&&s.scene!==task.scene){
      log((s?s.name+"의 ":"")+"상황이 바뀌어 교사 행동이 중간에 끊겼다.","teacher",task.scene);
      render();return;
    }
    if(action){
      stats.teacherActs++;
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
    log((s?s.name+"에게 ":"")+action.label+"을(를) 시작했다.","teacher",teacherScene);
    render();
  }
  function consumeTeacherTime(label,duration){
    if(teacherIsBusy())return false;
    teacherTask={actionId:null,targetId:null,start:gameSec,end:gameSec+duration,duration:duration,multiplier:1,label:label};
    return true;
  }

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
    var design=Math.round(fitAvg*100);
    var engage=Math.round(engAvg*100);
    var learning=Math.round(Math.min(100,52+gain*3500+stats.helped*3));
    var latenessPenalty=Math.min(14,stats.lateTicks*.22);
    var conflictPenalty=Math.min(18,stats.conflicts*5);
    var recoveryBonus=Math.min(10,stats.reconciled*4);
    var climate=Math.round(clamp((92-stats.disruptions*7-latenessPenalty-conflictPenalty+recoveryBonus+Math.min(8,stats.teacherActs*.9))/100)*100);
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
    var events=stats.events.filter(function(e){return e.type!=="ambient"}).slice(-10);
    q("#incidentList").innerHTML=events.length?events.map(function(e){return "<li><strong>"+e.stamp+"</strong> ["+SCENE_NAME[e.scene]+"] "+e.text+"</li>"}).join(""):"<li>큰 사건 없이 수업이 진행되었다.</li>";
    var findings=[];
    students.filter(function(s){return s.focus<.48}).sort(function(a,b){return a.focus-b.focus}).slice(0,2).forEach(function(s){findings.push(s.name+"은(는) 이번 시간에 집중을 오래 유지하지 못했다.")});
    var support=students.slice().sort(function(a,b){return a.skill-b.skill})[0];
    if(support)findings.push(support.name+"은(는) 현재 개념을 추가로 확인할 필요가 있어 보인다.");
    var isolated=students.slice().sort(function(a,b){return a.belonging-b.belonging})[0];
    if(isolated&&isolated.belonging<.53)findings.push(isolated.name+"은(는) 또래 활동에서 소속감이 낮아진 모습이 보였다.");
    if(stats.conflicts) findings.push("수업 중 또래 갈등 "+stats.conflicts+"건이 행동과 집중에 영향을 주었다.");
    if(stats.reconciled) findings.push("교사 중재로 "+stats.reconciled+"건의 갈등이 비교적 안정적으로 정리되었다.");
    if(stats.roles) findings.push("역할을 맡긴 학생의 행동 방향이 도움·정리 쪽으로 바뀌는 장면이 있었다.");
    if(stats.connections) findings.push("교사가 연결한 또래 관계가 이후 상호작용의 기회를 만들었다.");
    if(stats.helped>0)findings.push("개별 힌트를 받은 학생에게 즉각적인 학습 회복이 나타났다.");
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
    newStats();assignPeriodDestinations();running=true;selected=null;connectMode=false;
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
      periodIndex=idx;newStats();assignPeriodDestinations();selected=null;connectMode=false;
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
      WATCH:"stand",HELP_PEER:"hold1"
    };
    return map[s.action]||"stand";
  }
  function actionClass(s){
    var a=s.action.toLowerCase();if(s.moving)a="walk";return a;
  }
  function seated(s){
    if(s.scene!=="classroom")return false;
    return ["WORK","READ","TALK","DOODLE","HELP","SLEEP"].indexOf(s.action)>=0&&current().kind!=="closing";
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
      WATCH:"친구들 상황을 지켜보는 중",HELP_PEER:"친구를 도우러 가는 중"
    };
    return s.moving?"이동 중":(map[s.action]||"주변을 살피는 중");
  }
  function observationText(s){
    var target=studentById(s.socialTarget);
    if(s.intent)return "행동으로 넘어가기 전의 작은 전조가 보인다.";
    if(s.action==="SEEK"&&target)return target.name+" 쪽으로 계속 시선과 몸이 향한다.";
    if(s.action==="HELP_PEER"&&target)return target.name+"에게 다가가 도와주려는 모습이다.";
    if(s.action==="ARGUE"&&target)return target.name+"과(와) 서로 물러서지 않고 있다.";
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
    var action=TEACHER_ACTIONS[teacherTask.actionId]||CLASS_ACTIONS[teacherTask.actionId];
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
  function renderHeader(){
    var p=current();
    q("#time").textContent=fmtMin(gameMinute());q("#periodName").textContent=p.name;
    q("#periodDesc").textContent=p.kind==="lesson"?"학생의 몸짓·학습·관계를 보며 수업을 운영하세요.":p.kind==="break"?"아이들이 친구를 찾아가거나 혼자 머무르며 관계가 움직입니다.":p.kind==="lunch"?"급식실에서는 자리·친구·나눔 행동이 드러납니다.":p.kind==="lunchplay"?"아이들이 원하는 공간과 친구를 찾아 움직입니다.":"하루 일과를 준비하거나 정리하는 시간입니다.";
    q("#locationName").textContent=SCENE_NAME[teacherScene];
    q("#progress").style.width=(clamp((gameSec/60-p.start)/(p.end-p.start))*100)+"%";
  }
  function render(){
    renderHeader();renderProps();renderStudents();renderSceneNav();renderSchedule();renderPanel();renderFeed();
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
  q("#lesson").addEventListener("change",function(){log("수업 방식을 "+this.selectedOptions[0].textContent+"로 조정했다.","teacher",teacherScene);render()});
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
      if(next>=0){periodIndex=next;gameSec=schedule[next].start*60;newStats();assignPeriodDestinations();render();log(current().name+"으로 이동했다.","ambient",teacherScene)}
    }
  });
  q("#continueBtn").addEventListener("click",nextPeriod);
  q("#reset").addEventListener("click",reset);
  qa(".scene-nav button").forEach(function(b){b.addEventListener("click",function(){openScene(this.dataset.scene)})});

  reset();
  requestAnimationFrame(loop);
})();