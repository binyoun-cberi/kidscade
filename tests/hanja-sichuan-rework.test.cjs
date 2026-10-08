'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const source=read('games/hanja_sichuan/index.html');
const rules=require('../games/hanja_sichuan/rules.js');
const engine=require('../games/hanja_sichuan/engine.js');
const context={window:{}};
vm.runInNewContext(read('games/hanja_test/data/hanja-grade-data.js'),context);
const entries=context.window.KIDSCADE_HANJA_GRADE_DATA.entries;

test('first launch is a 4x4 low-pressure beginner board with explicit controls',()=>{
  assert.match(source,/<option value="start" selected>입문 · 4×4/);
  assert.doesNotMatch(source,/<option value="normal" selected>/);
  assert.match(source,/id="viewToggle"/);
  assert.match(source,/id="panLeft"/);
  assert.match(source,/id="panRight"/);
  assert.match(source,/id="selectedInfo"/);
  assert.match(source,/id="pauseOverlay"/);
  assert.match(source,/id="penalty"/);
  assert.match(source,/id="recordScope"/);
  assert.match(source,/\.tile\.reading \.meaning\{[^}]*white-space:normal/);
  assert.match(source,/id="hintBtn">힌트 보기 \(−80점\)/);
  assert.match(source,/id="shuffleBtn">패 섞기 \(−120점\)/);
});

test('penalty debt is preserved even when visible score reaches zero',()=>{
  assert.deepEqual(rules.COSTS,{wrong:25,hint:80,shuffle:120});
  assert.equal(rules.score(0,80),0);
  assert.equal(rules.score(100,80),20);
  assert.equal(rules.score(100,200),0);
  assert.equal(rules.score(210,200),10);
  assert.match(source,/st\.penaltyPoints\+=Rules\.COSTS\[kind\]/);
  assert.match(source,/st\.points\+=gained;st\.score=Rules\.score\(st\.points,st\.penaltyPoints\)/);
});

test('perfect and independent bonuses are only for deserving cleared sessions',()=>{
  const perfect=rules.rewards({clear:true,wrong:0,hints:0,shuffles:0,mode:'relaxed'});
  assert.equal(perfect.total,400);
  assert.equal(perfect.perfect,true);
  const hint=rules.rewards({clear:true,wrong:0,hints:1,shuffles:0,mode:'relaxed'});
  assert.equal(hint.total,0);
  const mistake=rules.rewards({clear:true,wrong:1,hints:0,shuffles:0,mode:'relaxed'});
  assert.equal(mistake.total,100);
  const time=rules.rewards({clear:true,wrong:0,hints:0,shuffles:0,mode:'timed',secondsLeft:31});
  assert.equal(time.total,493);
  assert.equal(rules.rewards({clear:false,wrong:0,hints:0,shuffles:0,mode:'timed',secondsLeft:10}).total,0);
  assert.match(source,/if\(clear&&st\.score>previous\)storage\.write\(key\(\),st\.score\)/);
  assert.match(source,/hanja_sichuan_best_/);
});

test('mobile layout fits intro board and offers large touch tiles and full answer inspector',()=>{
  const compact=rules.tileSize({viewportWidth:375,boardWidth:345,cols:4,zoomed:false});
  const fitMid=rules.tileSize({viewportWidth:375,boardWidth:345,cols:8,zoomed:false});
  const fitMaster=rules.tileSize({viewportWidth:375,boardWidth:345,cols:10,zoomed:false});
  assert.ok(compact>=60);
  assert.ok((compact*5.08)<=345);
  assert.ok((fitMid*9.08)<=345);
  assert.ok((fitMaster*11.08)<=345);
  assert.equal(rules.tileSize({viewportWidth:375,boardWidth:345,cols:10,zoomed:true}),68);
  assert.equal(rules.tileSize({viewportWidth:1100,boardWidth:1050,cols:10,zoomed:true}),72);
  assert.match(source,/st\.zoomed=\!st\.zoomed/);
  assert.match(source,/btn\.title=tile\.label/);
});

test('constructive generator still solves across all five board sizes on 8급',()=>{
  for(const [cols,rows] of [[4,4],[6,6],[8,6],[8,8],[10,8]]){
    for(let turn=0;turn<20;turn++){
      const pairs=engine.pickEntries(entries,8,cols*rows/2);
      const {board,solution}=engine.generateBoard(pairs,cols,rows);
      for(const [a,b] of solution){
        assert.ok(engine.matchPath(board,cols,rows,a,b),'broken path for '+cols+'x'+rows);
        board[a]=board[b]=null;
      }
      assert.ok(board.every(cell=>!cell));
    }
  }
});

test('inline browser script parses and integrates native game SDK reporting',()=>{
  const scripts=[...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
  for(const s of scripts)assert.doesNotThrow(()=>new Function(s));
  assert.match(source,/SDK\.result\(\{scope:'stage'/);
  assert.match(source,/clean:bonuses\.perfect/);
  assert.match(source,/setTimeout\(\(\)=>\{/);
  assert.match(source,/\},190\)/);
  assert.match(source,/st\.locked&&st\.remaining===0/);
});
