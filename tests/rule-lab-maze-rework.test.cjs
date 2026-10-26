const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..','games','high_rule_lab');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function setup(extra=[]){
 const w={};w.window=w;
 for(const file of ['levels.js','engine/state.js','engine/rules.js','engine/movement.js','engine/interactions.js','engine/turn.js','engine/validator.js',...extra])vm.runInNewContext(read(file),w);
 return {levels:w.RuleLabData.levels,DATA:w.RuleLabData,E:w.RuleLabEngine};
}
test('60개의 기존 규칙 퍼즐을 유지하면서 53개를 통로와 방 중심으로 개선',()=>{
 const {levels,DATA,E}=setup();
 const audit=E.Validator.auditLayouts(levels);
 assert.equal(levels.length,60);
 assert.equal(levels.filter(l=>l.mazeReworked).length,53);
 assert.ok(audit.uniqueWallLayouts>=55,'벽 구조 반복이 여전히 많음: '+audit.uniqueWallLayouts);
 assert.ok(audit.upperReachable>=55);
 assert.ok(audit.lowerReachable>=55);
 assert.ok(audit.meanBranches>=50);
 assert.equal(audit.details.filter(d=>d.wordAccess===0).length,0);
 const valid=E.Validator.validateAll(levels,DATA);
 assert.equal(valid.errors.length,0,valid.errors.slice(0,3).join(' / '));
 assert.equal(valid.warnings.length,0,valid.warnings.slice(0,3).join(' / '));
 for(const l of levels){
  const coords=[...l.objects,...l.words].map(e=>e.x+','+e.y);
  assert.equal(new Set(coords).size,coords.length,'objects cannot overlap at start: '+l.title);
 }
});
test('실험실의 옛 절단 통로에 진입로와 반드시 꺾어야 하는 구간이 생김',()=>{
 const {levels}=setup();
 for(const stage of [2,4,5,6,16,27,36,42,45,47,53,60]){
  const l=levels[stage-1];
  assert.ok(!l.objects.some(e=>e.type==='wall'&&e.x===2&&e.y===4),'north entry '+stage);
  assert.ok(!l.objects.some(e=>e.type==='wall'&&e.x===4&&e.y===4),'north exit '+stage);
  const centre=l.objects.filter(e=>e.x===3&&e.y===5);
  assert.equal(centre.length,1,'one existing obstacle at the entry '+stage);
  assert.ok(centre[0].type==='wall'||centre[0].type==='fire'||centre[0].type==='rock'||centre[0].type==='key',
   'protect authored puzzle object instead of overwriting it '+stage);
 }
});
test('메인 플레이에서 해결 가능한 퍼즐을 차단하지 않는지 실제 턴 엔진으로 경로 확인',()=>{
 const {levels,E}=setup();
 const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
 function solve(n,maxStates){
  const first=E.State.fromLevel(levels[n-1]),queue=[{state:first,depth:0}],seen=new Set();
  const key=state=>state.entities.map(e=>e.id+':'+e.x+','+e.y+','+(e.type||e.token)).join('|');
  seen.add(key(first));
  for(let i=0;i<queue.length&&i<maxStates;i++){
   const {state,depth}=queue[i];
   for(const [dx,dy] of dirs){
    const next=E.Turn.step(state,{dx,dy});
    if(!next.moved)continue;
    if(next.won)return depth+1;
    const k=key(next.state);
    if(!seen.has(k)){seen.add(k);queue.push({state:next.state,depth:depth+1})}
   }
  }
  return null;
 }
 // Representative mechanics: push, disable property, sentence workshop,
 // and object transformation. This does NOT claim to solve all 60 stages.
 for(const n of [1,2,3,4,5,6,7,10,16,27]){
  const count=solve(n,6500);
  assert.ok(Number.isInteger(count)&&count>0,'stage '+n+' has no solution within search budget');
 }
});
