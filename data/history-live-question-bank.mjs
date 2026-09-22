const CORE_FACTS = [
  {
    "era": "선사",
    "type": "유물",
    "term": "주먹도끼",
    "clue": "구석기 시대 사람들이 돌을 깨뜨려 만든 대표적인 뗀석기이다."
  },
  {
    "era": "선사",
    "type": "생활",
    "term": "이동 생활",
    "clue": "구석기 시대에는 먹을거리를 찾아 무리를 이루어 옮겨 다니며 생활했다."
  },
  {
    "era": "선사",
    "type": "주거",
    "term": "동굴과 막집",
    "clue": "구석기 시대 사람들이 추위와 비를 피하며 머물렀던 대표적인 생활 공간이다."
  },
  {
    "era": "선사",
    "type": "유물",
    "term": "빗살무늬 토기",
    "clue": "신석기 시대의 대표적인 토기로 음식물을 저장하거나 조리하는 데 쓰였다."
  },
  {
    "era": "선사",
    "type": "주거",
    "term": "움집",
    "clue": "신석기 시대 사람들이 땅을 파고 지붕을 덮어 만든 집이다."
  },
  {
    "era": "선사",
    "type": "생활",
    "term": "농경과 목축의 시작",
    "clue": "신석기 시대에는 곡식을 기르고 동물을 키우는 생활이 시작되었다."
  },
  {
    "era": "선사",
    "type": "유물",
    "term": "가락바퀴",
    "clue": "신석기 시대에 실을 뽑는 데 사용한 도구이다."
  },
  {
    "era": "선사",
    "type": "유물",
    "term": "고인돌",
    "clue": "청동기 시대 지배층의 무덤으로 널리 알려져 있다."
  },
  {
    "era": "선사",
    "type": "유물",
    "term": "비파형 동검",
    "clue": "청동기 시대를 대표하는 청동 무기이다."
  },
  {
    "era": "선사",
    "type": "유물",
    "term": "반달 돌칼",
    "clue": "청동기 시대 사람들이 곡식의 이삭을 자르는 데 사용한 도구이다."
  },
  {
    "era": "선사",
    "type": "사회",
    "term": "계급의 발생",
    "clue": "청동기 시대에는 재산의 차이가 커지며 지배하는 사람과 지배받는 사람이 생겨났다."
  },
  {
    "era": "고조선",
    "type": "건국",
    "term": "단군왕검 이야기",
    "clue": "고조선의 건국과 관련해 전해지는 이야기이다."
  },
  {
    "era": "고조선",
    "type": "법",
    "term": "8조법",
    "clue": "고조선 사회의 질서와 생명·재산을 중요하게 여긴 모습을 보여 주는 법이다."
  },
  {
    "era": "고조선",
    "type": "사회",
    "term": "제정일치 사회",
    "clue": "단군왕검이라는 이름을 통해 정치와 제사의 권한이 한 지도자에게 있었음을 짐작할 수 있다."
  },
  {
    "era": "삼국",
    "type": "인물",
    "term": "주몽",
    "clue": "고구려를 세운 인물로 전해진다."
  },
  {
    "era": "삼국",
    "type": "인물",
    "term": "광개토대왕",
    "clue": "고구려의 영토를 크게 넓히고 주변 지역에 영향력을 확대한 왕이다."
  },
  {
    "era": "삼국",
    "type": "인물",
    "term": "장수왕",
    "clue": "고구려의 수도를 평양으로 옮기고 남쪽으로 세력을 넓힌 왕이다."
  },
  {
    "era": "삼국",
    "type": "인물",
    "term": "을지문덕",
    "clue": "살수대첩에서 수나라 군대를 크게 물리친 고구려 장군이다."
  },
  {
    "era": "삼국",
    "type": "문화유산",
    "term": "고구려 고분 벽화",
    "clue": "고구려 사람들의 생활 모습과 생각을 그림으로 보여 주는 문화유산이다."
  },
  {
    "era": "삼국",
    "type": "인물",
    "term": "온조",
    "clue": "백제를 세운 인물로 전해진다."
  },
  {
    "era": "삼국",
    "type": "인물",
    "term": "근초고왕",
    "clue": "백제가 한강 유역을 바탕으로 크게 성장하고 활발히 교류하던 때의 왕이다."
  },
  {
    "era": "삼국",
    "type": "문화유산",
    "term": "무령왕릉",
    "clue": "백제의 왕과 왕비 무덤으로, 중국 남조 등과의 교류를 보여 주는 유물이 발견되었다."
  },
  {
    "era": "삼국",
    "type": "문화유산",
    "term": "백제 금동대향로",
    "clue": "백제의 뛰어난 금속 공예 기술과 예술성을 보여 주는 문화유산이다."
  },
  {
    "era": "삼국",
    "type": "인물",
    "term": "박혁거세",
    "clue": "신라를 세운 인물로 전해진다."
  },
  {
    "era": "삼국",
    "type": "인물",
    "term": "법흥왕",
    "clue": "신라에서 불교를 공인하고 나라의 제도를 정비한 왕이다."
  },
  {
    "era": "삼국",
    "type": "인물",
    "term": "진흥왕",
    "clue": "신라가 한강 유역을 차지하고 영토를 넓히던 때의 왕이다."
  },
  {
    "era": "삼국",
    "type": "사회",
    "term": "화랑도",
    "clue": "신라의 청소년 조직으로 인재를 기르고 나라를 위해 힘쓰는 데 중요한 역할을 했다."
  },
  {
    "era": "삼국",
    "type": "문화유산",
    "term": "첨성대",
    "clue": "신라 시대 경주에 세워진 천문 관측 시설로 알려져 있다."
  },
  {
    "era": "삼국",
    "type": "문화유산",
    "term": "신라 금관",
    "clue": "신라 지배층의 화려한 문화를 보여 주는 대표적인 유물이다."
  },
  {
    "era": "삼국",
    "type": "경제",
    "term": "가야의 철",
    "clue": "가야가 풍부하게 생산하여 주변 나라와 교역하는 데 활용한 중요한 자원이다."
  },
  {
    "era": "남북국",
    "type": "인물",
    "term": "김춘추",
    "clue": "신라의 삼국 통일 과정에서 외교와 정치 활동을 펼친 인물로 태종 무열왕이 되었다."
  },
  {
    "era": "남북국",
    "type": "인물",
    "term": "김유신",
    "clue": "신라의 삼국 통일 과정에서 군대를 이끌며 활약한 장군이다."
  },
  {
    "era": "남북국",
    "type": "인물",
    "term": "문무왕",
    "clue": "신라가 당과 싸우며 삼국 통일을 완성하던 때의 왕이다."
  },
  {
    "era": "남북국",
    "type": "문화유산",
    "term": "불국사",
    "clue": "통일 신라의 불교 문화를 대표하는 절이다."
  },
  {
    "era": "남북국",
    "type": "문화유산",
    "term": "석굴암",
    "clue": "통일 신라의 뛰어난 불교 조각과 건축 기술을 보여 주는 문화유산이다."
  },
  {
    "era": "남북국",
    "type": "인물",
    "term": "대조영",
    "clue": "고구려 유민과 말갈인을 이끌고 발해를 세운 인물이다."
  },
  {
    "era": "남북국",
    "type": "국가",
    "term": "발해",
    "clue": "고구려를 계승한 의식을 바탕으로 만주와 한반도 북부에서 성장한 나라이다."
  },
  {
    "era": "남북국",
    "type": "국가",
    "term": "해동성국",
    "clue": "발해가 크게 번성했을 때 불리던 이름이다."
  },
  {
    "era": "고려",
    "type": "인물",
    "term": "왕건",
    "clue": "후삼국을 통일하고 고려를 세워 태조가 된 인물이다."
  },
  {
    "era": "고려",
    "type": "정책",
    "term": "훈요 10조",
    "clue": "고려 태조가 후대 왕들에게 나라를 다스릴 때 지켜야 할 내용을 남긴 것이다."
  },
  {
    "era": "고려",
    "type": "인물",
    "term": "광종",
    "clue": "노비안검법을 실시하고 과거제를 받아들여 왕권을 강화한 고려의 왕이다."
  },
  {
    "era": "고려",
    "type": "제도",
    "term": "과거제",
    "clue": "시험을 통해 관리를 뽑는 제도로 고려 광종 때 시행되었다."
  },
  {
    "era": "고려",
    "type": "인물",
    "term": "서희",
    "clue": "거란 장수 소손녕과 외교 담판을 벌여 강동 6주를 확보한 인물이다."
  },
  {
    "era": "고려",
    "type": "인물",
    "term": "강감찬",
    "clue": "귀주대첩에서 거란군을 크게 물리친 고려의 장군이다."
  },
  {
    "era": "고려",
    "type": "전쟁",
    "term": "귀주대첩",
    "clue": "강감찬이 이끈 고려군이 거란군을 크게 물리친 전투이다."
  },
  {
    "era": "고려",
    "type": "인물",
    "term": "윤관",
    "clue": "여진을 상대하기 위해 별무반을 조직하고 북쪽 지역을 개척한 인물이다."
  },
  {
    "era": "고려",
    "type": "군사",
    "term": "별무반",
    "clue": "여진의 기병에 맞서기 위해 고려에서 조직한 특별 군대이다."
  },
  {
    "era": "고려",
    "type": "전쟁",
    "term": "몽골의 침입",
    "clue": "고려가 오랫동안 저항하며 강화도로 수도를 옮기는 계기가 된 외침이다."
  },
  {
    "era": "고려",
    "type": "저항",
    "term": "삼별초",
    "clue": "고려 정부가 개경으로 돌아간 뒤에도 몽골에 맞서 항쟁한 군대이다."
  },
  {
    "era": "고려",
    "type": "문화유산",
    "term": "팔만대장경",
    "clue": "몽골의 침입을 겪는 가운데 나라의 평안을 바라는 마음으로 다시 새긴 불교 경전 목판이다."
  },
  {
    "era": "고려",
    "type": "문화유산",
    "term": "고려청자",
    "clue": "맑은 비취색과 상감 기법으로 유명한 고려의 대표 도자기이다."
  },
  {
    "era": "고려",
    "type": "문화유산",
    "term": "직지",
    "clue": "1377년에 금속 활자로 인쇄된 책으로 현존하는 세계에서 가장 오래된 금속 활자 인쇄본으로 알려져 있다."
  },
  {
    "era": "고려",
    "type": "문화",
    "term": "금속 활자",
    "clue": "고려에서 발달한 인쇄 기술로 같은 글자를 여러 번 활용할 수 있었다."
  },
  {
    "era": "고려",
    "type": "역사서",
    "term": "삼국사기",
    "clue": "김부식 등이 편찬한 우리나라의 오래된 역사책 가운데 하나이다."
  },
  {
    "era": "고려",
    "type": "역사서",
    "term": "삼국유사",
    "clue": "일연이 옛 이야기와 불교 관련 기록 등을 모아 편찬한 역사책이다."
  },
  {
    "era": "고려",
    "type": "인물",
    "term": "최무선",
    "clue": "화약 제조 기술을 익혀 왜구를 물리치는 데 도움을 준 고려 말의 인물이다."
  },
  {
    "era": "고려",
    "type": "경제",
    "term": "벽란도",
    "clue": "고려 시대 국제 무역이 활발하게 이루어진 대표적인 항구이다."
  },
  {
    "era": "조선 전기",
    "type": "인물",
    "term": "이성계",
    "clue": "1392년 조선을 세우고 태조가 된 인물이다."
  },
  {
    "era": "조선 전기",
    "type": "수도",
    "term": "한양",
    "clue": "조선이 새 수도로 정한 곳으로 오늘날 서울에 해당한다."
  },
  {
    "era": "조선 전기",
    "type": "문화유산",
    "term": "경복궁",
    "clue": "조선이 한양에 세운 대표적인 궁궐이다."
  },
  {
    "era": "조선 전기",
    "type": "문화유산",
    "term": "종묘",
    "clue": "조선 왕과 왕비의 신주를 모시고 제사를 지내던 곳이다."
  },
  {
    "era": "조선 전기",
    "type": "인물",
    "term": "세종",
    "clue": "훈민정음을 창제하고 과학·농업·문화 발전을 이끈 조선의 왕이다."
  },
  {
    "era": "조선 전기",
    "type": "문자",
    "term": "훈민정음",
    "clue": "백성들이 우리말을 쉽게 적을 수 있도록 세종이 만든 문자이다."
  },
  {
    "era": "조선 전기",
    "type": "기관",
    "term": "집현전",
    "clue": "조선 세종 때 학자들이 학문을 연구하고 정책을 돕던 기관이다."
  },
  {
    "era": "조선 전기",
    "type": "인물",
    "term": "장영실",
    "clue": "세종 때 자격루 등 여러 과학 기구 제작에 참여한 과학 기술자이다."
  },
  {
    "era": "조선 전기",
    "type": "과학",
    "term": "측우기",
    "clue": "비가 얼마나 왔는지 재는 데 사용한 기구이다."
  },
  {
    "era": "조선 전기",
    "type": "과학",
    "term": "자격루",
    "clue": "물의 흐름을 이용해 시간을 재고 자동으로 시각을 알려 주던 물시계이다."
  },
  {
    "era": "조선 전기",
    "type": "과학",
    "term": "앙부일구",
    "clue": "해의 그림자를 이용해 시간을 알 수 있도록 만든 해시계이다."
  },
  {
    "era": "조선 전기",
    "type": "책",
    "term": "농사직설",
    "clue": "우리나라의 농사 경험을 정리해 만든 조선 세종 때의 농업 책이다."
  },
  {
    "era": "조선 전기",
    "type": "법전",
    "term": "경국대전",
    "clue": "조선의 통치 제도와 법을 정리한 대표적인 법전이다."
  },
  {
    "era": "조선 전기",
    "type": "전쟁",
    "term": "임진왜란",
    "clue": "1592년 일본군의 침략으로 시작된 전쟁이다."
  },
  {
    "era": "조선 전기",
    "type": "인물",
    "term": "이순신",
    "clue": "임진왜란 때 조선 수군을 이끌고 여러 해전에서 활약한 장군이다."
  },
  {
    "era": "조선 전기",
    "type": "군사",
    "term": "거북선",
    "clue": "임진왜란 때 조선 수군이 활용한 배로 이순신과 함께 널리 알려져 있다."
  },
  {
    "era": "조선 전기",
    "type": "저항",
    "term": "의병",
    "clue": "임진왜란 때 백성들이 자발적으로 조직해 일본군에 맞선 군대이다."
  },
  {
    "era": "조선 전기",
    "type": "인물",
    "term": "권율",
    "clue": "행주대첩에서 일본군을 물리치는 데 활약한 조선의 장군이다."
  },
  {
    "era": "조선 전기",
    "type": "전쟁",
    "term": "병자호란",
    "clue": "청의 침입으로 조선이 큰 피해를 입은 1636년의 전쟁이다."
  },
  {
    "era": "조선 후기",
    "type": "정책",
    "term": "대동법",
    "clue": "공납 대신 쌀·동전·베 등으로 세금을 내도록 하여 공납의 폐단을 줄인 제도이다."
  },
  {
    "era": "조선 후기",
    "type": "화폐",
    "term": "상평통보",
    "clue": "조선 후기 상품 거래가 활발해지면서 널리 사용된 동전이다."
  },
  {
    "era": "조선 후기",
    "type": "경제",
    "term": "장시",
    "clue": "조선 후기 여러 지역에서 정기적으로 열리며 물건을 사고팔던 시장이다."
  },
  {
    "era": "조선 후기",
    "type": "농업",
    "term": "모내기법",
    "clue": "조선 후기에 널리 퍼져 농업 생산을 늘리는 데 도움을 준 벼농사 방법이다."
  },
  {
    "era": "조선 후기",
    "type": "인물",
    "term": "영조",
    "clue": "탕평책을 실시하고 균역법을 시행한 조선 후기의 왕이다."
  },
  {
    "era": "조선 후기",
    "type": "인물",
    "term": "정조",
    "clue": "규장각을 키우고 수원 화성을 건설한 조선 후기의 왕이다."
  },
  {
    "era": "조선 후기",
    "type": "정책",
    "term": "탕평책",
    "clue": "여러 정치 세력의 심한 대립을 줄이고 인재를 고르게 쓰려 한 정책이다."
  },
  {
    "era": "조선 후기",
    "type": "정책",
    "term": "균역법",
    "clue": "백성들이 군역으로 내던 부담을 줄이기 위해 영조 때 실시한 제도이다."
  },
  {
    "era": "조선 후기",
    "type": "기관",
    "term": "규장각",
    "clue": "정조가 학문과 정책 연구를 위해 중요하게 키운 기관이다."
  },
  {
    "era": "조선 후기",
    "type": "문화유산",
    "term": "수원 화성",
    "clue": "정조가 건설한 계획도시의 성곽으로 과학 기술이 활용되었다."
  },
  {
    "era": "조선 후기",
    "type": "학문",
    "term": "실학",
    "clue": "백성의 생활에 도움이 되는 현실적인 문제를 연구하려 한 학문이다."
  },
  {
    "era": "조선 후기",
    "type": "인물",
    "term": "정약용",
    "clue": "실학을 연구하고 수원 화성 건설에 참여한 조선 후기의 학자이다."
  },
  {
    "era": "조선 후기",
    "type": "기술",
    "term": "거중기",
    "clue": "무거운 물건을 들어 올리는 데 도움을 주어 수원 화성 건설에 활용된 기구이다."
  },
  {
    "era": "조선 후기",
    "type": "인물",
    "term": "김정호",
    "clue": "대동여지도를 만든 인물로 널리 알려져 있다."
  },
  {
    "era": "조선 후기",
    "type": "지도",
    "term": "대동여지도",
    "clue": "조선 후기 김정호가 만든 전국 지도이다."
  },
  {
    "era": "조선 후기",
    "type": "문화",
    "term": "판소리",
    "clue": "한 명의 소리꾼이 북 장단에 맞춰 이야기를 노래와 말로 풀어내는 공연 예술이다."
  },
  {
    "era": "조선 후기",
    "type": "문화",
    "term": "탈놀이",
    "clue": "탈을 쓰고 춤과 재담으로 사회 모습을 풍자하기도 한 서민 문화이다."
  },
  {
    "era": "조선 후기",
    "type": "문화",
    "term": "민화",
    "clue": "조선 후기에 서민들이 생활 속 바람과 소망 등을 자유롭게 표현한 그림이다."
  },
  {
    "era": "개항기",
    "type": "인물",
    "term": "흥선대원군",
    "clue": "통상 수교 거부 정책을 펼치고 경복궁을 다시 지은 인물이다."
  },
  {
    "era": "개항기",
    "type": "조약",
    "term": "강화도 조약",
    "clue": "1876년 조선이 일본과 맺은 최초의 근대적 조약으로 불평등한 내용이 포함되었다."
  },
  {
    "era": "개항기",
    "type": "변화",
    "term": "개항",
    "clue": "조선의 항구가 외국에 열리며 새로운 문물과 상인이 들어오기 시작한 변화이다."
  },
  {
    "era": "개항기",
    "type": "운동",
    "term": "동학 농민 운동",
    "clue": "1894년 농민들이 부패한 정치와 외세의 침략에 맞서 사회 개혁을 요구한 운동이다."
  },
  {
    "era": "개항기",
    "type": "인물",
    "term": "전봉준",
    "clue": "동학 농민 운동을 이끈 대표적인 인물이다."
  },
  {
    "era": "개항기",
    "type": "개혁",
    "term": "갑오개혁",
    "clue": "1894년 추진되어 신분제 폐지 등 여러 제도 변화가 이루어진 개혁이다."
  },
  {
    "era": "개항기",
    "type": "단체",
    "term": "독립협회",
    "clue": "자주독립과 국민의 권리 확대 등을 주장하며 활동한 단체이다."
  },
  {
    "era": "개항기",
    "type": "문화유산",
    "term": "독립문",
    "clue": "독립협회가 자주독립의 뜻을 나타내기 위해 세운 건축물이다."
  },
  {
    "era": "대한제국",
    "type": "국가",
    "term": "대한제국",
    "clue": "고종이 1897년에 선포하고 황제에 오른 나라이다."
  },
  {
    "era": "대한제국",
    "type": "개혁",
    "term": "광무개혁",
    "clue": "대한제국이 근대 국가를 만들기 위해 토지 조사와 산업 진흥 등을 추진한 개혁이다."
  },
  {
    "era": "국권 피탈",
    "type": "조약",
    "term": "을사늑약",
    "clue": "1905년 일본이 강제로 체결하여 대한제국의 외교권을 빼앗은 조약이다."
  },
  {
    "era": "국권 피탈",
    "type": "저항",
    "term": "의병 운동",
    "clue": "일본의 침략과 국권 침탈에 맞서 무장 투쟁을 벌인 움직임이다."
  },
  {
    "era": "국권 피탈",
    "type": "인물",
    "term": "안중근",
    "clue": "1909년 하얼빈에서 이토 히로부미를 저격한 독립운동가이다."
  },
  {
    "era": "국권 피탈",
    "type": "운동",
    "term": "국채 보상 운동",
    "clue": "나라의 빚을 국민의 힘으로 갚아 경제적 자주성을 지키려 한 운동이다."
  },
  {
    "era": "일제강점기",
    "type": "운동",
    "term": "3·1 운동",
    "clue": "1919년 전국 각지에서 사람들이 독립을 외치며 참여한 대규모 독립운동이다."
  },
  {
    "era": "일제강점기",
    "type": "인물",
    "term": "유관순",
    "clue": "3·1 운동 때 아우내 장터 만세 운동에 참여한 독립운동가이다."
  },
  {
    "era": "일제강점기",
    "type": "정부",
    "term": "대한민국 임시정부",
    "clue": "3·1 운동 이후 1919년 상하이에서 수립되어 독립운동을 이끈 정부이다."
  },
  {
    "era": "일제강점기",
    "type": "인물",
    "term": "김구",
    "clue": "대한민국 임시정부에서 활동하며 독립운동을 이끈 대표적인 인물이다."
  },
  {
    "era": "일제강점기",
    "type": "전투",
    "term": "봉오동 전투",
    "clue": "1920년 홍범도 등이 이끈 독립군이 일본군을 물리친 전투이다."
  },
  {
    "era": "일제강점기",
    "type": "인물",
    "term": "홍범도",
    "clue": "봉오동 전투에서 독립군을 이끌고 활약한 인물이다."
  },
  {
    "era": "일제강점기",
    "type": "전투",
    "term": "청산리 대첩",
    "clue": "1920년 김좌진 등이 이끈 독립군이 청산리 일대에서 일본군과 싸운 전투이다."
  },
  {
    "era": "일제강점기",
    "type": "인물",
    "term": "김좌진",
    "clue": "청산리 대첩에서 북로군정서군을 이끌고 활약한 인물이다."
  },
  {
    "era": "일제강점기",
    "type": "인물",
    "term": "윤봉길",
    "clue": "1932년 상하이 훙커우 공원에서 의거를 일으킨 독립운동가이다."
  },
  {
    "era": "일제강점기",
    "type": "인물",
    "term": "이봉창",
    "clue": "1932년 일본 도쿄에서 일왕을 향해 폭탄을 던지는 의거를 벌인 독립운동가이다."
  },
  {
    "era": "일제강점기",
    "type": "단체",
    "term": "조선어학회",
    "clue": "우리말과 한글을 연구하고 사전을 만들기 위해 노력한 단체이다."
  },
  {
    "era": "일제강점기",
    "type": "군대",
    "term": "한국광복군",
    "clue": "대한민국 임시정부가 조직한 군대로 연합군과 함께 독립 전쟁을 준비했다."
  },
  {
    "era": "광복 이후",
    "type": "사건",
    "term": "광복",
    "clue": "1945년 8월 15일 우리나라가 일제의 식민 지배에서 벗어난 일이다."
  },
  {
    "era": "광복 이후",
    "type": "정부",
    "term": "대한민국 정부 수립",
    "clue": "1948년 8월 15일 대한민국 정부가 수립된 일이다."
  },
  {
    "era": "6·25 전쟁",
    "type": "전쟁",
    "term": "6·25 전쟁",
    "clue": "1950년 6월 25일 시작되어 한반도에 큰 피해를 남긴 전쟁이다."
  },
  {
    "era": "6·25 전쟁",
    "type": "협정",
    "term": "정전 협정",
    "clue": "1953년 7월 27일 체결되어 6·25 전쟁의 전투를 멈추게 한 협정이다."
  }
];

