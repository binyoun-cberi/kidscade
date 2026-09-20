(()=>{
'use strict';

const C=document.getElementById('game'),ctx=C.getContext('2d');
const $=id=>document.getElementById(id);
const U='../../assets/game/2d/underwater/underwater-diving/';
const F='../../assets/game/2d/fish/';
const P='../../assets/game/2d/pirate/';
const SHARK='../../assets/game/2d/underwater/deep-diver/creatures/shark/';
const FAUNA='../../assets/game/2d/underwater/deep-diver/creatures/';
const SAVE='deep_diver_2d_v7',OLD='deep_diver_2d_v5',LEGACY='deep_diver_openwater_v4';
const WORLD={w:6800,h:4200,surface:60,scaleDepth:5.5};
const ZONES=[
 {id:'reef',name:'산호 정원',tag:'햇빛·산호 절벽·얕은 수로',y0:60,y1:720,bg0:'#58c9d0',bg1:'#087792',accent:'#ffd36a'},
 {id:'kelp',name:'해초 숲',tag:'거대한 해초·강한 조류·숨은 통로',y0:720,y1:1500,bg0:'#198b79',bg1:'#07545c',accent:'#6bd88a'},
 {id:'ruins',name:'침수 유적',tag:'석조 회랑·붕괴된 광장·깊은 우물',y0:1500,y1:2350,bg0:'#315f70',bg1:'#17394f',accent:'#c5b78d'},
 {id:'wreck',name:'난파선 지대',tag:'선체 잔해·기뢰 골목·화물 구역',y0:2350,y1:3250,bg0:'#244b5a',bg1:'#102b3e',accent:'#db8b62'},
 {id:'abyss',name:'암흑 심해',tag:'무광층·열수 계곡·포식자 영역',y0:3250,y1:4200,bg0:'#111c35',bg1:'#030713',accent:'#79e9ff'}
];
const SUBZONES=[
 {id:'reefShelf',zone:'reef',name:'산호 선반',y0:60,y1:300},
 {id:'reefMaze',zone:'reef',name:'산호 미로',y0:300,y1:520},
 {id:'blueDrop',zone:'reef',name:'푸른 낙차',y0:520,y1:720},
 {id:'kelpEdge',zone:'kelp',name:'해초 초입',y0:720,y1:960},
 {id:'kelpCathedral',zone:'kelp',name:'해초 대성당',y0:960,y1:1260},
 {id:'currentCut',zone:'kelp',name:'조류 협곡',y0:1260,y1:1500},
 {id:'ruinGate',zone:'ruins',name:'가라앉은 문',y0:1500,y1:1760},
 {id:'ruinCourt',zone:'ruins',name:'침수 광장',y0:1760,y1:2070},
 {id:'ruinWell',zone:'ruins',name:'고대 수직 우물',y0:2070,y1:2350},
 {id:'wreckOuter',zone:'wreck',name:'잔해 외곽',y0:2350,y1:2620},
 {id:'mineLane',zone:'wreck',name:'기뢰 골목',y0:2620,y1:2940},
 {id:'cargoGrave',zone:'wreck',name:'화물선 무덤',y0:2940,y1:3250},
 {id:'blackwater',zone:'abyss',name:'무광 수역',y0:3250,y1:3500},
 {id:'ventValley',zone:'abyss',name:'열수 계곡',y0:3500,y1:3840},
 {id:'predatorTrench',zone:'abyss',name:'포식자 해구',y0:3840,y1:4200}
];
const subzoneForY=y=>SUBZONES.find(z=>y>=z.y0&&y<z.y1)||SUBZONES[SUBZONES.length-1];
const CONTRACTS=[
 {id:'reef',title:'01 · 산호초 생태 조사',desc:'청색 암초어·주황 산호어·분홍 산호어를 각각 B등급 이상 촬영하고 산호 미로를 지나 안전하게 귀환하세요.',reward:1100,unlock:0,target:'reef'},
 {id:'kelp',title:'02 · 해초 숲 표본 조사',desc:'희귀 회색 긴꼬리어를 A등급 이상 촬영하고 일반 표본 2개를 회수한 뒤 조류 협곡을 통과하세요.',reward:1800,unlock:1,target:'kelp'},
 {id:'ruins',title:'03 · 침수 유적 기록',desc:'침수 석상과 아치를 기록하고 고대 표식판을 회수하세요.',reward:2700,unlock:2,target:'ruins'},
 {id:'wreck',title:'04 · 난파선 기록 장치',desc:'기뢰 골목을 지나 침몰선의 항해기록 장치를 회수하세요.',reward:3900,unlock:3,target:'wreck'},
 {id:'abyss',title:'05 · 심해 생물 조사',desc:'600m 아래 포식자 해구에서 대형 심해 상어를 A등급 이상 촬영하고 살아서 귀환하세요.',reward:5600,unlock:4,target:'abyss'}
];
const UPGRADES={
 oxygen:{name:'산소통',desc:'최대 산소 +18초',base:900,max:5},
 fins:{name:'추진 핀',desc:'수영 속도 +7%',base:850,max:5},
 bag:{name:'표본 케이스',desc:'최대 무게 +3kg',base:800,max:5},
 camera:{name:'카메라 렌즈',desc:'촬영 판정 거리 증가',base:1100,max:4},
 harpoon:{name:'작살 릴',desc:'작살 사거리·속도 증가',base:1000,max:4},
 sonar:{name:'소나',desc:'쿨다운 감소',base:1100,max:4},
 suit:{name:'잠수복',desc:'충격 피해 감소 · 안전 수심 +22m',base:1200,max:4}
};
const ASSETS={
 playerIdle:U+'player/player-idle.png',playerSwim:U+'player/player-swiming.png',playerFast:U+'player/player-fast.png',playerRush:U+'player/player-rush.png',playerHurt:U+'player/player-hurt.png',
 fishAnim:U+'enemies/fish.png',fishDart:U+'enemies/fish-dart.png',fishBig:U+'enemies/fish-big.png',shark:SHARK+'shark-swim-atlas.png',
 mineS:U+'enemies/mine-small.png',mine:U+'enemies/mine.png',mineB:U+'enemies/mine-big.png',
 bg:U+'environment/background.png',mid:U+'environment/midground.png',props:U+'environment/props.png',tiles:U+'environment/tiles.png',
 bubbles:U+'fx/bubbles.png',explosion:U+'fx/explosion.png',explosionB:U+'fx/explosion-big.png',
 blue:F+'fish_blue.png',orange:F+'fish_orange.png',green:F+'fish_green.png',grey:F+'fish_grey.png',greyLong:F+'fish_grey_long_a.png',red:F+'fish_red.png',pink:F+'fish_pink.png',brown:F+'fish_brown.png',
 rockA:F+'rock_a.png',rockB:F+'rock_b.png',
 bgRockA:F+'background_rock_a.png',bgRockB:F+'background_rock_b.png',
 bgSeaA:F+'background_seaweed_a.png',bgSeaB:F+'background_seaweed_b.png',bgSeaC:F+'background_seaweed_c.png',bgSeaD:F+'background_seaweed_d.png',bgSeaE:F+'background_seaweed_e.png',bgSeaF:F+'background_seaweed_f.png',bgSeaG:F+'background_seaweed_g.png',bgSeaH:F+'background_seaweed_h.png',
 seaweedA:F+'seaweed_green_a.png',seaweedGreenB:F+'seaweed_green_b.png',seaweedGreenC:F+'seaweed_green_c.png',seaweedGreenD:F+'seaweed_green_d.png',
 seaweedB:F+'seaweed_pink_a.png',seaweedPinkB:F+'seaweed_pink_b.png',seaweedPinkC:F+'seaweed_pink_c.png',seaweedPinkD:F+'seaweed_pink_d.png',
 seaweedOrangeA:F+'seaweed_orange_a.png',seaweedOrangeB:F+'seaweed_orange_b.png',
 grassA:F+'seaweed_grass_a.png',grassB:F+'seaweed_grass_b.png',sand:F+'terrain_sand_top_a.png',dirt:F+'terrain_dirt_top_a.png',
 crab1:FAUNA+'crustaceans/crab/frames/crab-walk-01.png',crab2:FAUNA+'crustaceans/crab/frames/crab-walk-02.png',
 mantis:FAUNA+'crustaceans/mantis-shrimp/mantis-shrimp-2x.png',
 urchin:FAUNA+'echinoderms/purple-sea-urchin.png',ochreStar:FAUNA+'echinoderms/ochre-sea-star.png',crownStar:FAUNA+'echinoderms/crown-of-thorns-starfish.png',
 nautilus:FAUNA+'mollusks/nautilus/nautilus.png',squid:FAUNA+'cephalopods/squid/squid-sprites.png',kraken:FAUNA+'cephalopods/kraken/kraken-anim.gif',
 jelly01:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-01.png',jelly02:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-02.png',jelly03:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-03.png',jelly04:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-04.png',jelly05:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-05.png',jelly06:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-06.png',jelly07:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-07.png',jelly08:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-08.png',jelly09:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-09.png',jelly10:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-10.png',jelly11:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-11.png',jelly12:FAUNA+'cnidarians/jellyfish/swim/jellyfish-swim-12.png',
 jellyAtk01:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-01.png',jellyAtk02:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-02.png',jellyAtk03:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-03.png',jellyAtk04:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-04.png',jellyAtk05:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-05.png',jellyAtk06:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-06.png',jellyAtk07:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-07.png',jellyAtk08:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-08.png',jellyAtk09:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-09.png',jellyAtk10:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-10.png',jellyAtk11:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-11.png',jellyAtk12:FAUNA+'cnidarians/jellyfish/attack/jellyfish-attack-12.png',
 whale:FAUNA+'megafauna/whale/whale.png',vaquita:FAUNA+'megafauna/vaquita/vaquita-porpoise.png',shark2:FAUNA+'shark/variants/shark-001-64px.gif',
 wreck:P+'ships/ship-8.png',wood1:P+'ship-parts/wood-1.png',wood2:P+'ship-parts/wood-2.png'
};
const imgs={}; let ready=false,loaded=0;
for(const [k,src] of Object.entries(ASSETS)){const im=new Image();imgs[k]=im;im.onload=im.onerror=()=>{loaded++;if(loaded===Object.keys(ASSETS).length){ready=true;updateStartButtons()}};im.src=src}

const SPECIES={
 blue:{name:'청색 암초어',img:'blue',depth:[5,110],weight:1.2,value:160,protected:false,rare:false,behavior:'school',speed:44},
 orange:{name:'주황 산호어',img:'orange',depth:[8,115],weight:1.0,value:150,protected:false,rare:false,behavior:'school',speed:40},
 pink:{name:'분홍 산호어',img:'pink',depth:[12,120],weight:1.1,value:175,protected:false,rare:false,behavior:'school',speed:42},
 green:{name:'초록 암초어',img:'green',depth:[55,255],weight:1.3,value:180,protected:false,rare:false,behavior:'flee',speed:48},
 red:{name:'붉은 해초어',img:'red',depth:[120,265],weight:1.4,value:220,protected:false,rare:false,behavior:'flee',speed:55},
 grey:{name:'회색 암초어',img:'grey',depth:[105,330],weight:1.5,value:210,protected:false,rare:false,behavior:'flee',speed:46},
 long:{name:'회색 긴꼬리어',img:'greyLong',depth:[165,300],weight:1.8,value:330,protected:true,rare:true,behavior:'skittish',speed:70},
 brown:{name:'갈색 난파어',img:'brown',depth:[280,585],weight:1.7,value:280,protected:false,rare:false,behavior:'territorial',speed:60,damage:8},
 dart:{name:'빠른 심해어',img:'fishDart',animated:true,fw:39,fh:20,frames:4,depth:[245,720],weight:1.6,value:360,protected:false,rare:true,behavior:'territorial',speed:92,damage:10},
 hunter:{name:'큰이빨 포식어',img:'fishBig',animated:true,fw:48,fh:32,frames:4,depth:[300,750],weight:2.8,value:610,protected:false,rare:true,behavior:'predator',speed:112,damage:14},
 angler:{name:'등불 심해어',img:'fishAnim',animated:true,fw:32,fh:32,frames:4,depth:[430,755],weight:2.2,value:520,protected:true,rare:true,behavior:'ambush',speed:105,damage:13},
 giant:{name:'대형 심해 상어',img:'shark',animated:true,fw:32,fh:32,frames:8,depth:[600,755],weight:0,value:0,protected:true,rare:true,behavior:'predator',speed:128,damage:24},
 crab:{name:'바위게',img:'crab1',depth:[8,360],weight:.8,value:240,protected:false,rare:false,behavior:'crawler',motion:'crawler',speed:24,draw:[54,54]},
 mantis:{name:'공작갯가재',img:'mantis',depth:[45,160],weight:0,value:0,protected:true,rare:true,behavior:'territorial',motion:'crawlerBoss',speed:58,damage:19,draw:[112,64]},
 urchin:{name:'보라성게',img:'urchin',depth:[5,260],weight:0,value:0,protected:true,rare:false,behavior:'sessile',motion:'sessile',speed:0,draw:[30,30]},
 ochreStar:{name:'황토불가사리',img:'ochreStar',depth:[5,220],weight:0,value:0,protected:true,rare:false,behavior:'sessile',motion:'sessile',speed:0,draw:[31,31]},
 crownStar:{name:'가시왕관불가사리',img:'crownStar',depth:[20,180],weight:0,value:0,protected:true,rare:true,behavior:'sessile',motion:'sessile',speed:0,draw:[34,34]},
 nautilus:{name:'앵무조개',img:'nautilus',depth:[115,390],weight:0,value:0,protected:true,rare:true,behavior:'drifter',motion:'drifter',speed:31,draw:[63,41]},
 squid:{name:'심해 오징어',img:'squid',depth:[210,650],weight:2.2,value:620,protected:false,rare:true,behavior:'skittish',motion:'jet',speed:88,draw:[82,60]},
 jelly:{name:'푸른 해파리',img:'jelly01',depth:[90,610],weight:0,value:0,protected:true,rare:false,behavior:'drifter',motion:'jelly',speed:22,damage:7,draw:[58,58]},
 whale:{name:'대형 고래',img:'whale',depth:[45,310],weight:0,value:0,protected:true,rare:true,behavior:'megafauna',motion:'megafauna',speed:30,draw:[280,150]},
 vaquita:{name:'바키타',img:'vaquita',depth:[15,160],weight:0,value:0,protected:true,rare:true,behavior:'megafauna',motion:'megafauna',speed:54,draw:[170,78]},
 shark2:{name:'회유성 상어',img:'shark2',depth:[250,690],weight:0,value:0,protected:true,rare:true,behavior:'predator',motion:'swimmer',speed:118,damage:16,draw:[88,58]},
 kraken:{name:'심해 크라켄',img:'kraken',depth:[650,755],weight:0,value:0,protected:true,rare:true,behavior:'predator',motion:'boss',speed:76,damage:28,draw:[190,160]}
};
const BIOME_POPULATIONS={
 reef:[['blue',10],['orange',9],['pink',7],['green',7]],
 kelp:[['green',7],['red',8],['grey',7],['long',4]],
 ruins:[['grey',5],['brown',6],['dart',5],['hunter',3]],
 wreck:[['brown',8],['dart',7],['hunter',7],['angler',5]],
 abyss:[['angler',10],['hunter',8],['dart',5]]
};
const FAUNA_POPULATIONS={
 reef:[['crab',8],['urchin',10],['ochreStar',7],['crownStar',3],['mantis',1],['vaquita',1]],
 kelp:[['crab',5],['nautilus',4],['jelly',7],['squid',3],['whale',1]],
 ruins:[['crab',4],['nautilus',4],['jelly',5],['squid',5]],
 wreck:[['crab',6],['jelly',4],['squid',6],['shark2',3]],
 abyss:[['jelly',6],['squid',5],['shark2',4],['kraken',1]]
};
const ZONE_RULES={
 reef:{oxygen:1,current:0,visibility:1,danger:'낮음'},
 kelp:{oxygen:1.08,current:38,visibility:.86,danger:'강한 조류'},
 ruins:{oxygen:1.18,current:16,visibility:.78,danger:'시야 저하·포식어'},
 wreck:{oxygen:1.30,current:24,visibility:.68,danger:'기뢰·포식자'},
 abyss:{oxygen:1.52,current:14,visibility:.46,danger:'고압·열수·대형 포식자'}
};
const VENTS=[[1180,3650,1.0],[2580,3710,1.25],[4120,3600,.95],[5480,3790,1.15],[6260,3880,.9]];
const ATTACK_PROFILE={
 brown:{sense:205,windup:.30,lunge:.34,speed:215,cooldown:2.25,damage:1.05,label:'영역 돌진'},
 dart:{sense:285,windup:.18,lunge:.28,speed:335,cooldown:1.75,damage:1.12,label:'고속 찌르기'},
 angler:{sense:265,windup:.24,lunge:.42,speed:275,cooldown:2.65,damage:1.15,label:'암습 돌진'},
 hunter:{sense:390,windup:.46,lunge:.40,speed:315,cooldown:2.35,damage:1.22,label:'포식 돌진'},
 giant:{sense:590,windup:.72,lunge:.62,speed:405,cooldown:3.55,damage:1.35,label:'심해 상어 돌진'},
 mantis:{sense:180,windup:.58,lunge:.20,speed:460,cooldown:3.1,damage:1.45,label:'갯가재 초고속 펀치'},
 shark2:{sense:430,windup:.42,lunge:.38,speed:335,cooldown:2.55,damage:1.18,label:'상어 돌진'},
 kraken:{sense:690,windup:.95,lunge:.70,speed:250,cooldown:4.2,damage:1.30,label:'크라켄 촉수 돌진'}
};
const HOSTILE_BEHAVIORS=new Set(['territorial','ambush','predator']);
const JELLY_SWIM_KEYS=Array.from({length:12},(_,i)=>'jelly'+String(i+1).padStart(2,'0'));
const JELLY_ATTACK_KEYS=Array.from({length:12},(_,i)=>'jellyAtk'+String(i+1).padStart(2,'0'));
const CONTRACT_DEPTH_RATING=[150,285,430,575,760];
const GRADE_SCORE={C:1,B:2,A:3,S:4};
const PHOTO_MULT={C:.45,B:.85,A:1.45,S:2.25};

let view={w:innerWidth,h:innerHeight,dpr:1},last=performance.now(),state='menu',world=null,sound=false,ac=null;
const keys={},touch={x:0,y:0,dash:false},meta={money:0,unlocked:0,up:{oxygen:0,fins:0,bag:0,camera:0,harpoon:0,sonar:0,suit:0},codex:{},bestDepth:0,bestScore:0};

function resize(){const r=C.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);view.w=Math.max(1,r.width||innerWidth);view.h=Math.max(1,r.height||innerHeight);view.dpr=dpr;C.width=Math.round(view.w*dpr);C.height=Math.round(view.h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a),lerp=(a,b,t)=>a+(b-a)*t;
const depthOf=y=>Math.max(0,(y-WORLD.surface)/WORLD.scaleDepth);
const zoneForY=y=>ZONES.find(z=>y>=z.y0&&y<z.y1)||ZONES[ZONES.length-1];
const money=n=>Math.round(n).toLocaleString('ko-KR')+'원';
function stats(){return{oxygen:105+meta.up.oxygen*15,speed:168*(1+meta.up.fins*.065),bag:8+meta.up.bag*3,camera:185+meta.up.camera*26,harpoon:300+meta.up.harpoon*42,sonar:Math.max(4,10-meta.up.sonar*1.15),armor:1-meta.up.suit*.11}}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(meta))}catch(e){}}
function load(){
  let r=null;try{r=JSON.parse(localStorage.getItem(SAVE)||'null')}catch(e){}
  if(!r){try{r=JSON.parse(localStorage.getItem(OLD)||'null')}catch(e){}}
  if(!r){try{const o=JSON.parse(localStorage.getItem(LEGACY)||'null');if(o)r={money:o.money||0,unlocked:Math.min(4,o.unlocked||0),up:o.up||{},codex:o.codex||{},bestDepth:o.bestDepth||0,bestScore:o.bestScore||0}}catch(e){}}
  if(r){meta.money=r.money||0;meta.unlocked=r.unlocked||0;Object.assign(meta.up,r.up||{});meta.codex=r.codex||{};meta.bestDepth=r.bestDepth||0;meta.bestScore=r.bestScore||0;save()}
}
function beep(f=500,d=.08,type='triangle'){if(!sound)return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.frequency.value=f;o.type=type;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.05,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(ac.destination);o.start();o.stop(t+d+.02)}catch(e){}}
function showHint(t,ms=1500){const el=$('hint');el.textContent=t;el.classList.add('show');clearTimeout(showHint.t);showHint.t=setTimeout(()=>el.classList.remove('show'),ms)}
function showZone(zone){const z=typeof zone==='string'?ZONES.find(q=>q.name===zone):zone,el=$('zoneToast');el.innerHTML=z?'<b>'+z.name+'</b><small>'+z.tag+'</small>':String(zone||'');el.classList.add('show');clearTimeout(showZone.t);showZone.t=setTimeout(()=>el.classList.remove('show'),1700)}
function updateStartButtons(){const s=$('startBtn'),c=$('continueBtn');if(s)s.disabled=!ready;if(c)c.disabled=!ready}

