// Yi Sun-sin: Battle of Okpo — deterministic browser-side combat simulation.
// Original implementation inspired by MIT-licensed PirateShipGame's component
// boundaries, broadside combat, and bounded wave progression.
export const WORLD = Object.freeze({ width: 2300, height: 1500 });

export const DIFFICULTIES = Object.freeze({
  normal: { label: '보통', description: '측면 포격과 기본 적선 기동을 익히는 해전' },
  hard: { label: '어려움', description: '적선이 포위·도선·함포 사거리를 판단해 협공하는 해전' }
});

export const ISLANDS = Object.freeze([
  { x: 320, y: 290, radius: 176, tint: 0 },
  { x: 2010, y: 1170, radius: 210, tint: 1 },
  { x: 1900, y: 260, radius: 110, tint: 2 },
  { x: 430, y: 1210, radius: 120, tint: 1 }
]);

export const SHIP_TYPES = Object.freeze({
  panokseon: { name: '판옥선', side: 'joseon', hp: 360, radius: 27, speed: 185, acceleration: 185, turn: 2.35, reload: 2.0, range: 455, damage: 26, volley: 2, boardingDamageTaken: .52 },
  escort: { name: '협선', side: 'joseon', hp: 135, radius: 18, speed: 185, acceleration: 200, turn: 2.8, reload: 3.0, range: 350, damage: 12, volley: 1, scoutRange: 680 },
  sahuseon: { name: '사후선', side: 'joseon', hp: 72, radius: 12, speed: 208, acceleration: 225, turn: 3.1, reload: 0, range: 0, damage: 0, volley: 0, scoutRange: 880 },
  kobaya: { name: '고바야', side: 'japan', hp: 54, radius: 16, speed: 161, acceleration: 190, turn: 2.95, reload: 3.0, range: 210, damage: 9, volley: 1 },
  sekibune: { name: '세키부네', side: 'japan', hp: 95, radius: 22, speed: 119, acceleration: 155, turn: 2.3, reload: 2.85, range: 285, damage: 14, volley: 1, boardingDamage: 24, boardingTime: 1.35 },
  atakebune: { name: '아타케부네', side: 'japan', hp: 175, radius: 31, speed: 83, acceleration: 115, turn: 1.65, reload: 3.2, range: 315, damage: 19, volley: 2, boardingDamage: 34, boardingTime: 1.8 },
  // First deployed at Sacheon; intentionally unavailable in the Okpo waves.
  turtle: { name: '거북선', side: 'joseon', hp: 400, radius: 30, speed: 158, acceleration: 160, turn: 2.15, reload: 2.35, range: 430, damage: 31, volley: 2, boardingDamageTaken: .18 },
  ming: { name: '명나라 전선', side: 'joseon', hp: 245, radius: 28, speed: 136, acceleration: 145, turn: 1.85, reload: 2.9, range: 420, damage: 22, volley: 2 }
});

export const SHIP_GUIDE = Object.freeze([
  { type: 'panokseon', period: '옥포 · 아군 주력', role: '높은 전투 갑판 · 좌우 화포', note: '격군을 아래층에 보호하고 높은 갑판에서 포격합니다. 적의 도선 피해를 줄입니다.' },
  { type: 'escort', period: '옥포 · 아군 호위', role: '정찰 · 연락 · 경무장 호위', note: '멀리 나타난 적선을 레이더에 알리고 기함 지휘에 호응합니다.' },
  { type: 'sahuseon', period: '옥포 · 아군 부속정', role: '연락 · 정찰 · 비무장', note: '적선 발견 범위를 넓히지만 화포를 발사하지 않습니다. 격침되면 정비 때 복구할 수 있습니다.' },
  { type: 'kobaya', period: '옥포 · 일본 소형선', role: '빠른 정찰 · 교란', note: '재빠른 방향 전환과 약한 원거리 공격이 특징입니다. 小早는 고바야로 표기합니다.' },
  { type: 'sekibune', period: '옥포 · 일본 중형선', role: '측면 기동 · 도선 접근', note: '포격을 피하며 가까이 접근해 갑판으로 뛰어오르려 합니다.' },
  { type: 'atakebune', period: '옥포 · 일본 대형선', role: '중장갑 누각 · 대형 화포 · 도선', note: '느리지만 견고하며 다층 누각을 갖춘 적 지휘함으로 등장합니다.' },
  { type: 'turtle', period: '사천 해전부터 출전', role: '덮개로 보호된 돌격선', note: '옥포에는 등장하지 않고 사천부터 자동으로 선봉 돌격합니다. 철판 장갑 여부는 확정된 사실로 단정하지 않습니다.' },
  { type: 'ming', period: '노량 · 명나라 지원', role: '조·명 연합 함대', note: '진린이 이끄는 명나라 수군의 참전을 반영한 게임용 전선입니다. 세부 함형과 화력은 고증된 제원이 아닙니다.' }
]);

// Fictionalised loadouts: historical-style names describe the role of each gun,
// while the numbers and special effects are arcade rules, not period statistics.
export const WEAPONS = Object.freeze({
  standard: { name: '기본 화포', damage: 26, volley: 2, reload: 2, range: 455, speed: 475, spread: .1, burn: 0, burnTime: 0 },
  rapid: { name: '속사 화포', damage: 17, volley: 2, reload: 1.15, range: 390, speed: 510, spread: .14, burn: 0, burnTime: 0 },
  heavy: { name: '대형 총통', damage: 68, volley: 1, reload: 2.85, range: 490, speed: 445, spread: .055, burn: 0, burnTime: 0 },
  scatter: { name: '근접 산탄', damage: 15, volley: 4, reload: 2.3, range: 310, speed: 455, spread: .34, burn: 0, burnTime: 0 },
  fire: { name: '화염탄', damage: 19, volley: 2, reload: 2.65, range: 420, speed: 465, spread: .12, burn: 7, burnTime: 2.8 }
});

