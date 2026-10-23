/* 포물선 대작전 — browser-only, offline-compatible, keyboard + touch */
(() => {
  'use strict';
  const P = window.ParabolaPhysics;
  if (!P) throw new Error('Missing ParabolaPhysics');
  const $ = id => document.getElementById(id);
  const canvas = $('scene'), c = canvas.getContext('2d');
  const W = P.WIDTH, H = P.HEIGHT;
  const TAU = Math.PI * 2;
  const STAGES = [
    { name:'햇살 들판', goal:760, wind:0, knots:[[0,518],[1200,518]], tip:'같은 높이의 과녁까지 얼마나 멀리 날아갈까요?' },
    { name:'내리막 마을', goal:840, wind:0, knots:[[0,485],[240,485],[390,538],[650,550],[850,512],[1200,512]], tip:'출발하는 곳과 떨어지는 곳의 높이가 달라졌어요.' },
    { name:'바위 언덕', goal:900, wind:0, knots:[[0,521],[345,521],[490,411],[630,431],[785,532],[1200,532]], tip:'언덕에 부딪히지 않도록 높이 날려 보세요.' },
    { name:'골짜기 건너', goal:860, wind:0, knots:[[0,462],[310,462],[450,575],[600,575],[790,465],[1200,465]], tip:'깊은 골짜기를 건너 반대편 과녁을 맞혀요.' },
    { name:'높은 언덕', goal:875, wind:0, knots:[[0,542],[310,542],[550,505],[720,390],[950,390],[1200,460]], tip:'과녁이 높은 곳에 있으면 어떻게 해야 할까요?' },
    { name:'먼 하늘', goal:1040, wind:0, knots:[[0,525],[340,525],[530,558],[780,540],[1200,525]], tip:'긴 거리에서도 작은 조절로 결과를 바꿀 수 있어요.' }
  ];
  const BATTLE = [[0,518],[250,518],[460,545],[670,545],[865,518],[1200,518]];
  const IMAGES = {
    sky: '../../assets/game/2d/platformer-art/base/backgrounds/bg.png',
    grass: '../../assets/game/2d/platformer-art/base/tiles/grass-center.png',
    stone: '../../assets/game/2d/platformer-art/base/tiles/stone.png',
    castle: '../../assets/game/2d/platformer-art/base/tiles/castle.png',
    bush: '../../assets/game/2d/platformer-art/base/items/bush.png',
    rock: '../../assets/game/2d/platformer-art/base/items/rock.png',
    flagBlue: '../../assets/game/2d/platformer-art/base/items/flag-blue.png',
    flagRed: '../../assets/game/2d/platformer-art/base/items/flag-red.png',
    cloud: '../../assets/game/2d/platformer-art/base/items/cloud1.png',
    star: '../../assets/game/2d/platformer-art/base/items/star.png',
    bomb: '../../assets/game/2d/platformer-art/base/items/bomb.png',
    fireball: '../../assets/game/2d/platformer-art/base/items/fireball.png',
    snow: '../../assets/game/2d/platformer-art/base/tiles/snow-center.png',
    sand: '../../assets/game/2d/platformer-art/base/tiles/sand-center.png',
    water: '../../assets/game/2d/platformer-art/base/tiles/liquid-water-top.png'
  };
  const sprites = {};
  Object.entries(IMAGES).forEach(([key, url]) => {
    const img = new Image();
    img.onload = () => { sprites[key] = img; };
    img.onerror = () => { sprites[key] = null; };
    img.src = url;
  });
  let generation = 0;
  const state = {
    mode:'practice', difficulty:'normal', windEnabled:false, wind:0, stage:0, shots:0,
    points:[0,0], turn:0, phase:'menu', angle:45, power:70,
    aims:[{angle:45,power:70},{angle:45,power:70}], ammo:'basic',
    bursts:[2,2], battleKnots:null, previous:[null,null], preview:null, flight:null, explosion:null,
    notice:'각도와 세기를 조절해서 노란 과녁을 맞혀 보세요!', lastFrame:0,
    recoil:[0,0], shake:0, movingPointer:null, celebration:0
  };
  const isBattle = () => state.mode !== 'practice';
  const theme = () => isBattle()?'meadow':
    ['meadow','meadow','rock','river','snow','desert'][state.stage];
  const knots = () => isBattle() ? state.battleKnots || BATTLE : STAGES[state.stage].knots;
  const tank = side => {
    const x = side === 0 ? 135 : 1050;
    return { x, y:P.terrainY(knots(),x)-24, radius:23 };
  };
  const goal = () => {
    const x = STAGES[state.stage].goal;
    return { x, y:P.terrainY(knots(),x)-26, radius:29 };
  };
  const target = side => isBattle() ? tank(1-side) : goal();
  function muzzle(side, angle) {
    const t = tank(side), d = side === 0 ? 1 : -1, r = angle*Math.PI/180;
    return { x:t.x + d*Math.cos(r)*38, y:t.y - Math.sin(r)*38-7 };
  }
  function buildShot(side, angle, power) {
    return P.launch(muzzle(side,angle), angle, power, side===0 ? 1 : -1, state.wind);
  }
  function setNotice(message) { state.notice=message; $('notice').textContent=message; }
  function finishScreen(title, description, stars) {
    $('finishTitle').textContent=title;
    $('finishText').textContent=description;
    $('finishStar').textContent=stars;
    $('finishOverlay').classList.remove('hidden');
    state.celebration=2.6;
  }
  function clearFinish() {
    $('finishOverlay').classList.add('hidden');
    state.celebration=0;
  }
  function sdk(method,...args) { try { window.KidscadeGame?.[method]?.(...args); } catch (_) {} }
  function syncControls() {
    $('angle').value=String(state.angle); $('power').value=String(state.power);
    $('angleValue').textContent=state.angle+'°'; $('powerValue').textContent=String(state.power);
    $('ammo').value=state.ammo;
    $('ammo').disabled=state.phase!=='aim'||!isBattle()||(state.mode==='cpu'&&state.turn===1);
    $('ammo').options[1].disabled=!isBattle()||state.bursts[state.turn]===0;
    $('ammoCount').textContent=isBattle()?'펑펑탄 '+state.bursts[state.turn]+'발 남음':'연습에서는 기본탄 사용';
    const isAi=state.mode==='cpu' && state.turn===1;
    const locked=state.phase!=='aim' || isAi;
    $('angle').disabled=locked; $('power').disabled=locked; $('fire').disabled=locked;
    $('turnLabel').textContent=state.phase==='finished'?'경기 종료':state.mode==='practice'?'파란 대포':state.turn===0?'파란 대포 차례':isAi?'컴퓨터가 조준 중':'주황 대포 차례';
    $('windLabel').textContent=state.wind===0?'바람 없음':state.wind>0?'바람 → '+Math.abs(state.wind):'바람 ← '+Math.abs(state.wind);
    $('modeLabel').textContent=state.mode==='practice'?'표적 연습':state.mode==='cpu'?'컴퓨터 대전':'친구 대전';
    $('stageLabel').textContent=isBattle()?'먼저 3점 얻기':(state.stage+1)+' / '+STAGES.length+' · '+STAGES[state.stage].name;
    $('leftLabel').textContent='파란 대포';
    $('leftScore').textContent=isBattle()?state.points[0]+' / 3점':state.shots+'발 시도';
    $('rightLabel').textContent=isBattle()?(state.mode==='cpu'?'컴퓨터':'주황 대포'):'목표';
    $('rightScore').textContent=isBattle()?state.points[1]+' / 3점':'노란 과녁';
    $('legend').style.display=state.difficulty==='hard'?'none':'block';
    $('legend').innerHTML=state.difficulty==='easy'?'<span></span>밝은 선: 예상 궤적 · 노란 선: 지난 발사':'<span></span>지난 발사 궤적';
  }
  function computePreview() {
    state.preview=(state.phase==='aim' && state.difficulty==='easy') ?
      P.trace({ shot:buildShot(state.turn,state.angle,state.power), knots:knots(),
        targets:[target(state.turn)] }) : null;
  }
  function adjust() {
    state.angle=Number($('angle').value); state.power=Number($('power').value);
    computePreview(); syncControls();
  }
  function planAi() {
    const current=generation;
    setNotice('컴퓨터가 각도와 세기를 고르고 있어요.');
    window.setTimeout(() => {
      if(current!==generation || state.phase!=='aim' || state.turn!==1 || state.mode!=='cpu') return;
      /* Search real shots with the angle-dependent muzzle, including terrain collisions. */
      let best={ angle:45,power:75,score:Infinity };
      for(let a=5;a<=85;a+=2) {
        for(let p=20;p<=100;p+=2) {
          const shot=buildShot(1,a,p);
          const result=P.shortestLandingDistance(shot,knots(),tank(0));
          if(result.distance<best.score) best={angle:a,power:p,score:result.distance};
        }
      }
      const miss=state.difficulty==='easy'?7:state.difficulty==='normal'?4:1;
      state.angle=P.clamp(Math.round(best.angle+(Math.random()-.5)*miss),5,85);
      state.power=P.clamp(Math.round(best.power+(Math.random()-.5)*miss*1.5),10,100);
      state.ammo='basic';
      computePreview(); syncControls();
      window.setTimeout(() => {
        if(current===generation && state.phase==='aim' && state.turn===1) fire(true);
      },550);
    },420);
  }
  function setAim() {
    const saved=state.aims[state.turn];
    state.phase='aim'; state.angle=saved.angle; state.power=saved.power;
    state.ammo='basic'; state.explosion=null;
    computePreview(); syncControls();
    if(state.mode==='cpu' && state.turn===1) planAi();
  }
  function startGame() {
    generation+=1;
    state.mode=document.querySelector('.mode.selected')?.dataset.mode||'practice';
    state.difficulty=$('difficulty').value;state.windEnabled=$('windOption').value==='on';
    state.stage=0;state.shots=0;state.points=[0,0];state.turn=0;
    state.aims=[{angle:45,power:70},{angle:45,power:70}];
    state.bursts=[2,2];state.battleKnots=BATTLE.map(([x,y])=>[x,y]);
    state.previous=[null,null];state.flight=null;state.explosion=null;
    $('lastShot').textContent='각도와 세기를 한 가지씩 바꾸면 차이를 더 잘 알 수 있어요.';
    state.wind=state.windEnabled?[-24,22,30,-18,14,0][0]:0;
    $('startOverlay').classList.add('hidden');$('helpOverlay').classList.add('hidden');
    clearFinish();state.recoil=[0,0];state.shake=0;state.movingPointer=null;state.lastFrame=0;
    sdk('start');
    setNotice('각도와 세기를 바꿔 첫 번째 포탄을 쏴 보세요!');
    setAim();
  }
  function openMenu(){
    generation+=1;state.phase='menu';state.flight=null;state.preview=null;
    state.movingPointer=null;clearFinish();
    $('startOverlay').classList.remove('hidden');syncControls();
  }
  function fire(byAi=false) {
    if(state.phase!=='aim') return;
    if(state.mode==='cpu' && state.turn===1 && !byAi) {
      // Computer shots arrive only through planAi; a user cannot fire for the computer.
      return;
    }
    state.phase='flight';state.preview=null;
    const side=state.turn;
    const ammo=isBattle() && state.ammo==='burst' && state.bursts[side]>0 ? 'burst':'basic';
    if(ammo==='burst')state.bursts[side]-=1;
    state.aims[side]={angle:state.angle,power:state.power};
    const shot=buildShot(side,state.angle,state.power);
    const result=P.trace({shot,knots:knots(),targets:[target(side)]});
    state.flight={shot,result,elapsed:0,side,angle:state.angle,power:state.power,ammo};
    state.shots+=1;
    state.recoil[side]=1;
    setNotice((side===0?'파란':'주황')+' 포탄이 날아가요!');
    syncControls();
  }
  function nextRound(advanced=false) {
    if(state.mode==='practice') {
      state.wind=state.windEnabled?[-24,22,30,-18,14,0][state.stage]:0;
      if(advanced){
        state.previous=[null,null];
        state.aims[0]={angle:45,power:70};
        $('lastShot').textContent='새 지형에서는 출발 높이와 과녁 위치도 살펴보세요.';
      }
      setAim();
      if(advanced)setNotice(STAGES[state.stage].tip);
    } else {
      state.turn=1-state.turn;
      if(state.windEnabled)state.wind=[-24,22,30,-18,14,0][state.shots%6];
      setAim();
      if(state.turn===0)setNotice('상대의 발사를 봤나요? 이제 파란 대포 차례예요.');
      else if(state.mode==='local2')setNotice('주황 대포 차례! 같은 기기에서 번갈아 조작하세요.');
    }
  }
  function finishFlight() {
    if(!state.flight) return;
    const f=state.flight, result=f.result;
    const blast=isBattle() && f.ammo==='burst' && result.kind==='ground' &&
      P.blastHits(result.point,tank(1-f.side),59);
    const struck=result.kind==='target'||blast;
    state.flight=null;state.phase='settle';
    state.explosion={x:result.point.x,y:result.point.y,age:0,hit:struck,radius:f.ammo==='burst'?79:50};
    state.shake=struck?11:f.ammo==='burst'?7:4;
    state.previous[f.side]=result.points;
    if(isBattle() && result.kind==='ground' && result.point.x>=0 && result.point.x<=W){
      state.battleKnots=P.craterTerrain(state.battleKnots,result.point.x,
        f.ammo==='burst'?68:39,f.ammo==='burst'?33:17);
    }
    $('lastShot').textContent='지난 발사: '+f.angle+'° · 세기 '+f.power+
      (f.ammo==='burst'?' · 펑펑탄':' · 기본탄')+' — '+(struck?'명중':'미스');
    const current=generation;
    let action='retry';
    if(state.mode==='practice') {
      if(struck) {
        const won=state.stage===STAGES.length-1;
        sdk('result',{scope:'stage',status:'completed',outcome:'clear',id:'parabola-'+(state.stage+1),shots:state.shots});
        if(won){
          state.phase='finished';action='none';
          sdk('result',{scope:'campaign',status:'completed',outcome:'clear',score:Math.max(100,1400-state.shots*60)});
          setNotice('모든 과녁 성공! '+state.shots+'번의 발사로 6단계를 완료했어요!');
          finishScreen('포물선 명사수!',state.shots+'번의 발사로 6개 과녁을 전부 맞혔어요. 각도와 세기 조절에 성공했어요!',
            state.shots<=12?'★ ★ ★':state.shots<=24?'★ ★ ☆':'★ ☆ ☆');
        } else {
          setNotice('명중! 다음은 '+STAGES[state.stage+1].name+'이에요.');
          action='advance';
        }
      } else {
        const delta=Math.round(result.point.x-goal().x);
        const guidance=Math.abs(delta)<32?'아주 가까워요!':delta<0?'과녁보다 짧게 떨어졌어요.':'과녁보다 멀리 떨어졌어요.';
        setNotice(guidance+' 이전 설정을 유지했으니 한 가지만 바꿔 보세요.');
      }
    } else {
      if(struck) {
        state.points[f.side]+=1;
        setNotice((f.ammo==='burst'&&blast?'펑펑탄 폭발! ':'')+
          (f.side===0?'파란':'주황')+' 대포 명중! '+state.points[f.side]+'점이에요.');
        if(state.points[f.side]>=3) {
          state.phase='finished';action='none';
          sdk('result',{scope:'match',status:'completed',outcome:state.mode==='cpu'?(f.side===0?'win':'loss'):'win',score:state.points[f.side],winner:f.side===0?'blue':'orange',mode:state.mode});
          setNotice((f.side===0?'파란':'주황')+' 대포 승리! 다시 시작해서 한 판 더 해요.');
          finishScreen((f.side===0?'파란':'주황')+' 대포 승리!',
            (state.mode==='cpu'&&f.side===1?'이번엔 컴퓨터가 먼저':'3점 먼저 획득!')+
            ' 총 '+state.shots+'발을 발사했어요. 다시 도전해 봐요!',
            '★ ★ ★');
        }
      } else setNotice('이번 포탄은 빗나갔어요. 다음 차례!');
      if(state.phase!=='finished')action='advance';
    }
    syncControls();
    if(action!=='none')window.setTimeout(()=>{
      if(generation!==current || state.phase!=='settle')return;
      if(state.mode==='practice' && action==='advance')state.stage+=1;
      nextRound(state.mode==='practice' && action==='advance');
    },1150);
  }
  function drawSky() {
    const mood=theme();
    const palettes={
      meadow:['#6ac1fa','#d8f2ff','#e9f8f1'],
      rock:['#78b6e7','#dee8f6','#edf2eb'],
      river:['#63b9ea','#d2f2ff','#e3f9f6'],
      snow:['#779fce','#c8e5fa','#f8fdff'],
      desert:['#f59d7b','#f7cf9c','#ffedc5']
    };
    const colors=palettes[mood];
    const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,colors[0]);sky.addColorStop(.78,colors[1]);sky.addColorStop(1,colors[2]);
    c.fillStyle=sky;c.fillRect(0,0,W,H);
    if(sprites.sky){c.save();c.globalAlpha=.16;c.drawImage(sprites.sky,0,90,W,330);c.restore();}
    c.fillStyle='#fff0a8';c.beginPath();c.arc(1035,128,50,0,TAU);c.fill();
    c.fillStyle='#ffffffbb';
    for(const [x,y,s] of [[175,162,1.2],[430,115,.9],[760,186,1.1],[995,215,.65]]){
      if(sprites.cloud){
        c.save();c.globalAlpha=.83;c.imageSmoothingEnabled=false;
        c.drawImage(sprites.cloud,x-56*s,y-29*s,112*s,52*s);c.restore();
      }else{
        c.beginPath();c.ellipse(x,y,s*58,s*19,0,0,TAU);c.ellipse(x-30*s,y+3*s,25*s,14*s,0,0,TAU);
        c.ellipse(x+30*s,y+3*s,32*s,16*s,0,0,TAU);c.fill();
      }
    }
    for(let layer=0;layer<2;layer++){
      c.fillStyle=layer===0?'#a5cfcb':'#7dbca3';c.beginPath();c.moveTo(0,H);
      for(let x=0;x<=W;x+=15){const y=(layer===0?365:445)+Math.sin(x/105+layer*2)*28+Math.cos(x/57+layer)*13;c.lineTo(x,y);}
      c.lineTo(W,H);c.closePath();c.fill();
    }
  }
  function drawTerrain() {
    const k=knots();c.beginPath();c.moveTo(0,H);c.lineTo(0,P.terrainY(k,0));
    for(let x=5;x<=W;x+=5)c.lineTo(x,P.terrainY(k,x));
    c.lineTo(W,H);c.closePath();
    const mood=theme();
    const fills={
      meadow:['#9d7951','#876442','#544433','#7fb84f','#c4e082'],
      river:['#96714e','#846341','#514334','#78ae4b','#bde280'],
      rock:['#938c80','#706e68','#414b52','#8e9980','#c5bd97'],
      snow:['#bec7cb','#889caa','#516777','#e0f4fc','#ffffff'],
      desert:['#d7a16c','#b17a4d','#79523a','#e9c27f','#f9e1aa']
    };
    const pal=fills[mood]; const fill=c.createLinearGradient(0,390,0,H);
    fill.addColorStop(0,pal[0]);fill.addColorStop(.4,pal[1]);fill.addColorStop(1,pal[2]);c.fillStyle=fill;c.fill();
    c.save();c.strokeStyle=pal[3];c.lineWidth=14;c.lineJoin='round';c.beginPath();
    for(let x=0;x<=W;x+=4){const y=P.terrainY(k,x);if(x===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
    c.strokeStyle=pal[4];c.lineWidth=4;c.stroke();c.restore();
    for(let x=35;x<W;x+=73){
      const y=P.terrainY(k,x)+24;
      if(sprites.stone){c.save();c.globalAlpha=.35;c.drawImage(sprites.stone,x,y,24,24);c.restore();}
      else{c.fillStyle='#b09a70';c.fillRect(x,y,15,8);}
    }
    for(let x=35;x<W;x+=55){
      if(Math.abs(x-135)<72||Math.abs(x-1050)<72||(!isBattle()&&Math.abs(x-goal().x)<65))continue;
      const y=P.terrainY(k,x);
      const decoration=mood==='snow'?'snow':mood==='desert'?'sand':
        mood==='rock'?'rock':Math.round(x/55)%5===0?'rock':'bush';
      if(sprites[decoration]){
        c.save();c.imageSmoothingEnabled=false;
        c.drawImage(sprites[decoration],x-17,y-28,34,29);c.restore();
      }else if(sprites.grass){
        c.save();c.globalAlpha=.75;c.imageSmoothingEnabled=false;
        c.drawImage(sprites.grass,x-12,y-12,24,24);c.restore();
      }else{
        c.strokeStyle='#558642';c.lineWidth=2;c.beginPath();
        c.moveTo(x,y);c.lineTo(x-4,y-10);c.moveTo(x,y);c.lineTo(x+4,y-9);c.stroke();
      }
    }
    if(mood==='river'){
      c.save();c.globalAlpha=.85;
      for(let x=430;x<=645;x+=18){
        const y=P.terrainY(k,x);
        if(y<554)continue;
        if(sprites.water){c.imageSmoothingEnabled=false;c.drawImage(sprites.water,x,y-10,24,16);}
        else{c.strokeStyle='#88d9eb';c.lineWidth=3;c.beginPath();c.moveTo(x-8,y-7);c.lineTo(x+11,y-7);c.stroke();}
      }
      c.restore();
    }
    if(sprites.castle && state.mode==='practice' && state.stage>=3){
      const x=625,y=P.terrainY(k,x);
      c.save();c.globalAlpha=.8;c.drawImage(sprites.castle,x-20,y-58,40,55);c.restore();
    }
  }
  function drawTank(side) {
    const p=tank(side), col=side===0?['#298bd2','#16487c','#c7f0ff']:['#f59b49','#a54a27','#fff2cc'];
    const alpha=side===0||isBattle()?1:.95;
    c.save();c.translate(p.x,p.y);c.globalAlpha=alpha;
    const kick=state.recoil[side]||0;
    c.translate((side===0?-1:1)*kick*10,Math.sin(kick*Math.PI)*kick*3);
    c.fillStyle='#162d3d';c.beginPath();c.ellipse(0,20,43,15,0,0,TAU);c.fill();
    for(let x=-28;x<=28;x+=14){c.fillStyle='#8497a1';c.beginPath();c.arc(x,20,7,0,TAU);c.fill();c.fillStyle='#253b4b';c.beginPath();c.arc(x,20,3,0,TAU);c.fill();}
    const aiming=(state.turn===side&&state.phase!=='menu')?state.angle:45;
    const r=aiming*Math.PI/180,dir=side===0?1:-1;
    c.strokeStyle=col[1];c.lineWidth=21;c.lineCap='round';c.beginPath();c.moveTo(0,-4);c.lineTo(dir*Math.cos(r)*39,-Math.sin(r)*39-4);c.stroke();
    c.strokeStyle=col[2];c.lineWidth=5;c.beginPath();c.moveTo(dir*Math.cos(r)*23,-Math.sin(r)*23-4);c.lineTo(dir*Math.cos(r)*37,-Math.sin(r)*37-4);c.stroke();
    c.fillStyle=col[0];c.beginPath();c.roundRect(-39,0,78,23,10);c.fill();
    c.fillStyle=col[1];c.beginPath();c.roundRect(-23,-12,46,24,11);c.fill();
    c.fillStyle=col[2];c.beginPath();c.arc(0,-6,7,0,TAU);c.fill();
    c.fillStyle='#ffffff99';c.fillRect(-22,7,39,3);
    c.fillStyle='#e7f4ff';c.beginPath();c.arc(-8,-7,3,0,TAU);c.arc(8,-7,3,0,TAU);c.fill();
    c.fillStyle='#172d4f';c.fillRect(-8,-8,2,2);c.fillRect(8,-8,2,2);
    c.restore();
    const flag=side===0?'flagBlue':'flagRed';
    if(sprites[flag]){
      c.save();c.imageSmoothingEnabled=false;
      c.drawImage(sprites[flag],p.x-20,p.y-83,35,39);c.restore();
    }
    if(state.turn===side && (state.phase==='aim'||state.phase==='flight')){
      c.fillStyle='#fff';c.font='bold 15px system-ui';c.textAlign='center';
      c.fillText('▼',p.x,p.y-75);c.textAlign='left';
    }
  }
  function drawTarget() {
    const p=goal();
    c.fillStyle='#f5f0df';c.fillRect(p.x-4,p.y+15,8,38);
    c.fillStyle='#ffa832';c.beginPath();c.arc(p.x,p.y,p.radius,0,TAU);c.fill();
    c.fillStyle='#fff6cf';c.beginPath();c.arc(p.x,p.y,20,0,TAU);c.fill();
    c.fillStyle='#ef6c48';c.beginPath();c.arc(p.x,p.y,12,0,TAU);c.fill();
    c.fillStyle='#fff';c.beginPath();c.arc(p.x,p.y,4,0,TAU);c.fill();
    c.font='bold 16px system-ui';c.textAlign='center';c.fillStyle='#35506e';c.fillText('과녁',p.x,p.y-42);c.textAlign='left';
  }
  function drawPrediction() {
    if(state.difficulty!=='easy'||!state.preview||state.phase!=='aim')return;
    const route=state.preview.points;
    if(!route||route.length<2)return;
    const highest=route.reduce((best,point)=>point.y<best.y?point:best,route[0]);
    if(highest.x>65&&highest.x<W-65&&highest.y>74){
      c.save();c.fillStyle='#fffdf3';c.strokeStyle='#2a709e';c.lineWidth=3;
      c.beginPath();c.arc(highest.x,highest.y,7,0,TAU);c.fill();c.stroke();
      c.font='bold 14px system-ui';c.textAlign='center';c.fillStyle='#1b4c72';
      c.fillText('가장 높은 곳',highest.x,highest.y-17);c.restore();
    }
    const landing=state.preview.point;
    if(landing&&landing.x>=12&&landing.x<=W-12&&landing.y>60&&landing.y<H){
      c.save();c.strokeStyle='#ffffff';c.lineWidth=3;
      c.beginPath();c.arc(landing.x,landing.y,13,0,TAU);c.stroke();c.restore();
    }
  }
  function drawTrail(points, color, width, dash, stride=4) {
    if(!points||points.length<2)return;
    c.save();c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.lineCap='round';c.beginPath();
    for(let i=0;i<points.length;i+=stride){const p=points[i];if(i===0)c.moveTo(p.x,p.y);else c.lineTo(p.x,p.y);}
    const tail=points[points.length-1];c.lineTo(tail.x,tail.y);c.stroke();c.restore();
  }
  function drawProjectile(point, ammo) {
    const big=ammo==='burst';
    const sprite=sprites[big?'bomb':'fireball'];
    if(sprite){
      c.save();c.imageSmoothingEnabled=false;
      c.drawImage(sprite,point.x-(big?18:14),point.y-(big?18:14),big?36:28,big?36:28);c.restore();
      return;
    }
    c.save();c.shadowBlur=big?30:22;c.shadowColor=big?'#ff7466':'#ffd060';
    c.fillStyle=big?'#ffad83':'#fff5cf';c.beginPath();c.arc(point.x,point.y,big?14:10,0,TAU);c.fill();
    c.shadowBlur=0;c.fillStyle=big?'#c94a49':'#f99f43';c.beginPath();
    c.arc(point.x,point.y,big?8:6,0,TAU);c.fill();c.restore();
  }
  function drawExplosion() {
    if(!state.explosion)return;
    const e=state.explosion, alpha=Math.max(0,1-e.age/1);
    if(alpha<=0)return;
    c.save();c.globalAlpha=alpha;c.strokeStyle=e.hit?'#ffeb80':'#ffd096';c.lineWidth=8;c.beginPath();c.arc(e.x,e.y,12+(e.radius||50)*e.age,0,TAU);c.stroke();
    for(let i=0;i<9;i++){const a=i*TAU/9;c.fillStyle=i%2?'#fff2b1':'#ff994f';c.beginPath();
      c.arc(e.x+Math.cos(a)*(20+78*e.age),e.y+Math.sin(a)*(20+78*e.age),Math.max(0,8-e.age*7),0,TAU);c.fill();}
    if(e.hit&&sprites.star&&alpha>.2){
      c.save();c.imageSmoothingEnabled=false;c.globalAlpha=alpha;
      c.drawImage(sprites.star,e.x-20,e.y-60-e.age*55,40,40);c.restore();
    }
    c.restore();
  }
  function render() {
    c.clearRect(0,0,W,H);
    c.save();
    if(state.shake>0){
      c.translate(Math.sin(state.shake*7)*state.shake*.55,
        Math.cos(state.shake*9)*state.shake*.45);
    }
    drawSky();drawTerrain();
    if(state.difficulty!=='hard' && state.phase!=='menu'){
      drawTrail(state.previous[state.turn],'#ffed9c',3,[7,9],6);
      if(state.difficulty==='easy'&&state.preview)drawTrail(state.preview.points,'#ffffffda',3,[3,9],5);
    }
    drawPrediction();
    if(!isBattle())drawTarget();
    drawTank(0);if(isBattle())drawTank(1);
    if(state.flight){
      const {shot,result,elapsed}=state.flight;
      const position=P.at(shot,Math.min(elapsed,result.time));
      drawProjectile(position,state.flight.ammo);
      const shown=result.points.filter((_,i)=>i*P.STEP<=elapsed);
      if(shown.length)drawTrail(shown,'#fff8d9',4,[],3);
    }
    drawExplosion();
    c.restore();
    if(state.celebration>0){
      c.save();c.fillStyle='#fff7b4';c.textAlign='center';
      c.font='900 22px system-ui';c.fillText('★  ★  ★',600,148);c.restore();
    }
  }
  function frame(time) {
    const dt=state.lastFrame?Math.min(.05,(time-state.lastFrame)/1000):0;
    state.lastFrame=time;
    if(state.flight){state.flight.elapsed+=dt*1.35;if(state.flight.elapsed>=state.flight.result.time)finishFlight();}
    if(state.explosion)state.explosion.age+=dt;
    state.shake=Math.max(0,state.shake-dt*38);
    state.recoil=state.recoil.map(value=>Math.max(0,value-dt*4));
    state.celebration=Math.max(0,state.celebration-dt);
    render();requestAnimationFrame(frame);
  }
  document.querySelectorAll('.mode').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('selected',b===button));
  }));
  $('angle').addEventListener('input',adjust);$('power').addEventListener('input',adjust);
  $('ammo').addEventListener('change',()=>{
    state.ammo=$('ammo').value;
    if(state.ammo==='burst' && (!isBattle()||state.bursts[state.turn]===0))state.ammo='basic';
    syncControls();
  });
  $('fire').addEventListener('click',()=>{if(state.mode!=='cpu'||state.turn!==1)fire();});
  $('start').addEventListener('click',startGame);
  $('reset').addEventListener('click',()=>{if(state.phase!=='menu')startGame();});
  $('menu').addEventListener('click',openMenu);
  $('playAgain').addEventListener('click',startGame);
  $('chooseMode').addEventListener('click',openMenu);
  $('help').addEventListener('click',()=>$('helpOverlay').classList.remove('hidden'));
  $('closeHelp').addEventListener('click',()=>$('helpOverlay').classList.add('hidden'));
  // Direct manipulation: drag near the cannon to change angle, without firing.
  // All pointer coordinates are converted to the fixed 1200 x 650 canvas space.
  function canvasPoint(event) {
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    return {x:(event.clientX-rect.left)*W/rect.width,y:(event.clientY-rect.top)*H/rect.height};
  }
  function pointerAim(event) {
    if(state.phase!=='aim'||(state.mode==='cpu'&&state.turn===1))return false;
    const point=canvasPoint(event), p=tank(state.turn);
    if(!point)return false;
    const forward=state.turn===0?point.x-p.x:p.x-point.x;
    const vertical=p.y-7-point.y;
    const angle=Math.atan2(vertical,Math.max(0.001,forward))*180/Math.PI;
    if(forward<0||Math.abs(point.x-p.x)>390||Math.abs(point.y-p.y)>340)return false;
    state.angle=Math.round(P.clamp(angle,5,85));
    computePreview();syncControls();
    return true;
  }
  canvas.addEventListener('pointerdown',event=>{
    if(state.phase!=='aim'||(state.mode==='cpu'&&state.turn===1))return;
    const point=canvasPoint(event),p=tank(state.turn);
    if(!point||Math.hypot(point.x-p.x,point.y-p.y)>255)return;
    state.movingPointer=event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    pointerAim(event);
  });
  canvas.addEventListener('pointermove',event=>{
    if(state.movingPointer!==null&&event.pointerId===state.movingPointer)pointerAim(event);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
    canvas.addEventListener(type,event=>{
      if(state.movingPointer===event.pointerId)state.movingPointer=null;
    });
  }
  window.addEventListener('keydown',e=>{
    if(state.phase!=='aim'||(state.mode==='cpu'&&state.turn===1)||$('helpOverlay').classList.contains('hidden')===false)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
    if(e.code==='ArrowUp')state.power=P.clamp(state.power+2,10,100);
    if(e.code==='ArrowDown')state.power=P.clamp(state.power-2,10,100);
    if(e.code==='ArrowRight')state.angle=P.clamp(state.angle+2,5,85);
    if(e.code==='ArrowLeft')state.angle=P.clamp(state.angle-2,5,85);
    if(e.code==='Space'){fire();return;}
    if(e.code.startsWith('Arrow')){computePreview();syncControls();}
  });
  window.addEventListener('blur',()=>{state.lastFrame=0;});
  syncControls();requestAnimationFrame(frame);
})();
