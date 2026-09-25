(function(){
'use strict';

const ROUND_MS=120000;
const CLUE_MS=5000;
const WRONG_PENALTY_MS=3000;
const SCORE_BY_CLUE=[600,500,400,300,200,100];
const STORAGE='kidscade_game_v1:low_blind_elephant:records';

const ANIMALS=[
{name:'코끼리',emoji:'🐘',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','주로 풀과 나뭇잎을 먹어요.','아프리카와 아시아의 따뜻한 지역에 살아요.','큰 귀와 굵은 다리를 가졌어요.','아주 긴 코로 물건을 집거나 물을 마셔요.']},
{name:'기린',emoji:'🦒',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','초식동물이에요.','아프리카 초원에 살아요.','몸에 갈색 얼룩무늬가 있어요.','목이 아주 길어 높은 나뭇잎을 먹어요.']},
{name:'사자',emoji:'🦁',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','고기를 먹는 육식동물이에요.','아프리카의 초원에서 무리를 이루기도 해요.','고양잇과 동물이에요.','수컷은 얼굴 둘레에 풍성한 갈기가 있어요.']},
{name:'호랑이',emoji:'🐯',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','고기를 먹는 육식동물이에요.','고양잇과 동물이에요.','주황빛 몸에 검은 줄무늬가 있어요.','우리나라 옛이야기에도 자주 등장하는 큰 맹수예요.']},
{name:'얼룩말',emoji:'🦓',group:'포유류',easy:true,aliases:['제브라'],clues:['포유류예요.','초식동물이에요.','아프리카 초원에 살아요.','말과 가까운 친척이에요.','온몸에 검고 흰 줄무늬가 있어요.']},
{name:'판다',emoji:'🐼',group:'포유류',easy:true,aliases:['자이언트판다'],clues:['포유류예요.','주로 식물을 먹어요.','중국의 산림 지역에 살아요.','대나무를 아주 많이 먹어요.','눈과 귀 주변 털이 검고 몸은 흰색이에요.']},
{name:'북극곰',emoji:'🐻‍❄️',group:'포유류',easy:true,aliases:['흰곰'],clues:['포유류예요.','주로 고기를 먹어요.','매우 추운 북극 지방에 살아요.','수영을 아주 잘해요.','하얗게 보이는 두꺼운 털을 가진 큰 곰이에요.']},
{name:'늑대',emoji:'🐺',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','육식성에 가까운 잡식동물이에요.','여러 마리가 무리를 이루어 생활해요.','개와 가까운 친척이에요.','길게 울부짖는 소리로도 잘 알려져 있어요.']},
{name:'여우',emoji:'🦊',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','잡식동물이에요.','숲과 들판 등 다양한 곳에 살아요.','귀가 뾰족하고 꼬리가 풍성해요.','붉은빛 털을 가진 종류가 특히 잘 알려져 있어요.']},
{name:'토끼',emoji:'🐰',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','주로 풀을 먹어요.','뒷다리가 발달해 잘 뛰어요.','앞니가 계속 자라요.','길고 큰 귀가 특징이에요.']},
{name:'캥거루',emoji:'🦘',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','주로 식물을 먹어요.','오스트레일리아에 살아요.','강한 뒷다리와 긴 꼬리로 잘 뛰어요.','어미 배의 주머니에서 새끼를 키워요.']},
{name:'코알라',emoji:'🐨',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','오스트레일리아에 살아요.','나무 위에서 많은 시간을 보내요.','유칼립투스 잎을 주로 먹어요.','둥근 귀와 큰 검은 코가 특징이에요.']},
{name:'하마',emoji:'🦛',group:'포유류',easy:true,aliases:['하마'],clues:['포유류예요.','주로 풀을 먹어요.','아프리카에 살아요.','낮에는 물속에서 지내는 시간이 많아요.','입이 매우 크고 몸집이 묵직해요.']},
{name:'코뿔소',emoji:'🦏',group:'포유류',easy:true,aliases:['코뿔소'],clues:['포유류예요.','초식동물이에요.','아프리카와 아시아 일부 지역에 살아요.','몸집이 크고 피부가 두꺼워 보여요.','코 위에 한 개 또는 두 개의 뿔이 있어요.']},
{name:'낙타',emoji:'🐫',group:'포유류',easy:true,aliases:['쌍봉낙타'],clues:['포유류예요.','주로 식물을 먹어요.','건조한 사막과 초원 환경에 잘 적응했어요.','긴 다리와 두꺼운 입술을 가졌어요.','등에 지방을 저장하는 혹이 있어요.']},
{name:'고릴라',emoji:'🦍',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','영장류예요.','아프리카 숲에 살아요.','주로 식물을 먹고 팔이 매우 길고 힘이 세요.','사람과 가까운 친척인 큰 유인원이에요.']},
{name:'침팬지',emoji:'🐒',group:'포유류',easy:true,aliases:['침팬지'],clues:['포유류예요.','영장류예요.','아프리카 숲과 초원에 살아요.','도구를 사용하는 행동으로 유명해요.','사람과 매우 가까운 친척인 유인원이에요.']},
{name:'다람쥐',emoji:'🐿️',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','견과류와 씨앗 등을 먹어요.','나무를 잘 타요.','작은 몸집을 가졌어요.','등에 줄무늬가 있거나 꼬리가 매우 풍성한 종류가 익숙해요.']},
{name:'고슴도치',emoji:'🦔',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','작은 무척추동물과 식물성 먹이를 함께 먹기도 해요.','위험하면 몸을 둥글게 말아요.','몸집이 작고 코가 뾰족해요.','등에 뾰족한 가시가 가득해요.']},
{name:'수달',emoji:'🦦',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','물고기와 작은 물속 동물을 먹어요.','강이나 바닷가에서 생활해요.','수영을 매우 잘해요.','몸이 길쭉하고 물에서 장난치는 모습으로 유명해요.']},
{name:'비버',emoji:'🦫',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','식물을 먹어요.','강과 호수 주변에서 살아요.','큰 앞니로 나무를 갉아요.','나뭇가지로 댐을 만드는 행동으로 유명해요.']},
{name:'펭귄',emoji:'🐧',group:'조류',easy:true,aliases:[],clues:['새예요.','날개가 있지만 하늘을 날지 못해요.','물고기와 크릴 등을 먹어요.','수영을 매우 잘해요.','검고 흰 몸으로 뒤뚱뒤뚱 걷는 모습이 익숙해요.']},
{name:'타조',emoji:'🪶',group:'조류',easy:true,aliases:[],clues:['새예요.','하늘을 날지 못해요.','아프리카에 살아요.','매우 빠르게 달릴 수 있어요.','현재 살아 있는 새 가운데 몸집이 가장 커요.']},
{name:'독수리',emoji:'🦅',group:'조류',easy:true,aliases:['수리'],clues:['새예요.','날카로운 발톱을 가진 맹금류예요.','고기나 동물의 사체를 먹어요.','높은 하늘을 오래 날 수 있어요.','큰 날개와 갈고리 모양 부리가 특징이에요.']},
{name:'부엉이',emoji:'🦉',group:'조류',easy:true,aliases:['올빼미'],clues:['새예요.','육식성 맹금류예요.','밤에 활발한 종류가 많아요.','소리 없이 가까이 날아가는 능력이 뛰어나요.','커다란 눈이 앞쪽을 향해 있어요.']},
{name:'홍학',emoji:'🦩',group:'조류',easy:true,aliases:['플라밍고'],clues:['새예요.','얕은 물가에서 무리를 지어 살아요.','긴 다리로 물속을 걸어요.','부리가 아래로 굽어 있어요.','분홍빛 몸과 한쪽 다리로 서는 모습이 유명해요.']},
{name:'악어',emoji:'🐊',group:'파충류',easy:true,aliases:[],clues:['파충류예요.','고기를 먹어요.','강과 늪 같은 물가에서 살아요.','몸이 길고 단단한 비늘로 덮여 있어요.','길고 큰 입에 날카로운 이가 많이 있어요.']},
{name:'거북',emoji:'🐢',group:'파충류',easy:true,aliases:['거북이'],clues:['파충류예요.','육지와 물에 사는 다양한 종류가 있어요.','움직임이 느린 종류가 많아요.','부리가 있지만 이빨은 없어요.','단단한 등딱지가 몸을 보호해요.']},
{name:'뱀',emoji:'🐍',group:'파충류',easy:true,aliases:[],clues:['파충류예요.','종류에 따라 먹이는 다양하지만 다른 동물을 먹어요.','다리가 없어요.','몸 전체가 길고 비늘로 덮여 있어요.','혀를 날름거리며 주변 냄새 정보를 모아요.']},
{name:'카멜레온',emoji:'🦎',group:'파충류',easy:true,aliases:[],clues:['파충류예요.','곤충을 주로 먹어요.','나무 위에서 생활하는 종류가 많아요.','두 눈을 서로 다른 방향으로 움직일 수 있어요.','몸 색을 변화시키는 능력으로 유명해요.']},
{name:'개구리',emoji:'🐸',group:'양서류',easy:true,aliases:[],clues:['양서류예요.','어릴 때와 자랐을 때 모습이 크게 달라요.','물과 육지를 오가며 살아요.','긴 뒷다리로 잘 뛰어요.','알에서 올챙이로 태어나 변태를 해요.']},
{name:'상어',emoji:'🦈',group:'어류',easy:true,aliases:[],clues:['물고기예요.','바다에 사는 종류가 많아요.','뼈 대신 연골로 된 골격을 가졌어요.','종류에 따라 작은 생물부터 큰 동물까지 먹어요.','여러 줄의 날카로운 이빨로 유명해요.']},
{name:'흰긴수염고래',emoji:'🐋',group:'포유류',easy:true,aliases:['대왕고래','블루웨일'],clues:['포유류예요.','바다에 살아요.','새끼에게 젖을 먹여요.','수염판으로 아주 작은 먹이를 걸러 먹어요.','지구에서 가장 큰 동물로 알려져 있어요.']},
{name:'돌고래',emoji:'🐬',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','바다에 사는 종류가 많아요.','폐로 숨을 쉬어서 수면으로 올라와야 해요.','무리를 이루고 소리로 의사소통해요.','머리 앞쪽이 둥글고 빠르게 헤엄치는 모습이 익숙해요.']},
{name:'문어',emoji:'🐙',group:'연체동물',easy:true,aliases:[],clues:['척추가 없는 동물이에요.','바다에 살아요.','몸이 매우 부드러워 좁은 틈도 지나가요.','위험할 때 먹물을 뿜기도 해요.','빨판이 달린 팔이 여덟 개예요.']},
{name:'해마',emoji:'🐠',group:'어류',easy:true,aliases:[],clues:['물고기예요.','바다의 얕은 곳에 사는 종류가 많아요.','몸을 세운 듯한 자세로 헤엄쳐요.','꼬리로 해초 등을 감을 수 있어요.','수컷의 주머니에서 새끼가 태어나는 것으로 유명해요.']},
{name:'해파리',emoji:'🪼',group:'자포동물',easy:true,aliases:[],clues:['척추가 없는 동물이에요.','바다에 살아요.','몸 대부분이 물로 이루어져 있어요.','우산처럼 생긴 몸으로 물속을 떠다녀요.','촉수에 독침 세포를 가진 종류가 많아요.']},
{name:'게',emoji:'🦀',group:'갑각류',easy:true,aliases:[],clues:['척추가 없는 동물이에요.','갑각류예요.','바다나 민물, 육지에 사는 다양한 종류가 있어요.','옆으로 걷는 모습이 익숙해요.','앞다리 한 쌍이 집게 모양이에요.']},
{name:'오리너구리',emoji:'🦆',group:'포유류',easy:true,aliases:[],clues:['포유류예요.','오스트레일리아에 살아요.','물에서 먹이를 찾는 데 능숙해요.','새끼에게 젖을 먹이지만 알을 낳아요.','오리 같은 넓적한 부리와 물갈퀴가 있어요.']},
{name:'아르마딜로',emoji:'🐾',group:'포유류',easy:false,aliases:[],clues:['포유류예요.','아메리카 대륙에 살아요.','곤충 등을 먹는 종류가 많아요.','땅을 파는 데 좋은 발톱이 있어요.','등과 몸이 단단한 갑옷 같은 판으로 덮여 있어요.']},
{name:'카피바라',emoji:'🐾',group:'포유류',easy:false,aliases:[],clues:['포유류예요.','남아메리카에 살아요.','풀을 먹는 초식동물이에요.','물가에서 생활하고 수영도 잘해요.','현재 살아 있는 설치류 가운데 가장 몸집이 커요.']},
{name:'매너티',emoji:'🌊',group:'포유류',easy:false,aliases:['바다소'],clues:['포유류예요.','따뜻한 바다와 강에 사는 종류가 있어요.','주로 물속 식물을 먹어요.','천천히 헤엄치며 둥근 몸을 가졌어요.','바다소라고도 불려요.']},
{name:'일각고래',emoji:'🐋',group:'포유류',easy:false,aliases:['나왈'],clues:['포유류예요.','북극 바다에 살아요.','고래의 한 종류예요.','수컷에서 특히 길게 자라는 이빨이 있어요.','머리 앞쪽에 긴 나선형 뿔처럼 보이는 것이 있어요.']},
{name:'오카피',emoji:'🐾',group:'포유류',easy:false,aliases:[],clues:['포유류예요.','아프리카 콩고의 숲에 살아요.','초식동물이에요.','기린과 가까운 친척이에요.','다리에는 얼룩말 같은 흰 줄무늬가 있어요.']},
{name:'천산갑',emoji:'🐾',group:'포유류',easy:false,aliases:['판골린'],clues:['포유류예요.','아시아와 아프리카에 여러 종류가 살아요.','개미와 흰개미를 주로 먹어요.','위험하면 몸을 둥글게 말아요.','몸이 단단한 비늘로 덮인 독특한 포유류예요.']},
{name:'웜뱃',emoji:'🐾',group:'포유류',easy:false,aliases:[],clues:['포유류예요.','오스트레일리아에 살아요.','초식동물이에요.','튼튼한 발톱으로 굴을 파요.','주머니를 가진 통통한 몸의 유대류예요.']},
{name:'나무늘보',emoji:'🦥',group:'포유류',easy:false,aliases:['슬로스'],clues:['포유류예요.','중남미 숲에 살아요.','대부분의 시간을 나무 위에서 보내요.','주로 잎을 먹어요.','움직임이 매우 느린 것으로 유명해요.']},
{name:'미어캣',emoji:'🐾',group:'포유류',easy:false,aliases:[],clues:['포유류예요.','아프리카 남부의 건조한 지역에 살아요.','곤충과 작은 동물 등을 먹어요.','무리를 이루며 굴에서 생활해요.','두 발로 곧게 서서 주변을 살피는 모습이 유명해요.']}
];

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const ui={
 menu:$('#menu'),game:$('#game'),result:$('#result'),time:$('#time'),correct:$('#correct'),score:$('#score'),streak:$('#streak'),
 modeBadge:$('#modeBadge'),clueFill:$('#clueFill'),nextClue:$('#nextClue'),clues:$('#clues'),orb:$('#mysteryOrb'),
 easyAnswer:$('#easyAnswer'),hardAnswer:$('#hardAnswer'),candidates:$('#candidates'),input:$('#answerInput'),submit:$('#submitAnswer'),
 typingHelp:$('#typingHelp'),feedback:$('#feedback'),finalCorrect:$('#finalCorrect'),finalScore:$('#finalScore'),finalStreak:$('#finalStreak'),
 resultTitle:$('#resultTitle'),resultSummary:$('#resultSummary'),resultAnimal:$('#resultAnimal'),bestText:$('#bestText')
};

let state={mode:'easy',running:false,paused:false,remaining:ROUND_MS,clueElapsed:0,clueIndex:0,current:null,deck:[],correct:0,score:0,streak:0,bestStreak:0,lastTs:0,raf:0,locked:false};

function shuffle(a){
 const out=a.slice();
 for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=out[i];out[i]=out[j];out[j]=t}
 return out;
}
function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s\-_.·]/g,'')}
function namesOf(a){return [a.name].concat(a.aliases||[]).map(norm)}
const VALID_NAMES=new Set(ANIMALS.flatMap(namesOf));
function sameAnswer(a,v){return namesOf(a).includes(norm(v))}
function pool(){return state.mode==='easy'?ANIMALS.filter(a=>a.easy):ANIMALS}
function refillDeck(){
 let next=shuffle(pool());
 if(state.current&&next[0]===state.current&&next.length>1){const t=next[0];next[0]=next[1];next[1]=t}
 state.deck=next;
}
function nextAnimal(){
 if(!state.deck.length)refillDeck();
 state.current=state.deck.shift();
 state.clueIndex=0;
 state.clueElapsed=0;
 state.locked=false;
 ui.clues.innerHTML='';
 ui.orb.classList.remove('pop');void ui.orb.offsetWidth;ui.orb.classList.add('pop');
 revealClue();
 if(state.mode==='easy')buildCandidates();
 else {ui.input.value='';ui.typingHelp.textContent='띄어쓰기는 달라도 괜찮아요.';ui.typingHelp.classList.remove('warn');setTimeout(()=>ui.input.focus(),80)}
}
function revealClue(){
 if(!state.current)return;
 const clues=state.current.clues;
 if(state.clueIndex>=clues.length)return;
 const li=document.createElement('li');
 li.dataset.no=String(state.clueIndex+1);
 li.textContent=clues[state.clueIndex];
 ui.clues.appendChild(li);
 state.clueIndex++;
}
function distractorsFor(correct){
 const available=ANIMALS.filter(a=>a.easy&&a!==correct);
 const same=shuffle(available.filter(a=>a.group===correct.group)).slice(0,3);
 const chosen=new Set(same);
 const rest=shuffle(available.filter(a=>!chosen.has(a))).slice(0,5-same.length);
 return shuffle([correct].concat(same,rest)).slice(0,6);
}
function buildCandidates(){
 ui.candidates.innerHTML='';
 distractorsFor(state.current).forEach((a,i)=>{
   const b=document.createElement('button');
   b.type='button';b.className='candidate';b.dataset.name=a.name;
   b.style.setProperty('--dur',(2.5+(i%4)*.4)+'s');
   b.style.setProperty('--delay',(-i*.37)+'s');
   const e=document.createElement('span');e.className='animal';e.textContent=a.emoji;
   const n=document.createElement('span');n.className='name';n.textContent=a.name;
   b.append(e,n);b.addEventListener('click',()=>guess(a.name));
   ui.candidates.appendChild(b);
 });
}
function formatTime(ms){
 const total=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(total/60),s=total%60;
 return m+':'+String(s).padStart(2,'0');
}
function render(){
 ui.time.textContent=formatTime(state.remaining);
 ui.correct.textContent=String(state.correct);ui.score.textContent=String(state.score);ui.streak.textContent=String(state.streak);
 ui.time.parentElement.classList.toggle('danger',state.remaining<=20000);
 const until=CLUE_MS-state.clueElapsed;
 const pct=Math.max(0,Math.min(1,until/CLUE_MS));
 ui.clueFill.style.transform='scaleX('+pct+')';
 const more=state.current&&state.clueIndex<state.current.clues.length;
 ui.nextClue.textContent=more?'다음 단서 '+Math.max(1,Math.ceil(until/1000))+'초':'모든 단서 공개';
}
let feedbackTimer=0;
function feedback(text,type){
 clearTimeout(feedbackTimer);ui.feedback.textContent=text;ui.feedback.className='feedback show '+(type||'');
 feedbackTimer=setTimeout(()=>ui.feedback.className='feedback',950);
}
function penalty(){
 state.remaining=Math.max(0,state.remaining-WRONG_PENALTY_MS);state.streak=0;
 feedback('아니에요! ⏱️ -3초','bad');
 if(state.remaining<=0)finish();
}
function guess(value){
 if(!state.running||state.paused||state.locked)return;
 const clean=norm(value);
 if(state.mode==='hard'&&!VALID_NAMES.has(clean)){
   ui.typingHelp.textContent='동물 이름을 다시 확인해 보세요. 이 입력은 시간 벌점을 받지 않아요.';
   ui.typingHelp.classList.add('warn');return;
 }
 if(!sameAnswer(state.current,value)){penalty();if(state.mode==='hard'){ui.input.select()}return}
 state.locked=true;
 const used=Math.max(1,state.clueIndex);
 const base=SCORE_BY_CLUE[Math.min(used-1,SCORE_BY_CLUE.length-1)]||100;
 state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak);
 const bonus=Math.min(250,(state.streak-1)*25);
 const gained=base+bonus;state.score+=gained;state.correct++;
 feedback('정답! '+state.current.emoji+' '+state.current.name+'  +'+gained,'good');
 try{window.KidscadeGame&&KidscadeGame.sound('correct')}catch(e){}
 setTimeout(()=>{if(state.running)nextAnimal()},430);
}
function tick(ts){
 if(!state.running)return;
 if(!state.lastTs)state.lastTs=ts;
 const delta=Math.min(100,Math.max(0,ts-state.lastTs));state.lastTs=ts;
 if(!state.paused){
   state.remaining-=delta;state.clueElapsed+=delta;
   if(state.clueElapsed>=CLUE_MS&&state.current&&state.clueIndex<state.current.clues.length){
     state.clueElapsed-=CLUE_MS;revealClue();
   }else if(state.clueElapsed>=CLUE_MS){state.clueElapsed=CLUE_MS}
   render();
   if(state.remaining<=0){finish();return}
 }
 state.raf=requestAnimationFrame(tick);
}
function start(mode){
 state={mode:mode,running:true,paused:false,remaining:ROUND_MS,clueElapsed:0,clueIndex:0,current:null,deck:[],correct:0,score:0,streak:0,bestStreak:0,lastTs:performance.now(),raf:0,locked:false};
 ui.menu.classList.add('hidden');ui.result.classList.add('hidden');ui.game.classList.remove('hidden');
 ui.modeBadge.textContent=mode==='easy'?'쉬움 · 후보 터치':'어려움 · 직접 입력';
 ui.modeBadge.style.background=mode==='easy'?'#dff5e7':'#dfeeff';
 ui.easyAnswer.classList.toggle('hidden',mode!=='easy');ui.hardAnswer.classList.toggle('hidden',mode!=='hard');
 refillDeck();nextAnimal();render();
 try{window.KidscadeGame&&KidscadeGame.start({mode:mode})}catch(e){}
 state.raf=requestAnimationFrame(tick);
}
function records(){
 try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch(e){return{}}
}
function saveRecord(){
 const r=records(),old=r[state.mode]||{score:0,correct:0};
 r[state.mode]={score:Math.max(old.score||0,state.score),correct:Math.max(old.correct||0,state.correct)};
 try{localStorage.setItem(STORAGE,JSON.stringify(r))}catch(e){}
 return r[state.mode];
}
function finish(){
 if(!state.running)return;
 state.running=false;cancelAnimationFrame(state.raf);state.remaining=0;render();
 const best=saveRecord();
 ui.game.classList.add('hidden');ui.result.classList.remove('hidden');
 ui.finalCorrect.textContent=String(state.correct);ui.finalScore.textContent=String(state.score);ui.finalStreak.textContent=String(state.bestStreak);
 ui.resultAnimal.textContent=state.correct>=12?'🦉':state.correct>=8?'🦊':'🐘';
 ui.resultTitle.textContent=state.correct>=12?'동물 박사!':state.correct>=8?'매의 눈 탐정!':'동물 탐정!';
 ui.resultSummary.textContent=(state.mode==='easy'?'쉬움':'어려움')+'에서 '+state.correct+'마리를 맞혔어요. 단서를 덜 보고 맞힐수록 점수가 커집니다.';
 ui.bestText.textContent='이 난이도 최고 기록: '+best.correct+'마리 · '+best.score+'점';
 try{window.KidscadeGame&&KidscadeGame.gameOver({score:state.score,mode:state.mode,correct:state.correct})}catch(e){}
}
function backMenu(){
 state.running=false;cancelAnimationFrame(state.raf);ui.result.classList.add('hidden');ui.game.classList.add('hidden');ui.menu.classList.remove('hidden');
}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode)));
ui.submit.addEventListener('click',()=>guess(ui.input.value));
ui.input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guess(ui.input.value)}});
$('#retry').addEventListener('click',()=>start(state.mode));
$('#backMenu').addEventListener('click',backMenu);

try{
 if(window.KidscadeGame&&KidscadeGame.registerPauseHandlers){
   KidscadeGame.registerPauseHandlers({
     pause:function(){state.paused=true;state.lastTs=performance.now()},
     resume:function(){state.paused=false;state.lastTs=performance.now()}
   });
 }
}catch(e){}

render();
})();