function seedRand(seed){let x=seed|0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1000000)/1000000}}
function makeFish(key,x,y,seed){const d=SPECIES[key],rr=seedRand(seed||Math.floor(Math.random()*999999)),dir=rr()>.5?1:-1,baseScale=d.motion==='boss'?2.15:d===SPECIES.giant?2.65:d.motion==='megafauna'?1.15:d.behavior==='predator'?1.24:.8+rr()*.3;return{kind:'creature',key,x,y,baseX:x,baseY:y,homeX:x,vx:dir*(d.speed||12)*(.72+rr()*.28),vy:(rr()-.5)*12,phase:rr()*Math.PI*2,scale:baseScale,alive:true,photo:null,marked:0,alert:0,attackCd:0,specialCd:rr()*1.8,attackMode:'',attackKind:'',attackT:0,attackVx:0,attackVy:0,hidden:false,panic:0,feeding:0,hooked:false,contactCd:0}}

function rectSolid(x,y,w,h,zone='reef',edge='sand'){return{shape:'rect',x,y,w,h,zone,edge}}
function circleSolid(x,y,r,zone='reef',edge='dirt'){return{shape:'circle',x,y,r,zone,edge}}
function buildTerrain(){
  // Wide/deep expedition map. Each biome has several chambers and at least two vertical routes.
  return[
    // REEF 60~720 : shelves -> coral maze -> blue drop
    rectSolid(0,330,980,100,'reef','sand'),rectSolid(1220,410,1080,95,'reef','sand'),rectSolid(2820,300,900,110,'reef','sand'),rectSolid(4230,430,900,95,'reef','sand'),rectSolid(5620,320,1180,110,'reef','sand'),
    circleSolid(1080,385,110,'reef','sand'),circleSolid(2440,520,95,'reef','sand'),circleSolid(3960,390,105,'reef','sand'),circleSolid(5400,510,120,'reef','sand'),
    rectSolid(0,650,720,70,'reef','sand'),rectSolid(1700,625,900,95,'reef','sand'),rectSolid(3500,640,980,80,'reef','sand'),rectSolid(5850,620,950,100,'reef','sand'),

    // KELP 720~1500 : tall walls and long current channels
    rectSolid(0,860,780,210,'kelp','dirt'),rectSolid(1020,1030,980,185,'kelp','dirt'),rectSolid(2320,820,720,260,'kelp','dirt'),rectSolid(3370,1110,980,185,'kelp','dirt'),rectSolid(4680,850,760,250,'kelp','dirt'),rectSolid(5740,1110,1060,190,'kelp','dirt'),
    circleSolid(890,980,100,'kelp'),circleSolid(2160,1180,105,'kelp'),circleSolid(3210,980,95,'kelp'),circleSolid(4540,1230,110,'kelp'),circleSolid(5580,980,100,'kelp'),
    rectSolid(520,1410,940,90,'kelp','dirt'),rectSolid(2600,1390,980,110,'kelp','dirt'),rectSolid(4930,1400,930,100,'kelp','dirt'),

    // RUINS 1500~2350 : courtyards, broken gates, vertical well
    rectSolid(0,1650,950,160,'ruins','dirt'),rectSolid(1240,1840,850,145,'ruins','dirt'),rectSolid(2440,1600,1120,155,'ruins','dirt'),rectSolid(3920,1880,900,145,'ruins','dirt'),rectSolid(5260,1620,1540,165,'ruins','dirt'),
    circleSolid(1080,1760,105,'ruins'),circleSolid(2240,1960,90,'ruins'),circleSolid(3740,1720,100,'ruins'),circleSolid(5000,1980,115,'ruins'),
    rectSolid(600,2210,880,120,'ruins','dirt'),rectSolid(2780,2180,950,170,'ruins','dirt'),rectSolid(4720,2200,920,150,'ruins','dirt'),

    // WRECK 2350~3250 : debris pockets and mine lanes
    rectSolid(0,2500,1080,190,'wreck','dirt'),rectSolid(1380,2770,900,165,'wreck','dirt'),rectSolid(2600,2460,880,200,'wreck','dirt'),rectSolid(3860,2800,980,160,'wreck','dirt'),rectSolid(5200,2480,1600,200,'wreck','dirt'),
    circleSolid(1210,2600,105,'wreck'),circleSolid(2420,2870,115,'wreck'),circleSolid(3660,2580,100,'wreck'),circleSolid(5000,2920,115,'wreck'),
    rectSolid(500,3140,920,110,'wreck','dirt'),rectSolid(3000,3110,1050,140,'wreck','dirt'),rectSolid(5600,3120,1200,130,'wreck','dirt'),

    // ABYSS 3250~4200 : blackwater entry -> vent valley -> predator trench
    rectSolid(0,3420,1250,250,'abyss','dirt'),rectSolid(1570,3650,900,180,'abyss','dirt'),rectSolid(2860,3370,980,260,'abyss','dirt'),rectSolid(4300,3690,980,185,'abyss','dirt'),rectSolid(5720,3410,1080,250,'abyss','dirt'),
    circleSolid(1410,3510,120,'abyss'),circleSolid(2680,3790,105,'abyss'),circleSolid(4080,3510,115,'abyss'),circleSolid(5520,3820,120,'abyss'),
    rectSolid(0,4090,850,110,'abyss','dirt'),rectSolid(1880,4070,980,130,'abyss','dirt'),rectSolid(3620,4050,920,150,'abyss','dirt'),rectSolid(5900,4060,900,140,'abyss','dirt')
  ];
}
function zonePlantPool(id,foreground=false){
  if(id==='reef')return foreground?['bgSeaB','bgSeaD','seaweedOrangeA','seaweedPinkB','seaweedPinkD','seaweedGreenB']:['seaweedOrangeA','seaweedOrangeB','seaweedB','seaweedPinkB','seaweedPinkC','seaweedPinkD','seaweedGreenB','grassA'];
  if(id==='kelp')return foreground?['bgSeaA','bgSeaC','bgSeaE','bgSeaG','bgSeaH','seaweedGreenC','seaweedGreenD']:['seaweedA','seaweedGreenB','seaweedGreenC','seaweedGreenD','grassA','grassB'];
  if(id==='ruins')return foreground?['bgSeaF','bgRockA','bgRockB','grassA','seaweedGreenD']:['rockA','rockB','grassA','seaweedGreenD','seaweedPinkD'];
  if(id==='wreck')return foreground?['bgRockB','bgSeaH','rockA','rockB','seaweedGreenD']:['rockA','rockB','grassB','seaweedGreenD'];
  return foreground?['bgRockA','bgRockB','bgSeaH']:['rockA','rockB','grassB'];
}
function buildForeground(seed){
  const r=seedRand(seed+4411),items=[];
  for(const z of ZONES){
    const pool=zonePlantPool(z.id,true),count=z.id==='kelp'?56:z.id==='reef'?45:z.id==='ruins'?35:z.id==='wreck'?32:28;
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
   contract,st,time:0,camera:{x:WORLD.w*.5,y:220},player:{x:WORLD.w*.5,y:130,vx:0,vy:0,face:1,aimX:1,aimY:0,oxygen:st.oxygen,hp:100,dashCd:0,dashTime:0,dashHeld:false,inv:0},
   fish:[],decor:[],foreground:buildForeground(contract.unlock*9127+57),terrain:buildTerrain(),props:[],mines:[],pickups:[],shots:[],effects:[],bubbles:[],bossSeen:{mantis:false,kraken:false},
   bag:[],bagWeight:0,income:0,photoIncome:0,maxDepth:0,tool:'camera',sonar:0,sonarCd:0,lastZone:'',lastSubzone:'',zoneFlash:0,envPulse:0,lightJam:0,currentBurst:0,pressureOver:0,pressureTick:0,pressureState:'safe',reserveState:'safe',tether:null,complete:false,returned:false,
   mission:{photos:{},photoGrades:{},samples:0,statue:false,arch:false,relic:false,recorder:false,deep:false,giantGrade:null,visited:{}}
 };
 let fishSeed=0;
 for(const z of ZONES){
   const population=BIOME_POPULATIONS[z.id]||[];
   for(const [key,count] of population){
     const expandedCount=Math.max(count,Math.round(count*1.55));
     for(let i=0;i<expandedCount;i++){
       let x=0,y=0,tries=0;
       do{
         x=130+r()*(WORLD.w-260);
         y=(z.y0+42)+r()*Math.max(40,(z.y1-z.y0)-84);
         tries++;
       }while(tries<24&&world.terrain.some(t=>pointInSolid(x,y,t,36)));
       world.fish.push(makeFish(key,x,y,12000+fishSeed++*37+contract.unlock*503));
     }
   }
 }
 for(const z of ZONES){
   const population=FAUNA_POPULATIONS[z.id]||[];
   for(const [key,count] of population){
     for(let i=0;i<count;i++){
       const sp=SPECIES[key];let x=130+r()*(WORLD.w-260),y=(z.y0+55)+r()*Math.max(50,(z.y1-z.y0)-110),tries=0;
       if(sp.motion==='crawler'||sp.motion==='crawlerBoss'||sp.motion==='sessile'){
         const floors=world.terrain.filter(t=>t.zone===z.id&&t.shape==='rect');
         const floor=floors[Math.floor(r()*Math.max(1,floors.length))];
         if(floor){x=floor.x+45+r()*Math.max(20,floor.w-90);y=floor.y-22}
       }else{
         do{x=130+r()*(WORLD.w-260);y=(z.y0+55)+r()*Math.max(50,(z.y1-z.y0)-110);tries++}while(tries<20&&world.terrain.some(t=>pointInSolid(x,y,t,42)));
       }
       world.fish.push(makeFish(key,x,y,18000+fishSeed++*43+contract.unlock*701));
     }
   }
 }
 // Curated encounters: a reef-maze mantis shrimp and an abyssal kraken always exist.
 world.fish.push(makeFish('mantis',WORLD.w*.58,485,19401));
 world.fish.push(makeFish('kraken',WORLD.w*.53,4015,19402));
 // Mission-critical species are guaranteed so a contract can never become impossible because of random generation.
 world.fish.push(makeFish('blue',WORLD.w*.34,220,8101));
 world.fish.push(makeFish('orange',WORLD.w*.39,250,8102));
 world.fish.push(makeFish('pink',WORLD.w*.765,590,8103));
 world.fish.push(makeFish('long',WORLD.w*.43,1180,8104));
 world.fish.push(makeFish('giant',WORLD.w*.74,3920,9921));
 world.fish.push(makeFish('giant',WORLD.w*.31,4010,9922));
 for(const z of ZONES){
   const pool=zonePlantPool(z.id,false),count=z.id==='reef'?110:z.id==='kelp'?145:z.id==='ruins'?72:z.id==='wreck'?62:50;
   for(let i=0;i<count;i++){
     const y=rnd(z.y0+24,z.y1-28),x=rnd(80,WORLD.w-80),type=pool[Math.floor(r()*pool.length)];
     world.decor.push({x,y,type,scale:z.id==='kelp'?rnd(.9,1.7):rnd(.65,1.3),flip:r()>.5,zone:z.id});
   }
 }
 world.props.push({id:'statue',x:WORLD.w*.34,y:1810,type:'statue',done:false},{id:'arch',x:WORLD.w*.67,y:2050,type:'arch',done:false});
 world.pickups.push({id:'relic',name:'고대 표식판',x:3950,y:2250,value:850,taken:false,weight:2});
 world.pickups.push({id:'recorder',name:'항해기록 장치',x:WORLD.w*.72,y:3030,value:1600,taken:false,weight:3.5});
 for(let i=0;i<17;i++)world.mines.push({x:WORLD.w*.34+i*165+(i%2?65:-45),y:2670+(i%4)*105,size:i%4===0?'B':i%3===0?'S':'N',dead:false,fuse:0,marked:0});
 for(let i=0;i<52;i++)world.bubbles.push({x:rnd(0,WORLD.w),y:rnd(80,WORLD.h),s:rnd(1,3),speed:rnd(10,25)});
 state='playing';document.body.classList.add('playing');document.body.classList.toggle('cameraMode',true);
 ['startScreen','contractScreen','shopScreen','codexScreen','resultScreen'].forEach(id=>$(id)?.classList.add('hidden'));
 resetInputs();setTool('camera');showZone(zoneForY(world.player.y));showHint('게·성게·불가사리·해파리·앵무조개·오징어·대형 생물까지 생태계가 확장되었습니다. 소나에는 희귀종과 보스급 생물도 잡힙니다.',4200);
}

