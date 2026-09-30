'use strict';
// 실행: node --test tests/story-builder-spelling.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const from=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=from('games/high_story_builder/game.js');
const sandbox={window:{}};
vm.runInNewContext(from('data/spelling-quiz-expanded.js'),sandbox);
vm.runInNewContext(from('games/high_story_builder/spelling-extra.js'),sandbox);
const start=source.indexOf('const MANUAL_RULES = [');
const stop=source.indexOf("let level='easy';",start);
const fnStart=source.indexOf('function countWords(t){');
const fnStop=source.indexOf('function startMission(){',fnStart);
assert.ok(start>=0&&stop>start&&fnStart>0&&fnStop>fnStart,'검사기 추출 지점 확인');
vm.runInNewContext(
  source.slice(start,stop)
  +'\nlet spellRules=[];const ignoredChecks=new Set();\n'
  +source.slice(fnStart,fnStop)
  +'\nbuildSpellRules();globalThis.checkText=inspectSpelling;globalThis.getRuleCount=()=>spellRules.length;',
  sandbox
);
const errors=text=>Array.from(sandbox.checkText(text),e=>e.bad);
test('기존 문제은행과 확장 검사 자료가 정상 로드됨',()=>{
  assert.ok(sandbox.window.KIDSCADE_SPELLING_EXTRA.length>=500);
  assert.ok(sandbox.window.KIDSCADE_WRITING_RULES.length>=700);
  assert.ok(sandbox.getRuleCount()>=1300);
});
const positive=[
 ['펭귄이 책을 일거요. 잼있게 일거요.',['일거요','잼있게']],
 ['토키가 아이스크린을 먹어요.',['토키가','아이스크린을']],
 ['강아쥐와 토키가 함께 놀아요.',['강아쥐와','토키가']],
 ['오늘 학교에갔어요. 친구랑놀아요.',['학교에갔어요','친구랑놀아요']],
 ['할수있어요. 첫번째 책을 읽어요.',['할수있어요','첫번째']],
 ['비가와요. 어재도 비가왔어요.',['비가와요','어재도','비가왔어요']],
 ['친구랑 떡복이를 머거요.',['떡복이를','머거요']],
 ['재미잇게 놀고십어요.',['재미잇게','놀고십어요']],
 ['괜차나요. 저는 잘 할거예요.',['괜차나요','할거예요']],
 ['고양희가 무지게를 봐써요.',['고양희가','무지게를','봐써요']],
 ['돼었어요.',['돼었어요']],
 ['안갔어요.',['안갔어요']],
 ['잼있게 일거요. 재밋게 봐써요.',['잼있게','일거요','재밋게','봐써요']]
];
for(const [sentence,wanted] of positive){
 test('실제 학생 오류: '+sentence,()=>{
  const found=errors(sentence);
  for(const bad of wanted)assert.ok(found.includes(bad),bad+'를 발견해야 합니다. 실제: '+found);
 });
}
const negative=[
 '펭귄이 재미있게 책을 읽어요.','아이스크림을 맛있게 먹었어요.',
 '엄마가 아기를 낳았어요.','바다에서 토끼가 뛰어놀았어요.',
 '책을 읽으면 읽을수록 재미있어요.','재밌게 책을 읽었어요.',
 '할 수 있어요. 갈 수 없어요.','나는 오늘 학교에 갔어요.',
 '강아지와 고양이는 집에서 놀아요.','초콜릿과 떡볶이를 좋아해요.',
 '무지개를 보고 노래를 불렀어요.','모레 체육관에서 친구를 만나요.',
 '사과 세 개를 먹었어요.','나는 안 갔어요. 친구가 왔어요.',
 '어떻게 공부해야 할까요?','어떡해! 지갑을 잃어버렸어.',
 '내가 했는데 친구는 못 했어요.','그런데 밖에는 비가 와요.',
 '저는 매일 책을 읽어요.','틀린 답을 맞혔어요.'
];
for(const sentence of negative){
 test('맞는 문장을 잘못 고치지 않기: '+sentence,()=>assert.deepEqual(errors(sentence),[]));
}
test('추가 자료의 모든 오타를 검출하며 정답은 오답으로 처리하지 않음',()=>{
 const corpus=sandbox.window.KIDSCADE_WRITING_RULES;
 for(const item of corpus){
  assert.ok(errors(item.bad).includes(item.bad),'누락: '+item.bad);
  assert.deepEqual(errors(item.good),[],'정답을 오검출함: '+item.good);
 }
});
