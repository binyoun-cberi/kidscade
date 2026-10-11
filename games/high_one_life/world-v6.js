/* One Life v6: careers are a history, not a permanent class.
   Scenario probabilities are fictional, and the 5 major choices remain unchanged. */
(function(root,factory){const api=factory(root?.OneLifeSim,root?.OneLifeWorld4,root?.OneLifeWorld5,root?.OneLifeCareers6,root?.OneLifeEvents6);
if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.OneLifeWorld6=api;})(typeof window!=='undefined'?window:null,function(Sim,W4,W5,C,E){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),r=(life,age,s)=>W4.roll(life,age,s);
function ensure(life){W5.ensure(life);return life.world6||(life.world6={sector:'',profession:'',scene:'home',history:[],seen:[],eventCount:0,lastStory:'',incomeFactor:1,roleChanges:0,active:true});}
const PERIOD_JOBS=Object.freeze({agriculture:'농업 노동자',trades:'수공업 기술자',education:'학교 교육자',science:'연구 보조',health:'의료 종사자',service:'상점 종업원',business:'시장 상인',civic:'지역 공동체 활동가',media:'신문·출판 종사자',technology:'철도·통신 기술자',arts:'화가·공연인',sports:'체육 지도자'});
function career(life,sector,index,reason){
 const w=ensure(life),data=C.tracks[sector];if(!data)return false;
 const suggested=data.jobs[((index%7)+7)%7],resolved=typeof life.__v7resolveCareer==='function'?life.__v7resolveCareer(sector,suggested):suggested,
 title=life.country[0]==='대한민국'&&life.year<1990?(PERIOD_JOBS[sector]||'지역 생활 노동자'):resolved,
 changed=title!==w.profession;
 w.sector=sector;w.profession=title;w.incomeFactor=data.income;w.scene=C.mainScene[sector];
 life.career=title;life.world.occupation=title;
 if(changed){w.roleChanges++;w.history.push({age:life.age,sector,job:title});
 life.logEvent(title+'(으)로 '+reason+' 새로운 일을 시작했다.','profession');}
 return true;
}
function findCareer(life,age,reason){
 const a=life.arc,w=life.world,keys=Object.keys(C.tracks),weights=keys.map(key=>{
  let p=1;
  if(['education','science','health'].includes(key))p*=w.educationLevel.includes('고등')?3:w.educationYears<5?.45:1.3;
  const formalAccess=w.formalWorkAccess??.5;
  if(['education','science','health','technology','civic'].includes(key))p*=.58+formalAccess*.95;
  if(['agriculture','trades','service','business'].includes(key))p*=1.42-formalAccess*.55;
  if(['technology','trades'].includes(key))p*=['trade','training'].includes(a.path)?4:1.2;
  if(['business','service'].includes(key))p*=a.path==='work'||a.business?3.5:1.2;
  if(key==='civic')p*=a.community>=2?4:1;
  if(['arts','media'].includes(key))p*=a.path==='community'||a.tags.includes('arts')?2.8:1;
  if(key==='sports')p*=a.tags.includes('sports')?3:1;
  if(key==='agriculture')p*=life.profile.settlement==='농촌'?5:.65;
  if(age>32&&life.world6.sector===key)p*=1.8;
  return p*(typeof life.__v7sectorWeight==='function'?life.__v7sectorWeight(key):1);
 });
 let n=r(life,age,201)*weights.reduce((s,v)=>s+v,0),chosen=keys.at(-1);
 for(let i=0;i<keys.length;i++)if((n-=weights[i])<=0){chosen=keys[i];break;}
 return career(life,chosen,Math.floor(r(life,age,202)*7),reason);
}
function sync(life){
 const w=ensure(life),age=life.age,a=life.arc;
 if(age>=25&&!w.profession)findCareer(life,age,'첫 경력을 쌓으며');
 if(!w.profession)return;
 const faith=life.world5.faith;
 if(age>=29&&!['없음','비종교적 지역 활동'].includes(faith)){
  w.scene='temple';w.incomeFactor=.64;life.career=faith+'·지역 봉사';return;
 }
 if(age===30&&a.business)career(life,'business',Math.floor(r(life,age,220)*7),'창업하여');
 if([34,43,54,63].includes(age)){
  const chance=r(life,age,221);
  if(chance<.13+(a.learning>6?.07:0))findCareer(life,age,'이직하여');
  else if(chance<.45){const i=C.tracks[w.sector].jobs.indexOf(w.profession);
   career(life,w.sector,(i+1+Math.floor(r(life,age,223)*6))%7,'새로운 역할로');}
 }
 if(age===52&&a.business&&!['business','service'].includes(w.sector)&&r(life,age,225)<.35)
  career(life,'business',Math.floor(r(life,age,226)*7),'새 사업으로');
 if(age>=65&&life.money.retired===true){w.active=false;w.scene='retirement';return;}
 w.active=true;
 if(w.sector==='agriculture')w.scene=life.profile.settlement==='농촌'?'orchard':'farm';
 if(w.sector==='trades')w.scene=/제빵/.test(w.profession)?'bakery':/목수/.test(w.profession)?'construction':'workshop';
 if(w.sector==='health')w.scene=/간호사|응급/.test(w.profession)?'hospital':'clinic';
 if(w.sector==='arts')w.scene=/화가|사진|만화/.test(w.profession)?'gallery':'stage';
 if(w.sector==='sports')w.scene=/재활|지도/.test(w.profession)?'gym':'stadium';
 if(w.sector==='service')w.scene=/호텔/.test(w.profession)?'hotel':/요리사/.test(w.profession)?'restaurant':/운전|물류/.test(w.profession)?'street':'cafe';
 if(w.sector==='business')w.scene=/음식점/.test(w.profession)?'restaurant':/관광/.test(w.profession)?'airport':'market';
 if(w.sector==='media')w.scene=/출판|소설|번역/.test(w.profession)?'library':'studio';
 if(w.sector==='education')w.scene=/도서관/.test(w.profession)?'library':'classroom';
 if(w.sector==='civic')w.scene=/소방/.test(w.profession)?'street':/환경/.test(w.profession)?'forest':'townhall';
 if(life.world5.injury&&a.tags.includes('rehabilitation')&&age%12<3)w.scene='rehab';
}
function hasTag(life,need){
 const a=life.arc,t=a.tags;
 if(need==='career')return life.age>=24&&!!life.world6.profession;
 if(need==='family')return life.profile.partner||life.profile.child||a.community>=3;
 if(need==='savings')return life.money.netWorth>12000*(life.world?.economyScale||1);
 if(need==='debt')return life.money.netWorth<0;
 if(need==='community')return a.community>=2;
 if(need==='skill')return a.skill>=3;
 if(need==='faith')return !['없음','비종교적 지역 활동'].includes(life.world5.faith);
 if(need==='rehab')return life.world5.injury||t.includes('rehabilitation');
 if(need==='arts')return life.world6.sector==='arts'||t.includes('arts');
 if(need==='sports')return life.world6.sector==='sports'||t.includes('sports');
 if(need==='business')return life.world6.sector==='business'||a.business;
 return t.includes(need);
}
function eligible(life,e){const w=ensure(life);
 return life.age>=e.min&&life.age<=e.max&&!w.seen.includes(e.id)
  &&(e.domain==='all'||e.domain===w.sector)&&e.needs.every(n=>hasTag(life,n));
}
function event(life){
 // Career event catalogue is written for contemporary employment.
 if(life.year<2026)return false;
 const w=ensure(life),age=life.age;if(age<9||r(life,age,300)>.36)return false;
 const choices=E.events.filter(e=>eligible(life,e));if(!choices.length)return false;
 let sum=choices.reduce((s,e)=>s+e.weight*(e.domain===w.sector?1.8:1),0);
 let roll=r(life,age,301)*sum,pick=choices.at(-1);
 for(const e of choices){roll-=e.weight*(e.domain===w.sector?1.8:1);if(roll<=0){pick=e;break;}}
 if(pick.weight<.2&&r(life,age,302)>.1)return false;
 const a=life.arc,changes={};
 w.seen.push(pick.id);w.eventCount++;w.lastStory=pick.lines[Math.floor(r(life,age,303)*pick.lines.length)];
 for(const [k,v] of Object.entries(pick.change)){
  if(k==='money')life.money.netWorth=clamp(Math.round(life.money.netWorth+v*(life.world?.economyScale||1)),-2e7,2e7);
  else if(k==='tag'){if(!a.tags.includes(v))a.tags.push(v);}
  else if(['health','happiness','knowledge','bonds'].includes(k))changes[k]=v;
  else if(typeof a[k]==='number')a[k]=clamp(a[k]+v,-8,30);
 }
 life.change(changes);
 if(pick.id==='life-business-fail'&&a.business)a.business=false;
 if(pick.scene&&r(life,age,304)<.63)w.scene=pick.scene;
 life.logEvent(w.lastStory,'profession');
 return true;
}
function install(){
 if(!Sim?.Life||!W5?.ensure||!C?.tracks||!E?.events||Sim.Life.prototype.__world6)return false;
 const L=Sim.Life,tick=L.prototype.tick,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){if(!this.alive||this.pending)return false;ensure(this);
  const done=tick.call(this);if(done&&this.alive){sync(this);event(this);}return done;};
 L.prototype.snapshot=function(){ensure(this);return {...snapshot.call(this),world6:{
  ...this.world6,seen:[...this.world6.seen],history:this.world6.history.map(x=>({...x}))}};};
 L.restore=function(data){const life=restore.call(this,data);if(!life)return null;
  const w=ensure(life),d=data?.world6;if(d&&typeof d==='object'){
   for(const k of ['sector','profession','scene','lastStory'])if(typeof d[k]==='string')w[k]=d[k].slice(0,160);
   for(const k of ['eventCount','roleChanges'])if(Number.isFinite(d[k]))w[k]=clamp(d[k],0,500);
   if(Number.isFinite(d.incomeFactor))w.incomeFactor=clamp(d.incomeFactor,.3,2.5);
   w.active=d.active!==false;
   if(Array.isArray(d.seen))w.seen=d.seen.filter(x=>typeof x==='string').slice(0,250);
   if(Array.isArray(d.history))w.history=d.history.filter(x=>x&&typeof x.job==='string').slice(-35).map(x=>({...x}));
  }return life;};
 Object.defineProperty(L.prototype,'__world6',{value:true});return true;
}
install();
return Object.freeze({install,ensure,tracks:C.tracks,scenes:C.scenes,events:E.events,eligible,career,sync});
});