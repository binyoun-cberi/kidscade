'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Rules=require('../games/hanja_sichuan/rules.js');
const E=require('../games/hanja_sichuan/engine.js');
const source=fs.readFileSync(path.join(__dirname,'../games/hanja_sichuan/index.html'),'utf8');

test('new users play two 4×4 tutorial boards before 6×6 becomes the default',()=>{
  const fresh=Rules.tutorialState(null);
  assert.equal(fresh.clears,0);
  assert.equal(fresh.nextDifficulty,'start');
  assert.equal(fresh.completed,false);
  const first=Rules.tutorialAfterGame(fresh.clears,{clear:true,difficulty:'start'});
  assert.equal(first.clears,1);
  assert.equal(first.advanced,true);
  assert.equal(first.nextDifficulty,'start');
  const second=Rules.tutorialAfterGame(first.clears,{clear:true,difficulty:'start'});
  assert.equal(second.clears,2);
  assert.equal(second.completed,true);
  assert.equal(second.nextDifficulty,'easy');
  assert.equal(Rules.tutorialState(second.clears).nextDifficulty,'easy');
});

test('failed boards and other sizes never consume tutorial clears',()=>{
  assert.equal(Rules.tutorialAfterGame(0,{clear:false,difficulty:'start'}).clears,0);
  assert.equal(Rules.tutorialAfterGame(0,{clear:true,difficulty:'easy'}).clears,0);
  assert.equal(Rules.tutorialAfterGame(1,{clear:false,difficulty:'start'}).clears,1);
  assert.equal(Rules.tutorialAfterGame(1,{clear:true,difficulty:'hard'}).clears,1);
});

test('manual 4×4 replay after tutorial completion is available without redoing progress',()=>{
  for(const bad of [2,3,10,999]){
    const replay=Rules.tutorialAfterGame(bad,{clear:true,difficulty:'start'});
    assert.equal(replay.clears,2);
    assert.equal(replay.advanced,false);
    assert.equal(replay.nextDifficulty,'easy');
  }
  for(const bad of [-1,'NaN',{},null]){
    assert.equal(Rules.tutorialState(bad).clears,0);
  }
});

test('entrypoint persists progression on completed intro stages and restores it on reload',()=>{
  assert.match(source,/const TUTORIAL_KEY='hanja_sichuan_tutorial_clear_v1'/);
  assert.match(source,/Rules\.tutorialAfterGame\(storage\.read\(TUTORIAL_KEY,0\),\{clear,difficulty:st\.difficulty\}\)/);
  assert.match(source,/if\(tutorial\.advanced\)\{/);
  assert.match(source,/storage\.write\(TUTORIAL_KEY,tutorial\.clears\)/);
  assert.match(source,/if\(tutorial\.completed\)\$\('difficulty'\)\.value='easy'/);
  assert.match(source,/\$\('difficulty'\)\.value=progress\(\)\.nextDifficulty/);
  assert.match(source,/id="tutorialStatus"/);
  assert.match(source,/입문 완료! 다음 판부터 기본 6×6\(18쌍\)/);
  assert.match(source,/6×6 시작하기/);
  assert.match(source,/value="start" selected/);
  assert.match(source,/value="easy"/);
  assert.match(source,/id="difficulty"/);
  const scripts=[...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
  scripts.forEach(code=>assert.doesNotThrow(()=>new Function(code)));
});

test('both tutorial boards and default 6×6 boards stay solvable',()=>{
  for(const [cols,rows] of [[4,4],[6,6]]){
    for(let i=0;i<30;i++){
      const pairs=Array.from({length:cols*rows/2},(_,n)=>({pairId:String(n),hanja:'字',meaning:'글자',reading:String(n),label:'글자 '+n}));
      const {board,solution}=E.generateBoard(pairs,cols,rows);
      assert.equal(solution.length,cols*rows/2);
      for(const [a,b] of solution){
        assert.ok(E.matchPath(board,cols,rows,a,b),cols+'x'+rows+' failed');
        board[a]=null;board[b]=null;
      }
      assert.ok(board.every(x=>x===null));
    }
  }
});
