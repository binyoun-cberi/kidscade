(function(){
'use strict';

var D=window.SeedFCData,S=window.SeedFCSim;
if(!D||!S){document.body.innerHTML='<p style="padding:30px">게임 데이터를 불러오지 못했어요.</p>';return;}

var SAVE_KEY='kidscade_game_v2:high_seed_fc_manager:save';
var state=null,currentView='home',squadFilter='all',historyFilter=null;
var modal=document.getElementById('modal'),modalBody=document.getElementById('modalBody');
var toastEl=document.getElementById('toast'),toastTimer=0;
var match=null,matchSpeed=1,raf=0,lastFrame=0,resultShown=false;
var replayCurrent=null,replayFrame=0,replayCursor=0,replayPlaying=false,replayPlaySpeed=1,replayRaf=0,replayLast=0,replayMode='replay',replayFocus='all',replayReturnView='analysis';
var soccerBallImg=new Image();
soccerBallImg.src='../../assets/game/2d/sports/equipment/ball_soccer1.png';
var matchAudioDefs={
  whoosh:['../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',.12],
  impact:['../../assets/audio/sfx/combat/impact-heavy-01.mp3',.10],
  goal:['../../assets/audio/sfx/success/cheer-yay-01.mp3',.20],
  confirm:['../../assets/audio/ui/kenney_interface/confirmation_001.ogg',.16]
};
var matchAudio={};
Object.keys(matchAudioDefs).forEach(function(k){
  var def=matchAudioDefs[k],a=new Audio(def[0]);a.preload='auto';a.volume=def[1];matchAudio[k]=a;
});
function matchSfx(k,rate){
  var a=matchAudio[k];if(!a)return;
  try{a.pause();a.currentTime=0;a.playbackRate=rate||1;a.play().catch(function(){});}catch(e){}
}

function $(id){return document.getElementById(id);}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function clone(v){return JSON.parse(JSON.stringify(v));}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function clubById(id){return D.clubs.find(function(c){return c.id===id;});}
function fmt(n){return Number(n||0).toLocaleString('ko-KR');}
function overall(p){return p.overall||Math.round((p.stats.shot+p.stats.pass+p.stats.defense+p.stats.speed+p.stats.stamina)/5);}
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){toastEl.classList.remove('show');},1700);}
function sound(name){try{window.KidscadeGame&&KidscadeGame.sound(name);}catch(e){}}
function sdkStart(extra){try{window.KidscadeGame&&KidscadeGame.start(extra||{});}catch(e){}}
function sdkScore(n){try{window.KidscadeGame&&KidscadeGame.score(n);}catch(e){}}
function save(){
  if(!state)return;
  try{
    if(window.KidscadeStorage&&KidscadeStorage.setJSON)KidscadeStorage.setJSON(SAVE_KEY,state);
    else localStorage.setItem(SAVE_KEY,JSON.stringify(state));
  }catch(e){}
}
function load(){
  try{
    var v=null;
    if(window.KidscadeStorage&&KidscadeStorage.getJSON)v=KidscadeStorage.getJSON(SAVE_KEY,null);
    else{var raw=localStorage.getItem(SAVE_KEY);v=raw?JSON.parse(raw):null;}
    if(v&&v.version===2&&clubById(v.clubId))return v;
  }catch(e){}
  return null;
}
function tableBlank(ids){
  var t={},list=ids||D.clubs.map(function(c){return c.id;});
  list.forEach(function(id){t[id]={clubId:id,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0};});
  return t;
}
function schedule(ids,repeats){
  var list=(ids||D.clubs.map(function(c){return c.id;})).slice(),rounds=[];
  if(list.length<2)return rounds;
  var fixed=list[0],rotate=list.slice(1),base=[];
  for(var r=0;r<list.length-1;r++){
    var arr=[fixed].concat(rotate),fs=[];
    for(var i=0;i<arr.length/2;i++){
      var a=arr[i],b=arr[arr.length-1-i],flip=(r+i)%2===1;
      fs.push({home:flip?b:a,away:flip?a:b,played:false,score:null});
    }
    base.push(fs);rotate.unshift(rotate.pop());
  }
  var homeAway=base.concat(base.map(function(fs){return fs.map(function(f){return {home:f.away,away:f.home,played:false,score:null};});}));
  for(var n=0;n<(repeats||1);n++)rounds=rounds.concat(clone(homeAway));
  return rounds;
}
function autoLineup(roster,formation){
  var used={},out=[],slots=D.formations[formation]||D.formations['4-3-3'];
  slots.forEach(function(slot){
    var best=roster.filter(function(p){return !used[p.id];}).sort(function(a,b){
      return S.playerScore(b,slot)+(b.fitness||100)*.04-(S.playerScore(a,slot)+(a.fitness||100)*.04);
    })[0];
    if(best){used[best.id]=1;out.push(best.id);}
  });return out.slice(0,11);
}
function newState(clubId){
  var c=clubById(clubId),roster=clone(c.players);
  return {
    version:2,clubId:clubId,season:1,round:0,budget:c.budget,formation:'4-3-3',
    tactics:clone(c.tactics),roster:roster,lineup:autoLineup(roster,'4-3-3'),
    schedule:schedule(),table:tableBlank(),matchHistory:[],trainingAvailable:false,
    worldSigned:[],managerNotes:[],lastResult:null,replays:[],pyramid:null,otherLeague:null
  };
}
function normalize(){
  state.roster=state.roster||[];state.formation=state.formation||'4-3-3';
  state.lineup=(state.lineup||[]).filter(function(id){return state.roster.some(function(p){return p.id===id;});});
  if(state.lineup.length!==11)state.lineup=autoLineup(state.roster,state.formation);
  state.tactics=state.tactics||clone(clubById(state.clubId).tactics);
  state.schedule=state.schedule||schedule();state.table=state.table||tableBlank();
  state.matchHistory=state.matchHistory||[];state.worldSigned=state.worldSigned||[];
  state.managerNotes=state.managerNotes||[];state.trainingAvailable=!!state.trainingAvailable;
  state.replays=Array.isArray(state.replays)?state.replays:[];
  if(state.pyramid===undefined)state.pyramid=null;
  if(state.otherLeague===undefined)state.otherLeague=null;
  state.roster.forEach(function(p){if(p.fitness==null)p.fitness=100;if(p.form==null)p.form=0;});
}
function rows(table){
  var target=table||state.table;
  return Object.keys(target).map(function(k){return target[k];}).sort(function(a,b){
    if(b.pts!==a.pts)return b.pts-a.pts;
    var ag=a.gf-a.ga,bg=b.gf-b.ga;if(bg!==ag)return bg-ag;
    if(b.gf!==a.gf)return b.gf-a.gf;
    return clubById(a.clubId).name.localeCompare(clubById(b.clubId).name,'ko');
  });
}
function leagueLabel(){
  if(!state.pyramid)return '배치 리그';
  return state.pyramid.division===1?'역사 드림리그 1부':'역사 드림리그 2부';
}
function leagueGoalText(){
  if(!state.pyramid)return '이번 시즌 상위 4팀은 다음 시즌 1부, 하위 4팀은 2부로 배정돼요.';
  return state.pyramid.division===1?'1위는 우승, 최하위는 2부로 강등돼요.':'1위는 다음 시즌 1부로 승격해요.';
}
function advanceSeason(){
  var finalRows=rows(),reward=0,summary='';
  if(!state.pyramid){
    var d1=finalRows.slice(0,4).map(function(x){return x.clubId;});
    var d2=finalRows.slice(4).map(function(x){return x.clubId;});
    state.pyramid={divisionIds:{1:d1,2:d2},division:d1.indexOf(state.clubId)>=0?1:2,history:[{season:state.season,placement:true,leader:finalRows[0].clubId}]};
    if(finalRows[0].clubId===state.clubId)reward=200;
    summary='배치 시즌 종료 · 다음 시즌부터 1부/2부가 시작됩니다.';
  }else{
    var cur=state.pyramid.division;
    var d1Rows=cur===1?finalRows:rows(state.otherLeague.table);
    var d2Rows=cur===2?finalRows:rows(state.otherLeague.table);
    var champion=d1Rows[0].clubId,relegated=d1Rows[d1Rows.length-1].clubId,promoted=d2Rows[0].clubId;
    var next1=state.pyramid.divisionIds[1].filter(function(id){return id!==relegated;}).concat(promoted);
    var next2=state.pyramid.divisionIds[2].filter(function(id){return id!==promoted;}).concat(relegated);
    state.pyramid.divisionIds={1:next1,2:next2};
    state.pyramid.history=state.pyramid.history||[];
    state.pyramid.history.push({season:state.season,champion:champion,promoted:promoted,relegated:relegated});
    if(champion===state.clubId)reward=450;
    else if(promoted===state.clubId)reward=300;
    summary=clubById(champion).name+' 우승 · '+clubById(promoted).name+' 승격 · '+clubById(relegated).name+' 강등';
    state.pyramid.division=next1.indexOf(state.clubId)>=0?1:2;
  }
  state.season++;state.round=0;state.trainingAvailable=false;state.budget+=500+reward;
  state.roster.forEach(function(p){p.fitness=100;});
  var ids=state.pyramid.divisionIds[state.pyramid.division],otherDiv=state.pyramid.division===1?2:1,otherIds=state.pyramid.divisionIds[otherDiv];
  state.schedule=schedule(ids,2);state.table=tableBlank(ids);
  state.otherLeague={division:otherDiv,schedule:schedule(otherIds,2),table:tableBlank(otherIds),round:0};
  save();updateTop();home();toast(summary);
}
function rank(){return rows().findIndex(function(x){return x.clubId===state.clubId;})+1;}
function currentFixtures(){return state.schedule[state.round]||null;}
function myFixture(){var fs=currentFixtures();return fs&&fs.find(function(f){return f.home===state.clubId||f.away===state.clubId;});}
function opponent(f){return f&&clubById(f.home===state.clubId?f.away:f.home);}
function playerById(id){return state.roster.find(function(p){return p.id===id;});}
function showScreen(id){['startScreen','clubSelect','gameScreen'].forEach(function(x){$(x).classList.toggle('hidden',x!==id);});}
function updateTop(){
  var el=$('topClub');
  if(!state){el.classList.add('hidden');return;}
  var c=clubById(state.clubId),ended=state.round>=state.schedule.length;
  el.innerHTML='<span>'+c.emoji+'</span><b>'+esc(c.name)+'</b><small>'+esc(leagueLabel())+' · 시즌 '+state.season+' · '+(ended?'종료':(state.round+1)+'R')+'</small>';
  el.classList.remove('hidden');
}
function nav(view){document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.toggle('active',b.dataset.view===view);});}
function render(view){
  if(!state)return;currentView=view;nav(view);
  if(view==='home')home();
  else if(view==='squad')squad();
  else if(view==='tactics')tactics();
  else if(view==='market')market();
  else if(view==='history')history();
  else if(view==='analysis')analysis();
  else table();
}
function enter(resume){normalize();showScreen('gameScreen');updateTop();render('home');sdkStart({mode:'history-football-manager',season:state.season,resume:!!resume});}
function showClubs(){
  showScreen('clubSelect');var grid=$('clubGrid');grid.innerHTML='';
  D.clubs.forEach(function(c){
    var names=c.players.slice(0,5).map(function(p){return p.name;}).join(' · ');
    var b=document.createElement('button');b.type='button';b.className='club-card';
    b.innerHTML='<span class="crest">'+c.emoji+'</span><span class="style-pill">'+esc(c.style)+'</span><h3>'+esc(c.name)+'</h3><p>'+esc(c.description)+'</p><p><b>'+esc(names)+'</b> 등 역사 인물 18명</p><span class="pick">이 팀 맡기</span>';
    b.onclick=function(){state=newState(c.id);save();enter(false);toast(c.name+' 감독으로 부임했어요!');};
    grid.appendChild(b);
  });
}
function nextHistoryPlayer(){
  var a=state.lineup.map(playerById).filter(function(p){return p&&p.historical;});
  return a.length?a[(state.round+state.season)%a.length]:state.roster[0];
}
function home(){
  var root=$('viewRoot'),c=clubById(state.clubId),r=rank(),rs=rows();
  if(state.round>=state.schedule.length){
    var leader=clubById(rs[0].clubId),statusTitle='',statusText='';
    if(!state.pyramid){
      statusTitle='배치 리그 완료';
      statusText='상위 4팀은 다음 시즌 1부, 하위 4팀은 2부에서 시작해요.';
    }else if(state.pyramid.division===1){
      statusTitle=r===1?'🏆 1부 우승!':r===rs.length?'⬇️ 2부 강등':'1부 잔류';
      statusText=r===1?'역사 드림리그 정상에 올랐어요.':r===rs.length?'다음 시즌은 2부에서 다시 승격에 도전합니다.':'다음 시즌에도 1부에서 우승을 노려요.';
    }else{
      statusTitle=r===1?'⬆️ 1부 승격!':'2부 시즌 완료';
      statusText=r===1?'다음 시즌부터 1부 팀들과 맞붙습니다.':'다음 시즌 다시 승격에 도전해요.';
    }
    root.innerHTML='<div class="dashboard">'+
      '<section class="panel next-match"><span class="round-pill">'+esc(leagueLabel())+' · 시즌 '+state.season+' 종료</span><h2 style="font-size:34px;margin-top:13px">'+statusTitle+'</h2><p class="muted">최종 '+r+'위 · 승점 '+(state.table[state.clubId]?state.table[state.clubId].pts:0)+'</p><div class="fact-box">'+esc(statusText)+'</div><div class="action-row" style="margin-top:18px"><button id="nextSeason" class="primary" type="button">다음 시즌 시작</button>'+(state.replays.length?'<button id="seasonAnalysis" class="secondary" type="button">📊 경기 분석실</button>':'')+'</div></section>'+
      '<aside class="panel"><h3>이번 시즌 선두</h3><p style="font-size:20px;font-weight:900">'+leader.emoji+' '+esc(leader.name)+'</p><p class="muted">'+(state.pyramid?'승격·강등은 경기 결과로만 결정돼요.':'이번 시즌 성적으로 1부와 2부가 결정돼요.')+'</p></aside>'+
      '</div>';
    $('nextSeason').onclick=advanceSeason;
    if($('seasonAnalysis'))$('seasonAnalysis').onclick=function(){render('analysis');};
    return;
  }
  var f=myFixture(),o=opponent(f),spot=nextHistoryPlayer(),topRows=rs.slice(0,5);
  var tired=state.lineup.map(playerById).filter(function(p){return p&&(p.fitness||100)<70;});
  var tasks=[];
  tasks.push(['🏆 리그 목표',leagueGoalText()]);
  if(state.trainingAvailable)tasks.push(['🏋️ 훈련 가능','경기 뒤 훈련을 골라 선수 능력과 체력을 관리해요.']);
  if(tired.length)tasks.push(['🔋 체력 확인',tired[0].name+' 등 선발 선수의 체력이 낮아요.']);
  tasks.push(['💰 팀 예산',fmt(state.budget)+' · 세계 역사 인물을 영입할 수 있어요.']);
  root.innerHTML='<div class="dashboard">'+
    '<section class="panel next-match"><span class="round-pill">'+esc(leagueLabel())+' · 시즌 '+state.season+' · '+(state.round+1)+'라운드</span><div class="versus"><div class="team-block"><span class="big-crest">'+c.emoji+'</span><b>'+esc(c.name)+'</b><small class="muted">'+esc(c.style)+'</small></div><div class="vs">VS</div><div class="team-block"><span class="big-crest">'+o.emoji+'</span><b>'+esc(o.name)+'</b><small class="muted">'+esc(o.style)+'</small></div></div><div class="action-row"><button id="playMatch" class="primary" type="button">경기 시작</button><button id="toTactics" class="secondary" type="button">작전 확인</button>'+(state.replays.length?'<button id="quickAnalysis" class="secondary" type="button">📊 최근 경기</button>':'')+'</div></section>'+
    '<aside class="panel"><h3>'+esc(leagueLabel())+' · 현재 '+r+'위</h3><div class="stand-mini">'+topRows.map(function(x,i){var cc=clubById(x.clubId);return '<div class="stand-row '+(x.clubId===state.clubId?'me':'')+'"><b>'+(i+1)+'</b><span>'+cc.emoji+' '+esc(cc.short)+'</span><span>'+x.p+'경기</span><b>'+x.pts+'</b></div>';}).join('')+'</div></aside>'+
    '<section class="panel"><h3>이번 주 할 일</h3><div class="task-list">'+tasks.map(function(t,i){return '<div class="task" data-task="'+i+'"><strong>'+t[0]+'</strong><small>'+esc(t[1])+'</small></div>';}).join('')+'</div></section>'+
    '<aside class="panel"><h3>오늘의 역사 선수</h3><div class="player-top"><div><span class="history-tag">'+esc(spot.era)+'</span><h3>'+esc(spot.name)+'</h3></div><span class="pos">'+esc(D.positionKo[spot.pos])+'</span></div><p class="muted">'+esc(spot.fact)+'</p><div class="memory">'+esc(spot.memory)+'</div></aside>'+
    '</div>';
  $('playMatch').onclick=startMatch;$('toTactics').onclick=function(){render('tactics');};
  if($('quickAnalysis'))$('quickAnalysis').onclick=function(){openReplay(0);};
  if(state.trainingAvailable){
    var idx=tasks.findIndex(function(t){return t[0].indexOf('훈련')>=0;});
    var task=root.querySelector('[data-task="'+idx+'"]');if(task){task.style.cursor='pointer';task.onclick=trainingModal;}
  }
}
function stats(p){
  return '<div class="stats">'+[['shot','슛'],['pass','패스'],['defense','수비'],['speed','속도'],['stamina','체력']].map(function(x){return '<div class="stat"><b>'+p.stats[x[0]]+'</b><small>'+x[1]+'</small></div>';}).join('')+'</div>';
}
function pcard(p,marketMode){
  var starter=state.lineup.indexOf(p.id)>=0;
  return '<article class="player-card '+(starter?'starter ':'')+(marketMode?'market-card':'')+'"><div class="player-top"><div><span class="pos">'+esc(p.pos)+'</span><span class="history-tag">'+esc(p.era)+'</span><h3>'+esc(p.name)+'</h3><span class="era">'+esc(p.trait)+'</span></div><div class="ovr">'+overall(p)+'<small>게임 능력</small></div></div>'+stats(p)+'<div class="fitness"><i style="width:'+clamp(p.fitness||100,0,100)+'%"></i></div><div class="memory" style="margin-top:9px">'+esc(p.memory)+'</div>'+(marketMode?'<div class="card-actions"><button data-buy="'+p.id+'" type="button">영입 '+fmt(p.price)+'</button><button data-fact="'+p.id+'" type="button">인물 보기</button></div>':'<div class="card-actions"><button data-lineup="'+p.id+'" type="button">'+(starter?'선발 중':'선발로')+'</button><button data-fact="'+p.id+'" type="button">인물 보기</button></div>')+'</article>';
}
function factModal(p){
  modalBody.innerHTML='<span class="history-tag">'+esc(p.era)+'</span><h2>'+esc(p.name)+'</h2><p><b>'+esc(p.trait)+'</b></p><div class="fact-box">'+esc(p.fact)+'</div><p class="memory" style="margin-top:12px"><b>기억할 한 줄</b><br>'+esc(p.memory)+'</p><p class="muted" style="font-size:12px">축구 포지션과 능력치는 게임 진행을 위해 만든 값이며 역사적 평가와 관계없습니다.</p>';
  modal.classList.remove('hidden');
}
function bindFact(scope,source){
  scope.querySelectorAll('[data-fact]').forEach(function(b){b.onclick=function(){
    var p=source.find(function(x){return x.id===b.dataset.fact;});if(p)factModal(p);
  };});
}
function squad(){
  var root=$('viewRoot'),list=state.roster.slice().sort(function(a,b){
    var sa=state.lineup.indexOf(a.id)>=0?1:0,sb=state.lineup.indexOf(b.id)>=0?1:0;
    if(sb!==sa)return sb-sa;return overall(b)-overall(a);
  });
  if(squadFilter!=='all')list=list.filter(function(p){return p.pos===squadFilter;});
  root.innerHTML='<div class="section-bar"><div><span class="eyebrow">선수 18명 + 영입 선수</span><h2>선수단</h2><div class="muted">후보를 누르면 같은 포지션의 선발 선수와 빠르게 교체해요.</div></div><div class="chips">'+['all'].concat(D.positions).map(function(x){return '<button class="chip '+(squadFilter===x?'active':'')+'" data-filter="'+x+'" type="button">'+(x==='all'?'전체':x)+'</button>';}).join('')+'</div></div><div class="player-grid">'+list.map(function(p){return pcard(p,false);}).join('')+'</div>';
  root.querySelectorAll('[data-filter]').forEach(function(b){b.onclick=function(){squadFilter=b.dataset.filter;squad();};});
  root.querySelectorAll('[data-lineup]').forEach(function(b){b.onclick=function(){
    var p=playerById(b.dataset.lineup);if(!p)return;
    if(state.lineup.indexOf(p.id)>=0){toast('후보 선수를 눌러 이 선수와 교체해 보세요.');return;}
    var starters=state.lineup.map(playerById).filter(Boolean),same=starters.filter(function(x){return x.pos===p.pos;});
    var pool=same.length?same:starters;
    pool.sort(function(a,b){return S.playerScore(a,p.pos)-S.playerScore(b,p.pos);});
    var out=pool[0];state.lineup=state.lineup.filter(function(id){return id!==out.id;});state.lineup.push(p.id);save();toast(out.name+' ↔ '+p.name);squad();
  };});
  bindFact(root,state.roster);
}
function formationPositions(){
  var map={
    '4-4-2':[[50,89],[32,72],[68,72],[14,67],[86,67],[34,47],[66,47],[15,32],[85,32],[38,14],[62,14]],
    '4-3-3':[[50,89],[32,72],[68,72],[14,67],[86,67],[28,47],[50,51],[72,47],[14,23],[86,23],[50,12]],
    '4-2-3-1':[[50,89],[32,72],[68,72],[14,67],[86,67],[36,52],[64,52],[17,31],[50,31],[83,31],[50,12]],
    '5-3-2':[[50,89],[26,73],[50,76],[74,73],[10,62],[90,62],[28,43],[50,47],[72,43],[38,15],[62,15]]
  };return map[state.formation]||map['4-3-3'];
}
function tactics(){
  var root=$('viewRoot'),assigned=S.assignSlots(state.roster,state.lineup,state.formation,D.formations),coords=formationPositions();
  function choice(group,key,label,desc){
    return '<button class="'+(state.tactics[group]===key?'active':'')+'" data-tactic="'+group+':'+key+'" type="button"><b>'+label+'</b><small>'+desc+'</small></button>';
  }
  root.innerHTML='<div class="section-bar"><div><span class="eyebrow">선택은 간단하게, 결과는 경기장에서</span><h2>작전판</h2></div></div><div class="tactics-layout"><div class="formation-pitch"><div class="formation-line"></div>'+assigned.map(function(a,i){var c=coords[i]||[50,50];return '<div class="formation-dot" style="left:'+c[0]+'%;top:'+c[1]+'%">'+esc(a.player.name.slice(0,4))+'<br>'+a.slot+'</div>';}).join('')+'</div><section class="panel"><div class="choice-group"><h3>포메이션</h3><div class="choice-buttons">'+Object.keys(D.formations).map(function(f){return '<button class="'+(state.formation===f?'active':'')+'" data-formation="'+f+'" type="button"><b>'+f+'</b><small>'+(f==='4-4-2'?'균형이 좋아요':f==='4-3-3'?'공격수가 많아요':f==='4-2-3-1'?'중앙에서 풀어요':'수비가 튼튼해요')+'</small></button>';}).join('')+'</div></div><div class="choice-group"><h3>공격할 때</h3><div class="choice-buttons">'+choice('attack','short','짧게 연결','패스 성공과 점유에 유리')+choice('attack','direct','빠르게 앞으로','빠른 공격에 유리')+choice('attack','wide','측면으로','좌우 공간 활용')+'</div></div><div class="choice-group"><h3>공을 빼앗겼을 때</h3><div class="choice-buttons">'+choice('press','press','바로 압박','공을 빨리 되찾지만 체력 소모가 큼')+choice('press','shape','자리를 지켜','수비가 안정되고 체력을 아낌')+'</div></div><div class="choice-group"><h3>전체 태도</h3><div class="choice-buttons">'+choice('mindset','attack','공격','득점 기회↑ 수비 위험↑')+choice('mindset','balanced','균형','공격과 수비의 균형')+choice('mindset','defend','수비','실점 위험↓ 득점 기회↓')+'</div></div></section></div>';
  root.querySelectorAll('[data-formation]').forEach(function(b){b.onclick=function(){state.formation=b.dataset.formation;save();tactics();};});
  root.querySelectorAll('[data-tactic]').forEach(function(b){b.onclick=function(){var a=b.dataset.tactic.split(':');state.tactics[a[0]]=a[1];save();tactics();};});
}
function worldTeam(p){
  var m={'물리학':'물리 나라','천문학':'천문 나라','과학':'과학 나라','예술·과학':'발명 나라','간호·통계':'돌봄 나라','생물학':'생명 나라','수학·컴퓨팅':'수학 나라','인쇄':'인쇄 나라','수학·과학':'원리 나라','의학·철학':'의학 나라','전기 공학':'전기 나라','유전학':'유전 나라','미생물학':'미생물 나라','통신':'통신 나라'};
  return m[p.trait]||p.trait+' 나라';
}
function market(){
  var root=$('viewRoot'),available=D.world.filter(function(p){return state.worldSigned.indexOf(p.id)<0;}).map(clone);
  root.innerHTML='<div class="section-bar"><div><span class="eyebrow">세계 드림 영입</span><h2>역사 인물 용병 시장</h2><div class="muted">현재 예산 <b>'+fmt(state.budget)+'</b> · 시대와 국경을 넘어 펼쳐지는 가상 드림리그예요.</div></div></div><div class="market-grid">'+available.map(function(p){p.era=worldTeam(p)+' · '+p.era;return pcard(p,true);}).join('')+'</div>';
  root.querySelectorAll('[data-buy]').forEach(function(b){b.onclick=function(){
    var original=D.world.find(function(p){return p.id===b.dataset.buy;});if(!original)return;
    if(state.budget<original.price){toast('예산이 부족해요.');return;}
    if(state.roster.length>=25){toast('선수단은 최대 25명까지 운영해요.');return;}
    var p=clone(original);p.clubId=state.clubId;state.roster.push(p);state.worldSigned.push(p.id);state.budget-=p.price;save();sound('success');toast(worldTeam(p)+'의 '+p.name+' 영입!');market();
  };});
  bindFact(root,D.world);
}
function history(){
  var root=$('viewRoot');if(!historyFilter)historyFilter=state.clubId;
  var c=clubById(historyFilter),people=c.players;
  root.innerHTML='<div class="section-bar"><div><span class="eyebrow">경기하다가 자연스럽게 반복해서 보기</span><h2>역사 수첩</h2><div class="muted">축구 능력치는 역사적 평가가 아니라 게임용 역할값이에요.</div></div><div class="chips">'+D.clubs.map(function(x){return '<button class="chip '+(x.id===historyFilter?'active':'')+'" data-hclub="'+x.id+'" type="button">'+x.emoji+' '+esc(x.short)+'</button>';}).join('')+'</div></div><div class="history-grid">'+people.map(function(p){return '<article class="player-card history-card"><div class="player-top"><div><span class="history-tag">'+esc(p.era)+'</span><h3>'+esc(p.name)+'</h3><span class="era">'+esc(p.trait)+'</span></div><span class="pos">'+esc(p.pos)+'</span></div><p>'+esc(p.fact)+'</p><div class="memory">'+esc(p.memory)+'</div></article>';}).join('')+'</div>';
  root.querySelectorAll('[data-hclub]').forEach(function(b){b.onclick=function(){historyFilter=b.dataset.hclub;history();};});
}
function table(){
  var root=$('viewRoot');
  function makeTable(rs,division,title){
    return '<section class="panel league-table-panel"><div class="league-table-title"><h3>'+esc(title)+'</h3><small>'+(
      !state.pyramid?'상위 4팀 → 다음 시즌 1부 · 하위 4팀 → 2부':
      division===1?'1위 우승 · 최하위 강등':'1위 자동 승격'
    )+'</small></div><table class="table-full"><thead><tr><th>#</th><th>구단</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득실</th><th>승점</th></tr></thead><tbody>'+
    rs.map(function(x,i){
      var c=clubById(x.clubId),zone='';
      if(!state.pyramid)zone=i<4?'promotion':'relegation';
      else if(division===1)zone=i===0?'champion':i===rs.length-1?'relegation':'';
      else if(division===2)zone=i===0?'promotion':'';
      return '<tr class="'+(x.clubId===state.clubId?'me ':'')+zone+'"><td>'+(i+1)+'</td><td>'+c.emoji+' '+esc(c.name)+'</td><td>'+x.p+'</td><td>'+x.w+'</td><td>'+x.d+'</td><td>'+x.l+'</td><td>'+((x.gf-x.ga)>=0?'+':'')+(x.gf-x.ga)+'</td><td><b>'+x.pts+'</b></td></tr>';
    }).join('')+'</tbody></table></section>';
  }
  var html='<div class="section-bar"><div><span class="eyebrow">시즌 '+state.season+'</span><h2>리그 순위</h2><div class="muted">'+esc(leagueGoalText())+'</div></div></div><div class="league-tables">';
  if(!state.pyramid)html+=makeTable(rows(),0,'배치 리그');
  else{
    var currentDiv=state.pyramid.division,otherDiv=currentDiv===1?2:1;
    html+=makeTable(rows(),currentDiv,'역사 드림리그 '+currentDiv+'부');
    if(state.otherLeague)html+=makeTable(rows(state.otherLeague.table),otherDiv,'역사 드림리그 '+otherDiv+'부');
  }
  html+='</div>';
  if(state.pyramid&&state.pyramid.history&&state.pyramid.history.length){
    var archive=state.pyramid.history.slice().reverse().slice(0,5);
    html+='<section class="panel league-archive"><h3>리그 역사</h3><div class="archive-list">'+archive.map(function(h){
      if(h.placement)return '<div><b>시즌 '+h.season+'</b><span>배치 리그 선두 · '+clubById(h.leader).emoji+' '+esc(clubById(h.leader).name)+'</span></div>';
      return '<div><b>시즌 '+h.season+'</b><span>🏆 '+esc(clubById(h.champion).short)+' · ↑ '+esc(clubById(h.promoted).short)+' · ↓ '+esc(clubById(h.relegated).short)+'</span></div>';
    }).join('')+'</div></section>';
  }
  root.innerHTML=html;
}
function analysis(){
  var root=$('viewRoot'),list=state.replays||[];
  var cards=list.map(function(r,i){
    var h=clubById(r.homeClubId),a=clubById(r.awayClubId);
    return '<article class="replay-card"><div><span class="round-pill">'+esc(r.league||'경기')+' · 시즌 '+r.season+' '+r.round+'R</span><h3>'+h.emoji+' '+esc(h.short)+' <b>'+r.score[0]+' : '+r.score[1]+'</b> '+esc(a.short)+' '+a.emoji+'</h3><p class="muted">선수 집중 다시보기 · 히트맵 · 패스맵 · 개인 경기 기록</p></div><button class="primary" data-replay="'+i+'" type="button">경기 분석</button></article>';
  }).join('');
  root.innerHTML='<div class="section-bar"><div><span class="eyebrow">MATCH CENTRE</span><h2>경기 분석실</h2><div class="muted">최근 6경기를 저장해 선수별 움직임·히트맵·패스맵을 다시 볼 수 있어요.</div></div></div>'+(cards?'<div class="replay-list">'+cards+'</div>':'<section class="panel empty-analysis"><h3>아직 분석할 경기가 없어요.</h3><p class="muted">경기를 한 번 마치면 다시보기와 히트맵이 여기에 저장됩니다.</p></section>');
  root.querySelectorAll('[data-replay]').forEach(function(b){b.onclick=function(){openReplay(Number(b.dataset.replay));};});
}
function replayPlayerMeta(id){return replayCurrent&&replayCurrent.players.find(function(p){return p.id===id;});}
function openReplay(index){
  replayReturnView=currentView||'analysis';
  replayCurrent=(state.replays||[])[index];if(!replayCurrent)return;
  $('replayClose').textContent=replayReturnView==='analysis'?'← 분석실로':'← 홈으로';
  replayFrame=0;replayCursor=0;replayPlaying=false;replayMode='replay';replayFocus='all';
  var h=clubById(replayCurrent.homeClubId),a=clubById(replayCurrent.awayClubId);
  $('replayTitle').textContent='시즌 '+replayCurrent.season+' '+replayCurrent.round+'R · '+h.name+' '+replayCurrent.score[0]+' : '+replayCurrent.score[1]+' '+a.name;
  var select=$('replayPlayer');select.innerHTML='<option value="all">전체 선수 보기</option>'+replayCurrent.players.slice().sort(function(x,y){return x.side-y.side;}).map(function(p){return '<option value="'+esc(p.id)+'">'+(p.side===replayCurrent.userSide?'★ ':'')+esc(p.name)+' · '+esc(p.pos)+'</option>';}).join('');
  $('replayRange').min=0;$('replayRange').max=Math.max(0,replayCurrent.frames.length-1);$('replayRange').value=0;
  renderReplayEvents();updateReplayButtons();updateReplayStats();drawReplayFrame();
  $('replayLayer').classList.remove('hidden');cancelAnimationFrame(replayRaf);
}
function closeReplay(){
  replayPlaying=false;cancelAnimationFrame(replayRaf);$('replayLayer').classList.add('hidden');replayCurrent=null;
  if(state)render(replayReturnView||'analysis');
}
function updateReplayButtons(){
  $('replayPlay').textContent=replayPlaying?'⏸ 일시정지':'▶ 재생';
  document.querySelectorAll('[data-rmode]').forEach(function(b){b.classList.toggle('active',b.dataset.rmode===replayMode);});
}
function updateReplayStats(){
  if(!replayCurrent)return;
  var box=$('replayStats');
  if(replayFocus==='all'){
    var userPlayers=replayCurrent.players.filter(function(p){return p.side===replayCurrent.userSide;});
    var total={touches:0,shots:0,goals:0,saves:0,distance:0,xg:0,passesAttempted:0,passesCompleted:0,progressivePasses:0,keyPasses:0,assists:0};
    userPlayers.forEach(function(p){
      var s=replayCurrent.stats[p.id]||{};
      Object.keys(total).forEach(function(k){total[k]+=Number(s[k]||0);});
    });
    var passPct=total.passesAttempted?Math.round(total.passesCompleted/total.passesAttempted*100):0;
    box.innerHTML='<h3>우리 팀 기록</h3><div class="replay-stat-grid">'+
      '<div><b>'+total.shots+'</b><small>슈팅</small></div><div><b>'+total.xg.toFixed(2)+'</b><small>xG</small></div>'+
      '<div><b>'+total.passesCompleted+'/'+total.passesAttempted+'</b><small>패스</small></div><div><b>'+passPct+'%</b><small>성공률</small></div>'+
      '<div><b>'+total.progressivePasses+'</b><small>전진 패스</small></div><div><b>'+total.keyPasses+'</b><small>키패스</small></div>'+
      '<div><b>'+total.assists+'</b><small>도움</small></div><div><b>'+total.touches+'</b><small>주요 관여</small></div>'+
      '<div><b>'+total.distance.toFixed(1)+'</b><small>추정 이동 km</small></div></div>'+
      '<p class="muted">패스맵에서 성공·실패 패스, 전진 패스와 슈팅으로 이어진 키패스를 확인할 수 있어요.</p>';
    return;
  }
  var p=replayPlayerMeta(replayFocus),s=replayCurrent.stats[replayFocus]||{};
  if(!p){box.innerHTML='';return;}
  var attempted=Number(s.passesAttempted||0),completed=Number(s.passesCompleted||0),passPct=attempted?Math.round(completed/attempted*100):0;
  box.innerHTML='<span class="history-tag">'+esc(p.era||'역사 선수')+'</span><h3>'+esc(p.name)+' · '+esc(p.pos)+'</h3>'+
    '<div class="replay-stat-grid"><div><b>'+completed+'/'+attempted+'</b><small>패스</small></div><div><b>'+passPct+'%</b><small>성공률</small></div>'+
    '<div><b>'+Number(s.progressivePasses||0)+'</b><small>전진 패스</small></div><div><b>'+Number(s.keyPasses||0)+'</b><small>키패스</small></div>'+
    '<div><b>'+Number(s.assists||0)+'</b><small>도움</small></div><div><b>'+Number(s.shots||0)+'</b><small>슈팅</small></div>'+
    '<div><b>'+Number(s.goals||0)+'</b><small>골</small></div><div><b>'+Number(s.xg||0).toFixed(2)+'</b><small>xG</small></div>'+
    '<div><b>'+Number(s.saves||0)+'</b><small>선방</small></div><div><b>'+Number(s.distance||0).toFixed(1)+'</b><small>추정 이동 km</small></div></div>'+
    '<div class="memory">'+esc(p.memory||'')+'</div>'+
    '<p class="analysis-legend">↗ 청록=성공 · 분홍=실패 · 노랑=전진 패스 · 금색=키패스/도움</p>';
}
function renderReplayEvents(){
  if(!replayCurrent)return;
  var events=replayCurrent.events.filter(function(e){
    return ['goal','shot','save','sub','fact'].indexOf(e.type)>=0||(e.type==='pass'&&(e.keyPass||e.assist));
  }).slice(-20);
  $('replayEvents').innerHTML=events.map(function(e){
    var label=e.type==='pass'?(e.assist?'도움 패스':e.keyPass?'키패스':'패스'):e.text;
    return '<button type="button" data-seek-minute="'+e.minute+'" class="replay-event '+e.type+'"><b>'+e.minute+"'</b><span>"+esc(label)+'</span></button>';
  }).join('')||'<p class="muted">기록된 주요 장면이 없어요.</p>';
  $('replayEvents').querySelectorAll('[data-seek-minute]').forEach(function(b){b.onclick=function(){seekReplayMinute(Number(b.dataset.seekMinute));};});
}
function seekReplayMinute(minute){
  if(!replayCurrent)return;
  var best=0,d=1e9;replayCurrent.frames.forEach(function(f,i){var x=Math.abs(f[0]-minute);if(x<d){d=x;best=i;}});
  replayFrame=best;replayCursor=best;$('replayRange').value=best;replayPlaying=false;updateReplayButtons();drawReplayFrame();
}
function replayPitchBase(ctx,W,H){
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#1f824b';ctx.fillRect(0,0,W,H);
  for(var i=0;i<10;i++){ctx.fillStyle=i%2?'rgba(0,0,0,.035)':'rgba(255,255,255,.035)';ctx.fillRect(i*W/10,0,W/10,H);}
  ctx.strokeStyle='rgba(240,255,246,.88)';ctx.lineWidth=4;ctx.strokeRect(38,35,W-76,H-70);
  ctx.beginPath();ctx.moveTo(W/2,35);ctx.lineTo(W/2,H-35);ctx.stroke();ctx.beginPath();ctx.arc(W/2,H/2,72,0,Math.PI*2);ctx.stroke();
  ctx.strokeRect(38,H/2-125,135,250);ctx.strokeRect(W-173,H/2-125,135,250);
}
function framePlayer(frame,id){
  var row=frame&&frame[6]?frame[6].find(function(x){return x[0]===id;}):null;
  return row?{id:row[0],x:row[1],y:row[2],energy:row[3]}:null;
}
function drawReplayFrame(){
  if(!replayCurrent||!replayCurrent.frames.length)return;
  var canvas=$('replayPitch'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  var frame=replayCurrent.frames[clamp(replayFrame,0,replayCurrent.frames.length-1)];
  var nextFrame=replayCurrent.frames[Math.min(replayFrame+1,replayCurrent.frames.length-1)]||frame;
  var mix=replayMode==='replay'?clamp(replayCursor-replayFrame,0,1):0;
  replayPitchBase(ctx,W,H);

  if(replayMode==='heat'){
    if(replayFocus==='all'){
      var first=replayCurrent.players.find(function(p){return p.side===replayCurrent.userSide;});
      if(first){replayFocus=first.id;$('replayPlayer').value=first.id;updateReplayStats();}
    }
    var heat=replayCurrent.heat[replayFocus]||[],max=Math.max.apply(null,heat.concat([1]));
    for(var hy=0;hy<6;hy++)for(var hx=0;hx<10;hx++){
      var val=heat[hy*10+hx]||0;if(!val)continue;
      var alpha=.08+.62*(val/max),x=38+hx*(W-76)/10,y=35+hy*(H-70)/6;
      ctx.fillStyle='rgba(250,120,45,'+alpha+')';ctx.fillRect(x,y,(W-76)/10+1,(H-70)/6+1);
    }
    var avgX=0,avgY=0,avgN=0;
    replayCurrent.frames.forEach(function(fr){var q=framePlayer(fr,replayFocus);if(q){avgX+=q.x;avgY+=q.y;avgN++;}});
    if(avgN){
      avgX/=avgN;avgY/=avgN;
      var apx=38+avgX/100*(W-76),apy=35+avgY/100*(H-70);
      ctx.strokeStyle='#67e8f9';ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(apx-9,apy-9);ctx.lineTo(apx+9,apy+9);ctx.moveTo(apx+9,apy-9);ctx.lineTo(apx-9,apy+9);ctx.stroke();
    }
    replayCurrent.events.filter(function(e){return e.actorId===replayFocus&&(e.type==='shot'||e.type==='goal')&&e.x!=null&&e.y!=null;}).forEach(function(e){
      var sx=38+e.x/100*(W-76),sy=35+e.y/100*(H-70);ctx.beginPath();ctx.arc(sx,sy,e.type==='goal'?7:5,0,Math.PI*2);
      if(e.type==='goal'){ctx.fillStyle='#facc15';ctx.fill();ctx.strokeStyle='#111827';ctx.lineWidth=2;ctx.stroke();}
      else{ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();}
    });
  }else if(replayMode==='pass'){
    var passEvents=replayCurrent.events.filter(function(e){
      if(e.type!=='pass'||e.x==null||e.toX==null)return false;
      if(replayFocus==='all')return e.side===replayCurrent.userSide;
      return e.actorId===replayFocus;
    });
    passEvents.forEach(function(e){
      var x1=38+e.x/100*(W-76),y1=35+e.y/100*(H-70),x2=38+e.toX/100*(W-76),y2=35+e.toY/100*(H-70);
      var color=e.assist?'#fbbf24':e.keyPass?'#fde047':e.progressive?'#facc15':e.completed?'#5eead4':'#fb7185';
      ctx.save();ctx.globalAlpha=e.completed?.58:.48;ctx.strokeStyle=color;ctx.lineWidth=e.assist?5:e.keyPass?4:e.progressive?3:2;
      if(!e.completed)ctx.setLineDash([7,6]);
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      ctx.setLineDash([]);ctx.globalAlpha=1;
      var ang=Math.atan2(y2-y1,x2-x1),head=e.assist?8:6;
      ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-Math.cos(ang-.55)*head,y2-Math.sin(ang-.55)*head);ctx.lineTo(x2-Math.cos(ang+.55)*head,y2-Math.sin(ang+.55)*head);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();
    });
  }else if(replayFocus!=='all'){
    var start=Math.max(0,replayFrame-14),trail=[];
    for(var ti=start;ti<=replayFrame;ti++){var q=framePlayer(replayCurrent.frames[ti],replayFocus);if(q)trail.push(q);}
    for(var t=1;t<trail.length;t++){
      ctx.beginPath();ctx.moveTo(38+trail[t-1].x/100*(W-76),35+trail[t-1].y/100*(H-70));ctx.lineTo(38+trail[t].x/100*(W-76),35+trail[t].y/100*(H-70));
      ctx.strokeStyle='rgba(250,204,21,'+(t/trail.length*.72)+')';ctx.lineWidth=2+t/trail.length*6;ctx.lineCap='round';ctx.stroke();
    }
  }

  if(replayMode==='replay'){
    frame[6].forEach(function(row){
      var meta=replayPlayerMeta(row[0]);if(!meta)return;
      var nr=nextFrame[6].find(function(x){return x[0]===row[0];})||row;
      var rx=row[1]+(nr[1]-row[1])*mix,ry=row[2]+(nr[2]-row[2])*mix;
      var x=38+rx/100*(W-76),y=35+ry/100*(H-70),focused=replayFocus==='all'||replayFocus===row[0];
      ctx.globalAlpha=focused?1:.2;ctx.beginPath();ctx.arc(x,y,replayFocus===row[0]?17:13,0,Math.PI*2);
      ctx.fillStyle=meta.side===0?'#f8fafc':'#111827';ctx.fill();ctx.strokeStyle=meta.side===0?'#0f172a':'#f8fafc';ctx.lineWidth=3;ctx.stroke();
      if(replayFocus===row[0]){ctx.beginPath();ctx.arc(x,y,23,0,Math.PI*2);ctx.strokeStyle='#facc15';ctx.lineWidth=4;ctx.stroke();}
      ctx.globalAlpha=1;
    });
    var ballX=frame[1]+(nextFrame[1]-frame[1])*mix,ballY=frame[2]+(nextFrame[2]-frame[2])*mix;
    var bx=38+ballX/100*(W-76),by=35+ballY/100*(H-70);if(soccerBallImg.complete&&soccerBallImg.naturalWidth)ctx.drawImage(soccerBallImg,bx-9,by-9,18,18);
  }
  var shownMinute=frame[0]+(nextFrame[0]-frame[0])*mix;
  $('replayMinute').textContent=Math.floor(shownMinute)+"' · "+frame[4]+' : '+frame[5];
  $('replayRange').value=replayFrame;
}
function replayLoop(ts){
  if(!replayCurrent||!replayPlaying)return;
  var dt=Math.min(.1,(ts-replayLast)/1000||0);replayLast=ts;replayCursor+=dt*5*replayPlaySpeed;
  if(replayCursor>=replayCurrent.frames.length-1){replayCursor=replayCurrent.frames.length-1;replayPlaying=false;}
  replayFrame=Math.floor(replayCursor);drawReplayFrame();updateReplayButtons();
  if(replayPlaying)replayRaf=requestAnimationFrame(replayLoop);
}
function trainingModal(){
  modalBody.innerHTML='<h2>이번 주 훈련</h2><p class="muted">하나만 골라요. 모든 선수의 체력도 조금 회복됩니다.</p><div class="training-grid"><button class="training-btn" data-train="shot"><b>⚽ 슈팅 훈련</b><small>세 선수의 슛 +1~2</small></button><button class="training-btn" data-train="pass"><b>🎯 패스 훈련</b><small>세 선수의 패스 +1~2</small></button><button class="training-btn" data-train="defense"><b>🛡 수비 훈련</b><small>세 선수의 수비 +1~2</small></button><button class="training-btn" data-train="stamina"><b>🔋 체력 훈련</b><small>세 선수의 체력 능력 +1~2</small></button><button class="training-btn" data-train="rest"><b>🌿 휴식</b><small>컨디션을 크게 회복</small></button></div>';
  modal.classList.remove('hidden');
  modalBody.querySelectorAll('[data-train]').forEach(function(b){b.onclick=function(){
    var k=b.dataset.train,changed=[];
    state.roster.forEach(function(p){p.fitness=clamp((p.fitness||100)+(k==='rest'?18:9),0,100);});
    if(k!=='rest'){
      var pool=state.roster.slice().sort(function(){return Math.random()-.5;}).slice(0,3);
      pool.forEach(function(p){var plus=1+(Math.random()<.35?1:0);p.stats[k]=clamp(p.stats[k]+plus,0,99);delete p.overall;p.overall=overall(p);changed.push(p.name+' +'+plus);});
    }
    state.trainingAvailable=false;save();modal.classList.add('hidden');toast(k==='rest'?'푹 쉬고 체력을 회복했어요.':changed.join(' · '));if(currentView==='home')home();
  };});
}
function resultToTable(table,homeId,awayId,hg,ag){
  var h=table[homeId],a=table[awayId];if(!h||!a)return;
  h.p++;a.p++;h.gf+=hg;h.ga+=ag;a.gf+=ag;a.ga+=hg;
  if(hg>ag){h.w++;a.l++;h.pts+=3;}else if(hg<ag){a.w++;h.l++;a.pts+=3;}else{h.d++;a.d++;h.pts++;a.pts++;}
}
function aiResult(a,b){
  var ca=clubById(a),cb=clubById(b);
  var ra=S.teamRating(S.assignSlots(ca.players,autoLineup(ca.players,'4-3-3'),'4-3-3',D.formations),ca.tactics);
  var rb=S.teamRating(S.assignSlots(cb.players,autoLineup(cb.players,'4-3-3'),'4-3-3',D.formations),cb.tactics);
  var strengthA=(ra.attack+ra.mid+ra.defense)/3,strengthB=(rb.attack+rb.mid+rb.defense)/3;
  var baseA=1.15+(strengthA-strengthB)/38,baseB=1.05+(strengthB-strengthA)/38;
  function goals(lambda){var g=0,p=Math.exp(-Math.max(.25,lambda)),prod=p,r=Math.random();while(r>prod&&g<6){g++;p*=Math.max(.25,lambda)/g;prod+=p;}return g;}
  return [goals(clamp(baseA,.35,2.4)),goals(clamp(baseB,.35,2.4))];
}
function finishRound(f,hg,ag,replayData){
  f.played=true;f.score=[hg,ag];resultToTable(state.table,f.home,f.away,hg,ag);
  currentFixtures().forEach(function(x){if(x===f)return;var g=aiResult(x.home,x.away);x.played=true;x.score=g;resultToTable(state.table,x.home,x.away,g[0],g[1]);});
  if(state.pyramid&&state.otherLeague){
    var otherRound=state.otherLeague.schedule[state.round]||[];
    otherRound.forEach(function(x){var g=aiResult(x.home,x.away);x.played=true;x.score=g;resultToTable(state.otherLeague.table,x.home,x.away,g[0],g[1]);});
    state.otherLeague.round=state.round+1;
  }
  var isHome=f.home===state.clubId,myGoals=isHome?hg:ag,oppGoals=isHome?ag:hg;
  state.lastResult={season:state.season,round:state.round+1,for:myGoals,against:oppGoals,opponent:opponent(f).id,league:leagueLabel()};
  state.matchHistory.push(clone(state.lastResult));
  if(replayData){
    replayData.season=state.season;replayData.round=state.round+1;replayData.userClubId=state.clubId;
    replayData.userSide=isHome?0:1;replayData.opponentId=opponent(f).id;replayData.league=leagueLabel();
    state.replays.unshift(replayData);state.replays=state.replays.slice(0,6);
  }
  state.round++;state.trainingAvailable=true;
  state.roster.forEach(function(p){if(state.lineup.indexOf(p.id)<0)p.fitness=clamp((p.fitness||100)+5,0,100);});
  state.budget+=80;save();updateTop();sdkScore((state.table[state.clubId]?state.table[state.clubId].pts:0)*100+state.season*1000);
}
function opponentSetup(o){
  return {club:o,roster:clone(o.players),lineup:autoLineup(o.players,'4-3-3'),formation:'4-3-3',tactics:clone(o.tactics)};
}
function startMatch(){
  var f=myFixture();if(!f)return;
  if(state.lineup.length!==11){state.lineup=autoLineup(state.roster,state.formation);save();}
  var own=clubById(state.clubId),o=opponent(f),opp=opponentSetup(o),isHome=f.home===state.clubId;
  var homeClub=isHome?own:o,awayClub=isHome?o:own;
  var opts=isHome?{
    homeClub:own,homeRoster:state.roster,homeLineup:state.lineup,homeFormation:state.formation,homeTactics:clone(state.tactics),
    awayClub:o,awayRoster:opp.roster,awayLineup:opp.lineup,awayFormation:opp.formation,awayTactics:opp.tactics
  }:{
    homeClub:o,homeRoster:opp.roster,homeLineup:opp.lineup,homeFormation:opp.formation,homeTactics:opp.tactics,
    awayClub:own,awayRoster:state.roster,awayLineup:state.lineup,awayFormation:state.formation,awayTactics:clone(state.tactics)
  };
  opts.formations=D.formations;opts.onEvent=matchEvent;opts.onFinish=function(m){setTimeout(function(){showMatchResult(m,f,isHome);},400);};
  match=S.create(opts);match.userSide=isHome?0:1;match.fixture=f;matchSpeed=1;resultShown=false;
  $('homeName').textContent=homeClub.name;$('awayName').textContent=awayClub.name;$('matchScore').textContent='0 : 0';$('matchClock').textContent="0'";
  $('eventLog').innerHTML='';$('matchLayer').classList.remove('hidden');setSpeed(1);updateLiveTactic();
  cancelAnimationFrame(raf);lastFrame=performance.now();raf=requestAnimationFrame(matchLoop);sound('start');
}
function matchEvent(e){
  var log=$('eventLog'),div=document.createElement('div');div.className='event-line '+(e.type==='goal'?'goal':e.type==='fact'?'fact':'');
  div.textContent=e.minute+"' · "+e.text;log.prepend(div);
  while(log.children.length>16)log.removeChild(log.lastChild);
  if(e.type==='goal'){matchSfx('goal',1);sound('success');}
  else if(e.type==='save')matchSfx('impact',1.08);
  else if(e.type==='shot')matchSfx('whoosh',1.08);
  else if(e.type==='sub')matchSfx('confirm',1);
}
function setSpeed(s){matchSpeed=s;document.querySelectorAll('.speed[data-speed]').forEach(function(b){b.classList.toggle('active',Number(b.dataset.speed)===s);});}
function updateLiveTactic(){
  var t=state.tactics;
  var labels={short:'짧게 연결',direct:'빠르게 앞으로',wide:'측면으로',press:'바로 압박',shape:'자리를 지켜',attack:'공격',balanced:'균형',defend:'수비'};
  var attackIcon=t.attack==='direct'?'⚡':t.attack==='wide'?'↔️':'🎯';
  var pressIcon=t.press==='press'?'🔥':'🧱';
  var mindIcon=t.mindset==='attack'?'⬆️':t.mindset==='defend'?'⬇️':'⚖️';
  $('liveTacticText').innerHTML=
    '<div class="tactic-live-row"><span>'+attackIcon+'</span><b>'+labels[t.attack]+'</b></div>'+
    '<div class="tactic-live-row"><span>'+pressIcon+'</span><b>'+labels[t.press]+'</b></div>'+
    '<div class="tactic-live-row"><span>'+mindIcon+'</span><b>'+labels[t.mindset]+'</b></div>'+
    '<small class="muted">선수 이동 꼬리와 압박 방향을 보며 작전 효과를 확인해요.</small>';
}
function drawMatch(){
  if(!match)return;
  var canvas=$('pitch'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#1f824b';ctx.fillRect(0,0,W,H);
  for(var stripe=0;stripe<10;stripe++){
    ctx.fillStyle=stripe%2===0?'rgba(255,255,255,.035)':'rgba(0,0,0,.035)';
    ctx.fillRect(stripe*(W/10),0,W/10,H);
  }
  var glow=ctx.createRadialGradient(W/2,H/2,40,W/2,H/2,W*.62);
  glow.addColorStop(0,'rgba(255,255,255,.035)');glow.addColorStop(1,'rgba(0,0,0,.08)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);

  ctx.strokeStyle='rgba(240,255,246,.88)';ctx.lineWidth=4;
  ctx.strokeRect(38,35,W-76,H-70);
  ctx.beginPath();ctx.moveTo(W/2,35);ctx.lineTo(W/2,H-35);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,72,0,Math.PI*2);ctx.stroke();
  ctx.strokeRect(38,H/2-125,135,250);ctx.strokeRect(W-173,H/2-125,135,250);
  ctx.strokeRect(38,H/2-64,48,128);ctx.strokeRect(W-86,H/2-64,48,128);
  ctx.fillStyle='rgba(255,255,255,.9)';
  ctx.beginPath();ctx.arc(128,H/2,3.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(W-128,H/2,3.5,0,Math.PI*2);ctx.fill();

  match.teams.forEach(function(t,side){
    t.actors.forEach(function(a){
      if(!a.trail||a.trail.length<2)return;
      for(var i=1;i<a.trail.length;i++){
        var p1=a.trail[i-1],p2=a.trail[i],alpha=(i/a.trail.length)*.30;
        var x1=38+p1.x/100*(W-76),y1=35+p1.y/100*(H-70);
        var x2=38+p2.x/100*(W-76),y2=35+p2.y/100*(H-70);
        ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=t.club.accent||(side===0?'#5eead4':'#f9a8d4');
        ctx.lineWidth=1.5+(i/a.trail.length)*5;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
      }
    });
  });

  if(match.ball.trail&&match.ball.trail.length>1){
    for(var j=1;j<match.ball.trail.length;j++){
      var b1=match.ball.trail[j-1],b2=match.ball.trail[j],ba=(j/match.ball.trail.length)*.36;
      var bx1=38+b1.x/100*(W-76),by1=35+b1.y/100*(H-70);
      var bx2=38+b2.x/100*(W-76),by2=35+b2.y/100*(H-70);
      ctx.beginPath();ctx.moveTo(bx1,by1);ctx.lineTo(bx2,by2);
      ctx.strokeStyle='rgba(255,246,184,'+ba+')';ctx.lineWidth=1.5+(j/match.ball.trail.length)*4;ctx.lineCap='round';ctx.stroke();
    }
  }

  (match.passVisuals||[]).forEach(function(pv){
    var x1=38+pv.x/100*(W-76),y1=35+pv.y/100*(H-70),x2=38+pv.toX/100*(W-76),y2=35+pv.toY/100*(H-70);
    ctx.save();ctx.globalAlpha=Math.max(.08,pv.life*.72);
    ctx.strokeStyle=pv.completed?(pv.progressive?'#facc15':'#a7f3d0'):'#fb7185';
    ctx.lineWidth=pv.progressive?4:3;if(!pv.completed)ctx.setLineDash([8,7]);
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
  });

  (match.effects||[]).forEach(function(fx){
    var x=38+fx.x/100*(W-76),y=35+fx.y/100*(H-70),life=fx.life,r=7+(1-life)*24;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    if(fx.kind==='goal'){ctx.strokeStyle='rgba(250,204,21,'+(life*.95)+')';ctx.lineWidth=6;}
    else if(fx.kind==='save'){ctx.strokeStyle='rgba(96,165,250,'+(life*.85)+')';ctx.lineWidth=4;}
    else if(fx.kind==='sub'){ctx.strokeStyle='rgba(52,211,153,'+(life*.8)+')';ctx.lineWidth=4;}
    else{ctx.strokeStyle='rgba(255,255,255,'+(life*.5)+')';ctx.lineWidth=3;}
    ctx.stroke();
  });

  match.teams.forEach(function(t,side){
    t.actors.forEach(function(a){
      var x=38+a.x/100*(W-76),y=35+a.y/100*(H-70);
      if(a.id===match.lastTouchId||a.pulse>0){
        var pulseR=19+Math.sin(performance.now()*.012)*2+a.pulse*6;
        ctx.beginPath();ctx.arc(x,y,pulseR,0,Math.PI*2);
        ctx.strokeStyle=side===0?'rgba(94,234,212,'+(.22+a.pulse*.38)+')':'rgba(249,168,212,'+(.22+a.pulse*.38)+')';
        ctx.lineWidth=3;ctx.stroke();
      }
      ctx.beginPath();ctx.fillStyle=side===0?'#f8fafc':'#111827';
      ctx.strokeStyle=t.club.accent||(side===0?'#0f172a':'#f8fafc');ctx.lineWidth=3;
      ctx.arc(x,y,15,0,Math.PI*2);ctx.fill();ctx.stroke();

      if(a.flash>0){
        ctx.beginPath();ctx.arc(x,y,17+a.flash*10,0,Math.PI*2);
        ctx.strokeStyle='rgba(255,255,255,'+(a.flash*.55)+')';ctx.lineWidth=2;ctx.stroke();
      }

      var label=a.p.name.length>5?a.p.name.slice(0,5):a.p.name;
      ctx.font='800 9px system-ui';ctx.textAlign='center';
      var tw=Math.max(28,ctx.measureText(label).width+9);
      ctx.fillStyle='rgba(5,15,27,.76)';
      ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(x-tw/2,y+18,tw,16,6);else ctx.rect(x-tw/2,y+18,tw,16);
      ctx.fill();
      ctx.fillStyle='#f8fafc';ctx.fillText(label,x,y+29);

      if(a.side===match.userSide){
        ctx.fillStyle='rgba(4,17,31,.72)';ctx.fillRect(x-16,y+37,32,4);
        ctx.fillStyle=a.energy>55?'#34d399':a.energy>35?'#facc15':'#fb7185';
        ctx.fillRect(x-16,y+37,32*a.energy/100,4);
      }
    });
  });

  var bx=38+match.ball.x/100*(W-76),by=35+match.ball.y/100*(H-70);
  ctx.save();ctx.shadowColor='rgba(255,255,255,.7)';ctx.shadowBlur=12;
  if(soccerBallImg.complete&&soccerBallImg.naturalWidth)ctx.drawImage(soccerBallImg,bx-10,by-10,20,20);
  else{ctx.beginPath();ctx.arc(bx,by,7,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#111827';ctx.lineWidth=2;ctx.stroke();}
  ctx.restore();
}
function matchLoop(ts){
  if(!match||$('matchLayer').classList.contains('hidden'))return;
  var dt=Math.min(.05,(ts-lastFrame)/1000||0);lastFrame=ts;match.update(dt,matchSpeed);drawMatch();
  $('matchScore').textContent=match.score[0]+' : '+match.score[1];$('matchClock').textContent=Math.floor(match.minute)+"'";
  if(!match.finished)raf=requestAnimationFrame(matchLoop);
}
function quickSub(){
  if(!match||match.finished)return;var side=match.userSide,t=match.teams[side];
  var on=t.actors.slice().sort(function(a,b){return a.energy-b.energy;})[0];
  var ids=t.actors.map(function(a){return a.id;});
  var bench=state.roster.filter(function(p){return ids.indexOf(p.id)<0;}).sort(function(a,b){return S.playerScore(b,on.slot)-S.playerScore(a,on.slot);})[0];
  if(!bench){toast('교체할 후보가 없어요.');return;}
  if(match.substitute(side,on.id,bench)){toast(on.p.name+' → '+bench.name+' · 다음 경기 선발은 그대로예요.');}
}
function showMatchResult(m,f,isHome){
  if(resultShown)return;resultShown=true;
  var hg=m.score[0],ag=m.score[1],mine=isHome?hg:ag,theirs=isHome?ag:hg,o=opponent(f);
  var replayData=m.exportReplay?m.exportReplay():null;
  finishRound(f,hg,ag,replayData);
  var verdict=mine>theirs?'승리!':mine<theirs?'아쉬운 패배':'무승부';
  var why=state.tactics.press==='press'?'강한 압박은 공을 되찾는 데 도움이 되지만 체력 소모가 컸어요.':state.tactics.mindset==='defend'?'수비적으로 내려서 실점 위험을 줄이는 선택을 했어요.':state.tactics.attack==='direct'?'빠르게 앞으로 보내는 작전으로 전환 속도를 높였어요.':'패스와 위치를 활용해 균형 있게 경기를 운영했어요.';
  var facts=m.events.filter(function(e){return e.actor&&e.actor.historical;}).slice(-2).map(function(e){return '<div class="memory">'+esc(e.actor.name)+' · '+esc(e.actor.memory)+'</div>';}).join('');
  modalBody.innerHTML='<span class="eyebrow">'+esc(o.name)+'전</span><h2>'+verdict+'</h2><div class="result-score">'+mine+' : '+theirs+'</div><div class="fact-box"><b>감독 분석</b><br>'+esc(why)+'</div><h3 style="margin-top:16px">오늘 경기에서 만난 역사</h3>'+facts+'<div class="action-row" style="margin-top:16px"><button id="resultHome" class="primary" type="button">감독실로</button><button id="resultAnalysis" class="secondary" type="button">📊 경기 분석</button><button id="resultTrain" class="secondary" type="button">바로 훈련</button></div>';
  modal.classList.remove('hidden');$('resultAnalysis').onclick=function(){modal.classList.add('hidden');$('matchLayer').classList.add('hidden');match=null;openReplay(0);};$('resultHome').onclick=function(){modal.classList.add('hidden');$('matchLayer').classList.add('hidden');match=null;render('home');};$('resultTrain').onclick=function(){modal.classList.add('hidden');$('matchLayer').classList.add('hidden');match=null;render('home');trainingModal();};
}
function help(){
  modalBody.innerHTML='<h2>역사 드림리그 하는 법</h2><div class="fact-box"><b>1. 선수단</b><br>역사 인물 18명 중 선발 11명을 골라요.<br><br><b>2. 작전</b><br>포메이션과 공격·압박·태도를 정해요.<br><br><b>3. 경기</b><br>전술과 선수 능력, 체력이 2D 경기 움직임과 결과에 반영돼요.<br><br><b>4. 분석실</b><br>경기를 다시 보며 한 선수를 따라가고 히트맵·패스맵·전진 패스·키패스·xG를 확인해요.<br><br><b>5. 리그</b><br>첫 시즌은 배치 리그이며, 이후 1부 우승과 2부 승격, 1부 강등이 매 시즌 이어져요.</div><p class="muted">역사 인물의 축구 포지션과 능력치는 전부 가상의 게임 설정입니다. 역사적 인물의 업적이나 중요도를 순위로 평가하지 않습니다.</p>';
  modal.classList.remove('hidden');
}

$('newGameBtn').onclick=showClubs;
$('continueBtn').onclick=function(){state=load();if(state)enter(true);};
document.querySelectorAll('.nav-btn').forEach(function(b){b.onclick=function(){render(b.dataset.view);};});
$('helpBtn').onclick=help;
function closeModalSmart(){
  modal.classList.add('hidden');
  if(match&&match.finished){
    $('matchLayer').classList.add('hidden');
    match=null;
    render('home');
  }
}
$('modalClose').onclick=closeModalSmart;
modal.addEventListener('pointerdown',function(e){if(e.target===modal)closeModalSmart();});
document.querySelectorAll('.speed[data-speed]').forEach(function(b){b.onclick=function(){setSpeed(Number(b.dataset.speed));};});
$('quickSubBtn').onclick=quickSub;
$('replayClose').onclick=closeReplay;
$('replayPlay').onclick=function(){
  if(!replayCurrent)return;
  replayPlaying=!replayPlaying;updateReplayButtons();
  if(replayPlaying){if(replayFrame>=replayCurrent.frames.length-1){replayFrame=0;replayCursor=0;}$('replayRange').value=replayFrame;replayLast=performance.now();cancelAnimationFrame(replayRaf);replayRaf=requestAnimationFrame(replayLoop);}
};
$('replaySpeed').onchange=function(){replayPlaySpeed=clamp(Number(this.value)||1,.5,4);};
$('replayRange').oninput=function(){
  if(!replayCurrent)return;replayPlaying=false;replayFrame=Number(this.value)||0;replayCursor=replayFrame;updateReplayButtons();drawReplayFrame();
};
$('replayPlayer').onchange=function(){replayFocus=this.value||'all';updateReplayStats();drawReplayFrame();};
document.querySelectorAll('[data-rmode]').forEach(function(b){b.onclick=function(){
  replayMode=b.dataset.rmode;replayPlaying=false;
  if(replayMode==='heat'&&replayFocus==='all'&&replayCurrent){
    var first=replayCurrent.players.find(function(p){return p.side===replayCurrent.userSide;});
    if(first){replayFocus=first.id;$('replayPlayer').value=first.id;}
  }
  updateReplayButtons();updateReplayStats();drawReplayFrame();
};});
$('replayPitch').addEventListener('pointerdown',function(e){
  if(!replayCurrent||replayMode!=='replay')return;
  var frame=replayCurrent.frames[replayFrame];if(!frame)return;
  var rect=this.getBoundingClientRect(),mx=(e.clientX-rect.left)*this.width/rect.width,my=(e.clientY-rect.top)*this.height/rect.height;
  var best=null,bestD=34;
  frame[6].forEach(function(row){
    var x=38+row[1]/100*(1000-76),y=35+row[2]/100*(600-70),d=Math.hypot(mx-x,my-y);
    if(d<bestD){bestD=d;best=row[0];}
  });
  if(best){replayFocus=best;$('replayPlayer').value=best;updateReplayStats();drawReplayFrame();}
});
$('matchBackBtn').onclick=function(){
  if(!match||match.finished){$('matchLayer').classList.add('hidden');match=null;return;}
  modalBody.innerHTML='<h2>경기에서 나갈까요?</h2><p class="muted">이 경기는 저장되지 않고 라운드도 진행되지 않아요.</p><div class="action-row"><button id="leaveYes" class="primary" type="button">나가기</button><button id="leaveNo" class="secondary" type="button">계속 경기</button></div>';
  modal.classList.remove('hidden');$('leaveYes').onclick=function(){cancelAnimationFrame(raf);match=null;modal.classList.add('hidden');$('matchLayer').classList.add('hidden');};$('leaveNo').onclick=function(){modal.classList.add('hidden');};
};

state=load();
if(state){$('continueBtn').classList.remove('hidden');$('continueBtn').textContent='시즌 '+state.season+' · '+(state.round+1)+'R 이어하기';}
})();