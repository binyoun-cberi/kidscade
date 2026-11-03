'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../games/probability_dice_survival/engine.js');
const P=require('../games/probability_dice_survival/polyhedron.js');

test('five real convex regular solids with exact numbered faces',()=>{
  for(const [sides,vertices,edges] of [[4,4,6],[6,8,12],[8,6,12],[12,20,30],[20,12,30]]){
    const mesh=P.geometryFor(sides);
    assert.equal(mesh.vertices.length,vertices);
    assert.equal(mesh.faces.length,sides);
    assert.deepEqual(mesh.faces.map(f=>f.number),Array.from({length:sides},(_,i)=>i+1));
    const edgeSet=new Set();
    for(const f of mesh.faces){
      assert.ok(f.indices.length>=3);
      for(let i=0;i<f.indices.length;i++){
        const a=f.indices[i],b=f.indices[(i+1)%f.indices.length];
        edgeSet.add([a,b].sort((x,y)=>x-y).join('-'));
      }
    }
    assert.equal(edgeSet.size,edges);
  }
});
test('landed face normal points toward viewer',()=>{
  const target=[.05,.40,1],mag=Math.hypot(...target),unit=target.map(x=>x/mag);
  for(const sides of E.FACES){
    const g=P.geometryFor(sides);
    for(const f of g.faces){
      const final=P.rotate(P.align(f.normal,unit),f.normal);
      assert.ok(final.every((x,i)=>Math.abs(x-unit[i])<1e-8));
    }
  }
});
test('unbiased integer result supports every face',()=>{
  for(const sides of E.FACES){
    const got=Array.from({length:sides},(_,i)=>E.fairRoll(sides,{getRandomValues(a){a[0]=i;return a;}}));
    assert.deepEqual(got,Array.from({length:sides},(_,i)=>i+1));
  }
  let count=0;
  const roll=E.fairRoll(6,{getRandomValues(a){a[0]=count++===0?4294967295:5;return a;}});
  assert.equal(count,2);assert.equal(roll,6);
});
test('selecting 5 numbers on d6 gives 5/6 chance and failure resets streak',()=>{
  assert.equal(E.survivalChance(5,6),5/6);
  assert.equal(E.validPick([1,2,3,4,5],6),true);
  assert.equal(E.validPick([1,2,3,4,5,6],6),false);
  assert.equal(E.validPick([1,1],6),false);
  assert.equal(E.validPick([],6),false);
  assert.equal(E.validPick([0,2],6),false);
  let player=E.newPlayer('학생');
  player=E.resolveRoll(player,[1,2,3,4,5],6,1);
  assert.equal(player.streak,1);assert.equal(player.survived,1);assert.equal(player.alive,true);
  player=E.resolveRoll(player,[1,2,3,4,5],6,6);
  assert.equal(player.streak,0);assert.equal(player.best,1);assert.equal(player.failed,1);assert.equal(player.alive,false);
});
test('local versus uses same fair roll, separate outcomes and risk scores',()=>{
  const first=E.resolveRoll(E.newPlayer('A'),[1,2,3,4,5],6,6);
  const second=E.resolveRoll(E.newPlayer('B'),[6],6,6);
  assert.equal(first.alive,false);assert.equal(second.alive,true);
  assert.equal(first.streak,0);assert.equal(second.streak,1);
  assert.equal(second.points,600);
  assert.equal(E.riskScore(5,6),120);
});
test('stage progression, sample average and ranking work',()=>{
  assert.deepEqual([0,2,3,5,6,9,10].map(E.dieForSolo),[6,6,8,8,12,12,20]);
  assert.deepEqual([1,3,4,6,7,9,10,18].map(E.dieForDuel),[6,6,8,8,12,12,20,20]);
  assert.deepEqual(E.roundStats([1,4,6],6),{
    count:3,average:11/3,expectedAverage:3.5,histogram:[1,0,0,1,0,1]
  });
  const a={...E.newPlayer('A'),points:300,best:1},b={...E.newPlayer('B'),points:300,best:3};
  assert.equal(E.rankPlayers([a,b])[0].name,'B');
});
test('catalog contains functioning accessible game entry',()=>{
  const gameDir=path.join(__dirname,'../games/probability_dice_survival');
  const html=fs.readFileSync(path.join(gameDir,'index.html'),'utf8');
  for(const name of ['engine.js','polyhedron.js','game.js','style.css'])assert.ok(html.includes(name));
  const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/games.json'),'utf8'));
  const found=catalog.games.filter(g=>g.id==='probability_dice_survival');
  assert.equal(found.length,1);
  assert.equal(found[0].href,'games/probability_dice_survival/index.html');
  assert.deepEqual(found[0].players,['solo','localMulti','classroom']);
});
