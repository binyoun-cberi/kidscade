'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const E=require('../games/hanja_sichuan/engine.js');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'games/hanja_sichuan/index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'games/hanja_test/data/hanja-grade-data.js'),'utf8');
const ctx={window:{}};
vm.runInNewContext(source,ctx);
const entries=ctx.window.KIDSCADE_HANJA_GRADE_DATA.entries;
function pair(id){
  return {pairId:String(id),hanja:'字',meaning:'글자',reading:String(id),label:'글자 '+id};
}
function boardWith(cols,rows,cells){
  const board=Array(cols*rows).fill(null);
  for(const [pos,tile] of Object.entries(cells))board[Number(pos)]=tile;
  return board;
}
test('a two-turn matching path can run outside board and never cross a tile',()=>{
  const a={...pair(1),kind:'hanja'},b={...pair(1),kind:'reading'};
  const block={...pair(2),kind:'hanja'};
  const board=boardWith(3,2,{0:a,1:block,2:b,3:block,4:block,5:block});
  const path=E.matchPath(board,3,2,0,2);
  assert.ok(path,'top border must be a usable route');
  assert.ok(path.length<=4,'maximum two bends');
  assert.ok(path.some(p=>p.y===-1),'outside-border passage is supported');
  assert.equal(E.matchPath(board,3,2,0,1),null,'different answer must not match');
  assert.equal(E.matchPath(board,3,2,0,0),null,'same tile must not match');
});
test('blocked internal tiles cannot pass through occupied spaces',()=>{
  const full=Array(25).fill(1);
  assert.equal(E.findPath(full,5,5,12,18),null,'middle tile is completely surrounded');
  assert.ok(E.findPath(full,5,5,0,1),'adjacent pair can connect');
});
test('grade selections reuse official 3500-row bundle without ambiguous visible answer labels',()=>{
  for(const grade of [8,7,6,5,4,3,2,1]){
    const selection=E.pickEntries(entries,grade,8);
    assert.equal(selection.length,8);
    assert.equal(new Set(selection.map(p=>p.pairId)).size,8);
    assert.equal(new Set(selection.map(p=>p.label)).size,8);
    for(const item of selection)assert.ok(entries.some(row=>row[0]===item.hanja&&row[1]>=grade));
  }
  assert.equal(E.pickEntries(entries,8,40).length,40,'8급 supports the master board');
});
test('each board is solvable in the removal order recorded by its constructor',()=>{
  const layouts=[[4,4],[6,6],[8,6],[8,8],[10,8]];
  for(const [cols,rows] of layouts){
    for(let iteration=0;iteration<7;iteration++){
      const source=E.pickEntries(entries,8,cols*rows/2);
      const {board,solution}=E.generateBoard(source,cols,rows);
      assert.equal(board.length,cols*rows);
      assert.equal(solution.length,cols*rows/2);
      assert.ok(E.availableMatches(board,cols,rows).length>0,'first move exists');
      const copy=board.slice();
      for(const [a,b] of solution){
        assert.ok(E.matchPath(copy,cols,rows,a,b),cols+'x'+rows+' path exists at step');
        copy[a]=null;copy[b]=null;
      }
      assert.ok(copy.every(x=>x===null));
    }
  }
});
test('reshuffle keeps exactly the remaining learning pairs and supplies a solution',()=>{
  const pairs=Array.from({length:7},(_,i)=>pair(i));
  const created=E.generateBoard(pairs,8,6);
  assert.equal(created.board.filter(Boolean).length,14);
  const labels=created.board.filter(t=>t?.kind==='reading').map(t=>t.label).sort();
  assert.deepEqual(labels,pairs.map(p=>p.label).sort());
  const copy=created.board.slice();
  for(const [a,b] of created.solution){
    assert.ok(E.matchPath(copy,8,6,a,b));
    copy[a]=null;copy[b]=null;
  }
});
test('game integrates the grade data, controls, mobile viewport and outcome system',()=>{
  for(const text of ['hanja-grade-data.js','engine.js','kidscade-game-sdk.js','id="grade"','id="mode"','id="difficulty"','id="hintBtn"','id="shuffleBtn"','id="finishDialog"','scope:\'stage\'','prefers-reduced-motion']){
    assert.ok(html.includes(text),text);
  }
  const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
  scripts.forEach(code=>assert.doesNotThrow(()=>new Function(code)));
});
