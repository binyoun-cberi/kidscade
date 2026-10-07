export const SUBJECT_PREFERENCES=Object.freeze({
  minsu:{'수학':'neutral','국어':'dislike','체육':'like','과학':'neutral','미술':'like','컴퓨터':'like'},
  jiwoo:{'수학':'like','국어':'like','체육':'neutral','과학':'like','미술':'neutral','컴퓨터':'neutral'},
  seoyeon:{'수학':'like','국어':'like','체육':'dislike','과학':'neutral','미술':'like','컴퓨터':'neutral'},
  taeho:{'수학':'neutral','국어':'dislike','체육':'like','과학':'dislike','미술':'neutral','컴퓨터':'like'},
  junho:{'수학':'dislike','국어':'neutral','체육':'like','과학':'neutral','미술':'dislike','컴퓨터':'like'},
  arin:{'수학':'like','국어':'neutral','체육':'neutral','과학':'like','미술':'like','컴퓨터':'dislike'},
  haeun:{'수학':'neutral','국어':'like','체육':'dislike','과학':'neutral','미술':'like','컴퓨터':'neutral'},
  doyun:{'수학':'like','국어':'dislike','체육':'like','과학':'neutral','미술':'neutral','컴퓨터':'like'},
  yuna:{'수학':'like','국어':'like','체육':'neutral','과학':'like','미술':'neutral','컴퓨터':'neutral'},
  jisung:{'수학':'dislike','국어':'neutral','체육':'like','과학':'neutral','미술':'like','컴퓨터':'like'},
  soeun:{'수학':'neutral','국어':'like','체육':'like','과학':'neutral','미술':'like','컴퓨터':'dislike'},
  hyunwoo:{'수학':'like','국어':'neutral','체육':'like','과학':'dislike','미술':'neutral','컴퓨터':'like'},
  sua:{'수학':'like','국어':'like','체육':'dislike','과학':'like','미술':'like','컴퓨터':'neutral'},
  eunho:{'수학':'neutral','국어':'dislike','체육':'like','과학':'neutral','미술':'like','컴퓨터':'neutral'},
  narin:{'수학':'neutral','국어':'like','체육':'neutral','과학':'like','미술':'like','컴퓨터':'dislike'}
});

export const PREFERENCE_RULES=Object.freeze({
  like:.8,
  neutral:1,
  dislike:1.2
});

export const HEALTH_RULES=Object.freeze({
  maxSickStudents:3,
  sickChance:.10,
  severeShare:.28,
  sickRecoveryMultiplier:.58,
  mildRecoveryMultiplier:.76,
  nurseAwayChance:.13,
  parentUnavailableChance:.34,
  symptomRevealMinSeconds:24,
  symptomRevealMaxSeconds:72
});

export const SAFETY_RULES=Object.freeze({
  briefingStartSeconds:34,
  briefingDurationSeconds:18,
  attentionRatioNeeded:.68,
  distractedFocusRatio:.62,
  unsafeAccidentPerSecond:.0035,
  maxAccidentsPerLesson:1
});

export const GROUP_RULES=Object.freeze({
  socialDrainMultiplier:.12,
  conflictCheckEverySeconds:12,
  unresolvedConflictChance:1,
  tiredConflictChanceMultiplier:.2
});

export const FRIENDSHIP_RULES=Object.freeze({
  maxLevel:5,
  levelThresholds:[0,1,2.5,4,6.5,9],
  peacefulInteractionGain:1,
  teamInteractionGain:.45,
  lessonChatterGain:.20,
  chatterMinLevel:3,
  chatterDistance:2.75,
  chatterFocusRatio:.45,
  chatterCheckSeconds:1.6,
  chatterDurationSeconds:[4,6.5],
  chatterCooldownSeconds:16,
  chatterChanceByLevel:[0,0,0,.08,.13,.18],
  conflictDurationByLevel:[1,.94,.86,.76,.66,.56],
  selfReconcileChanceByLevel:[0,.03,.08,.18,.30,.42]
});

export function friendshipKey(aId,bId){
  return [aId,bId].sort().join('|');
}

export function friendshipLevel(score=0){
  let level=0;
  for(let i=1;i<FRIENDSHIP_RULES.levelThresholds.length;i++){
    if(score>=FRIENDSHIP_RULES.levelThresholds[i])level=i;
  }
  return Math.min(FRIENDSHIP_RULES.maxLevel,level);
}

export function addFriendship(friendships,aId,bId,amount=1){
  const key=friendshipKey(aId,bId);
  const next=Math.max(0,(friendships.get(key)||0)+amount);
  friendships.set(key,next);
  return {key,score:next,level:friendshipLevel(next)};
}

export function friendshipInfo(friendships,aId,bId){
  const key=friendshipKey(aId,bId);
  const score=friendships.get(key)||0;
  return {key,score,level:friendshipLevel(score)};
}

export function friendshipConflictDuration(baseSeconds,level){
  const factor=FRIENDSHIP_RULES.conflictDurationByLevel[Math.max(0,Math.min(FRIENDSHIP_RULES.maxLevel,level))]||1;
  return baseSeconds*factor;
}

export function friendshipSelfReconcileChance(level){
  return FRIENDSHIP_RULES.selfReconcileChanceByLevel[Math.max(0,Math.min(FRIENDSHIP_RULES.maxLevel,level))]||0;
}

export function friendshipChatterChance(level){
  return FRIENDSHIP_RULES.chatterChanceByLevel[Math.max(0,Math.min(FRIENDSHIP_RULES.maxLevel,level))]||0;
}

