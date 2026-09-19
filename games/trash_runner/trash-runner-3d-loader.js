import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

window.THREE=THREE;
window.GLTFLoader=GLTFLoader;

const runtime=document.createElement('script');
runtime.src=new URL('./trash-runner-3d.js?v=2',import.meta.url).href;
runtime.async=false;
runtime.onerror=()=>console.error('[Trash Runner] 3D runtime load failed');
document.body.appendChild(runtime);
