(()=>{
'use strict';

const A='../../assets/game/characters/people/kenney-platformer-characters/';
const ITEM='../../assets/game/2d/items/kenney-generic-items/colored/';
const sprites={
  player:A+'player/poses/player-stand.png',
  female:A+'female/poses/female-stand.png',
  adventurer:A+'adventurer/poses/adventurer-stand.png',
  soldier:A+'soldier/poses/soldier-stand.png',
  zombie:A+'zombie/poses/zombie-stand.png'
};
const itemIcons={bag:ITEM+'generic-item-color-102.png',resp:ITEM+'generic-item-color-094.png'};

const css=[
'.tools{grid-template-columns:repeat(3,minmax(0,1fr))!important}',
'.tool.new-tool{border-color:#5b6f74;background:#1f292b}',
'.tool .hotkey{color:#e4bf62}',
'.bag-panel{position:absolute;z-index:15;right:18px;top:80px;width:255px;background:#d8d0b8;color:#1e2428;border:7px solid #8a806d;padding:12px;box-shadow:8px 10px 25px #000a;display:none;transform:rotate(1deg)}',
'.bag-panel.open{display:block;animation:paperIn .18s ease-out}',
'.bag-panel h3{margin:0 0 8px;font-size:15px;border-bottom:2px solid #5f584b;padding-bottom:6px}',
'.bag-item{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px dashed #8f8571;font-size:12px}',
'.bag-item img{width:28px;height:28px;object-fit:contain}',
'.bag-item.danger{font-weight:900;color:#8b2525}',
'.permit-flags{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}',
'.permit-flag{font-size:9px;font-weight:900;border:1px solid #625d53;padding:3px 5px;background:#c9c0aa}',
'.permit-flag.warn{background:#d6b56e}',
'.case-tag{position:absolute;left:14px;top:44px;padding:4px 7px;background:#11171bdd;border:1px solid #65727d;color:#c7d1d8;font-size:10px;letter-spacing:.05em;z-index:4}',
'.city-bulletin{margin:0 12px 12px;background:#101418;border-left:4px solid #bca14b;padding:9px 10px;color:#b7c0c8;font-size:11px;line-height:1.45}',
'.city-bulletin b{color:#e3c969}',
'.meter.warn strong{color:#efca66}.meter.danger strong{color:#ef7777}',
'.result-chip.danger{border-color:#8c4141;background:#2b1717}.result-chip.warn{border-color:#8b6e36;background:#282216}',
'.review-results{margin-top:7px;border:1px solid #59646e;background:#161b20;color:#d7dde2;padding:6px 9px;font-size:11px;cursor:pointer}.review-results:hover{background:#222a31}',
'.test-review{position:absolute;z-index:18;left:18px;right:18px;bottom:178px;background:#10151aee;border:1px solid #66727d;padding:11px;box-shadow:0 10px 30px #000a;display:none}.test-review.open{display:block}.test-review h3{margin:0 0 8px;font-size:13px}.test-review-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.test-review-item{background:#20262c;border:1px solid #39434d;padding:8px;font-size:11px}.test-review-item b{display:block;color:#e5c96d;margin-bottom:2px}.test-review-empty{color:#89949e;font-size:11px}',
'.status-msg.big{font-size:17px;padding:15px 20px}',
'.summary-cards{grid-template-columns:repeat(4,1fr)}',
'.report td:last-child{min-width:230px}',
'.ending{background:#dcd5be;color:#1c2226;padding:16px;margin:14px 0;border-left:6px solid #b89b37}',
'.ending h3{margin:0 0 7px}',
'@media(max-width:680px){.tools{grid-template-columns:repeat(2,minmax(0,1fr))!important}.desk{height:300px!important}.booth{min-height:710px!important}.bag-panel{left:10px;right:10px;width:auto;top:70px}.summary-cards{grid-template-columns:repeat(2,1fr)}}'
].join('\n');
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

function p(name,age,district,job,sprite,temp,cough,uv,blood,opt){
  opt=opt||{};
  return Object.assign({name:name,age:age,district:district,job:job,sprite:sprite,temp:temp,cough:!!cough,uv:!!uv,blood:!!blood,resp:false,forged:false,docSprite:null,bagRequired:false,bioSample:false,bloodRequired:false,redEyes:false,infected:false,bagItems:['개인 소지품','작업 장갑'],dialogue:'검사 부탁드립니다.'},opt);
}

const weeks=[
 {week:1,title:'초기 감염 기준',rev:'01',newTool:'체온계',bloodKits:0,time:46,
  rules:['모든 시민은 체온을 측정한다.','38.0℃ 이상 고열과 지속 기침이 함께 확인되면 격리한다.','발열 또는 기침 중 하나만 있는 경우 통과시킨다.'],
  memo:'첫 주입니다. 눈으로 아파 보인다는 이유만으로 격리하지 마십시오.',
  citizens:[
   p('김도윤',31,'A-2','정비사','player',36.7,false,false,false,{dialogue:'아침부터 줄이 길군요.'}),
   p('박유진',27,'C-1','서점원','female',38.6,true,false,false,{infected:true,redEyes:true,dialogue:'콜록… 어젯밤부터 몸이 으슬으슬해요.'}),
   p('오현수',44,'B-4','배관공','adventurer',38.4,false,false,false,{dialogue:'열은 좀 나지만 기침은 안 합니다.'}),
   p('서하린',22,'A-5','학생','female',37.2,true,false,false,{dialogue:'콜록… 먼지 많은 창고에서 일했어요.'}),
   p('장민재',36,'C-3','운송기사','soldier',39.1,true,false,false,{infected:true,redEyes:true,dialogue:'콜록! 빨리 끝내 주시죠.'}),
   p('윤서아',52,'B-1','조리사','adventurer',36.9,false,false,false,{dialogue:'검사 끝나면 바로 출근해야 해요.'})
  ]},
 {week:2,title:'형광성 피부 반응',rev:'02',newTool:'UV 검사기',bloodKits:0,time:55,
  rules:['모든 시민에게 체온 및 UV 검사를 실시한다.','고열 + 기침 복합 기준은 유지한다.','UV 조사에서 청록색 형광 반점이 확인되면 즉시 격리한다.'],
  memo:'신규 B형 변이는 피부 아래에 형광성 병변을 만듭니다. 일반 얼룩은 빛나지 않습니다.',
  citizens:[
   p('이주원',29,'A-4','우편원','player',36.6,false,false,false,{}),
   p('한예린',34,'B-2','교사','female',36.8,false,true,false,{infected:true,dialogue:'피부가 조금 간지럽긴 해요.'}),
   p('강태오',41,'C-5','용접공','adventurer',38.5,false,false,false,{dialogue:'작업장 열기 때문에 그런가 봅니다.'}),
   p('최은비',25,'A-1','디자이너','female',37.0,true,false,false,{dialogue:'콜록… 감기약은 먹었습니다.'}),
   p('문지후',38,'C-2','경비원','soldier',38.8,true,false,false,{infected:true,dialogue:'콜록! 몸이 계속 뜨겁습니다.'}),
   p('정하나',46,'B-6','화훼사','adventurer',37.3,true,true,false,{infected:true,dialogue:'꽃가루 때문인지 자꾸 기침이…'}),
   p('배시우',33,'A-7','회계사','player',36.5,false,false,false,{})
  ]},
 {week:3,title:'무증상 변이와 특별구역',rev:'03',newTool:'혈액 검사',bloodKits:5,time:62,
  rules:['체온과 UV 검사는 계속 실시한다.','D-7 거주자는 증상과 무관하게 혈액검사가 의무다. 혈액 양성이면 격리한다.','D-7 외 시민의 단독 UV 반응은 즉시 격리하지 말고 추가검사로 보낸다.','고열 + 기침이 함께 있으면 즉시 격리한다.'],
  memo:'K형 무증상 사례가 보고되었습니다. 혈액 키트는 제한되어 있습니다.',
  citizens:[
   p('남지안',26,'D-7','연구보조','female',36.6,false,false,true,{infected:true,dialogue:'전 아무 증상도 없는데요.'}),
   p('고민준',48,'B-5','목수','adventurer',36.9,false,true,false,{dialogue:'팔에 뭔가 난 것 같긴 합니다.'}),
   p('신유나',39,'C-4','간호조무사','female',39.0,true,false,false,{infected:true,dialogue:'콜록… 몸이 많이 뜨겁네요.'}),
   p('류정우',30,'D-7','택배기사','player',36.8,false,false,false,{dialogue:'D-7이라고 다 감염자는 아니잖아요.'}),
   p('임소민',21,'A-3','학생','female',38.2,false,false,false,{}),
   p('황도현',55,'D-7','시설관리','soldier',37.1,true,false,true,{infected:true,dialogue:'콜록… 그냥 목이 칼칼한 겁니다.'}),
   p('조아라',43,'B-3','약사','adventurer',36.7,false,true,false,{}),
   p('차시온',35,'D-7','공무원','player',36.5,false,false,false,{})
  ]},
 {week:4,title:'위조 통행증 단속',rev:'04',newTool:'신원 대조',bloodKits:5,time:68,
  rules:['모든 시민의 통행증 사진과 실제 얼굴을 대조한다. 불일치하면 추가검사로 보낸다.','D-7 거주자는 혈액검사 의무를 유지한다.','고열 + 기침은 격리, D-7 외 단독 UV 반응은 추가검사다.','감염 격리 기준과 신원 이상이 동시에 있으면 감염 격리를 우선한다.'],
  memo:'봉쇄구역 이탈을 위해 타인의 통행증을 사용하는 사례가 발견되었습니다.',
  citizens:[
   p('유채원',28,'A-2','사서','female',36.8,false,false,false,{forged:true,docSprite:'player',dialogue:'사진이 좀 옛날 거예요.'}),
   p('권태민',46,'D-7','전기기사','soldier',36.9,false,false,true,{infected:true}),
   p('백서윤',32,'B-4','연구원','female',36.7,false,true,false,{}),
   p('송지호',37,'C-2','배달기사','player',38.7,true,false,false,{infected:true}),
   p('이나경',24,'A-6','미용사','female',36.6,false,false,false,{}),
   p('도윤호',51,'D-7','창고관리','adventurer',36.7,false,false,false,{forged:true,docSprite:'soldier'}),
   p('김하람',42,'D-7','간호사','female',36.8,false,false,false,{}),
   p('문태양',34,'C-6','목수','adventurer',38.1,false,false,false,{})
  ]},
 {week:5,title:'오염 물품 반입',rev:'05',newTool:'소지품 검사',bloodKits:5,time:76,
  rules:['통행증에 노란 「소지품 검사」 표식이 있는 시민은 가방 검사가 의무다.','봉인되지 않은 생체시료 또는 오염 샘플이 발견되면 즉시 격리한다.','신원 불일치는 추가검사, D-7 혈액 양성은 격리한다.','고열 + 기침은 격리하고, D-7 외 단독 UV 반응은 추가검사한다.'],
  memo:'감염보다 물품 운반이 더 위험할 수 있습니다. 노란 표식을 놓치지 마십시오.',
  citizens:[
   p('서민준',40,'B-1','실험기자재원','player',36.8,false,false,false,{bagRequired:true,bioSample:true,infected:true,bagItems:['작업 장갑','깨진 샘플병','봉인 안 된 생체시료'],dialogue:'회사 물건뿐입니다.'}),
   p('임하은',29,'A-5','교사','female',36.9,false,false,false,{bagRequired:true,bagItems:['도시락','교재','우산']}),
   p('노준혁',35,'D-7','정비공','adventurer',36.7,false,false,true,{infected:true}),
   p('정유리',33,'C-4','디자이너','female',36.6,false,false,false,{forged:true,docSprite:'adventurer'}),
   p('박시현',47,'B-6','화훼사','soldier',37.0,false,true,false,{}),
   p('최도겸',26,'A-1','학생','player',39.0,true,false,false,{infected:true}),
   p('오세린',38,'D-7','조리사','female',36.8,false,false,false,{bagRequired:true,bagItems:['앞치마','식재료','보온병']}),
   p('한도윤',50,'C-3','운송기사','adventurer',36.5,false,false,false,{bagRequired:true,bioSample:true,infected:true,bagItems:['배송 전표','냉각팩','미신고 조직 샘플']})
  ]},
 {week:6,title:'호흡기 변이',rev:'06',newTool:'호흡 검사',bloodKits:5,time:82,
  rules:['기침 증상이 있는 시민은 반드시 호흡 검사를 실시한다.','기침 + 비정상 호흡이 확인되면 체온과 무관하게 격리한다.','고열 + 기침이라도 호흡이 정상이면 즉시 격리하지 말고 추가검사로 보낸다.','D-7 혈액검사, 신원 대조, 표식 시민의 소지품 검사는 계속 유지한다.'],
  memo:'새 변이는 열보다 호흡 기능을 먼저 떨어뜨립니다. 기존 고열 중심 규칙이 변경되었습니다.',
  citizens:[
   p('배지훈',30,'A-4','택배기사','player',37.1,true,false,false,{resp:true,infected:true,dialogue:'콜록… 숨이 조금 찹니다.'}),
   p('김예나',27,'B-2','교사','female',38.5,true,false,false,{resp:false,dialogue:'열은 나는데 숨쉬는 건 괜찮아요.'}),
   p('전우진',49,'D-7','시설관리','soldier',36.7,false,false,true,{infected:true}),
   p('안서현',31,'C-1','약사','female',36.8,true,false,false,{resp:false}),
   p('류민석',43,'A-7','목수','adventurer',36.9,false,true,false,{}),
   p('차윤아',36,'B-5','연구보조','female',36.6,false,false,false,{bagRequired:true,bioSample:true,infected:true,bagItems:['메모장','시험관','봉인 안 된 배양 샘플']}),
   p('신태경',41,'C-6','경비원','soldier',37.3,true,false,false,{resp:true,infected:true}),
   p('마지수',25,'A-2','학생','female',36.5,false,false,false,{forged:true,docSprite:'player'})
  ]},
 {week:7,title:'교차반응 경보',rev:'07',newTool:'선별 혈액검사',bloodKits:6,time:84,
  rules:['D-7 및 통행증의 「R-혈액」 표식 시민은 혈액검사가 의무다.','D-7 외 시민의 혈액 양성만으로는 격리하지 않고 추가검사로 보낸다.','기침 + 비정상 호흡은 즉시 격리한다.','단독 UV 반응, 신원 불일치, 혈액 단독 양성은 추가검사다.','오염 생체시료 소지는 즉시 격리한다.'],
  memo:'일부 정상인에게 항원 교차반응이 확인됐습니다. 혈액 양성 하나만 보고 격리하지 마십시오.',
  citizens:[
   p('김로아',28,'B-3','간호조무사','female',36.8,false,false,true,{bloodRequired:true,infected:false,dialogue:'예전에 백신 부작용이 있었습니다.'}),
   p('윤재호',45,'D-7','배관공','adventurer',36.7,false,false,true,{infected:true}),
   p('박하준',39,'C-2','운송기사','player',36.9,true,false,false,{resp:true,infected:true}),
   p('최수빈',34,'A-6','회계사','female',36.5,false,true,false,{}),
   p('오승민',52,'B-4','창고관리','soldier',36.8,false,false,true,{bloodRequired:true,infected:false}),
   p('서이안',23,'A-1','학생','female',36.6,false,false,false,{forged:true,docSprite:'adventurer'}),
   p('강민호',37,'C-5','연구원','adventurer',36.8,false,false,false,{bagRequired:true,bioSample:true,infected:true,bagItems:['노트북','냉각팩','미신고 혈액 샘플']}),
   p('한가은',42,'B-7','교사','female',37.2,true,false,false,{resp:false})
  ]},
 {week:8,title:'최종 변이 · 복합 판정',rev:'08',newTool:'전 검사 체계',bloodKits:6,time:90,
  rules:['모든 시민은 신원 대조와 UV 검사를 받는다. 표식 검사는 빠짐없이 실시한다.','D-7 혈액 양성 또는 기침 + 비정상 호흡은 즉시 격리한다.','D-7 외 시민은 혈액 양성과 UV/호흡 이상이 함께 있을 때 격리한다. 혈액 단독 양성은 추가검사다.','고열 + 기침만 있는 경우는 계절성 감염 가능성 때문에 추가검사로 보낸다.','신원 불일치·단독 UV 반응은 추가검사, 오염 생체시료는 즉시 격리한다.'],
  memo:'마지막 주입니다. 초기에 배운 규칙 중 일부는 더 이상 유효하지 않습니다. 현재 지침만 따르십시오.',
  citizens:[
   p('정세아',30,'D-7','연구원','female',36.7,false,false,true,{infected:true}),
   p('김현우',44,'B-2','정비사','adventurer',38.7,true,false,false,{resp:false,dialogue:'콜록… 열은 나지만 숨은 괜찮습니다.'}),
   p('이채린',27,'A-4','교사','female',36.8,false,true,true,{bloodRequired:true,infected:true}),
   p('남도현',36,'C-3','운송기사','player',36.9,true,false,true,{bloodRequired:true,resp:true,infected:true}),
   p('권서영',49,'B-5','조리사','female',36.6,false,false,true,{bloodRequired:true,infected:false}),
   p('문준서',32,'A-7','기술자','soldier',36.8,false,false,false,{forged:true,docSprite:'player'}),
   p('백지아',25,'C-1','학생','female',36.5,false,false,false,{bagRequired:true,bioSample:true,infected:true,bagItems:['책','보온병','봉인 안 된 조직 샘플']}),
   p('오태성',53,'B-6','목수','adventurer',36.7,false,false,false,{}),
   p('신나연',35,'A-3','약사','female',37.0,true,true,false,{resp:false})
  ]}
];

function $id(id){return document.getElementById(id)}
const booth=$id('booth'),citizen=$id('citizen'),img=$id('citizenImg'),speech=$id('speech');
const toolsBox=document.querySelector('.tools');
function addTool(id,label,sub,key,icon){
  const b=document.createElement('button');b.className='tool new-tool';b.id=id;b.type='button';
  b.innerHTML='<img src="'+icon+'" alt=""><span><b>'+label+'</b><small>'+sub+' · <span class="hotkey">'+key+'</span></small></span>';
  toolsBox.appendChild(b);return b;
}
const respBtn=addTool('toolResp','호흡 검사','호흡 지수','R',itemIcons.resp);
const bagBtn=addTool('toolBag','소지품 검사','가방 개봉','G',itemIcons.bag);
const buttons={id:$id('toolId'),temp:$id('toolTemp'),uv:$id('toolUv'),blood:$id('toolBlood'),resp:respBtn,bag:bagBtn};

const bagPanel=document.createElement('section');bagPanel.className='bag-panel';bagPanel.id='bagPanel';bagPanel.setAttribute('aria-label','소지품 검사 결과');booth.appendChild(bagPanel);
const reviewPanel=document.createElement('section');reviewPanel.className='test-review';reviewPanel.id='testReview';reviewPanel.setAttribute('aria-label','검사 기록 다시보기');booth.appendChild(reviewPanel);
const reviewBtn=document.createElement('button');reviewBtn.type='button';reviewBtn.className='review-results';reviewBtn.textContent='검사 기록 다시보기 · V';$id('testStrip').insertAdjacentElement('afterend',reviewBtn);
const tag=document.createElement('div');tag.className='case-tag';tag.id='caseTag';booth.appendChild(tag);
const bulletin=document.createElement('div');bulletin.className='city-bulletin';bulletin.id='cityBulletin';document.querySelector('.rules-panel .rulebook').insertBefore(bulletin,document.querySelector('.rules-panel .paper'));
const meters=document.querySelector('.meters');meters.insertAdjacentHTML('beforeend','<div class="meter" id="timeMeter">교대 여유 <strong id="shiftTime">0</strong></div><div class="meter">연속 정확 <strong id="streak">0</strong></div>');
document.querySelector('.footer-note').textContent='확장판 v2 · 8주 캠페인 · Kenney CC0 무료 에셋 기반';

const introText=document.querySelector('#introModal .briefing > div');
if(introText)introText.innerHTML='<h1>격리구역 17 : 8주 검역 작전</h1><p>매주 변하는 감염 기준을 읽고 시민을 판정하세요. 이제 <b>위조 통행증, 소지품 검사, 호흡 검사, 제한된 혈액 키트</b>까지 등장합니다.</p><p>규정은 누적되기도 하고 폐기되기도 합니다. 어제의 정답이 오늘은 오판이 될 수 있습니다.</p><div class="brief-rules"><b>조작</b><br>I 신분증 · T 체온 · U UV · B 혈액 · R 호흡 · G 소지품<br>판정은 1 통과 · 2 추가검사 · 3 격리</div><button class="primary" id="startBtnV2" type="button">8주 근무 시작</button>';

let state={weekIndex:0,caseIndex:0,trust:82,infection:9,score:0,bloodKits:0,records:[],tests:{},locked:false,started:false,time:0,streak:0,bestStreak:0,totalCorrect:0,totalCases:0,emergencyUsed:false};
function currentWeek(){return weeks[state.weekIndex]}function current(){return currentWeek().citizens[state.caseIndex]}function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function esc(s){return String(s).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
function tone(freq,dur,type,gain){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;window.__q17ac=window.__q17ac||new AC();const ac=window.__q17ac,o=ac.createOscillator(),g=ac.createGain();o.type=type||'square';o.frequency.value=freq||440;g.gain.value=gain||.03;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+(dur||.06));o.stop(ac.currentTime+(dur||.06))}catch(e){}}
function clickSound(){tone(540,.035,'square',.025)}function errorSound(){tone(150,.13,'sawtooth',.035)}
function showMsg(text,ms,big){const m=$id('statusMsg');m.textContent=text;m.classList.add('show');m.classList.toggle('big',!!big);clearTimeout(showMsg.t);showMsg.t=setTimeout(function(){m.classList.remove('show','big')},ms||1200)}
function spendTime(n){state.time-=n;if(state.time<0){state.score=Math.max(0,state.score-n*8);showMsg('교대시간 초과 · 점수 감소',900)}renderHeader()}
function cityHeadline(){if(state.infection>=28)return'도시 속보: <b>확산 경보</b> · 통제선 안쪽 신규 감염 급증';if(state.trust<45)return'시민 방송: <b>과잉 검역 논란</b> · 판정 기준 공개 요구';if(state.infection<=6&&state.trust>=78)return'도시 속보: <b>안정세</b> · 검역 정확도 상승';return'상황실: 감염률과 시민 신뢰를 동시에 관리하십시오.'}
function renderHeader(){$id('weekBadge').textContent=(state.weekIndex+1)+'주차';$id('trust').textContent=state.trust;$id('infection').textContent=state.infection+'%';$id('score').textContent=state.score;$id('shiftTime').textContent=state.time;$id('streak').textContent=state.streak;const tm=$id('timeMeter');tm.classList.toggle('warn',state.time<=10&&state.time>=0);tm.classList.toggle('danger',state.time<0);$id('caseCounter').textContent=(state.caseIndex+1)+' / '+currentWeek().citizens.length;bulletin.innerHTML=cityHeadline()}
function renderRules(){const w=currentWeek();$id('ruleTitle').textContent=w.title;$id('paper').dataset.rev=w.rev;$id('rules').innerHTML=w.rules.map(function(r,i){return '<li'+(i===0&&state.weekIndex>0?' class="new"':'')+'>'+esc(r)+'</li>'}).join('');$id('memo').textContent=w.memo}
function renderQueue(){const list=currentWeek().citizens.slice(state.caseIndex+1,state.caseIndex+4);$id('queue').innerHTML=list.length?list.map(function(pp,i){return '<div class="queue-person"><img src="'+sprites[pp.sprite]+'" alt=""><div><b>대기 '+(i+1)+'</b><div class="qname">신원 확인 전</div></div></div>'}).join('')+'<div class="notice-small">대기자의 검사 정보는 미리 확인할 수 없습니다.</div>':'<div class="notice-small">마지막 검사 대상입니다.</div>'}
function setToolAvailability(){const wi=state.weekIndex;buttons.id.disabled=wi<3;buttons.temp.disabled=false;buttons.uv.disabled=wi<1;buttons.blood.disabled=wi<2;buttons.bag.disabled=wi<4;buttons.resp.disabled=wi<5;$id('kitCount').textContent=state.bloodKits}
function resetTests(){state.tests={id:false,temp:false,uv:false,blood:false,resp:false,bag:false};Object.keys(buttons).forEach(function(k){buttons[k].classList.remove('done')});$id('idCard').classList.remove('open');bagPanel.classList.remove('open');reviewPanel.classList.remove('open');booth.classList.remove('uvmode');$id('testStrip').innerHTML='<span class="result-chip">검사 결과가 여기에 기록됩니다.</span>'}
function addChip(label,value,cls){const strip=$id('testStrip');if(strip.children.length===1&&strip.textContent.indexOf('검사 결과')>=0)strip.innerHTML='';const s=document.createElement('span');s.className='result-chip '+(cls||'');s.innerHTML='<strong>'+esc(label)+'</strong> '+esc(value);strip.appendChild(s)}
function testReviewItems(){const pp=current(),items=[];if(state.tests.id)items.push(['신원',pp.forged?'사진 불일치':'통행증 확인']);if(state.tests.temp)items.push(['체온',pp.temp.toFixed(1)+'℃']);if(state.tests.uv)items.push(['UV',pp.uv?'형광 반응 있음':'반응 없음']);if(state.tests.blood)items.push(['혈액',pp.blood?'양성 (+)':'음성 (−)']);if(state.tests.resp)items.push(['호흡',pp.resp?'비정상 · 위험':'정상']);if(state.tests.bag)items.push(['소지품',pp.bioSample?'오염 의심 물품':'이상 없음']);return items}
function toggleReview(){clickSound();const items=testReviewItems();reviewPanel.innerHTML='<h3>'+esc(current().name)+' · 검사 기록</h3>'+(items.length?'<div class="test-review-grid">'+items.map(function(x){return '<div class="test-review-item"><b>'+esc(x[0])+'</b>'+esc(x[1])+'</div>'}).join('')+'</div>':'<div class="test-review-empty">아직 실시한 검사가 없습니다.</div>');reviewPanel.classList.toggle('open')}
function flagsFor(pp){const arr=[];if(pp.bagRequired)arr.push('<span class="permit-flag warn">소지품 검사</span>');if(pp.bloodRequired)arr.push('<span class="permit-flag warn">R-혈액</span>');if(pp.district==='D-7')arr.push('<span class="permit-flag warn">D-7 특별관리</span>');return arr.join('')}
function loadCase(){state.locked=false;resetTests();const pp=current();img.src=sprites[pp.sprite];$id('idPhoto').src=sprites[pp.docSprite||pp.sprite];speech.textContent=pp.dialogue;citizen.classList.toggle('coughing',pp.cough);citizen.classList.toggle('uv-positive',pp.uv);citizen.classList.toggle('red-eyes',pp.redEyes||(pp.infected&&pp.temp>=38.5));img.style.filter='drop-shadow(0 13px 10px #0009) hue-rotate('+((state.caseIndex%5-2)*6)+'deg)';$id('idName').textContent=pp.name;$id('idAge').textContent=pp.age+'세';$id('idDistrict').textContent=pp.district+' 구역';$id('idJob').textContent=pp.job;$id('permit').textContent='#'+String(170000+state.weekIndex*100+state.caseIndex);$id('idZone').innerHTML=(pp.district==='D-7'?'특별관리구역 D-7':'일반 통행 구역 '+pp.district)+'<div class="permit-flags">'+flagsFor(pp)+'</div>';tag.textContent=state.weekIndex<3?'기본 검역':(pp.district==='D-7'?'특별관리 대상':'일반 검역 대상');renderHeader();renderQueue();setToolAvailability()}
function inspectId(){if(state.locked||buttons.id.disabled)return;clickSound();if(!state.tests.id){state.tests.id=true;buttons.id.classList.add('done');spendTime(1);addChip('신원','통행증 확인')}$id('idCard').classList.toggle('open')}
function inspectTemp(){if(state.locked)return;clickSound();if(state.tests.temp){showMsg('기록 확인 · 체온 '+current().temp.toFixed(1)+'℃',1400,true);return}state.tests.temp=true;buttons.temp.classList.add('done');spendTime(2);const v=current().temp.toFixed(1)+'℃';addChip('체온',v,current().temp>=38?'warn':'');showMsg('체온 '+v,850)}
function inspectUv(){if(state.locked||buttons.uv.disabled)return;clickSound();if(!state.tests.uv){state.tests.uv=true;buttons.uv.classList.add('done');spendTime(3);addChip('UV',current().uv?'형광 반응 있음':'반응 없음',current().uv?'warn':'')}booth.classList.toggle('uvmode');showMsg(current().uv?'청록색 형광 반응 발견':'형광 반응 없음',950)}
function emergencyKits(){if(state.emergencyUsed)return false;state.emergencyUsed=true;state.bloodKits+=2;state.score=Math.max(0,state.score-150);state.trust=clamp(state.trust-2,0,100);showMsg('비상 혈액키트 2개 지급 · 점수/신뢰 감소',1800,true);setToolAvailability();renderHeader();return true}
function inspectBlood(){if(state.locked||buttons.blood.disabled)return;clickSound();if(state.tests.blood){showMsg('기록 확인 · 혈액 '+(current().blood?'양성 (+)':'음성 (−)'),1400,true);return}if(state.bloodKits<=0){if(!emergencyKits()){errorSound();showMsg('혈액 키트가 모두 소진되었습니다.',1400);return}}state.tests.blood=true;state.bloodKits--;buttons.blood.classList.add('done');spendTime(4);setToolAvailability();showMsg('혈액 분석 중…',600);setTimeout(function(){addChip('혈액',current().blood?'양성 (+)':'음성 (−)',current().blood?'warn':'');showMsg(current().blood?'항원 양성':'항원 음성',900);tone(current().blood?210:700,.09,'square',.03)},600)}
function inspectResp(){if(state.locked||buttons.resp.disabled)return;clickSound();if(state.tests.resp){showMsg('기록 확인 · 호흡 '+(current().resp?'비정상 · 위험':'정상'),1400,true);return}state.tests.resp=true;buttons.resp.classList.add('done');spendTime(3);const bad=current().resp;addChip('호흡',bad?'비정상 · 위험':'정상',bad?'danger':'');showMsg(bad?'호흡 지수 비정상':'호흡 지수 정상',950)}
function inspectBag(){if(state.locked||buttons.bag.disabled)return;clickSound();if(!state.tests.bag){state.tests.bag=true;buttons.bag.classList.add('done');spendTime(3);addChip('소지품',current().bioSample?'오염 의심 물품':'이상 없음',current().bioSample?'danger':'')}const pp=current();bagPanel.innerHTML='<h3>소지품 검사 기록</h3>'+pp.bagItems.map(function(it){const danger=/샘플|시료|조직|배양|혈액/.test(it);return '<div class="bag-item '+(danger?'danger':'')+'"><img src="'+itemIcons.bag+'" alt=""><span>'+esc(it)+'</span></div>'}).join('');bagPanel.classList.toggle('open')}
function outcome(pp,wi){const fever=pp.temp>=38;if(wi===0)return fever&&pp.cough?'quarantine':'pass';if(wi===1)return (fever&&pp.cough)||pp.uv?'quarantine':'pass';if(wi===2){if(fever&&pp.cough)return'quarantine';if(pp.district==='D-7')return pp.blood?'quarantine':'pass';if(pp.uv)return'retest';return'pass'}if(wi===3){if(fever&&pp.cough)return'quarantine';if(pp.district==='D-7'&&pp.blood)return'quarantine';if(pp.forged)return'retest';if(pp.uv)return'retest';return'pass'}if(wi===4){if(pp.bioSample)return'quarantine';if(fever&&pp.cough)return'quarantine';if(pp.district==='D-7'&&pp.blood)return'quarantine';if(pp.forged||pp.uv)return'retest';return'pass'}if(wi===5){if(pp.bioSample)return'quarantine';if(pp.district==='D-7'&&pp.blood)return'quarantine';if(pp.cough&&pp.resp)return'quarantine';if(pp.forged||pp.uv||(fever&&pp.cough))return'retest';return'pass'}if(wi===6){if(pp.bioSample)return'quarantine';if(pp.district==='D-7'&&pp.blood)return'quarantine';if(pp.cough&&pp.resp)return'quarantine';if(pp.forged||pp.uv||pp.blood)return'retest';return'pass'}if(pp.bioSample)return'quarantine';if(pp.district==='D-7'&&pp.blood)return'quarantine';if(pp.cough&&pp.resp)return'quarantine';if(pp.blood&&(pp.resp||pp.uv))return'quarantine';if(pp.forged||pp.uv||pp.blood||(fever&&pp.cough))return'retest';return'pass'}
function reasonFor(pp,wi){const o=outcome(pp,wi),fever=pp.temp>=38;if(o==='quarantine'){if(pp.bioSample)return'오염 생체시료 반입 규정에 따라 격리';if(pp.district==='D-7'&&pp.blood)return'D-7 의무 혈액검사 양성';if(wi>=5&&pp.cough&&pp.resp)return'기침 + 비정상 호흡 복합 기준';if(wi===7&&pp.blood&&(pp.resp||pp.uv))return'혈액 양성 + 추가 이상 소견 복합 기준';if(fever&&pp.cough)return'고열 + 지속 기침 복합 기준';if(pp.uv)return'UV 형광 반응 격리 기준';return'현행 즉시 격리 기준 충족'}if(o==='retest'){if(pp.forged)return'통행증 사진과 실제 얼굴 불일치';if(wi>=6&&pp.blood&&pp.district!=='D-7')return'D-7 외 혈액 단독 양성은 교차반응 가능';if(pp.uv)return'D-7 외 단독 UV 반응은 추가검사 대상';if(wi>=5&&fever&&pp.cough&&!pp.resp)return'고열·기침은 있으나 호흡 정상';return'단일 이상 소견으로 확정할 수 없음'}if(pp.district==='D-7')return'D-7 의무 혈액검사 음성 및 다른 격리 기준 없음';return'현행 격리·추가검사 기준에 해당하지 않음'}
function requiredChecks(pp,wi){const req=[];if(wi<=5)req.push('temp');if(wi>=1)req.push('uv');if(wi>=3)req.push('id');if(wi>=2&&pp.district==='D-7')req.push('blood');if(wi>=6&&pp.bloodRequired)req.push('blood');if(wi>=4&&pp.bagRequired)req.push('bag');if(wi>=5&&pp.cough)req.push('resp');return Array.from(new Set(req))}
function validateDecision(){const req=requiredChecks(current(),state.weekIndex),missing=req.filter(function(k){return!state.tests[k]});if(!missing.length)return null;const names={id:'신분증 대조',temp:'체온',uv:'UV',blood:'혈액',resp:'호흡',bag:'소지품'};return'의무 검사 미완료: '+missing.map(function(k){return names[k]}).join(', ')}
function decisionName(a){return{pass:'통과',retest:'추가검사',quarantine:'격리'}[a]}
function stamp(action){const s=$id('stamp');s.textContent={pass:'통 과',retest:'추가검사',quarantine:'격 리'}[action];s.className='stamp '+action;void s.offsetWidth;s.classList.add('show');tone(action==='quarantine'?115:action==='retest'?220:360,.09,'square',.04)}
function decide(action){if(state.locked)return;const err=validateDecision();if(err){errorSound();showMsg(err,1800,true);return}state.locked=true;$id('idCard').classList.remove('open');bagPanel.classList.remove('open');booth.classList.remove('uvmode');spendTime(1);const pp=current(),correct=outcome(pp,state.weekIndex),ok=action===correct;const testCount=Object.keys(state.tests).filter(function(k){return state.tests[k]}).length;state.totalCases++;if(ok){state.totalCorrect++;state.streak++;state.bestStreak=Math.max(state.bestStreak,state.streak);let gain=120+Math.min(80,state.streak*8);if(testCount<=requiredChecks(pp,state.weekIndex).length+1)gain+=25;state.score+=gain;state.trust=clamp(state.trust+1,0,100);if(pp.infected&&action==='quarantine')state.infection=clamp(state.infection-1,0,99);tone(520,.05,'square',.025)}else{state.streak=0;state.score=Math.max(0,state.score-55);if(action==='pass'&&pp.infected){state.infection=clamp(state.infection+5,0,99);state.trust=clamp(state.trust-3,0,100)}else if(action==='quarantine'&&correct!=='quarantine'){state.trust=clamp(state.trust-8,0,100)}else{state.trust=clamp(state.trust-3,0,100);state.infection=clamp(state.infection+1,0,99)}errorSound()}state.records.push({name:pp.name,chosen:action,correct:correct,ok:ok,reason:reasonFor(pp,state.weekIndex),tests:testCount,infected:!!pp.infected,sprite:pp.sprite});renderHeader();stamp(action);const payload={name:pp.name,sprite:pp.sprite,infected:!!pp.infected,action:action,correct:correct,ok:ok,weekIndex:state.weekIndex,infection:state.infection,wrongQuarantine:action==='quarantine'&&correct!=='quarantine'};const handled=window.Q17Outbreak&&typeof window.Q17Outbreak.onDecision==='function'?window.Q17Outbreak.onDecision(payload,function(){nextCase()}):false;if(!handled)setTimeout(nextCase,650)}
function nextCase(){if(state.caseIndex+1<currentWeek().citizens.length){state.caseIndex++;loadCase()}else showReport()}
function reportHeadline(){if(state.infection>=25)return'도시 내 확산이 통제선을 압박하고 있습니다.';if(state.trust<50)return'시민 불신이 커져 검역소 앞 항의가 늘고 있습니다.';if(state.infection<=7&&state.trust>=75)return'정확한 검역 덕분에 도시가 안정세를 보입니다.';return'통제선은 유지되고 있지만 작은 오판이 다음 주 상황을 바꿀 수 있습니다.'}
function showReport(){const rows=state.records.map(function(r){return'<tr><td>'+esc(r.name)+'</td><td>'+decisionName(r.chosen)+'</td><td>'+decisionName(r.correct)+'</td><td class="'+(r.ok?'ok':'no')+'">'+(r.ok?'정확':'오판')+'</td><td>'+esc(r.reason)+'</td></tr>'}).join('');const okCount=state.records.filter(function(r){return r.ok}).length,total=state.records.length;const efficiency=Math.max(0,state.time)*3;state.score+=efficiency;$id('reportContent').innerHTML='<h2>'+(state.weekIndex+1)+'주차 검역 보고서</h2><p>'+esc(reportHeadline())+'</p><div class="summary-cards"><div class="sum"><b>'+okCount+'/'+total+'</b><small>정확 판정</small></div><div class="sum"><b>'+state.trust+'</b><small>시민 신뢰</small></div><div class="sum"><b>'+state.infection+'%</b><small>도시 감염률</small></div><div class="sum"><b>+'+efficiency+'</b><small>효율 보너스</small></div></div><table class="report"><thead><tr><th>시민</th><th>내 판정</th><th>정답</th><th>결과</th><th>판정 근거</th></tr></thead><tbody>'+rows+'</tbody></table>'+(state.weekIndex<weeks.length-1?'<button class="primary" id="continueBtn" type="button">다음 주 지침 받기</button>':finalText());$id('reportModal').classList.add('show');const b=$id('continueBtn');if(b)b.addEventListener('click',function(){clickSound();$id('reportModal').classList.remove('show');state.weekIndex++;state.caseIndex=0;state.records=[];prepareWeek();showBriefing()});saveBest()}
function endingData(){const accuracy=state.totalCases?Math.round(state.totalCorrect/state.totalCases*100):0;if(state.infection<=8&&state.trust>=72&&accuracy>=88)return['철벽과 신뢰','감염 확산을 막으면서도 시민의 협조를 유지했습니다. 제17검역소는 새로운 표준 검역소로 지정됩니다.'];if(state.infection<=8&&state.trust<55)return['통제는 성공, 신뢰는 붕괴','감염은 억제했지만 과잉 판정의 대가로 시민 신뢰가 무너졌습니다. 통제선은 남았지만 검역소 앞에는 긴 항의 행렬이 생깁니다.'];if(state.infection>=25&&state.trust>=65)return['친절했던 문','시민의 신뢰는 지켰지만 놓친 감염 사례가 누적되었습니다. 도시는 이제 검역소 안쪽에 새로운 통제선을 세웁니다.'];if(state.infection>=25&&state.trust<55)return['제17구역 폐쇄','감염과 불신이 동시에 임계점을 넘었습니다. 검역소는 폐쇄되고 전 구역 이동 금지령이 내려집니다.'];return['불안한 균형','완벽하진 않았지만 통제선은 유지되었습니다. 다음 검역관에게 당신의 기록과 개정된 지침서가 전달됩니다.']}
function saveBest(){try{const old=Number(localStorage.getItem('quarantine17BestV2')||0);if(state.score>old)localStorage.setItem('quarantine17BestV2',String(state.score))}catch(e){}}
function finalText(){const end=endingData(),accuracy=state.totalCases?Math.round(state.totalCorrect/state.totalCases*100):0;let best=state.score;try{best=Math.max(best,Number(localStorage.getItem('quarantine17BestV2')||0))}catch(e){}return'<div class="ending"><h3>엔딩 · '+esc(end[0])+'</h3>'+esc(end[1])+'</div><div class="brief-rules"><b>8주 작전 종료</b><br>정확도 '+accuracy+'% · 최고 연속 '+state.bestStreak+' · 최종 점수 '+state.score+'<br>시민 신뢰 '+state.trust+' · 도시 감염률 '+state.infection+'% · 개인 최고점 '+best+'</div><button class="primary" id="restartBtn" type="button">처음부터 다시</button>'}
function prepareWeek(){const w=currentWeek();state.bloodKits=w.bloodKits;state.time=w.time;state.emergencyUsed=false;renderRules();renderHeader();setToolAvailability()}
function showBriefing(){const w=currentWeek();let extra='';if(w.bloodKits)extra='<p>이번 주 기본 혈액 키트: <b>'+w.bloodKits+'개</b>. 잘못 소진하면 비상 보급을 받을 수 있지만 큰 페널티가 있습니다.</p>';$id('briefContent').innerHTML='<div class="briefing"><img src="'+ITEM+'generic-item-color-033.png" alt="규정집"><div><h2>'+w.week+'주차 · '+esc(w.title)+'</h2><p><b>'+esc(w.newTool)+'</b> 관련 지침이 적용됩니다. 이전 주와 달라진 규칙을 먼저 확인하세요.</p><div class="brief-rules"><ol>'+w.rules.map(function(r){return'<li>'+esc(r)+'</li>'}).join('')+'</ol></div>'+extra+'<p>이번 주 교대 여유: <b>'+w.time+'</b>. 검사를 많이 할수록 줄어들며 초과 근무는 점수를 깎습니다.</p><button class="primary" id="briefStart" type="button">검역 개시</button></div></div>';$id('briefModal').classList.add('show');$id('briefStart').addEventListener('click',function(){clickSound();$id('briefModal').classList.remove('show');loadCase()})}
function restart(){state={weekIndex:0,caseIndex:0,trust:82,infection:9,score:0,bloodKits:0,records:[],tests:{},locked:false,started:true,time:0,streak:0,bestStreak:0,totalCorrect:0,totalCases:0,emergencyUsed:false};if(window.Q17Outbreak&&window.Q17Outbreak.reset)window.Q17Outbreak.reset();$id('reportModal').classList.remove('show');prepareWeek();showBriefing()}

const start=$id('startBtnV2');if(start)start.addEventListener('click',function(){clickSound();$id('introModal').classList.remove('show');state.started=true;prepareWeek();showBriefing()});
buttons.id.addEventListener('click',inspectId);buttons.temp.addEventListener('click',inspectTemp);buttons.uv.addEventListener('click',inspectUv);buttons.blood.addEventListener('click',inspectBlood);buttons.resp.addEventListener('click',inspectResp);buttons.bag.addEventListener('click',inspectBag);reviewBtn.addEventListener('click',toggleReview);
document.querySelectorAll('.decide').forEach(function(b){b.addEventListener('click',function(){decide(b.dataset.action)})});
document.addEventListener('click',function(e){if(e.target&&e.target.id==='restartBtn')restart()});
document.addEventListener('keydown',function(e){if(!state.started||document.querySelector('.modal.show'))return;if(['INPUT','TEXTAREA'].indexOf(document.activeElement.tagName)>=0)return;const k=e.key.toLowerCase();if(k==='i')inspectId();else if(k==='t')inspectTemp();else if(k==='u')inspectUv();else if(k==='b')inspectBlood();else if(k==='r')inspectResp();else if(k==='g')inspectBag();else if(k==='v')toggleReview();else if(k==='1')decide('pass');else if(k==='2')decide('retest');else if(k==='3')decide('quarantine')});
window.Q17Bridge={
 getState:function(){return{weekIndex:state.weekIndex,caseIndex:state.caseIndex,trust:state.trust,infection:state.infection,score:state.score,totalCorrect:state.totalCorrect,totalCases:state.totalCases}},
 getCurrentCase:function(){const pp=current();return{name:pp.name,sprite:pp.sprite,infected:!!pp.infected,temp:pp.temp,cough:!!pp.cough,uv:!!pp.uv,blood:!!pp.blood,resp:!!pp.resp}},
 applyOutbreakResult:function(result){
  result=result||{};
  state.infection=clamp(state.infection+(result.infectionDelta||0),0,99);
  state.trust=clamp(state.trust+(result.trustDelta||0),0,100);
  state.score=Math.max(0,state.score+(result.scoreDelta||0));
  renderHeader();saveBest();
  if(result.gameOver){state.locked=true;state.started=false;}
 }
};
renderRules();renderHeader();setToolAvailability();
})();