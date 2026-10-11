/* Life v6 pixel scene overlays. Every scene uses a distinct palette and prop layout. */
(function(root,factory){const x=factory(root?.OneLifeScene,root?.OneLifeCareers6);
 if(typeof module!=='undefined'&&module.exports)module.exports=x;if(root)root.OneLifeScenes6=x;
})(typeof window!=='undefined'?window:null,function(Base,C){
'use strict';
const names={
home:'집과 가족',classroom:'학교 교실',campus:'대학교',library:'도서관',laboratory:'연구실',
clinic:'진료소',hospital:'병원',rehab:'재활 공간',computers:'개발실',workshop:'정비 작업장',
factory:'공장',construction:'건설 현장',farm:'농장',orchard:'과수원',forest:'숲',
harbor:'항구',stage:'공연장',gallery:'미술관',studio:'녹음실',stadium:'경기장',gym:'체육관',
market:'시장',bakery:'빵집',restaurant:'식당',cafe:'카페',townhall:'주민센터',
street:'도시 거리',airport:'공항',temple:'수행 공간',community:'마을 모임',
retirement:'노년의 집',shelter:'임시 보호시설'
};
const palettes=['#7fadbd','#d7bb8a','#9eb7d6','#bed9ba','#8bacbb','#abd1b5','#dcb7ae','#b4c9d7',
'#8eb5cb','#c5b6a0','#aaafac','#d1aa91','#b5c98e','#c1d69b','#8eae91','#92c5c3',
'#d6adc9','#e5c3a9','#b5b0d4','#a5c6bf','#dbc8a0','#d6b9a1','#e9c8a3','#d9b89b',
'#c6b49e','#c3d6d1','#b6bccc','#c6d4dc','#d7c49f','#acceb2','#d8cbbc','#aabccc'];
const groups={
book:'classroom,campus,library',med:'clinic,hospital,rehab',work:'computers,workshop,factory,construction',
nature:'farm,orchard,forest,harbor',art:'stage,gallery,studio',sport:'stadium,gym',
shop:'market,bakery,restaurant,cafe',public:'townhall,street,airport,temple,community,shelter',
house:'home,retirement'
};
const sceneGroup=id=>Object.keys(groups).find(k=>groups[k].split(',').includes(id))||'house';
function paint(canvas,life){
 if(!Base?.paint||!life)return '';
 Base.paint(canvas,life);
 const age=life.age,p=life.profile||{};
 const id=age<7?'home':age<20?(life.world?.educationYears<5?'community':'classroom')
  :age>=65&&life.money.retired===true?'retirement'
  :(life.world6?.scene||'street');
 const key=Object.hasOwn(names,id)?id:'street',kind=sceneGroup(key),i=Object.keys(names).indexOf(key);
 const ctx=canvas.getContext('2d');if(!ctx)return key;
 const box=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
 const accent=palettes[i],deep='#34515d',light='#fff7e6';
 // Change the centerpiece into a recognisable set, not merely a caption.
 box(213,67,152,78,accent);box(217,70,144,9,deep);
 box(220,88,137,48,'#ecf2e6');
 if(kind==='book'){
   for(let j=0;j<5;j++){box(235+j*22,95,17,30,'#bbd6be');box(235+j*22,101,5,24,['#d7ad7e','#80b8bb','#aca5ce'][j%3]);}
   box(237,130,99,6,deep);
 }else if(kind==='med'){
   box(262,92,42,45,'#f9faf8');box(280,92,8,33,'#bf7973');box(269,104,28,7,'#bf7973');
   box(235,130,20,7,'#7cb4ad');box(326,128,24,7,'#7cb4ad');
 }else if(kind==='work'){
   for(let j=0;j<3;j++){box(229+j*40,98,32,24,'#7899ac');box(234+j*40,103,22,12,'#d6e2d8');box(239+j*40,126,20,5,deep);}
   box(239,138,96,5,'#b28265');
 }else if(kind==='nature'){
   for(let j=0;j<4;j++){box(229+j*32,128,27,10,'#83a881');box(239+j*32,111,7,20,'#776e53');box(228+j*32,100,28,15,'#539377');}
   box(221,140,137,6,'#95b9ad');
 }else if(kind==='art'){
   box(232,95,110,47,'#a47892');
   for(let j=0;j<3;j++){box(242+j*30,105,20,24,['#eac18e','#b8d4d1','#dab8c5'][j]);box(249+j*30,113,8,8,'#8c779c');}
   box(235,138,101,4,deep);
 }else if(kind==='sport'){
   box(226,104,128,34,'#83b38b');for(let j=0;j<4;j++)box(230+j*31,114,25,2,'#f2edcf');
   box(240,100,3,40,light);box(329,100,3,40,light);
 }else if(kind==='shop'){
   box(230,94,117,16,'#cb796a');for(let j=0;j<6;j++)box(233+j*19,94,11,16,'#f6dfad');
   box(236,113,100,25,'#8dc1be');box(259,123,56,5,'#e8d9be');
 }else if(kind==='public'){
   box(236,96,97,34,'#b8cfc9');box(246,102,24,19,'#fff4d5');box(292,102,24,19,'#fff4d5');
   box(263,129,43,14,deep);
 }else{
   box(235,98,106,42,'#ead7b6');box(249,102,27,21,'#9fbfbd');box(304,104,20,36,'#a6786b');
 }
 // Scene-specific emblem on the foreground. A new scene cannot look identical.
 const motif=i%6;
 if(motif===0){box(396,155,12,33,'#735d4e');box(386,147,32,19,'#77a67a');}
 if(motif===1){box(396,167,47,15,'#bd8e75');box(402,150,7,19,deep);box(429,150,7,19,deep);}
 if(motif===2){box(396,154,48,7,deep);box(401,161,6,21,'#8e9791');box(435,161,6,21,'#8e9791');}
 if(motif===3){box(398,157,43,30,'#f1e0bc');box(406,165,27,12,'#78b2b1');}
 if(motif===4){box(402,143,15,42,'#957667');box(394,134,31,17,accent);}
 if(motif===5){box(392,160,50,22,'#8dafa3');box(398,165,36,8,'#d4e4db');}
 box(211,66,155,20,'#294a55');
 ctx.textAlign='left';ctx.font='bold 12px sans-serif';ctx.fillStyle=light;ctx.fillText(names[key],222,80);
 return key;
}
return Object.freeze({paint,names,sceneGroup});
});