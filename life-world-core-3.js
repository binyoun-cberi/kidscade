function drawPetYard(){
  const snap=refreshGardenWorld();
  petYard.x=W*.055;petYard.y=H*.735;petYard.w=W*.365;petYard.h=H*.215;
  const cw=petYard.w/12,ch=petYard.h/8;

  ctx.save();
  ctx.fillStyle='rgba(217,249,157,.20)';ctx.strokeStyle='rgba(79,138,84,.24)';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(petYard.x,petYard.y,petYard.w,petYard.h,24);ctx.fill();ctx.stroke();
  ctx.globalAlpha=.12;
  for(let i=1;i<12;i++){ctx.beginPath();ctx.moveTo(petYard.x+i*cw,petYard.y);ctx.lineTo(petYard.x+i*cw,petYard.y+petYard.h);ctx.stroke()}
  for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(petYard.x,petYard.y+i*ch);ctx.lineTo(petYard.x+petYard.w,petYard.y+i*ch);ctx.stroke()}
  ctx.restore();

  for(const p of snap.placed||[]){
    const f=snap.facilities?.[p.kind];if(!f)continue;
    const center=gardenCellToWorld(p.x+f.w/2,p.y+f.h/2);
    const scale=.52;
    queueRenderable(center.y+f.h*ch*.28,()=>window.KidscadePetArt?.drawFacility(ctx,p.kind,center.x,center.y,performance.now()/1000,false,scale),-1);
    addCollider(petYard.x+p.x*cw+cw*.14,petYard.y+p.y*ch+ch*.14,Math.max(8,f.w*cw-cw*.28),Math.max(8,f.h*ch-ch*.28));
  }

  for(const a of gardenPetActors){
    const p=gardenCellToWorld(a.gx,a.gy);
    const scale=a.id==='iguana'?.43:(a.id==='goat'||a.id==='miniPig')?.55:.53;
    queueRenderable(p.y,()=>window.KidscadePetArt?.drawAnimal(ctx,a.id,p.x,p.y,performance.now()/1000,a.action,scale,a.facing),2);
  }

  const fishIds=window.KidscadePetArt?.fishIds||[];
  const ownedFish=(snap.owned||[]).filter(id=>fishIds.includes(id));
  const pond=(snap.placed||[]).find(p=>p.kind==='pond');
  if(pond&&ownedFish.length){
    const f=snap.facilities.pond,center=gardenCellToWorld(pond.x+f.w/2,pond.y+f.h/2);
    ownedFish.slice(0,5).forEach((id,i)=>{
      const tt=performance.now()/1000;
      const x=center.x+Math.sin(tt*.8+i*1.7)*cw*.75;
      const y=center.y+(i-2)*ch*.12+Math.sin(tt*1.2+i)*2;
      queueRenderable(center.y+10+i,()=>window.KidscadePetArt?.drawAnimal(ctx,id,x,y,tt,'idle',.27,i%2?1:-1),3);
    });
  }
}

