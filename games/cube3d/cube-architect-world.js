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
const CENTERS=[
 [0,0,'meadow'],[-27,-9,'forest'],[-41,-38,'pine'],[-5,-44,'snow'],
 [32,-28,'desert'],[43,23,'badlands'],[5,39,'marsh'],[-34,30,'flowers'],
 [38,49,'desert'],[-50,46,'pine'],[53,-51,'badlands']
];
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
 if(Math.hypot(x,z)<11)return 'meadow';
 const dx=(noise(x+87,z-17,11)-.5)*9,dz=(noise(x-38,z+19,13)-.5)*9;
 const ranked=CENTERS.map(([cx,cz,id])=>({id,dist:(x+dx-cx)**2+(z+dz-cz)**2})).sort((a,b)=>a.dist-b.dist);
 return ranked[0].id;
}
function biomeAt(x,z){return BIOMES[region(x,z)]}
function height(x,z){
 const kind=region(x,z),biome=BIOMES[kind];
 const continent=(noise(x,z,27)-.5)*4.2, hills=(noise(x+31,z-13,9)-.5)*2.9;
 const details=(noise(x+13,z-49,4)-.5)*.9;
 const alt=biome.alt*(Math.max(0,Math.min(1,(Math.hypot(x,z)-10)/16)));
 let h=2.4+continent+hills+details+alt;
 if(kind==='badlands')h+=Math.max(0,noise(x+37,z,13)-.43)*7;
 if(kind==='snow')h+=Math.max(0,noise(x,z+41,16)-.52)*5;
 if(kind==='marsh')h=Math.min(h,1+(noise(x,z,15)-.5)*1.8);
 // A gentle, reliably dry starting meadow, with wood nearby.
 const starter=Math.max(0,Math.min(1,(Math.hypot(x,z)-4)/9));
 h=2.2*(1-starter)+h*starter;
 // A meandering stream outside the safe starting circle.
 const river=25+Math.sin(x*.078+.6)*9;
 if(Math.hypot(x,z)>13&&Math.abs(z-river)<1.5&&kind!=='badlands')h=Math.min(h,-1);
 return Math.max(-3,Math.min(10,Math.floor(h)));
}
const RECIPES=[
 {id:'planks',name:'나무 판자 ×4',needs:{log:1},gives:{planks:4},stage:0},
 {id:'sticks',name:'막대 ×4',needs:{planks:1},gives:{sticks:4},stage:1},
 {id:'workbench',name:'제작대 ×1',needs:{planks:4},gives:{workbench:1},stage:1},
 {id:'woodPick',name:'나무 곡괭이',needs:{planks:3,sticks:2},gives:{woodPick:1},stage:2,bench:true},
 {id:'stonePick',name:'돌 곡괭이',needs:{stone:3,sticks:2},gives:{stonePick:1},stage:4,bench:true},
 {id:'furnace',name:'화로',needs:{stone:8},gives:{furnace:1},stage:4,bench:true},
 {id:'torch',name:'횃불 ×4',needs:{charcoal:1,sticks:1},gives:{torch:4},stage:5,bench:true},
 {id:'door',name:'나무문',needs:{planks:4},gives:{door:1},stage:3,bench:true},
 {id:'glassPane',name:'유리판 ×2',needs:{glass:2},gives:{glassPane:2},stage:5,bench:true},
 {id:'ironPick',name:'철 곡괭이',needs:{ironBlock:3,sticks:2},gives:{ironPick:1},stage:6,bench:true}
];
const GOALS=[
 {title:'첫날 · 나무 3개 채집',description:'근처 나무를 바라보고 파괴해 원목을 모으세요.',test:bag=>(bag.log||0)>=3||(bag.planks||0)>=4||(bag.workbench||0)>=1},
 {title:'판자 제작',description:'E → 제작에서 원목을 나무 판자로 바꿔 보세요.',test:bag=>(bag.planks||0)>=4||(bag.workbench||0)>=1},
 {title:'제작대 만들기',description:'판자 4개로 제작대를 만들면 도구 제작이 열려요.',test:bag=>(bag.workbench||0)>=1},
 {title:'나무 곡괭이',description:'판자와 막대로 곡괭이를 만들면 돌을 캘 수 있어요.',test:bag=>(bag.woodPick||0)>=1},
 {title:'돌과 새로운 바이옴',description:'돌 8개를 모아 화로를 만들고 다른 지역도 가 보세요.',test:bag=>(bag.furnace||0)>=1},
 {title:'화로와 물질 변화',description:'모래를 유리로 가공하거나 철광석을 제련해 보세요.',test:bag=>(bag.glass||0)>=1||(bag.ironBlock||0)>=1},
 {title:'나만의 기하학 건축',description:'정육면체·직육면체를 짓고 여섯 면을 색칠해 보세요.',test:()=>false}
];
const RESOURCE_ALIAS={grass:'dirt',pineLog:'log',pineLeaves:'leaves',snow:'snow',redSand:'redSand',ironOre:'ironOre'};
function dropFor(type){return RESOURCE_ALIAS[type]||type}
function toolNeeded(type){
 if(type==='obsidian')return 'ironPick';
 if(type==='ironOre')return 'stonePick';
 if(['stone','smoothStone','brick','ironBlock','furnace'].includes(type))return 'woodPick';
 return null;
}
window.CubeArchitectWorld={BIOMES,region,biomeAt,height,noise,hash,RECIPES,GOALS,dropFor,toolNeeded};
})();
