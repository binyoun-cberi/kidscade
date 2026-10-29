'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../games/cube3d/cube-geometry-logic.js');
test('joined cube area removes both internal faces and projections merge hidden cubes',()=>{
assert.deepEqual(L.metrics([[0,0,0],[1,0,0],[0,0,0]]),{volume:2,area:10,height:1,top:2,front:2,side:1});
assert.deepEqual(L.metrics(L.box(3,2,2)),{volume:12,area:32,height:2,top:6,front:6,side:4});
assert.equal(L.metrics([]).area,0);
});
test('irregular stacks and gaps use occupied cells instead of a bounding box',()=>{
const p=[[0,0,0],[0,1,0],[0,2,0],[1,0,0],[1,0,1]];
assert.equal(L.metrics(p).volume,5);assert.equal(L.metrics(p).area,22);assert.equal(L.metrics(p).height,3);
assert.equal(L.question(p,'front').answer,4);assert.equal(L.question(p,'top').answer,3);
});
test('save input rejects invalid coordinates and preserves the 8 by 8 by 8 limit',()=>{
assert.deepEqual(L.normalize([[0,0,0],[8,0,0],[-1,0,0],[0,1.5,0],null,[2,3],[0,0,0]]),[[0,0,0]]);
assert.equal(L.box(8,8,8).length,512);
});
test('all solid measurements agree with known analytic values',()=>{
assert.equal(L.solidMetrics('cuboid',3,2,2).area,32);
assert.equal(L.solidMetrics('cube',3,8,1).volume,27);
assert.equal(L.solidMetrics('prism',3,2,4).volume,12);
assert.equal(L.solidMetrics('prism',3,2,4).area,36);
assert.equal(L.solidMetrics('pyramid',6,4,6).area,96);
assert.equal(L.solidMetrics('pyramid',6,4,6).volume,48);
assert.equal(L.solidMetrics('cylinder',2,3,8).volume,Math.PI*3);
assert.equal(L.solidMetrics('cone',2,3,8).volume,Math.PI);
assert.equal(L.solidMetrics('sphere',2,9,9).area,4*Math.PI);
assert.equal(L.solidMetrics('sphere',2,9,9).faces,undefined);
assert.equal(L.solidMetrics('missing',2,2,2),null);
});
test('every lattice quiz matches the measured shape',()=>{for(const k of ['volume','area','height','top','front','side']){const p=L.box(4,3,2);assert.equal(L.question(p,k).answer,L.metrics(p)[k])}});
test('the displayed triangular prism and rectangular pyramid match quiz geometry',()=>{
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'..'),sandbox={window:{},console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(base,'assets/vendor/three-r160/three-global.js'),'utf8'),sandbox);
sandbox.THREE=sandbox.window.THREE;
const src=fs.readFileSync(path.join(base,'games/cube3d/cube-geometry-studio.js'),'utf8');
const functions=src.slice(src.indexOf('function prismGeometry()'),src.indexOf('function renderModel()'));
vm.runInContext('let state={w:3,h:2,d:4};'+functions,sandbox);
for(const [fn,kind] of [['prismGeometry','prism'],['pyramidGeometry','pyramid']]){
const g=vm.runInContext(fn+'()',sandbox),raw=g.index?g.toNonIndexed():g,a=raw.attributes.position,T=sandbox.THREE;
let area=0,volume=0;
for(let i=0;i<a.count;i+=3){const p=new T.Vector3().fromBufferAttribute(a,i),q=new T.Vector3().fromBufferAttribute(a,i+1),r=new T.Vector3().fromBufferAttribute(a,i+2);area+=q.clone().sub(p).cross(r.clone().sub(p)).length()/2;volume+=p.dot(q.clone().cross(r))/6}
const m=L.solidMetrics(kind,3,2,4);assert.ok(Math.abs(volume-m.volume)<1e-5,kind+' volume / outward normals');assert.ok(Math.abs(area-m.area)<1e-5,kind+' area');
}
});
test('grades 1–4 never offer formal solid components, volume or surface-area formulas',()=>{
for(const grade of [1,2,3,4]){
assert.deepEqual(L.profile(grade).shapes,['cuboid','cylinder','sphere']);
for(const shape of L.profile(grade).shapes)assert.deepEqual(L.quizKinds(grade,'solid',shape),['name']);
assert.ok(!L.quizKinds(grade,'stack').includes('area'));assert.ok(!L.quizKinds(grade,'stack').includes('buildViews'));
}
assert.equal(L.shapeLabel('cylinder',1),'둥근 기둥 모양');
});
test('grade 5 focuses on cube/cuboid properties while grade 6 calculates only those solids',()=>{
assert.deepEqual(L.quizKinds(5,'solid','cuboid'),['name','faces','edges','vertices']);
for(const shape of Object.keys(L.SHAPES)){
const kinds=L.quizKinds(6,'solid',shape);
assert.equal(kinds.includes('area'),['cube','cuboid'].includes(shape),shape);
assert.equal(kinds.includes('volume'),['cube','cuboid'].includes(shape),shape);
}
assert.deepEqual(L.quizKinds(5,'solid','sphere'),[]);
assert.ok(L.quizKinds(6,'stack').includes('sameVolume'));
assert.ok(L.quizKinds(6,'stack').includes('buildViews'));
});
test('random examples are supported, within the selected grade and always nonempty',()=>{
for(let grade=1;grade<=6;grade++)for(const n of [0,.1,.7,.999999,1]){
const cells=L.sample(grade,()=>n);assert.ok(cells.length);assert.ok(L.fitsGrade(cells,grade));assert.ok(L.grounded(cells));
}
assert.equal(L.gradeLevel('2'),2);assert.equal(L.gradeLevel(99),6);
assert.equal(L.fitsGrade(L.box(3,3,3),1),false);
});
test('three-view reconstruction accepts different valid hidden heights with identical silhouettes',()=>{
// 2x2 columns [2,1;1,2] and [2,2;2,2] produce identical projections.
const a=[[0,0,0],[0,1,0],[1,0,0],[0,0,1],[1,0,1],[1,1,1]],b=L.box(2,2,2);
assert.equal(L.matchesBuild(a,b,'buildViews'),true);
assert.equal(L.matchesBuild(a,b,'buildCopy'),false);
assert.equal(L.matchesBuild([[0,1,0]],[[0,1,0]],'buildViews'),false);
assert.equal(L.matchesBuild([],[],'buildViews'),false);
});
test('same-volume construction rejects unchanged surfaces and accepts a different area',()=>{
assert.equal(L.matchesBuild(L.box(4,1,3),L.box(3,2,2),'sameVolume'),true);
assert.equal(L.matchesBuild(L.box(2,2,3),L.box(3,2,2),'sameVolume'),false);
assert.equal(L.matchesBuild(L.box(4,2,3),L.box(3,2,2),'sameVolume'),false);
});
function studioHarness(){
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),elements=new Map(),saved=new Map();
const context2d=new Proxy({}, {get:()=>()=>{}});
function element(){return {value:'',hidden:false,textContent:'',children:[],setAttribute(k,v){this[k]=v},replaceChildren(...nodes){this.children=nodes;this.value=nodes[0]?.value||''},querySelector(){return this.button||(this.button=element())},getContext(){return context2d},focus(){}}}
const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element};
const source=fs.readFileSync(path.resolve(__dirname,'../games/cube3d/cube-geometry-studio.js'),'utf8').replace('window.CubeGeometryStudio={enter,exit};',`root={querySelectorAll:()=>[]};window.testStudio={state:()=>state,quiz:()=>quiz,score:()=>score,setGrade,syncUI,askQuestion,answerName,editCells,checkBuild,revealBuild,save,restore};`);
const sandbox={window:{CubeGeometryLogic:L},document,console,localStorage:{setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);return {api:sandbox.window.testStudio,element:id=>document.getElementById(id)};
}
test('simulated UI: changing grades changes options and hides advanced measurements',()=>{
const {api,element}=studioHarness();api.state().tab='solid';api.state().shape='cone';api.setGrade(2);
assert.equal(api.state().shape,'cuboid');assert.deepEqual(element('gsQuizKind').children.map(x=>x.value),['name']);
assert.ok(!element('gsStats').innerHTML.includes('cm³'));assert.equal(element('gsStructureTools').hidden,true);
api.setGrade(6);api.state().shape='sphere';api.syncUI();assert.deepEqual(element('gsQuizKind').children.map(x=>x.value),['name']);
api.state().shape='cuboid';api.syncUI();assert.ok(element('gsQuizKind').children.some(x=>x.value==='area'));
});
test('simulated UI: shape questions hide the name and count a solved question only once',()=>{
const {api,element}=studioHarness();api.state().tab='solid';api.setGrade(2);api.askQuestion();
assert.equal(element('gsShapePicker').hidden,true);assert.equal(element('gsChoices').hidden,false);
api.answerName('sphere');api.answerName('cuboid');api.answerName('cuboid');assert.equal(api.score().total,1);assert.equal(api.score().correct,1);
assert.equal(element('gsShapePicker').hidden,false);
});
test('simulated UI: construction remains active across edits and accepts a valid alternative',()=>{
const {api,element}=studioHarness();api.setGrade(6);element('gsQuizKind').value='sameVolume';api.askQuestion();
assert.equal(api.quiz().construction,true);assert.equal(api.state().cells.length,0);
api.editCells(L.box(4,1,3));assert.equal(api.quiz().kind,'sameVolume');api.checkBuild();api.checkBuild();
assert.equal(api.quiz().revealed,true);assert.equal(api.score().total,1);assert.equal(api.score().correct,1);
});
test('simulated UI: a lower grade preserves a large existing work and persists the chosen level',()=>{
const {api,element}=studioHarness();api.state().cells=L.box(4,4,4);api.setGrade(1);assert.equal(api.state().cells.length,64);
api.askQuestion();assert.equal(api.quiz(),null);assert.ok(element('gsFeedback').textContent.includes('저장된 작품'));
api.save();api.state().grade=6;api.restore();assert.equal(api.state().grade,1);assert.equal(api.state().cells.length,64);
});
