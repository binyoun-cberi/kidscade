import * as THREE from '../../assets/vendor/three-r160/three.module.js';
window.THREE=THREE;
function loadClassic(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load '+src));document.body.appendChild(s);
  });
}
try{
  await loadClassic('./spelling-frog-runtime.js?v=20260918-2');
  await loadClassic('../../spelling-frog-log-fix.js?v=20260914-1');
}catch(error){
  console.error('[Spelling Frog] local runtime failed',error);
  const panel=document.querySelector('#startOverlay .panel .lead');
  if(panel)panel.textContent='게임 파일을 불러오지 못했습니다. 새로고침해 주세요.';
}
