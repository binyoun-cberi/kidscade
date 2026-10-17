/* One Life — Joseon occupations v6: long-lived work, people, resources and legacy.
 * Career opportunities are fictional narrative systems constrained by the Joseon modules.
 * Never present job frequencies, salary numbers or invented pupils as historical statistics.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon5);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon6=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V5){
'use strict';
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const roll=(seed,n)=>{let x=(seed^Math.imul(n+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;};
// These are professional paths, not birth statuses. Other historical jobs continue
// in v1-v5 and may enter this system through a career change.
const CAREERS=Object.freeze({
 teacher:{name:'서당 훈장',female:'집안과 마을의 글 선생',supply:'서책',supplyKey:'books',asset:'학동',assetKey:'pupils',origin:['문반 양반','몰락 양반'],keywords:/가르치|훈장|서당/,initial:3},
 inn:{name:'주막을 꾸리는 사람',female:'주막 주모',supply:'식재료',supplyKey:'ingredients',asset:'단골',assetKey:'regulars',origin:['주막 가계'],keywords:/주막|주모/,initial:5},
 fisher:{name:'어부·뱃사공',female:'어부·뱃사공',supply:'배와 그물',supplyKey:'nets',asset:'거래처',assetKey:'buyers',origin:['어부 가계','수군 가계'],keywords:/어부|어업|조업|뱃사공/,initial:4},
 smith:{name:'대장장이',female:'쇠붙이 장인',supply:'쇠와 숯',supplyKey:'iron',asset:'주문',assetKey:'orders',origin:['대장장이 가계','관청 장인'],keywords:/대장장이|쇠를 달구|대장간/,initial:4},
 merchant:{name:'보부상·상인',female:'행상·상인',supply:'물품',supplyKey:'goods',asset:'거래 인연',assetKey:'clients',origin:['보부상 가계','상인 가계'],keywords:/상인|보부상|장사|장터/,initial:5},
 healer:{name:'의원',female:'마을의 의료·돌봄인',supply:'약재',supplyKey:'herbs',asset:'돌본 사람',assetKey:'patients',origin:['의관 가계','사찰 주변 가계'],keywords:/의관|의원|의술|약재/,initial:4}
});
const PATHS=Object.keys(CAREERS);
// 12 distinct authored events per core livelihood, each with three decisions.
// Strategy controls uncertain resource effects; text and conflicts are specific.
const EPISODES={
 teacher:[
 ['서당을 열 첫날','고을 아이들이 배우러 오지만 책이 넉넉하지 않다.',[['내 서책을 함께 읽게 한다','care'],['헌 서책을 구한다','invest'],['마을 어른에게 책을 부탁한다','cooperate']]],
 ['농번기의 빈자리','논밭에서 일해야 할 아이들이 서당에 나오지 못한다.',[['새벽에 글을 가르친다','adapt'],['농번기에는 쉬어 간다','rest'],['가족과 수업 시간을 상의한다','cooperate']]],
 ['읽지 못하는 학동','또래보다 글을 느리게 익히는 아이가 울먹인다.',[['한 글자씩 함께 익힌다','care'],['다른 가르침을 연구한다','study'],['배울 시간을 더 마련한다','mentor']]],
 ['서책이 젖은 물난리','비가 새어 서당의 책 몇 권이 젖었다.',[['쓸 수 있는 책을 말린다','repair'],['새 책을 빌려 온다','invest'],['학동들과 낱장을 옮겨 적는다','mentor']]],
 ['훈장의 보수','학동의 집에서 가르친 대가를 제때 마련하기 어렵다고 한다.',[['형편이 될 때까지 기다린다','care'],['곡식과 일손으로 받는다','adapt'],['마을에서 서당 살림을 의논한다','cooperate']]],
 ['말썽을 부린 제자','한 아이가 친구와 다투어 수업이 중단됐다.',[['두 아이의 말을 차례로 듣는다','care'],['서당의 약속을 다시 세운다','study'],['부모를 불러 함께 이야기한다','cooperate']]],
 ['먼 고을의 훈장 제안','다른 마을에서 더 많은 학동을 가르쳐 달라고 청한다.',[['고향 아이들을 계속 가르친다','care'],['먼 고을의 사정을 알아본다','risk'],['보조 훈장을 길러 본다','mentor']]],
 ['과거에 낙방한 제자','오래 가르친 제자가 낙담해 돌아왔다.',[['제자의 이야기를 들어 준다','care'],['다른 생업을 알아보도록 돕는다','adapt'],['함께 후배를 가르치자고 권한다','mentor']]],
 ['흥미를 잃은 아이들','학동들이 외운 글을 삶에 어떻게 쓰는지 묻는다.',[['고을의 편지를 함께 읽는다','study'],['셈과 장부 읽기도 가르친다','adapt'],['아이들의 이야기를 먼저 듣는다','care']]],
 ['서당의 추운 겨울','땔감이 떨어져 서당이 몹시 춥다.',[['책을 보존하고 수업을 줄인다','rest'],['땔감을 마련한다','invest'],['마을 사람과 공간을 나눈다','cooperate']]],
 ['제자에게 맡길 서당','나이가 들어 새로운 훈장을 찾는 집안이 늘었다.',[['오래 배운 제자를 가르친다','mentor'],['함께 가르칠 사람을 청한다','cooperate'],['내 몸과 가족을 더 돌본다','rest']]],
 ['남겨 둔 글씨','오래전 가르친 아이가 편지와 선물을 보내왔다.',[['옛 제자의 안부를 묻는다','care'],['서당의 글과 약속을 정리한다','study'],['제자들에게 책을 나누어 준다','mentor']]]
 ],
 inn:[
 ['주막에 첫 손님','길손들이 찾아왔지만 음식이 넉넉하지 않다.',[['가진 재료로 상을 차린다','serve'],['장터에서 재료를 구한다','invest'],['이웃 주막과 물품을 나눈다','cooperate']]],
 ['외상값을 남긴 상인','먼 길을 가던 상인이 며칠 뒤 값을 치르겠다고 한다.',[['사정을 듣고 기다린다','care'],['지불할 날짜를 기록한다','study'],['일손으로 대신할지 묻는다','adapt']]],
 ['비를 피해 온 길손','폭우에 젖은 사람들이 주막에 몰려들었다.',[['잠자리를 양보한다','care'],['객실을 고쳐 자리를 늘린다','invest'],['동네 집들과 나누어 묵게 한다','cooperate']]],
 ['상한 식재료','더위로 음식에 쓸 재료 일부가 상했다.',[['버리고 다른 음식을 준비한다','rest'],['재료 보관법을 고친다','study'],['새 재료를 사러 간다','invest']]],
 ['소문의 진상','주막에 들른 나그네가 고을의 흉흉한 소문을 전한다.',[['사실인지 더 알아본다','study'],['손님이 불안하지 않게 한다','care'],['마을 어른에게 알린다','cooperate']]],
 ['길목에 새 주막','가까운 곳에 다른 주막이 문을 열었다.',[['음식 맛을 다듬는다','study'],['단골의 이야기를 들어 본다','care'],['새로운 물건을 들여놓는다','risk']]],
 ['혼자 남은 나그네','병이 든 길손을 돌볼 사람이 없다.',[['쉬어 갈 자리를 마련한다','care'],['이웃 의원을 찾아간다','cooperate'],['주막 일을 도울 사람을 구한다','invest']]],
 ['먼 장시의 상인들','큰 장을 마친 상인들이 한꺼번에 묵겠다고 한다.',[['방을 나누어 제공한다','serve'],['재료를 더 구한다','invest'],['이웃 주막과 손님을 나눈다','cooperate']]],
 ['장작이 떨어진 겨울','한파 속에 불을 피울 장작이 모자란다.',[['손님에게 형편을 설명한다','cautious'],['장작을 사 온다','invest'],['이웃과 땔감을 구한다','cooperate']]],
 ['오래된 단골의 부재','매해 찾아오던 단골이 이번에는 모습을 보이지 않는다.',[['길손에게 안부를 묻는다','care'],['거래 기록을 정리한다','study'],['가족에게 주막 일을 가르친다','mentor']]],
 ['주막의 빚','한 해의 재료값이 벌이를 넘어섰다.',[['장부를 다시 살핀다','study'],['메뉴를 줄이고 버틴다','cautious'],['이웃 상인과 협의한다','cooperate']]],
 ['다음 주인에게','손님이 앉아 있던 자리를 오래 바라보았다.',[['가족에게 일을 가르친다','mentor'],['남은 빚과 물건을 정리한다','study'],['단골에게 마지막 안부를 전한다','care']]]
 ],
 fisher:[
 ['첫 출항','바람이 잦아들었지만 조업하기에는 아직 조심스럽다.',[['물때를 살핀 뒤 나선다','cautious'],['노련한 어부와 함께 간다','cooperate'],['그물을 손질하고 준비한다','repair']]],
 ['찢어진 그물','고기가 빠져나간 자리에 구멍이 생겼다.',[['그물을 손질한다','repair'],['새 그물을 구한다','invest'],['동료와 그물 수선법을 배운다','study']]],
 ['뜻밖의 풍랑','새벽부터 바람이 강해지며 물결이 높아졌다.',[['조업을 멈추고 돌아온다','cautious'],['동료들과 함께 배를 지킨다','cooperate'],['남은 고기를 잡으러 더 나간다','risk']]],
 ['포구의 값 흥정','잡은 물고기의 값이 예상보다 낮게 불렸다.',[['팔 시기를 조금 늦춘다','cautious'],['다른 거래처를 알아본다','study'],['여럿이 함께 값을 의논한다','cooperate']]],
 ['빈 그물의 날','몇 날 동안 물고기가 잘 잡히지 않았다.',[['배를 쉬게 하고 고친다','repair'],['다른 어장을 알아본다','risk'],['육지의 일손을 도우며 버틴다','adapt']]],
 ['새 배를 마련할까','오랫동안 쓴 배가 조금씩 낡았다.',[['수리에 힘쓴다','repair'],['모은 돈으로 배를 손본다','invest'],['동료와 배를 함께 쓴다','cooperate']]],
 ['위험한 해안 소식','포구에 해안 약탈과 충돌을 걱정하는 소식이 들렸다.',[['해안 가까이에서 지낸다','cautious'],['주민들과 대비한다','cooperate'],['안전한 물길을 찾아본다','study']]],
 ['물고기를 말리는 법','멀리 팔기 전에 생선을 상하지 않게 보관해야 한다.',[['말리고 저장하는 법을 배운다','study'],['필요한 물건을 마련한다','invest'],['이웃과 손질하는 일을 나눈다','cooperate']]],
 ['젊은 뱃사공','젊은이가 배를 다루는 법을 가르쳐 달라고 한다.',[['물때를 먼저 가르친다','mentor'],['함께 배를 손질한다','repair'],['처음에는 얕은 곳에서 연습한다','cautious']]],
 ['늙은 선원의 손','함께 타던 사람이 예전만큼 힘을 쓰지 못한다.',[['할 수 있는 일을 나눈다','care'],['다른 일꾼을 구한다','invest'],['배에서 내려 쉬도록 권한다','rest']]],
 ['포구의 이별','오랫동안 거래하던 상인이 다른 고을로 떠난다고 한다.',[['새 거래처를 찾아본다','study'],['이웃에게 소개를 부탁한다','cooperate'],['서로의 안부를 기억한다','care']]],
 ['마지막 조업','몸과 바다의 변화를 느끼며 오래된 배를 바라본다.',[['후배에게 물길을 알려 준다','mentor'],['배와 그물을 정리한다','repair'],['가족과 남은 시간을 보낸다','rest']]]
 ],
 smith:[
 ['첫 주문','농기구가 망가진 농민이 대장간으로 찾아왔다.',[['필요한 부분부터 고친다','serve'],['쇠를 더 들여놓는다','invest'],['오래 쓰는 법을 연구한다','study']]],
 ['부족한 숯','숯과 쇠를 구하기 어려운 때가 왔다.',[['급한 물건부터 만든다','cautious'],['다른 장터에서 재료를 구한다','risk'],['이웃 대장장이와 재료를 나눈다','cooperate']]],
 ['불에 덴 손','작업 중 손을 다쳐 한동안 일하기 어렵다.',[['몸을 돌보며 쉰다','rest'],['다른 일꾼과 작업을 나눈다','cooperate'],['도구와 작업 방식을 손본다','repair']]],
 ['관아의 주문','관아에서 정해진 날짜까지 물건을 만들라고 한다.',[['날짜에 맞춰 일을 나눈다','adapt'],['품질을 우선해 사정을 알린다','study'],['함께 만드는 장인에게 부탁한다','cooperate']]],
 ['금이 간 쇠붙이','납품하려던 물건에 균열이 생겼다.',[['다시 달구어 고친다','repair'],['재료와 온도를 연구한다','study'],['다른 물건으로 바꿔 주겠다 한다','care']]],
 ['제자를 들이다','젊은이가 대장간에서 일하며 기술을 배우고 싶어 한다.',[['작은 농기구부터 가르친다','mentor'],['불과 쇠의 위험을 먼저 익힌다','cautious'],['함께 손질할 도구를 마련한다','invest']]],
 ['큰불의 위험','대장간 근처에 불씨가 옮겨붙을 뻔했다.',[['불씨를 살피고 작업을 멈춘다','cautious'],['화덕 주변을 수리한다','repair'],['이웃과 대비 방법을 상의한다','cooperate']]],
 ['먼 고을의 주문','어느 고을에서 많은 물건을 만들어 달라고 한다.',[['가능한 만큼만 받는다','cautious'],['일손과 재료를 늘린다','invest'],['동료 장인들과 나누어 맡는다','cooperate']]],
 ['농기구의 변화','농민들이 이전과 조금 다른 연장을 찾는다.',[['농민의 말을 들어 본다','care'],['새 제작법을 연구한다','study'],['시험 삼아 만들어 본다','risk']]],
 ['재료비가 오른 해','쇠를 사는 돈이 이전보다 많이 든다.',[['일감을 골라 맡는다','cautious'],['장부를 다시 살핀다','study'],['서로 재료를 구하도록 돕는다','cooperate']]],
 ['옛 제자의 귀향','대장간을 떠났던 제자가 다시 찾아왔다.',[['그동안 배운 기술을 묻는다','mentor'],['일을 나누어 맡는다','cooperate'],['함께 만든 물건을 살펴본다','care']]],
 ['낡은 망치','손에 익은 망치를 내려놓을 날이 가까워졌다.',[['망치와 기술을 전한다','mentor'],['남은 주문을 정리한다','study'],['몸을 돌보며 쉬어 간다','rest']]]
 ],
 merchant:[
 ['첫 장시','가져온 물건을 팔 자리를 찾는 일이 쉽지 않다.',[['시세를 알아본다','study'],['조금씩 팔아 본다','trade'],['다른 장사꾼에게 묻는다','cooperate']]],
 ['험한 고갯길','멀리 장터로 가는 길에 비가 많이 내렸다.',[['안전한 길을 택한다','cautious'],['다른 상인과 함께 간다','cooperate'],['길을 재촉한다','risk']]],
 ['외상 거래','단골이 다음 장날에 돈을 갚겠다고 한다.',[['형편을 듣고 약속한다','care'],['외상값을 장부에 남긴다','study'],['일부 물건만 먼저 건넨다','adapt']]],
 ['물품 가격이 내리다','물건의 값이 떨어져 가져온 짐이 무거워졌다.',[['손해를 줄이며 판다','trade'],['다른 고을의 값을 알아본다','risk'],['이웃과 장터 정보를 나눈다','cooperate']]],
 ['머물 곳 없는 밤','눈보라에 길이 막혀 주막에 묵어야 한다.',[['길이 나아질 때까지 기다린다','cautious'],['묵을 곳을 구한다','invest'],['길동무와 서로 돕는다','cooperate']]],
 ['거래처의 약속','자주 물건을 받던 사람이 수량을 줄이겠다고 한다.',[['다른 거래처를 알아본다','study'],['남은 거래를 지킨다','care'],['새 물건을 찾아본다','risk']]],
 ['장터의 세금과 단속','고을에서 거래 방식과 부담을 새로 알린다.',[['규정을 알아본다','study'],['관아와 사정을 상의한다','adapt'],['동료 상인과 의견을 나눈다','cooperate']]],
 ['짐을 잃다','이동하던 길에 짐의 일부를 잃어버렸다.',[['남은 물건을 살핀다','cautious'],['거래처에 사정을 알린다','care'],['새 짐을 마련한다','invest']]],
 ['후배 보부상','젊은 장사꾼이 물건을 고르는 법을 물었다.',[['좋은 물건을 가려 보인다','mentor'],['고을별 시세를 알려 준다','study'],['위험한 길을 함께 돌아본다','cooperate']]],
 ['장시가 커지다','고을 장터를 찾는 사람이 전보다 많아졌다.',[['물건을 더 준비한다','invest'],['오래된 단골을 챙긴다','care'],['새 거래처로 나아간다','risk']]],
 ['거래 장부를 펼치다','오랜 세월의 장부에 빚과 신용이 함께 남았다.',[['갚을 몫부터 정리한다','study'],['서로 도움 받은 일을 돌아본다','care'],['가족에게 거래처를 소개한다','mentor']]],
 ['마지막 장날','늘 다니던 장터 풍경이 낯설고도 정겹다.',[['가족에게 장사를 알려 준다','mentor'],['오래된 거래처에 인사한다','care'],['짐을 줄이고 쉬어 간다','rest']]]
 ],
 healer:[
 ['아픈 이웃','감기에 걸린 이웃이 도움을 청한다.',[['증세를 자세히 살펴본다','study'],['몸을 쉬게 돕는다','care'],['더 숙련된 의원을 찾아본다','cooperate']]],
 ['약재가 모자라다','필요한 약초를 구하기 어려운 때다.',[['다른 재료의 성질을 배운다','study'],['약재를 구하러 간다','invest'],['사찰과 이웃에게 도움을 청한다','cooperate']]],
 ['어려운 진단','여러 날 앓는 사람이 낫지 않아 가족들이 걱정한다.',[['경험 많은 의원에게 묻는다','cooperate'],['기록을 남기며 경과를 살핀다','study'],['환자 가족을 위로한다','care']]],
 ['가난한 환자','치료를 원하는 사람이 대가를 낼 형편이 아니다.',[['먼저 돌보고 나중을 생각한다','care'],['이웃과 재료를 마련한다','cooperate'],['감당할 수 있는 방법을 찾는다','adapt']]],
 ['역병의 소문','멀리서 질병이 번진다는 소식이 들려온다.',[['돌보는 사람에게 주의를 알린다','study'],['몸이 아픈 이를 살핀다','care'],['다른 의원과 정보를 나눈다','cooperate']]],
 ['의술을 배우는 사람','젊은이가 환자를 살피는 법을 배우고 싶어 한다.',[['증세를 묻는 법부터 가르친다','mentor'],['약재를 구별하는 법을 알려 준다','study'],['먼저 위생과 휴식을 챙긴다','cautious']]],
 ['약재를 잘못 보관하다','약초 일부가 눅눅해져 쓸 수 없게 됐다.',[['상한 약재를 버린다','cautious'],['새 약재를 마련한다','invest'],['보관법을 고친다','repair']]],
 ['사람들의 오해','환자가 나아지지 않아 가족들이 화를 낸다.',[['할 수 있는 일과 한계를 설명한다','care'],['경험 많은 사람에게 도움을 청한다','cooperate'],['기록을 다시 살핀다','study']]],
 ['밤중에 온 사람','늦은 밤 문을 두드리는 환자가 찾아온다.',[['먼저 상태를 살펴본다','study'],['이웃에게 도움을 부탁한다','cooperate'],['급한 돌봄을 한다','care']]],
 ['먼 마을의 부탁','다른 고을에서 아픈 사람을 봐 달라고 청한다.',[['환자를 살피러 간다','risk'],['다른 의원을 소개한다','cooperate'],['갈 수 있는 날을 상의한다','adapt']]],
 ['오래된 치료 기록','오랜 세월 적어 둔 병과 약재 이야기를 펼쳐 보았다.',[['배운 것을 정리한다','study'],['다음 사람에게 가르친다','mentor'],['도움을 준 환자의 안부를 묻는다','care']]],
 ['배움의 끝은 없다','몸이 예전 같지 않아 일손을 천천히 줄여야 한다.',[['후배에게 진료를 맡긴다','mentor'],['어려운 환자를 다른 의원에게 보낸다','cooperate'],['가족과 휴식 시간을 갖는다','rest']]]
 ]
};
const STANCES={
 care:{bonds:5,knowledge:1,capital:-1,stock:0,asset:1,quality:1,health:0},
 cooperate:{bonds:5,knowledge:1,capital:-2,stock:1,asset:1,quality:2,health:0},
 mentor:{bonds:5,knowledge:2,capital:-1,stock:0,asset:1,quality:2,health:-1},
 study:{bonds:0,knowledge:5,capital:-2,stock:0,asset:0,quality:3,health:0},
 invest:{bonds:0,knowledge:1,capital:-5,stock:3,asset:0,quality:1,health:-1},
 repair:{bonds:1,knowledge:2,capital:-3,stock:2,asset:0,quality:3,health:-1},
 serve:{bonds:3,knowledge:1,capital:5,stock:-2,asset:1,quality:1,health:-2},
 trade:{bonds:1,knowledge:2,capital:6,stock:-2,asset:1,quality:0,health:-2},
 adapt:{bonds:2,knowledge:3,capital:1,stock:0,asset:0,quality:2,health:-1},
 risk:{bonds:0,knowledge:1,capital:10,stock:-1,asset:1,quality:0,health:-3},
 cautious:{bonds:1,knowledge:1,capital:-1,stock:0,asset:0,quality:1,health:2},
 rest:{bonds:3,knowledge:0,capital:-2,stock:0,asset:0,quality:0,health:4}
};
const FOLLOW={
 care:'그때 사정을 들어주었던 사람이 다시 찾아와 안부를 전했다.',
 cooperate:'그날 함께 일했던 이웃과 다시 품과 소식을 나누었다.',
 mentor:'예전에 함께 배웠던 사람이 혼자서도 자기 일을 해 나간다는 소식을 들었다.',
 study:'그때 새로 익힌 방법이 다음 일을 판단하는 데 도움이 되었다.',
 invest:'마련해 둔 물건이 도움이 되기도 했지만 비용을 다시 살펴야 했다.',
 repair:'손질했던 도구와 공간이 한동안 쓰였다. 다음 수선이 필요할 때도 있었다.',
 serve:'그때 맡았던 일이 끝난 뒤에도 비슷한 일을 다시 부탁받았다.',
 trade:'거래로 알게 된 사람과 다시 마주쳤다. 벌이는 해마다 달랐다.',
 adapt:'일을 다르게 해 보았던 경험 덕에 그다음 변화에 대비할 수 있었다.',
 risk:'그때 감수했던 위험이 다음 계절의 일과 살림에도 흔적을 남겼다.',
 cautious:'무리하지 않고 넘긴 날 덕분에 다음 일을 준비할 여유가 있었다.',
 rest:'쉼을 택했던 날을 떠올렸다. 일은 남았어도 몸과 가족을 살필 수 있었다.'
};
function available(life){
 if(!J?.isJoseon(life)||!J.inOldEra(life)||life.age<14||!life.alive)return false;
 const s=V5.ensure(life);
 return !(s.monastic||s.origin==='왕실 종친'||(['공노비','사노비'].includes(s.origin)&&!s.freed));
}
function codeFor(life){
 const social=V5.ensure(life),j=J.ensure(life),job=[j.occupation,social.role].join(' ');
 for(const code of PATHS){if(CAREERS[code].keywords.test(job))return code;}
 if(social.origin==='의관 가계'&&/의술|의료/.test(job))return 'healer';
 return null;
}
function title(life,code,qualified=true){
 if(code==='teacher'&&!qualified)return '가르침을 배우는 사람';
 if(code==='healer'&&!qualified)return '의술을 익히는 사람';
 return life.gender==='여자'?CAREERS[code].female:CAREERS[code].name;
}
function starter(life,code){
 const j=J.ensure(life),cfg=CAREERS[code],trained=code!=='teacher'&&code!=='healer'||
  code==='teacher'&&(j.studyYears>=2||life.stats.knowledge>=58)||
  code==='healer'&&(j.literacy>=2||life.stats.knowledge>=65);
 const resources={[cfg.supplyKey]:cfg.initial,[cfg.assetKey]:code==='teacher'?3:1};
 return {code,started:life.year,trained,practice:trained?3:0,quality:18,
  resources,reputation:10,contacts:[],events:0,stories:[],seen:[],ended:null};
}
function remember(life,state,text,kind='joseon6-memory'){
 life.logEvent(text,kind);state.memories.push(text);state.memories=state.memories.slice(-32);
}
function ensure(life){
 if(!J?.isJoseon(life))return null;
 let s=life.joseon6;
 if(!s){
  s=life.joseon6={version:1,career:null,secondary:null,history:[],pending:[],active:null,followups:[],
   lastPromptYear:-1,seen:[],memories:[],decisions:0,processedYear:life.year};
 }
 if(life.gender==='여자'){
  const oldTeacher=[s.career,s.secondary].some(w=>w?.code==='teacher');
  if(oldTeacher){
   s.domesticTeaching=true;
   if(s.career?.code==='teacher')s.career=null;
   if(s.secondary?.code==='teacher')s.secondary=null;
   if(/글 선생|가르치|훈장|서당/.test(J.ensure(life).occupation)){
    J.ensure(life).occupation='집안의 글공부와 살림';
    life.career=J.ensure(life).occupation;
    V5.ensure(life).role=J.ensure(life).occupation;
   }
  }
  s.pending=s.pending.filter(q=>q.code!=='teacher'&&!q.choices?.some(o=>/^(enter|side):teacher$/.test(o.action)));
  if(s.active&&(s.active.code==='teacher'||s.active.choices?.some(o=>/^(enter|side):teacher$/.test(o.action)))){
   if(life.pending==='joseon6:'+s.active.id)life.pending=null;
   s.active=null;
  }
 }
 return s;
}
function adopt(life,code,{secondary=false}={}){
 const s=ensure(life),j=J.ensure(life);
 if(!s||!CAREERS[code]||!available(life)||life.age<14||(code==='teacher'&&life.gender==='여자'))return false;
 if(secondary&&s.career?.code===code)return false;
 if(secondary&&s.career&&s.secondary&&s.secondary.code!==code)return false;
 const work=starter(life,code);
 if(secondary)s.secondary=work;
 else{
  if(s.career&&s.career.code!==code){
   s.career.ended=life.year;
   s.history.push({code:s.career.code,from:s.career.started,to:life.year});
   if(s.secondary?.code===code)s.secondary=null;
  }
  s.career=work;
  const social=V5.ensure(life);
  // A professional title is earned after enough training, not on simply
  // selecting 'teach' or coming from a medical family.
  social.role=title(life,code,work.trained);
  j.occupation=social.role;
  if(life.year<1900)life.career=j.occupation;
 }
 remember(life,s,(secondary?'틈틈이 ':'')+title(life,code,work.trained)+'의 길을 시작했다. 생업을 꾸리는 일은 매해 같지 않았다.');
 return true;
}
function discover(life){
 const s=ensure(life);if(!available(life)||!s)return;
 const code=codeFor(life);
 if(code&&(!s.career||s.career.code!==code))adopt(life,code);
}
function offer(life,s,id,titleText,description,choices,type,code=null,eventIndex=-1){
 if(s.seen.includes(id)||s.active?.id===id||s.pending.some(x=>x.id===id))return;
 s.seen.push(id);s.seen=s.seen.slice(-160);
 s.pending.push({id,title:titleText,description,choices,type,code,eventIndex,year:life.year});
 s.pending=s.pending.slice(-4);
 promote(life,s);
}
function promote(life,s){
 if(!s||s.active||life.pending||!life.alive||!J.inOldEra(life)||!s.pending.length)return;
 s.active=s.pending.shift();life.pending='joseon6:'+s.active.id;
}
function pathway(life,s){
 const j=J.ensure(life),social=V5.ensure(life);
 const preferred=PATHS.filter(c=>CAREERS[c].origin.includes(social.origin));
 const fallback=PATHS.filter(c=>!preferred.includes(c));
 const shuffled=fallback.map((code,i)=>({code,sort:roll(life.seed,life.year+i*41+761)}))
  .sort((a,b)=>a.sort-b.sort).map(o=>o.code);
 const options=[...preferred,...shuffled].filter(c=>
  c!=='teacher'||(life.gender==='남자'&&(j.studyYears>=1||life.stats.knowledge>=40)));
 const availableOptions=options.filter(c=>c!==s.career?.code&&c!==s.secondary?.code);
 const picks=availableOptions.slice(0,2);
 if(!picks.length)return;
 let choices;
 if(s.career){
  const target=picks[0];
  choices=[
   s.secondary?{label:'두 생업의 시간을 조정한다',action:'balance',
    note:'겸업을 유지하면서 몸과 살림에 무리가 없도록 일을 조정한다.'}:
    {label:CAREERS[target].name+'을 겸업으로 배운다',action:'side:'+target,
    note:'기존 일을 계속하지만 두 생업을 함께 돌보려면 시간과 몸을 나누어야 한다.'},
   {label:CAREERS[(picks[1]||target)].name+'으로 전직한다',action:'enter:'+(picks[1]||target),
    note:'지금까지 쌓은 경험은 남지만 새 생업의 살림을 다시 꾸려야 한다.'},
   {label:'지금의 생업을 계속 이어 간다',action:'continue',
    note:'일을 계속하는 것도 스스로 선택한 의미 있는 삶이다.'}
  ];
 }else{
  choices=picks.map(code=>({label:CAREERS[code].name+'의 길을 알아본다',
   action:'enter:'+code,note:'가르침이나 전문 의료는 배우는 시간이 필요하다.'}));
  if(choices.length===1)choices.push({label:'이웃과 생업을 배워 본다',
   action:'continue',note:'바로 직업을 바꾸지 않고 지낸다.'});
  choices.push({label:'지금의 생업을 이어 간다',action:'continue',
   note:'지금의 일이 더 중요할 수도 있다.'});
 }
 offer(life,s,life.year+'-path','나의 일과 배움의 갈림길',
  '가문과 지금까지 익힌 일, 새로운 기회 사이에서 어느 길로 나아갈지 생각한다.',
  choices,'path');
}
function careerEvent(life,s,work,secondary=false){
 if(!work||work.ended||life.age<16)return;
 const years=life.year-work.started;
 const at=Math.floor((years-2)/4);
 if(years<2||at<0||at>=12||years%4!==2)return;
 const id=life.year+'-'+work.code+(secondary?'-side':'-work');
 if(work.events>at)return;
 const event=EPISODES[work.code][at];
 work.events=at+1;
 const choices=event[2].map(([label,action])=>({label,action,note:'살림과 몸, 기술과 인연에 서로 다른 흔적을 남긴다.'}));
 offer(life,s,id,event[0],event[1],choices,'career',work.code,at);
}
function yearEnd(life,s){
 if(!s||!J.inOldEra(life)||!life.alive||life.joseon14?.captivity?.status==='held')return;
 for(const f of s.followups.filter(x=>x.year<=life.year)){
  const text=(f.topic?'그때 겪은 ‘'+f.topic+'’을 떠올렸다. ':'')+(f.failed?'그때 일을 마치지 못해 들인 품과 비용을 되찾지는 못했다.':FOLLOW[f.action]||'그 뒤에도 하던 일을 이어 가며 끼니와 살림을 마련했다.');
  life.logEvent(text,'joseon6-followup');life.log.at(-1).causeId='joseon6:'+f.id;
  s.memories.push(text);
 }
 s.memories=s.memories.slice(-32);
 s.followups=s.followups.filter(x=>x.year>life.year);
 s.processedYear=life.year;
 if(!available(life))return;
 discover(life);
 for(const work of [s.career,s.secondary]){
  if(work&&!work.trained){
   work.practice+=life.age>18?1:0;
   if(work.practice>=3){work.trained=true;
    if(work===s.career){const name=title(life,work.code,true);V5.ensure(life).role=name;J.ensure(life).occupation=name;life.career=name;}
    remember(life,s,'여러 해의 배움과 경험을 쌓아 이제 '+title(life,work.code)+'의 일을 맡게 되었다.');
   }
  }
 }
 // Work changes arise from genuine household hardship or absence of a settled trade,
 // not simply because a birthday has passed.
 const j=J.ensure(life);
 const needsNewPath=!s.career||(j.capital<-25&&!j.retired)||(j.hardshipUntil>=life.year&&j.hardshipUntil>0);
 if([25,37,49].includes(life.age)&&!s.active&&needsNewPath)pathway(life,s);
 // Alternate between primary and secondary on eligible years, never create
 // more than one career-specific choice in a calendar year.
 const side=!!s.secondary&&life.age%8>=4;
 careerEvent(life,s,side?s.secondary:s.career,side);
}
function prompt(life){
 const s=ensure(life),q=s?.active;if(!q)return null;
 const work=q.type==='career'?[s.career,s.secondary].find(x=>x?.code===q.code):null;
 return {title:q.title,description:q.description,options:q.choices.map(x=>{
  const rule=STANCES[x.action],supply=work&&CAREERS[work.code].supplyKey;
  const unavailable=rule?.stock<0&&work&&work.resources[supply]<-rule.stock;
  return unavailable?{label:'부족한 '+CAREERS[work.code].supply+'을 구할 다른 방법을 찾는다',
   note:'지금 가진 재료로는 원래 하려던 일을 할 수 없다.',action:'adapt'}:
   {label:x.label,note:x.note||'',action:x.action};
 })};
}
function updateWork(life,work,action,eventIndex){
 const cfg=CAREERS[work.code],supply=cfg.supplyKey,asset=cfg.assetKey;
 const rule=STANCES[action]||STANCES.care,j=J.ensure(life);
 const success=roll(life.seed,Math.imul(life.year+eventIndex*17,971)+action.length*41);
 const risk=action==='risk'&&success<.4;
 const beforeStock=work.resources[supply];
 const canSpend=work.resources[supply]>=Math.abs(Math.min(0,rule.stock));
 const deltaCash=risk?-7:canSpend?rule.capital:-1;
 if(rule.stock<0&&canSpend)work.resources[supply]+=rule.stock;
 if(rule.stock>0)work.resources[supply]=clamp(work.resources[supply]+rule.stock,0,60);
 work.resources[asset]=clamp(work.resources[asset]+(risk?0:rule.asset),0,45);
 work.quality=clamp(work.quality+rule.quality,0,100);
 work.reputation=clamp(work.reputation+(risk?-2:rule.bonds>0?2:1),0,100);
 j.capital=clamp(j.capital+deltaCash,-120,600);
 life.change({knowledge:rule.knowledge,bonds:rule.bonds,health:risk?-4:rule.health});
 if(life.year<1900){life.money.netWorth=j.capital*100;life.career=j.occupation;}
 return {success:!risk&&canSpend,deltaCash,needsMore:!canSpend,asset:work.resources[asset],supply:work.resources[supply],deltaStock:work.resources[supply]-beforeStock};
}
function choose(life,index){
 const s=ensure(life),p=prompt(life),q=s?.active;
 if(!q||!p||!life.alive||!Number.isInteger(index)||index<0||index>=p.options.length)return false;
 const picked=p.options[index],action=picked.action,work=q.type==='career'?
  [s.career,s.secondary].find(x=>x?.code===q.code&&x.started<=q.year&&(!x.ended||x.ended>=q.year)):null;
 const eventTitle=q.title;let failed=false;
 if(q.type==='path'){
  if(action.startsWith('enter:'))adopt(life,action.slice(6));
  else if(action.startsWith('side:'))adopt(life,action.slice(5),{secondary:true});
  else if(action==='balance'){
   life.change({health:-1,bonds:2});
   if(s.career)s.career.quality=clamp(s.career.quality+2,0,100);
   if(s.secondary)s.secondary.quality=clamp(s.secondary.quality+2,0,100);
  }else life.change({bonds:2});
 }else if(work){
  const result=updateWork(life,work,action,q.eventIndex);
  failed=!result.success;
  if(result.success){
   const cfg=CAREERS[work.code],parts=[];
   if(result.deltaStock>0)parts.push(cfg.supply+'을 더 마련했다');
   if(result.deltaStock<0)parts.push('가지고 있던 '+cfg.supply+' 일부를 써서 일을 마쳤다');
   if(result.deltaCash<0)parts.push('비용을 치러 집안에 남은 돈은 줄었다');
   if(result.deltaCash>0)parts.push('일을 마치고 받은 대가를 살림에 보탰다');
   if(parts.length)remember(life,s,parts.join('. ')+'.');
  }
  if(result.needsMore)remember(life,s,'필요한 '+CAREERS[work.code].supply+'이 부족해 계획한 일을 다 이루지 못했다.');
  if(action==='risk'&&!result.success)remember(life,s,'위험을 무릅썼지만 예상과 달리 손해를 겪었다.');
  if(result.success&&['mentor','care','cooperate','serve'].includes(action)){
   const names=['복이','동수','진이','서운','막동','금례','칠복','덕이'];
   const name=names[Math.floor(roll(life.seed,life.year+67)*names.length)];
   const person=work.contacts.find(x=>x.name===name);
   if(!person)work.contacts.push({name,met:life.year,link:action});
   work.contacts=work.contacts.slice(-12);
  }
  work.stories.push(eventTitle+' — '+picked.label);work.stories=work.stories.slice(-24);
  if(action==='mentor'&&work.code==='teacher')work.resources.pupils=clamp(work.resources.pupils+1,0,45);
 }
 const id='joseon6:'+q.id;
 life.logEvent(eventTitle+' — '+picked.label,'joseon6-choice');life.log.at(-1).causeId=id;
 s.decisions++;s.followups.push({id:q.id,year:life.year+3,action:action.replace(/^enter:/,''),topic:eventTitle,failed});s.followups=s.followups.slice(-40);
 s.active=null;life.pending=null;promote(life,s);
 return true;
}
function summary(life){
 const s=ensure(life);if(!s)return null;
 const format=w=>w?({name:title(life,w.code,w.trained),code:w.code,trained:w.trained,years:Math.max(0,(w.ended||Math.min(life.year,1900))-w.started),
  supply:CAREERS[w.code].supply+' '+w.resources[CAREERS[w.code].supplyKey],
  people:CAREERS[w.code].asset+' '+w.resources[CAREERS[w.code].assetKey],
  skills:w.quality,reputation:w.reputation,contacts:w.contacts.map(x=>x.name),stories:w.stories.slice(-2)}):null;
 return {primary:format(s.career),secondary:format(s.secondary),history:s.history.slice(-5),memories:s.memories.slice(-3),decisions:s.decisions};
}
function validWork(w,year){
 if(!w||!CAREERS[w.code]||!Number.isInteger(w.started)||w.started>year)return null;
 const cfg=CAREERS[w.code];
 const x={code:w.code,started:w.started,trained:false,practice:0,quality:18,
  resources:{[cfg.supplyKey]:cfg.initial,[cfg.assetKey]:w.code==='teacher'?3:1},
  reputation:10,contacts:[],events:0,stories:[],ended:null};
 x.code=w.code;x.started=w.started;x.trained=w.trained===true;x.practice=clamp(Number(w.practice)||0,0,100);
 x.quality=clamp(Number(w.quality)||0,0,100);x.reputation=clamp(Number(w.reputation)||0,0,100);
 x.events=clamp(Number(w.events)||0,0,12);
 x.ended=Number.isInteger(w.ended)&&w.ended<=year?w.ended:null;
 for(const key of [CAREERS[w.code].supplyKey,CAREERS[w.code].assetKey])x.resources[key]=clamp(Number(w.resources?.[key])||0,0,60);
 x.contacts=Array.isArray(w.contacts)?w.contacts.filter(o=>o&&typeof o.name==='string').slice(-12).map(o=>({name:o.name.slice(0,24),met:Number(o.met)||w.started,link:String(o.link||'care').slice(0,20)})):[];
 x.stories=Array.isArray(w.stories)?w.stories.filter(t=>typeof t==='string').slice(-24).map(t=>t.slice(0,180)):[];
 return x;
}
function hydrate(life,data){
 const s=ensure(life),old=data?.joseon6;if(!s||!old||old.version!==1)return s;
 s.career=validWork(old.career,life.year);s.secondary=validWork(old.secondary,life.year);
 s.history=Array.isArray(old.history)?old.history.filter(x=>x&&CAREERS[x.code]&&Number.isInteger(x.from)).slice(-20).map(x=>({code:x.code,from:x.from,to:Number(x.to)||life.year})):[];
 s.seen=Array.isArray(old.seen)?old.seen.filter(x=>typeof x==='string').slice(-160).map(x=>x.slice(0,70)):[];
 s.memories=Array.isArray(old.memories)?old.memories.filter(x=>typeof x==='string').slice(-32).map(x=>x.slice(0,220)):[];
 s.decisions=clamp(Number(old.decisions)||0,0,1000);
 s.processedYear=Math.min(life.year,Number(old.processedYear)||life.year);
 const clean=q=>{
  if(!q||typeof q.id!=='string'||!/^\d{4}-(?:path|(?:teacher|inn|fisher|smith|merchant|healer)-(?:side|work))$/.test(q.id)||!Array.isArray(q.choices)||q.choices.length!==3)return null;
  return {id:q.id.slice(0,70),type:q.type==='career'?'career':'path',title:String(q.title||'').slice(0,100),description:String(q.description||'').slice(0,240),
   choices:q.choices.map(o=>({label:String(o.label||'').slice(0,90),action:String(o.action||'care').slice(0,40),note:String(o.note||'').slice(0,130)})),
   code:CAREERS[q.code]?q.code:null,eventIndex:clamp(Number(q.eventIndex)||0,-1,11),year:clamp(Number(q.year)||life.year,life.birthYear,life.year)};
 };
 s.pending=Array.isArray(old.pending)?old.pending.map(clean).filter(Boolean).slice(-4):[];
 s.active=clean(old.active);
 if(!life.alive||!J.inOldEra(life)||data?.pending!=='joseon6:'+s.active?.id)s.active=null;
 s.domesticTeaching=old.domesticTeaching===true;
 s.followups=Array.isArray(old.followups)?old.followups.filter(x=>x&&typeof x.id==='string'&&Number.isInteger(x.year)&&x.year>life.year&&x.year<=life.year+4).slice(-40).map(x=>({id:x.id.slice(0,70),year:x.year,action:String(x.action||'').slice(0,30),topic:String(x.topic||'').slice(0,100),failed:x.failed===true})):[];
 return ensure(life);
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V5?.ensure||Sim.Life.prototype.__joseon6)return false;
 const L=Sim.Life,tick=L.prototype.tick,oldChoose=L.prototype.choose,oldGet=L.prototype.getChoice,
  oldReflect=L.prototype.reflect,oldSnapshot=L.prototype.snapshot,oldRestore=L.restore;
 L.prototype.tick=function(){
  if(!J.isJoseon(this))return tick.call(this);
  const s=ensure(this),year=this.year,ok=tick.call(this);
  if(ok&&this.year!==year&&this.alive)yearEnd(this,s);
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon6:'))return prompt(this);
  return oldGet.call(this);
 };
 L.prototype.choose=function(index){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon6:'))return choose(this,index);
  const oldPending=this.pending;
  const oldOption=typeof oldPending==='string'&&oldPending.startsWith('joseon:')?this.getChoice()?.options[index]?.action:null;
  const ok=oldChoose.call(this,index);
  if(ok&&J.inOldEra(this)){
   if(!ensure(this).career&&oldOption==='teach')adopt(this,'teacher');
   else discover(this);
   promote(this,ensure(this));
  }
  return ok;
 };
 L.prototype.reflect=function(text){const ok=oldReflect.call(this,text);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const o=oldSnapshot.call(this);if(J.isJoseon(this))o.joseon6=JSON.parse(JSON.stringify(ensure(this)));return o;};
 L.restore=function(data){const life=oldRestore.call(this,data);if(life&&J.isJoseon(life))hydrate(life,data);return life;};
 Object.defineProperty(L.prototype,'__joseon6',{value:true});
 return true;
}
install();
return Object.freeze({install,ensure,summary,adopt,discover,yearEnd,careerEvent,prompt,choose,CARES:CAREERS,EPISODES,STANCES,available});
});
