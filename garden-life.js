/* Kidscade Garden Life: avatar daily life + decorative garden facilities. */
(function (root) {
  'use strict';

  const API = root.KidscadeGarden;
  if (!API || API.__gardenLifeInstalled) return;
  API.__gardenLifeInstalled = true;

  const KEY = API.KEY || 'kidscade_garden_v1';
  const COLS = 12, ROWS = 8;
  const reduced = root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const extra = {
    flower:{name:'사계절 꽃밭',icon:'🌷',cost:120,w:1,h:1,action:'idle',users:['rabbit','goat','parrot','sugarGlider'],desc:'내 캐릭터가 꽃향기를 맡고, 작은 친구들이 주변을 구경해요.',human:'sniff'},
    shadeTree:{name:'그늘 쉼터 나무',icon:'🌳',cost:360,w:2,h:2,action:'climb',users:['cat','iguana','sugarGlider','parrot','rabbit'],desc:'나무 아래에 앉아 쉬거나 동물 친구들이 가지에 올라가요.',human:'rest'},
    bench:{name:'정원 벤치',icon:'🪑',cost:240,w:2,h:1,action:'sleep',users:['cat','rabbit'],desc:'산책하다 잠깐 앉아 쉬는 자리예요.',human:'sit'},
    picnic:{name:'피크닉 매트',icon:'🧺',cost:320,w:2,h:2,action:'feed',users:['dog','rabbit','miniPig','hamster'],desc:'친구들과 간식을 먹고 놀 수 있는 피크닉 자리예요.',human:'picnic'},
    hammock:{name:'낮잠 해먹',icon:'🏕️',cost:460,w:2,h:1,action:'sleep',users:['cat','sugarGlider'],desc:'바람을 맞으며 느긋하게 낮잠을 자요.',human:'sleep'}
  };
  Object.assign(API.facilities, extra);

  function rr(c,x,y,w,h,r,fill,stroke){
    c.beginPath(); c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h); c.lineTo(x+r,y+h);
    c.quadraticCurveTo(x,y+h,x,y+h-r); c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
    if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.stroke();}
  }
  function flower(c,x,y,t,a){
    c.save(); c.translate(x,y); c.fillStyle='rgba(55,110,72,.18)'; c.beginPath(); c.ellipse(0,16,38,13,0,0,Math.PI*2); c.fill();
    c.strokeStyle='#4f8a54'; c.lineWidth=4; c.lineCap='round';
    const fs=[[-24,-2,'#ff7aa8'],[-10,-12,'#ffd257'],[7,-5,'#9d7bff'],[22,-15,'#ff8d62'],[27,2,'#6ed0ff'],[-2,5,'#ff7aa8']];
    fs.forEach(([fx,fy,col],i)=>{const sw=Math.sin(t*2+i)*2*(a?1.4:.6); c.beginPath(); c.moveTo(fx,16); c.quadraticCurveTo(fx+sw,4,fx+sw,fy); c.stroke(); c.fillStyle=col;
      for(let q=0;q<5;q++){const ang=q*Math.PI*2/5; c.beginPath(); c.arc(fx+sw+Math.cos(ang)*5,fy+Math.sin(ang)*5,4,0,Math.PI*2); c.fill();}
      c.fillStyle='#ffd84e'; c.beginPath(); c.arc(fx+sw,fy,3,0,Math.PI*2); c.fill();}); c.restore();
  }
  function tree(c,x,y,t,a){
    c.save(); c.translate(x,y); c.fillStyle='rgba(47,86,54,.18)'; c.beginPath(); c.ellipse(0,26,64,15,0,0,Math.PI*2); c.fill();
    c.strokeStyle='#815538'; c.lineWidth=16; c.lineCap='round'; c.beginPath(); c.moveTo(0,24); c.lineTo(-2,-46); c.stroke();
    c.lineWidth=8; c.beginPath(); c.moveTo(-2,-25); c.lineTo(-31,-51); c.moveTo(-1,-31); c.lineTo(31,-58); c.stroke();
    const b=a?Math.sin(t*2)*2:0; [[-38,-56,28],[-12,-70,31],[18,-70,32],[43,-52,27],[-8,-45,32],[25,-43,28]].forEach(([lx,ly,r],i)=>{c.fillStyle=i%2?'#6fc46f':'#5ab663';c.beginPath();c.arc(lx,ly+b,r,0,Math.PI*2);c.fill();});
    c.fillStyle='#ffd7e6'; [[-34,-62],[-3,-78],[25,-68],[43,-49],[9,-48]].forEach(([lx,ly])=>{c.beginPath();c.arc(lx,ly+b,4,0,Math.PI*2);c.fill();}); c.restore();
  }
  function bench(c,x,y){
    c.save(); c.translate(x,y); c.fillStyle='rgba(63,47,42,.16)'; c.beginPath(); c.ellipse(0,19,56,10,0,0,Math.PI*2); c.fill();
    c.strokeStyle='#6f4b32'; c.lineWidth=6; c.lineCap='round'; c.beginPath(); c.moveTo(-40,4); c.lineTo(-43,25); c.moveTo(40,4); c.lineTo(43,25); c.stroke();
    for(let i=0;i<3;i++) rr(c,-52,-23+i*12,104,9,4,i===1?'#bd7b42':'#cf8c4b','#754826'); rr(c,-48,10,96,10,5,'#c98547','#754826'); c.restore();
  }
  function picnic(c,x,y,t,a){
    c.save(); c.translate(x,y); c.rotate(-.03); rr(c,-62,-28,124,72,10,'#fff5e6','#d58b8b'); c.globalAlpha=.23; c.fillStyle='#ef6b74';
    for(let xx=-48;xx<=48;xx+=24)c.fillRect(xx,-27,10,70); for(let yy=-15;yy<=27;yy+=20)c.fillRect(-61,yy,122,8); c.globalAlpha=1;
    c.font='30px sans-serif'; c.textAlign='center'; c.fillText('🧺',25,8+(a?Math.sin(t*3)*2:0)); c.font='22px sans-serif'; c.fillText('🍎',-24,19); c.fillText('🥪',4,30); c.restore();
  }
  function hammock(c,x,y,t,a){
    c.save(); c.translate(x,y); c.strokeStyle='#7d553a'; c.lineWidth=8; c.lineCap='round'; c.beginPath(); c.moveTo(-50,28); c.lineTo(-44,-36); c.moveTo(50,28); c.lineTo(44,-36); c.stroke();
    c.strokeStyle='#d7a351'; c.lineWidth=4; c.beginPath(); c.moveTo(-43,-23); c.quadraticCurveTo(0,25+(a?Math.sin(t*2)*2:0),43,-23); c.stroke();
    c.strokeStyle='#f1c86f'; c.lineWidth=14; c.beginPath(); c.moveTo(-37,-18); c.quadraticCurveTo(0,18+(a?Math.sin(t*2)*2:0),37,-18); c.stroke(); c.restore();
  }
  function drawExtra(c,k,x,y,t,a){ if(k==='flower')flower(c,x,y,t,a); if(k==='shadeTree')tree(c,x,y,t,a); if(k==='bench')bench(c,x,y); if(k==='picnic')picnic(c,x,y,t,a); if(k==='hammock')hammock(c,x,y,t,a); }

  const init0 = API.init;
  API.init = function (bridge) {
    const avatar0 = bridge.avatar;
    let action='idle', auto=true, planned=null, next=0, end=0, canvas=null, host=null;
    let avatarCell={x:6,y:6}, synced=false, lifeToken=0, userMoveToken=0;

    const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{};}catch(_){return{};}};
    function free(s){const p=Array.isArray(s.placed)?s.placed:[],out=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!p.some(i=>{const f=API.facilities[i.kind];return f&&x>=i.x&&x<i.x+f.w&&y>=i.y&&y<i.y+f.h;}))out.push({x,y});return out;}
    function near(i,s){const f=API.facilities[i.kind],o=[];if(!f)return o;for(let x=i.x;x<i.x+f.w;x++)o.push({x,y:i.y+f.h},{x,y:i.y-1});for(let y=i.y;y<i.y+f.h;y++)o.push({x:i.x-1,y},{x:i.x+f.w,y});const ok=new Set(free(s).map(p=>p.x+','+p.y));return o.filter(p=>p.x>=0&&p.y>=0&&p.x<COLS&&p.y<ROWS&&ok.has(p.x+','+p.y));}
    function clickCell(p){if(!canvas||!p)return;const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const px=60+(p.x+.5)*73,py=120+(p.y+.5)*61,cx=r.left+px/1000*r.width,cy=r.top+py/680*r.height;canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:cx,clientY:cy,pointerId:91,pointerType:'mouse',isPrimary:true}));canvas.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:cx,clientY:cy,pointerId:91,pointerType:'mouse',isPrimary:true}));}
    const visible=()=>{const m=document.getElementById('pet-modal');return !document.hidden&&(!m||!m.classList.contains('hidden'))&&host?.classList.contains('active');};
    const editing=()=>document.getElementById('garden-edit')?.getAttribute('aria-pressed')==='true'||!document.getElementById('garden-cancel')?.hidden;
    function say(t){const e=document.getElementById('garden-live');if(e)e.textContent=t;}
    function bubble(t,ms=1700){const e=document.getElementById('garden-avatar-life-bubble');if(!e)return;e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),ms);}

    function avatar(){
      let svg=''; try{svg=avatar0?.()||'';}catch(_){return'';} if(!svg)return'';
      let href=(svg.match(/<image[^>]+href=["']([^"']+)["']/i)||[])[1];
      if(!href)href='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
      const n=Date.now(); let tr='', pre='', ex='';
      if(['sit','rest','picnic'].includes(action)) tr='translate(0 22) scale(1 .80)';
      else if(action==='sleep') { tr='translate(0 38) scale(1 .70)'; pre='<ellipse cx="64" cy="145" rx="45" ry="10" fill="#f4dbe8" opacity=".9"/><rect x="24" y="133" width="80" height="17" rx="8" fill="#c9b8ef" opacity=".72"/>'; }
      else if(action==='sniff') tr='translate(0 8) rotate(5 64 110)';
      else if(action==='hello') tr=`rotate(${Math.sin(n/180)*4} 64 120)`;
      else if(['play','jump'].includes(action)) tr=`translate(0 ${-Math.abs(Math.sin(n/220))*7})`;
      if(action==='sleep') ex='<text x="92" y="53" font-size="18">💤</text>';
      if(action==='hello') ex='<text x="93" y="56" font-size="15">👋</text>';
      if(action==='sniff') ex='<text x="92" y="55" font-size="14">🌸</text>';
      if(action==='play') ex='<text x="90" y="52" font-size="14">💗</text>';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 160">${pre}<g transform="${tr}"><image href="${href}" width="128" height="160"/></g>${ex}</svg>`;
    }

    const wrapped={...bridge,avatar,facility(c,k,x,y,t,a){if(extra[k])drawExtra(c,k,x,y,t,a);else bridge.facility?.(c,k,x,y,t,a);}};
    const controller=init0(wrapped);

    function ui(){
      host=document.querySelector('[data-sook-panel="room"]'); canvas=document.getElementById('garden-canvas');
      const actions=host?.querySelector('.garden-view-actions');
      if(actions&&!document.getElementById('garden-life-toggle')){
        actions.insertAdjacentHTML('beforeend','<button type="button" id="garden-life-now">🎲 뭐 할까?</button><button type="button" id="garden-life-toggle" aria-pressed="true">🏡 자유생활 ON</button>');
        document.getElementById('garden-life-now').addEventListener('click',()=>plan(true));
        document.getElementById('garden-life-toggle').addEventListener('click',e=>{auto=!auto;lifeToken++;planned=null;action='idle';e.currentTarget.setAttribute('aria-pressed',String(auto));e.currentTarget.textContent=auto?'🏡 자유생활 ON':'⏸️ 자유생활 OFF';say(auto?'내 캐릭터가 다시 정원 생활을 시작했어요.':'내 캐릭터가 잠깐 쉬고 있어요.');if(auto){next=Date.now()+300;plan(true);}});
      }
      const view=host?.querySelector('.garden-view');
      if(view&&!document.getElementById('garden-avatar-life-bubble')){
        view.style.position='relative'; const b=document.createElement('div'); b.id='garden-avatar-life-bubble';
        b.style.cssText='position:absolute;left:50%;top:10px;z-index:6;padding:6px 11px;border-radius:999px;background:rgba(255,255,255,.92);border:1px solid rgba(109,91,165,.18);font-weight:900;font-size:13px;color:#625775;pointer-events:none;opacity:0;transform:translate(-50%,6px);transition:.18s;box-shadow:0 6px 18px rgba(36,27,54,.12)';
        const st=document.createElement('style'); st.textContent='#garden-avatar-life-bubble.show{opacity:1!important;transform:translate(-50%,0)!important}'; document.head.appendChild(st); view.appendChild(b);
      }
      if(canvas&&!canvas.dataset.gardenLifeManual){
        canvas.dataset.gardenLifeManual='true';
        canvas.addEventListener('pointerdown',e=>{
          if(e.pointerId===91||editing())return;
          const r=canvas.getBoundingClientRect(); if(!r.width||!r.height)return;
          const px=(e.clientX-r.left)/r.width*1000, py=(e.clientY-r.top)/r.height*680;
          const target={x:Math.max(0,Math.min(COLS-1,Math.floor((px-60)/73))),y:Math.max(0,Math.min(ROWS-1,Math.floor((py-120)/61)))};
          const state=read(), start={x:avatarCell.x+.5,y:avatarCell.y+.5}, dest={x:target.x+.5,y:target.y+.5};
          const path=synced?API.route(state.placed||[],start,dest):[]; const ms=synced?Math.max(1100,path.length*650+700):7000;
          lifeToken++; planned=null; action='walk'; next=Date.now()+ms+1800; end=Date.now()+ms;
          const token=++userMoveToken;
          setTimeout(()=>{if(token!==userMoveToken)return;avatarCell=target;synced=true;action='idle';},ms);
        },true);
      }
    }

    function choose(){
      const s=read(),placed=Array.isArray(s.placed)?s.placed:[],o=[];
      for(const i of placed){const f=API.facilities[i.kind],cells=near(i,s);if(!f||!cells.length)continue;const h=f.human||(i.kind==='bed'?'sleep':i.kind==='ball'?'play':i.kind==='platform'?'jump':null);if(h)o.push({type:'facility',item:i,cell:cells[Math.floor(Math.random()*cells.length)],action:h});}
      const fc=free(s); if(fc.length){o.push({type:'wander',cell:fc[Math.floor(Math.random()*fc.length)],action:'idle'});o.push({type:'friends',cell:fc[Math.floor(Math.random()*fc.length)],action:Math.random()<.5?'hello':'play'});} return o[Math.floor(Math.random()*o.length)]||null;
    }

    function travelMs(p){
      if(!synced)return 9000;
      const s=read(),start={x:avatarCell.x+.5,y:avatarCell.y+.5},dest={x:p.cell.x+.5,y:p.cell.y+.5};
      const path=API.route(s.placed||[],start,dest);
      return Math.max(1100,path.length*650+700);
    }

    function begin(p,token){
      if(!p||token!==lifeToken||!auto||!visible()||editing())return;
      avatarCell={x:p.cell.x,y:p.cell.y}; synced=true; action=p.action;
      const f=p.item&&API.facilities[p.item.kind],m={sleep:'낮잠 시간... 😴',sit:'벤치에서 잠깐 쉬는 중',rest:'나무 그늘에서 쉬는 중 🌿',sniff:'꽃향기 맡는 중 🌸',picnic:'피크닉 간식 시간! 🧺',jump:'폴짝! 발판 놀이 중',play:'동물 친구들과 노는 중 💗',hello:'친구들에게 인사하는 중 👋',idle:'정원을 산책하는 중'};
      bubble(m[p.action]||'정원에서 쉬는 중'); if(f)say(`내 캐릭터 · ${f.name}에서 ${m[p.action]||'쉬는 중'}`);
      if(p.type==='friends'){document.getElementById('garden-call')?.click();say(p.action==='play'?'동물 친구들이 내 캐릭터와 같이 놀러 와요!':'내 캐릭터가 손을 흔들자 친구들이 모여들어요!');}
      const d={sleep:9000,sit:6000,rest:6500,sniff:4200,picnic:6500,jump:3600,play:6500,hello:5000,idle:3500}[p.action]||4500; end=Date.now()+d; next=end+900+Math.random()*1800;
    }

    function plan(force=false){
      ui(); if(reduced&&!force)return; if(!visible()||editing()){next=Date.now()+1800;return;}
      const p=choose(); if(!p)return; const token=++lifeToken; planned=p; action='walk'; const ms=travelMs(p);
      clickCell(p.cell); bubble(p.type==='friends'?'친구들을 만나러 가는 중 🐾':'총총 산책 중 🎵',Math.min(1800,ms)); end=Date.now()+ms;
      setTimeout(()=>begin(p,token),ms);
    }

    function tick(){
      ui(); const now=Date.now();
      if(action!=='walk'&&now>end&&planned){planned=null;action='idle';}
      if(auto&&visible()&&!editing()&&now>next&&now>end&&!planned)plan();
      requestAnimationFrame(tick);
    }

    setTimeout(()=>{ui();next=Date.now()+1000;requestAnimationFrame(tick);},0);
    return controller;
  };
})(typeof window==='undefined'?globalThis:window);