export const HEALTH_STATES=Object.freeze({
  healthy:{id:'healthy',label:'괜찮음',icon:'🙂',recoveryMultiplier:1},
  mild:{id:'mild',label:'몸이 안 좋아 보여요',icon:'🤒',recoveryMultiplier:HEALTH_RULES.mildRecoveryMultiplier},
  sick:{id:'sick',label:'많이 아파 보여요',icon:'🤒',recoveryMultiplier:HEALTH_RULES.sickRecoveryMultiplier}
});

const SYMPTOMS=Object.freeze([
  {id:'headache',label:'머리가 아프대요'},
  {id:'stomach',label:'배가 아프대요'},
  {id:'dizzy',label:'어지럽대요'},
  {id:'feverish',label:'열이 나는 것 같아요'}
]);

export function preferenceFor(studentId,subject){
  return SUBJECT_PREFERENCES[studentId]?.[subject] || 'neutral';
}

export function preferenceMultiplier(studentId,subject){
  return PREFERENCE_RULES[preferenceFor(studentId,subject)] || 1;
}

export function preferenceIcon(pref){
  return pref==='like'?'👍':pref==='dislike'?'👎':'•';
}

export function createDailyEnvironment(rng=Math.random){
  return {nurseAvailable:rng()>=HEALTH_RULES.nurseAwayChance};
}

export function createDailyHealth(profiles,rng=Math.random){
  const rolled=profiles
    .map((p,index)=>({p,index,roll:rng()}))
    .filter(x=>x.roll<HEALTH_RULES.sickChance)
    .sort((a,b)=>a.roll-b.roll)
    .slice(0,HEALTH_RULES.maxSickStudents);
  const sickIds=new Set(rolled.map(x=>x.p.id));
  return profiles.map(p=>{
    if(!sickIds.has(p.id)){
      return {
        state:'healthy',symptom:null,revealed:false,checked:false,
        parentAvailable:true,dismissed:false,awayUntilPeriod:0,resting:false,
        symptomTimer:Infinity
      };
    }
    const severe=rng()<HEALTH_RULES.severeShare;
    const symptom=SYMPTOMS[(rng()*SYMPTOMS.length)|0] || SYMPTOMS[0];
    return {
      state:severe?'sick':'mild',
      symptom,
      revealed:false,
      checked:false,
      parentAvailable:rng()>=HEALTH_RULES.parentUnavailableChance,
      dismissed:false,
      awayUntilPeriod:0,
      resting:false,
      symptomTimer:HEALTH_RULES.symptomRevealMinSeconds+rng()*(HEALTH_RULES.symptomRevealMaxSeconds-HEALTH_RULES.symptomRevealMinSeconds)
    };
  });
}

export function healthRecoveryMultiplier(health){
  return HEALTH_STATES[health?.state]?.recoveryMultiplier || 1;
}

export function tickHealth(health,dt,{active=true}={}){
  if(!health||health.state==='healthy'||health.revealed||health.dismissed||!active)return false;
  health.symptomTimer=Math.max(0,health.symptomTimer-dt);
  if(health.symptomTimer<=0){
    health.revealed=true;
    return true;
  }
  return false;
}

export function nextHealthAction(health,environment,currentPeriod){
  if(!health||health.state==='healthy')return {type:'none'};
  if(health.state==='sick'&&health.parentAvailable){
    return {type:'dismiss',label:'보호자 연락 · 조퇴',icon:'🏠'};
  }
  if(environment?.nurseAvailable){
    return {type:'nurse',label:'보건실 보내기',icon:'🏥',awayUntilPeriod:(currentPeriod||1)+1};
  }
  if(health.parentAvailable){
    return {type:'dismiss',label:'보호자 연락 · 조퇴',icon:'🏠'};
  }
  return {type:'rest',label:'조용한 곳에서 쉬기',icon:'🛋️'};
}

export function beginSafetyRecord(student,period){
  student.safetyRecord={period,elapsed:0,attention:0,heard:false,finished:false};
  return student.safetyRecord;
}

export function tickSafetyRecord(student,dt,{lessonElapsed,focusRatio,blocked=false}={}){
  const rec=student?.safetyRecord;
  if(!rec||rec.finished)return '';
  const start=SAFETY_RULES.briefingStartSeconds;
  const end=start+SAFETY_RULES.briefingDurationSeconds;
  if(lessonElapsed<start)return '';
  if(lessonElapsed>=end){
    rec.finished=true;
    rec.heard=rec.attention>=SAFETY_RULES.briefingDurationSeconds*SAFETY_RULES.attentionRatioNeeded;
    return rec.heard?'safety-heard':'safety-missed';
  }
  rec.elapsed+=dt;
  if(!blocked&&focusRatio>=SAFETY_RULES.distractedFocusRatio){
    rec.attention+=dt;
  }
  return '';
}

export function unsafeAccidentChance(dt,{safetyHeard=true,focusRatio=1}={}){
  if(safetyHeard)return 0;
  const focusFactor=focusRatio<.25?1.45:focusRatio<.5?1.15:1;
  return Math.min(.08,SAFETY_RULES.unsafeAccidentPerSecond*focusFactor*dt);
}

export function buildPairs(students,rng=Math.random){
  const active=students.filter(Boolean).slice();
  for(let i=active.length-1;i>0;i--){
    const j=(rng()*(i+1))|0;
    [active[i],active[j]]=[active[j],active[i]];
  }
  const pairs=[];
  for(let i=0;i<active.length;i+=2)if(active[i+1])pairs.push([active[i],active[i+1]]);
  return pairs;
}
