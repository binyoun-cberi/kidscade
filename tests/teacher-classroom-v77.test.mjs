import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignState,normalizeCampaignState,conductExam,addLearning,INITIAL_MASTERY} from '../games/teacher-classroom-sim-prototype/school-campaign.mjs';
import {STUDENT_PROFILES,createStudentRuntime,helpFocus} from '../games/teacher-classroom-sim-prototype/student-ai.mjs';
import {remember,normalizeMemory,careNeed,careOutcome,attentionItems,SUBJECTS} from '../games/teacher-classroom-sim-prototype/student-care.mjs';
const profiles=STUDENT_PROFILES;
test('good early teaching never raises the fixed personal exam target',()=>{
  const state=createCampaignState();const goals={...state.targetGrades};
  state.day=2;state.mastery.minsu=38;conductExam(state,profiles);
  assert.equal(state.targetGrades.minsu,'C');assert.deepEqual(state.targetGrades,goals);
  state.day=8;for(const p of profiles)state.mastery[p.id]=96;
  assert.equal(conductExam(state,profiles).success,true);
});
test('legacy saves retain earned mastery, existing exam goals, and gain subject records',()=>{
  const state=normalizeCampaignState({version:2,day:4,mastery:{minsu:51},baselineGrades:{minsu:'C'},targetGrades:{minsu:'B'}});
  assert.equal(state.mastery.minsu,51);assert.equal(state.targetGrades.minsu,'B');
  for(const subject of SUBJECTS)assert.equal(state.subjectMastery.minsu[subject],51);
});
test('eight day save/reload preserves relationships, focus growth, trust and bounded notes',()=>{
  let state=createCampaignState();
  const runtime=createStudentRuntime(profiles[0]);helpFocus(runtime);
  state.studentMemory.minsu.focusGrowth=runtime.focusMax-profiles[0].focusMax;
  state.friendships=[['jiwoo|minsu',4]];state.unresolvedRelations=['minsu|taeho'];
  for(let day=1;day<=8;day++){
    state.day=day;remember(state,'minsu',day,'함께 다시 풀었어요 '+day);state.studentMemory.minsu.trust++;
    state=normalizeCampaignState(JSON.parse(JSON.stringify(state)));
  }
  assert.equal(state.studentMemory.minsu.notes.length,5);
  assert.equal(state.studentMemory.minsu.notes.at(-1).day,8);
  assert.equal(state.studentMemory.minsu.trust,8);
  assert.ok(state.studentMemory.minsu.focusGrowth>0);
  assert.deepEqual(state.friendships,[['jiwoo|minsu',4]]);
  assert.deepEqual(state.unresolvedRelations,['minsu|taeho']);
});
test('malformed relationship and memory data cannot poison the next school day',()=>{
  const state=createCampaignState();state.friendships=[null,['missing|minsu',4],['minsu|minsu',5],['jiwoo|minsu',Infinity]];
  state.unresolvedRelations=[null,'missing|minsu','minsu|minsu'];state.studentMemory.minsu={focusGrowth:999,notes:[null,{text:'x'.repeat(500)}]};
  const clean=normalizeCampaignState(state);
  assert.deepEqual(clean.friendships,[]);assert.deepEqual(clean.unresolvedRelations,[]);
  assert.equal(clean.studentMemory.minsu.focusGrowth,57);assert.equal(clean.studentMemory.minsu.notes[0].text.length,100);
  assert.equal(normalizeMemory({trust:-5}).trust,0);assert.equal(normalizeMemory(null).trust,0);
});
test('subject growth changes only the taught subject while aggregate progress remains compatible',()=>{
  const state=createCampaignState();addLearning(state,'minsu',.2,'수학');
  assert.equal(state.subjectMastery.minsu['수학'],INITIAL_MASTERY.minsu+.2);
  assert.equal(state.subjectMastery.minsu['국어'],INITIAL_MASTERY.minsu);
  assert.equal(state.mastery.minsu,INITIAL_MASTERY.minsu+.2);
});
test('student words distinguish fatigue and confusion, and tailored help is more effective',()=>{
  const s={runtime:{mode:'offtask'}};
  assert.equal(careNeed(s,'수학','dislike').id,'confused');
  assert.equal(careNeed(s,'수학','like').id,'tired');
  s.questionActive=true;assert.equal(careNeed(s,'수학','like').id,'curious');
  assert.ok(careOutcome('confused','example').learning>careOutcome('confused','encourage').learning);
  assert.ok(careOutcome('curious','hint').learning>careOutcome('curious','example').learning);
  assert.ok(careOutcome('tired','encourage').focusRatio>careOutcome('tired','example').focusRatio);
});
test('care queue prioritizes safety and health over distraction and excludes absent pupils',()=>{
  const a={runtime:{id:'a',mode:'offtask'}},b={runtime:{id:'b'},questionActive:true},c={runtime:{id:'c'},accident:{}},d={runtime:{id:'d'},health:{revealed:true,state:'sick'}};
  assert.deepEqual(attentionItems([a,b,c,d],{present:s=>s!==d}).map(x=>x.student.runtime.id),['c','b','a']);
});
