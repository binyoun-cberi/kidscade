/* Kidscade World v2 integration.
   The old Life World v1 entry is retired: the garden button now opens World v2 directly.
   Existing garden saves are not mutated by this layer. */
(function(root){
  'use strict';

  const OVERLAY_ID='kidscade-life-world-overlay';
  const FRAME_ID='kidscade-life-world-frame';
  const WORLD_URL='world-v3/kidscade-world.html?v=11';
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
    if(card)card.setAttribute('aria-label','Cube Pets 생존 월드 열기');
    if(openBtn)openBtn.textContent='🌿 생존 월드 열기';
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
      <div id="kidscade-life-world-bar"><div><strong>🌿 Kidscade 생활·생존 월드 v3</strong><span>집 · 농장 · 숲 · 돌산 · 강가 · 씨앗마을에서 Cube Pets와 생활합니다</span></div><button id="kidscade-life-world-close" type="button">닫기 ✕</button></div>
      <iframe id="${FRAME_ID}" title="Kidscade 생활 월드 v3" src="about:blank"></iframe>`;
    document.body.appendChild(overlay);frame=overlay.querySelector('#'+FRAME_ID);overlay.querySelector('#kidscade-life-world-close').addEventListener('click',close);overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close();});
  }

  function activate(){ensure();if(activated)return;activated=true;frame.src=WORLD_URL;}
  function resetWorldInput(){try{frame?.contentWindow?.KidscadeWorldV3?.resetInput?.();const w=frame?.contentWindow?.KidscadeWorldV2?.activeWorld||frame?.contentWindow?.__kidscadeWorldV2;w?.input?.reset?.();}catch(_){} }
  function refreshWorld(){try{frame?.contentWindow?.KidscadeWorldV3?.refresh?.();frame.contentWindow?.postMessage({type:'kidscade-world-v3-refresh'},location.origin);frame.contentWindow?.postMessage({type:'kidscade-life-world-refresh'},location.origin);}catch(_){} }

  function open(){activate();syncCubePetsSidebar();overlay.dataset.prevOverflow=document.body.style.overflow||'';document.body.style.overflow='hidden';overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');resetWorldInput();refreshWorld();setTimeout(()=>{try{frame.contentDocument?.querySelector('canvas')?.focus()}catch(_){}},80);}
  function close(){if(!overlay)return;resetWorldInput();overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.style.overflow=overlay.dataset.prevOverflow||'';syncCubePetsSidebar();}

  document.addEventListener('click',e=>{const trigger=e.target.closest?.('[data-open-life-world]');if(!trigger)return;e.preventDefault();open();},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay?.classList.contains('open')){e.preventDefault();close()}},true);
  window.addEventListener('message',e=>{if(e.source!==frame?.contentWindow)return;if(e.data?.type==='kidscade-life-world-close'||e.data?.type==='kidscade-world-v2-close')close();});

  installStyles();syncCubePetsSidebar();if(!installEntryButton()){const observer=new MutationObserver(()=>{if(installEntryButton()){syncCubePetsSidebar();observer.disconnect()}});observer.observe(document.documentElement,{childList:true,subtree:true});}
  window.addEventListener('pageshow',syncCubePetsSidebar);
  window.addEventListener('storage',e=>{if(e.key==='kidscade_world_v2')syncCubePetsSidebar();});
  const api={open,close,ensure,refresh:refreshWorld,syncCubePetsSidebar,getFrame:()=>frame,url:WORLD_URL,version:3};root.KidscadeWorld=api;root.KidscadeLifeWorld=api;root.openKidscadeLifeWorld=open;root.closeKidscadeLifeWorld=close;
})(window);
