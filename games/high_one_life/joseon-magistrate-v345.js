/* One Life v3.45 — hearing-by-hearing local magistrate reputation.
 * Court cases are fictional illustrations, not reconstructions of named trials.
 * Hidden state carries consequences without exposing numerical meters to players.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon5,
  root?.OneLifeJoseon325,root?.OneLifeFate344);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeMagistrate345=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V5,Paths,Fate){
 'use strict';
 const clamp=(n,lo=0,hi=100)=>Math.max(lo,Math.min(hi,n));
 const copy=x=>JSON.parse(JSON.stringify(x));
 const dice=Fate?.dice||(()=>.5);
 const CASES=Object.freeze([
  {id:'field',title:'논밭의 경계',intro:'두 집이 같은 밭두렁을 자기 것이라고 주장한다. 오래된 문서와 이웃의 증언이 서로 다르다.',
   options:[
    ['옛 문서와 양쪽 증언을 다시 맞춰 본다','다툼을 풀 근거를 모으는 데 시간이 든다.','둘의 말을 함께 듣고 낡은 문서를 다시 펼쳤다.','공정', {fairness:10,trust:5,proof:6,favor:-3},-3],
    ['권세 있는 집이 가져온 문서를 그대로 인정한다','관아의 일은 빨리 끝나지만 다른 집은 억울해한다.','힘 있는 집의 주장대로 판정했다. 다른 집은 억울하다며 돌아갔다.','편파',{favor:9,corruption:6,resentment:10,trust:-7},8],
    ['밭을 공동으로 쓰도록 양쪽에 권한다','서로 양보해야 한다. 모두가 수긍하지는 않는다.','두 집이 경계를 다시 정하도록 의논 자리를 마련했다.','조정',{fairness:5,trust:5,relief:3},-2]]},
  {id:'grain',title:'갚지 못한 곡식',intro:'흉년 뒤 빌린 곡식을 돌려주지 못한 가족과 빚 문서를 든 부농이 관아에 찾아왔다.',
   options:[
    ['빌린 양과 갚은 양을 장부로 확인한다','기록을 살피고 실제 빚만 인정한다.','빌린 곡식과 이미 갚은 양을 따져 과도한 청구를 가려 냈다.','공정',{fairness:8,proof:7,trust:6},-3],
    ['부농의 요구대로 곡식을 모두 내게 한다','권세가의 호감을 얻지만 끼니가 부족한 집이 생긴다.','빚 문서를 제대로 살피지 않고 곡식을 거두게 했다.','편파',{favor:8,corruption:5,resentment:11,trust:-8},7],
    ['먹을 곡식을 남겨 두고 상환 시기를 의논한다','당장의 굶주림을 줄이되 빚을 없애지는 않는다.','가족의 먹을 곡식을 남기고 갚을 시기를 다시 정했다.','조정',{relief:9,fairness:5,trust:7},-5]]},
  {id:'market',title:'장날 송사 · 잘못된 저울',intro:'장터의 상인이 저울을 속였다며 손님들이 찾아왔다. 상인은 억울하다고 한다.',
   options:[
    ['저울추를 대조하고 피해를 확인한다','물건값과 실제 무게를 나란히 비교한다.','양쪽 저울을 살펴 잘못된 거래와 오해를 구분했다.','공정',{fairness:9,proof:8,trust:6},-3],
    ['상인에게 돈을 받고 조용히 넘긴다','관아의 살림은 늘 수 있어도 공정한 거래가 무너진다.','돈을 받은 뒤 저울 문제를 더 조사하지 않았다.','편파',{corruption:12,resentment:10,trust:-10,favor:5},11],
    ['상인과 손님을 불러 거래를 다시 정산한다','잘못 받은 값을 돌려주되 근거가 없는 벌은 피한다.','잘못된 거래 금액을 돌려주고 다시 저울을 맞췄다.','조정',{fairness:6,relief:5,trust:7},-3]]},
  {id:'labor',title:'부역 명부의 이름',intro:'일하러 나오라는 명부에 어린아이나 이미 세상을 떠난 사람의 이름이 있다는 탄원이 들어왔다.',
   options:[
    ['명부를 다시 확인해 잘못된 항목을 고친다','아전과 마을 어른에게 실제 거주 상황을 확인한다.','실제 일할 수 없는 사람의 이름을 명부에서 바로잡았다.','공정',{fairness:10,proof:8,relief:6,trust:5},-5],
    ['아전에게 맡기고 더 묻지 않는다','업무는 빨라져도 억울한 부담이 남을 수 있다.','명부를 다시 살피지 않아 마을의 불만이 쌓였다.','편파',{corruption:6,resentment:9,favor:4,trust:-5},5],
    ['마을별로 차례를 다시 나누어 의논한다','모두가 만족하지는 않지만 부당한 부담을 줄인다.','일할 사람과 시기를 다시 살피며 부담을 나누었다.','조정',{fairness:6,trust:6,relief:4},-3]]},
  {id:'punishment',title:'형벌을 둘러싼 억울함',intro:'한 사람이 훔친 물건을 돌려주었다는데도 관아에서 지나치게 벌했다는 증언이 이어진다.',
   options:[
    ['사건 기록과 증인을 다시 살핀다','이미 내려진 처분이라도 잘못이 있는지 확인한다.','원래 사건과 벌을 준 경위를 다시 조사했다.','공정',{fairness:11,proof:7,trust:5},-3],
    ['담당 아전의 말을 믿고 덮는다','관아 내부 갈등은 피하지만 주민의 의심은 커진다.','아전의 설명만 듣고 처분을 고치지 않았다.','편파',{favor:6,resentment:12,corruption:5,trust:-8},4],
    ['상급 관청에 기록을 보내 재검토를 청한다','관할과 증거를 함께 살피며 신중하게 판단한다.','증거와 기록을 모아 상급 관청에 다시 살펴 달라고 했다.','조정',{fairness:6,proof:9,trust:3},-4]]},
  {id:'warehouse',title:'곡식 창고의 부족분',intro:'구휼 창고의 곡식이 장부에 적힌 수량보다 적다. 백성은 굶주리고 아전은 쥐가 먹었다고 말한다.',
   options:[
    ['창고를 직접 세고 배분을 감독한다','누가 곡식을 가져갔는지 장부와 실물을 대조한다.','창고 문을 열어 실제 양을 세고 어려운 집에 나눌 순서를 정했다.','공정',{fairness:9,proof:8,relief:10,trust:6},-7],
    ['없어진 곡식을 백성에게 더 거둬 채운다','창고는 채우지만 잘못의 부담이 굶는 집으로 넘어간다.','부족한 곡식을 마을에서 다시 거두어 원망을 샀다.','편파',{corruption:10,resentment:14,trust:-12,favor:6},10],
    ['아전들에게 차이를 확인하게 하고 지급을 늦춘다','원인은 조사할 수 있지만 기다리는 집의 사정은 나빠진다.','장부 확인을 먼저 시키는 동안 구휼은 늦어졌다.','조정',{proof:6,fairness:2,relief:-3,trust:-2},-1]]}
 ]);
 const METRICS=['fairness','trust','proof','relief','favor','corruption','resentment'];
 function fresh(l){return {version:1,stage:'idle',caseIndex:0,order:[],due:0,appointmentYear:0,
  counters:{fairness:48,trust:48,proof:10,relief:10,favor:18,corruption:0,resentment:8},
  records:[],judgment:'',monument:false,lastYear:l.year};}
 function ensure(l){
  if(!J?.isJoseon(l))return null;
  return l.joseon345||(l.joseon345=fresh(l));
 }
 function selectCases(l){
  const pool=[0,1,2,3,4,5],result=[];
  for(let i=0;i<4;i++){const offset=Math.floor(dice(l.seed,l.year*41+i*317+345)*pool.length);
   result.push(pool.splice(offset,1)[0]);}
  return result;
 }
 function log(l,s,message,kind='joseon345-life'){
  l.logEvent(message,kind);
  s.records.push({year:l.year,text:message});s.records=s.records.slice(-32);
 }
 function counts(l,s,delta){
  const j=J.ensure(l);
  for(const k of METRICS)if(Number.isFinite(delta[k]))s.counters[k]=clamp(s.counters[k]+delta[k]);
  if(Number.isFinite(delta.cash)){j.capital=clamp(j.capital+delta.cash,-120,600);
   if(l.money)l.money.netWorth=j.capital*100;}
 }
 function begin(l,index){
  const f=Fate.ensure(l),s=ensure(l),j=J.ensure(l),soc=V5.ensure(l);
  if(!l.alive||l.year>=1888||l.pending!=='joseon344:magistrate'||f.active!=='magistrate'||
   s.stage!=='idle'||![0,1,2].includes(index)||!j.office)return false;
  s.stage='hearings';s.order=selectCases(l);s.due=l.year+1;s.appointmentYear=l.year;
  j.occupation='고을 수령';l.career='고을 수령';soc.role='수령';
  f.active=null;f.follow=null;l.pending=null;
  if(index===0)counts(l,s,{trust:7,fairness:4,proof:3,cash:-4});
  if(index===1)counts(l,s,{proof:8,fairness:3,trust:2});
  if(index===2)counts(l,s,{favor:9,trust:-4,resentment:4});
  const label=['백성의 억울한 사연을 먼저 듣는다','관아의 장부와 오래된 문서를 먼저 살핀다','권세 있는 집안의 인사를 먼저 받는다'][index];
  f.choices.push({year:l.year,key:'magistrate',index,label});f.choices=f.choices.slice(-64);
  l.logEvent('고을 수령으로 부임하다 — '+label,'joseon344-choice');
  log(l,s,'고을 수령으로 부임했다. 관아 앞에는 억울한 사정을 호소하는 사람들이 줄을 섰다.');
  return true;
 }
 function plan(l,key){
  const s=ensure(l);if(!s)return null;
  if(key==='review'){
   const observations=s.counters.corruption>=22?'관아의 장부와 주민의 탄원이 어긋나고 있다.':
     s.counters.trust>=65?'주민들이 억울한 송사의 판결을 서로 이야기한다.':
     '관아에서 고을 사람들 사이에서도 판결을 두고 말이 많다.';
   return {title:'떠나는 수령을 향한 평가',description:observations+' 몇 해 동안의 기록과 증언을 살핀다.',
    options:[
     {label:'판결 기록과 증인을 있는 그대로 낸다',note:'잘한 일만 골라 내지 않고 그동안의 송사 기록을 모두 낸다.'},
     {label:'잘못된 판정을 바로잡고 피해를 돌본다',note:'늦었어도 구제에 필요한 곡식을 마련한다.'},
     {label:'권세 있는 대신에게 잘 봐 달라 부탁한다',note:'당장은 도움을 얻을 수 있지만 불리한 기록도 남는다.'}
    ]};
  }
  const match=/^case([1-4])$/.exec(key);
  if(!match||s.caseIndex!==Number(match[1])-1||s.stage!=='hearings')return null;
  const scene=CASES[s.order[s.caseIndex]];if(!scene)return null;
  return {title:'송사 '+(s.caseIndex+1)+'/4 · '+scene.title,description:scene.intro,
   options:scene.options.map(([label,note])=>({label,note}))};
 }
 function schedule(l){
  const s=ensure(l);
  if(!s||!l.alive||l.pending||!J.inOldEra(l)||l.year>=1894||
   Paths.ensure(l)?.law?.kind!=='free')return false;
  if(s.stage==='hearings'&&s.caseIndex<4&&l.year>=s.due){
   l.pending='joseon345:case'+(s.caseIndex+1);return true;}
  if(s.stage==='review'&&l.year>=s.due){l.pending='joseon345:review';return true;}
  return false;
 }
 function close(l,s){
  const c=s.counters,j=J.ensure(l),social=V5.ensure(l);
  const danger=clamp(.05+c.corruption*.012+c.resentment*.007+c.favor*.002-c.proof*.003,0,.92);
  const judged=dice(l.seed,l.year*73+198)<danger;
  const weight=c.fairness*.43+c.trust*.41+c.relief*.19+c.proof*.12-
    c.corruption*.85-c.resentment*.43;
  const settled=weight>=67&&c.fairness>=65&&c.trust>=65&&c.corruption<=12&&c.resentment<=25;
  const restricted=l.year>=1741&&l.year<=1800; // kings' prohibitions on commemorative steles
  let outcome;
  if(judged&&(c.corruption>=15||c.resentment>=36)){
   if(dice(l.seed,l.year*19+612)<clamp(.20+c.corruption*.012+c.resentment*.002,0,.85) &&
     Paths.lockup(l,Paths.ensure(l),'exile',2+Math.floor(dice(l.seed,l.year+16)*3),'강원도')){
    social.rank=Math.min(social.rank,1);outcome='exile';
    log(l,s,'감찰에서 부당한 징수와 판결이 드러나 파직되고 유배를 떠났다.');
   }else{
    j.office=false;social.rank=Math.min(social.rank,1);j.occupation='파직되어 고향으로 돌아간 전직 수령';l.career=j.occupation;
    outcome='dismissed';log(l,s,'주민의 탄원과 장부를 검토한 뒤 파직되었다. 고을의 잘못은 남았다.');
   }
  }else if(settled){
   const praise=dice(l.seed,l.year*29+703)<.63;
   if(praise&&!restricted){
    s.monument=true;outcome='monument';log(l,s,'임기를 마치자 주민들이 도움받은 일을 기억하며 뜻을 모아 송덕비를 세웠다.');
   }else if(praise&&restricted){
    outcome='praised';log(l,s,'억울한 일을 줄였다는 평이 남았지만, 이 시기에는 선정비 건립 금령이 있어 비석은 세우지 않았다.');
   }else {outcome='respected';log(l,s,'재임 중 백성의 사정을 살핀 관리라는 이야기가 남았다. 비석이 꼭 세워지는 것은 아니었다.');}
   j.office=false;social.rank=Math.max(1,social.rank);
   j.occupation='고을 일을 마치고 다른 길을 찾는 전직 수령';l.career=j.occupation;
  }else if(c.favor>=45&&c.corruption<18&&c.resentment<=30){
   outcome='advanced';j.office=true;
   j.occupation='다른 관직에 옮겨 간 관리';l.career=j.occupation;
   social.rank=Math.max(social.rank,2);
   log(l,s,'고을에서의 평가는 엇갈렸지만 윗사람의 추천을 받아 다른 관직으로 옮겨 갔다.');
  }else{
   outcome='ordinary';j.office=false;
   j.occupation='임기를 마치고 향촌에서 지내는 전직 수령';l.career=j.occupation;
   log(l,s,'임기를 마치고 고향으로 돌아왔다. 어떤 이는 수고했다며 인사했고, 어떤 이는 끝내 얼굴을 돌렸다.');
  }
  s.judgment=outcome;s.stage='done';
  const f=Fate.ensure(l);f.magistrate=c.corruption>=18?'abusive':settled?'benevolent':'careful';
  f.follow=null;
  if(l.money)l.money.employment=l.career;
  return outcome;
 }
 function resolve(l,index){
  const s=ensure(l),prefix='joseon345:',key=l.pending?.startsWith(prefix)?l.pending.slice(prefix.length):'';
  const p=key&&plan(l,key);
  if(!l.alive||!p||![0,1,2].includes(index))return false;
  const label=p.options[index].label;
  if(key==='review'){
   if(index===0)counts(l,s,{proof:8,fairness:3,favor:-4});
   else if(index===1)counts(l,s,{relief:8,trust:6,resentment:-7,corruption:-2,cash:-12});
   else counts(l,s,{favor:14,corruption:5,resentment:4,trust:-6,cash:-7});
   l.logEvent(p.title+' — '+label,'joseon345-choice');
   l.pending=null;close(l,s);
  }else{
   const scene=CASES[s.order[s.caseIndex]],selected=scene.options[index];
   if(!selected)return false;
   counts(l,s,{...selected[4],cash:selected[5]});
   const echo=selected[3]==='편파'&&s.counters.resentment>=35
     ?' 판결을 원망하는 사람들이 관아 앞에 몰려들었다.':
     selected[3]==='공정'&&s.counters.trust>=67
     ?' 공평한 판결이었다는 이야기가 이웃 고을까지 퍼졌다.':'';
   log(l,s,selected[2]+echo);
   l.logEvent(p.title+' — '+label,'joseon345-choice');
   s.caseIndex++;
   if(s.caseIndex>=4){s.stage='review';s.due=l.year+2;}
   else s.due=l.year+1;
   l.pending=null;
  }
  return true;
 }
 function summary(l){
  const s=ensure(l);if(!s)return null;
  const text=s.stage==='hearings'?'송사 '+s.caseIndex+'건 처리':
   s.stage==='review'?'여러 송사의 평가를 앞둔 수령':
   s.stage==='done'?({monument:'송덕비가 세워진 수령',praised:'좋은 평을 남긴 수령',
    respected:'백성의 기억에 남은 수령',dismissed:'파직된 전직 수령',
    exile:'유배를 떠난 전직 수령',advanced:'다른 관직으로 옮긴 관리',
    ordinary:'임기를 마친 수령'}[s.judgment]||''):'';
  return {label:text,hearings:s.caseIndex,decisions:s.caseIndex+(s.stage==='done'?1:0),
   ending:s.judgment,monument:s.monument};
 }
 function hydrate(l,data){
  const s=ensure(l),old=data?.joseon345;if(!s||!old||old.version!==1)return s;
  s.stage=['idle','hearings','review','done'].includes(old.stage)?old.stage:'idle';
  s.caseIndex=Number.isInteger(old.caseIndex)?clamp(old.caseIndex,0,4):0;
  s.order=Array.isArray(old.order)&&old.order.length===4&&old.order.every(x=>Number.isInteger(x)&&x>=0&&x<CASES.length)&&new Set(old.order).size===4?old.order.slice():[];
  s.due=Number.isInteger(old.due)?clamp(old.due,l.birthYear,l.year+15):l.year;
  s.appointmentYear=Number.isInteger(old.appointmentYear)?clamp(old.appointmentYear,l.birthYear,l.year):l.birthYear;
  for(const k of METRICS)if(Number.isFinite(old.counters?.[k]))s.counters[k]=clamp(old.counters[k]);
  s.records=Array.isArray(old.records)?old.records.filter(x=>x&&Number.isInteger(x.year)&&x.year<=l.year&&
    typeof x.text==='string').slice(-32).map(x=>({year:x.year,text:x.text.slice(0,240)})):[];
  s.judgment=['monument','praised','respected','dismissed','exile','advanced','ordinary'].includes(old.judgment)?old.judgment:'';
  s.monument=s.judgment==='monument'&&old.monument===true;
  s.lastYear=Number.isInteger(old.lastYear)?clamp(old.lastYear,l.birthYear,l.year):l.year;
  // Only a server-defined case key with matching progress can resume a hearing.
  const key=typeof data?.pending==='string'&&data.pending.startsWith('joseon345:')?data.pending.slice(10):'';
  const validCase=s.stage==='hearings'&&s.order.length===4&&key==='case'+(s.caseIndex+1)&&s.caseIndex<4;
  const validReview=s.stage==='review'&&key==='review';
  if(l.alive&&(validCase||validReview))l.pending='joseon345:'+key;
  else if(l.pending?.startsWith('joseon345:'))l.pending=null;
  if(['hearings','review'].includes(s.stage)&&s.order.length!==4){s.stage='idle';s.caseIndex=0;}
  return s;
 }
 function install(){
  if(!Sim?.Life||!J?.isJoseon||!Fate?.ensure||!Paths?.lockup||Sim.Life.prototype.__joseon345)return false;
  const L=Sim.Life,oldTick=L.prototype.tick,oldPrompt=L.prototype.getChoice,
   oldChoose=L.prototype.choose,oldReflect=L.prototype.reflect,
   oldSnap=L.prototype.snapshot,oldRestore=L.restore;
  L.prototype.tick=function(){
   const year=this.year,ok=oldTick.call(this);
   if(ok&&this.alive&&this.year!==year)schedule(this);
   return ok;
  };
  L.prototype.getChoice=function(){
   if(this.pending==='joseon344:magistrate'&&this.year<1888){
    return {title:'고을 수령으로 첫 부임',description:'관직을 맡아 백성의 송사를 처리하게 되었다. 몇 해 동안 내린 결정이 훗날의 평가를 바꿀 수 있다.',
     options:[
      {label:'백성의 억울한 사연을 먼저 듣는다',note:'시간을 들여 주민의 이야기를 살핀다.'},
      {label:'관아의 장부와 오래된 문서를 먼저 살핀다',note:'서류와 증거를 확인하며 일을 시작한다.'},
      {label:'권세 있는 집안의 인사를 먼저 받는다',note:'고을의 힘 있는 사람들과 관계를 맺는다.'}
     ]};
   }
   if(typeof this.pending==='string'&&this.pending.startsWith('joseon345:'))
    return plan(this,this.pending.slice(10));
   return oldPrompt.call(this);
  };
  L.prototype.choose=function(index){
   if(this.pending==='joseon344:magistrate'&&this.year<1888)return begin(this,index);
   if(typeof this.pending==='string'&&this.pending.startsWith('joseon345:')){
    const ok=resolve(this,index);if(ok&&this.alive)schedule(this);return ok;
   }
   const ok=oldChoose.call(this,index);if(ok&&this.alive)schedule(this);return ok;
  };
  L.prototype.reflect=function(text){const ok=oldReflect.call(this,text);if(ok&&this.alive)schedule(this);return ok;};
  L.prototype.snapshot=function(){const out=oldSnap.call(this);if(this.joseon345)out.joseon345=copy(this.joseon345);return out;};
  L.restore=function(data){const l=oldRestore.call(this,data);if(l&&J.isJoseon(l)&&data?.joseon345)hydrate(l,data);return l;};
  Object.defineProperty(L.prototype,'__joseon345',{value:true});return true;
 }
 install();
 return Object.freeze({CASES,ensure,begin,plan,resolve,summary,hydrate,schedule,close,selectCases,install});
});
