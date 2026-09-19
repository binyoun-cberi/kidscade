/* Kidscade World v2 - outdoor work animation layer.
   Reuses the current Deluxe avatar, AvatarActor hand anchors and World v2 entities. */
(function(root){
'use strict';
const K=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
if(K.WorkAnimation?.installed)return;

const CFG={
  chop:{duration:760,hitAt:.53,pose:'use',message:'나무를 힘차게 찍었어요!'},
  mine:{duration:820,hitAt:.55,pose:'use',message:'바위를 힘차게 내리쳤어요!'},
  water:{duration:1250,hitAt:.40,pose:'use',message:'작물에 물을 충분히 줬어요.'},
  harvest:{duration:760,hitAt:.52,pose:'use',message:'작물을 수확했어요!'},
  net:{duration:850,hitAt:.56,pose:'use',message:'채집망을 휘둘렀어요!'}
};
const active=new WeakMap();
const particles=[];
const floaters=[];
let shake=0,audioCtx=null;

function toast(text){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=text;el.classList.add('show');
  clearTimeout(el.__workToastTimer);el.__workToastTimer=setTimeout(()=>el.classList.remove('show'),1450);
}
function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v));}
function easeOut(t){t=clamp(t);return 1-Math.pow(1-t,3);}
function easeInOut(t){t=clamp(t);return .5-Math.cos(t*Math.PI)/2;}
function actorOf(world){return world?.player?.__kidscadeAvatarActor||null;}
function isInside(world){return world.entities.byTag('indoor').some(e=>e.active);}
function lock(world,on){if(!world?.input)return;world.input.keys?.clear?.();world.input.enabled=!on;}

function sfx(kind){
  try{
    audioCtx=audioCtx||new (root.AudioContext||root.webkitAudioContext)();
    const c={chop:[145,72,.10,'square',.055],mine:[245,85,.12,'triangle',.06],water:[620,260,.13,'sine',.04],harvest:[520,930,.10,'sine',.045],net:[440,860,.09,'square',.035]}[kind]||[420,620,.08,'sine',.03];
    const o=audioCtx.createOscillator(),g=audioCtx.createGain(),n=audioCtx.currentTime;o.connect(g);g.connect(audioCtx.destination);o.type=c[3];o.frequency.setValueAtTime(c[0],n);o.frequency.exponentialRampToValueAtTime(Math.max(45,c[1]),n+c[2]);g.gain.setValueAtTime(c[4],n);g.gain.exponentialRampToValueAtTime(.001,n+c[2]);o.start(n);o.stop(n+c[2]+.03);
  }catch(_){}
}
function burst(x,y,kind,count=9){
  const pal={chop:['#9a633b','#68442d','#6f984f'],mine:['#a9aaa1','#73766f','#d2d1c7'],water:['#65a9bd','#bde9f2','#4c94b7'],harvest:['#7cac57','#d4b34f','#db813d'],net:['#f1df98','#fff5c6','#9ccf79']}[kind]||['#fff','#ddd'];
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,sp=45+Math.random()*105;
    particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-55,life:.42+Math.random()*.35,max:.8,size:2+Math.random()*4,color:pal[i%pal.length],gravity:kind==='water'?80:210,shape:kind});
  }
}
function floatText(x,y,text,color='#fff0ad'){floaters.push({x,y,text,color,life:1,max:1,vy:-34});}

function swingProgress(kind,p){
  if(kind==='water')return Math.sin(clamp(p)*Math.PI)*.34-.18;
  if(kind==='harvest')return Math.sin(clamp(p)*Math.PI)*.28-.12;
  const hit=CFG[kind]?.hitAt||.54;
  if(p<=hit){const q=easeInOut(p/hit);return -1.30+q*2.05;}
  const q=easeOut((p-hit)/(1-hit));return .75-q*.62;
}
function bodyRotation(kind,p,facing){
  if(kind==='water')return facing*(.03+Math.sin(p*Math.PI)*.055);
  if(kind==='harvest')return facing*(-.02+Math.sin(p*Math.PI)*.10);
  if(kind==='net')return facing*(-.08+Math.sin(p*Math.PI)*.20);
  const hit=CFG[kind]?.hitAt||.54;
  if(p<hit)return facing*(-.09+easeInOut(p/hit)*.18);
  return facing*(.09-easeOut((p-hit)/(1-hit))*.06);
}
function targetPoint(t){return {x:t.centerX,y:t.y+Math.max(8,t.h*.45)};}

