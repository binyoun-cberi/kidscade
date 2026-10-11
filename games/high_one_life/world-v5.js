/* ONE LIFE v5 — World stories.
 * Geography is context rather than destiny. All future conflicts, crises, personal
 * investment returns and occupation probabilities are hypothetical game fiction.
 * No country-level risk percentages here purport to be real-life forecasts.
 * Distressing events are text-only and focus on safety, rights and recovery.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeWorld2,root?.OneLifeWorld3,root?.OneLifeWorld4);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeWorld5=api;
})(typeof window!=='undefined'?window:null,function(Sim,W2,W3,W4){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const GROUPS=Object.freeze({
  southAsia:'인도,파키스탄,방글라데시,네팔,스리랑카,아프가니스탄',
  eastAsia:'중국,일본,대한민국,북한,대만',
  southEastAsia:'인도네시아,필리핀,베트남,태국,미얀마,말레이시아,캄보디아,라오스',
  westernEurope:'프랑스,독일,영국,스페인,이탈리아,네덜란드,스위스,벨기에,스웨덴,핀란드,포르투갈,그리스,오스트리아,모나코',
  eastEurope:'러시아,우크라이나,폴란드,루마니아,체코,헝가리,벨라루스',
  centralAsia:'우즈베키스탄,카자흐스탄,타지키스탄,아제르바이잔,키르기스스탄',
  northAfrica:'이집트,모로코,수단,튀니지,리비아',
  westAfrica:'나이지리아,가나,세네갈,니제르,코트디부아르,말리,부르키나파소,베냉,기니',
  eastAfrica:'에티오피아,케냐,우간다,탄자니아,소말리아,르완다,부룬디,마다가스카르',
  centralSouthAfrica:'콩고민주공화국,앙골라,남아프리카공화국,모잠비크,잠비아,말라위,차드,카메룬,짐바브웨',
  middleEast:'이란,튀르키예,이라크,예멘,사우디아라비아,시리아,이스라엘,아랍에미리트,요르단',
  latinAmerica:'브라질,멕시코,아르헨티나,콜롬비아,페루,칠레,과테말라,에콰도르,볼리비아,아이티,쿠바,도미니카공화국,온두라스,파라과이,니카라과',
  northAmerica:'미국,캐나다',
  pacific:'호주,파푸아뉴기니'
 });
 const groupFor=country=>Object.keys(GROUPS).find(key=>GROUPS[key].split(',').includes(country))||'other';
 // Events are deliberately set in a possible future, never as predictions of
 // countries' security or military situation decades from today.
 const templates=[];
 const entry=(id,group,start,end,lines,change,options={})=>{
  templates.push({id,group,start,end,lines,change,weight:options.weight??1,
   needs:options.needs||[],country:options.country||null,once:options.once!==false,
   serious:!!options.serious,rarity:options.rarity||'ordinary'});
 };
 // 16 universal families with 3 authored variations each.
 entry('science-work','all',16,68,['학교에서 과학 실험을 함께 하며 새 관심사가 생겼다.','작은 발명을 시도하다 예상하지 못한 해결책을 찾았다.','과학 동아리에서 배운 것을 주변 사람들과 나누었다.'],{knowledge:5,skill:1,tag:'stem'});
 entry('sports','all',7,84,['친구와 운동하며 서로를 응원했다.','몸에 맞는 새로운 운동을 배웠다.','운동 모임에서 사람들과 함께 시간을 보냈다.'],{health:3,bonds:3,tag:'sports'});
 entry('arts','all',7,92,['지역 공연에 참여하여 무대에 올랐다.','그림과 음악으로 자신을 표현했다.','작은 공연장에서 새로운 친구를 만났다.'],{happiness:5,network:1,tag:'arts'});
 entry('volunteer-route','all',14,85,['동네 도서관에서 봉사 활동을 했다.','서로 다른 세대가 함께 마을 일을 도왔다.','지역 모임을 통해 도움이 필요한 사람을 만났다.'],{community:2,bonds:4,tag:'volunteer-route'});
 entry('climate-response','all',12,95,['이상 기후로 마을이 피해를 입어 서로 도왔다.','지역의 기후 적응 시설을 만드는 데 참여했다.','폭염에 대비해 생활 습관과 일하는 시간을 조절했다.'],{community:1,health:-2,tag:'climate-adapt'});
 entry('small-farm','all',12,78,['농작물 가격이 변하면서 가족의 지출도 달라졌다.','직접 기른 채소를 이웃과 나누었다.','지역 농장에서 새로운 재배 기술을 배웠다.'],{skill:1,money:800,tag:'farm-link'},{needs:['rural'],weight:1.8});
 entry('urban-rent','all',20,75,['월세가 올라 다른 집을 알아보았다.','임대주택의 지원 제도를 알게 되었다.','주거비 부담을 줄이기 위해 이웃과 정보를 나누었다.'],{money:-2500,network:1,tag:'housing-pressure'},{needs:['urban']});
 entry('rural-transport','all',9,72,['버스가 줄어 통학과 출근 계획을 바꿔야 했다.','지역 이동 서비스를 이용하면서 학교에 가기 쉬워졌다.','이웃이 마을의 교통 문제를 함께 해결했다.'],{community:1,learning:1,tag:'transport-access'},{needs:['rural']});
 entry('health-visit','all',14,95,['정기검진으로 건강을 돌보았다.','지역 보건 활동을 통해 필요한 정보를 얻었다.','예방접종과 건강 관리의 중요성을 배웠다.'],{health:5,tag:'prevention'});
 entry('disability-access','all',20,97,['접근 가능한 교통과 직장 환경을 찾았다.','재활과 보조기기의 도움으로 일상 활동을 이어 갔다.','주변의 협력으로 학교와 일터의 접근성을 높였다.'],{health:3,network:2,tag:'access-support'},{needs:['rehabilitation'],weight:2.4});
 entry('late-training','all',24,85,['몇 년 전 배워 둔 기술을 새로운 일에 활용했다.','늦은 나이에 직업 훈련을 다시 시작했다.','장학 지원을 받아 일과 공부를 병행했다.'],{skill:2,learning:2,tag:'late-training'},{needs:['working'],weight:1.2});
 entry('unexpected-inheritance','all',24,93,['먼 친척에게 작은 유산을 받았다.','돌아가신 가족이 남긴 물건을 정리하며 추억을 떠올렸다.','상속 절차를 알아보며 재산 관리의 필요성을 배웠다.'],{money:5000,tag:'inheritance'},{weight:.30,rarity:'uncommon'});
 entry('long-care','all',26,87,['몸이 불편한 친척의 진료를 함께 준비했다.','돌봄 부담을 나누기 위해 가족이 역할을 조정했다.','지역 돌봄 서비스를 이용하면서 일과 가족을 함께 챙겼다.'],{bonds:4,money:-1400,tag:'family-care'},{weight:1.1});
 entry('social-change','all',18,89,['주민 공청회에 참여해 의견을 냈다.','지역의 권리와 생활환경에 관한 토론을 들었다.','정책 변경에 대해 이웃과 합법적이고 평화롭게 의견을 나눴다.'],{knowledge:4,community:2,tag:'civic'});
 entry('peaceful-protest','all',18,83,['평화로운 집회에 참여해 생각을 전했다.','시민단체에서 안전한 행사 진행을 도왔다.','지역의 현안에 대해 합법적인 서명운동에 참여했다.'],{community:3,network:2,tag:'activism'},{needs:['civic'],weight:.8});
 entry('public-aid','all',12,90,['행정기관의 도움으로 교육 비용 부담을 덜었다.','주민센터에서 필요한 생활 지원을 안내받았다.','지역 자조 모임에서 생활 정보를 공유했다.'],{money:1200,network:1,tag:'local-aid'},{needs:['hardship'],weight:2.0});
 // Regional culture and livelihoods: options are possibilities, not assigned traits.
 entry('south-asian-festival','southAsia',8,85,['다양한 이웃과 지역의 축제에 참여했다.','학교에서 서로 다른 종교와 언어에 대해 배웠다.','다양한 전통을 가진 가족들이 음식을 나누었다.'],{bonds:4,knowledge:3,tag:'cultural-exchange'},{weight:2.2});
 entry('south-asian-monastic','southAsia',19,83,['수행 생활의 규칙을 배우며 공동체의 일을 도왔다.','수도 공동체에서 공부와 명상에 시간을 썼다.','수행 경험을 지역 교육과 돌봄 활동에 활용했다.'],{community:3,knowledge:5,tag:'monastic-life'},{needs:['monastic'],weight:4});
 entry('south-asian-seva','southAsia',14,88,['구르드와라의 랑가르에서 누구나 먹을 식사를 함께 준비했다.','시크교 공동체의 세바 봉사에 참여했다.','봉사 활동을 통해 평등과 나눔을 배웠다.'],{community:3,bonds:5,tag:'seva'},{needs:['sikh-service'],weight:4});
 entry('south-asia-education','southAsia',12,58,['가족과 상의해 지역 교육기관을 찾았다.','언어와 기술을 배우는 지역 프로그램에 등록했다.','통학과 비용 문제를 해결할 방법을 찾았다.'],{learning:2,knowledge:4,tag:'education-access'});
 entry('south-asia-market','southAsia',20,66,['가족과 시장에서 작은 사업을 시작했다.','지역 직물과 수공예 상품을 다른 도시로 판매했다.','소규모 가게에 손님이 늘어 일손을 구했다.'],{money:1900,network:1,tag:'market'});
 entry('east-asia-learning','eastAsia',10,64,['방과후 활동에서 여러 기술을 배웠다.','지역 도서관과 학교에서 관심 있는 공부를 이어 갔다.','친구들과 시험과 진로에 관한 고민을 나눴다.'],{knowledge:5,learning:1,tag:'study-ambition'});
 entry('east-asia-care','eastAsia',34,90,['가족의 돌봄 책임을 함께 나누었다.','노년의 부모와 생활 방식을 의논했다.','이웃과 돌봄 자원을 연결했다.'],{bonds:4,community:1,tag:'family-care'});
 entry('east-asia-tech','eastAsia',16,79,['새로운 기술 산업의 직업을 찾아봤다.','기술을 배우는 과정에서 선배의 도움을 받았다.','자동화로 달라진 일터에서 새 일을 배웠다.'],{skill:2,learning:1,tag:'technology'});
 entry('sea-coastal','southEastAsia',11,78,['어촌의 생활과 해양 생태를 배웠다.','지역 바다와 하천을 정리하는 활동을 했다.','항구 일자리와 관광 일을 비교해 보았다.'],{community:2,knowledge:3,tag:'coastal'});
 entry('sea-flood','southEastAsia',13,91,['계절성 폭우에 대비해 집과 학교의 안전을 점검했다.','태풍 대비 대피 안내를 가족과 확인했다.','피해를 입은 이웃을 돕기 위해 물품을 모았다.'],{community:2,health:-1,tag:'resilience'},{weight:1.35});
 entry('sea-trade','southEastAsia',21,78,['지역 물류회사에서 일자리를 찾아보았다.','다른 도시와 상품을 거래하는 일을 배웠다.','해외 거래처와 협업해 일의 범위를 넓혔다.'],{skill:1,money:1600,tag:'export'});
 entry('europe-study','westernEurope',16,66,['교환교육 프로그램을 알아보았다.','지역 직업교육에 참여해 실습을 했다.','다른 언어를 배우며 여행 준비를 시작했다.'],{learning:2,knowledge:4,tag:'europe-education'});
 entry('europe-move','westernEurope',20,77,['다른 나라로 합법적으로 이주해 새 일자리를 알아보았다.','스페인에서 일하거나 공부할 계획을 세웠다.','국경을 넘어 친구와 가족을 만나러 갔다.'],{network:1,skill:1,tag:'europe-move'},{weight:1.5});
 entry('europe-civic','westernEurope',20,82,['지역 선거와 공공 서비스에 관한 토론에 참여했다.','시민단체의 청원에 뜻을 보탰다.','도시의 교통·주거 정책 의견을 수렴하는 자리에 참석했다.'],{community:2,knowledge:3,tag:'civic'});
 entry('east-europe-language','eastEurope',15,74,['새로운 언어를 배우며 진로를 넓혔다.','학교에서 다른 나라의 문학과 역사를 배웠다.','이웃 국가의 교육기관을 알아보았다.'],{knowledge:4,learning:1,tag:'new-language'});
 entry('east-europe-move','eastEurope',19,74,['일자리를 찾아 국내 다른 도시로 이사했다.','가족과 여행하며 다른 지역의 문화를 알게 됐다.','변화하는 산업에 맞춰 직업 기술을 배웠다.'],{skill:2,network:1,tag:'region-mobility'});
 entry('central-asia-work','centralAsia',18,76,['이웃 지역에서 계절 일자리를 찾았다.','지역의 창업 지원을 알아보았다.','국제 운송과 시장 거래를 배웠다.'],{skill:2,money:1200,tag:'trade-route'});
 entry('north-africa-water','northAfrica',15,77,['마을의 물 절약 사업에 참여했다.','가뭄 대비 시설을 배우고 지역에 알렸다.','농업용수를 효율적으로 사용하는 방법을 익혔다.'],{community:2,knowledge:3,tag:'water-project'});
 entry('north-africa-crafts','northAfrica',15,78,['시장과 관광 지역에서 공예를 배웠다.','친구와 작은 물품 판매를 시작했다.','지역 기술자의 수공예 수업에 참석했다.'],{skill:2,network:2,tag:'craft'});
 entry('west-africa-culture','westAfrica',10,82,['친구들과 음악과 춤을 배우며 공연했다.','가족의 전통 이야기를 기록했다.','지역 축제에서 다양한 언어를 들었다.'],{happiness:5,bonds:3,tag:'cultural-exchange'});
 entry('west-africa-entrepreneur','westAfrica',18,76,['지역 유통업의 새로운 판매 방식을 배웠다.','소액 자금으로 작은 상점을 운영했다.','지역 협동조합의 일을 도왔다.'],{skill:2,network:2,tag:'entrepreneurship'});
 entry('east-africa-conservation','eastAfrica',14,84,['야생동물 보호 활동의 중요성을 배웠다.','학교에서 환경 보호 프로젝트를 진행했다.','지역 자연보호 활동에 참여했다.'],{knowledge:4,community:2,tag:'conservation'});
 entry('east-africa-learning','eastAfrica',12,72,['학교와 집을 오가며 배울 시간을 만들었다.','방과후 배움터에서 새로운 친구를 만났다.','지역의 기술교실에서 일에 필요한 기술을 배웠다.'],{learning:2,network:1,tag:'local-school'});
 entry('central-africa-city','centralSouthAfrica',17,70,['다른 도시에서 일자리를 찾아보았다.','지역의 보건·교통 서비스를 이용할 방법을 배웠다.','친구와 새 사업 아이디어를 이야기했다.'],{network:2,skill:1,tag:'region-mobility'});
 entry('central-africa-community','centralSouthAfrica',10,82,['마을의 농산물 협동조합을 방문했다.','지역 공연에 참여해 친구들을 만났다.','지역 보건 교육에 참여했다.'],{community:2,bonds:3,tag:'cultural-exchange'});
 entry('middle-east-crafts','middleEast',15,79,['지역 건축과 공예에 대해 배웠다.','국제 교역과 물류의 일을 알아보았다.','가족과 지역의 역사 유적을 방문했다.'],{knowledge:3,skill:1,tag:'trade'});
 entry('middle-east-community','middleEast',12,85,['다양한 이웃과 음식을 나누었다.','자원봉사로 어르신의 일을 도왔다.','지역 행사에서 다른 종교와 문화를 접했다.'],{bonds:4,community:2,tag:'cultural-exchange'});
 entry('latin-music','latinAmerica',10,90,['지역 음악 공연에서 새로운 친구를 만났다.','동네 축제에서 춤과 음악을 배웠다.','가족의 이야기와 노래를 기록했다.'],{bonds:4,happiness:4,tag:'music'});
 entry('latin-entrepreneur','latinAmerica',18,81,['지역의 작은 식당 일을 배웠다.','동네 시장에서 판매 일을 시작했다.','친구와 새 물건을 만드는 사업을 고민했다.'],{skill:2,network:2,tag:'entrepreneurship'});
 entry('latin-civic','latinAmerica',18,82,['시민들이 모여 교통 문제를 이야기했다.','지역 환경을 지키기 위한 평화로운 행사가 열렸다.','마을 학교를 지원하는 활동을 도왔다.'],{community:2,knowledge:2,tag:'civic'});
 entry('north-america-culture','northAmerica',10,88,['다양한 배경의 친구들과 학교 행사를 했다.','지역 축제에서 여러 문화의 음식을 맛봤다.','도서관에서 여러 언어로 쓰인 책을 읽었다.'],{knowledge:3,bonds:4,tag:'cultural-exchange'});
 entry('north-america-move','northAmerica',19,80,['다른 주나 지역의 대학을 알아보았다.','새로운 도시로 이동하여 직장을 찾았다.','가족과 이사를 준비하며 새로운 동네를 탐색했다.'],{network:1,money:-1400,tag:'relocation'});
 entry('pacific-outdoor','pacific',12,80,['해변과 산림에서 안전한 야외활동을 배웠다.','지역 자연보호 활동에 참여했다.','해양생태 보호 프로젝트를 도왔다.'],{health:3,community:2,tag:'conservation'});
 entry('pacific-move','pacific',18,80,['도시와 작은 마을의 일자리 차이를 경험했다.','멀리 사는 가족을 만나기 위해 이동했다.','지역의 직업 훈련 과정을 알아보았다.'],{learning:1,network:2,tag:'mobility'});
 // Distinct nation-specific possibilities; no country or faith implies an inevitable life.
 entry('india-langar','all',18,80,['시크교 공동체의 랑가르에서 식사를 나누는 봉사를 했다.','세바 봉사를 통해 다양한 사람과 협력했다.','함께 식사를 준비하며 평등의 가치를 실천했다.'],{network:2,community:3,tag:'sikh-seva'},{country:'인도',needs:['sikh'],weight:6});
 entry('india-monastic','all',18,84,['불교 수행 공동체에서 공부와 명상을 이어 갔다.','수행과 지역 교육활동을 함께했다.','출가 생활과 봉사를 통해 새로운 사람들을 만났다.'],{knowledge:5,community:2,tag:'monastic'},{country:'인도',needs:['monastic'],weight:6});
 entry('india-research','all',20,76,['과학 교육 프로그램에 참여했다.','도시와 농촌을 잇는 의료 교육 사업을 알아보았다.','정보기술 교육으로 새로운 일을 시작했다.'],{skill:2,knowledge:4,tag:'science-path'},{country:'인도'});
 entry('korea-community-service','all',20,44,['지역의 군 복무와 사회적 역할에 대해 고민했다.','군 복무 경험이 있는 선배에게 이야기를 들었다.','안전한 복무 환경의 중요성을 배웠다.'],{knowledge:2,tag:'military-information'},{country:'대한민국'});
 entry('korea-border-post','all',21,29,['접경 지역에서의 복무가 시작되어 긴장 속에 안전 교육을 받았다.','부대의 위험물 안전수칙을 배우고 동료들과 협력했다.','GOP 부근 근무로 안전 점검에 참여했다.'],{network:1,tag:'border-duty'},{country:'대한민국',needs:['military'],weight:3});
 entry('korea-mine-injury','all',21,30,['복무 중 폭발물 사고로 다리를 다쳐 재활치료를 시작했다.','접경 지역에서의 사고로 이동에 어려움이 생겼다.','복무 중 사고 뒤 의료지원과 재활이 필요해졌다.'],{health:-9,money:-1200,tag:'injury'},{country:'대한민국',needs:['border-duty'],weight:.045,rarity:'rare',serious:true});
 entry('korea-accessibility','all',23,77,['재활과 보조기기 지원으로 이동과 일을 이어 갔다.','장애가 있는 사람들의 접근성을 높이는 일을 도왔다.','직장에서 필요한 환경을 조정하고 새 기술을 배웠다.'],{learning:2,network:3,tag:'rehabilitation'},{country:'대한민국',needs:['injury'],weight:7});
 entry('russia-service','all',20,40,['군 복무와 민간 경력 사이에서 진로를 고민했다.','지역 사회에서 복무 제도에 관한 정보를 살펴봤다.','위기 때 가족과 연락할 계획을 세웠다.'],{knowledge:2,tag:'service-info'},{country:'러시아'});
 entry('russia-future-crisis','all',20,53,['가상의 미래 분쟁이 발생해 징집 통보와 피난 문제를 마주했다.','시대의 불안정으로 복무와 가족 안전을 함께 고민했다.','지역에 군사적 긴장이 높아져 생활이 달라졌다.'],{happiness:-4,tag:'armed-conflict'},{country:'러시아',weight:.075,rarity:'rare',serious:true});
 entry('russia-shelter','all',21,61,['분쟁 위협이 커져 안전한 장소로 대피했다.','가족과 통신하며 피난 계획을 실행했다.','이웃과 함께 안전한 대피시설을 찾았다.'],{community:2,health:-2,tag:'evacuation'},{country:'러시아',needs:['armed-conflict'],weight:5,serious:true});
 entry('russia-drone-loss','all',21,62,['가상 분쟁 중 무인기 공격으로 동료를 잃고 도움을 받았다.','분쟁 중 드론의 위협을 겪은 뒤 심리적 지원을 구했다.','전투 지역에서 무인기 공격을 겪고 구조대의 도움을 받았다.'],{health:-10,bonds:-4,tag:'war-trauma'},{country:'러시아',needs:['armed-conflict'],weight:.08,rarity:'rare',serious:true});
 entry('russia-recovery','all',22,85,['분쟁 경험 뒤 직업 훈련을 받아 민간 일터로 돌아왔다.','가족과 전문 상담의 도움으로 일상을 재건했다.','새로운 기술을 배우며 안정된 생활을 준비했다.'],{learning:3,health:4,tag:'reintegration'},{country:'러시아',needs:['war-trauma'],weight:8,serious:true});
 entry('usa-bullying','all',9,17,['학교에서 괴롭힘을 겪어 믿을 만한 어른에게 도움을 요청했다.','반 친구들의 따돌림 문제가 알려져 학교에서 지원을 시작했다.','친구가 어려움을 겪는 것을 보고 상담 선생님에게 알렸다.'],{happiness:-5,tag:'school-support'},{country:'미국',weight:.8,serious:true});
 entry('usa-school-safety','all',9,18,['학교 안전 문제로 수업이 중단되어 보호자와 함께 안전한 곳으로 이동했다.','학교 근처에서 총격 사건이 발생해 학생들이 보호받으며 심리적 지원을 받았다.','학교에서 안전 위기 대응 훈련과 상담이 진행되었다.'],{happiness:-5,tag:'safety-recovery'},{country:'미국',weight:.10,rarity:'rare',serious:true});
 entry('usa-counseling','all',10,23,['학교의 상담·지원 프로그램을 이용했다.','믿을 만한 친구와 어른이 회복을 도왔다.','갈등을 해결하고 안전하게 도움을 요청하는 법을 배웠다.'],{happiness:6,bonds:4,tag:'supported'},{country:'미국',needs:['school-support'],weight:6});
 entry('usa-safety-recovery','all',10,30,['안전한 학교 환경을 되찾는 데 지역사회가 힘을 모았다.','가족과 상담을 통해 학교생활로 돌아갈 준비를 했다.','위기 이후 일상 회복에 필요한 도움을 받았다.'],{happiness:6,health:3,tag:'supported'},{country:'미국',needs:['safety-recovery'],weight:7});
 entry('monaco-spain','all',18,79,['스페인에서 합법적으로 거주하거나 일할 방법을 알아보았다.','지중해 연안의 다른 도시에서 학업과 일을 이어 갔다.','스페인으로 이주할 때 필요한 거주 절차를 확인했다.'],{network:2,money:-900,tag:'europe-move'},{country:'모나코',weight:3});
 entry('monaco-civic','all',23,79,['스페인에서 평화로운 시민행사에 참석했다.','지역 노동·주거 문제에 대해 합법적으로 의견을 냈다.','자발적 봉사 활동으로 여러 사람을 만났다.'],{community:3,tag:'civic'},{country:'모나코',needs:['europe-move'],weight:5});
 entry('monaco-demonstration-injury','all',23,79,['시민행사 현장에서 사고가 발생해 병원 치료를 받았다.','혼잡한 행사에서 넘어져 재활과 돌봄이 필요해졌다.','평화로운 집회 주변의 사고로 한동안 회복이 필요했다.'],{health:-6,tag:'injury'},{country:'모나코',needs:['civic'],weight:.035,rarity:'rare',serious:true});
 // Region-specific humanitarian stories are conditional and hypothetical, not
 // a continent-wide description and not an estimate of real future conflict rates.
 entry('fictional-displacement','all',7,67,['가상의 지역 분쟁이 발생해 가족과 함께 안전한 곳으로 대피했다.','분쟁으로 거처를 옮기고 임시 배움터에 다녔다.','인근 지역의 긴장으로 가족과 떨어졌다가 연락을 되찾았다.'],{happiness:-6,money:-1500,tag:'displaced'},{needs:['future-crisis'],weight:.25,rarity:'rare',serious:true});
 entry('child-protection','all',10,17,['분쟁 중 무장단체에 강제로 동원되었다가 보호기관의 도움으로 벗어났다.','분쟁 상황에서 강제노동 피해를 겪었지만 구조와 보호를 받았다.','무장집단의 위협에서 벗어나 안전한 임시 보호시설에 머물렀다.'],{health:-8,tag:'child-protected'},{needs:['displaced','minor'],weight:.03,rarity:'extremely-rare',serious:true});
 entry('reintegration-study','all',11,32,['사회복지사와 함께 학교로 돌아갈 준비를 했다.','심리적 지원과 직업교육을 받으며 일상을 회복했다.','가족 찾기와 공동체 복귀 지원을 받았다.'],{learning:3,bonds:5,tag:'reintegration'},{needs:['child-protected'],weight:8,serious:true});
 entry('refugee-resettlement','all',10,82,['보호기관의 도움으로 새로운 지역에서 생활을 시작했다.','이주한 곳에서 언어와 직업 기술을 익혔다.','가족과 떨어져 살다가 다시 만날 방법을 찾았다.'],{learning:2,network:1,tag:'resettled'},{needs:['displaced'],weight:5});
 // Investment follows an optional voluntary adult decision, with delayed outcomes.
 entry('stocks-growth','all',30,75,['모아 둔 돈으로 산 주식이 크게 올라 자산이 증가했다.','오랫동안 보유한 투자자산에 큰 수익이 났다.','투자한 사업이 성장하며 뜻밖의 이익을 얻었다.'],{money:25000,tag:'investment-gain'},{needs:['stocks'],weight:.45,rarity:'uncommon'});
 entry('stocks-loss','all',30,75,['투자한 주식의 가치가 크게 하락했다.','보유한 주식 일부가 상장폐지되어 손실을 봤다.','잘못된 전망으로 투자 자금의 상당 부분을 잃었다.'],{money:-16000,tag:'investment-loss'},{needs:['stocks'],weight:.42,rarity:'uncommon'});
 entry('crypto-boom','all',30,75,['가상자산 가격이 급등해 큰 이익을 얻었다.','고위험 투자가 예상 밖의 수익으로 이어졌다.','오래 보유한 가상자산이 큰 폭으로 상승했다.'],{money:43000,tag:'crypto-boom'},{needs:['crypto'],weight:.18,rarity:'rare'});
 entry('crypto-crash','all',30,75,['가상자산 가격이 폭락해 많은 돈을 잃었다.','투자한 코인 거래가 중단되며 자산이 크게 줄었다.','고위험 투자에서 손실을 보고 자산 관리 방식을 바꿨다.'],{money:-29000,tag:'crypto-crash'},{needs:['crypto'],weight:.25,rarity:'rare'});
 entry('diversify-recover','all',32,80,['손실 이후 투자 위험을 나누고 생활비를 우선 챙겼다.','어려운 투자 경험을 살려 지출과 저축을 다시 계획했다.','투자 실패 후 재교육을 받으며 재정을 안정시켰다.'],{security:2,knowledge:4,tag:'financial-recovery'},{needs:['investment-loss'],weight:7});
 entry('crypto-recover','all',32,80,['위험한 투자 대신 긴급 생활자금을 먼저 마련했다.','큰 손실을 겪고 재정 상담을 받아 회복을 시작했다.','새로운 직업 기술을 배우며 자산을 다시 모았다.'],{security:2,knowledge:3,tag:'financial-recovery'},{needs:['crypto-crash'],weight:7});
 // Broad cross-border opportunities that belong to no single nation.
 entry('work-abroad','all',18,73,['해외 일자리에 지원하여 다른 나라에서 일했다.','유학 뒤 새로운 나라의 직장을 알아보았다.','국경을 넘어 가족을 만나며 진로의 폭을 넓혔다.'],{skill:2,network:2,tag:'migrant'},{needs:['working'],weight:.9});
 entry('language-bridge','all',15,86,['새로운 언어를 익혀 이웃과 소통했다.','이주한 지역의 언어교육 지원을 받았다.','두 가지 문화의 연결을 돕는 일을 시작했다.'],{knowledge:4,network:2,tag:'linguist'},{needs:['migrant'],weight:4});
 entry('family-reunion','all',18,93,['멀리 떨어져 지내던 가족과 다시 만났다.','오래 연락하지 못한 친척과 관계를 회복했다.','가족 모임에서 새로운 미래를 의논했다.'],{bonds:7,tag:'family-reunion'},{needs:['migrant'],weight:2});
 entry('future-ai-work','all',22,81,['자동화로 일터가 변해 새 기술을 배워야 했다.','새로운 도구를 배우며 다른 직무를 맡았다.','기술 발전으로 생긴 일자리 정보를 찾아봤다.'],{learning:2,skill:2,tag:'digital-adaptation'},{weight:1.5});
 entry('future-transport','all',14,83,['새로운 교통수단 덕분에 통근 시간이 줄었다.','대중교통 확장으로 다른 지역의 일을 찾았다.','교통 환경이 달라져 생활권이 넓어졌다.'],{network:1,tag:'mobility'},{weight:1});
 entry('future-pandemic-care','all',8,83,['감염병이 유행해 가족과 이웃이 서로 도왔다.','공공보건 안내를 따라 생활 방법을 조정했다.','예상하지 못한 건강 위기에 지역 사회가 협력했다.'],{health:-3,community:2,tag:'public-health'},{weight:.16,rarity:'rare',serious:true});
 entry('future-pandemic-recovery','all',10,88,['지역 의료기관에서 필요한 치료와 안내를 받았다.','건강 위기 이후 학교와 직장 생활에 적응했다.','가족과 이웃이 서로를 돌보며 일상을 되찾았다.'],{health:5,bonds:3,tag:'health-recovery'},{needs:['public-health'],weight:6})
 // Simulated national crises are enabled for a small, explicitly authored
 // set of *possible story settings* and are never guaranteed or persistent.
 const storyCrisisCountries=new Set('콩고민주공화국,수단,소말리아,미얀마,예멘,시리아,말리,우크라이나,아프가니스탄,나이지리아'.split(','));
 const tags=life=>{
  const out=new Set(life.arc?.tags||[]);
  const s=life.profile?.settlement;
  if(s==='농촌')out.add('rural');if(s==='도시')out.add('urban');
  if(life.age<18)out.add('minor');
  if(life.arc?.skill>=2)out.add('working');
  if(life.money?.netWorth < 0)out.add('hardship');
  if(life.world5?.faith==='불교 수행')out.add('monastic');
  if(life.world5?.faith==='시크교 봉사')out.add('sikh');
  if(life.world5?.service==='복무')out.add('military');
  if(life.world5?.injury)out.add('rehabilitation');
  if(life.world5?.investment==='주식')out.add('stocks');
  if(life.world5?.investment==='가상자산')out.add('crypto');
  if(life.world5?.fictionalCrisis)out.add('future-crisis');
  return out;
 };
 const r=(life,age,salt)=>W4.roll(life,age,salt);
 const amount=(life,n)=>Math.round(n*Math.max(.38,life.world?.economyScale||1));
 function ensure(life){
  W4.ensure(life);
  if(life.world5)return life.world5;
  life.world5={seen:[],faith:'없음',service:'',injury:false,
   investment:'',investmentEntry:0,fictionalCrisis:false,
   lastContext:'',activeEffects:[],eventCount:0};
  return life.world5;
 }
 function apply(life,event){
  const w=ensure(life),effects=event.change||{},arc=life.arc;
  const change={};
  for(const [k,v] of Object.entries(effects)){
   if(k==='money')life.money.netWorth=clamp(life.money.netWorth+amount(life,v),-2e7,2e7);
   else if(k==='tag'){if(!arc.tags.includes(v))arc.tags.push(v);}
   else if(['health','knowledge','happiness','bonds'].includes(k))change[k]=v;
   else if(typeof arc[k]==='number')arc[k]=clamp(arc[k]+v,-8,30);
  }
  life.change(change);
  if(event.id==='korea-mine-injury'||event.id==='monaco-demonstration-injury')w.injury=true;
  if(event.id==='child-protection')w.injury=true;
  if(event.id==='russia-future-crisis')w.fictionalCrisis=true;
  if(event.id==='fictional-displacement')w.fictionalCrisis=true;
  if(event.id==='usa-school-safety')w.lastContext='학교 안전과 심리적 지원';
  if(event.id==='stocks-growth'||event.id==='stocks-loss'||event.id==='crypto-boom'||event.id==='crypto-crash'){
   const original=life.world5.investmentEntry;
   const factor=event.id==='stocks-growth'?2.8:event.id==='stocks-loss'?.10:event.id==='crypto-boom'?7:.02;
   life.money.netWorth=clamp(life.money.netWorth+Math.round(original*(factor-1)),-2e7,2e7);
   w.investment=''; w.investmentEntry=0; // one position resolves once
  }
  if(!w.seen.includes(event.id))w.seen.push(event.id);
  w.eventCount++;
  const line=event.lines[Math.floor(r(life,life.age,991+templates.indexOf(event))*event.lines.length)];
  w.lastContext=line;
  life.logEvent(line,event.serious?'safety':'world');
 }
 function eligible(life,e){
  if(life.age<e.start||life.age>e.end)return false;
  const w=ensure(life);
  if(e.once && w.seen.includes(e.id))return false;
  if(e.country && life.country[0]!==e.country)return false;
  if(e.group!=='all' && groupFor(life.country[0])!==e.group)return false;
  const t=tags(life);
  if(!e.needs.every(tag=>t.has(tag)))return false;
  if(e.id==='fictional-displacement' && !w.fictionalCrisis)return false;
  return true;
 }
 function tickEvents(life){
  const w=ensure(life),age=life.age;
  if(age===9 && storyCrisisCountries.has(life.country[0]) && r(life,age,310)<.055){
   w.fictionalCrisis=true;
   life.logEvent('이 이야기에서는 몇 년 뒤 지역에 가상의 분쟁이 발생했다고 가정합니다. 실제 미래 예측이 아닙니다.','context');
  }
  // Optional peacetime military and civil service; no conscription forecast
  // for anyone born in 2026. Respect eligibility, choice and future uncertainty.
  if(age===21&&['대한민국','러시아'].includes(life.country[0])&&r(life,age,313)<.52){
    w.service='복무';life.logEvent('가상 시나리오에서 군 복무 경험을 하게 되었다. 이후 민간 생활로 돌아갈 길도 남아 있다.','context');
  }
  if(w.investment && age>=30 && age<=75 && w.investmentEntry && r(life,age,392)<.16){
    const id=w.investment==='주식'?(r(life,age,393)<.60?'stocks-growth':'stocks-loss')
      :(r(life,age,393)<.28?'crypto-boom':'crypto-crash');
    const event=templates.find(e=>e.id===id);if(event)apply(life,event);
  }
  if(r(life,age,320)>.27)return;
  const items=templates.filter(e=>eligible(life,e) &&
    !(['stocks-growth','stocks-loss','crypto-boom','crypto-crash'].includes(e.id)));
  if(!items.length)return;
  let total=0;for(const e of items)total+=e.weight;
  let needle=r(life,age,321)*total,selected=items[items.length-1];
  for(const e of items){needle-=e.weight;if(needle<=0){selected=e;break;}}
  apply(life,selected);
 }
 function specialGate(life){
  if(life.pending!==29)return null;
  ensure(life);
  // Voluntary spirituality route. Sikh identity is not assigned by birth.
  if(life.country[0]==='인도' && life.arc.path==='community'){
    return {age:29,title:'수행과 봉사, 직업 중에서',description:'인도에는 다양한 종교와 비종교적 삶이 함께 있습니다. 어느 길도 태어날 때 정해지지 않았습니다.',options:[
      {label:'불교 수행 공동체에서 생활한다',note:'수행과 공부·지역봉사, 개인소득 감소'},
      {label:'시크교 공동체의 봉사에 참여한다',note:'랑가르와 세바 활동, 사람들과 협력'},
      {label:'종교와 관계없이 직업과 지역활동을 이어간다',note:'독립적인 삶·일·다양한 관계'}
    ]};
  }
  if(life.money.netWorth>amount(life,7000) && r(life,29,332)<.50){
    return {age:29,title:'모아 둔 돈을 어떻게 관리할까?',description:'투자는 실패할 수 있고, 대박도 보장되지 않습니다. 생활에 필요한 돈을 먼저 생각해야 합니다.',options:[
      {label:'다양한 주식에 나누어 투자한다',note:'손실 위험이 있으나 장기 성장 가능성'},
      {label:'고위험 가상자산에 일부 투자한다',note:'급등이나 폭락·거래 중단의 위험'},
      {label:'비상금으로 안전하게 저축한다',note:'큰 수익은 없지만 위험이 적음'}
    ]};
  }
  if(life.arc.tags.includes('war-trauma')||life.arc.tags.includes('injury')){
    return {age:29,title:'회복 이후의 새로운 길',description:'사고나 위기를 겪은 뒤에도 다양한 삶의 가능성이 있습니다.',options:[
      {label:'재활과 전문적인 지원을 활용한다',note:'필요한 환경·지원·회복에 집중'},
      {label:'새로운 기술을 배우고 직업을 바꾼다',note:'교육과 직업전환의 비용·기회'},
      {label:'인권·안전 관련 공동체 활동을 한다',note:'당사자의 목소리·관계와 일'}
    ]};
  }
  return null;
 }
 function chooseSpecial(life,index){
  const gate=specialGate(life),w=ensure(life),a=life.arc;
  if(!gate||!Number.isInteger(index)||index<0||index>=3)return false;
  let sentence='',effect={};
  if(gate.title.includes('수행')){
   if(index===0){w.faith='불교 수행';life.career='수행자·지역 교육';effect={knowledge:8,community:4,learning:3,money:-2100,tag:'monastic'};sentence='본인의 선택으로 불교 수행 공동체에 참여했다.';}
   if(index===1){w.faith='시크교 봉사';life.career='지역 봉사·생업';effect={network:5,community:5,bonds:6,tag:'sikh-service'};sentence='본인의 선택으로 시크교 공동체의 세바 봉사에 참여했다.';}
   if(index===2){w.faith='비종교적 지역 활동';effect={security:2,skill:2,community:2};sentence='자신의 직업과 지역 활동을 계속 이어 갔다.';}
  }else if(gate.title.includes('모아 둔 돈')){
   if(index===0){w.investment='주식';w.investmentEntry=Math.max(1000,Math.round(life.money.netWorth*.18));effect={knowledge:3,tag:'invested'};sentence='생활에 필요한 돈을 남기고 분산 투자를 시작했다.';}
   if(index===1){w.investment='가상자산';w.investmentEntry=Math.max(1000,Math.round(life.money.netWorth*.22));effect={knowledge:1,tag:'invested'};sentence='위험을 알면서도 일부 자산을 고위험 투자에 넣었다.';}
   if(index===2){effect={security:3,tag:'saver'};sentence='급할 때 쓸 돈을 먼저 마련하기로 했다.';}
  }else{
   if(index===0){effect={health:6,wellness:4,community:2,tag:'rehabilitation'};sentence='재활과 지원을 활용해 일상을 새로 만들었다.';}
   if(index===1){life.career='재교육 후 새 직업';effect={skill:4,learning:3,money:-1500,tag:'retraining'};sentence='직업훈련을 받고 자신의 경력을 다시 설계했다.';}
   if(index===2){life.career='안전·권익 활동';effect={network:4,community:5,bonds:4,tag:'advocacy'};sentence='안전과 접근성을 높이기 위한 활동을 시작했다.';}
  }
  // Apply v4-compatible effects without calling its choose() (which would
  // interpret this as the unrelated generic gate).
  for(const [k,val] of Object.entries(effect)){
   if(k==='money')life.money.netWorth+=amount(life,val);
   else if(k==='tag'){if(!a.tags.includes(val))a.tags.push(val);}
   else if(['health','knowledge','happiness','bonds'].includes(k))life.change({[k]:val});
   else if(typeof a[k]==='number')a[k]=clamp(a[k]+val,-8,30);
  }
  a.decisions.push({age:29,index,title:gate.title,label:gate.options[index].label,result:sentence});
  a.decisionCount++;life.logEvent(sentence,'decision');life.pending=null;
  return true;
 }
 function install(){
  if(!Sim?.Life || !W4?.ensure || Sim.Life.prototype.__world5)return false;
  const Life=Sim.Life,tick=Life.prototype.tick,get=Life.prototype.getChoice,choose=Life.prototype.choose,
   snapshot=Life.prototype.snapshot,restore=Life.restore;
  Life.prototype.tick=function(){
   if(!this.alive||this.pending)return false;
   ensure(this);
   const result=tick.call(this);
   if(result&&this.alive)tickEvents(this);
   return result;
  };
  Life.prototype.getChoice=function(){
   const special=specialGate(this);return special||get.call(this);
  };
  Life.prototype.choose=function(index){
   if(specialGate(this))return chooseSpecial(this,index);
   return choose.call(this,index);
  };
  Life.prototype.snapshot=function(){ensure(this);return {...snapshot.call(this),world5:{...this.world5,seen:[...this.world5.seen]}};};
  Life.restore=function(data){
   const life=restore.call(this,data);if(!life)return null;
   const state=ensure(life);
   if(data?.world5&&typeof data.world5==='object'){
    const raw=data.world5;
    for(const k of ['faith','service','investment','lastContext'])
     if(typeof raw[k]==='string')state[k]=raw[k].slice(0,160);
    state.injury=raw.injury===true;state.fictionalCrisis=raw.fictionalCrisis===true;
    state.investmentEntry=Number.isFinite(raw.investmentEntry)?clamp(raw.investmentEntry,0,2e7):0;
    state.eventCount=Number.isInteger(raw.eventCount)?clamp(raw.eventCount,0,500):0;
    if(Array.isArray(raw.seen))state.seen=raw.seen.filter(x=>typeof x==='string').slice(0,200);
   }
   return life;
  };
  Object.defineProperty(Life.prototype,'__world5',{value:true});
  return true;
 }
 install();
 return Object.freeze({install,ensure,GROUPS,templates,groupFor,eligible,specialGate,chooseSpecial,storyCrisisCountries});
});