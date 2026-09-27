const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','high_code_quest');
const sandbox={window:{}};
vm.createContext(sandbox);
for(const file of ['code-runtime.js','missions.js','validator.js']){
  vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),sandbox,{filename:file});
}
const {CodeQuestData,CodeQuestRuntime,CodeQuestValidator}=sandbox.window;
let seq=0;
function n(type,body,elseBody){
  const node={id:'v5_'+(++seq),type};
  if(body)node.body=body;
  if(elseBody)node.elseBody=elseBody;
  return node;
}
async function validateMission(number,program,functionPrograms={a:[],b:[]}){
  const mission=CodeQuestData.missions[number-1];
  const visible=await CodeQuestValidator.runCase(program,functionPrograms,mission,{id:'visible',name:'현재 구역'});
  const report=await CodeQuestValidator.validate({
    mission,program,functionPrograms,
    visibleTrace:visible.trace,
    visibleSummary:visible.summary
  });
  return {mission,visible,report};
}
function assertFullPass(result){
  assert.equal(result.visible.ok,true,result.visible.message||'visible case failed');
  assert.equal(result.report.ok,true,result.report.concept?.message||'validation failed');
  assert.ok(result.report.results.every(r=>r.ok),JSON.stringify(result.report.results.map(r=>({id:r.id,ok:r.ok,message:r.message}))));
}
function source(name){return fs.readFileSync(path.join(dir,name),'utf8');}

test('iOS startup regression: world map never adds an empty class token',()=>{
  const game=source('game.js');
  assert.doesNotThrow(()=>new Function(game));
  assert.match(game,/if\(progress\.completed\[a\.end\]\)line\.classList\.add\('done'\)/);
  assert.doesNotMatch(game,/classList\.add\([^\n;]*\?[^\n;]*:\s*['"]{2}\s*\)/);
});

test('playtest rework keeps mobile UX safeguards wired',()=>{
  const game=source('game.js');
  const html=source('index.html');
  assert.match(game,/confirm\('새 원정을 시작하면 현재 코드와 진행 기록이 초기화됩니다/);
  assert.match(game,/function importPreviousProgram\(\)/);
  assert.match(game,/function activeMemoryBonus\(\)/);
  assert.match(game,/function refreshExecutionHighlights\(\)/);
  assert.doesNotMatch(game,/function updateHUD\(\)\{[\s\S]{0,700}renderProgram\(\)/);
  assert.match(html,/data-speed="4"/);
  assert.match(html,/id="importPrevBtn"/);
});


test('full code quest campaign exposes 40 missions across seven ordered regions',()=>{
  assert.equal(CodeQuestData.missions.length,40);
  assert.deepEqual(
    Array.from(CodeQuestData.regions, r=>r.id),
    ['prologue','forest','mine','city','desert','citadel','null']
  );
  assert.deepEqual(
    Array.from(CodeQuestData.regions, r=>[r.start,r.end]),
    [[0,9],[10,14],[15,19],[20,24],[25,29],[30,34],[35,39]]
  );
  for(let i=0;i<CodeQuestData.missions.length;i++){
    const m=CodeQuestData.missions[i];
    assert.equal(typeof m.name,'string');
    assert.ok(m.name.startsWith(String(i+1)+'.'),m.name);
    assert.ok(Array.isArray(m.platforms)&&m.platforms.length>0,'mission '+(i+1)+' has no platforms');
    assert.ok(Number(m.memory)>0,'mission '+(i+1)+' has no memory limit');
  }
});

test('runtime preserves old single-skill programs while supporting A and B',()=>{
  seq=0;
  const legacy=[n('FWD'),n('ATTACK')];
  assert.equal(CodeQuestRuntime.normalizeFunctions(legacy).a.length,2);
  assert.equal(CodeQuestRuntime.normalizeFunctions(legacy).b.length,0);
  const fns={a:[n('FWD')],b:[n('ATTACK'),n('WAIT')]};
  assert.equal(CodeQuestRuntime.countProgramNodes([n('CALL_FN'),n('CALL_FN_B')],fns),5);
});

test('mission 16 conditional goal loop survives all shifted mine gaps',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[n('IF_GAP',[n('JUMP')],[n('FWD')])])];
  assertFullPass(await validateMission(16,program));
});

test('mission 17 waits for safe cart timing across phase changes',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[n('UNTIL_SAFE',[n('WAIT')]),n('FWD')])];
  assertFullPass(await validateMission(17,program));
});

