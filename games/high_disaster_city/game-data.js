(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{};
const SLOT_X=[180,260,340,420,500,580,860,940,1020,1100,1180,1260];
const BUILDINGS={
 house:{id:'house',name:'주택',icon:'🏠',cost:55,hp:100,capacity:6,style:'house',floodResistance:.75,desc:'주민이 살 공간을 늘립니다.'},
 farm:{id:'farm',name:'농장',icon:'🌾',cost:45,hp:85,food:1.55,style:'farm',floodResistance:.55,fuelBonus:.35,desc:'식량을 꾸준히 생산하지만 침수와 산불에는 약합니다.'},
 market:{id:'market',name:'시장',icon:'🏪',cost:70,hp:95,money:.82,style:'market',floodResistance:.70,desc:'도시 수입을 늘립니다.'},
 fireStation:{id:'fireStation',name:'소방서',icon:'🚒',cost:110,hp:125,upkeep:.16,style:'fire',range:3,firePower:.20,floodResistance:.74,desc:'주변 산불 셀을 자동 진압합니다.'},
 levee:{id:'levee',name:'제방',icon:'🧱',cost:75,hp:150,style:'levee',barrier:.88,floodResistance:1.2,desc:'물길을 실제로 막아 제방 앞에 물을 붙잡습니다.'},
 pump:{id:'pump',name:'배수펌프',icon:'⚙️',cost:105,hp:105,upkeep:.12,style:'pump',range:2,drainPower:.08,floodResistance:.90,desc:'주변 침수 셀의 물을 계속 빼냅니다.'},
 reservoir:{id:'reservoir',name:'저수조',icon:'💧',cost:85,hp:110,style:'reservoir',floodResistance:.82,desc:'가까운 소방서의 진압력을 높입니다.'},
 shelter:{id:'shelter',name:'재난대피소',icon:'🛡️',cost:100,hp:135,upkeep:.10,style:'shelter',desc:'태풍과 지진 때 주민과 시설 피해를 줄입니다.'},
 coolingCenter:{id:'coolingCenter',name:'무더위 쉼터',icon:'❄️',cost:90,hp:105,upkeep:.10,style:'cooling',desc:'폭염 때 식량 소모와 도시 안정도 하락을 줄입니다.'},
 snowDepot:{id:'snowDepot',name:'제설기지',icon:'🚜',cost:95,hp:115,upkeep:.12,style:'snow',desc:'폭설을 밀어내고 눈 피해를 줄입니다.'}
};
const CARDS={
 house:{id:'house',name:'주택',icon:'🏠',cost:55,kind:'build',building:'house',tag:'건설',desc:'주민이 살 집을 짓습니다.'},
 farm:{id:'farm',name:'농장',icon:'🌾',cost:45,kind:'build',building:'farm',tag:'건설',desc:'식량을 생산하는 농장을 짓습니다.'},
 market:{id:'market',name:'시장',icon:'🏪',cost:70,kind:'build',building:'market',tag:'건설',desc:'돈을 버는 시장을 짓습니다.'},
 fireStation:{id:'fireStation',name:'소방서',icon:'🚒',cost:110,kind:'build',building:'fireStation',tag:'방재시설',desc:'대응 반경 안의 산불을 자동으로 진압합니다.'},
 levee:{id:'levee',name:'제방',icon:'🧱',cost:75,kind:'build',building:'levee',tag:'방재시설',desc:'물길을 막아 제방 앞에 물을 붙잡습니다.'},
 pump:{id:'pump',name:'배수펌프',icon:'⚙️',cost:105,kind:'build',building:'pump',tag:'방재시설',desc:'주변 침수 지역의 물을 계속 뺍니다.'},
 reservoir:{id:'reservoir',name:'저수조',icon:'💧',cost:85,kind:'build',building:'reservoir',tag:'지원시설',desc:'산불 진압 효과를 강화합니다.'},
 shelter:{id:'shelter',name:'재난대피소',icon:'🛡️',cost:100,kind:'build',building:'shelter',tag:'방재시설',desc:'태풍과 지진의 피해를 줄이는 대피소를 짓습니다.'},
 coolingCenter:{id:'coolingCenter',name:'무더위 쉼터',icon:'❄️',cost:90,kind:'build',building:'coolingCenter',tag:'방재시설',desc:'폭염 때 주민이 쉬고 물을 보급받는 쉼터입니다.'},
 snowDepot:{id:'snowDepot',name:'제설기지',icon:'🚜',cost:95,kind:'build',building:'snowDepot',tag:'방재시설',desc:'폭설 전선을 늦추고 눈을 치웁니다.'},
 fireBrigade:{id:'fireBrigade',name:'소방대 출동',icon:'🧯',cost:34,kind:'action',action:'fireBrigade',tag:'긴급대응',desc:'진행 중인 산불을 크게 밀어냅니다.'},
 sandbags:{id:'sandbags',name:'모래주머니',icon:'🟫',cost:28,kind:'action',action:'sandbags',tag:'긴급대응',desc:'홍수 앞에 임시 장벽을 설치합니다.'},
 firebreak:{id:'firebreak',name:'방화선',icon:'⛏️',cost:18,kind:'action',action:'firebreak',tag:'전술대응',desc:'불길 앞의 연료를 제거해 확산 경로를 끊습니다.'},
 emergencyDrain:{id:'emergencyDrain',name:'긴급 배수',icon:'🪣',cost:18,kind:'action',action:'emergencyDrain',tag:'전술대응',desc:'물이 가장 많이 고인 지역을 빠르게 배수합니다.'},
 repair:{id:'repair',name:'긴급 수리',icon:'🔧',cost:30,kind:'action',action:'repair',tag:'복구',desc:'홍수를 막는 제방을 우선 수리하고, 없으면 가장 손상된 건물을 수리합니다.'},
 ration:{id:'ration',name:'비상 식량',icon:'🥫',cost:22,kind:'action',action:'ration',tag:'보급',desc:'식량을 즉시 12 얻습니다.'},
 stormPrep:{id:'stormPrep',name:'창문 보강',icon:'🪟',cost:24,kind:'action',action:'stormPrep',tag:'태풍대응',desc:'태풍의 전진을 늦추고 바람 세기를 낮춥니다.'},
 waterDistribution:{id:'waterDistribution',name:'급수 지원',icon:'🚰',cost:22,kind:'action',action:'waterDistribution',tag:'폭염대응',desc:'폭염을 약화시키고 식량·안정을 조금 회복합니다.'},
 snowplow:{id:'snowplow',name:'제설차 출동',icon:'🚜',cost:24,kind:'action',action:'snowplow',tag:'폭설대응',desc:'폭설 전선을 크게 밀어내고 눈의 세기를 낮춥니다.'},
 evacuation:{id:'evacuation',name:'긴급 대피',icon:'🚨',cost:26,kind:'action',action:'evacuation',tag:'지진대응',desc:'지진의 다음 충격을 늦추고 도시 안정도를 지킵니다.'}
};
const START_DECK=['house','farm','market','house','farm','fireBrigade','sandbags','repair','levee','fireStation','ration','reservoir'];
const REWARD_POOL=['fireStation','pump','reservoir','levee','repair','fireBrigade','sandbags','firebreak','emergencyDrain','shelter','coolingCenter','snowDepot','stormPrep','waterDistribution','snowplow','evacuation','market','farm','ration'];
const DISASTERS={
 wildfire:{id:'wildfire',name:'산불',icon:'🔥',unlock:0,baseEnergy:105,baseAge:34,clear:'산불이 진정됐습니다!'},
 flood:{id:'flood',name:'홍수',icon:'🌊',unlock:0,baseEnergy:112,baseAge:40,clear:'홍수가 빠져나갔습니다!'},
 typhoon:{id:'typhoon',name:'태풍',icon:'🌀',unlock:60,baseEnergy:118,baseAge:32,clear:'태풍이 도시를 지나갔습니다!'},
 heatwave:{id:'heatwave',name:'폭염',icon:'☀️',unlock:105,baseEnergy:110,baseAge:36,clear:'폭염이 한풀 꺾였습니다!'},
 blizzard:{id:'blizzard',name:'폭설',icon:'🌨️',unlock:150,baseEnergy:116,baseAge:38,clear:'폭설이 잦아들었습니다!'},
 earthquake:{id:'earthquake',name:'지진',icon:'🌎',unlock:210,baseEnergy:95,baseAge:20,clear:'지진의 흔들림이 멎었습니다!'}
};
const COUNTERS={
 wildfire:['fireStation','fireBrigade','firebreak','reservoir'],
 flood:['levee','pump','sandbags','emergencyDrain'],
 typhoon:['shelter','stormPrep','repair'],
 heatwave:['coolingCenter','waterDistribution','reservoir'],
 blizzard:['snowDepot','snowplow','ration'],
 earthquake:['shelter','evacuation','repair']
};
const FIELD={cols:24,rows:5,flowRate:.48,ambientDrain:.006,recedingDrain:.026,fireSpread:.20,fireDecay:.08};
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
DC.DATA={W:1440,H:620,GROUND_Y:442,TOWN_X:720,SLOT_X,BUILDINGS,CARDS,START_DECK,REWARD_POOL,DISASTERS,COUNTERS,FIELD,ASSETS,SCORE_KEY:'kidscade_disaster_city_best_seconds'};
})(window);