(()=>{
'use strict';

const C=document.getElementById('game'),ctx=C.getContext('2d');
const $=id=>document.getElementById(id);
const U='../../assets/game/2d/underwater/underwater-diving/';
const F='../../assets/game/2d/fish/';
const P='../../assets/game/2d/pirate/';
const SHARK='../../assets/game/2d/underwater/deep-diver/creatures/shark/';
const FAUNA='../../assets/game/2d/underwater/deep-diver/creatures/';
const GEN_FAUNA=FAUNA+'generated/';
const PICKUP='../../assets/game/2d/underwater/deep-diver/pickups/icons_128/';
const VEG='../../assets/game/2d/underwater/deep-diver/vegetation/';
const AMBIENCE_SRC='../../assets/audio/incoming/newmusical/dragon-studio-underwater-ambience-376890.mp3';
const SAVE='deep_diver_2d_v7',OLD='deep_diver_2d_v5',LEGACY='deep_diver_openwater_v4';
const WORLD={w:6800,h:6500,surface:60,scaleDepth:5.5};
const ZONES=[
 {id:'reef',name:'산호 정원',tag:'햇빛·산호 절벽·얕은 수로',y0:60,y1:720,bg0:'#58c9d0',bg1:'#087792',accent:'#ffd36a'},
 {id:'kelp',name:'해초 숲',tag:'거대한 해초·강한 조류·숨은 통로',y0:720,y1:1500,bg0:'#198b79',bg1:'#07545c',accent:'#6bd88a'},
 {id:'ruins',name:'침수 유적',tag:'석조 회랑·붕괴된 광장·깊은 우물',y0:1500,y1:2350,bg0:'#315f70',bg1:'#17394f',accent:'#c5b78d'},
 {id:'wreck',name:'난파선 지대',tag:'선체 잔해·기뢰 골목·화물 구역',y0:2350,y1:3250,bg0:'#244b5a',bg1:'#102b3e',accent:'#db8b62'},
 {id:'abyss',name:'암흑 심해',tag:'무광층·열수 계곡·포식자 영역',y0:3250,y1:4200,bg0:'#111c35',bg1:'#030713',accent:'#79e9ff'},
 {id:'hadal',name:'영구 암흑 해구',tag:'고래 낙하·심해 크레바스·열수 분출·해저 화산',y0:4200,y1:6500,bg0:'#050817',bg1:'#000104',accent:'#8e8cff'}
];
const SUBZONES=[
 {id:'reefShelf',zone:'reef',name:'산호 선반',y0:60,y1:300},
 {id:'reefMaze',zone:'reef',name:'산호 미로',y0:300,y1:520},
 {id:'blueDrop',zone:'reef',name:'푸른 낙차',y0:520,y1:720},
 {id:'kelpEdge',zone:'kelp',name:'해초 초입',y0:720,y1:960},
 {id:'kelpCathedral',zone:'kelp',name:'해초 대성당',y0:960,y1:1260},
 {id:'currentCut',zone:'kelp',name:'조류 협곡',y0:1260,y1:1500},
 {id:'ruinGate',zone:'ruins',name:'가라앉은 문',y0:1500,y1:1760},
 {id:'ruinCourt',zone:'ruins',name:'침수 광장',y0:1760,y1:2070},
 {id:'ruinWell',zone:'ruins',name:'고대 수직 우물',y0:2070,y1:2350},
 {id:'wreckOuter',zone:'wreck',name:'잔해 외곽',y0:2350,y1:2620},
 {id:'mineLane',zone:'wreck',name:'기뢰 골목',y0:2620,y1:2940},
 {id:'cargoGrave',zone:'wreck',name:'화물선 무덤',y0:2940,y1:3250},
 {id:'blackwater',zone:'abyss',name:'무광 수역',y0:3250,y1:3500},
 {id:'ventValley',zone:'abyss',name:'열수 계곡',y0:3500,y1:3840},
 {id:'predatorTrench',zone:'abyss',name:'포식자 해구',y0:3840,y1:4200},
 {id:'whaleFall',zone:'hadal',name:'고래 낙하 지대',y0:4200,y1:4850},
 {id:'riftAbyss',zone:'hadal',name:'심해 크레바스',y0:4850,y1:5650},
 {id:'volcanoCaldera',zone:'hadal',name:'해저 화산 분화구',y0:5650,y1:6500}
];
const subzoneForY=y=>SUBZONES.find(z=>y>=z.y0&&y<z.y1)||SUBZONES[SUBZONES.length-1];
const SUBZONE_RULES={
 reefShelf:{short:'햇빛층 · 사진↑ 산소↓',tip:'햇빛이 강한 산호 선반 · 사진 연구 +15% · 산소 소모 -8%',oxygen:.92,photo:1.15},
 reefMaze:{short:'산호 가시 · 갯가재',tip:'좁은 산호 미로 · 빠르게 벽에 스치면 피해 · 공작갯가재 영역',terrainHazard:'coral'},
 blueDrop:{short:'하강류 · 희귀사진↑',tip:'푸른 낙차 · 아래로 끌어당기는 하강류 · 희귀 생물 사진 +20%',vertical:44,rarePhoto:1.20},
 kelpEdge:{short:'해초 저항 · 속도↓',tip:'해초 초입 · 빽빽한 잎이 추진을 방해해 이동 속도 -10%',speed:.90},
 kelpCathedral:{short:'해초 은폐 · 감지↓',tip:'해초 대성당 · 소나를 끄면 해초가 몸을 가려 포식자 감지거리 -38%',stealth:.62},
 currentCut:{short:'폭발 조류',tip:'조류 협곡 · 일정 주기로 강한 횡조류가 통로를 휩쓸어갑니다.',surge:true},
 ruinGate:{short:'퇴적층 · 대시 주의',tip:'가라앉은 문 · 대시하면 퇴적물이 일어나 시야가 잠시 흐려집니다.',dashSilt:true},
 ruinCourt:{short:'석조 공명 · 소나↑',tip:'침수 광장 · 석조 공명 덕분에 소나 재충전 속도 +55%',sonarRecharge:1.55},
 ruinWell:{short:'수직류 · 산소↑',tip:'고대 수직 우물 · 아래로 흐르는 수직류와 답답한 수로로 산소 소모 +12%',vertical:55,oxygen:1.12},
 wreckOuter:{short:'날카로운 잔해',tip:'잔해 외곽 · 빠른 속도로 선체 잔해와 충돌하면 장비가 손상됩니다.',terrainHazard:'debris'},
 mineLane:{short:'자기 기뢰',tip:'기뢰 골목 · 가까워진 기뢰가 잠수 장비 쪽으로 조금씩 끌려옵니다.',magneticMines:true},
 cargoGrave:{short:'고가 화물',tip:'화물선 무덤 · 무거운 밀봉 화물 상자가 흩어져 있습니다. 욕심낼수록 귀환이 어려워집니다.',salvage:true},
 blackwater:{short:'완전 암흑 · 촬영↓',tip:'무광 수역 · 소나가 꺼져 있으면 시야와 촬영 등급이 크게 불리합니다.',blackwater:true,photoPenalty:.14},
 ventValley:{short:'열수 상승류 · 광물',tip:'열수 계곡 · 분출은 위험하지만 상승류를 타고 빠르게 위로 빠져나갈 수 있고 희귀 광물이 있습니다.',thermal:true},
 predatorTrench:{short:'포식자 해구 · 소나 위험',tip:'포식자 해구 · 사진 연구 +35% · 소나 펄스는 주변 포식자를 끌어들입니다.',photo:1.35,sonarAggro:true,predatorAggro:1.28},
 whaleFall:{short:'영구 암흑 · 고래 낙하',tip:'햇빛이 완전히 사라진 고래 낙하 지대 · 사체 주변에 대왕등각류와 청소생물이 몰려듭니다.',blackwater:true,photoPenalty:.20,photo:1.48,oxygen:1.12,whaleFall:true},
 riftAbyss:{short:'크레바스 · 하강류',tip:'거대한 심해 균열 · 중앙부의 하강류가 잠수부를 틈 아래로 끌어당깁니다.',blackwater:true,photoPenalty:.22,photo:1.55,oxygen:1.18,riftPull:true},
 volcanoCaldera:{short:'해저 화산 · 열수 폭발',tip:'해저 화산 분화구 · 열수 기둥과 화산성 가스가 반복적으로 분출합니다.',blackwater:true,photoPenalty:.24,photo:1.68,oxygen:1.24,thermal:true,volcano:true,sonarAggro:true,predatorAggro:1.35}
};
const subRuleForY=y=>SUBZONE_RULES[subzoneForY(y).id]||{};
const FREE_DIVE={id:'free',title:'자유 잠수',desc:'의뢰 없이 원하는 곳을 탐사하고 식재료를 모은 뒤 배로 돌아오세요.',reward:0,unlock:0,target:'free',recommended:0};
const CONTRACTS=[
 {id:'reef',title:'01 · 산호초 생태 조사',desc:'청색 암초어·주황 산호어·분홍 산호어를 각각 B등급 이상 촬영하고 산호 미로를 지나세요.',reward:1100,unlock:0,target:'reef',recommended:150},
 {id:'kelp',title:'02 · 해초 숲 표본 조사',desc:'희귀 회색 긴꼬리어를 A등급 이상 촬영하고 식재료 표본 2개를 확보한 뒤 조류 협곡을 통과하세요.',reward:1800,unlock:1,target:'kelp',recommended:285},
 {id:'ruins',title:'03 · 침수 유적 기록',desc:'침수 석상과 아치를 기록하고 고대 표식판을 회수하세요.',reward:2700,unlock:2,target:'ruins',recommended:430},
 {id:'wreck',title:'04 · 난파선 기록 장치',desc:'기뢰 골목을 지나 침몰선의 항해기록 장치를 회수하세요.',reward:3900,unlock:3,target:'wreck',recommended:575},
 {id:'abyss',title:'05 · 심해 생물 조사',desc:'600m 아래 포식자 해구에서 대형 심해 상어를 A등급 이상 촬영하세요.',reward:5600,unlock:4,target:'abyss',recommended:760},
 {id:'hadal',title:'06 · 영구 암흑 해구 조사',desc:'고래 낙하 지대·심해 크레바스·해저 화산 분화구를 모두 통과하고 심해 아귀나 대왕등각류를 A등급 이상 촬영하세요.',reward:8200,unlock:5,target:'hadal',recommended:2200}
];
const DAILY_TASKS=[
 {id:'reefPhotos',title:'오늘의 사진 기록',desc:'서로 다른 생물 2종을 B등급 이상 촬영하세요.',reward:650,unlock:0,type:'photos',goal:2,grade:'B'},
 {id:'catchWeight',title:'오늘의 식재료 조달',desc:'먹을 수 있는 생물을 합계 1.5kg 이상 확보하세요.',reward:720,unlock:0,type:'weight',goal:1.5},
 {id:'seaGreens',title:'오늘의 해조 채집',desc:'미역·다시마·붉은 해조·바다상추 중 2개를 채집하세요.',reward:820,unlock:1,type:'groupCount',keys:['seaweed','kelp','redAlgae','seaLettuce'],goal:2},
 {id:'mackerelRun',title:'고등어 납품',desc:'고등어 2마리를 가져오세요.',reward:980,unlock:1,type:'count',key:'mackerel',goal:2},
 {id:'qualityPhoto',title:'연구소 고화질 요청',desc:'A등급 이상 생물 사진을 2종 촬영하세요.',reward:1150,unlock:2,type:'photos',goal:2,grade:'A'},
 {id:'depthRun',title:'심도 기록 보조',desc:'350m 이상 내려갔다 안전하게 귀환하세요.',reward:1300,unlock:2,type:'depth',goal:350}
];
function dailyTaskForDay(day=1){
 const eligible=DAILY_TASKS.filter(t=>(t.unlock||0)<=meta.unlocked);return eligible[(Math.max(1,day)-1)%Math.max(1,eligible.length)]||DAILY_TASKS[0]
}
function dailyTaskProgress(task,worldRef=world){
 if(!task||!worldRef)return 0;
 if(task.type==='weight')return worldRef.catchWeight||0;
 if(task.type==='count')return worldRef.catchCounts?.[task.key]||0;
 if(task.type==='groupCount')return (task.keys||[]).reduce((n,k)=>n+(worldRef.catchCounts?.[k]||0),0);
 if(task.type==='depth')return worldRef.maxDepth||0;
 if(task.type==='photos')return Object.values(worldRef.mission?.photoGrades||{}).filter(g=>gradeAtLeast(g,task.grade||'B')).length;
 return 0
}
function dailyTaskComplete(task,worldRef=world){return dailyTaskProgress(task,worldRef)>=(task?.goal||1)}
function dailyTaskProgressText(task,worldRef=world){
 const value=dailyTaskProgress(task,worldRef),goal=task?.goal||1;
 if(task?.type==='weight')return value.toFixed(1)+' / '+goal.toFixed(1)+'kg';
 if(task?.type==='depth')return Math.round(value)+' / '+goal+'m';
 return Math.min(goal,Math.floor(value))+' / '+goal
}

const UPGRADES={
 oxygen:{name:'산소통',desc:'최대 산소 +15초',base:900,max:5},
 fins:{name:'추진 핀',desc:'수영 속도 +6.5%',base:850,max:5},
 bag:{name:'인양 케이스',desc:'유물·광물 회수 무게 +3kg',base:800,max:5},
 catchCap:{name:'선상 냉장 어획함',desc:'하루 어획 가능 중량을 크게 늘립니다.',base:1050,max:5},
 slots:{name:'채집 장비 랙',desc:'출항 때 빌려갈 채집 장비 슬롯 +1',base:2300,max:2},
 camera:{name:'카메라 렌즈',desc:'촬영 판정 거리 증가',base:1100,max:4},
 harpoon:{name:'작살 릴',desc:'작살 사거리·릴 회수력 증가',base:1000,max:4},
 sonar:{name:'소나',desc:'쿨다운 감소',base:1100,max:4},
 suit:{name:'잠수복',desc:'충격 피해 감소 · 안전 잠수 수심 대폭 증가',base:1200,max:5},
 buoyancy:{name:'부력 조절기',desc:'상승 속도 증가 · 상승 중 산소 소모 감소',base:1350,max:4}
};
const SHOP_UPGRADES={
 seats:{name:'손님 좌석',desc:'동시에 받을 수 있는 손님 +1',base:1800,max:2},
 stove:{name:'화구',desc:'굽기 타이밍 구간이 넓어지고 불 조절이 쉬워집니다.',base:1600,max:3},
 prep:{name:'손질대',desc:'손질 타이밍 구간이 넓어지고 칼질 속도가 안정됩니다.',base:1450,max:3},
 fridge:{name:'업소용 냉장고',desc:'손님 인내심 증가 · 식재료 보관 능력 강화',base:1700,max:3},
 tray:{name:'서빙 트레이',desc:'연속 서빙 보너스와 빠른 서빙 보상 증가',base:1250,max:3},
 menu:{name:'메뉴판',desc:'메뉴 판매가 상승',base:1550,max:3},
 helper:{name:'보조 직원',desc:'손님의 기다림 감소 속도를 늦춰 줍니다.',base:2600,max:3}
};
const GEAR_DEFS={
 harpoon:{name:'작살',icon:'🎯',asset:'pickupFishingrod',desc:'중형·대형 어류 전용. 빠르고 힘센 생물을 명중시켜 릴로 끌어옵니다.'},
 net:{name:'그물',icon:'🕸️',asset:'pickupBucket',desc:'소형 떼물고기와 작은 두족류 전용. 등급이 오르면 중형 생물까지 감당합니다.'},
 gloves:{name:'철제 장갑',icon:'🧤',asset:'pickupBucket',desc:'게·성게·패류·저서생물을 가까이에서 안전하게 채집합니다.'},
 knife:{name:'채집칼',icon:'🔪',asset:'pickupKey',desc:'미역·다시마·붉은 해조처럼 부착된 식재료를 베어 채집합니다.'},
 trap:{name:'통발',icon:'🪤',asset:'pickupBucket',desc:'갑각류·두족류가 지나는 길목에 설치하는 기다림형 장비입니다.'}
};
const GEAR_TIER_NAMES=['','초록','파랑','보라','주황'];
const GEAR_TIER_COLORS=['','#68d391','#63b3ed','#b794f4','#f6ad55'];
const CATCH_CAP_LEVELS=[4,7,11,16,22,30];
const HARVEST_DEFS={
 seaweed:{name:'미역',img:'seaweedGreenC',weight:.30,value:140,method:'knife',difficulty:1,draw:[30,54],zones:['reef','kelp']},
 kelp:{name:'다시마',img:'waterPlant2',weight:.55,value:210,method:'knife',difficulty:2,draw:[38,72],zones:['kelp','ruins']},
 redAlgae:{name:'붉은 해조',img:'seaweedPinkD',weight:.25,value:260,method:'knife',difficulty:3,draw:[32,58],zones:['reef','ruins','wreck']},
 seaLettuce:{name:'바다상추',img:'grassClump',weight:.20,value:110,method:'knife',difficulty:1,draw:[36,32],zones:['reef','kelp']},
 mussel:{name:'홍합',img:'pickupSeashell',weight:.40,value:220,method:'gloves',difficulty:2,draw:[30,30],zones:['reef','ruins','wreck']}
};
const ASSETS={
 playerIdle:U+'player/player-idle.png',playerSwim:U+'player/player-swiming.png',playerFast:U+'player/player-fast.png',playerRush:U+'player/player-rush.png',playerHurt:U+'player/player-hurt.png',
 fishAnim:U+'enemies/fish.png',fishDart:U+'enemies/fish-dart.png',fishBig:U+'enemies/fish-big.png',shark:SHARK+'shark-swim-atlas.png',
 mineS:U+'enemies/mine-small.png',mine:U+'enemies/mine.png',mineB:U+'enemies/mine-big.png',
 bg:U+'environment/background.png',mid:U+'environment/midground.png',props:U+'environment/props.png',tiles:U+'environment/tiles.png',
 bubbles:U+'fx/bubbles.png',explosion:U+'fx/explosion.png',explosionB:U+'fx/explosion-big.png',
 blue:F+'fish_blue.png',orange:F+'fish_orange.png',green:F+'fish_green.png',grey:F+'fish_grey.png',greyLong:F+'fish_grey_long_a.png',red:F+'fish_red.png',pink:F+'fish_pink.png',brown:F+'fish_brown.png',
 rockA:F+'rock_a.png',rockB:F+'rock_b.png',
 bgRockA:F+'background_rock_a.png',bgRockB:F+'background_rock_b.png',
 bgSeaA:F+'background_seaweed_a.png',bgSeaB:F+'background_seaweed_b.png',bgSeaC:F+'background_seaweed_c.png',bgSeaD:F+'background_seaweed_d.png',bgSeaE:F+'background_seaweed_e.png',bgSeaF:F+'background_seaweed_f.png',bgSeaG:F+'background_seaweed_g.png',bgSeaH:F+'background_seaweed_h.png',
 seaweedA:F+'seaweed_green_a.png',seaweedGreenB:F+'seaweed_green_b.png',seaweedGreenC:F+'seaweed_green_c.png',seaweedGreenD:F+'seaweed_green_d.png',
 seaweedB:F+'seaweed_pink_a.png',seaweedPinkB:F+'seaweed_pink_b.png',seaweedPinkC:F+'seaweed_pink_c.png',seaweedPinkD:F+'seaweed_pink_d.png',
 seaweedOrangeA:F+'seaweed_orange_a.png',seaweedOrangeB:F+'seaweed_orange_b.png',
 grassA:F+'seaweed_grass_a.png',grassB:F+'seaweed_grass_b.png',sand:F+'terrain_sand_top_a.png',dirt:F+'terrain_dirt_top_a.png',
 crab1:FAUNA+'crustaceans/crab/frames/crab-walk-01.png',crab2:FAUNA+'crustaceans/crab/frames/crab-walk-02.png',
 mantis:FAUNA+'crustaceans/mantis-shrimp/mantis-shrimp-2x.png',
 urchin:FAUNA+'echinoderms/purple-sea-urchin.png',ochreStar:FAUNA+'echinoderms/ochre-sea-star.png',crownStar:FAUNA+'echinoderms/crown-of-thorns-starfish.png',
 nautilus:FAUNA+'mollusks/nautilus/nautilus.png',squid:FAUNA+'cephalopods/squid/squid-sprites.png',kraken:FAUNA+'cephalopods/kraken/kraken-anim.gif',
 jelly01:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-01.png',jelly02:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-02.png',jelly03:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-03.png',jelly04:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-04.png',jelly05:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-05.png',jelly06:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-06.png',jelly07:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-07.png',jelly08:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-08.png',jelly09:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-09.png',jelly10:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-10.png',jelly11:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-11.png',jelly12:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-12.png',
 jellyAtk01:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-01.png',jellyAtk02:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-02.png',jellyAtk03:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-03.png',jellyAtk04:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-04.png',jellyAtk05:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-05.png',jellyAtk06:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-06.png',jellyAtk07:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-07.png',jellyAtk08:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-08.png',jellyAtk09:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-09.png',jellyAtk10:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-10.png',jellyAtk11:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-11.png',jellyAtk12:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-12.png',
 whale:FAUNA+'megafauna/whale/whale.png',vaquita:FAUNA+'megafauna/vaquita/vaquita-porpoise.png',shark2:SHARK+'shark-swim-atlas.png',
 genBarracuda:GEN_FAUNA+'fish/barracuda.png',genBream:GEN_FAUNA+'fish/sea-bream.png',genLionfish:GEN_FAUNA+'fish/lionfish.png',genMoray:GEN_FAUNA+'fish/moray-eel.png',genPuffer:GEN_FAUNA+'fish/pufferfish.png',genSeahorse:GEN_FAUNA+'fish/seahorse.png',genCoelacanth:GEN_FAUNA+'fish/coelacanth.png',
 genDeepAngler:GEN_FAUNA+'fish/deepsea anglerfish.png',genFlounder:GEN_FAUNA+'fish/flounder.png',genLanternfish:GEN_FAUNA+'fish/lanternfish.png',genMackerel:GEN_FAUNA+'fish/mackerel.png',genShrimp:GEN_FAUNA+'fish/shrimp.png',genSlipperLobster:GEN_FAUNA+'fish/slippler lobster.png',genSwordfish:GEN_FAUNA+'fish/sword fish.png',genTriggerfish:GEN_FAUNA+'fish/titan triggerfish.png',genYellowfin:GEN_FAUNA+'fish/yellow tuna.png',
 genManta:GEN_FAUNA+'rays/manta-ray.png',genSkate:GEN_FAUNA+'rays/skate.png',genCuttlefish:GEN_FAUNA+'cephalopods/cuttlefish.png',genOctopus:GEN_FAUNA+'cephalopods/octopus.png',
 genIsopod:GEN_FAUNA+'crustaceans/giant-isopod.png',genHermit:GEN_FAUNA+'crustaceans/hermit-crab.png',genMoonJelly:GEN_FAUNA+'cnidarians/jellyfish.png',genScallop:GEN_FAUNA+'mollusks/scallop.png',genSeaCucumber:GEN_FAUNA+'echinoderms/sea-cucumber.png',genStarfish:GEN_FAUNA+'echinoderms/starfish.png',
 waterPlant2:VEG+'water-plant-02.png',grassClump:VEG+'grass-clump-01.png',
 pickupBucket:PICKUP+'bucket.png',pickupFishingrod:PICKUP+'fishingrod.png',pickupGold:PICKUP+'gold.png',pickupKey:PICKUP+'key.png',
 pickupRuby:PICKUP+'ruby.png',pickupSaphire:PICKUP+'saphire.png',pickupSeashell:PICKUP+'seashell.png',pickupSilvercup:PICKUP+'silvercup.png',
 pickupSilverplate:PICKUP+'silverplate.png',pickupTelescope:PICKUP+'telescope.png',pickupTincan:PICKUP+'tincan.png',pickupTrout:PICKUP+'trout.png',
 wreck:P+'ships/ship-8.png',wood1:P+'ship-parts/wood-1.png',wood2:P+'ship-parts/wood-2.png'
};
const imgs={}; let ready=false,loaded=0;
for(const [k,src] of Object.entries(ASSETS)){const im=new Image();imgs[k]=im;im.onload=im.onerror=()=>{loaded++;if(loaded===Object.keys(ASSETS).length){ready=true;updateStartButtons()}};im.src=src}

const SPECIES={
 blue:{name:'청색 암초어',img:'blue',depth:[5,110],weight:1.2,value:160,protected:false,rare:false,behavior:'school',speed:44,catchMethods:['net'],catchDifficulty:1},
 orange:{name:'주황 산호어',img:'orange',depth:[8,115],weight:1.0,value:150,protected:false,rare:false,behavior:'school',speed:40,catchMethods:['net'],catchDifficulty:1},
 pink:{name:'분홍 산호어',img:'pink',depth:[12,120],weight:1.1,value:175,protected:false,rare:false,behavior:'school',speed:42,catchMethods:['net'],catchDifficulty:1},
 green:{name:'초록 암초어',img:'green',depth:[55,255],weight:1.3,value:180,protected:false,rare:false,behavior:'flee',speed:48,catchMethods:['net'],catchDifficulty:2},
 red:{name:'붉은 해초어',img:'red',depth:[120,265],weight:1.4,value:220,protected:false,rare:false,behavior:'flee',speed:55,catchMethods:['net'],catchDifficulty:2},
 grey:{name:'회색 암초어',img:'grey',depth:[105,330],weight:1.5,value:210,protected:false,rare:false,behavior:'flee',speed:46,catchMethods:['net'],catchDifficulty:2},
 long:{name:'회색 긴꼬리어',img:'greyLong',depth:[165,300],weight:1.8,value:330,protected:true,rare:true,behavior:'skittish',speed:70},
 brown:{name:'갈색 난파어',img:'brown',depth:[280,585],weight:1.7,value:280,protected:false,rare:false,behavior:'territorial',speed:60,damage:8,catchMethods:['harpoon'],catchDifficulty:2},
 dart:{name:'빠른 심해어',img:'fishDart',animated:true,fw:39,fh:20,frames:4,depth:[245,720],weight:1.6,value:360,protected:false,rare:true,behavior:'territorial',speed:92,damage:10,catchMethods:['harpoon'],catchDifficulty:3},
 hunter:{name:'큰이빨 포식어',img:'fishBig',animated:true,fw:48,fh:32,frames:4,depth:[300,750],weight:2.8,value:610,protected:false,rare:true,behavior:'predator',speed:112,damage:14,catchMethods:['harpoon'],catchDifficulty:4},
 angler:{name:'심해 아귀',img:'genDeepAngler',stripFrames:4,stripFps:4,depth:[430,2700],weight:2.4,value:760,protected:false,rare:true,behavior:'ambush',speed:86,damage:15,draw:[104,60],catchMethods:['harpoon'],catchDifficulty:4},
 giant:{name:'대형 심해 상어',img:'shark',animated:true,fw:32,fh:32,frames:8,depth:[600,755],weight:0,value:0,protected:true,rare:true,behavior:'predator',speed:128,damage:24},
 crab:{name:'바위게',img:'crab1',depth:[8,360],weight:.8,value:240,protected:false,rare:false,behavior:'crawler',motion:'crawler',speed:24,draw:[54,54],catchMethods:['gloves','trap'],catchDifficulty:2},
 mantis:{name:'공작갯가재',img:'mantis',depth:[45,160],weight:0,value:0,protected:true,rare:true,behavior:'territorial',motion:'crawlerBoss',speed:58,damage:19,draw:[112,64]},
 urchin:{name:'보라성게',img:'urchin',depth:[5,260],weight:.4,value:320,protected:false,rare:false,behavior:'sessile',motion:'sessile',speed:0,draw:[30,30],catchMethods:['gloves'],catchDifficulty:2},
 ochreStar:{name:'황토불가사리',img:'ochreStar',depth:[5,220],weight:0,value:0,protected:true,rare:false,behavior:'sessile',motion:'sessile',speed:0,draw:[31,31]},
 crownStar:{name:'가시왕관불가사리',img:'crownStar',depth:[20,180],weight:0,value:0,protected:true,rare:true,behavior:'sessile',motion:'sessile',speed:0,draw:[34,34]},
 nautilus:{name:'앵무조개',img:'nautilus',depth:[115,390],weight:0,value:0,protected:true,rare:true,behavior:'drifter',motion:'drifter',speed:31,draw:[63,41]},
 squid:{name:'심해 오징어',img:'squid',depth:[210,1800],weight:2.2,value:620,protected:false,rare:true,behavior:'skittish',motion:'jet',speed:88,draw:[82,60],catchMethods:['net','trap'],catchDifficulty:3},
 jelly:{name:'푸른 해파리',img:'jelly01',depth:[90,610],weight:0,value:0,protected:true,rare:false,behavior:'drifter',motion:'jelly',speed:22,damage:7,draw:[58,58]},
 whale:{name:'대형 고래',img:'whale',depth:[45,310],weight:0,value:0,protected:true,rare:true,behavior:'megafauna',motion:'megafauna',speed:30,draw:[280,150],spriteFacing:'left'},
 vaquita:{name:'바키타',img:'vaquita',depth:[15,160],weight:0,value:0,protected:true,rare:true,behavior:'megafauna',motion:'megafauna',speed:54,draw:[170,78],spriteFacing:'left'},
 shark2:{name:'회유성 상어',img:'shark2',animated:true,fw:32,fh:32,frames:8,depth:[250,1500],weight:0,value:0,protected:true,rare:true,behavior:'predator',motion:'swimmer',speed:118,damage:16,draw:[88,58]},
 barracuda:{name:'바라쿠다',img:'genBarracuda',stripFrames:4,stripFps:7,depth:[35,390],weight:3.4,value:720,protected:false,rare:false,behavior:'predator',speed:124,damage:13,draw:[108,46],catchMethods:['harpoon'],catchDifficulty:4},
 giantIsopod:{name:'대왕등각류',img:'genIsopod',stripFrames:4,stripFps:4,depth:[500,2700],weight:0,value:0,protected:true,rare:true,behavior:'crawler',motion:'crawler',speed:13,draw:[82,48]},
 bream:{name:'도미',img:'genBream',stripFrames:4,stripFps:6,depth:[8,210],weight:1.5,value:260,protected:false,rare:false,behavior:'school',speed:48,draw:[72,50],catchMethods:['net'],catchDifficulty:2},
 cuttlefish:{name:'갑오징어',img:'genCuttlefish',stripFrames:4,stripFps:6,depth:[55,430],weight:1.7,value:460,protected:false,rare:false,behavior:'skittish',motion:'jet',speed:76,draw:[78,54],catchMethods:['net','trap'],catchDifficulty:3},
 hermitCrab:{name:'소라게',img:'genHermit',stripFrames:4,stripFps:4,depth:[5,260],weight:.45,value:180,protected:false,rare:false,behavior:'crawler',motion:'crawler',speed:16,draw:[58,46],catchMethods:['gloves','trap'],catchDifficulty:1},
 moonJelly:{name:'보름달해파리',img:'genMoonJelly',stripFrames:4,stripFps:6,depth:[80,540],weight:0,value:0,protected:true,rare:false,behavior:'drifter',motion:'jelly',speed:18,damage:5,draw:[60,64]},
 lionfish:{name:'쏠배감펭',img:'genLionfish',stripFrames:4,stripFps:5,depth:[20,280],weight:0,value:0,protected:true,rare:true,behavior:'territorial',speed:58,damage:10,draw:[82,58]},
 manta:{name:'대형 쥐가오리',img:'genManta',stripFrames:4,stripFps:5,depth:[70,520],weight:0,value:0,protected:true,rare:true,behavior:'megafauna',motion:'megafauna',speed:42,draw:[150,90]},
 moray:{name:'곰치',img:'genMoray',stripFrames:4,stripFps:6,depth:[45,430],weight:0,value:0,protected:true,rare:true,behavior:'ambush',speed:82,damage:12,draw:[112,44]},
 octopus:{name:'문어',img:'genOctopus',stripFrames:4,stripFps:6,depth:[35,470],weight:2.1,value:580,protected:false,rare:false,behavior:'skittish',motion:'jet',speed:70,draw:[80,64],catchMethods:['net','trap'],catchDifficulty:3},
 puffer:{name:'복어',img:'genPuffer',stripFrames:4,stripFps:5,depth:[8,260],weight:0,value:0,protected:true,rare:false,behavior:'flee',speed:43,draw:[58,52]},
 scallop:{name:'가리비',img:'genScallop',stripFrames:4,stripFps:4,depth:[8,300],weight:.45,value:270,protected:false,rare:false,behavior:'sessile',motion:'sessile',speed:0,draw:[44,36],catchMethods:['gloves'],catchDifficulty:1},
 seaCucumber:{name:'해삼',img:'genSeaCucumber',stripFrames:4,stripFps:3,depth:[20,520],weight:.65,value:310,protected:false,rare:false,behavior:'crawler',motion:'crawler',speed:8,draw:[64,34],catchMethods:['gloves'],catchDifficulty:2},
 seahorse:{name:'해마',img:'genSeahorse',stripFrames:4,stripFps:4,depth:[5,190],weight:0,value:0,protected:true,rare:true,behavior:'drifter',motion:'drifter',speed:18,draw:[40,60]},
 coelacanth:{name:'실러캔스',img:'genCoelacanth',stripFrames:4,stripFps:5,depth:[520,2400],weight:0,value:0,protected:true,rare:true,behavior:'drifter',motion:'drifter',speed:38,draw:[108,58]},
 skate:{name:'저서 가오리',img:'genSkate',stripFrames:4,stripFps:5,depth:[85,500],weight:0,value:0,protected:true,rare:false,behavior:'drifter',motion:'drifter',speed:34,draw:[96,64]},
 starfishStrip:{name:'별불가사리',img:'genStarfish',stripFrames:4,stripFps:3,depth:[5,260],weight:0,value:0,protected:true,rare:false,behavior:'sessile',motion:'sessile',speed:0,draw:[46,46]},
 mackerel:{name:'고등어',img:'genMackerel',stripFrames:4,stripFps:8,depth:[8,250],weight:1.1,value:230,protected:false,rare:false,behavior:'school',speed:74,draw:[88,46],catchMethods:['net'],catchDifficulty:2},
 yellowfin:{name:'황다랑어',img:'genYellowfin',stripFrames:4,stripFps:8,depth:[55,420],weight:5.6,value:1120,protected:false,rare:true,behavior:'skittish',speed:122,draw:[126,64],catchMethods:['harpoon'],catchDifficulty:4},
 swordfish:{name:'황새치',img:'genSwordfish',stripFrames:4,stripFps:9,depth:[90,520],weight:6.8,value:1480,protected:false,rare:true,behavior:'skittish',speed:138,draw:[142,60],catchMethods:['harpoon'],catchDifficulty:5},
 triggerfish:{name:'타이탄 트리거피시',img:'genTriggerfish',stripFrames:4,stripFps:6,depth:[12,245],weight:1.8,value:390,protected:false,rare:false,behavior:'territorial',speed:68,damage:9,draw:[94,60],catchMethods:['net','harpoon'],catchDifficulty:3},
 flounder:{name:'가자미',img:'genFlounder',stripFrames:4,stripFps:4,depth:[18,500],weight:1.4,value:310,protected:false,rare:false,behavior:'crawler',motion:'crawler',speed:12,draw:[94,52],catchMethods:['gloves','net'],catchDifficulty:2},
 shrimp:{name:'새우',img:'genShrimp',stripFrames:4,stripFps:7,depth:[8,360],weight:.25,value:150,protected:false,rare:false,behavior:'drifter',motion:'drifter',speed:32,draw:[86,48],catchMethods:['net','trap'],catchDifficulty:1},
 slipperLobster:{name:'부채새우',img:'genSlipperLobster',stripFrames:4,stripFps:4,depth:[80,560],weight:.85,value:430,protected:false,rare:true,behavior:'crawler',motion:'crawler',speed:10,draw:[96,46],catchMethods:['gloves','trap'],catchDifficulty:3},
 lanternfish:{name:'랜턴피시',img:'genLanternfish',stripFrames:4,stripFps:6,depth:[420,2700],weight:.35,value:210,protected:false,rare:false,behavior:'school',speed:42,draw:[78,48],catchMethods:['net'],catchDifficulty:2},
 kraken:{name:'심해 크라켄',img:'kraken',depth:[650,755],weight:0,value:0,protected:true,rare:true,behavior:'predator',motion:'boss',speed:76,damage:28,draw:[190,160]}
};
// Visual size normalization: the diver is drawn at 64px. These sizes intentionally compress
// real-world scale, but preserve a believable biological order instead of inheriting source-image size.
const CREATURE_VISUAL_PROFILE={
 blue:{draw:[44,28],variance:.06},orange:{draw:[42,27],variance:.06},pink:{draw:[43,27],variance:.06},
 green:{draw:[46,28],variance:.06},red:{draw:[48,30],variance:.06},grey:{draw:[48,30],variance:.06},
 long:{draw:[58,24],variance:.05},brown:{draw:[52,30],variance:.06},dart:{draw:[56,28],variance:.06},
 hunter:{draw:[72,40],variance:.05},angler:{draw:[54,34],variance:.04},giant:{draw:[154,76],variance:.025},
 crab:{draw:[34,30],variance:.05},mantis:{draw:[46,28],variance:.035},urchin:{draw:[22,22],variance:.04},
 ochreStar:{draw:[24,24],variance:.04},crownStar:{draw:[27,27],variance:.04},nautilus:{draw:[42,29],variance:.05},
 squid:{draw:[62,46],variance:.05},jelly:{draw:[46,46],variance:.05},whale:{draw:[270,92],variance:.02},
 vaquita:{draw:[126,56],variance:.025},shark2:{draw:[132,60],variance:.035},barracuda:{draw:[86,30],variance:.04},
 giantIsopod:{draw:[48,26],variance:.035},bream:{draw:[50,34],variance:.05},cuttlefish:{draw:[50,35],variance:.05},
 hermitCrab:{draw:[30,25],variance:.04},moonJelly:{draw:[46,48],variance:.05},lionfish:{draw:[50,35],variance:.05},
 manta:{draw:[154,84],variance:.025},moray:{draw:[78,28],variance:.04},octopus:{draw:[60,50],variance:.05},
 puffer:{draw:[38,34],variance:.05},scallop:{draw:[27,23],variance:.04},seaCucumber:{draw:[38,20],variance:.04},
 seahorse:{draw:[24,36],variance:.04},coelacanth:{draw:[98,46],variance:.035},skate:{draw:[78,48],variance:.04},
 starfishStrip:{draw:[26,26],variance:.04},mackerel:{draw:[52,24],variance:.05},yellowfin:{draw:[96,40],variance:.04},
 swordfish:{draw:[120,34],variance:.035},triggerfish:{draw:[58,36],variance:.05},flounder:{draw:[58,30],variance:.05},
 shrimp:{draw:[30,18],variance:.04},slipperLobster:{draw:[44,22],variance:.04},lanternfish:{draw:[34,18],variance:.04},
 kraken:{draw:[210,160],variance:.02}
};
function creatureVisualDraw(key){
 const p=CREATURE_VISUAL_PROFILE[key];
 return p?.draw||SPECIES[key]?.draw||[52,33]
}
function creatureVisualScale(key,rr){
 const v=CREATURE_VISUAL_PROFILE[key]?.variance??.06;
 return 1+(rr()-.5)*v*2
}
const CREATURE_SIZE_OVERRIDES={
 angler:'medium',squid:'medium',jelly:'medium',barracuda:'medium',cuttlefish:'medium',lionfish:'medium',moray:'medium',octopus:'medium',skate:'medium',triggerfish:'medium',
 yellowfin:'large',swordfish:'large',coelacanth:'large',shark2:'large',
 giant:'huge',whale:'huge',vaquita:'huge',manta:'huge',kraken:'huge'
};
const SIZE_RANK={tiny:0,small:1,medium:2,large:3,huge:4};
function creatureSizeClass(key){
 if(CREATURE_SIZE_OVERRIDES[key])return CREATURE_SIZE_OVERRIDES[key];
 const d=creatureVisualDraw(key),m=Math.max(d[0],d[1]);
 return m<=34?'tiny':m<=58?'small':m<=90?'medium':m<=140?'large':'huge'
}
function creatureBodyMetrics(creature){
 const key=typeof creature==='string'?creature:creature.key,scale=typeof creature==='string'?1:(creature.scale||1),d=creatureVisualDraw(key),w=d[0]*scale,h=d[1]*scale;
 const rx=Math.max(7,w*.43),ry=Math.max(6,h*.43);
 return{key,w,h,rx,ry,size:creatureSizeClass(key),terrainPad:Math.max(7,Math.min(38,Math.min(rx,ry)*.72))}
}
function creaturePointHit(f,x,y,pad=0){
 const m=creatureBodyMetrics(f),rx=m.rx+pad,ry=m.ry+pad,dx=x-f.x,dy=y-f.y;
 return dx*dx/(rx*rx)+dy*dy/(ry*ry)<=1
}
function creatureEdgeDistance(f,x,y){
 const m=creatureBodyMetrics(f),dx=x-f.x,dy=y-f.y,d=Math.hypot(dx,dy);if(d<=.001)return 0;
 const ux=dx/d,uy=dy/d,r=1/Math.sqrt((ux*ux)/(m.rx*m.rx)+(uy*uy)/(m.ry*m.ry));
 return Math.max(0,d-r)
}
function speciesDepthAllows(key,y){
 const sp=SPECIES[key],dep=depthOf(y);return !sp?.depth||(dep>=sp.depth[0]&&dep<=sp.depth[1])
}
const FISH_GRID_SIZE=240;
function fishGridKey(cx,cy){return cx+','+cy}
function rebuildFishGrid(){
 if(!world)return;const grid=new Map();
 for(const f of world.fish){if(!f.alive)continue;const cx=Math.floor(f.x/FISH_GRID_SIZE),cy=Math.floor(f.y/FISH_GRID_SIZE),k=fishGridKey(cx,cy);let cell=grid.get(k);if(!cell){cell=[];grid.set(k,cell)}cell.push(f)}
 world.fishGrid=grid
}
function nearbyFish(x,y,r){
 if(!world?.fishGrid)return world?.fish||[];
 const minX=Math.floor((x-r)/FISH_GRID_SIZE),maxX=Math.floor((x+r)/FISH_GRID_SIZE),minY=Math.floor((y-r)/FISH_GRID_SIZE),maxY=Math.floor((y+r)/FISH_GRID_SIZE),out=[];
 for(let cy=minY;cy<=maxY;cy++)for(let cx=minX;cx<=maxX;cx++){const cell=world.fishGrid.get(fishGridKey(cx,cy));if(cell)out.push(...cell)}
 return out
}
function requiredGearTier(f,method){
 const sp=SPECIES[f.key],size=creatureSizeClass(f.key),difficulty=sp.catchDifficulty||1;
 let tier=difficulty>=5?3:difficulty>=3?2:1;
 if(method==='net'&&SIZE_RANK[size]>=SIZE_RANK.medium)tier=Math.max(tier,2);
 if(method==='harpoon'&&SIZE_RANK[size]>=SIZE_RANK.large)tier=Math.max(tier,2);
 if((method==='gloves'||method==='trap')&&sp.rare)tier=Math.max(tier,2);
 return clamp(tier,1,4)
}
function captureCompatibility(f,method){
 const sp=SPECIES[f.key],size=creatureSizeClass(f.key),motion=sp.motion||'swimmer';
 if(sp.protected||!(sp.weight>0))return{ok:false,reason:'protected',preferred:false,required:4};
 const preferred=preferredCatchMethod(sp,method),fallback=fallbackCatchAllowed(sp,method,f.key);
 if(!preferred&&!fallback)return{ok:false,reason:'method',preferred:false,required:1};
 const required=requiredGearTier(f,method);
 if(gearTier(method)<required)return{ok:false,reason:'tier',preferred,required};
 if(method==='net'&&SIZE_RANK[size]>SIZE_RANK.medium)return{ok:false,reason:'size',preferred,required};
 if((method==='gloves'||method==='trap')&&!preferred)return{ok:false,reason:'method',preferred:false,required};
 if(['sessile','crawlerBoss','megafauna','boss'].includes(motion)&&!preferred)return{ok:false,reason:'method',preferred:false,required};
 return{ok:true,reason:'',preferred,required}
}
function captureBlockMessage(f,method,result){
 const sp=SPECIES[f.key],label=catchMethodLabel(method);
 if(result.reason==='protected')return sp.name+'은 보호 관찰 대상입니다. 포획하지 말고 촬영하세요.';
 if(result.reason==='tier')return sp.name+'은 '+GEAR_TIER_NAMES[result.required]+' 등급 이상의 '+label+'이 필요합니다.';
 if(result.reason==='size')return sp.name+'은 현재 그물로 감당하기 너무 큽니다. 작살 같은 대형 어획 장비가 필요합니다.';
 return sp.name+'은 '+catchMethodLabel(sp.catchMethods?.[0]||'다른 채집 장비')+'로 채집하는 생물입니다.'
}
const BIOME_POPULATIONS={
 reef:[['blue',10],['orange',9],['pink',7],['green',7],['mackerel',6],['triggerfish',4],['yellowfin',1]],
 kelp:[['green',7],['red',8],['grey',7],['long',4],['mackerel',7],['yellowfin',2],['swordfish',1]],
 ruins:[['grey',5],['brown',6],['dart',5],['hunter',3],['mackerel',3],['yellowfin',1]],
 wreck:[['brown',8],['dart',7],['hunter',7],['angler',5],['lanternfish',5],['swordfish',1]],
 abyss:[['angler',8],['hunter',8],['dart',5],['lanternfish',12]],
 hadal:[['lanternfish',15],['angler',8],['hunter',6]]
};
const FAUNA_POPULATIONS={
 reef:[['crab',8],['urchin',10],['ochreStar',7],['crownStar',3],['vaquita',1],['bream',5],['hermitCrab',4],['lionfish',2],['puffer',3],['seahorse',2],['starfishStrip',3],['shrimp',6],['flounder',3]],
 kelp:[['crab',5],['nautilus',4],['jelly',7],['squid',3],['whale',1],['bream',3],['barracuda',3],['cuttlefish',3],['octopus',2],['manta',1],['seaCucumber',4],['skate',2],['shrimp',5],['flounder',3]],
 ruins:[['crab',4],['nautilus',4],['jelly',5],['squid',5],['moray',3],['cuttlefish',2],['octopus',2],['scallop',4],['skate',2],['flounder',6],['slipperLobster',3]],
 wreck:[['crab',6],['jelly',4],['squid',6],['shark2',3],['barracuda',3],['moray',4],['octopus',2],['skate',2],['giantIsopod',2],['flounder',4],['slipperLobster',5],['shrimp',2]],
 abyss:[['jelly',6],['squid',5],['shark2',4],['coelacanth',3],['giantIsopod',5],['seaCucumber',2]],
 hadal:[['giantIsopod',9],['coelacanth',4],['seaCucumber',5],['slipperLobster',5],['jelly',3],['squid',3],['shark2',2]]
};
const ZONE_RULES={
 reef:{oxygen:1,current:0,visibility:1,danger:'낮음'},
 kelp:{oxygen:1.08,current:38,visibility:.86,danger:'강한 조류'},
 ruins:{oxygen:1.18,current:16,visibility:.78,danger:'시야 저하·포식어'},
 wreck:{oxygen:1.30,current:24,visibility:.68,danger:'기뢰·포식자'},
 abyss:{oxygen:1.52,current:14,visibility:.46,danger:'고압·열수·대형 포식자'},
 hadal:{oxygen:1.95,current:8,visibility:.18,danger:'영구 암흑·초고압·크레바스·화산'}
};
const WHALE_FALL={x:1860,y:4690};
const DEEP_RIFT={x:3460,y:5310,w:520};
const VOLCANO={x:5480,y:6370,r:420};
const VENTS=[[1180,3650,1.0],[2580,3710,1.25],[4120,3600,.95],[5480,3790,1.15],[6260,3880,.9],[820,5310,1.05],[4540,5480,1.3],[5160,6050,1.4],[5860,6200,1.2],[6280,5920,.95]];
const ATTACK_PROFILE={
 brown:{sense:205,windup:.30,lunge:.34,speed:215,cooldown:2.25,damage:1.05,label:'영역 돌진'},
 dart:{sense:285,windup:.18,lunge:.28,speed:335,cooldown:1.75,damage:1.12,label:'고속 찌르기'},
 angler:{sense:265,windup:.24,lunge:.42,speed:275,cooldown:2.65,damage:1.15,label:'암습 돌진'},
 hunter:{sense:390,windup:.46,lunge:.40,speed:315,cooldown:2.35,damage:1.22,label:'포식 돌진'},
 giant:{sense:590,windup:.72,lunge:.62,speed:405,cooldown:3.55,damage:1.35,label:'심해 상어 돌진'},
 mantis:{sense:180,windup:.58,lunge:.20,speed:460,cooldown:3.1,damage:1.45,label:'갯가재 초고속 펀치'},
 shark2:{sense:430,windup:.42,lunge:.38,speed:335,cooldown:2.55,damage:1.18,label:'상어 돌진'},
 kraken:{sense:690,windup:.95,lunge:.70,speed:250,cooldown:4.2,damage:1.30,label:'크라켄 촉수 돌진'},
 barracuda:{sense:350,windup:.24,lunge:.30,speed:360,cooldown:2.0,damage:1.15,label:'바라쿠다 돌진'},
 moray:{sense:260,windup:.38,lunge:.32,speed:270,cooldown:2.6,damage:1.18,label:'곰치 기습'},
 lionfish:{sense:165,windup:.55,lunge:.18,speed:180,cooldown:3.2,damage:1.25,label:'쏠배감펭 가시 공격'},
 triggerfish:{sense:195,windup:.42,lunge:.24,speed:230,cooldown:2.8,damage:1.05,label:'타이탄 트리거피시 돌진'}
};
const HOSTILE_BEHAVIORS=new Set(['territorial','ambush','predator']);
const JELLY_SWIM_KEYS=Array.from({length:12},(_,i)=>'jelly'+String(i+1).padStart(2,'0'));
const JELLY_ATTACK_KEYS=Array.from({length:12},(_,i)=>'jellyAtk'+String(i+1).padStart(2,'0'));
const CONTRACT_DEPTH_RATING=[150,285,430,575,760,2200];
const GRADE_SCORE={C:1,B:2,A:3,S:4};
const PHOTO_MULT={C:.45,B:.85,A:1.45,S:2.25};
const COOK_ASSETS={
 fish:'../../assets/game/food/fish.glb',
 mussel:'../../assets/game/food/mussel.glb',
 seaUrchin:'../../assets/game/3d/interiors/modular-sushi-restaurant-kit/sea-urchin-open.glb',
 squid:'../../assets/game/3d/interiors/modular-sushi-restaurant-kit/squid.glb',
 ramen:'../../assets/game/3d/interiors/modular-sushi-restaurant-kit/ramen.glb',
 plate:'../../assets/game/3d/interiors/modular-sushi-restaurant-kit/plate.glb',
 pan:'../../assets/game/3d/interiors/modular-sushi-restaurant-kit/pan.glb'
};
const RECIPES=[
 {id:'reefGrill',name:'산호어 소금구이',icon:'🐟',keys:['blue','orange','pink','green','grey','bream','mackerel','flounder'],groups:[['blue','orange','pink','green','grey','bream','mackerel','flounder']],bonus:190,desc:'얕은 바다 생선을 바삭하게 구운 기본 메뉴',asset:COOK_ASSETS.fish},
 {id:'crabRice',name:'바위게 해조 볶음밥',icon:'🦀',keys:['crab'],groups:[['crab'],['seaweed','seaLettuce']],bonus:390,desc:'바위게와 오늘 채집한 해조를 함께 볶은 한 그릇',asset:COOK_ASSETS.plate},
 {id:'spicyBowl',name:'매콤 심해 덮밥',icon:'🌶️',keys:['red','brown','dart','barracuda'],groups:[['red','brown','dart','barracuda']],bonus:360,desc:'매콤한 양념으로 맛을 살린 인기 메뉴',asset:COOK_ASSETS.plate},
 {id:'hunterSteak',name:'포식어 스테이크',icon:'🍽️',keys:['hunter','angler'],groups:[['hunter','angler']],bonus:640,desc:'위험한 포식어와 심해 아귀를 손질해 만든 고급 메뉴',asset:COOK_ASSETS.pan},
 {id:'pelagicSteak',name:'대형 회유어 스테이크',icon:'🐟',keys:['yellowfin','swordfish'],groups:[['yellowfin','swordfish']],bonus:820,desc:'황다랑어나 황새치를 두툼하게 손질한 고급 메뉴',asset:COOK_ASSETS.pan},
 {id:'crustaceanGrill',name:'새우·부채새우 구이',icon:'🦐',keys:['shrimp','slipperLobster'],groups:[['shrimp','slipperLobster']],bonus:360,desc:'오늘 잡은 새우나 부채새우를 센 불에 구운 메뉴',asset:COOK_ASSETS.pan},
 {id:'squidGrill',name:'두족류 구이',icon:'🦑',keys:['squid','cuttlefish','octopus'],groups:[['squid','cuttlefish','octopus']],bonus:520,desc:'오징어·갑오징어·문어를 불향 나게 구운 메뉴',asset:COOK_ASSETS.squid},
 {id:'urchinRice',name:'성게 해초 덮밥',icon:'🟣',keys:['urchin'],groups:[['urchin'],['seaweed','seaLettuce']],bonus:620,desc:'성게와 신선한 해초를 올린 고급 덮밥',asset:COOK_ASSETS.seaUrchin},
 {id:'musselSoup',name:'패류 다시마 국',icon:'🥣',keys:['mussel','scallop'],groups:[['mussel','scallop'],['kelp','seaweed']],bonus:430,desc:'홍합이나 가리비와 다시마로 우린 따뜻한 바다 국물',asset:COOK_ASSETS.mussel},
 {id:'seaweedSoup',name:'바다 채소국',icon:'🌿',keys:['seaweed','kelp','seaLettuce'],groups:[['seaweed','kelp','seaLettuce']],bonus:210,desc:'미역·다시마·바다상추로 만드는 가벼운 메뉴',asset:COOK_ASSETS.ramen},
 {id:'squidSalad',name:'오징어 붉은해조 무침',icon:'🥗',keys:['squid'],groups:[['squid'],['redAlgae']],bonus:760,desc:'심해 오징어와 붉은 해조를 함께 쓰는 특별 메뉴',asset:COOK_ASSETS.squid}
];

let view={w:innerWidth,h:innerHeight,dpr:1},last=performance.now(),state='menu',world=null,sound=false,ac=null,ambience=null;
const keys={},touch={x:0,y:0,dash:false},meta={
 money:0,unlocked:0,
 up:{oxygen:0,fins:0,bag:0,catchCap:0,slots:0,camera:0,harpoon:0,sonar:0,suit:0,buoyancy:0},
 gear:{harpoon:1,net:1,gloves:1,knife:1,trap:1},
 loadout:['harpoon','net'],
 shopUp:{seats:0,stove:0,prep:0,fridge:0,tray:0,menu:0,helper:0},
 codex:{},bestDepth:0,bestScore:0,stock:{},day:1,shop:{reputation:0,bestNight:0,totalServed:0}
};
let restaurant=null,dockMissionId=null,dockTab='none';

function resize(){const r=C.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);view.w=Math.max(1,r.width||innerWidth);view.h=Math.max(1,r.height||innerHeight);view.dpr=dpr;C.width=Math.round(view.w*dpr);C.height=Math.round(view.h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a),lerp=(a,b,t)=>a+(b-a)*t;
const depthOf=y=>{const shallowEnd=(4200-WORLD.surface)/WORLD.scaleDepth;if(y<=4200)return Math.max(0,(y-WORLD.surface)/WORLD.scaleDepth);return shallowEnd+Math.max(0,y-4200)/1.2};
const zoneForY=y=>ZONES.find(z=>y>=z.y0&&y<z.y1)||ZONES[ZONES.length-1];
const money=n=>Math.round(n).toLocaleString('ko-KR')+'원';
function stats(){return{oxygen:105+meta.up.oxygen*15,speed:168*(1+meta.up.fins*.065),ascent:1+(meta.up.buoyancy||0)*.09,ascentO2:Math.max(.68,1-(meta.up.buoyancy||0)*.07),bag:8+meta.up.bag*3,catchCap:CATCH_CAP_LEVELS[clamp(meta.up.catchCap||0,0,CATCH_CAP_LEVELS.length-1)],toolSlots:2+(meta.up.slots||0),camera:185+meta.up.camera*26,harpoon:300+meta.up.harpoon*42,sonar:Math.max(4,10-meta.up.sonar*1.15),armor:1-meta.up.suit*.11}}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(meta))}catch(e){}}
function load(){
  let r=null;try{r=JSON.parse(localStorage.getItem(SAVE)||'null')}catch(e){}
  if(!r){try{r=JSON.parse(localStorage.getItem(OLD)||'null')}catch(e){}}
  if(!r){try{const o=JSON.parse(localStorage.getItem(LEGACY)||'null');if(o)r={money:o.money||0,unlocked:Math.min(4,o.unlocked||0),up:o.up||{},codex:o.codex||{},bestDepth:o.bestDepth||0,bestScore:o.bestScore||0}}catch(e){}}
  if(r){meta.money=r.money||0;meta.unlocked=r.unlocked||0;Object.assign(meta.up,r.up||{});Object.assign(meta.gear,r.gear||{});Object.assign(meta.shopUp,r.shopUp||{});meta.loadout=Array.isArray(r.loadout)?r.loadout.filter(k=>GEAR_DEFS[k]).slice(0,2+(meta.up.slots||0)):meta.loadout;meta.codex=r.codex||{};meta.bestDepth=r.bestDepth||0;meta.bestScore=r.bestScore||0;meta.stock=r.stock&&typeof r.stock==='object'?r.stock:{};meta.day=Math.max(1,r.day||1);Object.assign(meta.shop,r.shop||{});save()}
}
function beep(f=500,d=.08,type='triangle'){if(!sound)return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.frequency.value=f;o.type=type;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.05,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(ac.destination);o.start();o.stop(t+d+.02)}catch(e){}}
function ensureAmbience(){
 if(ambience)return ambience;ambience=new Audio(AMBIENCE_SRC);ambience.loop=true;ambience.preload='auto';ambience.volume=.20;return ambience
}
function syncAmbience(){
 const a=ensureAmbience(),shouldPlay=sound&&state==='playing'&&!document.hidden;
 if(shouldPlay){const p=a.play();if(p?.catch)p.catch(()=>{})}else if(!a.paused){a.pause()}
}
function showHint(t,ms=1500){const el=$('hint');el.textContent=t;el.classList.add('show');clearTimeout(showHint.t);showHint.t=setTimeout(()=>el.classList.remove('show'),ms)}
function showZone(zone){const z=typeof zone==='string'?ZONES.find(q=>q.name===zone):zone,el=$('zoneToast');el.innerHTML=z?'<b>'+z.name+'</b><small>'+z.tag+'</small>':String(zone||'');el.classList.add('show');clearTimeout(showZone.t);showZone.t=setTimeout(()=>el.classList.remove('show'),1700)}
function updateStartButtons(){const s=$('startBtn'),c=$('continueBtn');if(s)s.disabled=!ready;if(c)c.disabled=!ready}

