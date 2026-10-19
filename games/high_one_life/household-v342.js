/* Household decisions share the existing named relatives and Joseon purse.
 * Work units/prices are gameplay abstractions, not historical statistics. */
(function(root){
'use strict';
const J=root.OneLifeJoseon,F=root.OneLifeJoseon4;
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const particle=(name,a,b)=>{const text=String(name),code=text.charCodeAt(text.length-1);return text+(code>=44032&&code<=55203&&(code-44032)%28?a:b);};
const subject=n=>particle(n,'이','가'),topic=n=>particle(n,'은','는'),object=n=>particle(n,'을','를');
const roles={self:'나',mother:'어머니',father:'아버지',spouse:'배우자',child:'자녀',sibling:'형제자매'};
const tasks={rest:'쉬기',care:'집안일과 돌봄',study:'글과 셈 배우기',wage:'품팔이',farm:'농사 돕기',craft:'물건 만들기'};
const recipes={straw:{name:'짚 바구니',cost:1,value:3,skill:0,years:1},hemp:{name:'삼베옷',cost:3,value:5,skill:1,years:1},ramie:{name:'모시옷',cost:5,value:8,skill:2,years:1},cotton:{name:'무명옷',cost:4,value:7,skill:1,years:1},silk:{name:'비단옷',cost:10,value:15,skill:3,years:2},quilt:{name:'솜이불',cost:6,value:10,skill:2,years:2}};
function enabled(l){return !!l&&l.country?.[0]==='대한민국'&&J.isJoseon(l)&&l.year<1900;}
function ensure(l){if(!enabled(l)&&!l?.household342)return null;return l.household342||(l.household342={version:1,processedYear:l.year,plans:{},skills:{},fatigue:{},stock:[],history:[],letters:[],used:[],pocket:0,trust:60,kin:0,faith:0,strict:0,crop:null,trip:null,crisis:null,contracts:[],manager:null,homeRegion:J.ensure(l).region});}
function log(l,text){const s=ensure(l);s.history.push({year:l.year,text});s.history=s.history.slice(-40);l.logEvent(text,'household342');}
function raw(l){return F.ensure(l).people;}
function self(l){return {id:'self',role:'self',name:l.profile.name,sex:l.gender,birthYear:l.birthYear,alive:l.alive,atHome:!away(l),wellbeing:l.stats.health,relation:100};}
function lost(l,p){return (l.joseon13?.missing||[]).some(m=>m.personId===p.id&&m.status==='missing');}
function members(l){if(!enabled(l)&&!l.household342)return [];return [self(l),...raw(l)].filter(p=>p.alive&&p.birthYear<=l.year&&!lost(l,p));}
function age(l,p){return l.year-p.birthYear;}
function here(l,p){return p.id==='self'?!away(l):p.atHome!==false;}
function away(l){return !!(l.household342?.trip&&l.year<l.household342.trip.until)||!!l.travel22?.residence?.abroad||['prison','exile'].includes(l.joseon325?.law?.kind)||l.joseon14?.captivity?.status==='held';}
function bound(l){return l.year<1894&&!l.joseon5?.freed&&['공노비','사노비'].includes(l.joseon5?.origin);}
function canManage(l){return enabled(l)&&l.alive&&l.age>=18&&!away(l)&&!bound(l);}
function manager(l){const s=ensure(l);if(!s)return null;if(canManage(l))return 'self';const adults=members(l).filter(p=>p.id!=='self'&&here(l,p)&&age(l,p)>=18);return adults.find(p=>p.id===s.manager)?.id||adults.find(p=>p.role==='spouse')?.id||adults[0]?.id||null;}
function money(l,n){const j=J.ensure(l);if(n<0&&j.capital < -n)return false;j.capital+=n;if(l.money)l.money.netWorth=j.capital*100;return true;}
function available(l){return enabled(l)&&l.alive&&!l.pending;}
function workOptions(l,p){const a=age(l,p);if(!here(l,p)||a<6)return ['rest'];if(a<12)return ['rest','care','study'];return Object.keys(tasks).filter(t=>t!=='farm'||J.ensure(l).land>0);}
function book(l,p){return ensure(l).skills[p.id]||(ensure(l).skills[p.id]={craft:0,study:0,trade:0});}
function permittedRecipe(l,k){return !!recipes[k]&&(!['cotton','quilt'].includes(k)||l.year>=1400);}
function use(l,k){const s=ensure(l),key=l.year+':'+k;if(s.used.includes(key))return false;s.used.push(key);s.used=s.used.slice(-80);return true;}
function assign(l,id,task,recipe='straw',force=false){
 if(!available(l))return false;const s=ensure(l),p=members(l).find(p=>p.id===id);
 if(!p||(!canManage(l)&&id!=='self')||!workOptions(l,p).includes(task)||away(l))return false;
 if(id!=='self'&&s.contracts.some(c=>c.id===id&&c.status==='bound'))return false;
 const old=s.plans[id];if(old?.year===l.year||(old?.task==='craft'&&old.remaining>0))return false;
 if(task==='craft'&&l.age<18)return false;
 const materialDiscount=task==='craft'&&['cotton','quilt'].includes(recipe)&&s.stock.some(x=>x.raw)?2:0;
 if(task==='craft'&&(!permittedRecipe(l,recipe)||book(l,p).craft<recipes[recipe].skill||J.ensure(l).capital<recipes[recipe].cost-materialDiscount))return false;
 const tired=(s.fatigue[id]||0)>55||(p.wellbeing||70)<40;
 const reluctant=id!=='self'&&(tired||p.relation<35||((l.seed+l.year+id.length)%5===0&&task==='wage'));
 if(reluctant&&!force){log(l,particle(p.name,'과','와')+' 할 일을 의논했다. 이번에는 쉬고 싶다고 하여 일을 미뤘다.');s.plans[id]={task:'rest',recipe:null,year:l.year,remaining:1,force:false};return true;}
 if(force&&id!=='self'){p.relation=clamp(p.relation-10);log(l,p.name+'의 뜻을 묻지 않고 일을 재촉했다. 그 뒤로 서로 나누는 말이 줄었다.');}
 if(task==='craft'){const cotton=['cotton','quilt'].includes(recipe)?s.stock.find(x=>x.raw):null;if(cotton){s.stock.splice(s.stock.indexOf(cotton),1);money(l,-Math.max(0,recipes[recipe].cost-2));}else money(l,-recipes[recipe].cost);}
 s.plans[id]={task,recipe:task==='craft'?recipe:null,year:l.year,remaining:task==='craft'?recipes[recipe].years:1,force:!!force};
 const activity={rest:'쉬며 몸을 추스르기로 했다.',care:'집안일을 하고 식구들을 돌보기로 했다.',study:'글과 셈을 배울 시간을 내기로 했다.',wage:'품팔이를 나가기로 했다.',farm:'농사를 거들기로 했다.',craft:object(recipes[recipe]?.name)+' 만들 재료를 마련했다.'};
 log(l,(id==='self'?'나는':topic(p.name))+' '+activity[task]);
 return true;
}
function settle(l){
 const s=ensure(l);if(!s||!l.alive||s.processedYear>=l.year)return;s.processedYear=l.year;
 if(s.trip&&l.year>=s.trip.until){s.trip=null;log(l,'먼 고을에서 일을 마치고 돌아왔다. 식구들의 안부를 묻고 그동안 쓴 돈과 남은 곡식을 살폈다.');}
 for(const c of s.contracts.filter(c=>c.status==='bound')){const p=c.id==='self'?self(l):raw(l).find(p=>p.id===c.id);if(!p?.alive){c.status='ended';continue;}if(l.year>=1894||(c.id==='self'&&l.joseon5?.freed)){c.status='freed';if(c.id!=='self'){p.legal='양인';log(l,topic(p.name)+' 더는 법으로 노비에 묶이지 않았다. 다만 어디서 어떻게 지내는지 알아야 집으로 데려올 수 있었다.');}}else if(c.id!=='self'){p.atHome=false;p.legal='천인';delete s.plans[c.id];if((l.year-c.year)%3===0)log(l,subject(p.name)+' 여전히 그 집에서 일한다는 소식이 왔다. 데려오려면 주인과 속량을 의논해야 했다.');}}
 const present=members(l),atHome=present.filter(p=>here(l,p));
 const care=atHome.some(p=>s.plans[p.id]?.task==='care');
 const working=Object.values(s.plans).some(p=>['farm','wage','craft'].includes(p.task));
 const dependents=atHome.some(p=>age(l,p)<6||p.wellbeing<40);
 for(const [id,plan] of Object.entries(s.plans)){
  const p=present.find(p=>p.id===id);
  if(!p||!here(l,p)||l.year>=1900){delete s.plans[id];log(l,'전에 나눈 일을 더는 함께할 수 없어 중단했다.');continue;}
  if(plan.year>=l.year)continue;
  if(plan.task==='craft'&&plan.remaining<=0)continue;
  const skill=book(l,p),tired=s.fatigue[id]||0;
  if(plan.task==='rest'){s.fatigue[id]=clamp(tired-25);if(id!=='self')p.wellbeing=clamp(p.wellbeing+3);}
  else if(plan.task==='care'){s.fatigue[id]=clamp(tired+4);for(const q of atHome)if(q.id!=='self'){q.wellbeing=clamp(q.wellbeing+2);q.relation=clamp(q.relation+1);}}
  else if(plan.task==='study'){
   if(id==='self'&&l.age<18?s.pocket>=1&&(--s.pocket,true):money(l,-1)){skill.study++;if(id==='self')l.stats.knowledge=clamp(l.stats.knowledge+2);else p.learning=clamp((p.learning||0)+1,0,20);log(l,topic(p.name)+' 틈틈이 글과 셈을 익혔다. 처음에는 낯설던 글자도 조금씩 눈에 들어왔다.');}
   else log(l,'배울 비용이 모자라 이번 해에는 새로 배우지 못했다.');
   s.fatigue[id]=clamp(tired-8);
  }else{
   const strain=plan.force?22:12;s.fatigue[id]=clamp(tired+strain);
   const failed=tired>65||p.wellbeing<30||(l.joseon2?.scarcityUntil>=l.year&&l.rand()<.5);
   if(failed){log(l,topic(p.name)+(tired>65||p.wellbeing<30?' 몸이 지쳐 맡은 일을 마치지 못했다.':' 흉년의 여파로 맡은 일을 마치지 못했다.'));if(id!=='self')p.wellbeing=clamp(p.wellbeing-3);}
   else if(plan.task==='wage'){const earned=1+(skill.trade>=3?1:0);if(id==='self'&&l.age<18)s.pocket+=earned;else money(l,earned);skill.trade++;log(l,subject(p.name)+' 품삯을 받아 '+(id==='self'&&l.age<18?'푼돈을 따로 모았다.':'집안 살림에 보탰다.'));}
   else if(plan.task==='farm'){if(l.joseon2)l.joseon2.grain=clamp((l.joseon2.grain||0)+3,0,500);log(l,subject(p.name)+' 밭일을 거들어 먹을 곡식을 조금 더 남겼다.');}
   else if(plan.task==='craft'){
    plan.remaining--;skill.craft++;
    if(plan.remaining===0){s.stock=s.stock.slice(-59);s.stock.push({id:id+'-'+plan.year,recipe:plan.recipe,maker:id,quality:Math.min(3,1+Math.floor(skill.craft/3)),year:l.year,raw:false});log(l,subject(p.name)+' '+object(recipes[plan.recipe].name)+' 다 만들었다.');}
    else log(l,subject(p.name)+' '+object(recipes[plan.recipe].name)+' 만들고 있다. 이번 해에는 다 끝내지 못했다.');
   }
  }
  // Annual assignments expire. Unfinished paid craft keeps its remaining work.
  if(plan.task!=='craft'||plan.remaining<=0)delete s.plans[id];
 }
 if(dependents&&!care&&working){for(const p of atHome)if(p.id!=='self')p.wellbeing=clamp(p.wellbeing-2);log(l,'식구들이 일을 하느라 어린아이와 아픈 사람을 챙길 손이 모자랐다.');}
 for(const letter of s.letters.filter(x=>x.status==='travelling'&&x.due<=l.year)){
  if(l.joseon14?.captivity?.status==='held'||l.rand()<.18){letter.status='lost';log(l,'부친 편지가 전해지지 않았다. 집에서는 편지를 받지 못한 채 살림을 꾸려야 했다.');}
  else{letter.status='delivered';const p=atHome.find(p=>p.id===letter.manager&&age(l,p)>=18);if(p){p.relation=clamp(p.relation+2);s.plans[p.id]={task:letter.task,recipe:null,year:l.year,remaining:1,force:false};log(l,p.name+'에게 편지가 닿았다. '+({care:'식구들을 돌보는 데 손을 보태기로 했다.',study:'글과 셈을 배울 시간을 내기로 했다.',wage:'품팔이로 살림을 보태기로 했다.'})[letter.task]);}else log(l,'편지는 집에 닿았지만 살림을 맡았던 사람에게 전하지 못했다.');}
 }
 if(away(l)&&manager(l)&&!Object.keys(s.plans).length){const id=manager(l);s.plans[id]={task:dependents?'care':'wage',recipe:null,year:l.year,remaining:1,force:false};log(l,'집에 남은 식구가 살림을 맡아 그때그때 필요한 일을 했다.');}
 if(s.crop&&s.crop.due<=l.year){const c=s.crop;s.crop=null;const interrupted=away(l)||J.ensure(l).region!==c.region||J.ensure(l).land<=0;
  if(interrupted||l.joseon2?.scarcityUntil>=l.year||l.rand()<.25)log(l,'따로 심어 둔 '+object(c.name)+' 제대로 거두지 못했다. 들인 돈을 건지지 못하고 먹을 곡식도 줄었다.');
  else if(c.name==='목화'){s.stock.push({id:'cotton-'+c.started,recipe:'cotton',maker:'self',quality:1,year:l.year,raw:true});log(l,'거둔 목화를 손질해 솜을 마련했다. 옷이나 이불을 만들 때 쓰려고 보관했다.');}
  else{money(l,8);log(l,'여러 해 가꾼 인삼을 거두어 팔았다. 받은 돈을 살림에 보탰다.');}}
}
function inCrisis(l){return canManage(l)&&l.year>=1650&&l.year<1894&&J.ensure(l).birthStatus==='상민'&&J.ensure(l).capital<=0&&((l.joseon2?.grain||0)<5||l.joseon2?.scarcityUntil>=l.year);}
function crisisPrompt(l){const s=ensure(l);if(!s?.crisis)return null;const p=members(l).find(p=>p.id===s.crisis.target);if(!p)return null;return {title:'살길이 막힌 집안',description:(p.id==='self'?'내 몸을':object(p.name))+' 다른 집에 팔라는 이야기를 들었다. 돈을 받으면 당장 먹을 것을 구할 수 있지만, 노비가 되면 사는 곳과 하는 일을 마음대로 정하기 어려워진다. 다시 함께 살 수 있을지도 알 수 없다.',options:[{label:'몸을 파는 문서를 쓴다',note:'노비가 되어 가족과 떨어져 살게 됩니다.'},{label:'거절하고 친척에게 도움을 청한다',note:'도움을 얻지 못할 수도 있습니다.'},{label:'문서를 쓰지 않는다',note:'다른 살길을 찾아야 합니다.'}]};}
function crisisChoose(l,i){const s=ensure(l);if(!Number.isInteger(i)||i<0||i>2||!s?.crisis)return false;const id=s.crisis.target,p=members(l).find(p=>p.id===id);if(!p||!inCrisis(l))return false;
 if(i===0){const contract={id,year:l.year,status:'bound',origin:l.joseon5?.origin||'상민',name:p.name};s.contracts.push(contract);money(l,6);delete s.plans[id];
  if(id==='self'){const soc=root.OneLifeJoseon5.ensure(l);soc.origin='사노비';soc.originLabel='생계 때문에 노비가 된 사람';soc.freed=false;soc.role='주인집의 노동';J.ensure(l).status='노비';J.ensure(l).occupation='주인집의 노동';J.ensure(l).office=false;}
  else{p.legal='천인';p.atHome=false;p.work='다른 집의 노비 노동';p.relation=clamp(p.relation-30);}
  for(const q of raw(l).filter(p=>p.alive))q.relation=clamp(q.relation-5);log(l,(id==='self'?'나는':topic(p.name)+'')+' 몸을 파는 문서를 쓰고 다른 집의 노비가 되었다. 받은 돈으로 당장은 버텼지만 식구들은 떨어져 살게 되었다.');
 }else if(i===1){if(l.rand()<.4){money(l,2);log(l,'친척에게 사정을 전해 당장 먹을 것을 조금 얻었다. 그것으로 오래 버틸 수는 없었다.');}else log(l,'친척도 형편이 어려워 더 내어 줄 것이 없었다. 문서는 쓰지 않고 돌아왔다.');}
 else log(l,'몸을 파는 문서는 쓰지 않았다. 식구들과 다른 살길을 찾아보기로 했다.');
 s.crisis=null;l.pending=null;return true;}
function action(l,key,arg){
 if(!available(l))return false;const s=ensure(l);if(!s)return false;
 const child=l.age>=6&&l.age<18;
 if(key==='crisis'){if(!inCrisis(l)||!use(l,'crisis'))return false;const p=members(l).find(p=>p.id===arg&&(p.id==='self'||p.role==='child')&&here(l,p));if(!p)return false;s.crisis={target:p.id};l.pending='household342:crisis';return true;}
 if(key==='redeem'){const c=s.contracts.find(c=>c.id===arg&&c.status==='bound');if(!c||!raw(l).some(p=>p.id===c.id&&p.alive)||!canManage(l)||J.ensure(l).capital<12||!use(l,'redeem'))return false;money(l,-12);if(l.rand()<.25){log(l,'속량을 의논했지만 상대가 약속을 지키지 않아 문서를 받지 못했다. 돈을 쓰고도 가족을 데려오지 못했다.');return true;}const p=raw(l).find(p=>p.id===c.id&&p.alive);if(!p)return false;c.status='freed';p.legal='양인';p.atHome=true;p.work='돌아와 살림을 다시 꾸리는 중';log(l,p.name+'의 속량 문서를 받고 관에도 확인을 청했다. 다시 함께 살게 되어 그동안 어떻게 지냈는지 물었다.');return true;}
 if(key==='pause'){const plan=s.plans[arg];if(!canManage(l)||!plan||plan.task!=='craft'||plan.remaining<=0)return false;const p=members(l).find(p=>p.id===arg);if(!p)return false;s.plans[arg]={task:'rest',recipe:null,year:l.year,remaining:1,force:false};log(l,topic(p.name)+' 만들던 일을 멈추고 쉬기로 했다. 이미 쓴 재료값은 되돌려 받지 못했다.');return true;}
 if(key==='dispatch'){if(!canManage(l)||!(J.ensure(l).office||/군관|군인|수군/.test(J.ensure(l).occupation))||!manager(l))return false;s.trip={started:l.year,until:l.year+2};log(l,'맡은 일을 하러 먼 고을로 떠났다. 집에 남는 식구들과 살림을 의논하고 편지를 보내기로 했다.');return true;}
 if(key==='manager'){if(!canManage(l))return false;const p=members(l).find(p=>p.id===arg&&p.id!=='self'&&here(l,p)&&age(l,p)>=18);if(!p)return false;s.manager=p.id;log(l,particle(p.name,'과','와')+' 집을 비울 동안의 살림을 의논했다. 돈과 곡식을 살피고 식구들과 일을 나누어 맡아 달라고 했다.');return true;}
 if(child&&away(l))return false;
 if(child&&['errand','gather','sweet','trinket','save','steal'].includes(key)){
  const prices={sweet:1,trinket:2};if(prices[key]&&s.pocket<prices[key])return false;
  if(key==='steal'&&J.ensure(l).capital<1)return false;
  if(!use(l,'child'))return false;
  if(key==='errand'){s.pocket++;s.trust=clamp(s.trust+1);log(l,'이웃의 심부름을 하고 받은 푼돈을 따로 모았다.');}
  if(key==='gather'){if(l.rand()<.2){l.stats.health=clamp(l.stats.health-3);log(l,'먹을 것을 찾다 비탈에서 미끄러졌다. 빈손으로 돌아와 상처를 씻었다.');}else{s.pocket++;log(l,'들에서 먹을 것을 조금 모아 이웃에게 팔았다. 늦기 전에 집으로 돌아왔다.');}}
  if(key==='sweet'){s.pocket--;l.stats.happiness=clamp(l.stats.happiness+3);log(l,'모은 푼돈으로 엿을 사서 조금씩 떼어 먹었다.');}
  if(key==='trinket'){s.pocket-=2;l.stats.happiness=clamp(l.stats.happiness+2);log(l,'마음에 두었던 작은 물건을 샀다. 집으로 돌아오는 길에도 손에서 놓지 않았다.');}
  if(key==='save')log(l,'갖고 싶은 것이 있었지만 돈을 쓰지 않고 남겨 두었다.');
  if(key==='steal'){money(l,-1);s.pocket++;s.trust=clamp(s.trust-15);for(const p of raw(l).filter(p=>p.alive&&['mother','father'].includes(p.role)))p.relation=clamp(p.relation-5);log(l,'집안 물건을 몰래 팔았다. 손에 돈은 생겼지만 물건이 없어진 것을 알고 식구들이 찾기 시작했다.');}
  return true;
 }
 if(key==='letter'){
  const id=manager(l);if(!away(l)||!id||l.age<18||l.joseon14?.captivity?.status==='held'||l.joseon325?.law?.kind==='prison'||!['care','study','wage'].includes(arg)||J.ensure(l).capital<1)return false;
  if(!use(l,'letter'))return false;money(l,-1);s.letters.push({sent:l.year,due:l.year+1,task:arg,manager:id,status:'travelling'});s.letters=s.letters.slice(-12);log(l,'살림을 의논하려고 집에 편지를 부쳤다. 소식이 오갈 때까지는 시간이 걸릴 것이다.');return true;
 }
 if(!canManage(l))return false;
 if(key==='sell'||key==='keep'){
  const item=s.stock.find(x=>x.id===arg&&!x.raw);if(!item||s.stock.length===0||s.used.includes(l.year+':market'))return false;
  use(l,'market');s.stock.splice(s.stock.indexOf(item),1);
  if(key==='sell'){const bad=l.joseon2?.scarcityUntil>=l.year||l.rand()<.2;const value=bad?1:recipes[item.recipe].value+item.quality-1;money(l,value);log(l,object(recipes[item.recipe].name)+(bad?' 장에 내놓았지만 찾는 사람이 드물어 제값을 받지 못했다.':' 장에 내다 팔고 받은 돈을 살림에 보탰다.'));}
  else{for(const p of members(l))if(p.id!=='self'&&here(l,p))p.wellbeing=clamp(p.wellbeing+2);log(l,object(recipes[item.recipe].name)+' 팔지 않고 식구들이 쓰기로 했다.');}return true;
 }
 if(key==='practice'){const p=members(l).find(p=>p.id===arg);if(!p||!here(l,p)||age(l,p)<12||s.plans[p.id]?.year===l.year||J.ensure(l).capital<1)return false;money(l,-1);book(l,p).craft++;s.plans[p.id]={task:'study',recipe:null,year:l.year,remaining:1,force:false};log(l,particle(p.name,'과','와')+' 남는 재료로 손기술을 연습했다. 팔 물건을 만들지는 못했지만 손에 조금씩 익었다.');return true;}
 if(key==='crop'){
  if(s.crop||J.ensure(l).land<1||J.ensure(l).capital<3||!['cotton','ginseng'].includes(arg)||arg==='ginseng'&&l.year<1700)return false;
  if(!use(l,'crop'))return false;money(l,-3);s.crop={name:arg==='cotton'?'목화':'인삼',started:l.year,due:l.year+(arg==='cotton'?1:4),region:J.ensure(l).region};if(l.joseon2)l.joseon2.grain=Math.max(0,(l.joseon2.grain||0)-3);log(l,'곡식밭 일부에 '+object(s.crop.name)+' 심었다. 먹을 곡식은 조금 줄었다. 수확할 때까지 밭을 돌봐야 한다.');return true;
 }
 if(!['donate','ritual','kin','strict'].includes(key)||J.ensure(l).capital<(key==='strict'?0:2)||!use(l,'social'))return false;
 if(key!=='strict')money(l,-2);
 if(key==='donate'){s.faith++;l.stats.happiness=clamp(l.stats.happiness+1);log(l,'절에 얼마간 시주했다. 돌아와 식구들에게 얼마를 썼는지 이야기했다.');}
 if(key==='ritual'){s.kin++;log(l,'식구들과 집안 의례를 준비했다. 음식을 마련하고 치우는 일까지 나누어 맡았다.');}
 if(key==='kin'){s.kin++;const benefit=s.kin>=3&&l.rand()<.45;if(benefit)money(l,3);log(l,'명절에 친척들을 만나 안부를 묻고 요즘 하는 일을 이야기했다. '+(benefit?' 친척 한 사람이 작은 일감을 소개했다.':'이번에는 특별한 일감 없이 서로의 소식만 듣고 돌아왔다.'));}
 if(key==='strict'){s.strict++;for(const p of raw(l).filter(p=>p.alive&&p.atHome&&p.role==='child'))p.relation=clamp(p.relation-5);log(l,'집안의 예법을 어겼다며 자녀를 꾸짖었다. 자녀는 고개를 숙인 채 대답하지 않았다.');}
 return true;
}
function hydrate(l,d){if(!l)return;const o=d?.household342;if(!o||o.version!==1)return;if(!enabled(l)&&l.country?.[0]==='대한민국')l.household342={version:1,plans:{},skills:{},fatigue:{}};const fresh=ensure(l);if(!fresh)return;
 const finite=(v,a,b,f=0)=>Number.isFinite(v)?clamp(v,a,b):f;
 fresh.processedYear=finite(o.processedYear,l.birthYear,l.year,l.year);fresh.pocket=finite(o.pocket,0,500);fresh.trust=finite(o.trust,0,100,60);
 for(const k of ['kin','faith','strict'])fresh[k]=finite(o[k],0,1000);
 fresh.crisis=o.crisis&&typeof o.crisis.target==='string'?{target:o.crisis.target}:null;fresh.contracts=Array.isArray(o.contracts)?o.contracts.filter(x=>x&&typeof x.id==='string'&&Number.isInteger(x.year)&&x.year<=l.year&&['bound','freed','ended'].includes(x.status)).slice(-12).map(x=>({...x,name:String(x.name||'가족').slice(0,24),origin:String(x.origin||'상민').slice(0,30)})):[];
 fresh.used=Array.isArray(o.used)?o.used.filter(x=>typeof x==='string'&&x.length<100).slice(-80):[];
 fresh.history=Array.isArray(o.history)?o.history.filter(x=>Number.isInteger(x.year)&&x.year<=l.year&&typeof x.text==='string').slice(-40).map(x=>({year:x.year,text:x.text.slice(0,250)})):[];
 const ids=['self',...raw(l).map(p=>p.id)];
 for(const id of Object.keys({...o.plans,...o.skills,...o.fatigue}).filter(id=>typeof id==='string'&&id.length<=30)){const p=o.plans?.[id];if(p&&tasks[p.task]&&Number.isInteger(p.year)&&p.year<=l.year&&p.year>=l.birthYear&&(!p.recipe||permittedRecipe(l,p.recipe))){fresh.plans[id]={task:p.task,recipe:p.recipe||null,year:p.year,remaining:finite(p.remaining,0,2),force:p.force===true};}const sk=o.skills?.[id];if(sk)fresh.skills[id]={craft:finite(sk.craft,0,100),study:finite(sk.study,0,100),trade:finite(sk.trade,0,100)};if(Object.prototype.hasOwnProperty.call(o.fatigue||{},id))fresh.fatigue[id]=finite(o.fatigue[id],0,100);}
 fresh.stock=Array.isArray(o.stock)?o.stock.filter(x=>x&&permittedRecipe(l,x.recipe)&&typeof x.id==='string').slice(-60).map(x=>({id:x.id.slice(0,80),recipe:x.recipe,maker:typeof x.maker==='string'?x.maker.slice(0,30):'self',quality:finite(x.quality,1,3,1),year:finite(x.year,l.birthYear,l.year,l.year),raw:x.raw===true})):[];
 fresh.letters=Array.isArray(o.letters)?o.letters.filter(x=>x&&['care','study','wage'].includes(x.task)&&ids.includes(x.manager)&&['travelling','lost','delivered'].includes(x.status)&&Number.isInteger(x.sent)&&x.sent<=l.year&&x.due===x.sent+1).slice(-12).map(x=>({...x})):[];
 fresh.homeRegion=String(o.homeRegion||fresh.homeRegion).slice(0,50);fresh.manager=ids.includes(o.manager)?o.manager:null;
 if(d.pending==='household342:crisis'&&fresh.crisis&&members(l).some(p=>p.id===fresh.crisis.target)&&inCrisis(l))l.pending='household342:crisis';else fresh.crisis=null;
 fresh.trip=o.trip&&Number.isInteger(o.trip.started)&&o.trip.started<=l.year&&o.trip.until===o.trip.started+2?{started:o.trip.started,until:o.trip.until}:null;
 if(o.crop&&['목화','인삼'].includes(o.crop.name)&&Number.isInteger(o.crop.started)&&o.crop.started<=l.year&&o.crop.due===o.crop.started+(o.crop.name==='목화'?1:4))fresh.crop={...o.crop,region:String(o.crop.region||'').slice(0,50)};
}
const L=root.OneLifeSim.Life,get=L.prototype.getChoice,choose=L.prototype.choose,tick=L.prototype.tick,snapshot=L.prototype.snapshot,restore=L.restore;
L.prototype.getChoice=function(){return this.pending==='household342:crisis'?crisisPrompt(this):get.call(this);};
L.prototype.choose=function(i){return this.pending==='household342:crisis'?crisisChoose(this,i):choose.call(this,i);};
L.prototype.tick=function(){const y=this.year,r=tick.call(this);if(this.year!==y)settle(this);return r;};
L.prototype.snapshot=function(){const d=snapshot.call(this);if(enabled(this)||this.household342)d.household342=JSON.parse(JSON.stringify(ensure(this)));return d;};
L.restore=function(d){const l=restore.call(this,d);if(enabled(l)||d?.household342)hydrate(l,d);return l;};
root.OneLifeHousehold342=Object.freeze({ensure,enabled,members,away,manager,canManage,workOptions,assign,action,settle,recipes,tasks,roles,book,hydrate,inCrisis});
})(window);
