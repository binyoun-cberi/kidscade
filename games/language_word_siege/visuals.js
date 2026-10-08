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
// Familiar silhouettes are more fun than another letter-only pillar.
// Every icon is painted on Canvas with a handful of geometry operations.
function playfulSymbol(c,word,s,phase){
  if(['MUSIC','DREAM'].includes(word)){
    c.font='900 '+s*1.65+'px system-ui,sans-serif';c.textAlign='center';
    c.textBaseline='middle';c.fillStyle='#fff6d9';c.fillText(word==='MUSIC'?'♫':'Z',0,s*.10);
  }else if(word==='GHOST'){
    disc(c,0,-s*.21,s*.66,'#f3f1ff');
    poly(c,[[-s*.66,-s*.21],[s*.66,-s*.21],[s*.66,s*.67],[s*.33,s*.43],[0,s*.65],[-s*.34,s*.44],[-s*.66,s*.67]],'#f3f1ff');
    disc(c,-s*.23,-s*.12,s*.10,'#262f40');disc(c,s*.24,-s*.12,s*.10,'#262f40');
  }else if(word==='MUSHROOM'){
    c.fillStyle='#fdf5d5';c.fillRect(-s*.20,-s*.12,s*.4,s*.86);
    c.fillStyle='#ee8b63';c.beginPath();c.ellipse(0,-s*.18,s*.90,s*.56,0,PI,TAU);c.fill();
    disc(c,-s*.3,-s*.45,s*.12,'#fff3c4');disc(c,s*.33,-s*.4,s*.11,'#fff3c4');
  }else if(word==='BUBBLE'){
    stroke(c,'#d6ffff',3);c.beginPath();c.arc(0,0,s*.77,0,TAU);c.stroke();
    disc(c,-s*.28,-s*.27,s*.18,'#ffffff');
  }else if(word==='RAINBOW'){
    for(let i=0;i<4;i++){stroke(c,['#f46b7b','#ffcf64','#84dca9','#bcb5ff'][i],2.9);
      c.beginPath();c.arc(0,s*.45,s*(1-i*.18),PI,0);c.stroke()}
  }else if(word==='MIRROR'){
    c.fillStyle='#dae8ff';c.fillRect(-s*.63,-s*.76,s*1.26,s*1.52);
    c.fillStyle='#83a9dd';poly(c,[[-s*.45,-s*.58],[s*.38,-s*.58],[-s*.44,s*.30]],'#91b6eb');
    stroke(c,'#fff6d8',2);c.strokeRect(-s*.65,-s*.78,s*1.3,s*1.56);
  }else if(word==='MAGIC'||word==='WIZARD'){
    stroke(c,'#ffecc7',3.1);line(c,-s*.45,s*.65,s*.34,-s*.42);
    c.save();c.translate(s*.36,-s*.55);star(c,5,s*.19,s*.54,-PI/2);
    c.fillStyle='#fff2ad';c.fill();c.restore();
  }else if(['RUBBER','BOUNCE','BOOMERANG'].includes(word)){
    if(word==='BOOMERANG'){
      stroke(c,'#fff4d3',5);line(c,-s*.65,s*.53,0,-s*.6);line(c,0,-s*.6,s*.69,s*.52);
    }else{
      disc(c,0,0,s*.60,word==='RUBBER'?'#f9b763':'#a7f0a3');
      stroke(c,'#fff7dd',3);c.beginPath();c.arc(-s*.2,-s*.18,s*.24,PI,TAU);c.stroke();
    }
  }else if(word==='SUN'||word==='STAR'){
    c.save();c.rotate(phase*.08);star(c,word==='STAR'?5:9,s*.49,s*.91,-PI/2);
    c.fillStyle='#fff2b2';c.fill();c.restore();
  }else if(word==='SNOW'){
    stroke(c,'#fff8f3',2.8);for(let i=0;i<3;i++){c.save();c.rotate(i*PI/3);
      line(c,-s*.77,0,s*.77,0);c.restore()}
  }else if(['SLIME','RAIN'].includes(word)){
    disc(c,0,s*.35,s*.68,word==='SLIME'?'#c3ed76':'#b4ddff');
    poly(c,[[-s*.6,s*.36],[-s*.29,-s*.50],[s*.10,-s*.30],[s*.35,-s*.68],[s*.65,s*.30]],word==='SLIME'?'#dbffa2':'#e5f4ff');
  }else if(word==='VACUUM'||word==='MAGNET'){
    stroke(c,word==='VACUUM'?'#f0d6ff':'#abf4fd',3.2);
    if(word==='VACUUM'){
      for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,s*(.3+i*.25),phase*.4+i,phase*.4+i+PI*1.2);c.stroke()}
    }else{
      c.beginPath();c.arc(0,-s*.15,s*.59,0,PI);c.stroke();
      c.fillStyle='#ed8f80';c.fillRect(-s*.69,-s*.17,s*.22,s*.46);
      c.fillStyle='#9fd0f1';c.fillRect(s*.47,-s*.17,s*.22,s*.46);
    }
  }else return false;
  return true;
}
function symbol(c,role,r,t,word){
  const s=r*.45,phase=t*.95; c.save();c.translate(r*.03,-r*.97);
  // These are still towers: the symbol only conveys the English word's meaning.
  if(playfulSymbol(c,word,s,phase)){c.restore();return}
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
  // Visually distinct machinery for the comic and magical abilities.
  if(['disco','sleep','spellbook','rainbow','shootingstars','sunray'].includes(mode)){
    c.save();c.rotate(phase*(mode==='disco'?.45:.12));
    for(let i=0;i<4;i++){
      const a=i*PI/2+phase*.5;
      disc(c,Math.cos(a)*r*.31,Math.sin(a)*r*.31,r*.085,
        ['#fbe390','#f6a5c5','#98dbe4','#bbaaee'][i]);
    }
    c.restore();
    if(mode==='disco'){disc(c,0,0,r*.20,'#b07be3');stroke(c,'#f5d9ff',2);
      c.beginPath();c.arc(0,0,r*.28,0,TAU);c.stroke()}
    if(mode==='sleep'){c.font='900 '+r*.34+'px sans-serif';c.fillStyle='#eef3ff';c.fillText('Z',-r*.1,0)}
  }else if(['pinball','spring','boomerang','bubble'].includes(mode)){
    if(mode==='spring'){
      stroke(c,'#d8fba2',3);
      for(let i=0;i<4;i++)line(c,-r*.3+i*r*.20,r*.30,-r*.24+i*r*.20,-r*.2);
    }else if(mode==='splat'){
    disc(c,0,-r*.25,r*.67,'#faad65');
    for(let i=0;i<5;i++){const ang=phase*.3+i*Math.PI*2/5;
      disc(c,Math.cos(ang)*r*.65,-r*.25+Math.sin(ang)*r*.64,r*.13,'#ffdf90')}
    disc(c,-r*.2,-r*.39,r*.09,'#fff3d8');
  }else if(mode==='firework'){
    c.fillStyle='#574675';c.fillRect(-r*.46,-r*.22,r*.92,r*.90);
    for(let j=0;j<3;j++){const angle=phase*.65+j*Math.PI*2/3;
      c.save();c.translate(Math.cos(angle)*r*.47,Math.sin(angle)*r*.47-r*.24);
      star(c,5,r*.11,r*.29,angle);c.fillStyle=['#faba6e','#ee9dd2','#a1dded'][j];c.fill();c.restore()}
    stroke(c,'#fff2c9',2);line(c,0,r*.38,0,-r*.18);
  }else if(mode==='snap'){
    c.fillStyle='#6a935f';c.fillRect(-r*.74,r*.40,r*1.48,r*.30);
    poly(c,[[-r*.66,r*.22],[-r*.40,-r*.45],[-r*.11,r*.21]],'#eaf4c3');
    poly(c,[[r*.66,r*.22],[r*.4,-r*.45],[r*.11,r*.21]],'#eaf4c3');
    disc(c,0,r*.2,r*.25,'#98cc69');
  }else if(mode==='echo'){
    for(let i=3;i>=1;i--){stroke(c,'#a5dbef',2.2);
      c.beginPath();c.arc(0,-r*.16,r*(.20+i*.22),phase*.18,phase*.18+Math.PI*1.36);c.stroke()}
    disc(c,0,-r*.14,r*.18,'#e0f3ff');
  }else if(mode==='hailstorm'){
    disc(c,0,-r*.3,r*.63,'#a7d5e8');
    for(let i=0;i<5;i++)poly(c,[[(i-2)*r*.26,r*.06],[(i-2)*r*.26+r*.12,r*.39],[(i-2)*r*.26-r*.12,r*.39]],'#e4f7ff');
  }else if(mode==='boomerang'){
      stroke(c,'#f7d99d',3);line(c,-r*.3,r*.2,0,-r*.30);line(c,0,-r*.3,r*.3,r*.2);
    }else{
      disc(c,0,0,r*.19,mode==='bubble'?'#b9faf6':'#ffb97c');
      stroke(c,'#fffae8',2);c.beginPath();c.arc(0,0,r*.26,0,TAU);c.stroke();
    }
  }else if(['spores','slimepool','raincloud','snowball'].includes(mode)){
    const colors={spores:'#a7e67b',slimepool:'#96d96c',raincloud:'#a6d9fa',snowball:'#eaf8ff'};
    disc(c,0,r*.05,r*.20,colors[mode]);
    for(let i=0;i<3;i++)disc(c,Math.sin(phase+i*2)*r*.29,-Math.cos(phase*.7+i*2)*r*.27,r*.06,colors[mode]);
  }else if(['mirror','boo','vacuum','magnet'].includes(mode)){
    if(mode==='mirror'){
      c.fillStyle='#abcdeb';c.fillRect(-r*.25,-r*.30,r*.5,r*.6);
      stroke(c,'#ffffff',2);c.strokeRect(-r*.28,-r*.33,r*.56,r*.66);
    }else if(mode==='boo'){
      disc(c,0,-r*.1,r*.23,'#ebeeff');disc(c,-r*.09,-r*.11,r*.05,'#26334b');
      disc(c,r*.09,-r*.11,r*.05,'#26334b');
    }else if(mode==='magnet'){
      stroke(c,'#b9f1f9',4);c.beginPath();c.arc(0,-r*.06,r*.28,0,PI);c.stroke();
    }else{
      c.save();c.rotate(phase);stroke(c,'#ebccff',2.3);c.beginPath();
      c.arc(0,0,r*.28,0,PI*1.65);c.stroke();c.restore();
    }
  }
  if(pulse>0){c.globalAlpha=Math.min(.6,pulse*2);disc(c,0,0,r*.27,'#fff1ba')}
  c.restore();
}
// The playful towers are *not* recolored letter pylons: each gets a recognizable
// machine / creature silhouette. Keep the letter on its own raised medallion.
const PLAYFUL_MODES=new Set(['disco','pinball','spring','bubble','mirror','boo','spellbook',
  'rainbow','boomerang','spores','slimepool','vacuum','magnet','sleep','shootingstars',
  'snowball','raincloud','sunray','splat','firework','snap','echo','hailstorm']);