function drawFarm(){
  ctx.fillStyle='#9fc56f';ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.16;
  for(let i=0;i<90;i++){
    const x=(i*97%W),y=(i*61%H);
    line(x,y,x+5,y-8,1.5,'#426f3f');line(x+5,y,x+10,y-7,1.5,'#426f3f');
  }
  ctx.globalAlpha=1;

  drawCurvedPath([[W*.49,H],[W*.49,H*.82],[W*.50,H*.66],[W*.50,H*.44],[W*.50,H*.21]],78);
  drawCurvedPath([[0,H*.70],[W*.18,H*.70],[W*.32,H*.69],[W*.48,H*.67]],68);
  drawCurvedPath([[W*.52,H*.67],[W*.71,H*.67],[W*.84,H*.68],[W,H*.68]],68);

  queueHouse(W*.50,H*.15,.60);
  registerHouseObstacle(W*.50,H*.15,.60);
  drawExitArrow(W*.50,H*.18,'집');
  drawExitArrow(W*.055,H*.69,'숲');
  drawExitArrow(W*.945,H*.69,'강');

  const baseX=W*.18,baseY=H*.37,pw=145,ph=96,gapX=36,gapY=36;
  state.farm.plots.forEach((p,i)=>{
    const col=i%2,row=Math.floor(i/2),x=baseX+col*(pw+gapX),y=baseY+row*(ph+gapY);
    ctx.fillStyle='#80553a';ctx.strokeStyle='#24211e';ctx.lineWidth=3;
    ctx.beginPath();ctx.roundRect(x,y,pw,ph,8);ctx.fill();ctx.stroke();
    ctx.globalAlpha=.34;
    for(let r=0;r<4;r++)line(x+10,y+17+r*21,x+pw-10,y+17+r*21,2,'#d59b62');
    ctx.globalAlpha=1;
    queueRenderable(y+ph*.72,()=>cropIcon(x+pw/2,y+ph/2,p));
    addZone(x,y,pw,ph,`밭 ${i+1}`,()=>openPlot(i));
    addCollider(x+18,y+12,pw-36,ph-24);
  });

  const scx=W*.405,scy=H*.40;
  drawScarecrow(scx,scy,state.farm.scarecrow);
  addZone(scx-40,scy-75,80,120,state.farm.scarecrow?'허수아비':'허수아비 만들기',useScarecrow);
  addCircleCollider(scx,scy+16,12);

  const pen={x:W*.72,y:H*.28,w:W*.19,h:H*.30};
  ctx.fillStyle='#95bc6f';ctx.fillRect(pen.x,pen.y,pen.w,pen.h);
  for(let xx=pen.x;xx<=pen.x+pen.w;xx+=55)line(xx,pen.y,xx,pen.y+pen.h,5,'#725036');
  line(pen.x,pen.y,pen.x+pen.w,pen.y,4,'#725036');
  line(pen.x,pen.y+pen.h,pen.x+pen.w,pen.y+pen.h,4,'#725036');
  line(pen.x,pen.y,pen.x,pen.y+pen.h,4,'#725036');
  line(pen.x+pen.w,pen.y,pen.x+pen.w,pen.y+pen.h,4,'#725036');
  addCollider(pen.x-6,pen.y-6,pen.w+12,12);
  addCollider(pen.x-6,pen.y+pen.h-7,pen.w*.32,12);
  addCollider(pen.x+pen.w*.68,pen.y+pen.h-7,pen.w*.32+6,12);
  addCollider(pen.x-6,pen.y,12,pen.h);
  addCollider(pen.x+pen.w-6,pen.y,12,pen.h);

  const animalFns={cow:()=>openAnimal('cow'),chicken:()=>openAnimal('chicken'),pig:()=>openAnimal('pig')};
  for(const type of ['cow','chicken','pig']){
    const a=animalActors[type],x=a.x*W,y=a.y*H;
    queueLivestock(x,y,type);
    addZone(x-42,y-48,84,82,type==='cow'?'소':type==='chicken'?'닭':'돼지',animalFns[type]);
    addCircleCollider(x,y+10,type==='chicken'?13:20);
  }

  const wx=W*.60,wy=H*.82;
  for(let j=0;j<7;j++){const a=j/7*Math.PI*2;blob(wx+Math.cos(a)*23,wy+Math.sin(a)*8,11,7,'#90958f','#24211e',1.8,j);}
  ctx.fillStyle='#31494c';ctx.beginPath();ctx.ellipse(wx,wy,23,8,0,0,7);ctx.fill();
  line(wx-31,wy-17,wx-31,wy-64,5,'#765135');line(wx+31,wy-17,wx+31,wy-64,5,'#765135');line(wx-31,wy-61,wx+31,wy-61,5,'#765135');
  addCircleCollider(wx,wy,27);addZone(wx-45,wy-72,90,100,`우물 · 물 ${state.farm.waterCan}/${state.farm.maxWater}`,refillWaterCan);

  const cpx=W*.68,cpy=H*.82;
  drawCompostBin(cpx,cpy);addZone(cpx-45,cpy-55,90,90,'퇴비통',useCompost);addCircleCollider(cpx,cpy+6,27);

  const weeds=[['weed1',.12,.54],['weed2',.13,.78],['weed3',.42,.81],['weed4',.64,.69],['weed5',.91,.63]];
  weeds.forEach(([id,xx,yy])=>{
    const n=nodeState(id,1);if(n.destroyed)return;
    const x=W*xx,y=H*yy;drawWeedPatch(x,y,1);
    addZone(x-30,y-38,60,70,'잡초 뽑기',()=>gatherWeed(id,x,y));
  });

  [[.08,.18,.88,8],[.90,.19,.82,14],[.10,.90,.78,20],[.89,.88,.84,24],[.64,.12,.70,26]].forEach(([xx,yy,s,v])=>{
    const x=W*xx,y=H*yy;queueTree(x,y,s,v);registerTreeObstacle(x,y,s);
  });
  drawPetYard();

  for(let i=0;i<16;i++){
    const fx=W*(.06+(i%8)*.11),fy=H*(.83+Math.floor(i/8)*.06);
    ctx.fillStyle=i%2?'#d2a44f':'#e1c167';ctx.strokeStyle='#24211e';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.arc(fx,fy,5,0,7);ctx.fill();ctx.stroke();line(fx,fy+3,fx,fy+18,2,'#557c45');
  }
}

