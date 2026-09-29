import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SHARED_3D,shared3DProfile} from '../assets/game/manifest/shared-community-3d.js';

const canvas=document.getElementById('view'),select=document.getElementById('assetSelect');
const ui={status:document.getElementById('status'),file:document.getElementById('file'),bytes:document.getElementById('bytes'),tags:document.getElementById('tags'),meshes:document.getElementById('meshes'),materials:document.getElementById('materials'),animations:document.getElementById('animations'),bounds:document.getElementById('bounds'),reason:document.getElementById('reason')};
const scene=new THREE.Scene();scene.background=new THREE.Color(0x1b2932);
const camera=new THREE.PerspectiveCamera(50,1,.01,200);camera.position.set(4,3,5);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
scene.add(new THREE.HemisphereLight(0xeaf7ff,0x53614f,2));
const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(4,8,5);scene.add(sun);
const floor=new THREE.GridHelper(20,40,0x66808f,0x354852);scene.add(floor);
const axes=new THREE.AxesHelper(2);scene.add(axes);
const root=new THREE.Group();scene.add(root);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;
const loader=new GLTFLoader();
const assets=Object.values(SHARED_3D).sort((a,b)=>a.id.localeCompare(b.id));
let current=0,raw=false,loadToken=0;

for(const [i,a] of assets.entries()){const o=document.createElement('option');o.value=String(i);o.textContent=a.id;select.appendChild(o)}
function clear(){while(root.children.length)root.remove(root.children[0])}
function formatBytes(n){return n>1024*1024?(n/1024/1024).toFixed(2)+' MB':(n/1024).toFixed(1)+' KB'}
function normalized(sceneObj){
  const b=new THREE.Box3().setFromObject(sceneObj),size=b.getSize(new THREE.Vector3()),mx=Math.max(size.x,size.y,size.z)||1;
  sceneObj.scale.multiplyScalar(3/mx);
  const b2=new THREE.Box3().setFromObject(sceneObj),c=b2.getCenter(new THREE.Vector3());
  sceneObj.position.x-=c.x;sceneObj.position.z-=c.z;sceneObj.position.y-=b2.min.y;
}
function frameObject(o){
  const b=new THREE.Box3().setFromObject(o),size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),m=Math.max(size.x,size.y,size.z,1);
  controls.target.copy(c);camera.position.set(c.x+m*1.5,c.y+m*.9,c.z+m*1.7);camera.near=Math.max(.01,m/1000);camera.far=Math.max(100,m*20);camera.updateProjectionMatrix();controls.update();
}
function materialSummary(o){
  const mats=new Set();let meshes=0,gray=0;
  o.traverse(n=>{if(!n.isMesh)return;meshes++;const list=Array.isArray(n.material)?n.material:[n.material];for(const m of list){if(!m)continue;mats.add(m.uuid);const c=m.color;if(c){const max=Math.max(c.r,c.g,c.b),min=Math.min(c.r,c.g,c.b);if(max-min<.08)gray++}}});
  return {meshes,materials:mats.size,gray};
}
function updateMeta(a,g,o){
  const profile=shared3DProfile(a.id);ui.status.textContent=profile.state;ui.status.className=profile.state;
  ui.file.textContent=a.path;ui.bytes.textContent=formatBytes(a.bytes);ui.tags.innerHTML=a.tags.map(t=>'<span class="pill">'+t+'</span>').join('');
  ui.animations.textContent=String(g.animations?.length||0);const ms=materialSummary(o);ui.meshes.textContent=String(ms.meshes);ui.materials.textContent=ms.materials+'개 · 무채색 후보 '+ms.gray;
  const b=new THREE.Box3().setFromObject(o),sz=b.getSize(new THREE.Vector3());ui.bounds.textContent=sz.x.toFixed(2)+' × '+sz.y.toFixed(2)+' × '+sz.z.toFixed(2);ui.reason.textContent=profile.reason||'-';
}
function loadIndex(i){
  current=(i+assets.length)%assets.length;select.value=String(current);const a=assets[current],token=++loadToken;clear();
  ui.file.textContent='불러오는 중...';loader.load('../'+a.path,g=>{if(token!==loadToken)return;const o=g.scene;root.add(o);if(!raw)normalized(o);o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});frameObject(o);updateMeta(a,g,o)},undefined,e=>{if(token!==loadToken)return;ui.file.textContent='로드 실패: '+a.path;console.error(e)});
}
select.addEventListener('change',()=>loadIndex(Number(select.value)));document.getElementById('prev').onclick=()=>loadIndex(current-1);document.getElementById('next').onclick=()=>loadIndex(current+1);
document.getElementById('toggleRaw').onclick=()=>{raw=!raw;document.getElementById('toggleRaw').textContent=raw?'정규화 보기':'원본 피벗 보기';loadIndex(current)};
function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera)}loop();loadIndex(0);
