/* Kidscade Life World integration.
   Loads life-world.html in an isolated same-origin iframe and adds an entry button to the current garden UI.
   Existing garden saves are not mutated by this layer. */
(function(root){
  'use strict';

  const OVERLAY_ID='kidscade-life-world-overlay';
  const FRAME_ID='kidscade-life-world-frame';
  const WORLD_URL='life-world.html';
  let overlay=null, frame=null, activated=false;

  function installStyles(){
    if(document.getElementById('kidscade-life-world-style'))return;
    const style=document.createElement('style');
    style.id='kidscade-life-world-style';
    style.textContent=`
      #${OVERLAY_ID}{
        position:fixed;inset:0;z-index:29000;background:rgba(31,35,29,.66);
        backdrop-filter:blur(7px);display:none;padding:10px;
      }
      #${OVERLAY_ID}.open{display:grid;grid-template-rows:auto minmax(0,1fr)}
      #kidscade-life-world-bar{
        width:min(1500px,100%);margin:0 auto;background:#f8f5ea;color:#4e443b;
        border-radius:18px 18px 0 0;padding:9px 12px 9px 16px;
        display:flex;align-items:center;justify-content:space-between;gap:12px;
        box-shadow:0 12px 30px rgba(0,0,0,.18);box-sizing:border-box;
      }
      #kidscade-life-world-bar strong{font-size:1rem}
      #kidscade-life-world-bar span{font-size:.78rem;opacity:.68;margin-left:8px}
      #kidscade-life-world-close{
        border:1px solid rgba(78,68,59,.25);background:#fffdf8;color:#4e443b;
        border-radius:12px;padding:8px 13px;font-weight:900;cursor:pointer;
      }
      [data-open-life-world="garden-entry"]{
        margin-left:auto;border:1px solid rgba(78,68,59,.25);background:#ecf8df;color:#35533a;
        border-radius:12px;padding:8px 12px;font-weight:900;cursor:pointer;white-space:nowrap;
      }
      #${FRAME_ID}{
        display:block;width:min(1500px,100%);height:100%;margin:0 auto;border:0;
        border-radius:0 0 18px 18px;background:#edf3e2;
        box-shadow:0 18px 42px rgba(0,0,0,.24);
      }
      @media(max-width:700px){
        #${OVERLAY_ID}{padding:0}
        #kidscade-life-world-bar{border-radius:0}
        #kidscade-life-world-bar span{display:none}
        #${FRAME_ID}{border-radius:0}
      }
    `;
    document.head.appendChild(style);
  }

  function installEntryButton(){
    if(document.querySelector('[data-open-life-world="garden-entry"]'))return true;
    const heading=document.querySelector('.garden-heading');
    if(!heading)return false;
    const btn=document.createElement('button');
    btn.type='button';
    btn.dataset.openLifeWorld='garden-entry';
    btn.textContent='🌿 생활 월드';
    btn.setAttribute('aria-label','Kidscade 생활 월드 들어가기');
    heading.appendChild(btn);
    return true;
  }

  function ensure(){
    if(overlay)return;
    installStyles();
    overlay=document.createElement('div');
    overlay.id=OVERLAY_ID;
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`
      <div id="kidscade-life-world-bar">
        <div><strong>🌿 Kidscade 생활 월드</strong><span>나의 정원 · 캐릭터 · 씨앗을 이어서 사용해요</span></div>
        <button id="kidscade-life-world-close" type="button">닫기 ✕</button>
      </div>
      <iframe id="${FRAME_ID}" title="Kidscade 생활 월드" src="about:blank"></iframe>
    `;
    document.body.appendChild(overlay);
    frame=overlay.querySelector('#'+FRAME_ID);
    overlay.querySelector('#kidscade-life-world-close').addEventListener('click',close);
    overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close();});
  }

  function activate(){
    ensure();
    if(activated)return;
    activated=true;
    frame.src=WORLD_URL;
  }

  function open(){
    activate();
    overlay.dataset.prevOverflow=document.body.style.overflow||'';
    document.body.style.overflow='hidden';
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    try{frame.contentWindow?.postMessage({type:'kidscade-life-world-refresh'},location.origin)}catch(_){}
  }

  function close(){
    if(!overlay)return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
    document.body.style.overflow=overlay.dataset.prevOverflow||'';
  }

  document.addEventListener('click',e=>{
    const trigger=e.target.closest?.('[data-open-life-world]');
    if(!trigger)return;
    e.preventDefault();open();
  },true);

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&overlay?.classList.contains('open')){e.preventDefault();close()}
  },true);

  window.addEventListener('message',e=>{
    if(e.source!==frame?.contentWindow)return;
    if(e.data?.type==='kidscade-life-world-close')close();
  });

  installStyles();
  if(!installEntryButton()){
    const observer=new MutationObserver(()=>{if(installEntryButton())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  root.KidscadeLifeWorld={open,close,ensure,getFrame:()=>frame};
  root.openKidscadeLifeWorld=open;
  root.closeKidscadeLifeWorld=close;
})(window);