function collectHive(id,x,y){
  const n=nodeState(id,1);if(n.destroyed)return toast('오늘은 이미 꿀을 얻었어요.');
  if(!spendEnergy(3))return;
  playAction('harvest',620,x,y,()=>{sfx('pickup');impact(3,.10);burst(x,y,'sparkle',9);},()=>{
    n.destroyed=true;addItem('꿀',1);
    if(Math.random()<.25){state.energy=Math.max(1,state.energy-4);impact(5,.16);floatText(x,y-45,'따끔! -4','#ff9a82',18);toast('꿀 1개 획득! 벌에게 살짝 쏘였어요.');}
    else{floatText(x,y-45,'꿀 +1','#f4dc72',18);toast('꿀 1개 획득!');}
    saveState();
  });
}
function collectHerb(id,x,y){
  const n=nodeState(id,1);if(n.destroyed)return;if(!spendEnergy(2))return;
  playAction('pull',460,x,y,()=>{sfx('pull');burst(x,y,'leaf',7);},()=>{n.destroyed=true;addItem('약초',1);saveState();floatText(x,y-30,'약초 +1','#a9d980',16);toast('약초를 채집했어요.');});
}
function catchBug(id,x,y){
  if((state.inv['곤충채집망']||0)<=0)return toast('곤충채집망을 제작하면 잡을 수 있어요.');
  const n=nodeState(id,1);if(n.destroyed)return;if(!spendEnergy(2))return;
  playAction('net',560,x,y,()=>{sfx('net');impact(2,.10);burst(x,y,'sparkle',5);},()=>{n.destroyed=true;addItem('곤충',1);saveState();floatText(x,y-28,'잡았다!','#fff0ac',17);toast('곤충을 채집했어요!');});
}

