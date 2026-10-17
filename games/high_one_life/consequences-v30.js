/* One Life v30: durable links between a person's choice and later opportunities. */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon9);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeConsequences30=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V9){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=(seed,salt)=>{let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;};
const KINDS=Object.freeze({holiday:'aid',seollal:'aid',water:'water',toolLoan:'tool',sickOx:'ox'});
const YEARS={aid:3,water:2,tool:4,ox:3};
const label={aid:'이웃에게 건넨 도움',water:'논의 물길을 둘러싼 약속',tool:'농기구를 빌리고 돌려주는 일',ox:'병든 가축을 돌본 날'};
const personFor=l=>V9?.ensure(l)?.homes?.[0]||null;
function valid(l){return !!(l?.alive&&J?.inOldEra(l)&&l.year<=1899&&l.joseon14?.captivity?.status!=='held');}
function ensure(l){
 if(!l||!J?.isJoseon(l))return null;
 if(!l.life30)l.life30={version:1,processedYear:l.year,arcs:[],queue:[],active:null,history:[],people:{}};
 return l.life30;
}
function remember(l,arc,msg,kind='life30-memory'){
 l.logEvent(msg,kind);
 if(l.log.length)l.log.at(-1).causeId='life30:'+arc.id;
 const s=ensure(l);s.history.push({id:arc.id,year:l.year,text:msg.slice(0,240)});
 s.history=s.history.slice(-65);
}
function record(l,eventId,option,actual){
 if(!valid(l)||!KINDS[eventId])return null;
 // A family visit or holiday game is not the same act as sharing food.
 if((eventId==='holiday'||eventId==='seollal')&&option!==2)return null;
 const s=ensure(l),id=l.year+'-'+eventId;
 if(s.arcs.some(a=>a.id===id))return null;
 const type=KINDS[eventId],person=personFor(l),v=V2.ensure(l),v9=V9.ensure(l);
 // Save the actual object and witness: a scene may be revisited after years.
 const hasGrain=(actual?.delta?.grain||0)<0;
 const arc={id,type,year:l.year,due:l.year+YEARS[type],eventId,option,
  status:'open',personId:person?.id||null,personName:person?.name||'이웃',
  item:type==='aid'?(hasGrain?'곡식':'일손'):type==='tool'?(option===2?'손질한 농기구':'빌린 농기구'):
   type==='ox'?(v9.animals.ox>0?'소':v9.animals.pig>0?'돼지':'닭'):'물꼬와 도랑',
  evidence:[],outcome:null};
 if(type==='aid')arc.evidence.push(hasGrain?'곡식을 나눴다는 기억':'함께 일을 도왔다는 기억');
 if(type==='water')arc.evidence.push(option===1?'윗논 주인과 생긴 다툼':'물 대는 차례를 둘러싼 약속');
 if(type==='tool')arc.evidence.push(option===0?'이웃에게 빌린 농기구':option===1?'품삯을 주고 빌린 농기구':'손질해 둔 집안 농기구');
 if(type==='ox')arc.evidence.push('가축을 돌본 방법과 상태');
 s.arcs.push(arc);s.arcs=s.arcs.slice(-32);
 if(person)s.people[person.id]??={id:person.id,name:person.name,present:true,leftYear:null};
 remember(l,arc,label[type]+'을 기억해 두었다. 언젠가 같은 사람이나 물건을 다시 만날 수도 있다.');
 return arc;
}
function canOpen(l,arc){
 if(!valid(l)||arc.status!=='open'||l.year<arc.due)return false;
 if(['aid','water','tool'].includes(arc.type)&&arc.personId){
  const p=ensure(l).people[arc.personId],neighbor=V9.ensure(l).homes.find(h=>h.id===arc.personId);
  if(!neighbor||p?.present===false){close(l,arc,'함께한 이웃이 마을을 떠나 예전의 약속을 이어 가기 어려워졌다.');return false;}
  // A real change in the other household's situation; no guaranteed quid pro quo.
  if(hash(l.seed,arc.due*41+arc.id.length*83)<.13){
   if(p){p.present=false;p.leftYear=l.year;}
   close(l,arc,arc.personName+'네가 다른 고을로 떠났다는 소식을 들었다. 지난 인연은 마음에 남았다.');
   return false;
  }
 }
 if(arc.type==='water'){
  const j=J.ensure(l),origin=String(l.joseon5?.origin||'');
  if(j.land<=0&&!origin.includes('소작')){
   close(l,arc,'이제 집안에서 그 논을 일구지 않아 물길을 두고 이어졌던 다툼도 끝났다.');
   return false;
  }
 }
 if(arc.type==='ox'){
  const animals=V9.ensure(l).animals;
  const count=arc.item==='소'?animals.ox:arc.item==='돼지'?animals.pig:animals.chicken;
  if(count<=0){close(l,arc,'그때 앓던 가축은 이미 집안에 없다. 돌보던 일은 지난 기억이 되었다.');return false;}
 }
 return true;
}
function close(l,arc,text){
 if(arc.status==='closed'||arc.status==='resolved')return;
 arc.status='closed';arc.outcome=text;remember(l,arc,text,'life30-result');
}
function queueDue(l){
 const s=ensure(l);if(!s||!valid(l))return;
 for(const arc of s.arcs){
  if(arc.status!=='open'||arc.due>l.year||s.queue.includes(arc.id)||s.active?.id===arc.id)continue;
  if(canOpen(l,arc))s.queue.push(arc.id);
 }
 s.queue=s.queue.slice(-8);
}
function promote(l){
 const s=ensure(l);if(!s||!valid(l)||s.active||l.pending)return;
 queueDue(l);
 while(s.queue.length&&!s.active){
  const id=s.queue.shift(),arc=s.arcs.find(a=>a.id===id);
  if(arc?.status==='open'&&canOpen(l,arc)){
   s.active={id,year:l.year};l.pending='life30:'+id;
  }
 }
}
function prompt(l){
 const s=ensure(l),arc=s?.arcs.find(a=>a.id===s.active?.id);
 if(!arc)return null;
 const person=arc.personName,neighbor=V9.ensure(l).homes.find(p=>p.id===arc.personId);
 const withOption=(label,note)=>({label,note,action:label});
 if(arc.type==='aid'){
  const affluent=!!neighbor&&neighbor.wealth>=45;
  return {title:'다시 만난 '+person,description:arc.year+'년에 '+(arc.item==='곡식'?'곡식을 나눴던':'일손을 보탰던')+' 이웃을 다시 만났다. 그 집도 그동안 다른 어려움을 겪었다. 고마워하던 사람이 반드시 빚을 갚아야 하는 것은 아니다.',options:[
   withOption(affluent?'고맙다며 가져온 보리 세 되를 받는다':'함께 밭두렁을 손질하며 하루 품을 나눈다',
    affluent?'이웃집 수확이 여유로운 해라 보리를 내놓았다. 받으면 우리 집 양식이 늘고 이웃의 몫은 줄어든다.':'이웃도 곡식이 넉넉하지 않다. 대신 함께 둑을 고쳐 일손을 나눈다.'),
   withOption('먹을 것은 각자 지키고 다음 장날을 약속한다','어려웠던 일을 기억하되 서로의 살림에 부담을 얹지 않는다.'),
   withOption('그때 도왔던 일은 따로 갚을 필요가 없다고 말한다','그때의 도움을 빚으로 만들지 않는다. 앞으로의 관계는 다시 만나며 쌓아 간다.')
  ]};
 }
 if(arc.type==='water')return {title:'다시 찾아온 논의 물길',
  description:arc.year+'년에 '+(arc.option===1?'몰래 물꼬를 열어 윗논 주인과 다퉜다.':'윗논과 아랫논의 물 대는 일을 의논했다.')+' 올해 가뭄이 다시 찾아와 두 집이 물꼬 앞에 섰다.',
  options:[
   withOption('지난 약속을 확인하고 물 대는 날짜를 정한다','서로 차례를 지켜야 한다. 일부러 물을 독차지하면 약속은 깨질 수 있다.'),
   withOption('도랑을 함께 파서 물길을 정비한다','우리 집 살림돈이 넉넉하면 재료를 사고, 돈이 모자라면 직접 더 많이 일해야 한다.'),
   withOption('올해 물이 모자란다는 사실을 인정하고 다른 밭일부터 한다','급하게 물꼬를 빼앗지 않지만 이번 철 작황은 나아지지 않을 수 있다.')
  ]};
 if(arc.type==='tool'){
  const borrowed=arc.option!==2;
  return {title:borrowed?'빌린 농기구를 돌려줄 때':'손질한 농기구가 다시 필요한 날',
   description:borrowed?arc.year+'년에 빌려 쓴 '+arc.item+'를 돌려줄 때가 되었다. '+person+'네도 농사가 바빠 도구를 기다린다.':'몇 년 전 손질해 두었던 집안 농기구를 다시 꺼냈다. 날이 무뎌지고 자루가 헐거워졌다.',
   options:[
    withOption(borrowed?'농기구를 닦아 약속한 사람에게 돌려준다':'농기구의 날과 자루를 다시 손질한다','도구와 약속을 지키는 데에는 시간과 손질할 일손이 필요하다.'),
    withOption(borrowed?'품일을 하루 더 거들고 농기구를 돌려준다':'이웃과 서로의 도구를 손질하는 날을 잡는다','다른 집과 일손을 주고받을 수 있지만 그날 우리 집 일은 미뤄진다.'),
    withOption(borrowed?'부러진 부분을 알리고 고쳐 줄 방법을 의논한다':'낡은 도구를 무리하게 쓰지 않고 교체할 길을 찾는다','도구를 당장 쓸 수 없게 되거나 새 재료가 필요할 수 있다.')
   ]};
 }
 return {title:'그때 앓던 '+arc.item,description:arc.year+'년에 아팠던 '+arc.item+'의 먹이와 상태를 다시 살폈다. 예전에 돌본 방법이 참고는 되지만 반드시 회복하는 것은 아니다.',
  options:[
   withOption('먹이를 조절하고 며칠 더 상태를 살핀다','먹이와 돌볼 일손이 더 필요하다. 회복 여부는 지켜봐야 한다.'),
   withOption('경험 있는 이웃에게 짐승의 상태를 보여 준다','증상을 설명하고 돌보는 방법을 다시 묻는다. 도움을 받았다고 반드시 낫는 것은 아니다.'),
   withOption('병든 짐승의 일을 줄이고 건강한 가축을 따로 돌본다','무리하게 일을 시키지 않는다. 짐승이 회복하지 못할 위험은 남는다.')
 ]};
}
function resolve(l,index){
 const s=ensure(l),arc=s?.arcs.find(a=>a.id===s.active?.id);
 if(!valid(l)||!arc||arc.status!=='open'||!Number.isInteger(index)||index<0||index>2)return false;
 const v=V2.ensure(l),v9=V9.ensure(l),j=J.ensure(l),person=v9.homes.find(p=>p.id===arc.personId);
 const choice=prompt(l)?.options?.[index];if(!choice)return false;
 if(arc.type==='aid'){
  if(index===0){
   if(person?.wealth>=45){v.grain=clamp(v.grain+3,0,200);person.wealth=clamp(person.wealth-9,0,120);
    arc.outcome=person.name+'네가 자기 집 수확에서 보리 세 되를 덜어 주었다. 서로의 곳간 사정이 조금씩 바뀌었다.';
   }else{l.change({health:-2,bonds:2});arc.outcome=arc.personName+'와 둑을 고치며 일을 나눴다. 곡식을 받은 것은 아니었다.';}
  }else if(index===1){arc.outcome='장날에 다시 만나기로 했다. 그동안 서로에게 무리한 부탁은 하지 않기로 했다.';}
  else arc.outcome='지난 도움은 갚지 않아도 좋다고 말했다. 그 일을 빚으로 남기지 않았다.';
 }else if(arc.type==='water'){
  if(index===0){v9.water=clamp(v9.water+8,0,100);v9.trust=clamp(v9.trust+4,0,100);
   arc.outcome='윗논과 아랫논에서 물을 쓸 순서를 다시 적었다. 이번 철의 물길이 조금 나아졌다.';
  }else if(index===1){const paid=j.capital>=3;if(paid)j.capital-=3;else l.change({health:-3});
   v9.water=clamp(v9.water+10,0,100);
   arc.outcome=paid?'도랑을 고칠 재료를 사고 이웃과 함께 물길을 정비했다.':'돈이 부족해 직접 도랑을 파느라 몸이 고단했다. 물길은 조금 나아졌다.';
  }else arc.outcome='물 대는 차례를 다투지 않고 다른 밭일을 했다. 부족한 물은 그대로였다.';
 }else if(arc.type==='tool'){
  if(index===0)arc.outcome=arc.option===2?'낡은 농기구를 다시 손질했다. 새 도구가 생긴 것은 아니었다.':'빌린 농기구를 손질해 약속한 집에 돌려주었다.';
  else if(index===1){l.change({health:-2});if(person)person.trust=clamp(person.trust+2,0,100);
   arc.outcome='이웃과 하루 일손을 나누며 농기구 문제를 마무리했다.';}
  else{arc.outcome=arc.option===2?'고칠 수 없는 부분을 확인하고 새 재료를 구할 길을 찾았다.':'농기구의 파손을 숨기지 않고 이웃과 고칠 방법을 의논했다.';}
 }else{
  if(index===0){if(v.grain>=2)v.grain-=2;else l.change({health:-2});}
  if(index===1&&person)person.trust=clamp(person.trust+2,0,100);
  const animal=arc.item==='소'?'ox':arc.item==='돼지'?'pig':'chicken';
  const chance=[.10,.15,.23][index];const ill=hash(l.seed,l.year*379+arc.id.length*47+index*13)<chance;
  if(ill&&v9.animals[animal]>0){
   v9.animals[animal]--;arc.outcome='그동안 돌보던 '+arc.item+'의 병세가 끝내 나빠져 잃었다. 돌봄의 선택이 모든 병을 막을 수는 없었다.';
  }else arc.outcome='먹이와 몸 상태를 계속 살핀 결과 '+arc.item+'가 조금씩 기운을 되찾았다. 앞으로도 돌봐야 한다.';
 }
 arc.status='resolved';arc.resolvedYear=l.year;arc.resolution=index;
 const id=arc.id;
 remember(l,arc,arc.outcome,'life30-result');
 remember(l,arc,'다시 마주한 일 — '+choice.label,'life30-choice');
 s.active=null;l.pending=null;promote(l);return true;
}
function yearly(l){
 const s=ensure(l);if(!s||!valid(l)||s.processedYear>=l.year)return;
 s.processedYear=l.year;promote(l);
}
function summary(l){
 const s=ensure(l);if(!s)return null;
 return {open:s.arcs.filter(a=>a.status==='open').length,
  resolved:s.arcs.filter(a=>a.status==='resolved').length,
  arcs:s.arcs.map(a=>({id:a.id,type:a.type,title:label[a.type],year:a.year,due:a.due,
   status:a.status,personName:a.personName,item:a.item,evidence:[...a.evidence],outcome:a.outcome}))};
}
function hydrate(l,data){
 const s=ensure(l),saved=data?.life30;if(!s||!saved||saved.version!==1)return s;
 const people=new Map(V9.ensure(l).homes.map(p=>[p.id,p]));
 const validArc=a=>a&&typeof a.id==='string'&&Object.values(KINDS).includes(a.type)&&
  Number.isInteger(a.year)&&a.year>=l.birthYear&&a.year<=l.year&&
  Number.isInteger(a.due)&&a.due>=a.year&&a.due<=a.year+10&&[0,1,2].includes(a.option);
 s.arcs=Array.isArray(saved.arcs)?saved.arcs.filter(validArc).slice(-32).map(a=>({
  id:a.id.slice(0,80),type:a.type,eventId:String(a.eventId||'').slice(0,40),
  year:a.year,due:a.due,option:a.option,
  personId:people.has(a.personId)?a.personId:null,
  personName:people.get(a.personId)?.name||String(a.personName||'이웃').slice(0,30),
  item:String(a.item||'물건').slice(0,25),
  status:['open','resolved','closed'].includes(a.status)?a.status:'closed',
  evidence:Array.isArray(a.evidence)?a.evidence.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,120)):[],
  outcome:typeof a.outcome==='string'?a.outcome.slice(0,240):null,
  resolvedYear:Number.isInteger(a.resolvedYear)?clamp(a.resolvedYear,a.year,l.year):null,
  resolution:[0,1,2].includes(a.resolution)?a.resolution:null
 })):[];
 s.people={};if(saved.people&&typeof saved.people==='object')for(const [id,p]of Object.entries(saved.people)){
  if(people.has(id))s.people[id]={id,name:people.get(id).name,present:p?.present!==false,
   leftYear:Number.isInteger(p?.leftYear)?clamp(p.leftYear,l.birthYear,l.year):null};
 }
 s.processedYear=Number.isInteger(saved.processedYear)?clamp(saved.processedYear,l.birthYear,l.year):l.year;
 s.history=Array.isArray(saved.history)?saved.history.filter(x=>x&&typeof x.text==='string'&&Number.isInteger(x.year)&&x.year<=l.year).slice(-65)
  .map(x=>({id:String(x.id||'').slice(0,80),year:x.year,text:x.text.slice(0,240)})):[];
 const ids=new Set(s.arcs.filter(a=>a.status==='open').map(a=>a.id));
 s.queue=Array.isArray(saved.queue)?saved.queue.filter(id=>ids.has(id)).slice(-8):[];
 s.active=saved.active&&ids.has(saved.active.id)&&data?.pending==='life30:'+saved.active.id&&l.alive&&J.inOldEra(l)
  ?{id:saved.active.id,year:l.year}:null;
 if(s.active)l.pending='life30:'+s.active.id;
 return s;
}
function install(){
 if(!Sim?.Life||!J?.inOldEra||!V2?.ensure||!V9?.ensure||Sim.Life.prototype.__life30)return false;
 const L=Sim.Life,pt=L.prototype.tick,pc=L.prototype.choose,pg=L.prototype.getChoice,
  pr=L.prototype.reflect,ps=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){
  const before=this.year,ok=pt.call(this);
  if(ok&&this.year!==before&&valid(this))yearly(this);
  return ok;
 };
 L.prototype.getChoice=function(){
  if(typeof this.pending==='string'&&this.pending.startsWith('life30:'))return prompt(this);
  return pg.call(this);
 };
 L.prototype.choose=function(index){
  if(typeof this.pending==='string'&&this.pending.startsWith('life30:'))return resolve(this,index);
  const pending=typeof this.pending==='string'?this.pending:'';
  const eventId=pending.startsWith('joseon9:')?V9.ensure(this)?.active?.eventId:null;
  const choice=eventId?V9.choiceFor(this,V9.EVENTS.find(e=>e.id===eventId),index):null;
  const ok=pc.call(this,index);
  if(ok&&eventId&&KINDS[eventId]&&[0,1,2].includes(index))record(this,eventId,index,choice);
  if(ok&&valid(this))promote(this);
  return ok;
 };
 L.prototype.reflect=function(text){const ok=pr.call(this,text);if(ok&&valid(this))promote(this);return ok;};
 L.prototype.snapshot=function(){const data=ps.call(this);if(this.life30)data.life30=JSON.parse(JSON.stringify(this.life30));return data;};
 L.restore=function(data){const l=restore.call(this,data);if(l&&data?.life30)hydrate(l,data);return l;};
 Object.defineProperty(L.prototype,'__life30',{value:true});
 return true;
}
install();
return Object.freeze({KINDS,YEARS,ensure,record,prompt,resolve,yearly,summary,hydrate,install,promote});
});
