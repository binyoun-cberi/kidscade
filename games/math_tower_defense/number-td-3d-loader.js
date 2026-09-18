import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

window.THREE=THREE;
window.GLTFLoader=GLTFLoader;

const status=document.getElementById('td3dLoading');
if(status) status.textContent='3D 엔진 연결 중…';

const runtime=document.createElement('script');
runtime.src=new URL('./number-td-3d-runtime.js?v=3',import.meta.url).href;
runtime.async=false;
runtime.onload=()=>{ if(status && !document.querySelector('.canvas-box.td3d-ready')) status.textContent='3D 전장 구성 중…'; };
runtime.onerror=()=>{
  console.error('[NumberTD3D] runtime load failed');
  if(status) status.textContent='3D 런타임을 불러오지 못했습니다 · 2D 모드로 플레이할 수 있어요.';
};
document.body.appendChild(runtime);
