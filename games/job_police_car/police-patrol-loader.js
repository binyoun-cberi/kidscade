import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

window.THREE=THREE;
window.GLTFLoader=GLTFLoader;

const runtime=document.createElement('script');
runtime.src=new URL('./police-patrol.js?v=6',import.meta.url).href;
runtime.async=false;
runtime.onerror=()=>console.error('[Police Patrol] runtime load failed');
document.body.appendChild(runtime);