function drawTool(c,kind,anchor,facing,p,target){
  if(kind==='chop'||kind==='mine'){
    const iron=target?.data?.__usedTier==='iron';
    const key=kind==='chop'?(iron?'axeIron':'axe'):(iron?'pickaxeIron':'pickaxe');
    const rot=swingProgress(kind,p);
    const px=anchor.x+facing*25,py=anchor.y-17;
    if(K.ModelSprites?.drawAt?.(key,c,px,py,62,62,{rotation:rot,flip:facing<0}))return;
  }
  c.save();c.translate(anchor.x,anchor.y);c.scale(facing,1);c.rotate(swingProgress(kind,p));c.lineCap='round';c.lineJoin='round';
  if(kind==='chop'||kind==='mine'){
    c.strokeStyle='#5e3b26';c.lineWidth=6;c.beginPath();c.moveTo(-2,3);c.lineTo(38,-23);c.stroke();c.translate(38,-23);c.rotate(.34);
    c.fillStyle=kind==='chop'?'#bac5c2':'#939fa0';c.strokeStyle='#292a26';c.lineWidth=2.4;c.beginPath();
    if(kind==='chop'){c.moveTo(-7,-11);c.lineTo(14,-14);c.lineTo(19,2);c.lineTo(-2,7);}else{c.moveTo(-16,-4);c.lineTo(17,-8);c.lineTo(20,0);c.lineTo(-14,6);}c.closePath();c.fill();c.stroke();
  }else if(kind==='water'){
    c.rotate(.18);c.fillStyle='#7198a1';c.strokeStyle='#2d302d';c.lineWidth=2.4;c.beginPath();c.roundRect(4,-12,31,23,5);c.fill();c.stroke();c.strokeStyle='#7198a1';c.lineWidth=7;c.beginPath();c.moveTo(34,-6);c.lineTo(53,-16);c.stroke();
    if(p>.28&&p<.86){c.strokeStyle='#76bddd';c.lineWidth=3;for(let i=0;i<4;i++){c.beginPath();c.moveTo(54+i*2,-14+i);c.quadraticCurveTo(72+i*4,-1+i*3,81+i*5,14+i*5);c.stroke();}}
  }else if(kind==='net'){
    c.strokeStyle='#6b482f';c.lineWidth=5;c.beginPath();c.moveTo(0,0);c.lineTo(40,-28);c.stroke();c.translate(40,-28);c.strokeStyle='#ded7bd';c.lineWidth=3;c.beginPath();c.ellipse(10,-5,18,24,.28,0,Math.PI*2);c.stroke();c.globalAlpha=.45;for(let i=-8;i<=18;i+=7){c.beginPath();c.moveTo(i,-24);c.lineTo(i+15,12);c.stroke();}
  }else if(kind==='harvest'){
    c.fillStyle='#efc294';c.strokeStyle='#5a4133';c.lineWidth=2;c.beginPath();c.ellipse(20,-9,7,10,-.4,0,Math.PI*2);c.fill();c.stroke();
  }
  c.restore();
}

function resourceDecorator(base,kind){
  return function(c,e,w){
    if(e.data.workDestroyed){
      c.save();c.imageSmoothingEnabled=false;
      if(kind==='chop'){c.fillStyle='#765033';c.fillRect(e.centerX-13,e.y+e.h-15,26,15);c.fillStyle='#b28255';c.fillRect(e.centerX-9,e.y+e.h-14,18,4);}
      else{c.fillStyle='#787b75';c.fillRect(e.x-4,e.y+e.h-12,e.w+8,11);c.fillStyle='#a8aaa3';c.fillRect(e.x+8,e.y+e.h-17,13,8);}
      c.restore();return;
    }
    const fx=e.data.workFx,now=performance.now();let wob=0;
    if(fx&&now<fx.until){const age=(now-fx.start)/Math.max(1,fx.until-fx.start);wob=Math.sin(age*Math.PI*7)*(1-age)*(fx.power||.09);}else if(fx)delete e.data.workFx;
    if(wob){c.save();c.translate(e.centerX,e.y+e.h);c.rotate(wob);c.translate(-e.centerX,-e.y-e.h);base?.(c,e,w);c.restore();}else base?.(c,e,w);
  };
}
function updateResourceLabel(e,kind){
  if(e.data.workDestroyed){e.interaction=null;return;}
  const left=Math.max(0,e.data.workHp||0),name=kind==='chop'?'도끼질하기':'곡괭이질하기';
  if(!e.interaction)e.interaction={};e.interaction.label=`${name} · ${left}`;
}
function bindResource(e,kind,hp){
  if(!e||e.data.__workBound)return;e.data.__workBound=true;e.data.workHp=hp;e.data.workMaxHp=hp;
  e.render=resourceDecorator(e.render,kind);e.interactionRadius=Math.max(e.interactionRadius||0,104);
  e.interaction={label:'',action(target,world){perform(world,kind,target);}};updateResourceLabel(e,kind);
}