export const ERA_ORDER = Object.freeze(['선사','고조선','삼국','남북국','고려','조선 전기','조선 후기','개항기','대한제국','국권 피탈','일제강점기','광복 이후','6·25 전쟁']);
const ERA_OPTIONS = [...ERA_ORDER];

function hasBatchim(value) {
  const text=String(value||'').trim(), code=text.charCodeAt(text.length-1);
  return code>=0xac00&&code<=0xd7a3 ? ((code-0xac00)%28)!==0 : false;
}
function topicLabel(value){return String(value)+(hasBatchim(value)?'은':'는');}

function hashText(value) {
  let h = 2166136261;
  for (const ch of String(value)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h >>> 0;
}

function pickDistractors(index, field, count = 3) {
  const fact = CORE_FACTS[index];
  const sameType = CORE_FACTS.map((f,i)=>({f,i})).filter(x => x.i !== index && x.f.type === fact.type);
  const sameEra = CORE_FACTS.map((f,i)=>({f,i})).filter(x => x.i !== index && x.f.era === fact.era && x.f.type !== fact.type);
  const rest = CORE_FACTS.map((f,i)=>({f,i})).filter(x => x.i !== index);
  const pool = [...sameType, ...sameEra, ...rest];
  const used = new Set([fact[field]]);
  const out = [];
  let cursor = hashText(fact.term + ':' + field) % Math.max(1, pool.length);
  for (let step = 0; out.length < count && step < pool.length * 2; step += 1) {
    const item = pool[(cursor + step * 7) % pool.length]?.f?.[field];
    if (item && !used.has(item)) { used.add(item); out.push(item); }
  }
  return out.slice(0, count);
}

function eraDistractors(correct, seed) {
  const rest = ERA_OPTIONS.filter(x => x !== correct);
  const out = [];
  let cursor = hashText(seed) % rest.length;
  for (let i = 0; out.length < 3 && i < rest.length * 2; i += 1) {
    const value = rest[(cursor + i * 5) % rest.length];
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

const TERM_PROMPTS = [
  clue => `다음 설명에 해당하는 것은 무엇일까요?\n${clue}`,
  clue => `설명을 읽고 알맞은 답을 고르세요.\n${clue}`,
  clue => `이 역사 단서가 가리키는 것은 무엇일까요?\n${clue}`,
  clue => `다음 내용과 가장 관련 깊은 것은 무엇일까요?\n${clue}`,
  clue => `역사 탐정 문제입니다. 단서를 보고 정답을 찾으세요.\n${clue}`
];
const CLUE_PROMPTS = [
  term => `‘${term}’에 대한 설명으로 알맞은 것은 무엇일까요?`,
  term => `‘${term}’와 가장 관련 있는 설명을 고르세요.`,
  term => `‘${term}’에 알맞은 설명을 고르세요.`
];
const ERA_PROMPTS = [
  term => `‘${term}’와 가장 관련 깊은 시대·시기는 언제일까요?`,
  term => `‘${term}’를 공부할 때 함께 살펴볼 역사 시기로 알맞은 것은?`
];

function buildBank() {
  const out = [];
  CORE_FACTS.forEach((fact, index) => {
    const termOptions = [fact.term, ...pickDistractors(index, 'term')];
    const clueOptions = [fact.clue, ...pickDistractors(index, 'clue')];
    TERM_PROMPTS.forEach((makePrompt, variant) => out.push({
      id:`term-${index}-${variant}`, era:fact.era, difficulty:variant < 2 ? 1 : 2,
      q:makePrompt(fact.clue), o:[...termOptions], a:0,
      e:`${fact.term}: ${fact.clue}`, sourceFact:index, family:'identify'
    }));
    CLUE_PROMPTS.forEach((makePrompt, variant) => out.push({
      id:`clue-${index}-${variant}`, era:fact.era, difficulty:variant === 0 ? 1 : 2,
      q:makePrompt(fact.term), o:[...clueOptions], a:0,
      e:`${fact.term}: ${fact.clue}`, sourceFact:index, family:'explain'
    }));
    ERA_PROMPTS.forEach((makePrompt, variant) => out.push({
      id:`era-${index}-${variant}`, era:fact.era, difficulty:variant + 1,
      q:makePrompt(fact.term), o:[fact.era, ...eraDistractors(fact.era, fact.term + variant)], a:0,
      e:`${topicLabel(fact.term)} ${fact.era}와 가장 관련 깊습니다. ${fact.clue}`, sourceFact:index, family:'era'
    }));
  });
  return out;
}

export const QUESTION_BANK = Object.freeze(buildBank());
export const CORE_HISTORY_FACTS = Object.freeze(CORE_FACTS);
export const QUESTION_BANK_SIZE = QUESTION_BANK.length;

export function shuffledQuestion(question, random = Math.random) {
  const order = [0,1,2,3];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...question,
    o: order.map(i => question.o[i]),
    a: order.indexOf(question.a)
  };
}

export function pickHistoryQuestions(count = 15, random = Math.random, orderMode = 'random') {
  const wanted = Math.max(1, Math.min(Number(count)||15, CORE_FACTS.length));
  let factIndexes = Array.from({length:CORE_FACTS.length}, (_,i)=>i);

  if (orderMode === 'chronological') {
    factIndexes.sort((a,b) => {
      const eraDiff = ERA_ORDER.indexOf(CORE_FACTS[a].era) - ERA_ORDER.indexOf(CORE_FACTS[b].era);
      return eraDiff || a - b;
    });
    if (wanted < factIndexes.length) {
      factIndexes = Array.from({length:wanted}, (_,i) => {
        if (wanted === 1) return factIndexes[0];
        const position = Math.round(i * (factIndexes.length - 1) / (wanted - 1));
        return factIndexes[position];
      });
    }
  } else {
    for (let i = factIndexes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [factIndexes[i], factIndexes[j]] = [factIndexes[j], factIndexes[i]];
    }
    factIndexes = factIndexes.slice(0,wanted);
  }

  return factIndexes.map((factIndex,position) => {
    const candidates = QUESTION_BANK.filter(q => q.sourceFact === factIndex);
    const variantIndex = orderMode === 'chronological'
      ? (position * 3 + factIndex) % candidates.length
      : Math.floor(random() * candidates.length);
    return shuffledQuestion(candidates[variantIndex], random);
  });
}

export function chronologicalQuestionIndexes(count = 15) {
  const wanted = Math.max(1, Math.min(Number(count)||15, CORE_FACTS.length));
  const facts = Array.from({length:CORE_FACTS.length}, (_,i)=>i).sort((a,b) => {
    const eraDiff = ERA_ORDER.indexOf(CORE_FACTS[a].era) - ERA_ORDER.indexOf(CORE_FACTS[b].era);
    return eraDiff || a - b;
  });
  const selected = wanted >= facts.length ? facts : Array.from({length:wanted}, (_,i) => {
    if (wanted === 1) return facts[0];
    return facts[Math.round(i * (facts.length - 1) / (wanted - 1))];
  });
  return selected.map((factIndex,position) => {
    const candidates = QUESTION_BANK.map((q,i)=>({q,i})).filter(x => x.q.sourceFact === factIndex);
    return candidates[(position * 3 + factIndex) % candidates.length].i;
  });
}
