export const SCHOOL_PROFILES={
  minji:{name:'민지',kind:'teacher',role:'수학 선생님',subject:'수학',hangout:'씨앗마트',trait:'생활 속 계산을 좋아함',service:'market',serviceLabel:'씨앗마트 이용'},
  junho:{name:'준호',kind:'teacher',role:'실과 선생님',subject:'실과',hangout:'튼튼 철물점',trait:'도구와 만들기를 좋아함',service:'hardware',serviceLabel:'튼튼 철물점 이용'},
  haneul:{name:'하늘',kind:'teacher',role:'영양 선생님',subject:'식생활',hangout:'하늘 카페',trait:'요리와 건강한 식사를 좋아함',service:'cafe',serviceLabel:'하늘 카페 이용'},
  doyun:{name:'도윤',kind:'teacher',role:'사회 선생님',subject:'사회',hangout:'씨앗학교·마을광장',trait:'마을의 일과 지도를 잘 앎',service:'jobs',serviceLabel:'오늘의 일거리 보기'},
  sora:{name:'소라',kind:'teacher',role:'국어 선생님',subject:'국어',hangout:'마을 도서관',trait:'책과 이야기를 좋아함',service:'library',serviceLabel:'도서관 이용'},
  nari:{name:'나리',kind:'teacher',role:'보건 선생님',subject:'건강',hangout:'튼튼 보건소',trait:'안전과 건강 습관을 챙김',service:'clinic',serviceLabel:'보건소 이용'},
  minseok:{name:'민석',kind:'teacher',role:'체육 선생님',subject:'체육',hangout:'씨앗버스 정류장',trait:'기록과 야외 활동을 좋아함',service:'transport',serviceLabel:'씨앗버스 타기'},
  yuna:{name:'유나',kind:'student',role:'원예부 학생',subject:'자연',hangout:'광장과 텃밭',trait:'식물을 키우는 걸 좋아함',service:'advice',serviceLabel:'농사 이야기 듣기'},
  woojin:{name:'우진',kind:'student',role:'과학탐구부 학생',subject:'과학',hangout:'숲과 강가',trait:'관찰하고 기록하는 걸 좋아함',service:'forest',serviceLabel:'숲 정보 듣기'},
  seoyeon:{name:'서연',kind:'student',role:'동물돌봄부 학생',subject:'생명',hangout:'광장과 공원',trait:'동물과 금방 친해짐',service:'pets',serviceLabel:'Cube Pets 이야기 듣기'},
  taeho:{name:'태호',kind:'student',role:'게임동아리 학생',subject:'놀이',hangout:'키즈 아케이드',trait:'규칙을 발견하는 걸 좋아함',service:'arcade',serviceLabel:'아케이드 놀기'},
  hyunwoo:{name:'현우',kind:'student',role:'방송봉사부 학생',subject:'생활',hangout:'상점가와 광장',trait:'심부름과 전달을 잘함',service:'delivery',serviceLabel:'배달 봉사 받기'},
  clerk:{name:'서준',kind:'student',role:'마트 체험 학생',subject:'수학',hangout:'씨앗마트',trait:'가격표 정리를 돕고 있음'},
  visitor:{name:'교류 학생',kind:'student',role:'오늘의 교류 학생',subject:'체험',hangout:'광장',trait:'다른 학교에서 하루 체험을 옴'}
};

