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

  var MODULAR_ASSET="../../assets/game/2d/characters/kenney-modular-characters/";
  var SCENES=["classroom","hallway","gym","playground","cafeteria"];
  var SCENE_NAME={classroom:"교실",hallway:"복도",gym:"체육관",playground:"운동장",cafeteria:"급식실"};
  var ACTION_UI={
    explain:{icon:"🗣️",short:"설명",cue:"개념 설명"},question:{icon:"❓",short:"질문",cue:"생각 확인"},demo:{icon:"👆",short:"시범",cue:"직접 보여주기"},individual:{icon:"✏️",short:"개별활동",cue:"혼자 해보기"},pair:{icon:"👥",short:"짝활동",cue:"서로 설명"},presentation:{icon:"🎤",short:"발표",cue:"생각 공유"},closure:{icon:"✅",short:"정리",cue:"핵심 확인"},
    watch:{icon:"👀",short:"지켜보기",cue:"맥락 관찰"},inspectWork:{icon:"📄",short:"활동지 보기",cue:"막힌 곳 확인"},checkQuestion:{icon:"❓",short:"확인 질문",cue:"이해 확인"},probeConcept:{icon:"🧪",short:"한 문제 더",cue:"진단 근거"},hint:{icon:"💡",short:"힌트 주기",cue:"방향만 제시"},firstStep:{icon:"🧩",short:"첫 단계 같이",cue:"시작 돕기"},simplify:{icon:"✂️",short:"작게 나누기",cue:"부담 줄이기"},movementJob:{icon:"🚶",short:"움직임 역할",cue:"에너지 전환"},
    gesture:{icon:"👁️",short:"손짓 신호",cue:"조용한 환기"},proximity:{icon:"👣",short:"가까이 가기",cue:"비언어 지도"},quietCall:{icon:"🗣️",short:"조용히 재안내",cue:"짧은 안내"},redirect:{icon:"↪",short:"할 일 짚기",cue:"행동 재제시"},seatAdjust:{icon:"🪑",short:"자리 바꾸기",cue:"거리 조정"},separate:{icon:"↔️",short:"거리 두기",cue:"감정 낮추기"},chalk:{icon:"⚠️",short:"강한 환기",cue:"즉시 주의"},immediateStop:{icon:"✋",short:"즉시 멈추기",cue:"안전 확보"},checkSafety:{icon:"🛟",short:"안전 확인",cue:"피해 학생 보호"},requestSupport:{icon:"📣",short:"지원 요청",cue:"교직원 도움"},documentIncident:{icon:"📝",short:"사건 기록",cue:"사실 기록"},
    praise:{icon:"⭐",short:"구체적 인정",cue:"좋은 행동 강화"},listen:{icon:"💬",short:"이야기 듣기",cue:"감정 확인"},mediate:{icon:"🤝",short:"갈등 중재",cue:"두 학생 조정"},connectPeer:{icon:"🧑‍🤝‍🧑",short:"친구 연결",cue:"관계 기회"},role:{icon:"🎯",short:"역할 맡기기",cue:"에너지 전환"},circleRole:{icon:"👥",short:"무리 역할",cue:"집단 규범"},
    scanRoom:{icon:"🔎",short:"전체 훑기",cue:"교실 스캔"},microBreak:{icon:"🙆",short:"잠깐 움직이기",cue:"집중 환기"},attentionSignal:{icon:"🔔",short:"전체 집중",cue:"시선 모으기"},classPraise:{icon:"🌟",short:"좋은 흐름 짚기",cue:"학급 강화"}
  };
  function actionUi(id){return ACTION_UI[id]||{icon:"•",short:"행동",cue:"교사 행동"}}

  var schedule=[
    {start:520,end:540,name:"등교·아침활동",loc:"classroom",kind:"morning"},
    {start:540,end:580,name:"1교시 · 수학",loc:"classroom",kind:"lesson",subject:"수학",unit:"받아올림 있는 두 자리 수 덧셈"},
    {start:580,end:590,name:"쉬는시간",loc:"free",kind:"break"},
    {start:590,end:630,name:"2교시 · 국어",loc:"classroom",kind:"lesson",subject:"국어",unit:"글의 중심 내용 찾기"},
    {start:630,end:640,name:"쉬는시간",loc:"free",kind:"break"},
    {start:640,end:680,name:"3교시 · 체육",loc:"gym",kind:"lesson",subject:"체육",unit:"협동 게임과 규칙"},
    {start:680,end:690,name:"쉬는시간",loc:"free",kind:"break"},
    {start:690,end:730,name:"4교시 · 과학",loc:"classroom",kind:"lesson",subject:"과학",unit:"관찰한 사실로 설명하기"},
    {start:730,end:755,name:"점심시간 · 식사",loc:"cafeteria",kind:"lunch"},
    {start:755,end:780,name:"점심시간 · 놀이",loc:"freeLunch",kind:"lunchplay"},
    {start:780,end:820,name:"5교시 · 사회",loc:"classroom",kind:"lesson",subject:"사회",unit:"지도에서 우리 지역 읽기"},
    {start:820,end:830,name:"쉬는시간",loc:"free",kind:"break"},
    {start:830,end:870,name:"6교시 · 미술",loc:"classroom",kind:"lesson",subject:"미술",unit:"재료를 계획해 표현하기"},
    {start:870,end:890,name:"청소·종례",loc:"classroom",kind:"closing"}
  ];

  function makeGridSpots(cols,rows,x0,x1,y0,y1){
    var out=[];
    for(var r=0;r<rows;r++){
      for(var col=0;col<cols;col++){
        out.push({
          x:cols===1?(x0+x1)/2:x0+(x1-x0)*(col/(cols-1)),
          y:rows===1?(y0+y1)/2:y0+(y1-y0)*(r/(rows-1))
        });
      }
    }
    return out;
  }

  // 25 desks, 22 students: three empty desks remain useful for seat changes and separation.
  var seats=makeGridSpots(5,5,15,85,34,88);
  var sceneSpots={
    classroom:seats.concat([{x:8,y:88},{x:92,y:88}]),
    hallway:makeGridSpots(8,3,8,92,38,86),
    gym:makeGridSpots(6,4,15,85,29,84),
    playground:makeGridSpots(6,4,18,82,27,84),
    cafeteria:makeGridSpots(6,4,16,84,35,84)
  };

  var templates=[
    {name:"민수",char:"player",academic:.48,imp:.84,soc:.84,persist:.34,energy:.84,move:.78,hands:.82,visual:.38,verbal:.46,noise:.42,compete:.72,react:.78,empathy:.48,rule:.38,assert:.76,helpful:.45,rejection:.58,reading:.25,sports:.82,creative:.42,mischief:.78},
    {name:"지우",char:"female",academic:.66,imp:.35,soc:.73,persist:.68,energy:.75,move:.38,hands:.63,visual:.70,verbal:.68,noise:.35,compete:.38,react:.38,empathy:.72,rule:.68,assert:.56,helpful:.74,rejection:.48,reading:.66,sports:.45,creative:.58,mischief:.30},
    {name:"서연",char:"female",academic:.84,imp:.18,soc:.36,persist:.91,energy:.72,move:.20,hands:.56,visual:.83,verbal:.81,noise:.28,compete:.54,react:.34,empathy:.78,rule:.82,assert:.44,helpful:.68,rejection:.64,reading:.91,sports:.27,creative:.63,mischief:.12},
    {name:"준호",char:"adventurer",academic:.61,imp:.67,soc:.79,persist:.55,energy:.88,move:.72,hands:.86,visual:.43,verbal:.55,noise:.40,compete:.84,react:.66,empathy:.55,rule:.46,assert:.76,helpful:.50,rejection:.46,reading:.32,sports:.90,creative:.46,mischief:.66},
    {name:"태호",char:"player",academic:.30,imp:.43,soc:.44,persist:.47,energy:.62,move:.42,hands:.90,visual:.76,verbal:.34,noise:.50,compete:.46,react:.58,empathy:.62,rule:.59,assert:.42,helpful:.63,rejection:.72,reading:.54,sports:.43,creative:.78,mischief:.34},
    {name:"유나",char:"female",academic:.73,imp:.29,soc:.59,persist:.74,energy:.49,move:.28,hands:.52,visual:.78,verbal:.72,noise:.33,compete:.31,react:.34,empathy:.80,rule:.74,assert:.48,helpful:.79,rejection:.55,reading:.80,sports:.28,creative:.70,mischief:.18},
    {name:"현우",char:"soldier",academic:.55,imp:.76,soc:.50,persist:.28,energy:.80,move:.91,hands:.93,visual:.34,verbal:.42,noise:.47,compete:.77,react:.80,empathy:.42,rule:.34,assert:.70,helpful:.38,rejection:.45,reading:.20,sports:.94,creative:.33,mischief:.84},
    {name:"소라",char:"adventurer",academic:.44,imp:.22,soc:.42,persist:.84,energy:.74,move:.25,hands:.64,visual:.91,verbal:.62,noise:.61,compete:.29,react:.30,empathy:.76,rule:.79,assert:.38,helpful:.72,rejection:.68,reading:.88,sports:.23,creative:.90,mischief:.16},

    {name:"도윤",char:"soldier",academic:.58,imp:.54,soc:.67,persist:.62,energy:.86,move:.82,hands:.73,visual:.51,verbal:.59,noise:.37,compete:.71,react:.49,empathy:.60,rule:.58,assert:.65,helpful:.58,rejection:.42,reading:.46,sports:.88,creative:.43,mischief:.48},
    {name:"하린",char:"female",academic:.79,imp:.20,soc:.46,persist:.86,energy:.63,move:.23,hands:.55,visual:.82,verbal:.76,noise:.24,compete:.28,react:.31,empathy:.82,rule:.85,assert:.42,helpful:.77,rejection:.57,reading:.92,sports:.22,creative:.76,mischief:.10},
    {name:"예준",char:"player",academic:.70,imp:.60,soc:.62,persist:.69,energy:.82,move:.66,hands:.66,visual:.58,verbal:.65,noise:.38,compete:.88,react:.56,empathy:.53,rule:.57,assert:.79,helpful:.49,rejection:.40,reading:.50,sports:.78,creative:.45,mischief:.49},
    {name:"채원",char:"female",academic:.64,imp:.26,soc:.53,persist:.76,energy:.65,move:.30,hands:.70,visual:.88,verbal:.61,noise:.31,compete:.25,react:.32,empathy:.83,rule:.80,assert:.46,helpful:.81,rejection:.54,reading:.81,sports:.26,creative:.88,mischief:.13},
    {name:"시우",char:"adventurer",academic:.42,imp:.72,soc:.81,persist:.32,energy:.91,move:.87,hands:.78,visual:.42,verbal:.52,noise:.45,compete:.73,react:.69,empathy:.47,rule:.36,assert:.73,helpful:.44,rejection:.44,reading:.24,sports:.92,creative:.40,mischief:.79},
    {name:"다은",char:"female",academic:.68,imp:.24,soc:.57,persist:.80,energy:.58,move:.27,hands:.76,visual:.89,verbal:.64,noise:.29,compete:.26,react:.29,empathy:.86,rule:.82,assert:.41,helpful:.84,rejection:.61,reading:.74,sports:.24,creative:.94,mischief:.11},
    {name:"건우",char:"soldier",academic:.50,imp:.64,soc:.70,persist:.46,energy:.89,move:.85,hands:.82,visual:.48,verbal:.47,noise:.41,compete:.79,react:.61,empathy:.55,rule:.43,assert:.68,helpful:.52,rejection:.43,reading:.31,sports:.91,creative:.39,mischief:.65},
    {name:"아린",char:"female",academic:.57,imp:.31,soc:.35,persist:.73,energy:.57,move:.22,hands:.62,visual:.84,verbal:.59,noise:.52,compete:.22,react:.36,empathy:.79,rule:.75,assert:.34,helpful:.73,rejection:.75,reading:.86,sports:.19,creative:.82,mischief:.12},
    {name:"지호",char:"player",academic:.36,imp:.70,soc:.74,persist:.30,energy:.87,move:.83,hands:.88,visual:.40,verbal:.43,noise:.44,compete:.69,react:.73,empathy:.46,rule:.32,assert:.71,helpful:.41,rejection:.49,reading:.22,sports:.85,creative:.52,mischief:.82},
    {name:"은서",char:"female",academic:.82,imp:.17,soc:.49,persist:.89,energy:.67,move:.21,hands:.67,visual:.79,verbal:.84,noise:.22,compete:.37,react:.26,empathy:.82,rule:.88,assert:.49,helpful:.80,rejection:.55,reading:.93,sports:.21,creative:.72,mischief:.08},
    {name:"윤호",char:"adventurer",academic:.63,imp:.47,soc:.64,persist:.67,energy:.79,move:.61,hands:.60,visual:.55,verbal:.72,noise:.36,compete:.60,react:.45,empathy:.66,rule:.64,assert:.67,helpful:.64,rejection:.45,reading:.61,sports:.70,creative:.49,mischief:.39},
    {name:"나연",char:"female",academic:.52,imp:.33,soc:.68,persist:.55,energy:.61,move:.36,hands:.58,visual:.74,verbal:.77,noise:.34,compete:.29,react:.39,empathy:.88,rule:.70,assert:.58,helpful:.88,rejection:.51,reading:.72,sports:.32,creative:.68,mischief:.20},
    {name:"승민",char:"soldier",academic:.76,imp:.41,soc:.55,persist:.83,energy:.80,move:.58,hands:.69,visual:.62,verbal:.69,noise:.30,compete:.86,react:.42,empathy:.57,rule:.72,assert:.75,helpful:.55,rejection:.38,reading:.58,sports:.76,creative:.40,mischief:.29},
    {name:"세아",char:"female",academic:.46,imp:.28,soc:.40,persist:.65,energy:.60,move:.24,hands:.72,visual:.92,verbal:.52,noise:.58,compete:.20,react:.35,empathy:.81,rule:.76,assert:.36,helpful:.76,rejection:.73,reading:.83,sports:.18,creative:.96,mischief:.10}
  ];

  var relationSeed={
    "민수|지우":{affinity:.88,irritation:.04,rivalry:.18},
    "민수|준호":{affinity:.78,irritation:.08,rivalry:.52},
    "지우|서연":{affinity:.57,irritation:.03,rivalry:.12},
    "준호|현우":{affinity:.71,irritation:.08,rivalry:.58},
    "소라|유나":{affinity:.77,irritation:.02,rivalry:.08},
    "태호|유나":{affinity:.48,irritation:.04,rivalry:.10},
    "민수|태호":{affinity:.26,irritation:.16,rivalry:.30},
    "서연|소라":{affinity:.55,irritation:.02,rivalry:.10},
    "도윤|건우":{affinity:.73,irritation:.05,rivalry:.44},
    "도윤|윤호":{affinity:.62,irritation:.03,rivalry:.31},
    "하린|은서":{affinity:.79,irritation:.02,rivalry:.15},
    "하린|아린":{affinity:.64,irritation:.03,rivalry:.08},
    "채원|다은":{affinity:.82,irritation:.02,rivalry:.07},
    "다은|세아":{affinity:.71,irritation:.02,rivalry:.06},
    "예준|승민":{affinity:.67,irritation:.06,rivalry:.65},
    "시우|건우":{affinity:.72,irritation:.07,rivalry:.50},
    "시우|지호":{affinity:.76,irritation:.09,rivalry:.42},
    "나연|유나":{affinity:.63,irritation:.02,rivalry:.08},
    "나연|지우":{affinity:.60,irritation:.03,rivalry:.09},
    "은서|서연":{affinity:.69,irritation:.02,rivalry:.22}
  };

  var relations={};
  var socialCircles=[];
  var circleByStudent={};
  var circleHistory={};
  var circleAccumulator=0;
  var students=[];
  var studentNodes={};
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
  var teacher={x:50,y:22,dx:50,dy:22,moving:false};
  var stats=null;
  var feed=[];
  var dayEvents=[];
  var incidentRecords=[];
  var periodMemoKeys={};
  var dayIndex=1;
  var dayEnded=false;
  var daySummaries=[];
  var followUpQueue=[];
  var followUpSeq=0;
  var dayEncounterBudget=10;
  var dayEncounterOffered=0;
  var dayFollowUpsShown=0;
  var periodEncounterCounts={};
  var MAX_FOLLOWUPS_PER_DAY=3;
  var encounterHistory=[];
  var pendingEncounter=null;
  var activeEncounter=null;
  var nextEncounterAt=0;
  var encounterSeq=0;
  var encounterWasRunning=true;
  var encounterPointer=null;
  var classMetrics={flow:72,relationship:68,stability:72,trust:64};
  var teacherStyleCounts={up:0,down:0,left:0,right:0};
  var reportOpen=false;
  var reportWasRunning=true;
  var armedActionId=null;
  var armedActionTargetId=null;
  var cardDragActive=false;
  var cardTraySnapshot={targetId:null,ids:[],expiresAt:0,urgent:false};
  var cardRenderSignature="";
  var toolModalKind=null;
  var modalWasRunning=true;
  var lastBellAt=-99999;
  var tutorialState={active:false,step:0};
  var TUTORIAL_KEY="kidscade.teacherSim.tutorial.v19";
  var lastFrame=performance.now();
  var aiAccumulator=0;
  var renderAccumulator=0;
  var GAME_SECONDS_PER_REAL_SECOND=10;
  var AI_STEP_GAME_SECONDS=5.5;
  var GROUP_STEP_GAME_SECONDS=70;

  function pairKey(a,b){return [a,b].sort().join("|")}
  function relation(a,b){
    var k=pairKey(a.name,b.name);
    if(!relations[k]){
      relations[k]={
        affinity:clamp(.18+interestSimilarity(a,b)*.34+deterministicNoise((a.id||0)+(b.id||0),a.name+b.name)*.07,.18,.58),
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
  function fmtDuration(sec){
    if(sec>=60){var m=Math.floor(sec/60),s=Math.round(sec%60);return s?m+"분 "+s+"초":m+"분"}
    return Math.round(sec)+"초";
  }
  var STUDENT_LOOKS={
    "민수":{skin:5,gender:"Man",hairFolder:"black",hairPrefix:"black",hairIndex:2,face:1,shirtFolder:"green",shirtPrefix:"greenShirt",armPrefix:"greenArm",shirtIndex:3,pantsFolder:"blue-1",pantsPrefix:"pantsBlue1",shoeFolder:"brown-1",shoePrefix:"brownShoe"},
    "지우":{skin:2,gender:"Woman",hairFolder:"brown-1",hairPrefix:"brown1",hairIndex:2,face:2,shirtFolder:"blue",shirtPrefix:"blueShirt",armPrefix:"blueArm",shirtIndex:4,pantsFolder:"tan",pantsPrefix:"pantsTan",shoeFolder:"black",shoePrefix:"blackShoe"},
    "서연":{skin:1,gender:"Woman",hairFolder:"black",hairPrefix:"black",hairIndex:3,face:1,shirtFolder:"navy",shirtPrefix:"navyShirt",armPrefix:"navyArm",shirtIndex:2,pantsFolder:"grey",pantsPrefix:"pantsGrey",shoeFolder:"brown-2",shoePrefix:"brown2Shoe"},
    "준호":{skin:4,gender:"Man",hairFolder:"brown-2",hairPrefix:"brown2",hairIndex:2,face:2,shirtFolder:"red",shirtPrefix:"redShirt",armPrefix:"redArm",shirtIndex:3,pantsFolder:"navy",pantsPrefix:"pantsNavy",shoeFolder:"grey",shoePrefix:"greyShoe"},
    "태호":{skin:3,gender:"Man",hairFolder:"tan",hairPrefix:"tan",hairIndex:1,face:1,shirtFolder:"pine",shirtPrefix:"pineShirt",armPrefix:"pineArm",shirtIndex:2,pantsFolder:"brown",pantsPrefix:"pantsBrown",shoeFolder:"blue",shoePrefix:"blueShoe"},
    "유나":{skin:2,gender:"Woman",hairFolder:"red",hairPrefix:"red",hairIndex:2,face:2,shirtFolder:"white",shirtPrefix:"whiteShirt",armPrefix:"armWhite",shirtIndex:3,pantsFolder:"blue-2",pantsPrefix:"pantsBlue2",shoeFolder:"brown-1",shoePrefix:"brownShoe"},
    "현우":{skin:7,gender:"Man",hairFolder:"black",hairPrefix:"black",hairIndex:4,face:1,shirtFolder:"grey",shirtPrefix:"greyShirt",armPrefix:"greyArm",shirtIndex:2,pantsFolder:"green",pantsPrefix:"pantsGreen",shoeFolder:"black",shoePrefix:"blackShoe"},
    "소라":{skin:6,gender:"Woman",hairFolder:"brown-2",hairPrefix:"brown2",hairIndex:1,face:2,shirtFolder:"green",shirtPrefix:"greenShirt",armPrefix:"greenArm",shirtIndex:4,pantsFolder:"light-blue",pantsPrefix:"pantsLightBlue",shoeFolder:"tan",shoePrefix:"tanShoe"},
    "도윤":{skin:4,gender:"Man",hairFolder:"blonde",hairPrefix:"blonde",hairIndex:2,face:1,shirtFolder:"blue",shirtPrefix:"blueShirt",armPrefix:"blueArm",shirtIndex:5,pantsFolder:"grey",pantsPrefix:"pantsGrey",shoeFolder:"red",shoePrefix:"redShoe"},
    "하린":{skin:1,gender:"Woman",hairFolder:"blonde",hairPrefix:"blonde",hairIndex:3,face:2,shirtFolder:"pine",shirtPrefix:"pineShirt",armPrefix:"pineArm",shirtIndex:4,pantsFolder:"navy",pantsPrefix:"pantsNavy",shoeFolder:"brown-2",shoePrefix:"brown2Shoe"},
    "예준":{skin:3,gender:"Man",hairFolder:"brown-1",hairPrefix:"brown1",hairIndex:4,face:1,shirtFolder:"white",shirtPrefix:"whiteShirt",armPrefix:"armWhite",shirtIndex:5,pantsFolder:"blue-1",pantsPrefix:"pantsBlue1",shoeFolder:"black",shoePrefix:"blackShoe"},
    "채원":{skin:2,gender:"Woman",hairFolder:"tan",hairPrefix:"tan",hairIndex:2,face:2,shirtFolder:"red",shirtPrefix:"redShirt",armPrefix:"redArm",shirtIndex:4,pantsFolder:"green",pantsPrefix:"pantsGreen",shoeFolder:"grey",shoePrefix:"greyShoe"},
    "시우":{skin:8,gender:"Man",hairFolder:"black",hairPrefix:"black",hairIndex:1,face:1,shirtFolder:"navy",shirtPrefix:"navyShirt",armPrefix:"navyArm",shirtIndex:5,pantsFolder:"tan",pantsPrefix:"pantsTan",shoeFolder:"blue",shoePrefix:"blueShoe"},
    "다은":{skin:1,gender:"Woman",hairFolder:"brown-1",hairPrefix:"brown1",hairIndex:1,face:2,shirtFolder:"grey",shirtPrefix:"greyShirt",armPrefix:"greyArm",shirtIndex:5,pantsFolder:"red",pantsPrefix:"pantsRed",shoeFolder:"brown-1",shoePrefix:"brownShoe"},
    "건우":{skin:6,gender:"Man",hairFolder:"red",hairPrefix:"red",hairIndex:3,face:1,shirtFolder:"green",shirtPrefix:"greenShirt",armPrefix:"greenArm",shirtIndex:5,pantsFolder:"navy",pantsPrefix:"pantsNavy",shoeFolder:"black",shoePrefix:"blackShoe"},
    "아린":{skin:3,gender:"Woman",hairFolder:"black",hairPrefix:"black",hairIndex:2,face:2,shirtFolder:"blue",shirtPrefix:"blueShirt",armPrefix:"blueArm",shirtIndex:2,pantsFolder:"brown",pantsPrefix:"pantsBrown",shoeFolder:"tan",shoePrefix:"tanShoe"},
    "지호":{skin:5,gender:"Man",hairFolder:"tan",hairPrefix:"tan",hairIndex:3,face:1,shirtFolder:"red",shirtPrefix:"redShirt",armPrefix:"redArm",shirtIndex:5,pantsFolder:"light-blue",pantsPrefix:"pantsLightBlue",shoeFolder:"grey",shoePrefix:"greyShoe"},
    "은서":{skin:2,gender:"Woman",hairFolder:"blonde",hairPrefix:"blonde",hairIndex:1,face:2,shirtFolder:"white",shirtPrefix:"whiteShirt",armPrefix:"armWhite",shirtIndex:2,pantsFolder:"pine",pantsPrefix:"pantsPine",shoeFolder:"brown-2",shoePrefix:"brown2Shoe"},
    "윤호":{skin:4,gender:"Man",hairFolder:"brown-2",hairPrefix:"brown2",hairIndex:4,face:1,shirtFolder:"pine",shirtPrefix:"pineShirt",armPrefix:"pineArm",shirtIndex:5,pantsFolder:"blue-2",pantsPrefix:"pantsBlue2",shoeFolder:"red",shoePrefix:"redShoe"},
    "나연":{skin:3,gender:"Woman",hairFolder:"red",hairPrefix:"red",hairIndex:1,face:2,shirtFolder:"green",shirtPrefix:"greenShirt",armPrefix:"greenArm",shirtIndex:2,pantsFolder:"grey",pantsPrefix:"pantsGrey",shoeFolder:"blue",shoePrefix:"blueShoe"},
    "승민":{skin:7,gender:"Man",hairFolder:"black",hairPrefix:"black",hairIndex:3,face:1,shirtFolder:"grey",shirtPrefix:"greyShirt",armPrefix:"greyArm",shirtIndex:4,pantsFolder:"brown",pantsPrefix:"pantsBrown",shoeFolder:"black",shoePrefix:"blackShoe"},
    "세아":{skin:1,gender:"Woman",hairFolder:"brown-2",hairPrefix:"brown2",hairIndex:3,face:2,shirtFolder:"navy",shirtPrefix:"navyShirt",armPrefix:"navyArm",shirtIndex:3,pantsFolder:"red",pantsPrefix:"pantsRed",shoeFolder:"brown-1",shoePrefix:"brownShoe"}
  };
  function makeLook(t,i){
    var preset=STUDENT_LOOKS[t.name];
    return preset?Object.assign({},preset):Object.assign({},STUDENT_LOOKS["민수"]);
  }

  var TEACHER_LOOK={
    skin:3,gender:"Woman",hairFolder:"brown-1",hairPrefix:"brown1",hairIndex:3,face:1,
    shirtFolder:"red",shirtPrefix:"redShirt",armPrefix:"redArm",shirtIndex:2,
    pantsFolder:"navy",pantsPrefix:"pantsNavy",shoeFolder:"brown-1",shoePrefix:"brownShoe"
  };
  function modularPath(look,part){
    var tint="tint-"+look.skin,prefix="tint"+look.skin;
    if(part==="head"||part==="arm"||part==="hand"||part==="neck"){
      return MODULAR_ASSET+"skin/"+tint+"/"+prefix+"_"+part+".png";
    }
    if(part==="face")return MODULAR_ASSET+"face/completes/face"+look.face+".png";
    if(part==="hair")return MODULAR_ASSET+"hair/"+look.hairFolder+"/"+look.hairPrefix+look.gender+look.hairIndex+".png";
    if(part==="shirt")return MODULAR_ASSET+"shirts/"+look.shirtFolder+"/"+look.shirtPrefix+look.shirtIndex+".png";
    if(part==="sleeve")return MODULAR_ASSET+"shirts/"+look.shirtFolder+"/"+look.armPrefix+"_shorter.png";
    if(part==="pants")return MODULAR_ASSET+"pants/"+look.pantsFolder+"/"+look.pantsPrefix+"1.png";
    if(part==="leg")return MODULAR_ASSET+"pants/"+look.pantsFolder+"/"+look.pantsPrefix+"_long.png";
    if(part==="shoe")return MODULAR_ASSET+"shoes/"+look.shoeFolder+"/"+look.shoePrefix+"1.png";
    return "";
  }
  function modularImg(look,part,cls){
    var img=document.createElement("img");
    img.className="mod-part "+(cls||part);
    img.alt="";
    img.src=modularPath(look,part);
    img.onerror=function(){this.style.display="none"};
    return img;
  }
  function appendUpperBody(rig,look){
    rig.appendChild(modularImg(look,"neck","neck"));
    rig.appendChild(modularImg(look,"shirt","shirt"));
    ["left","right"].forEach(function(side){
      var arm=document.createElement("span");arm.className="mod-arm "+side;
      arm.appendChild(modularImg(look,"arm","skin-arm"));
      arm.appendChild(modularImg(look,"sleeve","sleeve"));
      arm.appendChild(modularImg(look,"hand","hand"));
      rig.appendChild(arm);
    });
    rig.appendChild(modularImg(look,"hair","hair-back"));
    rig.appendChild(modularImg(look,"head","head"));
    rig.appendChild(modularImg(look,"face","face"));
    rig.appendChild(modularImg(look,"hair","hair-front"));
  }
  function createStandingAvatar(look){
    var rig=document.createElement("span");rig.className="modular-avatar standing-rig";
    var leftLeg=document.createElement("span");leftLeg.className="mod-leg left";
    leftLeg.appendChild(modularImg(look,"leg","leg-img"));leftLeg.appendChild(modularImg(look,"shoe","shoe"));
    var rightLeg=document.createElement("span");rightLeg.className="mod-leg right";
    rightLeg.appendChild(modularImg(look,"leg","leg-img"));rightLeg.appendChild(modularImg(look,"shoe","shoe"));
    rig.appendChild(leftLeg);rig.appendChild(rightLeg);
    rig.appendChild(modularImg(look,"pants","pants"));
    appendUpperBody(rig,look);
    return rig;
  }
  function createSeatedAvatar(look){
    var rig=document.createElement("span");rig.className="modular-avatar seated-rig";
    var lap=document.createElement("span");lap.className="seated-lap";
    lap.appendChild(modularImg(look,"pants","pants"));
    rig.appendChild(lap);
    appendUpperBody(rig,look);
    return rig;
  }
  function createModularAvatar(look,mode){
    return mode==="seated"?createSeatedAvatar(look):createStandingAvatar(look);
  }
  function studentById(id){return students.find(function(s){return s.id===id})||null}
  function studentByName(name){return students.find(function(s){return s.name===name})||null}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function activePair(s){
    return s.pairWith!==null&&s.pairUntil>gameSec?studentById(s.pairWith):null;
  }
  function groupMembers(groupId){
    return groupId?students.filter(function(s){return s.groupId===groupId}):[];
  }

  var SUBJECT_MODELS={
    "수학":{
      focus:"regrouping",
      concepts:{
        placeValue:{label:"자릿값",error:"십의 자리와 일의 자리 값을 섞어 계산하는 모습"},
        regrouping:{label:"받아올림",error:"일의 자리에서 생긴 받아올림을 다음 자리에 연결하지 못하는 모습"},
        procedure:{label:"계산 절차",error:"부분 계산 결과를 이어 붙이거나 계산 순서가 흔들리는 모습"},
        wordProblem:{label:"문장제 이해",error:"문제 상황에서 어떤 연산을 써야 하는지 결정하기 어려워하는 모습"}
      }
    },
    "국어":{
      focus:"mainIdea",
      concepts:{
        fluency:{label:"읽기 유창성",error:"문장을 여러 번 다시 읽거나 읽던 줄을 놓치는 모습"},
        vocabulary:{label:"낱말 의미",error:"핵심 낱말의 뜻을 문맥과 다르게 이해하는 모습"},
        mainIdea:{label:"중심 내용",error:"세부 사실은 찾지만 글 전체의 중심 내용을 고르기 어려워하는 모습"},
        evidence:{label:"근거 찾기",error:"답은 말하지만 글 속 근거를 다시 찾기 어려워하는 모습"}
      }
    },
    "과학":{
      focus:"evidence",
      concepts:{
        observation:{label:"관찰 사실",error:"직접 본 사실과 자신의 추측을 섞어 말하는 모습"},
        concept:{label:"과학 개념",error:"관찰 결과는 말하지만 배운 개념과 연결하기 어려워하는 모습"},
        evidence:{label:"근거 사용",error:"설명에 필요한 관찰 근거를 빠뜨리는 모습"},
        explanation:{label:"설명 구성",error:"원인과 결과의 순서를 바꾸거나 설명을 끝까지 연결하기 어려워하는 모습"}
      }
    },
    "사회":{
      focus:"mapReading",
      concepts:{
        vocabulary:{label:"사회 낱말",error:"방위·축척·기호 같은 낱말의 의미를 혼동하는 모습"},
        mapReading:{label:"지도 읽기",error:"지도 기호나 방향 정보를 실제 위치와 연결하기 어려워하는 모습"},
        causeEffect:{label:"원인과 결과",error:"지역의 특징과 생활 모습 사이의 관계를 단순 나열하는 모습"},
        evidence:{label:"자료 근거",error:"자료에서 자신의 생각을 뒷받침하는 정보를 고르기 어려워하는 모습"}
      }
    },
    "미술":{
      focus:"planning",
      concepts:{
        planning:{label:"표현 계획",error:"만들기 전에 필요한 재료와 순서를 정리하기 어려워하는 모습"},
        technique:{label:"재료·기법",error:"재료의 특성에 맞는 사용 방법을 선택하기 어려워하는 모습"},
        expression:{label:"표현 확장",error:"한 가지 표현을 반복하고 다른 방법으로 발전시키기 어려워하는 모습"},
        reflection:{label:"작품 돌아보기",error:"자신의 선택과 결과를 말로 설명하기 어려워하는 모습"}
      }
    },
    "체육":{
      focus:"teamwork",
      concepts:{
        rules:{label:"규칙 이해",error:"활동 규칙을 알고도 실제 상황에서 적용하는 데 시간이 걸리는 모습"},
        movement:{label:"움직임 수행",error:"설명한 움직임 순서를 실제 동작으로 연결하기 어려워하는 모습"},
        teamwork:{label:"협동",error:"개인 행동은 가능하지만 팀의 움직임에 맞춰 조절하기 어려워하는 모습"},
        strategy:{label:"전략 선택",error:"상황이 바뀌었을 때 다른 방법을 선택하기 어려워하는 모습"}
      }
    }
  };
  function deterministicNoise(id,key){
    var n=(id+1)*97;
    for(var i=0;i<key.length;i++)n=(n*31+key.charCodeAt(i))%10007;
    return ((n%1000)/999)-.5;
  }
  function makeKnowledge(t,id){
    var knowledge={};
    Object.keys(SUBJECT_MODELS).forEach(function(subject){
      var model=SUBJECT_MODELS[subject],subjectBias=0;
      if(subject==="국어")subjectBias=(t.reading-.5)*.18;
      if(subject==="수학")subjectBias=(t.persist-.5)*.09+(t.visual-.5)*.05;
      if(subject==="과학")subjectBias=(t.hands-.5)*.08+(t.visual-.5)*.06;
      if(subject==="사회")subjectBias=(t.reading-.5)*.07+(t.verbal-.5)*.07;
      if(subject==="미술")subjectBias=(t.creative-.5)*.15+(t.hands-.5)*.08;
      if(subject==="체육")subjectBias=(t.sports-.5)*.16+(t.move-.5)*.07;
      knowledge[subject]={};
      Object.keys(model.concepts).forEach(function(key,idx){
        var variation=deterministicNoise(id,subject+key)*.28;
        var mastery=clamp((t.academic||.5)+subjectBias+variation,.12,.95);
        knowledge[subject][key]={
          mastery:mastery,
          evidence:0,
          confidence:0,
          observations:[],
          hypothesis:null,
          lastSeen:0
        };
      });
    });
    return knowledge;
  }
  function subjectModel(subject){return SUBJECT_MODELS[subject]||null}
  function subjectMastery(s,subject){
    var model=subjectModel(subject);
    if(!model||!s.knowledge||!s.knowledge[subject])return s.academic||.5;
    var vals=Object.keys(model.concepts).map(function(k){return s.knowledge[subject][k].mastery});
    return vals.reduce(function(a,b){return a+b},0)/(vals.length||1);
  }
  function currentMastery(s){
    var p=current(),model=subjectModel(p.subject);
    if(!model||!s.knowledge||!s.knowledge[p.subject])return s.academic||.5;
    var focus=s.knowledge[p.subject][model.focus];
    var all=subjectMastery(s,p.subject);
    return clamp(focus.mastery*.62+all*.38);
  }
  function currentKnowledgeNode(s){
    var p=current(),model=subjectModel(p.subject);
    return model&&s.knowledge&&s.knowledge[p.subject]?s.knowledge[p.subject][model.focus]:null;
  }
  function weakestConcept(s,subject){
    var model=subjectModel(subject);
    if(!model||!s.knowledge||!s.knowledge[subject])return null;
    return Object.keys(model.concepts).sort(function(a,b){
      return s.knowledge[subject][a].mastery-s.knowledge[subject][b].mastery;
    })[0]||null;
  }
  function applyLearning(s,amount,mode){
    var p=current(),model=subjectModel(p.subject);
    if(!model||!s.knowledge||!s.knowledge[p.subject])return;
    var key=model.focus,node=s.knowledge[p.subject][key];
    var multiplier=mode==="firstStep"?1.45:mode==="hint"?1.22:mode==="pair"?.96:mode==="listen"?.72:1;
    var effective=amount*multiplier*(.72+s.persist*.18+s.focus*.16);
    node.mastery=clamp(node.mastery+effective);
    // A small amount generalizes to the weakest neighboring concept.
    var weak=weakestConcept(s,p.subject);
    if(weak&&weak!==key)s.knowledge[p.subject][weak].mastery=clamp(s.knowledge[p.subject][weak].mastery+effective*.18);
    s.learned+=effective;
  }
  function recordDiagnosticEvidence(s,source){
    var p=current(),model=subjectModel(p.subject);
    if(!model||!s.knowledge||!s.knowledge[p.subject])return null;
    var candidates=Object.keys(model.concepts).sort(function(a,b){
      return s.knowledge[p.subject][a].mastery-s.knowledge[p.subject][b].mastery;
    });
    var key=(s.knowledge[p.subject][model.focus].mastery<.62)?model.focus:candidates[0];
    var node=s.knowledge[p.subject][key],meta=model.concepts[key];
    node.evidence+=1;
    node.confidence=clamp(node.evidence/4);
    node.lastSeen=gameMinute();
    node.observations.unshift({time:gameMinute(),source:source,text:meta.error});
    node.observations=node.observations.slice(0,4);
    if(node.evidence>=2)node.hypothesis=meta.label+"에서 반복적인 어려움이 있을 가능성";
    return {subject:p.subject,key:key,label:meta.label,text:meta.error,evidence:node.evidence,confidence:node.confidence,hypothesis:node.hypothesis};
  }
  function hasObservedCurrentWork(s){
    return !!(s&&current().kind==="lesson"&&s.observedSubjects&&s.observedSubjects[current().subject]);
  }
  function hasDiagnosticEvidence(s){
    var p=current(),model=subjectModel(p.subject);
    if(!model||!s||!s.knowledge||!s.knowledge[p.subject])return false;
    return Object.keys(model.concepts).some(function(k){return s.knowledge[p.subject][k].evidence>0});
  }
  function diagnosticEvidenceCount(s){
    var p=current(),model=subjectModel(p.subject);
    if(!model||!s||!s.knowledge||!s.knowledge[p.subject])return 0;
    return Object.keys(model.concepts).reduce(function(sum,k){return sum+s.knowledge[p.subject][k].evidence},0);
  }
  function diagnosisSummary(s){
    var p=current(),model=subjectModel(p.subject);
    if(!model||!s.knowledge||!s.knowledge[p.subject])return [];
    var out=[];
    Object.keys(model.concepts).forEach(function(key){
      var node=s.knowledge[p.subject][key],meta=model.concepts[key];
      if(node.evidence<=0)return;
      if(node.evidence===1)out.push("관찰 1회 · "+meta.label+": "+node.observations[0].text);
      else out.push("진단 단서 "+node.evidence+"회 · "+meta.label+": "+node.hypothesis);
    });
    return out.slice(0,3);
  }
  function latestDiagnosisSummary(s){
    var rows=[];
    Object.keys(SUBJECT_MODELS).forEach(function(subject){
      var model=SUBJECT_MODELS[subject];
      Object.keys(model.concepts).forEach(function(key){
        var node=s.knowledge&&s.knowledge[subject]?s.knowledge[subject][key]:null;
        if(!node||node.evidence<=0)return;
        rows.push({
          subject:subject,
          lastSeen:node.lastSeen||0,
          text:node.evidence===1
            ? subject+" · 관찰 1회 · "+model.concepts[key].label+": "+node.observations[0].text
            : subject+" · 진단 단서 "+node.evidence+"회 · "+model.concepts[key].label+": "+node.hypothesis,
          hypothesis:node.evidence>=2
        });
      });
    });
    rows.sort(function(a,b){return b.lastSeen-a.lastSeen});
    return rows.slice(0,3);
  }
  function renderDiagnosisPanel(s){
    var unit=q("#diagnosisUnit"),box=q("#diagnosisEvidence");
    if(!s){
      unit.textContent="학생을 선택하세요.";
      box.innerHTML="활동지 확인이나 확인 질문으로 학습 근거를 모을 수 있습니다.";
      return;
    }
    var rows=[];
    if(current().kind==="lesson"&&subjectModel(current().subject)){
      unit.textContent=current().subject+" · "+(current().unit||"현재 단원");
      rows=diagnosisSummary(s).map(function(text){return {text:text,hypothesis:text.indexOf("진단 단서")===0}});
    }else{
      unit.textContent="최근 학습 관찰";
      rows=latestDiagnosisSummary(s);
    }
    if(!rows.length){
      box.innerHTML="아직 확인된 학습 근거가 없습니다. 활동지 확인·확인 질문처럼 진단 가능한 행동을 사용해 보세요.";
      return;
    }
    box.innerHTML=rows.map(function(row){
      return '<div class="diagnosis-item '+(row.hypothesis?"hypothesis":"")+'">'+row.text+'</div>';
    }).join("");
  }


  var TRAIT_CATALOG={
    distractible:{label:"산만함",category:"behavior",desc:"주변 자극에 쉽게 주의가 옮겨가고 과제 흐름을 놓치는 경우가 있음",response:{up:-.08,left:.12,right:.06},encounters:{off_task:1.55,careless_fast_work:1.35,missing_homework:1.28,question_monopoly:1.16}},
    impulsive:{label:"충동적",category:"behavior",desc:"생각보다 행동이 먼저 나오는 경우가 많음",response:{up:-.04,left:.10},encounters:{stationery_taken:1.48,careless_fast_work:1.32,teasing_boundary:1.22,game_loss:1.22}},
    restless:{label:"주의 전환이 잦음",category:"behavior",desc:"한 활동을 이어가다가 다른 자극으로 시선과 행동이 자주 이동함",response:{left:.10,up:.03},encounters:{off_task:1.48,after_lunch_sleepy:.78,missing_homework:1.12}},
    active:{label:"활동적",category:"behavior",desc:"움직임이 많고 몸을 쓰는 활동에 에너지가 높음",response:{right:.06,left:.04},encounters:{off_task:1.16,game_loss:1.18,after_lunch_sleepy:.82}},
    playful:{label:"장난기 많음",category:"behavior",desc:"재미있는 자극과 장난을 쉽게 찾음",response:{right:.08,up:-.05},encounters:{teasing_boundary:1.48,off_task:1.24,stationery_taken:1.18}},
    chatterbox:{label:"말이 많음",category:"behavior",desc:"생각과 이야기를 말로 표현하는 욕구가 큼",response:{up:.03,down:.04},encounters:{question_monopoly:1.55,off_task:1.42}},
    social:{label:"사교적",category:"social",desc:"또래에게 먼저 다가가고 함께 있는 것을 좋아함",response:{down:.05,right:.05},encounters:{question_monopoly:1.16,teasing_boundary:1.12,friend_dependency:1.08}},
    shy:{label:"낯가림",category:"social",desc:"많은 사람 앞이나 익숙하지 않은 관계에서 표현이 줄어듦",response:{down:.14,right:.08,up:-.08},encounters:{presentation_anxiety:1.58,group_silent:1.52,praise_embarrassment:1.34}},
    leadership:{label:"리더형",category:"social",desc:"집단에서 방향을 정하고 주도하려는 성향이 강함",response:{right:.12,up:.04},encounters:{group_dominates:1.52,question_monopoly:1.26}},
    helper:{label:"도움 주는 걸 좋아함",category:"social",desc:"친구가 어려워하면 먼저 돕고 싶어함",response:{down:.06,left:.05},encounters:{overhelping_friend:1.58,social_exclusion:.90}},
    empathetic:{label:"공감적",category:"social",desc:"다른 사람의 표정과 감정에 민감하게 반응함",response:{down:.12,left:.04},encounters:{overhelping_friend:1.20,teasing_boundary:.82}},
    friend_dependent:{label:"친구 의존",category:"social",desc:"특정 친구와의 관계가 안정감에 큰 영향을 줌",response:{down:.12,right:.04},encounters:{friend_dependency:1.70,social_exclusion:1.28}},
    competitive:{label:"승부욕 강함",category:"social",desc:"비교·승패 상황에서 동기가 크게 올라가지만 감정도 커질 수 있음",response:{right:.09,up:.04},encounters:{game_loss:1.62,group_dominates:1.34,question_monopoly:1.12}},
    model_student:{label:"모범생",category:"learning",desc:"과제와 규칙을 안정적으로 지키고 교사의 기대를 빠르게 파악함",response:{up:.12,left:.08},encounters:{finished_early:1.30,rule_policing_peer:1.34,fairness_complaint:1.18,missing_homework:.58}},
    perfectionist:{label:"완벽주의",category:"learning",desc:"틀리는 것을 크게 의식하고 결과의 완성도를 높이려 함",response:{left:.12,down:.08,right:-.05},encounters:{mistake_shutdown:1.52,presentation_anxiety:1.22,praise_embarrassment:1.18,careless_fast_work:.65}},
    persistent:{label:"끈기 있음",category:"learning",desc:"어려워도 오래 붙잡고 해결하려는 편",response:{left:.09,right:.04},encounters:{finished_early:1.18,missing_homework:.64,mistake_shutdown:.72}},
    quick_learner:{label:"빠른 이해",category:"learning",desc:"새 개념을 빠르게 파악하고 반복 활동에서 쉽게 지루해질 수 있음",response:{right:.08,left:.06},encounters:{finished_early:1.72,careless_fast_work:1.20}},
    foundational_gaps:{label:"기초 부족",category:"learning",desc:"현재 과제보다 이전 단계의 개념부터 다시 연결할 필요가 있음",response:{left:.18,right:-.10,down:.04},encounters:{math_foundation_gap:1.82,copies_answer:1.48,help_refusal:1.22}},
    easily_discouraged:{label:"쉽게 포기함",category:"learning",desc:"실패 경험 뒤 다시 시작하는 데 시간이 오래 걸림",response:{down:.14,left:.12,up:-.12},encounters:{mistake_shutdown:1.78,help_refusal:1.22,copies_answer:1.16}},
    independent:{label:"혼자 해보려 함",category:"learning",desc:"도움보다 스스로 해결하는 것을 선호함",response:{right:.15,left:-.04},encounters:{help_refusal:1.48}},
    creative:{label:"창의적",category:"learning",desc:"정해진 한 가지 방식보다 새로운 방법과 표현을 선호함",response:{right:.14,left:.04},encounters:{finished_early:1.22,off_task:1.08}},
    sensitive_rejection:{label:"거절민감",category:"emotion",desc:"거절·실패·부정적 피드백을 크게 받아들이는 편",response:{down:.16,up:-.12,left:.06},encounters:{presentation_anxiety:1.52,social_exclusion:1.34,praise_embarrassment:1.62,friend_dependency:1.34,mistake_shutdown:1.42}},
    quiet_internalizer:{label:"속으로 삭임",category:"emotion",desc:"불편함을 겉으로 크게 드러내기보다 안으로 오래 가지고 있음",response:{down:.08,left:.05,up:-.04},encounters:{group_silent:1.48,praise_embarrassment:1.38,help_refusal:1.18}},
    slow_to_warm:{label:"천천히 적응함",category:"emotion",desc:"새 상황이나 사람에게 익숙해지는 데 시간이 필요함",response:{down:.12,right:.04,up:-.05},encounters:{presentation_anxiety:1.34,group_silent:1.28}},
    authority_resistant:{label:"권위에 반발",category:"emotion",desc:"강한 통제나 일방적 지시에 특히 민감하게 반응함",response:{up:-.22,down:.08,right:.12},encounters:{teacher_defiance:1.72,fairness_complaint:1.24}},
    rule_oriented:{label:"규칙중시",category:"value",desc:"예측 가능한 규칙과 공정한 기준을 중요하게 여김",response:{up:.18,right:-.05},encounters:{fairness_complaint:1.52,rule_policing_peer:1.68,missing_homework:.72}},
    needs_structure:{label:"구조가 필요함",category:"value",desc:"해야 할 순서와 범위가 명확할수록 안정적으로 움직임",response:{up:.16,left:.10,right:-.16},encounters:{off_task:1.20,missing_homework:1.28,help_refusal:1.08}},
    autonomy_seeker:{label:"선택권 선호",category:"value",desc:"스스로 선택하고 통제감을 가질 때 참여가 좋아짐",response:{right:.20,up:-.14},encounters:{help_refusal:1.42,teacher_defiance:1.26,fairness_complaint:1.10}},
    fairness_sensitive:{label:"공정성 민감",category:"value",desc:"사람마다 다른 기준이나 예외 상황을 빠르게 알아차림",response:{up:.06,down:.06},encounters:{fairness_complaint:1.82,rule_policing_peer:1.24}}
  };

  var STUDENT_TRAITS={
    "민수":["distractible","impulsive","active","playful","social","authority_resistant"],
    "지우":["social","helper","empathetic","fairness_sensitive","chatterbox"],
    "서연":["model_student","perfectionist","sensitive_rejection","quiet_internalizer","persistent"],
    "준호":["leadership","competitive","autonomy_seeker","social","impulsive"],
    "태호":["foundational_gaps","easily_discouraged","slow_to_warm","sensitive_rejection","creative","needs_structure"],
    "유나":["model_student","helper","empathetic","rule_oriented","persistent"],
    "현우":["distractible","impulsive","restless","active","authority_resistant","competitive"],
    "소라":["creative","quiet_internalizer","helper","persistent","sensitive_rejection"],
    "도윤":["active","competitive","leadership","social","needs_structure"],
    "하린":["model_student","perfectionist","rule_oriented","persistent","fairness_sensitive"],
    "예준":["quick_learner","leadership","competitive","autonomy_seeker","social"],
    "채원":["helper","empathetic","creative","social","persistent"],
    "시우":["distractible","quick_learner","impulsive","restless","autonomy_seeker","playful"],
    "다은":["empathetic","helper","sensitive_rejection","social","friend_dependent"],
    "건우":["active","competitive","impulsive","playful","social"],
    "아린":["shy","slow_to_warm","quiet_internalizer","creative","needs_structure","sensitive_rejection"],
    "지호":["distractible","quick_learner","active","playful","social","independent"],
    "은서":["model_student","perfectionist","quick_learner","rule_oriented","persistent"],
    "윤호":["leadership","independent","autonomy_seeker","persistent","social"],
    "나연":["chatterbox","social","empathetic","helper","fairness_sensitive"],
    "승민":["model_student","competitive","leadership","rule_oriented","persistent"],
    "세아":["shy","friend_dependent","sensitive_rejection","quiet_internalizer","helper","creative"]
  };

  function studentTraitIds(name){return (STUDENT_TRAITS[name]||[]).slice()}
  function studentTraits(s){return (s&&s.traits||[]).map(function(id){return TRAIT_CATALOG[id]}).filter(Boolean)}
  function hasTrait(s,id){return !!(s&&s.traits&&s.traits.indexOf(id)>=0)}
  function traitLabels(s,limit){
    var list=studentTraits(s).map(function(t){return t.label});
    return limit?list.slice(0,limit):list;
  }
  function traitResponseBonus(traitIds,dir){
    return (traitIds||[]).reduce(function(sum,id){
      var t=TRAIT_CATALOG[id],r=t&&t.response;return sum+(r&&r[dir]||0);
    },0);
  }
  function traitEncounterMultiplier(s,templateId){
    if(!s||!s.traits)return 1;
    return clamp(s.traits.reduce(function(mult,id){
      var t=TRAIT_CATALOG[id],v=t&&t.encounters&&t.encounters[templateId];
      return mult*(v===undefined?1:v);
    },1),.38,3.1);
  }
  function traitActionMultiplier(s,action){
    if(!s||!s.traits)return 1;
    var mult=1;
    function m(id,map){if(hasTrait(s,id)&&map[action]!==undefined)mult*=map[action]}
    m("distractible",{ATTEND:.82,WORK:.90,TALK:1.18,DOODLE:1.32,MOVE:1.22,LOOK_OUTSIDE:1.65,PASS_NOTE:1.22,DROP_ITEM:1.20});
    m("impulsive",{ATTEND:.92,WORK:.94,TALK:1.16,MOVE:1.28,RUN:1.28,DROP_ITEM:1.55,PASS_NOTE:1.38,TEASE:1.18,BORROW_ITEM:1.12});
    m("restless",{ATTEND:.88,WORK:.92,MOVE:1.52,RUN:1.45,STRETCH:1.38,LOOK_OUTSIDE:1.18});
    m("active",{MOVE:1.30,RUN:1.38,PLAY:1.28,COMPETE:1.20,STRETCH:1.18,SLEEP:.72});
    m("playful",{TALK:1.12,PLAY:1.28,TEASE:1.42,PASS_NOTE:1.28,DOODLE:1.12});
    m("chatterbox",{TALK:1.68,RAISE_HAND:1.34,PRESENT:1.16,PASS_NOTE:1.14,ATTEND:.92});
    m("social",{TALK:1.24,PAIR_WORK:1.24,PLAY:1.18,SHARE:1.20,SEEK:1.18});
    m("shy",{TALK:.80,RAISE_HAND:.62,PRESENT:.54,PAIR_WORK:.88,SEEK:.88,READ:1.10});
    m("leadership",{RAISE_HAND:1.24,PRESENT:1.28,PAIR_WORK:1.16,HELP_PEER:1.18,REPORT_INCIDENT:1.12});
    m("helper",{HELP_PEER:1.55,COMFORT:1.52,SHARE:1.36,REPORT_INCIDENT:1.18});
    m("empathetic",{COMFORT:1.46,HELP_PEER:1.28,TEASE:.68});
    m("friend_dependent",{TALK:1.20,SEEK:1.42,PLAY:1.20,REJECTED:1.30});
    m("competitive",{COMPETE:1.72,PLAY:1.12,ARGUE:1.10,PRESENT:1.08});
    m("model_student",{WORK:1.32,ATTEND:1.34,READ:1.24,CLEAN:1.28,TALK:.78,DOODLE:.72,PASS_NOTE:.64,TEASE:.72});
    m("perfectionist",{WORK:1.18,ATTEND:1.08,HELP:1.12,PRESENT:.82,DROP_ITEM:.78});
    m("persistent",{WORK:1.25,READ:1.22,CLEAN:1.20,HELP:.92,SLEEP:.82});
    m("quick_learner",{WORK:1.12,ATTEND:1.04,RAISE_HAND:1.20,DOODLE:1.08,LOOK_OUTSIDE:1.12});
    m("foundational_gaps",{WORK:.86,HELP:1.46,PAIR_WORK:1.12,COPIES:1.24});
    m("easily_discouraged",{WORK:.84,HELP:1.28,LOOK_OUTSIDE:1.12,DOODLE:1.10});
    m("independent",{WORK:1.18,HELP:.62,PAIR_WORK:.90,RIGHT:1.10});
    m("creative",{DOODLE:1.42,PRESENT:1.10,WORK:1.04,READ:.96});
    m("sensitive_rejection",{PRESENT:.72,RAISE_HAND:.82,REJECTED:1.38,HELP:1.10});
    m("quiet_internalizer",{TALK:.78,RAISE_HAND:.72,PRESENT:.76,READ:1.10,WORK:1.06});
    m("slow_to_warm",{TALK:.84,PAIR_WORK:.86,PRESENT:.70,READ:1.10});
    m("rule_oriented",{ATTEND:1.22,WORK:1.18,CLEAN:1.22,REPORT_INCIDENT:1.55,TALK:.92});
    m("needs_structure",{ATTEND:1.18,WORK:1.18,PAIR_WORK:1.04,LOOK_OUTSIDE:.88});
    m("autonomy_seeker",{WORK:1.08,HELP:.82,ATTEND:.94,MOVE:1.06});
    m("fairness_sensitive",{REPORT_INCIDENT:1.62,ARGUE:1.08});
    return clamp(mult,.28,2.65);
  }
  function applyTraitActionWeights(s,vals){
    Object.keys(vals).forEach(function(action){vals[action]*=traitActionMultiplier(s,action)});
    if(hasTrait(s,"quick_learner")&&current().kind==="lesson"&&currentMastery(s)>.78){vals.DOODLE=(vals.DOODLE||0)+.14;vals.LOOK_OUTSIDE=(vals.LOOK_OUTSIDE||0)+.11}
    if(hasTrait(s,"foundational_gaps")&&current().kind==="lesson"&&currentMastery(s)<.55){vals.HELP=(vals.HELP||0)+.20;vals.WORK=(vals.WORK||0)*.86}
    if(hasTrait(s,"perfectionist")&&s.frustration>.30){vals.HELP=(vals.HELP||0)+.10;vals.WORK=(vals.WORK||0)*.88}
    return vals;
  }
  function traitCombo(s,ids){return ids.every(function(id){return hasTrait(s,id)})}
  function traitComboLabel(s){
    if(traitCombo(s,["distractible","quick_learner"]))return "집중은 흔들려도 이해는 빠름";
    if(traitCombo(s,["model_student","perfectionist"]))return "잘하고 싶어서 실수를 크게 의식함";
    if(traitCombo(s,["leadership","competitive"]))return "앞장서지만 승부가 걸리면 세짐";
    if(traitCombo(s,["social","sensitive_rejection"]))return "친구를 좋아하지만 관계 변화에 민감함";
    if(traitCombo(s,["model_student","rule_oriented"]))return "규칙을 잘 지키고 남의 규칙도 잘 봄";
    if(traitCombo(s,["shy","creative"]))return "말보다 다른 방식으로 표현할 때 편함";
    return "";
  }

  function traitChipHtml(id){
    var t=TRAIT_CATALOG[id];if(!t)return "";
    return '<span class="trait-chip trait-'+escHtml(t.category)+'" title="'+escHtml(t.desc)+'">'+escHtml(t.label)+'</span>';
  }
  function traitListHtml(s){
    return (s.traits||[]).map(traitChipHtml).join("");
  }

  function responseJitter(index,salt){
    var x=Math.sin((index+1)*12.9898+(salt+3)*78.233)*43758.5453;
    return (x-Math.floor(x))-.5;
  }
  function makeTeacherResponseProfile(t,index,traitIds){
    function spread(v,salt){
      v+=responseJitter(index,salt)*.16;
      return clamp(.5+(v-.5)*1.28,.08,.92);
    }
    var up=spread(.28+t.rule*.50+t.persist*.18-t.imp*.28-t.mischief*.10,1);
    var down=spread(.27+t.empathy*.38+t.rejection*.24+(1-t.assert)*.12-t.compete*.08,2);
    var left=spread(.30+t.persist*.34+(1-t.academic)*.18+t.visual*.10-t.imp*.08,3);
    var right=spread(.30+t.assert*.30+t.persist*.16+t.compete*.10-t.rejection*.20+(1-t.rule)*.08,4);
    var personalOrder=["up","left","down","right"],preferred=personalOrder[index%personalOrder.length];
    var opposite={up:"down",down:"up",left:"right",right:"left"}[preferred];
    var responseValues={up:up,down:down,left:left,right:right};
    ["up","down","left","right"].forEach(function(dir){responseValues[dir]+=traitResponseBonus(traitIds,dir)});
    responseValues[preferred]+= .14;
    responseValues[opposite]-= .05;
    up=clamp(responseValues.up,.08,.92);down=clamp(responseValues.down,.08,.92);left=clamp(responseValues.left,.08,.92);right=clamp(responseValues.right,.08,.92);
    var sensitivity=clamp(.78+t.react*.38+t.rejection*.12,.78,1.28);
    var expressiveness=clamp(.22+t.react*.38+t.assert*.18+t.imp*.06,.24,1);
    return {up:up,down:down,left:left,right:right,sensitivity:sensitivity,expressiveness:expressiveness};
  }
  function responseDisposition(s,dir){
    var p=s&&s.teacherResponse;if(!p)return .5;
    return p[dir]===undefined?.5:p[dir];
  }
  function responseStyleMultiplier(s,dir,value){
    if(!s||!dir||dir==="timeout"||!value)return 1;
    var fit=responseDisposition(s,dir),sens=(s.teacherResponse&&s.teacherResponse.sensitivity)||1;
    if(value>0)return clamp((.44+fit*1.02)*(.92+(sens-1)*.34),.42,1.62);
    return clamp((.68+(1-fit)*.92)*(.92+(sens-1)*.62),.58,1.82);
  }
  function responseDescriptor(s){
    if(!s||!s.teacherResponse)return [];
    var p=s.teacherResponse,dirs=["up","down","left","right"];
    var high=dirs.slice().sort(function(a,b){return p[b]-p[a]})[0];
    var low=dirs.slice().sort(function(a,b){return p[a]-p[b]})[0];
    var good={
      up:"↑ 명확한 기준에 안정",down:"↓ 공감하면 마음을 잘 엶",left:"← 단계별 코칭을 잘 받음",right:"→ 선택권을 주면 잘 움직임"
    };
    var hard={
      up:"↑ 강한 통제에는 반발 가능",down:"↓ 감정 질문을 부담스러워함",left:"← 세세한 지도는 간섭으로 느낌",right:"→ 선택이 많으면 오히려 막힘"
    };
    var expression=p.expressiveness>.66?"반응이 겉으로 크게 드러남":p.expressiveness<.50?"겉반응은 작지만 속으로 오래 남는 편":"반응 표현은 보통";
    return [good[high],hard[low],expression];
  }
  function studentStyleReaction(s,dir){
    if(!s||!dir||dir==="timeout"||!s.teacherResponse)return {text:"",dialogue:"",tone:"normal",fit:.5};
    var fit=responseDisposition(s,dir),visible=s.teacherResponse.expressiveness>.64,subtle=s.teacherResponse.expressiveness<.50;
    var positive=fit>=.66,negative=fit<=.36,text="",dialogue="",tone="normal";
    if(positive){
      if(dir==="up"){text=visible?s.name+"은(는) 기준이 분명해지자 바로 행동을 정리했다.":s.name+"은(는) 크게 티 내지 않았지만 지시 뒤 행동이 안정됐다.";dialogue=visible?"네, 알겠어요.":""}
      else if(dir==="down"){text=visible?s.name+"은(는) 자신의 이야기를 꺼내며 표정이 빠르게 풀렸다.":s.name+"은(는) 조용히 듣다가 조금씩 긴장을 내려놓았다.";dialogue=visible?"사실은요…":""}
      else if(dir==="left"){text=visible?s.name+"은(는) 방법이 구체적으로 보이자 바로 다시 해보려 했다.":s.name+"은(는) 말없이 순서를 따라가며 다시 시작했다.";dialogue=visible?"그럼 이거부터 하면 돼요?":""}
      else{text=visible?s.name+"은(는) 선택권이 생기자 스스로 다음 행동을 바로 정했다.":s.name+"은(는) 한참 생각한 뒤 자기 방식으로 움직이기 시작했다.";dialogue=visible?"제가 이걸로 해볼게요.":""}
      tone="normal";
    }else if(negative){
      if(dir==="up"){text=visible?s.name+"은(는) 통제받는 느낌에 즉각 표정이 굳고 반발했다.":s.name+"은(는) 겉으로는 따랐지만 시선을 피하며 한동안 굳어 있었다.";dialogue=visible?"왜 또 저만 그래요?":"네…"}
      else if(dir==="down"){text=visible?s.name+"은(는) 감정을 묻는 대화 자체를 부담스러워하며 선을 그었다.":s.name+"은(는) 대답은 짧게 했지만 이후 말수가 더 줄었다.";dialogue=visible?"괜찮아요. 그냥 할게요.":""}
      else if(dir==="left"){text=visible?s.name+"은(는) 세세한 설명이 이어지자 답답하다는 반응을 보였다.":s.name+"은(는) 고개는 끄덕였지만 점점 수동적으로 따라갔다.";dialogue=visible?"아, 그냥 제가 해볼게요.":""}
      else{text=visible?s.name+"은(는) 선택을 맡기자 오히려 결정을 못 하고 짜증이 섞였다.":s.name+"은(는) 한참 고르지 못한 채 주변만 살폈다.";dialogue=visible?"그냥 선생님이 정해 주세요.":""}
      tone=visible?"warning":"normal";
    }else{
      text=subtle?s.name+"에게서는 즉각적인 겉반응은 크지 않았다.":s.name+"은(는) 잠깐 생각한 뒤 큰 반발 없이 상황을 받아들였다.";
    }
    return {text:text,dialogue:dialogue,tone:tone,fit:fit};
  }

  function resetStudents(){
    students=templates.map(function(t,i){
      var p=seats[i],traitIds=studentTraitIds(t.name);
      return Object.assign({},t,{traits:traitIds,knowledge:makeKnowledge(t,i),look:makeLook(t,i),teacherResponse:makeTeacherResponseProfile(t,i,traitIds),
        id:i,seat:i,scene:"classroom",targetScene:null,arrivalAt:0,x:p.x,y:p.y,dx:p.x,dy:p.y,
        focus:.72,boredom:.14,talkNeed:.14,moveNeed:t.move*.14,helpNeed:.08,sleepNeed:(1-t.energy)*.24,
        socialNeed:.16+t.soc*.12,mood:.70,belonging:.62,frustration:.08,
        action:"READ",intent:null,intentTicks:0,actionTicks:rand(2,5),trust:.62,learned:0,interventions:0,
        memory:[],moving:false,observation:0,observedSubjects:{},teacherUse:{},socialTarget:null,socialGoal:null,groupId:null,
        conflictWith:null,conflictUntil:0,avoidId:null,avoidUntil:0,
        pairWith:null,pairUntil:0,lessonPartner:null,role:null,roleUntil:0,correctionLoad:0,
        severeCooldown:0,victimStress:0,teacherDefiance:0,lastSeriousIncident:null,
        encounterNotes:[],speechText:"",speechTone:"normal",speechUntil:0,
        actionStartedAt:gameSec,actionLockedUntil:gameSec+25,behaviorPhase:"idle",phaseUntil:0,facing:1
      });
    });
  }

  var ENCOUNTER_DIRECTIONS={
    up:{label:"원칙 · 권위",icon:"↑",philosophy:"규칙·기준·교사의 명확한 지시를 우선"},
    down:{label:"공감 · 관계",icon:"↓",philosophy:"학생의 감정·사정·관계 회복을 우선"},
    left:{label:"교육 · 코칭",icon:"←",philosophy:"필요한 기술을 직접 가르치고 연습"},
    right:{label:"자율 · 책임",icon:"→",philosophy:"학생이 선택하고 해결하며 결과를 책임"}
  };

  function averageStudentAffinity(s){
    if(!students.length)return .5;
    var peers=students.filter(function(o){return o!==s});
    if(!peers.length)return .5;
    var sum=peers.reduce(function(total,o){return total+relation(s,o).affinity},0);
    return clamp(sum/peers.length);
  }
  function studentDashboard(s,subjectOverride){
    var p=current(),subject=subjectOverride||(p&&p.subject)||null,learning;
    if(subject&&subjectModel(subject))learning=subjectMastery(s,subject);
    else{
      var vals=Object.keys(SUBJECT_MODELS).map(function(subjectName){return subjectMastery(s,subjectName)});
      learning=vals.length?vals.reduce(function(a,b){return a+b},0)/vals.length:(s.academic||.5);
    }
    return {
      learning:Math.round(clamp(learning)*100),
      focus:Math.round(clamp(s.focus)*100),
      mood:Math.round(clamp(s.mood)*100),
      relation:Math.round(clamp(s.belonging*.62+averageStudentAffinity(s)*.38)*100),
      trust:Math.round(clamp(s.trust)*100)
    };
  }
  function classDashboard(){
    var rel=students.length?students.reduce(function(sum,s){return sum+studentDashboard(s).relation},0)/students.length:classMetrics.relationship;
    var tr=students.length?students.reduce(function(sum,s){return sum+s.trust*100},0)/students.length:classMetrics.trust;
    return {
      flow:Math.round(clamp(classMetrics.flow,0,100)),
      relationship:Math.round(clamp(rel*.55+classMetrics.relationship*.45,0,100)),
      stability:Math.round(clamp(classMetrics.stability,0,100)),
      trust:Math.round(clamp(tr*.58+classMetrics.trust*.42,0,100))
    };
  }
  function dashboardDelta(before,after){
    var out={};
    Object.keys(before).forEach(function(k){out[k]=(after[k]||0)-(before[k]||0)});
    return out;
  }
  function effectHint(effects){
    effects=effects||{};
    var labels={learning:"📚",focus:"🎯",mood:"🙂",relation:"🤝",trust:"❤️",classFlow:"수업",classRelationship:"관계",classStability:"질서",classTrust:"신뢰"};
    return Object.keys(labels).filter(function(k){return effects[k]}).slice(0,4).map(function(k){
      return labels[k]+" "+(effects[k]>0?"↑":"↓");
    }).join("  ")||"결과는 상황에 따라 달라질 수 있음";
  }
  function encounterChoice(text,effects,result){
    return {text:text,effects:effects||{},result:result||""};
  }
  function followUpDirectionEffects(sourceId,dir,s){
    var e={};
    if(dir==="up"){e.focus=2;e.trust=-1;e.classStability=2;e.classFlow=1}
    else if(dir==="down"){e.mood=2;e.trust=2;e.classRelationship=1}
    else if(dir==="left"){e.learning=2;e.focus=1;e.trust=1;e.classFlow=-1}
    else if(dir==="right"){e.focus=1;e.mood=1;e.trust=1;e.classStability=-1}
    else{e.focus=-1;e.trust=-1;e.classStability=-1}

    if(sourceId==="math_foundation_gap"){
      if(dir==="left"){e.learning=4;e.focus=2}
      if(dir==="up"){e.learning=2;e.mood=-2}
      if(dir==="down"){e.learning=1;e.mood=3}
      if(dir==="right"){e.learning=2;e.focus=2}
    }else if(["stationery_taken","peer_conflict","social_exclusion"].indexOf(sourceId)>=0){
      if(dir==="left"){e.relation=3}
      if(dir==="down"){e.relation=2;e.mood=(e.mood||0)+1}
      if(dir==="right"){e.relation=1}
      if(dir==="up"){e.relation=-1}
    }else if(sourceId==="teacher_defiance"){
      if(dir==="up"){e.classStability=4;e.trust=-2}
      if(dir==="down"){e.trust=4;e.mood=3}
      if(dir==="left"){e.trust=2;e.classStability=2}
      if(dir==="right"){e.trust=2;e.focus=2}
    }else if(sourceId==="missing_homework"){
      if(dir==="left"){e.focus=4;e.classStability=2}
      if(dir==="right"){e.focus=2}
    }else if(sourceId==="presentation_anxiety"){
      if(dir==="left"){e.mood=3;e.trust=2;e.focus=2}
      if(dir==="down"){e.mood=3;e.trust=3}
      if(dir==="up"){e.mood=-2;e.focus=2}
    }else if(sourceId==="off_task"){
      if(dir==="left"){e.focus=4}
      if(dir==="up"){e.focus=3;e.trust=-1}
      if(dir==="down"){e.trust=3}
      if(dir==="right"){e.focus=2}
    }else if(sourceId==="finished_early"){
      if(dir==="left"){e.learning=3;e.focus=2}
      if(dir==="down"){e.mood=2}
      if(dir==="right"){e.focus=2;e.mood=2}
    }
    return e;
  }
  function scheduleFollowUp(enc,dir,choice){
    if(!enc||!enc.studentId&&enc.studentId!==0)return;
    var depth=enc.chainDepth||0;
    if(depth>=2)return;
    var chance=enc.isFollowUp?.26:.62;
    var sourceStudent=studentById(enc.studentId);
    if(dir!=="timeout"&&sourceStudent&&sourceStudent.teacherResponse){
      var fit=responseDisposition(sourceStudent,dir),memorable=Math.abs(fit-.5)*.24+(sourceStudent.teacherResponse.expressiveness-.5)*.10;
      chance=clamp(chance+memorable,.18,.82);
    }
    if(dir==="timeout")chance=.42;
    if(Math.random()>chance)return;
    var delay=Math.random()<.78?1:2;
    followUpQueue.push({
      id:"follow-"+(++followUpSeq),
      sourceEncounterId:enc.id,
      sourceTemplateId:enc.sourceTemplateId||enc.templateId,
      studentId:enc.studentId,targetId:enc.targetId,
      sourceDir:dir,sourceDirection:dir==="timeout"?"시간 초과":(ENCOUNTER_DIRECTIONS[dir]&&ENCOUNTER_DIRECTIONS[dir].label)||dir,
      sourceChoice:choice&&choice.text||"",
      sourceTitle:enc.title,sourceSubject:enc.effectSubject||current().subject||null,
      createdDay:dayIndex,dueDay:dayIndex+delay,
      chainDepth:depth+1,status:"queued",applied:false
    });
  }
  function followUpNarrative(job,s,t){
    var who=s.name,prev=job.sourceDirection||"이전 판단";
    if(job.sourceTemplateId==="stationery_taken"){
      if(job.sourceDir==="left")return {title:"이번에는 먼저 물어봤다",text:who+"이(가) 친구의 색연필이 필요해 손을 뻗다가 멈췄다. 그리고 전에 연습했던 말을 떠올린 듯 먼저 친구에게 묻는다.",dialogue:who+' “이거 잠깐 빌려도 돼?”'};
      if(job.sourceDir==="up")return {title:"규칙은 기억하지만 눈치를 본다",text:who+"이(가) 친구 물건을 보다가 교사 쪽을 한 번 확인한다. 지난번 규칙은 기억하고 있지만 필요한 것을 어떻게 요청할지는 아직 망설인다.",dialogue:who+' “선생님… 이거 써도 돼요?”'};
      if(job.sourceDir==="down")return {title:"친구의 반응을 먼저 살핀다",text:who+"이(가) 친구의 물건이 필요해 보이지만 바로 집지 않고 친구 표정을 살핀다. 지난 대화가 행동에 조금 남은 듯하다.",dialogue:who+' “너 이거 지금 써?”'};
      return {title:"이번에는 둘이 먼저 해결하려 한다",text:who+"과(와) "+(t?t.name:"친구")+" 사이에 준비물 문제가 다시 생겼지만 두 학생이 교사를 바로 찾지 않고 먼저 말을 주고받기 시작했다.",dialogue:who+' “이거 내가 잠깐 써도 돼?”'};
    }
    if(job.sourceTemplateId==="math_foundation_gap"){
      if(job.sourceDir==="left")return {title:"어제 배운 방법을 다시 꺼낸다",text:who+"이(가) 비슷한 수학 문제를 만났다. 처음에는 손이 멈췄지만 어제 교사와 함께 풀었던 순서를 떠올리며 식을 다시 써 보기 시작한다.",dialogue:who+' “어제 했던 것처럼 먼저 여기부터 하면 되죠?”'};
      if(job.sourceDir==="up")return {title:"문제는 풀지만 표정이 굳어 있다",text:who+"이(가) 정해진 기초 문제를 해 왔다. 정답은 늘었지만 틀릴 때마다 지우개를 오래 사용하며 교사 눈치를 살핀다.",dialogue:who+' “이것도 꼭 다 해야 해요?”'};
      if(job.sourceDir==="down")return {title:"다시 도움을 요청했다",text:who+"이(가) 오늘은 문제를 덮지 않고 교사를 찾았다. 부담은 줄었지만 기초 개념의 빈틈은 여전히 남아 있다.",dialogue:who+' “오늘도 여기까지만 같이 보면 안 돼요?”'};
      return {title:"자기에게 맞는 방법을 고른다",text:who+"이(가) 비슷한 문제에서 막히자 지난번처럼 해결 방법을 고르려 한다. 이번에는 친구에게 묻기보다 예시를 먼저 찾아본다.",dialogue:who+' “저 먼저 예시 보고 해볼게요.”'};
    }
    if(job.sourceTemplateId==="off_task"){
      if(job.sourceDir==="left")return {title:"스스로 첫 단계부터 시작한다",text:who+"이(가) 다시 집중이 흔들렸지만 이번에는 해야 할 일을 작은 단계로 나누어 첫 줄부터 시작한다.",dialogue:who+' “일단 이것 하나부터 하면 되는 거지…”'};
      if(job.sourceDir==="up")return {title:"교사를 보자 바로 자세를 고친다",text:who+"이(가) 옆자리와 이야기하다가 교사의 시선을 알아차리자 곧바로 과제로 돌아온다. 다만 스스로 조절했다기보다 교사를 의식한 모습에 가깝다.",dialogue:""};
      if(job.sourceDir==="down")return {title:"집중이 흐트러지는 이유를 말한다",text:who+"이(가) 또 다른 곳을 보다가 먼저 교사에게 말을 건다. 전보다 자기 상태를 설명하려는 모습이 생겼다.",dialogue:who+' “이거 너무 오래 하니까 머리가 복잡해요.”'};
      return {title:"세운 목표를 스스로 확인한다",text:who+"이(가) 잠시 딴짓을 하다가 자신이 정했던 목표를 확인하고 다시 과제로 돌아온다.",dialogue:who+' “여기까지만 하고 쉬기로 했지.”'};
    }
    if(job.sourceTemplateId==="peer_conflict"){
      if(job.sourceDir==="left")return {title:"배운 말하기 방법을 써 보려 한다",text:who+"과(와) "+(t?t.name:"친구")+" 사이에 다시 의견 차이가 생겼다. 이번에는 곧바로 소리를 높이기보다 지난번에 연습한 방식으로 말하려 한다.",dialogue:who+' “나는 네가 그냥 가져가서 화났어. 먼저 말해줬으면 좋겠어.”'};
      if(job.sourceDir==="up")return {title:"싸움은 멈췄지만 감정은 남아 있다",text:who+"과(와) "+(t?t.name:"친구")+"은(는) 지난번 이후 서로 규칙을 어기지 않으려 하지만 작은 일에도 어색하게 거리를 둔다.",dialogue:""};
      if(job.sourceDir==="down")return {title:"먼저 자기 감정을 설명한다",text:who+"이(가) 갈등이 생기자 상대를 탓하기 전에 자신이 왜 화가 났는지 먼저 말하려 한다.",dialogue:who+' “나 그때 진짜 속상했어.”'};
      return {title:"둘이 먼저 해결안을 제안한다",text:who+"과(와) "+(t?t.name:"친구")+" 사이에 작은 갈등이 생겼지만 이번에는 두 학생이 먼저 번갈아 하자는 방법을 꺼냈다.",dialogue:who+' “그럼 이번엔 네가 하고 다음에 내가 할게.”'};
    }
    if(job.sourceTemplateId==="social_exclusion"){
      if(job.sourceDir==="left")return {title:"놀이에 들어가는 말을 직접 사용했다",text:who+"이(가) 친구들 곁에서 한참 서 있지 않고 전에 연습한 말을 꺼내며 놀이에 참여하려 한다.",dialogue:who+' “나도 다음 판부터 같이 해도 돼?”'};
      if(job.sourceDir==="down")return {title:"속상한 순간을 먼저 말해 준다",text:who+"이(가) 친구 관계에서 불편한 일이 생기자 혼자 떨어져 있기보다 교사에게 먼저 자신의 마음을 설명한다.",dialogue:who+' “저 또 혼자 남는 것 같아서 속상해요.”'};
      if(job.sourceDir==="up")return {title:"자리는 생겼지만 어색함이 남아 있다",text:who+"이(가) 모둠에는 들어가 있지만 친구들과 대화는 많지 않다. 규칙으로 참여는 보장됐지만 관계는 아직 만들어지는 중이다.",dialogue:""};
      return {title:"스스로 다가갈 친구를 정했다",text:who+"이(가) 여러 친구를 살펴보다가 한 명에게 먼저 다가간다. 교사가 정해준 친구가 아니라 본인이 선택한 상대다.",dialogue:who+' “나 너랑 같이 해도 돼?”'};
    }
    if(job.sourceTemplateId==="teacher_defiance"){
      if(job.sourceDir==="left")return {title:"화가 나도 다른 말로 표현하려 한다",text:who+"이(가) 교사의 안내에 불만스러운 표정을 짓지만 지난번처럼 고성을 지르기 전에 배운 표현을 꺼낸다.",dialogue:who+' “저 지금 화났어요. 잠깐 있다가 하면 안 돼요?”'};
      if(job.sourceDir==="down")return {title:"먼저 이유를 설명하려 한다",text:who+"이(가) 안내를 바로 따르지는 않았지만 목소리를 높이기 전에 교사에게 자신의 이유를 말한다.",dialogue:who+' “제가 아까부터 계속 이 부분 때문에 힘들었어요.”'};
      if(job.sourceDir==="up")return {title:"행동은 멈추지만 교사를 피한다",text:who+"이(가) 규칙을 어기지는 않지만 교사가 가까이 오면 시선을 피하고 짧게만 대답한다.",dialogue:who+' “네. 알겠어요.”'};
      return {title:"스스로 복귀 방법을 고른다",text:who+"이(가) 감정이 올라오자 지난번처럼 바로 반발하기보다 잠깐 쉬었다가 다시 참여하는 쪽을 고른다.",dialogue:who+' “저 2분만 있다가 다시 할게요.”'};
    }
    if(job.sourceTemplateId==="presentation_anxiety"){
      if(job.sourceDir==="left")return {title:"이번에는 한 문장을 먼저 말한다",text:who+"의 발표 차례가 다시 왔다. 여전히 긴장하지만 자리에서 짧은 문장 하나를 먼저 말해 보려 한다.",dialogue:who+' “저는… 여기까지는 말할 수 있어요.”'};
      if(job.sourceDir==="down")return {title:"발표 전에 먼저 도움을 요청한다",text:who+"이(가) 발표를 앞두고 숨지 않고 교사에게 어떤 방식이면 할 수 있을지 먼저 묻는다.",dialogue:who+' “앞에 말고 자리에서 하면 안 돼요?”'};
      if(job.sourceDir==="up")return {title:"발표는 하지만 긴장이 크게 남는다",text:who+"이(가) 발표 순서를 피하지는 않았지만 차례가 오기 전부터 손을 꽉 쥐고 있다.",dialogue:""};
      return {title:"자기가 고른 방식으로 발표를 준비한다",text:who+"이(가) 오늘은 친구와 함께 발표하는 방법을 스스로 선택하고 먼저 역할을 나눈다.",dialogue:who+' “나는 첫 문장 할게. 너는 다음 거 해줘.”'};
    }
    if(job.sourceTemplateId==="missing_homework"){
      if(job.sourceDir==="left")return {title:"준비 절차를 실제로 사용했다",text:who+"이(가) 등교 뒤 가방에서 작은 확인표를 꺼내 준비물을 하나씩 확인한다. 빠진 것이 하나 있지만 스스로 먼저 알아챘다.",dialogue:who+' “아, 이건 집에 두고 왔네. 내일 체크해야겠다.”'};
      if(job.sourceDir==="down")return {title:"반복되는 이유가 조금 더 드러났다",text:who+"이(가) 다시 준비물을 빠뜨렸지만 이번에는 변명보다 집에서 준비하기 어려웠던 상황을 먼저 설명한다.",dialogue:who+' “어제 집에서 챙길 시간이 없었어요.”'};
      if(job.sourceDir==="up")return {title:"이번에는 챙겨 왔지만 계속 확인한다",text:who+"이(가) 필요한 것은 모두 챙겨 왔다. 다만 교사에게 몇 번이나 빠진 것이 없는지 확인받으려 한다.",dialogue:who+' “선생님, 오늘은 다 가져왔죠?”'};
      return {title:"자기 계획을 확인하러 왔다",text:who+"이(가) 자신이 세운 준비 계획을 가지고 먼저 교사에게 와서 오늘 결과를 확인하려 한다.",dialogue:who+' “제가 정한 것 중에 하나 빼고 다 했어요.”'};
    }
    if(job.sourceTemplateId==="finished_early"){
      if(job.sourceDir==="left")return {title:"이번에는 스스로 더 어려운 문제를 찾는다",text:who+"이(가) 활동을 일찍 마친 뒤 같은 문제를 더 풀기보다 난도가 높은 문제를 찾는다.",dialogue:who+' “이거보다 어려운 문제도 해봐도 돼요?”'};
      if(job.sourceDir==="down")return {title:"끝낸 뒤 쉬는 시간을 안정적으로 사용한다",text:who+"이(가) 먼저 활동을 끝냈지만 친구들을 방해하지 않고 조용히 책을 꺼내 든다.",dialogue:""};
      if(job.sourceDir==="up")return {title:"추가 문제를 예상하고 기다린다",text:who+"이(가) 활동을 마치자 자연스럽게 추가 문제를 기다린다. 하지만 표정에서는 반복 과제에 대한 흥미가 크지 않아 보인다.",dialogue:who+' “또 문제 풀면 돼요?”'};
      return {title:"남는 시간을 스스로 설계한다",text:who+"이(가) 활동을 끝낸 뒤 오늘은 친구 설명을 선택하고 먼저 도움이 필요한 친구를 찾는다.",dialogue:who+' “누구 도와줘도 돼요?”'};
    }
    return {title:"지난 판단의 결과가 다시 나타났다",text:who+"에게 있었던 '"+job.sourceTitle+"' 상황이 다른 모습으로 다시 나타났다. 이전의 "+prev+" 선택이 학생의 다음 행동에 영향을 준 듯하다.",dialogue:""};
  }
  function followUpChoices(s,job){
    var leftEffects={focus:2,trust:2,classFlow:-3};
    var source=job&&job.sourceTemplateId||"";
    if(["math_foundation_gap","finished_early"].indexOf(source)>=0){leftEffects.learning=4;leftEffects.focus=3}
    else if(["stationery_taken","peer_conflict","social_exclusion"].indexOf(source)>=0){leftEffects.relation=4;leftEffects.mood=2}
    else if(source==="teacher_defiance"){leftEffects.trust=4;leftEffects.classStability=3}
    else if(source==="missing_homework"){leftEffects.focus=4;leftEffects.classStability=2}
    else if(source==="presentation_anxiety"){leftEffects.mood=4;leftEffects.trust=3}
    else if(source==="off_task"){leftEffects.focus=5;leftEffects.classStability=1}
    return {
      up:encounterChoice("지금 나타난 변화를 학급의 기준과 연결해 다시 분명히 확인한다.",{focus:2,trust:-1,classStability:4,classFlow:2},"이번 변화가 우연으로 끝나지 않도록 기준과 기대 행동을 다시 분명하게 했다."),
      down:encounterChoice("학생이 지금 어떻게 느끼는지 듣고 필요한 지원을 조금 조정한다.",{mood:4,trust:4,relation:2,classFlow:-2},"학생의 현재 경험을 다시 확인하면서 이전 개입을 상황에 맞게 조정했다."),
      left:encounterChoice("잘된 점과 아직 어려운 점을 짚고 다음에 사용할 방법을 한 단계 더 연습한다.",leftEffects,"이전 경험을 다음에 사용할 구체적인 방법으로 연결해 한 단계 더 연습했다."),
      right:encounterChoice("이번에는 다음 행동과 목표를 학생이 직접 정하게 한다.",{focus:2,mood:2,trust:3,classStability:0},"이전 경험을 바탕으로 다음 선택의 책임을 학생에게 넘겼다.")
    };
  }
  function applyDelayedFollowUp(job,s,t){
    if(job.applied)return null;
    var before=studentDashboard(s,job.sourceSubject),beforeClass=classDashboard();
    var e=followUpDirectionEffects(job.sourceTemplateId,job.sourceDir,s);
    applyEncounterEffects({studentId:s.id,targetId:t?t.id:null,effectSubject:job.sourceSubject||null},encounterChoice("",e,""),job.sourceDir);
    job.applied=true;
    var after=studentDashboard(s,job.sourceSubject),afterClass=classDashboard();
    job.arrivalDelta=dashboardDelta(before,after);
    job.arrivalBefore=before;job.arrivalAfter=after;job.arrivalBeforeClass=beforeClass;job.arrivalAfterClass=afterClass;
    var d=job.arrivalDelta;
    var labels={learning:"📚 학습",focus:"🎯 집중",mood:"🙂 정서",relation:"🤝 관계",trust:"❤️ 신뢰"};
    var change=Object.keys(labels).filter(function(k){return d[k]}).map(function(k){return labels[k]+" "+(d[k]>0?"+":"")+d[k]}).join(" · ");
    dayEvents.push({
      day:dayIndex,stamp:fmtMin(gameMinute()),text:"후속 변화 · "+s.name+" · "+job.sourceTitle,
      type:"followup_decision",scene:s.scene,script:false,recordable:true,followUpOutcome:true,
      studentId:s.id,targetId:t?t.id:null,sourceDirection:job.sourceDirection,sourceChoice:job.sourceChoice,
      resultText:"이전 선택의 영향이 다음 날의 행동과 상태에 이어졌다.",before:before,after:after,delta:d,
      beforeClass:beforeClass,afterClass:afterClass,changeText:change,metricSubject:job.sourceSubject||null
    });
    dayEvents=dayEvents.slice(-320);
    return d;
  }
  function buildFollowUpEncounter(job){
    var s=studentById(job.studentId),t=studentById(job.targetId);
    if(!s)return null;
    if(t&&t.scene!==s.scene)t=null;
    applyDelayedFollowUp(job,s,t);
    var n=followUpNarrative(job,s,t);
    return {
      id:"enc-"+(++encounterSeq),templateId:"followup_"+job.sourceTemplateId,sourceTemplateId:job.sourceTemplateId,
      category:"후속 · "+(job.sourceTemplateId==="math_foundation_gap"?"학습":"생활"),
      title:n.title,text:n.text,dialogue:n.dialogue||"",studentId:s.id,targetId:t?t.id:null,
      createdAt:gameSec,expiresAt:gameSec+320,choices:followUpChoices(s,job),
      isFollowUp:true,followUpId:job.id,chainDepth:job.chainDepth||1,
      previousDirection:job.sourceDirection,previousChoice:job.sourceChoice,effectSubject:job.sourceSubject||null,
      kicker:"Day "+dayIndex+" · 후속 상황"
    };
  }
  function takeDueFollowUp(){
    if(dayFollowUpsShown>=MAX_FOLLOWUPS_PER_DAY)return null;
    for(var i=0;i<followUpQueue.length;i++){
      var job=followUpQueue[i];
      if(job.status!=="queued"||job.dueDay>dayIndex)continue;
      var s=studentById(job.studentId);
      if(!s||s.scene!==teacherScene||s.targetScene)continue;
      job.status="shown";job.shownDay=dayIndex;
      var enc=buildFollowUpEncounter(job);
      if(enc)return enc;
      job.status="skipped";
    }
    return null;
  }

  var ENCOUNTER_TEMPLATES=[
    {
      id:"stationery_taken",category:"생활지도",title:"말없이 친구 물건을 가져갔다",
      score:function(s){return (s.imp*.45+s.mischief*.35+(1-s.rule)*.35)+(s.action==="TAKE_ITEM_FORCE"?.9:0)},
      build:function(s){
        var target=nearbyStudents(s,28).filter(function(o){return o!==s})[0]||chooseSocialTarget(s,"SOCIAL");
        if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 아무 말 없이 "+target.name+"의 지우개를 집어 들었다. "+target.name+"은(는) 손을 뻗다가 멈췄다.",dialogue:target.name+' “그거 내 건데…”',choices:{
          up:encounterChoice("지금 바로 돌려주게 하고 남의 물건은 허락 없이 쓰지 않는다는 규칙을 확인한다.",{trust:-2,relation:-1,classStability:6,classFlow:3},"물건은 바로 돌아갔고 교실의 기준은 분명해졌다. 다만 "+s.name+"은(는) 이유를 설명할 틈이 적었다."),
          down:encounterChoice("왜 가져갔는지 먼저 듣고 두 학생이 어떤 기분이었는지 차례로 말하게 한다.",{mood:4,trust:4,relation:4,classFlow:-4,classRelationship:4},"시간은 조금 걸렸지만 두 학생이 서로의 입장을 말로 확인했다."),
          left:encounterChoice("물건을 돌려준 뒤 ‘빌려줄래?’라고 묻는 방법을 직접 연습시킨다.",{trust:2,relation:6,classStability:3,classFlow:-3},"상황을 해결하는 데서 끝내지 않고 다음에 사용할 말을 한 번 연습했다."),
          right:encounterChoice("두 학생에게 지금 이 상황을 어떻게 해결할지 직접 정해보게 한다.",{mood:1,trust:2,relation:3,classFlow:2,classStability:-1},"교사는 한 걸음 물러났고 두 학생이 해결 방법을 찾아보기 시작했다.")
        }};
      }
    },
    {
      id:"math_foundation_gap",category:"학습",title:"기초 개념에서 막혀 있다",
      score:function(s){return current().kind==="lesson"&&current().subject==="수학"?Math.max(0,.72-currentMastery(s))*2.2:0},
      build:function(s){
        return {text:"수학 활동 중 "+s.name+"이(가) 받아올림 문제에서 계속 손을 멈춘다. 확인해 보니 앞 단계의 덧셈도 아직 불안정해 보인다.",dialogue:s.name+' “선생님, 여기서부터 잘 모르겠어요.”',choices:{
          up:encounterChoice("오늘 필요한 기초 문제를 정해 반드시 끝내게 한다.",{learning:3,focus:2,mood:-4,trust:-2,classFlow:3,classStability:2},"해야 할 양은 분명해졌지만 "+s.name+"의 표정은 조금 굳었다."),
          down:encounterChoice("오늘은 부담을 줄이고 지금 할 수 있는 수준부터 성공하게 한다.",{learning:1,mood:6,trust:5,classFlow:-1},"과제량은 줄었지만 "+s.name+"이(가) 다시 연필을 들었다."),
          left:encounterChoice("2~3분을 들여 이전 단계부터 직접 다시 설명한다.",{learning:8,focus:3,trust:4,classFlow:-6},"기초 단계부터 다시 짚는 동안 다른 학생들을 보는 시간은 줄었지만 이해의 실마리가 생겼다."),
          right:encounterChoice("설명 다시 듣기·친구와 풀기·연습문제 중 방법을 학생이 고르게 한다.",{learning:3,focus:3,mood:2,trust:3,classFlow:0},"선택한 방법으로 다시 시작하게 하자 "+s.name+"이(가) 자기 방식으로 접근했다.")
        }};
      }
    },
    {
      id:"off_task",category:"수업운영",title:"수업에서 마음이 멀어지고 있다",
      score:function(s){return current().kind==="lesson"&&["TALK","DOODLE","MOVE","LOOK_OUTSIDE","SLEEP"].indexOf(s.action)>=0?.9+s.boredom*.5:0},
      build:function(s){
        return {text:s.name+"이(가) 과제보다 옆자리와 이야기하거나 다른 곳을 보며 수업 흐름에서 벗어나고 있다.",dialogue:s.action==="TALK"?s.name+' “야, 쉬는 시간에 같이 갈래?”':"",choices:{
          up:encounterChoice("이름을 부르고 지금 해야 할 행동을 분명하게 지시한다.",{focus:7,trust:-2,classStability:5,classFlow:4},"행동은 빠르게 수업으로 돌아왔지만 교사의 통제가 강하게 느껴질 수 있다."),
          down:encounterChoice("지금 무엇이 힘든지 짧게 묻고 이유를 듣는다.",{mood:4,trust:5,focus:2,classFlow:-3},"원인을 확인하는 동안 흐름은 잠시 느려졌지만 교사와의 대화가 생겼다."),
          left:encounterChoice("해야 할 일을 한 단계로 잘라 구체적으로 다시 시작하게 한다.",{focus:7,learning:2,trust:2,classFlow:-2},"해야 할 일이 작아지자 다시 시작하기가 쉬워졌다."),
          right:encounterChoice("남은 시간의 목표를 학생이 스스로 정하고 끝나면 확인하기로 한다.",{focus:4,trust:3,mood:1,classStability:1},"스스로 세운 목표를 지킬 책임이 학생에게 넘어갔다.")
        }};
      }
    },
    {
      id:"peer_conflict",category:"또래관계",title:"두 학생의 목소리가 커지고 있다",
      score:function(s){return s.action==="ARGUE"||conflictPartner(s)?1.8+s.frustration:0},
      build:function(s){
        var target=conflictPartner(s)||studentById(s.socialTarget)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"과(와) "+target.name+"의 말다툼이 길어지고 있다. 서로 자기 말만 반복하며 목소리가 점점 커진다.",dialogue:s.name+' “내가 먼저 했잖아.”  ·  '+target.name+' “너도 그랬잖아.”',choices:{
          up:encounterChoice("둘을 즉시 멈추고 떨어뜨린 뒤 규칙 위반 여부부터 확인한다.",{mood:-2,relation:-2,classStability:7,classFlow:3},"갈등은 즉시 중단됐지만 감정은 아직 남아 있다."),
          down:encounterChoice("한 명씩 충분히 말하게 하고 서로의 감정을 확인한다.",{mood:5,trust:4,relation:6,classFlow:-6,classRelationship:5},"시간은 들었지만 서로 왜 화가 났는지 말로 드러났다."),
          left:encounterChoice("사실-기분-원하는 것을 차례로 말하는 방법을 알려주고 다시 말하게 한다.",{relation:7,trust:2,classFlow:-5,classStability:3},"갈등 해결 방법 자체를 연습하는 시간이 됐다."),
          right:encounterChoice("교사는 안전선만 정하고 두 학생이 해결안을 하나 정하도록 맡긴다.",{relation:3,trust:2,classFlow:1,classStability:-2},"해결의 책임은 학생들에게 넘어갔다. 잘 풀릴지는 이후 관계에 달려 있다.")
        }};
      }
    },
    {
      id:"social_exclusion",category:"또래관계",title:"놀이와 모둠에서 자꾸 밀려난다",
      score:function(s){return s.action==="REJECTED"||s.belonging<.48?1.1+(1-s.belonging):0},
      build:function(s){
        return {text:s.name+"이(가) 친구들 곁에 몇 번 다가갔지만 자리가 생기지 않았다. 지금은 조금 떨어진 곳에서 친구들을 보고 있다.",dialogue:s.name+' “나도 같이 하면 안 돼?”',choices:{
          up:encounterChoice("모두가 참여해야 한다는 학급 규칙을 확인하고 자리를 만들어 준다.",{relation:4,mood:2,trust:1,classStability:4,classRelationship:2},"참여 자리는 생겼지만 관계가 자연스럽게 이어질지는 더 지켜봐야 한다."),
          down:encounterChoice(s.name+"의 마음을 먼저 듣고 지금 원하는 관계가 무엇인지 묻는다.",{mood:7,trust:6,relation:2,classFlow:-2},"소속감이 떨어진 이유와 학생이 원하는 것이 조금 더 분명해졌다."),
          left:encounterChoice("친구에게 다가가거나 놀이에 참여할 때 쓸 말을 함께 연습한다.",{relation:6,trust:3,mood:3,classFlow:-3},"다음에 사용할 구체적인 사회적 방법을 하나 준비했다."),
          right:encounterChoice("어느 친구에게 어떤 방식으로 다가갈지 학생이 직접 정하게 한다.",{relation:3,mood:2,trust:4,classStability:0},"교사가 친구를 정해주지 않고 학생이 관계의 다음 행동을 선택했다.")
        }};
      }
    },
    {
      id:"teacher_defiance",category:"생활지도",title:"교사의 안내에 강하게 반발한다",
      score:function(s){return ["REFUSE_INSTRUCTION","SHOUT_TEACHER","INSULT_TEACHER"].indexOf(s.action)>=0?1.9+s.teacherDefiance:0},
      build:function(s){
        return {text:"교사의 안내 직후 "+s.name+"이(가) 큰 목소리로 반발했다. 주변 학생 몇 명이 수업을 멈추고 바라본다.",dialogue:s.speechText||s.name+' “왜 저만 그래요! 자꾸 말하지 마세요!”',choices:{
          up:encounterChoice("선을 분명히 긋고 지금의 말과 행동은 허용되지 않는다고 즉시 알린다.",{trust:-4,mood:-3,classStability:9,classFlow:4},"교실의 경계는 선명해졌지만 학생의 감정은 아직 높다."),
          down:encounterChoice("목소리를 낮춰 지금 화가 난 이유부터 듣고 진정할 시간을 준다.",{trust:7,mood:7,classFlow:-6,classStability:-1},"수업은 잠시 멈췄지만 감정이 낮아질 통로가 생겼다."),
          left:encounterChoice("화가 났을 때 교사에게 말할 수 있는 다른 표현을 구체적으로 알려준다.",{trust:3,mood:2,classStability:4,classFlow:-4},"문제 행동만 막지 않고 대체할 표현을 가르쳤다."),
          right:encounterChoice("수업에 다시 참여하는 방법 두 가지를 제시하고 학생이 하나를 고르게 한다.",{trust:4,focus:3,mood:2,classStability:2},"선택권과 책임을 함께 주면서 수업으로 돌아올 길을 만들었다.")
        }};
      }
    },
    {
      id:"finished_early",category:"학습",title:"너무 빨리 끝내고 심심해한다",
      score:function(s){return current().kind==="lesson"&&currentMastery(s)>.82&&s.focus>.62?.45+currentMastery(s):0},
      build:function(s){
        return {text:s.name+"이(가) 활동을 일찍 끝냈다. 주변 친구들은 아직 과제를 하는 중이고, "+s.name+"은(는) 무엇을 할지 두리번거린다.",dialogue:s.name+' “선생님, 저 다 했는데 이제 뭐 해요?”',choices:{
          up:encounterChoice("추가 문제를 정해 조용히 더 풀게 한다.",{learning:2,focus:4,mood:-2,classFlow:4,classStability:3},"수업 흐름은 안정적이지만 학생에게는 반복 과제로 느껴질 수 있다."),
          down:encounterChoice("충분히 했다고 인정하고 잠깐 쉬거나 책을 보게 한다.",{mood:6,trust:4,learning:0,classFlow:3},"성취를 인정받은 느낌은 커졌지만 학습 확장은 크지 않았다."),
          left:encounterChoice("같은 개념을 더 깊게 생각하는 도전 과제를 준다.",{learning:6,focus:5,mood:2,classFlow:-2},"추가 양보다 난도를 바꿔 학습을 확장했다."),
          right:encounterChoice("도전 문제·독서·친구 설명 중 다음 활동을 스스로 고르게 한다.",{focus:3,mood:4,trust:3,learning:2,classFlow:1},"남는 시간을 어떻게 쓸지 스스로 결정하게 했다.")
        }};
      }
    },
    {
      id:"presentation_anxiety",category:"정서",title:"발표 차례가 다가오자 굳어 버렸다",
      score:function(s){return current().kind==="lesson"&&["question","presentation"].indexOf(lessonState.phase)>=0&&s.assert<.48&&s.rejection>.52?.7+s.rejection:0},
      build:function(s){
        return {text:s.name+"의 발표 차례가 다가오자 시선이 아래로 향하고 목소리가 거의 나오지 않는다.",dialogue:s.name+' “저… 꼭 해야 해요?”',choices:{
          up:encounterChoice("모두가 해야 하는 활동임을 알려주고 짧게라도 발표하게 한다.",{focus:2,mood:-5,trust:-2,classStability:3,classFlow:3},"발표 경험은 남았지만 부담도 크게 느껴졌다."),
          down:encounterChoice("오늘은 건너뛸 수 있게 하고 긴장을 먼저 낮춘다.",{mood:7,trust:6,learning:-1,classFlow:2},"즉각적인 불안은 줄었지만 발표 경험은 다음 기회로 미뤄졌다."),
          left:encounterChoice("자리에서 한 문장 말하기부터 연습한 뒤 발표 여부를 다시 정한다.",{mood:3,trust:4,learning:3,focus:3,classFlow:-4},"작은 단계의 성공을 만든 뒤 다음 행동을 선택할 수 있게 됐다."),
          right:encounterChoice("자리 발표·친구와 함께·앞에서 발표 중 방식을 직접 고르게 한다.",{mood:4,trust:4,focus:2,classFlow:0},"발표 자체는 유지하면서 방식에 대한 선택권을 주었다.")
        }};
      }
    },
    {
      id:"missing_homework",category:"책임",title:"준비한 것이 또 빠져 있다",
      score:function(s){return current().kind==="morning"||current().kind==="lesson"?(1-s.persist)*.45+(1-s.rule)*.25:0},
      build:function(s){
        return {text:s.name+"이(가) 오늘도 필요한 준비물이나 과제를 챙기지 못했다. 수업을 시작하려면 다른 방법이 필요하다.",dialogue:s.name+' “어제 하려고 했는데 깜빡했어요.”',choices:{
          up:encounterChoice("정해진 책임을 확인하고 보충해야 할 일을 분명히 적어 준다.",{trust:-1,focus:2,classStability:4,classFlow:2},"해야 할 책임과 기한이 분명해졌다."),
          down:encounterChoice("왜 반복되는지 생활 상황을 먼저 듣고 부담이 과한지 확인한다.",{mood:4,trust:6,classFlow:-2},"누락 자체보다 반복되는 이유를 확인하는 데 초점을 두었다."),
          left:encounterChoice("알림장·가방 확인 등 준비하는 절차를 함께 만들어 연습한다.",{focus:4,trust:3,classStability:3,classFlow:-3},"다음 날 사용할 구체적인 준비 절차가 생겼다."),
          right:encounterChoice("어떻게 보완할지 학생이 계획을 세우고 다음 날 확인하기로 한다.",{trust:3,focus:2,classStability:1},"보완 계획의 책임을 학생에게 돌려주고 다음 확인 시점을 정했다.")
        }};
      }
    },
    {
      id:"careless_fast_work",category:"학습",title:"빨리 끝냈지만 실수가 많다",
      score:function(s){return current().kind==="lesson"&&currentMastery(s)>.56&&s.imp>.38?.18+s.imp*.48+(1-s.persist)*.25:0},
      build:function(s){
        return {text:s.name+"이(가) 누구보다 빨리 활동지를 덮었다. 그런데 확인해 보니 아는 문제에서도 계산 부호와 조건을 여러 번 놓쳤다.",dialogue:s.name+' “저 다 했어요. 이제 뭐 해요?”',choices:{
          up:encounterChoice("속도보다 정확성이 기준임을 말하고 틀린 부분을 모두 다시 확인하게 한다.",{learning:2,focus:5,mood:-2,classStability:3,classFlow:2},"검토 기준이 분명해졌고 활동지는 다시 펼쳐졌다."),
          down:encounterChoice("빨리 끝내고 싶었던 이유를 묻고 스스로 실수를 발견한 부분부터 인정해 준다.",{mood:4,trust:4,focus:2,classFlow:-2},"실수를 혼내기보다 왜 서둘렀는지 대화가 먼저 이어졌다."),
          left:encounterChoice("검산 순서 세 가지를 알려주고 이번 문제에 바로 적용하게 한다.",{learning:4,focus:6,trust:2,classFlow:-3},"다음에도 쓸 수 있는 구체적인 검토 절차를 연습했다."),
          right:encounterChoice("지금 제출할지 2분 더 검토할지 학생이 선택하게 한다.",{focus:3,mood:2,trust:3,classFlow:1},"제출 시점을 스스로 정하면서 결과에 대한 책임도 함께 맡게 됐다.")
        }};
      }
    },
    {
      id:"mistake_shutdown",category:"정서",title:"한 번 틀린 뒤 손을 놓아버렸다",
      score:function(s){return current().kind==="lesson"&&s.rejection>.56&&s.frustration>.16?.25+s.rejection*.52+s.react*.22:0},
      build:function(s){
        return {text:s.name+"이(가) 한 문제를 틀린 뒤 지우개를 내려놓고 더 이상 쓰지 않는다. 답을 보라는 말에도 고개를 숙인 채 움직이지 않는다.",dialogue:s.name+' “저 원래 못해요.”',choices:{
          up:encounterChoice("틀리는 것은 괜찮지만 활동을 중단할 수는 없다고 분명히 하고 다시 시작하게 한다.",{focus:4,mood:-3,trust:-1,classStability:4,classFlow:2},"활동은 다시 시작됐지만 실패감 자체는 아직 남아 있다."),
          down:encounterChoice("지금 속상한 마음을 먼저 인정하고 잠깐 쉬었다가 돌아오게 한다.",{mood:7,trust:6,focus:1,classFlow:-3},"감정이 가라앉을 시간을 확보한 뒤 다시 시도할 여지를 만들었다."),
          left:encounterChoice("틀린 문제를 아주 작은 단계로 나눠 첫 단계만 함께 성공해 본다.",{learning:4,focus:4,mood:4,trust:4,classFlow:-4},"실패 전체가 아니라 할 수 있는 한 단계부터 다시 연결했다."),
          right:encounterChoice("다시 풀기·비슷한 쉬운 문제·도움 요청 중 다음 행동을 고르게 한다.",{focus:3,mood:3,trust:3,classFlow:0},"학생이 다시 참여하는 방식 자체를 선택하게 했다.")
        }};
      }
    },
    {
      id:"help_refusal",category:"학습",title:"힘들어 보이지만 도움은 거절한다",
      score:function(s){return current().kind==="lesson"&&s.frustration>.28&&s.assert>.38?.18+s.assert*.30+s.rejection*.28+(1-s.trust)*.24:0},
      build:function(s){
        return {text:s.name+"이(가) 같은 문제에서 오래 멈춰 있지만 교사가 다가가자 활동지를 가리며 괜찮다고 한다.",dialogue:s.name+' “아니에요. 저 혼자 할 수 있어요.”',choices:{
          up:encounterChoice("도움을 거부해도 지금 확인이 필요한 부분은 함께 보겠다고 말한다.",{learning:2,focus:3,trust:-2,classStability:2,classFlow:-1},"확인은 진행됐지만 학생은 개입을 강하게 의식했다."),
          down:encounterChoice("당장 묻지 않고 준비되면 부르라고 한 뒤 거리를 둔다.",{mood:5,trust:5,learning:0,classFlow:2},"압박은 줄었고 도움을 요청할 선택지가 남았다."),
          left:encounterChoice("정답 대신 첫 단서 하나만 건네고 혼자 이어가게 한다.",{learning:4,focus:3,trust:3,classFlow:-1},"도움의 양을 줄여 독립적으로 이어갈 여지를 만들었다."),
          right:encounterChoice("힌트 받기·예시 보기·혼자 더 해보기 중 하나를 고르게 한다.",{learning:2,focus:2,mood:2,trust:4,classFlow:0},"도움을 받을 방식과 시점을 학생이 직접 정했다.")
        }};
      }
    },
    {
      id:"question_monopoly",category:"수업운영",title:"한 학생이 질문을 거의 독점한다",
      score:function(s){return current().kind==="lesson"&&["question","presentation"].indexOf(lessonState.phase)>=0&&s.verbal>.62&&s.assert>.58?.20+s.verbal*.34+s.assert*.30+s.soc*.18:0},
      build:function(s){
        return {text:s.name+"이(가) 질문마다 손을 들고 다른 학생의 대답 중에도 자신의 생각을 덧붙인다. 몇몇 학생은 손을 내렸다.",dialogue:s.name+' “선생님, 저 또 말해도 돼요?”',choices:{
          up:encounterChoice("한 번 말했으면 다음 차례를 기다리는 규칙을 즉시 적용한다.",{focus:2,mood:-2,trust:-1,classStability:5,classFlow:3},"발언 순서는 빠르게 정리됐고 다른 학생의 차례가 확보됐다."),
          down:encounterChoice("말하고 싶은 마음을 인정하면서 다른 친구도 기다리고 있음을 조용히 알려준다.",{mood:3,trust:4,relation:2,classFlow:-2},"학생의 참여 의욕을 꺾지 않으면서 다른 학생을 볼 수 있게 했다."),
          left:encounterChoice("질문을 메모해 두었다가 마지막에 묻는 방법을 가르쳐 준다.",{focus:4,trust:2,classStability:2,classFlow:-2},"발언 욕구를 없애기보다 기다리는 구체적 방법을 연습했다."),
          right:encounterChoice("오늘 남은 시간에 자신이 꼭 말하고 싶은 질문 두 개를 직접 고르게 한다.",{focus:3,mood:2,trust:3,classFlow:1},"발언의 양을 스스로 조절하도록 선택권과 책임을 함께 줬다.")
        }};
      }
    },
    {
      id:"group_dominates",category:"협동",title:"모둠에서 혼자 결정을 다 한다",
      score:function(s){return current().kind==="lesson"&&lessonState.phase==="pair"&&s.assert>.62&&s.compete>.58?.24+s.assert*.38+s.compete*.32:0},
      build:function(s){
        var target=studentById(s.lessonPartner)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 모둠 활동의 역할과 답을 빠르게 정하고 "+target.name+"에게 그대로 하라고 말한다. "+target.name+"은(는) 거의 의견을 내지 못하고 있다.",dialogue:s.name+' “그냥 내가 정한 대로 하면 돼.”',choices:{
          up:encounterChoice("역할을 다시 나누고 한 사람씩 반드시 의견을 말하도록 규칙을 정한다.",{relation:2,focus:2,trust:-1,classStability:5,classFlow:1},"발언 구조가 강제로라도 균형을 되찾았다."),
          down:encounterChoice("왜 혼자 결정하려는지 묻고 상대 학생의 답답함도 함께 듣게 한다.",{mood:2,trust:4,relation:4,classFlow:-4},"두 학생의 의도와 감정이 드러나며 활동 속도는 잠시 느려졌다."),
          left:encounterChoice("의견 묻기-기다리기-합의하기 순서를 실제로 한 번 연습시킨다.",{relation:6,focus:3,trust:2,classFlow:-4},"협동의 방법 자체를 구체적으로 연습했다."),
          right:encounterChoice("두 학생이 역할 분담 방식을 직접 다시 정하되 둘 다 동의해야 한다고 한다.",{relation:4,trust:3,classStability:0,classFlow:0},"교사가 답을 정하지 않고 합의의 책임을 두 학생에게 맡겼다.")
        }};
      }
    },
    {
      id:"group_silent",category:"협동",title:"모둠에서 아무 말도 하지 않는다",
      score:function(s){return current().kind==="lesson"&&lessonState.phase==="pair"&&s.assert<.48&&s.rejection>.55?.24+(1-s.assert)*.36+s.rejection*.34:0},
      build:function(s){
        var target=studentById(s.lessonPartner)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 짝 활동 내내 고개만 끄덕이고 자신의 생각은 거의 말하지 않는다. "+target.name+"이(가) 대부분의 답을 대신 정하고 있다.",dialogue:target.name+' “너는 어떻게 생각해?” · '+s.name+' “그냥 네가 한 걸로 해.”',choices:{
          up:encounterChoice("이번 문제는 반드시 본인이 먼저 한 문장을 말하게 한다.",{focus:3,mood:-2,trust:-1,classStability:3,classFlow:1},"참여는 확보됐지만 발표 부담도 함께 올라갔다."),
          down:encounterChoice("지금 말하기 어려운 이유를 조용히 확인하고 기다릴 시간을 준다.",{mood:6,trust:6,relation:2,classFlow:-3},"침묵을 바로 고치기보다 안전하게 말할 준비를 먼저 만들었다."),
          left:encounterChoice("‘나는 ___라고 생각해’ 문장 틀을 주고 짧게 말하는 연습부터 한다.",{focus:3,mood:3,trust:3,relation:4,classFlow:-3},"말할 내용을 만드는 부담을 줄여 작은 참여를 연습했다."),
          right:encounterChoice("말하기·적어서 보여주기·그림으로 설명하기 중 표현 방식을 고르게 한다.",{focus:2,mood:4,trust:4,relation:2,classFlow:0},"생각을 표현하는 방법을 학생이 직접 선택했다.")
        }};
      }
    },
    {
      id:"copies_answer",category:"학습",title:"친구 답을 그대로 옮겨 적는다",
      score:function(s){return current().kind==="lesson"&&currentMastery(s)<.58&&s.persist<.60&&s.soc>.38?.18+(1-currentMastery(s))*.42+(1-s.persist)*.25:0},
      build:function(s){
        var target=studentById(s.socialTarget)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 문제를 풀다 멈춘 뒤 "+target.name+"의 활동지를 여러 번 보고 같은 답을 그대로 적는다.",dialogue:s.name+' “잠깐만 보여줘. 나도 거의 다 했어.”',choices:{
          up:encounterChoice("답을 베껴 쓰는 것은 허용되지 않는다고 분명히 하고 해당 문제를 다시 풀게 한다.",{learning:2,focus:3,mood:-2,trust:-2,classStability:5,classFlow:2},"행동의 경계는 분명해졌고 문제는 다시 시작됐다."),
          down:encounterChoice("왜 친구 답을 보게 됐는지 묻고 막힌 지점을 먼저 듣는다.",{mood:4,trust:5,learning:1,classFlow:-3},"부정행동만 보지 않고 그 전에 있던 어려움을 확인했다."),
          left:encounterChoice("친구 답은 가리고 첫 단계 힌트만 주어 자기 풀이를 다시 만들게 한다.",{learning:6,focus:4,trust:3,classFlow:-4},"정답을 옮기는 대신 자기 풀이를 만들 수 있도록 발판을 줬다."),
          right:encounterChoice("혼자 다시 풀기·힌트 받기·설명 듣기 중 다시 시작할 방법을 고르게 한다.",{learning:3,focus:2,trust:3,classFlow:0},"부정행동 이후의 복구 방법을 스스로 선택하게 했다.")
        }};
      }
    },
    {
      id:"teasing_boundary",category:"또래관계",title:"장난인데 상대는 웃지 않는다",
      score:function(s){var free=["break","lunchplay"].indexOf(current().kind)>=0;return s.action==="TEASE"||(free&&s.mischief>.50&&s.soc>.58)?.22+s.mischief*.44+s.soc*.18:0},
      build:function(s){
        var target=studentById(s.socialTarget)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"은(는) 웃으며 장난을 계속하지만 "+target.name+"의 표정은 점점 굳고 있다. 둘이 느끼는 ‘장난’의 선이 달라 보인다.",dialogue:s.name+' “아, 장난이잖아.” · '+target.name+' “난 싫다고 했잖아.”',choices:{
          up:encounterChoice("상대가 싫다고 하면 즉시 멈추는 것이 규칙이라고 분명히 한다.",{relation:-1,trust:-1,classStability:6,classRelationship:2},"장난은 바로 멈췄고 동의의 기준이 분명해졌다."),
          down:encounterChoice("두 학생이 각각 어떻게 느꼈는지 말하게 하고 차이를 확인한다.",{mood:3,trust:4,relation:5,classFlow:-3,classRelationship:4},"같은 행동을 서로 다르게 느꼈다는 점이 드러났다."),
          left:encounterChoice("장난 전 확인하기와 ‘그만’이라는 말을 들으면 멈추는 방법을 연습한다.",{relation:6,trust:2,classStability:3,classFlow:-2},"다음 놀이에서 사용할 구체적인 경계 확인 방법을 배웠다."),
          right:encounterChoice("두 학생이 계속 놀지, 방식을 바꿀지, 잠시 떨어질지 직접 정하게 한다.",{relation:3,mood:2,trust:3,classStability:0},"관계를 이어갈 방식의 책임을 두 학생에게 맡겼다.")
        }};
      }
    },
    {
      id:"fairness_complaint",category:"생활지도",title:"‘왜 쟤는 되고 저는 안 돼요?’",
      score:function(s){return ["lesson","break","lunchplay"].indexOf(current().kind)>=0&&s.rule>.70&&s.react>.32?.18+s.rule*.38+s.react*.28+s.compete*.16:0},
      build:function(s){
        return {text:s.name+"이(가) 다른 학생에게 적용된 예외 상황을 보고 자신도 똑같이 해야 한다며 교사에게 따진다.",dialogue:s.name+' “왜 쟤는 되는데 저는 안 돼요? 그건 불공평하잖아요.”',choices:{
          up:encounterChoice("같은 규칙과 필요한 예외를 교사가 판단한다는 기준을 분명히 설명한다.",{trust:-1,focus:2,classStability:5,classFlow:3},"교사의 기준은 명확해졌지만 학생이 완전히 납득했는지는 더 지켜봐야 한다."),
          down:encounterChoice("불공평하게 느낀 이유를 먼저 듣고 학생의 관점에서 상황을 다시 확인한다.",{mood:4,trust:5,classFlow:-3},"학생이 왜 불공평하다고 느꼈는지 충분히 말할 기회를 가졌다."),
          left:encounterChoice("공평과 똑같음의 차이를 현재 사례로 짧게 설명하고 비교해 본다.",{learning:2,focus:3,trust:3,classFlow:-2},"공평함을 판단하는 기준 자체를 학습하는 장면으로 연결했다."),
          right:encounterChoice("어떤 설명이나 조건이면 자신이 납득할 수 있을지 학생에게 제안하게 한다.",{trust:3,mood:2,focus:1,classFlow:0},"학생이 단순 항의에서 벗어나 납득 가능한 기준을 직접 생각해 보게 됐다.")
        }};
      }
    },
    {
      id:"game_loss",category:"정서",title:"게임에서 지자 감정이 폭발한다",
      score:function(s){var play=["break","lunchplay"].indexOf(current().kind)>=0||current().subject==="체육";return play&&s.compete>.65&&s.react>.45?.24+s.compete*.42+s.react*.36:0},
      build:function(s){
        var target=studentById(s.socialTarget)||chooseSocialTarget(s,"COMPETE");
        return {targetId:target?target.id:null,text:s.name+"이(가) 게임에서 진 뒤 공을 밀어놓고 결과가 이상하다며 목소리를 높인다. 주변 친구들도 눈치를 보기 시작한다.",dialogue:s.name+' “아니, 그건 반칙이었잖아! 다시 해야 돼!”',choices:{
          up:encounterChoice("결과는 바뀌지 않으며 화가 나도 규칙을 지켜야 한다고 즉시 정리한다.",{mood:-3,trust:-1,classStability:6,classFlow:3},"게임은 빠르게 정리됐지만 패배 감정은 그대로 남아 있다."),
          down:encounterChoice("지고 나서 화가 난 마음을 인정하고 잠시 떨어져 진정할 시간을 준다.",{mood:7,trust:5,classFlow:-3},"승패보다 감정을 가라앉힐 공간을 먼저 만들었다."),
          left:encounterChoice("졌을 때 사용할 말과 다음 게임을 기다리는 행동을 구체적으로 연습한다.",{mood:3,focus:3,trust:2,relation:3,classFlow:-2},"패배 상황에서 쓸 대체 행동을 실제로 연습했다."),
          right:encounterChoice("계속 참여·잠깐 쉬기·심판 역할 중 다음 행동을 학생이 고르게 한다.",{mood:4,trust:3,focus:2,classFlow:0},"감정을 정리한 뒤 다음 참여 방식을 학생이 선택했다.")
        }};
      }
    },
    {
      id:"friend_dependency",category:"또래관계",title:"한 친구와 떨어지면 아무것도 못 한다",
      score:function(s){var free=["break","lunchplay"].indexOf(current().kind)>=0;return free&&s.rejection>.60&&s.soc>.40?.18+s.rejection*.40+s.soc*.20+(1-s.assert)*.18:0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 쉬는시간 내내 "+target.name+"만 따라다닌다. "+target.name+"이 다른 친구와 놀려고 하자 금세 표정이 어두워졌다.",dialogue:s.name+' “나랑만 놀면 안 돼?”',choices:{
          up:encounterChoice("친구에게도 다른 친구와 놀 자유가 있음을 분명히 하고 따라다니는 행동을 멈추게 한다.",{mood:-2,relation:-1,trust:-1,classStability:4},"경계는 분명해졌지만 혼자 남는 불안은 아직 해결되지 않았다."),
          down:encounterChoice("친구와 떨어질 때 어떤 마음이 드는지 충분히 듣고 불안을 먼저 다룬다.",{mood:7,trust:6,relation:2,classFlow:-2},"관계 행동 뒤에 있던 불안과 걱정이 말로 드러났다."),
          left:encounterChoice("다른 친구에게 다가갈 말과 혼자 할 수 있는 놀이 하나를 함께 연습한다.",{relation:5,mood:3,trust:3,classFlow:-2},"한 친구에게만 의존하지 않을 구체적인 다음 행동을 준비했다."),
          right:encounterChoice("오늘 새로 같이 있어볼 친구나 혼자 할 놀이를 학생이 직접 고르게 한다.",{relation:3,mood:3,trust:4,classFlow:0},"관계를 넓히는 다음 선택을 학생이 직접 정했다.")
        }};
      }
    },
    {
      id:"overhelping_friend",category:"협동",title:"도와주다가 친구 몫까지 해버린다",
      score:function(s){var coop=current().kind==="lesson"&&lessonState.phase==="pair"||["break","lunchplay"].indexOf(current().kind)>=0;return coop&&s.helpful>.76&&s.empathy>.74?.18+s.helpful*.38+s.empathy*.30:0},
      build:function(s){
        var target=studentById(s.lessonPartner)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) "+target.name+"을(를) 도와주다가 설명보다 먼저 답을 써주거나 준비를 대신해 주고 있다.",dialogue:s.name+' “내가 해줄게. 이게 더 빨라.”',choices:{
          up:encounterChoice("도움은 대신 해주는 것이 아니라는 규칙을 분명히 하고 손을 떼게 한다.",{relation:1,trust:-1,classStability:4,classFlow:2},"역할 경계는 빨리 정리됐지만 돕고 싶은 마음은 제동이 걸렸다."),
          down:encounterChoice("왜 대신 해주고 싶었는지 묻고 두 학생이 각각 어떻게 느꼈는지 듣는다.",{mood:3,trust:4,relation:4,classFlow:-3},"도움의 의도와 받는 학생의 입장을 함께 확인했다."),
          left:encounterChoice("정답 대신 질문하거나 힌트를 주는 도움 방법을 구체적으로 연습한다.",{relation:5,learning:2,trust:2,classFlow:-3},"도움을 ‘대신 하기’에서 ‘생각하게 돕기’로 바꾸는 연습을 했다."),
          right:encounterChoice("상대가 원하는 도움 수준을 먼저 묻고 그 범위만 돕게 한다.",{relation:5,trust:3,classFlow:0},"도움의 양을 받는 학생이 선택하도록 관계의 책임을 나눴다.")
        }};
      }
    },
    {
      id:"cleanup_avoidance",category:"책임",title:"청소 시간마다 슬쩍 빠진다",
      score:function(s){return current().kind==="closing"&&s.persist<.64?.24+(1-s.persist)*.42+(1-s.rule)*.28+s.mischief*.16:0},
      build:function(s){
        return {text:"청소가 시작되자 "+s.name+"이(가) 물을 마시러 간다며 자리를 비웠다가 일이 거의 끝날 때쯤 돌아왔다.",dialogue:s.name+' “저 아까도 했는데요?”',choices:{
          up:encounterChoice("맡은 청소 구역을 다시 확인하고 끝날 때까지 책임지게 한다.",{focus:2,mood:-2,trust:-1,classStability:5,classFlow:2},"맡은 역할과 완료 기준이 분명해졌다."),
          down:encounterChoice("청소를 피하는 이유가 힘듦인지 불만인지 먼저 듣는다.",{mood:4,trust:5,classFlow:-2},"회피 행동 뒤에 있는 이유를 확인할 기회를 가졌다."),
          left:encounterChoice("청소 일을 작은 단계로 나누고 시작-확인 순서를 함께 만들어 준다.",{focus:4,trust:3,classStability:3,classFlow:-2},"막연한 청소를 구체적인 행동 순서로 바꿨다."),
          right:encounterChoice("칠판·바닥·정리 중 맡을 일을 직접 고르고 끝난 뒤 확인받게 한다.",{focus:3,mood:2,trust:3,classStability:2},"역할 선택권과 완료 책임을 함께 줬다.")
        }};
      }
    },
    {
      id:"after_lunch_sleepy",category:"수업운영",title:"점심 뒤 눈을 뜨기 힘들어한다",
      score:function(s){return current().kind==="lesson"&&current().start>=780&&s.energy<.72?.16+(1-s.energy)*.52+s.sleepNeed*.32:0},
      build:function(s){
        return {text:"점심시간 뒤 수업에서 "+s.name+"의 눈이 자꾸 감긴다. 설명을 들으려 하지만 자세가 무너지고 필기가 점점 느려진다.",dialogue:s.name+' “안 자려고 하는데 너무 졸려요.”',choices:{
          up:encounterChoice("지금은 수업 시간이니 자세를 바로 하고 끝까지 참여하게 한다.",{focus:4,mood:-2,trust:-1,classStability:4,classFlow:3},"수업 참여는 유지됐지만 피로 자체는 해결되지 않았다."),
          down:encounterChoice("상태를 확인하고 잠깐 물을 마시거나 몸을 풀 시간을 준다.",{mood:4,trust:4,focus:3,classFlow:-2},"짧은 회복 시간을 준 뒤 다시 참여할 여지를 만들었다."),
          left:encounterChoice("듣기만 하는 대신 짧은 활동이나 체크 문제로 참여 방식을 바꿔 준다.",{focus:6,learning:2,trust:2,classFlow:-2},"졸림 속에서도 참여할 수 있는 구체적인 행동으로 전환했다."),
          right:encounterChoice("서서 듣기·물 마시기·앞자리 이동 중 자신에게 맞는 방법을 고르게 한다.",{focus:4,mood:2,trust:3,classFlow:0},"자기 상태를 조절할 방법을 학생이 직접 선택했다.")
        }};
      }
    },
    {
      id:"praise_embarrassment",category:"정서",title:"칭찬을 받자 오히려 숨는다",
      score:function(s){return current().kind==="lesson"&&isPositiveAction(s)&&s.rejection>.58&&s.assert<.55?.16+s.rejection*.42+(1-s.assert)*.28:0},
      build:function(s){
        return {text:s.name+"이(가) 잘한 일을 공개적으로 칭찬받자 얼굴이 빨개지고 주변을 살핀다. 다음 활동에서는 오히려 손을 들지 않으려 한다.",dialogue:s.name+' “다들 보잖아요… 그냥 말 안 하면 안 돼요?”',choices:{
          up:encounterChoice("잘한 일은 인정받아야 한다며 칭찬을 그대로 받아들이도록 한다.",{mood:-2,trust:-1,focus:1,classStability:2},"칭찬의 의미는 분명했지만 학생의 부담감은 남았다."),
          down:encounterChoice("공개 칭찬이 부담스러웠는지 묻고 다음에는 어떻게 해주면 좋을지 듣는다.",{mood:6,trust:6,classFlow:-2},"칭찬도 학생마다 다르게 느껴질 수 있다는 점을 반영했다."),
          left:encounterChoice("구체적인 행동을 조용히 개인적으로 피드백하는 방식으로 바꿔 준다.",{mood:4,trust:5,focus:2,classFlow:-1},"학생이 받아들이기 쉬운 형태로 피드백 방법을 조정했다."),
          right:encounterChoice("공개 칭찬·개인 피드백·기록만 하기 중 원하는 방식을 고르게 한다.",{mood:4,trust:5,focus:1,classFlow:0},"인정받는 방식에 대한 선택권을 학생에게 줬다.")
        }};
      }
    },
    {
      id:"rule_policing_peer",category:"또래관계",title:"친구를 선생님처럼 계속 지적한다",
      score:function(s){return ["lesson","break"].indexOf(current().kind)>=0&&s.rule>.80&&s.assert>.45&&s.soc>.40?.18+s.rule*.42+s.assert*.22:0},
      build:function(s){
        var target=studentById(s.socialTarget)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 친구가 조금만 규칙에서 벗어나도 바로 지적한다. "+target.name+"은(는) 점점 짜증난 표정으로 대꾸한다.",dialogue:s.name+' “선생님이 그러면 안 된다고 했잖아.” · '+target.name+' “네가 선생님이야?”',choices:{
          up:encounterChoice("규칙을 지키는 것과 친구를 통제하는 것은 다르며 지도는 교사가 한다고 선을 긋는다.",{relation:1,trust:0,classStability:5,classFlow:2},"역할의 경계와 학급 규칙의 주체가 분명해졌다."),
          down:encounterChoice("규칙이 어겨질 때 왜 그렇게 불편한지 듣고 친구의 기분도 함께 살펴본다.",{mood:3,trust:5,relation:4,classFlow:-3},"규칙 민감성과 또래의 감정을 함께 볼 수 있게 했다."),
          left:encounterChoice("친구를 지적하기보다 도움이 필요할 때 교사에게 알리는 기준을 구체적으로 가르친다.",{relation:4,focus:3,trust:3,classStability:3,classFlow:-2},"규칙을 지키고 싶을 때 사용할 적절한 행동을 새로 배웠다."),
          right:encounterChoice("정말 위험하거나 방해되는 일만 알리기 위한 자기 기준을 학생이 정하게 한다.",{relation:3,trust:3,focus:2,classFlow:0},"모든 규칙 위반을 통제하기보다 개입할 상황을 스스로 구분하게 했다.")
        }};
      }
    }
  ];

  function periodEncounterCap(p){
    if(!p)return 0;
    if(p.kind==="closing")return 1;
    if(p.kind==="lesson")return 2;
    return 1;
  }
  function periodEncounterCount(){
    return periodEncounterCounts[periodIndex]||0;
  }
  function encounterBudgetRemaining(){
    return Math.max(0,dayEncounterBudget-dayEncounterOffered);
  }
  function markEncounterOffered(enc){
    dayEncounterOffered++;
    periodEncounterCounts[periodIndex]=(periodEncounterCounts[periodIndex]||0)+1;
    if(enc&&enc.isFollowUp)dayFollowUpsShown++;
  }

  function weightedPick(items){
    if(!items.length)return null;
    var total=items.reduce(function(sum,x){return sum+x.weight},0),r=Math.random()*total;
    for(var i=0;i<items.length;i++){r-=items[i].weight;if(r<=0)return items[i]}
    return items[items.length-1];
  }
  function makeEncounter(){
    var due=takeDueFollowUp();
    if(due)return due;
    var visible=students.filter(function(s){return s.scene===teacherScene&&!s.targetScene});
    var candidates=[];
    visible.forEach(function(s){
      ENCOUNTER_TEMPLATES.forEach(function(t){
        var weight=Math.max(0,Number(t.score(s))||0)*traitEncounterMultiplier(s,t.id);
        var recent=encounterHistory.slice(-8).some(function(h){return h.templateId===t.id&&h.studentId===s.id});
        if(weight>.12&&!recent)candidates.push({student:s,template:t,weight:weight});
      });
    });
    if(!candidates.length)return null;
    var picked=weightedPick(candidates),built=picked.template.build(picked.student);
    if(!built)return null;
    return Object.assign({
      id:"enc-"+(++encounterSeq),templateId:picked.template.id,category:picked.template.category,
      title:picked.template.title,studentId:picked.student.id,targetId:null,
      createdAt:gameSec,expiresAt:gameSec+260,choices:{}
    },built);
  }
  function scheduleNextEncounter(min,max){nextEncounterAt=gameSec+rand(min||420,max||760)}
  function maybeSpawnEncounter(){
    if(dayEnded||pendingEncounter||activeEncounter||reportOpen||toolModalKind||tutorialState.active||gameSec<nextEncounterAt)return;
    if(dayEncounterOffered>=dayEncounterBudget){nextEncounterAt=Number.POSITIVE_INFINITY;return}
    var cap=periodEncounterCap(current());
    if(cap<=0){nextEncounterAt=current().end*60+180;return}
    if(periodEncounterCount()>=cap){
      nextEncounterAt=Math.max(gameSec+120,current().end*60+rand(90,240));
      return;
    }
    var enc=makeEncounter();
    if(enc){
      pendingEncounter=enc;markEncounterOffered(enc);renderEncounterToken();
    }else scheduleNextEncounter(700,1300);
  }
  function renderEncounterToken(){
    var token=q("#encounterToken");
    if(!token)return;
    if(!pendingEncounter||activeEncounter||reportOpen||toolModalKind||tutorialState.active){
      token.hidden=true;return;
    }
    if(gameSec>=pendingEncounter.expiresAt){
      if(pendingEncounter.followUpId){
        var expiredJob=followUpQueue.find(function(j){return j.id===pendingEncounter.followUpId});
        if(expiredJob){expiredJob.status="queued";expiredJob.dueDay=Math.max(dayIndex+1,expiredJob.dueDay)}
      }
      pendingEncounter=null;scheduleNextEncounter(900,1500);token.hidden=true;return;
    }
    var s=studentById(pendingEncounter.studentId);
    if(!s||s.scene!==teacherScene){token.hidden=true;return}
    token.hidden=false;token.style.left=s.x+"%";token.style.top=Math.max(12,s.y-5)+"%";
    var tokenLabel=token.querySelector("small");if(tokenLabel)tokenLabel.textContent=pendingEncounter.isFollowUp?"후속":"상황";
    token.classList.toggle("followup",!!pendingEncounter.isFollowUp);
    token.title=pendingEncounter.title;token.setAttribute("aria-label",s.name+"의 "+(pendingEncounter.isFollowUp?"후속 ":"")+"판단 상황: "+pendingEncounter.title);
  }
  function openPendingEncounter(){
    if(!pendingEncounter||activeEncounter)return;
    activeEncounter=pendingEncounter;pendingEncounter=null;
    activeEncounter.phase="choice";activeEncounter.deadline=performance.now()+12000;
    encounterWasRunning=running;running=false;
    renderEncounter();
  }
  function renderEncounter(){
    var overlay=q("#encounterOverlay");if(!overlay)return;
    if(!activeEncounter){overlay.hidden=true;return}
    overlay.hidden=false;
    var enc=activeEncounter,s=studentById(enc.studentId),t=studentById(enc.targetId);
    q("#encounterCategory").textContent=enc.category+" · 4방향 판단";
    q("#encounterKicker").textContent=enc.kicker||current().name;
    var card=q("#encounterCard");if(card)card.classList.toggle("followup",!!enc.isFollowUp);
    q("#encounterTitle").textContent=enc.title;
    q("#encounterText").textContent=enc.text;
    var traitHint=s?traitLabels(s,3).join(" · "):"";
    q("#encounterStudent").textContent=[s&&s.name,t&&t.name].filter(Boolean).join(" · ")+(traitHint?" · "+traitHint:"")+(enc.isFollowUp?" · 이전 판단: "+(enc.previousDirection||""):"");
    var dialogue=q("#encounterDialogue");dialogue.hidden=!enc.dialogue;dialogue.textContent=enc.dialogue||"";
    ["up","down","left","right"].forEach(function(dir){
      var cap=dir.charAt(0).toUpperCase()+dir.slice(1),choice=enc.choices[dir];
      q("#encounterChoice"+cap).textContent=choice?choice.text:"";
      q("#encounterEffect"+cap).textContent=choice?effectHint(choice.effects):"";
      var button=q('[data-encounter-dir="'+dir+'"]');if(button)button.disabled=!choice||enc.phase!=="choice";
    });
    q("#encounterResult").hidden=enc.phase!=="result";
    var reactionBox=q("#encounterReaction");if(reactionBox&&enc.phase!=="result"){reactionBox.hidden=true;reactionBox.textContent=""}
    q("#encounterCard").hidden=enc.phase==="result";
    qa(".encounter-choice").forEach(function(b){b.hidden=enc.phase==="result"});
    if(enc.phase==="choice")updateEncounterClock(performance.now());
  }
  function updateEncounterClock(now){
    if(!activeEncounter||activeEncounter.phase!=="choice")return;
    var remain=Math.max(0,activeEncounter.deadline-now),ratio=clamp(remain/12000);
    q("#encounterTimerText").textContent=(remain/1000).toFixed(1)+"초";
    q("#encounterTimerFill").style.transform="scaleX("+ratio+")";
    if(remain<=0)resolveEncounter("timeout");
  }
  function applyEncounterLearning(s,points,subjectOverride){
    if(!points)return;
    var subject=subjectOverride||current().subject,model=subjectModel(subject);
    if(model&&s.knowledge&&s.knowledge[subject]){
      var node=s.knowledge[subject][model.focus];
      node.mastery=clamp(node.mastery+points/100);
      var weak=weakestConcept(s,subject);
      if(weak&&weak!==model.focus)s.knowledge[subject][weak].mastery=clamp(s.knowledge[subject][weak].mastery+points/350);
    }else s.academic=clamp((s.academic||.5)+points/120);
  }
  function applyEncounterEffects(enc,choice,dir){
    var s=studentById(enc.studentId),t=studentById(enc.targetId),e=choice.effects||{};
    if(!s)return;
    function personal(key){var v=e[key]||0;return v*responseStyleMultiplier(s,dir,v)}
    var learning=personal("learning"),focus=personal("focus"),mood=personal("mood"),relationValue=personal("relation"),trustValue=personal("trust");
    applyEncounterLearning(s,learning,enc&&enc.effectSubject);
    s.focus=clamp(s.focus+focus/100);
    s.mood=clamp(s.mood+mood/100);
    s.belonging=clamp(s.belonging+relationValue/100);
    s.trust=clamp(s.trust+trustValue/100);
    if(t&&relationValue){
      t.belonging=clamp(t.belonging+relationValue/180);
      changeRelation(s,t,{affinity:relationValue/140,irritation:-Math.max(0,relationValue)/220});
    }
    if(t&&mood)t.mood=clamp(t.mood+mood/220);
    var classReaction=dir&&dir!=="timeout"?(.88+((s.teacherResponse&&s.teacherResponse.sensitivity)||1)*.12):1;
    classMetrics.flow=clamp(classMetrics.flow+(e.classFlow||0)*classReaction,0,100);
    classMetrics.relationship=clamp(classMetrics.relationship+(e.classRelationship||0)+(relationValue||0)*.18,0,100);
    classMetrics.stability=clamp(classMetrics.stability+(e.classStability||0)*classReaction,0,100);
    classMetrics.trust=clamp(classMetrics.trust+(e.classTrust||0)+(trustValue||0)*.12,0,100);
  }
  function decisionDeltaHtml(delta,beforeClass,afterClass){
    var labels={learning:"📚 학습",focus:"🎯 집중",mood:"🙂 정서",relation:"🤝 관계",trust:"❤️ 신뢰"};
    var html=Object.keys(labels).map(function(k){
      var d=delta[k]||0,cls=d>0?"up":d<0?"down":"same";
      return '<span class="encounter-delta '+cls+'">'+labels[k]+" "+(d>0?"+":"")+d+'</span>';
    }).join("");
    var cb=beforeClass||{},ca=afterClass||{},classLabels={flow:"📖 흐름",relationship:"🏫 관계",stability:"🧭 안정",trust:"❤️ 학급신뢰"};
    html+=Object.keys(classLabels).filter(function(k){return cb[k]!==undefined&&ca[k]!==undefined&&cb[k]!==ca[k]}).map(function(k){
      var d=ca[k]-cb[k],cls=d>0?"up":d<0?"down":"same";
      return '<span class="encounter-delta '+cls+'">'+classLabels[k]+" "+(d>0?"+":"")+d+'</span>';
    }).join("");
    return html;
  }
  function resolveEncounter(dir){
    if(!activeEncounter||activeEncounter.phase!=="choice")return;
    var enc=activeEncounter,s=studentById(enc.studentId),metricSubject=enc.effectSubject||current().subject||null,before=s?studentDashboard(s,metricSubject):null,beforeClass=classDashboard(),choice;
    if(dir==="timeout"){
      choice=encounterChoice("판단하지 못한 채 상황이 흘러감",{focus:-2,trust:-1,classStability:-2},"결정을 미루는 사이 상황이 학생들 사이에서 그대로 흘러갔다.");
    }else{
      choice=enc.choices[dir];if(!choice)return;
      teacherStyleCounts[dir]=(teacherStyleCounts[dir]||0)+1;
    }
    var reaction=studentStyleReaction(s,dir);
    applyEncounterEffects(enc,choice,dir);
    if(reaction.dialogue)setStudentSpeech(s,reaction.dialogue,reaction.tone,34);
    var after=s?studentDashboard(s,metricSubject):before,afterClass=classDashboard(),delta=before?dashboardDelta(before,after):{};
    var direction=dir==="timeout"?"시간 초과":ENCOUNTER_DIRECTIONS[dir].label;
    var history={
      day:dayIndex,time:gameMinute(),templateId:enc.templateId,sourceTemplateId:enc.sourceTemplateId||enc.templateId,encounterId:enc.id,studentId:enc.studentId,targetId:enc.targetId,
      dir:dir,direction:direction,title:enc.title,choice:choice.text,result:choice.result,reaction:reaction.text,responseFit:reaction.fit,before:before,after:after,delta:delta,
      beforeClass:beforeClass,afterClass:afterClass
    };
    encounterHistory.push(history);
    if(s){
      s.encounterNotes.unshift({day:dayIndex,time:gameMinute(),text:enc.title+" → "+direction+" · "+choice.text,dir:dir,delta:delta,isFollowUp:!!enc.isFollowUp});
      s.encounterNotes=s.encounterNotes.slice(0,8);
      remember(s,"판단 카드: "+enc.title+" / "+direction,.56);
    }
    var decisionItem={
      day:dayIndex,stamp:fmtMin(gameMinute()),text:enc.title+" · "+(s?s.name:"")+" · "+direction,
      type:enc.isFollowUp?"followup_decision":"encounter_decision",scene:teacherScene,script:false,recordable:true,encounterDecision:true,isFollowUp:!!enc.isFollowUp,
      studentId:enc.studentId,targetId:enc.targetId,direction:direction,directionKey:dir,choiceText:choice.text,
      resultText:choice.result,studentReaction:reaction.text,responseFit:reaction.fit,studentTraits:s?traitLabels(s,5):[],before:before,after:after,delta:delta,beforeClass:beforeClass,afterClass:afterClass,metricSubject:metricSubject
    };
    dayEvents.push(decisionItem);dayEvents=dayEvents.slice(-320);
    if(stats&&current().kind==="lesson")stats.events.push(decisionItem);
    if(enc.followUpId){
      var sourceJob=followUpQueue.find(function(j){return j.id===enc.followUpId});
      if(sourceJob)sourceJob.status="resolved";
    }
    scheduleFollowUp(enc,dir,choice);
    activeEncounter.phase="result";
    q("#encounterResultTitle").textContent=direction+" 선택";
    q("#encounterResultText").textContent=choice.result;
    var reactionBox=q("#encounterReaction");
    if(reactionBox){reactionBox.hidden=!reaction.text;reactionBox.textContent=reaction.text?"학생 반응 · "+reaction.text:""}
    q("#encounterResultStats").innerHTML=decisionDeltaHtml(delta,beforeClass,afterClass);
    renderEncounter();
  }
  function closeEncounter(){
    if(!activeEncounter)return;
    activeEncounter=null;q("#encounterOverlay").hidden=true;
    encounterPointer=null;scheduleNextEncounter(1500,2400);
    running=encounterWasRunning;render();
  }
  function rosterRowHtml(s){
    var d=studentDashboard(s);
    function cls(v){return v<45?"low":v>75?"high":""}
    return '<button type="button" class="roster-row" data-roster-student="'+s.id+'">'+
      '<span class="roster-name"><strong>'+escHtml(s.name)+'</strong><small>'+escHtml(traitLabels(s,3).join(" · "))+'</small></span>'+
      '<span class="roster-score '+cls(d.learning)+'">'+d.learning+'</span>'+
      '<span class="roster-score '+cls(d.focus)+'">'+d.focus+'</span>'+
      '<span class="roster-score '+cls(d.mood)+'">'+d.mood+'</span>'+
      '<span class="roster-score '+cls(d.relation)+'">'+d.relation+'</span>'+
      '<span class="roster-score '+cls(d.trust)+'">'+d.trust+'</span></button>';
  }
  function rosterDetailHtml(s){
    if(!s)return '<div class="record-empty">학생을 선택하면 최근 판단과 변화 원인을 확인할 수 있습니다.</div>';
    var d=studentDashboard(s),notes=(s.encounterNotes||[]).slice(0,5),responseNotes=responseDescriptor(s);
    var queued=followUpQueue.filter(function(j){return j.status==="queued"&&j.studentId===s.id});
    return '<div class="roster-detail"><h4>'+escHtml(s.name)+' · 현재 상태</h4>'+
      '<div class="trait-panel"><strong>기본 특성</strong><div class="trait-list">'+traitListHtml(s)+'</div><small>특성은 인카운터 발생 가능성과 교사 대응에 대한 반응을 함께 바꿉니다.</small></div>'+
      '<div class="roster-detail-grid">'+
        '<div class="roster-stat"><strong>'+d.learning+'</strong><small>📚 학습</small></div>'+
        '<div class="roster-stat"><strong>'+d.focus+'</strong><small>🎯 집중</small></div>'+
        '<div class="roster-stat"><strong>'+d.mood+'</strong><small>🙂 정서</small></div>'+
        '<div class="roster-stat"><strong>'+d.relation+'</strong><small>🤝 관계</small></div>'+
        '<div class="roster-stat"><strong>'+d.trust+'</strong><small>❤️ 교사신뢰</small></div>'+
      '</div><div class="response-profile"><strong>교사 대응 반응 특성</strong><div>'+responseNotes.map(function(x){return '<span class="response-chip">'+escHtml(x)+'</span>'}).join("")+'</div></div>'+
      '<div class="roster-notes">'+(notes.length?notes.map(function(n){return '<div class="roster-note">Day '+(n.day||1)+' · '+fmtMin(n.time)+' · '+escHtml(n.text)+'</div>'}).join(""):'<div class="roster-note">아직 4방향 판단 카드로 누적된 변화가 없습니다.</div>')+'</div>'+
      (queued.length?'<div class="roster-followup">📌 후속 관찰 예정 '+queued.length+'건 · 가장 가까운 일정 Day '+Math.min.apply(null,queued.map(function(j){return j.dueDay}))+'</div>':'')+'</div>';
  }

  function newStats(){
    stats={
      events:[],fitSamples:[],engageSamples:[],learningStart:students.map(function(s){return current().kind==="lesson"?currentMastery(s):0}),
      classStart:classDashboard(),
      studentStart:students.map(function(s){return {id:s.id,state:studentDashboard(s,current().subject||null)}}),
      teacherActs:0,disruptions:0,helped:0,praises:0,lateTicks:0,
      conflicts:0,reconciled:0,connections:0,roles:0,
      instructionMoves:[],phaseSamples:{},phaseTransitions:0,
      seriousIncidents:0,peerHarm:0,teacherIncidents:0,safetyInterventions:0
    };
    resetLessonState();
  }
  function remember(s,text,weight){
    s.memory.unshift({day:dayIndex,text:text,weight:weight||.5,time:gameMinute()});
    s.memory=s.memory.slice(0,14);
  }
  function pushLogItem(item){
    if(item.day===undefined)item.day=dayIndex;
    feed.unshift(item);feed=feed.slice(0,18);
    if(item.type!=="ambient"){dayEvents.push(item);dayEvents=dayEvents.slice(-320);}
    if(stats&&current().kind==="lesson"&&item.type!=="ambient")stats.events.push(item);
    renderFeed();
  }
  function log(text,type,scene){
    type=type||"normal";scene=scene||teacherScene;
    var item={stamp:fmtMin(gameMinute()),text:text,type:type,scene:scene,script:false,recordable:type==="incident"};
    pushLogItem(item);
  }
  function spawnIncidentEmojiBurst(item){
    if(!item||item.type!=="incident")return;
    var names=[item.speaker,item.replySpeaker].filter(Boolean),targets=[];
    names.forEach(function(name){
      String(name).split(" · ").forEach(function(part){var s=studentByName(part.trim());if(s&&s.scene===teacherScene&&targets.indexOf(s)<0)targets.push(s)});
    });
    if(!targets.length)return;
    var world=q("#world"),emojis=["😠","💢","❗","💬","😣","⚡","😡"];
    targets.slice(0,3).forEach(function(s,ti){
      for(var i=0;i<6;i++){
        var el=document.createElement("span");el.className="incident-emoji";el.textContent=emojis[(i+ti*2)%emojis.length];
        el.style.setProperty("--x",s.x+"%");el.style.setProperty("--y",Math.max(7,s.y-5)+"%");
        var ang=(-145+i*58+ti*17)*Math.PI/180,dist=42+(i%3)*15;
        el.style.setProperty("--dx",(Math.cos(ang)*dist).toFixed(1)+"px");
        el.style.setProperty("--dy",(Math.sin(ang)*dist-24).toFixed(1)+"px");
        el.style.setProperty("--rot",(-18+i*8)+"deg");
        world.appendChild(el);setTimeout(function(node){return function(){node.remove()}}(el),1450);
      }
    });
  }
  function setStudentSpeech(studentOrName,textValue,tone,duration){
    var s=typeof studentOrName==="string"?studentByName(studentOrName):studentOrName;
    if(!s||!textValue)return;
    s.speechText=String(textValue);
    s.speechTone=tone||"normal";
    s.speechUntil=gameSec+(duration||32);
  }
  function scriptLog(opts){
    opts=opts||{};
    var item={
      stamp:fmtMin(gameMinute()),
      text:opts.summary||opts.stage||((opts.speaker||"")+" "+(opts.dialogue||"")),
      type:opts.type||"social",
      scene:opts.scene||teacherScene,
      script:true,
      stage:opts.stage||"",
      speaker:opts.speaker||"",
      dialogue:opts.dialogue||"",
      replySpeaker:opts.replySpeaker||"",
      replyDialogue:opts.replyDialogue||"",
      recordable:opts.recordable===true||(opts.type||"social")==="incident"
    };
    pushLogItem(item);
    if(opts.bubble===true&&item.dialogue){
      setStudentSpeech(item.speaker,item.dialogue,opts.bubbleTone||(item.type==="incident"?"warning":"question"),opts.bubbleDuration||34);
      if(item.replySpeaker&&item.replyDialogue&&opts.replyBubble!==false){
        setStudentSpeech(item.replySpeaker,item.replyDialogue,opts.replyTone||(item.type==="incident"?"warning":"normal"),opts.replyDuration||30);
      }
    }
    if(item.type==="incident")spawnIncidentEmojiBurst(item);
  }
  function pickLine(lines){return lines[Math.floor(Math.random()*lines.length)]}
  function studentTalkLine(s,target,mode){
    if(mode==="pair")return pickLine(["나는 이렇게 했는데, 너는 어떻게 했어?","여기부터 같이 확인할래?","이 답이 왜 나왔는지 설명해 줄래?","잠깐, 네 풀이도 보여줘."]);
    if(mode==="lesson")return pickLine(["야, 쉬는 시간에 운동장 갈래?","오늘 급식 뭐 나오는지 알아?","나 어제 그 게임에서 진짜 웃긴 일 있었어.","아까 복도에서 본 거 말해줄까?","이따 끝나고 같이 놀자."]);
    if(mode==="play")return pickLine(["같이 할래?","우리 저쪽에서 하자.","이번엔 내가 먼저 할게.","같은 팀 하자."]);
    return pickLine(["뭐 하고 있었어?","같이 있을래?","아까 그거 봤어?","잠깐 이것 좀 봐봐."]);
  }
  function teacherLine(kind,s){
    var name=s?s.name:"";
    var map={
      inspect:"어디에서 막혔는지 풀이한 걸 보여줄래?",
      check:"왜 그렇게 생각했는지 말해줄래?",
      probe:"비슷한 문제 하나만 더 해보자.",
      hint:"여기까지는 맞았어. 다음엔 뭘 해야 할까?",
      first:"첫 번째만 같이 해보자. 그다음은 네가 해볼래?",
      simplify:"일단 이것 하나만 먼저 끝내자.",
      quiet:name+"야, 지금 해야 할 것부터 다시 해보자.",
      redirect:"지금은 여기부터 해보자.",
      praise:"방금 그건 네가 스스로 잘 해냈어.",
      mediate:"한 명씩 말해보자. 먼저 무슨 일이 있었는지 이야기해줄래?",
      separate:"지금은 잠깐 떨어져서 진정할 시간이 필요해.",
      safety:"멈춰. 서로 거리를 두자.",
      checkSafety:"괜찮아? 다친 곳이나 불편한 곳부터 확인하자."
    };
    return map[kind]||"";
  }
  function studentReply(kind,s){
    if(kind==="inspect")return pickLine(["여기까지 했는데 여기서 막혔어요.","이렇게 했는데 맞는지 모르겠어요.","여기부터 잘 모르겠어요."]);
    if(kind==="check")return pickLine(["음… 이렇게 생각했어요.","여기 때문에 그렇게 했어요.","잘 모르겠는데, 아마 이거요."]);
    if(kind==="probe")return pickLine(["이번에는 해볼게요.","잠깐만요.","아, 비슷한 거네요."]);
    if(kind==="hint")return pickLine(["아, 그러면 여기부터요?","잠깐, 다시 해볼게요.","아! 알 것 같아요."]);
    if(kind==="first")return pickLine(["네, 그다음은 제가 해볼게요.","아, 이제 조금 알겠어요.","잠깐만요. 제가 이어서 해볼게요."]);
    if(kind==="simplify")return pickLine(["이것만 먼저 하면 돼요?","네, 이건 할 수 있어요.","그럼 이것부터 할게요."]);
    if(kind==="quiet"||kind==="redirect")return pickLine(["네.","알겠어요.","아, 네."]);
    if(kind==="praise")return pickLine(["네!","진짜요?","헤헤."]);
    if(kind==="listen")return pickLine(["제가 먼저 그런 건 아니에요.","그냥 같이 하고 싶었어요.","계속 그래서 화났어요.","저도 잘 모르겠어요…"]);
    if(kind==="safety")return pickLine(["네…","알겠어요.","…"]);
    return "";
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
      requestStudentAction(s,"WALK",{duration:40,force:true});
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
    teacher.x=50;teacher.y=20;teacher.dx=50;teacher.dy=20;teacher.moving=false;
  }
  function updateTransit(){
    students.forEach(function(s){
      if(s.targetScene&&gameSec>=s.arrivalAt){
        var target=s.targetScene;s.targetScene=null;s.scene=target;s.arrivalAt=0;setDestination(s,target,current().kind!=="lesson");
        requestStudentAction(s,"WALK",{duration:30,force:true});
        if(current().kind==="lesson"&&target===current().loc&&Math.random()<.28)log(s.name+"이(가) 조금 늦게 "+SCENE_NAME[target]+"에 도착했다.","incident",target);
      }
    });
  }

  var ACTION_MIN_SECONDS={
    READ:35,WORK:35,ATTEND:30,PAIR_WORK:45,RAISE_HAND:25,PRESENT:45,
    TALK:40,DOODLE:35,HELP:35,SLEEP:45,MOVE:30,PLAY:50,COMPETE:45,REST:35,EAT:45,SHARE:30,
    BORROW_ITEM:30,LOOK_OUTSIDE:35,STRETCH:25,DRINK_WATER:25,DROP_ITEM:20,ASK_BATHROOM:30,PASS_NOTE:30,
    COMFORT:45,TEASE:40,REJECTED:35,ARGUE:50,SHOVE:30,HURT:35,
    EXCLUDE_TARGET:50,TAKE_ITEM_FORCE:45,THREATEN:45,HIT:35,
    REFUSE_INSTRUCTION:45,SHOUT_TEACHER:40,INSULT_TEACHER:40,THROW_AT_TEACHER:35,
    DEFEND_PEER:35,REPORT_INCIDENT:35,HELP_PEER:40,CLEAN:40,WAIT:25
  };
  var CHOREOGRAPHED_ACTIONS=[
    "TALK","PAIR_WORK","HELP_PEER","BORROW_ITEM","COMFORT","TEASE","EXCLUDE_TARGET",
    "TAKE_ITEM_FORCE","THREATEN","HIT","ARGUE","SHARE","PASS_NOTE","DEFEND_PEER"
  ];
  function actionMinSeconds(a){return ACTION_MIN_SECONDS[a]||30}
  function actionLocked(s){return gameSec<(s.actionLockedUntil||0)}
  function requestStudentAction(s,a,opts){
    if(!s)return false;
    opts=opts||{};
    if(!opts.force&&actionLocked(s)&&s.action!==a)return false;
    var duration=opts.duration||actionMinSeconds(a);
    s.action=a;
    s.actionStartedAt=gameSec;
    s.actionLockedUntil=gameSec+duration;
    s.actionTicks=Math.max(1,Math.ceil(duration/AI_STEP_GAME_SECONDS));
    s.behaviorPhase=opts.phase||"idle";
    s.phaseUntil=opts.phaseUntil!==undefined?opts.phaseUntil:(s.behaviorPhase==="interact"?s.actionLockedUntil:0);
    if(opts.target){
      s.socialTarget=opts.target.id;
      s.facing=opts.target.x<s.x?-1:1;
    }else if(opts.clearTarget){
      s.socialTarget=null;
    }
    return true;
  }
  function setSimpleAction(s,a,duration,force){
    return requestStudentAction(s,a,{duration:duration||actionMinSeconds(a),force:force!==false,phase:"idle"});
  }
  function beginInteractionPhase(s,a,target,duration){
    return requestStudentAction(s,a,{duration:duration||actionMinSeconds(a),force:true,phase:"interact",target:target});
  }
  function updateBehaviorLifecycle(s){
    if(s.behaviorPhase==="interact"&&gameSec>=s.phaseUntil){
      s.behaviorPhase="resolve";
      s.phaseUntil=gameSec+6;
      s.actionLockedUntil=s.phaseUntil;
      if(CHOREOGRAPHED_ACTIONS.indexOf(s.action)>=0&&s.action!=="ARGUE"){
        requestStudentAction(s,"WAIT",{duration:12,force:true,phase:"resolve",phaseUntil:gameSec+6});
      }
      return;
    }
    if(s.behaviorPhase==="resolve"&&gameSec>=s.phaseUntil){
      s.behaviorPhase="idle";s.phaseUntil=0;s.actionLockedUntil=gameSec;
      if(s.action==="WAIT")s.socialTarget=null;
    }
  }
  function isMeaningfulInteractionAction(a){
    return ["SEEK","TALK","PAIR_WORK","HELP_PEER","BORROW_ITEM","COMFORT","TEASE","EXCLUDE_TARGET",
      "TAKE_ITEM_FORCE","THREATEN","HIT","ARGUE","SHOVE","DEFEND_PEER","REPORT_INCIDENT","PASS_NOTE"].indexOf(a)>=0;
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
      candidates.sort(function(a,b){return (b.focus+currentMastery(b)+b.assert)-(a.focus+currentMastery(a)+a.assert)});
      var presenter=candidates[0]||null;
      if(presenter){lessonState.presenterId=presenter.id;requestStudentAction(presenter,"PRESENT",{duration:action.duration,force:true})}
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
        score=(1-currentMastery(o))*.32+o.helpNeed*.32+s.helpful*.20+r.affinity*.12-r.irritation*.18;
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
    s.socialTarget=target.id;s.socialGoal=goal;
    requestStudentAction(s,"SEEK",{duration:120,force:true,phase:"approach",target:target});
    s.facing=target.x<s.x?-1:1;
    setNear(s,target,7);
    return true;
  }
  function acceptJoin(s,target,goal){
    createGroup(s,target);
    s.socialNeed=clamp(s.socialNeed-.22);s.belonging=clamp(s.belonging+.08);s.mood=clamp(s.mood+.045);s.frustration=clamp(s.frustration-.08);
    target.belonging=clamp(target.belonging+.025);
    changeRelation(s,target,{affinity:.012,irritation:-.012});
    beginInteractionPhase(s,goal==="COMPETE"?"COMPETE":goal==="PLAY"?"PLAY":"TALK",target,goal==="PLAY"?55:45);
    s.socialTarget=target.id;
    if(target.action==="WAIT"||target.action==="REST"||target.action==="READ")requestStudentAction(target,s.action==="COMPETE"?"COMPETE":s.action==="PLAY"?"PLAY":"TALK",{duration:45,force:true,target:s});
    if(Math.random()<.52){
      var joinMode=s.action==="PLAY"?"play":s.action==="COMPETE"?"play":"social";
      scriptLog({
        speaker:s.name,
        dialogue:studentTalkLine(s,target,joinMode),
        replySpeaker:target.name,
        replyDialogue:s.action==="COMPETE"?pickLine(["좋아, 해보자.","이번엔 내가 이길걸?"]):pickLine(["응, 같이 하자.","그래, 여기 있어.","좋아."]),
        stage:s.name+"이(가) "+target.name+" 곁에 멈춰 섰다.",
        summary:s.name+"과 "+target.name+"이(가) 함께 어울리기 시작했다.",
        type:"social",scene:s.scene
      });
    }
  }
  function rejectJoin(s,target){
    var r=relation(s,target);
    setSimpleAction(s,"REJECTED",38);s.behaviorPhase="resolve";s.phaseUntil=s.actionLockedUntil;s.socialTarget=null;s.groupId=null;
    s.frustration=clamp(s.frustration+.10+.13*s.rejection);s.belonging=clamp(s.belonging-.055);s.mood=clamp(s.mood-.055);
    changeRelation(s,target,{affinity:-.008,irritation:.025+.025*s.rejection});
    remember(s,target.name+"에게 함께하자고 했지만 받아들여지지 않음",.58);
    scriptLog({
      speaker:s.name,
      dialogue:pickLine(["나도 같이 해도 돼?","같이 하자.","나도 끼워줘."]),
      replySpeaker:target.name,
      replyDialogue:pickLine(["지금은 우리끼리 할래.","미안, 지금은 좀 그래.","조금 있다가 하자."]),
      stage:target.name+"의 대답 뒤 "+s.name+"이(가) 잠깐 그 자리에 머뭇거렸다.",
      summary:s.name+"이(가) "+target.name+"에게 함께하자고 했지만 받아들여지지 않았다.",
      type:"social",scene:s.scene
    });
    var confront=(s.react*.48+s.frustration*.40+s.assert*.12)*(1-teacherNear(s)*.55);
    if(confront>.54&&r.irritation>.12)beginConflict(s,target,"거절 뒤 감정이 올라감");
  }
  function resolveSeek(s){
    var target=studentById(s.socialTarget);
    if(!target||target.scene!==s.scene){
      s.socialTarget=null;s.socialGoal=null;s.behaviorPhase="idle";setSimpleAction(s,"WAIT",25);return;
    }
    s.facing=target.x<s.x?-1:1;
    if(s.behaviorPhase==="approach"){
      setNear(s,target,6);
      if(distance(s,target)>8.5)return;
      s.dx=s.x;s.dy=s.y;s.moving=false;s.behaviorPhase="settle";s.phaseUntil=gameSec+5;
      return;
    }
    if(s.behaviorPhase==="settle"){
      s.dx=s.x;s.dy=s.y;
      if(gameSec<s.phaseUntil)return;
      var goal=s.socialGoal||"TALK";
      var direct=["BORROW_ITEM","COMFORT","TEASE","PASS_NOTE","EXCLUDE_TARGET","TAKE_ITEM_FORCE","THREATEN","HIT"];
      if(direct.indexOf(goal)>=0){
        startAction(s,goal,target);
      }else if(Math.random()<joinAcceptance(s,target))acceptJoin(s,target,goal);
      else rejectJoin(s,target);
      s.socialGoal=null;
    }
  }
  function beginConflict(a,b,reason){
    if(!a||!b||a.scene!==b.scene)return;
    createGroup(a,b);
    a.conflictWith=b.id;b.conflictWith=a.id;
    a.conflictUntil=gameSec+5*60;b.conflictUntil=gameSec+5*60;
    a.socialTarget=b.id;b.socialTarget=a.id;
    beginInteractionPhase(a,"ARGUE",b,55);beginInteractionPhase(b,"ARGUE",a,55);
    a.frustration=clamp(a.frustration+.10);b.frustration=clamp(b.frustration+.08);
    changeRelation(a,b,{affinity:-.018,irritation:.07,rivalry:.015});
    stats.conflicts++;
    remember(a,b.name+"와 말다툼이 생김",.62);remember(b,a.name+"와 말다툼이 생김",.62);
    scriptLog({
      speaker:a.name,
      dialogue:pickLine(["내가 먼저 쓰고 있었잖아. 왜 가져가?","아까부터 하지 말라고 했잖아.","내 자리인데 왜 자꾸 와?","그 말 기분 나쁘다고 했잖아."]),
      replySpeaker:b.name,
      replyDialogue:pickLine(["너도 아까 나한테 그랬잖아.","안 가져갔거든. 잠깐 본 거야.","네가 먼저 시작했잖아.","왜 나한테만 뭐라고 해?"]),
      stage:reason+" 두 학생의 목소리가 조금씩 커졌다.",
      summary:a.name+"와 "+b.name+" 사이에 말다툼이 시작됐다.",
      type:"incident",scene:a.scene,
      bubble:true,bubbleTone:"danger",replyTone:"danger",bubbleDuration:38,replyDuration:36
    });
    nearbyStudents(a,24).forEach(function(o){
      if(o!==b&&Math.random()<o.soc*.28){requestStudentAction(o,"WATCH",{duration:22,force:true});o.mood=clamp(o.mood-.015)}
    });
  }
  function maybeEscalateConflict(s){
    var target=conflictPartner(s);
    if(!target)return;
    var r=relation(s,target);
    var chance=(s.react*.34+s.imp*.24+s.frustration*.28+r.irritation*.22)*(1-teacherNear(s)*.72);
    if(chance>.58&&Math.random()<.34){
      beginInteractionPhase(s,"SHOVE",target,32);setSimpleAction(target,"HURT",35);
      s.frustration=clamp(s.frustration+.08);target.frustration=clamp(target.frustration+.15);
      changeRelation(s,target,{affinity:-.025,irritation:.08});
      remember(s,target.name+"와 갈등 중 거친 몸짓이 나옴",.8);remember(target,s.name+"와 갈등 중 거친 몸짓을 겪음",.8);
      scriptLog({
        speaker:target.name,
        dialogue:pickLine(["하지 마!","밀지 마!","그만해!"]),
        stage:s.name+"의 거친 몸짓에 "+target.name+"이(가) 뒤로 한 걸음 물러났다.",
        summary:s.name+"의 거친 몸짓으로 "+target.name+"이(가) 물러났다.",
        type:"incident",scene:s.scene
      });
    }else{
      requestStudentAction(s,"WAIT",{duration:18,force:true});
      setDestination(s,s.scene,true);
    }
  }
  function beginPeerHelp(s,target){
    if(!target)return false;
    s.socialTarget=target.id;s.socialGoal="HELP";requestStudentAction(s,"HELP_PEER",{duration:100,force:true,phase:"approach",target:target});setNear(s,target,6);return true;
  }
  function resolvePeerHelp(s){
    var target=studentById(s.socialTarget);
    if(!target||target.scene!==s.scene){s.socialTarget=null;s.behaviorPhase="idle";setSimpleAction(s,"WAIT",25);return}
    s.facing=target.x<s.x?-1:1;
    if(s.behaviorPhase==="approach"){
      setNear(s,target,6);
      if(distance(s,target)>8.5)return;
      s.dx=s.x;s.dy=s.y;s.moving=false;s.behaviorPhase="settle";s.phaseUntil=gameSec+5;return;
    }
    if(s.behaviorPhase==="settle"){
      s.dx=s.x;s.dy=s.y;if(gameSec<s.phaseUntil)return;
      target.helpNeed=clamp(target.helpNeed-.12);target.focus=clamp(target.focus+.05);applyLearning(target,.0042,"pair");
      s.belonging=clamp(s.belonging+.035);s.mood=clamp(s.mood+.02);changeRelation(s,target,{affinity:.01,irritation:-.008});
      remember(s,target.name+"을 도와줌",.38);remember(target,s.name+"에게 도움받음",.38);
      if(Math.random()<.52)scriptLog({
        speaker:s.name,
        dialogue:pickLine(["여기부터 같이 볼까?","이거는 이렇게 하면 돼.","어디가 안 되는지 보여줘."]),
        replySpeaker:target.name,
        replyDialogue:pickLine(["아, 이제 알겠어.","잠깐만, 다시 해볼게.","응, 고마워."]),
        stage:s.name+"이(가) "+target.name+"의 활동지 쪽으로 몸을 기울였다.",
        summary:s.name+"이(가) "+target.name+"을(를) 도왔다.",
        type:"learning",scene:s.scene
      });
      beginInteractionPhase(s,"HELP_PEER",target,42);s.socialGoal=null;
    }
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
    incidentRecords.push({time:gameMinute(),kind:kind,actorId:actor.id,targetId:target?target.id:null,scene:actor.scene,text:text});
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
    if(kind==="exclusion"&&target){
      scriptLog({speaker:actor.name,dialogue:pickLine(["너는 이번 판에 끼지 마. 우리끼리 할 거야.","아니, 너랑은 같이 안 할래. 다른 데 가.","우리 이미 팀 정했어. 너는 빠져."]),
        replySpeaker:target.name,replyDialogue:pickLine(["왜 나만 빼는데?","나도 같이 하기로 했잖아.","한 번만 같이 하면 안 돼?"]),
        stage:"주변의 움직임이 "+target.name+"을(를) 바깥쪽으로 밀어냈다.",summary:text,type:"incident",scene:actor.scene,bubble:true,bubbleTone:"warning",replyTone:"warning"});
    }else if(kind==="taking"&&target){
      scriptLog({speaker:target.name,dialogue:pickLine(["그거 내 거야. 허락도 안 했잖아. 돌려줘.","내가 지금 쓰고 있었어. 왜 가져가?","하지 마. 내 물건이야."]),
        replySpeaker:actor.name,replyDialogue:pickLine(["잠깐만 쓰고 줄게.","나도 필요한데 왜 안 빌려줘?","조금만 쓰는 건데 왜 그래?"]),
        stage:actor.name+"이(가) "+target.name+"의 물건을 손에 쥐었다.",summary:text,type:"incident",scene:actor.scene,bubble:true,bubbleTone:"warning",replyTone:"warning"});
    }else if(kind==="threat"&&target){
      scriptLog({speaker:actor.name,dialogue:pickLine(["계속 그러면 가만 안 둘 거야.","한 번만 더 해봐.","그만하라고 했지."]),
        replySpeaker:target.name,replyDialogue:pickLine(["왜 그래…","알았어.","하지 마."]),
        stage:actor.name+"이(가) "+target.name+" 쪽으로 바짝 다가섰다.",summary:text,type:"incident",scene:actor.scene,bubble:true,bubbleTone:"danger",replyTone:"warning"});
    }else if(kind==="physical"&&target){
      scriptLog({speaker:target.name,dialogue:pickLine(["아! 하지 마!","밀지 마!","그만해!"]),
        stage:"말다툼이 거친 신체행동으로 번졌다.",summary:text,type:"incident",scene:actor.scene,bubble:true,bubbleTone:"danger",replyBubble:false});
    }else if(kind==="teacher_shout"){
      scriptLog({speaker:actor.name,dialogue:pickLine(["왜 저만 그래요! 그만 좀 하세요!","저한테만 뭐라고 하잖아요!","알았다고요! 자꾸 말하지 마세요!"]),
        stage:"교실 안에서 "+actor.name+"의 목소리가 갑자기 커졌다.",summary:text,type:"incident",scene:actor.scene,bubble:true,bubbleTone:"danger",bubbleDuration:40,replyBubble:false});
    }else if(kind==="teacher_insult"){
      scriptLog({speaker:actor.name,dialogue:pickLine(["아, 씨… 선생님 진짜 짜증 나요.","선생님 때문에 개짜증 나요.","아 진짜, 왜 자꾸 저한테 뭐라고 해요?","선생님 말 듣기 싫다고요."]),
        stage:"주변 학생 몇 명이 말을 멈추고 쳐다봤다.",summary:text,type:"incident",scene:actor.scene,bubble:true,bubbleTone:"danger",bubbleDuration:42,replyBubble:false});
    }else if(kind==="teacher_throw"){
      scriptLog({speaker:actor.name,dialogue:pickLine(["몰라요!","안 한다고요!","아 진짜, 싫다고요!"]),
        stage:actor.name+"이(가) 화가 난 상태에서 교사 쪽으로 물건을 던졌다.",summary:text,type:"incident",scene:actor.scene,bubble:true,bubbleTone:"danger",bubbleDuration:38,replyBubble:false});
    }else{
      log(text,"incident",actor.scene);
    }
    if(target){
      nearbyStudents(target,24).filter(function(o){return o!==actor}).forEach(function(o){
        var sameActorCircle=circleOf(actor)&&circleOf(o)===circleOf(actor);
        if(o.empathy>.68&&relation(o,target).affinity>.38&&Math.random()<.34){
          requestStudentAction(o,"DEFEND_PEER",{duration:32,force:true,target:target});
          target.victimStress=clamp(target.victimStress-.025);target.belonging=clamp(target.belonging+.018);
          changeRelation(o,target,{affinity:.006});
          if(Math.random()<.35)log(o.name+"이(가) "+target.name+" 곁으로 가서 상황을 멈추려 했다.","social",actor.scene);
        }else if(o.rule>.70&&o.trust>.55&&Math.random()<.22){
          requestStudentAction(o,"REPORT_INCIDENT",{duration:32,force:true});
          if(Math.random()<.45)log(o.name+"이(가) 심각한 상황을 교사에게 알리려 했다.","social",actor.scene);
        }else if(sameActorCircle&&o.rule<.48&&o.mischief>.58&&Math.random()<.20){
          requestStudentAction(o,"WATCH",{duration:24,force:true});
          target.victimStress=clamp(target.victimStress+.012);
        }else if(Math.random()<.35){
          requestStudentAction(o,"WATCH",{duration:18,force:true});
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
        if(distance(s,peer)>9)beginSeek(s,peer,action);else startAction(s,action,peer);
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
    var visualDuration=actionMinSeconds(a);
    if(target||CHOREOGRAPHED_ACTIONS.indexOf(a)>=0)beginInteractionPhase(s,a,target,visualDuration);
    else setSimpleAction(s,a,visualDuration);
    if(target){s.socialTarget=target.id;s.facing=target.x<s.x?-1:1}
    var p=target||chooseSocialTarget(s,a==="COMPETE"?"COMPETE":"SOCIAL");

    if(a==="TALK"){
      s.talkNeed=clamp(s.talkNeed-.15);s.socialNeed=clamp(s.socialNeed-.08);
      if(current().kind==="lesson"&&lessonState.phase!=="pair"){
        stats.disruptions++;
        if(Math.random()<.58)scriptLog({
          speaker:s.name,
          dialogue:studentTalkLine(s,p,"lesson"),
          replySpeaker:p?p.name:"",
          replyDialogue:p&&Math.random()<.62?pickLine(["응, 나도 갈래.","진짜? 이따 자세히 말해줘.","오늘 급식 맛있는 거 나온대.","쉿, 선생님 보셔.","알겠어. 쉬는 시간에 얘기하자."]):"",
          stage:s.name+"이(가) "+(p?p.name+" 쪽으로 몸을 기울였다.":"옆자리 쪽을 힐끗 봤다."),
          summary:s.name+"이(가) 수업 중 말을 걸기 시작했다.",
          type:"incident",scene:s.scene
        });
      }else if(p){
        changeRelation(s,p,{affinity:.005,irritation:-.003});
        if(Math.random()<.42)scriptLog({
          speaker:s.name,dialogue:studentTalkLine(s,p,"social"),
          replySpeaker:p.name,replyDialogue:pickLine(["응.","진짜?","나도.","그래?"]),
          stage:"두 학생이 가까이 서서 짧게 이야기를 주고받았다.",
          summary:s.name+"와 "+p.name+"이(가) 이야기를 나눴다.",type:"social",scene:s.scene
        });
      }
    }
    if(a==="PAIR_WORK"&&p){
      s.socialNeed=clamp(s.socialNeed-.10);s.focus=clamp(s.focus+.018);s.socialTarget=p.id;
      changeRelation(s,p,{affinity:.003,irritation:-.002});
      if(Math.random()<.42)scriptLog({
        speaker:s.name,dialogue:studentTalkLine(s,p,"pair"),
        replySpeaker:p.name,replyDialogue:pickLine(["나는 여기까지 했어.","잠깐, 이 부분부터 보자.","아, 나는 다르게 했는데?","응, 같이 확인해보자."]),
        stage:"두 학생의 활동지가 책상 가운데로 조금 가까워졌다.",
        summary:s.name+"와 "+p.name+"이(가) 짝 과제를 함께 확인했다.",type:"learning",scene:s.scene
      });
    }
    if(a==="MOVE"&&current().kind==="lesson"&&Math.random()<.40){stats.disruptions++;log(s.name+"이(가) 몸을 크게 움직여 주변의 시선을 끌었다.","incident",s.scene)}
    if(a==="SLEEP")log(s.name+"이(가) 점점 고개를 떨구기 시작했다.","incident",s.scene);
    if(a==="HELP")scriptLog({
      speaker:s.name,dialogue:pickLine(["선생님, 여기부터 잘 모르겠어요.","선생님, 이 문제 어떻게 시작해야 해요?","선생님, 여기까지 했는데 다음이 안 돼요.","선생님, 제가 이렇게 하는 게 맞아요?"]),
      stage:s.name+"의 연필이 한동안 같은 자리에서 멈춰 있다.",
      summary:s.name+"이(가) 문제에서 막혀 도움을 기다리고 있다.",type:"learning",scene:s.scene,
      bubble:true,bubbleTone:"question",bubbleDuration:38,replyBubble:false
    });

    if(a==="BORROW_ITEM"&&p){
      changeRelation(s,p,{affinity:.003});
      if(Math.random()<.58)scriptLog({
        speaker:s.name,dialogue:pickLine(["연필 좀 빌려줄래?","지우개 잠깐만 써도 돼?","이거 잠깐 빌려도 돼?"]),
        replySpeaker:p.name,replyDialogue:pickLine(["응, 여기.","쓰고 줘.","그래."]),
        stage:p.name+"이(가) 책상 위 준비물을 "+s.name+" 쪽으로 밀어주었다.",
        summary:s.name+"이(가) "+p.name+"에게 준비물을 빌렸다.",type:"social",scene:s.scene
      });
    }
    if(a==="LOOK_OUTSIDE"){s.boredom=clamp(s.boredom-.035);s.focus=clamp(s.focus-.018);}
    if(a==="STRETCH"){s.moveNeed=clamp(s.moveNeed-.10);s.energy=clamp(s.energy+.015);}
    if(a==="DRINK_WATER"){s.focus=clamp(s.focus+.012);s.energy=clamp(s.energy+.012);}
    if(a==="DROP_ITEM"){
      if(Math.random()<.50)log(s.name+"의 필기구가 바닥에 떨어졌다.","ambient",s.scene);
    }
    if(a==="ASK_BATHROOM"){
      s.moveNeed=clamp(s.moveNeed-.04);s.actionTicks=3;
      if(Math.random()<.55)scriptLog({
        speaker:s.name,dialogue:"선생님, 화장실 다녀와도 돼요?",
        stage:s.name+"이(가) 조심스럽게 손을 들었다.",
        summary:s.name+"이(가) 화장실에 다녀와도 되는지 물었다.",type:"ambient",scene:s.scene,
        bubble:true,bubbleTone:"question",bubbleDuration:34,replyBubble:false
      });
    }
    if(a==="PASS_NOTE"&&p){
      s.talkNeed=clamp(s.talkNeed-.05);p.talkNeed=clamp(p.talkNeed+.035);
      if(current().kind==="lesson")stats.disruptions++;
      if(Math.random()<.34)log(s.name+"이(가) "+p.name+" 쪽으로 쪽지를 슬쩍 건넸다.","incident",s.scene);
    }
    if(a==="COMFORT"&&p){
      p.victimStress=clamp(p.victimStress-.07);p.mood=clamp(p.mood+.04);p.belonging=clamp(p.belonging+.035);
      changeRelation(s,p,{affinity:.012,irritation:-.008});
      scriptLog({
        speaker:s.name,dialogue:pickLine(["괜찮아?","같이 있을까?","신경 쓰지 마."]),
        replySpeaker:p.name,replyDialogue:Math.random()<.65?pickLine(["응…","괜찮아.","고마워."]):"",
        stage:s.name+"이(가) "+p.name+" 곁에 잠깐 머물렀다.",
        summary:s.name+"이(가) "+p.name+"을(를) 위로했다.",type:"social",scene:s.scene
      });
    }
    if(a==="TEASE"&&p){
      changeRelation(s,p,{affinity:-.010,irritation:.035});
      p.frustration=clamp(p.frustration+.07);p.mood=clamp(p.mood-.045);
      remember(p,s.name+"의 놀림을 받음",.48);
      scriptLog({
        speaker:s.name,dialogue:pickLine(["야, 또 틀렸네. 그것도 모르냐?","너 아까부터 계속 실수하네.","그 그림 좀 이상한데?","왜 맨날 그렇게 해?"]),
        replySpeaker:p.name,replyDialogue:pickLine(["그만 좀 해. 기분 나빠.","하지 말라고 했잖아.","내가 알아서 할 거야.","너나 신경 써."]),
        stage:p.name+"의 표정이 굳고 몸이 조금 뒤로 물러났다.",
        summary:s.name+"이(가) "+p.name+"을(를) 놀렸다.",type:"incident",scene:s.scene,
        bubble:true,bubbleTone:"warning",replyTone:"warning",bubbleDuration:34,replyDuration:28
      });
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
      scriptLog({
        speaker:s.name,dialogue:pickLine(["지금 하기 싫어요. 왜 저만 계속 시켜요?","아까 했잖아요. 저 이제 안 할래요.","모르겠는데 자꾸 하라고 하지 마세요.","저 지금 이거 하기 싫다고요."]),
        stage:"교사의 안내 뒤에도 "+s.name+"의 손이 과제로 돌아가지 않았다.",
        summary:s.name+"이(가) 교사의 안내를 거부했다.",type:"incident",scene:s.scene,
        bubble:true,bubbleTone:"warning",bubbleDuration:36,replyBubble:false
      });
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
        if(Math.random()<.35)scriptLog({
          speaker:s.name,dialogue:pickLine(["이번엔 내가 이길 거야.","한 번 더 하자.","준비됐지?"]),
          replySpeaker:p.name,replyDialogue:pickLine(["좋아.","해보자.","이번엔 안 져."]),
          stage:"두 학생이 서로를 보며 승부를 이어갔다.",
          summary:s.name+"와 "+p.name+"이(가) 승부를 즐겼다.",type:"social",scene:s.scene
        });
      }
    }
    if(a==="SHARE"&&p){
      changeRelation(s,p,{affinity:.012,irritation:-.006});s.belonging=clamp(s.belonging+.02);
      scriptLog({
        speaker:s.name,dialogue:pickLine(["이거 먹을래?","이거 줄까?","난 이거 괜찮아. 너 먹어."]),
        replySpeaker:p.name,replyDialogue:pickLine(["응, 고마워.","진짜? 고마워.","응."]),
        stage:s.name+"이(가) 식판 쪽으로 반찬을 조심스럽게 건넸다.",
        summary:s.name+"이(가) "+p.name+"에게 반찬을 나눠주었다.",type:"social",scene:"cafeteria"
      });
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
    if(s.scene!==current().loc||s.targetScene){requestStudentAction(s,"WALK",{duration:30,force:true});return}

    if(s.action==="SEEK"){resolveSeek(s);return}
    if(s.action==="HELP_PEER"){resolvePeerHelp(s);return}
    if(s.action==="ARGUE"){
      if(actionLocked(s))return;
      if(s.actionTicks<=0)maybeEscalateConflict(s);
      return;
    }
    if(s.action==="SHOVE"||s.action==="HURT"){
      if(s.actionTicks<=0){requestStudentAction(s,"WAIT",{duration:18,force:true});setDestination(s,s.scene,true)}
      return;
    }
    updateBehaviorLifecycle(s);
    if(actionLocked(s))return;
    if(s.action==="REJECTED"&&s.actionTicks>0)return;
    if(["TEASE","EXCLUDE_TARGET","TAKE_ITEM_FORCE","THREATEN","HIT","REFUSE_INSTRUCTION","SHOUT_TEACHER","INSULT_TEACHER","THROW_AT_TEACHER","DEFEND_PEER","REPORT_INCIDENT"].indexOf(s.action)>=0&&s.actionTicks>0)return;
    if(s.actionTicks<=0&&maybeSeriousIncident(s))return;

    var phase=lessonState.phase,fit=lessonFit(s),near=teacherNear(s),mastery=currentMastery(s),hard=clamp(.70-mastery+.16),target=chooseSocialTarget(s,"SOCIAL");
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
      vals.RAISE_HAND=.18+s.verbal*.24+s.assert*.19+mastery*.15+s.focus*.16;
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
      if(s.action!==best||!actionLocked(s))setSimpleAction(s,best,best==="PRESENT"?50:actionMinSeconds(best));
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
      if(s.actionTicks<=0)setSimpleAction(s,phase==="individual"?"WORK":"ATTEND",30,true);
    }
  }

  function decideFree(s){
    if(s.targetScene){requestStudentAction(s,"WALK",{duration:30,force:true});return}
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
    updateBehaviorLifecycle(s);
    if(actionLocked(s))return;
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

    if(!choices.length){requestStudentAction(s,"WAIT",{duration:20,force:true});return}
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
    if(s.actionTicks>0)s.actionTicks-=1;

    s.frustration=clamp(s.frustration-.006);
    s.correctionLoad=clamp(s.correctionLoad-.004);
    s.victimStress=clamp(s.victimStress-.0015);
    if(s.victimStress>.18){s.focus=clamp(s.focus-.003);s.socialNeed=clamp(s.socialNeed-.002);}
    if(s.pairUntil<=gameSec){s.pairWith=null;s.pairUntil=0}
    if(s.roleUntil<=gameSec){s.role=null;s.roleUntil=0}
    if(s.avoidUntil<=gameSec){s.avoidId=null;s.avoidUntil=0}
    if(s.conflictUntil<=gameSec&&s.conflictWith!==null){
      s.conflictWith=null;
      if(s.action==="ARGUE")requestStudentAction(s,"WAIT",{duration:18,force:true});
    }

    if(current().kind==="lesson"){
      var fit=lessonFit(s);
      s.talkNeed=clamp(s.talkNeed+.018*s.soc+.014*(1-fit));
      s.moveNeed=clamp(s.moveNeed+.016*s.move);
      var diagNode=currentKnowledgeNode(s);
      var repeatedGap=diagNode?Math.min(.08,diagNode.evidence*.012):0;
      s.helpNeed=clamp(s.helpNeed+.015*clamp(.69-currentMastery(s))+repeatedGap*.08);
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
        var gain=.00055*fit*s.focus;applyLearning(s,gain,"work");
      }else if(s.action==="ATTEND"){
        s.focus=clamp(s.focus+.006*fit-.004*s.boredom);
        var listenGain=.00025*fit*s.focus;applyLearning(s,listenGain,"listen");
      }else if(s.action==="PAIR_WORK"){
        var partner=s.lessonPartner!==null?studentById(s.lessonPartner):null;
        var pairFit=partner?relation(s,partner).affinity:.35;
        s.focus=clamp(s.focus+.005*fit-.002*s.boredom);
        var pairGain=.00045*fit*s.focus*(.82+pairFit*.22);applyLearning(s,pairGain,"pair");
      }else if(s.action==="RAISE_HAND"){
        s.focus=clamp(s.focus+.012);s.mood=clamp(s.mood+.006);
        var qGain=.00018*fit;applyLearning(s,qGain,"question");
      }else if(s.action==="PRESENT"){
        s.focus=clamp(s.focus+.01);s.mood=clamp(s.mood+.008);
        var pGain=.00016*fit;applyLearning(s,pGain,"presentation");
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

  function updateSocialTracking(gameDt){
    students.forEach(function(s){
      var target=studentById(s.socialTarget);
      if(!target||target.scene!==s.scene)return;
      if(["SEEK","HELP_PEER"].indexOf(s.action)>=0&&s.behaviorPhase==="approach")setNear(s,target,7);
      if(["ARGUE","TEASE","EXCLUDE_TARGET","TAKE_ITEM_FORCE","THREATEN","HIT"].indexOf(s.action)>=0&&s.behaviorPhase==="interact"){
        s.dx=s.x;s.dy=s.y;s.facing=target.x<s.x?-1:1;
      }
      if(s.groupId&&["TALK","PLAY","COMPETE"].indexOf(s.action)>=0&&distance(s,target)>13)setNear(s,target,8);
    });
    students.forEach(function(s){
      var peers=circlePeers(s,s.scene);
      peers.forEach(function(p){
        if(distance(s,p)<18){
          var r=relation(s,p);
          r.timeTogether=(r.timeTogether||0)+gameDt*.72;
          if(current().kind!=="lesson"&&s.action!=="REJECTED"&&p.action!=="REJECTED"){
            s.belonging=clamp(s.belonging+gameDt*.00042);
          }
        }
      });
    });
  }
  function isSeatAnchored(s){
    return s.scene==="classroom"&&current().kind==="lesson"&&seated(s)&&!s.moving&&s.behaviorPhase!=="approach";
  }
  function resolveStudentCrowding(gameDt){
    var response=1-Math.exp(-1.05*Math.max(0,gameDt||0));
    for(var i=0;i<students.length;i++){
      var a=students[i];if(a.targetScene)continue;
      for(var j=i+1;j<students.length;j++){
        var b=students[j];if(a.scene!==b.scene||b.targetScene)continue;
        if(isSeatAnchored(a)&&isSeatAnchored(b))continue;
        var dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
        var interacting=a.socialTarget===b.id||b.socialTarget===a.id;
        var min=interacting?4.8:7.2;
        if(d>=min)continue;
        if(d<.05){dx=(a.id%2?1:-1);dy=.3;d=Math.hypot(dx,dy)}
        var push=(min-d)*response,nx=dx/d,ny=dy/d;
        if(!isSeatAnchored(a)){a.x=clamp(a.x-nx*push,5,95);a.y=clamp(a.y-ny*push,16,92)}
        if(!isSeatAnchored(b)){b.x=clamp(b.x+nx*push,5,95);b.y=clamp(b.y+ny*push,16,92)}
      }
    }
  }
  function updateMovement(gameDt){
    students.forEach(function(s){
      var dx=s.dx-s.x,dy=s.dy-s.y,d=Math.hypot(dx,dy);
      s.moving=d>.55;
      if(d>.55){
        s.facing=dx<0?-1:1;
        var boost=s.action==="RUN"?1.5:1;
        var pacePerGameSecond=1.02*boost;
        var step=Math.min(d,gameDt*pacePerGameSecond);
        s.x+=dx/d*step;s.y+=dy/d*step;
      }else{
        s.x=s.dx;s.y=s.dy;s.moving=false;
        var target=studentById(s.socialTarget);
        if(target&&target.scene===s.scene)s.facing=target.x<s.x?-1:1;
      }
    });
    resolveStudentCrowding(gameDt);
  }
  function sampleStats(){
    if(current().kind!=="lesson")return;
    var fit=students.reduce(function(a,s){return a+lessonFit(s)},0)/students.length;
    var eng=students.reduce(function(a,s){
      if(s.scene!==current().loc)return a+.05;
      var productive=["WORK","ATTEND","PAIR_WORK","RAISE_HAND","PRESENT","HELP","HELP_PEER","PLAY","COMPETE"].indexOf(s.action)>=0;
      var partial=["READ","BORROW_ITEM","COMFORT"].indexOf(s.action)>=0;
      return a+(productive?s.focus:partial?Math.max(.22,s.focus-.10):Math.max(.10,s.focus-.27));
    },0)/students.length;
    stats.fitSamples.push(fit);stats.engageSamples.push(eng);
    stats.phaseSamples[lessonState.phase]=(stats.phaseSamples[lessonState.phase]||0)+1;
  }

  function mediateConflict(s){
    var other=conflictPartner(s);
    if(!other){log(s.name+" 주변에는 지금 중재할 만한 갈등이 뚜렷하지 않다.","teacher",teacherScene);return}
    var r=relation(s,other);
    var success=clamp(.34+(s.trust+other.trust)*.16+(s.empathy+other.empathy)*.09-r.irritation*.28);
    requestStudentAction(s,"WAIT",{duration:18,force:true});requestStudentAction(other,"WAIT",{duration:18,force:true});
    s.frustration=clamp(s.frustration-.20*success);other.frustration=clamp(other.frustration-.20*success);
    changeRelation(s,other,{irritation:-.14-.10*success,affinity:.008*success});
    s.conflictUntil=gameSec+60;other.conflictUntil=gameSec+60;
    if(success>.55){
      s.conflictWith=null;other.conflictWith=null;stats.reconciled++;
      s.trust=clamp(s.trust+.018);other.trust=clamp(other.trust+.018);
      remember(s,"선생님 중재로 "+other.name+"와 갈등을 정리함",.58);remember(other,"선생님 중재로 "+s.name+"와 갈등을 정리함",.58);
      scriptLog({speaker:"선생님",dialogue:teacherLine("mediate",s),
        replySpeaker:s.name+" · "+other.name,replyDialogue:pickLine(["…알겠어요.","저도 그건 미안해요.","다음엔 그렇게 안 할게요."]),
        stage:"한 명씩 말을 마치자 두 학생의 목소리가 조금 낮아졌다.",
        summary:s.name+"와 "+other.name+"의 갈등이 중재 뒤 차분해졌다.",type:"teacher",scene:teacherScene});
    }else{
      scriptLog({speaker:"선생님",dialogue:teacherLine("mediate",s),
        replySpeaker:s.name+" · "+other.name,replyDialogue:pickLine(["전 아직 화났어요.","…","알겠는데 아직 싫어요."]),
        stage:"다툼은 멈췄지만 두 학생은 서로를 바로 보지 않았다.",
        summary:"중재 뒤에도 "+s.name+"와 "+other.name+" 사이 감정이 남았다.",type:"teacher",scene:teacherScene});
    }
  }
  function separateConflict(s){
    var other=conflictPartner(s);
    requestStudentAction(s,"WAIT",{duration:22,force:true,clearTarget:true});s.groupId=null;s.frustration=clamp(s.frustration-.13);
    if(other){
      s.avoidId=other.id;s.avoidUntil=gameSec+6*60;other.avoidId=s.id;other.avoidUntil=gameSec+6*60;
      s.conflictUntil=gameSec+90;other.conflictUntil=gameSec+90;
      s.dx=clamp(other.x>50?18:82,8,92);s.dy=clamp(78+rand(-7,7),25,90);
      remember(s,other.name+"와 잠시 떨어져 진정함",.42);
      scriptLog({speaker:"선생님",dialogue:teacherLine("separate",s),
        replySpeaker:s.name,replyDialogue:studentReply("safety",s),
        stage:s.name+"이(가) "+other.name+"과(와) 떨어진 자리로 이동했다.",
        summary:s.name+"을(를) "+other.name+"에게서 잠시 분리했다.",type:"teacher",scene:teacherScene});
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
    scriptLog({speaker:"선생님",dialogue:s.name+"야, 이것 좀 같이 맡아줄래?",
      replySpeaker:s.name,replyDialogue:pickLine(["네!","제가 할게요.","뭐 하면 돼요?"]),
      stage:s.name+"이(가) 선생님 쪽으로 몸을 돌렸다.",
      summary:s.name+"에게 도움 역할을 맡겼다.",type:"teacher",scene:teacherScene});
  }
  function connectStudents(a,b){
    if(!a||!b||a===b||a.scene!==b.scene)return;
    stats.teacherActs++;stats.connections++;
    a.pairWith=b.id;b.pairWith=a.id;a.pairUntil=gameSec+8*60;b.pairUntil=gameSec+8*60;
    a.socialNeed=clamp(a.socialNeed+.08);b.socialNeed=clamp(b.socialNeed+.05);
    a.groupId=null;b.groupId=null;
    remember(a,"선생님이 "+b.name+"와 함께 해보도록 연결함",.42);remember(b,"선생님이 "+a.name+"와 함께 해보도록 연결함",.42);
    scriptLog({speaker:"선생님",dialogue:a.name+"이랑 "+b.name+", 이번에는 둘이 같이 해볼래?",
      replySpeaker:a.name+" · "+b.name,replyDialogue:pickLine(["네.","해볼게요.","응, 같이 하자."]),
      stage:"두 학생이 서로를 한 번 바라봤다.",
      summary:"선생님이 "+a.name+"와 "+b.name+"에게 함께할 기회를 만들었다.",type:"teacher",scene:teacherScene});
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
    if(action.id==="firstStep")v=.74+(1-currentMastery(s))*.16+s.hands*.06;
    if(action.id==="simplify")v=.72+(1-currentMastery(s))*.18;
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
  function updateTeacherMovement(gameDt){
    if(teacherTask&&teacherTask.targetId!==null){
      var target=studentById(teacherTask.targetId);
      var action=actionById(teacherTask.actionId);
      if(target&&target.scene===teacherScene&&action&&action.near&&gameSec<teacherTask.actionStart){
        teacher.dx=clamp(target.x-7,5,95);teacher.dy=clamp(target.y-10,15,91);
      }
    }
    var dx=teacher.dx-teacher.x,dy=teacher.dy-teacher.y,d=Math.hypot(dx,dy);
    teacher.moving=d>.45;
    if(d>.45){
      var step=Math.min(d,gameDt*1.15);
      teacher.x+=dx/d*step;teacher.y+=dy/d*step;
    }else{
      teacher.x=teacher.dx;teacher.y=teacher.dy;teacher.moving=false;
    }
  }

  function finishTeacherTask(){
    if(!teacherTask)return;
    var task=teacherTask;
    teacherTask=null;
    if(task.kind==="sceneTravel"){
      teacherScene=task.targetScene;teacher.x=50;teacher.y=18;teacher.dx=50;teacher.dy=18;teacher.moving=false;
      selected=null;connectMode=false;swapMode=false;
      log("선생님이 "+SCENE_NAME[teacherScene]+"에 도착했다.","teacher",teacherScene);
      render();return;
    }
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
      if(action.instruction&&!action.persistent&&lessonState.phase===action.phase){
        lessonState.phase="ready";
        lessonState.phaseStart=gameSec;
        lessonState.presenterId=null;
      }
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
    var travelSeconds=0;
    if(action.near&&s){
      teacher.dx=clamp(s.x-7,5,95);teacher.dy=clamp(s.y-10,15,91);
      travelSeconds=Math.hypot(teacher.dx-teacher.x,teacher.dy-teacher.y)/1.15;
    }else{
      teacher.dx=teacher.x;teacher.dy=teacher.y;
    }
    if(action.instruction)setLessonPhase(action);
    var duration=action.duration||10;
    teacherTask={
      actionId:action.id,
      targetId:s?s.id:null,
      start:gameSec,
      actionStart:gameSec+travelSeconds,
      end:gameSec+travelSeconds+duration,
      duration:travelSeconds+duration,
      workDuration:duration,
      travelSeconds:travelSeconds,
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
      id:"explain",instruction:true,phase:"explain",label:"설명하기",duration:180,persistent:false,
      desc:"핵심 개념을 짧게 설명합니다. 오래 이어지면 일부 학생의 집중이 빠르게 떨어집니다.",
      effect:function(){
        students.filter(function(s){return s.scene===current().loc}).forEach(function(s){s.focus=clamp(s.focus+.018*lessonFit(s));});
      }
    },
    question:{
      id:"question",instruction:true,phase:"question",label:"질문 던지기",duration:120,persistent:false,
      desc:"학생의 생각을 묻고 손들기·응답을 유도합니다.",
      effect:function(){
        var raised=students.filter(function(s){return s.scene===current().loc&&s.action==="RAISE_HAND"});
        if(raised.length){var r=pick(raised);r.mood=clamp(r.mood+.018);r.focus=clamp(r.focus+.025);log(r.name+"이(가) 질문에 답하며 자신의 생각을 설명했다.","learning",teacherScene);}
        else log("질문을 던졌지만 바로 손을 드는 학생은 없었다.","learning",teacherScene);
      }
    },
    demo:{
      id:"demo",instruction:true,phase:"demo",label:"시범 보이기",duration:150,persistent:false,
      desc:"판서·교구·실제 예시를 보여주며 말로만 설명하지 않습니다.",
      effect:function(){
        students.filter(function(s){return s.scene===current().loc}).forEach(function(s){s.focus=clamp(s.focus+.015*s.visual+.012*s.hands);});
      }
    },
    individual:{
      id:"individual",instruction:true,phase:"individual",label:"개별활동 시작",duration:25,persistent:true,
      desc:"학생들이 자기 속도로 문제나 과제를 해결하게 합니다. 교사는 이때 돌아다니며 관찰·지원할 수 있습니다.",
      effect:function(){
        students.filter(function(s){return s.scene===current().loc}).forEach(function(s){requestStudentAction(s,"WORK",{duration:35,force:true});});
      }
    },
    pair:{
      id:"pair",instruction:true,phase:"pair",label:"짝활동 전환",duration:30,persistent:true,
      desc:"자리 가까운 학생끼리 짝을 만들어 서로 설명하고 확인하게 합니다. 관계가 좋다고 항상 학습적인 대화가 되는 것은 아닙니다.",
      effect:function(){
        students.filter(function(s){return s.scene===current().loc&&s.lessonPartner!==null}).forEach(function(s){var p=studentById(s.lessonPartner);requestStudentAction(s,"PAIR_WORK",{duration:45,force:true,target:p});});
      }
    },
    presentation:{
      id:"presentation",instruction:true,phase:"presentation",label:"발표시키기",duration:120,persistent:false,
      desc:"한 학생의 생각이나 결과를 학급 전체와 공유합니다. 발표자는 경험을 얻고 다른 학생은 듣는 시간이 됩니다.",
      effect:function(){
        var presenter=studentById(lessonState.presenterId);
        if(presenter){presenter.mood=clamp(presenter.mood+.025);presenter.belonging=clamp(presenter.belonging+.018);remember(presenter,"수업 중 학급 앞에서 발표함",.42);}
      }
    },
    closure:{
      id:"closure",instruction:true,phase:"closure",label:"정리하기",duration:120,persistent:false,
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
      recommended:function(s){return s.action==="HELP"||s.helpNeed>.16},
      effect:function(s,m){
        s.observation+=2;s.observedSubjects[current().subject]=true;s.helpNeed=clamp(s.helpNeed-.025*m);
        var ev=recordDiagnosticEvidence(s,"활동지 확인");
        remember(s,"선생님이 풀이 과정을 확인함",.30);
        scriptLog({
          speaker:"선생님",dialogue:teacherLine("inspect",s),
          replySpeaker:s.name,replyDialogue:studentReply("inspect",s),
          stage:"선생님이 "+s.name+"의 활동지 옆에 몸을 낮추고 풀이 흔적을 따라봤다.",
          summary:s.name+"의 과제를 살펴보며 "+(ev?ev.text:"풀이 흐름")+"을(를) 확인했다.",
          type:"learning",scene:teacherScene
        });
      }
    },
    checkQuestion:{
      id:"checkQuestion",category:"observe",label:"확인 질문하기",duration:25,near:true,repeatPenalty:.04,
      desc:"짧은 질문으로 이해한 정도를 확인합니다. 틀려도 바로 정답을 주지는 않습니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene},
      recommended:function(s){return s.action==="HELP"||s.helpNeed>.13},
      effect:function(s,m){
        s.observation+=1;s.focus=clamp(s.focus+.025*m);s.observedSubjects[current().subject]=true;
        var ev=recordDiagnosticEvidence(s,"확인 질문");
        remember(s,"선생님의 확인 질문에 답해봄",.28);
        scriptLog({
          speaker:"선생님",dialogue:teacherLine("check",s),
          replySpeaker:s.name,replyDialogue:studentReply("check",s),
          stage:s.name+"이(가) 자신의 풀이를 다시 내려다봤다.",
          summary:s.name+"에게 확인 질문을 해 "+(ev?ev.label+" 관련 반응":"이해 정도")+"을(를) 살폈다.",
          type:"learning",scene:teacherScene
        });
      }
    },
    probeConcept:{
      id:"probeConcept",category:"observe",label:"짧은 진단문항 제시",duration:40,near:true,repeatPenalty:.03,
      desc:"비슷한 개념을 다른 형태로 한 번 더 물어 같은 어려움이 반복되는지 확인합니다. 정답을 가르치는 행동은 아닙니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene&&(hasObservedCurrentWork(s)||hasDiagnosticEvidence(s))},
      recommended:function(s){return diagnosticEvidenceCount(s)===1},
      effect:function(s,m){
        s.observation+=1;s.focus=clamp(s.focus+.018*m);
        var ev=recordDiagnosticEvidence(s,"진단문항");
        remember(s,"비슷한 개념의 짧은 진단문항에 응답함",.34);
        scriptLog({
          speaker:"선생님",dialogue:teacherLine("probe",s),
          replySpeaker:s.name,replyDialogue:studentReply("probe",s),
          stage:ev&&ev.evidence>=2?"비슷한 지점에서 "+s.name+"의 손이 다시 멈췄다.":"문제의 모양이 바뀌자 "+s.name+"이(가) 잠깐 생각했다.",
          summary:ev&&ev.evidence>=2?s.name+"에게서 "+ev.label+" 관련 비슷한 어려움이 반복됐다.":s.name+"에게 비슷한 개념을 다른 방식으로 확인했다.",
          type:"learning",scene:teacherScene
        });
      }
    },

    hint:{
      id:"hint",category:"support",label:"힌트 하나 주기",duration:30,near:true,repeatPenalty:.07,
      desc:"해결 방향만 짚어 스스로 다음 단계를 찾게 합니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene&&(s.action==="HELP"||s.helpNeed>.08||hasObservedCurrentWork(s))},
      recommended:function(s){return s.action==="HELP"||s.helpNeed>.16},
      effect:function(s,m){
        if(!hasObservedCurrentWork(s))recordDiagnosticEvidence(s,"힌트 전 반응");
        s.helpNeed=clamp(s.helpNeed-.14*m);applyLearning(s,.012*m,"hint");s.focus=clamp(s.focus+.07*m);stats.helped++;
        remember(s,"힌트를 받고 다시 문제에 접근함",.50);
        scriptLog({
          speaker:"선생님",dialogue:teacherLine("hint",s),
          replySpeaker:s.name,replyDialogue:studentReply("hint",s),
          stage:"선생님은 답을 말하지 않고 "+s.name+"의 풀이 한 곳만 손가락으로 짚었다.",
          summary:s.name+"에게 정답 대신 작은 힌트를 주었다.",type:"learning",scene:teacherScene
        });
      }
    },
    firstStep:{
      id:"firstStep",category:"support",label:"첫 단계 같이 하기",duration:45,near:true,repeatPenalty:.09,
      desc:"막힘이 큰 학생과 첫 단계만 함께 해결합니다. 효과는 크지만 교사 시간이 많이 듭니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene&&(s.action==="HELP"||s.helpNeed>.16||hasDiagnosticEvidence(s))},
      recommended:function(s){return s.helpNeed>.24||hasDiagnosticEvidence(s)},
      effect:function(s,m){
        recordDiagnosticEvidence(s,"첫 단계 함께 하기");
        s.helpNeed=clamp(s.helpNeed-.22*m);applyLearning(s,.022*m,"firstStep");s.focus=clamp(s.focus+.10*m);s.trust=clamp(s.trust+.012);stats.helped++;
        remember(s,"선생님과 첫 단계를 함께 해결함",.58);
        scriptLog({
          speaker:"선생님",dialogue:teacherLine("first",s),
          replySpeaker:s.name,replyDialogue:studentReply("first",s),
          stage:"첫 단계가 끝나자 선생님이 연필에서 손을 떼고 "+s.name+" 쪽으로 넘겼다.",
          summary:s.name+"과 첫 단계를 함께 풀고 이후 스스로 이어가게 했다.",type:"learning",scene:teacherScene
        });
      }
    },
    simplify:{
      id:"simplify",category:"support",label:"과제를 작게 나누기",duration:35,near:true,repeatPenalty:.05,
      desc:"해야 할 일을 더 작은 단계로 나누어 부담을 낮춥니다.",
      when:function(s){return current().kind==="lesson"&&s.scene===teacherScene&&(s.frustration>.24||hasObservedCurrentWork(s)||hasDiagnosticEvidence(s))},
      recommended:function(s){return s.frustration>.34||s.helpNeed>.22},
      effect:function(s,m){s.frustration=clamp(s.frustration-.13*m);s.helpNeed=clamp(s.helpNeed-.11*m);s.focus=clamp(s.focus+.055*m);s.boredom=clamp(s.boredom-.025);remember(s,"과제를 작은 단계로 나눠 다시 시작함",.48);scriptLog({
        speaker:"선생님",dialogue:teacherLine("simplify",s),
        replySpeaker:s.name,replyDialogue:studentReply("simplify",s),
        stage:"해야 할 부분을 하나씩 가리키자 "+s.name+"이(가) 다시 연필을 들었다.",
        summary:s.name+"의 과제를 더 작은 단계로 나누었다.",type:"learning",scene:teacherScene
      })}
    },
    movementJob:{
      id:"movementJob",category:"support",label:"움직이는 심부름 주기",duration:25,repeatPenalty:.06,
      desc:"움직임 욕구를 억누르기보다 짧은 이동 역할로 풀어낸 뒤 돌아오게 합니다.",
      when:function(s){return s.scene===teacherScene&&(s.action==="MOVE"||s.moveNeed>.30)&&current().kind!=="lunch"},
      recommended:function(s){return s.moveNeed>.48},
      effect:function(s,m){s.moveNeed=clamp(s.moveNeed-.28*m);s.focus=clamp(s.focus+.06*m);s.role="errand";s.roleUntil=gameSec+3*60;requestStudentAction(s,"WALK",{duration:35,force:true});setDestination(s,s.scene,true);remember(s,"짧은 심부름 역할로 움직임을 해결함",.42);log(s.name+"에게 짧게 움직일 수 있는 심부름을 맡겼다.","teacher",teacherScene)}
    },

    gesture:{
      id:"gesture",category:"guide",label:"시선·손짓으로 신호",duration:8,repeatPenalty:.04,
      desc:"수업 흐름을 끊지 않고 비언어적으로 주의를 환기합니다.",
      when:function(s){return s.scene===teacherScene&&isOffTask(s)&&s.action!=="REJECTED"},
      recommended:function(s){return isOffTask(s)&&s.correctionLoad<.18},
      effect:function(s,m){s.focus=clamp(s.focus+.065*m);s.talkNeed=clamp(s.talkNeed-.055*m);s.moveNeed=clamp(s.moveNeed-.045*m);if(m>.55)requestStudentAction(s,current().subject==="체육"?"PLAY":"WORK",{duration:35,force:true});s.correctionLoad=clamp(s.correctionLoad+.025);log(s.name+"에게 시선과 손짓으로 조용히 신호를 보냈다.","teacher",teacherScene)}
    },
    proximity:{
      id:"proximity",category:"guide",label:"가까이 서 있기",duration:20,near:true,repeatPenalty:.035,
      desc:"공개적으로 지적하지 않고 교사의 위치 자체로 행동을 조절합니다.",
      when:function(s){return s.scene===teacherScene&&(isOffTask(s)||s.action==="ARGUE")},
      recommended:function(s){return isOffTask(s)&&s.trust>.48},
      effect:function(s,m){s.focus=clamp(s.focus+.08*m);s.frustration=clamp(s.frustration-.025*m);if(s.action!=="ARGUE")requestStudentAction(s,current().subject==="체육"?"PLAY":"WORK",{duration:35,force:true});s.correctionLoad=clamp(s.correctionLoad+.02);log(s.name+" 가까이에 머물며 행동이 스스로 정돈되는지 살폈다.","teacher",teacherScene)}
    },
    quietCall:{
      id:"quietCall",category:"guide",label:"조용히 이름 불러 재안내",duration:12,repeatPenalty:.09,
      desc:"짧고 분명하게 이름을 부르고 지금 해야 할 행동을 다시 알려줍니다.",
      when:function(s){return s.scene===teacherScene&&isOffTask(s)&&s.action!=="REJECTED"},
      recommended:function(s){return isOffTask(s)&&s.correctionLoad<.35},
      effect:function(s,m){s.focus=clamp(s.focus+.12*m);requestStudentAction(s,current().subject==="체육"?"PLAY":"WORK",{duration:35,force:true});s.intent=null;s.correctionLoad=clamp(s.correctionLoad+.10);s.trust=clamp(s.trust-.004*(1-m));remember(s,"선생님이 조용히 이름을 불러 재안내함",.34);scriptLog({
        speaker:"선생님",dialogue:teacherLine("quiet",s),
        replySpeaker:s.name,replyDialogue:studentReply("quiet",s),
        stage:"선생님은 수업을 멈추지 않은 채 "+s.name+" 쪽으로 시선을 보냈다.",
        summary:s.name+"에게 조용히 재안내했다.",type:"teacher",scene:teacherScene
      })}
    },
    redirect:{
      id:"redirect",category:"guide",label:"해야 할 행동 다시 제시",duration:20,near:true,repeatPenalty:.06,
      desc:"하지 말라는 말 대신 지금 해야 할 구체적인 행동을 제시합니다.",
      when:function(s){return s.scene===teacherScene&&isOffTask(s)},
      recommended:function(s){return s.action==="DOODLE"||s.action==="MOVE"||s.action==="TALK"},
      effect:function(s,m){s.focus=clamp(s.focus+.09*m);s.boredom=clamp(s.boredom-.035*m);requestStudentAction(s,current().subject==="체육"?"PLAY":"WORK",{duration:35,force:true});s.intent=null;s.correctionLoad=clamp(s.correctionLoad+.055);scriptLog({
        speaker:"선생님",dialogue:teacherLine("redirect",s),
        replySpeaker:s.name,replyDialogue:studentReply("redirect",s),
        stage:"선생님이 해야 할 부분을 짧게 가리켰다.",
        summary:s.name+"에게 지금 해야 할 행동을 다시 제시했다.",type:"teacher",scene:teacherScene
      })}
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
      effect:function(s,m){s.focus=clamp(s.focus+.18*m);s.trust=clamp(s.trust-.015-.025*s.correctionLoad);s.correctionLoad=clamp(s.correctionLoad+.20);requestStudentAction(s,"WORK",{duration:35,force:true});s.intent=null;students.forEach(function(o){if(o.scene===s.scene&&distance(o,s)<28)o.focus=clamp(o.focus+.02)});remember(s,"분필 톡으로 공개적인 주의 환기를 받음",.32);log("분필 톡으로 "+s.name+"과 주변의 주의를 즉시 돌렸다.","teacher",teacherScene)}
    },

    immediateStop:{
      id:"immediateStop",category:"guide",label:"즉시 중단·거리 확보",duration:8,near:true,repeatPenalty:0,
      desc:"심각한 신체·위협 행동이 보일 때 다른 목표보다 먼저 행동을 멈추고 거리를 확보합니다.",
      when:function(s){return s.scene===teacherScene&&(isSevereAction(s)||s.action==="SHOVE")},
      recommended:function(s){return isSevereAction(s)||s.action==="SHOVE"},
      effect:function(s){
        var target=seriousTarget(s);
        requestStudentAction(s,"WAIT",{duration:20,force:true,clearTarget:true});s.frustration=clamp(s.frustration-.07);
        if(target){requestStudentAction(target,"WAIT",{duration:20,force:true});target.dx=clamp(target.x+(target.x<50?-10:10),7,93)}
        stats.safetyInterventions++;
        scriptLog({
          speaker:"선생님",dialogue:teacherLine("safety",s),
          replySpeaker:s.name,replyDialogue:studentReply("safety",s),
          stage:"선생님이 두 학생 사이로 들어가 서로의 거리를 벌렸다.",
          summary:"교사가 즉시 행동을 중단시키고 학생들 사이의 거리를 확보했다.",type:"teacher",scene:teacherScene
        });
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
        scriptLog({
          speaker:"선생님",dialogue:teacherLine("checkSafety",s),
          replySpeaker:s.name,replyDialogue:pickLine(["여기가 조금 아파요.","괜찮아요…","조금 놀랐어요."]),
          stage:"선생님이 "+s.name+"의 상태를 먼저 살피며 주변과 거리를 두었다.",
          summary:s.name+"의 안전과 상태를 먼저 확인했다.",type:"teacher",scene:teacherScene
        });
      }
    },
    requestSupport:{
      id:"requestSupport",category:"guide",label:"지원 인력 요청",duration:20,repeatPenalty:0,
      desc:"혼자 처리하기 어려운 심각 상황에서 다른 교직원의 지원을 요청합니다.",
      when:function(s){return s.scene===teacherScene&&(isSevereAction(s)||s.teacherDefiance>.22||s.victimStress>.20)},
      recommended:function(s){return isSevereAction(s)&&(["HIT","THROW_AT_TEACHER","THREATEN"].indexOf(s.action)>=0)},
      effect:function(s){
        s.frustration=clamp(s.frustration-.11);requestStudentAction(s,"WAIT",{duration:30,force:true});s.severeCooldown=Math.max(s.severeCooldown,gameSec+12*60);
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
      effect:function(s,m){s.focus=clamp(s.focus+.045*m);s.trust=clamp(s.trust+.035*m);s.mood=clamp(s.mood+.035*m);s.belonging=clamp(s.belonging+.022*m);circlePeers(s,s.scene).forEach(function(o){if(distance(s,o)<25)o.belonging=clamp(o.belonging+.006*m)});stats.praises++;remember(s,"구체적인 행동을 인정받음",.50);scriptLog({
        speaker:"선생님",dialogue:teacherLine("praise",s),
        replySpeaker:s.name,replyDialogue:studentReply("praise",s),
        stage:s.name+"이(가) 잠깐 선생님 쪽을 바라봤다.",
        summary:s.name+"의 구체적인 행동을 인정했다.",type:"teacher",scene:teacherScene
      })}
    },
    listen:{
      id:"listen",category:"relationship",label:"잠깐 이야기 듣기",duration:40,near:true,repeatPenalty:.025,
      desc:"해결책을 먼저 말하지 않고 학생의 현재 감정과 상황을 짧게 듣습니다.",
      when:function(s){return s.scene===teacherScene&&(s.frustration>.18||s.action==="REJECTED"||s.action==="HURT"||!!conflictPartner(s))},
      recommended:function(s){return s.action==="REJECTED"||s.frustration>.45},
      effect:function(s,m){s.frustration=clamp(s.frustration-.18*m);s.mood=clamp(s.mood+.065*m);s.trust=clamp(s.trust+.04*m);remember(s,"선생님이 먼저 이야기를 들어줌",.58);scriptLog({
        speaker:"선생님",dialogue:"무슨 일이 있었는지 네 이야기부터 들어볼게.",
        replySpeaker:s.name,replyDialogue:studentReply("listen",s),
        stage:"선생님이 바로 해결책을 말하지 않고 "+s.name+"의 말을 기다렸다.",
        summary:s.name+"의 이야기를 먼저 듣고 상황을 확인했다.",type:"teacher",scene:teacherScene
      })}
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
  function executeActionForStudent(id,studentId){
    var s=studentById(studentId),action=TEACHER_ACTIONS[id];
    if(!s||!action||teacherIsBusy()||s.scene!==teacherScene)return;
    var validNow=!action.when||action.when(s);
    if(!validNow&&!actionWasOffered(id,studentId))return;
    selected=s.id;armedActionId=null;armedActionTargetId=null;cardDragActive=false;cardRenderSignature="";
    startTeacherTask(action,s);tutorialEvent("action");render();
  }
  function teacherAction(kind){
    var map={approach:"proximity",call:"quietCall",praise:"praise",hint:"hint",chalk:"chalk",mediate:"mediate",separate:"separate",role:"role"};
    if(map[kind])executeTeacherAction(map[kind]);
  }


  function eventStudentNames(item){
    var names=[];
    function addName(raw){if(!raw)return;String(raw).split(" · ").forEach(function(part){var name=part.trim();if(studentByName(name)&&names.indexOf(name)<0)names.push(name)})}
    addName(item&&item.speaker);addName(item&&item.replySpeaker);
    if(item&&item.text){students.forEach(function(s){if(item.text.indexOf(s.name)>=0&&names.indexOf(s.name)<0)names.push(s.name)})}
    return names;
  }
  function shortMemoText(textValue){var value=String(textValue||"").replace(/\s+/g," ").trim();return value.length>72?value.slice(0,69)+"…":value}
  function buildPeriodMemo(period,periodStats){
    if(!period||period.kind!=="lesson"||!periodStats)return null;
    var events=(periodStats.events||[]).filter(function(e){return e&&e.recordable===true});
    var noteworthy=events.length>0||periodStats.conflicts>0||periodStats.seriousIncidents>0||periodStats.teacherIncidents>0||periodStats.safetyInterventions>0;
    if(!noteworthy)return null;
    var names=[];events.forEach(function(e){eventStudentNames(e).forEach(function(name){if(names.indexOf(name)<0)names.push(name)})});
    var highlights=[];events.slice(-8).reverse().forEach(function(e){var memoText=e.encounterDecision?e.text+" — "+e.choiceText:e.text;var t=shortMemoText(memoText);if(t&&highlights.indexOf(t)<0&&highlights.length<4)highlights.push(t)});
    if(periodStats.conflicts>0&&!highlights.some(function(x){return x.indexOf("갈등")>=0||x.indexOf("말다툼")>=0}))highlights.push("또래 갈등 "+periodStats.conflicts+"건이 수업 흐름에 영향을 주었다.");
    if(periodStats.seriousIncidents>0&&!highlights.some(function(x){return x.indexOf("심각")>=0||x.indexOf("위협")>=0||x.indexOf("신체")>=0}))highlights.push("안전 확인이 필요한 심각 상황 "+periodStats.seriousIncidents+"건이 발생했다.");
    highlights=highlights.slice(0,4);
    var responses=[];if(periodStats.safetyInterventions)responses.push("안전 개입 "+periodStats.safetyInterventions+"회");if(periodStats.teacherActs)responses.push("교사 개입 "+periodStats.teacherActs+"회");if(periodStats.reconciled)responses.push("갈등 정리 "+periodStats.reconciled+"건");if(periodStats.helped)responses.push("개별 학습 지원 "+periodStats.helped+"회");
    return {day:dayIndex,stamp:fmtMin(period.end),text:period.name+" 종료 메모 · 기록할 만한 상황 "+events.length+"건",type:"period_summary",scene:period.loc||"classroom",script:false,recordable:true,periodSummary:true,periodName:period.name,periodSubject:period.subject||"",periodRange:fmtMin(period.start)+"~"+fmtMin(period.end),studentNames:names.slice(0,8),highlights:highlights,responseSummary:responses.join(" · ")};
  }
  function finalizePeriodMemo(period,periodStats){if(!period||period.kind!=="lesson")return;var key=period.start+"-"+period.end+"-"+period.name;if(periodMemoKeys[key])return;periodMemoKeys[key]=true;var memo=buildPeriodMemo(period,periodStats);if(!memo)return;dayEvents.push(memo);dayEvents=dayEvents.slice(-200)}

  function openReport(force){
    if(reportOpen)return;
    if(current().kind!=="lesson"&&!force)return;
    reportWasRunning=running;reportOpen=true;running=false;
    var p=current(),nowClass=classDashboard(),startClass=(stats&&stats.classStart)||nowClass;
    var periodDecisions=encounterHistory.filter(function(h){
      return (h.day||1)===dayIndex&&h.time>=p.start&&h.time<=Math.min(gameMinute(),p.end);
    });
    var recordEvents=(stats&&stats.events||[]).filter(function(e){return e&&e.recordable===true});
    var affected=[];
    periodDecisions.forEach(function(h){
      [h.studentId,h.targetId].forEach(function(id){if(id!==null&&id!==undefined&&affected.indexOf(id)<0)affected.push(id)});
    });
    recordEvents.forEach(function(e){
      [e.studentId,e.targetId].forEach(function(id){if(id!==null&&id!==undefined&&affected.indexOf(id)<0)affected.push(id)});
    });
    var flowDelta=nowClass.flow-startClass.flow;
    q("#reportTitle").textContent=p.name+" 정리";
    q("#reportSub").textContent=fmtMin(p.start)+"~"+fmtMin(Math.min(gameMinute(),p.end))+" · 평점 없이 실제 판단과 변화만 정리합니다.";
    q("#mDecisions").textContent=periodDecisions.length;
    q("#mRecords").textContent=recordEvents.length;
    q("#mAffected").textContent=affected.length;
    q("#mFlow").textContent=(flowDelta>0?"+":"")+flowDelta;

    var eventLines=periodDecisions.map(function(h){
      var s=studentById(h.studentId);
      return "<li><strong>"+fmtMin(h.time)+"</strong> "+escHtml(s?s.name:"학생")+" · "+escHtml(h.direction)+" · "+escHtml(h.title)+"</li>";
    });
    if(!eventLines.length)eventLines.push("<li>이 교시에는 판단 카드가 발생하지 않았습니다.</li>");
    q("#incidentList").innerHTML=eventLines.join("");

    var findings=[];
    var classLabels={flow:"수업 흐름",relationship:"학급 관계",stability:"생활 안정",trust:"교사 신뢰"};
    Object.keys(classLabels).forEach(function(k){
      var d=nowClass[k]-startClass[k];
      if(d)findings.push(classLabels[k]+" "+startClass[k]+"→"+nowClass[k]+" ("+(d>0?"+":"")+d+")");
    });
    var starts=(stats&&stats.studentStart)||[];
    var changed=starts.map(function(entry){
      var s=studentById(entry.id);if(!s)return null;
      var after=studentDashboard(s,p.subject||null),before=entry.state,keys=["learning","focus","mood","relation","trust"];
      var score=keys.reduce(function(sum,k){return sum+Math.abs((after[k]||0)-(before[k]||0))},0);
      return {s:s,before:before,after:after,score:score};
    }).filter(Boolean).sort(function(a,b){return b.score-a.score}).slice(0,3);
    var metricLabels={learning:"학습",focus:"집중",mood:"정서",relation:"관계",trust:"신뢰"};
    changed.forEach(function(row){
      if(row.score<=0)return;
      var parts=Object.keys(metricLabels).filter(function(k){return row.before[k]!==row.after[k]}).slice(0,3).map(function(k){
        return metricLabels[k]+" "+row.before[k]+"→"+row.after[k];
      });
      if(parts.length)findings.push(row.s.name+" · "+parts.join(" · "));
    });
    if(!findings.length)findings.push("큰 수치 변화 없이 교시가 진행되었습니다.");
    q("#findingList").innerHTML=findings.map(function(x){return "<li>"+escHtml(x)+"</li>"}).join("");
    q("#report").hidden=false;
  }
  function nextPeriod(){
    reportOpen=false;
    q("#report").hidden=true;
    running=reportWasRunning;
    render();
  }
  function periodForMinute(m){
    if(m<schedule[0].start)return 0;
    for(var i=0;i<schedule.length;i++)if(m>=schedule[i].start&&m<schedule[i].end)return i;
    return schedule.length-1;
  }
  function handlePeriodChange(){
    var idx=periodForMinute(gameMinute());
    if(idx!==periodIndex){
      var old=schedule[periodIndex];
      if(old.kind==="lesson")finalizePeriodMemo(old,stats);
      periodIndex=idx;teacherTask=null;newStats();assignPeriodDestinations();selected=null;connectMode=false;
      if(nextEncounterAt>current().end*60)nextEncounterAt=gameSec+rand(500,1000);
      log(current().name+"이(가) 시작되었다.","ambient",teacherScene);
    }
    return true;
  }
  function actionClass(s){
    return s.action.toLowerCase();
  }
  function seated(s){
    if(s.scene!=="classroom")return false;
    return ["WORK","READ","TALK","DOODLE","HELP","SLEEP","ATTEND","PAIR_WORK","RAISE_HAND"].indexOf(s.action)>=0&&current().kind!=="closing";
  }
  function intentText(s){
    if(!s.intent)return "";
    var map={TALK:"말하고 싶음",DOODLE:"딴짓하고 싶음",HELP:"도움 필요",SLEEP:"졸림",MOVE:"움직이고 싶음",PLAY:"같이 놀고 싶음",COMPETE:"겨뤄보고 싶음",HELP_PEER:"도와주고 싶음",ARGUE:"따지고 싶음"};
    return map[s.intent]||"다른 행동을 생각 중";
  }
  function shortAction(s){
    var target=studentById(s.socialTarget);
    var t=target?target.name:"";
    var map={
      SEEK:t?t+"에게 감":"친구에게 감",TALK:"대화 중",PAIR_WORK:"짝활동",HELP_PEER:"친구 도움",HELP:"도움 기다림",
      COMFORT:"위로 중",BORROW_ITEM:"준비물 빌림",PASS_NOTE:"쪽지 건넴",TEASE:"놀림",REJECTED:"머뭇거림",
      ARGUE:"말다툼",SHOVE:"거친 몸짓",HIT:"신체갈등",THREATEN:"위협",EXCLUDE_TARGET:"배제",
      TAKE_ITEM_FORCE:"물건 빼앗음",DEFEND_PEER:"친구 보호",REPORT_INCIDENT:"교사에게 알림",
      REFUSE_INSTRUCTION:"안내 거부",SHOUT_TEACHER:"교사에게 고성",INSULT_TEACHER:"모욕적 말",THROW_AT_TEACHER:"물건 던짐",
      RAISE_HAND:"손듦",PRESENT:"발표 중",SLEEP:"졸고 있음",LOOK_OUTSIDE:"창밖 봄",RUN:"뜀"
    };
    return map[s.action]||"";
  }
  function actionTone(s){
    if(["COMFORT","HELP_PEER","DEFEND_PEER","REPORT_INCIDENT","PAIR_WORK"].indexOf(s.action)>=0)return "positive";
    if(["TEASE","REJECTED","ARGUE","REFUSE_INSTRUCTION","SHOUT_TEACHER"].indexOf(s.action)>=0)return "warning";
    if(["SHOVE","HIT","THREATEN","EXCLUDE_TARGET","TAKE_ITEM_FORCE","INSULT_TEACHER","THROW_AT_TEACHER"].indexOf(s.action)>=0)return "danger";
    return "neutral";
  }
  function renderProps(){
    var world=q("#world"),scene=teacherScene;
    world.className="world scene-"+scene+(tutorialState.active?" tutorial-active":"");q("#sceneTitle").textContent=SCENE_NAME[scene];
    var html="";
    if(scene==="classroom"){
      html+='<div class="room-prop class-board">'+boardText()+'</div><div class="room-prop teacher-desk"></div><div class="room-prop class-window"></div><div class="room-prop class-door"></div><div class="room-prop class-shelf"></div>';
      seats.forEach(function(p,i){
        var deskY=clamp(p.y+2.4,0,96);
        html+='<div class="fixed-desk desk-back" data-seat="'+i+'" style="left:'+p.x+'%;top:'+deskY+'%"><i class="desk-paper"></i></div>';
        html+='<div class="desk-apron" data-seat="'+i+'" style="left:'+p.x+'%;top:'+deskY+'%"></div>';
      });
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
    if(p.kind==="lesson")return p.subject+" · "+(p.unit||currentPhase().label)+" · "+currentPhase().label;
    if(p.kind==="morning")return "가방 정리 · 아침 독서";
    if(p.kind==="closing")return "청소 · 오늘 하루 돌아보기";
    return "우리 반";
  }
  function handleStudentClick(id){
    var s=studentById(id);if(!s)return;
    if(pendingEncounter&&pendingEncounter.studentId===id){openPendingEncounter();return}
    if(armedActionId){executeActionForStudent(armedActionId,id);return}
    tutorialEvent("student");
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
        swapMode=false;stats.teacherActs++;consumeTeacherTime("자리 조정",35);
        log(a.name+"와 "+s.name+"의 자리를 바꾸었다.","teacher","classroom");
      }
    }
    if(selected===s.id&&!swapMode&&!connectMode)selected=null;
    else selected=s.id;
    render();
  }
  function ensureStudentNode(s){
    if(studentNodes[s.id])return studentNodes[s.id];
    var b=document.createElement("button");b.type="button";b.className="student";b.dataset.studentId=s.id;
    var status=document.createElement("span");status.className="status-stack";
    var intent=document.createElement("span");intent.className="intent-tag";intent.hidden=true;
    var action=document.createElement("span");action.className="action-tag";action.hidden=true;
    status.appendChild(intent);status.appendChild(action);b.appendChild(status);
    var signal=document.createElement("span");signal.className="student-signal";signal.hidden=true;signal.setAttribute("aria-hidden","true");b.appendChild(signal);
    var speech=document.createElement("span");speech.className="student-speech";speech.hidden=true;speech.setAttribute("aria-live","polite");b.appendChild(speech);
    var fx=document.createElement("span");fx.className="student-action-fx";fx.hidden=true;fx.setAttribute("aria-hidden","true");b.appendChild(fx);

    var wrap=document.createElement("span");wrap.className="sprite-wrap";
    var standing=createStandingAvatar(s.look);
    var seatedRig=createSeatedAvatar(s.look);
    seatedRig.hidden=true;
    wrap.appendChild(standing);wrap.appendChild(seatedRig);b.appendChild(wrap);

    var nm=document.createElement("span");nm.className="student-name";nm.textContent=s.name;b.appendChild(nm);
    b.addEventListener("click",function(){handleStudentClick(Number(this.dataset.studentId))});
    b.addEventListener("dragover",function(e){if(e.dataTransfer){e.preventDefault();this.classList.add("drop-target")}});
    b.addEventListener("dragleave",function(){this.classList.remove("drop-target")});
    b.addEventListener("drop",function(e){
      e.preventDefault();this.classList.remove("drop-target");
      var actionId=(e.dataTransfer&&e.dataTransfer.getData("text/plain"))||armedActionId;
      if(actionId)executeActionForStudent(actionId,Number(this.dataset.studentId));
    });
    q("#students").appendChild(b);
    studentNodes[s.id]={root:b,standing:standing,seated:seatedRig,intent:intent,action:action,name:nm,signal:signal,speech:speech,fx:fx};
    return studentNodes[s.id];
  }
  function isImportantVisualAction(s){
    return ["HELP","REJECTED","ARGUE","SHOVE","HURT","TEASE","EXCLUDE_TARGET","TAKE_ITEM_FORCE","THREATEN","HIT",
      "REFUSE_INSTRUCTION","SHOUT_TEACHER","INSULT_TEACHER","THROW_AT_TEACHER","DEFEND_PEER","REPORT_INCIDENT"].indexOf(s.action)>=0;
  }
  function visualActionFx(s){
    var map={
      WORK:{icon:"✎",cls:"write"},READ:{icon:"▤",cls:"read"},TALK:{icon:"…",cls:"talk"},DOODLE:{icon:"✦",cls:"write"},
      DRINK_WATER:{icon:"💧",cls:"water"},BORROW_ITEM:{icon:"✏️",cls:"item"},DROP_ITEM:{icon:"↓",cls:"item"},PASS_NOTE:{icon:"✉",cls:"item"},
      LOOK_OUTSIDE:{icon:"↗",cls:"read"},EAT:{icon:"🍴",cls:"item"},SHARE:{icon:"↔",cls:"item"},CLEAN:{icon:"🧹",cls:"clean"},
      PLAY:{icon:"★",cls:"play"},COMPETE:{icon:"⚡",cls:"play"},COMFORT:{icon:"♥",cls:"care"},HELP_PEER:{icon:"+",cls:"care"},
      PRESENT:{icon:"✦",cls:"play"},ASK_BATHROOM:{icon:"🚻",cls:"item"},TEASE:{icon:"…!",cls:"alert"}
    };
    return map[s.action]||null;
  }
  function visualSignal(s){
    if(["HIT","SHOVE","THREATEN","THROW_AT_TEACHER","TAKE_ITEM_FORCE"].indexOf(s.action)>=0)return {icon:"💥",tone:"danger",label:"위험한 행동"};
    if(s.action==="HURT"||s.victimStress>.15)return {icon:"😣",tone:"mood",label:"불편하거나 놀란 상태"};
    if(s.action==="ARGUE")return {icon:"😠",tone:"danger",label:"말다툼"};
    if(s.action==="TEASE")return {icon:"😏",tone:"danger",label:"놀리는 중"};
    if(s.action==="EXCLUDE_TARGET")return {icon:"🚫",tone:"danger",label:"친구를 배제하는 중"};
    if(["REFUSE_INSTRUCTION","SHOUT_TEACHER","INSULT_TEACHER"].indexOf(s.action)>=0)return {icon:"😤",tone:"danger",label:"교사 안내에 강하게 반발"};
    if(s.action==="REJECTED")return {icon:"😞",tone:"mood",label:"속상해하는 중"};
    if(s.frustration>.58)return {icon:"😠",tone:"mood",label:"기분이 많이 상한 상태"};
    if(s.mood<.44)return {icon:"😟",tone:"mood",label:"기분이 좋지 않은 상태"};
    if(["HELP","RAISE_HAND","REPORT_INCIDENT"].indexOf(s.action)>=0||s.helpNeed>.30)return {icon:"🙋",tone:"help",label:"도움이나 말할 것이 있음"};
    if(["HELP_PEER","COMFORT","DEFEND_PEER"].indexOf(s.action)>=0)return {icon:"🤝",tone:"positive",label:"친구를 돕는 중"};
    if(["TALK","PAIR_WORK"].indexOf(s.action)>=0)return {icon:"💬",tone:"talk",label:"이야기 중"};
    if(["WORK","READ","ATTEND"].indexOf(s.action)>=0)return {icon:"📚",tone:"study",label:"공부 중"};
    if(["DOODLE","PASS_NOTE"].indexOf(s.action)>=0)return {icon:"📝",tone:"activity",label:"다른 행동 중"};
    if(s.action==="SLEEP")return {icon:"😴",tone:"mood",label:"졸고 있음"};
    if(["MOVE","RUN","STRETCH"].indexOf(s.action)>=0)return {icon:"🏃",tone:"activity",label:"움직이는 중"};
    if(["PLAY","COMPETE"].indexOf(s.action)>=0)return {icon:"⚽",tone:"activity",label:"놀이·활동 중"};
    if(["EAT","SHARE"].indexOf(s.action)>=0)return {icon:"🍱",tone:"activity",label:"식사 중"};
    if(s.action==="CLEAN")return {icon:"🧹",tone:"activity",label:"정리 중"};
    if(s.action==="DRINK_WATER")return {icon:"🥤",tone:"activity",label:"물을 마시는 중"};
    if(["BORROW_ITEM","DROP_ITEM"].indexOf(s.action)>=0)return {icon:"✏️",tone:"activity",label:"준비물을 다루는 중"};
    if(s.action==="LOOK_OUTSIDE")return {icon:"🪟",tone:"activity",label:"창밖을 보는 중"};
    if(s.action==="PRESENT")return {icon:"🎤",tone:"activity",label:"발표 중"};
    return null;
  }
  function priorityScore(s){
    var score=0;
    if(isSevereAction(s))score=Math.max(score,100);
    if(s.action==="SHOVE")score=Math.max(score,96);
    if(s.action==="HURT"||s.victimStress>.15)score=Math.max(score,92);
    if(s.action==="ARGUE")score=Math.max(score,82);
    if(s.action==="REPORT_INCIDENT")score=Math.max(score,78);
    if(["SHOUT_TEACHER","REFUSE_INSTRUCTION"].indexOf(s.action)>=0)score=Math.max(score,72);
    if(s.action==="HELP")score=Math.max(score,68);
    if(s.action==="REJECTED"||s.action==="TEASE")score=Math.max(score,58);
    if(s.action==="SLEEP")score=Math.max(score,50);
    if(s.helpNeed>.24)score=Math.max(score,44);
    if(isOffTask(s))score=Math.max(score,35);
    if(s.intent)score=Math.max(score,30);
    return score;
  }
  function priorityReason(s){
    var target=studentById(s.socialTarget);
    if(isSevereAction(s))return target?target.name+" 관련 즉시 안전 확인":"즉시 안전 확인 필요";
    if(s.action==="HURT"||s.victimStress>.15)return "상태와 안전 확인이 필요해 보임";
    if(s.action==="ARGUE")return target?target.name+"와 말다툼 중":"말다툼이 이어지는 중";
    if(s.action==="REPORT_INCIDENT")return "교사에게 상황을 알리려 함";
    if(s.action==="HELP"||s.helpNeed>.24)return "학습 도움을 기다리는 중";
    if(s.action==="REJECTED")return "또래 관계에서 머뭇거리는 중";
    if(s.action==="TEASE")return target?target.name+"을(를) 놀리는 중":"놀림 행동이 보임";
    if(s.action==="SLEEP")return "집중이 떨어지고 졸고 있음";
    if(isOffTask(s))return humanAction(s);
    if(s.intent)return intentText(s);
    return humanAction(s);
  }
  function renderRoomOverview(){
    var visible=students.filter(function(s){return s.scene===teacherScene}).length;
    var note=q("#offscreen");if(note)note.textContent=visible+"명 보임";
  }
  function renderInteractionLinks(){
    var svg=q("#interactionLinks"),seen={};svg.innerHTML="";
    students.filter(function(s){
      if(s.scene!==teacherScene||s.socialTarget===null||!isMeaningfulInteractionAction(s.action))return false;
      var t=studentById(s.socialTarget);
      return selected===s.id||selected===(t&&t.id)||isSevereAction(s)||["ARGUE","SHOVE","DEFEND_PEER","REPORT_INCIDENT"].indexOf(s.action)>=0;
    }).forEach(function(s){
      var t=studentById(s.socialTarget);if(!t||t.scene!==teacherScene)return;
      var symmetric=["TALK","PAIR_WORK","ARGUE","COMPETE"].indexOf(s.action)>=0;
      var key=symmetric?[s.id,t.id].sort().join("-"):s.id+"-"+t.id+"-"+s.action;
      if(seen[key])return;seen[key]=1;
      var line=document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1",s.x);line.setAttribute("y1",s.y);line.setAttribute("x2",t.x);line.setAttribute("y2",t.y);
      line.setAttribute("class",actionTone(s));
      svg.appendChild(line);
    });
  }
  function renderStudents(){
    var visible=students.filter(function(s){return s.scene===teacherScene});
    students.forEach(function(s){
      var n=ensureStudentNode(s),show=s.scene===teacherScene;
      n.root.style.display=show?"block":"none";
      if(!show)return;
      var isSeated=seated(s),signal=visualSignal(s),fx=visualActionFx(s),tone=actionTone(s);
      n.root.className="student "+actionClass(s)+(s.moving?" locomotion":"")+(isSeated?" seated":"")+(selected===s.id?" selected":"")+(s.facing<0?" face-left":"")+" tone-"+tone;
      n.root.style.left=s.x+"%";n.root.style.top=s.y+"%";
      n.root.style.zIndex=isSeated?"10":String(12+Math.round(s.y/9));
      n.signal.hidden=!signal;
      if(signal){n.signal.textContent=signal.icon;n.signal.className="student-signal "+signal.tone;n.signal.title=signal.label}
      var showSpeech=!!s.speechText&&gameSec<(s.speechUntil||0);
      n.speech.hidden=!showSpeech;
      if(showSpeech){
        n.speech.textContent=s.speechText;
        var edge=s.x<14?" edge-left":s.x>86?" edge-right":"";
        n.speech.className="student-speech "+(s.speechTone||"normal")+edge;
      }else if(s.speechText&&gameSec>=(s.speechUntil||0)){s.speechText="";s.speechTone="normal"}
      n.fx.hidden=true;
      n.root.setAttribute("aria-label",s.name+" "+humanAction(s));
      n.standing.hidden=isSeated;n.seated.hidden=!isSeated;
      var showIntent=selected===s.id;
      var it=showIntent?intentText(s):"";
      n.intent.hidden=!it;if(it)n.intent.textContent=it;
      var at=shortAction(s);
      var showAction=selected===s.id;
      n.action.hidden=!at||!showAction;
      if(at&&showAction){n.action.textContent=at;n.action.className="action-tag "+actionTone(s)}
    });
    renderInteractionLinks();
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
    var teacherEl=q("#teacher");if(teacherEl)teacherEl.classList.toggle("busy",teacherIsBusy());
  }
  function quickActionScore(a,s){
    var base={immediateStop:220,checkSafety:210,requestSupport:195,mediate:145,separate:140,documentIncident:125,probeConcept:110,inspectWork:104,checkQuestion:100,hint:98,firstStep:96,gesture:94,redirect:92,proximity:88,quietCall:86,listen:84,praise:78,simplify:76,movementJob:74,watch:68,role:62,seatAdjust:58,connectPeer:55,circleRole:52,chalk:25,attentionSignal:100,microBreak:96,scanRoom:90,classPraise:82};
    var score=base[a.id]||40;
    if(a.recommended&&a.recommended(s))score+=120;
    if(s){
      if(isSevereAction(s)||s.action==="SHOVE"){if(["immediateStop","requestSupport","documentIncident"].indexOf(a.id)>=0)score+=160}
      else if(s.action==="ARGUE"){if(["mediate","separate","listen","watch"].indexOf(a.id)>=0)score+=100}
      else if(s.action==="HELP"||s.helpNeed>.24){if(["inspectWork","checkQuestion","hint","firstStep","probeConcept"].indexOf(a.id)>=0)score+=90}
      else if(isOffTask(s)){if(["gesture","proximity","redirect","quietCall"].indexOf(a.id)>=0)score+=80}
      else if(isPositiveAction(s)&&a.id==="praise")score+=70;
    }
    return score;
  }
  function quickActionsFor(s){
    var source=s?TEACHER_ACTIONS:CLASS_ACTIONS;
    return Object.keys(source).map(function(k){return source[k]}).filter(function(a){return !a.instruction&&(!a.when||a.when(s))}).sort(function(a,b){return quickActionScore(b,s)-quickActionScore(a,s)}).slice(0,4);
  }
  function renderQuickActions(){
    var box=q("#quickActions"),wrap=q("#quickActionButtons"),target=q("#quickTarget");
    if(!box||!wrap||!target)return;
    box.hidden=!!reportOpen;if(reportOpen)return;
    var s=studentById(selected),actions=quickActionsFor(s);
    target.textContent=s?s.name+" · "+humanAction(s):SCENE_NAME[teacherScene]+" 전체";
    wrap.innerHTML=actions.map(function(a){
      var ui=actionUi(a.id),recommended=!!(a.recommended&&a.recommended(s)),urgent=["immediateStop","checkSafety","requestSupport"].indexOf(a.id)>=0;
      var cost=a.mode?"두 명 선택":fmtDuration(a.duration||0);
      return '<button type="button" class="quick-action '+(recommended?"recommended ":"")+(urgent?"urgent":"")+'" data-action-id="'+a.id+'" '+(teacherIsBusy()?"disabled":"")+'>'+
        '<span class="quick-action-icon">'+ui.icon+'</span><span class="quick-action-copy"><strong>'+escHtml(ui.short)+'</strong><small>'+escHtml(ui.cue)+' · '+escHtml(cost)+'</small></span>'+
        (recommended?'<span class="quick-action-badge">'+(urgent?"우선":"추천")+'</span>':'')+'</button>';
    }).join("");
  }

  function computeStudentToolActionIds(s){
    var ids;
    if(isSevereAction(s)||s.action==="SHOVE"||s.action==="HURT")ids=["immediateStop","checkSafety","requestSupport","documentIncident"];
    else if(s.action==="ARGUE"||conflictPartner(s))ids=["listen","mediate","separate","watch"];
    else if(s.action==="HELP"||s.helpNeed>.22)ids=["inspectWork","checkQuestion","hint","firstStep"];
    else if(isOffTask(s))ids=["watch","gesture","redirect","proximity"];
    else if(isPositiveAction(s))ids=["praise","watch","role","listen"];
    else ids=["watch","praise","listen","role"];
    if(tutorialState.active&&tutorialState.step===2&&ids.indexOf("watch")<0)ids.unshift("watch");
    return ids.filter(function(id){var a=TEACHER_ACTIONS[id];return a&&(!a.when||a.when(s))}).slice(0,4);
  }
  function studentToolActions(s){
    if(!s)return [];
    var urgent=isSevereAction(s)||s.action==="SHOVE"||s.action==="HURT";
    var snapValid=cardTraySnapshot.targetId===s.id&&gameSec<cardTraySnapshot.expiresAt;
    if(urgent&&!cardTraySnapshot.urgent)snapValid=false;
    if(!snapValid&&!cardDragActive){
      cardTraySnapshot={targetId:s.id,ids:computeStudentToolActionIds(s),expiresAt:gameSec+45,urgent:urgent};
    }
    var ids=(cardTraySnapshot.targetId===s.id&&cardTraySnapshot.ids.length)?cardTraySnapshot.ids:computeStudentToolActionIds(s);
    return ids.map(function(id){return TEACHER_ACTIONS[id]}).filter(Boolean);
  }
  function actionWasOffered(id,studentId){
    return cardTraySnapshot.targetId===studentId&&cardTraySnapshot.ids.indexOf(id)>=0&&gameSec<cardTraySnapshot.expiresAt+20;
  }
  function renderTeacherCards(){
    var tray=q("#actionTray"),wrap=q("#teacherActionCards"),target=q("#actionTrayTarget"),s=studentById(selected);
    if(!tray||!wrap||!target)return;
    tray.hidden=true;
    return;
    var actions=s?studentToolActions(s):[];
    tray.hidden=!s||!actions.length||reportOpen||!!toolModalKind;
    if(tray.hidden)return;
    target.textContent=s.name+" · "+humanAction(s);
    tray.classList.toggle("tutorial-focus",tutorialState.active&&tutorialState.step===2);
    var signature=s.id+"|"+actions.map(function(a){return a.id}).join(",")+"|"+(armedActionId||"");
    if(cardDragActive)return;
    if(cardRenderSignature===signature)return;
    cardRenderSignature=signature;
    wrap.innerHTML=actions.map(function(a){
      var ui=actionUi(a.id);
      return '<button type="button" draggable="true" class="teacher-card '+(armedActionId===a.id?"armed":"")+'" data-action-id="'+a.id+'"><span class="card-icon">'+ui.icon+'</span><span><strong>'+escHtml(ui.short)+'</strong><small>'+escHtml(ui.cue)+' · '+escHtml(fmtDuration(a.duration||0))+'</small></span></button>';
    }).join("");
  }
  function renderClassroomTools(){
    var console=q("#classroomConsole");
    if(console)console.hidden=teacherScene!=="classroom"||reportOpen||!!toolModalKind||dayEnded;
    qa(".class-tool").forEach(function(el){el.classList.remove("tutorial-focus")});
  }

  function closeToolModal(resume){
    var modal=q("#toolModal");if(modal)modal.hidden=true;toolModalKind=null;
    if(resume!==false)running=modalWasRunning;renderClassroomTools();
  }
  function recordableEvent(item){return !!item&&item.recordable===true}
  function recordEntryHtml(item){
    var place=SCENE_NAME[item.scene]||item.scene||"",dayLabel="Day "+(item.day||1)+" · ";
    if(item.daySummary){
      var m=item.metrics||{},st=item.styles||{};
      return '<article class="record-entry period_summary"><div class="period-memo-title"><strong>🌇 Day '+(item.day||1)+' 하루 마무리</strong><span>하루 요약</span></div>'+
        '<div class="period-memo-meta">판단 '+(item.encounterCount||0)+'회 · 후속 예정 '+(item.followUpCount||0)+'건</div>'+
        '<div class="decision-deltas"><span>📖 흐름 '+(m.flow||0)+'</span><span>🤝 관계 '+(m.relationship||0)+'</span><span>🧭 안정 '+(m.stability||0)+'</span><span>❤️ 신뢰 '+(m.trust||0)+'</span></div>'+
        '<div class="decision-deltas"><span>↑ 원칙 '+(st.up||0)+'</span><span>↓ 공감 '+(st.down||0)+'</span><span>← 코칭 '+(st.left||0)+'</span><span>→ 자율 '+(st.right||0)+'</span></div></article>';
    }
    if(item.followUpOutcome){
      var fd=item.delta||{},fb=item.before||{},fa=item.after||{},fl={learning:"📚 학습"+(item.metricSubject?"("+item.metricSubject+")":""),focus:"🎯 집중",mood:"🙂 정서",relation:"🤝 관계",trust:"❤️ 신뢰"};
      var fdelta=Object.keys(fl).filter(function(k){return fd[k]}).map(function(k){return '<span>'+fl[k]+' '+fb[k]+'→'+fa[k]+' ('+(fd[k]>0?"+":"")+fd[k]+')</span>'}).join("");
      return '<article class="record-entry followup_decision"><div class="record-entry-head"><time>'+dayLabel+escHtml(item.stamp||"")+'</time><span class="record-place">'+escHtml(place)+'</span><span class="followup-badge">후속 결과</span></div>'+
        '<div class="record-summary">'+escHtml(item.text||"")+'</div>'+
        '<div class="record-stage">이전 판단 · '+escHtml(item.sourceDirection||"")+' · '+escHtml(item.sourceChoice||"")+'</div>'+
        '<div class="record-stage">'+escHtml(item.resultText||"")+'</div>'+
        (fdelta?'<div class="decision-deltas">'+fdelta+'</div>':'')+'</article>';
    }
    if(item.encounterDecision){
      var s=studentById(item.studentId),d=item.delta||{},before=item.before||{},after=item.after||{},labels={learning:"📚 학습"+(item.metricSubject?"("+item.metricSubject+")":""),focus:"🎯 집중",mood:"🙂 정서",relation:"🤝 관계",trust:"❤️ 신뢰"};
      var deltaHtml=Object.keys(labels).filter(function(k){return d[k]!==undefined&&d[k]!==0}).map(function(k){return '<span>'+labels[k]+' '+escHtml(before[k])+'→'+escHtml(after[k])+' ('+(d[k]>0?"+":"")+d[k]+')</span>'}).join("");
      var cb=item.beforeClass||{},ca=item.afterClass||{},classLabels={flow:"📖 흐름",relationship:"🏫 관계",stability:"🧭 안정",trust:"❤️ 학급신뢰"};
      var classDeltaHtml=Object.keys(classLabels).filter(function(k){return cb[k]!==undefined&&ca[k]!==undefined&&cb[k]!==ca[k]}).map(function(k){return '<span>'+classLabels[k]+' '+cb[k]+'→'+ca[k]+'</span>'}).join("");
      return '<article class="record-entry '+(item.isFollowUp?"followup_decision":"encounter_decision")+'"><div class="record-entry-head"><time>'+dayLabel+escHtml(item.stamp||"")+'</time><span class="record-place">'+escHtml(place)+'</span><span class="decision-philosophy">'+escHtml(item.direction||"판단")+'</span>'+(item.isFollowUp?'<span class="followup-badge">후속 판단</span>':'')+'</div>'+
        '<div class="record-summary">'+escHtml(item.text||"")+'</div>'+
        (item.studentTraits&&item.studentTraits.length?'<div class="record-stage">참고 특성 · '+escHtml(item.studentTraits.join(" · "))+'</div>':'')+
        '<div class="record-stage">교사의 판단 · '+escHtml(item.choiceText||"")+'</div>'+
        (item.resultText?'<div class="record-stage">결과 · '+escHtml(item.resultText)+'</div>':'')+
        (item.studentReaction?'<div class="record-stage">학생 반응 · '+escHtml(item.studentReaction)+'</div>':'')+
        (deltaHtml?'<div class="decision-deltas">'+deltaHtml+'</div>':'')+
        (classDeltaHtml?'<div class="decision-deltas">'+classDeltaHtml+'</div>':'')+'</article>';
    }
    if(item.periodSummary){
      var names=(item.studentNames||[]).join(" · ");
      var memoHtml='<article class="record-entry period_summary"><div class="period-memo-title"><strong>🗒️ '+escHtml(item.periodName||"교시")+' 메모</strong><span>교시 종료 정리</span></div>'+
        '<div class="period-memo-meta">Day '+(item.day||1)+' · '+escHtml(item.periodRange||"")+(item.periodSubject?" · "+escHtml(item.periodSubject):"")+(names?" · 관련 학생 "+escHtml(names):"")+'</div>';
      if(item.highlights&&item.highlights.length)memoHtml+='<ul class="period-memo-list">'+item.highlights.map(function(x){return '<li>'+escHtml(x)+'</li>'}).join("")+'</ul>';
      if(item.responseSummary)memoHtml+='<div class="period-memo-response">교사 대응 · '+escHtml(item.responseSummary)+'</div>';
      return memoHtml+'</article>';
    }
    var html='<article class="record-entry '+escHtml(item.type||"normal")+'"><div class="record-entry-head"><time>'+dayLabel+escHtml(item.stamp||"")+'</time><span class="record-place">'+escHtml(place)+'</span></div><div class="record-summary">'+escHtml(item.text||"")+'</div>';
    if(item.script){
      if(item.stage)html+='<div class="record-stage">'+escHtml(item.stage)+'</div>';
      if(item.dialogue||item.replyDialogue){
        html+='<div class="record-dialogue">';
        if(item.dialogue)html+='<div class="record-line"><strong>'+escHtml(item.speaker||"학생")+'</strong><span>“'+escHtml(item.dialogue)+'”</span></div>';
        if(item.replyDialogue)html+='<div class="record-line reply"><strong>'+escHtml(item.replySpeaker||"학생")+'</strong><span>“'+escHtml(item.replyDialogue)+'”</span></div>';
        html+='</div>';
      }
    }
    return html+'</article>';
  }
  function renderToolModal(kind){
    var title=q("#toolModalTitle"),kicker=q("#toolModalKicker"),body=q("#toolModalBody"),s=studentById(selected);
    if(!title||!body)return;
    if(kind==="computer"){
      kicker.textContent="오늘 현황";title.textContent=current().name;
      var cm=classDashboard(),today=todayEncounters(),currentCount=periodEncounterCount();
      var html='<div class="tool-section"><h4>현재 일과</h4><div>'+escHtml(current().unit||current().name)+'</div></div>'+
        '<div class="roster-summary">'+
          '<div><strong>'+cm.flow+'</strong><small>📖 수업 흐름</small></div>'+
          '<div><strong>'+cm.relationship+'</strong><small>🤝 학급 관계</small></div>'+
          '<div><strong>'+cm.stability+'</strong><small>🧭 생활 안정</small></div>'+
          '<div><strong>'+cm.trust+'</strong><small>❤️ 교사 신뢰</small></div>'+
        '</div>'+
        '<div class="tool-section"><h4>오늘의 판단 흐름</h4><div class="record-empty">오늘 판단 '+today.length+'회 · 후속 관찰 예정 '+queuedFollowUps().length+'건 · 이번 시간 판단 '+currentCount+'회</div></div>';
      if(current().kind==="lesson")html+='<button class="tool-choice" type="button" data-computer-report="1"><strong>🗒️ 현재 교시 정리 보기</strong><small>평점 없이 판단과 학생·학급 수치 변화만 확인합니다.</small></button>';
      body.innerHTML=html;
    }else if(kind==="roster"){
      kicker.textContent="학급 명부";title.textContent="우리 반 상태";
      var cm=classDashboard();
      var roster='<div class="roster-summary">'+
        '<div><strong>'+cm.flow+'</strong><small>📖 수업 흐름</small></div>'+
        '<div><strong>'+cm.relationship+'</strong><small>🤝 학급 관계</small></div>'+
        '<div><strong>'+cm.stability+'</strong><small>🧭 생활 안정</small></div>'+
        '<div><strong>'+cm.trust+'</strong><small>❤️ 교사 신뢰</small></div></div>'+
        '<div class="tool-section"><h4>누적 판단 방향</h4><div class="decision-deltas"><span>↑ 원칙 '+teacherStyleCounts.up+'</span><span>↓ 공감 '+teacherStyleCounts.down+'</span><span>← 코칭 '+teacherStyleCounts.left+'</span><span>→ 자율 '+teacherStyleCounts.right+'</span></div></div>'+
        '<div class="tool-section"><h4>학생 상태 · 0~100</h4><div class="roster-table">'+
        '<div class="roster-head"><span>학생</span><span>📚 학습'+(current().kind==="lesson"?"("+escHtml(current().subject)+")":"(종합)")+'</span><span>🎯 집중</span><span>🙂 정서</span><span>🤝 관계</span><span>❤️ 신뢰</span></div>'+
        students.map(rosterRowHtml).join("")+'</div></div>'+rosterDetailHtml(s);
      body.innerHTML=roster;
    }else if(kind==="record"){
      kicker.textContent="생활기록부";title.textContent=s?s.name+" · 누적 기록":"우리 반 · 누적 기록";
      var items=dayEvents.filter(recordableEvent);
      if(s)items=items.filter(function(item){return item.studentId===s.id||item.targetId===s.id||(item.text&&item.text.indexOf(s.name)>=0)||(item.studentNames&&item.studentNames.indexOf(s.name)>=0)});
      items=items.slice(-90).reverse();
      var html='<div class="tool-section"><h4>판단·생활지도 누적 기록</h4><div class="record-list">'+(items.length?items.map(recordEntryHtml).join(""):'<div class="record-empty">아직 기록할 만한 판단이나 생활지도 상황이 없습니다.</div>')+'</div></div>';
      if(s)html+='<div class="tool-section"><h4>'+escHtml(s.name)+' 누적 관찰</h4>'+(s.memory.length?s.memory.map(function(m){return '<div class="record-student-memory">Day '+(m.day||1)+' · '+fmtMin(m.time)+' · '+escHtml(m.text)+'</div>'}).join(""):'<div class="record-empty">아직 개별 기록이 없습니다.</div>')+'</div>';
      body.innerHTML=html;tutorialEvent("record");
    }
  }
  function openToolModal(kind){
    if(teacherScene!=="classroom")return;toolModalKind=kind;modalWasRunning=running;running=false;q("#toolModal").hidden=false;renderToolModal(kind);renderClassroomTools();
  }
  function tutorialCompleted(){try{return localStorage.getItem(TUTORIAL_KEY)==="1"}catch(e){return false}}
  function startTutorial(force){
    if(!force&&tutorialCompleted())return;
    if(toolModalKind)closeToolModal(false);
    pendingEncounter=null;
    tutorialState.active=true;tutorialState.step=0;running=false;renderTutorial();renderEncounterToken();
  }
  function finishTutorial(){
    if(toolModalKind)closeToolModal(false);
    tutorialState.active=false;q("#tutorialOverlay").hidden=true;qa(".tutorial-focus").forEach(function(x){x.classList.remove("tutorial-focus")});
    try{localStorage.setItem(TUTORIAL_KEY,"1")}catch(e){}
    running=true;scheduleNextEncounter(500,900);render();
  }
  function tutorialEvent(type){}
  function renderTutorial(){
    var overlay=q("#tutorialOverlay"),title=q("#tutorialTitle"),txt=q("#tutorialText"),btn=q("#tutorialButton");
    overlay.hidden=false;btn.hidden=false;qa(".tutorial-focus").forEach(function(x){x.classList.remove("tutorial-focus")});
    btn.dataset.tutorialAction=tutorialState.step>=3?"finish":"next";
    if(tutorialState.step===0){
      title.textContent="교실을 보고, 판단할 순간만 고르세요";
      txt.textContent="학생 AI와 관계·학습 상태는 계속 돌아가지만 이제 직접 관리할 버튼은 줄었습니다. 교실에서 📌 상황 표시가 생기면 중요한 판단 장면을 발견한 것입니다.";
      btn.textContent="다음";
    }else if(tutorialState.step===1){
      title.textContent="카드는 네 방향으로 판단합니다";
      txt.textContent="↑ 원칙·권위, ↓ 공감·관계, ← 교육·코칭, → 자율·책임. 어느 방향도 항상 정답은 아닙니다. 카드를 밀거나 네 선택지를 눌러 제한 시간 안에 판단하세요.";
      btn.textContent="다음";
    }else if(tutorialState.step===2){
      title.textContent="숫자는 결과를 확인하는 도구입니다";
      txt.textContent="📑 명부에는 산만함, 충동적, 모범생, 완벽주의, 낯가림처럼 학생의 기본 특성이 적혀 있습니다. 특성을 읽으면 어떤 사건이 잘 생기고 어떤 교사 대응에 민감한지 미리 짐작할 수 있으며, 실제 수치 변화도 학생마다 달라집니다.";
      var roster=q('[data-class-tool="roster"]');if(roster)roster.classList.add("tutorial-focus");
      btn.textContent="다음";
    }else{
      title.textContent="생기부에는 선택과 결과가 남습니다";
      txt.textContent="📒 생기부에는 사건, 선택 방향, 실제 판단 문장과 학생 상태 변화가 누적됩니다. 하루가 끝나면 다음 날로 이어지고, 일부 선택은 며칠 뒤 📌 후속 상황으로 다시 돌아옵니다.";
      var record=q('[data-class-tool="record"]');if(record)record.classList.add("tutorial-focus");
      btn.textContent="하루 시작";
    }
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
      var cost=a.mode?"두 학생 선택":fmtDuration(a.duration||0),ui=actionUi(a.id);
      b.innerHTML='<span class="action-icon">'+ui.icon+'</span><span class="action-copy"><strong>'+ui.short+'</strong><small>'+a.desc+'</small></span><span class="cost">'+cost+'</span>';
      b.addEventListener("click",function(){executeTeacherAction(a.id)});
      b.addEventListener("mouseenter",function(){q("#actionDetail").textContent=a.label+" · "+a.desc});
      b.addEventListener("focus",function(){q("#actionDetail").textContent=a.label+" · "+a.desc});
      wrap.appendChild(b);
    });
    q("#actionDetail").textContent=teacherIsBusy()?"교사가 다른 행동을 수행 중입니다. 그동안 학생들의 상황은 계속 변합니다.":"테두리가 강조된 행동은 현재 상황과 비교적 잘 맞는 선택입니다. 정답을 뜻하지는 않습니다.";
  }
  function renderStudentVitals(s){
    var box=q("#studentVitals");if(!box)return;
    if(!s){box.innerHTML="";return}
    var chips=[];
    var observed=s.observation>=1||hasObservedCurrentWork(s);
    if(isSevereAction(s)||s.action==="SHOVE")chips.push({text:"즉시 안전 확인",tone:"danger"});
    else if(s.action==="ARGUE"||s.frustration>.52)chips.push({text:"감정 고조",tone:"warn"});
    else chips.push({text:"감정 비교적 안정",tone:"good"});
    if(s.action==="HELP"||s.helpNeed>.24)chips.push({text:"도움 필요",tone:"warn"});
    if(s.action==="REJECTED"||s.belonging<.50)chips.push({text:"관계 살피기",tone:"warn"});
    if(observed){
      chips.push({text:s.focus>.66?"집중 안정":s.focus>.46?"집중 흔들림":"집중 저하",tone:s.focus>.66?"good":s.focus>.46?"":"warn"});
      if(s.moveNeed>.40)chips.push({text:"움직임 욕구 큼",tone:"warn"});
    }
    box.innerHTML=chips.map(function(c){return '<span class="vital-chip '+(c.tone||"")+'">'+escHtml(c.text)+'</span>'}).join("")+
      (observed?"":'<span class="vital-hint">관찰 행동을 하면 더 많은 상태 단서가 드러납니다.</span>');
  }
  function renderPanel(){
    return;
  }
  function escHtml(value){
    return String(value===undefined||value===null?"":value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function renderFeed(){
    return;
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
    if(box)box.hidden=true;
  }
  function updateAutoLessonPhase(){
    if(current().kind!=="lesson")return;
    var span=Math.max(1,current().end-current().start);
    var ratio=clamp((gameMinute()-current().start)/span);
    var phase=ratio<.16?"explain":ratio<.28?"question":ratio<.66?"individual":ratio<.80?"pair":ratio<.92?"presentation":"closure";
    if(lessonState.phase===phase)return;
    lessonState.phase=phase;lessonState.phaseStart=gameSec;lessonState.presenterId=null;
    students.forEach(function(s){s.lessonPartner=null;s.intent=null;s.intentTicks=0});
    if(phase==="pair")assignLessonPairs();
    if(phase==="presentation"){
      var candidates=students.filter(function(s){return s.scene===current().loc});
      candidates.sort(function(a,b){return (b.focus+currentMastery(b)+b.assert)-(a.focus+currentMastery(a)+a.assert)});
      var presenter=candidates[0]||null;
      if(presenter){lessonState.presenterId=presenter.id;requestStudentAction(presenter,"PRESENT",{duration:35,force:true})}
    }
    var phaseInfo=LESSON_PHASES[phase]||{label:phase};
    lessonState.history.push({id:"auto_"+phase,phase:phase,label:phaseInfo.label,time:gameMinute()});
  }

  function todayEncounters(){
    return encounterHistory.filter(function(h){return (h.day||1)===dayIndex});
  }
  function todayStyleCounts(){
    var out={up:0,down:0,left:0,right:0,timeout:0};
    todayEncounters().forEach(function(h){if(out[h.dir]!==undefined)out[h.dir]++;else out.timeout++});
    return out;
  }
  function queuedFollowUps(){
    return followUpQueue.filter(function(j){return j.status==="queued"});
  }
  function renderDayEnd(){
    var overlay=q("#dayEndOverlay");if(!overlay)return;
    overlay.hidden=false;
    var cm=classDashboard(),today=todayEncounters(),styles=todayStyleCounts(),queued=queuedFollowUps();
    q("#dayEndTitle").textContent="Day "+dayIndex+"이 끝났습니다";
    q("#dayEndText").textContent="오늘 "+today.length+"개의 판단을 내렸습니다. 학생 상태와 관계·학습 변화는 다음 날에도 이어지고, 일부 선택은 후속 상황으로 다시 돌아옵니다.";
    q("#dayEndMetrics").innerHTML=
      '<div class="day-end-metric"><strong>'+cm.flow+'</strong><small>📖 수업 흐름</small></div>'+
      '<div class="day-end-metric"><strong>'+cm.relationship+'</strong><small>🤝 학급 관계</small></div>'+
      '<div class="day-end-metric"><strong>'+cm.stability+'</strong><small>🧭 생활 안정</small></div>'+
      '<div class="day-end-metric"><strong>'+cm.trust+'</strong><small>❤️ 교사 신뢰</small></div>';
    q("#dayEndStyles").innerHTML=
      '<div class="day-end-style"><span>↑ 원칙 · 권위</span><strong>'+styles.up+'회</strong></div>'+
      '<div class="day-end-style"><span>↓ 공감 · 관계</span><strong>'+styles.down+'회</strong></div>'+
      '<div class="day-end-style"><span>← 교육 · 코칭</span><strong>'+styles.left+'회</strong></div>'+
      '<div class="day-end-style"><span>→ 자율 · 책임</span><strong>'+styles.right+'회</strong></div>'+
      (styles.timeout?'<div class="day-end-style"><span>⌛ 시간 초과</span><strong>'+styles.timeout+'회</strong></div>':'');
    var upcoming=queued.slice().sort(function(a,b){return a.dueDay-b.dueDay}).slice(0,5);
    q("#dayEndFollowups").innerHTML=upcoming.length?upcoming.map(function(j){
      var s=studentById(j.studentId);
      return '<div class="day-end-followup"><span>Day '+j.dueDay+' · '+escHtml(s?s.name:"학생")+'</span><small>'+escHtml(j.sourceTitle)+'</small></div>';
    }).join(""):'<div class="day-end-followup"><span>예정된 후속 상황 없음</span><small>새로운 사건은 학생 상태에 따라 계속 발생합니다.</small></div>';
  }
  function endDay(){
    if(dayEnded)return;
    if(pendingEncounter&&pendingEncounter.followUpId){
      var pendingJob=followUpQueue.find(function(j){return j.id===pendingEncounter.followUpId});
      if(pendingJob){pendingJob.status="queued";pendingJob.dueDay=Math.max(dayIndex+1,pendingJob.dueDay)}
    }
    followUpQueue.forEach(function(j){if(j.status==="queued"&&j.dueDay<=dayIndex)j.dueDay=dayIndex+1});
    dayEnded=true;running=false;teacherTask=null;pendingEncounter=null;
    var token=q("#encounterToken");if(token)token.hidden=true;
    var cm=classDashboard(),today=todayEncounters(),styles=todayStyleCounts();
    daySummaries.push({day:dayIndex,metrics:cm,encounters:today.length,styles:styles,queued:queuedFollowUps().length});
    dayEvents.push({
      day:dayIndex,stamp:fmtMin(schedule[schedule.length-1].end),text:"Day "+dayIndex+" 하루 마무리",
      type:"day_summary",scene:"classroom",script:false,recordable:true,daySummary:true,
      metrics:cm,styles:styles,encounterCount:today.length,followUpCount:queuedFollowUps().length
    });
    dayEvents=dayEvents.slice(-320);
    renderDayEnd();
  }
  function prepareNextDayStudents(){
    students.forEach(function(s,i){
      var p=seats[s.seat]||seats[i]||{x:50,y:50};
      s.scene="classroom";s.targetScene=null;s.arrivalAt=0;s.x=p.x;s.y=p.y;s.dx=p.x;s.dy=p.y;
      s.focus=clamp(s.focus*.38+.72*.62);s.boredom=.14;
      s.talkNeed=.14;s.moveNeed=s.move*.14;s.helpNeed=.08;s.sleepNeed=(1-s.energy)*.24;
      s.socialNeed=.16+s.soc*.12;s.mood=clamp(s.mood*.78+.70*.22);
      s.belonging=clamp(s.belonging*.96+.62*.04);s.frustration=clamp(s.frustration*.24);
      s.correctionLoad=0;s.victimStress=clamp(s.victimStress*.52);s.teacherDefiance=clamp(s.teacherDefiance*.70);
      s.action="READ";s.intent=null;s.intentTicks=0;s.actionTicks=rand(2,5);
      s.moving=false;s.observation=0;s.observedSubjects={};s.teacherUse={};s.socialTarget=null;s.socialGoal=null;s.groupId=null;
      s.conflictWith=null;s.conflictUntil=0;s.avoidId=null;s.avoidUntil=0;s.pairWith=null;s.pairUntil=0;s.lessonPartner=null;
      s.role=null;s.roleUntil=0;s.severeCooldown=0;s.lastSeriousIncident=null;
      s.actionStartedAt=gameSec;s.actionLockedUntil=gameSec+25;s.behaviorPhase="idle";s.phaseUntil=0;s.facing=1;
      s.speechText="";s.speechTone="normal";s.speechUntil=0;
    });
    Object.keys(relations).forEach(function(k){
      var rel=relations[k];rel.irritation=clamp(rel.irritation*.82);rel.rivalry=clamp(rel.rivalry*.98);
    });
    classMetrics.flow=clamp(classMetrics.flow*.82+72*.18,0,100);
    classMetrics.relationship=clamp(classMetrics.relationship*.90+68*.10,0,100);
    classMetrics.stability=clamp(classMetrics.stability*.84+72*.16,0,100);
    classMetrics.trust=clamp(classMetrics.trust*.94+64*.06,0,100);
  }
  function startNextDay(){
    dayIndex+=1;dayEnded=false;gameSec=520*60;periodIndex=0;running=true;
    dayEncounterBudget=8+Math.floor(Math.random()*5);dayEncounterOffered=0;dayFollowUpsShown=0;periodEncounterCounts={};
    selected=null;swapMode=false;connectMode=false;teacherTask=null;teacherScene="classroom";
    teacher.x=50;teacher.y=22;teacher.dx=50;teacher.dy=22;teacher.moving=false;
    feed=[];incidentRecords=[];periodMemoKeys={};pendingEncounter=null;activeEncounter=null;encounterPointer=null;
    reportOpen=false;toolModalKind=null;lastBellAt=-99999;aiAccumulator=0;circleAccumulator=0;renderAccumulator=0;
    prepareNextDayStudents();rebuildSocialCircles();newStats();assignPeriodDestinations();
    q("#report").hidden=true;q("#encounterOverlay").hidden=true;q("#dayEndOverlay").hidden=true;
    scheduleNextEncounter(500,1000);
    log("Day "+dayIndex+" 아침, 학생들이 다시 교실로 들어왔다.","ambient","classroom");
    render();
  }

  function renderHeader(){
    var p=current();
    var dayEl=q("#dayNumber");if(dayEl)dayEl.textContent="Day "+dayIndex;
    q("#time").textContent=fmtMin(gameMinute());q("#periodName").textContent=p.name;
    var reportBtn=q("#showReport");
    if(reportBtn){
      reportBtn.disabled=p.kind!=="lesson";
      reportBtn.textContent=p.kind==="lesson"?"현재 교시 정리 보기":"수업 중 정리 보기";
      reportBtn.title=p.kind==="lesson"?"현재 교시의 판단과 수치 변화를 확인합니다.":"수업 시간이 시작되면 사용할 수 있습니다.";
    }
    q("#periodDesc").textContent=p.kind==="lesson"?(p.unit+" · 학생의 몸짓·학습·관계를 보며 수업을 운영하세요."):p.kind==="break"?"아이들이 친구를 찾아가거나 혼자 머무르며 관계가 움직입니다.":p.kind==="lunch"?"급식실에서는 자리·친구·나눔 행동이 드러납니다.":p.kind==="lunchplay"?"아이들이 원하는 공간과 친구를 찾아 움직입니다.":"하루 일과를 준비하거나 정리하는 시간입니다.";
    q("#locationName").textContent=SCENE_NAME[teacherScene];
    q("#progress").style.width=(clamp((gameSec/60-p.start)/(p.end-p.start))*100)+"%";
  }
  function renderTeacherPosition(){
    var teacherEl=q("#teacher"),mount=q("#teacherAvatarMount");
    if(mount&&!mount.firstChild)mount.appendChild(createStandingAvatar(TEACHER_LOOK));
    teacherEl.style.left=teacher.x+"%";teacherEl.style.top=teacher.y+"%";
    teacherEl.classList.toggle("moving",teacher.moving);
    teacherEl.dataset.action=teacherTask&&teacherTask.actionId?teacherTask.actionId:"";
  }
  function renderFrame(){
    renderHeader();
    renderTeacherBusy();
    renderStudents();
    renderSceneNav();
    renderRoomOverview();
    renderClassroomTools();
    renderEncounterToken();
    renderTeacherPosition();
  }
  function render(){
    renderHeader();renderLessonFlow();renderProps();renderStudents();renderSceneNav();renderSchedule();renderRoomOverview();renderPanel();renderFeed();renderClassroomTools();renderEncounterToken();renderTeacherPosition();
  }
  function openScene(scene){
    if(scene===teacherScene)return;
    if(teacherIsBusy()){log("지금은 교사 행동을 수행 중이라 다른 공간으로 바로 이동할 수 없다.","teacher",teacherScene);return}
    var travel=scene==="hallway"||teacherScene==="hallway"?25:40;
    teacherTask={kind:"sceneTravel",actionId:null,targetId:null,targetScene:scene,start:gameSec,end:gameSec+travel,duration:travel,label:SCENE_NAME[scene]+" 이동"};
    selected=null;connectMode=false;swapMode=false;
    log(SCENE_NAME[scene]+" 쪽으로 이동을 시작했다.","teacher",teacherScene);render();
  }
  function reset(){
    gameSec=520*60;periodIndex=0;dayIndex=1;dayEnded=false;daySummaries=[];followUpQueue=[];followUpSeq=0;dayEncounterBudget=8+Math.floor(Math.random()*5);dayEncounterOffered=0;dayFollowUpsShown=0;periodEncounterCounts={};running=true;selected=null;swapMode=false;connectMode=false;activeActionCategory="observe";teacherTask=null;teacherScene="classroom";teacher.x=50;teacher.y=22;teacher.dx=50;teacher.dy=22;teacher.moving=false;feed=[];dayEvents=[];incidentRecords=[];periodMemoKeys={};encounterHistory=[];pendingEncounter=null;activeEncounter=null;encounterSeq=0;encounterPointer=null;classMetrics={flow:72,relationship:68,stability:72,trust:64};teacherStyleCounts={up:0,down:0,left:0,right:0};reportOpen=false;armedActionId=null;armedActionTargetId=null;cardDragActive=false;cardTraySnapshot={targetId:null,ids:[],expiresAt:0,urgent:false};cardRenderSignature="";toolModalKind=null;lastBellAt=-99999;
    resetRelations();resetStudents();rebuildSocialCircles();newStats();assignPeriodDestinations();q("#report").hidden=true;q("#encounterOverlay").hidden=true;q("#dayEndOverlay").hidden=true;scheduleNextEncounter(650,1200);
    log("학생들이 하나둘 교실로 들어오기 시작했다.","ambient","classroom");render();
  }

  function loop(now){
    if(!document.body.contains(app))return;
    var realDt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
    if(activeEncounter)updateEncounterClock(now);
    if(running&&!reportOpen){
      var speed=Number(q("#speed").value)||1;
      var gameDt=realDt*GAME_SECONDS_PER_REAL_SECOND*speed;
      gameSec+=gameDt;
      if(gameSec>=schedule[schedule.length-1].end*60){
        gameSec=schedule[schedule.length-1].end*60;endDay();
      }else if(handlePeriodChange()){
        updateAutoLessonPhase();
        updateTransit();updateTeacherTask();updateTeacherMovement(gameDt);updateSocialTracking(gameDt);updateMovement(gameDt);
        aiAccumulator+=gameDt;
        circleAccumulator+=gameDt;
        var guard=0;
        while(aiAccumulator>=AI_STEP_GAME_SECONDS&&guard<8){
          aiAccumulator-=AI_STEP_GAME_SECONDS;
          students.forEach(function(s){updateBehaviorLifecycle(s);updateStudent(s)});
          sampleStats();
          guard++;
        }
        if(circleAccumulator>=GROUP_STEP_GAME_SECONDS){
          circleAccumulator%=GROUP_STEP_GAME_SECONDS;
          rebuildSocialCircles();
        }
        renderAccumulator+=realDt;
        if(renderAccumulator>=.10){renderAccumulator=0;renderFrame()}
        maybeSpawnEncounter();
      }
    }
    requestAnimationFrame(loop);
  }

  q("#world").addEventListener("click",function(e){
    if(e.target.closest&&e.target.closest(".student,.world-alert,.classroom-console,.action-tray,.tool-modal,.tutorial-overlay,.encounter-token,.encounter-overlay"))return;
    if(selected!==null){selected=null;connectMode=false;swapMode=false;renderPanel();renderStudents();}
  });
  var priorityBoard=q("#priorityBoard");if(priorityBoard)priorityBoard.addEventListener("click",function(e){
    var b=e.target.closest&&e.target.closest("[data-student-id]");if(!b)return;
    selected=Number(b.dataset.studentId);connectMode=false;swapMode=false;render();
  });
  var worldAlert=q("#worldAlert");if(worldAlert)worldAlert.addEventListener("click",function(){
    if(!this.dataset.studentId)return;
    selected=Number(this.dataset.studentId);connectMode=false;swapMode=false;render();
  });
  var clearSelection=q("#clearSelection");if(clearSelection)clearSelection.addEventListener("click",function(){
    selected=null;connectMode=false;swapMode=false;render();
  });
  q("#pause").addEventListener("click",function(){if(activeEncounter)return;running=!running;this.textContent=running?"일시정지":"계속하기"});
  qa("#actionTabs button").forEach(function(b){
    b.addEventListener("click",function(){
      activeActionCategory=this.dataset.category;
      renderPanel();
    });
  });
  var showReportButton=q("#showReport");if(showReportButton)showReportButton.addEventListener("click",function(){
    if(current().kind==="lesson")openReport(true);
  });
  q("#continueBtn").addEventListener("click",nextPeriod);
  q("#reset").addEventListener("click",reset);
  qa(".scene-nav button").forEach(function(b){b.addEventListener("click",function(){openScene(this.dataset.scene)})});


  qa("[data-class-tool]").forEach(function(b){b.addEventListener("click",function(){openToolModal(this.dataset.classTool)})});
  q("#closeToolModal").addEventListener("click",function(){closeToolModal(true);render()});
  q("#toolModal").addEventListener("click",function(e){if(e.target===this){closeToolModal(true);render()}});
  q("#toolModalBody").addEventListener("click",function(e){
    var instruction=e.target.closest&&e.target.closest("[data-instruction-id]");
    if(instruction){var a=INSTRUCTION_ACTIONS[instruction.dataset.instructionId];closeToolModal(true);if(a&&!teacherIsBusy())startTeacherTask(a,null);render();return}
    var rep=e.target.closest&&e.target.closest("[data-computer-report]");if(rep){var wasRunning=modalWasRunning;closeToolModal(false);openReport(true);reportWasRunning=wasRunning;return}
    var rosterStudent=e.target.closest&&e.target.closest("[data-roster-student]");if(rosterStudent){selected=Number(rosterStudent.dataset.rosterStudent);renderToolModal("roster");return}
  });
  q("#tutorialButton").addEventListener("click",function(){
    if(this.dataset.tutorialAction==="finish"){finishTutorial();return}
    tutorialState.step=Math.min(3,tutorialState.step+1);renderTutorial();
  });
  q("#encounterToken").addEventListener("click",openPendingEncounter);
  qa("[data-encounter-dir]").forEach(function(b){
    b.addEventListener("click",function(){resolveEncounter(this.dataset.encounterDir)});
  });
  q("#encounterReturn").addEventListener("click",closeEncounter);
  q("#nextDayButton").addEventListener("click",startNextDay);

  function encounterPreviewDirection(dx,dy){
    if(Math.max(Math.abs(dx),Math.abs(dy))<26)return null;
    return Math.abs(dx)>Math.abs(dy)?(dx<0?"left":"right"):(dy<0?"up":"down");
  }
  function updateEncounterPreview(dir){
    qa(".encounter-choice").forEach(function(b){b.classList.toggle("preview",b.dataset.encounterDir===dir)});
  }
  var encounterCard=q("#encounterCard");
  encounterCard.addEventListener("pointerdown",function(e){
    if(!activeEncounter||activeEncounter.phase!=="choice")return;
    encounterPointer={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0};
    this.classList.add("dragging");
    if(this.setPointerCapture)this.setPointerCapture(e.pointerId);
  });
  encounterCard.addEventListener("pointermove",function(e){
    if(!encounterPointer||encounterPointer.id!==e.pointerId||!activeEncounter||activeEncounter.phase!=="choice")return;
    var dx=e.clientX-encounterPointer.x,dy=e.clientY-encounterPointer.y;
    encounterPointer.dx=dx;encounterPointer.dy=dy;
    var tx=clamp(dx,-95,95),ty=clamp(dy,-95,95);
    this.style.transform="translate("+tx+"px,"+ty+"px) rotate("+(tx/35)+"deg)";
    updateEncounterPreview(encounterPreviewDirection(dx,dy));
  });
  function finishEncounterPointer(e){
    if(!encounterPointer||encounterPointer.id!==e.pointerId)return;
    var dx=encounterPointer.dx,dy=encounterPointer.dy,dir=encounterPreviewDirection(dx,dy);
    encounterPointer=null;encounterCard.classList.remove("dragging");encounterCard.style.transform="";updateEncounterPreview(null);
    if(dir&&Math.max(Math.abs(dx),Math.abs(dy))>=64)resolveEncounter(dir);
  }
  encounterCard.addEventListener("pointerup",finishEncounterPointer);
  encounterCard.addEventListener("pointercancel",finishEncounterPointer);
  encounterCard.addEventListener("keydown",function(e){
    if(!activeEncounter||activeEncounter.phase!=="choice")return;
    var map={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
    if(map[e.key]){e.preventDefault();resolveEncounter(map[e.key])}
  });
  document.addEventListener("keydown",function(e){
    if(!activeEncounter||activeEncounter.phase!=="choice")return;
    var map={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
    if(map[e.key]){e.preventDefault();resolveEncounter(map[e.key])}
  });

  q("#helpTutorial").addEventListener("click",function(){startTutorial(true)});

  reset();
  if(!tutorialCompleted())setTimeout(function(){startTutorial(false)},0);
  requestAnimationFrame(loop);
})();