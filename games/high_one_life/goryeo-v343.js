/* 고려 후기: 연도·지역에 묶인 사건과 가구 생업. 자원과 확률은 게임용이다. */
(function(root){
'use strict';
const L=root.OneLifeSim.Life, origins=root.OneLifeIdentity20.GORYEO_ORIGINS;
const regions=['개경 일대','강화','서북 내륙','충청 내륙','경상 내륙','서남 해안','탐라'];
const jobs=['농사','삼베 짜기','모시 짜기','바구니 만들기','나루 일','글과 셈'];
const plans=['돌봄','배움','농사','삼베 짜기','모시 짜기','바구니 만들기','나루 일','옷 짓기','솜이불 만들기','휴식'];
const is=l=>!!l&&l.birthYear>=1200&&l.birthYear<1392;
const copy=x=>JSON.parse(JSON.stringify(x));
const num=(x,min,max,fallback)=>Number.isFinite(x)?Math.max(min,Math.min(max,x)):fallback;
const log=(l,text,kind='life')=>l.logEvent(text,'goryeo-'+kind);
const subject=name=>{const c=name.charCodeAt(name.length-1);return name+(c>=0xac00&&c<=0xd7a3&&(c-0xac00)%28?'이':'가');};
function annualAccount(g,expense){
 return '올해 집안에 들어온 곡식은 '+g.lastIncome+'말이었다. 끼니와 살림에 '+expense+'말을 썼다.';
}
const CHOICE_PROSE=Object.freeze({
 '가족과 가까운 산골로 피한다':'가족과 가까운 산골로 몸을 피했다.',
 '친척에게 몸을 의탁한다':'친척에게 의지해 피란할 자리를 구했다.',
 '남아서 살림을 지킨다':'살던 곳에 남아 살림을 지키기로 했다.',
 '가족과 내륙으로 피한다':'가족과 내륙으로 피란길에 올랐다.',
 '남아서 운송 일을 맡는다':'떠나지 않고 관청이 요구한 운송 일을 맡았다.',
 '당분간 몸을 숨긴다':'한동안 몸을 숨기며 바깥의 소식을 기다렸다.',
 '배를 만드는 일에 나간다':'집을 떠나 배를 만드는 일에 동원되었다.',
 '곡식을 내고 가족 곁에 남는다':'요구받은 곡식을 내고 가족 곁에 남았다.',
 '친척과 부담을 나눈다':'친척과 곡식과 일손의 부담을 나누었다.',
 '고향으로 돌아가 다시 일군다':'고향으로 돌아가 살림을 다시 일구기 시작했다.',
 '지금 머무는 곳에 뿌리내린다':'피란해 머물던 곳에서 살림을 계속하기로 했다.',
 '친족과 증인을 찾아 청원한다':'친족과 증인을 찾아 집안 사정을 관청에 청원했다.',
 '집안 문서를 보관하며 기다린다':'집안 문서를 간수하며 관청의 처분을 기다렸다.',
 '생업에 힘을 남겨 둔다':'관청 일을 알아보는 대신 당장의 생업에 품을 썼다.',
 '일을 도우며 기술을 배운다':'종이와 책을 다루는 일을 도우며 기술을 배웠다.',
 '집안 생업을 지킨다':'집안에서 해 오던 생업을 이어 갔다.',
 '곡식을 보태 책 만드는 일을 후원한다':'가지고 있던 곡식을 덜어 책 만드는 일에 보탰다.',
 '새 관청의 문서와 명령을 알아본다':'새 관청에서 내린 문서와 명령을 알아보았다.',
 '양쪽 친족과 살림을 의논한다':'양쪽 친족과 앞으로의 살림을 의논했다.',
 '하던 생업을 이어 간다':'나라가 바뀐 뒤에도 하던 생업을 이어 갔다.',
 '들에서 나물을 모은다':'들에서 나물을 모으며 손으로 할 수 있는 일을 거들었다.',
 '글자를 배우고 싶다고 청한다':'글자를 배우고 싶다고 집안 어른에게 청했다.',
 '집안일을 돕는다':'집안에서 할 수 있는 일을 찾아 거들었다.',
 '장터에서 군것질을 산다':'장터에서 군것질거리를 사 먹었다.',
 '맡은 농사일을 익힌다':'맡겨진 농사일을 하며 손에 익혔다.',
 '함께 일하는 이에게 기술을 배운다':'함께 일하는 이에게 서툰 대목을 물어 기술을 배웠다.',
 '틈틈이 글과 셈을 배운다':'맡은 일을 하는 틈틈이 글과 셈을 배웠다.',
 '농사와 물길을 배운다':'논밭을 돌보고 물길을 살피는 일을 배우기 시작했다.',
 '삼베와 모시 짜는 일을 배운다':'삼베와 모시를 짜는 일을 배워 생업으로 삼았다.',
 '글과 셈을 배운다':'글과 셈을 익히며 그 일로 살림을 꾸릴 길을 잡았다.',
 '나루에서 일하는 법을 배운다':'나루에서 일하는 법을 배우며 생업을 시작했다.',
 '농사와 살림을 꾸린다':'농사를 지으며 살림을 꾸릴 길을 정했다.',
 '천을 짜는 기술을 익힌다':'천을 짜는 기술을 익혀 벌이를 꾸리기 시작했다.',
 '나루에서 일할 길을 찾는다':'나루의 일을 생업으로 삼기로 했다.',
 '혼인을 허락해 달라고 청한다':'함께 살고 싶은 뜻을 전하고 혼인을 허락해 달라고 청했다.',
 '지금은 식구를 돌본다':'혼담을 서두르지 않고 식구들을 돌보았다.',
 '배우자 집 가까이서 살림을 시작한다':'양쪽 집안과 의논해 배우자 집 가까이에 살기로 했다.',
 '내가 살던 곳에서 함께 산다':'혼인 뒤에도 살던 곳에서 함께 살기로 했다.',
 '지금은 혼인하지 않는다':'당장은 혼인하지 않고 지금의 생활을 이어 갔다.',
 '먹을 것과 돌봄을 먼저 챙기라고 부탁한다':'집으로 소식을 보내 먹을 것과 식구 돌봄을 먼저 챙겨 달라고 부탁했다.',
 '생업의 판단을 집안에 맡긴다':'멀리서 생업을 정하기 어려워 집에 남은 식구들의 판단에 맡겼다.',
 '곡식을 보내 달라고 청한다':'집안에 곡식을 보내 달라고 청했다.',
 '심부름을 하고 먹을거리를 받는다':'장터에서 심부름을 하고 먹을거리를 받았다.',
 '숲에서 먹을 것을 찾는다':'숲에서 먹을 것을 찾아 모았다.',
 '군것질을 사 먹는다':'모아 둔 돈으로 군것질거리를 사 먹었다.',
 '배움에 시간을 쓴다':'장터에서 남은 시간을 배움에 썼다.',
 '생업의 기술을 더 익힌다':'하던 생업에서 서툰 대목을 연습하며 솜씨를 익혔다.',
 '사찰에 곡식을 보시한다':'집안의 곡식을 덜어 사찰에 보시했다.',
 '양쪽 친족을 찾아 돕는다':'양쪽 친족을 찾아가 필요한 일을 거들었다.',
 '목화씨와 재배법을 구해 시험한다':'목화씨와 재배법을 구해 시험 삼아 길러 보기 시작했다.',
 '곡식을 비축하고 쉰다':'곡식을 아껴 두고 몸을 쉬었다.'
});
function ensure(l){
 if(!is(l))return null;
 if(l.goryeo343)return l.goryeo343;
 root.OneLifeWorld2.enrich(l);
 const origin=l.birthSetup.origin||origins[Math.floor(l.rand()*origins.length)];
 const region=regions[Math.floor(l.rand()*regions.length)];
 const person=(id,name,role,age)=>({id,name,role,birthYear:l.birthYear-age,alive:true,plan:'농사',relationship:60,health:80});
 const g={version:1,origin,region,home:region,grain:origin==='관료 가문'?48:origin==='노비 가구'?12:28,cloth:2,clothes:0,quilts:0,pocket:0,
  land:origin==='관료 가문'?4:1,job:'아직 정해지지 않음',belief:'집안의 신앙',bound:origin==='노비 가구',
  away:0,refuge:false,kin:0,skill:0,cottonTrial:0,cotton:false,crop:'곡식',lastIncome:0,lastExpense:0,history:[],seen:[],choice:null,
  people:[person('mother','어머니','어머니',24+Math.floor(l.rand()*10)),person('father','아버지','아버지',27+Math.floor(l.rand()*10))]};
 l.goryeo343=g;
 if(origin==='수공업 가구')g.people[0].plan='삼베 짜기';
 if(origin==='나루의 사공 가구')g.people[1].plan='나루 일';
 if(origin==='향리 가문')g.skill=1;
 l.profile.name=l.birthSetup.name||['김연','이송','박온','최은','정수'][l.seed%5];
 l.profile.city=region;l.profile.settlement='마을';l.profile.motherJob='농사와 길쌈';l.profile.fatherJob=origin==='향리 가문'?'고을의 문서 실무':'농사와 부역';
 l.career=g.job;
 log(l,region+'의 '+origin+'에서 태어났다. 어머니와 아버지 양쪽 친족이 집안을 오간다.','family');sync(l);return g;
}
function sync(l){const g=l.goryeo343;l.profile.city=g.region;l.money.netWorth=g.grain;l.money.income=g.lastIncome;l.money.expense=g.lastExpense;l.career=g.job;}
function period(l){return l.year<1231?'무신 집권기':l.year<1270?'몽골 침입기':l.year<1356?'원 간섭기':l.year<1392?'개혁과 전쟁':'조선 건국 이후';}
function cottonAvailable(l){const g=ensure(l);return l.year>=1370&&(g.region==='경상 내륙'||l.year>=1390)&&g.cotton;}
function option(label,effect,delta={},note){return note?{label,effect,delta,note}:{label,effect,delta};}
function prompt(l,id,title,description,options){const g=ensure(l);g.choice={id,title,description,options};l.pending='goryeo343:'+id;}
const facts=[
 [1231,'몽골군의 침입','몽골군이 고려를 침입했다. 전쟁은 여러 차례 이어졌다.','war'],
 [1232,'강화 천도','고려 조정이 강화로 옮겨 갔다. 섬으로 들어가지 못한 사람들도 많았다.','war'],
 [1236,'대장경 조판','전쟁 속에서 대장경 목판을 새기는 사업이 시작되었다.','printing'],
 [1259,'몽골과의 강화','고려와 몽골 사이에 강화가 이루어졌다. 폐허가 된 삶은 곧바로 회복되지 않았다.','peace'],
 [1270,'개경 환도와 삼별초','조정이 개경으로 돌아갔다. 삼별초는 이에 반발하며 항쟁을 시작했다.','sambyeolcho'],
 [1273,'삼별초 항쟁의 종결','탐라에서 삼별초 항쟁이 진압되었다. 섬과 해안의 주민도 큰 피해를 겪었다.','peace'],
 [1274,'일본 원정의 부담','고려와 원의 일본 원정으로 선박과 군량, 인력을 마련하는 부담이 커졌다.','levy'],
 [1281,'다시 이어진 원정','두 번째 일본 원정을 위한 동원이 이루어졌다.','levy'],
 [1356,'공민왕의 개혁','공민왕이 원의 간섭을 줄이려는 조치를 추진했다.','reform'],
 [1359,'홍건적의 침입','홍건적이 고려를 침입했다. 북쪽에서 피란 소식이 전해졌다.','war'],
 [1361,'개경의 함락','다시 침입한 홍건적에게 개경이 함락되었다. 왕과 조정은 남쪽으로 피란했다.','war'],
 [1364,'목화 재배의 시도','문익점이 가져온 목화씨를 기르는 시도가 이루어졌다. 씨앗과 재배법이 곧장 온 나라에 퍼진 것은 아니었다.','cotton'],
 [1366,'전민변정도감','빼앗긴 토지와 부당하게 노비가 된 사람의 문제를 바로잡으려는 조사가 추진되었다.','land'],
 [1377,'흥덕사의 인쇄와 화통도감','청주 흥덕사에서 직지가 금속활자로 인쇄되었다. 화통도감도 설치되었다.','printing'],
 [1380,'진포의 전투','진포에서 화포를 활용한 수군의 전투가 벌어졌다. 해안 사람들은 왜구의 침입과 군량 동원을 함께 겪었다.','coast'],
 [1388,'위화도 회군','요동 정벌에 나섰던 군대가 위화도에서 돌아왔다. 정치의 향방이 흔들렸다.','reform'],
 [1391,'과전법','과전법이 공포되었다. 관리에게 세금을 거둘 권리를 나누는 제도의 변화이며, 모든 농민에게 땅을 주는 정책은 아니었다.','land'],
 [1392,'새 왕조의 시작','고려가 끝나고 조선이 세워졌다. 왕조가 바뀌어도 가족과 생업의 문제는 남았다.','transition']
];
function historical(l){
 const g=ensure(l),f=facts.find(f=>f[0]===l.year);if(!f)return false;
 g.history.push({year:f[0],title:f[1],text:f[2]});log(l,f[2],'fact');
 if(l.age<8)return false;
 const north=['개경 일대','강화','서북 내륙'].includes(g.region),coast=['서남 해안','탐라','강화'].includes(g.region);
 if(f[3]==='war'&&((l.year<1260&&g.region!=='탐라')||(l.year>1350&&north))){
  prompt(l,'war-'+l.year,'전란 속에서 어디로 갈까?',g.region+'에도 전쟁의 소식이 닿았다. 집을 떠나려면 길에서 먹을 곡식부터 챙겨야 한다.',[
   option('가족과 가까운 산골로 피한다','refuge',{grain:-6,health:-3,bonds:4}),
   option('친척에게 몸을 의탁한다','kin-refuge',{grain:-4,bonds:3}),
   option('남아서 살림을 지킨다','stay',{grain:-8,health:-7})]);return true;
 }
 if(f[3]==='sambyeolcho'&&coast){prompt(l,'sambyeolcho','갈라진 명령 사이에서','군대와 관청의 명령이 엇갈린다. 어느 명령을 따라야 식구들을 지킬 수 있을지 마음이 복잡하다.',[
  option('가족과 내륙으로 피한다','inland',{grain:-8,bonds:3}),option('남아서 운송 일을 맡는다','transport',{grain:4,health:-8}),option('당분간 몸을 숨긴다','refuge',{grain:-6,health:-3})]);return true;}
 if(f[3]==='levy'&&coast&&l.age>=16&&l.age<=55){prompt(l,'levy-'+l.year,'배와 군량을 마련하라는 명령','해안의 가구에 물자와 노동을 요구한다. 먼 곳으로 일을 나가면 집안일은 남은 식구들이 떠맡는다.',[
  option('배를 만드는 일에 나간다','away',{grain:5,health:-5}),option('곡식을 내고 가족 곁에 남는다','none',{grain:-10}),option('친척과 부담을 나눈다','kin',{grain:-5,bonds:3})]);return true;}
 if(f[3]==='peace'&&g.refuge){prompt(l,'return-'+l.year,'고향에 돌아갈까?','전쟁이 잦아들었다는 소식이 왔다. 집과 밭이 남아 있을지는 알 수 없다.',[
  option('고향으로 돌아가 다시 일군다','return',{grain:-4,health:-2}),option('지금 머무는 곳에 뿌리내린다','settle',{grain:-2,bonds:3})]);return true;}
 if(f[3]==='land'&&l.age>=16){prompt(l,'land-'+l.year,'토지와 신분을 적은 문서','관청의 조사가 집안에 어떤 영향을 줄지 살핀다. 문서와 증인을 모아도 관청이 우리 편을 들어줄지는 알 수 없다.',[
  option('친족과 증인을 찾아 청원한다','petition',{grain:-4,knowledge:3}),option('집안 문서를 보관하며 기다린다','none',{knowledge:2}),option('생업에 힘을 남겨 둔다','none',{grain:2})]);return true;}
 if(f[3]==='printing'&&l.age>=14&&(g.job==='글과 셈'||g.job.includes('짜기')||g.region==='충청 내륙')){
 prompt(l,'printing-'+l.year,'종이와 책을 다루는 일','사찰과 인연이 있는 사람이 종이 운반과 인쇄 보조 일을 소개했다. 판을 새기거나 활자를 다루는 기술은 오랜 배움이 필요하다.',[
  option('일을 도우며 기술을 배운다','printing',{grain:3,knowledge:5}),option('집안 생업을 지킨다','none',{grain:2}),option('곡식을 보태 책 만드는 일을 후원한다','donate',{grain:-4,bonds:3})]);return true;}
 if(f[3]==='transition'&&l.age>=8){prompt(l,'transition','고려에서 시작한 삶, 조선으로','나라의 이름이 바뀌었다고 하루아침에 살림이 달라지지는 않았다. 새 관청의 소식을 들으며 다음 해를 맞았다.',[
  option('새 관청의 문서와 명령을 알아본다','none',{knowledge:4}),option('양쪽 친족과 살림을 의논한다','kin',{bonds:4}),option('하던 생업을 이어 간다','none',{grain:3})]);return true;}
 return false;
}
function everyday(l){
 const g=ensure(l);
 if(l.age>=6&&l.age<14&&!g.seen.includes('child')){prompt(l,'child','내 손으로 해 보고 싶은 일','집안의 큰일은 어른들이 정하지만, 오늘만큼은 내 손으로 해 보고 싶은 일이 생겼다.',[
  option('들에서 나물을 모은다','gather',{pocket:2,health:-1}),option('글자를 배우고 싶다고 청한다','learn',{knowledge:5,grain:-1}),option('집안일을 돕는다','none',{bonds:4}),option('장터에서 군것질을 산다','snack',{pocket:-1,happiness:4})]);return;}
 if(l.age>=14&&!g.seen.includes('vocation')){
  const choices=g.bound?[
   option('맡은 농사일을 익힌다','job:농사',{knowledge:3}),
   option('함께 일하는 이에게 기술을 배운다','skill',{knowledge:4}),
   option('틈틈이 글과 셈을 배운다','learn',{knowledge:3,grain:-1})]:[
   option('농사와 물길을 배운다','job:농사',{knowledge:3}),
   option('삼베와 모시 짜는 일을 배운다','job:삼베 짜기',{knowledge:4,grain:-2}),
   option('글과 셈을 배운다','job:글과 셈',{knowledge:6,grain:-5}),
   option('나루에서 일하는 법을 배운다','job:나루 일',{health:2})];
  prompt(l,'vocation','어떤 일을 배울까?',g.bound?'마음대로 일터를 떠날 수는 없지만, 함께 일하는 사람에게 솜씨를 배울 기회는 있다.':'집안일을 잇는 길도 있고 새로운 솜씨를 배울 길도 있다.',choices);return;
 }
 if(l.age>=14&&!g.bound&&g.origin==='노비 가구'&&g.seen.includes('vocation')&&!g.seen.includes('free-vocation')){
  prompt(l,'free-vocation','예속에서 벗어난 뒤의 생업','새로운 일을 바로 시작하기는 어렵지만, 익힌 솜씨와 친족의 도움을 바탕으로 앞으로의 일을 고른다.',[
   option('농사와 살림을 꾸린다','job:농사',{knowledge:2}),
   option('천을 짜는 기술을 익힌다','job:삼베 짜기',{knowledge:3,grain:-2}),
   option('나루에서 일할 길을 찾는다','job:나루 일',{knowledge:2})]);return;
 }
 if(l.age>=20&&g.bound&&!g.seen.includes('marriage')){prompt(l,'marriage','예속된 처지에서의 혼인','거처와 혼인을 마음대로 정하기 어렵다. 함께 살 사람과 가족의 뜻을 나누고 허락을 구할지 생각한다.',[option('혼인을 허락해 달라고 청한다','marry-request',{grain:-2}),option('지금은 식구를 돌본다','none',{bonds:3})]);return;}
 if(l.age>=20&&!g.bound&&!g.seen.includes('marriage')){prompt(l,'marriage','혼담과 살림의 자리','혼인 뒤 누구의 집 가까이 살지 양쪽 가족과 의논한다. 집안 재산과 친족의 도움도 함께 살펴야 한다.',[
  option('배우자 집 가까이서 살림을 시작한다','marry-in',{bonds:5,grain:4}),option('내가 살던 곳에서 함께 산다','marry-home',{bonds:3,grain:-3}),option('지금은 혼인하지 않는다','none',{happiness:2})]);return;}
 if(l.age>=25&&l.age<=38&&g.people.some(p=>p.role==='배우자'&&p.alive)&&!g.people.some(p=>p.role==='자녀')&&l.age%4===1){
  g.people.push({id:'child-'+l.year,name:l.rand()<.5?'딸':'아들',role:'자녀',birthYear:l.year,alive:true,plan:'돌봄',relationship:65,health:85});log(l,'아이가 태어났다. 양쪽 친족에게 소식을 보내고 돌볼 품을 나누었다.','family');}
 if(l.age>=8&&l.age%4===0){
  if(g.away){prompt(l,'letter-'+l.year,'멀리서 보내는 편지','집에서 소식이 왔다. 편지가 오가는 동안에도 식구들은 스스로 일을 정해야 한다.',[
   option('먹을 것과 돌봄을 먼저 챙기라고 부탁한다','letter-care',{bonds:3}),option('생업의 판단을 집안에 맡긴다','letter-trust',{bonds:4}),option('곡식을 보내 달라고 청한다','letter-grain',{grain:-4,pocket:2})]);return;}
  if(l.age<14){prompt(l,'pocket-'+l.year,'장터에서 쓸 것을 고르다','장터에 가는 길에 잠깐 시간이 났다.',[
   option('심부름을 하고 먹을거리를 받는다','gather',{pocket:2,bonds:1}),option('숲에서 먹을 것을 찾는다','gather',{pocket:1,health:-2}),option('군것질을 사 먹는다','snack',{pocket:-1,happiness:3}),option('배움에 시간을 쓴다','learn',{knowledge:3})]);return;}
  const title=g.grain<4?'얼마 남지 않은 곡식을 앞에 두고':l.stats.health<45?'지친 몸으로 살림을 꾸리려면':g.bound?'맡은 일 틈에 낼 수 있는 시간':l.age>=60?'남은 힘을 어디에 보탤까?':'생업과 친족 사이에서';
  prompt(l,'household-'+l.year,title,(g.bound?'맡은 일을 마음대로 바꿀 수는 없다. 남는 품으로 식구와 내 몸을 돌볼 길을 생각한다.':'배움을 잇고 싶은 마음도, 친족을 돕고 싶은 마음도 있다. 이번에는 어디에 품을 보탤지 생각한다.')+' 남은 곡식은 '+g.grain+'이다. 곡식이 모자란 일은 이번에 하지 못한다.',[
   option('생업의 기술을 더 익힌다','skill',{grain:-3,knowledge:3},'곡식 3을 쓰고 배움을 늘린다.'),option('사찰에 곡식을 보시한다','donate',{grain:-4,happiness:3},'곡식 4를 내어 마음의 위안을 얻는다.'),option('양쪽 친족을 찾아 돕는다','kin',{grain:-3,bonds:5},'곡식 3을 나누고 친족과 가까워진다.'),
   ...(l.year>=1364&&g.region==='경상 내륙'&&!g.cotton?[option('목화씨와 재배법을 구해 시험한다','cotton',{grain:-6},'곡식 6을 들여 시험한다. 목화를 거둘 수 있을지는 뒤에 알게 된다.')]:[option('남은 곡식을 아끼고 쉰다','rest',{health:4},'곡식을 쓰지 않고 몸을 회복한다. 곡식이 새로 늘지는 않는다.')])]);
 }
}
function annual(l){
 const g=ensure(l);let income=0,expense=g.origin==='향·부곡·소 주민'?5:3;
 for(const p of g.people){if(!p.alive)continue;const age=l.year-p.birthYear;expense+=age<6?1:2;
  if(age>65)p.health=Math.max(0,p.health-3);
  if(p.health<=0||(age>50&&l.rand()<(age-49)*.002)){p.alive=false;log(l,subject(p.name)+' 세상을 떠났다. 함께 꾸리던 살림에서 한 사람이 빠졌다.','family');continue;}
  if(age<6)continue;
  if(p.plan==='배움'){expense+=2;if(age>=14)g.skill+=.1;}
  else if(p.plan==='옷 짓기'||p.plan==='솜이불 만들기'){
   if(g.cloth>=2&&(p.plan!=='솜이불 만들기'||cottonAvailable(l))){g.cloth-=2;if(p.plan==='옷 짓기')g.clothes++;else g.quilts++;}
  }
  else if(p.plan==='돌봄'||p.plan==='휴식'){p.health=Math.min(100,p.health+3);l.change({health:1});}
  else {income+=age<14?1:age>65?2:5; p.health=Math.max(0,p.health-(p.plan==='나루 일'?2:1));if(p.plan.includes('짜기'))g.cloth++;}
 }
 if(l.age>=14&&!g.away){income+=g.job==='글과 셈'?5:g.job==='나루 일'?7:6;income+=Math.floor(g.skill);}
 if(g.bound)income=Math.floor(income*.55);
 if(g.refuge)income=Math.floor(income*.5);
 const harvest=Math.floor(l.rand()*7)-2;income+=harvest+g.land*2;
 if(g.crop==='목화'){if(cottonAvailable(l)){g.cloth+=2;income+=2;}else g.crop='곡식';}
 if(g.cottonTrial&&l.year>=g.cottonTrial+3){g.cotton=true;g.cottonTrial=0;log(l,'시험 삼아 기르던 목화가 자리를 잡았다. 씨앗을 남기고 실을 뽑는 법도 익혀야 한다.','followup');}
 g.lastIncome=Math.max(0,income);g.lastExpense=expense;g.grain=Math.max(0,g.grain+income-expense);
 if(g.grain===0){l.change({health:-8,happiness:-4});if(l.age%3===0)log(l,'먹을 것이 모자라 끼니를 줄였다. 식구들이 버틸 방법을 의논했다.','life');}
 if(g.away){g.away--;if(!g.away)log(l,'먼 곳의 일을 마치고 가족에게 돌아왔다. 집안의 곡식과 식구들의 얼굴부터 살폈다.','return');}
 l.change({health:l.age>55?-2:l.age>40?-1:0});
 if(l.age%5===0)log(l,annualAccount(g,expense),'life');
 sync(l);
}
function action(l,kind,id,value){
 const g=ensure(l);if(!g||!l.alive||l.pending)return false;
 if(kind==='plan'){
  const p=g.people.find(p=>p.id===id&&p.alive);if(!p||g.away||l.age<14||l.year-p.birthYear<6||!plans.includes(value))return false;
  if(l.year-p.birthYear<14&&!['배움','돌봄','휴식'].includes(value))return false;
  if(g.bound&&!['농사','돌봄','휴식'].includes(value))return false;
  if(value==='솜이불 만들기'&&!cottonAvailable(l))return false;
  if(p.plan===value)return false;p.plan=value;log(l,p.name+'과 의논해 '+value+'에 품을 쓰기로 했다.','family');return true;
 }
 if(kind==='sell'&&l.age>=14&&!g.away&&!g.bound&&['cloth','clothes','quilts'].includes(id)&&g[id]>0){g[id]--;g.grain+=id==='cloth'?2:id==='clothes'?5:8;log(l,(id==='cloth'?'옷감':id==='clothes'?'지은 옷':'솜이불')+'을 장에 내다 팔아 곡식을 마련했다.','life');sync(l);return true;}
 if(kind==='crop'&&l.age>=14&&!g.bound&&!g.away&&['곡식','목화'].includes(value)&&(value!=='목화'||cottonAvailable(l))){g.crop=value;return true;}
 return false;
}
const tick=L.prototype.tick,get=L.prototype.getChoice,choose=L.prototype.choose,snap=L.prototype.snapshot,restore=L.restore;
L.prototype.tick=function(){
 if(!is(this))return tick.call(this);const g=ensure(this);if(!this.alive||this.pending)return false;
 this.age++;this.year++;annual(this);
 if(this.age>=100||this.stats.health<=0||(this.age>45&&this.rand()<(this.age-44)*.0015)){this.finish(this.age>60?'식구들의 기억 속에 한 생을 남기고 눈을 감았다.':'병과 고단한 살림을 이기지 못하고 삶을 마쳤다.');return true;}
 if(!historical(this))everyday(this);return true;
};
L.prototype.getChoice=function(){if(!is(this))return get.call(this);const g=ensure(this);return this.pending&&g.choice?copy(g.choice):null;};
L.prototype.choose=function(index){
 if(!is(this))return choose.call(this,index);const g=ensure(this),c=g.choice;
 if(!this.alive||!this.pending||!c||!Number.isInteger(index)||!c.options[index])return false;
 const o=c.options[index],d=o.delta;
 if(d.grain<0&&g.grain<-d.grain){log(this,'필요한 곡식이 모자라 그 일은 다음으로 미루었다.','choice');}
 else if(d.pocket<0&&g.pocket<-d.pocket){log(this,'쓸 것이 없어 장터 구경만 하고 돌아왔다.','choice');}
 else {
  for(const key of ['grain','pocket'])g[key]=Math.max(0,g[key]+(d[key]||0));
  this.change(d);const e=o.effect;
  if(e.startsWith('job:'))g.job=e.slice(4);
  if(e==='refuge'||e==='kin-refuge'){g.refuge=true;if(e==='kin-refuge')g.region='충청 내륙';}
  if(e==='inland'){g.refuge=true;g.region='경상 내륙';}
  if(e==='stay'&&this.rand()<.3){g.away=3;log(this,'피란길이 막혀 가족과 떨어졌다. 돌아갈 날을 기다리며 남은 식구의 소식을 구했다.','followup');}
  if(e==='away')g.away=3;
  if(e==='return'){g.region=g.home;g.refuge=false;}
  if(e==='settle'){g.home=g.region;g.refuge=false;}
  if(e==='cotton')g.cottonTrial=this.year;
  if(e==='skill'||e==='printing')g.skill++;
  if(e==='donate')g.belief='불교 신앙과 보시';
  if(e==='kin')g.kin++;
  if(e==='letter-care')for(const p of g.people)if(p.alive)p.plan='돌봄';
  const approved=e==='marry-request'&&this.rand()<.5;
  if(e==='marry-request'&&!approved)log(this,'혼인을 청했지만 허락받지 못했다. 두 사람의 뜻만으로 정할 수 없는 처지가 남았다.','followup');
  if(e==='marry-in'||e==='marry-home'||approved){
   g.people.push({id:'spouse',name:'배우자',role:'배우자',birthYear:this.year-this.age+1,alive:true,plan:'삼베 짜기',relationship:65,health:85});this.profile.partner=true;
   log(this,e==='marry-in'?'배우자 집 가까이 살림을 차렸다. 양쪽 집안의 도움과 재산을 의논했다.':'살던 곳에서 배우자와 새 살림을 꾸렸다. 양쪽 친족에게 소식을 전했다.','family');
  }
  if(e==='petition'){
   if(this.rand()<.45){if(g.bound){g.bound=false;log(this,'증언과 문서가 받아들여져 예속에서 벗어났다. 이후의 생계는 스스로 꾸려야 했다.','followup');}else{g.land++;log(this,'청원이 받아들여져 집안의 경작권을 지켰다.','followup');}}
   else log(this,'청원은 받아들여지지 않았다. 문서를 거두어 돌아왔다.','followup');
  }
  log(this,CHOICE_PROSE[o.label]||'다음 일은 ‘'+o.label+'’ 쪽으로 정했다.','choice');
 }
 g.seen.push(c.id);g.choice=null;this.pending=null;sync(this);return true;
};
L.prototype.snapshot=function(){if(is(this))ensure(this);const s=snap.call(this);if(is(this))s.goryeo343=copy(this.goryeo343);return s;};
L.restore=function(data){const l=restore.call(this,data);if(!is(l))return l;
 const oldLog=copy(l.log),oldRng=l.rng;
 const g=ensure(l),s=data.goryeo343;l.log=oldLog;l.rng=oldRng;
 if(s&&s.version===1){
  for(const key of ['origin','region','home'])if((key==='origin'?origins:regions).includes(s[key]))g[key]=s[key];
  for(const key of ['grain','cloth','clothes','quilts','pocket','land','kin','skill','cottonTrial','away','lastIncome','lastExpense'])g[key]=num(s[key],0,key==='away'?10:key==='cottonTrial'?1500:100000,g[key]);
  for(const key of ['bound','refuge','cotton'])g[key]=s[key]===true;
  g.job=jobs.includes(s.job)?s.job:'아직 정해지지 않음';g.crop=s.crop==='목화'?'목화':'곡식';g.belief=s.belief==='불교 신앙과 보시'?s.belief:'집안의 신앙';
  g.history=Array.isArray(s.history)?s.history.filter(x=>facts.some(f=>f[0]===x.year)).map(x=>{const f=facts.find(f=>f[0]===x.year);return {year:f[0],title:f[1],text:f[2]};}):[];
  g.seen=Array.isArray(s.seen)?s.seen.filter(x=>typeof x==='string').slice(-100):[];
  if(Array.isArray(s.people))g.people=s.people.slice(0,12).filter(p=>typeof p.id==='string'&&Number.isInteger(p.birthYear)&&p.birthYear<=l.year&&p.birthYear>=l.birthYear-100).map(p=>({id:p.id.slice(0,40),name:String(p.name||'식구').slice(0,20),role:['어머니','아버지','배우자','자녀'].includes(p.role)?p.role:'자녀',birthYear:p.birthYear,alive:p.alive===true,plan:plans.includes(p.plan)?p.plan:'휴식',relationship:num(p.relationship,0,100,60),health:num(p.health,0,100,80)}));
  // Restore only a pending prompt produced by this version, never executable effects from save data.
  if(l.alive&&typeof data.pending==='string'&&data.pending.startsWith('goryeo343:')){
   const before=copy(g),rng=l.rng,logLength=l.log.length;
   g.choice=null;l.pending=null;
   if(!historical(l))everyday(l);
   const candidate=g.choice;Object.assign(g,before);l.rng=rng;l.log.length=logLength;
   if(candidate&&data.pending==='goryeo343:'+candidate.id){g.choice=candidate;l.pending=data.pending;}else{g.choice=null;l.pending=null;}
  }else{g.choice=null;l.pending=null;}
 }
 sync(l);return l;
};
root.OneLifeGoryeo343=Object.freeze({is,ensure,period,action,cottonAvailable,regions,jobs,plans,facts,choiceProse:CHOICE_PROSE});
})(window);
