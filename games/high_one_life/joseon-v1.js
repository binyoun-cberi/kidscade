/* Joseon life rules (1392-1897 births). Educational fiction, not reconstructed
 * household statistics, caste probabilities, wages, or mortality tables.
 * This module is loaded after v13 so pre-1900 years never run modern life rules.
 */
(function(root,factory){
  const api=factory(root?.OneLifeSim,root?.OneLifeWorld2);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OneLifeJoseon=api;
})(typeof window!=='undefined'?window:null,function(Sim,W2){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const isJoseon=life=>!!life&&life.country?.[0]==='대한민국'&&life.birthYear>=1392&&life.birthYear<=1897;
const inOldEra=life=>isJoseon(life)&&life.year<1900;
function roll(seed,salt){
 let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;
}
const REGIONS=[
 ['한양','도성·시장','도시'],['경기도','들녘·장터','농촌'],['충청도','논밭·고을','농촌'],
 ['전라도','곡창·포구','농촌'],['경상도','산과 바닷길','농촌'],['강원도','산촌·고개','농촌'],
 ['황해도','들판·바닷길','농촌'],['평안도','장시·국경길','소도시'],['함경도','산지·변방','농촌']
];
const STATUSES=['양반','중인','상민','천민'];
const NAMES={
 여자:['분이','연화','순이','덕이','옥이','월이','단이','복이'],
 남자:['돌쇠','길동','덕만','복동','영식','춘배','성길','만수']
};
const EVENTS=[
 {year:1392,title:'조선 건국',detail:'새 왕조가 들어서고 나라의 제도가 바뀌기 시작했다.',kind:'change'},
 {year:1446,title:'훈민정음 반포',detail:'새 문자 훈민정음이 세상에 알려졌다.',kind:'learning'},
 {year:1485,title:'경국대전 완성',detail:'나라를 운영하는 법과 제도가 정비되었다.',kind:'change'},
 {year:1592,title:'임진왜란 발발',detail:'왜군의 침입으로 전쟁이 일어나 삶의 터전이 무너졌다.',kind:'war'},
 {year:1597,title:'정유재란',detail:'전쟁이 다시 거세지며 마을과 농토가 피해를 입었다.',kind:'war'},
 {year:1608,title:'대동법 경기도 첫 시행',detail:'경기도에서 공물을 쌀로 거두는 대동법이 시작되었다. 다른 지역은 시행 시기가 달랐다.',kind:'tax'},
 {year:1627,title:'정묘호란',detail:'후금의 침입으로 북방을 중심으로 큰 혼란을 겪었다.',kind:'war'},
 {year:1636,title:'병자호란',detail:'청의 침입으로 전란과 피란이 이어졌다.',kind:'war'},
 {year:1750,title:'균역법 시행',detail:'일부 양인 남성의 군포 부담을 줄이는 제도가 시행되었다.',kind:'tax'},
 {year:1776,title:'규장각 설치',detail:'학문과 기록을 다루는 새로운 왕실 기관이 설치되었다.',kind:'learning'},
 {year:1811,title:'홍경래의 난',detail:'평안도 지역에서 큰 봉기가 일어났다.',kind:'unrest'},
 {year:1862,title:'임술민란',detail:'여러 지역 농민들이 수탈과 불공정한 부과에 항의했다.',kind:'unrest'},
 {year:1876,title:'강화도 조약',detail:'일본과 조약을 맺은 뒤 개항과 교역의 변화가 이어졌다.',kind:'change'},
 {year:1894,title:'갑오개혁',detail:'신분에 따른 법적 차별과 노비제가 폐지되는 개혁이 추진되었다.',kind:'reform'},
 {year:1897,title:'대한제국 선포',detail:'국호가 대한제국으로 바뀌었다.',kind:'change'}
].map(e=>Object.freeze({...e,source:'https://contents.history.go.kr/'}));
const eventFor=year=>EVENTS.find(e=>e.year===year)||null;
function era(year){
 if(year>=1897)return '대한제국 전환기';
 if(year>=1876)return '조선 말기·개항기';
 if(year>=1800)return '19세기 조선';
 if(year>=1700)return '18세기 조선';
 if(year>=1600)return '17세기 조선';
 if(year>=1500)return '16세기 조선';
 return '조선 전기';
}
function seedState(life){
 const r=REGIONS[Math.floor(roll(life.seed,1400)*REGIONS.length)];
 // Purely fictional spread for varied stories. This is not a class census.
 const n=roll(life.seed,1401);
 const status=n<.12?'양반':n<.23?'중인':n<.84?'상민':'천민';
 const family=(status==='양반'&&roll(life.seed,1402)<.67)||roll(life.seed,1403)<.10?'여유 있는 형편'
    :(status==='천민'||roll(life.seed,1404)<.24?'빠듯한 형편':'평범한 형편');
 const home=status==='양반'?'가문 살림':status==='중인'?'기술·서리 일':status==='천민'?'종속된 집안일':'농사';
 const land=status==='양반'?2+Math.floor(roll(life.seed,1405)*5):status==='상민'?Math.floor(roll(life.seed,1405)*3):0;
 return {version:1,region:r[0],landmark:r[1],settlement:r[2],birthStatus:status,
   status,family,land,capital:family==='여유 있는 형편'?155:family==='빠듯한 형편'?18:64,
   occupation:home,school:'집안일을 배우는 때',literacy:0,studyYears:0,exams:0,
   office:false,married:false,children:0,household:1,relocations:0,
   hardshipUntil:0,educationPausedUntil:0,warMemory:[],memories:[],
   seen:[],followups:[],decisions:[],active:null,processedYear:life.birthYear,
   parentsSupported:false,retired:false,finalEra:null};
}
function sync(life,s){
 life.familyLevel=s.family+' · '+(life.year>=1894?'옛 '+s.birthStatus+' 출신':s.status+' 집안');
 life.career=s.occupation;
 life.profile.city=s.region;
 life.profile.settlement=s.settlement;
 life.profile.motherJob=s.birthStatus==='양반'?'집안 살림과 교육':s.birthStatus==='중인'?'집안 생업과 기록 보조':s.birthStatus==='천민'?'집안일과 고된 노동':'농사와 집안일';
 life.profile.fatherJob=s.birthStatus==='양반'?'가문 살림과 학문':s.birthStatus==='중인'?'관청 실무와 기술':s.birthStatus==='천민'?'종속된 노동':'농사와 장터 생업';
 life.profile.partner=s.married;life.profile.child=s.children>0;
 if(life.world){
  life.world.educationYears=s.studyYears;
  life.world.educationLevel=s.literacy>=4?'글과 경전을 익힘':s.literacy>0?'글을 조금 익힘':'생활 속 배움';
  life.world.schooling=s.school;
  life.world.occupation=s.occupation;
 }
 if(life.money){
  life.money.netWorth=Math.round(s.capital*100);
  life.money.employment=s.occupation;
  life.money.retired=s.retired;
  life.money.pension=0;
 }
}
function ensure(life){
 if(!isJoseon(life))return null;
 W2.enrich(life);
 let s=life.joseon;
 if(!s){s=seedState(life);life.joseon=s;
  const names=NAMES[life.gender]||NAMES.남자;
  life.profile.name=names[Math.floor(roll(life.seed,1413)*names.length)];
  life.logEvent(s.region+'의 '+s.status+' 집안에서 태어났다. '+s.landmark+'이 가까운 고을이다.','joseon-birth');
  life.logEvent('신분과 집안 사정이 앞으로 만날 기회에 영향을 미친다. 하지만 삶의 모든 일이 정해진 것은 아니다.','joseon-life');
 }
 sync(life,s);
 return s;
}
function note(life,s,text,kind='joseon-life'){
 life.logEvent(text,kind);
 if(kind==='joseon-memory'){s.memories.push(text);s.memories=s.memories.slice(-30);}
}
function promptFor(life,s){
 if(!s.active)return null;
 const kind=s.active.kind,canExam=life.gender==='남자'&&s.status==='양반'&&life.year<1894;
 const opt=(label,noteText,action,effects={})=>({label,note:noteText,action,effects,text:label});
 if(kind==='school')return {title:'글을 배울 수 있을까?',description:s.status+' 집안에서 '+s.region+'의 하루를 살아간다. 책을 배울지, 생업을 익힐지 생각할 때다.',options:[
  opt('글을 배울 길을 찾아본다',s.status==='양반'?'가문의 글공부와 서당':'지역의 배움이나 가족·이웃의 가르침','study',{knowledge:6,wealth:-3}),
  opt('집안의 일을 배우며 지낸다','생업을 일찍 익히고 가족을 돕는다','work',{bonds:4,wealth:4}),
  opt('일도 하며 틈틈이 글을 익힌다','시간은 적지만 두 길을 이어 간다','mixed',{knowledge:3,health:-2})]};
 if(kind==='vocation')return {title:'어떤 일로 살아갈까?',description:s.region+'의 생업과 집안의 처지를 생각한다.',options:[
  opt('농사와 땅을 돌본다','곡식과 날씨에 생활이 달려 있다','farm',{wealth:3}),
  opt('장터에서 물건을 팔거나 기술을 익힌다','수공업·장시에서 새로운 인연을 만난다','trade',{knowledge:3,bonds:3}),
  opt('집안일과 가족 돌봄을 맡는다','가까운 사람들의 살림을 지켜 간다','home',{bonds:7,health:-2})]};
 if(kind==='marriage')return {title:'혼인과 집안의 일',description:'당시에는 혼인에 집안의 뜻과 처지가 크게 작용했다. 자신의 형편에서 관계를 이어 갈 길을 생각한다.',options:[
  opt('혼인을 준비한다','가족 사이의 약속과 비용이 따른다','marry',{bonds:6,wealth:-5}),
  opt('지금은 가족과 함께 지낸다','집안의 생업과 돌봄을 이어 간다','kin',{bonds:4,wealth:4}),
  opt('새 거처에서 홀로 생업을 꾸린다','홀로 서는 기쁨과 어려움이 함께한다','independent',{happiness:4,health:-2})]};
 if(kind==='examination'){
  if(canExam)return {title:'과거에 도전할까?',description:'글을 익혔더라도 과거에 급제하는 일은 쉽지 않다. 신분·성별·학습 기회도 응시를 좌우했다.',options:[
   opt('과거 시험을 준비한다',s.studyYears>=3?'공부가 쌓였지만 결과는 알 수 없다':'학업 경험이 적어 합격이 어려울 수 있다','exam',{knowledge:5,wealth:-7}),
   opt('마을에서 글을 가르친다','서당과 가정에서 배움을 나눈다','teach',{bonds:5,wealth:3}),
   opt('집안의 다른 생업을 이어 간다','농사와 장터의 기회도 살핀다','practical',{wealth:5})]};
  return {title:'배움과 일의 길',description:life.gender==='여자'?'여성에게 관직 시험의 문은 닫혀 있었지만 글과 기술을 익히는 길까지 없었던 것은 아니다.':'출신 신분과 처지에 따라 관직 시험에 접근하기 어려웠다.',options:[
   opt('배운 글과 셈을 생업에 쓴다','기록과 셈이 도움이 되는 일을 한다','scribe',{knowledge:4,wealth:4}),
   opt('기술과 장사로 살림을 넓힌다','장시에서 기술·물건을 다룬다','trade',{wealth:6}),
   opt('아이들과 이웃에게 배움을 나눈다','집안이나 마을에서 가르친다','teach',{bonds:7})]};
 }
 if(kind==='household')return {title:'살림의 큰 갈림길',description:'가족의 생계와 자신이 할 수 있는 일을 돌아본다.',options:[
  opt('작은 땅을 가꾸거나 빌린다','흉년의 위험은 있지만 수확을 기대할 수 있다','land',{wealth:-4}),
  opt('장터 거래에 힘을 보탠다','새 거래처와 이웃을 만난다','market',{bonds:4,knowledge:2}),
  opt('집안 어른과 자녀를 돌본다','시간과 비용을 가족에게 쓴다','care',{bonds:8,wealth:-5})]};
 if(kind==='elder')return {title:'나이가 들어가는 날',description:'세월이 지나며 땅과 일, 자녀와 이웃이 중요해진다.',options:[
  opt('하던 일을 후대에 조금씩 맡긴다','가족에게 생업을 전한다','retire',{health:4,bonds:4}),
  opt('계속 일하며 살림을 유지한다','생활은 유지되지만 몸이 고될 수 있다','continue',{wealth:5,health:-4}),
  opt('아이와 이웃에게 기술을 알려 준다','배운 것과 기억을 남긴다','mentor',{knowledge:4,bonds:7})]};
 if(kind==='war')return {title:s.active.title+' · 갈림길',description:'전쟁으로 피란과 생업의 어려움이 닥쳤다. 어느 선택도 안전을 보장하지 않는다.',options:[
  opt('가족과 함께 피란을 떠난다','집과 땅을 두고 떠나지만 위험을 피하려 한다','flee',{health:3,wealth:-8}),
  opt('고향에 남아 살림을 지킨다','익숙한 터전을 지키지만 전란의 위험이 남는다','stay',{wealth:2,health:-8}),
  opt('이웃과 함께 피란처를 마련한다','서로 도우며 짐과 위험을 나눈다','together',{bonds:8,wealth:-5})]};
 return null;
}
const MILESTONES={8:'school',15:'vocation',19:'marriage',24:'examination',35:'household',58:'elder'};
function applyChoice(life,index){
 const s=ensure(life),p=promptFor(life,s);
 if(!s?.active||!p||!Number.isInteger(index)||index<0||index>=p.options.length)return false;
 const option=p.options[index],act=option.action,kind=s.active.kind;
 life.change(option.effects);
 if(act==='study'){s.studyYears+=3;s.literacy+=2;s.school='서당·가정에서 글공부 중';s.capital-=6;}
 if(act==='work'){s.occupation=s.birthStatus==='중인'?'관청 실무와 기술':'집안 생업';s.capital+=8;}
 if(act==='mixed'){s.studyYears+=1;s.literacy+=1;s.school='생업과 글공부를 함께 함';}
 if(act==='farm'){s.occupation='농사';s.land=Math.max(1,s.land);s.capital+=5;}
 if(act==='trade'||act==='market'){s.occupation='장사·수공업';s.capital+=6;}
 if(act==='home'||act==='kin'||act==='care'){s.occupation='집안 살림과 돌봄';s.household=Math.min(8,s.household+1);s.parentsSupported=true;}
 if(act==='marry'){s.married=true;s.capital-=10;note(life,s,'혼인을 치르고 함께할 가족이 늘었다.','joseon-family');}
 if(act==='independent'){s.capital-=5;s.relocations++;note(life,s,'가족의 집을 떠나 새 살림을 시작했다.','joseon-family');}
 if(act==='exam'){s.exams++;const chance=clamp(.04+s.studyYears*.055+s.literacy*.03,0,.42);
  if(life.rand()<chance){s.office=true;s.occupation='관직 생활';s.capital+=42;note(life,s,'과거에 급제하여 관직에 나아갔다.','joseon-career');}
  else note(life,s,'과거를 치렀지만 이번에는 급제하지 못했다.','joseon-career');}
 if(act==='teach'||act==='mentor'){s.occupation='마을에서 글과 기술을 가르치는 일';s.school='가르치며 배우는 생활';}
 if(act==='scribe'){s.occupation='글과 셈을 쓰는 생업';s.literacy+=1;}
 if(act==='practical'){s.occupation='농사와 집안 생업';s.capital+=4;}
 if(act==='land'){s.land+=1;s.capital-=12;s.occupation='농사';}
 if(act==='retire'){s.retired=true;s.occupation='가족에게 생업을 맡기고 지내는 삶';}
 if(act==='flee'){s.relocations++;s.land=Math.max(0,s.land-1);s.capital-=22;s.hardshipUntil=Math.max(s.hardshipUntil,life.year+2);}
 if(act==='stay'){s.capital-=11;s.hardshipUntil=Math.max(s.hardshipUntil,life.year+3);}
 if(act==='together'){s.capital-=13;s.relocations++;s.household=Math.min(8,s.household+1);s.hardshipUntil=Math.max(s.hardshipUntil,life.year+2);}
 s.capital=clamp(s.capital,-120,600);
 s.decisions.push({year:life.year,age:life.age,kind,action:act});
 s.decisions=s.decisions.slice(-40);
 note(life,s,p.title+' — '+option.label,'joseon-choice');
 s.followups.push({year:life.year+3,text:'예전에 '+option.label+'고 선택했던 일이 오늘의 살림과 가족관계에도 남아 있다.'});
 s.followups=s.followups.slice(-20);
 s.active=null;life.pending=null;sync(life,s);
 return true;
}
function yearly(life){
 const s=ensure(life);
 if(!s||!life.alive||life.pending)return false;
 life.age++;life.year++;s.processedYear=life.year;
 if(life.focus==='learning'&&life.age>=8&&life.age<70){s.literacy+=life.age%4===0?1:0;life.change({knowledge:1});}
 if(life.focus==='people')life.change({bonds:1});
 if(life.focus==='health')life.change({health:1});
 if(life.focus==='work'&&life.age>=12)life.change({wealth:1,health:-1});
 if(life.age<16)life.change({health:life.rand()<.18?-1:0});
 if(life.age>44)life.change({health:life.age>68?-2:life.age%2===0?-1:0});
 if(life.age===12)note(life,s,'집안 형편과 신분에 따라 글공부·농사·기술을 배울 기회가 달랐다.','joseon-life');
 if(s.studyYears&&life.age>=9&&life.age<=24&&life.year>s.educationPausedUntil){s.studyYears++;if(life.age%4===0)s.literacy++;}
 let income=0,expense=0;
 if(life.age>=12){
  const production=s.retired?5:s.office?26:s.occupation.includes('장사')?19:s.occupation.includes('글')?13:s.occupation.includes('돌봄')?9:12+s.land*3;
  const hardship=life.year<=s.hardshipUntil?.55:1;
  income=Math.round(production*hardship*(.75+life.rand()*.55));
  expense=9+Math.round(s.household*2)+(s.married?2:0)+(s.children*2)+Math.max(0,s.land);
  if(life.year<1894&&s.status==='상민')expense+=3;
  if(life.year===1750&&life.gender==='남자'&&s.status==='상민')expense=Math.max(0,expense-2);
  s.capital=clamp(s.capital+income-expense,-120,600);
  if(s.capital<-25&&life.age%5===0)life.change({health:-2,happiness:-3});
  if(s.capital>180&&life.age%6===0)life.change({happiness:2});
 }
 if(life.money){
  life.money.income=income*100;life.money.expense=expense*100;
  life.money.lastBalance=(income-expense)*100;life.money.netWorth=Math.round(s.capital*100);
 }
 if(s.married&&s.children===0&&life.age>=22&&life.age<=38&&roll(life.seed,life.year+191)<.12){
  s.children=1;s.household=Math.min(8,s.household+1);
  note(life,s,'아이가 태어나 식구가 늘었다. 살림의 기쁨과 부담이 함께 커졌다.','joseon-family');
 }
 if(s.children>0&&life.age===42)note(life,s,'자녀가 자라며 집안의 일과 배움을 다음 세대에 전하게 되었다.','joseon-family');
 if(life.age===55&&s.parentsSupported)note(life,s,'젊은 시절 집안 어른을 돌보았던 시간이 떠올랐다.','joseon-family');
 const due=s.followups.filter(f=>f.year===life.year);
 s.followups=s.followups.filter(f=>f.year>life.year);
 for(const f of due)note(life,s,f.text,'joseon-followup');
 const event=eventFor(life.year);
 if(event&&!s.seen.includes(event.year)){
  s.seen.push(event.year);note(life,s,event.year+'년 · '+event.title+' — '+event.detail,'history');
  if(event.kind==='war'||event.kind==='unrest'){
   const involved=event.kind==='war'&&(event.year!==1627||['평안도','황해도','경기도','한양'].includes(s.region))||
    event.kind==='unrest'&&(event.year!==1811||s.region==='평안도');
   if(involved){
    s.warMemory.push(event.title);s.warMemory=s.warMemory.slice(-8);
    s.hardshipUntil=Math.max(s.hardshipUntil,life.year+3);
    s.educationPausedUntil=Math.max(s.educationPausedUntil,life.year+2);
    s.capital=clamp(s.capital-(s.region==='경상도'&&event.year===1592?29:18),-120,600);
    life.change({health:-5,happiness:-6,wealth:-8,bonds:-2});
    note(life,s,'전란과 소요로 생업과 배움이 흔들렸다. 여파가 앞으로도 이어질 수 있다.','joseon-memory');
    if(life.age>=7&&life.age<=75&&event.kind==='war'){
     s.active={id:event.year+'-war',kind:'war',title:event.title};life.pending='joseon:'+s.active.id;
    }
   }
  }else if(event.kind==='reform'){
   s.status='법적 신분제 폐지';note(life,s,'법에서 신분을 구분하던 제도가 폐지되었다. 그러나 오래된 차별은 곧바로 사라지지 않았다.','joseon-memory');
  }else if(event.kind==='tax'){
   if(event.year===1608&&s.region==='경기도'||event.year===1750&&s.birthStatus==='상민'){
    s.capital+=6;note(life,s,'새로운 조세 제도에 대한 소식이 집안의 부담을 다시 생각하게 했다.','joseon-memory');
   }
  }else if(event.kind==='learning'){
   note(life,s,'새로운 학문과 기록에 관한 소식이 고을에 전해졌다.','joseon-memory');
  }
 }
 if(!life.pending&&MILESTONES[life.age]){const kind=MILESTONES[life.age];s.active={id:life.year+'-'+kind,kind};life.pending='joseon:'+s.active.id;}
 if(life.age===50||life.age===70)note(life,s,'살아온 날을 돌아보며 가족과 이웃의 모습을 생각했다.','joseon-life');
 sync(life,s);
 life.stats.wealth=clamp(Math.round(40+s.capital*.11),0,96);
 // Fictional gameplay hazard, not a historical life table.
 const risk=life.age<=5?.024:life.age<45?.002:life.age<60?.009:life.age<75?.035:life.age<90?.11:.27;
 if(life.age>=108||life.stats.health===0||life.rand()<risk+(life.stats.health<19?.03:0)){
  life.finish('오랜 세월을 지나 한 사람의 삶이 끝났다.');s.active=null;
 }
 return true;
}
function summary(life){
 const s=ensure(life);if(!s)return null;
 return {era:era(life.year),region:s.region,status:life.year>=1894?s.birthStatus+' 출신 (법적 신분제 폐지)':s.status,
  occupation:s.occupation,school:s.school,literacy:s.literacy,land:s.land,capital:s.capital,
  married:s.married,children:s.children,relocations:s.relocations,office:s.office,
  decisions:s.decisions.length,warMemory:s.warMemory.slice(),memories:s.memories.slice(-3)};
}
function hydrate(life,data){
 if(!isJoseon(life))return null;
 const fresh=ensure(life),old=data?.joseon;
 if(!old||old.version!==1)return fresh;
 // Only take an allow-listed state; do not trust arbitrary saved object keys.
 for(const k of ['region','landmark','settlement','birthStatus','status','family','occupation','school'])
  if(typeof old[k]==='string')fresh[k]=old[k].slice(0,70);
 for(const k of ['land','capital','literacy','studyYears','exams','children','household','relocations','hardshipUntil','educationPausedUntil','processedYear'])
  if(Number.isInteger(old[k]))fresh[k]=clamp(old[k],k==='capital'?-120:0,k==='processedYear'||k.endsWith('Until')?life.year:1000);
 for(const k of ['office','married','parentsSupported','retired'])fresh[k]=old[k]===true;
 for(const k of ['seen','warMemory','memories','decisions','followups']){
  if(Array.isArray(old[k]))fresh[k]=old[k].slice(-40).filter(x=>x!==null&&['string','number','object'].includes(typeof x));
 }
 if(old.active&&typeof old.active.id==='string'&&['school','vocation','marriage','examination','household','elder','war'].includes(old.active.kind)&&life.alive){
  fresh.active={id:old.active.id.slice(0,45),kind:old.active.kind,title:String(old.active.title||'').slice(0,90)};
  life.pending='joseon:'+fresh.active.id;
 }
 sync(life,fresh);return fresh;
}
function paint(canvas,life){
 if(!inOldEra(life)||!canvas?.getContext)return false;
 const ctx=canvas.getContext('2d');if(!ctx)return false;
 const w=canvas.width||640,h=canvas.height||300;
 ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#a9c8bc';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#789b89';ctx.beginPath();ctx.moveTo(0,h*.56);ctx.lineTo(w*.16,h*.25);ctx.lineTo(w*.37,h*.54);ctx.lineTo(w*.66,h*.27);ctx.lineTo(w,h*.53);ctx.fill();
 ctx.fillStyle='#c2a77d';ctx.fillRect(0,h*.60,w,h*.40);
 ctx.fillStyle='#8b6a48';
 for(let i=0;i<4;i++){const x=i*(w/3)-w*.12,y=h*.7+(i%2)*h*.03;
  ctx.fillStyle='#ead9b3';ctx.fillRect(x,y,w*.24,h*.22);
  ctx.fillStyle='#504d4a';ctx.beginPath();ctx.moveTo(x-w*.03,y);ctx.lineTo(x+w*.12,y-h*.14);ctx.lineTo(x+w*.27,y);ctx.closePath();ctx.fill();
  ctx.fillStyle='#765b3f';ctx.fillRect(x+w*.095,y+h*.10,w*.05,h*.12);
 }
 ctx.fillStyle='#51765c';for(let i=0;i<6;i++){const x=(i+.2)*w/6;ctx.fillRect(x,h*.78,w*.015,h*.13);}
 return true;
}
function install(){
 if(!Sim?.Life||!W2?.enrich||Sim.Life.prototype.__joseon)return false;
 const L=Sim.Life,originalTick=L.prototype.tick,originalChoose=L.prototype.choose,
  originalGetChoice=L.prototype.getChoice,originalSnapshot=L.prototype.snapshot,originalRestore=L.restore;
 L.prototype.tick=function(){
  if(!inOldEra(this))return originalTick.call(this);
  return yearly(this);
 };
 L.prototype.getChoice=function(){
  if(isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon:'))
   return promptFor(this,ensure(this));
  return originalGetChoice.call(this);
 };
 L.prototype.choose=function(index){
  if(isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon:'))
   return applyChoice(this,index);
  return originalChoose.call(this,index);
 };
 L.prototype.snapshot=function(){
  const data=originalSnapshot.call(this);
  if(isJoseon(this))data.joseon=JSON.parse(JSON.stringify(ensure(this)));
  return data;
 };
 L.restore=function(data){
  const life=originalRestore.call(this,data);
  if(life&&isJoseon(life))hydrate(life,data);
  return life;
 };
 Object.defineProperty(L.prototype,'__joseon',{value:true});
 return true;
}
install();
return Object.freeze({install,isJoseon,inOldEra,ensure,yearly,summary,eventFor,era,promptFor,applyChoice,paint,EVENTS,REGIONS});
});