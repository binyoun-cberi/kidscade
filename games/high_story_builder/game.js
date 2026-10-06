(() => {
'use strict';

const $ = id => document.getElementById(id);
const SCREENS = ['setupScreen','writeScreen','reviewScreen','resultScreen'];
const STORAGE_KEY = 'kidscade_story_builder_v1';
const LEVELS = {
  easy:{cards:3,minSentences:3,minChars:30,minSectionChars:5,challenges:0,label:'차근차근'},
  normal:{cards:4,minSentences:4,minChars:55,minSectionChars:7,challenges:1,label:'이야기'},
  hard:{cards:5,minSentences:5,minChars:90,minSectionChars:9,challenges:2,label:'작가 도전'}
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
const CHARACTER_IDS=['dog','rabbit','panda','owl','frog','bear','elephant','penguin','robot','ghost'];
const PLACE_IDS=['school','forest','ocean','space','castle','moon'];
const OBJECT_IDS=['umbrella','cake','key','gift','bicycle','book','balloon','pizza','icecream','clock','crown','map'];
const EVENT_POOL=[
  {id:'event_lost',label:'길을 잃음',emoji:'🧭',aliases:['길을 잃','길을 헤매','길을 못 찾'],role:'event'},
  {id:'event_storm',label:'갑작스러운 폭풍',emoji:'⛈️',aliases:['폭풍','거센 비','천둥','번개'],role:'event'},
  {id:'event_missing',label:'친구가 사라짐',emoji:'🔎',aliases:['사라졌','사라진','없어졌','찾으러'],role:'event'},
  {id:'event_treasure',label:'수상한 단서 발견',emoji:'🧩',aliases:['단서','수상한 쪽지','비밀 쪽지','힌트'],role:'event'},
  {id:'event_race',label:'갑자기 시합 시작',emoji:'🏁',aliases:['시합','경기','대결','경주'],role:'event'},
  {id:'event_broken',label:'중요한 것이 고장남',emoji:'🛠️',aliases:['고장','망가졌','부서졌','깨졌'],role:'event'},
  {id:'event_party',label:'뜻밖의 축하',emoji:'🎉',aliases:['축하','파티','잔치','깜짝 선물'],role:'event'},
  {id:'event_sound',label:'정체 모를 소리',emoji:'👂',aliases:['이상한 소리','수상한 소리','쿵','쾅','바스락'],role:'event'},
  {id:'event_rescue',label:'누군가 도움을 요청함',emoji:'🆘',aliases:['도와 달','도와줘','도움','구해 달'],role:'event'},
  {id:'event_secret',label:'비밀을 알게 됨',emoji:'🤫',aliases:['비밀','숨겨진 사실','사실을 알','몰랐던'],role:'event'}
];
const ROLE_LABELS={character:'주인공',place:'장소',event:'사건',object:'중요한 물건',bonus:'추가 재료'};
const CHALLENGES = [
  {id:'dialogue',label:'💬 누군가 말하는 문장을 한 번 넣기',test:t=>/[“”"'「」]/.test(t)||/(말했|물었|대답했|외쳤|소리쳤)/.test(t)},
  {id:'emotion',label:'😊 등장인물의 기분을 한 번 표현하기',test:t=>/(기쁘|즐겁|신나|슬프|무섭|두렵|화가|속상|걱정|놀라|설레|행복|긴장|안심)/.test(t)},
  {id:'reason',label:'🧠 왜 그런 일이 생겼는지 이유를 쓰기',test:t=>/(왜냐하면|때문|그래서|그러므로|바람에|덕분에)/.test(t)},
  {id:'twist',label:'⚡ 그런데·하지만·갑자기 중 하나로 사건 바꾸기',test:t=>/(그런데|하지만|갑자기|뜻밖|놀랍게)/.test(t)},
  {id:'question',label:'❓ 등장인물이 궁금한 것을 묻게 하기',test:t=>/\?/.test(t)||/(물었|궁금해|어디|왜|어떻게)/.test(t)},
  {id:'thought',label:'💭 주인공의 생각을 한 번 보여 주기',test:t=>/(생각했|생각했다|마음속|라고 생각|싶었|바랐)/.test(t)},
  {id:'sense',label:'👃 소리·냄새·빛·촉감 중 하나 묘사하기',test:t=>/(소리|냄새|향기|반짝|빛나|따뜻|차갑|부드럽|거칠|쿵|쾅|바스락)/.test(t)},
  {id:'obstacle',label:'🧱 한 번은 일이 뜻대로 되지 않게 하기',test:t=>/(실패|막혔|어려웠|곤란|문제|안 됐|할 수 없|넘어졌|잃어버)/.test(t)},
  {id:'helper',label:'🤝 누군가 도움을 주거나 받게 하기',test:t=>/(도와|도움|함께|같이|구해|도와줬|도와주)/.test(t)},
  {id:'choice',label:'↔️ 주인공이 무엇을 할지 선택하게 하기',test:t=>/(결심|선택|하기로 했|기로 했다|할까|말까)/.test(t)},
  {id:'time',label:'⏰ 시간의 흐름을 나타내는 말을 넣기',test:t=>/(아침|점심|저녁|밤|다음 날|그날|잠시 후|한참 뒤|곧)/.test(t)},
  {id:'setting',label:'🌿 장소가 어떤 모습인지 한 번 설명하기',test:t=>/(넓|좁|높|낮|어두|밝|조용|시끄|푸른|빨간|커다란|작은)/.test(t)},
  {id:'soundword',label:'🔊 의성어·의태어를 하나 넣기',test:t=>/(쿵|쾅|톡톡|살금살금|반짝반짝|펄쩍|주룩주룩|휙|덜컹|바스락)/.test(t)},
  {id:'change',label:'🌱 끝에서 주인공의 마음이나 생각이 달라지게 하기',test:t=>/(이제는|더 이상|마침내|깨달|알게 되었|용기|안심|기뻐졌|달라졌)/.test(t)},
  {id:'callback',label:'🔁 처음 나온 재료를 끝에서 다시 언급하기',test:(t,m)=>m&&m.cards&&m.cards.some(c=>(c.aliases||[]).some(a=>a.length>1&&countOccur(t,a)>=2))}
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
 ['안되요','안 돼요','‘안’과 ‘돼요’를 바르게 쓰면 ‘안 돼요’예요.'],
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


// Do not flag real Korean words that sound like a different inflected verb.
const PHONETIC_EXCLUSIONS=new Set(['바다','자바','저버']);
const PHONETIC_WORDS=[
 '먹어','먹어요','먹었어','먹었어요','받아','받아요','받았어','받았어요',
 '찾아','찾아요','찾았어','찾았어요','맞아','맞아요','맞았어','맞았어요',
 '씻어','씻어요','씻었어','씻었어요','웃어','웃어요','웃었어','웃었어요',
 '있어','있어요','있었어','있었어요','갔어','갔어요','왔어','왔어요',
 '했어','했어요','됐어','됐어요','봤어','봤어요','썼어','썼어요',
 '잡아','잡아요','잡았어','잡았어요','입어','입어요','입었어','입었어요',
 '접어','접어요','접었어','접었어요','걸어','걸어요','걸었어','걸었어요'
];
const SPOKEN_ERRORS=[
 ['머거요','먹어요','소리와 표기가 달라요. ‘먹어요’라고 써요.'],
 ['머거','먹어','‘먹다’에 ‘-어’가 붙으면 ‘먹어’예요.'],
 ['머것어요','먹었어요','‘먹다’의 과거형은 ‘먹었어요’예요.'],
 ['머겄어요','먹었어요','‘먹었어요’가 바른 표기예요.'],
 ['머거써요','먹었어요','소리대로 쓰지 않고 ‘먹었어요’라고 써요.'],
 ['마싯게','맛있게','‘맛있게’가 바른 표기예요.'],
 ['마싯께','맛있게','‘맛있게’가 바른 표기예요.'],
 ['마싯어요','맛있어요','‘맛있어요’가 바른 표기예요.'],
 ['마시써요','맛있어요','‘맛있어요’가 바른 표기예요.'],
 ['안자요','앉아요','‘앉아요’가 바른 표기예요.'],
 ['안자','앉아','‘앉아’가 바른 표기예요.'],
 ['업서요','없어요','‘없어요’가 바른 표기예요.'],
 ['업써요','없어요','‘없어요’가 바른 표기예요.'],
 ['조아요','좋아요','‘좋아요’가 바른 표기예요.'],
 ['마나요','많아요','‘많아요’가 바른 표기예요.'],
 ['시러요','싫어요','‘싫어요’가 바른 표기예요.'],
 ['괜찬아요','괜찮아요','‘괜찮아요’가 바른 표기예요.'],
 ['일거요','읽어요','‘읽어요’가 바른 표기예요.'],
 ['이써요','있어요','‘있어요’가 바른 표기예요.'],
 ['가써요','갔어요','‘갔어요’가 바른 표기예요.'],
 ['와써요','왔어요','‘왔어요’가 바른 표기예요.'],
 ['해써요','했어요','‘했어요’가 바른 표기예요.'],
 ['써써요','썼어요','‘썼어요’가 바른 표기예요.'],
 ['봐써요','봤어요','‘봤어요’가 바른 표기예요.']
];
const CONTEXTUAL_WORDS=new Set(['낳았어요','맞췄어요','바래요','안되']);
const CHECK_WORDS=[
 {bad:'마시께',good:'맛있게 / 마실게',explain:'‘맛있게’인지 ‘마실게’인지 말하려는 뜻을 확인해 보세요.'},
 {bad:'말인게',good:'말인데 / 말인 게 / 맛있게',explain:'무슨 뜻인지 확인해 보세요. 말하려는 뜻에 따라 다르게 쓸 수 있어요.'},
 {bad:'맛인게',good:'맛있는 게 / 맛있게',explain:'어떤 뜻으로 썼는지 살펴보세요.'}
];
// 단일 받침이 다음 모음으로 이어져 들리는 형태를 일부 기본 활용형에만 적용합니다.
const FINAL_TO_INITIAL={1:0,2:1,4:2,7:3,8:5,16:6,17:7,19:9,20:10,21:11,22:12,23:14,24:15,25:16,26:17,27:18};
function asSpoken(word){
 const chars=Array.from(word);
 for(let i=0;i<chars.length-1;i++){
   const a=chars[i].charCodeAt(0)-44032,b=chars[i+1].charCodeAt(0)-44032;
   if(a<0||a>=11172||b<0||b>=11172||Math.floor(b/588)!==11)continue;
   const final=a%28;
   if(!Object.prototype.hasOwnProperty.call(FINAL_TO_INITIAL,final))continue;
   chars[i]=String.fromCharCode(44032+a-final);
   chars[i+1]=String.fromCharCode(44032+FINAL_TO_INITIAL[final]*588+b%588);
 }
 return chars.join('');
}

let level='easy';
let mission=null;
let initialAccuracy=null;
let spellRules=[];
let draftTimer=null;
const ignoredChecks=new Set();

function loadState(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch(_){return {}}
}
function saveState(patch){
  const prev=loadState();
  localStorage.setItem(STORAGE_KEY,JSON.stringify({...prev,...patch}));
}
function hydrateMission(raw){
  if(!raw)return null;
  const allCards=[...CARD_POOL,...EVENT_POOL];
  const cards=(raw.cards||[]).map(c=>{
    const base=allCards.find(x=>x.id===c.id);
    return base?{...base,role:c.role||base.role||'bonus'}:null;
  }).filter(Boolean);
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
function escapeRegExp(s){return String(s).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}
function containsAlias(text,card){
  const source=String(text||'');
  const suffix='(?:이|가|은|는|을|를|와|과|도|만|의|에|에서|에게|으로|로|랑|하고|부터|까지|처럼|보다)';
  return (card.aliases||[card.label]).some(alias=>{
    const raw=String(alias||'').trim();
    if(!raw)return false;
    const a=escapeRegExp(raw).replace(/\\s+/g,'\\s*');
    return new RegExp('(^|[^가-힣A-Za-z0-9])'+a+'(?=$|[^가-힣A-Za-z0-9]|'+suffix+')').test(source);
  });
}
function countWords(t){return (t.match(/[가-힣A-Za-z0-9]+/g)||[]).length}
function countOccur(text,needle){
  if(!needle)return 0;let n=0,p=0;while((p=text.indexOf(needle,p))!==-1){n++;p+=needle.length}return n;
}
function cleanToken(s){return String(s||'').replace(/^[^가-힣A-Za-z0-9]+|[^가-힣A-Za-z0-9]+$/g,'')}

function buildSpellRules(){
  const map=new Map();
  const add=(bad,good,explain,match='fragment')=>{
    bad=cleanToken(bad);good=cleanToken(good);
    if(!bad||!good||bad===good||bad.length<2||bad.length>18||good.length>22)return;
    if(!/[가-힣]/.test(bad)||!/[가-힣]/.test(good))return;
    if(!map.has(bad))map.set(bad,{bad,good,explain:explain||'표기를 한 번 살펴보세요.',match});
  };
  // 초등학생이 자주 쓰는 표기 오류는 단어 경계를 확인하여 과도한 교정을 막습니다.
  (window.KIDSCADE_WRITING_RULES||[]).forEach(r=>{
    if(r&&r.bad&&r.good)add(r.bad,r.good,r.explain,r.match||'word');
  });
  MANUAL_RULES.forEach(([b,g,e])=>{
    if(b===g||CONTEXTUAL_WORDS.has(b))return;
    const wholeOnly=new Set(['할수','갈수','될수','먹을수']);
    add(b,g,e,wholeOnly.has(b)?'word':'fragment');
  });
  SPOKEN_ERRORS.forEach(([b,g,e])=>add(b,g,e));
  const spokenMap=new Map();
  PHONETIC_WORDS.forEach(g=>{
    const b=asSpoken(g);
    if(b===g)return;
    if(!spokenMap.has(b))spokenMap.set(b,new Set());
    spokenMap.get(b).add(g);
  });
  spokenMap.forEach((corrects,b)=>{
    if(corrects.size===1&&!PHONETIC_EXCLUSIONS.has(b))add(b,[...corrects][0],'소리 나는 대로 쓰지 않고 원래 낱말의 형태를 살려 써요.');
  });
  const correctForms=new Set();
  (window.KIDSCADE_SPELLING_EXTRA||[]).forEach(q=>{
    String(q.c||'').split(/\s+/).forEach(token=>correctForms.add(cleanToken(token)));
    const match=String(q.c||'').match(/‘([^’]+)’/);
    if(match)correctForms.add(match[1]);
  });
  (window.KIDSCADE_SPELLING_EXTRA||[]).forEach(q=>{
    if(q.category==='뜻이 다른 말')return;
    const cq=String(q.c||'').match(/‘([^’]+)’/);
    const wq=String(q.w||'').match(/‘([^’]+)’/);
    if(cq&&wq&&cq[1]!==wq[1]&&!correctForms.has(wq[1])) add(wq[1],cq[1],q.explain);
    const cTokens=String(q.c||'').split(/\s+/);
    const wTokens=String(q.w||'').split(/\s+/);
    if(cTokens.length===wTokens.length){
      for(let i=0;i<cTokens.length;i++){
        const c=cleanToken(cTokens[i]),w=cleanToken(wTokens[i]);
        if(c&&w&&c!==w&&!correctForms.has(w)) add(w,c,q.explain);
      }
    }
  });
  spellRules=[...map.values()].sort((a,b)=>b.bad.length-a.bad.length);
}
function inspectSpelling(text,ignore=ignoredChecks){
  // 긴 표현을 먼저 처리하고 같은 부분의 중복 감점을 방지합니다.
  const occupied=new Set(),matches=[];
  for(const rule of spellRules){
    let pos=0;
    while((pos=text.indexOf(rule.bad,pos))>=0){
      if(rule.match==='word'){
        const isLetter=c=>c!==undefined&&/[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]/.test(c);
        if(isLetter(text[pos-1])||isLetter(text[pos+rule.bad.length])){
          pos+=Math.max(1,rule.bad.length);
          continue;
        }
      }
      const overlapping=Array.from({length:rule.bad.length},(_,i)=>pos+i).some(i=>occupied.has(i));
      if(!overlapping){
        matches.push({...rule,type:'error',count:1});
        for(let i=pos;i<pos+rule.bad.length;i++)occupied.add(i);
      }
      pos+=Math.max(1,rule.bad.length);
    }
  }
  for(const rule of CHECK_WORDS){
    if(ignore.has(rule.bad))continue;
    let pos=0;
    while((pos=text.indexOf(rule.bad,pos))>=0){
      const overlapping=Array.from({length:rule.bad.length},(_,i)=>pos+i).some(i=>occupied.has(i));
      if(!overlapping){
        matches.push({...rule,type:'check',count:1});
        for(let i=pos;i<pos+rule.bad.length;i++)occupied.add(i);
      }
      pos+=rule.bad.length;
    }
  }
  const combined=new Map();
  matches.forEach(item=>{
    const key=item.type+':'+item.bad+':'+item.good;
    if(combined.has(key))combined.get(key).count+=item.count;
    else combined.set(key,{...item});
  });
  return [...combined.values()];
}
function accuracyFor(text,issues){
  const words=Math.max(1,countWords(text));
  const errors=issues.filter(x=>x.type==='error').reduce((n,x)=>n+x.count,0);
  return Math.max(0,Math.min(100,Math.round((1-errors/words)*100)));
}

function cardById(id){return CARD_POOL.find(x=>x.id===id)}
function deck(ids,role){return ids.map(cardById).filter(Boolean).map(c=>({...c,role}))}
function buildMissionCards(levelName){
  const cards=[
    sample(deck(CHARACTER_IDS,'character'),1)[0],
    sample(deck(PLACE_IDS,'place'),1)[0],
    {...sample(EVENT_POOL,1)[0],role:'event'}
  ];
  if(levelName!=='easy')cards.push(sample(deck(OBJECT_IDS,'object'),1)[0]);
  if(levelName==='hard'){
    const used=new Set(cards.map(c=>c.id));
    const bonus=[...deck(OBJECT_IDS,'bonus'),...EVENT_POOL.map(c=>({...c,role:'bonus'}))].filter(c=>!used.has(c.id));
    cards.push(sample(bonus,1)[0]);
  }
  return cards.filter(Boolean);
}
function storyParts(){return {start:$('storyStart').value,middle:$('storyMiddle').value,end:$('storyEnd').value}}
function composeStory(){
  const p=storyParts();
  return [p.start,p.middle,p.end].map(x=>x.trim()).filter(Boolean).join('\n\n');
}
function clearStoryParts(){['storyStart','storyMiddle','storyEnd'].forEach(id=>$(id).value='')}
function setStoryParts(parts={}){
  $('storyStart').value=parts.start||'';
  $('storyMiddle').value=parts.middle||'';
  $('storyEnd').value=parts.end||'';
}
function readySections(cfg){
  const p=storyParts();
  return Object.values(p).filter(v=>v.replace(/\s/g,'').length>=cfg.minSectionChars).length;
}
function challengeDone(c,t){return c.test.length>1?c.test(t,mission):c.test(t)}
function startMission(){
  const cfg=LEVELS[level];
  mission={level,cards:buildMissionCards(level),challenges:sample(CHALLENGES,cfg.challenges),startedAt:Date.now()};
  $('titleInput').value='';clearStoryParts();
  renderMission();updateWriteStatus();showScreen('writeScreen');
  try{window.KidscadeGame?.start?.({mode:'story-builder',level,cards:mission.cards.map(c=>c.role)})}catch(_){}
}
function renderCard(card,used){
  return '<div class="story-card '+(used?'used':'')+'" data-card="'+card.id+'">'
    +'<span class="role-badge">'+(ROLE_LABELS[card.role]||'재료')+'</span>'
    +(card.image?'<img src="'+card.image+'" alt="">':'<div class="emoji">'+card.emoji+'</div>')
    +'<b>'+card.label+'</b></div>';
}
function renderMission(){
  if(!mission)return;
  $('cardList').innerHTML=mission.cards.map(c=>renderCard(c,false)).join('');
  $('challengeBox').innerHTML=mission.challenges.length
    ? '<div class="challenge-title">오늘의 작가 미션</div>'+mission.challenges.map(c=>'<div class="challenge" data-challenge="'+c.id+'">'+c.label+'</div>').join('')
    : '<div class="challenge-title">차근차근 모드</div><div class="muted">처음·가운데·끝을 채우며 세 가지 이야기 재료를 모두 사용해 보세요.</div>';
}
function updateWriteStatus(){
  if(!mission)return;
  const t=composeStory(),cfg=LEVELS[mission.level],sent=sentenceCount(t),chars=t.replace(/\s/g,'').length,sections=readySections(cfg);
  $('sentenceStat').textContent=sent+'문장';$('charStat').textContent=chars+'자';
  mission.cards.forEach(c=>{
    const el=document.querySelector('[data-card="'+c.id+'"]');
    el?.classList.toggle('used',containsAlias(t,c));
  });
  mission.challenges.forEach(c=>document.querySelector('[data-challenge="'+c.id+'"]')?.classList.toggle('done',challengeDone(c,t)));
  const used=mission.cards.filter(c=>containsAlias(t,c)).length;
  const chall=mission.challenges.filter(c=>challengeDone(c,t)).length;
  const chips=[
    '<span class="status-chip '+(sections===3?'ok':'warn')+'">📚 처음·가운데·끝 '+sections+'/3</span>',
    '<span class="status-chip '+(used===mission.cards.length?'ok':'warn')+'">🧩 재료 '+used+'/'+mission.cards.length+'</span>',
    '<span class="status-chip '+(sent>=cfg.minSentences?'ok':'warn')+'">📝 문장 '+sent+'/'+cfg.minSentences+'</span>',
    '<span class="status-chip '+(chars>=cfg.minChars?'ok':'warn')+'">✍️ '+chars+'자 · 최소 '+cfg.minChars+'자</span>'
  ];
  if(mission.challenges.length)chips.push('<span class="status-chip '+(chall===mission.challenges.length?'ok':'warn')+'">⭐ 작가 미션 '+chall+'/'+mission.challenges.length+'</span>');
  $('missionStatus').innerHTML=chips.join('');
  clearTimeout(draftTimer);draftTimer=setTimeout(()=>saveState({draft:{mission,title:$('titleInput').value,text:t,parts:storyParts()}}),350);
}
function validateStory(){
  const t=composeStory().trim(),cfg=LEVELS[mission.level],parts=storyParts();
  const missing=mission.cards.filter(c=>!containsAlias(t,c));
  const sent=sentenceCount(t),chars=t.replace(/\s/g,'').length;
  const undone=mission.challenges.filter(c=>!challengeDone(c,t));
  const shortSections=Object.entries(parts).filter(([,v])=>v.replace(/\s/g,'').length<cfg.minSectionChars);
  if(!t){toast('먼저 이야기를 써 주세요.');$('storyStart').focus();return false}
  if(shortSections.length){
    const names={start:'처음',middle:'가운데',end:'끝'};
    const ids={start:'storyStart',middle:'storyMiddle',end:'storyEnd'};
    toast(names[shortSections[0][0]]+' 부분을 조금 더 써 주세요.');
    $(ids[shortSections[0][0]]).focus();
    return false;
  }
  if(missing.length){toast('아직 '+missing.map(x=>x.label).join(', ')+' 재료가 이야기 속에 없어요.');return false}
  if(sent<cfg.minSentences){toast('문장이 '+(cfg.minSentences-sent)+'개 더 필요해요.');return false}
  if(chars<cfg.minChars){toast('이야기를 '+(cfg.minChars-chars)+'자 정도 더 써 주세요.');return false}
  if(undone.length){toast('오늘의 작가 미션을 확인해 주세요.');return false}
  return true;
}
function enterReview(){
  if(!validateStory())return;
  const text=composeStory().trim();
  $('reviewInput').value=text;
  ignoredChecks.clear();
  const issues=inspectSpelling(text);initialAccuracy=accuracyFor(text,issues);
  renderIssues();
  showScreen('reviewScreen');
}
function renderIssues(){
  const text=$('reviewInput').value;
  const issues=inspectSpelling(text),accuracy=accuracyFor(text,issues);
  const errors=issues.filter(x=>x.type==='error');
  const checks=issues.filter(x=>x.type==='check');
  const errorTotal=errors.reduce((n,x)=>n+x.count,0);
  const checkTotal=checks.reduce((n,x)=>n+x.count,0);
  $('accuracyBadge').textContent='검사 기준 '+accuracy+'점'+(checkTotal?' · 확인 '+checkTotal+'곳':'');
  $('issueSummary').innerHTML=errorTotal||checkTotal
    ? (errorTotal?'<b>고쳐 볼 곳 '+errorTotal+'곳</b><br>':'')
      +(checkTotal?'<b>뜻을 확인할 곳 '+checkTotal+'곳</b><br>':'')
      +'힌트를 보고 스스로 고쳐 보세요. 모호한 표현은 감점하지 않아요.'
    : '<b>등록된 규칙에서 발견된 오류는 없어요.</b><br>모든 한국어 오류를 검사하지는 못해요. 직접 한 번 더 읽어 보세요.';
  $('issuesList').innerHTML=issues.length?issues.map((x,i)=>`
    <div class="issue-card answer-hidden" data-issue="${i}">
      <div class="issue-top">
        <span class="wrong">${escapeHtml(x.bad)}</span>
        <span class="arrow">→</span>
        <span class="right">${escapeHtml(x.good)}</span>
        ${x.count>1?`<small>×${x.count}</small>`:''}
      </div>
      <p>${escapeHtml(x.explain)}</p>
      <button class="reveal-btn" type="button">${x.type==='check'?'가능한 표현 보기':'힌트 보기'}</button>
      ${x.type==='check'?`<button class="accept-btn" type="button" data-ignore="${escapeHtml(x.bad)}">의도한 표현이에요</button>`:''}
    </div>`).join('')
    : '<div class="no-issue">현재 검사 규칙에서 찾은 오류는 없어요.<br><small>마지막으로 직접 읽어 보세요.</small></div>';
  document.querySelectorAll('.reveal-btn').forEach(btn=>btn.onclick=()=>{
    btn.parentElement.classList.remove('answer-hidden');btn.remove();
  });
  document.querySelectorAll('.accept-btn').forEach(btn=>btn.onclick=()=>{
    ignoredChecks.add(btn.dataset.ignore);renderIssues();
  });
  return {issues,accuracy,errorTotal,checkTotal};
}
function finishStory(){
  const text=$('reviewInput').value.trim();if(!text){toast('이야기가 비어 있어요.');return}
  const final=renderIssues();
  const title=$('titleInput').value.trim()||makeTitle();
  const record={id:Date.now(),title,text,cards:mission.cards.map(c=>c.id),roles:mission.cards.map(c=>c.role),challenges:mission.challenges.map(c=>c.id),level:mission.level,accuracy:final.accuracy,checkTotal:final.checkTotal,createdAt:new Date().toISOString()};
  const list=[record,...books()].slice(0,20);saveState({books:list,draft:null});
  $('resultTitle').textContent=title;$('resultStory').textContent=text;
  $('bookVisuals').innerHTML=mission.cards.map(c=>`<div class="book-visual">${c.image?`<img src="${c.image}" alt="${c.label}">`:c.emoji}</div>`).join('');
  $('resultCards').textContent=mission.cards.length+'개 카드 모두 사용';
  $('resultSentences').textContent=sentenceCount(text)+'문장 · '+text.replace(/\s/g,'').length+'자';
  $('resultAccuracy').textContent='검사 기준 '+final.accuracy+'점'+(final.checkTotal?' · 확인 '+final.checkTotal+'곳':'');
  $('growthNote').textContent=final.checkTotal?'뜻을 확인해야 할 표현이 남아 있어요. 완성 후에도 다시 읽어 보세요.':initialAccuracy!=null&&final.accuracy>initialAccuracy
    ? `초고 ${initialAccuracy}점 → 지금 ${final.accuracy}점 · 직접 고치며 더 정확해졌어요.`
    : final.accuracy===100?'등록된 검사 규칙에서는 오류가 더 발견되지 않았어요. 직접 한 번 더 읽어 보세요.':'고치지 않은 곳이 있어도 이야기는 완성할 수 있어요.';
  updateBookCount();showScreen('resultScreen');
  try{
    window.KidscadeGame?.result?.({
      scope:'creation',status:'completed',outcome:'clear',completed:true,creationSaved:true,
      score:final.accuracy,scoreOptions:{unit:'점',higherIsBetter:true},
      level:mission.level,cardsUsed:mission.cards.length,challengesCompleted:mission.challenges.length,
      sentences:sentenceCount(text),characters:text.replace(/\s/g,'').length,accuracy:final.accuracy
    });
  }catch(_){}
}
function makeTitle(){
  if(!mission?.cards?.length)return '나의 이야기';
  return mission.cards.slice(0,2).map(x=>x.label).join('와 ')+' 이야기';
}
function shuffleMission(){
  if(composeStory().trim()&&!confirm('지금 쓴 글을 지우고 새 재료를 뽑을까요?'))return;
  startMission();
}
function openModal(html){$('modalContent').innerHTML=html;$('modal').classList.remove('hidden')}
function closeModal(){$('modal').classList.add('hidden')}
function showHelp(){
  openModal('<h2>🧩 이야기 조립소는 이렇게 해요</h2>'
    +'<div class="help-steps">'
    +'<div class="help-step"><span>1</span><div><b>역할이 다른 이야기 재료를 확인해요.</b><br><small>주인공·장소·사건과 중요한 물건이 이야기의 뼈대가 돼요.</small></div></div>'
    +'<div class="help-step"><span>2</span><div><b>처음·가운데·끝을 차례로 써요.</b><br><small>각 칸의 질문을 따라가면 자연스럽게 한 편의 이야기가 돼요.</small></div></div>'
    +'<div class="help-step"><span>3</span><div><b>작가 미션으로 장면을 풍부하게 만들어요.</b><br><small>대화·감정·소리·반전 같은 표현에 도전할 수 있어요.</small></div></div>'
    +'<div class="help-step"><span>4</span><div><b>마지막에 맞춤법을 다듬고 책으로 완성해요.</b><br><small>검사기가 자동으로 고치지 않고, 힌트를 보고 직접 수정해요.</small></div></div>'
    +'</div>');
}
function showBooks(){
  const list=books();
  openModal(`<h2>📚 내 이야기책</h2><p class="muted">이 기기에 최근 20편까지 저장돼요.</p><div class="book-list">${list.length?list.map(b=>`
    <div class="saved-book"><div><h4>${escapeHtml(b.title)}</h4><p>${escapeHtml(b.text)}</p></div><button type="button" data-open-book="${b.id}">읽기</button></div>`).join(''):'<div class="no-issue">아직 완성한 이야기가 없어요.</div>'}</div>`);
  document.querySelectorAll('[data-open-book]').forEach(btn=>btn.onclick=()=>openSavedBook(Number(btn.dataset.openBook)));
}
function openSavedBook(id){
  const b=books().find(x=>x.id===id);if(!b)return;
  openModal(`<div class="book-label">내 이야기책</div><h2>${escapeHtml(b.title)}</h2><div class="result-story">${escapeHtml(b.text)}</div><div class="growth-note">검사 기준 ${b.accuracy}점</div>`);
}

document.querySelectorAll('.difficulty').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.difficulty').forEach(x=>x.classList.toggle('selected',x===btn));level=btn.dataset.level;
});
document.querySelectorAll('.starter-chip').forEach(btn=>btn.onclick=()=>{
  const target=$(btn.dataset.target);if(!target)return;
  const text=btn.dataset.text||'';
  if(target.value&&!/\s$/.test(target.value))target.value+=' ';
  target.value+=text;
  target.focus();
  updateWriteStatus();
});
$('startBtn').onclick=startMission;
$('shuffleBtn').onclick=shuffleMission;
['storyStart','storyMiddle','storyEnd'].forEach(id=>$(id).addEventListener('input',updateWriteStatus));
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
  $('titleInput').value=saved.title||'';
  if(saved.parts)setStoryParts(saved.parts);
  else if(saved.text){
    const legacy=String(saved.text).split(/\n\s*\n/);
    setStoryParts({start:legacy[0]||'',middle:legacy[1]||'',end:legacy.slice(2).join('\n\n')});
  }
  if(mission){renderMission();updateWriteStatus();showScreen('writeScreen');toast('쓰던 이야기를 다시 펼쳤어요.')}
}
})();