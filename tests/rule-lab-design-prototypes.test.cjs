'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const ctx={};ctx.window=ctx;
for(const p of [
 'games/high_rule_lab/levels.js',
 'games/high_rule_lab/engine/state.js',
 'games/high_rule_lab/engine/rules.js',
 'games/high_rule_lab/engine/movement.js',
 'games/high_rule_lab/engine/interactions.js',
 'games/high_rule_lab/engine/turn.js',
 'games/high_rule_lab/engine/validator.js'
])vm.runInNewContext(read(p),ctx);
const E=ctx.RuleLabEngine;
const directions={L:[-1,0],R:[1,0],U:[0,-1],D:[0,1]};
function signatures(state){return E.Rules.flatSignatures(E.Rules.parse(state))}
for(const [filename,expectedOrder] of [
 ['return-route.json',['wall']],
 ['dual-gate.json',['wall','door']]
]){
 test('2차 설계 시제품 '+filename+'은 실제 엔진에서 풀이되고 목표 관문을 통과한다',()=>{
  const raw=JSON.parse(read('games/high_rule_lab/design-prototypes/'+filename));
  assert.equal(raw.status,'design-only-not-in-live-levels');
  const {level,solution}=raw;
  assert.equal(level.w,12);assert.equal(level.h,10);
  const validation=E.Validator.validateLevel(level,ctx.RuleLabData,0);
  assert.equal(validation.errors.length,0,validation.errors.join(';'));
  const locations=[...level.objects,...level.words].map(e=>e.x+','+e.y);
  assert.equal(locations.length,new Set(locations).size,'initial cells must be unique');
  let state=E.State.fromLevel(level),removed=[],winsAt=[];
  assert.equal(signatures(state).filter(x=>x.endsWith('|property|STOP')).length,expectedOrder.length+1);
  for(let i=0;i<solution.moves.length;i++){
   const [dx,dy]=directions[solution.moves[i]];
   assert.ok(Number.isInteger(dx)&&Number.isInteger(dy),'known move');
   const outcome=E.Turn.step(state,{dx,dy});
   assert.ok(outcome.moved,'blocked action '+(i+1));
   state=outcome.state;
   const left=signatures(state);
   assert.ok(left.includes('ice|EQ|property|STOP'),'perimeter ice stays blocked');
   for(const noun of expectedOrder){
    const alreadyRemoved=removed.find(r=>r.noun===noun);
    if(!alreadyRemoved&&!left.includes(noun+'|EQ|property|STOP')){
     removed.push({noun,atMove:i+1});
    }
   }
   if(outcome.won)winsAt.push(i+1);
  }
  assert.equal(state.status,'won');
  assert.deepEqual(winsAt,[solution.moves.length],'only final action wins');
  assert.deepEqual(removed.map(x=>x.noun),expectedOrder);
  assert.equal(removed.length,solution.events.length);
  for(let i=0;i<removed.length;i++){
   assert.equal(removed[i].atMove,solution.events[i].afterMove);
   assert.equal(removed[i].noun,solution.events[i].noun);
  }
  assert.equal(solution.count,solution.moves.length);
 });
}
test('시제품은 기존 60단계 게임 데이터와 진행 기록을 변경하지 않는다',()=>{
 const levels=ctx.RuleLabData.levels;
 assert.equal(levels.length,60);
 assert.ok(!levels.some(l=>l.chapter==='2차 설계 시제품'));
 const runtime=read('games/high_rule_lab/game.js');
 assert.match(runtime,/high_rule_lab:progress_v3/);
});

test('모든 60단계의 설계 목표가 현재 제목과 챕터에 대응하며 라이브 데이터는 그대로다',()=>{
 const proposal=JSON.parse(read('games/high_rule_lab/design-prototypes/stage-blueprints-v5.json'));
 assert.equal(proposal.version,'v5-planning-only');
 assert.equal(proposal.chapters.length,7);
 assert.equal(proposal.stages.length,60);
 proposal.stages.forEach((entry,i)=>{
  const source=ctx.RuleLabData.levels[i];
  assert.equal(entry.stage,i+1);
  assert.equal(entry.chapter,source.chapter);
  assert.equal(entry.currentTitle,source.title);
  assert.equal(entry.status,'proposed-not-implemented');
  assert.ok(entry.levelIntent.length>=12);
  assert.ok(Number.isInteger(entry.target.minimumMeaningfulRuleChanges));
 });
});
test('시제품은 모든 세로 관문을 ICE 장벽으로 막되 바뀌는 관문 한 칸을 구별한다',()=>{
 for(const [filename,barriers] of [
  ['return-route.json',[{x:6,gateType:'wall'}]],
  ['dual-gate.json',[{x:5,gateType:'wall'},{x:9,gateType:'door'}]]
 ]){
  const {level}=JSON.parse(read('games/high_rule_lab/design-prototypes/'+filename));
  for(const {x,gateType} of barriers){
   for(let y=0;y<level.h;y++){
    const gate=level.objects.find(e=>e.x===x&&e.y===y);
    assert.ok(gate,'continuous barrier '+filename+' '+x+','+y);
    assert.equal(gate.type,y===2?gateType:'ice','only the intended tile changes');
   }
  }
 }
});
