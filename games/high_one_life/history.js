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
 return life.year<1910?'대한제국 시기의 한반도':life.year<1945?'한반도(당시 일본 식민 지배하의 조선)':life.year===1945?'광복을 맞은 한반도':life.year<1948?'광복 이후 한반도':'대한민국';
}
function contextualize(life){
 if(!life||!life.alive||life.country[0]!=='대한민국')return false;
 const hit=events.find(e=>e.year===life.year);
 if(!hit)return false;
 if(life.log.some(e=>e.kind==='history'&&e.year===hit.year))return false;
 life.logEvent(hit.year+'년의 실제 역사 — '+hit.title+': '+hit.detail+' 이 가상 인물이 직접 참여했다는 뜻은 아니다.','history');
 return true;
}
function currentEvent(life){
 return life?.country?.[0]==='대한민국'?events.find(e=>e.year===life.year)||null:null;
}
/* Simplified historical street diorama. Intentionally illustrative rather than
   a claim that every family lived in the same house or landscape. */
function paint(canvas,life){
 if(!canvas||life?.country?.[0]!=='대한민국'||life.year>=1960||life.birthYear===2026)return false;
 const ctx=canvas.getContext?.('2d');if(!ctx)return false;
 const w=600,h=258;canvas.width=w;canvas.height=h;
 ctx.imageSmoothingEnabled=false;
 const f=(x,y,b,c,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,b,c);};
 const year=life.year,urban=life.profile?.settlement==='도시';
 const late=year>=1945,school=life.age>=7&&life.age<19;
 f(0,0,w,h,late?'#c7d8d0':'#d7dac6');
 f(0,0,w,70,late?'#c2d5d9':'#dce6d9');
 f(0,70,w,125,late?'#a6b7a7':'#b4c1a8');
 // Low distant mountains, not a specific documented town.
 for(let n=0;n<9;n++)f(n*78-20,82+(n%3)*8,98,55,late?'#9eafa3':'#9bb1a0');
 f(0,161,w,97,urban?'#aa9c87':'#bca78a');
 f(0,209,w,49,'#988d7a');
 for(let n=0;n<21;n++)f(n*31+(n%2)*7,223+(n%3)*8,15,3,'#bca991');
 function house(x,y,wide,red){
   const wall=red?'#d6baaa':'#e2cead',roof=red?'#66545a':'#596664';
   f(x,y+21,wide,63,wall);
   f(x-8,y+15,wide+16,11,roof);
   f(x+4,y+4,wide-8,11,roof);
   f(x+14,y-3,wide-28,9,roof);
   f(x+wide/2-13,y+39,26,45,'#8a725a');
   f(x+wide/2-9,y+44,18,32,'#aa9471');
   f(x+10,y+38,24,22,'#ede3cb');
   f(x+13,y+40,18,17,'#9d9986');
   f(x+wide-33,y+38,23,22,'#ede3cb');
   f(x+wide-30,y+40,17,17,'#9d9986');
 }
 house(20,113,132,false);house(438,116,133,urban);
 if(urban){
   f(180,121,230,77,'#d0bc9c');
   for(let x=191;x<400;x+=39){f(x,144,25,28,'#ece1c8');f(x+2,146,21,24,'#758787');}
   f(184,116,224,10,'#625c57');f(203,106,184,12,'#756961');
 }else{
   f(174,150,230,50,'#a8ac7d');
   for(let i=0;i<8;i++)f(180+i*29,173+(i%2)*6,13,18,'#7f9363');
   f(202,130,9,65,'#716a55');f(184,122,44,13,'#718561');
 }
 // A small wandering figure (age changes stature); their life is fictional.
 const size=life.age<13?17:23,x=293,y=167;
 f(x,y-20,size,18,'#d3b18d');
 f(x+3,y-16,5,3,'#473d38');
 f(x-3,y-2,size+6,29,school?'#657a88':late?'#6b7a71':'#766e67');
 f(x,y+27,6,26,'#5b524c');f(x+size-7,y+27,6,26,'#5b524c');
 f(x-8,y+2,6,20,'#b89379');f(x+size+2,y+2,6,20,'#b89379');
 if(school){f(x+size+7,y+17,14,15,'#987c52');f(x+size+9,y+16,10,3,'#5c5345');}
 ctx.fillStyle='#29423d';ctx.font='bold 14px sans-serif';ctx.textAlign='left';
 ctx.fillText(year+'년 · '+period(life),15,29);
 ctx.font='11px sans-serif';ctx.fillText('시대 분위기를 참고한 상상화 · 실제 기록 사진이 아닙니다',15,250);
 return true;
}
return Object.freeze({events,period,place,contextualize,currentEvent,paint});
});
