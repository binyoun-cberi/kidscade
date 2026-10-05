export const SCHOOL_PROFILES={
  minji:{name:'민지',kind:'teacher',role:'수학 선생님',subject:'수학',hangout:'씨앗마트',trait:'생활 속 계산을 좋아함',service:'market',serviceLabel:'씨앗마트 이용'},
  junho:{name:'준호',kind:'teacher',role:'실과 선생님',subject:'실과',hangout:'튼튼 철물점',trait:'도구와 만들기를 좋아함',service:'hardware',serviceLabel:'튼튼 철물점 이용'},
  haneul:{name:'하늘',kind:'teacher',role:'영양 선생님',subject:'식생활',hangout:'하늘 카페',trait:'요리와 건강한 식사를 좋아함',service:'cafe',serviceLabel:'하늘 카페 이용'},
  doyun:{name:'도윤',kind:'teacher',role:'사회 선생님',subject:'사회',hangout:'마을회관',trait:'마을의 일과 지도를 잘 앎',service:'jobs',serviceLabel:'오늘의 일거리 보기'},
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

export function schoolProfile(id){return SCHOOL_PROFILES[id]||null}
export function schoolInteractionLabel(id){
  const p=schoolProfile(id);if(!p)return id+'와 이야기하기';
  return p.kind==='teacher'?p.name+' 선생님과 이야기하기':p.name+'와 이야기하기';
}
export function schoolKindLabel(id){
  const p=schoolProfile(id);return p?.kind==='teacher'?'교직원':'학생';
}