function impactTarget(world,s){
  const t=s.target,cfg=CFG[s.kind];if(!t||!cfg)return;
  t.data=t.data||{};t.data.workFx={kind:s.kind,start:performance.now(),until:performance.now()+330,power:s.kind==='mine'?.14:.10};
  const q=targetPoint(t);burst(q.x,q.y,s.kind,s.kind==='water'?8:10);shake=Math.max(shake,s.kind==='mine'?6.5:4.5);sfx(s.kind);
  if(s.kind==='chop'||s.kind==='mine'){
    t.data.workHp=Math.max(0,(t.data.workHp||1)-1);floatText(q.x,q.y-22,`-${1}`,'#ffe7a0');
    if(t.data.workHp<=0){t.data.workDestroyed=true;t.solid=false;t.interaction=null;burst(q.x,q.y,s.kind,16);floatText(q.x,q.y-42,s.kind==='chop'?'쓰러졌다!':'부서졌다!','#fff3ba');}
    else updateResourceLabel(t,s.kind);
  }else if(s.kind==='water'){
    t.data.watered=true;t.data.harvested=false;t.interaction={label:'작물 수확하기',action(target,w){perform(w,'harvest',target);}};floatText(q.x,q.y-28,'촉촉!','#bfeeff');
  }else if(s.kind==='harvest'){
    t.data.harvested=true;t.data.watered=false;t.interaction=null;floatText(q.x,q.y-28,'수확!','#fff0a8');
    setTimeout(()=>{if(!t.data.workDestroyed){t.data.harvested=false;t.interaction={label:'밭에 물주기',action(target,w){perform(w,'water',target);}};}},3200);
  }else if(s.kind==='net'){
    t.data.caught=true;t.visible=false;t.active=false;floatText(q.x,q.y-25,'잡았다!','#fff0a8');
    setTimeout(()=>{t.data.caught=false;t.visible=true;t.active=!isInside(world);},3500);
  }
  try{s.onHit?.(t,world);}catch(_){}
}

function finish(world,showMessage=true){
  const s=active.get(world);if(!s)return false;
  actorOf(world)?.clearPose();world.player.vx=0;world.player.vy=0;lock(world,false);active.delete(world);
  if(showMessage)toast(s.message||CFG[s.kind]?.message||'완료!');
  try{s.onDone?.(s.target,world);}catch(_){}
  return true;
}
function cancel(world){return finish(world,false);}
function perform(world,kind,target,options={}){
  const cfg=CFG[kind];if(!world?.player||!target||!cfg)return false;
  K.LifeAnimation?.cancel?.(world,world.player,true);if(active.has(world))cancel(world);
  const p=world.player,actor=actorOf(world),facing=target.centerX>=p.centerX?1:-1,duration=Math.max(300,Number(options.duration)||cfg.duration),now=performance.now();
  lock(world,true);p.vx=0;p.vy=0;world.interaction.current=null;
  actor?.setPose(cfg.pose,{duration,facing,rotation:0,bob:kind==='water'?.35:0,scaleY:kind==='harvest'?.94:.98});
  const s={kind,target,start:now,end:now+duration,duration,hit:false,facing,message:options.message,onHit:options.onHit,onDone:options.onDone};active.set(world,s);
  return true;
}

