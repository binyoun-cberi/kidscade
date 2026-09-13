function blob(cx,cy,rx,ry,fill,stroke='#24211e',lw=3,seed=0){
  ctx.save();ctx.translate(cx,cy);ctx.beginPath();
  const pts=12;
  for(let i=0;i<=pts;i++){
    const a=i/pts*Math.PI*2;
    const wob=1+Math.sin(i*2.7+seed)*.07+Math.sin(i*1.3+seed*2)*.04;
    const x=Math.cos(a)*rx*wob,y=Math.sin(a)*ry*wob;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();ctx.restore();
}
function shadow(x,y,rx,ry=.22*rx){ctx.save();ctx.globalAlpha=.2;blob(x,y,rx,ry,'#1b2018','transparent',0);ctx.restore()}
function tree(x,y,s=1,variant=0){
  const sway=Math.sin(performance.now()/1200+x*.008)*1.2*s;
  const outline='rgba(79,67,55,.78)';
  shadow(x,y+56*s,34*s,11*s);
  ctx.save();ctx.translate(x,y);ctx.rotate(sway*Math.PI/180);

  ctx.fillStyle='#8b5d3f';ctx.strokeStyle=outline;ctx.lineWidth=3;
  ctx.beginPath();ctx.roundRect(-17*s,-2*s,34*s,76*s,14*s);ctx.fill();ctx.stroke();
  ctx.globalAlpha=.22;
  line(-6*s,6*s,-7*s,60*s,2.5*s,'#f3d2a2');
  line(5*s,14*s,6*s,63*s,2.2*s,'#6b442f');
  ctx.globalAlpha=1;

  line(-3*s,8*s,-28*s,-26*s,6*s,'#8b5d3f');
  line(2*s,5*s,31*s,-24*s,6*s,'#8b5d3f');

  const leaves=[
    [-34,-36,34,26,'#81c56f'],
    [0,-58,43,31,'#98d881'],
    [39,-36,31,25,'#78b966'],
    [-5,-26,38,24,'#8dce77']
  ];
  leaves.forEach(([lx,ly,rx,ry,color],i)=>blob(lx*s,ly*s,rx*s,ry*s,color,outline,2.6,variant+i*2));
  ctx.globalAlpha=.22;
  blob(-16*s,-55*s,13*s,8*s,'#ffffff','transparent',0,variant+11);
  blob(26*s,-36*s,11*s,7*s,'#dff6d3','transparent',0,variant+13);
  ctx.globalAlpha=1;
  ctx.restore();
}
function rock(x,y,s=1,color='#98a09a',ore=''){
  const outline='rgba(79,67,55,.75)';
  shadow(x,y+20*s,28*s,8*s);
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle=color;ctx.strokeStyle=outline;ctx.lineWidth=3;ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(-29*s,10*s);ctx.quadraticCurveTo(-34*s,-8*s,-10*s,-24*s);
  ctx.quadraticCurveTo(12*s,-28*s,29*s,-7*s);ctx.quadraticCurveTo(32*s,17*s,6*s,26*s);
  ctx.quadraticCurveTo(-18*s,28*s,-29*s,10*s);
  ctx.fill();ctx.stroke();
  ctx.globalAlpha=.28;ctx.fillStyle='#fff';
  ctx.beginPath();ctx.ellipse(-7*s,-8*s,9*s,5*s,-.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#354039';ctx.globalAlpha=.12;
  ctx.beginPath();ctx.ellipse(10*s,11*s,12*s,7*s,.2,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  const oreColor={coal:'#353736',copper:'#d98b5c',iron:'#dce3de'}[ore];
  if(oreColor){
    [[-11,-2,4],[10,-6,4],[14,10,5],[-3,12,3]].forEach(([dx,dy,r],i)=>blob(dx*s,dy*s,r*s,r*.78*s,oreColor,outline,1.6,i+1));
  }
  ctx.restore();
}
function cropIcon(x,y,p){
  if(!p.crop)return;
  const st=p.stage, s=.70+st*.14;
  ctx.save();ctx.translate(x,y);
  const leaf='#568f4d', leaf2='#7ab265';
  const wind=Math.sin(performance.now()/700+x*.02)*1.2;

  if(p.crop==='당근'){
    for(let i=-1;i<=1;i++){ctx.save();ctx.rotate((i*12+wind)*Math.PI/180);line(0,5,i*8*s,-20*s,4, i===0?leaf2:leaf);ctx.restore();}
    if(st>=2){blob(0,11,8*s,15*s,'#ed8930','#24211e',2,2);line(-3*s,6*s,3*s,18*s,1.4,'#c46825');}
  }else if(p.crop==='감자'){
    for(let i=-1;i<=1;i++) line(0,10,i*11*s,-14*s,4,i===0?leaf2:leaf);
    if(st>=2){blob(-8,11,8*s,7*s,'#b98a53','#24211e',2);blob(8,13,8*s,7*s,'#b98a53','#24211e',2,2);}
  }else if(p.crop==='양배추'){
    blob(0,3,14*s,13*s,'#78a963','#24211e',2,1);
    if(st>=1){blob(-7,3,10*s,9*s,'#99c77c','#24211e',2,3);blob(8,2,10*s,9*s,'#679655','#24211e',2,5);}
    if(st>=3)blob(1,0,8*s,8*s,'#b2d493','#24211e',1.5,4);
  }else{
    for(let i=-1;i<=1;i++) line(0,9,i*9*s,-18*s,4,i===0?leaf2:leaf);
    if(st>=2){blob(-8,2,5*s,6*s,'#d74d4f','#24211e',2);blob(8,7,5*s,6*s,'#d74d4f','#24211e',2,2);}
    if(st>=3)blob(0,-2,5*s,6*s,'#e35f61','#24211e',2,4);
  }
  if(p.pest){
    ctx.save();ctx.translate(21,-15);ctx.rotate(Math.sin(performance.now()/140)*.12);
    blob(0,0,7,5,'#5c7e39','#24211e',2);line(-3,-4,-8,-10,2);line(3,-4,8,-10,2);ctx.restore();
  }
  if(p.water===0){
    ctx.fillStyle='#65a9d8';ctx.strokeStyle='#24211e';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(-22,-23);ctx.quadraticCurveTo(-31,-11,-22,-7);ctx.quadraticCurveTo(-13,-11,-22,-23);ctx.fill();ctx.stroke();
  }
  ctx.restore();
}
function animal(x,y,type){
  const t=performance.now()/520;
  const idle=Math.sin(t+x*.02)*1.5;
  const outline='rgba(79,67,55,.8)';
  shadow(x,y+24,30,8);
  ctx.save();ctx.translate(x,y+idle);
  ctx.strokeStyle=outline;ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';

  if(type==='cow'){
    blob(-4,2,35,22,'#fbf6ec',outline,2.8,2);
    blob(30,-8,18,16,'#fbf6ec',outline,2.8,5);
    blob(-16,-3,10,8,'#6c584d',outline,1.8,1);
    blob(6,7,12,8,'#6c584d',outline,1.8,4);
    blob(26,-1,9,7,'#f1c1b4',outline,1.6,9);
    line(-18,18,-19,35,5,'#7b624f'); line(10,18,9,35,5,'#7b624f');
    line(33,-21,40,-28,2.6,'#7b624f'); line(24,-21,18,-28,2.6,'#7b624f');
    ctx.fillStyle='#4e443b';ctx.beginPath();ctx.arc(33,-10,2.4,0,7);ctx.fill();
    ctx.globalAlpha=.18;blob(-2,-2,12,7,'#fff','transparent',0,3);ctx.globalAlpha=1;
  }else if(type==='chicken'){
    blob(0,3,23,20,'#fffaf0',outline,2.8,2);
    blob(19,-11,13,13,'#fffaf0',outline,2.8,4);
    blob(-8,3,11,8,'#e7dfcf',outline,1.6,3);
    ctx.fillStyle='#e8b03e';ctx.beginPath();ctx.moveTo(30,-12);ctx.lineTo(42,-8);ctx.lineTo(30,-4);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#df5b4d';ctx.beginPath();ctx.arc(15,-24,5,0,7);ctx.arc(22,-24,5,0,7);ctx.fill();
    line(-8,18,-10,32,3.8,'#d39239'); line(8,18,9,32,3.8,'#d39239');
    line(-10,32,-17,34,2); line(9,32,16,34,2);
    ctx.fillStyle='#4e443b';ctx.beginPath();ctx.arc(21,-13,2,0,7);ctx.fill();
  }else{
    blob(0,2,34,22,'#f0a78f',outline,2.8,2);
    blob(30,-4,18,16,'#f0a78f',outline,2.8,5);
    blob(41,0,10,8,'#f6c0ae',outline,1.8,7);
    blob(21,-17,9,8,'#d98e79',outline,1.8,3);
    line(-16,19,-17,35,5,'#9f725d');line(11,19,12,35,5,'#9f725d');
    ctx.beginPath();ctx.arc(-32,0,9,.15,5.7);ctx.stroke();
    ctx.fillStyle='#4e443b';ctx.beginPath();ctx.arc(33,-7,2.2,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(39,-1,1.2,0,7);ctx.arc(45,-1,1.2,0,7);ctx.fill();
    ctx.globalAlpha=.22;ctx.fillStyle='#de7b7d';ctx.beginPath();ctx.arc(27,-1,3.7,0,7);ctx.fill();ctx.globalAlpha=1;
  }
  ctx.restore();
}
function house(x,y,s=1){
  const outline='rgba(79,67,55,.8)';
  shadow(x,y+72*s,82*s,15*s);
  ctx.save();

  ctx.fillStyle='#ffd9a8';ctx.strokeStyle=outline;ctx.lineWidth=4;
  ctx.beginPath();ctx.roundRect(x-74*s,y-36*s,148*s,112*s,22*s);ctx.fill();ctx.stroke();

  ctx.fillStyle='#d87f67';ctx.beginPath();ctx.moveTo(x-90*s,y+2*s);ctx.lineTo(x-6*s,y-76*s);
  ctx.quadraticCurveTo(x+2*s,y-84*s,x+10*s,y-76*s);ctx.lineTo(x+92*s,y+4*s);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.globalAlpha=.22;
  for(let r=0;r<3;r++) for(let c=0;c<5;c++) line(x+(-55+c*28+r*4)*s,y+(-46+r*20)*s,x+(-39+c*28+r*4)*s,y+(-40+r*20)*s,2*s,'#874538');
  ctx.globalAlpha=1;

  ctx.fillStyle='#8f6a60';ctx.fillRect(x+36*s,y-63*s,18*s,37*s);ctx.strokeRect(x+36*s,y-63*s,18*s,37*s);
  ctx.fillStyle='#8a5c48';ctx.beginPath();ctx.roundRect(x-14*s,y+20*s,28*s,52*s,9*s);ctx.fill();ctx.stroke();
  ctx.fillStyle='#f1d46a';ctx.beginPath();ctx.arc(x+7*s,y+47*s,3.4*s,0,7);ctx.fill();
  for(const xx of [x-44*s,x+44*s]){
    ctx.fillStyle='#dff3fb';ctx.beginPath();ctx.roundRect(xx-16*s,y+4*s,32*s,26*s,8*s);ctx.fill();ctx.stroke();
    line(xx,y+4*s,xx,y+30*s,2*s,'#8ab0bf'); line(xx-16*s,y+17*s,xx+16*s,y+17*s,2*s,'#8ab0bf');
  }
  ctx.fillStyle='#b77750';ctx.beginPath();ctx.roundRect(x-58*s,y+32*s,28*s,10*s,5*s);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.roundRect(x+30*s,y+32*s,28*s,10*s,5*s);ctx.fill();ctx.stroke();
  blob(x-46*s,y+26*s,7*s,8*s,'#8fd37a',outline,1.4,1); blob(x+42*s,y+26*s,7*s,8*s,'#8fd37a',outline,1.4,2);
  ctx.restore();
}
function riverPath(){
  ctx.save();ctx.fillStyle='#78bdd6';ctx.beginPath();
  ctx.moveTo(0,H*.43);ctx.bezierCurveTo(W*.25,H*.34,W*.44,H*.58,W*.66,H*.45);
  ctx.bezierCurveTo(W*.82,H*.34,W*.9,H*.38,W,H*.29);ctx.lineTo(W,H);
  ctx.lineTo(0,H);ctx.closePath();ctx.fill();ctx.strokeStyle='#24211e';ctx.lineWidth=4;ctx.stroke();ctx.restore();
}

function drawAvatarFallback(x,y,scale=1){
  shadow(x,y+30*scale,22*scale,7*scale);
  ctx.save();ctx.translate(x,y);
  ctx.globalAlpha=.48;
  ctx.fillStyle='#9ca9a0';ctx.strokeStyle='rgba(79,67,55,.55)';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(0,-32*scale,19*scale,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.roundRect(-19*scale,-11*scale,38*scale,45*scale,15*scale);ctx.fill();ctx.stroke();
  ctx.globalAlpha=.85;ctx.fillStyle='#fffdf5';ctx.font=`800 ${10*scale}px sans-serif`;ctx.textAlign='center';
  ctx.fillText('AVATAR',0,10*scale);
  ctx.restore();
}
function drawAvatarImage(x,y,scale=1,flip=1,bob=0,clipWater=false){
  if(!avatarBridge.ready || !avatarBridge.img.naturalWidth){drawAvatarFallback(x,y,scale);return;}
  const img=avatarBridge.img;
  const targetH=112*scale;
  const ratio=img.naturalWidth/Math.max(1,img.naturalHeight);
  const targetW=targetH*ratio;
  shadow(x,y+31*scale,23*scale,7*scale);
  ctx.save();ctx.translate(x,y+bob);ctx.scale(flip,1);
  if(clipWater){ctx.beginPath();ctx.rect(-targetW*.65,-targetH*.88,targetW*1.3,targetH*.72);ctx.clip();}
  ctx.drawImage(img,-targetW/2,-targetH*.78,targetW,targetH);ctx.restore();
}
function openKidscadeAtelier(){
  const host=kidscadeHost();
  try{const btn=host.document?.querySelector('#avatar-open-btn');if(btn){btn.click();closeModal();return;}}catch(_){}
  toast('Kidscade 캐릭터 아틀리에를 찾지 못했어요.');
}

function drawPlayer(){
  const x=player.x*W,y=player.y*H;
  const moving=keysMove()&&!actionAnim&&!cartRide;
  const now=performance.now();
  let mode='idle';if(moving)mode='walk';else if(actionAnim)mode='smile';captureAvatarFrame(mode,now);
  if(swimState.active&&scene==='river'){
    if(moving)player.bob+=.16;
    const wave=Math.sin(player.bob)*4;
    ctx.save();ctx.globalAlpha=.38;ctx.strokeStyle='#f5feff';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(x,y+18,34+Math.abs(wave),12,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(x,y+20,22,7,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    drawAvatarImage(x,y+9,1,player.flip,Math.sin(player.bob)*2,true);
    ctx.save();ctx.globalAlpha=.72;ctx.strokeStyle='#dff8ff';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(x,y+6,30,-.05,Math.PI+.15);ctx.stroke();ctx.restore();return;
  }
  if(moving)player.bob+=.18;
  const bob=moving?Math.sin(player.bob)*2.8:(!actionAnim?Math.sin(now/800)*.55:0);
  drawAvatarImage(x,y,1,player.flip,bob,false);
  if(actionAnim){ctx.save();ctx.translate(x,y+bob);ctx.scale(player.flip,1);drawActionTool(16,0);ctx.restore();}
}
function addZone(x,y,w,h,label,fn){hotzones.push({x,y,w,h,label,fn});}
function zoneLabel(z){
  const cx=z.x+z.w/2, cy=z.y-7;
  const vw=SW/camera.zoom, vh=SH/camera.zoom;
  if(cx<camera.x-80||cx>camera.x+vw+80||cy<camera.y-60||cy>camera.y+vh+60)return;
  ctx.save();ctx.font='800 12px sans-serif';ctx.textAlign='center';
  const tw=ctx.measureText(z.label).width+14;
  ctx.fillStyle='#fff5d9dd';ctx.strokeStyle='#24211e';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(cx-tw/2,cy-15,tw,22,9);ctx.fill();ctx.stroke();
  ctx.fillStyle='#24211e';ctx.fillText(z.label,cx,cy+1);ctx.restore();
}

function drawHome(){
  const t=performance.now()/700;
  ctx.fillStyle='#d8c09b';ctx.fillRect(0,0,W,H);
  for(let y=H*.30;y<H;y+=42)line(0,y,W,y,1,'#b49670');
  ctx.fillStyle='#eee0bd';ctx.fillRect(0,0,W,H*.30);line(0,H*.30,W,H*.30,4);
  ctx.fillStyle='#c97f66';ctx.fillRect(W*.37,H*.56,W*.26,H*.12);ctx.strokeStyle='#24211e';ctx.lineWidth=3;ctx.strokeRect(W*.37,H*.56,W*.26,H*.12);
  ctx.fillStyle='#a9d2db';ctx.strokeStyle='#24211e';ctx.lineWidth=4;ctx.fillRect(W*.08,H*.08,120,82);ctx.strokeRect(W*.08,H*.08,120,82);
  line(W*.08+60,H*.08,W*.08+60,H*.08+82,3);line(W*.08,H*.08+41,W*.08+120,H*.08+41,3);
  const kx=W*.22,ky=H*.40;
  blob(kx,ky,86,34,'#bf8750','#24211e',3,1);line(kx-68,ky+20,kx-72,ky+66,8);line(kx+68,ky+20,kx+72,ky+66,8);
  ctx.fillStyle='#8a9292';ctx.strokeStyle='#24211e';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(kx-26,ky-38,52,34,8);ctx.fill();ctx.stroke();
  line(kx-35,ky-24,kx-55,ky-24,6);line(kx+35,ky-24,kx+55,ky-24,6);
  for(const [ox,delay] of [[-10,0],[5,.8],[20,1.6]]){ctx.save();ctx.globalAlpha=.32+.12*Math.sin(t+delay);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(kx+ox,ky-45);ctx.bezierCurveTo(kx+ox-8,ky-58+Math.sin(t+delay)*3,kx+ox+8,ky-66,kx+ox-2,ky-78);ctx.stroke();ctx.restore();}
  addZone(kx-92,ky-78,184,145,'요리하기',openKitchen);addCollider(kx-82,ky-44,164,96);
  const wx=W*.50,wy=H*.38;
  blob(wx,wy,53,82,'#7a583f','#24211e',4,2);line(wx,wy-75,wx,wy+73,3);blob(wx-11,wy,3,3,'#d9bd72','#24211e',1);blob(wx+11,wy,3,3,'#d9bd72','#24211e',1);
  addZone(wx-60,wy-90,120,180,'옷장',openWardrobe);addCollider(wx-36,wy-34,72,110);
  const bx=W*.78,by=H*.43;
  blob(bx,by,82,27,'#a66d3d','#24211e',3,4);line(bx-58,by+15,bx-64,by+66,9);line(bx+58,by+15,bx+64,by+66,9);
  ctx.save();ctx.translate(bx-18,by-19);ctx.rotate(-.35);ctx.fillStyle='#707678';ctx.strokeStyle='#24211e';ctx.lineWidth=3;ctx.fillRect(-7,-28,14,45);ctx.strokeRect(-7,-28,14,45);ctx.restore();
  ctx.fillStyle='#d1b06c';ctx.beginPath();ctx.arc(bx+18,by-18,8,0,7);ctx.fill();addZone(bx-90,by-55,180,125,'제작대',openCrafting);addCollider(bx-74,by-34,148,98);
  ctx.fillStyle='#b35f59';ctx.strokeStyle='#24211e';ctx.lineWidth=4;ctx.fillRect(W*.07,H*.66,150,72);ctx.strokeRect(W*.07,H*.66,150,72);
  ctx.fillStyle='#f3ead4';ctx.fillRect(W*.07+8,H*.66+8,55,38);ctx.strokeRect(W*.07+8,H*.66+8,55,38);ctx.fillStyle='#d7886e';ctx.fillRect(W*.07+68,H*.66+10,56,40);ctx.strokeRect(W*.07+68,H*.66+10,56,40);
  addZone(W*.07,H*.66,150,72,'잠자기',()=>{if(confirm('하루를 마무리하고 다음 날로 넘어갈까요?'))sleepDay()});addCollider(W*.07,H*.66,150,72);
  drawFurnitureMini(W*.74,H*.73,'chair');drawFurnitureMini(W*.84,H*.73,'crate');addZone(W*.66,H*.62,W*.25,H*.20,'가구 배치',openFurniture);addCircleCollider(W*.74,H*.73+8,20);addCircleCollider(W*.84,H*.73+5,22);
  const px=W*.54,py=H*.75,wag=Math.sin(t*2.2)*12;
  shadow(px,py+15,24,7);blob(px,py,26,17,'#c8945e','#24211e',3);blob(px+23,py-8,15,14,'#c8945e','#24211e',3);blob(px+18,py-20,7,12,'#7d5639','#24211e',2);line(px-18,py+10,px-19,py+27,5);line(px+7,py+10,px+8,py+27,5);
  ctx.save();ctx.translate(px-27,py-1);ctx.rotate((wag*Math.PI)/180);line(0,0,-17,-8,4,'#7d5639');ctx.restore();ctx.fillStyle='#24211e';ctx.beginPath();ctx.arc(px+28,py-10,2,0,7);ctx.fill();addZone(px-36,py-35,80,75,'쓰다듬기',()=>petDog(px,py));
  const dcx=W*.50,dtop=H*.82,dw=W*.14,dh=H*.18;
  ctx.fillStyle='#2d241e';ctx.strokeStyle='#24211e';ctx.lineWidth=4;ctx.fillRect(dcx-dw/2,dtop,dw,dh);ctx.strokeRect(dcx-dw/2,dtop,dw,dh);drawDoorPanel(dcx,dtop,dw,dh,homeDoor.open);addCollider(dcx-dw/2,dtop,18,dh);addCollider(dcx+dw/2-18,dtop,18,dh);drawExitArrow(dcx,H*.90,'농장으로');
}

function queueTree(x,y,s=1,variant=0,rotation=0){queueRenderable(y+58*s,()=>{ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.translate(-x,-y);tree(x,y,s,variant);ctx.restore();});}
function queueHouse(x,y,s=1){queueRenderable(y+72*s,()=>house(x,y,s),-1);}
function queueLivestock(x,y,type){queueRenderable(y+28,()=>animal(x,y,type));}
