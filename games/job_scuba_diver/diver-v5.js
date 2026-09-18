(()=>{
'use strict';

const C=document.getElementById('game'),ctx=C.getContext('2d');
const $=id=>document.getElementById(id);
const U='../../assets/game/2d/underwater/underwater-diving/';
const F='../../assets/game/2d/fish/';
const P='../../assets/game/2d/pirate/';
const SAVE='deep_diver_2d_v5',OLD='deep_diver_openwater_v4';
const WORLD={w:4200,h:1900,surface:60,scaleDepth:4};
const ZONES=[
 {id:'reef',name:'산호 정원',tag:'햇빛과 산호 군락',y0:60,y1:360,bg0:'#58c9d0',bg1:'#087792',accent:'#ffd36a'},
 {id:'kelp',name:'해초 숲',tag:'거대한 해초와 흐르는 조류',y0:360,y1:720,bg0:'#198b79',bg1:'#07545c',accent:'#6bd88a'},
 {id:'ruins',name:'침수 유적',tag:'석조 기둥과 가라앉은 회랑',y0:720,y1:1100,bg0:'#315f70',bg1:'#17394f',accent:'#c5b78d'},
 {id:'wreck',name:'난파선 지대',tag:'녹슨 잔해와 기뢰 수역',y0:1100,y1:1480,bg0:'#244b5a',bg1:'#102b3e',accent:'#db8b62'},
 {id:'abyss',name:'암흑 심해',tag:'빛이 사라진 열수 분출대',y0:1480,y1:1900,bg0:'#111c35',bg1:'#030713',accent:'#79e9ff'}
];
const CONTRACTS=[
 {id:'reef',title:'01 · 산호초 생태 조사',desc:'청색어·주황어·빠른 암초어를 촬영하고 안전하게 귀환하세요.',reward:900,unlock:0,target:'reef'},
 {id:'kelp',title:'02 · 해초 숲 표본 조사',desc:'희귀 회색어를 촬영하고 일반 표본 2개를 회수하세요.',reward:1400,unlock:1,target:'kelp'},
 {id:'ruins',title:'03 · 침수 유적 기록',desc:'침수 석상과 아치를 촬영하고 고대 표식판을 회수하세요.',reward:2100,unlock:2,target:'ruins'},
 {id:'wreck',title:'04 · 난파선 기록 장치',desc:'기뢰를 피하고 침몰선의 항해기록 장치를 회수하세요.',reward:3000,unlock:3,target:'wreck'},
 {id:'abyss',title:'05 · 심해 생물 조사',desc:'350m 아래 대형 심해 포식어를 A등급 이상 촬영하고 귀환하세요.',reward:4200,unlock:4,target:'abyss'}
];
const UPGRADES={
 oxygen:{name:'산소통',desc:'최대 산소 +18초',base:900,max:5},
 fins:{name:'추진 핀',desc:'수영 속도 +7%',base:850,max:5},
 bag:{name:'표본 케이스',desc:'최대 무게 +3kg',base:800,max:5},
 camera:{name:'카메라 렌즈',desc:'촬영 판정 거리 증가',base:1100,max:4},
 harpoon:{name:'작살 릴',desc:'작살 사거리·속도 증가',base:1000,max:4},
 sonar:{name:'소나',desc:'쿨다운 감소',base:1100,max:4},
 suit:{name:'잠수복',desc:'충격 피해 감소',base:1200,max:4}
};
const ASSETS={
 playerIdle:U+'player/player-idle.png',playerSwim:U+'player/player-swiming.png',playerFast:U+'player/player-fast.png',playerRush:U+'player/player-rush.png',playerHurt:U+'player/player-hurt.png',
 fishAnim:U+'enemies/fish.png',fishDart:U+'enemies/fish-dart.png',fishBig:U+'enemies/fish-big.png',
 mineS:U+'enemies/mine-small.png',mine:U+'enemies/mine.png',mineB:U+'enemies/mine-big.png',
 bg:U+'environment/background.png',mid:U+'environment/midground.png',props:U+'environment/props.png',tiles:U+'environment/tiles.png',
 bubbles:U+'fx/bubbles.png',explosion:U+'fx/explosion.png',explosionB:U+'fx/explosion-big.png',
 blue:F+'fish_blue.png',orange:F+'fish_orange.png',green:F+'fish_green.png',grey:F+'fish_grey.png',greyLong:F+'fish_grey_long_a.png',red:F+'fish_red.png',pink:F+'fish_pink.png',brown:F+'fish_brown.png',
 rockA:F+'rock_a.png',rockB:F+'rock_b.png',
 bgRockA:F+'background_rock_a.png',bgRockB:F+'background_rock_b.png',
 bgSeaA:F+'background_seaweed_a.png',bgSeaC:F+'background_seaweed_c.png',bgSeaF:F+'background_seaweed_f.png',
 seaweedA:F+'seaweed_green_a.png',seaweedGreenB:F+'seaweed_green_b.png',seaweedGreenC:F+'seaweed_green_c.png',
 seaweedB:F+'seaweed_pink_a.png',seaweedPinkB:F+'seaweed_pink_b.png',seaweedPinkC:F+'seaweed_pink_c.png',
 seaweedOrangeA:F+'seaweed_orange_a.png',seaweedOrangeB:F+'seaweed_orange_b.png',
 grassA:F+'seaweed_grass_a.png',grassB:F+'seaweed_grass_b.png',sand:F+'terrain_sand_top_a.png',dirt:F+'terrain_dirt_top_a.png',
 wreck:P+'ships/ship-8.png',wood1:P+'ship-parts/wood-1.png',wood2:P+'ship-parts/wood-2.png'
};
const imgs={}; let ready=false,loaded=0;
for(const [k,src] of Object.entries(ASSETS)){const im=new Image();imgs[k]=im;im.onload=im.onerror=()=>{loaded++;if(loaded===Object.keys(ASSETS).length){ready=true;updateStartButtons()}};im.src=src}

const SPECIES={
 blue:{name:'청색 암초어',img:'blue',depth:[10,95],weight:1.2,value:160,protected:false,rare:false},
 orange:{name:'주황 산호어',img:'orange',depth:[15,105],weight:1.0,value:150,protected:false,rare:false},
 green:{name:'초록 암초어',img:'green',depth:[30,150],weight:1.3,value:180,protected:false,rare:false},
 grey:{name:'회색 암초어',img:'grey',depth:[60,180],weight:1.5,value:210,protected:false,rare:false},
 long:{name:'회색 긴꼬리어',img:'greyLong',depth:[100,210],weight:1.8,value:330,protected:true,rare:true},
 dart:{name:'빠른 심해어',img:'fishDart',animated:true,fw:39,fh:20,frames:4,depth:[80,260],weight:1.6,value:360,protected:false,rare:true},
 angler:{name:'등불 심해어',img:'fishAnim',animated:true,fw:32,fh:32,frames:4,depth:[270,430],weight:2.2,value:520,protected:true,rare:true},
 giant:{name:'대형 심해 포식어',img:'fishBig',animated:true,fw:54,fh:49,frames:4,depth:[350,470],weight:0,value:0,protected:true,rare:true}
};

let view={w:innerWidth,h:innerHeight,dpr:1},last=performance.now(),state='menu',world=null,sound=false,ac=null;
const keys={},touch={x:0,y:0,dash:false},meta={money:0,unlocked:0,up:{oxygen:0,fins:0,bag:0,camera:0,harpoon:0,sonar:0,suit:0},codex:{},bestDepth:0,bestScore:0};

function resize(){const r=C.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);view.w=Math.max(1,r.width||innerWidth);view.h=Math.max(1,r.height||innerHeight);view.dpr=dpr;C.width=Math.round(view.w*dpr);C.height=Math.round(view.h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a),lerp=(a,b,t)=>a+(b-a)*t;
const depthOf=y=>Math.max(0,(y-WORLD.surface)/WORLD.scaleDepth);
const zoneForY=y=>ZONES.find(z=>y>=z.y0&&y<z.y1)||ZONES[ZONES.length-1];
const money=n=>Math.round(n).toLocaleString('ko-KR')+'원';
function stats(){return{oxygen:110+meta.up.oxygen*18,speed:185*(1+meta.up.fins*.07),bag:8+meta.up.bag*3,camera:185+meta.up.camera*26,harpoon:270+meta.up.harpoon*38,sonar:Math.max(4,10-meta.up.sonar*1.15),armor:1-meta.up.suit*.11}}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(meta))}catch(e){}}
function load(){
  let r=null;try{r=JSON.parse(localStorage.getItem(SAVE)||'null')}catch(e){}
  if(!r){try{const o=JSON.parse(localStorage.getItem(OLD)||'null');if(o)r={money:o.money||0,unlocked:Math.min(4,o.unlocked||0),up:o.up||{},codex:o.codex||{},bestDepth:o.bestDepth||0,bestScore:o.bestScore||0}}catch(e){}}
  if(r){meta.money=r.money||0;meta.unlocked=r.unlocked||0;Object.assign(meta.up,r.up||{});meta.codex=r.codex||{};meta.bestDepth=r.bestDepth||0;meta.bestScore=r.bestScore||0}
}
function beep(f=500,d=.08,type='triangle'){if(!sound)return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.frequency.value=f;o.type=type;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.05,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(ac.destination);o.start();o.stop(t+d+.02)}catch(e){}}
function showHint(t,ms=1500){const el=$('hint');el.textContent=t;el.classList.add('show');clearTimeout(showHint.t);showHint.t=setTimeout(()=>el.classList.remove('show'),ms)}
function showZone(zone){const z=typeof zone==='string'?ZONES.find(q=>q.name===zone):zone,el=$('zoneToast');el.innerHTML=z?'<b>'+z.name+'</b><small>'+z.tag+'</small>':String(zone||'');el.classList.add('show');clearTimeout(showZone.t);showZone.t=setTimeout(()=>el.classList.remove('show'),1700)}
function updateStartButtons(){const s=$('startBtn'),c=$('continueBtn');if(s)s.disabled=!ready;if(c)c.disabled=!ready}

