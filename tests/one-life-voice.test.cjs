'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=read('index.html'),game=read('game.js');
test('ordinary player-facing narrative has no developer-aside appended to each event',()=>{
 const scripts=['world-v3.js','world-v9.js','world-v10.js','world-v12.js','world-v13.js',
  'history.js','history-effects-v10.js','history-choices-v11.js','game.js'];
 for(const script of scripts){
  const text=read(script);
  for(const bad of [
   '(가상 인생)','(게임용 가상 상황·효과)','(시대 배경을 바탕으로 한 가상 일상)',
   '이 가상 인물이 직접 참여했다는 뜻은 아니다',
   '이 인물이 실제로 참여하거나 직접 피해를 겪었다는 뜻은 아닙니다.',
   ' (앞서 선택한 가상 인생 경로의 후속 사건)',
   '시대 배경에 근거한 가상 개인 경험'
  ])assert.equal(text.includes(bad),false,script+': '+bad);
 }
});
test('historical fiction and public data remain explicitly distinguished in one accessible place',()=>{
 assert.match(ui,/역사와 이야기의 구분/);
 assert.match(ui,/세계은행/);
 assert.match(ui,/실제 개인이나 그 시대 사람들의 삶을 대표하지 않습니다/);
 assert.match(ui,/나이별 곡선은 게임에서 재구성한 값/);
 assert.match(ui,/게임 속 금액/);
});
test('human-voice copy appears in childhood, history, choices, and life recap',()=>{
 assert.match(read('world-v9.js'),/학교 행사 날, 맡은 순서를 잊을까/);
 assert.match(read('history-stories-v10.js'),/장부를 펼쳤다/);
 assert.match(read('history-effects-v10.js'),/그해 우리 가족은 어떻게 살아갈까/);
 assert.match(read('world-v13.js'),/요즘 쉬어도 피로가 쉽게 가시지 않는다/);
 assert.match(game,/const chapters=\[/);
 assert.match(game,/chapters\.map\(text=>/);
 assert.match(game,/이번에는 어떻게 할까/);
});
test('all existing interactive IDs and script order remain intact',()=>{
 const ids=['birthYearInput','birthLocation','historySourceLink','v10HistoricalCount',
  'v12EconomyEra','v13FamilyStatus','endStory','endChoices'];
 for(const id of ids)assert.ok(ui.includes('id="'+id+'"'),id);
 const scripts=['world-v9.js','world-v10.js','world-v12.js','world-v13.js','game.js'];
 for(let i=1;i<scripts.length;i++)
  assert.ok(ui.indexOf('src="./'+scripts[i-1]+'?')<ui.indexOf('src="./'+scripts[i]+'?'),scripts[i]);
});
