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
 const node={id:'t'+(++seq),type};
 if(body)node.body=body;if(elseBody)node.elseBody=elseBody;
 return node;
}
async function runVisible(index,program,functionProgram=[]){
 return CodeQuestValidator.runCase(program,functionProgram,CodeQuestData.missions[index],{id:'visible',name:'현재 구역'});
}

test('code quest runtime counts main and function nodes together',()=>{
 seq=0;
 const main=[n('REP3',[n('CALL_FN')])];
 const fn=[n('FWD'),n('FWD'),n('IF_ENEMY',[n('ATTACK')]),n('FWD'),n('FWD')];
 assert.equal(CodeQuestRuntime.countNodes(main),2);
 assert.equal(CodeQuestRuntime.countNodes(fn),6);
 assert.equal(CodeQuestRuntime.countProgramNodes(main,fn),8);
});

test('mission 6 generalized enemy-sensor code passes shifted enemy layouts',async()=>{
 seq=0;
 const step=n('IF_ENEMY',[n('ATTACK')]);
 const program=[n('REP3',[n('REP3',[step,n('FWD')])])];
 const mission=CodeQuestData.missions[5];
 const visible=await runVisible(5,program);
 assert.equal(visible.ok,true);
 const report=await CodeQuestValidator.validate({mission,program,functionProgram:[],visibleTrace:visible.trace,visibleSummary:visible.summary});
 assert.equal(report.ok,true);
 assert.equal(report.results.length,2);
 assert.ok(report.results.every(r=>r.ok));
 assert.ok(report.results.some(r=>r.trace.some(e=>e.kind==='check'&&e.type==='IF_ENEMY'&&e.result===true)));
 assert.ok(report.results.some(r=>r.trace.some(e=>e.kind==='check'&&e.type==='IF_ENEMY'&&e.result===false)));
});

test('mission 6 layout-memorized code is rejected by hidden layouts',async()=>{
 seq=0;
 const program=[
  n('REP2',[n('FWD')]),n('ATTACK'),
  n('REP4',[n('FWD')]),n('ATTACK'),
  n('REP3',[n('FWD')])
 ];
 const mission=CodeQuestData.missions[5];
 const visible=await runVisible(5,program);
 assert.equal(visible.ok,true);
 const report=await CodeQuestValidator.validate({mission,program,functionProgram:[],visibleTrace:visible.trace,visibleSummary:visible.summary});
 assert.equal(report.ok,false);
 assert.ok(report.results.some(r=>!r.ok)||report.concept.ok===false);
});

test('mission 7 generalized gap sensor survives shifted cliffs',async()=>{
 seq=0;
 const branch=n('IF_GAP',[n('JUMP')],[n('FWD')]);
 const program=[n('REP3',[n('REP3',[branch])])];
 const mission=CodeQuestData.missions[6];
 const visible=await runVisible(6,program);
 assert.equal(visible.ok,true);
 const report=await CodeQuestValidator.validate({mission,program,functionProgram:[],visibleTrace:visible.trace,visibleSummary:visible.summary});
 assert.equal(report.ok,true);
 assert.ok(report.results.every(r=>r.ok));
});

test('mission 9 requires real reusable function calls and scores total size',async()=>{
 seq=0;
 const fn=[n('FWD'),n('FWD'),n('IF_ENEMY',[n('ATTACK')]),n('FWD'),n('FWD')];
 const program=[n('REP3',[n('CALL_FN')])];
 const mission=CodeQuestData.missions[8];
 const visible=await runVisible(8,program,fn);
 assert.equal(visible.ok,true);
 assert.equal(visible.summary.calls,3);
 const report=await CodeQuestValidator.validate({mission,program,functionProgram:fn,visibleTrace:visible.trace,visibleSummary:visible.summary});
 assert.equal(report.ok,true);
 assert.equal(report.metrics.totalNodes,8);
 assert.equal(report.metrics.calls,3);
});

test('mission 12 state-aware program passes changed spore timing',async()=>{
 seq=0;
 const step=[
  n('IF_WINDUP',[n('DODGE')]),
  n('REP2',[n('IF_ENEMY',[n('ATTACK')])]),
  n('FWD')
 ];
 const program=[n('REP4',[n('REP4',[n('REP2',step)])])];
 const mission=CodeQuestData.missions[11];
 const visible=await runVisible(11,program);
 assert.equal(visible.ok,true);
 const report=await CodeQuestValidator.validate({mission,program,functionProgram:[],visibleTrace:visible.trace,visibleSummary:visible.summary});
 assert.equal(report.ok,true);
 assert.equal(report.results[0].ok,true);
 assert.ok(visible.summary.conditions.IF_WINDUP.trueCount>0);
});

test('mission 15 boss program passes alternate BUGCAP phase',async()=>{
 seq=0;
 const step=[
  n('IF_WINDUP',[n('DODGE')]),
  n('IF_ENEMY',[n('ATTACK')],[n('FWD')])
 ];
 const program=[n('REP4',[n('REP4',[n('REP2',step)])])];
 const mission=CodeQuestData.missions[14];
 const visible=await runVisible(14,program);
 assert.equal(visible.ok,true);
 const report=await CodeQuestValidator.validate({mission,program,functionProgram:[],visibleTrace:visible.trace,visibleSummary:visible.summary});
 assert.equal(report.ok,true);
 assert.equal(report.results[0].ok,true);
});
