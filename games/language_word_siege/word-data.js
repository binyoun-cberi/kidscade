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

// Additional playable word towers with verified meanings.
Object.assign(MEANINGS,{
  PEBBLES:"자갈",
  NUT:"견과",
  PINECONE:"솔방울",
  MOSS:"이끼",
  PETAL:"꽃잎",
  DROPLET:"작은 물방울",
  PING:"짧은 소리",
  BOW:"활",
  SPEARHEAD:"창끝",
  LANCET:"작은 칼",
  FLAK:"대공 포화",
  SHRAPNEL:"파편탄",
  ERUPTION:"분출",
  FLASHBANG:"섬광탄",
  CRATER:"분화구",
  DETONATION:"폭발",
  BLASTWAVE:"폭풍파",
  MOONBEAM:"달빛",
  FLASHLIGHT:"손전등",
  REFRACTION:"굴절",
  AURORA:"오로라",
  LUMEN:"광속 단위",
  SUNLIGHT:"햇빛",
  CINDER:"잿불",
  HEATER:"난방기",
  MATCH:"성냥",
  WILDFIRE:"산불",
  HAILSTONE:"우박 덩이",
  PERMAFROST:"영구 동토",
  SLUSH:"녹은 눈",
  TOADSTOOL:"독버섯",
  ALGAE:"조류",
  STINGRAY:"가오리",
  MIDGE:"작은 날벌레",
  MOSQUITO:"모기",
  GUSTY:"돌풍의",
  JETSTREAM:"제트 기류",
  PROPELLER:"프로펠러",
  BLACKSTAR:"검은 별",
  GRAVITON:"중력자",
  BULWARK:"방벽",
  PANELS:"판자들",
  REFINERY:"정제 공장",
  HARVEST:"수확",
  GEMSTONE:"보석 원석",
  RIG:"채굴 장치",
  SMELTER:"제련기",
  RESCUE:"구조하다",
  HEALER:"치료사",
  REVIVE:"되살리다",
  REMEDY:"치료법",
  RECOVER:"회복하다",
  TINY:"아주 작은",
  EXTRA:"추가의",
  EPIC:"웅장한",
  OVERDRIVE:"과출력",
  MAXIMUM:"최대의",
  CHRONOS:"시간의 신",
  SHOCK:"충격",
  PHANTOM:"유령",
  SPECTER:"유령",
  STARDUST:"별가루",
  SUPERNOVA:"초신성",
  PARADOX:"역설"
});
add('rapid','PEBBLES,NUT,PINECONE,MOSS,PETAL,DROPLET,PING,BOW');
add('pierce','SPEARHEAD,LANCET');
add('burst','FLAK,SHRAPNEL');
add('explosive','ERUPTION,FLASHBANG,CRATER,DETONATION,BLASTWAVE');
add('beam','MOONBEAM,FLASHLIGHT,REFRACTION,AURORA,LUMEN,SUNLIGHT');
add('burn','CINDER,HEATER,MATCH,WILDFIRE');
add('slow','HAILSTONE,PERMAFROST,SLUSH');
add('poison','TOADSTOOL,ALGAE,STINGRAY,MIDGE,MOSQUITO');
add('push','GUSTY,JETSTREAM,PROPELLER');
add('gravity','BLACKSTAR,GRAVITON');
add('barrier','BULWARK,PANELS');
add('resource','REFINERY,HARVEST,GEMSTONE,RIG,SMELTER');
add('repair','RESCUE,HEALER,REVIVE,REMEDY,RECOVER');
add('modifier','TINY,EXTRA,EPIC,OVERDRIVE,MAXIMUM');
add('special','CHRONOS,SHOCK,PHANTOM,SPECTER,STARDUST,SUPERNOVA,PARADOX');

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