function drawForest(){
  ctx.fillStyle='#709455';ctx.fillRect(0,0,W,H);ctx.globalAlpha=.17;
  for(let i=0;i<120;i++){const x=(i*83+19)%W,y=(i*127+33)%H;blob(x,y,6+(i%4)*2,3+(i%3),'#315f38','transparent',0,i);}
  ctx.globalAlpha=1;
  drawCurvedPath([[W,H*.68],[W*.86,H*.69],[W*.72,H*.66],[W*.58,H*.61],[W*.43,H*.55],[W*.29,H*.49],[W*.16,H*.43]],72,'#c6a36e');
  drawCurvedPath([[W*.34,H*.55],[W*.28,H*.66],[W*.24,H*.79],[W*.19,H*.93]],54,'#b99561');drawExitArrow(W*.94,H*.70,'농장');
  const trees=[['ft1',.09,.26,.94,1],['ft2',.23,.20,.80,4],['ft3',.40,.29,.91,7],['ft4',.61,.20,.85,10],['ft5',.15,.67,.89,13],['ft6',.36,.70,.81,16],['ft7',.62,.72,.89,19],['ft8',.08,.86,.75,31],['ft9',.28,.88,.82,34],['ft10',.53,.88,.78,37],['ft11',.78,.86,.84,40],['ft12',.76,.48,.72,42],['ft13',.84,.32,.70,43]];
  trees.forEach(([id,xx,yy,s,v])=>{
    const x=xx*W,y=yy*H,n=nodeState(id,3);
    if(n.destroyed){shadow(x,y+28*s,22*s,7*s);blob(x,y+20*s,17*s,9*s,'#775033','#24211e',3,2);line(x-9*s,y+16*s,x+10*s,y+18*s,2,'#b98959');return;}
    queueTree(x,y,s,v,nodeWobble(id)*Math.PI/180);registerTreeObstacle(x,y,s);addZone(x-46*s,y-105*s,92*s,166*s,`나무 ${n.hp}/3`,()=>chopTree(id,x,y,s));
  });
  const hive=nodeState('hive1',1);if(!hive.destroyed){const hx=W*.52,hy=H*.25;drawHive(hx,hy);addZone(hx-36,hy-70,72,100,'벌집 · 꿀',()=>collectHive('hive1',hx,hy));}
  for(const [id,xx,yy] of [['herb1',.31,.38],['herb2',.55,.52],['herb3',.70,.79]]){const n=nodeState(id,1);if(n.destroyed)continue;const x=W*xx,y=H*yy;drawHerbPatch(x,y);addZone(x-34,y-40,68,70,'약초 채집',()=>collectHerb(id,x,y));}
  for(const [id,xx,yy] of [['bug1',.47,.43],['bug2',.67,.35]]){const n=nodeState(id,1);if(n.destroyed)continue;const x=W*xx,y=H*yy+Math.sin(performance.now()/420+xx*9)*14;drawButterfly(x,y);addZone(x-36,y-34,72,68,'곤충 잡기',()=>catchBug(id,x,y));}
  drawMushroom(W*.46,H*.58);addZone(W*.42,H*.51,80,70,'버섯',()=>gatherAnimated('버섯',4,W*.46,H*.58));drawApple(W*.61,H*.36);addZone(W*.57,H*.29,80,70,'사과',()=>gatherAnimated('사과',4,W*.61,H*.36));drawBerry(W*.72,H*.62);addZone(W*.68,H*.55,80,70,'딸기',()=>gatherAnimated('딸기',4,W*.72,H*.62));
  const cx=W*.16,cy=H*.43;blob(cx,cy,88,98,'#414641','#24211e',4,1);blob(cx,cy+8,54,66,'#171916','#24211e',3,5);line(cx-44,cy-52,cx-52,cy-96,6,'#5a3c28');line(cx+42,cy-52,cx+56,cy-95,5,'#5a3c28');drawExitArrow(cx,cy+10,'광산');addZone(cx-60,cy-50,120,120,'광산 들어가기',()=>transitionTo('mine',{x:.50,y:.82}));addCollider(cx-90,cy-10,34,80);addCollider(cx+56,cy-10,34,80);addCollider(cx-42,cy-82,84,22);
  for(let i=0;i<22;i++){const gx=W*(.04+(i%11)*.09),gy=H*(.77+Math.floor(i/11)*.09);line(gx,gy,gx+5,gy-12,2,'#416d3f');line(gx+5,gy,gx+11,gy-10,2,'#416d3f');}
}

function useMineCart(dest){if(cartRide||actionAnim)return;if(!spendEnergy(1))return;const start={x:player.x,y:player.y};const end=dest==='deep'?{x:.69,y:.34}:{x:.50,y:.84};cartRide={start,end,startTime:performance.now(),duration:900,dest};sfx('cart');impact(2,.06);}
function mineGem(id,x,y){
  if((state.inv['철곡괭이']||0)<=0)return toast('보석 광맥은 철곡괭이가 필요해요.');const n=nodeState(id,4);if(n.destroyed)return;if(!spendEnergy(6))return;
  playAction('mine',650,x,y,()=>{markNodeHit(id);sfx('mine');impact(9,.20);burst(x,y,'stone',12);burst(x,y-5,'sparkle',4);},()=>{const after=damageWorldNode(id,4);if(after.destroyed){addItem('보석원석',1);sfx('pickup');impact(14,.30);burst(x,y,'sparkle',24);floatText(x,y-70,'보석원석 +1','#bceff0',20);toast('보석원석을 발견했어요!');}else{floatText(x,y-55,`${after.hp}/4`,'#cdebed',15);toast(`단단한 보석 광맥… ${after.hp}/4 남음`);}});
}

