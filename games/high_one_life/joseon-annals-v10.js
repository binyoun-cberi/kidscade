/* Joseon Annals: verified, year-specific primary-source accounts.
 * FACT = court record exactly linked to sillok.history.go.kr/id/{record}.
 * FICTION = player's household response and its fictional resource deltas.
 * An article mentioning a proposal does not mean it was implemented everywhere.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon5);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseonAnnals=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V5){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const opt=(label,note,result,effects={})=>({label,note,result,effects});
const article=(id,year,day,sourceTitle,title,fact,scene,regions,options)=>Object.freeze({
 id,year,day,sourceTitle,title,fact,scene,regions,options,
 url:'https://sillok.history.go.kr/id/'+id,
 authenticity:'primary-record',scenario:'fictional-household'
});
const ARTICLES=Object.freeze([
 article('wda_11809006_005',1436,'1436-09-06','세종실록 74권','경상도에 환자곡을 나누라는 명',
  '경상도에서 사사로이 이자를 받으며 빌려주던 곡식을 환자곡으로 나눠 굶주린 이를 구제하도록 하였다.',
  '경상도의 여러 고을에 굶주린 사람들에게 곡식을 나누라는 명이 전해졌다. 우리 집 곳간도 넉넉하지 않다.',
  ['경상도'],[
   opt('관아에서 곡식 나누는 일을 알아본다','집안의 끼니를 지킬 길을 찾는다','관아에 곡식 사정을 물으러 갔던 일을 기억했다.',{knowledge:2,grain:4}),
   opt('이웃의 끼니를 함께 살핀다','조금씩 나누어 돕는다','그해 어려움을 함께 견딘 이웃이 오랫동안 인사를 건넸다.',{bonds:4,grain:-3}),
   opt('집안의 남은 곡식을 아낀다','다음 철까지 곳간을 살핀다','곡식 한 됫박도 아껴 먹으며 계절을 넘겼다.',{health:-1,grain:2})
  ]),
 article('wda_12108026_002',1439,'1439-08-26','세종실록 86권','강무장의 범 포획과 백성의 부담',
  '강무장의 호랑이와 표범 포획에 백성과 말이 시달린 폐단을 논하였다. 병조는 매년 포획이 유익하지 않다고 아뢰었고 그 의견이 받아들여졌다.',
  '강무장에 범을 잡으러 불려가던 백성들의 고생이 조정에서 논의되었다는 말이 들려왔다.',
  null,[
   opt('산길을 아는 이에게 지난 일을 묻는다','백성이 겪은 고생을 듣는다','그때 들은 강무장과 사냥 이야기로 고을 사람들과 말을 나눴다.',{knowledge:3}),
   opt('동원되던 이웃의 일손을 돕는다','집안에서 비었던 일을 나누어 한다','먼 길을 다녀오던 이웃이 일손을 고맙게 여겼다.',{bonds:4,health:-1}),
   opt('겨울 먹을거리와 말 여물을 챙긴다','먼길의 부담을 돌아본다','혹독한 겨울을 대비해 볏짚과 곡식을 모았다.',{grain:-2,health:2})
  ]),
 article('kda_12812026_003',1446,'1446-12-26','세종실록 114권','이전 선발에 훈민정음을 시험하다',
  '이조가 이과와 이전을 선발할 때 훈민정음의 글자 결합을 익힌 사람도 뽑도록 명하였다.',
  '관아에서 일하는 사람을 뽑을 때 새로 만든 글자를 아는지도 본다는 이야기가 전해졌다.',
  null,[
   opt('관아의 글 배우는 이에게 묻는다','어떻게 글자를 모아 쓰는지 배운다','글자를 익히던 날을 떠올리며 간단한 말을 적어 보았다.',{knowledge:4}),
   opt('식구에게 들은 글자를 알려 준다','함께 익힐 수 있는 만큼 배운다','그날 배운 글자를 가족과 나누었다.',{knowledge:2,bonds:3}),
   opt('하던 일을 이어 간다','새 글자를 익힐 여유가 많지 않다','글에 관한 소식은 들었지만 당장 손에 익은 일을 해야 했다.',{wealth:1})
  ]),
 article('wra_11110015_001',1670,'1670-10-15','현종실록 18권','대기근과 신역 부담 감면',
  '전국적인 흉년 속에서 피해 정도별로 신역을 감하도록 명했다. 노비 신공도 피해 정도에 따라 감면 대상으로 논의되었다.',
  '곡식이 귀해지고 굶주린 사람이 늘었다. 재해가 심한 고을의 신역을 줄인다는 말이 전해졌다.',
  null,[
   opt('관아에 우리 집의 피해를 알린다','감면이 가능한지 살핀다','관아에서 고을의 피해를 따지던 날을 기억했다.',{knowledge:3,grain:2}),
   opt('아픈 이웃과 곡식을 나눈다','곳간이 더 빠듯해질 수 있다','흉년 때 나누었던 양식을 이웃이 오래 기억했다.',{bonds:5,grain:-5,health:-1}),
   opt('식구를 위해 곡식을 아낀다','당장의 끼니부터 지킨다','식구들은 곡식을 아껴 겨울을 견뎠다.',{health:-2,grain:3})
  ]),
 article('wrb_11211030_002',1671,'1671-11-30','현종개수실록 25권','구휼미 배분의 부정과 늑장',
  '송시열은 구휼 과정에서 일부 담당자가 주린 사람 수를 부풀려 곡식을 빼돌리거나 결정이 늦어졌다고 비판하였다.',
  '굶주린 이들에게 나눌 죽이 지나치게 묽다는 말이 돌았다. 구휼에 쓰여야 할 곡식이 제대로 전해지는지 걱정스럽다.',
  null,[
   opt('굶주린 이웃의 사정을 적어 알린다','곡식을 받을 사람의 형편을 밝힌다','구휼이 필요한 사람의 이름을 전하던 날을 기억했다.',{knowledge:3,bonds:3}),
   opt('이웃과 죽을 끓여 나눈다','집안에 남은 곡식도 내어놓는다','다 함께 한 숟가락씩 나눠 먹던 밤이 남았다.',{bonds:4,grain:-4,health:-1}),
   opt('관아의 배분을 기다린다','받을 수 있는지 확신하기 어렵다','곳간을 열어 볼 때마다 마음이 무거웠다.',{health:-2,grain:1})
  ]),
 article('kua_12605019_002',1750,'1750-05-19','영조실록 71권','군역 부담을 고칠 길을 논하다',
  '영조와 비국 당상들이 균역의 변통을 논하며 군포·호포·어염세 등 여러 방안을 검토하였다.',
  '군역에 쓰는 베의 부담을 어떻게 바꿀지 조정에서 논의한다는 이야기가 고을에 전해졌다.',
  null,[
   opt('우리 집의 군포 부담을 헤아린다','가족과 베를 마련할 일을 논한다','군포 때문에 집안의 살림을 따져 보았다.',{knowledge:2,capital:-2}),
   opt('이웃과 필요한 베를 나눠 마련한다','혼자 감당하지 못할 부담을 나눈다','베를 함께 마련했던 이웃과 품을 갚았다.',{bonds:3,capital:-2}),
   opt('관아에서 달라질 법을 기다린다','논의가 바로 시행되는 것은 아니다','고을에 새 방이 붙을 때마다 군역 이야기를 확인했다.',{knowledge:3})
  ]),
 article('wva_10207020_003',1778,'1778-07-20','정조실록 6권','수군 배치와 해안 방비에 대한 상소',
  '수군과 군포 부담자의 지역 배치가 실제 배 타는 능력과 맞지 않는 문제, 항만의 얕은 수심과 전선 운용의 어려움을 지적한 상소가 있었다.',
  '배를 몰던 사람과 군포를 내던 사람의 처지가 맞지 않는다는 논의가 조정에 올라갔다. 포구에는 여전히 일손이 필요하다.',
  ['경상도','전라도','충청도'],[
   opt('배를 다루는 이들의 사정을 듣는다','바닷길과 물때를 아는 사람에게 배운다','포구 사람들이 배와 군역 이야기를 함께 나누었다.',{knowledge:3,bonds:2}),
   opt('전선과 항만을 손보는 일을 돕는다','손에 익은 기술을 보탠다','포구에서 손봤던 장비가 오래 기억에 남았다.',{health:-2,capital:2}),
   opt('식구에게 군역의 부담을 설명한다','오랜 수고와 불편을 나눈다','그해 군역에 관한 이야기가 집안 밥상에 오르내렸다.',{bonds:3,knowledge:1})
  ])
]);
const byId=new Map(ARTICLES.map(a=>[a.id,a]));
function eligible(life,a){
 if(!J?.inOldEra(life)||!life.alive||life.year!==a.year||life.age<11)return false;
 const region=J.summary(life).region;
 return !a.regions||a.regions.includes(region);
}
function ensure(life){
 if(!J?.isJoseon(life))return null;
 return life.joseonAnnals||(life.joseonAnnals={version:1,processedYear:life.birthYear-1,
   seen:[],queue:[],active:null,decisions:[],followups:[],lastArticleId:null});
}
function promote(l,s){
 if(!s||s.active||l.pending||!l.alive||!J.inOldEra(l)||!s.queue.length)return;
 s.active=s.queue.shift();l.pending='joseonAnnals:'+s.active.id;
}
function prompt(l){
 const s=ensure(l),a=byId.get(s?.active?.articleId);
 return a?{title:a.title,description:a.scene,options:a.options.map(o=>({label:o.label,note:o.note,action:o.label}))}:null;
}
function yearly(l,s){
 if(!s||!J.inOldEra(l)||!l.alive||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 for(const f of s.followups.filter(f=>f.year<=l.year)){
  l.logEvent(f.text,'joseonAnnals-followup');l.log.at(-1).causeId='joseonAnnals:'+f.id;
 }
 s.followups=s.followups.filter(f=>f.year>l.year);
 for(const a of ARTICLES){
  if(!eligible(l,a)||s.seen.includes(a.id))continue;
  s.seen.push(a.id);s.lastArticleId=a.id;
  s.queue.push({id:l.year+'-'+a.id,articleId:a.id,year:l.year});
  l.logEvent(a.scene,'joseonAnnals-fact');
  l.log.at(-1).sourceUrl=a.url;
  l.log.at(-1).recordId=a.id;
 }
 promote(l,s);
}
function choose(l,index){
 const s=ensure(l),a=byId.get(s?.active?.articleId);
 if(!s?.active||!a||!l.alive||!Number.isInteger(index)||index<0||index>=a.options.length)return false;
 const o=a.options[index],eff=o.effects||{},j=J.ensure(l),store=V2.ensure(l),id=s.active.id;
 const stats={};
 for(const k of ['health','happiness','bonds','knowledge','wealth'])if(Number.isFinite(eff[k]))stats[k]=eff[k];
 l.change(stats);
 if(Number.isFinite(eff.grain))store.grain=clamp(store.grain+eff.grain,0,200);
 if(Number.isFinite(eff.capital))j.capital=clamp(j.capital+eff.capital,-120,600);
 l.logEvent(a.title+' — '+o.label,'joseonAnnals-choice');
 l.log.at(-1).causeId='joseonAnnals:'+id;
 l.log.at(-1).sourceUrl=a.url;
 s.decisions.push({id,articleId:a.id,choice:index,year:l.year});s.decisions=s.decisions.slice(-25);
 s.followups.push({id,year:l.year+2,text:o.result});
 s.followups=s.followups.slice(-30);
 s.lastArticleId=a.id;s.active=null;l.pending=null;promote(l,s);return true;
}
function sourceFor(l){
 const s=ensure(l);if(!s)return null;
 const a=byId.get(s.lastArticleId);
 return a?{year:a.year,title:a.title,sourceTitle:a.sourceTitle,url:a.url,fact:a.fact,articleId:a.id}:null;
}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseonAnnals;if(!s||!o||o.version!==1)return s;
 const safe=q=>q&&byId.has(q.articleId)&&typeof q.id==='string'&&Number.isInteger(q.year)&&q.year<=l.year&&q.year>=l.birthYear?
  {id:q.id.slice(0,75),articleId:q.articleId,year:q.year}:null;
 s.processedYear=clamp(Number(o.processedYear)||l.birthYear-1,l.birthYear-1,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(id=>byId.has(id)).slice(-ARTICLES.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.map(safe).filter(Boolean).slice(-ARTICLES.length):[];
 s.active=safe(o.active);
 if(!l.alive||!J.inOldEra(l)||data?.pending!=='joseonAnnals:'+s.active?.id)s.active=null;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(d=>d&&byId.has(d.articleId)&&typeof d.id==='string'&&Number.isInteger(d.year)&&d.year<=l.year).slice(-25)
  .map(d=>({id:d.id.slice(0,75),articleId:d.articleId,choice:clamp(Number(d.choice)||0,0,2),year:d.year})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(f=>f&&typeof f.id==='string'&&typeof f.text==='string'&&Number.isInteger(f.year)&&f.year>l.year&&f.year<=l.year+4)
  .slice(-30).map(f=>({id:f.id.slice(0,75),year:f.year,text:f.text.slice(0,240)})):[];
 s.lastArticleId=byId.has(o.lastArticleId)&&s.seen.includes(o.lastArticleId)?o.lastArticleId:null;
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||Sim.Life.prototype.__joseonAnnals)return false;
 const L=Sim.Life,prevTick=L.prototype.tick,prevChoose=L.prototype.choose,
 prevChoice=L.prototype.getChoice,prevReflect=L.prototype.reflect,prevSnap=L.prototype.snapshot,prevRestore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this))return prevTick.call(this);
  const y=this.year,ok=prevTick.call(this);
  if(ok&&this.alive&&this.year!==y)yearly(this,ensure(this));
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseonAnnals:'))return prompt(this);
  return prevChoice.call(this);
 };
 L.prototype.choose=function(i){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseonAnnals:'))return choose(this,i);
  const ok=prevChoose.call(this,i);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;
 };
 L.prototype.reflect=function(t){const ok=prevReflect.call(this,t);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const v=prevSnap.call(this);
  if(J.isJoseon(this))v.joseonAnnals=JSON.parse(JSON.stringify(ensure(this)));return v;};
 L.restore=function(d){const l=prevRestore.call(this,d);if(l&&J.isJoseon(l))hydrate(l,d);return l;};
 Object.defineProperty(L.prototype,'__joseonAnnals',{value:true});return true;
}
install();
return Object.freeze({ARTICLES,ensure,eligible,prompt,yearly,choose,sourceFor,hydrate,install});
});
