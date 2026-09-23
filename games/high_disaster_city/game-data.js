(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{};
const SLOT_X=[180,260,340,420,500,580,860,940,1020,1100,1180,1260];
const BUILDINGS={
 house:{id:'house',name:'주택',icon:'🏠',cost:55,hp:100,capacity:6,style:'house',desc:'주민이 살 공간을 늘립니다.'},
 farm:{id:'farm',name:'농장',icon:'🌾',cost:45,hp:85,food:1.55,style:'farm',desc:'식량을 꾸준히 생산합니다.'},
 market:{id:'market',name:'시장',icon:'🏪',cost:70,hp:95,money:.82,style:'market',desc:'도시 수입을 늘립니다.'},
 fireStation:{id:'fireStation',name:'소방서',icon:'🚒',cost:110,hp:125,upkeep:.16,style:'fire',desc:'산불을 자동으로 조금씩 밀어냅니다.'},
 levee:{id:'levee',name:'제방',icon:'🧱',cost:75,hp:150,style:'levee',desc:'홍수를 붙잡고 시간을 벌어 줍니다.'},
 pump:{id:'pump',name:'배수펌프',icon:'⚙️',cost:105,hp:105,upkeep:.12,style:'pump',desc:'홍수의 물을 계속 빼냅니다.'},
 reservoir:{id:'reservoir',name:'저수조',icon:'💧',cost:85,hp:110,style:'reservoir',desc:'소방서와 소방대의 진압력을 높입니다.'}
};
const CARDS={
 house:{id:'house',name:'주택',icon:'🏠',cost:55,kind:'build',building:'house',tag:'건설',desc:'주민이 살 집을 짓습니다.'},
 farm:{id:'farm',name:'농장',icon:'🌾',cost:45,kind:'build',building:'farm',tag:'건설',desc:'식량을 생산하는 농장을 짓습니다.'},
 market:{id:'market',name:'시장',icon:'🏪',cost:70,kind:'build',building:'market',tag:'건설',desc:'돈을 버는 시장을 짓습니다.'},
 fireStation:{id:'fireStation',name:'소방서',icon:'🚒',cost:110,kind:'build',building:'fireStation',tag:'방재시설',desc:'가까운 산불을 자동 진압합니다.'},
 levee:{id:'levee',name:'제방',icon:'🧱',cost:75,kind:'build',building:'levee',tag:'방재시설',desc:'홍수 전선을 멈춰 세웁니다.'},
 pump:{id:'pump',name:'배수펌프',icon:'⚙️',cost:105,kind:'build',building:'pump',tag:'방재시설',desc:'홍수의 힘을 계속 줄입니다.'},
 reservoir:{id:'reservoir',name:'저수조',icon:'💧',cost:85,kind:'build',building:'reservoir',tag:'지원시설',desc:'산불 진압 효과를 강화합니다.'},
 fireBrigade:{id:'fireBrigade',name:'소방대 출동',icon:'🧯',cost:34,kind:'action',action:'fireBrigade',tag:'긴급대응',desc:'진행 중인 산불을 크게 밀어냅니다.'},
 sandbags:{id:'sandbags',name:'모래주머니',icon:'🟫',cost:28,kind:'action',action:'sandbags',tag:'긴급대응',desc:'홍수 전선을 잠시 뒤로 밀어냅니다.'},
 repair:{id:'repair',name:'긴급 수리',icon:'🔧',cost:30,kind:'action',action:'repair',tag:'복구',desc:'가장 많이 손상된 건물을 수리합니다.'},
 ration:{id:'ration',name:'비상 식량',icon:'🥫',cost:22,kind:'action',action:'ration',tag:'보급',desc:'식량을 즉시 12 얻습니다.'}
};
const START_DECK=['house','farm','market','house','farm','fireBrigade','sandbags','repair','levee','fireStation','ration','reservoir'];
const REWARD_POOL=['fireStation','pump','reservoir','levee','repair','fireBrigade','sandbags','market','farm'];
const ASSETS={
 buildingBase:'../../assets/game/2d/platformer-art/expansions/buildings/house-beige.png',
 buildingDark:'../../assets/game/2d/platformer-art/expansions/buildings/house-dark.png',
 buildingGray:'../../assets/game/2d/platformer-art/expansions/buildings/house-gray.png',
 roofRed:'../../assets/game/2d/platformer-art/expansions/buildings/roof-red-mid.png',
 roofGray:'../../assets/game/2d/platformer-art/expansions/buildings/roof-grey-mid.png',
 roofYellow:'../../assets/game/2d/platformer-art/expansions/buildings/roof-yellow-mid.png',
 window:'../../assets/game/2d/platformer-art/expansions/buildings/window-checkered.png',
 windowOpen:'../../assets/game/2d/platformer-art/expansions/buildings/window-low-open.png',
 anemometer:'../../assets/game/2d/platformer-art/expansions/buildings/anemometer.png',
 waterTop:'../../assets/game/2d/platformer-art/base/tiles/liquid-water-top-mid.png',
 grass:'../../assets/game/2d/platformer-art/base/tiles/grass-center.png',
 fire1:'../../assets/game/effects/particles/kenney-particle-pack/fire-01.png',
 fire2:'../../assets/game/effects/particles/kenney-particle-pack/fire-02.png',
 smoke1:'../../assets/game/effects/particles/kenney-particle-pack/smoke-01.png',
 smoke2:'../../assets/game/effects/particles/kenney-particle-pack/smoke-02.png',
 citizen:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',
 citizenWalk:'../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-walk1.png',
 adventurer:'../../assets/game/characters/people/kenney-platformer-characters/adventurer/poses/adventurer-stand.png',
 soldier:'../../assets/game/characters/people/kenney-platformer-characters/soldier/poses/soldier-stand.png'
};
DC.DATA={W:1440,H:620,GROUND_Y:442,TOWN_X:720,SLOT_X,BUILDINGS,CARDS,START_DECK,REWARD_POOL,ASSETS,SCORE_KEY:'kidscade_disaster_city_best_seconds'};
})(window);