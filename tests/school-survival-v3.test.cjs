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


test('Taewo uses a separate antagonist state instead of normal friendship',()=>{
  assert.match(html,/antagonists:\{'태오':\{bond:0,influence:0,defiance:0,moments:0\}\}/);
  assert.match(html,/function antagonistTier\(name\)/);
  assert.match(html,/function applyAntagonistChoice\(name,meta,constructive,fx\)/);
  assert.match(html,/name==='태오'/);
  assert.match(html,/영향 \$\{av\.influence\} \/ 저항 \$\{av\.defiance\}/);
});

test('Taewo antagonist arc spans grade 2 through graduation with consequences',()=>{
  for(const id of [
    'g2_taeo_cleanup_escape','g2_taeo_cleanup_caught',
    'g3_taeo_prank','g3_taeo_prank_backfire',
    'g4_taeo_winning_team',
    'g5_taeo_anonymous_poll','g5_taeo_poll_fallout',
    'g6_taeo_pack_offer','g6_taeo_respect','g6_taeo_last_prank'
  ]) assert.ok(html.includes(id), 'missing Taewo antagonist event '+id);
  assert.match(html,/chain:\{id:'g2_taeo_cleanup_caught',delay:2\}/);
  assert.match(html,/chain:\{id:'g3_taeo_prank_backfire',delay:2\}/);
  assert.match(html,/chain:\{id:'g5_taeo_poll_fallout',delay:2\}/);
});

test('Taewo route can end as influence, boundary, or mutual-rival outcome',()=>{
  assert.match(html,/또 쉬운 길을 제안하는 목소리/);
  assert.match(html,/친구는 아니어도 서로 인정한다/);
  assert.match(html,/끝까지 지킨 선/);
  assert.match(html,/taeo\.influence>=8/);
  assert.match(html,/taeo\.defiance>=8&&taeo\.bond>=2/);
  assert.match(html,/taeo\.defiance>=7/);
});

test('Taewo has a dedicated visual profile',()=>{
  assert.match(html,/villain:\{classes:/);
  assert.match(html,/if\(e\.antagonist\|\|\/친구\\s\*태오\//);
  assert.match(html,/return 'villain'/);
});


test('Taewo arc beats are prioritized and visible at grade transitions',()=>{
  for(const [id,priority] of [
    ['g2_taeo_cleanup_escape',96],['g3_taeo_prank',93],['g4_taeo_winning_team',91],
    ['g5_taeo_anonymous_poll',93],['g6_taeo_pack_offer',97],['g6_taeo_respect',97]
  ]){
    const at=html.indexOf("id:'"+id+"'");
    assert.ok(at>=0,'missing '+id);
    assert.ok(html.slice(at,at+350).includes('priority:'+priority),'wrong priority for '+id);
  }
  assert.match(html,/태오: \$\{antagonistTier\('태오'\)\} \(영향 \$\{taeo\.influence\} \/ 저항 \$\{taeo\.defiance\}\)/);
  assert.match(html,/s\.antagonists=s\.antagonists\|\|\{\}/);
});
