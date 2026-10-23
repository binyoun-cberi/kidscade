'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const compare=require(path.join(root,'ending-choice-compare-v1.js'));
const biography=require(path.join(root,'biography-v328.js'));
const source=name=>fs.readFileSync(path.join(root,name),'utf8');

test('every decision at the same age survives and stays in original log order',()=>{
  const previous=[
    {age:24,label:'가족과 함께 살기로 했다'},
    {age:24,label:'곡식을 나누기로 했다'},
    {age:24,label:'집을 떠나기로 했다'},
    {age:27,label:'장터에 갔다'}
  ];
  const now=[
    {age:24,label:'가족과 함께 살기로 했다'},
    {age:24,label:'곡식을 나누기로 했다'},
    {age:27,label:'장터에 갔다'}
  ];
  const original=JSON.stringify({previous,now});
  const rows=compare.rows(previous,now);
  assert.deepEqual(rows.map(x=>x.age),[24,27]);
  assert.deepEqual(rows[0].before,previous.slice(0,3).map(x=>x.label));
  assert.deepEqual(rows[0].after,now.slice(0,2).map(x=>x.label));
  assert.equal(rows[0].changed,true);
  assert.equal(rows[1].changed,false);
  assert.equal(JSON.stringify({previous,now}),original,'comparison is read-only');
  assert.match(compare.readable(rows[0].before),/1\..*2\..*3\./);
});
test('historical choices at ages outside modern gates are compared, not dropped',()=>{
  const a=[
   {age:3,label:'고려 시절 가족을 도왔다'},
   {age:9,label:'조선 시대 글공부를 택했다'},
   {age:73,label:'장성한 자녀와 살았다'}
  ];
  const b=[
   {age:3,label:'고려 시절 피란했다'},
   {age:16,label:'다른 선택을 했다'},
   {age:73,label:'장성한 자녀와 살았다'}
  ];
  const rows=compare.rows(a,b);
  assert.deepEqual(rows.map(x=>x.age),[3,9,16,73]);
  assert.equal(rows[1].before.length,1);
  assert.equal(rows[1].after.length,0);
  assert.equal(rows[3].changed,false);
  assert.equal(compare.readable([]),'그 나이에 기록된 선택 없음');
  assert.ok(!compare.readable([]).includes('삶을 마침'),'a missing decision is not proof of death');
});
test('generic biography choice kind recognizes Goryeo and newly added eras',()=>{
 const recorded=[
  {age:19,kind:'goryeo-choice',text:'피란길을 택했다'},
  {age:19,kind:'joseon341-choice',text:'진로를 정했다'},
  {age:19,kind:'futureEra:choice',text:'새로운 삶을 택했다'},
  {age:20,kind:'joseon-followup',text:'이후의 일'},
  {age:21,kind:'death',text:'삶이 끝났다'}
 ];
 const choiceRecords=recorded.filter(biography.isChoice).map(e=>({age:e.age,label:e.text}));
 assert.deepEqual(choiceRecords.map(x=>x.age),[19,19,19]);
 assert.equal(compare.rows(choiceRecords,choiceRecords)[0].before.length,3);
 assert.equal(compare.rows(choiceRecords,choiceRecords)[0].changed,false);
 const game=source('game.js');
 assert.match(game,/choices:life\.log\.filter\(window\.OneLifeBiography328\.isChoice\)/);
 assert.doesNotMatch(game,/const previousChoices=new Map\(/);
 assert.doesNotMatch(game,/for\(const age of World4\.GATES\)/);
 assert.match(game,/choiceCompare\.rows\(replayBasis\.choices,now\.choices\)/);
});
test('bad data and old snapshots cannot erase valid decisions or throw',()=>{
 assert.deepEqual(compare.rows(undefined,null),[]);
 assert.deepEqual(compare.rows([{age:-1,label:'가짜'},{age:'x',label:'오류'},{age:1.5,label:'불완전'}],[]),[]);
 assert.deepEqual(compare.rows([{age:4,label:'선택'},{age:4,label:'선택'}],[])[0].before,['선택','선택']);
 assert.deepEqual(compare.rows([{age:0,label:'출생 후 선택'}],[{age:'0',label:'출생 후 선택'}])[0].after,['출생 후 선택']);
 assert.equal(compare.rows([{age:4,label:'A'}],[{age:4,label:'A'},{age:4,label:'B'}])[0].changed,true);
 assert.equal(compare.rows([{age:4,label:'A'},{age:4,label:'B'}],[{age:4,label:'B'},{age:4,label:'A'}])[0].changed,true);
});
test('comparator loads before game and the actual CI executes this regression test',()=>{
 const html=source('index.html'),runner=fs.readFileSync(path.join(__dirname,'../scripts/run-ci-tests.cjs'),'utf8');
 const helper='ending-choice-compare-v1.js?v=2',entry='game.js?v=87';
 assert.ok(html.includes(helper)&&html.includes(entry));
 assert.ok(html.indexOf(helper)<html.indexOf(entry));
 assert.ok(runner.includes('tests/one-life-ending-compare-v1.test.cjs'));
});