function playfulTowerBody(c,t,r,phase){
  const mode=t.stats?.mode;
  if(!PLAYFUL_MODES.has(mode))return false;
  c.save();
  c.fillStyle='rgba(34,34,44,.19)';
  c.beginPath();c.ellipse(r*.09,r*.91,r*.81,r*.26,0,0,TAU);c.fill();
  const bob=Math.sin(phase*2.2)*r*.045;
  c.translate(0,bob);
  // Every shape has its own footprint but shares the original collision radius.
  if(mode==='disco'){
    disc(c,0,-r*.28,r*.73,'#7056a2');
    for(let j=0;j<7;j++)for(let i=0;i<4;i++){
      const x=(i-1.5)*r*.29,y=(j-3)*r*.20;
      if(x*x+y*y>r*r*.40)continue;
      c.fillStyle=['#e4b4ef','#9cdde4','#f5cf8d','#d0bff5'][(i+j)%4];
      c.fillRect(x-r*.075,y-r*.065,r*.14,r*.12);
    }
    disc(c,0,-r*.28,r*.27,'#52457c');
    stroke(c,'#fff3c5',2);c.beginPath();c.arc(0,-r*.28,r*.75,0,TAU);c.stroke();
  }else if(mode==='bubble'){
    c.fillStyle='#72a3bd';c.fillRect(-r*.61,r*.22,r*1.22,r*.45);
    disc(c,0,-r*.25,r*.69,'rgba(173,240,246,.48)');
    stroke(c,'#b7fcff',3);c.beginPath();c.arc(0,-r*.25,r*.68,0,TAU);c.stroke();
    disc(c,-r*.25,-r*.53,r*.14,'#fff');
    disc(c,r*.32,r*.01,r*.12,'#d3fff9');
  }else if(mode==='boo'){
    disc(c,0,-r*.40,r*.66,'#eff0ff');
    poly(c,[[-r*.65,-r*.43],[r*.65,-r*.43],[r*.65,r*.56],[r*.35,r*.28],
      [0,r*.59],[-r*.32,r*.31],[-r*.65,r*.55]],'#eff0ff');
    disc(c,-r*.23,-r*.37,r*.09,'#29344e');
    disc(c,r*.23,-r*.37,r*.09,'#29344e');
    disc(c,0,-r*.10,r*.12,'#29344e');
  }else if(mode==='mirror'){
    c.fillStyle='#334259';c.fillRect(-r*.72,-r*.77,r*1.44,r*1.47);
    c.fillStyle='#a7d3f0';c.fillRect(-r*.59,-r*.66,r*1.18,r*1.21);
    poly(c,[[-r*.50,-r*.57],[r*.41,-r*.57],[-r*.50,r*.43]],'#e2f5ff');
    stroke(c,'#fff1d3',3);c.strokeRect(-r*.72,-r*.77,r*1.44,r*1.47);
  }else if(mode==='spellbook'){
    poly(c,[[-r*.74,-r*.30],[-r*.1,-r*.51],[0,-r*.25],[r*.64,-r*.50],[r*.78,r*.50],[0,r*.32],[-r*.74,r*.53]],'#735ac5');
    poly(c,[[-r*.66,-r*.23],[-r*.06,-r*.39],[0,-r*.18],[0,r*.28],[-r*.68,r*.43]],'#f8e4c2');
    poly(c,[[0,-r*.18],[r*.6,-r*.39],[r*.67,r*.42],[0,r*.28]],'#f9edda');
    stroke(c,'#f4b853',2);line(c,0,-r*.25,0,r*.30);
    c.save();c.translate(r*.32,-r*.70);star(c,5,r*.11,r*.32,phase*.3);
    c.fillStyle='#fff9a7';c.fill();c.restore();
  }else if(mode==='spores'){
    c.fillStyle='#f9e7c6';c.fillRect(-r*.21,-r*.12,r*.42,r*.76);
    c.fillStyle='#cf674c';c.beginPath();c.ellipse(0,-r*.21,r*.78,r*.55,0,PI,TAU);c.fill();
    for(let i=0;i<4;i++)disc(c,(i-1.5)*r*.30,-r*(.45+(i%2)*.12),r*.09,'#fff0b5');
  }else if(mode==='slimepool'){
    poly(c,[[-r*.82,r*.55],[-r*.62,-r*.13],[-r*.30,-r*.63],[r*.24,-r*.68],
      [r*.67,-r*.10],[r*.83,r*.55]],'#81bd5a');
    disc(c,-r*.24,-r*.26,r*.08,'#e6f9bb');disc(c,r*.26,-r*.26,r*.08,'#e6f9bb');
  }else if(mode==='raincloud'){
    for(const [x,y,rr]of [[-.38,-.23,.40],[0,-.43,.52],[.43,-.20,.36]]){
      disc(c,x*r,y*r,rr*r,'#c0e5f2');
    }
    for(let i=0;i<3;i++){
      stroke(c,'#5e9bc1',2.5);line(c,(i-1)*r*.4,r*.27+Math.sin(phase*3+i)*r*.1,
        (i-1)*r*.4-r*.08,r*.61+Math.sin(phase*3+i)*r*.1);
    }
  }else if(mode==='snowball'){
    disc(c,0,-r*.35,r*.51,'#e3f7fe');
    disc(c,0,r*.28,r*.64,'#ccecf9');
    disc(c,-r*.18,-r*.45,r*.07,'#31475e');disc(c,r*.18,-r*.45,r*.07,'#31475e');
    poly(c,[[0,-r*.31],[r*.30,-r*.21],[0,-r*.15]],'#ed9f53');
  }else if(mode==='shootingstars'){
    c.save();c.rotate(phase*.2);star(c,5,r*.34,r*.81,-PI/2);
    c.fillStyle='#ffe28f';c.fill();stroke(c,'#fff9da',2);c.stroke();c.restore();
  }else if(mode==='sunray'){
    c.save();c.rotate(phase*.12);star(c,10,r*.51,r*.87);
    c.fillStyle='#ffc66c';c.fill();c.restore();
    disc(c,0,0,r*.51,'#ffeab0');
  }else if(mode==='rainbow'){
    c.save();c.rotate(phase*.24);
    poly(c,[[0,-r*.85],[r*.83,r*.64],[-r*.83,r*.64]],'#9bd8ef');
    for(let i=0;i<4;i++){stroke(c,['#ed6a76','#f7c469','#74dbaa','#9f8de1'][i],2.5);
      line(c,-r*.40+i*r*.20,r*.22,r*.32+i*r*.11,-r*.12)}
    c.restore();
  }else if(mode==='magnet'){
    stroke(c,'#7ed8ec',r*.25);c.beginPath();c.arc(0,-r*.09,r*.54,0,PI);c.stroke();
    c.fillStyle='#e66d59';c.fillRect(-r*.66,-r*.14,r*.27,r*.72);
    c.fillStyle='#85bcec';c.fillRect(r*.39,-r*.14,r*.27,r*.72);
  }else if(mode==='vacuum'){
    disc(c,0,-r*.13,r*.70,'#646184');
    c.save();c.rotate(phase*1.6);
    for(let i=0;i<4;i++){c.save();c.rotate(i*PI/2);poly(c,[[0,0],[r*.59,-r*.15],[r*.43,r*.21]],'#d7b5f5');c.restore()}
    c.restore();disc(c,0,-r*.13,r*.16,'#f6dbff');
  }else if(mode==='sleep'){
    disc(c,0,-r*.17,r*.68,'#b1a5ef');
    disc(c,r*.20,-r*.30,r*.57,'#f1edff');
    c.font='900 '+r*.64+'px sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='#776ab3';c.fillText('Z',-r*.08,-r*.12);
  }else if(mode==='boomerang'){
    stroke(c,'#ecc07a',r*.23);line(c,-r*.72,r*.41,0,-r*.66);line(c,0,-r*.66,r*.70,r*.42);
  }else if(mode==='spring'){
    c.fillStyle='#71968f';c.fillRect(-r*.68,r*.38,r*1.36,r*.34);
    stroke(c,'#dcf3a2',r*.17);
    for(let i=0;i<4;i++)line(c,-r*.57+i*r*.34,r*.35,-r*.40+i*r*.34,-r*.52);
    c.fillStyle='#c7eaa5';c.fillRect(-r*.65,-r*.72,r*1.30,r*.21);
  }else if(mode==='pinball'){
    disc(c,0,-r*.07,r*.67,'#ffa77c');stroke(c,'#fff3ce',3);
    c.beginPath();c.arc(0,-r*.07,r*.68,0,TAU);c.stroke();
    for(let i=0;i<3;i++)disc(c,Math.cos(phase+i*TAU/3)*r*.40,
      -r*.07+Math.sin(phase+i*TAU/3)*r*.40,r*.105,'#fff1b9');
  }
  // Single raised letter badge on all playful machines remains legible on phones.
  disc(c,0,r*.56,r*.33,'#273541');
  stroke(c,'#fdf1cb',2);c.beginPath();c.arc(0,r*.56,r*.33,0,TAU);c.stroke();
  c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';
  c.font='1000 '+r*.38+'px system-ui,sans-serif';c.fillText(t.word[0],0,r*.58);
  if(t.pulse>0){
    c.globalAlpha=Math.min(.85,(t.pulse||0)*2);
    stroke(c,'#fff7c2',3);c.beginPath();c.arc(0,-r*.10,r*(.83+t.pulse*.45),0,TAU);c.stroke();
  }
  if((t.level||1)>1){
    stroke(c,'#ffda76',2.5);c.beginPath();c.arc(0,-r*.10,r*.91,0,TAU);c.stroke();
  }
  if(t.combos?.length)disc(c,r*.67,-r*.59,r*.15,'#ffd56b');
  if(t.links?.length)disc(c,-r*.66,r*.38,r*.14,'#c0f6e6');
  c.restore();
  return true;
}
function drawTower(c,t,r,clock){
  const role=t.def.role;
  const animate=clock+(t.id||0)*.63;
  const busy=(t.pulse||0)>0;
  c.save();
  if(playfulTowerBody(c,t,r,animate)){c.restore();return}
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
  if(s.mode==='shootingstars'){
    c.rotate(clock*3+(s.source?.id||0));star(c,5,3,8,-PI/2);c.fillStyle='#ffe7a4';c.fill();
    stroke(c,'#fff8df',1.5);c.stroke();c.restore();return;
  }
  if(s.mode==='snowball'){
    const size=Math.min(11,4.8+(s.travel||0)*28);
    disc(c,0,0,size,'#e8faff');stroke(c,'#93cfe8',1.9);
    c.beginPath();c.arc(0,0,size,0,TAU);c.stroke();
    disc(c,-size*.33,-size*.3,Math.max(1.4,size*.16),'#fff');c.restore();return;
  }
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