function seedRand(seed){let x=seed|0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
function makeFish(key,x,y,seed){const d=SPECIES[key],rr=seedRand(seed||Math.floor(Math.random()*999999)),dir=rr()>.5?1:-1,baseScale=creatureVisualScale(key,rr);return{kind:'creature',key,x,y,baseX:x,baseY:y,homeX:x,vx:dir*(d.speed||12)*(.72+rr()*.28),vy:(rr()-.5)*12,patrolDir:dir,faceDir:dir,faceLock:0,turnLock:0,patrolMin:null,patrolMax:null,phase:rr()*Math.PI*2,scale:baseScale,alive:true,photo:null,marked:0,alert:0,attackCd:0,specialCd:rr()*1.8,attackMode:'',attackKind:'',attackT:0,attackVx:0,attackVy:0,hidden:false,panic:0,feeding:0,hooked:false,contactCd:0}}

function rectSolid(x,y,w,h,zone='reef',edge='sand'){return{shape:'rect',x,y,w,h,zone,edge}}
function circleSolid(x,y,r,zone='reef',edge='dirt'){return{shape:'circle',x,y,r,zone,edge}}
function buildTerrain(){
  // Wide/deep expedition map. Each biome has several chambers and at least two vertical routes.
  return[
    // REEF 60~720 : shelves -> coral maze -> blue drop
    rectSolid(0,330,980,100,'reef','sand'),rectSolid(1220,410,1080,95,'reef','sand'),rectSolid(2820,300,900,110,'reef','sand'),rectSolid(4230,430,900,95,'reef','sand'),rectSolid(5620,320,1180,110,'reef','sand'),
    circleSolid(1080,385,110,'reef','sand'),circleSolid(2440,520,95,'reef','sand'),circleSolid(3960,390,105,'reef','sand'),circleSolid(5400,510,120,'reef','sand'),
    rectSolid(0,650,720,70,'reef','sand'),rectSolid(1700,625,900,95,'reef','sand'),rectSolid(3500,640,980,80,'reef','sand'),rectSolid(5850,620,950,100,'reef','sand'),

    // KELP 720~1500 : tall walls and long current channels
    rectSolid(0,860,780,210,'kelp','dirt'),rectSolid(1020,1030,980,185,'kelp','dirt'),rectSolid(2320,820,720,260,'kelp','dirt'),rectSolid(3370,1110,980,185,'kelp','dirt'),rectSolid(4680,850,760,250,'kelp','dirt'),rectSolid(5740,1110,1060,190,'kelp','dirt'),
    circleSolid(890,980,100,'kelp'),circleSolid(2160,1180,105,'kelp'),circleSolid(3210,980,95,'kelp'),circleSolid(4540,1230,110,'kelp'),circleSolid(5580,980,100,'kelp'),
    rectSolid(520,1410,940,90,'kelp','dirt'),rectSolid(2600,1390,980,110,'kelp','dirt'),rectSolid(4930,1400,930,100,'kelp','dirt'),

    // RUINS 1500~2350 : courtyards, broken gates, vertical well
    rectSolid(0,1650,950,160,'ruins','dirt'),rectSolid(1240,1840,850,145,'ruins','dirt'),rectSolid(2440,1600,1120,155,'ruins','dirt'),rectSolid(3920,1880,900,145,'ruins','dirt'),rectSolid(5260,1620,1540,165,'ruins','dirt'),
    circleSolid(1080,1760,105,'ruins'),circleSolid(2240,1960,90,'ruins'),circleSolid(3740,1720,100,'ruins'),circleSolid(5000,1980,115,'ruins'),
    rectSolid(600,2210,880,120,'ruins','dirt'),rectSolid(2780,2180,950,170,'ruins','dirt'),rectSolid(4720,2200,920,150,'ruins','dirt'),

    // WRECK 2350~3250 : debris pockets and mine lanes
    rectSolid(0,2500,1080,190,'wreck','dirt'),rectSolid(1380,2770,900,165,'wreck','dirt'),rectSolid(2600,2460,880,200,'wreck','dirt'),rectSolid(3860,2800,980,160,'wreck','dirt'),rectSolid(5200,2480,1600,200,'wreck','dirt'),
    circleSolid(1210,2600,105,'wreck'),circleSolid(2420,2870,115,'wreck'),circleSolid(3660,2580,100,'wreck'),circleSolid(5000,2920,115,'wreck'),
    rectSolid(500,3140,920,110,'wreck','dirt'),rectSolid(3000,3110,1050,140,'wreck','dirt'),rectSolid(5600,3120,1200,130,'wreck','dirt'),

    // ABYSS 3250~4200 : blackwater entry -> vent valley -> predator trench
    rectSolid(0,3420,1250,250,'abyss','dirt'),rectSolid(1570,3650,900,180,'abyss','dirt'),rectSolid(2860,3370,980,260,'abyss','dirt'),rectSolid(4300,3690,980,185,'abyss','dirt'),rectSolid(5720,3410,1080,250,'abyss','dirt'),
    circleSolid(1410,3510,120,'abyss'),circleSolid(2680,3790,105,'abyss'),circleSolid(4080,3510,115,'abyss'),circleSolid(5520,3820,120,'abyss'),
    rectSolid(0,4090,850,110,'abyss','dirt'),rectSolid(1880,4070,980,130,'abyss','dirt'),rectSolid(3620,4050,920,150,'abyss','dirt'),rectSolid(5900,4060,900,140,'abyss','dirt'),

    // HADAL 4200~6500 : whale fall -> crevasse -> volcanic caldera. Wide gaps create real descent routes.
    rectSolid(0,4540,1160,170,'hadal','dirt'),rectSolid(1360,4740,1260,155,'hadal','dirt'),rectSolid(2920,4470,1180,190,'hadal','dirt'),rectSolid(4480,4760,940,160,'hadal','dirt'),rectSolid(5740,4500,1060,190,'hadal','dirt'),
    circleSolid(1210,4680,115,'hadal'),circleSolid(2760,4590,105,'hadal'),circleSolid(4300,4820,125,'hadal'),circleSolid(5560,4660,110,'hadal'),
    rectSolid(0,5160,1420,185,'hadal','dirt'),rectSolid(1640,5380,1120,170,'hadal','dirt'),rectSolid(4140,5350,1160,185,'hadal','dirt'),rectSolid(5580,5140,1220,210,'hadal','dirt'),
    circleSolid(1510,5310,105,'hadal'),circleSolid(2940,5530,90,'hadal'),circleSolid(3970,5250,95,'hadal'),circleSolid(5440,5480,100,'hadal'),
    rectSolid(0,5900,1100,190,'hadal','dirt'),rectSolid(1390,6150,1200,175,'hadal','dirt'),rectSolid(2860,5880,1060,190,'hadal','dirt'),rectSolid(4240,6200,820,150,'hadal','dirt'),rectSolid(6030,6070,770,180,'hadal','dirt'),
    circleSolid(1220,6070,110,'hadal'),circleSolid(2710,6240,105,'hadal'),circleSolid(4080,6030,110,'hadal'),circleSolid(5920,6230,100,'hadal'),
    rectSolid(0,6430,2860,70,'hadal','dirt'),rectSolid(4020,6430,2780,70,'hadal','dirt')
  ];
}
function zonePlantPool(id,foreground=false){
  if(id==='reef')return foreground?['bgSeaB','bgSeaD','seaweedOrangeA','seaweedPinkB','seaweedPinkD','seaweedGreenB']:['seaweedOrangeA','seaweedOrangeB','seaweedB','seaweedPinkB','seaweedPinkC','seaweedPinkD','seaweedGreenB','grassA','waterPlant2','grassClump'];
  if(id==='kelp')return foreground?['bgSeaA','bgSeaC','bgSeaE','bgSeaG','bgSeaH','seaweedGreenC','seaweedGreenD']:['seaweedA','seaweedGreenB','seaweedGreenC','seaweedGreenD','grassA','grassB','waterPlant2','grassClump'];
  if(id==='ruins')return foreground?['bgSeaF','bgRockA','bgRockB','grassA','seaweedGreenD']:['rockA','rockB','grassA','seaweedGreenD','seaweedPinkD','grassClump'];
  if(id==='wreck')return foreground?['bgRockB','bgSeaH','rockA','rockB','seaweedGreenD']:['rockA','rockB','grassB','seaweedGreenD','grassClump'];
  if(id==='hadal')return foreground?['bgRockA','bgRockB']:['rockA','rockB'];
  return foreground?['bgRockA','bgRockB','bgSeaH']:['rockA','rockB','grassB'];
}
function buildForeground(seed){
  const r=seedRand(seed+4411),items=[];
  for(const z of ZONES){
    const pool=zonePlantPool(z.id,true),count=z.id==='kelp'?56:z.id==='reef'?45:z.id==='ruins'?35:z.id==='wreck'?32:z.id==='hadal'?42:28;
    for(let i=0;i<count;i++){
      items.push({
        x:rnd(-120,WORLD.w+120),y:rnd(z.y0+35,z.y1-20),
        type:pool[Math.floor(r()*pool.length)],
        scale:z.id==='kelp'?rnd(2.1,4.0):z.id==='hadal'?rnd(1.8,3.4):rnd(1.4,2.8),alpha:z.id==='hadal'?rnd(.06,.14):z.id==='abyss'?rnd(.10,.20):rnd(.15,.32),
        parallax:rnd(1.035,1.09),flip:r()>.5,zone:z.id
      });
    }
  }
  return items;
}
function pointInSolid(x,y,s,pad=0){
  if(s.shape==='circle')return Math.hypot(x-s.x,y-s.y)<s.r+pad;
  return x>s.x-pad&&x<s.x+s.w+pad&&y>s.y-pad&&y<s.y+s.h+pad;
}
function creatureSpawnPad(key){
 const sp=SPECIES[key],m=creatureBodyMetrics(key),base=Math.max(m.w,m.h);
 if(sp.motion==='megafauna')return Math.max(64,base*.38);
 if(sp.motion==='boss')return Math.max(58,base*.34);
 if(sp.motion==='crawlerBoss')return Math.max(24,base*.42);
 return Math.max(16,Math.min(62,base*.40))
}
function spawnScope(scopeId,y){
 const sub=SUBZONES.find(z=>z.id===scopeId),zone=ZONES.find(z=>z.id===scopeId);
 if(sub)return{sub,zone:ZONES.find(z=>z.id===sub.zone),y0:sub.y0,y1:sub.y1};
 const z=zone||zoneForY(y);return{sub:null,zone:z,y0:z.y0,y1:z.y1}
}
function spawnBlocked(key,x,y,pad){
 if(world.terrain.some(t=>pointInSolid(x,y,t,pad)))return true;
 for(const o of world.fish){if(!o.alive)continue;const op=creatureSpawnPad(o.key),min=(pad+op)*.42;if(Math.hypot(o.x-x,o.y-y)<min)return true}
 return false
}
function safeCreatureSpawn(key,x,y,scopeId=null){
 const sp=SPECIES[key],pad=creatureSpawnPad(key),scope=spawnScope(scopeId,y),minY=scope.y0+pad+8,maxY=scope.y1-pad-8;
 x=clamp(x,pad+22,WORLD.w-pad-22);y=clamp(y,minY,maxY);
 if(sp.motion==='crawler'||sp.motion==='crawlerBoss'||sp.motion==='sessile'){
   const floors=world.terrain.filter(t=>t.shape==='rect'&&t.zone===scope.zone.id&&t.y>=scope.y0-20&&t.y<=scope.y1+60)
     .sort((a,b)=>Math.abs(clamp(x,a.x,a.x+a.w)-x)+Math.abs(a.y-y)*.55-(Math.abs(clamp(x,b.x,b.x+b.w)-x)+Math.abs(b.y-y)*.55));
   for(const floor of floors){
     const minX=floor.x+pad+12,maxX=floor.x+floor.w-pad-12;if(maxX<=minX)continue;
     const sx=clamp(x,minX,maxX),sy=floor.y-pad-5;
     if(sy<minY||sy>maxY||spawnBlocked(key,sx,sy,pad))continue;
     return{x:sx,y:sy,patrolMin:minX,patrolMax:maxX}
   }
 }
 const golden=2.399963229728653;
 for(let ring=0;ring<=12;ring++){
   const radius=ring===0?0:26+ring*24,steps=ring===0?1:12;
   for(let i=0;i<steps;i++){
     const a=i/steps*Math.PI*2+ring*golden,nx=clamp(x+Math.cos(a)*radius,pad+22,WORLD.w-pad-22),ny=clamp(y+Math.sin(a)*radius,minY,maxY);
     if(!spawnBlocked(key,nx,ny,pad))return{x:nx,y:ny,patrolMin:null,patrolMax:null}
   }
 }
 return{x,y,patrolMin:null,patrolMax:null}
}
function spawnCreature(key,x,y,seed,scopeId=null){
 const p=safeCreatureSpawn(key,x,y,scopeId),f=makeFish(key,p.x,p.y,seed);f.baseX=f.homeX=f.x=p.x;f.baseY=f.y=p.y;f.patrolMin=p.patrolMin;f.patrolMax=p.patrolMax;return f
}
function resolvePlayerTerrain(p,r=23){
  let hit=false;
  for(const s of world.terrain){
    if(s.shape==='circle'){
      const dx=p.x-s.x,dy=p.y-s.y,d=Math.hypot(dx,dy),min=s.r+r;
      if(d<min){
        const nx=d>0?dx/d:1,ny=d>0?dy/d:0,over=min-d;
        p.x+=nx*over;p.y+=ny*over;hit=true;
        const vn=p.vx*nx+p.vy*ny;if(vn<0){p.vx-=vn*nx*1.25;p.vy-=vn*ny*1.25}
      }
    }else{
      const nx=clamp(p.x,s.x,s.x+s.w),ny=clamp(p.y,s.y,s.y+s.h),dx=p.x-nx,dy=p.y-ny,d=Math.hypot(dx,dy);
      if(d<r){
        if(d>0){
          const ux=dx/d,uy=dy/d,over=r-d;p.x+=ux*over;p.y+=uy*over;
          const vn=p.vx*ux+p.vy*uy;if(vn<0){p.vx-=vn*ux*1.25;p.vy-=vn*uy*1.25}
        }else{
          const dl=Math.abs(p.x-s.x),dr=Math.abs(s.x+s.w-p.x),dt=Math.abs(p.y-s.y),db=Math.abs(s.y+s.h-p.y),m=Math.min(dl,dr,dt,db);
          if(m===dl){p.x=s.x-r;p.vx=Math.min(0,p.vx)}
          else if(m===dr){p.x=s.x+s.w+r;p.vx=Math.max(0,p.vx)}
          else if(m===dt){p.y=s.y-r;p.vy=Math.min(0,p.vy)}
          else{p.y=s.y+s.h+r;p.vy=Math.max(0,p.vy)}
        }
        hit=true;
      }
    }
  }
  return hit;
}
function ingredientInfo(key){return SPECIES[key]||HARVEST_DEFS[key]||{name:key,weight:0,value:0,img:null}}
function gearTier(name){return clamp(meta.gear?.[name]||1,1,4)}
function catchMethodLabel(method){return GEAR_DEFS[method]?.name||method}
function canAddCatch(weight){
 if(!world)return false;
 if(world.catchWeight+weight>world.st.catchCap+.0001){showHint('오늘 어획 한도 '+world.st.catchCap+'kg에 도달했습니다. 배로 돌아가거나 어획함을 업그레이드하세요.',1450);beep(120,.06,'sawtooth');return false}
 return true
}
function addHarvestNode(key,x,y,id){const d=HARVEST_DEFS[key];world.harvestables.push({id:id||key+'-'+world.harvestables.length,key,x,y,taken:false,progress:0,phase:Math.random()*Math.PI*2,scale:.9+Math.random()*.28,...d})}
function buildHarvestables(r){
 const plan={seaweed:16,kelp:11,redAlgae:8,seaLettuce:13,mussel:10};
 for(const [key,count] of Object.entries(plan)){const d=HARVEST_DEFS[key];for(let i=0;i<count;i++){const zid=d.zones[Math.floor(r()*d.zones.length)],z=ZONES.find(q=>q.id===zid),x=120+r()*(WORLD.w-240),y=z.y0+70+r()*Math.max(60,z.y1-z.y0-140);addHarvestNode(key,x,y,key+'-'+i)}}
}
function configureToolbars(){
 if(!world)return;const allowed=new Set(['camera','sonar',...world.loadout]);document.querySelectorAll('[data-tool]').forEach(b=>{const on=allowed.has(b.dataset.tool);b.classList.toggle('loadoutHidden',!on);b.disabled=!on});if(!allowed.has(world.tool))world.tool='camera'
}
function buildWorld(contract=FREE_DIVE){
 const mission=contract||FREE_DIVE,st=stats(),seed=meta.day*9127+(mission.unlock||0)*503+57,r=seedRand(seed);contract=mission;
 const loadout=(meta.loadout||[]).filter(k=>GEAR_DEFS[k]).slice(0,st.toolSlots);
 world={
   contract,daily:dailyTaskForDay(meta.day),st,time:0,boat:{x:WORLD.w*.5,y:WORLD.surface+18},camera:{x:WORLD.w*.5,y:220},player:{x:WORLD.w*.5,y:130,vx:0,vy:0,face:1,aimX:1,aimY:0,oxygen:st.oxygen,hp:100,dashCd:0,dashTime:0,dashHeld:false,inv:0},
   fish:[],fishGrid:new Map(),decor:[],harvestables:[],traps:[],trapSeq:0,foreground:buildForeground(seed),terrain:buildTerrain(),props:[],mines:[],pickups:[],shots:[],effects:[],bubbles:[],bossSeen:{mantis:false,kraken:false},
   bag:[],bagWeight:0,catchWeight:0,catchCounts:{},income:0,photoIncome:0,maxDepth:0,loadout,tool:'camera',sonar:0,sonarCd:0,lastZone:'',lastSubzone:'',zoneFlash:0,envPulse:0,lightJam:0,currentBurst:0,silt:0,scrapeCd:0,thermalLift:0,pressureOver:0,pressureTick:0,pressureState:'safe',reserveState:'safe',tether:null,complete:false,returned:false,
   mission:{photos:{},photoGrades:{},samples:0,statue:false,arch:false,relic:false,recorder:false,deep:false,hadal:false,giantGrade:null,visited:{}}
 };
 let fishSeed=0;
 for(const z of ZONES){
   const population=BIOME_POPULATIONS[z.id]||[];
   for(const [key,count] of population){
     const expandedCount=Math.max(count,Math.round(count*1.55));
     for(let i=0;i<expandedCount;i++){
       let x=0,y=0,tries=0;
       do{
         x=130+r()*(WORLD.w-260);
         y=(z.y0+42)+r()*Math.max(40,(z.y1-z.y0)-84);
         tries++;
       }while(tries<32&&(!speciesDepthAllows(key,y)||world.terrain.some(t=>pointInSolid(x,y,t,36))));
       if(speciesDepthAllows(key,y))world.fish.push(spawnCreature(key,x,y,12000+fishSeed++*37+contract.unlock*503,z.id));
     }
   }
 }
 for(const z of ZONES){
   const population=FAUNA_POPULATIONS[z.id]||[];
   for(const [key,count] of population){
     for(let i=0;i<count;i++){
       let x=0,y=0,tries=0;
       do{x=130+r()*(WORLD.w-260);y=(z.y0+55)+r()*Math.max(50,(z.y1-z.y0)-110);tries++}while(tries<32&&!speciesDepthAllows(key,y));
       if(speciesDepthAllows(key,y))world.fish.push(spawnCreature(key,x,y,18000+fishSeed++*43+contract.unlock*701,z.id));
     }
   }
 }
 // Curated subzone ecology makes the fifteen named areas feel different instead of random.
 const encounters=[
   ['crab',760,305,19301],['urchin',1450,392,19302],['ochreStar',3470,624,19303],['crownStar',4930,416,19304],
   ['nautilus',2140,980,19311],['jelly',3620,1110,19312],['jelly',5340,1325,19313],
   ['squid',1760,1705,19321],['nautilus',4210,1990,19322],['squid',3220,2240,19323],
   ['crab',1040,2570,19331],['squid',4560,2860,19332],['shark2',6040,3100,19333],
   ['jelly',1840,3410,19341],['squid',4380,3710,19342],
   ['seahorse',890,185,19501],['manta',5120,1320,19502],['moray',2580,1910,19503],['giantIsopod',2360,3880,19504],['coelacanth',4860,3690,19505],
   ['mackerel',1180,210,19601],['triggerfish',4720,390,19602],['yellowfin',6040,890,19603],['swordfish',820,2860,19604],
   ['shrimp',1880,610,19605],['flounder',3360,2190,19606],['slipperLobster',5480,2860,19607],['lanternfish',1640,3420,19608],['angler',5220,3890,19609],
   ['giantIsopod',1700,4630,19701],['giantIsopod',1960,4660,19702],['slipperLobster',2130,4700,19703],['seaCucumber',1510,4720,19704],['lanternfish',2480,4450,19705],
   ['angler',3180,5090,19706],['coelacanth',4260,5480,19707],['giantIsopod',4740,5480,19708],['lanternfish',3730,5200,19709],
   ['angler',5200,6030,19710],['giantIsopod',5780,6280,19711],['coelacanth',6170,5940,19712],['lanternfish',4920,5780,19713]
 ];
 for(const [key,x,y,seed] of encounters)world.fish.push(spawnCreature(key,x,y,seed,subzoneForY(y).id));
 // Boss encounters are unique: mantis shrimp in the reef maze, kraken in the predator trench.
 world.fish.push(spawnCreature('mantis',WORLD.w*.61,455,19401,'reefMaze'));
 world.fish.push(spawnCreature('kraken',WORLD.w*.53,4015,19402,'predatorTrench'));
 // Mission-critical species are guaranteed so a contract can never become impossible because of random generation.
 world.fish.push(spawnCreature('blue',WORLD.w*.34,220,8101,'reefShelf'));
 world.fish.push(spawnCreature('orange',WORLD.w*.39,250,8102,'reefShelf'));
 world.fish.push(spawnCreature('pink',WORLD.w*.765,590,8103,'blueDrop'));
 world.fish.push(spawnCreature('long',WORLD.w*.43,1180,8104,'kelpCathedral'));
 world.fish.push(spawnCreature('giant',WORLD.w*.74,3920,9921,'predatorTrench'));
 world.fish.push(spawnCreature('giant',WORLD.w*.31,4010,9922,'predatorTrench'));
 for(const z of ZONES){
   const pool=zonePlantPool(z.id,false),count=z.id==='reef'?110:z.id==='kelp'?145:z.id==='ruins'?72:z.id==='wreck'?62:z.id==='hadal'?54:50;
   for(let i=0;i<count;i++){
     const y=rnd(z.y0+24,z.y1-28),x=rnd(80,WORLD.w-80),type=pool[Math.floor(r()*pool.length)];
     world.decor.push({x,y,type,scale:z.id==='kelp'?rnd(.9,1.7):rnd(.65,1.3),flip:r()>.5,zone:z.id});
   }
 }
 world.decor.push(
   {x:640,y:286,type:'waterPlant2',scale:1.10,flip:false,zone:'reef'},{x:1280,y:382,type:'waterPlant2',scale:.92,flip:true,zone:'reef'},
   {x:2860,y:602,type:'grassClump',scale:1.15,flip:false,zone:'reef'},{x:1910,y:905,type:'waterPlant2',scale:1.18,flip:false,zone:'kelp'},
   {x:4120,y:1180,type:'grassClump',scale:1.32,flip:true,zone:'kelp'},{x:1480,y:1690,type:'grassClump',scale:.96,flip:false,zone:'ruins'},
   {x:3310,y:2210,type:'grassClump',scale:1.08,flip:true,zone:'ruins'},{x:970,y:2520,type:'grassClump',scale:.90,flip:false,zone:'wreck'}
 );
 buildHarvestables(r);
 world.props.push({id:'statue',x:WORLD.w*.34,y:1810,type:'statue',done:false},{id:'arch',x:WORLD.w*.67,y:2050,type:'arch',done:false});
 world.pickups.push({id:'relic',name:'고대 유적 열쇠',x:3950,y:2250,value:850,taken:false,weight:.2,icon:'pickupKey',iconSize:48});
 world.pickups.push({id:'recorder',name:'항해기록 장치',x:WORLD.w*.72,y:3030,value:1600,taken:false,weight:3.5,icon:'pickupTelescope',iconSize:62});
 world.pickups.push(
   {id:'seashellA',name:'큰 조개껍데기',x:1080,y:275,value:90,taken:false,weight:.2,icon:'pickupSeashell',iconSize:48},
   {id:'troutA',name:'유실된 어획물',x:5260,y:610,value:150,taken:false,weight:.6,icon:'pickupTrout',iconSize:58},
   {id:'silvercupA',name:'은제 잔',x:1780,y:1930,value:480,taken:false,weight:.7,icon:'pickupSilvercup',iconSize:50},
   {id:'silverplateA',name:'은제 접시',x:4580,y:2165,value:420,taken:false,weight:.9,icon:'pickupSilverplate',iconSize:54},
   {id:'bucketA',name:'낡은 양동이',x:820,y:2490,value:110,taken:false,weight:1.0,icon:'pickupBucket',iconSize:52},
   {id:'fishingrodA',name:'부러진 낚싯대',x:2160,y:2575,value:140,taken:false,weight:1.1,icon:'pickupFishingrod',iconSize:68},
   {id:'tincanA',name:'녹슨 통조림',x:3180,y:2860,value:70,taken:false,weight:.5,icon:'pickupTincan',iconSize:50},
   {id:'cargoA',name:'루비 화물',x:1450,y:3095,value:820,taken:false,weight:.3,icon:'pickupRuby',iconSize:52},
   {id:'cargoB',name:'사파이어 화물',x:3480,y:3015,value:820,taken:false,weight:.3,icon:'pickupSaphire',iconSize:52},
   {id:'cargoC',name:'금제 화물',x:5920,y:3140,value:1250,taken:false,weight:1.3,icon:'pickupGold',iconSize:54},
   {id:'ventMineralA',name:'열수 광물 표본',x:2660,y:3670,value:1050,taken:false,weight:1.8,icon:'pickupRuby',iconSize:48},
   {id:'ventMineralB',name:'심해 황화광 표본',x:5450,y:3760,value:1380,taken:false,weight:2.2,icon:'pickupSaphire',iconSize:48}
 );
 for(let i=0;i<17;i++)world.mines.push({x:WORLD.w*.34+i*165+(i%2?65:-45),y:2670+(i%4)*105,size:i%4===0?'B':i%3===0?'S':'N',dead:false,fuse:0,marked:0});
 for(let i=0;i<52;i++)world.bubbles.push({x:rnd(0,WORLD.w),y:rnd(80,WORLD.h),s:rnd(1,3),speed:rnd(10,25)});
 state='playing';document.body.classList.add('playing');document.body.classList.toggle('cameraMode',true);syncAmbience();
 ['startScreen','contractScreen','shopScreen','codexScreen','resultScreen','restaurantScreen'].forEach(id=>$(id)?.classList.add('hidden'));
 configureToolbars();resetInputs();setTool('camera');showZone(zoneForY(world.player.y));showHint((contract.id==='free'?'자유 잠수':'선택 의뢰 · '+contract.title)+' · 오늘 어획 '+world.st.catchCap+'kg · 수면 중앙 배에서 E를 누르면 낮 탐사가 끝납니다.',4200);
}

function screenPos(x,y){return{x:x-world.camera.x+view.w/2,y:y-world.camera.y+view.h/2}}
function sheetFrame(im,frames,t){if(!im||!im.complete)return null;const fh=im.naturalHeight,fw=Math.floor(im.naturalWidth/frames),frame=Math.floor(t*8)%frames;return{sx:frame*fw,sy:0,sw:fw,sh:fh}}
const STRIP_FRAME_CACHE=new WeakMap();
function trimmedStripFrames(im,frames=4){
 if(!im||!im.complete||!im.naturalWidth)return null;const cached=STRIP_FRAME_CACHE.get(im);if(cached&&cached.frames===frames&&cached.w===im.naturalWidth&&cached.h===im.naturalHeight)return cached;
 const iw=im.naturalWidth,ih=im.naturalHeight,canvas=document.createElement('canvas');canvas.width=iw;canvas.height=ih;const g=canvas.getContext('2d',{willReadFrequently:true});
 if(!g)return null;let bounds=[];
 try{g.clearRect(0,0,iw,ih);g.drawImage(im,0,0);const data=g.getImageData(0,0,iw,ih).data;
  for(let i=0;i<frames;i++){const x0=Math.floor(i*iw/frames),x1=Math.floor((i+1)*iw/frames);let minX=x1,minY=ih,maxX=x0-1,maxY=-1;
   for(let y=0;y<ih;y++){let a=(y*iw+x0)*4+3;for(let x=x0;x<x1;x++,a+=4)if(data[a]>8){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}}
   if(maxX<minX){bounds.push({sx:x0,sy:0,sw:Math.max(1,x1-x0),sh:ih});continue}const pad=Math.max(2,Math.floor(Math.min(x1-x0,ih)*.006));minX=Math.max(x0,minX-pad);maxX=Math.min(x1-1,maxX+pad);minY=Math.max(0,minY-pad);maxY=Math.min(ih-1,maxY+pad);bounds.push({sx:minX,sy:minY,sw:maxX-minX+1,sh:maxY-minY+1})}
 }catch(_){bounds=Array.from({length:frames},(_,i)=>{const x0=Math.floor(i*iw/frames),x1=Math.floor((i+1)*iw/frames);return{sx:x0,sy:0,sw:Math.max(1,x1-x0),sh:ih}})}
 const out={frames,w:iw,h:ih,bounds,maxW:Math.max(...bounds.map(b=>b.sw)),maxH:Math.max(...bounds.map(b=>b.sh))};STRIP_FRAME_CACHE.set(im,out);canvas.width=1;canvas.height=1;return out
}
function drawTrimmedStrip(im,x,y,frames,w,h,flip=false,alpha=1,fps=6,phase=0){if(!im||!im.complete||!im.naturalWidth)return;const set=trimmedStripFrames(im,frames);if(!set)return;const idx=Math.floor((world.time+phase)*fps)%frames,f=set.bounds[idx],scale=Math.min(w/set.maxW,h/set.maxH),dw=f.sw*scale,dh=f.sh*scale;ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(im,f.sx,f.sy,f.sw,f.sh,-dw/2,-dh/2,dw,dh);ctx.restore()}
function drawImg(im,x,y,w,h,flip=false,rot=0,alpha=1,filter='none'){if(!im||!im.complete||!im.naturalWidth)return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(flip?-1:1,1);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.filter=filter;ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}
function drawSheet(im,x,y,frames,w,h,flip=false,alpha=1){if(!im||!im.complete)return;const f=sheetFrame(im,frames,world.time);if(!f)return;ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(im,f.sx,f.sy,f.sw,f.sh,-w/2,-h/2,w,h);ctx.restore()}
function drawSequence(keys,x,y,w,h,flip=false,alpha=1,fps=8,phase=0){const idx=Math.floor((world.time+phase)*fps)%keys.length,im=imgs[keys[idx]];drawImg(im,x,y,w,h,flip,0,alpha)}
function creatureDrawSize(sp,f){const d=creatureVisualDraw(f.key);return[d[0]*f.scale,d[1]*f.scale]}

function renderBackground(){
 const z=zoneForY(world.player.y),grad=ctx.createLinearGradient(0,0,0,view.h);grad.addColorStop(0,z.bg0);grad.addColorStop(1,z.bg1);ctx.fillStyle=grad;ctx.fillRect(0,0,view.w,view.h);
 if(imgs.bg.complete){const sc=Math.max(view.w/288,view.h/256)*1.12,iw=288*sc,ih=256*sc,off=(-world.camera.x*.06)%iw;ctx.save();ctx.globalAlpha=z.id==='abyss'?.06:z.id==='wreck'?.10:.16;for(let x=off-iw;x<view.w+iw;x+=iw)ctx.drawImage(imgs.bg,x,view.h-ih,iw,ih);ctx.restore()}
 if(imgs.mid.complete){const sc=Math.max(view.w/960,view.h/512)*1.02,iw=960*sc,ih=512*sc,off=(-world.camera.x*.13)%iw;ctx.save();ctx.globalAlpha=z.id==='reef'?.15:z.id==='kelp'?.09:.06;ctx.drawImage(imgs.mid,off-iw,view.h-ih,iw,ih);ctx.drawImage(imgs.mid,off,view.h-ih,iw,ih);ctx.drawImage(imgs.mid,off+iw,view.h-ih,iw,ih);ctx.restore()}

 ctx.save();
 if(z.id==='reef'){
   ctx.globalCompositeOperation='screen';ctx.globalAlpha=.24;
   for(let i=0;i<8;i++){const x=(i+.35)*view.w/8+Math.sin(world.time*.35+i)*28;ctx.fillStyle='rgba(232,255,211,.28)';ctx.beginPath();ctx.moveTo(x-18,0);ctx.lineTo(x+18,0);ctx.lineTo(x+115,view.h);ctx.lineTo(x-95,view.h);ctx.closePath();ctx.fill()}
   for(let i=0;i<16;i++){const x=(i*173-world.camera.x*.18)%Math.max(1,view.w+180)-60,y=(i*91+world.time*9)%Math.max(1,view.h);ctx.fillStyle=i%2?'rgba(255,208,111,.22)':'rgba(255,139,191,.16)';ctx.beginPath();ctx.arc(x,y,2+(i%3),0,Math.PI*2);ctx.fill()}
 }else if(z.id==='kelp'){
   ctx.fillStyle='rgba(18,104,72,.16)';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<13;i++){const x=((i*211-world.camera.x*.22)%(view.w+260))-90,h=view.h*(.45+(i%5)*.08),w=18+(i%4)*7;ctx.strokeStyle='rgba(22,95,63,.32)';ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,view.h+30);ctx.bezierCurveTo(x+Math.sin(world.time*.45+i)*28,view.h-h*.62,x-30,h*.45,x+Math.sin(world.time*.35+i)*16,view.h-h);ctx.stroke()}
 }else if(z.id==='ruins'){
   ctx.fillStyle='rgba(91,101,93,.12)';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<7;i++){const x=((i*310-world.camera.x*.10)%(view.w+420))-120,base=view.h*.88,h=120+(i%3)*70;ctx.fillStyle='rgba(26,50,58,.24)';ctx.fillRect(x,base-h,24,h);ctx.fillRect(x-22,base-h-10,68,12);if(i%2===0){ctx.strokeStyle='rgba(33,57,63,.22)';ctx.lineWidth=18;ctx.beginPath();ctx.arc(x+92,base-h+62,62,Math.PI,0);ctx.stroke()}}
   for(let i=0;i<22;i++){const x=(i*137+world.time*5)%Math.max(1,view.w),y=(i*71+world.time*11)%Math.max(1,view.h);ctx.fillStyle='rgba(205,211,186,.09)';ctx.fillRect(x,y,2,2)}
 }else if(z.id==='wreck'){
   ctx.fillStyle='rgba(81,54,42,.13)';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<26;i++){const x=(i*157-world.camera.x*.08+world.time*7)%(view.w+100)-50,y=(i*83+world.time*18)%(view.h+80)-40;ctx.fillStyle='rgba(187,147,111,'+(.05+(i%4)*.015)+')';ctx.beginPath();ctx.arc(x,y,1.5+(i%3),0,Math.PI*2);ctx.fill()}
   ctx.strokeStyle='rgba(62,37,31,.22)';ctx.lineWidth=5;for(let i=0;i<5;i++){const x=((i*390-world.camera.x*.16)%(view.w+300))-80;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+90,view.h);ctx.stroke()}
 }else{
   ctx.fillStyle='rgba(0,3,14,.38)';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<32;i++){const x=(i*113+Math.sin(i*9)*41-world.camera.x*.05)%(view.w+120)-60,y=(i*79+world.time*(4+i%3))%(view.h+90)-40;ctx.fillStyle=i%4===0?'rgba(152,106,255,.30)':'rgba(91,237,255,.24)';ctx.beginPath();ctx.arc(x,y,1.4+(i%4)*.55,0,Math.PI*2);ctx.fill()}
   const pp=screenPos(world.player.x,world.player.y),spot=ctx.createRadialGradient(pp.x,pp.y,80,pp.x,pp.y,Math.max(view.w,view.h)*.65);spot.addColorStop(0,'rgba(0,0,0,0)');spot.addColorStop(.38,'rgba(0,0,0,.08)');spot.addColorStop(1,'rgba(0,2,10,.78)');ctx.fillStyle=spot;ctx.fillRect(0,0,view.w,view.h)
 }
 ctx.restore()
}
function drawSurface(){const y=screenPos(0,WORLD.surface).y;if(y>-60&&y<view.h+60){ctx.fillStyle='rgba(211,251,255,.18)';ctx.fillRect(0,y-8,view.w,16);ctx.strokeStyle='rgba(220,255,255,.7)';ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<=view.w;x+=18){const yy=y+Math.sin(world.time*2+x*.035)*3;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.stroke()}}
function drawSurveyBoat(x,y,bob=0){
 ctx.save();ctx.translate(x,y+bob-19);ctx.imageSmoothingEnabled=false;
 // Deep Diver is side-view, so use a purpose-built side-profile research skiff instead of
 // stretching the top-down pirate dinghy sideways.
 ctx.fillStyle='rgba(8,31,42,.22)';ctx.beginPath();ctx.ellipse(0,30,78,10,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#173a49';ctx.beginPath();ctx.moveTo(-76,8);ctx.lineTo(74,8);ctx.lineTo(48,31);ctx.lineTo(-51,31);ctx.closePath();ctx.fill();
 ctx.fillStyle='#2f7182';ctx.beginPath();ctx.moveTo(-68,8);ctx.lineTo(66,8);ctx.lineTo(48,21);ctx.lineTo(-57,21);ctx.closePath();ctx.fill();
 ctx.fillStyle='#e7edf0';ctx.fillRect(-35,-17,61,25);ctx.fillStyle='#d9e5e9';ctx.fillRect(-28,-24,42,8);
 ctx.fillStyle='#164150';ctx.fillRect(-27,-13,16,12);ctx.fillRect(-7,-13,16,12);ctx.fillRect(13,-13,9,12);
 ctx.fillStyle='#f4b548';ctx.fillRect(-42,1,16,7);ctx.fillStyle='#4ad3dd';ctx.fillRect(-56,14,101,4);
 ctx.fillStyle='#d9e6e8';ctx.fillRect(31,-5,19,5);ctx.fillStyle='#253b43';ctx.fillRect(46,-9,5,14);
 ctx.fillStyle='#b6c9cf';ctx.fillRect(-4,-39,3,15);ctx.fillRect(-12,-39,19,3);ctx.fillStyle='#ff665f';ctx.fillRect(-3,-45,5,6);
 ctx.strokeStyle='#cbdde1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-55,-1);ctx.lineTo(-55,-12);ctx.lineTo(-36,-12);ctx.stroke();
 // Stern dive ladder extends into the water and makes the return point visually obvious.
 ctx.strokeStyle='#d5e5e8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(55,15);ctx.lineTo(64,36);ctx.moveTo(61,22);ctx.lineTo(54,24);ctx.moveTo(64,30);ctx.lineTo(57,32);ctx.stroke();
 ctx.restore()
}
function drawBoat(){
 if(!world?.boat)return;const p=screenPos(world.boat.x,world.boat.y),bob=Math.sin(world.time*1.8)*3;drawSurveyBoat(p.x,p.y,bob);const d=Math.hypot(world.player.x-world.boat.x,world.player.y-world.boat.y);
 if(d<230){ctx.save();ctx.textAlign='center';ctx.font='900 11px system-ui';ctx.fillStyle='#fff1a8';ctx.strokeStyle='rgba(0,20,28,.85)';ctx.lineWidth=4;const label=d<125?'E · 사다리로 올라가 낮 탐사 종료':'탐사선 · 수면 중앙';ctx.strokeText(label,p.x,p.y+bob+52);ctx.fillText(label,p.x,p.y+bob+52);ctx.restore()}
}
function drawHarvestables(){for(const h of world.harvestables){if(h.taken)continue;const p=screenPos(h.x,h.y);if(p.x<-80||p.x>view.w+80||p.y<-80||p.y>view.h+80)continue;const bob=Math.sin(world.time*1.4+h.phase)*2,[dw,dh]=h.draw||[34,44];drawImg(imgs[h.img],p.x,p.y+bob,dw*h.scale,dh*h.scale,false,0,.94);if(world.sonar>0){ctx.save();ctx.strokeStyle='#80f0c0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,22+h.difficulty*3,0,Math.PI*2);ctx.stroke();ctx.restore()}if(Math.hypot(h.x-world.player.x,h.y-world.player.y)<92){ctx.save();ctx.textAlign='center';ctx.font='800 9px system-ui';ctx.fillStyle='#eaffd9';ctx.fillText(h.name+' · '+catchMethodLabel(h.method)+(h.progress>0?' '+Math.round(h.progress*100)+'%':''),p.x,p.y-dh*.55-7);ctx.restore()}}}
function drawTraps(){for(const t of world.traps){const p=screenPos(t.x,t.y);drawImg(imgs.pickupBucket,p.x,p.y,34,34,false,0,.9);ctx.save();ctx.textAlign='center';ctx.font='800 9px system-ui';ctx.fillStyle=t.ready?'#ffdf78':'#c7edf2';ctx.fillText(t.ready?'통발 확인!':'통발 '+Math.max(0,Math.ceil(t.timer))+'초',p.x,p.y-24);ctx.restore()}}

function solidPalette(zone){return zone==='reef'?['#a08d66','#5d6652']:zone==='kelp'?['#3d7357','#183f3a']:zone==='ruins'?['#6f7168','#303f43']:zone==='wreck'?['#654b43','#292f36']:['#30354e','#111624']}
function drawZoneTerrainDetail(s,p){
 if(s.shape!=='rect')return;
 ctx.save();
 if(s.zone==='reef'){
  ctx.strokeStyle='rgba(241,210,129,.72)';ctx.lineWidth=6;ctx.beginPath();
  for(let x=0;x<=s.w;x+=18){const yy=p.y+Math.sin((x+s.x)*.035)*5;if(x===0)ctx.moveTo(p.x+x,yy);else ctx.lineTo(p.x+x,yy)}ctx.stroke();
  for(let x=55;x<s.w-30;x+=110){ctx.fillStyle=x%220<100?'rgba(255,145,153,.58)':'rgba(245,172,87,.62)';ctx.beginPath();ctx.arc(p.x+x,p.y-5,7,0,Math.PI*2);ctx.fill()}
 }else if(s.zone==='kelp'){
  ctx.fillStyle='rgba(21,71,50,.58)';ctx.fillRect(p.x,p.y-5,s.w,12);
  ctx.strokeStyle='rgba(50,151,85,.58)';ctx.lineWidth=5;for(let x=28;x<s.w;x+=48){ctx.beginPath();ctx.moveTo(p.x+x,p.y+2);ctx.quadraticCurveTo(p.x+x+Math.sin(world.time*.8+x)*9,p.y-25,p.x+x+4,p.y-48-(x%3)*8);ctx.stroke()}
 }else if(s.zone==='ruins'){
  ctx.strokeStyle='rgba(184,178,145,.28)';ctx.lineWidth=2;
  for(let y=18;y<s.h;y+=34){ctx.beginPath();ctx.moveTo(p.x+5,p.y+y);ctx.lineTo(p.x+s.w-5,p.y+y);ctx.stroke()}
  for(let x=36;x<s.w;x+=70){ctx.beginPath();ctx.moveTo(p.x+x,p.y+4);ctx.lineTo(p.x+x-8,p.y+s.h-6);ctx.stroke()}
  ctx.fillStyle='rgba(204,190,139,.22)';ctx.fillRect(p.x,p.y-4,s.w,8)
 }else if(s.zone==='wreck'){
  ctx.fillStyle='rgba(117,65,49,.42)';ctx.fillRect(p.x,p.y-5,s.w,10);
  ctx.strokeStyle='rgba(195,112,74,.28)';ctx.lineWidth=3;
  for(let x=20;x<s.w;x+=58){ctx.beginPath();ctx.moveTo(p.x+x,p.y+8);ctx.lineTo(p.x+x+28,p.y+s.h-10);ctx.stroke();ctx.fillStyle='rgba(214,157,113,.44)';ctx.beginPath();ctx.arc(p.x+x,p.y+8,3,0,Math.PI*2);ctx.fill()}
 }else{
  ctx.fillStyle='rgba(4,7,18,.72)';ctx.beginPath();ctx.moveTo(p.x,p.y+9);
  for(let x=0;x<=s.w;x+=24){const yy=p.y-6-((Math.floor((x+s.x)/24)%3)*9);ctx.lineTo(p.x+x,yy)}
  ctx.lineTo(p.x+s.w,p.y+18);ctx.lineTo(p.x,p.y+18);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(80,143,178,.18)';ctx.lineWidth=2;for(let x=35;x<s.w;x+=82){ctx.beginPath();ctx.moveTo(p.x+x,p.y+18);ctx.lineTo(p.x+x-16,p.y+s.h*.55);ctx.stroke()}
 }
 ctx.restore()
}
function terrainTopOffset(s,x){
  return Math.sin((s.x+x)*.031+s.y*.013)*7+Math.sin((s.x+x)*.083+s.y*.007)*3;
}
function drawTerrain(){
  for(const s of world.terrain){
    const p=screenPos(s.x,s.y),pal=solidPalette(s.zone);
    ctx.save();ctx.globalAlpha=.98;
    if(s.shape==='rect'){
      if(p.x>view.w+180||p.x+s.w<-180||p.y>view.h+180||p.y+s.h<-180){ctx.restore();continue}
      const g=ctx.createLinearGradient(0,p.y,0,p.y+s.h);g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(p.x,p.y+s.h);ctx.lineTo(p.x+s.w,p.y+s.h);
      for(let x=s.w;x>=0;x-=24)ctx.lineTo(p.x+x,p.y+terrainTopOffset(s,x));
      ctx.closePath();ctx.fill();
      const tile=imgs[s.edge==='sand'?'sand':'dirt'];
      if(tile&&tile.complete){
        const tw=38,th=28;ctx.globalAlpha=.83;
        for(let x=8;x<s.w-8;x+=34){
          const yy=terrainTopOffset(s,x)-8,rot=Math.sin((s.x+x)*.091)*.08;
          ctx.save();ctx.translate(p.x+x+tw/2,p.y+yy+th/2);ctx.rotate(rot);ctx.drawImage(tile,-tw/2,-th/2,tw,th);ctx.restore();
        }
      }
      ctx.globalAlpha=.26;ctx.fillStyle='#061a22';ctx.fillRect(p.x+8,p.y+s.h-18,Math.max(0,s.w-16),12);
      ctx.globalAlpha=1;drawZoneTerrainDetail(s,p);
    }else{
      if(p.x+s.r<-120||p.x-s.r>view.w+120||p.y+s.r<-120||p.y-s.r>view.h+120){ctx.restore();continue}
      const g=ctx.createRadialGradient(p.x-s.r*.28,p.y-s.r*.32,8,p.x,p.y,s.r*1.15);g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);ctx.fillStyle=g;
      ctx.beginPath();const pts=14;
      for(let i=0;i<pts;i++){
        const a=i/pts*Math.PI*2,wobble=.80+.13*Math.sin(i*2.17+s.x*.014)+.07*Math.sin(i*4.31+s.y*.009),rr=s.r*wobble,x=p.x+Math.cos(a)*rr,y=p.y+Math.sin(a)*rr;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();ctx.fill();
      const rock1=imgs.rockA,rock2=imgs.rockB;
      if(rock1?.complete||rock2?.complete){
        const parts=[[-.28,-.15,.78,false],[.22,.06,.88,true],[-.04,.28,.70,false]];
        for(let i=0;i<parts.length;i++){const [ox,oy,sc,flip]=parts[i],im=i===1?rock2:rock1;drawImg(im,p.x+s.r*ox,p.y+s.r*oy,s.r*sc,s.r*sc,flip,(i-1)*.16,.38)}
      }
      ctx.strokeStyle='rgba(215,236,228,.10)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x-s.r*.16,p.y-s.r*.18,s.r*.46,.9,3.9);ctx.stroke();
    }
    ctx.restore();
  }
}
function drawZoneLandmarks(){
 const onScreen=(p,m=240)=>p.x>-m&&p.x<view.w+m&&p.y>-m&&p.y<view.h+m;
 const clusters=[[420,270,'seaweedOrangeA',1.8],[1280,420,'seaweedPinkC',1.7],[2380,300,'seaweedGreenB',2.0],[3460,560,'seaweedOrangeB',1.9],[4760,370,'seaweedPinkB',1.8],[6120,540,'seaweedOrangeA',2.0]];
 for(const [x,y,t,sc] of clusters){const p=screenPos(x,y);if(onScreen(p))drawImg(imgs[t],p.x,p.y,72*sc,88*sc,false,Math.sin(world.time*.7+x)*.025,.92)}
 const stalks=[[360,920,3.0],[930,1180,4.0],[1860,880,3.8],[2640,1320,4.3],[3550,970,3.5],[4520,1280,4.1],[5480,900,3.9],[6350,1320,4.4]];
 for(let i=0;i<stalks.length;i++){const [x,y,sc]=stalks[i],p=screenPos(x,y),t=i%3===0?'seaweedGreenC':i%2?'seaweedA':'seaweedGreenB';if(onScreen(p,320))drawImg(imgs[t],p.x,p.y,72*sc,115*sc,i%2===0,Math.sin(world.time*.55+i)*.04,.86)}
 const ruins=[[520,1730,180],[1320,2060,150],[2460,1760,210],[3420,2200,165],[4580,1880,220],[5700,2120,175],[6420,1700,150]];
 ctx.save();for(const [x,y,h] of ruins){const p=screenPos(x,y);if(!onScreen(p,220))continue;ctx.fillStyle='rgba(44,57,59,.80)';ctx.fillRect(p.x-17,p.y-h,34,h);ctx.fillStyle='rgba(116,118,105,.72)';ctx.fillRect(p.x-29,p.y-h-10,58,13);ctx.fillRect(p.x-25,p.y-8,50,10);ctx.strokeStyle='rgba(156,151,123,.42)';ctx.lineWidth=3;ctx.strokeRect(p.x-17,p.y-h,34,h)}ctx.restore();
 const debris=[[760,2550,'wood1',1.0,-.25],[1480,2860,'wood2',1.2,.34],[2720,2460,'wood1',.9,.42],[3680,3010,'wood2',1.1,-.31],[4860,2680,'wood1',1.0,.18],[6040,3090,'wood2',1.2,-.22]];
 for(const [x,y,t,sc,rot] of debris){const p=screenPos(x,y);if(onScreen(p))drawImg(imgs[t],p.x,p.y,55*sc,38*sc,false,rot,.72,'brightness(.62) saturate(.65)')}
 ctx.save();for(let vi=0;vi<VENTS.length;vi++){const [x,y,sc]=VENTS[vi],p=screenPos(x,y);if(!onScreen(p,260))continue;ctx.fillStyle='#182132';ctx.beginPath();ctx.moveTo(p.x-34*sc,p.y);ctx.lineTo(p.x-12*sc,p.y-95*sc);ctx.lineTo(p.x+14*sc,p.y-88*sc);ctx.lineTo(p.x+38*sc,p.y);ctx.closePath();ctx.fill();for(let k=0;k<6;k++){const yy=p.y-105*sc-((world.time*22+k*31+vi*17)%150)*sc,xx=p.x+Math.sin(world.time*1.2+k)*12*sc;ctx.fillStyle=k%2?'rgba(120,105,255,.25)':'rgba(86,231,255,.34)';ctx.beginPath();ctx.arc(xx,yy,3+(k%3),0,Math.PI*2);ctx.fill()}}ctx.restore()
}
function drawDeepLandmarks(){
 const onScreen=(p,m=360)=>p.x>-m&&p.x<view.w+m&&p.y>-m&&p.y<view.h+m;
 // Whale fall: a dark whale body with exposed ribs and a cloud of feeding particles.
 let p=screenPos(WHALE_FALL.x,WHALE_FALL.y);if(onScreen(p,430)){
   drawImg(imgs.whale,p.x,p.y-58,330,170,false,-.04,.34,'grayscale(.7) brightness(.42) saturate(.35)');
   ctx.save();ctx.strokeStyle='rgba(224,222,202,.72)';ctx.lineWidth=5;ctx.lineCap='round';
   for(let i=0;i<7;i++){const x=p.x-54+i*18;ctx.beginPath();ctx.arc(x,p.y-38,30+i%2*5,.38,Math.PI-.28);ctx.stroke()}
   ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(p.x-75,p.y-35);ctx.lineTo(p.x+72,p.y-27);ctx.stroke();
   ctx.fillStyle='rgba(233,225,199,.70)';ctx.beginPath();ctx.ellipse(p.x+106,p.y-40,32,23,-.12,0,Math.PI*2);ctx.fill();
   for(let i=0;i<18;i++){const a=i*2.17+world.time*.42,r=42+(i%5)*18;ctx.fillStyle='rgba(182,214,206,'+(0.08+(i%4)*.025)+')';ctx.beginPath();ctx.arc(p.x+Math.cos(a)*r,p.y-20+Math.sin(a*.7)*34,1.5+(i%3),0,Math.PI*2);ctx.fill()}
   if(world.sonar>0){ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#dffcff';ctx.fillText('고래 낙하 지대',p.x,p.y-145)}
   ctx.restore();
 }
 // Crevasse: a jagged black cut that visually continues far below the traversable shelves.
 p=screenPos(DEEP_RIFT.x,DEEP_RIFT.y);if(onScreen(p,520)){
   ctx.save();const top=p.y-260,bottom=p.y+360,w=DEEP_RIFT.w*.5;
   const g=ctx.createLinearGradient(0,top,0,bottom);g.addColorStop(0,'rgba(0,0,4,.55)');g.addColorStop(.45,'rgba(0,0,3,.96)');g.addColorStop(1,'rgba(0,0,0,1)');ctx.fillStyle=g;
   ctx.beginPath();ctx.moveTo(p.x-w*.72,top);ctx.lineTo(p.x-w*.38,p.y-120);ctx.lineTo(p.x-w*.62,p.y+20);ctx.lineTo(p.x-w*.25,bottom);ctx.lineTo(p.x+w*.28,bottom);ctx.lineTo(p.x+w*.58,p.y+40);ctx.lineTo(p.x+w*.34,p.y-105);ctx.lineTo(p.x+w*.70,top);ctx.closePath();ctx.fill();
   ctx.strokeStyle='rgba(94,132,163,.20)';ctx.lineWidth=3;ctx.stroke();
   if(world.sonar>0){ctx.setLineDash([7,9]);ctx.strokeStyle='rgba(112,239,255,.36)';ctx.strokeRect(p.x-w*.76,top,p.x+w*.76-(p.x-w*.76),bottom-top);ctx.setLineDash([])}
   ctx.restore();
 }
 // Underwater volcano and caldera.
 p=screenPos(VOLCANO.x,VOLCANO.y);if(onScreen(p,620)){
   ctx.save();const pulse=(Math.sin(world.time*1.85)+1)*.5;
   const glow=ctx.createRadialGradient(p.x,p.y-135,12,p.x,p.y-135,235);glow.addColorStop(0,'rgba(255,126,61,'+(0.26+pulse*.18)+')');glow.addColorStop(1,'rgba(75,16,18,0)');ctx.fillStyle=glow;ctx.fillRect(p.x-250,p.y-390,500,430);
   ctx.fillStyle='#11131d';ctx.beginPath();ctx.moveTo(p.x-360,p.y+35);ctx.lineTo(p.x-170,p.y-130);ctx.lineTo(p.x-88,p.y-255);ctx.lineTo(p.x+95,p.y-245);ctx.lineTo(p.x+180,p.y-118);ctx.lineTo(p.x+360,p.y+35);ctx.closePath();ctx.fill();
   ctx.fillStyle='#02030a';ctx.beginPath();ctx.ellipse(p.x,p.y-240,98,30,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(252,104,59,'+(0.30+pulse*.25)+')';ctx.lineWidth=5;ctx.stroke();
   for(let i=0;i<13;i++){const yy=p.y-270-((world.time*(26+i%3*5)+i*47)%330),xx=p.x+Math.sin(world.time*.7+i*1.9)*(36+i*2);ctx.fillStyle=i%3?'rgba(74,99,127,.18)':'rgba(255,100,65,.16)';ctx.beginPath();ctx.arc(xx,yy,4+(i%4)*2,0,Math.PI*2);ctx.fill()}
   if(world.sonar>0){ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffd0bd';ctx.fillText('해저 화산 분화구',p.x,p.y-360)}
   ctx.restore();
 }
}
function drawForeground(){
  for(const d of world.foreground){
    const px=d.x-world.camera.x*d.parallax+view.w/2,py=d.y-world.camera.y*d.parallax+view.h/2;
    if(px<-150||px>view.w+150||py<-170||py>view.h+170)continue;
    const im=imgs[d.type],size=(d.type.startsWith('seaweed')?90:72)*d.scale;
    drawImg(im,px,py,size,size,d.flip,Math.sin(world.time*.45+d.x*.01)*.025,d.alpha);
  }
}
function drawDecor(){
 for(const d of world.decor){const p=screenPos(d.x,d.y);if(p.x<-90||p.x>view.w+90||p.y<-90||p.y>view.h+90)continue;const im=imgs[d.type];
 const base=d.type==='waterPlant2'?62:d.type==='grassClump'?54:d.type.startsWith('seaweed')?55:46,size=base*d.scale,alpha=d.type==='waterPlant2'?.82:d.type==='grassClump'?.76:.7;
 drawImg(im,p.x,p.y,size,size,d.flip,Math.sin(world.time*.55+d.x*.012)*.018,alpha)}
}
function drawProps(){
 for(const o of world.props){const p=screenPos(o.x,o.y);if(p.x<-130||p.x>view.w+130||p.y<-160||p.y>view.h+160)continue;if(!imgs.props.complete)continue;let s;if(o.type==='statue')s={sx:372,sy:24,sw:92,sh:215,w:80,h:188};else s={sx:145,sy:24,sw:195,sh:195,w:180,h:180};ctx.save();ctx.globalAlpha=.84;ctx.imageSmoothingEnabled=false;ctx.drawImage(imgs.props,s.sx,s.sy,s.sw,s.sh,p.x-s.w/2,p.y-s.h/2,s.w,s.h);if(world.sonar>0&&!o.done){ctx.strokeStyle='#6df5ff';ctx.lineWidth=3;ctx.strokeRect(p.x-s.w*.45,p.y-s.h*.45,s.w*.9,s.h*.9)}ctx.restore()}
}
function drawWreck(){
 const p=screenPos(WORLD.w*.72,2980);if(p.x<-300||p.x>view.w+300||p.y<-240||p.y>view.h+240)return;drawImg(imgs.wreck,p.x,p.y,260,150,false,.17,.42,'brightness(.52) saturate(.65)');drawImg(imgs.wood1,p.x-115,p.y+48,42,34,false,.3,.65,'brightness(.55)');drawImg(imgs.wood2,p.x+126,p.y+56,38,30,true,-.2,.65,'brightness(.55)')}
function drawPickups(){
 for(const q of world.pickups){
   if(q.taken)continue;const p=screenPos(q.x,q.y),bob=Math.sin(world.time*2.15+q.x*.009)*3;if(p.x<-80||p.x>view.w+80||p.y<-80||p.y>view.h+80)continue;
   const cargo=q.id.startsWith('cargo'),mineral=q.id.startsWith('ventMineral'),im=q.icon?imgs[q.icon]:null,size=q.iconSize||52;
   ctx.save();ctx.shadowColor=q.id==='relic'?'#f1d86b':cargo?'#ffd071':mineral?'#a97cff':'#6beafa';ctx.shadowBlur=10;
   if(im?.complete&&im.naturalWidth){ctx.restore();drawImg(im,p.x,p.y+bob,size,size,false,0,.98);ctx.save()}
   else{ctx.fillStyle=q.id==='relic'?'#cfb85a':cargo?'#c89445':mineral?'#8565cf':'#61dbe7';ctx.fillRect(p.x-14,p.y+bob-10,28,20)}
   ctx.shadowBlur=0;
   if(world.sonar>0){ctx.strokeStyle='#75f4ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y+bob,Math.max(24,size*.48)+Math.sin(world.time*5)*2,0,Math.PI*2);ctx.stroke()}
   if(Math.hypot(q.x-world.player.x,q.y-world.player.y)<90){ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(231,252,255,.94)';ctx.fillText(q.name,p.x,p.y+bob-size*.52-8)}
   ctx.restore()
 }
}
function drawFish(f){
 if(!f.alive)return;const sp=SPECIES[f.key],p=screenPos(f.x,f.y);if(p.x<-280||p.x>view.w+280||p.y<-220||p.y>view.h+220)return;const dir=f.faceDir||f.patrolDir||1,flip=sp.spriteFacing==='left'?dir>0:dir<0;
 const camo=f.hidden&&world.sonar<=0,alpha=camo?.20:(f.key==='giant'||sp.motion==='boss'?.98:.92),[dw,dh]=creatureDrawSize(sp,f);
 if(sp.stripFrames)drawTrimmedStrip(imgs[sp.img],p.x,p.y,sp.stripFrames,dw,dh,flip,alpha,sp.stripFps||6,f.phase);
 else if(f.key==='crab')drawSequence(['crab1','crab2'],p.x,p.y,dw,dh,flip,alpha,5,f.phase);
 else if(f.key==='jelly'){const attacking=f.alert>0||f.contactCd>0;drawSequence(attacking?JELLY_ATTACK_KEYS:JELLY_SWIM_KEYS,p.x,p.y,dw,dh,false,alpha,9,f.phase)}
 else if(f.key==='squid')drawSheet(imgs.squid,p.x,p.y,2,dw,dh,flip,alpha);
 else if(sp.animated)drawSheet(imgs[sp.img],p.x,p.y,sp.frames,sp.fw*1.75*f.scale,sp.fh*1.75*f.scale,flip,alpha);
 else drawImg(imgs[sp.img],p.x,p.y,dw,dh,flip,0,camo?.22:.9);
 if(camo){ctx.save();ctx.strokeStyle='rgba(113,235,188,.18)';ctx.setLineDash([4,7]);ctx.beginPath();ctx.arc(p.x,p.y,24+f.scale*8,0,Math.PI*2);ctx.stroke();ctx.restore()}
 if(f.attackMode==='windup'){
   const prof=ATTACK_PROFILE[f.key]||ATTACK_PROFILE.brown,t=clamp(f.attackT/Math.max(.01,prof.windup),0,1),r=30+f.scale*12+(1-t)*18;
   ctx.save();ctx.strokeStyle=f.key==='giant'?'rgba(255,82,58,.95)':f.key==='angler'?'rgba(130,245,255,.9)':'rgba(255,190,78,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();
   const pp=screenPos(world.player.x,world.player.y);ctx.globalAlpha=.34;ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(pp.x,pp.y);ctx.stroke();ctx.restore();
 }else if(f.attackMode==='lunge'){
   ctx.save();ctx.strokeStyle=f.key==='giant'?'rgba(255,102,70,.75)':'rgba(255,224,148,.58)';ctx.lineWidth=f.key==='giant'?8:4;ctx.globalAlpha=.72;ctx.beginPath();ctx.moveTo(p.x-f.vx*.16,p.y-f.vy*.16);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();
 }else if(f.alert>0&&HOSTILE_BEHAVIORS.has(sp.behavior)){ctx.strokeStyle=sp.behavior==='predator'?'rgba(255,92,72,.62)':'rgba(255,180,92,.48)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,28+f.scale*12+Math.sin(world.time*7)*3,0,Math.PI*2);ctx.stroke()}
 if(world.sonar>0&&(sp.rare||f.marked>0)){ctx.strokeStyle=(sp.motion==='boss'||sp===SPECIES.giant)?'#ff987d':'#73f2ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,34+Math.sin(world.time*5)*4+(sp.motion==='boss'?24:0),0,Math.PI*2);ctx.stroke()}
 if(sp.motion==='boss'&&f.alive){ctx.save();ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(255,235,206,.92)';ctx.fillText('대형 개체 · '+sp.name,p.x,p.y-dh*.55-10);ctx.restore()}
}
function drawMine(m){if(m.dead)return;const p=screenPos(m.x,m.y);if(p.x<-70||p.x>view.w+70||p.y<-70||p.y>view.h+70)return;const im=imgs[m.size==='B'?'mineB':m.size==='S'?'mineS':'mine'],s=m.size==='B'?60:m.size==='S'?38:50;drawImg(im,p.x,p.y,s,s,false,0,.9);if(world.sonar>0||m.fuse>0){ctx.strokeStyle=m.fuse>0?'#ff7465':'#6df4ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,s*.7+Math.sin(world.time*8)*4,0,Math.PI*2);ctx.stroke()}}
function sonarGuideTargets(){
 if(!world)return[];const p=world.player,out=[];
 if(world.boat)out.push({x:world.boat.x,y:world.boat.y,label:'탐사선 · 귀환',kind:'return'});
 for(const f of world.fish)if(f.alive&&SPECIES[f.key].rare){const sp=SPECIES[f.key],hostile=['territorial','ambush','predator'].includes(sp.behavior);out.push({x:f.x,y:f.y,label:sp.name,kind:hostile?'danger':'life'})}
 for(const q of world.pickups)if(!q.taken)out.push({x:q.x,y:q.y,label:q.name,kind:'objective'});
 for(const o of world.props)if(!o.done)out.push({x:o.x,y:o.y,label:o.id==='statue'?'침수 석상':'석조 아치',kind:'objective'});
 for(const m of world.mines)if(!m.dead)out.push({x:m.x,y:m.y,label:'기뢰',kind:'danger'});
 return out.map(t=>({...t,d:Math.hypot(t.x-p.x,t.y-p.y)})).sort((a,b)=>a.d-b.d).slice(0,7)
}
function drawSonarGuides(){
 if(!world||world.sonar<=0)return;const cx=view.w/2,cy=view.h/2,mx=46,my=86;
 ctx.save();ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
 for(const t of sonarGuideTargets()){
  const s=screenPos(t.x,t.y);if(s.x>32&&s.x<view.w-32&&s.y>72&&s.y<view.h-46)continue;
  const dx=s.x-cx,dy=s.y-cy;if(Math.abs(dx)<1&&Math.abs(dy)<1)continue;
  const sx=(cx-mx)/Math.max(Math.abs(dx),.001),sy=(cy-my)/Math.max(Math.abs(dy),.001),k=Math.min(sx,sy);
  const x=cx+dx*k,y=cy+dy*k,a=Math.atan2(dy,dx),col=t.kind==='danger'?'#ff856f':t.kind==='return'?'#ffe071':'#73f2ff';
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-8,-7);ctx.lineTo(-5,0);ctx.lineTo(-8,7);ctx.closePath();ctx.fill();ctx.restore();
  const dist=Math.max(1,Math.round(t.d/WORLD.scaleDepth));ctx.fillStyle='rgba(0,17,27,.76)';ctx.fillRect(x-38,y+12,76,17);ctx.fillStyle=col;ctx.fillText(t.label+' '+dist+'m',x,y+21);
 }
 ctx.restore()
}
function drawTether(){
 const t=world.tether;if(!t?.fish?.alive)return;const a=screenPos(world.player.x,world.player.y),b=screenPos(t.fish.x,t.fish.y);
 ctx.save();ctx.strokeStyle=t.tension>1?'#ff8e77':t.tension>.86?'#ffd66d':'#d8eef3';ctx.lineWidth=2+(t.reelPulse>0?1.5:0);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 ctx.fillStyle='rgba(0,18,28,.82)';ctx.fillRect((a.x+b.x)/2-34,(a.y+b.y)/2-12,68,16);ctx.fillStyle='#dffaff';ctx.font='800 9px system-ui';ctx.textAlign='center';ctx.fillText('릴 '+Math.round(t.progress*100)+'%',(a.x+b.x)/2,(a.y+b.y)/2);ctx.restore()
}
function drawShots(){for(const s of world.shots){const p=screenPos(s.x,s.y);ctx.strokeStyle='#d8eef3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-s.vx*.045,p.y-s.vy*.045);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle='#f7f1d2';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill()}}
function drawEffects(){for(const e of world.effects){const p=screenPos(e.x,e.y);if(e.type==='boom'){const im=e.big?imgs.explosionB:imgs.explosion,frames=10,fh=im.naturalHeight||82,fw=Math.floor((im.naturalWidth||660)/frames),fr=Math.min(frames-1,Math.floor(e.t/.075));ctx.save();ctx.globalAlpha=clamp(1-e.t/.8,0,1);ctx.imageSmoothingEnabled=false;if(im.complete)ctx.drawImage(im,fr*fw,0,fw,fh,p.x-45,p.y-45,90,90);ctx.restore()}else if(e.type==='spark'){ctx.save();ctx.globalAlpha=clamp(1-e.t/.35,0,1);ctx.strokeStyle='#d9f7ff';ctx.lineWidth=2;for(let i=0;i<5;i++){const a=i/5*Math.PI*2+e.t*3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(a)*(8+e.t*22),p.y+Math.sin(a)*(8+e.t*22));ctx.stroke()}ctx.restore()}else if(e.type==='wake'){ctx.save();ctx.globalAlpha=clamp(1-e.t/.65,0,1);ctx.strokeStyle=e.big?'rgba(255,143,110,.7)':'rgba(160,238,255,.62)';ctx.lineWidth=e.big?5:3;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(p.x,p.y,(18+i*13)+e.t*(e.big?115:70),0,Math.PI*2);ctx.stroke()}ctx.restore()}else{ctx.fillStyle='rgba(125,238,249,'+clamp(1-e.t/.6,0,1)+')';ctx.beginPath();ctx.arc(p.x,p.y,10+e.t*30,0,Math.PI*2);ctx.strokeStyle='#7eeef7';ctx.stroke()}}}
function playerAnim(){const p=world.player,speed=Math.hypot(p.vx,p.vy);if(p.inv>0)return{img:imgs.playerHurt};if(world.player.dashTime>0)return{img:imgs.playerRush};if(speed<18)return{img:imgs.playerIdle};if(speed>world.st.speed*.78)return{img:imgs.playerFast};return{img:imgs.playerSwim}}
function drawPlayer(){
 const p=screenPos(world.player.x,world.player.y),a=playerAnim(),im=a.img;if(!im||!im.complete)return;const frames=Math.max(1,Math.round(im.naturalWidth/im.naturalHeight)),f=sheetFrame(im,frames,world.time);const size=64;ctx.save();ctx.translate(p.x,p.y);ctx.scale(world.player.face<0?-1:1,1);if(world.player.inv>0)ctx.globalAlpha=.55+.35*Math.sin(world.time*25);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,f.sx,0,f.sw,f.sh,-size/2,-size/2,size,size);ctx.restore();
 for(let i=0;i<2;i++){ctx.fillStyle='rgba(210,249,255,.45)';ctx.beginPath();ctx.arc(p.x-world.player.face*26+i*5,p.y-12-i*6,2+i*.6,0,Math.PI*2);ctx.fill()}
}
function drawBubbles(){
 ctx.save();for(const b of world.bubbles){const p=screenPos(b.x,b.y);if(p.x<0||p.x>view.w||p.y<0||p.y>view.h)continue;ctx.strokeStyle='rgba(213,250,255,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,b.s,0,Math.PI*2);ctx.stroke()}ctx.restore()
}
function drawBiomeBoundaries(){
 const bands=[720,1500,2350,3250,4200];
 ctx.save();
 for(let i=0;i<bands.length;i++){
   const y=screenPos(0,bands[i]).y;if(y<-100||y>view.h+100)continue;
   const g=ctx.createLinearGradient(0,y-54,0,y+54);g.addColorStop(0,'rgba(170,245,255,0)');g.addColorStop(.48,'rgba(170,245,255,.09)');g.addColorStop(.52,'rgba(22,64,77,.22)');g.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=g;ctx.fillRect(0,y-54,view.w,108);
   ctx.strokeStyle='rgba(185,244,255,.16)';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<=view.w;x+=20){const yy=y+Math.sin(world.time*1.4+x*.028+i)*5;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.stroke();
 }
 ctx.restore()
}
function drawSubzoneFX(){
 const sub=subzoneForY(world.player.y),id=sub.id;
 ctx.save();
 if(id==='blueDrop'||id==='ruinWell'){
   ctx.globalAlpha=id==='blueDrop'?.12:.16;ctx.strokeStyle=id==='blueDrop'?'#c8fbff':'#a9c9d3';ctx.lineWidth=2;
   for(let x=28;x<view.w;x+=68){const off=(world.time*(id==='ruinWell'?95:70)+x*.7)%110;ctx.beginPath();ctx.moveTo(x,-20+off);ctx.lineTo(x+Math.sin(x)*6,38+off);ctx.stroke()}
 }
 if(id==='kelpEdge'||id==='kelpCathedral'){
   const a=id==='kelpCathedral'?.13:.08;ctx.fillStyle='rgba(12,76,48,'+a+')';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<8;i++){const x=((i*157-world.camera.x*.08)%(view.w+180))-60;ctx.strokeStyle='rgba(77,175,101,'+(a+.05)+')';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x,view.h+20);ctx.quadraticCurveTo(x+Math.sin(world.time+i)*20,view.h*.62,x+5,view.h*.34);ctx.stroke()}
 }
 if(id==='ruinGate'&&world.silt>0){
   ctx.globalAlpha=clamp(world.silt*.42,0,.42);ctx.fillStyle='rgba(127,116,89,.28)';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<42;i++){const x=(i*83+world.time*16)%Math.max(1,view.w),y=(i*57+world.time*24)%Math.max(1,view.h);ctx.fillStyle='rgba(218,204,165,.25)';ctx.fillRect(x,y,2+(i%3),2+(i%2))}
 }
 if(id==='ruinCourt'&&world.sonarCd>0){
   ctx.strokeStyle='rgba(170,226,235,.10)';ctx.lineWidth=2;const r=50+(world.time*32)%180;ctx.beginPath();ctx.arc(view.w/2,view.h/2,r,0,Math.PI*2);ctx.stroke()
 }
 if(id==='mineLane'){
   ctx.strokeStyle='rgba(255,104,83,.12)';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(view.w/2,view.h/2,110+i*75+Math.sin(world.time*2+i)*8,0,Math.PI*2);ctx.stroke()}
 }
 if(id==='cargoGrave'){
   for(let i=0;i<8;i++){const x=(i*173+world.time*12)%view.w,y=view.h*.64+Math.sin(world.time*.7+i)*48;ctx.fillStyle='rgba(255,211,117,.16)';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill()}
 }
 if(id==='blackwater'){
   const a=world.sonar>0?.16:.38;ctx.fillStyle='rgba(0,0,9,'+a+')';ctx.fillRect(0,0,view.w,view.h)
 }
 if(id==='ventValley'&&world.thermalLift>0){
   ctx.globalAlpha=clamp(world.thermalLift*.28,0,.24);ctx.strokeStyle='#92f4ff';ctx.lineWidth=2;
   for(let x=45;x<view.w;x+=85){const y=view.h-((world.time*95+x)%Math.max(1,view.h+120));ctx.beginPath();ctx.moveTo(x,y+70);ctx.lineTo(x+Math.sin(world.time+x)*9,y);ctx.stroke()}
 }
 if(id==='predatorTrench'){
   const pulse=.06+Math.max(0,Math.sin(world.time*1.6))*.045;const g=ctx.createRadialGradient(view.w/2,view.h/2,view.h*.18,view.w/2,view.h/2,Math.max(view.w,view.h)*.72);g.addColorStop(0,'rgba(55,0,0,0)');g.addColorStop(1,'rgba(120,9,18,'+pulse+')');ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h)
 }
 if(id==='whaleFall'||id==='riftAbyss'||id==='volcanoCaldera'){
   const inner=id==='whaleFall'?85:70,outer=Math.max(view.w,view.h)*.62,g=ctx.createRadialGradient(view.w/2,view.h/2,inner,view.w/2,view.h/2,outer);g.addColorStop(0,'rgba(0,0,6,.08)');g.addColorStop(.28,'rgba(0,1,8,.36)');g.addColorStop(1,'rgba(0,0,3,.86)');ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);
   if(id==='riftAbyss'){ctx.strokeStyle='rgba(100,164,196,.10)';ctx.lineWidth=2;for(let i=0;i<8;i++){const x=view.w*.5+Math.sin(i*2.2)*view.w*.34,y=((world.time*48+i*97)%Math.max(1,view.h+120))-60;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(world.time+i)*8,y+46);ctx.stroke()}}
   if(id==='volcanoCaldera'){ctx.fillStyle='rgba(95,15,8,'+(0.05+Math.max(0,Math.sin(world.time*1.85))*.05)+')';ctx.fillRect(0,0,view.w,view.h)}
 }
 ctx.restore()
}
function drawDangerFX(){
 const z=zoneForY(world.player.y),rule=ZONE_RULES[z.id]||ZONE_RULES.reef;
 if(rule.visibility<.98){ctx.save();ctx.fillStyle='rgba(0,7,14,'+((1-rule.visibility)*.34)+')';ctx.fillRect(0,0,view.w,view.h);ctx.restore()}
 if(world.zoneFlash>0){ctx.save();ctx.globalAlpha=world.zoneFlash*.13;ctx.fillStyle=z.accent;ctx.fillRect(0,0,view.w,view.h);ctx.restore()}
 if(world.envPulse>0){ctx.save();const g=ctx.createRadialGradient(view.w/2,view.h/2,view.h*.2,view.w/2,view.h/2,Math.max(view.w,view.h)*.7);g.addColorStop(0,'rgba(255,90,70,0)');g.addColorStop(1,'rgba(255,70,55,'+(world.envPulse*.16)+')');ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);ctx.restore()}
 if(world.lightJam>0){ctx.save();const a=clamp(world.lightJam*.22,0,.38),g=ctx.createRadialGradient(view.w/2,view.h/2,55,view.w/2,view.h/2,Math.max(view.w,view.h)*.62);g.addColorStop(0,'rgba(0,8,18,'+(a*.18)+')');g.addColorStop(.48,'rgba(0,6,16,'+(a*.55)+')');g.addColorStop(1,'rgba(0,0,8,'+a+')');ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);ctx.restore()}
 if(world.currentBurst>0){ctx.save();ctx.globalAlpha=clamp(world.currentBurst*.28,0,.22);ctx.strokeStyle='#b8f6ff';ctx.lineWidth=2;for(let y=90;y<view.h;y+=70){const off=(world.time*210+y*1.7)%180;ctx.beginPath();ctx.moveTo(-40+off,y);ctx.lineTo(120+off,y-18);ctx.stroke()}ctx.restore()}
}
function render(){
 if(!world)return;ctx.clearRect(0,0,view.w,view.h);renderBackground();drawSurface();drawBoat();drawBiomeBoundaries();drawZoneLandmarks();drawTerrain();drawDeepLandmarks();drawDecor();drawHarvestables();drawProps();drawWreck();drawPickups();for(const f of world.fish)drawFish(f);drawTraps();for(const m of world.mines)drawMine(m);drawSonarGuides();drawTether();drawShots();drawEffects();drawBubbles();drawPlayer();drawForeground();drawSubzoneFX();drawDangerFX();updateHud();updatePhotoLabel()
}
function updatePhotoLabel(){
 if(!world||world.tool!=='camera'){$('photoLabel').textContent='';return}
 const t=findCameraTarget();$('photoLabel').textContent=t?SPECIES[t.key].name+' · 예상 '+photoGrade(t)+'등급':'생물을 촬영 프레임 안에 넣으세요'
}
function currentContract(){return world?.contract}
function missionText(){
 if(!world)return'';const m=world.mission,id=world.contract.id;
 if(id==='free')return'자유 탐사 · 원하는 식재료를 모아 수면 중앙의 배로 돌아오세요.';
 if(id==='reef')return'B+ 촬영 '+['blue','orange','pink'].filter(k=>gradeAtLeast(m.photoGrades[k],'B')).length+'/3 · 산호 미로 '+(m.visited.reefMaze?'통과':'미탐사');
 if(id==='kelp')return'긴꼬리어 A+ '+(gradeAtLeast(m.photoGrades.long,'A')?(m.photoGrades.long+'등급'):'미달')+' · 식재료 '+m.samples+'/2 · 조류 협곡 '+(m.visited.currentCut?'통과':'미탐사');
 if(id==='ruins')return'유적 '+((m.statue?1:0)+(m.arch?1:0))+'/2 · 표식판 '+(m.relic?'회수':'미회수');
 if(id==='wreck')return'항해기록 장치 '+(m.recorder?'회수':'미회수')+' · 기뢰 주의';
 if(id==='hadal'){const deepPhoto=['angler','giantIsopod'].map(k=>m.photoGrades[k]).filter(Boolean).sort((a,b)=>GRADE_SCORE[b]-GRADE_SCORE[a])[0];return'고래 낙하 '+(m.visited.whaleFall?'도달':'미탐사')+' · 크레바스 '+(m.visited.riftAbyss?'도달':'미탐사')+' · 화산 '+(m.visited.volcanoCaldera?'도달':'미탐사')+' · 심해 생물 '+(deepPhoto||'미촬영')}
 return'600m '+(m.deep?'도달':'미도달')+' · 심해 상어 '+(m.giantGrade?m.giantGrade:'미촬영');
}
function missionComplete(){
 const m=world.mission,id=world.contract.id;
 if(id==='free')return false;
 if(id==='reef')return !!(['blue','orange','pink'].every(k=>gradeAtLeast(m.photoGrades[k],'B'))&&m.visited.reefMaze);
 if(id==='kelp')return !!(gradeAtLeast(m.photoGrades.long,'A')&&m.samples>=2&&m.visited.currentCut);
 if(id==='ruins')return !!(m.statue&&m.arch&&m.relic);
 if(id==='wreck')return !!m.recorder;
 if(id==='hadal')return !!(m.visited.whaleFall&&m.visited.riftAbyss&&m.visited.volcanoCaldera&&['angler','giantIsopod'].some(k=>gradeAtLeast(m.photoGrades[k],'A')));
 return !!(m.deep&&['A','S'].includes(m.giantGrade));
}
function updateHud(){
 const p=world.player,ox=clamp(p.oxygen/world.st.oxygen*100,0,100),hp=clamp(p.hp,0,100),dep=depthOf(p.y),reserve=oxygenReserveStatus();
 $('o2Text').textContent=Math.round(ox)+'%';$('o2Fill').style.width=ox+'%';$('hpText').textContent=Math.round(hp);$('hpFill').style.width=hp+'%';$('depthText').textContent=Math.round(dep)+'m';const z=zoneForY(p.y),sub=subzoneForY(p.y),sr=SUBZONE_RULES[sub.id]||{},pressure=world.pressureOver>0?' · 압력+'+Math.round(world.pressureOver)+'m':'';
 $('zoneText').textContent=sub.name+' · '+(sr.short||ZONE_RULES[z.id]?.danger||'')+pressure;
 $('missionName').textContent=world.contract.id==='free'?'자유 잠수':('선택 의뢰 · '+world.contract.title);$('missionText').textContent=missionText()+' · 오늘 '+world.daily.title+' '+dailyTaskProgressText(world.daily);$('bagText').textContent=world.catchWeight.toFixed(1)+' / '+world.st.catchCap+'kg';$('moneyText').textContent=money(world.income);$('sonarText').textContent=world.sonarCd>0?'SONAR '+world.sonarCd.toFixed(1)+'s':'SONAR READY';
 const rr=$('reserveText');if(rr){rr.textContent=reserve.label;rr.className='reserve-'+reserve.code}
}
function setTool(name){
 if(!world)return;if(GEAR_DEFS[name]&&!world.loadout.includes(name)){showHint(GEAR_DEFS[name].name+'은 오늘 빌려오지 않았습니다.',900);return}world.tool=name;document.body.classList.toggle('cameraMode',name==='camera');document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===name));const labels={camera:'카메라',sonar:'소나',...Object.fromEntries(Object.entries(GEAR_DEFS).map(([k,v])=>[k,v.name]))};showHint((labels[name]||name)+' 선택',700)
}
function nearestFrontFish(maxDist){
 const p=world.player,dir=p.face,arr=world.fish.filter(f=>f.alive).map(f=>({f,d:Math.hypot(f.x-p.x,f.y-p.y),front:(f.x-p.x)*dir,vert:Math.abs(f.y-p.y)})).filter(o=>o.front>0&&o.d<maxDist&&o.vert<maxDist*.55).sort((a,b)=>a.d-b.d);return arr[0]?.f||null
}
function photoFrameRect(){
 const el=$('photoFrame'),r=el?.getBoundingClientRect();
 if(!r||!r.width||!r.height)return{left:view.w*.5-95,right:view.w*.5+95,top:view.h*.5-65,bottom:view.h*.5+65,width:190,height:130};
 return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}
}
function findCameraTarget(){
 if(!world)return null;const r=photoFrameRect(),cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2,p=world.player;
 return world.fish.filter(f=>f.alive).map(f=>{const s=screenPos(f.x,f.y),front=(f.x-p.x)*p.face,dx=s.x-cx,dy=s.y-cy;return{f,s,front,score:dx*dx+dy*dy}})
  .filter(o=>o.front>-18&&o.s.x>=r.left&&o.s.x<=r.right&&o.s.y>=r.top&&o.s.y<=r.bottom)
  .sort((a,b)=>a.score-b.score)[0]?.f||null
}
function photoGrade(f){
 const r=photoFrameRect(),s=screenPos(f.x,f.y),cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;
 const nx=Math.abs(s.x-cx)/(r.width*.5),ny=Math.abs(s.y-cy)/(r.height*.5),center=clamp(1-Math.hypot(nx,ny)/1.25,0,1);
 const d=Math.hypot(f.x-world.player.x,f.y-world.player.y),ideal=world.st.camera*.52,range=clamp(1-Math.abs(d-ideal)/Math.max(ideal,1),0,1);
 let q=center*.78+range*.22;const sr=subRuleForY(f.y);if(sr.blackwater&&world.sonar<=0)q-=sr.photoPenalty||.14;
 return q>.82?'S':q>.64?'A':q>.44?'B':'C'
}
function betterGrade(a,b){if(!a)return b;if(!b)return a;return GRADE_SCORE[b]>GRADE_SCORE[a]?b:a}
function gradeAtLeast(g,min){return !!g&&GRADE_SCORE[g]>=GRADE_SCORE[min]}
function photoValue(f,grade){
 const sp=SPECIES[f.key],depth=depthOf(f.y),base=sp.rare?150:72,depthFactor=1+Math.min(1.15,depth/620*.9),sr=subRuleForY(f.y);
 const habitat=(sr.photo||1)*(sp.rare?(sr.rarePhoto||1):1);return Math.round(base*PHOTO_MULT[grade]*depthFactor*habitat)
}
function ratedDepth(){const ratings=[180,420,720,1150,1850,2750];return ratings[clamp(meta.up.suit||0,0,ratings.length-1)]}
function oxygenReserveStatus(){
 if(!world)return{code:'safe',label:'여유',ratio:9,need:0};const p=world.player,vertical=Math.max(0,p.y-WORLD.surface),salvageLoad=clamp(world.bagWeight/Math.max(1,world.st.bag),0,1),catchLoad=clamp(world.catchWeight/Math.max(1,world.st.catchCap),0,1),travel=vertical/Math.max(95,world.st.speed*world.st.ascent*.74)*1.48;
 const z=zoneForY(p.y),rule=ZONE_RULES[z.id]||ZONE_RULES.reef,pressure=1+Math.min(.8,(world.pressureOver||0)/180*.45),load=1+salvageLoad*.10+catchLoad*.16;
 const need=travel*rule.oxygen*pressure*load*world.st.ascentO2+8,ratio=p.oxygen/Math.max(1,need);
 return ratio>1.65?{code:'safe',label:'여유',ratio,need}:ratio>1.08?{code:'warn',label:'주의',ratio,need}:{code:'critical',label:'즉시 상승',ratio,need}
}
function useCamera(){
 const f=findCameraTarget();if(!f){showHint('촬영 대상을 앞쪽 프레임에 맞추세요.',1100);beep(180,.05);return}
 const grade=photoGrade(f),oldDive=world.mission.photoGrades[f.key]||null,newBest=betterGrade(oldDive,grade);
 f.photo=betterGrade(f.photo,grade);world.mission.photos[f.key]=true;world.mission.photoGrades[f.key]=newBest;
 meta.codex[f.key]=meta.codex[f.key]||{best:grade,count:0};meta.codex[f.key].count++;meta.codex[f.key].best=betterGrade(meta.codex[f.key].best,grade);
 const oldValue=oldDive?photoValue(f,oldDive):0,newValue=photoValue(f,newBest),bonus=Math.max(0,newValue-oldValue);
 if(bonus>0){world.income+=bonus;world.photoIncome+=bonus}
 if(f.key==='giant')world.mission.giantGrade=betterGrade(world.mission.giantGrade,grade);
 save();beep(1050,.06);setTimeout(()=>beep(1500,.07),65);world.effects.push({type:'flash',x:f.x,y:f.y,t:0});
 showHint(SPECIES[f.key].name+' · '+grade+'등급 촬영'+(bonus>0?' · 연구 +'+money(bonus):' · 기존 기록 유지'),1350)
}
function reelHarpoon(){
 const t=world.tether;if(!t||!t.fish?.alive){world.tether=null;return}
 t.progress=clamp(t.progress+.13+meta.up.harpoon*.018,0,1);t.reelPulse=.18;
 const f=t.fish,p=world.player,dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy)||1;f.x+=dx/d*(12+meta.up.harpoon*3);f.y+=dy/d*(12+meta.up.harpoon*3);
 beep(430,.035);showHint('릴 감기 · '+Math.round(t.progress*100)+'%',500)
}
function useSonar(){
 if(world.sonarCd>0){showHint('소나 재사용까지 '+world.sonarCd.toFixed(1)+'초',900);return}world.sonar=4.5;world.sonarCd=world.st.sonar;document.body.classList.add('sonarActive');setTimeout(()=>document.body.classList.remove('sonarActive'),1250);beep(220,.18);setTimeout(()=>beep(760,.12),80);
 const sr=subRuleForY(world.player.y);
 if(sr.sonarAggro){let n=0;for(const f of world.fish){const sp=SPECIES[f.key];if(!f.alive||!HOSTILE_BEHAVIORS.has(sp.behavior))continue;const d=Math.hypot(f.x-world.player.x,f.y-world.player.y);if(d<980){f.alert=Math.max(f.alert,2.2);f.specialCd=Math.min(f.specialCd,.18);n++}}showHint('소나 펄스가 포식자에게 들켰습니다! · 반응 '+n+'마리',1450)}
 else showHint('소나 펄스 · 희귀 생물과 위험물이 표시됩니다.',1200)
}
function preferredCatchMethod(sp,method){return !!sp.catchMethods?.includes(method)}
function fallbackCatchAllowed(sp,method,key=''){
 if(sp.protected||!(sp.weight>0))return false;
 const motion=sp.motion||'swimmer',size=creatureSizeClass(key);
 if(method==='harpoon')return SIZE_RANK[size]>=SIZE_RANK.medium&&SIZE_RANK[size]<=SIZE_RANK.large&&!['sessile','crawler','crawlerBoss','megafauna','boss'].includes(motion);
 if(method==='net')return SIZE_RANK[size]<=SIZE_RANK.small&&!['sessile','crawler','crawlerBoss','megafauna','boss'].includes(motion)&&!['predator','ambush'].includes(sp.behavior);
 return false
}
function fishAllowsMethod(f,method){const sp=SPECIES[f.key];return !!(!sp.protected&&(preferredCatchMethod(sp,method)||fallbackCatchAllowed(sp,method,f.key)))}
function nearestMethodFish(method,range=100){const p=world.player;return world.fish.filter(f=>f.alive&&fishAllowsMethod(f,method)).map(f=>({f,d:creatureEdgeDistance(f,p.x,p.y),front:(f.x-p.x)*(p.face||1)})).filter(o=>o.d<range&&(method==='gloves'||o.front>-28)).sort((a,b)=>a.d-b.d)[0]?.f||null}
function captureChance(difficulty,method){const tier=gearTier(method);return clamp(.56+tier*.11-(difficulty||1)*.09,.28,.96)}
function captureFish(f,method='harpoon'){
 const sp=SPECIES[f.key],check=captureCompatibility(f,method);if(!check.ok){showHint(captureBlockMessage(f,method,check),1250);return false}if(!canAddCatch(sp.weight))return false;
 f.alive=false;f.hooked=false;if(world.tether?.fish===f)world.tether=null;world.catchWeight+=sp.weight;world.bag.push(f.key);world.catchCounts[f.key]=(world.catchCounts[f.key]||0)+1;world.mission.samples++;beep(650,.06);showHint(sp.name+' 확보'+(check.preferred?'':' · 대체 장비')+' · '+sp.weight+'kg · 오늘 '+world.catchWeight.toFixed(1)+'/'+world.st.catchCap+'kg',1050);return true
}
function instantCapture(f,method){if(!f)return false;const sp=SPECIES[f.key],check=captureCompatibility(f,method);if(!check.ok){showHint(captureBlockMessage(f,method,check),1250);beep(170,.05,'sawtooth');return false}const difficulty=(sp.catchDifficulty||2)+(check.preferred?0:2),chance=captureChance(difficulty,method);if(Math.random()>chance){f.panic=Math.max(f.panic,1.8);f.vx+=(f.x-world.player.x>=0?1:-1)*(90+(sp.speed||20));beep(150,.05,'sawtooth');showHint(sp.name+' 포획 실패'+(check.preferred?'':' · 대체 장비')+' · '+GEAR_TIER_NAMES[gearTier(method)]+' '+catchMethodLabel(method)+'을 강화하면 쉬워집니다.',1150);return false}return captureFish(f,method)}
function useNet(){const tier=gearTier('net'),range=105+tier*18,p=world.player,candidates=world.fish.filter(f=>f.alive&&fishAllowsMethod(f,'net')).map(f=>({f,d:creatureEdgeDistance(f,p.x,p.y),front:(f.x-p.x)*(p.face||1)})).filter(o=>o.d<range&&o.front>-20).sort((a,b)=>a.d-b.d);if(!candidates.length){const near=world.fish.filter(f=>f.alive&&!SPECIES[f.key].protected&&SPECIES[f.key].weight>0).map(f=>({f,d:creatureEdgeDistance(f,p.x,p.y)})).filter(o=>o.d<range).sort((a,b)=>a.d-b.d)[0]?.f;if(near){const check=captureCompatibility(near,'net');showHint(captureBlockMessage(near,'net',check),1100)}else showHint('그물 범위 안에 잡을 수 있는 생물이 없습니다.',850);return}const maxCatch=tier>=4?3:tier>=3?2:1;let caught=0;for(const o of candidates.slice(0,maxCatch)){if(instantCapture(o.f,'net'))caught++}world.effects.push({type:'wake',x:p.x+p.face*42,y:p.y,t:0,big:false});beep(caught?620:190,.055)}
function nearestHarvest(method,range=90){const p=world.player;return world.harvestables.filter(h=>!h.taken&&h.method===method).map(h=>({h,d:Math.hypot(h.x-p.x,h.y-p.y)})).filter(o=>o.d<range).sort((a,b)=>a.d-b.d)[0]?.h||null}
function harvestNode(h,method){const tier=gearTier(method),power=.34+tier*.12,need=.55+(h.difficulty||1)*.28;h.progress=clamp(h.progress+power/need,0,1);if(h.progress<1){beep(method==='knife'?470:360,.035);showHint(h.name+' 채집 '+Math.round(h.progress*100)+'%',650);return false}if(!canAddCatch(h.weight)){h.progress=.82;return false}h.taken=true;world.catchWeight+=h.weight;world.catchCounts[h.key]=(world.catchCounts[h.key]||0)+1;world.mission.samples++;beep(820,.07);showHint(h.name+' 채집 완료 · '+h.weight+'kg',850);return true}
function useGloves(){const h=nearestHarvest('gloves',92+gearTier('gloves')*8);if(h){harvestNode(h,'gloves');return}const f=nearestMethodFish('gloves',78+gearTier('gloves')*10);if(f){instantCapture(f,'gloves');return}showHint('장갑으로 잡을 게·성게·패류가 가까이 없습니다.',850)}
function useKnife(){const h=nearestHarvest('knife',92+gearTier('knife')*9);if(h){harvestNode(h,'knife');return}showHint('채집칼로 벨 미역·다시마·해조가 가까이 없습니다.',850)}
function useTrap(){const tier=gearTier('trap'),max=1+Math.floor(tier/2);if(world.traps.length>=max){showHint('설치한 통발이 가득합니다. 잠시 기다리세요.',900);return}const p=world.player;world.traps.push({id:++world.trapSeq,x:p.x+p.face*34,y:p.y+18,timer:4.8-tier*.45,ready:false,tier});beep(430,.05);showHint('통발 설치 · 게나 오징어가 지나가면 자동으로 잡습니다.',950)}
function updateTraps(dt){for(const t of [...world.traps]){t.timer-=dt;if(t.timer>0)continue;const targets=world.fish.filter(f=>f.alive&&fishAllowsMethod(f,'trap')).map(f=>({f,d:creatureEdgeDistance(f,t.x,t.y)})).filter(o=>o.d<145+t.tier*18).sort((a,b)=>a.d-b.d);if(targets.length&&Math.random()<.60+t.tier*.09){if(captureFish(targets[0].f,'trap')){world.traps=world.traps.filter(x=>x!==t);beep(980,.06);continue}}t.timer=3.2;t.ready=true}}
function fireHarpoon(){const p=world.player;if(world.tether){reelHarpoon();return}if(world.shots.length>2)return;const speed=520+meta.up.harpoon*55+gearTier('harpoon')*18,ax=p.aimX||p.face||1,ay=p.aimY||0,mag=Math.hypot(ax,ay)||1,ux=ax/mag,uy=ay/mag;world.shots.push({x:p.x+ux*24,y:p.y+uy*24,vx:ux*speed,vy:uy*speed,life:world.st.harpoon/speed});beep(330,.04)}
function useTool(){if(!world)return;if(world.tool==='camera')useCamera();else if(world.tool==='harpoon')fireHarpoon();else if(world.tool==='net')useNet();else if(world.tool==='gloves')useGloves();else if(world.tool==='knife')useKnife();else if(world.tool==='trap')useTrap();else useSonar()}
function interact(){
 const p=world.player;if(world.boat&&Math.hypot(world.boat.x-p.x,world.boat.y-p.y)<125&&world.time>2){finishDive(true,'탐사선으로 돌아와 오늘의 낮 탐사를 마쳤습니다.');return}
 for(const q of world.pickups){if(q.taken)continue;if(Math.hypot(q.x-p.x,q.y-p.y)<72){if(world.bagWeight+q.weight>world.st.bag){showHint('인양 케이스 무게가 부족합니다.',1000);return}q.taken=true;world.bagWeight+=q.weight;world.bag.push(q.id);world.income+=q.value;if(q.id==='relic')world.mission.relic=true;if(q.id==='recorder')world.mission.recorder=true;beep(760,.08);showHint(q.name+' 회수 · +'+money(q.value)+' · '+q.weight+'kg',1250);return}}
 for(const o of world.props){if(o.done)continue;if(Math.hypot(o.x-p.x,o.y-p.y)<95){o.done=true;world.mission[o.id]=true;beep(880,.08);showHint((o.id==='statue'?'침수 석상':'거대 석조 아치')+' 기록 완료',1000);return}}showHint('가까운 조사 대상이나 탐사선이 없습니다.',800)
}
function hookFish(f){
 const sp=SPECIES[f.key],check=captureCompatibility(f,'harpoon');if(!check.ok){showHint(captureBlockMessage(f,'harpoon',check),1250);beep(170,.05);return false}if(!canAddCatch(sp.weight))return false;if(world.tether)return false;f.hooked=true;f.attackMode='';f.specialCd=Math.max(f.specialCd,3);f.panic=2;const struggle=1.05+sp.weight*.24+(sp.behavior==='predator'?.42:0)+(check.preferred?0:.38)-gearTier('harpoon')*.07;world.tether={fish:f,progress:0,tension:0,reelPulse:0,struggle};world.effects.push({type:'wake',x:f.x,y:f.y,t:0,big:false});beep(520,.055);showHint(sp.name+' 명중! 작살을 다시 사용해 릴을 감으세요.'+(check.preferred?'':' · 대체 장비라 더 거세게 저항합니다.'),1350);return true
}
function updateTether(dt){
 const t=world.tether;if(!t)return;const f=t.fish,p=world.player;if(!f?.alive){world.tether=null;return}
 t.reelPulse=Math.max(0,t.reelPulse-dt);const dx=f.x-p.x,dy=f.y-p.y,d=Math.hypot(dx,dy)||1,maxLine=world.st.harpoon*1.12,ux=dx/d,uy=dy/d;
 const struggleWave=.12+Math.abs(Math.sin(world.time*3.4+f.phase))*.17;t.tension=clamp(d/maxLine+struggleWave,0,1.4);
 if(t.tension>1.16){f.hooked=false;world.tether=null;showHint('작살 줄이 끊어졌습니다! 너무 멀어졌습니다.',1000);beep(110,.08,'sawtooth');return}
 const passive=(.12+meta.up.harpoon*.025)/Math.max(.9,t.struggle);t.progress=clamp(t.progress+dt*passive*(1-clamp(t.tension-.72,0,.65)),0,1);
 f.vx+=ux*(70+f.scale*16)*dt;f.vy+=uy*(55+f.scale*12)*dt;p.vx+=ux*18*dt;p.vy+=uy*18*dt;
 if(t.progress>=1)captureFish(f,'harpoon')
}
function explodeMine(m){
 if(m.dead)return;m.dead=true;world.effects.push({type:'boom',x:m.x,y:m.y,t:0,big:m.size==='B'});const d=Math.hypot(world.player.x-m.x,world.player.y-m.y);if(d<165){const dmg=Math.max(12,Math.round((46-d*.17)*world.st.armor));world.player.hp-=dmg;world.player.inv=1.1;showHint('기뢰 폭발! -'+dmg+' HP',1000);beep(90,.22,'sawtooth')}
 for(const other of world.mines){if(other===m||other.dead)continue;const md=Math.hypot(other.x-m.x,other.y-m.y);if(md<205&&(other.fuse<=0||other.fuse>.24)){other.fuse=.18;other.marked=.4}}
}

