/* Joseon Annals: verified, year-specific primary-source accounts.
 * FACT = court record exactly linked to sillok.history.go.kr/id/{record}.
 * FICTION = player's household response and its fictional resource deltas.
 * An article mentioning a proposal does not mean it was implemented everywhere.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon5);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseonAnnals=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V5){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const opt=(label,note,result,effects={})=>({label,note,result,effects});
const article=(id,year,day,sourceTitle,title,fact,scene,regions,options)=>Object.freeze({
 id,year,day,sourceTitle,title,fact,scene,regions,options,
 url:'https://sillok.history.go.kr/id/'+id,
 authenticity:'primary-record',scenario:'fictional-household'
});
const ARTICLES=Object.freeze([
 article('wda_11809006_005',1436,'1436-09-06','세종실록 74권','경상도에 환자곡을 나누라는 명',
  '경상도에서 사사로이 이자를 받으며 빌려주던 곡식을 환자곡으로 나눠 굶주린 이를 구제하도록 하였다.',
  '경상도의 여러 고을에 굶주린 사람들에게 곡식을 나누라는 명이 전해졌다. 우리 집 곳간도 넉넉하지 않다.',
  ['경상도'],[
   opt('관아에서 곡식 나누는 일을 알아본다','집안의 끼니를 지킬 길을 찾는다','관아에 곡식 사정을 물으러 갔던 일을 기억했다.',{knowledge:2,grain:4}),
   opt('이웃의 끼니를 함께 살핀다','조금씩 나누어 돕는다','그해 어려움을 함께 견딘 이웃이 오랫동안 인사를 건넸다.',{bonds:4,grain:-3}),
   opt('집안의 남은 곡식을 아낀다','다음 철까지 곳간을 살핀다','곡식 한 됫박도 아껴 먹으며 계절을 넘겼다.',{health:-1,grain:2})
  ]),
 article('wda_12108026_002',1439,'1439-08-26','세종실록 86권','강무장의 범 포획과 백성의 부담',
  '강무장의 호랑이와 표범 포획에 백성과 말이 시달린 폐단을 논하였다. 병조는 매년 포획이 유익하지 않다고 아뢰었고 그 의견이 받아들여졌다.',
  '강무장에 범을 잡으러 불려가던 백성들의 고생이 조정에서 논의되었다는 말이 들려왔다.',
  null,[
   opt('산길을 아는 이에게 지난 일을 묻는다','백성이 겪은 고생을 듣는다','그때 들은 강무장과 사냥 이야기로 고을 사람들과 말을 나눴다.',{knowledge:3}),
   opt('동원되던 이웃의 일손을 돕는다','집안에서 비었던 일을 나누어 한다','먼 길을 다녀오던 이웃이 일손을 고맙게 여겼다.',{bonds:4,health:-1}),
   opt('겨울 먹을거리와 말 여물을 챙긴다','먼길의 부담을 돌아본다','혹독한 겨울을 대비해 볏짚과 곡식을 모았다.',{grain:-2,health:2})
  ]),
 article('kda_12812026_003',1446,'1446-12-26','세종실록 114권','이전 선발에 훈민정음을 시험하다',
  '이조가 이과와 이전을 선발할 때 훈민정음의 글자 결합을 익힌 사람도 뽑도록 명하였다.',
  '관아에서 일하는 사람을 뽑을 때 새로 만든 글자를 아는지도 본다는 이야기가 전해졌다.',
  null,[
   opt('관아의 글 배우는 이에게 묻는다','어떻게 글자를 모아 쓰는지 배운다','글자를 익히던 날을 떠올리며 간단한 말을 적어 보았다.',{knowledge:4}),
   opt('식구에게 들은 글자를 알려 준다','함께 익힐 수 있는 만큼 배운다','그날 배운 글자를 가족과 나누었다.',{knowledge:2,bonds:3}),
   opt('하던 일을 이어 간다','새 글자를 익힐 여유가 많지 않다','글에 관한 소식은 들었지만 당장 손에 익은 일을 해야 했다.',{wealth:1})
  ]),
 article('wra_11110015_001',1670,'1670-10-15','현종실록 18권','대기근과 신역 부담 감면',
  '전국적인 흉년 속에서 피해 정도별로 신역을 감하도록 명했다. 노비 신공도 피해 정도에 따라 감면 대상으로 논의되었다.',
  '곡식이 귀해지고 굶주린 사람이 늘었다. 재해가 심한 고을의 신역을 줄인다는 말이 전해졌다.',
  null,[
   opt('관아에 우리 집의 피해를 알린다','감면이 가능한지 살핀다','관아에서 고을의 피해를 따지던 날을 기억했다.',{knowledge:3,grain:2}),
   opt('아픈 이웃과 곡식을 나눈다','곳간이 더 빠듯해질 수 있다','흉년 때 나누었던 양식을 이웃이 오래 기억했다.',{bonds:5,grain:-5,health:-1}),
   opt('식구를 위해 곡식을 아낀다','당장의 끼니부터 지킨다','식구들은 곡식을 아껴 겨울을 견뎠다.',{health:-2,grain:3})
  ]),
 article('wrb_11211030_002',1671,'1671-11-30','현종개수실록 25권','구휼미 배분의 부정과 늑장',
  '송시열은 구휼 과정에서 일부 담당자가 주린 사람 수를 부풀려 곡식을 빼돌리거나 결정이 늦어졌다고 비판하였다.',
  '굶주린 이들에게 나눌 죽이 지나치게 묽다는 말이 돌았다. 구휼에 쓰여야 할 곡식이 제대로 전해지는지 걱정스럽다.',
  null,[
   opt('굶주린 이웃의 사정을 적어 알린다','곡식을 받을 사람의 형편을 밝힌다','구휼이 필요한 사람의 이름을 전하던 날을 기억했다.',{knowledge:3,bonds:3}),
   opt('이웃과 죽을 끓여 나눈다','집안에 남은 곡식도 내어놓는다','다 함께 한 숟가락씩 나눠 먹던 밤이 남았다.',{bonds:4,grain:-4,health:-1}),
   opt('관아의 배분을 기다린다','받을 수 있는지 확신하기 어렵다','곳간을 열어 볼 때마다 마음이 무거웠다.',{health:-2,grain:1})
  ]),
 article('kua_12605019_002',1750,'1750-05-19','영조실록 71권','군역 부담을 고칠 길을 논하다',
  '영조와 비국 당상들이 균역의 변통을 논하며 군포·호포·어염세 등 여러 방안을 검토하였다.',
  '군역에 쓰는 베의 부담을 어떻게 바꿀지 조정에서 논의한다는 이야기가 고을에 전해졌다.',
  null,[
   opt('우리 집의 군포 부담을 헤아린다','가족과 베를 마련할 일을 논한다','군포 때문에 집안의 살림을 따져 보았다.',{knowledge:2,capital:-2}),
   opt('이웃과 필요한 베를 나눠 마련한다','혼자 감당하지 못할 부담을 나눈다','베를 함께 마련했던 이웃과 품을 갚았다.',{bonds:3,capital:-2}),
   opt('관아에서 달라질 법을 기다린다','논의가 바로 시행되는 것은 아니다','고을에 새 방이 붙을 때마다 군역 이야기를 확인했다.',{knowledge:3})
  ]),
 article('wva_10207020_003',1778,'1778-07-20','정조실록 6권','수군 배치와 해안 방비에 대한 상소',
  '수군과 군포 부담자의 지역 배치가 실제 배 타는 능력과 맞지 않는 문제, 항만의 얕은 수심과 전선 운용의 어려움을 지적한 상소가 있었다.',
  '배를 몰던 사람과 군포를 내던 사람의 처지가 맞지 않는다는 논의가 조정에 올라갔다. 포구에는 여전히 일손이 필요하다.',
  ['경상도','전라도','충청도'],[
   opt('배를 다루는 이들의 사정을 듣는다','바닷길과 물때를 아는 사람에게 배운다','포구 사람들이 배와 군역 이야기를 함께 나누었다.',{knowledge:3,bonds:2}),
   opt('전선과 항만을 손보는 일을 돕는다','손에 익은 기술을 보탠다','포구에서 손봤던 장비가 오래 기억에 남았다.',{health:-2,capital:2}),
   opt('식구에게 군역의 부담을 설명한다','오랜 수고와 불편을 나눈다','그해 군역에 관한 이야기가 집안 밥상에 오르내렸다.',{bonds:3,knowledge:1})
  ]),
 article("kda_10508005_002",1423,"1423-08-05","세종실록 21권","노비 문권을 둘러싼 송사",
  "형조가 노비 소송의 판결과 위조 문권에 관한 규칙을 아뢰자 임금이 따랐다.",
  "관아에서 노비 문권을 놓고 다투는 소리가 들린다. 한 장의 문서로 누군가의 삶이 바뀔 수 있다.",
  null,[
   opt("낡은 문서를 찾아본다","집안 장부를 살핀다","가족들이 문서의 내력을 다시 살폈다.",{"knowledge":3}),
   opt("억울한 이의 말을 듣는다","그 사람의 처지를 헤아린다","다른 사람의 삶에 관해 오래 생각했다.",{"bonds":4}),
   opt("관아에 판결 내용을 묻는다","법이 바뀌는지 살핀다","관아에서 문서가 얼마나 중요한지 알게 되었다.",{"knowledge":4})
  ]),
 article("kda_11905020_004",1437,"1437-05-20","세종실록 77권","북방으로 이주한 집안의 겨울",
  "두만강 인근 이주민이 가뭄·폭설·가축 폐사·역병·침입을 겪었다는 상황을 돌아보며 변경의 방비를 논하였다.",
  "북쪽 고을로 이주한 집들이 추위와 병으로 고생하고 있다. 고향으로 돌아가려는 사람도 있다.",
  ["함경도"],[
   opt("땔감과 여물을 챙긴다","긴 겨울을 준비한다","낯선 고을에서 겨울을 나기 위해 품을 모았다.",{"grain":-2,"health":1}),
   opt("아픈 이웃을 살핀다","서로 일손을 돕는다","고생을 함께 한 이웃과 가까워졌다.",{"bonds":4,"health":-2}),
   opt("고향으로 갈 길을 알아본다","가족과 떠날지 의논한다","두고 온 고향 이야기가 오래 남았다.",{"knowledge":3})
  ]),
 article("kda_12710025_001",1445,"1445-10-25","세종실록 110권","풍랑에 잃은 세곡과 사람들",
  "조전선 50여 척이 침몰하고 곡식 2만 5천 5백여 석을 잃었으며 25명이 사망했다는 보고가 올라왔다.",
  "세곡을 실은 배들이 풍랑에 돌아오지 못했다. 포구에는 가족을 기다리는 사람이 많다.",
  ["전라도","충청도","경기도"],[
   opt("돌아오지 못한 가족의 안부를 묻는다","포구의 소식을 기다린다","그해 바다에서 돌아오지 못한 이의 이름이 남았다.",{"bonds":4}),
   opt("흩어진 짐을 함께 정리한다","곡식 자루와 물건을 모은다","함께 짐을 모으던 사람과 다시 만났다.",{"capital":2,"health":-2}),
   opt("다음 출항의 바람을 살핀다","안전한 뱃길을 찾는다","그 이후 포구의 바람을 유심히 살폈다.",{"knowledge":3})
  ]),
 article("kda_13004006_001",1448,"1448-04-06","세종실록 120권","파선된 배에서 돌아온 사람들",
  "강풍에 파손된 조운선의 사람들에게 옷과 식량을 주고 수리할 배는 고치도록 명하였다.",
  "파선된 배의 사람들이 옷과 양식을 잃었다. 살려서 돌려보낼 길을 찾는다.",
  ["경기도","충청도","전라도"],[
   opt("마른 옷과 죽을 건넨다","살아 돌아온 사람을 돌본다","바다에서 살아 돌아온 이가 다시 길을 떠났다.",{"grain":-3,"bonds":5}),
   opt("배를 수리하는 일에 참여한다","해진 밧줄과 돛을 고친다","함께 고친 배가 다시 포구에 왔다.",{"knowledge":3,"health":-2}),
   opt("해변을 찾아 사람을 살핀다","살아 있는 이를 수소문한다","해안을 살피던 날의 고생을 기억했다.",{"bonds":4,"health":-2})
  ]),
 article("kga_10109010_002",1455,"1455-09-10","세조실록 2권","안흥량에서 사라진 조운선",
  "전라도 조운선 54척이 안흥량에서 침몰하거나 행방불명되었다는 보고에 수색과 구조를 명하였다.",
  "안흥량에서 배들이 사라졌다. 살아 돌아온 뱃사람에게 밥을 주라는 소식이 전해진다.",
  ["충청도","전라도","경기도"],[
   opt("마른 옷과 죽을 건넨다","살아 돌아온 사람을 돌본다","바다에서 살아 돌아온 이가 다시 길을 떠났다.",{"grain":-3,"bonds":5}),
   opt("배를 수리하는 일에 참여한다","해진 밧줄과 돛을 고친다","함께 고친 배가 다시 포구에 왔다.",{"knowledge":3,"health":-2}),
   opt("해변을 찾아 사람을 살핀다","살아 있는 이를 수소문한다","해안을 살피던 날의 고생을 기억했다.",{"bonds":4,"health":-2})
  ]),
 article("kja_10303017_002",1497,"1497-03-17","연산군일기 22권","삼수와 갑산에 번진 역병",
  "함경도 삼수·갑산 등에서 350여 명이 역병으로 사망했다는 보고를 받고 의원 두 명과 약을 보내도록 하였다.",
  "삼수와 갑산에 병이 돌고 있다. 아픈 친척에게 의원이 오기를 기다린다.",
  ["함경도"],[
   opt("아픈 친척의 소식을 알아본다","먼 고을까지 안부를 묻는다","친척의 안부를 듣기까지 여러 날이 걸렸다.",{"bonds":3,"capital":-2}),
   opt("이웃에게 먹을거리를 건넨다","몸이 약한 사람을 돕는다","어려울 때 돌본 이웃과 다시 마주쳤다.",{"grain":-3,"bonds":5,"health":-1}),
   opt("의원이 있는 곳을 알아본다","치료받을 길을 찾는다","고을에서 의원의 소식을 기다렸다.",{"knowledge":3,"capital":-2})
  ]),
 article("kka_11503021_001",1520,"1520-03-21","중종실록 38권","장시가 커지는 것을 두고 벌어진 논쟁",
  "조정에서 지방 장시의 확산을 두고 농사에 해롭다는 비판과 거래의 편리함을 논하였다. 장에서는 남녀가 술과 고기를 팔기도 했다.",
  "장날에 삼베와 곡식, 먹을거리를 파는 사람이 모인다. 장사를 못마땅해하는 이도 있다.",
  ["전라도","경상도","충청도"],[
   opt("삼베와 곡식을 장에 판다","값을 직접 흥정한다","그 장날에 만난 손님이 다시 찾아왔다.",{"capital":3,"knowledge":2}),
   opt("농번기에는 밭일을 먼저 한다","장에 갈 날을 다시 잡는다","바쁜 계절이 지나서야 장에 나갔다.",{"grain":2,"health":-2}),
   opt("이웃과 함께 짐을 나른다","먼 장터까지 품을 나눈다","장길을 함께 걸었던 이웃과 가까워졌다.",{"bonds":4,"health":-1})
  ]),
 article("kka_11908007_004",1524,"1524-08-07","중종실록 51권","평안도 여러 고을의 역병",
  "평안도 철산·용천·의주 등의 역병 사망자 보고 뒤 의주·용천·철산·곽산의 누적 사망자도 다시 보고하게 하였다.",
  "평안도 여러 고을에서 많은 사람이 앓고 있다. 먼 친척의 소식이 오래도록 오지 않는다.",
  ["평안도"],[
   opt("아픈 친척의 소식을 알아본다","먼 고을까지 안부를 묻는다","친척의 안부를 듣기까지 여러 날이 걸렸다.",{"bonds":3,"capital":-2}),
   opt("이웃에게 먹을거리를 건넨다","몸이 약한 사람을 돕는다","어려울 때 돌본 이웃과 다시 마주쳤다.",{"grain":-3,"bonds":5,"health":-1}),
   opt("의원이 있는 곳을 알아본다","치료받을 길을 찾는다","고을에서 의원의 소식을 기다렸다.",{"knowledge":3,"capital":-2})
  ]),
 article("kpa_12302010_002",1645,"1645-02-10","인조실록 46권","한양의 활인서와 병막",
  "동·서 활인서가 격리한 환자의 수를 보고했다. 실록은 구호가 특정 계층에 치우쳤고 사망자 보고도 부실했다고 비판하였다.",
  "한양의 병막에는 앓는 사람들이 머물고 있다. 그러나 도움을 받지 못하는 집도 많다.",
  ["한양","경기도"],[
   opt("아픈 친척의 소식을 알아본다","먼 고을까지 안부를 묻는다","친척의 안부를 듣기까지 여러 날이 걸렸다.",{"bonds":3,"capital":-2}),
   opt("이웃에게 먹을거리를 건넨다","몸이 약한 사람을 돕는다","어려울 때 돌본 이웃과 다시 마주쳤다.",{"grain":-3,"bonds":5,"health":-1}),
   opt("의원이 있는 곳을 알아본다","치료받을 길을 찾는다","고을에서 의원의 소식을 기다렸다.",{"knowledge":3,"capital":-2})
  ]),
 article("wua_10107019_001",1725,"1725-07-19","영조실록 7권","가뭄과 흉년 속 군포의 부담",
  "영조가 긴 가뭄과 역병, 부당한 군포·신역 징수를 걱정하는 교서를 내렸다. 삼남의 농사를 큰 흉작이라 하였다.",
  "물이 모자라 논바닥이 갈라졌다. 곡식뿐 아니라 군포까지 마련해야 하는 집이 많다.",
  ["충청도","전라도","경상도"],[
   opt("곳간의 곡식을 먼저 아낀다","끼니와 씨앗을 나눈다","가뭄이 길어져 곳간을 여는 날마다 걱정했다.",{"grain":2,"health":-2}),
   opt("이웃과 물꼬를 나누어 쓴다","윗논 주인과 순서를 정한다","두 집안이 함께 물길을 살폈다.",{"bonds":4,"grain":-2}),
   opt("군포의 부담을 알린다","관아에 사정을 전한다","흉년에도 군포를 걱정해야 했던 날이 남았다.",{"knowledge":3,"capital":-2})
  ]),
 article("wva_10710008_002",1783,"1783-10-08","정조실록 16권","흉년이 든 호남의 떠나는 사람들",
  "정조가 호남 백성에게 내린 윤음에서 흉년과 떠도는 백성의 고통을 언급하고 이를 방치해서는 안 된다고 하였다.",
  "호남의 농사가 어려워지자 이웃집이 다른 고을로 떠날 준비를 한다.",
  ["전라도"],[
   opt("떠나는 집의 짐을 나른다","고향을 떠나는 이웃을 돕는다","먼 고을로 떠난 이웃을 오래 기다렸다.",{"bonds":4,"health":-2}),
   opt("씨앗과 곡식을 따로 둔다","다음 농사를 준비한다","남겨 둔 씨앗으로 다시 농사를 지었다.",{"grain":2,"capital":-2}),
   opt("구휼 소식을 알아본다","관아에서 소식을 듣는다","사람들이 구휼 소식을 서로 전했다.",{"knowledge":3})
  ]),
 article("kva_11505010_002",1791,"1791-05-10","정조실록 32권","조운선 침몰과 지방관의 책임",
  "법성창 조운선이 여러 척 침몰한 일로 지방관의 책임과 파직 문제를 논의하고 처분을 내렸다.",
  "서해의 조운선이 침몰했다. 포구에서는 배에 실린 곡식과 사람들의 소식을 기다린다.",
  ["충청도","전라도"],[
   opt("돌아오지 못한 가족의 안부를 묻는다","포구의 소식을 기다린다","그해 바다에서 돌아오지 못한 이의 이름이 남았다.",{"bonds":4}),
   opt("흩어진 짐을 함께 정리한다","곡식 자루와 물건을 모은다","함께 짐을 모으던 사람과 다시 만났다.",{"capital":2,"health":-2}),
   opt("다음 출항의 바람을 살핀다","안전한 뱃길을 찾는다","그 이후 포구의 바람을 유심히 살폈다.",{"knowledge":3})
  ])
]);
const byId=new Map(ARTICLES.map(a=>[a.id,a]));
const grownArticle=new Set(['kda_10508005_002','kka_11503021_001','wua_10107019_001']);
function sceneFor(l,a){
 const origin=V5?.summary(l)?.origin||'',job=J.summary(l).occupation||'';
 const bonded=/사노비|공노비/.test(origin);
 const nearSea=/어부|수군|뱃사공|선원|조운/.test(origin+' '+job);
 if(a.id==='kda_10508005_002'&&bonded)
  return '주인집에서 오래된 노비 문권을 꺼냈다. 누구의 문서가 옳은지 관아에서 다툰다는 말이 들린다.';
 if(a.id==='kka_11503021_001'&&/장사|장인|상인|보부상/.test(origin+' '+job))
  return '장날 내놓을 물건을 챙긴다. 조정에서는 장사 때문에 농사일을 놓는 사람이 많다며 말이 오간다.';
 if((a.id==='kda_12710025_001'||a.id==='kga_10109010_002')&&nearSea)
  return '함께 바닷길에 나선 사람의 소식이 끊겼다. 바람이 거세진 뒤 포구에서는 돌아올 배만 기다린다.';
 if(a.id==='kpa_12302010_002'&&bonded)
  return '한양에 병이 돌고 있다. 병막이 있어도 모든 아픈 사람에게 도움이 닿는 것은 아니라는 말을 듣는다.';
 if(a.id==='wua_10107019_001'&&J.summary(l).economy?.leasedLand>0)
  return '남의 논을 빌려 부치는데 비가 오지 않는다. 곡식을 거둘지조차 걱정스러운 때 군포를 마련할 일도 남았다.';
 return a.scene;
}
function eligible(life,a){
 if(!J?.inOldEra(life)||!life.alive||life.year!==a.year||life.age<(grownArticle.has(a.id)?16:11))return false;
 const region=J.summary(life).region;
 return !a.regions||a.regions.includes(region);
}
function ensure(life){
 if(!J?.isJoseon(life))return null;
 return life.joseonAnnals||(life.joseonAnnals={version:1,processedYear:life.birthYear-1,
   seen:[],queue:[],active:null,decisions:[],followups:[],lastArticleId:null});
}
function promote(l,s){
 if(!s||s.active||l.pending||!l.alive||!J.inOldEra(l)||!s.queue.length)return;
 s.active=s.queue.shift();l.pending='joseonAnnals:'+s.active.id;
}
function prompt(l){
 const s=ensure(l),a=byId.get(s?.active?.articleId);
 return a?{title:a.title,description:sceneFor(l,a),options:a.options.map(o=>({label:o.label,note:o.note,action:o.label}))}:null;
}
function yearly(l,s){
 if(!s||!J.inOldEra(l)||!l.alive||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 if(l.joseon14?.captivity?.status==='held')return;
 for(const f of s.followups.filter(f=>f.year<=l.year)){
  l.logEvent(f.text,'joseonAnnals-followup');l.log.at(-1).causeId='joseonAnnals:'+f.id;
 }
 s.followups=s.followups.filter(f=>f.year>l.year);
 for(const a of ARTICLES){
  if(!eligible(l,a)||s.seen.includes(a.id))continue;
  s.seen.push(a.id);s.lastArticleId=a.id;
  s.queue.push({id:l.year+'-'+a.id,articleId:a.id,year:l.year});
  l.logEvent(sceneFor(l,a),'joseonAnnals-fact');
  l.log.at(-1).sourceUrl=a.url;
  l.log.at(-1).recordId=a.id;
 }
 promote(l,s);
}
function choose(l,index){
 const s=ensure(l),a=byId.get(s?.active?.articleId);
 if(!s?.active||!a||!l.alive||!Number.isInteger(index)||index<0||index>=a.options.length)return false;
 const o=a.options[index],eff=o.effects||{},j=J.ensure(l),store=V2.ensure(l),id=s.active.id;
 const stats={};
 for(const k of ['health','happiness','bonds','knowledge','wealth'])if(Number.isFinite(eff[k]))stats[k]=eff[k];
 l.change(stats);
 if(Number.isFinite(eff.grain))store.grain=clamp(store.grain+eff.grain,0,200);
 if(Number.isFinite(eff.capital))j.capital=clamp(j.capital+eff.capital,-120,600);
 l.logEvent(a.title+' — '+o.label,'joseonAnnals-choice');
 l.log.at(-1).causeId='joseonAnnals:'+id;
 l.log.at(-1).sourceUrl=a.url;
 s.decisions.push({id,articleId:a.id,choice:index,year:l.year});s.decisions=s.decisions.slice(-25);
 s.followups.push({id,year:l.year+2,text:o.result});
 s.followups=s.followups.slice(-30);
 s.lastArticleId=a.id;s.active=null;l.pending=null;promote(l,s);return true;
}
function sourceFor(l){
 const s=ensure(l);if(!s)return null;
 const a=byId.get(s.lastArticleId);
 return a&&l.year<=a.year+2?{year:a.year,title:a.title,sourceTitle:a.sourceTitle,url:a.url,fact:a.fact,articleId:a.id}:null;
}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseonAnnals;if(!s||!o||o.version!==1)return s;
 const safe=q=>q&&byId.has(q.articleId)&&typeof q.id==='string'&&Number.isInteger(q.year)&&q.year<=l.year&&q.year>=l.birthYear?
  {id:q.id.slice(0,75),articleId:q.articleId,year:q.year}:null;
 s.processedYear=clamp(Number(o.processedYear)||l.birthYear-1,l.birthYear-1,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(id=>byId.has(id)).slice(-ARTICLES.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.map(safe).filter(Boolean).slice(-ARTICLES.length):[];
 s.active=safe(o.active);
 if(!l.alive||!J.inOldEra(l)||data?.pending!=='joseonAnnals:'+s.active?.id)s.active=null;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(d=>d&&byId.has(d.articleId)&&typeof d.id==='string'&&Number.isInteger(d.year)&&d.year<=l.year).slice(-25)
  .map(d=>({id:d.id.slice(0,75),articleId:d.articleId,choice:clamp(Number(d.choice)||0,0,2),year:d.year})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(f=>f&&typeof f.id==='string'&&typeof f.text==='string'&&Number.isInteger(f.year)&&f.year>l.year&&f.year<=l.year+4)
  .slice(-30).map(f=>({id:f.id.slice(0,75),year:f.year,text:f.text.slice(0,240)})):[];
 s.lastArticleId=byId.has(o.lastArticleId)&&s.seen.includes(o.lastArticleId)?o.lastArticleId:null;
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||Sim.Life.prototype.__joseonAnnals)return false;
 const L=Sim.Life,prevTick=L.prototype.tick,prevChoose=L.prototype.choose,
 prevChoice=L.prototype.getChoice,prevReflect=L.prototype.reflect,prevSnap=L.prototype.snapshot,prevRestore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this))return prevTick.call(this);
  const y=this.year,ok=prevTick.call(this);
  if(ok&&this.alive&&this.year!==y)yearly(this,ensure(this));
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseonAnnals:'))return prompt(this);
  return prevChoice.call(this);
 };
 L.prototype.choose=function(i){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseonAnnals:'))return choose(this,i);
  const ok=prevChoose.call(this,i);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;
 };
 L.prototype.reflect=function(t){const ok=prevReflect.call(this,t);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const v=prevSnap.call(this);
  if(J.isJoseon(this))v.joseonAnnals=JSON.parse(JSON.stringify(ensure(this)));return v;};
 L.restore=function(d){const l=prevRestore.call(this,d);if(l&&J.isJoseon(l))hydrate(l,d);return l;};
 Object.defineProperty(L.prototype,'__joseonAnnals',{value:true});return true;
}
install();
return Object.freeze({ARTICLES,ensure,eligible,prompt,yearly,choose,sourceFor,hydrate,install});
});