test('mission 18 scans crystals instead of memorizing their positions',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('IF_ITEM',[n('COLLECT')]),
    n('IF_DOOR',[n('OPEN')],[n('FWD')])
  ])];
  const result=await validateMission(18,program);
  assertFullPass(result);
  assert.equal(result.report.results[0].state.crystals,5);
});

test('mission 20 ORE-0 is solvable by state-aware combat across boss phases',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('IF_ENEMY_WINDUP',[n('DODGE')],[
      n('IF_ENEMY',[n('ATTACK')],[n('FWD')])
    ])
  ])];
  assertFullPass(await validateMission(20,program));
});

test('mission 21 requires and accepts both reusable skill slots',async()=>{
  seq=0;
  const functions={
    a:[n('IF_GAP',[n('JUMP')],[n('FWD')])],
    b:[n('IF_ENEMY',[n('ATTACK')])]
  };
  const program=[n('UNTIL_GOAL',[n('CALL_FN_B'),n('CALL_FN')])];
  const result=await validateMission(21,program,functions);
  assertFullPass(result);
  assert.ok(result.report.metrics.functionANodes>0);
  assert.ok(result.report.metrics.functionBNodes>0);
});

test('mission 22 links switches to doors in shifted layouts',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[n('IF_SWITCH',[n('TOGGLE')]),n('FWD')])];
  const result=await validateMission(22,program);
  assertFullPass(result);
  assert.ok(result.report.results[0].state.switches.every(v=>v.on));
});

test('mission 23 conveyor sensor allows preemptive route correction',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('IF_CONVEYOR',[n('JUMP')],[n('IF_GAP',[n('JUMP')],[n('FWD')])])
  ])];
  assertFullPass(await validateMission(23,program));
});

test('mission 24 combines laser timing with switch state',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('UNTIL_SAFE',[n('WAIT')]),
    n('IF_SWITCH',[n('TOGGLE')]),
    n('FWD')
  ])];
  const result=await validateMission(24,program);
  assertFullPass(result);
  assert.ok(result.visible.state.switches.every(v=>v.on));
  assert.ok(result.report.results.every(r=>r.state.switches.every(v=>v.on)));
});

test('mission 29 manages data energy upload and shifted resources',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('IF_DATA',[n('COLLECT_DATA')]),
    n('IF_CHARGER',[n('IF_ENERGY_LOW',[n('CHARGE')])]),
    n('IF_TERMINAL',[n('UPLOAD')]),
    n('IF_GAP',[n('JUMP')],[n('FWD')])
  ])];
  const result=await validateMission(29,program);
  assertFullPass(result);
  assert.equal(result.visible.state.uploads,1);
  assert.equal(result.report.results[0].state.uploads,1);
});

test('conditional HEAL remains safe after the available potion is consumed',async()=>{
  seq=0;
  const mission={
    start:{x:1,y:0},goal:{x:2,y:0},platforms:[{x:0,y:0,w:4}],
    playerHp:2,maxHp:5,potions:0,enemies:[],crystals:[],doors:[],memory:10
  };
  const result=await CodeQuestValidator.runCase([n('HEAL'),n('FWD')],[],mission,{id:'heal'});
  assert.equal(result.ok,true);
});

test('mission 31 generalized citadel code survives both mixed hidden variants',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('UNTIL_SAFE',[n('WAIT')]),
    n('IF_GAP',[n('JUMP')],[n('IF_ENEMY',[n('ATTACK')],[n('FWD')])])
  ])];
  const result=await validateMission(31,program);
  assertFullPass(result);
  assert.equal(result.report.results.length,2);
});

