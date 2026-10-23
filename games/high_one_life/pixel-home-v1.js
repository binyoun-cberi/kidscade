/* One Life pixel homepage: original procedural era portraits, no external assets.
 * Crisp at all sizes, deterministic, reduced-motion safe and offline friendly.
 */
(function(root){
 'use strict';
 const scenes=Object.freeze(['goryeo','joseon','colonial','modern']);
 const palette={
  goryeo:{sky:'#b8d8c6',high:'#dee3be',mid:'#7ca99b',hill:'#517f7c',land:'#93a66c',floor:'#7a8656'},
  joseon:{sky:'#f0c9a2',high:'#f7e1bb',mid:'#a1b7a4',hill:'#749f95',land:'#b5ba81',floor:'#a2a16b'},
  colonial:{sky:'#a9b9ba',high:'#d9c5b0',mid:'#9fa4a5',hill:'#697f8b',land:'#b19b80',floor:'#93826d'},
  modern:{sky:'#a5daca',high:'#def0db',mid:'#91aab9',hill:'#5c91a0',land:'#aec5a1',floor:'#7c9e8b'}
 };
 const p=(g,x,y,w,h,color)=>{if(w<=0||h<=0)return;g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const hline=(g,y,c)=>p(g,0,y,112,1,c);
 function sun(g,cx,cy,r,fill){
  for(let y=-r;y<=r;y++){const half=Math.floor(Math.sqrt(r*r-y*y));p(g,cx-half,cy+y,half*2+1,1,fill);}
 }
 function mountain(g,high,color){
  for(let x=0;x<112;x+=2){const y=high-Math.round((Math.sin(x*.12)+.5*Math.sin(x*.22+1.5))*9);
   p(g,x,y,2,129-y,color);}
 }
 function sky(g,c,era){
  p(g,0,0,112,170,c.sky);
  for(let y=0;y<98;y+=4)p(g,0,y,112,2,y<34?c.high+'33':c.sky);
  sun(g,era==='joseon'?85:era==='colonial'?27:78,30,era==='colonial'?10:14,era==='colonial'?'#f3dfbf':'#ffedbd');
  p(g,10,26,15,2,'#ffffff7b');p(g,17,29,20,2,'#ffffff7b');
  p(g,49,51,23,2,'#ffffff85');p(g,55,54,13,2,'#ffffff85');
  mountain(g,105,c.mid);
  mountain(g,123,c.hill);
 }
 function tinyBird(g,x,y){p(g,x,y,2,1,'#526965');p(g,x+3,y+1,2,1,'#526965');p(g,x+6,y,2,1,'#526965');}
 function house(g,x,y,wall,roof,trim){
  p(g,x,y+12,34,23,wall);
  p(g,x-7,y+10,48,4,roof);p(g,x-3,y+7,40,3,roof);p(g,x+4,y+4,25,3,trim);
  p(g,x+4,y+17,8,18,trim);p(g,x+23,y+18,6,6,trim);
  p(g,x,y+27,34,2,'#394f4b64');
 }
 function windowGrid(g,x,y,w,h){
  p(g,x,y,w,h,'#456873');
  for(let yy=y+3;yy<y+h-1;yy+=6)for(let xx=x+3;xx<x+w-1;xx+=6)
   p(g,xx,yy,3,4,(xx+yy)%3===0?'#f0d6a0':'#dce7cf');
 }
 function world(g,id){
  const c=palette[id];sky(g,c,id);
  if(id==='goryeo'){
   // Tile-roofed workshop, hillside temple silhouette and rice paddies.
   house(g,9,84,'#decb9c','#425b62','#966f54');
   p(g,82,64,7,58,'#677e6e');p(g,79,71,13,4,'#415854');p(g,77,66,17,5,'#435a53');
   p(g,74,90,23,4,'#435a53');p(g,79,87,13,4,'#c3ae80');
   for(let y=129;y<170;y+=9){p(g,0,y,112,3,y%2?'#9cae75':'#789360');for(let x=2;x<112;x+=15)p(g,x+(y%8),y+3,5,2,'#d1ba71');}
   p(g,0,149,112,21,'#877a5b');
  }else if(id==='joseon'){
   house(g,5,80,'#f0e1bb','#42595d','#bc795a');
   p(g,72,77,35,35,'#eee0c1');p(g,68,76,42,5,'#42595d');p(g,71,72,36,4,'#2d4c56');
   p(g,80,89,14,24,'#997760');p(g,82,89,3,24,'#594d44');p(g,91,89,3,24,'#594d44');
   p(g,0,125,112,45,'#aaab7c');
   for(let x=0;x<112;x+=12){p(g,x,129,3,7,'#687b5d');p(g,x,136,12,2,'#c5bf8b');}
   p(g,0,150,112,20,'#ac9475');
  }else if(id==='colonial'){
   p(g,5,81,32,45,'#ac9687');p(g,3,77,36,5,'#554e50');
   p(g,14,93,7,10,'#ded6bc');p(g,25,93,7,10,'#d2d5bb');
   p(g,72,60,37,66,'#a9a7a0');p(g,71,57,39,6,'#54656f');
   for(let y=65;y<119;y+=11){for(let x=77;x<106;x+=11)windowGrid(g,x,y,7,7);}
   p(g,0,128,112,42,'#9f927f');p(g,0,145,112,4,'#6f746f');
   for(let x=5;x<112;x+=24)p(g,x,152,13,2,'#cfbd99');
   p(g,57,88,2,48,'#4e5f62');p(g,54,87,7,3,'#4e5f62');tinyBird(g,22,54);
  }else {
   p(g,0,87,32,47,'#7eb2ac');p(g,4,79,18,55,'#60949c');
   p(g,36,67,32,68,'#91a6b4');p(g,74,56,35,79,'#bfd3c2');
   for(let y=75;y<132;y+=11){for(let x=42;x<66;x+=11)windowGrid(g,x,y,7,8);}
   for(let y=64;y<129;y+=12){for(let x=80;x<105;x+=12)windowGrid(g,x,y,7,8);}
   p(g,0,133,112,37,'#b1c8a2');p(g,0,146,112,24,'#8aa394');
   p(g,8,120,3,22,'#53695f');p(g,2,118,14,5,'#5c996c');p(g,17,116,12,4,'#68aa78');
   p(g,0,152,112,8,'#e6d5b3');p(g,0,160,112,10,'#82998b');
   tinyBird(g,25,46);
  }
 }
 const skin=['#dfab85','#a96952','#f0c2a0','#ba856e'];
 function person(g,x,foot,kind,variant=0){
  const s=skin[variant%skin.length],edge='#31434b',hair=variant%2?'#373537':'#292f35';
  const suit={
   farmer:['#527c76','#d4c695','#7c8363'],
   officer:['#42667b','#aac0b3','#2c454a'],
   scholar:['#547185','#f1e8d0','#293f47'],
   woman:['#bb6f75','#d7a6a9','#6a455b'],
   worker:['#777167','#c9b9a0','#515458'],
   student:['#516476','#e6dbc7','#2d3d4a'],
   modern:['#486e80','#c6c9c2','#2e4a5f'],
   pupil:['#d79d60','#aed3cb','#445c78']
  }[kind]||['#597d7f','#ccc','#345'];
  const [robe,highlight,shadow]=suit;
  // Shadow, shoes and two individually articulated legs.
  p(g,x-12,foot,25,2,'#53695c7a');
  p(g,x-8,foot-16,6,15,edge);p(g,x+2,foot-16,6,15,edge);
  p(g,x-9,foot-2,8,3,'#494342');p(g,x+1,foot-2,9,3,'#494342');
  const skirt=kind==='woman'||kind==='scholar'||kind==='officer'||kind==='farmer';
  const bodyTop=foot-54;
  if(skirt){
   for(let n=0;n<8;n++){
    const w=17+n*2;
    p(g,x-Math.floor(w/2),foot-34+n*2,w,2,n%3===0?highlight:robe);
   }
   p(g,x-9,bodyTop+9,18,22,robe);p(g,x-8,bodyTop+8,16,4,highlight);
  }else{
   p(g,x-9,bodyTop+8,18,35,robe);
   p(g,x-7,bodyTop+11,14,2,highlight);
   p(g,x-3,bodyTop+12,6,22,shadow);
  }
  // Arms hold tools, books or a bag depending on their work.
  p(g,x-13,bodyTop+13,5,23,robe);p(g,x+9,bodyTop+13,5,23,robe);
  p(g,x-13,bodyTop+32,5,5,s);p(g,x+9,bodyTop+32,5,5,s);
  // Neck and pixel head.
  p(g,x-3,bodyTop+5,6,7,s);
  p(g,x-8,bodyTop-11,16,17,edge);
  p(g,x-7,bodyTop-11,14,15,s);
  p(g,x-6,bodyTop-13,12,5,hair);
  p(g,x-4,bodyTop-1,2,1,'#513e39');
  p(g,x+3,bodyTop-1,2,1,'#513e39');
  p(g,x+1,bodyTop+3,3,1,'#af7965');
  if(kind==='farmer'){
   p(g,x-11,bodyTop-14,22,3,'#a38555');
   p(g,x-7,bodyTop-19,14,6,'#ddc68b');p(g,x-5,bodyTop-21,10,2,'#b69a68');
   p(g,x+14,bodyTop+12,2,47,'#644b37');
   p(g,x+11,bodyTop+48,10,3,'#644b37');
  }
  if(kind==='officer'||kind==='scholar'){
   p(g,x-12,bodyTop-16,24,3,'#283941');p(g,x-7,bodyTop-23,14,8,'#293942');
   p(g,x-6,bodyTop-19,12,2,'#4c6065');p(g,x-12,bodyTop-14,2,17,'#303a3e');
   if(kind==='scholar'){p(g,x+9,bodyTop+25,13,12,'#cdb98e');p(g,x+9,bodyTop+27,13,1,'#7e6c53');}
  }
  if(kind==='woman'){
   p(g,x-7,bodyTop-13,14,7,hair);
   p(g,x-11,bodyTop-16,5,5,hair);
   p(g,x-12,bodyTop+10,23,5,highlight);
   p(g,x-2,bodyTop+7,4,7,'#eed2b2');
  }
  if(kind==='worker'){
   p(g,x-10,bodyTop-16,20,5,'#4e565d');p(g,x-6,bodyTop-20,14,6,'#65747c');
   p(g,x+11,bodyTop+20,9,16,'#836746');
   p(g,x+11,bodyTop+19,11,2,'#bea27a');
  }
  if(kind==='student'){
   p(g,x-9,bodyTop-15,18,7,hair);
   p(g,x-3,bodyTop+13,6,6,'#f0e8d1');
   p(g,x+11,bodyTop+23,11,10,'#7a694f');p(g,x+12,bodyTop+21,9,2,'#c4a171');
  }
  if(kind==='modern'){
   p(g,x-8,bodyTop-15,16,5,hair);
   p(g,x-3,bodyTop+10,7,11,'#e8e1d4');
   p(g,x-1,bodyTop+12,3,10,'#bc7964');
   p(g,x+13,bodyTop+22,9,11,'#74685c');
  }
  if(kind==='pupil'){
   p(g,x-9,bodyTop-16,18,6,hair);
   p(g,x-13,bodyTop+14,5,22,'#678cac');
   p(g,x-12,bodyTop+18,3,17,'#e3b26f');
   p(g,x+11,bodyTop+12,7,26,'#596e97');
  }
  // Highlight at the hems and cuffs makes characters readable when scaled down.
  p(g,x-5,foot-24,5,2,highlight);
  p(g,x-12,bodyTop+17,3,2,highlight);
 }
 function details(g,id){
  // Foreground texture creates depth and distinguishes each everyday setting.
  if(id==='goryeo'){
   for(let x=0;x<112;x+=13){p(g,x+2,161,3,4,'#b6a167');p(g,x+6,165,3,2,'#7a7953');}
  }else if(id==='joseon'){
   for(let x=4;x<112;x+=18){p(g,x,164,4,2,'#705f54');p(g,x+7,158,2,3,'#efe1ab');}
  }else if(id==='colonial'){
   p(g,0,165,112,4,'#726f67');for(let x=8;x<112;x+=15)p(g,x,168,8,2,'#d7cab0');
  }else{
   for(let x=4;x<112;x+=17){p(g,x,166,5,2,'#d5e3c0');p(g,x+7,160,2,3,'#5a8779');}
  }
 }
 function paint(canvas,id){
  if(!canvas||!scenes.includes(id)||typeof canvas.getContext!=='function')return false;
  const g=canvas.getContext('2d');if(!g)return false;
  g.imageSmoothingEnabled=false;g.clearRect(0,0,112,170);
  world(g,id);
  const members={
   goryeo:[['farmer',32,154,0],['officer',79,153,2]],
   joseon:[['scholar',34,153,2],['woman',80,152,0]],
   colonial:[['worker',33,155,1],['student',79,155,2]],
   modern:[['modern',34,154,3],['pupil',78,155,2]]
  }[id];
  for(const [kind,x,y,skinIndex] of members)person(g,x,y,kind,skinIndex);
  details(g,id);
  return true;
 }
 function paintAll(doc){
  const target=doc||root.document;
  if(!target?.querySelectorAll)return 0;
  let n=0;for(const canvas of target.querySelectorAll('canvas[data-home-scene]')){
   if(paint(canvas,canvas.dataset.homeScene))n++;
  }
  return n;
 }
 root.OneLifePixelHome=Object.freeze({paint,paintAll,scenes});
 if(root.document)paintAll(root.document);
})(typeof window!=='undefined'?window:globalThis);