Object.assign(SIGNATURES,{
  "BOW": {
    "rate": 1.15,
    "damage": 1.03,
    "flavor": "가벼운 연속 화살"
  },
  "PINECONE": {
    "area": 1.3,
    "damage": 0.8,
    "flavor": "튀어오르는 솔방울"
  },
  "DAGGER": {
    "rate": 1.45,
    "range": 0.8,
    "flavor": "빠른 근접 찌르기"
  },
  "SCYTHE": {
    "area": 1.5,
    "rate": 0.72,
    "flavor": "넓은 낫베기"
  },
  "BAZOOKA": {
    "area": 1.55,
    "damage": 1.3,
    "rate": 0.6,
    "flavor": "중형 광역 폭발"
  },
  "BALLISTA": {
    "damage": 1.6,
    "rate": 0.67,
    "range": 1.2,
    "flavor": "무거운 관통 쇠뇌"
  },
  "GRENADE": {
    "area": 1.24,
    "rate": 1.16,
    "flavor": "빠른 범위 폭발"
  },
  "DYNAMITE": {
    "area": 1.65,
    "rate": 0.75,
    "flavor": "큰 폭풍 피해"
  },
  "BLASTWAVE": {
    "element": "push",
    "area": 1.4,
    "push": 1.7,
    "flavor": "폭발과 밀쳐내기"
  },
  "PHOTON": {
    "chain": 3,
    "rate": 1.4,
    "flavor": "광자 연속 도약"
  },
  "AURORA": {
    "chain": 3,
    "range": 1.3,
    "flavor": "광범위 오로라 레이저"
  },
  "INFERNO": {
    "burn": 2.1,
    "area": 1.45,
    "flavor": "강한 지속 화염"
  },
  "EMBER": {
    "burn": 1.6,
    "rate": 1.7,
    "damage": 0.65,
    "flavor": "작은 불씨 연타"
  },
  "BLIZZARD": {
    "element": "slow",
    "slow": 0.32,
    "area": 1.65,
    "flavor": "넓은 범위 냉기"
  },
  "PERMAFROST": {
    "slow": 0.25,
    "range": 1.2,
    "rate": 0.55,
    "flavor": "강력한 영구 빙결"
  },
  "SCORPION": {
    "poison": 1.8,
    "rate": 0.8,
    "flavor": "강력한 독침"
  },
  "TOADSTOOL": {
    "area": 1.4,
    "poison": 1.5,
    "flavor": "독 포자 확산"
  },
  "CYCLONE": {
    "push": 1.85,
    "area": 1.6,
    "flavor": "넓게 밀어내는 소용돌이"
  },
  "JETSTREAM": {
    "push": 1.6,
    "range": 1.35,
    "flavor": "긴 사거리 바람"
  },
  "SINGULARITY": {
    "pull": 2.2,
    "area": 1.65,
    "flavor": "강력한 중력 압축"
  },
  "SUPERNOVA": {
    "element": "burn",
    "area": 1.65,
    "damage": 1.5,
    "rate": 0.5,
    "flavor": "빛나는 광역 폭발"
  },
  "BUNKER": {
    "barrierSlow": 0.38,
    "range": 1.2,
    "flavor": "견고한 방어 진지"
  },
  "RAMPART": {
    "barrierSlow": 0.43,
    "range": 1.28,
    "flavor": "긴 성벽 저지"
  },
  "EXCAVATOR": {
    "harvest": 1.45,
    "flavor": "강력한 채굴"
  },
  "REFINERY": {
    "harvest": 1.6,
    "flavor": "광석 정제 생산"
  },
  "NURSE": {
    "heal": 1.4,
    "flavor": "빠른 치료"
  },
  "REVIVE": {
    "heal": 1.75,
    "flavor": "강력한 복구"
  }
});

