/* Kidscade World v2 integration.
   The old Life World v1 entry is retired: the garden button now opens World v2 directly.
   Existing garden saves are not mutated by this layer. */
(function(root){
  'use strict';

  const OVERLAY_ID='kidscade-life-world-overlay';
  const FRAME_ID='kidscade-life-world-frame';
  const WORLD_URL='world-v3/kidscade-world.html?v=28';
  let overlay=null, frame=null, activated=false;
  const CUBE_PET_NAMES={dog:'강아지',cat:'고양이',bunny:'토끼',pig:'돼지',cow:'소',chick:'병아리',fox:'여우',deer:'사슴',parrot:'앵무새',beaver:'비버'};
  const CUBE_PET_ICONS={dog:'🐶',cat:'🐱',bunny:'🐰',pig:'🐷',cow:'🐮',chick:'🐥',fox:'🦊',deer:'🦌',parrot:'🦜',beaver:'🦫'};
  function cubePetsSnapshot(){
    try{
      const raw=JSON.parse(localStorage.getItem('kidscade_world_v2')||'null');
      const pets=raw?.progression?.cubePets||{};
      const owned=Array.isArray(pets.owned)?pets.owned.filter(id=>CUBE_PET_NAMES[id]):[];
      const companion=CUBE_PET_NAMES[pets.companion]?pets.companion:(owned[0]||'');
      return {owned,companion};
    }catch(_){return {owned:[],companion:''}}
  }
  function ripeCropCount(){
    try{
      const raw=JSON.parse(localStorage.getItem('kidscade_world_v2')||'null');
      const crops=raw?.progression?.crops||{};let n=0;
      for(const crop of Object.values(crops)){
        if(!crop||typeof crop!=='object')continue;
        if(crop.phase==='ripe'||(crop.phase==='growing'&&Number(crop.readyAt)>0&&Date.now()>=Number(crop.readyAt)))n++;
      }
      return n;
    }catch(_){return 0}
  }

  function ripeOrchardCount(){
    try{
      const raw=JSON.parse(localStorage.getItem('kidscade_world_v2')||'null');
      const p=raw?.progression||{},level=Math.max(0,Math.min(5,Number(p.development?.orchardLevel)||0));
      const counts=[0,1,2,4,6,9],unlocked=counts[level]||0,day=Number(p.survival?.day)||1,harvests=p.orchard?.harvests||{};
      let ready=0;for(let idx=0;idx<unlocked;idx++)if(Number(harvests['orchard-'+idx]||0)!==day)ready++;
      return ready;
    }catch(_){return 0}
  }

  function villageStars(){
    try{
      const raw=JSON.parse(localStorage.getItem('kidscade_world_v2')||'null');
      const d=raw?.progression?.development||{};
      const score=Math.max(0,(Number(d.farmLevel)||1)-1)+Math.max(0,Number(d.fishingLevel)||0)+
        Math.max(0,(Number(d.stoneMineLevel)||1)-1)+Math.max(0,(Number(d.ironMineLevel)||1)-1)+Math.max(0,(Number(d.techLevel)||1)-1)+
        Math.max(0,Number(d.orchardLevel)||0)+Math.max(0,Number(d.ranchLevel)||0)+Math.max(0,Number(d.waterLevel)||0)+
        Math.max(0,(Number(d.houseLevel)||1)-1)+Math.max(0,Number(d.carpenterLevel)||0);
      if(score>=22)return 5;if(score>=15)return 4;if(score>=9)return 3;if(score>=4)return 2;return 1;
    }catch(_){return 1}
  }
  function syncWorldEntryStatus(){
    const btn=document.getElementById('btn-open-shop')||document.querySelector('[data-open-life-world="profile-world"]');
    if(!btn)return;
    const meta=root.KidscadeSeedWorldMeta?.summary?.()||{pendingMail:0,dailyDone:0,dailyTotal:3};
    const ripe=ripeCropCount(),orchard=ripeOrchardCount();
    const extras=[];
    if(meta.pendingMail>0)extras.push('📬 '+meta.pendingMail);
    if(ripe>0)extras.push('🥕 '+ripe);
    if(orchard>0)extras.push('🍎 '+orchard);
    btn.textContent='🌱 씨앗 월드 · '+ '⭐'.repeat(villageStars())+(extras.length?' · '+extras.join(' · '):'');
    btn.classList.toggle('has-world-alert',meta.pendingMail>0||ripe>0);
    btn.setAttribute('aria-label',extras.length?'씨앗 월드 · '+extras.join(' · '):'씨앗 월드');
    const seedLine=document.getElementById('avatar-plaza-seeds');
    if(seedLine){
      const taskText=(Number(meta.dailyDone)||0)+'/'+(Number(meta.dailyTotal)||3);
      seedLine.textContent='🏘️ '+ '⭐'.repeat(villageStars())+' · '+(meta.pendingMail>0?'📬 택배 '+meta.pendingMail+' · ':'')+'📋 오늘 '+taskText+' · 🌱 '+(root.KidscadeSeedWallet?.get?.()??Number(localStorage.getItem('kidscade_coins')||0));
    }
  }

  function syncCubePetsSidebar(){
    const s=cubePetsSnapshot(),total=Object.keys(CUBE_PET_NAMES).length,id=s.companion;
    const title=document.getElementById('sidebar-pet-title');
    const sub=document.getElementById('sidebar-pet-sub');
    const talk=document.getElementById('sidebar-pet-talk');
    const avatar=document.getElementById('sidebar-pet-avatar');
    const fill=document.getElementById('sidebar-pet-fill');
    const card=document.getElementById('kc-pet-card');
    const openBtn=document.getElementById('sidebar-pet-open');
    if(title)title.textContent=`Cube Pets · ${s.owned.length}/${total}`;
    if(sub)sub.textContent=id?`동행: ${CUBE_PET_NAMES[id]}`:'월드에서 첫 친구를 만나보세요';
    if(talk)talk.textContent='정원 없이 월드에서 만나고 길들이고 함께 탐험해요.';
    if(avatar)avatar.textContent=id?(CUBE_PET_ICONS[id]||'🐾'):'🐾';
    if(fill)fill.style.width=`${Math.round(s.owned.length/total*100)}%`;
    if(card){
      card.setAttribute('aria-label','Cube Pets 현황');
      card.removeAttribute('role');
      card.removeAttribute('tabindex');
      delete card.dataset.openLifeWorld;
    }
    if(openBtn)openBtn.remove();
  }

  function installStyles(){
    if(document.getElementById('kidscade-life-world-style'))return;
    const style=document.createElement('style');
    style.id='kidscade-life-world-style';
    style.textContent=`
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:29000;background:rgba(22,27,22,.72);backdrop-filter:blur(7px);display:none;padding:10px}
      #${OVERLAY_ID}.open{display:grid;grid-template-rows:auto minmax(0,1fr)}
      #kidscade-life-world-bar{width:min(1500px,100%);margin:0 auto;background:#f4e7b9;color:#30382a;border:3px solid #30382a;border-bottom:0;border-radius:10px 10px 0 0;padding:8px 12px 8px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:5px 6px 0 rgba(0,0,0,.22);box-sizing:border-box}
      #kidscade-life-world-bar strong{font-size:1rem}#kidscade-life-world-bar span{font-size:.78rem;opacity:.72;margin-left:8px}
      #kidscade-life-world-close{border:2px solid #5e684e;background:#fff7d1;color:#30382a;border-radius:6px;padding:7px 12px;font-weight:900;cursor:pointer}
      [data-open-life-world="garden-entry"]{margin-left:auto;border:2px solid #5e684e;background:#ecf8df;color:#35533a;border-radius:8px;padding:8px 12px;font-weight:900;cursor:pointer;white-space:nowrap}
      #btn-open-shop.has-world-alert{position:relative;box-shadow:0 0 0 3px rgba(245,158,11,.20),0 8px 20px rgba(217,119,6,.20);animation:kidscadeWorldAttention 1.7s ease-in-out infinite}
      #btn-open-shop.has-world-alert:after{content:"!";position:absolute;right:-7px;top:-8px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#ef4444;color:#fff;font-size:12px;font-weight:1000;border:2px solid #fff}
      @keyframes kidscadeWorldAttention{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
      #${FRAME_ID}{display:block;width:min(1500px,100%);height:100%;margin:0 auto;border:3px solid #30382a;border-radius:0 0 10px 10px;background:#111a14;box-shadow:5px 8px 0 rgba(0,0,0,.24)}
      @media(max-width:700px){#${OVERLAY_ID}{padding:0}#kidscade-life-world-bar{border-radius:0;border-left:0;border-right:0}#kidscade-life-world-bar span{display:none}#${FRAME_ID}{border-radius:0;border-left:0;border-right:0;border-bottom:0}}
    `;
    document.head.appendChild(style);
  }

  function installEntryButton(){
    if(document.querySelector('[data-open-life-world="garden-entry"]'))return true;
    const heading=document.querySelector('.garden-heading');if(!heading)return false;
    const btn=document.createElement('button');btn.type='button';btn.dataset.openLifeWorld='garden-entry';btn.textContent='🌿 생활 월드';btn.setAttribute('aria-label','Kidscade 생활 월드 v3 들어가기');heading.appendChild(btn);return true;
  }

  function ensure(){
    if(overlay)return;installStyles();overlay=document.createElement('div');overlay.id=OVERLAY_ID;overlay.setAttribute('aria-hidden','true');overlay.innerHTML=`
      <div id="kidscade-life-world-bar"><div><strong>🌱 씨앗 월드</strong><span>게임 선물 · 오늘 할 일 · 집 꾸미기 · Cube Pets · 농사와 탐험</span></div><button id="kidscade-life-world-close" type="button">닫기 ✕</button></div>
      <iframe id="${FRAME_ID}" title="Kidscade 씨앗 월드" src="about:blank"></iframe>`;
    document.body.appendChild(overlay);frame=overlay.querySelector('#'+FRAME_ID);overlay.querySelector('#kidscade-life-world-close').addEventListener('click',close);overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close();});
  }

  function activate(){ensure();if(activated)return;activated=true;frame.src=WORLD_URL;}
  function resetWorldInput(){try{frame?.contentWindow?.KidscadeWorldV3?.resetInput?.();const w=frame?.contentWindow?.KidscadeWorldV2?.activeWorld||frame?.contentWindow?.__kidscadeWorldV2;w?.input?.reset?.();}catch(_){} }
  function refreshWorld(){try{frame?.contentWindow?.KidscadeWorldV3?.refresh?.();frame.contentWindow?.postMessage({type:'kidscade-world-v3-refresh'},location.origin);frame.contentWindow?.postMessage({type:'kidscade-life-world-refresh'},location.origin);}catch(_){} }

  function open(){activate();syncCubePetsSidebar();syncWorldEntryStatus();overlay.dataset.prevOverflow=document.body.style.overflow||'';document.body.style.overflow='hidden';overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');resetWorldInput();refreshWorld();try{frame?.contentWindow?.KidscadeWorldV3?.resumeAudio?.()}catch(_){}setTimeout(()=>{try{frame.contentDocument?.querySelector('canvas')?.focus()}catch(_){}},80);}
  function close(){if(!overlay)return;resetWorldInput();try{frame?.contentWindow?.KidscadeWorldV3?.pauseAudio?.()}catch(_){}overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.style.overflow=overlay.dataset.prevOverflow||'';syncCubePetsSidebar();syncWorldEntryStatus();}

  document.addEventListener('click',e=>{const trigger=e.target.closest?.('[data-open-life-world]');if(!trigger)return;e.preventDefault();e.stopImmediatePropagation?.();open();},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay?.classList.contains('open')){e.preventDefault();close()}},true);
  window.addEventListener('message',e=>{
    if(e.source!==frame?.contentWindow)return;
    if(e.data?.type==='kidscade-life-world-close'||e.data?.type==='kidscade-world-v2-close'){close();return;}
    if(e.data?.type==='kidscade:open-avatar-studio'){
      close();
      setTimeout(()=>document.getElementById('avatar-open-btn')?.click(),80);
    }
  });

  installStyles();syncCubePetsSidebar();syncWorldEntryStatus();if(!installEntryButton()){const observer=new MutationObserver(()=>{if(installEntryButton()){syncCubePetsSidebar();observer.disconnect()}});observer.observe(document.documentElement,{childList:true,subtree:true});}
  window.addEventListener('pageshow',()=>{syncCubePetsSidebar();syncWorldEntryStatus();});
  window.addEventListener('storage',e=>{if(e.key==='kidscade_world_v2'){syncCubePetsSidebar();syncWorldEntryStatus();}if(e.key==='kidscade_seed_world_meta_v1'||e.key==='kidscade_coins')syncWorldEntryStatus();});
  root.addEventListener('kidscade-seed-world-meta-change',syncWorldEntryStatus);
  root.addEventListener('kidscade-seed-world-meta-ready',syncWorldEntryStatus);
  setInterval(syncWorldEntryStatus,15000);
  const api={open,close,ensure,refresh:refreshWorld,syncCubePetsSidebar,syncWorldEntryStatus,getFrame:()=>frame,url:WORLD_URL,version:3};root.KidscadeWorld=api;root.KidscadeLifeWorld=api;root.openKidscadeLifeWorld=open;root.closeKidscadeLifeWorld=close;
})(window);
