/* One Life v13 — a named family grows, care needs evolve, and past decisions echo.
 * Educational fiction: no real diagnosis, historical individual participation, or
 * measured medical-risk / care-cost probabilities are implied.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeWorld9,root?.OneLifeWorld10,root?.OneLifeWorld12);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeWorld13=api;
})(typeof window!=='undefined'?window:null,function(Sim,W9,W10,W12){
'use strict';
const min=Math.min,max=Math.max;
const clamp=(x,a,b)=>max(a,min(b,x));
const safeText=x=>String(x||'').slice(0,240);
function hash(life,salt){
 let x=((life.seed>>>0)^Math.imul(life.year+23,2654435761)^Math.imul(salt+13,2246822519))>>>0;
 x=Math.imul(x^(x>>>16),2246822519)>>>0;
 return ((x^(x>>>13))>>>0)/4294967296;
}
function state(life){
 W12.ensure(life);
 if(!life.world13)life.world13={
  version:13,processedYear:life.year,peopleState:{},eventsSeen:[],memories:[],
  episodes:[],pendingCare:null,active:null,decisions:[],followups:[],
  historicalEchoes:[],careYears:0,carePoints:0,totalFollowups:0,source:'fictional-relationships-and-care-v13'
 };
 return life.world13;
}
function narrate(life,s,id,text,kind='family13'){
 if(s.eventsSeen.includes(id))return false;
 s.eventsSeen.push(id);s.eventsSeen=s.eventsSeen.slice(-300);
 life.logEvent(safeText(text)+' (가상 인생)',''+kind);
 return true;
}
function remember(life,s,tag){
 if(!s.memories.includes(tag)){s.memories.push(tag);s.memories=s.memories.slice(-70);}
 const w=W9.ensure(life);
 if(!w.memories.includes(tag)&&w.memories.length<80)w.memories.push(tag);
}
function living(life){return W9.ensure(life).people.filter(p=>p.alive&&p.birthYear<=life.year);}
const find=(life,id)=>living(life).find(p=>p.id===id)||null;
function family(life,s){
 for(const person of W9.ensure(life).people){
  const age=life.year-person.birthYear;
  if(age<0)continue;
  let st=s.peopleState[person.id];
  if(!st)st=s.peopleState[person.id]={lastAge:-1,care:'none',support:0,contact:0};
  if(!person.alive){st.care='none';continue;}
  if(st.lastAge===age)continue;
  st.lastAge=age;
  if(person.role==='자녀'){
   const milestones=[
    [3,'처음 좋아하는 놀이에 대해 길게 이야기했다.'],
    [9,'학교에서의 하루를 자신의 말로 들려주었다.'],
    [16,'앞으로 하고 싶은 일을 가족과 의논했다.'],
    [22,'공부와 일, 독립적인 생활에 대해 이야기했다.'],
    [30,'서로 어른이 된 삶의 이야기를 나누었다.']
   ];
   const entry=milestones.find(m=>m[0]===age);
   if(entry){
    narrate(life,s,'child-milestone-'+person.id+'-'+age,person.name+'(이)가 '+age+'세가 되어 '+entry[1],'family13');
    person.relation=clamp(person.relation+2,0,100);
    remember(life,s,person.name+' '+age+'세의 기억');
   }
  }
  if((person.role==='어머니'||person.role==='아버지'||person.role==='외할머니')&&[60,70,80].includes(age)){
   narrate(life,s,'parent-age-'+person.id+'-'+age,person.name+'(이)가 '+age+
    '세가 되었다. 가족들은 서로의 생활과 노후 계획에 대해 이야기했다.','family13');
   remember(life,s,person.name+'의 노년 이야기');
  }
 }
}
const PICKS=Object.freeze({
 care:[
  {label:'돌봄을 가족과 나누어 맡는다',note:'시간과 비용이 들지만 가족의 안부와 생활을 함께 살핌'},
  {label:'지역의 의료·돌봄 지원을 알아본다',note:'지원 경로를 찾아 일·가족·휴식을 조율함'},
  {label:'일정을 줄이고 직접 돌보는 시간을 확보한다',note:'일과 수입 조정 부담이 생기지만 함께하는 시간이 늘어남'}
 ],
 wellness:[
  {label:'진료·상담을 받고 생활 일정을 조절한다',note:'가상의 건강 관리 비용이 발생하고 회복 계획을 세움'},
  {label:'쉬는 시간을 늘리고 주변의 도움을 요청한다',note:'삶의 속도를 줄이고 가족·친구의 도움을 구함'},
  {label:'가까운 사람과 건강 관리 습관을 시작한다',note:'함께 꾸준히 생활 습관을 점검함'}
 ],
 education:[
  {label:'늦게라도 다시 배울 기회를 찾는다',note:'예전에 중단했던 교육과 기술을 다시 익힘'},
  {label:'지금까지 익힌 경험을 다른 사람에게 전한다',note:'시간이 지나며 얻은 지혜를 가족·친구와 나눔'}
 ],
 reunion:[
  {label:'멀어진 가족과 친구에게 먼저 안부를 전한다',note:'과거 이주와 생활 변화로 뜸해진 관계를 이어 감'},
  {label:'지금 사는 지역에서 새 관계를 쌓는다',note:'현재 거주지에서 가까운 사람들과 서로 돕는 생활을 선택'}
 ],
 parenting:[
  {label:'아이와 함께 배우고 이야기하는 시간을 만든다',note:'함께할 시간을 마련하며 성장 이야기를 공유함'},
  {label:'가족·지역의 도움을 받아 돌봄을 나눈다',note:'서로 부담을 나눠 안정적인 생활 리듬을 찾음'}
 ]
});
function createOffer(life,s,kind,person,topic){
 if(!life.alive||life.pending||s.active||s.pendingCare)return false;
 if(s.decisions.some(x=>x.topic===topic&&x.personId===(person?.id||'')))return false;
 const id=kind+'-'+(person?.id||'self')+'-'+life.year;
 if(s.eventsSeen.includes('offered-'+id))return false;
 const titles={
  care:(person?.name||'가족')+'의 돌봄이 필요할 때',
  wellness:'나의 건강과 생활을 조정하는 시기',
  education:'어린 시절의 배움이 다시 이어지는 날',
  reunion:'오래전 이주와 가족의 기억',
  parenting:(person?.name||'아이')+'(와)과 함께 성장하기'
 };
 s.active={id,kind,topic,personId:person?.id||'',year:life.year,title:titles[kind]};
 s.eventsSeen.push('offered-'+id);
 s.eventsSeen=s.eventsSeen.slice(-300);
 life.pending='v13:'+id;
 return true;
}
function prompt(life){
 const s=state(life),a=s.active;
 if(!a)return null;
 const p=a.personId?find(life,a.personId):null;
 const descriptions={
  care:p?p.name+'(이)가 나이가 들면서 생활 속 도움을 필요로 하는 시기가 왔습니다. 실제 질환을 진단하거나 누구의 돌봄을 강요하는 설정은 아닙니다.':'돌봄의 필요를 함께 의논합니다.',
  wellness:'피로나 생활상의 어려움을 느끼는 시기입니다. 특정 질환의 발생을 의미하지 않습니다.',
  education:'예전에 공부나 기술을 이어 가지 못했던 경험을 떠올렸습니다. 지금 선택이 새로운 기회를 만들 수 있습니다.',
  reunion:'과거 지역을 옮겼거나 힘든 시기를 지나며 관계가 달라졌습니다. 누구에게 어떻게 마음을 전할까요?',
  parenting:p?p.name+'(이)가 자라며 새로운 고민을 나누기 시작했습니다. 가족의 시간을 어떻게 보낼까요?':'자녀와 가족의 시간을 계획합니다.'
 };
 return {age:life.age,title:a.title,description:descriptions[a.kind]+' (게임용 가상 상황·효과)',
  options:PICKS[a.kind],familyCare:true};
}
function schedule(s,year,id,text,kind){
 if(s.followups.length>=18||s.followups.some(x=>x.id===id))return;
 s.followups.push({year,id,text,kind});
}
function startEpisode(life,s,kind,person){
 const id=kind+'-'+(person?.id||'self')+'-'+life.year;
 if(s.episodes.some(x=>x.id===id))return null;
 const e={id,kind,personId:person?.id||'',startYear:life.year,
  until:life.year+(kind==='care'?3:2),intensity:1,active:true};
 s.episodes.push(e);
 s.episodes=s.episodes.slice(-24);
 if(person){
  const ps=s.peopleState[person.id];
  if(ps)ps.care='considering';
 }
 return e;
}
function afterChoice(life,index){
 const s=state(life),a=s.active;
 if(!a||life.pending!=='v13:'+a.id||a.year!==life.year)return false;
 const options=PICKS[a.kind];
 if(!Number.isInteger(index)||index<0||index>=options.length)return false;
 const person=a.personId?find(life,a.personId):null;
 if(a.kind==='care'&&!person)return false;
 const text=options[index].label;
 const p=person,existing=s.episodes.find(x=>x.kind===a.kind&&x.personId===a.personId&&x.active);
 if(a.kind==='care'){
  const e=existing||startEpisode(life,s,'care',p);
  if(e)e.intensity=index===2?3:index===0?2:1;
  const rel=index===2?7:index===0?5:3;
  p.relation=clamp(p.relation+rel,0,100);
  s.peopleState[p.id].care=index===1?'supported':'shared';
  life.change({bonds:index===1?3:5,happiness:index===2?-2:1,knowledge:index===1?2:0});
  remember(life,s,p.name+'을 위한 돌봄을 의논한 해');
  schedule(s,life.year+2,a.id+'-echo',p.name+'(와)과 돌봄을 조율했던 경험이 이후의 생활에도 도움을 주었다.','care');
 }else if(a.kind==='wellness'){
  const e=startEpisode(life,s,'wellness');
  if(e)e.intensity=index===0?2:1;
  life.change(index===1?{health:2,happiness:3,bonds:3}:index===0?
   {health:4,knowledge:2,happiness:1}:{health:3,bonds:4});
  remember(life,s,'생활 리듬과 건강을 돌본 경험');
  schedule(s,life.year+2,a.id+'-echo','건강을 돌보기 위해 조정했던 생활 방식이 일상에 조금씩 자리 잡았다.','wellness');
 }else if(a.kind==='education'){
  life.change(index===0?{knowledge:7,happiness:2}:{knowledge:3,bonds:5});
  if(index===0&&life.world){
   life.world.educationYears=clamp((life.world.educationYears||0)+1,0,20);
   life.world.schooling='재교육과 평생학습';
  }
  remember(life,s,'중단된 배움 이후의 새로운 선택');
  schedule(s,life.year+4,a.id+'-echo','어린 시절의 배움이 끊겼던 일을 돌아보며 새로운 기술과 삶의 경험을 활용했다.','history');
 }else if(a.kind==='reunion'){
  const named=living(life).filter(x=>['어머니','아버지','동반자','친구','형제자매'].includes(x.role));
  if(index===0&&named.length)named[0].relation=clamp(named[0].relation+8,0,100);
  life.change(index===0?{bonds:6,happiness:2}:{bonds:4,knowledge:2});
  remember(life,s,'이주와 관계의 재정비');
  schedule(s,life.year+3,a.id+'-echo','새로운 곳에서 이어 온 관계와 이전에 함께했던 사람들의 기억을 다시 이야기했다.','history');
 }else if(a.kind==='parenting'){
  if(p)p.relation=clamp(p.relation+(index===0?6:4),0,100);
  life.change(index===0?{bonds:5,knowledge:2}:{bonds:4,happiness:3});
  remember(life,s,(p?.name||'아이')+'와 함께한 배움과 돌봄');
  schedule(s,life.year+3,a.id+'-echo',(p?.name||'아이')+'(와)과 함께한 시간이 지나고 서로의 성장을 이야기했다.','parenting');
 }
 s.decisions.push({id:a.id,kind:a.kind,personId:a.personId,topic:a.topic,year:life.year,age:life.age,index});
 s.decisions=s.decisions.slice(-90);
 narrate(life,s,'choice-'+a.id,life.year+'년 '+a.title+' — '+text,'care13-choice');
 s.active=null;life.pending=null;
 return true;
}
function events(life,s){
 if(!life.alive)return;
 family(life,s);
 // Scheduled echoes are tied to the original choice, not indiscriminate random events.
 const due=s.followups.filter(x=>x.year<=life.year);
 s.followups=s.followups.filter(x=>x.year>life.year);
 for(const f of due){
  if(f.kind==='care'){
   const match=s.decisions.find(x=>f.id.startsWith(x.id+'-echo'));
   if(match&&!find(life,match.personId)){
    narrate(life,s,'followup-'+f.id,'함께 나눴던 돌봄의 시간을 떠올리며 그 사람을 기억했다.','care13-followup');
   }else narrate(life,s,'followup-'+f.id,f.text,'care13-followup');
  }else narrate(life,s,'followup-'+f.id,f.text,'care13-followup');
  s.totalFollowups++;
 }
 // The annual care budget is a fictional, bounded game-point burden.
 for(const episode of s.episodes){
  if(!episode.active)continue;
  if(life.year>episode.until||
    episode.kind==='care'&&!find(life,episode.personId)){
    episode.active=false;
    if(episode.personId&&s.peopleState[episode.personId])
     s.peopleState[episode.personId].care='none';
    continue;
  }
  if(episode.kind==='care'){
   const units=22*episode.intensity;
   if(life.money)life.money.netWorth=clamp(life.money.netWorth-units,-2e7,2e7);
   s.careYears++;s.carePoints+=units;
   if(life.year===episode.startYear+1)narrate(life,s,'ongoing-'+episode.id,
    '지난해 시작한 가족 돌봄을 올해도 역할을 나누어 이어 갔다.','care13');
  }
 }
 const h=W10.ensure(life),past=W12.ensure(life);
 if(life.country?.[0]==='대한민국'){
  if(life.age>=25&&life.age<=50&&h.tags.some(t=>t.includes('학업 중단'))&&
     !s.decisions.some(d=>d.kind==='education')&&life.age%7===0){
   if(createOffer(life,s,'education',null,'historical-learning'))return;
  }
  if(life.age>=20&&life.age<=75&&(h.moves>0||past.relocations>0)&&
    !s.decisions.some(d=>d.kind==='reunion')&&life.age%11===0){
   if(createOffer(life,s,'reunion',null,'historical-migration'))return;
  }
  // Historical memories return at a later age without insisting the fictional
  // character personally took part in any named political/historical event.
  if(life.age===65&&h.tags.length){
   const t=h.tags.slice(0,2).join('·');
   if(narrate(life,s,'historical-age-65',t+'에 관한 옛 시절의 이야기를 가족에게 들려주었다.','care13-memory'))
     s.historicalEchoes.push({year:life.year,text:t});
  }
 }
 const child=living(life).find(p=>p.role==='자녀'&&life.year-p.birthYear===13);
 if(child&&life.age>=24){
  if(createOffer(life,s,'parenting',child,'family-learning'))return;
 }
 // A real named parent has to be alive, at least 65, and not already assisted.
 if(life.age>=26&&life.age<=75&&life.age%5===0){
  const elders=living(life).filter(p=>['어머니','아버지','외할머니'].includes(p.role)&&
    life.year-p.birthYear>=65&&!s.decisions.some(d=>d.kind==='care'&&d.personId===p.id));
  const chosen=elders.find(p=>hash(life,p.id.length+17)<.72);
  if(chosen&&createOffer(life,s,'care',chosen,'named-family-care'))return;
 }
 // Personal health event: not a clinical diagnosis, and no forced mortality.
 if(life.age>=30&&life.age<=80&&life.age%9===0&&
    !s.episodes.some(e=>e.kind==='wellness'&&e.active)&&
    hash(life,81)<(life.stats.health<55?.78:.38)){
  createOffer(life,s,'wellness',null,'self-wellness');
 }
}
function afterYear(life){
 if(!life.alive)return;
 const s=state(life);
 if(s.processedYear===life.year)return;
 s.processedYear=life.year;
 events(life,s);
}
function summary(life){
 if(!life)return null;
 const s=state(life);
 const active=s.episodes.filter(x=>x.active&&x.until>=life.year);
 const named=active.filter(x=>x.kind==='care').map(e=>find(life,e.personId)?.name).filter(Boolean);
 return {caringFor:named,careYears:s.careYears,carePoints:s.carePoints,
  episodes:active.length,followups:s.totalFollowups,decisions:s.decisions.length,
  memories:s.memories.slice(-3),historyEchoes:s.historicalEchoes.length};
}
function hydrate(life,data){
 const s=state(life),raw=data?.world13;
 if(!raw||raw.version!==13)return s;
 if(Number.isInteger(raw.processedYear))s.processedYear=clamp(raw.processedYear,life.birthYear-1,life.year);
 function strings(key,n){return Array.isArray(raw[key])?raw[key].filter(x=>typeof x==='string').slice(-n):[];}
 s.eventsSeen=strings('eventsSeen',300);s.memories=strings('memories',70);
 if(raw.peopleState&&typeof raw.peopleState==='object'){
  const ids=new Set(W9.ensure(life).people.map(x=>x.id));
  for(const [key,p] of Object.entries(raw.peopleState).slice(0,26)){
   if(!ids.has(key)||!p||typeof p!=='object')continue;
   s.peopleState[key]={lastAge:Number.isInteger(p.lastAge)?clamp(p.lastAge,-1,110):-1,
    care:['none','considering','supported','shared'].includes(p.care)?p.care:'none',
    support:Number.isInteger(p.support)?clamp(p.support,0,100):0,
    contact:Number.isInteger(p.contact)?clamp(p.contact,0,100):0};
  }
 }
 if(Array.isArray(raw.episodes))s.episodes=raw.episodes.filter(e=>e&&
  typeof e.id==='string'&&['care','wellness'].includes(e.kind)&&
  Number.isInteger(e.startYear)&&Number.isInteger(e.until)&&e.startYear<=life.year)
  .slice(-24).map(e=>({id:e.id.slice(0,100),kind:e.kind,
   personId:String(e.personId||'').slice(0,45),
   startYear:e.startYear,until:clamp(e.until,e.startYear,e.startYear+5),
   intensity:Number.isInteger(e.intensity)?clamp(e.intensity,1,3):1,active:e.active===true}));
 if(Array.isArray(raw.decisions))s.decisions=raw.decisions.filter(d=>d&&
  typeof d.id==='string'&&PICKS[d.kind]&&Number.isInteger(d.year)&&d.year<=life.year&&
  Number.isInteger(d.index)&&d.index>=0&&d.index<PICKS[d.kind].length).slice(-90)
  .map(d=>({id:d.id.slice(0,100),kind:d.kind,personId:String(d.personId||'').slice(0,45),
    topic:String(d.topic||'').slice(0,60),year:d.year,age:Number.isInteger(d.age)?d.age:0,index:d.index}));
 if(Array.isArray(raw.followups))s.followups=raw.followups.filter(f=>f&&
  Number.isInteger(f.year)&&f.year>life.year&&typeof f.id==='string'&&typeof f.text==='string')
  .slice(0,18).map(f=>({year:f.year,id:f.id.slice(0,110),text:safeText(f.text),kind:String(f.kind||'').slice(0,30)}));
 if(Array.isArray(raw.historicalEchoes))s.historicalEchoes=raw.historicalEchoes.filter(e=>
  e&&Number.isInteger(e.year)&&e.year<=life.year&&typeof e.text==='string')
  .slice(-30).map(e=>({year:e.year,text:e.text.slice(0,150)}));
 for(const key of ['careYears','carePoints','totalFollowups'])
  if(Number.isInteger(raw[key]))s[key]=clamp(raw[key],0,key==='carePoints'?2e7:10000);
 if(raw.active&&typeof raw.active.id==='string'&&
   ['care','wellness','education','reunion','parenting'].includes(raw.active.kind)&&
   raw.active.year===life.year&&!s.decisions.some(d=>d.id===raw.active.id)){
  const a=raw.active;
  s.active={id:a.id.slice(0,100),kind:a.kind,personId:String(a.personId||'').slice(0,45),
   topic:String(a.topic||'').slice(0,60),year:life.year,title:String(a.title||'선택').slice(0,85)};
  if(life.alive&&data?.pending==='v13:'+s.active.id)life.pending=data.pending;
 }
 return s;
}
function install(){
 if(!Sim?.Life||!W9?.ensure||!W10?.ensure||!W12?.ensure||Sim.Life.prototype.__world13)return false;
 const L=Sim.Life,tick=L.prototype.tick,choose=L.prototype.choose,getChoice=L.prototype.getChoice,
  reflect=L.prototype.reflect,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){
  if(!this.alive||this.pending)return false;
  state(this);
  const previous=this.age,ok=tick.call(this);
  if(ok&&this.alive&&this.age!==previous)afterYear(this);
  return ok;
 };
 L.prototype.getChoice=function(){
  return typeof this.pending==='string'&&this.pending.startsWith('v13:')?
   prompt(this):getChoice.call(this);
 };
 L.prototype.choose=function(index){
  if(typeof this.pending==='string'&&this.pending.startsWith('v13:'))
   return afterChoice(this,index);
  return choose.call(this,index);
 };
 L.prototype.reflect=function(text){return reflect.call(this,text);};
 L.prototype.snapshot=function(){
  return {...snapshot.call(this),world13:JSON.parse(JSON.stringify(state(this)))};
 };
 L.restore=function(data){
  const life=restore.call(this,data);if(life)hydrate(life,data);return life;
 };
 Object.defineProperty(L.prototype,'__world13',{value:true});
 return true;
}
install();
return Object.freeze({install,state,events,afterYear,summary,prompt,choose:afterChoice,VERSION:13});
});