function screenPos(x,y){return{x:x-world.camera.x+view.w/2,y:y-world.camera.y+view.h/2}}
function sheetFrame(im,frames,t){if(!im||!im.complete)return null;const fh=im.naturalHeight,fw=Math.floor(im.naturalWidth/frames),frame=Math.floor(t*8)%frames;return{sx:frame*fw,sy:0,sw:fw,sh:fh}}
function drawImg(im,x,y,w,h,flip=false,rot=0,alpha=1,filter='none'){if(!im||!im.complete||!im.naturalWidth)return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(flip?-1:1,1);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.filter=filter;ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}
function drawSheet(im,x,y,frames,w,h,flip=false,alpha=1){if(!im||!im.complete)return;const f=sheetFrame(im,frames,world.time);if(!f)return;ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;ctx.drawImage(im,f.sx,f.sy,f.sw,f.sh,-w/2,-h/2,w,h);ctx.restore()}
function drawSequence(keys,x,y,w,h,flip=false,alpha=1,fps=8,phase=0){const idx=Math.floor((world.time+phase)*fps)%keys.length,im=imgs[keys[idx]];drawImg(im,x,y,w,h,flip,0,alpha)}
function creatureDrawSize(sp,f){const d=sp.draw||[52,33];return[d[0]*f.scale,d[1]*f.scale]}