function nearestEcoFish(f,maxDist,predicate){
 let best=null,bd=maxDist;
 for(const o of nearbyFish(f.x,f.y,maxDist)){if(o===f||!o.alive||!predicate(o))continue;const d=Math.hypot(o.x-f.x,o.y-f.y);if(d<bd){bd=d;best=o}}
 return best?{fish:best,d:bd}:null
}
function nearestKelpCover(f,maxDist=240){
 let best=null,bd=maxDist;
 for(const d of world.decor){if(!(d.type?.startsWith('seaweed')||d.type==='waterPlant2'||d.type==='grassClump'))continue;const dd=Math.hypot(d.x-f.x,d.y-f.y);if(dd<bd){bd=dd;best=d}}
 return best?{cover:best,d:bd}:null
}
function startFishAttack(f,kind){
 const prof=ATTACK_PROFILE[f.key];if(!prof||f.specialCd>0||f.attackMode)return false;
 f.attackMode='windup';f.attackKind=kind||f.key;f.attackT=prof.windup;f.specialCd=prof.cooldown;f.alert=Math.max(f.alert,prof.windup+.5);f.hidden=false;
 if(f.key==='angler')world.lightJam=Math.max(world.lightJam,.72);
 return true
}
function launchFishAttack(f,p){
 const prof=ATTACK_PROFILE[f.key]||ATTACK_PROFILE.brown,dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy)||1;
 f.attackMode='lunge';f.attackT=prof.lunge;f.attackVx=dx/d*prof.speed;f.attackVy=dy/d*prof.speed;f.faceDir=Math.sign(f.attackVx)||f.faceDir;f.faceLock=.18;
 world.effects.push({type:'wake',x:f.x,y:f.y,t:0,big:f.key==='giant'||f.key==='kraken'});
 if(f.key==='giant'||f.key==='kraken'){world.envPulse=Math.max(world.envPulse,f.key==='kraken'?1:.85);beep(f.key==='kraken'?58:78,.12,'sawtooth')}
 else if(f.key==='angler'){world.lightJam=Math.max(world.lightJam,1.15);beep(145,.07,'sawtooth')}
 else beep(190,.045)
}
function fishHitPlayer(f,sp,p,st,mult=1){
 if(p.inv>0)return false;const prof=ATTACK_PROFILE[f.key],dmg=Math.max(1,Math.round((sp.damage||8)*(prof?.damage||1)*mult*st.armor));
 p.hp-=dmg;p.inv=.72;f.attackCd=1.1;
 const dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy)||1,bossKnock=f.key==='giant'||f.key==='kraken';p.vx+=dx/d*(bossKnock?155:72);p.vy+=dy/d*(bossKnock?155:72);
 if(f.key==='angler')world.lightJam=Math.max(world.lightJam,1.7);
 if(f.key==='giant')world.envPulse=1;
 showHint((prof?.label||'포식 생물 공격')+'! -'+dmg+' HP',760);beep(f.key==='giant'?70:105,.10,'sawtooth');return true
}
function updateFishAI(f,dt,p,st){
 const sp=SPECIES[f.key],dx=p.x-f.x,dy=p.y-f.y,dist=Math.hypot(dx,dy)||1,behavior=sp.behavior||'flee',playerSub=subzoneForY(p.y),playerRule=SUBZONE_RULES[playerSub.id]||{},senseMod=(world.sonar>0?1:(playerRule.stealth||1))*(playerRule.predatorAggro||1);
 f.marked=Math.max(0,f.marked-dt);f.attackCd=Math.max(0,f.attackCd-dt);f.alert=Math.max(0,f.alert-dt);f.specialCd=Math.max(0,f.specialCd-dt);f.panic=Math.max(0,f.panic-dt);f.feeding=Math.max(0,f.feeding-dt);f.contactCd=Math.max(0,(f.contactCd||0)-dt);f.faceLock=Math.max(0,(f.faceLock||0)-dt);f.turnLock=Math.max(0,(f.turnLock||0)-dt);
 // Fauna movement classes keep the sea from feeling like one large school of fish.
 if(sp.motion==='sessile'){f.vx=0;f.vy=0;return}
 if(sp.motion==='megafauna'){
   const half=Math.max(90,creatureBodyMetrics(f).w*.48),left=half+35,right=WORLD.w-half-35;
   if(f.x<=left&&f.patrolDir<0){f.patrolDir=1;f.faceDir=1;f.faceLock=.25}
   else if(f.x>=right&&f.patrolDir>0){f.patrolDir=-1;f.faceDir=-1;f.faceLock=.25}
   f.vx=lerp(f.vx,f.patrolDir*(sp.speed||34),clamp(dt*.72,0,1));f.vy=Math.sin(world.time*.28+f.phase)*4;f.x=clamp(f.x+f.vx*dt,left,right);f.y=clamp(f.y+f.vy*dt,zoneForY(f.baseY).y0+90,zoneForY(f.baseY).y1-90);
   if(Math.abs(f.vx)>8&&f.faceLock<=0)f.faceDir=Math.sign(f.vx)||f.faceDir;return
 }
 if(sp.motion==='crawler'){
   const left=f.patrolMin??(f.homeX-230),right=f.patrolMax??(f.homeX+230);
   if(f.x>=right&&f.patrolDir>0){f.patrolDir=-1;f.faceDir=-1;f.faceLock=.18}
   else if(f.x<=left&&f.patrolDir<0){f.patrolDir=1;f.faceDir=1;f.faceLock=.18}
   f.vx=lerp(f.vx,f.patrolDir*(sp.speed||24),clamp(dt*1.25,0,1));f.x=clamp(f.x+f.vx*dt,left,right);f.y=f.baseY+Math.sin(world.time*2.2+f.phase)*1.2;return
 }
 if(sp.motion==='drifter'){
   const left=f.homeX-420,right=f.homeX+420;
   if(f.x>=right&&f.patrolDir>0){f.patrolDir=-1;f.faceDir=-1;f.faceLock=.20}
   else if(f.x<=left&&f.patrolDir<0){f.patrolDir=1;f.faceDir=1;f.faceLock=.20}
   f.vx=lerp(f.vx,f.patrolDir*(sp.speed||28)+Math.sin(world.time*.37+f.phase)*5,clamp(dt*.8,0,1));f.vy=Math.sin(world.time*.75+f.phase)*9;f.x+=f.vx*dt;f.y+=f.vy*dt;
   const zz=zoneForY(f.baseY);f.y=clamp(f.y,zz.y0+45,zz.y1-45);if(Math.abs(f.vx)>8&&f.faceLock<=0)f.faceDir=Math.sign(f.vx)||f.faceDir;return
 }
 if(sp.motion==='jelly'){
   f.vx=lerp(f.vx,Math.sin(world.time*.31+f.phase)*18,clamp(dt*.8,0,1));f.vy=Math.sin(world.time*.95+f.phase)*18-5;f.x+=f.vx*dt;f.y+=f.vy*dt;const zz=zoneForY(f.baseY);f.y=clamp(f.y,zz.y0+50,zz.y1-50);
   if(creaturePointHit(f,p.x,p.y,22)&&f.contactCd<=0&&p.inv<=0){const dmg=Math.max(2,Math.round((sp.damage||7)*st.armor));p.hp-=dmg;p.inv=.55;f.contactCd=1.5;f.alert=.9;p.vx*=.55;p.vy*=.55;world.lightJam=Math.max(world.lightJam,.32);showHint('해파리 촉수 접촉! -'+dmg+' HP · 추진력 저하',800);beep(150,.07,'sawtooth')}return
 }
 if(sp.motion==='jet'&&dist<180&&f.specialCd<=0){const ex=f.x-p.x,ey=f.y-p.y,ed=Math.hypot(ex,ey)||1;f.vx=ex/ed*(sp.speed||88)*2.4;f.vy=ey/ed*(sp.speed||88)*1.9;f.specialCd=1.6;f.panic=1.4;world.effects.push({type:'wake',x:f.x,y:f.y,t:0,big:false})}
 if(sp.motion==='crawlerBoss'){
   const left=f.patrolMin??(f.homeX-170),right=f.patrolMax??(f.homeX+170);
   if(f.x>=right&&f.patrolDir>0){f.patrolDir=-1;f.faceDir=-1;f.faceLock=.18}
   else if(f.x<=left&&f.patrolDir<0){f.patrolDir=1;f.faceDir=1;f.faceLock=.18}
   f.y=f.baseY+Math.sin(world.time*2+f.phase)*1.1;
   if(!world.bossSeen.mantis&&dist<330){world.bossSeen.mantis=true;showHint('대형 공작갯가재 발견 · 펀치 직전 경고를 보고 피하세요!',2100)}
 }
 if(sp.motion==='boss'&&!world.bossSeen.kraken&&dist<720){world.bossSeen.kraken=true;world.envPulse=.75;showHint('소나에 거대한 생체 반응! · 심해 크라켄',2300);beep(72,.18,'sawtooth')}
 if(f.attackMode){f.attackT-=dt;if(f.attackMode==='windup'&&f.attackT<=0)launchFishAttack(f,p);else if(f.attackMode==='lunge'&&f.attackT<=0){f.attackMode='recover';f.attackT=f.key==='giant'?.75:.46}else if(f.attackMode==='recover'&&f.attackT<=0){f.attackMode='';f.attackKind=''}}
 const homeDx=f.homeX-f.x,homeDy=f.baseY-f.y;
 let tx=f.vx,ty=Math.sin(world.time*.9+f.phase)*8;

 // Ecological layer: prey reacts to nearby predators; school fish actually align/cohere/separate.
 if(!HOSTILE_BEHAVIORS.has(behavior)){
   const threat=nearestEcoFish(f,behavior==='skittish'?230:165,o=>HOSTILE_BEHAVIORS.has(SPECIES[o.key]?.behavior));
   if(threat){const o=threat.fish,ex=f.x-o.x,ey=f.y-o.y,ed=Math.hypot(ex,ey)||1;f.panic=Math.max(f.panic,.8);tx+=ex/ed*(behavior==='skittish'?205:145);ty+=ey/ed*(behavior==='skittish'?175:120)}
 }
 if(behavior==='school'){
   let n=0,ax=0,ay=0,cx=0,cy=0,sx=0,sy=0;
   for(const o of nearbyFish(f.x,f.y,170)){if(o===f||!o.alive||o.key!==f.key)continue;const qx=o.x-f.x,qy=o.y-f.y,qd=Math.hypot(qx,qy);if(qd>170)continue;n++;ax+=o.vx;ay+=o.vy;cx+=o.x;cy+=o.y;if(qd<54&&qd>0){sx-=qx/qd*(54-qd);sy-=qy/qd*(54-qd)}}
   if(n){ax/=n;ay/=n;cx=cx/n-f.x;cy=cy/n-f.y;tx+=ax*.18+cx*.045+sx*.85;ty+=ay*.18+cy*.045+sy*.85}
   tx+=(f.patrolDir||1)*(sp.speed||42)*.22;ty+=Math.sin(world.time*1.3+f.phase)*8;
   if(dist<105){tx-=dx/dist*125;ty-=dy/dist*95;f.panic=.6}
 }else if(behavior==='flee'||behavior==='skittish'){
   const trigger=behavior==='skittish'?195:120;
   if(dist<trigger){f.panic=.9;const cover=behavior==='skittish'?nearestKelpCover(f,260):null;if(cover){const cx=cover.cover.x-f.x,cy=cover.cover.y-f.y,cd=Math.hypot(cx,cy)||1;tx=cx/cd*175;ty=cy/cd*150;f.hidden=cover.d<72}else{tx-=dx/dist*(behavior==='skittish'?205:135);ty-=dy/dist*(behavior==='skittish'?165:105)}f.alert=.8}
   else{f.hidden=behavior==='skittish'&&nearestKelpCover(f,64)?.d<64;tx+=(f.patrolDir||1)*(sp.speed||48)*.28;ty+=homeDy*.025}
 }else{
   // Hostile fish also hunt the ecosystem when the diver is not the closest target.
   const prey=nearestEcoFish(f,f.key==='giant'||f.key==='kraken'?430:285,o=>!HOSTILE_BEHAVIORS.has(SPECIES[o.key]?.behavior)&&!['sessile','megafauna','boss'].includes(SPECIES[o.key]?.motion));
   const huntPrey=prey&&prey.d<dist*.82&&f.attackMode!=='windup'&&f.attackMode!=='lunge';
   if(huntPrey){const o=prey.fish,hx=o.x-f.x,hy=o.y-f.y,hd=Math.hypot(hx,hy)||1;tx=hx/hd*(sp.speed||90)*1.12;ty=hy/hd*(sp.speed||90)*1.05;f.alert=.55;if(prey.d<34&&f.feeding<=0){o.panic=2.2;o.vx+=hx/hd*190;o.vy+=hy/hd*150;f.feeding=.9}}
   if(!huntPrey){
     const prof=ATTACK_PROFILE[f.key];
     if(behavior==='territorial'){
       if(dist<(prof?.sense||220)*senseMod){f.alert=1.1;if(!f.attackMode&&f.specialCd<=0)startFishAttack(f,f.key);tx=dx/dist*(sp.speed||70)*1.05;ty=dy/dist*(sp.speed||70)*.82}
       else{tx=homeDx*.18+(f.patrolDir||1)*(sp.speed||60)*.45;ty=homeDy*.12}
     }else if(behavior==='ambush'){
       f.hidden=dist>185&&f.attackMode!=='lunge'&&world.sonar<=0;
       if(dist<(prof?.sense||265)*senseMod){f.alert=1.4;if(!f.attackMode&&f.specialCd<=0)startFishAttack(f,'ambush');tx=dx/dist*(sp.speed||105)*1.12;ty=dy/dist*(sp.speed||105)*.98}
       else{tx*=.92;ty=homeDy*.08+Math.sin(world.time*.45+f.phase)*3}
     }else if(behavior==='predator'){
       const sense=(prof?.sense||(f.key==='giant'?590:390))*senseMod;
       if(dist<sense){f.alert=1.2;if(!f.attackMode&&f.specialCd<=0&&dist<sense*.78)startFishAttack(f,f.key==='giant'?'giantCharge':'hunterCharge');const chase=(sp.speed||112)*(f.key==='giant'||f.key==='kraken'?1.38:1.26)*(playerRule.predatorAggro||1);tx=dx/dist*chase;ty=dy/dist*chase}
       else{tx=homeDx*.08+(f.patrolDir||1)*(sp.speed||90)*.38;ty=homeDy*.06}
     }
   }
 }

 if(f.attackMode==='windup'){tx*=.32;ty*=.32}
 if(f.attackMode==='lunge'){tx=f.attackVx;ty=f.attackVy;if(f.key==='giant'){const near=Math.hypot(p.x-f.x,p.y-f.y);if(near<160){p.vx+=f.vx*.08*dt;p.vy+=f.vy*.08*dt;world.envPulse=Math.max(world.envPulse,.38)}}}
 if(f.attackMode==='recover'){tx*=.58;ty*=.58}
 if(sp.motion==='crawlerBoss'){ty=0;if(f.attackMode==='lunge')tx=(Math.sign(f.attackVx)||f.patrolDir||1)*(ATTACK_PROFILE.mantis?.speed||460)}
 const dangerBoost=behavior==='predator'?1.52:behavior==='ambush'?1.42:behavior==='territorial'?1.28:1,max=(sp.speed||50)*(f.attackMode==='lunge'?4.0:f.alert>0?1.65*dangerBoost:1.05),mag=Math.hypot(tx,ty)||1;
 if(mag>max){tx=tx/mag*max;ty=ty/mag*max}
 f.vx=lerp(f.vx,tx,clamp(dt*(f.attackMode==='lunge'?9:behavior==='predator'||behavior==='ambush'?3.1:1.8),0,1));
 f.vy=lerp(f.vy,ty,clamp(dt*(f.attackMode==='lunge'?9:2.2),0,1));
 const prevX=f.x,prevY=f.y;f.x+=f.vx*dt;f.y+=f.vy*dt;
 if(f.x<55){f.x=55;f.patrolDir=1;f.vx=Math.abs(f.vx)*.65;f.faceDir=1;f.faceLock=.18}
 else if(f.x>WORLD.w-55){f.x=WORLD.w-55;f.patrolDir=-1;f.vx=-Math.abs(f.vx)*.65;f.faceDir=-1;f.faceLock=.18}
 if(Math.abs(f.vx)>12&&f.faceLock<=0){const nd=Math.sign(f.vx)||f.faceDir;if(nd!==f.faceDir){f.faceDir=nd;f.faceLock=.16}}
 const zone=zoneForY(f.baseY);f.y=clamp(f.y,zone.y0+26,zone.y1-24);
 if(sp.motion==='crawlerBoss'){f.y=lerp(f.y,f.baseY,clamp(dt*7,0,1));if(f.patrolMin!=null&&f.x<f.patrolMin){f.x=f.patrolMin;f.patrolDir=1}if(f.patrolMax!=null&&f.x>f.patrolMax){f.x=f.patrolMax;f.patrolDir=-1}}
 const body=creatureBodyMetrics(f);if(world.terrain.some(t=>pointInSolid(f.x,f.y,t,body.terrainPad))){
   f.x=prevX;f.y=prevY;
   if(f.turnLock<=0){f.patrolDir=(f.vx>=0?-1:1);f.faceDir=f.patrolDir;f.turnLock=.55;f.faceLock=.20}
   f.vx=f.patrolDir*Math.max(12,(sp.speed||50)*.58);f.vy=(Math.sin(f.phase)>=0?1:-1)*Math.max(8,(sp.speed||50)*.24);
   if(world.terrain.some(t=>pointInSolid(f.x,f.y,t,body.terrainPad))){const safe=safeCreatureSpawn(f.key,f.homeX,f.baseY,subzoneForY(f.baseY).id);f.x=f.homeX=f.baseX=safe.x;f.y=f.baseY=safe.y;f.patrolMin=safe.patrolMin;f.patrolMax=safe.patrolMax}
   if(f.attackMode==='lunge'){f.attackMode='recover';f.attackT=.34}
 }
 const hitDist=Math.hypot(p.x-f.x,p.y-f.y),bodyHit=creaturePointHit(f,p.x,p.y,22);
 if(!f.hooked&&HOSTILE_BEHAVIORS.has(behavior)&&bodyHit&&f.attackCd<=0){
   const special=f.attackMode==='lunge';if(fishHitPlayer(f,sp,p,st,special?1.16:.68)&&special){f.attackMode='recover';f.attackT=f.key==='giant'?.82:.52}
 }
}
function applyZoneEnvironment(dt,p){
 const z=zoneForY(p.y),sub=subzoneForY(p.y),rule=ZONE_RULES[z.id]||ZONE_RULES.reef,sr=SUBZONE_RULES[sub.id]||{};
 if(rule.current){
   const pulse=Math.sin(world.time*.72+p.y*.011)+Math.sin(world.time*.27+p.x*.004)*.5;
   p.vx+=rule.current*pulse*dt;
   if(z.id==='kelp')p.vy+=Math.cos(world.time*.55+p.x*.003)*18*dt;
 }
 if(sr.vertical){p.vy+=sr.vertical*dt;world.currentBurst=Math.max(world.currentBurst,.10+Math.abs(Math.sin(world.time*1.2))*.12)}
 if(sr.dashSilt&&p.dashTime>0){world.silt=Math.max(world.silt,.95);world.lightJam=Math.max(world.lightJam,.24)}
 if(sr.surge){
   const surge=Math.sin(world.time*.92+p.y*.006);world.currentBurst=Math.max(0,Math.abs(surge)-.62);
   if(Math.abs(surge)>.62){const force=92*(Math.abs(surge)-.62)/.38;p.vx+=Math.sign(surge)*force*dt;p.vy+=Math.sin(world.time*1.7)*24*dt;world.envPulse=Math.max(world.envPulse,.18)}
 }
 if(sr.blackwater){world.lightJam=Math.max(world.lightJam,world.sonar>0?.16:.82)}
 if(z.id==='wreck'){
   for(const m of world.mines)if(!m.dead&&Math.hypot(m.x-p.x,m.y-p.y)<175)world.envPulse=Math.max(world.envPulse,.78);
 }
 if(sr.thermal){
   let nearVent=false;
   for(const [vx,vy,sc] of VENTS){
     const d=Math.hypot(vx-p.x,vy-p.y),burst=(Math.sin(world.time*2.4+vx*.01)+1)*.5;
     if(d<180*sc&&burst>.45){nearVent=true;p.vy-=52*sc*dt;world.thermalLift=Math.max(world.thermalLift,.5)}
     if(d<125*sc&&burst>.68&&p.inv<=0){
       const dmg=Math.round(9*ZONE_RULES.abyss.oxygen*world.st.armor);p.hp-=dmg;p.inv=.82;p.vy-=130;p.vx+=(p.x-vx)/(d||1)*85;world.envPulse=1;
       showHint('열수 분출! -'+dmg+' HP · 상승류에 밀려납니다.',700);beep(120,.10,'sawtooth');break
     }
   }
   if(!nearVent)world.thermalLift=Math.max(0,world.thermalLift-dt);
 }else if(z.id==='abyss'){
   world.envPulse=Math.max(world.envPulse,.32+Math.sin(world.time*2)*.08);
 }
 if(sr.riftPull){const dx=DEEP_RIFT.x-p.x,ad=Math.abs(dx);if(ad<720){const pull=(1-ad/720)*105;p.vx+=Math.sign(dx)*pull*.45*dt;p.vy+=pull*1.1*dt;world.currentBurst=Math.max(world.currentBurst,.22+pull/180)}}
 if(sr.volcano){const dx=p.x-VOLCANO.x,dy=p.y-(VOLCANO.y-150),d=Math.hypot(dx,dy),pulse=(Math.sin(world.time*1.85)+1)*.5;if(d<420&&pulse>.62){world.envPulse=Math.max(world.envPulse,.65);p.vy-=42*dt;if(d<235&&pulse>.80&&p.inv<=0){const dmg=Math.max(5,Math.round(12*world.st.armor));p.hp-=dmg;p.inv=.86;p.vx+=dx/(d||1)*90;p.vy-=110;showHint('해저 화산 가스 폭발! -'+dmg+' HP',850);beep(92,.12,'sawtooth')}}}
 if(z.id==='hadal')world.envPulse=Math.max(world.envPulse,.22+Math.max(0,Math.sin(world.time*.9))*.06);
}
function applySubzoneTerrainHazard(hit,p,speed){
 if(!hit||world.scrapeCd>0)return;const sub=subzoneForY(p.y),sr=SUBZONE_RULES[sub.id]||{};if(!sr.terrainHazard)return;
 const threshold=sr.terrainHazard==='coral'?82:102;if(speed<threshold)return;
 const dmg=Math.max(2,Math.round((sr.terrainHazard==='coral'?3:5)*world.st.armor));p.hp-=dmg;p.inv=Math.max(p.inv,.34);world.scrapeCd=.82;world.envPulse=Math.max(world.envPulse,.38);
 showHint(sr.terrainHazard==='coral'?'산호 가시에 스쳤습니다! -'+dmg+' HP':'날카로운 잔해에 장비가 긁혔습니다! -'+dmg+' HP',760);beep(125,.06,'sawtooth')
}
function applyDepthPressure(dt,p,dep){
 const rating=ratedDepth(),over=Math.max(0,dep-rating);world.pressureOver=over;
 if(over<=0){world.pressureState='safe';world.pressureTick=0;return}
 world.envPulse=Math.max(world.envPulse,clamp(.12+over/260*.35,.12,.48));
 if(world.pressureState==='safe'){world.pressureState='over';showHint('장비 권장 수심 '+Math.round(rating)+'m 초과 · 산소 소모와 압력 위험 증가',1800)}
 if(over>42){world.pressureTick-=dt;if(world.pressureTick<=0&&p.inv<=0){const dmg=Math.max(2,Math.round((2+over/85)*world.st.armor));p.hp-=dmg;p.inv=.32;world.pressureTick=1.18;showHint('수압 한계 초과! -'+dmg+' HP',650);beep(92,.07,'sawtooth')}}
}
function resetInputs(){Object.keys(keys).forEach(k=>keys[k]=false);touch.x=touch.y=0;touch.dash=false;const k=$('knob');if(k)k.style.transform='translate(0,0)'}
function update(dt){
 if(state!=='playing'||!world)return;world.time+=dt;const p=world.player,st=world.st;
 p.dashCd=Math.max(0,p.dashCd-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.inv=Math.max(0,p.inv-dt);world.sonar=Math.max(0,world.sonar-dt);world.sonarCd=Math.max(0,world.sonarCd-dt);world.lightJam=Math.max(0,world.lightJam-dt);world.currentBurst=Math.max(0,world.currentBurst-dt*.9);world.silt=Math.max(0,world.silt-dt*.48);world.scrapeCd=Math.max(0,world.scrapeCd-dt);world.thermalLift=Math.max(0,world.thermalLift-dt*.7);
 let ix=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0)+touch.x,iy=(keys.w||keys.arrowup?-1:0)+(keys.s||keys.arrowdown?1:0)+touch.y;let len=Math.hypot(ix,iy);if(len>1){ix/=len;iy/=len}
 const activeSub=subzoneForY(p.y),activeRule=SUBZONE_RULES[activeSub.id]||{},dashInput=!!(keys.shift||touch.dash),dashPressed=dashInput&&!p.dashHeld&&len>.1;p.dashHeld=dashInput;if(dashPressed&&p.dashCd<=0){p.dashTime=.24;p.dashCd=.82;beep(210,.035)}const dashing=p.dashTime>0,spd=st.speed*(dashing?2.05:1)*(activeRule.speed||1),salvageLoad=clamp(world.bagWeight/Math.max(1,st.bag),0,1),catchLoad=clamp(world.catchWeight/Math.max(1,st.catchCap),0,1),loadDrag=Math.max(.76,1-salvageLoad*.06-catchLoad*.08),ascentBoost=iy<-.12?st.ascent:1;
 if(len>.12){p.aimX=ix;p.aimY=iy;if(Math.abs(ix)>.12)p.face=ix>0?1:-1}const accel=6,tx=ix*spd*loadDrag,ty=iy*spd*loadDrag*ascentBoost;p.vx=lerp(p.vx,tx,clamp(dt*accel,0,1));p.vy=lerp(p.vy,ty,clamp(dt*accel,0,1));if(len<.05){p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt)}
 const impactSpeed=Math.hypot(p.vx,p.vy);p.x=clamp(p.x+p.vx*dt,45,WORLD.w-45);p.y=clamp(p.y+p.vy*dt,WORLD.surface+18,WORLD.h-35);const terrainHit=resolvePlayerTerrain(p,23);if(terrainHit){p.vx*=.82;p.vy*=.82}if(Math.abs(p.vx)>8)p.face=p.vx>0?1:-1;
 const zone=zoneForY(p.y),subNow=subzoneForY(p.y),subRule=SUBZONE_RULES[subNow.id]||{},rule=ZONE_RULES[zone.id]||ZONE_RULES.reef,dep=depthOf(p.y);applyDepthPressure(dt,p,dep);applySubzoneTerrainHazard(terrainHit,p,impactSpeed);
 const effort=1+len*.10+salvageLoad*.12+catchLoad*.18+(dashing?.72:0),pressureBurn=1+Math.min(1.15,world.pressureOver/150*.52),ascentO2=iy<-.12?st.ascentO2:1;
 p.oxygen-=dt*rule.oxygen*effort*pressureBurn*(subRule.oxygen||1)*ascentO2;applyZoneEnvironment(dt,p);if(subRule.sonarRecharge>1)world.sonarCd=Math.max(0,world.sonarCd-dt*(subRule.sonarRecharge-1));
 world.maxDepth=Math.max(world.maxDepth,dep);if(dep>=600)world.mission.deep=true;if(dep>=800)world.mission.hadal=true;
 const reserve=oxygenReserveStatus();if(reserve.code!==world.reserveState){world.reserveState=reserve.code;if(reserve.code==='warn')showHint('귀환 산소가 빠듯합니다. 더 깊이 갈지 돌아갈지 결정하세요.',1500);if(reserve.code==='critical')showHint('귀환 산소 위험 · 지금 상승하세요!',1800)}
 const zn=zone.name;if(zn!==world.lastZone){world.lastZone=zn;world.zoneFlash=1;showZone(zone);showHint(zone.tag+' · 위험: '+rule.danger,1900)}
 const sub=subzoneForY(p.y);world.mission.visited[sub.id]=true;if(sub.id!==world.lastSubzone){world.lastSubzone=sub.id;if(world.time>2){world.zoneFlash=Math.max(world.zoneFlash,.45);showHint(sub.name+' · '+(SUBZONE_RULES[sub.id]?.tip||zone.name),2300)}}
 world.zoneFlash=Math.max(0,world.zoneFlash-dt*1.35);world.envPulse=Math.max(0,world.envPulse-dt*.8);
 rebuildFishGrid();for(const f of world.fish){if(f.alive)updateFishAI(f,dt,p,st)}
 updateTether(dt);updateTraps(dt);
 for(const s of world.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(world.terrain.some(t=>pointInSolid(s.x,s.y,t,2))){s.life=0;world.effects.push({type:'spark',x:s.x,y:s.y,t:0});continue}for(const f of world.fish){if(!f.alive)continue;if(creaturePointHit(f,s.x,s.y,3)){hookFish(f);s.life=0;break}}}
 world.shots=world.shots.filter(s=>s.life>0);
 for(const m of world.mines){if(m.dead)continue;m.marked=Math.max(0,m.marked-dt);let d=Math.hypot(m.x-p.x,m.y-p.y);if(sub.id==='mineLane'&&d<270&&d>2){m.x+=(p.x-m.x)/d*20*dt;m.y+=(p.y-m.y)/d*14*dt;d=Math.hypot(m.x-p.x,m.y-p.y);world.envPulse=Math.max(world.envPulse,.22)}if(d<115&&m.fuse<=0){m.fuse=.92;showHint('기뢰 근접 경보!',700);beep(250,.05)}if(m.fuse>0){m.fuse-=dt;if(m.fuse<=0)explodeMine(m)}}
 for(const b of world.bubbles){b.y-=b.speed*dt;if(b.y<70){b.y=WORLD.h-20;b.x=rnd(0,WORLD.w)}}
 for(const e of world.effects)e.t+=dt;world.effects=world.effects.filter(e=>e.t<.85);
 const cameraLead=world.tool==='camera'?p.face*Math.min(170,view.w*.22):clamp(p.vx*.18,-70,70);world.camera.x=lerp(world.camera.x,p.x+cameraLead,1-Math.pow(.002,dt));world.camera.y=lerp(world.camera.y,p.y,1-Math.pow(.002,dt));
 if(p.oxygen<=0||p.hp<=0){finishDive(false,p.oxygen<=0?'산소가 고갈되어 구조되었습니다.':'부상으로 긴급 구조되었습니다.');return}
 if(world.boat&&Math.hypot(p.x-world.boat.x,p.y-world.boat.y)<145&&world.time>4&&world.catchWeight>=world.st.catchCap-.05){showHint('오늘 어획 한도에 도달했습니다 · E로 탐사선에 올라가세요.',650)}
}
function openNextMorning(toHome=false){
 restaurant=null;world=null;dockMissionId=null;dockTab='none';state='menu';
 ['resultScreen','restaurantScreen','contractScreen'].forEach(id=>$(id)?.classList.add('hidden'));
 if(toHome){$('startScreen').classList.remove('hidden');updateStartButtons();syncAmbience();return}
 openContracts('none')
}
function restToNextMorning(toHome=false){
 meta.day=Math.max(1,(meta.day||1)+1);save();openNextMorning(toHome)
}
function finishDive(ok,reason){
 if(state!=='playing')return;state='result';document.body.classList.remove('playing','cameraMode','sonarActive');resetInputs();syncAmbience();
 const hasMission=world.contract.id!=='free',complete=hasMission&&missionComplete(),base=ok&&complete?world.contract.reward:0;
 const previousBest=Math.max(0,meta.bestDepth||0),recordDepth=ok?Math.max(0,world.maxDepth-previousBest):0,depthBonus=ok?Math.round(recordDepth*2.4):0,survival=ok?250:0,dailyComplete=ok&&dailyTaskComplete(world.daily),dailyBonus=dailyComplete?world.daily.reward:0;
 const gain=ok?Math.max(0,world.income+base+depthBonus+dailyBonus+survival):0,score=ok?Math.round(gain+world.maxDepth*2+400):Math.round(world.maxDepth*.35);
 let stocked=0;const stockedNames=[];
 if(ok){for(const [key,count] of Object.entries(world.catchCounts||{})){if(count<=0)continue;meta.stock[key]=(meta.stock[key]||0)+count;stocked+=count;stockedNames.push(ingredientInfo(key).name+' ×'+count)}}
 meta.money+=gain;meta.bestDepth=Math.max(previousBest,world.maxDepth);if(ok)meta.bestScore=Math.max(meta.bestScore,score);if(ok&&complete)meta.unlocked=Math.max(meta.unlocked,Math.min(5,(world.contract.unlock||0)+1));save();
 $('resultTitle').textContent=ok?'탐사선 귀환 · 낮 탐사 종료':'긴급 구조 · 잠수 보고서';
 const loss=ok?'':'<div class="notice">구조 시 인양 보상과 오늘 잡은 식재료는 회수되지 않습니다. 사진 도감 기록만 남습니다.</div>';
 const kitchen=ok?'<div class="notice kitchenNotice"><b>오늘 어획 '+world.catchWeight.toFixed(1)+' / '+world.st.catchCap+'kg · 식재료 '+stocked+'개를 냉장고에 옮겼습니다.</b>'+(stockedNames.length?'<br>'+stockedNames.join(' · '):'<br>오늘은 요리할 새 식재료가 없습니다.')+'</div>':'';
 const evening='<div class="eveningNote"><b>낮 탐사가 끝났습니다.</b><span>'+(ok?'밤 장사를 하거나 바로 휴식할 수 있습니다. 어느 쪽을 골라도 다음 잠수는 DAY '+(meta.day+1)+'입니다.':'구조 후에는 휴식하고 다음 날 다시 준비합니다.')+'</span></div>';
 $('resultBody').innerHTML='<div class="notice">'+reason+'</div>'+loss+kitchen+'<div class="report"><div class="card"><span>선택 의뢰</span><b>'+(hasMission?(complete?'완료':'미완료'):'없음')+'</b></div><div class="card"><span>최대 수심</span><b>'+Math.round(world.maxDepth)+'m</b></div><div class="card"><span>신규 수심 기록</span><b>'+(recordDepth>0?('+'+Math.round(recordDepth)+'m'):'없음')+'</b></div><div class="card"><span>오늘 어획</span><b>'+world.catchWeight.toFixed(1)+' / '+world.st.catchCap+'kg</b></div><div class="card"><span>사진 연구</span><b>'+money(world.photoIncome)+'</b></div><div class="card"><span>연구·인양 수익</span><b>'+money(world.income)+'</b></div><div class="card"><span>신규 수심 보상</span><b>'+money(depthBonus)+'</b></div><div class="card"><span>주요 의뢰 보상</span><b>'+money(base)+'</b></div><div class="card"><span>오늘의 보너스</span><b>'+(dailyComplete?money(dailyBonus):'미완료')+'</b></div><div class="card"><span>낮 수익</span><b>'+money(gain)+'</b></div></div>'+evening;
 const canNight=ok&&availableRecipes().length>0;
 $('nextBtn').textContent=canNight?'밤 장사 시작':'밤 장사 · 만들 메뉴 없음';$('nextBtn').disabled=!canNight;$('nextBtn').onclick=canNight?startRestaurant:null;
 const rest=$('restBtn');rest.disabled=false;rest.textContent=ok?'휴식하고 다음 날':'치료받고 다음 날';rest.onclick=()=>restToNextMorning(false);
 $('homeBtn').textContent='하루 마치고 시작 화면';$('homeBtn').onclick=()=>restToNextMorning(true);
 $('resultScreen').classList.remove('hidden')
}

