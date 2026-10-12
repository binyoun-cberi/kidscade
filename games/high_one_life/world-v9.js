/* ONE LIFE v9 — persistent people, causal memories and in-year stories.
 * Educational fiction: social, financial and health probabilities below
 * are never represented as measured country-specific population rates.
 * The module wraps v8 once. Existing v1-v8 saves remain loadable.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeWorld2,root?.OneLifeWorld4,root?.OneLifeWorld8);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeWorld9=api;
})(typeof window!=='undefined'?window:null,function(Sim,W2,W4,W8){
'use strict';
const VERSION=9,MAX_PEOPLE=24,MAX_LOG=760,MAX_QUEUE=12;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(life,salt)=>W4.roll(life,life.age,salt);
const names={
 대한민국:{female:['지민','하윤','수연','소희','은서','영희'],male:['지훈','도현','민수','준호','성민','영수']},
 일본:{female:['아오이','유이','미오','하나'],male:['렌','하루토','소타','유토']},
 브라질:{female:['아나','마리아','줄리아','베아트리스'],male:['페드루','루카스','주앙','가브리엘']},
 미국:{female:['에마','올리비아','소피아','릴리'],male:['노아','제임스','리엄','올리버']}
};
const common={female:['미나','리아','사라','엘라'],male:['아민','다니엘','아담','레오']};
const HOBBIES=['축구','그림','독서','음악','요리','체스','정원 가꾸기','사진'];
function chooseName(life,salt,sex){
 const pool=(names[life.country[0]]||common)[sex]||common.female;
 const hash=((life.seed ^ Math.imul(salt+1,2654435761))>>>0);
 return pool[hash%pool.length];
}
function person(state,id,role,name,birthYear,relationship=65){
 const found=state.people.find(p=>p.id===id);
 if(found)return found;
 if(state.people.length>=MAX_PEOPLE)return null;
 const p={id,role,name,birthYear,alive:true,relation:relationship,school:'',job:'',milestones:[],deadYear:null};
 state.people.push(p);return p;
}
function addMemory(state,tag){if(!state.memories.includes(tag)&&state.memories.length<80)state.memories.push(tag);}
function init(life){
 const p=W2.enrich(life).profile;
 const state={version:VERSION,people:[],memories:[],hobby:'',hobbySince:null,
   eventsSeen:[],yearQueue:[],queueYear:-1,decisions:[],annualEvents:0,
   finance:{debt:0,originalDebt:0,rate:.05,yearsLeft:0,home:false,paidOff:false,lastInterest:0,lastPrincipal:0},
   source:'fictional-lifepath-v9'};
 person(state,'mother','어머니',chooseName(life,21,'female'),life.birthYear-p.motherAge,85).job=p.motherJob;
 person(state,'father','아버지',chooseName(life,22,'male'),life.birthYear-p.fatherAge,78).job=p.fatherJob;
 for(let i=0;i<Math.min(3,p.siblings);i++)
  person(state,'sibling-'+i,'형제자매',chooseName(life,33+i,i%2?'female':'male'),life.birthYear+(i-1)*3,66);
 person(state,'grandmother','외할머니',chooseName(life,56,'female'),life.birthYear-p.motherAge-28,82);
 return state;
}
function ensure(life){
 W8.ensure(life);
 if(!life.world9)life.world9=init(life);
 return life.world9;
}
function markPerson(life,p,marker,text){
 if(!p||p.milestones.includes(marker))return false;
 p.milestones.push(marker);
 life.logEvent(text,'relationship');
 return true;
}
function record(life,state,key,text,kind='life9'){
 if(state.eventsSeen.includes(key))return false;
 state.eventsSeen.push(key);
 if(state.eventsSeen.length>560)state.eventsSeen.shift();
 life.logEvent(text,kind);state.annualEvents++;
 return true;
}
function syncPeople(life){
 const state=ensure(life),p=life.profile;
 if(p.partner&&!state.people.some(x=>x.id==='partner')){
  const sex=life.gender==='여자'?'male':'female';
  const partner=person(state,'partner','동반자',chooseName(life,93,sex),life.birthYear+2,84);
  if(partner)life.logEvent(partner.name+'(와)과 함께 생활하며 서로의 이야기를 나누기 시작했다.','relationship');
 }
 if(p.child&&!state.people.some(x=>x.id==='child-1')){
  const child=person(state,'child-1','자녀',chooseName(life,95,'female'),life.year,92);
  if(child){addMemory(state,'첫 자녀');life.logEvent(child.name+'(이)가 가족이 되었다.','relationship');}
 }
 return state;
}
function families(life,state){
 for(const p of state.people){
  if(!p.alive)continue;
  const age=life.year-p.birthYear;
  if(age<0)continue;
  if(p.role==='자녀'){
   for(const [mark,a,name,school] of [
    ['school',6,'학교에 입학','초등 재학'],['middle',12,'중등 과정을 시작','중등 재학'],
    ['graduate',18,'학교를 마치고 자신의 진로를 고민','교육·진로 탐색'],
    ['adult',25,'스스로의 생활을 꾸리기 시작','성인기']
   ]){
    if(age===a&&!p.milestones.includes(mark)){
     p.school=school;
     markPerson(life,p,mark,p.name+'(이)가 '+a+'세가 되어 '+name+'했다.');
    }
   }
  }
  if(p.role==='동반자'&&life.age>=40&&life.age%10===0)
   record(life,state,'partner-anniversary-'+life.age,p.name+'(와)과 서로의 삶을 돌아보며 함께한 시간을 소중하게 여겼다.','relationship');
  // A personal modelled passing, not a real demographic life-table.
  const lifespan=p.id==='grandmother'?86:(p.id==='mother'||p.id==='father')?88:97;
  const offset=p.id==='father'?2:p.id==='mother'?0:p.id==='grandmother'?0:4;
  if((p.id==='grandmother'||p.id==='mother'||p.id==='father')&&age>=lifespan+offset){
   p.alive=false;p.deadYear=life.year;
   record(life,state,'loss-'+p.id,p.name+'(이)가 세상을 떠났다. 함께했던 기억이 마음에 오래 남았다.','relationship');
   addMemory(state,p.name+'과의 추억');
  }
 }
}
function debtYear(life,state){
 const f=state.finance;
 f.lastInterest=0;f.lastPrincipal=0;
 if(!f.debt||f.yearsLeft<=0)return;
 const interest=Math.round(f.debt*f.rate);
 const payment=Math.min(f.debt,Math.max(1,Math.ceil(f.originalDebt/8)));
 f.debt=Math.max(0,f.debt-payment);
 f.yearsLeft=Math.max(0,f.yearsLeft-1);
 f.lastInterest=interest;f.lastPrincipal=payment;
 // Principal repayment exchanges cash for a smaller liability; only interest
 // reduces total net worth. The base economy already models ordinary spending.
 life.money.netWorth=Math.round(clamp(life.money.netWorth-interest,-2e7,2e7));
 if(f.debt===0&&!f.paidOff){
  f.paidOff=true;
  record(life,state,'loan-paid-'+life.year,'오랫동안 갚아 온 생활 대출을 모두 상환했다.','finance9');
 }else if(life.age%3===0){
  record(life,state,'loan-progress-'+life.year,'올해 생활 대출 원금 '+payment.toLocaleString('ko-KR')+
   '점과 이자 '+interest.toLocaleString('ko-KR')+'점을 납부했다. 남은 대출 '+f.debt.toLocaleString('ko-KR')+'점.','finance9');
 }
}
function newFriend(life,state){
 if(state.people.filter(p=>p.role==='친구').length>=4)return null;
 const i=state.people.filter(p=>p.role==='친구').length;
 const who=person(state,'friend-'+(i+1),'친구',chooseName(life,200+i,i%2?'female':'male'),
  life.birthYear+(i%3)-1,64);
 if(who)record(life,state,'new-friend-'+who.id+'-'+life.year,who.name+'(와)과 친구가 되었다. 함께할 이야기가 생겼다.','relationship');
 return who;
}
function eventsForYear(life,state){
 const a=life.age,year=life.year;
 const q=[],push=(id,text,kind='life9',month=5)=>q.push({id,text,kind,month});
 const childhood=a>=2&&a<=17;
 if(a===7&&!state.hobby)
  q.push({id:'choose-hobby',month:3,kind:'memory',choice:'hobby'});
 if(a===23&&!state.finance.originalDebt&&life.money?.netWorth<6500)
  q.push({id:'repair-cost',month:8,kind:'finance9',choice:'repair'});
 if(a===35&&life.profile?.partner&&!state.memories.includes('혼인'))
  q.push({id:'marriage',month:9,kind:'relationship',choice:'marriage'});
 if(a===43&&life.money?.netWorth>11000&&!state.finance.home)
  q.push({id:'housing',month:6,kind:'finance9',choice:'housing'});
 if(a===64&&state.hobby)
  push('hobby-retirement',state.hobbySince+'세에 시작한 '+state.hobby+'(을)를 다시 즐겼다. 오래전 취미가 노년의 하루를 채워 주었다.','memory',9);
 if(a===30&&state.hobby)
  push('hobby-30',state.hobby+'(을)를 꾸준히 즐기는 친구들과 모임을 가졌다.','memory',3);
 if(a===15&&state.hobby)
  push('hobby-teen','어린 시절 시작한 '+state.hobby+' 실력이 조금씩 늘었다.','memory',4);
 if(a===8||a===15||a===27||a===45)newFriend(life,state);
 const friends=state.people.filter(p=>p.role==='친구'&&p.alive);
 if(friends.length&&a>=16&&a%11===0){
  const who=friends[Math.floor(roll(life,931)*friends.length)];
  push('friend-reunion-'+a,who.name+'(와)과 오랜만에 만났다. 예전에 함께했던 일들을 떠올리며 웃었다.','relationship',6);
 }
 if(state.hobby&&a>8&&a%13===0)
  push('hobby-return-'+a,'바쁜 하루를 마치고 '+state.hobby+'(을)를 즐겼다. 오랫동안 좋아해 온 일이다.','memory',10);
 // Contextual filler: 2 to 3 modest events each year rather than hard choices.
 const everyday=childhood?[
  '가족과 하루를 보내며 새로운 것을 배웠다.',
  '친구와 놀이를 하며 작은 갈등을 풀어 보았다.',
  '평범하게 지나간 하루에도 기억하고 싶은 순간이 생겼다.',
  '배운 것을 다른 사람에게 설명하며 자신감을 얻었다.'
 ]:a<65?[
  '해야 할 일을 마치고 쉬는 시간을 소중하게 보냈다.',
  '동네 사람들과 인사를 나누며 일상의 관계를 이어 갔다.',
  '지난 경험을 떠올리며 앞으로의 생활을 계획했다.',
  '일과 생활의 균형을 다시 생각해 보았다.'
 ]:[
  '오래전 일을 떠올리며 가족과 이야기를 나눴다.',
  '편안한 하루를 보내며 가까운 사람에게 안부를 전했다.',
  '지금도 배우고 싶은 것이 있다는 사실이 즐거웠다.',
  '살아온 세월 속에서 소중했던 인연을 떠올렸다.'
 ];
 const filler=2+Math.floor(roll(life,883)*2);
 for(let i=0;i<filler;i++){
  const idx=Math.floor(roll(life,884+i)*everyday.length);
  const month=2+i*3;
  push('everyday-'+year+'-'+i,everyday[(idx+i)%everyday.length],'life9',month);
 }
 q.sort((x,y)=>x.month-y.month);
 return q.slice(0,MAX_QUEUE);
}
function prompt(choice,life){
 const state=ensure(life);
 if(choice==='hobby')return {age:life.age,title:'오래도록 기억할 작은 취미',description:'어린 시절 무엇을 즐겨 볼까요?',options:[
  {label:'축구',note:'친구와 공을 차며 즐기는 시간'},
  {label:'독서',note:'이야기를 읽으며 상상하는 시간'},
  {label:'그림',note:'그림으로 생각을 표현하는 시간'},
  {label:'음악',note:'소리와 리듬을 즐기는 시간'}
 ]};
 if(choice==='repair')return {age:life.age,title:'예상하지 못한 주거 수리비',description:'집에 갑자기 수리할 일이 생겼어요. 가상 경제 단위로 2,400점이 필요해요.',options:[
  {label:'생활 대출을 받아 수리한다',note:'생활 여건을 빨리 회복하지만 8년에 걸쳐 원리금을 갚음'},
  {label:'모은 돈으로 가능한 만큼 해결한다',note:'새 빚은 피하지만 순자산 감소'},
  {label:'가족과 함께 수리 방법을 찾는다',note:'일부 도움을 받을 수 있지만 다른 사람의 부담도 생각해야 함'}
 ]};
 if(choice==='marriage')return {age:life.age,title:'함께하는 관계의 다음 장',description:'동반자와 어떤 형태로 앞으로의 생활을 꾸려 갈까요?',options:[
  {label:'혼인하고 함께 살아간다',note:'가족의 형태를 새롭게 정함'},
  {label:'혼인하지 않고 동반자로 지낸다',note:'혼인과 별개로 관계를 이어 감'}
 ]};
 if(choice==='housing')return {age:life.age,title:'주거 계획을 세울 때',description:'저축을 바탕으로 집을 마련할지 선택할 수 있어요.',options:[
  {label:'집을 마련하고 유지비를 부담한다',note:'가상 주거 자산 증가와 취득 비용 지출'},
  {label:'지금의 주거 형태를 유지한다',note:'유동성을 보존하고 이사를 미룸'}
 ]};
 return null;
}
function applyChoice(life,state,event,index){
 const kind=event.choice;
 if(kind==='hobby'){
  state.hobby=['축구','독서','그림','음악'][index];
  state.hobbySince=life.age;
  addMemory(state,'취미:'+state.hobby);
  record(life,state,'hobby-start','어린 시절 '+state.hobby+'(을)를 즐기기 시작했다. 훗날에도 이 경험을 기억하게 될 것이다.','decision');
 }else if(kind==='repair'){
  const cost=2400,finance=state.finance;
  if(index===0){
   finance.debt=cost;finance.originalDebt=cost;finance.yearsLeft=8;
   life.money.netWorth=clamp(life.money.netWorth-cost,-2e7,2e7);
   record(life,state,'repair','생활 대출 2,400점을 빌려 집을 수리했다. 앞으로 8년 동안 갚아야 한다.','decision');
  }else if(index===1){
   life.money.netWorth=clamp(life.money.netWorth-cost,-2e7,2e7);
   record(life,state,'repair','모아 둔 돈으로 집을 수리했다. 지출 때문에 당분간 생활비를 조절하기로 했다.','decision');
  }else{
   life.money.netWorth=clamp(life.money.netWorth-800,-2e7,2e7);
   record(life,state,'repair','가족과 수리비를 나누어 마련했다. 서로 도운 경험이 관계에 남았다.','decision');
   life.change({bonds:2});
  }
  addMemory(state,'주거 수리');
 }else if(kind==='marriage'){
  if(index===0){
   addMemory(state,'혼인');
   record(life,state,'marriage','서로의 선택으로 혼인하고 함께 살아가기로 했다.','decision');
  }else record(life,state,'nonmarital-partner','혼인하지 않고도 동반자로 서로의 삶을 존중하며 지내기로 했다.','decision');
 }else if(kind==='housing'){
  if(index===0){
   state.finance.home=true;
   life.money.netWorth=clamp(life.money.netWorth-1300,-2e7,2e7);
   record(life,state,'housing','자신의 집을 마련했다. 취득 비용과 앞으로의 관리비를 함께 고민하게 되었다.','decision');
  }else record(life,state,'housing','당장 집을 사지 않고 생활과 저축을 더 안정시키기로 했다.','decision');
 }
 state.decisions.push({age:life.age,year:life.year,id:event.id,index});
}
function advance(life,state){
 if(!life.alive||life.pending)return;
 let guard=0;
 while(state.yearQueue.length&&guard++<MAX_QUEUE){
  const event=state.yearQueue.shift();
  if(event.choice){
   state.activeChoice=event;
   life.pending='v9:'+event.id;
   return;
  }
  record(life,state,event.id,event.month+'월 · '+event.text,event.kind);
 }
 state.activeChoice=null;
}
function install(){
 if(!Sim?.Life||!W2?.enrich||!W4?.roll||!W8?.ensure||Sim.Life.prototype.__world9)return false;
 const Life=Sim.Life,tick=Life.prototype.tick,choose=Life.prototype.choose,getChoice=Life.prototype.getChoice,
  reflect=Life.prototype.reflect,snapshot=Life.prototype.snapshot,restore=Life.restore;
 // The existing v1 chronology prunes at 100 entries. Keep the complete v9 lived
 // chronicle within a bounded payload; do not replace its original ordering.
 Life.prototype.logEvent=function(text,kind='life'){
  this.log.push({age:this.age,year:this.year,text:String(text).slice(0,320),kind});
  if(this.log.length>MAX_LOG){
   const extra=this.log.length-MAX_LOG;
   this.log.splice(0,extra);
  }
 };
 Life.prototype.tick=function(){
  if(!this.alive||this.pending)return false;
  const state=ensure(this),before=this.age;
  const ok=tick.call(this);
  if(!ok||this.age===before)return ok;
  if(!this.alive)return ok;
  syncPeople(this);
  families(this,state);
  debtYear(this,state);
  if(state.queueYear!==this.year){
   state.queueYear=this.year;state.annualEvents=0;
   state.yearQueue=eventsForYear(this,state);
  }
  if(!this.pending)advance(this,state);
  return ok;
 };
 Life.prototype.getChoice=function(){
  if(typeof this.pending==='string'&&this.pending.startsWith('v9:')){
   const state=ensure(this);
   return state.activeChoice?prompt(state.activeChoice.choice,this):null;
  }
  return getChoice.call(this);
 };
 Life.prototype.choose=function(index){
  if(typeof this.pending==='string'&&this.pending.startsWith('v9:')){
   const state=ensure(this),event=state.activeChoice,offer=event&&prompt(event.choice,this);
   if(!event||!offer||!Number.isInteger(index)||index<0||index>=offer.options.length)return false;
   this.pending=null;state.activeChoice=null;
   applyChoice(this,state,event,index);
   advance(this,state);
   return true;
  }
  const ok=choose.call(this,index);
  if(ok&&!this.pending)advance(this,syncPeople(this));
  return ok;
 };
 Life.prototype.reflect=function(text){
  const ok=reflect.call(this,text);
  if(ok&&!this.pending)advance(this,syncPeople(this));
  return ok;
 };
 Life.prototype.snapshot=function(){
  const s=ensure(this);
  return {...snapshot.call(this),world9:JSON.parse(JSON.stringify(s))};
 };
 Life.restore=function(data){
  const life=restore.call(this,data);if(!life)return null;
  const saved=data?.world9;
  // Rehydrate with bounded strict fields: old saves are simply initialized.
  const state=ensure(life);
  if(saved&&saved.version===VERSION&&typeof saved==='object'){
   if(Array.isArray(saved.people))state.people=saved.people.slice(0,MAX_PEOPLE)
     .filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Number.isInteger(p.birthYear))
     .map(p=>({id:p.id.slice(0,45),role:String(p.role||'친구').slice(0,25),
      name:p.name.slice(0,55),birthYear:p.birthYear,alive:p.alive!==false,
      relation:clamp(Number(p.relation)||65,0,100),school:String(p.school||'').slice(0,50),
      job:String(p.job||'').slice(0,60),
      milestones:Array.isArray(p.milestones)?p.milestones.filter(x=>typeof x==='string').slice(0,20):[],
      deadYear:Number.isInteger(p.deadYear)?p.deadYear:null}));
   for(const key of ['memories','eventsSeen'])
    if(Array.isArray(saved[key]))state[key]=saved[key].filter(x=>typeof x==='string').slice(0,key==='memories'?80:560);
   if(Array.isArray(saved.decisions))state.decisions=saved.decisions.filter(x=>x&&Number.isInteger(x.age)&&typeof x.id==='string').slice(-75);
   state.hobby=HOBBIES.includes(saved.hobby)?saved.hobby:'';
   state.hobbySince=Number.isInteger(saved.hobbySince)?clamp(saved.hobbySince,0,108):null;
   if(saved.finance&&typeof saved.finance==='object'){
    const f=saved.finance;
    for(const k of ['debt','originalDebt','lastInterest','lastPrincipal'])
     state.finance[k]=Number.isFinite(f[k])?clamp(Math.round(f[k]),0,2e7):0;
    state.finance.yearsLeft=Number.isInteger(f.yearsLeft)?clamp(f.yearsLeft,0,50):0;
    state.finance.rate=.05;state.finance.home=f.home===true;state.finance.paidOff=f.paidOff===true;
   }
   state.queueYear=Number.isInteger(saved.queueYear)?saved.queueYear:-1;
   state.annualEvents=Number.isInteger(saved.annualEvents)?clamp(saved.annualEvents,0,25):0;
   if(Array.isArray(saved.yearQueue))state.yearQueue=saved.yearQueue.slice(0,MAX_QUEUE)
    .filter(e=>e&&typeof e.id==='string'&&typeof e.text==='string'||e&&['hobby','repair','marriage','housing'].includes(e.choice)&&typeof e.id==='string')
    .map(e=>({id:e.id.slice(0,90),text:String(e.text||'').slice(0,250),
     month:clamp(Number(e.month)||5,1,12),kind:String(e.kind||'life9').slice(0,25),
     choice:['hobby','repair','marriage','housing'].includes(e.choice)?e.choice:undefined}));
   const e=saved.activeChoice;
   if(e&&typeof e.id==='string'&&['hobby','repair','marriage','housing'].includes(e.choice))
    state.activeChoice={id:e.id.slice(0,90),choice:e.choice,month:clamp(Number(e.month)||5,1,12)};
   if(typeof data.pending==='string'&&data.pending.startsWith('v9:')&&data.pending==='v9:'+state.activeChoice?.id&&life.alive)
    life.pending=data.pending;
  }
  return life;
 };
 Object.defineProperty(Life.prototype,'__world9',{value:true});
 return true;
}
install();
return Object.freeze({install,ensure,eventsForYear,prompt,advance,syncPeople,VERSION});
});
