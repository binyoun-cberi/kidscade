(() => {
'use strict';
const $=s=>document.querySelector(s);
const board=$('#board');
const ui={
 era:$('#eraLabel'),day:$('#dayLabel'),food:$('#foodLabel'),pop:$('#popLabel'),meal:$('#mealLabel'),settlement:$('#settlementLabel'),
 questList:$('#questList'),discoveries:$('#discoveries'),discoveryCount:$('#discoveryCount'),hint:$('#hintText'),goalTitle:$('#goalTitle'),goalText:$('#goalText'),
 toast:$('#toast'),explore:$('#exploreBtn'),foodTile:document.querySelector('.foodTile'),extractor:$('#extractorZone'),
 goalBtn:$('#goalBtn'),discoverBtn:$('#discoverBtn'),goalPopover:$('#goalPopover'),discoverPopover:$('#discoverPopover'),
 values:{hunt:$('#huntValue'),farm:$('#farmValue'),fish:$('#fishValue'),herd:$('#herdValue')}
};

const C={
 person:{name:'사람',emoji:'👤',kind:'human',sub:'여러 일을 배울 수 있음'},
 hunter:{name:'사냥꾼',emoji:'🏹',kind:'human',sub:'큰 사냥감을 잡을 수 있음'},
 fisher:{name:'어부',emoji:'🎣',kind:'human',sub:'어로 생산량 증가'},
 farmer:{name:'농부',emoji:'🧑‍🌾',kind:'human',sub:'농경 생산량 증가'},
 herder:{name:'목축민',emoji:'🧑‍🌾',kind:'human',sub:'야생 염소를 길들임'},
 lumberjack:{name:'벌목꾼',emoji:'🧑‍🌾',kind:'human',sub:'돌도끼로 큰 나무를 벰'},
 forest:{name:'숲',emoji:'🌲',kind:'node',sub:'주변 탐색에서 만나는 숲'},
 smallTree:{name:'작은 나무',emoji:'🌿',kind:'node',sub:'맨손으로 나뭇가지를 모을 수 있음'},
 bigTree:{name:'큰 나무',emoji:'🌳',kind:'node',sub:'벌목꾼과 돌도끼가 필요함'},
 berryBush:{name:'열매 덤불',emoji:'🫐',kind:'node',sub:'열매를 채집할 수 있음'},
 stoneSource:{name:'돌무더기',emoji:'🪨',kind:'node',sub:'석재를 구할 수 있음'},
 reedBed:{name:'갈대밭',emoji:'🌿',kind:'node',sub:'식물 섬유를 얻음'},
 clayBank:{name:'점토층',emoji:'🟤',kind:'node',sub:'토기의 재료'},
 river:{name:'강가',emoji:'🏞️',kind:'node',sub:'어로와 돌 갈기의 장소'},
 wildMillet:{name:'야생 조',emoji:'🌾',kind:'node',sub:'곡식과 씨앗을 얻음'},
 deer:{name:'사슴',emoji:'🦌',kind:'node',sub:'고기·가죽·뼈의 원천'},
 wildGoat:{name:'야생 염소',emoji:'🐐',kind:'node',sub:'길들이면 가축이 됨'},
 oakGrove:{name:'도토리 숲',emoji:'🌳',kind:'node',sub:'도토리를 넉넉히 채집할 수 있음'},
 tidalFlat:{name:'갯벌',emoji:'🌊',kind:'node',sub:'조개·굴·조개껍데기를 얻음'},
 wildBroomcorn:{name:'야생 기장',emoji:'🌾',kind:'node',sub:'기장과 씨앗을 얻음'},
 wildBean:{name:'야생 콩',emoji:'🫘',kind:'node',sub:'콩과 씨앗을 얻음'},
 wildBoar:{name:'멧돼지',emoji:'🐗',kind:'node',sub:'큰 사냥감 · 고기와 가죽'},
 rabbit:{name:'토끼',emoji:'🐇',kind:'node',sub:'올가미로 잡을 수 있는 작은 사냥감'},

 branch:{name:'나뭇가지',emoji:'🌿',kind:'item',sub:'불·자루·간단한 도구 재료'},
 wood:{name:'목재',emoji:'🪵',kind:'item',sub:'큰 나무에서 얻는 건축 재료'},
 stone:{name:'돌',emoji:'🪨',kind:'item',sub:'석기의 기본 재료'},
 fiber:{name:'식물 섬유',emoji:'🌿',kind:'item',sub:'꼬아 끈을 만들 수 있음'},
 clay:{name:'점토',emoji:'🟤',kind:'item',sub:'그릇을 빚는 재료'},
 berry:{name:'열매',emoji:'🫐',kind:'food',sub:'식량 1',food:1},
 wildGrain:{name:'야생 곡식',emoji:'🌾',kind:'food',sub:'식량 1',food:1},
 milletSeed:{name:'조 씨앗',emoji:'🌱',kind:'item',sub:'개간지에 심을 수 있음'},
 rawMeat:{name:'날고기',emoji:'🥩',kind:'item',sub:'익히거나 훈연 가능'},
 rawHide:{name:'생가죽',emoji:'🟫',kind:'item',sub:'긁개로 손질해야 함'},
 bone:{name:'뼈',emoji:'🦴',kind:'item',sub:'바늘·낚시도구 재료'},
 sinew:{name:'힘줄',emoji:'🧵',kind:'item',sub:'질긴 결속 재료'},
 freshFish:{name:'민물고기',emoji:'🐟',kind:'food',sub:'식량 1 · 훈연 가능',food:1},
 shellfish:{name:'조개',emoji:'🐚',kind:'food',sub:'식량 1',food:1},
 milk:{name:'염소젖',emoji:'🥛',kind:'food',sub:'식량 1',food:1},
 milletGrain:{name:'조',emoji:'🌾',kind:'food',sub:'식량 1 · 갈아서 가공',food:1},
 cookedMeat:{name:'익힌 고기',emoji:'🍖',kind:'food',sub:'식량 1',food:1},
 smokedMeat:{name:'훈제 고기',emoji:'🥓',kind:'food',sub:'보존식 · 식량 2',food:2},
 smokedFish:{name:'훈제 생선',emoji:'🐟',kind:'food',sub:'보존식 · 식량 2',food:2},
 flour:{name:'간 곡물',emoji:'🥣',kind:'item',sub:'죽의 재료'},
 porridgePrep:{name:'곡물죽 재료',emoji:'🍲',kind:'item',sub:'불에 끓이면 완성'},
 porridge:{name:'곡물죽',emoji:'🥣',kind:'food',sub:'식량 2',food:2},
 acorn:{name:'도토리',emoji:'🌰',kind:'item',sub:'떫은맛을 빼고 가공해야 함'},
 acornMeal:{name:'간 도토리',emoji:'🥣',kind:'item',sub:'물에 우려 떫은맛을 뺌'},
 leachedAcorn:{name:'우린 도토리가루',emoji:'🥣',kind:'item',sub:'토기에 담아 익힐 수 있음'},
 acornPrep:{name:'도토리죽 재료',emoji:'🍲',kind:'item',sub:'화덕에서 익히면 완성'},
 acornPorridge:{name:'도토리죽',emoji:'🥣',kind:'food',sub:'식량 2',food:2},
 clam:{name:'바지락류 조개',emoji:'🐚',kind:'food',sub:'갯벌 먹거리 · 식량 1',food:1},
 oyster:{name:'굴',emoji:'🦪',kind:'food',sub:'갯벌 먹거리 · 식량 1',food:1},
 shell:{name:'조개껍데기',emoji:'🐚',kind:'item',sub:'도구와 장신구 재료'},
 broomcornSeed:{name:'기장 씨앗',emoji:'🌱',kind:'item',sub:'개간지에 심을 수 있음'},
 broomcornGrain:{name:'기장',emoji:'🌾',kind:'food',sub:'식량 1 · 잡곡',food:1},
 beanSeed:{name:'콩 씨앗',emoji:'🌱',kind:'item',sub:'개간지에 심을 수 있음'},
 bean:{name:'콩',emoji:'🫘',kind:'food',sub:'식량 1 · 단백질 공급원',food:1},
 boarTusk:{name:'멧돼지 엄니',emoji:'🦷',kind:'item',sub:'장신구·도구 재료'},

 chopper:{name:'찍개',emoji:'🪨',kind:'tool',sub:'돌을 다듬는 기본 석기'},
 stoneAxe:{name:'돌도끼',emoji:'🪓',kind:'tool',sub:'큰 나무를 벨 수 있는 초기 도끼'},
 stoneBlade:{name:'돌날',emoji:'🔪',kind:'tool',sub:'창·낫 제작 재료'},
 scraper:{name:'긁개',emoji:'🪒',kind:'tool',sub:'가죽 손질 도구'},
 boneNeedle:{name:'뼈바늘',emoji:'🪡',kind:'tool',sub:'가죽을 꿰맴'},
 cord:{name:'끈',emoji:'🪢',kind:'tool',sub:'섬유를 꼬아 만든 결속재'},
 fishHook:{name:'뼈 낚싯바늘',emoji:'🪝',kind:'tool',sub:'낚시 자리 조성'},
 net:{name:'그물',emoji:'🕸️',kind:'tool',sub:'그물 어장 조성'},
 basket:{name:'바구니',emoji:'🧺',kind:'tool',sub:'통발 제작 재료'},
 fishTrap:{name:'통발',emoji:'🪤',kind:'tool',sub:'통발 어장 조성'},
 spear:{name:'돌창',emoji:'🗡️',kind:'tool',sub:'사냥꾼 양성'},
 bow:{name:'활',emoji:'🏹',kind:'tool',sub:'힘줄과 나무로 만든 사냥 도구'},
 groundStone:{name:'간 돌',emoji:'⚪',kind:'tool',sub:'강에서 매끈하게 간 석재'},
 groundAxe:{name:'간돌도끼',emoji:'🪓',kind:'tool',sub:'숲 개간 가능'},
 stoneHoe:{name:'돌괭이',emoji:'⛏️',kind:'tool',sub:'농부 양성'},
 sickle:{name:'돌낫',emoji:'🌙',kind:'tool',sub:'곡물 작업 도구'},
 grindingStone:{name:'갈돌·갈판',emoji:'🪨',kind:'tool',sub:'곡물과 도토리를 갈 수 있음'},
 arrowhead:{name:'돌화살촉',emoji:'🔺',kind:'tool',sub:'화살 제작 재료'},
 arrow:{name:'화살',emoji:'🏹',kind:'tool',sub:'활과 합쳐 사냥 활 세트'},
 huntingBow:{name:'활·화살 세트',emoji:'🏹',kind:'tool',sub:'사냥꾼을 양성하는 궁시'},
 harpoonHead:{name:'뼈 작살촉',emoji:'🦴',kind:'tool',sub:'작살 제작 재료'},
 harpoon:{name:'작살',emoji:'🔱',kind:'tool',sub:'강과 바다에서 어로 가능'},
 snare:{name:'올가미',emoji:'🪤',kind:'tool',sub:'작은 동물을 잡는 덫'},
 spindleWhorl:{name:'가락바퀴',emoji:'🧿',kind:'tool',sub:'섬유로 실을 뽑는 도구'},
 yarn:{name:'실',emoji:'🧶',kind:'item',sub:'직조의 재료'},
 loom:{name:'간단한 베틀',emoji:'🪵',kind:'building',sub:'실을 직물로 짬'},
 wovenCloth:{name:'직물',emoji:'🧶',kind:'item',sub:'옷 제작 재료'},
 wovenClothing:{name:'직물옷',emoji:'👕',kind:'tool',sub:'방직 기술로 만든 옷'},
 storageBasket:{name:'저장 바구니',emoji:'🧺',kind:'building',sub:'바구니 3개를 묶은 저장 도구'},
 shellKnife:{name:'조개칼',emoji:'🐚',kind:'tool',sub:'식물·식재료 가공 도구'},
 shellOrnament:{name:'조개 장신구',emoji:'📿',kind:'tool',sub:'정착지 생활문화의 흔적'},
 tuskOrnament:{name:'엄니 장신구',emoji:'📿',kind:'tool',sub:'멧돼지 엄니로 만든 장신구'},

 campfire:{name:'모닥불',emoji:'🔥',kind:'building',sub:'기본 조리와 불 유지'},
 hearth:{name:'돌화덕',emoji:'🔥',kind:'building',sub:'안정적인 조리와 가열'},
 kiln:{name:'점토 가마',emoji:'🏺',kind:'building',sub:'토기를 안정적으로 소성'},
 charcoal:{name:'숯',emoji:'⚫',kind:'item',sub:'가마에서 만든 고온 연료'},
 highKiln:{name:'숯 고온가마',emoji:'🔥',kind:'building',sub:'숯으로 더 안정적으로 소성'},
 smokingRack:{name:'훈연대',emoji:'♨️',kind:'building',sub:'고기·생선을 보존'},
 clayVessel:{name:'말린 토기',emoji:'🏺',kind:'item',sub:'불에 구우면 토기'},
 combRawPot:{name:'무늬 넣은 토기',emoji:'🏺',kind:'item',sub:'소성 전 빗살무늬토기'},
 pottery:{name:'토기',emoji:'🏺',kind:'tool',sub:'저장·조리 용기'},
 combPottery:{name:'빗살무늬토기',emoji:'🏺',kind:'tool',sub:'신석기 저장·조리 도구'},
 storageJars:{name:'저장 토기 묶음',emoji:'🏺',kind:'building',sub:'정착지 저장 능력 증가'},
 dressedHide:{name:'손질한 가죽',emoji:'🟫',kind:'item',sub:'옷·천막 제작 가능'},
 leatherClothing:{name:'가죽옷',emoji:'🧥',kind:'tool',sub:'생활 안정도 증가'},
 hutFrame:{name:'움집 골조',emoji:'🪵',kind:'building',sub:'가죽·토기로 완성'},
 hideTent:{name:'가죽 천막',emoji:'⛺',kind:'building',sub:'이동 생활 거처'},
 pitHouse:{name:'움집',emoji:'🏠',kind:'building',sub:'정착 생활 거처'},
 camp:{name:'사냥 캠프',emoji:'🏕️',kind:'building',sub:'천막이 모인 생활지'},
 village:{name:'신석기 마을',emoji:'🏘️',kind:'building',sub:'움집이 모인 정착지'},
 clearedPlot:{name:'개간지',emoji:'🟫',kind:'node',sub:'씨앗을 심을 수 있음'},
 milletPlot:{name:'조밭',emoji:'🌱',kind:'node',sub:'사람이 돌보면 조 생산'},
 milletFarm:{name:'조 농장',emoji:'🌾',kind:'building',sub:'조밭 3개가 합쳐진 생산지'},
 broomcornPlot:{name:'기장밭',emoji:'🌱',kind:'node',sub:'사람이 돌보면 기장 생산'},
 broomcornFarm:{name:'기장 농장',emoji:'🌾',kind:'building',sub:'기장밭 3개가 합쳐진 생산지'},
 beanPlot:{name:'콩밭',emoji:'🌱',kind:'node',sub:'사람이 돌보면 콩 생산'},
 beanFarm:{name:'콩 농장',emoji:'🫘',kind:'building',sub:'콩밭 3개가 합쳐진 생산지'},
 granary:{name:'곡식 저장소',emoji:'🛖',kind:'building',sub:'농경 정착의 핵심'},
 fishingSpot:{name:'낚시 자리',emoji:'🎣',kind:'node',sub:'강가의 작은 낚시 지점'},
 fishingGround:{name:'낚시터',emoji:'🐟',kind:'building',sub:'낚시 자리 3개가 합쳐짐'},
 netSpot:{name:'그물 자리',emoji:'🕸️',kind:'node',sub:'그물로 물고기를 잡음'},
 netFishery:{name:'그물 어장',emoji:'🐟',kind:'building',sub:'그물 자리 3개가 합쳐짐'},
 trapSpot:{name:'통발 자리',emoji:'🪤',kind:'node',sub:'통발로 물고기를 잡음'},
 trapFishery:{name:'통발 어장',emoji:'🐟',kind:'building',sub:'통발 자리 3개가 합쳐짐'},
 fence:{name:'울타리',emoji:'🪵',kind:'building',sub:'가축 우리 재료'},
 tamedGoat:{name:'길들인 염소',emoji:'🐐',kind:'item',sub:'울타리와 합쳐 우리 조성'},
 goatPen:{name:'염소 우리',emoji:'🐐',kind:'node',sub:'젖을 얻을 수 있음'},
 goatRanch:{name:'염소 목장',emoji:'🐐',kind:'building',sub:'염소 우리 3개가 합쳐짐'},
 waterPit:{name:'저수 웅덩이',emoji:'💧',kind:'node',sub:'개간지를 파서 물을 모음'},
 reservoir:{name:'작은 저수지',emoji:'🌊',kind:'building',sub:'저수 웅덩이 3개가 합쳐짐'},
 fishHolding:{name:'민물고기 가두리',emoji:'🐟',kind:'node',sub:'잡은 물고기를 가두어 기름'},
 fishPond:{name:'민물고기 양식장',emoji:'🐟',kind:'building',sub:'가두리 3개가 합쳐진 실험적 생산지'}
};

const state={
 started:false,over:false,runId:0,id:0,z:20,day:1,mealLeft:70,starving:false,hunger:100,cards:new Map(),discoveries:new Set(),timers:[],
 lifestyle:{hunt:0,farm:0,fish:0,herd:0},stats:{crafted:0,gathered:0,meals:0,explores:0},milestoneShown:false
};
let bgmHandle=null;

const SAME={
 stone:{need:2,out:'chopper',name:'찍개'},
 fiber:{need:3,out:'cord',name:'끈 꼬기'},
 basket:{need:3,out:'storageBasket',name:'저장 바구니'},
 shell:{need:3,out:'shellOrnament',name:'조개 장신구'},
 cord:{need:2,out:'net',name:'그물 짜기'},
 clay:{need:2,out:'clayVessel',name:'토기 성형'},
 combPottery:{need:3,out:'storageJars',name:'저장 토기'},
 hideTent:{need:3,out:'camp',name:'사냥 캠프'},
 pitHouse:{need:3,out:'village',name:'신석기 마을'},
 milletPlot:{need:3,out:'milletFarm',name:'조 농장'},
 broomcornPlot:{need:3,out:'broomcornFarm',name:'기장 농장'},
 beanPlot:{need:3,out:'beanFarm',name:'콩 농장'},
 fishingSpot:{need:3,out:'fishingGround',name:'낚시터'},
 netSpot:{need:3,out:'netFishery',name:'그물 어장'},
 trapSpot:{need:3,out:'trapFishery',name:'통발 어장'},
 goatPen:{need:3,out:'goatRanch',name:'염소 목장'},
 waterPit:{need:3,out:'reservoir',name:'작은 저수지'},
 fishHolding:{need:3,out:'fishPond',name:'민물고기 양식장'}
};

const R=[
 ['chopper','stone',0,1,[['stoneBlade',1]],'돌날'],
 ['chopper','branch',1,1,[['stoneAxe',1]],'돌도끼'],
 ['stoneBlade','bone',1,1,[['scraper',1]],'긁개'],
 ['chopper','bone',0,1,[['boneNeedle',1]],'뼈바늘'],
 ['bone','cord',1,1,[['fishHook',1]],'뼈 낚싯바늘'],
 ['fiber','cord',1,1,[['basket',1]],'바구니'],
 ['clay','stone',1,1,[['spindleWhorl',1]],'가락바퀴'],
 ['fiber','spindleWhorl',1,0,[['yarn',1]],'실 뽑기'],
 ['wood','spindleWhorl',2,0,[['loom',1]],'간단한 베틀'],
 ['yarn','loom',1,0,[['wovenCloth',1]],'직조'],
 ['wovenCloth','boneNeedle',1,0,[['wovenClothing',1]],'직물옷'],
 ['shell','chopper',1,0,[['shellKnife',1]],'조개칼'],
 ['boarTusk','cord',1,1,[['tuskOrnament',1]],'엄니 장신구'],
 ['basket','cord',1,1,[['fishTrap',1]],'통발'],
 ['stoneBlade','branch',1,1,[['spear',1]],'돌창'],
 ['sinew','branch',1,1,[['bow',1]],'활'],
 ['stoneBlade','fiber',1,1,[['arrowhead',1]],'돌화살촉'],
 ['arrowhead','branch',1,1,[['arrow',1]],'화살'],
 ['bow','arrow',1,1,[['huntingBow',1]],'활·화살 세트'],
 ['bone','sinew',1,1,[['harpoonHead',1]],'뼈 작살촉'],
 ['harpoonHead','branch',1,1,[['harpoon',1]],'작살'],
 ['cord','stone',1,1,[['snare',1]],'올가미'],
 ['groundStone','wood',1,1,[['groundAxe',1]],'간돌도끼'],
 ['groundStone','cord',1,1,[['stoneHoe',1]],'돌괭이'],
 ['stoneBlade','cord',1,1,[['sickle',1]],'돌낫'],
 ['groundStone','stone',1,1,[['grindingStone',1]],'갈돌·갈판'],
 ['branch','fiber',1,1,[['campfire',1]],'불 피우기'],
 ['wood','fiber',1,1,[['campfire',1]],'큰 장작으로 불 피우기'],
 ['wood','cord',1,1,[['fence',1]],'울타리'],
 ['wood','cord',2,1,[['hutFrame',1]],'움집 골조'],
 ['wood','campfire',2,0,[['smokingRack',1]],'훈연대'],
 ['groundStone','campfire',1,0,[['hearth',1]],'돌화덕'],
 ['clayVessel','hearth',2,0,[['kiln',1]],'점토 가마'],
 ['wood','kiln',2,0,[['charcoal',2]],'숯 굽기'],
 ['charcoal','kiln',1,1,[['highKiln',1]],'숯 고온가마'],
 ['rawHide','scraper',1,0,[['dressedHide',1]],'가죽 손질'],
 ['dressedHide','boneNeedle',1,0,[['leatherClothing',1]],'가죽옷'],
 ['dressedHide','hutFrame',1,1,[['hideTent',1]],'가죽 천막'],
 ['hutFrame','clayVessel',1,1,[['pitHouse',1]],'움집'],
 ['clayVessel','boneNeedle',1,0,[['combRawPot',1]],'빗살무늬 새기기'],
 ['clayVessel','stoneBlade',1,0,[['combRawPot',1]],'석기로 무늬 새기기'],
 ['clayVessel','campfire',1,0,[['pottery',1]],'토기 굽기'],
 ['combRawPot','campfire',1,0,[['combPottery',1]],'빗살무늬토기 굽기'],
 ['clayVessel','kiln',1,0,[['pottery',1]],'가마에서 토기 굽기'],
 ['combRawPot','kiln',1,0,[['combPottery',1]],'가마에서 빗살무늬토기 굽기'],
 ['clayVessel','highKiln',1,0,[['pottery',2]],'고온가마 토기 소성'],
 ['combRawPot','highKiln',1,0,[['combPottery',2]],'고온가마 빗살무늬토기 소성'],
 ['rawMeat','campfire',1,0,[['cookedMeat',1]],'고기 익히기'],
 ['rawMeat','smokingRack',1,0,[['smokedMeat',1]],'고기 훈연'],
 ['freshFish','smokingRack',1,0,[['smokedFish',1]],'생선 훈연'],
 ['milletGrain','grindingStone',1,0,[['flour',1]],'곡물 갈기'],
 ['flour','pottery',1,0,[['porridgePrep',1]],'죽 준비'],
 ['porridgePrep','campfire',1,0,[['porridge',1]],'곡물죽 끓이기'],
 ['porridgePrep','hearth',1,0,[['porridge',1]],'화덕에서 곡물죽 끓이기'],
 ['acorn','grindingStone',1,0,[['acornMeal',1]],'도토리 갈기'],
 ['leachedAcorn','pottery',1,0,[['acornPrep',1]],'도토리죽 준비'],
 ['acornPrep','hearth',1,0,[['acornPorridge',1]],'도토리죽 끓이기'],
 ['milletSeed','clearedPlot',1,1,[['milletPlot',1]],'조밭 만들기'],
 ['broomcornSeed','clearedPlot',1,1,[['broomcornPlot',1]],'기장밭 만들기'],
 ['beanSeed','clearedPlot',1,1,[['beanPlot',1]],'콩밭 만들기'],
 ['milletFarm','storageJars',0,1,[['granary',1]],'곡식 저장소'],
 ['broomcornFarm','storageJars',0,1,[['granary',1]],'기장 저장소'],
 ['beanFarm','storageJars',0,1,[['granary',1]],'콩 저장소'],
 ['tamedGoat','fence',1,1,[['goatPen',1]],'염소 우리'],
 ['freshFish','reservoir',1,0,[['fishHolding',1]],'민물고기 가두리'],
 ['person','spear',1,1,[['hunter',1]],'사냥꾼'],
 ['person','bow',1,1,[['hunter',1]],'활 사냥꾼'],
 ['person','huntingBow',1,1,[['hunter',1]],'궁시 사냥꾼'],
 ['person','harpoon',1,1,[['fisher',1]],'작살 어부'],
 ['person','fishHook',1,1,[['fisher',1]],'어부'],
 ['person','stoneHoe',1,1,[['farmer',1]],'농부'],
 ['person','cord',1,1,[['herder',1]],'목축민'],
 ['person','stoneAxe',1,1,[['lumberjack',1]],'벌목꾼'],
 ['person','groundAxe',1,1,[['lumberjack',1]],'간돌도끼 벌목꾼']
].map(x=>({a:x[0],b:x[1],ca:x[2],cb:x[3],out:x[4],name:x[5]}));

const SETTLE_POINTS={camp:2,village:5,pitHouse:1,milletFarm:3,broomcornFarm:3,beanFarm:3,granary:2,fishingGround:3,netFishery:3,trapFishery:3,goatRanch:3,reservoir:2,fishPond:3,storageJars:1,storageBasket:1,combPottery:1,groundAxe:1,leatherClothing:1,wovenClothing:1,hearth:1,kiln:2,highKiln:2,shellOrnament:1,tuskOrnament:1};
const FOOD_TYPES=()=>Object.keys(C).filter(k=>C[k].food);
const isWorker=t=>['person','hunter','fisher','farmer','herder','lumberjack'].includes(t);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const RESOURCE_CAPS=Object.freeze({
 smallTree:8,bigTree:10,berryBush:8,stoneSource:10,reedBed:10,clayBank:10,
 wildMillet:12,wildBroomcorn:12,wildBean:12,oakGrove:12,tidalFlat:12,
 milletPlot:12,milletFarm:18,broomcornPlot:12,broomcornFarm:18,beanPlot:12,beanFarm:18,
 fishingSpot:10,fishingGround:15,netSpot:12,netFishery:18,trapSpot:12,trapFishery:18,
 goatPen:12,goatRanch:18,fishPond:16
});
function resourceCap(type,count=1){return (RESOURCE_CAPS[type]||0)*Math.max(1,count||1);}
function outputUnits(out){return out.reduce((n,o)=>n+(Number(o[1])||1),0);}

function reset(){
 state.runId++;state.started=true;state.over=false;state.id=0;state.z=20;state.day=1;state.mealLeft=70;state.starving=false;state.hunger=100;state.cards.clear();state.discoveries.clear();
 state.lifestyle={hunt:0,farm:0,fish:0,herd:0};state.stats={crafted:0,gathered:0,meals:0,explores:0};state.milestoneShown=false;
 state.timers.forEach(clearInterval);state.timers=[];board.innerHTML='';ui.era.textContent='구석기 생활';
 $('#milestoneLayer').classList.add('hidden');$('#gameOverLayer').classList.add('hidden');
 spawnInitial();renderAll();
 const t=setInterval(()=>{
  if(!state.started||state.over)return;
  if(state.starving){
   if(tryRecoverMeal())return;
   state.hunger=Math.max(0,state.hunger-2.5);
   if(state.hunger<=0){
    state.over=true;
    $('#gameOverLayer').classList.remove('hidden');
    showToast('🌙 굶주림을 버티지 못했습니다.');
   }
   renderHud();renderHunger();return;
  }
  state.mealLeft--;
  if(state.mealLeft<=0)eatMeal();
  renderHud();renderHunger();
 },1000);
 state.timers.push(t);
}

function spawnInitial(){
 const w=Math.max(620,board.clientWidth),h=Math.max(390,board.clientHeight);
 const list=[
  ['person',.11,.16],['person',.22,.26],['berry',.10,.60],['berry',.20,.69],
  ['smallTree',.38,.12],['bigTree',.49,.12],['berryBush',.62,.15],['stoneSource',.78,.20],['reedBed',.88,.38],
  ['clayBank',.70,.54],['river',.48,.58],['wildMillet',.31,.50],['oakGrove',.38,.72],['deer',.17,.43],['wildGoat',.83,.66]
 ];
 list.forEach(([t,x,y])=>addCard(t,Math.min(w-120,w*x),Math.min(h-150,h*y),1,false));
}

const ANIMALS=new Set(['deer','wildGoat','wildBoar','rabbit','tamedGoat']);
const DANGERS=new Set(['deer','wildBoar']);
function cardGroup(type,d){
 if(isWorker(type))return {cls:'human',label:'주민'};
 if(ANIMALS.has(type))return {cls:(DANGERS.has(type)?'animal danger':'animal'),label:'동물'};
 if(d.kind==='node')return {cls:'node',label:'자연'};
 if(d.kind==='food')return {cls:'food',label:'음식'};
 if(d.kind==='building')return {cls:'building',label:'시설'};
 if(d.kind==='tool')return {cls:'tool',label:'도구'};
 return {cls:'item',label:'자원'};
}
function artMarkup(type,d){
 if(d.image)return '<img src="'+d.image+'" alt="'+d.name+'" draggable="false">';
 return '<span class="emoji" aria-hidden="true">'+d.emoji+'</span>';
}
function addCard(type,x,y,count=1,animate=true){
 if(!C[type])return null;
 const id=++state.id,el=document.createElement('div'),d=C[type],group=cardGroup(type,d);
 el.className='card '+group.cls+(animate?' newborn':'');el.dataset.id=id;
 const foodBadge=d.food?'<span class="foodBadge">🍖 '+d.food+'</span>':'';
 const resourceBadge=RESOURCE_CAPS[type]?'<span class="resourceBadge"></span>':'';
 el.innerHTML='<div class="cardShell"><div class="cardRibbon">'+group.label+'</div><div class="cardArt">'+artMarkup(type,d)+'</div><div class="cardName">'+d.name+'</div><div class="cardSub">'+d.sub+'</div>'+foodBadge+resourceBadge+'</div><span class="countBadge"></span><div class="workTag">진행 중…</div><div class="progress"></div><div class="hungerLabel">굶주림</div><div class="hungerMeter"><i></i></div>';
 board.appendChild(el);
 const c={id,type,count,busy:false,x:0,y:0,el,remaining:resourceCap(type,count)||null};state.cards.set(id,c);updateCard(c);
 place(c,clamp(x,4,Math.max(4,board.clientWidth-el.offsetWidth-12)),clamp(y,18,Math.max(18,board.clientHeight-el.offsetHeight-12)));
 bindDrag(c);if(animate)onCreated(type);renderHunger();return c;
}
function updateCard(c){
 if(!c||!state.cards.has(c.id))return;
 const b=c.el.querySelector('.countBadge');b.textContent='×'+c.count;b.classList.toggle('one',c.count===1);
 c.el.classList.toggle('stacked',c.count>1);
 const rb=c.el.querySelector('.resourceBadge');
 if(rb){
  const cap=resourceCap(c.type,c.count),left=Math.max(0,c.remaining??cap);
  rb.textContent='⛏ '+left;
  rb.classList.toggle('low',left<=Math.max(2,Math.ceil(cap*.25)));
 }
}
function place(c,x,y){c.x=x;c.y=y;c.el.style.left=x+'px';c.el.style.top=y+'px';}
function removeCard(c){if(!c||!state.cards.has(c.id))return;c.el.remove();state.cards.delete(c.id);}
function consume(c,n){if(n<=0)return true;if(!c||c.count<n)return false;c.count-=n;if(c.count<=0)removeCard(c);else updateCard(c);return true;}

const WORK_NODES=new Set(['smallTree','bigTree','berryBush','stoneSource','reedBed','clayBank','wildMillet','wildBroomcorn','wildBean','oakGrove','tidalFlat','milletPlot','milletFarm','broomcornPlot','broomcornFarm','beanPlot','beanFarm','fishingSpot','fishingGround','netSpot','netFishery','trapSpot','trapFishery','goatPen','goatRanch','fishPond']);
function interactionClass(a,b){
 if(a.type===b.type)return 'drop-stack';
 if(findRecipe(a,b))return 'drop-craft';
 if(specialAction(a,b))return 'drop-action';
 const worker=isWorker(a.type)?a:(isWorker(b.type)?b:null);
 if(!worker)return '';
 const node=worker.id===a.id?b:a;
 if(node.type==='bigTree')return worker.type==='lumberjack'?'drop-action':'';
 if(WORK_NODES.has(node.type))return 'drop-action';
 if(node.type==='deer'||node.type==='wildBoar')return worker.type==='hunter'?'drop-danger':'';
 if(node.type==='wildGoat')return worker.type==='herder'?'drop-action':'';
 return '';
}
function clearHighlights(){for(const o of state.cards.values())o.el.classList.remove('drop-stack','drop-craft','drop-action','drop-danger');}
function highlightTargets(c){
 clearHighlights();
 for(const o of state.cards.values()){
  if(o.id===c.id||o.busy)continue;
  const cls=interactionClass(c,o);if(cls)o.el.classList.add(cls);
 }
}
function clearWorkVisual(c){
 if(!c?.el)return;
 c.busy=false;c.el.classList.remove('busy');
 const tag=c.el.querySelector('.workTag');if(tag)tag.textContent='진행 중…';
 const p=c.el.querySelector('.progress');if(p){p.style.transition='none';p.style.width='0';}
}
function cancelAssignment(card){
 let worker=isWorker(card?.type)?card:null;
 if(!worker&&card?.occupiedBy)worker=state.cards.get(card.occupiedBy)||null;
 if(!worker||!worker.assignmentNodeId)return;
 const node=state.cards.get(worker.assignmentNodeId);
 if(worker.assignmentTimer){clearTimeout(worker.assignmentTimer);worker.assignmentTimer=null;}
 if(node&&node.occupiedBy===worker.id){node.occupiedBy=null;clearWorkVisual(node);}
 worker.assignmentNodeId=null;clearWorkVisual(worker);
}
function pointInExtractor(x,y){
 const r=ui.extractor?.getBoundingClientRect?.();return !!r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
}
function setExtractorDrag(card,x=null,y=null){
 if(!ui.extractor)return;
 const ready=!!card&&card.count>1;
 ui.extractor.classList.toggle('ready',ready);
 ui.extractor.classList.toggle('over',ready&&x!=null&&pointInExtractor(x,y));
}
function splitOneFromStack(card,x,y){
 if(!card||!state.cards.has(card.id)||card.count<=1)return false;
 cancelAssignment(card);
 const type=card.type,capOne=resourceCap(type,1);
 let splitRemaining=null;
 if(capOne&&card.remaining!=null){splitRemaining=Math.min(capOne,card.remaining);card.remaining=Math.max(0,card.remaining-splitRemaining);}
 card.count-=1;updateCard(card);place(card,x,y);
 const dx=x+50+card.el.offsetWidth<=board.clientWidth?50:-50;
 const out=addCard(type,clamp(x+dx,6,Math.max(6,board.clientWidth-card.el.offsetWidth-12)),clamp(y+24,20,Math.max(20,board.clientHeight-card.el.offsetHeight-12)),1,false);
 if(out&&splitRemaining!=null){out.remaining=splitRemaining;updateCard(out);}
 if(out){
  out.el.classList.add('split-out');
  setTimeout(()=>out.el?.classList.remove('split-out'),420);
 }
 playUiSound('ui.open',{volume:.2,rate:1.08});
 impactAt(x+card.el.offsetWidth/2,y+card.el.offsetHeight/2,'soft');
 showToast('↔ '+C[type].name+' 1장을 스택에서 분리했습니다.');
 renderAll();return true;
}
function bindDrag(c){
 let dragging=false,ox=0,oy=0,moved=false,startX=0,startY=0;
 c.el.addEventListener('pointerdown',e=>{
  if(!state.started||state.over||(c.busy&&!c.assignmentNodeId&&!c.occupiedBy))return;
  dragging=true;moved=false;startX=c.x;startY=c.y;c.el.setPointerCapture(e.pointerId);c.el.classList.add('dragging');highlightTargets(c);setExtractorDrag(c,e.clientX,e.clientY);
  const r=c.el.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;c.el.style.zIndex=++state.z;e.preventDefault();
 });
 c.el.addEventListener('pointermove',e=>{
  if(!dragging)return;
  if(!moved){moved=true;cancelAssignment(c);}
  setExtractorDrag(c,e.clientX,e.clientY);
  const r=board.getBoundingClientRect();
  place(c,clamp(e.clientX-r.left-ox,4,Math.max(4,r.width-c.el.offsetWidth-12)),clamp(e.clientY-r.top-oy,18,Math.max(18,r.height-c.el.offsetHeight-12)));e.preventDefault();
 });
 const end=e=>{
  if(!dragging)return;dragging=false;c.el.classList.remove('dragging');clearHighlights();
  const extract=pointInExtractor(e.clientX,e.clientY)&&c.count>1;setExtractorDrag(null);
  try{c.el.releasePointerCapture(e.pointerId)}catch(_){}
  if(!moved)return;
  if(extract){splitOneFromStack(c,startX,startY);return;}
  const target=findTarget(c);if(target)resolve(c,target);
 };
 c.el.addEventListener('pointerup',end);c.el.addEventListener('pointercancel',end);
}

function findTarget(c){
 const r=c.el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let best=null,dist=1e9;
 for(const o of state.cards.values()){if(o.id===c.id||o.busy)continue;const q=o.el.getBoundingClientRect();if(cx>=q.left&&cx<=q.right&&cy>=q.top&&cy<=q.bottom){const d=Math.hypot(cx-q.left-q.width/2,cy-q.top-q.height/2);if(d<dist){best=o;dist=d;}}}
 return best;
}

function resolve(a,b){
 if(a.busy||b.busy)return;
 if(a.type===b.type){mergeSame(a,b);return;}
 const recipe=findRecipe(a,b);
 if(recipe){craftRecipe(a,b,recipe);return;}
 const worker=isWorker(a.type)?a:(isWorker(b.type)?b:null);
 if(worker){const node=worker.id===a.id?b:a;const act=workerAction(worker,node);if(act){runAction(worker,node,act);return;}}
 const special=specialAction(a,b);if(special){runSpecial(a,b,special);return;}
 showToast('이 조합은 아직 쓸 방법을 찾지 못했어요.');separate(a,b);
}

function playUiSound(key,options={}){
 try{window.KidscadeAudio?.play?.(key,options)?.catch?.(()=>{});}catch(_){}
}
function impactAt(x,y,variant='hard'){
 const e=document.createElement('i');e.className='impactBurst'+(variant==='soft'?' soft':'');
 e.style.left=x+'px';e.style.top=y+'px';board.appendChild(e);setTimeout(()=>e.remove(),430);
}
function animateCombine(a,b,done){
 const run=state.runId;if(!state.cards.has(a.id)||!state.cards.has(b.id))return;
 a.busy=true;b.busy=true;
 a.el.classList.add('merge-source');b.el.classList.add('merge-target');
 place(a,b.x+3,b.y+4);a.el.style.zIndex=++state.z;
 setTimeout(()=>{
  if(run!==state.runId||!state.cards.has(a.id)||!state.cards.has(b.id))return;
  impactAt(b.x+b.el.offsetWidth/2,b.y+b.el.offsetHeight/2);
  playUiSound('ui.select',{volume:.2,rate:.9});
  done();
  for(const c of [a,b])if(state.cards.has(c.id)){c.busy=false;c.el.classList.remove('merge-source','merge-target');}
 },175);
}
function markSynthesized(card){
 if(!card)return;card.el.classList.add('synthesized');setTimeout(()=>card.el?.classList.remove('synthesized'),460);
}
function mergeSame(a,b){
 const total=a.count+b.count,rule=SAME[a.type],x=b.x,y=b.y;
 const remaining=(a.remaining??resourceCap(a.type,a.count))+(b.remaining??resourceCap(b.type,b.count));
 animateCombine(a,b,()=>{
  removeCard(a);removeCard(b);
  let result=null;
  if(rule&&total>=rule.need){
   result=addCard(rule.out,x,y,1);discover(rule.name);state.stats.crafted++;
   const rest=total-rule.need;if(rest>0)addCard(a.type,x+30,y+24,rest);
  }else {result=addCard(a.type,x,y,total);if(result&&RESOURCE_CAPS[a.type]){result.remaining=remaining;updateCard(result);}}
  markSynthesized(result);playUiSound('ui.confirm',{volume:.22,rate:1.04});
  renderAll();checkMilestone();
 });
}

function findRecipe(a,b){
 return R.filter(r=>((a.type===r.a&&b.type===r.b&&a.count>=r.ca&&b.count>=r.cb)||(a.type===r.b&&b.type===r.a&&a.count>=r.cb&&b.count>=r.ca))).sort((x,y)=>(y.ca+y.cb)-(x.ca+x.cb))[0]||null;
}
function craftRecipe(a,b,r){
 const direct=a.type===r.a,ca=direct?r.ca:r.cb,cb=direct?r.cb:r.ca,x=(a.x+b.x)/2,y=(a.y+b.y)/2;
 animateCombine(a,b,()=>{
  consume(a,ca);consume(b,cb);
  let first=null;
  r.out.forEach((o,i)=>{const card=addCard(o[0],x+i*28,y+i*24,o[1]||1);if(!first)first=card;markSynthesized(card);});
  discover(r.name);state.stats.crafted++;playUiSound('ui.confirm',{volume:.22,rate:1.06});
  renderAll();checkMilestone();
 });
}

function workerAction(worker,node){
 const base={
  smallTree:{ms:4800,label:'나뭇가지 모으는 중',out:[['branch',1]],life:'hunt'},
  berryBush:{ms:5200,label:'열매 따는 중',out:[['berry',1]],life:'hunt'},
  stoneSource:{ms:6200,label:'쓸 만한 돌 찾는 중',out:[['stone',1]],life:'hunt'},
  reedBed:{ms:5600,label:'섬유 모으는 중',out:[['fiber',1]],life:'hunt'},
  clayBank:{ms:6800,label:'점토 캐는 중',out:[['clay',1]],life:null},
  wildMillet:{ms:6500,label:'야생 조 거두는 중',out:[['wildGrain',1],['milletSeed',1]],life:'farm'},
  wildBroomcorn:{ms:6500,label:'야생 기장 거두는 중',out:[['broomcornGrain',1],['broomcornSeed',1]],life:'farm'},
  wildBean:{ms:6500,label:'야생 콩 거두는 중',out:[['bean',1],['beanSeed',1]],life:'farm'},
  oakGrove:{ms:6200,label:'도토리 줍는 중',out:[['acorn',2]],life:'hunt'},
  tidalFlat:{ms:7200,label:'갯벌 채집 중',out:[['clam',1],['oyster',1],['shell',1]],life:'fish',lifeGain:2}
 };
 if(base[node.type])return base[node.type];
 if(node.type==='bigTree'){
  if(worker.type!=='lumberjack'){showToast('큰 나무는 돌도끼를 든 벌목꾼이 있어야 벨 수 있어요.');return null;}
  return {ms:8500,label:'큰 나무 베는 중',out:[['wood',1]],life:'hunt'};
 }
 if(node.type==='deer'){
  if(worker.type!=='hunter'){showToast('큰 사슴은 돌창을 든 사냥꾼이 필요해요.');return null;}
  return {ms:8500,label:'사슴 사냥 중',out:[['rawMeat',2],['rawHide',1],['bone',1],['sinew',1]],life:'hunt',consumeNode:true,discover:'큰 사냥'};
 }
 if(node.type==='wildBoar'){
  if(worker.type!=='hunter'){showToast('멧돼지는 활이나 돌창을 다루는 사냥꾼이 필요해요.');return null;}
  return {ms:10000,label:'멧돼지 사냥 중',out:[['rawMeat',3],['rawHide',1],['bone',2],['boarTusk',1]],life:'hunt',lifeGain:2,consumeNode:true,discover:'멧돼지 사냥'};
 }
 if(node.type==='wildGoat'){
  if(worker.type!=='herder'){showToast('야생 염소는 끈을 다루는 목축민이 길들일 수 있어요.');return null;}
  return {ms:9000,label:'염소 길들이는 중',out:[['tamedGoat',1]],life:'herd',consumeNode:true,discover:'가축 길들이기'};
 }
 const prod={
  milletPlot:{ms:7200,label:'조밭 돌보는 중',out:[['milletGrain',worker.type==='farmer'?2:1],['milletSeed',1]],life:'farm'},
  milletFarm:{ms:9400,label:'조 농장 수확 중',out:[['milletGrain',worker.type==='farmer'?4:3],['milletSeed',1]],life:'farm',lifeGain:3},
  broomcornPlot:{ms:7200,label:'기장밭 돌보는 중',out:[['broomcornGrain',worker.type==='farmer'?2:1],['broomcornSeed',1]],life:'farm'},
  broomcornFarm:{ms:9400,label:'기장 농장 수확 중',out:[['broomcornGrain',worker.type==='farmer'?4:3],['broomcornSeed',1]],life:'farm',lifeGain:3},
  beanPlot:{ms:7200,label:'콩밭 돌보는 중',out:[['bean',worker.type==='farmer'?2:1],['beanSeed',1]],life:'farm'},
  beanFarm:{ms:9400,label:'콩 농장 수확 중',out:[['bean',worker.type==='farmer'?4:3],['beanSeed',1]],life:'farm',lifeGain:3},
  fishingSpot:{ms:7600,label:'낚시 중',out:[['freshFish',worker.type==='fisher'?2:1]],life:'fish'},
  fishingGround:{ms:9800,label:'낚시터 운영 중',out:[['freshFish',worker.type==='fisher'?4:3]],life:'fish',lifeGain:3},
  netSpot:{ms:8200,label:'그물 걷는 중',out:[['freshFish',2]],life:'fish',lifeGain:2},
  netFishery:{ms:9800,label:'그물 어장 운영 중',out:[['freshFish',4]],life:'fish',lifeGain:3},
  trapSpot:{ms:8200,label:'통발 확인 중',out:[['freshFish',2]],life:'fish',lifeGain:2},
  trapFishery:{ms:9800,label:'통발 어장 운영 중',out:[['freshFish',4]],life:'fish',lifeGain:3},
  goatPen:{ms:8200,label:'염소 돌보는 중',out:[['milk',1]],life:'herd'},
  goatRanch:{ms:10000,label:'염소 목장 돌보는 중',out:[['milk',3]],life:'herd',lifeGain:3},
  fishPond:{ms:11000,label:'양식장 돌보는 중',out:[['freshFish',2]],life:'fish',lifeGain:2}
 };
 return prod[node.type]||null;
}

function specialAction(a,b){
 const has=(x,y)=>((a.type===x&&b.type===y)||(a.type===y&&b.type===x));
 if(has('stone','river'))return {ms:6000,label:'돌 가는 중',consume:'stone',preserve:'river',out:[['groundStone',1]],discover:'간석기 제작'};
 if(has('groundAxe','bigTree'))return {ms:9000,label:'큰 나무 베어 개간 중',consume:'bigTree',preserve:'groundAxe',out:[['clearedPlot',1],['wood',2]],discover:'개간'};
 if(has('fishHook','river'))return {ms:6500,label:'낚시 자리 찾는 중',consume:null,preserve:null,out:[['fishingSpot',1]],discover:'낚시 자리'};
 if(has('net','river'))return {ms:7500,label:'그물 설치 중',consume:null,preserve:null,out:[['netSpot',1]],discover:'그물 어로'};
 if(has('fishTrap','river'))return {ms:7500,label:'통발 설치 중',consume:null,preserve:null,out:[['trapSpot',1]],discover:'통발 어로'};
 if(has('sickle','wildMillet'))return {ms:6000,label:'돌낫으로 수확 중',consume:null,preserve:null,out:[['wildGrain',2],['milletSeed',2]],discover:'돌낫 수확',life:'farm'};
 if(has('sickle','wildBroomcorn'))return {ms:6000,label:'기장 수확 중',consume:null,preserve:null,out:[['broomcornGrain',2],['broomcornSeed',2]],discover:'기장 수확',life:'farm'};
 if(has('harpoon','river'))return {ms:7000,label:'작살 어로 중',consume:null,preserve:null,out:[['freshFish',2]],discover:'작살 어로',life:'fish',lifeGain:2};
 if(has('snare','rabbit'))return {ms:6500,label:'올가미 확인 중',consume:'rabbit',preserve:'snare',out:[['rawMeat',1],['rawHide',1]],discover:'작은 동물 사냥',life:'hunt'};
 if(has('basket','berryBush'))return {ms:4200,label:'바구니로 채집 중',consume:null,preserve:null,out:[['berry',2]],discover:'바구니 채집',life:'hunt'};
 if(has('storageBasket','berryBush'))return {ms:4800,label:'저장 바구니 채집 중',consume:null,preserve:null,out:[['berry',4]],discover:'대량 채집',life:'hunt'};
 if(has('basket','tidalFlat'))return {ms:5200,label:'바구니로 갯벌 채집 중',consume:null,preserve:null,out:[['clam',2],['oyster',1],['shell',1]],discover:'갯벌 바구니 채집',life:'fish',lifeGain:2};
 if(has('acornMeal','river'))return {ms:7000,label:'도토리 떫은맛 우려내는 중',consume:'acornMeal',preserve:'river',out:[['leachedAcorn',1]],discover:'도토리 우리기'};
 if(has('shellKnife','reedBed'))return {ms:4200,label:'조개칼로 섬유 베는 중',consume:null,preserve:null,out:[['fiber',2]],discover:'조개칼 채집',life:'hunt'};
 if(has('shellKnife','wildMillet'))return {ms:5000,label:'조개칼로 곡식 베는 중',consume:null,preserve:null,out:[['wildGrain',2],['milletSeed',1]],discover:'조개칼 수확',life:'farm'};
 if(has('groundAxe','clearedPlot'))return {ms:8500,label:'저수 웅덩이 파는 중',consume:'clearedPlot',preserve:'groundAxe',out:[['waterPit',1]],discover:'저수 웅덩이'};
 return null;
}

function outputPosition(anchor,index=0){
 const offsets=[[126,0],[126,34],[-126,0],[-126,34],[34,158],[68,158],[0,158]];
 const p=offsets[index%offsets.length],w=board.clientWidth,h=board.clientHeight;
 return {x:clamp(anchor.x+p[0],6,Math.max(6,w-124)),y:clamp(anchor.y+p[1],20,Math.max(20,h-164))};
}
function playProductionPop(){
 try{
  if(window.KidscadeAudio?.play){window.KidscadeAudio.play('ui.confirm',{volume:.16,rate:1.18,rateJitter:.035,cooldownMs:70}).catch?.(()=>{});return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const ctx=playProductionPop.ctx||(playProductionPop.ctx=new AC());
  if(ctx.state==='suspended')ctx.resume();
  const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
  o.type='sine';o.frequency.setValueAtTime(520,t);o.frequency.exponentialRampToValueAtTime(760,t+.075);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.12);
  o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.13);
 }catch(_){}
}
function spawnOutputs(anchor,out){
 out.forEach((o,i)=>{
  const p=outputPosition(anchor,i+(anchor.produceSeq||0));
  const card=addCard(o[0],p.x,p.y,o[1]||1,true);
  if(card){card.el.classList.add('produced');setTimeout(()=>card.el?.classList.remove('produced'),470);}
 });
 anchor.produceSeq=((anchor.produceSeq||0)+out.length)%7;
 impactAt(anchor.x+anchor.el.offsetWidth/2,anchor.y+anchor.el.offsetHeight/2,'soft');
 playProductionPop();
}
function finishOneShotWorker(worker,node,d,run){
 if(state.over||run!==state.runId)return;
 clearWorkVisual(worker);
 if(state.cards.has(node.id)){if(d.consumeNode)removeCard(node);else clearWorkVisual(node);}
 spawnOutputs(state.cards.has(node.id)?node:worker,d.out);
 state.stats.gathered+=d.out.reduce((sum,o)=>sum+(o[1]||1),0);
 if(d.life)addLife(d.life,d.lifeGain||1);if(d.discover)discover(d.discover);
 if(state.cards.has(node.id))separate(worker,node);
 renderAll();checkMilestone();
}
function spendResource(node,out){
 const cap=resourceCap(node.type,node.count);if(!cap)return false;
 if(node.remaining==null)node.remaining=cap;
 node.remaining=Math.max(0,node.remaining-outputUnits(out));updateCard(node);
 return node.remaining<=0;
}
function exhaustResource(worker,node){
 const name=C[node.type]?.name||'자원';
 if(worker.assignmentTimer){clearTimeout(worker.assignmentTimer);worker.assignmentTimer=null;}
 worker.assignmentNodeId=null;if(node.occupiedBy===worker.id)node.occupiedBy=null;
 clearWorkVisual(worker);clearWorkVisual(node);
 const x=node.x,y=node.y;separate(worker,node);
 node.el.classList.add('depleted');
 showToast('🍂 '+name+'에서 얻을 수 있는 자원을 다 모았습니다. 다른 곳을 탐색해 보세요.');
 setTimeout(()=>{if(state.cards.has(node.id))removeCard(node);},380);
}
function productionCycle(worker,node,d,run){
 if(state.over||run!==state.runId||!state.cards.has(worker.id)||!state.cards.has(node.id)||worker.assignmentNodeId!==node.id)return;
 worker.busy=true;node.busy=true;markBusy(worker,d.label,d.ms);markBusy(node,d.label,d.ms);
 worker.assignmentTimer=setTimeout(()=>{
  if(state.over||run!==state.runId||worker.assignmentNodeId!==node.id||!state.cards.has(worker.id)||!state.cards.has(node.id))return;
  spawnOutputs(node,d.out);state.stats.gathered+=d.out.reduce((sum,o)=>sum+(o[1]||1),0);
  const exhausted=spendResource(node,d.out);
  if(d.life)addLife(d.life,d.lifeGain||1);if(d.discover)discover(d.discover);
  renderAll();checkMilestone();
  if(exhausted){exhaustResource(worker,node);return;}
  worker.assignmentTimer=setTimeout(()=>productionCycle(worker,node,d,run),520);
 },d.ms);
}
function runAction(worker,node,d){
 const run=state.runId;
 if(d.consumeNode){
  worker.busy=true;node.busy=true;markBusy(worker,d.label,d.ms);markBusy(node,d.label,d.ms);snap(worker,node);
  setTimeout(()=>finishOneShotWorker(worker,node,d,run),d.ms);return;
 }
 if(node.occupiedBy&&node.occupiedBy!==worker.id){showToast('이미 다른 사람이 이곳에서 일하고 있어요.');separate(worker,node);return;}
 cancelAssignment(worker);
 worker.assignmentNodeId=node.id;node.occupiedBy=worker.id;snap(worker,node);
 productionCycle(worker,node,d,run);
}

function depleteLooseNode(node){
 if(!node||!state.cards.has(node.id))return;
 const name=C[node.type]?.name||'자원';
 node.el.classList.add('depleted');
 showToast('🍂 '+name+'에서 얻을 수 있는 자원을 다 모았습니다.');
 setTimeout(()=>{if(state.cards.has(node.id))removeCard(node);},380);
}
function runSpecial(a,b,d){
 const run=state.runId;a.busy=true;b.busy=true;markBusy(a,d.label,d.ms);markBusy(b,d.label,d.ms);snap(a,b);
 setTimeout(()=>{if(state.over||run!==state.runId)return;
  [a,b].forEach(c=>{if(state.cards.has(c.id)){c.busy=false;c.el.classList.remove('busy');}});
  if(d.consume){const c=a.type===d.consume?a:b;consume(c,1);}
  const resourceNode=[a,b].find(c=>state.cards.has(c.id)&&RESOURCE_CAPS[c.type]);
  const base=state.cards.has(b.id)?b:(state.cards.has(a.id)?a:null),x=base?base.x:120,y=base?base.y:120;
  d.out.forEach((o,i)=>addCard(o[0],x+112+i*20,y+i*20,o[1]||1));
  const exhausted=resourceNode?spendResource(resourceNode,d.out):false;
  if(state.cards.has(a.id)&&state.cards.has(b.id))separate(a,b);
  if(exhausted)depleteLooseNode(resourceNode);
  if(d.life)addLife(d.life,d.lifeGain||1);discover(d.discover);renderAll();checkMilestone();
 },d.ms);
}

function markBusy(c,label,ms){c.el.classList.add('busy');c.el.querySelector('.workTag').textContent=label;const p=c.el.querySelector('.progress');p.style.transition='none';p.style.width='0';requestAnimationFrame(()=>requestAnimationFrame(()=>{p.style.transition='width '+ms+'ms linear';p.style.width='100%';}));}
function snap(a,b){place(a,b.x+10,b.y+12);a.el.style.zIndex=++state.z;}
function separate(a,b){if(!a||!state.cards.has(a.id)||!b||!state.cards.has(b.id))return;place(a,clamp(b.x+b.el.offsetWidth+12,4,Math.max(4,board.clientWidth-a.el.offsetWidth-4)),clamp(b.y+14,4,Math.max(4,board.clientHeight-a.el.offsetHeight-4)));}

function onCreated(type){
 if(['campfire','hearth','kiln','highKiln','dressedHide','groundAxe','combPottery','milletFarm','broomcornFarm','beanFarm','fishingGround','netFishery','trapFishery','goatRanch','pitHouse','village','wovenClothing','storageBasket'].includes(type))discover(C[type].name);
 if(['groundAxe','combPottery','pitHouse','milletFarm','broomcornFarm','beanFarm','fishingGround','goatRanch','wovenClothing','kiln','highKiln'].includes(type))ui.era.textContent='신석기 생활 확장';
}
function discover(name){if(state.discoveries.has(name))return;state.discoveries.add(name);showToast('💡 새 기술: '+name);try{window.KidscadeGame?.sound?.('correct')}catch(_){}}
function addLife(k,n=1){state.lifestyle[k]+=n;}

function settlementScore(){
 let score=0;const seen=new Set();
 for(const c of state.cards.values()){if(SETTLE_POINTS[c.type]&&!seen.has(c.type)){score+=SETTLE_POINTS[c.type];seen.add(c.type);}}
 return score;
}
function checkMilestone(){
 if(state.milestoneShown||state.over)return;
 const score=settlementScore(),advanced=['milletFarm','broomcornFarm','beanFarm','fishingGround','netFishery','trapFishery','goatRanch','fishPond','village','granary','kiln','highKiln'].filter(t=>[...state.cards.values()].some(c=>c.type===t)).length;
 if(score>=9&&advanced>=2){
  state.milestoneShown=true;
  $('#milestoneText').textContent='농경·어로·목축 중 여러 생활 기술과 주거·저장 기술이 연결되며 정착도가 '+score+'에 도달했습니다. 한 가지 길만 고르지 않아도 됩니다.';
  $('#resultStats').innerHTML='<div><span>생존</span><b>'+state.day+'일</b></div><div><span>정착도</span><b>'+score+'</b></div><div><span>발견 기술</span><b>'+state.discoveries.size+'</b></div>';
  $('#milestoneLayer').classList.remove('hidden');
  try{window.KidscadeGame?.score?.(score*100+state.discoveries.size*20)}catch(_){}
 }
}

function foodUnits(){let n=0;for(const c of state.cards.values())n+=(C[c.type].food||0)*c.count;return n;}
function population(){let n=0;for(const c of state.cards.values())if(isWorker(c.type))n+=c.count;return n;}
function consumeFood(need){
 const piles=[...state.cards.values()].filter(c=>C[c.type].food).sort((a,b)=>(C[a.type].food||1)-(C[b.type].food||1));
 let left=need;
 for(const c of piles){while(left>0&&state.cards.has(c.id)&&c.count>0){left-=C[c.type].food||1;consume(c,1);}if(left<=0)break;}
 return left<=0;
}
function beginStarvation(){
 if(state.starving)return;
 state.starving=true;state.hunger=100;state.mealLeft=0;
 showToast('⚠️ 식량이 부족합니다. 사람 카드의 굶주림 게이지가 바닥나기 전에 먹을 것을 만드세요.');
 renderAll();
}
function tryRecoverMeal(){
 const need=population();
 if(!state.starving||need<=0||foodUnits()<need)return false;
 consumeFood(need);state.starving=false;state.hunger=100;state.day++;state.mealLeft=70;state.stats.meals++;
 showToast('🍲 식량을 마련해 굶주림에서 벗어났습니다.');
 renderAll();return true;
}
function eatMeal(){
 const need=population();
 if(need<=0)return;
 if(foodUnits()<need){beginStarvation();return;}
 consumeFood(need);state.starving=false;state.hunger=100;state.day++;state.mealLeft=70;state.stats.meals++;
 showToast('🍲 부족이 한 끼를 먹고 '+state.day+'일째를 맞았습니다.');renderAll();
}

function explore(){
 if(state.over)return;if(foodUnits()<1){showToast('탐색에는 식량 1이 필요해요.');return;}consumeFood(1);state.stats.explores++;
 const pool=['deer','wildBoar','rabbit','wildGoat','berryBush','smallTree','bigTree','oakGrove','stoneSource','reedBed','clayBank','wildMillet','wildBroomcorn','wildBean','river','tidalFlat'];
 const t=pool[Math.floor(Math.random()*pool.length)],x=35+Math.random()*Math.max(60,board.clientWidth-170),y=45+Math.random()*Math.max(70,board.clientHeight-210);
 addCard(t,x,y);showToast('🧭 '+C[t].name+'을(를) 새로 발견했습니다.');renderAll();
}
function tidy(){
 const cards=[...state.cards.values()].filter(c=>!c.busy),cols=Math.max(3,Math.floor((board.clientWidth-18)/122));
 cards.forEach((c,i)=>place(c,10+(i%cols)*120,22+Math.floor(i/cols)*158));
}

function renderAll(){renderHud();renderLife();renderDiscoveries();renderQuests();renderGoal();renderHunger();}
function renderHud(){
 const food=foodUnits(),pop=population();
 ui.day.textContent=state.day+'일';ui.food.textContent=food;ui.pop.textContent=pop;
 ui.meal.textContent=state.starving?'위험':state.mealLeft+'초';ui.settlement.textContent=settlementScore();
 ui.explore.disabled=food<1||state.starving;
 ui.foodTile?.classList.toggle('low',state.starving||food<pop);
}
function renderHunger(){
 const noFood=foodUnits()===0,starvePct=Math.max(0,Math.min(100,state.hunger)),mealPct=Math.max(0,Math.min(100,(state.mealLeft/70)*100));
 for(const c of state.cards.values()){
  if(!isWorker(c.type))continue;
  c.el.classList.toggle('starving',state.starving);
  c.el.classList.toggle('food-empty',!state.starving&&noFood);
  const bar=c.el.querySelector('.hungerMeter i');
  if(bar)bar.style.width=(state.starving?starvePct:mealPct)+'%';
  const label=c.el.querySelector('.hungerLabel');
  if(label)label.textContent=state.starving?'굶주림 '+Math.ceil(starvePct)+'%':(noFood?'식량 없음 '+state.mealLeft+'초':'');
 }
}
function renderLife(){
 const vals=['hunt','farm','fish','herd'].map(k=>state.lifestyle[k]),max=Math.max(0,...vals);
 for(const k of ['hunt','farm','fish','herd']){
  const v=state.lifestyle[k];ui.values[k].textContent=v;
  document.querySelector('[data-life="'+k+'"]')?.classList.toggle('leading',v>0&&v===max);
 }
}
function renderDiscoveries(){
 const list=[...state.discoveries];ui.discoveryCount.textContent=list.length;
 ui.discoveries.innerHTML=list.length?list.slice(-30).map(x=>'<span class="discovery">'+x+'</span>').join(''):'<span class="discovery">아직 발견한 기술이 없습니다.</span>';
}
function has(t){return [...state.cards.values()].some(c=>c.type===t);}
function renderQuests(){
 const q=[
  ['불을 안정적으로 피운다',has('campfire')],
  ['사슴을 잡아 가죽·뼈를 얻는다',state.discoveries.has('큰 사냥')],
  ['섬유를 꼬아 끈·실·직물을 만든다',has('wovenCloth')||has('wovenClothing')],
  ['생가죽을 긁개로 손질한다',has('dressedHide')||has('leatherClothing')||has('hideTent')],
  ['간돌도끼 같은 간석기를 만든다',has('groundAxe')],
  ['빗살무늬토기를 굽는다',has('combPottery')||has('storageJars')],
  ['농장·어장·목장·양식장 중 하나를 성장시킨다',has('milletFarm')||has('broomcornFarm')||has('beanFarm')||has('fishingGround')||has('netFishery')||has('trapFishery')||has('goatRanch')||has('fishPond')],
  ['정착도 9 이상',settlementScore()>=9]
 ];
 ui.questList.innerHTML=q.map(x=>'<div class="quest '+(x[1]?'done':'')+'"><i>'+(x[1]?'✓':'·')+'</i><span>'+x[0]+'</span></div>').join('');
}
function renderGoal(){
 const score=settlementScore();
 if(!has('campfire')){ui.goalTitle.textContent='첫 생활 기술 만들기';ui.goalText.textContent='작은 나무에서 나뭇가지를 모으고 돌을 다듬어 기본 도구를 만드세요.';ui.hint.textContent='사람+작은 나무 → 나뭇가지 · 돌×2 → 찍개 · 찍개+나뭇가지 → 돌도끼';return;}
 if(!has('groundAxe')&&!has('combPottery')&&!has('wovenCloth')){ui.goalTitle.textContent='생활 기술 넓히기';ui.goalText.textContent='가죽, 간석기, 토기, 방직 중 원하는 방향부터 발전시키세요.';ui.hint.textContent='돌 + 강가 → 간 돌 · 점토+돌 → 가락바퀴 · 도토리+갈돌·갈판 → 간 도토리';return;}
 if(score<9){ui.goalTitle.textContent='정착지를 키우기';ui.goalText.textContent='잡곡 농경, 사냥, 갯벌·강 어로, 목축, 방직을 서로 섞어도 됩니다.';ui.hint.textContent='조·기장·콩밭×3 → 농장 · 낚시 자리×3 → 낚시터 · 염소 우리×3 → 목장';return;}
 ui.goalTitle.textContent='나만의 석기 사회';ui.goalText.textContent='이미 안정적인 정착지입니다. 다른 생산 방식과 생활 기술도 계속 연결해 보세요.';ui.hint.textContent='가락바퀴·직물옷·돌화덕·점토 가마·도토리죽·갯벌·잡곡 농장까지 모두 열어볼 수 있어요.';
}

let toastTimer;
function showToast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2100);}
function closeLayer(id){$('#'+id)?.classList.add('hidden');}
async function startBgm(){
 try{
  if(bgmHandle||window.KidscadeAudio?.getSettings?.().muted)return;
  window.KidscadeAudio?.preload?.(['music.korea_welcome','ui.confirm'])?.catch?.(()=>{});
  const result=await window.KidscadeAudio?.play?.('music.korea_welcome',{loop:true,volume:.075,cooldownMs:500});
  if(result?.ok)bgmHandle=result;
 }catch(_){}
}
function stopBgm(){try{bgmHandle?.stop?.()}catch(_){}bgmHandle=null;}
function start(){$('#startLayer').classList.add('hidden');reset();startBgm();try{window.KidscadeGame?.start?.()}catch(_){}}

