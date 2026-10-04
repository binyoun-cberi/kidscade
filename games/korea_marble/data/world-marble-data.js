(()=>{
'use strict';

const COUNTRIES=[
{id:'KR',name:'대한민국',city:'서울',lon:126.98,lat:37.57,continent:'asia',value:34,icon:'🇰🇷',build:['한식 골목','도심 호텔','N서울타워']},
{id:'JP',name:'일본',city:'도쿄',lon:139.69,lat:35.68,continent:'asia',value:38,icon:'🇯🇵',build:['라멘 거리','료칸','도쿄타워']},
{id:'CN',name:'중국',city:'베이징',lon:116.40,lat:39.90,continent:'asia',value:36,icon:'🇨🇳',build:['전통 시장','베이징 호텔','만리장성 투어']},
{id:'MN',name:'몽골',city:'울란바토르',lon:106.91,lat:47.92,continent:'asia',value:20,icon:'🇲🇳',build:['게르 캠프','초원 리조트','테를지 투어']},
{id:'VN',name:'베트남',city:'하노이',lon:105.84,lat:21.03,continent:'asia',value:24,icon:'🇻🇳',build:['쌀국수 거리','하노이 호텔','하롱베이 투어']},
{id:'TH',name:'태국',city:'방콕',lon:100.50,lat:13.75,continent:'asia',value:27,icon:'🇹🇭',build:['야시장','방콕 호텔','왕궁 투어']},
{id:'SG',name:'싱가포르',city:'싱가포르',lon:103.82,lat:1.35,continent:'asia',value:39,icon:'🇸🇬',build:['호커센터','마리나 호텔','마리나베이 랜드마크']},
{id:'ID',name:'인도네시아',city:'자카르타',lon:106.85,lat:-6.21,continent:'asia',value:25,icon:'🇮🇩',build:['전통 시장','발리 리조트','보로부두르 투어']},
{id:'IN',name:'인도',city:'뉴델리',lon:77.21,lat:28.61,continent:'asia',value:29,icon:'🇮🇳',build:['향신료 시장','델리 호텔','타지마할 투어']},
{id:'AE',name:'아랍에미리트',city:'두바이',lon:55.27,lat:25.20,continent:'asia',value:46,icon:'🇦🇪',build:['수크 시장','팜 리조트','부르즈 할리파']},
{id:'TR',name:'튀르키예',city:'이스탄불',lon:28.98,lat:41.01,continent:'asia',value:33,icon:'🇹🇷',build:['바자르','보스포루스 호텔','아야소피아 투어']},
{id:'RU',name:'러시아',city:'모스크바',lon:37.62,lat:55.75,continent:'europe',value:35,icon:'🇷🇺',build:['아르바트 거리','모스크바 호텔','붉은광장 투어']},

{id:'GB',name:'영국',city:'런던',lon:-0.13,lat:51.51,continent:'europe',value:43,icon:'🇬🇧',build:['펍 거리','런던 호텔','빅벤 투어']},
{id:'FR',name:'프랑스',city:'파리',lon:2.35,lat:48.86,continent:'europe',value:45,icon:'🇫🇷',build:['카페 거리','파리 호텔','에펠탑']},
{id:'ES',name:'스페인',city:'마드리드',lon:-3.70,lat:40.42,continent:'europe',value:34,icon:'🇪🇸',build:['타파스 거리','마드리드 호텔','사그라다 투어']},
{id:'PT',name:'포르투갈',city:'리스본',lon:-9.14,lat:38.72,continent:'europe',value:27,icon:'🇵🇹',build:['에그타르트 거리','리스본 호텔','벨렝탑 투어']},
{id:'DE',name:'독일',city:'베를린',lon:13.40,lat:52.52,continent:'europe',value:40,icon:'🇩🇪',build:['시장 광장','베를린 호텔','브란덴부르크문']},
{id:'NL',name:'네덜란드',city:'암스테르담',lon:4.90,lat:52.37,continent:'europe',value:32,icon:'🇳🇱',build:['치즈 시장','운하 호텔','풍차 투어']},
{id:'BE',name:'벨기에',city:'브뤼셀',lon:4.35,lat:50.85,continent:'europe',value:29,icon:'🇧🇪',build:['와플 거리','브뤼셀 호텔','그랑플라스 투어']},
{id:'CH',name:'스위스',city:'베른',lon:7.45,lat:46.95,continent:'europe',value:42,icon:'🇨🇭',build:['초콜릿 거리','알프스 호텔','융프라우 투어']},
{id:'IT',name:'이탈리아',city:'로마',lon:12.50,lat:41.90,continent:'europe',value:41,icon:'🇮🇹',build:['피자 거리','로마 호텔','콜로세움']},
{id:'AT',name:'오스트리아',city:'빈',lon:16.37,lat:48.21,continent:'europe',value:31,icon:'🇦🇹',build:['카페 거리','빈 호텔','쇤브룬궁 투어']},
{id:'CZ',name:'체코',city:'프라하',lon:14.44,lat:50.08,continent:'europe',value:28,icon:'🇨🇿',build:['구시가지 시장','프라하 호텔','프라하성 투어']},
{id:'PL',name:'폴란드',city:'바르샤바',lon:21.01,lat:52.23,continent:'europe',value:27,icon:'🇵🇱',build:['시장광장','바르샤바 호텔','왕궁 투어']},
{id:'GR',name:'그리스',city:'아테네',lon:23.73,lat:37.98,continent:'europe',value:30,icon:'🇬🇷',build:['플라카 거리','에게해 호텔','파르테논 투어']},

{id:'EG',name:'이집트',city:'카이로',lon:31.24,lat:30.04,continent:'africa',value:31,icon:'🇪🇬',build:['칸엘칼릴리 시장','나일 호텔','피라미드 투어']},
{id:'MA',name:'모로코',city:'카사블랑카',lon:-7.59,lat:33.57,continent:'africa',value:24,icon:'🇲🇦',build:['메디나 시장','리야드 호텔','사하라 투어']},
{id:'KE',name:'케냐',city:'나이로비',lon:36.82,lat:-1.29,continent:'africa',value:26,icon:'🇰🇪',build:['공예 시장','사파리 로지','마사이마라 투어']},
{id:'TZ',name:'탄자니아',city:'다르에스살람',lon:39.21,lat:-6.79,continent:'africa',value:23,icon:'🇹🇿',build:['해변 시장','잔지바르 리조트','세렝게티 투어']},
{id:'ZA',name:'남아프리카공화국',city:'케이프타운',lon:18.42,lat:-33.93,continent:'africa',value:30,icon:'🇿🇦',build:['워터프런트','케이프 호텔','테이블마운틴 투어']},

{id:'US',name:'미국',city:'뉴욕',lon:-74.01,lat:40.71,continent:'northAmerica',value:48,icon:'🇺🇸',build:['브로드웨이 거리','맨해튼 호텔','자유의 여신상 투어']},
{id:'CA',name:'캐나다',city:'토론토',lon:-79.38,lat:43.65,continent:'northAmerica',value:36,icon:'🇨🇦',build:['마켓 거리','토론토 호텔','나이아가라 투어']},
{id:'MX',name:'멕시코',city:'멕시코시티',lon:-99.13,lat:19.43,continent:'northAmerica',value:28,icon:'🇲🇽',build:['타코 거리','멕시코시티 호텔','마야 유적 투어']},
{id:'CU',name:'쿠바',city:'아바나',lon:-82.37,lat:23.11,continent:'northAmerica',value:22,icon:'🇨🇺',build:['올드카 거리','아바나 호텔','말레콘 투어']},

{id:'BR',name:'브라질',city:'리우데자네이루',lon:-43.17,lat:-22.91,continent:'southAmerica',value:35,icon:'🇧🇷',build:['삼바 거리','코파카바나 호텔','예수상 투어']},
{id:'AR',name:'아르헨티나',city:'부에노스아이레스',lon:-58.38,lat:-34.60,continent:'southAmerica',value:30,icon:'🇦🇷',build:['탱고 거리','부에노스 호텔','라보카 투어']},
{id:'CL',name:'칠레',city:'산티아고',lon:-70.67,lat:-33.45,continent:'southAmerica',value:28,icon:'🇨🇱',build:['시장 거리','산티아고 호텔','안데스 투어']},
{id:'PE',name:'페루',city:'리마',lon:-77.04,lat:-12.05,continent:'southAmerica',value:27,icon:'🇵🇪',build:['미라플로레스','리마 호텔','마추픽추 투어']},
{id:'CO',name:'콜롬비아',city:'보고타',lon:-74.07,lat:4.71,continent:'southAmerica',value:25,icon:'🇨🇴',build:['커피 거리','보고타 호텔','카르타헤나 투어']},

{id:'AU',name:'호주',city:'시드니',lon:151.21,lat:-33.87,continent:'oceania',value:42,icon:'🇦🇺',build:['서핑 거리','시드니 호텔','오페라하우스']},
{id:'NZ',name:'뉴질랜드',city:'오클랜드',lon:174.76,lat:-36.85,continent:'oceania',value:31,icon:'🇳🇿',build:['항구 시장','오클랜드 호텔','밀포드사운드 투어']},
{id:'FJ',name:'피지',city:'수바',lon:178.45,lat:-18.14,continent:'oceania',value:22,icon:'🇫🇯',build:['섬 시장','라군 리조트','산호섬 투어']}
];

const ROUTES=[
['KR','JP',['air','sea']],['KR','CN',['air','sea']],['KR','MN',['air']],['JP','CN',['air','sea']],['JP','US',['air']],['JP','AU',['air']],
['CN','MN',['rail']],['CN','VN',['rail','air']],['CN','IN',['air']],['CN','RU',['rail','air']],['VN','TH',['rail']],['TH','SG',['rail','air']],['SG','ID',['sea','air']],['SG','IN',['air']],['SG','AU',['air']],['ID','AU',['sea','air']],['IN','AE',['air']],['AE','TR',['air']],['TR','RU',['air']],['TR','GR',['sea','air']],['TR','AT',['rail']],
['RU','PL',['rail']],['RU','DE',['air']],['GB','FR',['rail','sea']],['GB','NL',['sea','air']],['GB','US',['air']],['GB','CA',['air']],
['FR','BE',['rail']],['FR','CH',['rail']],['FR','ES',['rail']],['FR','MA',['air']],['FR','US',['air']],['ES','PT',['rail']],['ES','MA',['sea']],
['DE','NL',['rail']],['DE','PL',['rail']],['DE','CZ',['rail']],['DE','AT',['rail']],['NL','BE',['rail']],['CH','IT',['rail']],['CH','AT',['rail']],['IT','AT',['rail']],['IT','GR',['sea','air']],['IT','EG',['sea','air']],['AT','CZ',['rail']],['AT','PL',['rail']],['CZ','PL',['rail']],['GR','EG',['sea','air']],
['EG','MA',['air']],['EG','KE',['air']],['MA','ZA',['air']],['KE','TZ',['rail','air']],['TZ','ZA',['air']],
['US','CA',['rail','air']],['US','MX',['rail','air']],['US','CU',['sea','air']],['US','BR',['air']],['MX','CU',['sea','air']],['MX','CO',['air']],
['CO','PE',['air']],['CO','BR',['air']],['PE','CL',['air']],['PE','BR',['air']],['BR','AR',['rail','air']],['BR','PT',['air']],['AR','CL',['rail']],
['AU','NZ',['sea','air']],['AU','FJ',['sea','air']],['NZ','FJ',['air']]
].map((r,i)=>({id:'r'+i,a:r[0],b:r[1],modes:r[2]}));

const EVENTS=[
{id:'bonus',icon:'💱',title:'환율 행운',desc:'좋은 환율을 만나 여행 자금 35만을 얻었어요.',kind:'money',value:35},
{id:'delay',icon:'🛂',title:'입국 심사 지연',desc:'입국 심사가 길어져 다음 턴을 한 번 쉬어요.',kind:'rest',value:1},
{id:'coupon',icon:'🎟️',title:'여행 투자 쿠폰',desc:'다음 나라 투자 또는 건설 비용이 50% 할인돼요.',kind:'discount',value:.5},
{id:'pass',icon:'🚆',title:'글로벌 패스',desc:'다음 상대 나라의 여행비를 한 번 면제받아요.',kind:'pass',value:1},
{id:'festival',icon:'🎉',title:'세계 축제 개최',desc:'내가 투자한 나라 한 곳의 여행 수익이 3라운드 동안 2배가 돼요.',kind:'festival',value:3},
{id:'support',icon:'🎒',title:'여행 지원금',desc:'세계여행 지원금 50만을 받았어요.',kind:'money',value:50},
{id:'lost',icon:'🧳',title:'수하물 추가 비용',desc:'예상치 못한 추가 비용 25만이 들었어요.',kind:'money',value:-25},
{id:'upgrade',icon:'🏨',title:'관광청 지원',desc:'내 투자국 중 한 곳이 무료로 한 단계 성장해요.',kind:'upgrade',value:1}
];

const CONTINENTS={
asia:{name:'아시아',icon:'🌏',need:4},
europe:{name:'유럽',icon:'🏰',need:5},
africa:{name:'아프리카',icon:'🦁',need:3},
northAmerica:{name:'북아메리카',icon:'🗽',need:3},
southAmerica:{name:'남아메리카',icon:'🦙',need:3},
oceania:{name:'오세아니아',icon:'🐨',need:2}
};

window.WorldMarbleData=Object.freeze({COUNTRIES,ROUTES,EVENTS,CONTINENTS});
})();