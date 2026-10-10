(function(){
'use strict';
const TAU=Math.PI*2;
function rnd(seed){let v=(seed*1664525+1013904223)>>>0;return v/4294967296;}
function ellipse(ctx,x,y,rx,ry,fill,stroke,width=1){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function label(ctx,str,x,y,size=15){ctx.font='700 '+size+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#eddfc7';ctx.shadowColor='#101009';ctx.shadowBlur=3;ctx.fillText(str,x,y);ctx.shadowBlur=0;}
function drawPlate(ctx,kind){ctx.save();ctx.shadowColor='#000c';ctx.shadowBlur=29;ctx.shadowOffsetY=14;ellipse(ctx,300,210,246,168,'#aa9f87','#e0d2b4',8);ctx.restore();ellipse(ctx,300,207,226,148,'#bfb398','#8e826b',9);ellipse(ctx,300,210,216,139,kind==='soup'?'#363327':'#d3c7ab','#898068',3);}
function badge(ctx,z,x,y){if(z.inspected&&!z.removed){ellipse(ctx,x,y,18,18,'#5d5038','#f2dca6',2);label(ctx,'?',x,y,19);}}
function seed(ctx,x,y,cluster){const spots=cluster?[[0,-8],[-10,7],[10,6]]:[[0,0]];for(const [a,b] of spots){ellipse(ctx,x+a,y+b,5,4,'#b83d30','#ffb27b',1);}}
function mushroom(ctx,x,y,danger){ellipse(ctx,x,y,29,19,danger?'#6c568c':'#988b5f',danger?'#dfbbf5':'#d6c792',3);ctx.strokeStyle=danger?'#e9c8f9':'#66583f';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,18,Math.PI*.95,Math.PI*1.9);ctx.stroke();if(danger){ctx.beginPath();ctx.moveTo(x-13,y+1);ctx.lineTo(x+13,y+1);ctx.moveTo(x-11,y+7);ctx.lineTo(x+11,y+7);ctx.stroke();}}
function beans(ctx,x,y,danger){ellipse(ctx,x,y,28,24,'#946e4b','#d3ab79',3);ellipse(ctx,x-10,y-4,10,9,danger?'#3e6e9c':'#6f866c','#a8c6b9',2);if(danger)ellipse(ctx,x+10,y-4,10,9,'#3e6e9c','#a8c6b9',2);}
function pancake(ctx,zones,selected){ctx.save();ctx.translate(300,209);ctx.scale(1,.68);const r=191;for(const z of zones){const a=-Math.PI/2+z.id*TAU/8,b=a+TAU/8;if(z.removed)continue;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,a+.012,b-.012);ctx.closePath();ctx.fillStyle=['#657341','#6d793f','#546737','#778449'][z.id%4];ctx.fill();ctx.strokeStyle='#958955';ctx.lineWidth=3;ctx.stroke();ctx.save();ctx.clip();for(let k=0;k<12;k++){const theta=a+.13+(b-a-.26)*rnd(z.id*81+k*17+7),radius=34+148*rnd(z.id*53+k*23+5);const x=Math.cos(theta)*radius,y=Math.sin(theta)*radius;ctx.save();ctx.translate(x,y);ctx.rotate((k*2.1));ctx.fillStyle=['#8d9d53','#bda474','#345b35','#d9bc79'][k%4];ctx.fillRect(-7,-3,18,6);ctx.restore();}ctx.restore();const m=(a+b)/2;const sx=Math.cos(m)*132,sy=Math.sin(m)*132;ctx.save();ctx.translate(sx,sy);ctx.scale(1,1.47);seed(ctx,0,0,z.garnish===0);ctx.restore();if(selected===z.id){ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,a,b);ctx.closePath();ctx.strokeStyle='#ffeeb9';ctx.lineWidth=7;ctx.stroke();}ctx.save();ctx.scale(1,1.47);badge(ctx,z,sx,sy*.68-22);ctx.restore();ctx.save();ctx.translate(Math.cos(m)*174,Math.sin(m)*174);ctx.scale(1,1.47);label(ctx,String(z.id+1),0,0,18);ctx.restore();}ctx.restore();}

function draw(canvas,dish,selected){
const ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,600,420);drawPlate(ctx,dish.spec.id);
if(dish.spec.id==='pancake')pancake(ctx,dish.zones,selected);
else window.MidnightDinerPlateExtra?.draw(ctx,dish,selected);
}
function hit(canvas,ev,dish){
const rect=canvas.getBoundingClientRect(),x=(ev.clientX-rect.left)*600/rect.width,y=(ev.clientY-rect.top)*420/rect.height;
if(dish.spec.id!=='pancake')return window.MidnightDinerPlateExtra?.hit(x,y,dish)??null;
const dx=x-300,dy=(y-209)/.68;if(Math.hypot(dx,dy)>190||Math.hypot(dx,dy)<10)return null;
return Math.floor(((Math.atan2(dy,dx)+Math.PI/2+TAU)%TAU)/(TAU/8));
}
window.MidnightDinerPlate={draw,hit};
})();
