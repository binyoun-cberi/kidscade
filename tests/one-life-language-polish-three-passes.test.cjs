'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const versions={
 'engine.js':20,'history-stories-v10.js':4,'joseon-v9-village.js':8,
 'joseon-v14-captivity-generations.js':13,'joseon-v18-sedo-samjeong.js':7,
 'joseon-v19-local-office.js':7,'colonial-daily-v2.js':5,
 'joseon-branches-v325.js':4,'joseon-fate-v344.js':4,
 'joseon-magistrate-v345.js':4,'joseon-court-v346.js':3,
 'joseon-bonded-v346.js':3,'joseon-commoner-v346.js':3,
 'joseon-baekjeong-v346.js':3,'goryeo-v343.js':2,'game.js':87
};
test('the 16 revised narration assets load exactly once with fresh versions',()=>{
 const html=read('index.html');
 for(const [name,version] of Object.entries(versions)){
  const target='./'+name+'?v='+version;
  assert.equal(html.split(target).length-1,1,name+' is not loaded exactly once');
 }
});
test('class choices talk about what happens to people, not the simulation architecture',()=>{
 const samples=[
  ['joseon-court-v346.js','조정에 드나들게 되자 사소한 말 한마디도 조심스러워졌다.'],
  ['joseon-bonded-v346.js','몸은 달아나도 추쇄꾼의 손길에서 벗어나기는 어렵다.'],
  ['joseon-commoner-v346.js','오가는 장꾼마다 부르는 값이 달랐다.'],
  ['joseon-baekjeong-v346.js','새 고을에서도 낯선 눈길은 피할 수 없었다.'],
  ['joseon-fate-v344.js','사람들은 이제 진사라 불렀다.'],
  ['joseon-magistrate-v345.js','관아 앞에는 억울한 사정을 호소하는 사람들이 줄을 섰다.'],
  ['joseon-branches-v325.js','식구들과 둘러앉아 이곳에 남을지 떠날지 의논했다.'],
  ['goryeo-v343.js','집을 떠나려면 길에서 먹을 곡식부터 챙겨야 한다.'],
  ['colonial-daily-v2.js','실제로 손에 남을 돈이 얼마나 될지 다시 셈해 볼 수 있었다.'],
  ['history-stories-v10.js','대문 앞에서 마지막 인사를 나눴다.']
 ];
 for(const [filename,phrase] of samples)assert.ok(read(filename).includes(phrase),filename+' missing '+phrase);
});
test('no known doubled adverbs, misspellings or ungrammatical granary expressions remain',()=>{
 for(const file of Object.keys(versions)){
  const source=read(file);
  for(const fragment of ['실제로 실제로','추상 수치을','곳간에는 \'+d.food+\'이 남아 있고'])
   assert.ok(!source.includes(fragment),file+' includes '+fragment);
 }
});
test('modern and historic player panels have short, natural cues',()=>{
 const game=read('game.js');
 assert.ok(game.includes('아래에 나온 일을 읽고 골라 보세요.'));
 assert.ok(game.includes('오늘 마음에 남은 일을 적어 보세요.'));
 assert.ok(read('engine.js').includes('공부를 조금 더 해 본다'));
 assert.ok(read('joseon-v18-sedo-samjeong.js').includes('마을 사람들 사이에 한숨이 깊어졌다.'));
});