export const SCHOOL_QUESTS={
  minji:{id:'math-market-budget',title:'우리 반 간식 예산',icon:'🧮',type:'choice',prompt:'민지 선생님이 마트에서 간식을 고르고 있어. 1,200코인짜리 우유 4개와 800코인짜리 빵 4개를 사면 모두 얼마일까?',choices:[['6400','6,400코인'],['7200','7,200코인'],['8000','8,000코인']],answer:'8000',rewardCoins:60,friendship:2,result:'1,200×4 + 800×4 = 8,000. 실제 장보기에서도 곱셈과 덧셈이 함께 쓰여.'},
  junho:{id:'practical-measure',title:'책상 재료 재기',icon:'📏',type:'choice',prompt:'준호 선생님이 30cm짜리 나무 조각 4개를 이어 붙이려고 해. 전체 길이는 얼마일까?',choices:[['90','90cm'],['120','120cm'],['150','150cm']],answer:'120',rewardCoins:55,friendship:2,result:'30cm가 4개이므로 120cm야. 만들기에서는 길이와 단위를 정확히 재는 게 중요해.'},
  haneul:{id:'nutrition-lunch-share',title:'도시락 똑같이 나누기',icon:'🍱',type:'choice',prompt:'하늘 선생님이 방울토마토 24개를 6개의 도시락에 똑같이 나누려고 해. 한 도시락에는 몇 개가 들어갈까?',choices:[['3','3개'],['4','4개'],['6','6개']],answer:'4',rewardCoins:55,friendship:2,result:'24÷6=4. 음식을 공평하게 나눌 때도 나눗셈을 쓸 수 있어.'},
  doyun:{id:'social-map-route',title:'마을 안내 지도',icon:'🗺️',type:'choice',prompt:'도윤 선생님이 새 학생에게 길을 알려주려고 해. 책을 빌리려면 어느 곳으로 안내하는 게 가장 알맞을까?',choices:[['library','마을 도서관'],['clinic','튼튼 보건소'],['quarry','광산']],answer:'library',rewardCoins:50,friendship:2,result:'목적에 맞는 장소를 찾아 이동하는 것도 지도를 읽는 기본이야.'},
  sora:{id:'korean-story-order',title:'문장 순서 맞추기',icon:'📚',type:'choice',prompt:'소라 선생님이 짧은 이야기를 정리 중이야. “씨앗을 심었다 → 물을 주었다 → ?” 다음에 가장 자연스러운 문장은?',choices:[['harvest','싹이 자라 열매를 맺었다'],['sleep','갑자기 잠을 잤다'],['bus','버스를 탔다']],answer:'harvest',rewardCoins:50,friendship:2,result:'앞뒤 사건의 원인과 결과를 생각하면 이야기 순서를 찾기 쉬워.'},
  nari:{id:'health-after-running',title:'운동 뒤 건강 습관',icon:'🩺',type:'choice',prompt:'나리 선생님이 묻는다. 더운 날 오래 달린 뒤 가장 먼저 하면 좋은 행동은?',choices:[['water','그늘에서 쉬며 물 마시기'],['more','바로 더 세게 달리기'],['skip','아무것도 먹거나 마시지 않기']],answer:'water',rewardCoins:50,friendship:2,result:'몸이 지쳤을 때는 안전한 곳에서 쉬고 수분을 보충하는 것이 좋아.'},
  minseok:{id:'pe-record',title:'달리기 기록 비교',icon:'🏃',type:'choice',prompt:'민석 선생님이 50m 달리기 기록을 비교하고 있어. 10초, 12초, 9초 중 가장 빠른 기록은?',choices:[['9','9초'],['10','10초'],['12','12초']],answer:'9',rewardCoins:55,friendship:2,result:'같은 거리를 달렸다면 시간이 짧을수록 더 빠른 기록이야.'},
  yuna:{id:'garden-carrots',title:'원예부 당근 모으기',icon:'🥕',type:'item',prompt:'유나가 원예부 관찰 활동에 쓸 당근 2개를 찾고 있어. 텃밭에서 수확한 당근을 가져다주자.',item:'carrot',count:2,rewardCoins:58,friendship:2,result:'직접 키운 작물을 친구의 활동에 사용했어.'},
  woojin:{id:'science-mushroom',title:'숲 버섯 관찰',icon:'🍄',type:'item',prompt:'우진이 과학탐구부 관찰 기록에 쓸 버섯 2개를 찾고 있어. 깊은 숲에서 모아 가져다주자.',item:'mushroom',count:2,rewardCoins:62,friendship:2,result:'숲에서 채집한 표본으로 관찰 기록을 완성했어.'},
  seoyeon:{id:'animal-fish',title:'동물돌봄부 간식',icon:'🐟',type:'item',prompt:'서연이 Cube Pets 돌봄 활동에 쓸 물고기 2마리를 부탁했어. 낚시가 가능해지면 모아서 가져다주자.',item:'fish',count:2,rewardCoins:68,friendship:2,result:'동물마다 필요한 먹이가 다르다는 걸 확인했어.'},
  taeho:{id:'game-rule-pattern',title:'게임 규칙 찾기',icon:'🎮',type:'choice',prompt:'태호가 규칙 게임을 만들고 있어. 2, 4, 6, 8 다음 수로 알맞은 것은?',choices:[['9','9'],['10','10'],['12','12']],answer:'10',rewardCoins:45,friendship:2,result:'2씩 커지는 규칙이므로 다음 수는 10이야.'},
  hyunwoo:{id:'broadcast-route',title:'축제 안내문 전달',icon:'📦',type:'choice',prompt:'현우가 학교 축제 안내문을 가장 먼저 책을 읽는 친구들이 많은 곳에 전달하려고 해. 어디가 좋을까?',choices:[['library','마을 도서관'],['quarry','광산'],['beach','해변']],answer:'library',rewardCoins:48,friendship:2,result:'누구에게 전달할지 생각하고 알맞은 장소를 고르는 것도 중요한 생활 기술이야.'}
};


