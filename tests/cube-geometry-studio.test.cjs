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
