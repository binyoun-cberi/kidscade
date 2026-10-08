(function(){
'use strict';

// Typography is the game art: every word remains a stationary letter tower.
// Geometry, moving mechanisms, highlights and effect colors distinguish roles.
// All drawings are vector operations on a shared Canvas2D; no image downloads.
const PI=Math.PI,TAU=2*PI;
function stroke(c,color,width=2){c.strokeStyle=color;c.lineWidth=width}
function poly(c,points,fill){c.beginPath();c.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))c.lineTo(p[0],p[1]);c.closePath();if(fill){c.fillStyle=fill;c.fill()}else c.stroke()}
function disc(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill()}
function line(c,x,y,x2,y2){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke()}
function star(c,n,inner,outer,phase=0){c.beginPath();for(let i=0;i<n*2;i++){const a=phase+i*PI/n,r=i%2?inner:outer;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)c.moveTo(x,y);else c.lineTo(x,y)}c.closePath()}
function symbol(c,role,r,t,word){
  const s=r*.45,phase=t*.95; c.save();c.translate(r*.03,-r*.97);
  // These are still towers: the symbol only conveys the English word's meaning.
  if(word==='COW'){
    c.fillStyle='#fff';c.fillRect(-s*.65,-s*.5,s*1.3,s*.95);
    poly(c,[[-s*.65,-s*.28],[-s*.97,-s*.8],[-s*.2,-s*.52]],'#fff6ed');
    poly(c,[[s*.65,-s*.28],[s*.97,-s*.8],[s*.2,-s*.52]],'#fff6ed');
    disc(c,-s*.27,-s*.1,s*.09,'#252b2e');disc(c,s*.27,-s*.1,s*.09,'#252b2e');
    c.fillStyle='#f4b5b9';c.fillRect(-s*.36,s*.18,s*.72,s*.26);
    c.restore();return;
  }
  if(word==='FIGHT'){
    c.fillStyle='#fff5df';
    c.fillRect(-s*.62,-s*.37,s*1.02,s*.86);
    c.fillRect(s*.30,-s*.65,s*.35,s*.60);
    c.fillStyle='#df6251';c.fillRect(-s*.5,s*.3,s*.95,s*.22);
    c.restore();return;
  }
  if(word==='NUKE'){
    disc(c,0,0,s*.90,'#ffdf67');disc(c,0,0,s*.30,'#212830');
    for(let i=0;i<3;i++){
      c.save();c.rotate(i*Math.PI*2/3+Math.PI*.25);
      c.beginPath();c.moveTo(0,-s*.32);c.arc(0,0,s*.79,-Math.PI*.57,-Math.PI*.43);
      c.closePath();c.fillStyle='#212830';c.fill();c.restore();
    }
    c.restore();return;
  }
  switch(role){
    case 'rapid':
      stroke(c,'#fff3d7',2.5);line(c,-s*.6,0,s*.6,0);poly(c,[[s*.85,0],[s*.1,-s*.45],[s*.1,s*.45]],'#fff3d7');break;
    case 'pierce':
      stroke(c,'#fff3d7',2.5);line(c,-s*.9,s*.7,s*.6,-s*.7);poly(c,[[s*.7,-s*.8],[s*.05,-s*.54],[s*.5,-s*.05]],'#fff3d7');break;
    case 'burst':
      c.fillStyle='#fff3d7';c.fillRect(-s*.8,-s*.27,s*1.45,s*.54);c.fillStyle='#273138';c.fillRect(s*.28,-s*.17,s*.55,s*.34);break;
    case 'explosive':
      stroke(c,'#fff3d7',2.2);c.beginPath();c.arc(0,0,s*.65,0,TAU);c.stroke();
      for(let j=0;j<4;j++){const a=phase+j*PI/2;line(c,Math.cos(a)*s*.85,Math.sin(a)*s*.85,Math.cos(a)*s*1.1,Math.sin(a)*s*1.1)}break;
    case 'beam':
      c.rotate(phase*.3);poly(c,[[0,-s],[s*.9,s*.7],[-s*.9,s*.7]],'#fff0ff');
      stroke(c,'#8a60c8',1.5);line(c,0,-s,0,s*.45);break;
    case 'burn':
      poly(c,[[0,-s],[s*.65,-s*.12],[s*.3,s*.7],[-s*.12,s],[-s*.7,s*.2]],'#fff0b0');
      poly(c,[[0,-s*.4],[s*.2,s*.3],[-s*.18,s*.55]],'#ff6838');break;
    case 'slow':
      stroke(c,'#fff',2);
      for(let j=0;j<3;j++){c.save();c.rotate(j*PI/3);line(c,0,-s*.93,0,s*.93);line(c,-s*.18,-s*.63,0,-s*.45);line(c,s*.18,-s*.63,0,-s*.45);c.restore()}break;
    case 'poison':
      poly(c,[[0,-s*.9],[s*.5,-s*.2],[s*.56,s*.3],[0,s*.85],[-s*.56,s*.3],[-s*.5,-s*.2]],'#e5ffb7');disc(c,0,s*.15,s*.18,'#4b9850');break;
    case 'push':
      stroke(c,'#e4fff8',2.3);for(let j=-1;j<=1;j++){c.beginPath();c.arc(-s*.2,j*s*.3,s*.5,-PI*.55,PI*.55);c.stroke()}break;
    case 'gravity':
      stroke(c,'#fff',2);c.save();c.rotate(phase*.5);c.scale(1,.45);c.beginPath();c.arc(0,0,s*.95,0,TAU);c.stroke();c.restore();disc(c,0,0,s*.36,'#fff');break;
    case 'barrier':
      stroke(c,'#fff',2.6);c.strokeRect(-s*.63,-s*.63,s*1.26,s*1.26);c.strokeRect(-s*.34,-s*.34,s*.68,s*.68);break;
    case 'resource':
      poly(c,[[0,-s*.9],[s*.65,-s*.15],[s*.42,s*.75],[-s*.45,s*.75],[-s*.68,-s*.15]],'#ebffbd');
      stroke(c,'#52883e',1.5);line(c,0,-s*.9,0,s*.7);break;
    case 'repair':
      c.fillStyle='#fff';c.fillRect(-s*.2,-s*.88,s*.4,s*1.76);c.fillRect(-s*.88,-s*.2,s*1.76,s*.4);break;
    case 'modifier':
      c.rotate(phase*.25);star(c,4,s*.35,s*.95,PI/4);c.fillStyle='#fff7c9';c.fill();break;
    case 'special':
      c.rotate(phase*.22);star(c,6,s*.4,s*.98);c.fillStyle='#fff';c.fill();break;
    default:disc(c,0,0,s*.6,'#fff');
  }
  c.restore();
}
function towerHardware(c,mode,r,phase,pulse){
  if(!mode)return;
  const x=r*.67,y=-r*.37;
  c.save();c.translate(x,y);
  const metallic='#324452',shine='#fff8d5',energy='#f8c965';
  if(['rail','shotgun','gatling','volley','homing'].includes(mode)){
    c.fillStyle=metallic;c.fillRect(-r*.12,-r*.19,r*.28,r*.4);
    const barrels=mode==='shotgun'?3:mode==='gatling'?4:mode==='volley'?2:1;
    for(let i=0;i<barrels;i++){
      const spread=(i-(barrels-1)/2)*r*.13;
      c.fillStyle=mode==='rail'?'#e7eeff':'#3a4651';
      c.fillRect(r*.04,-r*.10+spread,r*(mode==='rail'?.65:.42),r*.075);
      c.fillStyle=shine;c.fillRect(r*.36,-r*.09+spread,r*.10,r*.028);
    }
    if(mode==='gatling'){c.fillStyle=energy;disc(c,0,0,r*.09,energy)}
    if(mode==='homing'){poly(c,[[r*.47,-r*.18],[r*.79,0],[r*.47,r*.18]],'#f47f62')}
  }else if(['mine','cluster','meteor','nuke','firefield','lavafield'].includes(mode)){
    const rr=mode==='nuke'?r*.35:r*.22;
    disc(c,0,0,rr,mode==='nuke'?'#ed6438':'#f4bd65');
    stroke(c,'#fff8cf',2);
    c.beginPath();c.arc(0,0,rr*(.68+.20*Math.sin(phase*4)),0,TAU);c.stroke();
    if(mode==='meteor')poly(c,[[rr*.2,-rr*.65],[rr*.9,-rr*1.8],[-rr*.5,-rr*.7]],'#ffb353');
  }else if(['flamethrower','blizzard','freeze','webpoison','infection','corrosion'].includes(mode)){
    for(let i=0;i<3;i++){
      const a=phase*(mode==='freeze'?-1:1)+(i*TAU/3);
      disc(c,Math.cos(a)*r*.20,Math.sin(a)*r*.20,r*.065,
        mode==='freeze'||mode==='blizzard'?'#eafcff':mode==='infection'?'#b5fb89':'#ffe1aa');
    }
  }else if(['vortex','teleport','tidal'].includes(mode)){
    c.save();c.rotate(phase*.7);c.scale(1,.55);
    stroke(c,'#f4d8ff',2);c.beginPath();c.arc(0,0,r*.28,0,TAU);c.stroke();
    c.beginPath();c.arc(0,0,r*.14,0,TAU);c.stroke();c.restore();
  }else if(mode==='drill'){
    poly(c,[[r*.05,-r*.30],[r*.34,0],[r*.05,r*.30],[-r*.20,0]],'#dfebef');
    stroke(c,'#647c91',2);line(c,-r*.15,-r*.15,r*.22,r*.15);
  }else if(mode==='interest'){
    disc(c,0,-r*.10,r*.19,'#f9dc74');disc(c,0,r*.06,r*.19,'#c89e42');
    c.fillStyle='#fff7c9';c.font='900 '+r*.22+'px sans-serif';c.textAlign='center';c.fillText('$',0,r*.05);
  }else if(['hospital','bandage'].includes(mode)){
    c.fillStyle='#f5fff1';c.fillRect(-r*.07,-r*.25,r*.15,r*.52);c.fillRect(-r*.25,-r*.06,r*.52,r*.15);
  }else if(['cleave','stun','assassin'].includes(mode)){
    c.rotate(mode==='cleave'?Math.sin(phase*2)*.22:-.45);
    stroke(c,shine,3);line(c,-r*.14,r*.26,r*.22,-r*.22);
    if(mode==='stun')disc(c,r*.21,-r*.23,r*.14,'#f6dc88');
  }
  if(pulse>0){c.globalAlpha=Math.min(.6,pulse*2);disc(c,0,0,r*.27,'#fff1ba')}
  c.restore();
}
function drawTower(c,t,r,clock){
  const role=t.def.role;
  const animate=clock+(t.id||0)*.63;
  const busy=(t.pulse||0)>0;
  c.save();
  // Soft range glow is intentionally subtle: the word label remains primary.
  if(['slow','gravity','modifier','resource','repair'].includes(role)){
    c.globalAlpha=.13+.045*Math.sin(animate*2);
    disc(c,0,r*.15,r*.95,t.def.color);c.globalAlpha=1;
  }
  c.fillStyle='rgba(35,38,43,.19)';c.beginPath();c.ellipse(r*.13,r*.95,r*.82,r*.27,-.1,0,TAU);c.fill();
  const height=r*1.53,top=-r*.72,width=r*1.08;
  poly(c,[[-width*.5,top],[width*.5,top],[width*.8,top-r*.18],[-width*.19,top-r*.18]],'#fff2');
  poly(c,[[width*.5,top],[width*.8,top-r*.18],[width*.8,top+height-r*.14],[width*.5,top+height]],'#272e38');
  const gradient=c.createLinearGradient(-width*.5,top,width*.55,top+height);
  gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.06,t.def.color);gradient.addColorStop(1,t.def.color);
  c.fillStyle=gradient;c.fillRect(-width*.5,top,width,height);
  c.fillStyle='rgba(255,255,255,.25)';c.fillRect(-width*.39,top+r*.1,width*.18,height-r*.23);
  c.fillStyle='rgba(23,27,37,.24)';c.fillRect(width*.31,top+r*.07,width*.12,height-r*.15);
  // Dark central panel, oversized readable first letter.
  c.fillStyle='rgba(25,31,39,.25)';c.fillRect(-width*.42,top+height*.30,width*.84,height*.48);
  c.font='1000 '+Math.max(16,r*.83)+'px system-ui,sans-serif';
  c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';
  c.shadowColor='rgba(0,0,0,.24)';c.shadowBlur=2;c.fillText(t.word[0],0,r*.05);
  c.shadowBlur=0;
  towerHardware(c,t.stats?.mode||'',r,animate,t.pulse||0);
  // Mechanical badge and role pictogram sit above the letter, not on top of it.
  disc(c,0,-r*.96,r*.30,'#27313a');symbol(c,role,r,animate,t.word);
  if(busy){
    c.globalAlpha=.4+.55*Math.min(1,t.pulse/.25);
    stroke(c,'#fff6d2',2.5);c.beginPath();c.arc(0,0,r*(1.03+(.28-t.pulse)*1.2),0,TAU);c.stroke();
    c.globalAlpha=1;
  }
  if((t.level||1)>1){
    stroke(c,'#ffe3a0',2.4);c.strokeRect(-width*.5,top,width,height);
    const count=Math.min(3,t.level||1);
    for(let i=0;i<count;i++)disc(c,-width*.29+i*width*.29,top+r*.10,r*.045,'#fff1ac');
  }
  if(t.combos?.length){c.fillStyle='#ffcc65';c.beginPath();c.arc(r*.67,-r*.35,r*.20,0,TAU);c.fill();stroke(c,'#523a13',1);c.stroke();}
  if(t.links?.length){disc(c,-r*.63,r*.58,r*.16,'#dffdf5');}
  c.restore();
}
function drawShot(c,s,W,H,clock){
  const x=s.x*W,y=s.y*H;
  const role=s.kind;
  const radius=role==='explosive'||role==='burst'||role==='special'?6:3.5;
  c.save();c.translate(x,y);
  if(s.source?.word==='COW'){
    disc(c,0,0,5,'#ffffff');disc(c,-1,-2,1.6,'#bfdbe9');
    c.restore();return;
  }
  if(s.source?.word==='NUKE'){
    disc(c,0,0,7,'#ffd747');disc(c,0,0,4,'#fa6b2b');
    c.restore();return;
  }
  c.shadowColor=s.color;c.shadowBlur=8;
  if(s.mode==='homing'){
    const a=Math.atan2((s.target?.y||s.y)-s.y,(s.target?.x||s.x)-s.x);
    c.rotate(a);
    poly(c,[[9,0],[-7,-5],[-4,0],[-7,5]],'#f6e4be');
    disc(c,-7,0,3,'#ef6b42');c.restore();return;
  }
  if(s.mode==='cluster'){
    disc(c,0,0,6,'#f4a35f');
    for(let i=0;i<3;i++)disc(c,Math.cos(i*TAU/3)*4,Math.sin(i*TAU/3)*4,1.5,'#fff2d1');
    c.restore();return;
  }
  if(role==='slow'){
    c.rotate(clock*4);stroke(c,'#d9f6ff',2);poly(c,[[0,-7],[5,0],[0,7],[-5,0]],'#c8f3ff');c.stroke();
  }else if(role==='burn'){
    poly(c,[[0,-8],[6,-1],[4,5],[-4,6],[-6,0]],'#ffda61');disc(c,1,0,2,'#ff603d');
  }else if(role==='poison'){
    disc(c,0,0,5,'#caff71');disc(c,-1,-2,2,'#387c36');
  }else if(role==='burst'||role==='explosive'||role==='special'){
    disc(c,0,0,radius,s.color);stroke(c,'#fff0b0',1.5);c.beginPath();c.arc(0,0,3,0,TAU);c.stroke();
  }else{
    stroke(c,s.color,3);line(c,-6,3,6,-3);poly(c,[[7,-4],[2,-5],[5,1]],'#fff4cc');
  }
  c.restore();
}
window.WordSiegeVisuals={drawTower,drawShot};
})();
