(function(){const C=Math.PI*2;
function center(i,soup){return soup?{x:172+(i%3)*128,y:162+Math.floor(i/3)*89}:{x:124+i*87,y:212};}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,C);c.fillStyle=color;c.fill();}
function draw(c,dish,selected){let soup=dish.spec.id==='soup';
if(soup)oval(c,300,210,207,130,'#444736');
else{c.strokeStyle='#bea277';c.lineWidth=13;c.beginPath();c.moveTo(80,215);c.lineTo(535,215);c.stroke();}
for(const z of dish.zones){if(z.removed)continue;const p=center(z.id,soup),x=p.x,y=p.y;
oval(c,x,y,soup?39:38,soup?31:35,soup?'#817653':'#9f724d');
if(soup){oval(c,x,y,28,19,z.dangerous?'#75548c':'#ac9b63');if(z.dangerous){c.strokeStyle='#f0d3fa';c.lineWidth=3;for(let k=0;k<2;k++){c.beginPath();c.moveTo(x-13,y+k*8);c.lineTo(x+13,y+k*8);c.stroke();}}}
else{oval(c,x-10,y,10,9,z.dangerous?'#3d78ab':'#748f62');if(z.dangerous)oval(c,x+10,y,10,9,'#3d78ab');}
if(selected===z.id||z.inspected){c.strokeStyle=z.inspected?(z.dangerous?'#dd6e64':'#91d79f'):'#fff0b5';c.lineWidth=5;c.beginPath();c.ellipse(x,y,soup?45:44,soup?37:40,0,0,C);c.stroke();}
}}
function hit(x,y,dish){const soup=dish.spec.id==='soup';let min=999,result=null;for(const z of dish.zones){const p=center(z.id,soup),dist=Math.hypot(x-p.x,y-p.y);if(dist<min){min=dist;result=z.id;}}return min<44?result:null;}
window.MidnightDinerPlateExtra={draw,hit};})();