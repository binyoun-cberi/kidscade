/* Joseon Life v2: region, food reserves, famine, and policy consequences.
 * Historical dates are documented; all household resources, odds and outcomes
 * are fictional game mechanics, not measured Joseon demographics.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon2=api;
})(typeof window!=='undefined'?window:null,function(Sim,J){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SRC='https://contents.history.go.kr/';
const RULERS=[
 [1392,'태조'],[1398,'정종'],[1400,'태종'],[1418,'세종'],[1450,'문종'],
 [1452,'단종'],[1455,'세조'],[1468,'예종'],[1469,'성종'],[1494,'연산군'],
 [1506,'중종'],[1544,'인종'],[1545,'명종'],[1567,'선조'],[1608,'광해군'],
 [1623,'인조'],[1649,'효종'],[1659,'현종'],[1674,'숙종'],[1720,'경종'],
 [1724,'영조'],[1776,'정조'],[1800,'순조'],[1834,'헌종'],[1849,'철종'],
 [1863,'고종'],[1897,'고종 (대한제국)']
];
function ruler(year){
 for(let i=RULERS.length-1;i>=0;i--)if(year>=RULERS[i][0])return RULERS[i][1];
 return RULERS[0][1];
}
const REGIONAL={
 '한양':{work:'시전과 장터·수공업',special:'trade',grain:2,label:'도성의 시장과 관청'},
 '경기도':{work:'한양으로 오가는 곡물·운송',special:'transport',grain:5,label:'도성과 잇닿은 농촌'},
 '충청도':{work:'농사·장터와 세곡 운송',special:'farm',grain:7,label:'농촌과 내륙 장시'},
 '전라도':{work:'농경·포구와 해상 운송',special:'farm',grain:9,label:'곡창과 포구'},
 '경상도':{work:'농사·공예와 해안 교역',special:'port',grain:6,label:'바닷길과 산촌'},
 '강원도':{work:'산림·밭농사와 약초',special:'mountain',grain:3,label:'산악과 고갯길'},
 '황해도':{work:'농업·서해 연안 장시',special:'farm',grain:6,label:'서해의 들녘'},
 '평안도':{work:'국경 장시·운송·농사',special:'border',grain:4,label:'국경을 잇는 길'},
 '함경도':{work:'밭농사·산림과 변경 교역',special:'border',grain:3,label:'변방의 산지'},
 '제주도':{work:'밭농사·해산물 채취와 포구',special:'port',grain:4,label:'섬마을과 바닷길'}
};
const HISTORY=[
 {year:1418,title:'세종 즉위',detail:'세종이 왕위에 올랐다.',type:'court'},
 {year:1519,title:'기묘사화',detail:'조광조 등 개혁을 추진하던 사림 세력이 화를 입었다.',type:'court'},
 {year:1670,title:'경신대기근 시작',detail:'큰 흉년과 질병이 이어지며 여러 지역의 삶이 흔들렸다.',type:'famine'},
 {year:1671,title:'경신대기근 지속',detail:'경신대기근의 피해와 구휼 문제가 이어졌다.',type:'famine'},
 {year:1695,title:'을병대기근 시작',detail:'흉작과 재해로 곡식이 귀해지고 기근이 확산되었다.',type:'famine'},
 {year:1696,title:'을병대기근 지속',detail:'기근이 이어지며 지역의 생계와 돌봄이 어려워졌다.',type:'famine'},
 {year:1728,title:'이인좌의 난',detail:'영조 때 반란이 일어나 충청도 등 일부 지역에 영향을 주었다.',type:'unrest',regions:['충청도','경상도']},
 {year:1791,title:'신해통공',detail:'도성 시장에서 육의전을 제외한 시전의 금난전권이 폐지되었다.',type:'market',regions:['한양','경기도']},
 {year:1866,title:'병인양요',detail:'프랑스군의 침입과 강화도 일대의 무력 충돌이 일어났다.',type:'unrest',regions:['경기도']},
 {year:1871,title:'신미양요',detail:'미군의 침입으로 강화도에서 전투가 일어났다.',type:'unrest',regions:['경기도']},
 {year:1882,title:'임오군란',detail:'구식 군대의 봉기와 도성의 혼란이 일어났다.',type:'unrest',regions:['한양']},
 {year:1884,title:'갑신정변',detail:'개화파의 정변이 일어났으나 짧은 기간 만에 실패했다.',type:'court'},
 {year:1894,title:'동학농민운동',detail:'전라도에서 시작된 농민 봉기가 여러 지역으로 확산되었다.',type:'unrest',regions:['전라도','충청도','경상도']},
 {year:1895,title:'을미사변',detail:'명성황후가 일본 세력에 의해 시해되었다.',type:'court'}
].map(e=>Object.freeze({...e,source:SRC}));
function at(year){return HISTORY.find(x=>x.year===year)||null;}
function fresh(life){
 const j=J.ensure(life),place=REGIONAL[j.region]||REGIONAL['경기도'];
 return {version:2,processedYear:life.birthYear,grain:clamp(19+place.grain*3+(j.family==='여유 있는 형편'?18:j.family==='빠듯한 형편'?-12:0),5,90),
  helpGiven:0,community:50,scarcityUntil:0,eventsSeen:[],regionMemories:[],decisions:[],followups:[],
  active:null,deferred:null,regionVisits:0,source:'educational-fiction-joseon-regional-v2'};
}
function ensure(life){
 if(!J?.isJoseon(life))return null;
 return life.joseon2||(life.joseon2=fresh(life));
}
function record(life,s,text,kind='joseon2-life'){
 life.logEvent(text,kind);
 if(kind==='joseon2-memory'){
  s.regionMemories.push(text);s.regionMemories=s.regionMemories.slice(-16);
 }
}
function offer(life,s,kind,title){
 const next={kind,title,year:life.year,id:kind+'-'+life.year};
 if(s.decisions.some(d=>d.id===next.id)||s.deferred?.id===next.id||s.active?.id===next.id)return;
 if(life.pending){s.deferred=next;return;}
 s.active=next;life.pending='joseon2:'+next.id;
}
function promote(life,s){
 if(!s?.deferred||!life.alive||life.pending||!J.inOldEra(life))return;
 const next=s.deferred;s.deferred=null;s.active=next;life.pending='joseon2:'+next.id;
}
const option=(label,noteText,action,effects)=>({label,note:noteText,action,effects:effects||{}});
function prompt(life){
 const s=ensure(life),q=s?.active;if(!q)return null;
 const j=J.ensure(life),r=REGIONAL[j.region]||REGIONAL['경기도'];
 const social=life.joseon5;
 const bound=social&&['사노비','공노비'].includes(social.origin)&&!social.freed&&life.year<1894;
 if(bound&&['regional','market'].includes(q.kind))
  return {title:q.kind==='regional'?'예속된 처지에서 만난 고을의 일':'장터의 변화와 일터의 부담',
   description:'주인이나 관아의 허락 없이 자유롭게 이주하거나 장사를 시작할 수 없다. 생활 속에서 가능한 길을 생각한다.',
   options:[
    option('함께 일하는 사람을 돕는다','일손과 관계를 나눈다','mutual',{bonds:5}),
    option('맡은 일을 이어 간다','오늘 맡은 일을 마무리한다','steady',{health:-2}),
    option('어려운 사정을 알리고 도움을 구한다','무리하지 않고 도움을 청한다','askHelp',{knowledge:3})]};
 if(q.kind==='famine')return {title:q.title+' · 집안의 곡식을 어떻게 할까?',description:j.region+'에 흉년이 들었다. 곳간에 곡식이 '+s.grain+'남았다. 어느 길을 택할까?',options:[
  option(s.grain?'남은 곡식을 아껴 쓴다':'끼니를 줄이며 버틴다','배고픔을 참고 다가올 계절을 대비한다','ration',{health:-3,happiness:-3}),
  s.grain>=20
    ?option('이웃과 곡식을 나눈다','곳간에서 곡식 20을 내어 이웃과 나눈다','share',{bonds:9,wealth:-5})
    :option('이웃에게 도움을 청한다','나눌 곡식이 없어 사정을 알리고 일손을 보탠다','askHelp',{bonds:3,health:-2}),
  option('먹을 것을 찾아 다른 고을로 간다','옮겨 갈 비용과 위험을 감수한다','move',{health:2,wealth:-8})]};
 if(q.kind==='market')return {title:'장터의 규칙이 달라지는 날',description:'정조 때의 신해통공으로 한양 시장의 독점적인 영업 권리가 일부 제한되었다. '+r.label+'의 장사꾼들에게는 새로운 가능성과 갈등이 있다.',options:[
  option('새 장터의 거래를 시도한다','돈을 들여 새 거래처를 찾는다','openTrade',{knowledge:5,wealth:-4}),
  option('익숙한 거래를 이어 간다','급격한 변화를 피해 살림을 지킨다','steady',{wealth:3}),
  option('이웃들과 공동으로 물건을 운반한다','운반 일을 나누어 작은 이익을 모은다','cooperate',{bonds:7})]};
 if(q.kind==='regional')return {title:j.region+'에서 새로운 일을 생각하다',description:r.label+'에서 '+r.work+' 일을 접할 수 있다. 익숙한 길만이 유일한 선택은 아니다.',options:[
  option('고향의 농사와 생업을 키운다','땅과 기술에 투자하며 다음 수확을 준비한다','homeland',{wealth:-3,knowledge:2}),
  option('장터나 이웃 고을로 나아간다','낯선 거래와 새로운 사람들을 만난다','commerce',{knowledge:5,health:-2}),
  option('가족과 이웃의 살림을 함께 돌본다','혼자 얻는 이익보다 서로의 도움을 택한다','mutual',{bonds:8,happiness:3})]};
 if(q.kind==='revolt')return {title:q.title+' · 고을이 술렁이는 날',description:'이 지역에서도 소문과 혼란이 일상에 영향을 미칠 수 있다. 이 인물이 실제 봉기에 참가했다고 가정하지는 않는다.',options:[
  option('가족과 생업을 지키며 지낸다','집안에 필요한 것부터 챙긴다','shelter',{bonds:5,wealth:-4}),
  option('위험한 길을 피해 다른 곳으로 간다','일부 재산을 두고 피란한다','avoid',{health:3,wealth:-7}),
  option('이웃을 도우며 소식을 확인한다','함께 상황을 살피고 도움을 나눈다','aid',{bonds:7,health:-2})]};
 return null;
}
function decide(life,index){
 const s=ensure(life),p=prompt(life);
 if(!s?.active||!p||!life.alive||!Number.isInteger(index)||index<0||index>=p.options.length)return false;
 const a=p.options[index],j=J.ensure(life),kind=s.active.kind;
 life.change(a.effects);
 if(a.action==='ration'){s.grain=clamp(s.grain-7,0,200);s.scarcityUntil=Math.max(s.scarcityUntil,life.year+2);}
 if(a.action==='share'){if(s.grain<20)return false;s.grain-=20;s.helpGiven++;s.community=clamp(s.community+12,0,100);}
 if(a.action==='askHelp'){s.community=clamp(s.community+5,0,100);s.grain=clamp(s.grain+3,0,200);}
 if(a.action==='move'){j.capital-=15;j.relocations++;s.grain=clamp(s.grain+6,0,200);j.hardshipUntil=Math.max(j.hardshipUntil,life.year+1);}
 if(a.action==='openTrade'){j.capital-=6;j.occupation='장사·수공업';s.community=clamp(s.community+2,0,100);}
 if(a.action==='steady'){j.capital+=6;}
 if(a.action==='cooperate'){s.community=clamp(s.community+9,0,100);j.capital+=3;}
 if(a.action==='homeland'){j.land+=1;j.capital-=7;s.grain=clamp(s.grain+8,0,200);}
 if(a.action==='commerce'){j.occupation='장사·수공업';j.capital+=8;j.relocations++;s.regionVisits++;}
 if(a.action==='mutual'){s.community=clamp(s.community+12,0,100);s.helpGiven++;}
 if(a.action==='shelter'){s.grain=clamp(s.grain-4,0,200);}
 if(a.action==='avoid'){j.relocations++;j.capital-=11;j.hardshipUntil=Math.max(j.hardshipUntil,life.year+1);}
 if(a.action==='aid'){s.community=clamp(s.community+10,0,100);s.helpGiven++;}
 j.capital=clamp(j.capital,-120,600);
 if(life.money)life.money.netWorth=j.capital*100;
 const chosen=p.title+' — '+a.label;
 record(life,s,chosen,'joseon2-choice');
 s.decisions.push({id:s.active.id,year:life.year,kind,action:a.action,label:a.label});
 s.decisions=s.decisions.slice(-40);
 const echoes={
  ration:'흉년 뒤에도 아껴 먹던 버릇이 남았다. 곳간의 곡식을 다시 헤아렸다.',
  share:'곡식을 나누었던 이웃과 다시 만났다. 어려운 시절에 나눈 몫을 기억하고 있었다.',
  askHelp:'그때 사정을 들어 준 이웃에게 고마운 마음을 전했다.',
  move:'낯선 고을에서 지내며 잃어버린 물건과 새로 얻은 인연을 헤아렸다.',
  openTrade:'새로 알게 된 상인이 다시 물건을 보러 찾아왔다.',
  steady:'익숙한 장터에서 거래를 이어 가며 변해 가는 상권을 지켜보았다.',
  cooperate:'짐을 나누어 나르던 사람들이 다시 장터에 모였다.',
  homeland:'돌보던 논밭에서 그해의 수확을 거두었다.',
  commerce:'다른 고을 장터에서 배운 흥정법을 다시 써 볼 일이 생겼다.',
  mutual:'함께 살림을 돌본 이웃이 이번에는 손을 보태 주었다.',
  shelter:'고을의 혼란은 가라앉았지만 그때 잃은 것은 쉽게 돌아오지 않았다.',
  avoid:'피란을 끝내고 돌아와도 살림을 다시 꾸리는 데 시간이 들었다.',
  aid:'혼란 속에서 이웃을 돕던 날이 사람들 사이에서 다시 이야기되었다.'
 };
 life.log.at(-1).causeId='joseon2:'+s.active.id;
 s.followups.push({year:life.year+3,id:s.active.id,text:echoes[a.action]||'그 무렵의 일이 오래 기억에 남았다.'});
 s.followups=s.followups.slice(-16);
 s.active=null;life.pending=null;
 promote(life,s);return true;
}
const FAMINE=new Set([1670,1671,1695,1696]);
function processYear(life){
 const s=ensure(life),j=J.ensure(life);if(!s||!life.alive||!J.inOldEra(life)||s.processedYear>=life.year)return false;
 s.processedYear=life.year;
 const r=REGIONAL[j.region]||REGIONAL['경기도'],age=life.age;
 // Small, explicitly invented food-resource ledger, separate from monetary history.
 if(age>=8){
  let annual=r.grain+(j.occupation.includes('농사')?4:0)+Math.min(12,Math.max(0,j.land)*2)-(j.household*2);
  if(life.year<=s.scarcityUntil)annual-=7;
  // Harvest, consumption and spoilage. Households with earnings can buy food at a cost;
  // trade is not invented production, and reserves never become free in a shortage.
  s.grain=clamp(Math.round(s.grain*.92)+annual,0,120);
  if(s.grain<9&&j.capital>=8&&life.year>s.scarcityUntil){
   j.capital-=6;s.grain=clamp(s.grain+12,0,120);
  }
  if(s.grain<8&&age%3===0){life.change({health:-2,happiness:-2});record(life,s,'먹을 곡식이 부족해 품을 더 팔거나 지출을 줄여야 했다.','joseon2-memory');}
 }
 if(s.followups.length){
  for(const f of s.followups.filter(x=>x.year===life.year)){
   record(life,s,f.text,'joseon2-followup');if(f.id)life.log.at(-1).causeId='joseon2:'+f.id;
   if(s.community>65)j.capital=clamp(j.capital+3,-120,600);
  }
  s.followups=s.followups.filter(x=>x.year>life.year);
 }
 const hit=at(life.year);
 if(hit&&!s.eventsSeen.includes(hit.year)){
  s.eventsSeen.push(hit.year);
  record(life,s,hit.year+'년 · '+hit.title+' — '+hit.detail,'history');
  if(hit.type==='famine'){
   const shock=age<6?8:18+(j.household*2);
   s.grain=clamp(s.grain-shock,0,200);
   j.capital=clamp(j.capital-(age>=12?10:4),-120,600);
   j.hardshipUntil=Math.max(j.hardshipUntil,life.year+2);
   j.educationPausedUntil=Math.max(j.educationPausedUntil,life.year+1);
   s.scarcityUntil=Math.max(s.scarcityUntil,life.year+2);
   life.change({health:-3,happiness:-5,wealth:-5});
   record(life,s,'흉년의 여파로 집안의 곡식과 재산이 줄었다. 다음 해에도 부족함이 남았다.','joseon2-memory');
   if(age>=9&&age<=74&&[1670,1695].includes(hit.year))offer(life,s,'famine',hit.title);
  } else if(hit.type==='market'&&hit.regions.includes(j.region)&&age>=14&&age<75){
   offer(life,s,'market',hit.title);
  } else if(hit.type==='unrest'&&hit.regions?.includes(j.region)){
   j.hardshipUntil=Math.max(j.hardshipUntil,life.year+1);
   j.capital=clamp(j.capital-5,-120,600);
   life.change({happiness:-3});
   record(life,s,'고을에 불안한 소식이 돌며 생업과 통행을 조심하게 되었다.','joseon2-memory');
   if(age>=14&&age<75&&hit.year===1894)offer(life,s,'revolt',hit.title);
  }
 }
 // Region-specific, non-combat choices at three extra life milestones.
 if([29,46,65].includes(age)&&!FAMINE.has(life.year)&&life.year!==1894)
  offer(life,s,'regional',j.region+'의 생업');
 if(life.money)life.money.netWorth=j.capital*100;
 promote(life,s);return true;
}
function summary(life){
 const s=ensure(life);if(!s)return null;
 const j=J.ensure(life),r=REGIONAL[j.region]||REGIONAL['경기도'];
 return {ruler:ruler(life.year),regionWork:r.work,regionLabel:r.label,
  grain:s.grain,community:s.community,helpGiven:s.helpGiven,
  scarcityUntil:s.scarcityUntil,events:s.eventsSeen.length,decisions:s.decisions.length,
  lastMemory:s.regionMemories.at(-1)||'',recent:s.regionMemories.slice(-3)};
}
function hydrate(life,data){
 const s=ensure(life),old=data?.joseon2;if(!s||!old||old.version!==2)return s;
 for(const k of ['grain','community','helpGiven','scarcityUntil','regionVisits','processedYear']){
  if(Number.isInteger(old[k]))s[k]=clamp(old[k],0,k==='grain'?200:k==='community'?100:k==='processedYear'?life.year:k==='scarcityUntil'?life.year+12:10000);
 }
 // W2 reconstitutes household data from seed; retain the actual saved profile for a Joseon life.
 if(data?.profile&&Number.isFinite(data.profile.familyIncome)&&life.profile)
  life.profile.familyIncome=clamp(Math.round(data.profile.familyIncome),0,100000000);
 s.eventsSeen=Array.isArray(old.eventsSeen)?old.eventsSeen.filter(x=>Number.isInteger(x)&&x>=1392&&x<=1897).slice(-24):[];
 s.regionMemories=Array.isArray(old.regionMemories)?old.regionMemories.filter(x=>typeof x==='string').slice(-16).map(x=>x.slice(0,160)):[];
 s.decisions=Array.isArray(old.decisions)?old.decisions.filter(x=>x&&typeof x.id==='string'&&Number.isInteger(x.year)&&x.year<=life.year).slice(-40)
   .map(x=>({id:x.id.slice(0,60),year:x.year,kind:String(x.kind||'').slice(0,25),action:String(x.action||'').slice(0,40),label:String(x.label||'').slice(0,90)})):[];
 s.followups=Array.isArray(old.followups)?old.followups.filter(x=>x&&Number.isInteger(x.year)&&x.year>life.year&&typeof x.text==='string').slice(-16)
   .map(x=>({id:String(x.id||'').slice(0,60),year:x.year,text:x.text.slice(0,170)})):[];
 const valid=q=>q&&typeof q.id==='string'&&['famine','market','regional','revolt'].includes(q.kind)&&
  Number.isInteger(q.year)&&q.year<=life.year&&q.year>=life.birthYear;
 if(valid(old.deferred))s.deferred={id:old.deferred.id.slice(0,60),kind:old.deferred.kind,year:old.deferred.year,title:String(old.deferred.title||'').slice(0,90)};
 if(valid(old.active)&&data.pending==='joseon2:'+old.active.id&&life.alive&&J.inOldEra(life)){
  s.active={id:old.active.id.slice(0,60),kind:old.active.kind,year:old.active.year,title:String(old.active.title||'').slice(0,90)};
  life.pending='joseon2:'+s.active.id;
 }
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||Sim.Life.prototype.__joseon2)return false;
 const L=Sim.Life,tick=L.prototype.tick,choose=L.prototype.choose,getChoice=L.prototype.getChoice,
  reflect=L.prototype.reflect,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this))return tick.call(this);
  const prior=this.year,changed=tick.call(this);
  if(changed&&this.year!==prior&&this.alive)processYear(this);
  return changed;
 };
 L.prototype.getChoice=function(){
  return J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon2:')
   ?prompt(this):getChoice.call(this);
 };
 L.prototype.choose=function(index){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon2:'))
   return decide(this,index);
  const done=choose.call(this,index);
  if(done&&J.inOldEra(this))promote(this,ensure(this));
  return done;
 };
 L.prototype.reflect=function(message){
  const done=reflect.call(this,message);
  if(done&&J.inOldEra(this))promote(this,ensure(this));
  return done;
 };
 L.prototype.snapshot=function(){
  const original=snapshot.call(this);
  if(J.isJoseon(this))original.joseon2=JSON.parse(JSON.stringify(ensure(this)));
  return original;
 };
 L.restore=function(data){const life=restore.call(this,data);if(life&&J.isJoseon(life))hydrate(life,data);return life;};
 Object.defineProperty(L.prototype,'__joseon2',{value:true});return true;
}
install();
return Object.freeze({install,ensure,summary,prompt,decide,processYear,ruler,at,HISTORY,REGIONAL});
});