function frame(now){const dt=clamp((now-last)/1000,0,.033);last=now;if(state==='playing'){update(dt);render()}requestAnimationFrame(frame)}requestAnimationFrame(frame);

function stockCount(){return Object.values(meta.stock||{}).reduce((a,b)=>a+(Number(b)||0),0)}
function recipeGroups(recipe){return recipe.groups?.length?recipe.groups:[recipe.keys||[]]}
function recipeIngredients(recipe){return recipeGroups(recipe)[0].filter(k=>(meta.stock[k]||0)>0)}
function recipeCanMake(recipe){return recipeGroups(recipe).every(group=>group.some(k=>(meta.stock[k]||0)>0))}
function availableRecipes(){return RECIPES.filter(recipeCanMake)}
function chooseIngredient(recipe){const keys=recipeIngredients(recipe);if(!keys.length)return null;return keys.sort((a,b)=>(meta.stock[b]||0)-(meta.stock[a]||0)||(ingredientInfo(a).value||0)-(ingredientInfo(b).value||0))[0]}
function chooseRecipeParts(recipe,primary){const groups=recipeGroups(recipe),used=[];for(let i=0;i<groups.length;i++){const options=groups[i].filter(k=>(meta.stock[k]||0)>0);if(!options.length)return null;const k=i===0&&primary&&options.includes(primary)?primary:options.sort((a,b)=>(meta.stock[b]||0)-(meta.stock[a]||0))[0];used.push(k)}return used}
function recipePrice(recipe,key){const parts=chooseRecipeParts(recipe,key)||[key],raw=parts.reduce((s,k)=>s+(ingredientInfo(k).value||120),0);return Math.round(raw*1.55+recipe.bonus)}
function consumeRecipeParts(recipe,key){const parts=chooseRecipeParts(recipe,key);if(!parts)return null;for(const k of parts){meta.stock[k]--;if(meta.stock[k]<=0)delete meta.stock[k]}return parts}
function ingredientSpriteSrc(key){const info=ingredientInfo(key),assetKey=info.img;if(!assetKey)return'';return ASSETS[assetKey]||''}
function restaurantStockHtml(){const entries=Object.entries(meta.stock||{}).filter(([,n])=>n>0);if(!entries.length)return'<span class="stockChip empty">냉장고가 비었습니다.</span>';return entries.map(([k,n])=>'<span class="stockChip">'+ingredientInfo(k).name+' <b>×'+n+'</b></span>').join('')}

