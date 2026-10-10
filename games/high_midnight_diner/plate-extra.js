/* Midnight Diner v2 food illustrations: no network-dependent food textures. */
(function(){
'use strict';
const TAU=Math.PI*2;
const PLACES={
 soup:i=>({x:172+(i%3)*128,y:162+Math.floor(i/3)*89}),
 skewer:i=>({x:124+i*87,y:212+Math.sin(i*2)*5}),
 dumpling:i=>({x:171+(i%3)*129,y:157+Math.floor(i/3)*101}),
 cake:i=>i<4?({x:129+i*114,y:160}):({x:188+(i-4)*112,y:267})
};
function oval(c,x,y,rx,ry,color,stroke,w=2){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);
 if(color){c.fillStyle=color;c.fill();}
 if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}
}
function line(c,x1,y1,x2,y2,color,width=3){
 c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function mushroom(c,x,y,bad){
 oval(c,x,y,28,19,bad?'#715181':'#aea073','#d3c49d',2);
 c.strokeStyle=bad?'#ecceff':'#6e6548';c.lineWidth=3;
 c.beginPath();c.arc(x,y,17,Math.PI*1.05,Math.PI*1.92);c.stroke();
 if(bad)for(let k=0;k<2;k++)line(c,x-13,y+k*8,x+13,y+k*8,'#e7ceef',3);
}
function bean(c,x,y,bad){
 oval(c,x,y,30,29,'#ac7c51','#e3b181',2);
 oval(c,x-11,y,10,9,bad?'#3d779d':'#6d956b','#c9c5a6',2);
 if(bad)oval(c,x+11,y,10,9,'#3d779d','#a9cbe1',2);
}
function dumpling(c,x,y,bad){
 c.save();c.translate(x,y);
 c.fillStyle='#d9bd8a';c.strokeStyle='#9a815c';c.lineWidth=3;
 c.beginPath();c.moveTo(-42,19);c.quadraticCurveTo(-39,-32,0,-31);c.quadraticCurveTo(39,-32,42,19);
 c.quadraticCurveTo(0,35,-42,19);c.fill();c.stroke();
 for(let k=-2;k<=2;k++)line(c,k*12,-12,k*9,15,'#b49a71',2);
 if(bad){for(let k=-1;k<=1;k++)line(c,k*13-5,-20,k*13+5,-4,'#272322',3);}
 else line(c,-6,-16,5,-13,'#b07a4d',3);
 c.restore();
}
function cake(c,x,y,bad){
 c.save();c.translate(x,y);
 c.fillStyle='#b57c62';c.strokeStyle='#eac19e';c.lineWidth=3;
 c.beginPath();c.moveTo(-42,30);c.lineTo(0,-37);c.lineTo(42,30);c.quadraticCurveTo(0,43,-42,30);c.fill();c.stroke();
 c.beginPath();c.moveTo(-36,20);c.lineTo(0,-31);c.lineTo(36,20);c.closePath();c.fillStyle='#d5b99d';c.fill();
 line(c,-24,14,24,14,'#f3dbc2',5);
 if(bad){
  for(const [a,b] of [[-14,7],[14,7],[0,-13],[0,22]]){
   c.beginPath();c.moveTo(a,b-6);c.lineTo(a+5,b);c.lineTo(a,b+6);c.lineTo(a-5,b);c.closePath();
   c.fillStyle='#e3eeef';c.fill();c.strokeStyle='#899ca6';c.stroke();
  }
 }else oval(c,1,3,6,5,'#9d714f');
 c.restore();
}
function draw(c,dish,selected){
 const id=dish.spec.id,position=PLACES[id];if(!position)return;
 if(id==='soup'){
  oval(c,300,210,207,131,'#3b3d30','#868365',5);
  oval(c,300,209,190,115,'#665c3b');
  for(let k=0;k<15;k++){const x=120+(k*79)%351,y=128+(k*29)%155;oval(c,x,y,12,4,'#88926366');}
 }
 if(id==='skewer'){
  line(c,73,215,537,215,'#b9a06e',12);
  line(c,73,217,537,217,'#796348',3);
 }
 for(const z of dish.zones){
  if(z.removed)continue;
  const p=position(z.id),x=p.x,y=p.y;
  if(id==='soup'){oval(c,x,y,41,32,'#7c7250','#b1a074',3);mushroom(c,x,y,z.dangerous);}
  else if(id==='skewer')bean(c,x,y,z.dangerous);
  else if(id==='dumpling')dumpling(c,x,y,z.dangerous);
  else if(id==='cake')cake(c,x,y,z.dangerous);
  if(selected===z.id||z.inspected){
   oval(c,x,y,id==='cake'?45:48,id==='cake'?44:41,null,
    z.inspected?(z.dangerous?'#ea7062':'#98d19b'):'#fff2b4',4);
  }
  if(z.inspected){
   oval(c,x+30,y-27,13,13,z.dangerous?'#913f37':'#306849','#eadac1',2);
   c.fillStyle='#fff';c.font='bold 16px system-ui';c.textAlign='center';c.fillText(z.dangerous?'!':'✓',x+30,y-22);
  }
  c.fillStyle='#eaddc3';c.font='bold 16px system-ui';c.textAlign='center';
  c.shadowColor='#1a0e0a';c.shadowBlur=5;c.fillText(String(z.id+1),x,y+49);c.shadowBlur=0;
 }
}
function hit(x,y,dish){
 const position=PLACES[dish.spec.id];if(!position)return null;
 let nearest=null,min=Infinity;
 for(const z of dish.zones){const p=position(z.id);const d=Math.hypot((x-p.x),(y-p.y));if(d<min){nearest=z.id;min=d;}}
 return min<(dish.spec.id==='cake'?46:dish.spec.id==='dumpling'?48:44)?nearest:null;
}
window.MidnightDinerPlateExtra={draw,hit,PLACES};
})();