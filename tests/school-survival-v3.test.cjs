const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'초딩 생존기.html'),'utf8');

test('school survival inline JavaScript parses',()=>{
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(m=>m[1]).filter(Boolean);
  assert.ok(scripts.length>=1);
  scripts.forEach((src,i)=>assert.doesNotThrow(()=>new vm.Script(src,{filename:'school-survival-inline-'+i+'.js'})));
});

test('school survival v3 uses deterministic Fisher-Yates queue generation',()=>{
  assert.match(html,/function rng\(\)/);
  assert.match(html,/function weightedPick\(items\)/);
  assert.match(html,/for\(let i=out\.length-1;i>0;i--\)/);
  assert.doesNotMatch(html,/sort\(\(\)=>Math\.random\(\)-\.5\)/);
  assert.match(html,/rngSeed:seed,rngState:seed/);
});

test('school survival v3 has state-aware storylets and explicit relationship metadata',()=>{
  assert.match(html,/const storyletCards=\[/);
  assert.match(html,/function storyletOpen\(e,phase\)/);
  assert.match(html,/function selectDynamicEvent\(\)/);
  assert.match(html,/choiceMeta:/);
  assert.match(html,/characterId:'민서'/);
  assert.match(html,/characterId:'준호'/);
  assert.match(html,/characterId:'서윤'/);
  assert.match(html,/state\.storyletSeen\[e\.id\]=true/);
});

test('school survival v3 supports delayed consequence chains',()=>{
  assert.match(html,/pendingChains:\[\]/);
  assert.match(html,/function queueChain\(spec\)/);
  assert.match(html,/g2_minseo_pencil_return/);
  assert.match(html,/g4_homework_found/);
  assert.match(html,/chain:\{id:'g2_minseo_pencil_return',delay:3\}/);
  assert.match(html,/chain:\{id:'g4_homework_found',delay:2\}/);
});

test('school survival v3 orders a school year by phases and preserves legacy saves',()=>{
  for(const phase of ['새 학기','1학기','여름·2학기 초','2학기','학년말'])assert.ok(html.includes(phase));
  assert.match(html,/function phaseAt\(index,total\)/);
  assert.match(html,/state\.phaseHistory\.push/);
  assert.match(html,/s\.storyletSeen=s\.storyletSeen\|\|\{\}/);
  assert.match(html,/s\.pendingChains=Array\.isArray/);
  assert.match(html,/gradeNames\[state\.grade\].*e\._phase/);
});