function renderBackground(){
 const z=zoneForY(world.player.y),grad=ctx.createLinearGradient(0,0,0,view.h);grad.addColorStop(0,z.bg0);grad.addColorStop(1,z.bg1);ctx.fillStyle=grad;ctx.fillRect(0,0,view.w,view.h);
 if(imgs.bg.complete){const sc=Math.max(view.w/288,view.h/256)*1.12,iw=288*sc,ih=256*sc,off=(-world.camera.x*.06)%iw;ctx.save();ctx.globalAlpha=z.id==='abyss'?.06:z.id==='wreck'?.10:.16;for(let x=off-iw;x<view.w+iw;x+=iw)ctx.drawImage(imgs.bg,x,view.h-ih,iw,ih);ctx.restore()}
 if(imgs.mid.complete){const sc=Math.max(view.w/960,view.h/512)*1.02,iw=960*sc,ih=512*sc,off=(-world.camera.x*.13)%iw;ctx.save();ctx.globalAlpha=z.id==='reef'?.15:z.id==='kelp'?.09:.06;ctx.drawImage(imgs.mid,off-iw,view.h-ih,iw,ih);ctx.drawImage(imgs.mid,off,view.h-ih,iw,ih);ctx.drawImage(imgs.mid,off+iw,view.h-ih,iw,ih);ctx.restore()}

 ctx.save();
 if(z.id==='reef'){
   ctx.globalCompositeOperation='screen';ctx.globalAlpha=.24;
   for(let i=0;i<8;i++){const x=(i+.35)*view.w/8+Math.sin(world.time*.35+i)*28;ctx.fillStyle='rgba(232,255,211,.28)';ctx.beginPath();ctx.moveTo(x-18,0);ctx.lineTo(x+18,0);ctx.lineTo(x+115,view.h);ctx.lineTo(x-95,view.h);ctx.closePath();ctx.fill()}
   for(let i=0;i<16;i++){const x=(i*173-world.camera.x*.18)%Math.max(1,view.w+180)-60,y=(i*91+world.time*9)%Math.max(1,view.h);ctx.fillStyle=i%2?'rgba(255,208,111,.22)':'rgba(255,139,191,.16)';ctx.beginPath();ctx.arc(x,y,2+(i%3),0,Math.PI*2);ctx.fill()}
 }else if(z.id==='kelp'){
   ctx.fillStyle='rgba(18,104,72,.16)';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<13;i++){const x=((i*211-world.camera.x*.22)%(view.w+260))-90,h=view.h*(.45+(i%5)*.08),w=18+(i%4)*7;ctx.strokeStyle='rgba(22,95,63,.32)';ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,view.h+30);ctx.bezierCurveTo(x+Math.sin(world.time*.45+i)*28,view.h-h*.62,x-30,h*.45,x+Math.sin(world.time*.35+i)*16,view.h-h);ctx.stroke()}
 }else if(z.id==='ruins'){
   ctx.fillStyle='rgba(91,101,93,.12)';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<7;i++){const x=((i*310-world.camera.x*.10)%(view.w+420))-120,base=view.h*.88,h=120+(i%3)*70;ctx.fillStyle='rgba(26,50,58,.24)';ctx.fillRect(x,base-h,24,h);ctx.fillRect(x-22,base-h-10,68,12);if(i%2===0){ctx.strokeStyle='rgba(33,57,63,.22)';ctx.lineWidth=18;ctx.beginPath();ctx.arc(x+92,base-h+62,62,Math.PI,0);ctx.stroke()}}
   for(let i=0;i<22;i++){const x=(i*137+world.time*5)%Math.max(1,view.w),y=(i*71+world.time*11)%Math.max(1,view.h);ctx.fillStyle='rgba(205,211,186,.09)';ctx.fillRect(x,y,2,2)}
 }else if(z.id==='wreck'){
   ctx.fillStyle='rgba(81,54,42,.13)';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<26;i++){const x=(i*157-world.camera.x*.08+world.time*7)%(view.w+100)-50,y=(i*83+world.time*18)%(view.h+80)-40;ctx.fillStyle='rgba(187,147,111,'+(.05+(i%4)*.015)+')';ctx.beginPath();ctx.arc(x,y,1.5+(i%3),0,Math.PI*2);ctx.fill()}
   ctx.strokeStyle='rgba(62,37,31,.22)';ctx.lineWidth=5;for(let i=0;i<5;i++){const x=((i*390-world.camera.x*.16)%(view.w+300))-80;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+90,view.h);ctx.stroke()}
 }else{
   ctx.fillStyle='rgba(0,3,14,.38)';ctx.fillRect(0,0,view.w,view.h);
   for(let i=0;i<32;i++){const x=(i*113+Math.sin(i*9)*41-world.camera.x*.05)%(view.w+120)-60,y=(i*79+world.time*(4+i%3))%(view.h+90)-40;ctx.fillStyle=i%4===0?'rgba(152,106,255,.30)':'rgba(91,237,255,.24)';ctx.beginPath();ctx.arc(x,y,1.4+(i%4)*.55,0,Math.PI*2);ctx.fill()}
   const pp=screenPos(world.player.x,world.player.y),spot=ctx.createRadialGradient(pp.x,pp.y,80,pp.x,pp.y,Math.max(view.w,view.h)*.65);spot.addColorStop(0,'rgba(0,0,0,0)');spot.addColorStop(.38,'rgba(0,0,0,.08)');spot.addColorStop(1,'rgba(0,2,10,.78)');ctx.fillStyle=spot;ctx.fillRect(0,0,view.w,view.h)
 }
 ctx.restore()
}
function drawSurface(){const y=screenPos(0,WORLD.surface).y;if(y>-60&&y<view.h+60){ctx.fillStyle='rgba(211,251,255,.18)';ctx.fillRect(0,y-8,view.w,16);ctx.strokeStyle='rgba(220,255,255,.7)';ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<=view.w;x+=18){const yy=y+Math.sin(world.time*2+x*.035)*3;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.stroke()}}
function solidPalette(zone){return zone==='reef'?['#a08d66','#5d6652']:zone==='kelp'?['#3d7357','#183f3a']:zone==='ruins'?['#6f7168','#303f43']:zone==='wreck'?['#654b43','#292f36']:['#30354e','#111624']}
function drawZoneTerrainDetail(s,p){
 if(s.shape!=='rect')return;
 ctx.save();
 if(s.zone==='reef'){
  ctx.strokeStyle='rgba(241,210,129,.72)';ctx.lineWidth=6;ctx.beginPath();
  for(let x=0;x<=s.w;x+=18){const yy=p.y+Math.sin((x+s.x)*.035)*5;if(x===0)ctx.moveTo(p.x+x,yy);else ctx.lineTo(p.x+x,yy)}ctx.stroke();
  for(let x=55;x<s.w-30;x+=110){ctx.fillStyle=x%220<100?'rgba(255,145,153,.58)':'rgba(245,172,87,.62)';ctx.beginPath();ctx.arc(p.x+x,p.y-5,7,0,Math.PI*2);ctx.fill()}
 }else if(s.zone==='kelp'){
  ctx.fillStyle='rgba(21,71,50,.58)';ctx.fillRect(p.x,p.y-5,s.w,12);
  ctx.strokeStyle='rgba(50,151,85,.58)';ctx.lineWidth=5;for(let x=28;x<s.w;x+=48){ctx.beginPath();ctx.moveTo(p.x+x,p.y+2);ctx.quadraticCurveTo(p.x+x+Math.sin(world.time*.8+x)*9,p.y-25,p.x+x+4,p.y-48-(x%3)*8);ctx.stroke()}
 }else if(s.zone==='ruins'){
  ctx.strokeStyle='rgba(184,178,145,.28)';ctx.lineWidth=2;
  for(let y=18;y<s.h;y+=34){ctx.beginPath();ctx.moveTo(p.x+5,p.y+y);ctx.lineTo(p.x+s.w-5,p.y+y);ctx.stroke()}
  for(let x=36;x<s.w;x+=70){ctx.beginPath();ctx.moveTo(p.x+x,p.y+4);ctx.lineTo(p.x+x-8,p.y+s.h-6);ctx.stroke()}
  ctx.fillStyle='rgba(204,190,139,.22)';ctx.fillRect(p.x,p.y-4,s.w,8)
 }else if(s.zone==='wreck'){
  ctx.fillStyle='rgba(117,65,49,.42)';ctx.fillRect(p.x,p.y-5,s.w,10);
  ctx.strokeStyle='rgba(195,112,74,.28)';ctx.lineWidth=3;
  for(let x=20;x<s.w;x+=58){ctx.beginPath();ctx.moveTo(p.x+x,p.y+8);ctx.lineTo(p.x+x+28,p.y+s.h-10);ctx.stroke();ctx.fillStyle='rgba(214,157,113,.44)';ctx.beginPath();ctx.arc(p.x+x,p.y+8,3,0,Math.PI*2);ctx.fill()}
 }else{
  ctx.fillStyle='rgba(4,7,18,.72)';ctx.beginPath();ctx.moveTo(p.x,p.y+9);
  for(let x=0;x<=s.w;x+=24){const yy=p.y-6-((Math.floor((x+s.x)/24)%3)*9);ctx.lineTo(p.x+x,yy)}
  ctx.lineTo(p.x+s.w,p.y+18);ctx.lineTo(p.x,p.y+18);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(80,143,178,.18)';ctx.lineWidth=2;for(let x=35;x<s.w;x+=82){ctx.beginPath();ctx.moveTo(p.x+x,p.y+18);ctx.lineTo(p.x+x-16,p.y+s.h*.55);ctx.stroke()}
 }
 ctx.restore()
}
function terrainTopOffset(s,x){
  return Math.sin((s.x+x)*.031+s.y*.013)*7+Math.sin((s.x+x)*.083+s.y*.007)*3;
}
function drawTerrain(){
  for(const s of world.terrain){
    const p=screenPos(s.x,s.y),pal=solidPalette(s.zone);
    ctx.save();ctx.globalAlpha=.98;
    if(s.shape==='rect'){
      if(p.x>view.w+180||p.x+s.w<-180||p.y>view.h+180||p.y+s.h<-180){ctx.restore();continue}
      const g=ctx.createLinearGradient(0,p.y,0,p.y+s.h);g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(p.x,p.y+s.h);ctx.lineTo(p.x+s.w,p.y+s.h);
      for(let x=s.w;x>=0;x-=24)ctx.lineTo(p.x+x,p.y+terrainTopOffset(s,x));
      ctx.closePath();ctx.fill();
      const tile=imgs[s.edge==='sand'?'sand':'dirt'];
      if(tile&&tile.complete){
        const tw=38,th=28;ctx.globalAlpha=.83;
        for(let x=8;x<s.w-8;x+=34){
          const yy=terrainTopOffset(s,x)-8,rot=Math.sin((s.x+x)*.091)*.08;
          ctx.save();ctx.translate(p.x+x+tw/2,p.y+yy+th/2);ctx.rotate(rot);ctx.drawImage(tile,-tw/2,-th/2,tw,th);ctx.restore();
        }
      }
      ctx.globalAlpha=.26;ctx.fillStyle='#061a22';ctx.fillRect(p.x+8,p.y+s.h-18,Math.max(0,s.w-16),12);
      ctx.globalAlpha=1;drawZoneTerrainDetail(s,p);
    }else{
      if(p.x+s.r<-120||p.x-s.r>view.w+120||p.y+s.r<-120||p.y-s.r>view.h+120){ctx.restore();continue}
      const g=ctx.createRadialGradient(p.x-s.r*.28,p.y-s.r*.32,8,p.x,p.y,s.r*1.15);g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);ctx.fillStyle=g;
      ctx.beginPath();const pts=14;
      for(let i=0;i<pts;i++){
        const a=i/pts*Math.PI*2,wobble=.80+.13*Math.sin(i*2.17+s.x*.014)+.07*Math.sin(i*4.31+s.y*.009),rr=s.r*wobble,x=p.x+Math.cos(a)*rr,y=p.y+Math.sin(a)*rr;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();ctx.fill();
      const rock1=imgs.rockA,rock2=imgs.rockB;
      if(rock1?.complete||rock2?.complete){
        const parts=[[-.28,-.15,.78,false],[.22,.06,.88,true],[-.04,.28,.70,false]];
        for(let i=0;i<parts.length;i++){const [ox,oy,sc,flip]=parts[i],im=i===1?rock2:rock1;drawImg(im,p.x+s.r*ox,p.y+s.r*oy,s.r*sc,s.r*sc,flip,(i-1)*.16,.38)}
      }
      ctx.strokeStyle='rgba(215,236,228,.10)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x-s.r*.16,p.y-s.r*.18,s.r*.46,.9,3.9);ctx.stroke();
    }
    ctx.restore();
  }
}
function drawZoneLandmarks(){
 const onScreen=(p,m=240)=>p.x>-m&&p.x<view.w+m&&p.y>-m&&p.y<view.h+m;
 const clusters=[[420,270,'seaweedOrangeA',1.8],[1280,420,'seaweedPinkC',1.7],[2380,300,'seaweedGreenB',2.0],[3460,560,'seaweedOrangeB',1.9],[4760,370,'seaweedPinkB',1.8],[6120,540,'seaweedOrangeA',2.0]];
 for(const [x,y,t,sc] of clusters){const p=screenPos(x,y);if(onScreen(p))drawImg(imgs[t],p.x,p.y,72*sc,88*sc,false,Math.sin(world.time*.7+x)*.025,.92)}
 const stalks=[[360,920,3.0],[930,1180,4.0],[1860,880,3.8],[2640,1320,4.3],[3550,970,3.5],[4520,1280,4.1],[5480,900,3.9],[6350,1320,4.4]];
 for(let i=0;i<stalks.length;i++){const [x,y,sc]=stalks[i],p=screenPos(x,y),t=i%3===0?'seaweedGreenC':i%2?'seaweedA':'seaweedGreenB';if(onScreen(p,320))drawImg(imgs[t],p.x,p.y,72*sc,115*sc,i%2===0,Math.sin(world.time*.55+i)*.04,.86)}
 const ruins=[[520,1730,180],[1320,2060,150],[2460,1760,210],[3420,2200,165],[4580,1880,220],[5700,2120,175],[6420,1700,150]];
 ctx.save();for(const [x,y,h] of ruins){const p=screenPos(x,y);if(!onScreen(p,220))continue;ctx.fillStyle='rgba(44,57,59,.80)';ctx.fillRect(p.x-17,p.y-h,34,h);ctx.fillStyle='rgba(116,118,105,.72)';ctx.fillRect(p.x-29,p.y-h-10,58,13);ctx.fillRect(p.x-25,p.y-8,50,10);ctx.strokeStyle='rgba(156,151,123,.42)';ctx.lineWidth=3;ctx.strokeRect(p.x-17,p.y-h,34,h)}ctx.restore();
 const debris=[[760,2550,'wood1',1.0,-.25],[1480,2860,'wood2',1.2,.34],[2720,2460,'wood1',.9,.42],[3680,3010,'wood2',1.1,-.31],[4860,2680,'wood1',1.0,.18],[6040,3090,'wood2',1.2,-.22]];
 for(const [x,y,t,sc,rot] of debris){const p=screenPos(x,y);if(onScreen(p))drawImg(imgs[t],p.x,p.y,55*sc,38*sc,false,rot,.72,'brightness(.62) saturate(.65)')}
 ctx.save();for(let vi=0;vi<VENTS.length;vi++){const [x,y,sc]=VENTS[vi],p=screenPos(x,y);if(!onScreen(p,260))continue;ctx.fillStyle='#182132';ctx.beginPath();ctx.moveTo(p.x-34*sc,p.y);ctx.lineTo(p.x-12*sc,p.y-95*sc);ctx.lineTo(p.x+14*sc,p.y-88*sc);ctx.lineTo(p.x+38*sc,p.y);ctx.closePath();ctx.fill();for(let k=0;k<6;k++){const yy=p.y-105*sc-((world.time*22+k*31+vi*17)%150)*sc,xx=p.x+Math.sin(world.time*1.2+k)*12*sc;ctx.fillStyle=k%2?'rgba(120,105,255,.25)':'rgba(86,231,255,.34)';ctx.beginPath();ctx.arc(xx,yy,3+(k%3),0,Math.PI*2);ctx.fill()}}ctx.restore()
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
 const p=screenPos(WORLD.w*.72,2980);if(p.x<-300||p.x>view.w+300||p.y<-240||p.y>view.h+240)return;drawImg(imgs.wreck,p.x,p.y,260,150,false,.17,.42,'brightness(.52) saturate(.65)');drawImg(imgs.wood1,p.x-115,p.y+48,42,34,false,.3,.65,'brightness(.55)');drawImg(imgs.wood2,p.x+126,p.y+56,38,30,true,-.2,.65,'brightness(.55)')}
