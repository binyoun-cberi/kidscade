/* Korea historical calendar for One Life v10.
 * FACTS: public historical chronology; EFFECTS: separate, explicitly fictional game modeling.
 * Not a country-specific demographic dataset or a claim of personal participation.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeHistoryData10=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const SOURCES=Object.freeze({
 early:{label:'국사편찬위원회 우리역사넷',url:'https://contents.history.go.kr/'},
 modern:{label:'국사편찬위원회 우리역사넷 — 현대 사회의 발전',url:'https://contents.history.go.kr/front/ta/view.do?levelId=ta_h62_0050'},
 records:{label:'국가기록원',url:'https://www.archives.go.kr/'},
 health:{label:'질병관리청',url:'https://www.kdca.go.kr/'},
 economy:{label:'한국은행',url:'https://www.bok.or.kr/'}
});
// [year, title, factual context, topic, source group, optional scenario key]
// Some years contain two independently recorded facts.
const ROWS=[
 [1905,'을사늑약','대한제국의 외교권을 빼앗는 조약이 강제로 체결되었다.','sovereignty','early'],
 [1907,'고종 강제 퇴위','고종 황제가 강제로 퇴위하고 대한제국 군대가 해산되었다.','sovereignty','early'],
 [1910,'국권 피탈','대한제국의 국권이 일본에 빼앗겼다.','colonial','early','colonial-school'],
 [1912,'토지 조사 사업','일제의 토지 조사 사업이 진행되며 식민지 토지 제도가 바뀌었다.','colonial','early','rural-land'],
 [1919,'3·1운동','3월부터 독립을 외치는 만세운동이 전국으로 확산되었다.','independence','early','community-news'],
 [1919,'대한민국 임시정부 수립','상하이에서 대한민국 임시정부가 수립되었다.','independence','early'],
 [1920,'청산리 전투','독립군 부대들이 청산리 일대에서 일본군과 전투를 벌였다.','independence','early'],
 [1926,'6·10만세운동','순종의 장례를 계기로 학생 등이 독립을 요구하는 만세운동을 전개했다.','independence','early'],
 [1929,'광주학생항일운동','광주에서 시작된 학생들의 항일운동이 여러 지역으로 확산되었다.','education','early','colonial-school'],
 [1932,'윤봉길 의거','윤봉길이 상하이 훙커우 공원에서 항일 의거를 실행했다.','independence','early'],
 [1937,'중일전쟁 발발','중일전쟁이 시작되며 일본의 전시 동원 체제가 확대되었다.','mobilization','early','wartime-labor'],
 [1938,'국가총동원법 시행','일본의 국가총동원법 아래 전시 자원·인력 동원이 강화되었다.','mobilization','early','wartime-labor'],
 [1940,'한국광복군 창설','대한민국 임시정부 산하 한국광복군이 창설되었다.','independence','early'],
 [1943,'카이로 선언','연합국 지도자들이 한국의 독립에 관한 방침을 선언했다.','independence','early'],
 [1945,'광복','8월 15일 일본의 식민 지배가 끝나고 한국이 광복을 맞았다.','liberation','modern','liberation'],
 [1948,'대한민국 정부 수립','8월 15일 대한민국 정부가 수립되었다.','government','modern','transition'],
 [1950,'한국전쟁 발발','6월 25일 전쟁이 시작되어 한반도 전역에 막대한 피해가 발생했다.','war','modern','war-start'],
 [1951,'1·4 후퇴','전쟁 중 1·4 후퇴와 함께 많은 사람들이 피란길에 올랐다.','war','modern','war-years'],
 [1953,'정전협정 체결','7월 27일 정전협정이 체결되었다. 전쟁이 법적으로 끝난 것은 아니다.','war','modern','armistice'],
 [1954,'전후 복구 시기','정전 이후 주거·교육·산업 기반을 복구하는 작업이 이어졌다.','reconstruction','modern','rebuild'],
 [1960,'4·19혁명','부정선거에 항의한 학생과 시민의 움직임이 4·19혁명으로 이어졌다.','democracy','modern','civic-life'],
 [1961,'5·16 군사정변','군부의 군사정변으로 정권이 교체되었다.','government','modern'],
 [1962,'경제개발 5개년 계획 시작','제1차 경제개발 5개년 계획이 시행되었다.','industrial','modern','industrial-choice'],
 [1965,'한일기본조약 체결','대한민국과 일본 사이에 국교 정상화를 위한 조약이 체결되었다.','diplomacy','modern'],
 [1970,'경부고속도로 개통','경부고속도로가 개통되어 교통·물류 환경이 달라졌다.','industrial','modern','mobility'],
 [1970,'전태일 분신 항거','전태일이 노동자들의 열악한 노동 조건 개선을 호소하며 분신했다.','labor','modern','labor-rights'],
 [1972,'10월 유신','유신체제가 시작되어 정치적 자유가 제약되었다.','government','modern','civic-life'],
 [1974,'서울 지하철 1호선 개통','서울 지하철 1호선이 개통되었다.','mobility','modern'],
 [1979,'10·26 사건','박정희 대통령이 피살되었다.','government','modern'],
 [1980,'5·18민주화운동','광주에서 민주화를 요구한 시민들에 대한 국가폭력이 있었고 시민들이 저항했다.','democracy','modern','civic-life'],
 [1983,'이산가족 찾기 방송','방송을 통해 전쟁으로 헤어진 가족을 찾으려는 노력이 이어졌다.','family','modern','family-memories'],
 [1987,'6월 민주항쟁','전국에서 민주화를 요구하는 시민들의 항쟁이 전개되었다.','democracy','modern','civic-life'],
 [1988,'서울 올림픽 개최','서울에서 하계 올림픽이 개최되었다.','society','modern','community-festival'],
 [1989,'해외여행 자유화','국민들의 해외여행에 대한 규제가 대폭 완화되었다.','mobility','modern'],
 [1991,'남북한 유엔 동시 가입','대한민국과 북한이 유엔에 동시 가입했다.','diplomacy','modern'],
 [1993,'문민정부 출범','김영삼 정부가 출범했다.','government','modern'],
 [1997,'외환위기와 IMF 구제금융','외환위기 속에서 대한민국이 IMF에 구제금융을 요청했다.','economy','economy','financial-crisis'],
 [1998,'금 모으기 운동','외환위기 극복을 위한 국민적 금 모으기 운동이 전개되었다.','economy','records','recovery'],
 [2000,'제1차 남북정상회담','평양에서 첫 남북정상회담이 열렸다.','diplomacy','modern'],
 [2002,'한일 월드컵','대한민국과 일본이 FIFA 월드컵을 공동 개최했다.','society','records','community-festival'],
 [2004,'KTX 개통','경부고속철도 1단계가 개통되며 고속철도 시대가 시작되었다.','mobility','records'],
 [2008,'세계 금융위기','세계 금융위기로 국내 경제에도 충격이 전해졌다.','economy','economy','financial-crisis'],
 [2010,'서울 G20 정상회의','서울에서 G20 정상회의가 열렸다.','diplomacy','records'],
 [2016,'촛불집회 확산','시민들이 전국에서 대규모 촛불집회를 이어 갔다.','democracy','records','civic-life'],
 [2017,'대통령 파면 결정','헌법재판소가 대통령 탄핵심판에서 파면을 선고했다.','government','records'],
 [2018,'평창 동계올림픽','평창에서 동계올림픽이 개최되었다.','society','records','community-festival'],
 [2020,'코로나19 팬데믹','코로나19 확산과 방역 조치로 학교·일터·일상이 영향을 받았다.','health','health','pandemic'],
 [2021,'코로나19 예방접종 시행','코로나19 예방접종이 확대되며 방역과 일상의 변화가 이어졌다.','health','health','pandemic-recovery']

 [1904,'러일전쟁 발발','러시아와 일본 사이에 전쟁이 시작되어 대한제국을 둘러싼 국제정세가 크게 변했다.','sovereignty','early','community-news'],
 [1915,'조선물산공진회 개최','일제가 경복궁 일대에서 조선물산공진회를 열며 식민 통치를 선전했다.','colonial','early'],
 [1923,'간토대지진 당시 조선인 학살','일본 간토대지진 이후 유언비어와 차별 속에 많은 조선인이 학살되었다.','violence','early'],
 [1931,'만주사변','일본군의 만주 침략으로 동아시아의 군사적 긴장이 커졌다.','mobilization','early','wartime-labor'],
 [1936,'손기정 베를린 올림픽 마라톤 우승','손기정이 베를린 올림픽 마라톤에서 우승했다. 당시 조선은 일본 식민 지배 아래 있었다.','society','early'],
 [1942,'조선어학회 사건','일제가 조선어학회 관계자들을 탄압해 우리말 연구와 보급 활동이 큰 어려움을 겪었다.','education','early','colonial-school'],
 [1943,'조선인 학도 특별지원병제','일본이 식민지 조선의 학생들에게 전쟁 동원을 확대하는 제도를 시행했다.','mobilization','early','wartime-labor'],
 [1946,'광복 이후 교육 제도의 재정비','광복 이후 학교와 교육 제도를 다시 구성하는 노력이 진행되었다.','education','modern','transition'],
 [1948,'제주4·3사건','1947년부터 1954년까지 제주에서 국가폭력과 무력 충돌 등으로 다수의 민간인이 희생된 사건이 이어졌다.','violence','records'],
 [1950,'인천상륙작전','9월에 인천상륙작전이 실시되어 한국전쟁의 전황이 달라졌다.','war','modern'],
 [1952,'부산 정치 파동','한국전쟁 중 부산에서 정부와 국회 사이에 정치적 갈등과 강압적 조치가 일어났다.','government','modern'],
 [1964,'6·3항쟁','한일 국교 정상화에 반대하는 학생과 시민들의 시위가 전개되었다.','democracy','modern','civic-life'],
 [1968,'1·21사태','북한 무장공비가 청와대 공격을 시도한 사건이 발생했다.','security','modern'],
 [1969,'3선 개헌','대통령의 세 번째 연임을 허용하는 헌법 개정이 이루어졌다.','government','modern'],
 [1970,'새마을운동 시작','농촌 생활환경과 생산 기반 개선을 목표로 새마을운동이 시작되었다.','rural','modern','rural-land'],
 [1979,'부마민주항쟁','부산과 마산에서 유신체제에 반대하는 시민과 학생들의 항쟁이 일어났다.','democracy','modern','civic-life'],
 [1987,'6·29선언','대통령 직선제 개헌을 수용한다는 선언이 발표되었다.','democracy','modern'],
 [1995,'전국 동시 지방선거','광역·기초 지방자치단체장 등을 주민이 직접 선출하는 선거가 실시되었다.','government','records'],
 [1996,'경제협력개발기구 OECD 가입','대한민국이 경제협력개발기구에 가입했다.','economy','economy'],
 [2014,'세월호 참사','4월 세월호 침몰로 많은 희생자가 발생했으며 사회적 안전과 책임에 관한 논의가 이어졌다.','safety','records'],
 [2022,'이태원 참사','10월 서울 이태원에서 대규모 인파 사고로 많은 사람들이 희생되었다.','safety','records']
];
const FACTS=Object.freeze(ROWS.map(([year,title,detail,topic,sourceId,scenario],n)=>
 Object.freeze({id:'kr-'+year+'-'+n,year,title,detail,topic,
   sourceId,source:SOURCES[sourceId].url,sourceLabel:SOURCES[sourceId].label,scenario:scenario||null})));
function forYear(year){return FACTS.filter(e=>e.year===year);}
function period(year){
 if(year<1910)return '대한제국 시기';
 if(year<1945)return '일제강점기';
 if(year<1948)return '광복 이후 전환기';
 if(year<=1953)return '분단·한국전쟁 시기';
 if(year<1962)return '전후 복구·정치 변동기';
 if(year<1988)return '산업화·민주화의 시대';
 if(year<1997)return '민주화 이후 사회 변화';
 if(year<2010)return '외환위기·정보화 시대';
 if(year<2020)return '디지털 사회';
 return '현대 한국';
}
function legalFor(year,key){
 if(key==='mortgage')return year>=1990;
 if(key==='smartphone')return year>=2007;
 if(key==='university')return year>=1946;
 if(key==='highspeedRail')return year>=2004;
 return true;
}
return Object.freeze({FACTS,SOURCES,forYear,period,legalFor});
});
