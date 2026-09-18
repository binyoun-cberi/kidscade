(()=>{
'use strict';

const C=document.getElementById('game'),ctx=C.getContext('2d'),TC=document.getElementById('toolCanvas'),tctx=TC.getContext('2d');
const $=id=>document.getElementById(id),TAU=Math.PI*2,FOV=Math.PI*.58,SURFACE=18;
const ROOT='../../assets/game/2d/underwater/underwater-diving/';
const PATH={
 bg:ROOT+'environment/background.png',mid:ROOT+'environment/midground.png',props:ROOT+'environment/props.png',
 fish:ROOT+'enemies/fish.png',dart:ROOT+'enemies/fish-dart.png',big:ROOT+'enemies/fish-big.png',
 mine:ROOT+'enemies/mine.png',mineSmall:ROOT+'enemies/mine-small.png',mineBig:ROOT+'enemies/mine-big.png',
 bubbles:ROOT+'fx/bubbles.png',explosion:ROOT+'fx/explosion.png',
 diver:ROOT+'player/player-swiming.png'
};
const SAVE='deep_diver_openwater_v4',OLD='deep_diver_openwater_v3';
const img={}; let assetsReady=false;

const SPECIES={
 coral:{name:'산호 정원어',sheet:'dart',frames:4,fw:39,fh:20,hue:0,value:140,protected:false,note:'밝은 수심의 암초 주변에서 무리를 이루는 소형 어류.'},
 blue:{name:'청색 암초어',sheet:'dart',frames:4,fw:39,fh:20,hue:155,value:180,protected:false,note:'바위와 해초 사이를 빠르게 이동하는 암초성 어류.'},
 angler:{name:'심해 등불어',sheet:'fish',frames:4,fw:32,fh:32,hue:15,value:480,protected:true,note:'빛이 거의 없는 깊은 수심에서 발견되는 관찰 대상.'},
 giant:{name:'대형 심해 포식어',sheet:'big',frames:4,fw:54,fh:49,hue:0,value:0,protected:true,note:'심해의 대형 포식성 생물. 포획하지 말고 거리를 유지해 촬영한다.'}
};
const PROP={
 arch:{sx:145,sy:24,sw:195,sh:195,wu:12},
 statue:{sx:372,sy:24,sw:92,sh:215,wu:6},
 statueMoss:{sx:516,sy:25,sw:115,sh:220,wu:7},
 gate:{sx:650,sy:48,sw:236,sh:184,wu:15},
 plant:{sx:540,sy:284,sw:67,sh:74,wu:3.8}
};
const CONTRACTS=[
 {id:'reef',title:'01 · 산호초 생태 조사',desc:'밝은 산호 정원에서 두 종류의 암초어를 촬영하고 안전하게 귀환하세요.',reward:900,unlock:0,spawnZ:0},
 {id:'ruins',title:'02 · 침수 유적 기록',desc:'침수 유적의 석상과 거대 아치를 기록하고 고대 표식판을 회수하세요.',reward:1500,unlock:1,spawnZ:48},
 {id:'wreck',title:'03 · 난파선 구조',desc:'기뢰 지대를 소나로 통과해 난파선 격벽을 절단하고 항해기록 장치를 회수하세요.',reward:2300,unlock:2,spawnZ:105},
 {id:'abyss',title:'04 · 심해 생물 조사',desc:'350m 아래로 내려가 등불어와 대형 심해 포식어를 촬영한 뒤 생환하세요.',reward:3200,unlock:3,spawnZ:155},
 {id:'grand',title:'05 · 블루 익스페디션',desc:'유적 기록, 난파선 회수, 심해 생물 촬영을 한 번의 장거리 잠수에서 완수하세요.',reward:5200,unlock:4,spawnZ:0}
];
const UPGRADES={
 oxygen:{name:'산소통',desc:'산소 지속시간 +18초',base:900,max:5},
 fins:{name:'추진 핀',desc:'이동 속도 +7%',base:850,max:5},
 bag:{name:'표본 케이스',desc:'회수 슬롯 +2',base:700,max:4},
 sonar:{name:'소나 모듈',desc:'재사용 대기시간 감소',base:1000,max:5},
 suit:{name:'심해 잠수복',desc:'안전 수심 +75m',base:1200,max:5}
};
const game={day:1,money:0,bestDepth:0,codex:{},up:{oxygen:0,fins:0,bag:0,sonar:0,suit:0},unlocked:0,bestScore:0,last:null};

let W=innerWidth,H=innerHeight,DPR=1,last=0,state='start',world=null,pointerLocked=false,keys={},sound=false,audioCtx=null;
let moveTouch={x:0,y:0},lookTouch={active:false,id:null,x:0,y:0},verticalTouch=0,stickId=null;

function injectStyles(){
 const s=document.createElement('style');
 s.textContent=[
 '.assetCredit{font-size:11px;color:#7fb0ba;margin-top:16px;line-height:1.5}',
 '.diverIcon{width:56px;height:56px;background-image:url("'+PATH.diver+'");background-repeat:no-repeat;background-size:392px 56px;animation:diverSwim .8s steps(7) infinite;image-rendering:pixelated;filter:drop-shadow(0 5px 6px #0008)}',
 '@keyframes diverSwim{to{background-position:-392px 0}}',
 '.contractGrid,.shopGrid,.codexGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:14px 0}',
 '.contractCard,.shopCard,.codexCard{background:rgba(8,42,54,.8);border:1px solid rgba(112,209,225,.22);border-radius:13px;padding:14px}',
 '.contractCard.locked{opacity:.38;filter:grayscale(.8)}',
 '.contractCard h3,.shopCard h3,.codexCard h3{margin:0 0 7px;color:#e7fbff}',
 '.contractCard p,.shopCard p,.codexCard p{font-size:13px;line-height:1.5;color:#b8dce2}',
 '.reward{color:#ffe27b;font-weight:900}',
 '.toolbarRow{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
 '.hudAvatar{display:flex;align-items:center;gap:9px}',
 '.hudAvatar .diverIcon{width:42px;height:42px;background-size:294px 42px;animation-name:diverSwimSmall}',
 '@keyframes diverSwimSmall{to{background-position:-294px 0}}',
 '.missionBadge{display:inline-block;padding:3px 8px;border-radius:999px;background:#0c6073;color:#dffaff;font-size:10px;font-weight:900;margin-bottom:5px}',
 '.scanLabel{position:fixed;z-index:15;left:50%;top:50%;transform:translate(-50%,35px);font-size:11px;font-weight:900;color:#d9fbff;text-shadow:0 2px 5px #000;pointer-events:none}',
 '.zoneToast{position:fixed;z-index:21;left:50%;top:18%;transform:translate(-50%,-50%);font:900 28px Impact,system-ui;letter-spacing:.08em;color:#e8fcff;text-shadow:0 3px 0 #034657,0 0 20px #49dbea;opacity:0;transition:.25s;pointer-events:none}',
 '.zoneToast.show{opacity:1;transform:translate(-50%,0)}',
 '.resultSprite{display:flex;align-items:center;gap:15px;margin-bottom:12px}',
 '.resultSprite .diverIcon{flex:0 0 56px}',
 '.dangerNote{color:#ffb6a6;font-weight:800}',
 '.btn:disabled{opacity:.4;cursor:not-allowed;filter:grayscale(1)}',
 '@media(max-width:760px){.contractGrid,.shopGrid,.codexGrid{grid-template-columns:1fr}.hudAvatar .diverIcon{display:none}}'
 ].join('\n');
 document.head.appendChild(s);
 const label=document.createElement('div');label.id='scanLabel';label.className='scanLabel';document.body.appendChild(label);
 const zt=document.createElement('div');zt.id='zoneToast';zt.className='zoneToast';document.body.appendChild(zt);
}
injectStyles();

function createOverlay(id,title){
 const wrap=document.createElement('div');wrap.className='overlay hidden';wrap.id=id;
 wrap.innerHTML='<div class="panel"><h2>'+title+'</h2><div id="'+id+'Body"></div></div>';
 document.body.appendChild(wrap);return wrap;
}
const contractScreen=createOverlay('contractScreen','잠수 계약 게시판');
const shopScreen=createOverlay('shopScreen','잠수 장비실');
const codexScreen=createOverlay('codexScreen','해양 조사 도감');

function preload(){
 const entries=Object.entries(PATH);
 let done=0;
 const sub=document.querySelector('#startScreen .sub');
 $('startBtn').disabled=true;$('continueBtn').disabled=true;
 if(sub)sub.textContent='수중 에셋 불러오는 중… 0/'+entries.length;
 Promise.all(entries.map(([k,src])=>new Promise(resolve=>{
   const im=new Image();img[k]=im;
   im.onload=()=>{done++;if(sub)sub.textContent='수중 에셋 불러오는 중… '+done+'/'+entries.length;resolve()};
   im.onerror=()=>{done++;resolve()};im.src=src;
 }))).then(()=>{
   assetsReady=true;$('startBtn').disabled=false;$('continueBtn').disabled=false;
   if(sub)sub.textContent='심해 다이버 · 에셋 리워크 v4';
 });
}
preload();

function resize(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;C.width=Math.floor(W*DPR);C.height=Math.floor(H*DPR);C.style.width=W+'px';C.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rnd(a,b){return a+Math.random()*(b-a)}
function dist3(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)}
function won(v){return Math.round(v).toLocaleString('ko-KR')+'원'}
function stats(){return{oxygen:115+game.up.oxygen*18,speed:8.3*(1+game.up.fins*.07),bag:6+game.up.bag*2,safe:230+game.up.suit*75,sonarCd:Math.max(3.5,9-game.up.sonar*.85)}}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(game))}catch(e){}}
function load(){
 let r=null;
 try{r=JSON.parse(localStorage.getItem(SAVE)||'null')}catch(e){}
 if(!r){try{const o=JSON.parse(localStorage.getItem(OLD)||'null');if(o)r={day:o.day||1,money:o.money||0,bestDepth:o.bestDepth||0,codex:o.codex||{},up:o.up||game.up,unlocked:Math.min(2,(o.day||1)-1),bestScore:0}}catch(e){}}
 if(r){game.day=r.day||1;game.money=r.money||0;game.bestDepth=r.bestDepth||0;game.codex=r.codex||{};game.up=Object.assign({},game.up,r.up||{});game.unlocked=Number.isFinite(r.unlocked)?r.unlocked:0;game.bestScore=r.bestScore||0}
}
function beep(f=500,d=.08,type='triangle'){if(!sound)return;if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;o.frequency.value=f;o.type=type;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+d+.02)}
function showHint(t,s=2.2){$('hint').textContent=t;$('hint').classList.add('show');if(world)world.hintT=s;else setTimeout(()=>$('hint').classList.remove('show'),s*1000)}
function zoneByZ(z){if(z<55)return'산호 정원';if(z<112)return'해초 협곡';if(z<168)return'침수 유적';if(z<218)return'난파선 지대';return'심해 절벽'}
function seabedY(x,z){return -4.8-Math.sin(x*.08)*1.1-Math.cos(z*.04)*1.2-z*.058+Math.sin((x+z)*.03)*.6}
function depth(){return Math.max(2,(SURFACE-world.p.y)*12.2)}
function showZone(name){const z=$('zoneToast');z.textContent=name;z.classList.add('show');clearTimeout(showZone.t);showZone.t=setTimeout(()=>z.classList.remove('show'),1400)}
function project(pt){const p=world.p,dx=pt.x-p.x,dy=pt.y-p.y,dz=pt.z-p.z,cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),x1=cy*dx-sy*dz,z1=sy*dx+cy*dz,cp=Math.cos(p.pitch),sp=Math.sin(p.pitch),y1=cp*dy-sp*z1,z2=sp*dy+cp*z1;if(z2<.25)return null;const f=(W*.5)/Math.tan(FOV*.5);return{x:W*.5+x1*f/z2,y:H*.5-y1*f/z2,z:z2,scale:f/z2}}
function cameraSpace(pt){const p=world.p,dx=pt.x-p.x,dy=pt.y-p.y,dz=pt.z-p.z,cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),x1=cy*dx-sy*dz,z1=sy*dx+cy*dz,cp=Math.cos(p.pitch),sp=Math.sin(p.pitch);return{x:x1,y:cp*dy-sp*z1,z:sp*dy+cp*z1}}

