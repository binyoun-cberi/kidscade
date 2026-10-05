'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(ROOT,'games/cube3d/cube-architect.js'),'utf8');
const landmarkJs=fs.readFileSync(path.join(ROOT,'games/cube3d/cube-architect-landmarks.js'),'utf8');
const worldJs=fs.readFileSync(path.join(ROOT,'games/cube3d/cube-architect-world.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'games/cube3d/index.html'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'games/cube3d/cube-architect.css'),'utf8');
const cache={};
function landmarks(){
  if(cache.missions)return cache.missions;
  const sandbox={};
  new Function('window',landmarkJs)(sandbox);
  return(cache.missions=sandbox.CubeArchitectLandmarks());
}
function quizRules(){
  const start=main.indexOf('const NET_FACE_CORNERS=');
  const end=main.indexOf('function symbolMaterial(',start);
  assert.ok(start>=0&&end>start);
  return new Function("const faceNames=['오른쪽','왼쪽','위','아래','앞','뒤'];"+
    "function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}"+
    main.slice(start,end)+
    'return {NET_FACE_CORNERS,NET_LAYOUT,netEdgeData,makeNetQuiz,flatNetNeighbors}')();
}
test('v15 scripts parse and the launcher loads landmarks before the game',()=>{
  assert.doesNotThrow(()=>new Function(main));
  assert.doesNotThrow(()=>new Function(landmarkJs));
  assert.doesNotThrow(()=>new Function(worldJs));
  assert.ok(html.indexOf('cube-architect-world.js')<html.indexOf('cube-architect.js'));
  assert.ok(html.indexOf('cube-architect-landmarks.js')<html.indexOf('cube-architect.js'));
  assert.match(html,/cube-architect\.js\?v=20261005-avatar-actions1/);
  assert.match(css,/\.challenge-element-choices/);
  assert.match(html,/challengeDimX/);
  assert.match(html,/blueprintLargeCanvas/);
  assert.match(html,/freeElementChoices/);
});
test('six landmark plans have unique cells inside the 32x32x28 building area',()=>{
  const plans=landmarks();
  assert.equal(plans.length,6);
  for(const m of plans){
    assert.ok(m.blocks.length>1000,m.name);
    assert.equal(new Set(m.blocks.map(p=>p.join(','))).size,m.blocks.length,m.name);
    assert.equal(Object.keys(m.roles).length,m.blocks.length,m.name);
    assert.equal(Object.keys(m.colors).length,m.blocks.length,m.name);
    for(const [x,y,z] of m.blocks){
      assert.ok(x>=0&&x<32&&z>=0&&z<32&&y>=0&&y<28,m.name);
    }
  }
});
test('all net edges pair correctly and generated answers are unambiguous',()=>{
  const rules=quizRules(),edges=rules.netEdgeData();
  assert.equal(edges.length,24);
  const pairs=new Map();
  for(const e of edges)pairs.set(e.edgeKey,(pairs.get(e.edgeKey)||0)+1);
  assert.equal(pairs.size,12);
  assert.ok([...pairs.values()].every(n=>n===2));
  for(const kind of ['face','edge','vertex'])for(let run=0;run<100;run++){
    const q=rules.makeNetQuiz(kind);
    assert.equal(q.options.length,4);
    assert.equal(new Set(q.options).size,4);
    assert.equal(q.options.filter(x=>x===q.correct).length,1);
    if(kind==='face')assert.equal(q.correct,q.source%2===0?q.source+1:q.source-1);
    if(kind==='edge'){
      assert.equal(q.source.edgeKey,q.correct.edgeKey);
      assert.ok(!rules.flatNetNeighbors(q.source,q.correct));
    }
    if(kind==='vertex'){
      assert.equal(q.source.vertex,q.correct.vertex);
      assert.notEqual(q.source.xy,q.correct.xy);
    }
  }
});
test('easy scoring is location/rotation invariant and hard scoring ignores invisible interiors',()=>{
  const start=main.indexOf('function normalizedShape('),end=main.indexOf('function updateChallengeCamera(',start);
  assert.ok(start>=0&&end>start);
  const shapeCode=main.slice(start,end);
  const key=(x,y,z)=>x+','+y+','+z;
  const first=[[2,0,1],[3,0,1],[2,1,1],[3,1,1],[2,0,2],[3,0,2],[2,1,2],[3,1,2]];
  const make=(mission,points,difficulty)=>{
    const blocks=new Map(points.map(p=>[key(...p),{}]));
    return new Function('challengeBlocks','challengeKey','currentChallengeMission','challengeDifficulty',
      shapeCode+'return bestChallengeMatch()')(blocks,key,()=>mission,difficulty);
  };
  const mission={blocks:first};
  assert.equal(make(mission,first.map(([x,y,z])=>[x+11,y+3,z+4]),'easy').score,100);
  assert.equal(make(mission,first.map(([x,y,z])=>[-z+11,y+3,x+4]),'easy').score,100);
  const hard=landmarks()[0];
  assert.equal(make(hard,hard.blocks,'hard').score,100);
  const present=new Set(hard.blocks.map(p=>key(...p)));
  const inside=hard.blocks.find(([x,y,z])=>[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
    .every(([a,b,c])=>present.has(key(x+a,y+b,z+c))));
  assert.ok(inside);
  const hollow=hard.blocks.filter(p=>key(...p)!==key(...inside));
  assert.equal(make(hard,hollow,'hard').score,100);
});