const COMBOS=[
  {
    "a": "FIRE",
    "b": "WIND",
    "name": "화염폭풍",
    "bonus": {
      "damage": 1.2,
      "area": 1.25
    }
  },
  {
    "a": "ICE",
    "b": "WATER",
    "name": "얼음물",
    "bonus": {
      "slow": 0.77,
      "range": 1.1
    }
  },
  {
    "a": "POISON",
    "b": "ARROW",
    "name": "독화살",
    "bonus": {
      "damage": 1.15,
      "poison": 1.26
    }
  },
  {
    "a": "LASER",
    "b": "PRISM",
    "name": "굴절광",
    "bonus": {
      "chain": 1,
      "range": 1.12
    }
  },
  {
    "a": "SPARK",
    "b": "THUNDERBOLT",
    "name": "연쇄방전",
    "bonus": {
      "rate": 1.12,
      "damage": 1.16
    }
  },
  {
    "a": "ROOT",
    "b": "WEB",
    "name": "이중덫",
    "bonus": {
      "barrierSlow": 0.74,
      "range": 1.15
    }
  },
  {
    "a": "MINER",
    "b": "DRILL",
    "name": "공동채굴",
    "bonus": {
      "harvest": 1.22
    }
  },
  {
    "a": "HOSPITAL",
    "b": "DOCTOR",
    "name": "의료지원",
    "bonus": {
      "heal": 1.32
    }
  },
  {
    "a": "BOMB",
    "b": "CANNON",
    "name": "포격폭발",
    "bonus": {
      "area": 1.22,
      "damage": 1.12
    }
  },
  {
    "a": "SUN",
    "b": "SOLAR",
    "name": "태양광",
    "bonus": {
      "burn": 1.22,
      "range": 1.12
    }
  },
  {
    "a": "SATURN",
    "b": "GALAXY",
    "name": "은하중력",
    "bonus": {
      "pull": 1.3,
      "area": 1.25
    }
  },
  {
    "a": "GOLD",
    "b": "DIAMOND",
    "name": "보석광맥",
    "bonus": {
      "harvest": 1.27
    }
  },
  {
    "a": "RAINBOW",
    "b": "PRISM",
    "name": "일곱빛",
    "bonus": {
      "chain": 1,
      "range": 1.12
    }
  },
  {
    "a": "SWORD",
    "b": "SHARP",
    "name": "날카로운 검",
    "bonus": {
      "damage": 1.18
    }
  },
  {
    "a": "SNAKE",
    "b": "VENOM",
    "name": "독사",
    "bonus": {
      "poison": 1.34
    }
  },
  {
    "a": "MUSIC",
    "b": "RHYTHM",
    "name": "공명",
    "bonus": {
      "rate": 1.28
    }
  },
  {
    "a": "FIREBALL",
    "b": "BONFIRE",
    "name": "불씨폭발",
    "bonus": {
      "burn": 1.24,
      "area": 1.17
    }
  },
  {
    "a": "SHIELD",
    "b": "CASTLE",
    "name": "철벽",
    "bonus": {
      "barrierSlow": 0.8,
      "range": 1.2
    }
  },
  {
    "a": "QUAKE",
    "b": "ROOT",
    "name": "땅의 속박",
    "bonus": {
      "slow": 0.77,
      "area": 1.12
    }
  },
  {
    "a": "CLOCK",
    "b": "TIME",
    "name": "시간정지",
    "bonus": {
      "slow": 0.68,
      "range": 1.15
    }
  },
  // Playful pair discoveries reward experimentation, not just raw attack stacking.
  {a:'BUBBLE',b:'BOUNCE',name:'거품 트램펄린',bonus:{damage:1.12,range:1.06}},
  {a:'MUSIC',b:'RAINBOW',name:'무지개 디스코',bonus:{damage:1.08,rate:1.12}},
  {a:'MIRROR',b:'MAGIC',name:'매직 미러',bonus:{rate:1.12,damage:1.10}},
  {a:'GHOST',b:'DREAM',name:'유령의 악몽',bonus:{range:1.08,damage:1.06}},
  {a:'RUBBER',b:'STAR',name:'별똥별 핀볼',bonus:{rate:1.10,damage:1.08}}
];

const WAVE_BALANCE={
  hpLinear:.16,
  hpQuadratic:.065,
  speedGrowth:.034,
  openingPressure:.28,
  pressurePerWave:.14
};

// The compact hand-curated set wins whenever a meaning or role conflicts with
// the large licensed lexical database. The broader dictionary makes free typing
// worthwhile; the tile-rack hint pool stays compact to keep tablet UX responsive.
const BUILTIN_WORDS=Object.keys(words);
const OPEN_LEXICON=window.WordSiegeOpenLexicon?.entries||[];
let expandedWords=0;
const firstRankWords=[];
for(const [word,meaning,role] of OPEN_LEXICON){
  if(!/^[A-Z]{3,12}$/.test(word)||!ROLE_STATS[role])continue;
  if(words[word])continue;
  words[word]={
    word,role,roleLabel:ROLE_LABELS[role],color:ROLE_COLORS[role],
    meaning,difficulty:difficulty(word),openDictionary:true
  };
  if(expandedWords<3600)firstRankWords.push(word);
  if(role==='modifier'){
    // Without a procedural buff, a newly recognised adjective tower would do
    // nothing. Modest generic bonuses preserve balance beside curated FAST.
    MODIFIERS[word]={damage:1.08,rate:1.06};
  }
  expandedWords++;
}
// FIGHT and COW are intentionally not generic dictionary defaults.
if(words.FIGHT){words.FIGHT.role='pierce';words.FIGHT.roleLabel=ROLE_LABELS.pierce;words.FIGHT.color=ROLE_COLORS.pierce;words.FIGHT.meaning='싸우다'}
if(words.COW){words.COW.role='rapid';words.COW.roleLabel=ROLE_LABELS.rapid;words.COW.color=ROLE_COLORS.rapid;words.COW.meaning='소'}
Object.assign(SIGNATURES,{
  FIGHT:{damage:1.36,rate:1.24,flavor:'연속 충격권 공격'},
  COW:{rate:1.05,area:1.20,flavor:'우유 구슬 연사'},
  DOG:{rate:1.34,flavor:'날렵한 소리탄'},
  HORSE:{rate:1.25,range:1.15,flavor:'빠른 질주탄'},
  ELEPHANT:{push:1.55,damage:1.18,flavor:'무거운 충격파'},
  PUNCH:{damage:1.28,rate:1.20,flavor:'연타 공격'},
  BATTLE:{damage:1.15,area:1.18,flavor:'전투 파동'},
  NUKE:{damage:2.6,area:1.15,rate:.55,flavor:'초대형 핵폭발'}
});

