(() => {
'use strict';

const $ = id => document.getElementById(id);
const SCREENS = ['setupScreen','writeScreen','reviewScreen','resultScreen'];
const STORAGE_KEY = 'kidscade_story_builder_v1';
const LEVELS = {
  easy:{cards:2,minSentences:2,minChars:25,challenges:0,label:'가볍게'},
  normal:{cards:3,minSentences:3,minChars:45,challenges:1,label:'이야기'},
  hard:{cards:4,minSentences:4,minChars:70,challenges:2,label:'도전'}
};
const ASSET = p => '../../' + p;
const CARD_POOL = [
  {id:'dog',label:'강아지',emoji:'🐶',image:ASSET('assets/game/2d/animals/round/dog.png'),aliases:['강아지','개','반려견']},
  {id:'rabbit',label:'토끼',emoji:'🐰',image:ASSET('assets/game/2d/animals/round/rabbit.png'),aliases:['토끼']},
  {id:'panda',label:'판다',emoji:'🐼',image:ASSET('assets/game/2d/animals/round/panda.png'),aliases:['판다','팬더']},
  {id:'owl',label:'부엉이',emoji:'🦉',image:ASSET('assets/game/2d/animals/round/owl.png'),aliases:['부엉이','올빼미']},
  {id:'frog',label:'개구리',emoji:'🐸',image:ASSET('assets/game/2d/animals/round/frog.png'),aliases:['개구리']},
  {id:'bear',label:'곰',emoji:'🐻',image:ASSET('assets/game/2d/animals/round/bear.png'),aliases:['곰']},
  {id:'elephant',label:'코끼리',emoji:'🐘',image:ASSET('assets/game/2d/animals/round/elephant.png'),aliases:['코끼리']},
  {id:'penguin',label:'펭귄',emoji:'🐧',image:ASSET('assets/game/2d/animals/round/penguin.png'),aliases:['펭귄']},
  {id:'umbrella',label:'우산',emoji:'☂️',aliases:['우산']},
  {id:'cake',label:'케이크',emoji:'🎂',aliases:['케이크','케익','생일케이크','생일 케이크']},
  {id:'key',label:'열쇠',emoji:'🔑',aliases:['열쇠','키']},
  {id:'gift',label:'선물',emoji:'🎁',aliases:['선물']},
  {id:'bicycle',label:'자전거',emoji:'🚲',aliases:['자전거','자전거를','자전거가']},
  {id:'book',label:'책',emoji:'📕',aliases:['책','도서','동화책']},
  {id:'robot',label:'로봇',emoji:'🤖',aliases:['로봇','로보트']},
  {id:'balloon',label:'풍선',emoji:'🎈',aliases:['풍선']},
  {id:'school',label:'학교',emoji:'🏫',aliases:['학교','교실','운동장']},
  {id:'forest',label:'숲',emoji:'🌲',aliases:['숲','산속','나무']},
  {id:'moon',label:'달',emoji:'🌙',aliases:['달','달빛','보름달']},
  {id:'rain',label:'비',emoji:'🌧️',aliases:['비','빗속','빗물','장대비']},
  {id:'volcano',label:'화산',emoji:'🌋',aliases:['화산','용암']},
  {id:'ocean',label:'바다',emoji:'🌊',aliases:['바다','바닷가','해변','파도']},
  {id:'space',label:'우주',emoji:'🚀',aliases:['우주','우주선','로켓','행성']},
  {id:'castle',label:'성',emoji:'🏰',aliases:['성','성문','왕궁','궁전']},
  {id:'pizza',label:'피자',emoji:'🍕',aliases:['피자']},
  {id:'icecream',label:'아이스크림',emoji:'🍦',aliases:['아이스크림']},
  {id:'clock',label:'시계',emoji:'⏰',aliases:['시계','알람']},
  {id:'ghost',label:'유령',emoji:'👻',aliases:['유령','귀신']},
  {id:'crown',label:'왕관',emoji:'👑',aliases:['왕관','임금','왕','여왕']},
  {id:'map',label:'지도',emoji:'🗺️',aliases:['지도','보물지도','보물 지도']}
];
const CHALLENGES = [
  {id:'dialogue',label:'💬 누군가 말하는 문장을 한 번 넣기',test:t=>/[“”"'「」]/.test(t)||/(말했|물었|대답했|외쳤)/.test(t)},
  {id:'emotion',label:'😊 등장인물의 기분을 한 번 표현하기',test:t=>/(기쁘|즐겁|신나|슬프|무섭|두렵|화가|속상|걱정|놀라|설레|행복|긴장)/.test(t)},
  {id:'reason',label:'🧠 왜 그런 일이 생겼는지 이유를 쓰기',test:t=>/(왜냐하면|때문|그래서|그러므로|바람에|덕분에)/.test(t)},
  {id:'twist',label:'⚡ 그런데·하지만·갑자기 중 하나로 사건 바꾸기',test:t=>/(그런데|하지만|갑자기|뜻밖|놀랍게)/.test(t)},
  {id:'question',label:'❓ 물음표가 들어가는 문장 하나 넣기',test:t=>/\?/.test(t)}
];
const MANUAL_RULES = [
 ['몇일','며칠','날짜를 셀 때는 ‘며칠’이라고 써요.'],
 ['금새','금세','‘지금 바로’라는 뜻은 ‘금세’예요.'],
 ['왠만','웬만','‘왠지’를 제외하면 대부분 ‘웬’을 써요.'],
 ['왠일','웬일','뜻밖의 일을 말할 때는 ‘웬일’이에요.'],
 ['웬지','왠지','이유를 정확히 모를 때는 ‘왠지’예요.'],
 ['어의없','어이없','‘어이없다’가 바른 표현이에요.'],
 ['할께','할게','약속이나 의지를 나타낼 때는 ‘-ㄹ게’를 써요.'],
 ['갈께','갈게','약속이나 의지를 나타낼 때는 ‘-ㄹ게’를 써요.'],
 ['올께','올게','약속이나 의지를 나타낼 때는 ‘-ㄹ게’를 써요.'],
 ['될께','될게','약속이나 의지를 나타낼 때는 ‘-ㄹ게’를 써요.'],
 ['되요','돼요','‘되어요’가 줄어 ‘돼요’가 돼요.'],
 ['됬','됐','‘되었다’가 줄어 ‘됐다/됐어요’가 돼요.'],
 ['안되','안 되','‘안 되다’는 보통 띄어 써요.'],
 ['않되','안 되','‘않다’가 아니라 ‘안 되다’를 써요.'],
 ['않가','안 가','‘가지 않다’는 ‘안 가다’처럼 쓸 수 있어요.'],
 ['않해','안 해','‘하지 않다’는 ‘안 하다/안 해’로 쓸 수 있어요.'],
 ['어떻해','어떡해','‘어떻게 해’가 줄어든 말은 ‘어떡해’예요.'],
 ['오랫만','오랜만','‘오래간만’이 줄어 ‘오랜만’이 돼요.'],
 ['역활','역할','‘역할’이 바른 표기예요.'],
 ['설겆','설거지','‘설거지’가 바른 표기예요.'],
 ['일일히','일일이','‘일일이’가 바른 표기예요.'],
 ['곰곰히','곰곰이','‘곰곰이’가 바른 표기예요.'],
 ['틈틈히','틈틈이','‘틈틈이’가 바른 표기예요.'],
 ['몇 번','몇 번',''],
 ['첫번째','첫 번째','‘번째’는 앞말과 띄어 써요.'],
 ['이번주','이번 주','‘이번 주’는 띄어 써요.'],
 ['다음주','다음 주','‘다음 주’는 띄어 써요.'],
 ['이틀동안','이틀 동안','‘동안’은 앞말과 띄어 써요.'],
 ['할수','할 수','‘수’는 의존 명사라 앞말과 띄어 써요.'],
 ['갈수','갈 수','‘수’는 의존 명사라 앞말과 띄어 써요.'],
 ['될수','될 수','‘수’는 의존 명사라 앞말과 띄어 써요.'],
 ['먹을수','먹을 수','‘수’는 의존 명사라 앞말과 띄어 써요.'],
 ['것같','것 같','‘것’과 ‘같다’는 띄어 쓰는 경우가 많아요.'],
 ['뵈요','봬요','‘뵈어요’가 줄면 ‘봬요’예요.'],
 ['학교에요','학교예요','받침 없는 말 뒤에는 ‘예요’를 써요.'],
 ['거에요','거예요','‘것이에요’가 줄면 ‘거예요’예요.'],
 ['아니예요','아니에요','‘아니다’의 활용은 ‘아니에요’예요.'],
 ['낳았어요','나았어요','병이나 상처가 좋아진 것은 ‘나았어요’예요.'],
 ['맞췄어요','맞혔어요','문제의 답을 알아낸 것은 ‘맞혔어요’예요.'],
 ['바래요','바라요','원하거나 기대한다는 뜻은 ‘바라요’예요.']
];

let level='easy';
let mission=null;
let initialAccuracy=null;
let spellRules=[];
let draftTimer=null;

function loadState(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch(_){return {}}
}
function saveState(patch){
  const prev=loadState();
  localStorage.setItem(STORAGE_KEY,JSON.stringify({...prev,...patch}));
}
function hydrateMission(raw){
  if(!raw)return null;
  const cards=(raw.cards||[]).map(c=>CARD_POOL.find(x=>x.id===c.id)).filter(Boolean);
  const challenges=(raw.challenges||[]).map(c=>CHALLENGES.find(x=>x.id===c.id)).filter(Boolean);
  if(!cards.length)return null;
  return {...raw,cards,challenges};
}
function books(){return Array.isArray(loadState().books)?loadState().books:[]}
function updateBookCount(){$('bookCount').textContent=books().length}
function showScreen(id){
  SCREENS.forEach(s=>$(s).classList.toggle('active',s===id));
  scrollTo({top:0,behavior:'smooth'});
}
function toast(msg){
  const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),1800);
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sample(arr,n){
  const pool=[...arr],out=[];
  while(pool.length&&out.length<n){out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0])}
  return out;
}
function sentenceCount(t){
  const trimmed=t.trim();if(!trimmed)return 0;
  const parts=trimmed.split(/[.!?。！？\n]+/).map(x=>x.trim()).filter(Boolean);
  return Math.max(1,parts.length);
}
function containsAlias(text,card){return card.aliases.some(a=>text.includes(a))}
function countWords(t){return (t.match(/[가-힣A-Za-z0-9]+/g)||[]).length}
function countOccur(text,needle){
  if(!needle)return 0;let n=0,p=0;while((p=text.indexOf(needle,p))!==-1){n++;p+=needle.length}return n;
}
function cleanToken(s){return String(s||'').replace(/^[^가-힣A-Za-z0-9]+|[^가-힣A-Za-z0-9]+$/g,'')}

function buildSpellRules(){
  const map=new Map();
  const add=(bad,good,explain)=>{
    bad=cleanToken(bad);good=cleanToken(good);
    if(!bad||!good||bad===good||bad.length<2||bad.length>18||good.length>22)return;
    if(!/[가-힣]/.test(bad)||!/[가-힣]/.test(good))return;
    if(!map.has(bad))map.set(bad,{bad,good,explain:explain||'표기를 한 번 살펴보세요.'});
  };
  MANUAL_RULES.forEach(([b,g,e])=>{if(b!==g)add(b,g,e)});
  (window.KIDSCADE_SPELLING_EXTRA||[]).forEach(q=>{
    const cq=String(q.c||'').match(/‘([^’]+)’/);
    const wq=String(q.w||'').match(/‘([^’]+)’/);
    if(cq&&wq&&cq[1]!==wq[1]) add(wq[1],cq[1],q.explain);
    const cTokens=String(q.c||'').split(/\s+/);
    const wTokens=String(q.w||'').split(/\s+/);
    if(cTokens.length===wTokens.length){
      for(let i=0;i<cTokens.length;i++){
        const c=cleanToken(cTokens[i]),w=cleanToken(wTokens[i]);
        if(c&&w&&c!==w) add(w,c,q.explain);
      }
    }
  });
  spellRules=[...map.values()].sort((a,b)=>b.bad.length-a.bad.length);
}
function inspectSpelling(text){
  const found=[];
  for(const rule of spellRules){
    const n=countOccur(text,rule.bad);
    if(n>0) found.push({...rule,count:n});
  }
  return found.filter((r,i,arr)=>!arr.some((x,j)=>j<i&&x.bad.includes(r.bad)&&x.good.includes(r.good)));
}
function accuracyFor(text,issues){
  const words=Math.max(1,countWords(text));
  const errors=issues.reduce((n,x)=>n+x.count,0);
  return Math.max(0,Math.min(100,Math.round((1-errors/words)*100)));
}

function startMission(){
  const cfg=LEVELS[level];
  mission={level,cards:sample(CARD_POOL,cfg.cards),challenges:sample(CHALLENGES,cfg.challenges),startedAt:Date.now()};
  $('titleInput').value='';$('storyInput').value='';
  renderMission();updateWriteStatus();showScreen('writeScreen');
  try{window.KidscadeGame?.start?.()}catch(_){}
}
function renderCard(card,used){
  return `<div class="story-card ${used?'used':''}" data-card="${card.id}">
    ${card.image?`<img src="${card.image}" alt="">`:`<div class="emoji">${card.emoji}</div>`}
    <b>${card.label}</b>
  </div>`;
}
function renderMission(){
  if(!mission)return;
  $('cardList').innerHTML=mission.cards.map(c=>renderCard(c,false)).join('');
  $('challengeBox').innerHTML=mission.challenges.length
    ? '<div class="challenge-title">추가 미션</div>'+mission.challenges.map(c=>`<div class="challenge" data-challenge="${c.id}">${c.label}</div>`).join('')
    : '<div class="challenge-title">가볍게 모드</div><div class="muted">그림 카드만 모두 넣으면 돼요.</div>';
}
function updateWriteStatus(){
  if(!mission)return;
  const t=$('storyInput').value,cfg=LEVELS[mission.level],sent=sentenceCount(t),chars=t.replace(/\s/g,'').length;
  $('sentenceStat').textContent=sent+'문장';$('charStat').textContent=chars+'자';
  mission.cards.forEach(c=>{
    const el=document.querySelector(`[data-card="${c.id}"]`);
    el?.classList.toggle('used',containsAlias(t,c));
  });
  mission.challenges.forEach(c=>document.querySelector(`[data-challenge="${c.id}"]`)?.classList.toggle('done',c.test(t)));
  const used=mission.cards.filter(c=>containsAlias(t,c)).length;
  const chall=mission.challenges.filter(c=>c.test(t)).length;
  const chips=[
    `<span class="status-chip ${used===mission.cards.length?'ok':'warn'}">🧩 카드 ${used}/${mission.cards.length}</span>`,
    `<span class="status-chip ${sent>=cfg.minSentences?'ok':'warn'}">📝 문장 ${sent}/${cfg.minSentences}</span>`,
    `<span class="status-chip ${chars>=cfg.minChars?'ok':''}">✍️ ${chars}자 · 권장 ${cfg.minChars}자+</span>`
  ];
  if(mission.challenges.length)chips.push(`<span class="status-chip ${chall===mission.challenges.length?'ok':'warn'}">⭐ 추가 미션 ${chall}/${mission.challenges.length}</span>`);
  $('missionStatus').innerHTML=chips.join('');
  clearTimeout(draftTimer);draftTimer=setTimeout(()=>saveState({draft:{mission,title:$('titleInput').value,text:t}}),350);
}
function validateStory(){
  const t=$('storyInput').value.trim(),cfg=LEVELS[mission.level];
  const missing=mission.cards.filter(c=>!containsAlias(t,c));
  const sent=sentenceCount(t);
  const undone=mission.challenges.filter(c=>!c.test(t));
  if(!t){toast('먼저 이야기를 써 주세요.');$('storyInput').focus();return false}
  if(missing.length){toast('아직 '+missing.map(x=>x.label).join(', ')+' 카드가 이야기 속에 없어요.');return false}
  if(sent<cfg.minSentences){toast('문장이 '+(cfg.minSentences-sent)+'개 더 필요해요.');return false}
  if(undone.length){toast('추가 미션을 확인해 주세요.');return false}
  return true;
}
function enterReview(){
  if(!validateStory())return;
  const text=$('storyInput').value.trim();
  $('reviewInput').value=text;
  const issues=inspectSpelling(text);initialAccuracy=accuracyFor(text,issues);
  renderIssues();
  showScreen('reviewScreen');
}
function renderIssues(){
  const text=$('reviewInput').value;
  const issues=inspectSpelling(text),accuracy=accuracyFor(text,issues);
  $('accuracyBadge').textContent='맞춤법 정확도 '+accuracy+'%';
  const total=issues.reduce((n,x)=>n+x.count,0);
  $('issueSummary').innerHTML=total
    ? `<b>${total}곳</b>을 살펴보면 더 좋아질 수 있어요.<br>정답을 바로 바꾸지 않고, 먼저 직접 고쳐 보세요.`
    : '<b>지금 찾을 수 있는 오류가 없어요.</b><br>이 검사는 모든 한국어 오류를 찾는 완전한 검사기는 아니에요.';
  $('issuesList').innerHTML=issues.length?issues.map((x,i)=>`
    <div class="issue-card answer-hidden" data-issue="${i}">
      <div class="issue-top"><span class="wrong">${escapeHtml(x.bad)}</span><span class="arrow">→</span><span class="right">${escapeHtml(x.good)}</span>${x.count>1?`<small>×${x.count}</small>`:''}</div>
      <p>${escapeHtml(x.explain)}</p>
      <button class="reveal-btn" type="button">힌트 보기</button>
    </div>`).join(''):'<div class="no-issue">✨ 좋아요!<br>발견된 곳을 모두 다듬었어요.</div>';
  document.querySelectorAll('.reveal-btn').forEach(btn=>btn.onclick=()=>{btn.parentElement.classList.remove('answer-hidden');btn.remove()});
  return {issues,accuracy};
}
function finishStory(){
  const text=$('reviewInput').value.trim();if(!text){toast('이야기가 비어 있어요.');return}
  const final=renderIssues();
  const title=$('titleInput').value.trim()||makeTitle();
  const record={id:Date.now(),title,text,cards:mission.cards.map(c=>c.id),level:mission.level,accuracy:final.accuracy,createdAt:new Date().toISOString()};
  const list=[record,...books()].slice(0,20);saveState({books:list,draft:null});
  $('resultTitle').textContent=title;$('resultStory').textContent=text;
  $('bookVisuals').innerHTML=mission.cards.map(c=>`<div class="book-visual">${c.image?`<img src="${c.image}" alt="${c.label}">`:c.emoji}</div>`).join('');
  $('resultCards').textContent=mission.cards.length+'개 카드 모두 사용';
  $('resultSentences').textContent=sentenceCount(text)+'문장 · '+text.replace(/\s/g,'').length+'자';
  $('resultAccuracy').textContent='맞춤법 정확도 '+final.accuracy+'%';
  $('growthNote').textContent=initialAccuracy!=null&&final.accuracy>initialAccuracy
    ? `초고 ${initialAccuracy}% → 지금 ${final.accuracy}% · 직접 고치며 더 정확해졌어요.`
    : final.accuracy===100?'현재 검사 기준으로 살펴볼 표현을 모두 정리했어요.':'고치지 않은 곳이 있어도 이야기는 완성할 수 있어요.';
  updateBookCount();showScreen('resultScreen');
}
function makeTitle(){
  if(!mission?.cards?.length)return '나의 이야기';
  return mission.cards.slice(0,2).map(x=>x.label).join('와 ')+' 이야기';
}
function shuffleMission(){
  if($('storyInput').value.trim()&&!confirm('지금 쓴 글을 지우고 새 카드를 뽑을까요?'))return;
  startMission();
}
function openModal(html){$('modalContent').innerHTML=html;$('modal').classList.remove('hidden')}
function closeModal(){$('modal').classList.add('hidden')}
function showHelp(){
  openModal(`<h2>🧩 이야기 조립소는 이렇게 해요</h2>
  <div class="help-steps">
    <div class="help-step"><span>1</span><div><b>그림 카드를 확인해요.</b><br><small>카드의 낱말이 모두 나오도록 이야기를 생각해요.</small></div></div>
    <div class="help-step"><span>2</span><div><b>일단 자유롭게 써요.</b><br><small>쓰는 동안에는 맞춤법 점수를 보여 주지 않아요.</small></div></div>
    <div class="help-step"><span>3</span><div><b>마지막에 맞춤법을 다듬어요.</b><br><small>검사기가 고쳐 주는 대신 힌트를 보고 직접 수정해요.</small></div></div>
    <div class="help-step"><span>4</span><div><b>완성하면 한 페이지의 책이 돼요.</b><br><small>완성한 글은 이 기기의 내 이야기책에만 저장돼요.</small></div></div>
  </div>`);
}
function showBooks(){
  const list=books();
  openModal(`<h2>📚 내 이야기책</h2><p class="muted">이 기기에 최근 20편까지 저장돼요.</p><div class="book-list">${list.length?list.map(b=>`
    <div class="saved-book"><div><h4>${escapeHtml(b.title)}</h4><p>${escapeHtml(b.text)}</p></div><button type="button" data-open-book="${b.id}">읽기</button></div>`).join(''):'<div class="no-issue">아직 완성한 이야기가 없어요.</div>'}</div>`);
  document.querySelectorAll('[data-open-book]').forEach(btn=>btn.onclick=()=>openSavedBook(Number(btn.dataset.openBook)));
}
function openSavedBook(id){
  const b=books().find(x=>x.id===id);if(!b)return;
  openModal(`<div class="book-label">내 이야기책</div><h2>${escapeHtml(b.title)}</h2><div class="result-story">${escapeHtml(b.text)}</div><div class="growth-note">맞춤법 정확도 ${b.accuracy}%</div>`);
}

document.querySelectorAll('.difficulty').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.difficulty').forEach(x=>x.classList.toggle('selected',x===btn));level=btn.dataset.level;
});
$('startBtn').onclick=startMission;
$('shuffleBtn').onclick=shuffleMission;
$('storyInput').addEventListener('input',updateWriteStatus);
$('titleInput').addEventListener('input',updateWriteStatus);
$('inspectBtn').onclick=enterReview;
$('recheckBtn').onclick=()=>{renderIssues();toast('다시 살펴봤어요.')};
$('reviewInput').addEventListener('input',()=>{clearTimeout($('reviewInput')._t);$('reviewInput')._t=setTimeout(renderIssues,450)});
$('finishBtn').onclick=finishStory;
$('newStoryBtn').onclick=()=>showScreen('setupScreen');
$('bookshelfBtn').onclick=showBooks;$('openBooksBtn').onclick=showBooks;$('helpBtn').onclick=showHelp;
$('modalClose').onclick=closeModal;$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});

buildSpellRules();updateBookCount();
const saved=loadState().draft;
if(saved?.mission&&saved?.text){
  mission=hydrateMission(saved.mission);level=mission?.level||'easy';
  document.querySelectorAll('.difficulty').forEach(x=>x.classList.toggle('selected',x.dataset.level===level));
  $('titleInput').value=saved.title||'';$('storyInput').value=saved.text||'';
}
})();