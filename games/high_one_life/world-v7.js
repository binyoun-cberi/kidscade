/* One Life v7 — individual potential, education credentials and household resources.
 * Educational simulation only: this is not psychometrics, national Gini data,
 * occupational licensing law, or a projection of any child's future.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeWorld3,root?.OneLifeWorld4,root?.OneLifeWorld6,root?.OneLifeCareers6);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeWorld7=api;
})(typeof window!=='undefined'?window:null,function(Sim,W3,W4,W6,Careers){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const SKILLS=Object.freeze([
  {key:'language',name:'언어·표현'},
  {key:'logic',name:'논리·탐구'},
  {key:'physical',name:'신체·운동'},
  {key:'creative',name:'창작·예술'},
  {key:'social',name:'사회·관계'}
 ]);
 const focus={education:'social',science:'logic',health:'social',technology:'logic',
  trades:'physical',agriculture:'physical',arts:'creative',media:'language',
  sports:'physical',business:'social',civic:'social',service:'social'};
 const LICENSE=Object.freeze({
  '유아교사':'teaching','초등교사':'teaching','특수교육 교사':'teaching','음악 교사':'teaching',
  '간호사':'nursing','물리치료사':'therapy','약사':'pharmacy','응급구조사':'emergency',
  '사회복지사':'socialwork','전기 기사':'electrical'
 });
 const DEGREE=Object.freeze({
  '생명과학 연구원':'science','의학 연구원':'science','천문 연구원':'science',
  '도시계획 전문가':'civic'
 });
 const hash=(life,year,salt)=>W4.roll(life,year,salt);
 const label={
  arts:'예술·창작',education:'교육',science:'탐구·연구',health:'보건·돌봄',
  technology:'기술·개발',trades:'제작·정비',agriculture:'농업·생태',
  sports:'체육',media:'언론·언어',business:'경영',civic:'공공',service:'서비스'
 };
 const academicStrength=(life)=> {
  const d=life.world7;
  return (.52*d.talents.logic+.28*d.talents.language+.20*d.talents.social)/100;
 };
 // Birth-family *within-country* ranking. Percentiles are game constructs,
 // not measured household income or wealth by country.
 function percentile(life){
  const u=hash(life,1,710),f=life.familyLevel;
  return f==='빠듯한 형편'? .04+.27*u : f==='여유 있는 형편'?.77+.225*u:.27+.53*u;
 }
 function ensure(life){
  W6.ensure(life);
  if(life.world7)return life.world7;
  const talents={};
  SKILLS.forEach((k,i)=>talents[k.key]=Math.round(22+hash(life,0,711+i)*73));
  const sorted=[...SKILLS].sort((a,b)=>talents[b.key]-talents[a.key]);
  const pct=percentile(life);
  const householdMultiplier=clamp(Math.exp((pct-.52)*2.7),.32,4.3);
  const base=life.familyLevel==='여유 있는 형편'?1.8:life.familyLevel==='빠듯한 형편'?.37:1;
  // World2 initial money uses familyIncome, which World3 already converts to
  // game purchasing-power units; alter household support only once per life.
  life.profile.familyIncome=Math.round(life.profile.familyIncome*householdMultiplier/base);
  const s=life.world7={
   talents,interests:sorted.slice(0,2).map(x=>x.key),
   familyPercentile:Math.round(pct*1000)/1000,
   householdMultiplier,resourceAccess:clamp(.16+.68*pct+.16*(life.world.schoolChance||.5),.1,.99),
   formalYears:0,informalLearning:0,qualification:[],
   studyPath:'',major:'',degree:false,schoolTrack:'',
   effort:0,training:0,foundMentor:false,careerChanges:0,
   studyAdmissionChance:0,graduationChance:0,investmentInLearning:0,
   grandfatheredOccupation:'',events:[],version:7
  };
  // Stable interest is *not* a fixed intelligence ranking. Opportunity and
  // training can greatly change learned skills; all sectors remain possible.
  return s;
 }
 function addEvent(life,text){
  const s=ensure(life);s.events.push({age:life.age,text});
  if(s.events.length>45)s.events.shift();
  life.logEvent(text,'growth');
 }
 function applyLearning(life,preSchool){
  const s=ensure(life),w=life.world,age=life.age;
  if(age===6){
   s.schoolTrack=w.schooling;
   if(w.schooling==='학교에 다니는 중')s.formalYears=1;
  }else if(age>=7&&age<=15){
   if(['학교에 다니는 중','늦게 학교에 다니기 시작함','늦게 학교로 돌아옴'].includes(preSchool))
    s.formalYears=Math.min(16,s.formalYears+1);
   else s.informalLearning=Math.min(15,s.informalLearning+0.45);
   if(s.talents.logic>=68&&life.focus==='learning')life.change({knowledge:1});
   if(age===10||age===13||age===15){
    const relevant=(s.talents.logic+s.talents.language)/200;
    const access=(w.schoolChance||.5),extra=hash(life,age,735);
    if(extra<(.1+.17*relevant+.12*access)){
     s.effort+=1;s.informalLearning+=.5;life.change({knowledge:2});
     if(age===13)addEvent(life,'관심 있는 분야를 꾸준히 연습하며 실력이 자랐다.');
    }
   }
  }
  if(age===16){
   if(w.educationLevel==='중등 과정 이수'&&s.formalYears<6){
    w.educationLevel=s.formalYears>=2?'기초 교육':'지역·자율 학습';
    addEvent(life,'학교 밖의 배움은 소중하지만 정규 학력과 자격은 별도로 확인해야 했다.');
   }
  }
 }
 function majorFor(life){
  const s=ensure(life);
  const keys=['education','science','health','technology','arts','business','civic','trades'];
  // The same person can switch areas later. Initial preference is based on
  // a blend of interests, school experience and a deterministic exploration.
  const ranked=keys.map((k,i)=>{
   const t=s.talents[focus[k]]||45;
   const childhood=life.arc?.path==='academic'&&['science','health','education'].includes(k)?14:0;
   return {k,v:t+childhood+hash(life,20,760+i)*38};
  }).sort((a,b)=>b.v-a.v);
  return ranked[0].k;
 }
 function admission(life){
  const s=ensure(life),w=life.world,a=life.arc;
  const knowledge=life.stats.knowledge/100;
  return clamp(.035+.44*knowledge+.16*academicStrength(life)
   +.20*(s.formalYears/10)+.08*s.resourceAccess
   +.06*(w.schoolChance||.5)+.032*Math.min(4,s.effort)
   +.012*Math.min(5,a.learning||0),.025,.96);
 }
 function handleChoice(life,age,index){
  const s=ensure(life),w=life.world;
  if(age===16){
   if(index===0){
    s.effort+=3;s.investmentInLearning+=2;
    // Returning to school is an opportunity, not an instant full diploma.
    if(w.schooling==='늦게 학교로 돌아옴')s.formalYears=Math.max(s.formalYears,2);
   }else if(index===1){s.training+=2;s.effort+=2;s.interests=[...new Set(['physical',...s.interests])].slice(0,2);}
   else{s.foundMentor=true;s.effort+=1;}
  }
  if(age===20){
   if(index===0){
    const chance=admission(life),access=hash(life,20,782);
    s.studyAdmissionChance=chance;
    s.major=majorFor(life);
    if(access<chance){
     s.studyPath='university';w.educationLevel='고등 교육·훈련 중';
     life.career='학생';
     addEvent(life,'학업 성취와 학교·가정의 지원을 바탕으로 '+label[s.major]+' 분야의 고등교육 기회를 얻었다.');
    }else{
     s.studyPath='vocational';s.training+=2;s.investmentInLearning+=1;
     w.educationLevel='직업훈련 중';life.career='직업 기술을 배우는 중';
     addEvent(life,'진학 대신 실무 교육·자격 훈련을 선택하며 다른 기회를 준비했다.');
    }
   }else if(index===1){
    s.studyPath='vocational';s.training+=3;s.effort+=1;
    w.educationLevel=w.educationLevel==='중등 과정 이수'?w.educationLevel:'직업훈련 중';
   }else{s.studyPath='work';s.effort+=1;}
  }
  if(age===29&&index===0){s.effort+=1;s.training+=1;}
  if(age===42&&index===1){s.training+=1;s.effort+=1;}
 }
 function certification(life){
  const s=ensure(life),w=life.world;
  if(life.age!==24||!s.studyPath||s.qualification.length)return;
  if(s.studyPath==='university'){
   const chance=clamp(.29+.30*life.stats.knowledge/100+.14*academicStrength(life)+.08*s.effort/5+.10*s.resourceAccess,.15,.96);
   s.graduationChance=chance;
   if(hash(life,24,787)<chance){
    s.degree=true;s.qualification.push('degree:'+s.major);
    w.educationLevel='고등 교육·훈련 수료';
    addEvent(life,label[s.major]+' 분야의 학위 과정을 마쳤다.');
    const exam=hash(life,24,788);
    const examChance=clamp(.27+.34*life.stats.knowledge/100+.18*academicStrength(life)+.08*s.training/5,.2,.92);
    let license='';
    if(s.major==='education')license='teaching';
    if(s.major==='health'){
      const sub=hash(life,24,789);
      license=sub<.36?'nursing':sub<.57?'therapy':sub<.72?'pharmacy':'emergency';
    }
    if(s.major==='civic')license='socialwork';
    if(s.major==='technology')license='electrical';
    if(license&&exam<examChance){
     s.qualification.push(license);
     addEvent(life,'별도의 실습·시험 과정을 마치고 관련 전문 자격을 얻었다.');
    }
   }else{
    s.training+=2;s.qualification.push('continuing-education');
    w.educationLevel=s.formalYears>=6?'중등 과정 이수':'기초 교육';
    addEvent(life,'학위는 마치지 못했지만 배운 경험을 바탕으로 다른 훈련을 이어 갔다.');
   }
  }else if(s.studyPath==='vocational'){
   const chance=clamp(.36+.25*(s.talents.physical/100)+.16*s.effort/5+.10*s.resourceAccess,.20,.94);
   if(hash(life,24,790)<chance){
    s.qualification.push('vocational');s.training+=2;
    w.educationLevel='직업훈련 수료';
    if(s.training>=4&&hash(life,24,791)<.32)s.qualification.push('electrical');
    addEvent(life,'직업훈련을 마치고 현장에서 활용할 수 있는 기술을 익혔다.');
   }else{
    w.educationLevel=s.formalYears>=6?'중등 과정 이수':'지역·자율 학습';
   }
  }
 }
 function allowed(life,job){
  const s=ensure(life);
  if(s.grandfatheredOccupation===job)return true;
  if(LICENSE[job])return s.qualification.includes(LICENSE[job]);
  if(DEGREE[job])return s.degree&&s.major===DEGREE[job];
  return true;
 }
 function resolveCareer(life,sector,job){
  if(allowed(life,job))return job;
  const list=Careers.tracks[sector]?.jobs?.filter(j=>allowed(life,j))||[];
  if(!list.length)return job;
  return list[Math.floor(hash(life,life.age,801)*list.length)];
 }
 function sectorWeight(life,sector){
  const s=ensure(life),skill=s.talents[focus[sector]]||55;
  const learned=s.training*1.7+s.effort*.6;
  const academic=sector==='science'||sector==='health'||sector==='education';
  const alignment=clamp(.73+(skill-50)/140+learned/50,.52,1.65);
  const access=academic&&s.degree?1.30:academic&&!s.degree?.87:1;
  const location=life.profile.settlement==='농촌'&&sector==='agriculture'?1.45:1;
  return alignment*access*location;
 }
 function supplementaryFinance(life){
  const s=ensure(life),money=life.money,age=life.age;if(age<18)return;
  // Spending is based on location/household needs in v2, not a share of salary.
  // Only modest optional consumption scales with positive disposable income.
  const disposable=Math.max(0,money.lastBalance);
  const voluntary=age>20&&money.employment!=='구직 중'?
    Math.round(Math.min(disposable*.09,3400*(life.world?.economyScale||1))):0;
  money.essentialExpense=money.expense;
  money.optionalExpense=voluntary;
  money.expense+=voluntary;money.lastBalance-=voluntary;money.netWorth-=voluntary;
  // Preserve a faithful combined ledger and clamp all balances.
  money.netWorth=clamp(money.netWorth,-2e7,2e7);
  // Higher knowledge/skill creates earnings opportunities, not guaranteed jobs.
  if(age>=25&&money.income>0&&!money.retired&&s.qualification.length){
   const bump=clamp(1+.024*s.training+.016*Math.min(5,s.effort),1,1.25);
   const bonus=Math.round(money.income*(bump-1));
   money.income+=bonus;money.lastBalance+=bonus;money.netWorth=clamp(money.netWorth+bonus,-2e7,2e7);
  }
 }
 function install(){
  if(!Sim?.Life||!W6?.ensure||Sim.Life.prototype.__world7)return false;
  const L=Sim.Life,tick=L.prototype.tick,choose=L.prototype.choose,snapshot=L.prototype.snapshot,restore=L.restore;
  L.prototype.__v7resolveCareer=function(sector,job){return resolveCareer(this,sector,job);};
  L.prototype.__v7sectorWeight=function(sector){return sectorWeight(this,sector);};
  L.prototype.tick=function(){
   if(!this.alive||this.pending)return false;
   ensure(this);
   const oldSchool=this.world.schooling;
   const ok=tick.call(this);
   if(!ok)return false;
   applyLearning(this,oldSchool);
   certification(this);
   supplementaryFinance(this);
   return ok;
  };
  L.prototype.choose=function(index){
   const age=this.age,wasPending=this.pending;
   const ok=choose.call(this,index);
   if(ok&&(age===16||age===20||age===29||age===42)&&
     (wasPending===age||wasPending==='extra:'+age))handleChoice(this,age,index);
   return ok;
  };
  L.prototype.snapshot=function(){
   const s=ensure(this);return {...snapshot.call(this),world7:{
    ...s,talents:{...s.talents},interests:[...s.interests],
    qualification:[...s.qualification],events:s.events.map(e=>({...e}))
   }};
  };
  L.restore=function(data){
   const life=restore.call(this,data);if(!life)return null;
   const s=ensure(life),d=data?.world7;
   if(d&&typeof d==='object'){
    const nums=['familyPercentile','householdMultiplier','resourceAccess','formalYears',
     'informalLearning','effort','training','careerChanges','studyAdmissionChance',
     'graduationChance','investmentInLearning'];
    for(const key of nums)if(Number.isFinite(d[key]))s[key]=clamp(d[key],0,key==='householdMultiplier'?5:100);
    for(const key of ['studyPath','major','schoolTrack','grandfatheredOccupation'])
     if(typeof d[key]==='string')s[key]=d[key].slice(0,80);
    s.degree=d.degree===true;
    if(d.talents&&typeof d.talents==='object')for(const k of SKILLS)
     if(Number.isFinite(d.talents[k.key]))s.talents[k.key]=clamp(d.talents[k.key],0,100);
    if(Array.isArray(d.interests))s.interests=d.interests.filter(x=>SKILLS.some(k=>k.key===x)).slice(0,2);
    if(Array.isArray(d.qualification))s.qualification=d.qualification.filter(x=>typeof x==='string').slice(0,12);
    if(Array.isArray(d.events))s.events=d.events.filter(x=>x&&Number.isInteger(x.age)&&typeof x.text==='string').slice(-45);
    s.foundMentor=d.foundMentor===true;
    // The profile was reconstructed by earlier restore layers; use stored
    // socioeconomic metadata rather than applying the multiplier twice.
    if(data.profile&&Number.isFinite(data.profile.familyIncome))life.profile.familyIncome=data.profile.familyIncome;
    if(data.money&&Number.isFinite(data.money.essentialExpense))life.money.essentialExpense=data.money.essentialExpense;
    if(data.money&&Number.isFinite(data.money.optionalExpense))life.money.optionalExpense=data.money.optionalExpense;
   }else if(life.world6?.profession && LICENSE[life.world6.profession]){
    // Backward compatible saves: don't retroactively remove a lived career.
    s.grandfatheredOccupation=life.world6.profession;
   }
   return life;
  };
  Object.defineProperty(L.prototype,'__world7',{value:true});
  return true;
 }
 install();
 return Object.freeze({install,ensure,SKILLS,LICENSE,DEGREE,allowed,resolveCareer,sectorWeight,
  admission,certification,percentile,majorFor});
});