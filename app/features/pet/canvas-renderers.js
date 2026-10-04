((root,factory)=>{
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.KidscadePetCanvasRenderers=Object.freeze(api);
})(typeof window!=='undefined'?window:null,()=>{
  'use strict';

  function roundedRect(c,x,y,w,h,r){ const rr=Math.min(r,w/2,h/2); c.beginPath(); c.moveTo(x+rr,y); c.arcTo(x+w,y,x+w,y+h,rr); c.arcTo(x+w,y+h,x,y+h,rr); c.arcTo(x,y+h,x,y,rr); c.arcTo(x,y,x+w,y,rr); c.closePath(); }
  function ellipseGradient(c,x,y,rx,ry,stops){ const g=c.createRadialGradient(x-rx*.35,y-ry*.55,2,x,y,Math.max(rx,ry)*1.25); stops.forEach(s=>g.addColorStop(s[0],s[1])); return g; }
  function drawEye(c,x,y,r,closed=false){ c.save(); if(closed){ c.strokeStyle='#1f2937'; c.lineWidth=4; c.lineCap='round'; c.beginPath(); c.arc(x,y+2,r*.78,.1,Math.PI-.1); c.stroke(); c.restore(); return; } c.fillStyle='#fff'; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill(); c.fillStyle='#0f172a'; c.beginPath(); c.arc(x+2,y+1,r*.58,0,Math.PI*2); c.fill(); c.fillStyle='rgba(255,255,255,.95)'; c.beginPath(); c.arc(x-2,y-3,r*.23,0,Math.PI*2); c.fill(); c.restore(); }
  function drawSoftShadow(c,x,y,rx,a=.18){ c.save(); c.fillStyle=`rgba(15,23,42,${a})`; c.beginPath(); c.ellipse(x,y,rx,rx*.16,0,0,Math.PI*2); c.fill(); c.restore(); }
  function drawCareBadge(c,x,y,icon,label,value,color='#22c55e'){ c.save(); c.translate(x,y); c.fillStyle='rgba(255,255,255,.84)'; roundedRect(c,-6,-22,150,43,14); c.fill(); c.strokeStyle='rgba(148,163,184,.28)'; c.lineWidth=1.5; roundedRect(c,-6,-22,150,43,14); c.stroke(); c.font='900 13px 맑은 고딕, sans-serif'; c.fillStyle=color; c.fillText(`${icon} ${label}`,4,-5); c.font='900 12px 맑은 고딕, sans-serif'; c.fillStyle='#475569'; c.fillText(value,4,13); c.restore(); }
  function drawSeaPlant(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); c.strokeStyle='#16a34a'; c.lineWidth=8; c.lineCap='round'; for(let i=0;i<3;i++){ c.beginPath(); c.moveTo(i*13,0); c.bezierCurveTo(-25+i*20,-40+Math.sin(t+i)*4,18+i*8,-70,4+i*12,-105); c.stroke(); } c.fillStyle='#22c55e'; c.beginPath(); c.ellipse(-18,-58,15,32,-.45,0,Math.PI*2); c.fill(); c.beginPath(); c.ellipse(30,-78,16,36,.4,0,Math.PI*2); c.fill(); c.restore(); }
  function drawOrnament(c,x,y,kind,t){ c.save(); c.translate(x,y); if(kind===0){ c.fillStyle='#a78bfa'; c.fillRect(-28,-48,56,48); c.fillStyle='#7c3aed'; c.beginPath(); c.moveTo(-34,-48); c.lineTo(0,-86); c.lineTo(34,-48); c.closePath(); c.fill(); } else { drawRock(c,0,-5,34); } c.restore(); }
  function drawRockCave(c,x,y,s){ c.save(); c.translate(x,y); c.scale(s,s); c.fillStyle='#94a3b8'; c.beginPath(); c.ellipse(0,0,70,36,0,Math.PI,Math.PI*2); c.lineTo(70,8); c.lineTo(-70,8); c.closePath(); c.fill(); c.fillStyle='#475569'; c.beginPath(); c.ellipse(0,4,32,20,0,Math.PI,Math.PI*2); c.lineTo(32,8); c.lineTo(-32,8); c.closePath(); c.fill(); c.restore(); }
  function drawRock(c,x,y,r){ c.save(); c.translate(x,y); c.fillStyle='#94a3b8'; c.beginPath(); c.ellipse(0,0,r,r*.38,0,0,Math.PI*2); c.fill(); c.fillStyle='rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-r*.2,-r*.12,r*.28,r*.08,0,0,Math.PI*2); c.fill(); c.restore(); }
  function drawShrimp(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); c.strokeStyle='#fb7185'; c.lineWidth=4; c.lineCap='round'; c.beginPath(); c.arc(0,0,18,Math.PI*.2,Math.PI*1.5); c.stroke(); c.fillStyle='#fda4af'; c.beginPath(); c.ellipse(-3,0,24,12,-.2,0,Math.PI*2); c.fill(); c.strokeStyle='#be123c'; c.lineWidth=2; for(let i=0;i<3;i++){ c.beginPath(); c.moveTo(-10+i*8,8); c.lineTo(-18+i*8,20); c.stroke(); } c.restore(); }
  function drawSnail(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); c.fillStyle='#a16207'; c.beginPath(); c.ellipse(0,10,32,11,0,0,Math.PI*2); c.fill(); c.fillStyle='#fbbf24'; c.beginPath(); c.arc(-8,0,17,0,Math.PI*2); c.fill(); c.strokeStyle='#92400e'; c.lineWidth=3; c.beginPath(); c.arc(-8,0,10,0,Math.PI*1.6); c.stroke(); c.strokeStyle='#a16207'; c.beginPath(); c.moveTo(22,4); c.lineTo(40,-12); c.moveTo(25,5); c.lineTo(44,-4); c.stroke(); c.restore(); }
  function drawWheel(c,x,y,r,t){ c.save(); c.translate(x,y); c.strokeStyle='rgba(100,116,139,.55)'; c.lineWidth=8; c.beginPath(); c.arc(0,0,r,0,Math.PI*2); c.stroke(); c.lineWidth=3; for(let i=0;i<8;i++){ const a=t*2+i*Math.PI/4; c.beginPath(); c.moveTo(0,0); c.lineTo(Math.cos(a)*r,Math.sin(a)*r); c.stroke(); } c.restore(); }
  function drawHouse(c,x,y,s,color){ c.save(); c.translate(x,y); c.fillStyle=color; roundedRect(c,-s*.55,-s*.45,s*1.1,s*.72,12); c.fill(); c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.arc(0,-s*.1,s*.22,0,Math.PI*2); c.fill(); c.restore(); }
  function drawPerch(c,x1,y1,x2,y2){ c.save(); c.strokeStyle='#92400e'; c.lineWidth=10; c.lineCap='round'; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke(); c.restore(); }
  function drawHangingToy(c,x,y,r,t){ c.save(); c.strokeStyle='rgba(71,85,105,.45)'; c.lineWidth=2; c.beginPath(); c.moveTo(x,y-36); c.lineTo(x,y); c.stroke(); c.fillStyle='#f59e0b'; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(x-5,y-5,r*.28,0,Math.PI*2); c.fill(); c.restore(); }
  function drawBranch(c,x1,y1,x2,y2,t){ c.save(); c.strokeStyle='#92400e'; c.lineWidth=12; c.lineCap='round'; c.beginPath(); c.moveTo(x1,y1); c.quadraticCurveTo((x1+x2)/2,y1-35,x2,y2); c.stroke(); c.strokeStyle='#65a30d'; c.lineWidth=5; c.beginPath(); c.moveTo(x1+40,y1-12); c.quadraticCurveTo(x1+20,y1-60,x1+8,y1-88); c.stroke(); c.restore(); }
  function drawLeafCluster(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); c.fillStyle='#22c55e'; for(let i=0;i<5;i++){ c.beginPath(); c.ellipse(Math.cos(i)*18,Math.sin(i)*12,23,9,i,0,Math.PI*2); c.fill(); } c.restore(); }
  function drawWindow(c,x,y,w,h){ c.save(); c.fillStyle='#bae6fd'; roundedRect(c,x-w/2,y-h/2,w,h,12); c.fill(); c.strokeStyle='rgba(255,255,255,.85)'; c.lineWidth=4; c.beginPath(); c.moveTo(x,y-h/2); c.lineTo(x,y+h/2); c.moveTo(x-w/2,y); c.lineTo(x+w/2,y); c.stroke(); c.restore(); }
  function drawCatTree(c,x,y,t){ c.save(); c.strokeStyle='#a16207'; c.lineWidth=14; c.lineCap='round'; c.beginPath(); c.moveTo(x,y+70); c.lineTo(x,y-60); c.stroke(); c.fillStyle='#fbbf24'; roundedRect(c,x-55,y-70,110,28,12); c.fill(); roundedRect(c,x-85,y+10,120,28,12); c.fill(); c.restore(); }
  function drawDogBed(c,x,y,s){ c.save(); c.translate(x,y); c.fillStyle='#fb7185'; c.beginPath(); c.ellipse(0,0,s,s*.38,0,0,Math.PI*2); c.fill(); c.fillStyle='#fecdd3'; c.beginPath(); c.ellipse(0,-8,s*.62,s*.22,0,0,Math.PI*2); c.fill(); c.restore(); }
  function drawFish(c,x,y,s,f,t,action){ c.save(); c.translate(x,y); c.scale(s,s); c.rotate(Math.sin(t*1.7)*.04); drawSoftShadow(c,0,85,95,.12); const g=ellipseGradient(c,0,0,86,43,[[0,f.light],[.55,f.body],[1,f.dark]]); c.fillStyle=g; c.beginPath(); c.ellipse(0,0,92,45,0,0,Math.PI*2); c.fill(); c.fillStyle=f.tail; c.beginPath(); c.moveTo(-82,0); c.lineTo(-138,-44+Math.sin(t*7)*6); c.quadraticCurveTo(-120,0,-138,44-Math.sin(t*7)*6); c.closePath(); c.fill(); c.fillStyle='rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(-20,-14,36,12,-.15,0,Math.PI*2); c.fill(); if(f.pattern==='stripe'){ c.fillStyle='#ef4444'; c.fillRect(-18,-33,13,66); c.fillStyle='#dbeafe'; c.fillRect(-3,-30,8,60); } if(f.pattern==='dot'){ c.fillStyle='#111827'; c.beginPath(); c.arc(38,12,7,0,Math.PI*2); c.fill(); } if(f.pattern==='spot'){ c.fillStyle='rgba(255,255,255,.55)'; for(let i=0;i<3;i++){ c.beginPath(); c.arc(-26+i*20,14-i*6,6,0,Math.PI*2); c.fill(); } } if(f.pattern==='fan'){ c.fillStyle=f.tail; c.globalAlpha=.78; c.beginPath(); c.ellipse(-115,0,60,48,0,0,Math.PI*2); c.fill(); c.globalAlpha=1; } c.fillStyle='rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(42,8,12,7,.6,0,Math.PI*2); c.fill(); drawEye(c,54,-17,14,action==='sleep'); c.strokeStyle='#78350f'; c.lineWidth=4; c.lineCap='round'; c.beginPath(); if(action==='sick') c.arc(68,6,11,Math.PI*1.1,Math.PI*1.9); else c.arc(66,0,14,.15,Math.PI*.75); c.stroke(); c.restore(); }
  function drawFoodPellets(c,w,h,t){ c.save(); c.fillStyle='#fef08a'; for(let i=0;i<8;i++){ c.beginPath(); c.arc(w*.50+Math.sin(t*3+i)*42,h*.20+((t*42+i*22)%120),3.5,0,Math.PI*2); c.fill(); } c.restore(); }
  function drawSeed(c,x,y,t){ c.save(); c.translate(x,y); c.rotate(Math.sin(t*3)*.2); c.fillStyle='#a16207'; c.beginPath(); c.ellipse(0,0,24,13,.6,0,Math.PI*2); c.fill(); c.fillStyle='#fde68a'; c.beginPath(); c.ellipse(-6,-4,10,4,.5,0,Math.PI*2); c.fill(); c.restore(); }
  function drawCookie(c,x,y,t){ c.save(); c.translate(x,y); c.fillStyle='#d97706'; c.beginPath(); c.arc(0,0,21,0,Math.PI*2); c.fill(); c.fillStyle='#78350f'; for(let i=0;i<5;i++){ c.beginPath(); c.arc(Math.cos(i*1.4)*9,Math.sin(i*1.8)*8,3,0,Math.PI*2); c.fill(); } c.restore(); }
  function drawCarrot(c,x,y,t){ c.save(); c.translate(x,y); c.rotate(Math.sin(t*3)*.2); c.fillStyle='#f97316'; c.beginPath(); c.moveTo(-22,-8); c.lineTo(26,0); c.lineTo(-22,11); c.closePath(); c.fill(); c.strokeStyle='#166534'; c.lineWidth=4; c.beginPath(); c.moveTo(-23,-5); c.lineTo(-39,-19); c.moveTo(-23,2); c.lineTo(-41,2); c.moveTo(-23,8); c.lineTo(-38,21); c.stroke(); c.restore(); }
  function drawFruitSnack(c,x,y,t){ c.save(); c.translate(x,y); c.rotate(Math.sin(t*3)*.2); c.fillStyle='#fb7185'; c.beginPath(); c.arc(0,0,17,0,Math.PI*2); c.fill(); c.fillStyle='#fef3c7'; c.beginPath(); c.arc(-5,-5,5,0,Math.PI*2); c.fill(); c.strokeStyle='#166534'; c.lineWidth=3; c.beginPath(); c.moveTo(2,-16); c.quadraticCurveTo(14,-28,26,-18); c.stroke(); c.restore(); }
  function drawSunSpot(c,x,y,r,t){ c.save(); c.translate(x,y); c.fillStyle='rgba(251,191,36,.32)'; c.beginPath(); c.arc(0,0,r*2.3,0,Math.PI*2); c.fill(); c.fillStyle='#fef3c7'; c.beginPath(); c.arc(0,0,r,0,Math.PI*2); c.fill(); c.strokeStyle='#f59e0b'; c.lineWidth=3; for(let i=0;i<8;i++){ const a=i*Math.PI/4+t*.4; c.beginPath(); c.moveTo(Math.cos(a)*r*1.25,Math.sin(a)*r*1.25); c.lineTo(Math.cos(a)*r*1.8,Math.sin(a)*r*1.8); c.stroke(); } c.restore(); }
  function drawLeafSnack(c,x,y,t){ c.save(); c.translate(x,y); c.fillStyle='#22c55e'; c.beginPath(); c.ellipse(0,0,30,13,Math.sin(t)*.3,0,Math.PI*2); c.fill(); c.strokeStyle='#15803d'; c.beginPath(); c.moveTo(-24,0); c.lineTo(22,0); c.stroke(); c.restore(); }
  function drawBall(c,x,y,r,t){ c.save(); c.translate(x,y); c.rotate(t*3); const g=c.createRadialGradient(-r*.4,-r*.4,2,0,0,r*1.1); g.addColorStop(0,'#fff'); g.addColorStop(.35,'#60a5fa'); g.addColorStop(1,'#2563eb'); c.fillStyle=g; c.beginPath(); c.arc(0,0,r,0,Math.PI*2); c.fill(); c.strokeStyle='rgba(255,255,255,.75)'; c.lineWidth=3; c.beginPath(); c.arc(0,0,r*.62,0,Math.PI*2); c.stroke(); c.restore(); }
  function drawHearts(c,x,y,t){ c.save(); c.fillStyle='#fb7185'; c.font='900 24px sans-serif'; c.fillText('💗',x+Math.sin(t*3)*14,y-20-Math.abs(Math.sin(t*4))*14); c.fillText('✨',x-34,y-8); c.restore(); }
  function drawZzz(c,x,y,t){ c.save(); c.font='900 24px 맑은 고딕, sans-serif'; c.fillStyle='rgba(51,65,85,.85)'; c.fillText('Z',x,y-Math.sin(t)*5); c.font='900 19px 맑은 고딕, sans-serif'; c.fillText('z',x+26,y-20-Math.sin(t+1)*5); c.font='900 14px 맑은 고딕, sans-serif'; c.fillText('z',x+46,y-36-Math.sin(t+2)*5); c.restore(); }
  function drawBridge(c,x,y,wid,hei){ c.save(); c.strokeStyle='#92400e'; c.lineWidth=6; c.lineCap='round'; c.beginPath(); c.moveTo(x-wid/2,y); c.quadraticCurveTo(x,y-hei,x+wid/2,y); c.stroke(); c.restore(); }
  function drawTunnel(c,x,y,wid,hei,color){ c.save(); c.fillStyle=color; roundedRect(c,x-wid/2,y-hei/2,wid,hei,hei/2); c.fill(); c.fillStyle='rgba(15,23,42,.28)'; roundedRect(c,x-wid*.28,y-hei*.32,wid*.56,hei*.64,hei/3); c.fill(); c.restore(); }
  function drawStick(c,x,y,len,t){ c.save(); c.translate(x,y); c.rotate(Math.sin(t)*.15); c.strokeStyle='#92400e'; c.lineWidth=5; c.lineCap='round'; c.beginPath(); c.moveTo(-len,0); c.lineTo(len,0); c.stroke(); c.restore(); }
  function drawLamp(c,x,y,r,color){ c.save(); c.fillStyle='rgba(251,191,36,.24)'; c.beginPath(); c.arc(x,y+r*.7,r*1.6,0,Math.PI*2); c.fill(); c.fillStyle=color; c.beginPath(); c.arc(x,y+r*.7,r*.55,0,Math.PI*2); c.fill(); c.fillStyle='#92400e'; c.fillRect(x-r*.42,y-r*.08,r*.84,9); c.restore(); }
  function drawVine(c,x,y,len,t){ c.save(); c.strokeStyle='#16a34a'; c.lineWidth=6; c.lineCap='round'; c.beginPath(); c.moveTo(x,y); c.bezierCurveTo(x+28,y+len*.28+Math.sin(t)*5,x-20,y+len*.62,x+8,y+len); c.stroke(); c.fillStyle='#22c55e'; for(let i=0;i<3;i++){ c.beginPath(); c.ellipse(x+Math.sin(i*2+t)*20,y+24+i*24,18,8,i,0,Math.PI*2); c.fill(); } c.restore(); }
  function drawSwing(c,x,y,wid,t){ c.save(); c.strokeStyle='#64748b'; c.lineWidth=3; c.beginPath(); c.moveTo(x-wid/2,y-55); c.lineTo(x-wid/2,y); c.moveTo(x+wid/2,y-55); c.lineTo(x+wid/2,y); c.stroke(); c.strokeStyle='#92400e'; c.lineWidth=7; c.beginPath(); c.moveTo(x-wid*.6,y+Math.sin(t)*3); c.lineTo(x+wid*.6,y-Math.sin(t)*3); c.stroke(); c.restore(); }
  function drawLadder(c,x,y,wid,hei){ c.save(); c.strokeStyle='#92400e'; c.lineWidth=5; c.lineCap='round'; c.beginPath(); c.moveTo(x-wid/2,y); c.lineTo(x-wid/2,y+hei); c.moveTo(x+wid/2,y); c.lineTo(x+wid/2,y+hei); for(let i=1;i<5;i++){ c.moveTo(x-wid/2,y+i*hei/5); c.lineTo(x+wid/2,y+i*hei/5); } c.stroke(); c.restore(); }
  function drawMirror(c,x,y,r){ c.save(); c.fillStyle='#bfdbfe'; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill(); c.strokeStyle='#facc15'; c.lineWidth=6; c.stroke(); c.restore(); }
  function drawCatTowerExtra(c,x,y,t){ c.save(); c.strokeStyle='#a16207'; c.lineWidth=14; c.lineCap='round'; c.beginPath(); c.moveTo(x,y+60); c.lineTo(x,y-70); c.stroke(); c.fillStyle='#fde68a'; roundedRect(c,x-60,y-85,120,30,12); c.fill(); roundedRect(c,x-82,y-10,112,28,12); c.fill(); c.restore(); }
  function drawWaterFountain(c,x,y,t){ c.save(); c.fillStyle='#93c5fd'; roundedRect(c,x-34,y-30,68,48,14); c.fill(); c.strokeStyle='#60a5fa'; c.lineWidth=4; c.beginPath(); c.arc(x,y-30,18,0,Math.PI); c.stroke(); c.restore(); }
  function drawLeash(c,x,y,t){ c.save(); c.strokeStyle='#ef4444'; c.lineWidth=5; c.beginPath(); c.arc(x,y,28,.2,Math.PI*1.9); c.stroke(); c.lineTo(x+62,y+34); c.stroke(); c.restore(); }
  function drawCone(c,x,y,s){ c.save(); c.fillStyle='#f97316'; c.beginPath(); c.moveTo(x,y-s); c.lineTo(x-s*.7,y+s*.6); c.lineTo(x+s*.7,y+s*.6); c.closePath(); c.fill(); c.fillStyle='#fff'; c.fillRect(x-s*.42,y-s*.1,s*.84,5); c.restore(); }
  function drawPlatform(c,x,y,wid,hei){ c.save(); c.fillStyle='#a16207'; roundedRect(c,x-wid/2,y-hei/2,wid,hei,8); c.fill(); c.restore(); }
  function drawHayRack(c,x,y){ c.save(); c.strokeStyle='#92400e'; c.lineWidth=4; roundedRect(c,x-38,y-34,76,62,10); c.stroke(); c.fillStyle='#facc15'; for(let i=0;i<8;i++){ c.fillRect(x-28+i*8,y-22,4,42); } c.restore(); }
  function drawBlock(c,x,y,color){ c.save(); c.fillStyle=color; roundedRect(c,x-24,y-20,48,34,8); c.fill(); c.strokeStyle='rgba(100,116,139,.3)'; c.stroke(); c.restore(); }
  function drawMat(c,x,y,wid,hei){ c.save(); c.fillStyle='#fcd34d'; roundedRect(c,x-wid/2,y-hei/2,wid,hei,12); c.fill(); c.fillStyle='rgba(120,53,15,.25)'; for(let i=0;i<12;i++){ c.beginPath(); c.arc(x-wid/2+12+i*8,y+Math.sin(i)*9,3,0,Math.PI*2); c.fill(); } c.restore(); }
  function drawShade(c,x,y,wid,hei){ c.save(); c.fillStyle='rgba(34,197,94,.55)'; c.beginPath(); c.ellipse(x,y,wid/2,hei/2,0,0,Math.PI*2); c.fill(); c.strokeStyle='#92400e'; c.lineWidth=6; c.beginPath(); c.moveTo(x,y+hei/2); c.lineTo(x,y+hei*2); c.stroke(); c.restore(); }
  function drawRope(c,x,y1,y2,t){ c.save(); c.strokeStyle='#92400e'; c.lineWidth=5; c.setLineDash([8,7]); c.beginPath(); c.moveTo(x,y1); c.quadraticCurveTo(x+Math.sin(t)*18,(y1+y2)/2,x,y2); c.stroke(); c.setLineDash([]); c.restore(); }
  function drawThermo(c,x,y){ c.save(); c.fillStyle='rgba(255,255,255,.74)'; roundedRect(c,x-12,y-48,24,96,12); c.fill(); c.fillStyle='#ef4444'; roundedRect(c,x-5,y-28,10,62,5); c.fill(); c.beginPath(); c.arc(x,y+38,13,0,Math.PI*2); c.fill(); c.restore(); }

  return Object.freeze({
    roundedRect,
    ellipseGradient,
    drawEye,
    drawSoftShadow,
    drawCareBadge,
    drawSeaPlant,
    drawOrnament,
    drawRockCave,
    drawRock,
    drawShrimp,
    drawSnail,
    drawWheel,
    drawHouse,
    drawPerch,
    drawHangingToy,
    drawBranch,
    drawLeafCluster,
    drawWindow,
    drawCatTree,
    drawDogBed,
    drawFish,
    drawFoodPellets,
    drawSeed,
    drawCookie,
    drawCarrot,
    drawFruitSnack,
    drawSunSpot,
    drawLeafSnack,
    drawBall,
    drawHearts,
    drawZzz,
    drawBridge,
    drawTunnel,
    drawStick,
    drawLamp,
    drawVine,
    drawSwing,
    drawLadder,
    drawMirror,
    drawCatTowerExtra,
    drawWaterFountain,
    drawLeash,
    drawCone,
    drawPlatform,
    drawHayRack,
    drawBlock,
    drawMat,
    drawShade,
    drawRope,
    drawThermo
  });
});
