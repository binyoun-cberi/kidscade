/* One Life 3.25 — long-term Joseon livelihood, political and legal branches. */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,
  root?.OneLifeJoseon5,root?.OneLifeJoseon6,root?.OneLifeJoseon11,root?.OneLifeJoseon18);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon325=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V5,V6,V11,V18){
'use strict';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(seed,salt)=>{let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;};
const SOURCES=Object.freeze({
 debt:'https://contents.history.go.kr/',
 waegwan:'https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_i302810',
 politics:'https://encykorea.aks.ac.kr/Article/E0020165'
});
const JOBS=Object.freeze({
 constable:{name:'포졸',years:[1450,1894],region:null,keywords:/포졸|포교|군교|순라/,tasks:[
  ['장터의 도둑을 좇다','시전에서 물건이 없어졌다는 신고가 들어왔다. 물건 주인과 행인을 구분해서 살펴야 한다.',
   ['잃어버린 물건의 생김새와 목격한 시각을 묻는다','고발당한 사람부터 붙잡지 않고 서로의 진술을 맞춘다.','상관의 재촉대로 의심받는 사람을 먼저 붙잡는다']],
  ['동료의 부당한 단속','동료가 장터 상인에게 정해지지 않은 돈을 요구한다.',
   ['상인에게 거둔 액수와 명목을 확인해 상관에게 보고한다','상인의 말을 직접 듣고 동료와 따로 이야기한다','동료의 요구를 묵인하고 일을 빨리 끝낸다']],
  ['밤중의 순라','밤길에 고함이 들렸다. 사람을 해치지 않으면서 위험한 일을 멈춰야 한다.',
   ['동료를 부르고 길목을 확인한다','다친 사람이 있는지 먼저 살핀다','혼자 달려가 범인을 붙잡으려 한다']]
 ]},
 potter:{name:'도공',years:[1392,1894],region:null,keywords:/도공|도자기|가마/,tasks:[
  ['가마의 온도','구워 낸 그릇에 금이 갔다. 흙과 땔감이 부족해 다시 굽는 일이 부담스럽다.',
   ['가마의 불길과 깨진 그릇의 위치를 적어 둔다','동료와 가마를 보수한 뒤 다시 굽는다','일부 금이 간 그릇을 값이 낮은 물건으로 판다']],
  ['관아의 주문','정해진 날까지 그릇을 납품하라는 사람이 왔다.',
   ['만들 수 있는 수량과 기한을 먼저 확인한다','다른 도공과 가마와 일손을 나눈다','지나치게 많은 주문도 모두 맡겠다고 한다']],
  ['새로운 흙을 구하다','기존에 쓰던 흙이 부족해 먼 곳에서 흙을 가져와야 한다.',
   ['작은 그릇에 새 흙을 시험해 본다','동료 도공에게 흙의 성질을 묻는다','검증 없이 한 가마를 모두 채워 굽는다']]
 ]},
 carpenter:{name:'목수',years:[1392,1894],region:null,keywords:/목수|집짓기|대목|소목/,tasks:[
  ['휘어진 들보','집을 고치던 중 들보가 예상보다 크게 휘어 있었다.',
   ['집주인에게 위험을 알리고 새 목재를 구한다','다른 목수에게 구조를 함께 살펴 달라 한다','일정을 맞추려 손질하지 않은 들보를 그대로 쓴다']],
  ['배를 고칠 사람','포구의 낡은 배를 수리해 달라는 청이 들어왔다.',
   ['배의 판자와 이음매부터 확인한다','뱃사공과 수리 비용·기한을 정한다','다른 목수와 나누어 공사를 맡는다']],
  ['제자에게 맡기는 일','배우는 사람이 대패질을 혼자 해 보겠다고 한다.',
   ['쉬운 널빤지부터 가르친다','날이 선 도구를 다루는 법을 먼저 알려 준다','완성된 부분을 함께 살펴 잘못 깎은 곳을 고친다']]
 ]},
 lacquer:{name:'나전칠기 장인',years:[1600,1894],region:null,keywords:/나전|칠장|옻칠|자개/,tasks:[
  ['자개가 모자란 날','주문받은 함의 무늬를 채우기에는 자개가 부족하다.',
   ['무늬를 줄여 의뢰인에게 먼저 설명한다','공방과 재료를 나눠 쓸 길을 묻는다','값싼 재료를 좋은 자개라고 속여 납품한다']],
  ['마르지 않는 옻칠','날씨 탓에 칠이 고르게 마르지 않았다.',
   ['건조 장소와 작업 시간을 바꿔 본다','서두르지 않고 칠을 다시 바른다','마르기 전에 다음 무늬를 얹어 버린다']],
  ['멀리서 들어온 의뢰','다른 고을 상인이 자개 장식 함을 주문했다.',
   ['값과 납기일을 종이에 적어 서로 확인한다','주문을 여럿이 나누고 솜씨를 맞춘다','보증금을 받지 않고 무리한 수량을 약속한다']]
 ]},
 painter:{name:'화공·민화 화가',years:[1700,1894],region:null,keywords:/화공|민화|그림|화원/,tasks:[
  ['그림을 부탁한 집','혼례를 앞둔 집에서 방에 걸 그림을 부탁했다.',
   ['그림의 크기와 받을 재료값을 먼저 정한다','집안에서 바라는 무늬와 색을 듣는다','준비한 물감을 모두 써서 큰 그림부터 그린다']],
  ['색이 바랜 그림','의뢰인이 그린 지 오래되지 않은 그림의 색이 바랐다고 항의한다.',
   ['사용한 물감과 보관한 곳을 함께 확인한다','새 물감을 구해 고쳐 주기로 약속한다','잘못이 없다고 주장하며 아무것도 살피지 않는다']],
  ['장터에서 그림을 팔다','장터에 놓은 그림을 보는 사람은 많지만 값은 좀처럼 정해지지 않는다.',
   ['작은 그림을 여러 장 내어 본다','그림의 쓰임새를 묻고 주문을 받는다','다른 화공에게 물감과 종이 값을 묻는다']]
 ]},
 poet:{name:'시인·서화가',years:[1600,1894],region:null,keywords:/시인|서화|시회|시문|글을 쓰/,tasks:[
  ['마을의 시회','함께 글을 읽는 사람들이 시를 지어 보자고 청한다.',
   ['직접 겪은 고을의 일을 시로 쓴다','다른 사람의 글을 듣고 고쳐 쓴다','후원자를 찾기 위해 글을 모아 보인다']],
  ['글의 값을 묻는 사람','편지나 글씨를 부탁하는 사람이 종이와 품삯을 이야기한다.',
   ['원고와 글씨의 분량을 정하고 값을 상의한다','글을 잘 모르는 이웃의 편지를 대신 적는다','돈을 더 준다는 사람에게 사실과 다른 찬사를 써 준다']],
  ['멀리 퍼진 문장','전에 쓴 글이 다른 고을에서 돌아왔다는 말을 들었다.',
   ['누가 어떤 글을 전했는지 확인한다','빠진 대목을 다시 옮겨 적는다','글을 함께 읽을 사람을 찾아본다']]
 ]},
 performer:{name:'유랑 예인',years:[1550,1894],region:null,keywords:/각설이|유랑 예인|광대|풍물|재담/,tasks:[
  ['장날의 공연','고을 장터에 사람들이 모였지만 공연 자리를 쉽게 내주지 않는다.',
   ['장사하는 사람에게 방해되지 않는 자리를 청한다','동료와 소리와 재담을 나누어 공연한다','허락을 묻지 않고 길목을 막아 공연한다']],
  ['함께 길을 떠날 사람','다음 장터로 가자는 동료가 있지만 길을 모른다.',
   ['길과 주막을 알아본 뒤 함께 떠난다','이번 장날의 번 돈을 먼저 나누어 준다','밤중에 혼자 산길로 지름길을 택한다']],
  ['비가 오는 공연날','비에 옷과 악기가 젖어 공연하기 어려워졌다.',
   ['젖은 물건을 말리고 다음 장날을 기다린다','비를 피할 집을 찾아 짧게 공연한다','악기가 망가져도 공연을 강행한다']]
 ]}
});
const ANY_JOB=Object.keys(JOBS);
const severe=l=>l.joseon14?.captivity?.status==='held'||l.travel22?.residence?.abroad;
const oldEra=l=>l?.alive&&J?.isJoseon(l)&&J.inOldEra(l)&&l.year>=1392&&l.year<=1894&&!severe(l);
const eligibleClass=l=>{const s=V5.ensure(l);return !s.monastic&&!['왕실 종친'].includes(s.origin)&&!(['사노비','공노비'].includes(s.origin)&&!s.freed);};
const debt=l=>{const v18=l.year>=1800&&l.year<=1869?V18?.ensure(l):null;
 return {tax:V11?.ensure(l)?.taxDebt||0,grain:v18?.grainDebt||0,cash:Math.max(0,-J.ensure(l).capital),food:V2.ensure(l).grain};};
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.joseon325)l.joseon325={version:1,processedYear:l.year,stage:'home',residence:'고향',
  originalRegion:null,politics:{faction:'',risk:0,stage:'none',due:0},trade:{kind:'none',due:0,risk:0},
  law:{kind:'free',until:0,formerJob:'',formerRole:'',formerOffice:false,place:''},
  career:null,seen:[],queue:[],active:null,decisions:[],stories:[],lastOffer:-1,hardshipOffer:-1};
 return l.joseon325;
}
function record(l,s,msg,kind='joseon325-life'){
 l.logEvent(msg,kind);s.stories.push({year:l.year,text:msg.slice(0,230)});
 s.stories=s.stories.slice(-60);
}
function setJob(l,name){const j=J.ensure(l),soc=V5.ensure(l);
 j.occupation=name;soc.role=name;l.career=name;if(l.money)l.money.netWorth=j.capital*100;
}
function canDebt(l,s){const d=debt(l);
 return oldEra(l)&&l.year>=1800&&l.year<=1869&&l.age>=18&&l.age<=72&&s.stage==='home'&&
  s.law.kind==='free'&&s.hardshipOffer<l.year-7&&
  ((d.tax>=9||d.grain>=9)||(d.cash>=35&&d.food<9));}
