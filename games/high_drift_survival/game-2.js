function ensureRuntimeState(){
 if(!state)return;
 state.eco=Number.isFinite(state.eco)?state.eco:86;
 state.skills=Object.assign({gather:0,fish:0,farm:0,repair:0},state.skills||{});
 state.knowledge=Object.assign({...KNOW},state.knowledge||{});
 state.built=Object.assign({shelter:0,fire:false,rain:false,field:false,drying:false,storage:false,sos:false},state.built||{});
 state.tools=Object.assign({rod:false,radio:false,lighthouse:false,boat:false,mirror:false},state.tools||{});
 state.scouted=Object.assign({beach:0,forest:0,cliff:0},state.scouted||{});
 state.farmStage=state.farmStage||0;state.farmCare=state.farmCare||0;
}
function move(to){
 ensureRuntimeState();
 if(!state.unlocked[to]){toast('아직 갈 수 없는 곳이에요.');return}
 if(!LINKS[state.place]||!LINKS[state.place].includes(to)){toast('현재 위치와 바로 연결되지 않았어요.');return}
 if(to==='cliff'&&!state.inv.rope){toast('절벽은 밧줄이 있어야 안전하게 오를 수 있어요.');return}
 const from=PLACE[state.place].name;state.place=to;advance(.5,5);log(from+' → '+PLACE[to].name+' 이동.');render();
}
function scout(place){
 ensureRuntimeState();state.scouted[place]=(state.scouted[place]||0)+1;
 if(place==='beach'){
  if(!state.unlocked.cove){state.unlocked.cove=true;state.knowledge.tide=true;addItem('metal',1);addItem('wood',1);log('해안선을 조사해 바위 만으로 가는 길과 쓸 만한 부품을 찾았다.');}
  else{addItem('wood',1);addItem(state.scouted.beach%2?'cloth':'metal',1);log('밀물선과 표류물을 다시 살펴 필요한 재료를 챙겼다.');}
 }
 if(place==='forest'){
  state.knowledge.forest=true;
  if(!state.unlocked.stream){state.unlocked.stream=true;addItem('wood',1);addItem('vine',1);log('숲 안쪽에서 물소리를 따라 작은 계곡으로 가는 길을 찾았다.');}
  else if(!state.unlocked.cliff){state.unlocked.cliff=true;addItem('vine',2);log('계곡 너머 능선에서 바람 절벽으로 오르는 길을 찾았다. 경사가 가팔라 밧줄이 필요하다.');}
  else{addItem('wood',1);addItem('vine',1);log('숲의 익숙한 길을 돌아 마른 가지와 덩굴을 조금 더 확보했다.');}
 }
 if(place==='cliff'){
  if(!state.unlocked.lighthouse){state.unlocked.lighthouse=true;state.wreck=true;state.knowledge.signal=true;log('수평선을 살피다 낡은 등대와 반쯤 잠긴 어선의 위치를 발견했다.');}
  else{state.knowledge.weather=true;state.rescue=clamp(state.rescue+3,0,100);log('바람과 구름, 선박 통행 방향을 기록했다. 구조 신호 계획이 조금 선명해졌다.');}
 }
 advance(2,16);render();
}
function rest(){ensureRuntimeState();const gain=state.built.shelter>=2?42:state.built.shelter?34:24;state.fatigue=clamp(state.fatigue-gain,0,100);state.hp=clamp(state.hp+(state.built.fire?4:0),0,100);advance(1.5,0);log('야영지에서 쉬었다. 피로 -'+gain+(state.built.fire?' · 체력 +4':'')+'.');render()}
function drink(){if(state.water<.5)return toast('마실 물이 부족해요.');state.water=round1(state.water-.5);state.hp=clamp(state.hp+6,0,100);state.fatigue=clamp(state.fatigue-6,0,100);advance(.25,0);log('물을 조금 마시고 숨을 돌렸다.');render()}
function eat(){if(state.food<.5)return toast('먹을 것이 부족해요.');state.food=round1(state.food-.5);state.hp=clamp(state.hp+8,0,100);state.fatigue=clamp(state.fatigue-5,0,100);advance(.5,0);log('간단히 식사했다.');render()}
function collectWater(){ensureRuntimeState();state.knowledge.water=true;const cap=state.built.storage?8:6;const gain=Math.max(0,Math.min(2.5,cap-state.water));if(gain<=0)return toast('물 저장 공간이 가득 찼어요.');state.water=round1(state.water+gain);advance(1.25,8);log('계곡물을 끓이거나 정수해 식수로 보관했다. +물 '+gain.toFixed(1));render()}
function beachSearch(){ensureRuntimeState();const cycle=state.scouted.beach%3;const gain=cycle===0?{metal:1,wood:1}:cycle===1?{cloth:1,wood:1}:{stone:1,metal:1};Object.entries(gain).forEach(function(x){addItem(x[0],x[1])});state.scouted.beach++;advance(1.25,9);log('해변을 수색해 '+Object.keys(gain).map(function(k){return ITEM[k][1]}).join('·')+'을 찾았다.');render()}
function startGather(){
 ensureRuntimeState();
 openModal('채집 미니게임','FOREST CHOICE','<p>세 곳 중 <b>두 곳</b>만 살펴볼 수 있어요. 당장 필요한 자원과 숲의 상태를 함께 생각하세요.</p><div class="cards" id="gatherCards"><button class="choice-card" data-g="fallen"><div class="big">🪵</div><b>바닥의 마른 가지</b><small>나무 +2 · 생태 영향 거의 없음</small></button><button class="choice-card" data-g="vine"><div class="big">🪢</div><b>바위의 덩굴</b><small>덩굴 +2 · 밧줄 제작 가능</small></button><button class="choice-card" data-g="nest"><div class="big">🪺</div><b>새 둥지 주변</b><small>나무·씨앗을 얻지만 생태가 크게 나빠짐</small></button></div><div class="modal-actions"><button id="gatherDone" class="primary">선택 완료</button></div>');
 const picked=new Set();$$('#gatherCards button').forEach(function(b){b.addEventListener('click',function(){const v=b.dataset.g;if(picked.has(v)){picked.delete(v);b.classList.remove('selected')}else if(picked.size<2){picked.add(v);b.classList.add('selected')}})});
 $('#gatherDone').onclick=function(){if(picked.size!==2)return toast('두 곳을 선택하세요.');let eco=0;if(picked.has('fallen'))addItem('wood',2);if(picked.has('vine'))addItem('vine',2);if(picked.has('nest')){addItem('wood',1);addItem('seed',1);eco=-8}else eco=2;state.eco=clamp(state.eco+eco,0,100);state.skills.gather++;state.knowledge.forest=true;advance(1.75,12);log('숲에서 채집했다. 생태 지수 '+(eco>=0?'+':'')+eco+'.');closeModal();render()};
}
function startFishing(){
 ensureRuntimeState();if(!state.tools.rod)return toast('낚싯대가 필요해요.');
 openModal('낚시 미니게임','TIDE TIMING','<p>흰 표시가 <b>초록 구간</b>에 있을 때 줄을 당기세요. 바람이 센 날에는 좋은 구간이 더 짧아집니다.</p><div class="fish-track"><div id="fishMarker" class="fish-marker"></div></div><div class="modal-actions"><button id="reelBtn" class="primary">🎣 지금 당기기</button></div>');
 fishPos=5;fishDir=1;clearInterval(fishTimer);fishTimer=setInterval(function(){fishPos+=fishDir*3;if(fishPos>=97||fishPos<=3)fishDir*=-1;const m=$('#fishMarker');if(m)m.style.left=fishPos+'%'},45);
 $('#reelBtn').onclick=function(){clearInterval(fishTimer);const windy=weather().n==='강풍',good=fishPos>=(windy?43:38)&&fishPos<=(windy?57:62),okay=fishPos>=25&&fishPos<=75;let n=good?2:okay?1:0;if(n){addItem('fish',n);state.food=round1(state.food+n*(state.built.drying?0.9:0.6));state.skills.fish++;state.knowledge.fish=true;log('낚시에 성공했다. 생선 +'+n+(state.built.drying?' · 건조대로 식량 효율 상승':'')+'.');}else log('낚싯줄을 너무 급하게 당겨 물고기를 놓쳤다.');advance(1.75,15);closeModal();render();toast(n?'낚시 성공!':'물고기를 놓쳤어요.')};
}
function startRepair(kind){
 ensureRuntimeState();const labels={rod:'낚싯대',radio:'무전기',lighthouse:'등대 장치',boat:'낡은 어선'},costs={rod:{wood:1,vine:1,metal:1},radio:{metal:2,battery:1},lighthouse:{metal:3,wood:2},boat:{metal:4,wood:4,cloth:1}};
 if(state.tools[kind])return toast(labels[kind]+' 수리는 이미 끝났어요.');
 if(!has(costs[kind]))return toast('재료가 부족해요. '+costText(costs[kind]));
 const order=kind==='rod'?[2,3,0,1]:kind==='boat'?[2,0,3,1]:[0,3,2,1];let step=0;
 openModal(labels[kind]+' 수리','REPAIR SEQUENCE','<p><b>도구 → 연결 → 전원 → 작동</b> 흐름을 생각하며 순서를 맞추세요. 틀리면 처음부터 다시 연결합니다.</p><div class="repair-grid">'+['🔋','⚡','🔧','🔌'].map(function(x,i){return '<button class="wire" data-wire="'+i+'">'+x+'</button>'}).join('')+'</div><p id="repairHint" class="muted">장치를 살펴보고 첫 부품을 선택하세요.</p>');
 $$('.wire').forEach(function(b){b.addEventListener('click',function(){const n=Number(b.dataset.wire);if(n===order[step]){b.classList.add('on');step++;$('#repairHint').textContent=step+'/4 연결';if(step===4)setTimeout(function(){completeRepair(kind)},220)}else{step=0;$$('.wire').forEach(function(x){x.classList.remove('on')});$('#repairHint').textContent='연결이 끊겼어요. 순서를 다시 생각해 보세요.'}})});
}
function completeRepair(kind){
 const costs={rod:{wood:1,vine:1,metal:1},radio:{metal:2,battery:1},lighthouse:{metal:3,wood:2},boat:{metal:4,wood:4,cloth:1}},labels={rod:'낚싯대',radio:'무전기',lighthouse:'등대 장치',boat:'낡은 어선'};
 if(!has(costs[kind])){closeModal();toast('필요한 재료가 부족해요.');return}
 pay(costs[kind]);state.tools[kind]=true;state.skills.repair++;state.knowledge.circuit=true;advance(kind==='rod'?1.5:3,kind==='rod'?10:20);log(labels[kind]+' 수리를 마쳤다.');closeModal();render();
 if(kind==='radio'){state.rescue=100;finish('radio')}else if(kind==='lighthouse'){state.rescue=Math.max(state.rescue,70);toast('등대가 켜졌어요. 이제 반복해서 신호를 보내세요.')}
}
function startFarm(){
 ensureRuntimeState();if(!state.built.field)return toast('먼저 작은 밭을 만들어야 해요.');if((state.inv.seed||0)<1)return toast('심을 씨앗이 없어요.');
 const plots=[['☀️','햇빛 좋음 · 배수 좋음',1],['🌫️','그늘 · 습함',0],['🌤️','햇빛 좋음 · 배수 좋음',1],['💦','물이 고임',0],['🌱','부드러운 흙 · 햇빛 좋음',1],['🪨','돌이 많고 메마름',0]];
 openModal('밭 돌보기','FARM MINI GAME','<p>씨앗을 심을 <b>두 칸</b>을 고르세요. 햇빛과 배수가 모두 좋은 곳일수록 잘 자랍니다.</p><div class="farm-grid" id="farmGrid">'+plots.map(function(p,i){return '<button class="plot" data-plot="'+i+'"><b>'+p[0]+'</b><small>'+p[1]+'</small></button>'}).join('')+'</div><div class="modal-actions"><button id="farmDone" class="primary">🌱 심기</button></div>');
 const picked=new Set();$$('#farmGrid .plot').forEach(function(b){b.onclick=function(){const i=Number(b.dataset.plot);if(picked.has(i)){picked.delete(i);b.classList.remove('good')}else if(picked.size<2){picked.add(i);b.classList.add('good')}}});
 $('#farmDone').onclick=function(){if(picked.size!==2)return toast('두 칸을 골라 주세요.');state.inv.seed--;let good=0;picked.forEach(function(i){good+=plots[i][2]});state.skills.farm++;state.knowledge.farm=true;state.farmCare=Math.max(state.farmCare,good===2?3:good===1?2:1);if(good===2){state.eco=clamp(state.eco+2,0,100);log('햇빛과 배수가 좋은 곳에 씨앗을 심었다. 수확 가능성이 높다.')}else if(good===1)log('한 곳은 괜찮지만 다른 곳의 조건이 아쉽다. 그래도 작물은 자랄 수 있다.');else log('물이 고이거나 메마른 곳을 골랐다. 이번 작물은 성장이 더디겠다.');advance(1.5,9);closeModal();render()};
}
function costText(cost){return Object.entries(cost||{}).map(function(x){return (ITEM[x[0]]?ITEM[x[0]][1]:x[0])+' '+x[1]}).join(' · ')}
function build(kind){
 ensureRuntimeState();const labels={shelter:'거처',rain:'빗물 저장통',fire:'안전한 화덕',field:'작은 밭',drying:'건조대',storage:'저장 선반',sos:'대형 SOS 표식'};
 let cost;if(kind==='shelter')cost=state.built.shelter?{wood:3,stone:2,cloth:1}:{wood:3,vine:1};else cost={rain:{wood:2,cloth:1},fire:{wood:2,stone:2},field:{wood:2,stone:2},drying:{wood:3,vine:2},storage:{wood:2,cloth:1},sos:{wood:3,stone:3}}[kind];
 if(!cost)return;if(!has(cost))return toast('재료가 부족해요. '+costText(cost));pay(cost);
 if(kind==='shelter')state.built.shelter=Math.min(2,(state.built.shelter||0)+1);else state.built[kind]=true;
 if(kind==='sos'){state.rescue=clamp(state.rescue+15,0,100);state.knowledge.signal=true}
 advance(kind==='shelter'?2:1.5,kind==='shelter'?12:9);log(labels[kind]+'을(를) 마련했다.');render();toast(labels[kind]+' 완성!')
}
function craftItem(kind){
 ensureRuntimeState();const defs={rope:{cost:{vine:3},label:'밧줄'},mirror:{cost:{metal:1},label:'반사 신호판'},storage:{cost:{wood:2,cloth:1},label:'저장 선반'}};const d=defs[kind];if(!d)return;
 if(kind==='rope'&&state.inv.rope>0)return toast('이미 쓸 수 있는 밧줄이 있어요.');if(kind==='mirror'&&state.tools.mirror)return toast('이미 반사 신호판이 있어요.');if(kind==='storage'&&state.built.storage)return toast('이미 저장 선반이 있어요.');if(!has(d.cost))return toast('재료가 부족해요. '+costText(d.cost));pay(d.cost);
 if(kind==='rope')addItem('rope',1);if(kind==='mirror')state.tools.mirror=true;if(kind==='storage')state.built.storage=true;advance(1,6);log(d.label+'을(를) 만들었다.');closeModal();render();toast(d.label+' 제작 완료!')
}
function openCraft(){
 ensureRuntimeState();const rows=[['🧵','튼튼한 밧줄','덩굴 3','rope',state.inv.rope>0],['🎣','낚싯대 수리','나무1 · 덩굴1 · 금속1','rod',state.tools.rod],['✨','반사 신호판','금속 1','mirror',state.tools.mirror],['📦','저장 선반','나무2 · 천1','storage',state.built.storage]];
 openModal('제작대','RESOURCE CHAIN','<p>지금 가진 자원을 <b>다음 지역과 다음 행동</b>을 여는 도구로 바꾸세요.</p><div class="craft-list">'+rows.map(function(r){return '<div class="craft-row"><span style="font-size:1.7rem">'+r[0]+'</span><div><b>'+r[1]+'</b><small>'+r[2]+'</small></div><button class="secondary" data-craft="'+r[3]+'" '+(r[4]?'disabled':'')+'>'+(r[4]?'완료':'만들기')+'</button></div>'}).join('')+'</div>');
 $$('[data-craft]').forEach(function(b){b.onclick=function(){const k=b.dataset.craft;if(k==='rod'){closeModal();startRepair('rod')}else craftItem(k)}});
}
function signal(){
 ensureRuntimeState();let gain=5,parts=[];if(state.built.sos){gain+=6;parts.push('SOS')}if(state.tools.lighthouse){gain+=12;parts.push('등대')}if(state.tools.mirror){gain+=4;parts.push('반사판')}if(['맑음','구름'].includes(weather().n)){gain+=3;parts.push('좋은 시야')}if(state.day===7){gain+=10;parts.push('선박 통행 기회')}
 state.rescue=clamp(state.rescue+gain,0,100);state.knowledge.signal=true;advance(1,7);log((parts.length?parts.join('·'):'연기와 몸짓')+'으로 구조 신호를 보냈다. 구조도 +'+gain+'%.');render();if(state.rescue>=100&&state.tools.lighthouse)finish('lighthouse')
}
function selfSufficiency(){
 ensureRuntimeState();let score=0;score+=Math.min(16,(state.built.shelter||0)*8);if(state.built.rain)score+=14;if(state.built.fire)score+=8;if(state.built.field)score+=16;if(state.built.drying)score+=12;if(state.built.storage)score+=7;if(state.water>=2)score+=8;if(state.food>=2)score+=8;if(state.eco>=75)score+=6;score+=Math.min(5,state.skills.farm)+Math.min(5,state.skills.fish)+Math.min(5,state.skills.gather);return clamp(score,0,100)
}
function settlementCheck(id){
 ensureRuntimeState();const known=Object.values(state.knowledge).filter(Boolean).length;const checks={farmer:[state.built.field&&state.skills.farm>=2,'밭과 농사 경험 2가 필요해요.'],fisher:[state.tools.rod&&state.skills.fish>=3,'낚싯대와 낚시 성공 3회가 필요해요.'],gatherer:[state.skills.gather>=3&&state.eco>=80,'채집 3회와 생태 80 이상이 필요해요.'],keeper:[state.tools.lighthouse&&state.built.rain&&state.built.field,'등대·빗물 저장통·밭이 필요해요.'],village:[selfSufficiency()>=70&&state.built.shelter>=2,'자급도 70과 2단계 거처가 필요해요.'],researcher:[known>=6,'섬에 대한 지식 6가지를 발견해야 해요.']};return checks[id]||[false,'아직 조건을 알 수 없어요.']
}
function settle(){
 ensureRuntimeState();if(state.day<8)return toast('정착을 결정하기엔 아직 이릅니다. 8일 이후 다시 생각해 보세요.');const score=selfSufficiency(),known=Object.values(state.knowledge).filter(Boolean).length;
 const opts=[['farmer','🌱','농부','밭을 중심으로 먹거리를 순환시킨다.'],['fisher','🎣','어부','물때와 바람을 읽으며 바다에서 살아간다.'],['gatherer','🌿','숲의 지혜','생태를 지키며 필요한 만큼만 얻는다.'],['keeper','🏮','등대지기','등대와 생활 기반을 함께 지킨다.'],['village','🏡','작은 마을','여러 시설을 연결해 자급 생활을 만든다.'],['researcher','🔬','생태 연구소','섬의 날씨와 생물을 계속 기록한다.']];
 openModal('섬에 정착하기','DAY '+state.day+' · 자급도 '+score+' · 지식 '+known+'/8','<p>구조를 기다리는 대신 지금까지 만든 생활 방식을 하나의 <b>정착 엔딩</b>으로 완성할 수 있어요.</p><div class="ending-grid">'+opts.map(function(o){const c=settlementCheck(o[0]);return '<button class="ending-card" data-settle="'+o[0]+'" '+(c[0]?'':'disabled')+'><div style="font-size:1.8rem">'+o[1]+'</div><h3>'+o[2]+'</h3><p>'+(c[0]?o[3]:c[1])+'</p></button>'}).join('')+'</div>');
 $$('[data-settle]').forEach(function(b){b.onclick=function(){chooseSettlement(b.dataset.settle)}})
}
function chooseSettlement(id){const c=settlementCheck(id);if(!c[0]){toast(c[1]);return null}finish(id);return id}
function finish(id){
 if(!state||state.ended)return;const e=ENDINGS[id];if(!e)return;state.ended=true;saveEnding(id);try{localStorage.removeItem(SAVE)}catch(_){};
 openModal(e[1],'ENDING · '+endingList().length+' / 10','<div class="ending-reveal"><div class="icon">'+e[0]+'</div><h2>'+e[1]+'</h2><p>'+e[2]+'</p><div class="ending-quote">'+e[3]+'</div><p class="muted">생존 '+state.day+'일 · 자급도 '+selfSufficiency()+' · 구조도 '+Math.round(state.rescue)+'% · 생태 '+Math.round(state.eco)+'</p><div class="modal-actions"><button id="endingHome" class="secondary">처음 화면</button><button id="endingAgain" class="primary">다시 표류하기</button></div></div>');
 $('#endingHome').onclick=showStart;$('#endingAgain').onclick=function(){start(selectedDiff)};try{parent.postMessage({type:'kidscade:game-result',gameId:'trivia_drift_survival',ending:id,day:state.day,cleared:true},'*')}catch(_){}
}
function gameOver(){
 if(!state||state.ended)return;state.ended=true;try{localStorage.removeItem(SAVE)}catch(_){};openModal('생존 실패','TRY AGAIN','<div class="ending-reveal"><div class="icon">🌧️</div><h2>이번 표류는 여기까지</h2><p>물·식량·피로 중 하나가 무너지면 다른 자원도 빠르게 흔들립니다. 다음에는 하루 뒤의 소비량까지 남겨 두세요.</p><p class="muted">버틴 날 '+state.day+'일 · 생태 '+Math.round(state.eco)+'</p><div class="modal-actions"><button id="failHome" class="secondary">처음 화면</button><button id="failAgain" class="primary">같은 난이도로 재도전</button></div></div>');$('#failHome').onclick=showStart;$('#failAgain').onclick=function(){start(selectedDiff)}
}