function cropRender(c,e){
  c.save();c.imageSmoothingEnabled=false;
  if(e.data.harvested){c.fillStyle='#705238';c.fillRect(e.x,e.y+e.h-7,e.w,7);c.restore();return;}
  const wet=e.data.watered;c.fillStyle=wet?'#4b823f':'#6f914c';
  for(let i=0;i<4;i++){const x=e.x+10+i*15,y=e.y+e.h-8;c.fillRect(x,y-18-(i%2)*4,5,20);c.fillStyle=i%2?'#7eaa5b':'#6f9d50';c.fillRect(x-5,y-20,8,6);c.fillRect(x+3,y-14,8,6);c.fillStyle=wet?'#4b823f':'#6f914c';}
  if(wet){c.fillStyle='#e59a3e';for(let i=0;i<3;i++)c.fillRect(e.x+16+i*18,e.y+e.h-13,8,9);}
  c.restore();
}
function bugRender(c,e){
  if(e.data.caught)return;const t=performance.now()/300,x=e.centerX,y=e.centerY+Math.sin(t)*8;c.save();c.translate(x,y);c.rotate(Math.sin(t*.7)*.12);c.fillStyle='#f2cc63';c.strokeStyle='#3d3425';c.lineWidth=2;c.beginPath();c.ellipse(-7,0,8,5,-.5,0,Math.PI*2);c.ellipse(7,0,8,5,.5,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#59472d';c.fillRect(-2,-5,4,12);c.restore();
}
function installFarmPractice(world){
  if(world.entities.get('work-crop-1'))return;
  const inside=isInside(world);const crops=[[2570,405],[2815,405],[3060,405]];
  crops.forEach((p,i)=>world.spawn({id:'work-crop-'+(i+1),type:'crop',x:p[0],y:p[1],w:66,h:48,solid:false,visible:!inside,active:!inside,tags:['outdoor','work-resource'],data:{watered:false,harvested:false},render:cropRender,interactionRadius:112,interaction:{label:'밭에 물주기',action(t,w){perform(w,'water',t);}}}));
  world.spawn({id:'work-bug-1',type:'bug',x:3150,y:665,w:36,h:30,solid:false,visible:!inside,active:!inside,tags:['outdoor','work-resource'],data:{caught:false},render:bugRender,interactionRadius:110,interaction:{label:'채집망 휘두르기',action(t,w){perform(w,'net',t);}}});
}
function installFxEntity(world){
  if(world.entities.get('work-fx-layer'))return;
  const inside=isInside(world);
  world.spawn({id:'work-fx-layer',type:'effect',x:0,y:0,w:1,h:1,solid:false,visible:!inside,active:!inside,depthOffset:100000,tags:['outdoor'],render(c,e,w){
    const s=active.get(w);if(s){const p=clamp((performance.now()-s.start)/s.duration),actor=actorOf(w),a=actor?.handAnchor?.(true);if(a)drawTool(c,s.kind,a,s.facing,p,s.target);}
    for(const q of particles){c.save();c.globalAlpha=clamp(q.life/.18);c.fillStyle=q.color;if(q.shape==='water'){c.beginPath();c.ellipse(q.x,q.y,q.size*.55,q.size,0,0,Math.PI*2);c.fill();}else c.fillRect(q.x-q.size/2,q.y-q.size/2,q.size,q.size*.72);c.restore();}
    for(const f of floaters){c.save();c.globalAlpha=clamp(f.life/.2);c.textAlign='center';c.font='900 16px sans-serif';c.lineWidth=4;c.strokeStyle='#272820';c.strokeText(f.text,f.x,f.y);c.fillStyle=f.color;c.fillText(f.text,f.x,f.y);c.restore();}
  }});
}
function update(world,dt){
  const sec=dt;for(const q of particles){q.x+=q.vx*sec;q.y+=q.vy*sec;q.vy+=q.gravity*sec;q.life-=sec;}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  for(const f of floaters){f.y+=f.vy*sec;f.life-=sec;}for(let i=floaters.length-1;i>=0;i--)if(floaters[i].life<=0)floaters.splice(i,1);
  if(shake>.08){world.camera.x+=((Math.random()-.5)*shake);world.camera.y+=((Math.random()-.5)*shake);shake*=Math.pow(.06,sec);}else shake=0;
  const s=active.get(world);if(!s)return;
  const now=performance.now(),p=clamp((now-s.start)/s.duration),actor=actorOf(world);if(actor?.pose)actor.pose.rotation=bodyRotation(s.kind,p,s.facing);
  if(!s.hit&&p>=CFG[s.kind].hitAt){s.hit=true;impactTarget(world,s);}
  if(p>=1)finish(world,true);
}
function install(world){
  if(!world||world.__workAnimationInstalled)return false;world.__workAnimationInstalled=true;
  world.entities.all().filter(e=>e.tags.has('outdoor')&&e.type==='tree').forEach(e=>bindResource(e,'chop',3));
  world.entities.all().filter(e=>e.tags.has('outdoor')&&e.type==='rock').forEach(e=>bindResource(e,'mine',2));
  installFarmPractice(world);installFxEntity(world);
  world.events.on('update',({dt})=>update(world,dt));
  root.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&active.has(world)){ev.preventDefault();ev.stopImmediatePropagation();cancel(world);toast('작업을 취소했어요.');}},true);
  return true;
}
function autoInstall(){
  let tries=0;const timer=setInterval(()=>{const w=K.activeWorld||root.__kidscadeWorldV2;if(w?.player){clearInterval(timer);install(w);}else if(++tries>120)clearInterval(timer);},50);
}

K.WorkAnimation={installed:true,CFG,active,install,perform,cancel,bindResource};
autoInstall();
})(window);
