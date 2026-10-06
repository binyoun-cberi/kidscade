/* Deterministic biome geography and survival progression for Architect World. */
(()=>{
'use strict';
const BIOMES={
 meadow:{name:'초원',ground:'grass',sub:'dirt',alt:0,trees:.016},
 forest:{name:'활엽수림',ground:'grass',sub:'dirt',alt:.3,trees:.095},
 pine:{name:'침엽수림',ground:'grass',sub:'dirt',alt:1.0,trees:.076},
 snow:{name:'설원',ground:'snow',sub:'dirt',alt:1.1,trees:.035},
 desert:{name:'사막',ground:'sand',sub:'sand',alt:0,trees:.011},
 badlands:{name:'붉은 협곡',ground:'redSand',sub:'redSand',alt:2,trees:.006},
 marsh:{name:'습지',ground:'grass',sub:'clay',alt:-1.7,trees:.029},
 flowers:{name:'꽃 초원',ground:'grass',sub:'dirt',alt:.2,trees:.028}
};
// Player/block proportions already match the familiar voxel convention:
 // eye height ≈ 1.62 blocks, body width ≈ 0.6 blocks, door height = 2 blocks.
 // v20 therefore scales the geography around the player instead of shrinking the player.
const WORLD_SCALE=1.5;
const BASE_CENTERS=[
 [0,0,'meadow'],[-27,-9,'forest'],[-41,-38,'pine'],[-5,-44,'snow'],
 [32,-28,'desert'],[43,23,'badlands'],[5,39,'marsh'],[-34,30,'flowers'],
 [38,49,'desert'],[-50,46,'pine'],[53,-51,'badlands']
];
const CENTERS=BASE_CENTERS.map(([x,z,id])=>[Math.round(x*WORLD_SCALE),Math.round(z*WORLD_SCALE),id]);
function hash(x,z){
 const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);
}
function noise(x,z,scale){
 const u=x/scale,v=z/scale,i=Math.floor(u),j=Math.floor(v);
 let a=u-i,b=v-j;a=a*a*(3-2*a);b=b*b*(3-2*b);
 const p=hash(i,j)*(1-a)+hash(i+1,j)*a,q=hash(i,j+1)*(1-a)+hash(i+1,j+1)*a;
 return p*(1-b)+q*b;
}
function region(x,z){
 // Evaluate the old geography in normalized coordinates so every biome becomes
 // 1.5× wider without changing the vertical block size.
 const sx=x/WORLD_SCALE,sz=z/WORLD_SCALE;
 if(Math.hypot(sx,sz)<11)return 'meadow';
 const dx=(noise(sx+87,sz-17,11)-.5)*9,dz=(noise(sx-38,sz+19,13)-.5)*9;
 const ranked=BASE_CENTERS.map(([cx,cz,id])=>({id,dist:(sx+dx-cx)**2+(sz+dz-cz)**2})).sort((a,b)=>a.dist-b.dist);
 return ranked[0].id;
}
function biomeAt(x,z){return BIOMES[region(x,z)]}
function height(x,z){
 const sx=x/WORLD_SCALE,sz=z/WORLD_SCALE;
 const kind=region(x,z),biome=BIOMES[kind];
 const continent=(noise(sx,sz,27)-.5)*4.2, hills=(noise(sx+31,sz-13,9)-.5)*2.9;
 const details=(noise(sx+13,sz-49,4)-.5)*.9;
 const alt=biome.alt*(Math.max(0,Math.min(1,(Math.hypot(sx,sz)-10)/16)));
 let h=2.4+continent+hills+details+alt;
 if(kind==='badlands')h+=Math.max(0,noise(sx+37,sz,13)-.43)*7;
 if(kind==='snow')h+=Math.max(0,noise(sx,sz+41,16)-.52)*5;
 if(kind==='marsh')h=Math.min(h,1+(noise(sx,sz,15)-.5)*1.8);
 // A gentle, reliably dry starting meadow, with wood nearby.
 const starter=Math.max(0,Math.min(1,(Math.hypot(sx,sz)-4)/9));
 h=2.2*(1-starter)+h*starter;
 // The river widens with the world instead of becoming a one-block trench.
 const river=(25+Math.sin(sx*.078+.6)*9)*WORLD_SCALE;
 if(Math.hypot(sx,sz)>13&&Math.abs(z-river)<2.25&&kind!=='badlands')h=Math.min(h,-1);
 return Math.max(-3,Math.min(10,Math.floor(h)));
}
const BIOME_REWARDS={
 meadow:{resource:'log',hint:'거점을 짓고 도구를 제작하기 좋은 안전한 출발 지역'},
 forest:{resource:'log',hint:'나무가 풍부하고 첫 설계도 조각이 숨겨져 있어요.'},
 pine:{resource:'pineLog',hint:'짙은 소나무를 채집하면 원목을 얻을 수 있어요.'},
 snow:{resource:'snow',hint:'눈 블록과 설계도 조각을 찾아보세요.'},
 desert:{resource:'cactus',hint:'선인장과 모래를 모아 새로운 건축 재료를 만들어요.'},
 badlands:{resource:'redSand',hint:'붉은 모래와 협곡의 설계도 조각을 발견해 보세요.'},
 marsh:{resource:'reed',hint:'갈대와 점토를 모아 특별한 장식 재료를 만들어요.'},
 flowers:{resource:'flower',hint:'꽃으로 색 안료를 제작해 직육면체를 꾸며 보세요.'}
};
const RECIPES=[
 {id:'planks',name:'나무 판자 ×4',needs:{log:1},gives:{planks:4},stage:0},
 {id:'sticks',name:'막대 ×4',needs:{planks:1},gives:{sticks:4},stage:1},
 {id:'workbench',name:'제작대 ×1',needs:{planks:4},gives:{workbench:1},stage:1},
 {id:'woodPick',name:'나무 곡괭이',needs:{planks:3,sticks:2},gives:{woodPick:1},stage:2,bench:true},
 {id:'woodSword',name:'나무 검',needs:{planks:2,sticks:1},gives:{woodSword:1},stage:2,bench:true},
 {id:'woolMat',name:'양털 쿠션 블록',needs:{wool:3},gives:{woolMat:1},stage:2,bench:true},
 {id:'paddedHelmet',name:'양털 모자',needs:{wool:1},gives:{paddedHelmet:1},stage:2,bench:true},
 {id:'paddedChest',name:'양털 보호복',needs:{wool:2},gives:{paddedChest:1},stage:2,bench:true},
 {id:'paddedLegs',name:'양털 보호바지',needs:{wool:2},gives:{paddedLegs:1},stage:2,bench:true},
 {id:'paddedBoots',name:'양털 보호신발',needs:{wool:1},gives:{paddedBoots:1},stage:2,bench:true},
 {id:'woodShield',name:'나무 방패',needs:{planks:3,sticks:1},gives:{woodShield:1},stage:2,bench:true},
 {id:'stonePick',name:'돌 곡괭이',needs:{stone:3,sticks:2},gives:{stonePick:1},stage:4,bench:true},
 {id:'stoneSword',name:'돌 검',needs:{stone:2,sticks:1},gives:{stoneSword:1},stage:4,bench:true},
 {id:'furnace',name:'화로',needs:{stone:8},gives:{furnace:1},stage:4,bench:true},
 {id:'torch',name:'횃불 ×4',needs:{charcoal:1,sticks:1},gives:{torch:4},stage:5,bench:true},
 {id:'door',name:'나무문',needs:{planks:4},gives:{door:1},stage:3,bench:true},
 {id:'glassPane',name:'유리판 ×2',needs:{glass:2},gives:{glassPane:2},stage:5,bench:true},
 {id:'ironPick',name:'철 곡괭이',needs:{ironBlock:3,sticks:2},gives:{ironPick:1},stage:7,bench:true},
 {id:'ironSword',name:'철 검',needs:{ironBlock:2,sticks:1},gives:{ironSword:1},stage:7,bench:true},
 {id:'ironHelmet',name:'철 투구',needs:{ironBlock:1},gives:{ironHelmet:1},stage:7,bench:true},
 {id:'ironChest',name:'철 흉갑',needs:{ironBlock:2},gives:{ironChest:1},stage:7,bench:true},
 {id:'ironLegs',name:'철 각반',needs:{ironBlock:2},gives:{ironLegs:1},stage:7,bench:true},
 {id:'ironBoots',name:'철 장화',needs:{ironBlock:1},gives:{ironBoots:1},stage:7,bench:true},
 {id:'ironShield',name:'철 방패',needs:{ironBlock:2,sticks:1},gives:{ironShield:1},stage:7,bench:true},
 {id:'roof',name:'경사지붕 ×2',needs:{planks:3},gives:{roof:2},stage:3,bench:true},
 {id:'stairs',name:'계단 ×2',needs:{planks:3},gives:{stairs:2},stage:3,bench:true},
 {id:'slab',name:'반블록 ×4',needs:{planks:2},gives:{slab:4},stage:3,bench:true},
 {id:'flowerDye',name:'꽃 안료 ×2',needs:{flower:2},gives:{flowerDye:2},stage:5},
 {id:'reedMat',name:'갈대 장식 ×2',needs:{reed:3},gives:{reedMat:2},stage:5,bench:true},
 {id:'sandstone',name:'사암 ×2',needs:{sand:4},gives:{sandstone:2},stage:5,bench:true},
 {id:'snowBrick',name:'눈 벽돌 ×2',needs:{snow:4},gives:{snowBrick:2},stage:5},
 {id:'cactusDye',name:'선인장 안료 ×2',needs:{cactus:2},gives:{cactusDye:2},stage:5,bench:true},
 {id:'windowFrame',name:'창문틀 ×2',needs:{planks:3,glass:1},gives:{windowFrame:2},stage:7,bench:true}
];
const GOALS=[
 {title:'첫날 · 원목 3개 채집',description:'나무를 바라보고 파괴를 길게 눌러 원목을 3개 모으세요.',need:3,progress:s=>s.harvestedWood||0},
 {title:'판자 제작',description:'가방(E)에서 원목을 판자로 가공해 보세요.',need:1,progress:s=>s.crafted?.planks||0},
 {title:'제작대 설치',description:'판자 4개로 제작대를 만들고 가까운 땅에 설치하세요.',need:1,progress:s=>s.placed?.workbench||0},
 {title:'첫 설계 · 2×1×1 직육면체',description:'제작대 가까이에서 직육면체 제작대를 열고 2×1×1 도형을 만들어 설치하세요. 가로·세로 방향은 달라도 괜찮아요.',need:1,
  progress:s=>Number((s.cuboids||[]).includes('1x1x2'))},
 {title:'나무 곡괭이',description:'막대를 만들고 제작대 근처에서 나무 곡괭이를 제작하세요.',need:1,progress:s=>s.crafted?.woodPick||0},
 {title:'첫 거점 만들기',description:'방금 만든 직육면체와 판자·흙을 이용해 실제로 지붕과 벽이 있는 거점 안에 들어가 보세요.',need:1,
  progress:s=>Number(!!s.shelterBuilt)},
 {title:'돌과 새로운 지역',description:'돌 8개를 캐고 출발 초원 이외의 바이옴을 발견하세요.',need:2,
  progress:s=>Number((s.harvestedStone||0)>=8)+Number((s.biomes||[]).some(b=>b!=='meadow'))},
 {title:'화로 제작과 설치',description:'돌 8개로 화로를 제작해 거점 근처에 설치하세요.',need:1,progress:s=>s.placed?.furnace||0},
 {title:'화로로 새 재료 만들기',description:'원목이나 숯을 연료로 사용해 화로에서 아무 재료나 한 번 가공해 보세요.',need:1,
  progress:s=>Number(Object.values(s.smelted||{}).some(v=>(Number(v)||0)>0))},
 {title:'도형을 읽는 탐험가',description:'직육면체의 서로 다른 면을 2개 이상 칠하고, 총 3개 이상의 바이옴을 탐험하거나 설계도 조각을 발견하세요.',need:2,
  progress:s=>Number((s.paintedFaces||[]).length>=2)+Number((s.biomes||[]).length>=3||(s.found||[]).length>=1)},
 {title:'첫 랜드마크 던전',description:'랜드마크 안에서 구조 퍼즐을 풀고 최심부 설계실의 겨냥도를 해독하세요.',need:1,
  progress:s=>(s.restored||[]).length}
];
function goalProgress(goal,stats){return Math.min(goal.need,Math.max(0,goal.progress(stats)))}
const SHELTER_PASSABLE=new Set(['air','water','lava','fire','leaves','pineLeaves','flower','reed','sapling','torch']);
function shelterBlock(d,role='wall'){
 if(!d||SHELTER_PASSABLE.has(d.type)||d.type==='cactus')return false;
 if((d.type==='door'||d.type==='doorTop')&&d.open)return false;
 if(role==='roof'&&['door','doorTop','glassPane','windowFrame'].includes(d.type))return false;
 if(role==='wall'&&d.type==='slab')return false;
 return true;
}
function shelterAt(getBlock,x,feetY,z){
 const p=Math.round(x),q=Math.round(z),feet=Math.floor(feetY);
 // A usable shelter needs a real overhead cover and blocking walls. Decorative
 // plants, torches and an open doorway do not count as architecture.
 let roof=false,roofBuilt=false;
 for(let y=feet+2;y<=feet+4;y++){
   const d=getBlock(p,y,q);
   if(shelterBlock(d,'roof')){
     roof=true;roofBuilt=!!d.playerBuilt;break;
   }
 }
 let walls=0,builtWalls=0;
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   let wall=null;
   for(const dy of [0,1]){
     const d=getBlock(p+dx,feet+dy,q+dz);
     if(shelterBlock(d,'wall')){wall=d;break}
   }
   if(wall){walls++;if(wall.playerBuilt)builtWalls++}
 }
 const sheltered=roof&&walls>=2;
 return {roof,walls,sheltered,playerBuilt:sheltered&&roofBuilt&&builtWalls>=1};
}
function exposureStep(exposure,dt,{night=false,storm=false,rain=false,cold=false,sheltered=false,lit=false}={}){
 if(sheltered||lit)return Math.max(0,exposure-dt*(sheltered?19:10));
 const intensity=(night?1:0)+(storm?1.0:rain?.45:0)+(cold?.55:0);
 return Math.max(0,Math.min(100,exposure+dt*(intensity?1.8+intensity*1.7:-7)));
}
const RESOURCE_ALIAS={grass:'dirt',pineLog:'log',pineLeaves:'leaves',snow:'snow',redSand:'redSand',ironOre:'ironOre'};
function dropFor(type){return RESOURCE_ALIAS[type]||type}
function toolNeeded(type){
 if(type==='obsidian')return 'ironPick';
 if(type==='ironOre')return 'stonePick';
 if(['stone','smoothStone','brick','ironBlock','furnace'].includes(type))return 'woodPick';
 return null;
}
window.CubeArchitectWorld={WORLD_SCALE,CENTERS,BIOMES,BIOME_REWARDS,region,biomeAt,height,noise,hash,RECIPES,GOALS,goalProgress,shelterAt,exposureStep,dropFor,toolNeeded};
})();
