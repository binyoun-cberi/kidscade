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
  '전임 수령이 떠나고 새 수령이 부임했다. 관아 앞이 붐비고, 사람들은 올해 거둘 세금이 달라질지 수군거린다.',[
  choice('지난해 잘못 매겨진 세곡 내역을 적어 새 수령에게 낸다','고을 수령이 바뀌었다. 우리 집과 이웃이 실제로 낸 양을 장부와 대조해 낼 근거를 마련한다.','새 수령 앞에 지난해 납부한 곡식과 장부 차이를 적어 냈다. 바로 돌려받은 것은 아니었다.',{proof:2,petitions:1,confidence:1},'petition'),
  choice('새 수령이 처음 거두는 세곡의 명목과 수량을 확인한다','부임 인사만으로는 청렴함을 판단하기 어렵다. 이번에 실제로 무얼 걷는지 관찰해 이전 기록과 비교한다.','새 수령이 지시한 세목과 수량을 비교했다. 말보다 실제 납부 방식이 어떠한지 더 살폈다.',{knowledge:2,confidence:1},'watch'),
  choice('억울한 세금을 낸 이웃과 함께 탄원서를 묶는다','한 집의 말만 들리지 않을 수 있다. 각자 낸 액수를 확인해 이름과 요구를 한 장에 적는다.','이웃과 탄원서에 적을 사례를 모았다. 함께 나선 이름들이 관아에 알려질 위험도 생겼다.',{petitions:2,solidarity:2,anger:1},'organize')],(l,s)=>s.office.from===l.year),
 event('clerkNetwork','새 수령 아래에도 남은 아전들',
  '수령은 바뀌었지만 장부를 들여다보는 아전의 얼굴은 낯익다. 지난해 낸 세금이 잘못 적혔다며 따지는 사람들이 관아 앞에 모인다.',[
  choice('작년 납부 장부와 새 장부의 숫자를 한 줄씩 맞춘다','수령은 바뀌어도 아전이 쓴 장부는 남는다. 어느 집의 수량이 달라졌는지 표시한다.','옛 장부와 새 장부의 다른 줄에 표시를 남겼다. 누가 고쳤는지 확인할 근거가 생겼다.',{proof:3,petitions:1},'record'),
  choice('장부를 담당한 아전에게 잘못된 집의 수량을 보여 준다','소문이 아니라 직접 낸 영수 내용을 들고 묻는다. 아전과 얼굴을 붉힐 위험이 있다.','납부 내역과 장부의 수량을 아전에게 대조해 달라고 요구했다. 수정 약속은 받지 못했다.',{anger:3,retaliation:1,proof:1},'object'),
  choice('이웃에게 낸 세금의 종류와 날짜를 물어 한 장에 모은다','집마다 낸 세금을 비교하면 일괄 과징수인지 판단할 수 있다. 다른 집의 동의 없이 이름을 적지 않는다.','서로 동의한 집의 납부 날짜와 양을 모았다. 공통으로 잘못 적힌 항목을 찾기 시작했다.',{solidarity:3,proof:3},'organize')]),
 event('levyRequest','수령의 추가 징수 요구',
  '아전이 집집마다 돈과 곡식을 더 내라고 전한다. 무슨 명목이냐 묻자 예부터 그래 왔다는 대답만 돌아온다.',[
  choice('아전에게 추가로 걷는 세목과 관아 문서를 보여 달라 한다','무엇을 위해 더 내는지 알려 주지 않았다. 요구를 받은 날짜와 명목을 정확히 적어 둔다.','추가 징수의 명목을 묻고 답을 기록했다. 관아는 여전히 곡식을 더 내라 재촉했다.',{proof:2,petitions:1,anger:1},'record'),
  choice('지금 낼 곡식을 덜어 놓고 다음 철 먹을 양을 줄인다','징수를 거절하면 당장 관아와 충돌한다. 먼저 내지만 남은 식구의 먹을 몫이 줄어든다.','곡식을 내고 곳간의 양을 다시 셌다. 다음 수확 전에 무엇을 줄일지 의논해야 했다.',{grain:-4,landDebt:2,anger:2},'pay'),
  choice('같은 요구를 받은 집들과 수량을 맞춰 감면을 청한다','여러 집이 낸 추가 곡식을 비교해 잘못된 부분을 말한다. 앞장선 사람을 관아가 눈여겨볼 수 있다.','이웃의 납부량을 모아 감면을 청했다. 관아가 받아들일지 알 수 없어 함께 기다렸다.',{solidarity:3,petitions:1,anger:2,retaliation:1},'petition')]),
 event('favorPressure','권세가의 이름을 앞세우는 사람들',
  '서울의 권세 있는 집안을 들먹이는 사람이 관아를 드나든다. 사람들은 어제 내린 결정이 오늘 뒤집힐까 봐 눈치를 본다.',[
  choice('권세가의 부탁을 받은 사람과 요구 날짜를 적는다','말로만 떠도는 소문은 증거가 되기 어렵다. 누가 어떤 결정을 바꾸려 했는지 사실과 추측을 나눈다.','관아를 드나든 사람과 부탁의 내용을 적어 두었다. 모르는 부분은 확인되지 않았다고 표시했다.',{proof:3,integrity:1},'record'),
  choice('권세가의 청탁이 있는 자리에서 빠져나온다','그들의 부탁에 가담하지 않으려 한다. 대신 관계를 거절했다는 이유로 불이익을 받을 수도 있다.','청탁 이야기가 시작된 자리를 떠났다. 그 결정이 누구에게 영향을 주었는지는 알아내지 못했다.',{retaliation:1,confidence:1},'avoid'),
  choice('부당하게 뒤집힌 결정의 이유를 주민들과 물어본다','나 혼자 따지기 어렵다. 당사자의 동의를 얻어 함께 질문하지만 관아의 반감을 살 수 있다.','당사자의 설명을 듣고 관아에 이유를 물었다. 분명한 답을 얻지 못한 채 사람들이 사정을 나눴다.',{solidarity:3,petitions:1,anger:2},'petition')]),
 event('goodMagistrate','백성의 사정을 듣는 수령',
  '수령이 관아 앞에 모인 백성의 말을 듣겠다고 한다. 해묵은 장부를 들고 온 사람들이 저마다 사연을 털어놓기 시작했다.',[
  choice('잘못 거둔 군포·세곡 영수 내역을 관아에 제출한다','수령이 민원을 듣는다기에 날짜와 납부량을 모아 찾아갔다. 실제로 바로잡을 수 있는 범위는 제한될 수 있다.','수령에게 납부 기록을 내고 잘못 걷힌 항목을 가리켰다. 일부만 다시 확인하겠다는 답을 들었다.',{proof:2,petitions:1,relief:2,confidence:2},'petition'),
  choice('부당하게 세금을 낸 여러 집의 사례를 차례로 증언한다','한 사람의 사례로는 규모를 알기 어렵다. 각 집이 허락한 내용을 차례로 말해 공통 문제를 드러낸다.','여러 집의 사례를 듣고 순서대로 전했다. 조사받을 집의 이름을 구분해 두었다.',{solidarity:4,petitions:1,confidence:2},'organize'),
  choice('곡식이 떨어진 집의 수를 세어 공동 창고 개방을 청한다','구휼을 바란다면 몇 집이 굶는지와 어떤 곡식이 필요한지 알아야 한다. 수령이 허락하리라는 보장은 없다.','어려운 집의 수와 필요한 곡식을 적어 수령에게 냈다. 창고를 열어 줄지는 기다려야 했다.',{solidarity:2,grain:2,confidence:2},'mutual')
 ],(l,s)=>s.office.integrity>=65),
 event('corruptMagistrate','수령의 사사로운 이익과 고을의 부담',
  '수령이 거둔 곡식을 사사롭게 쓴다는 소문이 장터에 퍼졌다. 사람들은 속삭이면서도 관아에 나서서 따질 엄두를 내지 못한다.',[
  choice('거둔 세곡의 양과 수령이 가져갔다는 말의 출처를 적는다','소문만으로는 따지기 어렵다. 실제 영수와 목격자를 구분해 남기려 한다.','서로 확인할 수 있는 납부 기록과 들은 말의 출처를 따로 적었다. 아직 비리를 입증하진 못했다.',{proof:4,petitions:1,anger:2},'record'),
  choice('관아에서 낸 곡식이 어디로 갔는지 직접 따진다','수령의 사적 사용이 의심된다. 관아에 나서서 질문하면 보복을 당할 가능성이 있다.','곡식 사용처를 물었으나 제대로 된 답을 듣지 못했다. 관아의 눈길이 자신에게 향했다.',{proof:1,anger:4,retaliation:3},'object'),
  choice('추가 징수에 대비해 가족의 곡식과 빚을 다시 계산한다','관아와 맞설 힘이 부족하다. 먼저 집안의 끼니와 빚을 정리하지만 부당한 징수는 남는다.','남은 곡식과 빚을 적고 지출을 줄였다. 수령의 부정 의혹은 해결되지 않았다.',{capital:-2,bonds:2},'survive')
 ],(l,s)=>s.office.integrity<=43),
 event('appointedClerk','아전에게 내려온 부당한 징수 지시',
  '관아에서 장부를 맡은 당신에게 윗사람이 징수한 곡식의 숫자를 고쳐 적으라 한다. 곁에 선 동료가 조용히 눈치를 준다.',[
  choice('실제로 낸 곡식 수량을 바꾸지 않고 장부에 적는다','윗사람이 숫자를 고치라 지시했다. 사실대로 적으면 불이익을 받을 수 있지만 다른 집의 빚을 늘리지 않는다.','실제 받은 곡식과 납부자의 이름을 그대로 적었다. 지시를 거부했다는 이유로 문책받을 수도 있었다.',{proof:4,integrity:4,retaliation:2},'refuse'),
  choice('윗사람의 지시대로 곡식 수량을 부풀려 적는다','지시를 따르면 당장의 자리는 지킬지 몰라도 억울한 세금이 다른 집에 돌아간다.','장부에 실제보다 많은 곡식을 적었다. 차액을 메워야 하는 집이 생겼다.',{corruption:4,capital:3,anger:4,confidence:-3},'complicit'),
  choice('다른 아전과 함께 지시서 사본을 상급 관청에 전한다','단독으로 맞서기 어렵다. 누가 지시했고 어디가 틀렸는지 정리해 함께 책임을 지려 한다.','동료와 지시 내용을 적어 상급 관청에 알렸다. 조사와 책임이 뒤따를지 아직 알 수 없었다.',{proof:3,petitions:2,integrity:2},'petition')
 ],(l,s)=>/서리|아전|관료|수령|관리/.test(V5.summary(l).origin+' '+V5.summary(l).role)),
 event('petitionsBlocked','여러 번 올린 탄원이 돌아오다',
  '고을 사람들이 올린 탄원에 좀처럼 답이 오지 않는다. 관아 문턱을 여러 차례 드나든 이웃이 오늘도 빈손으로 돌아왔다.',[
  choice('답이 없었던 탄원 날짜와 증언을 다시 대조한다','무엇이 반려됐는지 정확히 알아야 다음 요구를 고칠 수 있다. 종이와 인편에 시간이 든다.','돌아온 문서의 날짜와 빠진 증언을 확인했다. 다음에 제출할 내용을 정리할 수 있었다.',{proof:3,petitions:1},'record'),
  choice('다른 고을 관청에 보낼 문서의 근거를 따로 모은다','같은 관아에만 내서는 답을 얻기 어렵다. 다른 경로를 쓰면 보복이나 비용이 뒤따를 수 있다.','상급 관청에 전할 문서를 정리했다. 전달됐는지까지 확인하려면 시간이 더 필요했다.',{contacts:2,petitions:1,retaliation:1},'appeal'),
  choice('탄원을 잠시 멈추고 밀린 품일로 식량을 마련한다','관아를 오가는 동안 집안에 일할 사람이 없었다. 억울함을 남겨 둔 채 당장의 끼니를 구한다.','며칠 품을 팔아 곡식을 마련했다. 끝내 해결되지 않은 세금 문제는 마음에 남았다.',{anger:2,bonds:2,capital:1},'work')
 ],(l,s)=>s.petitions>=1),
 event('unknownTraveler','고을 사정을 묻는 낯선 나그네',
  '허름한 차림의 나그네가 장터에서 세금과 형벌에 대해 묻고 다닌다. 그의 정체를 아는 사람은 없다.',[
  choice('나그네에게 실제 낸 세금의 수량과 날짜만 알려 준다','낯선 사람이 누구인지 알 수 없다. 본인이 직접 확인한 사실만 말하고 추측은 구분한다.','자신이 낸 곡식의 날짜와 양을 이야기했다. 나그네가 누구인지는 끝내 확인하지 못했다.',{proof:2,contacts:1},'witness'),
  choice('말해도 된다는 이웃의 허락을 받아 피해 사례를 전한다','다른 집의 이름과 형편을 함부로 알려서는 안 된다. 동의를 얻은 이야기만 전달한다.','이웃이 허락한 납부 내역을 나그네에게 전했다. 그가 실제로 조사할지는 알 수 없었다.',{solidarity:2,petitions:1},'organize'),
  choice('확인하지 못한 소문에는 모른다고 답한다','나그네의 정체와 목적이 불확실하다. 지어낸 말을 보태지 않고 직접 본 것만 말한다.','모르는 일은 모른다고 말했다. 나그네는 적어 온 내용을 다시 확인하며 떠났다.',{integrity:2,confidence:1},'caution')
 ],(l,s)=>s.audit.state==='rumor','inspector'),
 event('inspection','암행어사 또는 감찰의 조사',
  '감찰에 나선 관리들이 관아의 장부를 살핀다는 소식이 퍼졌다. 증언하려는 이들이 모여들고 아전들은 문서 꾸러미를 옮기느라 분주하다.',[
  choice('날짜가 적힌 영수와 납부 장부를 감찰 관리에게 낸다','잘못 징수된 곡식을 밝히기 위해 실제 문서를 보여 준다. 감찰이 모두 바로잡을 수는 없다.','영수와 장부를 펼쳐 보이고 불일치한 항목을 지적했다. 관리들이 내용을 적어 갔다.',{proof:3,petitions:1,auditEvidence:4},'evidence'),
  choice('억울하게 벌받은 이웃의 허락을 얻어 증언을 전한다','형벌 문제를 제기하려면 당사자의 뜻을 먼저 들어야 한다. 사람과 날짜를 확인해 말한다.','당사자가 허락한 범위에서 벌을 받은 경위를 전했다. 조사 후 어떤 처분이 날지는 알 수 없었다.',{solidarity:3,petitions:1,auditEvidence:3},'witness'),
  choice('감찰이 끝날 때까지 가족과 지낼 곳을 정해 조용히 있는다','조사에 나서면 관아의 관심을 받을까 두렵다. 직접 증언하지 않되 식구의 일상을 지킨다.','식구들과 일을 계속하며 조사 결과를 기다렸다. 확인되지 않은 소문은 옮기지 않았다.',{confidence:-1,retaliation:0},'wait')
 ],(l,s)=>s.audit.state==='investigating','inspector'),
 event('auditOutcome','감찰 뒤에도 남은 고을의 일',
  '감찰에서 살핀 내용이 조정에 보고되었다. 고을 사람들은 결과를 전해 듣고도 걷힌 곡식과 억울한 벌을 어떻게 할지 다시 이야기를 나눈다.',[
  choice('감찰 결과의 시정 항목과 실제 돌려받은 곡식을 비교한다','보고서가 나와도 잘못 걷힌 곡식이 즉시 돌아오지는 않는다. 이행 여부를 따져 본다.','감찰 문서에 적힌 조치와 실제 달라진 징수를 비교했다. 남은 부담을 따로 적었다.',{proof:2,confidence:1},'record'),
  choice('구휼을 받지 못한 집을 찾아 부족한 곡식을 나눠 준다','조사가 끝나도 굶는 집은 남을 수 있다. 우리 집 곳간을 조금 덜어 당장 먹을 것을 건넨다.','아직 곡식이 없는 집에 먹을 것을 가져갔다. 관아의 처분과 별개로 그날의 끼니를 도왔다.',{solidarity:3,grain:-2},'mutual'),
  choice('새 수령에게 감찰 후에도 남은 세금 내역을 정리해 낸다','고쳐지지 않은 항목을 다시 제출해야 한다. 재차 탄원하면 시간과 힘이 더 든다.','수령에게 남은 징수 문제를 적어 전달했다. 언제 시정될지는 더 기다려야 했다.',{petitions:1,confidence:1},'petition')
 ],(l,s)=>s.audit.state==='reported','inspector'),
 event('patronageCost','권세가의 후원을 둘러싼 관직 인사',
  '서울의 권세가를 등에 업고 벼슬을 얻었다는 소문이 돌고 있다. 사람들은 새 수령이 누구의 뜻을 따르고, 그 대가를 누구에게 거둘지 걱정한다.',[
  choice('벼슬을 얻은 이와 징수가 늘어난 시기를 장부에 대조한다','권세가의 청탁이 세금에 영향을 줬다는 의혹을 사실과 구분하려 한다. 어느 해부터 달라졌는지 먼저 본다.','인사 뒤 달라진 세금의 항목을 적었다. 관직 거래가 실제 원인인지는 확인되지 않았다.',{knowledge:3,proof:2},'record'),
  choice('권세가의 인맥을 통해 관아에 물건을 납품하려 한다','돈을 벌 기회가 있지만 계속 청탁을 들어달라는 요구를 받을 수 있다. 관계에 기대는 선택이다.','관아에 물건을 납품할 길을 알아봤다. 소개해 준 사람의 부탁이 나중에 부담이 될 수 있었다.',{contacts:3,corruption:2,capital:1},'network'),
  choice('청탁 자리는 피하고 직접 만드는 물건을 장터에 판다','관아의 인맥에 기대지 않고 살림을 이어 가려 한다. 당장 큰돈을 벌 기회는 줄어든다.','관아 사람들과의 거래 대신 직접 만든 물건을 장터에 내놓았다. 이익은 작아도 거래 조건을 스스로 정했다.',{integrity:2,bonds:2},'independent')
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
  intro+=' 소문의 진상을 아는 사람은 여전히 드물다.';
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
   integrity:clip(Number.isFinite(ooff.integrity)?ooff.integrity:40,0,100),
   patronage:clip(Number.isFinite(ooff.patronage)?ooff.patronage:40,0,100),
   clerks:clip(Number.isFinite(ooff.clerks)?ooff.clerks:30,0,100),
   levy:clip(Number.isFinite(ooff.levy)?ooff.levy:30,0,100),
   reason:String(ooff.reason||'').slice(0,50)};
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
