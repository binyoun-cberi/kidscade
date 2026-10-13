/* One Life - Joseon family chronicle.
 * Fictional life histories for named relatives; dates, lifespan outcomes and
 * household statistics are gameplay inventions, not historical estimates.
 * Runs only for births before 1900 and during Joseon-era gameplay.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon3);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon4=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V3){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash(seed,salt){
 let n=((seed>>>0)^Math.imul(salt+113,0x9e3779b9))>>>0;
 n=Math.imul(n^(n>>>16),0x7feb352d);
 n=Math.imul(n^(n>>>15),0x846ca68b);
 return ((n^(n>>>16))>>>0)/4294967296;
}
const BOY=['돌쇠','복동','만수','길동','춘식','덕수','영수','명수','성복','재수','철수','봉구'];
const GIRL=['분이','순이','복순','덕이','춘희','금이','영희','점순','달래','연이','정이','옥이'];
const TRAITS=['부지런한','다정한','조용한','호기심 많은','꼼꼼한','신중한','활달한'];
const ROLES={mother:'어머니',father:'아버지',sibling:'형제자매',spouse:'배우자',child:'자녀'};

// Names in dialogue need grammatical endings, not an unconditional '가' or '와'.
const particle=(n,closed,open)=>{const s=String(n),code=s.charCodeAt(s.length-1);return s+(code>=44032&&code<=55203&&(code-44032)%28?closed:open);};
function rememberedRelative(person,action){
 const n=person.name,withPerson=particle(n,'과','와');
 const lines={
  help:withPerson+' 일손을 나누던 날이 떠올랐다.',
  support:n+'에게 보낸 곡식이 어려웠던 철에 도움이 되었다.',
  visit:n+'의 안부를 살피러 갔던 날을 기억한다.',
  teach:n+'에게 일러 준 글자를 이제 장부에서 찾아 읽었다.',
  work:n+'에게 가르친 손기술이 실제 살림에 쓰이기 시작했다.',
  listen:n+'의 이야기를 끝까지 들은 뒤 서로 나누는 말이 늘었다.',
  settle:n+'에게 소개했던 일터에서 반가운 소식이 왔다.',
  journey:n+'에게서 다른 고을의 소식을 담은 편지가 도착했다.',
  inherit:n+'에게 맡긴 생업이 다음 계절의 살림을 지탱했다.',
  sharework:withPerson+' 일손을 나누며 바쁜 철을 넘겼다.',
  gift:n+'에게 건넸던 작은 물건을 아직 간직하고 있었다.',
  plan:withPerson+' 아껴 둔 곡식이 필요한 날에 쓰였다.',
  kinwork:withPerson+' 함께 일을 해낸 날이 떠올랐다.',
  encourage:particle(n,'은','는')+' 그때 건넨 격려를 기억한다고 했다.',
  talk:withPerson+' 집안 살림을 의논했던 날이 생각났다.',
  remember:withPerson+' 지냈던 때가 떠올랐다.'
 };
 return person.alive?lines[action]||'함께 지낸 날이 떠올랐다.':'세상을 떠난 '+n+'의 목소리가 떠올랐다. '+(lines[action]||'');
}

function person(life,id,role,birthYear,sex){
 const salt=role==='mother'?70:role==='father'?72:role==='spouse'?74:role==='child'?80:84;
 const n=Math.floor(hash(life.seed,salt+birthYear+id.length)*12);
 const trait=TRAITS[Math.floor(hash(life.seed,salt+id.length+185)*TRAITS.length)];
 return {id,role,name:(sex==='여자'?GIRL:BOY)[n],sex,birthYear,
  trait,alive:true,relation:clamp(52+Math.floor(hash(life.seed,salt+birthYear)*31),35,94),
  wellbeing:clamp(70+Math.floor(hash(life.seed,salt+yearNumber(id))*23),40,100),
  learning:0,atHome:role!=='sibling'||life.birthYear-birthYear<22,joinedYear:null,work:role==='mother'||role==='father'?'집안과 생업을 돌봄':role==='child'?'자라는 중':'집안의 일',
  married:false,lifeYears:59+Math.floor(hash(life.seed,salt+yearNumber(id)+299)*33),
  diedYear:null};
}
function yearNumber(id){return [...id].reduce((n,c)=>n+c.charCodeAt(0),0);}
function uniqueName(people,p){
 const choices=p.sex==='여자'?GIRL:BOY;
 const at=choices.indexOf(p.name);
 for(let i=0;i<choices.length;i++){
  const candidate=choices[(Math.max(0,at)+i)%choices.length];
  if(!people.some(x=>x.name===candidate)){p.name=candidate;return p;}
 }
 return p;
}
function makeState(life){
 const p=J.ensure(life),n=Math.min(3,Math.max(0,life.profile.siblings||0)),birth=life.birthYear;
 const motherAge=clamp(life.profile.motherAge||29,18,49),
  fatherAge=clamp(life.profile.fatherAge||32,18,59);
 const people=[
  person(life,'mother','mother',birth-motherAge,'여자'),
  person(life,'father','father',birth-fatherAge,'남자')
 ];
 for(let i=0;i<n;i++){
  const difference=Math.floor(hash(life.seed,510+i)*13)-6;
  people.push(uniqueName(people,person(life,'sibling-'+i,'sibling',birth+difference,hash(life.seed,529+i)<.48?'여자':'남자')));
 }
 const state={version:4,processedYear:life.year,people,queue:[],active:null,
  decisions:[],memories:[],recent:[],seen:[],followups:[],careYears:0,legacies:0};
 // Older saved games had only married/children counters. Reconstruct cautiously.
 if(p.married)addSpouse(life,state,life.birthYear+19);
 if(p.children>0)addChild(life,state,life.birthYear+25);
 return state;
}
function addSpouse(life,s,marriageYear){
 if(s.people.some(x=>x.role==='spouse'))return;
 const sex=life.gender==='남자'?'여자':'남자';
 const ageAtMarriage=clamp(18+Math.floor(hash(life.seed,690)*7),17,30);
 const spouse=person(life,'spouse','spouse',marriageYear-ageAtMarriage,sex);
 spouse.joinedYear=marriageYear;spouse.work='집안과 생업을 함께 돌봄';s.people.push(uniqueName(s.people,spouse));
 if(marriageYear===life.year)
  remember(life,s,particle(spouse.name,'과','와')+' 혼인하고 한집에서 새로운 생활을 시작했다.','joseon4-family');
}
function addChild(life,s,bornYear){
 if(s.people.filter(x=>x.role==='child').length>=6)return;
 const id='child-'+s.people.filter(x=>x.role==='child').length;
 const child=person(life,id,'child',bornYear,hash(life.seed,bornYear+456)<.50?'여자':'남자');
 s.people.push(uniqueName(s.people,child));
 if(bornYear===life.year)
  remember(life,s,particle(child.name,'이','가')+' 태어났다. 아이의 울음소리가 집안에 퍼졌다.','joseon4-family');
}
function age(person,year){return Math.max(0,year-person.birthYear);}
function living(s,role,year=Infinity){return s.people.filter(x=>x.alive&&x.birthYear<=year&&(!role||x.role===role));}
function remember(life,s,message,kind='joseon4-family'){
 life.logEvent(message,kind);
 s.recent.push(message);s.recent=s.recent.slice(-12);
 if(kind==='joseon4-memory')s.memories.push(message);
 s.memories=s.memories.slice(-20);
}
function sync(life,s){
 const j=J.ensure(life);
 if(!j)return;
 const spouse=s.people.find(x=>x.role==='spouse');
 if(spouse&&!spouse.alive)j.married=false;
 if(life.year<1900)j.household=clamp(1+living(s,null,life.year).filter(x=>x.atHome!==false).length,1,8);
}
function catchUp(life,s){
 const j=J.ensure(life),modern=life.year>=1900;
 const known=modern&&Array.isArray(life.world9?.people)?life.world9.people:[];
 const partner=known.find(x=>x.id==='partner'&&x.alive);
 const existing=s.people.find(x=>x.role==='spouse'&&x.alive);
 if(existing&&partner){partner.name=existing.name;partner.birthYear=existing.birthYear;}
 if(!s.people.some(x=>x.role==='spouse')&&(j.married||(modern&&(life.profile.partner||partner)))){
  addSpouse(life,s,modern?life.year:life.birthYear+19);
  const p=s.people.find(x=>x.role==='spouse');
  if(p&&partner){p.name=String(partner.name||p.name).slice(0,24);p.birthYear=partner.birthYear;p.joinedYear=life.year;}
 }else if(modern&&!existing&&life.profile.partner&&!s.people.some(x=>x.id==='spouse-modern')&&s.people.length<12){
  const p=person(life,'spouse-modern','spouse',partner?.birthYear??life.year-24,life.gender==='남자'?'여자':'남자');
  p.name=String(partner?.name||p.name).slice(0,24);p.joinedYear=life.year;
  p.work='집안과 생업을 함께 돌봄';s.people.push(uniqueName(s.people,p));
  remember(life,s,particle(p.name,'과','와')+' 함께 새 살림을 꾸리기 시작했다.','joseon4-family');
 }
 while(s.people.filter(x=>x.role==='child').length<j.children&&s.people.length<12){
  const ordinal=s.people.filter(x=>x.role==='child').length;
  addChild(life,s,life.year-ordinal*3);
 }
 const modernChild=known.find(x=>x.role==='자녀'&&x.alive);
 const livingChild=s.people.find(x=>x.role==='child'&&x.alive);
 if(modern&&modernChild&&livingChild){
  modernChild.name=livingChild.name;modernChild.birthYear=livingChild.birthYear;
 }
 if(modern&&(life.profile.child||modernChild)&&!livingChild&&s.people.length<12){
  if(s.people.some(x=>x.id==='child-modern')){
   // A deceased child must never be silently brought back to life.
   life.profile.child=false;
  }else{
   const child=person(life,'child-modern','child',modernChild?.birthYear??life.year,modernChild?.sex==='남자'?'남자':'여자');
   child.name=String(modernChild?.name||child.name).slice(0,24);
   s.people.push(uniqueName(s.people,child));
   remember(life,s,particle(child.name,'이','가')+' 가족이 되었다. 새로운 세대의 이야기가 시작되었다.','joseon4-family');
  }
 }
 sync(life,s);
}
function ensure(life){
 if(!J?.isJoseon(life))return null;
 if(!life.joseon4){life.joseon4=makeState(life);sync(life,life.joseon4);}
 return life.joseon4;
}
function enqueue(life,s,kind,p){
 const id=life.year+'-'+kind+'-'+p.id;
 if(s.decisions.some(x=>x.id===id)||s.active?.id===id||s.queue.some(x=>x.id===id))return;
 if(s.queue.length>=8)return;
 s.queue.push({id,kind,personId:p.id,year:life.year});
 promote(life,s);
}
function promote(life,s){
 if(!s||s.active||life.pending||!life.alive||!J.isJoseon(life)||!s.queue.length||s.decisions.some(d=>d.year===life.year))return;
 s.active=s.queue.shift();
 life.pending='joseon4:'+s.active.id;
}
function options(type,p){
 const op=(label,note,action,effects)=>({label,note,action,effects});
 if(type==='elders')return [
  op('부모님 곁에서 일손을 돕는다','한 해의 생업에 시간을 나누어 쓴다','help',{bonds:7,health:-2}),
  op('곡식과 살림을 보탠다','비축한 곡식이나 재산을 나누어 드린다','support',{bonds:5,wealth:-5}),
  op('안부를 더 자주 살핀다','일을 멈추지 못하더라도 시간을 내어 함께한다','visit',{happiness:3,bonds:4})];
 if(type==='child-school')return [
  op('아이에게 글과 셈을 알려 준다','집안의 시간과 비용을 내어 글공부를 돕는다','teach',{knowledge:3,wealth:-3,bonds:5}),
  op('마을의 생업을 함께 익힌다','지금 살아가는 데 필요한 도구와 솜씨를 가르친다','work',{bonds:5,wealth:2}),
  op('아이의 관심을 물어본다','원하는 일을 찾아볼 수 있도록 시간을 준다','listen',{happiness:5,bonds:6})];
 if(type==='child-grown')return [
  op('마을에서 일할 기회를 돕는다','익숙한 고을에서 기술과 관계를 잇는다','settle',{bonds:6,wealth:-3}),
  op('다른 고을의 기회를 알아본다','가족과 떨어질 수 있어도 새로운 길을 찾아본다','journey',{knowledge:5,bonds:-2}),
  op('집안 생업을 함께 이어 간다','일과 살림의 책임을 나누어 맡는다','inherit',{wealth:5,bonds:4})];
 if(type==='spouse')return [
  op('함께 장터와 집안일을 살핀다','서로의 일이 어떤지 듣고 힘을 보탠다','sharework',{bonds:7,wealth:2}),
  op('작은 선물과 시간을 마련한다','빠듯한 살림에서도 둘만의 시간을 보낸다','gift',{happiness:7,wealth:-3}),
  op('다음 계절을 위한 살림을 의논한다','함께 쓸 곡식과 돈을 헤아린다','plan',{knowledge:3,bonds:4})];
 if(type==='sibling')return [
  op('일손을 함께 나눈다','먼저 손을 내밀어 서로의 어려움을 덜어 준다','kinwork',{bonds:5,health:-2}),
  op('형제자매의 새 생업을 응원한다','함께하지 않더라도 서로의 선택을 존중한다','encourage',{happiness:5,bonds:3}),
  op('집안 형편을 함께 의논한다','곡식과 돈을 어떻게 모을지 의견을 나눈다','talk',{knowledge:4,bonds:4})];
 return [];
}
const TITLES={
 elders:'나이 든 부모님을 어떻게 모실까?',
 'child-school':'아이의 배움을 어떻게 도울까?',
 'child-grown':'성인이 된 아이의 앞날',
 spouse:'함께 살아가는 사람의 이야기',
 sibling:'형제자매의 부탁'
};
function prompt(life){
 const s=ensure(life),q=s?.active;if(!q)return null;
 const p=s.people.find(x=>x.id===q.personId);
 if(!p?.alive){return {title:'가족을 기억하는 날',description:'집안의 소식을 돌아본다.',
  options:[{label:'지난날을 기억한다',note:'함께한 시간을 마음에 남긴다',action:'remember',effects:{bonds:1}}]};}
 return {title:TITLES[q.kind],description:particle(p.name,'은','는')+' '+age(p,life.year)+'세의 '+ROLES[p.role]+'다. '+p.trait+' 성격으로 '+p.work+'에 마음을 쓰고 있다.',
  options:options(q.kind,p)};
}
const OUTCOMES={
 help:'부모님과 함께 나누었던 일이 오래도록 기억에 남았다.',
 support:'살림을 나눴던 덕분에 어려운 계절을 서로 도울 수 있었다.',
 visit:'안부를 나누던 시간이 집안의 작은 위안이 되었다.',
 teach:'함께 익혔던 글이 일상에서 조금씩 도움이 되었다.',
 work:'함께 익힌 손기술이 자라서 맡은 일에 보탬이 되었다.',
 listen:'아이의 이야기를 들었던 일이 서로를 믿는 기억으로 남았다.',
 settle:'고향에서 연결해 준 일자리가 새로운 생업의 시작이 되었다.',
 journey:'먼 고을로 나선 가족에게서 새로운 소식이 전해졌다.',
 inherit:'가족과 나눈 일이 다음 계절의 살림에도 보탬이 되었다.',
 sharework:'서로의 일손을 도우면서 집안의 살림도 조금 나아졌다.',
 gift:'함께 보냈던 시간이 바쁜 날에 떠올랐다.',
 plan:'함께 의논해 모아 둔 곡식이 필요할 때 도움이 되었다.',
 kinwork:'일을 나누었던 형제자매와 다시 서로를 도왔다.',
 encourage:'형제자매에게 건넨 응원이 오래 기억되었다.',
 talk:'집안의 살림을 함께 의논한 일이 후회로 남지 않았다.',
 remember:'함께한 시간을 떠올렸다.'
};
function choose(life,index){
 const s=ensure(life),q=s?.active,p=prompt(life);
 if(!q||!p||!Number.isInteger(index)||index<0||index>=p.options.length||!life.alive)return false;
 const selected=p.options[index],who=s.people.find(x=>x.id===q.personId),a=selected.action;
 life.change(selected.effects);
 const j=J.ensure(life),v=V2.ensure(life),memory=V3.ensure(life);
 const modern=life.year>=1900,netBefore=life.money?.netWorth??0,capitalBefore=j.capital;
 if(who){
  const relationDelta=['gift','visit','listen','teach','sharework','help','support','kinwork'].includes(a)?9:5;
  who.relation=clamp(who.relation+relationDelta,0,100);
  who.wellbeing=clamp(who.wellbeing+(['support','help','visit'].includes(a)?8:2),0,100);
 }
 if(a==='support'){j.capital-=9;if(v.grain>=7)v.grain-=7;s.careYears++;}
 if(a==='help'||a==='visit')s.careYears++;
 if(a==='teach'&&who){who.learning+=3;j.capital-=5;}
 if(a==='work'&&who){who.work='집안의 생업을 배우는 중';who.learning++;}
 if(a==='listen'&&who){who.learning+=2;}
 if(a==='settle'&&who){who.work='마을에서 일하는 중';j.capital-=4;}
 if(a==='journey'&&who){who.work='다른 고을에서 일하는 중';who.atHome=false;who.relation=clamp(who.relation-5,0,100);s.legacies++;}
 if(a==='inherit'&&who){who.work='가족의 생업을 함께 이음';who.atHome=true;j.capital+=6;s.legacies++;}
 if(a==='sharework'){j.capital+=4;}
 if(a==='gift'){j.capital-=4;}
 if(a==='plan'){v.grain=clamp(v.grain+10,0,200);}
 if(a==='kinwork'){j.capital+=3;}
 if(a==='talk'){v.grain=clamp(v.grain+5,0,200);}
 if(who&&memory)memory.kinship=clamp(memory.kinship+3,0,100);
 j.capital=clamp(j.capital,-120,600);
 if(life.money)life.money.netWorth=modern?netBefore+(j.capital-capitalBefore)*100:j.capital*100;
 s.decisions.push({id:q.id,kind:q.kind,personId:q.personId,year:life.year,action:a,label:selected.label});
 s.decisions=s.decisions.slice(-36);
 s.followups.push({id:q.id,year:life.year+3,personId:q.personId,action:a});s.followups=s.followups.slice(-24);
 remember(life,s,p.title+' — '+selected.label,'joseon4-choice');
 life.log.at(-1).causeId='joseon4:'+q.id;
 s.active=null;life.pending=null;promote(life,s);
 return true;
}
function afterYear(life){
 const s=ensure(life);
 if(!s||!J.isJoseon(life)||!life.alive||s.processedYear>=life.year)return;
 s.processedYear=life.year;
 catchUp(life,s);
 const year=life.year,j=J.ensure(life),v=V2.ensure(life);
 for(const effect of s.followups.filter(x=>x.year<=year)){
  const relative=s.people.find(p=>p.id===effect.personId);
  const sentence=relative?rememberedRelative(relative,effect.action):OUTCOMES[effect.action];
  if(sentence){remember(life,s,sentence,'joseon4-followup');if(effect.id)life.log.at(-1).causeId='joseon4:'+effect.id;s.memories.push(sentence);s.memories=s.memories.slice(-20);}
  if(year<1900&&['support','plan','inherit','talk'].includes(effect.action))v.grain=clamp(v.grain+3,0,200);
 }
 s.followups=s.followups.filter(x=>x.year>year);
 for(const p of s.people){
  if(!p.alive||p.birthYear>year)continue;
  const years=age(p,year);
  if(p.role==='sibling'&&p.birthYear===year)remember(life,s,particle(p.name,'이','가')+' 태어나 형제자매가 늘었다.','joseon4-family');
  const troubled=year<=j.hardshipUntil||year<=v.scarcityUntil;
  const stress=troubled&&hash(life.seed,year+yearNumber(p.id)+171)<.22;
  if(stress){p.wellbeing=clamp(p.wellbeing-5,0,100);
   if(p.role==='child'&&years<=12&&hash(life.seed,year+yearNumber(p.id)+172)<.22)
    remember(life,s,particle(p.name,'이','가')+' 몸이 불편한 날을 보내 집안에서 번갈아 보살폈다.','joseon4-memory');
  }
  const youngHardship=(troubled||p.wellbeing<42)&&years<16&&
   hash(life.seed,year+yearNumber(p.id)+380)<(troubled?.025:.008);
  if(youngHardship||years>=p.lifeYears+(p.wellbeing>85?3:0)){
   p.alive=false;p.diedYear=year;
   remember(life,s,particle(p.name,'은','는')+' 세상을 떠났다. 집안에 빈자리가 생겼다.','joseon4-memory');
   life.change({happiness:-5,bonds:-3});
   if(p.role==='spouse'){
    j.married=false;
    const current=life.world9?.people?.find(x=>x.id==='partner'&&x.alive);
    if(current){current.alive=false;current.deadYear=year;}
    if(!s.people.some(x=>x.role==='spouse'&&x.alive))life.profile.partner=false;
   }
   if(p.role==='child'&&!s.people.some(x=>x.role==='child'&&x.alive)){
    const modernChild=life.world9?.people?.find(x=>x.role==='자녀'&&x.alive);
    if(modernChild){modernChild.alive=false;modernChild.deadYear=year;}
    life.profile.child=false;
   }
   continue;
  }
  if(p.role==='sibling'&&years>=22)p.atHome=false;
  if(p.role==='mother'||p.role==='father'){
   if(years===60||years===70)enqueue(life,s,'elders',p);
  }else if(p.role==='child'){
   if(years>=8&&p.work==='자라는 중')p.work='글과 생업을 익히는 중';
   if(years>=16&&p.work==='글과 생업을 익히는 중')p.work='일할 길을 찾는 중';
   if(years===7)enqueue(life,s,'child-school',p);
   if(years===16)enqueue(life,s,'child-grown',p);
   if(years===22&&!s.seen.includes(p.id+'-independent')){
    s.seen.push(p.id+'-independent');
    p.married=hash(life.seed,year+yearNumber(p.id)+220)<.58;
    if(p.married&&p.work!=='가족의 생업을 함께 이음')p.atHome=false;
    if(p.work==='일할 길을 찾는 중')p.work=p.atHome?'집안 생업을 돕는 중':'다른 살림에서 생업을 꾸리는 중';
    remember(life,s,particle(p.name,'은','는')+' 어른이 되어 앞으로의 살림과 일을 고민하기 시작했다.','joseon4-memory');
   }
  }else if(p.role==='spouse'&&[5,15,30].includes(year-(p.joinedYear||life.birthYear+19))){
   enqueue(life,s,'spouse',p);
  }else if(p.role==='sibling'&&years===25)enqueue(life,s,'sibling',p);
 }
 sync(life,s);promote(life,s);
}
function summary(life){
 const s=ensure(life);if(!s)return null;
 const people=s.people.filter(p=>p.birthYear<=life.year).map(p=>({id:p.id,role:p.role,name:p.name,
  age:age(p,p.alive?life.year:(p.diedYear||life.year)),alive:p.alive,atHome:p.atHome!==false,relation:p.relation,wellbeing:p.wellbeing,
  trait:p.trait,learning:p.learning,work:p.work,married:p.married,diedYear:p.diedYear}));
 return {people,alive:people.filter(p=>p.alive).length,atHome:people.filter(p=>p.alive&&p.atHome).length,
  spouse:people.find(p=>p.role==='spouse'&&p.alive)||people.find(p=>p.role==='spouse')||null,
  children:people.filter(p=>p.role==='child'&&p.alive).length,
  parents:people.filter(p=>['mother','father'].includes(p.role)&&p.alive).length,
  decisions:s.decisions.length,careYears:s.careYears,legacies:s.legacies,
  lastMemory:s.recent.at(-1)||'',memories:s.memories.slice(-3)};
}
function hydrate(life,data){
 const s=ensure(life),old=data?.joseon4;
 if(!s||!old||old.version!==4)return s;
 const allowedRoles=new Set(['mother','father','sibling','spouse','child']);
 if(Array.isArray(old.people)){
  const seen=new Set();
  s.people=old.people.slice(0,12).filter(p=>p&&typeof p.id==='string'&&p.id.length<=30&&
    allowedRoles.has(p.role)&&!seen.has(p.id)&&Number.isInteger(p.birthYear)&&
    p.birthYear>=life.birthYear-110&&p.birthYear<=(p.role==='sibling'?life.birthYear+7:life.year)).map(p=>{
      seen.add(p.id);
      return {id:p.id,role:p.role,name:String(p.name||'가족').slice(0,24),
        sex:p.sex==='여자'?'여자':'남자',birthYear:p.birthYear,
        atHome:typeof p.atHome==='boolean'?p.atHome:!(p.role==='sibling'&&life.year-p.birthYear>=22)&&!(p.role==='child'&&p.work==='다른 고을에서 일하는 중'),
        joinedYear:Number.isInteger(p.joinedYear)?p.joinedYear:null,
        trait:String(p.trait||'다정한').slice(0,24),alive:p.alive!==false,
        relation:clamp(Number(p.relation)||0,0,100),
        wellbeing:clamp(Number(p.wellbeing)||0,0,100),
        learning:clamp(Number(p.learning)||0,0,100),
        work:String(p.work||'집안의 일').slice(0,70),
        married:p.married===true,lifeYears:clamp(Number(p.lifeYears)||70,40,110),
        diedYear:Number.isInteger(p.diedYear)?clamp(p.diedYear,life.birthYear,life.year):null};
    });
 }
 for(const key of ['processedYear','careYears','legacies'])if(Number.isInteger(old[key]))
  s[key]=clamp(old[key],0,key==='processedYear'?life.year:500);
 s.seen=Array.isArray(old.seen)?old.seen.filter(x=>typeof x==='string').slice(-30).map(x=>x.slice(0,60)):[];
 s.recent=Array.isArray(old.recent)?old.recent.filter(x=>typeof x==='string').slice(-12).map(x=>x.slice(0,220)):[];
 s.followups=Array.isArray(old.followups)?old.followups.filter(f=>f&&Number.isInteger(f.year)&&f.year>life.year&&
    typeof f.personId==='string'&&s.people.some(p=>p.id===f.personId)&&
    typeof f.action==='string'&&OUTCOMES[f.action]).slice(-24).map(f=>({id:typeof f.id==='string'?f.id.slice(0,80):null,year:f.year,personId:f.personId,action:f.action})):[];
 s.memories=Array.isArray(old.memories)?old.memories.filter(x=>typeof x==='string').slice(-20).map(x=>x.slice(0,220)):[];
 const allowedKinds=new Set(Object.keys(TITLES));
 const valid=q=>q&&typeof q.id==='string'&&q.id.length<=80&&
   allowedKinds.has(q.kind)&&typeof q.personId==='string'&&
   Number.isInteger(q.year)&&q.year>=life.birthYear&&q.year<=life.year&&s.people.some(p=>p.id===q.personId);
 const asQueue=q=>({id:q.id,kind:q.kind,personId:q.personId,year:q.year});
 s.queue=Array.isArray(old.queue)?old.queue.filter(valid).slice(-8).map(asQueue):[];
 s.decisions=Array.isArray(old.decisions)?old.decisions.filter(q=>valid(q)&&typeof q.action==='string').slice(-36).map(q=>({
  ...asQueue(q),action:q.action.slice(0,40),label:String(q.label||'').slice(0,90)})):[];
 if(valid(old.active)&&data?.pending==='joseon4:'+old.active.id&&life.alive&&J.isJoseon(life)){
  s.active=asQueue(old.active);life.pending='joseon4:'+s.active.id;
 }
 sync(life,s);
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V3?.ensure||Sim.Life.prototype.__joseon4)return false;
 const L=Sim.Life,oldTick=L.prototype.tick,oldChoose=L.prototype.choose,
  oldReflect=L.prototype.reflect,oldGet=L.prototype.getChoice,
  oldSnapshot=L.prototype.snapshot,oldRestore=L.restore;
 L.prototype.tick=function(){
  if(!J.isJoseon(this))return oldTick.call(this);
  const year=this.year,ok=oldTick.call(this);
  if(ok&&this.year!==year&&this.alive)afterYear(this);
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon4:'))
   return prompt(this);
  return oldGet.call(this);
 };
 L.prototype.choose=function(index){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon4:'))
   return choose(this,index);
  const result=oldChoose.call(this,index);
  if(result&&J.isJoseon(this))promote(this,ensure(this));
  return result;
 };
 L.prototype.reflect=function(text){
  const result=oldReflect.call(this,text);
  if(result&&J.isJoseon(this))promote(this,ensure(this));
  return result;
 };
 L.prototype.snapshot=function(){
  const save=oldSnapshot.call(this);
  if(J.isJoseon(this))save.joseon4=JSON.parse(JSON.stringify(ensure(this)));
  return save;
 };
 L.restore=function(data){
  const life=oldRestore.call(this,data);
  if(life&&J.isJoseon(life))hydrate(life,data);
  return life;
 };
 Object.defineProperty(L.prototype,'__joseon4',{value:true});
 return true;
}
install();
return Object.freeze({install,ensure,summary,age,prompt,choose,afterYear,ROLES,particle});
});