// Behavior variants are separate from role stats: a WORD changes *how* a tower fights,
// not only its damage multiplier. Unlisted dictionary entries still use their role default.
const BEHAVIORS=Object.freeze({
  ARROW:{mode:'volley',description:'두 발의 빠른 화살'},
  COW:{mode:'milk',description:'작은 우유탄이 옆의 적에게 튐'},
  BANANA:{mode:'ricochet',description:'껍질탄이 두 번째 적에게 튐'},
  RAILGUN:{mode:'rail',description:'충전 후 일직선 장거리 관통'},
  BALLISTA:{mode:'rail',description:'한 줄로 꿰뚫는 거대한 쇠뇌'},
  SHOTGUN:{mode:'shotgun',description:'가까울수록 강한 부채꼴 산탄'},
  GATLING:{mode:'gatling',description:'사격을 유지하면 발사속도 상승'},
  MACHINEGUN:{mode:'gatling',description:'연속 사격으로 예열하는 기관총'},
  SCYTHE:{mode:'cleave',description:'주위의 여러 적을 한번에 베기'},
  CLAW:{mode:'cleave',description:'빠른 근접 휘두르기'},
  DAGGER:{mode:'assassin',description:'빠른 적을 우선 추적'},
  HAMMER:{mode:'stun',description:'적을 잠깐 기절시키는 타격'},
  LANDMINE:{mode:'mine',description:'길에 지뢰를 심어 접근하면 폭발'},
  MISSILE:{mode:'homing',description:'적을 따라가는 추적 미사일'},
  ROCKET:{mode:'homing',description:'표적을 끝까지 따라가는 로켓'},
  GRENADE:{mode:'cluster',description:'폭발 후 작은 폭발 두 번'},
  METEOR:{mode:'meteor',description:'경고 후 하늘에서 운석 낙하'},
  NUKE:{mode:'nuke',description:'긴 충전 후 매우 큰 핵폭발'},
  FIREBALL:{mode:'firefield',description:'명중한 곳에 잠깐 불길'},
  INFERNO:{mode:'flamethrower',description:'전방 부채꼴 지속 화염'},
  VOLCANO:{mode:'lavafield',description:'폭발 자리에 용암 지대'},
  FREEZE:{mode:'freeze',description:'냉기가 쌓이면 적을 완전히 빙결'},
  ICE:{mode:'freeze',description:'냉기를 누적해 짧게 얼리기'},
  BLIZZARD:{mode:'blizzard',description:'범위 내 다수에게 눈보라'},
  SPIDER:{mode:'webpoison',description:'독과 거미줄 둔화를 동시에'},
  VIRUS:{mode:'infection',description:'감염된 적이 쓰러지면 전파'},
  ACID:{mode:'corrosion',description:'지속 피해와 방어력 감소'},
  TSUNAMI:{mode:'tidal',description:'파도가 다수의 적을 후퇴시킴'},
  BLACKHOLE:{mode:'vortex',description:'한 지점으로 모아 긴 시간 묶음'},
  SINGULARITY:{mode:'vortex',description:'강력한 중력 중심 생성'},
  PORTAL:{mode:'teleport',description:'적을 이동 경로 뒤쪽으로 이동'},
  DRILL:{mode:'drill',description:'광석을 빠르게 소모하며 채굴'},
  BANK:{mode:'interest',description:'웨이브 종료 시 보유 INK 이자'},
  HOSPITAL:{mode:'hospital',description:'천천히 큰 양의 CORE 회복'},
  BANDAGE:{mode:'bandage',description:'다친 CORE를 신속하게 회복'},
  // Playful signatures: word meaning becomes a visibly different combat verb.
  MUSIC:{mode:'disco',description:'쿵짝! 박자에 맞춰 적들이 춤추며 멈춤'},
  RUBBER:{mode:'pinball',description:'고무공이 적 사이를 연속으로 통통 튐'},
  BOUNCE:{mode:'spring',description:'적을 뿅! 뒤로 튕기는 스프링'},
  BUBBLE:{mode:'bubble',description:'적을 거품에 가뒀다가 팡! 터뜨림'},
  MIRROR:{mode:'mirror',description:'가까운 타워의 화력과 속성을 거울로 반사'},
  GHOST:{mode:'boo',description:'깜짝 등장! 적들이 겁먹고 되돌아감'},
  MAGIC:{mode:'spellbook',description:'불·얼음·독·바람 마법을 돌아가며 사용'},
  WIZARD:{mode:'spellbook',description:'두 명에게 불·얼음·독·바람을 번갈아 시전'},
  RAINBOW:{mode:'rainbow',description:'무지개 광선이 적들에게 다른 상태이상을 남김'},
  BOOMERANG:{mode:'boomerang',description:'부메랑이 지나가며 왕복 2번 타격'},
  MUSHROOM:{mode:'spores',description:'버섯이 톡! 독 포자를 넓게 퍼뜨림'},
  SLIME:{mode:'slimepool',description:'끈적한 초록 점액 웅덩이 생성'},
  VACUUM:{mode:'vacuum',description:'적 여러 명을 휘리릭 빨아들이며 되감기'},
  MAGNET:{mode:'magnet',description:'갑옷·보호막 적을 자석으로 끌어당김'},
  DREAM:{mode:'sleep',description:'적이 하품하며 잠들고 잠깐 움직이지 못함'},
  STAR:{mode:'shootingstars',description:'별똥별이 여러 적에게 연달아 떨어짐'},
  SNOW:{mode:'snowball',description:'굴러갈수록 커지는 눈덩이를 던짐'},
  RAIN:{mode:'raincloud',description:'빗구름을 만들어 넓은 구역을 축축하게 둔화'},
  SUN:{mode:'sunray',description:'태양광을 쏘아 주변 적들에게 화상'},
  CLOCK:{mode:'freeze',description:'시간 감속이 누적되면 정지'},
  TIME:{mode:'freeze',description:'시간 정지 효과를 누적'}
});