function canPolitics(l,s){const j=J.ensure(l),social=V5.ensure(l);
 return oldEra(l)&&l.year>=1575&&l.year<=1863&&l.age>=24&&l.age<=70&&
  s.law.kind==='free'&&s.politics.stage==='none'&&j.office&&social.rank>=1;}
function canTrade(l,s){const v=V5.ensure(l),j=J.ensure(l);
 return oldEra(l)&&l.year>=1611&&l.year<=1876&&j.region==='경상도'&&l.age>=18&&l.age<=68&&
  s.law.kind==='free'&&s.trade.kind==='none'&&
  /역관|서리|상인|보부상|주막/.test([v.origin,v.role,j.occupation].join(' '));}
function eligibleJobs(l){if(!oldEra(l)||l.age<16||l.age>63||!eligibleClass(l))return [];
 const s=ensure(l),origin=V5.ensure(l).origin,job=J.ensure(l).occupation;
 return ANY_JOB.filter(code=>{
  const c=JOBS[code];
  if(l.year<c.years[0]||l.year>c.years[1]||s.law.kind!=='free')return false;
  if(code==='potter')return /도공|관청 장인/.test(origin+' '+job);
  if(code==='carpenter')return /목수|관청 장인/.test(origin+' '+job);
  if(code==='constable')return l.gender==='남자'&&/무반|수군|서리|포졸|군교/.test(origin+' '+job);
  if(code==='lacquer')return /도공|목수|관청 장인|대장장이|상인/.test(origin+' '+job);
  if(code==='painter')return /양반|장인|목수|도공|상인/.test(origin+' '+job)||l.stats.knowledge>=57;
  if(code==='poet')return l.stats.knowledge>=57&&/양반|서리|역관|상인|목수/.test(origin+' '+job);
  if(code==='performer')return /상인|보부상|주막|소작|몰락|품팔/.test(origin+' '+job);
  return false;
 });
}
function autoCareer(l,s){
 if(s.career||!oldEra(l)||l.age<17||s.law.kind!=='free')return;
 const job=J.ensure(l).occupation+' '+V5.ensure(l).role;
 const code=ANY_JOB.find(k=>JOBS[k].keywords.test(job));
 if(code&&eligibleJobs(l).includes(code))s.career={code,started:l.year,skill:3,reputation:12,materials:5,workIndex:0};
}
function startCareer(l,s,code){
 if(!eligibleJobs(l).includes(code))return false;
 s.career={code,started:l.year,skill:1,reputation:7,materials:4,workIndex:0};
 setJob(l,JOBS[code].name+'의 일을 배우는 사람');
 record(l,s,JOBS[code].name+'의 일을 배우기 시작했다. 만드는 물건과 만나게 될 사람이 이전과 달라졌다.');
 return true;
}
function queue(l,s,key){
 // Repeatable work assignments, a later debt crisis or a second prison release
 // are new years of the same life, not forever-blocked by one old event key.
 const repeatable=['careerTask','hardship','release'].includes(key);
 if((!repeatable&&s.seen.includes(key))||s.queue.includes(key)||s.active===key)return false;
 s.queue.push(key);s.queue=s.queue.slice(-12);s.seen.push(key);s.seen=s.seen.slice(-80);return true;
}
function plans(l,s){
 const d=debt(l),job=s.career&&JOBS[s.career.code],j=J.ensure(l);
 const map={
 hardship:{title:'갚지 못한 곡식과 관아의 독촉',
  description:'곳간에 '+d.food+'만큼 남아 있고 장부에 갚을 몫이 적혀 있다. 관아에 남은 환곡·세금의 기록을 확인하더라도 즉시 면제되는 것은 아니다. 식구들이 어떻게 살아갈지 정해야 한다.',
  choices:[
   ['남은 납부 기록을 모아 관아에 다시 따진다','마을의 증언과 장부를 맞춘다. 독촉이 당장 끝날지는 알 수 없다.'],
   ['다른 고을로 떠나 품팔이로 생계를 잇는다','살던 집과 오래된 이웃을 떠나 일거리를 구한다. 빚은 저절로 없어지지 않는다.'],
   ['산골로 옮겨 밭을 일구며 살아간다','화전 경작에는 개간할 일손과 씨앗이 필요하고, 산림 이용을 둘러싼 규제나 갈등도 있다.']
  ]},
 forest:{title:'산골에 자리 잡은 뒤',
  description:'고향을 떠나 산지에서 일한 지 여러 해가 되었다. 경작할 땅과 먹을 것을 얻는 일은 쉽지 않다. 고향의 빚은 사라지지 않았다.',
  choices:[
   ['산골 주민과 물길과 밭 경계를 상의한다','이웃의 토지와 산림을 침범하지 않게 경작할 자리를 살핀다.'],
   ['장터에서 품을 팔아 곡식과 씨앗을 구한다','화전의 수확만으로 버티기 어려워 길을 나선다.'],
   ['산길에서 약탈을 일삼는 무리를 따라간다','먹을 것은 구할지 몰라도 남의 물건을 빼앗는 범죄에 가담한다. 체포와 처벌 위험이 생긴다.']
  ]},
 outlaw:{title:'산길에서 범한 죄가 드러나다',
  description:'함께 다니던 무리의 약탈 소식에 관아의 수색이 시작됐다. 강도에 가담한 사실은 살아남기 위한 사정과 별개로 책임을 물을 수 있다.',
  choices:[
   ['무리에서 벗어나 관아에 사실을 말한다','자신이 한 일과 다른 사람의 일을 구분해 설명한다. 형벌을 면한다는 보장은 없다.'],
   ['빼앗은 물건을 돌려주고 피해자에게 사정을 전한다','피해를 일부 돌려놓더라도 처벌이 사라지지는 않는다.'],
   ['다른 산길로 도망가며 수색을 피하려 한다','잡히지 않을 수 있지만 도주와 약탈 혐의가 겹쳐 위험이 커진다.']
  ]},
 politics:{title:'조정에 올릴 글과 정국의 움직임',
  description:'붕당과 정국의 갈등 속에 상소를 올릴지 고민한다. 어느 편을 들든 임금과 대신의 반응은 시대와 정국에 달려 있다.',
  choices:[
   ['담당한 업무의 잘못을 적어 공식 상소를 올린다','장부와 증언을 갖추어 정책이나 인사의 문제를 지적한다. 상소 자체가 죄는 아니다.'],
   ['뜻을 같이하는 동료 대신과 상소 내용을 의논한다','동료와 함께 움직일 수 있지만 정국이 바뀌면 정치적 책임도 함께 질 수 있다.'],
   ['정쟁과 거리를 두고 맡은 관직의 일을 정리한다','직접 다툼에는 나서지 않지만 관직의 책임은 남아 있다.']
  ]},
 fallout:{title:'정국이 바뀐 뒤 관직에 닥친 일',
  description:'이전에 냈던 의견과 누구와 가까웠는지가 다시 거론된다. 상소만으로 처벌받는 것은 아니며 당시 정파 갈등과 별도 혐의의 조사 여부가 중요하다.',
  choices:[
   ['관직에서 물러나 향리에서 가족과 지낸다','자리를 내려놓지만 바로 유배나 사사가 되는 것은 아니다.'],
   ['지난 상소의 근거와 경위를 정리해 조사에 응한다','혐의가 무엇인지 확인한다. 조사에서 사정이 받아들여질지는 알 수 없다.'],
   ['정적을 더 강하게 공격하는 글을 올린다','새로운 정치적 갈등을 만들 수 있다. 중대한 혐의가 붙으면 파직이나 유배의 위험이 커진다.']
  ]},
 trial:{title:'정치적 혐의에 대한 최종 처분',
  description:'정국의 변화 뒤 직무와 글에 관한 혐의가 조정에서 문제 됐다. 실제 죄목에 따라 파직·유배·더 무거운 처벌의 가능성이 달라진다.',
  choices:[
   ['남아 있는 문서와 증언으로 억울함을 해명한다','임금의 판단과 증언에 따라 면책·파직·유배가 나뉠 수 있다.'],
   ['관직에서 물러나 향리로 돌아가겠다고 청한다','스스로 물러나려는 뜻이 받아들여져도 처분을 결정하는 것은 조정이다.'],
   ['조사 명령을 거부하고 정국을 비난한다','사안이 심해지면 형량에 영향을 줄 수 있다. 선택 하나로 사약을 받는 것은 아니다.']
  ]},
 commerce:{title:'왜관을 통한 거래와 금지된 물품',
  description:'부산 왜관과 주변 장터에서는 허가된 사무역도 이루어진다. 모든 개인 거래가 밀수는 아니다. 허가 조건과 출입 제한을 살펴야 한다.',
  choices:[
   ['허가된 거래 물품과 장부를 확인해 장사한다','정당한 사무역을 택한다. 큰 이익이 보장되지는 않는다.'],
   ['물품을 몰래 넘겨 허가받지 않은 거래를 시도한다','단속을 피해 이익을 노리지만 몰수·벌금·구금 위험이 생긴다.'],
   ['직접 거래하지 않고 통역과 운송 일을 맡는다','적은 품삯을 받을 수 있지만 거래 위반에 관여하지 않는다.']
  ]},
 inquiry:{title:'금지된 거래의 물품이 드러나다',
  description:'지난 거래에서 허가받지 않은 물품이 오간 사실을 관아가 조사한다. 물품의 종류·규모·증거에 따라 처분은 달라질 수 있다.',
  choices:[
   ['거래 장부와 남아 있는 물품을 제출한다','조사를 받으면서도 실제 거래 규모를 확인할 근거를 낸다.'],
   ['압류된 물품을 돌려받기 위해 관리를 매수하려 한다','뇌물을 주는 행위 자체가 또 다른 위법 행위가 될 수 있다.'],
   ['물품을 숨기고 거래 사실을 부인한다','당장의 손실을 막으려 하지만 발각되면 처분이 무거워질 수 있다.']
  ]},
 release:{title:s.law.kind==='exile'?'유배지에서 사면 소식을 기다리다':'구금과 옥살이를 마치다',
  description:s.law.kind==='exile'?'다른 고을에 머물며 글과 생계를 이어 왔다. 처분 기한이 지나거나 사면을 받더라도 관직 복귀는 별도 문제다.':'조사를 거쳐 정해진 구금 기간이 지났다. 물건을 돌려받거나 원래 생업을 다시 찾는 일은 남았다.',
  choices:[
   ['고향의 가족과 인편으로 연락해 돌아갈 길을 구한다','살림과 이동 비용을 다시 마련한다.'],
   ['머물던 곳에서 배운 일로 새로운 생업을 찾아본다','예전의 지위가 저절로 회복되는 것은 아니다.'],
   ['남아 있는 서류를 확인하고 복권이나 처분 시정을 청한다','확인할 근거가 있어야 한다. 과거 처분의 취소는 보장되지 않는다.']
  ]},
 careerEntry:{title:'지금의 생업 말고 다른 일을 배울 기회',
  description:'고을에서 먹고살 길을 다시 찾는다. 처음부터 장인이나 포졸이 되는 것은 아니며 도구와 경험을 쌓아야 한다.',
  choices:(()=>{const o=eligibleJobs(l);const picks=o.filter(x=>x!==s.career?.code).slice(0,2);
   if(!picks.length)return[];
   return [...picks.map(code=>[''+JOBS[code].name+'의 일을 배우러 간다',JOBS[code].name+'에게 일을 배우고 도구를 익힐 길을 찾아본다.']),
    ['지금의 생업을 계속 이어 간다','새 기술을 익히는 데에도 시간이 든다. 당장은 하던 일을 지킨다.']].slice(0,3);
  })()}
 };
 if(job&&s.career.workIndex<job.tasks.length){
  const task=job.tasks[s.career.workIndex];
  map.careerTask={title:job.name+' — '+task[0],description:task[1],choices:task[2].map((x,i)=>[
   x,[
    '어떤 물건을 어떻게 다루었는지 적고 다음 작업에 활용한다. 몸과 재료의 부담은 남을 수 있다.',
    '동료와 상의하거나 재료를 더 사용한다. 혼자 할 때보다 비용과 일손의 대가가 따른다.',
    '그 방법을 택하면 급한 문제를 넘길 수도 있지만 평판과 물건을 잃을 위험이 있다.'
   ][i]])};
 }
 return map;
}
function makePrompt(l,key){const s=ensure(l),p=plans(l,s)[key];if(!p||p.choices.length!==3)return null;
 return {title:p.title,description:p.description,options:p.choices.map(([label,note])=>({label,note,action:label}))};}
