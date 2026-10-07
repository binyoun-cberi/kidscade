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

const START_RACK='MINERARROWIC'.split('');
const FILLER_FREQUENCY='EEEEEEEEEEEEAAAAAAAAAIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ'.split('');

window.WordSiegeData={
  words,
  wordList:Object.keys(words),
  roleStats:ROLE_STATS,
  roleLabels:ROLE_LABELS,
  modifiers:MODIFIERS,
  startRack:START_RACK,
  fillerFrequency:FILLER_FREQUENCY,
  maxRack:12
};
})();