function addFish(key,x,y,z,s,phase){world.fish.push({key,x,y,z,baseX:x,baseY:y,baseZ:z,s:s||1,phase:phase||rnd(0,TAU),alive:true,photo:false,flip:false})}
function addProp(type,x,z,s,scanId){world.props.push({type,x,z,y:seabedY(x,z),s:s||1,scanId:scanId||null,scanned:false})}
function makeWorld(contractId){
 const contract=CONTRACTS.find(c=>c.id===contractId)||CONTRACTS[0],st=stats();
 world={
  contract,p:{x:0,y:5.8,z:contract.spawnZ||0,yaw:0,pitch:-.03,ox:st.oxygen,hp:100},
  s:st,tool:0,time:0,hintT:5,sonar:0,sonarCd:0,flash:true,bag:[],income:0,maxDepth:0,lastZone:'',
  fish:[],props:[],rocks:[],kelp:[],pickups:[],mines:[],effects:[],particles:[],
  mission:{photos:{},ruins:{statue:false,arch:false},relic:false,door:false,recorder:false,deep:false},
  wreckDoorOpen:false,complete:false
 };
 for(let i=0;i<45;i++)world.rocks.push({x:rnd(-44,44),z:rnd(-5,270),r:rnd(1.1,4.2),lift:rnd(-.3,.5),tint:rnd(0,1)});
 for(let i=0;i<34;i++)world.kelp.push({x:rnd(-34,34),z:rnd(45,112),h:rnd(3,8),phase:rnd(0,TAU)});
 for(let i=0;i<110;i++)world.particles.push({x:rnd(-55,55),y:rnd(-18,15),z:rnd(0,275),s:rnd(.5,1.8),a:rnd(.12,.5)});
 for(let i=0;i<9;i++)addProp('plant',rnd(-25,25),rnd(12,48),rnd(.65,1.25));
 addProp('statue',-12,126,1.15,'statue');addProp('statueMoss',13,137,1.05,null);addProp('arch',1,148,1.2,'arch');addProp('gate',-4,160,1.0,null);
 for(let i=0;i<7;i++)addFish(i%2?'coral':'blue',rnd(-19,19),rnd(0,6),rnd(12,52),rnd(.72,1.05),i);
 for(let i=0;i<8;i++)addFish(i%3?'blue':'coral',rnd(-22,22),rnd(-2,4),rnd(58,108),rnd(.7,.95),i*.7);
 for(let i=0;i<5;i++)addFish('angler',rnd(-18,18),rnd(-12,-4),rnd(220,262),rnd(.75,1.0),i);
 addFish('giant',7,-12,248,1.25,1.5);
 world.pickups.push({key:'relic',name:'고대 표식판',x:8,y:seabedY(8,154)+1.8,z:154,value:620,taken:false});
 world.pickups.push({key:'recorder',name:'항해기록 장치',x:8,y:seabedY(8,204)+2,z:204,value:1100,taken:false});
 for(let i=0;i<8;i++){const z=174+i*5.5;world.mines.push({x:(i%2?1:-1)*rnd(7,19),y:seabedY(0,z)+rnd(3,7),z,size:i%3===0?'big':i%3===1?'normal':'small',fuse:0,dead:false,revealed:0})}
 state='game';document.body.classList.add('playing');$('startScreen').classList.add('hidden');contractScreen.classList.add('hidden');$('resultScreen').classList.add('hidden');
 setTimeout(()=>C.requestPointerLock&&C.requestPointerLock(),80);showZone(zoneByZ(world.p.z));showHint('소나로 목표와 위험물을 찾고, 필요한 장비만 사용하세요.',4);
}

