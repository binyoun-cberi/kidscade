'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../games/high_one_life');
const compare=require(path.join(dir,'ending-choice-compare-v1.js'));
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');

test('choice summary reports real decisions and differences without dropping repeated ages',()=>{
 const before=[{age:12,label:'A'},{age:12,label:'B'},{age:12,label:'C'},{age:30,label:'D'}];
 const after=[{age:12,label:'A'},{age:12,label:'B'},{age:12,label:'X'},
 {age:30,label:'D'},{age:40,label:'E'}];
 const snapshot=JSON.stringify({before,after}),result=compare.summary(before,after);
 assert.deepEqual(result,{before:4,after:5,comparedAges:3,changedAges:2,unchangedAges:1});
 assert.equal(compare.summaryText(result),'이전 선택 4건 · 이번 선택 5건 · 달라진 나이 2곳');
 assert.equal(compare.rows(before,after)[0].before.length,3);
 assert.equal(JSON.stringify({before,after}),snapshot);
});
test('empty and invalid choice logs give honest zero counts',()=>{
 const x=compare.summary(undefined,null);
 assert.equal(x.before,0);assert.equal(x.after,0);assert.equal(x.changedAges,0);
 const y=compare.summary([{age:-2,label:'x'},{age:3,label:''}],[]);
 assert.equal(y.before,0);
});
test('dense same-age decisions are keyboard-expandable, with changes opened by default',()=>{
 const game=read('game.js'),css=read('ending-replay-v1.css'),html=read('index.html');
 assert.match(game,/const dense=Math\.max\(entry\.before\.length,entry\.after\.length\)>2/);
 assert.match(game,/document\.createElement\(dense\?'details':'div'\)/);
 assert.match(game,/document\.createElement\(dense\?'summary':'strong'\)/);
 assert.match(game,/if\(dense\)line\.open=entry\.changed/);
 assert.match(game,/overview\.textContent=choiceCompare\.summaryText\(choiceCompare\.summary\(/);
 assert.match(css,/focus-visible/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.ok(html.indexOf('ending-choice-compare-v1.js?v=2')<html.indexOf('game.js?v=82'));
 assert.ok(html.includes('ending-replay-v1.css?v=1'));
});