function seedRand(seed){let x=seed|0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
function makeFish(key,x,y,seed){const d=SPECIES[key],rr=seedRand(seed||Math.floor(Math.random()*999999));return{kind:'fish',key,x,y,baseX:x,baseY:y,vx:(rr()>.5?1:-1)*rnd(18,45),vy:rnd(-8,8),phase:rnd(0,Math.PI*2),scale:d===SPECIES.giant?1.25:rnd(.8,1.08),alive:true,photo:null,marked:0}}

function rectSolid(x,y,w,h,zone='reef',edge='sand'){return{shape:'rect',x,y,w,h,zone,edge}}
function circleSolid(x,y,r,zone='reef',edge='dirt'){return{shape:'circle',x,y,r,zone,edge}}
function buildTerrain(){
  // The gaps between these shelves form a continuous route from the surface to the abyss.
  return[
    // Coral garden: broad shelves with two generous passages.
    rectSolid(0,300,760,90,'reef','sand'),
    rectSolid(910,330,720,80,'reef','sand'),
    rectSolid(2740,305,620,90,'reef','sand'),
    rectSolid(3520,340,680,90,'reef','sand'),
    circleSolid(820,340,95,'reef','sand'),circleSolid(3410,365,105,'reef','sand'),

    // Kelp forest: staggered walls create an S-shaped swim route.
    rectSolid(0,510,650,145,'kelp','dirt'),
    rectSolid(760,610,720,125,'kelp','dirt'),
    rectSolid(2740,500,680,135,'kelp','dirt'),
    rectSolid(3520,625,680,130,'kelp','dirt'),
    circleSolid(690,570,78,'kelp'),circleSolid(3425,590,88,'kelp'),

    // Sunken ruins: broken stone platforms frame open courtyards.
    rectSolid(0,805,710,135,'ruins','dirt'),
    rectSolid(820,985,650,115,'ruins','dirt'),
    rectSolid(2760,820,650,135,'ruins','dirt'),
    rectSolid(3520,990,680,115,'ruins','dirt'),
    circleSolid(1500,770,70,'ruins'),circleSolid(2685,1030,72,'ruins'),

    // Wreck field: tight rock shelves, but the wreck/recorder pocket stays open.
    rectSolid(0,1180,720,155,'wreck','dirt'),
    rectSolid(850,1370,760,120,'wreck','dirt'),
    rectSolid(3400,1180,800,150,'wreck','dirt'),
    rectSolid(3130,1400,1070,110,'wreck','dirt'),
    circleSolid(1720,1240,95,'wreck'),circleSolid(3260,1300,88,'wreck'),

    // Abyss: two cliff faces narrow the route into a dramatic central trench.
    rectSolid(0,1520,1120,380,'abyss','dirt'),
    rectSolid(3520,1510,680,390,'abyss','dirt'),
    rectSolid(1180,1765,610,135,'abyss','dirt'),
    rectSolid(2780,1775,650,125,'abyss','dirt'),
    circleSolid(1870,1815,95,'abyss'),circleSolid(2700,1810,100,'abyss')
  ];
}
function zonePlantPool(id,foreground=false){
  if(id==='reef')return foreground?['seaweedOrangeA','seaweedPinkB','seaweedGreenB']:['seaweedOrangeA','seaweedB','seaweedGreenB','grassA'];
  if(id==='kelp')return foreground?['bgSeaA','bgSeaC','seaweedGreenC']:['seaweedA','seaweedGreenB','seaweedGreenC','grassB'];
  if(id==='ruins')return foreground?['bgRockA','bgRockB','grassA']:['rockA','rockB','grassA'];
  if(id==='wreck')return foreground?['bgRockB','rockA','rockB']:['rockA','rockB','grassB'];
  return foreground?['bgRockA','bgRockB']:['rockA','rockB'];
}
function buildForeground(seed){
  const r=seedRand(seed+4411),items=[];
  for(const z of ZONES){
    const pool=zonePlantPool(z.id,true),count=z.id==='kelp'?18:z.id==='reef'?13:9;
    for(let i=0;i<count;i++){
      items.push({
        x:rnd(-120,WORLD.w+120),y:rnd(z.y0+35,z.y1-20),
        type:pool[Math.floor(r()*pool.length)],
        scale:z.id==='kelp'?rnd(2.1,4.0):rnd(1.4,2.8),alpha:z.id==='abyss'?rnd(.10,.20):rnd(.15,.32),
        parallax:rnd(1.035,1.09),flip:r()>.5,zone:z.id
      });
    }
  }
  return items;
}
function pointInSolid(x,y,s,pad=0){
  if(s.shape==='circle')return Math.hypot(x-s.x,y-s.y)<s.r+pad;
  return x>s.x-pad&&x<s.x+s.w+pad&&y>s.y-pad&&y<s.y+s.h+pad;
}
function resolvePlayerTerrain(p,r=23){
  let hit=false;
  for(const s of world.terrain){
    if(s.shape==='circle'){
      const dx=p.x-s.x,dy=p.y-s.y,d=Math.hypot(dx,dy),min=s.r+r;
      if(d<min){
        const nx=d>0?dx/d:1,ny=d>0?dy/d:0,over=min-d;
        p.x+=nx*over;p.y+=ny*over;hit=true;
        const vn=p.vx*nx+p.vy*ny;if(vn<0){p.vx-=vn*nx*1.25;p.vy-=vn*ny*1.25}
      }
    }else{
      const nx=clamp(p.x,s.x,s.x+s.w),ny=clamp(p.y,s.y,s.y+s.h),dx=p.x-nx,dy=p.y-ny,d=Math.hypot(dx,dy);
      if(d<r){
        if(d>0){
          const ux=dx/d,uy=dy/d,over=r-d;p.x+=ux*over;p.y+=uy*over;
          const vn=p.vx*ux+p.vy*uy;if(vn<0){p.vx-=vn*ux*1.25;p.vy-=vn*uy*1.25}
        }else{
          const dl=Math.abs(p.x-s.x),dr=Math.abs(s.x+s.w-p.x),dt=Math.abs(p.y-s.y),db=Math.abs(s.y+s.h-p.y),m=Math.min(dl,dr,dt,db);
          if(m===dl){p.x=s.x-r;p.vx=Math.min(0,p.vx)}
          else if(m===dr){p.x=s.x+s.w+r;p.vx=Math.max(0,p.vx)}
          else if(m===dt){p.y=s.y-r;p.vy=Math.min(0,p.vy)}
          else{p.y=s.y+s.h+r;p.vy=Math.max(0,p.vy)}
        }
        hit=true;
      }
    }
  }
  return hit;
}
function buildWorld(contract){
 const st=stats(),r=seedRand(contract.unlock*9127+57);
 world={
   contract,st,time:0,camera:{x:WORLD.w*.5,y:220},player:{x:WORLD.w*.5,y:130,vx:0,vy:0,face:1,oxygen:st.oxygen,hp:100,dashCd:0,inv:0},
   fish:[],decor:[],foreground:buildForeground(contract.unlock*9127+57),terrain:buildTerrain(),props:[],mines:[],pickups:[],shots:[],effects:[],bubbles:[],
   bag:[],bagWeight:0,income:0,maxDepth:0,tool:'camera',sonar:0,sonarCd:0,lastZone:'',complete:false,returned:false,
   mission:{photos:{},samples:0,statue:false,arch:false,relic:false,recorder:false,deep:false,giantGrade:null}
 };
 const fishKeys=['blue','orange','green','grey','long','dart','angler'];
 for(let i=0;i<62;i++){
   const key=fishKeys[Math.floor(r()*fishKeys.length)],sp=SPECIES[key];let x=0,y=0,tries=0;
   do{
     const dep=rnd(sp.depth[0],Math.min(445,sp.depth[1]));y=WORLD.surface+dep*WORLD.scaleDepth;x=rnd(130,WORLD.w-130);tries++;
   }while(tries<18&&world.terrain.some(s=>pointInSolid(x,y,s,34)));
   world.fish.push(makeFish(key,x,y,i*31+contract.unlock*700));
 }
 // Mission-critical species are guaranteed so a contract can never become impossible because of random generation.
 world.fish.push(makeFish('blue',WORLD.w*.46,180,8101));
 world.fish.push(makeFish('orange',WORLD.w*.56,230,8102));
 world.fish.push(makeFish('dart',WORLD.w*.63,430,8103));
 world.fish.push(makeFish('long',WORLD.w*.40,600,8104));
 world.fish.push(makeFish('giant',WORLD.w*.73,1605,9921));
 for(const z of ZONES){
   const pool=zonePlantPool(z.id,false),count=z.id==='reef'?34:z.id==='kelp'?42:z.id==='ruins'?20:z.id==='wreck'?16:10;
   for(let i=0;i<count;i++){
     const y=rnd(z.y0+24,z.y1-28),x=rnd(80,WORLD.w-80),type=pool[Math.floor(r()*pool.length)];
     world.decor.push({x,y,type,scale:z.id==='kelp'?rnd(.9,1.7):rnd(.65,1.3),flip:r()>.5,zone:z.id});
   }
 }
 world.props.push({id:'statue',x:WORLD.w*.38,y:830,type:'statue',done:false},{id:'arch',x:WORLD.w*.61,y:945,type:'arch',done:false});
 world.pickups.push({id:'relic',name:'고대 표식판',x:WORLD.w*.55,y:1010,value:650,taken:false,weight:2});
 world.pickups.push({id:'recorder',name:'항해기록 장치',x:WORLD.w*.67,y:1360,value:1200,taken:false,weight:3.5});
 for(let i=0;i<9;i++)world.mines.push({x:WORLD.w*.52+i*95+(i%2?55:-40),y:1170+(i%3)*85,size:i%3===0?'B':i%3===1?'N':'S',dead:false,fuse:0,marked:0});
 for(let i=0;i<30;i++)world.bubbles.push({x:rnd(0,WORLD.w),y:rnd(80,WORLD.h),s:rnd(1,3),speed:rnd(10,25)});
 state='playing';document.body.classList.add('playing');document.body.classList.toggle('cameraMode',true);
 ['startScreen','contractScreen','shopScreen','codexScreen','resultScreen'].forEach(id=>$(id)?.classList.add('hidden'));
 resetInputs();setTool('camera');showZone(zoneForY(world.player.y));showHint('지역마다 지형·시야·생물이 달라집니다. 아래로 내려갈수록 빛이 줄어드니 산소와 귀환 경로를 확인하세요.',3400);
}

function screenPos(x,y){return{x:x-world.camera.x+view.w/2,y:y-world.camera.y+view.h/2}}
function sheetFrame(im,frames,t){if(!im||!im.complete)return null;const fh=im.naturalHeight,fw=Math.floor(im.naturalWidth/frames),frame=Math.floor(t*8)%frames;return{sx:frame*fw,sy:0,sw:fw,sh:fh}}
function drawImg(im,x,y,w,h,flip=false,rot=0,alpha=1,filter='none'){if(!im||!im.complete||!im.naturalWidth)return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(flip?-1:1,1);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.filter=filter;ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}
function drawSheet(im,x,y,frames,w,h,flip=false,alpha=1){if(!im||!im.complete)return;const f=sheetFrame(im,frames,world.time);if(!f)return;ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(im,f.sx,f.sy,f.sw,f.sh,-w/2,-h/2,w,h);ctx.restore()}

function renderBackground(){
 const z=zoneForY(world.player.y),grad=ctx.createLinearGradient(0,0,0,view.h);grad.addColorStop(0,z.bg0);grad.addColorStop(1,z.bg1);ctx.fillStyle=grad;ctx.fillRect(0,0,view.w,view.h);
 if(imgs.bg.complete){const sc=Math.max(view.w/288,view.h/256)*1.12,iw=288*sc,ih=256*sc,off=(-world.camera.x*.06)%iw;ctx.save();ctx.globalAlpha=.18;for(let x=off-iw;x<view.w+iw;x+=iw)ctx.drawImage(imgs.bg,x,view.h-ih,iw,ih);ctx.restore()}
 if(imgs.mid.complete){const sc=Math.max(view.w/960,view.h/512)*1.02,iw=960*sc,ih=512*sc,off=(-world.camera.x*.13)%iw;ctx.save();ctx.globalAlpha=.12;ctx.drawImage(imgs.mid,off-iw,view.h-ih,iw,ih);ctx.drawImage(imgs.mid,off,view.h-ih,iw,ih);ctx.drawImage(imgs.mid,off+iw,view.h-ih,iw,ih);ctx.restore()}
 if(world.player.y<650){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.16;for(let i=0;i<7;i++){const x=(i+.4)*view.w/7+Math.sin(world.time*.3+i)*25;ctx.fillStyle='rgba(210,255,255,.22)';ctx.beginPath();ctx.moveTo(x-22,0);ctx.lineTo(x+22,0);ctx.lineTo(x+100,view.h);ctx.lineTo(x-100,view.h);ctx.closePath();ctx.fill()}ctx.restore()}
 if(world.player.y>1450){ctx.fillStyle='rgba(0,6,16,'+clamp((world.player.y-1450)/600,0,.62)+')';ctx.fillRect(0,0,view.w,view.h)}
}
function drawSurface(){const y=screenPos(0,WORLD.surface).y;if(y>-60&&y<view.h+60){ctx.fillStyle='rgba(211,251,255,.18)';ctx.fillRect(0,y-8,view.w,16);ctx.strokeStyle='rgba(220,255,255,.7)';ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<=view.w;x+=18){const yy=y+Math.sin(world.time*2+x*.035)*3;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.stroke()}}
function solidPalette(zone){return zone==='reef'?['#6b8778','#365d58']:zone==='kelp'?['#426b5f','#254b48']:zone==='ruins'?['#52696b','#2b454b']:zone==='wreck'?['#3d5259','#203841']:['#26394a','#132536']}
function drawTerrain(){
  for(const s of world.terrain){
    const p=screenPos(s.x,s.y),pal=solidPalette(s.zone);
    ctx.save();ctx.globalAlpha=.98;
    if(s.shape==='rect'){
      if(p.x>view.w+180||p.x+s.w<-180||p.y>view.h+180||p.y+s.h<-180){ctx.restore();continue}
      const g=ctx.createLinearGradient(0,p.y,0,p.y+s.h);g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);ctx.fillStyle=g;
      ctx.beginPath();ctx.roundRect(p.x,p.y,s.w,s.h,24);ctx.fill();
      const tile=imgs[s.edge==='sand'?'sand':'dirt'];
      if(tile&&tile.complete){
        const tw=36,th=26;ctx.globalAlpha=.78;
        for(let x=p.x+8;x<p.x+s.w-8;x+=tw)ctx.drawImage(tile,x,p.y-8,tw,th);
      }
      ctx.globalAlpha=.35;ctx.fillStyle='#061a22';ctx.fillRect(p.x+8,p.y+s.h-18,Math.max(0,s.w-16),12);
    }else{
      if(p.x+s.r<-120||p.x-s.r>view.w+120||p.y+s.r<-120||p.y-s.r>view.h+120){ctx.restore();continue}
      const g=ctx.createRadialGradient(p.x-s.r*.25,p.y-s.r*.3,8,p.x,p.y,s.r);g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,s.r,0,Math.PI*2);ctx.fill();
      const rock=imgs[s.r>90?'rockB':'rockA'];if(rock&&rock.complete){ctx.globalAlpha=.38;ctx.drawImage(rock,p.x-s.r*.5,p.y-s.r*.45,s.r,s.r)}
    }
    ctx.restore();
  }
}
function drawForeground(){
  for(const d of world.foreground){
    const px=d.x-world.camera.x*d.parallax+view.w/2,py=d.y-world.camera.y*d.parallax+view.h/2;
    if(px<-150||px>view.w+150||py<-170||py>view.h+170)continue;
    const im=imgs[d.type],size=(d.type.startsWith('seaweed')?90:72)*d.scale;
    drawImg(im,px,py,size,size,d.flip,Math.sin(world.time*.45+d.x*.01)*.025,d.alpha);
  }
}
function drawDecor(){
 for(const d of world.decor){const p=screenPos(d.x,d.y);if(p.x<-80||p.x>view.w+80||p.y<-80||p.y>view.h+80)continue;const im=imgs[d.type],size=d.type.startsWith('seaweed')?55*d.scale:46*d.scale;drawImg(im,p.x,p.y,size,size,d.flip,0,.7)}
}
function drawProps(){
 for(const o of world.props){const p=screenPos(o.x,o.y);if(p.x<-130||p.x>view.w+130||p.y<-160||p.y>view.h+160)continue;if(!imgs.props.complete)continue;let s;if(o.type==='statue')s={sx:372,sy:24,sw:92,sh:215,w:80,h:188};else s={sx:145,sy:24,sw:195,sh:195,w:180,h:180};ctx.save();ctx.globalAlpha=.84;ctx.imageSmoothingEnabled=false;ctx.drawImage(imgs.props,s.sx,s.sy,s.sw,s.sh,p.x-s.w/2,p.y-s.h/2,s.w,s.h);if(world.sonar>0&&!o.done){ctx.strokeStyle='#6df5ff';ctx.lineWidth=3;ctx.strokeRect(p.x-s.w*.45,p.y-s.h*.45,s.w*.9,s.h*.9)}ctx.restore()}
}
function drawWreck(){
 const p=screenPos(WORLD.w*.66,1320);if(p.x<-300||p.x>view.w+300||p.y<-240||p.y>view.h+240)return;drawImg(imgs.wreck,p.x,p.y,260,150,false,.17,.42,'brightness(.52) saturate(.65)');drawImg(imgs.wood1,p.x-115,p.y+48,42,34,false,.3,.65,'brightness(.55)');drawImg(imgs.wood2,p.x+126,p.y+56,38,30,true,-.2,.65,'brightness(.55)')}
