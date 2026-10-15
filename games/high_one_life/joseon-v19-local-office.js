/* Joseon v19 — local magistrates, patronage, clerks and administrative audits.
 * Historical institution, fictional officials, decisions, severity and outcomes.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,
  root?.OneLifeJoseon5,root?.OneLifeJoseon9,root?.OneLifeJoseon18);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon19=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V5,V9,V18){
'use strict';
const clip=(n,a,b)=>Math.max(a,Math.min(b,n));
const rnd=(seed,salt)=>{let n=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;};
const nameHash=s=>[...s].reduce((n,ch)=>Math.imul(n,33)+ch.charCodeAt(0)>>>0,5381);
const surnames=['김','이','박','정','최','윤','한','조','홍','신','권','유'];
const given=['승규','창익','대현','문석','의준','도환','재선','시형','경수','한조','정선','태문'];
const SOURCES=Object.freeze({
 inspector:'https://encykorea.aks.ac.kr/Article/E0035165',
 inspectorHistory:'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_30&levelId=kc_o300700',
 economy:'https://contents.history.go.kr/mobile/ta/view.do?levelId=ta_m62_0030_0020',
 uprising:'https://encykorea.aks.ac.kr/Article/E0047507'
});
const choice=(label,note,follow,delta={},action='care')=>({label,note,follow,delta,action});
const event=(id,title,scene,opts,gate=()=>true,source='economy')=>({id,title,scene,options:opts,gate,source:SOURCES[source]});
const EVENTS=[
 event('newMagistrate','고을에 새 수령이 부임하다',
  '전임 수령이 떠나고 새 수령이 부임했다. 관아의 부과 방식이 달라질지는 아직 알 수 없다.',[
  choice('고을 사람들이 겪은 일을 전한다','새 수령에게 납부 장부와 사정을 알린다','새 수령이 말을 들었지만 모든 문제를 곧장 해결하지는 못했다.',{proof:2,petitions:1,confidence:1},'petition'),
  choice('행정이 어떻게 달라지는지 지켜본다','새 수령의 실제 행동을 보고 판단한다','수령이 바뀐 뒤의 징수 방식을 살펴보았다.',{knowledge:2,confidence:1},'watch'),
  choice('이웃과 함께 공동 요구를 준비한다','주민들의 사정을 모아 본다','새 수령에게 함께 전할 말을 정리했다.',{petitions:2,solidarity:2,anger:1},'organize')],(l,s)=>s.office.from===l.year),
 event('clerkNetwork','새 수령 아래에도 남은 아전들',
  '수령은 바뀌었어도 관아의 장부를 다루는 이서들의 관행은 쉽게 바뀌지 않는다.',[
  choice('바뀌지 않은 장부를 확인한다','이전 관아에서 잘못 적었던 내용을 찾는다','오래된 장부와 새로운 지시의 차이를 살펴보았다.',{proof:3,petitions:1},'record'),
  choice('아전에게 장부의 잘못을 따진다','불편한 대화가 이어질 수 있다','일부 장부는 다시 살펴보았지만 관행이 남아 있었다.',{anger:3,retaliation:1,proof:1},'object'),
  choice('이웃끼리 납부 내용을 대조한다','증언과 수납액을 나란히 적는다','이웃의 증언이 모여 허위 장부를 밝히는 데 도움이 되었다.',{solidarity:3,proof:3},'organize')]),
 event('levyRequest','수령의 추가 징수 요구',
  '관아에서 원래 내야 할 몫 외에 더 많은 돈과 곡식을 거두라는 말이 나왔다.',[
  choice('납부 사유를 확인한다','실제 규정과 관아의 말을 비교한다','거두려는 명목을 적어 두었다.',{proof:2,petitions:1,anger:1},'record'),
  choice('먼저 내고 집안의 살림을 줄인다','당장의 대립은 피한다','내야 할 곡식을 마련하며 식구들과 다음 철을 걱정했다.',{grain:-4,landDebt:2,anger:2},'pay'),
  choice('여러 집과 함께 시정을 요청한다','함께 항의하는 만큼 불이익도 우려한다','같은 부담을 겪은 이웃과 서로 힘을 보탰다.',{solidarity:3,petitions:1,anger:2,retaliation:1},'petition')]),
 event('favorPressure','권세가의 이름을 앞세우는 사람들',
  '고을 일에 영향력을 행사하는 이들이 중앙의 권세를 거론하며 관아의 결정을 바꾸려 한다.',[
  choice('결정의 근거를 기록한다','누가 어떤 요구를 했는지 적는다','관청에 압력을 넣었던 말들을 잊지 않으려 했다.',{proof:3,integrity:1},'record'),
  choice('불합리한 요구를 피한다','관아의 눈 밖에 날 가능성도 있다','권세를 앞세운 사람들과 거리를 두었다.',{retaliation:1,confidence:1},'avoid'),
  choice('이웃과 공개적으로 이유를 묻는다','힘없는 사람들도 함께 발언한다','공개적으로 물었던 질문이 고을에 퍼졌다.',{solidarity:3,petitions:1,anger:2},'petition')]),
 event('goodMagistrate','백성의 사정을 듣는 수령',
  '이번 수령은 세금 장부와 형벌의 처리에 신중하다. 이전의 불이익이 모두 없어지는 것은 아니지만 말을 전할 창구는 생겼다.',[
  choice('부당한 납부 기록을 제출한다','확인된 장부를 근거로 시정을 청한다','그중 일부가 확인되어 집안의 부담을 조금 덜 수 있었다.',{proof:2,petitions:1,relief:2,confidence:2},'petition'),
  choice('마을 사람들이 함께 증언한다','여러 집의 사정을 모은다','증언이 모였지만 해결되기까지 시간이 걸렸다.',{solidarity:4,petitions:1,confidence:2},'organize'),
  choice('고을의 공동 창고와 구휼을 건의한다','어려운 집을 먼저 살펴 달라 한다','어려운 집을 돕는 문제를 관아에 전했다.',{solidarity:2,grain:2,confidence:2},'mutual')
 ],(l,s)=>s.office.integrity>=65),
 event('corruptMagistrate','수령의 사사로운 이익과 고을의 부담',
  '관청 주변에서 개인의 재물을 불리는 데 공적 징수를 이용한다는 말이 돈다. 사실 여부를 확인할 자료도 필요하다.',[
  choice('수납 장부와 증언을 모은다','주민의 구체적인 손해를 적는다','소문에 그치지 않도록 문서와 증언을 모았다.',{proof:4,petitions:1,anger:2},'record'),
  choice('관아에 직접 따져 묻는다','권력 앞에서 부담이 크다','수령에게 말을 전한 뒤 불이익을 걱정하기도 했다.',{proof:1,anger:4,retaliation:3},'object'),
  choice('당장 가족의 살림을 지킨다','가능한 일을 먼저 추린다','피해가 커지지 않도록 지출을 줄였다.',{capital:-2,bonds:2},'survive')
 ],(l,s)=>s.office.integrity<=43),
 event('appointedClerk','아전에게 내려온 부당한 징수 지시',
  '장부를 다루는 당신에게 일정한 금액을 더 거두거나 숫자를 고치라는 압력이 전해졌다.',[
  choice('받은 대로 정확히 적는다','불이익을 감수하고 기록을 남긴다','이름과 숫자를 바르게 적어 둔 장부가 남았다.',{proof:4,integrity:4,retaliation:2},'refuse'),
  choice('윗사람의 지시를 따른다','이익과 위험이 함께 따른다','부당한 기록이 다른 집에 짐이 된 사실이 남았다.',{corruption:4,capital:3,anger:4,confidence:-3},'complicit'),
  choice('동료와 함께 상급 관청에 묻는다','함께 책임지고 증언한다','고을을 살펴 달라는 문서가 작성되었다.',{proof:3,petitions:2,integrity:2},'petition')
 ],(l,s)=>/서리|아전|관료|수령|관리/.test(V5.summary(l).origin+' '+V5.summary(l).role)),
 event('petitionsBlocked','여러 번 올린 탄원이 돌아오다',
  '관아의 잘못을 고쳐 달라 올린 문서에 답이 없거나 형식적인 회답만 돌아왔다.',[
  choice('다시 장부와 증언을 모은다','끝까지 정확한 기록을 지킨다','여러 해 쌓인 자료가 다른 기회에 도움이 되었다.',{proof:3,petitions:1},'record'),
  choice('다른 경로로 뜻을 전한다','상급 관청의 조사 기회를 기다린다','고을 밖으로 소식이 전해졌다.',{contacts:2,petitions:1,retaliation:1},'appeal'),
  choice('식구의 생계를 먼저 돌본다','당장 생업을 놓을 수 없다','탄원은 멈췄지만 억울한 마음이 사라진 것은 아니었다.',{anger:2,bonds:2,capital:1},'work')
 ],(l,s)=>s.petitions>=1),
 event('unknownTraveler','고을 사정을 묻는 낯선 나그네',
  '초라한 행색의 사람이 고을의 징세와 형벌을 묻는다. 그가 어사인지는 누구도 확신할 수 없다.',[
  choice('겪은 일과 알고 있는 사실을 들려준다','소문과 실제 기록을 구분한다','낯선 사람에게 장부와 고을의 형편을 이야기했다.',{proof:2,contacts:1},'witness'),
  choice('이웃들의 말부터 모아 준다','여러 집의 증언을 전한다','고을 사람의 사정을 함께 전하려 했다.',{solidarity:2,petitions:1},'organize'),
  choice('모르는 사실은 모른다고 답한다','확인하지 않은 내용은 단정하지 않는다','확실히 아는 일만 말했지만 조사에 도움이 될 수도 있었다.',{integrity:2,confidence:1},'caution')
 ],(l,s)=>s.audit.state==='rumor','inspector'),
 event('inspection','암행어사 또는 감찰의 조사',
  '왕명으로 파견된 어사나 감찰 담당자가 고을의 문서와 주민들의 사정을 살피고 있다. 조사에 반드시 결론이 나는 것은 아니다.',[
  choice('납부 장부와 증언을 제출한다','확인된 피해 내역을 전한다','공식 조사에 제출한 기록이 남았다.',{proof:3,petitions:1,auditEvidence:4},'evidence'),
  choice('이웃의 억울한 형벌도 알린다','부당한 처분이 있는지 조사에 협조한다','이웃의 사정과 형벌 처리에 관한 말도 전했다.',{solidarity:3,petitions:1,auditEvidence:3},'witness'),
  choice('일이 끝날 때까지 조용히 지낸다','불확실한 처벌을 피하려 한다','조사가 끝나기를 기다렸지만 고을의 긴장은 오래갔다.',{confidence:-1,retaliation:0},'wait')
 ],(l,s)=>s.audit.state==='investigating','inspector'),
 event('auditOutcome','감찰 결과를 기다리는 고을',
  '조사한 문서가 관찰사와 조정에 보고되었다. 잘못된 징수나 관리의 책임을 어떻게 판단할지 아직 불확실하다.',[
  choice('결론이 난 문서를 확인한다','실제 시정 범위를 살핀다','조사 결과와 고을의 현실이 얼마나 달라졌는지 살폈다.',{proof:2,confidence:1},'record'),
  choice('미처 해결하지 못한 집을 돕는다','탄원하지 못한 이웃을 살핀다','모든 피해가 한꺼번에 회복되지는 않았다.',{solidarity:3,grain:-2},'mutual'),
  choice('새 수령에게 남은 부담을 알린다','관리 교체가 있을 때 다시 시정을 요구한다','고을의 문제를 이어서 해결해 달라 건의했다.',{petitions:1,confidence:1},'petition')
 ],(l,s)=>s.audit.state==='reported','inspector'),
 event('patronageCost','권세가의 후원을 둘러싼 관직 인사',
  '중앙의 후원을 얻어 지방관으로 나아가는 일과 그에 따르는 대가를 두고 말이 많다. 모든 지방관의 임명이 같은 방식으로 이루어지지는 않았다.',[
  choice('인사와 고을의 재정이 연결되는지 기록한다','관직과 세금 부담의 관계를 따져 본다','고을의 징수가 누구를 위한 것인지 다시 물었다.',{knowledge:3,proof:2},'record'),
  choice('권세를 이용해 실리를 얻으려 한다','관청의 인맥을 이용할 수도 있다','힘 있는 사람과의 인연은 더 많은 요구로 돌아오기도 했다.',{contacts:3,corruption:2,capital:1},'network'),
  choice('고을의 일과 집안의 일을 구분한다','관계에 기대지 않고 할 수 있는 일을 찾는다','권세 있는 사람과 거리를 두며 생업을 이어 갔다.',{integrity:2,bonds:2},'independent')
 ],(l,s)=>l.year<=1863&&(V5.summary(l).rank>0||/양반|서리|관료/.test(V5.summary(l).origin)))
];
const BYID=new Map(EVENTS.map(e=>[e.id,e]));
const era=l=>J?.isJoseon(l)&&J.inOldEra(l)&&l.year>=1800&&l.year<=1869&&l.alive;
const region=l=>J.summary(l).region;
const officeName=(seed,r,year)=>surnames[Math.floor(rnd(seed,year*37+nameHash(r))*surnames.length)]+
 given[Math.floor(rnd(seed,year*43+nameHash(r))*given.length)];
const kind=integrity=>integrity>=65?'청렴한 편':integrity<=43?'탐학한 편':'평판이 엇갈림';
function appoint(l,s,year,reason='임기 교체'){
 const r=region(l),salt=(year*173+nameHash(r))>>>0,n=Math.floor(rnd(s.familySeed,salt+5)*65)+18;
 const i=clip(n+Math.floor(rnd(s.familySeed,salt+13)*19)-9,13,91);
 const patronage=clip(Math.floor(rnd(s.familySeed,salt+23)*75)+(year>=1810&&year<1864?10:0),0,100);
 s.office={name:officeName(s.familySeed,r,year),from:year,through:year+4+Math.floor(rnd(s.familySeed,salt+31)*4),
  integrity:i,patronage,clerks:clip(Math.floor(rnd(s.familySeed,salt+34)*70)+14,5,94),
  levy:clip(Math.floor((100-i)*.58+patronage*.26),0,88),region:r,reason};
 s.turnovers++;
 s.memory.push(year+'년 '+reason+'로 새 수령이 부임했다.');s.memory=s.memory.slice(-20);
 return s.office;
}
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.joseon19){
  const familySeed=l.genealogy15?.familySeed??l.seed;
  l.joseon19={version:1,processedYear:l.year,familySeed,office:null,turnovers:0,
   audit:{state:'none',since:null,checked:0,outcome:'',reports:0},
   petitions:0,proof:0,solidarity:0,anger:0,confidence:45,retaliation:0,
   corruption:0,integrity:0,contacts:0,memories:[],memory:[],seen:[],queue:[],active:null,
   decisions:[],followups:[],lastSource:null};
 }
 const s=l.joseon19;
 if(!s.office||s.office.region!==region(l))appoint(l,s,l.year,s.office?'다른 고을로 옮김':'첫 부임');
 return s;
}
function fit(l,s,e){
 return era(l)&&l.age>=15&&l.age<=80&&e.gate(l,s)&&!s.seen.includes(e.id);
}
function queue(l,s,e){
 if(!e||s.queue.some(q=>q.eventId===e.id)||s.active?.eventId===e.id||s.seen.includes(e.id))return;
 s.seen.push(e.id);s.queue.push({id:l.year+'-'+e.id,eventId:e.id,year:l.year});s.queue=s.queue.slice(-4);
}
function promote(l,s){
 if(!s.active&&!l.pending&&l.alive&&J.inOldEra(l)&&s.queue.length){
  s.active=s.queue.shift();l.pending='joseon19:'+s.active.id;
 }
}
function yearly(l,s){
 if(!era(l)||!s||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 // Inspectors are not automatically dispatched everywhere; these are fictional
 // opportunities shaped by grievance, documentary evidence and patronage.
 const o=s.office,ledger=V18.ensure(l);
 for(const f of s.followups.filter(x=>x.year<=l.year)){
  l.logEvent(f.text,'joseon19-followup');l.log.at(-1).causeId='joseon19:'+f.id;
  s.memories.push(f.text);
 }
 s.followups=s.followups.filter(x=>x.year>l.year);
 if(l.year>o.through){
  const outgoing=o.name;
  appoint(l,s,l.year,'임기 교체');
  l.logEvent(outgoing+' 수령이 떠나고 '+s.office.name+' 수령이 부임했다. 아전의 장부 관행은 남아 있을 수 있다.','joseon19-office');
  queue(l,s,BYID.get('newMagistrate'));
 }
 if(s.audit.state==='none'&&s.petitions+ledger.complaints>=2&&l.year%4===1&&
  rnd(s.familySeed,l.year*27+nameHash(region(l))+22)<clip(.12+s.proof*.012+(90-s.office.patronage)*.002,0,.48)){
  s.audit={state:'rumor',since:l.year,checked:0,outcome:'',reports:s.audit.reports};
  queue(l,s,BYID.get('unknownTraveler'));
 }
 if(s.audit.state==='rumor'&&l.year>s.audit.since){
  s.audit.state='investigating';
  queue(l,s,BYID.get('inspection'));
 }
 if(s.audit.state==='investigating'&&l.year>s.audit.since+2){
  const evidence=s.proof+ledger.proof+s.audit.checked*2;
  const chance=clip(.14+evidence*.019-s.office.patronage*.0023,0.05,.78);
  const confirmed=rnd(s.familySeed,l.year*61+s.turnovers*37+17)<chance;
  if(confirmed){
   s.audit.outcome='문제 일부를 확인하고 시정을 건의함';
   s.confidence=clip(s.confidence+10,0,100);
   s.office.levy=clip(s.office.levy-18,0,88);
   if(s.office.integrity<45){
    // Recommended for dismissal, not an automatic royal order by the player.
    if(rnd(s.familySeed,l.year*23+s.turnovers*19)<.5){
     s.office.through=l.year;
     s.audit.outcome='부당한 징수 확인, 수령 교체 건의';
    }
   }
   if(evidence>=10){
    for(const k of ['landDebt','militaryDebt','grainDebt'])
     ledger[k]=clip(ledger[k]-2,0,70);
   }
  }else{
   s.audit.outcome='조사했으나 충분한 시정으로 이어지지 않음';
   s.confidence=clip(s.confidence-3,0,100);
  }
  s.audit.state='reported';s.audit.reports++;
  l.logEvent('고을에 내려온 감찰의 보고: '+s.audit.outcome+'.','joseon19-audit');
  queue(l,s,BYID.get('auditOutcome'));
 }
 if(s.audit.state==='reported'&&l.year>s.audit.since+5)
  s.audit={state:'none',since:null,checked:0,outcome:s.audit.outcome,reports:s.audit.reports};
 // Different officials affect how often local fiscal abuses reach households.
 // Uses the existing v18 debt ledger, with no duplicate charge to capital.
 if(l.year%6===1&&l.age>=16&&s.office.levy>=48&&
     rnd(s.familySeed,l.year*77+nameHash(region(l))+9)<s.office.levy/145){
  const types=['landDebt','militaryDebt','grainDebt'];
  const chosen=types[Math.floor(rnd(s.familySeed,l.year*17+47)*3)];
  ledger[chosen]=clip(ledger[chosen]+1+(s.office.levy>=73?1:0),0,70);
  s.anger=clip(s.anger+2,0,60);
  l.logEvent('고을의 징수 관행이 거세져 우리 집의 '+({landDebt:'전정',militaryDebt:'군정',grainDebt:'환정'}[chosen])+' 부담이 남았다.','joseon19-fiscal');
 }
 const pool=EVENTS.filter(e=>fit(l,s,e));
 if(pool.length&&l.year%2===0&&s.queue.length<=1){
  const score=e=>{
   const base=rnd(s.familySeed,l.year*29+nameHash(e.id))+rnd(l.seed,l.year*23+nameHash(e.id))*.2;
   const urgent=e.id==='inspection'&&s.audit.state==='investigating'?-.85:
     e.id==='unknownTraveler'&&s.audit.state==='rumor'?-.65:0;
   return base+urgent;
  };
  pool.sort((a,b)=>score(a)-score(b));queue(l,s,pool[0]);
 }
 s.memories=s.memories.slice(-26);
 promote(l,s);
}
function prompt(l){
 const s=ensure(l),e=BYID.get(s.active?.eventId);
 if(!e)return null;
 let intro=e.scene;
 if(e.id==='corruptMagistrate'&&s.proof+V18.ensure(l).proof<4)
  intro+=' 아직 소문뿐인 내용은 사실로 단정할 수 없다.';
 if(e.id==='goodMagistrate'&&s.office.clerks>=65)
  intro+=' 다만 아전들의 기존 장부를 고치기에는 시간이 필요하다.';
 return {title:e.title,description:intro,options:e.options.map(o=>({label:o.label,note:o.note,action:o.label}))};
}
function choose(l,index){
 const s=ensure(l),e=BYID.get(s.active?.eventId);
 if(!e||!Number.isInteger(index)||index<0||index>=e.options.length||!l.alive)return false;
 const op=e.options[index],d=op.delta,j=J.ensure(l),v=V2.ensure(l),vil=V9.ensure(l),ledger=V18.ensure(l);
 const stats={};for(const k of ['health','happiness','knowledge','bonds','wealth'])
  if(Number.isFinite(d[k]))stats[k]=d[k];
 l.change(stats);
 if(Number.isFinite(d.capital))j.capital=clip(j.capital+d.capital,-120,600);
 if(Number.isFinite(d.grain))v.grain=clip(v.grain+d.grain,0,200);
 for(const k of ['proof','petitions','solidarity','anger','confidence','retaliation','corruption','integrity','contacts'])
  if(Number.isFinite(d[k]))s[k]=clip(s[k]+d[k],0,k==='anger'?60:100);
 if(Number.isFinite(d.landDebt))ledger.landDebt=clip(ledger.landDebt+d.landDebt,0,70);
 if(Number.isFinite(d.militaryDebt))ledger.militaryDebt=clip(ledger.militaryDebt+d.militaryDebt,0,70);
 if(Number.isFinite(d.grainDebt))ledger.grainDebt=clip(ledger.grainDebt+d.grainDebt,0,70);
 if(op.action==='evidence'&&Number.isFinite(d.auditEvidence))
  s.audit.checked=clip(s.audit.checked+d.auditEvidence,0,20);
 if(op.action==='witness'&&Number.isFinite(d.auditEvidence))
  s.audit.checked=clip(s.audit.checked+d.auditEvidence,0,20);
 if(Number.isFinite(d.relief)&&s.office.integrity>=65){
  const benefit=Math.max(0,Math.floor(d.relief));
  for(const k of ['landDebt','militaryDebt','grainDebt'])ledger[k]=clip(ledger[k]-benefit,0,70);
 }
 if(d.solidarity>0)vil.trust=clip(vil.trust+Math.floor(d.solidarity/2),0,100);
 if(d.proof>0)ledger.proof=clip(ledger.proof+Math.min(2,d.proof),0,90);
 if(d.petitions>0)ledger.complaints=clip(ledger.complaints+d.petitions,0,90);
 const id=s.active.id;
 l.logEvent(e.title+' — '+op.label,'joseon19-choice');
 l.log.at(-1).causeId='joseon19:'+id;l.log.at(-1).sourceUrl=e.source;
 s.decisions.push({id,eventId:e.id,year:l.year,choice:index,official:s.office.name});s.decisions=s.decisions.slice(-70);
 s.followups.push({id,year:l.year+2+index%2,text:op.follow});s.followups=s.followups.slice(-45);
 s.lastSource=e.source;
 s.active=null;l.pending=null;
 if(l.money&&l.year<1900)l.money.netWorth=j.capital*100;
 promote(l,s);return true;
}
function summary(l){
 const s=ensure(l);if(!s)return null;
 return {region:s.office.region,name:s.office.name,from:s.office.from,through:s.office.through,
  reputation:kind(s.office.integrity),integrity:s.office.integrity,patronage:s.office.patronage,
  clerks:s.office.clerks,levy:s.office.levy,turnovers:s.turnovers,
  audit:{...s.audit},petitions:s.petitions,proof:s.proof,confidence:s.confidence,
  anger:s.anger,decisions:s.decisions.length,lastSource:s.lastSource,
  lastEvent:s.decisions.at(-1)?.eventId||null};
}
function inherit(parent,child){
 if(!parent||!child||!J?.isJoseon(parent)||!J.isJoseon(child))return false;
 const p=ensure(parent),s=ensure(child);
 s.familySeed=p.familySeed;
 s.office={...p.office};
 s.turnovers=p.turnovers;
 s.petitions=clip(Math.floor(p.petitions*.6),0,100);
 s.proof=clip(Math.floor(p.proof*.7),0,100);
 s.solidarity=clip(Math.floor(p.solidarity*.6),0,100);
 s.confidence=p.confidence;
 s.processedYear=child.year;
 if(s.petitions||s.proof)
  child.logEvent('윗대의 장부와 탄원 기록을 전해 받아 고을의 일을 기억하게 되었다.','joseon19-family');
 return true;
}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseon19;if(!s||!o||o.version!==1)return s;
 s.processedYear=clip(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.familySeed=Number.isInteger(o.familySeed)?o.familySeed>>>0:l.seed;
 const ooff=o.office;
 if(ooff&&typeof ooff.name==='string'&&ooff.region===region(l)&&Number.isInteger(ooff.from)&&ooff.from<=l.year){
  s.office={name:ooff.name.slice(0,22),region:ooff.region,from:ooff.from,through:clip(Number(ooff.through)||l.year,ooff.from,l.year+12),
   integrity:clip(Number(ooff.integrity)||40,0,100),patronage:clip(Number(ooff.patronage)||40,0,100),
   clerks:clip(Number(ooff.clerks)||30,0,100),levy:clip(Number(ooff.levy)||30,0,100),reason:String(ooff.reason||'').slice(0,50)};
 }
 s.turnovers=clip(Number(o.turnovers)||1,0,120);
 for(const k of ['petitions','proof','solidarity','anger','confidence','retaliation','corruption','integrity','contacts'])
  s[k]=clip(Number(o[k])||0,0,100);
 const a=o.audit||{};
 s.audit={state:['none','rumor','investigating','reported'].includes(a.state)?a.state:'none',
  since:Number.isInteger(a.since)&&a.since<=l.year&&a.since>=l.birthYear?a.since:null,
  checked:clip(Number(a.checked)||0,0,20),
  outcome:String(a.outcome||'').slice(0,140),reports:clip(Number(a.reports)||0,0,100)};
 s.seen=Array.isArray(o.seen)?o.seen.filter(id=>BYID.has(id)).slice(-EVENTS.length):[];
 const valid=q=>q&&BYID.has(q.eventId)&&typeof q.id==='string'&&
  Number.isInteger(q.year)&&q.year>=l.birthYear&&q.year<=l.year;
 const clean=q=>({id:q.id.slice(0,65),eventId:q.eventId,year:q.year});
 s.queue=Array.isArray(o.queue)?o.queue.filter(valid).slice(-4).map(clean):[];
 s.active=valid(o.active)&&data?.pending==='joseon19:'+o.active.id&&l.alive&&J.inOldEra(l)?clean(o.active):null;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(x=>valid(x)&&Number.isInteger(x.choice)&&x.choice>=0&&x.choice<3).slice(-70)
  .map(x=>({...clean(x),choice:x.choice,official:String(x.official||'').slice(0,22)})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'&&Number.isInteger(x.year)&&x.year>l.year&&x.year<=l.year+5)
  .slice(-45).map(x=>({id:x.id.slice(0,65),year:x.year,text:x.text.slice(0,220)})):[];
 s.memory=Array.isArray(o.memory)?o.memory.filter(x=>typeof x==='string').slice(-20).map(x=>x.slice(0,200)):[];
 s.memories=Array.isArray(o.memories)?o.memories.filter(x=>typeof x==='string').slice(-26).map(x=>x.slice(0,200)):[];
 s.lastSource=Object.values(SOURCES).includes(o.lastSource)?o.lastSource:null;
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V5?.summary||!V9?.ensure||!V18?.ensure||Sim.Life.prototype.__joseon19)return false;
 const L=Sim.Life,oldTick=L.prototype.tick,oldGet=L.prototype.getChoice,
  oldChoose=L.prototype.choose,oldReflect=L.prototype.reflect,oldSnap=L.prototype.snapshot,oldRestore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this)||this.year>1869)return oldTick.call(this);
  // The existing v18 tax events read this governor's policy, so seed the
  // official before the old tick's nested modules run.
  if(era(this))ensure(this);
  const before=this.year,ok=oldTick.call(this);
  if(ok&&this.alive&&this.year!==before&&era(this))yearly(this,ensure(this));
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon19:'))return prompt(this);
  return oldGet.call(this);
 };
 L.prototype.choose=function(i){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon19:'))return choose(this,i);
  const ok=oldChoose.call(this,i);if(ok&&era(this))promote(this,ensure(this));return ok;
 };
 L.prototype.reflect=function(t){const ok=oldReflect.call(this,t);if(ok&&era(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const data=oldSnap.call(this);if(J.isJoseon(this))data.joseon19=JSON.parse(JSON.stringify(ensure(this)));return data;};
 L.restore=function(data){const l=oldRestore.call(this,data);if(l&&J.isJoseon(l))hydrate(l,data);return l;};
 Object.defineProperty(L.prototype,'__joseon19Carry',{value:inherit});
 Object.defineProperty(L.prototype,'__joseon19',{value:true});return true;
}
install();
return Object.freeze({EVENTS,SOURCES,ensure,appoint,yearly,choose,prompt,summary,hydrate,inherit,install});
});
