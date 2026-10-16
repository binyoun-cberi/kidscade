/* One Life v22 — historical residence, missions and diaspora.
 * Home/captivity/voluntary migration stay separate; distances are narrative, not simulated routes.
 * Historical anchors: National Institute of Korean History, National Archives of Korea.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon5);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeTravel22=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V5){
'use strict';
const VERSION=1;
const SOURCES=Object.freeze({
 ming:'https://contents.history.go.kr/',
 hawaii:'https://theme.archives.go.kr/next/immigration/endoftheJoseonDynasty.do',
 japan:'https://contents.history.go.kr/',
 qing:'https://contents.history.go.kr/'
});
const desc={
 ming:{place:'명나라로 향하는 사행길',region:'명나라',reason:'사행·수행',brief:'조정의 사신과 함께 명나라에 다녀올 길이 열렸다. 관청에서 맡긴 일과 길 위의 고단함을 생각해야 한다.'},
 hawaii:{place:'하와이의 사탕수수 농장',region:'하와이',reason:'모집 노동 이주',brief:'바다 건너 하와이의 농장에서 사람을 모집한다는 말이 들렸다. 먼 길과 계약된 노동을 감당해야 한다.'}
};
const hash=(seed,year,salt)=>{let x=((seed>>>0)^Math.imul(year+salt,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;};
const clean=(x,n=140)=>String(x||'').slice(0,n);
const isHome=l=>!l?.travel22?.residence?.abroad;
function eligible(l,route){
 if(!l?.alive||l.country?.[0]!=='대한민국'||!isHome(l)||l.joseon14?.captivity?.status==='held')return false;
 if(route==='hawaii')return l.year>=1903&&l.year<=1905&&l.age>=16&&l.age<=48;
 if(route!=='ming'||!J?.isJoseon(l)||!J.inOldEra(l)||l.year<1420||l.year>1590||l.age<18||l.age>55)return false;
 const social=V5?.summary(l)||{};
 if(['사노비','공노비','백정'].includes(social.origin)&&!social.freed)return false;
 return social.origin==='역관 가계'||social.rank>=1||J.ensure(l)?.literacy>=2;
}
function ensure(l){
 if(!l||l.country?.[0]!=='대한민국')return null;
 if(!l.travel22)l.travel22={version:VERSION,birthplace:clean(l.joseon?.region||l.profile?.city||'한반도',40),
  residence:{abroad:false,place:'고향',region:'한반도',reason:'',since:l.birthYear,route:'home',until:null},
  movements:[],pending:null,seen:[],decisions:[],lastYear:l.year,yearsAbroad:0,
  letters:0,earnings:0,relationships:0,stayed:false,source:null};
 return l.travel22;
}
function prompt(l){
 const s=ensure(l);if(!s?.pending)return null;
 const q=s.pending;
 if(q.type==='invite'){
  const route=desc[q.route];if(!route)return null;
  return {title:q.route==='ming'?'명나라에 다녀올 기회':'하와이에서 일할 사람을 찾다',
   description:route.brief,options:[
    {label:q.route==='ming'?'사행을 따라나선다':'계약 내용을 살피고 바다를 건넌다',
     note:q.route==='ming'?'맡은 일을 마친 뒤 귀국해야 한다':'떠나면 집으로 돌아오는 일도 쉽지 않다'},
    {label:'가족과 의논하고 고향에 남는다',note:'이번에는 집안의 생활을 이어 간다'},
    {label:'이웃의 준비를 돕는다',note:'먼 곳에 가는 사람에게 작은 힘을 보탠다'}]};
 }
 if(q.type==='abroad'){
  if(s.residence.route==='ming')return {title:'먼 나라에서 맡은 일',
   description:'사행길에서 낮선 말과 관례를 듣는다. 곧 돌아갈 채비도 해야 한다.',
   options:[{label:'통역과 기록을 살핀다',note:'맡은 문서를 챙긴다'},
    {label:'현지 사람과 물건에 대해 묻는다',note:'낯선 생활을 배운다'},
    {label:'동행한 사람을 보살핀다',note:'길 위의 안전을 생각한다'}]};
  return {title:'하와이의 하루',
   description:l.year<1910?'끝없는 사탕수수밭에서 긴 하루가 이어진다.':
    '동포들의 소식이 오가고, 고향에 편지를 보내는 사람도 있다. 먼 곳에서 살아갈 길을 다시 생각한다.',
   options:[{label:'농장의 일을 이어 간다',note:'고단하지만 살림을 이어 간다'},
    {label:'이웃과 글과 소식을 나눈다',note:'서로의 언어와 사정을 살핀다'},
    {label:'고향에 편지를 쓰고 귀국 길을 알아본다',note:'소식과 비용을 마련해도 귀국이 보장되지는 않는다'}]};
 }
 return null;
}
function offer(l,route){
 if(!eligible(l,route))return false;
 const s=ensure(l),id=route+':'+l.year;
 if(s.seen.includes(id)||s.pending||l.pending)return false;
 s.seen.push(id);s.seen=s.seen.slice(-36);
 s.pending={type:'invite',route,id,year:l.year};
 l.pending='travel22:'+id;
 return true;
}
function maybeOffer(l){
 if(!l?.alive||l.pending||!isHome(l))return false;
 const routes=l.year>=1903&&l.year<=1905?['hawaii']:l.year>=1420&&l.year<=1590?['ming']:[];
 for(const route of routes){
  if(!eligible(l,route))continue;
  const s=ensure(l),id=route+':'+l.year;if(s.seen.includes(id))continue;
  const chance=route==='hawaii'?.68:.19;
  if(hash(l.seed,l.year,route==='ming'?119:120)<chance)return offer(l,route);
 }
 return false;
}
function move(l,route){
 const s=ensure(l),r=desc[route];if(!r||!isHome(l))return false;
 s.residence={abroad:true,place:r.place,region:r.region,reason:r.reason,route,since:l.year,
  until:route==='ming'?l.year+2:null};
 s.movements.push({year:l.year,place:r.place,reason:r.reason,route,action:'출발'});
 s.movements=s.movements.slice(-24);s.yearsAbroad=0;s.source=SOURCES[route];
 l.logEvent(route==='ming'?'사행을 따라 명나라로 향했다. 고향에서 멀어지는 길 위에 올랐다.':
  '하와이로 향하는 배에 올랐다. 가족과 고향의 모습이 점점 멀어졌다.','travel22-depart');
 return true;
}
function homecoming(l,why){
 const s=ensure(l);if(!s?.residence.abroad)return false;
 const past=s.residence.region,route=s.residence.route;
 s.movements.push({year:l.year,place:s.birthplace,reason:why,route,action:'귀환'});s.movements=s.movements.slice(-24);
 s.residence={abroad:false,place:'고향',region:'한반도',reason:'',route:'home',since:l.year,until:null};
 s.source=null;s.stayed=false;
 l.logEvent(past+'에서의 세월을 뒤로하고 고향에 돌아왔다. 오랫동안 보지 못한 사람들의 소식을 물었다.','travel22-return');
 return true;
}
function choose(l,index){
 const s=ensure(l),q=s?.pending,view=prompt(l);
 if(!l?.alive||!q||l.pending!=='travel22:'+q.id||!Number.isInteger(index)||index<0||index>=view?.options?.length)return false;
 const option=view.options[index],route=q.route;
 s.decisions.push({year:l.year,kind:q.type,choice:index,route:route||s.residence.route});
 s.decisions=s.decisions.slice(-65);s.pending=null;l.pending=null;
 if(q.type==='invite'){
  if(index===0)move(l,route);
  else l.logEvent(index===1?'가족과 의논한 끝에 고향에서 살림을 이어 가기로 했다.':
   '먼 길을 떠나는 이웃의 짐과 준비를 함께 챙겼다.','travel22-choice');
 }else if(q.type==='abroad'){
  if(s.residence.route==='ming'){
   const text=['사행에 필요한 문서와 말을 정리했다.','말이 다른 사람들과 물건과 풍습을 이야기했다.','함께 먼 길에 오른 사람의 짐을 나누어 들었다.'][index];
   l.change(index===0?{knowledge:3}:index===1?{knowledge:2,bonds:2}:{health:1,bonds:3});
   l.logEvent(text,'travel22-choice');
  }else{
   if(index===0){s.earnings=Math.min(160,s.earnings+4);l.change({wealth:2,health:-2});l.logEvent('길고 고단한 노동을 마쳤다. 하루의 품삯에서 먹을 비용을 헤아렸다.','travel22-choice');}
   if(index===1){s.relationships=Math.min(100,s.relationships+3);l.change({knowledge:2,bonds:3});l.logEvent('다른 고향에서 온 이웃과 모여 말과 소식을 나누었다.','travel22-choice');}
   if(index===2){
    s.letters=Math.min(100,s.letters+1);l.change({knowledge:1,bonds:2});
    const years=l.year-s.residence.since;
    const success=years>=3&&hash(l.seed,l.year,993)<.32;
    if(success){homecoming(l,'귀국 길을 마련함');}
    else l.logEvent('고향에 편지를 썼지만 돌아갈 여비와 길을 마련하기는 쉽지 않았다.','travel22-choice');
   }
  }
 }
 return true;
}
function abroadYear(l,s){
 s.yearsAbroad=Math.max(0,l.year-s.residence.since);
 const r=s.residence.route;
 // Historical expatriates do not collect domestic Joseon taxes, farm income or Korean housing events.
 if(r==='ming'){
  if(l.year>=s.residence.until){homecoming(l,'사행을 마치고 돌아옴');return;}
  l.logEvent('관청의 문서를 맡아 살피며 낯선 땅의 사람들과 하룻밤을 보냈다.','travel22-daily');
 }else if(r==='hawaii'){
  if(l.age>=17&&l.age<=65){
   // Narrative units, not historical dollars or contemporary Korean won.
   s.earnings=Math.min(160,s.earnings+1);
   l.change({health:l.year%3===0?-2:-1,wealth:1});
  }
  if(l.year>=1909&&l.year%5===0)l.logEvent('하와이의 한인들이 서로 돕고 고향의 소식을 나누기 위해 모였다.','travel22-daily');
  else l.logEvent('바다를 건너온 동포들과 일과 밥을 나누었다. 먼 고향의 안부를 기다렸다.','travel22-daily');
 }
 if(!l.pending&&(s.yearsAbroad===1||s.yearsAbroad%3===0)){
  s.pending={type:'abroad',id:'year-'+l.year,year:l.year,route:r};
  l.pending='travel22:'+s.pending.id;
 }
}
function captivityResidence(l){
 const c=l?.joseon14?.captivity;if(!c||c.status!=='held')return null;
 const realm=c.realm==='japan'?'일본':c.realm==='laterJin'?'후금':'청';
 return {abroad:true,place:realm+'에서 포로로 지내는 중',region:realm,reason:'전쟁 중 피랍·포로',route:'captivity',since:c.from,until:null};
}
function summary(l){
 const s=ensure(l);if(!s)return null;
 const captive=captivityResidence(l),r=captive||s.residence;
 return {birthplace:s.birthplace,residence:{...r},yearsAbroad:captive?l.year-captive.since:s.yearsAbroad,
  letters:s.letters,earnings:s.earnings,relationships:s.relationships,
  movements:s.movements.map(q=>({...q})),source:captive?(r.region==='일본'?SOURCES.japan:SOURCES.qing):s.source,
  fictional:true};
}
function hydrate(l,data){
 const s=ensure(l),saved=data?.travel22;if(!s||!saved||saved.version!==VERSION)return s;
 const route=saved.residence?.route,year=saved.residence?.since;
 s.birthplace=clean(saved.birthplace,40)||s.birthplace;
 if(['ming','hawaii'].includes(route)&&saved.residence.abroad===true&&Number.isInteger(year)&&year>=l.birthYear&&year<=l.year&&
    (route==='hawaii'?year>=1903&&year<=1905:year>=1420&&year<=1590)&&
    (route!=='ming'||l.year<year+2)){
  const r=desc[route];
  s.residence={abroad:true,place:r.place,region:r.region,reason:r.reason,route,since:year,until:route==='ming'?year+2:null};
  s.source=SOURCES[route];
 }else{s.residence={abroad:false,place:'고향',region:'한반도',reason:'',route:'home',since:l.year,until:null};s.source=null;}
 if(Array.isArray(saved.movements))s.movements=saved.movements.filter(q=>q&&Number.isInteger(q.year)&&q.year>=l.birthYear&&q.year<=l.year&&['ming','hawaii'].includes(q.route)&&['출발','귀환'].includes(q.action))
  .slice(-24).map(q=>({year:q.year,place:clean(q.place,48),reason:clean(q.reason,48),route:q.route,action:q.action}));
 if(Array.isArray(saved.seen))s.seen=saved.seen.filter(q=>typeof q==='string'&&/^(ming|hawaii):\d{4}$/.test(q)).slice(-36);
 if(Array.isArray(saved.decisions))s.decisions=saved.decisions.filter(q=>q&&Number.isInteger(q.year)&&q.year>=l.birthYear&&q.year<=l.year&&['invite','abroad'].includes(q.kind)&&[0,1,2].includes(q.choice)).slice(-65).map(q=>({year:q.year,kind:q.kind,choice:q.choice,route:q.route==='hawaii'?'hawaii':'ming'}));
 for(const key of ['yearsAbroad','letters','earnings','relationships'])s[key]=Number.isInteger(saved[key])?Math.max(0,Math.min(160,saved[key])):0;
 const p=saved.pending;
 const permitted=p&&p.year===l.year&&typeof p.id==='string'&&p.id.length<60&&
  (p.type==='invite'&&eligible(l,p.route)&&s.seen.includes(p.id)||
    p.type==='abroad'&&s.residence.abroad&&p.route===s.residence.route);
 if(permitted&&data.pending==='travel22:'+p.id&&l.alive){
  s.pending={type:p.type,route:p.route,id:p.id,year:p.year};l.pending='travel22:'+p.id;
 }else s.pending=null;
 return s;
}
function install(){
 if(!Sim?.Life||Sim.Life.prototype.__travel22)return false;
 const L=Sim.Life,tick=L.prototype.tick,originalChoice=L.prototype.choose,
  originalPrompt=L.prototype.getChoice,originalReflect=L.prototype.reflect,
  originalSnapshot=L.prototype.snapshot,originalRestore=L.restore;
 L.prototype.tick=function(){
  const state=ensure(this);
  if(state?.residence.abroad){
   if(!this.alive||this.pending)return false;
   const before=this.year,n=this.log.length;
   const ok=Sim.advanceCoreYear(this);
   if(ok&&this.year!==before){
    // Base engine's generic school/career choices are not overseas scenes.
    this.log=this.log.filter((x,i)=>i<n||x.kind==='death');
    if(this.pending)this.pending=null;
    if(this.alive)abroadYear(this,state);
   }
   return ok;
  }
  const old=this.year,ok=tick.call(this);
  if(ok&&this.alive&&this.year!==old)maybeOffer(this);
  return ok;
 };
 L.prototype.getChoice=function(){
  if(typeof this.pending==='string'&&this.pending.startsWith('travel22:'))return prompt(this);
  return originalPrompt.call(this);
 };
 L.prototype.choose=function(i){
  if(typeof this.pending==='string'&&this.pending.startsWith('travel22:'))return choose(this,i);
  const ok=originalChoice.call(this,i);
  if(ok&&this.alive&&!this.pending)maybeOffer(this);
  return ok;
 };
 L.prototype.reflect=function(t){const ok=originalReflect.call(this,t);if(ok&&this.alive&&!this.pending)maybeOffer(this);return ok;};
 L.prototype.snapshot=function(){const data=originalSnapshot.call(this);if(this.travel22)data.travel22=JSON.parse(JSON.stringify(this.travel22));return data;};
 L.restore=function(data){const life=originalRestore.call(this,data);if(life&&data?.travel22)hydrate(life,data);return life;};
 Object.defineProperty(L.prototype,'__travel22',{value:true});return true;
}
install();
return Object.freeze({VERSION,SOURCES,eligible,ensure,offer,maybeOffer,prompt,choose,summary,hydrate,homecoming,captivityResidence,install});
});
