export const AI_RULES=Object.freeze({
  focusDrainPerSecond:.55,
  focusOffTaskRatio:.10,
  focusReturnRatio:.55,
  teacherNearDistance:2.35,
  teacherRecoveryMultiplier:2.35,
  focusHelpRatio:.30,
  focusGrowthPerHelp:.45,
  maxFocus:100,
  maxConcurrentSocialPairs:2,
  maxConcurrentConflicts:1,
  maxFightsPerRecess:1,
  socialInteractionSeconds:[5,9],
  socialDrainPerSecond:1.9,
  conflictSeconds:7,
  fightSeconds:7,
  conflictCooldownSeconds:8,
  separatedCooldownSeconds:11,
  teacherConflictSuppression:.18
});

export const STUDENT_PROFILES=Object.freeze([
  {id:'minsu',name:'민수',focusMax:46,focusRecovery:7.0,socialMax:58,socialRecovery:5.6,hair:'hairT'},
  {id:'jiwoo',name:'지우',focusMax:68,focusRecovery:4.8,socialMax:62,socialRecovery:5.0,hair:'hairvariant'},
  {id:'seoyeon',name:'서연',focusMax:88,focusRecovery:2.8,socialMax:72,socialRecovery:4.4,hair:'hairtail'},
  {id:'taeho',name:'태호',focusMax:52,focusRecovery:6.6,socialMax:42,socialRecovery:7.2,hair:'hairone'},
  {id:'junho',name:'준호',focusMax:74,focusRecovery:4.0,socialMax:48,socialRecovery:3.6,hair:'hairvariant.001'},
  {id:'arin',name:'아린',focusMax:92,focusRecovery:6.4,socialMax:86,socialRecovery:7.0,hair:'hairtailknight'}
]);

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function createStudentRuntime(profile){
  return {
    ...profile,
    focus:profile.focusMax,
    social:profile.socialMax,
    mode:'focused',
    cooldown:0,
    offTaskCount:0,
    helps:0
  };
}

export function resetFocusForLesson(student){
  student.focus=student.focusMax;
  student.mode='focused';
  student.cooldown=0;
  student.offTaskCount=0;
}

export function updateLessonFocus(student,dt,{teacherNear=false}={}){
  if(student.mode==='focused'){
    student.focus=Math.max(0,student.focus-AI_RULES.focusDrainPerSecond*dt);
    if(student.focus<=student.focusMax*AI_RULES.focusOffTaskRatio){
      student.mode='offtask';
      student.offTaskCount++;
      return 'offtask-start';
    }
    return '';
  }
  const mult=teacherNear?AI_RULES.teacherRecoveryMultiplier:1;
  student.focus=Math.min(student.focusMax,student.focus+student.focusRecovery*mult*dt);
  if(student.focus>=student.focusMax*AI_RULES.focusReturnRatio){
    student.mode='focused';
    return 'focused-return';
  }
  return '';
}

export function helpFocus(student){
  const before=student.focus;
  student.focus=Math.min(student.focusMax,student.focus+student.focusMax*AI_RULES.focusHelpRatio);
  student.focusMax=Math.min(AI_RULES.maxFocus,student.focusMax+AI_RULES.focusGrowthPerHelp);
  student.helps++;
  if(student.focus>=student.focusMax*.34)student.mode='focused';
  return student.focus-before;
}

export function resetSocialForRecess(student){
  student.social=student.socialMax;
  student.cooldown=0;
}

export function recoverSocial(student,dt,mult=1){
  student.social=Math.min(student.socialMax,student.social+student.socialRecovery*mult*dt);
  student.cooldown=Math.max(0,student.cooldown-dt);
}

export function drainSocial(student,dt,mult=1){
  student.social=Math.max(0,student.social-AI_RULES.socialDrainPerSecond*mult*dt);
}

export function conflictProbability(a,b,{teacherNear=false,relationActive=false}={}){
  if(relationActive)return teacherNear ? .18 : 1;
  const ar=a.social/Math.max(1,a.socialMax);
  const br=b.social/Math.max(1,b.socialMax);
  const lowA=ar<.25,lowB=br<.25;
  const midA=ar<.45,midB=br<.45;
  let p=.01;
  if(lowA&&lowB)p=.42;
  else if(lowA||lowB)p=.23;
  else if(midA||midB)p=.08;
  if(teacherNear)p*=AI_RULES.teacherConflictSuppression;
  return clamp(p,0,1);
}
