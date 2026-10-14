/* Colonial-era everyday-life pressure. Fictional households, historically dated policies.
 * Dated events never claim a specific fictional person was present at an actual battle.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeColonialDaily=api;
})(typeof window!=='undefined'?window:null,function(Sim){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=(seed,salt)=>{let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;};
const opt=(label,note,result,effect={})=>({label,note,result,effect});
const EVENTS=[
 {id:'police',start:1910,end:1919,age:13,title:'헌병경찰이 마을에 들다',
  desc:'헌병경찰이 장터와 길목을 단속한다. 사람들이 말을 낮춘다.',options:[
  opt('가족과 장터를 조심히 다닌다','다툼을 피한다','단속이 있던 길을 한동안 피해 다녔다.',{health:1}),
  opt('이웃과 소식을 나눈다','서로 무슨 일이 있는지 듣는다','그때 나누었던 이야기를 식구들이 기억했다.',{bonds:3,knowledge:2}),
  opt('마을 어른에게 사정을 묻는다','달라진 법과 통제를 알아본다','달라진 규칙을 알고도 마음은 편하지 않았다.',{knowledge:4})]},
 {id:'manse',start:1919,end:1919,age:14,title:'거리에서 들려온 만세 소리',
  desc:'독립을 외치는 목소리가 거리와 장터로 번져 간다.',options:[
  opt('가족과 함께 길가의 소식을 듣는다','몸을 조심하며 사람들의 뜻을 듣는다','만세 소리를 들었던 날이 오래 기억났다.',{knowledge:2,bonds:2}),
  opt('독립을 외치는 사람을 돕는다','검거될 위험이 있다','그때 함께했던 사람들의 안부가 늘 걱정되었다.',{health:-4,bonds:5}),
  opt('단속을 피해 식구를 챙긴다','누군가 다칠까 염려된다','그날 식구들은 집에 모여 무사함을 확인했다.',{bonds:4})]},
 {id:'independence',start:1920,end:1936,age:16,title:'국경 너머의 독립운동 소식',
  desc:'만주와 국경 지방에서 독립운동에 참여한 사람의 소문이 들려온다.',options:[
  opt('먼 곳에 간 친척의 안부를 묻는다','편지와 인편을 기다린다','먼 고을에서 친척의 안부가 전해졌다.',{bonds:4,knowledge:2}),
  opt('사람들이 읽는 글을 함께 본다','검열과 단속을 피해야 한다','당시 읽었던 글귀가 오래 마음에 남았다.',{knowledge:4}),
  opt('마을의 생업을 이어 간다','집안이 버틸 수 있도록 한다','바쁜 가운데에도 먼 곳의 소식은 계속 들어왔다.',{wealth:2})]},
 {id:'press',start:1920,end:1936,age:12,title:'신문에 실리지 못한 이야기',
  desc:'검열로 신문 기사가 지워졌다는 이야기가 장터를 돈다.',options:[
  opt('이웃이 전하는 이야기를 듣는다','서로 다른 소식을 확인한다','검열로 전하지 못한 일이 있었다는 말을 들었다.',{knowledge:3}),
  opt('배우던 글을 계속 익힌다','읽고 생각하는 시간을 지킨다','그때 익힌 글로 훗날 가족의 편지를 읽었다.',{knowledge:4}),
  opt('가족의 안부를 먼저 살핀다','위험한 이야기를 멀리한다','집안 사람들은 안전을 걱정하며 조용히 지냈다.',{bonds:3})]},
 {id:'shrine',start:1937,end:1945,age:10,title:'신사참배를 강요받다',
  desc:'학교와 마을에서 신사참배에 관한 통보가 내려온다.',options:[
  opt('어른과 어려운 마음을 이야기한다','가족끼리 선택의 부담을 나눈다','가족은 그 시절의 강요를 오래 기억했다.',{bonds:4,knowledge:2}),
  opt('학교에서 벌어지는 일을 살핀다','어떤 조치가 있는지 알아본다','학교에 다니는 이의 소식을 걱정하며 기다렸다.',{knowledge:3}),
  opt('식구의 안전을 먼저 생각한다','부당함 속에서도 가족을 챙긴다','어렵고 두려운 날들을 가족과 함께 버텼다.',{bonds:3,health:-1})]},
 {id:'name',start:1940,end:1945,age:14,title:'창씨개명 신고를 재촉하다',
  desc:'면사무소에서 성과 이름을 일본식으로 바꾸는 신고를 재촉한다.',options:[
  opt('가족과 오랫동안 의논한다','성씨와 집안의 기억을 함께 생각한다','이름을 두고 가족끼리 나눈 말이 오래 남았다.',{bonds:4,knowledge:2}),
  opt('신고를 미루며 상황을 살핀다','압박을 받을 수 있다','면사무소에서 이름을 물어보는 일이 이어졌다.',{health:-2,knowledge:2}),
  opt('안전을 위해 신고한다','제도가 강요한 선택이 남는다','서류에 적힌 이름과 집에서 부르는 이름이 달랐다.',{health:1,happiness:-2})]},
 {id:'requisition',start:1938,end:1945,age:13,title:'마을에 공출 명령이 내려오다',
  desc:'쌀과 물건을 내라는 명령에 곳간과 살림을 다시 헤아린다.',options:[
  opt('식구가 먹을 곡식을 먼저 챙긴다','살림이 더 빠듯해진다','한동안 식구들이 먹을 양식을 아껴야 했다.',{wealth:-4,bonds:3}),
  opt('이웃과 필요한 물건을 나눈다','서로 도울 만큼만 남아 있다','어려울 때 물건을 나누었던 이웃을 기억했다.',{wealth:-2,bonds:4}),
  opt('면사무소에 부담을 호소한다','받아들여지지 않을 수도 있다','부담을 줄여 달라는 말은 쉽게 통하지 않았다.',{health:-2,knowledge:2})]},
 {id:'mobilization',start:1939,end:1945,age:17,title:'먼 일터로 가라는 명령',
  desc:'전쟁을 위한 인력 동원이 확대된다. 집안의 젊은이가 먼 일터로 떠날 수 있다.',options:[
  opt('떠나는 가족에게 먹을 것을 챙긴다','돌아올 날을 기약하기 어렵다','멀리 떠난 사람을 기다리는 날이 길어졌다.',{wealth:-3,bonds:4}),
  opt('떠난 이에게 편지를 쓴다','소식이 닿기를 바란다','편지가 닿았다는 소식에 잠시 마음을 놓았다.',{knowledge:2,bonds:4}),
  opt('남은 가족의 살림을 맡는다','갑자기 빈 일손을 대신한다','한 사람이 떠난 집안의 일은 남은 식구가 나누었다.',{health:-3,bonds:3})]},
 {id:'clothes',start:1910,end:1945,age:10,title:'거리에서 바뀌는 차림',
  desc:'한복 차림 사이로 양복과 모자, 안경을 쓴 사람이 오간다.',options:[
  opt('안경을 쓴 이에게 글을 읽어 달라 한다','글을 읽는 일을 돕는다','처음 본 안경이 오래 기억에 남았다.',{knowledge:3}),
  opt('가족의 옷을 기워 입는다','새것을 살 여유가 없다','기워 입은 옷이 오랫동안 집안 살림을 지탱했다.',{wealth:2}),
  opt('거리의 새로운 차림을 구경한다','옷과 머리 모양의 변화를 본다','도성에서 본 옷차림을 가족에게 이야기했다.',{knowledge:2,happiness:2})]}
];
function isPeriod(l){return l.country?.[0]==='대한민국'&&l.year>=1910&&l.year<=1945}
function ensure(l){if(!l||l.country?.[0]!=='대한민국')return null;
 return l.colonialDaily||(l.colonialDaily={version:1,processedYear:l.birthYear,seen:[],active:null,queue:[],decisions:[],followups:[]});
}
function eligible(l,e){return isPeriod(l)&&l.alive&&l.age>=e.age&&l.year>=e.start&&l.year<=e.end}
function promote(l,s){if(s&&!s.active&&!l.pending&&l.alive&&s.queue.length){
 s.active=s.queue.shift();l.pending='colonialDaily:'+s.active.id;
}}
function yearly(l,s){
 if(!s||!isPeriod(l)||!l.alive||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 for(const f of s.followups.filter(f=>f.year<=l.year)){
  l.logEvent(f.text,'colonialDaily-followup');l.log.at(-1).causeId='colonialDaily:'+f.id;
 }
 s.followups=s.followups.filter(f=>f.year>l.year);
 const pool=EVENTS.filter(e=>!s.seen.includes(e.id)&&eligible(l,e));
 // At most one colonial pressure choice approximately every four years.
 if(l.age%4===1&&pool.length&&s.queue.length<2){
  pool.sort((a,b)=>hash(l.seed,l.year+a.id.length*73)-hash(l.seed,l.year+b.id.length*73));
  const e=pool[0];s.seen.push(e.id);s.queue.push({id:l.year+'-'+e.id,eventId:e.id,year:l.year});
 }
 promote(l,s);
}
function prompt(l){const s=ensure(l),e=EVENTS.find(e=>e.id===s?.active?.eventId);return e?{
 title:e.title,description:e.desc,options:e.options.map(o=>({label:o.label,note:o.note,action:o.label}))}:null}
function choose(l,index){const s=ensure(l),e=EVENTS.find(e=>e.id===s?.active?.eventId);
 if(!l.alive||!e||!Number.isInteger(index)||index<0||index>2)return false;
 const o=e.options[index],id=s.active.id;
 l.change(o.effect);l.logEvent(e.title+' — '+o.label,'colonialDaily-choice');l.log.at(-1).causeId='colonialDaily:'+id;
 s.decisions.push({id,eventId:e.id,year:l.year,option:index});
 s.followups.push({id,year:l.year+2,text:o.result});
 s.active=null;l.pending=null;promote(l,s);return true;
}
function hydrate(l,data){const s=ensure(l),o=data?.colonialDaily;if(!s||!o||o.version!==1)return s;
 const clean=q=>q&&typeof q.id==='string'&&EVENTS.some(e=>e.id===q.eventId)&&Number.isInteger(q.year)&&q.year<=l.year?
 {id:q.id.slice(0,75),eventId:q.eventId,year:q.year}:null;
 s.processedYear=clamp(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(id=>EVENTS.some(e=>e.id===id)).slice(-EVENTS.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.map(clean).filter(Boolean).slice(-2):[];
 s.active=clean(o.active);
 if(!l.alive||!isPeriod(l)||data?.pending!=='colonialDaily:'+s.active?.id)s.active=null;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(x=>x&&typeof x.id==='string'&&Number.isInteger(x.year)).slice(-40):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'&&Number.isInteger(x.year)&&x.year>l.year).slice(-25):[];
 return s;
}
function install(){if(!Sim?.Life||Sim.Life.prototype.__colonialDaily)return false;
 const L=Sim.Life,pt=L.prototype.tick,pg=L.prototype.getChoice,pc=L.prototype.choose,pr=L.prototype.reflect,ps=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){const y=this.year,ok=pt.call(this);
  if(ok&&this.alive&&this.year!==y&&isPeriod(this))yearly(this,ensure(this));return ok;};
 L.prototype.getChoice=function(){if(typeof this.pending==='string'&&this.pending.startsWith('colonialDaily:'))return prompt(this);return pg.call(this);};
 L.prototype.choose=function(i){if(typeof this.pending==='string'&&this.pending.startsWith('colonialDaily:'))return choose(this,i);
 const ok=pc.call(this,i);if(ok&&isPeriod(this))promote(this,ensure(this));return ok;};
 L.prototype.reflect=function(t){const ok=pr.call(this,t);if(ok&&isPeriod(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const s=ps.call(this);if(this.colonialDaily)s.colonialDaily=JSON.parse(JSON.stringify(this.colonialDaily));return s;};
 L.restore=function(data){const l=restore.call(this,data);if(l&&data?.colonialDaily)hydrate(l,data);return l;};
 Object.defineProperty(L.prototype,'__colonialDaily',{value:true});return true;
}
install();
return Object.freeze({EVENTS,ensure,eligible,prompt,choose,yearly,install});
});
