/* 《단 하나의 인생》 조선 여성의 삶 3.26.
 * Fictional individual outcomes, not historical demographic probabilities.
 * Keeps marriage, childbirth, mortality, captivity and legal status under their
 * existing owner modules instead of inventing a second household simulation. */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon4,
  root?.OneLifeJoseon5,root?.OneLifeJoseon325);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseonWomen326=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V4,V5,V325){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PHASES=['youth','family','work','property','legacy'];
const ages={youth:15,family:22,work:27,property:37,legacy:54};
function historical(l){return !!(l?.alive&&J?.isJoseon(l)&&J.inOldEra(l)&&l.gender==='여자'&&l.year<=1894);}
function accessible(l){
 return historical(l)&&l.joseon14?.captivity?.status!=='held'&&
  !l.joseonWomen327?.serviceBound&&l.joseon325?.law?.kind!=='prison'&&l.joseon325?.law?.kind!=='exile'&&
  !l.travel22?.residence?.abroad;
}
function family(l){
 const people=V4?.summary(l)?.people||[];
 const spouse=people.find(p=>p.role==='spouse'&&p.alive)||people.find(p=>p.role==='spouse');
 const children=people.filter(p=>p.role==='child'&&p.alive);
 const parentDeath=people.some(p=>(p.role==='mother'||p.role==='father')&&!p.alive);
 return {spouse,married:!!spouse?.alive,bereaved:!!spouse&&!spouse.alive,children:children.length,parentDeath};
}
function ensure(l){
 if(!J?.isJoseon(l)||l.gender!=='여자')return null;
 if(!l.joseonWomen326)l.joseonWomen326={
  version:1,processedYear:l.year,seen:[],queue:[],active:null,
  craft:0,letters:0,trade:0,care:0,resources:0,property:0,
  livelihood:'집안의 생업',familyPath:'',recent:[],decisions:[],followups:[]};
 return l.joseonWomen326;
}
function record(l,s,message){
 l.logEvent(message,'joseonWomen326-life');
 s.recent.push({year:l.year,text:message});s.recent=s.recent.slice(-18);
}
function push(l,s,key){
 if(s.seen.includes(key)||s.queue.includes(key)||s.active===key)return false;
 s.seen.push(key);s.queue.push(key);return true;
}
function choices(l,key){
 const j=J.ensure(l),f=family(l),s=ensure(l),late=l.year>=1700,
  bound=['사노비','공노비'].includes(V5.ensure(l).origin)&&!V5.ensure(l).freed&&l.year<1894;
 if(key==='youth')return {title:'손에 익힐 일과 배움',
  description:(bound?'주인집이나 관아에 매인 처지라 일과 배움의 시간을 마음대로 정하기 어렵다. ':
   '집안의 살림과 형편을 살피며 앞으로 익힐 일을 생각한다. ')+
   (j.region==='제주도'?'바닷가와 마을의 일손도 가까이에 있다.':'베틀과 장터, 집안의 글공부도 사람마다 기회가 다르다.'),
  options:[
   ['베틀과 바느질을 익힌다','옷감을 짜려면 시간과 재료가 필요하다.'],
   ['한글 편지와 셈을 익힌다','집안에서 배울 사람과 시간을 찾아야 한다.'],
   ['약재와 이웃 돌봄을 배운다','아픈 이를 살피는 일도 경험과 도움이 필요하다.']]};
 if(key==='family')return {title:f.married?'친정과 새 살림 사이':'혼담과 내 앞날',
  description:f.married?'혼인한 뒤에도 친정 식구들과 나눌 일이 남았다. 하지만 살림과 관계를 유지하려면 노력이 든다.':
   bound?'혼인과 거처를 스스로 정하기 어려운 처지에서 관계와 생업을 지킬 길을 헤아린다.':
   '집안에서 혼담이 오간다. 혼인 여부와 별개로 앞으로의 생업과 친척과의 인연을 생각한다.',
  options:[
   ['가족 간의 약속과 안부를 챙긴다','집안 간의 관계가 이어지지만 시간과 품이 든다.'],
   ['배운 기술로 스스로 벌이를 마련한다','일거리를 얻더라도 혼인 여부가 저절로 바뀌지는 않는다.'],
   ['이웃과 품을 나누며 지낸다','어려울 때 부탁할 사람을 늘려 간다.']]};
 if(key==='work'){
  const skilled=s.craft>=2,writer=s.letters>=2;
  return {title:'살림을 꾸릴 새로운 일거리',
   description:'해마다 같은 돈을 벌 수는 없다. 익힌 솜씨와 사람들의 신뢰, 집안 형편이 장날의 선택을 바꾼다.',
   options:[
    [skilled?'옷감을 짜서 장터에 내다 판다':'옷감 짜는 법을 더 배워 팔아 본다',
     '실과 베틀을 마련할 비용이 든다. 팔리지 않을 수도 있다.'],
    [writer?'편지와 장부를 대신 적어 준다':'글과 셈을 더 익혀 장부 일을 돕는다',
     '익힌 글을 이웃의 일과 작은 벌이에 활용한다.'],
    ['이웃의 아픈 식구를 돕는 일을 맡는다','기술을 배워 돌보되 치료를 보장하지는 못한다.']]};
 }
 if(key==='property')return {title:f.parentDeath?'친정의 남은 물건과 문서':'친정의 살림을 정리하는 날',
  description:(f.parentDeath?'세상을 떠난 가족이 남긴 물건과 문서를 어떻게 정리할지 집안에서 의논한다. ':
   '친정의 어른들이 오래된 장부와 집안 물건을 정리하려 한다. ')+
   (late?'재산을 나누는 방식과 혼인한 딸의 상속분에 관한 집안의 관행이 예전과 달라졌다.':
    '딸도 재산을 나누어 받는 집안이 있었지만 실제로 얼마나 받을지는 문서와 집안 사정에 달렸다.'),
  options:[
   ['옛 문서와 증인을 찾아 권리를 확인한다','기록과 이웃의 증언을 살펴본다. 재산을 받는다고 확정되지는 않는다.'],
   ['다툼을 줄이도록 친척들과 상의한다','가족 사이에 오가는 말을 듣고 합의할 길을 찾는다.'],
   ['살림에 필요한 물건부터 보전한다','물건을 지키고 생업에 쓸 수 있을지 살핀다.']]};
 if(key==='widow')return {title:'배우자가 떠난 뒤 남은 살림',
  description:'함께 지내던 배우자가 세상을 떠났다. 남은 살림과 가족 관계는 저절로 정리되지 않는다.'+
   (f.children?' 어린 자녀와 함께 앞으로를 생각한다.':' 앞으로 의지할 사람과 생업을 다시 생각한다.'),
  options:[
   ['내가 하던 생업을 이어 간다','벌이를 지키려면 물건과 일손이 필요하다.'],
   ['친척들과 거처와 살림을 의논한다','친정과 시가의 관계가 영향을 준다.'],
   ['이웃과 서로 돕는 길을 찾는다','힘겨운 때에 품앗이를 이어 나간다.']]};
 if(key==='legacy')return {title:'오래 익힌 삶의 기술을 누구에게 남길까?',
  description:'한때 배운 '+s.livelihood+'의 경험이 쌓였다. 지켜 온 사람들과 기술을 어떻게 이어 갈지 생각한다.',
  options:[
   ['젊은 사람에게 솜씨를 가르친다','베틀과 장부, 돌봄의 경험을 필요한 사람에게 전한다.'],
   ['집안에 남길 기록을 정리한다','한글 편지와 장부에 오래된 일을 적어 둔다.'],
   ['장사와 살림을 나눠 맡긴다','후대에 생업을 맡기되 모두가 같은 길을 걷지는 않는다.']]};
 return null;
}
function promote(l){
 const s=ensure(l);if(!s||!accessible(l)||l.pending||s.active)return false;
 while(s.queue.length){
  const key=s.queue.shift();
  if(!choices(l,key))continue;
  s.active=key;l.pending='joseonWomen326:'+key;return true;
 }
 return false;
}
function livedFollowup(l,s,x){
 if(typeof x.text==='string')return x.text; // Old save text is preserved.
 const known={
  youth:[
   s.craft>=3?'베틀에 익숙해져 식구의 낡은 옷을 직접 기웠다.':'바느질 도구를 다시 꺼내어 익혔다.',
   s.letters>=3?'이웃이 가져온 편지에서 보내는 사람의 이름을 읽어 주었다.':'배웠던 글자를 편지에서 다시 찾아보았다.',
   '아픈 이웃을 찾아가 물과 먹을 것을 챙겼다. 병이 다 나았다고 할 수는 없었다.'],
  family:[
   '전에 안부를 전했던 친척에게서 답장이 왔다. 집안의 달라진 소식을 나누었다.',
   '장날에 일손을 구한다는 이야기를 듣고 할 수 있는 일이 있는지 물어보았다.',
   '품앗이했던 이웃과 다시 일손을 나누었다. 그날은 내 집의 일도 조금 늦어졌다.'],
  work:[
   s.craft>=4?'지난번 옷감을 팔던 장터에서 다시 손님을 만났다. 실값부터 따져 물건을 내놓았다.':'실과 옷감의 값을 따져 보았지만 이번 장에는 팔지 못했다.',
   s.letters>=4?'이웃이 가져온 답장을 읽어 주었다. 모르는 글자는 다시 물어보았다.':'편지에서 읽지 못한 글자를 찾아 배웠다.',
   '전에 돌보던 이웃을 다시 찾았다. 아픈 곳이 어떤지 묻고 쉬도록 도왔다.'],
  property:[
   s.property===2?'옛 문서를 찾아 두었지만 재산을 얼마나 나눌지는 아직 정해지지 않았다.':'친척과 물건의 내력을 다시 확인했다.',
   '친척들과 살림을 어떻게 나눌지 다시 의논했다. 서로 생각이 다른 곳도 있었다.',
   s.resources>0?'보관해 둔 살림 도구를 꺼내 생업에 쓸 수 있는지 살폈다.':'남은 살림을 다시 살펴보았다.'],
  widow:[
   '배우자를 떠나보낸 뒤에도 도구를 손질하며 생업을 이어 갔다.',
   '친정과 시가에 거처를 어떻게 정할지 다시 물었다.',
   '이웃과 일손을 나눠 남은 살림을 돌봤다.'],
  legacy:[
   '전에 솜씨를 가르쳤던 젊은 이가 찾아와 어려운 부분을 다시 물었다.',
   s.letters>0?'식구가 오래전 편지를 찾아왔다. 이름과 사연을 함께 읽었다.':'오래전 있었던 일을 식구에게 들려주었다.',
   '일을 나누어 맡은 식구와 올겨울에 필요한 물건과 일손을 다시 의논했다.']
 };
 return (known[x.key]||[])[x.choice]||'';
}
function yearly(l){
 const s=ensure(l);if(!s||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 if(!accessible(l)||l.age<15)return;
 const f=family(l);
 for(const x of s.followups.filter(x=>x.year<=l.year)){
  const event=livedFollowup(l,s,x);
  if(event)record(l,s,event);
 }
 s.followups=s.followups.filter(x=>x.year>l.year);
 if(f.bereaved&&!s.seen.includes('widow')&&l.age>=22)push(l,s,'widow');
 // No birth, pregnancy, marriage or property ownership is fabricated here.
 for(const phase of PHASES)if(l.age>=ages[phase]&&!s.seen.includes(phase)&&s.queue.length<3)push(l,s,phase);
 promote(l);
}
function resolve(l,index){
 const s=ensure(l),key=s?.active,p=key&&choices(l,key);
 if(!s||!p||!accessible(l)||!Number.isInteger(index)||index<0||index>=3)return false;
 const j=J.ensure(l),f=family(l),label=p.options[index][0];
 const gain=(n)=>{j.capital=clamp(j.capital+n,-120,600);
  if(l.money)l.money.netWorth=j.capital*100;};
 let story='';
 if(key==='youth'){
  if(index===0){s.craft+=3;s.livelihood='길쌈과 바느질';gain(-3);l.change({knowledge:3});story='실과 도구를 구해 베틀과 바느질을 익혔다. 옷감을 완성하려면 품이 많이 들었다.';}
  if(index===1){s.letters+=3;s.livelihood='한글과 셈';l.change({knowledge:5});story='글을 아는 사람을 찾아 글자와 셈을 배웠다. 편지를 스스로 읽을 날이 가까워졌다.';}
  if(index===2){s.care+=3;s.livelihood='집안과 이웃 돌봄';l.change({knowledge:2,bonds:3});story='이웃을 돌보는 일을 거들었다. 약재를 다루는 일에는 여전히 익힐 것이 많았다.';}
 }else if(key==='family'){
  s.familyPath=index===0?'친척들과의 인연':index===1?'자신의 생업':'이웃의 품앗이';
  if(index===0){l.change({bonds:4,health:-1});story='친척들에게 인편으로 안부를 전하며 집안의 약속을 지켰다.';}
  if(index===1){s.trade+=2;gain(-2);l.change({knowledge:2});story='혼인 여부와 별개로 스스로 마련할 수 있는 벌이와 일을 찾아보았다.';}
  if(index===2){s.care+=2;l.change({bonds:4});story='이웃과 일손을 나누며 서로 도울 날을 약속했다.';}
 }else if(key==='work'){
  if(index===0){s.craft+=2;s.trade+=2;s.livelihood='길쌈과 옷감 장사';gain(s.craft>=4?3:-2);l.change({health:-2});story='옷감과 실값을 헤아리며 장터에 물건을 내놓았다. 큰돈을 번 것은 아니지만 거래의 길을 익혔다.';}
  if(index===1){s.letters+=2;s.trade+=1;s.livelihood='편지와 장부 정리';gain(s.letters>=4?2:-1);l.change({knowledge:2});story='이웃의 글과 장부를 거들었다. 글을 쓸 때마다 그 뜻과 값을 다시 확인했다.';}
  if(index===2){s.care+=2;s.livelihood='마을의 돌봄과 약재';gain(-2);l.change({bonds:3,knowledge:2});story='가까운 집의 돌봄을 돕고 약재 쓰임을 익혔다. 아픈 이가 모두 낫는 것은 아니었다.';}
 }else if(key==='property'){
  if(index===0){s.property=2;s.letters+=1;l.change({knowledge:3});story='문서와 증언을 대조해 집안 물건의 내력을 확인했다. 재산 분배가 확정된 것은 아니었다.';}
  if(index===1){s.property=1;l.change({bonds:3});story='친척들의 말을 차례로 듣고 살림을 어떻게 나눌지 논의했다. 갈등이 모두 사라지지는 않았다.';}
  if(index===2){s.property=3;gain(-2);s.resources+=1;story='남은 물건이 상하지 않도록 정리했다. 물건을 지키는 일에도 돈과 일손이 들었다.';}
 }else if(key==='widow'){
  s.familyPath='사별 이후 · '+['생업 유지','친척과 상의','이웃의 품앗이'][index];
  if(index===0){s.trade+=1;gain(-3);l.change({health:-2});story='배우자를 잃은 뒤 익숙한 일을 이어 가려고 도구와 일손을 다시 구했다.';}
  if(index===1){s.property=Math.max(1,s.property);l.change({bonds:2});story='친정과 시가에 거처와 살림을 상의했다. 가족마다 뜻이 달라 결정은 더뎠다.';}
  if(index===2){s.care+=2;l.change({bonds:3});story='이웃의 도움을 받으며 남은 살림과 사람의 안부를 함께 돌보았다.';}
 }else if(key==='legacy'){
  if(index===0){l.change({bonds:4,knowledge:2});story='젊은 이에게 오래 익힌 일을 차근차근 가르쳤다. 그 사람이 어떤 삶을 택할지는 알 수 없었다.';}
  if(index===1){s.letters+=1;l.change({knowledge:2});story='오래전 일을 적어 두었다. 가족과 이웃이 그 기록을 함께 읽었다.';}
  if(index===2){s.trade+=1;l.change({bonds:3});story='지키던 살림의 일을 가족과 이웃에게 나누어 맡겼다. 앞으로도 도울 일은 남았다.';}
 }
 record(l,s,story);
 s.followups.push({year:l.year+3,key,choice:index});
 s.followups=s.followups.slice(-12);
 s.decisions.push({year:l.year,key,choice:index,label,married:f.married,children:f.children});
 s.decisions=s.decisions.slice(-36);
 s.active=null;l.pending=null;
 l.logEvent(p.title+' — '+label,'joseonWomen326-choice');
 promote(l);
 return true;
}
function summary(l){
 const s=ensure(l);if(!s)return null;
 return {livelihood:s.livelihood,familyPath:s.familyPath,craft:s.craft,letters:s.letters,
  care:s.care,trade:s.trade,property:s.property,decisions:s.decisions.length,
  recent:s.recent.slice(-5),seen:[...s.seen]};
}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseonWomen326;
 if(!s||!o||o.version!==1)return s;
 for(const k of ['craft','letters','trade','care','resources','property'])s[k]=clamp(Number(o[k])||0,0,100);
 s.livelihood=String(o.livelihood||s.livelihood).slice(0,50);
 s.familyPath=String(o.familyPath||'').slice(0,60);
 s.seen=Array.isArray(o.seen)?o.seen.filter(x=>PHASES.includes(x)||x==='widow').slice(-6):[];
 s.queue=Array.isArray(o.queue)?o.queue.filter(x=>PHASES.includes(x)||x==='widow').slice(-6):[];
 s.active=s.seen.includes(o.active)&&data.pending==='joseonWomen326:'+o.active?o.active:null;
 if(s.active)l.pending='joseonWomen326:'+s.active;
 s.processedYear=clamp(Number(o.processedYear)||l.year,l.birthYear,l.year);
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(x=>x&&PHASES.concat('widow').includes(x.key)&&x.year<=l.year).slice(-36):[];
 s.recent=Array.isArray(o.recent)?o.recent.filter(x=>x&&Number.isInteger(x.year)&&typeof x.text==='string').slice(-18)
   .map(x=>({year:x.year,text:x.text.slice(0,160)})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(x=>x&&Number.isInteger(x.year)&&x.year>=l.year&&x.year<=l.year+10&&
  (typeof x.text==='string'||(PHASES.concat('widow').includes(x.key)&&[0,1,2].includes(x.choice)))).slice(-12)
  .map(x=>typeof x.text==='string'?{year:x.year,text:x.text.slice(0,160)}:{year:x.year,key:x.key,choice:x.choice}):[];
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V4?.summary||!V5?.ensure||Sim.Life.prototype.__joseonWomen326)return false;
 const L=Sim.Life,prevTick=L.prototype.tick,prevChoice=L.prototype.choose,
  prevPrompt=L.prototype.getChoice,prevReflect=L.prototype.reflect,
  prevSnapshot=L.prototype.snapshot,prevRestore=L.restore;
 L.prototype.tick=function(){
  const y=this.year,ok=prevTick.call(this);
  if(ok&&this.year!==y&&this.alive)yearly(this);
  return ok;
 };
 L.prototype.getChoice=function(){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseonWomen326:')){
   const p=choices(this,this.pending.slice('joseonWomen326:'.length));
   return p&&{...p,options:p.options.map(([label,note])=>({label,note,action:label}))};
  }
  return prevPrompt.call(this);
 };
 L.prototype.choose=function(i){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseonWomen326:'))return resolve(this,i);
  const ok=prevChoice.call(this,i);if(ok)promote(this);return ok;
 };
 L.prototype.reflect=function(t){const ok=prevReflect.call(this,t);if(ok)promote(this);return ok;};
 L.prototype.snapshot=function(){const d=prevSnapshot.call(this);if(this.joseonWomen326)d.joseonWomen326=JSON.parse(JSON.stringify(this.joseonWomen326));return d;};
 L.restore=function(d){const l=prevRestore.call(this,d);if(l&&d?.joseonWomen326)hydrate(l,d);return l;};
 Object.defineProperty(L.prototype,'__joseonWomen326',{value:true});return true;
}
install();
return Object.freeze({ensure,historical,accessible,family,choices,push,promote,yearly,resolve,summary,hydrate,install,PHASES});
});