function promote(l){const s=ensure(l);if(!s||l.pending||s.active||!oldEra(l)||s.law.kind!=='free')return false;
 while(s.queue.length){
  const key=s.queue.shift();if(!makePrompt(l,key))continue;
  s.active=key;l.pending='joseon325:'+key;return true;
 }return false;
}
function lockup(l,s,kind,years,place){
 const j=J.ensure(l),social=V5.ensure(l);
 if(s.law.kind!=='free')return false;
 s.law={kind,until:l.year+years,formerJob:j.occupation,formerRole:social.role,
  formerOffice:j.office,place,formerRegion:j.region};
 if(kind==='exile'){j.office=false;j.region=place;setJob(l,'유배지에서 글과 살림을 꾸리는 사람');}
 else setJob(l,'옥에 갇힌 사람');
 record(l,s,kind==='exile'?place+'로 유배되어 벼슬과 고향에서 떨어져 살게 되었다.':
  '조사와 판결 끝에 옥살이를 하게 되었다. 원래 생업을 계속할 수 없었다.');
 return true;
}
function yearly(l){
 const s=ensure(l);if(!s||!oldEra(l)||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 if(s.law.kind!=='free'){
  if(l.year>=s.law.until)queue(l,s,'release');
  return;
 }
 autoCareer(l,s);
 if(s.stage==='forest'&&l.year>=s.stageDue&&s.stageDue)queue(l,s,'forest');
 if(s.stage==='outlaw'&&l.year>=s.stageDue&&s.stageDue)queue(l,s,'outlaw');
 if(s.politics.stage==='petition'&&l.year>=s.politics.due){s.politics.stage='fallout';queue(l,s,'fallout');}
 if(s.politics.stage==='trial'&&l.year>=s.politics.due)queue(l,s,'trial');
 if(s.trade.kind==='risk'&&l.year>=s.trade.due)queue(l,s,'inquiry');
 if(s.career&&s.career.workIndex<JOBS[s.career.code].tasks.length&&
    l.year>=s.career.started+2+s.career.workIndex*4)queue(l,s,'careerTask');
 if(canDebt(l,s)&&l.year%3===0)queue(l,s,'hardship');
 if(canPolitics(l,s)&&l.year%7===3&&roll(l.seed,l.year*19+71)<.18)queue(l,s,'politics');
 if(canTrade(l,s)&&l.year%6===1&&roll(l.seed,l.year*29+19)<.24)queue(l,s,'commerce');
 if(!s.career&&l.age>=19&&l.age<=49&&l.age%8===3&&eligibleJobs(l).length>=2&&
   roll(l.seed,l.year*27+37)<.20)queue(l,s,'careerEntry');
 promote(l);
}
function resolve(l,index){
 const s=ensure(l),key=s?.active,plan=key&&makePrompt(l,key);
 if(!s||!plan||!Number.isInteger(index)||index<0||index>2||!l.alive)return false;
 const j=J.ensure(l),v=V2.ensure(l),soc=V5.ensure(l);
 const cash=(x)=>{j.capital=clamp(j.capital+x,-120,600);
  if(l.money)l.money.netWorth=j.capital*100;};
 const choice=plan.options[index].label,oldYear=l.year;
 if(key==='hardship'){
  s.hardshipOffer=l.year;
  if(index===0){l.change({knowledge:2,health:-1});record(l,s,'환곡 납부 증빙을 모아 관아에 냈지만, 독촉은 당장 끝나지 않았다.');}
  if(index===1){
   s.stage='wanderer';s.residence='다른 고을';s.originalRegion=j.region;
   j.region=j.region==='강원도'?'경상도':'강원도';j.land=0;cash(-9);j.relocations++;
   setJob(l,'떠돌며 품을 파는 사람');record(l,s,'빚을 갚지 못한 채 다른 고을로 떠났다. 살아갈 터전은 바뀌었지만 옛 빚은 여전히 남았다.');
  }
  if(index===2){
   s.stage='forest';s.stageDue=l.year+3;s.residence='산골 화전';
   s.originalRegion=j.region;j.region='강원도';j.land=0;cash(-10);j.relocations++;
   setJob(l,'산골에서 화전을 일구는 사람');
   record(l,s,'고향을 떠나 산골의 경작지를 찾았다. 빚은 남았고 씨앗과 일손을 새로 마련해야 한다.');
  }
 }else if(key==='forest'){
  s.stageDue=0;
  if(index===0){j.land=Math.max(1,j.land);cash(-3);record(l,s,'산골 이웃과 경작지의 경계와 물길을 상의한 뒤 작은 땅을 일구기 시작했다.');}
  if(index===1){cash(5);l.change({health:-3});record(l,s,'장터의 품삯을 받아 곡식과 씨앗을 마련했다.');}
  if(index===2){s.stage='outlaw';s.stageDue=l.year+2;cash(8);
   record(l,s,'산길에서 물건을 빼앗는 무리를 따라갔다. 이익을 얻었지만 관아의 수색과 처벌 위험을 떠안았다.');}
 }else if(key==='outlaw'){
  s.stageDue=0;s.stage='wanderer';
  const caught=roll(l.seed,l.year*7+index*53+177)<[.46,.38,.72][index];
  if(index===1)cash(-Math.min(12,Math.max(0,j.capital)));
  if(caught){cash(-12);lockup(l,s,'prison',index===2?3:1,'고을 옥');}
  else record(l,s,'산길의 범죄 무리에서 벗어나 다른 생업을 찾아 나섰다. 지난 피해를 없었던 일로 만들 수는 없다.');
 }else if(key==='politics'){
  s.politics={faction:index===1?'뜻을 같이한 관료들':index===0?'상소를 낸 관료들':'관직에 남은 사람',
   stage:'petition',risk:index===0?2:index===1?3:0,due:l.year+2};
  record(l,s,index===2?'정쟁에서 거리를 두고 업무를 이어 갔다.':'근거를 갖춘 상소와 정치적 입장을 남겼다. 정국이 바뀌면 다시 문제 될 수 있었다.');
 }else if(key==='fallout'){
  if(index===0){j.office=false;setJob(l,'향리에서 살림을 꾸리는 전직 관리');
   s.politics.stage='retired';record(l,s,'정국이 바뀌자 스스로 벼슬을 내려놓고 고향에서 지내게 됐다.');}
  else {s.politics.stage='trial';s.politics.risk+=index===2?3:0;s.politics.due=l.year+1;
   record(l,s,'지난 상소의 경위와 담당 업무를 둘러싼 조사가 이어졌다.');}
 }else if(key==='trial'){
  const danger=s.politics.risk,convicted=roll(l.seed,l.year*97+index*17+21)<
   clamp(.12+danger*.075+(index===2?.20:0)-(index===0?.08:0),.03,.81);
  s.politics.stage='judged';
  if(!convicted){if(index===1){j.office=false;setJob(l,'향리로 돌아간 전직 관리');}
   record(l,s,'조사 뒤 무거운 처벌을 피했지만 정국과 관직의 앞날은 아직 불확실했다.');}
  else if(danger>=5&&l.year>=1590&&l.year<=1720&&index===2&&
     roll(l.seed,l.year*31+809)<.016){
   record(l,s,'여러 혐의에 대한 최종 처분이 사사로 내려졌다. 한 번의 상소만으로 내려진 처분은 아니었다.');
   l.finish('정국 속 중대한 혐의에 대한 사사 명령으로 생을 마쳤다.');
  }else{lockup(l,s,'exile',2+Math.floor(roll(l.seed,l.year*71+3)*4),
      ['제주도','함경도','평안도','강원도'][Math.floor(roll(l.seed,l.year*29+99)*4)]);}
 }else if(key==='commerce'){
  if(index===0){cash(3);s.trade.kind='licensed';record(l,s,'허가된 사무역의 장부를 확인하고 물품을 거래했다. 큰돈이 늘 보장되지는 않았다.');}
  if(index===1){cash(10);s.trade={kind:'risk',due:l.year+1,risk:2};record(l,s,'허가받지 않은 물품을 몰래 넘겼다. 얻은 돈과 별개로 단속에 걸릴 위험이 남았다.');}
  if(index===2){cash(2);s.trade.kind='service';record(l,s,'거래 물품 대신 운송과 통역 일을 도와 품삯을 받았다.');}
 }else if(key==='inquiry'){
  s.trade.kind='judged';const evidence=roll(l.seed,l.year*67+index*179+13),
   convicted=evidence<[.30,.61,.69][index];
  if(index===1)cash(-5);
  if(convicted){const loss=Math.min(Math.max(0,j.capital),index===1?22:14);
   cash(-loss);record(l,s,'무역 규정을 어긴 물품의 일부를 압류당하고 벌금을 물었다. 집안의 모든 재산이 자동으로 몰수되지는 않았다.');
   if(roll(l.seed,l.year*117+index*41+12)<(index===1?.52:.24))
     lockup(l,s,'prison',1+Math.floor(roll(l.seed,l.year*19+7)*2),'동래부 옥');
  }else record(l,s,'허가와 물품을 둘러싼 조사를 받았지만 이번에는 구금을 면했다. 위법 거래의 위험이 사라진 것은 아니다.');
 }else if(key==='release'){
  const law={...s.law};
  s.law={kind:'free',until:0,formerJob:'',formerRole:'',formerOffice:false,place:''};
  if(law.kind==='exile'){j.region=index===1?law.place:(law.formerRegion||s.originalRegion||j.region);
   j.office=false;setJob(l,index===1?'유배지에서 익힌 일로 사는 사람':'향리에서 살아가는 전직 관리');}
  else setJob(l,index===1?'머물던 고을에서 새 일을 찾는 사람':law.formerJob||'다시 생업을 찾는 사람');
  if(index===2){l.change({knowledge:2});record(l,s,'처분과 관련된 옛 문서를 모아 시정을 청했지만 복권이 확정된 것은 아니었다.');}
  else record(l,s,'구금이나 유배가 끝난 뒤 삶의 터전을 다시 정했다. 관직과 재산이 저절로 회복된 것은 아니었다.');
 }else if(key==='careerEntry'){
  const candidates=eligibleJobs(l).filter(c=>c!==s.career?.code).slice(0,2);
  if(index<candidates.length)startCareer(l,s,candidates[index]);
  else record(l,s,'새 일자리를 알아봤지만 지금 맡은 생업을 계속했다.');
 }else if(key==='careerTask'){
  const w=s.career;
  if(!w||!JOBS[w.code])return false;
  const chance=[.10,.20,.47][index],bad=roll(l.seed,l.year*83+w.workIndex*23+index*29)<chance;
  const rawGain=index===0?2:index===1?3:bad?-8:5;
  const materialCost=index===1?2:index===2?3:1;
  if(w.materials<materialCost){
   // No work may be sold using materials that do not exist.
   if(j.capital>=3){cash(-3);w.materials=clamp(w.materials+2,0,40);
    record(l,s,'재료가 부족해 이번 일거리를 마치지 못했다. 번 돈 대신 재료를 사 두었다.');}
   else{l.change({health:-2});record(l,s,'재료를 살 돈도 모자라 다른 집의 품일을 도우며 다시 일감을 기다렸다.');}
   w.workIndex++;s.active=null;l.pending=null;s.decisions.push({key,year:oldYear,index,label:choice});
   s.decisions=s.decisions.slice(-65);if(l.alive)promote(l);return true;
  }
  w.materials-=materialCost;
  cash(bad?-7:rawGain);l.change({knowledge:index===0?2:1,health:index===2?-3:-1});
  w.skill=clamp(w.skill+(bad?0:index===0?3:2),0,100);
  w.reputation=clamp(w.reputation+(bad?-6:index===0?2:3),0,100);
  const title=JOBS[w.code].tasks[w.workIndex][0];
  w.workIndex++;
  if(w.skill>=8&&J.ensure(l).occupation.includes('배우는 사람'))setJob(l,JOBS[w.code].name);
  record(l,s,bad?title+' 일을 서두르다 물건이나 신뢰를 잃었다. 다시 일감을 구해야 한다.':
   title+' 일을 마치며 솜씨와 거래 경험을 쌓았다. 항상 같은 값을 받지는 않는다.');
 }else return false;
 s.active=null;l.pending=null;
 s.decisions.push({key,year:oldYear,index,label:choice});s.decisions=s.decisions.slice(-65);
 l.logEvent(plan.title+' — '+choice,'joseon325-choice');l.log.at(-1).causeId='joseon325:'+oldYear+'-'+key;
 if(l.alive&&s.law.kind==='free')promote(l);
 return true;
}
function detainedTick(l){
 if(!l.alive||l.pending)return false;
 const s=ensure(l),previous=l.year,last=l.log.length;
 const ok=Sim.advanceCoreYear(l);
 if(!ok||l.year===previous)return ok;
 l.log=l.log.filter((x,i)=>i<last||x.kind==='death');
 if(l.pending)l.pending=null;
 if(l.alive){
  const msg=s.law.kind==='exile'?'유배지에서 글과 일손으로 생활을 이어 갔다. 고향과의 왕래는 자유롭지 않았다.':'옥 안에서 수감 생활을 이어 갔다. 바깥의 생업을 직접 돌볼 수 없었다.';
  if(l.year%2===0)record(l,s,msg);
  if(l.year>=s.law.until)queue(l,s,'release');
  promoteLegal(l,s);
 }
 return ok;
}
function promoteLegal(l,s){if(l.pending||s.active||!l.alive)return;
 if(s.queue.includes('release')&&s.law.kind!=='free'){
  s.queue=s.queue.filter(x=>x!=='release');s.active='release';l.pending='joseon325:release';
 }}
function summary(l){
 const s=ensure(l);if(!s)return null;
 return {stage:s.stage,residence:s.residence,law:{kind:s.law.kind,until:s.law.until,place:s.law.place},
  profession:s.career?{name:JOBS[s.career.code]?.name,skill:s.career.skill,reputation:s.career.reputation,materials:s.career.materials}:null,
  politics:s.politics.stage,trade:s.trade.kind,recent:s.stories.slice(-5),decisions:s.decisions.length};
}
function hydrate(l,data){
 const s=ensure(l),old=data?.joseon325;if(!s||!old||old.version!==1)return s;
 s.stage=['home','wanderer','forest','outlaw'].includes(old.stage)?old.stage:'home';
 s.residence=String(old.residence||'고향').slice(0,28);
 s.originalRegion=typeof old.originalRegion==='string'?old.originalRegion:null;
 s.stageDue=Number.isInteger(old.stageDue)?clamp(old.stageDue,0,l.year+10):0;
 const o=old.politics||{},t=old.trade||{},law=old.law||{};
 s.politics={stage:['none','petition','fallout','trial','retired','judged'].includes(o.stage)?o.stage:'none',
  faction:String(o.faction||'').slice(0,50),risk:clamp(Number(o.risk)||0,0,20),
  due:clamp(Number(o.due)||0,0,l.year+10)};
 s.trade={kind:['none','licensed','service','risk','judged'].includes(t.kind)?t.kind:'none',
  due:clamp(Number(t.due)||0,0,l.year+10),risk:clamp(Number(t.risk)||0,0,10)};
 s.law={kind:['free','prison','exile'].includes(law.kind)?law.kind:'free',
  until:clamp(Number(law.until)||0,0,l.year+20),place:String(law.place||'').slice(0,40),
  formerJob:String(law.formerJob||'').slice(0,60),formerRole:String(law.formerRole||'').slice(0,60),
  formerOffice:law.formerOffice===true,formerRegion:typeof law.formerRegion==='string'?law.formerRegion:null};
 if(old.career&&JOBS[old.career.code]&&old.career.started<=l.year){
  const w=old.career;
  s.career={code:w.code,started:Math.max(l.birthYear,Number(w.started)||l.year),
   skill:clamp(Number(w.skill)||0,0,100),reputation:clamp(Number(w.reputation)||0,0,100),
   materials:clamp(Number(w.materials)||0,0,40),
   workIndex:clamp(Number(w.workIndex)||0,0,JOBS[w.code].tasks.length)};
 }
 s.seen=Array.isArray(old.seen)?old.seen.filter(x=>typeof x==='string').slice(-80):[];
 const allowed=['hardship','forest','outlaw','politics','fallout','trial','commerce','inquiry','release','careerEntry','careerTask'];
 s.queue=Array.isArray(old.queue)?old.queue.filter(x=>allowed.includes(x)).slice(-12):[];
 s.active=allowed.includes(old.active)&&data.pending==='joseon325:'+old.active?old.active:null;
 if(s.active)l.pending='joseon325:'+s.active;
 s.lastOffer=clamp(Number(old.lastOffer)||-1,-1,l.year);
 s.hardshipOffer=clamp(Number(old.hardshipOffer)||-1,-1,l.year);
 s.processedYear=clamp(Number(old.processedYear)||l.year,l.birthYear,l.year);
 s.decisions=Array.isArray(old.decisions)?old.decisions.filter(x=>x&&allowed.includes(x.key)&&x.year<=l.year).slice(-65):[];
 s.stories=Array.isArray(old.stories)?old.stories.filter(x=>x&&typeof x.text==='string'&&x.year<=l.year).slice(-60).map(x=>({year:x.year,text:x.text.slice(0,230)})):[];
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V5?.ensure||!Sim?.advanceCoreYear||Sim.Life.prototype.__joseon325)return false;
 const L=Sim.Life,oldTick=L.prototype.tick,oldChoice=L.prototype.choose,oldPrompt=L.prototype.getChoice,
  oldReflect=L.prototype.reflect,oldSnapshot=L.prototype.snapshot,oldRestore=L.restore;
 L.prototype.tick=function(){
  const s=ensure(this);
  if(s && s.law.kind!=='free')return detainedTick(this);
  const year=this.year,ok=oldTick.call(this);
  if(ok&&this.alive&&this.year!==year)yearly(this);
  return ok;
 };
 L.prototype.getChoice=function(){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseon325:'))
    return makePrompt(this,this.pending.slice('joseon325:'.length));
  return oldPrompt.call(this);
 };
 L.prototype.choose=function(index){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseon325:'))return resolve(this,index);
  const ok=oldChoice.call(this,index);
  if(ok&&oldEra(this))promote(this);
  return ok;
 };
 L.prototype.reflect=function(text){const ok=oldReflect.call(this,text);if(ok&&oldEra(this))promote(this);return ok;};
 L.prototype.snapshot=function(){const data=oldSnapshot.call(this);if(this.joseon325)data.joseon325=JSON.parse(JSON.stringify(this.joseon325));return data;};
 L.restore=function(data){const l=oldRestore.call(this,data);if(l&&data?.joseon325)hydrate(l,data);return l;};
 Object.defineProperty(L.prototype,'__joseon325',{value:true});return true;
}
install();
return Object.freeze({SOURCES,JOBS,ensure,summary,hydrate,eligibleJobs,canDebt,canPolitics,canTrade,
 startCareer,queue,promote,yearly,plans,makePrompt,resolve,lockup,install});
});
