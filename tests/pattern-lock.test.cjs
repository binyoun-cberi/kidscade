const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','low_pattern_lock');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');

test('Pattern Lock is a hidden-pattern deduction game, not a memory preview game',()=>{
  assert.match(html,/<title>패턴 락<\/title>/);
  assert.match(html,/정답 패턴은 보여주지 않아요/);
  assert.match(html,/단서 하나 더/);
  assert.doesNotMatch(html,/다시 보기/);
  assert.match(js,/pattern_lock_v4/);
  assert.match(js,/function clueText/);
  assert.match(js,/function comparison/);
  assert.match(js,/samePath\(state\.path,target\)/);
  assert.match(js,/sameOrder/);
  assert.match(js,/sameEdges/);
  assert.doesNotMatch(js,/showPreview/);
});

test('Pattern Lock ships 18 complex valid target patterns with diagonal play',()=>{
  const source=js.match(/const LEVELS=(\[[\s\S]*?\]);\n\nconst SAVE_KEY/);
  assert.ok(source,'LEVELS literal not found');
  const levels=Function('return '+source[1])();
  assert.equal(levels.length,18);
  let diagonalLevels=0, fiveByFive=0, mixed=0;
  for(const level of levels){
    const [cols,rows]=level.grid;
    assert.equal(cols,rows);
    assert.ok([3,4,5].includes(cols));
    assert.ok(level.solution.length>=6);
    assert.equal(new Set(level.solution).size,level.solution.length,'repeated node in level '+level.id);
    assert.ok(level.solution.every(i=>Number.isInteger(i)&&i>=0&&i<cols*rows),'out of range level '+level.id);
    let hasDiagonal=false;
    for(let i=1;i<level.solution.length;i++){
      const a=level.solution[i-1],b=level.solution[i];
      const ar=Math.floor(a/cols),ac=a%cols,br=Math.floor(b/cols),bc=b%cols;
      const dr=Math.abs(br-ar),dc=Math.abs(bc-ac);
      assert.ok(dr<=1&&dc<=1&&(dr||dc),'non-adjacent move level '+level.id);
      if(dr===1&&dc===1)hasDiagonal=true;
    }
    if(hasDiagonal)diagonalLevels++;
    if(cols===5)fiveByFive++;
    const s=level.structure||{};
    if(s.sequence&&s.choice&&s.repeat)mixed++;
    assert.ok(Array.isArray(level.initial)&&level.initial.length>=4);
    assert.ok(Array.isArray(level.extras)&&level.extras.length>=3);
  }
  assert.equal(diagonalLevels,18);
  assert.ok(fiveByFive>=8);
  assert.ok(mixed>=1);
});

test('Pattern Lock catalog metadata points to v4 deduction redesign',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_pattern_lock');
  assert.ok(game);
  assert.equal(game.title,'패턴 락');
  assert.equal(game.href,'games/low_pattern_lock/index.html?v=4');
  assert.equal(game.subject,'thinking');
  assert.equal(game.genre,'puzzle');
  assert.deepEqual(game.ages,['low','high']);
  assert.equal(game.classroom,true);
});
