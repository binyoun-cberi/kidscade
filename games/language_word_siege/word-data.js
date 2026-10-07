(function(){
'use strict';

const ROLE_LABELS={
  rapid:'빠른 공격', pierce:'관통 공격', burst:'포격', explosive:'폭발', beam:'광선',
  burn:'화염', slow:'냉기', poison:'독', push:'밀치기', gravity:'중력',
  barrier:'방어', resource:'채굴', repair:'회복', modifier:'강화', special:'특수'
};

const ROLE_COLORS={
  rapid:'#f6b94b', pierce:'#ff8d5c', burst:'#ff725e', explosive:'#ef4f64', beam:'#7c6cff',
  burn:'#ff5c35', slow:'#43a8ff', poison:'#72c74f', push:'#45c9c5', gravity:'#9a6cf0',
  barrier:'#7b8794', resource:'#84bf42', repair:'#4acb83', modifier:'#f1c64d', special:'#d95be6'
};

const MEANINGS={
  ARROW:'화살',DART:'다트',BULLET:'탄환',SHOT:'발사',NEEDLE:'바늘',BOLT:'볼트·화살촉',PEBBLE:'조약돌',STONE:'돌',ROCK:'바위',STAR:'별',
  LANCE:'창',SPEAR:'창',SWORD:'검',BLADE:'날',AXE:'도끼',HAMMER:'망치',CROSSBOW:'석궁',
  CANNON:'대포',ROCKET:'로켓',MISSILE:'미사일',CATAPULT:'투석기',ARTILLERY:'포병·대포',MORTAR:'박격포',
  BOMB:'폭탄',BLAST:'폭발',BURST:'폭발·터짐',EXPLOSION:'폭발',METEOR:'유성',NUKE:'핵폭발',
  LASER:'레이저',RAY:'광선',BEAM:'빛줄기',LIGHTNING:'번개',THUNDER:'천둥',
  FIRE:'불',FLAME:'불꽃',LAVA:'용암',HEAT:'열',SUN:'태양',DRAGON:'용',VOLCANO:'화산',
  ICE:'얼음',FROST:'서리',SNOW:'눈',FREEZE:'얼리다',WATER:'물',CHILL:'차갑게 하다',
  POISON:'독',VENOM:'독액',ACID:'산',TOXIN:'독소',
  WIND:'바람',PUSH:'밀다',STORM:'폭풍',TORNADO:'토네이도',GUST:'돌풍',
  MAGNET:'자석',GRAVITY:'중력',BLACKHOLE:'블랙홀',
  WALL:'벽',SHIELD:'방패',ARMOR:'갑옷',BARRIER:'장벽',BLOCK:'막다·블록',FORT:'요새',
  MINER:'광부',DRILL:'드릴',DIGGER:'파는 사람·굴착기',PICKAXE:'곡괭이',SHOVEL:'삽',QUARRY:'채석장',
  HEAL:'치유하다',REPAIR:'수리하다',MEND:'고치다',
  FAST:'빠른',SPEED:'속도',BIG:'큰',LONG:'긴',HEAVY:'무거운',DOUBLE:'두 배의',POWER:'힘',BOOST:'강화',STRONG:'강한',QUICK:'빠른',WIDE:'넓은',
  ECHO:'메아리',CHAOS:'혼돈',JUGGERNAUT:'압도적으로 강한 것'
};

Object.assign(MEANINGS,{
  PELLET:'작은 탄환',SLING:'새총',BOOMERANG:'부메랑',DISC:'원반',BALL:'공',NAIL:'못',PIN:'핀',BRICK:'벽돌',COIN:'동전',SEED:'씨앗',
  DAGGER:'단검',KNIFE:'칼',PIKE:'긴 창',TRIDENT:'삼지창',HARPOON:'작살',SCYTHE:'낫',KATANA:'일본도',RAPIER:'레이피어',JAVELIN:'투창',CHISEL:'끌',
  HOWITZER:'곡사포',LAUNCHER:'발사기',BALLISTA:'노포',TREBUCHET:'대형 투석기',TANK:'전차',GUN:'총',RIFLE:'소총',BLASTER:'블래스터',
  GRENADE:'수류탄',DYNAMITE:'다이너마이트',FIREWORK:'불꽃',TORPEDO:'어뢰',BAZOOKA:'바주카',CRACKER:'폭죽',
  PLASMA:'플라스마',FLASH:'섬광',PHOTON:'광자',NEON:'네온',LIGHT:'빛',ELECTRIC:'전기의',
  EMBER:'불씨',BLAZE:'큰 불길',INFERNO:'맹렬한 불',MAGMA:'마그마',TORCH:'횃불',ASH:'재',COMET:'혜성',SOLAR:'태양의',
  COLD:'추위',HAIL:'우박',GLACIER:'빙하',BLIZZARD:'눈보라',RAIN:'비',MIST:'안개',SLEET:'진눈깨비',WINTER:'겨울',
  SLIME:'점액',TOXIC:'유독한',FUME:'연기·가스',SPORE:'포자',COBRA:'코브라',SCORPION:'전갈',
  BREEZE:'산들바람',GALE:'강풍',HURRICANE:'허리케인',CYCLONE:'사이클론',WAVE:'파도',FAN:'선풍기',WHIRL:'소용돌이',TYPHOON:'태풍',
  ORBIT:'궤도',MOON:'달',VORTEX:'소용돌이',PLANET:'행성',MASS:'질량',SINGULARITY:'특이점',
  FENCE:'울타리',GATE:'문',CASTLE:'성',BUNKER:'벙커',DOME:'돔',COVER:'엄폐물',GUARD:'방어',FORTRESS:'요새',RAMPART:'성벽',BASTION:'보루',
  EXCAVATOR:'굴착기',PROSPECTOR:'탐사자',BUCKET:'양동이',CRANE:'크레인',SCOOP:'퍼내는 도구',TUNNEL:'터널',ORE:'광석',
  FIX:'고치다',CURE:'치료하다',MEDIC:'의무병',NURSE:'간호사',DOCTOR:'의사',RESTORE:'복구하다',PATCH:'수선하다',BANDAGE:'붕대',
  RAPID:'빠른',SWIFT:'재빠른',GIANT:'거대한',HUGE:'매우 큰',SHARP:'날카로운',HARD:'단단한',TRIPLE:'세 배의',ULTRA:'초강력',MEGA:'거대한',DEEP:'깊은',BRIGHT:'밝은',
  MIRROR:'거울',TIME:'시간',PORTAL:'차원문'
});

const SPECIAL_DIFFICULTY={
  CATAPULT:6,ARTILLERY:7,EXPLOSION:7,LIGHTNING:7,BLACKHOLE:9,JUGGERNAUT:9,CROSSBOW:6,PICKAXE:5,TORNADO:7,VOLCANO:7,MISSILE:6
};

const words={};
function difficulty(word){
  if(SPECIAL_DIFFICULTY[word]) return SPECIAL_DIFFICULTY[word];
  const rare=(word.match(/[JQXZVKYW]/g)||[]).length;
  const len=word.length;
  return Math.max(1,Math.min(9,Math.round(1+(len-3)*0.68+rare*0.7)));
}
function add(role,csv,extra){
  csv.split(',').map(s=>s.trim()).filter(Boolean).forEach(word=>{
    words[word]={
      word,
      role,
      roleLabel:ROLE_LABELS[role],
      color:ROLE_COLORS[role],
      meaning:MEANINGS[word]||ROLE_LABELS[role],
      difficulty:difficulty(word),
      ...(extra||{})
    };
  });
}

add('rapid','ARROW,DART,BULLET,SHOT,NEEDLE,BOLT,PEBBLE,STONE,ROCK,STAR,PELLET,SLING,BOOMERANG,DISC,BALL,NAIL,PIN,BRICK,COIN,SEED');
add('pierce','LANCE,SPEAR,SWORD,BLADE,AXE,HAMMER,CROSSBOW,DAGGER,KNIFE,PIKE,TRIDENT,HARPOON,SCYTHE,KATANA,RAPIER,JAVELIN,CHISEL');
add('burst','CANNON,ROCKET,MISSILE,CATAPULT,ARTILLERY,MORTAR,HOWITZER,LAUNCHER,BALLISTA,TREBUCHET,TANK,GUN,RIFLE,BLASTER');
add('explosive','BOMB,BLAST,BURST,EXPLOSION,METEOR,NUKE,GRENADE,DYNAMITE,FIREWORK,TORPEDO,BAZOOKA,CRACKER');
add('beam','LASER,RAY,BEAM,LIGHTNING,THUNDER,PLASMA,FLASH,PHOTON,NEON,LIGHT,ELECTRIC');
add('burn','FIRE,FLAME,LAVA,HEAT,SUN,DRAGON,VOLCANO,EMBER,BLAZE,INFERNO,MAGMA,TORCH,ASH,COMET,SOLAR');
add('slow','ICE,FROST,SNOW,FREEZE,WATER,CHILL,COLD,HAIL,GLACIER,BLIZZARD,RAIN,MIST,SLEET,WINTER');
add('poison','POISON,VENOM,ACID,TOXIN,SLIME,TOXIC,FUME,SPORE,COBRA,SCORPION');
add('push','WIND,PUSH,STORM,TORNADO,GUST,BREEZE,GALE,HURRICANE,CYCLONE,WAVE,FAN,WHIRL,TYPHOON');
add('gravity','MAGNET,GRAVITY,BLACKHOLE,ORBIT,MOON,VORTEX,PLANET,MASS,SINGULARITY');
add('barrier','WALL,SHIELD,ARMOR,BARRIER,BLOCK,FORT,FENCE,GATE,CASTLE,BUNKER,DOME,COVER,GUARD,FORTRESS,RAMPART,BASTION');
add('resource','MINER,DRILL,DIGGER,PICKAXE,SHOVEL,QUARRY,EXCAVATOR,PROSPECTOR,BUCKET,CRANE,SCOOP,TUNNEL,ORE');
add('repair','HEAL,REPAIR,MEND,FIX,CURE,MEDIC,NURSE,DOCTOR,RESTORE,PATCH,BANDAGE');
add('modifier','FAST,SPEED,BIG,LONG,HEAVY,DOUBLE,POWER,BOOST,STRONG,QUICK,WIDE,RAPID,SWIFT,GIANT,HUGE,SHARP,HARD,TRIPLE,ULTRA,MEGA,DEEP,BRIGHT');
add('special','ECHO,CHAOS,JUGGERNAUT,MIRROR,TIME,PORTAL');


// Extra elementary-to-advanced English towers: every entry has a checked meaning.
Object.assign(MEANINGS,{
  APPLE:"사과",
  PEAR:"배",
  PEACH:"복숭아",
  PLUM:"자두",
  GRAPE:"포도",
  LEMON:"레몬",
  BANANA:"바나나",
  BERRY:"열매",
  BEAN:"콩",
  ACORN:"도토리",
  SHELL:"조개껍데기",
  LEAF:"나뭇잎",
  PAPER:"종이",
  FEATHER:"깃털",
  SAND:"모래",
  DUST:"먼지",
  MARBLE:"구슬",
  SNAP:"딱 소리",
  DROP:"물방울",
  RUBBER:"고무",
  BOUNCE:"튀어 오르다",
  PEA:"완두콩",
  FANG:"송곳니",
  CLAW:"발톱",
  TALON:"맹금류 발톱",
  THORN:"가시",
  SPIKE:"뾰족한 가시",
  STING:"찌르다",
  HORN:"뿔",
  TUSK:"엄니",
  HOOK:"갈고리",
  FORK:"포크",
  SAW:"톱",
  RAZOR:"면도날",
  SABER:"군도",
  PRONG:"갈래 끝",
  BARB:"미늘",
  ARROWHEAD:"화살촉",
  RAILGUN:"레일건",
  SLINGSHOT:"새총",
  SHOTGUN:"산탄총",
  GATLING:"개틀링건",
  BATTERY:"포대",
  BOULDER:"큰 바윗돌",
  BARRAGE:"집중 포격",
  SLUG:"대구경 탄환",
  THROWER:"던지는 장치",
  MACHINEGUN:"기관총",
  TURRET:"포탑",
  MUSKET:"머스킷총",
  CANNONBALL:"포탄",
  FIREBALL:"불덩이",
  FIRECRACKER:"폭죽",
  LANDMINE:"지뢰",
  CHARGE:"폭약",
  SPARKLER:"불꽃 막대",
  POWDER:"화약가루",
  FUSE:"도화선",
  DETONATOR:"기폭장치",
  SHOCKWAVE:"충격파",
  QUAKE:"지진",
  EARTHQUAKE:"지진",
  PYRO:"불꽃 기술",
  SPARK:"불꽃·전기 불똥",
  VOLT:"전압 단위",
  THUNDERBOLT:"벼락",
  PRISM:"프리즘",
  RAINBOW:"무지개",
  CRYSTAL:"수정",
  GLINT:"반짝임",
  GLEAM:"희미한 빛",
  RADIANCE:"빛남",
  SUNBEAM:"햇살",
  STROBE:"섬광등",
  SHINE:"빛나다",
  FLARE:"섬광",
  CANDLE:"양초",
  BONFIRE:"모닥불",
  FURNACE:"용광로",
  FIREPLACE:"벽난로",
  COAL:"석탄",
  BURN:"태우다",
  SMOKE:"연기",
  OVEN:"오븐",
  KILN:"가마",
  CAMPFIRE:"야영 모닥불",
  SCORCH:"그을리다",
  FLINT:"부싯돌",
  HOT:"뜨거운",
  SAUNA:"사우나",
  ICICLE:"고드름",
  ICEBERG:"빙산",
  SNOWMAN:"눈사람",
  ICECUBE:"얼음 조각",
  SNOWBALL:"눈덩이",
  SNOWFLAKE:"눈송이",
  PUDDLE:"물웅덩이",
  DRIZZLE:"이슬비",
  DEW:"이슬",
  FLOOD:"홍수",
  WET:"젖은",
  SHADE:"그늘",
  WATERFALL:"폭포",
  FOG:"안개",
  SPRINKLER:"스프링클러",
  SNAKE:"뱀",
  SPIDER:"거미",
  MUSHROOM:"버섯",
  FUNGUS:"곰팡이류",
  MOLD:"곰팡이",
  GERM:"세균",
  BACTERIA:"박테리아",
  VIRUS:"바이러스",
  POLLUTION:"오염",
  SMOG:"스모그",
  STINGER:"독침",
  JELLYFISH:"해파리",
  NETTLE:"쐐기풀",
  WASP:"말벌",
  WHISTLE:"휘파람",
  AIR:"공기",
  DRAFT:"외풍",
  BLOW:"불다",
  BREATH:"숨결",
  FANFARE:"팡파르",
  PULSE:"맥동",
  TSUNAMI:"쓰나미",
  WHIRLWIND:"회오리바람",
  TIDAL:"조수의",
  CURRENT:"흐름",
  TURBINE:"터빈",
  WHIRLPOOL:"소용돌이",
  BUBBLE:"거품",
  ASTEROID:"소행성",
  SATURN:"토성",
  JUPITER:"목성",
  NEBULA:"성운",
  GALAXY:"은하",
  COSMOS:"우주",
  SPACE:"공간",
  ECLIPSE:"일식·월식",
  METEORITE:"운석",
  PULSAR:"펄서",
  QUASAR:"퀘이사",
  WORMHOLE:"웜홀",
  VOID:"빈 공간",
  VACUUM:"진공",
  DOOR:"문",
  TOWER:"탑",
  KEEP:"성채",
  CAGE:"우리",
  NET:"그물",
  WEB:"거미줄",
  HEDGE:"산울타리",
  HUT:"오두막",
  HOUSE:"집",
  BUSH:"덤불",
  ROOT:"뿌리",
  TREE:"나무",
  TRUNK:"나무줄기",
  ROPE:"밧줄",
  LOCK:"자물쇠",
  BLANKET:"담요",
  FARM:"농장",
  MILL:"방앗간",
  MINT:"주화 제조소",
  BANK:"은행",
  GOLD:"금",
  SILVER:"은",
  IRON:"철",
  COPPER:"구리",
  DIAMOND:"다이아몬드",
  RUBY:"루비",
  GEM:"보석",
  TREASURE:"보물",
  MACHINE:"기계",
  PUMP:"펌프",
  MOTOR:"모터",
  TOOL:"도구",
  FACTORY:"공장",
  MINE:"광산",
  CARE:"돌봄",
  AID:"도움",
  HELP:"돕다",
  HEALTH:"건강",
  MEDICINE:"약",
  HOSPITAL:"병원",
  CLINIC:"진료소",
  POTION:"물약",
  BALM:"연고",
  HERB:"약초",
  TONIC:"강장제",
  VITAMIN:"비타민",
  ANTIDOTE:"해독제",
  PLASTER:"반창고",
  ELIXIR:"영약",
  FIRSTAID:"응급처치",
  SMART:"똑똑한",
  WISE:"현명한",
  FOCUS:"집중",
  LUCKY:"운 좋은",
  LUCK:"행운",
  BRAVE:"용감한",
  BOLD:"대담한",
  SUPER:"매우 뛰어난",
  MIGHTY:"강력한",
  FIERCE:"맹렬한",
  PRECISE:"정확한",
  FOCUSED:"집중된",
  STEADY:"안정적인",
  CHARGED:"충전된",
  GOLDEN:"황금의",
  SILENT:"조용한",
  HYPER:"초고속의",
  ENDLESS:"끝없는",
  STABLE:"안정된",
  RHYTHM:"리듬",
  SONIC:"음속의",
  SOUND:"소리",
  MUSIC:"음악",
  SONG:"노래",
  BELL:"종",
  CLOCK:"시계",
  HOURGLASS:"모래시계",
  RIDDLE:"수수께끼",
  MAGIC:"마법",
  SPELL:"주문",
  WIZARD:"마법사",
  GHOST:"유령",
  PHOENIX:"불사조",
  DREAM:"꿈",
  ILLUSION:"환영",
  SHADOW:"그림자",
  SPECTRUM:"빛의 스펙트럼"
});
add('rapid','APPLE,PEAR,PEACH,PLUM,GRAPE,LEMON,BANANA,BERRY,BEAN,ACORN,SHELL,LEAF,PAPER,FEATHER,SAND,DUST,MARBLE,SNAP,DROP,RUBBER,BOUNCE,PEA');
add('pierce','FANG,CLAW,TALON,THORN,SPIKE,STING,HORN,TUSK,HOOK,FORK,SAW,RAZOR,SABER,PRONG,BARB,ARROWHEAD');
add('burst','RAILGUN,SLINGSHOT,SHOTGUN,GATLING,BATTERY,BOULDER,BARRAGE,SLUG,THROWER,MACHINEGUN,TURRET,MUSKET,CANNONBALL');
add('explosive','FIREBALL,FIRECRACKER,LANDMINE,CHARGE,SPARKLER,POWDER,FUSE,DETONATOR,SHOCKWAVE,QUAKE,EARTHQUAKE,PYRO');
add('beam','SPARK,VOLT,THUNDERBOLT,PRISM,RAINBOW,CRYSTAL,GLINT,GLEAM,RADIANCE,SUNBEAM,STROBE,SHINE,FLARE');
add('burn','CANDLE,BONFIRE,FURNACE,FIREPLACE,COAL,BURN,SMOKE,OVEN,KILN,CAMPFIRE,SCORCH,FLINT,HOT,SAUNA');
add('slow','ICICLE,ICEBERG,SNOWMAN,ICECUBE,SNOWBALL,SNOWFLAKE,PUDDLE,DRIZZLE,DEW,FLOOD,WET,SHADE,WATERFALL,FOG,SPRINKLER');
add('poison','SNAKE,SPIDER,MUSHROOM,FUNGUS,MOLD,GERM,BACTERIA,VIRUS,POLLUTION,SMOG,STINGER,JELLYFISH,NETTLE,WASP');
add('push','WHISTLE,AIR,DRAFT,BLOW,BREATH,FANFARE,PULSE,TSUNAMI,WHIRLWIND,TIDAL,CURRENT,TURBINE,WHIRLPOOL,BUBBLE');
add('gravity','ASTEROID,SATURN,JUPITER,NEBULA,GALAXY,COSMOS,SPACE,ECLIPSE,METEORITE,PULSAR,QUASAR,WORMHOLE,VOID,VACUUM');
add('barrier','DOOR,TOWER,KEEP,CAGE,NET,WEB,HEDGE,HUT,HOUSE,BUSH,ROOT,TREE,TRUNK,ROPE,LOCK,BLANKET');
add('resource','FARM,MILL,MINT,BANK,GOLD,SILVER,IRON,COPPER,DIAMOND,RUBY,GEM,TREASURE,MACHINE,PUMP,MOTOR,TOOL,FACTORY,MINE');
add('repair','CARE,AID,HELP,HEALTH,MEDICINE,HOSPITAL,CLINIC,POTION,BALM,HERB,TONIC,VITAMIN,ANTIDOTE,PLASTER,ELIXIR,FIRSTAID');
add('modifier','SMART,WISE,FOCUS,LUCKY,LUCK,BRAVE,BOLD,SUPER,MIGHTY,FIERCE,PRECISE,FOCUSED,STEADY,CHARGED,GOLDEN,SILENT,HYPER,ENDLESS,STABLE');
add('special','RHYTHM,SONIC,SOUND,MUSIC,SONG,BELL,CLOCK,HOURGLASS,RIDDLE,MAGIC,SPELL,WIZARD,GHOST,PHOENIX,DREAM,ILLUSION,SHADOW,SPECTRUM');

const ROLE_STATS={
  rapid:{damage:13,range:.19,rate:2.25,projectile:true,projectileSpeed:.72},
  pierce:{damage:24,range:.22,rate:.88,pierce:true},
  burst:{damage:29,range:.25,rate:.58,area:.075,projectile:true,projectileSpeed:.48},
  explosive:{damage:38,range:.20,rate:.38,area:.11,projectile:true,projectileSpeed:.42},
  beam:{damage:22,range:.27,rate:.78,beam:true,chain:1},
  burn:{damage:13,range:.18,rate:1.05,projectile:true,projectileSpeed:.58,burn:7},
  slow:{damage:9,range:.19,rate:1.10,projectile:true,projectileSpeed:.56,slow:.58},
  poison:{damage:8,range:.20,rate:1.18,projectile:true,projectileSpeed:.54,poison:6},
  push:{damage:8,range:.18,rate:.72,push:.045},
  gravity:{damage:5,range:.19,rate:.55,pull:.032,area:.13},
  barrier:{damage:0,range:.13,rate:0,barrierSlow:.62},
  resource:{damage:0,range:.18,rate:0,harvest:3},
  repair:{damage:0,range:.14,rate:0,heal:2},
  modifier:{damage:0,range:.16,rate:0,aura:true},
  special:{damage:48,range:.23,rate:.48,area:.09,projectile:true,projectileSpeed:.50}
};

const MODIFIERS={
  FAST:{rate:1.34}, SPEED:{rate:1.28}, QUICK:{rate:1.24},
  BIG:{damage:1.12,area:1.40}, WIDE:{area:1.32,range:1.08}, LONG:{range:1.34},
  HEAVY:{damage:1.38,rate:.82,push:1.35}, DOUBLE:{damage:1.58},
  POWER:{damage:1.27}, BOOST:{damage:1.18,rate:1.12}, STRONG:{damage:1.25},
  RAPID:{rate:1.30}, SWIFT:{rate:1.22,range:1.05},
  GIANT:{damage:1.18,area:1.45}, HUGE:{damage:1.15,area:1.35},
  SHARP:{damage:1.30}, HARD:{damage:1.22}, TRIPLE:{damage:1.72},
  ULTRA:{damage:1.30,rate:1.12,range:1.10}, MEGA:{damage:1.20,area:1.30},
  DEEP:{range:1.22}, BRIGHT:{range:1.12,rate:1.08}
};


const SIGNATURES={
  "ARROW": {
    "rate": 1.15,
    "flavor": "빠른 화살 연사"
  },
  "APPLE": {
    "rate": 1.22,
    "damage": 0.84,
    "flavor": "가볍고 빠른 과일탄"
  },
  "BANANA": {
    "area": 1.7,
    "damage": 0.8,
    "flavor": "넓게 튀는 과일탄"
  },
  "MARBLE": {
    "damage": 1.2,
    "flavor": "단단한 구슬탄"
  },
  "CLAW": {
    "rate": 1.32,
    "damage": 0.88,
    "flavor": "짧은 간격의 연속 베기"
  },
  "THORN": {
    "element": "poison",
    "poison": 1.22,
    "flavor": "독이 남는 가시"
  },
  "SPIKE": {
    "shieldBreak": 2.2,
    "flavor": "보호막 파괴 특화"
  },
  "HAMMER": {
    "damage": 1.3,
    "rate": 0.75,
    "shieldBreak": 1.8,
    "flavor": "강한 일격과 방패 분쇄"
  },
  "RAILGUN": {
    "damage": 1.7,
    "rate": 0.55,
    "range": 1.2,
    "flavor": "장거리 고위력 포격"
  },
  "SHOTGUN": {
    "area": 1.6,
    "range": 0.72,
    "rate": 1.3,
    "flavor": "근거리 산탄"
  },
  "MACHINEGUN": {
    "rate": 2.5,
    "damage": 0.6,
    "flavor": "초고속 탄막"
  },
  "SLINGSHOT": {
    "rate": 1.4,
    "damage": 0.8,
    "flavor": "빠른 돌팔매"
  },
  "FIREBALL": {
    "element": "burn",
    "area": 1.28,
    "burn": 1.4,
    "flavor": "폭발한 자리에 불길"
  },
  "LANDMINE": {
    "area": 1.65,
    "rate": 0.66,
    "damage": 1.22,
    "flavor": "넓게 터지는 지뢰"
  },
  "SHOCKWAVE": {
    "element": "push",
    "push": 1.8,
    "area": 1.55,
    "flavor": "충격파로 밀어내기"
  },
  "QUAKE": {
    "element": "slow",
    "slow": 0.45,
    "area": 1.55,
    "flavor": "진동으로 둔화"
  },
  "THUNDERBOLT": {
    "chain": 4,
    "damage": 1.15,
    "flavor": "최대 네 갈래 연쇄 번개"
  },
  "SPARK": {
    "rate": 1.55,
    "damage": 0.73,
    "chain": 2,
    "flavor": "빠르게 튀는 전기"
  },
  "PRISM": {
    "chain": 3,
    "range": 1.15,
    "flavor": "빛이 세 갈래로 굴절"
  },
  "RAINBOW": {
    "chain": 3,
    "flavor": "다채로운 연쇄 광선"
  },
  "CRYSTAL": {
    "shieldBreak": 2.4,
    "flavor": "수정 광선이 보호막 관통"
  },
  "LASER": {
    "damage": 1.28,
    "flavor": "정밀 고출력 광선"
  },
  "CANDLE": {
    "damage": 0.72,
    "burn": 1.8,
    "rate": 1.32,
    "flavor": "약하지만 오래 남는 불"
  },
  "BONFIRE": {
    "area": 1.65,
    "burn": 1.3,
    "flavor": "넓게 번지는 모닥불"
  },
  "FURNACE": {
    "damage": 1.4,
    "rate": 0.65,
    "burn": 1.6,
    "flavor": "천천히 달구는 고열"
  },
  "FIRE": {
    "burn": 1.25,
    "flavor": "기본 지속 화염"
  },
  "GLACIER": {
    "slow": 0.26,
    "rate": 0.65,
    "range": 1.25,
    "flavor": "멀리까지 강한 감속"
  },
  "SNOWBALL": {
    "area": 1.35,
    "slow": 0.6,
    "flavor": "주변을 함께 느리게"
  },
  "ICEBERG": {
    "slow": 0.34,
    "damage": 1.16,
    "flavor": "강력한 냉기"
  },
  "SPRINKLER": {
    "area": 1.55,
    "damage": 0.68,
    "flavor": "주변에 넓게 물 분사"
  },
  "SPIDER": {
    "poison": 1.3,
    "slow": 0.65,
    "flavor": "독과 거미줄로 압박"
  },
  "VIRUS": {
    "poison": 1.8,
    "damage": 0.72,
    "flavor": "약하지만 오래가는 감염"
  },
  "NETTLE": {
    "poison": 1.45,
    "flavor": "아픈 독성 가시"
  },
  "ACID": {
    "shieldBreak": 2.2,
    "poison": 1.24,
    "flavor": "보호막을 녹이는 산"
  },
  "TSUNAMI": {
    "push": 2,
    "area": 1.8,
    "rate": 0.53,
    "flavor": "거대한 물결로 후퇴"
  },
  "BUBBLE": {
    "push": 0.6,
    "rate": 1.7,
    "flavor": "잔잔한 연속 넉백"
  },
  "WHIRLPOOL": {
    "area": 1.55,
    "push": 1.6,
    "flavor": "넓은 소용돌이"
  },
  "HURRICANE": {
    "area": 1.4,
    "push": 1.7,
    "flavor": "넓게 휘몰아치는 바람"
  },
  "SATURN": {
    "pull": 1.55,
    "area": 1.35,
    "flavor": "넓은 중력 고리"
  },
  "GALAXY": {
    "pull": 1.4,
    "area": 1.6,
    "rate": 0.75,
    "flavor": "광범위한 중력장"
  },
  "BLACKHOLE": {
    "pull": 1.85,
    "area": 1.5,
    "flavor": "깊게 끌어당기는 중력"
  },
  "WEB": {
    "barrierSlow": 0.4,
    "range": 1.15,
    "flavor": "거미줄 덫으로 강한 둔화"
  },
  "ROOT": {
    "barrierSlow": 0.35,
    "range": 0.85,
    "flavor": "뿌리로 발 묶기"
  },
  "CASTLE": {
    "barrierSlow": 0.75,
    "range": 1.5,
    "flavor": "넓은 방어 영역"
  },
  "WALL": {
    "barrierSlow": 0.55,
    "flavor": "단단한 벽"
  },
  "GOLD": {
    "harvest": 1.18,
    "flavor": "INK 채굴 효율 상승"
  },
  "DIAMOND": {
    "harvest": 1.5,
    "flavor": "고급 광석 수확"
  },
  "PUMP": {
    "harvest": 1.35,
    "flavor": "빠른 INK 펌핑"
  },
  "FACTORY": {
    "harvest": 1.5,
    "flavor": "가공으로 높은 생산량"
  },
  "MINER": {
    "harvest": 1.1,
    "flavor": "안정적인 채굴"
  },
  "HOSPITAL": {
    "heal": 2.1,
    "flavor": "CORE 대량 회복"
  },
  "BANDAGE": {
    "heal": 0.75,
    "flavor": "빠른 응급 수선"
  },
  "FIRSTAID": {
    "heal": 1.3,
    "flavor": "효율적인 긴급 회복"
  },
  "PHOENIX": {
    "element": "burn",
    "burn": 1.5,
    "rate": 0.8,
    "flavor": "불사조의 불꽃"
  },
  "SONIC": {
    "element": "push",
    "push": 1.5,
    "area": 1.5,
    "flavor": "음파 충격파"
  },
  "CLOCK": {
    "element": "slow",
    "slow": 0.38,
    "rate": 0.7,
    "flavor": "시간을 늦추는 파동"
  },
  "MAGIC": {
    "chain": 3,
    "range": 1.1,
    "flavor": "갈라지는 마법 탄"
  },
  "RIDDLE": {
    "damage": 1.7,
    "rate": 0.6,
    "flavor": "어려운 수수께끼 일격"
  },
  "MIRROR": {
    "chain": 3,
    "damage": 0.84,
    "flavor": "빛 반사로 여러 대상"
  },
  "TIME": {
    "element": "slow",
    "slow": 0.3,
    "flavor": "시간 감속"
  },
  "PORTAL": {
    "element": "push",
    "push": 1.7,
    "flavor": "차원문 밀어내기"
  }
};

Object.assign(MODIFIERS,{"SMART":{"damage":1.1,"range":1.14},"WISE":{"range":1.18},"FOCUS":{"damage":1.2,"range":1.05},"LUCKY":{"damage":1.15,"rate":1.06},"LUCK":{"damage":1.1,"rate":1.08},"BRAVE":{"damage":1.28},"BOLD":{"damage":1.22},"SUPER":{"damage":1.23,"rate":1.1},"MIGHTY":{"damage":1.3},"FIERCE":{"damage":1.2,"rate":1.1},"PRECISE":{"range":1.24,"damage":1.12},"FOCUSED":{"damage":1.22},"STEADY":{"rate":1.17},"CHARGED":{"damage":1.22},"GOLDEN":{"damage":1.2},"SILENT":{"range":1.17},"HYPER":{"rate":1.34},"ENDLESS":{"range":1.26},"STABLE":{"range":1.14,"rate":1.08}});

const START_RACK='MINERARROWIC'.split('');
const FILLER_FREQUENCY='EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ'.split('');

window.WordSiegeData={
  words,
  wordList:Object.keys(words),
  roleStats:ROLE_STATS,
  roleLabels:ROLE_LABELS,
  modifiers:MODIFIERS,
  signatures:SIGNATURES,
  startRack:START_RACK,
  fillerFrequency:FILLER_FREQUENCY,
  maxRack:12
};
})();
