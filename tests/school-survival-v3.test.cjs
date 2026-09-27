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


test('school survival v3 carries named friendships across multiple grades',()=>{
  for(const id of [
    'g1_minseo_first_friend','g2_minseo_pencil','g3_minseo_group','g4_minseo_old_friend','g5_minseo_different_groups','g6_minseo_album',
    'g2_junho_race','g3_junho_math','g4_homework_copy','g5_junho_second_chance','g6_junho_final_race',
    'g3_seoyun_presentation','g4_seoyun_secret','g5_groupchat_photo','g6_seoyun_groupchat_memory'
  ]) assert.ok(html.includes(id), 'missing friendship arc event '+id);
  assert.match(html,/const NPC_PROFILES=/);
  assert.match(html,/function bondTier\(name\)/);
  assert.match(html,/친구 민서.*bondTier|bondTier\(fname\)/s);
});

test('friendship choices unlock later callbacks and relationship-specific futures',()=>{
  assert.match(html,/state\.flags\.met_minseo/);
  assert.match(html,/state\.flags\.sent_homework_answers\|\|!!state\.flags\.taught_junho/);
  assert.match(html,/state\.flags\.joined_mocking\|\|!!state\.flags\.protected_seoyun/);
  assert.match(html,/function relationshipFutureStories\(\)/);
  assert.match(html,/새 교복 옆에 익숙한 얼굴/);
  assert.match(html,/아직도 서로 기록을 보여준다/);
  assert.match(html,/보내기 전에 한 번 더 본다/);
  assert.doesNotMatch(html,/결혼했습니다/);
});

test('graduation can surface up to three earned future scenes',()=>{
  assert.match(html,/const list=\[\.\.\.relationshipFutureStories\(\)\]/);
  assert.match(html,/slice\(0,3\)\.map\(x=>x\.story\)/);
});
