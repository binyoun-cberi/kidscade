/* Fictional long-lived projects. Historical people are references, never scripts
 * assigning their achievements or politics to the player. Existing modules own
 * occupations, legal status, family members and national historical shocks. */
(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.OneLifePaths339=api;})(typeof window!=='undefined'?window:null,function(root){
'use strict';
const J=root?.OneLifeJoseon,Soc=root?.OneLifeJoseon5,W6=root?.OneLifeWorld6;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const keys=['craft','trade','writing','training','workgroup'];
const names={craft:'함께 맡는 공방의 일',trade:'거래처와 나누어 맡는 장사',writing:'오래 적어 온 글을 엮는 일',training:'일을 마친 뒤 다시 배우기',workgroup:'동료들과 일터의 사정을 묻다'};
const old=l=>l.year<1900&&J?.isJoseon(l);
const region=l=>old(l)?J.ensure(l).region:(l.profile?.city||'지금 사는 곳');
const occupation=l=>old(l)?J.ensure(l).occupation+' '+Soc.ensure(l).role:(l.world6?.profession||l.career||'');
const artisan=l=>/대장|장인|도공|목수|옻칠|칠장|나전|공예/.test(occupation(l));
const trader=l=>/상인|장사|행상|보부상|가게 운영/.test(occupation(l));
const unbound=l=>!old(l)||l.year>=1894||Soc.ensure(l).freed||!['공노비','사노비'].includes(Soc.ensure(l).origin);
const awake=l=>!!l?.alive&&l.country?.[0]==='대한민국'&&l.age>=16&&l.year<=2026&&!l.travel22?.residence?.abroad&&l.joseon14?.captivity?.status!=='held';
const free=l=>!l.joseon325||l.joseon325.law.kind==='free';
const stable=l=>awake(l)&&free(l)&&unbound(l);
function ensure(l){if(!l||l.country?.[0]!=='대한민국')return null;
 return l.paths339||(l.paths339={version:1,processedYear:l.year-1,seen:[],projects:[],active:null,contacts:[],works:[],transitions:[]});}
function canRead(l){return old(l)?J.ensure(l).literacy>0||(l.year>=1446&&((l.historyLife338?.hangul||0)>0||(l.joseonWomen326?.letters||0)>=2)):(l.world?.educationYears||0)>=4;}
function candidates(l){
 if(!awake(l)||l.age>75)return [];
 const s=ensure(l),out=[],career=l.joseon6?.career,branch=l.joseon325?.career;
 if(stable(l)&&old(l)&&artisan(l)&&((career&&l.year-career.started>=4&&career.practice>=8)||(branch&&l.year-branch.started>=4)))out.push('craft');
 const tradeYears=career?.code==='merchant'&&l.year-career.started>=3;
 if(stable(l)&&old(l)&&trader(l)&&(tradeYears||(l.joseonWomen326?.trade||0)>=3||(l.historyLife338?.routes||[]).some(r=>r.kind!=='map'&&r.year<l.year)))out.push('trade');
 const recordCount=l.log.filter(e=>/choice|work|memory|profession/.test(e.kind||'')&&e.age<l.age).length;
 if(unbound(l)&&l.joseon325?.law?.kind!=='prison'&&l.age>=35&&canRead(l)&&l.stats.knowledge>=50&&recordCount>=4)out.push('writing');
 if(stable(l)&&l.year>=1900&&l.age>=22&&l.age<=60&&l.world6?.history?.some(h=>l.age-h.age>=4))out.push('training');
 if(stable(l)&&l.year>=1910&&l.age>=20&&l.age<=65&&l.world6?.sector==='trades'&&l.world6.history.some(h=>h.sector==='trades'&&l.age-h.age>=2))out.push('workgroup');
 return out.filter(k=>!s.seen.includes(k));
}
function log(l,p,text,kind='life'){l.logEvent(text,'joseon339-'+kind);l.log.at(-1).causeId='joseon339:'+p.id;}
function money(l){return old(l)?J.ensure(l).capital:(l.money?.netWorth||0);}
function cost(l,n){if(money(l)<n)return false;if(old(l)){J.ensure(l).capital-=n;if(l.money)l.money.netWorth=J.ensure(l).capital*100;}else if(l.money)l.money.netWorth-=n;return true;}
const expense=l=>old(l)?2:100;
function compatible(l,p){
 if(!awake(l))return false;
 if(p.key==='writing')return unbound(l)&&l.joseon325?.law?.kind!=='prison';
 if(!stable(l)||p.region!==region(l))return false;
 if(p.key==='craft')return old(l)&&artisan(l);
 if(p.key==='trade')return old(l)&&trader(l);
 if(p.key==='workgroup')return l.world6?.sector==='trades'&&occupation(l)===p.job;
 return true;
}
function contact(l,p){
 const s=ensure(l);let person=s.contacts.find(c=>c.id===p.contactId);
 if(!person){const index=keys.indexOf(p.key),name=(old(l)?(l.gender==='여자'?['연이','분이','옥이','순이','덕이']:['덕수','만복','길수','성길','복동']):(l.gender==='여자'?['정희','영숙','순자','미경','정숙']:['영호','정수','성호','민수','준호']))[index];person={id:'paths339-'+p.key+'-'+l.year,name,met:l.year,birthYear:l.year-30,present:true};s.contacts.push(person);p.contactId=person.id;
 log(l,p,(p.key==='writing'?'글을 함께 살펴보러 온 ':p.key==='training'?'함께 배우러 온 ':'일을 의논하러 만난 ')+name+'와 인사를 나누고 서로 할 수 있는 일을 이야기했다.');}
 return person;
}
function available(l,p){return compatible(l,p)&&p.status==='open'&&l.year>=p.due;}
function prompt(l){const s=ensure(l),p=s?.projects.find(p=>p.id===s.active);if(!p||!available(l,p))return null;
 const person=s.contacts.find(c=>c.id===p.contactId),who=person?.name||'함께할 사람';
 let description,labels,actions;
 if(p.stage===0){
  description={craft:'여러 해 익힌 손기술로 주문을 맡아 왔다. 다른 일꾼과 공구와 납품 일을 나누자는 이야기가 나왔다. 재료를 살 돈과 맡을 일의 범위를 먼저 정해야 한다.',trade:'전에 맡은 거래를 바탕으로 물품과 운반 일을 나누어 맡자는 제안을 받았다. 큰돈을 한꺼번에 넣기보다 작은 물량부터 값을 맞춰 보려 한다.',writing:'틈틈이 적어 둔 일을 펼쳐 보니 겹치거나 빠진 대목이 많다. 직접 겪고 익힌 내용을 골라 한 권의 글로 엮어 보려 한다.',training:'하던 일을 하며 쌓은 경험은 있지만 새로 배워야 할 기술도 있다. 낮의 생업을 이어 가면서 저녁에 공구와 재료를 다루는 법을 배울 곳을 찾았다.',workgroup:'같은 일터에서 일하는 사람들과 품삯과 쉬는 시간을 이야기했다. 각자 겪은 일을 적어 서로의 사정이 얼마나 다른지 알아보려 한다.'}[p.key];
  labels=['시간과 비용을 들여 함께 시작한다','당장은 하던 일을 이어 간다'];actions=['start','decline'];
 }else if(p.stage===1){
  description={craft:who+'와 함께 맡을 주문의 수량과 재료값을 적었다. 작은 주문을 실제로 만들어 보고, 마감과 나누어 받을 품삯을 맞춰 볼 차례다.',trade:who+'와 거래 장부를 맞춰 보았다. 물건을 받을 곳과 운반비를 확인하고, 약속한 물량부터 보내려 한다.',writing:who+'가 적어 둔 글의 빠진 대목을 물었다. 기억이 분명한 일과 남에게 전해 들은 말을 구분해 원고를 고치려 한다.',training:who+'와 저녁마다 공구를 다루고 작은 물건을 손보는 연습을 했다. 배운 일을 실제로 해 보고 잘못된 부분을 다시 고칠 시간이 필요하다.',workgroup:who+'와 동료들이 적어 온 근무 시간과 품삯을 대조했다. 서로 동의한 내용을 정리해 일터의 책임자에게 함께 전할지 의논한다.'}[p.key];
  labels=[p.key==='workgroup'?'동료의 동의를 구해 개선을 요청한다':'작은 일부터 해 보고 고칠 곳을 살핀다','더 진행하지 않고 지금까지의 기록을 보관한다'];actions=['continue','archive'];
 }else{
  description={craft:who+'와 작은 주문을 마쳤다. 함께 쓴 공구와 재료값을 정리하고, 다음에 맡을 수량과 일을 나눌 방법을 다시 정하려 한다.',trade:who+'와 물건을 넘기고 받을 값과 운반비를 정산했다. 남은 장부를 다음 거래에서도 쓸 수 있게 정리하려 한다.',writing:'고친 원고를 한 차례 끝까지 읽었다. 글을 베껴 읽겠다는 사람이 있어 종이와 시간을 들여 한 부를 더 만들지 생각한다.',training:'작은 수리와 재료 다루기를 여러 번 연습했다. 배웠다는 사실만으로 일자리가 생기지는 않는다. 전에 하던 일과 새로 배운 기술을 살려 다른 일감을 알아볼 수 있다.',workgroup:'전에 전한 근무 시간과 품삯 내역에 대해 일터의 책임자에게 답을 들을 날이 되었다. 동료들과 함께 약속한 내용이 실제로 지켜지는지 확인하려 한다.'}[p.key];
  labels=[p.key==='training'?'배운 기술로 수공업·수리 일감을 구한다':p.key==='writing'?'원고를 한 부 베껴 읽을 사람에게 건넨다':'장부와 약속을 확인하고 다음 일을 정한다','더 넓히지 않고 지금까지의 일을 정리한다'];actions=['finish','archive'];
 }
 const paid=money(l)>=expense(l);
 return {title:names[p.key],description,options:labels.map((label,i)=>({label:i===0&&!paid&&p.key!=='workgroup'?'비용이 부족해 준비한 내용을 보관한다':label,note:i===0&&p.key!=='workgroup'?'돈과 품이 든다. 결과는 다음 해에 다시 확인한다.':'당장 생업과 처지를 살핀다.',action:i===0&&!paid&&p.key!=='workgroup'?'archive':actions[i]}))};
}
function close(l,p,text){p.status='archived';p.completed=l.year;const s=ensure(l);if(s.active===p.id)s.active=null;if(l.pending==='joseon339:'+p.id)l.pending=null;log(l,p,text,'followup');}
function choose(l,i){
 const s=ensure(l),p=s?.projects.find(p=>p.id===s.active),q=prompt(l);if(!q||!Number.isInteger(i)||i<0||i>=q.options.length)return false;
 const action=q.options[i].action;
 if(['archive','decline'].includes(action)){close(l,p,action==='decline'?'새로 의논하던 일은 시작하지 않고 하던 생업을 이어 갔다.':'진행하던 일은 여기까지 정리하고, 적어 둔 내용과 남은 재료를 보관했다.');}
 else {
  if(p.key!=='workgroup'&&!cost(l,expense(l)))return false;
  l.change({health:-1,knowledge:1});
  if(action==='start'){const c=contact(l,p);p.job=occupation(l);p.region=region(l);p.stage=1;p.due=l.year+2;log(l,p,c.name+'와 시간을 맞춰 '+({craft:'재료와 공구를 살피고 맡을 주문을 적었다.',trade:'물량과 운반 비용을 적고 각자 맡을 일을 나누었다.',writing:'오래 적어 둔 내용을 펼쳐 직접 겪은 일부터 골랐다.',training:'공구를 다루는 기초부터 배우기 시작했다.',workgroup:'근무 시간과 품삯 내역을 서로 확인하기 시작했다.'})[p.key],'choice');}
  else if(action==='continue'){p.stage=2;p.due=l.year+1;log(l,p,({craft:'작은 주문을 함께 만들며 재료가 모자란 곳과 잘못 만든 부분을 고쳤다.',trade:'약속한 물량을 마련하고 받을 값과 운반비를 장부에 적었다.',writing:'기억이 다른 대목을 다시 묻고 전해 들은 말에는 따로 표시했다.',training:'배운 공구로 작은 물건을 손보고 잘못된 부분을 다시 연습했다.',workgroup:'함께 뜻을 모은 동료들의 근무 내역을 정리해 책임자에게 개선을 요청했다.'})[p.key],'choice');}
  else {
   p.status='completed';p.completed=l.year;
   let text;
   if(p.key==='training'){
    if(l.year>=1950&&l.year<=1953){p.status='archived';text='배운 기술을 적어 두었지만 전쟁 중에는 새 일자리를 구하지 못했다. 당장의 생계를 이어 갈 방법을 찾았다.';}
    else if((l.seed+p.started)%5>=2&&W6?.career(l,'trades',0,'배운 기술로 일감을 구해'))text='배운 기술을 써 볼 일감을 구했다. 새 일터에서도 익숙하지 않은 작업부터 다시 배워야 했다.';
    else {p.status='archived';text='배운 기술을 정리했지만 새 일감은 구하지 못했다. 하던 생업을 이어 갔다.';}
   }else if(['craft','trade'].includes(p.key)&&((l.joseon13?.fields||0)>0||l.year<=(l.joseon2?.scarcityUntil||0))){
    p.status='archived';text='전란과 먹을거리 부족으로 약속한 일감을 마치지 못했다. 들인 비용은 돌아오지 않았고, 진행한 내용만 장부에 남겼다.';
   }else if(p.key==='writing'){
    const title=old(l)?'살림과 생업을 적은 책':'살아온 날의 기록';s.works.push({id:p.id,title,year:l.year,copies:2,topic:p.topic});
    text='원고를 한 권으로 엮고 한 부를 더 베껴 읽을 사람에게 건넸다. '+title+'이라는 글을 읽은 사람이 빠진 대목을 물어 왔다.';
   }else if(p.key==='workgroup'){
    const agreed=((l.seed+p.started)%5)>1;p.agreed=agreed;
    text=agreed?'책임자가 쉬는 차례를 정해 보겠다고 답했다. 동료들과 번갈아 쉬는 시간을 확인했지만 품삯과 다른 요구까지 해결된 것은 아니었다.':'책임자에게 요구를 다시 전했지만 근무 조건은 바뀌지 않았다. 동료들과 적어 둔 내역을 보관하고 생계를 이어 갈 길을 의논했다.';
   }else text=p.key==='craft'?'함께 쓰는 공구와 주문 장부를 정리했다. 공방에서 맡을 일을 나누어 이어 가기로 했다. 재료를 구할 때와 납품할 때도 서로 맡을 몫을 적어 두었다.':'물건 값과 비용을 맞춰 공동 거래 장부를 남겼다. 다음 거래도 각자 감당할 물량부터 나누어 맡기로 했다.';
   if(p.status==='completed'){
    const career=l.joseon6?.career;
    if(p.key==='craft'&&career){career.practice=clamp((career.practice||0)+2,0,100);career.reputation=clamp((career.reputation||0)+3,0,100);}
    if(p.key==='trade'&&career?.code==='merchant'&&career.resources)career.resources.clients=clamp((career.resources.clients||0)+1,0,100);
    if(p.key==='writing')l.change({knowledge:2});
    if(p.key==='workgroup'&&p.agreed)l.change({health:2});
   }
   log(l,p,text,'followup');
  }
 }
 s.active=null;l.pending=null;promote(l);return true;
}
function promote(l){
 const s=ensure(l);if(!s||l.pending||!l.alive)return;
 if(s.active){const p=s.projects.find(p=>p.id===s.active);if(p&&available(l,p)){l.pending='joseon339:'+p.id;return;}s.active=null;}
 const p=s.projects.find(p=>available(l,p));if(p){s.active=p.id;l.pending='joseon339:'+p.id;}
}
function year(l){
 const s=ensure(l);if(!s||!l.alive||s.processedYear>=l.year)return;s.processedYear=l.year;
 for(const p of s.projects.filter(p=>p.status==='open')){
  if(!compatible(l,p)){
   const c=s.contacts.find(c=>c.id===p.contactId);if(c)c.present=false;
   const reason=l.joseon14?.captivity?.status==='held'?'포로가 되어 함께 맡은 일을 이어 갈 수 없었다.':l.travel22?.residence?.abroad?'국외에 머물게 되어 고향에서 함께 맡은 일을 멈췄다.':l.joseon325?.law?.kind==='prison'?'옥에 갇혀 진행하던 일을 이어 가지 못했다.':p.region!==region(l)?'고을을 옮겨 함께 맡은 일을 계속하지 못했다.':'생업과 처지가 바뀌어 전에 맡은 일을 그만두었다.';
   close(l,p,reason+' 그동안 적어 둔 내용은 보관했다.');
  }
 }
 if([1894,1910,1945,1950,1953,1987,1997].includes(l.year)&&l.age>0&&s.projects.some(p=>p.stage>0)&&!s.transitions.includes(l.year)){
  s.transitions.push(l.year);const p=s.projects.find(p=>p.stage>0);log(l,p,'시대가 달라지는 동안에도 전에 익힌 일과 적어 둔 장부는 남아 있었다. 새 살림에 그대로 쓸 수 있을지는 다시 살펴야 했다.');
 }
 if(awake(l)&&s.projects.filter(p=>p.status==='open').length<2){const key=candidates(l)[0];if(key){s.seen.push(key);s.projects.push({id:key+'-'+l.year,key,started:l.year,stage:0,due:l.year,status:'open',region:region(l),job:occupation(l),contactId:null,topic:occupation(l)});}}
 promote(l);
}
function hydrate(l,d){
 const s=ensure(l),o=d?.paths339;if(!s)return;
 if(!o||o.version!==1){s.processedYear=l.year;if(String(l.pending).startsWith('joseon339:'))l.pending=null;return;}
 const clean=x=>String(x||'').slice(0,160),id=x=>typeof x==='string'&&/^(craft|trade|writing|training|workgroup)-\d{4}$/.test(x);
 s.processedYear=clamp(Number(o.processedYear)||l.year,l.birthYear,l.year);
 s.seen=Array.isArray(o.seen)?[...new Set(o.seen.filter(k=>keys.includes(k)))]:[];
 s.projects=Array.isArray(o.projects)?o.projects.filter(p=>p&&keys.includes(p.key)&&id(p.id)&&p.id===p.key+'-'+p.started&&Number.isInteger(p.started)&&p.started>=l.birthYear&&p.started<=l.year&&Number.isInteger(p.due)&&p.due>=p.started&&p.due<=l.year+2&&[0,1,2].includes(p.stage)&&['open','completed','archived'].includes(p.status)).slice(0,5).map(p=>({...p,region:clean(p.region),job:clean(p.job),topic:clean(p.topic)})):[];
 s.contacts=Array.isArray(o.contacts)?o.contacts.filter(c=>c&&typeof c.id==='string'&&Number.isInteger(c.met)&&c.met>=l.birthYear&&c.met<=l.year&&Number.isInteger(c.birthYear)&&c.birthYear===c.met-30).slice(0,5).map(c=>({...c,name:clean(c.name),present:c.present===true})):[];
 s.works=Array.isArray(o.works)?o.works.filter(w=>w&&s.projects.some(p=>p.id===w.id&&p.key==='writing'&&p.status==='completed')).slice(0,1).map(w=>({...w,title:clean(w.title),topic:clean(w.topic)})):[];
 s.transitions=Array.isArray(o.transitions)?o.transitions.filter(y=>Number.isInteger(y)&&y>=l.birthYear&&y<=l.year).slice(0,7):[];
 s.active=id(o.active)&&s.projects.some(p=>p.id===o.active&&available(l,p))&&d.pending==='joseon339:'+o.active?o.active:null;
 if(s.active)l.pending='joseon339:'+s.active;else if(String(l.pending).startsWith('joseon339:'))l.pending=null;
}
function install(){const L=root?.OneLifeSim?.Life;if(!L||L.prototype.__paths339)return false;
 const tick=L.prototype.tick,get=L.prototype.getChoice,chooseOld=L.prototype.choose,reflect=L.prototype.reflect,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){if(this.alive&&!this.pending){year(this);if(this.pending)return true;}const y=this.year,r=tick.call(this);if(r&&this.year!==y&&this.alive)year(this);return r;};
 L.prototype.getChoice=function(){return String(this.pending).startsWith('joseon339:')?prompt(this):get.call(this);};
 L.prototype.choose=function(i){if(String(this.pending).startsWith('joseon339:'))return choose(this,i);const r=chooseOld.call(this,i);if(r)promote(this);return r;};
 L.prototype.reflect=function(t){const r=reflect.call(this,t);if(r)promote(this);return r;};
 L.prototype.snapshot=function(){const d=snapshot.call(this);if(this.country?.[0]==='대한민국')d.paths339=JSON.parse(JSON.stringify(ensure(this)));return d;};
 L.restore=function(d){const l=restore.call(this,d);if(l?.country?.[0]==='대한민국')hydrate(l,d);return l;};
 Object.defineProperty(L.prototype,'__paths339',{value:true});return true;
}
install();return Object.freeze({ensure,candidates,compatible,prompt,choose,promote,year,hydrate,install});
});