export const WAVES = Object.freeze([
  { name: '옥포 앞바다', note: '적은 정면에서도 다가옵니다. 판옥선의 좌우 함포로 맞서세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'kobaya', 'sekibune'], interval: 4 },
  { name: '적의 반격', note: '세키부네가 측면으로 다가와 도선을 노립니다. 거리를 벌리며 사격하세요.', ships: ['sekibune', 'kobaya', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya', 'sekibune'], interval: 3.7 },
  { name: '옥포의 결전', note: '다층 누각의 아타케부네를 포함한 적선이 몰려옵니다. 협선을 지휘하며 화력을 집중하세요.', ships: ['kobaya', 'sekibune', 'atakebune', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya', 'kobaya', 'atakebune'], interval: 4.7 }
]);

// Historical order and broad tactical situations follow the naval campaigns.
// Combat strength, map scale, spawn timing and objectives remain arcade rules.
// Keep Okpo's original waves as the default to preserve existing saved runs/tests.
export const BATTLES = Object.freeze({
  okpo: {
    id: 'okpo', title: '옥포 해전', date: '1592 · 음력 5월 7일', chapter: 1,
    summary: '첫 승전. 정박한 적선을 탐지하고 판옥선의 측면 화포로 격파하세요.',
    history: '옥포의 승전 뒤 조선 수군은 합포와 적진포에서도 적선을 추격했습니다. 거북선은 아직 투입되지 않았습니다.',
    victory: '옥포 앞바다의 적선을 물리쳤습니다.', islands: ISLANDS, waves: WAVES,
    goals: [{ type: 'playerHits', label: '측면 함포 명중', target: 3 }, { type: 'sailed', label: '기함 기동', target: 260, unit: 'm' }, { type: 'orders', label: '함대 명령 실행', target: 2 }]
  },
  sacheon: {
    id: 'sacheon', title: '사천 해전', date: '1592 · 음력 5월 29일', chapter: 2,
    summary: '거북선 첫 실전. 포구에서 적선을 끌어낸 후 판옥선과 함께 협공하세요.',
    history: '사천 해전은 거북선이 처음 실전에 등장한 해전입니다. 이순신은 이 전투에서 어깨에 부상을 입었습니다.',
    victory: '사천의 적선을 물리치고 거북선의 위력을 확인했습니다.',
    islands: [{ x: 330, y: 350, radius: 235, tint: 0 }, { x: 1940, y: 255, radius: 185, tint: 1 }, { x: 2000, y: 1250, radius: 245, tint: 2 }, { x: 410, y: 1230, radius: 140, tint: 1 }],
    playerStart: { x: 930, y: 780, angle: 0.15 }, enemySpawn: { x: 1600, y: 770 }, turtle: true,
    waves: [
      { name: '사천 포구 유인', note: '먼저 움직여 적을 포구 밖으로 끌어내세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune'], interval: 4.4 },
      { name: '거북선의 돌격', note: '거북선이 적선으로 접근해 충돌 돌격을 시도합니다.', ships: ['sekibune', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.0 },
      { name: '사천의 반격', note: '기함과 거북선의 공격을 집중해 마지막 적선을 제압하세요.', ships: ['atakebune', 'sekibune', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.3 }
    ],
    goals: [{ type: 'sailed', label: '적선 유인 항해', target: 220, unit: 'm' }, { type: 'turtleRams', label: '거북선 돌격 적중', target: 1 }, { type: 'playerHits', label: '측면 화포 지원', target: 4 }]
  },
  dangpo: {
    id: 'dangpo', title: '당포 해전', date: '1592 · 음력 6월 2일', chapter: 3,
    summary: '적 지휘선을 집중 공격해 항구의 적 함대를 무너뜨리세요.',
    history: '당포에서는 거북선과 판옥선의 집중 공격으로 일본 지휘선이 격파되었습니다.',
    victory: '당포의 지휘선을 포함한 적 함대를 격파했습니다.',
    islands: [{ x: 370, y: 290, radius: 235, tint: 1 }, { x: 1960, y: 380, radius: 280, tint: 0 }, { x: 1950, y: 1260, radius: 190, tint: 2 }, { x: 370, y: 1180, radius: 160, tint: 1 }],
    playerStart: { x: 960, y: 760, angle: 0.2 }, enemySpawn: { x: 1630, y: 690 }, turtle: true,
    waves: [
      { name: '당포 수색', note: '지휘선의 위치를 찾기 위해 적 경계선을 돌파하세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune'], interval: 4.5 },
      { name: '지휘선 집중 공격', note: '대형 적선을 우선 격파하세요. 2번 집중 명령이 유용합니다.', ships: ['sekibune', 'atakebune', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.7 },
      { name: '항구의 잔적', note: '남은 적의 도선 시도를 피하며 교전을 마무리하세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.2 }
    ],
    goals: [{ type: 'playerHits', label: '적 경계선 타격', target: 3 }, { type: 'commandSunk', label: '적 지휘선 격파', target: 1 }, { type: 'orders', label: '함대 지휘', target: 2 }]
  },
  danghangpo: {
    id: 'danghangpo', title: '당항포 해전', date: '1592 · 음력 6월 5일', chapter: 4,
    summary: '좁은 만의 퇴로를 감시하고 도주하는 적선을 차단하세요.',
    history: '당항포에서는 이억기가 합류한 연합 함대가 포구의 적선을 공격했습니다. 적선과 아군 수는 플레이 규모에 맞춰 축소했습니다.',
    victory: '당항포의 좁은 해역에서 적의 탈출을 막았습니다.',
    islands: [{ x: 380, y: 220, radius: 280, tint: 1 }, { x: 850, y: 190, radius: 245, tint: 0 }, { x: 1520, y: 170, radius: 270, tint: 2 }, { x: 2120, y: 330, radius: 265, tint: 1 }, { x: 370, y: 1280, radius: 280, tint: 0 }, { x: 850, y: 1325, radius: 225, tint: 2 }, { x: 1580, y: 1330, radius: 250, tint: 1 }, { x: 2170, y: 1200, radius: 210, tint: 0 }],
    playerStart: { x: 940, y: 790, angle: 0.3 }, enemySpawn: { x: 1640, y: 740 }, turtle: true, retreat: true,
    waves: [
      { name: '만 입구 봉쇄', note: '좁은 수로에서 적선의 퇴로를 차단하세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune'], interval: 4.6 },
      { name: '연합 함대 협공', note: '이억기의 지원 함대와 함께 적선을 협공하세요.', ships: ['sekibune', 'atakebune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.4 },
      { name: '도주선 추격', note: '손상된 적선이 오른쪽 바다로 달아납니다. 놓치지 마세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'atakebune', 'sekibune', 'kobaya'], interval: 4.1 }
    ],
    goals: [{ type: 'sailed', label: '만 입구 진입', target: 260, unit: 'm' }, { type: 'orders', label: '연합 함대 명령', target: 1 }, { type: 'playerHits', label: '도주선 차단 포격', target: 4 }]
  },
  yulpo: {
    id: 'yulpo', title: '율포 해전', date: '1592 · 음력 6월 7일', chapter: 5,
    summary: '역풍을 이겨내고 율포에서 부산 쪽으로 달아나는 적선을 추격하세요.',
    history: '율포에서는 일본 대선 5척과 중선 2척의 도주를 발견해 역풍에도 노를 저으며 추격했습니다. 전장에 등장하는 함선 수와 도주 조건은 게임에 맞춘 재구성입니다.',
    victory: '거센 역풍을 이겨내고 율포의 도주선을 추격해 물리쳤습니다.',
    islands: [{ x: 270, y: 260, radius: 180, tint: 0 }, { x: 2030, y: 215, radius: 165, tint: 1 }, { x: 2080, y: 1270, radius: 160, tint: 2 }, { x: 350, y: 1270, radius: 170, tint: 0 }],
    playerStart: { x: 880, y: 770, angle: Math.PI / 2 }, enemySpawn: { x: 1550, y: 760 }, turtle: true,
    special: 'oars', pursuit: { escapeX: WORLD.width - 75, escapeLimit: 3, hardEscapeLimit: 2 },
    waves: [
      { name: '율포의 도주선', note: '적선을 발견했습니다. 4번 노 젓기를 사용해 추격을 시작하세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune'], interval: 4.5 },
      { name: '역풍 속 추격', note: '손상된 적선은 부산 쪽으로 달아납니다. 노 젓기 가속을 활용하세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.2 },
      { name: '마지막 차단', note: '달아나는 적선을 놓치지 않도록 항로를 막고 측면 포격하세요.', ships: ['sekibune', 'kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.0 }
    ],
    goals: [{ type: 'sailed', label: '추격 항해', target: 220, unit: 'm' }, { type: 'oarDistance', label: '노 젓기 가속 항해', target: 100, unit: 'm' }, { type: 'playerHits', label: '퇴로 차단 포격', target: 3 }]
  },
  hansando: {
    id: 'hansando', title: '한산도 대첩', date: '1592 · 음력 7월 8일', chapter: 6,
    summary: '적의 주력을 넓은 바다로 유인한 뒤 4번 명령으로 직접 학익진을 펼치세요.',
    history: '한산도에서 이순신·이억기·원균의 연합 함대가 와키사카의 주력과 싸웠습니다. 학익진을 펼쳐 적을 격파했습니다.',
    victory: '한산 앞바다의 학익진이 적 주력 함대를 무너뜨렸습니다.',
    islands: [{ x: 270, y: 240, radius: 175, tint: 0 }, { x: 2000, y: 160, radius: 125, tint: 1 }, { x: 2050, y: 1320, radius: 185, tint: 2 }],
    playerStart: { x: 780, y: 760, angle: .4 }, enemySpawn: { x: 1690, y: 760 }, formation: 'crane', special: 'crane', turtle: true,
    waves: [
      { name: '적의 주력 유인', note: '기함으로 항해해 적을 넓은 바다로 끌어낸 다음 4번 학익진을 지휘하세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.2 },
      { name: '학익진 전개', note: '좌우 날개가 진형을 갖출 때까지 버티고 측면 포격을 유도하세요.', ships: ['sekibune', 'atakebune', 'kobaya', 'sekibune', 'sekibune', 'kobaya', 'sekibune'], interval: 4.0 },
      { name: '한산의 결전', note: '적 지휘선을 포함한 주력 함대를 좌우에서 협공하세요.', ships: ['atakebune', 'sekibune', 'kobaya', 'sekibune', 'atakebune', 'sekibune', 'kobaya', 'sekibune'], interval: 4.4 }
    ],
    goals: [{ type: 'sailed', label: '주력 유인 기동', target: 270, unit: 'm' }, { type: 'wingHits', label: '학익진 날개 함포 명중', target: 2 }, { type: 'commandSunk', label: '주력 지휘선 격파', target: 1 }]
  },
  angolpo: {
    id: 'angolpo', title: '안골포 해전', date: '1592 · 음력 7월 10일', chapter: 7,
    summary: '얕은 포구에 머무는 적을 여러 함대가 번갈아 공격하는 포구 공략전입니다.',
    history: '한산도 승리 뒤 안골포의 일본 주력대가 얕은 포구를 이용해 나오지 않자 조선 함대는 차례로 포구를 드나들며 공격했고 이억기 함대가 합세했습니다. 수심선과 포격 보정은 게임 규칙입니다.',
    victory: '안골포의 얕은 포구에 자리 잡은 일본 주력을 연합 함대로 격파했습니다.',
    islands: [{ x: 260, y: 220, radius: 185, tint: 0 }, { x: 1940, y: 180, radius: 320, tint: 1 }, { x: 2070, y: 1350, radius: 340, tint: 2 }, { x: 340, y: 1230, radius: 145, tint: 1 }],
    playerStart: { x: 850, y: 760, angle: .3 }, enemySpawn: { x: 1620, y: 770 }, turtle: true,
    special: 'rotation', harbor: { shallowX: 1810 },
    waves: [
      { name: '포구 밖 정찰', note: '얕은 수심선을 넘지 말고 적선을 포격 사거리 안에 두세요.', ships: ['kobaya', 'sekibune', 'sekibune', 'kobaya'], interval: 4.4 },
      { name: '교대 포격', note: '4번 교대 포격 명령으로 아군을 번갈아 투입하세요.', ships: ['sekibune', 'atakebune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.2 },
      { name: '연합 함대 결전', note: '이억기의 지원 전선과 협공하며 포구의 지휘선을 격파하세요.', ships: ['atakebune', 'sekibune', 'kobaya', 'atakebune', 'sekibune', 'kobaya'], interval: 4.1 }
    ],
    goals: [{ type: 'playerHits', label: '포구 밖에서 포격', target: 3 }, { type: 'rotationOrders', label: '교대 포격 명령', target: 1 }, { type: 'commandSunk', label: '포구 지휘선 격파', target: 1 }]
  },
  busanpo: {
    id: 'busanpo', title: '부산포 해전', date: '1592 · 음력 9월 1일', chapter: 8,
    summary: '해안 포격을 피해 항구의 정박선을 격파하고 아군 함대를 안전하게 물리세요.',
    history: '조선 수군은 부산포에서 일본 선박을 다수 격파하고 돌아왔습니다. 항구나 성을 점령한 전투는 아닙니다.',
    victory: '부산포의 적선을 타격한 뒤 함대를 안전하게 철수했습니다.',
    islands: [{ x: 1950, y: 270, radius: 180, tint: 1 }, { x: 2080, y: 1250, radius: 190, tint: 0 }, { x: 340, y: 200, radius: 115, tint: 2 }],
    playerStart: { x: 850, y: 770, angle: .65 }, enemySpawn: { x: 1580, y: 770 }, turtle: true,
    shoreBattery: { x: 1870, y: 490, radius: 780 }, withdraw: { x: 550 },
    waves: [
      { name: '부산포 접근', note: '항구 가까이 접근해 정박선의 호위를 격파하세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.4 },
      { name: '항구 정박선 타격', note: '해안에서 날아오는 포탄을 피하며 적선을 공격하세요.', ships: ['sekibune', 'atakebune', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.2 },
      { name: '귀환 항로 확보', note: '남은 적선을 격파한 다음 서쪽 외해로 철수하세요.', ships: ['sekibune', 'kobaya', 'atakebune', 'sekibune', 'kobaya', 'sekibune'], interval: 4.0 }
    ],
    goals: [{ type: 'playerHits', label: '항구 호위선 격파 지원', target: 3 }, { type: 'commandSunk', label: '정박 대형선 격파', target: 1 }, { type: 'withdrawn', label: '서쪽 외해로 안전 철수', target: 1 }]
  },
  myeongnyang: {
    id: 'myeongnyang', title: '명량 대첩', date: '1597 · 음력 9월 16일', chapter: 9,
    summary: '압도적인 적에 맞서 울돌목의 좁은 수로와 반전하는 조류를 활용하세요.',
    history: '칠천량 패전 후 이순신은 소수의 조선 수군을 이끌고 명량의 좁은 해협에서 일본 함대를 물리쳤습니다. 함선 수는 축약했습니다.',
    victory: '거센 물살을 이겨내고 명량해협을 지켰습니다.',
    islands: [{ x: 1130, y: 270, radius: 165, tint: 1 }, { x: 1510, y: 1240, radius: 190, tint: 0 }, { x: 330, y: 250, radius: 155, tint: 2 }, { x: 2100, y: 260, radius: 160, tint: 0 }],
    playerStart: { x: 990, y: 770, angle: .55 }, enemySpawn: { x: 1710, y: 790 }, current: { xMin: 750, xMax: 1740, yMin: 415, yMax: 1100, speed: 54, period: 24 },
    waves: [
      { name: '울돌목 진입', note: '좁은 해협에서 거센 조류를 견디며 적의 선봉을 막으세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune'], interval: 4.3 },
      { name: '조류 역전', note: '물살이 바뀌는 순간을 이용해 적선을 측면에서 포격하세요.', ships: ['sekibune', 'kobaya', 'atakebune', 'sekibune', 'kobaya', 'sekibune'], interval: 4.1 },
      { name: '명량의 반격', note: '불리한 병력 차를 이겨내고 적의 마지막 파도를 격파하세요.', ships: ['atakebune', 'sekibune', 'kobaya', 'sekibune', 'atakebune', 'kobaya'], interval: 4.3 }
    ],
    goals: [{ type: 'sailed', label: '울돌목 항해', target: 220, unit: 'm' }, { type: 'tideTurns', label: '조류 반전 활용', target: 1 }, { type: 'playerHits', label: '좁은 해협 측면 포격', target: 4 }]
  },
  noryang: {
    id: 'noryang', title: '노량 해전', date: '1598 · 음력 11월 18~19일', chapter: 10,
    summary: '깊은 밤 진린의 명나라 수군과 연합해 일본군의 철수 함대를 저지하세요.',
    history: '노량에서 이순신과 진린의 조·명 연합 수군이 철수하는 일본 함대와 싸웠습니다. 이순신이 전사한 마지막 해전입니다.',
    victory: '조·명 연합 함대가 노량에서 마지막 승리를 거두었습니다. 이순신은 이 전투에서 전사했습니다.',
    islands: [{ x: 400, y: 250, radius: 280, tint: 0 }, { x: 1990, y: 230, radius: 290, tint: 1 }, { x: 405, y: 1310, radius: 300, tint: 2 }, { x: 2010, y: 1300, radius: 340, tint: 0 }],
    playerStart: { x: 920, y: 800, angle: .35 }, enemySpawn: { x: 1650, y: 720 }, night: true, mingReinforcement: true, retreat: true, turtle: true,
    waves: [
      { name: '야조의 적 함대', note: '밤바다에서 적의 접근을 레이더로 탐지하세요.', ships: ['kobaya', 'sekibune', 'kobaya', 'sekibune', 'kobaya'], interval: 4.0 },
      { name: '조·명 연합 포격', note: '진린의 명나라 지원 전선과 함께 적 주력을 격파하세요.', ships: ['sekibune', 'atakebune', 'kobaya', 'sekibune', 'sekibune', 'kobaya', 'atakebune'], interval: 4.0 },
      { name: '최후의 해전', note: '철수하려는 일본 함선이 노량해협을 빠져나가지 못하게 저지하세요.', ships: ['atakebune', 'sekibune', 'kobaya', 'atakebune', 'sekibune', 'kobaya', 'sekibune', 'atakebune'], interval: 4.0 }
    ],
    goals: [{ type: 'playerHits', label: '야간 표적 포격', target: 3 }, { type: 'mingHits', label: '명나라 연합 함포 명중', target: 2 }, { type: 'commandSunk', label: '철수 함대 지휘선 격파', target: 1 }]
  }
});

export const BATTLE_ORDER = Object.freeze(['okpo', 'sacheon', 'dangpo', 'danghangpo', 'yulpo', 'hansando', 'angolpo', 'busanpo', 'myeongnyang', 'noryang']);
const LEGACY_BATTLE_ORDER = Object.freeze(['okpo', 'sacheon', 'dangpo', 'danghangpo', 'hansando', 'busanpo', 'myeongnyang', 'noryang']);

export function restoreCampaign(saved) {
  const completed = [...new Set((Array.isArray(saved?.completed) ? saved.completed : []).filter(id => BATTLES[id]))];
  const unlocked = [...new Set((Array.isArray(saved?.unlocked) ? saved.unlocked : []).filter(id => BATTLES[id]))];
  // Existing v1 progress had an eight-stage route. Keep the highest stage and
  // its next available stage reachable when inserting battles in the middle.
  if (saved && !saved.version) {
    const previous = LEGACY_BATTLE_ORDER.reduce((highest, id, index) => completed.includes(id) ? index : highest, -1);
    const oldNext = LEGACY_BATTLE_ORDER[Math.min(previous + 1, LEGACY_BATTLE_ORDER.length - 1)];
    const lastReachable = previous < 0 ? 0 : BATTLE_ORDER.indexOf(oldNext);
    for (const id of BATTLE_ORDER.slice(0, lastReachable + 1)) if (!unlocked.includes(id)) unlocked.push(id);
  }
  return { version: 2, completed, unlocked };
}

export function isBattleUnlocked(campaign, id) {
  const index = BATTLE_ORDER.indexOf(id);
  return index >= 0 && (index === 0 || campaign.completed.includes(id) || campaign.unlocked?.includes(id) || campaign.completed.includes(BATTLE_ORDER[index - 1]));
}

export const UPGRADES = Object.freeze([
  { id: 'cannon', icon: '砲', title: '화포 정비', text: '모든 함포 피해량 18% 증가' },
  { id: 'reload', icon: '⚙', title: '포수 숙련', text: '함포 재장전 시간 15% 감소' },
  { id: 'hull', icon: '⚒', title: '선체 수리', text: '판옥선 내구도 70 회복' },
  { id: 'escort', icon: '⚑', title: '협선 보강', text: '협선을 복구하거나 내구도 95 회복' },
  { id: 'sahuseon', icon: '目', title: '사후선 복구', text: '정찰·연락용 사후선을 복구' },
  { id: 'turtle', icon: '龜', title: '거북선 수리', text: '거북선을 복구하거나 내구도 170 회복' },
  { id: 'rudder', icon: '↶', title: '노련한 키잡이', text: '선회 속도 14% 증가' },
  { id: 'range', icon: '◎', title: '거리 가늠', text: '함포 사거리 14% 증가' },
  ...['rapid', 'heavy', 'scatter', 'fire'].flatMap(weapon => [
    { id: `port_${weapon}`, icon: '左', title: `좌현 · ${WEAPONS[weapon].name}`, text: weapon === 'rapid' ? '장전이 빠른 화포로 교체' : weapon === 'heavy' ? '강력한 한 발로 적선을 공격' : weapon === 'scatter' ? '가까운 적선에 여러 발을 발사' : '적선에 불을 붙여 지속 피해', slot: 'port', weapon },
    { id: `starboard_${weapon}`, icon: '右', title: `우현 · ${WEAPONS[weapon].name}`, text: weapon === 'rapid' ? '장전이 빠른 화포로 교체' : weapon === 'heavy' ? '강력한 한 발로 적선을 공격' : weapon === 'scatter' ? '가까운 적선에 여러 발을 발사' : '적선에 불을 붙여 지속 피해', slot: 'starboard', weapon }
  ])
]);

const TAU = Math.PI * 2;
const cap = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fwd = angle => ({ x: Math.sin(angle), y: -Math.cos(angle) });
const right = angle => ({ x: Math.cos(angle), y: Math.sin(angle) });
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function turnTowards(current, target, step) {
  const delta = wrap(target - current);
  return wrap(current + cap(delta, -step, step));
}

export function seededRandom(state) {
  let value = state.seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.seed = value >>> 0 || 1;
  return state.seed / 4294967296;
}

export function makeShip(type, x, y, angle = 0, id = '') {
  const spec = SHIP_TYPES[type];
  if (!spec) throw new Error(`Unknown vessel: ${type}`);
  return {
    id, type, team: spec.side, x, y, angle, speed: 0, hp: spec.hp, maxHp: spec.hp,
    reload: [0, 0], hitCooldown: 0, dead: false, targetId: '', wakeClock: 0,
    aiMode: 'approach', aiTargetId: '',
    flank: 1, aimSteady: 1, turnRate: 0, burnRemaining: 0, burnDps: 0,
    tacticClock: 3.5, boardingRun: type === 'sekibune', boardingProgress: 0,
    boardingTargetId: '', boardingCooldown: 0, ramCooldown: 0
  };
}

export function createGame(seed = 1592, difficulty = 'normal', battleId = 'okpo') {
  const battle = BATTLES[battleId] || BATTLES.okpo;
  const origin = battle.playerStart || { x: 1160, y: 805, angle: -0.25 };
  const game = {
    battleId: battle.id, battle, islands: battle.islands,
    difficulty: DIFFICULTIES[difficulty] ? difficulty : 'normal',
    seed: seed || 1592, mode: 'menu', seconds: 0, waveIndex: 0, spawned: 0,
    spawnClock: 0, kills: 0, hits: 0, shotsFired: 0, score: 0, selected: [],
    bonuses: { damage: 1, reload: 1, range: 1, turn: 1 },
    signalCooldown: 0, signalRemaining: 0, signalOrder: 'rally', focusTargetId: '',
    special: { state: battle.special === 'crane' ? 'lure' : 'ready', cooldown: 0, remaining: 0, deployClock: 0, lastWarn: -100 },
    stationarySeconds: 0,
    tactical: { playerHits: 0, sailed: 0, orders: 0, turtleRams: 0, commandSunk: 0, wingHits: 0, mingHits: 0, tideTurns: 0, withdrawn: 0, escaped: 0, oarDistance: 0, craneOrders: 0, rotationOrders: 0, completed: [false, false, false] },
    withdrawal: false, shoreClock: 5, tideDirection: 1, tideClock: 0,
    arsenal: { port: 'standard', starboard: 'standard' },
    events: [], shots: [], effects: [],
    enemies: [], player: makeShip('panokseon', origin.x, origin.y, origin.angle, 'flagship'),
    allies: [makeShip('escort', origin.x - 80, origin.y + 70, origin.angle, 'escort-1'), makeShip('sahuseon', origin.x + 60, origin.y + 130, origin.angle, 'sahuseon-1')]
  };
  if (battle.turtle) game.allies.push(makeShip('turtle', origin.x - 180, origin.y + 120, origin.angle, 'turtle-1'));
  if (battle.formation === 'crane') {
    game.allies.push(makeShip('panokseon', origin.x - 130, origin.y - 180, origin.angle, 'wing-left'));
    game.allies.push(makeShip('panokseon', origin.x + 130, origin.y + 180, origin.angle, 'wing-right'));
  }
  return game;
}

export function startRun(game) {
  game.mode = 'playing';
  game.waveIndex = 0;
  game.spawned = 0;
  game.spawnClock = 1.2;
  game.events.push({ kind: 'wave', text: `${game.battle.title} · ${game.difficulty === 'hard' ? '어려움 · 적선의 협공에 대비하세요!' : getWave(game).name}` });
  return game;
}

export function getWave(game) {
  return game.battle.waves[game.waveIndex] || null;
}

export function getEscapeLimit(game) {
  if (!game.battle.pursuit) return 0;
  return game.difficulty === 'hard' ? game.battle.pursuit.hardEscapeLimit : game.battle.pursuit.escapeLimit;
}

export function getTacticalObjective(game) {
  const goals = game.battle.goals;
  const goal = goals[game.waveIndex] || goals[goals.length - 1];
  return { ...goal, value: game.tactical[goal.type] || 0, completed: game.tactical.completed[game.waveIndex] };
}

function awardTacticalObjective(game) {
  if (game.mode !== 'playing' || game.player.dead) return;
  const goal = getTacticalObjective(game);
  if (goal.completed || goal.value < goal.target) return;
  game.tactical.completed[game.waveIndex] = true;
  game.score += Math.round((160 + game.waveIndex * 70) * (game.difficulty === 'hard' ? 1.3 : 1));
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 22);
  game.events.push({ kind: 'objective', text: `전술 임무 달성 · ${goal.label}! 전공과 긴급 수리 획득` });
}

export function upgradeChoices(game) {
  const shuffled = options => {
    const result = [...options];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(game) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const port = shuffled(UPGRADES.filter(o => o.slot === 'port' && game.arsenal.port !== o.weapon))[0];
  const starboard = shuffled(UPGRADES.filter(o => o.slot === 'starboard' && game.arsenal.starboard !== o.weapon))[0];
  const escort = game.allies[0];
  const turtle = game.allies.find(ally => ally.type === 'turtle');
  const available = shuffled(UPGRADES.filter(o => !o.slot &&
    !(o.id === 'hull' && game.player.hp >= game.player.maxHp - 15) &&
    !(o.id === 'escort' && escort && !escort.dead && escort.hp >= escort.maxHp - 15) &&
    !(o.id === 'sahuseon' && game.allies.some(ally => ally.type === 'sahuseon' && !ally.dead)) &&
    !(o.id === 'turtle' && (!turtle || (!turtle.dead && turtle.hp >= turtle.maxHp - 15)))));
  const support = escort?.dead ? UPGRADES.find(o => o.id === 'escort') :
    game.allies.some(ally => ally.type === 'sahuseon' && ally.dead) ? UPGRADES.find(o => o.id === 'sahuseon') :
    turtle?.dead ? UPGRADES.find(o => o.id === 'turtle') : available[0];
  return shuffled([port, starboard, support].filter(Boolean));
}

export function takeUpgrade(game, id) {
  if (game.mode !== 'upgrade' || !game.selected.includes(id)) return false;
  // The crews patch ordinary damage between engagements; the hull upgrade adds
  // a further, meaningful repair instead of becoming a compulsory pick.
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 75);
  if (id === 'cannon') game.bonuses.damage *= 1.18;
  if (id === 'reload') game.bonuses.reload *= 0.85;
  if (id === 'range') game.bonuses.range *= 1.14;
  if (id === 'rudder') game.bonuses.turn *= 1.14;
  if (id === 'hull') game.player.hp = Math.min(game.player.maxHp, game.player.hp + 70);
  const weaponUpgrade = UPGRADES.find(option => option.id === id && option.slot);
  if (weaponUpgrade) game.arsenal[weaponUpgrade.slot] = weaponUpgrade.weapon;
  if (id === 'escort') {
    const escort = game.allies[0];
    if (escort?.dead) {
      const behind = fwd(game.player.angle), flank = right(game.player.angle);
      game.allies[0] = makeShip('escort',
        cap(game.player.x - behind.x * 110 - flank.x * 80, 55, WORLD.width - 55),
        cap(game.player.y - behind.y * 110 - flank.y * 80, 55, WORLD.height - 55),
        game.player.angle, 'escort-1');
    } else if (escort) escort.hp = Math.min(escort.maxHp, escort.hp + 95);
  }
  if (id === 'sahuseon') {
    const behind = fwd(game.player.angle), side = right(game.player.angle);
    game.allies[1] = makeShip('sahuseon',
      cap(game.player.x - behind.x * 100 + side.x * 90, 35, WORLD.width - 35),
      cap(game.player.y - behind.y * 100 + side.y * 90, 35, WORLD.height - 35), game.player.angle, 'sahuseon-1');
  }
  if (id === 'turtle') {
    const index = game.allies.findIndex(ally => ally.type === 'turtle');
    if (index >= 0) {
      const turtle = game.allies[index];
      if (turtle.dead) game.allies[index] = makeShip('turtle',
        cap(game.player.x - 135, 60, WORLD.width - 60),
        cap(game.player.y + 125, 60, WORLD.height - 60), game.player.angle, 'turtle-1');
      else turtle.hp = Math.min(turtle.maxHp, turtle.hp + 170);
    }
  }
  game.waveIndex++;
  if (['danghangpo', 'angolpo'].includes(game.battleId) && game.waveIndex === 1 && !game.allies.some(ally => ally.id === 'eokgi-1')) {
    game.allies.push(makeShip('panokseon',
      cap(game.player.x - 120, 65, WORLD.width - 65),
      cap(game.player.y + 155, 65, WORLD.height - 65), game.player.angle, 'eokgi-1'));
    game.events.push({ kind: 'wave', text: '전라우수사 이억기의 지원 전선이 합류했습니다!' });
  }
  if (game.battle.mingReinforcement && game.waveIndex === 1 && !game.allies.some(ally => ally.id === 'ming-1')) {
    game.allies.push(makeShip('ming',
      cap(game.player.x + 160, 65, WORLD.width - 65),
      cap(game.player.y + 175, 65, WORLD.height - 65), game.player.angle, 'ming-1'));
    game.events.push({ kind: 'wave', text: '진린이 지휘하는 명나라 수군의 지원 전선이 합류했습니다!' });
  }
  game.spawned = 0;
  game.spawnClock = 1.6;
  game.stationarySeconds = 0;
  game.tactical.playerHits = 0;
  game.tactical.sailed = 0;
  game.tactical.orders = 0;
  game.tactical.turtleRams = 0;
  game.tactical.commandSunk = 0;
  game.tactical.wingHits = 0;
  game.tactical.mingHits = 0;
  game.tactical.tideTurns = 0;
  game.tactical.withdrawn = 0;
  game.tactical.oarDistance = 0;
  game.tactical.rotationOrders = 0;
  if (game.battle.special === 'crane') {
    game.special.state = 'lure';
    game.special.remaining = 0;
    game.special.deployClock = 0;
    game.special.cooldown = 0;
  }
  game.selected = [];
  game.mode = 'playing';
  game.events.push({ kind: 'wave', text: `${game.waveIndex + 1}차 교전 · ${getWave(game).name}` });
  return true;
}

export function issueSignal(game) {
  return issueOrder(game, 'rally');
}

export function issueOrder(game, order) {
  if (!['rally', 'focus', 'guard'].includes(order) || game.mode !== 'playing' || game.signalCooldown > 0 || !game.allies.some(ship => ship.type === 'escort' && !ship.dead)) return false;
  if (order === 'focus') {
    const priority = game.enemies.filter(ship => !ship.dead).sort((a, b) =>
      (b.type === 'atakebune') - (a.type === 'atakebune') || distance(a, game.player) - distance(b, game.player))[0];
    if (!priority) return false;
    game.focusTargetId = priority.id;
  } else game.focusTargetId = '';
  game.signalCooldown = 24;
  game.signalRemaining = 8;
  game.signalOrder = order;
  game.tactical.orders++;
  game.events.push({ kind: 'signal', text: order === 'rally' ? '호위 집결! 기함과 협선이 함께 속사합니다.' : order === 'focus' ? '집중 공격! 지정 적선을 함께 공격합니다.' : '기함 엄호! 협선이 가까이서 적의 공격을 막습니다.' });
  return true;
}

// 4 is a battle-specific order, separate from the standard escort orders.
export function issueSpecial(game) {
  const kind = game.battle.special;
  if (game.mode !== 'playing' || !kind || game.special.cooldown > 0) return false;
  if (kind === 'crane') {
    if (!game.allies.some(ally => ally.id.startsWith('wing-') && !ally.dead)) return false;
    const enemyLured = game.enemies.some(enemy => !enemy.dead && distance(enemy, game.player) <= 940);
    if (game.tactical.sailed < 95 || !enemyLured) {
      if (game.seconds - game.special.lastWarn >= 3) {
        game.special.lastWarn = game.seconds;
        game.events.push({ kind: 'signal', text: '아직 유인 중입니다. 기함을 항해해 적 주력이 따라오면 학익진을 펼치세요.' });
      }
      return false;
    }
    game.special.state = 'deploying';
    game.special.deployClock = 5.5;
    game.special.remaining = 18;
    game.special.cooldown = 33;
    game.events.push({ kind: 'signal', text: '학익진 전개 명령! 좌익과 우익이 적 함대를 둘러싸도록 기동합니다.' });
  } else if (kind === 'oars') {
    game.special.state = 'active';
    game.special.remaining = 6;
    game.special.cooldown = 21;
    game.events.push({ kind: 'signal', text: '격군들이 힘차게 노를 젓습니다! 역풍 속 추격 속도가 빨라집니다.' });
  } else if (kind === 'rotation') {
    if (!game.enemies.some(enemy => !enemy.dead)) return false;
    game.special.state = 'active';
    game.special.remaining = 9;
    game.special.cooldown = 26;
    game.tactical.rotationOrders++;
    game.events.push({ kind: 'signal', text: '교대 포격 명령! 아군 전선이 차례로 포구에 접근해 집중 사격합니다.' });
  } else return false;
  return true;
}

export function togglePause(game) {
  if (game.mode === 'playing') game.mode = 'paused';
  else if (game.mode === 'paused') game.mode = 'playing';
}

function steer(ship, desiredAngle, throttle, dt, bonus = 1, speedBonus = 1) {
  const cfg = SHIP_TYPES[ship.type];
  const baseTurn = cfg.turn * bonus * (0.35 + 0.65 * cap(Math.abs(ship.speed) / 85, 0, 1));
  const beforeTurn = ship.angle;
  ship.angle = turnTowards(ship.angle, desiredAngle, baseTurn * dt);
  ship.turnRate = Math.abs(wrap(ship.angle - beforeTurn)) / Math.max(dt, 0.0001);
  if (ship.id === 'flagship') {
    // The gun crews need a brief steady course; full-rudder circles cannot fire endlessly.
    ship.aimSteady = cap(ship.aimSteady + (ship.turnRate > 1.6 ? -2.8 : 1.8) * dt, 0, 1);
  }
  const acceleration = throttle > 0 ? cfg.acceleration * speedBonus : throttle < 0 ? cfg.acceleration * 1.7 : 0;
  ship.speed += throttle * acceleration * dt;
  ship.speed *= Math.exp(-0.68 * dt);
  ship.speed = cap(ship.speed, -cfg.speed * 0.25, cfg.speed * speedBonus);
  const direction = fwd(ship.angle);
  ship.x += direction.x * ship.speed * dt;
  ship.y += direction.y * ship.speed * dt;
  const boundedX = cap(ship.x, cfg.radius + 10, WORLD.width - cfg.radius - 10);
  const boundedY = cap(ship.y, cfg.radius + 10, WORLD.height - cfg.radius - 10);
  if (ship.x !== boundedX || ship.y !== boundedY) ship.speed *= 0.68;
  ship.x = boundedX;
  ship.y = boundedY;
}

function dodgeLand(game, ship, dt) {
  for (const island of game.islands) {
    const dx = ship.x - island.x;
    const dy = ship.y - island.y;
    const d = Math.hypot(dx, dy) || 1;
    const min = island.radius + SHIP_TYPES[ship.type].radius * 0.65;
    if (d >= min) continue;
    ship.x = island.x + dx / d * min;
    ship.y = island.y + dy / d * min;
    ship.speed *= -0.12;
    if (ship.hitCooldown <= 0) {
      ship.hp -= 5;
      ship.hitCooldown = 1.3;
      addEffect(game, ship.x, ship.y, 'splash', 0.8);
      if (ship.hp <= 0) sink(game, ship);
    }
  }
  ship.hitCooldown = Math.max(0, ship.hitCooldown - dt);
}

function addEffect(game, x, y, type, duration = 0.7, details = {}) {
  game.effects.push({ x, y, type, duration, age: 0, seed: seededRandom(game), ...details });
  if (game.effects.length > 140) game.effects.splice(0, game.effects.length - 140);
}

function sink(game, ship) {
  if (ship.dead) return;
  ship.dead = true;
  ship.hp = 0;
  addEffect(game, ship.x, ship.y, 'sink', 1.6);
  if (ship.team === 'japan') {
    game.kills++;
    if (ship.type === 'atakebune') game.tactical.commandSunk++;
    const points = ship.type === 'atakebune' ? 250 : ship.type === 'sekibune' ? 130 : 80;
    game.score += Math.round(points * (game.difficulty === 'hard' ? 1.3 : 1));
    game.events.push({ kind: 'hit', text: `${SHIP_TYPES[ship.type].name} 격침` });
  } else if (ship.id === 'flagship') {
    game.mode = 'defeat';
    game.events.push({ kind: 'defeat', text: '기함이 더는 항해할 수 없습니다.' });
  }
}

function spawnEnemy(game) {
  const wave = getWave(game);
  if (!wave || game.spawned >= wave.ships.length) return;
  const type = wave.ships[game.spawned];
  let x = 0, y = 0;
  const validSpawn = (sx, sy) =>
    Math.hypot(sx - game.player.x, sy - game.player.y) >= 375 &&
    game.islands.every(island => Math.hypot(sx - island.x, sy - island.y) >= island.radius + 90);
  let found = false;
  // Ports have stable approach lanes; the Okpo scenario preserves its
  // original surrounding spawns. Every position is checked against land.
  if (game.battle.enemySpawn) {
    for (let attempt = 0; attempt < 28; attempt++) {
      const offset = (seededRandom(game) - .5) * 540;
      const sx = cap(game.battle.enemySpawn.x + (seededRandom(game) - .5) * 220, 90, WORLD.width - 90);
      const sy = cap(game.battle.enemySpawn.y + offset, 90, WORLD.height - 90);
      if (validSpawn(sx, sy)) { x = sx; y = sy; found = true; break; }
    }
  }
  // Try alternating flanks first, but never clamp a spawn on top of a cornered player.
  for (let attempt = 0; !found && attempt < 48; attempt++) {
    const theta = attempt < 24
      ? (game.spawned % 2 ? Math.PI : 0) + game.waveIndex * 0.85 + (seededRandom(game) - 0.5) * 1.8
      : seededRandom(game) * TAU;
    const radius = 460 + seededRandom(game) * 160;
    const candidateX = game.player.x + Math.cos(theta) * radius;
    const candidateY = game.player.y + Math.sin(theta) * radius;
    x = cap(candidateX, 90, WORLD.width - 90);
    y = cap(candidateY, 90, WORLD.height - 90);
    if (validSpawn(x, y)) { found = true; break; }
  }
  if (!found) {
    // A corner plus a nearby island can reject every random attempt.
    search: for (const radius of [480, 620, 780, 960, 1160]) {
      for (let segment = 0; segment < 32; segment++) {
        const theta = segment / 32 * TAU;
        const sx = cap(game.player.x + Math.cos(theta) * radius, 90, WORLD.width - 90);
        const sy = cap(game.player.y + Math.sin(theta) * radius, 90, WORLD.height - 90);
        if (!validSpawn(sx, sy)) continue;
        x = sx; y = sy; found = true;
        break search;
      }
    }
  }
  const angle = Math.atan2(game.player.x - x, -(game.player.y - y));
  const ship = makeShip(type, x, y, angle, `enemy-${game.waveIndex}-${game.spawned}`);
  ship.flank = game.spawned % 2 ? -1 : 1;
  ship.tacticClock = 2.8 + seededRandom(game) * 2.2;
  game.enemies.push(ship);
  game.spawned++;
  game.events.push({ kind: type === 'atakebune' ? 'boss' : 'spawn', text: type === 'atakebune' ? '대형 적선 출현! 측면 포격을 집중하세요.' : `적선 발견 · ${SHIP_TYPES[type].name}` });
}

function closest(ship, ships, range = Infinity) {
  let result = null, best = range;
  for (const other of ships) {
    if (other.dead) continue;
    const d = distance(ship, other);
    if (d < best) { best = d; result = other; }
  }
  return result;
}

export function broadsideTarget(ship, targets, side, range = SHIP_TYPES[ship.type].range, preferredId = '') {
  const lateral = right(ship.angle);
  let selected = null, preferred = null, closestDistance = range;
  for (const target of targets) {
    if (target.dead) continue;
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const d = Math.hypot(dx, dy);
    if (d < 1 || d >= range) continue;
    // Fire only when the target lies in a 100-degree broadside cone.
    if ((dx * lateral.x + dy * lateral.y) * side / d < 0.64) continue;
    if (target.id === preferredId) preferred = target;
    if (d < closestDistance) { selected = target; closestDistance = d; }
  }
  return preferred || selected;
}

export function radarContacts(game) {
  return game.enemies.filter(enemy => !enemy.dead && (
    distance(enemy, game.player) < 390 || game.allies.some(ally =>
      !ally.dead && distance(enemy, ally) < (SHIP_TYPES[ally.type].scoutRange || 0))
  ));
}

export function boardingThreat(game) {
  return game.enemies.filter(enemy => !enemy.dead && enemy.boardingProgress > 0 &&
    enemy.boardingTargetId === game.player.id).sort((a, b) => b.boardingProgress - a.boardingProgress)[0] || null;
}

function fire(ship, targets, game, dt) {
  const cfg = SHIP_TYPES[ship.type];
  if (!cfg.volley || !cfg.range) return; // Sahu boats carry dispatches, not cannons.
  if (ship.id.startsWith('wing-') && game.special.state !== 'active') return;
  const improved = ship.id === 'flagship' ? game.bonuses : { reload: 1, range: 1, damage: 1 };
  const rallied = game.signalRemaining > 0 && game.signalOrder === 'rally';
  const focused = game.signalRemaining > 0 && game.signalOrder === 'focus';
  const rotationBonus = game.battle.special === 'rotation' && game.special.state === 'active' && ship.team === 'joseon' && ship.id !== 'flagship' ? .62 : 1;
  const reloadBonus = (rallied ? ship.id === 'escort-1' ? .55 : ship.id === 'flagship' ? .7 : 1 : focused && ship.id === 'escort-1' ? .8 : 1) * rotationBonus;
  const exposedFlagship = ship.team === 'japan' && game.stationarySeconds >= 6;
  for (let i = 0; i < 2; i++) {
    ship.reload[i] = Math.max(0, ship.reload[i] - dt);
    if (ship.reload[i] > 0) continue;
    if (ship.id === 'flagship' && ship.aimSteady < 0.58) continue;
    const side = i === 0 ? -1 : 1;
    const weapon = ship.id === 'flagship' ? WEAPONS[game.arsenal[i === 0 ? 'port' : 'starboard']] || WEAPONS.standard : null;
    const range = (weapon?.range ?? cfg.range) * improved.range;
    const target = broadsideTarget(ship, targets, side, range, focused ? game.focusTargetId : '');
    if (!target) continue;
    // Coordinated Japanese broadsides are dangerous, but a lone player should
    // still have a readable interval to turn and escape between salvos.
    const enemyCadence = game.difficulty === 'hard' ? (exposedFlagship ? .76 : 1.08) : (exposedFlagship ? .88 : 1.45);
    ship.reload[i] = (weapon?.reload ?? cfg.reload) * improved.reload * reloadBonus * (ship.team === 'japan' ? enemyCadence : 1);
    const lateral = right(ship.angle);
    const forward = fwd(ship.angle);
    const volley = weapon?.volley ?? cfg.volley;
    for (let ball = 0; ball < volley; ball++) {
      const offset = (ball - (volley - 1) / 2) * 13;
      const sx = ship.x + lateral.x * side * cfg.radius * 0.9 + forward.x * offset;
      const sy = ship.y + lateral.y * side * cfg.radius * 0.9 + forward.y * offset;
      const speed = weapon?.speed ?? 475;
      const flight = distance({ x: sx, y: sy }, target) / speed;
      const leadX = target.x + fwd(target.angle).x * target.speed * flight * 0.68;
      const leadY = target.y + fwd(target.angle).y * target.speed * flight * 0.68;
      const baseAngle = Math.atan2(leadY - sy, leadX - sx);
      const spread = weapon?.name === WEAPONS.scatter.name
        ? (ball - (volley - 1) / 2) * .115 + (seededRandom(game) - .5) * .06
        : (seededRandom(game) - .5) * (weapon?.spread ?? (game.difficulty === 'hard' && ship.team === 'japan' ? .065 : .1));
      const angle = baseAngle + spread;
      game.shots.push({ x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        traveled: 0, range, damage: (weapon?.damage ?? cfg.damage) * improved.damage * (game.difficulty === 'hard' && ship.team === 'japan' ? 1.16 : 1),
        sourceId: ship.id,
        team: ship.team, radius: weapon === WEAPONS.heavy ? 7.5 : 5,
        weapon: weapon ? game.arsenal[i === 0 ? 'port' : 'starboard'] : 'standard',
        burn: weapon?.burn ?? 0, burnTime: weapon?.burnTime ?? 0 });
      game.shotsFired++;
    }
    addEffect(game, ship.x + lateral.x * side * cfg.radius, ship.y + lateral.y * side * cfg.radius, 'muzzle', 0.32);
    game.events.push({ kind: 'fire', weapon: weapon === WEAPONS.heavy ? 'heavy' : 'standard', text: ship.id === 'flagship' ? '함포 발사' : '' });
  }
  if (game.shots.length > 220) game.shots.splice(0, game.shots.length - 220);
}

function segmentCircleTime(x0, y0, dx, dy, x, y, radius) {
  const a = dx * dx + dy * dy;
  if (a < 1e-8) return Infinity;
  const ox = x0 - x, oy = y0 - y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const b = 2 * (ox * dx + oy * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return Infinity;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : Infinity;
}

function damageShip(game, target, amount) {
  const guarding = target.id === 'flagship' && game.signalRemaining > 0 && game.signalOrder === 'guard' &&
    game.allies.some(ally => ally.type === 'escort' && !ally.dead && distance(ally, target) <= 185);
  const exposure = target.id !== 'flagship' ? 1 : game.stationarySeconds >= 6 ? 1.72 : Math.abs(target.speed) >= 55 ? .82 : 1;
  const actualDamage = amount * exposure * (guarding ? .64 : 1);
  target.hp -= actualDamage;
  return actualDamage;
}

function updateShots(game, dt) {
  const remaining = [];
  for (const shot of game.shots) {
    const oldX = shot.x, oldY = shot.y;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.traveled += Math.hypot(shot.vx, shot.vy) * dt;
    const targets = shot.team === 'japan' ? [game.player, ...game.allies] : game.enemies;
    const vx = shot.x - oldX, vy = shot.y - oldY;
    let firstHit = null;
    let hitTime = Infinity;
    for (const island of game.islands) {
      const t = segmentCircleTime(oldX, oldY, vx, vy, island.x, island.y, island.radius * 0.92);
      if (t < hitTime) { hitTime = t; firstHit = null; }
    }
    for (const target of targets) {
      if (target.dead) continue;
      const targetRadius = SHIP_TYPES[target.type].radius * 0.88 + shot.radius;
      const t = segmentCircleTime(oldX, oldY, vx, vy, target.x, target.y, targetRadius);
      if (t < hitTime) { hitTime = t; firstHit = target; }
    }
    if (hitTime !== Infinity) {
      shot.x = oldX + vx * hitTime;
      shot.y = oldY + vy * hitTime;
      if (firstHit) {
        const dealt = damageShip(game, firstHit, shot.damage);
        if (shot.burn && firstHit.team === 'japan') {
          firstHit.burnRemaining = Math.max(firstHit.burnRemaining, shot.burnTime);
          firstHit.burnDps = Math.max(firstHit.burnDps, shot.burn);
        }
        if (shot.team === 'joseon') game.hits++;
        if (shot.sourceId === 'flagship' && firstHit.team === 'japan') game.tactical.playerHits++;
        if ((shot.sourceId === 'wing-left' || shot.sourceId === 'wing-right') && firstHit.team === 'japan' && game.special.state === 'active') game.tactical.wingHits++;
        if (shot.sourceId === 'ming-1' && firstHit.team === 'japan') game.tactical.mingHits++;
        addEffect(game, firstHit.x, firstHit.y, shot.weapon === 'heavy' ? 'heavy-impact' : 'impact', shot.weapon === 'heavy' ? .88 : .62);
        addEffect(game, firstHit.x, firstHit.y - SHIP_TYPES[firstHit.type].radius - 9, 'damage', .85,
          { amount: Math.ceil(dealt), friendly: firstHit.team === 'joseon' });
        if (firstHit.hp <= 0) sink(game, firstHit);
      } else addEffect(game, shot.x, shot.y, 'splash', 0.65);
    }
    if (hitTime === Infinity && shot.traveled < shot.range && shot.x >= 0 && shot.y >= 0 && shot.x <= WORLD.width && shot.y <= WORLD.height) {
      remaining.push(shot);
    } else if (hitTime === Infinity) {
      addEffect(game, shot.x, shot.y, 'splash', 0.65);
    }
  }
  game.shots = remaining;
}

function controlPlayer(game, input, dt) {
  const ship = game.player;
  const previousX = ship.x, previousY = ship.y;
  let angle = ship.angle;
  let throttle = 0;
  if (Number.isFinite(input.aimAngle)) {
    angle = input.aimAngle;
    throttle = input.throttle ?? 1;
  } else {
    const turn = Number.isFinite(input.turn) ? cap(input.turn, -1, 1) : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    angle = ship.angle + turn * SHIP_TYPES.panokseon.turn * game.bonuses.turn * dt;
    throttle = Number.isFinite(input.throttle) ? cap(input.throttle, -1, 1) : (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  }
  const oarsActive = game.battle.special === 'oars' && game.special.state === 'active';
  steer(ship, angle, throttle, dt, game.bonuses.turn, oarsActive ? 1.38 : 1);
  applyCurrent(game, ship, dt);
  dodgeLand(game, ship, dt);
  const traveled = Math.hypot(ship.x - previousX, ship.y - previousY);
  game.tactical.sailed += traveled;
  if (oarsActive) game.tactical.oarDistance += traveled;
  game.stationarySeconds = Math.abs(ship.speed) < 32
    ? Math.min(30, game.stationarySeconds + dt)
    : Math.max(0, game.stationarySeconds - dt * 2.5);
}

function applyCurrent(game, ship, dt) {
  const current = game.battle.current;
  if (!current || ship.dead) return;
  if (ship.x < current.xMin || ship.x > current.xMax || ship.y < current.yMin || ship.y > current.yMax) return;
  // The modeled east-west tide changes every 24 seconds, pushing every hull,
  // including the enemy. This is an arcade approximation, not tidal data.
  ship.x = cap(ship.x + game.tideDirection * current.speed * dt, SHIP_TYPES[ship.type].radius + 10, WORLD.width - SHIP_TYPES[ship.type].radius - 10);
}

function controlWing(game, wing, dt) {
  const side = wing.id === 'wing-left' ? -1 : 1;
  const deployed = game.special.state === 'deploying' || game.special.state === 'active';
  const target = deployed ? closest(wing, game.enemies, 900) : null;
  const lateral = right(game.player.angle);
  const anchor = target
    ? { x: target.x + side * 245, y: target.y + side * 85 }
    : { x: game.player.x + lateral.x * side * 210 - fwd(game.player.angle).x * 95,
        y: game.player.y + lateral.y * side * 210 - fwd(game.player.angle).y * 95 };
  const d = distance(wing, anchor);
  let heading = Math.atan2(anchor.x - wing.x, -(anchor.y - wing.y));
  if (target && d <= 110) {
    const bearing = Math.atan2(target.x - wing.x, -(target.y - wing.y));
    heading = bearing - side * Math.PI / 2;
  }
  steer(wing, heading, d > 95 ? 1 : .1, dt);
  applyCurrent(game, wing, dt);
  dodgeLand(game, wing, dt);
}

function controlEscort(game, escort, dt) {
  if (escort.dead) return;
  if (escort.id === 'wing-left' || escort.id === 'wing-right') {
    controlWing(game, escort, dt);
    return;
  }
  if (escort.type === 'turtle') {
    escort.ramCooldown = Math.max(0, escort.ramCooldown - dt);
    const target = closest(escort, game.enemies, 740);
    if (target) {
      const angle = Math.atan2(target.x - escort.x, -(target.y - escort.y));
      steer(escort, angle, 1, dt);
      applyCurrent(game, escort, dt);
      dodgeLand(game, escort, dt);
      if (distance(escort, target) < SHIP_TYPES.turtle.radius + SHIP_TYPES[target.type].radius + 8 && escort.ramCooldown === 0) {
        escort.ramCooldown = 8;
        game.tactical.turtleRams++;
        damageShip(game, target, 62);
        damageShip(game, escort, 6);
        if (target.hp <= 0) sink(game, target);
        if (escort.hp <= 0) sink(game, escort);
        addEffect(game, target.x, target.y, 'hit', .45);
        game.events.push({ kind: 'hit', text: '거북선 돌격! 적선에 충격을 주었습니다.' });
      }
    } else {
      const heading = Math.atan2(game.player.x - escort.x, -(game.player.y - escort.y));
      steer(escort, heading, distance(escort, game.player) > 175 ? .8 : 0, dt);
      applyCurrent(game, escort, dt);
      dodgeLand(game, escort, dt);
    }
    return;
  }
  const player = game.player;
  const side = right(player.angle), ahead = fwd(player.angle);
  const rallied = game.signalRemaining > 0 && game.signalOrder === 'rally';
  const guarding = game.signalRemaining > 0 && game.signalOrder === 'guard';
  const messenger = escort.type === 'sahuseon';
  const rotating = game.battle.special === 'rotation' && game.special.state === 'active';
  const offset = messenger ? 115 : escort.type === 'ming' ? 175 : rotating ? (escort.id === 'eokgi-1' ? 240 : -225) : guarding ? -65 : rallied ? -100 : -145;
  const trail = messenger ? 135 : escort.type === 'ming' ? 145 : guarding ? 45 : 92;
  const waypoint = {
    x: player.x + side.x * offset - ahead.x * trail,
    y: player.y + side.y * offset - ahead.y * trail
  };
  const focused = game.signalRemaining > 0 && game.signalOrder === 'focus';
  const target = focused ? game.enemies.find(enemy => enemy.id === game.focusTargetId && !enemy.dead) || closest(escort, game.enemies, 550) : closest(escort, game.enemies, 430);
  const formationDistance = distance(escort, waypoint);
  let heading = Math.atan2(waypoint.x - escort.x, -(waypoint.y - escort.y));
  let throttle = formationDistance > 80 ? 1 : 0.15;
  if (!messenger && !guarding && target && (focused || rotating || formationDistance < (rallied ? 105 : 180))) {
    const bearing = Math.atan2(target.x - escort.x, -(target.y - escort.y));
    heading = bearing - Math.PI / 2;
    throttle = focused || rotating ? 1 : rallied ? .32 : .5;
  }
  steer(escort, heading, throttle, dt);
  applyCurrent(game, escort, dt);
  dodgeLand(game, escort, dt);
}

// Hard-mode captains use a small role-based decision layer: fast boats try
// flanking lanes, boarders alternate approach and pinning, and heavy ships
// hold their broadsides at standoff range. Steering stays in the same bounded
// motion model as Normal, with no teleporting or omniscient firing.
function hardManeuver(game, enemy, target, cfg, dist) {
  const targetForward = fwd(target.angle);
  const targetSide = right(target.angle);
  const leadTime = cap(dist / 570, .12, .8);
  const predicted = {
    x: target.x + targetForward.x * target.speed * leadTime,
    y: target.y + targetForward.y * target.speed * leadTime
  };
  const bearingTo = point => Math.atan2(point.x - enemy.x, -(point.y - enemy.y));
  const side = enemy.flank;
  let heading = bearingTo(predicted);
  let throttle = 1;
  let mode = '추격';

  if (enemy.type === 'kobaya') {
    const anchor = {
      x: predicted.x + targetSide.x * side * 175 - targetForward.x * 45,
      y: predicted.y + targetSide.y * side * 175 - targetForward.y * 45
    };
    const toAnchor = distance(enemy, anchor);
    if (toAnchor > 125 && dist > 145) {
      heading = bearingTo(anchor);
      throttle = .94;
      mode = '측면 침투';
    } else {
      heading = bearingTo(target) + side * Math.PI / 2;
      throttle = .52;
      mode = '측면 교란';
    }
  } else if (enemy.type === 'sekibune') {
    const boardingReach = cfg.radius + SHIP_TYPES[target.type].radius + 26;
    if (enemy.boardingRun && dist < 345) {
      heading = bearingTo(predicted);
      throttle = dist > boardingReach + 12 ? 1 : .18;
      mode = '도선 돌입';
    } else if (dist < 210) {
      heading = bearingTo(target) + side * 1.25;
      throttle = .7;
      mode = '측면 압박';
    } else {
      const anchor = {
        x: predicted.x + targetSide.x * side * 190 - targetForward.x * 65,
        y: predicted.y + targetSide.y * side * 190 - targetForward.y * 65
      };
      heading = bearingTo(anchor);
      throttle = .93;
      mode = '도선 접근';
    }
  } else if (enemy.type === 'atakebune') {
    if (dist < 185) {
      heading = bearingTo(target) + Math.PI + side * .35;
      throttle = .62;
      mode = '거리 확보';
    } else if (dist < 290) {
      heading = bearingTo(target) + side * Math.PI / 2;
      throttle = .48;
      mode = '측면 포격';
    } else {
      mode = '포격 진입';
    }
  }

  // Steer away from known shallows before the hull clips an island. This
  // lookahead is local to each vessel and needs no pathfinding mesh.
  const lookahead = 115 + Math.abs(enemy.speed) * .25;
  const projected = {
    x: enemy.x + fwd(heading).x * lookahead,
    y: enemy.y + fwd(heading).y * lookahead
  };
  for (const island of game.islands) {
    const danger = island.radius + cfg.radius + 34;
    if (distance(projected, island) < danger) {
      const outward = Math.atan2(enemy.x - island.x, -(enemy.y - island.y));
      heading = outward + side * .65;
      mode = '암초 회피';
      break;
    }
  }
  // A headland next to the world border can otherwise pin ships forever:
  // preserve a navigable parallel course until clear of the headland.
  const direction = fwd(heading);
  const nearTop = enemy.y < cfg.radius + 38 && direction.y < -.12;
  const nearBottom = enemy.y > WORLD.height - cfg.radius - 38 && direction.y > .12;
  if ((nearTop || nearBottom) && Math.abs(target.x - enemy.x) > 65) {
    heading = target.x > enemy.x ? Math.PI / 2 : -Math.PI / 2;
    throttle = 1;
    mode = '해안선 우회';
  }
  const nearLeft = enemy.x < cfg.radius + 38 && fwd(heading).x < -.12;
  const nearRight = enemy.x > WORLD.width - cfg.radius - 38 && fwd(heading).x > .12;
  if ((nearLeft || nearRight) && Math.abs(target.y - enemy.y) > 65) {
    heading = target.y > enemy.y ? Math.PI : 0;
    throttle = 1;
    mode = '해안선 우회';
  }
  return { heading, throttle, mode };
}

function controlEnemy(game, enemy, dt) {
  if (enemy.dead) return;
  if (game.battle.pursuit && enemy.hp < enemy.maxHp * (game.difficulty === 'hard' ? .48 : .36)) {
    enemy.aiMode = '율포 탈출';
    const exit = { x: WORLD.width + 75, y: cap(enemy.y, 300, 1200) };
    const heading = Math.atan2(exit.x - enemy.x, -(exit.y - enemy.y));
    steer(enemy, heading, 1, dt, 1, game.difficulty === 'hard' ? 1.09 : 1);
    dodgeLand(game, enemy, dt);
    if (enemy.x >= game.battle.pursuit.escapeX) {
      enemy.dead = true;
      game.tactical.escaped++;
      game.events.push({ kind: 'signal', text: `적선이 부산 쪽으로 달아났습니다. (${game.tactical.escaped}/${getEscapeLimit(game)})` });
      if (game.tactical.escaped >= getEscapeLimit(game)) {
        game.mode = 'defeat';
        game.events.push({ kind: 'defeat', text: '너무 많은 적선이 율포의 퇴로로 빠져나갔습니다.' });
      }
    }
    return;
  }
  if (game.battle.harbor && enemy.hp >= enemy.maxHp * (game.difficulty === 'hard' ? .58 : .72) && distance(enemy, game.player) > 320) {
    enemy.aiMode = '안골포 포구 방어';
    steer(enemy, enemy.angle, 0, dt);
    dodgeLand(game, enemy, dt);
    return;
  }
  if (game.battle.retreat && game.waveIndex === game.battle.waves.length - 1 && enemy.hp < enemy.maxHp * .30) {
    enemy.aiMode = '포구 탈출';
    const exit = { x: WORLD.width + 75, y: 760 };
    const heading = Math.atan2(exit.x - enemy.x, -(exit.y - enemy.y));
    steer(enemy, heading, 1, dt);
    applyCurrent(game, enemy, dt);
    dodgeLand(game, enemy, dt);
    if (enemy.x > WORLD.width - 84) {
      enemy.dead = true;
      game.mode = 'defeat';
      game.events.push({ kind: 'defeat', text: `${game.battle.title}의 퇴로로 달아난 적선이 있습니다. 다시 봉쇄하세요.` });
    }
    return;
  }
  // Boarding crews favor fighting ships; dispatch boats are not their primary objective.
  // A stationary flagship is an easy, obvious objective. Leaving it at anchor
  // should invite concentrated fire and boarding rather than a free auto-win.
  const hard = game.difficulty === 'hard';
  const prioritiesFlagship = hard && (enemy.type === 'kobaya' || enemy.type === 'atakebune' || game.player.hp < game.player.maxHp * .42);
  const target = game.stationarySeconds >= 6 || prioritiesFlagship
    ? game.player
    : closest(enemy, [game.player, ...game.allies.filter(ally => ally.type !== 'sahuseon')]) || game.player;
  enemy.aiTargetId = target.id;
  if (!target) return;
  const cfg = SHIP_TYPES[enemy.type];
  const d = distance(enemy, target);
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const bearing = Math.atan2(dx, -dy);
  const preferred = cfg.range * (enemy.type === 'kobaya' ? 0.77 : 0.84);
  enemy.tacticClock -= dt;
  if (enemy.tacticClock <= 0) {
    if (enemy.type === 'kobaya' && (!hard || d < 250)) enemy.flank *= -1; // Feint near the player.
    if (cfg.boardingDamage) enemy.boardingRun = !enemy.boardingRun;
    enemy.tacticClock = enemy.type === 'kobaya' ? 3.2 : enemy.type === 'sekibune' ? 6.8 : 8.5;
  }
  let heading = bearing;
  let throttle = 1;
  const boardingRange = cfg.radius + SHIP_TYPES[target.type].radius + 26;
  const finalFlagship = enemy.type === 'atakebune' && game.enemies.length === 1 &&
    game.spawned === getWave(game)?.ships.length;
  if (finalFlagship && d > boardingRange + 35) {
    // A lone flagship must close the final duel rather than orbit forever.
    heading = bearing;
    throttle = 1;
  } else if (cfg.boardingDamage && enemy.boardingRun && d < (enemy.type === 'sekibune' ? 295 : 205)) {
    heading = bearing; // Close to grappling distance instead of taking a broadside arc.
    throttle = d < boardingRange + 5 ? 0 : d < boardingRange + 42 ? .3 : .88;
  } else if (d < preferred * 0.52) {
    heading = bearing + Math.PI + enemy.flank * 0.3; // disengage before ramming
  } else if (enemy.type === 'kobaya' && d < preferred + 80) {
    heading = bearing + enemy.flank * 1.05; // Fast boats make repeated darting passes.
    throttle = .82;
  } else if (enemy.type === 'sekibune' && d > preferred + 95) {
    heading = bearing + enemy.flank * .45; // Medium boats approach from the wings.
    throttle = .9;
  } else if (d < preferred + 95) {
    const towardPort = bearing + Math.PI / 2;
    const towardStarboard = bearing - Math.PI / 2;
    const candidates = enemy.flank > 0 ? [towardStarboard, towardPort] : [towardPort, towardStarboard];
    const safelyInside = a => {
      const direction = fwd(a);
      const nextX = enemy.x + direction.x * 135;
      const nextY = enemy.y + direction.y * 135;
      return nextX > 70 && nextX < WORLD.width - 70 && nextY > 70 && nextY < WORLD.height - 70;
    };
    heading = candidates.find(safelyInside) ?? bearing;
    throttle = d > preferred ? 0.66 : 0.35;
  } else {
    heading = bearing + enemy.flank * 0.18;
  }
  if (hard && !finalFlagship) {
    const maneuver = hardManeuver(game, enemy, target, cfg, d);
    heading = maneuver.heading;
    throttle = maneuver.throttle;
    enemy.aiMode = maneuver.mode;
  } else if (hard && finalFlagship) {
    enemy.aiMode = '결전 돌입';
  }
  steer(enemy, heading, throttle, dt);
  applyCurrent(game, enemy, dt);
  dodgeLand(game, enemy, dt);
  enemy.boardingCooldown = Math.max(0, enemy.boardingCooldown - dt);
  const inReach = cfg.boardingDamage && distance(enemy, target) <= boardingRange;
  if (inReach && enemy.boardingCooldown <= 0) {
    if (enemy.boardingTargetId !== target.id || enemy.boardingProgress === 0) {
      enemy.boardingTargetId = target.id;
      if (target.id === 'flagship') game.events.push({ kind: 'boarding', text: `${cfg.name} 접근! 키를 돌려 도선을 막으세요.` });
    }
    enemy.boardingProgress += dt / cfg.boardingTime;
    if (enemy.boardingProgress >= 1) {
      damageShip(game, target, cfg.boardingDamage * (SHIP_TYPES[target.type].boardingDamageTaken ?? 1));
      enemy.boardingProgress = 0;
      enemy.boardingCooldown = 3;
      addEffect(game, target.x, target.y, 'boarding', 0.8);
      if (target.id === 'flagship') game.events.push({ kind: 'boarded', text: '적 도선 시도! 높은 판옥선 갑판이 피해를 줄였습니다.' });
      if (target.hp <= 0) sink(game, target);
    }
  } else {
    enemy.boardingProgress = Math.max(0, enemy.boardingProgress - dt * 2.3);
    if (enemy.boardingProgress === 0) enemy.boardingTargetId = '';
  }
}

function updateShoreBattery(game, dt) {
  const battery = game.battle.shoreBattery;
  if (!battery || game.withdrawal && game.player.x < 900) return;
  game.shoreClock -= dt;
  if (game.shoreClock > 0) return;
  const d = distance(game.player, battery);
  game.shoreClock = game.difficulty === 'hard' ? 5.7 : 7.5;
  if (d > battery.radius) return;
  const direction = Math.atan2(game.player.y - battery.y, game.player.x - battery.x);
  const velocity = 330;
  game.shots.push({ x: battery.x, y: battery.y, vx: Math.cos(direction) * velocity,
    vy: Math.sin(direction) * velocity, traveled: 0, range: battery.radius + 80,
    damage: game.difficulty === 'hard' ? 21 : 15, sourceId: 'busan-battery',
    team: 'japan', radius: 7, weapon: 'heavy', burn: 0, burnTime: 0 });
  addEffect(game, battery.x, battery.y, 'muzzle', .38);
  game.events.push({ kind: 'boss', text: '부산포 해안 포격! 적의 성곽 쪽에서 날아오는 포탄을 피하세요.' });
}

function finishVictory(game) {
  if (game.mode !== 'playing') return;
  game.mode = 'victory';
  game.score += Math.round(game.player.hp * (game.difficulty === 'hard' ? 2.6 : 2));
  game.events.push({ kind: 'victory', text: game.battle.victory });
}

export function stepGame(game, input = {}, dt = 1 / 60) {
  if (game.mode !== 'playing') return game;
  dt = cap(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  game.seconds += dt;
  if (game.battle.current) {
    game.tideClock += dt;
    if (game.tideClock >= game.battle.current.period) {
      game.tideClock -= game.battle.current.period;
      game.tideDirection *= -1;
      game.tactical.tideTurns++;
      game.events.push({ kind: 'signal', text: `울돌목 조류 역전! ${game.tideDirection > 0 ? '동쪽' : '서쪽'}으로 흐릅니다.` });
    }
  }
  game.signalCooldown = Math.max(0, game.signalCooldown - dt);
  game.signalRemaining = Math.max(0, game.signalRemaining - dt);
  game.special.cooldown = Math.max(0, game.special.cooldown - dt);
  if (game.special.state === 'deploying') {
    game.special.deployClock = Math.max(0, game.special.deployClock - dt);
    if (game.special.deployClock === 0) {
      game.special.state = 'active';
      game.tactical.craneOrders++;
      game.events.push({ kind: 'signal', text: '학익진 완성! 좌우 판옥선이 적을 포위하며 포격합니다.' });
    }
  } else if (game.special.state === 'active') {
    game.special.remaining = Math.max(0, game.special.remaining - dt);
    if (game.special.remaining === 0) game.special.state = game.battle.special === 'crane' ? 'lure' : 'ready';
  }
  for (const effect of game.effects) effect.age += dt;
  game.effects = game.effects.filter(effect => effect.age < effect.duration);
  for (const enemy of game.enemies) {
    if (enemy.dead || enemy.burnRemaining <= 0) continue;
    const burnedTime = Math.min(dt, enemy.burnRemaining);
    enemy.burnRemaining = Math.max(0, enemy.burnRemaining - dt);
    enemy.hp -= burnedTime * enemy.burnDps;
    if (enemy.hp <= 0) sink(game, enemy);
  }
  controlPlayer(game, input, dt);
  if (game.battle.harbor && game.player.x > game.battle.harbor.shallowX) {
    game.player.x = game.battle.harbor.shallowX;
    game.player.speed = Math.min(game.player.speed, 35);
    if (!game.harborWarned) {
      game.harborWarned = true;
      game.events.push({ kind: 'signal', text: '앞은 얕은 포구입니다! 판옥선은 수심선 밖에서 측면 포격하세요.' });
    }
  } else if (game.battle.harbor && game.player.x < game.battle.harbor.shallowX - 75) game.harborWarned = false;
  for (const ally of game.allies) controlEscort(game, ally, dt);
  for (const enemy of game.enemies) controlEnemy(game, enemy, dt);
  if (game.mode === 'defeat') return game;
  updateShoreBattery(game, dt);
  fire(game.player, game.enemies, game, dt);
  for (const ally of game.allies) if (!ally.dead) fire(ally, game.enemies, game, dt);
  for (const enemy of game.enemies) if (!enemy.dead) fire(enemy, [game.player, ...game.allies], game, dt);
  updateShots(game, dt);
  awardTacticalObjective(game);
  game.enemies = game.enemies.filter(ship => !ship.dead);
  if (game.mode === 'defeat') return game;
  if (game.withdrawal && game.player.x <= game.battle.withdraw.x) {
    game.tactical.withdrawn = 1;
    awardTacticalObjective(game);
    finishVictory(game);
    return game;
  }

  const wave = getWave(game);
  if (!wave) return game;
  game.spawnClock -= dt;
  if (game.spawned < wave.ships.length && game.spawnClock <= 0) {
    spawnEnemy(game);
    game.spawnClock = wave.interval * (game.difficulty === 'hard' ? .85 : 1);
  }
  if (game.spawned === wave.ships.length && game.enemies.length === 0) {
    game.shots = [];
    if (game.waveIndex === game.battle.waves.length - 1) {
      if (game.battle.withdraw && !game.withdrawal) {
        game.withdrawal = true;
        game.events.push({ kind: 'signal', text: '항구 타격 완료! 서쪽 외해로 철수하세요. 화면 왼쪽 끝의 안전 해역을 향해 항해하세요.' });
      } else if (!game.battle.withdraw) finishVictory(game);
    } else {
      game.mode = 'upgrade';
      game.selected = upgradeChoices(game).map(option => option.id);
      game.events.push({ kind: 'upgrade', text: '교전 종료 · 다음 출전을 준비하세요.' });
    }
  }
  return game;
}
