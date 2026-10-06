'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'games/high_story_builder/game.js'),'utf8');
const html=fs.readFileSync(path.join(root,'games/high_story_builder/index.html'),'utf8');

const logicStart=source.indexOf('function escapeRegExp');
const logicEnd=source.indexOf('function countWords',logicStart);
assert.ok(logicStart>=0&&logicEnd>logicStart,'card alias matcher extraction points');
const sandbox={};
vm.runInNewContext(source.slice(logicStart,logicEnd)+'\nglobalThis.containsAlias=containsAlias;',sandbox);
const contains=(text,aliases,label=aliases[0])=>sandbox.containsAlias(text,{label,aliases});

test('single-syllable aliases do not match inside unrelated Korean words',()=>{
  assert.equal(contains('친구를 소개했어요.',['강아지','개','반려견'],'강아지'),false);
  assert.equal(contains('이야기를 완성했어요.',['성','성문','왕궁','궁전'],'성'),false);
  assert.equal(contains('준비를 마쳤어요.',['비','빗속','빗물','장대비'],'비'),false);
  assert.equal(contains('운동장에서 달리기를 했어요.',['달','달빛','보름달'],'달'),false);
});

test('aliases still match when Korean particles are attached',()=>{
  assert.equal(contains('개가 학교에 갔어요.',['강아지','개','반려견'],'강아지'),true);
  assert.equal(contains('성에서 보물을 찾았어요.',['성','성문','왕궁','궁전'],'성'),true);
  assert.equal(contains('비가 와서 우산을 썼어요.',['비','빗속','빗물','장대비'],'비'),true);
  assert.equal(contains('달이 아주 밝았어요.',['달','달빛','보름달'],'달'),true);
});

test('story composer uses beginning middle and end fields',()=>{
  for(const id of ['storyStart','storyMiddle','storyEnd'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.doesNotMatch(html,/id="storyInput"/);
  assert.match(source,/function composeStory\(\)/);
  assert.match(source,/readySections\(cfg\)/);
});

test('minimum writing amount is enforced instead of display-only',()=>{
  assert.match(source,/if\(chars<cfg\.minChars\)/);
  assert.match(source,/minSectionChars/);
});

test('story missions use role decks and an expanded author challenge pool',()=>{
  assert.match(source,/CHARACTER_IDS/);
  assert.match(source,/PLACE_IDS/);
  assert.match(source,/EVENT_POOL/);
  assert.match(source,/OBJECT_IDS/);
  const start=source.indexOf('const CHALLENGES = [');
  const end=source.indexOf('const MANUAL_RULES = [',start);
  const ids=(source.slice(start,end).match(/id:'/g)||[]).length;
  assert.ok(ids>=15,'expected at least 15 author challenges, got '+ids);
});

test('finished stories report a creation result to the Kidscade SDK',()=>{
  assert.match(source,/KidscadeGame\?\.result\?\.\(\{/);
  assert.match(source,/scope:'creation'/);
  assert.match(source,/status:'completed'/);
});