test('mission 35 ROOT WARDEN telegraphs attacks in alternate phase',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('IF_SWITCH',[n('TOGGLE')]),
    n('UNTIL_SAFE',[n('WAIT')]),
    n('IF_GAP',[n('JUMP')],[
      n('IF_WINDUP',[n('DODGE')],[n('IF_ENEMY',[n('ATTACK')],[n('FWD')])])
    ])
  ])];
  assertFullPass(await validateMission(35,program));
});

test('mission 36 universal movement code passes three hidden NULL maps',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('UNTIL_SAFE',[n('WAIT')]),
    n('IF_GAP',[n('JUMP')],[n('FWD')])
  ])];
  const result=await validateMission(36,program);
  assertFullPass(result);
  assert.equal(result.report.results.length,3);
});

test('mission 37 universal combat reacts to different enemy species',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('IF_WINDUP',[n('DODGE')]),
    n('IF_ENEMY',[n('ATTACK')],[n('FWD')])
  ])];
  assertFullPass(await validateMission(37,program));
});

test('mission 38 universal resource logic survives relocated chargers and data',async()=>{
  seq=0;
  const program=[n('UNTIL_GOAL',[
    n('IF_DATA',[n('COLLECT_DATA')]),
    n('IF_CHARGER',[n('IF_ENERGY_LOW',[n('CHARGE')])]),
    n('IF_TERMINAL',[n('UPLOAD')]),
    n('FWD')
  ])];
  assertFullPass(await validateMission(38,program));
});

test('mission 39 integrated AI survives two hidden system layouts',async()=>{
  seq=0;
  const functions={
    a:[
      n('IF_ENEMY',[n('IF_WINDUP',[n('DODGE')],[n('WAIT')])],[
        n('IF_SWITCH',[n('TOGGLE')]),
        n('IF_DATA',[n('COLLECT_DATA')]),
        n('IF_CHARGER',[n('IF_ENERGY_LOW',[n('CHARGE')])]),
        n('IF_TERMINAL',[n('UPLOAD')]),
        n('UNTIL_SAFE',[n('WAIT')]),
        n('IF_GAP',[n('JUMP')],[n('FWD')])
      ])
    ],
    b:[
      n('IF_HP_LOW',[n('HEAL')]),
      n('IF_WINDUP',[n('DODGE')]),
      n('IF_ENEMY',[n('ATTACK')])
    ]
  };
  const program=[n('UNTIL_GOAL',[n('CALL_FN_B'),n('CALL_FN')])];
  const result=await validateMission(39,program,functions);
  assertFullPass(result);
  assert.equal(result.report.results.length,2);
  assert.ok(result.report.results.every(r=>r.state.uploads===1));
});

test('mission 40 final AI clears visible and both hidden NULL CORE worlds',async()=>{
  seq=0;
  const functions={
    a:[
      n('IF_ENEMY',[
        n('IF_WINDUP',[n('DODGE')],[n('WAIT')])
      ],[
        n('IF_SWITCH',[n('TOGGLE')]),
        n('IF_DATA',[n('COLLECT_DATA')]),
        n('IF_CHARGER',[n('IF_ENERGY_LOW',[n('CHARGE')])]),
        n('IF_TERMINAL',[n('UPLOAD')]),
        n('UNTIL_SAFE',[n('WAIT')]),
        n('IF_GAP',[n('JUMP')],[n('FWD')])
      ])
    ],
    b:[
      n('IF_HP_LOW',[n('HEAL')]),
      n('IF_WINDUP',[n('DODGE')]),
      n('IF_ENEMY',[n('ATTACK')])
    ]
  };
  const program=[n('UNTIL_GOAL',[n('CALL_FN_B'),n('CALL_FN')])];
  const result=await validateMission(40,program,functions);
  assertFullPass(result);
  assert.equal(result.report.results.length,2);
  assert.ok(result.visible.state.hp>0);
  assert.ok(result.report.results.every(r=>r.state.hp>0));
  assert.ok(result.report.results.every(r=>r.state.uploads===1));
});