function drawPickups(){
 for(const q of world.pickups){if(q.taken)continue;const p=screenPos(q.x,q.y);if(p.x<-50||p.x>view.w+50||p.y<-50||p.y>view.h+50)continue;ctx.save();ctx.shadowColor=q.id==='relic'?'#f1d86b':'#6beafa';ctx.shadowBlur=12;ctx.fillStyle=q.id==='relic'?'#cfb85a':'#61dbe7';ctx.fillRect(p.x-13,p.y-9,26,18);ctx.shadowBlur=0;if(world.sonar>0){ctx.strokeStyle='#75f4ff';ctx.lineWidth=2;ctx.strokeRect(p.x-19,p.y-15,38,30)}ctx.restore()}
}
function drawFish(f){
 if(!f.alive)return;const sp=SPECIES[f.key],p=screenPos(f.x,f.y);if(p.x<-280||p.x>view.w+280||p.y<-220||p.y>view.h+220)return;const flip=f.vx<0;
 const camo=f.hidden&&world.sonar<=0,alpha=camo?.20:(f.key==='giant'||sp.motion==='boss'?.98:.92),[dw,dh]=creatureDrawSize(sp,f);
 if(f.key==='crab')drawSequence(['crab1','crab2'],p.x,p.y,dw,dh,flip,alpha,5,f.phase);
 else if(f.key==='jelly'){const attacking=f.alert>0||f.contactCd>0;drawSequence(attacking?JELLY_ATTACK_KEYS:JELLY_SWIM_KEYS,p.x,p.y,dw,dh,false,alpha,9,f.phase)}
 else if(f.key==='squid')drawSheet(imgs.squid,p.x,p.y,2,dw,dh,flip,alpha);
 else if(sp.animated)drawSheet(imgs[sp.img],p.x,p.y,sp.frames,sp.fw*1.75*f.scale,sp.fh*1.75*f.scale,flip,alpha);
 else drawImg(imgs[sp.img],p.x,p.y,dw,dh,flip,0,camo?.22:.9);
 if(camo){ctx.save();ctx.strokeStyle='rgba(113,235,188,.18)';ctx.setLineDash([4,7]);ctx.beginPath();ctx.arc(p.x,p.y,24+f.scale*8,0,Math.PI*2);ctx.stroke();ctx.restore()}
 if(f.attackMode==='windup'){
   const prof=ATTACK_PROFILE[f.key]||ATTACK_PROFILE.brown,t=clamp(f.attackT/Math.max(.01,prof.windup),0,1),r=30+f.scale*12+(1-t)*18;
   ctx.save();ctx.strokeStyle=f.key==='giant'?'rgba(255,82,58,.95)':f.key==='angler'?'rgba(130,245,255,.9)':'rgba(255,190,78,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();
   const pp=screenPos(world.player.x,world.player.y);ctx.globalAlpha=.34;ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(pp.x,pp.y);ctx.stroke();ctx.restore();
 }else if(f.attackMode==='lunge'){
   ctx.save();ctx.strokeStyle=f.key==='giant'?'rgba(255,102,70,.75)':'rgba(255,224,148,.58)';ctx.lineWidth=f.key==='giant'?8:4;ctx.globalAlpha=.72;ctx.beginPath();ctx.moveTo(p.x-f.vx*.16,p.y-f.vy*.16);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();
 }else if(f.alert>0&&HOSTILE_BEHAVIORS.has(sp.behavior)){ctx.strokeStyle=sp.behavior==='predator'?'rgba(255,92,72,.62)':'rgba(255,180,92,.48)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,28+f.scale*12+Math.sin(world.time*7)*3,0,Math.PI*2);ctx.stroke()}
 if(world.sonar>0&&(sp.rare||f.marked>0)){ctx.strokeStyle=(sp.motion==='boss'||sp===SPECIES.giant)?'#ff987d':'#73f2ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,34+Math.sin(world.time*5)*4+(sp.motion==='boss'?24:0),0,Math.PI*2);ctx.stroke()}
 if(sp.motion==='boss'&&f.alive){ctx.save();ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(255,235,206,.92)';ctx.fillText('대형 개체 · '+sp.name,p.x,p.y-dh*.55-10);ctx.restore()}
}
function drawMine(m){if(m.dead)return;const p=screenPos(m.x,m.y);if(p.x<-70||p.x>view.w+70||p.y<-70||p.y>view.h+70)return;const im=imgs[m.size==='B'?'mineB':m.size==='S'?'mineS':'mine'],s=m.size==='B'?60:m.size==='S'?38:50;drawImg(im,p.x,p.y,s,s,false,0,.9);if(world.sonar>0||m.fuse>0){ctx.strokeStyle=m.fuse>0?'#ff7465':'#6df4ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,s*.7+Math.sin(world.time*8)*4,0,Math.PI*2);ctx.stroke()}}
function sonarGuideTargets(){
 if(!world)return[];const p=world.player,out=[];
 if(missionComplete())out.push({x:p.x,y:WORLD.surface,label:'수면 귀환',kind:'return'});
 for(const f of world.fish)if(f.alive&&SPECIES[f.key].rare){const sp=SPECIES[f.key],hostile=['territorial','ambush','predator'].includes(sp.behavior);out.push({x:f.x,y:f.y,label:sp.name,kind:hostile?'danger':'life'})}
 for(const q of world.pickups)if(!q.taken)out.push({x:q.x,y:q.y,label:q.name,kind:'objective'});
 for(const o of world.props)if(!o.done)out.push({x:o.x,y:o.y,label:o.id==='statue'?'침수 석상':'석조 아치',kind:'objective'});
 for(const m of world.mines)if(!m.dead)out.push({x:m.x,y:m.y,label:'기뢰',kind:'danger'});
 return out.map(t=>({...t,d:Math.hypot(t.x-p.x,t.y-p.y)})).sort((a,b)=>a.d-b.d).slice(0,7)
}
function drawSonarGuides(){
 if(!world||world.sonar<=0)return;const cx=view.w/2,cy=view.h/2,mx=46,my=86;
 ctx.save();ctx.font='700 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
 for(const t of sonarGuideTargets()){
  const s=screenPos(t.x,t.y);if(s.x>32&&s.x<view.w-32&&s.y>72&&s.y<view.h-46)continue;
  const dx=s.x-cx,dy=s.y-cy;if(Math.abs(dx)<1&&Math.abs(dy)<1)continue;
  const sx=(cx-mx)/Math.max(Math.abs(dx),.001),sy=(cy-my)/Math.max(Math.abs(dy),.001),k=Math.min(sx,sy);
  const x=cx+dx*k,y=cy+dy*k,a=Math.atan2(dy,dx),col=t.kind==='danger'?'#ff856f':t.kind==='return'?'#ffe071':'#73f2ff';
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-8,-7);ctx.lineTo(-5,0);ctx.lineTo(-8,7);ctx.closePath();ctx.fill();ctx.restore();
  const dist=Math.max(1,Math.round(t.d/WORLD.scaleDepth));ctx.fillStyle='rgba(0,17,27,.76)';ctx.fillRect(x-38,y+12,76,17);ctx.fillStyle=col;ctx.fillText(t.label+' '+dist+'m',x,y+21);
 }
 ctx.restore()
}
function drawTether(){
 const t=world.tether;if(!t?.fish?.alive)return;const a=screenPos(world.player.x,world.player.y),b=screenPos(t.fish.x,t.fish.y);
 ctx.save();ctx.strokeStyle=t.tension>1?'#ff8e77':t.tension>.86?'#ffd66d':'#d8eef3';ctx.lineWidth=2+(t.reelPulse>0?1.5:0);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 ctx.fillStyle='rgba(0,18,28,.82)';ctx.fillRect((a.x+b.x)/2-34,(a.y+b.y)/2-12,68,16);ctx.fillStyle='#dffaff';ctx.font='800 9px system-ui';ctx.textAlign='center';ctx.fillText('릴 '+Math.round(t.progress*100)+'%',(a.x+b.x)/2,(a.y+b.y)/2);ctx.restore()
}
function drawShots(){for(const s of world.shots){const p=screenPos(s.x,s.y);ctx.strokeStyle='#d8eef3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-s.vx*.045,p.y-s.vy*.045);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle='#f7f1d2';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill()}}
function drawEffects(){for(const e of world.effects){const p=screenPos(e.x,e.y);if(e.type==='boom'){const im=e.big?imgs.explosionB:imgs.explosion,frames=10,fh=im.naturalHeight||82,fw=Math.floor((im.naturalWidth||660)/frames),fr=Math.min(frames-1,Math.floor(e.t/.075));ctx.save();ctx.globalAlpha=clamp(1-e.t/.8,0,1);ctx.imageSmoothingEnabled=false;if(im.complete)ctx.drawImage(im,fr*fw,0,fw,fh,p.x-45,p.y-45,90,90);ctx.restore()}else if(e.type==='spark'){ctx.save();ctx.globalAlpha=clamp(1-e.t/.35,0,1);ctx.strokeStyle='#d9f7ff';ctx.lineWidth=2;for(let i=0;i<5;i++){const a=i/5*Math.PI*2+e.t*3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(a)*(8+e.t*22),p.y+Math.sin(a)*(8+e.t*22));ctx.stroke()}ctx.restore()}else if(e.type==='wake'){ctx.save();ctx.globalAlpha=clamp(1-e.t/.65,0,1);ctx.strokeStyle=e.big?'rgba(255,143,110,.7)':'rgba(160,238,255,.62)';ctx.lineWidth=e.big?5:3;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(p.x,p.y,(18+i*13)+e.t*(e.big?115:70),0,Math.PI*2);ctx.stroke()}ctx.restore()}else{ctx.fillStyle='rgba(125,238,249,'+clamp(1-e.t/.6,0,1)+')';ctx.beginPath();ctx.arc(p.x,p.y,10+e.t*30,0,Math.PI*2);ctx.strokeStyle='#7eeef7';ctx.stroke()}}}
function playerAnim(){const p=world.player,speed=Math.hypot(p.vx,p.vy);if(p.inv>0)return{img:imgs.playerHurt};if(world.player.dashTime>0)return{img:imgs.playerRush};if(speed<18)return{img:imgs.playerIdle};if(speed>world.st.speed*.78)return{img:imgs.playerFast};return{img:imgs.playerSwim}}
function drawPlayer(){
 const p=screenPos(world.player.x,world.player.y),a=playerAnim(),im=a.img;if(!im||!im.complete)return;const frames=Math.max(1,Math.round(im.naturalWidth/im.naturalHeight)),f=sheetFrame(im,frames,world.time);const size=64;ctx.save();ctx.translate(p.x,p.y);ctx.scale(world.player.face<0?-1:1,1);if(world.player.inv>0)ctx.globalAlpha=.55+.35*Math.sin(world.time*25);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,f.sx,0,f.sw,f.sh,-size/2,-size/2,size,size);ctx.restore();
 for(let i=0;i<2;i++){ctx.fillStyle='rgba(210,249,255,.45)';ctx.beginPath();ctx.arc(p.x-world.player.face*26+i*5,p.y-12-i*6,2+i*.6,0,Math.PI*2);ctx.fill()}
}
function drawBubbles(){
 ctx.save();for(const b of world.bubbles){const p=screenPos(b.x,b.y);if(p.x<0||p.x>view.w||p.y<0||p.y>view.h)continue;ctx.strokeStyle='rgba(213,250,255,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,b.s,0,Math.PI*2);ctx.stroke()}ctx.restore()
}
function drawBiomeBoundaries(){
 const bands=[720,1500,2350,3250];
 ctx.save();
 for(let i=0;i<bands.length;i++){
   const y=screenPos(0,bands[i]).y;if(y<-100||y>view.h+100)continue;
   const g=ctx.createLinearGradient(0,y-54,0,y+54);g.addColorStop(0,'rgba(170,245,255,0)');g.addColorStop(.48,'rgba(170,245,255,.09)');g.addColorStop(.52,'rgba(22,64,77,.22)');g.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=g;ctx.fillRect(0,y-54,view.w,108);
   ctx.strokeStyle='rgba(185,244,255,.16)';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<=view.w;x+=20){const yy=y+Math.sin(world.time*1.4+x*.028+i)*5;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.stroke();
 }
 ctx.restore()
}
function drawDangerFX(){
 const z=zoneForY(world.player.y),rule=ZONE_RULES[z.id]||ZONE_RULES.reef;
 if(rule.visibility<.98){ctx.save();ctx.fillStyle='rgba(0,7,14,'+((1-rule.visibility)*.34)+')';ctx.fillRect(0,0,view.w,view.h);ctx.restore()}
 if(world.zoneFlash>0){ctx.save();ctx.globalAlpha=world.zoneFlash*.13;ctx.fillStyle=z.accent;ctx.fillRect(0,0,view.w,view.h);ctx.restore()}
 if(world.envPulse>0){ctx.save();const g=ctx.createRadialGradient(view.w/2,view.h/2,view.h*.2,view.w/2,view.h/2,Math.max(view.w,view.h)*.7);g.addColorStop(0,'rgba(255,90,70,0)');g.addColorStop(1,'rgba(255,70,55,'+(world.envPulse*.16)+')');ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);ctx.restore()}
 if(world.lightJam>0){ctx.save();const a=clamp(world.lightJam*.22,0,.38),g=ctx.createRadialGradient(view.w/2,view.h/2,55,view.w/2,view.h/2,Math.max(view.w,view.h)*.62);g.addColorStop(0,'rgba(0,8,18,'+(a*.18)+')');g.addColorStop(.48,'rgba(0,6,16,'+(a*.55)+')');g.addColorStop(1,'rgba(0,0,8,'+a+')');ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);ctx.restore()}
 if(world.currentBurst>0){ctx.save();ctx.globalAlpha=clamp(world.currentBurst*.28,0,.22);ctx.strokeStyle='#b8f6ff';ctx.lineWidth=2;for(let y=90;y<view.h;y+=70){const off=(world.time*210+y*1.7)%180;ctx.beginPath();ctx.moveTo(-40+off,y);ctx.lineTo(120+off,y-18);ctx.stroke()}ctx.restore()}
}
function render(){
 if(!world)return;ctx.clearRect(0,0,view.w,view.h);renderBackground();drawSurface();drawBiomeBoundaries();drawZoneLandmarks();drawTerrain();drawDecor();drawProps();drawWreck();drawPickups();for(const f of world.fish)drawFish(f);for(const m of world.mines)drawMine(m);drawSonarGuides();drawTether();drawShots();drawEffects();drawBubbles();drawPlayer();drawForeground();drawDangerFX();updateHud();updatePhotoLabel()
}
function updatePhotoLabel(){
 if(!world||world.tool!=='camera'){$('photoLabel').textContent='';return}
 const t=findCameraTarget();$('photoLabel').textContent=t?SPECIES[t.key].name+' · 예상 '+photoGrade(t)+'등급':'생물을 촬영 프레임 안에 넣으세요'
}
function currentContract(){return world?.contract}
function missionText(){
 if(!world)return'';const m=world.mission,id=world.contract.id;
 if(id==='reef')return'B+ 촬영 '+['blue','orange','pink'].filter(k=>gradeAtLeast(m.photoGrades[k],'B')).length+'/3 · 산호 미로 '+(m.visited.reefMaze?'통과':'미탐사')+' · 수면 귀환';
 if(id==='kelp')return'긴꼬리어 A+ '+(gradeAtLeast(m.photoGrades.long,'A')?(m.photoGrades.long+'등급'):'미달')+' · 표본 '+m.samples+'/2 · 조류 협곡 '+(m.visited.currentCut?'통과':'미탐사');
 if(id==='ruins')return'유적 '+(m.statue?1:0)+(m.arch?1:0)+'/2 · 표식판 '+(m.relic?'회수':'미회수');
 if(id==='wreck')return'항해기록 장치 '+(m.recorder?'회수':'미회수')+' · 기뢰 주의';
 return'600m '+(m.deep?'도달':'미도달')+' · 심해 상어 '+(m.giantGrade?m.giantGrade:'미촬영');
}
function missionComplete(){
 const m=world.mission,id=world.contract.id;
 if(id==='reef')return !!(['blue','orange','pink'].every(k=>gradeAtLeast(m.photoGrades[k],'B'))&&m.visited.reefMaze);
 if(id==='kelp')return !!(gradeAtLeast(m.photoGrades.long,'A')&&m.samples>=2&&m.visited.currentCut);
 if(id==='ruins')return !!(m.statue&&m.arch&&m.relic);
 if(id==='wreck')return !!m.recorder;
 return !!(m.deep&&['A','S'].includes(m.giantGrade));
}
function updateHud(){
 const p=world.player,ox=clamp(p.oxygen/world.st.oxygen*100,0,100),hp=clamp(p.hp,0,100),dep=depthOf(p.y),reserve=oxygenReserveStatus();
 $('o2Text').textContent=Math.round(ox)+'%';$('o2Fill').style.width=ox+'%';$('hpText').textContent=Math.round(hp);$('hpFill').style.width=hp+'%';$('depthText').textContent=Math.round(dep)+'m';const z=zoneForY(p.y),pressure=world.pressureOver>0?' · 압력+'+Math.round(world.pressureOver)+'m':'';
 $('zoneText').textContent=z.name+' · '+(ZONE_RULES[z.id]?.danger||'')+pressure;
 $('missionName').textContent=world.contract.title;$('missionText').textContent=missionText();$('bagText').textContent=world.bagWeight.toFixed(1)+' / '+world.st.bag+'kg';$('moneyText').textContent=money(world.income);$('sonarText').textContent=world.sonarCd>0?'SONAR '+world.sonarCd.toFixed(1)+'s':'SONAR READY';
 const rr=$('reserveText');if(rr){rr.textContent=reserve.label;rr.className='reserve-'+reserve.code}
}
function setTool(name){
 if(!world)return;world.tool=name;document.body.classList.toggle('cameraMode',name==='camera');document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===name));
 const labels={camera:'카메라',harpoon:'작살',sonar:'소나'};showHint(labels[name]+' 선택',700)
}
function nearestFrontFish(maxDist){
 const p=world.player,dir=p.face,arr=world.fish.filter(f=>f.alive).map(f=>({f,d:Math.hypot(f.x-p.x,f.y-p.y),front:(f.x-p.x)*dir,vert:Math.abs(f.y-p.y)})).filter(o=>o.front>0&&o.d<maxDist&&o.vert<maxDist*.55).sort((a,b)=>a.d-b.d);return arr[0]?.f||null
}
function photoFrameRect(){
 const el=$('photoFrame'),r=el?.getBoundingClientRect();
 if(!r||!r.width||!r.height)return{left:view.w*.5-95,right:view.w*.5+95,top:view.h*.5-65,bottom:view.h*.5+65,width:190,height:130};
 return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}
}
function findCameraTarget(){
 if(!world)return null;const r=photoFrameRect(),cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2,p=world.player;
 return world.fish.filter(f=>f.alive).map(f=>{const s=screenPos(f.x,f.y),front=(f.x-p.x)*p.face,dx=s.x-cx,dy=s.y-cy;return{f,s,front,score:dx*dx+dy*dy}})
  .filter(o=>o.front>-18&&o.s.x>=r.left&&o.s.x<=r.right&&o.s.y>=r.top&&o.s.y<=r.bottom)
  .sort((a,b)=>a.score-b.score)[0]?.f||null
}
function photoGrade(f){
 const r=photoFrameRect(),s=screenPos(f.x,f.y),cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;
 const nx=Math.abs(s.x-cx)/(r.width*.5),ny=Math.abs(s.y-cy)/(r.height*.5),center=clamp(1-Math.hypot(nx,ny)/1.25,0,1);
 const d=Math.hypot(f.x-world.player.x,f.y-world.player.y),ideal=world.st.camera*.52,range=clamp(1-Math.abs(d-ideal)/Math.max(ideal,1),0,1);
 const q=center*.78+range*.22;return q>.82?'S':q>.64?'A':q>.44?'B':'C'
}
function betterGrade(a,b){if(!a)return b;if(!b)return a;return GRADE_SCORE[b]>GRADE_SCORE[a]?b:a}
function gradeAtLeast(g,min){return !!g&&GRADE_SCORE[g]>=GRADE_SCORE[min]}
function photoValue(f,grade){
 const sp=SPECIES[f.key],depth=depthOf(f.y),base=sp.rare?150:72,depthFactor=1+Math.min(1.15,depth/620*.9);
 return Math.round(base*PHOTO_MULT[grade]*depthFactor)
}
function ratedDepth(){return (CONTRACT_DEPTH_RATING[world?.contract?.unlock||0]||150)+meta.up.suit*22}
function oxygenReserveStatus(){
 if(!world)return{code:'safe',label:'여유',ratio:9,need:0};const p=world.player,vertical=Math.max(0,p.y-WORLD.surface),travel=vertical/Math.max(95,world.st.speed*.74)*1.48;
 const z=zoneForY(p.y),rule=ZONE_RULES[z.id]||ZONE_RULES.reef,pressure=1+Math.min(.8,(world.pressureOver||0)/180*.45),load=1+clamp(world.bagWeight/Math.max(1,world.st.bag),0,1)*.12;
 const need=travel*rule.oxygen*pressure*load+8,ratio=p.oxygen/Math.max(1,need);
 return ratio>1.65?{code:'safe',label:'여유',ratio,need}:ratio>1.08?{code:'warn',label:'주의',ratio,need}:{code:'critical',label:'즉시 상승',ratio,need}
}
function useCamera(){
 const f=findCameraTarget();if(!f){showHint('촬영 대상을 앞쪽 프레임에 맞추세요.',1100);beep(180,.05);return}
 const grade=photoGrade(f),oldDive=world.mission.photoGrades[f.key]||null,newBest=betterGrade(oldDive,grade);
 f.photo=betterGrade(f.photo,grade);world.mission.photos[f.key]=true;world.mission.photoGrades[f.key]=newBest;
 meta.codex[f.key]=meta.codex[f.key]||{best:grade,count:0};meta.codex[f.key].count++;meta.codex[f.key].best=betterGrade(meta.codex[f.key].best,grade);
 const oldValue=oldDive?photoValue(f,oldDive):0,newValue=photoValue(f,newBest),bonus=Math.max(0,newValue-oldValue);
 if(bonus>0){world.income+=bonus;world.photoIncome+=bonus}
 if(f.key==='giant')world.mission.giantGrade=betterGrade(world.mission.giantGrade,grade);
 save();beep(1050,.06);setTimeout(()=>beep(1500,.07),65);world.effects.push({type:'flash',x:f.x,y:f.y,t:0});
 showHint(SPECIES[f.key].name+' · '+grade+'등급 촬영'+(bonus>0?' · 연구 +'+money(bonus):' · 기존 기록 유지'),1350)
}
function reelHarpoon(){
 const t=world.tether;if(!t||!t.fish?.alive){world.tether=null;return}
 t.progress=clamp(t.progress+.13+meta.up.harpoon*.018,0,1);t.reelPulse=.18;
 const f=t.fish,p=world.player,dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy)||1;f.x+=dx/d*(12+meta.up.harpoon*3);f.y+=dy/d*(12+meta.up.harpoon*3);
 beep(430,.035);showHint('릴 감기 · '+Math.round(t.progress*100)+'%',500)
}
function fireHarpoon(){
 const p=world.player;if(world.tether){reelHarpoon();return}if(world.shots.length>2)return;
 const speed=520+meta.up.harpoon*55,ax=p.aimX||p.face||1,ay=p.aimY||0,mag=Math.hypot(ax,ay)||1,ux=ax/mag,uy=ay/mag;
 world.shots.push({x:p.x+ux*24,y:p.y+uy*24,vx:ux*speed,vy:uy*speed,life:world.st.harpoon/speed});beep(330,.04)
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
 const sp=SPECIES[f.key];if(sp.protected){showHint(sp.name+'은 보호 관찰 대상입니다. 촬영하세요.',1200);return false}
 if(world.bagWeight+sp.weight>world.st.bag){showHint('가방 무게가 부족합니다.',900);return false}
 f.alive=false;f.hooked=false;if(world.tether?.fish===f)world.tether=null;world.bagWeight+=sp.weight;world.bag.push(f.key);world.income+=sp.value;world.mission.samples++;beep(650,.06);showHint(sp.name+' 표본 확보 +'+money(sp.value),1000);return true
}
function hookFish(f){
 const sp=SPECIES[f.key];if(sp.protected){showHint(sp.name+'은 보호종입니다. 작살 대신 촬영하세요.',1100);beep(150,.05);return false}
 if(world.bagWeight+sp.weight>world.st.bag){showHint('가방 무게가 부족합니다.',900);return false}
 if(world.tether)return false;f.hooked=true;f.attackMode='';f.specialCd=Math.max(f.specialCd,3);f.panic=2;
 const struggle=1.05+sp.weight*.24+(sp.behavior==='predator'?.42:0);
 world.tether={fish:f,progress:0,tension:0,reelPulse:0,struggle};world.effects.push({type:'wake',x:f.x,y:f.y,t:0,big:false});beep(520,.055);
 showHint(sp.name+' 명중! 작살을 다시 사용해 릴을 감으세요.',1250);return true
}
function updateTether(dt){
 const t=world.tether;if(!t)return;const f=t.fish,p=world.player;if(!f?.alive){world.tether=null;return}
 t.reelPulse=Math.max(0,t.reelPulse-dt);const dx=f.x-p.x,dy=f.y-p.y,d=Math.hypot(dx,dy)||1,maxLine=world.st.harpoon*1.12,ux=dx/d,uy=dy/d;
 const struggleWave=.12+Math.abs(Math.sin(world.time*3.4+f.phase))*.17;t.tension=clamp(d/maxLine+struggleWave,0,1.4);
 if(t.tension>1.16){f.hooked=false;world.tether=null;showHint('작살 줄이 끊어졌습니다! 너무 멀어졌습니다.',1000);beep(110,.08,'sawtooth');return}
 const passive=(.12+meta.up.harpoon*.025)/Math.max(.9,t.struggle);t.progress=clamp(t.progress+dt*passive*(1-clamp(t.tension-.72,0,.65)),0,1);
 f.vx+=ux*(70+f.scale*16)*dt;f.vy+=uy*(55+f.scale*12)*dt;p.vx+=ux*18*dt;p.vy+=uy*18*dt;
 if(t.progress>=1)captureFish(f)
}
function explodeMine(m){
 if(m.dead)return;m.dead=true;world.effects.push({type:'boom',x:m.x,y:m.y,t:0,big:m.size==='B'});const d=Math.hypot(world.player.x-m.x,world.player.y-m.y);if(d<165){const dmg=Math.max(12,Math.round((46-d*.17)*world.st.armor));world.player.hp-=dmg;world.player.inv=1.1;showHint('기뢰 폭발! -'+dmg+' HP',1000);beep(90,.22,'sawtooth')}
 for(const other of world.mines){if(other===m||other.dead)continue;const md=Math.hypot(other.x-m.x,other.y-m.y);if(md<205&&(other.fuse<=0||other.fuse>.24)){other.fuse=.18;other.marked=.4}}
}

