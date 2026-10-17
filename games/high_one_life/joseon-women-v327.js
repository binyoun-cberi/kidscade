/* One Life Joseon women 3.27: conditional occupations, bereavement and documented household claims.
 * Historical institutions constrain entry; fictional individual success and yields are NOT statistical facts.
 * Existing v4 and v326 own spouse deaths, marriage, children and ordinary household paths. */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon4,
  root?.OneLifeJoseon5,root?.OneLifeJoseonWomen326);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseonWomen327=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V4,V5,W326){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const kinds=Object.freeze({
 midwife:{name:'마을에서 출산을 돕는 사람',group:'village',tasks:[
  ['해산을 앞둔 이웃','진통이 시작됐다는 소식이 왔다. 집안 식구들과 경험 많은 사람의 도움이 필요하다.',
   ['경험 많은 이를 불러 함께 돕는다','따뜻한 물과 깨끗한 베를 마련한다','가족에게 일손을 구하러 다닌다']],
  ['몸조리를 도울 사람','산모가 기운을 되찾기까지 곁에서 살필 사람이 부족하다.',
   ['가족이 교대로 돌보게 한다','먹을 것과 쉴 곳을 마련한다','이웃에게 일을 나누어 부탁한다']],
  ['다음 세대에게 전할 지혜','어린 사람이 마을의 출산 돌봄을 배우려 한다.',
   ['오랜 경험과 위험 신호를 이야기한다','배운 일을 함께 돌아본다','필요할 때 다른 사람을 부를 길을 알려 준다']]
 ]},
 uinyeo:{name:'관아의 의녀',group:'office',tasks:[
  ['의학과 약재를 익히는 나날','상처와 병을 살피는 방법을 배운다. 섣불리 약을 쓰면 해가 될 수도 있다.',
   ['의서와 스승의 설명을 다시 살핀다','약재의 이름과 보관법부터 익힌다','선배 의녀에게 판단을 구한다']],
  ['여성 환자를 살피다','여성 환자가 불편한 곳을 말하기 어려워한다.',
   ['환자의 이야기를 차분히 듣는다','맡은 범위를 넘어서는 일은 상관에게 보고한다','검증된 치료 방법을 다시 확인한다']],
  ['약재를 정리하는 날','관청에서 쓰는 약재의 장부와 실제 수량이 다르다.',
   ['기록을 다시 맞춰 보고한다','다른 의녀와 보관함을 살핀다','부족한 약재의 조달을 요청한다']]
 ]},
 palace:{name:'궁중에서 일하는 궁녀',group:'office',tasks:[
  ['바느질과 궁중의 일','정해진 때까지 의복과 침구를 손질해야 한다.',
   ['손상된 천부터 가려 낸다','동료와 남은 일을 나누어 맡는다','궁중의 예법과 작업 순서를 다시 익힌다']],
  ['밤이 늦도록 남은 일','궁중에서 맡은 일에 실수가 없어야 한다는 부담이 크다.',
   ['선배 궁녀에게 일을 확인한다','쉴 수 있는 시간과 순서를 상의한다','실수한 부분을 다시 고친다']],
  ['새로 들어온 궁녀','어린 궁녀가 궁중의 생활에 익숙하지 않다.',
   ['궁중 말을 차근히 알려 준다','맡은 일을 함께 살핀다','마음 둘 사람이 되어 준다']]
 ]},
 courtArtist:{name:'관아에 소속된 관기',group:'office',tasks:[
  ['소리와 춤의 연습','관아의 행사에 앞서 소리와 춤을 맞춰 보아야 한다.',
   ['동료와 박자를 다시 맞춘다','악기의 상태를 살핀다','선배에게 어려운 대목을 배운다']],
  ['행사에 동원된 날','관아의 요청을 따르면서도 몸과 연습 시간을 돌봐야 한다.',
   ['자신에게 맡겨진 순서를 확인한다','다른 예인과 일손을 나눈다','무리가 있는 일을 상관에게 알린다']],
  ['오래 익힌 곡조','젊은 예인이 낯선 곡조를 배우려 한다.',
   ['소리의 장단부터 알려 준다','여럿이 함께 연습한다','익힌 가락을 옮겨 적는다']]
 ]}
});
function roll(seed,salt){let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;}
function female(l){return !!(l&&l.alive&&J?.isJoseon(l)&&J.inOldEra(l)&&l.gender==='여자'&&l.year<=1894);}
function available(l){return female(l)&&l.joseon14?.captivity?.status!=='held'&&
 l.joseon325?.law?.kind!=='prison'&&l.joseon325?.law?.kind!=='exile'&&
 !l.travel22?.residence?.abroad;}
function family(l){const p=V4.summary(l).people,spouses=p.filter(x=>x.role==='spouse');
 return {living:spouses.some(x=>x.alive),bereaved:spouses.some(x=>!x.alive)&&!spouses.some(x=>x.alive),
  parentsLost:p.some(x=>['mother','father'].includes(x.role)&&!x.alive),children:p.filter(x=>x.role==='child'&&x.alive)};
}
function ensure(l){if(!J?.isJoseon(l)||l.gender!=='여자')return null;
 return l.joseonWomen327||(l.joseonWomen327={version:1,processedYear:l.year,active:null,queue:[],seen:[],
  profession:null,serviceBound:false,workDone:0,workAt:0,careerStart:0,skill:0,contacts:0,
  household:'',widowDue:0,remarriageDue:0,estateDue:0,estate:{status:'none',evidence:0,share:0},
  recent:[],decisions:[],followups:[]});
}
function note(l,s,text,kind='joseonWomen327-memory'){
 l.logEvent(text,kind);s.recent.push({year:l.year,text});s.recent=s.recent.slice(-24);
}
function money(l,n){const j=J.ensure(l);j.capital=clamp(j.capital+n,-120,600);
 if(l.money)l.money.netWorth=j.capital*100;}
function eligibleOffice(l){
 if(!female(l)||l.age<11||l.age>18||l.year<1406||l.year>=1894)return [];
 const soc=V5.ensure(l),f=family(l);
 if(f.living||soc.freed||soc.monastic||soc.origin!=='공노비'||W326?.summary(l)?.familyPath?.startsWith('사별'))return [];
 if(soc.publicOffice==='중앙 관서')return l.age<=14?['uinyeo','palace']:['palace'];
 if(soc.publicOffice==='지방 관아')return l.age>=13?['courtArtist']:[];
 return [];
}
function eligibleMidwife(l){const soc=V5.ensure(l),w=W326?.summary(l);
 return available(l)&&l.age>=23&&l.age<=48&&!soc.monastic&&
  !(['사노비','공노비'].includes(soc.origin)&&!soc.freed)&&
  (w?.care>=2||/의관/.test(soc.origin)||/약재|의술|돌봄/.test(J.ensure(l).occupation));}
function put(l,s,key){if(s.queue.includes(key)||s.active===key)return false;
 s.queue.push(key);s.queue=s.queue.slice(-8);return true;}
function offer(l,key){
 const s=ensure(l),f=family(l),jobs=eligibleOffice(l),p=s.profession?kinds[s.profession]:null;
 if(key==='entry'&&jobs.length){
  const labels=jobs.map(k=>kinds[k].name);
  return {title:'관청의 여성 일꾼을 뽑는다는 소식',description:'관아에서 소속된 여인 가운데 일을 맡길 사람을 살핀다고 한다. 원하는 대로 직업을 고르는 처지는 아니며, 배치와 교육은 관청이 결정한다.',options:[
   [labels[0]+'로 수련할 기회를 알아본다','후보가 되어도 실제 배치를 보장하지 않는다.'],
   [jobs.length>1?labels[1]+'로 수련할 기회를 알아본다':'기존 일을 계속하며 기술을 익힌다','관아의 배치와 제약이 생활에 영향을 준다.'],
   ['현재 맡은 일을 이어 간다','이동과 근무의 자유는 소속과 신분에 따라 제한된다.']]};
 }
 if(key==='midwife'&&eligibleMidwife(l))return {title:'마을에서 출산을 돕는 일을 배울까',
  description:'오래 경험을 쌓은 여성에게서 아이 낳는 집의 돌봄을 배울 기회가 생겼다. 이는 관청에서 의녀로 임명되는 길과 다르다.',options:[
   ['경험 많은 이의 일을 곁에서 배운다','몇 해의 경험과 몸의 수고가 필요하다.'],
   ['필요한 물건을 준비하는 일을 돕는다','전문가가 된 것이 아니라 다른 사람의 일을 보태는 것이다.'],
   ['지금 하던 생업을 이어 간다','다른 사람을 돕던 경험은 남는다.']]};
 if(key==='work'&&p&&s.workDone<p.tasks.length){
  const t=p.tasks[s.workDone];return {title:p.name+' · '+t[0],description:t[1],
   options:t[2].map((x,i)=>[x,['익힌 것을 자세히 확인하며 맡은 일을 진행한다.','사람들과 일과 위험을 나눈다.','일의 순서와 어려움을 다시 살핀다.'][i]])};
 }
 if(key==='leave'&&s.profession&&s.serviceBound)return {title:'관아의 일에서 벗어날 수 있을까?',
  description:'관아에 매인 일에는 스스로 그만두기 어려운 제약이 있다. 일을 바꾸거나 집으로 돌아가려면 허락과 형편이 따라야 한다.',options:[
   ['사정을 적어 면역이나 퇴역을 청한다','허락을 얻지 못하면 맡은 일을 계속해야 한다.'],
   ['같이 일하는 사람과 처지를 상의한다','동료와 상관의 말이 도움이 될 수도 있다.'],
   ['당장은 일을 이어 가기로 한다','시간이 지나도 예속된 법적 신분이 저절로 사라지는 것은 아니다.']]};
 if(key==='widowHome'&&f.bereaved)return {title:'사별 뒤의 집과 생업',
  description:'배우자가 세상을 떠난 뒤 살아갈 집과 생업을 다시 생각한다. 혼인을 다시 하더라도 과거의 인연과 자녀가 지워지지 않는다.',options:[
   ['내 손으로 벌이를 이어 간다','기술과 장부가 살림을 지탱할 수 있다.'],
   ['친정 식구와 거처를 의논한다','친족 사이 관계가 새 선택에 영향을 준다.'],
   ['새로운 혼담도 천천히 생각한다','재혼에는 지역과 가문의 관습에 따른 제약과 갈등이 따를 수 있다.']]};
 if(key==='remarriage'&&f.bereaved)return {title:'다시 혼인할지 결정하는 날',
  description:'새로운 혼담이 오갔다. 상대와 가족의 뜻, 자녀를 돌보는 일, 주변의 시선을 함께 생각한다. 재혼이 법적으로 늘 불가능했던 것은 아니다.',options:[
   ['사람을 만나 조건과 뜻을 확인해 혼인한다','혼인할 뜻이 맞는지 살피고 새로운 관계를 맺는다.'],
   ['혼인은 미루고 서로 알아 간다','당장의 혼인을 결정하지 않는다.'],
   ['혼인하지 않고 하던 일을 지킨다','혼인만이 생계를 이어 갈 길은 아니다.']]};
 if(key==='estate'&&f.parentsLost&&W326?.summary(l)?.property)return {title:'부모가 남긴 문서와 살림',
  description:(l.year<1650?'아들과 딸이 재산을 함께 나누는 관행이 널리 있었다.':
   l.year<1750?'아들과 딸의 상속분이 점차 달라지기도 했다.':'가문에 따라 장자 중심 상속이 강해졌지만 문서와 관행은 제각각이었다.')+
   ' 집안의 문서와 실제 남아 있는 재산을 확인해야 한다.',options:[
    ['분재기와 증인을 찾아 사실을 확인한다','문서를 찾아도 내 몫이 곧바로 정해지는 것은 아니다.'],
    ['친척들과 살림의 내력을 의논한다','가족 사이에 합의가 필요하다.'],
    ['물건을 보전하고 다툼을 미룬다','현물을 지키지만 분배가 늦어질 수 있다.']]};
 if(key==='estateResult'&&s.estate.status==='review')return {title:'재산 문서를 확인한 뒤',
  description:'모은 문서와 증언을 친족에게 보였다. 가문의 재산과 내 몫이 어디까지인지 다시 살펴야 한다.',options:[
   ['증인과 문서를 맞춰 작은 몫을 분배받는다','문서와 현물이 맞으면 일부 곡식이나 물건을 받을 수 있다.'],
   ['친척과 다시 협의하며 기다린다','갈등을 줄이되 살림의 분배가 미뤄진다.'],
   ['다툼을 그치고 지금 살림에 집중한다','해결되지 않은 몫이 남더라도 생업은 이어진다.']]};
 if(key==='childcare'&&f.children.length)return {title:'아이를 낳은 뒤의 몸조리와 돌봄',
  description:'새 아이가 태어난 집에서는 몸을 추스르는 시간과 일손이 필요하다. 이웃과 가족이 어떤 도움을 나눌까?',options:[
   ['가족에게 살림을 나눠 맡긴다','산후에 무리하지 않도록 곁에 있는 사람과 일을 나눈다.'],
   ['경험 많은 이에게 돌봄을 부탁한다','도움을 얻더라도 몸을 회복하는 속도는 저마다 다르다.'],
   ['이웃과 필요한 물품을 함께 마련한다','먹을 것과 천, 땔감이 들어간다.']]};
 return null;
}
function promote(l){const s=ensure(l);if(!s||!available(l)||l.pending||s.active)return false;
 while(s.queue.length){const key=s.queue.shift();if(!offer(l,key))continue;
  s.active=key;l.pending='joseonWomen327:'+key;return true;}return false;
}
function yearly(l){
 const s=ensure(l);if(!s||s.processedYear>=l.year)return;
 s.processedYear=l.year;if(!available(l))return;
 for(const x of s.followups.filter(x=>x.year<=l.year))note(l,s,x.text);
 s.followups=s.followups.filter(x=>x.year>l.year);
 const f=family(l),p=eligibleOffice(l);
 if(!s.seen.includes('entry')&&p.length&&l.age>=12&&l.age<=18){s.seen.push('entry');put(l,s,'entry');}
 if(!s.profession&&!s.seen.includes('midwife')&&eligibleMidwife(l)&&l.age%3===0){
  s.seen.push('midwife');put(l,s,'midwife');
 }
 if(s.profession&&s.workDone<kinds[s.profession].tasks.length&&l.year>=s.workAt&&l.age<=70)put(l,s,'work');
 if(s.profession&&s.serviceBound&&l.age>=33&&l.year%6===0&&l.year<1894&&
  !s.seen.includes('leave-'+l.year)){s.seen.push('leave-'+l.year);put(l,s,'leave');}
 if(s.serviceBound&&l.year>=1894){s.serviceBound=false;s.household='관아의 일이 끝난 뒤';s.profession=null;}
 if(f.bereaved&&W326?.summary(l)?.seen.includes('widow')&&!s.seen.includes('widowHome')&&l.age>=23){
  s.seen.push('widowHome');put(l,s,'widowHome');
 }
 if(s.remarriageDue&&l.year>=s.remarriageDue&&f.bereaved&&l.age<=55){
  s.remarriageDue=0;put(l,s,'remarriage');
 }
 if(f.parentsLost&&W326?.summary(l)?.property&&!s.seen.includes('estate')&&l.age>=37){
  s.seen.push('estate');put(l,s,'estate');
 }
 if(s.estateDue&&l.year>=s.estateDue&&s.estate.status==='review'){
  s.estateDue=0;put(l,s,'estateResult');
 }
 // Trigger on the actual family-chronicle birth year, not on marital status alone.
 if(l.age>=18&&l.age<=46&&!s.seen.includes('childcare-'+l.year)&&
  f.children.some(c=>c.birthYear===undefined?c.age===0:c.birthYear===l.year)){
  s.seen.push('childcare-'+l.year);put(l,s,'childcare');
 }
 promote(l);
}
function resolve(l,i){
 const s=ensure(l),key=s?.active,p=key&&offer(l,key);
 if(!s||!p||!available(l)||!Number.isInteger(i)||i<0||i>=p.options.length)return false;
 const f=family(l),label=p.options[i][0],soc=V5.ensure(l);
 let msg='';
 if(key==='entry'){
  const jobs=eligibleOffice(l),code=jobs[i];
  if(!code)msg='관아의 배치를 기다리며 지금의 일을 계속했다.';
  else if(roll(l.seed,l.year*31+i*13+701)<.6){
   s.profession=code;s.serviceBound=true;s.skill=1;s.careerStart=l.year;s.workAt=l.year+2;s.workDone=0;
   const title=kinds[code].name;J.ensure(l).occupation=title+'의 일을 배우는 중';
   l.career=J.ensure(l).occupation;soc.role=title;
   msg='관아가 '+title+'의 일을 맡겼다. 선발 이후에도 교육과 일의 제약이 남았다.';
  }else msg='관아의 사정으로 이번에는 배정되지 않았다. 원래 맡은 일을 이어 갔다.';
 }else if(key==='midwife'){
  if(i===0){s.profession='midwife';s.skill=1;s.careerStart=l.year;s.workAt=l.year+2;s.workDone=0;
   J.ensure(l).occupation='마을의 출산 돌봄을 배우는 사람';l.career=J.ensure(l).occupation;
   msg='경험 많은 마을 사람에게서 아이 낳는 집을 돌보는 일을 배우기 시작했다.';}
  else msg=i===1?'산모에게 필요한 물건과 식구의 일손을 챙겼다. 아직 산파의 일을 홀로 맡을 수는 없었다.':
   '지금 하던 생업을 계속하면서 어려운 이웃을 돕던 기억을 남겼다.';
 }else if(key==='work'){
  const t=kinds[s.profession].tasks[s.workDone];
  s.skill=clamp(s.skill+(i===0?3:2),0,100);s.contacts=clamp(s.contacts+(i===1?2:1),0,100);
  if(i===1)money(l,-2);
  l.change({knowledge:i===0?2:1,bonds:i===1?3:1,health:i===2?-2:0});
  msg=t[0]+' 일을 마쳤다. '+(i===0?'배운 방법을 확인하고 경험을 쌓았다.':i===1?'동료와 품을 나누며 관계를 넓혔다.':'어려움을 돌아보며 다음 일을 준비했다.');
  s.workDone++;s.workAt=l.year+4;
  if(s.skill>=6){J.ensure(l).occupation=kinds[s.profession].name;l.career=J.ensure(l).occupation;}
 }else if(key==='leave'){
  const chance=i===0?.58:i===1?.24:0;
  if(roll(l.seed,l.year*13+i*19+777)<chance){
   s.serviceBound=false;s.household='관아의 일에서 벗어나 새 살림을 꾸리는 중';
   const old=kinds[s.profession].name;s.profession=null;s.workDone=0;
   J.ensure(l).occupation='관아에서 나온 뒤 생업을 찾는 사람';l.career=J.ensure(l).occupation;soc.role='';
   msg=old+'의 소속에서 물러날 허락을 받았다. 법적 신분의 변화가 저절로 보장되는 것은 아니다.';
  }else msg='관아에 사정을 전했으나 이번에는 일에서 벗어나지 못했다. 맡은 일을 이어 갔다.';
 }else if(key==='widowHome'){
  s.household=['스스로 꾸리는 살림','친정과 의논한 거처','새 혼담을 생각하는 살림'][i];
  if(i===0){money(l,-3);l.change({knowledge:2});}
  if(i===1)l.change({bonds:3});
  if(i===2)s.remarriageDue=l.year+2;
  msg='배우자를 떠나보낸 뒤 '+s.household+'의 길을 생각했다. 남은 가족과 생업을 함께 살폈다.';
 }else if(key==='remarriage'){
  if(i===0&&!s.serviceBound&&V4.remarry?.(l)){
   s.household='다시 혼인해 꾸린 살림';l.change({bonds:3});money(l,-7);
   msg='상대와 혼인하여 새 살림을 꾸렸다. 먼저 세상을 떠난 사람의 기억과 자녀의 인연은 남아 있다.';
  }else if(i===0)msg='새 혼인을 원했지만 집안과 처지를 정리하지 못해 혼사를 미뤘다.';
  else msg=i===1?'혼인을 결정하지 않고 서로의 사정을 더 알아보기로 했다.':'혼인을 하지 않고 익숙한 생업과 가족의 삶을 이어 가기로 했다.';
 }else if(key==='estate'){
  s.estate={status:'review',evidence:i===0?3:i===1?1:0,share:0};s.estateDue=l.year+2;
  if(i===0)l.change({knowledge:2});
  if(i===1)l.change({bonds:2});
  msg=i===0?'집안의 분재기와 증언을 찾아 재산의 내력을 확인하기 시작했다.':
   i===1?'친척들과 문서와 물건의 내력을 상의했지만 몫은 아직 정해지지 않았다.':
    '물건을 훼손하지 않도록 보전하고 분배 문제는 시간을 두고 보기로 했다.';
 }else if(key==='estateResult'){
  if(i===0&&s.estate.evidence>=2){
   // Bounded household transfer based on the documented claim, not automatic land ownership.
   const share=J.ensure(l).family==='여유 있는 형편'?5:2;
   money(l,share);s.estate.share=share;s.estate.status='settled';
   msg='확인한 기록과 실제 물건을 대조해 집안의 작은 몫을 나누어 받았다. 토지 소유권이 갑자기 생긴 것은 아니다.';
  }else if(i===1){s.estate.status='negotiating';l.change({bonds:2});msg='친척과 함께 분배할 물건을 다시 확인했다. 결론을 미뤘다.';}
  else{s.estate.status='unresolved';msg='확인할 근거가 모자라 분배가 확정되지 않았다. 하던 살림을 이어 갔다.';}
 }else if(key==='childcare'){
  if(i===0){l.change({health:2,bonds:2});msg='가족과 번갈아 일손을 맡아 출산 뒤 몸을 돌볼 시간을 마련했다.';}
  if(i===1){money(l,-2);l.change({health:2});msg='경험 많은 이웃의 도움으로 몸조리를 하고 집안일을 나누었다.';}
  if(i===2){money(l,-2);l.change({bonds:3});msg='이웃과 천과 땔감, 먹을 것을 서로 나누었다.';}
 }else return false;
 note(l,s,msg);
 s.decisions.push({year:l.year,key,index:i,label});s.decisions=s.decisions.slice(-50);
 s.followups.push({year:l.year+3,text:'몇 해 전 “'+label+'”을 택한 일을 떠올렸다. 그때의 사람과 일이 지금도 삶에 남아 있었다.'});
 s.followups=s.followups.slice(-16);
 l.logEvent(p.title+' — '+label,'joseonWomen327-choice');
 s.active=null;l.pending=null;promote(l);
 return true;
}
function summary(l){const s=ensure(l);if(!s)return null;
 return {profession:s.profession?kinds[s.profession].name:null,serviceBound:s.serviceBound,
  careerStart:s.careerStart,skill:s.skill,workDone:s.workDone,household:s.household,
  estate:{...s.estate},decisions:s.decisions.length,recent:s.recent.slice(-6)};
}
const VALID=['entry','midwife','work','leave','widowHome','remarriage','estate','estateResult','childcare'];
function hydrate(l,data){
 const s=ensure(l),o=data?.joseonWomen327;if(!s||!o||o.version!==1)return s;
 s.profession=kinds[o.profession]?o.profession:null;s.serviceBound=!!o.serviceBound&&!!s.profession&&s.profession!=='midwife';
 for(const x of ['processedYear','workDone','workAt','careerStart','skill','contacts','widowDue','remarriageDue','estateDue']){
  s[x]=clamp(Number(o[x])||0,0,x==='processedYear'?l.year:l.year+100);
 }
 s.workDone=clamp(s.workDone,0,s.profession?kinds[s.profession].tasks.length:3);
 s.skill=clamp(s.skill,0,100);s.contacts=clamp(s.contacts,0,100);
 s.household=String(o.household||'').slice(0,90);
 const e=o.estate||{};s.estate={status:['none','review','settled','negotiating','unresolved'].includes(e.status)?e.status:'none',
  evidence:clamp(Number(e.evidence)||0,0,3),share:clamp(Number(e.share)||0,0,20)};
 s.seen=Array.isArray(o.seen)?o.seen.filter(x=>typeof x==='string'&&x.length<60).slice(-40):[];
 s.queue=Array.isArray(o.queue)?o.queue.filter(x=>VALID.includes(x)).slice(-8):[];
 s.active=VALID.includes(o.active)&&data.pending==='joseonWomen327:'+o.active?o.active:null;
 if(s.active)l.pending='joseonWomen327:'+s.active;
 s.recent=Array.isArray(o.recent)?o.recent.filter(x=>x&&Number.isInteger(x.year)&&typeof x.text==='string')
  .slice(-24).map(x=>({year:x.year,text:x.text.slice(0,200)})):[];
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(x=>x&&VALID.includes(x.key)&&x.year<=l.year).slice(-50):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(x=>x&&Number.isInteger(x.year)&&x.year>=l.year&&x.year<=l.year+10&&typeof x.text==='string')
  .slice(-16).map(x=>({year:x.year,text:x.text.slice(0,200)})):[];
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V4?.remarry||!W326?.summary||Sim.Life.prototype.__joseonWomen327)return false;
 const L=Sim.Life,tick=L.prototype.tick,choose=L.prototype.choose,get=L.prototype.getChoice,
  reflect=L.prototype.reflect,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){const y=this.year,ok=tick.call(this);
  if(ok&&this.alive&&y!==this.year)yearly(this);return ok;};
 L.prototype.getChoice=function(){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseonWomen327:')){
   const p=offer(this,this.pending.slice('joseonWomen327:'.length));
   return p&&{...p,options:p.options.map(([label,note])=>({label,note,action:label}))};
  }
  return get.call(this);
 };
 L.prototype.choose=function(i){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseonWomen327:'))return resolve(this,i);
  const ok=choose.call(this,i);if(ok)promote(this);return ok;
 };
 L.prototype.reflect=function(t){const ok=reflect.call(this,t);if(ok)promote(this);return ok;};
 L.prototype.snapshot=function(){const d=snapshot.call(this);
  if(this.joseonWomen327)d.joseonWomen327=JSON.parse(JSON.stringify(this.joseonWomen327));return d;};
 L.restore=function(d){const l=restore.call(this,d);if(l&&d?.joseonWomen327)hydrate(l,d);return l;};
 Object.defineProperty(L.prototype,'__joseonWomen327',{value:true});return true;
}
install();
return Object.freeze({ensure,female,available,family,eligibleOffice,eligibleMidwife,offer,promote,yearly,resolve,
 summary,hydrate,install,kinds});
});
