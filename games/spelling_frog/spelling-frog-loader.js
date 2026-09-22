import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
window.THREE=THREE;
window.GLTFLoader=GLTFLoader;
function loadClassic(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error('Failed to load '+src));document.body.appendChild(s);
  });
}
try{
  await loadClassic('./spelling-frog-runtime.js?v=20260922-1');
  await loadClassic('../../spelling-frog-log-fix.js?v=20260914-1');
}catch(error){
  console.error('[Spelling Frog] local runtime failed',error);
  const panel=document.querySelector('#startOverlay .panel .lead');
  if(panel)panel.textContent='게임 파일을 불러오지 못했습니다. 새로고침해 주세요.';
}
