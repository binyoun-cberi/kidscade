/* Colonial collaboration is a fictional personal path anchored to dated institutions.
 * Opportunity, coercion, culpability and post-liberation accountability are separate.
 * Game probabilities and money are not historical measurements. */
(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.OneLifeCollaboration341=api;})(typeof window!=='undefined'?window:null,function(root){
'use strict';
const Sim=root?.OneLifeSim,Travel=root?.OneLifeTravel22;
const SOURCE={collaboration:'https://contents.history.go.kr/mobile/nh/view.do?levelId=nh_048_0020_0010_0030_0010',labor:'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_40&levelId=kc_i400700',law:'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_o500500'};
const PATH={clerk:{name:'식민지 관청의 장부 일',start:1910,end:1944},police:{name:'경찰서의 정보·단속 일',start:1919,end:1944},supplier:{name:'전시 물자 납품',start:1938,end:1944}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const chance=(l,k)=>{let h=l.seed>>>0;for(const c of k)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h/4294967296;};
const own=Object.hasOwn;
function ensure(l){if(!l||l.country?.[0]!=='대한민국')return null;return l.collaboration341||(l.collaboration341={version:1,processedYear:l.year-1,seen:[],active:null,role:null,acts:[],history:[],liberation:false,inquiry:'none',inquiryYear:null,inquiryFollowed:false,restitution:0,lastOffer:l.birthYear-5});}
function free(l){return l.alive&&l.country?.[0]==='대한민국'&&l.age>=18&&l.age<=75&&!Travel?.ensure(l).residence.abroad&&l.joseon14?.captivity?.status!=='held'&&l.joseon325?.law?.kind!=='prison'&&l.diaspora340?.org?.status!=='detained';}
function literacy(l){return (l.world?.educationYears||0)>=4||(l.joseon?.literacy||0)>0||(l.historyLife338?.hangul||0)>0||(l.joseonWomen326?.letters||0)>=2;}
function independent(l){return l.diaspora340?.org?.status==='active';}
function eligible(l,key){if(!own(PATH,key)||!free(l)||independent(l))return false;const s=ensure(l),p=PATH[key];if(s.role?.status==='active'||l.year<p.start||l.year>p.end||s.seen.includes(key))return false;
 if(key==='clerk')return literacy(l);
 if(key==='supplier')return l.age>=23&&(/장사|상인|운반|공방|가게|제조/.test(String(l.career||'')+' '+String(l.world6?.profession||'')+' '+String(l.joseon?.occupation||''))||['trade','trades','manufacturing'].includes(l.world6?.sector));
 return l.age>=20;
}
function source(type){return type==='reckoning'||type==='inquiry'?SOURCE.law:type==='supplier'?SOURCE.labor:SOURCE.collaboration;}
function log(l,text,kind='life',type){const s=ensure(l),id='joseon341:'+l.year+'-'+(type||s.role?.key||'life');l.logEvent(text,'joseon341-'+kind);l.log.at(-1).causeId=id;s.history.push({year:l.year,text,source:source(type||s.role?.key)});s.history=s.history.slice(-48);}
function open(l,type,key){const s=ensure(l);if(!free(l)||l.pending||s.active||!own(PATH,key))return false;
 if(type==='offer'&&!eligible(l,key))return false;
 if(type==='practice'&&(s.role?.key!==key||s.role.status!=='active'||l.year>1944))return false;
 if(type==='reckoning'&&(s.role?.key!==key||s.liberation||l.year<1945))return false;
 if(type==='inquiry'&&(s.role?.key!==key||!s.liberation||s.acts.length<2||s.inquiry!=='none'||l.year<1948||l.year>1949))return false;
 if(!['offer','practice','reckoning','inquiry'].includes(type))return false;
 s.active={type,key,year:l.year};l.pending='joseon341:'+type+'-'+l.year;return true;}
const option=(label,note,action)=>({label,note,action});
function prompt(l){const q=ensure(l)?.active;if(!q)return null;const r=ensure(l).role;
 if(q.type==='offer')return {title:PATH[q.key].name+' 제안',description:({clerk:'관청에서 글과 셈을 아는 사람을 찾는다. 집안 살림에는 도움이 될지 모르지만, 적는 장부가 이웃의 땅과 세금에 영향을 미칠 수 있다.',police:'경찰서에서 마을 사정을 전할 사람을 찾는다. 거절하기 어려운 압박도 있지만, 누군가의 이름을 넘기는 일은 그 사람에게 닥칠 일을 바꾼다.',supplier:'전쟁에 쓸 물건을 납품하자는 제안이 왔다. 일감은 늘 수 있지만, 재료를 어디서 마련하고 누가 부족한 몫을 떠안을지 살펴야 한다.'})[q.key],source:source(q.key),options:[option('일을 맡되 무슨 일을 시키는지 지켜본다','들어간 뒤에도 어떤 일을 할지는 스스로 살펴야 한다.','accept'),option('다른 일감을 찾으며 거절한다','지금의 생계가 더 빠듯해질 수 있다.','decline')]};
 if(q.type==='practice')return {title:r.key==='clerk'?'이웃의 이름이 적힌 장부':r.key==='police'?'경찰서에서 물어 온 이름':'전쟁 물자를 마련할 차례',description:r.key==='clerk'?'신고된 땅과 낸 세금이 맞지 않는다는 이웃의 호소가 들린다. 상관은 적힌 대로 처리하라고 한다.':r.key==='police'?'경찰서에서 모임에 드나든 사람을 알려 달라고 한다. 이름을 넘기면 그 사람의 생활이 달라질 수 있다.':'모자란 물자를 채우려는 담당자가 마을의 쌀과 쇠붙이를 더 거두라고 한다. 납품 대금을 늘릴 기회이기도 하다.',source:source(r.key),options:[option(r.key==='clerk'?'잘못 적힌 장부를 바로잡으려 한다':r.key==='police'?'이름을 넘기지 않고 답을 피한다':'집집마다 남길 몫을 확인하고 납품량을 줄인다','압박은 남고, 지금 얻을 수 있는 이익도 줄어든다.','protect'),option(r.key==='clerk'?'잘못된 장부에 그대로 도장을 받는다':r.key==='police'?'들은 이름과 모임 장소를 전한다':'부족한 몫을 마을에 떠넘겨 납품한다','이웃이 겪을 피해와 자신의 이익을 함께 남긴다.','harm'),option('이 일을 그만두고 다른 생계를 찾는다','전에 한 일까지 지워지는 것은 아니다.','quit')]};
 if(q.type==='reckoning')return {title:'해방 뒤 돌아본 지난 일',description:'해방 소식이 전해졌다. 관청과 경찰서, 전시 납품에서 맡았던 일도 사람들의 기억과 장부에 남아 있다. 그때 누구에게 무슨 일이 있었는지 서로의 이야기는 다를 수 있다.',source:SOURCE.law,options:[option('한 일을 밝히고 피해를 입은 사람을 찾아간다','있는 돈과 기록을 살펴 사과와 돌려줄 몫을 준비한다.','admit'),option('기록을 숨기고 새 일자리를 찾는다','당장은 넘길 수 있어도 함께 겪은 사람의 기억은 지울 수 없다.','conceal'),option('당시의 압박과 내가 한 일을 따로 적는다','강요받은 일과 스스로 선택한 일을 구분해 설명한다.','explain')]};
 if(q.type==='inquiry')return {title:'반민족행위 조사를 받게 되다',description:'지난 행적을 조사하는 사람들이 장부와 증언을 묻는다. 아직 결론이 난 것은 아니다. 당시 피해를 입은 사람의 기록도 확인해야 한다.',source:SOURCE.law,options:[option('남은 장부를 내고 내가 한 일을 진술한다','피해를 입은 사람의 기록과 대조한다.','testify'),option('내게 불리한 기록을 감추려 한다','기록을 숨겨도 다른 사람의 증언은 남을 수 있다.','deny')]};
 return null;
}
function family(l){const people=l.joseon4?.people?.length?l.joseon4.people:l.world9?.people||[];return people.find(p=>p.alive&&['mother','father','spouse','child','sibling','어머니','아버지','배우자','자녀','형제자매'].includes(p.role)&&l.year-p.birthYear>=16&&l.year-p.birthYear<=95);}
function choose(l,i){const s=ensure(l),q=s?.active,p=prompt(l);if(!free(l)||!q||l.pending!=='joseon341:'+q.type+'-'+q.year||!p||!Number.isInteger(i)||i<0||i>=p.options.length)return false;const action=p.options[i].action,r=s.role;if(action==='accept'&&!eligible(l,q.key))return false;s.active=null;l.pending=null;
 if(action==='accept'){s.seen.push(q.key);s.role={key:q.key,started:l.year,status:'active',service:0,harm:0,protect:0};log(l,PATH[q.key].name+'을 맡았다. 처음 받아 든 일의 범위와 책임을 살피기 시작했다.','choice',q.key);}
 else if(action==='decline'){s.seen.push(q.key);l.change({wealth:-1});log(l,'제안을 거절하고 다른 일감을 찾아봤다. 당장의 살림에는 여유가 줄었다.','choice',q.key);}
 else if(action==='protect'){r.service++;r.protect++;l.change({wealth:-1,bonds:1});log(l,({clerk:'이웃이 가져온 문권과 장부를 다시 대조해 잘못된 곳을 고치려 했다. 상관에게서 꾸지람을 들었다.',police:'요구받은 이름을 넘기지 않았다. 경찰서의 재촉이 이어져 일을 계속하기 어려워졌다.',supplier:'집집마다 먹고 쓸 몫을 남기도록 납품량을 줄였다. 받을 돈도 그만큼 줄었다.'})[r.key],'choice');if(r.key==='police')r.status='ceased';}
 else if(action==='harm'){r.service++;r.harm++;s.acts.push({year:l.year,key:r.key,kind:'harm'});s.acts=s.acts.slice(-24);l.change({wealth:2,bonds:-3});if(l.money)l.money.netWorth=clamp((l.money.netWorth||0)+100,-2e7,2e7);log(l,({clerk:'장부의 잘못을 알면서도 그대로 처리했다. 이웃은 땅과 세금 문제를 다시 따져야 했다.',police:'경찰서에 모임과 사람들의 이름을 전했다. 그 뒤 마을에는 붙잡힌 사람의 소식을 묻는 이들이 생겼다.',supplier:'마을의 몫까지 거두어 납품했다. 받은 돈은 늘었지만 이웃의 끼니와 생업에 부족함이 남았다.'})[r.key],'choice');}
 else if(action==='quit'){r.status='ceased';l.change({wealth:-1});log(l,'하던 일을 그만두었다. 이미 적은 장부와 넘긴 말, 받은 돈의 흔적은 남았다.','choice');}
 else if(['admit','conceal','explain'].includes(action)){s.liberation=true;if(r)r.status='ended';const f=family(l);if(action==='admit'){const amount=Math.min(200,Math.max(0,l.money?.netWorth||0));if(l.money)l.money.netWorth-=amount;s.restitution=amount;log(l,amount?'남은 장부를 펼쳐 자신이 한 일을 말하고 감당할 수 있는 돈을 피해를 입은 집에 돌려주었다. 그것으로 잃은 삶이 되돌아오지는 않았다.':'남은 장부를 펼쳐 자신이 한 일을 말하고 피해를 입은 사람을 찾아갔다. 돌려줄 돈을 마련할 형편은 되지 않았다.','choice','reckoning');}
 else if(action==='conceal')log(l,'전에 맡았던 일을 감추고 새 일터를 찾아갔다. 당시의 장부와 함께 지낸 사람들의 기억은 남아 있었다.','choice','reckoning');
 else log(l,'강요받아 맡은 일과 스스로 이익을 얻으려 했던 일을 나누어 적었다. 피해를 입은 사람의 이야기도 함께 확인해야 했다.','choice','reckoning');
 if(f&&r?.harm){f.relation=clamp((f.relation||50)-(action==='admit'?2:5),0,100);log(l,f.name+'와 지난 일을 두고 이야기했지만, 서로의 기억과 마음을 바로 맞출 수는 없었다.','followup','reckoning');}}
 else if(action==='testify'){s.inquiry='testified';s.inquiryYear=l.year;log(l,'조사 자리에서 장부와 자신이 한 일을 대조해 진술했다. 누구에게 어떤 피해가 있었는지 더 살피는 일이 남았다.','choice','inquiry');}
 else if(action==='deny'){s.inquiry='denied';s.inquiryYear=l.year;log(l,'조사에서 자신에게 불리한 대목을 숨겼다. 그러나 다른 사람의 장부와 증언까지 없앨 수는 없었다.','choice','inquiry');}
 return true;
}
function year(l,retry=false){const s=ensure(l);if(!s||!l.alive||(s.processedYear>=l.year&&!retry))return;s.processedYear=l.year;if(!free(l)||l.pending||s.active)return;
 if(s.inquiryYear&&!s.inquiryFollowed&&l.year>s.inquiryYear){s.inquiryFollowed=true;if(s.inquiry==='denied'){l.change({bonds:-2});log(l,'숨긴 대목이 다른 장부와 증언에 비추어 드러났다. 가까운 사람들의 신뢰는 더욱 멀어졌다. 조사의 법적 결론은 따로 남았다.','followup','inquiry');}else{l.change({knowledge:1});log(l,'제출한 장부가 다른 사람의 증언과 함께 조사 기록에 남았다. 진술한 뒤에도 피해를 입은 사람과의 관계는 쉽게 돌아오지 않았다.','followup','inquiry');}l.log.at(-1).causeId='joseon341:'+s.inquiryYear+'-inquiry';}
 if(l.year>=1945&&!s.liberation&&s.role){if(open(l,'reckoning',s.role.key))return;}
 if((l.year===1948||l.year===1949)&&s.liberation&&s.inquiry==='none'&&s.acts.length>=2&&chance(l,'inquiry'+l.year)<.55){if(open(l,'inquiry',s.role.key))return;}
 if(s.role?.status==='active'){
  if(l.year>1944){if(!s.liberation)open(l,'reckoning',s.role.key);return;}
  if(s.role.started<l.year&&chance(l,'practice'+l.year)<.65)open(l,'practice',s.role.key);return;
 }
 if(l.year<1910||l.year>1944||l.year-s.lastOffer<5)return;
 const key=Object.keys(PATH).find(k=>eligible(l,k)&&chance(l,'offer'+k+l.year)<.16);
 if(key){s.lastOffer=l.year;open(l,'offer',key);}
}
function hydrate(l,d){const s=ensure(l),o=d?.collaboration341;if(!s)return;if(!o||o.version!==1){s.processedYear=l.year;if(String(l.pending).startsWith('joseon341:'))l.pending=null;return;}
 s.processedYear=clamp(Number(o.processedYear)||l.year,l.birthYear,l.year);s.lastOffer=clamp(Number(o.lastOffer)||l.birthYear-5,l.birthYear-5,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(x=>own(PATH,x)).slice(-3):[];
 s.role=o.role&&own(PATH,o.role.key)&&Number.isInteger(o.role.started)&&o.role.started>=l.birthYear&&o.role.started>=PATH[o.role.key].start&&o.role.started<=PATH[o.role.key].end&&o.role.started<=l.year&&['active','ceased','ended'].includes(o.role.status)?{key:o.role.key,started:o.role.started,status:o.role.status,service:clamp(Number(o.role.service)||0,0,50),harm:clamp(Number(o.role.harm)||0,0,50),protect:clamp(Number(o.role.protect)||0,0,50)}:null;
 s.acts=Array.isArray(o.acts)?o.acts.filter(a=>a&&own(PATH,a.key)&&a.kind==='harm'&&Number.isInteger(a.year)&&a.year>=1910&&a.year<=Math.min(l.year,1944)).slice(-24).map(a=>({year:a.year,key:a.key,kind:'harm'})):[];
 s.history=Array.isArray(o.history)?o.history.filter(h=>h&&Number.isInteger(h.year)&&h.year>=l.birthYear&&h.year<=l.year&&typeof h.text==='string').slice(-48).map(h=>({year:h.year,text:h.text.slice(0,160),source:Object.values(SOURCE).includes(h.source)?h.source:SOURCE.collaboration})):[];
 s.liberation=o.liberation===true&&l.year>=1945;s.inquiry=['none','testified','denied'].includes(o.inquiry)?o.inquiry:'none';s.inquiryYear=Number.isInteger(o.inquiryYear)&&o.inquiryYear>=1948&&o.inquiryYear<=1949&&o.inquiryYear<=l.year&&s.inquiry!=='none'?o.inquiryYear:null;s.inquiryFollowed=o.inquiryFollowed===true&&!!s.inquiryYear;s.restitution=clamp(Number(o.restitution)||0,0,200);
 const q=o.active,valid=q&&['offer','practice','reckoning','inquiry'].includes(q.type)&&q.year===l.year&&own(PATH,q.key)&&d.pending==='joseon341:'+q.type+'-'+q.year&&free(l)&&(
  q.type==='offer'?eligible(l,q.key):q.type==='practice'?s.role?.key===q.key&&s.role.status==='active'&&l.year<=1944:q.type==='reckoning'?s.role?.key===q.key&&!s.liberation&&l.year>=1945:s.role?.key===q.key&&s.liberation&&s.inquiry==='none'&&s.acts.length>=2&&l.year>=1948&&l.year<=1949);
 s.active=valid?{type:q.type,key:q.key,year:q.year}:null;if(s.active)l.pending=d.pending;else if(String(l.pending).startsWith('joseon341:'))l.pending=null;
}
function matchEntry(l,e){if(!String(e?.kind).startsWith('joseon341-'))return null;const h=ensure(l)?.history.find(h=>h.year===e.year&&h.text===e.text);return h?{title:'협력의 선택과 그 뒤의 삶',source:h.source,year:h.year}:null;}
function install(){const L=Sim?.Life;if(!L||L.prototype.__collaboration341)return false;const tick=L.prototype.tick,get=L.prototype.getChoice,oldChoose=L.prototype.choose,snap=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){if(this.alive&&!this.pending){year(this);if(this.pending)return true;}const before=this.year,r=tick.call(this);if(r&&this.alive&&this.year!==before)year(this);return r;};
 L.prototype.getChoice=function(){return String(this.pending).startsWith('joseon341:')?prompt(this):get.call(this);};
 L.prototype.choose=function(i){if(String(this.pending).startsWith('joseon341:'))return choose(this,i);const r=oldChoose.call(this,i);if(r&&this.alive&&!this.pending)year(this,true);return r;};
 L.prototype.snapshot=function(){const d=snap.call(this);if(this.country?.[0]==='대한민국')d.collaboration341=JSON.parse(JSON.stringify(ensure(this)));return d;};
 L.restore=function(d){const l=restore.call(this,d);if(l?.country?.[0]==='대한민국')hydrate(l,d);return l;};Object.defineProperty(L.prototype,'__collaboration341',{value:true});return true;}
install();return Object.freeze({SOURCE,PATH,ensure,eligible,open,prompt,choose,year,hydrate,matchEntry,install});
});
