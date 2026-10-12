/* Fictional daily-life stories tied to periods, not factual descriptions of real people.
 * Do not treat these as statistical claims or guaranteed experiences.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeHistoryStories10=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const story=(id,ageMin,ageMax,text,need)=>Object.freeze({id,ageMin,ageMax,text,need:need||''});
const banks=Object.freeze({
 precolonial:[
 story('p1',3,14,'어른이 들려주는 변화하는 시대의 이야기를 들었다.'),
 story('p2',14,80,'지역에서 새로 생긴 학교와 배움터에 관한 이야기를 들었다.'),
 story('p3',6,80,'장터를 오가는 사람들과 소식을 주고받았다.'),
 story('p4',0,80,'가족들은 올해 농사와 생업에 관한 계획을 함께 세웠다.'),
 story('p5',14,80,'먼 지역으로 물건을 보내는 방법을 알아보았다.'),
 story('p6',8,80,'이웃이 아는 사람에게 글을 배울 기회를 소개했다.'),
 story('p7',18,80,'거래를 위해 멀리 떠나는 이웃을 배웅했다.'),
 story('p8',5,80,'새로운 생활 도구가 마을에 들어왔다는 이야기를 들었다.')
 ],
 colonial:[
 story('c1',5,17,'가족과 학교에 다니는 비용과 통학 길을 의논했다.'),
 story('c2',7,19,'마을 어른에게 글을 배울 수 있는 시간을 부탁했다.'),
 story('c3',14,80,'일터에서 바뀐 규칙 때문에 한동안 적응해야 했다.'),
 story('c4',6,80,'가족들이 장에서 구할 수 있는 물건과 가격을 살펴보았다.'),
 story('c5',12,80,'마을에서 들려온 소식이 사실인지 여러 사람에게 물었다.'),
 story('c6',18,80,'생계를 이어 가기 위해 새로운 기술을 익힐지 고민했다.'),
 story('c7',6,25,'친구가 공부를 이어 가기 위해 먼 친척 집으로 간다는 말을 들었다.'),
 story('c8',20,80,'가족의 땅과 생업에 관해 이웃과 의논했다.','rural'),
 story('c9',20,80,'도시의 일자리 소식을 들었지만 떠나야 할지 결정하기 어려웠다.','rural'),
 story('c10',8,80,'어른들이 지난 시대의 일을 낮은 목소리로 이야기했다.'),
 story('c11',16,80,'아는 사람의 도움으로 장부를 읽는 법을 배우기 시작했다.'),
 story('c12',7,80,'집에서 필요한 물품을 오래 사용하기 위해 고쳐 썼다.'),
 story('c13',9,70,'시장에 모인 사람들은 먼 곳에서 전해진 소식을 이야기했다.'),
 story('c14',18,80,'가족의 수입과 생활비를 계산하며 다음 계절을 준비했다.')
 ],
 transition:[
 story('t1',4,80,'새로운 사회가 어떻게 바뀔지 가족과 이야기를 나눴다.'),
 story('t2',14,80,'지역의 학교와 일자리가 다시 정비된다는 소식을 들었다.'),
 story('t3',10,80,'이웃과 함께 생필품을 나누고 구할 방법을 찾았다.'),
 story('t4',18,80,'지역의 소식과 사람들의 서로 다른 생각을 들었다.'),
 story('t5',8,80,'주변 어른들이 새로운 시대에 대한 기대와 걱정을 나눴다.'),
 story('t6',14,80,'가족의 생활을 안정시키기 위해 배울 일을 찾아봤다.')
 ],
 war:[
 story('w1',5,85,'가족들이 서로의 안부를 확인하며 하루를 보냈다.'),
 story('w2',10,85,'이웃과 연락할 방법을 미리 약속해 두었다.'),
 story('w3',6,18,'공부하던 일을 잠시 멈추고 다른 곳에서 배울 방법을 알아봤다.'),
 story('w4',18,80,'익숙한 생업을 계속하기 어려워 가능한 일을 찾아봤다.'),
 story('w5',5,80,'필요한 물건을 조심스럽게 나누어 사용했다.'),
 story('w6',6,85,'어른들과 안전한 이동 방법에 관해 이야기를 들었다.'),
 story('w7',20,85,'잠시 떨어진 지인의 안부를 들을 방법을 알아보았다.'),
 story('w8',10,80,'가족들이 서로 함께할 수 있는 작은 일을 정했다.'),
 story('w9',10,80,'한동안 연락하지 못했던 이웃의 소식을 기다렸다.'),
 story('w10',10,80,'낯선 환경에서 서로 도울 수 있는 일을 찾았다.')
 ],
 rebuilding:[
 story('r1',6,18,'중단했던 공부를 다시 시작할 방법을 알아봤다.'),
 story('r2',18,80,'생활을 다시 세우기 위해 일할 곳을 찾아봤다.'),
 story('r3',10,80,'가족과 함께 지낼 공간을 조금씩 손봤다.'),
 story('r4',18,80,'지역에서 필요한 기술을 배우는 사람을 만났다.'),
 story('r5',6,80,'이웃들이 서로 집을 고치는 일을 도왔다.'),
 story('r6',10,80,'가족과 함께 저축할 수 있는 작은 목표를 정했다.'),
 story('r7',10,80,'새로운 학교와 시장이 생긴다는 소식을 들었다.'),
 story('r8',20,80,'예전에 함께 지내던 이웃에게 편지를 보냈다.'),
 story('r9',10,80,'먼 친척이 다시 생업을 시작했다는 이야기를 들었다.'),
 story('r10',20,80,'새로운 일자리와 통학 여건을 함께 비교해 보았다.')
 ],
 industrial:[
 story('i1',14,80,'먼 도시의 공장과 일자리에 관한 이야기를 들었다.'),
 story('i2',18,80,'새로운 기계를 다루는 기술을 배워 보려 했다.'),
 story('i3',10,80,'동네의 교통편이 달라지면서 이동 계획을 다시 세웠다.'),
 story('i4',18,80,'일터에서 더 안전하게 일하는 방법에 관해 동료와 이야기했다.'),
 story('i5',20,80,'가족들은 도시와 농촌 가운데 어디에서 살지 의논했다.'),
 story('i6',6,18,'학교에서 과학과 산업의 변화에 관한 이야기를 들었다.'),
 story('i7',12,80,'가까운 이웃이 직업을 찾아 먼 지역으로 떠난다는 소식을 들었다.'),
 story('i8',18,80,'일과 휴식의 균형을 지키기 위해 생활 시간을 조정했다.'),
 story('i9',20,80,'매월 받는 수입의 일부를 모아두기로 했다.'),
 story('i10',20,80,'새로운 기술을 배우려는 동료와 정보를 나눴다.'),
 story('i11',15,80,'이전보다 빠르게 변화하는 도시의 모습을 지켜봤다.'),
 story('i12',6,80,'예전에 사용하던 교통수단과 새로 생긴 길을 비교했다.')
 ],
 democracy:[
 story('d1',14,80,'민주주의와 시민의 권리에 관한 이야기를 들었다.'),
 story('d2',16,80,'서로 다른 정치적 의견을 가진 이웃들의 이야기를 들었다.'),
 story('d3',18,80,'지역에서 열린 공개 토론과 모임에 관한 소식을 들었다.'),
 story('d4',14,80,'학생과 시민들이 사회를 바꾸기 위해 참여한 일을 배웠다.'),
 story('d5',20,80,'가족과 세상이 달라지는 방식에 관해 이야기했다.'),
 story('d6',14,80,'사회 변화에 관한 신문 기사를 읽고 생각을 정리했다.'),
 story('d7',20,80,'친구와 오래전보다 다양해진 진로에 관해 이야기했다.'),
 story('d8',20,80,'직장의 새로운 기술과 교육 기회를 알아봤다.'),
 story('d9',18,80,'가족의 주거비와 생활비를 다시 계산했다.'),
 story('d10',10,80,'지역 행사에서 다양한 세대의 사람들과 이야기를 나눴다.')
 ],
 crisis:[
 story('f1',18,80,'가족과 매달 고정적으로 나가는 돈을 확인했다.'),
 story('f2',20,80,'일자리가 바뀔 때를 대비해 배울 수 있는 일을 찾아봤다.'),
 story('f3',18,80,'동네 상점의 사정을 듣고 필요한 소비를 다시 생각했다.'),
 story('f4',18,80,'직장 동료와 직업훈련 정보를 나눴다.'),
 story('f5',8,80,'가족이 필요하지 않은 지출을 조금 줄여 보기로 했다.'),
 story('f6',20,80,'지인이 새로운 일을 시작했다는 이야기를 들었다.'),
 story('f7',18,80,'자격을 갖추거나 기술을 배우는 데 드는 시간을 계산했다.'),
 story('f8',20,80,'가까운 이웃과 생활에 도움이 되는 정보를 나눴다.')
 ],
 digital:[
 story('g1',12,80,'새로운 디지털 기기를 사용해 가족과 연락했다.'),
 story('g2',18,80,'필요한 물건의 가격을 인터넷으로 비교했다.'),
 story('g3',8,80,'멀리 사는 지인과 온라인으로 소식을 주고받았다.'),
 story('g4',18,80,'온라인 서비스를 이용하면서 개인정보를 조심했다.'),
 story('g5',10,80,'새로운 디지털 도구의 사용법을 배우기로 했다.'),
 story('g6',18,80,'직업에서 쓰는 기술이 달라져 다시 배워야 할 일이 생겼다.'),
 story('g7',15,80,'친구와 대중교통으로 새로운 장소를 찾아갔다.'),
 story('g8',18,80,'가족들의 생활 방식이 이전 세대와 다르다는 이야기를 나눴다.')
 ],
 pandemic:[
 story('v1',5,85,'평소와 달라진 생활 속에서 가족과 연락하는 방법을 정했다.'),
 story('v2',8,70,'학교와 일터의 안전 수칙이 달라진 것을 확인했다.'),
 story('v3',15,80,'멀리 있는 친구와 전화나 온라인으로 소식을 나눴다.'),
 story('v4',18,80,'몸의 상태를 살피며 무리하지 않는 일정을 계획했다.'),
 story('v5',6,80,'이웃에게 필요한 물건을 안전하게 전달할 방법을 생각했다.'),
 story('v6',16,80,'달라진 이동과 모임 규칙을 확인했다.'),
 story('v7',18,80,'일과 가정의 공간을 구분하기 위해 생활 습관을 조정했다.'),
 story('v8',5,80,'사람들과 만나는 방법이 달라져 가족과 하루를 다시 계획했다.')
 ]
});
function era(year){
 if(year<1910)return 'precolonial';
 if(year<1945)return 'colonial';
 if(year<1948)return 'transition';
 if(year<=1953)return 'war';
 if(year<1962)return 'rebuilding';
 if(year<1988)return 'industrial';
 if(year<1997)return 'democracy';
 if(year<2010)return 'crisis';
 if(year<2020)return 'digital';
 if(year<2023)return 'pandemic';
 return 'digital';
}
function select(life,seen){
 if(life.country?.[0]!=='대한민국')return null;
 if(life.year%2!==life.birthYear%2)return null;
 const source=banks[era(life.year)]||[];
 const applicable=source.filter(e=>life.age>=e.ageMin&&life.age<=e.ageMax&&
 (!e.need||e.need===life.profile?.settlement));
 const fresh=applicable.filter(e=>!seen.includes(e.id));
 if(!fresh.length)return null;
 const n=((life.seed>>>0)+Math.imul(life.age+1,16777619))>>>0;
 return fresh[n%fresh.length];
}
return Object.freeze({banks,era,select,count:Object.values(banks).reduce((sum,a)=>sum+a.length,0)});
});