function renderFar(){
 const d=depth(),yaw=world.p.yaw;
 let top=d<160?'#39bcd0':d<300?'#087a97':'#052a49',bot=d<210?'#04677f':d<380?'#062d50':'#02091b';
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(.62,bot);g.addColorStop(1,'#010a12');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(img.bg&&img.bg.complete){
   ctx.save();ctx.globalAlpha=clamp(.44-d/900,.1,.44);const scale=Math.max(W/288,H/256)*1.25,iw=288*scale,ih=256*scale,off=((yaw/TAU)*iw)%iw;
   for(let x=-off-iw;x<W+iw;x+=iw)ctx.drawImage(img.bg,x,H-ih,iw,ih);ctx.restore();
 }
 if(img.mid&&img.mid.complete&&world.p.z>92){
   ctx.save();ctx.globalAlpha=clamp((world.p.z-90)/130,0,.27);const scale=Math.max(W/960,H/512)*1.08,iw=960*scale,ih=512*scale,off=((yaw/TAU)*iw*.7)%iw;
   ctx.drawImage(img.mid,-off,H-ih,iw,ih);ctx.drawImage(img.mid,iw-off,H-ih,iw,ih);ctx.restore();
 }
 if(d<230){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<7;i++){const x=W*(i+.5)/7+Math.sin(world.time*.25+i)*35,gg=ctx.createLinearGradient(x,0,x+100,H);gg.addColorStop(0,'rgba(220,255,255,.18)');gg.addColorStop(1,'rgba(80,210,235,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.moveTo(x-35,0);ctx.lineTo(x+25,0);ctx.lineTo(x+150,H*.9);ctx.lineTo(x-130,H*.9);ctx.closePath();ctx.fill()}ctx.restore()}
}
function terrainTriangles(){const tris=[],step=10,near=Math.floor((world.p.z-12)/step)*step,far=world.p.z+120;for(let z=Math.max(-10,near);z<far;z+=step){for(let x=-58;x<58;x+=step){const a={x,y:seabedY(x,z),z},b={x:x+step,y:seabedY(x+step,z),z},c={x:x+step,y:seabedY(x+step,z+step),z:z+step},d={x,y:seabedY(x,z+step),z:z+step},pa=project(a),pb=project(b),pc=project(c),pd=project(d);if(pa&&pb&&pc)tris.push({p:[pa,pb,pc],z:(pa.z+pb.z+pc.z)/3,x,z0:z});if(pa&&pc&&pd)tris.push({p:[pa,pc,pd],z:(pa.z+pc.z+pd.z)/3,x,z0:z})}}tris.sort((a,b)=>b.z-a.z);return tris}
function drawTerrain(){for(const t of terrainTriangles()){const f=clamp(1-t.z/135,.14,1),zname=zoneByZ(t.z0),base=zname==='산호 정원'?[21,108,96]:zname==='해초 협곡'?[15,84,72]:zname==='침수 유적'?[18,70,67]:zname==='난파선 지대'?[17,55,61]:[8,29,46],shade=((Math.floor(t.x/10)+Math.floor(t.z0/10))&1)?1:.9;ctx.fillStyle='rgb('+Math.round(base[0]*f*shade)+','+Math.round(base[1]*f*shade)+','+Math.round(base[2]*f*shade)+')';ctx.beginPath();ctx.moveTo(t.p[0].x,t.p[0].y);ctx.lineTo(t.p[1].x,t.p[1].y);ctx.lineTo(t.p[2].x,t.p[2].y);ctx.closePath();ctx.fill()}}
function drawRock(r){const y=seabedY(r.x,r.z)+r.r*.55+r.lift,p=project({x:r.x,y,z:r.z});if(!p||p.z>145)return;const size=clamp(r.r*p.scale,3,H*.42),fade=clamp(1-p.z/145,.08,1),base=r.tint>.6?[49,72,68]:[37,56,62];ctx.save();ctx.globalAlpha=fade;const gr=ctx.createRadialGradient(p.x-size*.2,p.y-size*.25,size*.1,p.x,p.y,size);gr.addColorStop(0,'rgb('+(base[0]+25)+','+(base[1]+30)+','+(base[2]+28)+')');gr.addColorStop(1,'rgb('+base[0]+','+base[1]+','+base[2]+')');ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(p.x,p.y,size,size*.7,r.x*.11,0,TAU);ctx.fill();ctx.restore()}
function drawKelp(k){const y=seabedY(k.x,k.z),p=project({x:k.x,y,z:k.z}),top=project({x:k.x,y:y+k.h,z:k.z});if(!p||!top||p.z>105)return;const fade=clamp(1-p.z/105,.12,.85),w=clamp(p.scale*.38,1,6);ctx.save();ctx.globalAlpha=fade;ctx.strokeStyle='#3ca774';ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);const h=p.y-top.y;for(let i=1;i<=6;i++){const t=i/6;ctx.lineTo(p.x+Math.sin(world.time*1.3+k.phase+t*3)*w*3.2,p.y-h*t)}ctx.stroke();ctx.restore()}
function drawProp(o){const d=PROP[o.type],p=project({x:o.x,y:o.y+d.wu*.55*o.s,z:o.z});if(!d||!p||p.z>125||!img.props||!img.props.complete)return;const h=clamp(d.wu*o.s*p.scale,8,H*.78),w=h*(d.sw/d.sh),fade=clamp(1-p.z/130,.08,1);ctx.save();ctx.globalAlpha=fade;ctx.imageSmoothingEnabled=false;ctx.drawImage(img.props,d.sx,d.sy,d.sw,d.sh,p.x-w/2,p.y-h*.72,w,h);if(o.scanId&&!o.scanned&&world.sonar>0){ctx.strokeStyle='#66f4ff';ctx.lineWidth=2;ctx.strokeRect(p.x-w*.42,p.y-h*.66,w*.84,h*.8)}ctx.restore()}
function spriteFrame(def,time){return Math.floor(time*7)%def.frames}
function drawFish(f){if(!f.alive)return;const def=SPECIES[f.key],im=img[def.sheet],p=project(f);if(!p||p.z>115||!im||!im.complete)return;const fr=spriteFrame(def,world.time+f.phase),size=clamp(def.fh*p.scale*f.s*.8,6,130),w=size*(def.fw/def.fh),fade=clamp(1-p.z/120,.1,1);ctx.save();ctx.globalAlpha=fade;ctx.imageSmoothingEnabled=false;ctx.translate(p.x,p.y);if(f.flip)ctx.scale(-1,1);ctx.filter=def.hue?'hue-rotate('+def.hue+'deg) saturate(1.15)':'none';ctx.drawImage(im,fr*def.fw,0,def.fw,def.fh,-w/2,-size/2,w,size);ctx.filter='none';ctx.restore()}
function drawMine(m){if(m.dead)return;const p=project(m),im=img[m.size==='big'?'mineBig':m.size==='small'?'mineSmall':'mine'];if(!p||p.z>100||!im||!im.complete)return;const base=m.size==='big'?3.8:m.size==='small'?2.2:3,size=clamp(base*p.scale,7,80);ctx.save();ctx.globalAlpha=clamp(1-p.z/100,.12,1);ctx.imageSmoothingEnabled=false;ctx.translate(p.x,p.y);const pulse=m.fuse>0?1+Math.sin(world.time*15)*.12:1;ctx.scale(pulse,pulse);ctx.drawImage(im,-size/2,-size/2,size,size);if((world.sonar>0||m.fuse>0)&&!m.dead){ctx.strokeStyle=m.fuse>0?'#ff765d':'#64edff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,size*.7+Math.sin(world.time*5)*3,0,TAU);ctx.stroke()}ctx.restore()}
function drawWreck(){const x=5,z=202,y=seabedY(x,z),p=project({x,y:y+3,z});if(!p||p.z>120)return;const s=clamp(9*p.scale,18,H*.6),fade=clamp(1-p.z/120,.1,1);ctx.save();ctx.globalAlpha=fade;ctx.translate(p.x,p.y);ctx.fillStyle='#182a2f';ctx.strokeStyle='#5c7779';ctx.lineWidth=Math.max(1,s*.025);ctx.beginPath();ctx.moveTo(-s*.8,s*.15);ctx.lineTo(s*.8,s*.12);ctx.lineTo(s*.55,-s*.35);ctx.lineTo(-s*.55,-s*.28);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#0b1519';ctx.fillRect(-s*.16,-s*.25,s*.34,s*.27);ctx.strokeStyle=world.wreckDoorOpen?'#5cffbc':'#b87b46';ctx.lineWidth=Math.max(2,s*.025);ctx.strokeRect(-s*.18,-s*.27,s*.38,s*.31);ctx.restore()}
function drawPickup(q){if(q.taken)return;const p=project(q);if(!p||p.z>85)return;const s=clamp(1.2*p.scale,7,38);ctx.save();ctx.globalAlpha=clamp(1-p.z/90,.12,1);ctx.fillStyle=q.key==='relic'?'#d3c06a':'#6be1ea';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.fillRect(p.x-s*.45,p.y-s*.3,s*.9,s*.6);ctx.shadowBlur=0;if(world.sonar>0){ctx.strokeStyle='#7af7ff';ctx.strokeRect(p.x-s*.65,p.y-s*.5,s*1.3,s)}ctx.restore()}
function drawExplosion(e){const im=img.explosion,p=project(e);if(!p||!im||!im.complete)return;const fr=Math.min(9,Math.floor(e.t/.08)),fw=66,fh=82,s=clamp(7*p.scale,30,180);ctx.save();ctx.globalAlpha=clamp(1-e.t/.8,0,1);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,fr*fw,0,fw,fh,p.x-s/2,p.y-s/2,s,s);ctx.restore()}
function drawParticles(){ctx.save();for(const q of world.particles){q.y+=Math.sin(world.time*.35+q.x)*.0015;const p=project(q);if(!p||p.z>90)continue;const a=q.a*clamp(1-p.z/95,.04,1);ctx.fillStyle='rgba(210,250,250,'+a+')';const s=clamp(q.s*p.scale*.04,.4,2);ctx.beginPath();ctx.arc(p.x,p.y,s,0,TAU);ctx.fill()}ctx.restore()}
function drawPlayerBubbles(){const im=img.bubbles;if(!im||!im.complete)return;const fr=Math.floor(world.time*5)%4,fw=23,fh=40;ctx.save();ctx.globalAlpha=.32;ctx.imageSmoothingEnabled=false;for(let i=0;i<3;i++){const x=W*(.42+i*.08)+Math.sin(world.time*1.7+i)*12,y=H*.74-((world.time*25+i*30)%100);ctx.drawImage(im,fr*fw,0,fw,fh,x,y,fw*1.5,fh*1.5)}ctx.restore()}
function drawSonar(){if(world.sonar<=0)return;ctx.save();ctx.font='900 11px system-ui';ctx.textAlign='center';const list=[...world.fish.filter(f=>f.alive),...world.pickups.filter(q=>!q.taken),...world.props.filter(o=>o.scanId&&!o.scanned),...world.mines.filter(m=>!m.dead),{x:5,y:seabedY(5,202)+3,z:202,name:'난파선'}];for(const o of list){const p=project(o);if(!p||p.z>95)continue;ctx.strokeStyle=o.fuse>0?'#ff8069':'rgba(82,245,255,.7)';ctx.beginPath();ctx.arc(p.x,p.y,12+Math.sin(world.time*5)*3,0,TAU);ctx.stroke();ctx.fillStyle='#e2fcff';const name=o.name||(o.key&&SPECIES[o.key]?SPECIES[o.key].name:o.scanId?'유적 조사점':o.size?'기뢰':'신호');ctx.fillText(name,p.x,p.y-18)}ctx.restore()}
function drawMask(){ctx.save();const v=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.68);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.72,'rgba(0,5,8,.06)');v.addColorStop(1,'rgba(0,4,7,.62)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);if(depth()>280&&!world.flash){ctx.fillStyle='rgba(0,5,13,.72)';ctx.fillRect(0,0,W,H)}ctx.restore()}
function render(){
 ctx.setTransform(DPR,0,0,DPR,0,0);renderFar();drawTerrain();
 const draw=[];
 for(const r of world.rocks){const cs=cameraSpace({x:r.x,y:seabedY(r.x,r.z)+r.r*.55+r.lift,z:r.z});if(cs.z>.2)draw.push({z:cs.z,fn:()=>drawRock(r)})}
 for(const k of world.kelp){const cs=cameraSpace({x:k.x,y:seabedY(k.x,k.z)+2,z:k.z});if(cs.z>.2)draw.push({z:cs.z,fn:()=>drawKelp(k)})}
 for(const o of world.props){const cs=cameraSpace({x:o.x,y:o.y+4,z:o.z});if(cs.z>.2)draw.push({z:cs.z,fn:()=>drawProp(o)})}
 for(const f of world.fish){const cs=cameraSpace(f);if(cs.z>.2)draw.push({z:cs.z,fn:()=>drawFish(f)})}
 for(const m of world.mines){const cs=cameraSpace(m);if(cs.z>.2)draw.push({z:cs.z,fn:()=>drawMine(m)})}
 for(const q of world.pickups){const cs=cameraSpace(q);if(cs.z>.2)draw.push({z:cs.z,fn:()=>drawPickup(q)})}
 const wc=cameraSpace({x:5,y:seabedY(5,202)+3,z:202});if(wc.z>.2)draw.push({z:wc.z,fn:drawWreck});
 for(const e of world.effects){const cs=cameraSpace(e);if(cs.z>.2)draw.push({z:cs.z,fn:()=>drawExplosion(e)})}
 draw.sort((a,b)=>b.z-a.z);for(const d of draw)d.fn();
 drawParticles();drawSonar();drawPlayerBubbles();drawMask();drawTool();updateHUD();updateTargetLabel();
}
function drawTool(){tctx.clearRect(0,0,300,220);tctx.save();tctx.translate(150,220);tctx.fillStyle='rgba(23,46,53,.96)';tctx.beginPath();tctx.ellipse(-62,-18,80,38,-.2,0,TAU);tctx.ellipse(62,-18,80,38,.2,0,TAU);tctx.fill();if(world.tool===0){tctx.fillStyle='#15242a';tctx.fillRect(-78,-140,156,98);tctx.fillStyle='#36b6ce';tctx.fillRect(-48,-116,96,56);tctx.fillStyle='#020b0e';tctx.beginPath();tctx.arc(0,-88,27,0,TAU);tctx.fill();tctx.strokeStyle='#8ff2ff';tctx.lineWidth=3;tctx.strokeRect(-84,-146,168,110)}else if(world.tool===1){tctx.fillStyle='#0a4051';tctx.fillRect(-82,-135,164,91);tctx.fillStyle='#031419';tctx.fillRect(-63,-116,126,58);tctx.strokeStyle='#56f3ff';tctx.lineWidth=3;tctx.beginPath();tctx.arc(0,-87,42,0,TAU);tctx.stroke();tctx.beginPath();tctx.moveTo(0,-87);tctx.lineTo(Math.cos(world.time*3)*40,-87+Math.sin(world.time*3)*40);tctx.stroke()}else if(world.tool===2){tctx.fillStyle='#4d5153';tctx.fillRect(-22,-150,44,118);tctx.fillStyle='#d5a746';tctx.beginPath();tctx.arc(0,-151,38,0,TAU);tctx.fill();tctx.strokeStyle='#fff0ab';tctx.lineWidth=3;for(let i=0;i<14;i++){const a=i/14*TAU;tctx.beginPath();tctx.moveTo(Math.cos(a)*24,-151+Math.sin(a)*24);tctx.lineTo(Math.cos(a)*42,-151+Math.sin(a)*42);tctx.stroke()}}else{tctx.strokeStyle='#d5ebee';tctx.lineWidth=5;tctx.beginPath();tctx.arc(0,-92,68,0,TAU);tctx.stroke();for(let i=-2;i<=2;i++){tctx.beginPath();tctx.moveTo(-62,-92+i*13);tctx.lineTo(62,-92+i*13);tctx.stroke();tctx.beginPath();tctx.moveTo(i*13,-154);tctx.lineTo(i*13,-30);tctx.stroke()}}tctx.restore()}
function updateHUD(){const ox=clamp(world.p.ox/world.s.oxygen*100,0,100),hp=clamp(world.p.hp,0,100);$('o2Text').textContent=Math.round(ox)+'%';$('o2Fill').style.width=ox+'%';$('hpText').textContent=Math.round(hp);$('hpFill').style.width=hp+'%';$('depthText').textContent=Math.round(depth())+'m';$('zoneText').textContent=zoneByZ(world.p.z);const names=['CAMERA','SONAR','CUTTER','NET'];$('toolName').textContent='['+(world.tool+1)+'] '+names[world.tool];$('missionText').textContent=missionText();$('bagText').textContent='BAG '+world.bag.length+'/'+world.s.bag+' · '+won(world.income);$('sonarText').textContent=world.sonarCd>0?'SONAR '+world.sonarCd.toFixed(1)+'s':'SONAR READY'}
function missionText(){const m=world.mission,id=world.contract.id;if(id==='reef')return'촬영 '+(m.photos.coral?1:0)+(m.photos.blue?1:0)+'/2 · 출발 부표 귀환';if(id==='ruins')return'유적 기록 '+(m.ruins.statue?1:0)+(m.ruins.arch?1:0)+'/2 · 표식판 '+(m.relic?'회수':'미회수');if(id==='wreck')return'격벽 '+(m.door?'개방':'폐쇄')+' · 기록장치 '+(m.recorder?'회수':'미회수');if(id==='abyss')return'350m '+(m.deep?'도달':'미도달')+' · 심해 촬영 '+(m.photos.angler?1:0)+(m.photos.giant?1:0)+'/2';return'유적 '+((m.ruins.statue&&m.ruins.arch)?'완료':'미완료')+' · 난파선 '+(m.recorder?'완료':'미완료')+' · 심해 '+((m.photos.angler&&m.photos.giant)?'완료':'미완료')}
function target(max=28){
 let best=null,bd=1e9;
 for(const f of world.fish){if(!f.alive)continue;const c=cameraSpace(f);if(c.z<.2||c.z>max)continue;const score=Math.abs(c.x/c.z)+Math.abs(c.y/c.z)*.8;if(score<.18&&c.z<bd){best={kind:'fish',obj:f,d:c.z};bd=c.z}}
 for(const q of world.pickups){if(q.taken)continue;const c=cameraSpace(q);if(c.z<.2||c.z>10)continue;const score=Math.abs(c.x/c.z)+Math.abs(c.y/c.z);if(score<.22&&c.z<bd){best={kind:'pickup',obj:q,d:c.z};bd=c.z}}
 for(const o of world.props){if(!o.scanId||o.scanned)continue;const c=cameraSpace({x:o.x,y:o.y+4,z:o.z});if(c.z<.2||c.z>28)continue;const score=Math.abs(c.x/c.z)+Math.abs(c.y/c.z);if(score<.2&&c.z<bd){best={kind:'prop',obj:o,d:c.z};bd=c.z}}
 return best
}
function updateTargetLabel(){const t=target(30),el=$('scanLabel');if(!t){el.textContent='';return}if(t.kind==='fish')el.textContent=SPECIES[t.obj.key].name+' · '+Math.round(t.d)+'m';else if(t.kind==='prop')el.textContent='유적 조사점 · '+Math.round(t.d)+'m';else el.textContent=t.obj.name+' · '+Math.round(t.d)+'m'}
function missionComplete(){const m=world.mission,id=world.contract.id;if(id==='reef')return !!(m.photos.coral&&m.photos.blue);if(id==='ruins')return !!(m.ruins.statue&&m.ruins.arch&&m.relic);if(id==='wreck')return !!(m.door&&m.recorder);if(id==='abyss')return !!(m.deep&&m.photos.angler&&m.photos.giant);return !!(m.ruins.statue&&m.ruins.arch&&m.relic&&m.door&&m.recorder&&m.deep&&m.photos.angler&&m.photos.giant)}
function useTool(){
 if(state!=='game')return;
 if(world.tool===0){
  const t=target(30);if(!t){showHint('조사 대상을 화면 중앙에 맞추세요.',1.4);beep(180,.06);return}
  if(t.kind==='fish'){const f=t.obj;if(!f.photo){f.photo=true;world.mission.photos[f.key]=true;game.codex[f.key]=true;save();beep(1100,.06);setTimeout(()=>beep(1500,.07),70);showHint(SPECIES[f.key].name+' 촬영 · 도감 등록',1.8)}else showHint('이미 기록한 생물입니다.',1.2)}
  else if(t.kind==='prop'){t.obj.scanned=true;world.mission.ruins[t.obj.scanId]=true;beep(900,.07);showHint('유적 기록 완료 · '+(t.obj.scanId==='statue'?'침수 석상':'거대 석조 아치'),1.8)}
  else showHint('회수 대상은 E 키로 조사하세요.',1.3);
 }else if(world.tool===1)sonar();else if(world.tool===2)cutter();else net();
}
function sonar(){if(world.sonarCd>0){showHint('소나 재사용까지 '+world.sonarCd.toFixed(1)+'초',1.2);return}world.sonar=4.5;world.sonarCd=world.s.sonarCd;for(const m of world.mines)m.revealed=4.5;beep(210,.22);setTimeout(()=>beep(720,.16),90);showHint('소나 펄스 · 목표와 기뢰가 표시됩니다.',1.6)}
function cutter(){const door={x:5,y:seabedY(5,202)+3,z:202},d=dist3(world.p,door);if(d>8){showHint('난파선 격벽 가까이에서 사용하세요.',1.6);return}if(world.wreckDoorOpen){showHint('격벽은 이미 개방되었습니다.',1.1);return}world.wreckDoorOpen=true;world.mission.door=true;beep(130,.18);setTimeout(()=>beep(280,.12),120);showHint('격벽 절단 완료 · 내부 기록 장치에 접근 가능',2.1)}
function net(){const t=target(10);if(!t||t.kind!=='fish'){showHint('작은 물고기를 가까이 조준하세요.',1.3);return}const f=t.obj,def=SPECIES[f.key];if(def.protected){showHint(def.name+'은(는) 보호 관찰 대상입니다. 촬영만 하세요.',1.7);return}if(world.bag.length>=world.s.bag){showHint('표본 케이스가 가득 찼습니다.',1.3);return}f.alive=false;world.bag.push(f.key);world.income+=def.value;beep(620,.08);showHint(def.name+' 표본 확보 +'+won(def.value),1.5)}
function interact(){if(state!=='game')return;const t=target(9);if(!t||t.kind!=='pickup'){showHint('가까운 회수물을 중앙에 맞추세요.',1.3);return}const q=t.obj;if(q.key==='recorder'&&!world.wreckDoorOpen){showHint('난파선 격벽을 먼저 절단해야 합니다.',1.4);return}if(world.bag.length>=world.s.bag){showHint('표본 케이스가 가득 찼습니다.',1.3);return}q.taken=true;world.bag.push(q.key);world.income+=q.value;if(q.key==='relic')world.mission.relic=true;if(q.key==='recorder')world.mission.recorder=true;beep(820,.08);showHint(q.name+' 회수 +'+won(q.value),1.7)}
function explodeMine(m){if(m.dead)return;m.dead=true;world.effects.push({x:m.x,y:m.y,z:m.z,t:0});const d=dist3(world.p,m);if(d<8){const dmg=Math.round(34*(1-d/10));world.p.hp-=Math.max(8,dmg);showHint('기뢰 폭발! '+Math.max(8,dmg)+' 피해',1.5);beep(90,.22,'sawtooth')} }
function update(dt){
 if(state!=='game'||!world)return;world.time+=dt;if(world.hintT>0){world.hintT-=dt;if(world.hintT<=0)$('hint').classList.remove('show')}world.sonar=Math.max(0,world.sonar-dt);world.sonarCd=Math.max(0,world.sonarCd-dt);
 const p=world.p,sp=world.s.speed,fx=Math.sin(p.yaw),fz=Math.cos(p.yaw),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);let mx=0,mz=0;
 if(keys.w||keys.arrowup){mx+=fx;mz+=fz}if(keys.s||keys.arrowdown){mx-=fx;mz-=fz}if(keys.a){mx-=rx;mz-=rz}if(keys.d){mx+=rx;mz+=rz}
 mx+=moveTouch.x*rx+moveTouch.y*fx;mz+=moveTouch.x*rz+moveTouch.y*fz;let l=Math.hypot(mx,mz);if(l>1){mx/=l;mz/=l}
 p.x+=mx*sp*dt;p.z+=mz*sp*dt;const vv=(keys[' ']||keys.space?1:0)-(keys.shift?1:0)+verticalTouch;p.y+=vv*sp*.72*dt;
 p.z=clamp(p.z,-4,268);p.x=clamp(p.x,-58,58);const floor=seabedY(p.x,p.z)+1.15;p.y=clamp(p.y,floor,SURFACE-1.1);
 const dep=depth();world.maxDepth=Math.max(world.maxDepth,dep);if(dep>=350)world.mission.deep=true;p.ox-=dt*(.34+dep/1600);if(dep>world.s.safe)p.hp-=dt*(.55+(dep-world.s.safe)/155);
 const zn=zoneByZ(p.z);if(zn!==world.lastZone){world.lastZone=zn;showZone(zn)}
 if(p.ox<=0||p.hp<=0){finish(false,p.ox<=0?'산소가 고갈되어 구조 신호가 발신되었습니다.':'수압과 충격 누적으로 긴급 구조되었습니다.');return}
 for(const f of world.fish){if(!f.alive)continue;const amp=f.key==='giant'?4.5:2.2;f.x=f.baseX+Math.sin(world.time*.38+f.phase)*amp*f.s;f.y=f.baseY+Math.sin(world.time*.7+f.phase)*(f.key==='giant'?1.3:.55);f.z=f.baseZ+Math.cos(world.time*.28+f.phase)*(f.key==='giant'?5:1.8);f.flip=Math.cos(world.time*.38+f.phase)<0}
 const giant=world.fish.find(f=>f.key==='giant'&&f.alive);if(giant&&dist3(p,giant)<13){p.hp-=dt*7;if(Math.random()<dt*.7)showHint('대형 심해 생물과 거리를 확보하세요!',1)}
 for(const m of world.mines){if(m.dead)continue;m.revealed=Math.max(0,m.revealed-dt);const d=dist3(p,m);if(d<6.2&&m.fuse<=0){m.fuse=1.35;beep(240,.06);showHint('기뢰 근접 경보!',1.2)}if(m.fuse>0){m.fuse-=dt;if(m.fuse<=0)explodeMine(m)}}
 for(const e of world.effects)e.t+=dt;world.effects=world.effects.filter(e=>e.t<.8);
 if(missionComplete()&&Math.hypot(p.x,p.z-(world.contract.spawnZ||0))<9&&p.y>0){finish(true,'계약 목표를 완수하고 출발 부표로 안전하게 귀환했습니다.')}
}
function finish(ok,reason){
 if(state!=='game')return;state='result';document.body.classList.remove('playing');if(document.exitPointerLock)document.exitPointerLock();
 const complete=missionComplete(),base=complete?world.contract.reward:0,depthBonus=Math.round(world.maxDepth*1.4),survive=ok?350:0,loss=ok?0:Math.floor(world.income*.5),gain=Math.max(0,world.income-loss+base+depthBonus+survive);
 game.money+=gain;game.day++;game.bestDepth=Math.max(game.bestDepth,world.maxDepth);if(ok&&complete){game.unlocked=Math.max(game.unlocked,Math.min(CONTRACTS.length-1,world.contract.unlock+1))}
 const score=Math.round(gain+world.maxDepth*3+(ok?500:0));game.bestScore=Math.max(game.bestScore,score);game.last={ok,reason,contract:world.contract.id,gain,depth:world.maxDepth};save();
 $('resultTitle').textContent=ok?'무사 귀환 · 잠수 보고서':'긴급 구조 · 잠수 보고서';
 $('resultBody').innerHTML='<div class="resultSprite"><div class="diverIcon"></div><div><div class="mission">'+reason+'</div><div class="assetCredit">계약: '+world.contract.title+'</div></div></div><div class="grid"><div class="card"><b>계약 목표</b><br>'+(complete?'완료':'미완료')+'</div><div class="card"><b>최대 수심</b><br>'+Math.round(world.maxDepth)+'m</div><div class="card"><b>회수 수익</b><br>'+won(world.income)+'</div><div class="card"><b>계약 보상</b><br>'+won(base)+'</div><div class="card"><b>수심 보너스</b><br>'+won(depthBonus)+'</div><div class="card"><b>총 획득</b><br>'+won(gain)+'</div><div class="card"><b>보유 자금</b><br>'+won(game.money)+'</div><div class="card"><b>탐사 점수</b><br>'+score+'</div></div>';
 $('nextBtn').textContent='계약 게시판';$('resultScreen').classList.remove('hidden')
}
function frame(ts){const t=ts/1000,dt=Math.min(.033,Math.max(0,t-last||0));last=t;if(state==='game'){update(dt);render()}requestAnimationFrame(frame)}requestAnimationFrame(frame);

function openContracts(){
 state='menu';document.body.classList.remove('playing');$('startScreen').classList.add('hidden');$('resultScreen').classList.add('hidden');shopScreen.classList.add('hidden');codexScreen.classList.add('hidden');
 const body=$('contractScreenBody');
 body.innerHTML='<div class="hudAvatar"><div class="diverIcon"></div><div><b>DAY '+game.day+'</b><br>보유 자금 '+won(game.money)+' · 최고 수심 '+Math.round(game.bestDepth)+'m</div></div><div class="contractGrid">'+CONTRACTS.map((c,i)=>{const locked=i>game.unlocked;return '<div class="contractCard '+(locked?'locked':'')+'"><h3>'+c.title+'</h3><p>'+c.desc+'</p><div class="reward">보상 '+won(c.reward)+'</div><button class="btn '+(locked?'dark':'gold')+'" data-contract="'+c.id+'" '+(locked?'disabled':'')+'>'+(locked?'잠김':'계약 수락')+'</button></div>'}).join('')+'</div><div class="toolbarRow"><button class="btn" id="openShopBtn">장비실</button><button class="btn dark" id="openCodexBtn">조사 도감</button><button class="btn dark" id="contractHomeBtn">시작 화면</button></div><div class="assetCredit">수중 그래픽: Luis Zuno (@ansimuz), CC BY 3.0 · Kidscade 공용 에셋 라이브러리</div>';
 contractScreen.classList.remove('hidden');
 body.querySelectorAll('[data-contract]').forEach(b=>b.addEventListener('click',()=>{clickSound();makeWorld(b.dataset.contract)}));
 $('openShopBtn').onclick=openShop;$('openCodexBtn').onclick=openCodex;$('contractHomeBtn').onclick=()=>{contractScreen.classList.add('hidden');$('startScreen').classList.remove('hidden');state='start'};
}
function upCost(key){const u=UPGRADES[key];return Math.round(u.base*(1+game.up[key]*.75))}
function openShop(){
 contractScreen.classList.add('hidden');const body=$('shopScreenBody');
 body.innerHTML='<p>탐사 수익으로 장비를 강화하면 더 깊고 오래 잠수할 수 있습니다.</p><div class="shopGrid">'+Object.keys(UPGRADES).map(k=>{const u=UPGRADES[k],lv=game.up[k],max=lv>=u.max,c=upCost(k);return '<div class="shopCard"><h3>'+u.name+' Lv.'+lv+'/'+u.max+'</h3><p>'+u.desc+'</p><button class="btn '+(max?'dark':'gold')+'" data-up="'+k+'" '+(max?'disabled':'')+'>'+(max?'최대 강화':won(c)+' 강화')+'</button></div>'}).join('')+'</div><div class="reward">보유 자금 '+won(game.money)+'</div><button class="btn" id="shopBackBtn">계약 게시판으로</button>';
 shopScreen.classList.remove('hidden');body.querySelectorAll('[data-up]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.up,c=upCost(k);if(game.money<c){showHint('자금이 부족합니다.',1.3);return}game.money-=c;game.up[k]++;save();beep(760,.08);openShop()}));$('shopBackBtn').onclick=openContracts;
}
function openCodex(){
 contractScreen.classList.add('hidden');const body=$('codexScreenBody'),keys=Object.keys(SPECIES);
 body.innerHTML='<p>직접 촬영한 생물만 상세 기록이 열립니다.</p><div class="codexGrid">'+keys.map(k=>{const d=SPECIES[k],seen=!!game.codex[k];return '<div class="codexCard"><h3>'+(seen?d.name:'??? 미기록 생물')+'</h3><p>'+(seen?d.note:'현장에서 카메라로 촬영하면 기록이 열립니다.')+'</p></div>'}).join('')+'</div><button class="btn" id="codexBackBtn">계약 게시판으로</button>';
 codexScreen.classList.remove('hidden');$('codexBackBtn').onclick=openContracts;
}
function clickSound(){beep(520,.04)}

addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(state!=='game')return;if(k>='1'&&k<='4'){world.tool=+k-1;beep(420+world.tool*90,.05)}if(k==='x')useTool();if(k==='e')interact();if(k==='f'){world.flash=!world.flash;showHint(world.flash?'손전등 ON':'손전등 OFF',1)}if(k==='h')openHelp()});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
C.addEventListener('mousedown',e=>{if(state!=='game'||e.button!==0)return;if(pointerLocked)useTool();else if(C.requestPointerLock)C.requestPointerLock()});
document.addEventListener('pointerlockchange',()=>pointerLocked=document.pointerLockElement===C);
document.addEventListener('mousemove',e=>{if(pointerLocked&&state==='game'){world.p.yaw+=e.movementX*.0024;world.p.pitch=clamp(world.p.pitch-e.movementY*.002,-1.12,1.12)}});

function openHelp(){if(state!=='game')return;state='paused';if(document.exitPointerLock)document.exitPointerLock();$('helpScreen').classList.remove('hidden')}
$('helpBtn').onclick=openHelp;
$('closeHelp').onclick=()=>{$('helpScreen').classList.add('hidden');state='game';setTimeout(()=>{if(C.requestPointerLock)C.requestPointerLock()},50)};
$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent=sound?'SOUND ON':'SOUND OFF';if(sound)beep(700,.08)};

