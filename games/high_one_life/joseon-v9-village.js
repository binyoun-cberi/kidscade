/* Village state and episodic lives, fictional probabilities, historically contextual scenes. */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,
   root?.OneLifeJoseon4,root?.OneLifeJoseon5,root?.OneLifeJoseon8);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon9=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V4,V5,V8){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rng=(seed,salt)=>{let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;};
const coastal=new Set(['경상도','전라도','황해도','평안도','함경도','제주도']);
const mountainous=new Set(['강원도','경상도','평안도','함경도']);
const bonded=s=>['사노비','공노비'].includes(s.origin)&&!s.freed;
const farmer=s=>/농가|양반|서리|노비/.test(s.origin);
const op=(label,note,result,delta={},risk=0)=>({label,note,result,delta,risk});
const ev=(id,group,title,desc,condition,options,from=1392,until=1899)=>({id,group,title,desc,condition,options,from,until});
const EVENTS=[
 ev('water','farm','윗논과 아랫논','가뭄에 윗논 주인이 물꼬를 막았다. 우리 집 논으로 오던 물이 줄었다.',
  (l,j,s)=>j.region!=='한양'&&farmer(s),[
  op('물댈 순서를 함께 정한다','수확을 나누어 지킬 길을 찾는다','윗논 주인과 약속한 차례에 물을 댔다.',{trust:6,water:4,bonds:3}),
  op('밤에 몰래 물꼬를 튼다','들키면 집안 사이가 틀어질 수 있다','몰래 튼 물꼬 때문에 두 집안의 사이가 나빠졌다.',{trust:-9,water:7,grain:2}),
  op('마을 어른에게 중재를 청한다','양쪽 말을 듣고 물길을 정한다','원로들이 양쪽 집안의 사정을 듣고 길을 정했다.',{trust:3,knowledge:2})]),
 ev('oxBirth','livestock','외양간의 송아지','기르던 소가 새끼를 낳았다. 송아지는 아직 제대로 일어서지 못한다.',
  (l,j,s,v)=>v.animals.ox>0,[
  op('송아지에게 여물을 마련한다','어미 소도 함께 돌본다','송아지가 자라 외양간이 한층 북적였다.',{ox:1,grain:-2,health:-1}),
  op('이웃을 불러 함께 살핀다','경험 많은 사람의 지혜가 필요하다','송아지가 아플 때 이웃이 다시 도우러 왔다.',{trust:4,knowledge:2}),
  op('송아지를 팔 길을 알아본다','집안에 돈이 필요하다','송아지를 팔아 필요한 물건을 마련했다.',{capital:4})]),
 ev('sickOx','livestock','외양간의 병든 가축','기르던 짐승이 먹이를 거부한다. 다른 가축까지 아플까 걱정이다.',
  (l,j,s,v)=>v.animals.ox+v.animals.pig+v.animals.chicken>0,[
  op('마른 볏짚과 먹이를 챙긴다','며칠 품을 더 들여 돌본다','아프던 짐승이 다시 여물을 먹기 시작했다.',{grain:-3,health:-2}),
  op('경험 많은 이웃에게 묻는다','병든 짐승을 살필 방법을 찾는다','그때 도왔던 이웃과 가축을 함께 살폈다.',{trust:4,capital:-2}),
  op('다른 짐승부터 보호한다','잃은 가축을 되돌릴 수는 없다','외양간의 빈자리가 살림에 부담으로 남았다.',{chicken:-1,capital:-2})]),
 ev('wildBoar','farm','멧돼지가 밭을 헤집다','밤새 멧돼지가 콩과 조를 심은 밭을 뒤집었다.',
  (l,j)=>j.region!=='한양',[
  op('울타리를 높여 고친다','다음 피해에 대비한다','고쳐 둔 울타리가 다음 철 작물을 지켰다.',{capital:-3,grain:-2}),
  op('이웃과 짐승을 쫓는다','여럿이 나서 위험을 줄인다','마을 사람들이 차례로 밭을 살폈다.',{trust:5,health:-2}),
  op('관아에 피해를 알린다','고을에서 함께 대책을 찾는다','관아에서 밭 피해를 살피러 사람이 나왔다.',{knowledge:2,grain:-5})]),
 ev('tigerHouse','danger','범이 민가에 내려온 밤','산기슭 집에서 고함소리가 들린다. 마당에 범이 나타났다고 한다.',
  (l,j)=>mountainous.has(j.region),[
  op('아이들과 함께 문을 잠근다','식구의 안전을 먼저 살핀다','다음 날도 사람들은 산길을 조심했다.',{bonds:4,health:1}),
  op('관아에 착호를 청한다','범을 잡을 사람을 부른다','고을 사람들이 산길을 살피러 나섰다.',{knowledge:3,trust:2}),
  op('횃불을 들고 범을 쫓는다','위험한 싸움이 될 수 있다','범은 산으로 달아났지만 그날 밤을 잊기 어려웠다.',{health:-8,trust:4},.04)]),
 ev('midwife','family','산파를 부른 밤','집안에 산기가 시작되었다. 산파를 부르고 물을 데운다.',
  (l,j,s,v,f)=>!!f.spouse||f.children>0,[
  op('산파를 도와 깨끗한 천을 챙긴다','산모와 아기를 지킨다','식구들은 산모와 아기를 번갈아 돌보았다.',{bonds:5,capital:-2}),
  op('이웃집에서 도움을 청한다','혼자 감당하지 않는다','새아이가 태어난 날을 이웃들도 기억했다.',{trust:5,bonds:2}),
  op('산모 곁에서 밤을 지새운다','몸은 고되지만 함께한다','그날 밤을 지나며 가족의 정이 더 깊어졌다.',{health:-2,bonds:6})]),
 ev('marriage','family','혼처를 묻는 중매쟁이','집안 어른과 중매쟁이가 혼처와 본관을 알아본다.',
  (l,j,s,v,f)=>l.age>=15&&l.age<=37&&!f.spouse,[
  op('서로의 본관과 친족 관계를 살핀다','가문의 관례를 확인한다','집안 어른들이 혼처에 관한 이야기를 이어 갔다.',{knowledge:3}),
  op('두 사람의 마음을 먼저 묻는다','집안의 뜻과 다를 수 있다','혼사를 두고 식구들과 오랫동안 이야기를 나눴다.',{bonds:3,trust:1}),
  op('당분간 생업에 전념한다','혼인을 서두르지 않는다','중매 이야기는 한동안 잦아들었다.',{capital:2,knowledge:2})]),
 ev('filial','family','연로한 부모님의 기침','집안의 어른이 몸을 가누기 힘들어 한다.',
  (l,j,s,v,f)=>f.parents>0&&l.age>=25,[
  op('곁에 앉아 돌본다','생업에 쓰는 시간이 줄어든다','부모님은 곁에 함께했던 날을 기억했다.',{bonds:5,capital:-2}),
  op('형제자매와 돌봄을 나눈다','일손이 모이면 버틸 수 있다','형제자매가 부모님을 모시는 날을 나누었다.',{trust:3,bonds:3}),
  op('의원에게 약재를 구한다','집안의 비용이 더 든다','약을 구하러 나선 길이 기억에 남았다.',{capital:-4,knowledge:2})]),
 ev('gender','status','아들과 딸에게 서로 다른 기대','어른들은 아들과 딸이 배울 일과 혼처를 다르게 이야기한다.',
  (l)=>l.age>=10&&l.age<=35,[
  op('배우고 싶은 일을 직접 말한다','반대를 만날 수도 있다','스스로 고른 일을 조금씩 익혀 갔다.',{knowledge:4,bonds:-1}),
  op('식구에게 배움을 부탁한다','허락된 길에서 기회를 찾는다','형제자매와 서로 배우며 지냈다.',{bonds:4,knowledge:2}),
  op('집안일을 하며 기술을 익힌다','손에 익는 솜씨가 남는다','집안에서 배운 손기술이 살림에 도움이 되었다.',{knowledge:3,capital:1})]),
 ev('baekjeong','status','고기를 손질한 장날','고기와 가죽을 내놓았지만 사람들은 백정의 집안을 멀리한다.',
  (l,j,s)=>s.origin==='백정',[
  op('가죽을 잘 손질해 제값에 판다','솜씨와 거래를 이어 간다','가죽을 샀던 손님이 다시 찾아왔다.',{capital:4,health:-2}),
  op('차별을 따져 묻는다','고을의 편견과 부딪힌다','그날의 말다툼이 고을에 오래 남았다.',{knowledge:2,bonds:-2}),
  op('가족에게 도축 기술을 가르친다','집안의 생업을 잇는다','자녀가 가죽을 다루는 솜씨를 익혀 갔다.',{knowledge:4,bonds:3})]),
 ev('market','livelihood','장시에 내다 판 물건','손수 만든 삼베와 도자기를 장터에 가져왔다.',
  (l)=>l.age>=16,[
  op('흥정하여 직접 판다','물건값을 꼼꼼히 살핀다','물건을 샀던 단골이 다음 장날에도 찾아왔다.',{capital:4,knowledge:2}),
  op('보부상에게 맡긴다','먼 고을까지 나르는 값을 나눈다','보부상이 먼 고을의 장시 소식을 전했다.',{capital:2,trust:3}),
  op('거상과 거래를 튼다','큰 거래에는 손해도 따를 수 있다','큰 상인에게 값을 받으러 간 일이 남았다.',{capital:5,trust:-2})]),
 ev('temple','religion','시주를 청하는 스님','문밖에 스님이 서 있다. 절에서는 곡식과 땔감이 필요하다고 한다.',
  ()=>true,[
  op('쌀 한 줌을 시주한다','집안의 곳간도 살핀다','스님이 다른 철에 안부를 전했다.',{grain:-2,bonds:3}),
  op('절의 땔감 나르는 일을 돕는다','힘은 들지만 손을 보탠다','절에서 일하던 이웃과 다시 만났다.',{health:-2,bonds:3}),
  op('사정을 말씀드리고 돌려보낸다','살림을 먼저 지킨다','스님은 조용히 다음 집으로 향했다.',{grain:1})]),
 ev('shaman','religion','무당의 굿판','고을에 굿판이 벌어졌다. 장단과 기원 소리가 들린다.',
  ()=>true,[
  op('장단과 이야기를 듣는다','사람들이 모인 자리를 구경한다','굿판에서 들은 장단이 한동안 귀에 남았다.',{happiness:3,knowledge:2}),
  op('앓는 식구부터 살핀다','몸이 아픈 사람을 돌본다','병든 식구는 며칠을 쉬며 몸을 추슬렀다.',{bonds:4,health:2}),
  op('마을 어른께 전해 온 풍속을 묻는다','옛이야기를 듣는다','이 고을의 옛 이야기를 더 알게 되었다.',{knowledge:3,trust:2})]),
 ev('ginseng','livelihood','심마니의 약초길','깊은 산을 다녀온 심마니가 약초 이야기를 들려준다.',
  (l,j)=>mountainous.has(j.region),[
  op('산길을 배우러 따라간다','험한 지형을 익힌다','산의 약초와 길을 조금씩 구별하게 됐다.',{knowledge:4,health:-2}),
  op('약초를 캐 장터에 판다','험한 길에서 벌이를 찾는다','약초를 가져오던 길을 오래 기억했다.',{capital:4,health:-3}),
  op('위험한 산행은 피한다','집안의 일을 이어 간다','돌아온 심마니에게 산 이야기를 들었다.',{health:2,capital:1})]),
 ev('salt','livelihood','소금을 마련하는 해안','바닷가에서 소금을 만드는 사람들이 더운 날씨에 일한다.',
  (l,j)=>coastal.has(j.region),[
  op('소금 만드는 일을 배운다','바닷물과 햇볕, 불을 다룬다','배운 솜씨가 소금 장사에 도움이 되었다.',{knowledge:3,capital:2,health:-2}),
  op('소금을 장터로 나른다','짐을 옮겨 품삯을 받는다','소금 자루를 나르던 이웃과 다시 마주쳤다.',{capital:3,health:-2}),
  op('다른 고을의 소금값을 알아본다','값의 차이를 듣는다','장터에서 알게 된 소금값을 식구들과 나눴다.',{knowledge:3,trust:1})]),
 ev('haenyeo','danger','바다에 물질하러 간 날','해안의 여인들이 숨을 참고 해산물을 캔다. 깊이 잠수할수록 몸에 부담이 간다.',
  (l,j)=>j.region==='제주도'&&l.gender==='여자'&&l.age>=15,[
  op('얕은 물에서 물질한다','몸 상태를 살핀다','잡아 온 해산물로 가족의 끼니를 보탰다.',{capital:2,health:-1}),
  op('동무와 함께 물질한다','서로 안전을 살핀다','물질을 함께하던 동무와 고생을 나눴다.',{capital:3,bonds:3,health:-3},.012),
  op('더 깊은 곳까지 내려간다','몸이 상하거나 목숨을 잃을 수 있다','물질 뒤 오래도록 몸을 추스르는 날이 있었다.',{capital:6,health:-10},.055)]),
 ev('fishing','danger','풍랑에 갇힌 어선','바람이 거세지고 파도가 높아졌다. 조업을 더 할지 돌아갈지 정해야 한다.',
  (l,j,s)=>/어부|수군/.test(s.origin)||/어부|뱃사공/.test(j.occupation),[
  op('그물을 거두고 포구로 돌아간다','고기보다 사람을 지킨다','돌아온 그날 이후로 물때와 바람을 더 살폈다.',{capital:-2,health:2}),
  op('동료와 배를 지켜 본다','힘을 모아 파도를 버틴다','그때 함께했던 동료가 오래 기억에 남았다.',{bonds:3,health:-5},.02),
  op('고기를 더 잡으려 나아간다','배가 전복될 수도 있다','위험을 무릅쓴 그날을 다시 떠올렸다.',{capital:5,health:-10},.09)]),
 ev('taxBoat','livelihood','조운선에 실을 세곡','포구에 조운선이 들어왔다. 곡식 자루와 장부를 맞추는 일이 분주하다.',
  (l,j)=>coastal.has(j.region)||j.region==='충청도',[
  op('곡식 자루를 싣는다','무거운 짐을 옮겨 품삯을 받는다','세곡을 실었던 배가 먼 고을로 떠났다.',{capital:3,health:-2}),
  op('풍랑이 지나가길 기다린다','배의 안전을 먼저 살핀다','바람이 잦아든 뒤 배가 출항했다.',{knowledge:2,capital:-1}),
  op('관아의 장부를 도와 본다','쌀자루 수와 문서를 대조한다','서리가 다음에도 장부를 도와 달라 했다.',{knowledge:4,trust:1})]),
 ev('village','village','옆 마을의 장터 싸움','장터 자리를 놓고 이웃 마을과 말다툼이 났다.',
  (l,j)=>j.region!=='한양',[
  op('두 마을 원로에게 중재를 청한다','서로의 말을 듣게 한다','두 마을 사람들은 차츰 길을 나누어 썼다.',{trust:6,bonds:2}),
  op('우리 마을 편에 선다','다툼이 깊어질 수도 있다','다른 마을과 서먹함이 한동안 이어졌다.',{trust:-5,bonds:3}),
  op('서로 필요한 물건을 바꿔 쓴다','협동의 길을 찾는다','장날 서로 물건을 바꾸는 일이 늘었다.',{trust:4,capital:2})]),
 ev('holiday','culture','한가위의 송편','햅쌀로 만든 송편을 나누고 친족이 안부를 묻는다.',
  ()=>true,[
  op('어른을 찾아뵙는다','오랜만에 가족과 만난다','그때 들었던 집안 이야기가 오래 남았다.',{bonds:5}),
  op('마을의 놀이판에 나선다','동네 사람과 어울린다','윷놀이와 비석치기를 함께하며 웃었다.',{happiness:5,trust:2}),
  op('가난한 이웃에게 나눈다','넉넉하지 않아도 마음을 보탠다','이웃이 이듬해에도 안부를 전했다.',{grain:-2,trust:5})]),
 ev('seollal','culture','설날의 첫 아침','설을 맞아 집안 어른께 세배하고 떡국을 나눈다.',
  ()=>true,[
  op('웃어른께 세배한다','덕담을 듣는다','새해에 들었던 덕담을 떠올렸다.',{bonds:3,happiness:2}),
  op('윷놀이와 팽이치기를 한다','어린 식구와 함께 논다','아이들이 다음 설에도 놀이를 기다렸다.',{happiness:5,bonds:3}),
  op('이웃집의 떡국을 도와준다','함께 새해를 맞는다','떡국을 나눴던 이웃과 관계가 깊어졌다.',{trust:5,grain:-1})]),
 ev('secondary','status','서얼의 배움과 벼슬길','적자와 서얼을 다르게 대하는 집안 관습으로 다툼이 일어났다.',
  (l,j,s)=>/양반|왕실/.test(s.origin),[
  op('서얼 친족의 배움을 돕는다','다른 관습을 주장한다','친족이 배움을 이어 갔다는 소식을 들었다.',{knowledge:2,bonds:5}),
  op('집안의 규범을 따른다','다툼은 피할 수 있다','서먹해진 가족 사이가 쉽게 풀리지 않았다.',{bonds:-2,capital:1}),
  op('다른 생업을 찾도록 돕는다','새로운 기회를 함께 찾는다','멀리서 친족의 안부가 전해졌다.',{capital:-2,bonds:4})]),
 ev('namsadang','culture','남사당패가 장터에 들다','놀이패가 재주와 재담을 펼치자 장터가 떠들썩해졌다.',
  ()=>true,[
  op('놀이판에서 재담을 듣는다','한나절 일을 잊는다','장터에 웃음소리가 남았다.',{happiness:4}),
  op('놀이패의 짐을 옮긴다','길 위에서 사는 사람의 사연을 듣는다','놀이패가 다른 고을로 떠난 뒤에도 소문이 전해졌다.',{knowledge:3,capital:1}),
  op('집안일을 마저 한다','바쁜 살림을 꾸린다','놀이패 이야기는 밥상에서 들었다.',{capital:2})],1650),
 ev('court','status','궁녀를 뽑는다는 소식','궁궐에서 일할 여인을 뽑는다는 소문이 돌았다.',
  (l,j,s)=>l.gender==='여자'&&l.age>=12&&l.age<=21&&!bonded(s),[
  op('궁중의 규율을 알아본다','출신과 조건이 맞는지 살핀다','궁에서 일하는 사람이 알려 준 이야기를 들었다.',{knowledge:4}),
  op('고향에서 배움을 이어 간다','궁궐 밖의 살림을 택한다','고향에서 익힌 일을 계속했다.',{knowledge:2,bonds:2}),
  op('궁에 들어간 아는 이의 안부를 묻는다','멀리 떠난 이가 걱정된다','궁궐에서 일하던 사람의 소식을 전해 들었다.',{bonds:3})]),
 ev('examRoad','learning','한양으로 과거 보러 가는 길','먼 길을 떠날 여비와 묵을 곳을 마련해야 한다.',
  (l,j,s)=>l.gender==='남자'&&l.age>=17&&j.literacy>=2&&!bonded(s),[
  op('친척집을 거쳐 간다','먼 길을 나누어 걸어간다','시험을 보러 다녔던 친척집에 다시 들렀다.',{capital:-2,knowledge:3}),
  op('길동무와 함께 한양에 간다','함께 밤길을 피한다','함께 걸었던 벗과 시험 이야기를 나누었다.',{bonds:3,knowledge:4}),
  op('이번 시험은 미루고 공부한다','배움을 이어 간다','다음 시험을 기다리며 밤마다 책을 읽었다.',{knowledge:5})]),
 ev('militia','war','전란에 의병을 일으키다','왜군이 쳐들어왔다는 소식에 마을 사람들이 군량과 무기를 모은다.',
  (l)=>l.year>=1592&&l.year<=1599&&l.age>=15,[
  op('피란민과 군량을 돕는다','조와 보리, 물을 마련한다','고을 사람들은 힘을 합쳐 어려운 시절을 버텼다.',{grain:-4,bonds:4}),
  op('조총과 군수품을 옮긴다','위험한 길이지만 필요한 물자다','그때 함께 무기를 옮기던 동료가 떠올랐다.',{health:-3,knowledge:2}),
  op('의병대에 들어가 싸운다','살아서 돌아오지 못할 수 있다','싸움을 마친 뒤 살아 돌아온 이들과 소식을 나눴다.',{health:-7,bonds:2},.07)]),
];
const BY_ID=new Map(EVENTS.map(x=>[x.id,x]));
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.joseon9){
  const j=J.ensure(l);const houses=Array.from({length:3},(_,i)=>{
   const c=V8.CLANS[Math.floor(rng(l.seed,6100+i)*V8.CLANS.length)];
   return {id:'n'+i,name:c[0]+['만복','복이','순덕','덕수'][Math.floor(rng(l.seed,6200+i)*4)],
    wealth:Math.floor(rng(l.seed,6300+i)*85)+5,trust:Math.floor(rng(l.seed,6400+i)*45)+25,field:Math.floor(rng(l.seed,6500+i)*5)};
  });
  l.joseon9={version:1,processedYear:l.year,animals:{ox:j.region==='한양'?0:1,pig:1,chicken:2},
   water:35+Math.floor(rng(l.seed,6700)*40),trust:50,homes:houses,
   seen:[],queue:[],active:null,decisions:[],followups:[],memories:[]};
 }
 return l.joseon9;
}
function eligible(l,e,s=ensure(l)){
 if(!J.inOldEra(l)||!l.alive||l.age<8||l.age>77||l.year<e.from||l.year>e.until)return false;
 return !!e.condition(l,J.summary(l),V5.summary(l),s,V4.summary(l));
}
function promote(l,s){if(!s?.active&&!l.pending&&l.alive&&s?.queue.length){
 s.active=s.queue.shift();l.pending='joseon9:'+s.active.id;
}}
function prompt(l){const s=ensure(l),e=BY_ID.get(s?.active?.eventId);
 return !e?null:{title:e.title,description:e.desc,options:e.options.map(o=>({label:o.label,note:o.note,action:o.label}))};
}
function yearly(l,s){
 if(!s||!J.inOldEra(l)||!l.alive||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 const dry=rng(l.seed,l.year*17)<.13;s.water=clamp(s.water+(dry?-11:3),0,100);
 for(const h of s.homes)h.wealth=clamp(h.wealth+Math.floor(rng(l.seed,l.year+h.field*19)*7)-3,0,120);
 for(const f of s.followups.filter(f=>f.year<=l.year)){
  l.logEvent(f.text,'joseon9-followup');l.log.at(-1).causeId='joseon9:'+f.id;s.memories.push(f.text);
 }
 s.followups=s.followups.filter(f=>f.year>l.year);
 s.memories=s.memories.slice(-25);
 if(l.age>=13&&l.age<=73&&l.age%5===3&&s.queue.length<2){
  const pool=EVENTS.filter(e=>!s.seen.includes(e.id)&&eligible(l,e,s));
  if(pool.length){
   pool.sort((a,b)=>rng(l.seed,l.year*37+a.id.length*71)-rng(l.seed,l.year*37+b.id.length*71));
   const e=pool[0];s.seen.push(e.id);s.queue.push({id:l.year+'-'+e.id,eventId:e.id,year:l.year});
  }
 }
 promote(l,s);
}
function choose(l,index){
 const s=ensure(l),e=BY_ID.get(s?.active?.eventId);
 if(!l.alive||!e||!Number.isInteger(index)||index<0||index>=3)return false;
 const o=e.options[index],d=o.delta,j=J.ensure(l),v=V2.ensure(l),id=s.active.id;
 const stats={};for(const k of ['health','happiness','knowledge','wealth','bonds'])if(Number.isFinite(d[k]))stats[k]=d[k];
 l.change(stats);
 if(Number.isFinite(d.capital))j.capital=clamp(j.capital+d.capital,-120,600);
 if(Number.isFinite(d.grain))v.grain=clamp(v.grain+d.grain,0,200);
 if(Number.isFinite(d.water))s.water=clamp(s.water+d.water,0,100);
 if(Number.isFinite(d.trust)){s.trust=clamp(s.trust+d.trust,0,100);
  s.homes[0].trust=clamp(s.homes[0].trust+d.trust,0,100);}
 for(const animal of ['ox','pig','chicken'])
  if(Number.isFinite(d[animal]))s.animals[animal]=clamp(s.animals[animal]+d[animal],0,12);
 if(d.chicken<0&&s.animals.chicken===0){
  if(s.animals.pig>0)s.animals.pig--;
  else if(s.animals.ox>0)s.animals.ox--;
 }
 l.logEvent(e.title+' — '+o.label,'joseon9-choice');l.log.at(-1).causeId='joseon9:'+id;
 s.decisions.push({id,eventId:e.id,year:l.year,option:index});s.decisions=s.decisions.slice(-70);
 s.followups.push({id,year:l.year+2+(index%2),text:o.result});s.followups=s.followups.slice(-55);
 s.active=null;l.pending=null;
 if(o.risk&&rng(l.seed,l.year+index*411+e.id.length*37)<o.risk){
  l.finish(e.id==='fishing'?'풍랑 속에서 배가 뒤집혀 고향에 돌아오지 못했다.':
   e.id==='haenyeo'?'물질 중 깊은 물속에서 몸이 상해 목숨을 잃었다.':
   e.id==='militia'?'전쟁터에서 목숨을 잃었다.':'범을 쫓다가 크게 다쳐 목숨을 잃었다.');
 }else promote(l,s);
 return true;
}
function summary(l){const s=ensure(l);return s?{clan:V8.summary(l).clan,animals:{...s.animals},
 water:s.water,trust:s.trust,neighbors:s.homes.map(h=>({...h})),decisions:s.decisions.length}:null}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseon9;if(!o||o.version!==1||!s)return s;
 const clean=q=>q&&BY_ID.has(q.eventId)&&typeof q.id==='string'&&Number.isInteger(q.year)&&q.year<=l.year&&q.year>=l.birthYear?
  {id:q.id.slice(0,70),eventId:q.eventId,year:q.year}:null;
 s.processedYear=clamp(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(id=>BY_ID.has(id)).slice(-EVENTS.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.map(clean).filter(Boolean).slice(-3):[];
 s.active=clean(o.active);if(!l.alive||!J.inOldEra(l)||data?.pending!=='joseon9:'+s.active?.id)s.active=null;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(x=>x&&BY_ID.has(x.eventId)&&typeof x.id==='string'&&Number.isInteger(x.year)).slice(-70):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'
 &&Number.isInteger(x.year)&&x.year>l.year&&x.year<=l.year+5).slice(-55):[];
 for(const k of ['water','trust'])if(Number.isFinite(o[k]))s[k]=clamp(o[k],0,100);
 if(Array.isArray(o.homes))for(let i=0;i<Math.min(3,o.homes.length);i++)if(o.homes[i]?.id===s.homes[i].id){
  for(const k of ['wealth','trust','field'])if(Number.isFinite(o.homes[i][k]))s.homes[i][k]=clamp(o.homes[i][k],0,120);
 }
 if(o.animals)for(const k of ['ox','pig','chicken'])if(Number.isFinite(o.animals[k]))s.animals[k]=clamp(o.animals[k],0,12);
 s.memories=Array.isArray(o.memories)?o.memories.filter(x=>typeof x==='string').slice(-25):[];
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V4?.summary||!V5?.summary||!V8?.summary||Sim.Life.prototype.__joseon9)return false;
 const L=Sim.Life,pt=L.prototype.tick,pc=L.prototype.choose,pg=L.prototype.getChoice,pr=L.prototype.reflect,ps=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){if(!J.inOldEra(this))return pt.call(this);
  const y=this.year,ok=pt.call(this);if(ok&&this.alive&&this.year!==y)yearly(this,ensure(this));return ok;};
 L.prototype.getChoice=function(){if(J.isJoseon(this)&&this.pending?.startsWith('joseon9:'))return prompt(this);return pg.call(this);};
 L.prototype.choose=function(i){if(J.isJoseon(this)&&this.pending?.startsWith('joseon9:'))return choose(this,i);
  const ok=pc.call(this,i);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;};
 L.prototype.reflect=function(t){const ok=pr.call(this,t);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const s=ps.call(this);if(J.isJoseon(this))s.joseon9=JSON.parse(JSON.stringify(ensure(this)));return s;};
 L.restore=function(d){const life=restore.call(this,d);if(life&&J.isJoseon(life))hydrate(life,d);return life;};
 Object.defineProperty(L.prototype,'__joseon9',{value:true});return true;
}
install();
return Object.freeze({EVENTS,ensure,eligible,yearly,choose,prompt,summary,install});
});
