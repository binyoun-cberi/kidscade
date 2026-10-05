import {SCHOOL_PROFILES} from './kidscade-world-school.js?v=1';

const ROOT=new URL('../assets/game/',import.meta.url);
const PEOPLE=new URL('characters/people/',ROOT).href;
const NPCS=new URL('npcs/glTF/',ROOT).href;
const MARKET=new URL('shops/market/',ROOT).href;

const VISUAL_BASE={
  minji:{url:NPCS+'Casual_Female.gltf',accent:'#e28a45',height:1.80},
  junho:{url:NPCS+'Worker_Male.gltf',accent:'#b8753d',height:1.86},
  haneul:{url:NPCS+'Chef_Female.gltf',accent:'#6e9fbe',height:1.78},
  taeho:{url:NPCS+'Casual2_Male.gltf',accent:'#8a79c5',height:1.83},
  doyun:{url:NPCS+'Suit_Male.gltf',accent:'#657a68',height:1.87},
  sora:{url:NPCS+'Suit_Female.gltf',accent:'#98745f',height:1.79},
  nari:{url:NPCS+'Doctor_Female_Young.gltf',accent:'#cf727a',height:1.77},
  minseok:{url:NPCS+'OldClassy_Male.gltf',accent:'#577a9c',height:1.84},
  yuna:{url:NPCS+'Casual3_Female.gltf',accent:'#78a75b',height:1.76},
  woojin:{url:NPCS+'Cowboy_Male.gltf',accent:'#6f8d53',height:1.88},
  seoyeon:{url:NPCS+'Casual2_Female.gltf',accent:'#d17b9a',height:1.75},
  hyunwoo:{url:NPCS+'Casual_Male.gltf',accent:'#d29a47',height:1.82},
  visitor:{url:NPCS+'Cowboy_Female.gltf',accent:'#8673b4',height:1.81},
  clerk:{url:MARKET+'character-employee.glb',accent:'#e28a45',height:1.80}
};

export const RESIDENT_VISUALS=Object.fromEntries(
  Object.entries(VISUAL_BASE).map(([id,visual])=>{
    const p=SCHOOL_PROFILES[id]||{};
    return [id,{name:p.name||id,role:p.role||'학생',...visual}];
  })
);

export function residentVisual(id){
  const p=SCHOOL_PROFILES[id]||{};
  return RESIDENT_VISUALS[id]||{name:p.name||id,role:p.role||'학생',url:PEOPLE+'character-female-a.glb',accent:'#7c9863'};
}
