const ROOT=new URL('../assets/game/',import.meta.url);
const PEOPLE=new URL('characters/people/',ROOT).href;
const NPCS=new URL('npcs/glTF/',ROOT).href;
const MARKET=new URL('shops/market/',ROOT).href;

export const RESIDENT_VISUALS={
  minji:{name:'민지',role:'씨앗마트',url:NPCS+'Casual_Female.gltf',accent:'#e28a45'},
  junho:{name:'준호',role:'튼튼 철물점',url:NPCS+'Worker_Male.gltf',accent:'#b8753d'},
  haneul:{name:'하늘',role:'하늘 카페',url:NPCS+'Chef_Female.gltf',accent:'#6e9fbe'},
  taeho:{name:'태호',role:'키즈 아케이드',url:NPCS+'Casual2_Male.gltf',accent:'#8a79c5'},
  doyun:{name:'도윤',role:'마을회관',url:NPCS+'Suit_Male.gltf',accent:'#657a68'},
  sora:{name:'소라',role:'마을 도서관',url:NPCS+'Suit_Female.gltf',accent:'#98745f'},
  nari:{name:'나리',role:'튼튼 보건소',url:NPCS+'Doctor_Female_Young.gltf',accent:'#cf727a'},
  minseok:{name:'민석',role:'씨앗버스',url:NPCS+'OldClassy_Male.gltf',accent:'#577a9c'},
  yuna:{name:'유나',role:'농사 주민',url:NPCS+'Casual3_Female.gltf',accent:'#78a75b'},
  woojin:{name:'우진',role:'숲 탐험가',url:NPCS+'Cowboy_Male.gltf',accent:'#6f8d53'},
  seoyeon:{name:'서연',role:'Cube Pets 돌봄',url:NPCS+'Casual2_Female.gltf',accent:'#d17b9a'},
  hyunwoo:{name:'현우',role:'마을 배달',url:NPCS+'Casual_Male.gltf',accent:'#d29a47'},
  visitor:{name:'여행객',role:'오늘의 방문객',url:NPCS+'Cowboy_Female.gltf',accent:'#8673b4'},
  clerk:{name:'마트직원',role:'씨앗마트 직원',url:MARKET+'character-employee.glb',accent:'#e28a45'}
};

export function residentVisual(id){
  return RESIDENT_VISUALS[id]||{name:id,role:'주민',url:PEOPLE+'character-female-a.glb',accent:'#7c9863'};
}