function nearestEcoFish(f,maxDist,predicate){
 let best=null,bd=maxDist;
 for(const o of world.fish){if(o===f||!o.alive||!predicate(o))continue;const d=Math.hypot(o.x-f.x,o.y-f.y);if(d<bd){bd=d;best=o}}
 return best?{fish:best,d:bd}:null
}
function nearestKelpCover(f,maxDist=240){
 let best=null,bd=maxDist;
 for(const d of world.decor){if(!d.type?.startsWith('seaweed'))continue;const dd=Math.hypot(d.x-f.x,d.y-f.y);if(dd<bd){bd=dd;best=d}}
 return best?{cover:best,d:bd}:null
}
function startFishAttack(f,kind){
 const prof=ATTACK_PROFILE[f.key];if(!prof||f.specialCd>0||f.attackMode)return false;
 f.attackMode='windup';f.attackKind=kind||f.key;f.attackT=prof.windup;f.specialCd=prof.cooldown;f.alert=Math.max(f.alert,prof.windup+.5);f.hidden=false;
 if(f.key==='angler')world.lightJam=Math.max(world.lightJam,.72);
 return true
}
function launchFishAttack(f,p){
 const prof=ATTACK_PROFILE[f.key]||ATTACK_PROFILE.brown,dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy)||1;
 f.attackMode='lunge';f.attackT=prof.lunge;f.attackVx=dx/d*prof.speed;f.attackVy=dy/d*prof.speed;
 world.effects.push({type:'wake',x:f.x,y:f.y,t:0,big:f.key==='giant'});
 if(f.key==='giant'){world.envPulse=Math.max(world.envPulse,.85);beep(78,.12,'sawtooth')}
 else if(f.key==='angler'){world.lightJam=Math.max(world.lightJam,1.15);beep(145,.07,'sawtooth')}
 else beep(190,.045)
}
function fishHitPlayer(f,sp,p,st,mult=1){
 if(p.inv>0)return false;const prof=ATTACK_PROFILE[f.key],dmg=Math.max(1,Math.round((sp.damage||8)*(prof?.damage||1)*mult*st.armor));
 p.hp-=dmg;p.inv=.72;f.attackCd=1.1;
 const dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy)||1;p.vx+=dx/d*(f.key==='giant'?145:72);p.vy+=dy/d*(f.key==='giant'?145:72);
 if(f.key==='angler')world.lightJam=Math.max(world.lightJam,1.7);
 if(f.key==='giant')world.envPulse=1;
 showHint((prof?.label||'포식 생물 공격')+'! -'+dmg+' HP',760);beep(f.key==='giant'?70:105,.10,'sawtooth');return true
}
function updateFishAI(f,dt,p,st){
 const sp=SPECIES[f.key],dx=p.x-f.x,dy=p.y-f.y,dist=Math.hypot(dx,dy)||1,behavior=sp.behavior||'flee';
 f.marked=Math.max(0,f.marked-dt);f.attackCd=Math.max(0,f.attackCd-dt);f.alert=Math.max(0,f.alert-dt);f.specialCd=Math.max(0,f.specialCd-dt);f.panic=Math.max(0,f.panic-dt);f.feeding=Math.max(0,f.feeding-dt);f.contactCd=Math.max(0,(f.contactCd||0)-dt);
 // Fauna movement classes keep the sea from feeling like one large school of fish.
 if(sp.motion==='sessile'){f.vx=0;f.vy=0;return}
 if(sp.motion==='megafauna'){
   const dir=Math.sign(f.vx)||1;f.vx=lerp(f.vx,dir*(sp.speed||34),clamp(dt*.7,0,1));f.vy=Math.sin(world.time*.28+f.phase)*4;f.x+=f.vx*dt;f.y=clamp(f.y+f.vy*dt,zoneForY(f.baseY).y0+70,zoneForY(f.baseY).y1-70);
   if(f.x<120||f.x>WORLD.w-120)f.vx*=-1;return
 }
 if(sp.motion==='crawler'){
   const dir=Math.sign(f.vx)||1;if(Math.abs(f.x-f.homeX)>230)f.vx=-dir*(sp.speed||24);else f.vx=lerp(f.vx,dir*(sp.speed||24),clamp(dt*1.1,0,1));f.x+=f.vx*dt;f.y=f.baseY+Math.sin(world.time*3+f.phase)*2;return
 }
 if(sp.motion==='drifter'){
   f.vx=lerp(f.vx,(Math.sign(f.vx)||1)*(sp.speed||28)+Math.sin(world.time*.37+f.phase)*9,clamp(dt*.8,0,1));f.vy=Math.sin(world.time*.75+f.phase)*11;f.x+=f.vx*dt;f.y+=f.vy*dt;if(Math.abs(f.x-f.homeX)>420)f.vx*=-1;
   const zz=zoneForY(f.baseY);f.y=clamp(f.y,zz.y0+45,zz.y1-45);return
 }
 if(sp.motion==='jelly'){
   f.vx=lerp(f.vx,Math.sin(world.time*.31+f.phase)*18,clamp(dt*.8,0,1));f.vy=Math.sin(world.time*.95+f.phase)*18-5;f.x+=f.vx*dt;f.y+=f.vy*dt;const zz=zoneForY(f.baseY);f.y=clamp(f.y,zz.y0+50,zz.y1-50);
   if(dist<46&&f.contactCd<=0&&p.inv<=0){const dmg=Math.max(2,Math.round((sp.damage||7)*st.armor));p.hp-=dmg;p.inv=.55;f.contactCd=1.5;f.alert=.9;p.vx*=.55;p.vy*=.55;world.lightJam=Math.max(world.lightJam,.32);showHint('해파리 촉수 접촉! -'+dmg+' HP · 추진력 저하',800);beep(150,.07,'sawtooth')}return
 }
 if(sp.motion==='jet'&&dist<180&&f.specialCd<=0){const ex=f.x-p.x,ey=f.y-p.y,ed=Math.hypot(ex,ey)||1;f.vx=ex/ed*(sp.speed||88)*2.4;f.vy=ey/ed*(sp.speed||88)*1.9;f.specialCd=1.6;f.panic=1.4;world.effects.push({type:'wake',x:f.x,y:f.y,t:0,big:false})}
 if(sp.motion==='crawlerBoss'){
   f.y=f.baseY+Math.sin(world.time*2+f.phase)*2;
   if(!world.bossSeen.mantis&&dist<330){world.bossSeen.mantis=true;showHint('대형 공작갯가재 발견 · 펀치 직전 경고를 보고 피하세요!',2100)}
 }
 if(sp.motion==='boss'&&!world.bossSeen.kraken&&dist<720){world.bossSeen.kraken=true;world.envPulse=.75;showHint('소나에 거대한 생체 반응! · 심해 크라켄',2300);beep(72,.18,'sawtooth')}
 if(f.attackMode){f.attackT-=dt;if(f.attackMode==='windup'&&f.attackT<=0)launchFishAttack(f,p);else if(f.attackMode==='lunge'&&f.attackT<=0){f.attackMode='recover';f.attackT=f.key==='giant'?.75:.46}else if(f.attackMode==='recover'&&f.attackT<=0){f.attackMode='';f.attackKind=''}}
 const homeDx=f.homeX-f.x,homeDy=f.baseY-f.y;
 let tx=f.vx,ty=Math.sin(world.time*.9+f.phase)*8;

 // Ecological layer: prey reacts to nearby predators; school fish actually align/cohere/separate.
 if(!HOSTILE_BEHAVIORS.has(behavior)){
   const threat=nearestEcoFish(f,behavior==='skittish'?230:165,o=>HOSTILE_BEHAVIORS.has(SPECIES[o.key]?.behavior));
   if(threat){const o=threat.fish,ex=f.x-o.x,ey=f.y-o.y,ed=Math.hypot(ex,ey)||1;f.panic=Math.max(f.panic,.8);tx+=ex/ed*(behavior==='skittish'?205:145);ty+=ey/ed*(behavior==='skittish'?175:120)}
 }
 if(behavior==='school'){
   let n=0,ax=0,ay=0,cx=0,cy=0,sx=0,sy=0;
   for(const o of world.fish){if(o===f||!o.alive||o.key!==f.key)continue;const qx=o.x-f.x,qy=o.y-f.y,qd=Math.hypot(qx,qy);if(qd>170)continue;n++;ax+=o.vx;ay+=o.vy;cx+=o.x;cy+=o.y;if(qd<54&&qd>0){sx-=qx/qd*(54-qd);sy-=qy/qd*(54-qd)}}
   if(n){ax/=n;ay/=n;cx=cx/n-f.x;cy=cy/n-f.y;tx+=ax*.18+cx*.045+sx*.85;ty+=ay*.18+cy*.045+sy*.85}
   tx+=(Math.sign(f.vx)||1)*(sp.speed||42)*.22;ty+=Math.sin(world.time*1.3+f.phase)*8;
   if(dist<105){tx-=dx/dist*125;ty-=dy/dist*95;f.panic=.6}
 }else if(behavior==='flee'||behavior==='skittish'){
   const trigger=behavior==='skittish'?195:120;
   if(dist<trigger){f.panic=.9;const cover=behavior==='skittish'?nearestKelpCover(f,260):null;if(cover){const cx=cover.cover.x-f.x,cy=cover.cover.y-f.y,cd=Math.hypot(cx,cy)||1;tx=cx/cd*175;ty=cy/cd*150;f.hidden=cover.d<72}else{tx-=dx/dist*(behavior==='skittish'?205:135);ty-=dy/dist*(behavior==='skittish'?165:105)}f.alert=.8}
   else{f.hidden=behavior==='skittish'&&nearestKelpCover(f,64)?.d<64;tx+=(Math.sign(f.vx)||1)*(sp.speed||48)*.28;ty+=homeDy*.025}
 }else{
   // Hostile fish also hunt the ecosystem when the diver is not the closest target.
   const prey=nearestEcoFish(f,f.key==='giant'?430:285,o=>!HOSTILE_BEHAVIORS.has(SPECIES[o.key]?.behavior));
   const huntPrey=prey&&prey.d<dist*.82&&f.attackMode!=='windup'&&f.attackMode!=='lunge';
   if(huntPrey){const o=prey.fish,hx=o.x-f.x,hy=o.y-f.y,hd=Math.hypot(hx,hy)||1;tx=hx/hd*(sp.speed||90)*1.12;ty=hy/hd*(sp.speed||90)*1.05;f.alert=.55;if(prey.d<34&&f.feeding<=0){o.panic=2.2;o.vx+=hx/hd*190;o.vy+=hy/hd*150;f.feeding=.9}}
   if(!huntPrey){
     const prof=ATTACK_PROFILE[f.key];
     if(behavior==='territorial'){
       if(dist<(prof?.sense||220)){f.alert=1.1;if(!f.attackMode&&f.specialCd<=0)startFishAttack(f,f.key);tx=dx/dist*(sp.speed||70)*1.05;ty=dy/dist*(sp.speed||70)*.82}
       else{tx=homeDx*.18+(Math.sign(f.vx)||1)*(sp.speed||60)*.45;ty=homeDy*.12}
     }else if(behavior==='ambush'){
       f.hidden=dist>185&&f.attackMode!=='lunge'&&world.sonar<=0;
       if(dist<(prof?.sense||265)){f.alert=1.4;if(!f.attackMode&&f.specialCd<=0)startFishAttack(f,'ambush');tx=dx/dist*(sp.speed||105)*1.12;ty=dy/dist*(sp.speed||105)*.98}
       else{tx*=.92;ty=homeDy*.08+Math.sin(world.time*.45+f.phase)*3}
     }else if(behavior==='predator'){
       const sense=prof?.sense||(f.key==='giant'?590:390);
       if(dist<sense){f.alert=1.2;if(!f.attackMode&&f.specialCd<=0&&dist<sense*.78)startFishAttack(f,f.key==='giant'?'giantCharge':'hunterCharge');const chase=(sp.speed||112)*(f.key==='giant'||f.key==='kraken'?1.38:1.26);tx=dx/dist*chase;ty=dy/dist*chase}
       else{tx=homeDx*.08+(Math.sign(f.vx)||1)*(sp.speed||90)*.38;ty=homeDy*.06}
     }
   }
 }

 if(f.attackMode==='windup'){tx*=.32;ty*=.32}
 if(f.attackMode==='lunge'){tx=f.attackVx;ty=f.attackVy;if(f.key==='giant'){const near=Math.hypot(p.x-f.x,p.y-f.y);if(near<160){p.vx+=f.vx*.08*dt;p.vy+=f.vy*.08*dt;world.envPulse=Math.max(world.envPulse,.38)}}}
 if(f.attackMode==='recover'){tx*=.58;ty*=.58}
 const dangerBoost=behavior==='predator'?1.52:behavior==='ambush'?1.42:behavior==='territorial'?1.28:1,max=(sp.speed||50)*(f.attackMode==='lunge'?4.0:f.alert>0?1.65*dangerBoost:1.05),mag=Math.hypot(tx,ty)||1;
 if(mag>max){tx=tx/mag*max;ty=ty/mag*max}
 f.vx=lerp(f.vx,tx,clamp(dt*(f.attackMode==='lunge'?9:behavior==='predator'||behavior==='ambush'?3.1:1.8),0,1));
 f.vy=lerp(f.vy,ty,clamp(dt*(f.attackMode==='lunge'?9:2.2),0,1));
 f.x+=f.vx*dt;f.y+=f.vy*dt;
 if(f.x<55||f.x>WORLD.w-55){f.x=clamp(f.x,55,WORLD.w-55);f.vx*=-1}
 const zone=zoneForY(f.baseY);f.y=clamp(f.y,zone.y0+26,zone.y1-24);if(sp.motion==='crawlerBoss')f.y=lerp(f.y,f.baseY,clamp(dt*5,0,1));
 if(world.terrain.some(t=>pointInSolid(f.x,f.y,t,10))){f.x-=f.vx*dt*2;f.y-=f.vy*dt*2;f.vx*=-.65;f.vy*=-.65;if(f.attackMode==='lunge'){f.attackMode='recover';f.attackT=.34}}
 const hitRange=48+(f.key==='giant'?48:0);
 if(!f.hooked&&HOSTILE_BEHAVIORS.has(behavior)&&dist<hitRange&&f.attackCd<=0){
   const special=f.attackMode==='lunge';if(fishHitPlayer(f,sp,p,st,special?1.16:.68)&&special){f.attackMode='recover';f.attackT=f.key==='giant'?.82:.52}
 }
}
function applyZoneEnvironment(dt,p){
 const z=zoneForY(p.y),sub=subzoneForY(p.y),rule=ZONE_RULES[z.id]||ZONE_RULES.reef;
 if(rule.current){
   const pulse=Math.sin(world.time*.72+p.y*.011)+Math.sin(world.time*.27+p.x*.004)*.5;
   p.vx+=rule.current*pulse*dt;
   if(z.id==='kelp')p.vy+=Math.cos(world.time*.55+p.x*.003)*18*dt;
 }
 if(sub.id==='currentCut'){
   const surge=Math.sin(world.time*.92+p.y*.006);world.currentBurst=Math.max(0,Math.abs(surge)-.62);
   if(Math.abs(surge)>.62){const force=92*(Math.abs(surge)-.62)/.38;p.vx+=Math.sign(surge)*force*dt;p.vy+=Math.sin(world.time*1.7)*24*dt;world.envPulse=Math.max(world.envPulse,.18)}
 }
 if(z.id==='wreck'){
   for(const m of world.mines)if(!m.dead&&Math.hypot(m.x-p.x,m.y-p.y)<175)world.envPulse=Math.max(world.envPulse,.78);
 }
 if(z.id==='abyss'){
   world.envPulse=Math.max(world.envPulse,.32+Math.sin(world.time*2)*.08);
   for(const [vx,vy,sc] of VENTS){
     const d=Math.hypot(vx-p.x,vy-p.y),burst=(Math.sin(world.time*2.4+vx*.01)+1)*.5;
     if(d<125*sc&&burst>.68&&p.inv<=0){
       const dmg=Math.round(9*ZONE_RULES.abyss.oxygen*world.st.armor);p.hp-=dmg;p.inv=.82;p.vy-=130;p.vx+=(p.x-vx)/(d||1)*85;world.envPulse=1;
       showHint('열수 분출! -'+dmg+' HP',700);beep(120,.10,'sawtooth');break
     }
   }
 }
}
function applyDepthPressure(dt,p,dep){
 const rating=ratedDepth(),over=Math.max(0,dep-rating);world.pressureOver=over;
 if(over<=0){world.pressureState='safe';world.pressureTick=0;return}
 world.envPulse=Math.max(world.envPulse,clamp(.12+over/260*.35,.12,.48));
 if(world.pressureState==='safe'){world.pressureState='over';showHint('장비 권장 수심 '+Math.round(rating)+'m 초과 · 산소 소모와 압력 위험 증가',1800)}
 if(over>42){world.pressureTick-=dt;if(world.pressureTick<=0&&p.inv<=0){const dmg=Math.max(2,Math.round((2+over/85)*world.st.armor));p.hp-=dmg;p.inv=.32;world.pressureTick=1.18;showHint('수압 한계 초과! -'+dmg+' HP',650);beep(92,.07,'sawtooth')}}
}
function resetInputs(){Object.keys(keys).forEach(k=>keys[k]=false);touch.x=touch.y=0;touch.dash=false;const k=$('knob');if(k)k.style.transform='translate(0,0)'}
function update(dt){
 if(state!=='playing'||!world)return;world.time+=dt;const p=world.player,st=world.st;
 p.dashCd=Math.max(0,p.dashCd-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.inv=Math.max(0,p.inv-dt);world.sonar=Math.max(0,world.sonar-dt);world.sonarCd=Math.max(0,world.sonarCd-dt);world.lightJam=Math.max(0,world.lightJam-dt);world.currentBurst=Math.max(0,world.currentBurst-dt*.9);
 let ix=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0)+touch.x,iy=(keys.w||keys.arrowup?-1:0)+(keys.s||keys.arrowdown?1:0)+touch.y;let len=Math.hypot(ix,iy);if(len>1){ix/=len;iy/=len}
 const dashInput=!!(keys.shift||touch.dash),dashPressed=dashInput&&!p.dashHeld&&len>.1;p.dashHeld=dashInput;if(dashPressed&&p.dashCd<=0){p.dashTime=.24;p.dashCd=.82;beep(210,.035)}const dashing=p.dashTime>0,spd=st.speed*(dashing?2.05:1);
 if(len>.12){p.aimX=ix;p.aimY=iy;if(Math.abs(ix)>.12)p.face=ix>0?1:-1}const accel=6,tx=ix*spd,ty=iy*spd;p.vx=lerp(p.vx,tx,clamp(dt*accel,0,1));p.vy=lerp(p.vy,ty,clamp(dt*accel,0,1));if(len<.05){p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt)}
 p.x=clamp(p.x+p.vx*dt,45,WORLD.w-45);p.y=clamp(p.y+p.vy*dt,WORLD.surface+18,WORLD.h-35);const terrainHit=resolvePlayerTerrain(p,23);if(terrainHit){p.vx*=.82;p.vy*=.82}if(Math.abs(p.vx)>8)p.face=p.vx>0?1:-1;
 const zone=zoneForY(p.y),rule=ZONE_RULES[zone.id]||ZONE_RULES.reef,dep=depthOf(p.y);applyDepthPressure(dt,p,dep);
 const bagLoad=clamp(world.bagWeight/Math.max(1,st.bag),0,1),effort=1+len*.10+bagLoad*.18+(dashing?.72:0),pressureBurn=1+Math.min(1.15,world.pressureOver/150*.52);
 p.oxygen-=dt*rule.oxygen*effort*pressureBurn;applyZoneEnvironment(dt,p);
 world.maxDepth=Math.max(world.maxDepth,dep);if(dep>=600)world.mission.deep=true;
 const reserve=oxygenReserveStatus();if(reserve.code!==world.reserveState){world.reserveState=reserve.code;if(reserve.code==='warn')showHint('귀환 산소가 빠듯합니다. 더 깊이 갈지 돌아갈지 결정하세요.',1500);if(reserve.code==='critical')showHint('귀환 산소 위험 · 지금 상승하세요!',1800)}
 const zn=zone.name;if(zn!==world.lastZone){world.lastZone=zn;world.zoneFlash=1;showZone(zone);showHint(zone.tag+' · 위험: '+rule.danger,1900)}
 const sub=subzoneForY(p.y);world.mission.visited[sub.id]=true;if(sub.id!==world.lastSubzone){world.lastSubzone=sub.id;if(world.time>2){world.zoneFlash=Math.max(world.zoneFlash,.45);showHint(sub.name+' · '+zone.name,1300)}}
 world.zoneFlash=Math.max(0,world.zoneFlash-dt*1.35);world.envPulse=Math.max(0,world.envPulse-dt*.8);
 for(const f of world.fish){if(f.alive)updateFishAI(f,dt,p,st)}
 updateTether(dt);
 for(const s of world.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(world.terrain.some(t=>pointInSolid(s.x,s.y,t,2))){s.life=0;world.effects.push({type:'spark',x:s.x,y:s.y,t:0});continue}for(const f of world.fish){if(!f.alive)continue;if(Math.hypot(f.x-s.x,f.y-s.y)<28){hookFish(f);s.life=0;break}}}
 world.shots=world.shots.filter(s=>s.life>0);
 for(const m of world.mines){if(m.dead)continue;m.marked=Math.max(0,m.marked-dt);const d=Math.hypot(m.x-p.x,m.y-p.y);if(d<115&&m.fuse<=0){m.fuse=.92;showHint('기뢰 근접 경보!',700);beep(250,.05)}if(m.fuse>0){m.fuse-=dt;if(m.fuse<=0)explodeMine(m)}}
 for(const b of world.bubbles){b.y-=b.speed*dt;if(b.y<70){b.y=WORLD.h-20;b.x=rnd(0,WORLD.w)}}
 for(const e of world.effects)e.t+=dt;world.effects=world.effects.filter(e=>e.t<.85);
 const cameraLead=world.tool==='camera'?p.face*Math.min(170,view.w*.22):clamp(p.vx*.18,-70,70);world.camera.x=lerp(world.camera.x,p.x+cameraLead,1-Math.pow(.002,dt));world.camera.y=lerp(world.camera.y,p.y,1-Math.pow(.002,dt));
 if(p.oxygen<=0||p.hp<=0){finishDive(false,p.oxygen<=0?'산소가 고갈되어 구조되었습니다.':'부상으로 긴급 구조되었습니다.');return}
 if(p.y<WORLD.surface+45&&missionComplete()&&world.time>4){finishDive(true,'계약 목표를 완료하고 수면으로 무사 귀환했습니다.')}
}
function finishDive(ok,reason){
 if(state!=='playing')return;state='result';document.body.classList.remove('playing','cameraMode','sonarActive');resetInputs();
 const complete=missionComplete(),base=ok&&complete?world.contract.reward:0,depthBonus=ok?Math.round(world.maxDepth*1.25):0,survival=ok?250:0,gain=ok?Math.max(0,world.income+base+depthBonus+survival):0,score=ok?Math.round(gain+world.maxDepth*2+400):Math.round(world.maxDepth*.35);
 meta.money+=gain;meta.bestDepth=Math.max(meta.bestDepth,world.maxDepth);if(ok)meta.bestScore=Math.max(meta.bestScore,score);if(ok&&complete)meta.unlocked=Math.max(meta.unlocked,Math.min(CONTRACTS.length-1,world.contract.unlock+1));save();
 $('resultTitle').textContent=ok?'무사 귀환 · 잠수 보고서':'긴급 구조 · 잠수 보고서';
 const loss=ok?'':'<div class="notice">구조 시 현장 표본·유물·사진 연구 보상은 회수되지 않습니다. 도감 기록만 남습니다.</div>';
 $('resultBody').innerHTML='<div class="notice">'+reason+'</div>'+loss+'<div class="report"><div class="card"><span>계약</span><b>'+(complete?'완료':'미완료')+'</b></div><div class="card"><span>최대 수심</span><b>'+Math.round(world.maxDepth)+'m</b></div><div class="card"><span>사진 연구</span><b>'+money(world.photoIncome)+'</b></div><div class="card"><span>현장 가치</span><b>'+money(world.income)+'</b></div><div class="card"><span>계약 보상</span><b>'+money(base)+'</b></div><div class="card"><span>총 획득</span><b>'+money(gain)+'</b></div><div class="card"><span>탐사 점수</span><b>'+score+'</b></div></div>';
 $('resultScreen').classList.remove('hidden')
}