const startPanel=document.querySelector('#startScreen .panel');
if(startPanel){
 startPanel.querySelector('h1').innerHTML='BLUE<br>EXPEDITION';
 const mission=startPanel.querySelector('.mission');if(mission)mission.innerHTML='<b>리워크 v4</b><br>무료 수중 스프라이트를 실제 탐사 공간에 적용했습니다. 산호초 → 해초 협곡 → 침수 유적 → 기뢰 난파선 → 심해 절벽의 5개 구역을 계약별로 탐사하세요.';
 const hg=startPanel.querySelector('.helpgrid');if(hg)hg.innerHTML='<div><b>WASD</b><br>헤엄치기</div><div><b>마우스</b><br>시선 이동</div><div><b>Space / Shift</b><br>상승 / 하강</div><div><b>1 카메라</b><br>생물·유적 기록</div><div><b>2 소나</b><br>기뢰·목표 탐지</div><div><b>3 절단기</b><br>난파선 개방</div><div><b>4 그물</b><br>허용 표본 포획</div><div><b>E</b><br>유물 회수</div>';
 const credit=document.createElement('div');credit.className='assetCredit';credit.textContent='Underwater Diving artwork © Luis Zuno (@ansimuz), CC BY 3.0 · 출처 표기는 Kidscade ATTRIBUTION에도 보존됩니다.';startPanel.appendChild(credit);
}
$('startBtn').textContent='새 잠수 경력 시작';$('continueBtn').textContent='이어하기';
$('startBtn').onclick=()=>{if(!assetsReady)return;game.day=1;game.money=0;game.bestDepth=0;game.codex={};game.up={oxygen:0,fins:0,bag:0,sonar:0,suit:0};game.unlocked=0;game.bestScore=0;save();openContracts()};
$('continueBtn').onclick=()=>{if(!assetsReady)return;load();openContracts()};
$('nextBtn').onclick=openContracts;
$('homeBtn').onclick=()=>{$('resultScreen').classList.add('hidden');$('startScreen').classList.remove('hidden');state='start'};

