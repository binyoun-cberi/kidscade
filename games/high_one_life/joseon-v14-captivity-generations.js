/* Joseon v14 — war captivity, homecoming, accessible work and family continuity.
 * Specific lives/symptoms/risks are fictional. Experiences are NEVER automatic
 * diagnoses, inherited illness or a moral judgement against people who return.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon4,root?.OneLifeJoseon5,root?.OneLifeJoseon9,root?.OneLifeJoseon12,root?.OneLifeJoseon13);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon14=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V4,V5,V9,V12,V13){
'use strict';
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=(seed,salt)=>{let n=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296};
const SOURCES=Object.freeze({
 japanese:'https://encykorea.aks.ac.kr/Article/E0073566',
 manchu:'https://encykorea.aks.ac.kr/Article/E0076452',
 manchuDetail:'https://encykorea.aks.ac.kr/Article/E0023151',
 after:'https://contents.history.go.kr/data/pdf/nh/nh_029_0020.pdf'
});
const WAR_FOOTPRINT_1592=new Set(['경상도','전라도','충청도','경기도','한양','강원도','황해도','평안도','함경도']);
const WAR_FOOTPRINT_1597=new Set(['경상도','전라도','충청도']);
const NORTHERN_1627=new Set(['평안도','황해도']);
const CAPITAL_1636=new Set(['경기도','한양','황해도']);
const JAPAN_CONTACT_YEARS=new Set([1599,1600,1605,1607,1617,1624,1636,1643]);
const MAJOR_JAPAN_ENVOYS=new Set([1605,1607,1617,1624]);
const EVENT=(id,title,scene,opts)=>({id,title,scene,options:opts});
const OPT=(label,note,after,delta={},action='care')=>({label,note,after,delta,action});
const EPISODES=[
 EVENT('captivityWork','낯선 땅에서 보내는 일터의 하루','집에서 멀리 떨어진 곳에서 정해진 일을 해야 한다. 같은 처지의 사람들과 짧게 이야기를 나눌 기회가 있다.',[
  OPT('함께 일하는 사람과 일을 나눈다','서로 무리하지 않도록 살핀다','그곳에서 나누었던 일손과 말이 오래 기억에 남았다.',{contacts:2,skill:1,bonds:2},'support'),
  OPT('익숙한 기술을 조금씩 익힌다','돌아가서도 쓸 수 있는 솜씨를 남긴다','낯선 곳에서 배운 솜씨가 훗날 일에 도움이 되었다.',{skill:3,knowledge:2},'skill'),
  OPT('몸이 지칠 때 쉬어 갈 틈을 찾는다','스스로의 몸을 돌보는 일도 중요하다','어렵게 얻은 쉼이 다음 날을 버티는 데 보탬이 됐다.',{health:2,resilience:2},'rest')]),
 EVENT('captivityLetters','멀리 떨어진 가족의 이름','고향의 소식을 듣기 어렵다. 포로로 끌려온 다른 사람들도 가족의 이름을 기억하고 있다.',[
  OPT('다른 사람과 집안의 소식을 나눈다','아는 지명과 이름을 서로 전한다','서로의 집안을 기억해 주는 사람이 있었다.',{contacts:3,bonds:2},'support'),
  OPT('기억나는 가족의 이름을 적어 둔다','언젠가 소식을 전할 수 있도록 한다','돌아갈 길을 찾을 때 기억해 둔 이름이 도움이 됐다.',{knowledge:3,resilience:2},'remember'),
  OPT('멀리 돌아간 사람에게 안부를 부탁한다','편지가 닿을지는 알 수 없다','돌아간 사람에게 고향 이야기를 전해 달라 부탁했다.',{capital:-2,contacts:2},'message')]),
 EVENT('captivityInjury','오랫동안 일한 뒤 몸에 남은 변화','몸에 힘이 잘 들어가지 않거나 귀가 먹먹해지는 날이 있다. 일하는 방법을 바꿀 필요가 있다.',[
  OPT('나에게 맞는 도구와 자세를 찾는다','힘든 일을 덜어 내며 새로운 방법을 배운다','고쳐 쓰는 도구 덕에 하던 일을 계속할 수 있었다.',{skill:2,mobility:1,access:3},'adapt'),
  OPT('함께 일하는 사람에게 도움을 구한다','일을 나눌 방법을 찾는다','일손을 나누어 주던 동료와 오래 친하게 지냈다.',{contacts:3,bonds:2,access:2},'support'),
  OPT('몸을 쉬게 하고 할 수 있는 일부터 한다','서두르지 않고 자신의 속도로 살아간다','작은 일부터 다시 해 나갈 수 있었다.',{health:3,resilience:2},'rest')]),
 EVENT('captivityNews','고향으로 돌아갈 길을 묻다','오가는 상인과 사신에 관한 이야기가 들린다. 그러나 귀향은 자신의 뜻만으로 정할 수 없다.',[
  OPT('소식을 전할 사람을 수소문한다','고향에 이름을 전할 기회를 찾는다','돌아갈 길을 알아보는 데 도움이 될 사람을 만났다.',{contacts:2,hope:3,knowledge:2},'news'),
  OPT('함께 끌려온 이의 안부도 챙긴다','다른 사람의 귀향을 돕는다','서로의 고향을 기억하던 동료가 소식을 전했다.',{contacts:3,bonds:3},'support'),
  OPT('돌아갈 기회를 기다리며 기술을 이어 간다','그곳의 생활이 곧 자유롭다는 뜻은 아니다','낯선 곳에서 배운 일로 하루하루를 살아갔다.',{skill:2,hope:1},'skill')]),
 EVENT('japanWorkshop','바다 건너 일터의 손기술','이곳에서는 낯선 말과 도구를 배우며 일을 해야 한다. 기술을 쓴다고 귀향이 허락되는 것은 아니다.',[
  OPT('작업 순서와 솜씨를 익힌다','손에 남은 감각을 살린다','일을 반복하며 낯선 솜씨도 익혀 갔다.',{skill:3,workplace:3,knowledge:2},'skill'),
  OPT('함께 일하는 사람에게 말을 배운다','물건의 이름을 물어본다','서로 다른 말을 하는 사람과 천천히 뜻을 나눴다.',{localTies:3,language:2,bonds:2},'support'),
  OPT('지친 동료와 일손을 나눈다','쉬어 갈 틈을 찾는다','함께 일하던 사람들과 서로를 돌보았다.',{contacts:3,health:1},'rest')]),
 EVENT('japanFamilyTies','낯선 곳에서 남은 인연','함께 일하고 살던 사람들과 관계가 깊어지기도 한다. 고향에 남은 가족의 소식은 여전히 멀다.',[
  OPT('가까운 이와 먹을 것을 나눈다','서로의 생활을 돌본다','나눠 먹은 밥이 낯선 날의 기억으로 남았다.',{localTies:4,bonds:3},'support'),
  OPT('고향 가족의 이름을 적는다','집과 사람의 이름을 기억한다','오래된 이름을 다시 적어 두었다.',{homeNews:4,knowledge:2},'remember'),
  OPT('귀환 사절에 전할 사람들의 이름을 모은다','동행할 사람들의 뜻을 듣는다','누군가는 떠나고 누군가는 남겠다는 사연을 나누었다.',{contacts:3,homeNews:2},'news')]),
 EVENT('manchuLanguage','요동의 낯선 말과 살림','여진의 여러 집단과 후금·청의 사람들이 모두 같은 삶을 사는 것은 아니다. 이곳에서 만난 이들의 말을 익혀야 한다.',[
  OPT('현지 사람들이 쓰는 말을 배운다','짧은 말과 물건 이름을 익힌다','서로 인사하고 물건을 가리키는 말을 배웠다.',{language:4,localTies:2,knowledge:2},'skill'),
  OPT('같이 끌려온 사람의 일을 돕는다','함께 하루를 버틴다','같은 처지의 이웃과 일손을 나눴다.',{contacts:3,bonds:3},'support'),
  OPT('집안의 이름과 주소를 정리한다','고향에 닿을 말을 남긴다','가족의 이름과 고을을 종이에 적었다.',{homeNews:3,knowledge:2},'remember')]),
 EVENT('manchuRansomNames','속환을 기다리는 사람들','돌아갈 사람들의 이름이 오르내린다. 몸값을 마련할 여건과 사절을 통한 교섭은 집집마다 다르다.',[
  OPT('사절에게 전할 이름을 확인한다','가족의 사정을 모은다','이름과 고을이 적힌 문서를 서로 대조해 보았다.',{homeNews:4,contacts:3},'petition'),
  OPT('편지와 비용을 보낼 길을 알아본다','일이 뜻대로 되지 않을 수 있다','먼 곳에 소식을 전할 방법을 다시 물었다.',{contacts:2,knowledge:2},'ransom'),
  OPT('남겨질 사람의 생활을 돕는다','함께 어려운 날을 넘긴다','돌아가지 못한 사람들과 필요한 것을 나누었다.',{localTies:3,bonds:3},'community')]),
 EVENT('ransomOpportunity','귀향을 알아볼 기회','고향으로 돌아갈 사람을 찾는다는 말이 들린다. 일본으로 끌려간 사람은 쇄환 교섭, 후금·청으로 끌려간 사람은 속환과 가족의 비용이 걸려 있다.',[
  OPT('귀환 사절과 소식을 확인한다','명단과 귀향 가능성을 알아본다','고향으로 돌아가거나, 돌아올 다른 기회를 기다렸다.',{hope:4,contacts:2},'petition'),
  OPT('고향 가족에게 비용 마련을 부탁한다','연락이나 몸값을 마련하기 어려울 수 있다','가족과 연락을 시도한 일이 훗날까지 남았다.',{capital:-6,hope:4},'ransom'),
  OPT('함께 지내던 사람의 길도 도와준다','모든 사람이 같은 길을 택할 수는 없다','낯선 곳에서 서로 지켜 준 관계는 오래 남았다.',{contacts:3,bonds:3,hope:1},'community')]),
 EVENT('homecoming','돌아온 고향의 첫 저녁','오랫동안 떠나 있던 집으로 돌아왔다. 예전 모습과 다른 곳이 많고, 식구들도 저마다 다른 세월을 살았다.',[
  OPT('식구에게 있었던 일을 천천히 이야기한다','말을 꺼내기 어려운 기억도 있다','오래 기다렸던 식구와 한 번에 모든 말을 나누지는 않았다.',{bonds:5,trust:2,resilience:2},'talk'),
  OPT('작은 살림부터 다시 정리한다','먹고잘 자리를 먼저 마련한다','함께 지낼 방을 꾸미며 매일의 생활이 시작됐다.',{capital:-3,repair:2,access:1},'work'),
  OPT('낯익은 이웃부터 찾아간다','예전의 관계가 그대로일 필요는 없다','서로 달라진 얼굴을 알아보며 천천히 인사를 나눴다.',{trust:5,contacts:1},'neighbor')]),
 EVENT('homeSenses','다시 들려오는 발소리','평범한 소리에도 전란의 일이 떠오르곤 한다. 어떤 날은 잠을 설쳤고, 어떤 날은 새벽까지 평온했다.',[
  OPT('편안한 잠자리를 바꾸어 본다','조용한 밤을 위한 방법을 찾아본다','잠을 설친 밤에도 다시 쉬는 방법을 찾아 갔다.',{sleep:3,resilience:3},'rest'),
  OPT('믿을 만한 사람에게 어려움을 전한다','말을 들어 줄 사람을 찾는다','마음을 나눌 수 있는 사람과 오래 이야기를 했다.',{sleep:1,resilience:4,bonds:3},'talk'),
  OPT('익숙한 손일과 일상을 조금씩 이어 간다','좋은 날과 힘든 날이 섞일 수 있다','힘든 기억이 있어도 삶은 여러 모습으로 계속되었다.',{skill:2,resilience:2},'work')]),
 EVENT('homeStigma','포로로 다녀온 사람을 향한 말','돌아온 사람에게 부당한 말을 하는 이들이 있다. 포로가 된 것은 그 사람의 잘못이 아니다.',[
  OPT('돌아온 사람의 편에 선다','마을 사람의 잘못된 말을 바로잡는다','돌아온 이와 서로 의지하는 관계를 이어 갔다.',{trust:3,bonds:4,resilience:2},'solidarity'),
  OPT('가까운 사람과 경계를 정한다','사생활을 지킬 권리를 생각한다','마음이 힘든 대화를 피하고 편안한 곳에서 지낼 수 있었다.',{resilience:3,trust:-1},'boundary'),
  OPT('함께 생업에 필요한 일을 찾는다','일을 계속할 방법을 도모한다','서로 일손을 나누며 집안을 꾸렸다.',{skill:2,capital:2,access:2},'work')]),
 EVENT('homeWork','예전과 다른 방법으로 일하다','예전처럼 오래 걷거나 힘을 쓰기 어려운 날이 있다. 기술과 이웃의 도움을 이용해 다른 일하는 방법을 찾는다.',[
  OPT('손에 맞는 도구를 새로 만든다','도구를 고쳐 쓰는 데 비용이 든다','새 도구 덕분에 원하는 일을 오래 이어 갈 수 있었다.',{capital:-3,access:5,skill:2},'adapt'),
  OPT('기술을 이웃과 자녀에게 가르친다','일을 나누어 함께 완성한다','함께 배운 사람들이 새로운 일거리를 가져왔다.',{skill:4,bonds:3,contacts:2},'teach'),
  OPT('몸에 무리가 적은 일로 바꾼다','새로운 일을 천천히 익힌다','자신에게 맞는 방법으로 살림을 이어 나갔다.',{knowledge:2,access:4,resilience:2},'adapt')]),
 EVENT('homeNewFamily','다시 가족이 되어 가는 시간','헤어져 지낸 동안 모두가 달라졌다. 배우자와 아이들에게도 긴 세월이 흘렀다.',[
  OPT('함께 지낼 방식부터 다시 의논한다','각자의 생각을 먼저 듣는다','서로의 시간을 인정하며 집안의 일을 나누었다.',{bonds:5,resilience:2},'talk'),
  OPT('멀리 지낸 식구에게 안부를 전한다','가족이 떨어져 살아도 인연은 이어질 수 있다','자주 만나지 못하더라도 안부를 전할 수 있었다.',{contacts:2,bonds:3},'message'),
  OPT('옛날의 일보다 오늘의 밥상을 챙긴다','하루하루의 생활을 함께한다','식구들과 함께 밥을 먹는 시간이 다시 쌓였다.',{grain:-2,bonds:4},'care')]),
 EVENT('heirLearn','다음 세대에게 전하는 손기술','어린 식구가 전쟁 전후의 이야기를 묻는다. 도자기 굽는 일이나 논밭을 일구는 방법을 배울 수도 있다.',[
  OPT('아이에게 몸으로 익힌 기술을 보여 준다','무엇을 배울지는 아이가 정할 수 있다','아이는 어른의 손짓을 따라 하며 조금씩 일을 배워 갔다.',{skill:2,bonds:3,heritageSkill:2},'teach'),
  OPT('전쟁 뒤 다시 일어선 일을 이야기한다','힘들었던 일만이 전부는 아니다','집안의 오래된 이야기가 사람들의 기억에 남았다.',{bonds:3,heritageMemory:2},'story'),
  OPT('집안의 장부와 도구를 정리해 둔다','다음 세대에게 남길 살림을 준비한다','남겨 둔 장부와 도구가 훗날 쓰일 수 있었다.',{capital:-1,heritageSkill:1,heritageGoods:2},'prepare')])
];
const byId=new Map(EPISODES.map(e=>[e.id,e]));
function eraFor(l){
 const r=J.summary(l).region;
 if(l.year>=1592&&l.year<=1593&&WAR_FOOTPRINT_1592.has(r))return 'japan';
 if(l.year>=1594&&l.year<=1596&&WAR_FOOTPRINT_1597.has(r))return 'japan';
 if(l.year>=1597&&l.year<=1598&&WAR_FOOTPRINT_1597.has(r))return 'japan';
 if(l.year===1627&&NORTHERN_1627.has(r))return 'laterJin';
 if((l.year===1636||l.year===1637)&&CAPITAL_1636.has(r))return 'qing';
 return null;
}
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.joseon14)l.joseon14={version:1,processedYear:l.year,queue:[],active:null,seen:[],decisions:[],followups:[],
  captivity:null,body:{movement:'',hearing:'',pain:0,access:0},experience:{sleep:0,vigilance:0,resilience:3},
  stigma:0,trust:0,skills:0,contacts:0,overseas:{workplace:0,localTies:0,language:0,homeNews:0},heritage:{skills:0,goods:0,memories:0},familyLine:[],recoverYears:0,lastSource:null};
 return l.joseon14;
}
const isOld=l=>J?.inOldEra(l)&&l.alive&&l.year<=1715;
function canCapture(l){return !!eraFor(l)&&l.age>=9&&l.age<=64&&isOld(l);}
function suspendDomestic(l){
 // Local court, fields, markets, family ceremonies and village decisions cannot
 // be actively chosen from Japan or beyond the northern frontier.
 const modules=['joseon','joseon2','joseon3','joseon4','joseon5',
  'joseon6','joseon7','joseon9','joseonAnnals','joseon11','joseon12','joseon13'];
 for(const key of modules){
  const st=l[key];if(!st)continue;
  if('active' in st)st.active=null;
  if('deferred' in st)st.deferred=null;
  if(Array.isArray(st.queue))st.queue=[];
  if(Array.isArray(st.pending))st.pending=[];
 }
 if(l.pending && !(typeof l.pending==='string'&&l.pending.startsWith('joseon14:')))
  l.pending=null;
}
function capture(l,realm=eraFor(l)){
 if(!realm||!canCapture(l)||ensure(l).captivity)return false;
 const s=ensure(l);
 s.captivity={realm,from:l.year,place:realm==='japan'?'일본':'후금·청의 지배 아래',years:0,
  status:'held',contacts:0,work:V5?.summary(l)?.trade||'낯선 곳에서 맡은 일',returnedYear:null,
  route:null,attempts:0};
 if(hash(l.seed,l.year*31+9)<.38)s.body.pain=2;
 if(hash(l.seed,l.year*31+10)<.20)s.body.movement='오래 걸을 때 다리가 아픔';
 if(hash(l.seed,l.year*31+11)<.12)s.body.hearing='큰 소리를 구별하기 어려움';
 // These are optional fictional responses, never universal captive diagnoses.
 s.experience.sleep=hash(l.seed,l.year*31+12)<.37?3:0;
 s.experience.vigilance=hash(l.seed,l.year*31+13)<.34?3:0;
 // A home-country choice started in the capture year is not a believable
 // overseas scene. Discard only the unfinished choice; preserve its history.
 if(typeof l.pending==='string'&&l.pending.startsWith('joseon')){
  const key=l.pending.split(':')[0];
  const map={joseon:'joseon',joseon2:'joseon2',joseon3:'joseon3',
   joseon4:'joseon4',joseon5:'joseon5',joseon6:'joseon6',
   joseon7:'joseon7',joseon9:'joseon9',joseonAnnals:'joseonAnnals',
   joseon11:'joseon11',joseon12:'joseon12',joseon13:'joseon13'};
  if(map[key]&&l[map[key]]?.active)l[map[key]].active=null;
  l.pending=null;
 }
 suspendDomestic(l);
 l.logEvent('전란 중에 붙잡혀 고향과 멀리 떨어진 곳으로 끌려갔다. 언제 돌아올지 알 수 없었다.','joseon14-captivity');
 l.log.at(-1).sourceUrl=realm==='japan'?SOURCES.japanese:SOURCES.manchu;
 return true;
}
function reunion(l,s,route='쇄환'){
 const c=s.captivity;if(!c||c.status!=='held')return false;
 c.status='returned';c.returnedYear=l.year;c.route=route;s.recoverYears=0;
 l.logEvent('오랜 세월이 지나 고향으로 돌아왔다. 귀환의 길은 쉽지 않았고, 떠나 있던 시간은 돌아오지 않았다.','joseon14-return');
 return true;
}
function opportunity(l,s){
 const c=s.captivity;if(!c||c.status!=='held')return false;
 // Japan: documented return diplomacy in 1605, 1607, 1617 and 1624;
 // some earlier Tsushima exchanges and much smaller later returns.
 return c.realm==='japan'?JAPAN_CONTACT_YEARS.has(l.year):
  c.realm==='laterJin'?(l.year>=1628&&l.year<=1650):(l.year>=1637&&l.year<=1662);
}
function add(l,s,id){
 const repeat=id==='ransomOpportunity';
 const actualId=repeat?l.year+'-'+id:id;
 if(s.queue.some(q=>q.id===actualId)||s.active?.id===actualId||(!repeat&&s.seen.includes(id)))return;
 if(repeat&&s.decisions.some(d=>d.eventId===id&&d.year>=l.year-2))return;
 if(!repeat)s.seen.push(id);
 s.queue.push({id:actualId,eventId:id,year:l.year});s.queue=s.queue.slice(-3);
}
function promote(l,s){
 if(!s||s.active||l.pending||!l.alive||!J.inOldEra(l)||!s.queue.length)return;
 s.active=s.queue.shift();l.pending='joseon14:'+s.active.id;
}
function yearly(l,s){
 if(!s||!l.alive||!J.inOldEra(l)||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 for(const f of s.followups.filter(f=>f.year<=l.year)){
  l.logEvent(f.text,'joseon14-followup');l.log.at(-1).causeId='joseon14:'+f.id;
 }
 s.followups=s.followups.filter(f=>f.year>l.year);
 const c=s.captivity;
 if(!c&&canCapture(l)&&hash(l.seed,l.year*57+172)<.10){
  if(capture(l))add(l,s,'captivityWork');
 }
 if(c?.status==='held'){
  c.years++;
  // No annual all-or-nothing death or mental diagnosis.
  if(l.year%3===0){s.experience.sleep=clip(s.experience.sleep+1,0,12);s.body.pain=clip(s.body.pain+1,0,12);}
  if(l.age>=12){
   if(opportunity(l,s)&&hash(l.seed,l.year*47+17)<(MAJOR_JAPAN_ENVOYS.has(l.year)||c.realm!=='japan'?.82:.31))
    add(l,s,'ransomOpportunity');
   else if(l.age%2===0){
    const special=c.realm==='japan'?['japanWorkshop','japanFamilyTies']:['manchuLanguage','manchuRansomNames'];
    const pool=['captivityWork','captivityLetters','captivityInjury','captivityNews',...special].filter(id=>!s.seen.includes(id));
    if(pool.length)add(l,s,pool[Math.floor(hash(l.seed,l.year*23+4)*pool.length)]);
   }
  }
 }else if(c?.status==='returned'){
  s.recoverYears++;
  if(s.recoverYears===1)add(l,s,'homecoming');
  else if(s.recoverYears<=28&&l.age>=15&&(l.year%3===1)){
   const pool=['homeSenses','homeStigma','homeWork','homeNewFamily','heirLearn'].filter(id=>!s.seen.includes(id));
   if(pool.length)add(l,s,pool[Math.floor(hash(l.seed,l.year*23+23)*pool.length)]);
  }
  if(s.recoverYears%5===0&&s.experience.sleep>0)s.experience.sleep--;
 }else if(!c&&l.year>=1592&&l.year<=1662&&l.age>=16&&l.age%8===3&&V13?.summary(l)?.warCount>0){
  if(s.body.pain===0&&hash(l.seed,l.year*11+18)<.23)s.body.pain=2;
  if(s.experience.vigilance===0&&hash(l.seed,l.year*11+19)<.25)s.experience.vigilance=2;
  if(s.body.pain||s.experience.vigilance){
   const ep= s.experience.vigilance?'homeSenses':'homeWork';
   add(l,s,ep);
  }
 }
 promote(l,s);
}
function prompt(l){
 const s=ensure(l),e=byId.get(s?.active?.eventId);
 if(!e)return null;
 let description=e.scene;
 if(e.id==='ransomOpportunity'){
  description=s.captivity?.realm==='japan'?
    (MAJOR_JAPAN_ENVOYS.has(l.year)?
      l.year+'년, 조선으로 돌아갈 사람을 찾는 교섭과 사절이 왔다는 말이 들린다. 돌아갈 사람들의 이름이 불릴 때마다 사람들은 숨을 죽였다.':
      '대마도나 외교 사절을 통해 조선인 일부가 귀환한다는 소식이 들린다. 가능성은 크지 않다.'):
    '후금·청에 끌려온 사람의 속환 소식이 들린다. 나라에서 몸값을 마련하는 공속과 가족이 개별적으로 치르는 사속은 형편이 다르다.';
 }
 if(e.id==='japanWorkshop'){
  const trade=String(s.captivity?.work||'');
  description=/도공|도자|가마/.test(trade)?
   '가마와 흙을 다루던 솜씨를 알아본 사람이 일터로 데려갔다. 기술을 쓰게 되었다고 돌아갈 자유가 생긴 것은 아니다.':
   '낯선 일터에서 일손을 보탠다. 언어와 기술이 다른 사람에게 배워 가며 하루를 보낸다.';
 }
 if(e.id==='homeStigma'){
  description=s.captivity?.realm==='qing'&&l.gender==='여자'?
    '청에서 돌아왔다는 이유로 정절을 의심하는 말이 등 뒤에서 들려온다. 집안사람들은 그 말을 들으면서도 어떻게 맞서야 할지 몰라 서로의 얼굴을 살핀다.':
    '돌아온 이를 반기는 이웃도 있지만 낯을 돌리는 사람도 있다. 오랜만에 고향집 문턱을 넘으며 사람들의 눈길이 마음에 걸린다.';
 }
 return {title:e.title,description,options:e.options.map(o=>({label:o.label,note:o.note,action:o.label}))};
}
function choose(l,index){
 const s=ensure(l),e=byId.get(s?.active?.eventId);
 if(!e||!l.alive||!Number.isInteger(index)||index<0||index>=e.options.length)return false;
 const op=e.options[index],d=op.delta,id=s.active.id,j=J.ensure(l),v=V2.ensure(l),v9=V9.ensure(l),v12=V12.ensure(l);
 const ch={};for(const k of ['health','happiness','knowledge','bonds','wealth'])if(Number.isFinite(d[k]))ch[k]=d[k];
 l.change(ch);
 if(Number.isFinite(d.capital))j.capital=clip(j.capital+d.capital,-120,600);
 if(Number.isFinite(d.grain))v.grain=clip(v.grain+d.grain,0,200);
 if(Number.isFinite(d.repair))V13.ensure(l).repair=clip(V13.ensure(l).repair+d.repair,0,100);
 if(Number.isFinite(d.trust))v9.trust=clip(v9.trust+d.trust,0,100);
 if(Number.isFinite(d.skill)){s.skills=clip(s.skills+d.skill,0,40);v12.skill=clip(v12.skill+d.skill,0,40);}
 if(Number.isFinite(d.contacts))s.contacts=clip(s.contacts+d.contacts,0,40);
 for(const key of ['workplace','localTies','language','homeNews'])
  if(Number.isFinite(d[key]))s.overseas[key]=clip(s.overseas[key]+d[key],0,40);
 if(Number.isFinite(d.access))s.body.access=clip(s.body.access+d.access,0,40);
 if(Number.isFinite(d.mobility))s.body.access=clip(s.body.access+d.mobility,0,40);
 if(Number.isFinite(d.sleep))s.experience.sleep=clip(s.experience.sleep-d.sleep,0,12);
 if(Number.isFinite(d.resilience))s.experience.resilience=clip(s.experience.resilience+d.resilience,0,40);
 if(Number.isFinite(d.heritageSkill))s.heritage.skills=clip(s.heritage.skills+d.heritageSkill,0,40);
 if(Number.isFinite(d.heritageMemory))s.heritage.memories=clip(s.heritage.memories+d.heritageMemory,0,40);
 if(Number.isFinite(d.heritageGoods))s.heritage.goods=clip(s.heritage.goods+d.heritageGoods,0,40);
 if(e.id==='ransomOpportunity'){
  const c=s.captivity;c.attempts++;
  // Opportunity, never guaranteed. Route depends on historical captor/context.
  const chance=c.realm==='japan'?
    (MAJOR_JAPAN_ENVOYS.has(l.year)?[.34,.24,.07][index]:[.12,.08,.03][index]):
    [ .38,.29,.06 ][index];
  if(hash(l.seed,l.year*83+index*41+c.attempts*3)<chance)
   reunion(l,s,c.realm==='japan'?'쇄환':'속환');
  else l.logEvent('귀향할 길을 알아보았지만 이번에는 고향으로 돌아갈 수 없었다.','joseon14-captivity');
 }
 // Stigma belongs to the society's response, not the survivor's morality.
 if(e.id==='homeStigma'&&index!==0)s.stigma=clip(s.stigma+1,0,20);
 if(l.money&&l.year<1900)l.money.netWorth=j.capital*100;
 l.logEvent(e.title+' — '+op.label,'joseon14-choice');l.log.at(-1).causeId='joseon14:'+id;
 s.decisions.push({id,eventId:e.id,year:l.year,choice:index});
 s.decisions=s.decisions.slice(-65);s.followups.push({id,year:l.year+2+(index%2),text:op.after});
 s.followups=s.followups.slice(-45);
 s.lastSource=s.captivity?.realm==='japan'?SOURCES.japanese:SOURCES.manchu;
 s.active=null;l.pending=null;promote(l,s);return true;
}
function summary(l){
 const s=ensure(l);if(!s)return null;
 const c=s.captivity;
 return {captivity:c?{realm:c.realm,status:c.status,from:c.from,years:c.years,returnedYear:c.returnedYear,route:c.route}:null,
  body:{...s.body},experience:{...s.experience},skills:s.skills,contacts:s.contacts,
  familyLine:s.familyLine.map(x=>({...x})),heritage:{...s.heritage},
  recoverYears:s.recoverYears,overseas:{...s.overseas},decisions:s.decisions.length,source:s.lastSource};
}
function heirs(l){
 if(!J?.isJoseon(l)||l.alive||!V4?.summary)return [];
 // This successor system still uses Joseon family modules. A child born in
 // 1898 or later must not be passed into an incompatible Joseon initializer.
 return V4.ensure(l).people.filter(p=>p.role==='child'&&p.alive&&p.birthYear<=l.year&&
   l.year-p.birthYear>=12&&l.year-p.birthYear<=100&&p.birthYear>=1392&&p.birthYear<=1897)
  .map(p=>({id:p.id,name:p.name,age:l.year-p.birthYear,gender:p.sex||'남자',birthYear:p.birthYear}));
}
function targetLegalStatus(parent,personId){
 const p=V4.ensure(parent).people.find(p=>p.id===personId);
 if(p?.legal==='천인')return '천민';
 return J.ensure(parent).birthStatus==='양반'?'양반':'상민';
}
function continueAsHeir(parent,id){
 const heir=heirs(parent).find(p=>p.id===id);
 if(!heir)return null;
 const old=ensure(parent),oldJ=J.ensure(parent),oldV2=V2.ensure(parent),oldV4=V4.ensure(parent);
 const newSeed=(parent.seed^Math.imul(heir.birthYear,1664525)^heir.name.split('').reduce((v,c)=>v+c.charCodeAt(0),0))>>>0;
 const l=new Sim.Life(newSeed,{birthYear:heir.birthYear,countryName:'대한민국'});
 J.ensure(l);V5.ensure(l);
 l.gender=heir.gender;V4.ensure(l);l.profile.name=heir.name;
 l.year=parent.year;l.age=l.year-l.birthYear;
 // A successor continues from the exact year when the parent dies. No time travel.
 const j=J.ensure(l);j.region=oldJ.region;j.capital=clip(Math.floor(oldJ.capital*.65),-120,600);
 j.birthStatus=targetLegalStatus(parent,heir.id);
 if(parent.joseon8){
  l.joseon8=JSON.parse(JSON.stringify(parent.joseon8));
  const surname=l.joseon8.surname||'';
  l.joseon8.givenName=heir.name.startsWith(surname)?heir.name.slice(surname.length):heir.name;
  l.joseon8.generation=clamp((Number(l.joseon8.generation)||1)+1,1,18);
 }
 j.land=clip(Math.floor(oldJ.land*.6),0,30);
 j.literacy=clip(Math.max(j.literacy,Math.floor(oldJ.literacy*.4)),0,30);
 const granary=V2.ensure(l);granary.grain=clip(Math.floor(oldV2.grain*.6),0,200);
 const childFamily=V4.ensure(l);childFamily.processedYear=l.year;
 const target=oldV4.people.find(p=>p.id===heir.id);
 if(!target)return null;
 // Preserve actual siblings from the previous parent's family, not newly
 // generated strangers with unrelated names.
 childFamily.people=childFamily.people.filter(p=>p.role!=='sibling');
 for(const sibling of oldV4.people.filter(p=>p.role==='child'&&p.id!==heir.id&&p.birthYear<=l.year).slice(0,6)){
  childFamily.people.push({...sibling,id:'sibling-of-'+sibling.id,role:'sibling',joinedYear:null});
 }
 l.profile.siblings=childFamily.people.filter(p=>p.role==='sibling').length;
 const mother=childFamily.people.find(p=>p.role==='mother'),father=childFamily.people.find(p=>p.role==='father');
 const parentRole=parent.gender==='여자'?mother:father;
 if(parentRole){
  parentRole.name=parent.profile.name;parentRole.birthYear=parent.birthYear;
  parentRole.alive=false;parentRole.diedYear=parent.year;parentRole.atHome=false;
 }
 const other=oldV4.people.find(p=>p.role==='spouse');
 const otherRole=parent.gender==='여자'?father:mother;
 if(otherRole&&other){
  otherRole.name=other.name;otherRole.birthYear=other.birthYear;otherRole.alive=other.alive;
  otherRole.diedYear=other.diedYear;otherRole.atHome=other.atHome;
 }
 const oldSocial=V5.ensure(parent),newSocial=V5.ensure(l);
 newSocial.origin=oldSocial.origin;newSocial.originLabel=oldSocial.originLabel;
 newSocial.trade=oldSocial.trade;newSocial.duty=oldSocial.duty;
 newSocial.publicOffice=oldSocial.publicOffice;newSocial.freed=oldSocial.freed;
 const oldWar=V13.ensure(parent),newWar=V13.ensure(l);
 newWar.damage=clip(Math.floor(oldWar.damage*.55),0,20);
 newWar.fields=clip(Math.floor(oldWar.fields*.55),0,20);
 newWar.repair=clip(Math.floor(oldWar.repair*.5),0,100);
 newWar.processedYear=l.year;
 // Inherit no mental diagnosis or deterministic disability: changed material and
 // social circumstances and the family story, not a 'trauma gene'.
 const hs=ensure(l);
 hs.familyLine=[...old.familyLine.slice(-7),{
  name:parent.profile.name,birthYear:parent.birthYear,diedYear:parent.year,
  region:oldJ.region,trade:oldSocial.trade,war:!!old.captivity||V13.summary(parent).warCount>0,
  skills:old.skills,notes:old.heritage.memories}].slice(-8);
 hs.heritage.skills=clip(Math.floor(old.heritage.skills*.7+old.skills*.15),0,40);
 hs.heritage.goods=clip(Math.floor(old.heritage.goods*.65),0,40);
 hs.heritage.memories=old.heritage.memories;
 hs.processedYear=l.year;
 l.stats.knowledge=clip(l.stats.knowledge+Math.floor(hs.heritage.skills*.4),0,100);
 l.logEvent('부모 '+parent.profile.name+'의 삶이 끝났다. '+heir.name+'의 시점에서 집안의 살림과 기억을 이어 간다.','joseon14-generations');
 l.log.at(-1).ancestorName=parent.profile.name;
 l.pending=null;
 Sim.Life.prototype.__joseon18Carry?.(parent,l);
 Sim.Life.prototype.__joseon19Carry?.(parent,l);
 // The register module loads after this module and is optional for old saves.
 Sim.Life.prototype.__genealogy15Inherit?.(parent,id,l);
 return l;
}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseon14;if(!s||!o||o.version!==1)return s;
 const valid=q=>q&&byId.has(q.eventId)&&typeof q.id==='string'&&Number.isInteger(q.year)&&q.year>=l.birthYear&&q.year<=l.year;
 const asQ=q=>({id:q.id.slice(0,65),eventId:q.eventId,year:q.year});
 s.processedYear=clip(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(id=>byId.has(id)).slice(-EPISODES.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.filter(valid).slice(-3).map(asQ):[];
 s.active=valid(o.active)?asQ(o.active):null;
 if(!l.alive||!J.inOldEra(l)||data?.pending!=='joseon14:'+s.active?.id)s.active=null;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(d=>valid(d)&&Number.isInteger(d.choice)&&d.choice>=0&&d.choice<3).slice(-65)
  .map(d=>({...asQ(d),choice:d.choice})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(f=>f&&typeof f.id==='string'&&typeof f.text==='string'&&Number.isInteger(f.year)&&f.year>l.year&&f.year<=l.year+5)
  .slice(-45).map(f=>({id:f.id.slice(0,65),year:f.year,text:f.text.slice(0,240)})):[];
 const c=o.captivity;
 if(c&&['japan','laterJin','qing'].includes(c.realm)&&Number.isInteger(c.from)&&c.from>=l.birthYear&&c.from<=l.year){
  s.captivity={realm:c.realm,from:c.from,place:c.realm==='japan'?'일본':'후금·청의 지배 아래',
   years:clip(Number(c.years)||0,0,95),status:c.status==='returned'?'returned':'held',
   contacts:clip(Number(c.contacts)||0,0,40),work:String(c.work||'맡은 일').slice(0,70),
   returnedYear:Number.isInteger(c.returnedYear)?clip(c.returnedYear,c.from,l.year):null,
   route:c.route==='쇄환'||c.route==='속환'?c.route:null,attempts:clip(Number(c.attempts)||0,0,100)};
 }
 for(const k of ['movement','hearing'])s.body[k]=String(o.body?.[k]||'').slice(0,45);
 s.body.pain=clip(Number(o.body?.pain)||0,0,12);s.body.access=clip(Number(o.body?.access)||0,0,40);
 for(const k of ['sleep','vigilance'])s.experience[k]=clip(Number(o.experience?.[k])||0,0,12);
 s.experience.resilience=clip(Number(o.experience?.resilience)||3,0,40);
 for(const k of ['skills','contacts','stigma','trust','recoverYears'])s[k]=clip(Number(o[k])||0,0,100);
 for(const key of ['workplace','localTies','language','homeNews'])s.overseas[key]=clip(Number(o.overseas?.[key])||0,0,40);
 for(const k of ['skills','goods','memories'])s.heritage[k]=clip(Number(o.heritage?.[k])||0,0,40);
 s.familyLine=Array.isArray(o.familyLine)?o.familyLine.filter(a=>a&&typeof a.name==='string'&&Number.isInteger(a.birthYear)&&a.birthYear<l.birthYear)
  .slice(-8).map(a=>({name:a.name.slice(0,35),birthYear:a.birthYear,diedYear:Math.floor(Number(a.diedYear)||a.birthYear),
   region:String(a.region||'').slice(0,25),trade:String(a.trade||'').slice(0,70),war:!!a.war,
   skills:clip(Number(a.skills)||0,0,40),notes:clip(Number(a.notes)||0,0,40)})):[];
 s.lastSource=Object.values(SOURCES).includes(o.lastSource)?o.lastSource:null;
 if(s.captivity?.status==='held')suspendDomestic(l);
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V4?.ensure||!V5?.ensure||!V9?.ensure||!V12?.ensure||!V13?.ensure||Sim.Life.prototype.__joseon14)return false;
 const L=Sim.Life,pt=L.prototype.tick,pc=L.prototype.choose,pg=L.prototype.getChoice,pr=L.prototype.reflect,ps=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this)||this.year>1715)return pt.call(this);
  const state=ensure(this);
  if(state.captivity?.status==='held'){
   // Do not call the outer Joseon wrappers: their domestic annual events,
   // markets, farms and celebrations cannot take place during captivity.
   suspendDomestic(this);
   const previousYear=this.year,logSize=this.log.length;
   const ok=Sim.advanceCoreYear(this);
   if(ok&&this.year!==previousYear){
    // The core life-cycle supplies aging and mortality, but its modern
    // school / career moments are not valid scenes for captives.
    this.log=this.log.filter((entry,i)=>i<logSize||entry.kind!=='milestone');
    if(this.pending)this.pending=null;
    if(this.alive)yearly(this,state);
   }
   return ok;
  }
  const before=this.year,ok=pt.call(this);
  if(ok&&this.alive&&this.year!==before)yearly(this,ensure(this));
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon14:'))return prompt(this);
  return pg.call(this);
 };
 L.prototype.choose=function(i){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon14:'))return choose(this,i);
  const ok=pc.call(this,i);if(ok&&isOld(this))promote(this,ensure(this));return ok;
 };
 L.prototype.reflect=function(t){const ok=pr.call(this,t);if(ok&&isOld(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const data=ps.call(this);if(J.isJoseon(this))data.joseon14=JSON.parse(JSON.stringify(ensure(this)));return data;};
 L.restore=function(data){const life=restore.call(this,data);if(life&&J.isJoseon(life))hydrate(life,data);return life;};
 Object.defineProperty(L.prototype,'__joseon14',{value:true});return true;
}
install();
return Object.freeze({EPISODES,SOURCES,ensure,eraFor,canCapture,capture,reunion,opportunity,yearly,choose,prompt,summary,heirs,continueAsHeir,hydrate,install});
});