function frame(now){const dt=clamp((now-last)/1000,0,.033);last=now;if(state==='playing'){update(dt);render()}requestAnimationFrame(frame)}requestAnimationFrame(frame);

function contractCards(){
 return CONTRACTS.map((c,i)=>'<div class="card '+(i>meta.unlocked?'locked':'')+'"><h3>'+c.title+'</h3><p>'+c.desc+'</p><div class="depthRating">장비 권장 수심 '+(CONTRACT_DEPTH_RATING[i]+meta.up.suit*22)+'m</div><div class="reward">계약 보상 '+money(c.reward)+'</div><button class="btn '+(i>meta.unlocked?'dark':'gold')+'" data-contract="'+c.id+'" '+(i>meta.unlocked?'disabled':'')+'>'+(i>meta.unlocked?'잠김':'잠수 시작')+'</button></div>').join('')
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
 $('contractScreen').classList.add('hidden');const order=Object.keys(SPECIES);$('codexBody').innerHTML='<div class="grid">'+order.map(k=>{const sp=SPECIES[k],rec=meta.codex[k];return'<div class="card codexCard '+(rec?'':'unknown')+'"><h3>'+(rec?sp.name:'??? 미기록 생물')+'</h3><p>'+(rec?('유형 '+(sp.motion||'swimmer')+' · 발견 수심 '+sp.depth[0]+'~'+sp.depth[1]+'m · 최고 사진 '+(rec.best||'C')+' · 촬영 '+(rec.count||0)+'회'):'현장에서 카메라로 촬영하면 도감이 열립니다.')+'</p></div>'}).join('')+'</div><button class="btn" id="codexBack">계약 게시판</button>';$('codexScreen').classList.remove('hidden');$('codexBack').onclick=openContracts
}

