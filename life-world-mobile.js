/* Kidscade Life World mobile controls.
   Parent page: watches the life-world iframe and injects this same script.
   Life-world page: installs touch-only floating joystick, contextual action button and pinch zoom.
*/
(function () {
  'use strict';

  const SELF_URL = document.currentScript?.src || 'life-world-mobile.js';
  const WORLD_FRAME_ID = 'kidscade-life-world-frame';

  function installIntoFrame(frame) {
    const inject = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc || !doc.getElementById('world')) return false;
        if (doc.querySelector('script[data-life-world-mobile]')) return true;
        const script = doc.createElement('script');
        script.src = SELF_URL;
        script.dataset.lifeWorldMobile = 'true';
        (doc.head || doc.documentElement).appendChild(script);
        return true;
      } catch (_) {
        return false;
      }
    };
    frame.addEventListener('load', () => setTimeout(inject, 0));
    inject();
  }

  function installParentLoader() {
    const scan = () => {
      const frame = document.getElementById(WORLD_FRAME_ID);
      if (!frame || frame.dataset.mobileLoaderAttached) return false;
      frame.dataset.mobileLoaderAttached = 'true';
      installIntoFrame(frame);
      return true;
    };
    if (scan()) return;
    const observer = new MutationObserver(() => {
      if (scan()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (!document.getElementById('world')) {
    installParentLoader();
    return;
  }

  const touchCapable = matchMedia?.('(pointer: coarse)')?.matches ||
    matchMedia?.('(hover: none)')?.matches || navigator.maxTouchPoints > 0;
  if (!touchCapable || document.getElementById('lifeWorldTouchLayer')) return;

  const canvas = document.getElementById('world');
  const wrap = document.getElementById('worldWrap');
  if (!canvas || !wrap) return;

  document.body.classList.add('life-world-touch');

  const style = document.createElement('style');
  style.id = 'life-world-mobile-style';
  style.textContent = `
    body.life-world-touch .controlsBar{display:none!important}
    body.life-world-touch .interactPrompt{opacity:0!important;pointer-events:none!important}
    body.life-world-touch #zoomStat,
    body.life-world-touch .topbar button[onclick*="setZoom"]{display:none!important}
    body.life-world-touch .topbar{gap:5px;padding:6px 7px;padding-top:max(6px,env(safe-area-inset-top));flex-wrap:wrap}
    body.life-world-touch .brand{font-size:15px;line-height:1.1;min-width:100%;margin-bottom:1px}
    body.life-world-touch .stat{font-size:11px;padding:5px 7px;border-width:1.5px;box-shadow:0 2px 6px rgba(78,68,59,.10)}
    body.life-world-touch .iconBtn{font-size:11px;padding:5px 8px;border-width:1.5px;box-shadow:0 2px 6px rgba(78,68,59,.10)}
    body.life-world-touch #avatarStatus{display:none!important}
    body.life-world-touch .sceneTitle{top:8px;left:8px;font-size:12px;padding:6px 9px}
    #lifeWorldTouchLayer{position:absolute;inset:0;z-index:12;pointer-events:none;overflow:hidden;touch-action:none}
    #lifeWorldMoveZone{position:absolute;left:0;bottom:0;width:58%;height:68%;pointer-events:auto;touch-action:none}
    #lifeWorldJoystick{position:absolute;width:min(29vw,116px);height:min(29vw,116px);border-radius:50%;
      transform:translate(-50%,-50%) scale(.82);opacity:0;transition:opacity .1s,transform .1s;
      border:2px solid rgba(255,255,255,.72);background:rgba(38,55,42,.20);box-shadow:0 5px 18px rgba(0,0,0,.18);pointer-events:none}
    #lifeWorldJoystick.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
    #lifeWorldJoystick:before{content:"";position:absolute;inset:22%;border-radius:50%;border:1px solid rgba(255,255,255,.24)}
    #lifeWorldStickKnob{position:absolute;left:50%;top:50%;width:43%;height:43%;border-radius:50%;transform:translate(-50%,-50%);
      background:rgba(255,253,248,.88);border:2px solid rgba(78,68,59,.48);box-shadow:0 4px 11px rgba(0,0,0,.20)}
    #lifeWorldAction{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));
      width:min(24vw,96px);height:min(24vw,96px);min-width:76px;min-height:76px;border-radius:50%;pointer-events:auto;touch-action:manipulation;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border:3px solid rgba(78,68,59,.72);background:rgba(255,253,248,.91);
      color:#4e443b;box-shadow:0 7px 18px rgba(0,0,0,.22);font-weight:950;-webkit-tap-highlight-color:transparent;transition:transform .1s,background .1s,opacity .1s}
    #lifeWorldAction .actionIcon{font-size:min(9vw,37px);line-height:1}
    #lifeWorldAction .actionText{font-size:11px;max-width:70px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #lifeWorldAction.ready{background:rgba(226,247,207,.96);box-shadow:0 0 0 5px rgba(168,217,141,.23),0 7px 18px rgba(0,0,0,.22)}
    #lifeWorldAction.pressed{transform:scale(.90)}
    #lifeWorldMobileTip{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);
      padding:5px 9px;border-radius:999px;background:rgba(31,35,29,.58);color:#fff;font-size:10px;font-weight:800;opacity:.82;pointer-events:none;transition:opacity .5s}
    @media (orientation:landscape) and (max-height:600px){
      body.life-world-touch .brand{min-width:auto;margin-right:auto}
      body.life-world-touch .topbar{flex-wrap:nowrap;overflow-x:auto}
      body.life-world-touch .topbar .stat{flex:0 0 auto}
      #lifeWorldAction{width:82px;height:82px;min-width:70px;min-height:70px}
      #lifeWorldJoystick{width:104px;height:104px}
    }
  `;
  document.head.appendChild(style);

  const layer = document.createElement('div');
  layer.id = 'lifeWorldTouchLayer';
  layer.innerHTML = `
    <div id="lifeWorldMoveZone" aria-label="이동 영역"></div>
    <div id="lifeWorldJoystick"><div id="lifeWorldStickKnob"></div></div>
    <button id="lifeWorldAction" type="button" aria-label="상호작용">
      <span class="actionIcon">✋</span><span class="actionText">행동</span>
    </button>
    <div id="lifeWorldMobileTip">왼쪽을 터치해 이동 · 두 손가락으로 확대/축소</div>
  `;
  wrap.appendChild(layer);

  const moveZone = layer.querySelector('#lifeWorldMoveZone');
  const joystick = layer.querySelector('#lifeWorldJoystick');
  const knob = layer.querySelector('#lifeWorldStickKnob');
  const actionButton = layer.querySelector('#lifeWorldAction');
  const actionIcon = actionButton.querySelector('.actionIcon');
  const actionText = actionButton.querySelector('.actionText');
  const mobileTip = layer.querySelector('#lifeWorldMobileTip');
  const prompt = document.getElementById('interactPrompt');

  setTimeout(() => { if (mobileTip) mobileTip.style.opacity = '0'; }, 4800);

  const keyCode = { w:'KeyW', a:'KeyA', s:'KeyS', d:'KeyD', e:'KeyE' };
  const held = new Set();
  function emit(type, key) {
    window.dispatchEvent(new KeyboardEvent(type, { key, code:keyCode[key] || '', bubbles:true, cancelable:true }));
  }
  function syncHeld(next) {
    for (const key of [...held]) if (!next.has(key)) { emit('keyup', key); held.delete(key); }
    for (const key of next) if (!held.has(key)) { emit('keydown', key); held.add(key); }
  }
  function releaseMove() { syncHeld(new Set()); }
  function fireAction() {
    emit('keydown','e');
    setTimeout(() => emit('keyup','e'), 45);
  }

  let movePointer = null;
  let originX = 0, originY = 0;
  let radius = 52;
  let pinching = false;
  const touchPoints = new Map();
  let pinchDistance = 0;
  let lastPinchStep = 0;

  function setJoystickVisual(clientX, clientY) {
    const r = wrap.getBoundingClientRect();
    joystick.style.left = `${clientX-r.left}px`;
    joystick.style.top = `${clientY-r.top}px`;
    joystick.classList.add('show');
  }
  function moveStick(clientX, clientY) {
    const dx = clientX-originX, dy = clientY-originY;
    const d = Math.hypot(dx,dy);
    const cap = Math.min(radius,d || 1);
    const nx = d ? dx/d : 0, ny = d ? dy/d : 0;
    knob.style.transform = `translate(calc(-50% + ${nx*cap}px),calc(-50% + ${ny*cap}px))`;
    const power = Math.min(1,d/radius);
    const next = new Set();
    if (power > .16) {
      if (ny < -.28) next.add('w');
      if (ny > .28) next.add('s');
      if (nx < -.28) next.add('a');
      if (nx > .28) next.add('d');
    }
    syncHeld(next);
  }
  function endJoystick() {
    movePointer = null;
    releaseMove();
    joystick.classList.remove('show');
    knob.style.transform = 'translate(-50%,-50%)';
  }

  moveZone.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || pinching || movePointer !== null) return;
    e.preventDefault();
    e.stopPropagation();
    movePointer = e.pointerId;
    originX = e.clientX; originY = e.clientY;
    radius = Math.max(38, Math.min(56, innerWidth*.14));
    setJoystickVisual(originX,originY);
    try { moveZone.setPointerCapture(e.pointerId); } catch (_) {}
  });
  moveZone.addEventListener('pointermove', e => {
    if (e.pointerId !== movePointer || pinching) return;
    e.preventDefault();moveStick(e.clientX,e.clientY);
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => moveZone.addEventListener(type,e=>{
    if (e.pointerId === movePointer) endJoystick();
  }));

  actionButton.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && matchMedia('(pointer:fine)').matches) return;
    e.preventDefault();e.stopPropagation();
    actionButton.classList.add('pressed');
    fireAction();
  });
  ['pointerup','pointercancel','pointerleave'].forEach(type => actionButton.addEventListener(type,()=>actionButton.classList.remove('pressed')));

  function pointerDistance() {
    const pts=[...touchPoints.values()];
    if(pts.length<2)return 0;
    return Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
  }
  wrap.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (touchPoints.size >= 2) {
      pinching = true;endJoystick();pinchDistance = pointerDistance();e.preventDefault();
    }
  }, {capture:true});
  wrap.addEventListener('pointermove', e => {
    if (!touchPoints.has(e.pointerId)) return;
    touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (!pinching || touchPoints.size < 2) return;
    e.preventDefault();
    const dist=pointerDistance(), now=performance.now();
    if (Math.abs(dist-pinchDistance)>9 && now-lastPinchStep>65) {
      const deltaY = dist>pinchDistance ? -100 : 100;
      canvas.dispatchEvent(new WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true}));
      pinchDistance=dist;lastPinchStep=now;
    }
  }, {capture:true,passive:false});
  function dropTouch(e){
    touchPoints.delete(e.pointerId);
    if(touchPoints.size<2){pinching=false;pinchDistance=0;}
  }
  wrap.addEventListener('pointerup',dropTouch,{capture:true});
  wrap.addEventListener('pointercancel',dropTouch,{capture:true});

  function actionVisual(raw, ready) {
    const text=(raw||'').replace(/\b(E|Space)\b/gi,'').replace(/[\/·:]+/g,' ').replace(/\s+/g,' ').trim();
    const v=text||'행동';
    let icon='✋';
    if(/나무|벌목|도끼|베기/.test(v))icon='🪓';
    else if(/광석|채광|곡괭|바위|보석/.test(v))icon='⛏️';
    else if(/낚시|물고기/.test(v))icon='🎣';
    else if(/물주|우물|급수/.test(v))icon='💧';
    else if(/수확|작물|밭|심기/.test(v))icon='🌾';
    else if(/동물|먹이|소|닭|돼지|펫/.test(v))icon='🐾';
    else if(/문|집|들어|나가기/.test(v))icon='🚪';
    else if(/광차/.test(v))icon='🚋';
    else if(/요리|냄비|부엌/.test(v))icon='🍳';
    else if(/옷장|아바타/.test(v))icon='👕';
    else if(/잠|침대|쉬기/.test(v))icon='💤';
    else if(/곤충|채집망/.test(v))icon='🦋';
    else if(/버섯|약초|꿀|채집|줍/.test(v))icon='🖐️';
    actionIcon.textContent=icon;
    actionText.textContent=v.length>8?v.slice(0,8):v;
    actionButton.classList.toggle('ready',!!ready);
    actionButton.setAttribute('aria-label',v);
  }
  function syncPrompt(){
    const ready=!!prompt?.classList.contains('show');
    actionVisual(ready?prompt.textContent:'행동',ready);
  }
  if(prompt){
    new MutationObserver(syncPrompt).observe(prompt,{attributes:true,childList:true,characterData:true,subtree:true});
  }
  syncPrompt();
  setInterval(syncPrompt,450);

  addEventListener('blur',()=>{endJoystick();touchPoints.clear();pinching=false});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){endJoystick();touchPoints.clear();pinching=false}});
})();
