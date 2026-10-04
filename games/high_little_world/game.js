import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {WorldSim,COLS,ROWS,CELL,HEIGHT_STEP} from './sim.js?v=1';

const $=id=>document.getElementById(id);
const ui={
  era:$('eraLabel'),veg:$('vegStat'),herb:$('herbStat'),pred:$('predStat'),human:$('humanStat'),settlement:$('settlementStat'),
  guide:$('guide'),guideStep:$('guideStep'),guideTitle:$('guideTitle'),guideText:$('guideText'),eventLog:$('eventLog'),
  inspector:$('inspector'),tileTitle:$('tileTitle'),tileInfo:$('tileInfo'),selectedLabel:$('selectedLabel'),toast:$('toast'),
  intro:$('intro'),help:$('help'),continueBtn:$('continueBtn'),saveBtn:$('saveBtn')
};
const SAVE_KEY=window.KidscadeGame?.storageKey?.('high_little_world','world')||'kidscade_game_v1:high_little_world:world';
const ROOT='../../assets/game/';
const ROOT_SHARED='../../assets/';
const ASSET={
  tree:ROOT+'3d/nature/kenney-nature-kit/tree-default.glb',
  oak:ROOT+'3d/nature/kenney-nature-kit/tree-oak.glb',
  deer:ROOT+'characters/pets/animal-deer.glb',
  fox:ROOT+'characters/pets/animal-fox.glb',
  humanA:ROOT+'characters/people/character-male-a.glb',
  humanB:ROOT+'characters/people/character-female-b.glb',
  house:ROOT+'3d/city/kenney-city-kit-suburban/building-type-a.glb',
  hall:ROOT+'3d/city/kenney-city-kit-suburban/building-type-f.glb',
  barn:ROOT_SHARED+'quaternius_cc0-barn-666.glb',
  coop:ROOT_SHARED+'quaternius_cc0-chicken-coop-819.glb',
  cow:ROOT_SHARED+'quaternius_cc0-cow-881.glb',
  pig:ROOT_SHARED+'quaternius_cc0-pig-1226.glb',
  well:ROOT_SHARED+'quaternius_cc0-well-1471.glb',
  windmill:ROOT_SHARED+'quaternius_cc0-windmill-1504.glb',
  wheat:ROOT_SHARED+'quaternius_cc0-wheat-1478.glb',
  corn:ROOT_SHARED+'quaternius_cc0-corn-866.glb',
  rice:ROOT_SHARED+'quaternius_cc0-rice-1294.glb'
};
const POWERS={
  raise:{icon:'⛰️',label:'땅 올리기'},lower:{icon:'🕳️',label:'땅 내리기'},inspect:{icon:'🔎',label:'살펴보기'},
  rain:{icon:'🌧️',label:'비'},sun:{icon:'☀️',label:'햇빛'},drought:{icon:'🏜️',label:'가뭄'},
  plants:{icon:'🌱',label:'식물'},herbivore:{icon:'🦌',label:'초식동물'},predator:{icon:'🦊',label:'포식동물'},
  human:{icon:'👥',label:'사람'},blessing:{icon:'✨',label:'축복'},lightning:{icon:'⚡',label:'번개'},fire:{icon:'🔥',label:'불'},meteor:{icon:'☄️',label:'운석'}
};
const TUTORIAL=[
  {power:'raise',step:'안내 1 / 5',title:'산과 계곡을 만들어 보세요',text:'땅 올리기를 한두 번 사용해 물이 흘러갈 높이 차를 만들어 봐요.'},
  {power:'rain',step:'안내 2 / 5',title:'높은 곳에 비를 내려 보세요',text:'자연 탭의 비를 선택하세요. 잠시 시간이 흐르면 물이 낮은 곳으로 이동합니다.'},
  {power:'plants',step:'안내 3 / 5',title:'물이 닿는 곳에 식물을 놓아 보세요',text:'생명 탭에서 식물을 놓고 3× 속도로 관찰해 보세요. 환경이 맞으면 주변으로 번집니다.'},
  {power:'herbivore',step:'안내 4 / 5',title:'먹이사슬을 시작해 보세요',text:'풀이 많은 곳에 초식동물을 놓고, 이후 포식동물도 조금 넣어 균형을 관찰해 보세요.'},
  {power:'human',step:'안내 5 / 5',title:'마지막으로 사람을 놓아 보세요',text:'물 가까운 마른 땅에 사람을 놓으세요. 집과 길은 사람들이 스스로 만들게 두면 됩니다.'}
];