function drawMine(){
  ctx.fillStyle='#454743';ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(W*.5,H*.36,20,W*.5,H*.43,W*.68);g.addColorStop(0,'#77766d');g.addColorStop(.55,'#555650');g.addColorStop(1,'#292b28');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  drawCurvedPath([[W*.50,H],[W*.50,H*.86],[W*.48,H*.73],[W*.42,H*.60],[W*.41,H*.44],[W*.52,H*.34],[W*.68,H*.28]],80,'#5f5c54','#3f3d38');drawCurvedPath([[W*.42,H*.60],[W*.28,H*.57],[W*.18,H*.49]],56,'#5f5c54','#3f3d38');
  ctx.globalAlpha=.22;for(let r=0;r<6;r++){ctx.beginPath();ctx.moveTo(0,H*(.12+r*.13));ctx.bezierCurveTo(W*.2,H*(.08+r*.13),W*.48,H*(.17+r*.13),W,H*(.10+r*.13));ctx.strokeStyle='#beb9a8';ctx.lineWidth=2;ctx.stroke();}ctx.globalAlpha=1;
  [[.05,.10,.9],[.15,.18,.8],[.84,.12,.9],[.93,.21,.8],[.12,.80,.82],[.86,.79,.88]].forEach(([xx,yy,s])=>{drawRockCluster(W*xx,H*yy,s);addCircleCollider(W*xx,H*yy+5,30*s);});
  const nodes=[['mn1',.18,.49,'돌','#8e918f',''],['mn2',.41,.44,'석탄','#666965','coal'],['mn3',.68,.28,'구리광석','#85867f','copper'],['mn4',.82,.49,'철광석','#858a87','iron'],['mn5',.35,.70,'돌','#8e918f',''],['mn6',.61,.69,'철광석','#858a87','iron']];
  nodes.forEach(([id,xx,yy,t,c,ore])=>{const x=xx*W,y=yy*H,n=nodeState(id,3);if(n.destroyed){ctx.globalAlpha=.45;rock(x,y,.55,'#555752');ctx.globalAlpha=1;return;}queueRenderable(y+25,()=>{ctx.save();ctx.translate(x,y);ctx.rotate(nodeWobble(id)*Math.PI/180);ctx.translate(-x,-y);rock(x,y,1,c,ore);ctx.restore();});addZone(x-44,y-38,88,76,`${t} ${n.hp}/3`,()=>mineNode(id,t,x,y));addCircleCollider(x,y+5,24);});
  for(const [xx,yy] of [[.08,.23],[.91,.66],[.72,.16]]){ctx.save();ctx.translate(xx*W,yy*H);ctx.globalAlpha=.25;ctx.fillStyle='#f0d96c';ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#ddb950';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(8,7);ctx.lineTo(-7,6);ctx.closePath();ctx.fill();ctx.restore();}
  const cart1={x:W*.50,y:H*.80},cart2={x:W*.69,y:H*.37};drawMineCart(cart1.x,cart1.y);addZone(cart1.x-50,cart1.y-40,100,75,'광차 · 깊은 곳',()=>useMineCart('deep'));addCircleCollider(cart1.x,cart1.y+8,28);drawMineCart(cart2.x,cart2.y);addZone(cart2.x-50,cart2.y-40,100,75,'광차 · 입구',()=>useMineCart('entrance'));addCircleCollider(cart2.x,cart2.y+8,28);
  const gn=nodeState('gem1',4),gx=W*.76,gy=H*.63;if(!gn.destroyed){queueRenderable(gy+26,()=>{ctx.save();ctx.translate(gx,gy);ctx.rotate(nodeWobble('gem1')*Math.PI/180);ctx.translate(-gx,-gy);drawGemRock(gx,gy);ctx.restore();});addZone(gx-48,gy-42,96,84,`보석 광맥 ${gn.hp}/4`,()=>mineGem('gem1',gx,gy));addCircleCollider(gx,gy+5,25);}
  ctx.fillStyle='#151714';ctx.beginPath();ctx.arc(W*.50,H*.92,60,Math.PI,0);ctx.lineTo(W*.56,H);ctx.lineTo(W*.44,H);ctx.closePath();ctx.fill();drawExitArrow(W*.50,H*.92,'숲');
}

function collectRiverFind(id,item,x,y){if(!swimState.active)return toast('수영해서 가까이 가야 해요.');const n=nodeState(id,1);if(n.destroyed)return;if(!spendEnergy(3))return;playAction('harvest',520,x,y,()=>{sfx('water');burst(x,y,'water',12);impact(2,.08);},()=>{n.destroyed=true;addItem(item,1);saveState();burst(x,y,'sparkle',5);floatText(x,y-35,`${item} +1`,'#dff8ff',16);toast(`${item}을(를) 찾았어요.`);});}

function drawRiver(){
  ctx.fillStyle='#98c276';ctx.fillRect(0,0,W,H);riverPath();ctx.save();ctx.globalAlpha=.23;ctx.strokeStyle='#e1f4f4';ctx.lineWidth=2;const off=(performance.now()/35)%80;for(let i=-2;i<14;i++){const x=i*120+off;ctx.beginPath();ctx.moveTo(x,H*.63);ctx.quadraticCurveTo(x+30,H*.59,x+62,H*.64);ctx.stroke();}ctx.restore();
  drawCurvedPath([[0,H*.68],[W*.17,H*.67],[W*.28,H*.66],[W*.37,H*.63],[W*.48,H*.61]],66);drawCurvedPath([[W*.40,H*.63],[W*.46,H*.55],[W*.51,H*.47]],54,'#bf9d69');drawExitArrow(W*.055,H*.66,'농장');
  [[.14,.27,.74,3],[.80,.20,.74,12],[.18,.82,.76,19],[.78,.86,.82,23]].forEach(([xx,yy,s,v])=>{const x=W*xx,y=H*yy;queueTree(x,y,s,v);registerTreeObstacle(x,y,s);});
  for(const xx of [.27,.29,.84,.88]){line(W*xx,H*.55,W*(xx-.01),H*.46,3,'#4d8247');line(W*(xx+.008),H*.55,W*(xx+.012),H*.47,3,'#4d8247');blob(W*(xx-.01),H*.46,3,8,'#765632','#24211e',1);}
  const dx=W*.34,dy=H*.52,dw=W*.27,dh=H*.12;ctx.fillStyle='#9d693d';ctx.strokeStyle='#24211e';ctx.lineWidth=3;ctx.fillRect(dx,dy,dw,dh);ctx.strokeRect(dx,dy,dw,dh);for(let x=dx+10;x<dx+dw;x+=32)line(x,dy,x,dy+dh,2,'#5f4028');line(dx,dy+dh*.55,dx+dw,dy+dh*.55,1.5,'#c8955f');addCircleCollider(dx+8,dy+dh-4,8);addCircleCollider(dx+dw-8,dy+dh-4,8);line(W*.43,H*.46,W*.48,H*.31,4,'#6b4a2f');line(W*.48,H*.31,W*.55,H*.38,2,'#24211e');line(W*.55,H*.38,W*.56,H*.48,1,'#24211e');addZone(W*.31,H*.40,W*.31,H*.27,'낚시',openFishing);
  ctx.strokeStyle='#24211e';ctx.lineWidth=5;ctx.beginPath();ctx.arc(W*.75,H*.54,18,0,7);ctx.stroke();line(W*.765,H*.555,W*.80,H*.61,6);addZone(W*.68,H*.45,W*.17,H*.20,'탐어',openFishWatching);drawFishSilhouette(W*.66,H*.80,1);drawFishSilhouette(W*.86,H*.72,.82);
  const riverFinds=[['rf1',.58,.76,'민물조개','shell'],['rf2',.72,.68,'강돌','stone'],['rf3',.88,.76,'민물조개','shell'],['rf4',.50,.86,'강돌','stone']];riverFinds.forEach(([id,xx,yy,item,type])=>{const n=nodeState(id,1);if(n.destroyed)return;const x=W*xx,y=H*yy;drawWaterFind(x,y,type);addZone(x-34,y-34,68,68,`물속 ${item}`,()=>collectRiverFind(id,item,x,y));});
  for(let i=0;i<18;i++){const x=W*(.10+(i%9)*.09),y=H*(.79+Math.floor(i/9)*.08);blob(x,y,4,4,i%3===0?'#d98b72':i%3===1?'#e1c65f':'#c6d78b','#24211e',1,i);line(x,y+3,x,y+13,1.5,'#4d8247');}
  if(!swimState.active){ctx.save();ctx.globalAlpha=.82;ctx.fillStyle='#eefaff';ctx.strokeStyle='#24211e';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(W*.28,H*.49,150,32,12);ctx.fill();ctx.stroke();ctx.fillStyle='#24404a';ctx.font='800 12px sans-serif';ctx.textAlign='center';ctx.fillText('물에 들어가면 수영 · 체력 소모',W*.28+75,H*.49+20);ctx.restore();}
}

let actionAnim=null;
let particles=[];
