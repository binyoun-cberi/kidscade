/* Joseon late-period civil life. Historical contexts are referenced; household outcomes
 * and event frequencies are fictional. Status changes are never extended to unaffected
 * bonded populations. Preserves independent Joseon-v5 family origin and old saves.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon4,root?.OneLifeJoseon5,root?.OneLifeJoseon9);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon11=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V4,V5,V9){
'use strict';
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=(seed,n)=>{let x=(seed^Math.imul(n+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;};
const regionIncludes=(r,allowed)=>!allowed||allowed.includes(r);
const O=(label,note,follow,d={},flag=null)=>({label,note,follow,d,flag});
const E=(id,years,regions,title,scene,source,options,gate=null)=>({id,years,regions,title,scene,source,options,gate});
const SOURCES=Object.freeze({
 abolition:'https://sillok.history.go.kr/id/kwa_10101028_001',
 hgr:'https://contents.history.go.kr/front/tg/view.do?ganada=&levelId=tg_003_2960&pageUnit=10&treeId=0105',
 jinju:'https://encykorea.aks.ac.kr/Article/E0054895',
 taxes:'https://theme.archives.go.kr/next/sillok/sub3_3.do',
 byeongin:'https://contents.history.go.kr/front/kc/printViewPopup.do?levelId=kc_i302620',
 shinmi:'https://contents.history.go.kr/front/km/view.do?levelId=km_014_0070_0010_0020_0020',
 opening:'https://contents.history.go.kr/front/ta/view.do?levelId=ta_h31_0070_0010_0020',
 imo:'https://contents.history.go.kr/mobile/kc/view.do?code=kc_age_40&levelId=kc_n400200',
 donghak:'https://contents.history.go.kr/front/hm/view.do?levelId=hm_117_0040&tabId=01&treeId=020107',
 gapshin:'https://contents.history.go.kr/front/hm/print.do?levelId=hm_116_0100&tabId=03&treeId=010701&whereStr=',
 gabo:'https://contents.history.go.kr/front/hm/print.do?levelId=hm_133_0010'
});
const southern=['경상도','전라도','충청도'];
const coastal=['경기도','황해도','전라도','경상도','충청도'];
const EVENTS=[
 E('register1801',[1801,1801],null,'궁방과 관사의 노비안이 불타다',
  '내노비와 시노비의 노비안을 불태웠다는 소식이 퍼진다. 모두에게 같은 변화가 찾아온 것은 아니다.',SOURCES.abolition,[
   O('집안의 달라진 일을 확인한다','관청의 부름과 신공에 변화가 있는지 알아본다','법이 바뀐 뒤에도 오랫동안 하던 일과 집안의 어려움은 그대로 남았다.',{knowledge:3,bonds:2},'reform'),
   O('새 일거리를 구하러 장터에 간다','품삯 받을 길을 알아본다','장터에서 사람들과 일을 나누기 시작했다.',{capital:4,health:-2},'work'),
   O('가족과 앞날을 의논한다','새 삶을 바로 꾸리기는 쉽지 않다','가족끼리 서로 의지하며 살림의 길을 찾았다.',{bonds:5,capital:-2},'kin')
  ],(l,j,s)=>s.origin==='공노비'||s.origin==='사노비'||s.origin==='노비 후손 가계'),
 E('hgr1811',[1811,1811],['평안도'],'서북 고을에 난리가 나다',
  '여러 고을에 봉기가 일어났다는 소식이 전해진다. 장시로 가는 길이 어수선하고 관군도 움직인다.',SOURCES.hgr,[
   O('식구를 먼길에서 돌아오게 한다','가족부터 안전하게 돌본다','그해 식구들은 멀리 떠나지 않고 서로의 안부를 자주 물었다.',{bonds:4,capital:-3},'shelter'),
   O('곡식과 물자를 마련해 판다','장사가 되지만 위험한 길이다','그날의 거래가 살림에 보탬이 되었지만 고을의 혼란은 오래 남았다.',{capital:4,health:-3,trust:-2},'trade'),
   O('마을 사람들과 피란길을 찾는다','일단 안전한 곳을 찾는다','떠났던 길에서 다시 돌아오는 데에는 많은 시간이 들었다.',{capital:-7,bonds:2,relocate:1},'flight')
  ]),
 E('jeongju1812',[1812,1812],['평안도'],'정주성에서 끝나지 않은 일',
  '정주성의 싸움이 끝났다는 말이 들린다. 떠난 사람이 돌아올지, 누가 처벌받을지 사람들은 근심한다.',SOURCES.hgr,[
   O('돌아오지 못한 이웃의 식구를 돕는다','남겨진 사람의 끼니를 챙긴다','떠난 사람을 기다리던 집과 오랫동안 품을 나누었다.',{grain:-3,bonds:5},'help'),
   O('관아에 가족의 생사를 알아본다','연루 여부와 사정을 조심스레 묻는다','그해 관아를 드나들던 일을 오래 기억했다.',{knowledge:3,health:-1},'petition'),
   O('고을 밖 친척에게 의탁한다','바뀐 삶의 터전을 찾는다','오래도록 고향의 친척과 소식을 주고받았다.',{capital:-5,bonds:2,relocate:1},'flight')
  ]),
 E('taxRollover',[1820,1859],null,'환곡 장부에 남은 갚을 곡식',
  '관아 장부에 내야 할 곡식이 적혔다. 이미 갚았다고 여기는 집도 다시 독촉을 받는다.',SOURCES.taxes,[
   O('영수한 기록을 찾아 따진다','문서와 증인을 찾는다','관아에 냈던 문서가 집안에서 오래 이야기되었다.',{knowledge:4,trust:-2,taxDebt:-2},'document'),
   O('곡식을 꾸어 우선 갚는다','당장의 독촉을 면하려 한다','곡식 빚을 갚을 때까지 끼니를 아껴야 했다.',{grain:-5,capital:-3,taxDebt:-3},'repay'),
   O('이웃과 함께 억울함을 알린다','여럿이 관아에 이야기한다','함께 관아에 갔던 이웃과 한동안 뜻을 나누었다.',{bonds:4,trust:3,taxDebt:-1},'solidarity')
  ],(l,j,s)=>!['왕실 종친','문반 양반'].includes(s.origin)),
 E('grainBorrow',[1815,1893],null,'곳간의 곡식이 바닥나다',
  '흉년 뒤 빚을 갚고 나니 남은 곡식이 많지 않다. 아이들이 다음 끼니를 묻는다.',SOURCES.taxes,[
   O('친척에게 먹을 것을 빌린다','친척에게 빚이 남을 수도 있다','빌린 곡식을 갚기 위해 다음 수확을 기다렸다.',{grain:7,taxDebt:3,bonds:1},'borrow'),
   O('여러 집과 함께 죽을 끓인다','곡식을 조금씩 보태 모인다','어려운 날 함께 끓였던 죽 이야기가 남았다.',{grain:-2,health:2,trust:4},'share'),
   O('먼 장시에 품을 팔러 간다','그간 하던 일을 잠시 놓는다','고된 품삯으로 가족의 끼니를 이었다.',{capital:4,health:-3,relocate:0},'labor')
  ]),
 E('tenantRent',[1815,1893],null,'지주에게 낼 소작료',
  '지주가 소작료를 받아 갈 날이 다가온다. 집안에 남길 곡식까지 내놓아야 할지 모른다.',SOURCES.taxes,[
   O('소작료를 나누어 내자고 청한다','형편을 설명하고 다음 수확을 기약한다','소작료를 둘러싼 말이 한동안 이어졌다.',{trust:2,taxDebt:2,grain:-2},'negotiate'),
   O('남은 곡식으로 약속을 지킨다','식구들이 먹을 양식이 줄어든다','소작료를 낸 뒤 남은 곡식을 아껴 썼다.',{grain:-6,taxDebt:-2},'pay'),
   O('다른 논을 빌릴 길을 찾는다','주인과의 관계가 나빠질 수 있다','다른 곳에 땅을 부칠 길을 찾아다녔다.',{capital:-3,trust:-4,relocate:1},'search')
  ],(l,j,s)=>s.origin==='소작 농가'||j.land<=1),
 E('villageMutual',[1815,1893],null,'옆 마을과 이어진 물길',
  '가뭄에 윗마을 사람들이 물을 막았다. 우리 고을의 농사도 위태롭다.',SOURCES.taxes,[
   O('양쪽 마을 원로를 찾아간다','물을 나누는 날을 의논한다','두 마을은 가뭄마다 물꼬를 함께 살폈다.',{water:5,trust:5,knowledge:2},'mediate'),
   O('우리 밭으로 몰래 물을 댄다','들키면 원망을 듣는다','몰래 튼 물길 때문에 옆 마을과 얼굴을 붉혔다.',{water:8,trust:-10,grain:2},'take'),
   O('함께 도랑을 더 판다','여럿이 일손을 내야 한다','함께 판 도랑이 다음해에도 논에 물을 보탰다.',{water:6,trust:6,health:-3},'cooperate')
  ],(l,j)=>j.region!=='한양'),
 E('householdDisaster',[1815,1893],null,'폭우 뒤 무너진 집 담장',
  '밤새 비가 쏟아졌다. 집 뒤의 담장이 무너지고 곳간의 곡식도 젖었다.',SOURCES.taxes,[
   O('가족과 함께 높은 곳으로 옮긴다','사람을 살리는 일이 먼저다','물이 빠진 뒤에야 식구들이 돌아와 살림을 다시 폈다.',{capital:-5,grain:-3,bonds:4,relocate:1},'shelter'),
   O('이웃과 담장을 다시 쌓는다','서로 일손과 도구를 보탠다','이웃이 도움이 필요할 때 다시 품을 돌려주었다.',{capital:-2,health:-3,trust:5},'repair'),
   O('곡식부터 건져 말린다','먹을 것을 지켜 보려 한다','젖은 곡식을 말리며 힘겹게 장마를 넘겼다.',{health:-2,grain:-3},'food')
  ]),
 E('jinju1862',[1862,1862],['경상도'],'진주와 단성에서 시작된 농민의 항의',
  '진주와 단성에서 세금과 환곡의 폐단을 견디지 못한 사람들이 들고일어났다는 소식이 들린다.',SOURCES.jinju,[
   O('장부와 세금의 잘못을 함께 따진다','이웃들과 관아에 억울함을 알린다','함께 항의했던 이웃과 오래도록 세금 이야기를 나누었다.',{taxDebt:-3,trust:5,knowledge:2,health:-2},'protest'),
   O('식구를 먼 고을로 피신시킨다','혼란이 가라앉기를 기다린다','떠나 있던 식구는 한동안 고향에 돌아오지 못했다.',{capital:-6,relocate:1,bonds:2},'flight'),
   O('아픈 이웃과 집안 살림을 챙긴다','전투에 나서지 않고 사람을 돌본다','그 무렵 이웃과 돌보았던 가족의 이름을 기억했다.',{grain:-3,bonds:5},'care')
  ]),
 E('imshul1862',[1862,1862],['충청도','전라도','경상도','경기도','황해도'],'다른 고을에서도 세금 때문에 다투다',
  '진주뿐 아니라 다른 고을에서도 환곡과 군역 부담을 놓고 주민들이 항의한다는 말이 들린다.',SOURCES.taxes,[
   O('우리 집의 장부를 살핀다','부당한 부담이 있는지 따진다','오래된 세금 장부의 이름을 식구들과 다시 확인했다.',{knowledge:3,taxDebt:-2},'record'),
   O('관아에 탄원하는 이웃을 돕는다','마을 사람들과 사정을 나눈다','같이 글을 올린 이웃과 정이 깊어졌다.',{trust:5,bonds:3,health:-1},'petition'),
   O('장터를 떠나 일시 피한다','불안한 소문에 가족을 지킨다','고을이 잠잠해진 뒤 다시 장사를 나갔다.',{capital:-4,relocate:1},'flight')
  ]),
 E('afterImshul1863',[1863,1864],southern,'다시 세금 장부를 매기는 고을',
  '큰 항의가 지나갔다. 관아에서는 고을의 세금 장부를 다시 살핀다고 하지만, 달라진 것이 적다는 말도 있다.',SOURCES.taxes,[
   O('억울했던 장부를 다시 내민다','이전에 냈던 말과 기록을 확인한다','계속 장부를 지키는 일이 집안의 버릇이 되었다.',{taxDebt:-3,knowledge:3},'review'),
   O('이웃과 곡식을 모아 서로 돕는다','다시 흉년이 들 때를 준비한다','위기 때 곡식을 내어 준 이웃에게 다음 해 품을 돌렸다.',{grain:-2,trust:4,bonds:3},'mutual'),
   O('먼 친척에게 일을 구한다','동네에서 오래 머물기 어렵다','생업을 찾아 떠났다가 다시 고향을 찾았다.',{capital:3,relocate:1,health:-2},'work')
  ]),
 E('byeongin1866',[1866,1866],['경기도','한양'],'강화도에서 날아온 포성',
  '강화도에서 프랑스 군함과 조선 군사가 싸운다. 도성까지 피란을 걱정하는 사람이 있다.',SOURCES.byeongin,[
   O('식구와 피란할 곳을 살핀다','먼 친척에게 안부를 묻는다','피란을 걱정하던 집안은 오래도록 바다 쪽 소식을 살폈다.',{bonds:4,capital:-3},'shelter'),
   O('군영의 식량을 마련한다','전쟁에 참여하는 사람에게 양식을 건넨다','군량을 나르던 길이 오래 기억났다.',{grain:-4,bonds:2,health:-2},'supply'),
   O('돌아오지 못한 이웃을 기다린다','아픈 사람을 먼저 돌본다','전란 뒤에도 돌아오지 않은 사람 이야기가 남았다.',{health:-1,bonds:5},'family')
  ]),
 E('shinmi1871',[1871,1871],['경기도','한양'],'강화도의 큰 싸움',
  '강화도의 진과 보루에서 큰 싸움이 벌어졌다는 소식이 들린다. 고을마다 사람을 걱정한다.',SOURCES.shinmi,[
   O('먼 바닷길에 나간 가족을 찾는다','포구의 배와 사람을 수소문한다','돌아온 사람에게 그날의 일을 자세히 들었다.',{capital:-3,bonds:4},'kin'),
   O('먹을거리와 옷을 모아 보낸다','군인과 다친 사람에게 건넨다','그날 옷을 모으던 이웃과 다음에도 힘을 나누었다.',{grain:-3,trust:3},'supply'),
   O('집과 논밭을 지키며 기다린다','불안한 날에도 일손을 챙긴다','큰 싸움이 지나간 뒤에도 바깥길을 조심했다.',{capital:1,health:-1},'wait')
  ]),
 E('port1876',[1876,1879],coastal,'개항 이후 달라진 포구의 물건',
  '항구로 낯선 물건과 상인이 들어온다는 소식이 퍼진다. 물건값과 거래 방식이 달라지고 있다.',SOURCES.opening,[
   O('새 물건의 쓰임과 값을 알아본다','낯선 상인을 신중하게 대한다','장터에서 새로 들어온 물건을 다시 볼 수 있었다.',{knowledge:4,capital:-2},'learn'),
   O('집안에서 만든 물건을 판다','상인의 새로운 거래를 알아본다','새로운 손님을 만났지만 물건값은 늘 달랐다.',{capital:4,trust:1},'trade'),
   O('익숙한 고을 장터를 지킨다','오래된 단골과 거래한다','고향의 단골이 다시 찾아와 안부를 물었다.',{trust:3,capital:1},'stay')
  ]),
 E('imosoldier1882',[1882,1882],['한양','경기도'],'도성 군인들의 불만',
  '한양에서 군인들에게 줄 곡식과 품삯 문제가 커져 소란이 났다는 말이 돌고 있다.',SOURCES.imo,[
   O('도성에 있는 가족에게 편지를 보낸다','소식을 먼저 확인한다','도성의 집안은 혼란이 가라앉은 뒤 편지를 보내왔다.',{bonds:4,capital:-2},'kin'),
   O('시장 문을 닫고 일단 지낸다','큰길의 소란을 피한다','장사할 날이 줄어 살림에 부담이 남았다.',{capital:-4,health:1},'quiet'),
   O('사람들이 다친 곳에 먹을 것을 보낸다','사람들의 안부부터 살핀다','도움을 받은 사람들이 그날을 잊지 않았다.',{grain:-3,bonds:4},'care')
  ]),
 E('gapsin1884',[1884,1884],['한양','경기도'],'사흘 만에 뒤집힌 도성의 소식',
  '새 제도를 세우겠다는 사람들이 정변을 일으켰지만 곧 실패했다는 소식이 전해진다.',SOURCES.gapshin,[
   O('새 제도를 알고 싶어 글을 찾아본다','문벌과 세금 제도의 소식을 듣는다','도성에서 읽었던 글귀를 다시 이야기했다.',{knowledge:4},'study'),
   O('가족을 위해 한양의 큰길을 피한다','혼란 속 생업을 멈춘다','사람들은 그 며칠을 두고 오래 이야기했다.',{capital:-3,bonds:3},'avoid'),
   O('멀리 사는 친척에게 안부를 묻는다','사라진 사람을 걱정한다','먼 곳으로 떠난 친척에게서 소식이 전해졌다.',{capital:-2,bonds:4},'family')
  ]),
 E('donghak1894',[1894,1894],['전라도','충청도','경상도'],'동학 농민군이 모이다',
  '고부에서 시작된 항의가 여러 고을로 퍼졌다. 농민들이 탐관오리와 부당한 세금을 바로잡자며 모인다.',SOURCES.donghak,[
   O('식구를 안전한 곳에 머무르게 한다','전투에 휘말리지 않도록 한다','전쟁이 지나간 뒤에도 집안사람들의 안부가 가장 큰 걱정이었다.',{capital:-4,bonds:5},'protect'),
   O('농민군과 주변 고을의 소식을 듣는다','무슨 요구를 하는지 알아본다','그해 여러 고을의 사람들이 서로 다른 뜻을 나눴다.',{knowledge:4,trust:1},'learn'),
   O('굶주린 이웃에게 곡식을 건넨다','사람을 먼저 살핀다','도움을 건넸던 이웃과 전란 뒤에도 만났다.',{grain:-4,bonds:5},'aid')
  ]),
 E('gabo1894',[1894,1894],null,'법에서 신분의 벽을 허물다',
  '공노비와 사노비를 둔 법을 없애고, 문벌과 양반·평민의 구별도 고치겠다는 방이 붙었다. 하지만 고을 사람들의 태도는 쉽게 바뀌지 않는다.',SOURCES.gabo,[
   O('집안의 신분과 일자리를 다시 헤아린다','앞으로 어떤 일을 할지 의논한다','새 법이 생겨도 집안 살림을 다시 꾸리는 일은 쉽지 않았다.',{knowledge:4,capital:-2},'future'),
   O('이웃과 달라진 법을 함께 읽는다','자녀에게 새로운 제도를 알린다','변화를 기다리던 이웃과 아이들이 새 법을 물었다.',{bonds:4,knowledge:2},'school'),
   O('하던 생업을 이어 가며 지켜본다','옛 차별이 여전히 남아 있다','법과 사람들이 살아가는 방식의 차이를 오래 보게 되었다.',{capital:2,trust:1},'work')
  ])
];
const IDS=new Map(EVENTS.map(e=>[e.id,e]));
function isJoseonYear(l){return J?.isJoseon(l)&&J.inOldEra(l)&&l.year>=1800&&l.year<=1894&&l.alive}
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.joseon11){
  const start=l.year;
  l.joseon11={version:1,processedYear:start,selected:[],queue:[],active:null,decisions:[],followups:[],taxDebt:0,paidTax:0,moves:0,
   solidarity:0,dispute:0,memories:[],lastSource:null,hardship:0};
 }
 return l.joseon11;
}
function fits(l,e){
 if(!isJoseonYear(l)||l.age<12||l.age>82||!regionIncludes(J.summary(l).region,e.regions))return false;
 if(l.year<e.years[0]||l.year>e.years[1])return false;
 return !e.gate||e.gate(l,J.summary(l),V5.summary(l));
}
function rank(l,e,s){
 const precise=e.years[0]===e.years[1];
 const household=e.gate?-.13:0;
 const prior=s.decisions.at(-1)?.kind===e.id?1:0;
 return (precise?-.3:0)+household+prior+hash(l.seed,l.year*199+e.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0));
}
function pickEvent(l,s){
 const available=EVENTS.filter(e=>!s.selected.includes(e.id)&&fits(l,e));
 if(!available.length)return null;
 available.sort((a,b)=>rank(l,a,s)-rank(l,b,s));
 return available[0];
}
function makeDecision(l,e,s){
 s.selected.push(e.id);s.queue.push({id:l.year+'-'+e.id,eventId:e.id,year:l.year});s.queue=s.queue.slice(-3);
}
function promote(l,s){
 if(!s||s.active||l.pending||!l.alive||!isJoseonYear(l)||!s.queue.length)return;
 s.active=s.queue.shift();l.pending='joseon11:'+s.active.id;
}
function prompt(l){
 const s=ensure(l),e=IDS.get(s?.active?.eventId);
 if(!e)return null;
 let desc=e.scene;
 const social=V5.summary(l),place=J.summary(l).region;
 if(e.id==='register1801'){
  if(social.origin==='공노비')
   desc=social.publicOffice==='중앙 관서'?'중앙 관서의 노비안을 없앴다는 소식이 들린다. 한때 관아에 예속됐던 집안의 앞날을 다시 생각한다.':'중앙 관청의 내시노비는 풀려났다고 한다. 그러나 지방 관아의 일과 예속이 모두 한꺼번에 사라진 것은 아니다.';
  else desc='중앙 관청에 소속된 노비가 풀려났다고 한다. 주인집에 매인 사노비의 처지는 아직 달라지지 않았다.';
 }else if(e.id==='jinju1862'){
  desc=place==='경상도'?'진주와 단성의 고을에서 환곡과 세금에 항의하는 사람들이 모였다는 소식이 들린다. 사는 고을마다 형편과 대응은 다르다.':e.scene;
 }else if(e.id==='taxRollover'&&s.taxDebt>4){
  desc='갚지 못한 환곡과 세금이 장부에 남아 있다. 이자를 더해 내라는 말도 있어 식구들 얼굴이 어둡다.';
 }
 return {title:e.title,description:desc,options:e.options.map(x=>({label:x.label,note:x.note,action:x.label}))};
}
function yearly(l,s){
 if(!s||!isJoseonYear(l)||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 const j=J.ensure(l),v=V2.ensure(l),village=V9.ensure(l);
 for(const f of s.followups.filter(f=>f.year<=l.year)){
  l.logEvent(f.text,'joseon11-followup');l.log.at(-1).causeId='joseon11:'+f.id;
  s.memories.push(f.text);
 }
 s.followups=s.followups.filter(f=>f.year>l.year);
 s.memories=s.memories.slice(-18);
 // Old unpaid fiscal debts burden next year's farming and credit. This is
 // illustrative household pressure, NOT a reconstructed tax interest rate.
 if(s.taxDebt>=4&&l.year<=1893&&l.year%3===0){
  const paid=clip(Math.floor(s.taxDebt/4),1,3);
  j.capital=clip(j.capital-paid,-120,600);
  v.grain=clip(v.grain-1,0,200);
  l.logEvent('갚지 못한 환곡과 세금 때문에 식구가 쓸 곡식과 돈을 더 아껴야 했다.','joseon11-memory');
  s.hardship++;
 }
 if(l.year<1855&&l.year>=1815&&l.year%7===0&&v.grain<7&&s.taxDebt<24)
  s.taxDebt=clip(s.taxDebt+1,0,35);
 // High-priority dated turning points; ordinary chores much less frequent.
 if(l.age>=12&&l.age<=79&&(l.year%4===2||[1801,1811,1812,1862,1863,1866,1871,1876,1882,1884,1894].includes(l.year))&&s.queue.length<2){
  const e=pickEvent(l,s);
  if(e)makeDecision(l,e,s);
 }
 promote(l,s);
}
function choose(l,index){
 const s=ensure(l),e=IDS.get(s?.active?.eventId);
 if(!l.alive||!e||!Number.isInteger(index)||index<0||index>=e.options.length)return false;
 const o=e.options[index],d=o.d||{},j=J.ensure(l),v=V2.ensure(l),village=V9.ensure(l),id=s.active.id;
 const stats={};for(const k of ['health','happiness','knowledge','bonds','wealth'])if(Number.isFinite(d[k]))stats[k]=d[k];
 l.change(stats);
 if(Number.isFinite(d.capital))j.capital=clip(j.capital+d.capital,-120,600);
 if(Number.isFinite(d.grain))v.grain=clip(v.grain+d.grain,0,200);
 if(Number.isFinite(d.water))village.water=clip(village.water+d.water,0,100);
 if(Number.isFinite(d.trust)){
  village.trust=clip(village.trust+d.trust,0,100);
  if(village.homes.length)village.homes[0].trust=clip(village.homes[0].trust+d.trust,0,100);
 }
 if(Number.isFinite(d.taxDebt))s.taxDebt=clip(s.taxDebt+d.taxDebt,0,35);
 if(d.relocate>0){s.moves++;j.relocations++;j.hardshipUntil=Math.max(j.hardshipUntil,l.year+2);}
 if(['solidarity','protest','mutual','mediate','cooperate'].includes(o.flag))s.solidarity++;
 if(['take','petition','trade'].includes(o.flag))s.dispute++;
 if(l.money&&l.year<1900)l.money.netWorth=j.capital*100;
 l.logEvent(e.title+' — '+o.label,'joseon11-choice');
 l.log.at(-1).causeId='joseon11:'+id;l.log.at(-1).sourceUrl=e.source;
 s.decisions.push({id,eventId:e.id,kind:e.id,year:l.year,choice:index});
 s.decisions=s.decisions.slice(-45);
 s.lastSource=e.source;
 s.followups.push({id,year:l.year+2+(index%2),text:o.follow});
 s.followups=s.followups.slice(-45);
 s.active=null;l.pending=null;promote(l,s);return true;
}
function summary(l){
 const s=ensure(l);if(!s)return null;
 return {taxDebt:s.taxDebt,moves:s.moves,solidarity:s.solidarity,disputes:s.dispute,hardship:s.hardship,
  decisions:s.decisions.length,latest:s.decisions.at(-1)?.eventId||null,lastMemory:s.memories.at(-1)||null};
}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseon11;if(!s||!o||o.version!==1)return s;
 const safe=q=>q&&IDS.has(q.eventId)&&typeof q.id==='string'&&Number.isInteger(q.year)&&q.year>=l.birthYear&&q.year<=l.year?
  {id:q.id.slice(0,75),eventId:q.eventId,year:q.year}:null;
 s.processedYear=clip(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.selected=Array.isArray(o.selected)?o.selected.filter(id=>IDS.has(id)).slice(-EVENTS.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.map(safe).filter(Boolean).slice(-3):[];
 s.active=safe(o.active);
 if(!l.alive||!isJoseonYear(l)||data?.pending!=='joseon11:'+s.active?.id)s.active=null;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(q=>q&&IDS.has(q.eventId)&&typeof q.id==='string'&&Number.isInteger(q.year)&&q.year<=l.year).slice(-45).map(q=>({id:q.id.slice(0,75),eventId:q.eventId,kind:q.eventId,year:q.year,choice:clip(Number(q.choice)||0,0,2)})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(q=>q&&typeof q.id==='string'&&typeof q.text==='string'&&Number.isInteger(q.year)&&q.year>l.year&&q.year<=l.year+5)
  .slice(-45).map(q=>({id:q.id.slice(0,75),text:q.text.slice(0,240),year:q.year})):[];
 for(const k of ['taxDebt','paidTax','moves','solidarity','dispute','hardship'])s[k]=clip(Number(o[k])||0,0,100);
 s.memories=Array.isArray(o.memories)?o.memories.filter(x=>typeof x==='string').slice(-18).map(x=>x.slice(0,240)):[];
 s.lastSource=typeof o.lastSource==='string'&&Object.values(SOURCES).includes(o.lastSource)?o.lastSource:null;
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V4?.summary||!V5?.summary||!V9?.ensure||Sim.Life.prototype.__joseon11)return false;
 const L=Sim.Life,prevTick=L.prototype.tick,prevChoose=L.prototype.choose,prevChoice=L.prototype.getChoice,
  prevReflect=L.prototype.reflect,prevSnap=L.prototype.snapshot,prevRestore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this)||this.year>1894)return prevTick.call(this);
  const year=this.year,ok=prevTick.call(this);
  if(ok&&this.alive&&this.year!==year)yearly(this,ensure(this));
  return ok;
 };
 L.prototype.getChoice=function(){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseon11:'))return prompt(this);
  return prevChoice.call(this);
 };
 L.prototype.choose=function(i){
  if(typeof this.pending==='string'&&this.pending.startsWith('joseon11:'))return choose(this,i);
  const ok=prevChoose.call(this,i);
  if(ok&&isJoseonYear(this))promote(this,ensure(this));
  return ok;
 };
 L.prototype.reflect=function(t){
  const ok=prevReflect.call(this,t);if(ok&&isJoseonYear(this))promote(this,ensure(this));return ok;
 };
 L.prototype.snapshot=function(){
  const s=prevSnap.call(this);if(J.isJoseon(this))s.joseon11=JSON.parse(JSON.stringify(ensure(this)));return s;
 };
 L.restore=function(d){
  const life=prevRestore.call(this,d);if(life&&J.isJoseon(life))hydrate(life,d);return life;
 };
 Object.defineProperty(L.prototype,'__joseon11',{value:true});return true;
}
install();
return Object.freeze({EVENTS,SOURCES,ensure,fits,yearly,choose,prompt,summary,hydrate,install});
});
