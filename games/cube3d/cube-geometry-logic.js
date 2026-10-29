/* Integer lattice mathematics shared by the geometry studio and its tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CubeGeometryLogic=api})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const key=p=>p.join(',');
const DIRECTIONS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
function normalize(points){const out=new Map();for(const p of points||[])if(Array.isArray(p)&&p.length===3&&p.every(v=>Number.isInteger(v)&&v>=0&&v<8))out.set(key(p),p.slice());return [...out.values()]}
function metrics(points){const cells=normalize(points),set=new Set(cells.map(key));let area=0;for(const p of cells)for(const d of DIRECTIONS)if(!set.has(key(p.map((v,i)=>v+d[i]))))area++;
return {volume:cells.length,area,height:cells.length?Math.max(...cells.map(p=>p[1]))+1:0,top:new Set(cells.map(p=>key([p[0],p[2]]))).size,front:new Set(cells.map(p=>key([p[0],p[1]]))).size,side:new Set(cells.map(p=>key([p[2],p[1]]))).size}}
function box(w,h,d){const p=[];for(let x=0;x<w;x++)for(let y=0;y<h;y++)for(let z=0;z<d;z++)p.push([x,y,z]);return normalize(p)}
const SHAPES={cube:{name:'정육면체',faces:6,edges:12,vertices:8},cuboid:{name:'직육면체',faces:6,edges:12,vertices:8},prism:{name:'삼각기둥',faces:5,edges:9,vertices:6},pyramid:{name:'사각뿔',faces:5,edges:8,vertices:5},cylinder:{name:'원기둥'},cone:{name:'원뿔'},sphere:{name:'구'}};
function solidMetrics(kind,w,h,d){if(!SHAPES[kind]||![w,h,d].every(n=>Number.isFinite(n)&&n>0))return null;if(kind==='cube')h=d=w;
const r=w/2;let volume,area;
switch(kind){case 'cube':case 'cuboid':volume=w*h*d;area=2*(w*h+h*d+w*d);break;
case 'prism':volume=w*d*h/2;area=w*d+h*(w+d+Math.hypot(w,d));break;
case 'pyramid':volume=w*d*h/3;area=w*d+w*Math.hypot(h,d/2)+d*Math.hypot(h,w/2);break;
case 'cylinder':volume=Math.PI*r*r*h;area=2*Math.PI*r*(r+h);break;
case 'cone':volume=Math.PI*r*r*h/3;area=Math.PI*r*(r+Math.hypot(r,h));break;
case 'sphere':volume=4*Math.PI*r*r*r/3;area=4*Math.PI*r*r;break}
return {...SHAPES[kind],volume,area}}
function question(points,kind){const m=metrics(points);const q={volume:['쌓기나무는 모두 몇 개일까요?',m.volume,'개'],area:['겉으로 드러난 단위 정사각형은 모두 몇 개일까요?',m.area,'개'],top:['위에서 본 모습은 몇 칸일까요?',m.top,'칸'],front:['앞에서 본 모습은 몇 칸일까요?',m.front,'칸'],side:['오른쪽에서 본 모습은 몇 칸일까요?',m.side,'칸'],height:['가장 높은 곳은 몇 층일까요?',m.height,'층']}[kind];return q?{prompt:q[0],answer:q[1],unit:q[2]}:null}
// Grades are recommended lesson levels within the national 1–2 / 3–4 / 5–6 bands.
// Grades 3–4 revisit spatial play; this is not a claim of a new solid-geometry unit.
const LEVELS={
1:{maxSize:2,maxBlocks:8,shapes:['cuboid','cylinder','sphere'],stack:['volume','height'],note:'모양 찾기 · 8개까지 세기 · 위아래 관찰'},
2:{maxSize:3,maxBlocks:16,shapes:['cuboid','cylinder','sphere'],stack:['volume','height','buildCopy'],note:'쌓기나무 만들기 · 층 수 · 모양 따라 만들기'},
3:{maxSize:3,maxBlocks:27,shapes:['cuboid','cylinder','sphere'],stack:['volume','height','buildCopy'],note:'공간 놀이 복습 · 층별로 세기 · 모양 따라 만들기'},
4:{maxSize:4,maxBlocks:48,shapes:['cuboid','cylinder','sphere'],stack:['volume','height','buildCopy'],note:'공간 감각 확장 · 복잡한 모양 따라 만들기'},
5:{maxSize:4,maxBlocks:64,shapes:['cube','cuboid'],stack:['volume','height','buildCopy'],note:'직육면체·정육면체의 면 · 모서리 · 꼭짓점'},
6:{maxSize:6,maxBlocks:125,shapes:['cube','cuboid','prism','pyramid','cylinder','cone','sphere'],stack:['volume','height','top','front','side','buildCopy','buildViews','sameVolume'],note:'입체도형의 성질 · 부피와 겉넓이 · 세 방향 모습 복원'}
};
function gradeLevel(n){return LEVELS[n]?Number(n):6}
function profile(n){return LEVELS[gradeLevel(n)]}
function shapeLabel(kind,grade){return gradeLevel(grade)<=4?{cuboid:'상자 모양',cylinder:'둥근 기둥 모양',sphere:'공 모양'}[kind]||SHAPES[kind]?.name:SHAPES[kind]?.name}
function quizKinds(grade,tab,shape){const p=profile(grade);if(tab==='stack')return p.stack.slice();if(!p.shapes.includes(shape))return [];
return ['name',...(gradeLevel(grade)>=5&&SHAPES[shape].faces?['faces','edges','vertices']:[]),...(gradeLevel(grade)===6&&['cube','cuboid'].includes(shape)?['volume','area']:[])]}
function fitsGrade(points,grade){const p=profile(grade),cells=normalize(points);return cells.length<=p.maxBlocks&&cells.every(c=>c.every(v=>v<p.maxSize))}
function projections(points){const cells=normalize(points);return Object.fromEntries(['top','front','side'].map(k=>[k,[...new Set(cells.map(p=>k==='top'?key([p[0],p[2]]):k==='front'?key([p[0],p[1]]):key([p[2],p[1]])))].sort()]))}
function grounded(points){const cells=normalize(points),set=new Set(cells.map(key));return cells.every(([x,y,z])=>{for(let h=0;h<y;h++)if(!set.has(key([x,h,z])))return false;return true})}
function matchesBuild(points,target,kind){const a=normalize(points),b=normalize(target);if(!a.length||!grounded(a))return false;
if(kind==='buildViews')return JSON.stringify(projections(a))===JSON.stringify(projections(b));
if(kind==='sameVolume'){const am=metrics(a),bm=metrics(b);return am.volume===bm.volume&&am.area!==bm.area}
return a.map(key).sort().join('|')===b.map(key).sort().join('|')}
function sample(grade,random=Math.random){const p=profile(grade),size=Math.min(p.maxSize,gradeLevel(grade)<3?2:3),out=[];
for(let x=0;x<size;x++)for(let z=0;z<size;z++){const height=1+Math.floor(Math.min(.999999,Math.max(0,random()))*Math.min(size,3));for(let y=0;y<height&&out.length<p.maxBlocks;y++)out.push([x,y,z])}return out}
return {LEVELS,gradeLevel,profile,shapeLabel,quizKinds,fitsGrade,projections,grounded,matchesBuild,sample,normalize,metrics,box,SHAPES,solidMetrics,question};
});