// Most imported dictionary entries were tagged "rapid" by the source dataset.
// Rather than pretending AND, APPLE, THUNDER and RETURN are the same weapon,
// the word's meaning (when recognizable) and its spelling determine a real
// fighting style. Curated word semantics take precedence over spelling.
const STYLE_FAMILIES=Object.freeze({
  volley:{label:'연사 화살',description:'두 탄환을 연달아 발사'},
  pinball:{label:'통통 핀볼',description:'적들을 차례로 튕기는 고무공'},
  boomerang:{label:'왕복 타격',description:'갔다 돌아오며 두 번 타격'},
  snowball:{label:'성장 눈덩이',description:'날아가며 커지는 범위 공격'},
  shootingstars:{label:'별똥별 폭격',description:'여러 목표에 작은 별똥별 발사'},
  spring:{label:'스프링',description:'적을 순간적으로 뒤로 튕김'},
  rainbow:{label:'다채로운 광선',description:'연쇄 공격과 화상·둔화·독'},
  splat:{label:'과즙 폭발',description:'과즙이 튀어 적들을 미끄러뜨림'},
  firework:{label:'불꽃놀이',description:'세 곳에 번갈아 색색의 폭발'},
  snap:{label:'함정 타격',description:'가까이 모인 적들의 발을 묶음'},
  echo:{label:'메아리 파동',description:'첫 공격 후 두 번째 파동이 돌아옴'},
  hailstorm:{label:'얼음 소나기',description:'주변에 우박을 떨어뜨리고 둔화'},
  ricochet:{label:'반사 탄환',description:'타격 뒤 근처 적에게 한 번 더 반사'},
  rail:{label:'직선 관통',description:'한 줄에 놓인 적을 꿰뚫음'},
  shotgun:{label:'부채꼴 공격',description:'가까운 적 여러 명을 동시에 공격'},
  gatling:{label:'회전 연사',description:'연속 사격할수록 공격 속도 상승'},
  cluster:{label:'연쇄 폭발',description:'폭발 뒤 작은 폭발을 연달아 생성'},
  meteor:{label:'운석 낙하',description:'표적을 예고하고 하늘에서 낙하'},
  stun:{label:'기절 공격',description:'강한 타격으로 적을 잠깐 멈춤'},
  assassin:{label:'추적 암살',description:'빠른 적을 우선 노림'},
  cleave:{label:'광역 베기',description:'주위의 적을 함께 휘두르며 타격'},
  spores:{label:'독 포자',description:'적 무리에 독 포자를 흩뿌림'},
  slimepool:{label:'끈적 웅덩이',description:'오랫동안 남는 둔화 지대'},
  raincloud:{label:'비구름',description:'넓은 지역을 비로 느리게 만듦'},
  sleep:{label:'수면 마법',description:'재우고 잠깐 움직이지 못하게 함'},
  boo:{label:'깜짝 공포',description:'놀란 적을 뒤로 도망가게 함'},
  spellbook:{label:'순환 마법',description:'불·얼음·독·바람을 번갈아 시전'},
  disco:{label:'춤추는 음파',description:'적들이 박자에 맞춰 멈춤'},
  magnet:{label:'보호막 견인',description:'보호막·갑옷 적을 먼저 잡음'},
  vacuum:{label:'흡입 소용돌이',description:'적 무리를 뒤로 휘감아 당김'},
  sunray:{label:'햇살 소각',description:'여러 적을 햇살로 태움'},
  freeze:{label:'빙결 누적',description:'냉기가 쌓이면 완전히 얼림'},
  tidal:{label:'거센 파도',description:'여러 적을 일제히 밀어냄'},
  vortex:{label:'중력 포획',description:'범위 안 적을 당기고 느리게 함'},
  mine:{label:'길목 지뢰',description:'적이 지날 때 폭발하는 덫'},
  barrier:{label:'방어진',description:'길목의 적에게 지속적인 감속'},
  resource:{label:'자원 장치',description:'주변 광맥을 채굴하여 INK 획득'},
  repair:{label:'CORE 치유',description:'손상된 CORE를 일정 시간마다 회복'},
  modifier:{label:'전투 지원',description:'주변 타워 성능을 강화'}
});
const CURATED_STYLE_GROUPS={
  splat:'APPLE,PEAR,PEACH,PLUM,GRAPE,LEMON,BERRY,BEAN,ACORN,PEA,SEED,PETAL,DROPLET,ORANGE',
  pinball:'BALL,DISC,MARBLE,COIN,PEBBLE,PEBBLES,ROCK,STONE,BOULDER,SLINGSHOT,BOUNCE,RUBBER',
  boomerang:'DART,BOLT,SLING,SHOT,FEATHER,LEAF,PAPER,SHELL,SNAP,DROP',
  snowball:'BRICK,ICEBERG,HAIL,HAILSTONE,ICICLE,GLACIER,SNOWBALL,SLEET',
  shootingstars:'STAR,SPARK,PHOTON,GLINT,GLEAM,STARDUST,ASTEROID,COMET',
  spring:'PING,PEA,PIN,NAIL,SEEDLING,SPRING,GUST,BREEZE,WHISTLE',
  firework:'FIREWORK,FIRECRACKER,CRACKER,SPARKLER,FLASHBANG,FLASH,STROBE,BLAZE',
  snap:'THORN,STING,FANG,TALON,HOOK,BARB,RAZOR,NET,WEB,ROOT,HEDGE,ROPE,LOCK,CAGE',
  echo:'ECHO,RHYTHM,SONIC,SOUND,SONG,BELL,SHOCK,PULSE,FANFARE,CRYSTAL,RESONANCE',
  hailstorm:'FROST,CHILL,COLD,WINTER,SLUSH,ICECUBE,SNOWFLAKE,PERMAFROST',
  ricochet:'BULLET,PELLET,SHRAPNEL,CANNONBALL,SLUG,BATTERY,FLAK,SHOOTER',
  rail:'LANCE,SPEAR,PIKE,TRIDENT,HARPOON,JAVELIN,RAPIER,ARROWHEAD,SPEARHEAD,LANCET,CROSSBOW',
  shotgun:'BARRAGE,SHRAPNEL,FLAK,THROWER,MUSKET,GUN,RIFLE,BLASTER,TURRET',
  gatling:'BULLET,PELLET,BATTERY,TURRET,MUSKET',
  cluster:'BOMB,BLAST,BURST,EXPLOSION,DYNAMITE,FUSE,DETONATOR,DETONATION,CHARGE,SHOCKWAVE,BLASTWAVE',
  meteor:'CATAPULT,ARTILLERY,MORTAR,HOWITZER,TREBUCHET,CRATER,ERUPTION,QUAKE,EARTHQUAKE',
  stun:'HAMMER,AXE,CHISEL,SAW,HORN,TUSK,PRONG',
  assassin:'DAGGER,KNIFE,KATANA,SABER,NEEDLE,STINGER,LANCET',
  cleave:'SWORD,BLADE,SCYTHE,CLAW,SAW,RAZOR',
  spores:'TOXIN,TOXIC,FUME,SPORE,FUNGUS,MOLD,GERM,BACTERIA,POLLUTION,SMOG,JELLYFISH,NETTLE,WASP',
  slimepool:'SLIME,ALGAE,MIDGE,MOSQUITO,TOADSTOOL,COBRA,SCORPION',
  raincloud:'WATER,MIST,DRIZZLE,DEW,PUDDLE,FLOOD,WET,WATERFALL,FOG,SPRINKLER',
  sleep:'SHADE,SHADOW,ILLUSION,PHANTOM,SPECTER',
  boo:'GHOST,PHANTOM,SPECTER',
  spellbook:'SPELL,RIDDLE,CHAOS,PARADOX,SPECTRUM,CHRONOS',
  disco:'MUSIC,SONG,RHYTHM,SONIC,BELL',
  magnet:'MAGNET,MASS,IRON,COPPER,STEEL',
  vacuum:'VORTEX,WHIRL,WHIRLWIND,WHIRLPOOL,TORNADO,CYCLONE',
  sunray:'HEAT,FLAME,FIRE,BONFIRE,CAMPFIRE,CANDLE,TORCH,OVEN,FURNACE,KILN,HEATER,SUNLIGHT,SUNBEAM,SOLAR',
  freeze:'ICE,FROST,FREEZE,GLACIER,ICECUBE,PERMAFROST',
  tidal:'PUSH,WAVE,WIND,STORM,GALE,HURRICANE,TYPHOON,TSUNAMI,TIDAL,CURRENT,JETSTREAM',
  vortex:'GRAVITY,ORBIT,MOON,PLANET,SATURN,JUPITER,GALAXY,NEBULA,COSMOS,VOID,QUASAR,WORMHOLE',
  mine:'TRAP,LANDMINE,CAGE',
  barrier:'WALL,SHIELD,ARMOR,BARRIER,BLOCK,FORT,FENCE,GATE,CASTLE,BUNKER,DOME,COVER,GUARD,FORTRESS,RAMPART,BASTION,DOOR,TOWER,KEEP,BUSH,TREE,TRUNK,BLANKET',
  resource:'MINER,DIGGER,PICKAXE,SHOVEL,QUARRY,EXCAVATOR,PROSPECTOR,BUCKET,CRANE,SCOOP,TUNNEL,ORE,FARM,MILL,MINT,GOLD,SILVER,DIAMOND,RUBY,GEM,TREASURE,MACHINE,PUMP,MOTOR,TOOL,FACTORY,MINE,REFINERY,HARVEST,GEMSTONE,RIG,SMELTER',
  repair:'HEAL,REPAIR,MEND,FIX,CURE,MEDIC,NURSE,DOCTOR,RESTORE,PATCH,CARE,AID,HELP,HEALTH,MEDICINE,CLINIC,POTION,BALM,HERB,TONIC,VITAMIN,ANTIDOTE,PLASTER,ELIXIR,FIRSTAID,RESCUE,HEALER,REVIVE,REMEDY,RECOVER',
  modifier:'FAST,SPEED,BIG,LONG,HEAVY,DOUBLE,POWER,BOOST,STRONG,QUICK,WIDE,RAPID,SWIFT,GIANT,HUGE,SHARP,HARD,TRIPLE,ULTRA,MEGA,DEEP,BRIGHT,SMART,WISE,FOCUS,LUCKY,LUCK,BRAVE,BOLD,SUPER,MIGHTY,FIERCE,PRECISE,FOCUSED,STEADY,CHARGED,GOLDEN,SILENT,HYPER,ENDLESS,STABLE,TINY,EXTRA,EPIC,OVERDRIVE,MAXIMUM'
};
const CURATED_STYLES=Object.create(null);
for(const [mode,csv] of Object.entries(CURATED_STYLE_GROUPS))
  for(const word of csv.split(','))if(words[word]&&!CURATED_STYLES[word])CURATED_STYLES[word]=mode;
