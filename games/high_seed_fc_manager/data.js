(function(){
'use strict';

const POSITIONS = ['GK','CB','FB','CM','WG','ST'];
const BASE = {
  GK:{shot:18,pass:58,defense:84,speed:42,stamina:72},
  CB:{shot:36,pass:58,defense:84,speed:55,stamina:78},
  FB:{shot:45,pass:66,defense:74,speed:78,stamina:82},
  CM:{shot:61,pass:84,defense:62,speed:67,stamina:82},
  WG:{shot:72,pass:72,defense:38,speed:88,stamina:78},
  ST:{shot:86,pass:58,defense:30,speed:79,stamina:76}
};
const POSITION_KO={GK:'골키퍼',CB:'중앙 수비',FB:'측면 수비',CM:'미드필더',WG:'날개',ST:'공격수'};
const FEATURE_BONUS=[
  {shot:3,pass:1,defense:2,speed:2,stamina:3},
  {shot:0,pass:4,defense:3,speed:1,stamina:4},
  {shot:2,pass:3,defense:1,speed:4,stamina:2},
  {shot:4,pass:2,defense:2,speed:3,stamina:1},
  {shot:1,pass:3,defense:4,speed:1,stamina:3},
  {shot:2,pass:2,defense:3,speed:3,stamina:2}
];

const CLUBS=[
  {
    id:'goguryeo',name:'고구려 FC',short:'고구려',emoji:'🐯',academy:'국내성',accent:'#ef4444',
    style:'빠른 전환',description:'넓은 공간으로 빠르게 전진하는 팀',
    tactics:{attack:'direct',press:'press',mindset:'balanced'},budget:1400,
    featured:[
      ['jumong','주몽','ST','건국의 시작','고구려','고구려를 세운 건국 인물로 전해져요.','고구려의 건국과 연결해서 기억해요.'],
      ['sosurim','소수림왕','CM','제도 정비','고구려','불교를 받아들이고 태학을 세우며 국가 제도를 정비했어요.','불교 수용·태학 설립을 함께 기억해요.'],
      ['gwanggaeto','광개토대왕','WG','영토 확장','고구려','고구려의 영토를 크게 넓힌 왕으로 알려져 있어요.','광개토대왕릉비와 함께 떠올려요.'],
      ['jangsu','장수왕','CB','평양 천도','고구려','수도를 평양으로 옮기고 남쪽으로 세력을 넓혔어요.','평양 천도와 남진 정책을 연결해요.'],
      ['eulji','을지문덕','GK','살수대첩','고구려','수의 침입에 맞서 살수대첩에서 활약한 장군이에요.','수나라·살수대첩을 한 쌍으로 기억해요.'],
      ['yeongaesomun','연개소문','FB','고구려 말기','고구려','고구려 말기에 강한 권력을 행사하며 당의 침입에 맞섰어요.','고구려와 당의 대립을 떠올려요.']
    ]
  },
  {
    id:'baekje',name:'백제 웨이브',short:'백제',emoji:'🌊',academy:'사비',accent:'#38bdf8',
    style:'짧은 연결',description:'패스를 이어 공간을 만드는 팀',
    tactics:{attack:'short',press:'shape',mindset:'balanced'},budget:1400,
    featured:[
      ['onjo','온조','ST','백제 건국','백제','백제를 세운 건국 인물로 전해져요.','한강 유역에서 성장한 백제의 시작과 연결해요.'],
      ['geunchogo','근초고왕','WG','전성기','백제','백제의 세력을 크게 넓히며 전성기를 이끈 왕이에요.','백제 전성기의 대표 왕으로 기억해요.'],
      ['muryeong','무령왕','CM','무령왕릉','백제','무령왕릉은 백제와 중국 남조의 교류를 보여 주는 자료를 남겼어요.','공주 무령왕릉과 국제 교류를 연결해요.'],
      ['seong','성왕','CB','사비 천도','백제','수도를 사비로 옮기고 나라 이름을 남부여로 바꾸었어요.','사비 천도와 남부여를 함께 기억해요.'],
      ['wangin','왕인','FB','문화 교류','백제','일본에 학문과 문화를 전한 인물로 전해져요.','백제의 활발한 문화 교류와 연결해요.'],
      ['gyebaek','계백','GK','황산벌','백제','백제 말기 황산벌 전투에서 신라군과 싸운 장군이에요.','백제 말기·황산벌을 연결해요.']
    ]
  },
  {
    id:'silla',name:'신라 화랑',short:'신라',emoji:'✨',academy:'금성',accent:'#facc15',
    style:'측면 전개',description:'좌우 공간을 넓게 사용하는 팀',
    tactics:{attack:'wide',press:'shape',mindset:'attack'},budget:1400,
    featured:[
      ['hyeokgeose','박혁거세','ST','신라 건국','신라','신라의 건국 인물로 전해져요.','신라의 시작과 연결해 기억해요.'],
      ['jijeung','지증왕','FB','국호 정비','신라','나라 이름을 신라로 정하고 왕이라는 칭호를 사용했어요.','신라·왕 칭호를 함께 기억해요.'],
      ['beopheung','법흥왕','CB','율령과 불교','신라','율령을 반포하고 불교를 공인하며 국가 체제를 정비했어요.','율령 반포·불교 공인을 연결해요.'],
      ['jinheung','진흥왕','WG','영토 확장','신라','한강 유역을 차지하는 등 신라의 영토를 넓혔어요.','한강 유역·순수비를 함께 떠올려요.'],
      ['seondeok','선덕여왕','CM','신라의 여왕','신라','신라 최초의 여왕으로 첨성대가 만들어진 시기의 왕이에요.','선덕여왕과 첨성대를 연결해요.'],
      ['kimyushin','김유신','GK','삼국 통일 과정','신라','신라의 장군으로 삼국 통일 과정에서 중요한 역할을 했어요.','김춘추와 함께 통일 과정에서 자주 등장해요.']
    ]
  },
  {
    id:'goryeo',name:'고려 스타즈',short:'고려',emoji:'🌟',academy:'개경',accent:'#a78bfa',
    style:'균형 축구',description:'공격과 수비를 고르게 운영하는 팀',
    tactics:{attack:'short',press:'shape',mindset:'balanced'},budget:1450,
    featured:[
      ['wanggeon','왕건','ST','고려 건국','고려','후삼국을 통일하고 고려를 세웠어요.','고려 건국·후삼국 통일을 연결해요.'],
      ['gwangjong','광종','CM','왕권 강화','고려','노비안검법과 과거제를 통해 왕권을 강화하려 했어요.','노비안검법·과거제를 함께 기억해요.'],
      ['seohui','서희','FB','외교 담판','고려','거란과의 외교 담판으로 강동 6주를 확보했어요.','외교 담판·강동 6주를 한 쌍으로 기억해요.'],
      ['ganggamchan','강감찬','GK','귀주대첩','고려','거란의 침입을 물리친 귀주대첩으로 잘 알려진 장군이에요.','거란·귀주대첩을 연결해요.'],
      ['yungwan','윤관','CB','별무반','고려','여진에 대응하기 위해 별무반을 조직했어요.','여진·별무반을 함께 기억해요.'],
      ['choemuseon','최무선','WG','화약 무기','고려','화약 제조 기술을 익혀 왜구를 물리치는 데 활용했어요.','화약·진포대첩을 연결해요.']
    ]
  },
  {
    id:'hunmin',name:'훈민 FC',short:'조선 전기',emoji:'📚',academy:'한양',accent:'#34d399',
    style:'패스와 판단',description:'중앙에서 침착하게 경기를 풀어 가는 팀',
    tactics:{attack:'short',press:'shape',mindset:'balanced'},budget:1500,
    featured:[
      ['taejo','태조 이성계','CB','조선 건국','조선','고려 말의 장군으로 조선을 세우고 첫 왕이 되었어요.','조선 건국과 한양 천도를 연결해요.'],
      ['sejong','세종','CM','훈민정음','조선','훈민정음을 창제해 백성이 쉽게 글을 익힐 수 있도록 했어요.','세종·훈민정음을 바로 연결해요.'],
      ['jangyeongsil','장영실','WG','과학 기술','조선','측우기와 자격루 등 조선 전기의 과학 기술 발전과 관련된 인물이에요.','조선 전기 과학 기술과 함께 기억해요.'],
      ['sinsaimdang','신사임당','FB','예술과 학문','조선','조선 시대의 예술가로 풀과 벌레를 그린 그림 등으로 잘 알려져 있어요.','조선 시대 여성 예술가라는 점을 기억해요.'],
      ['yihwang','이황','GK','성리학','조선','조선의 대표적인 성리학자로 도산서원과 관련이 깊어요.','이황·도산서원을 연결해요.'],
      ['yii','이이','ST','성리학','조선','조선의 성리학자로 현실 정치와 국방에 관한 여러 주장을 펼쳤어요.','이이·율곡을 함께 기억해요.']
    ]
  },
  {
    id:'turtle',name:'거북선 FC',short:'조선 중기',emoji:'🐢',academy:'한산도',accent:'#22d3ee',
    style:'단단한 수비',description:'수비를 지키다가 기회를 노리는 팀',
    tactics:{attack:'direct',press:'shape',mindset:'defend'},budget:1450,
    featured:[
      ['yisunshin','이순신','GK','임진왜란 수군','조선','임진왜란 때 조선 수군을 지휘하며 여러 해전에서 활약했어요.','임진왜란·조선 수군을 연결해요.'],
      ['gwon-yul','권율','CB','행주대첩','조선','임진왜란 때 행주대첩에서 일본군을 막아낸 장군이에요.','권율·행주대첩을 연결해요.'],
      ['ryuseongryong','류성룡','CM','징비록','조선','임진왜란을 겪은 뒤 그 경험과 교훈을 징비록에 남겼어요.','임진왜란·징비록을 함께 기억해요.'],
      ['gwakjaeu','곽재우','WG','의병 활동','조선','임진왜란 때 의병을 이끌어 싸운 인물로 잘 알려져 있어요.','임진왜란·의병을 연결해요.'],
      ['kimsi-min','김시민','FB','진주대첩','조선','임진왜란 때 진주성을 지키며 일본군과 싸웠어요.','김시민·진주대첩을 연결해요.'],
      ['heojun','허준','ST','동의보감','조선','의학 지식을 정리한 동의보감 편찬에 중심적인 역할을 했어요.','허준·동의보감을 바로 연결해요.']
    ]
  },
  {
    id:'silhak',name:'실학 개척단',short:'조선 후기',emoji:'🧭',academy:'수원',accent:'#fb923c',
    style:'창의적인 공격',description:'새로운 길을 찾는 공격적인 팀',
    tactics:{attack:'wide',press:'press',mindset:'attack'},budget:1550,
    featured:[
      ['jeongyakyong','정약용','CM','실학과 기술','조선 후기','실학을 발전시키고 수원 화성 건설에 거중기 등을 활용했어요.','정약용·실학·수원 화성을 연결해요.'],
      ['parkjiwon','박지원','WG','열하일기','조선 후기','청의 문물을 살펴보고 사회 개혁을 주장한 실학자예요.','박지원·열하일기를 연결해요.'],
      ['parkjega','박제가','ST','북학의','조선 후기','청의 발달한 문물을 받아들이자는 생각을 북학의에 담았어요.','박제가·북학의를 연결해요.'],
      ['hongdaeyong','홍대용','CB','과학적 사고','조선 후기','천문학과 과학에 관심을 가지고 새로운 세계관을 펼친 실학자예요.','홍대용·천문학을 연결해요.'],
      ['kimjeongho','김정호','FB','대동여지도','조선 후기','우리나라의 지리를 정리한 대동여지도를 만든 인물로 알려져 있어요.','김정호·대동여지도를 바로 연결해요.'],
      ['kimhongdo','김홍도','GK','풍속화','조선 후기','서민들의 생활 모습을 생생하게 그린 풍속화로 유명해요.','김홍도·풍속화를 함께 기억해요.']
    ]
  },
  {
    id:'independence',name:'독립의 별 FC',short:'근대',emoji:'⭐',academy:'대한',accent:'#f472b6',
    style:'강한 압박',description:'끝까지 뛰며 공을 되찾는 팀',
    tactics:{attack:'direct',press:'press',mindset:'balanced'},budget:1500,
    featured:[
      ['anjunggeun','안중근','ST','독립운동','근대','1909년 하얼빈에서 이토 히로부미를 사살한 독립운동가예요.','안중근·하얼빈을 연결해요.'],
      ['yugwansun','유관순','WG','3·1 운동','근대','3·1 운동과 아우내 만세 운동에 참여한 독립운동가예요.','유관순·3·1 운동을 연결해요.'],
      ['kimgoo','김구','GK','대한민국 임시정부','근대','대한민국 임시정부에서 활동한 독립운동가예요.','김구·대한민국 임시정부를 연결해요.'],
      ['ahnchangho','안창호','CM','교육과 독립운동','근대','교육과 단체 활동을 통해 독립운동에 힘쓴 인물이에요.','안창호·도산을 함께 기억해요.'],
      ['hongbeomdo','홍범도','CB','봉오동 전투','근대','독립군을 이끌고 봉오동 전투에서 일본군과 싸웠어요.','홍범도·봉오동 전투를 연결해요.'],
      ['yunbonggil','윤봉길','FB','상하이 의거','근대','1932년 상하이 훙커우 공원 의거를 일으킨 독립운동가예요.','윤봉길·상하이 의거를 연결해요.']
    ]
  }
];

const WORLD_STARS=[
  ['newton','아이작 뉴턴','CM','물리학','17세기 영국','운동 법칙과 만유인력 연구로 근대 물리학 발전에 큰 영향을 주었어요.','운동 법칙 · 만유인력',610,{shot:64,pass:91,defense:60,speed:58,stamina:76}],
  ['galileo','갈릴레오 갈릴레이','WG','천문학','17세기 이탈리아','망원경 관측을 통해 천문학 발전에 중요한 관측 결과를 남겼어요.','망원경 관측',570,{shot:72,pass:82,defense:44,speed:79,stamina:74}],
  ['curie','마리 퀴리','CM','과학','19~20세기 폴란드·프랑스','방사능 연구에 큰 업적을 남기고 노벨상을 두 분야에서 받은 과학자예요.','방사능 연구',650,{shot:67,pass:88,defense:68,speed:62,stamina:88}],
  ['davinci','레오나르도 다 빈치','WG','예술·과학','르네상스 이탈리아','회화뿐 아니라 해부학·기계 등 여러 분야를 탐구한 르네상스 인물이에요.','예술과 과학의 융합',640,{shot:82,pass:84,defense:48,speed:82,stamina:76}],
  ['einstein','알베르트 아인슈타인','ST','물리학','20세기 독일 출생','상대성 이론을 발전시켜 현대 물리학에 큰 영향을 준 과학자예요.','상대성 이론',680,{shot:90,pass:78,defense:38,speed:71,stamina:72}],
  ['nightingale','플로렌스 나이팅게일','GK','간호·통계','19세기 영국','간호 환경 개선과 통계 자료 활용에 힘쓴 인물이에요.','간호 개혁 · 통계',560,{shot:30,pass:74,defense:91,speed:52,stamina:86}],
  ['darwin','찰스 다윈','CB','생물학','19세기 영국','자연 선택을 중심으로 생물의 진화를 설명한 과학자예요.','자연 선택',600,{shot:45,pass:76,defense:86,speed:54,stamina:82}],
  ['lovelace','에이다 러브레이스','CM','수학·컴퓨팅','19세기 영국','찰스 배비지의 해석기관에 관한 글에서 계산 절차를 상세히 설명했어요.','초기 컴퓨팅 역사',620,{shot:61,pass:92,defense:58,speed:68,stamina:75}],
  ['gutenberg','요하네스 구텐베르크','FB','인쇄','15세기 유럽','금속 활자를 이용한 인쇄술의 확산에 중요한 역할을 했어요.','금속 활자 인쇄 확산',520,{shot:52,pass:80,defense:77,speed:66,stamina:79}],
  ['archimedes','아르키메데스','CB','수학·과학','고대 그리스','부력과 지레 등 수학과 물리학의 여러 원리를 연구했어요.','부력 · 지레',590,{shot:46,pass:79,defense:89,speed:50,stamina:80}],
  ['copernicus','니콜라우스 코페르니쿠스','FB','천문학','16세기 유럽','태양 중심의 행성 체계를 체계적으로 설명한 천문학자예요.','지동설',580,{shot:55,pass:84,defense:74,speed:69,stamina:75}],
  ['ibnsina','이븐 시나','GK','의학·철학','11세기 페르시아권','의학과 철학 분야에 큰 저술을 남긴 학자예요.','의학전범',600,{shot:28,pass:78,defense:92,speed:48,stamina:84}]
];

function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function statsFor(pos,seed,featured){
  const b=BASE[pos],boost=featured?FEATURE_BONUS[seed%FEATURE_BONUS.length]:null;
  const wave=(k)=>((seed*13+k*7)%9)-4;
  const s={};
  ['shot','pass','defense','speed','stamina'].forEach((k,i)=>{
    s[k]=clamp(b[k]+wave(i)+(boost?boost[k]:0),20,94);
  });
  return s;
}
function overall(p){
  const s=p.stats;
  const weights={
    GK:[.05,.15,.55,.05,.20],CB:[.08,.16,.45,.10,.21],FB:[.08,.20,.28,.24,.20],
    CM:[.14,.38,.16,.12,.20],WG:[.28,.24,.06,.28,.14],ST:[.46,.14,.05,.22,.13]
  }[p.pos];
  return Math.round(s.shot*weights[0]+s.pass*weights[1]+s.defense*weights[2]+s.speed*weights[3]+s.stamina*weights[4]);
}
function makeClubPlayers(club,clubIndex){
  const featured=club.featured.map((x,i)=>{
    const p={
      id:x[0],name:x[1],pos:x[2],trait:x[3],era:x[4],fact:x[5],memory:x[6],
      historical:true,fictional:false,clubId:club.id,fitness:100,form:0,
      stats:statsFor(x[2],clubIndex*9+i,true)
    };
    p.overall=overall(p);return p;
  });
  const posCycle=['GK','CB','CB','FB','FB','CM','CM','CM','WG','WG','ST','ST'];
  const academy=posCycle.map((pos,i)=>{
    const p={
      id:club.id+'-academy-'+(i+1),name:club.academy+' 새싹 '+(i+1),pos,
      trait:'아카데미',era:'게임용 가상 선수',
      fact:'역사 인물이 아니라 경기 구성을 위해 만든 가상 선수예요.',
      memory:'실제 역사 인물과 구분해서 봐 주세요.',
      historical:false,fictional:true,clubId:club.id,fitness:100,form:0,
      stats:statsFor(pos,clubIndex*17+i+31,false)
    };
    p.overall=overall(p);return p;
  });
  return featured.concat(academy);
}
CLUBS.forEach((c,i)=>{c.players=makeClubPlayers(c,i); delete c.featured;});

function makeWorldPlayer(x){
  const p={
    id:'world-'+x[0],name:x[1],pos:x[2],trait:x[3],era:x[4],fact:x[5],memory:x[6],
    price:x[7],stats:x[8],historical:true,fictional:false,world:true,fitness:100,form:0,clubId:null
  };
  p.overall=overall(p);return p;
}
const WORLD=WORLD_STARS.map(makeWorldPlayer);

window.SeedFCData=Object.freeze({
  clubs:CLUBS,
  world:WORLD,
  positions:POSITIONS,
  positionKo:POSITION_KO,
  formations:{
    '4-4-2':['GK','CB','CB','FB','FB','CM','CM','WG','WG','ST','ST'],
    '4-3-3':['GK','CB','CB','FB','FB','CM','CM','CM','WG','WG','ST'],
    '4-2-3-1':['GK','CB','CB','FB','FB','CM','CM','WG','CM','WG','ST'],
    '5-3-2':['GK','CB','CB','CB','FB','FB','CM','CM','CM','ST','ST']
  }
});
})();