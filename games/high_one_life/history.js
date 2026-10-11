/* Historical markers are documented events, NOT scripted participation by a player.
 * Historical markers for Korea use open resources from
 * National Institute of Korean History, National Archives of Korea
 * and National Museum of Korea. No historical demographic life table is claimed.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeHistory=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const events=Object.freeze([
 {year:1910,title:'국권 피탈',detail:'대한제국의 국권이 일본에 빼앗겼다.',source:'https://contents.history.go.kr/resources/common/pdf/A%20History%20of%20Korea_The%20Understanding%20Korea%20Series.pdf'},
 {year:1919,title:'3·1운동',detail:'전국에서 일본의 식민 지배에 맞서 독립을 외치는 만세운동이 전개되었다.',source:'https://theme.archives.go.kr/next/koreaOfRecord/3_1.do'},
 {year:1929,title:'광주학생항일운동',detail:'학생들의 항일운동이 시작되어 여러 지역으로 확산되었다.',source:'https://contents.history.go.kr/'},
 {year:1945,title:'광복',detail:'8월 15일 일본의 식민 통치가 끝나고 광복을 맞이했다.',source:'https://www.museum.go.kr/ENG/contents/E0603010000.do'},
 {year:1948,title:'대한민국 정부 수립',detail:'8월 15일 대한민국 정부가 수립되었다.',source:'https://www.museum.go.kr/ENG/contents/E0202030000.do?exhiSpThemId=462360&listType=list&menuId=past&schM=view'},
 {year:1950,title:'한국전쟁 발발',detail:'6월 25일 한국전쟁이 시작되어 수많은 사람의 일상이 바뀌었다.',source:'https://contents.history.go.kr/'},
 {year:1953,title:'정전협정',detail:'7월 27일 정전협정이 체결되었다. 한반도에서 전쟁이 완전히 끝난 것은 아니다.',source:'https://contents.history.go.kr/'},
 {year:1960,title:'4·19혁명',detail:'부정선거에 항의하는 시민과 학생들의 민주화 운동이 일어났다.',source:'https://contents.history.go.kr/'},
 {year:1980,title:'5·18민주화운동',detail:'광주에서 민주화를 요구한 시민들의 저항과 국가폭력이 있었다.',source:'https://contents.history.go.kr/'},
 {year:1987,title:'6월 민주항쟁',detail:'전국적으로 민주화를 요구하는 시민들의 항쟁이 전개되었다.',source:'https://contents.history.go.kr/'}
]);
function period(life){
 const y=life?.year??2026,c=life?.country?.[0];
 if(c!=='대한민국')return life?.birthYear===2026?'현대 세계':'과거의 세계 (현대 국가 경계로 단순화)';
 if(y<1910)return '대한제국 시기';
 if(y<=1945)return y===1945?'광복의 해':'일제강점기';
 if(y<1948)return '광복 이후 전환기';
 if(y<1954)return '정부 수립·한국전쟁 시기';
 if(y<1988)return '전후 사회와 민주화의 시대';
 return '현대 대한민국';
}
function place(life){
 const c=life?.country?.[0]||'';
 if(c!=='대한민국')return c;
 return life.year<1945?'한반도(당시 일본 식민 지배하의 조선)':life.year===1945?'광복을 맞은 한반도':life.year<1948?'광복 이후 한반도':'대한민국';
}
function contextualize(life){
 if(!life||life.country[0]!=='대한민국')return false;
 const hit=events.find(e=>e.year===life.year);
 if(!hit)return false;
 if(life.log.some(e=>e.kind==='history'&&e.year===hit.year))return false;
 life.logEvent(hit.year+'년의 실제 역사 — '+hit.title+': '+hit.detail+' 이 가상 인물이 직접 참여했다는 뜻은 아니다.','history');
 return true;
}
function currentEvent(life){
 return life?.country?.[0]==='대한민국'?events.find(e=>e.year===life.year)||null:null;
}
return Object.freeze({events,period,place,contextualize,currentEvent});
});
