import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

window.THREE=THREE;
window.GLTFLoader=GLTFLoader;

const status=document.getElementById('assetStatus');
if(status) status.textContent='3D 런타임 연결 중…';

const runtime=document.createElement('script');
runtime.src=new URL('./tower-defense.js?v=2',import.meta.url).href;
runtime.async=false;
runtime.onload=()=>{ if(status) status.textContent='3D 전장 준비 완료'; };
runtime.onerror=()=>{ if(status) status.textContent='3D 런타임 오류'; console.error('[MathTD] runtime load failed'); };
document.body.appendChild(runtime);
