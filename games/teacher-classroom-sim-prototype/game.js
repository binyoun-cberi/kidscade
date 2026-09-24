(function(){
  'use strict';

  var app=document.getElementById('app');
  if(!app)return;

  var q=function(s){return document.querySelector(s)};
  var qa=function(s){return Array.from(document.querySelectorAll(s))};
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
  var SAVE_KEY='kidscade.teacherDesk.v40';

  var students={
    minsu:{name:'민수',tone:'orange',icon:'🧒',base:'장난을 좋아하고 말보다 행동이 먼저 나오는 편',known:[]},
    jiwoo:{name:'지우',tone:'mint',icon:'👧',base:'친구와 이야기하는 것을 좋아하고 관계 변화에 민감함',known:[]},
    seoyeon:{name:'서연',tone:'purple',icon:'👧',base:'과제를 꼼꼼히 하며 틀리는 것을 크게 신경 쓰는 편',known:[]},
    taeho:{name:'태호',tone:'yellow',icon:'🧒',base:'과제를 시작할 때 시간이 조금 필요하고 도움을 먼저 청하기 어려워함',known:[]},
    junho:{name:'준호',tone:'red',icon:'🧒',base:'친구들 사이에서 앞장서는 일이 많고 승부 상황에 몰입하는 편',known:[]},
    arin:{name:'아린',tone:'mint',icon:'👧',base:'말수가 적고 불편한 일이 있어도 한동안 혼자 가지고 있는 편',known:[]}
  };

  var phases=[
    {start:510,end:540,label:'등교 준비',board:'좋은 아침!',hint:'1교시까지 {n}분'},
    {start:540,end:580,label:'1교시 · 수학',board:'수학 · 받아올림 있는 덧셈',hint:'수업 종료까지 {n}분'},
    {start:580,end:590,label:'쉬는 시간',board:'쉬는 시간',hint:'다음 수업까지 {n}분'},
    {start:590,end:630,label:'2교시 · 국어',board:'국어 · 중심 내용 찾기',hint:'수업 종료까지 {n}분'},
    {start:630,end:640,label:'쉬는 시간',board:'쉬는 시간',hint:'다음 수업까지 {n}분'},
    {start:640,end:680,label:'3교시 · 체육',board:'체육 · 협동 게임',hint:'수업 종료까지 {n}분'},
    {start:680,end:690,label:'쉬는 시간',board:'쉬는 시간',hint:'점심 전 {n}분'},
    {start:690,end:755,label:'점심 시간',board:'점심 시간',hint:'점심 종료까지 {n}분'},
    {start:755,end:820,label:'4교시 · 사회',board:'사회 · 우리 지역 읽기',hint:'수업 종료까지 {n}분'},
    {start:820,end:830,label:'쉬는 시간',board:'쉬는 시간',hint:'다음 수업까지 {n}분'},
    {start:830,end:870,label:'5교시 · 미술',board:'미술 · 재료로 표현하기',hint:'수업 종료까지 {n}분'},
    {start:870,end:890,label:'청소·종례',board:'하루 정리',hint:'하교까지 {n}분'},
    {start:890,end:990,label:'하교 후 업무',board:'아이들은 하교했습니다',hint:'퇴근 가능까지 {n}분'},
    {start:990,end:1050,label:'초과 근무',board:'조용해진 교실',hint:'조금 늦은 시간'}
  ];

  var taskDefs=[
    {id:'attendance',title:'출석 현황 제출',source:'교무',availableAt:525,due:570,duration:2,detail:'오늘 출결을 확인해 학교 시스템에 입력한다.'},
    {id:'fieldtrip',title:'현장체험학습 참가 여부 입력',source:'연구부',availableAt:560,due:660,duration:3,detail:'가정에서 받은 참가 여부를 확인해 입력한다.'},
    {id:'worksheets',title:'수학 활동지 8장 확인',source:'1교시',availableAt:580,due:900,duration:5,detail:'오늘 수학 활동지 중 확인이 필요한 8장을 살핀다.'},
    {id:'tomorrow',title:'내일 수업 자료 준비',source:'내일',availableAt:870,due:990,duration:4,detail:'내일 첫 수업에서 사용할 자료를 인쇄하고 정리한다.'}
  ];

  var eventDefs=[
    {
      id:'taeho_supply',type:'visitor',at:514,deadline:524,studentId:'taeho',role:'학생',name:'태호',
      stage:'등교한 태호가 가방을 몇 번 뒤지다가 교탁 앞으로 왔다.',
      dialogue:'선생님… 준비물을 집에 놓고 왔어요.',
      actions:[
        {id:'spare',label:'교실 여분 준비물을 건넨다',cost:1},
        {id:'ask',label:'어디서 준비가 끊겼는지 물어본다',cost:2},
        {id:'borrow',label:'친구에게 직접 빌려보라고 한다',cost:1}
      ]
    },
    {
      id:'arin_late_phone',type:'phone',at:519,deadline:523,studentId:'arin',role:'보호자 전화',name:'아린 보호자',
      stage:'등교 시간에 전화가 걸려왔다.',
      dialogue:'선생님, 아린이가 오늘 조금 늦을 것 같아요. 9시 전에는 도착할 것 같습니다.',
      actions:[
        {id:'late_note',label:'출석에 늦는다고 메모한다',cost:1},
        {id:'late_ok',label:'확인했다고 답하고 통화를 마친다',cost:.5}
      ]
    },
    {
      id:'minsu_pencil',type:'visitor',at:525,deadline:537,studentId:'minsu',role:'학생',name:'민수',
      stage:'민수가 색연필 통을 들고 빠르게 교탁으로 왔다.',
      dialogue:'선생님, 지우가 제 색연필 가져갔어요. 빨리 말해주세요.',
      actions:[
        {id:'listen',label:'민수 말부터 조금 더 듣는다',cost:1},
        {id:'both',label:'지우도 불러 둘 이야기를 듣는다',cost:3},
        {id:'return',label:'색연필부터 돌려주게 한다',cost:1},
        {id:'recess',label:'쉬는 시간에 다시 이야기하자고 한다',cost:.5}
      ]
    },
    {
      id:'taeho_math',type:'visitor',at:548,deadline:559,studentId:'taeho',role:'수업 중',name:'태호',
      stage:'수학 활동이 시작된 지 조금 지났다. 태호가 연필을 든 채 그대로 멈춰 있다.',
      dialogue:'선생님… 첫 문제부터 모르겠어요.',
      actions:[
        {id:'first',label:'첫 문제의 첫 단계만 같이 해본다',cost:3},
        {id:'hint',label:'어디부터 볼지 짧게 힌트만 준다',cost:1},
        {id:'peer',label:'옆 친구에게 한번 물어보게 한다',cost:1}
      ]
    },
    {
      id:'minsu_junho_noise',type:'classroom',at:556,deadline:565,studentId:'minsu',role:'교실',name:'민수 · 준호',
      stage:'설명하는 동안 교실 뒤쪽에서 웃음소리가 계속 들린다.',
      dialogue:'민수와 준호가 서로 눈을 마주치며 계속 웃고 있다.',
      actions:[
        {id:'signal',label:'가까이 가서 조용히 신호한다',cost:1},
        {id:'separate',label:'두 사람 자리를 잠깐 떨어뜨린다',cost:2},
        {id:'whole',label:'수업을 멈추고 전체에게 다시 안내한다',cost:2}
      ]
    },
    {
      id:'seoyeon_freeze',type:'visitor',at:563,deadline:575,studentId:'seoyeon',role:'수업 중',name:'서연',
      stage:'서연은 답을 썼다 지우기를 반복하다가 결국 활동지를 덮었다.',
      dialogue:'저 그냥 안 할래요. 자꾸 틀려요.',
      actions:[
        {id:'where',label:'어디에서 막혔는지 조용히 묻는다',cost:2},
        {id:'one',label:'한 문제만 같이 확인해보자고 한다',cost:2},
        {id:'finish',label:'일단 끝까지 해보라고 다시 시킨다',cost:1},
        {id:'rest',label:'잠깐 덮어두고 쉬게 한다',cost:1}
      ]
    },
    {
      id:'jiwoo_followup',type:'visitor',at:580,deadline:591,studentId:'jiwoo',role:'쉬는 시간',name:'지우',
      stage:'쉬는 시간이 되자 지우가 다른 친구들이 나간 뒤 교탁 옆에 남았다.',
      dialogue:'아까 민수가 제가 그냥 가져갔다고 했죠? 어제 빌려준다고 했었어요.',
      actions:[
        {id:'call_both',label:'민수도 다시 불러 둘 이야기를 맞춰본다',cost:3},
        {id:'hear',label:'지우가 기억하는 일을 더 들어본다',cost:1},
        {id:'end',label:'오늘은 여기까지 하고 자리로 돌려보낸다',cost:.5}
      ]
    },
    {
      id:'junho_recess',type:'visitor',at:620,deadline:631,studentId:'junho',role:'학생',name:'준호',
      stage:'준호가 약간 흥분한 목소리로 친구들보다 먼저 교탁으로 왔다.',
      dialogue:'선생님, 민수가 제가 반칙했다고 계속 뭐라 해요. 제가 먼저 안 그랬어요.',
      actions:[
        {id:'facts',label:'무슨 일이 있었는지 순서대로 말하게 한다',cost:2},
        {id:'minsu_too',label:'민수도 불러 함께 확인한다',cost:3},
        {id:'cool',label:'둘 다 잠깐 떨어져 쉬게 한다',cost:1}
      ]
    },
    {
      id:'seoyeon_parent',type:'phone',at:685,deadline:690,studentId:'seoyeon',role:'보호자 전화',name:'서연 보호자',
      stage:'점심 직전 전화가 걸려왔다.',
      dialogue:'서연이가 요즘 수학 때문에 많이 속상해하는 것 같아요. 학교에서는 어떤가요?',
      actions:[
        {id:'record_explain',label:'오늘 있었던 일을 확인하며 설명한다',cost:3},
        {id:'listen_parent',label:'집에서는 어떤 모습인지 먼저 묻는다',cost:2},
        {id:'callback',label:'조금 더 살펴보고 하교 후 다시 연락드린다',cost:1}
      ]
    },
    {
      id:'arin_lunch',type:'visitor',at:730,deadline:742,studentId:'arin',role:'점심 시간',name:'아린',
      stage:'급식을 거의 먹지 않은 아린이 조용히 교탁 가까이에 서 있다.',
      dialogue:'선생님… 그냥 오늘은 별로 안 먹고 싶어요.',
      actions:[
        {id:'ask_body',label:'배가 아픈지, 불편한 곳이 있는지 묻는다',cost:2},
        {id:'ask_reason',label:'무슨 일이 있었는지 조용히 기다려 묻는다',cost:2},
        {id:'eat_more',label:'조금만 더 먹어보라고 이야기한다',cost:1}
      ]
    },
    {
      id:'after_school_staff',type:'visitor',at:885,deadline:900,role:'동료 교사',name:'체육 선생님',
      stage:'아이들이 하교할 무렵 체육 선생님이 교실 문을 두드렸다.',
      dialogue:'오늘 준호랑 민수가 경기할 때 좀 과열됐어요. 큰일은 아니었는데 한번 알아두세요.',
      actions:[
        {id:'details',label:'어떤 장면이었는지 조금 더 듣는다',cost:2},
        {id:'thanks',label:'알려줘서 고맙다고 하고 메모해둔다',cost:1}
      ]
    },
    {
      id:'jiwoo_parent',type:'phone',at:930,deadline:936,studentId:'jiwoo',role:'보호자 전화',name:'지우 보호자',
      stage:'하교 후 교실 전화가 다시 울린다.',
      dialogue:'지우가 오늘 색연필 일 때문에 속상했다고 하던데, 학교에서는 무슨 일이 있었나요?',
      actions:[
        {id:'check_record',label:'기록을 확인하며 있었던 일을 설명한다',cost:3},
        {id:'memory',label:'기억나는 범위에서 바로 설명한다',cost:2},
        {id:'tomorrow_call',label:'내일 다시 확인하고 연락드리겠다고 한다',cost:1}
      ]
    }
  ];

  function freshState(){
    var taskStatus={};taskDefs.forEach(function(t){taskStatus[t.id]='open'});
    var eventStatus={};eventDefs.forEach(function(e){eventStatus[e.id]='pending'});
    return {
      minute:510,lastReal:performance.now(),activeEvent:null,resultEvent:null,resultData:null,
      backlog:[],incomingPhone:null,eventStatus:eventStatus,deferUntil:{},
      flags:{},records:[],recordDrafts:[],notes:[],taskStatus:taskStatus,dynamicTasks:[],
      openedStudents:{},overtime:false,endPrompted:false,finished:false,tutorialStep:0,tutorialDone:false,
      saveStamp:Date.now()
    };
  }

  var state=freshState();

  function load(){
    try{
      var raw=localStorage.getItem(SAVE_KEY);if(!raw)return;
      var saved=JSON.parse(raw);if(!saved||typeof saved.minute!=='number')return;
      state=Object.assign(freshState(),saved);
      state.lastReal=performance.now();
    }catch(e){}
  }
  function save(){
    try{state.saveStamp=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch(e){}
  }
  function resetGame(){
    try{localStorage.removeItem(SAVE_KEY)}catch(e){}
    state=freshState();
    state.tutorialDone=true;
    q('#tutorial').hidden=true;
    q('#dayEnd').hidden=true;
    closeModal();
    renderAll();
    toast('첫날을 다시 시작했습니다.');
    save();
  }

  function fmtTime(minute){
    var m=Math.floor(minute),h=Math.floor(m/60),mm=m%60;
    return String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  }
  function currentPhase(){
    for(var i=0;i<phases.length;i++)if(state.minute>=phases[i].start&&state.minute<phases[i].end)return phases[i];
    return phases[phases.length-1];
  }
  function phaseHint(p){
    if(state.minute>=990)return p.hint;
    var n=Math.max(0,Math.ceil(p.end-state.minute));
    return p.hint.replace('{n}',n);
  }
  function student(id){return id&&students[id]?students[id]:null}
  function discover(id,text){
    var s=student(id);if(!s||!text)return;
    if(s.known.indexOf(text)<0)s.known.push(text);
  }
  function hasRecordFor(id,needle){
    return state.records.some(function(r){return (!id||r.studentIds.indexOf(id)>=0)&&(!needle||r.text.indexOf(needle)>=0)});
  }
  function addDraft(id,title,text,studentIds){
    if(state.recordDrafts.some(function(d){return d.id===id})||state.records.some(function(r){return r.draftId===id}))return;
    state.recordDrafts.push({id:id,title:title,text:text,studentIds:studentIds||[],createdAt:state.minute});
  }
  function addRecordFromDraft(id){
    var idx=state.recordDrafts.findIndex(function(d){return d.id===id});if(idx<0)return;
    var d=state.recordDrafts[idx];
    consumeMinutes(1,'기록 작성');
    state.records.push({draftId:d.id,minute:state.minute,text:d.text,studentIds:d.studentIds.slice(),title:d.title});
    state.recordDrafts.splice(idx,1);
    toast('기록철에 남겼습니다.','',false);
    save();renderAll();renderModal('record');
  }
  function addDynamicTask(id,title,due,duration,detail){
    if(state.dynamicTasks.some(function(t){return t.id===id}))return;
    state.dynamicTasks.push({id:id,title:title,source:'후속',availableAt:state.minute,due:due,duration:duration,detail:detail});
    state.taskStatus[id]='open';
  }
  function allTasks(){return taskDefs.concat(state.dynamicTasks)}
  function availableTasks(){
    return allTasks().filter(function(t){return t.availableAt<=state.minute});
  }

  function toast(title,text,warn){
    var box=document.createElement('div');box.className='toast'+(warn?' warn':'');
    box.innerHTML='<strong>'+escapeHtml(title)+'</strong>'+(text?'<span>'+escapeHtml(text)+'</span>':'');
    q('#toastStack').appendChild(box);
    setTimeout(function(){box.remove()},3600);
  }
  function escapeHtml(v){
    return String(v===undefined||v===null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function beep(kind){
    try{
      var A=window.AudioContext||window.webkitAudioContext;if(!A)return;
      var ctx=new A(),o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);o.frequency.value=kind==='phone'?640:440;g.gain.value=.04;o.start();
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);o.stop(ctx.currentTime+.2);
    }catch(e){}
  }

  function eventDef(id){return eventDefs.find(function(e){return e.id===id})||null}
  function eventCondition(e){
    if(e.id==='jiwoo_followup')return state.eventStatus.minsu_pencil==='done'||state.flags.pencilDeferred;
    if(e.id==='seoyeon_parent')return state.eventStatus.seoyeon_freeze==='done';
    if(e.id==='jiwoo_parent')return state.eventStatus.minsu_pencil==='done'||state.eventStatus.jiwoo_followup==='done';
    return true;
  }
  function pushBacklog(id){
    if(state.backlog.indexOf(id)<0)state.backlog.push(id);
  }
  function removeBacklog(id){state.backlog=state.backlog.filter(function(x){return x!==id})}

  function processEvents(){
    eventDefs.forEach(function(e){
      if(state.eventStatus[e.id]!=='pending'||state.minute<e.at)return;
      if(!eventCondition(e)){state.eventStatus[e.id]='skipped';return}
      if(e.type==='phone'&&!state.incomingPhone){
        state.eventStatus[e.id]='ringing';state.incomingPhone=e.id;beep('phone');
        toast('전화가 울립니다.',e.name+' · '+fmtTime(state.minute),false);
      }else{
        state.eventStatus[e.id]='waiting';pushBacklog(e.id);
        toast(e.name+'이(가) 기다립니다.',e.stage,false);
      }
    });

    eventDefs.forEach(function(e){
      var st=state.eventStatus[e.id];
      if((st==='waiting'||st==='ringing')&&state.minute>e.deadline){
        missEvent(e);
      }
    });

    if(!state.activeEvent&&!state.resultEvent&&!q('#toolModal').hidden===false)return;
    if(!state.activeEvent&&!state.resultEvent&&q('#toolModal').hidden&&!state.finished){
      var ready=state.backlog.find(function(id){return (state.deferUntil[id]||0)<=state.minute});
      if(ready)openEvent(ready);
    }
  }

  function missEvent(e){
    if(state.eventStatus[e.id]==='done'||state.eventStatus[e.id]==='missed')return;
    state.eventStatus[e.id]='missed';removeBacklog(e.id);
    if(state.incomingPhone===e.id)state.incomingPhone=null;
    if(state.activeEvent===e.id)state.activeEvent=null;
    state.deferUntil[e.id]=0;
    if(e.id==='arin_late_phone'){
      state.flags.arinLateCallMissed=true;
      addDynamicTask('call_arin_parent','아린 보호자 부재중 전화 확인',620,2,'등교 시간에 온 전화를 받지 못했다. 늦은 이유와 출결을 확인한다.');
    }else if(e.id==='minsu_pencil'){
      state.flags.pencilUnresolved=true;addDraft('pencil_unresolved','민수·지우 색연필 문제','색연필 문제를 바로 확인하지 못해 두 학생 사이에 불편함이 남음.',['minsu','jiwoo']);
    }else if(e.id==='seoyeon_freeze'){
      state.flags.seoyeonMissed=true;discover('seoyeon','힘들 때 먼저 도움을 청하기보다 과제를 덮어버릴 때가 있음');
    }else if(e.id==='jiwoo_parent'){
      addDynamicTask('call_jiwoo_parent','지우 보호자 다시 연락',1020,3,'색연필 일과 관련한 보호자 전화를 받지 못했다.');
    }
    toast(e.name+'을(를) 놓쳤습니다.','그 일이 사라진 것은 아닙니다.',true);
  }

  function openEvent(id){
    var e=eventDef(id);if(!e)return;
    if(state.activeEvent&&state.activeEvent!==id)pushBacklog(state.activeEvent);
    removeBacklog(id);state.activeEvent=id;state.deferUntil[id]=0;
    if(state.eventStatus[id]!=='ringing')state.eventStatus[id]='active';
    renderVisitor();
  }
  function answerPhone(){
    if(!state.incomingPhone){renderModal('phone');return}
    var id=state.incomingPhone;
    if(state.activeEvent&&state.activeEvent!==id){
      state.eventStatus[state.activeEvent]='waiting';pushBacklog(state.activeEvent);
    }
    state.incomingPhone=null;state.activeEvent=id;state.eventStatus[id]='active';
    toast('전화를 받았습니다.',eventDef(id).name,false);renderAll();
  }
  function deferActive(){
    if(!state.activeEvent)return;
    var id=state.activeEvent,e=eventDef(id);if(!e)return;
    state.activeEvent=null;state.eventStatus[id]='waiting';state.deferUntil[id]=state.minute+8;pushBacklog(id);
    if(id==='minsu_pencil')state.flags.pencilDeferred=true;
    toast(e.name+'에게 잠깐 기다려 달라고 했습니다.','8분 뒤 다시 떠올립니다.',false);
    consumeMinutes(.5,'잠시 미루기');save();renderAll();
  }

  function actionResult(e,action){
    var key=e.id+':'+action.id;
    var out={title:'이 일은 일단 지나갔다.',text:'완전히 끝난 일인지 아닌지는 조금 더 지켜봐야 한다.'};

    if(key==='taeho_supply:spare'){
      state.flags.taehoSpare=true;discover('taeho','준비물이 없을 때 교사에게 조심스럽게 도움을 요청함');
      out={title:'태호가 안도한 표정으로 자리로 돌아갔다.',text:'오늘 활동은 바로 시작할 수 있게 됐다. 준비물을 잊은 이유까지는 아직 알 수 없다.'};
    }
    if(key==='taeho_supply:ask'){
      state.flags.taehoMorningHard=true;discover('taeho','아침에 혼자 준비물을 챙기는 과정이 자주 끊길 수 있음');
      out={title:'태호가 한참 생각하다가 말했다.',text:'“어제 가방 옆에 놔뒀는데 아침에 그냥 나왔어요.” 준비물을 챙기는 순서가 아직 익숙하지 않은 듯하다.'};
      addDraft('taeho_supply','태호 준비물 누락','준비물을 집에 두고 옴. 아침 준비 순서를 스스로 챙기는 데 어려움이 있는지 더 살펴보기.',['taeho']);
    }
    if(key==='taeho_supply:borrow'){
      state.flags.taehoBorrow=true;discover('taeho','필요한 것이 있을 때 친구에게 먼저 말 거는 것을 어려워하지만 시도는 가능함');
      out={title:'태호가 옆자리 친구에게 천천히 다가갔다.',text:'교탁에 다시 오지는 않았다. 친구에게 직접 부탁하는 데에는 시간이 조금 걸렸다.'};
    }

    if(key==='arin_late_phone:late_note'){
      state.flags.arinLateNoted=true;discover('arin','오늘 아침 가정 사정으로 늦게 등교함');
      out={title:'출석부 옆에 짧게 메모했다.',text:'나중에 출결을 입력할 때 이유를 다시 떠올릴 수 있다.'};
    }
    if(key==='arin_late_phone:late_ok'){
      state.flags.arinLateKnown=true;
      out={title:'짧은 통화를 마쳤다.',text:'아린이가 늦는다는 사실은 알고 있지만 별도 메모는 남기지 않았다.'};
    }

    if(key==='minsu_pencil:listen'){
      state.flags.pencilListenedMinsu=true;discover('minsu','친구 물건 문제에서 자기 입장을 빠르게 교사에게 말하는 편');
      out={title:'민수는 자기 말이 끝날 때까지 빠르게 설명했다.',text:'민수는 “지우가 물어보지도 않고 가져갔다”고 말했다. 아직 지우 쪽 이야기는 듣지 않았다.'};
      addDraft('pencil_issue','민수·지우 색연필 문제','민수가 지우가 허락 없이 색연필을 가져갔다고 이야기함. 지우 쪽 설명은 아직 확인하지 않음.',['minsu','jiwoo']);
    }
    if(key==='minsu_pencil:both'){
      state.flags.pencilBoth=true;discover('minsu','억울하다고 느끼면 바로 교사에게 확인을 요구하는 편');discover('jiwoo','친구와 약속했다고 생각한 내용과 실제 상대의 기억이 다를 때가 있음');
      out={title:'둘의 기억이 조금 달랐다.',text:'지우는 어제 빌려도 된다고 들었다고 했고, 민수는 오늘도 된다는 뜻은 아니었다고 했다. 색연필은 돌려줬지만 둘 다 완전히 납득한 표정은 아니다.'};
      addDraft('pencil_issue','민수·지우 색연필 문제','색연필 사용 약속에 대한 두 학생의 기억이 달랐음. 물건 사용 전 다시 묻는 것으로 정리함.',['minsu','jiwoo']);
    }
    if(key==='minsu_pencil:return'){
      state.flags.pencilReturned=true;discover('minsu','물건 문제를 빠르게 해결해 주길 바라는 편');
      out={title:'색연필은 바로 민수에게 돌아갔다.',text:'물건 문제는 끝났지만 지우는 잠깐 입을 다물었다. 왜 가져갔는지는 확인하지 않았다.'};
      addDraft('pencil_issue','민수·지우 색연필 문제','지우가 사용하던 민수의 색연필을 바로 돌려주게 함. 두 학생의 약속 내용은 확인하지 못함.',['minsu','jiwoo']);
    }
    if(key==='minsu_pencil:recess'){
      state.flags.pencilDeferred=true;
      out={title:'민수는 조금 불만스러운 표정으로 자리로 돌아갔다.',text:'수업 준비는 이어갈 수 있게 됐지만 쉬는 시간에 이 이야기가 다시 돌아올 가능성이 있다.'};
    }

    if(key==='taeho_math:first'){
      state.flags.taehoFirstStep=true;discover('taeho','문제를 잘게 나누어 첫 단계만 함께 시작하면 이후에는 혼자 이어가는 편');
      out={title:'첫 줄을 같이 쓰자 태호가 다음 계산은 혼자 이어갔다.',text:'세 문제를 다 봐준 것은 아니지만 시작하는 방법은 잡은 듯하다.'};
    }
    if(key==='taeho_math:hint'){
      state.flags.taehoHint=true;discover('taeho','힌트가 구체적이면 스스로 다시 시도함');
      out={title:'태호가 문제를 다시 들여다보기 시작했다.',text:'바로 정답을 내지는 못했지만 연필을 다시 움직였다.'};
    }
    if(key==='taeho_math:peer'){
      state.flags.taehoPeer=true;discover('taeho','친구에게 도움을 청할 때 먼저 망설이는 시간이 있음');
      out={title:'태호가 옆 친구에게 작은 목소리로 물었다.',text:'친구 설명을 듣고 문제를 다시 쓰기 시작했다.'};
    }

    if(key==='minsu_junho_noise:signal'){
      state.flags.noiseSignal=true;discover('minsu','교사가 가까이 오면 긴 설명 없이도 행동을 금방 바꾸는 편');discover('junho','친구가 장난을 시작하면 같이 분위기에 올라타기 쉬움');
      out={title:'둘 다 잠깐 웃음을 멈추고 책을 봤다.',text:'수업 전체를 끊지는 않았다. 다만 서로 눈이 마주치면 다시 웃을 듯한 분위기는 남아 있다.'};
    }
    if(key==='minsu_junho_noise:separate'){
      state.flags.noiseSeparated=true;
      out={title:'둘이 떨어지자 교실은 빠르게 조용해졌다.',text:'민수는 새 자리에서도 뒤를 한 번 돌아봤다. 지금 수업은 이어가기 쉬워졌다.'};
    }
    if(key==='minsu_junho_noise:whole'){
      state.flags.wholeStopped=true;
      out={title:'교실 전체가 조용해졌다.',text:'민수와 준호뿐 아니라 다른 학생들도 하던 일을 멈추고 교사를 바라봤다.'};
    }

    if(key==='seoyeon_freeze:where'){
      state.flags.seoyeonAsked=true;discover('seoyeon','틀린 답 자체보다 “또 틀릴까 봐” 시작을 멈추는 때가 있음');
      out={title:'서연은 답보다 틀리는 게 싫다고 말했다.',text:'문제를 몰라서라기보다 틀렸다는 표시가 남는 것을 더 힘들어하는 듯하다.'};
      addDraft('seoyeon_math','서연 수학 활동 중단','답을 여러 번 지우다 활동지를 덮음. 틀리는 것에 대한 부담을 크게 표현함.',['seoyeon']);
    }
    if(key==='seoyeon_freeze:one'){
      state.flags.seoyeonOne=true;discover('seoyeon','부담을 한 문제로 줄이면 다시 참여하기 쉬움');
      out={title:'한 문제만 다시 보자 서연이 활동지를 펼쳤다.',text:'남은 문제를 모두 하겠다고 하지는 않았지만 연필을 다시 들었다.'};
      addDraft('seoyeon_math','서연 수학 활동 중단','틀린 문제 때문에 활동지를 덮었으나 한 문제만 다시 보자고 하자 활동을 재개함.',['seoyeon']);
    }
    if(key==='seoyeon_freeze:finish'){
      state.flags.seoyeonPushed=true;discover('seoyeon','틀리는 것에 대한 부담이 커지면 말수가 줄어듦');
      out={title:'서연은 말없이 활동지를 다시 펼쳤다.',text:'손은 다시 움직였지만 지우개를 쓰는 시간이 더 길어졌다.'};
      addDraft('seoyeon_math','서연 수학 활동 중단','수학 활동을 덮었다가 다시 끝까지 해보도록 안내함. 이후 말수가 줄고 지우개 사용이 잦았음.',['seoyeon']);
    }
    if(key==='seoyeon_freeze:rest'){
      state.flags.seoyeonRest=true;
      out={title:'서연은 활동지를 옆으로 밀어두고 잠깐 쉬었다.',text:'표정은 조금 풀렸지만 오늘 문제를 다시 시작할지는 아직 모르겠다.'};
    }

    if(key==='jiwoo_followup:call_both'){
      state.flags.pencilRevisited=true;discover('jiwoo','오해가 생기면 나중에라도 자기 이야기를 다시 설명하려는 편');
      out={title:'이번에는 어제의 약속까지 다시 맞춰봤다.',text:'둘 다 “빌릴 때마다 다시 물어보기”로 정리했다. 바로 친해진 것은 아니지만 같은 이야기를 공유하게 됐다.'};
      addDraft('pencil_issue2','민수·지우 색연필 후속','쉬는 시간에 두 학생의 설명을 다시 확인함. 물건을 빌릴 때마다 다시 허락을 구하기로 정리.',['minsu','jiwoo']);
    }
    if(key==='jiwoo_followup:hear'){
      state.flags.jiwooHeard=true;discover('jiwoo','억울하다고 느낀 일을 쉬는 시간까지 기억하고 다시 이야기함');
      out={title:'지우는 어제 있었던 일을 자세히 설명했다.',text:'민수가 어떻게 기억하는지는 아직 확인하지 않았지만 지우가 왜 속상했는지는 알게 됐다.'};
    }
    if(key==='jiwoo_followup:end'){
      state.flags.pencilUnresolved=true;
      out={title:'지우는 “네…” 하고 밖으로 나갔다.',text:'색연필 일은 오늘 기록이나 이후 전화에서 다시 떠오를 수 있다.'};
    }

    if(key==='junho_recess:facts'){
      state.flags.junhoFacts=true;discover('junho','승부가 걸리면 자기 행동보다 상대 행동을 먼저 설명하는 경향이 있음');
      out={title:'준호가 경기 순서를 하나씩 다시 말했다.',text:'말을 천천히 시키자 처음보다 목소리가 낮아졌다. 민수와 다른 부분은 아직 확인하지 않았다.'};
    }
    if(key==='junho_recess:minsu_too'){
      state.flags.recessBoth=true;discover('junho','경쟁 상황에서 민수와 서로 자극을 주고받기 쉬움');discover('minsu','승부 상황에서 준호와 말이 거칠어질 수 있음');
      out={title:'둘은 서로 다른 장면을 먼저 기억하고 있었다.',text:'누가 먼저였는지 결론 내리기보다 경기 중 지켜야 할 선을 다시 정리했다.'};
      addDraft('recess_game','민수·준호 놀이 갈등','경기 중 반칙 여부로 언쟁. 두 학생의 설명을 듣고 경기 중 말과 행동 기준을 다시 확인함.',['minsu','junho']);
    }
    if(key==='junho_recess:cool'){
      state.flags.recessSeparated=true;
      out={title:'둘이 떨어져 쉬면서 큰 언쟁은 멈췄다.',text:'감정은 내려갔지만 서로가 맞다고 생각하는 부분은 그대로 남아 있다.'};
    }

    if(key==='seoyeon_parent:record_explain'){
      var has=hasRecordFor('seoyeon');
      if(has){
        out={title:'기록을 보며 구체적으로 설명할 수 있었다.',text:'오늘 어떤 장면에서 활동을 멈췄는지와 교실에서 보인 반응을 차분하게 전달했다.'};
      }else{
        out={title:'기억을 더듬어 설명했다.',text:'큰 흐름은 이야기했지만 정확히 어떤 말을 했는지 확인할 기록이 없어 설명이 조금 두루뭉술해졌다.'};
      }
      state.flags.seoyeonParentTalk=true;
    }
    if(key==='seoyeon_parent:listen_parent'){
      discover('seoyeon','집에서도 틀린 문제를 오래 지우거나 시작을 미루는 모습이 있다고 보호자가 이야기함');
      state.flags.seoyeonHomeInfo=true;
      out={title:'보호자의 이야기를 먼저 들었다.',text:'집에서도 비슷한 모습이 있다는 것을 알게 됐다. 학교에서 본 장면과 연결해 더 살펴볼 근거가 생겼다.'};
    }
    if(key==='seoyeon_parent:callback'){
      addDynamicTask('seoyeon_callback','서연 보호자 다시 연락',960,3,'오늘 수학 시간 모습을 조금 더 정리한 뒤 보호자에게 다시 연락한다.');
      out={title:'하교 후 다시 연락하기로 했다.',text:'당장은 통화를 짧게 끝냈지만 오늘 해야 할 일이 하나 더 생겼다.'};
    }

    if(key==='arin_lunch:ask_body'){
      state.flags.arinBodyAsked=true;discover('arin','점심을 거의 먹지 않은 날이 있었고 몸 상태를 먼저 물으면 짧게라도 답함');
      out={title:'아린은 배가 아픈 건 아니라고 했다.',text:'몸이 아픈 것보다는 오늘 입맛이 없고 조금 피곤하다고 말했다.'};
      addDraft('arin_lunch','아린 점심 섭취 적음','점심을 거의 먹지 않음. 복통은 없다고 했고 피곤하다고 표현함.',['arin']);
    }
    if(key==='arin_lunch:ask_reason'){
      state.flags.arinTalked=true;discover('arin','친구 일로 마음이 불편해도 먼저 말하지 않고 조용히 있는 편');
      out={title:'잠시 기다리자 아린이 아주 작게 말했다.',text:'아침에 친구와 조금 어색한 일이 있었고 그 뒤로 기분이 좋지 않았다고 했다.'};
      addDraft('arin_lunch','아린 점심시간 관찰','점심을 거의 먹지 않음. 기다려 묻자 아침 친구 관계로 기분이 좋지 않았다고 이야기함.',['arin']);
    }
    if(key==='arin_lunch:eat_more'){
      state.flags.arinEatPrompt=true;
      out={title:'아린은 두세 숟가락을 더 먹었다.',text:'먹는 양은 조금 늘었지만 왜 먹기 싫었는지는 알지 못했다.'};
    }

    if(key==='after_school_staff:details'){
      discover('junho','체육 경기에서 민수와 경쟁이 과열되면 몸과 말이 모두 커질 수 있음');discover('minsu','체육 경기에서 준호와 경쟁이 과열되는 모습이 있었음');
      out={title:'체육 시간 상황을 조금 더 들었다.',text:'둘이 공을 두고 밀착하다가 말이 세졌지만 신체 싸움으로 번지지는 않았다고 했다.'};
      addDraft('pe_staff','민수·준호 체육시간 전달','체육 교사에게 두 학생의 경기 중 과열 상황을 전달받음. 큰 충돌은 없었으나 경쟁 상황을 계속 살펴볼 필요.',['minsu','junho']);
    }
    if(key==='after_school_staff:thanks'){
      out={title:'간단히 메모해두고 이야기를 마쳤다.',text:'큰 사건으로 보지는 않았지만 다음 체육 활동 때 두 학생을 한 번 더 살펴볼 수 있다.'};
      addDraft('pe_staff','민수·준호 체육시간 전달','체육 시간에 두 학생의 경쟁이 다소 과열되었다는 전달을 받음.',['minsu','junho']);
    }

    if(key==='jiwoo_parent:check_record'){
      var rec=hasRecordFor('jiwoo','색연필')||hasRecordFor('minsu','색연필');
      if(rec){
        out={title:'기록 덕분에 당시 흐름을 순서대로 설명했다.',text:'누가 무엇을 말했고 어디까지 확인했는지 구분해서 전달할 수 있었다.'};
      }else{
        out={title:'기록철을 펼쳤지만 색연필 일은 남아 있지 않았다.',text:'기억에 의존해 설명했고, 확인하지 못한 부분은 내일 다시 살펴보기로 했다.'};
        addDynamicTask('jiwoo_follow_check','지우·민수 색연필 일 다시 확인',1010,3,'보호자 통화 뒤 두 학생의 설명과 당시 상황을 다시 확인한다.');
      }
    }
    if(key==='jiwoo_parent:memory'){
      out={title:'기억나는 범위에서 바로 설명했다.',text:'통화는 끝났지만 당시 두 학생의 말 중 어느 부분까지 확인했는지가 조금 흐릿하다.'};
    }
    if(key==='jiwoo_parent:tomorrow_call'){
      addDynamicTask('jiwoo_parent_callback','지우 보호자 내일 다시 연락',1050,3,'색연필 일을 다시 확인한 뒤 보호자에게 연락한다.');
      out={title:'내일 다시 연락하기로 했다.',text:'오늘 해결하지 않은 일이 내일 일정으로 넘어갔다.'};
    }

    return out;
  }

  function resolveAction(actionId){
    var e=eventDef(state.activeEvent);if(!e)return;
    var action=e.actions.find(function(a){return a.id===actionId});if(!action)return;
    consumeMinutes(action.cost||0,e.name+' 대응');
    var result=actionResult(e,action);
    state.eventStatus[e.id]='done';
    if(state.incomingPhone===e.id)state.incomingPhone=null;
    removeBacklog(e.id);
    state.activeEvent=null;state.resultEvent=e.id;state.resultData=result;
    save();renderAll();
  }

  function consumeMinutes(n,reason){
    if(!n)return;
    state.minute+=n;
    if(reason)state.flags.lastTimeUse=reason;
    processEvents();checkDeadlines();checkDayEnd();
  }

  function checkDeadlines(){
    availableTasks().forEach(function(t){
      if(state.taskStatus[t.id]==='open'&&state.minute>t.due&&state.taskStatus[t.id]!=='overdue'){
        state.taskStatus[t.id]='overdue';
        toast('마감이 지났습니다.',t.title,true);
      }
    });
  }

  function completeTask(id){
    var t=allTasks().find(function(x){return x.id===id});if(!t)return;
    var st=state.taskStatus[id];if(st==='done')return;
    consumeMinutes(t.duration,t.title);
    state.taskStatus[id]='done';
    if(id==='attendance')state.flags.attendanceDone=true;
    if(id==='call_arin_parent')state.flags.arinCallbackDone=true;
    toast(t.title,'처리했습니다.',false);
    save();renderAll();renderModal('computer');
  }

  function renderHeader(){
    var p=currentPhase();
    q('#clock').textContent=fmtTime(state.minute);
    q('#phaseLabel').textContent=p.label;
    q('#phaseHint').textContent=phaseHint(p);
    q('#boardSubject').textContent=p.board;
    q('#boardNote').textContent=state.minute<890?'중요한 일은 기록으로 남겨두세요.':'남은 일을 정리하고 퇴근할 수 있습니다.';
  }

  function renderVisitor(){
    var empty=q('#emptyVisitor'),card=q('#visitorCard'),result=q('#resultCard');
    if(state.resultEvent&&state.resultData){
      empty.hidden=true;card.hidden=true;result.hidden=false;
      var e=eventDef(state.resultEvent);
      q('#resultKicker').textContent=e?e.name:'그 뒤';
      q('#resultTitle').textContent=state.resultData.title;
      q('#resultText').textContent=state.resultData.text;
      return;
    }
    result.hidden=true;
    if(!state.activeEvent){
      empty.hidden=false;card.hidden=true;return;
    }
    var e=eventDef(state.activeEvent);if(!e){state.activeEvent=null;empty.hidden=false;card.hidden=true;return}
    empty.hidden=true;card.hidden=false;
    q('#visitorRole').textContent=e.role;
    q('#visitorTime').textContent=fmtTime(state.minute);
    q('#visitorName').textContent=e.name;
    q('#visitorStage').textContent=e.stage;
    q('#visitorDialogue').textContent='“'+e.dialogue+'”';
    var avatar=q('#visitorAvatar'),s=student(e.studentId);
    avatar.dataset.kind=e.type==='phone'?'phone':(e.role==='동료 교사'?'adult':'student');
    avatar.dataset.tone=s?s.tone:'';
    var context='';
    if(e.studentId){
      var rows=state.records.filter(function(r){return r.studentIds.indexOf(e.studentId)>=0}).slice(-2);
      if(rows.length)context='기록철에 '+rows.length+'개의 관련 기록이 있다.';
    }
    if(e.id==='seoyeon_parent'||e.id==='jiwoo_parent')context='필요하면 통화 전에 기록철이나 명부를 열어볼 수 있다.';
    q('#contextLine').hidden=!context;q('#contextLine').textContent=context;
    q('#actionList').innerHTML=e.actions.map(function(a){
      return '<button type="button" data-event-action="'+escapeHtml(a.id)+'">'+escapeHtml(a.label)+'<small>약 '+formatCost(a.cost)+' 소요</small></button>';
    }).join('');
    q('#deferButton').textContent=e.type==='phone'?'잠시 후 다시 받는다':'지금은 넘어간다';
  }
  function formatCost(n){return n<1?Math.round(n*60)+'초':n+'분'}

  function renderWaiting(){
    var list=q('#waitingList');
    var ids=state.backlog.filter(function(id){
      var st=state.eventStatus[id];return st==='waiting'||st==='active';
    });
    q('#waitingCount').textContent=ids.length+(state.incomingPhone?1:0);
    var html='';
    if(state.incomingPhone){
      var ph=eventDef(state.incomingPhone);
      html+='<button class="waiting-item phone-wait" data-answer-phone="1"><strong>📞 '+escapeHtml(ph.name)+'</strong><small>전화가 울리는 중</small></button>';
    }
    ids.forEach(function(id){
      var e=eventDef(id),wait=Math.max(0,Math.ceil((state.deferUntil[id]||state.minute)-state.minute));
      html+='<button class="waiting-item" data-wait-event="'+escapeHtml(id)+'"><strong>'+escapeHtml(e.name)+'</strong><small>'+(wait?'잠시 미룸 · '+wait+'분':'기다리는 중 · '+escapeHtml(e.role))+'</small></button>';
    });
    list.innerHTML=html||'<p class="empty-copy">아직 기다리는 일이 없습니다.</p>';
  }

  function renderTasks(){
    var tasks=availableTasks(),open=tasks.filter(function(t){return state.taskStatus[t.id]!=='done'});
    q('#taskCount').textContent=open.length;
    q('#taskList').innerHTML=tasks.map(function(t){
      var st=state.taskStatus[t.id],due=fmtTime(t.due),cls=st==='done'?' done':st==='overdue'?' overdue':'';
      return '<div class="task-item'+cls+'"><strong>'+escapeHtml(t.title)+'</strong><small>'+(st==='done'?'처리 완료':st==='overdue'?'마감 지남 · '+due:'마감 '+due)+'</small></div>';
    }).join('')||'<p class="empty-copy">지금 처리할 업무가 없습니다.</p>';
    var openComputer=open.length;
    q('#computerBadge').textContent=openComputer?openComputer+'건 남음':'업무 정리됨';
    q('#monitorNotice').textContent=openComputer?openComputer+'건':'완료';
    q('#recordBadge').textContent='기록 '+state.records.length+(state.recordDrafts.length?' · 대기 '+state.recordDrafts.length:'');
    var phone=q('#phoneButton');phone.classList.toggle('ringing',!!state.incomingPhone);
    q('#phoneBadge').textContent=state.incomingPhone?'전화 오는 중':'조용함';
  }

  function renderAll(){
    renderHeader();renderVisitor();renderWaiting();renderTasks();
  }

  function renderModal(kind,studentId){
    var modal=q('#toolModal'),body=q('#modalBody'),title=q('#modalTitle'),kicker=q('#modalKicker');
    modal.hidden=false;
    if(kind==='roster'){
      kicker.textContent='학급 명부';title.textContent='우리 반 아이들';
      if(studentId){
        var s=student(studentId);state.openedStudents[studentId]=true;
        title.textContent=s.name+' · 명부';
        body.innerHTML='<button class="back-button" data-back-roster="1">← 명부로</button>'+
          '<div class="student-detail"><div class="detail-avatar">'+s.icon+'</div><div><h3>'+escapeHtml(s.name)+'</h3><p>'+escapeHtml(s.base)+'</p>'+
          '<div class="detail-section"><h4>직접 알게 된 점</h4>'+(s.known.length?'<ul>'+s.known.map(function(x){return '<li>'+escapeHtml(x)+'</li>'}).join('')+'</ul>':'<p>아직 직접 겪으며 알게 된 것이 많지 않습니다.</p>')+'</div>'+
          '<div class="detail-section"><h4>남긴 기록</h4><p>'+state.records.filter(function(r){return r.studentIds.indexOf(studentId)>=0}).length+'건</p></div></div></div>';
      }else{
        body.innerHTML='<div class="roster-grid">'+Object.keys(students).map(function(id){
          var s=students[id],known=s.known.length;
          return '<button class="roster-card" data-student-id="'+id+'"><strong>'+s.icon+' '+escapeHtml(s.name)+'</strong><span>'+escapeHtml(s.base)+'</span><span>알게 된 점 '+known+'개</span></button>';
        }).join('')+'</div>';
      }
    }else if(kind==='record'){
      kicker.textContent='기록철';title.textContent='오늘의 기록';
      var drafts=state.recordDrafts.map(function(d){
        return '<div class="record-draft"><strong>기록할까? · '+escapeHtml(d.title)+'</strong><p>'+escapeHtml(d.text)+'</p><button data-record-draft="'+escapeHtml(d.id)+'">1분 들여 기록하기</button></div>';
      }).join('');
      var entries=state.records.slice().reverse().map(function(r){
        return '<div class="record-entry"><strong>'+escapeHtml(r.title)+'</strong><small>'+fmtTime(r.minute)+' · '+r.studentIds.map(function(id){return students[id]?students[id].name:''}).filter(Boolean).join(' · ')+'</small><p>'+escapeHtml(r.text)+'</p></div>';
      }).join('');
      body.innerHTML=(drafts||'<p class="empty-copy">새로 적을 기록이 없습니다.</p>')+'<div class="record-list">'+(entries||'<p class="empty-copy">아직 남긴 기록이 없습니다.</p>')+'</div>';
    }else if(kind==='computer'){
      kicker.textContent='업무 컴퓨터';title.textContent='오늘 처리할 업무';
      var tasks=availableTasks();
      body.innerHTML='<div class="computer-list">'+tasks.map(function(t){
        var st=state.taskStatus[t.id],done=st==='done',over=st==='overdue';
        return '<div class="computer-task'+(over?' overdue':'')+'"><div><strong>'+escapeHtml(t.title)+'</strong><small>'+escapeHtml(t.source)+' · '+(done?'처리 완료':over?'마감 지남 '+fmtTime(t.due):'마감 '+fmtTime(t.due))+'</small><p>'+escapeHtml(t.detail)+'</p></div>'+
          '<button data-complete-task="'+escapeHtml(t.id)+'" '+(done?'disabled':'')+'>'+(done?'완료':formatCost(t.duration)+' 처리')+'</button></div>';
      }).join('')+'</div>';
    }else if(kind==='phone'){
      kicker.textContent='전화기';title.textContent='통화 메모';
      var missed=eventDefs.filter(function(e){return e.type==='phone'&&state.eventStatus[e.id]==='missed'});
      body.innerHTML='<div class="call-log">'+(missed.length?'<strong>받지 못한 전화</strong><ul>'+missed.map(function(e){return '<li>'+fmtTime(e.at)+' · '+escapeHtml(e.name)+'</li>'}).join('')+'</ul>':'현재 확인할 부재중 전화가 없습니다.')+'</div>';
    }else if(kind==='note'){
      kicker.textContent='포스트잇';title.textContent='내 메모';
      body.innerHTML='<textarea id="noteInput" class="note-area" placeholder="플레이하면서 기억하고 싶은 내용을 직접 적어둘 수 있습니다."></textarea><button id="noteSave" class="note-save" type="button">메모 붙이기</button>'+
        '<div class="note-list">'+state.notes.map(function(n){return '<div class="saved-note">'+escapeHtml(n)+'</div>'}).join('')+'</div>';
    }
    save();
  }
  function closeModal(){q('#toolModal').hidden=true}

  function checkDayEnd(){
    if(state.finished)return;
    if(!state.overtime&&state.minute>=990&&!state.endPrompted){
      state.minute=990;state.endPrompted=true;showDayEnd(false);
    }else if(state.overtime&&state.minute>=1050){
      state.minute=1050;showDayEnd(false);
    }
  }
  function daySummaryHtml(finalMode){
    var open=availableTasks().filter(function(t){return state.taskStatus[t.id]!=='done'});
    var done=availableTasks().filter(function(t){return state.taskStatus[t.id]==='done'});
    var watch=[];
    if(state.flags.pencilUnresolved||!hasRecordFor('minsu','색연필'))watch.push('민수와 지우의 색연필 문제는 다시 확인할 여지가 있다.');
    if(state.flags.seoyeonPushed||state.flags.seoyeonMissed)watch.push('서연이 수학에서 멈추는 장면을 한 번 더 살펴볼 필요가 있다.');
    if(state.flags.arinTalked)watch.push('아린의 점심시간 기분과 친구 관계를 계속 살펴본다.');
    if(state.flags.recessBoth||state.flags.noiseSignal)watch.push('민수와 준호는 경쟁 상황에서 서로 자극을 받기 쉽다.');
    if(!watch.length)watch.push('오늘 눈에 띈 아이들을 내일 다시 천천히 살펴본다.');
    return '<div class="summary-box"><strong>처리한 일</strong><ul>'+(done.length?done.map(function(t){return '<li>'+escapeHtml(t.title)+'</li>'}).join(''):'<li>아직 완료한 행정 업무가 많지 않습니다.</li>')+'</ul></div>'+
      '<div class="summary-box"><strong>남은 일</strong><ul>'+(open.length?open.map(function(t){return '<li>'+escapeHtml(t.title)+'</li>'}).join(''):'<li>오늘 업무는 모두 정리했습니다.</li>')+'</ul></div>'+
      '<div class="summary-box"><strong>조금 더 지켜볼 아이들</strong><ul>'+watch.map(function(x){return '<li>'+escapeHtml(x)+'</li>'}).join('')+'</ul></div>'+
      '<div class="summary-box"><strong>오늘 남긴 것</strong><ul><li>학생 기록 '+state.records.length+'건</li><li>직접 메모 '+state.notes.length+'개</li><li>'+(state.overtime?'오늘은 정규 퇴근 시간 뒤에도 남아 있었다.':'정규 퇴근 시간 안에 하루를 마무리했다.')+'</li></ul></div>';
  }
  function showDayEnd(finalMode){
    q('#dayEnd').hidden=false;
    q('#dayEndTitle').textContent=finalMode?'첫날 근무를 마쳤습니다.':'이제 퇴근할 수 있습니다.';
    q('#dayEndLead').textContent=finalMode?'오늘 처리하지 못한 일도, 오늘 알게 된 아이들의 모습도 다음 날로 이어집니다.':'모든 일을 끝낼 필요는 없습니다. 남은 일을 두고 퇴근하거나 조금 더 정리할 수 있습니다.';
    q('#dayEndSummary').innerHTML=daySummaryHtml(finalMode);
    q('#overtimeButton').hidden=finalMode||state.overtime;
    q('#leaveButton').textContent=finalMode?'첫날 다시하기':'오늘은 퇴근한다';
    q('#leaveButton').dataset.final=finalMode?'1':'0';
  }
  function finishDay(){
    state.finished=true;save();showDayEnd(true);
  }

  function tutorialContent(step){
    var rows=[
      {title:'정답을 맞히는 게임이 아닙니다.',text:'학생, 보호자, 학교 업무가 한꺼번에 들어옵니다. 무엇을 지금 처리하고 무엇을 미룰지 정하는 것이 첫 번째 일입니다.',visual:'학생이 기다리는 동안 전화가 울릴 수도 있고, 컴퓨터 업무의 마감도 계속 다가옵니다.'},
      {title:'책상 위 물건이 실제 도구입니다.',text:'명부에서는 아이를 알아가고, 기록철에는 직접 겪은 일을 남깁니다. 컴퓨터에서는 행정 업무를 처리합니다.',visual:'📚 명부　📒 기록철　🖥️ 컴퓨터　☎ 전화　🗒️ 포스트잇'},
      {title:'기록하지 않아도 됩니다.',text:'다만 며칠 뒤가 아니라 오늘 오후에도 보호자가 전화를 할 수 있습니다. 그때 기록이 있으면 정확히 되짚을 수 있습니다.',visual:'사건 → 기록 여부는 선택 → 나중에 그 기록이 실제로 필요해질 수 있음'},
      {title:'첫날의 목표는 한 가지입니다.',text:'완벽하게 처리하려 하지 말고, 이 반에서 누가 어떤 아이인지 조금씩 기억해 보세요.',visual:'“아, 또 민수구나.”라는 생각이 들기 시작하면 이 게임의 첫 번째 목표는 성공입니다.'}
    ];
    return rows[clamp(step,0,rows.length-1)];
  }
  function renderTutorial(){
    var row=tutorialContent(state.tutorialStep);
    q('#tutorialTitle').textContent=row.title;q('#tutorialText').textContent=row.text;q('#tutorialVisual').textContent=row.visual;
    q('#tutorialNext').textContent=state.tutorialStep>=3?'첫날 시작':'다음';
  }

  function tick(now){
    if(state.finished){requestAnimationFrame(tick);return}
    var dt=Math.min(.1,(now-state.lastReal)/1000);state.lastReal=now;
    var toolOpen=!q('#toolModal').hidden,tutorialOpen=!q('#tutorial').hidden,endOpen=!q('#dayEnd').hidden;
    if(!toolOpen&&!tutorialOpen&&!endOpen){
      var speed=state.activeEvent?0.15:state.resultEvent?0.04:0.44;
      state.minute+=dt*speed;
      processEvents();checkDeadlines();checkDayEnd();renderAll();
    }
    if(Math.floor(now/8000)!==Math.floor((now-dt*1000)/8000))save();
    requestAnimationFrame(tick);
  }

  q('#actionList').addEventListener('click',function(e){
    var b=e.target.closest('[data-event-action]');if(b)resolveAction(b.dataset.eventAction);
  });
  q('#deferButton').addEventListener('click',deferActive);
  q('#resultClose').addEventListener('click',function(){
    state.resultEvent=null;state.resultData=null;processEvents();save();renderAll();
  });
  q('#waitingList').addEventListener('click',function(e){
    var phone=e.target.closest('[data-answer-phone]');if(phone){answerPhone();return}
    var b=e.target.closest('[data-wait-event]');if(b)openEvent(b.dataset.waitEvent);
  });
  q('#phoneButton').addEventListener('click',answerPhone);
  q('#rosterButton').addEventListener('click',function(){renderModal('roster')});
  q('#recordButton').addEventListener('click',function(){renderModal('record')});
  q('#computerButton').addEventListener('click',function(){renderModal('computer')});
  q('#noteButton').addEventListener('click',function(){renderModal('note')});
  q('#modalClose').addEventListener('click',closeModal);
  q('#toolModal').addEventListener('click',function(e){if(e.target===this)closeModal()});
  q('#modalBody').addEventListener('click',function(e){
    var s=e.target.closest('[data-student-id]');if(s){renderModal('roster',s.dataset.studentId);return}
    if(e.target.closest('[data-back-roster]')){renderModal('roster');return}
    var d=e.target.closest('[data-record-draft]');if(d){addRecordFromDraft(d.dataset.recordDraft);return}
    var t=e.target.closest('[data-complete-task]');if(t){completeTask(t.dataset.completeTask);return}
    if(e.target.id==='noteSave'){
      var input=q('#noteInput'),v=input&&input.value.trim();if(v){state.notes.unshift(v);state.notes=state.notes.slice(0,12);save();renderModal('note')}
    }
  });
  q('#helpButton').addEventListener('click',function(){state.tutorialStep=0;q('#tutorial').hidden=false;renderTutorial()});
  q('#tutorialNext').addEventListener('click',function(){
    if(state.tutorialStep>=3){state.tutorialDone=true;q('#tutorial').hidden=true;state.lastReal=performance.now();save();return}
    state.tutorialStep++;renderTutorial();
  });
  q('#resetButton').addEventListener('click',function(){
    if(window.confirm('첫날 진행 상황을 모두 지우고 다시 시작할까요?'))resetGame();
  });
  q('#overtimeButton').addEventListener('click',function(){
    state.overtime=true;state.endPrompted=true;q('#dayEnd').hidden=true;state.lastReal=performance.now();toast('조금 더 남기로 했습니다.','17:30에는 다시 정리합니다.',false);save();
  });
  q('#leaveButton').addEventListener('click',function(){
    if(this.dataset.final==='1'){resetGame();return}
    finishDay();
  });

  load();
  Object.keys(students).forEach(function(id){
    var savedKnown=(state.studentKnown&&state.studentKnown[id])||null;
    if(savedKnown)students[id].known=savedKnown;
  });
  var originalSave=save;
  save=function(){
    state.studentKnown={};Object.keys(students).forEach(function(id){state.studentKnown[id]=students[id].known.slice()});
    originalSave();
  };

  renderAll();
  processEvents();
  if(!state.tutorialDone){q('#tutorial').hidden=false;renderTutorial()}
  requestAnimationFrame(tick);
})();