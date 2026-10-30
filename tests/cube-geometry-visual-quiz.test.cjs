'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const Q=require('../games/cube3d/cube-geometry-quiz.js');
const L=require('../games/cube3d/cube-geometry-logic.js');
function three(){const sandbox={window:{},console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../assets/vendor/three-r160/three-global.js'),'utf8'),sandbox);return sandbox.window.THREE}
test('eight named vertices, twelve unique edges and six outward faces agree',()=>{
assert.equal(Q.LETTERS.join(''),'ㄱㄴㄷㄹㅁㅂㅅㅇ');assert.equal(new Set(Q.EDGES.map(e=>e.slice().sort().join(','))).size,12);
const T=three(),t=Q.topology(3,4,5);
for(let i=0;i<6;i++){const f=Q.FACES[i],a=new T.Vector3(...t.vertices[f[0]]),b=new T.Vector3(...t.vertices[f[1]]),c=new T.Vector3(...t.vertices[f[2]]);const normal=b.sub(a).cross(c.sub(a)).normalize();assert.ok(normal.distanceTo(new T.Vector3(...Q.NORMALS[i]))<1e-8)}
for(let v=0;v<8;v++){assert.equal(Q.EDGES.filter(e=>e.includes(v)).length,3);assert.equal(Q.FACES.filter(f=>f.includes(v)).length,3)}
});
test('every incidence and parallel-face question has exactly the mathematically valid set',()=>{
for(const fraction of [0,.2,.45,.75,.999])for(const kind of ['pickVertex','pickEdge','pickFace','parallelFace','incidentEdge','incidentFace','edgeVertex']){
const q=Q.makeQuestion(kind,[3,4,5],()=>fraction);assert.ok(q.answers.length);assert.ok(!q.answers.includes(q.reference));assert.equal(new Set(q.answers).size,q.answers.length);
if(kind==='parallelFace'){const a=Number(q.reference.slice(1)),b=Number(q.answers[0].slice(1));assert.deepEqual(Q.NORMALS[a].map(n=>n===0?0:-n),Q.NORMALS[b])}
if(kind==='incidentEdge'){const v=Number(q.reference.slice(1));assert.deepEqual(q.answers,Q.EDGES.flatMap((e,i)=>e.includes(v)?['e'+i]:[]))}
assert.equal(Q.classify(q,q.answers[0]),'correct');assert.equal(Q.classify(q,q.answers[0],[q.answers[0]]),'selected');
}
});
test('all six faces have the correct rectangular area',()=>{for(let i=0;i<6;i++){const q=Q.makeQuestion('faceArea',[3,4,5],()=>(i+.1)/6);assert.equal(q.answer,[12,20,12,20,15,15][i]);assert.equal(q.dimensions,true)}});
test('net panels fold to the same cuboid vertices for unequal edge lengths',()=>{
const T=three();for(const dims of [[2,2,2],[3,4,5],[6,1,2]]){const panels=Q.panels(...dims),groups=[],t=Q.topology(...dims);
for(const p of panels){const g=new T.Group();g.position.set(...p.position);if(p.parent>=0)groups[p.parent].add(g);g.rotation[p.axis]=p.sign*Math.PI/2;groups.push(g)}
groups[0].updateMatrixWorld(true);
for(let i=0;i<panels.length;i++)for(let j=0;j<4;j++){const actual=groups[i].localToWorld(new T.Vector3(...panels[i].points[j])),expected=new T.Vector3(...t.vertices[panels[i].vertices[j]]);assert.ok(actual.distanceTo(expected)<1e-8,`${dims} face ${i} corner ${j}`)}
}
});
test('net questions never ask a hinge already joined on paper, and all matching cut copies count',()=>{
for(const kind of ['netVertex','netEdge'])for(let i=0;i<100;i++){const dims=[3,4,5],q=Q.makeQuestion(kind,dims,()=>i/100),data=Q.netElements(...dims),elements=kind==='netVertex'?data.vertices:data.edges,key=kind==='netVertex'?'vertex':'edge',ref=elements.find(e=>e.id===q.reference);assert.ok(ref);assert.ok(q.answers.length>=1);assert.deepEqual(q.answers,elements.filter(e=>e.id!==ref.id&&e[key]===ref[key]).map(e=>e.id));}
});
test('new diagram questions remain unavailable in lower elementary grades',()=>{
for(let grade=1;grade<=4;grade++)for(const shape of L.profile(grade).shapes)assert.deepEqual(L.quizKinds(grade,'solid',shape),['name']);
assert.ok(!L.quizKinds(5,'solid','cuboid').includes('faceArea'));assert.ok(L.quizKinds(6,'solid','cuboid').includes('faceArea'));assert.ok(!L.quizKinds(6,'solid','cone').includes('area'));
});
test('diagram projection and actual Three.js raycasting use the same face identity',()=>{
const T=three(),makeNode=()=>({style:{},dataset:{},classList:{toggle(){}},setAttribute(){},append(){},remove(){}}),sandbox={window:{CubeGeometryQuiz:Q},THREE:T,document:{createElement:makeNode,createElementNS:makeNode}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../games/cube3d/cube-geometry-diagram.js'),'utf8'),sandbox);
const parent=new T.Group(),q=Q.makeQuestion('pickFace',[2,2,2],()=>0),picked=[];
const d=sandbox.window.CubeGeometryDiagram.create({parent,dims:[2,2,2],question:q,labels:makeNode(),onPick:id=>picked.push(id)});
const camera=new T.PerspectiveCamera(38,1000/700,.1,120);camera.position.set(8,8,10);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:1000,height:700})};d.layout(camera,canvas);
const front=d.choices().find(e=>e.id==='f0');d.pickAt(...front.screen,camera,canvas);assert.equal(picked[0],'f0');d.dispose();
});