function drawPickups(){
 for(const q of world.pickups){if(q.taken)continue;const p=screenPos(q.x,q.y);if(p.x<-50||p.x>view.w+50||p.y<-50||p.y>view.h+50)continue;ctx.save();ctx.shadowColor=q.id==='relic'?'#f1d86b':'#6beafa';ctx.shadowBlur=12;ctx.fillStyle=q.id==='relic'?'#cfb85a':'#61dbe7';ctx.fillRect(p.x-13,p.y-9,26,18);ctx.shadowBlur=0;if(world.sonar>0){ctx.strokeStyle='#75f4ff';ctx.lineWidth=2;ctx.strokeRect(p.x-19,p.y-15,38,30)}ctx.restore()}
}
function drawFish(f){
 if(!f.alive)return;const sp=SPECIES[f.key],p=screenPos(f.x,f.y);if(p.x<-100||p.x>view.w+100||p.y<-100||p.y>view.h+100)return;const flip=f.vx<0;
 if(sp.animated)drawSheet(imgs[sp.img],p.x,p.y,sp.frames,sp.fw*1.75*f.scale,sp.fh*1.75*f.scale,flip,sp.key==='giant'?.96:.9);
 else drawImg(imgs[sp.img],p.x,p.y,52*f.scale,33*f.scale,flip,0,.88);
 if(world.sonar>0&&(sp.rare||f.marked>0)){ctx.strokeStyle=sp===SPECIES.giant?'#ff987d':'#73f2ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,34+Math.sin(world.time*5)*4,0,Math.PI*2);ctx.stroke()}
}
function drawMine(m){if(m.dead)return;const p=screenPos(m.x,m.y);if(p.x<-70||p.x>view.w+70||p.y<-70||p.y>view.h+70)return;const im=imgs[m.size==='B'?'mineB':m.size==='S'?'mineS':'mine'],s=m.size==='B'?60:m.size==='S'?38:50;drawImg(im,p.x,p.y,s,s,false,0,.9);if(world.sonar>0||m.fuse>0){ctx.strokeStyle=m.fuse>0?'#ff7465':'#6df4ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,s*.7+Math.sin(world.time*8)*4,0,Math.PI*2);ctx.stroke()}}
function drawShots(){for(const s of world.shots){const p=screenPos(s.x,s.y);ctx.strokeStyle='#d8eef3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-s.vx*.045,p.y-s.vy*.045);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle='#f7f1d2';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill()}}
function drawEffects(){for(const e of world.effects){const p=screenPos(e.x,e.y);if(e.type==='boom'){const im=e.big?imgs.explosionB:imgs.explosion,frames=10,fh=im.naturalHeight||82,fw=Math.floor((im.naturalWidth||660)/frames),fr=Math.min(frames-1,Math.floor(e.t/.075));ctx.save();ctx.globalAlpha=clamp(1-e.t/.8,0,1);ctx.imageSmoothingEnabled=false;if(im.complete)ctx.drawImage(im,fr*fw,0,fw,fh,p.x-45,p.y-45,90,90);ctx.restore()}else if(e.type==='spark'){ctx.save();ctx.globalAlpha=clamp(1-e.t/.35,0,1);ctx.strokeStyle='#d9f7ff';ctx.lineWidth=2;for(let i=0;i<5;i++){const a=i/5*Math.PI*2+e.t*3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(a)*(8+e.t*22),p.y+Math.sin(a)*(8+e.t*22));ctx.stroke()}ctx.restore()}else{ctx.fillStyle='rgba(125,238,249,'+clamp(1-e.t/.6,0,1)+')';ctx.beginPath();ctx.arc(p.x,p.y,10+e.t*30,0,Math.PI*2);ctx.strokeStyle='#7eeef7';ctx.stroke()}}}
function playerAnim(){const p=world.player,speed=Math.hypot(p.vx,p.vy);if(p.inv>0)return{img:imgs.playerHurt};if(touch.dash||keys.shift)return{img:imgs.playerRush};if(speed<18)return{img:imgs.playerIdle};if(speed>world.st.speed*.78)return{img:imgs.playerFast};return{img:imgs.playerSwim}}
function drawPlayer(){
 const p=screenPos(world.player.x,world.player.y),a=playerAnim(),im=a.img;if(!im||!im.complete)return;const frames=Math.max(1,Math.round(im.naturalWidth/im.naturalHeight)),f=sheetFrame(im,frames,world.time);const size=64;ctx.save();ctx.translate(p.x,p.y);ctx.scale(world.player.face<0?-1:1,1);if(world.player.inv>0)ctx.globalAlpha=.55+.35*Math.sin(world.time*25);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,f.sx,0,f.sw,f.sh,-size/2,-size/2,size,size);ctx.restore();
 for(let i=0;i<2;i++){ctx.fillStyle='rgba(210,249,255,.45)';ctx.beginPath();ctx.arc(p.x-world.player.face*26+i*5,p.y-12-i*6,2+i*.6,0,Math.PI*2);ctx.fill()}
}
function drawBubbles(){
 ctx.save();for(const b of world.bubbles){const p=screenPos(b.x,b.y);if(p.x<0||p.x>view.w||p.y<0||p.y>view.h)continue;ctx.strokeStyle='rgba(213,250,255,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,b.s,0,Math.PI*2);ctx.stroke()}ctx.restore()
}
function render(){
 if(!world)return;ctx.clearRect(0,0,view.w,view.h);renderBackground();drawSurface();drawTerrain();drawDecor();drawProps();drawWreck();drawPickups();for(const f of world.fish)drawFish(f);for(const m of world.mines)drawMine(m);drawShots();drawEffects();drawBubbles();drawPlayer();drawForeground();updateHud();updatePhotoLabel()
}
function updatePhotoLabel(){
 if(!world||world.tool!=='camera'){$('photoLabel').textContent='';return}
 const t=findCameraTarget();$('photoLabel').textContent=t?SPECIES[t.key].name+' · 촬영 가능':'대상을 프레임 중앙에 맞추세요'
}
function currentContract(){return world?.contract}
function missionText(){
 if(!world)return'';const m=world.mission,id=world.contract.id;
 if(id==='reef')return'촬영 '+['blue','orange','dart'].filter(k=>m.photos[k]).length+'/3 · 수면 귀환';
 if(id==='kelp')return'희귀어 '+(m.photos.long?'촬영':'미촬영')+' · 표본 '+m.samples+'/2';
 if(id==='ruins')return'유적 '+(m.statue?1:0)+(m.arch?1:0)+'/2 · 표식판 '+(m.relic?'회수':'미회수');
 if(id==='wreck')return'항해기록 장치 '+(m.recorder?'회수':'미회수')+' · 기뢰 주의';
 return'350m '+(m.deep?'도달':'미도달')+' · 대형 심해어 '+(m.giantGrade?m.giantGrade:'미촬영');
}
function missionComplete(){
 const m=world.mission,id=world.contract.id;
 if(id==='reef')return !!(m.photos.blue&&m.photos.orange&&m.photos.dart);
 if(id==='kelp')return !!(m.photos.long&&m.samples>=2);
 if(id==='ruins')return !!(m.statue&&m.arch&&m.relic);
 if(id==='wreck')return !!m.recorder;
 return !!(m.deep&&['A','S'].includes(m.giantGrade));
}
function updateHud(){
 const p=world.player,ox=clamp(p.oxygen/world.st.oxygen*100,0,100),hp=clamp(p.hp,0,100),dep=depthOf(p.y);
 $('o2Text').textContent=Math.round(ox)+'%';$('o2Fill').style.width=ox+'%';$('hpText').textContent=Math.round(hp);$('hpFill').style.width=hp+'%';$('depthText').textContent=Math.round(dep)+'m';$('zoneText').textContent=zoneForY(p.y).name;
 $('missionName').textContent=world.contract.title;$('missionText').textContent=missionText();$('bagText').textContent=world.bagWeight.toFixed(1)+' / '+world.st.bag+'kg';$('moneyText').textContent=money(world.income);$('sonarText').textContent=world.sonarCd>0?'SONAR '+world.sonarCd.toFixed(1)+'s':'SONAR READY'
}
function setTool(name){
 if(!world)return;world.tool=name;document.body.classList.toggle('cameraMode',name==='camera');document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===name));
 const labels={camera:'카메라',harpoon:'작살',sonar:'소나'};showHint(labels[name]+' 선택',700)
}
function nearestFrontFish(maxDist){
 const p=world.player,dir=p.face,arr=world.fish.filter(f=>f.alive).map(f=>({f,d:Math.hypot(f.x-p.x,f.y-p.y),front:(f.x-p.x)*dir,vert:Math.abs(f.y-p.y)})).filter(o=>o.front>0&&o.d<maxDist&&o.vert<maxDist*.55).sort((a,b)=>a.d-b.d);return arr[0]?.f||null
}
function findCameraTarget(){return nearestFrontFish(world.st.camera)}
function photoGrade(f){
 const p=world.player,d=Math.hypot(f.x-p.x,f.y-p.y),ideal=world.st.camera*.48,delta=Math.abs(d-ideal)/world.st.camera,vert=Math.abs(f.y-p.y)/90;
 const q=1-delta*.85-vert*.45;return q>.78?'S':q>.58?'A':q>.38?'B':'C'
}
function useCamera(){
 const f=findCameraTarget();if(!f){showHint('촬영 대상을 앞쪽 프레임에 맞추세요.',1100);beep(180,.05);return}
 const grade=photoGrade(f),old=f.photo;f.photo=old&&['S','A','B','C'].indexOf(old)<['S','A','B','C'].indexOf(grade)?old:grade;meta.codex[f.key]=meta.codex[f.key]||{best:grade,count:0};meta.codex[f.key].count++;const order={S:4,A:3,B:2,C:1};if(order[grade]>order[meta.codex[f.key].best||'C'])meta.codex[f.key].best=grade;
 world.mission.photos[f.key]=true;if(f.key==='giant')world.mission.giantGrade=grade;save();beep(1050,.06);setTimeout(()=>beep(1500,.07),65);world.effects.push({type:'flash',x:f.x,y:f.y,t:0});showHint(SPECIES[f.key].name+' · '+grade+'등급 촬영',1200)
}
function fireHarpoon(){
 const p=world.player;if(world.shots.length>2)return;const speed=520+meta.up.harpoon*55;world.shots.push({x:p.x+p.face*24,y:p.y,vx:p.face*speed,vy:0,life:world.st.harpoon/speed});beep(330,.04)
}
function useSonar(){
 if(world.sonarCd>0){showHint('소나 재사용까지 '+world.sonarCd.toFixed(1)+'초',900);return}world.sonar=4.5;world.sonarCd=world.st.sonar;document.body.classList.add('sonarActive');setTimeout(()=>document.body.classList.remove('sonarActive'),1250);beep(220,.18);setTimeout(()=>beep(760,.12),80);showHint('소나 펄스 · 희귀 생물과 위험물이 표시됩니다.',1200)
}
function useTool(){if(!world)return;if(world.tool==='camera')useCamera();else if(world.tool==='harpoon')fireHarpoon();else useSonar()}
function interact(){
 const p=world.player;
 for(const q of world.pickups){if(q.taken)continue;if(Math.hypot(q.x-p.x,q.y-p.y)<72){if(world.bagWeight+q.weight>world.st.bag){showHint('가방 무게가 부족합니다.',1000);return}q.taken=true;world.bagWeight+=q.weight;world.bag.push(q.id);world.income+=q.value;if(q.id==='relic')world.mission.relic=true;if(q.id==='recorder')world.mission.recorder=true;beep(760,.08);showHint(q.name+' 회수',1100);return}}
 for(const o of world.props){if(o.done)continue;if(Math.hypot(o.x-p.x,o.y-p.y)<95){o.done=true;world.mission[o.id]=true;beep(880,.08);showHint((o.id==='statue'?'침수 석상':'거대 석조 아치')+' 기록 완료',1000);return}}
 showHint('가까운 조사 대상이 없습니다.',800)
}
function captureFish(f){
 const sp=SPECIES[f.key];if(sp.protected){showHint(sp.name+'은 보호 관찰 대상입니다. 촬영하세요.',1200);return}
 if(world.bagWeight+sp.weight>world.st.bag){showHint('가방 무게가 부족합니다.',900);return}
 f.alive=false;world.bagWeight+=sp.weight;world.bag.push(f.key);world.income+=sp.value;world.mission.samples++;beep(650,.06);showHint(sp.name+' 표본 확보 +'+money(sp.value),1000)
}
function explodeMine(m){
 if(m.dead)return;m.dead=true;world.effects.push({type:'boom',x:m.x,y:m.y,t:0,big:m.size==='B'});const d=Math.hypot(world.player.x-m.x,world.player.y-m.y);if(d<125){const dmg=Math.max(10,Math.round((38-d*.18)*world.st.armor));world.player.hp-=dmg;world.player.inv=1.1;showHint('기뢰 폭발! -'+dmg+' HP',1000);beep(90,.22,'sawtooth')}
}

function resetInputs(){Object.keys(keys).forEach(k=>keys[k]=false);touch.x=touch.y=0;touch.dash=false;const k=$('knob');if(k)k.style.transform='translate(0,0)'}
function update(dt){
 if(state!=='playing'||!world)return;world.time+=dt;const p=world.player,st=world.st;
 p.dashCd=Math.max(0,p.dashCd-dt);p.inv=Math.max(0,p.inv-dt);world.sonar=Math.max(0,world.sonar-dt);world.sonarCd=Math.max(0,world.sonarCd-dt);
 let ix=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0)+touch.x,iy=(keys.w||keys.arrowup?-1:0)+(keys.s||keys.arrowdown?1:0)+touch.y;let len=Math.hypot(ix,iy);if(len>1){ix/=len;iy/=len}
 const dashing=(keys.shift||touch.dash)&&p.dashCd<=0&&len>.1,spd=st.speed*(dashing?1.75:1);if(dashing)p.dashCd=.65;
 const accel=6,tx=ix*spd,ty=iy*spd;p.vx=lerp(p.vx,tx,clamp(dt*accel,0,1));p.vy=lerp(p.vy,ty,clamp(dt*accel,0,1));if(len<.05){p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt)}
 p.x=clamp(p.x+p.vx*dt,45,WORLD.w-45);p.y=clamp(p.y+p.vy*dt,WORLD.surface+18,WORLD.h-35);const terrainHit=resolvePlayerTerrain(p,23);if(terrainHit){p.vx*=.82;p.vy*=.82}if(Math.abs(p.vx)>8)p.face=p.vx>0?1:-1;
 p.oxygen-=dt*(dashing?1.55:1);const dep=depthOf(p.y);world.maxDepth=Math.max(world.maxDepth,dep);if(dep>=350)world.mission.deep=true;
 const zn=zoneForY(p.y).name;if(zn!==world.lastZone){world.lastZone=zn;showZone(zn)}
 for(const f of world.fish){if(!f.alive)continue;const sp=SPECIES[f.key];f.marked=Math.max(0,f.marked-dt);let fear=Math.hypot(f.x-p.x,f.y-p.y)<105&&!sp.protected?1:0;f.x+=f.vx*dt*(fear?1.9:1);f.y+=Math.sin(world.time*.9+f.phase)*5*dt;if(f.x<60||f.x>WORLD.w-60)f.vx*=-1;if(world.terrain.some(s=>pointInSolid(f.x,f.y,s,8))){f.x-=f.vx*dt*2.2;f.vx*=-1;f.y=lerp(f.y,f.baseY,.16)}if(Math.abs(f.y-f.baseY)>65)f.y=lerp(f.y,f.baseY,.05);if(f.key==='giant'&&Math.hypot(f.x-p.x,f.y-p.y)<115&&p.inv<=0){p.hp-=14*st.armor;p.inv=1.2;showHint('대형 심해 생물과 거리를 확보하세요!',900)}}
 for(const s of world.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(world.terrain.some(t=>pointInSolid(s.x,s.y,t,2))){s.life=0;world.effects.push({type:'spark',x:s.x,y:s.y,t:0});continue}for(const f of world.fish){if(!f.alive)continue;if(Math.hypot(f.x-s.x,f.y-s.y)<28){captureFish(f);s.life=0;break}}}
 world.shots=world.shots.filter(s=>s.life>0);
 for(const m of world.mines){if(m.dead)continue;m.marked=Math.max(0,m.marked-dt);const d=Math.hypot(m.x-p.x,m.y-p.y);if(d<92&&m.fuse<=0){m.fuse=1.25;showHint('기뢰 근접 경보!',700);beep(250,.05)}if(m.fuse>0){m.fuse-=dt;if(m.fuse<=0)explodeMine(m)}}
 for(const b of world.bubbles){b.y-=b.speed*dt;if(b.y<70){b.y=WORLD.h-20;b.x=rnd(0,WORLD.w)}}
 for(const e of world.effects)e.t+=dt;world.effects=world.effects.filter(e=>e.t<.85);
 world.camera.x=lerp(world.camera.x,p.x,1-Math.pow(.002,dt));world.camera.y=lerp(world.camera.y,p.y,1-Math.pow(.002,dt));
 if(p.oxygen<=0||p.hp<=0){finishDive(false,p.oxygen<=0?'산소가 고갈되어 구조되었습니다.':'부상으로 긴급 구조되었습니다.');return}
 if(p.y<WORLD.surface+45&&missionComplete()&&world.time>4){finishDive(true,'계약 목표를 완료하고 수면으로 무사 귀환했습니다.')}
}
function finishDive(ok,reason){
 if(state!=='playing')return;state='result';document.body.classList.remove('playing','cameraMode','sonarActive');resetInputs();
 const complete=missionComplete(),base=complete?world.contract.reward:0,depthBonus=Math.round(world.maxDepth*1.25),survival=ok?250:0,penalty=ok?0:Math.round(world.income*.45),gain=Math.max(0,world.income-penalty+base+depthBonus+survival),score=Math.round(gain+world.maxDepth*2+(ok?400:0));
 meta.money+=gain;meta.bestDepth=Math.max(meta.bestDepth,world.maxDepth);meta.bestScore=Math.max(meta.bestScore,score);if(ok&&complete)meta.unlocked=Math.max(meta.unlocked,Math.min(CONTRACTS.length-1,world.contract.unlock+1));save();
 $('resultTitle').textContent=ok?'무사 귀환 · 잠수 보고서':'긴급 구조 · 잠수 보고서';
 $('resultBody').innerHTML='<div class="notice">'+reason+'</div><div class="report"><div class="card"><span>계약</span><b>'+(complete?'완료':'미완료')+'</b></div><div class="card"><span>최대 수심</span><b>'+Math.round(world.maxDepth)+'m</b></div><div class="card"><span>수집 수익</span><b>'+money(world.income)+'</b></div><div class="card"><span>계약 보상</span><b>'+money(base)+'</b></div><div class="card"><span>총 획득</span><b>'+money(gain)+'</b></div><div class="card"><span>탐사 점수</span><b>'+score+'</b></div></div>';
 $('resultScreen').classList.remove('hidden')
}

