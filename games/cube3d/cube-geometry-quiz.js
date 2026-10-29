/* Exact cuboid topology and quiz relations. No rendering or browser dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CubeGeometryQuiz=api})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const LETTERS=['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ'];
const EDGES=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
const FACES=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[3,2,1,0],[4,5,6,7]];
const FACE_NAMES=['앞면','오른쪽 면','뒷면','왼쪽 면','아랫면','윗면'];
const NORMALS=[[0,0,1],[1,0,0],[0,0,-1],[-1,0,0],[0,-1,0],[0,1,0]];
const edgeKey=a=>a.slice().sort((x,y)=>x-y).join('-');
const vertexName=i=>LETTERS[i],edgeName=i=>EDGES[i].map(vertexName).join(''),faceName=i=>FACES[i].map(vertexName).join('');
function topology(w,h,d){return {vertices:[[-w/2,0,d/2],[w/2,0,d/2],[w/2,0,-d/2],[-w/2,0,-d/2],[-w/2,h,d/2],[w/2,h,d/2],[w/2,h,-d/2],[-w/2,h,-d/2]],edges:EDGES,faces:FACES,normals:NORMALS}}
function panels(w,h,d){return [
{face:4,parent:-1,position:[0,0,0],axis:'x',sign:0,vertices:[3,2,1,0],points:[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2]]},
{face:0,parent:0,position:[0,0,d/2],axis:'x',sign:-1,vertices:[0,1,5,4],points:[[-w/2,0,0],[w/2,0,0],[w/2,0,h],[-w/2,0,h]]},
{face:2,parent:0,position:[0,0,-d/2],axis:'x',sign:1,vertices:[2,3,7,6],points:[[w/2,0,0],[-w/2,0,0],[-w/2,0,-h],[w/2,0,-h]]},
{face:1,parent:0,position:[w/2,0,0],axis:'z',sign:1,vertices:[1,2,6,5],points:[[0,0,d/2],[0,0,-d/2],[h,0,-d/2],[h,0,d/2]]},
{face:3,parent:0,position:[-w/2,0,0],axis:'z',sign:-1,vertices:[3,0,4,7],points:[[0,0,-d/2],[0,0,d/2],[-h,0,d/2],[-h,0,-d/2]]},
{face:5,parent:2,position:[0,0,-h],axis:'x',sign:1,vertices:[4,5,6,7],points:[[-w/2,0,-d],[w/2,0,-d],[w/2,0,0],[-w/2,0,0]]}
]}
function netElements(w,h,d){const ps=panels(w,h,d),offsets=[],vertices=[],edges=[],seenV=new Set(),seenE=new Set();
ps.forEach((p,panel)=>{const parent=p.parent>=0?offsets[p.parent]:[0,0,0],offset=p.position.map((v,i)=>v+parent[i]);offsets.push(offset);
p.points.forEach((local,i)=>{const world=local.map((v,k)=>v+offset[k]),key=world.join(',');if(!seenV.has(key)){seenV.add(key);vertices.push({id:'nv'+vertices.length,vertex:p.vertices[i],panel,local,flat:world})}});
p.points.forEach((a,i)=>{const b=p.points[(i+1)%4],va=p.vertices[i],vb=p.vertices[(i+1)%4],edge=EDGES.findIndex(e=>edgeKey(e)===edgeKey([va,vb]));const ends=[a,b].map(pt=>pt.map((v,k)=>v+offset[k]).join(',')).sort().join('|');if(!seenE.has(ends)){seenE.add(ends);edges.push({id:'ne'+edges.length,edge,panel,a,b})}})
});return {panels:ps,vertices,edges}}
function pick(items,random){return items[Math.min(items.length-1,Math.max(0,Math.floor(random()*items.length)))]}
function makeQuestion(kind,dims,random=Math.random){const t=topology(...dims),q={kind,visual:true,answers:[],reference:null,targetType:'vertex',instruction:'도형을 드래그해 돌리고, 정답을 직접 누르세요.'};const index=n=>pick(Array.from({length:n},(_,i)=>i),random);
if(kind==='pickVertex'){const i=index(8);q.answers=['v'+i];q.prompt='점 '+vertexName(i)+'을 찾아 누르세요.'}
else if(kind==='pickEdge'){const i=index(12);q.targetType='edge';q.answers=['e'+i];q.prompt='모서리 '+edgeName(i)+'을 찾아 누르세요.'}
else if(kind==='pickFace'){const i=index(6);q.targetType='face';q.answers=['f'+i];q.prompt='면 '+faceName(i)+'을 찾아 누르세요.'}
else if(kind==='parallelFace'){const i=index(6);q.targetType='face';q.reference='f'+i;q.answers=['f'+NORMALS.findIndex(n=>n.every((v,k)=>v===-NORMALS[i][k]))];q.prompt='주황색 면 '+faceName(i)+'과 평행한 면을 누르세요.'}
else if(kind==='incidentEdge'){const i=index(8);q.reference='v'+i;q.targetType='edge';q.answers=EDGES.flatMap((e,j)=>e.includes(i)?['e'+j]:[]);q.prompt='주황색 점 '+vertexName(i)+'에서 만나는 모서리를 모두 누르세요.'}
else if(kind==='incidentFace'){const i=index(12);q.reference='e'+i;q.targetType='face';q.answers=FACES.flatMap((f,j)=>EDGES[i].every(v=>f.includes(v))?['f'+j]:[]);q.prompt='주황색 모서리 '+edgeName(i)+'에서 만나는 두 면을 누르세요.'}
else if(kind==='edgeVertex'){const i=index(12);q.reference='e'+i;q.answers=EDGES[i].map(v=>'v'+v);q.prompt='주황색 모서리 '+edgeName(i)+'의 양 끝 꼭짓점을 누르세요.'}
else if(kind==='faceArea'){const i=index(6);q.targetType=null;q.reference='f'+i;const points=t.faces[i].map(j=>t.vertices[j]),a=Math.hypot(...points[1].map((v,k)=>v-points[0][k])),b=Math.hypot(...points[2].map((v,k)=>v-points[1][k]));q.answer=a*b;q.unit='cm²';q.prompt='주황색 면 '+faceName(i)+'의 넓이는 몇 cm²인가요?';q.instruction='도형의 곡선 점선에 표시된 길이를 이용하세요.';q.dimensions=true}
else if(kind==='netVertex'||kind==='netEdge'){const data=netElements(...dims),elements=kind==='netVertex'?data.vertices:data.edges,key=kind==='netVertex'?'vertex':'edge',choices=elements.filter(e=>elements.some(other=>other.id!==e.id&&other[key]===e[key]));const ref=pick(choices,random);q.net=true;q.targetType=kind==='netVertex'?'netVertex':'netEdge';q.reference=ref.id;q.answers=elements.filter(e=>e.id!==ref.id&&e[key]===ref[key]).map(e=>e.id);q.prompt='이 전개도를 접으면 주황색 '+(kind==='netVertex'?'점':'모서리')+'과 겹치는 '+(q.answers.length>1?'곳을 모두':'곳을')+' 누르세요.';q.instruction='먼저 예상해 보세요. 정답을 고른 뒤 접어서 확인할 수 있어요.'}
else return null;
return q}
function classify(q,id,selected=[]){if(id===q.reference)return 'reference';if(selected.includes(id))return 'selected';return q.answers.includes(id)?'correct':'wrong'}
return {LETTERS,EDGES,FACES,FACE_NAMES,NORMALS,vertexName,edgeName,faceName,topology,panels,netElements,makeQuestion,classify};
});