const CUSTOMER_SPRITES=[
 '../../assets/game/characters/people/kenney-platformer-characters/female/poses/female-stand.png',
 '../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',
 '../../assets/game/characters/people/kenney-platformer-characters/adventurer/poses/adventurer-stand.png',
 '../../assets/game/characters/people/kenney-platformer-characters/soldier/poses/soldier-stand.png'
];
const CUSTOMER_NAMES=['유나','도윤','민지','준호','하늘','태호','수아','현우'];
function restaurantCustomerById(id){return restaurant?.customers.find(c=>c.id===id)||null}
function restaurantWorkIdle(){return{stage:'idle',customerId:null,recipeId:null,key:null,meter:0,dir:1,prepScore:0,cookScore:0,target0:45,target1:70,quality:0}}
function restaurantTimingScore(value,a,b){
 const center=(a+b)/2,half=(b-a)/2,dist=Math.abs(value-center);
 if(value>=a&&value<=b)return 1.15-clamp(dist/Math.max(1,half),0,1)*.12;
 const edge=Math.min(Math.abs(value-a),Math.abs(value-b));
 return clamp(.92-edge/55,.55,.92)
}
function restaurantQualityLabel(q){
 return q>=1.08?'S':q>=.94?'A':q>=.78?'B':'C'
}
function restaurantSeatCount(){return 2+(meta.shopUp.seats||0)}
function spawnRestaurantCustomer(){
 if(!restaurant||restaurant.finished||restaurant.generated>=restaurant.quota||restaurant.customers.length>=restaurantSeatCount())return false;
 const avail=availableRecipes();if(!avail.length)return false;
 const recipe=avail[Math.floor(Math.random()*avail.length)],id=++restaurant.customerSeq;
 const maxPatience=18+Math.min(7,(meta.shop.reputation||0)*.07)+(meta.shopUp.fridge||0)*1.8+Math.random()*4;
 restaurant.customers.push({
   id,recipeId:recipe.id,patience:maxPatience,maxPatience,
   sprite:CUSTOMER_SPRITES[(id+meta.day)%CUSTOMER_SPRITES.length],
   name:CUSTOMER_NAMES[(id*3+meta.day)%CUSTOMER_NAMES.length],
   mood:'waiting'
 });
 restaurant.generated++;restaurant.spawnCd=3.8+Math.random()*2.8;return true
}
function restaurantSeatHtml(customer,seat){
 if(!customer)return'<div class="tycoonSeat empty"><div class="emptyChair">🪑</div><small>빈 자리</small></div>';
 const recipe=RECIPES.find(r=>r.id===customer.recipeId),selected=restaurant.selectedId===customer.id;
 const patience=Math.round(clamp(customer.patience/customer.maxPatience,0,1)*100);
 const danger=patience<28?' danger':patience<55?' warn':'';
 return'<button class="tycoonSeat'+(selected?' selected':'')+'" data-customer="'+customer.id+'">'+
   '<div class="orderBubble">'+recipe.icon+' <b>'+recipe.name+'</b></div>'+
   '<img class="customerSprite" src="'+customer.sprite+'" alt="">'+
   '<div class="customerName">'+customer.name+' <small>#'+(seat+1)+'</small></div>'+
   '<div class="patienceBar'+danger+'"><i style="width:'+patience+'%"></i></div>'+
   '<small class="patienceText">기다림 '+patience+'%</small></button>'
}
function restaurantTimingHtml(stage){
 const w=restaurant.work,targetLeft=w.target0,targetWidth=w.target1-w.target0,label=stage==='prep'?'손질 타이밍':'굽기 타이밍';
 return'<div class="timingWrap"><div class="timingTitle">'+label+' <small>노란 구간을 노리세요</small></div>'+
   '<div class="timingBar"><span class="timingTarget" style="left:'+targetLeft+'%;width:'+targetWidth+'%"></span><i id="timingMarker" style="left:'+w.meter+'%"></i></div></div>'
}
function restaurantKitchenHtml(){
 const c=restaurantCustomerById(restaurant.selectedId);
 if(!c)return'<div class="workEmpty"><b>주문을 골라 주세요</b><span>손님을 누르면 주방에서 손질 → 굽기 → 플레이팅 → 서빙 순서로 요리합니다.</span></div>';
 const recipe=RECIPES.find(r=>r.id===c.recipeId),w=restaurant.work;
 const primary=recipeGroups(recipe)[0],extraGroups=recipeGroups(recipe).slice(1),ingredientButtons=primary.map(k=>{const n=meta.stock[k]||0,src=ingredientSpriteSrc(k);return'<button class="ingredientBtn '+(w.key===k?'selected':'')+'" data-ingredient="'+k+'" '+(n<=0||w.stage!=='idle'?'disabled':'')+'>'+(src?'<img class="ingredientSprite" src="'+src+'" alt="">':'')+'<b>'+ingredientInfo(k).name+'</b><small>재고 '+n+' · 예상 '+money(recipePrice(recipe,k))+'</small></button>'}).join(''),extraNeed=extraGroups.length?'<div class="recipeNeeds">추가 재료 · '+extraGroups.map(g=>g.map(k=>ingredientInfo(k).name).join(' / ')).join(' + ')+'</div>':'';
 let action='';
 if(w.stage==='idle'&&!w.key)action='<div class="workInstruction">먼저 사용할 식재료를 고르세요.</div>';
 else if(w.stage==='idle')action='<button class="cookAction prep" id="prepStartBtn">🔪 손질 시작</button>';
 else if(w.stage==='prep')action=restaurantTimingHtml('prep')+'<button class="cookAction prep" id="prepStopBtn">🔪 지금 손질!</button>';
 else if(w.stage==='cook')action=restaurantTimingHtml('cook')+'<button class="cookAction fire" id="cookStopBtn">🔥 지금 불 끄기!</button>';
 else if(w.stage==='ready')action='<div class="dishReady"><span>'+recipe.icon+'</span><b>'+recipe.name+' 완성!</b><small>품질 '+restaurantQualityLabel(w.quality)+' · 손님에게 바로 내세요.</small></div><button class="cookAction serve" id="serveDishBtn">🍽️ 서빙하기</button>';
 return'<div class="workOrder"><span>선택 주문</span><b>'+recipe.icon+' '+recipe.name+'</b><small>'+c.name+' · 남은 기다림 <strong id="selectedPatience">'+Math.max(0,Math.ceil(c.patience))+'초</strong></small></div>'+
   extraNeed+'<div class="ingredientShelf">'+ingredientButtons+'</div>'+action
}
function renderRestaurant(){
 if(!restaurant||restaurant.finished)return;
 const seats=Array.from({length:restaurantSeatCount()},(_,i)=>restaurantSeatHtml(restaurant.customers[i]||null,i)).join('');
 $('restaurantBody').innerHTML='<div class="restaurantHero"><div><span class="nightBadge">DAY '+meta.day+' · NIGHT</span><h3>BLUE KITCHEN</h3><p>손님 셋의 기다림을 보면서 한 접시씩 빠르게 완성하세요.</p></div><div class="nightMoney"><span>남은 영업</span><b id="nightTimer">'+Math.max(0,Math.ceil(restaurant.timeLeft))+'초</b><small>매출 '+money(restaurant.earnings)+' · 연속 '+restaurant.streak+' · 좌석 '+restaurantSeatCount()+'</small></div></div>'+
 '<div class="tycoonStatus"><span>손님 <b>'+restaurant.served+'/'+restaurant.quota+'</b></span><span>놓침 <b>'+restaurant.missed+'</b></span><span>최고 연속 <b>'+restaurant.bestStreak+'</b></span><span>평판 <b>'+Math.round(meta.shop.reputation||0)+'</b></span></div>'+
 '<div class="diningRoom"><div class="restaurantSign">🌊 BLUE KITCHEN · 오늘의 해산물</div><div class="seatRow">'+seats+'</div><div class="counterLine"><span>🍵</span><span>🥢</span><span>🍽️</span><span>🧂</span><span>🔥</span></div></div>'+
 '<div class="kitchenTycoon"><div class="kitchenHead"><b>👨‍🍳 주방 작업대</b><small>'+(restaurant.message||'손님을 눌러 주문을 시작하세요.')+'</small></div>'+restaurantKitchenHtml()+'</div>'+
 '<div class="restaurantStock"><strong>냉장고</strong>'+restaurantStockHtml()+'</div><div class="toolbar"><button class="btn dark" id="closeNightBtn">오늘 영업 마감</button></div>';
 document.querySelectorAll('#restaurantBody [data-customer]').forEach(b=>b.onclick=()=>selectRestaurantCustomer(Number(b.dataset.customer)));
 document.querySelectorAll('#restaurantBody [data-ingredient]').forEach(b=>b.onclick=()=>chooseRestaurantIngredient(b.dataset.ingredient));
 const ps=$('prepStartBtn'),pp=$('prepStopBtn'),cp=$('cookStopBtn'),sv=$('serveDishBtn');
 if(ps)ps.onclick=startRestaurantPrep;if(pp)pp.onclick=stopRestaurantPrep;if(cp)cp.onclick=stopRestaurantCook;if(sv)sv.onclick=serveRestaurantDish;
 $('closeNightBtn').onclick=()=>finishRestaurant('조기 마감')
}
function updateRestaurantLive(){
 if(!restaurant||restaurant.finished)return;
 const timer=$('nightTimer');if(timer)timer.textContent=Math.max(0,Math.ceil(restaurant.timeLeft))+'초';
 for(const c of restaurant.customers){
   const btn=document.querySelector('[data-customer="'+c.id+'"]');if(!btn)continue;
   const pct=Math.round(clamp(c.patience/c.maxPatience,0,1)*100),bar=btn.querySelector('.patienceBar'),fill=btn.querySelector('.patienceBar i'),txt=btn.querySelector('.patienceText');
   if(fill)fill.style.width=pct+'%';if(txt)txt.textContent='기다림 '+pct+'%';if(bar){bar.classList.toggle('danger',pct<28);bar.classList.toggle('warn',pct>=28&&pct<55)}
 }
 const marker=$('timingMarker');if(marker)marker.style.left=restaurant.work.meter+'%';
 const selected=restaurantCustomerById(restaurant.selectedId),sp=$('selectedPatience');if(selected&&sp)sp.textContent=Math.max(0,Math.ceil(selected.patience))+'초'
}
function tickRestaurant(){
 if(!restaurant||restaurant.finished||state!=='restaurant')return;
 const dt=.1;restaurant.timeLeft-=dt;restaurant.spawnCd-=dt;
 let changed=false;
 for(const c of [...restaurant.customers]){
   c.patience-=dt*Math.max(.68,1-(meta.shopUp.helper||0)*.08);
   if(c.patience<=0){
     restaurant.customers=restaurant.customers.filter(x=>x!==c);restaurant.missed++;restaurant.streak=0;restaurant.repPenalty+=1.25;changed=true;
     if(restaurant.selectedId===c.id){restaurant.selectedId=null;restaurant.work=restaurantWorkIdle();restaurant.message=c.name+' 손님이 너무 오래 기다려서 돌아갔어요.'}
     beep(105,.07,'sawtooth')
   }
 }
 const w=restaurant.work;
 if(w.stage==='prep'){
   w.meter+=w.dir*(7.8-(meta.shopUp.prep||0)*.55);if(w.meter>=100){w.meter=100;w.dir=-1}else if(w.meter<=0){w.meter=0;w.dir=1}
 }else if(w.stage==='cook'){
   w.meter+=Math.max(1.35,2.8-(meta.shopUp.stove||0)*.38);
   if(w.meter>=100){w.meter=100;w.cookScore=.5;w.quality=(w.prepScore+w.cookScore)/2;w.stage='ready';restaurant.message='조금 탔어요! 그래도 서빙은 할 수 있습니다.';beep(115,.09,'sawtooth');changed=true}
 }
 if(restaurant.spawnCd<=0&&restaurant.timeLeft>7&&restaurant.generated<restaurant.quota&&restaurant.customers.length<3&&availableRecipes().length){if(spawnRestaurantCustomer())changed=true}
 if(restaurant.timeLeft<=0){finishRestaurant('영업 시간 종료');return}
 if(stockCount()<=0&&w.stage==='idle'&&restaurant.customers.length===0){finishRestaurant('재료 소진');return}
 if(restaurant.generated>=restaurant.quota&&restaurant.customers.length===0&&w.stage==='idle'){finishRestaurant('모든 손님 응대 완료');return}
 if(changed)renderRestaurant();else updateRestaurantLive()
}
function selectRestaurantCustomer(id){
 if(!restaurant||restaurant.finished)return;
 if(restaurant.work.stage!=='idle'&&restaurant.work.customerId!==id){restaurant.message='지금 만들고 있는 접시를 먼저 끝내야 합니다.';renderRestaurant();return}
 const c=restaurantCustomerById(id);if(!c)return;
 if(restaurant.work.customerId!==id)restaurant.work=restaurantWorkIdle();
 restaurant.selectedId=id;restaurant.work.customerId=id;restaurant.work.recipeId=c.recipeId;restaurant.message=c.name+'의 주문을 준비합니다.';renderRestaurant()
}
function chooseRestaurantIngredient(key){
 if(!restaurant||restaurant.finished||restaurant.work.stage!=='idle')return;
 const c=restaurantCustomerById(restaurant.selectedId);if(!c)return;
 const recipe=RECIPES.find(r=>r.id===c.recipeId);if(!recipeGroups(recipe)[0].includes(key)||(meta.stock[key]||0)<=0)return;
 restaurant.work.key=key;restaurant.work.customerId=c.id;restaurant.work.recipeId=recipe.id;restaurant.message=ingredientInfo(key).name+'을 골랐습니다. 이제 손질하세요.';beep(520,.04);renderRestaurant()
}
function startRestaurantPrep(){
 const w=restaurant?.work;if(!w||w.stage!=='idle'||!w.key)return;
 w.stage='prep';w.meter=Math.random()*25;w.dir=1;const center=48+Math.random()*18,wide=12+(meta.shopUp.prep||0)*3;w.target0=center-wide;w.target1=center+wide;restaurant.message='칼질 타이밍! 노란 구간에서 버튼을 누르세요.';beep(640,.04);renderRestaurant()
}
function stopRestaurantPrep(){
 const w=restaurant?.work;if(!w||w.stage!=='prep')return;
 w.prepScore=restaurantTimingScore(w.meter,w.target0,w.target1);w.stage='cook';w.meter=0;const center=66+Math.random()*10,wide=10+(meta.shopUp.stove||0)*3;w.target0=center-wide;w.target1=center+wide;restaurant.message='손질 완료! 이제 알맞게 익혀서 불을 끄세요.';beep(w.prepScore>=1?900:430,.05);renderRestaurant()
}
function stopRestaurantCook(){
 const w=restaurant?.work;if(!w||w.stage!=='cook')return;
 w.cookScore=restaurantTimingScore(w.meter,w.target0,w.target1);w.quality=(w.prepScore+w.cookScore)/2;w.stage='ready';restaurant.message='플레이팅 완료 · 품질 '+restaurantQualityLabel(w.quality)+'!';beep(w.quality>=1.04?1180:760,.06);renderRestaurant()
}
function serveRestaurantDish(){
 if(!restaurant||restaurant.finished)return;
 const w=restaurant.work,c=restaurantCustomerById(w.customerId);if(w.stage!=='ready'||!c)return;
 const recipe=RECIPES.find(r=>r.id===w.recipeId),key=w.key;if(!recipe||!key||(meta.stock[key]||0)<=0){restaurant.message='그 사이 식재료가 떨어졌습니다.';restaurant.work=restaurantWorkIdle();renderRestaurant();return}
 const used=consumeRecipeParts(recipe,key);if(!used){restaurant.message='필요한 추가 식재료가 떨어졌습니다.';restaurant.work=restaurantWorkIdle();renderRestaurant();return}
 const qualityMult=.76+clamp(w.quality,.5,1.15)*.36,patienceMult=.88+.28*clamp(c.patience/c.maxPatience,0,1),combo=1+Math.min(.28+(meta.shopUp.tray||0)*.035,restaurant.streak*(.045+(meta.shopUp.tray||0)*.004)),rep=1+Math.min(.18,(meta.shop.reputation||0)*.006),menu=1+(meta.shopUp.menu||0)*.08;
 const sale=Math.round(recipePrice(recipe,key)*qualityMult*patienceMult*combo*rep*menu),grade=restaurantQualityLabel(w.quality);
 restaurant.earnings+=sale;restaurant.served++;restaurant.streak++;restaurant.bestStreak=Math.max(restaurant.bestStreak,restaurant.streak);restaurant.customers=restaurant.customers.filter(x=>x.id!==c.id);
 restaurant.selectedId=null;restaurant.work=restaurantWorkIdle();restaurant.message=c.name+'에게 '+grade+'급 '+recipe.name+' 서빙! '+used.map(k=>ingredientInfo(k).name).join('+')+' · +'+money(sale);restaurant.spawnCd=Math.min(restaurant.spawnCd,1.15);
 beep(920,.05);setTimeout(()=>beep(1280,.06),55);renderRestaurant()
}
function serveRestaurant(recipeId){
 const c=restaurant?.customers.find(x=>x.recipeId===recipeId);if(c)selectRestaurantCustomer(c.id)
}
function openKitchenPrep(){
 state='menu';syncAmbience();$('contractScreen').classList.add('hidden');
 const stock=stockCount(),menus=RECIPES.map(r=>{const options=recipeGroups(r),ready=recipeCanMake(r),need=options.map(group=>group.map(k=>ingredientInfo(k).name).join(' / ')).join(' + ');return'<div class="card kitchenPrepCard '+(ready?'ready':'locked')+'"><span>'+(ready?'오늘 조리 가능':'재료 부족')+'</span><h3>'+r.icon+' '+r.name+'</h3><p>'+r.desc+'</p><small>'+need+'</small></div>'}).join('');
 $('restaurantBody').innerHTML='<div class="kitchenPrepHero"><div><span class="nightBadge">BLUE KITCHEN · 준비실</span><h3>냉장고와 오늘의 메뉴</h3><p>아침에는 재고와 메뉴만 확인합니다. 실제 밤 장사는 낮 잠수에서 귀환한 뒤 선택할 수 있습니다.</p></div><b>'+stock+'개 보관 중</b></div><div class="restaurantStock">'+restaurantStockHtml()+'</div><div class="grid kitchenPrepGrid">'+menus+'</div><div class="toolbar"><button class="btn" id="kitchenBack">선착장으로</button></div>';
 $('restaurantScreen').classList.remove('hidden');$('kitchenBack').onclick=()=>{$('restaurantScreen').classList.add('hidden');openContracts(dockTab)}
}

