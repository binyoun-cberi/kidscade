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
  OPT('동료와 짐 나르는 순서를 나눠 지친 사람을 쉬게 한다','같은 포로가 계속 무거운 짐을 지고 있다. 교대할 시간을 서로 정하지만 일을 거부할 자유는 없다.','짐을 나르는 차례를 서로 바꿨다. 누가 다쳤을 때 대신 맡아 줄 사람이 생겼다.',{contacts:2,skill:1,bonds:2},'support'),
  OPT('일터의 도구를 살피고 손에 맞게 쓰는 법을 배운다','낯선 기술을 익히면 그날 일을 해낼 수 있다. 익혔다고 귀향이 허락되지는 않는다.','도구의 이름과 손질법을 익혔다. 이후 같은 일을 맡았을 때 무엇부터 해야 할지 알았다.',{skill:3,knowledge:2},'skill'),
  OPT('몸이 떨리는 날에는 동료에게 잠시 교대를 부탁한다','더 일하다가는 쓰러질 것 같아 두렵다. 쉬는 동안 동료에게 일이 더 갈 수 있다.','교대할 틈을 부탁하고 물을 마셨다. 쉬는 동안 다른 사람이 짐을 옮겨야 했다.',{health:2,resilience:2},'rest')]),
 EVENT('captivityLetters','멀리 떨어진 가족의 이름','고향의 소식을 듣기 어렵다. 포로로 끌려온 다른 사람들도 가족의 이름을 기억하고 있다.',[
  OPT('고향 지명이 같은 포로에게 마을과 가족 이름을 묻는다','서로 아는 사람이 있는지 확인하려고 고을·성씨·집 위치를 비교한다. 가족의 생사는 확정할 수 없다.','같은 고을 이름을 아는 사람과 이야기를 나눴다. 들은 이름을 나중에 다시 물어볼 수 있게 됐다.',{contacts:3,bonds:2},'support'),
  OPT('부모와 식구의 이름·살던 고을을 종이에 적어 숨긴다','먼 훗날 귀환 교섭에서 누가 누구인지 확인할 실마리를 남기려는 것이다.','잊기 쉬운 지명과 사람 이름을 적었다. 종이가 실제로 가족에게 닿을지는 알 수 없었다.',{knowledge:3,resilience:2},'remember'),
  OPT('조선으로 향한다는 인편에게 고향 주소를 건넨다','상인이나 사절이 돌아가는 길이라면 소식을 부탁할 수 있다. 하지만 그 사람이 꼭 전해 주는 것은 아니다.','인편에게 고향 이름과 안부를 적어 건넸다. 이후 소식이 닿았는지는 확인되지 않았다.',{capital:-2,contacts:2},'message')]),
 EVENT('captivityInjury','오랫동안 일한 뒤 몸에 남은 변화','몸에 힘이 잘 들어가지 않거나 귀가 먹먹해지는 날이 있다. 일하는 방법을 바꿀 필요가 있다.',[
  OPT('나에게 맞는 도구와 자세를 찾는다','힘든 일을 덜어 내며 새로운 방법을 배운다','고쳐 쓰는 도구 덕에 하던 일을 계속할 수 있었다.',{skill:2,mobility:1,access:3},'adapt'),
  OPT('함께 일하는 사람에게 도움을 구한다','일을 나눌 방법을 찾는다','일손을 나누어 주던 동료와 오래 친하게 지냈다.',{contacts:3,bonds:2,access:2},'support'),
  OPT('몸을 쉬게 하고 할 수 있는 일부터 한다','서두르지 않고 자신의 속도로 살아간다','작은 일부터 다시 해 나갈 수 있었다.',{health:3,resilience:2},'rest')]),
 EVENT('captivityNews','고향으로 돌아갈 길을 묻다','오가는 상인과 사신에 관한 이야기가 들린다. 그러나 귀향은 자신의 뜻만으로 정할 수 없다.',[
  OPT('사절을 보았다는 사람에게 출발지와 날짜를 묻는다','막연히 곧 돌아갈 거라는 말보다, 어디서 교섭이 열리는지 확인할 단서가 필요하다.','언제 어디서 사절을 보았는지 적었다. 교섭이 곧 자기 귀환으로 이어지는 것은 아니었다.',{contacts:2,hope:3,knowledge:2},'news'),
  OPT('고향이 같은 포로들의 이름을 묶어 인편에 맡긴다','혼자만이 아니라 누가 어디서 끌려왔는지 알려야 가족들이 소식을 찾을 단서가 된다.','같은 고을에서 끌려온 사람들의 이름을 서로 확인했다. 일부는 소식 전할 인편을 기다렸다.',{contacts:3,bonds:3},'support'),
  OPT('교섭 소식을 기다리는 동안 익힌 일로 식량을 마련한다','귀환 여부를 스스로 정할 수 없는 동안 그날의 먹을 것을 구해야 한다.','하던 일을 이어 가며 필요한 식량을 마련했다. 고향으로 돌아갈 길은 아직 열리지 않았다.',{skill:2,hope:1},'skill')]),
 EVENT('japanWorkshop','바다 건너 일터의 손기술','이곳에서는 낯선 말과 도구를 배우며 일을 해야 한다. 기술을 쓴다고 귀향이 허락되는 것은 아니다.',[
  OPT('도구를 손질하고 작업 순서를 스승에게 다시 묻는다','낯선 일터에서 도구를 잘못 다루면 다칠 수 있다. 맡은 기술과 자신의 몸 상태에 맞게 배운다.','사용한 도구를 손질하고 순서를 익혔다. 손에 익을 때까지 여러 번 연습했다.',{skill:3,workplace:3,knowledge:2},'skill'),
  OPT('함께 일하는 사람에게 도구 이름을 그곳 말로 묻는다','물건을 주고받을 때 말이 통하지 않아 일을 되풀이하게 된다. 물건을 가리키며 말을 하나씩 익힌다.','서로 물건을 가리키며 이름을 알려 주었다. 짧은 부탁 정도는 주고받을 수 있게 됐다.',{localTies:3,language:2,bonds:2},'support'),
  OPT('손을 다친 동료와 무거운 일의 차례를 바꾼다','동료가 쉬는 동안 자신이 일부 일을 더 해야 한다. 쉬는 시간을 바꿔가며 버틴다.','아픈 동료 대신 짐을 한 차례 더 들었다. 나중에는 동료도 내 일을 나누어 주었다.',{contacts:3,health:1},'rest')]),
 EVENT('japanFamilyTies','낯선 곳에서 남은 인연','함께 일하고 살던 사람들과 관계가 깊어지기도 한다. 고향에 남은 가족의 소식은 여전히 멀다.',[
  OPT('같이 일하는 사람과 남은 식량을 나누고 다음 끼니를 상의한다','타향에서 먹을 것을 구하기 어렵다. 가진 양을 확인하고 누구에게 얼마를 나눌지 정한다.','남은 밥을 나눠 먹은 뒤 다음 날 구할 양을 함께 계산했다. 일을 같이할 사람과 약속이 생겼다.',{localTies:4,bonds:3},'support'),
  OPT('고향 가족의 성씨와 마을을 적고 가까운 사람에게 전한다','기억이 흐려지지 않도록 이름과 사는 곳을 알려 둔다. 그가 귀향을 도와줄지는 알 수 없다.','성씨와 마을 이름을 적었다. 같은 고향을 알던 사람이 있는지 다시 물을 자료가 됐다.',{homeNews:4,knowledge:2},'remember'),
  OPT('사절이 오면 전할 귀향 희망자의 이름을 묶는다','누가 귀향을 원하고 누가 현지에 남을지 본인에게 직접 묻는다. 동의 없이 명단에 올리지 않는다.','돌아가고 싶다는 사람들의 고향과 이름을 묶었다. 교섭이 성사될지는 알 수 없었다.',{contacts:3,homeNews:2},'news')]),
 EVENT('manchuLanguage','요동의 낯선 말과 살림','여진의 여러 집단과 후금·청의 사람들이 모두 같은 삶을 사는 것은 아니다. 이곳에서 만난 이들의 말을 익혀야 한다.',[
  OPT('일터에서 자주 쓰는 물건 이름을 현지 사람에게 묻는다','말이 통하지 않아 잘못된 물건을 옮기는 일이 생긴다. 인사와 물건 이름부터 익힌다.','도구 이름과 짧은 인사를 배웠다. 다음에 물건을 부탁받았을 때 조금 더 알아들을 수 있었다.',{language:4,localTies:2,knowledge:2},'skill'),
  OPT('같이 끌려온 사람과 짐 옮기는 시간을 나눈다','몸이 상한 동료에게 일이 몰린다. 서로 할 수 있는 일을 나누어 하루를 버틴다.','누가 짐을 들고 누가 정리할지 나누었다. 동료의 사정을 더 알게 됐다.',{contacts:3,bonds:3},'support'),
  OPT('집안 성씨와 고향 고을을 적어 인편에 맡길 준비를 한다','고향에 남은 식구가 찾을 수 있도록 자신이 누구인지 확인할 내용을 남긴다.','성씨·고을·가족 이름을 적어 두었다. 적었다고 편지가 바로 건너가는 것은 아니었다.',{homeNews:3,knowledge:2},'remember')]),
 EVENT('manchuRansomNames','속환을 기다리는 사람들','돌아갈 사람들의 이름이 오르내린다. 몸값을 마련할 여건과 사절을 통한 교섭은 집집마다 다르다.',[
  OPT('속환 명단에 적힐 이름과 고향을 서로 확인한다','사절이 가족을 찾을 수 있게 같은 고을에서 끌려온 사람의 말을 대조한다.','고향과 이름을 적은 명단을 서로 읽어 봤다. 속환 대상이 된다는 보장은 없었다.',{homeNews:4,contacts:3},'petition'),
  OPT('인편에게 속환 비용과 연락 가능한 곳을 물어본다','가족이 돈을 마련할 수 있는지 확인하려면 대략의 비용과 전할 길을 알아야 한다.','돈이 얼마나 들 수 있는지와 소식 보낼 길을 들었다. 비용을 마련할 수 있을지는 알 수 없었다.',{contacts:2,knowledge:2},'ransom'),
  OPT('돌아갈 길이 없는 동료에게 남은 식량을 나눈다','속환되지 못한 사람이 당장 굶지 않도록 나눈다. 자신이 먹을 양도 줄어든다.','남은 먹을 것을 나눴다. 동료는 그날의 끼니를 마련했지만 포로의 처지는 바뀌지 않았다.',{localTies:3,bonds:3},'community')]),
 EVENT('ransomOpportunity','귀향을 알아볼 기회','고향으로 돌아갈 사람을 찾는다는 말이 들린다. 일본으로 끌려간 사람은 쇄환 교섭, 후금·청으로 끌려간 사람은 속환과 가족의 비용이 걸려 있다.',[
  OPT('사절에게 내 고향·이름이 명단에 있는지 확인한다','사절이 돌아갈 사람을 찾고 있다. 이름을 알리는 일과 실제로 귀환이 허락되는 일은 다르다.','사절에게 이름과 고향을 전했다. 귀환 허락을 기다려야 했다.',{hope:4,contacts:2},'petition'),
  OPT('가족에게 속환 비용과 연락처를 적어 인편으로 보낸다','돈을 마련해야 하는 경우가 있다. 편지가 닿지 않거나 비용이 부족할 수도 있다.','금액과 연락할 곳을 적어 보냈다. 집안이 그 돈을 마련할 수 있을지는 알 수 없었다.',{capital:-6,hope:4},'ransom'),
  OPT('곁에 남는 포로의 안부를 인편에 함께 맡긴다','본인이 귀향하지 못하더라도 다른 사람의 고향에 이름을 전할 수 있다.','동료의 고을과 이름도 인편에 적어 보냈다. 그가 귀환할지 알 수 없는 일은 그대로 남았다.',{contacts:3,bonds:3,hope:1},'community')]),
 EVENT('homecoming','돌아온 고향의 첫 저녁','오랫동안 떠나 있던 집으로 돌아왔다. 예전 모습과 다른 곳이 많고, 식구들도 저마다 다른 세월을 살았다.',[
  OPT('돌아온 날 가족에게 지금 당장 필요한 것을 묻는다','오래 헤어졌던 식구가 어디서 지냈는지부터 알아야 한다. 지난 일을 모두 말하도록 재촉하지 않는다.','서로 지낸 곳과 당장 필요한 것을 확인했다. 오랜 시간을 한 번에 메울 수는 없었다.',{bonds:5,trust:2,resilience:2},'talk'),
  OPT('빈 방을 치우고 잠자리를 마련한 뒤 양식을 센다','돌아왔어도 잘 곳과 먹을 것이 필요하다. 마련한 비용만큼 집안의 곡식이 줄어든다.','방을 정리하고 잠자리를 마련했다. 앞으로 필요한 물건을 하나씩 적었다.',{capital:-3,repair:2,access:1},'work'),
  OPT('예전에 알던 이웃에게 집안의 달라진 사정을 묻는다','누가 이사했는지, 밭과 집이 어떻게 되었는지 들어야 다시 살 길을 찾을 수 있다.','이웃에게 달라진 마을과 사람들 이야기를 들었다. 옛 친분이 바로 돌아오지는 않았다.',{trust:5,contacts:1},'neighbor')]),
 EVENT('homeSenses','다시 들려오는 발소리','평범한 소리에도 전란의 일이 떠오르곤 한다. 어떤 날은 잠을 설쳤고, 어떤 날은 새벽까지 평온했다.',[
  OPT('편안한 잠자리를 바꾸어 본다','조용한 밤을 위한 방법을 찾아본다','잠을 설친 밤에도 다시 쉬는 방법을 찾아 갔다.',{sleep:3,resilience:3},'rest'),
  OPT('믿을 만한 사람에게 어려움을 전한다','말을 들어 줄 사람을 찾는다','마음을 나눌 수 있는 사람과 오래 이야기를 했다.',{sleep:1,resilience:4,bonds:3},'talk'),
  OPT('익숙한 손일과 일상을 조금씩 이어 간다','좋은 날과 힘든 날이 섞일 수 있다','힘든 기억이 있어도 삶은 여러 모습으로 계속되었다.',{skill:2,resilience:2},'work')]),
 EVENT('homeStigma','포로로 다녀온 사람을 향한 말','돌아온 사람에게 부당한 말을 하는 이들이 있다. 포로가 된 것은 그 사람의 잘못이 아니다.',[
  OPT('포로가 된 경위를 험담하는 사람에게 사실을 바로잡는다','자신이 원해서 잡혀간 것처럼 말하는 사람에게 전쟁 중 끌려간 일을 분명히 설명한다.','잘못된 소문을 들은 사람에게 경위를 전했다. 모든 이가 곧장 말을 거둔 것은 아니었다.',{trust:3,bonds:4,resilience:2},'solidarity'),
  OPT('집안의 사생활을 캐묻는 사람에게 그만 물어 달라 한다','과거의 상처를 모두 설명할 의무는 없다. 관계가 서먹해질 수 있어도 거리를 둔다.','더는 이야기하지 않겠다고 말했다. 불편한 질문을 하는 사람과는 거리를 두었다.',{resilience:3,trust:-1},'boundary'),
  OPT('함께 일할 수 있는 이웃에게 품일의 날짜를 묻는다','헛소문과 상관없이 당장 살아갈 일거리가 필요하다. 내게 맞는 일부터 알아본다.','이웃에게 품일을 맡을 수 있는 날을 물었다. 구한 일로 집안을 다시 꾸릴 실마리가 생겼다.',{skill:2,capital:2,access:2},'work')]),
 EVENT('homeWork','예전과 다른 방법으로 일하다','예전처럼 오래 걷거나 힘을 쓰기 어려운 날이 있다. 기술과 이웃의 도움을 이용해 다른 일하는 방법을 찾는다.',[
  OPT('손에 맞는 도구를 새로 만든다','도구를 고쳐 쓰는 데 비용이 든다','새 도구 덕분에 원하는 일을 오래 이어 갈 수 있었다.',{capital:-3,access:5,skill:2},'adapt'),
  OPT('기술을 이웃과 자녀에게 가르친다','일을 나누어 함께 완성한다','함께 배운 사람들이 새로운 일거리를 가져왔다.',{skill:4,bonds:3,contacts:2},'teach'),
  OPT('몸에 무리가 적은 일로 바꾼다','새로운 일을 천천히 익힌다','자신에게 맞는 방법으로 살림을 이어 나갔다.',{knowledge:2,access:4,resilience:2},'adapt')]),
 EVENT('homeNewFamily','다시 가족이 되어 가는 시간','헤어져 지낸 동안 모두가 달라졌다. 배우자와 아이들에게도 긴 세월이 흘렀다.',[
  OPT('오래 떨어져 지낸 식구와 새로 맡을 집안일을 정한다','그동안 누가 무엇을 해 왔는지 듣고, 돌아왔다고 곧바로 옛 역할을 되찾으려 하지 않는다.','서로 하던 일을 이야기하고 맡을 집안일을 다시 정했다. 익숙해지는 데에는 시간이 걸렸다.',{bonds:5,resilience:2},'talk'),
  OPT('소식이 끊긴 친족의 마지막 거처를 이웃에게 묻는다','돌아와도 모든 식구를 바로 만날 수 없다. 인편과 이웃에게 아는 주소부터 확인한다.','먼 곳에 있다는 친족의 거처를 수소문했다. 편지를 보낼 단서만 조금 남았다.',{contacts:2,bonds:3},'message'),
  OPT('식구가 먹을 곡식을 덜고 저녁상을 함께 차린다','지난 일을 모두 이야기하기 어려운 날에도 먹을 것은 필요하다. 밥 짓는 일을 나눠 한다.','식구와 함께 밥을 짓고 먹었다. 말이 적은 날에도 함께 지낼 시간이 쌓였다.',{grain:-2,bonds:4},'care')]),
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
function capture(l,realm=eraFor(l),fromWarChoice=false){
 if(!realm||!(fromWarChoice?isOld(l):canCapture(l))||ensure(l).captivity)return false;
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
 if((s.overseas?.localTies||0)>0||(s.overseas?.homeNews||0)>0)
  l.logEvent('타향에서 알게 된 사람과 멀리 떨어져 기다려 온 가족의 이름도 함께 기억했다.','joseon14-return');
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
  // Previous relationships make communication possible, not freedom certain.
  if((s.contacts||0)+(s.overseas?.homeNews||0)>=6)
   description+=' 오가던 사람에게 맡겨 둔 이름과 고향 주소를 다시 확인할 수 있다.';
 }
 if(e.id==='japanWorkshop'){
  const trade=String(s.captivity?.work||'');
  description=/도공|도자|가마/.test(trade)?
   '가마와 흙을 다루던 솜씨를 알아본 사람이 일터로 데려갔다. 기술을 쓰게 되었다고 돌아갈 자유가 생긴 것은 아니다.':
   '낯선 일터에서 일손을 보탠다. 언어와 기술이 다른 사람에게 배워 가며 하루를 보낸다.';
 }
 if(e.id==='homeWork'&&s.skills>=5)
  description+=' 타향에서 어렵게 익힌 손기술이 있다. 그 솜씨를 고향에서 어떻게 이어 갈지 생각한다.';
 if(e.id==='homeStigma'){
  description=s.captivity?.realm==='qing'&&l.gender==='여자'?
    '청에서 돌아왔다는 이유로 정절을 의심하는 말이 등 뒤에서 들려온다. 집안사람들은 그 말을 들으면서도 어떻게 맞서야 할지 몰라 서로의 얼굴을 살핀다.':
    '돌아온 이를 반기는 이웃도 있지만 낯을 돌리는 사람도 있다. 오랜만에 고향집 문턱을 넘으며 사람들의 눈길이 마음에 걸린다.';
 }
 return {title:e.title,description,options:e.options.map(o=>({label:o.label,note:o.note,action:o.label}))};
}
function repatriationChance(c,s,index,year){
 const base=c.realm==='japan'?
  (MAJOR_JAPAN_ENVOYS.has(year)?[.34,.24,.07][index]:[.12,.08,.03][index]):
  [.38,.29,.06][index];
 // Helping another captive must NEVER trigger one's own repatriation.
 if(index===2)return 0;
 // Contacts improve access to information, never make return certain.
 const evidence=(s.contacts||0)+(s.overseas?.homeNews||0);
 return Math.min(.65,base+(index===2?0:Math.min(.09,evidence*.003)));
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
  const c=s.captivity;
  if(index===2){
   // This is someone else's name on the list, not the player's own request.
   l.logEvent('함께 끌려온 사람의 고향과 이름을 인편에 맡겼다. 본인의 귀향은 아직 결정되지 않았다.','joseon14-captivity');
  }else{
   c.attempts++;
   // Opportunity, never guaranteed. Route depends on historical captor/context.
   const chance=repatriationChance(c,s,index,l.year);
   if(hash(l.seed,l.year*83+index*41+c.attempts*3)<chance)
    reunion(l,s,c.realm==='japan'?'쇄환':'속환');
   else l.logEvent('귀향할 길을 알아보았지만 이번에는 고향으로 돌아갈 수 없었다.','joseon14-captivity');
  }
 }
 // Stigma belongs to the society's response, not the survivor's morality.
 // Protecting one's privacy or seeking work is not a reason to blame a returnee.
 // Stigma reflects other people's prejudice, not a penalty for a survivor's choice.
 if(e.id==='homeWork'&&index===1&&s.skills>=5){
  const hasChild=V4.summary(l)?.children>0;
  if(hasChild)s.heritage.skills=clip(s.heritage.skills+2,0,40);
  l.logEvent(hasChild?
   '멀리서 익힌 솜씨를 자녀와 이웃에게 보여 주며 일거리를 조금씩 다시 만들었다.':
   '멀리서 익힌 솜씨를 배우려는 이웃에게 보여 주며 일거리를 조금씩 다시 만들었다.','joseon14-family');
 }
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
  l.joseon8.generation=clip((Number(l.joseon8.generation)||1)+1,1,18);
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
 if(s.active)l.pending='joseon14:'+s.active.id;
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
 Object.defineProperty(L.prototype,'__joseon14CaptureFromWar',{value:function(){
  const realm=[1592,1597].includes(this.year)?'japan':this.year===1627?'laterJin':[1636,1637].includes(this.year)?'qing':null;
  return realm?capture(this,realm,true):false;
 }});
 Object.defineProperty(L.prototype,'__joseon14',{value:true});return true;
}
install();
return Object.freeze({EPISODES,SOURCES,ensure,eraFor,canCapture,capture,suspendDomestic,reunion,opportunity,repatriationChance,yearly,choose,prompt,summary,heirs,continueAsHeir,hydrate,install});
});
