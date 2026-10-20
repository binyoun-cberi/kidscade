/* 말맛 전국일주 — 출처를 검토한 지역어 학습 자료. 다른 지역에서도 쓰이는 표현이 있을 수 있습니다. */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  if (root) root.DialectTourData = data;
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';

  const SOURCES = Object.freeze({
    jeju: 'https://www.jeju.go.kr/jedu/data/card.htm',
    jejuCulture: 'https://www.jeju.go.kr/jedu/data/data.htm',
    gyeongsang: 'https://www.korean.go.kr/common/download.do?c_file_name=add45015-fc3a-4704-b904-734ceb9a36e1_0.pdf&file_path=reportData',
    national: 'https://dialect.korean.go.kr/',
    gangwon: 'https://toolnjoy.com/dialect-quiz/gangwon',
    chungcheong: 'https://toolnjoy.com/dialect-quiz/chungcheong',
    jeolla: 'https://www.koreanclass101.com/lesson/korean-culture-class-10-jeollado-dialect'
  });

  const REGIONS = Object.freeze([
    { id:'gangwon', name:'강원', emoji:'⛰️', place:'산골 장터', color:'#5d9b75', intro:'산과 바람을 따라 색다른 낱말을 만나 봐요.' },
    { id:'chungcheong', name:'충청', emoji:'🌾', place:'느긋한 마을', color:'#ca8b45', intro:'친구가 건네는 익숙하면서도 다른 말을 살펴봐요.' },
    { id:'jeolla', name:'전라', emoji:'🍚', place:'맛있는 시장', color:'#d9747a', intro:'감탄과 표현에 담긴 정겨운 말맛을 찾아봐요.' },
    { id:'gyeongsang', name:'경상', emoji:'🌊', place:'활기찬 항구', color:'#5c8dc7', intro:'시장 골목의 힘찬 인사와 말을 알아봐요.' },
    { id:'jeju', name:'제주', emoji:'🍊', place:'바람 부는 섬', color:'#9474cf', intro:'섬에서 전해 온 특별한 말과 생활을 만나 봐요.' }
  ]);

  // [id, 지역, 표현, 뜻, 선택지용 오답 3개, 그림, 상황, 출처, 다른 지역 공유 여부, 지역 찾기 허용]
  const RAW = [
    ['j1','jeju','지슬','감자',['고구마','당근','무'],'🥔','시장 바구니에 담을 물건','jeju',false,true],
    ['j2','jeju','감저','고구마',['감자','옥수수','호박'],'🍠','밭에서 캔 먹거리','jeju',false,true],
    ['j3','jeju','하영','많이',['조금','천천히','잠깐'],'✨','양이 아주 넉넉할 때','jeju',false,true],
    ['j4','jeju','어멍','어머니',['아버지','할머니','언니'],'👩','가족을 부르는 말','jejuCulture',false,true],
    ['j5','jeju','아방','아버지',['어머니','할아버지','오빠'],'👨','가족을 부르는 말','jejuCulture',false,true],
    ['j6','jeju','바당','바다',['산','강','들판'],'🌊','물결이 넘실대는 곳','jejuCulture',false,true],
    ['j7','jeju','보말','고둥',['조개','게','해파리'],'🐚','바닷가에서 찾는 작은 생물','jejuCulture',false,true],
    ['j8','jeju','구젱기','소라',['고둥','미역','문어'],'🐚','바닷가에서 만나는 생물','jejuCulture',false,true],
    ['j9','jeju','물꾸럭','문어',['오징어','고등어','새우'],'🐙','다리가 여덟 개 있는 바다 생물','jejuCulture',false,true],
    ['j10','jeju','혼저 옵서예','어서 오세요',['잘 가세요','고맙습니다','다시 만나요'],'👋','손님을 반갑게 맞을 때','jejuCulture',false,true],
    ['j11','jeju','겡이','게',['새우','미역','조개'],'🦀','바닷가를 옆으로 걷는 생물','jejuCulture',false,true],
    ['g1','gangwon','감재','감자',['고구마','무','배추'],'🥔','밭에서 캐는 둥근 채소','gangwon',false,true],
    ['g2','gangwon','옥시기','옥수수',['고구마','수박','토마토'],'🌽','알이 노랗게 줄지어 있는 먹거리','gangwon',false,true],
    ['g3','gangwon','마카','모두',['아무도','조금','나중에'],'👫','친구들을 빠짐없이 부를 때','gangwon',false,true],
    ['g4','gangwon','낭구','나무',['돌','구름','바람'],'🌳','숲에서 자라는 것','gangwon',true,false],
    ['g5','gangwon','얼라','아이',['어른','선생님','할아버지'],'🧒','작은 어린이를 부르는 말','gangwon',true,false],
    ['g6','gangwon','이짝저짝','이쪽저쪽',['위아래','앞뒤','어제오늘'],'↔️','여기와 저기를 오갈 때','national',true,false],
    ['g7','gangwon','핵교','학교',['병원','시장','도서관'],'🏫','학생들이 공부하는 곳','national',true,false],
    ['c1','chungcheong','시방','지금',['어제','내일','나중에'],'⏰','바로 이 순간','chungcheong',true,false],
    ['c2','chungcheong','이짝저짝','이쪽저쪽',['위아래','앞뒤','하루종일'],'↔️','양쪽 방향을 가리킬 때','national',true,false],
    ['c3','chungcheong','핵교','학교',['운동장','병원','식당'],'🏫','수업을 듣는 곳','national',true,false],
    ['c4','chungcheong','메칠','며칠',['몇 시','몇 개','몇 명'],'📆','날짜의 수를 물을 때','national',true,false],
    ['c5','chungcheong','그려','그래',['아니','모르겠어','그만해'],'👍','상대의 말에 맞장구칠 때','chungcheong',true,false],
    ['c6','chungcheong','워뗘?','어때?',['누구야?','언제야?','어디야?'],'❔','생각이나 느낌을 물을 때','chungcheong',false,true],
    ['e1','jeolla','허벌나게','아주 많이',['아주 조금','갑자기','조용하게'],'✨','양이나 정도를 크게 말할 때','jeolla',false,true],
    ['e2','jeolla','시방','지금',['내일','어제','나중에'],'⏰','바로 이 순간','jeolla',true,false],
    ['e3','jeolla','거시기','그것·저것 같은 말을 대신하는 표현',['언제나','빨리 가라는 뜻','감사하다는 인사'],'💬','딱 떠오르지 않는 것을 가리킬 때','jeolla',true,false],
    ['e4','jeolla','워메!','어머나!',['안녕히 가세요!','잘 먹겠습니다!','어서 오세요!'],'😲','놀라거나 감탄할 때','jeolla',false,true],
    ['e5','jeolla','솔찬히','꽤·제법',['전혀','반드시','우연히'],'📈','생각보다 많거나 클 때','national',false,true],
    ['e6','jeolla','이짝저짝','이쪽저쪽',['여름겨울','안팎','오늘내일'],'↔️','어느 쪽인지 가리킬 때','national',true,false],
    ['s1','gyeongsang','오이소','오세요',['가세요','앉으세요','기다리세요'],'🙌','가게에 손님을 부를 때','gyeongsang',false,true],
    ['s2','gyeongsang','보이소','보세요',['들으세요','드세요','고르세요'],'👀','물건을 구경하라고 할 때','gyeongsang',false,true],
    ['s3','gyeongsang','사이소','사세요',['파세요','주세요','만드세요'],'🛍️','물건을 사라고 권할 때','gyeongsang',false,true],
    ['s4','gyeongsang','마이','많이',['조금','빨리','천천히'],'✨','양이 넉넉할 때','national',true,false],
    ['s5','gyeongsang','쪼매','조금',['매우','전부','절대'],'🤏','양이 작을 때','national',true,false],
    ['s6','gyeongsang','얼라','아이',['어른','할머니','선생님'],'🧒','어린이를 부르는 말','national',true,false],
    ['s7','gyeongsang','핵교','학교',['공원','마트','병원'],'🏫','공부하러 가는 곳','national',true,false]
  ];

  const ENTRIES = Object.freeze(RAW.map(([id,region,word,meaning,wrong,emoji,context,source,shared,regionQuiz]) => Object.freeze({
    id,region,word,meaning,wrong:Object.freeze(wrong),emoji,context,source:SOURCES[source],shared,regionQuiz
  })));

  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function makeDeck(regionId = 'all', size = 10, random = Math.random) {
    const pool = ENTRIES.filter(entry => regionId === 'all' || entry.region === regionId);
    const target = Math.min(Math.max(1, Number(size) || 10), pool.length);
    if (regionId !== 'all') return shuffle(pool, random).slice(0, target);
    // 전국 여행은 지역이 편중되지 않도록 먼저 각 지역의 한 문제씩 넣습니다.
    const first = REGIONS.map(region => shuffle(pool.filter(entry => entry.region === region.id), random)[0]).filter(Boolean);
    const ids = new Set(first.map(entry => entry.id));
    return shuffle(first.concat(shuffle(pool.filter(entry => !ids.has(entry.id)), random).slice(0, Math.max(0, target-first.length))), random).slice(0,target);
  }

  function makeOptions(entry, size = 4, random = Math.random) {
    return shuffle([entry.meaning, ...entry.wrong.slice(0, Math.max(2, size - 1))], random);
  }

  return Object.freeze({ REGIONS, ENTRIES, SOURCES, shuffle, makeDeck, makeOptions });
});
