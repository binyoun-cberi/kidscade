/* One Life v11/v12 extension: durable personal choices and era-based education/economy.
 * Historic facts are distinct from fictional outcomes and economic scoring.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeWorld3,root?.OneLifeWorld6,
  root?.OneLifeWorld9,root?.OneLifeWorld10,root?.OneLifeHistoryChoices11,
  root?.OneLifeHistoryStories10,root?.OneLifeEraPolicy12);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeWorld12=api;
})(typeof window!=='undefined'?window:null,function(Sim,W3,W6,W9,W10,Choices,Stories,Policy){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const byId=id=>Choices.PATHS.find(x=>x.id===id)||null;
function fresh(life){
 const p=Policy.at(life);
 return {version:12,processedYear:life.year,seen:[],active:null,decisions:[],followups:[],
  tags:[],relocations:0,lastEra:p?.era||'',primaryYear:null,secondaryYear:null,
  metrics:{incomeLabel:p?.label||'그해의 생업',schoolBand:'미설정',year:life.year}};
}
function ensure(life){W10.ensure(life);return life.world12||(life.world12=fresh(life));}
function log(life,text,kind='era-life'){life.logEvent(text,kind);}
function tag(s,value){
 if(value&&!s.tags.includes(value)){s.tags.push(value);s.tags=s.tags.slice(-55);}
}
function followup(s,life,item,choice){
 const years=choice===0?3:5;
 const id=item.id+'-'+choice,year=life.year+years;
 if(s.followups.some(x=>x.id===id)||s.followups.length>=10)return;
 const message=(choice===0?'당시에 새롭게 시도했던':'당시에 기존 생활을 지키려 했던')+
   ' '+item.title+'의 경험이 지금의 삶을 바라보는 데 영향을 주었다.';
 s.followups.push({id,year,text:message});
}
function apply(life,item,index){
 const s=ensure(life),offers=Choices.OPTIONS[item.topic];
 if(!offers||!Number.isInteger(index)||index<0||index>=offers.length)return false;
 if(s.decisions.some(x=>x.id===item.id))return false;
 const topic=item.topic,changed=index===0;
 const year=life.year,world=life.world,people=W9.ensure(life).people;
 const effects={
  study:changed?{knowledge:4,happiness:1}:{knowledge:1,bonds:2},
  trade:changed?{knowledge:4,health:-1}:{knowledge:2,bonds:1},
  work:changed?{knowledge:3,happiness:1}:{bonds:2,knowledge:1},
  move:changed?{knowledge:2,happiness:-1}:{bonds:3},
  family:changed?{bonds:4,happiness:1}:{bonds:3,knowledge:1},
  market:changed?{wealth:1,knowledge:1}:{knowledge:2,health:-1},
  civic:changed?{knowledge:3}:{bonds:3},
  community:changed?{bonds:4}:{bonds:2,happiness:1},
  health:changed?{health:2,knowledge:1}:{bonds:3,health:1},
  digital:changed?{knowledge:4}:{knowledge:2,bonds:1}
 };
 life.change(effects[topic]||{knowledge:1});
 if(topic==='study'||topic==='trade'){
  if(changed&&life.age>=7&&life.age<=25&&!life.world10?.schoolInterrupted){
   world.educationYears=clamp((world.educationYears||0)+1,0,20);
   if(world.educationLevel==='없음')world.educationLevel='비정규 배움·기술 경험';
  }
  tag(s,changed?'배움과 기술을 익힌 경험':'생업과 학습을 병행한 경험');
 }
 if(topic==='work'&&life.age>=18&&changed&&life.money?.retired!==true){
  const sector=((life.seed>>>0)+life.year)%2===0?'trades':'service';
  W6.career(life,sector,(life.age+index)%7,'새 일자리를 찾아');
  tag(s,'진로 전환');
 }else if(topic==='work')tag(s,'기존 일의 경험');
 if(topic==='move'){
  if(changed&&s.relocations<2&&life.profile){
   const prior=life.profile.city;
   life.profile.city='다른 지역의 생활 중심지';
   life.profile.settlement='소도시';
   s.relocations++;
   log(life,prior+'에서 다른 지역으로 이사하고 생활을 다시 정비했다','era-consequence');
  }
  tag(s,changed?'거주지 이동':'기존 지역에서의 생활');
 }
 if(topic==='family'||topic==='community'){
  for(const p of people.filter(p=>p.alive&&['어머니','아버지','동반자','자녀','친구'].includes(p.role)))
   p.relation=clamp((p.relation||65)+(changed?3:1),0,100);
  tag(s,'주변 사람과의 관계');
 }
 if(topic==='market'&&life.money){
  // Small bounded fictional spending shift, not inflation-adjusted KRW.
  const delta=changed?100:-65;
  life.money.netWorth=clamp(life.money.netWorth+delta,-2e7,2e7);
  tag(s,changed?'지출을 줄인 경험':'새로운 소득 탐색');
 }
 if(topic==='health')tag(s,'돌봄·건강 생활');
 if(topic==='digital')tag(s,'디지털 기술 익히기');
 if(topic==='civic')tag(s,'시대의 소식 이해하기');
 s.decisions.push({id:item.id,year,age:life.age,topic,index});
 s.decisions=s.decisions.slice(-90);
 const offered=offers[index];
 log(life,year+'년 '+item.title+' — '+offered[0]+'. '+offered[1],'era-choice');
 followup(s,life,item,index);
 return true;
}
function offer(life){
 const s=ensure(life);
 if(!life.alive||life.pending||s.active||life.country?.[0]!=='대한민국')return false;
 const era=Stories.era(life.year);
 const selected=Choices.select(life,s.seen,era);
 if(!selected)return false;
 s.seen.push(selected.id);
 s.seen=s.seen.slice(-Choices.count);
 s.active={id:selected.id,year:life.year};
 life.pending='v12:'+selected.id;
 return true;
}
function beforeYear(life){
 if(life.country?.[0]!=='대한민국')return;
 const p=Policy.at(life,life.year+1);
 if(!p)return;
 const s=ensure(life);
 // Only the period of the school decision matters. Never re-price a saved childhood.
 if(life.age===5&&s.primaryYear===null){
  const world=W3.setup(life);
  world.schoolChance=Math.min(world.schoolChance,p.schoolCap);
  s.primaryYear=life.year+1;
  s.metrics.schoolBand=p.label+' · 처음 학교에 갈 무렵';
 }
 if(life.age===15&&s.secondaryYear===null){
  const world=W3.setup(life);
  world.secondaryChance=Math.min(world.secondaryChance,p.secondaryCap);
  s.secondaryYear=life.year+1;
  s.metrics.schoolBand=p.label+' · 중등학교에 갈 무렵';
 }
}
function afterYear(life){
 if(!life.alive)return;
 const s=ensure(life),p=Policy.at(life);
 if(s.processedYear===life.year)return;
 s.processedYear=life.year;
 if(p&&s.lastEra!==p.era){
  s.lastEra=p.era;
  s.metrics.schoolBand=p.label;
  log(life,'세상은 어느새 '+p.label+'로 접어들었다','era-context');
 }
 s.metrics.year=life.year;
 s.metrics.incomeLabel=p?.label||'그해의 살림';
 const due=s.followups.filter(f=>f.year<=life.year);
 s.followups=s.followups.filter(f=>f.year>life.year);
 for(const event of due){
  log(life,event.text,'era-followup');
  tag(s,'과거 선택의 장기 영향');
 }
 // At most one contextual choice every four calendar years, and only at safe ages.
 if(!life.pending)offer(life);
}
function prompt(life){
 const s=ensure(life),item=byId(s.active?.id);
 return item?Choices.prompt(item,life):null;
}
function choose(life,index){
 const s=ensure(life),item=byId(s.active?.id);
 if(!item||life.pending!=='v12:'+item.id||s.active?.year!==life.year)return false;
 if(!apply(life,item,index))return false;
 s.active=null;life.pending=null;
 return true;
}
function summary(life){
 if(life.country?.[0]!=='대한민국')return null;
 const s=ensure(life),policy=Policy.at(life);
 return {period:policy?.label||'한국의 생활',incomeFactor:policy?.incomeFactor||1,
  costFactor:policy?.costFactor||1,schoolNote:s.metrics.schoolBand,
  choices:s.decisions.length,longConsequences:s.tags.slice(-4),moves:s.relocations,
  totalPaths:Choices.count};
}
function hydrate(life,data){
 const s=ensure(life),old=data?.world12;
 if(!old||old.version!==12)return s;
 if(Number.isInteger(old.processedYear))s.processedYear=clamp(old.processedYear,life.birthYear-1,life.year);
 if(Array.isArray(old.seen))s.seen=old.seen.filter(x=>typeof x==='string'&&byId(x)).slice(-Choices.count);
 if(Array.isArray(old.tags))s.tags=old.tags.filter(x=>typeof x==='string').slice(-55);
 for(const key of ['primaryYear','secondaryYear'])
  s[key]=Number.isInteger(old[key])&&old[key]>=life.birthYear&&old[key]<=life.year?old[key]:null;
 if(Number.isInteger(old.relocations))s.relocations=clamp(old.relocations,0,2);
 if(typeof old.lastEra==='string')s.lastEra=old.lastEra.slice(0,25);
 if(old.metrics&&typeof old.metrics==='object')s.metrics={
  incomeLabel:String(old.metrics.incomeLabel||'그해의 경제').slice(0,100),
  schoolBand:String(old.metrics.schoolBand||'미설정').slice(0,100),
  year:Number.isInteger(old.metrics.year)?old.metrics.year:life.year
 };
 if(Array.isArray(old.decisions))s.decisions=old.decisions.filter(x=>x&&byId(x.id)&&Number.isInteger(x.index)&&
  Number.isInteger(x.year)&&x.year<=life.year).slice(-90).map(x=>({
   id:x.id,index:clamp(x.index,0,1),year:x.year,age:Number.isInteger(x.age)?x.age:0,
   topic:byId(x.id).topic
  }));
 if(Array.isArray(old.followups))s.followups=old.followups.filter(x=>x&&typeof x.id==='string'&&
  Number.isInteger(x.year)&&x.year>life.year&&typeof x.text==='string').slice(0,10)
  .map(x=>({id:x.id.slice(0,100),year:x.year,text:x.text.slice(0,300)}));
 if(old.active&&byId(old.active.id)&&old.active.year===life.year&&!s.decisions.some(x=>x.id===old.active.id)){
  s.active={id:old.active.id,year:life.year};
  if(life.alive&&data?.pending==='v12:'+s.active.id)life.pending=data.pending;
 }
 return s;
}
function install(){
 if(!Sim?.Life||!W3?.setup||!W6?.career||!W9?.ensure||!W10?.ensure||!Choices?.select||!Policy?.at||
   Sim.Life.prototype.__world12)return false;
 const L=Sim.Life,tick=L.prototype.tick,getChoice=L.prototype.getChoice,priorChoose=L.prototype.choose,
  reflect=L.prototype.reflect,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){
  if(!this.alive||this.pending)return false;
  ensure(this);beforeYear(this);
  const previous=this.age,result=tick.call(this);
  if(result&&this.age!==previous&&this.alive)afterYear(this);
  return result;
 };
 L.prototype.getChoice=function(){
  return typeof this.pending==='string'&&this.pending.startsWith('v12:')?prompt(this):getChoice.call(this);
 };
 L.prototype.choose=function(index){
  if(typeof this.pending==='string'&&this.pending.startsWith('v12:'))return choose(this,index);
  const result=priorChoose.call(this,index);
  if(result&&!this.pending)offer(this);
  return result;
 };
 L.prototype.reflect=function(text){
  const result=reflect.call(this,text);
  if(result&&!this.pending)offer(this);
  return result;
 };
 L.prototype.snapshot=function(){return {...snapshot.call(this),world12:JSON.parse(JSON.stringify(ensure(this)))};};
 L.restore=function(data){
  const life=restore.call(this,data);
  if(life)hydrate(life,data);
  return life;
 };
 Object.defineProperty(L.prototype,'__world12',{value:true});
 return true;
}
install();
return Object.freeze({install,ensure,summary,offer,prompt,choose,beforeYear,afterYear,VERSION:12});
});
