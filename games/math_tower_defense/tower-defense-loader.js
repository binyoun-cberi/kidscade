import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

window.THREE=THREE;
window.GLTFLoader=GLTFLoader;
window.SkeletonUtils=SkeletonUtils;

const status=document.getElementById('assetStatus');
if(status) status.textContent='3D 런타임 연결 중…';

const runtime=document.createElement('script');
runtime.src=new URL('./tower-defense.js?v=9',import.meta.url).href;
runtime.async=false;
runtime.onload=()=>{ if(status&&status.textContent==='3D 런타임 연결 중…') status.textContent='3D 전장 준비 완료'; };
runtime.onerror=()=>{ if(status){status.textContent='3D 런타임 불러오기 오류';status.style.opacity='1'} const btn=document.getElementById('startGameBtn');if(btn){btn.disabled=true;btn.textContent='3D 전장 오류'} console.error('[MathTD] runtime load failed'); };
document.body.appendChild(runtime);
