(()=>{
'use strict';
if(window.__kidscadeTouchInteractionGuardV1)return;
window.__kidscadeTouchInteractionGuardV1=true;

const root=document.documentElement;
const ACTIVE='kidscade-touch-active';
const STYLE_ID='kidscade-touch-interaction-guard-style';
const EDITABLE='input,textarea,select,[contenteditable="true"],[contenteditable=""],[data-allow-selection="true"],.allow-text-select';
const coarseQuery=window.matchMedia?.('(hover: none), (pointer: coarse)');
let lastTouchAt=-Infinity;
let clearTimer=0;

function elementOf(target){
  if(target instanceof Element)return target;
  return target?.parentElement instanceof Element?target.parentElement:null;
}
function allowsSelection(target){
  const el=elementOf(target);
  return Boolean(el?.closest?.(EDITABLE));
}
function markTouch(){
  lastTouchAt=performance.now();
  root.classList.add(ACTIVE);
  clearTimeout(clearTimer);
}
function releaseTouchSoon(){
  clearTimeout(clearTimer);
  clearTimer=setTimeout(()=>root.classList.remove(ACTIVE),650);
}
function touchLikeNow(){
  return Boolean(coarseQuery?.matches)||performance.now()-lastTouchAt<1800;
}
function installStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
@media (hover:none),(pointer:coarse){
  html body *{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
  html body input,html body textarea,html body select,
  html body [contenteditable="true"],html body [contenteditable="true"] *,
  html body [contenteditable=""],html body [contenteditable=""] *,
  html body [data-allow-selection="true"],html body [data-allow-selection="true"] *,
  html body .allow-text-select,html body .allow-text-select *{
    -webkit-touch-callout:default;-webkit-user-select:text;user-select:text
  }
}
html.${ACTIVE} body *{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
html.${ACTIVE} body input,html.${ACTIVE} body textarea,html.${ACTIVE} body select,
html.${ACTIVE} body [contenteditable="true"],html.${ACTIVE} body [contenteditable="true"] *,
html.${ACTIVE} body [contenteditable=""],html.${ACTIVE} body [contenteditable=""] *,
html.${ACTIVE} body [data-allow-selection="true"],html.${ACTIVE} body [data-allow-selection="true"] *,
html.${ACTIVE} body .allow-text-select,html.${ACTIVE} body .allow-text-select *{
  -webkit-touch-callout:default;-webkit-user-select:text;user-select:text
}
img,canvas,svg{-webkit-user-drag:none}
`;
  (document.head||root).appendChild(style);
}

installStyle();

document.addEventListener('pointerdown',event=>{
  if(event.pointerType==='touch'||event.pointerType==='pen')markTouch();
},{capture:true,passive:true});
document.addEventListener('pointerup',event=>{
  if(event.pointerType==='touch'||event.pointerType==='pen'){lastTouchAt=performance.now();releaseTouchSoon()}
},{capture:true,passive:true});
document.addEventListener('pointercancel',event=>{
  if(event.pointerType==='touch'||event.pointerType==='pen'){lastTouchAt=performance.now();releaseTouchSoon()}
},{capture:true,passive:true});
document.addEventListener('touchstart',markTouch,{capture:true,passive:true});
document.addEventListener('touchend',()=>{lastTouchAt=performance.now();releaseTouchSoon()},{capture:true,passive:true});
document.addEventListener('touchcancel',()=>{lastTouchAt=performance.now();releaseTouchSoon()},{capture:true,passive:true});

document.addEventListener('contextmenu',event=>{
  if(allowsSelection(event.target))return;
  if(touchLikeNow())event.preventDefault();
},true);
document.addEventListener('selectstart',event=>{
  if(allowsSelection(event.target))return;
  if(touchLikeNow())event.preventDefault();
},true);
document.addEventListener('dragstart',event=>{
  if(allowsSelection(event.target))return;
  if(touchLikeNow())event.preventDefault();
},true);
})();
