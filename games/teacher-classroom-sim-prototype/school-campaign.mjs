export const CAMPAIGN_VERSION=1;
export const CAMPAIGN_DAYS=8;
export const EXAM_DAYS=Object.freeze([2,4,6,8]);
export const GRADE_ORDER=Object.freeze(['D','C','B','A','S']);
export const GRADE_THRESHOLDS=Object.freeze({D:0,C:38,B:52,A:66,S:82});

export const INITIAL_MASTERY=Object.freeze({
  minsu:35,
  jiwoo:50,
  seoyeon:54,
  taeho:30,
  junho:40,
  arin:52
});

export const LEARNING_RULES=Object.freeze({
  focusedPerSecond:.00395,
  focusHelpBonus:.18,
  offTaskMultiplier:.10,
  chatterMultiplier:.08,
  conflictMultiplier:.04,
  maxMastery:96,
  subjectWeights:Object.freeze({
    '수학':1,
    '국어':1,
    '체육':.35,
    '과학':1,
    '미술':.35,
    '컴퓨터':1
  })
});

export function createCampaignState(studentIds=Object.keys(INITIAL_MASTERY)){
  const mastery={};
  for(const id of studentIds)mastery[id]=INITIAL_MASTERY[id]??34;
  return {
    version:CAMPAIGN_VERSION,
    day:1,
    dayComplete:false,
    mastery,
    exams:[],
    baselineGrades:{},
    targetGrades:{},
    finalSuccess:null
  };
}

export function normalizeCampaignState(raw,studentIds=Object.keys(INITIAL_MASTERY)){
  if(!raw||raw.version!==CAMPAIGN_VERSION)return createCampaignState(studentIds);
  const next=createCampaignState(studentIds);
  next.day=Math.max(1,Math.min(CAMPAIGN_DAYS,Number(raw.day)||1));
  next.dayComplete=!!raw.dayComplete;
  for(const id of studentIds){
    const value=Number(raw.mastery?.[id]);
    if(Number.isFinite(value))next.mastery[id]=Math.max(0,Math.min(LEARNING_RULES.maxMastery,value));
  }
  next.exams=Array.isArray(raw.exams)?raw.exams.slice(0,4):[];
  next.baselineGrades={...(raw.baselineGrades||{})};
  next.targetGrades={...(raw.targetGrades||{})};
  next.finalSuccess=typeof raw.finalSuccess==='boolean'?raw.finalSuccess:null;
  return next;
}

export function examNumberForDay(day){
  const index=EXAM_DAYS.indexOf(Number(day));
  return index<0?0:index+1;
}

export function nextExamInfo(day){
  const current=Math.max(1,Math.min(CAMPAIGN_DAYS,Number(day)||1));
  const nextDay=EXAM_DAYS.find(d=>d>=current)??CAMPAIGN_DAYS;
  return {
    examNumber:EXAM_DAYS.indexOf(nextDay)+1,
    examDay:nextDay,
    daysAway:Math.max(0,nextDay-current)
  };
}

export function gradeForMastery(value){
  const score=Math.max(0,Number(value)||0);
  let grade='D';
  for(const g of GRADE_ORDER){
    if(score>=GRADE_THRESHOLDS[g])grade=g;
  }
  return grade;
}

export function gradeIndex(grade){
  return Math.max(0,GRADE_ORDER.indexOf(grade));
}

export function nextGrade(grade){
  const index=gradeIndex(grade);
  return GRADE_ORDER[Math.min(GRADE_ORDER.length-1,index+1)];
}

export function learningGain(dt,subject,{focused=true,chatting=false,conflict=false}={}){
  const seconds=Math.max(0,Number(dt)||0);
  const weight=LEARNING_RULES.subjectWeights[subject]??.5;
  let mult=focused?1:LEARNING_RULES.offTaskMultiplier;
  if(chatting)mult=Math.min(mult,LEARNING_RULES.chatterMultiplier);
  if(conflict)mult=Math.min(mult,LEARNING_RULES.conflictMultiplier);
  return seconds*LEARNING_RULES.focusedPerSecond*weight*mult;
}

export function addLearning(state,studentId,amount){
  if(!state?.mastery||!(studentId in state.mastery))return 0;
  const gain=Math.max(0,Number(amount)||0);
  state.mastery[studentId]=Math.min(
    LEARNING_RULES.maxMastery,
    Math.max(0,Number(state.mastery[studentId])||0)+gain
  );
  return state.mastery[studentId];
}

export function conductExam(state,profiles){
  const examNumber=examNumberForDay(state.day);
  if(!examNumber)return null;
  const rows=profiles.map(profile=>{
    const mastery=Number(state.mastery?.[profile.id])||0;
    return {
      id:profile.id,
      name:profile.name,
      mastery:Math.round(mastery*10)/10,
      grade:gradeForMastery(mastery)
    };
  });

  if(examNumber===1){
    for(const row of rows){
      state.baselineGrades[row.id]=row.grade;
      state.targetGrades[row.id]=nextGrade(row.grade);
    }
  }

  const reached=rows.filter(row=>{
    const target=state.targetGrades[row.id];
    return target&&gradeIndex(row.grade)>=gradeIndex(target);
  }).length;

  const result={
    examNumber,
    day:state.day,
    rows,
    reached,
    total:rows.length,
    success:examNumber===4?reached===rows.length:null
  };

  const oldIndex=state.exams.findIndex(x=>x?.examNumber===examNumber);
  if(oldIndex>=0)state.exams[oldIndex]=result;
  else state.exams.push(result);

  if(examNumber===4)state.finalSuccess=result.success;
  return result;
}

export function latestExam(state){
  return Array.isArray(state?.exams)&&state.exams.length?state.exams[state.exams.length-1]:null;
}

export function targetReachedCount(state){
  const exam=latestExam(state);
  if(!exam||!Object.keys(state.targetGrades||{}).length)return 0;
  return exam.rows.filter(row=>gradeIndex(row.grade)>=gradeIndex(state.targetGrades[row.id])).length;
}

export function campaignSucceeded(state){
  return state?.finalSuccess===true;
}
