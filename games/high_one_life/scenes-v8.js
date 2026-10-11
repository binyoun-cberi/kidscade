/* v8 geographic dioramas: contextual accents layered on career scenes.
 * Country is not identity. Exact landscapes depend on city/rural seed too. */
(function(root,factory){const api=factory(root?.OneLifeScenes6,root?.OneLifeWorld8);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeScenes8=api;
})(typeof window!=='undefined'?window:null,function(Scenes,W8){
'use strict';
function paint(canvas,life){
 const title=Scenes.paint(canvas,life);if(!canvas||!life)return title;
 const ctx=canvas.getContext('2d');if(!ctx)return title;
 const d=W8.ensure(life),seed=life.seed,age=life.age,p=life.profile;
 const f=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)};
 const motif=(seed%7+7)%7,shade=d.tone;
 // Foreground peripheral scenery, so the animated career stage and character
 // remain unobstructed in the central scene.
 f(0,54,93,137,shade);f(477,58,123,134,shade);
 const windowColour='#edf6ed',wall='#e2d3b4',roof='#a86d5f',wood='#6d6958',plant='#799e7d';
 function house(x,form){
  f(x,119,75,69,form===1?'#d6bba5':wall);
  if(form===1){f(x-4,114,83,9,roof);}
  else if(form===2){f(x+7,102,62,21,'#92b6bc');f(x,121,75,6,'#d0c09c');}
  else{f(x+7,108,61,18,'#b57d6f');f(x-4,124,83,5,'#ece3cd');}
  f(x+11,139,18,23,windowColour);f(x+43,139,18,23,windowColour);
  f(x+32,165,13,23,wood);
 }
 const shape=d.region==='southAsia'||d.region==='northAfrica'||d.region==='middleEast'?2:
  d.region==='eastEurope'||d.region==='westernEurope'?1:0;
 if(p.settlement==='도시'){f(5,96,78,92,wall);f(496,104,91,84,'#c1d1cd');
  for(let j=0;j<3;j++){f(16+j*21,109,13,19,windowColour);f(510+j*24,116,13,21,windowColour);}
 }else{house(8,shape);house(497,shape);}
 if(['eastAfrica','westAfrica','centralSouthAfrica','latinAmerica','southAsia'].includes(d.region)){
  f(95,145,7,43,wood);f(82,137,31,12,plant);f(88,129,19,13,plant);
 }else if(['eastEurope','eastAsia','northAmerica','westernEurope'].includes(d.region)){
  f(94,145,7,43,wood);f(83,129,26,19,'#79a68e');
 }else{
  f(94,159,8,29,wood);f(85,151,24,13,plant);
 }
 if(d.region==='pacific'||life.country[0]==='모나코'||p.city==='몸바사'){
  f(486,197,114,9,'#8bc2c8');f(486,206,114,3,'#d2e7df');
 }
 if(motif===1||motif===4)f(109,167,25,15,'#8eaa8c');
 ctx.fillStyle='#264b50';ctx.font='bold 10px sans-serif';ctx.textAlign='left';
 ctx.fillText(p.settlement+' · '+life.country[0],10,49);
 return title;
}
return Object.freeze({paint,names:Scenes.names});
});