function startRestaurant(){
 if(!availableRecipes().length){showHint('현재 재고로 만들 수 있는 메뉴가 없습니다. 다음 낮 탐사에서 필요한 재료를 모아오세요.',1500);return}
 state='restaurant';syncAmbience();document.body.classList.remove('playing','cameraMode','sonarActive');
 ['startScreen','contractScreen','shopScreen','codexScreen','resultScreen'].forEach(id=>$(id)?.classList.add('hidden'));
 $('restaurantScreen').classList.remove('hidden');
 const quota=Math.min(15,6+restaurantSeatCount()+Math.floor((meta.shop.reputation||0)/16));
 restaurant={served:0,missed:0,earnings:0,streak:0,bestStreak:0,quota,generated:0,customerSeq:0,customers:[],selectedId:null,work:restaurantWorkIdle(),timeLeft:72,spawnCd:0,repPenalty:0,finished:false,message:'첫 손님들이 들어오고 있습니다.'};
 spawnRestaurantCustomer();spawnRestaurantCustomer();renderRestaurant();
 restaurant.tickId=setInterval(tickRestaurant,100)
}
function finishRestaurant(reason='영업 종료'){
 if(!restaurant||restaurant.finished)return;restaurant.finished=true;if(restaurant.tickId)clearInterval(restaurant.tickId);
 const repGain=restaurant.served*.72+restaurant.bestStreak*.16-restaurant.repPenalty;
 meta.money+=restaurant.earnings;meta.day=Math.max(1,(meta.day||1)+1);meta.shop.totalServed=(meta.shop.totalServed||0)+restaurant.served;meta.shop.reputation=clamp((meta.shop.reputation||0)+repGain,0,99);meta.shop.bestNight=Math.max(meta.shop.bestNight||0,restaurant.earnings);save();
 $('restaurantBody').innerHTML='<div class="nightSummary"><span class="nightBadge">'+reason+'</span><h3>오늘의 장사 결과</h3><div class="report"><div class="card"><span>서빙</span><b>'+restaurant.served+'팀</b></div><div class="card"><span>놓친 손님</span><b>'+restaurant.missed+'팀</b></div><div class="card"><span>최고 연속</span><b>'+restaurant.bestStreak+'</b></div><div class="card"><span>밤 매출</span><b>'+money(restaurant.earnings)+'</b></div><div class="card"><span>가게 평판</span><b>'+Math.round(meta.shop.reputation)+'</b></div><div class="card"><span>남은 재고</span><b>'+stockCount()+'개</b></div></div><div class="restaurantStock">'+restaurantStockHtml()+'</div><div class="notice"><b>DAY '+(meta.day-1)+' 종료</b> · 다음 날 아침 선착장에서 장비와 의뢰를 다시 준비합니다.</div><div class="toolbar"><button class="btn gold" id="nextDayBtn">DAY '+meta.day+' 잠수 준비</button></div></div>';
 $('nextDayBtn').onclick=()=>openNextMorning(false)
}

