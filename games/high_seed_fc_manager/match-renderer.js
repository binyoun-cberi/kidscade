(function(root){
'use strict';
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function lerp(a,b,t){return a+(b-a)*t;}
function hash(s){s=String(s||'');var h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function round(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else{ctx.rect(x,y,w,h);}}
function Renderer(){this.userSide=0;this.camera=50;this.last=0;this.eventN=0;this.shake=0;this.flash=0;this.visible=66;}
Renderer.prototype.depth=function(x){return this.userSide===0?100-x:x;};
Renderer.prototype.reset=function(m){this.userSide=typeof m.userSide==='number'?m.userSide:0;this.camera=this.depth(m.ball&&m.ball.x!=null?m.ball.x:50);this.last=performance.now();this.eventN=(m.events||[]).length;this.shake=0;this.flash=0;};
Renderer.prototype.metrics=function(c){var W=c.width,H=c.height,p=Math.max(54,Math.round(W*.065));return {W:W,H:H,l:p,r:W-p,w:W-p*2,cy:H*.52,sy:(H-38)/this.visible};};
Renderer.prototype.x=function(y,q){return q.l+clamp(y,0,100)/100*q.w;};
Renderer.prototype.y=function(x,q){return q.cy+(this.depth(x)-this.camera)*q.sy;};
Renderer.prototype.cameraTick=function(m,dt){this.userSide=typeof m.userSide==='number'?m.userSide:this.userSide;var d=this.depth(m.ball&&m.ball.x!=null?m.ball.x:50),look=m.possession===this.userSide?-8:8,target=clamp(d+look,this.visible/2,100-this.visible/2);this.camera=lerp(this.camera,target,Math.min(.16,dt*5));};
Renderer.prototype.events=function(m){var es=m.events||[];for(var i=this.eventN;i<es.length;i++){if(es[i].type==='goal'){this.shake=9;this.flash=1;}else if(es[i].type==='shot')this.shake=Math.max(this.shake,3);else if(es[i].type==='save')this.shake=Math.max(this.shake,2);}this.eventN=es.length;};
Renderer.prototype.pitch=function(ctx,q){
  var self=this,top=q.cy+(0-this.camera)*q.sy,bottom=q.cy+(100-this.camera)*q.sy,cx=(q.l+q.r)/2;
  ctx.fillStyle='#07131e';ctx.fillRect(0,0,q.W,q.H);
  ctx.save();ctx.beginPath();ctx.rect(q.l,0,q.w,q.H);ctx.clip();ctx.fillStyle='#2b9857';ctx.fillRect(q.l,top,q.w,bottom-top);
  for(var v=0;v<100;v+=8){var y1=q.cy+(v-this.camera)*q.sy,y2=q.cy+(Math.min(100,v+8)-this.camera)*q.sy;ctx.fillStyle=(v/8)%2<1?'rgba(255,255,255,.035)':'rgba(0,0,0,.035)';ctx.fillRect(q.l,y1,q.w,y2-y1);}ctx.restore();
  ctx.strokeStyle='rgba(245,255,248,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(q.l,top);ctx.lineTo(q.l,bottom);ctx.moveTo(q.r,top);ctx.lineTo(q.r,bottom);ctx.stroke();
  function wy(v){return q.cy+(v-self.camera)*q.sy;}
  function hline(v){var yy=wy(v);ctx.beginPath();ctx.moveTo(q.l,yy);ctx.lineTo(q.r,yy);ctx.stroke();}
  hline(0);hline(50);hline(100);
  var my=wy(50);ctx.beginPath();ctx.ellipse(cx,my,q.w*.092,q.sy*6.2,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(245,255,248,.9)';ctx.beginPath();ctx.arc(cx,my,3,0,Math.PI*2);ctx.fill();
  function end(v,dir,label){var gy=wy(v),py=wy(v+dir*15.8),ay=wy(v+dir*5.5),spot=wy(v+dir*10.5),bw=q.w*.59,aw=q.w*.27;ctx.strokeRect(cx-bw/2,Math.min(gy,py),bw,Math.abs(py-gy));ctx.strokeRect(cx-aw/2,Math.min(gy,ay),aw,Math.abs(ay-gy));ctx.beginPath();ctx.arc(cx,spot,3,0,Math.PI*2);ctx.fill();var gw=q.w*.22,ny=gy-dir*q.sy*2.8;ctx.strokeStyle='rgba(235,245,255,.78)';ctx.strokeRect(cx-gw/2,Math.min(gy,ny),gw,Math.abs(ny-gy));for(var i=1;i<6;i++){var gx=cx-gw/2+gw*i/6;ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx,ny);ctx.stroke();}if(gy>-25&&gy<q.H+25){round(ctx,cx-43,gy-dir*q.sy*2.8-dir*27,86,20,8);ctx.fillStyle='rgba(4,17,31,.72)';ctx.fill();ctx.fillStyle='#effff4';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,cx,gy-dir*q.sy*2.8-dir*17);}}
  ctx.strokeStyle='rgba(245,255,248,.9)';end(0,1,'상대 골대');ctx.strokeStyle='rgba(245,255,248,.9)';end(100,-1,'우리 골대');
  ctx.fillStyle='rgba(5,15,25,.75)';ctx.fillRect(0,0,q.l-5,q.H);ctx.fillRect(q.r+5,0,q.W-q.r-5,q.H);
};
Renderer.prototype.player=function(ctx,a,t,side,q,now,m){
  var x=this.x(a.y,q),y=this.y(a.x,q);if(y<-50||y>q.H+55)return;var sc=clamp(.76+(y/q.H)*.34,.72,1.12),accent=t.club&&t.club.accent?t.club.accent:(side===0?'#22c55e':'#3b82f6'),tr=a.trail||[],moving=false;if(tr.length>1){var p=tr[tr.length-1],z=tr[tr.length-2];moving=Math.hypot(p.x-z.x,p.y-z.y)>.018;}var stride=Math.sin(now*.014+(hash(a.id)%23))*(moving?4.2*sc:0),own=m.ball&&m.ball.owner&&m.ball.owner.id===a.id;
  ctx.save();ctx.fillStyle='rgba(2,8,16,.24)';ctx.beginPath();ctx.ellipse(x,y+4*sc,13*sc,4*sc,0,0,Math.PI*2);ctx.fill();if(own){ctx.strokeStyle='#fde047';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(x,y,18*sc,8*sc,0,0,Math.PI*2);ctx.stroke();}
  ctx.strokeStyle=side===this.userSide?'#f8fafc':'#111827';ctx.lineWidth=3*sc;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-3*sc,y-8*sc);ctx.lineTo(x-5*sc+stride,y+2*sc);ctx.moveTo(x+3*sc,y-8*sc);ctx.lineTo(x+5*sc-stride,y+2*sc);ctx.stroke();
  ctx.fillStyle=side===this.userSide?'#f8fafc':'#111827';ctx.fillRect(x-7*sc,y-13*sc,14*sc,7*sc);ctx.fillStyle=accent;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.2*sc;round(ctx,x-8.5*sc,y-29*sc,17*sc,17*sc,4*sc);ctx.fill();ctx.stroke();
  ctx.strokeStyle=accent;ctx.lineWidth=3*sc;ctx.beginPath();ctx.moveTo(x-6*sc,y-25*sc);ctx.lineTo(x-11*sc-stride*.25,y-17*sc);ctx.moveTo(x+6*sc,y-25*sc);ctx.lineTo(x+11*sc+stride*.25,y-17*sc);ctx.stroke();
  var skin=['#f2c7a5','#e8b38c','#d59a71','#f0c3a0'][hash(a.id)%4];ctx.fillStyle=skin;ctx.strokeStyle='rgba(15,23,42,.6)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y-35*sc,6.2*sc,0,Math.PI*2);ctx.fill();ctx.stroke();
  var name=String(a.p&&a.p.name||'선수');if(name.length>5)name=name.slice(0,5);ctx.font='900 '+Math.max(8,Math.round(9*sc))+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';var w=Math.max(30,ctx.measureText(name).width+8);round(ctx,x-w/2,y+7*sc,w,15,6);ctx.fillStyle='rgba(3,12,22,.82)';ctx.fill();ctx.fillStyle='#fff';ctx.fillText(name,x,y+14*sc);
  if(side===m.userSide){ctx.fillStyle='rgba(3,10,18,.7)';ctx.fillRect(x-13*sc,y+23*sc,26*sc,3);ctx.fillStyle=a.energy>55?'#34d399':a.energy>35?'#facc15':'#fb7185';ctx.fillRect(x-13*sc,y+23*sc,26*sc*clamp(a.energy/100,0,1),3);}ctx.restore();
};
Renderer.prototype.ballPos=function(m){var pv=m.passVisuals&&m.passVisuals.length?m.passVisuals[m.passVisuals.length-1]:null;if(pv&&pv.life>0){var t=clamp((1-pv.life)*1.25,0,1);t=t*t*(3-2*t);return {x:lerp(pv.x,pv.toX,t),y:lerp(pv.y,pv.toY,t),h:Math.sin(Math.PI*t)};}return {x:m.ball.x,y:m.ball.y,h:0};};
Renderer.prototype.ball=function(ctx,m,q){var b=this.ballPos(m),x=this.x(b.y,q),y=this.y(b.x,q);ctx.save();ctx.fillStyle='rgba(3,10,18,.28)';ctx.beginPath();ctx.ellipse(x,y+4,7,3,0,0,Math.PI*2);ctx.fill();ctx.translate(x,y-b.h*9);ctx.fillStyle='#fff';ctx.strokeStyle='#111827';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();ctx.restore();};
Renderer.prototype.render=function(canvas,m){
  if(!canvas||!m)return;if(!this.last)this.reset(m);var now=performance.now(),dt=Math.min(.05,Math.max(.001,(now-this.last)/1000||.016));this.last=now;this.events(m);this.cameraTick(m,dt);this.shake=Math.max(0,this.shake-dt*22);this.flash=Math.max(0,this.flash-dt*1.8);var ctx=canvas.getContext('2d'),q=this.metrics(canvas),self=this;ctx.clearRect(0,0,q.W,q.H);ctx.save();if(this.shake)ctx.translate(Math.sin(now*.07)*this.shake,Math.cos(now*.09)*this.shake*.55);this.pitch(ctx,q);
  (m.passVisuals||[]).forEach(function(p){var x1=self.x(p.y,q),y1=self.y(p.x,q),x2=self.x(p.toY,q),y2=self.y(p.toX,q);ctx.save();ctx.globalAlpha=Math.max(.06,p.life*.45);ctx.strokeStyle=p.completed?(p.progressive?'#fde047':'#bbf7d0'):'#fb7185';ctx.lineWidth=p.progressive?3:2;if(!p.completed)ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();});
  var list=[];m.teams.forEach(function(t,side){t.actors.forEach(function(a){list.push({a:a,t:t,side:side,y:self.y(a.x,q)});});});list.sort(function(a,b){return a.y-b.y;});list.forEach(function(o){self.player(ctx,o.a,o.t,o.side,q,now,m);});this.ball(ctx,m,q);
  (m.effects||[]).forEach(function(f){var x=self.x(f.y,q),y=self.y(f.x,q),life=clamp(f.life,0,1);ctx.save();ctx.globalAlpha=life*.8;ctx.strokeStyle=f.kind==='goal'?'#fde047':f.kind==='save'?'#60a5fa':'#fff';ctx.lineWidth=f.kind==='goal'?5:3;ctx.beginPath();ctx.arc(x,y-10,10+(1-life)*24,0,Math.PI*2);ctx.stroke();ctx.restore();});
  round(ctx,18,16,154,30,10);ctx.fillStyle='rgba(5,16,28,.8)';ctx.fill();ctx.fillStyle='#effff4';ctx.font='900 12px system-ui';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('↑ 우리 팀 공격 · 세로 중계',31,31);var zone=this.camera<34?'상대 진영':this.camera>66?'우리 진영':'중앙 구역';round(ctx,q.W-128,16,110,30,10);ctx.fillStyle='rgba(5,16,28,.8)';ctx.fill();ctx.fillStyle='#d7e6f5';ctx.textAlign='center';ctx.fillText(zone,q.W-73,31);if(this.flash){ctx.fillStyle='rgba(253,224,71,'+(this.flash*.1)+')';ctx.fillRect(0,0,q.W,q.H);}ctx.restore();
};
root.SeedFCBroadcast=Object.freeze({create:function(){return new Renderer();}});
})(window);