function bind(){
 $('startBtn').onclick=()=>{if(!ready)return;meta.money=0;meta.unlocked=0;meta.up={oxygen:0,fins:0,bag:0,camera:0,harpoon:0,sonar:0,suit:0};meta.codex={};meta.bestDepth=0;meta.bestScore=0;save();openContracts()};
 $('continueBtn').onclick=()=>{if(!ready)return;load();openContracts()};
 $('nextBtn').onclick=openContracts;$('homeBtn').onclick=()=>{$('resultScreen').classList.add('hidden');$('startScreen').classList.remove('hidden');state='menu'};
 $('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent=sound?'SOUND ON':'SOUND OFF';if(sound)beep(700,.07)};
 document.querySelectorAll('#toolBar [data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));document.querySelectorAll('#mActions [data-tool]').forEach(b=>b.onclick=()=>{setTool(b.dataset.tool);useTool()});
 $('actionMain').onclick=useTool;$('interactMain').onclick=interact;$('actionMobile').onclick=useTool;$('interactMobile').onclick=interact;$('dashMobile').onpointerdown=e=>{e.preventDefault();touch.dash=true};$('dashMobile').onpointerup=$('dashMobile').onpointercancel=$('dashMobile').onlostpointercapture=()=>touch.dash=false;
 addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(state!=='playing')return;if(k==='1')setTool('camera');if(k==='2')setTool('harpoon');if(k==='3')setTool('sonar');if((k==='x'||k===' ')&&!e.repeat)useTool();if(k==='e'&&!e.repeat)interact()});
 addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('blur',resetInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInputs()});
 let joyId=null;const stick=$('stick'),knob=$('knob');
 function moveJoy(e){const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),m=r.width*.34,l=Math.hypot(dx,dy)||1,k=Math.min(1,l/m);touch.x=dx/l*k;touch.y=dy/l*k;knob.style.transform='translate('+(touch.x*36)+'px,'+(touch.y*36)+'px)'}
 stick.onpointerdown=e=>{joyId=e.pointerId;stick.setPointerCapture?.(e.pointerId);moveJoy(e)};stick.onpointermove=e=>{if(e.pointerId===joyId)moveJoy(e)};const end=e=>{if(joyId!==null&&e.pointerId!==joyId)return;joyId=null;touch.x=touch.y=0;knob.style.transform='translate(0,0)'};stick.onpointerup=end;stick.onpointercancel=end;stick.onlostpointercapture=end;
}
bind();load();updateStartButtons();
})();