function contractCards(){
 const daily=dailyTaskForDay(meta.day),dailyCard='<div class="missionCard dailyMission"><span>오늘의 보너스 · 자동 적용</span><h3>'+daily.title+'</h3><p>'+daily.desc+'</p><div class="depthRating">안전 귀환 시 '+money(daily.reward)+'</div><b>주요 의뢰와 동시에 진행됩니다.</b></div>';
 return dailyCard+CONTRACTS.map((c,i)=>{const locked=(c.unlock||0)>meta.unlocked,selected=!locked&&dockMissionId===c.id,rec=c.recommended||CONTRACT_DEPTH_RATING[i]||260;return'<button class="missionCard '+(selected?'selected ':'')+(locked?'locked':'')+'" '+(locked?'disabled':'data-mission="'+c.id+'"')+'><span>'+(locked?'잠긴 주요 의뢰':'주요 탐사 의뢰')+'</span><h3>'+c.title+'</h3><p>'+c.desc+'</p><div class="depthRating">권장 수심 '+rec+'m · 성공 보상 '+money(c.reward)+'</div><b>'+(locked?'이전 단계 조사를 완료하면 개방':selected?'✓ 오늘 주요 의뢰로 선택됨':'선택하기')+'</b></button>'}).join('')
}
function gearLoadoutCards(){
 const slots=2+(meta.up.slots||0);return Object.entries(GEAR_DEFS).map(([k,g])=>{const selected=meta.loadout.includes(k),tier=gearTier(k),src=ASSETS[g.asset]||'';return'<button class="gearCard '+(selected?'selected':'')+'" data-loadout="'+k+'" style="--tier:'+GEAR_TIER_COLORS[tier]+'"><div class="gearArt">'+(src?'<img src="'+src+'" alt="">':'')+'<span>'+g.icon+'</span></div><b>'+g.name+'</b><em>'+GEAR_TIER_NAMES[tier]+' 등급 · Lv.'+tier+'</em><small>'+g.desc+'</small><strong>'+(selected?'장착됨':'빌리기')+'</strong></button>'}).join('')+'<div class="loadoutCount">채집 장비 '+meta.loadout.length+' / '+slots+'칸 · 카메라와 소나는 기본 지급</div>'
}
function toggleDockGear(k){
 const slots=2+(meta.up.slots||0),i=meta.loadout.indexOf(k);if(i>=0)meta.loadout.splice(i,1);else if(meta.loadout.length<slots)meta.loadout.push(k);else{showHint('장비 슬롯이 가득 찼습니다. 장비 랙을 업그레이드하세요.',1000);return}save();openContracts()
}
const DOCK_BUILD='../../assets/game/2d/platformer-art/expansions/buildings/';
const DOCK_TILE='../../assets/game/2d/platformer-art/base/tiles/';
const DOCK_PICKUP='../../assets/game/2d/underwater/deep-diver/pickups/icons_128/';
function dockBuildingHtml(kind,label,sub,base,roof,feature,active=false,extra=''){
 return `<button class="dockBuilding dock${kind} ${active?'active':''} ${extra}" data-dock="${kind.toLowerCase()}"><span class="dockBuildingArt"><img class="dockBase" src="${DOCK_BUILD+base}" alt=""><img class="dockRoof" src="${DOCK_BUILD+roof}" alt=""><img class="dockFeature" src="${DOCK_BUILD+feature}" alt=""></span><b>${label}</b><small>${sub}</small></button>`
}
function dockDetailHtml(){
 if(dockTab==='gear')return '<section class="dockDetailPanel"><div class="dockDetailHead"><div><span>장비 창고</span><h3>오늘 빌려갈 채집 장비</h3></div><small>슬롯 안에서 장비를 골라 배에 싣습니다.</small></div><div class="gearGrid">'+gearLoadoutCards()+'</div></section>';
 if(dockTab==='missions')return '<section class="dockDetailPanel"><div class="dockDetailHead"><div><span>의뢰 사무소</span><h3>오늘 받을 탐사 의뢰</h3></div><small>의뢰는 완전히 선택 사항입니다. 자유 잠수도 바로 출항할 수 있습니다.</small></div><div class="missionGrid">'+contractCards()+'</div><button class="btn dark" id="clearMissionBtn">의뢰 없이 자유 잠수</button></section>';
 return '<section class="dockWelcome"><b>선착장에서 오늘 잠수를 준비하세요.</b><span>건물을 누르면 의뢰·장비·강화·도감을 열 수 있고, 오른쪽 탐사선을 누르면 바로 출항합니다.</span></section>'
}
function openContracts(tab=dockTab){
 dockTab=tab||'none';state='menu';syncAmbience();document.body.classList.remove('playing','cameraMode','sonarActive');['startScreen','shopScreen','codexScreen','resultScreen','restaurantScreen'].forEach(id=>$(id)?.classList.add('hidden'));
 const st=stats(),selected=CONTRACTS.find(c=>c.id===dockMissionId),stock=stockCount(),plan=selected?selected.title:'자유 잠수',daily=dailyTaskForDay(meta.day);
 $('contractBody').innerHTML=
 '<div class="dockStatus"><span class="dockDay">DAY '+meta.day+'</span><b>'+money(meta.money)+'</b><span>어획 '+st.catchCap+'kg</span><span>장비 '+st.toolSlots+'칸</span><span>안전 '+Math.round(ratedDepth())+'m</span><span class="dailyStatus">오늘 +'+money(daily.reward)+'</span><em>'+plan+'</em></div>'+
 '<div class="dockScene">'+
   '<div class="dockSky"><i></i><i></i><i></i></div><div class="dockHills"></div>'+
   dockBuildingHtml('Office','의뢰 사무소','탐사 의뢰 선택','house-beige.png','roof-red-mid.png','window-checkered.png',dockTab==='missions')+
   dockBuildingHtml('Workshop','업그레이드 공방','잠수복·어획함 강화','house-dark.png','roof-grey-mid.png','anemometer.png')+
   dockBuildingHtml('Gear','장비 창고','오늘 장비 챙기기','house-gray.png','roof-yellow-mid.png','window-low-open.png',dockTab==='gear')+
   dockBuildingHtml('Codex','해양 연구소','생물 도감','house-beige-alt.png','roof-grey-mid.png','window-high-leadlight-bottom.png')+
   dockBuildingHtml('Kitchen','BLUE KITCHEN',stock?'재고 '+stock+'개 · 밤 장사':'식재료를 잡아오세요','house-dark-alt.png','roof-red-mid.png','sign-cup.png',false,stock?'':'empty')+
   '<div class="dockPier"><span></span><span></span><span></span><span></span><div class="dockProps"><img src="'+DOCK_TILE+'box.png" alt=""><img src="'+DOCK_PICKUP+'bucket.png" alt=""><img class="rod" src="'+DOCK_PICKUP+'fishingrod.png" alt=""></div></div>'+
   '<div class="dockSea"><div class="dockWave w1"></div><div class="dockWave w2"></div><button class="dockLaunch" data-dock="launch"><span class="dockBoatVisual"><i></i><i></i><i></i></span><b>'+(selected?'의뢰 출항':'자유 잠수 출항')+'</b><small>잠수 지점으로 이동</small></button></div>'+
   '<div class="dockSceneLabel"><b>BLUE EXPEDITION</b><small>건물을 눌러 준비 · 바다에서 출항</small></div>'+
 '</div>'+
 '<div class="dockQuick"><button data-dock="missions" class="'+(dockTab==='missions'?'active':'')+'">의뢰</button><button data-dock="gear" class="'+(dockTab==='gear'?'active':'')+'">장비</button><button data-dock="workshop">공방</button><button data-dock="codex">도감</button><button data-dock="kitchen">식당</button><button data-dock="launch" class="launchQuick">출항</button></div>'+
 '<div class="dockDetail">'+dockDetailHtml()+'</div><div class="toolbar dockActions"><button class="btn dark" id="menuBtn">시작 화면</button></div>';
 $('contractScreen').classList.remove('hidden');
 document.querySelectorAll('[data-dock]').forEach(b=>b.onclick=()=>{const a=b.dataset.dock;if(a==='missions'||a==='office'){dockTab='missions';openContracts('missions');return}if(a==='gear'){dockTab='gear';openContracts('gear');return}if(a==='workshop'){openShop();return}if(a==='codex'){openCodex();return}if(a==='kitchen'){openKitchenPrep();return}if(a==='launch')buildWorld(CONTRACTS.find(c=>c.id===dockMissionId)||FREE_DIVE)});
 document.querySelectorAll('[data-mission]').forEach(b=>b.onclick=()=>{dockMissionId=dockMissionId===b.dataset.mission?null:b.dataset.mission;openContracts('missions')});document.querySelectorAll('[data-loadout]').forEach(b=>b.onclick=()=>{dockTab='gear';toggleDockGear(b.dataset.loadout)});
 const clear=$('clearMissionBtn');if(clear)clear.onclick=()=>{dockMissionId=null;openContracts('missions')};$('menuBtn').onclick=()=>{$('contractScreen').classList.add('hidden');$('startScreen').classList.remove('hidden')}
}
function upCost(k){const u=UPGRADES[k];return Math.round(u.base*(1+(meta.up[k]||0)*.72))}
function shopUpCost(k){const u=SHOP_UPGRADES[k];return Math.round(u.base*(1+(meta.shopUp[k]||0)*.78))}
function gearUpCost(k){return Math.round(900*gearTier(k)*(1+(k==='trap'?.28:k==='harpoon'?.18:0)))}
function openShop(){
 $('contractScreen').classList.add('hidden');
 const diveCards=Object.keys(UPGRADES).map(k=>{const u=UPGRADES[k],lv=meta.up[k]||0,max=lv>=u.max,c=upCost(k);return'<div class="card"><h3>'+u.name+' Lv.'+lv+'/'+u.max+'</h3><p>'+u.desc+'</p><button class="btn '+(max?'dark':'gold')+'" data-up="'+k+'" '+(max?'disabled':'')+'>'+(max?'최대 강화':money(c)+' 강화')+'</button></div>'}).join('');
 const gearCards=Object.entries(GEAR_DEFS).map(([k,g])=>{const lv=gearTier(k),max=lv>=4,c=gearUpCost(k);return'<div class="card gearUpgrade" style="--tier:'+GEAR_TIER_COLORS[lv]+'"><h3>'+g.icon+' '+g.name+' · '+GEAR_TIER_NAMES[lv]+'</h3><p>'+g.desc+' · 등급이 오르면 범위/성공률/조작성이 좋아집니다.</p><button class="btn '+(max?'dark':'gold')+'" data-gearup="'+k+'" '+(max?'disabled':'')+'>'+(max?'최고 등급':money(c)+' 등급 강화')+'</button></div>'}).join('');
 const shopCards=Object.keys(SHOP_UPGRADES).map(k=>{const u=SHOP_UPGRADES[k],lv=meta.shopUp[k]||0,max=lv>=u.max,c=shopUpCost(k);return'<div class="card"><h3>'+u.name+' Lv.'+lv+'/'+u.max+'</h3><p>'+u.desc+'</p><button class="btn '+(max?'dark':'gold')+'" data-shopup="'+k+'" '+(max?'disabled':'')+'>'+(max?'최대 강화':money(c)+' 강화')+'</button></div>'}).join('');
 $('shopBody').innerHTML='<div class="notice">보유 자금 <b>'+money(meta.money)+'</b> · 어획 한도 <b>'+stats().catchCap+'kg</b> · 장비 슬롯 <b>'+stats().toolSlots+'칸</b></div><h3 class="sectionTitle">잠수·어획 설비</h3><div class="grid">'+diveCards+'</div><h3 class="sectionTitle">채집 장비 등급</h3><div class="grid">'+gearCards+'</div><h3 class="sectionTitle">BLUE KITCHEN 업그레이드</h3><div class="grid">'+shopCards+'</div><button class="btn" id="shopBack">선착장으로</button>';
 $('shopScreen').classList.remove('hidden');
 document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const k=b.dataset.up,c=upCost(k);if(meta.money<c){showHint('자금이 부족합니다.',900);return}meta.money-=c;meta.up[k]=(meta.up[k]||0)+1;save();beep(760,.07);openShop()});
 document.querySelectorAll('[data-gearup]').forEach(b=>b.onclick=()=>{const k=b.dataset.gearup,c=gearUpCost(k);if(meta.money<c){showHint('자금이 부족합니다.',900);return}meta.money-=c;meta.gear[k]=Math.min(4,gearTier(k)+1);save();beep(820,.07);openShop()});
 document.querySelectorAll('[data-shopup]').forEach(b=>b.onclick=()=>{const k=b.dataset.shopup,c=shopUpCost(k);if(meta.money<c){showHint('자금이 부족합니다.',900);return}meta.money-=c;meta.shopUp[k]=(meta.shopUp[k]||0)+1;save();beep(900,.07);openShop()});
 $('shopBack').onclick=openContracts
}
function openCodex(){
 $('contractScreen').classList.add('hidden');const order=Object.keys(SPECIES);$('codexBody').innerHTML='<div class="grid">'+order.map(k=>{const sp=SPECIES[k],rec=meta.codex[k];return'<div class="card codexCard '+(rec?'':'unknown')+'"><h3>'+(rec?sp.name:'??? 미기록 생물')+'</h3><p>'+(rec?('유형 '+(sp.motion||'swimmer')+' · 발견 수심 '+sp.depth[0]+'~'+sp.depth[1]+'m · 최고 사진 '+(rec.best||'C')+' · 촬영 '+(rec.count||0)+'회'):'현장에서 카메라로 촬영하면 도감이 열립니다.')+'</p></div>'}).join('')+'</div><button class="btn" id="codexBack">계약 게시판</button>';$('codexScreen').classList.remove('hidden');$('codexBack').onclick=openContracts
}

