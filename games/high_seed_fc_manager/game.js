(function(){
'use strict';

var D=window.SeedFCData,S=window.SeedFCSim;
if(!D||!S){document.body.innerHTML='<p style="padding:30px">게임 데이터를 불러오지 못했어요.</p>';return;}

var SAVE_KEY='kidscade_game_v1:high_seed_fc_manager:save';
var state=null,currentView='home',squadFilter='all',historyFilter=null;
var modal=document.getElementById('modal'),modalBody=document.getElementById('modalBody');
var toastEl=document.getElementById('toast'),toastTimer=0;
var match=null,matchSpeed=1,raf=0,lastFrame=0,resultShown=false;

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
    if(v&&v.version===1&&clubById(v.clubId))return v;
  }catch(e){}
  return null;
}
function tableBlank(){
  var t={};D.clubs.forEach(function(c){t[c.id]={clubId:c.id,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0};});return t;
}
function schedule(){
  var ids=D.clubs.map(function(c){return c.id;}),fixed=ids[0],rotate=ids.slice(1),rounds=[];
  for(var r=0;r<ids.length-1;r++){
    var arr=[fixed].concat(rotate),fs=[];
    for(var i=0;i<arr.length/2;i++){
      var a=arr[i],b=arr[arr.length-1-i],flip=(r+i)%2===1;
      fs.push({home:flip?b:a,away:flip?a:b,played:false,score:null});
    }
    rounds.push(fs);rotate.unshift(rotate.pop());
  }
  return rounds.concat(rounds.map(function(fs){return fs.map(function(f){return {home:f.away,away:f.home,played:false,score:null};});}));
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
    version:1,clubId:clubId,season:1,round:0,budget:c.budget,formation:'4-3-3',
    tactics:clone(c.tactics),roster:roster,lineup:autoLineup(roster,'4-3-3'),
    schedule:schedule(),table:tableBlank(),matchHistory:[],trainingAvailable:false,
    worldSigned:[],managerNotes:[],lastResult:null
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
  state.roster.forEach(function(p){if(p.fitness==null)p.fitness=100;if(p.form==null)p.form=0;});
}
function rows(){
  return Object.keys(state.table).map(function(k){return state.table[k];}).sort(function(a,b){
    if(b.pts!==a.pts)return b.pts-a.pts;
    var ag=a.gf-a.ga,bg=b.gf-b.ga;if(bg!==ag)return bg-ag;
    if(b.gf!==a.gf)return b.gf-a.gf;
    return clubById(a.clubId).name.localeCompare(clubById(b.clubId).name,'ko');
  });
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
  var c=clubById(state.clubId);
  el.innerHTML='<span>'+c.emoji+'</span><b>'+esc(c.name)+'</b><small>시즌 '+state.season+' · '+(state.round>=state.schedule.length?'종료':(state.round+1)+'R')+'</small>';
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
  var root=$('viewRoot'),c=clubById(state.clubId),r=rank();
  if(state.round>=state.schedule.length){
    var top=clubById(rows()[0].clubId);
    root.innerHTML='<div class="dashboard"><section class="panel next-match"><span class="round-pill">시즌 '+state.season+' 종료</span><h2 style="font-size:34px;margin-top:13px">'+c.emoji+' '+esc(c.name)+'</h2><p class="muted">최종 '+r+'위 · 승점 '+state.table[state.clubId].pts+'</p><div class="fact-box">우승 팀은 <b>'+top.emoji+' '+esc(top.name)+'</b>입니다. 지금 선수단을 그대로 이어서 다음 시즌에 도전할 수 있어요.</div><div class="action-row" style="margin-top:18px"><button id="nextSeason" class="primary" type="button">다음 시즌 시작</button></div></section><aside class="panel"><h3>시즌 기록</h3><p>'+state.matchHistory.filter(function(x){return x.season===state.season;}).length+'경기 완료</p><p class="muted">역사 수첩에서 각 시대의 인물을 다시 살펴볼 수 있어요.</p></aside></div>';
    $('nextSeason').onclick=function(){state.season++;state.round=0;state.schedule=schedule();state.table=tableBlank();state.trainingAvailable=false;state.budget+=500;state.roster.forEach(function(p){p.fitness=100;});save();updateTop();home();toast('새 시즌이 시작됐어요!');};return;
  }
  var f=myFixture(),o=opponent(f),spot=nextHistoryPlayer(),rs=rows().slice(0,5);
  var tired=state.lineup.map(playerById).filter(function(p){return p&&(p.fitness||100)<70;});
  var tasks=[];
  if(state.trainingAvailable)tasks.push(['🏋️ 훈련 가능','경기 뒤 훈련을 골라 선수 능력과 체력을 관리해요.']);
  if(tired.length)tasks.push(['🔋 체력 확인',tired[0].name+' 등 선발 선수의 체력이 낮아요.']);
  tasks.push(['💰 팀 예산',fmt(state.budget)+' · 세계 용병 시장에서 역사 인물을 영입할 수 있어요.']);
  root.innerHTML='<div class="dashboard">'+
    '<section class="panel next-match"><span class="round-pill">시즌 '+state.season+' · '+(state.round+1)+'라운드</span><div class="versus"><div class="team-block"><span class="big-crest">'+c.emoji+'</span><b>'+esc(c.name)+'</b><small class="muted">'+esc(c.style)+'</small></div><div class="vs">VS</div><div class="team-block"><span class="big-crest">'+o.emoji+'</span><b>'+esc(o.name)+'</b><small class="muted">'+esc(o.style)+'</small></div></div><div class="action-row"><button id="playMatch" class="primary" type="button">경기 시작</button><button id="toTactics" class="secondary" type="button">작전 확인</button></div></section>'+
    '<aside class="panel"><h3>현재 '+r+'위</h3><div class="stand-mini">'+rs.map(function(x,i){var cc=clubById(x.clubId);return '<div class="stand-row '+(x.clubId===state.clubId?'me':'')+'"><b>'+(i+1)+'</b><span>'+cc.emoji+' '+esc(cc.short)+'</span><span>'+x.p+'경기</span><b>'+x.pts+'</b></div>';}).join('')+'</div></aside>'+
    '<section class="panel"><h3>이번 주 할 일</h3><div class="task-list">'+tasks.map(function(t,i){return '<div class="task" data-task="'+i+'"><strong>'+t[0]+'</strong><small>'+esc(t[1])+'</small></div>';}).join('')+'</div></section>'+
    '<aside class="panel"><h3>오늘의 역사 선수</h3><div class="player-top"><div><span class="history-tag">'+esc(spot.era)+'</span><h3>'+esc(spot.name)+'</h3></div><span class="pos">'+esc(D.positionKo[spot.pos])+'</span></div><p class="muted">'+esc(spot.fact)+'</p><div class="memory">'+esc(spot.memory)+'</div></aside>'+
    '</div>';
  $('playMatch').onclick=startMatch;$('toTactics').onclick=function(){render('tactics');};
  if(state.trainingAvailable){var t=root.querySelector('[data-task="0"]');if(t){t.style.cursor='pointer';t.onclick=trainingModal;}}
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
  var root=$('viewRoot'),rs=rows();
  root.innerHTML='<div class="section-bar"><div><span class="eyebrow">시즌 '+state.season+'</span><h2>리그 순위</h2></div></div><table class="table-full"><thead><tr><th>#</th><th>구단</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득실</th><th>승점</th></tr></thead><tbody>'+rs.map(function(x,i){var c=clubById(x.clubId);return '<tr class="'+(x.clubId===state.clubId?'me':'')+'"><td>'+(i+1)+'</td><td>'+c.emoji+' '+esc(c.name)+'</td><td>'+x.p+'</td><td>'+x.w+'</td><td>'+x.d+'</td><td>'+x.l+'</td><td>'+((x.gf-x.ga)>=0?'+':'')+(x.gf-x.ga)+'</td><td><b>'+x.pts+'</b></td></tr>';}).join('')+'</tbody></table>';
}
function trainingModal(){
  modalBody.innerHTML='<h2>이번 주 훈련</h2><p class="muted">하나만 골라요. 모든 선수의 체력도 조금 회복됩니다.</p><div class="training-grid"><button class="training-btn" data-train="shot"><b>⚽ 슈팅 훈련</b><small>세 선수의 슛 +1~2</small></button><button class="training-btn" data-train="pass"><b>🎯 패스 훈련</b><small>세 선수의 패스 +1~2</small></button><button class="training-btn" data-train="defense"><b>🛡 수비 훈련</b><small>세 선수의 수비 +1~2</small></button><button class="training-btn" data-train="stamina"><b>🔋 체력 훈련</b><small>세 선수의 체력 능력 +1~2</small></button><button class="training-btn" data-train="rest"><b>🌿 휴식</b><small>컨디션을 크게 회복</small></button></div>';
  modal.classList.remove('hidden');
  modalBody.querySelectorAll('[data-train]').forEach(function(b){b.onclick=function(){
    var k=b.dataset.train,changed=[];
    state.roster.forEach(function(p){p.fitness=clamp((p.fitness||100)+(k==='rest'?18:9),0,100);});
    if(k!=='rest'){
      var pool=state.roster.slice().sort(function(){return Math.random()-.5;}).slice(0,3);
      pool.forEach(function(p){var plus=1+(Math.random()<.35?1:0);p.stats[k]=clamp(p.stats[k]+plus,0,99);p.overall=overall(p);changed.push(p.name+' +'+plus);});
    }
    state.trainingAvailable=false;save();modal.classList.add('hidden');toast(k==='rest'?'푹 쉬고 체력을 회복했어요.':changed.join(' · '));if(currentView==='home')home();
  };});
}
function resultToTable(homeId,awayId,hg,ag){
  var h=state.table[homeId],a=state.table[awayId];h.p++;a.p++;h.gf+=hg;h.ga+=ag;a.gf+=ag;a.ga+=hg;
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
function finishRound(f,hg,ag){
  f.played=true;f.score=[hg,ag];resultToTable(f.home,f.away,hg,ag);
  currentFixtures().forEach(function(x){if(x===f)return;var g=aiResult(x.home,x.away);x.played=true;x.score=g;resultToTable(x.home,x.away,g[0],g[1]);});
  var isHome=f.home===state.clubId,myGoals=isHome?hg:ag,oppGoals=isHome?ag:hg;
  state.lastResult={season:state.season,round:state.round+1,for:myGoals,against:oppGoals,opponent:opponent(f).id};
  state.matchHistory.push(clone(state.lastResult));state.round++;state.trainingAvailable=true;
  state.roster.forEach(function(p){if(state.lineup.indexOf(p.id)<0)p.fitness=clamp((p.fitness||100)+5,0,100);});
  state.budget+=80;save();updateTop();sdkScore(state.table[state.clubId].pts*100+state.season*1000);
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
  if(e.type==='goal')sound('success');
}
function setSpeed(s){matchSpeed=s;document.querySelectorAll('.speed').forEach(function(b){b.classList.toggle('active',Number(b.dataset.speed)===s);});}
function updateLiveTactic(){
  var t=state.tactics,labels={short:'짧게 연결',direct:'빠르게 앞으로',wide:'측면으로',press:'바로 압박',shape:'자리를 지켜',attack:'공격',balanced:'균형',defend:'수비'};
  $('liveTacticText').innerHTML='<p><b>'+labels[t.attack]+'</b></p><p>'+labels[t.press]+' · '+labels[t.mindset]+'</p><small class="muted">작전판에서 바꾼 선택이 경기 계산에 반영돼요.</small>';
}
function drawMatch(){
  if(!match)return;var canvas=$('pitch'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#23834e';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=4;ctx.strokeRect(38,35,W-76,H-70);
  ctx.beginPath();ctx.moveTo(W/2,35);ctx.lineTo(W/2,H-35);ctx.stroke();ctx.beginPath();ctx.arc(W/2,H/2,72,0,Math.PI*2);ctx.stroke();
  ctx.strokeRect(38,H/2-125,135,250);ctx.strokeRect(W-173,H/2-125,135,250);
  match.teams.forEach(function(t,side){t.actors.forEach(function(a){
    var x=38+a.x/100*(W-76),y=35+a.y/100*(H-70);
    ctx.beginPath();ctx.fillStyle=side===0?'#f8fafc':'#111827';ctx.strokeStyle=side===0?'#111827':'#f8fafc';ctx.lineWidth=3;ctx.arc(x,y,14,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=side===0?'#111827':'#f8fafc';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText(a.p.name.slice(0,4),x,y+3);
    if(a.side===match.userSide){ctx.fillStyle='rgba(52,211,153,.9)';ctx.fillRect(x-14,y+18,28*a.energy/100,3);}
  });});
  var bx=38+match.ball.x/100*(W-76),by=35+match.ball.y/100*(H-70);ctx.font='24px system-ui';ctx.fillText('⚽',bx,by+8);
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
  if(match.substitute(side,on.id,bench)){state.lineup=state.lineup.filter(function(id){return id!==on.id;});state.lineup.push(bench.id);save();toast(on.p.name+' → '+bench.name);}
}
function showMatchResult(m,f,isHome){
  if(resultShown)return;resultShown=true;
  var hg=m.score[0],ag=m.score[1],mine=isHome?hg:ag,theirs=isHome?ag:hg,o=opponent(f);
  finishRound(f,hg,ag);
  var verdict=mine>theirs?'승리!':mine<theirs?'아쉬운 패배':'무승부';
  var why=state.tactics.press==='press'?'강한 압박은 공을 되찾는 데 도움이 되지만 체력 소모가 컸어요.':state.tactics.mindset==='defend'?'수비적으로 내려서 실점 위험을 줄이는 선택을 했어요.':state.tactics.attack==='direct'?'빠르게 앞으로 보내는 작전으로 전환 속도를 높였어요.':'패스와 위치를 활용해 균형 있게 경기를 운영했어요.';
  var facts=m.events.filter(function(e){return e.actor&&e.actor.historical;}).slice(-2).map(function(e){return '<div class="memory">'+esc(e.actor.name)+' · '+esc(e.actor.memory)+'</div>';}).join('');
  modalBody.innerHTML='<span class="eyebrow">'+esc(o.name)+'전</span><h2>'+verdict+'</h2><div class="result-score">'+mine+' : '+theirs+'</div><div class="fact-box"><b>감독 분석</b><br>'+esc(why)+'</div><h3 style="margin-top:16px">오늘 경기에서 만난 역사</h3>'+facts+'<div class="action-row" style="margin-top:16px"><button id="resultHome" class="primary" type="button">감독실로</button><button id="resultTrain" class="secondary" type="button">바로 훈련</button></div>';
  modal.classList.remove('hidden');$('resultHome').onclick=function(){modal.classList.add('hidden');$('matchLayer').classList.add('hidden');match=null;render('home');};$('resultTrain').onclick=function(){modal.classList.add('hidden');$('matchLayer').classList.add('hidden');match=null;render('home');trainingModal();};
}
function help(){
  modalBody.innerHTML='<h2>역사 드림리그 하는 법</h2><div class="fact-box"><b>1. 선수단</b><br>역사 인물 18명 중 선발 11명을 골라요.<br><br><b>2. 작전</b><br>포메이션과 공격·압박·태도를 간단히 선택해요.<br><br><b>3. 경기</b><br>선택한 전술과 선수 능력, 체력이 2D 경기 결과에 실제로 반영돼요.<br><br><b>4. 성장</b><br>경기 뒤 훈련하고 세계의 역사 인물을 영입해 팀을 키워요.</div><p class="muted">역사 인물의 축구 포지션과 능력치는 전부 가상의 게임 설정입니다. 역사적 인물의 업적이나 중요도를 순위로 평가하지 않습니다.</p>';
  modal.classList.remove('hidden');
}

$('newGameBtn').onclick=showClubs;
$('continueBtn').onclick=function(){state=load();if(state)enter(true);};
document.querySelectorAll('.nav-btn').forEach(function(b){b.onclick=function(){render(b.dataset.view);};});
$('helpBtn').onclick=help;
$('modalClose').onclick=function(){modal.classList.add('hidden');};
modal.addEventListener('pointerdown',function(e){if(e.target===modal)modal.classList.add('hidden');});
document.querySelectorAll('.speed').forEach(function(b){b.onclick=function(){setSpeed(Number(b.dataset.speed));};});
$('quickSubBtn').onclick=quickSub;
$('matchBackBtn').onclick=function(){
  if(!match||match.finished){$('matchLayer').classList.add('hidden');match=null;return;}
  modalBody.innerHTML='<h2>경기에서 나갈까요?</h2><p class="muted">이 경기는 저장되지 않고 라운드도 진행되지 않아요.</p><div class="action-row"><button id="leaveYes" class="primary" type="button">나가기</button><button id="leaveNo" class="secondary" type="button">계속 경기</button></div>';
  modal.classList.remove('hidden');$('leaveYes').onclick=function(){cancelAnimationFrame(raf);match=null;modal.classList.add('hidden');$('matchLayer').classList.add('hidden');};$('leaveNo').onclick=function(){modal.classList.add('hidden');};
};

state=load();
if(state){$('continueBtn').classList.remove('hidden');$('continueBtn').textContent='시즌 '+state.season+' · '+(state.round+1)+'R 이어하기';}
})();