let sim=new WorldSim(),running=false,speed=1,selected='raise',category='terrain',tutorial=false,tutorialIndex=0,last=performance.now(),accum=0,saveClock=0;
let renderer,scene,camera,raycaster,landMesh,waterMesh,worldGroup,natureGroup,animalGroup,villageGroup,fxGroup;
let cameraTarget=new THREE.Vector3(),viewSize=24,drag={active:false,id:null,x:0,y:0,moved:false},pointers=new Map();
const loader=new GLTFLoader(),gltfCache=new Map(),loaded={},mixers=[];

function worldPos(c){return new THREE.Vector3((c.x-(COLS-1)/2)*CELL,0,(c.z-(ROWS-1)/2)*CELL)}
function groundTop(c){return c.height*HEIGHT_STEP}
function biomeColor(c){
  if(c.fire>.28)return 0x6a3b2f;if(c.road)return 0xb99b6b;
  return ({ocean:0x7c9aae,mountain:0x8c8f85,wetland:0x668d70,barren:0xb99a6b,forest:0x3f7048,meadow:0x82a95d,grass:0x8caf66}[c.biome]||0x87a767);
}
function initThree(){
  const canvas=$('world');renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.55));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0xaed4e4);scene.fog=new THREE.Fog(0xaed4e4,25,52);
  camera=new THREE.OrthographicCamera(-16,16,10,-10,.1,100);raycaster=new THREE.Raycaster();
  scene.add(new THREE.HemisphereLight(0xfffae5,0x536b58,2.25));const sun=new THREE.DirectionalLight(0xffefc8,3.2);sun.position.set(-12,20,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-23;sun.shadow.camera.right=23;sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;scene.add(sun);
  worldGroup=new THREE.Group();natureGroup=new THREE.Group();animalGroup=new THREE.Group();villageGroup=new THREE.Group();fxGroup=new THREE.Group();scene.add(worldGroup,natureGroup,animalGroup,villageGroup,fxGroup);
  const count=COLS*ROWS,landMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}),waterMat=new THREE.MeshStandardMaterial({color:0x5aa6c7,transparent:true,opacity:.66,roughness:.28,depthWrite:false});
  landMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.96,1,.96),landMat,count);landMesh.receiveShadow=true;landMesh.castShadow=false;landMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);worldGroup.add(landMesh);
  waterMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.94,.035,.94),waterMat,count);waterMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);waterMesh.renderOrder=2;worldGroup.add(waterMesh);
  applyCamera();resize();bindPointer();window.addEventListener('resize',resize);
}
function resize(){
  if(!renderer||!camera)return;const rect=renderer.domElement.getBoundingClientRect(),aspect=Math.max(.5,rect.width/Math.max(1,rect.height));camera.left=-viewSize*aspect/2;camera.right=viewSize*aspect/2;camera.top=viewSize/2;camera.bottom=-viewSize/2;camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height,false);
}
function applyCamera(){camera.position.set(cameraTarget.x+12,16,cameraTarget.z+14);camera.lookAt(cameraTarget)}
function syncTerrain(){
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  sim.cells.forEach((c,i)=>{
    const p=worldPos(c),h=.22+c.height*HEIGHT_STEP;dummy.position.set(p.x,h/2-.22,p.z);dummy.scale.set(1,h,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();landMesh.setMatrixAt(i,dummy.matrix);landMesh.setColorAt(i,color.setHex(biomeColor(c)));
    const show=c.sea||c.water>.035;dummy.position.set(p.x,groundTop(c)+.025+c.water*.03,p.z);dummy.scale.set(show?1:.001,show?1:.001,.001+(show ? .999 : 0));dummy.updateMatrix();waterMesh.setMatrixAt(i,dummy.matrix);
  });
  landMesh.instanceMatrix.needsUpdate=true;landMesh.instanceColor.needsUpdate=true;waterMesh.instanceMatrix.needsUpdate=true;
}
function clearGroup(g){while(g.children.length)g.remove(g.children[g.children.length-1])}
function loadGLTF(url){if(!gltfCache.has(url))gltfCache.set(url,new Promise(resolve=>loader.load(url,g=>resolve(g),undefined,e=>{console.warn('[Little World] asset failed',url,e);resolve(null)})));return gltfCache.get(url)}
function normalizedClone(gltf,target=1,skinned=false){
  if(!gltf)return null;const o=skinned?cloneSkeleton(gltf.scene):gltf.scene.clone(true);o.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(o),size=box.getSize(new THREE.Vector3()),base=Math.max(size.x,size.y,size.z)||1;o.scale.multiplyScalar(target/base);o.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(o);const center=box.getCenter(new THREE.Vector3());o.position.x-=center.x;o.position.z-=center.z;o.position.y-=box.min.y;o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}if(n.isSkinnedMesh)n.frustumCulled=false});return o;
}
async function preload(){await Promise.all(Object.entries(ASSET).map(async([k,url])=>loaded[k]=await loadGLTF(url)));rebuildLivingVisuals()}
function seededRank(c,salt=0){let n=(c.x*73856093^c.z*19349663^salt*83492791)>>>0;n=(n^(n>>>13))*1274126177;return((n^(n>>>16))>>>0)/4294967295}
function rebuildNature(){
  clearGroup(natureGroup);const candidates=sim.cells.filter(c=>!c.sea&&c.vegetation>.44&&c.fire<.2).sort((a,b)=>(b.vegetation+seededRank(b,3)*.18)-(a.vegetation+seededRank(a,3)*.18)).slice(0,58);
  for(const c of candidates){
    const p=worldPos(c),forest=c.biome==='forest',g=loaded[forest&&seededRank(c,8)>.45?'oak':'tree'];let o=normalizedClone(g,forest?1.18:.82);
    if(!o){o=new THREE.Mesh(new THREE.ConeGeometry(.22,.9,7),new THREE.MeshStandardMaterial({color:forest?0x3e7248:0x6e9d58,roughness:.9}));o.position.y=.45}
    o.position.x+=p.x+(seededRank(c,5)-.5)*.38;o.position.z+=p.z+(seededRank(c,7)-.5)*.38;o.position.y+=groundTop(c);o.rotation.y=seededRank(c,11)*Math.PI*2;natureGroup.add(o);
  }
}
function pickPopulationCells(key,min){return sim.cells.filter(c=>!c.sea&&c[key]>min&&c.fire<.3).sort((a,b)=>b[key]-a[key])}
function rebuildAnimals(){
  clearGroup(animalGroup);const make=(c,key,scale)=>{const p=worldPos(c),o=normalizedClone(loaded[key],scale);if(o){o.position.x+=p.x;o.position.z+=p.z;o.position.y+=groundTop(c);o.rotation.y=seededRank(c,key==='deer'?19:23)*Math.PI*2;animalGroup.add(o)}};
  pickPopulationCells('herb',1.5).slice(0,9).forEach(c=>make(c,'deer',.62));pickPopulationCells('pred',.6).slice(0,5).forEach(c=>make(c,'fox',.5));
}
function makeFallbackHouse(level){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(.82,.55,.75),new THREE.MeshStandardMaterial({color:level>=2?0xc58f63:0x9b765d,roughness:.9}));body.position.y=.28;const roof=new THREE.Mesh(new THREE.ConeGeometry(.62,.4,4),new THREE.MeshStandardMaterial({color:0x704d3a,roughness:.9}));roof.position.y=.72;roof.rotation.y=Math.PI/4;g.add(body,roof);return g;
}
function addVillageProp(key,base,c,dx,dz,size,rotation=0){
  const o=normalizedClone(loaded[key],size);if(!o)return;
  o.position.x+=base.x+dx;o.position.z+=base.z+dz;o.position.y+=groundTop(c);o.rotation.y=rotation;villageGroup.add(o);
}
function rebuildVillages(){
  clearGroup(villageGroup);mixers.length=0;
  for(const s of sim.settlements){
    const c=sim.get(s.x,s.z);if(!c)continue;const base=worldPos(c),houses=Math.min(8,1+s.level*2+Math.floor(s.pop/24));
    for(let i=0;i<houses;i++){
      const a=i/houses*Math.PI*2,r=.6+Math.floor(i/4)*.45,key=s.level>=3&&i===0?'hall':'house';
      const o=normalizedClone(loaded[key],s.level>=3&&i===0?1.28:.9)||makeFallbackHouse(s.level);
      o.position.x+=base.x+Math.cos(a)*r;o.position.z+=base.z+Math.sin(a)*r;o.position.y+=groundTop(c);o.rotation.y=-a+Math.PI/2;villageGroup.add(o);
    }
    if(s.level>=1){
      const cropKey=c.moisture>.62?'rice':c.moisture>.42?'wheat':'corn';
      for(let i=0;i<4;i++)addVillageProp(cropKey,base,c,-1.15+i*.38,1.32+(i%2)*.22,.32,(i%2)*.12);
    }
    if(s.level>=2){
      addVillageProp('barn',base,c,1.55,1.15,1.18,-.4);
      addVillageProp('cow',base,c,1.72,.12,.56,.65);
      addVillageProp('pig',base,c,1.18,-.28,.48,-.55);
    }
    if(s.level>=3){
      addVillageProp('well',base,c,-1.55,.72,.62,.2);
      addVillageProp('windmill',base,c,-1.72,-1.12,1.26,.35);
      addVillageProp('coop',base,c,1.72,-1.15,.72,-.25);
    }
    const people=Math.min(3,1+s.level);
    for(let i=0;i<people;i++){
      const gltf=loaded[i%2?'humanB':'humanA'],o=normalizedClone(gltf,.72,true);if(!o)continue;
      const a=i/Math.max(1,people)*Math.PI*2;o.position.x+=base.x+Math.cos(a)*1.18;o.position.z+=base.z+Math.sin(a)*1.18;o.position.y+=groundTop(c);o.rotation.y=-a;villageGroup.add(o);
      const clips=gltf?.animations||[],clip=clips.find(q=>/idle|stand/i.test(q.name))||clips[0];if(clip){const mixer=new THREE.AnimationMixer(o);mixer.clipAction(clip).play();mixers.push(mixer)}
    }
  }
}
function rebuildFx(){
  clearGroup(fxGroup);for(const c of sim.cells.filter(c=>c.fire>.12).slice(0,35)){const p=worldPos(c),g=new THREE.Group();for(let i=0;i<2;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(.09+.04*i,.35+.16*i,7),new THREE.MeshBasicMaterial({color:i?0xffc35a:0xff6f3d,transparent:true,opacity:.84}));m.position.set((i-.5)*.1,.2+i*.08,0);g.add(m)}g.position.set(p.x,groundTop(c)+.03,p.z);g.scale.setScalar(.7+c.fire*.45);fxGroup.add(g)}
}
function rebuildLivingVisuals(){rebuildNature();rebuildAnimals();rebuildVillages();rebuildFx()}
function syncWorld(full=false){syncTerrain();if(full||sim.tick%3===0)rebuildNature();if(full||sim.tick%4===0)rebuildAnimals();if(full||sim.tick%4===0)rebuildVillages();rebuildFx();updateUI()}
function updateUI(){
  const s=sim.stats();ui.era.textContent=(s.year<20?'태초':s.settlements?'문명의 시대':'생명의 시대')+' · '+s.year+'년';ui.veg.textContent=s.veg+'%';ui.herb.textContent=s.herb;ui.pred.textContent=s.pred;ui.human.textContent=s.humans;ui.settlement.textContent=s.settlements;
  ui.eventLog.innerHTML=sim.eventLog.length?sim.eventLog.slice(0,5).map(e=>'<p><b>'+e.year+'년</b> · '+e.text+'</p>').join(''):'<p>아직 특별한 사건이 없어요.</p>';
  document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===speed));if(tutorial)updateTutorial();
}
function selectPower(type){if(!POWERS[type])return;selected=type;document.querySelectorAll('.power').forEach(b=>b.classList.toggle('active',b.dataset.power===type));ui.selectedLabel.textContent=POWERS[type].icon+' '+POWERS[type].label}
function setCategory(cat){
  category=cat;document.querySelectorAll('.categories button').forEach(b=>b.classList.toggle('active',b.dataset.category===cat));document.querySelectorAll('.power').forEach(b=>b.classList.toggle('categoryHidden',b.dataset.category!==cat));
  const first=document.querySelector('.power[data-category="'+cat+'"]:not(.categoryHidden)');if(first)selectPower(first.dataset.power);
}
function updateTutorial(){const t=TUTORIAL[Math.min(tutorialIndex,TUTORIAL.length-1)];ui.guideStep.textContent=t.step;ui.guideTitle.textContent=t.title;ui.guideText.textContent=t.text}
function tutorialPowerUsed(type){
  if(!tutorial)return;const t=TUTORIAL[tutorialIndex];if(!t)return;const matches=type===t.power||(tutorialIndex===3&&['herbivore','predator'].includes(type));if(!matches)return;
  if(tutorialIndex===3&&type==='herbivore'&&!sim.usedPowers.predator){ui.guideText.textContent='좋아요. 이제 같은 생명 탭에서 포식동물도 조금 놓아 보세요.';return}
  tutorialIndex++;if(tutorialIndex>=TUTORIAL.length){tutorial=false;ui.guideStep.textContent='자유 관찰';ui.guideTitle.textContent='이제 세상을 원하는 대로 바꿔 보세요';ui.guideText.textContent='정답은 없습니다. 한 가지를 너무 많이 바꾸면 어떤 일이 생기는지 관찰해 보세요.';toast('🎉 안내를 마쳤어요. 이제 자유롭게 실험해 보세요!');return}
  const next=TUTORIAL[tutorialIndex],btn=document.querySelector('.power[data-power="'+next.power+'"]');if(btn){setCategory(btn.dataset.category);selectPower(next.power)}updateTutorial();
}
function showInspector(c){
  if(!c)return;ui.tileTitle.textContent=({ocean:'바다',mountain:'산지',wetland:'습지',barren:'메마른 땅',forest:'숲',meadow:'풀꽃지대',grass:'초원'}[c.biome]||c.biome);ui.tileInfo.textContent=sim.describeCell(c);ui.inspector.classList.remove('hidden');
}
let toastTimer=0;function toast(msg){clearTimeout(toastTimer);ui.toast.textContent=msg;ui.toast.classList.add('show');toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2100)}
function hitCell(clientX,clientY){const rect=renderer.domElement.getBoundingClientRect(),m=new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(m,camera);const hit=raycaster.intersectObject(landMesh,false)[0];return hit&&Number.isInteger(hit.instanceId)?sim.cells[hit.instanceId]:null}
function usePowerAt(clientX,clientY){
  const c=hitCell(clientX,clientY);if(!c)return;const result=sim.applyPower(selected,c.x,c.z);if(result.inspect){showInspector(c);return}toast(result.msg);if(result.ok){tutorialPowerUsed(selected);syncWorld(true);saveGame(false);try{window.KidscadeGame?.sound?.(selected==='meteor'||selected==='lightning'?'hit':'click')}catch(e){}}
}
function panBy(dx,dy){const scale=viewSize/Math.max(500,innerHeight),right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);cameraTarget.addScaledVector(right,-dx*scale);cameraTarget.addScaledVector(up,dy*scale);cameraTarget.y=0;cameraTarget.x=THREE.MathUtils.clamp(cameraTarget.x,-9,9);cameraTarget.z=THREE.MathUtils.clamp(cameraTarget.z,-6,6);applyCamera()}
function bindPointer(){
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={active:true,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false}});
  canvas.addEventListener('pointermove',e=>{
    if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const ps=[...pointers.values()],d=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y);if(canvas._pinch){viewSize=THREE.MathUtils.clamp(viewSize-(d-canvas._pinch)*.025,13,35);resize()}canvas._pinch=d;drag.moved=true;return}
    if(drag.active&&e.pointerId===drag.id){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;if(drag.moved)panBy(dx,dy);drag.x=e.clientX;drag.y=e.clientY}
  });
  canvas.addEventListener('pointerup',e=>{const tap=drag.active&&e.pointerId===drag.id&&!drag.moved;if(tap)usePowerAt(e.clientX,e.clientY);pointers.delete(e.pointerId);canvas._pinch=null;if(e.pointerId===drag.id)drag.active=false});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag.active=false;canvas._pinch=null});
  canvas.addEventListener('wheel',e=>{e.preventDefault();viewSize=THREE.MathUtils.clamp(viewSize+Math.sign(e.deltaY)*1.3,13,35);resize()},{passive:false});
}
function saveGame(show=true){if(!running)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify({sim:sim.snapshot(),camera:{x:cameraTarget.x,z:cameraTarget.z,view:viewSize},savedAt:Date.now()}));if(show)toast('💾 세계를 저장했어요.')}catch(e){if(show)toast('저장하지 못했어요.')}}
function loadGame(){
  let data;try{data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){}if(!data?.sim)return false;const next=new WorldSim(data.sim.seed);if(!next.restore(data.sim))return false;sim=next;if(data.camera){cameraTarget.x=Number(data.camera.x)||0;cameraTarget.z=Number(data.camera.z)||0;viewSize=Number(data.camera.view)||24;applyCamera();resize()}return true;
}
function hasSave(){try{return !!localStorage.getItem(SAVE_KEY)}catch(e){return false}}
function begin(mode){
  tutorial=mode==='tutorial';tutorialIndex=0;if(mode==='continue'&&!loadGame())sim=new WorldSim();else if(mode!=='continue')sim=new WorldSim(Math.floor(Math.random()*0xffffffff));
  running=true;speed=1;ui.intro.classList.add('hidden');try{window.KidscadeGame?.start?.()}catch(e){}syncWorld(true);
  if(tutorial){const t=TUTORIAL[0],btn=document.querySelector('.power[data-power="'+t.power+'"]');setCategory(btn.dataset.category);selectPower(t.power);updateTutorial()}else{ui.guideStep.textContent='자유 관찰';ui.guideTitle.textContent='세상이 스스로 변하는 모습을 지켜보세요';ui.guideText.textContent='산·물·생명·문명을 직접 명령하지 말고 환경을 바꾸며 결과를 관찰하세요.'}preload();
}
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(.05,(now-last)/1000);last=now;mixers.forEach(m=>m.update(dt));if(running&&speed>0){accum+=dt*speed;saveClock+=dt;if(accum>=.8){const steps=Math.min(6,Math.floor(accum/.8));accum-=steps*.8;sim.step(steps);syncWorld(false)}if(saveClock>14){saveClock=0;saveGame(false)}}renderer.render(scene,camera);
}

document.querySelectorAll('.categories button').forEach(b=>b.addEventListener('click',()=>setCategory(b.dataset.category)));
document.querySelectorAll('.power').forEach(b=>b.addEventListener('click',()=>selectPower(b.dataset.power)));
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{speed=Number(b.dataset.speed);updateUI()}));
$('tutorialBtn').addEventListener('click',()=>begin('tutorial'));$('newBtn').addEventListener('click',()=>begin('new'));ui.continueBtn.addEventListener('click',()=>begin('continue'));
$('helpBtn').addEventListener('click',()=>ui.help.classList.remove('hidden'));$('closeHelpBtn').addEventListener('click',()=>ui.help.classList.add('hidden'));$('closeInspector').addEventListener('click',()=>ui.inspector.classList.add('hidden'));ui.saveBtn.addEventListener('click',()=>saveGame(true));
ui.continueBtn.disabled=!hasSave();ui.continueBtn.title=hasSave()?'저장한 세계를 불러옵니다.':'저장된 세계가 없어요.';
initThree();syncWorld(true);preload();requestAnimationFrame(animate);
