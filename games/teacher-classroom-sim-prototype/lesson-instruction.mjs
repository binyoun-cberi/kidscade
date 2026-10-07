// Lesson delivery and student care compete for the same real-time classroom minutes.
export const TEACHING_RULES=Object.freeze({
  boardRadius:1.75,
  explanationFraction:.19,
  practiceFraction:.39,
  recapFraction:.12,
  minimumPracticeSeconds:31,
  learningEfficiency:Object.freeze({
    explainPresent:1,
    explainAway:.12,
    waitingAssignment:.12,
    practice:.66,
    practiceNearBoard:.72,
    waitingRecap:.23,
    recapPresent:1.08,
    recapAway:.12,
    completed:.53
  }),
  recapLearningBonus:.16,
  maxGroupFocusPerLesson:2
});
export const LESSON_PHASES=Object.freeze({
  explain:{label:'① 직접 설명',short:'설명'},
  assign:{label:'② 과제 제시',short:'과제 제시'},
  practice:{label:'② 자율·모둠활동',short:'활동'},
  recapReady:{label:'③ 정리 준비',short:'정리 준비'},
  recap:{label:'③ 수업 정리',short:'정리'},
  complete:{label:'수업 정리 완료',short:'완료'}
});
export function createLessonFlow(duration){
  const total=Math.max(60,Number(duration)||110);
  return {
    phase:'explain',progress:0,
    explanationSeconds:Math.round(total*TEACHING_RULES.explanationFraction),
    practiceSeconds:Math.max(TEACHING_RULES.minimumPracticeSeconds,Math.round(total*TEACHING_RULES.practiceFraction)),
    recapSeconds:Math.max(10,Math.round(total*TEACHING_RULES.recapFraction)),
    assigned:false,completed:false,
    explanationTime:0,awayDuringExplanation:0,practiceTime:0,recapTime:0
  };
}
export function lessonFlowAction(flow){
  if(!flow)return null;
  if(flow.phase==='assign')return {type:'assignWork',icon:'📝',label:'과제 내주기'};
  if(flow.phase==='recapReady')return {type:'startRecap',icon:'📖',label:'수업 정리하기'};
  return null;
}
export function performLessonAction(flow,type){
  if(!flow)return false;
  if(type==='assignWork'&&flow.phase==='assign'){
    flow.phase='practice';flow.progress=0;flow.assigned=true;return true;
  }
  if(type==='startRecap'&&flow.phase==='recapReady'){
    flow.phase='recap';flow.progress=0;return true;
  }
  return false;
}
export function tickLessonFlow(flow,dt,{teacherAtBoard=false}={}){
  if(!flow)return '';
  const seconds=Math.max(0,Number(dt)||0);
  if(flow.phase==='explain'){
    if(teacherAtBoard){
      flow.progress=Math.min(flow.explanationSeconds,flow.progress+seconds);
      flow.explanationTime+=seconds;
    }else{
      flow.awayDuringExplanation+=seconds;
    }
    if(flow.progress>=flow.explanationSeconds){
      flow.phase='assign';flow.progress=0;return 'explanation-complete';
    }
  }else if(flow.phase==='practice'){
    flow.progress=Math.min(flow.practiceSeconds,flow.progress+seconds);
    flow.practiceTime+=seconds;
    if(flow.progress>=flow.practiceSeconds){
      flow.phase='recapReady';flow.progress=0;return 'practice-complete';
    }
  }else if(flow.phase==='recap'){
    if(teacherAtBoard){
      flow.progress=Math.min(flow.recapSeconds,flow.progress+seconds);
      flow.recapTime+=seconds;
    }
    if(flow.progress>=flow.recapSeconds){
      flow.phase='complete';flow.completed=true;return 'recap-complete';
    }
  }
  return '';
}
export function lessonTeachingEfficiency(flow,{teacherAtBoard=false}={}){
  const v=TEACHING_RULES.learningEfficiency;
  if(!flow)return 0;
  switch(flow.phase){
    case 'explain':return teacherAtBoard?v.explainPresent:v.explainAway;
    case 'assign':return v.waitingAssignment;
    case 'practice':return teacherAtBoard?v.practiceNearBoard:v.practice;
    case 'recapReady':return v.waitingRecap;
    case 'recap':return teacherAtBoard?v.recapPresent:v.recapAway;
    case 'complete':return v.completed;
    default:return 0;
  }
}
export function lessonFlowProgress(flow){
  if(!flow)return 0;
  if(flow.phase==='complete')return 1;
  if(flow.phase==='explain')return Math.min(1,flow.progress/flow.explanationSeconds);
  if(flow.phase==='practice')return Math.min(1,flow.progress/flow.practiceSeconds);
  if(flow.phase==='recap')return Math.min(1,flow.progress/flow.recapSeconds);
  return 1;
}
