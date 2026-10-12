/* Joseon life, 1392 onward. The 1392–1896 birth mode is fictional personal history.
 * Dated public events are separate from invented households, risks and outcomes.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeWorld9);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon=api;
})(typeof window!=='undefined'?window:null,function(Sim,W9){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const is=life=>!!life&&Number.isInteger(life.birthYear)&&life.birthYear>=1392&&life.birthYear<1900&&life.country?.[0]==='대한민국';
const SOURCE='https://contents.history.go.kr/';
const FACTS=Object.freeze([
 [1392,'조선 건국','이성계가 새 왕조를 세웠다.'],
 [1394,'한양 천도','조선의 도읍이 한양으로 옮겨졌다.'],
 [1418,'세종 즉위','세종이 조선의 제4대 임금으로 즉위했다.'],
 [1443,'훈민정음 창제','세종이 새로운 문자 훈민정음을 창제했다.'],
 [1446,'훈민정음 반포','훈민정음이 세상에 널리 알려졌다.'],
 [1485,'경국대전 완성','조선의 통치 법전인 경국대전이 완성되었다.'],
 [1498,'무오사화','훈구와 사림의 갈등 속에 사림 세력이 큰 피해를 입었다.'],
 [1504,'갑자사화','연산군 때 대규모 정치적 탄압이 일어났다.'],
 [1519,'기묘사화','중종 때 조광조를 비롯한 사림 인사들이 화를 입었다.'],
 [1545,'을사사화','왕위 계승과 외척을 둘러싼 정치적 숙청이 일어났다.'],
 [1555,'을묘왜변','왜구가 전라도 연안을 침략했다.'],
 [1592,'임진왜란 발발','일본군의 침략으로 임진왜란이 시작됐다.'],
 [1593,'행주대첩','권율이 이끈 조선군이 행주산성에서 일본군을 물리쳤다.'],
 [1597,'정유재란','강화 교섭이 결렬된 뒤 일본군이 다시 침략했다.'],
 [1598,'임진왜란 종결','일본군이 철수하면서 오랜 전쟁이 끝났다.'],
 [1608,'대동법의 경기도 시행','광해군 때 경기도에서 대동법이 시행되기 시작했다.'],
 [1623,'인조반정','광해군이 폐위되고 인조가 왕위에 올랐다.'],
 [1627,'정묘호란','후금의 침입으로 조선이 전란을 겪었다.'],
 [1636,'병자호란','청군이 침입하여 조선이 큰 피해를 입었다.'],
 [1637,'병자호란 이후','조선이 청과 군신 관계를 맺고 전후 수습에 들어갔다.'],
 [1659,'예송 논쟁','왕실의 상복 기간을 둘러싼 논쟁이 일어났다.'],
 [1678,'상평통보 유통 확대','숙종 대에 상평통보의 유통이 크게 확대됐다.'],
 [1724,'영조 즉위','영조가 왕위에 올랐다.'],
 [1750,'균역법 시행','군포 부담을 줄이기 위한 균역법이 시행됐다.'],
 [1762,'사도세자 사건','사도세자가 뒤주에 갇혀 사망했다.'],
 [1776,'정조 즉위','정조가 왕위에 올랐다.'],
 [1791,'신해통공','서울 시전 상인들의 일부 금난전권이 폐지됐다.'],
 [1796,'수원 화성 완공','정조 대에 수원 화성이 완공됐다.'],
 [1801,'신유박해','천주교 신자에 대한 큰 박해가 일어났다.'],
 [1811,'홍경래의 난','평안도에서 홍경래가 이끈 봉기가 일어났다.'],
 [1862,'임술농민봉기','진주에서 시작된 농민 봉기가 여러 지역으로 퍼졌다.'],
 [1863,'고종 즉위','고종이 왕위에 올랐다.'],
 [1866,'병인양요','프랑스군이 강화도를 침공했다.'],
 [1871,'신미양요','미국 함대가 강화도를 공격했다.'],
 [1876,'강화도조약','조선이 일본과 불평등 조약을 맺고 개항했다.'],
 [1882,'임오군란','군인들의 봉기로 조선의 정치와 외교가 흔들렸다.'],
 [1884,'갑신정변','급진 개화파가 정변을 일으켰으나 사흘 만에 실패했다.'],
 [1894,'동학농민운동과 갑오개혁','농민군의 봉기가 전개됐고 갑오개혁으로 신분제가 법적으로 폐지됐다.'],
 [1895,'을미사변','명성황후가 일본 측에 의해 시해됐다.'],
 [1896,'아관파천','고종이 러시아 공사관으로 거처를 옮겼다.'],
 [1897,'대한제국 선포','고종이 황제에 즉위하고 대한제국을 선포했다.'],
 [1905,'을사늑약','일본이 대한제국의 외교권을 빼앗았다.'],
 [1910,'국권 피탈','일본이 대한제국을 강제로 병합했다.'],
 [1919,'3·1운동','전국에서 일본의 식민 통치에 맞서는 만세운동이 일어났다.']
].map(([year,title,detail])=>Object.freeze({id:'j-'+year,year,title,detail,source:SOURCE})));
const byYear=new Map(FACTS.map(f=>[f.year,f]));
function period(year){
 if(year<1450)return '조선 건국과 제도 정비';
 if(year<1592)return '조선 전기';
 if(year<=1598)return '임진왜란 시기';
 if(year<1627)return '전쟁 뒤의 조선';
 if(year<=1637)return '호란을 겪는 시기';
 if(year<1724)return '조선 후기';
 if(year<1800)return '영조·정조 시대';
 if(year<1876)return '조선 후기의 변화';
 if(year<1897)return '개항기 조선';
 if(year<1910)return '대한제국';
 return '일제강점기';
}
const REGIONS=Object.freeze([
 {name:'한성부',type:'도성',livelihood:'장사와 수공업'},
 {name:'경기',type:'농촌',livelihood:'농사와 장시'},
 {name:'충청',type:'농촌',livelihood:'농사와 장시'},
 {name:'전라',type:'농촌',livelihood:'논농사와 장시'},
 {name:'경상',type:'농촌',livelihood:'농사와 수공업'},
 {name:'강원',type:'산골',livelihood:'농사와 산림'},
 {name:'황해',type:'농촌',livelihood:'농사와 교역'},
 {name:'평안',type:'장시',livelihood:'장사와 교역'},
 {name:'함경',type:'변방',livelihood:'농사와 교역'}
]);
const ORIGINS=Object.freeze([
 {id:'farm',name:'농민 집안',weight:52,job:'농사',education:'가족과 마을에서 배움'},
 {id:'artisan',name:'장인 집안',weight:15,job:'수공업',education:'가업과 도제식 기술'},
 {id:'merchant',name:'상인 집안',weight:13,job:'장사',education:'가업과 장부 셈법'},
 {id:'yangban',name:'양반 가문',weight:11,job:'유학 공부',education:'서당과 유학 공부'},
 {id:'official',name:'관아 기술직 집안',weight:5,job:'관아 기술 업무',education:'기술과 글 공부'},
 {id:'servile',name:'노비 집안',weight:4,job:'예속된 노동',education:'가족과 일상에서 배움'}
]);
const GIVEN_M=['길동','덕수','만복','영철','계수','돌쇠','성원','윤서','창식','기백','복동','재호'];
const GIVEN_F=['연화','순이','매화','복례','은비','소월','명옥','온유','다정','하연','고운','유진'];
const SURNAMES=['김','이','박','최','정','윤','조','강','장','신'];
const SCENES={
 childhood:[
 '동네 아이들과 흙길을 달리다 옷자락에 흙을 잔뜩 묻혔다.',
 '어머니가 손바닥에 쌀을 올려 주며 한 되가 얼마나 되는지 알려 주었다.',
 '장날 사람들 틈에서 가족의 손을 놓칠 뻔했다.',
 '비가 오는 날, 초가 처마에서 떨어지는 물방울을 오래 바라보았다.',
 '할머니가 어린 시절 들었던 이야기를 또 들려주었다.',
 '콩을 고르며 숫자를 세다가 몇 번이나 다시 시작했다.',
 '마을 앞 냇가에서 차가운 물에 발을 담갔다.',
 '겨울바람이 매서워 가족들과 방 안에 모여 앉았다.',
 '이웃 어른이 나무를 깎는 솜씨를 보고 따라 해 봤다.',
 '가을 추수를 마친 마을에서 함께 음식을 나누었다.'
 ],
 farmer:[
 '비가 오지 않아 논과 밭을 둘러보는 발걸음이 무거웠다.',
 '새벽에 나가 김을 매고 해가 저문 뒤에야 돌아왔다.',
 '장에 가져갈 곡식을 고르느라 온 식구가 모였다.',
 '이웃과 품앗이로 일을 마쳤다. 혼자였다면 며칠은 더 걸렸을 것이다.',
 '한 해 수확을 헤아리며 겨울까지 버틸 양식을 남겼다.',
 '봄이 오기 전 농기구를 고치며 바쁜 철을 기다렸다.',
 '장마가 길어져 밭두렁을 여러 번 살폈다.',
 '모내기를 마치고 가족이 밥 한 끼를 느긋하게 먹었다.',
 '올해 종자를 얼마나 남길지 식구들과 의논했다.',
 '먼 친척이 곡식을 조금 빌리러 왔다.'
 ],
 merchant:[
 '장터에 새 물건이 들어왔다는 소식에 사람들이 모여들었다.',
 '물건 값을 흥정하다가 해가 한참 기울었다.',
 '장부의 숫자가 맞지 않아 촛불 아래에서 다시 셌다.',
 '먼 고장에서 온 상인이 낯선 풍습을 들려주었다.',
 '손님이 뜸해진 장날이라 걱정스러운 얼굴로 짐을 쌌다.',
 '등짐을 지고 고개를 넘으면서 다리가 후들거렸다.',
 '오래 거래하던 사람에게서 뜻밖의 소식을 들었다.',
 '장터에 비가 쏟아져 물건을 서둘러 거두었다.'
 ],
 scholar:[
 '서책 한 권을 손에 넣어 닳도록 읽었다.',
 '글자를 잘못 읽었다가 훈장에게 다시 배웠다.',
 '붓끝에 먹을 묻히고 하루 종일 글씨를 연습했다.',
 '친구와 경전의 한 구절을 두고 한참 의견을 나눴다.',
 '서당에 들어선 아침, 어제 외운 글을 잊지 않았는지 되뇌었다.',
 '글을 읽는 일만큼 집안 살림을 돌보는 일도 중요하다는 생각이 들었다.',
 '책을 빌리러 갔다가 이웃집 어른의 긴 이야기를 들었다.'
 ],
 craft:[
 '나무를 깎다가 손끝에 잔가시가 박혔다.',
 '쓰던 연장을 손질하고 새 일을 시작했다.',
 '오래 걸린 물건 하나를 마침내 완성했다.',
 '어른의 손놀림을 몇 번이고 따라 해 보았다.',
 '고장 난 연장을 고쳐 쓰는 방법을 새로 익혔다.',
 '손님이 주문한 물건의 치수를 다시 재었다.',
 '일을 마치고 보니 손바닥에 굳은살이 두꺼워졌다.'
 ],
 family:[
 '가족들과 둘러앉아 겨울에 필요한 장작을 얼마나 쌓아 둘지 이야기했다.',
 '친척의 안부를 들으러 옆 마을까지 걸어갔다.',
 '오래전 이웃이 보내 준 선물을 서랍에서 꺼냈다.',
 '집안 잔칫날이 되어 장독대까지 깨끗이 씻었다.',
 '가족의 건강이 걱정돼 밤새 몇 차례나 잠에서 깼다.',
 '동생과 사소한 일로 다투었다가 저녁에는 다시 웃었다.',
 '부모가 젊었을 때 살던 마을 이야기를 들었다.',
 '먼 곳에 사는 친척이 찾아와 마루가 북적거렸다.',
 '한 해를 보내며 가족들이 서로의 손을 잡았다.'
 ],
 late:[
 '흰머리가 부쩍 늘었다는 말을 들었다.',
 '젊을 적에 다니던 길을 걸으니 오래전 일이 떠올랐다.',
 '손에 익던 일이 예전만큼 빨리 끝나지 않았다.',
 '젊은 사람들에게 예전에 쓰던 연장을 보여 주었다.',
 '새로 태어난 아이의 울음소리를 들으니 옛날이 생각났다.',
 '한동안 만나지 못했던 이웃이 안부를 전해 왔다.',
 '오래된 가구를 고치며 함께 살던 사람을 떠올렸다.'
 ]
};
const OPTIONS={
 study:[
  ['글과 셈을 배워 본다','집안일을 마친 뒤에도 배움터로 발길을 옮긴다.','learning'],
  ['집안의 일부터 익힌다','부모와 함께 일하며 손에 익은 일을 배운다.','work']
 ],
 trade:[
  ['새 기술을 배운다','처음부터 다시 배우는 수고를 감수한다.','learning'],
  ['익숙한 일을 이어 간다','지금까지 쌓아 온 경험을 살린다.','work']
 ],
 livelihood:[
  ['다른 고장의 일자리를 찾아간다','떠날 채비를 하며 가족에게 인사를 건넨다.','move'],
  ['이곳에서 일할 길을 찾는다','익숙한 이웃과 고장을 떠나지 않는다.','stay']
 ],
 marriage:[
  ['함께 살림을 꾸려 본다','서로의 집안과 형편을 살피며 혼인을 준비한다.','marry'],
  ['지금은 홀로 살아간다','당분간 자신의 생업과 가족을 먼저 챙긴다.','single']
 ],
 children:[
  ['아이를 함께 돌보기로 한다','가족에게 맞는 방식으로 앞으로의 삶을 준비한다.','child'],
  ['지금은 둘의 살림에 집중한다','서둘러 결정하지 않고 지금의 일상을 지킨다.','nochild']
 ],
 learning:[
  ['서당과 글 공부를 이어 간다','바쁜 살림 속에서도 배울 시간을 마련한다.','learning'],
  ['먹고사는 일에 힘을 쏟는다','가족의 생업을 돕는 일이 먼저다.','work']
 ],
 exam:[
  ['과거 시험을 준비한다','공부할 시간과 응시 비용을 마련해야 한다.','exam'],
  ['글을 가르치며 생업을 꾸린다','벼슬길 대신 마을에서 할 일을 찾는다.','teacher']
 ],
 grain:[
  ['곡식을 나누어 이웃을 돕는다','우리 집 곳간도 넉넉하지는 않다.','share'],
  ['남은 곡식을 아껴 둔다','다음 봄까지 가족의 양식을 지킨다.','save']
 ],
 war:[
  ['가족과 함께 피할 곳을 찾아 떠난다','집과 생업을 잠시 뒤로하고 길을 나선다.','flee'],
  ['살던 고장에 남아 서로 돕는다','이웃과 남은 식량과 지낼 곳을 마련한다.','stay'],
  ['친척이 있는 곳에 도움을 구한다','오래전 왕래하던 친척에게 발길을 돌린다.','relative']
 ],
 reform:[
  ['변화한 제도와 새 일자리를 알아본다','익숙하지 않은 세상에 적응할 준비를 한다.','reform'],
  ['지금의 살림을 먼저 지킨다','변화가 지나갈 때까지 가족의 생업을 이어 간다.','stay']
 ],
 elderly:[
  ['경험을 아이들에게 들려준다','젊은 시절의 이야기를 다음 세대에 남긴다.','stories'],
  ['지금 곁의 사람들과 시간을 보낸다','가까운 사람에게 손을 내민다.','family']
 ]
};
const ANCHORS=[
 {age:9,kind:'study',title:'배움을 시작할 무렵'},
 {age:16,kind:'trade',title:'어떤 일을 익혀야 할까'},
 {age:20,kind:'livelihood',title:'어디에서 생업을 꾸릴까'},
 {age:24,kind:'marriage',title:'함께 살아갈 사람'},
 {age:30,kind:'children',title:'가족의 다음 이야기'},
 {age:39,kind:'livelihood',title:'이 일을 계속할 수 있을까'},
 {age:52,kind:'grain',title:'여유가 없던 해'},
 {age:65,kind:'elderly',title:'살아온 시간을 돌아보며'}
];
function number(seed,salt){let x=(seed^Math.imul(salt+1,2654435761))>>>0;x^=x>>>16;x=Math.imul(x,2246822519);return ((x^(x>>>13))>>>0)/4294967296;}
function pick(seed,salt,array){return array[Math.floor(number(seed,salt)*array.length)%array.length];}
function origin(seed,year){
 const eligible=year>=1894?ORIGINS.filter(o=>o.id!=='servile'):ORIGINS;
 const total=eligible.reduce((n,o)=>n+o.weight,0);
 let r=number(seed,666)*total;
 for(const o of eligible){r-=o.weight;if(r<0)return o;}
 return eligible[0];
}
function name(seed,salt,gender){return pick(seed,salt,SURNAMES)+pick(seed,salt+87,gender==='여자'?GIVEN_F:GIVEN_M);}
function currentTitle(life){return is(life)?period(life.year):null;}
function ensure(life){
 if(!is(life))return null;
 if(life.joseon)return life.joseon;
 const state=W9.ensure(life),p=life.profile;
 const orig=origin(life.seed,life.birthYear);
 const region=pick(life.seed,97,REGIONS);
 p.name=name(life.seed,3,life.gender);
 p.city=region.name;
 p.settlement=region.type;
 p.motherJob=orig.job;p.fatherJob=orig.job;
 life.familyLevel=orig.name;
 life.career='아직 정해지지 않음';
 life.money.netWorth=orig.id==='yangban'?620:orig.id==='merchant'?450:orig.id==='servile'?30:250;
 life.money.income=0;life.money.expense=0;life.money.employment='어린 시절';
 const surname=p.name[0];
 for(const m of state.people){
  const gender=m.role==='아버지'?'남자':'여자';
  m.name=(m.id==='father'||m.id==='mother'?surname:pick(life.seed,20+m.id.length,SURNAMES))+
   pick(life.seed,31+m.id.length,gender==='여자'?GIVEN_F:GIVEN_M);
  if(m.role==='아버지'||m.role==='어머니')m.job=orig.job;
 }
 if(life.world){
  life.world.schooling=orig.education;
  life.world.educationLevel='가족과 마을에서 배움';
  life.world.educationYears=0;
 }
 if(life.world8){
  life.world8.housing=orig.id==='yangban'?'기와집과 마당':orig.id==='servile'?'일터 곁 작은 집':'초가집과 마당';
  life.world8.regionName='한반도의 '+region.name;
  life.world8.neighborhood=region.type==='도성'?'도성의 골목':'마을과 장터';
  life.world8.familyNote='가족과 생업을 함께 꾸리는 나날';
 }
 const s={version:14,processedYear:life.year,origin:orig.id,originLabel:orig.name,
  birthRegion:region.name,home:region.name,settlement:region.type,occupation:orig.job,
  grain:life.money.netWorth,education:orig.education,learning:0,household:[],
  yearSeen:[],scenesSeen:[],choices:[],followups:[],memories:[],
  active:null,childCount:0,relocations:0,exposedFacts:0};
 life.joseon=s;
 life.log[0].text=p.name+'(이)가 '+region.name+'의 '+orig.name+'에서 태어났다.';
 historical(life,s);
 return s;
}
function log(life,text,kind='joseon-life'){life.logEvent(text,kind);}
function remember(s,text){if(!s.memories.includes(text))s.memories.push(text);s.memories=s.memories.slice(-35);}
function historical(life,s){
 const fact=byYear.get(life.year);
 if(!fact||s.yearSeen.includes(fact.id))return null;
 s.yearSeen.push(fact.id);s.exposedFacts++;
 log(life,life.year+'년 · '+fact.title+' — '+fact.detail,'history');
 if([1592,1597,1627,1636].includes(life.year)){
  s.grain=Math.max(0,s.grain-45);
  life.change({health:-5,happiness:-5});
  remember(s,'전쟁 소식을 들었던 해');
 }
 if(life.year===1894){
  if(s.origin==='servile'){s.originLabel='신분제 폐지 뒤의 평민';life.familyLevel=s.originLabel;remember(s,'신분제 폐지');}
  else remember(s,'신분제가 법적으로 폐지된 해');
 }
 return fact;
}
function scene(life,s){
 const age=life.age;
 const category=age<13?'childhood':age>=65?'late':
  s.occupation.includes('장사')||s.occupation.includes('상인')?'merchant':
  s.occupation.includes('글')||s.occupation.includes('관아')||s.occupation.includes('유학')?'scholar':
  s.occupation.includes('수공')||s.occupation.includes('장인')?'craft':'farmer';
 const candidate=SCENES[category].filter(t=>!s.scenesSeen.includes(t));
 const text=pick(life.seed,life.year*7+(age%13),candidate.length?candidate:SCENES[category]);
 s.scenesSeen.push(text);
 if(s.scenesSeen.length>100)s.scenesSeen.shift();
 log(life,text);
 if(age>17&&age%4===0){
  const family=pick(life.seed,life.year*13,SCENES.family);
  log(life,family,'joseon-family');
 }
}
function annual(life,s){
 const age=life.age;
 const early=age<13,worked=age>=14&&age<=68;
 const mood=(life.focus==='learning'?{knowledge:2,happiness:-1}:life.focus==='work'?{wealth:1,health:-1}:
  life.focus==='people'?{bonds:2}:life.focus==='health'?{health:1}: {happiness:1});
 if(age>=7)life.change(mood);
 if(age>=50)life.change({health:-1});
 if(early)life.change({knowledge:age%2===0?1:0});
 const before=s.grain;
 const income=worked?Math.round(20+(s.learning*.9)+(life.stats.knowledge*.14)+(s.origin==='merchant'?7:0)):0;
 const expenses=worked?Math.round(24+(life.profile.child?5:0)+(s.relocations?2:0)):age>=69?14:0;
 const harvest=worked?Math.round((life.rand()-.42)*25):0;
 s.grain=clamp(s.grain+income-expenses+harvest,0,50000);
 life.money.netWorth=s.grain;life.money.income=income;life.money.expense=expenses;
 life.money.lastBalance=s.grain-before;
 life.money.employment=age<14?'어린 시절':age>=69?'일손을 놓은 뒤':s.occupation;
 life.career=age<14?'가업과 마을에서 배움':s.occupation;
 if(s.grain<60&&age>17&&age%6===0)log(life,'올해는 곡식이 모자라 가족이 끼니를 아껴 먹었다.','joseon-livelihood');
 if(s.grain>420&&age>17&&age%11===0)log(life,'곳간에 남은 양식을 보며 잠시 마음을 놓았다.','joseon-livelihood');
}
function mortality(life,s){
 const a=life.age,h=life.stats.health;
 const base=a<=1?.065:a<=5?.017:a<=15?.004:a<=39?.003:a<=49?.006:a<=59?.015:a<=69?.035:a<=79?.085:a<=89?.17:.30;
 const risk=base+(h<26?.055:h<42?.008:0);
 if(a>=102||h<=0||life.rand()<risk){
  life.finish('오랜 세월을 살아온 '+life.profile.name+'의 삶이 끝났다.');
  return true;
 }
 return false;
}
function processFollowups(life,s){
 const due=s.followups.filter(x=>x.year<=life.year);
 s.followups=s.followups.filter(x=>x.year>life.year);
 for(const f of due){
  log(life,f.text,'joseon-followup');
  remember(s,f.memory||f.text.slice(0,35));
 }
}
function schedule(s,life,key,text,memory,delay=4){
 if(s.followups.length>=12)return;
 s.followups.push({id:key,year:life.year+delay,text,memory});
}
function prompt(life){
 const s=ensure(life),active=s?.active;
 if(!active)return null;
 return {age:life.age,title:active.title,description:active.description,
  options:OPTIONS[active.kind].map(([label,note])=>({label,note})),joseon:true};
}
function offer(life,s,kind,title,description){
 if(!life.alive||life.pending||s.active)return false;
 s.active={id:'joseon-'+kind+'-'+life.year,kind,title,description,year:life.year};
 life.pending='joseon:'+s.active.id;
 return true;
}
function allowExam(life,s){return s.origin!=='servile'&&life.gender==='남자'&&life.year<1894&&s.learning>=2;}
function candidate(life,s,fact){
 const a=life.age;
 if([1592,1597,1627,1636].includes(life.year)&&a>=10&&a<80)
  return ['war','전쟁의 소식이 닿았다','장터가 일찍 문을 닫았다. 가족이 짐을 싸기 시작했다. 어디로 가야 할까?'];
 if(life.year===1894&&a>=12&&a<80)
  return ['reform','세상이 바뀌는 해','신분제를 법으로 없앤다는 소식이 들려왔다. 집안의 앞날을 어떻게 준비할까?'];
 const anchor=ANCHORS.find(x=>x.age===a);
 if(anchor){
  let kind=anchor.kind;
  if(kind==='children'&&!life.profile.partner)kind='livelihood';
  return [kind,anchor.title,
   kind==='study'?'주변에 서당과 장터가 있지만, 누구나 같은 기회를 얻는 것은 아니다.':
   kind==='trade'?'집안에서 이어 온 일을 배울까, 다른 기술을 찾아볼까?':
   kind==='livelihood'?'고향에서 일할 곳이 마땅치 않다는 이야기가 들려왔다.':
   kind==='marriage'?'함께 살 사람을 만났지만 혼인을 결정하려면 서로의 형편을 살펴야 한다.':
   kind==='children'?'가족의 새로운 식구를 맞이할 준비를 하고 있다.':
   kind==='grain'?'올해는 곡식이 넉넉하지 않다. 이웃집도 사정이 어렵다.':
   '옛이야기를 들어 달라는 어린아이들이 곁에 앉았다.'];
 }
 if(a===27&&allowExam(life,s))
  return ['exam','과거를 볼 기회','서당에서 배워 온 글을 더 익히면 과거 시험에 도전할 수 있다.'];
 if(a>=18&&a<=64&&a%11===0&&a!==ANCHORS[0].age)
  return ['livelihood','어느 길로 살아갈까','집안의 생업이 예전 같지 않다. 새로운 일을 시작할 수 있을까?'];
 return null;
}
function choice(life,index){
 const s=ensure(life),a=s?.active;
 if(!a||life.pending!=='joseon:'+a.id||a.year!==life.year)return false;
 const opt=OPTIONS[a.kind]?.[index];
 if(!opt||!Number.isInteger(index))return false;
 const [label,note,action]=opt;
 s.choices.push({id:a.id,year:life.year,age:life.age,kind:a.kind,index});
 log(life,a.title+' — '+label+'. '+note,'joseon-choice');
 if(action==='learning'||action==='exam'){
  s.learning=clamp(s.learning+(action==='exam'?3:2),0,25);
  life.change({knowledge:6,happiness:1});
  s.education=action==='exam'?'과거를 준비한 경험':'서당·글과 셈을 배운 경험';
  life.world.educationLevel=s.education;
  if(action==='exam'&&life.rand()<.35){s.occupation='관아의 하급 관직';remember(s,'과거에 응시했던 날');}
 }else if(action==='work'||action==='teacher'){
  life.change({knowledge:2,health:-1});
  if(action==='teacher')s.occupation='글을 가르치는 일';
 }else if(action==='move'||action==='flee'||action==='relative'){
  const next=pick(life.seed,life.year+index+71,REGIONS);
  const old=s.home;
  s.home=next.name;s.settlement=next.type;life.profile.city=next.name;life.profile.settlement=next.type;
  s.relocations++;
  life.change({bonds:-2,happiness:-1});
  schedule(s,life,a.id,'먼 길을 떠났던 해를 기억하며 '+old+'에 남은 사람들의 안부를 떠올렸다.','고향에서 떠난 날',5);
 }else if(action==='marry'){
  life.profile.partner=true;
  W9.syncPeople(life);
  const p=W9.ensure(life).people.find(x=>x.id==='partner');
  if(p){p.name=name(life.seed,91,life.gender==='남자'?'여자':'남자');remember(s,p.name+'와 살림을 시작한 해');}
  life.change({bonds:8,happiness:3});s.grain=Math.max(0,s.grain-25);
 }else if(action==='child'&&life.profile.partner){
  life.profile.child=true;
  W9.syncPeople(life);
  const p=W9.ensure(life).people.find(x=>x.id==='child-1');
  if(p){p.name=name(life.seed,130,pick(life.seed,130,['남자','여자']));remember(s,p.name+'가 태어난 날');}
  s.childCount=1;life.change({bonds:5,happiness:3});
 }else if(action==='share'){s.grain=Math.max(0,s.grain-60);life.change({bonds:4});}
 else if(action==='save'){s.grain+=25;}
 else if(action==='reform'){s.learning+=1;life.change({knowledge:3});}
 else if(action==='stories'||action==='family')life.change({bonds:5,happiness:2});
 else if(action==='stay')life.change({bonds:2});
 s.grain=clamp(s.grain,0,50000);life.money.netWorth=s.grain;
 if(a.kind==='war')schedule(s,life,a.id,'전쟁으로 지낸 곳과 만난 사람들이 훗날 가족의 이야깃거리가 되었다.','전쟁의 해',6);
 if(a.kind==='grain')schedule(s,life,a.id,'그해 식량을 어떻게 나누었는지 이웃들은 오래도록 기억하고 있었다.','곡식을 나눌지 고민한 날',4);
 if(a.kind==='study'||a.kind==='trade')schedule(s,life,a.id,'어릴 때 익힌 글과 기술이 생업을 꾸릴 때 힘이 되어 주었다.','배우던 시절',8);
 s.active=null;life.pending=null;
 return true;
}
function year(life){
 const s=ensure(life);if(!s||!life.alive||life.pending)return false;
 life.age++;life.year++;
 annual(life,s);
 const fact=historical(life,s);
 processFollowups(life,s);
 if(mortality(life,s))return true;
 scene(life,s);
 if(life.age===15)log(life,'이제 집안일을 어른들과 나누어 맡기 시작했다.','joseon-milestone');
 if(life.age===60)log(life,'손에 익었던 일이 예전보다 오래 걸렸다. 그래도 아직 할 일이 많았다.','joseon-milestone');
 const suggested=candidate(life,s,fact);
 if(suggested)offer(life,s,...suggested);
 s.processedYear=life.year;
 return true;
}
function restore(life,raw){
 const s=ensure(life);
 if(!s||!raw||raw.version!==14)return s;
 const str=(v,max=100)=>String(v||'').slice(0,max);
 for(const field of ['origin','originLabel','birthRegion','home','settlement','occupation','education'])
  if(typeof raw[field]==='string')s[field]=str(raw[field],70);
 for(const n of ['grain','learning','childCount','relocations','exposedFacts'])
  if(Number.isFinite(raw[n]))s[n]=clamp(Math.round(raw[n]),0,n==='grain'?50000:1000);
 if(Number.isInteger(raw.processedYear))s.processedYear=clamp(raw.processedYear,life.birthYear,life.year);
 for(const field of ['yearSeen','scenesSeen','memories'])
  if(Array.isArray(raw[field]))s[field]=raw[field].filter(x=>typeof x==='string').slice(field==='scenesSeen'?-100:-90);
 if(Array.isArray(raw.choices))s.choices=raw.choices.filter(x=>x&&typeof x.id==='string'&&Number.isInteger(x.year)&&x.year<=life.year&&OPTIONS[x.kind]).slice(-100);
 if(Array.isArray(raw.followups))s.followups=raw.followups.filter(x=>x&&Number.isInteger(x.year)&&x.year>life.year&&typeof x.text==='string').slice(-12).map(x=>({
   id:str(x.id,120),year:x.year,text:str(x.text,300),memory:str(x.memory,80)
 }));
 if(raw.active&&typeof raw.active.id==='string'&&raw.active.year===life.year&&OPTIONS[raw.active.kind]&&
    life.alive&&life.pending===null&&String(life.deathReason||'')===''){
  s.active={id:str(raw.active.id,120),kind:raw.active.kind,title:str(raw.active.title,100),
   description:str(raw.active.description,300),year:life.year};
  if(raw.active&&raw.active.id&&raw.active.year===life.year)life.pending='joseon:'+s.active.id;
 }
 life.profile.city=s.home;life.profile.settlement=s.settlement;life.familyLevel=s.originLabel;
 life.career=life.age<14?'가업과 마을에서 배움':s.occupation;
 life.money.netWorth=s.grain;
 life.world.educationLevel=s.education;
 return s;
}
function summary(life){
 const s=ensure(life);
 return {age:life.age,country:'조선',gender:life.gender,year:life.year,
  highlights:life.log.filter(x=>['joseon-choice','joseon-followup','history'].includes(x.kind)),
  story:life.profile.name+'(은)는 '+s.birthRegion+'의 '+s.originLabel+'에서 태어났다. '+
   s.occupation+'(으)로 살며 '+s.choices.length+'번의 중요한 갈림길을 마주했다. '+
   (s.relocations?'살던 고장을 '+s.relocations+'번 떠났다. ':'')+
   (s.memories.length?'마지막까지 '+s.memories.slice(-2).join(', ')+'을 기억했다.':'')};
}
function paint(canvas,life){
 if(!canvas||!is(life)||!canvas.getContext)return false;
 const c=canvas.getContext('2d');if(!c)return false;
 const w=canvas.width,h=canvas.height,s=ensure(life);
 c.clearRect(0,0,w,h);
 const bg=period(life.year)==='임진왜란 시기'||period(life.year)==='호란을 겪는 시기'?'#cab8a3':'#b9d9ca';
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 c.fillStyle='#e3d8b4';c.fillRect(0,h*.59,w,h*.41);
 c.fillStyle='#82a68c';
 for(let i=0;i<5;i++){let x=i*175-70;c.beginPath();c.moveTo(x,150);c.lineTo(x+93,45+i%2*30);c.lineTo(x+188,150);c.fill();}
 function house(x,y,scale){
  c.fillStyle='#bfa37f';c.fillRect(x,y,140*scale,72*scale);
  c.fillStyle=s.origin==='yangban'?'#4e5554':'#715f52';
  c.beginPath();c.moveTo(x-18*scale,y+7*scale);c.lineTo(x+70*scale,y-45*scale);c.lineTo(x+158*scale,y+7*scale);c.closePath();c.fill();
  c.fillStyle='#43372f';c.fillRect(x+54*scale,y+26*scale,30*scale,46*scale);
  c.strokeStyle='#815d45';c.lineWidth=3;c.strokeRect(x+54*scale,y+26*scale,30*scale,46*scale);
 }
 house(165,140,1.15);house(392,163,.75);
 c.fillStyle='#746f4c';c.fillRect(0,235,w,5);
 c.fillStyle='#263d36';c.font='bold 17px sans-serif';c.fillText(life.year+'년 · '+period(life.year),15,28);
 c.font='14px sans-serif';c.fillText(life.profile.city+' · '+s.originLabel+' · '+life.age+'세',15,49);
 return true;
}
function install(){
 if(!Sim?.Life||!W9?.ensure||Sim.Life.prototype.__joseon)return false;
 const L=Sim.Life,p=L.prototype,priorTick=p.tick,priorGet=p.getChoice,priorChoose=p.choose,
  priorSnapshot=p.snapshot,priorRestore=L.restore,priorSummary=p.summary;
 p.tick=function(){return is(this)?year(this):priorTick.call(this);};
 p.getChoice=function(){return is(this)&&String(this.pending||'').startsWith('joseon:')?prompt(this):priorGet.call(this);};
 p.choose=function(index){return is(this)&&String(this.pending||'').startsWith('joseon:')?choice(this,index):priorChoose.call(this,index);};
 p.summary=function(){return is(this)?summary(this):priorSummary.call(this);};
 p.snapshot=function(){return {...priorSnapshot.call(this),joseon:is(this)?JSON.parse(JSON.stringify(ensure(this))):undefined};};
 L.restore=function(data){
  const life=priorRestore.call(this,data);
  if(life&&is(life)){
   // Restore only v14 pending choices; previous eras' choices are not eligible before 1900.
   life.pending=null;
   restore(life,data?.joseon);
  }
  return life;
 };
 Object.defineProperty(p,'__joseon',{value:true});
 return true;
}
install();
return Object.freeze({is,ensure,period,FACTS,OPTIONS,REGIONS,ORIGINS,year,choice,prompt,summary,paint,install,VERSION:14});
});
