/* Joseon scene polish: crisp pixel forms, period silhouettes, and age-aware figures. */
(function(root){
'use strict';
function scene(life){
 const j=root.OneLifeJoseon?.ensure?.(life)||life.joseon||{};
 const away=life.joseon14?.captivity?.status==='held';
 const kind=away?'away':root.OneLifeJoseon3?.zone?.(life)||'farm';
 const year=life.year??life.birthYear,origin=life.joseon5?.origin||j.birthStatus||'상민';
 const home=away?{kind:'small-thatch',roof:'thatch',label:'타향의 임시 거처'}:root.OneLifeJoseonCulture?.household(life,{joseon:j,origin,scene:kind,role:j.occupation});
 const missing=new Set((life.joseon13?.missing||[]).filter(p=>p.status==='missing').map(p=>p.personId));
 const family=away?[]:(root.OneLifeJoseon4?.ensure?.(life)?.people||life.joseon4?.people||[]).filter(p=>p.alive&&p.atHome!==false&&!p.missing&&!missing.has(p.id)&&p.birthYear<=year);
 const people=[{id:'self',name:life.profile?.name||'나',age:Math.max(0,life.age||0),sex:life.gender,self:true},...family.map(p=>({id:p.id,name:p.name,age:Math.max(0,year-p.birthYear),sex:p.sex,role:p.role,self:false}))];
 return {kind,home,people,away,householdCount:people.length};
}
function layout(plan){
 // Shared ground coordinates: yard 220..444 in a port, 110..444 elsewhere.
 // A person's feet determine depth; distant people are smaller than foreground people.
 const places=[[342,239],[238,219],[420,225],[286,239],[386,245]];
 return plan.people.slice(0,5).map((p,i)=>{
  const [x,ground]=places[i],depth=.54+(ground-216)*.006;
  const ageScale=p.age<3?.54:p.age<8?.66:p.age<13?.78:p.age<16?.88:1;
  return {...p,x,ground,depth,scale:ageScale*depth};
 }).sort((a,b)=>a.ground-b.ground);
}
const api={scene,layout,
 paint(canvas,life){
  if(!canvas||!life)return false;
  const ctx=canvas.getContext('2d');if(!ctx)return false;
  const W=600,H=258;
  if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
  ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);
  const j=window.OneLifeJoseon?.ensure?.(life)||life.joseon||{};
  const v=window.OneLifeJoseon2?.ensure?.(life)||life.joseon2||{};
  const Culture=window.OneLifeJoseonCulture;
  const plan=scene(life),kind=plan.kind;
  const season=window.OneLifeJoseon3?.season?.(life)||'가을';
  const year=life.year||life.birthYear||1480,age=life.age||0;
  const origin=life.joseon5?.origin||j.birthStatus||life.familyLevel||'상민';
  const elite=/양반|왕실|관직|대감|종친/.test(String(origin));
  const home=plan.home||{kind:elite?'tile':'thatch',roof:elite?'tile':'thatch'};
  const wear=Culture?.wardrobe(year,origin,life.gender,life.joseon6?.primary?.name||j.occupation,life.age);
  canvas.setAttribute?.('aria-label',(home.label||'집')+' · '+(plan.away?'타향에 있는 주인공의 모습':plan.householdCount+'명의 식구 중 '+plan.people.slice(0,5).map(p=>p.name+' '+p.age+'세').join(', '))+' · 주인공은 금빛 표식');
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
    const y=222+row*11;px(0,y,106,3,season==='겨울'?'#b7c3b9':'#9c865c');
    for(let x=12+(row%2)*14;x<106;x+=36){
     px(x,y-6,3,7,colors.leaf);if(season==='가을')px(x+3,y-5,4,4,colors.gold);
    }
   }
   // Fields stop at the yard; the family never stands on the furrows.
   for(let row=0;row<3;row++){const y=222+row*11;px(455,y,145,3,'#9c865c');for(let x=466;x<600;x+=36)px(x,y-6,3,7,colors.leaf);}
   for(let x=476;x<590;x+=40){px(x,166,4,23,'#79694d');px(x-4,170,12,4,'#79694d');}
   px(503,218,42,10,'#cfb56f');px(510,211,27,7,'#e0c77f');
  }
  if(kind==='port'){
   px(0,205,220,53,'#78aeb0');for(let y=215;y<256;y+=20)for(let x=12+(y%3)*24;x<190;x+=72)px(x,y,35,3,'#c0ded3');
   px(52,219,118,10,'#745844');px(64,209,91,8,'#927253');px(113,130,5,65,'#5d5547');px(118,139,40,43,'#eadbb9');
  }
  // A compact Joseon house with real eaves, wooden posts, lattice and either thatch or tile.
  const hx=119,hy=119,hw=home.kind==='small-thatch'?132:174,hh=76;
  px(110,204,334,50,season==='겨울'?'#e0ded0':'#d6c49f');
  px(111,247,333,6,'#c4af88');
  // Earthenware jars and stacked firewood belong beside the house.
  for(let i=0;i<3;i++){px(130+i*15,205,12,11,'#76533e');px(132+i*15,202,8,4,'#5d4739');}
  px(190,204,34,9,'#9b7851');for(let i=0;i<4;i++)px(192+i*8,204,3,8,'#c0a477');
  px(hx-5,hy-4,hw+10,hh+8,'#65594b');
  px(hx,hy,hw,hh,home.kind==='palace'?'#bd7658':'#e6d5b4');
  px(hx+8,hy+13,hw-16,4,home.kind==='palace'?'#6c8c68':'#d1bc95');
  for(let x=hx+12;x<hx+hw-5;x+=48)px(x,hy+12,5,hh-10,'#866d50');
  const tiled=home.roof==='tile';
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
  for(const x of (hw<150?[hx+70]:[hx+70,hx+117])){
   px(x,hy+28,31,23,'#8b7153');px(x+3,hy+31,25,17,'#e9e2cc');
   px(x+14,hy+31,3,17,'#8b7153');px(x+3,hy+38,25,3,'#8b7153');
  }
  if(home.kind==='estate'||home.kind==='palace'){
   // A separate wing makes the courtyard home distinct from a single-room cottage.
   px(365,140,102,55,home.kind==='palace'?'#bd7658':'#e6d5b4');
   px(353,132,126,8,'#484f54');px(361,125,110,7,'#596168');
   for(let x=375;x<463;x+=38){px(x,151,25,25,'#8b7153');px(x+3,154,19,19,'#e9e2cc');px(x+11,154,3,19,'#8b7153');}
   px(363,195,108,6,'#806b51');
  }
  // A short raised porch and stone stepping blocks.
  px(hx+15,hy+74,hw-28,6,'#806b51');for(let x=120;x<265;x+=28)px(x,hy+82,16,5,'#8f8065');
  if(kind==='study'){
   // Small seodang marker: open book and low writing desk.
   px(326,143,119,48,'#d7c29d');px(319,135,133,8,'#8d704e');px(342,153,87,5,'#795d43');
   px(367,141,22,13,'#eee8d8');px(389,141,22,13,'#ded5c1');px(387,142,3,12,'#765f4a');
  }else if(kind==='market'){
   px(326,159,96,8,'#8e6648');px(332,167,6,26,'#705a43');px(407,167,6,26,'#705a43');
   for(let i=0;i<4;i++)px(336+i*18,148,14,10,i%2?'#bd7957':'#d7b46b');
  }else if(kind==='mountain'){
   // A woodpile at the forest edge, away from the family's walking space.
   px(479,188,52,13,'#806345');for(let i=0;i<5;i++)px(482+i*10,185,7,5,'#b09568');
   px(486,179,34,7,'#997c54');
  }
  // Age-shaped hanbok sprites; clothes and headwear signal age and social position.
  const sprite=(x,ground,personAge,sex,childColor,adultColor,offset,self=false,depth=.68)=>{
   const personalWear=Culture?.wardrobe(year,origin,sex,self?j.occupation:'집안의 일',personAge,{duty:self&&(kind==='study'||kind==='port')});
   adultColor=personalWear?.color||adultColor;offset=personalWear?.accent||offset;
   px(x-14*depth,ground+2,28*depth,3,'#b5a385');
   const child=personAge<8,teen=personAge<16&&!child,elder=personAge>=62;
   const s=(personAge<3?0.54:personAge<8?0.66:personAge<13?0.78:teen?0.88:1)*depth;
   const head=child?17:teen?16:15,body=child?21:25,robe=child?24:teen?28:32;
   const skin='#d5a47f',hair=elder?'#6d6460':'#34363a';
   const X=n=>Math.round(x+n*s),Y=n=>Math.round(ground+n*s),R=(a,b,c,d,col)=>px(X(a),Y(b),Math.max(2,Math.round(c*s)),Math.max(2,Math.round(d*s)),col);
   // Face and hair/head covering.
   R(-head/2,-64,head,head,skin);R(-head/2,-67,head,6,hair);
   R(-head/2-1,-57,4,6,hair);R(head/2-3,-57,4,6,hair);
   const headwear=personalWear?.headwear||(personAge>=16?(sex==='여자'?'hair':'cloth'):'none');
   if(headwear==='samo'){
    R(-9,-74,18,10,'#30353b');R(-20,-70,11,4,'#30353b');R(9,-70,11,4,'#30353b');
   }else if(headwear==='gat'||headwear==='jeonrip'){
    const span=personalWear?.hatSpan||14;
    R(-span,-69,span*2,4,'#343b3e');R(-6,-80,12,11,'#3d4445');
   }else if(headwear==='cloth'){R(-9,-68,18,5,'#b9ad91');R(8,-65,5,9,'#b9ad91');}
   else if(headwear==='hair'){R(-3,-70,10,8,hair);R(-7,-68,4,5,'#9b7d50');}
   // Short jeogori over a distinctly wider skirt/robe.
   const blouse=sex==='여자'&&personalWear?personalWear.jeogori:18;
   R(-10,-48,20,blouse,adultColor);R(-13,-45,6,12,adultColor);R(7,-45,6,12,adultColor);
   if(personAge<3){R(-12,-40,24,34,'#e7dac0');R(-10,-30,20,4,offset);}
   else if(sex==='여자'){const waist=-48+blouse-2;R(-robe/2+3,waist,robe-6,-6-waist,child?childColor:adultColor);R(-robe/2,waist+8,robe,-14-waist,child?childColor:adultColor);}
   else {R(-12,-31,11,25,adultColor);R(2,-31,11,25,adultColor);}
   if(sex==='여자'&&personAge>=3)R(-robe/2,-20,robe,4,offset);R(-2,-47,4,14,'#eee0c4');
   if(elder){R(-robe/2-3,-30,4,22,'#8c8175');}
   if(personalWear?.robe){
    R(-15,-45,30,38,adultColor);R(-19,-42,9,18,adultColor);R(10,-42,9,18,adultColor);
    R(-2,-46,4,32,'#e4d9c3');
    if(personalWear.style==='official'){
     // Round collar, waist belt and lateral-wing hat; no invented rank badge.
     R(-5,-47,10,5,'#e4d9c3');R(-15,-23,30,4,'#4a4035');
    }else if(personalWear.style==='cheollik'){
     R(-15,-30,30,3,'#4e5356');for(let n=-12;n<14;n+=5)R(n,-27,2,19,'#526779');
    }else if(personalWear.style==='late-military'){
     R(-11,-44,22,35,'#3f5057');R(-15,-27,30,4,'#b8a06d');
    }
   }
   // A family member handles a household basket; young children keep their hands free.
   if(!self&&personAge>=16){
    R(8,-39,12,5,adultColor);R(17,-38,4,8,skin);
    R(14,-29,15,12,'#b48c55');R(16,-33,11,4,'#765d40');
   }else if(personAge>=3&&personAge<13){
    R(-16,-39,9,5,adultColor);R(-19,-39,4,4,skin);
   }
   // Arms, legs and small period-specific work props.
   R(-robe/2+2,-7,5,12,'#4f4944');R(robe/2-7,-7,5,12,'#4f4944');
   if(self&&kind==='farm'&&personAge>=16){R(18,-46,3,36,'#765e43');R(13,-48,13,4,'#765e43');}
   if(self&&kind==='study'&&personAge>5){R(16,-48,16,12,'#eee7d5');R(29,-47,3,10,'#665443');}
   if(self&&kind==='market'){R(18,-36,12,14,'#b78854');R(19,-39,10,3,'#745c42');}
   if(self&&kind==='port'&&personAge>=16){R(18,-42,3,28,'#6e5a43');R(12,-43,14,3,'#6e5a43');}
   if(self&&kind==='mountain'&&personAge>=16){R(-24,-50,5,32,'#785f41');R(-28,-53,12,4,'#8e7450');}
   if(self){const top=-88*s;px(x-4,ground+top,8,4,'#c78e38');px(x-2,ground+top-3,4,10,'#eec978');}
   // Small eyes only when the face can support them without clutter.
   R(-4,-59,2,2,'#403a36');R(3,-59,2,2,'#403a36');
  };
  const adultTone=wear?.color||(elite?'#536d86':/중인|기술|장인/.test(String(origin))?'#66866e':'#a87556');
  const trim=wear?.accent||(elite?'#b9a16e':'#c6aa73');
  // Draw only living, present household members, with their recorded ages and sex.
  // Keep a calm scene even for large households; the caption states the full count.
  for(const p of layout(plan)){
   sprite(p.x,p.ground,p.age,p.sex,'#d4b96f',adultTone,trim,p.self,p.depth);
  }
  // Shared palette bar and fine border echo the mint-and-warm UI without a heavy frame.
  px(0,0,600,3,'#6da99b');px(0,255,600,3,'#6da99b');
  return true;
 }
};
root.OneLifeJoseonPixel2=Object.freeze(api);
})(typeof window!=='undefined'?window:null);