$('#startBtn').addEventListener('click',start);
$('#retryBtn').addEventListener('click',reset);
$('#restartBtn').addEventListener('click',reset);
$('#continueBtn').addEventListener('click',()=>$('#milestoneLayer').classList.add('hidden'));
$('#exploreBtn').addEventListener('click',explore);
$('#tidyBtn').addEventListener('click',tidy);
function closeHudPopovers(){
 ui.goalPopover.classList.add('hidden');ui.discoverPopover.classList.add('hidden');
 ui.goalBtn.classList.remove('active');ui.discoverBtn.classList.remove('active');
}
function toggleHudPopover(which){
 const pop=which==='goal'?ui.goalPopover:ui.discoverPopover,btn=which==='goal'?ui.goalBtn:ui.discoverBtn;
 const willOpen=pop.classList.contains('hidden');closeHudPopovers();
 if(willOpen){pop.classList.remove('hidden');btn.classList.add('active');}
}
ui.goalBtn.addEventListener('click',()=>toggleHudPopover('goal'));
ui.discoverBtn.addEventListener('click',()=>toggleHudPopover('discover'));
$('#helpBtn').addEventListener('click',()=>{closeHudPopovers();$('#helpLayer').classList.remove('hidden');});
document.querySelectorAll('[data-close-popover]').forEach(b=>b.addEventListener('click',()=>closeHudPopovers()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeLayer(b.dataset.close)));
board.addEventListener('pointerdown',e=>{if(e.target===board)closeHudPopovers();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopBgm();else if(state.started&&!state.over)startBgm();});
window.addEventListener('pagehide',stopBgm);
window.addEventListener('beforeunload',stopBgm);
window.addEventListener('resize',()=>{for(const c of state.cards.values())place(c,clamp(c.x,4,Math.max(4,board.clientWidth-c.el.offsetWidth-12)),clamp(c.y,18,Math.max(18,board.clientHeight-c.el.offsetHeight-12)));});
})();