/* Joseon regional livelihoods v12.
 * Fictional household consequences; historical context from AKS encyclopaedia.
 * Supplements existing v6 life careers / v9 village life without replacing them.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon4,root?.OneLifeJoseon5,root?.OneLifeJoseon6,root?.OneLifeJoseon9);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon12=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V4,V5,V6,V9){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const roll=(seed,salt)=>{let n=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;};
const SOURCES=Object.freeze({
 diving:'https://encykorea.aks.ac.kr/Article/E0062484',
 divingDress:'https://encykorea.aks.ac.kr/Article/E0079868',
 commerce:'https://encykorea.aks.ac.kr/Article/E0027204',
 packmen:'https://encykorea.aks.ac.kr/Article/E0023368',
 occupations:'https://encykorea.aks.ac.kr/Article/E0054514',
 divingVillage:'https://encykorea.aks.ac.kr/Article/E0062488'
});
const coast=new Set(['경상도','전라도','황해도','충청도','경기도','평안도','함경도','제주도']);
const mountain=new Set(['강원도','함경도','평안도','경상도','황해도']);
const bound=o=>['사노비','공노비'].includes(o.origin)&&!o.freed;
function interests(l,j,o,s){
 const origin=o?.origin||'',p=(V6?.summary(l)?.primary?.name||'')+' '+j.occupation;
 return {
  fisher:/어부|뱃사공|수군|어업|조업/.test(origin+' '+p),
  diver:j.region==='제주도'&&l.gender==='여자'&&(s.diving>0),
  canDive:j.region==='제주도'&&l.gender==='여자'&&l.age>=13&&l.age<=46,
  crafts:/도공|대장장이|목수|장인|길쌈/.test(origin+' '+p),
  merchant:/상인|보부상|장사|주막|여각|객주/.test(origin+' '+p),
  farm:/농가|양반|노비/.test(origin+' '+p)||/농사|소작/.test(p),
  mountains:mountain.has(j.region)&&j.region!=='한양',
  literacy:l.gender==='남자'&&!bound(o)&&(j.literacy>0||/양반|서리|역관|의관/.test(origin)),
  coastal:coast.has(j.region),
  bound:bound(o)
 };
}
const O=(label,note,after,change={},danger=0)=>({label,note,after,change,danger});
const E=(id,group,title,desc,allow,opts,src=null,from=1392)=>({id,group,title,desc,allow,opts,src,from});
const EVENTS=[
 E('harborAgreement','coast','포구에서 배 쓸 순서를 정하다',
 '여러 집에서 한 척의 배를 함께 쓴다. 물때가 좋은 날을 두고 말이 엇갈린다.',(_,j,o,s,k)=>k.fisher,[
  O('날을 정해 배를 나누어 쓴다','서로 조업할 시간을 의논한다','{neighbor}네와 배를 나누던 약속이 다음 철에도 지켜졌다.',{trust:5,boats:2,customers:1}),
  O('망가진 돛을 먼저 고친다','일손과 돈을 들인다','함께 고친 돛이 바람 센 날 배를 지켜 주었다.',{capital:-3,nets:2,safety:4}),
  O('우리 집이 먼저 바다로 나간다','당장 벌이는 얻지만 원망을 살 수 있다','배 쓸 순서를 두고 {neighbor}네와 한동안 서먹했다.',{trust:-7,catch:3,capital:2})],SOURCES.occupations),
 E('netRepair','coast','낡은 그물의 코를 잇다',
 '그물이 찢어져 잡은 고기가 빠져나간다. 새것을 구할 돈은 넉넉하지 않다.',(_,j,o,s,k)=>k.fisher,[
  O('동료와 그물코를 엮는다','서로 손질법을 가르친다','그물코를 엮던 솜씨가 더 익숙해졌다.',{nets:4,skill:2,trust:2}),
  O('장시에서 그물 재료를 산다','값이 들지만 조업을 계속한다','수선한 그물로 다음 철에 다시 바다로 나섰다.',{capital:-4,nets:6}),
  O('낡은 그물로 가까운 바다만 나간다','큰 수확을 바라기는 어렵다','멀리 나가지 않아도 집안의 끼니는 조금 이을 수 있었다.',{catch:2,safety:2,nets:-1})],SOURCES.occupations),
 E('fishDry','coast','잡은 생선을 말려 장날에 내다 놓다',
 '고기를 잡은 뒤 바로 팔지 못하면 상할 수 있다. 소금과 볕, 품이 필요하다.',(_,j,o,s,k)=>k.fisher,[
  O('이웃과 소금 간을 하고 말린다','함께 보관할 생선을 손질한다','말려 둔 생선을 다음 장날에 팔았다.',{catch:-2,goods:4,trust:3}),
  O('배에서 돌아오자마자 넘긴다','값은 낮아도 급한 돈을 마련한다','포구의 상인이 다음 조업 때 다시 찾아왔다.',{capital:3,catch:-1,customers:2}),
  O('가족이 먹을 몫을 따로 둔다','시장에서 얻을 돈이 줄어든다','추운 철에 말린 생선이 집안 밥상에 올랐다.',{catch:-2,grain:3,bonds:2})],SOURCES.commerce),
 E('boatSeason','coast','오래된 배의 널빤지가 벌어지다',
 '배의 밑바닥에 물이 새는 자리가 보인다. 조업을 계속할지 수리할지 고민이다.',(_,j,o,s,k)=>k.fisher,[
  O('배를 육지로 올려 고친다','물때 좋은 날을 놓치지만 안전을 살핀다','고쳐 둔 배 덕에 다시 바다를 오갈 수 있었다.',{capital:-4,safety:7,nets:1}),
  O('여러 어부와 배 목수를 부른다','돈과 품을 나누어 마련한다','함께 배를 고쳤던 사람이 훗날 도와 달라며 찾아왔다.',{trust:4,capital:-2,safety:5}),
  O('짧은 뱃길만 오간다','수선 전까지는 큰 바다를 피한다','가까운 바다에서만 조업하며 배를 아꼈다.',{capital:1,safety:-2,health:-2})],SOURCES.occupations),
 E('diverLearning','diver','바닷가에서 물질을 배우다',
 '마을 잠녀들이 어린 사람에게 얕은 물에서 숨을 고르고 물때를 살피는 법을 일러 준다.',(l,j,o,s,k)=>k.canDive&&l.age<=35,[
  O('숙련된 잠녀 곁에서 조금씩 배운다','처음에는 얕은 물만 살핀다','바닷가에서 배운 기술이 다음 계절에도 남았다.',{diving:2,safety:2,bonds:2}),
  O('물질 대신 해산물 손질을 돕는다','바다에 들어가지 않아도 할 일이 있다','물질하는 동료들이 잡아 온 해산물을 손질했다.',{goods:2,trust:3}),
  O('물옷과 도구를 손봐 준다','재봉과 해산물 거래를 익힌다','바닷가에서 해녀들의 물옷을 고치는 일을 도왔다.',{craft:2,capital:1})],SOURCES.diving),
 E('diverCommunity','diver','잠녀들의 바닷밭 경계',
 '전복과 미역을 채취하는 바다의 자리를 두고 두 마을의 잠녀가 의견을 달리한다.',(l,j,o,s,k)=>k.diver,[
  O('서로 채취하는 곳을 다시 정한다','잠녀들의 의견을 듣고 조정한다','잠녀들과 함께 바다의 경계를 살피는 일이 이어졌다.',{trust:6,diving:1,bonds:3}),
  O('옛 약속을 확인한다','마을 어른과 물질하던 사람에게 묻는다','여러 해 지켜 온 채취 약속을 다시 확인했다.',{knowledge:3,trust:2}),
  O('우리 쪽 바다를 더 지키려 한다','갈등이 깊어질 수 있다','{neighbor}네와 해산물을 나누는 일에 한동안 말이 많았다.',{catch:2,trust:-5})],SOURCES.divingVillage),
 E('diverFatigue','diver','찬 바다에서 몸이 떨리는 날',
 '물질을 마친 뒤 귀가 아프고 몸이 지친다. 더 들어갈지 쉬어 갈지 정해야 한다.',(l,j,o,s,k)=>k.diver,[
  O('물 밖에서 몸을 쉬게 한다','남은 물질은 다음으로 미룬다','몸을 살피고 쉬었던 덕에 다시 물질할 힘을 얻었다.',{health:3,capital:-2,safety:4}),
  O('동무와 가까운 곳에서만 물질한다','혼자 깊이 들어가지 않는다','함께 물질하던 동무가 서로의 건강을 살폈다.',{health:-2,catch:3,trust:3}),
  O('조금만 더 캐 보려 들어간다','몸이 상하고 숨이 막힐 수 있다','무리해 물질한 뒤 한동안 바닷가에 나가지 못했다.',{health:-8,catch:5,safety:-5},.022)],SOURCES.diving),
 E('forestFirewood','mountain','산의 땔나무를 구하는 날',
 '땔감이 부족해 산에 올랐지만 다른 마을에서도 나무를 구하러 왔다.',(_,j,o,s,k)=>k.mountains,[
  O('산의 형편을 살피고 적당히 거둔다','남겨 둘 나무도 헤아린다','다음 겨울에도 산에서 땔감을 구할 수 있었다.',{firewood:4,health:-2,trust:2}),
  O('이웃과 함께 나무를 나른다','무거운 짐을 나누어 든다','{neighbor}네와 나무를 나르던 때 서로 품을 갚았다.',{firewood:5,health:-3,trust:3}),
  O('큰 나무를 베어 팔기로 한다','벌이는 얻지만 산림과 사람 사이가 걱정된다','큰 나무를 벤 뒤 땅이 드러난 자리가 오래 남았다.',{firewood:7,capital:4,trust:-5})],SOURCES.occupations),
 E('herbalGather','mountain','산속 약초를 찾는 사람',
 '깊은 골짜기로 향하는 심마니가 약초가 자라는 땅과 계절을 말해 준다.',(_,j,o,s,k)=>k.mountains,[
  O('경험 많은 사람을 따라 길을 배운다','약초와 위험한 식물을 구별한다','산길을 익힌 덕에 다음에는 헤매는 일이 줄었다.',{herbs:2,skill:3,health:-2}),
  O('약초를 캐서 의원에게 건넨다','약재가 필요한 사람과 거래한다','약재를 받은 의원이 다시 부탁을 전했다.',{herbs:-1,capital:3,customers:2}),
  O('가파른 골짜기는 피한다','위험한 산길을 조심한다','험한 산행을 미루고 집안일을 이어 갔다.',{health:2,firewood:1})],SOURCES.occupations),
 E('boarField','mountain','밤새 멧돼지가 밭을 헤집다',
 '산짐승들이 밭을 파헤쳐 콩과 조가 쓰러졌다. 가족들이 수확을 걱정한다.',(_,j,o,s,k)=>k.mountains&&k.farm,[
  O('이웃과 밭의 울타리를 고친다','여럿이 살필 곳을 나눈다','울타리를 함께 고친 집안들이 다음에도 밭을 지켰다.',{capital:-2,trust:4,grain:-2,safety:2}),
  O('발자국을 살피고 밭을 옮겨 심는다','짧은 기간에 일손이 더 든다','밭을 살피며 다음 철을 다시 준비했다.',{grain:-3,health:-2,knowledge:2}),
  O('산짐승을 직접 쫓으러 나선다','다칠 수 있어 조심해야 한다','짐승을 쫓던 날의 일을 이웃과 오래 나눴다.',{health:-5,grain:-1,safety:-2},.016)],SOURCES.occupations),
 E('mountainPass','mountain','눈에 막힌 산길과 장꾼',
 '산길에 눈이 쌓여 장시를 오가던 사람들의 발이 묶였다.',(_,j,o,s,k)=>k.mountains,[
  O('장꾼들에게 따뜻한 자리를 내어 준다','잠시 쉬어 갈 곳이 필요하다','눈이 녹은 뒤 나그네가 다시 인사를 전했다.',{firewood:-3,bonds:4,trust:2}),
  O('이웃과 길을 조금씩 치운다','눈길에서 일손을 나눈다','함께 길을 열었던 이웃이 다음 겨울에도 찾아왔다.',{health:-3,trust:5,capital:1}),
  O('눈이 녹을 때까지 집에 머문다','시장에 갈 기회는 놓친다','눈이 녹은 뒤에야 장터 소식을 들을 수 있었다.',{health:2,capital:-2})],SOURCES.packmen),
 E('packTravel','trade','보부상과 먼 장길을 가다',
 '봇짐과 등짐을 지고 먼 장시로 향한다. 하루 안에 돌아오기는 어려운 길이다.',(_,j,o,s,k)=>k.merchant,[
  O('이웃 상인과 길동무가 된다','위험한 길을 서로 살핀다','함께 길을 걸었던 장꾼과 다른 장시에서 재회했다.',{capital:3,customers:2,safety:2,trust:2}),
  O('가볍고 값비싼 물품을 골라 싼다','봇짐의 부피를 줄인다','새로 싼 물건이 다른 장터에서 잘 팔렸다.',{goods:-2,capital:5,skill:2}),
  O('익숙한 장시만 오간다','낯선 길보다 단골을 믿는다','익숙한 장날에 찾아온 손님이 늘었다.',{customers:3,capital:2})],SOURCES.packmen),
 E('marketCredit','trade','장사꾼이 외상값을 미루다',
 '지난 장날 물건을 가져간 상인이 약속한 날에도 값을 치르지 않았다.',(_,j,o,s,k)=>k.merchant||k.crafts,[
  O('외상 장부를 들고 찾아간다','거래한 내용을 확인한다','장부를 정리해 두었기에 다음 거래는 신중해졌다.',{capital:2,customers:-1,knowledge:2}),
  O('형편을 듣고 다음 장날까지 기다린다','단골과의 관계를 이어 간다','장꾼이 다시 와 조금씩 값을 갚았다.',{capital:-2,customers:3,trust:2}),
  O('다른 상인과 새로운 거래를 튼다','잃은 값을 바로 되찾기는 어렵다','멀리서 새 손님이 찾아오기 시작했다.',{capital:-3,customers:4})],SOURCES.commerce),
 E('artisanOrder','craft','도자기와 농기구 주문이 몰리다',
 '장시에서 손기술을 부린다는 소문이 나자 물건을 부탁하는 사람이 늘었다.',(_,j,o,s,k)=>k.crafts,[
  O('재료를 마련해 차근차근 만든다','솜씨와 시간을 함께 들인다','만든 물건을 받은 손님이 다시 주문했다.',{materials:-3,goods:5,skill:3,health:-2}),
  O('이웃 장인과 일을 나눈다','품삯을 나누고 손을 맞춘다','함께 일을 맡았던 장인과 다음에도 거래했다.',{trust:4,goods:3,customers:3,capital:-2}),
  O('급한 주문만 먼저 끝낸다','많이 만들기보다 지킬 약속을 살핀다','정해진 날에 물건을 받으러 온 손님에게 건넸다.',{capital:4,materials:-2,skill:1})],SOURCES.occupations),
 E('kilnFire','craft','가마와 화롯불을 살피는 날',
 '불이 지나치게 세면 도자기가 깨지고 쇠붙이도 망칠 수 있다.',(_,j,o,s,k)=>k.crafts,[
  O('불길을 낮추고 천천히 익힌다','시간을 더 쓰더라도 물건을 지킨다','불을 살피는 솜씨가 다음 작업에도 도움이 됐다.',{goods:2,skill:4,firewood:-2}),
  O('경험 많은 장인에게 묻는다','실패했던 일을 배움으로 삼는다','함께 일한 장인에게 새로운 방법을 배웠다.',{trust:3,skill:3,capital:-1}),
  O('불을 더 지펴 빨리 끝낸다','시간은 줄지만 물건을 망칠 수 있다','서둘렀던 탓에 손질할 물건이 더 생겼다.',{goods:-3,capital:2,health:-2})],SOURCES.occupations),
 E('linenTrade','craft','베틀에서 짠 삼베를 장에 내다 놓다',
 '집안에서 짠 삼베와 모시의 값을 정해야 한다. 만든 사람의 품이 헐값이 되기도 한다.',(_,j,o,s,k)=>k.crafts||k.merchant||k.farm,[
  O('품이 든 만큼 값을 흥정한다','손기술을 알아주는 손님을 찾는다','옷감을 사 갔던 사람이 다음 장날에도 찾아왔다.',{goods:3,skill:2,customers:2}),
  O('집안 식구의 옷부터 짓는다','장터에 팔 물건은 줄어든다','식구들은 새로 지은 옷을 오래 입었다.',{goods:-2,bonds:4,health:1}),
  O('옷감 짜는 일을 함께 나눈다','이웃에게 베틀을 빌려 준다','베틀을 빌려 쓴 {neighbor}네가 품을 돌려주었다.',{trust:5,skill:2,capital:1})],SOURCES.occupations),
 E('saltCargo','trade','포구에 닿은 소금 자루',
 '소금을 실은 상인이 장시에 왔다. 멀리 산골 마을에서도 소금이 필요하다.',(_,j,o,s,k)=>k.merchant&&k.coastal,[
  O('먼 산골 장시에 소금을 나른다','길이 멀어도 필요한 곳에 판다','산골에서 만난 단골이 다음 철에도 기다렸다.',{capital:4,customers:4,health:-2}),
  O('주막과 이웃에 먼저 나누어 판다','가까운 손님을 챙긴다','가까운 주막집에서 다시 소금을 주문했다.',{capital:2,trust:4,goods:-2}),
  O('값이 달라질 때까지 기다린다','팔 시기를 놓칠 수도 있다','창고에 둔 소금이 오래 남아 관리할 일이 늘었다.',{capital:-2,goods:2})],SOURCES.commerce),
 E('bookSharing','learning','같은 책을 함께 읽는 아이들',
 '서당에서 책이 부족해 여러 학동이 한 권을 둘러본다.',(l,j,o,s,k)=>l.age>=10&&l.age<=32&&(k.literacy||j.literacy>=1),[
  O('책을 서로 빌려 보게 한다','집안마다 살림이 다른 것을 생각한다','함께 책을 읽던 아이들이 서로 글을 가르치기 시작했다.',{literacy:1,knowledge:3,trust:3}),
  O('밤에 책을 베껴 놓는다','시간이 오래 걸린다','베껴 둔 글을 보며 글을 조금씩 익혔다.',{literacy:1,health:-2,skill:2}),
  O('농사와 생업에 필요한 글부터 배운다','장부와 물건 이름을 읽는다','집안의 장부를 읽을 때 배운 글이 쓰였다.',{literacy:1,capital:1,knowledge:2})],SOURCES.occupations),
 E('womenLetters','learning','집안의 편지를 읽는 법',
 '먼 친척에게 소식을 쓰고 싶지만 글을 배울 기회가 누구에게나 같지는 않다.',(l,j,o,s,k)=>l.gender==='여자'&&l.age>=13&&l.age<=55,[
  O('집에서 한글 편지를 쓰는 법을 익힌다','집안 사람이 아는 글자를 나눈다','멀리 있는 친척에게 편지를 적어 보낼 수 있었다.',{literacy:1,knowledge:4,bonds:2}),
  O('글을 아는 이웃에게 읽어 달라 한다','아는 사람의 손을 빌린다','이웃과 먼 친척의 소식을 함께 들었다.',{trust:4,knowledge:2}),
  O('글 대신 소식을 인편으로 전한다','먼 길의 사람에게 안부를 부탁한다','사람을 통해 보낸 말이 오래 지나 돌아왔다.',{capital:-2,bonds:3})],SOURCES.occupations,1446),
 E('seowonAccess','learning','서원 앞의 배움과 일손',
 '고을 서원에 서책이 있다. 하지만 신분과 성별에 따라 배울 기회가 같지 않다.',(l,j,o,s,k)=>l.age>=15&&l.age<=45&&k.literacy&&!k.bound,[
  O('서원의 책과 공부할 자리를 알아본다','글공부를 이어 간다','서원에서 빌린 책이 더 많은 공부의 길을 열었다.',{literacy:1,knowledge:4,capital:-2}),
  O('서원에 필요한 종이와 땔감을 돕는다','배움의 공간을 유지하는 일도 한다','서원 일을 돕던 사람과 오랫동안 인연이 남았다.',{trust:3,capital:1}),
  O('고을의 생활 일을 먼저 배운다','과거시험보다 생업을 먼저 익힌다','고을의 장부와 땅의 형편을 조금 더 알게 됐다.',{knowledge:3,skill:2})],SOURCES.occupations,1543),
 E('sickNeighbor','health','이웃집에 열병이 돌다',
 '옆집에서 열이 나며 누운 사람이 생겼다. 돌볼 식구도 부족해 보인다.',(l,j,o,s,k)=>l.age>=15&&roll(l.seed,l.year*29+19)<.22,[
  O('먹을 것과 깨끗한 물을 챙겨 둔다','이웃을 도울 일손을 찾는다','{neighbor}네가 어려운 때의 도움을 오래 기억했다.',{grain:-2,trust:5,medicine:-1,health:-1}),
  O('의원의 진료를 구하도록 돕는다','약을 구할 길을 알아본다','의원에게 가족의 상태를 전하던 날이 기억났다.',{medicine:-2,capital:-2,bonds:3}),
  O('집안 사람을 돌보며 안부를 전한다','무리한 왕래는 줄인다','이웃은 멀리서도 서로의 안부를 묻게 되었다.',{health:2,trust:1})],SOURCES.occupations),
 E('midwifeFamily','health','산모를 돌볼 일손이 부족하다',
 '이웃집 산모와 갓난아기를 돌볼 사람이 모자라다. 식구들이 밤새 불을 밝힌다.',(l,j,o,s,k)=>l.age>=18&&l.age<=69,[
  O('따뜻한 물과 먹을 것을 마련한다','힘겨운 때를 함께 보낸다','출산 뒤 돌봄을 받았던 이웃이 안부를 전했다.',{grain:-3,trust:5,bonds:2}),
  O('산파를 구할 곳을 알아본다','경험 있는 사람의 손길을 찾는다','돌봄을 돕던 이웃과 다음에도 품을 나누었다.',{capital:-2,knowledge:2,trust:3}),
  O('집안일을 대신해 준다','며칠간 일손을 내어 준다','{neighbor}네와 서로 일손을 빌려 주게 되었다.',{health:-3,trust:5})],SOURCES.occupations),
 E('villageWell','community','우물가에 모인 두 마을 사람들',
 '가뭄에 우물의 물이 줄었다. 이웃 마을에서도 물을 길으러 오겠다고 한다.',(l,j,o,s,k)=>j.region!=='한양',[
  O('물을 길어 올 차례를 정한다','두 마을 사정을 함께 듣는다','{neighbor}네와 물 길으러 오는 날을 정했다.',{trust:6,water:3,knowledge:2}),
  O('우물을 함께 손본다','힘이 들지만 물길을 넓혀 본다','함께 우물을 손보던 마을 사람들과 다시 만났다.',{water:6,health:-3,trust:4}),
  O('우리 집부터 물을 가져온다','다툼이 생길 수 있다','마을 사람들이 물 차례를 두고 언성을 높였다.',{water:4,trust:-6})],SOURCES.occupations),
 E('livestockShare','community','이웃집에서 소를 빌려 달라 한다',
 '밭을 갈 날인데 이웃집의 소가 아프다. 우리 집 소를 며칠 빌려 달라는 부탁이 왔다.',(l,j,o,s,k)=>j.region!=='한양'&&V9.ensure(l)?.animals.ox>0,[
  O('날을 정해 소를 빌려 준다','우리 집 농사도 고려한다','{neighbor}네가 소를 돌려주며 여물까지 챙겨 왔다.',{trust:5,grain:-2,water:1}),
  O('함께 밭을 갈아 준다','일손과 짐승을 같이 돌린다','둘이 함께 갈았던 밭에서 곡식이 여물었다.',{health:-3,trust:6,grain:2}),
  O('소가 아파서 어렵다고 말한다','짐승과 집안의 일을 우선한다','소를 빌리지 못한 이웃이 서운해했다.',{trust:-3,health:1})],SOURCES.occupations),
 E('rainAfterFire','community','큰불 뒤에 이웃의 집을 다시 세우다',
 '바람이 센 날 이웃집에 불이 번져 기둥과 짚이 타 버렸다.',(l,j,o,s,k)=>l.age>=15,[
  O('이웃과 나무와 짚을 모아 준다','집을 다시 지을 재료를 나눈다','집을 다시 세울 때 함께했던 사람이 오래 기억에 남았다.',{firewood:-3,trust:6,bonds:2}),
  O('목수와 대장장이의 손을 구한다','전문가의 도움을 얻는다','새로 세운 집에 사람들이 모여 안부를 나누었다.',{capital:-3,trust:3,knowledge:2}),
  O('집안의 불씨부터 조심해 살핀다','큰불이 옮겨붙지 않게 한다','이웃집의 불을 본 뒤 소화할 물과 도구를 챙겼다.',{health:1,safety:3})],SOURCES.occupations)
];
const byId=new Map(EVENTS.map(e=>[e.id,e]));
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.joseon12){
  const j=J.ensure(l),o=V5.ensure(l);
  l.joseon12={version:1,processedYear:l.year,seen:[],queue:[],active:null,decisions:[],followups:[],
   diving:j.region==='제주도'&&l.gender==='여자'&&roll(l.seed,1212)<.32?2:0,
   nets:4,safety:53,catch:2,materials:5,goods:3,customers:2,skill:1,
   firewood:5,herbs:0,medicine:3,memories:[],latestSource:null};
 }
 return l.joseon12;
}
function eligible(l,e,s=ensure(l)){
 if(!s||!l.alive||!J.inOldEra(l)||l.age<10||l.age>76||l.year<e.from)return false;
 return e.allow(l,J.summary(l),V5.summary(l),s,interests(l,J.summary(l),V5.summary(l),s));
}
function promote(l,s){
 if(!s||s.active||l.pending||!l.alive||!J.inOldEra(l)||!s.queue.length)return;
 s.active=s.queue.shift();l.pending='joseon12:'+s.active.id;
}
function dynamic(l,e){
 const n=V9.ensure(l)?.homes?.[0]?.name||'이웃',s=ensure(l);
 let desc=e.desc;
 if(e.id==='netRepair'&&s.nets<=2)desc='그물이 여러 군데 찢어져 당장 바다로 나가기 어렵다. 고칠 재료도 넉넉하지 않다.';
 if(e.id==='marketCredit'&&s.customers>6)desc='오랫동안 거래해 온 장사꾼이 외상값을 늦게 갚겠다고 한다. 단골을 잃기는 아쉽다.';
 return {title:e.title,description:desc.replaceAll('{neighbor}',n),
  options:e.opts.map(o=>({label:o.label,note:o.note,action:o.label}))};
}
function yearly(l,s){
 if(!s||!l.alive||!J.inOldEra(l)||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 if(l.joseon14?.captivity?.status==='held')return;
 for(const f of s.followups.filter(x=>x.year<=l.year)){
  l.logEvent(f.text,'joseon12-followup');l.log.at(-1).causeId='joseon12:'+f.id;
  s.memories.push(f.text);
 }
 s.followups=s.followups.filter(x=>x.year>l.year);
 s.memories=s.memories.slice(-22);
 const kinds=interests(l,J.summary(l),V5.summary(l),s);
 if(kinds.fisher){
  if(s.nets<=1&&l.age>=18&&l.year%3===0){s.catch=clamp(s.catch-1,0,24);l.logEvent('그물이 낡아 바다에서 건진 고기가 예전만 못했다.','joseon12-memory');}
  if(s.catch>=8&&l.year%2===0){s.catch=clamp(s.catch-3,0,24);s.goods=clamp(s.goods+2,0,40);}
 }
 if(kinds.crafts&&s.materials<=1&&l.year%4===0){
  s.goods=clamp(s.goods-2,0,40);
  l.logEvent('일할 재료가 부족해 맡은 물건을 제때 만들기 어려웠다.','joseon12-memory');
 }
 if(s.firewood===0&&mountain.has(J.summary(l).region)&&l.year%4===1){
  l.change({health:-1});l.logEvent('겨울에 땔감이 떨어져 집안의 불을 아끼며 지냈다.','joseon12-memory');
 }
 // Dated historical episodes are already handled by the Annals and Joseon v11
 // layers; these are ordinary, sparse regional work choices.
 if(l.age>=13&&l.age<=72&&l.age%5===2&&s.queue.length<2){
  const pool=EVENTS.filter(e=>!s.seen.includes(e.id)&&eligible(l,e,s));
  if(pool.length){
   const relevant=e=>({coast:kinds.fisher?-.6:0,diver:kinds.canDive?-.45:0,trade:kinds.merchant?-.45:0,craft:kinds.crafts?-.4:0,learning:kinds.literacy?-.15:0}[e.group]||0);
   pool.sort((a,b)=>(roll(l.seed,l.year*31+a.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0))+relevant(a))-
                       (roll(l.seed,l.year*31+b.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0))+relevant(b)));
   const e=pool[0];s.seen.push(e.id);s.queue.push({id:l.year+'-'+e.id,eventId:e.id,year:l.year});
  }
 }
 promote(l,s);
}
function choose(l,i){
 const s=ensure(l),e=byId.get(s?.active?.eventId);
 if(!e||!l.alive||!Number.isInteger(i)||i<0||i>=e.opts.length)return false;
 const o=e.opts[i],d=o.change,j=J.ensure(l),v=V2.ensure(l),village=V9.ensure(l),id=s.active.id;
 const stats={};for(const k of ['health','happiness','bonds','knowledge','wealth'])if(Number.isFinite(d[k]))stats[k]=d[k];
 l.change(stats);
 if(Number.isFinite(d.capital))j.capital=clamp(j.capital+d.capital,-120,600);
 if(Number.isFinite(d.grain))v.grain=clamp(v.grain+d.grain,0,200);
 if(Number.isFinite(d.water))village.water=clamp(village.water+d.water,0,100);
 if(Number.isFinite(d.trust)){
  village.trust=clamp(village.trust+d.trust,0,100);
  if(village.homes[0])village.homes[0].trust=clamp(village.homes[0].trust+d.trust,0,100);
 }
 if(Number.isFinite(d.literacy))j.literacy=clamp(j.literacy+d.literacy,0,30);
 for(const key of ['diving','nets','safety','catch','materials','goods','customers','skill','firewood','herbs','medicine'])
  if(Number.isFinite(d[key]))s[key]=clamp(s[key]+d[key],0,key==='safety'?100:40);
 if(l.money&&l.year<1900)l.money.netWorth=j.capital*100;
 l.logEvent(e.title+' — '+o.label,'joseon12-choice');
 l.log.at(-1).causeId='joseon12:'+id;
 if(e.src)l.log.at(-1).sourceUrl=e.src;
 s.decisions.push({id,eventId:e.id,year:l.year,choice:i});s.decisions=s.decisions.slice(-70);
 s.followups.push({id,year:l.year+2+(i%2),text:o.after.replaceAll('{neighbor}',village.homes[0]?.name||'이웃')});
 s.followups=s.followups.slice(-70);
 s.latestSource=e.src;s.active=null;l.pending=null;
 if(o.danger&&roll(l.seed,l.year*7+e.id.length*61+i*123)<o.danger){
  l.finish(e.id==='diverFatigue'?'물질을 계속하다 바다에서 돌아오지 못했다.':
           e.id==='boarField'?'산짐승을 쫓다가 크게 다쳐 목숨을 잃었다.':'험한 일 중 크게 다쳐 목숨을 잃었다.');
 }else promote(l,s);
 return true;
}
function summary(l){
 const s=ensure(l);if(!s)return null;
 const j=J.summary(l),origin=V5.summary(l);
 const k=interests(l,j,origin,s);
 const work=k.diver?'잠녀의 물질':k.fisher?'포구의 어업과 배':k.crafts?'손기술과 물건 제작':
  k.merchant?'장시와 행상':k.farm?'농사와 집안의 일':'고을에서 이어가는 생업';
 return {work,diving:s.diving,nets:s.nets,safety:s.safety,catch:s.catch,materials:s.materials,goods:s.goods,
  customers:s.customers,skill:s.skill,firewood:s.firewood,herbs:s.herbs,medicine:s.medicine,decisions:s.decisions.length,
  memory:s.memories.at(-1)||null,source:s.latestSource};
}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseon12;if(!s||!o||o.version!==1)return s;
 const safe=q=>q&&byId.has(q.eventId)&&typeof q.id==='string'&&Number.isInteger(q.year)&&q.year>=l.birthYear&&q.year<=l.year?
  {id:q.id.slice(0,72),eventId:q.eventId,year:q.year}:null;
 s.processedYear=clamp(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(x=>byId.has(x)).slice(-EVENTS.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.map(safe).filter(Boolean).slice(-3):[];
 s.active=safe(o.active);
 if(!l.alive||!J.inOldEra(l)||data?.pending!=='joseon12:'+s.active?.id)s.active=null;
 if(s.active)l.pending='joseon12:'+s.active.id;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(x=>x&&byId.has(x.eventId)&&typeof x.id==='string'&&Number.isInteger(x.year)&&x.year<=l.year)
  .slice(-70).map(x=>({id:x.id.slice(0,72),eventId:x.eventId,year:x.year,choice:clamp(Number(x.choice)||0,0,2)})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'&&Number.isInteger(x.year)&&x.year>l.year&&x.year<=l.year+5)
  .slice(-70).map(x=>({id:x.id.slice(0,72),year:x.year,text:x.text.slice(0,240)})):[];
 for(const key of ['diving','nets','safety','catch','materials','goods','customers','skill','firewood','herbs','medicine'])
  if(Number.isFinite(o[key]))s[key]=clamp(o[key],0,key==='safety'?100:40);
 s.memories=Array.isArray(o.memories)?o.memories.filter(x=>typeof x==='string').slice(-22).map(x=>x.slice(0,240)):[];
 s.latestSource=typeof o.latestSource==='string'&&Object.values(SOURCES).includes(o.latestSource)?o.latestSource:null;
 return s;
}
function install(){
 if(!Sim?.Life||!J?.inOldEra||!V2?.ensure||!V4?.summary||!V5?.summary||!V9?.ensure||Sim.Life.prototype.__joseon12)return false;
 const L=Sim.Life,tick=L.prototype.tick,choice=L.prototype.getChoice,chooseOld=L.prototype.choose,
  reflect=L.prototype.reflect,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this))return tick.call(this);
  const y=this.year,ok=tick.call(this);
  if(ok&&this.alive&&this.year!==y)yearly(this,ensure(this));return ok;
 };
 L.prototype.getChoice=function(){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseon12:'))return dynamic(this,byId.get(ensure(this)?.active?.eventId));
  return choice.call(this);
 };
 L.prototype.choose=function(i){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseon12:'))return choose(this,i);
  const ok=chooseOld.call(this,i);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;
 };
 L.prototype.reflect=function(t){const ok=reflect.call(this,t);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const v=snapshot.call(this);if(J.isJoseon(this))v.joseon12=JSON.parse(JSON.stringify(ensure(this)));return v;};
 L.restore=function(data){const life=restore.call(this,data);if(life&&J.isJoseon(life))hydrate(life,data);return life;};
 Object.defineProperty(L.prototype,'__joseon12',{value:true});return true;
}
install();
return Object.freeze({EVENTS,SOURCES,ensure,eligible,interests,yearly,choose,dynamic,summary,hydrate,install});
});
