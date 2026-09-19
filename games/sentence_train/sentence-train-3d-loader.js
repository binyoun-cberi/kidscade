import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

window.THREE=THREE;
window.GLTFLoader=GLTFLoader;

const runtime=document.createElement('script');
runtime.src=new URL('./sentence-train-3d.js?v=1',import.meta.url).href;
runtime.async=false;
runtime.onerror=()=>console.error('[Sentence Train] 3D runtime load failed');
document.body.appendChild(runtime);