function bind(){
 $('startBtn').onclick=()=>{if(!ready)return;meta.money=0;meta.unlocked=0;meta.up={oxygen:0,fins:0,bag:0,catchCap:0,slots:0,camera:0,harpoon:0,sonar:0,suit:0,buoyancy:0};meta.gear={harpoon:1,net:1,gloves:1,knife:1,trap:1};meta.loadout=['harpoon','net'];meta.shopUp={seats:0,stove:0,prep:0,fridge:0,tray:0,menu:0,helper:0};meta.codex={};meta.bestDepth=0;meta.bestScore=0;meta.stock={};meta.day=1;meta.shop={reputation:0,bestNight:0,totalServed:0};dockMissionId=null;dockTab='none';save();openContracts('none')};
 $('continueBtn').onclick=()=>{if(!ready)return;load();dockTab='none';openContracts('none')};
 $('nextBtn').onclick=()=>{};$('restBtn').onclick=()=>{};$('homeBtn').onclick=()=>{};
 $('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent=sound?'SOUND ON':'SOUND OFF';if(sound)beep(700,.07);syncAmbience()};
 document.querySelectorAll('#toolBar [data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));document.querySelectorAll('#mActions [data-tool]').forEach(b=>b.onclick=()=>{setTool(b.dataset.tool);useTool()});
 $('actionMain').onclick=useTool;$('interactMain').onclick=interact;$('actionMobile').onclick=useTool;$('interactMobile').onclick=interact;$('dashMobile').onpointerdown=e=>{e.preventDefault();touch.dash=true};$('dashMobile').onpointerup=$('dashMobile').onpointercancel=$('dashMobile').onlostpointercapture=()=>touch.dash=false;
 addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(state!=='playing')return;if(k==='1')setTool('camera');if(k==='2')setTool('harpoon');if(k==='3')setTool('net');if(k==='4')setTool('gloves');if(k==='5')setTool('knife');if(k==='6')setTool('trap');if(k==='7')setTool('sonar');if((k==='x'||k===' ')&&!e.repeat)useTool();if(k==='e'&&!e.repeat)interact()});
 addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('blur',()=>{resetInputs();syncAmbience()});document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInputs();syncAmbience()});
 let joyId=null;const stick=$('stick'),knob=$('knob');
 function moveJoy(e){const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),m=r.width*.34,l=Math.hypot(dx,dy)||1,k=Math.min(1,l/m);touch.x=dx/l*k;touch.y=dy/l*k;knob.style.transform='translate('+(touch.x*36)+'px,'+(touch.y*36)+'px)'}
 stick.onpointerdown=e=>{joyId=e.pointerId;stick.setPointerCapture?.(e.pointerId);moveJoy(e)};stick.onpointermove=e=>{if(e.pointerId===joyId)moveJoy(e)};const end=e=>{if(joyId!==null&&e.pointerId!==joyId)return;joyId=null;touch.x=touch.y=0;knob.style.transform='translate(0,0)'};stick.onpointerup=end;stick.onpointercancel=end;stick.onlostpointercapture=end;
}
bind();load();updateStartButtons();
})();