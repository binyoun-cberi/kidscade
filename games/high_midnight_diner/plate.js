/* Midnight Diner v8: illustrated food, shared visible and clickable shapes.
 * Danger is deliberately NOT encoded in the finished meal's appearance.
 * The player must remember which positions received forbidden ingredients.
 */
(function(root){
'use strict';
const TAU=Math.PI*2,W=600,H=420;
function oval(c,x,y,rx,ry,fill,stroke,lw=1){
 c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);
 if(fill){c.fillStyle=fill;c.fill();}
 if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
}
function grad(c,x,y,r,stops){
 const g=c.createRadialGradient(x-r*.22,y-r*.28,r*.05,x,y,r);
 for(const [at,color] of stops)g.addColorStop(at,color);
 return g;
}
function line(c,pts,color,width=2){
 c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
 c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();
}
function noise(n){let s=(n*747796405+2891336453)>>>0;s=((s>>>((s>>>28)+4))^s)*277803737>>>0;return ((s>>>22)^s)>>>0;}
function pick(n){return noise(n)/4294967296;}
function mark(c,n,x,y,selected,inspected){
 c.save();
 if(selected){oval(c,x,y,19,19,'#47311d','#fff0b3',3);}
 else oval(c,x,y,17,17,'#211c17e6',inspected?'#f3d09d':'#ddc79e',1.8);
 c.font='bold 17px system-ui';c.textAlign='center';c.textBaseline='middle';
 c.fillStyle='#fff3d4';c.fillText(String(n),x,y+1);
 if(inspected){oval(c,x+20,y-21,11,11,'#6c5636','#e6cd9b',2);c.font='bold 13px system-ui';c.fillStyle='#fff1ca';c.fillText('?',x+20,y-20);}
 c.restore();
}
function platter(c,kind){
 c.save();c.shadowColor='#000c';c.shadowBlur=29;c.shadowOffsetY=18;
 oval(c,300,215,249,168,'#85715a');c.restore();
 oval(c,300,210,250,166,grad(c,280,190,250,[[0,'#e8deca'],[.68,'#c6b89e'],[.89,'#a69a80'],[1,'#eee3c9']]),'#e8d8ba',8);
 oval(c,300,207,230,148,null,'#82735e',5);
 oval(c,300,206,217,138,kind==='soup'?'#292b29':'#c6b89b','#eee2c4',3);
 oval(c,300,205,210,132,null,'#ffffff20',2);
}
function pancake(c,d,selected){
 c.save();c.translate(300,210);c.scale(1,.68);
 for(const z of d.zones){
  if(z.removed)continue;
  const a=-Math.PI/2+z.id*TAU/8,b=a+TAU/8,m=(a+b)/2,r=188;
  c.save();c.beginPath();c.moveTo(0,0);c.arc(0,0,r,a+.008,b-.008);c.closePath();
  c.shadowColor='#3825159a';c.shadowBlur=9;c.shadowOffsetY=3;
  c.fillStyle=grad(c,Math.cos(m)*60,Math.sin(m)*60,210,[[0,'#597042'],[.64,'#67783d'],[.91,'#886c3b'],[1,'#bd8442']]);c.fill();
  c.shadowColor='transparent';c.strokeStyle='#d9ad68';c.lineWidth=4;c.stroke();c.clip();
  for(let j=0;j<32;j++){
   const h=pick(14000+z.id*337+j*31),angle=a+.03+(b-a-.06)*pick(20000+z.id*227+j*29),radius=22+166*Math.sqrt(h);
   const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
   c.save();c.translate(x,y);c.rotate(angle+j*.37);
   c.fillStyle=['#355c35','#b6b365','#e9bc6e','#c48b45','#315e3e'][j%5];
   if(j%4===0)oval(c,0,0,8,3,c.fillStyle);else c.fillRect(-7,-2,14,4);
   c.restore();
  }
  c.restore();
  if(selected===z.id){c.beginPath();c.moveTo(0,0);c.arc(0,0,r,a,b);c.closePath();c.strokeStyle='#fff0b0';c.lineWidth=8;c.stroke();}
  const x=Math.cos(m)*136,y=Math.sin(m)*136;
  c.save();c.translate(x,y);c.scale(1,1/.68);mark(c,z.id+1,0,0,selected===z.id,z.inspected);c.restore();
 }
 c.restore();
}
const POS={
 soup:i=>({x:172+(i%3)*128,y:163+Math.floor(i/3)*89}),
 skewer:i=>({x:124+i*87,y:210}),
 dumpling:i=>({x:171+(i%3)*129,y:158+Math.floor(i/3)*101}),
 cake:i=>i<4?{x:129+i*114,y:160}:{x:188+(i-4)*112,y:268}
};
function soup(c,d,selected){
 oval(c,300,208,212,133,grad(c,300,180,240,[[0,'#806b43'],[.55,'#4c4032'],[.87,'#292f29'],[1,'#241e1a']]),'#6f6855',4);
 for(let k=0;k<23;k++){
  const x=126+pick(k*41+7)*340,y=116+pick(k*23+12)*181;
  oval(c,x,y,3+pick(k*18)*12,1+pick(k*11)*4,k%3===0?'#c6ba7a55':'#99a36b48');
 }
 // Fine noodles, chopped greens, and a few oil droplets make this food
 // read as a cooked broth rather than six loose circles.
 c.save();c.strokeStyle='#c7aa7388';c.lineWidth=2.8;
 for(let k=0;k<12;k++){
  const x=159+pick(k*17+2)*270,y=146+pick(k*71+6)*111;
  c.beginPath();c.moveTo(x-17,y-3);c.bezierCurveTo(x-5,y-17,x+4,y+17,x+21,y-1);c.stroke();
 }
 c.restore();
 for(const z of d.zones){
  if(z.removed)continue;
  const p=POS.soup(z.id),x=p.x,y=p.y;
  c.save();c.shadowColor='#000a';c.shadowBlur=7;c.shadowOffsetY=4;
  oval(c,x,y,37,28,grad(c,x,y,42,[[0,'#dac69d'],[.78,'#ac936e'],[1,'#69533d']]),'#5a4c39',3);c.restore();
  // Rounded mushroom cap + underside gills, not a magic danger indicator.
  c.beginPath();c.arc(x,y+2,25,Math.PI*1.06,Math.PI*1.94);
  c.strokeStyle='#806b4c';c.lineWidth=2;c.stroke();
  for(let j=-2;j<=2;j++)line(c,[[x+j*8,y+7],[x+j*6,y+14]],'#715d45',1.7);
  oval(c,x-12,y-9,10,4,'#fae4b75e');
  if(z.garnish%2===0)line(c,[[x+15,y-5],[x+25,y-15],[x+23,y+1]],'#78906c',2);
  if(selected===z.id)oval(c,x,y,42,34,null,'#fff0bb',4);
  mark(c,z.id+1,x+25,y+23,selected===z.id,z.inspected);
 }
}
function skewer(c,d,selected){
 c.save();c.shadowColor='#0009';c.shadowBlur=6;c.shadowOffsetY=4;
 line(c,[[81,213],[531,213]],'#5b3921',15);c.restore();
 line(c,[[77,207],[536,207]],'#e2bf80',7);
 for(const z of d.zones){
  if(z.removed)continue;
  const p=POS.skewer(z.id),x=p.x,y=p.y;
  c.save();c.translate(x,y);c.rotate(Math.sin(z.rotation)*.035);
  c.shadowColor='#24170acc';c.shadowBlur=8;c.shadowOffsetY=4;
  c.beginPath();c.moveTo(-34,-24);c.quadraticCurveTo(-9,-37,22,-29);c.quadraticCurveTo(41,-9,34,17);
  c.quadraticCurveTo(8,36,-27,24);c.quadraticCurveTo(-42,0,-34,-24);c.closePath();
  c.fillStyle=grad(c,-10,-11,55,[[0,'#dfac6e'],[.58,'#bd7641'],[.83,'#8b442a'],[1,'#623923']]);c.fill();c.strokeStyle='#f1b67d';c.lineWidth=2;c.stroke();c.shadowColor='transparent';
  for(let j=0;j<4;j++){
   const px=-21+j*13,py=-12+pick(z.id*8+j*5)*25;
   line(c,[[px-3,py-2],[px+5,py+3]],'#673826bb',2.8);
  }
  oval(c,-11,-15,11,3,'#ffe0ad55');
  // Green herbs and sauce highlights vary independently from dangerous zones.
  if(z.garnish%2===0)oval(c,17,2,7,3,'#647f43');
  if(selected===z.id)oval(c,0,0,40,37,null,'#fff0b0',4);
  c.restore();
  mark(c,z.id+1,x,y+27,selected===z.id,z.inspected);
 }
}
function dumpling(c,d,selected){
 for(const z of d.zones){
  if(z.removed)continue;
  const p=POS.dumpling(z.id),x=p.x,y=p.y;
  c.save();c.translate(x,y);c.rotate((z.rotation/TAU-.5)*.08);
  c.shadowColor='#302014aa';c.shadowBlur=9;c.shadowOffsetY=7;
  c.beginPath();c.moveTo(-39,19);c.bezierCurveTo(-44,2,-36,-28,0,-31);
  c.bezierCurveTo(35,-31,43,1,40,19);c.quadraticCurveTo(0,35,-39,19);
  c.fillStyle=grad(c,-11,-17,60,[[0,'#f7e2b7'],[.55,'#dabb81'],[.9,'#b18e5f'],[1,'#8f7049']]);c.fill();c.strokeStyle='#8d6c43';c.lineWidth=2.5;c.stroke();
  c.shadowColor='transparent';
  c.beginPath();c.moveTo(-30,18);c.quadraticCurveTo(0,27,32,18);c.strokeStyle='#fff1c070';c.lineWidth=3;c.stroke();
  for(let j=-3;j<=3;j++){
   const px=j*10;
   c.beginPath();c.moveTo(px*.8,-19);c.quadraticCurveTo(px,0,px*.7,11);
   c.strokeStyle=j%2?'#947447':'#b89861';c.lineWidth=2;c.stroke();
  }
  oval(c,-15,-11,10,4,'#fff3ce65');
  if(selected===z.id)oval(c,0,0,44,38,null,'#fff0bb',4);
  c.restore();
  mark(c,z.id+1,x+26,y+22,selected===z.id,z.inspected);
 }
}
function cake(c,d,selected){
 for(const z of d.zones){
  if(z.removed)continue;
  const p=POS.cake(z.id),x=p.x,y=p.y;
  c.save();c.translate(x,y);
  c.shadowColor='#20110bbb';c.shadowBlur=7;c.shadowOffsetY=7;
  // A raised wedge with visible sponge, cream and the top glaze.
  c.beginPath();c.moveTo(0,-36);c.lineTo(40,19);c.lineTo(40,34);c.quadraticCurveTo(0,42,-40,34);c.lineTo(-40,19);c.closePath();
  c.fillStyle='#94563f';c.fill();c.strokeStyle='#583b2c';c.lineWidth=2;c.stroke();
  c.shadowColor='transparent';
  line(c,[[-39,25],[0,35],[39,25]],'#f3d8ab',5);
  line(c,[[-35,31],[0,39],[35,31]],'#ba785c',4);
  c.beginPath();c.moveTo(0,-37);c.lineTo(39,19);c.quadraticCurveTo(0,31,-39,19);c.closePath();
  c.fillStyle=grad(c,-9,-17,60,[[0,'#fff7dc'],[.5,'#e8cba9'],[1,'#bc886c']]);c.fill();
  c.strokeStyle='#fdf1d1';c.lineWidth=2;c.stroke();
  line(c,[[-34,20],[0,28],[35,20]],'#fff5de',3);
  if(z.garnish%3===0){
   oval(c,0,1,9,5,'#8e2d37','#ffd8ac',1.2);
   oval(c,-3,-1,3,2,'#ffe3d0');
  }else{
   for(let j=0;j<5;j++)oval(c,-13+j*6,11-(j%2)*10,2.5,1.5,'#a97461');
  }
  if(selected===z.id)oval(c,0,2,44,43,null,'#fff0bc',4);
  c.restore();
  mark(c,z.id+1,x+24,y+23,selected===z.id,z.inspected);
 }
}
function draw(canvas,dish,selected){
 const c=canvas.getContext('2d');if(!c||!dish?.spec)return;
 c.clearRect(0,0,W,H);platter(c,dish.spec.id);
 switch(dish.spec.id){
 case 'pancake':pancake(c,dish,selected);break;
 case 'soup':soup(c,dish,selected);break;
 case 'skewer':skewer(c,dish,selected);break;
 case 'dumpling':dumpling(c,dish,selected);break;
 case 'cake':cake(c,dish,selected);break;
 }
}
function hitAt(x,y,dish){
 if(!dish?.spec||!Number.isFinite(x)||!Number.isFinite(y))return null;
 if(dish.spec.id==='pancake'){
  const dx=x-300,dy=(y-210)/.68;
  if(Math.hypot(dx,dy)>192||Math.hypot(dx,dy)<9)return null;
  return Math.floor(((Math.atan2(dy,dx)+Math.PI/2+TAU)%TAU)/(TAU/8));
 }
 const pos=POS[dish.spec.id];if(!pos)return null;
 let best=null,bestDistance=Infinity;
 for(const z of dish.zones){
  const p=pos(z.id),dx=x-p.x,dy=y-p.y;
  const inside=dish.spec.id==='skewer'?Math.abs(dx)<=43&&Math.abs(dy)<=48:
   dish.spec.id==='soup'?Math.hypot(dx/48,dy/45)<=1:
   dish.spec.id==='dumpling'?Math.abs(dx)<=48&&Math.abs(dy)<=47:
   Math.abs(dx)<=47&&Math.abs(dy)<=49;
  const distance=Math.hypot(dx,dy);
  if(inside&&distance<bestDistance){best=z.id;bestDistance=distance;}
 }
 return best;
}
function hit(canvas,ev,dish){
 const r=canvas.getBoundingClientRect();
 if(!r.width||!r.height)return null;
 return hitAt((ev.clientX-r.left)*W/r.width,(ev.clientY-r.top)*H/r.height,dish);
}
root.MidnightDinerPlate={draw,hit,hitAt,PLACES:POS};
})(typeof window!=='undefined'?window:globalThis);