export const SCHOOL_DAY_PERIODS=[
  {id:'arrival',kind:'arrival',start:450,end:480,label:'등교 시간',icon:'🎒',board:'좋은 아침! 가방을 정리하고 오늘 수업을 준비해요.'},
  {id:'p1',kind:'class',period:1,start:480,end:520,label:'1교시 수학',subject:'수학',teacher:'minji',icon:'🧮',board:'생활 속 계산 · 가격과 수량을 함께 생각해요.'},
  {id:'recess1',kind:'recess',start:520,end:540,label:'쉬는 시간',icon:'🔔',board:'쉬는 시간 · 물을 마시고 친구들과 이야기해요.'},
  {id:'p2',kind:'class',period:2,start:540,end:580,label:'2교시 국어',subject:'국어',teacher:'sora',icon:'📚',board:'이야기의 앞뒤가 자연스럽게 이어지는지 살펴봐요.'},
  {id:'recess2',kind:'recess',start:580,end:600,label:'쉬는 시간',icon:'🔔',board:'쉬는 시간 · 다음 수업 준비를 해요.'},
  {id:'p3',kind:'class',period:3,start:600,end:640,label:'3교시 사회',subject:'사회',teacher:'doyun',icon:'🗺️',board:'우리 마을의 장소와 역할을 찾아봐요.'},
  {id:'recess3',kind:'recess',start:640,end:660,label:'쉬는 시간',icon:'🔔',board:'쉬는 시간 · 운동장에 나가도 좋아요.'},
  {id:'p4',kind:'class',period:4,start:660,end:700,label:'4교시 실과',subject:'실과',teacher:'junho',icon:'🛠️',board:'도구는 안전하게, 순서를 생각하며 사용해요.'},
  {id:'cleanup',kind:'recess',start:700,end:720,label:'정리 시간',icon:'🧹',board:'책상과 교실을 정리하고 점심을 준비해요.'},
  {id:'lunch',kind:'lunch',start:720,end:780,label:'점심·놀이 시간',icon:'🍱',board:'맛있게 먹고 운동장에서 쉬어요.'},
  {id:'p5',kind:'class',period:5,start:780,end:820,label:'5교시 보건',subject:'보건',teacher:'nari',icon:'🩺',board:'내 몸의 신호를 알고 건강한 습관을 익혀요.'},
  {id:'recess4',kind:'recess',start:820,end:840,label:'쉬는 시간',icon:'🔔',board:'쉬는 시간 · 몸을 가볍게 움직여요.'},
  {id:'p6',kind:'class',period:6,start:840,end:880,label:'6교시 체육',subject:'체육',teacher:'minseok',icon:'🏃',board:'기록보다 안전과 꾸준함이 먼저예요.'},
  {id:'club',kind:'club',start:880,end:920,label:'동아리 활동',subject:'탐구',leader:'woojin',icon:'🔎',board:'관찰하고 기록하며 친구와 생각을 나눠요.'},
  {id:'dismissal',kind:'dismissal',start:920,end:940,label:'하교 시간',icon:'👋',board:'오늘도 수고했어요. 방과후 생활을 시작해요.'}
];