function frame(now){const dt=clamp((now-last)/1000,0,.033);last=now;if(state==='playing'){update(dt);render()}requestAnimationFrame(frame)}requestAnimationFrame(frame);

function contractCards(){
 return CONTRACTS.map((c,i)=>'<div class="card '+(i>meta.unlocked?'locked':'')+'"><h3>'+c.title+'</h3><p>'+c.desc+'</p><div class="reward">계약 보상 '+money(c.reward)+'</div><button class="btn '+(i>meta.unlocked?'dark':'gold')+'" data-contract="'+c.id+'" '+(i>meta.unlocked?'disabled':'')+'>'+(i>meta.unlocked?'잠김':'잠수 시작')+'</button></div>').join('')
}
function openContracts(){
 state='menu';document.body.classList.remove('playing','cameraMode','sonarActive');['startScreen','shopScreen','codexScreen','resultScreen'].forEach(id=>$(id)?.classList.add('hidden'));
 $('contractBody').innerHTML='<div class="notice">보유 자금 <b>'+money(meta.money)+'</b> · 최고 수심 <b>'+Math.round(meta.bestDepth)+'m</b> · 최고 점수 <b>'+meta.bestScore+'</b></div><div class="grid">'+contractCards()+'</div><div class="toolbar"><button class="btn" id="shopBtn">장비실</button><button class="btn dark" id="codexBtn">생물 도감</button><button class="btn dark" id="menuBtn">시작 화면</button></div>';
 $('contractScreen').classList.remove('hidden');document.querySelectorAll('[data-contract]').forEach(b=>b.onclick=()=>{const c=CONTRACTS.find(x=>x.id===b.dataset.contract);if(c)buildWorld(c)});$('shopBtn').onclick=openShop;$('codexBtn').onclick=openCodex;$('menuBtn').onclick=()=>{$('contractScreen').classList.add('hidden');$('startScreen').classList.remove('hidden')}
}
function upCost(k){const u=UPGRADES[k];return Math.round(u.base*(1+meta.up[k]*.72))}
function openShop(){
 $('contractScreen').classList.add('hidden');const cards=Object.keys(UPGRADES).map(k=>{const u=UPGRADES[k],lv=meta.up[k],max=lv>=u.max,c=upCost(k);return'<div class="card"><h3>'+u.name+' Lv.'+lv+'/'+u.max+'</h3><p>'+u.desc+'</p><button class="btn '+(max?'dark':'gold')+'" data-up="'+k+'" '+(max?'disabled':'')+'>'+(max?'최대 강화':money(c)+' 강화')+'</button></div>'}).join('');
 $('shopBody').innerHTML='<div class="notice">보유 자금 <b>'+money(meta.money)+'</b></div><div class="grid">'+cards+'</div><button class="btn" id="shopBack">계약 게시판</button>';$('shopScreen').classList.remove('hidden');document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const k=b.dataset.up,c=upCost(k);if(meta.money<c){showHint('자금이 부족합니다.',900);return}meta.money-=c;meta.up[k]++;save();beep(760,.07);openShop()});$('shopBack').onclick=openContracts
}
function openCodex(){
 $('contractScreen').classList.add('hidden');const order=Object.keys(SPECIES);$('codexBody').innerHTML='<div class="grid">'+order.map(k=>{const sp=SPECIES[k],rec=meta.codex[k];return'<div class="card codexCard '+(rec?'':'unknown')+'"><h3>'+(rec?sp.name:'??? 미기록 생물')+'</h3><p>'+(rec?('발견 수심 '+sp.depth[0]+'~'+sp.depth[1]+'m · 최고 사진 '+(rec.best||'C')+' · 촬영 '+(rec.count||0)+'회'):'현장에서 카메라로 촬영하면 도감이 열립니다.')+'</p></div>'}).join('')+'</div><button class="btn" id="codexBack">계약 게시판</button>';$('codexScreen').classList.remove('hidden');$('codexBack').onclick=openContracts
}

