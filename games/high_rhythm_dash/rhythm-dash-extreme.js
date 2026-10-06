(() => {
  'use strict';

  const STORE = 'kidscade_rhythm_dash_extreme_v1';
  const STEP_MS = 1000 / 120;
  const SPEED = Object.freeze({ A: 0.8, B: 1, D: 1.25, X: 1.5 });
  const X = {
    menu:false, active:false, auto:true, currentId:null, checkpoint:null, resume:null,
    retry:0, acc:0, last:0, vf:0, speedMul:1,
    data:{ unlocked:[101], highScores:{}, coinsBest:{} }
  };

  function loadDataX(){
    try{
      const s=JSON.parse(localStorage.getItem(STORE)||'null');
      if(!s)return;
      X.data.unlocked=Array.isArray(s.unlocked)&&s.unlocked.length?s.unlocked:[101];
      X.data.highScores=s.highScores&&typeof s.highScores==='object'?s.highScores:{};
      X.data.coinsBest=s.coinsBest&&typeof s.coinsBest==='object'?s.coinsBest:{};
      X.auto=s.auto!==false;
    }catch(_){}
  }
  function saveDataX(){
    try{ localStorage.setItem(STORE,JSON.stringify({unlocked:X.data.unlocked,highScores:X.data.highScores,coinsBest:X.data.coinsBest,auto:X.auto})); }catch(_){}
  }
  function blank(w){
    const rows=Array.from({length:7},()=>Array(w).fill('.'));
    rows[6].fill('#'); rows[0][w-2]='E'; return rows;
  }
  function put(rows,r,c,ch){
    if(r>=0&&r<rows.length&&c>=0&&c<rows[0].length)rows[r][c]=ch;
  }
  function mapOf(o){
    const rows=blank(o.width), reserved=new Set(), reserve=c=>{for(let d=-2;d<=2;d++)reserved.add(c+d);};
    (o.tunnels||[]).forEach(([a,b])=>{for(let c=a;c<=b&&c<o.width-3;c++)rows[0][c]='#';});
    (o.gaps||[]).forEach(([a,n])=>{for(let c=a;c<a+n&&c<o.width-4;c++)rows[6][c]='.';for(let c=a-2;c<a+n+2;c++)reserved.add(c);});
    (o.events||[]).forEach(e=>{put(rows,e.row,e.col,e.char);reserve(e.col);});
    (o.coins||[]).forEach(c=>{put(rows,4,c,'C');reserve(c);});
    (o.checkpoints||[]).forEach(e=>{put(rows,e.row==null?5:e.row,e.col,'K');reserve(e.col);});
    let beat=0;
    for(let c=18;c<o.width-16;c+=BEAT_TILES,beat++){
      if(reserved.has(c))continue;
      const token=o.pattern[beat%o.pattern.length];
      if(!token)continue;
      const tunnel=(o.tunnels||[]).some(([a,b])=>c>a+4&&c<b-4);
      if(tunnel&&(beat%3===1||token==='v'))put(rows,1,c,'v');
      else if(token==='O')put(rows,4,c,'O');
      else put(rows,5,c,token==='m'||token==='u'||token==='^'?token:'^');
    }
    for(let c=0;c<14;c++){rows[5][c]='.';rows[6][c]='#';}
    for(let c=o.width-14;c<o.width;c++){for(let r=1;r<=5;r++)rows[r][c]='.';rows[6][c]='#';}
    rows[0][o.width-2]='E';
    return rows.map(r=>r.join(''));
  }
  function level(id,title,o){
    return {
      id,title,extreme:true,theme:o.theme,color:o.color,rhythmKey:o.rhythmKey||'jajinmori',
      baseSpeed:o.speed,assistLevel:3,difficulty:o.difficulty,desc:o.desc,features:o.features||[],
      map:mapOf(o),tested:'EXTREME · 120Hz fixed step · forgiving hitbox · checkpoint'
    };
  }

  const XL=[
    level(101,'EXTREME 1: FIRST SHOCK',{theme:'첫 충격',color:'#22d3ee',rhythmKey:'jajinmori',width:188,speed:5.72,difficulty:'어려움',pattern:['^',0,'m','^',0,'u','^',0],coins:[54,106,154],checkpoints:[{col:92}],desc:'빠른 가시 패턴과 3코인으로 EXTREME의 속도에 적응합니다.',features:['기본 고속','3코인','체크포인트']}),
    level(102,'EXTREME 2: RING RUNNER',{theme:'링 러너',color:'#facc15',rhythmKey:'semachi',width:210,speed:5.84,difficulty:'초고수',pattern:['^','m',0,'^',0,'u','^',0],events:[{row:4,col:62,char:'r'},{row:4,col:126,char:'r'},{row:4,col:174,char:'r'}],gaps:[[66,5],[130,6],[178,5]],coins:[72,136,184],checkpoints:[{col:104}],desc:'공중의 노란 링 근처에서 다시 누르면 한 번 더 튀어 오릅니다.',features:['점프 링','공중 입력','3코인']}),
    level(103,'EXTREME 3: GRAVITY FLIP',{theme:'중력 뒤집기',color:'#c084fc',rhythmKey:'eotmori',width:224,speed:5.92,difficulty:'초고수',pattern:['^',0,'m',0,'v',0,'u',0],tunnels:[[58,120]],events:[{row:5,col:58,char:'g'},{row:1,col:116,char:'g'}],coins:[82,104,156],checkpoints:[{col:132}],desc:'보라색 포털을 지나면 중력이 뒤집혀 천장도 바닥처럼 달립니다.',features:['중력 포털','천장 주행','3코인']}),
    level(104,'EXTREME 4: TURBO GATE',{theme:'터보 게이트',color:'#fb7185',rhythmKey:'hwimori',width:240,speed:5.94,difficulty:'익스트림',pattern:['^','m','u',0,'^',0,'O',0],events:[{row:5,col:52,char:'D'},{row:5,col:108,char:'X'},{row:5,col:168,char:'B'}],coins:[80,142,204],checkpoints:[{col:124}],desc:'속도 포털이 1.25배와 1.5배로 템포를 끌어올립니다.',features:['속도 포털','1.5배 구간','3코인']}),
    level(105,'EXTREME 5: NEON SWITCH',{theme:'네온 스위치',color:'#34d399',rhythmKey:'mixedA',width:258,speed:6,difficulty:'익스트림',pattern:['^','m',0,'u','^',0,'O',0],tunnels:[[116,166]],events:[{row:4,col:64,char:'r'},{row:5,col:96,char:'D'},{row:5,col:116,char:'g'},{row:1,col:162,char:'g'},{row:5,col:202,char:'X'}],coins:[70,140,224],checkpoints:[{col:176}],desc:'링·속도·중력 전환이 한 곡 안에서 이어지는 첫 혼합 스테이지입니다.',features:['링','속도','중력','3코인']}),
    level(106,'EXTREME 6: BEAT STORM',{theme:'비트 스톰',color:'#60a5fa',rhythmKey:'latin',width:282,speed:6.08,difficulty:'전설',pattern:['^','m','u','^',0,'O','^',0],events:[{row:5,col:74,char:'D'},{row:4,col:126,char:'r'},{row:5,col:184,char:'X'},{row:4,col:232,char:'r'}],gaps:[[130,5],[236,6]],coins:[136,206,244],checkpoints:[{col:94},{col:198}],desc:'체크포인트 두 곳과 고속 구간을 이용해 긴 패턴을 끊어서 익힙니다.',features:['다중 체크포인트','링','고속','3코인']}),
    level(107,'EXTREME 7: FINAL DASH',{theme:'파이널 대시',color:'#f59e0b',rhythmKey:'finale',width:320,speed:6.14,difficulty:'전설+',pattern:['^','m','u','^','m',0,'O',0],tunnels:[[142,194]],events:[{row:4,col:58,char:'r'},{row:5,col:96,char:'D'},{row:5,col:142,char:'g'},{row:1,col:190,char:'g'},{row:5,col:224,char:'X'},{row:4,col:274,char:'r'},{row:5,col:294,char:'B'}],gaps:[[62,5],[278,6]],coins:[68,170,286],checkpoints:[{col:116},{col:208}],desc:'링·중력·속도 포털·3코인을 모두 섞은 EXTREME 최종 스테이지입니다.',features:['모든 기믹','3코인','최종']})
  ];

  function xlevel(id){ return XL.find(l=>l.id===Number(id)); }
  function isX(l=currentLevel){ return !!l&&l.extreme===true; }

  function ui(){
    if(!document.getElementById('rdx-style')){
      const s=document.createElement('style');s.id='rdx-style';s.textContent=
        '#btnExtremeStart{background:linear-gradient(135deg,#f43f5e,#7c3aed);box-shadow:0 0 24px rgba(244,63,94,.42)}'+
        '#rdx-toast{position:fixed;left:50%;top:110px;z-index:55;transform:translate(-50%,-8px);opacity:0;padding:9px 15px;border-radius:999px;background:rgba(2,6,23,.84);border:1px solid rgba(244,114,182,.45);font:900 12px/1.2 Noto Sans KR,sans-serif;pointer-events:none;transition:.16s;white-space:nowrap}'+
        '#rdx-toast.show{opacity:1;transform:translate(-50%,0)}body.rdx-playing #rdv11-section,body.rdx-playing #rdv11-track{display:none!important}body.rdx-playing #rdv11-badge{color:#fda4af;border-color:rgba(244,63,94,.45)}';
      document.head.appendChild(s);
    }
    const start=document.getElementById('btnStart');
    if(start&&!document.getElementById('btnExtremeStart')){
      const b=document.createElement('button');b.id='btnExtremeStart';b.className='px-8 py-4 text-white font-bold rounded-full text-2xl transition transform hover:scale-105 pointer-events-auto';b.textContent='⚡ EXTREME';start.insertAdjacentElement('afterend',b);
    }
    const controls=document.querySelector('#levelSelectMenu .mb-4');
    if(controls&&!document.getElementById('btnExtremeAutoRetry')){
      const b=document.createElement('button');b.id='btnExtremeAutoRetry';b.className='hidden px-5 py-2 rounded-full font-bold bg-rose-600 hover:bg-rose-500 transition border border-rose-300';controls.appendChild(b);
    }
    if(!document.getElementById('rdx-toast')){const t=document.createElement('div');t.id='rdx-toast';document.body.appendChild(t);}
  }
  function toast(text,color){
    const t=document.getElementById('rdx-toast');if(!t)return;t.textContent=text;t.style.color=color||'#fda4af';t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),1200);
  }
  function renderX(){
    const h=document.querySelector('#levelSelectMenu h2');if(h){h.textContent='⚡ RHYTHM DASH EXTREME';h.className='font-display text-5xl mb-6 text-rose-300 neon-text-red';}
    const a=document.getElementById('btnExtremeAutoRetry');if(a){a.classList.remove('hidden');a.textContent=X.auto?'자동 재도전 ON':'자동 재도전 OFF';a.onclick=()=>{X.auto=!X.auto;saveDataX();renderLevelSelect();};}
    levelListDiv.innerHTML='';
    XL.forEach(l=>{
      const on=X.data.unlocked.includes(l.id),best=Number(X.data.highScores[l.id]||0),coins=Number(X.data.coinsBest[l.id]||0);
      const b=document.createElement('button');
      b.className='w-full p-4 rounded-xl flex items-center justify-between gap-4 transition border '+(on?'bg-slate-900/90 hover:bg-slate-800 cursor-pointer border-rose-400/35':'bg-slate-950/70 opacity-45 cursor-not-allowed border-slate-800');
      b.innerHTML='<div class="text-left min-w-0"><div class="font-display text-2xl" style="color:'+(on?l.color:'#64748b')+'">'+(on?l.title:'??? (잠김)')+'</div><div class="text-sm text-slate-300">'+(on?l.desc:'이전 EXTREME 스테이지를 클리어하세요.')+'</div><div class="mt-1 text-xs text-fuchsia-200">'+(on?l.features.join(' · '):'')+'</div><div class="mt-1 text-[11px] text-emerald-300">'+(on?'120Hz 고정 스텝 · 관대한 판정 · 연습 체크포인트':'')+'</div></div><div class="text-right shrink-0"><div class="text-xs text-slate-500">'+(practiceMode?'PRACTICE':'BEST')+'</div><div class="font-display text-xl text-white">'+(on?(practiceMode?'연습':best+'%'):'-')+'</div><div class="text-xs text-amber-300 mt-1">'+(on?'🪙 '+coins+'/3':'')+'</div></div>';
      if(on)b.onclick=()=>startX(l.id);levelListDiv.appendChild(b);
    });
  }
  function startX(id){
    const l=xlevel(id);if(!l)return;clearTimeout(X.retry);X.menu=true;X.active=true;X.currentId=id;X.checkpoint=null;X.resume=null;
    if(!practiceMode&&!consumeHeart()){X.active=false;showHeartWarning();return;}initGame(id);
  }

  function portal(tile){
    if(tile.used)return;tile.used=true;
    if(tile.char==='g'){
      const sign=player.gravity>=0?-1:1;player.gravity=Math.abs(player.gravity)*sign;player.jumpForce=Math.abs(player.jumpForce)*-sign;player.vy=sign<0?-2.4:2.4;
      createParticles(tile.x+tile.w/2,tile.y+tile.h/2,22,'#c084fc');toast(sign<0?'중력 반전! 천장으로!':'중력 원복! 바닥으로!','#e9d5ff');return;
    }
    const m=SPEED[tile.char];if(!m)return;const sign=player.gravity<0?-1:1;X.speedMul=m;player.speed=player.baseSpeed*m;calculatePhysics();
    if(sign<0){player.gravity=-Math.abs(player.gravity);player.jumpForce=Math.abs(player.jumpForce);}
    createParticles(tile.x+tile.w/2,tile.y+tile.h/2,18,m>=1.5?'#fb7185':'#38bdf8');toast('SPEED ×'+m,(m>=1.5?'#fda4af':'#7dd3fc'));
  }
  function ring(){
    if(!X.active||state!=='PLAYING')return false;const cx=player.x+player.w/2,cy=player.y+player.h/2;let best=null,bd=Infinity;
    for(const t of tiles){if(t.char!=='r'||t.used)continue;const d=Math.hypot(t.x+t.w/2-cx,t.y+t.h/2-cy);if(d<72&&d<bd){best=t;bd=d;}}
    if(!best)return false;best.used=true;jumpBufferFrames=0;queuedJumpReleased=false;player.vy=player.gravity>=0?-Math.abs(JUMP_NORMAL)*1.08:Math.abs(JUMP_NORMAL)*1.08;player.isGrounded=false;player.jumpCutApplied=false;
    audio.playJump();createParticles(best.x+best.w/2,best.y+best.h/2,24,'#fde047');judgeRhythmInput();toast('RING! 공중 재점프','#fde68a');return true;
  }
  function collisionX(){
    player.isGrounded=false;let hit=false,goal=false;const px=player.x+6,pw=player.w-12,py=player.y,ph=player.h;
    for(const t of tiles){
      if(t.x<cameraX-TILE_SIZE||t.x>cameraX+cw+TILE_SIZE)continue;
      const b={x:t.x,y:t.char==='E'?-ch:t.y,w:t.w,h:t.char==='E'?ch*3:t.h};
      if(!(px<b.x+b.w&&px+pw>b.x&&py<b.y+b.h&&py+ph>b.y))continue;
      if(t.char==='#'){
        if(player.gravity>=0&&player.vy>=0&&py+ph-player.vy*.5<=t.y+Math.max(15,Math.abs(player.vy))){player.y=t.y-player.h;player.vy=0;player.isGrounded=true;}
        else if(player.gravity<0&&player.vy<=0&&py-player.vy*.5>=t.y+t.h-Math.max(15,Math.abs(player.vy))){player.y=t.y+t.h;player.vy=0;player.isGrounded=true;}
      }else if(HAZARD_CHARS.has(t.char)){if(rectsOverlap(getPlayerSpikeHitbox(),getHazardHitbox(t)))hit=true;}
      else if(t.char==='E')goal=true;
      else if(t.char==='C'){coinsCollected++;t.char='.';audio.playCoin();createParticles(t.x+t.w/2,t.y+t.h/2,18,'#facc15');}
      else if(t.char==='g'||SPEED[t.char])portal(t);
      else if(t.char==='K'&&practiceMode&&!t.used){t.used=true;X.checkpoint={x:t.x+TILE_SIZE,gravitySign:player.gravity<0?-1:1,speedMul:X.speedMul};toast('CHECKPOINT 저장!','#86efac');}
    }
    const top=startYGlobal,bottom=startYGlobal+currentLevel.map.length*TILE_SIZE;
    if(player.y>bottom+TILE_SIZE*2||player.y+player.h<top-TILE_SIZE*2)hit=true;
    if(goal){gameOver(true);return;}if(hit)gameOver(false);
  }
  function stepX(r){
    if(state!=='PLAYING'||!X.active)return;player.vy+=player.gravity*r;player.y+=player.vy*r;player.x+=player.speed*r;cameraX=Math.round(player.x-cw*.2);collisionX();if(state!=='PLAYING')return;
    X.vf+=r;if(X.vf>=1){X.vf-=1;updateMusicBeat();player.trail.push({x:player.x,y:player.y});if(player.trail.length>10)player.trail.shift();}
    if(player.isGrounded)coyoteFrames=8;else if(coyoteFrames>0)coyoteFrames=Math.max(0,coyoteFrames-r);
    if(jumpBufferFrames>0&&(player.isGrounded||coyoteFrames>0)){player.vy=player.jumpForce;player.isGrounded=false;player.jumpCutApplied=false;const short=queuedJumpReleased||!isInputHeld();jumpBufferFrames=0;coyoteFrames=0;queuedJumpReleased=false;if(short){player.vy*=JUMP_RELEASE_CUT;player.jumpCutApplied=true;}audio.playJump();createParticles(player.x+player.w/2,player.y+player.h,10,player.color);}
    if(jumpBufferFrames>0)jumpBufferFrames=Math.max(0,jumpBufferFrames-r);
    if(rhythmJudgeTimer>0){rhythmJudgeTimer=Math.max(0,rhythmJudgeTimer-r);if(rhythmJudgeTimer===0)renderRhythmHud();}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*r;p.y+=p.vy*r;p.life-=.05*r;if(p.life<=0)particles.splice(i,1);}
    progress=Math.min(100,Math.floor(player.x/levelLength*100));scoreDisplay.innerText=progress+'%';if(progressBar)progressBar.style.width=progress+'%';if(coinDisplay)coinDisplay.innerText='코인: '+coinsCollected+' / '+coinsTotal;
  }
  function drawObj(t,label,color){
    const cx=t.x+t.w/2,cy=t.y+t.h/2;ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='lighter';ctx.strokeStyle=color;ctx.lineWidth=4;ctx.globalAlpha=.75;ctx.beginPath();ctx.ellipse(0,0,13,25,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.font='900 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,0,0);ctx.restore();
  }
  function drawX(){
    if(!X.active||state!=='PLAYING')return;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.translate(-cameraX,0);
    for(const t of tiles){
      if(t.x<cameraX-TILE_SIZE||t.x>cameraX+cw+TILE_SIZE)continue;
      if(t.char==='r'&&!t.used){ctx.save();ctx.translate(t.x+t.w/2,t.y+t.h/2);ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#fde047';ctx.lineWidth=5;ctx.globalAlpha=.82;ctx.beginPath();ctx.arc(0,0,13+Math.sin(performance.now()/120)*2,0,Math.PI*2);ctx.stroke();ctx.restore();}
      else if(t.char==='g')drawObj(t,'↕','#c084fc');else if(t.char==='A')drawObj(t,'.8','#38bdf8');else if(t.char==='B')drawObj(t,'1x','#34d399');else if(t.char==='D')drawObj(t,'1.25','#facc15');else if(t.char==='X')drawObj(t,'1.5','#fb7185');
      else if(t.char==='K'){ctx.save();ctx.translate(t.x+t.w/2,t.y+t.h/2);ctx.rotate(Math.PI/4);ctx.fillStyle=t.used?'#22c55e':'#10b981';ctx.globalAlpha=.75;ctx.fillRect(-9,-9,18,18);ctx.restore();}
    }
    ctx.restore();ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font='1000 11px Noto Sans KR,sans-serif';ctx.textAlign='right';ctx.fillStyle='#fda4af';ctx.fillText('EXTREME · '+X.speedMul.toFixed(2)+'x · '+(player.gravity<0?'천장 중력':'바닥 중력'),cw-14,28);ctx.restore();
  }
  function applyCP(){
    const cp=X.resume;if(!cp||!X.active)return;X.resume=null;X.speedMul=cp.speedMul||1;player.speed=player.baseSpeed*X.speedMul;calculatePhysics();
    if(cp.gravitySign<0){player.gravity=-Math.abs(player.gravity);player.jumpForce=Math.abs(player.jumpForce);player.y=startYGlobal+TILE_SIZE;}
    else{player.gravity=Math.abs(player.gravity);player.jumpForce=-Math.abs(player.jumpForce);player.y=startYGlobal+(currentLevel.map.length-1)*TILE_SIZE-player.h;}
    player.x=cp.x;player.vy=0;cameraX=Math.round(player.x-cw*.2);lastBeatX=Math.floor(player.x/getBeatDistance())*getBeatDistance();toast('체크포인트에서 재시작!','#86efac');
  }
  function unlock(id){const i=XL.findIndex(l=>l.id===id),n=XL[i+1];if(n&&!X.data.unlocked.includes(n.id))X.data.unlocked.push(n.id);}

  function install(){
    const render0=renderLevelSelect;renderLevelSelect=function(){render0();const h=document.querySelector('#levelSelectMenu h2'),a=document.getElementById('btnExtremeAutoRetry');if(X.menu)renderX();else{if(h){h.textContent='스테이지 선택';h.className='font-display text-5xl mb-6 text-white';}if(a)a.classList.add('hidden');}};
    const init0=initGame;initGame=function(id){const l=xlevel(id);if(!l){X.active=false;X.currentId=null;document.body.classList.remove('rdx-playing');return init0(id);}X.active=true;X.currentId=l.id;X.speedMul=1;X.acc=0;X.last=0;X.vf=0;LEVELS.push(l);try{init0(l.id);}finally{LEVELS.pop();}document.body.classList.add('rdx-playing');const b=document.getElementById('rdv11-badge');if(b)b.textContent='RHYTHM DASH · EXTREME';if(modeDisplay)modeDisplay.innerText=practiceMode?'⚡ EXTREME PRACTICE · 체크포인트 ON':'⚡ EXTREME · 자동 재도전 '+(X.auto?'ON':'OFF');applyCP();toast(l.title+' · '+l.theme,l.color);};
    const check0=checkCollisions;checkCollisions=function(){return X.active?collisionX():check0();};
    const q0=queueJumpInput;queueJumpInput=function(){if(X.active&&ring())return;q0();if(X.active)jumpBufferFrames=Math.min(jumpBufferFrames,8);};
    const try0=tryStartLevel;tryStartLevel=function(id){if(X.menu&&xlevel(id)){X.active=true;X.currentId=Number(id);clearTimeout(X.retry);return initGame(id);}return try0(id);};
    const draw0=draw;draw=function(){draw0();drawX();};
    const loop0=loop;loop=function(){if(!X.active)return loop0();X.acc=0;X.last=performance.now();const frame=now=>{if(state!=='PLAYING'||!X.active)return;X.acc+=Math.min(50,Math.max(0,now-X.last));X.last=now;while(X.acc>=STEP_MS&&state==='PLAYING'){stepX(.5);X.acc-=STEP_MS;}if(state==='PLAYING')draw();if(state==='PLAYING')reqId=requestAnimationFrame(frame);};reqId=requestAnimationFrame(frame);};
    const over0=gameOver;gameOver=function(clear){if(!X.active||!isX(currentLevel))return over0(clear);clearTimeout(X.retry);const id=currentLevel.id,cp=X.checkpoint?Object.assign({},X.checkpoint):null,pm=practiceMode;practiceMode=true;over0(clear);practiceMode=pm;X.data.highScores[id]=Math.max(Number(X.data.highScores[id]||0),Number(progress||0));X.data.coinsBest[id]=Math.max(Number(X.data.coinsBest[id]||0),Number(coinsCollected||0));if(clear)unlock(id);saveDataX();if(clear){resultTitle.innerText='EXTREME COMPLETE!';resultMsg.innerText='클리어! · 코인 '+coinsCollected+'/'+coinsTotal+(coinsCollected===3?' · 3코인 완성!':'');document.getElementById('btnRetry').innerText='다시 도전';return;}resultTitle.innerText=progress>0?'NEW BEST? '+progress+'%':'CRASH!';resultMsg.innerText=pm&&cp?'연습 체크포인트에서 바로 다시 시작합니다.':(X.auto?'0.65초 후 자동 재도전합니다.':'패턴을 읽고 다시 도전하세요.');if(pm&&cp)X.resume=cp;if(X.auto||(pm&&cp))X.retry=setTimeout(()=>{if(state==='GAMEOVER'&&X.menu)initGame(id);},650);};
    const state0=changeState;changeState=function(n){state0(n);if(n!=='PLAYING')document.body.classList.remove('rdx-playing');else if(X.active)document.body.classList.add('rdx-playing');};
  }

  function bind(){
    const normal=document.getElementById('btnStart');if(normal){const f=normal.onclick;normal.onclick=e=>{X.menu=false;X.active=false;clearTimeout(X.retry);return f&&f.call(normal,e);};}
    const ex=document.getElementById('btnExtremeStart');if(ex)ex.onclick=()=>{audio.resume();X.menu=true;X.active=false;renderLevelSelect();changeState('LEVEL_SELECT');};
    const back=document.getElementById('btnBackToMain');if(back)back.onclick=()=>{clearTimeout(X.retry);X.menu=false;X.active=false;changeState('MENU');};
    const levels=document.getElementById('btnToLevels');if(levels)levels.onclick=()=>{clearTimeout(X.retry);X.active=false;renderLevelSelect();changeState('LEVEL_SELECT');};
    const retry=document.getElementById('btnRetry');if(retry){const f=retry.onclick;retry.onclick=()=>{clearTimeout(X.retry);if(X.menu&&currentLevel&&isX(currentLevel))return initGame(currentLevel.id);return f&&f.call(retry);};}
  }

  function boot(){
    if(typeof LEVELS==='undefined'||typeof initGame!=='function'||typeof renderLevelSelect!=='function'){console.warn('[Rhythm Dash EXTREME] base game not ready');return;}
    loadDataX();ui();install();bind();
    console.info('[Rhythm Dash EXTREME] 7 stages · 120Hz fixed step · rings · gravity · speed portals · checkpoints');
  }
  boot();
})();