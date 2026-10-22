'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../games/high_fraction_smith');
const E=require(path.join(root,'fraction-engine.js'));
const P=require(path.join(root,'puzzle-generator.js'));
const V=require(path.join(root,'workshop-art.js'));
const F=require(path.join(root,'forge-minigame.js'));
test('Commissioned lengths and operations are exact for every forged item',()=>{
 for(const [item,parts] of Object.entries(V.BLUEPRINTS)){
  for(const part of parts){
   const puzzle=P.createFor('practice',part);
   assert.equal(E.eq(puzzle.target,E.parse(part.metal)),true,item);
   assert.equal(E.eq(E.apply(part.method,puzzle.recipe[0].a,puzzle.recipe[0].b),puzzle.target),true,item);
   assert.equal(puzzle.bestStrikes,1);
  }
 }
});
test('Master forging counts real cutting shortcuts',()=>{
 assert.equal(P.shortRouteWithCuts(['3/4','1/2'].map(E.parse),E.parse('3/8')),true);
 for(let i=0;i<24;i++){
  const q=P.create('master');
  assert.equal(P.shortRouteExists(q.materials.map(m=>m.value),q.target),false);
  assert.equal(P.shortRouteWithCuts(q.materials.map(m=>m.value),q.target),false);
 }
});
test('Hammer shapes have different rhythms',()=>{
 const a=F.create({technique:'draw',hammerCount:2});
 const b=F.create({technique:'flatten',hammerCount:3});
 assert.notEqual(a.timingCenter,b.timingCenter);
 assert.notEqual(a.hammerDuration,b.hammerDuration);
 assert.equal(a.requiredHits,2);
 assert.equal(b.requiredHits,3);
});
