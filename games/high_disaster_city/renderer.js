(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Renderer{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.images={};this.ready=false;this.view={w:1,h:1,dpr:1};this.agents=[];this.lastCitizenTime=0;this.resize=this.resize.bind(this);
  addEventListener('resize',this.resize);root.visualViewport?.addEventListener('resize',this.resize);this.resize();
 }
 async load(){
  const entries=Object.entries(D.ASSETS),loaded=await Promise.allSettled(entries.map(([key,src])=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve([key,im]);im.onerror=()=>resolve([key,null]);im.src=src})));
  for(const r of loaded){if(r.status==='fulfilled'){const[k,im]=r.value;if(im)this.images[k]=im}}this.ready=true;return this
 }
 resize(){
  const r=this.canvas.getBoundingClientRect(),dpr=Math.min(2,root.devicePixelRatio||1);this.view={w:Math.max(1,r.width),h:Math.max(1,r.height),dpr};
  this.canvas.width=Math.max(1,Math.round(this.view.w*dpr));this.canvas.height=Math.max(1,Math.round(this.view.h*dpr));this.ctx.setTransform(dpr,0,0,dpr,0,0);this.ctx.imageSmoothingEnabled=false
 }
 worldTransform(){
  const sx=this.view.w/D.W,sy=this.view.h/D.H,aspect=this.view.w/Math.max(1,this.view.h);let scale,ox,oy;
  if(aspect>=1.45){scale=sx;ox=0;oy=this.view.h*.5-350*scale}else{scale=Math.min(sx,sy);ox=(this.view.w-D.W*scale)/2;oy=(this.view.h-D.H*scale)/2}return{scale,ox,oy}
 }
 toWorld(clientX,clientY){const r=this.canvas.getBoundingClientRect(),t=this.worldTransform();return{x:(clientX-r.left-t.ox)/t.scale,y:(clientY-r.top-t.oy)/t.scale}}
 hitSlot(clientX,clientY){const p=this.toWorld(clientX,clientY);if(p.y<330||p.y>500)return-1;let best=-1,dist=999;D.SLOT_X.forEach((x,i)=>{const d=Math.abs(p.x-x);if(d<44&&d<dist){best=i;dist=d}});return best}
 img(key,x,y,w,h,flip=false,alpha=1){const im=this.images[key];if(!im)return false;const c=this.ctx;c.save();c.globalAlpha=alpha;if(flip){c.translate(x+w,y);c.scale(-1,1);c.drawImage(im,0,0,w,h)}else c.drawImage(im,x,y,w,h);c.restore();return true}
 background(s){
  const c=this.ctx,g=c.createLinearGradient(0,0,0,D.H);g.addColorStop(0,'#79b5d8');g.addColorStop(.58,'#c7dfcf');g.addColorStop(.581,'#719b62');g.addColorStop(1,'#436a43');c.fillStyle=g;c.fillRect(0,0,D.W,D.H);
  c.fillStyle='#eaf5e9';for(let i=0;i<7;i++){const x=100+i*230+Math.sin(s.time*.025+i)*18,y=86+(i%2)*35;c.fillRect(x,y,76,18);c.fillRect(x+18,y-13,45,14)}
  c.fillStyle='#6f8f72';c.beginPath();c.moveTo(0,360);for(let x=0;x<=D.W;x+=120)c.lineTo(x,320+Math.sin(x*.012)*24);c.lineTo(D.W,450);c.lineTo(0,450);c.fill();
  c.fillStyle='#628c58';c.fillRect(0,D.GROUND_Y,D.W,D.H-D.GROUND_Y);c.fillStyle='#355d41';c.fillRect(0,D.GROUND_Y+34,D.W,D.H-D.GROUND_Y-34);
  for(let x=0;x<D.W;x+=64)if(this.images.grass)this.img('grass',x,D.GROUND_Y-2,64,64,false,.44);
  c.fillStyle='#9b7951';c.fillRect(0,D.GROUND_Y+20,D.W,18);c.fillStyle='#c4a26f';for(let x=0;x<D.W;x+=42)c.fillRect(x,D.GROUND_Y+23,26,5);this.drawEdgeScenery()
 }
 drawEdgeScenery(){
  const c=this.ctx;for(const side of ['left','right']){const dir=side==='left'?1:-1,base=side==='left'?14:D.W-14;for(let i=0;i<5;i++){const x=base+dir*i*20;c.fillStyle='#365d3a';c.fillRect(x-3,D.GROUND_Y-83-i%2*9,7,83);c.fillStyle='#4e7e48';c.beginPath();c.arc(x,D.GROUND_Y-88-i%2*9,24,0,Math.PI*2);c.fill()}}
  c.fillStyle='#547b8e';c.fillRect(0,D.GROUND_Y+52,95,12);c.fillRect(D.W-95,D.GROUND_Y+52,95,12)
 }
 levelBadge(x,y,level){if((level||1)<=1)return;const c=this.ctx;c.fillStyle='#213f53dd';c.fillRect(x-15,y,30,16);c.fillStyle='#ffe18a';c.font='900 10px system-ui';c.textAlign='center';c.fillText('Lv.'+level,x,y+12)}
 compositeHouse(x,style,b){
  const c=this.ctx,w=82,h=86,baseKey=style==='fire'?'buildingDark':style==='market'?'buildingGray':'buildingBase',roof=style==='market'?'roofYellow':style==='fire'?'roofRed':'roofGray';
  if(!this.img(baseKey,x-w/2,D.GROUND_Y-h,w,h)){c.fillStyle='#e7d6b4';c.fillRect(x-w/2,D.GROUND_Y-h,w,h)}this.img(roof,x-w/2-2,D.GROUND_Y-h-20,w+4,30);
  if(style==='fire'){c.fillStyle='#d34d42';c.fillRect(x-23,D.GROUND_Y-45,46,34);c.fillStyle='#fff';c.font='900 20px system-ui';c.textAlign='center';c.fillText('✚',x,D.GROUND_Y-54)}
  else if(style==='market'){c.fillStyle='#c95f45';c.fillRect(x-35,D.GROUND_Y-55,70,12);c.fillStyle='#fff5cf';for(let i=0;i<5;i++)c.fillRect(x-34+i*14,D.GROUND_Y-55,7,12)}
  else this.img('window',x-15,D.GROUND_Y-53,30,30);this.hpBar(x,D.GROUND_Y-h-28,b.hp,b.maxHp);this.levelBadge(x,D.GROUND_Y-h-49,b.level)
 }
 hpBar(x,y,hp,maxHp){if(hp>=maxHp*.985)return;const c=this.ctx,p=clamp(hp/maxHp,0,1);c.fillStyle='#173449cc';c.fillRect(x-28,y,56,7);c.fillStyle=p>.55?'#66b267':p>.28?'#e6a74c':'#d54d4d';c.fillRect(x-27,y+1,54*p,5)}
 drawBuilding(slot,b){
  const c=this.ctx,x=slot.x,def=D.BUILDINGS[b.id],style=def.style;if(['house','market','fire'].includes(style)){this.compositeHouse(x,style,b);return}
  if(style==='farm'){c.fillStyle='#85633f';c.fillRect(x-38,D.GROUND_Y-18,76,18);for(let i=-30;i<=30;i+=12){c.fillStyle='#e2b949';c.fillRect(x+i,D.GROUND_Y-51-(i%3),4,32);c.fillStyle='#74a852';c.fillRect(x+i-5,D.GROUND_Y-38,14,4)}this.hpBar(x,D.GROUND_Y-63,b.hp,b.maxHp);this.levelBadge(x,D.GROUND_Y-82,b.level);return}
  if(style==='levee'){c.fillStyle='#79756c';for(let r=0;r<3;r++)for(let i=0;i<4;i++){c.fillStyle=(r+i)%2?'#8f897e':'#6f6c64';c.fillRect(x-44+i*22+(r%2)*7,D.GROUND_Y-21-r*15,21,14)}this.hpBar(x,D.GROUND_Y-76,b.hp,b.maxHp);this.levelBadge(x,D.GROUND_Y-96,b.level);return}
  if(style==='pump'){c.fillStyle='#50616a';c.fillRect(x-34,D.GROUND_Y-58,68,58);c.fillStyle='#78a6b5';c.fillRect(x-24,D.GROUND_Y-48,34,28);c.strokeStyle='#31505f';c.lineWidth=8;c.beginPath();c.arc(x+16,D.GROUND_Y-26,20,-Math.PI/2,Math.PI/2);c.stroke();this.hpBar(x,D.GROUND_Y-74,b.hp,b.maxHp);this.levelBadge(x,D.GROUND_Y-94,b.level);return}
  if(style==='reservoir'){c.fillStyle='#d7e2dd';c.fillRect(x-31,D.GROUND_Y-68,62,68);c.fillStyle='#5b8e9e';c.fillRect(x-35,D.GROUND_Y-73,70,10);c.fillStyle='#6db6cf';c.fillRect(x-4,D.GROUND_Y-47,8,22);this.hpBar(x,D.GROUND_Y-86,b.hp,b.maxHp);this.levelBadge(x,D.GROUND_Y-106,b.level);return}
  if(style==='shelter'){c.fillStyle='#78858d';c.fillRect(x-37,D.GROUND_Y-64,74,64);c.fillStyle='#4b5963';c.beginPath();c.moveTo(x-44,D.GROUND_Y-64);c.lineTo(x,D.GROUND_Y-88);c.lineTo(x+44,D.GROUND_Y-64);c.fill();c.fillStyle='#eef5f7';c.font='900 24px system-ui';c.textAlign='center';c.fillText('⬟',x,D.GROUND_Y-29);this.hpBar(x,D.GROUND_Y-101,b.hp,b.maxHp);this.levelBadge(x,D.GROUND_Y-121,b.level);return}
  if(style==='cooling'){c.fillStyle='#d7eef2';c.fillRect(x-36,D.GROUND_Y-62,72,62);c.fillStyle='#78b9cb';c.fillRect(x-40,D.GROUND_Y-67,80,10);c.fillStyle='#287a96';c.font='900 25px system-ui';c.textAlign='center';c.fillText('❄',x,D.GROUND_Y-27);this.hpBar(x,D.GROUND_Y-82,b.hp,b.maxHp);this.levelBadge(x,D.GROUND_Y-102,b.level);return}
  if(style==='snow'){c.fillStyle='#566976';c.fillRect(x-38,D.GROUND_Y-54,76,54);c.fillStyle='#d9eef4';c.fillRect(x-31,D.GROUND_Y-46,42,28);c.fillStyle='#f3c653';c.fillRect(x+10,D.GROUND_Y-35,22,8);c.fillStyle='#e9f5f8';c.font='900 18px system-ui';c.textAlign='center';c.fillText('✣',x-9,D.GROUND_Y-25);this.hpBar(x,D.GROUND_Y-70,b.hp,b.maxHp);this.levelBadge(x,D.GROUND_Y-90,b.level);return}
 }
 townHall(){const c=this.ctx,x=D.TOWN_X;c.fillStyle='#e7d1a8';c.fillRect(x-55,D.GROUND_Y-108,110,108);c.fillStyle='#384e5a';c.beginPath();c.moveTo(x-66,D.GROUND_Y-108);c.lineTo(x,D.GROUND_Y-151);c.lineTo(x+66,D.GROUND_Y-108);c.fill();c.fillStyle='#f5edd7';c.fillRect(x-12,D.GROUND_Y-52,24,52);c.fillStyle='#b44e43';c.fillRect(x-34,D.GROUND_Y-91,68,20);c.fillStyle='#fff3d8';c.font='900 13px system-ui';c.textAlign='center';c.fillText('마을회관',x,D.GROUND_Y-76)}
 frontX(d){return d.side==='left'?70+d.progress*650:1370-d.progress*650}
 ensureAgents(s){
  const count=Math.min(16,Math.max(5,Math.round(s.population/4)));while(this.agents.length<count){const i=this.agents.length,x=300+(i*109)%820;this.agents.push({x,target:D.TOWN_X,wait:(i%4)*.35,seed:i*17+3,dir:1})}if(this.agents.length>count)this.agents.length=count
 }
 citizens(s){
  if(s.time<this.lastCitizenTime){this.agents=[];this.lastCitizenTime=s.time}this.ensureAgents(s);const c=this.ctx,dt=clamp(s.time-this.lastCitizenTime,0,.08);this.lastCitizenTime=s.time;const targets=[D.TOWN_X,...s.slots.filter(x=>x.building).map(x=>x.x)];
  for(let i=0;i<this.agents.length;i++){const a=this.agents[i];let fleeing=false;
   for(const d of s.disasters||[]){if(!['wildfire','flood','typhoon','blizzard'].includes(d.type))continue;const fx=this.frontX(d);if(Math.abs(a.x-fx)<230&&d.progress>.36){a.target=D.TOWN_X;fleeing=true;break}}
   if(!fleeing){a.wait-=dt;if(Math.abs(a.x-a.target)<8){if(a.wait<=0){a.target=targets[(a.seed+Math.floor(s.time/2.7)+i)%targets.length]||D.TOWN_X;a.wait=.5+(a.seed%5)*.18}}}
   const dx=a.target-a.x,speed=fleeing?118:38;if(Math.abs(dx)>3){a.dir=Math.sign(dx);a.x+=a.dir*Math.min(Math.abs(dx),speed*dt)}
   const y=D.GROUND_Y+8+(i%3)*4,bob=Math.sin(s.time*(fleeing?9:5)+i)*2,key=fleeing?'citizenWalk':i%3===0?'adventurer':i%3===1?'citizen':'citizenWalk',flip=a.dir<0;
   if(!this.img(key,a.x-14,y-34+bob,28,34,flip)){c.fillStyle='#f0c59b';c.beginPath();c.arc(a.x,y-24,7,0,Math.PI*2);c.fill();c.fillStyle='#436c82';c.fillRect(a.x-7,y-17,14,20)}
  }
 }
 wildfire(s,d){
  const c=this.ctx,x=this.frontX(d),dir=d.side==='left'?1:-1;c.save();const glow=c.createLinearGradient(x-dir*180,0,x+dir*160,0);glow.addColorStop(0,'#ef704400');glow.addColorStop(.5,'#ef70442c');glow.addColorStop(1,'#ef704400');c.fillStyle=glow;c.fillRect(x-220,0,440,D.H);c.restore();
  const fireCount=clamp(Math.round(4+(d.strength||1)*5),5,15);for(let i=0;i<fireCount;i++){const k=i-(fireCount-1)/2,fx=x+k*13+Math.sin(s.time*4+i)*5,fy=D.GROUND_Y-30-Math.abs(i%3)*7,sz=34+Math.min(34,(d.strength||1)*12)+((i*13)%12),key=(i&1)?'fire1':'fire2';if(!this.img(key,fx-sz/2,fy-sz,sz,sz)){c.fillStyle='#f06a32';c.beginPath();c.arc(fx,fy,Math.max(12,sz*.34),0,Math.PI*2);c.fill()}}
  for(let i=0;i<5;i++){const sy=D.GROUND_Y-110-i*29-((s.time*18+i*23)%31),sx=x-24+i*13;this.img(i&1?'smoke1':'smoke2',sx,sy,48,48,false,.38)}
 }
 flood(s,d){
  const c=this.ctx,x=this.frontX(d),left=d.side==='left'?0:x,right=d.side==='left'?x:D.W,power=d.strength||1,wave=2+Math.min(5,power*2.2),level=D.GROUND_Y-10-Math.min(12,power*4)-Math.sin(s.time*3)*wave;
  c.globalAlpha=clamp(.58+power*.1,.6,.9);c.fillStyle='#4b95b8';c.fillRect(left,level,right-left,D.H-level);c.globalAlpha=1;c.fillStyle='#8ed0e0cc';c.fillRect(left,level,right-left,8);if(this.images.waterTop)for(let xx=left-5;xx<right;xx+=64)this.img('waterTop',xx,level-12,64,32,false,.8);
  for(let i=0;i<5;i++){const bx=x+(d.side==='left'?-1:1)*(i*10),by=level-5-i%2*8;c.strokeStyle='#d8f5f8aa';c.lineWidth=3;c.beginPath();c.arc(bx,by,12+i*2,0,Math.PI);c.stroke()}
  if(d.blockedSlot>=0){const bx=D.SLOT_X[d.blockedSlot];for(let i=0;i<4;i++){c.strokeStyle='#efffffcc';c.lineWidth=3;c.beginPath();c.arc(bx+(i-2)*8,level-7-i*4,15+i*3,Math.PI,Math.PI*2);c.stroke()}}
 }
 typhoon(s,d){
  const c=this.ctx,x=this.frontX(d),dir=d.side==='left'?1:-1,p=d.strength||1;c.save();c.globalAlpha=.20;c.fillStyle='#304b61';c.fillRect(0,0,D.W,D.H);c.globalAlpha=1;
  c.strokeStyle='#d9edf5aa';c.lineWidth=3;for(let i=0;i<18;i++){const y=55+(i*31)%360,xx=x-dir*((i*67+s.time*130)%420);c.beginPath();c.moveTo(xx,y);c.lineTo(xx+dir*70,y+9);c.stroke()}
  c.strokeStyle='#89b9cfaa';c.lineWidth=2;for(let i=0;i<24;i++){const xx=(i*83+s.time*190)%D.W,yy=40+(i*47)%390;c.beginPath();c.moveTo(xx,yy);c.lineTo(xx-dir*18,yy+30);c.stroke()}c.restore();
  c.fillStyle='#d9edf5';c.font='900 '+Math.round(42+Math.min(18,p*8))+'px system-ui';c.textAlign='center';c.fillText('🌀',x,D.GROUND_Y-105)
 }
 heatwave(s,d){
  const c=this.ctx,p=clamp(d.progress,0,1);c.save();c.globalAlpha=.10+.10*p;c.fillStyle='#f39a3e';c.fillRect(0,0,D.W,D.H);c.globalAlpha=.85;c.fillStyle='#ffd15a';c.beginPath();c.arc(d.side==='left'?145:D.W-145,92,40+8*Math.sin(s.time*2),0,Math.PI*2);c.fill();
  c.strokeStyle='#f7c46caa';c.lineWidth=4;for(let i=0;i<12;i++){const x=80+i*120,y=D.GROUND_Y-55-(i%3)*15;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-12,y-16,x+12,y-28,x,y-44);c.stroke()}c.restore()
 }
 blizzard(s,d){
  const c=this.ctx,x=this.frontX(d),left=d.side==='left'?0:x,right=d.side==='left'?x:D.W;c.save();c.globalAlpha=.18;c.fillStyle='#eaf7ff';c.fillRect(left,0,right-left,D.H);c.globalAlpha=.9;c.fillStyle='#f7fbff';
  for(let i=0;i<48;i++){const xx=(i*97+s.time*55*(i%3+1))%D.W,yy=(i*43+s.time*90)%430,r=2+(i%3);c.beginPath();c.arc(xx,yy,r,0,Math.PI*2);c.fill()}c.globalAlpha=.7;c.fillStyle='#d7edf7';c.fillRect(left,D.GROUND_Y-8,right-left,15);c.restore()
 }
 earthquake(s,d){
  const c=this.ctx,p=d.strength||1;c.save();c.strokeStyle='#654c3dcc';c.lineWidth=3;for(let i=0;i<5;i++){const x=520+i*105,y=D.GROUND_Y+25;c.beginPath();c.moveTo(x,y);c.lineTo(x+12,y+12);c.lineTo(x-5,y+24);c.lineTo(x+14,y+39);c.stroke()}c.fillStyle='#58483c';c.font='900 '+Math.round(30+Math.min(16,p*6))+'px system-ui';c.textAlign='center';c.fillText('⚡',D.TOWN_X,D.GROUND_Y+72);c.restore()
 }
 effects(s){const c=this.ctx;for(const e of s.effects){if(e.type==='ruin'){const p=e.life/e.maxLife;c.globalAlpha=clamp(p,0,1);c.fillStyle='#58493d';for(let i=0;i<8;i++){const xx=e.x-30+i*9,yy=D.GROUND_Y-8-Math.sin(i*4.4)*10-(1-p)*25;c.fillRect(xx,yy,7,7)}c.globalAlpha=1}}}
 slots(s){
  const c=this.ctx;if(!s.selectedUid)return;const selected=s.hand.find(x=>x.uid===s.selectedUid),card=selected&&D.CARDS[selected.id];if(!card||card.kind!=='build')return;
  for(const slot of s.slots){let mark='+',stroke='#ffe36bcc',fill='#fff3a9cc';if(slot.building){if(slot.building.id===card.building){if((slot.building.level||1)>=3){mark='MAX';stroke='#ce635fcc';fill='#ffd2cacc'}else{mark='↑';stroke='#78d18bcc';fill='#c8ffd2dd'}}else{mark='↺';stroke='#7ec9e5cc';fill='#d7f4ffdd'}}
   c.strokeStyle=stroke;c.lineWidth=3;c.setLineDash([7,6]);c.strokeRect(slot.x-38,D.GROUND_Y-92,76,92);c.setLineDash([]);c.fillStyle=fill;c.font=mark==='MAX'?'900 11px system-ui':'900 22px system-ui';c.textAlign='center';c.fillText(mark,slot.x,D.GROUND_Y-42)}
 }
 render(s){
  const c=this.ctx,t=this.worldTransform();c.setTransform(this.view.dpr,0,0,this.view.dpr,0,0);c.fillStyle='#11293d';c.fillRect(0,0,this.view.w,this.view.h);c.save();c.translate(t.ox,t.oy);c.scale(t.scale,t.scale);c.imageSmoothingEnabled=false;
  const quake=(s.disasters||[]).find(d=>d.type==='earthquake');if(quake)c.translate(Math.sin(s.time*46)*3.5*(quake.strength||1),Math.cos(s.time*39)*1.8);
  this.background(s);this.slots(s);for(const slot of s.slots)if(slot.building)this.drawBuilding(slot,slot.building);this.townHall();this.citizens(s);
  const disasters=(s.disasters||[]).slice().sort((a,b)=>a.type==='flood'?-1:b.type==='flood'?1:0);for(const d of disasters){if(d.type==='wildfire')this.wildfire(s,d);else if(d.type==='flood')this.flood(s,d);else if(d.type==='typhoon')this.typhoon(s,d);else if(d.type==='heatwave')this.heatwave(s,d);else if(d.type==='blizzard')this.blizzard(s,d);else if(d.type==='earthquake')this.earthquake(s,d)}this.effects(s);c.restore()
 }
}
DC.Renderer=Renderer;
})(window);