function bind(){
 $('startBtn').onclick=()=>{if(!ready)return;meta.money=0;meta.unlocked=0;meta.up={oxygen:0,fins:0,bag:0,camera:0,harpoon:0,sonar:0,suit:0};meta.codex={};meta.bestDepth=0;meta.bestScore=0;save();openContracts()};
 $('continueBtn').onclick=()=>{if(!ready)return;load();openContracts()};
 $('nextBtn').onclick=openContracts;$('homeBtn').onclick=()=>{$('resultScreen').classList.add('hidden');$('startScreen').classList.remove('hidden');state='menu'};
 $('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent=sound?'SOUND ON':'SOUND OFF';if(sound)beep(700,.07)};
 document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
 $('actionMain').onclick=useTool;$('interactMain').onclick=interact;$('actionMobile').onclick=useTool;$('interactMobile').onclick=interact;$('dashMobile').onpointerdown=e=>{e.preventDefault();touch.dash=true};$('dashMobile').onpointerup=$('dashMobile').onpointercancel=$('dashMobile').onlostpointercapture=()=>touch.dash=false;
 addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(state!=='playing')return;if(k==='1')setTool('camera');if(k==='2')setTool('harpoon');if(k==='3')setTool('sonar');if((k==='x'||k===' ')&&!e.repeat)useTool();if(k==='e'&&!e.repeat)interact()});
 addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('blur',resetInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInputs()});
 let joyId=null;const stick=$('stick'),knob=$('knob');
 function moveJoy(e){const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),m=r.width*.34,l=Math.hypot(dx,dy)||1,k=Math.min(1,l/m);touch.x=dx/l*k;touch.y=dy/l*k;knob.style.transform='translate('+(touch.x*36)+'px,'+(touch.y*36)+'px)'}
 stick.onpointerdown=e=>{joyId=e.pointerId;stick.setPointerCapture?.(e.pointerId);moveJoy(e)};stick.onpointermove=e=>{if(e.pointerId===joyId)moveJoy(e)};const end=e=>{if(joyId!==null&&e.pointerId!==joyId)return;joyId=null;touch.x=touch.y=0;knob.style.transform='translate(0,0)'};stick.onpointerup=end;stick.onpointercancel=end;stick.onlostpointercapture=end;
}
bind();load();updateStartButtons();
})();