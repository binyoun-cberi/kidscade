const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('World Language Arcade uses path-based lessons and spaced review',()=>{
  const html=read('games/language_arcade/월드 랭귀지 아케이드.html');
  for(const marker of ['LEARNING PATH','languageArcadeLearningV2','dueAt','INTERVALS','오답은 레슨 끝에서 다시 등장','메모리 매치','리스닝 도어','SpeechSynthesisUtterance']) assert.ok(html.includes(marker),marker);
  assert.match(html,/const LESSON_NAMES=\['새 표현','듣기','섞어 복습','챌린지'\]/);
  assert.match(html,/state\.session\.queue|s\.queue\.push/);
  assert.doesNotMatch(html,/스피킹|말하기 평가를 합니다/);
});

test('World Language Arcade keeps legacy language banks and routes',()=>{
  const html=read('games/language_arcade/월드 랭귀지 아케이드.html');
  for(const key of ['engWords','engSentences','zhBasic','zhAdvanced','ja']) assert.match(html,new RegExp('"'+key+'"'));
  assert.match(html,/legacyMap=\{engWords:'en',engSentences:'en',zhBasic:'zh',zhAdvanced:'zh',ja:'ja'\}/);
  assert.match(html,/"word":"peach","desc":"복숭아"/);
});

test('World Language Arcade has no countdown-heart failure loop',()=>{
  const html=read('games/language_arcade/월드 랭귀지 아케이드.html');
  assert.doesNotMatch(html,/remaining<=0|time\.danger|목숨|하트/);
  assert.match(html,/복습 0/);
});
