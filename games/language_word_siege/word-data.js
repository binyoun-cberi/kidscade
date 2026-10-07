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

add('rapid','ARROW,DART,BULLET,SHOT,NEEDLE,BOLT,PEBBLE,STONE,ROCK,STAR');
add('pierce','LANCE,SPEAR,SWORD,BLADE,AXE,HAMMER,CROSSBOW');
add('burst','CANNON,ROCKET,MISSILE,CATAPULT,ARTILLERY,MORTAR');
add('explosive','BOMB,BLAST,BURST,EXPLOSION,METEOR,NUKE');
add('beam','LASER,RAY,BEAM,LIGHTNING,THUNDER');
add('burn','FIRE,FLAME,LAVA,HEAT,SUN,DRAGON,VOLCANO');
add('slow','ICE,FROST,SNOW,FREEZE,WATER,CHILL');
add('poison','POISON,VENOM,ACID,TOXIN');
add('push','WIND,PUSH,STORM,TORNADO,GUST');
add('gravity','MAGNET,GRAVITY,BLACKHOLE');
add('barrier','WALL,SHIELD,ARMOR,BARRIER,BLOCK,FORT');
add('resource','MINER,DRILL,DIGGER,PICKAXE,SHOVEL,QUARRY');
add('repair','HEAL,REPAIR,MEND');
add('modifier','FAST,SPEED,BIG,LONG,HEAVY,DOUBLE,POWER,BOOST,STRONG,QUICK,WIDE');
add('special','ECHO,CHAOS,JUGGERNAUT');

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
  POWER:{damage:1.27}, BOOST:{damage:1.18,rate:1.12}, STRONG:{damage:1.25}
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
