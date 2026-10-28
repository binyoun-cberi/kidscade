(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SettlementHistory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SOURCES = {
    bronzeMuseum: { title: '국립춘천박물관 · 청동기 생활', url: 'https://chuncheon.museum.go.kr/kor/sub02_070101.do?partCode=03' },
    stone: { title: '우리역사넷 · 선사 시대 생활', url: 'https://contents.history.go.kr/front/ta/view.do?levelId=ta_e71_0010_0010_0010_0010' },
    metal: { title: '국사편찬위원회 · 청동기와 철기', url: 'https://contents.history.go.kr/eh_kk/teach/tong/II/04.htm' },
    joseon: { title: '우리역사넷 · 고조선과 여러 나라', url: 'https://contents.history.go.kr/front/ta/print.do?levelId=ta_m31_0040_0020&whereStr=' },
    goguryeo: { title: '국가유산 지식이음 · 고구려 유물', url: 'https://portal.nrich.go.kr/kor/archeologyUsrView.do?idx=5613&menuIdx=567' },
    goguryeoLife: { title: '우리역사넷 · 고분과 생활 문화', url: 'https://contents.history.go.kr/front/ta/view.do?levelId=ta_m51_0040_0040' },
    baekje: { title: '우리역사넷 · 백제 금동 대향로', url: 'https://contents.history.go.kr/mobile/eh/view.do?code=eh_age_10&levelId=eh_r0092_0010' },
    silla: { title: '우리역사넷 · 신라의 골품제', url: 'https://contents.history.go.kr/mobile/hm/view.do?levelId=hm_018_0060' },
    gaya: { title: '우리역사넷 · 가야의 성장', url: 'https://contents.history.go.kr/front/ta/view.do?levelId=ta_m71_0030_0010_0040_0010' },
    united: { title: '우리역사넷 · 통일 신라와 장보고', url: 'https://contents.history.go.kr/front/ta/view.do?levelId=ta_m61_0050_0020' },
    balhae: { title: '우리역사넷 · 발해의 건국', url: 'https://contents.history.go.kr/front/hm/print.do?levelId=hm_030_0010&tabId=01&treeId=010301&whereStr=' },
    balhaeCities: { title: '우리역사넷 · 발해의 성장', url: 'https://contents.history.go.kr/front/newEh/list.do?code=ganada&levelId=eh_r0117_0010' },
    later: { title: '우리역사넷 · 후삼국 통일', url: 'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_10&levelId=kc_i101800' },
    taebong: { title: '우리역사넷 · 후고구려의 건국과 국호', url: 'https://contents.history.go.kr/front/kc/printViewPopup.do?levelId=kc_i101600' },
    harbor: { title: '우리역사넷 · 벽란도', url: 'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_r200325' },
    woodblock: { title: '우리역사넷 · 팔만대장경', url: 'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_20&levelId=kc_r200500' },
    type: { title: '우리역사넷 · 직지와 금속활자', url: 'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_20&levelId=kc_r200370' }
  };
  const RESOURCES = { charcoal: '숯', copper: '구리광석', tin: '주석광석', bronze: '청동', ore: '철광석', iron: '철', paper: '종이', book: '인쇄 기록' };
  const ICONS = { charcoal: '⚫', copper: '🟠', tin: '⚪', bronze: '🥉', ore: '⛰', iron: '⚙', paper: '📜', book: '📚' };
  const JOBS = {
    charcoal: { name: '숯 굽기', resource: 'charcoal', amount: 4, time: 16, limit: 1, facility: 'kiln', cost: { wood: 4 } },
    copper: { name: '구리 채광', resource: 'copper', amount: 3, time: 18, limit: 1, facility: 'prospect', point: { x: 23, y: 5 } },
    tin: { name: '주석 채광', resource: 'tin', amount: 2, time: 18, limit: 1, facility: 'prospect', point: { x: 25, y: 7 } },
    bronze: { name: '청동 주조', resource: 'bronze', amount: 2, time: 20, limit: 1, facility: 'kiln', cost: { copper: 2, tin: 1, charcoal: 2 }, needs: ['prospect'] },
    ore: { name: '철광석 채광', resource: 'ore', amount: 3, time: 18, limit: 1, facility: 'ironFurnace', point: { x: 24, y: 8 } },
    iron: { name: '철 제련·가공', resource: 'iron', amount: 2, time: 22, limit: 1, facility: 'forge', cost: { ore: 3, charcoal: 2 }, needs: ['ironFurnace'] },
    paper: { name: '종이 공방', resource: 'paper', amount: 3, time: 18, limit: 1, facility: 'paperWorkshop', cost: { wood: 3 } },
    printer: { name: '기록 인쇄', resource: 'book', amount: 2, time: 18, limit: 1, facility: 'woodblock', cost: { paper: 2, charcoal: 1 } }
  };
  function project(name, cost, time, x, y, effect, needs, chapter, icon = '▣') {
    return { name, cost, time, max: 1, sites: [{ x, y }], effect, needs, chapter, icon, historical: true };
  }
  const PROJECTS = {
    groundStone: project('간석기 다듬기', { stone: 6, wood: 4 }, 12, 13, 11, '돌을 갈아 농경용 도구 준비 · 밭 해금', ['survey'], 'neolithic', '⚒'),
    kiln: project('숯 가마', { wood: 14, clay: 10, stone: 6 }, 20, 19, 6, '목재 → 숯 · 주조에 필요한 연료', ['neolithic'], 'bronze', '♨'),
    prospect: project('광맥 탐사', { food: 6, wood: 4 }, 20, 24, 4, '구리·주석 채광 자리 해금 · 발견 보장', ['neolithic'], 'bronze', '⌕'),
    bronzeRitual: project('청동 의례품 모형', { bronze: 2, stone: 8 }, 18, 15, 6, '청동의 의례·권력 상징과 전문 장인 살펴보기', ['kiln', 'prospect'], 'bronze'),
    dolmen: project('고인돌 전시 모형', { stone: 18, wood: 6 }, 20, 12, 4, '무덤과 사회의 차이를 보여 주는 자료', ['neolithic'], 'bronze'),
    ironFurnace: project('철 제련로', { stone: 12, clay: 12, bronze: 2 }, 22, 22, 9, '철광석 채광 · 숯으로 제련 준비', ['bronze'], 'iron', '♨'),
    forge: project('대장간', { wood: 14, stone: 8 }, 20, 22, 12, '철광석 + 숯 → 철 · 제련·가공 단순화', ['ironFurnace'], 'iron', '⚒'),
    ironTools: project('철제 농기구', { iron: 3, wood: 6 }, 15, 12, 13, '농사 작업 20초 → 15초', ['forge'], 'iron', '⚒'),
    council: project('고조선 자료관', { wood: 10, stone: 10, food: 6 }, 18, 16, 16, '단군 이야기와 법 조항을 자료로 읽기', ['bronze'], 'gojoseon'),
    fort: project('고구려 산성 모형', { stone: 20, wood: 10 }, 24, 22, 3, '산지의 방어·주변 생활 함께 관찰', ['kingdoms'], 'goguryeo'),
    mural: project('고분 벽화 관찰관', { clay: 8, wood: 6 }, 18, 20, 4, '생활·옷·놀이를 벽화 자료에서 찾아보기', ['fort'], 'goguryeo'),
    dock: project('백제 교류 나루', { wood: 18, iron: 2 }, 22, 26, 17, '물길을 이용한 교류 모형', ['kingdoms'], 'baekje', '⚓'),
    craftHall: project('백제 공예관', { clay: 12, bronze: 2, wood: 8 }, 22, 21, 16, '사비와 금동 대향로의 공예 문화 관찰', ['dock'], 'baekje'),
    sillaHall: project('신라 생활 자료관', { wood: 12, stone: 10 }, 20, 12, 6, '골품에 따라 달랐던 생활·기회 비교', ['kingdoms'], 'silla'),
    gayaMarket: project('가야 철 교역터', { iron: 4, wood: 10 }, 22, 25, 11, '철을 주고 식량 12·점토 6 받기 · 가득 차면 임시 보관 · 1회 모형', ['kingdoms'], 'gaya', '⚖'),
    temple: project('통일 신라 문화관', { stone: 16, wood: 12, clay: 6 }, 22, 15, 4, '불교 문화와 남북국의 공존', ['northSouth'], 'unifiedSilla'),
    seaRoute: project('청해진 항로 모형', { wood: 14, iron: 3, food: 6 }, 22, 26, 19, '장보고·해상 교류를 살펴보기', ['temple'], 'unifiedSilla', '⚓'),
    balhaeRelay: project('발해 교통로 모형', { wood: 14, stone: 12, food: 6 }, 22, 21, 19, '여러 중심지와 교류의 연결', ['northSouth'], 'balhae', '╋'),
    laterSupply: project('후백제 생활·보급관', { wood: 16, stone: 10, food: 8 }, 20, 7, 11, '견훤과 후백제 · 전란 속 사람들의 생활', ['laterThree'], 'laterBaekje'),
    taebongRecord: project('후고구려 국호 기록관', { wood: 8, clay: 8 }, 18, 18, 18, '후고구려 → 마진 → 태봉의 이름 변화', ['laterThree'], 'laterGoguryeo'),
    agreement: project('고려 통합 기록관', { food: 12, wood: 12, iron: 2 }, 22, 17, 6, '918년 건국과 936년 후삼국 통일 구별', ['goryeo'], 'goryeoFound'),
    paperWorkshop: project('종이 공방', { wood: 12, clay: 6 }, 18, 14, 18, '목재 → 종이 · 제작 재료를 단순화한 모형', ['iron'], 'goryeoTrade'),
    goryeoHarbor: project('벽란도 교류관', { wood: 16, iron: 3, paper: 3 }, 22, 25, 20, '개경으로 이어지는 교역·사신의 길', ['goryeoFound', 'paperWorkshop'], 'goryeoTrade', '⚓'),
    woodblock: project('목판 인쇄 공방', { wood: 12, paper: 3 }, 22, 18, 5, '목판은 한 판에 글을 새겨 여러 장 인쇄', ['goryeoTrade'], 'goryeoPrint', '▤'),
    movableType: project('금속활자 조판대', { bronze: 4, paper: 3 }, 22, 18, 7, '글자를 따로 만들어 다시 조합 · 인쇄 작업 12초', ['woodblock'], 'goryeoPrint', '▥')
  };
  const built = (id, label) => ({ type: 'project', id, label });
  const produced = (id, amount, label) => ({ type: 'produced', id, amount, label });
  const question = (prompt, choices, answer, explain) => ({ prompt, choices, answer, explain });
  const CHAPTERS = [
    { id: 'paleolithic', title: '구석기', group: '선사 생활', period: '문자 기록 이전 · 유물로 살펴보기', requires: [], sources: ['stone'],
      concepts: ['뗀석기', '사냥·채집', '이동 생활'], facts: ['돌을 떼어 도구를 만들고 사냥·채집으로 먹거리를 구했어요.', '동굴이나 막집을 거처로 삼고 주변 환경에 따라 이동했어요.'],
      goals: [built('tools', '뗀석기 만들기'), produced('food', 3, '먹거리 3개 직접 채집 또는 입고')],
      reflection: question('먹거리가 있는 곳을 옮겨 다닌 사람들의 생활에 어울리는 거처는?', ['옮겨 다니며 이용하는 동굴·막집', '농경을 전제로 한 큰 고정 마을'], 0, '구석기에는 사냥·채집과 이동 생활이 중요했어요. 게임의 시작 야영지는 이를 단순화한 모형이에요.') },
    { id: 'neolithic', title: '신석기', group: '선사 생활', period: '농경·정착의 시작', requires: ['paleolithic'], sources: ['stone'],
      concepts: ['간석기', '잡곡 농경', '빗살무늬 토기·움집'], facts: ['돌을 갈아 만든 도구를 쓰고 농경과 정착 생활이 나타났어요.', '토기는 조리·저장에 쓰였고, 사냥·고기잡이도 계속했어요.'],
      goals: [built('groundStone', '간석기 다듬기'), { type: 'settled', label: '밭·토기·주거와 식량 안정으로 정착 달성' }],
      reflection: question('밭이 생긴 뒤에도 채집을 계속할 수 있게 한 까닭은?', ['농경과 사냥·채집이 함께 이루어졌기 때문', '농경이 시작되자 사냥과 채집이 바로 사라졌기 때문'], 0, '새 생활 방식이 나타나도 이전 방식이 즉시 없어지지 않았어요. 여러 먹거리 확보 방법이 함께 쓰였어요.') },
    { id: 'bronze', title: '청동기', group: '생산과 여러 나라', period: '농경 확대·사회 분화', requires: ['neolithic'], sources: ['metal', 'stone', 'bronzeMuseum'],
      concepts: ['청동 주조·장인', '반달 돌칼', '민무늬 토기·고인돌·사회 분화'], facts: ['농경이 확대되었고 일부 지역에서는 벼농사도 이루어졌어요. 청동은 무기·의례품 등에 쓰였으며 농사에는 석기·나무 도구도 중요했어요.', '큰 무덤과 부장품은 당시 사람들 사이의 차이를 살피는 자료예요.'],
      goals: [built('broadField', '넓은 공동 밭'), built('mumunStore', '민무늬 토기와 저장터'), built('castingWorkshop', '거푸집 주조 작업터'), { type: 'bronzeCycle', label: '수확·운반·청동 제작 연구와 12가구 마을·자료 비교' }, built('kiln', '숯 가마'), built('prospect', '구리·주석 광맥 탐사'), built('bronzeRitual', '청동 의례품 모형'), built('dolmen', '고인돌 전시 모형')],
      reflection: question('청동기 마을의 농사 모습을 전시하려고 해요. 무엇을 함께 놓을까요?', ['청동검만 놓고 모든 농기구도 청동이었다고 설명', '청동 의례품과 반달 돌칼을 쓰임에 따라 구분'], 1, '청동기의 등장과 석기의 사용은 겹쳐요. 청동 농기구가 모든 석기를 곧바로 대신한 것은 아니에요.') },
    { id: 'iron', title: '철기', group: '생산과 여러 나라', period: '철제 농기구·무기와 교류', requires: ['bronze'], sources: ['metal', 'joseon'],
      concepts: ['철제 농기구', '제련·가공', '여러 나라의 성장'], facts: ['철제 도구의 보급은 농업과 여러 나라의 성장에 영향을 주었어요.', '교류 흔적과 유물은 당시 지역 사이의 관계를 보여 줘요.'],
      goals: [built('ironFurnace', '철 제련로'), built('forge', '대장간'), built('ironTools', '철제 농기구')],
      reflection: question('철광석만 모았는데 농기구가 안 나와요. 어떤 연결이 필요할까요?', ['광석 → 숯을 쓰는 제련 → 가공', '광석을 저장해 두기만 하면 완제품으로 바뀜'], 0, '금속 도구에는 연료와 여러 작업이 필요해요. 게임은 복잡한 실제 공정을 몇 단계로 줄여 표현했어요.') },
    { id: 'gojoseon', title: '고조선', group: '생산과 여러 나라', period: '청동기 문화 배경으로 성장 · 철기 문화와도 연결', requires: ['bronze'], sources: ['joseon'],
      concepts: ['초기 국가', '건국 이야기', '법과 사회'], facts: ['고조선은 우리 역사에서 먼저 등장한 국가예요. 청동기·철기 문화와 이어져요.', '단군 이야기는 건국 신화로, 법 조항은 당시 사회를 이해하는 자료로 읽어요.'],
      goals: [built('council', '고조선 자료관')],
      reflection: question('옛 법과 신분의 차이를 배울 때 알맞은 태도는?', ['당시 사회를 이해하는 자료로 읽고 오늘날의 권리와 비교', '옛 제도는 모두 오늘날에도 그대로 따라야 함'], 0, '역사를 설명하는 것과 제도를 옳다고 지지하는 것은 달라요. 건국 신화도 당시의 생각을 전하는 자료로 구분해 읽어요.') },
    { id: 'goguryeo', title: '고구려', group: '삼국·가야 함께 보기', period: '삼국 시대 · 백제·신라와 공존', requires: ['iron', 'gojoseon'], sources: ['goguryeo', 'goguryeoLife'],
      concepts: ['산성', '고분 벽화', '생활 자료'], facts: ['고구려에는 산성과 다양한 무기·갑옷의 흔적이 남아 있어요.', '고분 벽화에서는 당시 사람들의 옷과 활동 같은 생활 모습도 살필 수 있어요.'],
      goals: [built('fort', '산성 모형'), built('mural', '고분 벽화 관찰관')],
      reflection: question('고구려 벽화를 보고 남길 기록은?', ['전쟁 장면만 역사이고 일상 장면은 자료가 아님', '옷·놀이·활동도 당시 생활을 알려 주는 자료'], 1, '역사 자료에는 전쟁뿐 아니라 일상생활도 담겨요. 그림을 실제 모습과 완전히 같다고 단정하지 않고 관찰해요.') },
    { id: 'baekje', title: '백제', group: '삼국·가야 함께 보기', period: '삼국 시대 · 고구려·신라와 공존', requires: ['iron', 'gojoseon'], sources: ['baekje'],
      concepts: ['사비', '공예·장인', '문화 교류'], facts: ['백제는 사비로 수도를 옮겨 나라를 발전시키려 했어요.', '금동 대향로는 백제 장인과 공예 문화를 알려 주는 유물이에요.'],
      goals: [built('dock', '교류 나루 모형'), built('craftHall', '공예관')],
      reflection: question('공예관 안내판에는 어떤 설명이 어울릴까요?', ['금동 대향로를 통해 장인들의 기술과 문화를 살펴봄', '게임 재료 비율이 실제 향로의 제작법과 완전히 같음'], 0, '교류관·공예관은 학습용 모형이에요. 게임의 목재·점토 비용은 유물을 실제로 만들던 재료와 공정을 재현한 값이 아니에요.') },
    { id: 'silla', title: '신라', group: '삼국·가야 함께 보기', period: '삼국 시기의 신라 · 이후 통일 신라로 이어짐', requires: ['iron', 'gojoseon'], sources: ['silla'],
      concepts: ['골품제', '신분과 생활', '사회의 차이'], facts: ['신라의 골품제는 관직에 나아갈 기회와 생활에도 영향을 주었어요.', '옷·집 등에 관한 규정을 통해 신분에 따른 차이를 살필 수 있어요.'],
      goals: [built('sillaHall', '신라 생활 자료관')],
      reflection: question('골품제 자료에서 발견한 차이를 어떻게 설명할까요?', ['태어난 신분이 기회에 영향을 준 제도로 설명', '신분이 낮으면 능력도 낮았다는 증거로 설명'], 0, '신분 제도의 차별은 개인의 능력을 뜻하지 않아요. 당시의 규제를 살피고 오늘날의 평등한 권리와 비교해요.') },
    { id: 'gaya', title: '가야', group: '삼국·가야 함께 보기', period: '삼국과 함께 존재한 여러 가야', requires: ['iron', 'gojoseon'], sources: ['gaya'],
      concepts: ['여러 가야', '철 생산', '교역'], facts: ['가야는 여러 정치체가 연맹 관계를 이루며 성장했어요.', '금관가야 등은 철 생산과 물길을 이용한 교역으로 성장했어요.'],
      goals: [built('gayaMarket', '철 교역 주문 완료')],
      reflection: question('철을 많이 생산한 곳이 다른 지역과 연결되면?', ['철은 무기에만 쓰여 교류와 관계가 없음', '철을 교역품으로 바꾸며 지역 사이의 관계가 넓어짐'], 1, '철은 생산 도구·무기뿐 아니라 중요한 교역품이었어요. 교환 비율은 학습을 위한 가상 수치예요.') },
    { id: 'unifiedSilla', title: '통일 신라', group: '남북국 함께 보기', period: '7세기 후반~935년 · 발해와 공존', requires: ['goguryeo', 'baekje', 'silla', 'gaya'], sources: ['united'],
      concepts: ['남북국', '불교 문화', '장보고·청해진'], facts: ['통일 신라에서는 불교 문화가 발달하고 바닷길을 통한 교류가 활발했어요.', '장보고는 828년에 청해진을 설치했어요. 같은 시기 북쪽에는 발해가 있었어요.'],
      goals: [built('temple', '문화관'), built('seaRoute', '청해진 항로 모형')],
      reflection: question('이 시기의 역사 전시에서 신라 옆에 놓을 나라는?', ['발해 · 같은 시기에 함께 존재', '발해 · 신라가 사라진 뒤에야 건국'], 0, '통일 신라와 발해를 함께 보는 남북국의 관점이 중요해요. 한 나라가 다음 나라로 바뀌는 단순한 한 줄이 아니에요.') },
    { id: 'balhae', title: '발해', group: '남북국 함께 보기', period: '698~926년 · 신라와 공존', requires: ['goguryeo', 'baekje', 'silla', 'gaya'], sources: ['balhae', 'balhaeCities'],
      concepts: ['대조영', '고구려 유민·말갈', '여러 중심지·교류'], facts: ['대조영은 고구려 유민과 말갈 세력 등을 모아 발해를 세웠어요.', '여러 중심지와 교통로를 갖추고 주변 지역과 교류했어요. 번영하여 해동성국이라 불렸어요.'],
      goals: [built('balhaeRelay', '교통로 모형')],
      reflection: question('발해의 사람들을 소개하는 설명은?', ['고구려 유민과 말갈 등 여러 집단이 함께한 나라', '고구려가 멸망하기 전에 신라를 대신한 나라'], 0, '발해는 고구려 멸망 후 세워졌고 신라와 공존했어요. 다양한 집단이 함께한 역사를 살펴봐요.') },
    { id: 'laterBaekje', title: '후백제', group: '후삼국의 변화', period: '900~936년 · 견훤', requires: ['unifiedSilla', 'balhae'], sources: ['later'],
      concepts: ['신라 말의 변화', '견훤', '전란과 생활'], facts: ['신라 말 지방 세력이 성장하는 가운데 견훤은 900년에 후백제를 세웠어요.', '후삼국의 경쟁은 사람들의 생활에도 영향을 주었고 936년 고려가 후백제를 통합했어요.'],
      goals: [built('laterSupply', '생활·보급관')],
      reflection: question('후백제의 위치를 연표에 놓는다면?', ['삼국 시대 백제와 같은 나라·같은 시기로 놓기', '신라 말에 다시 등장한 나라로 구분하기'], 1, '백제와 후백제는 이름이 이어져도 성립 시기와 정치적 상황이 달라요. 후삼국은 신라·후백제·후고구려, 이후 고려의 관계로 살펴봐요.') },
    { id: 'laterGoguryeo', title: '후고구려·태봉', group: '후삼국의 변화', period: '901~918년 · 궁예', requires: ['unifiedSilla', 'balhae'], sources: ['later', 'taebong'],
      concepts: ['궁예', '국호의 변화', '고려의 건국'], facts: ['궁예는 901년에 후고구려를 세웠고 국호는 마진·태봉으로 바뀌었어요.', '왕건은 918년 고려를 세웠어요. 후고구려와 삼국 시대 고구려는 구분해요.'],
      goals: [built('taebongRecord', '국호 기록관')],
      reflection: question('후고구려에서 고려로 이어지는 기록을 읽을 때?', ['궁예의 나라와 왕건의 고려를 구분하고 연대를 확인', '고구려·후고구려·고려는 이름이 비슷하므로 같은 나라'], 0, '이름의 계승과 나라의 성립은 구분해요. 후고구려는 마진·태봉으로 이름을 바꾸었고, 고려 건국은 918년이에요.') },
    { id: 'goryeoFound', title: '고려의 건국과 통일', group: '고려의 생활과 문화', period: '918년 건국 · 935년 신라 통합 · 936년 후삼국 통일', requires: ['laterBaekje', 'laterGoguryeo'], sources: ['later'],
      concepts: ['왕건', '건국과 통일의 차이', '여러 세력의 통합'], facts: ['왕건이 고려를 세운 918년과 후삼국을 통일한 936년은 달라요.', '고려 건국 뒤에도 신라·후백제는 한동안 함께 존재했어요.'],
      goals: [built('agreement', '통합 기록관')],
      reflection: question('918년 고려가 세워졌다는 기록만으로 알 수 없는 일은?', ['왕건의 고려 건국', '그해에 후삼국 통일까지 모두 끝났다는 결론'], 1, '건국과 통일을 한 사건으로 합치지 않아요. 신라는 935년, 후백제는 936년에 고려로 통합되었어요.') },
    { id: 'goryeoTrade', title: '고려의 국제 교류', group: '고려의 생활과 문화', period: '고려 918~1392년 · 벽란도 사례', requires: ['goryeoFound'], sources: ['harbor'],
      concepts: ['개경', '예성강·벽란도', '교역·외교'], facts: ['벽란도는 예성강을 통해 개경과 이어지는 나루였어요.', '물자 교역과 외교 사절의 왕래를 함께 살피면 항구의 역할을 이해할 수 있어요.'],
      goals: [built('paperWorkshop', '기록을 위한 종이 공방'), built('goryeoHarbor', '벽란도 교류관')],
      reflection: question('항구를 수도와 이어 놓는 까닭은?', ['물자와 사람, 소식이 오가는 길이 되기 때문', '교류를 막아 다른 지역의 물건을 모두 없애기 위해'], 0, '항구·강·도시의 연결은 교역과 외교를 함께 도왔어요. 공방의 해금 순서는 실제 기술의 최초 발명 시기를 뜻하지 않아요.') },
    { id: 'goryeoPrint', title: '고려의 기록과 인쇄', group: '고려의 생활과 문화', period: '13세기 팔만대장경 · 1377년 직지', requires: ['goryeoTrade'], sources: ['woodblock', 'type'],
      concepts: ['목판과 금속활자', '팔만대장경', '직지'], facts: ['팔만대장경은 나무판에 새긴 불교 경전이에요. 금속활자로 만든 것이 아니에요.', '1377년 금속활자로 찍은 직지는 현재 남아 있는 가장 오래된 금속활자본이에요.'],
      goals: [built('woodblock', '목판 인쇄 공방'), { type: 'action', id: 'woodPrinted', amount: 2, label: '목판 방식으로 기록 2개 입고' }, built('movableType', '금속활자 조판대'), { type: 'action', id: 'typePrinted', amount: 2, label: '활자 방식으로 기록 2개 입고' }],
      reflection: question('인쇄 전시의 설명을 고른다면?', ['팔만대장경은 금속활자이고 직지는 목판본', '팔만대장경은 목판, 1377년 직지는 금속활자본'], 1, '목판은 판 전체에 글을 새기고, 활자는 글자 단위를 조합해요. 직지를 금속활자의 최초 발명 시점이라고 단정하지 않아요.') }
  ];
  const byId = id => CHAPTERS.find(c => c.id === id);
  function initial() { return { active: 'paleolithic', completed: [], answers: {}, produced: {}, actions: {}, reported: [], feedback: '', printMode: 'woodblock' }; }
  const TIMELINE = [
    { id: 'goguryeo', name: '고구려', start: -37, end: 668 }, { id: 'baekje', name: '백제', start: -18, end: 660 },
    { id: 'silla', name: '신라(통일 신라 포함)', start: -57, end: 935 }, { id: 'balhae', name: '발해', start: 698, end: 926 },
    { id: 'laterBaekje', name: '후백제', start: 900, end: 936 }, { id: 'laterGoguryeo', name: '후고구려·마진·태봉', start: 901, end: 918 },
    { id: 'goryeoFound', name: '고려', start: 918, end: 1392 }
  ];
  function timelineAt(year) { return TIMELINE.filter(n => n.start <= year && year < n.end); }
  function available(s, id) { const c = byId(id); return Boolean(c && c.requires.every(p => s.history.completed.includes(p))); }
  function gate(s, id) {
    if (id === 'neolithic') return s.era !== 'paleolithic';
    if (id === 'bronze' || id === 'iron') return s.history.completed.includes(id);
    if (id === 'kingdoms') return ['iron', 'gojoseon'].every(p => s.history.completed.includes(p));
    if (id === 'northSouth') return ['goguryeo', 'baekje', 'silla', 'gaya'].every(p => s.history.completed.includes(p));
    if (id === 'laterThree') return ['unifiedSilla', 'balhae'].every(p => s.history.completed.includes(p));
    if (id === 'goryeo') return ['laterBaekje', 'laterGoguryeo'].every(p => s.history.completed.includes(p));
    if (byId(id)) return s.history.completed.includes(id);
    return Boolean(s.flags[id] || s.buildings.some(b => b.type === id));
  }
  function goalDone(s, g) {
    if (g.type === 'project') return gate(s, g.id);
    if (g.type === 'bronzeCycle') return Boolean(s.bronze && ['harvest', 'storage', 'casting', 'evidence'].every(id => s.bronze.research[id]) && s.bronze.stats.processed > 0 && s.civilization.homes >= 12);
    if (g.type === 'settled') return s.era !== 'paleolithic';
    if (g.type === 'produced') return (s.history.produced[g.id] || 0) >= g.amount;
    if (g.type === 'action') return (s.history.actions[g.id] || 0) >= g.amount;
    return false;
  }
  function select(s, id) { if (!available(s, id)) return { ok: false, reason: '앞선 배움을 마치면 탐방할 수 있어요.' }; s.history.active = id; s.history.feedback = ''; return { ok: true }; }
  function setPrintMode(s, mode) {
    if (!['woodblock', 'type'].includes(mode) || !gate(s, mode === 'type' ? 'movableType' : 'woodblock')) return { ok: false, reason: '해당 인쇄 시설을 먼저 마련해요.' };
    s.history.printMode = mode; return { ok: true };
  }
  function answer(s, id, choice) {
    const c = byId(id);
    if (!c || !available(s, id) || !Number.isInteger(choice) || choice < 0 || choice >= c.reflection.choices.length) return { ok: false, reason: '열린 탐방의 선택지를 골라 주세요.' };
    const correct = choice === c.reflection.answer;
    s.history.answers[id] = correct; s.history.feedback = `${correct ? '잘 연결했어요.' : '자료를 한 번 더 살펴봐요.'} ${c.reflection.explain}`;
    return { ok: correct, reason: s.history.feedback };
  }
  function claimReason(s, id) {
    const c = byId(id);
    if (!c || !available(s, id)) return '먼저 앞선 배움을 마쳐요.';
    if (s.history.completed.includes(id)) return '이미 배움을 기록했어요.';
    if (!c.goals.every(g => goalDone(s, g))) return '생활·생산 과제를 먼저 마쳐요.';
    if (!s.history.answers[id]) return '자료를 보고 생각 잇기를 해봐요.';
    return '';
  }
  function claim(s, id) {
    const reason = claimReason(s, id); if (reason) return { ok: false, reason };
    s.history.completed.push(id); s.history.feedback = '';
    if (id === 'bronze' && s.era === 'neolithic') s.era = 'bronze';
    if (id === 'iron') s.era = 'iron';
    const next = CHAPTERS.find(c => !s.history.completed.includes(c.id) && available(s, c.id));
    if (next) s.history.active = next.id;
    s.events.unshift({ time: s.time, text: `${byId(id).title} 배움을 기록했어요.${id === 'bronze' ? ' 마을을 이어 가며 철기와 고조선을 함께 탐방해요.' : next ? ` 다음은 ${next.title}.` : ' 고려까지의 탐방을 마쳤어요.'}` }); s.events.length = Math.min(20, s.events.length);
    return { ok: true, chapter: id };
  }
  function record(s, resource, n, w) {
    if (n <= 0) return;
    s.history.produced[resource] = (s.history.produced[resource] || 0) + n;
    if (w?.job === 'printer') { const key = w.cargo?.method || 'woodPrinted'; s.history.actions[key] = (s.history.actions[key] || 0) + n; }
  }
  return { SOURCES, RESOURCES, ICONS, JOBS, PROJECTS, CHAPTERS, TIMELINE, timelineAt, byId, initial, available, gate, goalDone, select, setPrintMode, answer, claimReason, claim, record };
});
