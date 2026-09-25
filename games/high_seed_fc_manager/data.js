(function(){
'use strict';

const POSITIONS=['GK','CB','FB','CM','WG','ST'];
const POSITION_KO={GK:'골키퍼',CB:'중앙 수비',FB:'측면 수비',CM:'미드필더',WG:'날개',ST:'공격수'};
const SLOT_POS=['GK','CB','CB','FB','FB','CM','CM','CM','WG','WG','ST','ST','CB','FB','CM','WG','ST','GK'];
const BASE={
  GK:{shot:18,pass:58,defense:84,speed:42,stamina:72},
  CB:{shot:36,pass:58,defense:84,speed:55,stamina:78},
  FB:{shot:45,pass:66,defense:74,speed:78,stamina:82},
  CM:{shot:61,pass:84,defense:62,speed:67,stamina:82},
  WG:{shot:72,pass:72,defense:38,speed:88,stamina:78},
  ST:{shot:86,pass:58,defense:30,speed:79,stamina:76}
};
const CLUB_DEFS=[
  {
    id:'goguryeo',name:'고구려 FC',short:'고구려',emoji:'🐯',accent:'#ef4444',
    style:'빠른 전환',description:'넓은 공간으로 빠르게 전진하는 팀',
    tactics:{attack:'direct',press:'press',mindset:'balanced'},budget:1400,
    era:'고구려',
    people:[
      ['jumong','주몽','건국','고구려를 세운 건국 인물로 전해져요.','고구려 건국'],
      ['yuri','유리왕','초기 왕','주몽의 뒤를 이어 고구려의 초기 국가 체제를 이어 갔어요.','고구려 초기'],
      ['daemusin','대무신왕','영토 확장','고구려 초기 주변 세력과 경쟁하며 세력을 넓힌 왕이에요.','초기 영토 확장'],
      ['taejo','태조왕','성장','고구려의 왕권과 세력이 성장하던 시기의 왕이에요.','고구려 성장'],
      ['gogukcheon','고국천왕','진대법','을파소를 등용하고 진대법을 시행한 왕으로 알려져요.','진대법'],
      ['micheon','미천왕','낙랑군 축출','낙랑군과 대방군을 축출하며 고구려의 세력을 넓혔어요.','낙랑군 축출'],
      ['sosurim','소수림왕','제도 정비','불교를 받아들이고 태학을 세우며 국가 제도를 정비했어요.','불교 수용 · 태학'],
      ['gogukyang','고국양왕','국가 정비','광개토대왕 바로 앞 시기의 왕으로 국가 체제를 이어 갔어요.','광개토대왕 이전'],
      ['gwanggaeto','광개토대왕','영토 확장','고구려의 영토를 크게 넓힌 왕으로 잘 알려져 있어요.','광개토대왕릉비'],
      ['jangsu','장수왕','평양 천도','수도를 평양으로 옮기고 남쪽으로 세력을 넓혔어요.','평양 천도'],
      ['munjamyeong','문자명왕','부여 병합','고구려 전성기 뒤에도 북방 세력을 넓혀 나간 왕이에요.','고구려 전성기 이후'],
      ['yeongyang','영양왕','수와 대립','수나라의 대규모 침입에 맞선 시기의 고구려 왕이에요.','수의 침입'],
      ['yeongnyu','영류왕','고구려 말기','당과 관계를 맺던 고구려 말기의 왕이에요.','고구려 말기'],
      ['bojang','보장왕','마지막 왕','고구려의 마지막 왕이에요.','고구려 멸망'],
      ['eulpaso','을파소','국상','고국천왕 때 등용되어 진대법 시행과 관련된 인물이에요.','을파소 · 진대법'],
      ['eulji','을지문덕','살수대첩','수의 침입에 맞서 살수대첩에서 활약한 장군이에요.','살수대첩'],
      ['yeongaesomun','연개소문','고구려 말기','고구려 말기에 강한 권력을 행사하며 당의 침입에 맞섰어요.','당과의 전쟁'],
      ['yangmanchun','양만춘','안시성','안시성 전투의 지휘관으로 전해지는 인물이에요.','안시성 전투']
    ]
  },
  {
    id:'baekje',name:'백제 웨이브',short:'백제',emoji:'🌊',accent:'#38bdf8',
    style:'짧은 연결',description:'패스를 이어 공간을 만드는 팀',
    tactics:{attack:'short',press:'shape',mindset:'balanced'},budget:1400,
    era:'백제',
    people:[
      ['onjo','온조','건국','백제를 세운 건국 인물로 전해져요.','백제 건국'],
      ['goi','고이왕','제도 정비','백제의 관등과 복색 등 국가 체제를 정비한 왕으로 알려져요.','국가 제도 정비'],
      ['geunchogo','근초고왕','전성기','백제의 세력을 크게 넓히며 전성기를 이끈 왕이에요.','백제 전성기'],
      ['geungusu','근구수왕','대외 교류','근초고왕 뒤를 이어 백제의 대외 활동을 이어 간 왕이에요.','백제의 대외 활동'],
      ['chimnyu','침류왕','불교 수용','백제에서 불교를 받아들인 시기의 왕이에요.','불교 수용'],
      ['gaero','개로왕','한성기 말','고구려 장수왕의 공격으로 한성이 함락되던 시기의 왕이에요.','한성 함락'],
      ['munju','문주왕','웅진 천도','한성 함락 뒤 수도를 웅진으로 옮긴 시기의 왕이에요.','웅진 천도'],
      ['dongseong','동성왕','웅진기','웅진 시기 백제의 왕권을 다시 세우려 했던 왕이에요.','웅진 시대'],
      ['muryeong','무령왕','무령왕릉','무령왕릉을 통해 백제의 국제 교류와 문화를 알 수 있어요.','무령왕릉'],
      ['seong','성왕','사비 천도','수도를 사비로 옮기고 국호를 남부여로 바꾸었어요.','사비 천도 · 남부여'],
      ['wideok','위덕왕','사비기','성왕 뒤 사비 시대의 백제를 이끈 왕이에요.','사비 시대'],
      ['mu','무왕','미륵사','익산 미륵사와 관련된 백제의 왕이에요.','미륵사'],
      ['uija','의자왕','마지막 왕','백제의 마지막 왕이에요.','백제 멸망'],
      ['wangin','왕인','문화 교류','일본에 학문과 문화를 전한 인물로 전해져요.','백제 문화 교류'],
      ['ajikgi','아직기','문화 교류','백제에서 일본으로 학문과 문화를 전한 인물로 전해져요.','백제 문화 교류'],
      ['gyebaek','계백','황산벌','백제 말기 황산벌 전투에서 신라군과 싸운 장군이에요.','황산벌 전투'],
      ['seongchung','성충','충신','백제 말기 의자왕에게 나라를 걱정하는 조언을 한 신하로 알려져요.','백제 말기'],
      ['heungsu','흥수','백제 말기','백제 말기 나당 연합군의 공격에 대비할 방책을 건의한 인물이에요.','백제 말기']
    ]
  },
  {
    id:'silla',name:'신라 화랑',short:'신라',emoji:'✨',accent:'#facc15',
    style:'측면 전개',description:'좌우 공간을 넓게 사용하는 팀',
    tactics:{attack:'wide',press:'shape',mindset:'attack'},budget:1400,
    era:'신라·통일신라',
    people:[
      ['hyeokgeose','박혁거세','건국','신라의 건국 인물로 전해져요.','신라 건국'],
      ['naemul','내물왕','성장','신라가 김씨 왕위 계승을 굳혀 가던 시기의 왕이에요.','신라 성장'],
      ['jijeung','지증왕','국호 정비','나라 이름을 신라로 정하고 왕이라는 칭호를 사용했어요.','신라 · 왕 칭호'],
      ['beopheung','법흥왕','율령과 불교','율령을 반포하고 불교를 공인하며 국가 체제를 정비했어요.','율령 반포 · 불교 공인'],
      ['jinheung','진흥왕','영토 확장','한강 유역을 차지하는 등 신라의 영토를 넓혔어요.','한강 유역 · 순수비'],
      ['seondeok','선덕여왕','신라의 여왕','신라 최초의 여왕이며 첨성대가 만들어진 시기의 왕이에요.','선덕여왕 · 첨성대'],
      ['jindeok','진덕여왕','삼국 통일 전야','선덕여왕의 뒤를 이어 신라를 다스린 여왕이에요.','신라의 여왕'],
      ['muyeol','태종 무열왕','통일 과정','김춘추로도 알려져 있으며 삼국 통일 과정에서 중요한 역할을 했어요.','김춘추 · 태종 무열왕'],
      ['munmu','문무왕','삼국 통일','신라가 삼국 통일을 완성해 가던 시기의 왕이에요.','삼국 통일'],
      ['sinmun','신문왕','왕권 강화','통일 뒤 신라의 국가 제도를 정비하고 왕권을 강화했어요.','통일신라 체제 정비'],
      ['kimyushin','김유신','장군','신라의 장군으로 삼국 통일 과정에서 중요한 역할을 했어요.','김유신'],
      ['wonhyo','원효','불교 사상','통일신라의 대표적인 승려로 여러 불교 사상을 널리 알렸어요.','원효'],
      ['uisang','의상','화엄종','당에서 공부한 뒤 신라에서 화엄 사상을 펼친 승려예요.','의상 · 화엄종'],
      ['seolchong','설총','학자','신라의 유학자로 이두와 관련해 자주 배우는 인물이에요.','설총'],
      ['kimdaeseong','김대성','불국사·석굴암','불국사와 석굴암 건립에 관련된 인물로 알려져요.','불국사 · 석굴암'],
      ['jangbogo','장보고','청해진','청해진을 설치하고 해상 무역 활동을 이끈 인물이에요.','장보고 · 청해진'],
      ['choechiwon','최치원','학자','통일신라 말의 학자로 당에서 활동한 뒤 신라 개혁을 주장했어요.','최치원'],
      ['hyecho','혜초','왕오천축국전','인도와 중앙아시아를 여행하고 왕오천축국전을 남긴 승려예요.','혜초 · 왕오천축국전']
    ]
  },
  {
    id:'goryeo',name:'고려 스타즈',short:'고려',emoji:'🌟',accent:'#a78bfa',
    style:'균형 축구',description:'공격과 수비를 고르게 운영하는 팀',
    tactics:{attack:'short',press:'shape',mindset:'balanced'},budget:1450,
    era:'고려',
    people:[
      ['wanggeon','왕건','고려 건국','후삼국을 통일하고 고려를 세웠어요.','고려 건국'],
      ['gwangjong','광종','왕권 강화','노비안검법과 과거제를 통해 왕권을 강화하려 했어요.','노비안검법 · 과거제'],
      ['seongjong','성종','유교 정치','유교적 통치 체제를 정비하며 지방 제도를 갖추어 갔어요.','유교 정치'],
      ['hyeonjong','현종','거란 침입','거란의 침입을 겪으며 고려의 체제를 다시 정비한 왕이에요.','거란 침입'],
      ['gongmin','공민왕','개혁','원 간섭에서 벗어나기 위한 개혁을 추진한 왕이에요.','공민왕의 개혁'],
      ['choeseungro','최승로','시무 28조','성종에게 시무 28조를 올려 유교 정치의 방향을 제시했어요.','시무 28조'],
      ['seohee','서희','외교 담판','거란과의 외교 담판으로 강동 6주를 확보했어요.','서희 · 강동 6주'],
      ['ganggamchan','강감찬','귀주대첩','거란의 침입을 물리친 귀주대첩으로 잘 알려진 인물이에요.','귀주대첩'],
      ['yungwan','윤관','별무반','여진에 대응하기 위해 별무반을 조직했어요.','윤관 · 별무반'],
      ['kimbusik','김부식','삼국사기','고려의 문신으로 삼국사기 편찬을 주도했어요.','김부식 · 삼국사기'],
      ['myocheong','묘청','서경 천도 운동','서경 천도 운동과 관련해 배우는 고려의 승려예요.','묘청 · 서경'],
      ['jinul','지눌','불교 개혁','고려 불교의 개혁을 이끈 승려로 알려져요.','지눌'],
      ['uicheon','의천','천태종','고려의 왕자 출신 승려로 교종과 선종의 조화를 추구했어요.','의천 · 천태종'],
      ['kimyunhu','김윤후','대몽 항쟁','몽골의 침입에 맞선 처인성 전투와 관련된 승려 출신 인물이에요.','김윤후 · 처인성'],
      ['choeyeong','최영','장군','고려 말 왜구와 홍건적 등에 맞서 싸운 장군이에요.','고려 말 장군'],
      ['choemuseon','최무선','화약 무기','화약 제조 기술을 익혀 왜구를 물리치는 데 활용했어요.','최무선 · 화약'],
      ['munikjeom','문익점','목화','원에서 목화씨를 가져와 고려에 목화 재배가 퍼지는 데 기여했어요.','문익점 · 목화'],
      ['jeongmongju','정몽주','고려 말','고려 말의 문신이자 성리학자로 잘 알려진 인물이에요.','정몽주']
    ]
  },
  {
    id:'hunmin',name:'훈민 FC',short:'조선 전기',emoji:'📚',accent:'#34d399',
    style:'패스와 판단',description:'중앙에서 침착하게 경기를 풀어 가는 팀',
    tactics:{attack:'short',press:'shape',mindset:'balanced'},budget:1500,
    era:'조선 전기',
    people:[
      ['taejo','태조 이성계','조선 건국','고려 말의 장군으로 조선을 세우고 첫 왕이 되었어요.','조선 건국'],
      ['jeongdojeon','정도전','조선 설계','조선 초기의 정치 제도와 수도 건설에 큰 영향을 준 인물이에요.','정도전'],
      ['taejong','태종','왕권 강화','조선 초기 왕권을 강화하고 국가 기틀을 정비했어요.','조선 초기 왕권'],
      ['sejong','세종','훈민정음','훈민정음을 창제해 백성이 쉽게 글을 익힐 수 있도록 했어요.','세종 · 훈민정음'],
      ['munjong','문종','과학·군사 정비','세종의 뒤를 이어 조선의 여러 제도를 이어 간 왕이에요.','세종 이후'],
      ['sejo','세조','제도 정비','조선 전기의 왕으로 통치 제도를 정비했어요.','조선 전기'],
      ['seongjong','성종','경국대전','경국대전을 완성해 조선의 통치 체제를 정비했어요.','성종 · 경국대전'],
      ['hwanghui','황희','재상','세종 때 오랫동안 재상으로 활동한 인물이에요.','황희'],
      ['jangyeongsil','장영실','과학 기술','자격루 등 조선 전기의 과학 기술 발전과 관련된 인물이에요.','장영실 · 과학 기술'],
      ['icheon','이천','과학·기술','세종 때 활자와 천문 기구 제작 등 여러 기술 사업에 참여했어요.','이천 · 조선 과학'],
      ['sinsukju','신숙주','학자·외교','조선 전기의 학자로 외교와 언어 연구 등 여러 분야에서 활동했어요.','신숙주'],
      ['seongsammun','성삼문','집현전 학자','집현전 학자로 훈민정음 창제 과정에 참여했어요.','성삼문 · 집현전'],
      ['kimjongjik','김종직','성리학','조선 전기 영남 사림의 학문에 큰 영향을 준 성리학자예요.','김종직'],
      ['jogwangjo','조광조','개혁','중종 때 성리학에 바탕을 둔 개혁 정치를 추진했어요.','조광조의 개혁'],
      ['sinsaimdang','신사임당','예술','조선 시대의 예술가로 풀과 벌레를 그린 그림 등으로 잘 알려져 있어요.','신사임당 · 예술'],
      ['yihwang','이황','성리학','조선의 대표적인 성리학자로 도산서원과 관련이 깊어요.','이황 · 도산서원'],
      ['yii','이이','성리학','조선의 성리학자로 현실 정치와 국방에 관한 여러 주장을 펼쳤어요.','이이 · 율곡'],
      ['seogyeongdeok','서경덕','학자','조선 중기의 성리학자로 자연과 우주에 대한 생각을 발전시켰어요.','서경덕']
    ]
  },
  {
    id:'turtle',name:'거북선 FC',short:'조선 중기',emoji:'🐢',accent:'#22d3ee',
    style:'단단한 수비',description:'수비를 지키다가 기회를 노리는 팀',
    tactics:{attack:'direct',press:'shape',mindset:'defend'},budget:1450,
    era:'조선 중기',
    people:[
      ['yisunshin','이순신','임진왜란 수군','임진왜란 때 조선 수군을 지휘하며 여러 해전에서 활약했어요.','이순신 · 조선 수군'],
      ['gwon-yul','권율','행주대첩','임진왜란 때 행주대첩에서 일본군을 막아낸 장군이에요.','권율 · 행주대첩'],
      ['ryuseongryong','류성룡','징비록','임진왜란을 겪은 뒤 그 경험과 교훈을 징비록에 남겼어요.','류성룡 · 징비록'],
      ['gwakjaeu','곽재우','의병','임진왜란 때 의병을 이끌어 싸운 인물로 잘 알려져 있어요.','곽재우 · 의병'],
      ['kimsi-min','김시민','진주대첩','임진왜란 때 진주성을 지키며 일본군과 싸웠어요.','김시민 · 진주대첩'],
      ['johon','조헌','의병','임진왜란 때 의병을 일으켜 싸운 학자이자 의병장이에요.','조헌 · 의병'],
      ['gogyongmyeong','고경명','의병','임진왜란 때 호남 지역에서 의병을 이끌었어요.','고경명 · 의병'],
      ['kimdeokryeong','김덕령','의병','임진왜란 때 의병장으로 활동한 인물이에요.','김덕령 · 의병'],
      ['jeongmunbu','정문부','북관대첩','함경도에서 의병을 이끌어 북관대첩에서 활약했어요.','정문부 · 북관대첩'],
      ['yujeong','사명대사 유정','승병','임진왜란 때 승병을 이끌고 전쟁 뒤 일본과의 교섭에도 참여했어요.','사명대사 · 승병'],
      ['hyujeong','서산대사 휴정','승병','임진왜란 때 승병 활동을 이끈 대표적인 승려예요.','서산대사 · 승병'],
      ['ihangbok','이항복','문신','임진왜란 전후 조정에서 활동하며 국난 수습에 힘쓴 문신이에요.','이항복'],
      ['ideokhyeong','이덕형','외교·정치','임진왜란 시기 외교와 국정에서 중요한 역할을 한 문신이에요.','이덕형'],
      ['heojun','허준','동의보감','의학 지식을 정리한 동의보감 편찬에 중심적인 역할을 했어요.','허준 · 동의보감'],
      ['heonanseolheon','허난설헌','문학','조선 중기의 시인으로 뛰어난 한시 작품을 남겼어요.','허난설헌 · 문학'],
      ['heogyun','허균','홍길동전','홍길동전의 지은이로 널리 알려진 조선의 문신·문인이에요.','허균 · 홍길동전'],
      ['gwanghae','광해군','전후 복구','임진왜란 뒤 나라를 복구하고 명과 후금 사이에서 외교를 펼친 왕이에요.','광해군'],
      ['kimchungseon','김충선','귀화 장수','임진왜란 때 조선에 귀화해 이후 여러 전투에 참여한 장수예요.','김충선']
    ]
  },
  {
    id:'silhak',name:'실학 개척단',short:'조선 후기',emoji:'🧭',accent:'#fb923c',
    style:'창의적인 공격',description:'새로운 길을 찾는 공격적인 팀',
    tactics:{attack:'wide',press:'press',mindset:'attack'},budget:1550,
    era:'조선 후기',
    people:[
      ['yeongjo','영조','탕평책','붕당의 대립을 줄이기 위해 탕평 정치를 펼친 왕이에요.','영조 · 탕평책'],
      ['jeongjo','정조','규장각','규장각을 키우고 수원 화성을 건설하며 여러 개혁을 추진했어요.','정조 · 규장각 · 수원 화성'],
      ['hongdaeyong','홍대용','과학적 사고','천문학과 과학에 관심을 가지고 새로운 세계관을 펼친 실학자예요.','홍대용 · 천문학'],
      ['parkjiwon','박지원','열하일기','청의 문물을 살펴보고 사회 개혁을 주장한 실학자예요.','박지원 · 열하일기'],
      ['parkjega','박제가','북학의','청의 발달한 문물을 받아들이자는 생각을 북학의에 담았어요.','박제가 · 북학의'],
      ['jeongyakyong','정약용','실학·기술','실학을 발전시키고 수원 화성 건설에 거중기 등을 활용했어요.','정약용 · 실학 · 수원 화성'],
      ['kimhongdo','김홍도','풍속화','서민들의 생활 모습을 생생하게 그린 풍속화로 유명해요.','김홍도 · 풍속화'],
      ['sinyunbok','신윤복','풍속화','조선 후기 사람들의 생활과 풍속을 세련되게 그린 화가예요.','신윤복 · 풍속화'],
      ['kimjeonghui','김정희','추사체','조선 후기의 학자이자 서예가로 추사체로 유명해요.','김정희 · 추사체'],
      ['kimjeongho','김정호','대동여지도','우리나라 지리를 정리한 대동여지도를 만든 인물로 알려져 있어요.','김정호 · 대동여지도'],
      ['kimmandeok','김만덕','구휼 활동','제주에서 상업으로 재산을 모은 뒤 큰 흉년에 백성을 도운 인물이에요.','김만덕 · 구휼'],
      ['chaejegong','채제공','정조 시대','정조 때 재상으로 활동하며 여러 정책을 뒷받침한 인물이에요.','채제공 · 정조 시대'],
      ['seoyugu','서유구','임원경제지','농업과 생활 지식을 폭넓게 정리한 임원경제지를 남겼어요.','서유구 · 임원경제지'],
      ['yudeukgong','유득공','발해고','발해의 역사를 다룬 발해고를 쓴 실학자예요.','유득공 · 발해고'],
      ['ideokmu','이덕무','학자','정조 때 규장각 검서관으로 활동한 실학자예요.','이덕무 · 규장각'],
      ['jeongyakjeon','정약전','자산어보','흑산도 주변 바다 생물을 기록한 자산어보를 남겼어요.','정약전 · 자산어보'],
      ['choejeu','최제우','동학','사람을 소중히 여기는 사상을 바탕으로 동학을 창시했어요.','최제우 · 동학'],
      ['honggyeongrae','홍경래','농민 봉기','평안도 지역에서 일어난 홍경래의 난을 이끈 인물이에요.','홍경래의 난']
    ]
  },
  {
    id:'independence',name:'독립의 별 FC',short:'근대',emoji:'⭐',accent:'#f472b6',
    style:'강한 압박',description:'끝까지 뛰며 공을 되찾는 팀',
    tactics:{attack:'direct',press:'press',mindset:'balanced'},budget:1500,
    era:'근대·독립운동',
    people:[
      ['anjunggeun','안중근','독립운동','1909년 하얼빈에서 이토 히로부미를 사살한 독립운동가예요.','안중근 · 하얼빈'],
      ['yugwansun','유관순','3·1 운동','3·1 운동과 아우내 만세 운동에 참여한 독립운동가예요.','유관순 · 3·1 운동'],
      ['kimgoo','김구','대한민국 임시정부','대한민국 임시정부에서 활동한 독립운동가예요.','김구 · 대한민국 임시정부'],
      ['ahnchangho','안창호','교육·독립운동','교육과 단체 활동을 통해 독립운동에 힘쓴 인물이에요.','안창호 · 도산'],
      ['hongbeomdo','홍범도','봉오동 전투','독립군을 이끌고 봉오동 전투에서 일본군과 싸웠어요.','홍범도 · 봉오동 전투'],
      ['yunbonggil','윤봉길','상하이 의거','1932년 상하이 훙커우 공원 의거를 일으킨 독립운동가예요.','윤봉길 · 상하이 의거'],
      ['sinchaeho','신채호','역사학·독립운동','민족 중심의 역사 연구를 전개하고 독립운동에도 참여했어요.','신채호 · 역사 연구'],
      ['kimjwajin','김좌진','청산리 전투','북로군정서군을 이끌고 청산리 전투에서 활약했어요.','김좌진 · 청산리 전투'],
      ['isangsul','이상설','헤이그 특사','1907년 헤이그 특사로 파견되어 대한제국의 상황을 알리려 했어요.','이상설 · 헤이그 특사'],
      ['ihoeyeong','이회영','신흥무관학교','만주 지역 독립운동 기지와 신흥무관학교 설립에 힘쓴 인물이에요.','이회영 · 신흥무관학교'],
      ['ibongsang','이봉창','도쿄 의거','한인애국단원으로 1932년 일본 도쿄에서 의거를 일으켰어요.','이봉창 · 한인애국단'],
      ['park-eunsik','박은식','역사학·임시정부','한국통사를 쓴 역사학자이며 대한민국 임시정부에서 활동했어요.','박은식 · 한국통사'],
      ['seojaepil','서재필','독립신문','독립신문을 창간하고 독립협회 활동에 참여했어요.','서재필 · 독립신문'],
      ['namjahyeon','남자현','독립운동','만주 지역을 중심으로 독립운동에 참여한 여성 독립운동가예요.','남자현'],
      ['kimmaria','김마리아','여성 독립운동','3·1 운동 이후 국내외에서 여성 독립운동을 이끈 인물이에요.','김마리아'],
      ['choejaehyeong','최재형','연해주 독립운동','러시아 연해주에서 독립운동을 지원하고 이끈 인물이에요.','최재형 · 연해주'],
      ['naboseok','나석주','의열 투쟁','의열단원으로 일제의 식민 통치 기관을 겨냥한 의거를 일으켰어요.','나석주 · 의열단'],
      ['jeonbongjun','전봉준','동학 농민 운동','동학 농민 운동을 이끈 대표적인 지도자예요.','전봉준 · 동학 농민 운동']
    ]
  }
];

const WORLD_DEFS=[
  ['newton','아이작 뉴턴','CM','물리학','17세기 영국','운동 법칙과 만유인력 연구로 근대 물리학 발전에 큰 영향을 주었어요.','운동 법칙 · 만유인력',610],
  ['galileo','갈릴레오 갈릴레이','WG','천문학','17세기 이탈리아','망원경 관측을 통해 천문학 발전에 중요한 관측 결과를 남겼어요.','망원경 관측',570],
  ['curie','마리 퀴리','CM','과학','19~20세기 폴란드·프랑스','방사능 연구에 큰 업적을 남기고 노벨상을 두 분야에서 받은 과학자예요.','방사능 연구',650],
  ['davinci','레오나르도 다 빈치','WG','예술·과학','르네상스 이탈리아','회화뿐 아니라 해부학과 기계 등 여러 분야를 탐구한 르네상스 인물이에요.','예술과 과학의 융합',640],
  ['einstein','알베르트 아인슈타인','ST','물리학','20세기 독일 출생','상대성 이론을 발전시켜 현대 물리학에 큰 영향을 준 과학자예요.','상대성 이론',680],
  ['nightingale','플로렌스 나이팅게일','GK','간호·통계','19세기 영국','간호 환경 개선과 통계 자료 활용에 힘쓴 인물이에요.','간호 개혁 · 통계',560],
  ['darwin','찰스 다윈','CB','생물학','19세기 영국','자연 선택을 중심으로 생물의 진화를 설명한 과학자예요.','자연 선택',600],
  ['lovelace','에이다 러브레이스','CM','수학·컴퓨팅','19세기 영국','찰스 배비지의 해석기관에 관한 글에서 계산 절차를 상세히 설명했어요.','초기 컴퓨팅 역사',620],
  ['gutenberg','요하네스 구텐베르크','FB','인쇄','15세기 유럽','금속 활자를 이용한 인쇄술의 확산에 중요한 역할을 했어요.','금속 활자 인쇄 확산',520],
  ['archimedes','아르키메데스','CB','수학·과학','고대 그리스','부력과 지레 등 수학과 물리학의 여러 원리를 연구했어요.','부력 · 지레',590],
  ['copernicus','니콜라우스 코페르니쿠스','FB','천문학','16세기 유럽','태양 중심의 행성 체계를 체계적으로 설명한 천문학자예요.','지동설',580],
  ['ibnsina','이븐 시나','GK','의학·철학','11세기 페르시아권','의학과 철학 분야에 큰 저술을 남긴 학자예요.','의학전범',600],
  ['tesla','니콜라 테슬라','WG','전기 공학','19~20세기 유럽·미국','교류 전력 시스템과 전기 기술 발전에 큰 영향을 준 발명가예요.','교류 전력',630],
  ['mendel','그레고어 멘델','CB','유전학','19세기 오스트리아 제국','완두콩 실험을 통해 유전 현상의 규칙을 연구했어요.','유전 법칙',560],
  ['pasteur','루이 파스퇴르','GK','미생물학','19세기 프랑스','미생물 연구와 예방 접종 발전에 큰 영향을 준 과학자예요.','미생물 · 백신',610],
  ['morse','새뮤얼 모스','FB','통신','19세기 미국','전신 기술과 모스 부호의 확산에 중요한 역할을 했어요.','전신 · 모스 부호',530]
];

function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function statsFor(pos,seed,star){
  const b=BASE[pos],wave=function(k){return ((seed*13+k*7)%9)-4;};
  const s={};['shot','pass','defense','speed','stamina'].forEach(function(k,i){
    const boost=star?((seed+i*3)%4)+1:0;
    s[k]=clamp(b[k]+wave(i)+boost,20,94);
  });return s;
}
function overall(p){
  const s=p.stats,w={
    GK:[.05,.15,.55,.05,.20],CB:[.08,.16,.45,.10,.21],FB:[.08,.20,.28,.24,.20],
    CM:[.14,.38,.16,.12,.20],WG:[.28,.24,.06,.28,.14],ST:[.46,.14,.05,.22,.13]
  }[p.pos];
  return Math.round(s.shot*w[0]+s.pass*w[1]+s.defense*w[2]+s.speed*w[3]+s.stamina*w[4]);
}
const FOOTBALL_ROLE_KO={
  playmaker:'조율가',commander:'지휘관',explorer:'개척형',creator:'창의형',
  finisher:'돌파형',anchor:'수호형',support:'연결형',balanced:'균형형'
};
function footballProfile(entry,pos){
  const text=[entry[1],entry[2],entry[3],entry[4]].join(' ');
  let role='balanced',preferred=[pos],note='상황에 맞춰 균형 있게 움직여요.';
  if(/외교|담판|재상|정치|제도|학자|성리학|개혁|편찬|훈민정음|실학|과학|기술|천문|수학|철학/.test(text)){
    role='playmaker';preferred=['CM','FB',pos];note='주변을 살피며 다음 패스를 고르는 조율형이에요.';
  }
  if(/장군|대첩|항쟁|수군|의병|승병|전투|군사|침입|전쟁|안시성|황산벌/.test(text)){
    role='commander';preferred=['CB','CM',pos];note='위치를 지키다가 필요할 때 강하게 앞으로 나가요.';
  }
  if(/해상|무역|교류|여행|지도|대동여지도|청해진|천도|영토 확장|개척/.test(text)){
    role='explorer';preferred=['FB','WG','CM',pos];note='넓은 공간을 오가며 빈 곳을 먼저 찾아가요.';
  }
  if(/예술|문학|풍속화|서예|그림|발명/.test(text)){
    role='creator';preferred=['WG','CM',pos];note='정해진 길보다 빈 공간과 새로운 패스 길을 찾아요.';
  }
  if(/건국|왕권 강화|통일|전성기|정복|세력을 넓|영토를 넓/.test(text)){
    role='finisher';preferred=['ST','WG','CM',pos];note='기회가 열리면 주저하지 않고 앞으로 파고들어요.';
  }
  if(/구휼|의학|간호|보건|백신|미생물/.test(text)){
    role='support';preferred=['CM','FB','GK',pos];note='동료 가까이에서 연결을 돕고 빈자리를 메워요.';
  }
  if(/수비|지키|마지막 왕|말기|전후 복구/.test(text)){
    role='anchor';preferred=['CB','GK','CM',pos];note='자리를 쉽게 버리지 않고 뒤를 단단히 지켜요.';
  }
  preferred=preferred.filter(function(x,i,a){return POSITIONS.indexOf(x)>=0&&a.indexOf(x)===i;});
  if(preferred.indexOf(pos)<0)preferred.push(pos);
  return {role:role,label:FOOTBALL_ROLE_KO[role],preferredPositions:preferred,note:note};
}
function makePlayer(entry,club,clubIndex,i){
  const pos=SLOT_POS[i%SLOT_POS.length],profile=footballProfile(entry,pos),p={
    id:club.id+'-'+entry[0],name:entry[1],pos:pos,trait:entry[2],era:club.era,
    fact:entry[3],memory:entry[4],historical:true,clubId:club.id,fitness:100,form:0,
    footballRole:profile.role,footballStyle:profile.label,footballNote:profile.note,
    preferredPositions:profile.preferredPositions,
    stats:statsFor(pos,clubIndex*31+i,true)
  };
  p.overall=overall(p);return p;
}
function rolePositionFit(p,slot){
  const pref=Array.isArray(p.preferredPositions)?p.preferredPositions:[],rank=pref.indexOf(slot);
  let score=rank===0?30:rank>0?22-rank*4:0;
  const r=p.footballRole;
  if(r==='playmaker'&&slot==='CM')score+=16;
  if(r==='commander'&&(slot==='CB'||slot==='CM'))score+=14;
  if(r==='explorer'&&(slot==='FB'||slot==='WG'))score+=16;
  if(r==='creator'&&(slot==='WG'||slot==='CM'))score+=15;
  if(r==='finisher'&&(slot==='ST'||slot==='WG'))score+=16;
  if(r==='anchor'&&(slot==='CB'||slot==='GK'))score+=18;
  if(r==='support'&&(slot==='CM'||slot==='FB'||slot==='GK'))score+=13;
  if(slot==='GK'&&(r==='anchor'||r==='commander'||r==='support'))score+=9;
  return score;
}
function assignHistoricalPositions(players,clubIndex){
  const remaining=players.map(function(p,i){return {p:p,i:i};});
  SLOT_POS.forEach(function(slot){
    remaining.sort(function(a,b){
      const d=rolePositionFit(b.p,slot)-rolePositionFit(a.p,slot);
      if(d)return d;
      return a.i-b.i;
    });
    const chosen=remaining.shift();if(!chosen)return;
    chosen.p.pos=slot;
    if(chosen.p.preferredPositions.indexOf(slot)<0)chosen.p.preferredPositions.push(slot);
    chosen.p.stats=statsFor(slot,clubIndex*31+chosen.i,true);
    chosen.p.overall=overall(chosen.p);
  });
  return players;
}
const CLUBS=CLUB_DEFS.map(function(def,clubIndex){
  const c={id:def.id,name:def.name,short:def.short,emoji:def.emoji,accent:def.accent,style:def.style,description:def.description,tactics:def.tactics,budget:def.budget,era:def.era};
  c.players=assignHistoricalPositions(def.people.map(function(x,i){return makePlayer(x,c,clubIndex,i);}),clubIndex);
  return c;
});
function worldPlayer(x,i){
  const entry=[x[0],x[1],x[3],x[5],x[6]],profile=footballProfile(entry,x[2]);
  const p={id:'world-'+x[0],name:x[1],pos:x[2],trait:x[3],era:x[4],fact:x[5],memory:x[6],price:x[7],historical:true,world:true,fitness:100,form:0,clubId:null,
    footballRole:profile.role,footballStyle:profile.label,footballNote:profile.note,preferredPositions:profile.preferredPositions,
    stats:statsFor(x[2],200+i,true)};
  p.overall=overall(p);return p;
}
const WORLD=WORLD_DEFS.map(worldPlayer);

window.SeedFCData=Object.freeze({
  clubs:CLUBS,world:WORLD,positions:POSITIONS,positionKo:POSITION_KO,
  formations:{
    '4-4-2':['GK','CB','CB','FB','FB','CM','CM','WG','WG','ST','ST'],
    '4-3-3':['GK','CB','CB','FB','FB','CM','CM','CM','WG','WG','ST'],
    '4-2-3-1':['GK','CB','CB','FB','FB','CM','CM','WG','CM','WG','ST'],
    '5-3-2':['GK','CB','CB','CB','FB','FB','CM','CM','CM','ST','ST']
  }
});
})();