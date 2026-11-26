export const SUBJECTS=['수학','국어','체육','과학','미술','컴퓨터'];
const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
export const DAY_BRIEFS=[
  ['서로 알아가는 날','학생들의 좋아하는 과목과 도움이 필요한 순간을 살펴보세요.'],
  ['첫 성장 확인','시험은 현재 위치를 알려줘요. 시작할 때 정한 목표는 바뀌지 않아요.'],
  ['어제의 친구, 오늘의 모둠','친해진 친구와 풀리지 않은 갈등을 관찰하세요.'],
  ['다른 방법으로 설명하기','질문한 학생에게 힌트와 예시 중 맞는 도움을 골라보세요.'],
  ['작은 성공 쌓기','어려워하는 학생에게 과제를 작게 나누어 주세요.'],
  ['함께 배우는 교실','친한 친구의 협력과 장난을 구별해 살펴보세요.'],
  ['마지막 연습','학생 기록에서 아직 도움이 필요한 과목을 확인하세요.'],
  ['우리 반의 변화','점수와 함께 여덟 날 동안 쌓인 관계와 지도 기록을 돌아보세요.']
];
export function dayBrief(day){const [title,hint]=DAY_BRIEFS[limit(day-1,0,7)];return {title,hint};}
export function normalizeMemory(raw={}){
  raw=raw&&typeof raw==='object'?raw:{};
  return {focusGrowth:limit(Number(raw.focusGrowth)||0,0,57),trust:limit(Number(raw.trust)||0,0,20),
    notes:Array.isArray(raw.notes)?raw.notes.filter(n=>n&&typeof n.text==='string').slice(-5).map(n=>({day:limit(Number(n.day)||1,1,8),text:n.text.slice(0,100)})):[]};
}
export function remember(state,id,day,text){
  const m=state.studentMemory[id]=normalizeMemory(state.studentMemory[id]);
  if(m.notes.at(-1)?.text!==text||m.notes.at(-1)?.day!==day)m.notes.push({day,text});
  m.notes=m.notes.slice(-5);return m;
}
export function careNeed(student,subject,preference='neutral'){
  if(student.health?.revealed&&student.health.state!=='healthy')return {id:'health',label:'몸이 불편해요',hint:'건강을 먼저 확인해 주세요.'};
  if(student.questionActive)return {id:preference==='dislike'?'confused':'curious',label:preference==='dislike'?'어디서 시작할지 모르겠어요':'이 방법도 될까요?',hint:preference==='dislike'?'첫 단계를 함께 풀면 도움이 돼요.':'스스로 생각할 단서를 기다리고 있어요.'};
  if(student.runtime.mode==='offtask')return preference==='dislike'
    ?{id:'confused',label:'문제가 어렵게 느껴져요',hint:'과제를 나누거나 예시를 보여주세요.'}
    :{id:'tired',label:'잠깐 집중이 흐트러졌어요',hint:'짧은 격려로 다시 시작할 수 있어요.'};
  return {id:'ready',label:'차근차근 배우고 있어요',hint:subject+' 활동에 참여 중이에요.'};
}
export const CARE_CHOICES=[
  {id:'encourage',label:'짧게 격려하기',hint:'집중 회복을 크게 돕고, 생각할 기회를 남겨요.'},
  {id:'hint',label:'첫 단계 힌트 주기',hint:'막힌 부분의 단서만 주어 스스로 풀게 해요.'},
  {id:'example',label:'예시로 함께 풀기',hint:'헷갈리는 내용을 구체적으로 다시 설명해요.'}
];
export function careOutcome(need,choice){
  const matched=(need==='tired'&&choice==='encourage')||(need==='curious'&&choice==='hint')||(need==='confused'&&choice==='example');
  return {focusRatio:choice==='encourage'?.42:.25,learning:matched?.20:.08,trust:matched?2:1,
    message:matched?'필요에 맞는 도움을 받았어요.':'다시 시작할 힘을 얻었어요. 다음에는 학생의 말을 살펴보세요.'};
}
export function attentionItems(students,{present=()=>true,pairs=[]}={}){
  return students.filter(present).map(s=>{
    const pair=pairs.find(p=>(p.a===s||p.b===s)&&(p.state==='fight'||p.state==='conflict'));
    if(s.accident)return {student:s,priority:6,label:'사고 확인',tone:'danger'};
    if(s.health?.revealed&&!s.health.checked&&s.health.state!=='healthy')return {student:s,priority:5,label:'건강 확인',tone:'danger'};
    if(pair)return {student:s,priority:pair.state==='fight'?6:4,label:pair.state==='fight'?'싸움 멈추기':'갈등 살피기',tone:'danger'};
    if(s.safetyRecord?.finished&&!s.safetyRecord.heard)return {student:s,priority:3,label:'안전수칙 확인',tone:'warning'};
    if(s.questionActive)return {student:s,priority:2,label:'질문 있어요',tone:'question'};
    if(s.runtime.mode==='offtask')return {student:s,priority:1,label:'집중 돕기',tone:'warning'};
    return null;
  }).filter(Boolean).sort((a,b)=>b.priority-a.priority);
}
