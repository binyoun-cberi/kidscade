/* One Life: Joseon v3. Everyday stories and location-aware pixel scenery.
 * Household actions are educational fiction, not individual historical records.
 * Load after joseon-v1 / joseon-v2; modern lives are left untouched.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon3=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=(seed,salt)=>{
 let x=((seed>>>0)^Math.imul(salt+31,0x9e3779b9))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);
 x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;
};
const SEASONS=['봄','여름','가을','겨울'];
const ageScenes=new Set([6,11,17,23,32,40,49,57,68,77]);
const CHOICE_AGES={12:'apprentice',27:'livelihood',41:'household',55:'neighbors',69:'legacy'};
function season(life){return SEASONS[Math.floor(hash(life.seed,life.year+380)*4)];}
function zone(life){
 const j=J.ensure(life);
 if(j.occupation.includes('관직')||j.occupation.includes('글')||j.occupation.includes('서당')||
   (j.studyYears>=4&&life.age<=26&&hash(life.seed,life.year+84)<.38))return 'study';
 // Coastal provinces alternate between inland livelihoods and reachable harbors.
 if(['경상도','전라도','황해도'].includes(j.region)&&
    (j.occupation.includes('운송')||hash(life.seed,life.year+77)<.38))return 'port';
 if(j.occupation.includes('장사')||j.occupation.includes('수공업')||j.region==='한양')return 'market';
 if(j.region==='강원도'||j.region==='함경도')return 'mountain';
 return 'farm';
}
const ZONE_LABEL={study:'서책을 읽는 마루',market:'장터와 골목',port:'포구의 바닷길',mountain:'산골짜기의 길',farm:'논밭과 마을'};
const DAILY={
 study:[
  '아침에 서책을 펴 놓았다. 글을 읽는 데에는 책뿐 아니라 시간과 여유도 필요했다.',
  '먹물을 갈고 글씨를 써 보았다. 아는 글자를 이웃에게 설명하는 일도 작은 배움이었다.',
  '낡은 책을 빌려 한 줄씩 읽었다. 서로 다른 사람에게 배움의 문이 같지는 않았다.'
 ],
 market:[
  '새벽 장터에 좌판이 하나둘 펼쳐졌다. 길에서 들은 소식으로 물건값이 달라지기도 했다.',
  '장날에 쓸 물건을 묶어 들고 길을 나섰다. 무게보다 사람들과의 약속이 더 부담스러울 때도 있었다.',
  '한쪽에서는 천을 고르고 다른 곳에서는 그릇을 흥정했다. 장터는 소식이 오가는 곳이기도 했다.'
 ],
 port:[
  '물때를 기다리며 포구에 서 있었다. 바다의 날씨가 물건과 사람의 이동을 결정했다.',
  '배에서 짐을 내리는 일을 거들었다. 포구의 일은 여러 사람의 손을 거쳐 마무리되었다.',
  '바닷바람을 맞으며 그물을 손질하는 이웃을 보았다. 오늘의 수확은 날씨를 따라 달라졌다.'
 ],
 mountain:[
  '좁은 산길을 따라 나무와 약초를 살폈다. 산골에서는 계절이 몸으로 먼저 다가왔다.',
  '이웃과 함께 언덕길을 넘었다. 짐을 나눠 들면 멀던 고개도 한결 가까워졌다.',
  '장작을 마련하고 낡은 울타리를 고쳤다. 겨울 전에 준비할 일이 끊이지 않았다.'
 ],
 farm:[
  '이른 아침 들녘에 나가 논밭을 둘러보았다. 풍년은 날씨와 노동에 달려 있었다.',
  '씨앗을 고르고 농기구를 손질했다. 한 해의 살림이 밭두렁에서 시작되었다.',
  '수확한 곡식을 가족과 나누어 정리했다. 겨울을 날 만큼 남길 수 있을지 다시 헤아렸다.'
 ]
};
const SEASON_DETAIL={
 봄:'마당의 새싹과 바쁜 봄일',
 여름:'더위와 비를 살피는 여름날',
 가을:'수확과 장터가 분주한 가을',
 겨울:'불을 지피고 먹을거리를 아끼는 겨울'
};
const EVENTS={
 apprentice:{
  title:'집안에서 배울 것',
  options:[
   ['가족의 생업을 배운다','곡식과 살림을 챙기며 손에 익힌다','hands',{knowledge:2,bonds:5}],
   ['글을 배울 방법을 찾아본다','가르쳐 줄 사람과 공부할 시간을 찾는다','letters',{knowledge:7,wealth:-2}],
   ['이웃에게 기술을 묻는다','낯선 일을 배우며 새로운 관계를 만든다','skill',{knowledge:5,bonds:3}]
  ]
 },
 livelihood:{
  title:'생업을 바꾸어 볼까?',
  options:[
   ['작은 밭과 도구를 가꾼다','돈과 시간을 들여 자급할 바탕을 만든다','field',{wealth:-4,health:-2}],
   ['다른 고을 장터에 물건을 내본다','익숙하지 않은 길에서 기회를 찾는다','route',{knowledge:4,wealth:-5}],
   ['오래 익힌 기술을 살려 일한다','현실적인 생계를 택하며 손끝의 기술을 쌓는다','craft',{knowledge:5,bonds:2}]
  ]
 },
 household:{
  title:'올겨울을 위한 준비',
  options:[
   ['곡식을 더 모아 둔다','당장 쓰는 돈이 줄어도 다음 해를 대비한다','store',{wealth:-4,happiness:2}],
   ['집과 농기구를 손본다','집과 도구를 고쳐 손실을 막는다','repair',{health:-1,knowledge:3}],
   ['친척과 이웃을 함께 챙긴다','먹을거리를 나누며 서로의 안부를 살핀다','share',{bonds:7,wealth:-3}]
  ]
 },
 neighbors:{
  title:'고을에서 부탁을 받았다',
  options:[
   ['아이와 이웃에게 배운 일을 알려 준다','시간을 들여 오래 쌓아 온 경험을 나눈다','teach',{knowledge:3,bonds:6}],
   ['함께 물길과 길을 정비한다','많은 손이 필요한 일에 힘을 보탠다','work',{health:-3,bonds:5}],
   ['집안의 생업과 몸을 우선 돌본다','공동체 일은 줄이고 지친 몸을 쉬게 한다','rest',{health:6,wealth:2}]
  ]
 },
 legacy:{
  title:'다음 세대에 남길 것',
  options:[
   ['가족에게 살림과 땅을 맡긴다','살아온 방식과 도구를 전한다','inherit',{bonds:7,health:3}],
   ['이웃에게 기술과 기억을 나눈다','경험을 함께 나누며 관계를 남긴다','mentor',{knowledge:3,bonds:7}],
   ['지금까지의 일을 글이나 말로 남긴다','배운 글이나 구술로 삶의 한 장면을 기억한다','memory',{happiness:6,knowledge:2}]
  ]
 }
};
function fresh(life){
 return {version:3,processedYear:life.year-1,memories:[],storiesSeen:[],
  decisions:[],followups:[],active:null,deferred:null,skill:0,
  kinship:50,craft:0,legacy:'',choiceCount:0};
}
function ensure(life){
 if(!J?.isJoseon(life))return null;
 return life.joseon3||(life.joseon3=fresh(life));
}
function log(life,s,text,kind='joseon3-life'){
 life.logEvent(text,kind);
 if(kind==='joseon3-memory')s.memories.push(text);
 if(s.memories.length>20)s.memories=s.memories.slice(-20);
}
function livedMoment(life,s){
 if(!ageScenes.has(life.age)||s.storiesSeen.includes(life.age))return;
 s.storiesSeen.push(life.age);
 const j=J.ensure(life),r=zone(life),se=season(life);
 const stories=DAILY[r],line=stories[Math.floor(hash(life.seed,life.age*73+809)*stories.length)];
 const lead=life.age<15?'어린 시절, ':life.age>=62?'나이가 들어, ':'그해 '+se+'에, ';
 const troubled=life.year<=j.hardshipUntil||life.year<=V2.ensure(life).scarcityUntil;
 log(life,s,lead+(troubled?'살림이 여의치 않았지만 ':'')+line,'joseon3-memory');
}
function offer(life,s,kind){
 const id=kind+'-'+life.year;
 if(s.decisions.some(d=>d.id===id)||s.active?.id===id||s.deferred?.id===id)return;
 const item={id,kind,year:life.year};
 if(life.pending){s.deferred=item;return;}
 s.active=item;life.pending='joseon3:'+id;
}
function promote(life,s){
 if(!s||!s.deferred||!J.inOldEra(life)||life.pending||!life.alive)return;
 const item=s.deferred;s.deferred=null;s.active=item;life.pending='joseon3:'+item.id;
}
function prompt(life){
 const s=ensure(life),q=s?.active,bank=q&&EVENTS[q.kind];
 if(!bank)return null;
 const j=J.ensure(life),social=life.joseon5;
 const bound=social&&['사노비','공노비'].includes(social.origin)&&!social.freed&&life.year<1894;
 if(bound)return {title:bank.title,description:social.originLabel+'의 처지에서는 이동과 생업을 마음대로 바꾸기 어렵다. 일터와 가족 사이에서 가능한 일을 생각한다.',options:[
  {label:'맡은 일터에서 경험을 쌓는다',note:'몸이 고되지만 일손을 보태며 기술을 배운다.',action:'hands',effects:{knowledge:2,health:-2}},
  {label:'동료에게 기술을 배우고 가르친다',note:'주변 사람과 경험을 나눈다.',action:'skill',effects:{knowledge:4,bonds:3}},
  {label:'몸과 가족을 돌본다',note:'잠시 숨을 돌리고 서로의 안부를 챙긴다.',action:'rest',effects:{health:4,bonds:3}}]};
 if(social?.origin==='왕실 종친')return {title:bank.title,description:'왕실 종친으로 살아가는 동안 권력과의 거리를 생각한다.',options:[
  {label:'왕실의 글과 예법을 배운다',note:'문서와 학문을 익힌다.',action:'letters',effects:{knowledge:4}},
  {label:'집안과 왕실의 일을 나누어 맡는다',note:'필요한 기술을 익힌다.',action:'skill',effects:{bonds:3}},
  {label:'소란에서 거리를 두고 몸을 돌본다',note:'정치적 위험을 피한다.',action:'rest',effects:{health:4}}]};
 const family=life.age>=41?(j.married?'식구가 늘어 서로 돌볼 일이 많다. ':'혼자 지내는 때도 이웃과 관계를 이어갈 수 있다. '):'';
 return {title:bank.title,description:j.region+'에서 '+j.occupation+' 일을 해 왔다. '+family+'무엇부터 할까?',
  options:bank.options.map(([label,note,action,effects])=>action==='share'&&V2.ensure(life).grain<12
    ?{label:'친척과 이웃의 일손을 돕는다',note:'나눌 곡식이 없어 대신 시간과 품을 보탠다',action:'shareLabor',effects:{bonds:5,health:-2}}
    :{label,note,action,effects})};
}
const OUTCOMES={
 hands:'집안에서 익힌 손기술이 바쁜 날에 도움이 되었다.',
 letters:'틈틈이 글공부를 이어 간 경험이 장부나 서책을 읽을 때 도움이 되었다.',
 skill:'이웃에게 배운 솜씨로 생활에 필요한 물건을 손질할 수 있었다.',
 field:'손수 가꾼 땅과 농기구가 다음 계절의 살림에 보탬이 되었다.',
 route:'장터에서 알게 된 사람들과 다시 물건을 거래할 기회가 생겼다.',
 craft:'꾸준히 익힌 솜씨 덕분에 고을 사람의 부탁을 받았다.',
 store:'예전에 아껴 둔 곡식이 살림이 어려운 때 도움이 되었다.',
 repair:'고쳐 놓은 집과 도구를 다시 쓸 수 있었다.',
 share:'어려울 때 곡식을 나누었던 이웃이 오늘은 집안일을 거들어 주었다.',
 shareLabor:'곡식 대신 일손을 보탰던 이웃이 그날의 일을 기억하고 있었다.',
 teach:'어린 이웃에게 알려 준 기술이 마을에서 이어지고 있었다.',
 work:'함께 손본 길을 걸으며 그날 도왔던 사람들이 떠올랐다.',
 rest:'몸을 돌보며 지낸 시간 덕분에 하던 일을 다시 할 힘을 찾았다.',
 inherit:'가족이 익숙하게 집안 살림을 돌보는 모습을 보았다.',
 mentor:'마을에서 한때 가르쳤던 일이 다른 사람의 삶에서도 이어졌다.',
 memory:'오래전 이야기를 기억하며 가족이나 이웃과 함께 웃을 수 있었다.'
};
function choose(life,index){
 const s=ensure(life),choice=prompt(life);
 if(!s?.active||!choice||!life.alive||!Number.isInteger(index)||index<0||index>=choice.options.length)return false;
 const opt=choice.options[index],j=J.ensure(life),w=V2.ensure(life),a=opt.action;
 life.change(opt.effects);
 if(a==='hands'){s.skill+=1;j.capital+=5;w.grain=clamp(w.grain+5,0,200);}
 if(a==='letters'){j.literacy+=1;j.studyYears+=2;j.school='일과 글공부를 병행함';j.capital-=5;}
 if(a==='skill'){s.skill+=2;s.craft+=1;s.kinship+=4;}
 if(a==='field'){j.land+=1;w.grain=clamp(w.grain+12,0,200);j.capital-=6;}
 if(a==='route'){j.occupation='장사·수공업';j.relocations+=1;s.skill+=1;j.capital+=7;}
 if(a==='craft'){s.craft+=2;s.skill+=1;j.capital+=5;}
 if(a==='store'){w.grain=clamp(w.grain+20,0,200);j.capital-=9;}
 if(a==='repair'){s.skill+=1;j.capital-=5;w.grain=clamp(w.grain+4,0,200);}
 if(a==='share'){if(w.grain<12)return false;w.grain-=12;w.community=clamp(w.community+10,0,100);w.helpGiven++;s.kinship+=8;}
 if(a==='shareLabor'){w.community=clamp(w.community+7,0,100);s.kinship+=6;}
 if(a==='teach'){s.kinship+=8;j.literacy+=1;}
 if(a==='work'){s.kinship+=7;w.community=clamp(w.community+7,0,100);}
 if(a==='rest'){j.capital+=3;}
 if(a==='inherit'){s.legacy='가족에게 생업을 전함';j.retired=true;s.kinship+=6;}
 if(a==='mentor'){s.legacy='이웃에게 기술을 전함';s.skill+=1;s.kinship+=8;}
 if(a==='memory'){s.legacy='지난날의 이야기를 남김';j.literacy+=1;s.kinship+=2;}
 s.kinship=clamp(s.kinship,0,100);j.capital=clamp(j.capital,-120,600);
 if(life.money)life.money.netWorth=Math.round(j.capital*100);
 const id=s.active.id;
 s.decisions.push({id,year:life.year,age:life.age,kind:s.active.kind,action:a,label:opt.label});
 s.decisions=s.decisions.slice(-35);s.choiceCount++;
 s.followups.push({id,year:life.year+3,action:a,text:OUTCOMES[a]});
 s.followups=s.followups.slice(-20);
 log(life,s,choice.title+' — '+opt.label,'joseon3-choice');life.log.at(-1).causeId='joseon3:'+id;
 s.active=null;life.pending=null;promote(life,s);
 return true;
}
function afterYear(life){
 const s=ensure(life);if(!s||!J.inOldEra(life)||!life.alive||s.processedYear===life.year)return;
 s.processedYear=life.year;
 const j=J.ensure(life),w=V2.ensure(life);
 if(life.age>=13&&life.age<=70&&s.skill>=2&&life.age%6===0){
  const bonus=Math.min(4,Math.floor(s.skill/2));j.capital=clamp(j.capital+bonus,-120,600);
 }
 for(const event of s.followups.filter(e=>e.year<=life.year)){
  log(life,s,event.text,'joseon3-followup');if(event.id)life.log.at(-1).causeId='joseon3:'+event.id;
  if(event.action==='store'){w.grain=clamp(w.grain+8,0,200);}
  if(['route','craft','field','hands'].includes(event.action))j.capital=clamp(j.capital+5,-120,600);
  if(['share','shareLabor','teach','mentor','work'].includes(event.action)){s.kinship=clamp(s.kinship+5,0,100);life.change({bonds:2});}
 }
 s.followups=s.followups.filter(e=>e.year>life.year);
 livedMoment(life,s);
 const kind=CHOICE_AGES[life.age];
 if(kind)offer(life,s,kind);
 if(life.money)life.money.netWorth=Math.round(j.capital*100);
 promote(life,s);
}
function summary(life){
 const s=ensure(life);if(!s)return null;
 return {season:season(life),scene:zone(life),sceneLabel:ZONE_LABEL[zone(life)],
  choices:s.choiceCount,skill:s.skill,kinship:s.kinship,craft:s.craft,legacy:s.legacy,
  memories:s.memories.slice(-3)};
}
// Deliberately canvas-only pixel art: no missing GLB/PNG assets, and no external fetch.
// The illustration is symbolic, not a historically reconstructed settlement.
function paint(canvas,life){
 if(!J.inOldEra(life)||!canvas?.getContext)return false;
 const ctx=canvas.getContext('2d');if(!ctx||typeof ctx.fillRect!=='function')return false;
 const w=canvas.width||600,h=canvas.height||258;
 const j=J.ensure(life),v=V2.ensure(life),se=season(life),kind=zone(life);
 const hardship=life.year<=j.hardshipUntil||life.year<=v.scarcityUntil;
 const colors={
  봄:{sky:'#b8dacc',far:'#86a9a0',hill:'#6c927c',ground:'#a6b77c',plant:'#4e8567',roof:'#505457'},
  여름:{sky:'#9fcac9',far:'#668f95',hill:'#4c8b6f',ground:'#86af68',plant:'#347651',roof:'#454b58'},
  가을:{sky:'#eed7ad',far:'#a6a48f',hill:'#9ca078',ground:'#c3b071',plant:'#ad8b41',roof:'#545253'},
  겨울:{sky:'#b8cbd6',far:'#8c9da9',hill:'#a9b8bd',ground:'#d0d3ce',plant:'#89978c',roof:'#5d626b'}
 };
 const p=colors[se];
 const rect=(x,y,width,height,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(width)),Math.max(1,Math.round(height)));};
 ctx.clearRect?.(0,0,w,h);
 const sx=w/600,sy=h/258;
 // Scale from a fixed pixel canvas using scene-space coordinates.
 ctx.save?.();ctx.scale?.(sx,sy);
 const d=(x,y,ww,hh,color)=>rect(x,y,ww,hh,color);
 d(0,0,600,258,p.sky);
 d(0,160,600,98,p.ground);
 // Sun or pale moon, modest block clouds.
 d(se==='겨울'?485:485,24,29,29,se==='겨울'?'#f5f3df':'#f8e6ae');
 for(let i=0;i<4;i++){const x=35+i*145+(Math.floor(hash(life.seed,i+life.year)*30));
  d(x,29+i%2*12,65,10,se==='가을'?'#f4e6ce':'#e7f0e9');
  d(x+13,21+i%2*12,35,10,se==='가을'?'#f4e6ce':'#e7f0e9');
 }
 // Distant terraced mountains.
 for(let k=0;k<3;k++){
  const center=60+k*240,top=76+(k%2)*19;
  for(let i=0;i<19;i++){
   const across=i*6;
   d(center-across,top+i*4,across*2+18,5,k%2?p.far:p.hill);
  }
 }
 if(se==='겨울')for(let i=0;i<45;i++){
  const x=Math.floor(hash(life.seed,life.year+i*9)*600),y=Math.floor(hash(life.seed+33,life.year+i*17)*213);
  d(x,y,3,3,'#eff4f3');
 }
 // Orchard / farmland stripes (except on waterfront).
 if(kind==='farm'||kind==='mountain'||kind==='study'){
  for(let y=177;y<257;y+=17){
   d(0,y,600,5,se==='겨울'?'#bcc6bc':'#977d54');
   for(let x=(y%34?8:24);x<600;x+=25){
    d(x,y+5,4,8,hardship?'#ad9a68':p.plant);
    if(se==='가을'&&!hardship)d(x+3,y+2,4,5,'#e5bd61');
   }
  }
 }
 if(kind==='port'){
  d(0,152,600,107,'#699ca3');for(let y=160;y<258;y+=24)
   for(let x=8;x<600;x+=55)d(x+(y%50),y,30,3,'#a5c6bd');
  d(0,207,600,12,'#6b584b');for(let x=20;x<600;x+=80)d(x,213,9,45,'#58483e');
  d(388,189,129,14,'#6f4e3b');d(404,181,96,9,'#907052');
  d(454,105,6,75,'#554738');d(460,120,52,55,'#eee0b5');d(412,128,38,45,'#c6b18c');
  for(let n=0;n<3;n++)d(110+n*22,203,20,18,'#a77e50');
 }
 if(kind==='market'){
  for(let i=0;i<4;i++){
   const x=16+i*147;
   d(x,128,114,75,i%2?'#dac79c':'#ecd3a8');
   d(x-9,118,133,12,p.roof);d(x+2,109,109,12,p.roof);
   d(x+15,151,84,8,i%2?'#b0654b':'#597f88');
   for(let k=0;k<4;k++)d(x+18+k*18,173,13,12,k%2?'#d8a65a':'#9c7a51');
  }
  d(0,229,600,29,'#b99e78');
 }
 if(kind==='mountain'){
  for(let i=0;i<12;i++){
   const x=10+i*54;
   d(x,128+(i%3)*8,12,71,'#6c6554');
   d(x-16,110+(i%3)*8,44,37,se==='가을'?'#b28a54':'#497c65');
   d(x-9,95+(i%3)*8,31,27,se==='겨울'?'#c4d2cf':'#578970');
  }
  d(0,213,600,45,'#a99977');
  for(let i=0;i<12;i++)d(60+i*44,211+(i%3)*7,26,6,'#7b775a');
 }
 if(kind==='study'){
  d(46,110,205,99,'#e2caa2');
  d(35,99,229,14,p.roof);d(56,89,185,11,p.roof);
  for(let i=0;i<5;i++){
   d(67+i*35,116,6,72,'#765943');
   d(73+i*35,127,26,6,'#765943');
   d(73+i*35,166,26,6,'#765943');
  }
  d(104,177,90,11,'#907052');d(126,167,46,11,'#ad855c');
  d(140,155,17,12,'#ebe4cf');d(156,154,7,8,'#655748');
 }
 // Household in other scenes; tile roofs for wealthier houses, straw below.
 if(kind==='farm'||kind==='mountain'||kind==='port'){
  const tile=j.birthStatus==='양반'&&j.capital>75;
  d(36,140,150,83,'#e1cfad');
  d(25,130,172,13,tile?'#444b50':'#aa925d');
  d(41,120,135,12,tile?'#55565b':'#c1a570');
  d(55,165,20,58,'#86694b');d(103,165,24,58,'#796046');
  d(137,169,35,27,'#9c896e');
  d(210,189,68,10,'#8f7350');
  d(217,177,54,10,'#c1aa7d');
 }
 // Foreground items identify the work with minimal silhouettes.
 if(kind==='farm'){
  for(let k=0;k<8;k++){d(290+k*29,190+k%2*5,4,40,'#7d6b44');d(282+k*29,185+k%2*5,18,10,p.plant);}
  d(400,211,60,14,hardship?'#9e927d':'#d9bd71');
 }
 if(kind==='study'){for(let i=0;i<3;i++)d(375+i*43,189,36,22,'#aa8460');}
 // People are symbolic sprites without gendered occupational restrictions.
 const person=(x,y,robe,small=false)=>{
  const z=small?0.77:1,px=(xx,yy,ww,hh,col)=>d(x+xx*z,y+yy*z,ww*z,hh*z,col);
  px(12,0,14,11,'#38383b');px(11,9,16,17,'#d7ae87');
  px(8,24,22,30,robe);px(5,27,6,22,robe);px(30,27,6,22,robe);
  px(11,54,7,16,'#564d4b');px(25,54,7,16,'#564d4b');
  if(j.birthStatus==='양반'&&!small){px(9,-7,20,8,'#46464b');px(5,-3,28,3,'#383c3b');}
 };
 person(320,179,j.birthStatus==='양반'?'#6d8a91':j.birthStatus==='중인'?'#8d8068':'#8c7266');
 person(485,195,'#be9b71',true);
 if(j.married||j.children>0)person(540,206,'#a37d6e',true);
 if(hardship){
  d(0,242,600,16,'#a58e79');
  for(let x=10;x<600;x+=57)d(x,224,25,3,'#a2866a');
 }
 if(ctx.restore)ctx.restore();
 return true;
}
function hydrate(life,data){
 const s=ensure(life),raw=data?.joseon3;
 if(!s||!raw||raw.version!==3)return s;
 const number=(key,limit)=>{if(Number.isInteger(raw[key]))s[key]=clamp(raw[key],0,limit);};
 for(const [key,limit] of [['processedYear',life.year],['skill',80],['craft',80],['kinship',100],['choiceCount',100]])
  number(key,limit);
 s.legacy=typeof raw.legacy==='string'?raw.legacy.slice(0,80):'';
 s.storiesSeen=Array.isArray(raw.storiesSeen)?raw.storiesSeen.filter(x=>Number.isInteger(x)&&x>=0&&x<=108).slice(-12):[];
 s.memories=Array.isArray(raw.memories)?raw.memories.filter(x=>typeof x==='string').slice(-20).map(x=>x.slice(0,200)):[];
 const allowed=new Set(Object.keys(EVENTS));
 const valid=q=>q&&typeof q.id==='string'&&allowed.has(q.kind)&&Number.isInteger(q.year)&&
   q.year>=life.birthYear&&q.year<=life.year;
 s.decisions=Array.isArray(raw.decisions)?raw.decisions.filter(d=>valid(d)&&typeof d.action==='string').slice(-35).map(d=>({
  id:d.id.slice(0,60),kind:d.kind,year:d.year,age:Number.isInteger(d.age)?d.age:0,action:d.action.slice(0,30),label:String(d.label||'').slice(0,85)
 })):[];
 s.followups=Array.isArray(raw.followups)?raw.followups.filter(f=>f&&typeof f.action==='string'&&OUTCOMES[f.action]&&
  Number.isInteger(f.year)&&f.year>life.year).slice(-20).map(f=>({
   id:String(f.id||'').slice(0,60),action:f.action,year:f.year,text:OUTCOMES[f.action]
  })):[];
 const decode=x=>valid(x)?{id:x.id.slice(0,60),kind:x.kind,year:x.year}:null;
 s.deferred=decode(raw.deferred);
 if(data?.pending===('joseon3:'+raw.active?.id)&&life.alive&&J.inOldEra(life)){
  s.active=decode(raw.active);
  if(s.active)life.pending='joseon3:'+s.active.id;
 }
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||Sim.Life.prototype.__joseon3)return false;
 const L=Sim.Life,tick=L.prototype.tick,chooseOld=L.prototype.choose,
  reflectOld=L.prototype.reflect,getChoiceOld=L.prototype.getChoice,
  snapshotOld=L.prototype.snapshot,restoreOld=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this))return tick.call(this);
  const year=this.year,ok=tick.call(this);
  if(ok&&this.alive&&this.year!==year)afterYear(this);
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon3:'))
   return prompt(this);
  return getChoiceOld.call(this);
 };
 L.prototype.choose=function(index){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon3:'))
   return choose(this,index);
  const ok=chooseOld.call(this,index);
  if(ok&&J.inOldEra(this))promote(this,ensure(this));
  return ok;
 };
 L.prototype.reflect=function(text){
  const ok=reflectOld.call(this,text);
  if(ok&&J.inOldEra(this))promote(this,ensure(this));
  return ok;
 };
 L.prototype.snapshot=function(){
  const save=snapshotOld.call(this);
  if(J.isJoseon(this))save.joseon3=JSON.parse(JSON.stringify(ensure(this)));
  return save;
 };
 L.restore=function(data){
  const life=restoreOld.call(this,data);
  if(life&&J.isJoseon(life))hydrate(life,data);
  return life;
 };
 Object.defineProperty(L.prototype,'__joseon3',{value:true});
 return true;
}
install();
return Object.freeze({install,ensure,summary,paint,season,zone,prompt,choose,afterYear,ageScenes,CHOICE_AGES});
});
