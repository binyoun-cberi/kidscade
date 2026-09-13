/* Kidscade shared pet/facility renderer.
   Merge candidate v2.
   Extracted/adapted from the current Kidscade garden/pet Canvas visual language.
   Public surface:
     KidscadePetArt.drawAnimal(ctx,id,x,y,t,action,scale,facing)
     KidscadePetArt.drawFacility(ctx,kind,x,y,t,active,scale)
*/
(function(root){
  'use strict';

  const TAU=Math.PI*2;
  const fishIds=['fish','neonTetra','platy','cory','betta'];

  function rr(c,x,y,w,h,r,fill,stroke){
    c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);
    c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();
    if(fill){c.fillStyle=fill;c.fill()} if(stroke){c.strokeStyle=stroke;c.stroke()}
  }
  function shadow(c,x,y,rx,a=.15){
    c.save();c.fillStyle=`rgba(15,23,42,${a})`;c.beginPath();c.ellipse(x,y,rx,rx*.16,0,0,TAU);c.fill();c.restore();
  }
  function eye(c,x,y,r=5,sleep=false){
    c.save();
    if(sleep){c.strokeStyle='#111827';c.lineWidth=Math.max(2,r*.28);c.lineCap='round';c.beginPath();c.arc(x,y,r*.7,.15,Math.PI-.15);c.stroke()}
    else{c.fillStyle='#111827';c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(x-r*.3,y-r*.35,r*.28,0,TAU);c.fill()}
    c.restore();
  }
  function zzz(c,x,y,t){
    c.save();c.fillStyle='#6366f1';c.font='900 16px sans-serif';c.globalAlpha=.72+.22*Math.sin(t*2);
    c.fillText('Z',x,y);c.font='900 12px sans-serif';c.fillText('Z',x+14,y-14);c.restore();
  }
  function ball(c,x,y,r,t){
    c.save();c.translate(x,y);c.rotate(t*2);c.fillStyle='#60a5fa';c.beginPath();c.arc(0,0,r,0,TAU);c.fill();
    c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.arc(0,0,r*.68,0,Math.PI);c.stroke();c.restore();
  }
  function seed(c,x,y,t){
    c.save();c.translate(x,y);c.rotate(Math.sin(t*3)*.18);c.fillStyle='#a16207';c.beginPath();c.ellipse(0,0,13,7,.6,0,TAU);c.fill();
    c.fillStyle='#fde68a';c.beginPath();c.ellipse(-3,-2,5,2,.5,0,TAU);c.fill();c.restore();
  }
  function carrot(c,x,y,t){
    c.save();c.translate(x,y);c.rotate(Math.sin(t*3)*.18);c.fillStyle='#f97316';c.beginPath();c.moveTo(-14,-5);c.lineTo(17,0);c.lineTo(-14,7);c.closePath();c.fill();
    c.strokeStyle='#166534';c.lineWidth=3;c.beginPath();c.moveTo(-14,-3);c.lineTo(-25,-12);c.moveTo(-14,2);c.lineTo(-26,2);c.moveTo(-14,5);c.lineTo(-24,13);c.stroke();c.restore();
  }
  function leafSnack(c,x,y,t){
    c.save();c.translate(x,y);c.rotate(Math.sin(t*2)*.12);c.fillStyle='#65a30d';
    for(let i=0;i<3;i++){c.beginPath();c.ellipse((i-1)*9,0,10,5,(i-1)*.5,0,TAU);c.fill()}c.restore();
  }
  function fruit(c,x,y,t){
    c.save();c.translate(x,y);c.fillStyle='#ef4444';c.beginPath();c.arc(0,0,8,0,TAU);c.fill();c.strokeStyle='#166534';c.lineWidth=2;c.beginPath();c.moveTo(0,-7);c.lineTo(4,-14);c.stroke();c.restore();
  }
  function cookie(c,x,y){
    c.save();c.translate(x,y);c.fillStyle='#d97706';c.beginPath();c.arc(0,0,11,0,TAU);c.fill();c.fillStyle='#78350f';
    for(let i=0;i<4;i++){c.beginPath();c.arc(Math.cos(i*1.7)*5,Math.sin(i*1.5)*4,1.6,0,TAU);c.fill()}c.restore();
  }
  function wheel(c,x,y,r,t){
    c.save();c.translate(x,y);c.strokeStyle='rgba(100,116,139,.58)';c.lineWidth=6;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();
    c.lineWidth=2;for(let i=0;i<8;i++){const a=t*2+i*Math.PI/4;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.stroke()}c.restore();
  }
  function hangingToy(c,x,y,r,t){
    c.save();c.strokeStyle='rgba(71,85,105,.45)';c.lineWidth=2;c.beginPath();c.moveTo(x,y-30);c.lineTo(x,y);c.stroke();
    c.fillStyle='#f59e0b';c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(x-4,y-4,r*.25,0,TAU);c.fill();c.restore();
  }

  function feline(c,kind,t,action){
    const cat=kind==='cat', body=cat?'#f59e0b':'#b45309', light=cat?'#fed7aa':'#fde68a';
    shadow(c,0,39,47,.14);
    c.fillStyle=body;c.beginPath();c.ellipse(0,7,37,29,0,0,TAU);c.fill();
    c.beginPath();c.arc(0,-24,cat?24:26,0,TAU);
    if(cat){c.moveTo(-18,-39);c.lineTo(-27,-58);c.lineTo(-7,-46);c.moveTo(18,-39);c.lineTo(27,-58);c.lineTo(7,-46)}
    c.fill();
    if(!cat){c.fillStyle='#78350f';c.beginPath();c.ellipse(-24,-25,10,20,.45,0,TAU);c.ellipse(24,-25,10,20,-.45,0,TAU);c.fill()}
    c.fillStyle=light;c.beginPath();c.ellipse(0,-13,15,11,0,0,TAU);c.fill();
    eye(c,-9,-27,4,action==='sleep');eye(c,9,-27,4,action==='sleep');
    c.fillStyle='#111827';c.beginPath();c.arc(0,-18,3.5,0,TAU);c.fill();
    c.strokeStyle='#111827';c.lineWidth=2;c.beginPath();c.arc(0,-12,7,.2,Math.PI-.2);c.stroke();
    if(cat){
      c.strokeStyle='rgba(120,53,15,.65)';c.lineWidth=1.4;[-1,1].forEach(side=>{[-1,0,1].forEach(i=>{c.beginPath();c.moveTo(side*6,-16+i*3);c.lineTo(side*(28+Math.abs(i)*3),-20+i*6);c.stroke()})});
      c.strokeStyle=body;c.lineWidth=5;c.beginPath();c.moveTo(-34,4);c.quadraticCurveTo(-57,-20,-35,-34);c.stroke();
    }else{
      c.strokeStyle=body;c.lineWidth=6;c.beginPath();c.moveTo(-34,10);c.quadraticCurveTo(-55,-8,-42,-20);c.stroke();
    }
    c.fillStyle=light;c.beginPath();c.arc(-19,17,7,0,TAU);c.arc(19,17,7,0,TAU);c.fill();
    if(action==='feed')seed(c,0,31,t); if(action==='snack')cookie(c,0,31); if(action==='play')ball(c,39,25,8,t); if(action==='sleep')zzz(c,22,-50,t);
  }

  function hamster(c,t,action){
    const jump=action==='exercise'?Math.abs(Math.sin(t*7))*8:Math.sin(t*1.8)*1.5;
    c.translate(0,-jump);shadow(c,0,34,45,.15);
    const g=c.createRadialGradient(-8,-7,3,0,8,42);g.addColorStop(0,'#fde68a');g.addColorStop(.58,'#d99a45');g.addColorStop(1,'#92400e');
    c.fillStyle=g;c.beginPath();c.ellipse(0,8,38,34,0,0,TAU);c.fill();
    c.fillStyle='#d97706';c.beginPath();c.arc(-20,-24,12,0,TAU);c.arc(20,-24,12,0,TAU);c.fill();
    c.fillStyle='#fecaca';c.beginPath();c.arc(-20,-24,6,0,TAU);c.arc(20,-24,6,0,TAU);c.fill();
    c.fillStyle='#f8c978';c.beginPath();c.arc(0,-8,27,0,TAU);c.fill();
    c.fillStyle='#fff7ed';c.beginPath();c.ellipse(0,8,18,13,0,0,TAU);c.fill();
    eye(c,-10,-12,4,action==='sleep');eye(c,10,-12,4,action==='sleep');c.fillStyle='#7c2d12';c.beginPath();c.arc(0,-5,3.5,0,TAU);c.fill();
    if(action==='feed')seed(c,0,23,t);if(action==='snack')carrot(c,0,24,t);if(action==='play')ball(c,34,20,8,t);if(action==='sleep')zzz(c,20,-36,t);
  }

  function iguana(c,t,action){
    shadow(c,-4,35,58,.12);const leg=action==='exercise'?Math.sin(t*6)*5:0;
    c.fillStyle='#4f8f28';c.beginPath();c.moveTo(-42,7);c.bezierCurveTo(-73,0,-94,8,-116,18);c.bezierCurveTo(-92,26,-66,22,-40,13);c.closePath();c.fill();
    const g=c.createLinearGradient(-25,-15,55,20);g.addColorStop(0,'#b7e279');g.addColorStop(.5,'#7cbf3d');g.addColorStop(1,'#326c18');
    c.fillStyle=g;c.beginPath();c.ellipse(-7,7,50,21,0,0,TAU);c.fill();c.beginPath();c.ellipse(36,-2,29,18,.08,0,TAU);c.fill();c.beginPath();c.ellipse(56,-1,15,11,.1,0,TAU);c.fill();
    [[-35,-15],[-24,-19],[-12,-21],[0,-22],[13,-20],[26,-17],[39,-14]].forEach((p,i)=>{c.fillStyle=i<2?'#bef264':'#f97316';c.beginPath();c.moveTo(p[0]-3,p[1]+4);c.lineTo(p[0],p[1]-8-(i%3)*2);c.lineTo(p[0]+3,p[1]+4);c.fill()});
    c.strokeStyle='#2f6b16';c.lineWidth=5;c.lineCap='round';[[-24,1],[22,-1]].forEach(([lx,p],i)=>{const m=leg*(i?1:-1);c.beginPath();c.moveTo(lx,18);c.quadraticCurveTo(lx-7+m,28,lx-18+m,34);c.stroke()});
    eye(c,51,-10,4,action==='sleep');c.fillStyle='#111827';c.beginPath();c.arc(63,-3,1.7,0,TAU);c.fill();
    if(action==='feed')leafSnack(c,-3,34,t);if(action==='snack')fruit(c,-2,34,t);if(action==='sleep')zzz(c,29,-38,t);
  }

  function parrot(c,t,action){
    const flap=action==='exercise'?Math.sin(t*12)*8:Math.sin(t*2)*2;
    shadow(c,0,50,38,.12);c.fillStyle='#16a34a';c.beginPath();c.ellipse(0,10,25,33,-.08,0,TAU);c.fill();
    c.fillStyle='#2563eb';c.beginPath();c.ellipse(-19,10,11,26,-.55+flap*.02,0,TAU);c.fill();
    c.fillStyle='#ef4444';c.beginPath();c.ellipse(19,10,11,26,.55-flap*.02,0,TAU);c.fill();
    c.fillStyle='#22c55e';c.beginPath();c.arc(0,-23,20,0,TAU);c.fill();
    c.fillStyle='#facc15';c.beginPath();c.moveTo(15,-21);c.lineTo(30,-15);c.lineTo(16,-9);c.closePath();c.fill();
    eye(c,-5,-27,4,action==='sleep');c.fillStyle='#dc2626';c.beginPath();c.ellipse(0,-42,10,5,0,0,TAU);c.fill();
    c.fillStyle='#0f766e';c.beginPath();c.moveTo(-8,40);c.lineTo(-3,68);c.lineTo(6,40);c.lineTo(15,66);c.lineTo(10,38);c.closePath();c.fill();
    c.strokeStyle='#92400e';c.lineWidth=4;c.beginPath();c.moveTo(-27,49);c.lineTo(28,45);c.stroke();
    if(action==='feed')seed(c,25,2,t);if(action==='play')hangingToy(c,31,-34,7,t);if(action==='sleep')zzz(c,17,-48,t);
  }

  function rabbit(c,t,action){
    const bounce=action==='exercise'?Math.abs(Math.sin(t*5))*12:Math.sin(t*2)*1.4;c.translate(0,-bounce);shadow(c,0,39,45,.13);
    c.fillStyle='#f8fafc';c.beginPath();c.ellipse(0,11,35,28,0,0,TAU);c.fill();
    c.beginPath();c.ellipse(-12,-41,8,31,-.18,0,TAU);c.ellipse(12,-41,8,31,.18,0,TAU);c.fill();
    c.fillStyle='#fecaca';c.beginPath();c.ellipse(-12,-41,3.5,22,-.18,0,TAU);c.ellipse(12,-41,3.5,22,.18,0,TAU);c.fill();
    c.fillStyle='#f8fafc';c.beginPath();c.arc(0,-12,23,0,TAU);c.fill();eye(c,-8,-17,4,action==='sleep');eye(c,8,-17,4,action==='sleep');
    c.fillStyle='#fb7185';c.beginPath();c.arc(0,-9,3,0,TAU);c.fill();c.fillStyle='#f8fafc';c.beginPath();c.arc(23,10,9,0,TAU);c.fill();
    if(action==='feed')leafSnack(c,0,30,t);if(action==='snack')carrot(c,0,31,t);if(action==='play')ball(c,35,26,7,t);if(action==='sleep')zzz(c,20,-49,t);
  }

  function turtle(c,t,action){
    const walk=action==='exercise'?Math.sin(t*2)*10:0;c.translate(walk,0);shadow(c,0,33,50,.13);
    c.fillStyle='#65a30d';c.beginPath();c.ellipse(0,5,37,25,0,0,TAU);c.fill();
    const g=c.createRadialGradient(-8,-8,4,0,0,38);g.addColorStop(0,'#d9f99d');g.addColorStop(.55,'#84cc16');g.addColorStop(1,'#3f6212');
    c.fillStyle=g;c.beginPath();c.ellipse(0,0,35,23,0,0,TAU);c.fill();c.strokeStyle='rgba(63,98,18,.48)';c.lineWidth=2;
    [-18,-9,0,9,18].forEach((x,i)=>{c.beginPath();c.moveTo(x,-18);c.lineTo(x*.6,18);c.stroke()});
    c.fillStyle='#86efac';c.beginPath();c.ellipse(42,-3,16,11,.1,0,TAU);c.fill();eye(c,47,-8,3,action==='sleep');
    c.fillStyle='#86efac';[-26,-10,13,28].forEach((lx,i)=>{c.beginPath();c.ellipse(lx,23,10,6,i%2?-.4:.4,0,TAU);c.fill()});
    if(action==='feed')leafSnack(c,28,25,t);if(action==='snack')carrot(c,26,25,t);if(action==='sleep')zzz(c,28,-30,t);
  }

  function hoofed(c,kind,t,action){
    const pig=kind==='miniPig';const body=pig?'#f9a8d4':'#f8fafc';
    shadow(c,0,40,54,.13);c.fillStyle=body;c.beginPath();c.ellipse(-7,7,41,25,0,0,TAU);c.fill();c.beginPath();c.ellipse(32,-5,21,17,.05,0,TAU);c.fill();
    if(!pig){
      c.fillStyle='#a16207';c.beginPath();c.moveTo(25,-21);c.quadraticCurveTo(18,-42,31,-44);c.lineTo(36,-22);c.moveTo(40,-21);c.quadraticCurveTo(52,-41,43,-45);c.lineTo(38,-22);c.fill();
    }else{
      c.fillStyle='#f472b6';c.beginPath();c.ellipse(48,-2,10,7,0,0,TAU);c.fill();c.fillStyle='#be185d';c.beginPath();c.arc(45,-2,1.5,0,TAU);c.arc(51,-2,1.5,0,TAU);c.fill();
    }
    eye(c,36,-11,3.7,action==='sleep');
    c.strokeStyle=pig?'#be185d':'#475569';c.lineWidth=4;c.lineCap='round';[-28,-10,10,27].forEach((lx,i)=>{const m=action==='exercise'?Math.sin(t*5+i)*3:0;c.beginPath();c.moveTo(lx,24);c.lineTo(lx+m,42);c.stroke()});
    if(pig){c.strokeStyle='#f472b6';c.lineWidth=3;c.beginPath();c.arc(-49,4,8,0,Math.PI*1.8);c.stroke()}
    if(action==='feed')leafSnack(c,16,34,t);if(action==='snack')fruit(c,17,34,t);if(action==='play')ball(c,-44,30,8,t);if(action==='sleep')zzz(c,40,-37,t);
  }

  function sugarGlider(c,t,action){
    const glide=action==='exercise'?Math.sin(t*3)*20:0;c.translate(glide,Math.sin(t*2)*2);shadow(c,0,48,40,.12);
    c.fillStyle='rgba(148,163,184,.62)';c.beginPath();c.moveTo(-30,-2);c.quadraticCurveTo(-55,22,-23,30);c.lineTo(23,30);c.quadraticCurveTo(55,22,30,-2);c.closePath();c.fill();
    const g=c.createRadialGradient(-5,-9,4,0,5,34);g.addColorStop(0,'#f8fafc');g.addColorStop(.55,'#94a3b8');g.addColorStop(1,'#475569');
    c.fillStyle=g;c.beginPath();c.ellipse(0,6,27,32,0,0,TAU);c.fill();
    c.fillStyle='#94a3b8';c.beginPath();c.arc(-15,-24,10,0,TAU);c.arc(15,-24,10,0,TAU);c.fill();
    c.fillStyle='#f8fafc';c.beginPath();c.arc(0,-17,20,0,TAU);c.fill();eye(c,-8,-21,4,action==='sleep');eye(c,8,-21,4,action==='sleep');
    c.fillStyle='#111827';c.beginPath();c.arc(0,-14,3,0,TAU);c.fill();c.strokeStyle='#475569';c.lineWidth=4;c.beginPath();c.moveTo(4,34);c.quadraticCurveTo(18,58,42,52);c.stroke();
    if(action==='feed')seed(c,0,28,t);if(action==='snack')fruit(c,0,28,t);if(action==='play')hangingToy(c,37,-34,6,t);if(action==='sleep')zzz(c,18,-38,t);
  }

  const fishPalette={
    fish:{body:'#f59e0b',light:'#fde68a',dark:'#d97706',tail:'#f97316',pattern:'spot'},
    neonTetra:{body:'#38bdf8',light:'#dbeafe',dark:'#0369a1',tail:'#ef4444',pattern:'stripe'},
    platy:{body:'#fb7185',light:'#fecdd3',dark:'#be123c',tail:'#f97316',pattern:'spot'},
    cory:{body:'#94a3b8',light:'#e2e8f0',dark:'#475569',tail:'#64748b',pattern:'dot'},
    betta:{body:'#8b5cf6',light:'#ddd6fe',dark:'#4c1d95',tail:'#c084fc',pattern:'fan'}
  };
  function fish(c,id,t,action){
    const f=fishPalette[id]||fishPalette.fish;c.rotate(Math.sin(t*1.7)*.04);shadow(c,0,22,35,.10);
    const g=c.createLinearGradient(-30,-15,30,18);g.addColorStop(0,f.light);g.addColorStop(.55,f.body);g.addColorStop(1,f.dark);
    c.fillStyle=g;c.beginPath();c.ellipse(0,0,36,18,0,0,TAU);c.fill();
    c.fillStyle=f.tail;c.beginPath();c.moveTo(-31,0);c.lineTo(-53,-18+Math.sin(t*7)*3);c.quadraticCurveTo(-46,0,-53,18-Math.sin(t*7)*3);c.closePath();c.fill();
    if(f.pattern==='stripe'){c.fillStyle='#ef4444';c.fillRect(-8,-13,5,26);c.fillStyle='#dbeafe';c.fillRect(-2,-12,3,24)}
    if(f.pattern==='dot'){c.fillStyle='#111827';c.beginPath();c.arc(15,5,3,0,TAU);c.fill()}
    if(f.pattern==='spot'){c.fillStyle='rgba(255,255,255,.5)';[-8,2,10].forEach((x,i)=>{c.beginPath();c.arc(x,5-i*3,2.5,0,TAU);c.fill()})}
    if(f.pattern==='fan'){c.globalAlpha=.75;c.beginPath();c.ellipse(-45,0,24,19,0,0,TAU);c.fill();c.globalAlpha=1}
    eye(c,21,-7,4,action==='sleep');
  }

  function drawAnimal(c,id,x,y,t=0,action='idle',scale=1,facing=1){
    c.save();c.translate(x,y);c.scale((facing||1)*scale,scale);
    if(id==='dog'||id==='cat')feline(c,id,t,action);
    else if(id==='hamster')hamster(c,t,action);
    else if(id==='iguana')iguana(c,t,action);
    else if(id==='parrot')parrot(c,t,action);
    else if(id==='rabbit')rabbit(c,t,action);
    else if(id==='turtle')turtle(c,t,action);
    else if(id==='goat'||id==='miniPig')hoofed(c,id,t,action);
    else if(id==='sugarGlider')sugarGlider(c,t,action);
    else if(fishIds.includes(id))fish(c,id,t,action);
    c.restore();
  }

  function drawFacility(c,kind,x,y,t=0,active=false,scale=1){
    c.save();c.translate(x,y);c.scale(scale,scale);
    if(kind==='water'){
      shadow(c,0,14,25,.10);c.fillStyle='#bae6fd';c.strokeStyle='#60a5fa';c.lineWidth=3;c.beginPath();c.ellipse(0,0,25,11,0,0,TAU);c.fill();c.stroke();
    }else if(kind==='food'){
      shadow(c,0,13,25,.10);c.fillStyle='#f59e0b';c.beginPath();c.ellipse(0,0,25,10,0,0,TAU);c.fill();c.fillStyle='#fde68a';for(let i=0;i<6;i++){c.beginPath();c.arc(-13+i*5,-2+(i%2)*3,2.5,0,TAU);c.fill()}
    }else if(kind==='bed'){
      shadow(c,0,17,42,.10);c.fillStyle='#fb7185';c.beginPath();c.ellipse(0,0,42,16,0,0,TAU);c.fill();c.fillStyle='#fecdd3';c.beginPath();c.ellipse(0,-4,26,9,0,0,TAU);c.fill();
    }else if(kind==='ball')ball(c,active?Math.sin(t*2)*12:0,0,13,active?t:0);
    else if(kind==='tunnel'){
      c.fillStyle='#fbbf24';c.strokeStyle='#d97706';c.lineWidth=3;c.beginPath();c.ellipse(0,0,48,20,0,Math.PI,TAU);c.lineTo(48,8);c.lineTo(-48,8);c.closePath();c.fill();c.stroke();c.fillStyle='#78350f';c.beginPath();c.ellipse(0,5,20,12,0,Math.PI,TAU);c.fill();
    }else if(kind==='tower'){
      c.strokeStyle='#a16207';c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(0,27);c.lineTo(0,-31);c.stroke();c.fillStyle='#fbbf24';rr(c,-32,-36,64,14,6,'#fbbf24','#a16207');rr(c,-45,0,65,14,6,'#fbbf24','#a16207');
    }else if(kind==='platform'){
      c.fillStyle='#a16207';rr(c,-43,-8,86,17,8,'#a16207','#6b3f24');c.strokeStyle='#6b3f24';c.lineWidth=5;c.beginPath();c.moveTo(-30,5);c.lineTo(-30,24);c.moveTo(30,5);c.lineTo(30,24);c.stroke();
    }else if(kind==='wheel')wheel(c,0,-5,28,active?t:0);
    else if(kind==='pond'){
      c.fillStyle='#7dd3fc';c.strokeStyle='#38bdf8';c.lineWidth=3;c.beginPath();c.ellipse(0,0,68,31,0,0,TAU);c.fill();c.stroke();c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.ellipse(-18,-8,26,6,0,0,TAU);c.fill();
    }else if(kind==='flower'){
      shadow(c,0,12,28,.08);c.strokeStyle='#4f8a54';c.lineWidth=3;c.lineCap='round';
      const fs=[[-18,-2,'#ff7aa8'],[-7,-9,'#ffd257'],[5,-4,'#9d7bff'],[17,-10,'#ff8d62'],[20,2,'#6ed0ff']];
      fs.forEach(([fx,fy,col],i)=>{const sw=Math.sin(t*2+i)*1.5;c.beginPath();c.moveTo(fx,11);c.quadraticCurveTo(fx+sw,3,fx+sw,fy);c.stroke();c.fillStyle=col;for(let q=0;q<5;q++){const a=q*TAU/5;c.beginPath();c.arc(fx+sw+Math.cos(a)*3.5,fy+Math.sin(a)*3.5,2.8,0,TAU);c.fill()}});
    }else if(kind==='shadeTree'){
      shadow(c,0,25,45,.12);c.strokeStyle='#815538';c.lineWidth=11;c.lineCap='round';c.beginPath();c.moveTo(0,25);c.lineTo(-1,-32);c.stroke();
      const b=active?Math.sin(t*2)*1.6:0;[[-28,-39,22],[-7,-49,24],[17,-49,24],[35,-36,21],[-4,-28,24],[20,-29,22]].forEach(([lx,ly,r],i)=>{c.fillStyle=i%2?'#6fc46f':'#5ab663';c.beginPath();c.arc(lx,ly+b,r,0,TAU);c.fill()});
    }else if(kind==='bench'){
      c.fillStyle='#cf8c4b';c.strokeStyle='#754826';c.lineWidth=3;for(let i=0;i<3;i++)rr(c,-40,-21+i*10,80,8,3,i===1?'#bd7b42':'#cf8c4b','#754826');rr(c,-36,7,72,9,4,'#c98547','#754826');
    }else if(kind==='picnic'){
      rr(c,-45,-22,90,52,8,'#fff5e6','#d58b8b');c.globalAlpha=.22;c.fillStyle='#ef6b74';for(let xx=-35;xx<=35;xx+=18)c.fillRect(xx,-21,7,50);c.globalAlpha=1;
    }else if(kind==='hammock'){
      c.strokeStyle='#7d553a';c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(-36,22);c.lineTo(-31,-25);c.moveTo(36,22);c.lineTo(31,-25);c.stroke();
      c.strokeStyle='#f1c86f';c.lineWidth=10;c.beginPath();c.moveTo(-27,-14);c.quadraticCurveTo(0,13+(active?Math.sin(t*2)*1.5:0),27,-14);c.stroke();
    }
    c.restore();
  }

  root.KidscadePetArt={drawAnimal,drawFacility,fishIds:[...fishIds]};
})(typeof window==='undefined'?globalThis:window);
