'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const html=read('games/hanja_test/한자 급수 테스트.html');
const game=read('games/hanja_test/hanja-card-game.js');
const css=read('games/hanja_test/hanja-card-game.css');
const dataSrc=read('games/hanja_test/data/hanja-grade-data.js');

const sandbox={window:{}};
vm.runInNewContext(dataSrc,sandbox);
const DATA=sandbox.window.KIDSCADE_HANJA_GRADE_DATA;

test('Hanja card test bundles all 1-8 grade characters with cumulative pools',()=>{
  assert.equal(DATA.total,3500);
  assert.equal(DATA.entries.length,3500);
  assert.equal(new Set(DATA.entries.map(x=>x[0])).size,3500);
  const expected={8:50,7:150,6:300,5:500,4:1000,3:1817,2:2355,1:3500};
  assert.deepEqual(JSON.parse(JSON.stringify(DATA.cumulative)),expected);
  for(const row of DATA.entries){
    assert.equal(row.length,4);
    assert.ok(Number.isInteger(row[1])&&row[1]>=1&&row[1]<=8);
    assert.equal(Array.from(row[0]).length,1);
    assert.ok(Array.isArray(row[2])&&row[2].length>0);
    for(const sense of row[2]){
      assert.ok(Array.isArray(sense[0])&&sense[0].length>0);
      assert.ok(Array.isArray(sense[1])&&sense[1].length>0);
    }
  }
});

test('a round is exactly 25 cards and supports all requested grades',()=>{
  assert.match(game,/const ROUND_SIZE=25/);
  assert.match(game,/const GRADE_ORDER=\[8,7,6,5,4,3,2,1\]/);
  assert.match(game,/filter\(row=>Number\(row\[1\]\)>=selectedGrade\)/);
  assert.match(html,/도전할 급수/);
  assert.match(html,/남은 카드 25장/);
});

test('cards have the requested success, failure and swipe game loop',()=>{
  assert.match(game,/writing\.textPassed=true/);
  assert.match(game,/if\(writing\.complete\|\|writing\.unavailable\)return resolveCard\(true,'answer'\)/);
  assert.match(game,/resolveCard\(false,'skip'\)/);
  assert.match(game,/dx<-85\|\|velocity<-.55/);
  assert.match(game,/playSound\('correct'\)/);
  assert.match(game,/playSound\('wrong'\)/);
  assert.match(css,/@keyframes cardFlyUp/);
  assert.match(css,/translate\(20px,-120vh\)/);
  assert.match(css,/@keyframes cardFlyLeft/);
  assert.match(css,/translate\(-120vw,45px\)/);
});

test('the right side grades handwriting and separately checks meaning and reading',()=>{
  assert.match(html,/hanzi-writer@3\.5/);
  assert.match(html,/id="writerTarget"/);
  assert.match(html,/획순 · 위치 · 방향을 실제 채점/);
  assert.match(html,/id="writingStatus"/);
  assert.match(html,/id="meaningInput"/);
  assert.match(html,/id="readingInput"/);
  assert.match(game,/HanziWriter\.create/);
  assert.match(game,/writerInstance\.quiz/);
  assert.match(game,/leniency:2\.35/);
  assert.match(game,/onMistake/);
  assert.match(game,/onComplete/);
  assert.match(game,/senseMatches/);
});

test('handwriting grading falls back safely when stroke data is unavailable',()=>{
  assert.match(game,/normalize\('NFKC'\)/);
  assert.match(game,/hanzi-writer-data@latest/);
  assert.match(game,/hanzi-writer-data-youyin@latest/);
  assert.match(game,/markWritingUnavailable/);
  assert.match(game,/writingAverage/);
  assert.match(html,/id="resultWriting"/);
});

test('meaning and reading are checked as one matching sense instead of independent flattened lists',()=>{
  assert.match(game,/return senses\.some\(pair=>/);
  assert.match(game,/const meaningOk=ms\.some/);
  assert.match(game,/const readingOk=rs\.some/);
  assert.match(game,/return meaningOk&&readingOk/);
});

test('game uses local data, Kidscade SDK reporting and no old timed multiple-choice UI',()=>{
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/data\/hanja-grade-data\.js/);
  assert.match(html,/hanja-card-game\.js/);
  assert.match(game,/KidscadeGame\?\.result/);
  assert.match(game,/PASS_CORRECT=20/);
  assert.doesNotMatch(html,/opt-btn-/);
  assert.doesNotMatch(game,/TIME_LIMIT/);
  assert.doesNotMatch(game,/MAX_PLACEMENT_ROUNDS/);
});

test('new game JavaScript parses',()=>{
  assert.doesNotThrow(()=>new Function(game));
  assert.doesNotThrow(()=>new Function(dataSrc));
});
