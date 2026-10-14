/* Joseon scene polish: crisp pixel forms, period silhouettes, and age-aware figures. */
(function(root){
'use strict';
const api={
 paint(canvas,life){
  if(!canvas||!life)return false;
  const ctx=canvas.getContext('2d');if(!ctx)return false;
  const W=600,H=258;
  if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
  ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);
  const j=window.OneLifeJoseon?.ensure?.(life)||life.joseon||{};
  const v=window.OneLifeJoseon2?.ensure?.(life)||life.joseon2||{};
  const kind=window.OneLifeJoseon3?.zone?.(life)||'farm';
  const season=window.OneLifeJoseon3?.season?.(life)||'가을';
  const year=life.year||life.birthYear||1480,age=life.age||0;
  const origin=life.joseon5?.origin||j.birthStatus||life.familyLevel||'상민';
  const elite=/양반|왕실|관직/.test(String(origin));
  const colors={
   봄:{sky:'#c8e4d9',mountain:'#93b5a8',hill:'#769b82',field:'#aac38f',leaf:'#56866b',gold:'#e2c574'},
   여름:{sky:'#b9ddd9',mountain:'#81a6a2',hill:'#658d75',field:'#91b977',leaf:'#477b5c',gold:'#e2c574'},
   가을:{sky:'#f0dfc2',mountain:'#b7b39b',hill:'#8e9b75',field:'#c6b277',leaf:'#ad8650',gold:'#e2bd67'},
   겨울:{sky:'#d1e0e4',mountain:'#a6b9bd',hill:'#91a6a5',field:'#d3d7cb',leaf:'#718e82',gold:'#e2bd67'}
  }[season];
  const px=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const steppedHill=(cx,top,color)=>{
   for(let row=0;row<13;row++){const half=18+row*10;px(cx-half,top+row*4,half*2,4,color);}
  };
  px(0,0,W,H,colors.sky);
  // Quiet stepped clouds and distant ridgelines keep the scene readable at small sizes.
  for(const [x,y] of [[54,30],[300,46],[475,27]]){
   px(x+12,y,36,6,'#f1f0dc');px(x,y+6,62,6,'#f1f0dc');px(x+8,y+12,48,4,'#e5ecdf');
  }
  px(500,24,24,24,season==='겨울'?'#f5f2de':'#f5d98e');
  steppedHill(80,91,colors.mountain);steppedHill(298,78,colors.hill);steppedHill(525,96,colors.mountain);
  // Layered tree canopy with uneven crowns; trunks remain visible as pixel forms.
  const tree=(x,base,shade,small)=>{
   const u=small?0.72:1;
   px(x-3*u,base-37*u,7*u,39*u,'#655b48');
   px(x-15*u,base-53*u,29*u,20*u,shade);
   px(x-11*u,base-64*u,21*u,16*u,shade);
   px(x-21*u,base-47*u,12*u,15*u,shade);
   px(x+10*u,base-45*u,12*u,13*u,shade);
   px(x-7*u,base-56*u,7*u,4*u,'#94ad7b');
  };
  tree(45,185,colors.leaf,true);tree(84,175,colors.leaf,false);
  tree(535,180,colors.leaf,false);tree(578,188,colors.leaf,true);
  // Village ground and a winding earth path.
  px(0,164,600,94,season==='겨울'?'#d2d2c4':'#b6b17f');
  px(0,172,600,4,'#9aa77d');px(0,211,600,4,'#aa956e');
  for(let i=0;i<10;i++){px(314+i*27,194+(i%3)*9,18,5,'#d0bf94');}
  // Field furrows, rice bundles, and a small fence make the rural scene legible.
  if(kind==='farm'||kind==='mountain'){
   for(let row=0;row<3;row++){
    const y=222+row*11;px(0,y,600,3,season==='겨울'?'#b7c3b9':'#9c865c');
    for(let x=12+(row%2)*14;x<600;x+=36){
     px(x,y-6,3,7,colors.leaf);if(season==='가을')px(x+3,y-5,4,4,colors.gold);
    }
   }
   for(let x=376;x<590;x+=40){px(x,166,4,23,'#79694d');px(x-4,170,12,4,'#79694d');}
   px(414,218,42,10,'#cfb56f');px(421,211,27,7,'#e0c77f');
  }
  if(kind==='port'){
   px(0,172,600,86,'#78aeb0');for(let y=183;y<256;y+=20)for(let x=12+(y%3)*24;x<590;x+=72)px(x,y,35,3,'#c0ded3');
   px(52,205,118,10,'#745844');px(64,195,91,8,'#927253');px(113,130,5,65,'#5d5547');px(118,139,40,43,'#eadbb9');
  }
  // A compact Joseon house with real eaves, wooden posts, lattice and either thatch or tile.
  const hx=119,hy=119,hw=174,hh=76;
  px(hx-5,hy-4,hw+10,hh+8,'#65594b');
  px(hx,hy,hw,hh,'#e6d5b4');
  px(hx+8,hy+13,hw-16,4,'#d1bc95');
  for(let x=hx+12;x<hx+hw-5;x+=48)px(x,hy+12,5,hh-10,'#866d50');
  const tiled=elite&&Number(j.capital||0)>45;
  if(tiled){
   px(hx-15,hy-20,hw+30,8,'#484f54');px(hx-10,hy-28,hw+20,8,'#4b5257');
   for(let x=hx-10;x<hx+hw+10;x+=12){px(x,hy-26,4,5,'#788185');px(x+4,hy-18,4,5,'#778084');}
   px(hx-21,hy-13,hw+42,5,'#3e474b');
  }else{
   px(hx-13,hy-19,hw+26,8,'#a78b53');px(hx-8,hy-27,hw+16,8,'#b89e64');
   for(let x=hx-8;x<hx+hw+8;x+=16)px(x,hy-17,8,4,'#d0b579');
   px(hx-18,hy-11,hw+36,5,'#8b754a');
  }
  // Door and paper lattice windows.
  px(hx+20,hy+35,29,40,'#715943');px(hx+25,hy+40,19,35,'#9d8060');
  for(const x of [hx+70,hx+117]){
   px(x,hy+28,31,23,'#8b7153');px(x+3,hy+31,25,17,'#e9e2cc');
   px(x+14,hy+31,3,17,'#8b7153');px(x+3,hy+38,25,3,'#8b7153');
  }
  // A short raised porch and stone stepping blocks.
  px(hx+15,hy+74,146,6,'#806b51');for(let x=120;x<265;x+=28)px(x,hy+82,16,5,'#8f8065');
  if(kind==='study'){
   // Small seodang marker: open book and low writing desk.
   px(326,143,119,48,'#d7c29d');px(319,135,133,8,'#8d704e');px(342,153,87,5,'#795d43');
   px(367,141,22,13,'#eee8d8');px(389,141,22,13,'#ded5c1');px(387,142,3,12,'#765f4a');
  }else if(kind==='market'){
   px(326,159,96,8,'#8e6648');px(332,167,6,26,'#705a43');px(407,167,6,26,'#705a43');
   for(let i=0;i<4;i++)px(336+i*18,148,14,10,i%2?'#bd7957':'#d7b46b');
  }else if(kind==='mountain'){
   px(326,144,13,48,'#725f48');px(318,141,28,8,'#8f7753');px(332,136,7,8,'#a88d62');
  }
  // Age-shaped hanbok sprites; clothes and headwear signal age and social position.
  const sprite=(x,ground,personAge,sex,childColor,adultColor,offset)=>{
   const child=personAge<8,teen=personAge<16&&!child,elder=personAge>=62;
   const s=personAge<3?0.54:personAge<8?0.66:personAge<13?0.78:teen?0.88:1;
   const head=child?17:teen?16:15,body=child?21:25,robe=child?24:teen?28:32;
   const skin='#d5a47f',hair=elder?'#6d6460':'#34363a';
   const X=n=>Math.round(x+n*s),Y=n=>Math.round(ground+n*s),R=(a,b,c,d,col)=>px(X(a),Y(b),Math.max(2,Math.round(c*s)),Math.max(2,Math.round(d*s)),col);
   // Face and hair/head covering.
   R(-head/2,-64,head,head,skin);R(-head/2,-67,head,6,hair);
   R(-head/2-1,-57,4,6,hair);R(head/2-3,-57,4,6,hair);
   if(!child&&sex==='남자'){
    R(-head/2-7,-68,head+14,4,elite?'#292d31':'#54493f');
    R(-3,-79,6,12,elite?'#292d31':'#51473f');
    if(elite){R(-4,-83,8,5,'#30363a');}
   }else if(!child&&sex==='여자'){
    R(-3,-70,10,8,hair);R(-7,-68,4,5,'#bd9256');
   }
   // Short jeogori over a distinctly wider skirt/robe.
   R(-10,-48,20,18,adultColor);R(-13,-45,6,12,adultColor);R(7,-45,6,12,adultColor);
   R(-robe/2,-31,robe,25,child?childColor:adultColor);
   R(-robe/2,-20,robe,4,offset);R(-2,-47,4,14,'#eee0c4');
   if(elder){R(-robe/2-3,-30,4,22,'#8c8175');}
   // Arms, legs and small period-specific work props.
   R(-robe/2+2,-7,5,12,'#4f4944');R(robe/2-7,-7,5,12,'#4f4944');
   if(kind==='farm'&&personAge>10){R(18,-46,3,36,'#765e43');R(13,-48,13,4,'#765e43');}
   if(kind==='study'&&personAge>5){R(16,-48,16,12,'#eee7d5');R(29,-47,3,10,'#665443');}
   if(kind==='market'){R(18,-36,12,14,'#b78854');R(19,-39,10,3,'#745c42');}
   if(kind==='port'&&personAge>10){R(18,-42,3,28,'#6e5a43');R(12,-43,14,3,'#6e5a43');}
   if(kind==='mountain'){R(-24,-50,5,32,'#785f41');R(-28,-53,12,4,'#8e7450');}
   // Small eyes only when the face can support them without clutter.
   R(-4,-59,2,2,'#403a36');R(3,-59,2,2,'#403a36');
  };
  const adultTone=elite?'#536d86':/중인|기술|장인/.test(String(origin))?'#66866e':'#a87556';
  const trim=elite?'#b9a16e':'#c6aa73';
  if(age<16){
   sprite(342,243,age,life.gender,'#d4b96f',adultTone,trim);
   sprite(286,243,Math.min(48,age+29),'여자','#d4b96f',elite?'#8c6a74':'#927366',trim);
   sprite(394,243,Math.min(50,age+37),'남자','#d4b96f',elite?'#506b82':'#86674f',trim);
  }else{
   sprite(357,243,age,life.gender,'#d4b96f',adultTone,trim);
   if((j.married||j.children>0)&&age<90)sprite(410,243,Math.max(18,age-2),life.gender==='여자'?'남자':'여자','#d4b96f',elite?'#7b6b7b':'#6c8c7a',trim);
   if(j.children>0&&age<90)sprite(306,243,Math.min(12,age-28),'여자','#d4b96f','#b47f5c',trim);
  }
  // Shared palette bar and fine border echo the mint-and-warm UI without a heavy frame.
  px(0,0,600,3,'#6da99b');px(0,255,600,3,'#6da99b');
  return true;
 }
};
root.OneLifeJoseonPixel2=Object.freeze(api);
})(typeof window!=='undefined'?window:null);
