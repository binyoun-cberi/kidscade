/* Openmon Science Dex v1 — 118 occupied 64x64 sprite slots.
 * Names/types/habitats are original, editable Kidscade proposals, not official Openmon lore.
 * Atlas positions verified against repository PNGs; concepts are short educational references.
 * Source sprites distributed by their authors; verify provenance before redistribution.
 */
(function(global) {
  "use strict";
  const LORE = {
    mendel:["유전","그레고어 멘델은 완두콩 실험으로 유전 형질이 전달되는 규칙을 연구했어."],
    newton:["힘과 운동","뉴턴의 운동 법칙은 물체의 움직임과 힘의 관계를 설명해."],
    darwin:["진화","다윈은 생물이 환경에 적응하며 진화하는 과정을 자연선택으로 설명했어."],
    pascal:["압력","파스칼의 원리는 밀폐된 유체에 가한 압력이 여러 방향으로 전달됨을 설명해."],
    archimedes:["부력","아르키메데스의 원리는 물체가 밀어낸 유체의 무게만큼 부력을 받는다는 거야."],
    bernoulli:["유체","베르누이의 원리는 흐르는 유체의 속도와 압력 사이의 관계를 설명해."],
    tesla:["전기","테슬라는 교류 전력 기술의 발전에 중요한 공헌을 했어."],
    volta:["전지","볼타는 초기 전지를 개발한 과학자로, 전압의 단위 볼트에 이름이 남아 있어."],
    ohm:["저항","옴의 법칙은 전압, 전류, 저항의 관계를 V = IR로 나타내."],
    neuron:["신경세포","뉴런은 신호를 받아 다른 신경세포나 근육으로 전달하는 신경계의 세포야."],
    ampere:["전류","암페어(A)는 전류의 크기를 나타내는 SI 단위야."],
    coulomb:["전하","쿨롱(C)은 전하량을 나타내는 단위야."],
    pythagoras:["직각삼각형","피타고라스 정리는 직각삼각형의 두 짧은 변의 제곱을 더하면 빗변의 제곱과 같다고 말해."],
    fibonacci:["수열","피보나치 수열에서는 앞의 두 수를 더해 다음 수를 만들어."],
    fractal:["프랙털","프랙털은 작은 부분에 전체와 닮은 모양이 반복해서 나타나는 구조야."],
    photosynthesis:["광합성","식물은 빛에너지를 이용해 물과 이산화탄소로 양분을 만들고 산소를 방출해."],
    avogadro:["분자","아보가드로 상수는 물질 1몰에 들어 있는 입자의 수를 나타내."],
    buoyancy:["밀도와 부력","물체가 뜨는지 가라앉는지는 밀도와 부력의 영향을 받아."],
    boyle:["기체","온도가 일정할 때 기체의 압력과 부피는 반비례해."],
    kelvin:["온도","켈빈(K)은 절대온도를 나타낼 때 쓰는 SI 단위야."],
    kepler:["행성","케플러의 법칙은 행성의 궤도와 운동에 대한 규칙이야."],
    galileo:["관측과 운동","갈릴레이는 천체 관측과 물체의 운동을 연구했어."],
    entropy:["엔트로피","엔트로피는 에너지의 분산 상태와 관련된 물리량이야."],
    carnot:["열기관","카르노는 열기관이 얼마나 효율적으로 일할 수 있는지 연구했어."],
    fourier:["파동","푸리에 해석은 복잡한 신호를 여러 주파수 성분으로 나누어 이해하는 데 도움을 줘."],
    doppler:["도플러 효과","소리나 빛을 내는 대상과 관찰자가 상대적으로 움직이면 관측 주파수가 달라질 수 있어."],
    gauss:["정규분포","가우스의 이름은 종 모양의 정규분포와 여러 수학 개념에 남아 있어."],
    euclid:["기하학","유클리드는 점, 선, 도형을 다루는 기하학을 체계적으로 정리했어."],
    quantum:["양자","양자물리학은 원자와 전자처럼 아주 작은 세계의 성질을 설명해."],
    gravity:["중력","중력은 질량을 가진 물체들이 서로 끌어당기는 상호작용이야."],
    geology:["지층","지층은 퇴적물이 차곡차곡 쌓이거나 변형되며 생겨."],
    magnet:["자석","자석의 같은 극끼리는 밀어내고 다른 극끼리는 끌어당겨."],
    reflection:["빛의 반사","빛이 표면에 부딪혀 되돌아오는 현상을 반사라고 해."],
    refraction:["굴절","빛은 서로 다른 매질 사이를 지날 때 진행 방향이 바뀔 수 있어."],
    inertia:["관성","관성은 운동 상태를 유지하려는 물체의 성질이야."],
    circuit:["회로","닫힌 전기 회로가 만들어지면 전류가 흐를 수 있어."],
    loop:["반복","반복문은 같은 작업을 정해진 조건에 따라 여러 번 실행하는 방법이야."],
    probability:["확률","확률은 어떤 일이 일어날 가능성을 0과 1 사이의 수로 나타내."],
    symmetry:["대칭","대칭은 도형을 뒤집거나 회전시켜도 모양이 대응되는 성질이야."],
    orbit:["궤도","궤도는 천체가 다른 천체의 중력 영향을 받아 움직이는 경로야."]
  };
  const TYPES = {
    neutral:{name:"보통",color:"#8999A0"},
    leaf:{name:"풀",color:"#419C69"},
    water:{name:"물",color:"#438BCB"},
    fire:{name:"불",color:"#DF7A4F"},
    electric:{name:"전기",color:"#C6A13A"},
    earth:{name:"땅",color:"#A8825E"},
    air:{name:"바람",color:"#6EAAB7"},
    ice:{name:"얼음",color:"#72B8D6"},
    mind:{name:"정신",color:"#AC75B1"},
    dark:{name:"그림자",color:"#726B94"}
  };
  // Format per entry: name|type|lore-key; a dash denotes an intentionally empty tile.
  const ATLASES = [
    {id:"set1",file:"OpenmonSprites1.png",width:448,height:320,rows:[
      "-,뉴턴돌|earth|newton,관성룡|earth|inertia,다윈벌|leaf|darwin,프랙탈론|dark|fractal,테슬뱀|electric|tesla,-",
      "-,멘델콩|leaf|mendel,멘델팟|leaf|mendel,아보가씨|leaf|avogadro,아보가룡|leaf|avogadro,-,-",
      "-,-,클로로|leaf|photosynthesis,클로리움|leaf|photosynthesis,광합거목|leaf|photosynthesis,-,-",
      "-,-,파스칼집게|water|pascal,베르누게|water|bernoulli,압력킹|water|pascal,-,-",
      "-,-,피보새|air|fibonacci,피보날개|air|fibonacci,피보닉스|air|fibonacci,-,-"
    ]},
    {id:"set2",file:"Openmon Set 2.png",width:512,height:192,rows:[
      "다윈새|leaf|darwin,다윈익|leaf|darwin,리프시드|leaf|photosynthesis,리프속|leaf|photosynthesis,아르키치|water|archimedes,아르키핀|water|archimedes,부력치|water|buoyancy,부력핀|water|buoyancy",
      "뉴클치|water|quantum,뉴클린|water|quantum,해류왕|water|bernoulli,날치온|air|bernoulli,암모닛|earth|geology,암모게|earth|geology,-,-",
      "파스칼방울|water|pascal,파스칼폼|water|pascal,압력젤|water|pascal,압력봉|water|pascal,-,-,-,-"
    ]},
    {id:"set4",file:"Openmon Set 4.png",width:256,height:192,rows:[
      "보일도마|water|boyle,보일핀|water|boyle,나선동|mind|fractal,엔트로피|fire|entropy",
      "프랙나비|leaf|fractal,프랙윙|air|fractal,볼타룡|electric|volta,볼타제왕|electric|volta",
      "옴코어|electric|ohm,자기검|earth|magnet,쿨롱구|mind|coulomb,구름결|air|reflection"
    ]},
    {id:"set5",file:"Openmon-Set-5.png",width:384,height:384,rows:[
      "베르누상어|water|bernoulli,베르누곤|water|bernoulli,뉴런볼|mind|quantum,뉴런팽|mind|quantum,갈릴갈매|air|galileo,갈릴익|air|galileo",
      "멘델애벌|leaf|mendel,멘델고치|leaf|mendel,프랙싹|leaf|fractal,프랙윈|air|fractal,카르노새|ice|carnot,카르노울|ice|carnot",
      "케플올빼|air|kepler,케플부엉|air|kepler,도플박쥐|dark|doppler,도플뱃|dark|doppler,켈빈솜|ice|kelvin,켈빈양|ice|kelvin",
      "지층굴|earth|geology,지층갑|earth|geology,피타고슴|leaf|pythagoras,피타사슴|leaf|pythagoras,빙결곰|ice|kelvin,절대곰|ice|kelvin",
      "암페토|electric|ampere,암페킹|electric|ampere,푸리에령|mind|fourier,푸리엘|mind|fourier,엔트로불|fire|entropy,엔트로폭스|fire|entropy",
      "도플날|fire|doppler,도플익|fire|doppler,피보참새|air|fibonacci,피보르크|air|fibonacci,가우스볼|dark|gauss,가우시안|dark|gauss"
    ]},
    {id:"wolf",file:"Openmon-Wolf-Line.png",width:320,height:192,rows:[
      "루프울|neutral|loop,도플울|dark|doppler,굴절울|water|refraction,켈빈울|ice|kelvin,볼타울|electric|volta",
      "엔트로울|fire|entropy,파동울|water|fourier,광합울|leaf|photosynthesis,반사울|air|reflection,중력울|earth|gravity",
      "프랙울|leaf|fractal,지층울|earth|geology,확률울|mind|probability,자성울|earth|magnet,열역울|fire|carnot"
    ]},
    {id:"shibu",file:"ShibuLine.png",width:320,height:256,rows:[
      "분기견|neutral|probability,다윈견|earth|darwin,멘델견|leaf|mendel,유클견|mind|euclid,파스칼견|water|pascal",
      "볼타견|electric|volta,테슬견|electric|tesla,광합견|leaf|photosynthesis,갈릴견|earth|galileo,뉴턴견|earth|newton",
      "켈빈견|fire|kelvin,마찰견|electric|inertia,피보견|air|fibonacci,도플견|dark|doppler,보일견|dark|boyle",
      "가우스견|neutral|gauss,프랙견|mind|fractal,케플견|air|kepler,양자견|dark|quantum,-"
    ]}
  ];
  const SLOTS=[]; let count=0;
  ATLASES.forEach(atlas=>{
    atlas.rows.forEach((line,row)=>{
      const parts=line.split(",");
      if(parts.length!==atlas.width/64) throw Error(atlas.id+" row "+row+" width mismatch");
      parts.forEach((part,col)=>{
        if(part==="-") return;
        const [name,type,topic]=part.split("|");
        if(!name || !TYPES[type] || !LORE[topic]) throw Error("Invalid species at "+atlas.id+"/"+row+"/"+col);
        const id=atlas.id+"_r"+String(row).padStart(2,"0")+"_c"+String(col).padStart(2,"0");
        const isStarter=atlas.id==="set1" && row>=2 && col>=2;
        const isShibu=atlas.id==="shibu";
        const evolutionFrom=isStarter&&col>2?atlas.id+"_r"+String(row).padStart(2,"0")+"_c"+String(col-1).padStart(2,"0"):
          isShibu&&!(row===0&&col===0)?"shibu_r00_c00":null;
        const stage=isStarter?col-1:isShibu?(row===0&&col===0?1:2):0;
        const habitat=isStarter?"스타팅":isShibu?"비밀숲":atlas.id==="wolf"?"깊은숲":
          atlas.id==="set2"?"해안·물가":atlas.id==="set4"?"고대유적":
          atlas.id==="set5"?(type==="water"?"해안":type==="earth"?"동굴":"산림"):
          type==="leaf"?"초원·숲":"초원";
        const rarity=isStarter?"starter":isShibu?"rare":atlas.id==="set4"?"rare":atlas.id==="wolf"?"uncommon":"common";
        SLOTS.push({id,index:++count,name,type,topic,topicName:LORE[topic][0],fact:LORE[topic][1],
          atlas:atlas.id,source:atlas.file,row,col,x:col*64,y:row*64,width:64,height:64,
          habitat,rarity,stage,evolutionFrom,verifiedEvolution:!!evolutionFrom,
          draft:true});
      });
    });
  });
  // Checked against the actual 64×64 drawings, not assigned by sequential name templates.
  const VISUAL_FIXES={
  "set1_r00_c01": {
    "name": "관성쥐",
    "topic": "inertia"
  },
  "set1_r00_c02": {
    "name": "뉴턴수",
    "topic": "newton"
  },
  "set1_r00_c05": {
    "name": "탐사선",
    "type": "water",
    "topic": "buoyancy"
  },
  "set1_r01_c03": {
    "name": "아보가갑"
  },
  "set1_r01_c04": {
    "name": "아보가비틀"
  },
  "set1_r02_c04": {
    "name": "클로라곤"
  },
  "set2_r00_c03": {
    "name": "리프깃"
  },
  "set2_r01_c00": {
    "name": "베르누치",
    "topic": "bernoulli"
  },
  "set2_r01_c01": {
    "name": "베르누샤크",
    "topic": "bernoulli"
  },
  "set2_r01_c05": {
    "name": "지층룡"
  },
  "set4_r00_c03": {
    "name": "엔트로익"
  },
  "set4_r01_c03": {
    "name": "자성괴",
    "type": "earth",
    "topic": "magnet"
  },
  "set4_r02_c01": {
    "name": "자성검"
  },
  "set4_r02_c02": {
    "name": "쿨롱핵",
    "type": "electric"
  },
  "set4_r02_c03": {
    "topic": "bernoulli"
  },
  "set5_r00_c02": {
    "topic": "neuron"
  },
  "set5_r00_c03": {
    "topic": "neuron"
  },
  "set5_r00_c04": {
    "name": "갈릴펭"
  },
  "set5_r01_c02": {
    "name": "프랙잠",
    "type": "air"
  },
  "set5_r01_c04": {
    "name": "켈빈털",
    "topic": "kelvin"
  },
  "set5_r01_c05": {
    "name": "켈빈발톱",
    "topic": "kelvin"
  },
  "set5_r02_c04": {
    "name": "켈빈맘"
  },
  "set5_r02_c05": {
    "name": "빙하맘"
  },
  "set5_r03_c02": {
    "name": "피타록"
  },
  "set5_r03_c03": {
    "name": "피타순록"
  },
  "set5_r03_c04": {
    "name": "빙점랑"
  },
  "set5_r03_c05": {
    "name": "절대랑"
  },
  "set5_r04_c00": {
    "name": "암페각"
  },
  "set5_r04_c01": {
    "name": "암페갑"
  },
  "set5_r04_c03": {
    "name": "카르노염",
    "type": "fire",
    "topic": "carnot"
  },
  "set5_r04_c04": {
    "name": "켈빈구",
    "type": "ice",
    "topic": "kelvin"
  },
  "set5_r04_c05": {
    "name": "프랙령",
    "type": "leaf",
    "topic": "fractal"
  },
  "set5_r05_c00": {
    "name": "열역박",
    "type": "fire",
    "topic": "carnot"
  },
  "set5_r05_c01": {
    "name": "열역익",
    "type": "fire",
    "topic": "carnot"
  },
  "set5_r05_c02": {
    "name": "열역룡",
    "type": "fire",
    "topic": "carnot"
  },
  "set5_r05_c03": {
    "name": "피보참새",
    "type": "air",
    "topic": "fibonacci"
  },
  "set5_r05_c04": {
    "name": "피보깃",
    "type": "air",
    "topic": "fibonacci"
  },
  "set5_r05_c05": {
    "name": "피보르크",
    "type": "air",
    "topic": "fibonacci"
  }
};
  const NOTES={
    set2:"원본 배포 설명은 9개 배틀 스프라이트지만, 저장소의 시트에는 실루엣이 다른 18칸이 있어요. 앞·뒷모습이라고 확정하지 않고 인접한 두 이미지를 관계 검토 후보로 표시합니다.",
    wolf:"제작자가 Shibu를 늑대 모습으로 다시 해석한 시트입니다. 1:1 대응과 진화 조건은 검증 전이므로 게임의 독립 종족으로 세지 않습니다.",
    set1:"Set 1의 배 이미지는 몬스터가 아닌 오브젝트입니다."
  };
  for(const s of SLOTS){
    const fix=VISUAL_FIXES[s.id];
    if(fix) Object.assign(s,fix);
    s.topicName=LORE[s.topic][0];
    s.fact=LORE[s.topic][1];
    s.role=s.atlas==="wolf"?"alternate-concept":s.id==="set1_r00_c05"?"object":"monster";
    s.reviewStatus=s.atlas==="set2"?"needs-pair-review":s.atlas==="wolf"?"needs-variant-mapping":s.role==="object"?"excluded":"provisional";
    s.familyId=null; s.pairCandidate=null; s.alternateOfFamily=null;
    if(s.atlas==="shibu"){s.familyId="shibu-original";}
    else if(s.atlas==="wolf"){s.familyId="shibu-wolf-redesign";s.alternateOfFamily="shibu-original";}
    else if(s.atlas==="set2"){
      s.familyId="set2-r"+s.row+"-p"+Math.floor(s.col/2);
      const peerCol=s.col%2===0?s.col+1:s.col-1;
      s.pairCandidate="set2_r"+String(s.row).padStart(2,"0")+"_c"+String(peerCol).padStart(2,"0");
    }else if(s.atlas==="set1"){
      if(s.row===0&&s.col<=2)s.familyId="set1-rodent";
      if(s.row===0&&s.col>=3&&s.col<=4)s.familyId="set1-insect";
      if(s.row===1)s.familyId=s.col<=2?"set1-seed":"set1-beetle";
      if(s.row>=2)s.familyId="set1-starter-"+s.row;
    }else if(s.atlas==="set5"){
      if(s.row<=3||s.row===4&&s.col<=1)s.familyId="set5-r"+s.row+"-p"+Math.floor(s.col/2);
      if(s.row===5)s.familyId="set5-lastrow-"+(s.col<3?"fire":"air");
    }
    // The source pack explicitly documents Set 1 starter triplets and Shibu's 18-way branch.
    // Similar-looking neighbors in other sheets are NOT automatically evolutions.
  }
  const SPRITES=SLOTS;
  const MONSTERS=SPRITES.filter(s=>s.role==="monster");
  const CONCEPTS=SPRITES.filter(s=>s.role==="alternate-concept");
  const OBJECTS=SPRITES.filter(s=>s.role==="object");

  if(SLOTS.length!==118 || new Set(SLOTS.map(x=>x.id)).size!==118 || new Set(SLOTS.map(x=>x.name)).size!==118) {
    throw Error("Openmon dex integrity failure: expected 118 unique slot IDs and names.");
  }
  global.OPENMON_DEX={version:"1.1.0-reviewed-draft",licenseNotice:"Source art is separately licensed; science-inspired naming and statistics are Kidscade proposals.",atlas:ATLASES.map(({rows,...fields})=>fields),types:TYPES,lore:LORE,notes:NOTES,sprites:SPRITES,species:MONSTERS,concepts:CONCEPTS,objects:OBJECTS};
})(window);
