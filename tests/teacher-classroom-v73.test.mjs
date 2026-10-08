import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseOffTaskBehavior} from '../games/teacher-classroom-sim-prototype/student-ai.mjs';
import {
  createLessonFlow,lessonMinimumTimeRemaining,lessonTimePressure,
  tickLessonFlow,performLessonAction
} from '../games/teacher-classroom-sim-prototype/lesson-instruction.mjs';

test('seated distraction is more likely than roaming in ordinary lessons',()=>{
  assert.equal(chooseOffTaskBehavior({location:'classroom'},()=>.50),'fidget');
  assert.equal(chooseOffTaskBehavior({location:'classroom'},()=>.05),'wander');
  assert.equal(chooseOffTaskBehavior({location:'science',teamActivity:true},()=>.19),'wander');
  assert.equal(chooseOffTaskBehavior({location:'science',teamActivity:true},()=>.50),'fidget');
  assert.equal(chooseOffTaskBehavior({location:'gym'},()=>.50),'wander');
});

test('lesson time estimate falls through teaching, assigning, practice and recap',()=>{
  const flow=createLessonFlow(115);
  const initial=lessonMinimumTimeRemaining(flow);
  assert.ok(initial>flow.practiceSeconds+flow.recapSeconds);
  assert.equal(lessonTimePressure(flow,initial+10).urgent,false);
  assert.equal(lessonTimePressure(flow,initial-4).urgent,true);
  assert.equal(tickLessonFlow(flow,flow.explanationSeconds,{teacherAtBoard:true}),'explanation-complete');
  assert.equal(flow.phase,'assign');
  const afterExplain=lessonMinimumTimeRemaining(flow);
  assert.ok(afterExplain<initial);
  assert.equal(performLessonAction(flow,'assignWork'),true);
  assert.equal(tickLessonFlow(flow,flow.practiceSeconds),'practice-complete');
  assert.equal(flow.phase,'recapReady');
  const beforeRecap=lessonMinimumTimeRemaining(flow);
  assert.ok(beforeRecap<afterExplain);
  assert.equal(performLessonAction(flow,'startRecap'),true);
  assert.equal(tickLessonFlow(flow,flow.recapSeconds,{teacherAtBoard:true}),'recap-complete');
  assert.equal(lessonMinimumTimeRemaining(flow),0);
  assert.equal(lessonTimePressure(flow,0).urgent,false);
});

test('missing time to explain does not count as completing the lesson',()=>{
  const flow=createLessonFlow(110);
  tickLessonFlow(flow,55,{teacherAtBoard:false});
  assert.equal(flow.phase,'explain');
  assert.equal(flow.progress,0);
  assert.equal(lessonTimePressure(flow,15).urgent,true);
});