export const SCHOOL_CLASS_ACTIVITIES={
  p1:{teacher:'minji',title:'가격표 계산',prompt:'연필 500코인짜리 3개와 지우개 700코인짜리 2개를 사면 모두 얼마일까?',choices:[['2200','2,200코인'],['2900','2,900코인'],['3600','3,600코인']],answer:'2900',result:'500×3 + 700×2 = 2,900. 가격과 수량을 함께 계산했어.',rewardCoins:20,friendship:1},
  p2:{teacher:'sora',title:'이야기 이어 읽기',prompt:'“비가 내렸다 → 우산을 펼쳤다 → ?” 다음에 가장 자연스러운 문장은?',choices:[['dry','비를 피하며 걸었다'],['snow','눈사람을 만들었다'],['sleep','갑자기 밤이 되었다']],answer:'dry',result:'앞 사건과 이어지는 원인과 결과를 생각하면 문장 순서를 찾기 쉬워.',rewardCoins:20,friendship:1},
  p3:{teacher:'doyun',title:'마을 시설 찾기',prompt:'아픈 사람이 도움을 받으러 가야 하는 마을 시설은 어디일까?',choices:[['clinic','튼튼 보건소'],['arcade','키즈 아케이드'],['quarry','광산']],answer:'clinic',result:'마을 시설은 저마다 하는 일이 달라. 목적에 맞는 장소를 찾았어.',rewardCoins:20,friendship:1},
  p4:{teacher:'junho',title:'안전한 도구 사용',prompt:'가위를 친구에게 건넬 때 가장 안전한 방법은?',choices:[['handle','손잡이 쪽을 친구에게 향하게 건넨다'],['blade','날 끝을 친구 쪽으로 향하게 건넨다'],['throw','책상 위로 던져 준다']],answer:'handle',result:'도구는 사용하는 법뿐 아니라 건네고 정리하는 방법도 중요해.',rewardCoins:20,friendship:1},
  p5:{teacher:'nari',title:'몸의 신호 알아차리기',prompt:'운동하다 어지럽고 숨이 너무 차면 가장 먼저 어떻게 하는 것이 좋을까?',choices:[['rest','안전한 곳에서 멈추고 쉬며 도움을 알린다'],['push','참고 계속 달린다'],['hide','아무에게도 말하지 않는다']],answer:'rest',result:'몸이 보내는 신호를 알아차리고 쉬는 것도 건강한 선택이야.',rewardCoins:20,friendship:1},
  p6:{teacher:'minseok',title:'달리기 기록 비교',prompt:'같은 50m를 달렸을 때 11초와 9초 중 더 빠른 기록은?',choices:[['9','9초'],['11','11초']],answer:'9',result:'같은 거리는 시간이 짧을수록 더 빠르게 달린 기록이야.',rewardCoins:20,friendship:1},
  club:{leader:'woojin',title:'관찰 기록 만들기',prompt:'숲에서 처음 보는 버섯을 발견했어. 관찰 기록에 가장 도움이 되는 것은?',choices:[['record','색·모양·발견 장소를 기록한다'],['guess','보지 않고 이름부터 짐작한다'],['ignore','아무 기록도 남기지 않는다']],answer:'record',result:'관찰한 사실을 그대로 기록하면 나중에 비교하고 분류하기 좋아.',rewardCoins:16,friendship:1}
};


export const SCHOOL_BREAK_PLAY_PERIODS=['recess1','recess2','recess3','lunch','recess4'];

export const SCHOOL_BREAK_GAMES={
  soccer:{
    id:'soccer',icon:'⚽',title:'운동장 미니 축구',friend:'taeho',rewardCoins:10,fun:6,
    prompt:'태호가 골키퍼를 보고 있어. 어디로 슛할까?',
    choices:[['left','왼쪽 구석'],['center','정면'],['right','오른쪽 구석']]
  },
  dodge:{
    id:'dodge',icon:'🔴',title:'피구 한 판',friend:'seoyeon',rewardCoins:10,fun:6,
    prompt:'서연이 공을 던질 준비를 했어. 어떻게 대응할까?',
    choices:[['left','왼쪽으로 피하기'],['catch','두 손으로 잡기'],['right','오른쪽으로 피하기']]
  }
};

export const SCHOOL_LUNCH_MENUS=[
  {name:'소고기무국 급식',items:['잡곡밥','소고기무국','계란말이','오이무침','사과'],energy:9,hunger:24,fun:5},
  {name:'카레 급식',items:['카레라이스','두부샐러드','깍두기','요구르트'],energy:8,hunger:25,fun:6},
  {name:'닭곰탕 급식',items:['현미밥','닭곰탕','감자조림','배추김치','귤'],energy:10,hunger:26,fun:5},
  {name:'비빔밥 급식',items:['채소비빔밥','미역국','두부구이','김치','바나나'],energy:9,hunger:24,fun:6},
  {name:'잔치국수 급식',items:['잔치국수','주먹밥','방울토마토','김치','우유'],energy:8,hunger:23,fun:7}
];

export function schoolLunchMenu(day){
  const n=Math.max(1,Math.floor(Number(day)||1));
  return SCHOOL_LUNCH_MENUS[(n-1)%SCHOOL_LUNCH_MENUS.length];
}

export function schoolPeriodAt(minutes){
  const m=((Number(minutes)||0)%1440+1440)%1440;
  return SCHOOL_DAY_PERIODS.find(p=>m>=p.start&&m<p.end)||{
    id:m<450?'before':'after',
    kind:m<450?'before':'after',
    label:m<450?'등교 전':'방과후',
    icon:m<450?'🌅':'🌆',
    board:m<450?'아직 학교 문을 열기 전이에요.':'수업이 끝났어요. 마을에서 방과후 시간을 보내요.'
  };
}
export function schoolClock(minutes){
  const total=Math.floor(((Number(minutes)||0)%1440+1440)%1440);
  return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}

export function schoolProfile(id){return SCHOOL_PROFILES[id]||null}
export function schoolInteractionLabel(id){
  const p=schoolProfile(id);if(!p)return id+'와 이야기하기';
  return p.kind==='teacher'?p.name+' 선생님과 이야기하기':p.name+'와 이야기하기';
}
export function schoolKindLabel(id){
  const p=schoolProfile(id);return p?.kind==='teacher'?'교직원':'학생';
}