const VOWELS=/[AEIOU]/g;
const MEANING_THEMES=[
  [/^(?:사과|딸기|배|복숭아|포도|레몬|바나나|과일|주스|감자|토마토|양파|귤|수박|버섯|수프)/,'splat'],
  [/^(?:춤|노래|음악|리듬|멜로디|연주|합창|악기|축제|파티)/,'disco'],
  [/^(?:거울|반사|유리|반짝|보석|수정)/,'rainbow'],
  [/^(?:고양이|강아지|개|호랑이|사자|토끼|말|소|돼지|새|독수리|곤충|벌|나비)/,'spring'],
  [/^(?:자동차|기차|비행기|로켓|우주선|버스|지하철|기관차)/,'rail'],
  [/^(?:비|구름|눈|안개|물|호수|바다|강|폭포|습기)/,'raincloud'],
  [/^(?:불|태양|햇빛|열|뜨거|불꽃|난로|화산)/,'sunray'],
  [/^(?:잠|졸음|꿈|자다|수면|하품)/,'sleep'],
  [/^(?:던지|튕기|돌아오|되돌아|귀환|반복|회전)/,'boomerang'],
  [/^(?:발견|탐색|비밀|단서|찾다|수수께끼)/,'echo'],
  [/^(?:달리|뛰|점프|높이뛰|뛰어|도약)/,'spring']
];
// Built-in signatures stay hand-designed. For other words, the *spelling*
// is a transparent rule, not a randomly assigned superpower.
function spellingStyle(word){
  const vowels=(word.match(VOWELS)||[]).length;
  if(/([A-Z])\1/.test(word))return {mode:'pinball',reason:'같은 글자가 이어져 핀볼처럼 튕김'};
  if(/[QXZ]/.test(word))return {mode:'shootingstars',reason:'희귀 글자 Q·X·Z가 별똥별을 부름'};
  if(word.endsWith('ING'))return {mode:'boomerang',reason:'-ING 꼬리가 부메랑처럼 되돌아옴'};
  if(vowels>=4)return {mode:'rainbow',reason:'모음 '+vowels+'개가 무지개 광선을 연결'};
  if(word.length>=9)return {mode:'rail',reason:'긴 '+word.length+'글자가 한 줄로 관통'};
  if(/^[AEIOU]/.test(word))return {mode:'spring',reason:'모음으로 시작해 적을 통통 밀어냄'};
  if(word.length<=4)return {mode:'volley',reason:'짧은 '+word.length+'글자가 두 발로 나뉘어 발사'};
  if(vowels===1)return {mode:'shotgun',reason:'모음이 하나라 여러 방향으로 흩뿌림'};
  if(word.length>=7)return {mode:'snowball',reason:'긴 글자를 모아 커지는 눈덩이 발사'};
  return {mode:'ricochet',reason:'글자 끝에서 탄환이 한 번 더 반사'};
}
const behaviorCache=Object.create(null);
function behaviorFor(word){
  if(BEHAVIORS[word])return BEHAVIORS[word];
  if(behaviorCache[word])return behaviorCache[word];
  const def=words[word];
  if(!def)return null;
  if(def.role!=='rapid'){
    const mode=CURATED_STYLES[word];
    if(!mode||!STYLE_FAMILIES[mode])return null;
    return behaviorCache[word]={mode,description:STYLE_FAMILIES[mode].description,source:'meaning'};
  }
  let mode=CURATED_STYLES[word],reason='';
  if(!mode){
    const meaning=String(def.meaning||'');
    const theme=MEANING_THEMES.find(([pattern])=>pattern.test(meaning));
    if(theme){mode=theme[1];reason='뜻에 맞는 '+STYLE_FAMILIES[mode].label}
  }
  if(!mode){const profile=spellingStyle(word);mode=profile.mode;reason=profile.reason}
  const style=STYLE_FAMILIES[mode];
  return behaviorCache[word]={mode,description:reason||style.description,source:reason?'spelling-or-meaning':'meaning'};
}
function displayRole(word,def){
  const behavior=behaviorFor(word);
  return behavior&&def.role==='rapid'?(STYLE_FAMILIES[behavior.mode]?.label||def.roleLabel):def.roleLabel;
}

const START_RACK='MINERARROWIC'.split('');
const FILLER_FREQUENCY='EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ'.split('');

window.WordSiegeData={
  words,
  wordList:[...new Set([...BUILTIN_WORDS,...firstRankWords])],
  allWordList:Object.keys(words),
  totalWords:Object.keys(words).length,
  importedWords:expandedWords,
  roleStats:ROLE_STATS,
  roleLabels:ROLE_LABELS,
  modifiers:MODIFIERS,
  signatures:SIGNATURES,
  behaviors:BEHAVIORS,
  behaviorFor,
  displayRole,
  styleFamilies:STYLE_FAMILIES,
  combos:COMBOS,
  waveBalance:WAVE_BALANCE,
  startRack:START_RACK,
  fillerFrequency:FILLER_FREQUENCY,
  maxRack:12
};
})();