function moveStick(e){const r=$('moveStick').getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),m=r.width*.34,l=Math.hypot(dx,dy)||1,k=Math.min(1,l/m);moveTouch.x=dx/l*k;moveTouch.y=-dy/l*k;$('moveKnob').style.left=41+moveTouch.x*40+'px';$('moveKnob').style.top=41-moveTouch.y*40+'px'}
function endStick(){stickId=null;moveTouch.x=moveTouch.y=0;$('moveKnob').style.left='41px';$('moveKnob').style.top='41px'}
$('moveStick').addEventListener('pointerdown',e=>{stickId=e.pointerId;$('moveStick').setPointerCapture(e.pointerId);moveStick(e)});
$('moveStick').addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e)});$('moveStick').addEventListener('pointerup',endStick);$('moveStick').addEventListener('pointercancel',endStick);
$('lookPad').addEventListener('pointerdown',e=>{lookTouch={active:true,id:e.pointerId,x:e.clientX,y:e.clientY};$('lookPad').setPointerCapture(e.pointerId)});
$('lookPad').addEventListener('pointermove',e=>{if(lookTouch.active&&e.pointerId===lookTouch.id&&state==='game'){const dx=e.clientX-lookTouch.x,dy=e.clientY-lookTouch.y;lookTouch.x=e.clientX;lookTouch.y=e.clientY;world.p.yaw+=dx*.008;world.p.pitch=clamp(world.p.pitch-dy*.006,-1.12,1.12)}});
$('lookPad').addEventListener('pointerup',()=>lookTouch.active=false);$('lookPad').addEventListener('pointercancel',()=>lookTouch.active=false);
function bindV(id,v){const el=$(id);el.onpointerdown=e=>{e.preventDefault();verticalTouch=v};el.onpointerup=el.onpointercancel=()=>{if(verticalTouch===v)verticalTouch=0}}
bindV('upBtn',1);bindV('downBtn',-1);
$('toolBtn').onpointerdown=()=>{if(world){world.tool=(world.tool+1)%4;beep(500,.05)}};
$('sonarBtn').onpointerdown=()=>{if(world)sonar()};
$('actionBtn').onpointerdown=()=>{if(world){const t=target(9);if(t&&t.kind==='pickup')interact();else useTool()}};

load();
})();