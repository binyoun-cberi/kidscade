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
  var worldHistory=[];
  var worldHistorySeq=0;
  var WORLD_HISTORY_DAYS=8;
  var MAX_WORLD_HISTORY=700;
  var periodMemoKeys={};
  var dayIndex=1;
  var dayEnded=false;
  var daySummaries=[];
  var followUpQueue=[];
  var followUpSeq=0;
  var storyQueue=[];
  var storyStates={};
  var storySeq=0;
  var dayStoryEventsShown=0;
  var dayStoryStarterReady=false;
  var MAX_STORY_EVENTS_PER_DAY=2;
  var MAX_ACTIVE_STORIES=3;
  var dayEncounterBudget=10;
  var dayEncounterOffered=0;
  var dayFollowUpsShown=0;
  var dayFamilyEventsShown=0;
  var periodEncounterCounts={};
  var MAX_FOLLOWUPS_PER_DAY=3;
  var MAX_FAMILY_EVENTS_PER_DAY=1;
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
  var GAME_SECONDS_PER_REAL_SECOND=45;
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
  function pruneWorldHistory(){
    var minDay=Math.max(1,dayIndex-WORLD_HISTORY_DAYS+1);
    worldHistory=worldHistory.filter(function(e){return (e.day||1)>=minDay}).slice(-MAX_WORLD_HISTORY);
  }
  function worldEventTouches(e,s){
    if(!e||!s)return false;
    return e.actorId===s.id||e.targetId===s.id||(e.witnessIds||[]).indexOf(s.id)>=0;
  }
  function recentWorldEventsForStudent(s,kinds,days){
    if(!s)return [];
    var minDay=Math.max(1,dayIndex-(days||WORLD_HISTORY_DAYS)+1);
    return worldHistory.filter(function(e){
      return (e.day||1)>=minDay&&worldEventTouches(e,s)&&(!kinds||!kinds.length||kinds.indexOf(e.kind)>=0||(e.tags||[]).some(function(t){return kinds.indexOf(t)>=0}));
    });
  }
  function recentWorldEventStrength(s,kinds,days){
    return recentWorldEventsForStudent(s,kinds,days).reduce(function(sum,e){
      var age=Math.max(0,dayIndex-(e.day||dayIndex));
      var decay=Math.max(.18,1-age/Math.max(2,(days||WORLD_HISTORY_DAYS)+1));
      var role=e.targetId===s.id?1:e.actorId===s.id?.86:.42;
      return sum+(e.severity===undefined?.3:e.severity)*decay*role;
    },0);
  }
  function recentEventCounterpart(s,kinds,days){
    var list=recentWorldEventsForStudent(s,kinds,days).slice().sort(function(a,b){return (b.day-a.day)||((b.time||0)-(a.time||0))});
    for(var i=0;i<list.length;i++){
      var e=list[i],id=e.actorId===s.id?e.targetId:e.targetId===s.id?e.actorId:null,other=studentById(id);
      if(other&&other!==s)return other;
    }
    return null;
  }
  function recordWorldEvent(kind,actor,target,opts){
    opts=opts||{};if(!actor)return null;
    var witnessIds=(opts.witnessIds||students.filter(function(o){
      return o!==actor&&o!==target&&o.scene===actor.scene&&!o.targetScene&&distance(o,actor)<=24;
    }).map(function(o){return o.id})).slice(0,8);
    var r=target?relation(actor,target):null;
    var event={
      id:"world-"+(++worldHistorySeq),day:dayIndex,time:gameMinute(),kind:kind,
      actorId:actor.id,targetId:target?target.id:null,witnessIds:witnessIds,
      scene:opts.scene||actor.scene,severity:clamp(opts.severity===undefined?.3:opts.severity,0,1),
      text:opts.text||"",tags:(opts.tags||[]).slice(),
      affinity:r?r.affinity:null,irritation:r?r.irritation:null
    };
    worldHistory.push(event);pruneWorldHistory();
    if(opts.witnessMemory!==false&&event.severity>=.42){
      witnessIds.forEach(function(id){
        var w=studentById(id);if(!w)return;
        remember(w,actor.name+"에게서 눈에 띄는 일이 있었음",Math.min(.62,event.severity*.72),{
          kind:"witness",targetId:actor.id,actorId:actor.id,valence:-event.severity*.55,severity:event.severity,sourceEventId:event.id
        });
      });
    }
    return event;
  }
  function storyletCausalityMultiplier(s,templateId){
    var map={
      lost_item_accusation:["borrow_item","taking"],
      peer_conflict:["conflict","rejection","tease","taking","threat","physical"],
      social_exclusion:["rejection","exclusion"],
      teasing_boundary:["tease"],
      rough_play_boundary:["near_collision","physical","play_conflict"],
      student_says_teacher_unfair:["teacher_refusal","teacher_shout","teacher_insult"],
      teacher_defiance:["teacher_refusal","teacher_shout","teacher_insult","teacher_throw"],
      parent_friend_conflict:["conflict","rejection","tease","exclusion"],
      school_refusal_signal:["exclusion","threat","physical","rejection"],
      friend_secret_burden:["threat","exclusion","conflict"]
    };
    var kinds=map[templateId];if(!kinds)return 1;
    var strength=recentWorldEventStrength(s,kinds,4);
    if(templateId==="lost_item_accusation")return strength>.08?Math.min(3.1,.72+strength*1.8):0;
    return strength>.04?Math.min(2.7,.78+strength*1.35):.42;
  }
  function storyArcWorldMultiplier(arcId,s){
    var map={
      friendship_triangle:["rejection","exclusion"],
      missing_items:["borrow_item","taking"],
      bullying_escalation:["tease","exclusion","taking","threat","physical"],
      rule_breaking_clique:["teacher_refusal","teacher_shout","teacher_insult","teacher_throw","conflict","tease"]
    };
    var kinds=map[arcId];if(!kinds)return 1;
    var strength=recentWorldEventStrength(s,kinds,5);
    return strength>.05?Math.min(2.8,.80+strength*1.25):.62;
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
  function encounterExpression(enc,s){
    var id=(enc&&((enc.sourceTemplateId)||enc.templateId))||"",title=(enc&&enc.title)||"";
    if(/social_exclusion|mistake_shutdown|friend_dependency|crying_after_feedback/.test(id)||/울|눈물|혼자/.test(title))return {type:"tearful",name:"울먹임",bg:"#7788aa",brow:3,mouth:"sad",eyes:"small"};
    if(/teacher_defiance|game_loss|peer_conflict|fairness_complaint|lost_item_accusation|student_says_teacher_unfair|story_rule_breaking_clique/.test(id)||/반발|화|말다툼|억울|기싸움|욕설/.test(title))return {type:"angry",name:"화남",bg:"#b96b63",brow:2,mouth:"straight",eyes:"small"};
    if(/presentation_anxiety|praise_embarrassment|test_blank_freeze|sensory_overload|school_refusal_signal|friend_secret_burden|nurse_request|public_correction_hurt|parent_overprotective_exemption|parent_achievement_pressure_score|parent_neglect_basic_care|parent_harm_fear_home|story_bullying_escalation/.test(id)||/불안|긴장|발표|걱정|아프|힘들|무서|학교 오기 싫/.test(title))return {type:"worried",name:"걱정",bg:"#7388ad",brow:3,mouth:"straight",eyes:"small"};
    if(/teasing_boundary|stationery_taken|copies_answer|careless_fast_work|pass_note_distraction|food_trade|rough_play_boundary|expensive_item_showoff/.test(id)||/장난|가져|베껴|쪽지|자랑/.test(title))return {type:"playful",name:"장난",bg:"#8d7197",brow:1,mouth:"teethUpper",eyes:"large"};
    if(/math_foundation_gap|help_refusal|group_silent|after_lunch_sleepy|group_free_rider|transition_stuck|lunch_refusal|refuses_partner/.test(id)||/모르|힘들|졸|막혀|못 하/.test(title))return {type:"struggling",name:"힘듦",bg:"#7f907a",brow:3,mouth:"sad",eyes:"small"};
    if(/finished_early/.test(id)||/성공|해냈|맞혔|밝/.test(title))return {type:"happy",name:"기쁨",bg:"#5f927b",brow:1,mouth:"happy",eyes:"large"};
    if(/missing_homework|teacher_defiance|late_arrival|minor_injury|broken_item_denial|forgotten_material|copies_homework/.test(id)||/들켰|당황|깜짝|놓고|넘어져/.test(title))return {type:"startled",name:"당황",bg:"#b58a63",brow:3,mouth:"oh",eyes:"large"};
    if(enc&&enc.isFollowUp)return {type:"happy",name:"달라진 모습",bg:"#65917f",brow:1,mouth:"glad",eyes:"large"};
    if(s&&s.mood<.42)return {type:"worried",name:"걱정",bg:"#7388ad",brow:3,mouth:"straight",eyes:"small"};
    return {type:"default",name:"평소",bg:"#607aa5",brow:1,mouth:"glad",eyes:"large"};
  }
  function expressionBrowPrefix(look){
    var map={"black":"black","brown-1":"brown1","brown-2":"brown2","blonde":"blonde","grey":"grey","red":"red","tan":"tan","white":"white"};
    return map[look.hairFolder]||"black";
  }
  function expressionPart(src,cls){
    var img=document.createElement("img");img.className="portrait-face-part "+cls;img.alt="";img.src=MODULAR_ASSET+src;
    img.onerror=function(){this.style.display="none"};return img;
  }
  function applyPortraitExpression(avatar,look,expression){
    avatar.classList.add("expression-"+expression.type);
    var original=avatar.querySelector(".mod-part.face");if(original)original.style.opacity="0";
    var face=document.createElement("span");face.className="portrait-face expression-"+expression.type;
    var brow=expressionBrowPrefix(look);
    face.appendChild(expressionPart("face/eyebrows/"+brow+"Brow"+expression.brow+".png","expr-brow"));
    face.appendChild(expressionPart("face/eyes/eyeBlack_"+expression.eyes+".png","expr-eyes"));
    face.appendChild(expressionPart("face/mouth/mouth_"+expression.mouth+".png","expr-mouth"));
    if(expression.type==="tearful"){var tear=document.createElement("i");tear.className="expr-tear";face.appendChild(tear)}
    avatar.appendChild(face);
  }
  function renderEncounterPortrait(enc,s){
    var mount=q("#encounterPortrait");if(!mount)return;
    mount.innerHTML="";
    if(!s)return;
    var expression=encounterExpression(enc,s);
    var avatar=createStandingAvatar(s.look);
    avatar.classList.add("portrait-avatar");
    applyPortraitExpression(avatar,s.look,expression);
    mount.appendChild(avatar);
    mount.style.background=expression.bg;
    mount.dataset.expression=expression.name;
  }
  function advanceCardTurn(){
    if(dayEncounterOffered>=dayEncounterBudget){
      nextEncounterAt=Number.POSITIVE_INFINITY;
      return;
    }
    // Encounter pacing never moves the school clock. The simulation keeps running;
    // the director only decides when it may look for another meaningful moment.
    nextEncounterAt=gameSec+rand(180,420);
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

  var PARENT_TRAIT_CATALOG={
    supportive_partner:{label:"든든한 협력형",tone:"positive",desc:"교사와 정보를 나누고 아이의 성장 방향을 함께 맞추려는 보호자"},
    communicative:{label:"소통 적극형",tone:"positive",desc:"학교의 안내에 빠르게 응답하고 필요한 정보를 먼저 공유하는 편"},
    anxious:{label:"걱정이 많은 보호자",tone:"mixed",desc:"작은 변화도 크게 걱정해 자주 확인하고 안심을 필요로 하는 편"},
    overprotective:{label:"과보호형",tone:"mixed",desc:"아이가 불편하거나 실패할 상황을 미리 없애 주려는 경향이 강함"},
    achievement_pressure:{label:"성취 압박형",tone:"warning",desc:"결과와 성취를 중요하게 여기며 아이에게 높은 기준을 요구함"},
    child_first:{label:"내 아이 우선형",tone:"warning",desc:"갈등 상황에서 다른 맥락보다 자기 아이의 말과 이익을 먼저 보는 편"},
    permissive:{label:"다 해주는형",tone:"mixed",desc:"아이가 싫다고 하면 책임이나 규칙을 대신 없애 주려는 경향이 있음"},
    disengaged:{label:"연락이 뜸한 보호자",tone:"mixed",desc:"학교 연락과 준비에 반응이 늦고 가정 연계가 잘 이어지지 않는 편"},
    inconsistent:{label:"기준이 자주 바뀜",tone:"mixed",desc:"그날 상황에 따라 약속과 규칙이 달라져 아이가 기준을 잡기 어려울 수 있음"},
    image_using:{label:"아이 성과를 앞세움",tone:"warning",desc:"아이의 의사보다 성과·체면·보여지는 결과를 더 중요하게 여기는 모습이 나타남"},
    school_distrust:{label:"학교 불신형",tone:"warning",desc:"교사의 설명보다 먼저 학교의 잘못을 의심하고 강한 확인을 요구하는 편"},
    neglect_risk:{label:"돌봄 공백 위험",tone:"alert",desc:"준비·식사·건강 관리가 반복해서 비는 등 추가 지원이 필요한 신호가 보임"},
    harm_risk:{label:"보호가 필요한 신호",tone:"alert",desc:"아이가 가정에서의 강한 위협이나 처벌을 두려워하는 등 안전 확인이 필요한 신호"}
  };

  var STUDENT_PARENT_TRAITS={
    "민수":["child_first"],
    "지우":["supportive_partner","communicative"],
    "서연":["achievement_pressure"],
    "준호":["anxious","overprotective"],
    "태호":["disengaged"],
    "유나":["supportive_partner","communicative"],
    "현우":["school_distrust"],
    "소라":["supportive_partner"],
    "도윤":["permissive"],
    "하린":["achievement_pressure","image_using"],
    "예준":["image_using"],
    "채원":["supportive_partner"],
    "시우":["child_first","school_distrust"],
    "다은":["anxious"],
    "건우":["inconsistent"],
    "아린":["overprotective"],
    "지호":["disengaged"],
    "은서":["achievement_pressure"],
    "윤호":["communicative"],
    "나연":["supportive_partner"],
    "승민":["child_first"],
    "세아":["neglect_risk","harm_risk"]
  };

  function studentParentTraitIds(name){return (STUDENT_PARENT_TRAITS[name]||[]).slice()}
  function hasParentTrait(s,id){return !!(s&&s.parentTraits&&s.parentTraits.indexOf(id)>=0)}
  function parentTraitMeta(id){return PARENT_TRAIT_CATALOG[id]||null}
  function revealParentTrait(s,id){
    if(!s||!id||!hasParentTrait(s,id))return;
    s.parentKnown=s.parentKnown||[];
    if(s.parentKnown.indexOf(id)<0)s.parentKnown.push(id);
  }
  function knownParentTraits(s){
    return (s&&s.parentKnown||[]).map(function(id){return {id:id,meta:parentTraitMeta(id)}}).filter(function(x){return x.meta});
  }
  function parentTraitChipHtml(id){
    var t=parentTraitMeta(id);if(!t)return "";
    return '<span class="response-chip parent-'+escHtml(t.tone)+'" title="'+escHtml(t.desc)+'">'+escHtml(t.label)+'</span>';
  }
  function familyEventScore(s,trait,base){
    if(!hasParentTrait(s,trait))return 0;
    if(["morning","closing","break"].indexOf(current().kind)<0)return 0;
    var score=base||.34;
    var anyRecent=recentWorldEventStrength(s,null,4);
    var peerTrouble=recentWorldEventStrength(s,["conflict","rejection","tease","exclusion","taking","threat","physical"],4);
    var learningTrouble=recentWorldEventStrength(s,["missing_homework","forgotten_material","careless_fast_work","mistake_shutdown","test_blank_freeze","copies_homework"],4);
    var teacherTrouble=recentWorldEventStrength(s,["teacher_refusal","teacher_shout","teacher_insult","teacher_throw"],4);
    if(trait==="disengaged"){
      if(dayIndex<2||anyRecent<.10)return 0;
      return score*(.85+Math.min(1.2,anyRecent));
    }
    if(trait==="inconsistent"){
      if(dayIndex<2||anyRecent<.12)return 0;
      return score*(.80+Math.min(1.1,anyRecent));
    }
    if(trait==="child_first"){
      if(peerTrouble<.12)return 0;
      return score*(.85+Math.min(1.25,peerTrouble));
    }
    if(trait==="school_distrust"){
      if(peerTrouble+teacherTrouble<.14)return 0;
      return score*(.82+Math.min(1.3,peerTrouble+teacherTrouble));
    }
    if(trait==="achievement_pressure"){
      if(dayIndex<2&&learningTrouble<.14)return 0;
      if(learningTrouble>.08)score*=.92+Math.min(1.2,learningTrouble);
    }
    if(trait==="anxious"){
      if(dayIndex<2&&anyRecent<.18)return score*.35;
      if(anyRecent>.08)score*=.88+Math.min(1.1,anyRecent);
    }
    if(trait==="permissive"){
      if(dayIndex<2&&anyRecent<.12)return score*.45;
    }
    return score;
  }

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
      var p=seats[i],traitIds=studentTraitIds(t.name),parentTraitIds=studentParentTraitIds(t.name);
      return Object.assign({},t,{traits:traitIds,parentTraits:parentTraitIds,parentKnown:[],knowledge:makeKnowledge(t,i),look:makeLook(t,i),teacherResponse:makeTeacherResponseProfile(t,i,traitIds),
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
    if(enc.noFollowUp||enc.familyEvent||enc.storyId)return;
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
      category:current().name,
      title:n.title,text:n.text,dialogue:n.dialogue||"",studentId:s.id,targetId:t?t.id:null,
      createdAt:gameSec,expiresAt:gameSec+320,choices:followUpChoices(s,job),
      isFollowUp:true,followUpId:job.id,chainDepth:job.chainDepth||1,
      previousDirection:job.sourceDirection,previousChoice:job.sourceChoice,effectSubject:job.sourceSubject||null,
      kicker:"Day "+dayIndex+" · "+current().name
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
    },
    {
      id:"combo_fast_but_distracted",category:"수업",title:"안 듣는 것 같은데 답은 맞힌다",
      score:function(s){return current().kind==="lesson"&&traitCombo(s,["distractible","quick_learner"])?1.45:0},
      build:function(s){
        return {text:s.name+"은(는) 아까부터 창밖도 보고 연필도 돌리고 있었다. 그런데 갑자기 어려운 문제를 정확하게 풀어냈다.",dialogue:s.name+' “저 이거 알아요. 답은 이거예요.”',choices:{
          up:encounterChoice("알고 있어도 수업 중에는 집중하는 태도가 필요하다고 짚는다.",{focus:4,trust:-1,classStability:3},"태도에 대한 기준은 분명해졌지만 "+s.name+"은(는) 조금 억울한 표정을 지었다."),
          down:encounterChoice("내용은 잘 따라오고 있었는지 묻고, 왜 자꾸 다른 데로 시선이 가는지 들어본다.",{mood:3,trust:5,focus:1,classFlow:-2},"알고 있는 것과 집중을 유지하는 어려움을 따로 볼 수 있게 됐다."),
          left:encounterChoice("이미 아는 문제는 줄이고 더 어려운 문제를 하나 건넨다.",{learning:5,focus:5,trust:3,classFlow:-2},"반복보다 도전이 필요한 순간인지 확인해 볼 수 있었다."),
          right:encounterChoice("기본 문제를 빨리 끝내고 도전 문제로 넘어갈지 스스로 정하게 한다.",{focus:3,mood:2,trust:4},"자기 속도에 맞춰 수업에 머무는 방법을 찾게 했다.")
        }};
      }
    },
    {
      id:"combo_perfect_student_pressure",category:"학습",title:"95점인데도 울 것 같은 얼굴이다",
      score:function(s){return current().kind==="lesson"&&traitCombo(s,["model_student","perfectionist"])?1.30:0},
      build:function(s){
        return {text:s.name+"이(가) 틀린 한 문제만 몇 번이고 보고 있다. 다른 아이들은 점수를 좋아하는데 "+s.name+"은(는) 종이를 접어 숨긴다.",dialogue:s.name+' “이것만 안 틀렸으면 100점인데…”',choices:{
          up:encounterChoice("한 문제 틀린 것으로 스스로를 몰아붙이지 말고 다음에 고치면 된다고 말한다.",{mood:2,trust:1,classStability:1},"기준을 낮추기보다 실수를 다루는 태도를 분명히 짚었다."),
          down:encounterChoice("속상한 마음을 인정하고 점수보다 지금 마음이 어떤지 먼저 묻는다.",{mood:7,trust:6,classFlow:-2},"점수 이야기를 잠시 내려놓자 "+s.name+"의 표정이 조금 풀렸다."),
          left:encounterChoice("틀린 문제 하나만 같이 보며 어디서 실수가 났는지 차분히 찾는다.",{learning:4,mood:3,trust:4,classFlow:-2},"실패를 자책 대신 배울 거리로 바꿔 볼 수 있었다."),
          right:encounterChoice("지금 다시 볼지, 집에서 볼지, 오늘은 덮어둘지 스스로 고르게 한다.",{mood:3,trust:4,focus:1},"실수를 다루는 속도를 학생에게 맡겼다.")
        }};
      }
    },
    {
      id:"combo_leader_competitive",category:"친구",title:"이기고 싶은 마음이 팀을 끌고 간다",
      score:function(s){return (current().subject==="체육"||lessonState.phase==="pair")&&traitCombo(s,["leadership","competitive"])?1.42:0},
      build:function(s){
        var target=studentById(s.lessonPartner)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 팀을 빠르게 이끌고 있지만 친구 의견을 거의 듣지 않는다. "+target.name+"이(가) 끼어들 틈을 찾고 있다.",dialogue:s.name+' “시간 없으니까 그냥 내가 정할게.”',choices:{
          up:encounterChoice("리더도 친구 의견을 들어야 한다고 멈춰 세우고 차례를 정한다.",{relation:2,focus:2,classStability:4},"팀은 잠시 멈췄지만 말할 순서가 생겼다."),
          down:encounterChoice("왜 서두르는지 묻고, 다른 친구가 어떤 기분일지도 같이 보게 한다.",{relation:4,mood:2,trust:4,classFlow:-3},"이기고 싶은 마음과 친구의 답답함을 함께 보게 했다."),
          left:encounterChoice("리더가 할 일은 답을 정하는 게 아니라 의견을 묻는 것이라고 직접 연습시킨다.",{relation:6,focus:3,trust:2,classFlow:-3},"주도하는 힘을 협동하는 방법으로 바꿔 볼 수 있었다."),
          right:encounterChoice("팀이 따를 방식을 친구들과 직접 합의하게 한다.",{relation:4,trust:3,classFlow:0},"리더 역할의 책임을 팀 안에서 다시 나누게 했다.")
        }};
      }
    },
    {
      id:"combo_social_rejection",category:"친구",title:"친구는 많은데 한마디에 크게 흔들린다",
      score:function(s){return ["break","lunchplay"].indexOf(current().kind)>=0&&traitCombo(s,["social","sensitive_rejection"])?1.28:0},
      build:function(s){
        return {text:s.name+"은(는) 평소 친구들과 잘 어울리는데, 오늘 한 친구가 다른 아이와 놀겠다고 하자 갑자기 혼자 떨어져 앉았다.",dialogue:s.name+' “됐어. 그냥 나 혼자 있을래.”',choices:{
          up:encounterChoice("친구가 다른 친구와 노는 건 자연스러운 일이라고 분명히 말해 준다.",{mood:-1,trust:1,classStability:2},"상황은 정리됐지만 서운함은 바로 없어지지 않았다."),
          down:encounterChoice("서운했던 마음을 먼저 듣고, 친구를 빼앗긴 것처럼 느꼈는지 물어본다.",{mood:7,trust:6,relation:3,classFlow:-2},"말로 꺼내자 감정의 크기가 조금 줄었다."),
          left:encounterChoice("한 친구가 다른 곳에 있을 때 할 수 있는 선택을 두세 가지 같이 떠올린다.",{relation:5,mood:3,trust:3},"관계가 흔들릴 때 쓸 방법을 미리 만들어 봤다."),
          right:encounterChoice("지금 누구와 무엇을 하고 싶은지 스스로 정하게 한다.",{mood:3,relation:3,trust:4},"서운함 속에서도 다음 행동을 자신이 고르게 했다.")
        }};
      }
    },
    {
      id:"combo_rule_model",category:"생활",title:"모범생이 친구들을 자꾸 단속한다",
      score:function(s){return traitCombo(s,["model_student","rule_oriented"])?1.18:0},
      build:function(s){
        var target=studentById(s.socialTarget)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"은(는) 규칙을 잘 지키지만 오늘은 "+target.name+"에게도 계속 ‘그러면 안 돼’라고 말하고 있다. "+target.name+"의 표정이 점점 굳는다.",dialogue:s.name+' “선생님이 하지 말라고 했잖아.”',choices:{
          up:encounterChoice("규칙을 알려 주는 역할은 선생님에게 맡기고 자기 할 일에 집중하라고 한다.",{focus:3,relation:1,classStability:4},"역할의 경계는 바로 분명해졌다."),
          down:encounterChoice("규칙이 어겨질 때 왜 그렇게 신경 쓰이는지 먼저 들어본다.",{mood:3,trust:5,relation:2,classFlow:-2},"통제하려는 행동 뒤에 있던 불편함을 확인했다."),
          left:encounterChoice("위험하거나 큰 방해가 아니라면 친구에게 직접 지적하지 않는 연습을 한다.",{relation:5,focus:3,trust:3,classFlow:-2},"규칙을 지키는 힘을 친구를 존중하는 방식으로 바꿔 봤다."),
          right:encounterChoice("어떤 일은 그냥 두고 어떤 일은 선생님에게 말할지 자기 기준을 세우게 한다.",{relation:3,trust:3,focus:2},"모든 일을 바로잡으려 하지 않고 개입할 일을 가려 보게 했다.")
        }};
      }
    },
    {
      id:"combo_shy_creative",category:"표현",title:"말은 없는데 작품에는 이야기가 가득하다",
      score:function(s){return current().subject==="미술"&&traitCombo(s,["shy","creative"])?1.46:0},
      build:function(s){
        return {text:s.name+"은(는) 발표하라는 말에는 고개를 숙였지만 작품에는 작은 이야기와 세세한 표현이 가득하다.",dialogue:s.name+' “말로 설명하는 건 좀 싫어요…”',choices:{
          up:encounterChoice("짧게라도 자기 작품을 직접 설명해 보게 한다.",{focus:2,mood:-2,trust:-1,classStability:2},"발표 경험은 남았지만 긴장도 함께 커졌다."),
          down:encounterChoice("말하지 않아도 괜찮다고 하고 작품을 먼저 충분히 봐 준다.",{mood:6,trust:6,classFlow:-1},"표현 방식 자체를 인정받았다는 느낌을 줬다."),
          left:encounterChoice("작품 옆에 한 줄 설명을 적고, 원하면 그 문장만 읽게 한다.",{learning:2,mood:3,trust:4,classFlow:-2},"말하기 부담을 줄이면서 생각을 밖으로 꺼낼 다리를 만들었다."),
          right:encounterChoice("말하기·글쓰기·친구에게만 설명하기 중 원하는 방식을 고르게 한다.",{mood:4,trust:5,focus:2},"자기 생각을 보여 주는 방법을 스스로 선택하게 했다.")
        }};
      }
    }

  ];

  // v26: everyday homeroom-teacher situations. These sit beside the behavior-driven
  // encounters above so a school day includes learning, care, relationships and family contact.
  ENCOUNTER_TEMPLATES=ENCOUNTER_TEMPLATES.concat([
    {
      id:"late_arrival",category:"등교",title:"수업 직전에 헐레벌떡 들어왔다",
      score:function(s){return current().kind==="morning"?Math.max(0,(.58-s.rule)*.75+(.58-s.persist)*.45+s.imp*.22):0},
      build:function(s){
        return {text:s.name+"이(가) 가방을 멘 채 숨을 고르며 교실로 들어왔다. 아침 준비 시간은 거의 끝났고 친구들은 이미 자리에 앉아 있다.",dialogue:s.name+' “늦잠 잤어요… 준비는 지금 하면 돼요?”',choices:{
          up:encounterChoice("늦었더라도 해야 할 아침 준비 순서를 바로 지키게 한다.",{focus:3,trust:-1,classStability:4,classFlow:2},"늦게 온 뒤 무엇을 해야 하는지는 분명해졌다."),
          down:encounterChoice("무슨 일이 있었는지 짧게 듣고 마음을 가라앉힌 뒤 준비하게 한다.",{mood:4,trust:5,classFlow:-2},"서두르던 마음이 조금 가라앉은 뒤 교실에 들어올 수 있었다."),
          left:encounterChoice("늦게 왔을 때 할 준비를 세 단계로 정해 바로 따라 해 보게 한다.",{focus:5,trust:2,classStability:3,classFlow:-2},"다음에도 사용할 수 있는 아침 준비 순서가 생겼다."),
          right:encounterChoice("지금 꼭 해야 할 준비 두 가지를 스스로 골라 먼저 끝내게 한다.",{focus:3,mood:2,trust:3,classFlow:1},"시간이 부족한 상황에서 우선순위를 스스로 정하게 했다.")
        }};
      }
    },
    {
      id:"forgotten_material",category:"수업준비",title:"수업 준비물이 없다",
      score:function(s){return current().kind==="lesson"?Math.max(0,(.56-s.persist)*.42+(.52-s.rule)*.34+s.imp*.16):0},
      build:function(s){
        return {text:"활동을 시작하려는데 "+s.name+"의 책상에 필요한 준비물이 없다. 주변 친구들은 이미 활동을 시작했다.",dialogue:s.name+' “아… 그거 집에 두고 왔어요.”',choices:{
          up:encounterChoice("준비물은 학생의 책임임을 확인하고 오늘은 대체 자료를 쓰게 한다.",{focus:2,trust:-1,classStability:4,classFlow:3},"수업은 바로 이어졌고 준비 책임도 분명히 남았다."),
          down:encounterChoice("자주 빠뜨리는 이유가 있는지 먼저 묻고 오늘은 부담 없이 참여하게 한다.",{mood:3,trust:5,classFlow:-2},"준비물이 빠지는 이유를 조금 더 알 수 있었다."),
          left:encounterChoice("수업이 끝난 뒤 가방 확인표를 하나 만들어 다음 날부터 써 보게 한다.",{focus:4,trust:3,classStability:3,classFlow:-2},"반복되는 준비 문제를 줄일 구체적인 방법을 만들었다."),
          right:encounterChoice("빌리기·대체하기·친구와 함께 쓰기 중 오늘 방법을 직접 고르게 한다.",{focus:2,trust:3,mood:2,classFlow:1},"수업에 참여하는 방법을 스스로 정하고 책임지게 했다.")
        }};
      }
    },
    {
      id:"lost_item_accusation",category:"또래관계",title:"잃어버린 물건 때문에 친구를 의심한다",
      score:function(s){
        if(["morning","break","lunchplay"].indexOf(current().kind)<0)return 0;
        var cause=recentWorldEventStrength(s,["borrow_item","taking"],3);if(cause<=.08)return 0;
        return Math.max(0,.34+cause*.82+s.rejection*.16+(hasTrait(s,"fairness_sensitive")?.14:0));
      },
      build:function(s){
        var target=recentEventCounterpart(s,["borrow_item","taking"],3)||studentById(s.socialTarget)||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 필통에서 물건이 보이지 않자 바로 "+target.name+"을(를) 바라보며 가져간 것 같다고 말한다. "+target.name+"은(는) 억울한 표정이다.",dialogue:s.name+' “아까 내 자리 왔잖아. 네가 가져갔지?”',choices:{
          up:encounterChoice("확인되지 않은 일로 친구를 지목하면 안 된다고 즉시 멈추게 한다.",{relation:-1,trust:-1,classStability:6,classFlow:2},"친구를 함부로 지목하지 않는 기준은 분명해졌다."),
          down:encounterChoice("물건을 잃어버려 불안한 마음과 억울한 친구의 마음을 차례로 듣는다.",{mood:4,relation:5,trust:4,classFlow:-4},"두 학생의 감정이 먼저 정리되면서 목소리가 낮아졌다."),
          left:encounterChoice("마지막으로 본 곳부터 함께 확인하는 순서로 사실을 찾아보게 한다.",{focus:3,relation:4,trust:3,classFlow:-3},"추측 대신 사실을 확인하는 방법을 연습했다."),
          right:encounterChoice("어디부터 찾아볼지 학생이 정하고, 확인 전에는 친구를 지목하지 않기로 한다.",{focus:2,relation:2,trust:3,classStability:2},"찾는 책임은 학생에게 주되 친구를 보호하는 선은 유지했다.")
        }};
      }
    },
    {
      id:"seat_change_request",category:"교실생활",title:"옆자리 때문에 집중이 안 된다고 한다",
      score:function(s){return current().kind==="lesson"?Math.max(0,s.rejection*.26+s.soc*.16+s.noise*.24+s.frustration*.32-.12):0},
      build:function(s){
        var target=nearbyStudents(s,30).filter(function(o){return o!==s})[0]||chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 수업 중 교사에게 와서 "+target.name+" 옆에서는 자꾸 신경이 쓰여 집중하기 어렵다고 말한다.",dialogue:s.name+' “저 자리 바꾸면 안 돼요? 계속 말 걸어요.”',choices:{
          up:encounterChoice("지금은 정해진 자리에서 수업하고 반복되면 교사가 조정하겠다고 한다.",{focus:2,trust:-1,classStability:4,classFlow:3},"자리 원칙은 유지됐지만 불편함은 더 지켜봐야 한다."),
          down:encounterChoice("어떤 점이 가장 힘든지 듣고 두 학생의 상황을 먼저 확인한다.",{mood:3,trust:5,relation:3,classFlow:-3},"단순히 싫어서가 아니라 구체적인 방해가 무엇인지 드러났다."),
          left:encounterChoice("옆자리와 지킬 수업 약속을 두 가지 정해 잠시 적용해 본다.",{focus:5,relation:4,trust:2,classFlow:-3},"자리 이동 전에 함께 지킬 행동을 먼저 연습했다."),
          right:encounterChoice("현재 자리에서 해볼 방법과 자리 이동 중 하나를 학생이 제안하게 한다.",{focus:3,trust:3,relation:2,classFlow:0},"학생도 자리 문제의 해결책을 함께 고민하게 됐다.")
        }};
      }
    },
    {
      id:"group_free_rider",category:"모둠활동",title:"모둠에서 한 명만 일하지 않는다",
      score:function(s){return current().kind==="lesson"?Math.max(0,(.55-s.persist)*.35+(1-s.helpful)*.20+(hasTrait(s,"autonomy_seeker")?.12:0)+s.boredom*.28-.10):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");
        return {targetId:target?target.id:null,text:"모둠 활동이 진행 중인데 "+s.name+"은(는) 자기 역할을 거의 하지 않고 친구들이 결과물을 만드는 모습을 보고 있다. 몇몇 친구의 표정이 불편해졌다.",dialogue:s.name+' “애들이 잘하니까 제가 안 해도 되잖아요.”',choices:{
          up:encounterChoice("모둠에서도 각자 맡은 몫은 해야 한다고 하고 역할을 바로 수행하게 한다.",{focus:4,trust:-2,relation:-1,classStability:5,classFlow:3},"역할 수행은 시작됐지만 자발성은 크지 않았다."),
          down:encounterChoice("왜 참여하지 않는지 묻고 어렵거나 부담되는 부분이 있는지 확인한다.",{mood:3,trust:5,relation:2,classFlow:-3},"게으름처럼 보이던 행동 뒤의 이유를 확인할 수 있었다."),
          left:encounterChoice("해야 할 역할을 더 작고 분명하게 나눠 첫 단계부터 하게 한다.",{focus:5,learning:2,relation:3,trust:2,classFlow:-3},"할 일이 구체적으로 보이자 모둠에 다시 들어오기 쉬워졌다."),
          right:encounterChoice("모둠에 기여할 수 있는 역할 중 하나를 직접 고르게 한다.",{focus:3,relation:3,trust:3,classFlow:0},"역할 선택권과 참여 책임을 함께 줬다.")
        }};
      }
    },
    {
      id:"public_correction_hurt",category:"정서",title:"지적을 받은 뒤 표정이 굳었다",
      score:function(s){return current().kind==="lesson"&&s.rejection>.54?Math.max(0,s.rejection*.55+s.react*.22-.20):0},
      build:function(s){
        return {text:"교사가 방금 답을 고쳐 말해 준 뒤 "+s.name+"이(가) 연필을 내려놓고 시선을 피한다. 주변 친구들이 들은 것이 신경 쓰이는 눈치다.",dialogue:s.name+' “저만 맨날 틀리는 것 같아요.”',choices:{
          up:encounterChoice("틀린 답을 고치는 건 수업의 자연스러운 과정이라고 분명히 말한다.",{focus:2,mood:-1,trust:0,classStability:2,classFlow:3},"수업 기준은 유지됐지만 학생의 민망함은 바로 사라지지 않았다."),
          down:encounterChoice("사람들 앞에서 틀린 느낌이 힘들었는지 조용히 확인한다.",{mood:6,trust:6,classFlow:-2},"민망했던 마음을 교사에게 말할 수 있게 됐다."),
          left:encounterChoice("정답보다 어디까지 생각했는지를 짚어 주고 다음 한 단계만 다시 해 보게 한다.",{learning:3,focus:3,mood:3,trust:4,classFlow:-2},"실수보다 사고 과정에 다시 집중할 수 있었다."),
          right:encounterChoice("지금 다시 해볼지, 잠시 뒤 다시 볼지 학생이 선택하게 한다.",{mood:3,focus:2,trust:4,classFlow:1},"회복할 속도를 스스로 선택하게 했다.")
        }};
      }
    },
    {
      id:"peer_laughs_mistake",category:"학급관계",title:"친구의 실수에 웃음이 터졌다",
      score:function(s){return current().kind==="lesson"&&s.mischief>.42?Math.max(0,s.mischief*.44+s.soc*.18-s.empathy*.18):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:target.name+"이(가) 발표에서 말을 잘못하자 "+s.name+"을(를) 포함한 몇 명이 웃었다. "+target.name+"은(는) 곧바로 입을 다물었다.",dialogue:s.name+' “아니, 그게 너무 웃겨서…”',choices:{
          up:encounterChoice("친구의 실수를 웃음거리로 만들지 않는다는 기준을 바로 확인한다.",{relation:1,trust:-1,classStability:6,classFlow:3},"교실에서 지켜야 할 선은 곧바로 분명해졌다."),
          down:encounterChoice("웃은 학생과 당사자가 각각 어떻게 느꼈는지 짧게 듣는다.",{mood:2,relation:5,trust:4,classFlow:-4},"웃음 뒤에 남은 민망함을 서로 확인했다."),
          left:encounterChoice("실수한 친구에게 할 수 있는 반응을 예로 들어 다시 표현하게 한다.",{relation:6,trust:2,classStability:2,classFlow:-3},"친구의 실수에 반응하는 다른 방법을 직접 연습했다."),
          right:encounterChoice("지금 분위기를 어떻게 다시 편하게 만들지 학생들이 제안하게 한다.",{relation:4,trust:3,classFlow:0},"교실 분위기를 회복하는 책임을 학생들에게도 나눴다.")
        }};
      }
    },
    {
      id:"pass_note_distraction",category:"수업운영",title:"수업 중 쪽지가 오간다",
      score:function(s){return current().kind==="lesson"&&(s.action==="PASS_NOTE"||s.mischief>.56)?Math.max(.18,s.mischief*.38+s.soc*.20+s.imp*.15):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");
        return {targetId:target?target.id:null,text:"설명하는 사이 "+s.name+"의 책상 아래로 접힌 쪽지가 건너갔다. 받는 친구도 웃음을 참으며 다시 무언가를 적으려 한다.",dialogue:s.name+' “수업 끝나고 보려고 한 거예요.”',choices:{
          up:encounterChoice("쪽지는 지금 치우고 수업 중에는 주고받지 않는다고 분명히 한다.",{focus:5,trust:-1,classStability:5,classFlow:4},"수업 흐름은 빠르게 돌아왔다."),
          down:encounterChoice("왜 지금 꼭 전달하고 싶었는지 짧게 묻고 수업 뒤에 이야기하도록 한다.",{focus:2,trust:4,mood:2,classFlow:-2},"대화 욕구를 인정하면서 수업과 시간을 분리했다."),
          left:encounterChoice("메모하고 싶은 내용은 개인 메모칸에 적어 두고 쉬는 시간에 전달하게 한다.",{focus:4,trust:2,classStability:3,classFlow:-2},"충동을 바로 행동으로 옮기지 않는 방법을 하나 만들었다."),
          right:encounterChoice("쪽지를 보관했다가 쉬는 시간에 전달할지 버릴지 스스로 고르게 한다.",{focus:3,trust:3,classFlow:1},"선택권을 주면서도 수업 중 전달은 멈췄다.")
        }};
      }
    },
    {
      id:"bathroom_urgent",category:"생활",title:"수업 중 갑자기 화장실이 급하다고 한다",
      score:function(s){return current().kind==="lesson"?Math.max(0,.10+s.imp*.08+s.react*.08+(s.mood<.5?.12:0)):0},
      build:function(s){
        return {text:"활동이 한창 진행되는 중 "+s.name+"이(가) 몸을 들썩이며 손을 들었다. 표정이 꽤 급해 보인다.",dialogue:s.name+' “선생님, 저 화장실 진짜 급해요.”',choices:{
          up:encounterChoice("안전하게 다녀오도록 하고 돌아오면 빠진 부분을 바로 이어 하게 한다.",{mood:2,trust:2,classStability:2,classFlow:-1},"필요한 이동은 허용하면서 수업 복귀 기준도 함께 잡았다."),
          down:encounterChoice("괜찮은지 먼저 확인하고 서두르지 말고 다녀오라고 한다.",{mood:4,trust:5,classFlow:-2},"학생이 불안해하지 않고 필요한 시간을 가질 수 있었다."),
          left:encounterChoice("다녀온 뒤 놓친 부분을 확인할 위치를 미리 표시해 준다.",{focus:3,trust:3,classFlow:-2},"화장실 이후에도 다시 수업에 들어올 길이 분명해졌다."),
          right:encounterChoice("지금 바로 다녀올지 활동의 이 단계만 끝내고 갈지 상태를 보고 스스로 말하게 한다.",{trust:3,focus:1,mood:2,classFlow:0},"자기 몸 상태를 판단해 말하는 책임을 학생에게 줬다.")
        }};
      }
    },
    {
      id:"nurse_request",category:"건강",title:"배가 아프다며 보건실에 가고 싶어 한다",
      score:function(s){return ["morning","lesson"].indexOf(current().kind)>=0?Math.max(0,.08+(1-s.energy)*.20+s.rejection*.06):0},
      build:function(s){
        return {text:s.name+"이(가) 책상에 엎드렸다가 배가 아프다며 보건실에 가고 싶다고 한다. 겉으로 크게 아파 보이지는 않지만 수업에 집중하지 못하고 있다.",dialogue:s.name+' “계속 배가 아픈 것 같아요. 보건실 가면 안 돼요?”',choices:{
          up:encounterChoice("몸이 불편하다고 말한 만큼 학교 절차에 따라 상태를 확인하고 보건실에 다녀오게 한다.",{trust:2,classStability:3,classFlow:-2},"몸 상태는 추측하지 않고 학교 안에서 확인받게 했다."),
          down:encounterChoice("어디가 어떻게 불편한지 차분히 듣고 불안한 점도 함께 확인한다.",{mood:4,trust:5,classFlow:-3},"몸의 불편함과 마음의 불편함을 모두 말할 기회를 줬다."),
          left:encounterChoice("보건실에 전달할 증상을 짧게 정리해 말할 수 있도록 도와준다.",{focus:1,trust:4,classFlow:-3},"학생이 자기 상태를 구체적으로 설명할 수 있게 했다."),
          right:encounterChoice("교사에게 더 설명할지 바로 보건실에서 확인받을지 학생이 선택해 말하게 한다.",{trust:4,mood:2,classFlow:-2},"학생이 자기 몸 상태에 대해 직접 의사 표현을 하게 했다.")
        }};
      }
    },
    {
      id:"minor_injury",category:"안전",title:"쉬는 시간에 넘어져 울고 있다",
      score:function(s){return ["break","lunchplay"].indexOf(current().kind)>=0&&s.energy>.6?Math.max(0,s.energy*.30+s.move*.34+s.imp*.18-.18):0},
      build:function(s){
        return {text:"쉬는 시간에 뛰던 "+s.name+"이(가) 넘어졌다. 크게 다친 것 같지는 않지만 놀란 표정으로 무릎을 감싸고 있다.",dialogue:s.name+' “아파요… 피 난 것 같아요.”',choices:{
          up:encounterChoice("주변 놀이를 멈추고 다친 정도를 확인한 뒤 필요한 안전 절차부터 따른다.",{mood:1,trust:3,classStability:6,classFlow:-2},"놀이보다 안전 확인을 먼저 두었다."),
          down:encounterChoice("놀란 마음을 진정시키며 어디가 얼마나 아픈지 천천히 확인한다.",{mood:5,trust:6,classFlow:-3},"학생이 진정하면서 자기 상태를 더 잘 말할 수 있었다."),
          left:encounterChoice("상처 확인 뒤 다음에 같은 장소에서 어떻게 움직일지 짧게 짚어 준다.",{focus:2,trust:3,classStability:4,classFlow:-3},"사고 처리와 함께 다음 안전 행동까지 연결했다."),
          right:encounterChoice("상태를 확인한 뒤 쉬기와 보건실 확인 중 필요한 쪽을 학생과 함께 정한다.",{mood:3,trust:4,classStability:2,classFlow:-2},"상태를 무시하지 않으면서 학생도 다음 행동에 참여했다.")
        }};
      }
    },
    {
      id:"lunch_refusal",category:"급식",title:"급식을 거의 먹지 않고 앉아 있다",
      score:function(s){return current().kind==="lunch"?Math.max(0,(1-s.persist)*.18+s.rejection*.13+(1-s.energy)*.16):0},
      build:function(s){
        return {text:"점심시간이 꽤 지났는데 "+s.name+"의 식판은 거의 그대로다. 먹으라는 말에 숟가락을 들었다가 다시 내려놓는다.",dialogue:s.name+' “오늘은 진짜 먹기 싫어요.”',choices:{
          up:encounterChoice("먹어야 할 최소한의 기준을 정하고 그만큼은 먹어 보게 한다.",{mood:-2,trust:-1,classStability:3,classFlow:1},"식사 기준은 생겼지만 거부감은 남았다."),
          down:encounterChoice("왜 먹기 싫은지 묻고 맛·냄새·속 상태 등 이유를 먼저 확인한다.",{mood:4,trust:5,classFlow:-3},"단순한 편식인지 다른 불편함이 있는지 조금 더 알 수 있었다."),
          left:encounterChoice("먹을 수 있는 음식부터 작은 양으로 시작해 보게 한다.",{mood:2,trust:3,focus:1,classFlow:-2},"식사 전체보다 가능한 한 입부터 시작하게 했다."),
          right:encounterChoice("먹을 수 있는 것과 어려운 것을 스스로 구분해 먼저 먹게 한다.",{mood:3,trust:4,classFlow:0},"자기 상태를 말하고 선택하며 식사에 참여하게 했다.")
        }};
      }
    },
    {
      id:"food_trade",category:"급식",title:"친구끼리 반찬을 바꿔 먹으려 한다",
      score:function(s){return current().kind==="lunch"&&s.soc>.55?Math.max(0,s.soc*.24+s.imp*.16+s.mischief*.12):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"과(와) "+target.name+"이(가) 서로 먹기 싫은 반찬을 바꿔 먹자며 식판을 가까이 붙였다. 다른 친구들도 따라 하려는 눈치다.",dialogue:s.name+' “나는 이거 줄게. 너는 그거 줘.”',choices:{
          up:encounterChoice("급식은 서로 바꾸지 않는다는 식사 규칙을 바로 확인한다.",{classStability:6,classFlow:3,trust:-1},"급식시간의 기준은 빠르게 정리됐다."),
          down:encounterChoice("왜 바꾸고 싶은지 듣되 서로의 음식을 주고받는 건 멈추게 한다.",{mood:2,trust:4,classStability:4,classFlow:-2},"학생의 이유는 들으면서 식사 안전의 선은 유지했다."),
          left:encounterChoice("먹기 어려운 음식은 남기거나 도움을 요청하는 방식으로 해결하도록 알려준다.",{focus:2,trust:3,classStability:4,classFlow:-2},"반찬을 교환하는 대신 사용할 수 있는 방법을 가르쳤다."),
          right:encounterChoice("자기 식판 안에서 먹을 순서와 양을 스스로 조절하게 한다.",{mood:2,trust:3,classStability:3,classFlow:0},"선택권을 식판 안으로 제한해 책임 있게 먹게 했다.")
        }};
      }
    },
    {
      id:"group_chat_conflict",category:"친구",title:"어젯밤 단체 대화방 일이 교실까지 이어졌다",
      score:function(s){return ["morning","break"].indexOf(current().kind)>=0&&s.soc>.55&&s.rejection>.42?Math.max(0,s.soc*.28+s.rejection*.30+s.react*.18-.18):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:"등교 뒤 "+s.name+"과(와) "+target.name+"이(가) 서로 말을 피한다. 어젯밤 단체 대화방에서 한 말 때문에 다툰 것 같고 주변 친구들도 내용을 알고 있다.",dialogue:s.name+' “선생님, 얘가 단톡에서 먼저 그랬어요.”',choices:{
          up:encounterChoice("학교에서도 이어지는 갈등인 만큼 서로 비난하는 말을 멈추고 사실부터 정리하게 한다.",{relation:1,classStability:5,trust:0,classFlow:-2},"교실에서 갈등이 더 번지는 것은 먼저 막았다."),
          down:encounterChoice("온라인에서 어떤 말이 상처였는지 두 학생을 따로 들어본다.",{mood:3,relation:5,trust:5,classFlow:-4},"화면 밖에서 커진 감정을 차례로 말할 수 있었다."),
          left:encounterChoice("온라인에서도 오해를 키우지 않는 말하기와 멈추는 방법을 함께 정리한다.",{relation:5,trust:3,classStability:3,classFlow:-4},"다음에 비슷한 갈등이 생겼을 때 쓸 방법을 배웠다."),
          right:encounterChoice("학교에서 관계를 어떻게 회복할지 두 학생이 한 가지씩 제안하게 한다.",{relation:4,trust:3,classFlow:-1},"온라인 갈등 이후의 관계 회복에 학생들도 책임을 나눴다.")
        }};
      }
    },
    {
      id:"rumor_spread",category:"친구",title:"확인되지 않은 이야기가 반에 퍼지고 있다",
      score:function(s){return ["break","lunchplay"].indexOf(current().kind)>=0&&s.soc>.58?Math.max(0,s.soc*.26+s.verbal*.24+s.mischief*.10-.12):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) 친구들에게 "+target.name+"에 관한 이야기를 전하고 있다. 어디서 들었는지 묻자 정확히는 모르지만 여러 명이 이미 알고 있다고 한다.",dialogue:s.name+' “저만 말한 거 아니에요. 다들 알고 있어요.”',choices:{
          up:encounterChoice("확인되지 않은 이야기를 더 퍼뜨리지 말라고 즉시 멈추게 한다.",{classStability:6,relation:1,trust:-1,classFlow:2},"소문이 더 퍼지는 것은 우선 멈췄다."),
          down:encounterChoice("그 이야기를 왜 전하고 싶었는지, 당사자는 어떻게 느낄지 생각하게 한다.",{mood:2,relation:5,trust:4,classFlow:-3},"소문이 관계에 남길 감정을 함께 보게 했다."),
          left:encounterChoice("사실이 아닌 이야기를 들었을 때 확인하거나 멈추는 말을 직접 연습한다.",{relation:5,trust:3,classStability:3,classFlow:-3},"다음에 소문을 들었을 때 할 행동을 구체적으로 익혔다."),
          right:encounterChoice("이미 말한 친구들에게 어떻게 바로잡을지 스스로 방법을 정하게 한다.",{relation:4,trust:3,classFlow:-1},"퍼뜨린 뒤의 책임까지 학생이 직접 맡게 했다.")
        }};
      }
    },
    {
      id:"refuses_partner",category:"모둠활동",title:"특정 친구와는 절대 같이 못 하겠다고 한다",
      score:function(s){return current().kind==="lesson"&&s.rejection>.46?Math.max(0,s.rejection*.28+s.assert*.25+s.compete*.12-.10):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:"짝 활동을 안내하자 "+s.name+"이(가) "+target.name+"을(를) 보며 고개를 세게 젓는다. 주변 학생들도 두 사람을 바라본다.",dialogue:s.name+' “저는 얘랑은 진짜 못 해요.”',choices:{
          up:encounterChoice("친구를 공개적으로 거부하는 말은 멈추고 정해진 활동에 참여하게 한다.",{relation:-1,classStability:6,classFlow:3,trust:-1},"공개적인 거부는 멈췄지만 관계의 이유는 남아 있다."),
          down:encounterChoice("두 학생을 잠깐 분리해 왜 함께하기 힘든지 먼저 듣는다.",{mood:3,relation:4,trust:5,classFlow:-4},"거부 뒤에 있던 갈등이나 부담을 확인할 수 있었다."),
          left:encounterChoice("역할과 대화 규칙을 아주 분명히 나눠 짧은 시간부터 함께 해보게 한다.",{relation:4,focus:4,trust:2,classFlow:-4},"함께해야 할 범위를 작게 만들어 협동을 연습했다."),
          right:encounterChoice("짝은 유지하되 역할 배분이나 앉는 위치는 두 학생이 정하게 한다.",{relation:3,trust:3,focus:2,classFlow:-1},"완전한 회피 대신 함께할 방식을 스스로 조정하게 했다.")
        }};
      }
    },
    {
      id:"sensory_overload",category:"정서",title:"교실 소리가 커지자 버티기 힘들어한다",
      score:function(s){return ["lesson","break","lunch"].indexOf(current().kind)>=0&&(hasTrait(s,"sensitive_rejection")||hasTrait(s,"quiet_internalizer")||s.noise>.58)?Math.max(0,s.noise*.34+s.react*.22+(1-s.energy)*.15-.12):0},
      build:function(s){
        return {text:"교실 소리가 커지자 "+s.name+"이(가) 귀를 막고 고개를 숙인다. 말을 걸어도 바로 대답하지 못하고 주변 소리에 계속 신경을 쓴다.",dialogue:s.name+' “너무 시끄러워요… 머리가 아파요.”',choices:{
          up:encounterChoice("교실 전체 소음을 먼저 낮추고 조용히 활동할 기준을 다시 잡는다.",{mood:2,trust:2,classStability:6,classFlow:-2},"학생 한 명의 어려움을 계기로 전체 환경부터 안정시켰다."),
          down:encounterChoice("말을 재촉하지 않고 잠깐 조용한 곳에서 진정할 시간을 준다.",{mood:7,trust:6,classFlow:-4},"자극에서 떨어져 숨을 돌릴 시간이 생겼다."),
          left:encounterChoice("다음에 소리가 힘들 때 사용할 신호와 쉴 방법을 함께 정한다.",{mood:3,trust:4,focus:3,classFlow:-3},"힘들어지기 전에 도움을 요청할 방법을 만들었다."),
          right:encounterChoice("자리에서 쉬기와 조용한 위치로 이동하기 중 편한 방법을 고르게 한다.",{mood:4,trust:5,focus:2,classFlow:-2},"자기 상태에 맞는 조절 방법을 직접 선택하게 했다.")
        }};
      }
    },
    {
      id:"transition_stuck",category:"생활",title:"활동이 끝났는데도 전환하지 못한다",
      score:function(s){return ["break","lesson","closing"].indexOf(current().kind)>=0&&(hasTrait(s,"needs_structure")||hasTrait(s,"slow_to_warm")||s.persist>.76)?Math.max(0,s.persist*.18+s.rejection*.16+(hasTrait(s,"needs_structure")?.30:0)):0},
      build:function(s){
        return {text:"다음 활동으로 넘어갈 시간이 됐지만 "+s.name+"은(는) 하던 것을 계속 붙잡고 있다. 주변 친구들이 정리를 마쳐도 움직이지 않는다.",dialogue:s.name+' “이거 아직 안 끝났어요. 조금만 더 하면 안 돼요?”',choices:{
          up:encounterChoice("전환 시간임을 분명히 알리고 지금 정리한 뒤 다음 시간에 이어 하게 한다.",{focus:2,mood:-2,classStability:5,classFlow:4},"학급 흐름은 유지됐지만 아쉬움은 남았다."),
          down:encounterChoice("끝내고 싶은 마음을 인정하고 어디까지 하면 마음이 놓일지 묻는다.",{mood:4,trust:5,classFlow:-3},"멈추기 어려웠던 이유를 학생이 말할 수 있었다."),
          left:encounterChoice("마지막 한 단계-정리-다음 활동 순서를 눈앞에서 짚어 준다.",{focus:5,trust:3,classStability:3,classFlow:-2},"전환 과정을 작게 나누자 다음 활동으로 넘어가기 쉬워졌다."),
          right:encounterChoice("지금 사진으로 남기기와 다음 시간에 이어 하기 중 방법을 고르게 한다.",{mood:3,trust:4,focus:2,classFlow:0},"하던 것을 잃지 않는 방법을 스스로 선택하고 전환했다.")
        }};
      }
    },
    {
      id:"broken_item_denial",category:"생활지도",title:"교실 물건이 망가졌는데 아무도 말하지 않는다",
      score:function(s){return ["break","closing"].indexOf(current().kind)>=0&&s.imp>.5?Math.max(0,s.imp*.28+s.mischief*.30+(1-s.rule)*.20-.12):0},
      build:function(s){
        return {text:"교실에서 함께 쓰는 물건 하나가 망가진 채 발견됐다. 근처에 있던 "+s.name+"에게 묻자 시선을 피하며 모른다고 한다.",dialogue:s.name+' “저 아니에요. 그냥 여기 있었어요.”',choices:{
          up:encounterChoice("망가뜨린 것보다 숨기는 것이 더 큰 문제라고 하고 사실대로 말할 기회를 준다.",{trust:-1,classStability:6,classFlow:1},"책임져야 할 기준을 분명히 세웠다."),
          down:encounterChoice("혼날까 봐 말하기 어려운 건지 조용히 묻고 사실을 말해도 먼저 듣겠다고 한다.",{mood:3,trust:6,classFlow:-3},"방어적인 태도가 조금 누그러졌다."),
          left:encounterChoice("실수했을 때 알리기-정리하기-도움 요청하기 순서를 구체적으로 알려준다.",{focus:2,trust:3,classStability:4,classFlow:-3},"물건을 망가뜨렸을 때 책임지는 방법을 배웠다."),
          right:encounterChoice("알고 있는 만큼 설명하고 이후 어떻게 정리할지 스스로 제안하게 한다.",{trust:3,classStability:3,classFlow:-1},"사실을 말하는 것과 뒷정리 책임을 학생에게 연결했다.")
        }};
      }
    },
    {
      id:"parent_homework_complaint",category:"가정연계",title:"과제가 너무 많다는 보호자 연락이 왔다",familyEvent:true,
      score:function(s){return ["morning","closing"].indexOf(current().kind)>=0&&(hasTrait(s,"perfectionist")||hasTrait(s,"foundational_gaps")||s.persist<.42)?Math.max(0,.12+s.rejection*.12+(1-s.academic)*.16):0},
      build:function(s){
        return {text:"보호자가 "+s.name+"이(가) 집에서 과제를 하며 너무 힘들어한다는 연락을 보냈다. "+s.name+"도 교사를 보며 반응을 살핀다.",dialogue:s.name+' “엄마가 숙제 좀 줄여 달라고 했어요.”',choices:{
          up:encounterChoice("학급 과제의 기본 기준과 목적을 보호자와 학생에게 분명히 설명한다.",{trust:-1,classStability:4,classFlow:2},"과제 기준은 명확해졌지만 부담감은 더 살펴볼 필요가 있다."),
          down:encounterChoice("집에서 실제로 얼마나 힘들었는지 학생과 보호자의 이야기를 먼저 듣는다.",{mood:4,trust:6,classFlow:-3},"과제량보다 어떤 지점에서 힘든지 구체적으로 확인했다."),
          left:encounterChoice("핵심 과제와 선택 과제를 나누고 집에서 적용할 방법을 안내한다.",{learning:2,focus:3,trust:4,classFlow:-3},"학습 목표는 유지하면서 부담을 조절할 방법을 만들었다."),
          right:encounterChoice("필수 과제를 한 뒤 추가 연습 여부를 학생이 스스로 선택하게 한다.",{mood:3,trust:4,focus:2,classFlow:0},"해야 할 것과 선택할 것을 구분해 책임을 나눴다.")
        }};
      }
    },
    {
      id:"parent_friend_conflict",category:"가정연계",title:"보호자가 친구 관계를 바로 해결해 달라고 한다",familyEvent:true,
      score:function(s){return ["morning","closing"].indexOf(current().kind)>=0&&s.rejection>.56&&s.soc>.42?Math.max(0,.10+s.rejection*.22+s.soc*.10):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");
        return {targetId:target?target.id:null,text:"보호자가 "+s.name+"이(가) 친구 문제로 집에서 속상해했다며 상대 학생과 떨어뜨려 달라고 연락했다. 교실에서는 두 학생이 완전히 멀어진 모습은 아니다.",dialogue:s.name+' “엄마한테는 어제 있었던 일 말했어요.”',choices:{
          up:encounterChoice("자리나 모둠을 바로 바꾸기 전에 학교에서 확인된 사실과 학급 기준부터 정리한다.",{classStability:4,trust:1,classFlow:-1},"보호자 요구만으로 관계를 바로 결정하지 않고 교실 상황을 먼저 확인했다."),
          down:encounterChoice("학생에게 집에서 말한 일과 지금 느끼는 마음을 다시 차분히 듣는다.",{mood:4,trust:6,relation:2,classFlow:-3},"학생이 원하는 것이 무엇인지 조금 더 분명해졌다."),
          left:encounterChoice("두 학생 관계를 며칠 관찰하고 필요한 경우 대화나 자리 조정을 하겠다는 계획을 세운다.",{relation:3,trust:4,classStability:3,classFlow:-3},"즉시 분리보다 관찰과 개입의 순서를 만들었다."),
          right:encounterChoice("학생에게 지금 원하는 거리와 도움을 말하게 하고 가능한 범위에서 선택하게 한다.",{mood:3,trust:5,relation:2,classFlow:-1},"학생 본인의 의사를 관계 조정에 반영했다.")
        }};
      }
    },
    {
      id:"school_refusal_signal",category:"정서",title:"아침마다 학교 오기 싫다고 했다고 한다",
      score:function(s){return current().kind==="morning"&&(s.rejection>.58||hasTrait(s,"slow_to_warm")||s.mood<.48)?Math.max(0,s.rejection*.26+(1-s.mood)*.35+.08):0},
      build:function(s){
        return {text:"등교한 "+s.name+"이(가) 평소보다 말이 없다. 보호자가 아침마다 학교 가기 싫다는 말을 반복한다고 전했고, 오늘도 교실 문 앞에서 한동안 들어오지 못했다고 한다.",dialogue:s.name+' “그냥… 집에 있고 싶었어요.”',choices:{
          up:encounterChoice("학교에 온 뒤 해야 할 하루의 기본 흐름을 간단하고 분명하게 안내한다.",{focus:2,mood:-1,trust:1,classStability:3},"하루의 틀은 선명해졌지만 마음의 이유는 더 살펴봐야 한다."),
          down:encounterChoice("오늘 가장 걱정되는 것이 무엇인지 조용히 묻고 충분히 듣는다.",{mood:6,trust:7,classFlow:-3},"학교가 싫다는 말 안에 어떤 불편함이 있는지 들을 수 있었다."),
          left:encounterChoice("첫 교시까지 할 일만 작게 정하고 하나씩 지나가 보자고 한다.",{focus:4,mood:3,trust:4,classFlow:-2},"하루 전체보다 가까운 다음 단계에 집중하게 했다."),
          right:encounterChoice("아침에 먼저 할 활동 두 가지 중 편한 것을 고르게 한다.",{mood:3,trust:4,focus:2,classFlow:0},"등교 직후부터 작은 선택권을 갖고 교실에 들어오게 했다.")
        }};
      }
    },
    {
      id:"teacher_answer_challenge",category:"수업",title:"학생이 교사의 설명이 틀린 것 같다고 말한다",
      score:function(s){return current().kind==="lesson"&&(hasTrait(s,"quick_learner")||s.academic>.76)&&s.assert>.48?Math.max(0,s.academic*.22+s.assert*.24+.06):0},
      build:function(s){
        return {text:"설명 중 "+s.name+"이(가) 손을 들고 교사의 풀이가 이상하다고 말한다. 몇몇 학생이 교과서와 칠판을 번갈아 본다.",dialogue:s.name+' “선생님, 여기 계산이 다른 것 같은데요?”',choices:{
          up:encounterChoice("말할 때의 예의를 지키되 근거가 있다면 확인할 수 있다고 기준을 세운다.",{focus:3,trust:1,classStability:3,classFlow:-1},"질문하는 태도와 교실의 기준을 함께 지켰다."),
          down:encounterChoice("잘 봤다고 인정하고 어떤 점에서 이상하다고 느꼈는지 충분히 말하게 한다.",{mood:3,trust:6,learning:2,classFlow:-3},"학생의 문제 제기를 수업 안에서 안전하게 다뤘다."),
          left:encounterChoice("교과서와 풀이를 함께 대조하며 누구의 답이 맞는지 근거로 확인한다.",{learning:5,focus:4,trust:4,classFlow:-4},"교사도 확인할 수 있다는 모습을 학습 과정으로 만들었다."),
          right:encounterChoice("학생에게 자신의 풀이를 칠판에 설명하고 친구들이 검토하게 한다.",{learning:4,focus:3,trust:4,classFlow:-3},"정답을 권위로 정하기보다 근거를 공개적으로 확인했다.")
        }};
      }
    },
    {
      id:"class_job_ignored",category:"책임",title:"맡은 학급 일을 계속 미룬다",
      score:function(s){return ["morning","closing"].indexOf(current().kind)>=0?Math.max(0,(.62-s.persist)*.30+(1-s.rule)*.18+s.boredom*.18-.08):0},
      build:function(s){
        return {text:s.name+"이(가) 오늘 맡은 학급 일을 몇 번이나 미루고 있다. 다른 친구가 대신 하려 하자 자연스럽게 물러서려 한다.",dialogue:s.name+' “쟤가 한다니까 그냥 해도 되잖아요.”',choices:{
          up:encounterChoice("맡은 일은 본인이 마무리해야 한다고 하고 지금 끝내게 한다.",{focus:3,trust:-1,classStability:5,classFlow:2},"책임의 주인은 분명해졌다."),
          down:encounterChoice("왜 계속 미루는지 묻고 역할이 어렵거나 싫은 이유를 듣는다.",{mood:2,trust:5,classFlow:-2},"하기 싫다는 말 뒤의 이유를 확인했다."),
          left:encounterChoice("역할을 작은 순서로 나눠 첫 단계부터 같이 시작한다.",{focus:4,trust:3,classStability:3,classFlow:-2},"시작이 어려운 역할을 구체적인 행동으로 바꿨다."),
          right:encounterChoice("오늘 맡은 일을 끝낸 뒤 다음 역할은 바꿀 수 있게 선택권을 준다.",{focus:2,trust:3,classStability:2,classFlow:0},"오늘 책임은 지키되 다음에는 선택할 여지를 줬다.")
        }};
      }
    },
    {
      id:"rough_play_boundary",category:"안전",title:"장난이 점점 거칠어지고 있다",
      score:function(s){return ["break","lunchplay"].indexOf(current().kind)>=0&&s.energy>.66?Math.max(0,s.energy*.24+s.imp*.28+s.mischief*.28-.14):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"과(와) "+target.name+"이(가) 웃으며 밀고 잡는 장난을 한다. 둘 다 처음에는 즐거워 보였지만 힘이 점점 세지고 주변 친구들과도 부딪힐 뻔했다.",dialogue:s.name+' “장난인데요? 얘도 웃었어요.”',choices:{
          up:encounterChoice("다칠 수 있는 몸 장난은 여기서 끝이라고 즉시 멈추게 한다.",{classStability:7,trust:-1,classFlow:2},"안전선은 즉시 분명해졌다."),
          down:encounterChoice("두 학생 모두 정말 괜찮았는지 따로 확인하고 불편했던 순간이 있었는지 듣는다.",{mood:3,relation:4,trust:5,classFlow:-3},"웃고 있었다고 해서 모두 편했던 것은 아닌지 확인했다."),
          left:encounterChoice("몸으로 놀 때 멈춤 신호와 힘 조절 규칙을 정해 연습하게 한다.",{relation:4,classStability:4,trust:3,classFlow:-3},"장난과 위험 사이의 경계를 구체적인 행동으로 가르쳤다."),
          right:encounterChoice("계속 놀고 싶다면 안전하게 바꿀 방법을 둘이 정하게 한다.",{relation:3,trust:3,classStability:3,classFlow:0},"놀이를 완전히 빼앗지 않고 안전 책임을 함께 맡겼다.")
        }};
      }
    },
    {
      id:"test_blank_freeze",category:"평가",title:"아는 문제인데 시험지만 보고 멈춰 있다",
      score:function(s){return current().kind==="lesson"&&(hasTrait(s,"perfectionist")||hasTrait(s,"sensitive_rejection"))?Math.max(0,s.rejection*.30+s.persist*.12+s.frustration*.30+.08):0},
      build:function(s){
        return {text:"평소에는 풀던 유형인데 "+s.name+"이(가) 평가지를 받은 뒤 첫 문제에서 오래 멈춰 있다. 지우개를 여러 번 만지며 답을 쓰지 못한다.",dialogue:s.name+' “틀리면 어떡해요… 갑자기 하나도 모르겠어요.”',choices:{
          up:encounterChoice("평가는 지금 아는 만큼 보여 주는 시간이라고 하고 일단 첫 문제부터 시작하게 한다.",{focus:3,mood:-1,trust:1,classStability:2},"시작은 했지만 긴장은 여전히 남아 있다."),
          down:encounterChoice("불안해진 마음을 짧게 인정하고 숨을 고를 시간을 준다.",{mood:6,trust:6,classFlow:-2},"긴장이 조금 내려가면서 문제를 다시 볼 수 있었다."),
          left:encounterChoice("쉬운 문제부터 표시해 풀고 어려운 문제는 뒤로 넘기는 전략을 알려준다.",{focus:5,learning:1,trust:4,classFlow:-2},"시험 중 막혔을 때 사용할 구체적인 방법을 익혔다."),
          right:encounterChoice("어느 문제부터 시작할지 스스로 고르게 하고 그 선택을 존중한다.",{focus:3,mood:3,trust:4,classFlow:0},"자기가 통제할 수 있는 부분부터 다시 시작했다.")
        }};
      }
    },
    {
      id:"expensive_item_showoff",category:"생활",title:"비싼 물건을 가져와 친구들에게 보여 준다",
      score:function(s){return ["morning","break"].indexOf(current().kind)>=0&&s.soc>.56?Math.max(0,s.soc*.20+s.assert*.18+s.compete*.14+.05):0},
      build:function(s){
        return {text:s.name+"이(가) 집에서 가져온 비싼 물건을 친구들 사이에 꺼내 보여 준다. 만져보려는 아이들이 몰리고, 없는 친구를 놀리는 말도 살짝 나온다.",dialogue:s.name+' “이거 엄청 비싼 거예요. 너희는 이런 거 없지?”',choices:{
          up:encounterChoice("학습에 필요하지 않은 귀중품은 꺼내지 않는다는 기준을 바로 적용한다.",{classStability:6,classFlow:3,trust:-1},"분실과 비교가 커지기 전에 물건을 정리했다."),
          down:encounterChoice("자랑하고 싶었던 마음은 듣되 친구를 비교하는 말은 상처가 될 수 있음을 짚는다.",{mood:2,relation:4,trust:4,classFlow:-3},"물건보다 친구 관계에 남는 말을 함께 보게 했다."),
          left:encounterChoice("보여 주고 싶은 물건이 있을 때 학교에서 허락받는 방법과 시간을 알려준다.",{focus:2,classStability:4,trust:3,classFlow:-2},"다음에 사용할 수 있는 규칙과 절차를 구체적으로 배웠다."),
          right:encounterChoice("오늘은 보관하고, 나중에 필요한 경우 소개할 방법을 스스로 정해 보게 한다.",{trust:3,relation:2,classStability:3,classFlow:0},"즉시 자랑하는 대신 책임 있게 다룰 방법을 선택하게 했다.")
        }};
      }
    },
    {
      id:"student_says_teacher_unfair",category:"교사관계",title:"‘선생님은 저한테만 그래요’라고 말한다",
      score:function(s){return ["lesson","closing"].indexOf(current().kind)>=0&&(s.rejection>.48||hasTrait(s,"fairness_sensitive"))?Math.max(0,s.rejection*.28+(hasTrait(s,"fairness_sensitive")?.32:0)+s.react*.16-.12):0},
      build:function(s){
        return {text:"생활지도를 받은 "+s.name+"이(가) 잠시 뒤 교사에게 다시 와서 자신만 자주 지적받는 것 같다고 말한다. 표정에는 억울함이 남아 있다.",dialogue:s.name+' “선생님은 왜 저한테만 뭐라고 해요?”',choices:{
          up:encounterChoice("누구에게나 같은 기준을 적용하고 있으며 지금 행동도 그 기준에 해당한다고 설명한다.",{trust:-1,classStability:5,classFlow:2},"교사의 기준은 분명히 전달됐다."),
          down:encounterChoice("그렇게 느낀 장면이 언제였는지 구체적으로 말해 보게 하고 먼저 듣는다.",{mood:3,trust:6,classFlow:-3},"막연한 억울함이 구체적인 경험으로 바뀌었다."),
          left:encounterChoice("최근 있었던 지도 상황을 함께 되짚고 행동과 사람을 구분해 설명한다.",{focus:2,trust:5,classStability:3,classFlow:-3},"‘나를 싫어해서’라는 해석과 실제 행동 지도를 구분해 볼 수 있었다."),
          right:encounterChoice("앞으로 지적이 필요할 때 어떤 방식이면 더 잘 받아들일 수 있을지 제안하게 한다.",{trust:5,mood:2,classStability:2,classFlow:-1},"학생도 교사와의 소통 방식을 만드는 데 참여했다.")
        }};
      }
    },
    {
      id:"crying_after_feedback",category:"정서",title:"짧은 피드백 뒤 갑자기 눈물이 난다",
      score:function(s){return current().kind==="lesson"&&(s.rejection>.60||hasTrait(s,"easily_discouraged"))?Math.max(0,s.rejection*.34+s.react*.28+(1-s.mood)*.22):0},
      build:function(s){
        return {text:"교사가 활동지를 고쳐 보자고 말한 직후 "+s.name+"의 눈에 눈물이 맺혔다. 큰 목소리로 혼낸 것도 아닌데 학생은 말을 못 하고 고개를 숙인다.",dialogue:s.name+' “저 진짜 열심히 했는데…”',choices:{
          up:encounterChoice("수정이 필요한 부분은 그대로 두되 울었다고 과제를 없애지는 않는다고 한다.",{focus:2,mood:-2,trust:-1,classStability:3},"해야 할 일의 기준은 유지됐다."),
          down:encounterChoice("열심히 한 마음이 무시된 것처럼 느껴졌는지 먼저 듣는다.",{mood:7,trust:7,classFlow:-3},"눈물 뒤에 있던 서운함을 말할 수 있게 됐다."),
          left:encounterChoice("잘한 부분을 하나 짚고 고칠 부분은 한 가지씩만 다시 보게 한다.",{learning:3,focus:3,mood:4,trust:4,classFlow:-3},"피드백을 실패 전체가 아니라 다음 한 단계로 바꿨다."),
          right:encounterChoice("지금 고치기와 잠시 쉬었다가 고치기 중 스스로 고르게 한다.",{mood:4,trust:4,focus:2,classFlow:0},"해야 할 일은 남기면서 회복할 속도는 학생이 정했다.")
        }};
      }
    },
    {
      id:"copies_homework",category:"학습",title:"친구 과제를 그대로 옮겨 적고 있다",
      score:function(s){return ["morning","lesson"].indexOf(current().kind)>=0&&(hasTrait(s,"foundational_gaps")||s.persist<.46)?Math.max(0,(1-s.academic)*.22+(1-s.persist)*.28+s.rejection*.12):0},
      build:function(s){
        var target=chooseSocialTarget(s,"SOCIAL");if(!target)return null;
        return {targetId:target.id,text:s.name+"이(가) "+target.name+"의 과제를 옆에 두고 답을 거의 그대로 적고 있다. 들키자 두 학생 모두 손을 멈췄다.",dialogue:s.name+' “모르는 것만 좀 본 거예요.”',choices:{
          up:encounterChoice("베껴 쓴 부분은 자기 과제로 인정할 수 없다고 하고 다시 하게 한다.",{learning:1,mood:-2,trust:-2,classStability:5,classFlow:-2},"과제의 기준과 책임은 분명해졌다."),
          down:encounterChoice("왜 베껴야 할 만큼 막혔는지 먼저 묻고 어려웠던 부분을 확인한다.",{mood:3,trust:5,learning:1,classFlow:-3},"부정행동 뒤에 있던 학습 어려움을 확인했다."),
          left:encounterChoice("모르는 문제는 표시하고 도움을 요청한 뒤 다시 풀도록 방법을 알려준다.",{learning:4,focus:3,trust:3,classFlow:-3},"모를 때 베끼는 대신 사용할 방법을 연습했다."),
          right:encounterChoice("지금 다시 풀 문제를 스스로 고르고 나머지는 도움받아 마무리하게 한다.",{learning:2,focus:2,trust:3,classFlow:0},"책임을 전부 빼앗지 않고 다시 해볼 부분을 직접 정하게 했다.")
        }};
      }
    },
    {
      id:"friend_secret_burden",category:"친구",title:"친구의 비밀 때문에 마음이 무겁다고 한다",
      score:function(s){return ["break","lunchplay","closing"].indexOf(current().kind)>=0&&hasTrait(s,"empathetic")?Math.max(0,s.empathy*.25+s.rejection*.18+.06):0},
      build:function(s){
        return {text:s.name+"이(가) 친구에게서 들은 이야기가 계속 마음에 걸린다며 교사에게 조용히 다가왔다. 약속 때문에 자세히 말해도 되는지 망설인다.",dialogue:s.name+' “비밀로 하라고 했는데… 제가 계속 신경 쓰여요.”',choices:{
          up:encounterChoice("친구의 안전이나 도움이 필요한 일이라면 어른에게 말해도 된다는 기준을 알려준다.",{trust:5,classStability:4,classFlow:-2},"비밀보다 도움을 요청해야 하는 경우가 있음을 분명히 했다."),
          down:encounterChoice("혼자 품고 있어서 힘들었는지 먼저 듣고 말할 수 있는 만큼만 말하게 한다.",{mood:5,trust:7,classFlow:-3},"학생이 혼자 책임지고 있던 부담을 조금 내려놓았다."),
          left:encounterChoice("비밀·사생활·도움이 필요한 위험한 이야기의 차이를 예로 들어 알려준다.",{focus:2,trust:5,classStability:3,classFlow:-3},"어떤 이야기는 어른에게 알려야 하는지 판단 기준을 배웠다."),
          right:encounterChoice("누구에게 어떤 방식으로 도움을 요청할지 학생과 함께 선택한다.",{mood:3,trust:6,classFlow:-2},"말할 상대와 방식을 선택하며 도움 요청에 참여했다.")
        }};
      }
    },
    {
      id:"cleanup_perfectionism",category:"생활",title:"정리를 너무 완벽하게 하느라 종례를 못 따라온다",
      score:function(s){return current().kind==="closing"&&hasTrait(s,"perfectionist")?Math.max(0,s.persist*.28+s.rule*.22+.08):0},
      build:function(s){
        return {text:"종례 준비가 끝났는데 "+s.name+"은(는) 책상과 사물함을 계속 다시 맞추고 있다. 친구들은 거의 준비를 마쳤지만 본인은 작은 어긋남도 그냥 두지 못한다.",dialogue:s.name+' “잠깐만요. 이거 똑바로 해놓고 가야 돼요.”',choices:{
          up:encounterChoice("정리 시간은 끝났다고 알리고 지금 상태에서 멈추게 한다.",{focus:1,mood:-2,classStability:5,classFlow:4},"하교 흐름은 지켰지만 학생은 마무리가 덜 된 느낌을 받았다."),
          down:encounterChoice("어긋난 채 두면 어떤 기분이 드는지 듣고 불편함을 인정해 준다.",{mood:4,trust:5,classFlow:-2},"완벽하게 해야 마음이 놓이는 이유를 조금 더 알게 됐다."),
          left:encounterChoice("정리의 완료 기준을 세 가지로 정하고 그 기준만 확인하게 한다.",{focus:5,mood:2,trust:3,classStability:3,classFlow:-2},"끝없이 확인하지 않도록 ‘충분히 됐다’는 기준을 만들었다."),
          right:encounterChoice("오늘 남겨둘 한 가지와 꼭 마칠 한 가지를 직접 고르게 한다.",{mood:3,focus:3,trust:4,classFlow:0},"완벽 대신 우선순위를 선택하며 마무리하게 했다.")
        }};
      }
    }
  ]);

  ENCOUNTER_TEMPLATES=ENCOUNTER_TEMPLATES.concat([
    {
      id:"parent_supportive_checkin",category:"가정연계",title:"보호자가 먼저 아이의 변화를 알려왔다",familyEvent:true,parentTrait:"supportive_partner",
      score:function(s){return familyEventScore(s,"supportive_partner",.42)},
      build:function(s){
        return {text:s.name+"의 보호자가 최근 집에서 달라진 모습을 짧게 알려주며 학교에서는 어떤지 묻는다. 교사를 탓하거나 답을 정해 두기보다 함께 살펴보자는 분위기다.",dialogue:'보호자 메시지 · “집에서는 요즘 혼자 해보려는 게 늘었어요. 학교에서는 어떤가요?”',choices:{
          up:encounterChoice("학교에서도 지켜야 할 기준과 가정에서 이어 주면 좋은 약속을 분명히 맞춘다.",{trust:3,classStability:3,classTrust:4,classFlow:-1},"학교와 가정이 같은 기준을 공유하게 됐다."),
          down:encounterChoice("아이의 정서와 관계에서 좋아진 점을 구체적으로 나누고 보호자의 관찰도 더 듣는다.",{mood:2,trust:5,classTrust:5,classFlow:-2},"아이를 둘러싼 관찰이 학교와 가정 사이에서 자연스럽게 이어졌다."),
          left:encounterChoice("집에서도 써볼 수 있는 한 가지 방법을 구체적으로 제안하고 다음에 함께 확인하기로 한다.",{focus:2,trust:4,classTrust:5,classFlow:-2},"가정과 학교가 같은 방법을 시험해 볼 수 있게 됐다."),
          right:encounterChoice("아이에게도 최근 잘 된 점을 물어보고 다음 목표 하나를 직접 고르게 한다.",{mood:3,focus:2,trust:4,classTrust:4,classFlow:0},"보호자와 교사뿐 아니라 아이도 자신의 성장 계획에 참여했다.")
        }};
      }
    },
    {
      id:"parent_communicative_followthrough",category:"가정연계",title:"지난 상담에서 정한 약속을 집에서도 이어왔다",familyEvent:true,parentTrait:"communicative",
      score:function(s){return familyEventScore(s,"communicative",.36)},
      build:function(s){
        return {text:"며칠 전 학교에서 이야기한 생활 습관을 "+s.name+"의 보호자가 집에서도 함께 해봤다며 결과를 알려왔다. 잘 된 점과 어려운 점을 비교적 솔직하게 적어 보냈다.",dialogue:'보호자 메시지 · “해보니까 이 부분은 잘 됐고, 이건 아직 어렵네요. 학교에서는 어떨까요?”',choices:{
          up:encounterChoice("효과가 있었던 약속은 당분간 학교와 가정에서 같은 기준으로 유지하자고 한다.",{focus:2,classStability:4,classTrust:4},"일관된 기준이 만들어졌다."),
          down:encounterChoice("잘 안 된 부분도 충분히 자연스러운 과정이라고 말하고 보호자의 부담도 줄여 준다.",{mood:2,trust:4,classTrust:5,classFlow:-1},"가정 연계가 평가받는 느낌보다 협력에 가까워졌다."),
          left:encounterChoice("잘 된 조건과 어려웠던 조건을 비교해 다음 시도 방법을 한 단계 조정한다.",{focus:3,learning:1,trust:4,classTrust:5,classFlow:-2},"막연한 조언보다 다음 시도가 구체적으로 정리됐다."),
          right:encounterChoice("다음 주에는 아이가 직접 선택한 목표 하나만 집과 학교에서 확인해 보기로 한다.",{focus:2,mood:2,trust:4,classTrust:4},"가정 연계의 중심을 아이에게 조금 더 돌렸다.")
        }};
      }
    },
    {
      id:"parent_anxious_message_barrage",category:"가정연계",title:"작은 일 뒤 확인 연락이 계속 온다",familyEvent:true,parentTrait:"anxious",
      score:function(s){return familyEventScore(s,"anxious",.48)},
      build:function(s){
        return {text:"오늘 "+s.name+"에게 있었던 작은 일에 대해 보호자의 메시지가 연달아 들어왔다. 다친 곳은 없는지, 친구가 일부러 그런 건지, 내일도 같은 일이 생길지 여러 번 확인한다.",dialogue:'보호자 메시지 · “정말 괜찮은 거 맞죠? 혹시 또 그러면 바로 연락 주실 수 있나요?”',choices:{
          up:encounterChoice("확인된 사실과 학교에서 연락드리는 기준을 짧고 분명하게 정리해 전달한다.",{classStability:4,classTrust:2,classFlow:1},"연락의 기준과 사실 관계가 선명해졌다."),
          down:encounterChoice("걱정되는 마음을 인정한 뒤 지금 확인된 아이 상태를 차분하게 설명한다.",{trust:3,classTrust:5,classFlow:-2},"보호자의 불안이 조금 낮아졌다."),
          left:encounterChoice("비슷한 일이 생기면 학교가 어떤 순서로 확인하고 안내하는지 구체적으로 알려준다.",{classStability:3,classTrust:5,classFlow:-2},"무엇이 일어날지 알 수 있게 되면서 불확실성이 줄었다."),
          right:encounterChoice("오늘은 아이가 집에서 직접 말해볼 부분과 교사가 전달할 부분을 나눠 보자고 제안한다.",{trust:3,classTrust:3,mood:2,classFlow:0},"아이의 설명 기회와 교사의 안내 범위를 나눴다.")
        }};
      }
    },
    {
      id:"parent_overprotective_exemption",category:"가정연계",title:"힘들어할까 봐 활동에서 빼 달라고 한다",familyEvent:true,parentTrait:"overprotective",
      score:function(s){return familyEventScore(s,"overprotective",.45)},
      build:function(s){
        return {text:s.name+"의 보호자가 발표나 모둠 활동에서 아이가 긴장할 것 같다며 이번에는 아예 참여하지 않게 해달라고 요청했다. "+s.name+"은(는) 아직 자기 의견을 말하지 않았다.",dialogue:'보호자 메시지 · “애가 힘들어하니까 그냥 이번 활동은 빼 주세요.”',choices:{
          up:encounterChoice("모든 참여를 없애기보다 교육활동의 기본 참여 원칙은 유지하겠다고 설명한다.",{focus:2,classStability:4,classTrust:1},"참여의 기준은 지켰지만 부담을 줄일 방법은 더 필요하다."),
          down:encounterChoice("보호자가 걱정하는 장면을 듣고 아이에게도 실제로 무엇이 어려운지 따로 확인한다.",{mood:3,trust:5,classTrust:4,classFlow:-3},"보호자의 걱정과 아이의 실제 어려움을 구분해 볼 수 있었다."),
          left:encounterChoice("완전 제외 대신 짧은 발표·친구와 함께하기처럼 단계적으로 참여할 방법을 제안한다.",{focus:3,mood:2,trust:4,classTrust:5,classFlow:-2},"도전은 남기면서 부담을 조절하는 방법을 만들었다."),
          right:encounterChoice("참여 방식 몇 가지 중 아이가 직접 고르게 하고 보호자에게 그 선택을 존중해 달라고 한다.",{mood:4,trust:5,classTrust:4,classFlow:-1},"보호자의 보호와 아이의 선택권 사이에 균형을 만들었다.")
        }};
      }
    },
    {
      id:"parent_child_first_blame",category:"가정연계",title:"‘우리 아이가 그럴 리 없다’며 상대 아이만 탓한다",familyEvent:true,parentTrait:"child_first",
      score:function(s){return familyEventScore(s,"child_first",.52)},
      build:function(s){
        return {text:"친구 갈등을 안내하자 "+s.name+"의 보호자가 자기 아이의 설명은 전부 맞다며 상대 학생만 지도해 달라고 강하게 말한다. 학교에서 확인한 내용에는 두 학생의 행동이 모두 포함돼 있다.",dialogue:'보호자 메시지 · “우리 애는 먼저 그런 애가 아니에요. 상대 아이부터 제대로 지도해 주세요.”',choices:{
          up:encounterChoice("확인된 사실과 같은 기준을 양쪽 학생에게 적용한다는 원칙을 분명하게 설명한다.",{classStability:6,classTrust:2,classFlow:-1},"교사의 판단 기준을 개인 요구와 분리해 지켰다."),
          down:encounterChoice("보호자가 속상한 이유는 듣되 아이가 말하지 않은 장면도 있을 수 있음을 차분히 설명한다.",{trust:2,classTrust:4,classFlow:-3},"감정은 듣되 한쪽 이야기만으로 결론 내리지는 않았다."),
          left:encounterChoice("학교에서 확인한 행동을 시간 순서대로 정리해 어떤 부분을 각각 지도할지 설명한다.",{classStability:4,classTrust:5,classFlow:-3},"누구 편을 드는 대신 구체적인 행동을 중심으로 대화했다."),
          right:encounterChoice("아이에게도 자기 행동 중 다시 생각할 부분을 직접 말하게 하고 보호자가 들어보게 한다.",{mood:1,trust:4,classTrust:3,classFlow:-2},"아이 스스로 자기 몫을 설명할 기회를 만들었다.")
        }};
      }
    },
    {
      id:"parent_achievement_pressure_score",category:"가정연계",title:"한 문제 틀린 것까지 이유를 묻는다",familyEvent:true,parentTrait:"achievement_pressure",
      score:function(s){return familyEventScore(s,"achievement_pressure",.48)},
      build:function(s){
        return {text:s.name+"의 보호자가 평가 결과를 본 뒤 틀린 문제 하나하나의 이유와 반 석차를 묻는다. "+s.name+"은(는) 옆에서 결과표를 계속 접었다 폈다 한다.",dialogue:'보호자 메시지 · “이 정도는 원래 맞아야 하는데 왜 틀렸는지 정확히 알고 싶습니다.”',choices:{
          up:encounterChoice("평가는 정해진 기준으로 안내하되 다른 학생과의 비교 자료는 제공하지 않는다고 분명히 한다.",{classStability:4,trust:1,classTrust:3},"평가의 기준과 비교의 선을 분명하게 지켰다."),
          down:encounterChoice("아이에게 결과를 어떻게 받아들였는지 먼저 묻고 노력 과정도 보호자에게 함께 전달한다.",{mood:5,trust:6,classTrust:4,classFlow:-2},"점수만 보던 대화에 아이의 경험이 들어왔다."),
          left:encounterChoice("틀린 문제를 ‘못한 결과’가 아니라 다음 학습 목표로 바꿔 구체적인 보완 방법을 제시한다.",{learning:3,focus:3,trust:4,classTrust:5,classFlow:-2},"성취 압박을 다음 학습 계획으로 전환했다."),
          right:encounterChoice("다음 목표를 아이가 직접 하나 정하고 보호자는 그 목표를 지원해 달라고 제안한다.",{mood:3,focus:2,trust:5,classTrust:3},"성적 관리의 주체를 조금 더 아이에게 돌렸다.")
        }};
      }
    },
    {
      id:"parent_permissive_excuse",category:"가정연계",title:"‘아이가 싫다니까 안 해도 되죠?’라고 한다",familyEvent:true,parentTrait:"permissive",
      score:function(s){return familyEventScore(s,"permissive",.42)},
      build:function(s){
        return {text:"반복해서 빠지는 준비나 과제에 대해 이야기하자 "+s.name+"의 보호자가 아이가 싫어하는 일은 억지로 시키고 싶지 않다고 답했다.",dialogue:'보호자 메시지 · “싫다는데 꼭 해야 하나요? 스트레스 받게 하고 싶진 않아요.”',choices:{
          up:encounterChoice("아이의 감정과 별개로 학교생활에서 맡아야 할 기본 책임은 있다고 설명한다.",{classStability:5,classTrust:2,focus:2},"싫은 감정과 해야 할 책임을 구분했다."),
          down:encounterChoice("싫어하는 이유를 함께 살펴보되 모든 불편함을 없애 주는 것이 해결은 아님을 이야기한다.",{mood:2,trust:4,classTrust:4,classFlow:-2},"감정을 인정하면서도 회피만 남지 않게 했다."),
          left:encounterChoice("해야 할 일을 작은 단계로 줄이고 가정에서 도울 수 있는 최소한의 방법을 제안한다.",{focus:4,trust:3,classTrust:5,classFlow:-2},"책임을 없애기보다 성공 가능한 크기로 조정했다."),
          right:encounterChoice("해야 할 범위 안에서 순서와 방법은 아이가 고르게 해보자고 제안한다.",{focus:3,mood:2,trust:4,classTrust:4},"선택권과 책임을 함께 남겼다.")
        }};
      }
    },
    {
      id:"parent_disengaged_no_response",category:"가정연계",title:"여러 번 연락해도 답이 오지 않는다",familyEvent:true,parentTrait:"disengaged",
      score:function(s){return familyEventScore(s,"disengaged",.44)},
      build:function(s){
        return {text:s.name+"의 준비와 생활에 확인할 일이 있어 며칠째 연락했지만 답이 없다. 안내장도 계속 돌아오지 않고 "+s.name+"은(는) ‘잘 모르겠다’고만 한다.",dialogue:s.name+' “집에서는 그냥 바빠서 못 봤나 봐요.”',choices:{
          up:encounterChoice("필요한 학교 절차와 제출 기한은 학생에게도 다시 분명하게 안내한다.",{focus:2,classStability:4,trust:0},"가정 연락이 닿지 않아도 학교 안에서 해야 할 일은 정리됐다."),
          down:encounterChoice("아이에게 책임을 돌리지 않고 집에서 연락을 확인하기 어려운 상황이 있는지 조심스럽게 묻는다.",{mood:3,trust:6,classFlow:-2},"아이에게 부담을 얹지 않으면서 상황을 조금 더 파악했다."),
          left:encounterChoice("학교 안에서 확인 가능한 지원 방법과 다른 연락 경로를 차례로 점검한다.",{classStability:3,classTrust:3,classFlow:-3},"한 가지 연락 수단만 반복하지 않고 지원 경로를 넓혔다."),
          right:encounterChoice("아이가 직접 할 수 있는 준비와 어른의 확인이 필요한 일을 구분해 준다.",{focus:3,trust:4,classFlow:-1},"가정의 몫까지 아이가 떠안지 않도록 책임을 나눴다.")
        }};
      }
    },
    {
      id:"parent_inconsistent_rule",category:"가정연계",title:"어제 합의한 약속이 오늘 다시 바뀌었다",familyEvent:true,parentTrait:"inconsistent",
      score:function(s){return familyEventScore(s,"inconsistent",.38)},
      build:function(s){
        return {text:"학교와 가정이 함께 지키기로 한 약속이 있었는데 오늘 "+s.name+"은(는) 집에서는 이제 하지 않아도 된다고 들었다고 말한다. 보호자도 상황이 달라졌으니 약속을 바꾸자고 연락했다.",dialogue:s.name+' “엄마가 오늘부터는 안 해도 된댔어요.”',choices:{
          up:encounterChoice("바꾸기 전까지는 기존 약속을 유지하고 변경은 어른끼리 먼저 합의하자고 한다.",{classStability:5,trust:1,classTrust:2},"아이 앞에서 기준이 매번 달라지는 일을 줄였다."),
          down:encounterChoice("왜 약속을 바꾸고 싶어졌는지 보호자의 상황과 아이의 반응을 먼저 듣는다.",{mood:2,trust:4,classTrust:4,classFlow:-2},"변경 이유를 알고 필요한 조정인지 확인했다."),
          left:encounterChoice("꼭 유지할 한 가지와 조정 가능한 한 가지를 나눠 새 약속을 다시 적는다.",{focus:3,classStability:4,classTrust:5,classFlow:-2},"기준을 전부 뒤집지 않고 핵심을 남겼다."),
          right:encounterChoice("어른들이 정한 범위 안에서 아이가 지킬 방법 하나를 직접 고르게 한다.",{focus:3,trust:4,classTrust:3},"변하는 환경 속에서도 아이가 자기 기준을 하나 가질 수 있게 했다.")
        }};
      }
    },
    {
      id:"parent_image_using_showcase",category:"가정연계",title:"아이의 성과를 보여주는 일을 더 중요하게 여긴다",familyEvent:true,parentTrait:"image_using",
      score:function(s){return familyEventScore(s,"image_using",.40)},
      build:function(s){
        return {text:s.name+"의 보호자가 대회·대표 발표·촬영 같은 눈에 띄는 활동에 아이를 꼭 넣어 달라고 요청했다. 정작 "+s.name+"은(는) 그 활동 이야기가 나오자 표정이 굳는다.",dialogue:'보호자 메시지 · “기회가 있으면 무조건 시켜 주세요. 이런 경험이 다 아이에게 남는 거잖아요.”',choices:{
          up:encounterChoice("학교 활동은 아이의 준비도와 교육적 기준에 따라 참여를 정한다고 설명한다.",{classStability:5,classTrust:2,trust:2},"보여지는 성과보다 학교의 참여 기준을 지켰다."),
          down:encounterChoice("보호자의 기대는 듣되 아이가 이 활동을 어떻게 느끼는지도 함께 확인한다.",{mood:4,trust:6,classTrust:4,classFlow:-2},"어른의 기대 뒤에 가려진 아이의 마음을 대화에 넣었다."),
          left:encounterChoice("현재 아이에게 맞는 도전 수준과 준비해야 할 것을 구체적으로 설명한다.",{focus:3,trust:4,classTrust:5,classFlow:-2},"막연한 ‘기회’보다 아이에게 필요한 준비를 중심으로 이야기했다."),
          right:encounterChoice("참여 여부를 아이가 충분히 듣고 직접 의사를 말할 수 있게 한다.",{mood:4,trust:6,classTrust:3,classFlow:-1},"성과를 위해 아이의 의사를 대신 결정하지 않게 했다.")
        }};
      }
    },
    {
      id:"parent_school_distrust_demand",category:"가정연계",title:"설명보다 먼저 학교가 잘못했다고 단정한다",familyEvent:true,parentTrait:"school_distrust",
      score:function(s){return familyEventScore(s,"school_distrust",.46)},
      build:function(s){
        return {text:"생활지도 내용을 안내하자 "+s.name+"의 보호자가 상황 설명을 끝까지 듣기 전에 교사가 아이를 오해했다고 말한다. 모든 과정을 다시 증명해 달라는 요구가 이어진다.",dialogue:'보호자 메시지 · “선생님이 먼저 잘못 본 건 아닌지부터 확인해 주세요.”',choices:{
          up:encounterChoice("확인된 사실, 아직 확인되지 않은 부분, 학교가 한 조치를 구분해 차분히 전달한다.",{classStability:5,classTrust:3,classFlow:-1},"감정적인 공방 대신 확인된 사실의 선을 세웠다."),
          down:encounterChoice("왜 학교 설명을 믿기 어려운지 먼저 듣되 확인되지 않은 주장은 사실처럼 받아들이지 않는다.",{trust:2,classTrust:4,classFlow:-3},"불신의 이유는 들으면서 사실 판단은 분리했다."),
          left:encounterChoice("기록과 관찰 내용을 시간 순서로 정리해 함께 확인할 수 있게 한다.",{classStability:4,classTrust:5,classFlow:-3},"누가 맞느냐보다 무엇을 확인했는지 중심으로 대화했다."),
          right:encounterChoice("추가로 확인이 필요한 지점을 보호자에게 하나씩 제안받아 가능한 범위를 정한다.",{classTrust:4,classStability:3,classFlow:-2},"끝없는 의심이 아니라 확인 가능한 질문으로 범위를 좁혔다.")
        }};
      }
    },
    {
      id:"parent_neglect_basic_care",category:"학생보호",title:"생활 돌봄이 반복해서 비는 신호가 보인다",familyEvent:true,parentTrait:"neglect_risk",safeguarding:true,noFollowUp:true,
      score:function(s){return familyEventScore(s,"neglect_risk",.34)},
      build:function(s){
        return {text:s.name+"에게 준비·식사·건강 관리가 비는 일이 여러 날 반복되고 있다. 한 번의 실수라기보다 아이가 혼자 감당하는 부분이 많아 보인다. 지금은 원인을 단정하기보다 지원과 안전 확인이 필요해 보인다.",dialogue:s.name+' “집에서는 제가 알아서 챙겨야 해요. 가끔은 그냥 못 챙겨요.”',choices:{
          up:encounterChoice("반복된 사실을 날짜와 상황 중심으로 기록하고 학교의 학생 지원·보호 담당자와 공유한다.",{trust:4,classStability:5,classTrust:4},"추측 대신 반복된 사실을 기록해 학교 안의 지원 체계로 연결했다."),
          down:encounterChoice("아이에게 책임을 묻지 않고 생활에서 가장 힘든 부분이 무엇인지 안전하게 듣는다.",{mood:6,trust:7,classFlow:-3},"아이 혼자 감당하던 어려움을 말할 수 있는 공간을 만들었다."),
          left:encounterChoice("학교에서 바로 도울 수 있는 식사·준비·상담 지원을 확인하고 필요한 연결을 요청한다.",{mood:3,trust:6,classStability:5,classFlow:-4},"아이의 일상에 실제 도움이 닿을 수 있는 경로를 찾았다."),
          right:encounterChoice("아이가 학교에서 도움받기 편한 어른과 방법을 직접 고르게 하되 보호 절차는 어른들이 책임진다.",{mood:4,trust:7,classStability:4,classFlow:-2},"아이에게 선택권을 주면서도 보호 책임을 아이에게 넘기지는 않았다.")
        }};
      }
    },
    {
      id:"parent_harm_fear_home",category:"학생보호",title:"집에 알려지는 것을 유난히 두려워한다",familyEvent:true,parentTrait:"harm_risk",safeguarding:true,noFollowUp:true,
      score:function(s){return familyEventScore(s,"harm_risk",.30)},
      build:function(s){
        return {text:"작은 실수를 안내하려 하자 "+s.name+"이(가) 갑자기 보호자에게는 절대 말하지 말아 달라며 심하게 긴장한다. 집에서 큰 위협이나 과도한 처벌을 받을까 두렵다는 말도 조심스럽게 꺼냈다. 교사가 혼자 판단하기보다 즉시 안전을 확인해야 하는 상황이다.",dialogue:s.name+' “집에는 말하지 마세요… 알면 진짜 무서워요.”',choices:{
          up:encounterChoice("아이 앞에서 보호자에게 바로 따지지 않고, 들은 말과 관찰 사실을 정확히 기록해 학교의 보호 절차에 즉시 연결한다.",{trust:7,classStability:6,classTrust:4},"아이의 말을 가볍게 넘기지 않고 학교의 보호 체계 안에서 다루기 시작했다."),
          down:encounterChoice("유도해서 캐묻지 않고 아이가 말하고 싶은 만큼만 듣고, 도움을 요청한 것은 잘한 일이라고 알려준다.",{mood:7,trust:8,classFlow:-4},"아이가 더 말하도록 압박하지 않으면서 안전하게 도움을 요청할 수 있게 했다."),
          left:encounterChoice("혼자 해결하려 하지 않고 학생보호 담당자와 즉시 상의해 다음 안전 조치를 함께 정한다.",{trust:6,classStability:7,classTrust:5,classFlow:-4},"교사 개인의 판단에 머물지 않고 학교의 보호 체계로 넘겼다."),
          right:encounterChoice("보호 절차는 어른들이 진행하되 아이가 지금 함께 있고 싶은 믿을 만한 어른이나 장소를 고르게 한다.",{mood:6,trust:8,classStability:5,classFlow:-3},"아이에게 보호 책임을 떠넘기지 않으면서 당장의 안전감에 선택권을 줬다.")
        }};
      }
    }
  ]);

  var STORY_ARCS={
    friendship_triangle:{
      label:"셋이었던 친구들",steps:3,
      score:function(s){return s.soc>.54&&s.rejection>.40?.28+s.soc*.20+s.rejection*.20:0},
      setup:function(s){
        var peers=students.filter(function(o){return o!==s}).sort(function(a,b){return relation(s,b).affinity-relation(s,a).affinity});
        return {peerA:peers[0]?peers[0].id:null,peerB:peers[1]?peers[1].id:null};
      },
      start:function(st,s){
        var a=studentById(st.data.peerA),b=studentById(st.data.peerB);if(!a||!b)return null;
        return {title:"늘 셋이 다녔는데 오늘은 한 명이 빠져 있다",text:s.name+"·"+a.name+"·"+b.name+"은(는) 평소 셋이 함께 다녔다. 그런데 요즘 "+s.name+"과(와) "+a.name+"이(가) 둘이 먼저 움직이고, "+b.name+"은(는) 뒤에서 눈치를 보는 일이 늘었다.",dialogue:b.name+' “요즘 둘이 나 빼고 다니는 것 같아.”',choices:{
          up:encounterChoice("누군가를 일부러 빼는 행동은 안 된다는 학급의 선을 분명히 한다.",{relation:2,classStability:5,trust:1},"세 학생 모두 교사가 이 관계를 보고 있다는 것을 알게 됐다."),
          down:encounterChoice("셋을 한꺼번에 결론내리지 않고 각각 어떤 마음인지 따로 들어본다.",{mood:4,relation:4,trust:5,classFlow:-3},"겉으로 보이지 않던 서운함과 부담이 조금씩 드러났다."),
          left:encounterChoice("같이 놀고 싶을 때, 둘만 있고 싶을 때 쓸 말을 세 학생과 연습한다.",{relation:5,trust:3,classFlow:-3},"친구 관계에서도 거절과 초대에 방법이 필요하다는 걸 연습했다."),
          right:encounterChoice("셋이 항상 붙어 있어야 하는 건 아니라고 하고 각자 원하는 관계를 선택하게 한다.",{mood:2,relation:1,trust:4,classFlow:1},"관계를 강제로 묶지 않고 각자의 선택을 열어 두었다.")
        }};
      },
      middle:function(st,s,branch){
        var a=studentById(st.data.peerA),b=studentById(st.data.peerB);if(!a||!b)return null;
        var variants={
          up:{title:"같이 있기는 하는데 말이 거의 없다",text:"규칙을 확인한 뒤 셋은 다시 함께 움직인다. 하지만 "+b.name+"이(가) 오면 "+s.name+"과(와) "+a.name+"의 대화가 뚝 끊긴다.",dialogue:b.name+' “같이 있긴 한데… 더 어색해졌어요.”'},
          down:{title:"둘만 놀고 싶은 마음도 있었다",text:"따로 이야기를 듣던 중 "+a.name+"이(가) "+b.name+"을(를) 싫어하는 건 아니지만 가끔은 "+s.name+"과(와) 둘만 놀고 싶었다고 털어놓는다.",dialogue:a.name+' “셋이 꼭 맨날 같이 있어야 해요?”'},
          left:{title:"배운 말은 썼지만 서운함은 남았다",text:s.name+"이(가) "+b.name+"에게 오늘은 둘이 놀고 싶다고 배운 표현으로 말했다. 말투는 부드러웠지만 "+b.name+"은(는) 혼자 남아 눈물이 고였다.",dialogue:b.name+' “예쁘게 말해도… 나만 혼자인 건 똑같잖아.”'},
          right:{title:"각자 움직이자 새로운 관계가 생겼다",text:"셋을 억지로 묶지 않자 "+b.name+"은(는) 다른 친구와 놀기 시작했다. 그런데 이번에는 "+s.name+"이(가) 그 모습을 계속 신경 쓴다.",dialogue:s.name+' “쟤는 이제 우리랑 안 노는 거예요?”'}
        };
        var v=variants[branch]||variants.down;
        return {title:v.title,text:v.text,dialogue:v.dialogue,choices:{
          up:encounterChoice("상대가 싫어할 행동과 말의 선을 다시 분명하게 확인한다.",{relation:2,classStability:4,trust:1},"관계를 강요하지 않되 상처 주는 행동의 선은 다시 세웠다."),
          down:encounterChoice("지금 가장 서운한 사람이 누구인지부터 충분히 말하게 한다.",{mood:5,relation:4,trust:5,classFlow:-3},"관계의 모양보다 각자의 감정을 먼저 다뤘다."),
          left:encounterChoice("셋이 함께할 때와 따로 놀 때의 약속을 구체적으로 정해 보게 한다.",{relation:5,focus:2,trust:3,classFlow:-3},"상황별로 사용할 관계 규칙이 조금 더 구체화됐다."),
          right:encounterChoice("친구를 소유할 수는 없다는 점을 짚고 각자가 다음 행동을 고르게 한다.",{mood:2,relation:3,trust:4,classFlow:0},"친구의 선택을 받아들이는 책임을 각자에게 돌렸다.")
        }};
      },
      final:function(st,s){
        var a=studentById(st.data.peerA),b=studentById(st.data.peerB);if(!a||!b)return null;
        return {title:"모둠을 정하는 날, 세 아이가 다시 마주쳤다",text:"며칠 뒤 모둠 활동에서 세 학생이 다시 같은 선택 앞에 섰다. 예전처럼 자동으로 셋이 모이지는 않았지만 서로 눈치를 보기보다 말을 꺼내기 시작한다.",dialogue:s.name+' “이번에는 우리 어떻게 할까?”',choices:{
          up:encounterChoice("모둠 기준을 모두에게 똑같이 적용하고 그 안에서 정하게 한다.",{relation:3,classStability:5,trust:2},"세 학생의 관계와 별개로 학급의 기준 속에서 모둠이 정해졌다."),
          down:encounterChoice("세 학생에게 지금 서로에게 바라는 것을 한 문장씩 말하게 한다.",{mood:4,relation:6,trust:5,classFlow:-3},"친구 관계가 ‘같이 있느냐’보다 서로의 마음을 말하는 쪽으로 바뀌었다."),
          left:encounterChoice("지난 며칠 동안 잘됐던 말과 어려웠던 말을 되짚고 이번 모둠에 적용하게 한다.",{relation:6,focus:2,trust:4,classFlow:-3},"앞선 사건들이 한 번의 훈계가 아니라 관계 기술로 이어졌다."),
          right:encounterChoice("누구와 할지는 각자가 고르되 상대의 선택도 받아들이기로 한다.",{mood:3,relation:4,trust:5,classFlow:0},"셋은 꼭 같은 모양의 친구 관계가 아니어도 된다는 경험을 남겼다.")
        }};
      }
    },
    perfection_pressure:{
      label:"틀리면 안 되는 아이",steps:3,
      score:function(s){return hasTrait(s,"perfectionist")||hasParentTrait(s,"achievement_pressure")?.62:0},
      setup:function(s){return {};},
      start:function(st,s){
        return {title:"한 문제를 틀리자 활동지를 구겨 버렸다",text:s.name+"은(는) 거의 모든 문제를 맞혔지만 마지막 한 문제를 틀렸다. 친구들은 이미 다음 활동으로 넘어갔는데 "+s.name+"은(는) 틀린 답만 바라보다 종이를 구긴다.",dialogue:s.name+' “이런 것도 틀리면 안 되는데…”',choices:{
          up:encounterChoice("틀렸더라도 종이를 구기는 행동은 멈추고 수정해야 한다고 한다.",{focus:3,mood:-2,classStability:4},"행동은 바로 멈췄지만 틀린 것에 대한 두려움은 남았다."),
          down:encounterChoice("한 문제 틀린 것이 왜 이렇게 힘든지 조용히 묻는다.",{mood:6,trust:6,classFlow:-3},"성적보다 틀렸을 때 느끼는 감정을 먼저 들여다봤다."),
          left:encounterChoice("오답을 ‘틀린 것’이 아니라 다시 볼 표시로 바꾸는 수정 방법을 알려준다.",{learning:3,focus:4,trust:3,classFlow:-2},"실수를 처리하는 구체적인 방법을 하나 만들었다."),
          right:encounterChoice("지금 고칠지 나중에 다시 볼지 스스로 정하게 한다.",{mood:3,trust:4,focus:2},"실수 뒤의 다음 행동을 자신이 선택하게 했다.")
        }};
      },
      middle:function(st,s,branch){
        var variants={
          up:{title:"틀린 답을 지우개로 흔적도 없이 지운다",text:s.name+"은(는) 요즘 답이 틀리면 교사가 보기 전에 몇 번이고 지운다. 맞힌 문제보다 틀린 흔적을 감추는 데 더 신경을 쓴다.",dialogue:s.name+' “틀린 거 남아 있으면 보기 싫어요.”'},
          down:{title:"집에서 점수를 확인하는 시간이 무섭다고 했다",text:"대화를 이어가던 중 "+s.name+"은(는) 평가지를 집에 가져가는 날이면 긴장된다고 말했다. 보호자가 틀린 문제를 오래 확인하는 편이라고 한다.",dialogue:s.name+' “집에 가면 왜 틀렸는지 다 물어봐요.”'},
          left:{title:"수정 방법은 잘 쓰지만 매번 확인받으려 한다",text:"오답 수정 순서는 익혔지만 "+s.name+"은(는) 한 문제를 고칠 때마다 교사를 불러 맞게 하고 있는지 확인받으려 한다.",dialogue:s.name+' “이렇게 고치면 진짜 맞죠?”'},
          right:{title:"자기 목표를 낮췄다가 집에서 다시 높여 왔다",text:s.name+"은(는) 스스로 현실적인 목표를 정했지만 다음 날에는 보호자와 이야기한 뒤 목표를 다시 훨씬 높여 적어 왔다.",dialogue:s.name+' “집에서는 이 정도는 해야 한대요.”'}
        };
        var v=variants[branch]||variants.down;
        return {title:v.title,text:v.text,dialogue:v.dialogue,choices:{
          up:encounterChoice("학교에서는 실수와 수정이 자연스러운 학습 과정이라는 기준을 계속 유지한다.",{focus:2,classStability:3,trust:2},"교실 안에서는 결과만으로 평가받지 않는 기준을 지켰다."),
          down:encounterChoice("아이에게 잘해야 인정받는 것처럼 느껴지는 순간이 있는지 더 듣는다.",{mood:6,trust:7,classFlow:-3},"성취 뒤에 있던 긴장과 기대를 말로 꺼낼 수 있었다."),
          left:encounterChoice("스스로 확인할 체크 기준을 만들어 교사 확인 횟수를 조금씩 줄인다.",{learning:2,focus:5,trust:4,classFlow:-2},"완벽함 대신 자기 점검 방법을 배우기 시작했다."),
          right:encounterChoice("다음 목표를 아이가 정하고 그 이유도 스스로 설명할 수 있게 한다.",{mood:3,focus:3,trust:5,classFlow:-1},"목표의 주인이 누구인지 다시 아이에게 돌렸다.")
        }};
      },
      final:function(st,s){
        return {title:"평가지를 집에 가져가는 날이 다시 왔다",text:s.name+"은(는) 오늘 결과가 완벽하지 않다는 걸 알고 있다. 예전처럼 종이를 숨기지는 않지만 한참 동안 가방에 넣지 못하고 교사 주변을 맴돈다.",dialogue:s.name+' “이번에는 그냥 보여드려도 될까요?”',choices:{
          up:encounterChoice("평가 결과와 별개로 정직하게 보여주고 필요한 수정은 해 오면 된다고 기준을 잡아준다.",{focus:3,trust:4,classStability:3},"완벽한 점수보다 결과를 그대로 받아들이는 기준이 남았다."),
          down:encounterChoice("걱정되는 마음을 듣고 학교에서 본 노력과 변화를 아이에게 다시 말해준다.",{mood:6,trust:7,classFlow:-2},"점수보다 자신이 달라진 점을 먼저 떠올릴 수 있었다."),
          left:encounterChoice("평가지에 ‘이번에 배운 것·다음에 해볼 것’을 직접 적어 가져가게 한다.",{learning:3,focus:4,trust:5,classFlow:-2},"평가지를 실패표가 아니라 다음 학습 기록으로 바꿨다."),
          right:encounterChoice("결과를 어떻게 설명할지 아이가 자기 말로 정리해 보게 한다.",{mood:3,focus:3,trust:6},"어른의 기대 속에서도 자기 결과를 자기 말로 설명하는 경험을 남겼다.")
        }};
      }
    },
    leader_power:{
      label:"반장이 된 뒤 달라진 아이",steps:3,
      score:function(s){return hasTrait(s,"leadership")&&hasTrait(s,"competitive")?.58:0},
      setup:function(s){var p=chooseSocialTarget(s,"SOCIAL");return {peer:p?p.id:null};},
      start:function(st,s){
        var p=studentById(st.data.peer);
        return {title:"앞장서던 아이가 친구들에게 명령하기 시작했다",text:s.name+"은(는) 모둠을 이끄는 역할을 맡은 뒤부터 친구들의 순서와 방법까지 빠르게 정한다. "+(p?p.name+"이(가) 의견을 내려고 했지만 말이 끊겼다.":"다른 친구들은 점점 말이 줄었다."),dialogue:s.name+' “그냥 내가 말한 대로 하면 빨리 끝나잖아.”',choices:{
          up:encounterChoice("리더도 친구에게 명령할 권리는 없다는 선을 바로 분명히 한다.",{relation:2,classStability:5,trust:-1},"역할과 권력의 경계가 분명해졌다."),
          down:encounterChoice("왜 모든 걸 직접 정하려는지 부담과 마음을 먼저 묻는다.",{mood:3,trust:5,relation:2,classFlow:-3},"이기고 잘해내야 한다는 부담이 조금 드러났다."),
          left:encounterChoice("리더의 역할은 지시보다 의견을 묻고 정리하는 것이라고 연습시킨다.",{relation:5,focus:3,trust:3,classFlow:-3},"주도성을 협력 기술로 바꿔 보는 연습이 시작됐다."),
          right:encounterChoice("친구들이 받아들일 리더의 권한을 모둠이 직접 정하게 한다.",{relation:4,trust:4,classFlow:-1},"리더의 힘을 모둠 안의 합의로 제한하게 했다.")
        }};
      },
      middle:function(st,s,branch){
        var p=studentById(st.data.peer),pn=p?p.name:"친구";
        var variants={
          up:{title:"명령은 줄었지만 아무 결정도 하지 않으려 한다",text:s.name+"은(는) 교사의 말을 의식한 뒤부터 친구 의견에 거의 개입하지 않는다. 이번에는 "+pn+"이(가) ‘왜 아무 말도 안 하냐’며 답답해한다.",dialogue:s.name+' “말하면 또 제가 시키는 거라고 할 거잖아요.”'},
          down:{title:"‘제가 못하면 우리 팀이 져요’라고 털어놨다",text:s.name+"은(는) 친구를 무시하려던 게 아니라 결과가 나빠질까 불안해서 전부 통제했다고 말한다.",dialogue:s.name+' “제가 안 챙기면 우리 팀이 질 것 같아요.”'},
          left:{title:"의견은 묻지만 마음에 안 들면 다시 가져온다",text:s.name+"은(는) 이제 친구들에게 의견을 묻는다. 하지만 시간이 촉박해지면 결국 ‘그냥 내가 할게’라며 다시 일을 가져온다.",dialogue:s.name+' “물어봤는데 너무 느려서요.”'},
          right:{title:"모둠이 만든 규칙을 두고 또 다툰다",text:"친구들과 권한을 정했지만 실제 활동에서 해석이 달라졌다. "+s.name+"과(와) "+pn+"이(가) 서로 ‘그건 네 역할이 아니다’라고 맞선다.",dialogue:s.name+' “우리 규칙대로면 제가 정하는 거 맞아요.”'}
        };
        var v=variants[branch]||variants.left;
        return {title:v.title,text:v.text,dialogue:v.dialogue,choices:{
          up:encounterChoice("리더에게 필요한 최소 책임과 넘지 말아야 할 선을 다시 구분한다.",{relation:2,classStability:4,focus:2},"해야 할 일과 하지 말아야 할 일이 조금 더 선명해졌다."),
          down:encounterChoice("잘해야 한다는 부담과 친구들이 느끼는 답답함을 함께 보게 한다.",{mood:3,relation:5,trust:5,classFlow:-3},"성과와 관계를 동시에 볼 수 있게 했다."),
          left:encounterChoice("묻기-기다리기-정리하기 세 단계로 리더 행동을 다시 연습한다.",{relation:6,focus:4,trust:3,classFlow:-3},"리더십을 실제 행동 순서로 익혔다."),
          right:encounterChoice("이번 활동에서 무엇을 직접 하고 무엇을 맡길지 스스로 정하게 한다.",{relation:3,focus:3,trust:4,classFlow:0},"통제와 방임 사이에서 역할을 스스로 조절하게 했다.")
        }};
      },
      final:function(st,s){
        return {title:"학급 공동 프로젝트의 책임자가 필요하다",text:"며칠 뒤 반 전체가 함께 만드는 활동에서 다시 책임자가 필요해졌다. 친구 몇 명이 "+s.name+"을(를) 바라보지만, 예전처럼 모두가 당연히 맡기려 하지는 않는다.",dialogue:s.name+' “저… 이번에도 제가 해도 돼요?”',choices:{
          up:encounterChoice("책임자의 권한과 역할을 먼저 공개적으로 정한 뒤 맡기기로 한다.",{relation:4,classStability:5,trust:3},"사람보다 역할의 기준이 먼저 세워졌다."),
          down:encounterChoice("친구들이 어떤 점이 좋았고 힘들었는지 먼저 말한 뒤 결정하게 한다.",{relation:6,mood:3,trust:5,classFlow:-3},"리더에 대한 실제 피드백이 관계 속에서 오갔다."),
          left:encounterChoice("이번에는 보조 책임자와 역할을 나눠 협력형 리더십을 연습하게 한다.",{relation:6,focus:4,trust:4,classFlow:-2},"혼자 끌고 가는 방식에서 함께 맡는 방식으로 바뀌었다."),
          right:encounterChoice("맡을지 말지와 어떤 역할을 할지 본인이 친구들 앞에서 제안하게 한다.",{relation:4,mood:3,trust:5},"리더 자리를 얻는 것보다 책임을 설명하는 경험을 남겼다.")
        }};
      }
    },
    missing_items:{
      label:"자꾸 사라지는 준비물",steps:3,
      score:function(s){return s.soc>.40&&s.imp>.35?.26+s.imp*.18+s.mischief*.15:0},
      setup:function(s){var p=chooseSocialTarget(s,"SOCIAL");return {peer:p?p.id:null};},
      start:function(st,s){
        var p=studentById(st.data.peer);if(!p)return null;
        return {title:"며칠째 준비물이 하나씩 사라진다",text:p.name+"이(가) 색연필과 지우개가 자꾸 없어진다고 말한다. 오늘은 "+s.name+"이(가) 그 물건을 만지는 걸 봤다는 친구의 말까지 나오며 주변 시선이 한쪽으로 몰린다.",dialogue:p.name+' “제 거 또 없어졌어요. 이번에도 누가 가져간 것 같아요.”',choices:{
          up:encounterChoice("확인되기 전에는 누구도 범인처럼 지목하지 말고 물건 사용 규칙부터 다시 세운다.",{relation:2,classStability:6,trust:2},"의심이 한 학생에게 몰리는 것은 우선 멈췄다."),
          down:encounterChoice("잃어버린 학생과 의심받는 학생의 이야기를 따로 차분히 듣는다.",{mood:4,relation:4,trust:5,classFlow:-3},"서로 다른 기억과 감정이 조금씩 드러났다."),
          left:encounterChoice("마지막으로 본 때와 빌린 사람을 순서대로 확인하는 방법으로 함께 찾아본다.",{focus:4,relation:3,trust:3,classFlow:-3},"추측 대신 확인 가능한 단서를 따라가기 시작했다."),
          right:encounterChoice("학생들에게 찾는 방법을 제안하게 하되 개인 물건을 함부로 검사하지 않는 선을 정한다.",{focus:3,relation:2,trust:4,classFlow:-1},"학생들도 해결에 참여하되 서로의 경계를 지켰다.")
        }};
      },
      middle:function(st,s,branch){
        var p=studentById(st.data.peer);if(!p)return null;
        var variants={
          up:{title:"규칙은 세웠지만 의심은 사라지지 않았다",text:"물건 사용 규칙을 다시 세운 뒤에도 친구 몇 명은 "+s.name+"의 행동을 계속 유심히 본다. "+s.name+"은(는) 억울하다는 표정으로 혼자 있는 시간이 늘었다.",dialogue:s.name+' “저 아니라고 했는데 아무도 안 믿어요.”'},
          down:{title:"빌렸다가 돌려놓는 걸 깜빡한 적이 있었다",text:"따로 이야기를 듣던 중 "+s.name+"은(는) 예전에 "+p.name+"의 색연필을 말없이 잠깐 쓴 적은 있다고 인정했다. 하지만 오늘 없어진 물건까지 가져간 것은 아니라고 한다.",dialogue:s.name+' “전에 한 번 쓴 건 맞는데 오늘은 아니에요.”'},
          left:{title:"찾는 과정에서 공용 상자에서도 물건이 나왔다",text:"마지막 사용 장소를 따라가 보니 잃어버린 것과 비슷한 준비물 일부가 공용 재료 상자에 섞여 있었다. 누군가 일부러 가져갔다고 단정하기 어려워졌다.",dialogue:p.name+' “어? 이거 제 거랑 똑같은데…”'},
          right:{title:"학생들끼리 찾다가 새로운 지목이 나왔다",text:"학생들이 스스로 단서를 모으는 과정에서 이번에는 다른 친구 이름이 나오기 시작했다. 소문처럼 번질 분위기다.",dialogue:s.name+' “그러면 이번엔 제가 아니라 쟤 아니에요?”'}
        };
        var v=variants[branch]||variants.left;
        return {title:v.title,text:v.text,dialogue:v.dialogue,choices:{
          up:encounterChoice("증거 없이 사람을 지목하지 않는다는 선을 다시 세우고 물건 관리 방식을 정리한다.",{relation:2,classStability:5,trust:2},"사람 찾기보다 교실의 관리 문제로 초점을 옮겼다."),
          down:encounterChoice("억울함과 잃어버린 답답함을 각각 듣고 서로 바로 사과를 강요하지 않는다.",{mood:4,relation:5,trust:5,classFlow:-3},"감정을 인정하면서 사실 확인과 관계 회복을 분리했다."),
          left:encounterChoice("이름 표시·빌림 기록·공용 상자 정리처럼 재발을 줄일 방법을 함께 만든다.",{focus:4,relation:4,classStability:4,classFlow:-3},"누가 그랬는지보다 다시 안 생기게 하는 구조를 만들었다."),
          right:encounterChoice("각자 자기 물건 관리 방법을 정하고 분실 시 먼저 확인할 순서를 선택하게 한다.",{focus:3,trust:4,classStability:3},"학생들의 자기 관리 책임을 높였다.")
        }};
      },
      final:function(st,s){
        var p=studentById(st.data.peer);if(!p)return null;
        return {title:"이번에는 없어진 물건을 바로 찾았다",text:"며칠 뒤 "+p.name+"의 자가 또 보이지 않았다. 하지만 이번에는 누군가를 먼저 지목하기 전에 학생들이 전에 정한 순서대로 확인하기 시작한다. 잠시 뒤 다른 교과서 밑에서 자가 발견됐다.",dialogue:p.name+' “아… 이번엔 여기 있었네.”',choices:{
          up:encounterChoice("이번 일을 계기로 ‘먼저 확인하고 말하기’를 학급의 공통 기준으로 다시 짚는다.",{relation:3,classStability:5,trust:3},"한 번의 사건이 학급 전체의 기준으로 정리됐다."),
          down:encounterChoice("그동안 의심받았던 학생이 어떤 기분이었을지도 함께 돌아보게 한다.",{mood:4,relation:6,trust:5,classFlow:-2},"물건을 찾는 것에서 끝나지 않고 관계에 남은 흔적도 다뤘다."),
          left:encounterChoice("분실물·대여함을 정식으로 만들고 학생들이 관리 방법을 연습하게 한다.",{focus:4,classStability:5,relation:4,classFlow:-2},"반복되는 문제를 교실 시스템으로 해결했다."),
          right:encounterChoice("새 규칙을 계속 쓸지 학생들이 일주일 뒤 스스로 평가하게 한다.",{focus:3,trust:5,classStability:3},"교사가 만든 규칙을 학생들이 직접 점검하는 단계로 넘겼다.")
        }};
      }
    },
    bullying_escalation:{
      label:"장난이라고 했던 일",steps:5,
      score:function(s){return s.mischief>.48&&s.soc>.42?.34+s.mischief*.22+s.imp*.12:0},
      setup:function(s){
        var peers=students.filter(function(o){return o!==s}).sort(function(a,b){return relation(s,b).affinity-relation(s,a).affinity});
        return {target:peers[0]?peers[0].id:null,witness:peers[1]?peers[1].id:null};
      },
      step:function(nodeId){return nodeId==="start"?1:nodeId.indexOf("warning_")===0?2:nodeId.indexOf("pattern_")===0?3:nodeId.indexOf("safety_")===0?4:5},
      next:function(nodeId,dir){
        if(nodeId==="start")return "warning_"+dir;
        if(nodeId.indexOf("warning_")===0)return "pattern_"+dir;
        if(nodeId.indexOf("pattern_")===0)return "safety_"+dir;
        if(nodeId.indexOf("safety_")===0)return "final";
        return null;
      },
      node:function(st,s,nodeId){
        var target=studentById(st.data.target),witness=studentById(st.data.witness);if(!target)return null;
        if(nodeId==="start"){
          return {targetId:target.id,title:"처음에는 다 같이 웃은 장난이었다",text:s.name+"이(가) "+target.name+"에게 별명을 붙이고 물건을 살짝 숨겼다. 주변 친구들이 웃었고 "+target.name+"도 처음에는 따라 웃었지만 표정이 금방 굳었다.",dialogue:s.name+' “장난인데 왜 그래? 다 웃었잖아.”',choices:{
            up:encounterChoice("상대가 싫어하면 장난이 아니라고 바로 멈추고 물건을 돌려주게 한다.",{relation:2,classStability:6,trust:-1},"처음부터 장난의 선을 분명하게 그었다."),
            down:encounterChoice(target.name+"에게 실제로 괜찮았는지 따로 확인하고 "+s.name+"의 이야기도 듣는다.",{mood:3,relation:4,trust:5,classFlow:-3},"웃고 있었다는 것과 괜찮았다는 것이 같은지는 따로 확인했다."),
            left:encounterChoice("별명·물건 숨기기처럼 상대 반응을 이용하는 장난의 경계를 구체적으로 짚어 준다.",{relation:5,classStability:4,trust:3,classFlow:-3},"어떤 행동부터 장난이 상처가 되는지 구체적으로 배웠다."),
            right:encounterChoice("두 학생이 앞으로 허용할 장난과 싫은 장난을 직접 말해 약속하게 한다.",{relation:4,trust:4,classFlow:-1},"학생들이 서로의 선을 말로 정해 보게 했다.")
          }};
        }
        if(nodeId.indexOf("warning_")===0){
          var branch=nodeId.slice(8),v={
            up:{title:"교사 앞에서는 멈췄지만 뒤에서 다시 시작됐다",text:"며칠 뒤 쉬는 시간, "+s.name+"과(와) 몇몇 친구들이 교사가 보이지 않는 곳에서 "+target.name+"의 말투를 따라 하며 웃는다. "+target.name+"은(는) 이번에는 웃지 않는다.",dialogue:target.name+' “선생님 없을 때는 또 그래요.”'},
            down:{title:"‘사실 재미없었어요’라는 말이 나왔다",text:target.name+"이(가) 따로 이야기하면서 처음부터 재미있었던 건 아니지만 분위기를 깨기 싫어 웃었다고 말했다. "+(witness?witness.name+"도 눈치를 봤다고 한다.":""),dialogue:target.name+' “안 웃으면 더 놀릴까 봐 그냥 웃었어요.”'},
            left:{title:"사과는 했지만 친구들이 다시 부추긴다",text:s.name+"은(는) 전에 배운 대로 사과했지만 쉬는 시간에 주변 친구들이 예전 별명을 다시 꺼내며 웃자 곧 다시 따라 웃기 시작했다.",dialogue:s.name+' “제가 먼저 한 건 아닌데요. 애들이 또 말해서…”'},
            right:{title:"서로 정한 선을 친구들이 장난처럼 흔든다",text:"둘이 약속한 뒤에도 주변 친구들이 ‘이 정도는 괜찮지?’ 하며 경계를 시험한다. "+s.name+"은(는) 웃음을 얻으려 다시 한 발 넘어간다.",dialogue:s.name+' “이건 약속에 없었잖아. 이것도 안 돼?”'}
          }[branch];
          return {targetId:target.id,title:v.title,text:v.text,dialogue:v.dialogue,choices:{
            up:encounterChoice("반복되는 행동임을 분명히 하고 즉시 중단·분리한 뒤 사실을 기록한다.",{relation:1,classStability:7,trust:1,classFlow:-2},"한 번의 장난이 아니라 반복되는 행동으로 보고 기록을 시작했다."),
            down:encounterChoice("피해 학생과 목격 학생을 각각 따로 만나 어떤 일이 반복됐는지 듣는다.",{mood:5,relation:4,trust:6,classFlow:-4},"주변의 웃음 뒤에 숨었던 불편함과 반복성이 더 분명해졌다."),
            left:encounterChoice("가담·방관·웃어주는 행동까지 각각 어떤 영향을 주는지 친구들과 짚는다.",{relation:5,classStability:4,trust:4,classFlow:-4},"직접 한 사람만이 아니라 분위기를 만드는 행동도 함께 다뤘다."),
            right:encounterChoice(target.name+"에게 당장 필요한 거리·자리·도움 요청 방법을 고르게 하고 어른이 그 선택을 보장한다.",{mood:5,trust:6,classStability:4,classFlow:-2},"피해 학생이 상황을 견디는 책임을 지지 않도록 안전 선택을 보장했다.")
          }};
        }
        if(nodeId.indexOf("pattern_")===0){
          var branch2=nodeId.slice(8),v2={
            up:{title:"이번에는 물건이 아닌 사람을 빼기 시작했다",text:"직접적인 장난을 제지받은 뒤 무리는 "+target.name+"만 모둠 대화에서 빼거나 자리를 옮기는 식으로 반응한다. 겉으로는 규칙을 어기지 않는 것처럼 보인다.",dialogue:target.name+' “제가 오면 갑자기 다른 데로 가요.”'},
            down:{title:"피해 학생이 쉬는 시간을 피하기 시작했다",text:target.name+"은(는) 쉬는 시간마다 교실에 남거나 화장실을 일부러 늦게 간다고 말했다. 마주칠까 봐 불편하다고 한다.",dialogue:target.name+' “그냥 애들이 없는 데 있고 싶어요.”'},
            left:{title:"친구들은 배운 말을 알면서도 웃음을 멈추지 못했다",text:"무엇이 문제인지 설명할 수는 있게 됐지만 실제 상황에서는 누군가 "+target.name+"을 건드리면 또 웃음이 터진다. 반복이 무리의 놀이처럼 굳어지고 있다.",dialogue:(witness?witness.name:"친구")+' “하지 말아야 하는 건 아는데… 그때는 그냥 웃겨서요.”'},
            right:{title:"피해 학생이 거리를 두자 ‘삐졌다’는 말이 퍼졌다",text:target.name+"이(가) 스스로 거리를 두기 시작하자 무리는 오히려 ‘예민하다’, ‘삐졌다’는 말을 하며 책임을 피해 학생에게 돌린다.",dialogue:s.name+' “자기가 혼자 있으려고 한 거예요.”'}
          }[branch2];
          return {targetId:target.id,safeguarding:true,title:v2.title,text:v2.text,dialogue:v2.dialogue,choices:{
            up:encounterChoice("반복·배제·집단 가담을 포함해 학교에서 정한 학생 보호 절차로 다루기 시작한다.",{relation:2,classStability:8,trust:3,classFlow:-4},"이제 단순한 장난으로 처리하지 않고 공식적인 보호와 확인 단계로 넘어갔다."),
            down:encounterChoice(target.name+"의 안전과 학교생활 영향을 먼저 확인하고 혼자 버티지 않아도 된다고 말한다.",{mood:7,trust:8,classFlow:-4},"피해 학생의 안전과 일상 회복을 가장 먼저 챙겼다."),
            left:encounterChoice("누가 언제 무엇을 했는지 반복 양상과 목격 내용을 정리해 관련 교직원과 공유한다.",{classStability:7,trust:6,classFlow:-5},"감정적인 추측이 아니라 반복된 사실을 중심으로 대응할 기반을 만들었다."),
            right:encounterChoice("피해 학생에게 당분간 함께 있을 친구·공간·도움 요청 방식을 고르게 하되 조치는 어른들이 맡는다.",{mood:6,trust:8,classStability:5,classFlow:-3},"피해 학생에게 선택권은 주되 해결 책임은 어른들이 맡았다.")
          }};
        }
        if(nodeId.indexOf("safety_")===0){
          var branch3=nodeId.slice(7),v3={
            up:{title:"‘장난이었다’는 말과 반복 기록이 충돌한다",text:"확인 과정에서 "+s.name+"은(는) 계속 장난이었다고 말하지만, 여러 날의 기록과 친구들의 진술에는 반복된 별명·배제·물건 장난이 함께 남아 있다.",dialogue:s.name+' “진짜 괴롭히려고 한 건 아니었어요.”'},
            down:{title:"피해 학생이 처음으로 ‘학교 오기 싫었다’고 말했다",text:target.name+"은(는) 안전하게 이야기할 자리가 생기자 최근 학교에 오기 싫었던 날이 있었다고 털어놓는다. 웃으며 넘겼던 시간보다 영향이 컸다.",dialogue:target.name+' “아침에 그냥 아프다고 하고 안 오고 싶었어요.”'},
            left:{title:"목격한 친구들이 서로 다른 장면을 이야기한다",text:"기록을 맞춰 보니 한 사람이 한 번 크게 한 사건보다, 여러 친구가 조금씩 가담하며 반복된 장면이 이어졌다는 점이 드러난다.",dialogue:(witness?witness.name:"친구")+' “저는 직접 하진 않았는데… 웃은 적은 있어요.”'},
            right:{title:"안전한 거리를 두자 피해 학생의 표정이 달라졌다",text:target.name+"은(는) 당분간 가까이 마주치지 않는 선택을 한 뒤 수업 참여가 조금씩 돌아온다. 하지만 관계를 다시 회복하고 싶은지는 아직 모르겠다고 한다.",dialogue:target.name+' “지금은 그냥 안 마주치고 싶어요.”'}
          }[branch3];
          return {targetId:target.id,safeguarding:true,title:v3.title,text:v3.text,dialogue:v3.dialogue,choices:{
            up:encounterChoice("의도보다 반복된 행동과 피해를 기준으로 학교의 절차와 보호 조치를 끝까지 진행한다.",{classStability:8,trust:5,classTrust:3,classFlow:-4},"‘장난이었다’는 말만으로 사건을 끝내지 않고 필요한 절차를 이어갔다."),
            down:encounterChoice("피해 학생이 원하는 회복 속도를 존중하고 불필요한 대면이나 화해를 강요하지 않는다.",{mood:7,trust:8,relation:2,classFlow:-3},"회복을 위해 피해 학생이 다시 상대를 만나야 한다는 부담을 주지 않았다."),
            left:encounterChoice("가해·가담·방관 행동을 구분해 각 학생에게 필요한 지도와 재발 방지 계획을 세운다.",{relation:4,classStability:7,trust:5,classFlow:-4},"무리 전체를 똑같이 취급하지 않고 행동별 책임과 교육을 나눴다."),
            right:encounterChoice("피해 학생의 안전 선택은 유지하면서 이후 관계 회복 여부는 나중에 스스로 결정하게 한다.",{mood:6,trust:8,classStability:5,classFlow:-2},"지금 당장 화해를 결말로 삼지 않고 선택권을 남겼다.")
          }};
        }
        return {targetId:target.id,safeguarding:true,title:"이제는 ‘장난’이라고만 부를 수 없었다",text:"처음에는 웃음으로 시작됐던 일이 반복과 배제, 불안으로 이어졌다. "+target.name+"의 생활에는 실제 변화가 생겼고, "+s.name+"과(와) 주변 친구들도 각자의 행동이 남긴 결과를 마주하게 됐다.",dialogue:s.name+' “처음엔 진짜 이렇게 될 줄 몰랐어요.”',choices:{
          up:encounterChoice("사건 이후에도 같은 행동이 반복되지 않는지 명확한 기준과 관찰을 계속 유지한다.",{classStability:7,trust:4},"이야기는 처분 한 번으로 끝나지 않고 재발 방지와 관찰로 이어졌다."),
          down:encounterChoice("피해 학생의 일상 회복과 신뢰를 먼저 살피고 관계 회복은 서두르지 않는다.",{mood:7,trust:8,relation:3},"결말을 억지 화해로 만들지 않고 피해 학생의 회복을 중심에 뒀다."),
          left:encounterChoice("관련 학생들이 각자 무엇을 바꿔야 하는지 구체적인 행동 계획을 세우고 확인한다.",{relation:5,classStability:6,trust:5},"‘다시는 안 그럴게요’보다 실제로 바꿀 행동을 남겼다."),
          right:encounterChoice("피해 학생이 이후 관계의 거리를 정하게 하고, 다른 학생들은 그 선택을 존중하게 한다.",{mood:5,trust:7,relation:4},"친구로 돌아가는 것만이 좋은 결말은 아니라는 점을 남겼다.")
        }};
      }
    },
    rule_breaking_clique:{
      label:"재밌는 애 주변에 모인 아이들",steps:5,
      score:function(s){
        var fit=(s.imp||0)*.24+(s.mischief||0)*.30+(s.soc||0)*.18+(hasTrait(s,"authority_resistant")?.22:0)+(hasTrait(s,"playful")?.12:0);
        return fit>.46?fit*.72:0;
      },
      setup:function(s){
        var peers=students.filter(function(o){return o!==s}).sort(function(a,b){return relation(s,b).affinity-relation(s,a).affinity});
        return {peerA:peers[0]?peers[0].id:null,peerB:peers[1]?peers[1].id:null,peerC:peers[2]?peers[2].id:null};
      },
      step:function(nodeId){return nodeId==="start"?1:nodeId.indexOf("secret_")===0?2:nodeId.indexOf("defiance_")===0?3:nodeId.indexOf("distance_")===0?4:5},
      next:function(nodeId,dir){
        if(nodeId==="start")return "secret_"+dir;
        if(nodeId.indexOf("secret_")===0)return "defiance_"+dir;
        if(nodeId.indexOf("defiance_")===0)return "distance_"+dir;
        if(nodeId.indexOf("distance_")===0)return "final";
        return null;
      },
      node:function(st,s,nodeId){
        var a=studentById(st.data.peerA),b=studentById(st.data.peerB),c=studentById(st.data.peerC);
        var names=[a,b,c].filter(Boolean).map(function(x){return x.name});
        var group=names.length?names.join("·")+"와(과) ":"친구들과 ";
        if(nodeId==="start"){
          return {targetId:a?a.id:null,title:"수업보다 그 아이를 보는 친구들이 더 많다",text:s.name+"은(는) 기분이 올라오면 거친 말을 그대로 내뱉고 친구와 작은 기싸움도 자주 벌인다. 수업 중에도 딴짓과 끼어들기가 잦지만, "+group+"몇몇 친구는 그 돌발 행동을 재미있어하며 웃고 따라다닌다.",dialogue:(a?a.name:"친구")+' “쟤랑 있으면 맨날 뭔가 생겨서 웃겨요.”',choices:{
            up:encounterChoice("욕설·수업 방해·지시 거부는 재미와 별개로 허용하지 않는 행동이라고 즉시 선을 긋는다.",{focus:3,classStability:7,trust:-2},"친구들의 웃음과 별개로 행동의 선을 분명히 했다."),
            down:encounterChoice("감정이 올라오면 바로 행동으로 나오는 순간이 언제인지 따로 이야기해 본다.",{mood:4,trust:6,classFlow:-3},"‘문제 학생’이라는 말 대신 행동이 시작되는 순간을 함께 살폈다."),
            left:encounterChoice("화가 날 때 쓸 말, 수업에서 움직이고 싶을 때 할 행동을 구체적으로 정해 연습한다.",{focus:5,classStability:4,trust:4,classFlow:-3},"하지 말라는 말 대신 바꿔 할 행동을 만들었다."),
            right:encounterChoice("수업 안에서 선택 가능한 행동과 선택할 수 없는 선을 나눠 스스로 고르게 한다.",{focus:3,trust:4,classStability:3},"선택권은 주되 다른 사람의 학습을 방해하는 선택은 제외했다.")
          }};
        }
        if(nodeId.indexOf("secret_")===0){
          var branch=nodeId.slice(7),v={
            up:{title:"교실에서 막히자 으슥한 곳으로 옮겼다",text:s.name+"은(는) 교실에서는 조심하는 듯했지만 쉬는 시간에 "+group+"화장실 근처나 사람이 적은 곳으로 가 간식을 숨겨 먹는다. 친구들은 몰래 하는 재미에 더 들떠 있다.",dialogue:s.name+' “여기서는 선생님도 모르잖아.”'},
            down:{title:"‘그냥 답답해서’ 몰래 하는 일이 늘었다",text:"대화를 나눈 뒤에도 "+s.name+"은(는) 답답할 때 규칙을 깨는 게 시원하다고 말한다. 이번에는 공기계를 가져와 친구들과 몰래 화면을 보고 있었다.",dialogue:s.name+' “잠깐 보는 건데 뭐가 그렇게 큰일이에요?”'},
            left:{title:"대체 행동은 알지만 친구들 앞에서는 다시 달라진다",text:"혼자 있을 때는 약속을 기억하지만 "+group+"친구들이 모이면 "+s.name+"이(가) 다시 큰 소리와 거친 말을 꺼낸다. 친구들의 웃음이 행동을 더 키우는 듯하다.",dialogue:s.name+' “애들이 좋아하니까 그냥 한 거예요.”'},
            right:{title:"선택권의 빈틈을 자기 식으로 넓혀 간다",text:"정해진 선택지를 주자 "+s.name+"은(는) 그 밖의 행동도 ‘내가 선택한 것’이라고 주장한다. 친구 물건을 말없이 가져가 놓고도 ‘빌린 것’이라고 말한다.",dialogue:s.name+' “훔친 거 아니고 빌린 거예요. 이따 주면 되잖아요.”'}
          }[branch];
          return {targetId:a?a.id:null,title:v.title,text:v.text,dialogue:v.dialogue,choices:{
            up:encounterChoice("숨겨 먹기·공기계·남의 물건 사용처럼 반복되는 행동을 각각 분명한 규칙 위반으로 기록하고 바로잡는다.",{focus:2,classStability:7,trust:-1,classFlow:-2},"여러 행동을 ‘그 아이 원래 그래’로 뭉개지 않고 하나씩 사실로 남겼다."),
            down:encounterChoice("친구들 앞에서 행동이 더 커지는 이유와 혼자 있을 때의 마음 차이를 들어본다.",{mood:4,trust:6,classFlow:-3},"친구들의 반응이 행동을 강화하는 부분이 보이기 시작했다."),
            left:encounterChoice("간식·기기·빌리기·쉬는 시간 이동을 각각 어떻게 해야 하는지 구체적인 대체 행동을 정한다.",{focus:5,classStability:5,trust:4,classFlow:-4},"추상적인 ‘잘해라’ 대신 상황별 행동 기준을 만들었다."),
            right:encounterChoice("친구들과 있을 때도 본인이 책임질 수 있는 선택과 절대 넘지 않을 선을 직접 말하게 한다.",{focus:3,trust:4,classStability:4,classFlow:-2},"자유를 주장하는 만큼 결과도 자기 선택과 연결하게 했다.")
          }};
        }
        if(nodeId.indexOf("defiance_")===0){
          var branch2=nodeId.slice(9),v2={
            up:{title:"지적받을수록 더 크게 발을 굴렀다",text:"이동할 때 조용히 하라는 지시를 받은 "+s.name+"은(는) 오히려 발소리를 일부러 크게 내며 걸었다. "+group+"친구 몇 명이 웃었지만 한 명은 더 이상 웃지 않았다.",dialogue:s.name+' “걷는 소리까지 뭐라고 해요?”'},
            down:{title:"화를 참지 않고 선생님과 기싸움으로 바뀐다",text:"기분이 상한 순간을 알아차리기는 하지만 "+s.name+"은(는) 여전히 교사의 지시를 ‘지는 것’처럼 받아들인다. 작은 안내도 말싸움으로 길어지는 날이 늘었다.",dialogue:s.name+' “왜 제가 선생님 말대로 다 해야 돼요?”'},
            left:{title:"방법을 알려줘도 일부러 반대로 하는 날이 생겼다",text:"대체 행동을 알고도 기분이 나쁘면 반대로 행동한다. 수업 시작 신호 뒤 일부러 가방을 뒤지거나 친구에게 말을 걸며 분위기를 끈다.",dialogue:s.name+' “하기 싫을 수도 있잖아요.”'},
            right:{title:"‘내 선택’이라는 말이 지시 거부의 방패가 됐다",text:s.name+"은(는) 해야 할 일까지 선택의 문제로 바꾸며 교사의 지시를 반복해서 넘긴다. 처음엔 웃던 친구들도 수업이 계속 끊기자 표정이 달라진다.",dialogue:(b?b.name:"친구")+' “재밌긴 한데 수업까지 계속 이러는 건 좀…”'}
          }[branch2];
          return {targetId:b?b.id:(a?a.id:null),title:v2.title,text:v2.text,dialogue:v2.dialogue,choices:{
            up:encounterChoice("교사와 힘겨루기를 길게 하지 않고 즉시 지켜야 할 선과 이후 책임을 짧게 적용한다.",{focus:3,classStability:8,trust:-1,classFlow:2},"말싸움 대신 일관된 결과로 대응했다."),
            down:encounterChoice("감정은 인정하되 화난 감정이 다른 사람에게 욕설·방해로 나갈 수는 없다고 분리해 말한다.",{mood:3,trust:6,classStability:4,classFlow:-3},"감정을 없애려 하지 않으면서 행동 책임은 남겼다."),
            left:encounterChoice("지시를 들은 뒤 10초 멈춤-선택-복귀의 짧은 절차를 반복 연습한다.",{focus:6,classStability:5,trust:4,classFlow:-3},"기분과 행동 사이에 짧은 멈춤을 넣는 연습을 시작했다."),
            right:encounterChoice("하기 싫다는 말은 할 수 있지만 수업 방해 없이 거절 의사를 표현하는 방법 중 하나를 고르게 한다.",{focus:4,mood:2,trust:5,classStability:4},"거절할 권리와 방해할 권리를 구분했다.")
          }};
        }
        if(nodeId.indexOf("distance_")===0){
          var branch3=nodeId.slice(9),v3={
            up:{title:"웃어주던 친구들이 먼저 자리를 옮겼다",text:"반복되는 문제에 교사가 계속 선을 세우는 사이, "+group+"친구들도 쉬는 시간마다 꼭 함께 다니지는 않게 됐다. "+s.name+"이(가) 정한 대로 움직여야 하는 분위기에 지친 듯하다.",dialogue:(a?a.name:"친구")+' “처음엔 웃겼는데 이제는 맨날 자기 마음대로 하니까 피곤해요.”'},
            down:{title:"친구가 처음으로 ‘너랑 있으면 눈치 보인다’고 말했다",text:"친구들의 마음을 따로 듣던 중 "+(b?b.name:"한 친구")+"이(가) "+s.name+" 앞에서 조심스럽게 말한다. 재미있는 순간도 있지만 언제 욕을 듣거나 기싸움이 시작될지 몰라 피곤하다고 한다.",dialogue:(b?b.name:"친구")+' “너랑 놀기 싫은 건 아닌데… 계속 맞춰줘야 하는 건 싫어.”'},
            left:{title:"친구들도 더 이상 같이 규칙을 깨고 싶어 하지 않는다",text:"상황별 행동을 계속 짚자 "+group+"친구들이 몰래 간식을 먹거나 공기계를 볼 때 따라가지 않기 시작했다. 같이 혼나는 것이 싫다는 말도 나온다.",dialogue:(c?c.name:(a?a.name:"친구"))+' “나는 이제 그냥 안 갈래. 맨날 걸리잖아.”'},
            right:{title:"무리가 자기 선택을 하기 시작하자 중심이 흔들렸다",text:"친구들에게도 선택권이 있다는 점이 강조되자 "+s.name+"이(가) 하자는 대로 따라가던 아이들이 하나둘 다른 친구와 움직인다. "+s.name+"은(는) 그 변화를 배신처럼 받아들인다.",dialogue:s.name+' “갑자기 왜 다들 나 빼고 가는데?”'}
          }[branch3];
          return {targetId:a?a.id:null,title:v3.title,text:v3.text,dialogue:v3.dialogue,choices:{
            up:encounterChoice("친구들이 거리를 두는 선택을 존중하고 "+s.name+"에게도 관계의 결과를 대신 해결해주지 않는다.",{relation:-1,classStability:5,trust:2},"친구 관계를 교사가 억지로 원상복구시키지 않았다."),
            down:encounterChoice(s.name+"이(가) 버려졌다는 감정은 듣되 친구들이 지친 이유도 함께 바라보게 한다.",{mood:4,relation:2,trust:6,classFlow:-3},"외로움을 인정하면서도 친구들의 경계를 지우지는 않았다."),
            left:encounterChoice("친구를 다시 붙잡는 방법이 아니라 욕설·빌리기·지시 거부 등 바꿔야 할 행동을 하나씩 정한다.",{focus:5,relation:3,trust:5,classFlow:-3},"관계 회복보다 먼저 행동 변화의 구체적인 출발점을 잡았다."),
            right:encounterChoice("누구와 지낼지는 친구들의 선택임을 받아들이고 자신도 다른 방식의 관계를 선택할 수 있게 한다.",{mood:3,relation:2,trust:5},"다른 사람을 통제하지 않고 관계를 다시 시작할 선택을 남겼다.")
          }};
        }
        var upCount=(st.style&&st.style.up)||0,downCount=(st.style&&st.style.down)||0,leftCount=(st.style&&st.style.left)||0,rightCount=(st.style&&st.style.right)||0;
        var lead=Math.max(upCount,downCount,leftCount,rightCount);
        var thread=lead===leftCount?"여러 번 구체적인 행동을 연습했지만 실제 관계에서는 아직 시간이 필요하다.":lead===downCount?"자기 마음을 말하는 일은 늘었지만 친구들이 받은 피로감까지 바로 사라진 것은 아니다.":lead===upCount?"규칙 위반은 줄어들기 시작했지만 친구 관계는 예전처럼 돌아오지 않았다.":"선택의 결과를 직접 마주하면서, 친구들도 각자 자기 관계를 선택하기 시작했다.";
        return {targetId:a?a.id:null,title:"점심시간, 예전 자리에 친구들이 없었다",text:"한동안 "+s.name+" 주변에 모여 함께 웃던 친구들은 이제 다른 자리에서 각자 놀고 있다. "+s.name+"은(는) 처음으로 자기가 부르지 않아도 오던 친구들이 오지 않는 점심시간을 보낸다. "+thread,dialogue:s.name+' “애들이 저 싫어하게 된 거예요?”',choices:{
          up:encounterChoice("친구들이 거리를 둔 이유를 대신 변명하지 않고, 앞으로 지켜야 할 행동의 기준을 다시 분명히 한다.",{focus:3,classStability:6,trust:3},"친구를 돌려주는 것을 보상으로 삼지 않고 행동의 책임을 남겼다. 관계는 천천히 다시 만들어야 한다."),
          down:encounterChoice("외롭고 억울한 마음을 충분히 듣고, 동시에 친구들도 안전하고 편한 관계를 선택할 권리가 있다고 말한다.",{mood:5,trust:7,relation:2,classFlow:-2},"학생은 처음으로 자기 외로움과 친구들의 피로가 동시에 존재할 수 있다는 말을 듣는다."),
          left:encounterChoice("욕설 없이 말하기·허락받고 빌리기·수업 복귀·기기 규칙 지키기 중 가장 필요한 두 가지를 장기 목표로 잡는다.",{focus:6,classStability:5,trust:6,classFlow:-2},"결말을 ‘착해졌다’로 끝내지 않고, 관계를 다시 만들기 위한 실제 행동 두 가지가 남았다."),
          right:encounterChoice("친구를 다시 붙잡으라고 하지 않고, 달라진 행동을 보여주면서 새 관계가 생길 시간을 스스로 견디게 한다.",{mood:3,trust:6,relation:3},"친구들이 돌아올지는 정해주지 않았다. 다만 다른 사람의 선택을 통제하지 않는 것이 새로운 시작점이 됐다.")
        }};
      }
    }
  };

  function activeStoryStates(){
    return Object.keys(storyStates).map(function(k){return storyStates[k]}).filter(function(st){return st.status==="active"});
  }
  function storyArcFor(id){return STORY_ARCS[id]||null}
  function storyStepNumber(st,nodeId){
    var arc=storyArcFor(st&&st.arcId);
    if(arc&&arc.step)return arc.step(nodeId,st);
    return nodeId==="start"?1:nodeId==="final"?3:2;
  }
  function storyNodeData(st,nodeId){
    var arc=storyArcFor(st.arcId),s=studentById(st.studentId);if(!arc||!s)return null;
    if(arc.node)return arc.node(st,s,nodeId);
    if(nodeId==="start")return arc.start(st,s);
    if(nodeId==="final")return arc.final(st,s);
    if(nodeId.indexOf("middle_")===0)return arc.middle(st,s,nodeId.slice(7));
    return null;
  }
  function storyNextMap(st,nodeId){
    var arc=storyArcFor(st&&st.arcId);
    if(arc&&arc.next){
      return {up:arc.next(nodeId,"up",st),down:arc.next(nodeId,"down",st),left:arc.next(nodeId,"left",st),right:arc.next(nodeId,"right",st)};
    }
    if(nodeId==="start")return {up:"middle_up",down:"middle_down",left:"middle_left",right:"middle_right"};
    if(nodeId.indexOf("middle_")===0)return {up:"final",down:"final",left:"final",right:"final"};
    return {up:null,down:null,left:null,right:null};
  }
  function buildStoryEncounter(st,nodeId){
    var data=storyNodeData(st,nodeId),arc=storyArcFor(st.arcId);if(!data||!arc)return null;
    return Object.assign({
      id:"enc-"+(++encounterSeq),templateId:"story_"+st.arcId+"_"+nodeId,category:current().name,
      studentId:st.studentId,targetId:st.data&&st.data.peer!==undefined?st.data.peer:null,
      createdAt:gameSec,expiresAt:gameSec+360,choices:{},
      storyId:st.id,storyArc:st.arcId,storyNode:nodeId,storyStep:storyStepNumber(st,nodeId),storyTotal:arc.steps,storyNext:storyNextMap(st,nodeId),
      noFollowUp:true
    },data);
  }
  function storyStarterCandidates(){
    if(dayIndex<1||!dayStoryStarterReady||dayStoryEventsShown>=MAX_STORY_EVENTS_PER_DAY||activeStoryStates().length>=MAX_ACTIVE_STORIES)return [];
    var out=[];
    students.forEach(function(s){
      if(s.scene!==teacherScene||s.targetScene)return;
      Object.keys(STORY_ARCS).forEach(function(arcId){
        var arc=STORY_ARCS[arcId],w=Math.max(0,Number(arc.score(s))||0)*storyArcWorldMultiplier(arcId,s);
        var already=Object.keys(storyStates).some(function(k){var st=storyStates[k];return st.arcId===arcId&&st.studentId===s.id&&st.status!=="completed"});
        if(w>.12&&!already)out.push({student:s,arcId:arcId,weight:w});
      });
    });
    return out;
  }
  function startStoryEncounter(picked){
    var candidates=storyStarterCandidates();if(!candidates.length)return null;
    picked=picked||weightedPick(candidates);
    var arc=storyArcFor(picked.arcId),data=arc.setup(picked.student)||{};
    var st={id:"story-"+(++storySeq),arcId:picked.arcId,studentId:picked.student.id,data:data,status:"active",startedDay:dayIndex,startedTime:gameMinute(),history:[],style:{up:0,down:0,left:0,right:0}};
    storyStates[st.id]=st;dayStoryStarterReady=false;
    return buildStoryEncounter(st,"start");
  }
  function storyRelevantStudents(st){
    if(!st)return [];
    var ids=[st.studentId];
    ["peer","peerA","peerB","peerC","target"].forEach(function(k){if(st.data&&st.data[k]!==undefined&&st.data[k]!==null)ids.push(st.data[k])});
    return ids.filter(function(id,i,a){return a.indexOf(id)===i}).map(studentById).filter(Boolean);
  }
  function storyWorldBranch(st,fallbackDir){
    var people=storyRelevantStudents(st),lead=studentById(st.studentId),last=st.history.length?st.history[st.history.length-1]:null;
    var sinceDay=last?last.day:st.startedDay,sinceTime=last?(last.time||0):(st.startedTime||0),ids=people.map(function(s){return s.id});
    var events=worldHistory.filter(function(e){
      var after=(e.day>sinceDay)||(e.day===sinceDay&&(e.time||0)>sinceTime);
      return after&&(ids.indexOf(e.actorId)>=0||ids.indexOf(e.targetId)>=0||(e.witnessIds||[]).some(function(id){return ids.indexOf(id)>=0}));
    });
    var severe=events.reduce(function(n,e){return n+(e.severity||0)},0);
    var repeated=events.filter(function(e){return ["conflict","rejection","tease","exclusion","taking","threat","physical","teacher_refusal","teacher_shout","teacher_insult","teacher_throw"].indexOf(e.kind)>=0}).length;
    var peers=people.filter(function(p){return lead&&p!==lead});
    var avgAff=peers.length?peers.reduce(function(n,p){return n+relation(lead,p).affinity},0)/peers.length:.5;
    var avgIrr=peers.length?peers.reduce(function(n,p){return n+relation(lead,p).irritation},0)/peers.length:.08;
    var circleDrift=peers.length?peers.filter(function(p){return circleOf(lead)!==circleOf(p)}).length/peers.length:0;
    var stress=lead?lead.victimStress+(1-lead.mood)*.55+(1-lead.belonging)*.35:0;
    var firstPeer=peers[0]||null;
    var score={
      up:severe*.72+avgIrr*.95+repeated*.10,
      down:stress*.88+severe*.24,
      left:repeated*.23+avgIrr*.35+(firstPeer?Math.max(0,-memorySocialBias(lead,firstPeer))*.35:0),
      right:circleDrift*.72+(1-avgAff)*.58+Math.max(0,.58-(lead?lead.belonging:.58))*.45
    };
    if(fallbackDir&&score[fallbackDir]!==undefined)score[fallbackDir]+=.16;
    var best="down";Object.keys(score).forEach(function(k){if(score[k]>score[best])best=k});return best;
  }
  function resolveQueuedStoryNode(job,st){
    if(job.nodeId)return job.nodeId;
    var arc=storyArcFor(st.arcId);if(!arc||!job.fromNode)return null;
    var dir=storyWorldBranch(st,job.preferredDir||"down");job.worldDir=dir;
    return arc.next?arc.next(job.fromNode,dir,st):(storyNextMap(st,job.fromNode)[dir]||null);
  }
  function takeDueStoryEncounter(){
    if(dayStoryEventsShown>=MAX_STORY_EVENTS_PER_DAY)return null;
    for(var i=0;i<storyQueue.length;i++){
      var job=storyQueue[i];if(job.status!=="queued"||job.dueDay>dayIndex)continue;
      var st=storyStates[job.storyId];if(!st||st.status!=="active"){job.status="skipped";continue}
      var s=studentById(st.studentId);if(!s||s.scene!==teacherScene||s.targetScene)continue;
      var nodeId=resolveQueuedStoryNode(job,st);if(!nodeId){job.status="skipped";continue}
      job.status="shown";return buildStoryEncounter(st,nodeId);
    }
    return null;
  }
  function advanceStory(enc,dir){
    if(!enc||!enc.storyId)return;
    var st=storyStates[enc.storyId];if(!st)return;
    st.history.push({day:dayIndex,time:gameMinute(),node:enc.storyNode,dir:dir,title:enc.title});
    if(st.style&&st.style[dir]!==undefined)st.style[dir]++;
    var map=enc.storyNext||{},hasNext=Object.keys(map).some(function(k){return !!map[k]});
    if(!hasNext){st.status="completed";st.completedDay=dayIndex;return}
    storyQueue.push({storyId:st.id,fromNode:enc.storyNode,preferredDir:dir,dueDay:dayIndex+1,status:"queued"});
  }

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
    if(enc&&enc.familyEvent)dayFamilyEventsShown++;
    if(enc&&enc.storyId)dayStoryEventsShown++;
  }

  function weightedPick(items){
    if(!items.length)return null;
    var total=items.reduce(function(sum,x){return sum+x.weight},0),r=Math.random()*total;
    for(var i=0;i<items.length;i++){r-=items[i].weight;if(r<=0)return items[i]}
    return items[items.length-1];
  }
  function storyletDirectorCandidates(){
    var candidates=[];
    if(dayStoryEventsShown<MAX_STORY_EVENTS_PER_DAY){
      storyQueue.forEach(function(job){
        if(job.status!=="queued"||job.dueDay>dayIndex)return;
        var st=storyStates[job.storyId],s=st&&studentById(st.studentId);
        if(!st||st.status!=="active"){job.status="skipped";return}
        if(!s||s.scene!==teacherScene||s.targetScene)return;
        var nodeId=resolveQueuedStoryNode(job,st);if(!nodeId)return;
        candidates.push({kind:"story_due",weight:3.8+storyArcWorldMultiplier(st.arcId,s),job:job,state:st,nodeId:nodeId});
      });
    }
    if(dayFollowUpsShown<MAX_FOLLOWUPS_PER_DAY){
      followUpQueue.forEach(function(job){
        if(job.status!=="queued"||job.dueDay>dayIndex)return;
        var s=studentById(job.studentId);if(!s||s.scene!==teacherScene||s.targetScene)return;
        candidates.push({kind:"followup",weight:2.45+recentWorldEventStrength(s,null,3)*.18,job:job});
      });
    }
    if(dayEncounterOffered>=1&&dayStoryEventsShown<MAX_STORY_EVENTS_PER_DAY){
      storyStarterCandidates().forEach(function(p){candidates.push({kind:"story_start",weight:.74+p.weight*.72,starter:p})});
    }
    var visible=students.filter(function(s){return s.scene===teacherScene&&!s.targetScene});
    visible.forEach(function(s){
      ENCOUNTER_TEMPLATES.forEach(function(t){
        if(t.familyEvent&&dayFamilyEventsShown>=MAX_FAMILY_EVENTS_PER_DAY)return;
        var weight=Math.max(0,Number(t.score(s))||0)*traitEncounterMultiplier(s,t.id)*storyletCausalityMultiplier(s,t.id);
        if(t.familyEvent)weight*=.58;
        var recent=encounterHistory.slice(-8).some(function(h){return h.templateId===t.id&&h.studentId===s.id});
        if(weight>.12&&!recent)candidates.push({kind:"encounter",student:s,template:t,weight:weight});
      });
    });
    return candidates;
  }
  function makeEncounter(){
    var candidates=storyletDirectorCandidates();if(!candidates.length)return null;
    // Normalize by storylet family so hundreds of ordinary candidates cannot drown out
    // one meaningful continuation. The director chooses a camera lane first, then a scene.
    var dueStories=candidates.filter(function(x){return x.kind==="story_due"});
    var followups=candidates.filter(function(x){return x.kind==="followup"});
    var starters=candidates.filter(function(x){return x.kind==="story_start"});
    var ordinary=candidates.filter(function(x){return x.kind==="encounter"});
    var pools=[];
    if(dueStories.length)pools.push({weight:dayStoryEventsShown===0?5.6:3.8,item:weightedPick(dueStories)});
    if(followups.length)pools.push({weight:3.0,item:weightedPick(followups)});
    if(starters.length)pools.push({weight:1.8,item:weightedPick(starters)});
    if(ordinary.length)pools.push({weight:5.0,item:weightedPick(ordinary)});
    var picked=weightedPick(pools).item;
    if(picked.kind==="story_due"){picked.job.status="shown";return buildStoryEncounter(picked.state,picked.nodeId)}
    if(picked.kind==="followup"){picked.job.status="shown";picked.job.shownDay=dayIndex;return buildFollowUpEncounter(picked.job)}
    if(picked.kind==="story_start")return startStoryEncounter(picked.starter);
    var built=picked.template.build(picked.student);if(!built)return null;
    return Object.assign({
      id:"enc-"+(++encounterSeq),templateId:picked.template.id,category:picked.template.category,
      title:picked.template.title,studentId:picked.student.id,targetId:null,
      familyEvent:!!picked.template.familyEvent,parentTrait:picked.template.parentTrait||null,safeguarding:!!picked.template.safeguarding,noFollowUp:!!picked.template.noFollowUp,
      createdAt:gameSec,expiresAt:gameSec+260,choices:{}
    },built);
  }
  function scheduleNextEncounter(min,max){nextEncounterAt=gameSec+rand(min||420,max||760)}
  function maybeSpawnEncounter(){
    if(dayEnded||pendingEncounter||activeEncounter||reportOpen||toolModalKind||tutorialState.active||gameSec<nextEncounterAt)return;
    if(dayEncounterOffered>=dayEncounterBudget){scheduleNextEncounter(600,900);return}
    var cap=periodEncounterCap(current());
    if(cap<=0){nextEncounterAt=Math.max(gameSec+60,current().end*60+15);return}
    if(periodEncounterCount()>=cap){nextEncounterAt=Math.max(gameSec+60,current().end*60+rand(20,80));return}
    var enc=makeEncounter();
    if(enc){pendingEncounter=enc;markEncounterOffered(enc);openPendingEncounter()}
    else scheduleNextEncounter(120,240);
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
    var tokenLabel=token.querySelector("small");if(tokenLabel)tokenLabel.textContent="상황";
    token.classList.remove("followup");
    token.title=pendingEncounter.title;token.setAttribute("aria-label",s.name+"의 판단 상황: "+pendingEncounter.title);
  }
  function openPendingEncounter(){
    if(!pendingEncounter||activeEncounter)return;
    activeEncounter=pendingEncounter;pendingEncounter=null;
    activeEncounter.phase="choice";activeEncounter.deadline=Number.POSITIVE_INFINITY;
    encounterWasRunning=running;running=false;
    renderEncounter();
  }
  function worldEventShortText(e){
    if(!e)return "";
    var a=studentById(e.actorId),t=studentById(e.targetId),an=a?a.name:"한 학생",tn=t?t.name:"";
    if(e.kind==="rejection")return an+"이(가) "+tn+"의 합류를 거절한 일이 있었다.";
    if(e.kind==="conflict")return an+"와(과) "+tn+" 사이에 말다툼이 있었다.";
    if(e.kind==="tease")return an+"이(가) "+tn+"을(를) 놀린 일이 있었다.";
    if(e.kind==="borrow_item")return an+"이(가) "+tn+"에게 준비물을 빌린 적이 있었다.";
    if(e.kind==="taking")return an+"이(가) "+tn+"의 물건을 억지로 가져가려 한 일이 있었다.";
    if(e.kind==="exclusion")return an+"이(가) "+tn+"을(를) 놀이에서 밀어낸 일이 있었다.";
    if(e.kind==="threat")return an+"이(가) "+tn+"에게 위협적으로 말한 일이 있었다.";
    if(e.kind==="physical")return an+"과(와) "+tn+" 사이에 거친 신체행동이 있었다.";
    if(e.kind==="teacher_refusal")return an+"이(가) 교사의 안내를 거부한 일이 있었다.";
    if(e.kind==="teacher_shout"||e.kind==="teacher_insult"||e.kind==="teacher_throw")return an+"의 교사에 대한 강한 반발이 있었다.";
    if(e.kind==="near_collision")return an+"이(가) "+tn+"과(와) 부딪힐 뻔한 일이 있었다.";
    if(e.kind==="encounter")return an+"에게 비슷한 문제를 두고 한 차례 이야기를 나눈 적이 있었다.";
    return e.text||"";
  }
  function encounterContextLine(enc,s,t){
    if(!enc||!s)return "";
    var id=enc.sourceTemplateId||enc.templateId||"";
    var causeMap={
      lost_item_accusation:["borrow_item","taking"],
      peer_conflict:["conflict","rejection","tease","taking","threat","physical"],
      social_exclusion:["rejection","exclusion"],
      teasing_boundary:["tease"],
      rough_play_boundary:["near_collision","physical"],
      teacher_defiance:["teacher_refusal","teacher_shout","teacher_insult","teacher_throw"],
      parent_friend_conflict:["conflict","rejection","tease","exclusion"],
      parent_child_first_blame:["conflict","rejection","tease","exclusion","taking","threat","physical"],
      parent_school_distrust_demand:["conflict","exclusion","taking","threat","physical","teacher_refusal","teacher_shout","teacher_insult","teacher_throw"],
      parent_disengaged_no_response:["missing_homework","forgotten_material","school_refusal_signal","late_arrival","encounter"],
      parent_achievement_pressure_score:["careless_fast_work","mistake_shutdown","test_blank_freeze","copies_homework","encounter"]
    };
    var kinds=causeMap[id]||null;
    var list=recentWorldEventsForStudent(s,kinds,4).filter(function(e){
      return e.day<dayIndex||e.time<gameMinute()-1;
    });
    if(t){
      list.sort(function(a,b){
        var ap=(a.actorId===t.id||a.targetId===t.id)?1:0,bp=(b.actorId===t.id||b.targetId===t.id)?1:0;
        return (bp-ap)||((b.day-a.day)||((b.time||0)-(a.time||0)));
      });
    }else{
      list.sort(function(a,b){return (b.day-a.day)||((b.time||0)-(a.time||0))});
    }
    var e=list[0];
    if(e){
      var age=Math.max(0,dayIndex-e.day),when=age===0?"조금 전":age===1?"어제":age+"일 전";
      return when+" · "+worldEventShortText(e);
    }
    if(enc.isFollowUp&&enc.previousDirection)return "지난번 · 비슷한 상황에서 "+enc.previousDirection+" 쪽으로 대응했다.";
    if(enc.storyId){
      var significant=recentWorldEventsForStudent(s,null,4).filter(function(x){return x.kind!=="borrow_item"&&(x.severity||0)>=.28}).sort(function(a,b){return (b.day-a.day)||((b.time||0)-(a.time||0))})[0];
      if(significant){
        var a2=Math.max(0,dayIndex-significant.day),w2=a2===0?"조금 전":a2===1?"어제":a2+"일 전";
        return w2+" · "+worldEventShortText(significant);
      }
    }
    return "";
  }
  function renderEncounter(){
    var overlay=q("#encounterOverlay");if(!overlay)return;
    if(!activeEncounter){overlay.hidden=true;return}
    overlay.hidden=false;
    var enc=activeEncounter,s=studentById(enc.studentId),t=studentById(enc.targetId);
    q("#encounterCategory").textContent=enc.category||current().name||"교실에서 생긴 일";
    q("#encounterKicker").textContent=enc.kicker||("Day "+dayIndex+" · "+current().name);
    var card=q("#encounterCard");if(card){card.classList.remove("followup","story")}
    renderEncounterPortrait(enc,s);
    var thread=q("#encounterThread"),threadText=encounterContextLine(enc,s,t);
    if(thread){thread.hidden=!threadText;thread.textContent=threadText||""}
    q("#encounterTitle").textContent=enc.title;
    q("#encounterText").textContent=enc.text;
    q("#encounterStudent").textContent=[s&&s.name,t&&t.name].filter(Boolean).join(" · ");
    var dialogue=q("#encounterDialogue");dialogue.hidden=!enc.dialogue;dialogue.textContent=enc.dialogue||"";
    ["up","down","left","right"].forEach(function(dir){
      var cap=dir.charAt(0).toUpperCase()+dir.slice(1),choice=enc.choices[dir];
      q("#encounterChoice"+cap).textContent=choice?choice.text:"";
      q("#encounterEffect"+cap).textContent="";
      var button=q('[data-encounter-dir="'+dir+'"]');if(button)button.disabled=!choice||enc.phase!=="choice";
    });
    q("#encounterResult").hidden=enc.phase!=="result";
    var reactionBox=q("#encounterReaction");if(reactionBox&&enc.phase!=="result"){reactionBox.hidden=true;reactionBox.textContent=""}
    q("#encounterCard").hidden=enc.phase==="result";
    qa(".encounter-choice").forEach(function(b){b.hidden=enc.phase==="result"});
    if(enc.phase==="choice")updateEncounterClock(performance.now());
  }
  function updateEncounterClock(now){
    if(!activeEncounter||activeEncounter.phase!=="choice"||!Number.isFinite(activeEncounter.deadline))return;
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
    var html=Object.keys(labels).filter(function(k){return (delta[k]||0)!==0}).slice(0,4).map(function(k){
      var d=delta[k]||0,cls=d>0?"up":"down";
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
    if(s&&enc.parentTrait)revealParentTrait(s,enc.parentTrait);
    if(enc.storyId)advanceStory(enc,dir);
    if(reaction.dialogue)setStudentSpeech(s,reaction.dialogue,reaction.tone,34);
    var after=s?studentDashboard(s,metricSubject):before,afterClass=classDashboard(),delta=before?dashboardDelta(before,after):{};
    var direction=dir==="timeout"?"시간 초과":ENCOUNTER_DIRECTIONS[dir].label;
    var history={
      day:dayIndex,time:gameMinute(),templateId:enc.templateId,sourceTemplateId:enc.sourceTemplateId||enc.templateId,encounterId:enc.id,studentId:enc.studentId,targetId:enc.targetId,
      dir:dir,direction:direction,title:enc.title,choice:choice.text,result:choice.result,reaction:reaction.text,responseFit:reaction.fit,before:before,after:after,delta:delta,
      beforeClass:beforeClass,afterClass:afterClass,familyEvent:!!enc.familyEvent,parentTrait:enc.parentTrait||null,safeguarding:!!enc.safeguarding,
      storyId:enc.storyId||null,storyArc:enc.storyArc||null,storyNode:enc.storyNode||null,storyStep:enc.storyStep||null,storyTotal:enc.storyTotal||null
    };
    encounterHistory.push(history);
    var encounterFact=s?recordWorldEvent("encounter",s,studentById(enc.targetId),{
      severity:enc.safeguarding?.90:enc.storyId?.62:enc.isFollowUp?.46:.34,
      text:enc.title+" · "+direction+" · "+choice.text,
      tags:["encounter",enc.sourceTemplateId||enc.templateId,dir].filter(Boolean),witnessMemory:false
    }):null;
    if(s){
      s.encounterNotes.unshift({day:dayIndex,time:gameMinute(),text:enc.title+" → "+direction+" · "+choice.text,dir:dir,delta:delta,isFollowUp:!!enc.isFollowUp});
      s.encounterNotes=s.encounterNotes.slice(0,8);
      remember(s,"그때 있었던 일: "+enc.title+" / "+direction,.56,{kind:"encounter",targetId:enc.targetId,valence:(delta.mood||0)>0?.18:(delta.mood||0)<0?-.18:0,severity:enc.safeguarding?.9:.36,sourceEventId:encounterFact&&encounterFact.id});
    }
    var decisionItem={
      day:dayIndex,stamp:fmtMin(gameMinute()),text:enc.title+" · "+(s?s.name:"")+" · "+direction,
      type:enc.isFollowUp?"followup_decision":"encounter_decision",scene:teacherScene,script:false,recordable:true,encounterDecision:true,isFollowUp:!!enc.isFollowUp,
      studentId:enc.studentId,targetId:enc.targetId,direction:direction,directionKey:dir,choiceText:choice.text,
      resultText:choice.result,studentReaction:reaction.text,responseFit:reaction.fit,studentTraits:s?traitLabels(s,5):[],parentTrait:enc.parentTrait||null,familyEvent:!!enc.familyEvent,safeguarding:!!enc.safeguarding,
      storyId:enc.storyId||null,storyArc:enc.storyArc||null,storyStep:enc.storyStep||null,storyTotal:enc.storyTotal||null,before:before,after:after,delta:delta,beforeClass:beforeClass,afterClass:afterClass,metricSubject:metricSubject
    };
    dayEvents.push(decisionItem);dayEvents=dayEvents.slice(-320);
    if(stats&&current().kind==="lesson")stats.events.push(decisionItem);
    if(enc.followUpId){
      var sourceJob=followUpQueue.find(function(j){return j.id===enc.followUpId});
      if(sourceJob)sourceJob.status="resolved";
    }
    scheduleFollowUp(enc,dir,choice);
    activeEncounter.phase="result";
    q("#encounterResultTitle").textContent=dir==="timeout"?"잠깐 망설이는 사이":"이렇게 해봤다 · "+direction;
    q("#encounterResultText").textContent=choice.result;
    var reactionBox=q("#encounterReaction");
    if(reactionBox){reactionBox.hidden=!reaction.text;reactionBox.textContent=reaction.text?"아이 반응 · "+reaction.text:""}
    q("#encounterResultStats").innerHTML=decisionDeltaHtml(delta,beforeClass,afterClass);
    renderEncounter();
  }
  function closeEncounter(){
    if(!activeEncounter)return;
    activeEncounter=null;q("#encounterOverlay").hidden=true;
    encounterPointer=null;
    advanceCardTurn();
    running=true;
    render();
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
    var d=studentDashboard(s),notes=(s.encounterNotes||[]).slice(0,5),responseNotes=responseDescriptor(s),knownParents=knownParentTraits(s);
    var queued=followUpQueue.filter(function(j){return j.status==="queued"&&j.studentId===s.id});
    var activeStories=activeStoryStates().filter(function(st){return st.studentId===s.id});
    var familyHtml='<div class="trait-panel"><strong>가정 소통 메모</strong><div class="trait-list">'+
      (knownParents.length?knownParents.map(function(x){return parentTraitChipHtml(x.id)}).join(""):'<span class="response-chip">아직 특별히 파악된 점 없음</span>')+
      '</div><small>보호자와 실제로 겪은 일을 통해 알게 된 내용만 표시됩니다.</small></div>';
    return '<div class="roster-detail"><h4>'+escHtml(s.name)+' · 현재 상태</h4>'+
      '<div class="trait-panel"><strong>기본 특성</strong><div class="trait-list">'+traitListHtml(s)+'</div><small>이런 모습은 어떤 일이 자주 생기는지, 선생님의 말을 어떻게 받아들이는지에도 영향을 줍니다.</small></div>'+familyHtml+
      '<div class="roster-detail-grid">'+
        '<div class="roster-stat"><strong>'+d.learning+'</strong><small>📚 학습</small></div>'+
        '<div class="roster-stat"><strong>'+d.focus+'</strong><small>🎯 집중</small></div>'+
        '<div class="roster-stat"><strong>'+d.mood+'</strong><small>🙂 정서</small></div>'+
        '<div class="roster-stat"><strong>'+d.relation+'</strong><small>🤝 관계</small></div>'+
        '<div class="roster-stat"><strong>'+d.trust+'</strong><small>❤️ 교사신뢰</small></div>'+
      '</div><div class="response-profile"><strong>이 아이가 편해하는 방식</strong><div>'+responseNotes.map(function(x){return '<span class="response-chip">'+escHtml(x)+'</span>'}).join("")+'</div></div>'+
      '<div class="roster-notes">'+(notes.length?notes.map(function(n){return '<div class="roster-note">Day '+(n.day||1)+' · '+fmtMin(n.time)+' · '+escHtml(n.text)+'</div>'}).join(""):'<div class="roster-note">아직 눈에 띄는 변화가 없습니다.</div>')+'</div>'+
      (queued.length?'<div class="roster-followup">📌 조금 더 지켜볼 일 '+queued.length+'건 · 가장 가까운 일정 Day '+Math.min.apply(null,queued.map(function(j){return j.dueDay}))+'</div>':'')+
      (activeStories.length?'<div class="roster-followup">최근 며칠의 변화가 이어지고 있어 조금 더 지켜보고 있습니다.</div>':'')+'</div>';
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
  function remember(s,text,weight,meta){
    if(!s)return;meta=meta||{};
    s.memory.unshift({
      day:dayIndex,time:gameMinute(),text:text,weight:weight||.5,
      kind:meta.kind||"note",targetId:meta.targetId===undefined?null:meta.targetId,
      actorId:meta.actorId===undefined?s.id:meta.actorId,valence:meta.valence||0,
      severity:meta.severity||0,sourceEventId:meta.sourceEventId||null,tags:(meta.tags||[]).slice()
    });
    s.memory=s.memory.slice(0,18);
  }
  function memorySocialBias(s,other){
    if(!s||!other||!s.memory)return 0;
    var sum=0;
    s.memory.forEach(function(m){
      if(m.targetId!==other.id)return;
      var age=Math.max(0,dayIndex-(m.day||dayIndex));if(age>WORLD_HISTORY_DAYS)return;
      var decay=Math.max(.18,1-age/(WORLD_HISTORY_DAYS+1));
      sum+=(m.valence||0)*(m.weight||.5)*decay;
      if((m.severity||0)>.65&&m.valence<0)sum-=.06*decay;
    });
    return clamp(sum,-.72,.50);
  }
  function memoryTension(s,other){return Math.max(0,-memorySocialBias(s,other))}
  function rememberPair(a,b,text,weight,valence,kind,severity){
    if(!a||!b)return;
    remember(a,text,weight,{kind:kind||"relationship",targetId:b.id,valence:valence||0,severity:severity||0});
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
      var r=relation(s,o),d=distance(s,o),mem=memorySocialBias(s,o),score=0;
      if(purpose==="COMPETE"){
        score=r.rivalry*.46+s.compete*.22+o.compete*.13+r.affinity*.08-r.irritation*.12+Math.max(0,-mem)*.10-d*.001;
      }else if(purpose==="HELP"){
        score=(1-currentMastery(o))*.32+o.helpNeed*.32+s.helpful*.20+r.affinity*.12-r.irritation*.18+mem*.12;
      }else{
        score=r.affinity*.56-r.irritation*.34+s.soc*.12+o.soc*.08+s.socialNeed*.12+mem*.42-d*.002;
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
    var candidates=students.filter(function(o){return o!==s&&o.scene===s.scene&&(relation(s,o).irritation>.23||memoryTension(s,o)>.16)});
    candidates.sort(function(a,b){return (relation(s,b).irritation+memoryTension(s,b)*.42)-(relation(s,a).irritation+memoryTension(s,a)*.42)});
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
    var remembered=memorySocialBias(target,s);
    return clamp(.20+r.affinity*.48+target.soc*.12+target.mood*.10+paired-r.irritation*.42+remembered*.38-size*.035);
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
    var rejectionEvent=recordWorldEvent("rejection",target,s,{severity:.32,text:target.name+"이(가) "+s.name+"의 합류를 거절함",tags:["social","rejection"]});
    remember(s,target.name+"에게 함께하자고 했지만 받아들여지지 않음",.58,{kind:"rejection",targetId:target.id,valence:-.58,severity:.32,sourceEventId:rejectionEvent&&rejectionEvent.id});
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
    var conflictEvent=recordWorldEvent("conflict",a,b,{severity:.55,text:a.name+"와 "+b.name+" 사이에 말다툼이 시작됨",tags:["conflict","peer"]});
    remember(a,b.name+"와 말다툼이 생김",.62,{kind:"conflict",targetId:b.id,valence:-.58,severity:.55,sourceEventId:conflictEvent&&conflictEvent.id});
    remember(b,a.name+"와 말다툼이 생김",.62,{kind:"conflict",targetId:a.id,valence:-.58,severity:.55,sourceEventId:conflictEvent&&conflictEvent.id});
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
    var severity={exclusion:.68,taking:.72,threat:.88,physical:.96,teacher_shout:.70,teacher_insult:.82,teacher_throw:.94}[kind]||.65;
    var worldEvent=recordWorldEvent(kind,actor,target,{severity:severity,text:text,tags:["serious",target?"peer":"teacher",kind]});
    actor.severeCooldown=gameSec+10*60;
    stats.seriousIncidents++;
    if(target){
      stats.peerHarm++;
      target.victimStress=clamp(target.victimStress+.18);
      target.mood=clamp(target.mood-.10);
      target.belonging=clamp(target.belonging-.07);
      remember(target,actor.name+"에게서 심각한 또래 갈등 행동을 겪음",.88,{kind:"victim",targetId:actor.id,valence:-1,severity:severity,sourceEventId:worldEvent&&worldEvent.id});
    }else{
      stats.teacherIncidents++;
      actor.teacherDefiance=clamp(actor.teacherDefiance+.12);
    }
    remember(actor,text,.82,{kind:"serious_action",targetId:target?target.id:null,valence:-.42,severity:severity,sourceEventId:worldEvent&&worldEvent.id});
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
      recordWorldEvent("borrow_item",s,p,{severity:.16,text:s.name+"이(가) "+p.name+"에게 준비물을 빌림",tags:["item","borrow"],witnessMemory:false});
      rememberPair(s,p,p.name+"에게 준비물을 빌림",.24,.12,"borrow_item",.16);
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
      var teaseEvent=recordWorldEvent("tease",s,p,{severity:.38,text:s.name+"이(가) "+p.name+"을(를) 놀림",tags:["peer","tease"]});
      remember(p,s.name+"의 놀림을 받음",.48,{kind:"tease",targetId:s.id,valence:-.52,severity:.38,sourceEventId:teaseEvent&&teaseEvent.id});
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
      recordWorldEvent("teacher_refusal",s,null,{severity:.44,text:s.name+"이(가) 교사의 안내를 거부함",tags:["teacher","defiance"]});
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
        var nearEvent=recordWorldEvent("near_collision",s,near,{severity:.28,text:s.name+"이(가) "+near.name+"과(와) 부딪힐 뻔함",tags:["play","safety"],witnessMemory:false});
        remember(s,"빠르게 움직이다 친구와 부딪힐 뻔함",.42,{kind:"near_collision",targetId:near.id,valence:-.18,severity:.28,sourceEventId:nearEvent&&nearEvent.id});
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

    applyTraitActionWeights(s,vals);
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

    if((s.roleUntil>gameSec||hasTrait(s,"helper"))&&Math.random()<(hasTrait(s,"helper")?.24:.38)){
      var helpTarget=chooseSocialTarget(s,"HELP");
      if(helpTarget&&(helpTarget.belonging<.5||helpTarget.helpNeed>.22||helpTarget.mood<.52)){beginPeerHelp(s,helpTarget);return}
    }

    var conflict=conflictPartner(s);
    if(conflict&&s.conflictUntil>gameSec&&s.frustration>.48&&s.react>.54&&Math.random()<.24*(1-teacherNear(s))){
      beginConflict(s,conflict,"쌓인 감정 때문에");return;
    }

    var socialThreshold=hasTrait(s,"friend_dependent")?.24:hasTrait(s,"social")?.30:.34;
    var socialChance=hasTrait(s,"friend_dependent")?.78:hasTrait(s,"social")?.70:.62;
    if(s.socialNeed>socialThreshold&&Math.random()<socialChance){
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
    choices=choices.map(function(row){return [row[0],Math.max(.001,row[1]*traitActionMultiplier(s,row[0]))]});
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
      var talkTrait=(hasTrait(s,"chatterbox")?.010:0)+(hasTrait(s,"social")?.004:0)+(hasTrait(s,"shy")?-.004:0);
      var moveTrait=(hasTrait(s,"distractible")?.004:0)+(hasTrait(s,"restless")?.009:0)+(hasTrait(s,"active")?.004:0);
      s.talkNeed=clamp(s.talkNeed+.018*s.soc+.014*(1-fit)+talkTrait);
      s.moveNeed=clamp(s.moveNeed+.016*s.move+moveTrait);
      var diagNode=currentKnowledgeNode(s);
      var repeatedGap=diagNode?Math.min(.08,diagNode.evidence*.012):0;
      var masteryNow=currentMastery(s);
      var helpTrait=(hasTrait(s,"foundational_gaps")?.007:0)+(hasTrait(s,"easily_discouraged")?.004:0)+(hasTrait(s,"independent")?-.004:0);
      s.helpNeed=clamp(s.helpNeed+.015*clamp(.69-masteryNow)+repeatedGap*.08+helpTrait);
      s.sleepNeed=clamp(s.sleepNeed+.006*(1-s.energy));
      s.socialNeed=clamp(s.socialNeed+.006*s.soc+(hasTrait(s,"friend_dependent")?.005:0));
      var boredTrait=(hasTrait(s,"distractible")?.004:0)+(hasTrait(s,"quick_learner")&&masteryNow>.78?.008:0)-(hasTrait(s,"persistent")?.003:0);
      s.boredom=clamp(s.boredom+.013*(1-fit)-.006*s.persist+boredTrait);
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
      s.talkNeed=clamp(s.talkNeed+.008*s.soc+(hasTrait(s,"chatterbox")?.006:0));
      s.moveNeed=clamp(s.moveNeed+.006*s.move+(hasTrait(s,"restless")?.004:0)+(hasTrait(s,"active")?.002:0));
      s.socialNeed=clamp(s.socialNeed+.012*s.soc-.004*s.belonging+(hasTrait(s,"friend_dependent")?.007:0));
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
    q("#reportSub").textContent=fmtMin(p.start)+"~"+fmtMin(Math.min(gameMinute(),p.end))+" · 이번 시간에 있었던 일과 달라진 점을 모았습니다.";
    q("#mDecisions").textContent=periodDecisions.length;
    q("#mRecords").textContent=recordEvents.length;
    q("#mAffected").textContent=affected.length;
    q("#mFlow").textContent=(flowDelta>0?"+":"")+flowDelta;

    var eventLines=periodDecisions.map(function(h){
      var s=studentById(h.studentId);
      return "<li><strong>"+fmtMin(h.time)+"</strong> "+escHtml(s?s.name:"학생")+" · "+escHtml(h.direction)+" · "+escHtml(h.title)+"</li>";
    });
    if(!eventLines.length)eventLines.push("<li>이 시간에는 특별히 멈춰 볼 만한 일이 없었습니다.</li>");
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
    if(!findings.length)findings.push("눈에 띄는 변화 없이 시간이 흘렀습니다.");
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
      return '<article class="record-entry followup_decision"><div class="record-entry-head"><time>'+dayLabel+escHtml(item.stamp||"")+'</time><span class="record-place">'+escHtml(place)+'</span></div>'+
        '<div class="record-summary">'+escHtml(item.text||"")+'</div>'+
        '<div class="record-stage">전에 선생님은 · '+escHtml(item.sourceDirection||"")+' · '+escHtml(item.sourceChoice||"")+'</div>'+
        '<div class="record-stage">'+escHtml(item.resultText||"")+'</div>'+
        (fdelta?'<div class="decision-deltas">'+fdelta+'</div>':'')+'</article>';
    }
    if(item.encounterDecision){
      var s=studentById(item.studentId),d=item.delta||{},before=item.before||{},after=item.after||{},labels={learning:"📚 학습"+(item.metricSubject?"("+item.metricSubject+")":""),focus:"🎯 집중",mood:"🙂 정서",relation:"🤝 관계",trust:"❤️ 신뢰"};
      var deltaHtml=Object.keys(labels).filter(function(k){return d[k]!==undefined&&d[k]!==0}).map(function(k){return '<span>'+labels[k]+' '+escHtml(before[k])+'→'+escHtml(after[k])+' ('+(d[k]>0?"+":"")+d[k]+')</span>'}).join("");
      var cb=item.beforeClass||{},ca=item.afterClass||{},classLabels={flow:"📖 흐름",relationship:"🏫 관계",stability:"🧭 안정",trust:"❤️ 학급신뢰"};
      var classDeltaHtml=Object.keys(classLabels).filter(function(k){return cb[k]!==undefined&&ca[k]!==undefined&&cb[k]!==ca[k]}).map(function(k){return '<span>'+classLabels[k]+' '+cb[k]+'→'+ca[k]+'</span>'}).join("");
      return '<article class="record-entry '+(item.isFollowUp?"followup_decision":"encounter_decision")+'"><div class="record-entry-head"><time>'+dayLabel+escHtml(item.stamp||"")+'</time><span class="record-place">'+escHtml(place)+'</span><span class="decision-philosophy">'+escHtml(item.direction||"판단")+'</span></div>'+
        '<div class="record-summary">'+escHtml(item.text||"")+'</div>'+
        (item.studentTraits&&item.studentTraits.length?'<div class="record-stage">그때 보인 특성 · '+escHtml(item.studentTraits.join(" · "))+'</div>':'')+
        (item.parentTrait&&parentTraitMeta(item.parentTrait)?'<div class="record-stage">'+(item.safeguarding?'학생보호 메모':'가정 소통에서 보인 점')+' · '+escHtml(parentTraitMeta(item.parentTrait).label)+'</div>':'')+
        ''+
        '<div class="record-stage">선생님은 · '+escHtml(item.choiceText||"")+'</div>'+
        (item.resultText?'<div class="record-stage">결과 · '+escHtml(item.resultText)+'</div>':'')+
        (item.studentReaction?'<div class="record-stage">아이 반응 · '+escHtml(item.studentReaction)+'</div>':'')+
        (deltaHtml?'<div class="decision-deltas">'+deltaHtml+'</div>':'')+
        (classDeltaHtml?'<div class="decision-deltas">'+classDeltaHtml+'</div>':'')+'</article>';
    }
    if(item.periodSummary){
      var names=(item.studentNames||[]).join(" · ");
      var memoHtml='<article class="record-entry period_summary"><div class="period-memo-title"><strong>🗒️ '+escHtml(item.periodName||"교시")+' 메모</strong><span>교시 종료 정리</span></div>'+
        '<div class="period-memo-meta">Day '+(item.day||1)+' · '+escHtml(item.periodRange||"")+(item.periodSubject?" · "+escHtml(item.periodSubject):"")+(names?" · 관련 학생 "+escHtml(names):"")+'</div>';
      if(item.highlights&&item.highlights.length)memoHtml+='<ul class="period-memo-list">'+item.highlights.map(function(x){return '<li>'+escHtml(x)+'</li>'}).join("")+'</ul>';
      if(item.responseSummary)memoHtml+='<div class="period-memo-response">선생님은 · '+escHtml(item.responseSummary)+'</div>';
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
        '<div class="tool-section"><h4>오늘 있었던 일</h4><div class="record-empty">오늘 판단 '+today.length+'회 · 조금 더 지켜볼 일 '+queuedFollowUps().length+'건 · 이번 시간 판단 '+currentCount+'회</div></div>';
      if(current().kind==="lesson")html+='<button class="tool-choice" type="button" data-computer-report="1"><strong>🗒️ 현재 교시 정리 보기</strong><small>이번 시간에 있었던 일과 달라진 점을 확인합니다.</small></button>';
      body.innerHTML=html;
    }else if(kind==="roster"){
      kicker.textContent="학급 명부";title.textContent="우리 반 상태";
      var cm=classDashboard();
      var roster='<div class="roster-summary">'+
        '<div><strong>'+cm.flow+'</strong><small>📖 수업 흐름</small></div>'+
        '<div><strong>'+cm.relationship+'</strong><small>🤝 학급 관계</small></div>'+
        '<div><strong>'+cm.stability+'</strong><small>🧭 생활 안정</small></div>'+
        '<div><strong>'+cm.trust+'</strong><small>❤️ 교사 신뢰</small></div></div>'+
        '<div class="tool-section"><h4>내가 자주 택한 방식</h4><div class="decision-deltas"><span>↑ 원칙 '+teacherStyleCounts.up+'</span><span>↓ 공감 '+teacherStyleCounts.down+'</span><span>← 코칭 '+teacherStyleCounts.left+'</span><span>→ 자율 '+teacherStyleCounts.right+'</span></div></div>'+
        '<div class="tool-section"><h4>요즘 모습</h4><div class="roster-table">'+
        '<div class="roster-head"><span>학생</span><span>📚 학습'+(current().kind==="lesson"?"("+escHtml(current().subject)+")":"(종합)")+'</span><span>🎯 집중</span><span>🙂 정서</span><span>🤝 관계</span><span>❤️ 신뢰</span></div>'+
        students.map(rosterRowHtml).join("")+'</div></div>'+rosterDetailHtml(s);
      body.innerHTML=roster;
    }else if(kind==="record"){
      kicker.textContent="우리 반 기록";title.textContent=s?s.name+" · 지금까지 기록":"우리 반 · 지금까지 기록";
      var items=dayEvents.filter(recordableEvent);
      if(s)items=items.filter(function(item){return item.studentId===s.id||item.targetId===s.id||(item.text&&item.text.indexOf(s.name)>=0)||(item.studentNames&&item.studentNames.indexOf(s.name)>=0)});
      items=items.slice(-90).reverse();
      var html='<div class="tool-section"><h4>우리 반에 있었던 일</h4><div class="record-list">'+(items.length?items.map(recordEntryHtml).join(""):'<div class="record-empty">아직 기록할 만한 판단이나 생활지도 상황이 없습니다.</div>')+'</div></div>';
      var wh=worldHistory.filter(function(e){
        var touches=!s||e.actorId===s.id||e.targetId===s.id||(e.witnessIds||[]).indexOf(s.id)>=0;
        if(!touches)return false;
        return s?true:((e.severity||0)>=.28||e.kind==="encounter");
      }).slice(-35).reverse();
      if(wh.length){
        html+='<div class="tool-section"><h4>최근 며칠의 연결된 사건</h4>'+wh.map(function(e){
          var a=studentById(e.actorId),t=studentById(e.targetId),w=(e.witnessIds||[]).map(studentById).filter(Boolean);
          var people=[a&&a.name,t&&t.name].filter(Boolean).join(" · ");
          return '<div class="record-student-memory">Day '+(e.day||1)+' · '+fmtMin(e.time||0)+' · '+escHtml(people)+(w.length?' · 주변에서 본 친구 '+w.length+'명':'')+'<br>'+escHtml(e.text||e.kind)+'</div>';
        }).join("")+'</div>';
      }
      if(s)html+='<div class="tool-section"><h4>'+escHtml(s.name)+' 누적 관찰</h4>'+(s.memory.length?s.memory.map(function(m){return '<div class="record-student-memory">Day '+(m.day||1)+' · '+fmtMin(m.time)+' · '+escHtml(m.text)+'</div>'}).join(""):'<div class="record-empty">아직 개별 기록이 없습니다.</div>')+'</div>';
      body.innerHTML=html;tutorialEvent("record");
    }
  }
  function openToolModal(kind){
    toolModalKind=kind;modalWasRunning=running;running=false;q("#toolModal").hidden=false;renderToolModal(kind);renderClassroomTools();
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
    running=true;scheduleNextEncounter(220,360);render();
  }
  function tutorialEvent(type){}
  function renderTutorial(){
    var overlay=q("#tutorialOverlay"),title=q("#tutorialTitle"),txt=q("#tutorialText"),btn=q("#tutorialButton");
    overlay.hidden=false;btn.hidden=false;qa(".tutorial-focus").forEach(function(x){x.classList.remove("tutorial-focus")});
    btn.dataset.tutorialAction=tutorialState.step>=3?"finish":"next";
    if(tutorialState.step===0){
      title.textContent="한 장씩, 우리 반의 하루를 만나보세요";
      txt.textContent="화면에 학생 얼굴과 함께 그 순간의 일이 나타납니다. 누가 어떤 아이인지 기억하면서 선생님이라면 어떻게 할지 골라보세요.";
      btn.textContent="다음";
    }else if(tutorialState.step===1){
      title.textContent="카드를 네 방향으로 움직여요";
      txt.textContent="위는 원칙, 아래는 공감, 왼쪽은 코칭, 오른쪽은 자율에 가까운 대응입니다. 늘 같은 방향이 좋은 건 아니고, 아이마다 받아들이는 방식도 다릅니다.";
      btn.textContent="다음";
    }else if(tutorialState.step===2){
      title.textContent="명부를 먼저 읽어두면 훨씬 쉬워요";
      txt.textContent="산만함, 충동적, 모범생, 완벽주의, 낯가림 같은 특성이 적혀 있습니다. 같은 말도 누구에게 하느냐에 따라 반응이 달라집니다.";
      btn.textContent="다음";
    }else{
      title.textContent="전에 한 선택은 나중에 다시 돌아옵니다";
      txt.textContent="오늘 가르쳐 준 말이나 풀어 준 갈등이 며칠 뒤 다른 모습으로 이어질 수 있습니다. 아이들의 얼굴과 이름을 기억해 두세요.";
      btn.textContent="첫날 시작";
    }
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
    q("#dayEndText").textContent="오늘은 "+today.length+"번 아이들 일에 멈춰 섰습니다. 오늘 했던 말과 선택은 내일도 아이들 모습에 남을 수 있습니다.";
    q("#dayEndMetrics").innerHTML=
      '<div class="day-end-metric"><strong>'+cm.flow+'</strong><small>📚 수업</small></div>'+
      '<div class="day-end-metric"><strong>'+cm.relationship+'</strong><small>🤝 관계</small></div>'+
      '<div class="day-end-metric"><strong>'+cm.stability+'</strong><small>🧭 생활</small></div>'+
      '<div class="day-end-metric"><strong>'+cm.trust+'</strong><small>❤️ 신뢰</small></div>';
    q("#dayEndStyles").innerHTML=
      '<div class="day-end-style"><span>↑ 원칙</span><strong>'+styles.up+'회</strong></div>'+
      '<div class="day-end-style"><span>↓ 공감</span><strong>'+styles.down+'회</strong></div>'+
      '<div class="day-end-style"><span>← 코칭</span><strong>'+styles.left+'회</strong></div>'+
      '<div class="day-end-style"><span>→ 자율</span><strong>'+styles.right+'회</strong></div>'+
      (styles.timeout?'<div class="day-end-style"><span>⌛ 망설임</span><strong>'+styles.timeout+'회</strong></div>':'');
    var upcoming=queued.slice().sort(function(a,b){return a.dueDay-b.dueDay}).slice(0,5);
    var followupHtml=upcoming.map(function(j){
      var s=studentById(j.studentId);
      return '<div class="day-end-followup"><span>Day '+j.dueDay+' · '+escHtml(s?s.name:"학생")+'</span><small>'+escHtml(j.sourceTitle)+'</small></div>';
    }).join("");
    q("#dayEndFollowups").innerHTML=followupHtml||'<div class="day-end-followup"><span>지금은 특별히 더 지켜볼 일이 없습니다.</span><small>내일은 또 다른 일이 생길 수 있습니다.</small></div>';
  }
  function endDay(){
    if(dayEnded)return;
    if(pendingEncounter&&pendingEncounter.followUpId){
      var pendingJob=followUpQueue.find(function(j){return j.id===pendingEncounter.followUpId});
      if(pendingJob){pendingJob.status="queued";pendingJob.dueDay=Math.max(dayIndex+1,pendingJob.dueDay)}
    }
    followUpQueue.forEach(function(j){if(j.status==="queued"&&j.dueDay<=dayIndex)j.dueDay=dayIndex+1});
    dayEnded=true;running=false;teacherTask=null;pendingEncounter=null;
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
    dayEncounterBudget=8+Math.floor(Math.random()*5);dayEncounterOffered=0;dayFollowUpsShown=0;dayFamilyEventsShown=0;dayStoryEventsShown=0;dayStoryStarterReady=Math.random()<.66;periodEncounterCounts={};
    selected=null;swapMode=false;connectMode=false;teacherTask=null;teacherScene="classroom";
    teacher.x=50;teacher.y=22;teacher.dx=50;teacher.dy=22;teacher.moving=false;
    feed=[];periodMemoKeys={};pendingEncounter=null;activeEncounter=null;encounterPointer=null;
    reportOpen=false;toolModalKind=null;lastBellAt=-99999;aiAccumulator=0;circleAccumulator=0;renderAccumulator=0;
    pruneWorldHistory();prepareNextDayStudents();rebuildSocialCircles();newStats();assignPeriodDestinations();
    var report=q("#report");if(report)report.hidden=true;
    var encounter=q("#encounterOverlay");if(encounter)encounter.hidden=true;
    var dayEnd=q("#dayEndOverlay");if(dayEnd)dayEnd.hidden=true;
    scheduleNextEncounter(220,360);
    log("다음 날 아침, 아이들이 다시 교실로 들어왔다.","ambient","classroom");
    render();
  }

  function escHtml(value){
    return String(value===undefined||value===null?"":value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function renderFeed(){ return; }
  function renderPanel(){ return; }
  function renderHeader(){
    var p=current(),cm=classDashboard();
    var dayEl=q("#dayNumber");if(dayEl)dayEl.textContent="Day "+dayIndex;
    var timeEl=q("#time");if(timeEl)timeEl.textContent=fmtMin(gameMinute());
    var periodEl=q("#periodName");if(periodEl)periodEl.textContent=p.name;
    var hud={hudFlow:cm.flow,hudRelation:cm.relationship,hudStability:cm.stability,hudTrust:cm.trust};
    Object.keys(hud).forEach(function(id){var el=q("#"+id);if(el)el.textContent=Math.round(hud[id])});
    var descriptions={
      morning:"아이들이 하나둘 교실로 들어온다.",
      lesson:(p.subject||"수업")+" 시간이 흐르고 있다.",
      break:"쉬는 시간, 여기저기서 작은 일이 생긴다.",
      lunch:"점심시간, 친구 사이 모습이 잘 보인다.",
      lunchplay:"점심 뒤 자유시간이 이어진다.",
      closing:"하루를 정리할 시간이다."
    };
    var desc=q("#periodDesc");if(desc)desc.textContent=descriptions[p.kind]||"우리 반의 하루가 흘러가고 있다.";
    var location=q("#locationName");if(location)location.textContent=SCENE_NAME[teacherScene]||"";
    var progress=q("#progress");if(progress)progress.style.width=(clamp((gameSec/60-p.start)/(p.end-p.start))*100)+"%";
  }
  function renderFrame(){
    renderHeader();
    renderClassroomTools();
  }
  function render(){
    renderHeader();
    renderClassroomTools();
  }
  function reset(){
    gameSec=520*60;periodIndex=0;dayIndex=1;dayEnded=false;daySummaries=[];followUpQueue=[];followUpSeq=0;storyQueue=[];storyStates={};storySeq=0;
    dayEncounterBudget=8+Math.floor(Math.random()*5);dayEncounterOffered=0;dayFollowUpsShown=0;dayFamilyEventsShown=0;dayStoryEventsShown=0;dayStoryStarterReady=Math.random()<.58;periodEncounterCounts={};
    running=true;selected=null;swapMode=false;connectMode=false;activeActionCategory="observe";teacherTask=null;teacherScene="classroom";
    teacher.x=50;teacher.y=22;teacher.dx=50;teacher.dy=22;teacher.moving=false;
    feed=[];dayEvents=[];worldHistory=[];worldHistorySeq=0;periodMemoKeys={};encounterHistory=[];pendingEncounter=null;activeEncounter=null;encounterSeq=0;encounterPointer=null;
    classMetrics={flow:72,relationship:68,stability:72,trust:64};teacherStyleCounts={up:0,down:0,left:0,right:0};
    reportOpen=false;armedActionId=null;armedActionTargetId=null;cardDragActive=false;
    cardTraySnapshot={targetId:null,ids:[],expiresAt:0,urgent:false};cardRenderSignature="";toolModalKind=null;lastBellAt=-99999;
    aiAccumulator=0;circleAccumulator=0;renderAccumulator=0;lastFrame=performance.now();
    resetRelations();resetStudents();rebuildSocialCircles();newStats();assignPeriodDestinations();
    var report=q("#report");if(report)report.hidden=true;
    var encounter=q("#encounterOverlay");if(encounter)encounter.hidden=true;
    var dayEnd=q("#dayEndOverlay");if(dayEnd)dayEnd.hidden=true;
    var tool=q("#toolModal");if(tool)tool.hidden=true;
    scheduleNextEncounter(220,360);
    log("아이들이 하나둘 교실로 들어왔다.","ambient","classroom");
    render();
  }
  function loop(now){
    if(!document.body.contains(app))return;
    var realDt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
    if(activeEncounter)updateEncounterClock(now);
    if(running&&!reportOpen&&!dayEnded){
      var speedEl=q("#speed"),speed=speedEl?Number(speedEl.value)||1:1;
      var gameDt=realDt*GAME_SECONDS_PER_REAL_SECOND*speed;
      gameSec+=gameDt;
      if(gameSec>=schedule[schedule.length-1].end*60){
        gameSec=schedule[schedule.length-1].end*60;endDay();
      }else if(handlePeriodChange()){
        updateAutoLessonPhase();
        updateTransit();updateTeacherTask();updateTeacherMovement(gameDt);updateSocialTracking(gameDt);updateMovement(gameDt);
        aiAccumulator+=gameDt;circleAccumulator+=gameDt;
        var guard=0;
        while(aiAccumulator>=AI_STEP_GAME_SECONDS&&guard<8){
          aiAccumulator-=AI_STEP_GAME_SECONDS;
          students.forEach(function(s){updateBehaviorLifecycle(s);updateStudent(s)});
          sampleStats();guard++;
        }
        if(circleAccumulator>=GROUP_STEP_GAME_SECONDS){
          circleAccumulator%=GROUP_STEP_GAME_SECONDS;rebuildSocialCircles();
        }
        renderAccumulator+=realDt;
        if(renderAccumulator>=.10){renderAccumulator=0;renderFrame()}
        maybeSpawnEncounter();
      }
    }
    requestAnimationFrame(loop);
  }

  qa("[data-class-tool]").forEach(function(b){
    b.addEventListener("click",function(){openToolModal(this.dataset.classTool)});
  });
  var closeTool=q("#closeToolModal");if(closeTool)closeTool.addEventListener("click",function(){closeToolModal(true);render()});
  var toolModal=q("#toolModal");if(toolModal)toolModal.addEventListener("click",function(e){if(e.target===this){closeToolModal(true);render()}});
  var toolBody=q("#toolModalBody");if(toolBody)toolBody.addEventListener("click",function(e){
    var rosterStudent=e.target.closest&&e.target.closest("[data-roster-student]");
    if(rosterStudent){selected=Number(rosterStudent.dataset.rosterStudent);renderToolModal("roster");return}
    var rep=e.target.closest&&e.target.closest("[data-computer-report]");
    if(rep){var wasRunning=modalWasRunning;closeToolModal(false);openReport(true);reportWasRunning=wasRunning;return}
  });
  var resetButton=q("#reset");if(resetButton)resetButton.addEventListener("click",reset);

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