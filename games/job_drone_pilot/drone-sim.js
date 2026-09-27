import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (s) => document.querySelector(s);
const ui = {
  canvas: $('#game'), loading: $('#loading'), loadNote: $('#loadNote'), start: $('#start'), end: $('#end'),
  tutorialBtn: $('#tutorialBtn'), workBtn: $('#workBtn'), restartBtn: $('#restartBtn'),
  missionKind: $('#missionKind'), missionTitle: $('#missionTitle'), missionText: $('#missionText'), missionMeta: $('#missionMeta'),
  missionProgress: $('#missionProgress'), missionProgressBar: $('#missionProgress i'), battery: $('#battery'), altitude: $('#altitude'),
  speed: $('#speed'), mode: $('#mode'), wind: $('#wind'), health: $('#health'), heading: $('#heading'), targetBearing: $('#targetBearing'),
  targetDistance: $('#targetDistance'), toast: $('#toast'), cameraBtn: $('#cameraBtn'), focusBtn: $('#focusBtn'), fpvBtn: $('#fpvBtn'),
  rthBtn: $('#rthBtn'), armBtn: $('#armBtn'), modeBtn: $('#modeBtn'), gimbalUpBtn: $('#gimbalUpBtn'), gimbalDownBtn: $('#gimbalDownBtn'),
  controllerScreen: $('#controllerScreen'), pipCanvas: $('#pipView'), armState: $('#armState'), pipMode: $('#pipMode'),
  pipTelemetry: $('#pipTelemetry'), signal: $('#signal'), gimbalReadout: $('#gimbalReadout'),
  leftStick: $('#leftStick'), rightStick: $('#rightStick'), leftKnob: $('#leftKnob'), rightKnob: $('#rightKnob'),
  endTitle: $('#endTitle'), endText: $('#endText'), resultGrid: $('#resultGrid')
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const expFactor = (speed, dt) => 1 - Math.exp(-speed * dt);
const TAU = Math.PI * 2;
const FIXED_DT = 1 / 60;
const MAX_STEPS = 3;
const WORLD_HALF = 78;
const HOME = new THREE.Vector3(0, 0.36, 0);
const coarse = matchMedia?.('(pointer: coarse)')?.matches || navigator.maxTouchPoints > 0;

let scene, camera, renderer, pipCamera, pipRenderer, sun, loader;
let state = 'menu';
let fpv = false;
let flightMode = 'stable';
let cameraShake = 0;
let pipFrame = 0;
const windState = { base: new THREE.Vector2(.8, .2), current: new THREE.Vector2(.8, .2), t: 0, speed: .82 };
const gamepadState = { connected: false, index: -1, prev: [] };
const operatorView = {
  eye: new THREE.Vector3(0, 1.72, 10.5),
  yaw: 0,
  pitch: -0.08,
  pointer: null,
  lastX: 0,
  lastY: 0
};
let accumulator = 0;
let lastTime = performance.now();
let flightTime = 0;
let shiftRemaining = 360;
let missionDelay = 0;
let mission = null;
let lastMissionType = '';
let toastTimer = 0;
let lowBatteryWarned = false;
let criticalBatteryWarned = false;
let endPending = false;
let impactCooldown = 0;
let worldReady = false;

const stats = { missions: 0, photos: 0, collisions: 0, score: 0, distance: 0 };
const input = {
  keys: new Set(),
  left: { x: 0, y: 0, pointer: null },
  right: { x: 0, y: 0, pointer: null }
};
const rth = { active: false, phase: 'idle', safeY: 12, hover: 0 };
const colliders = [];
const scenicObjects = [];
const missionMeshes = new THREE.Group();
const dynamicMeshes = new THREE.Group();
const tempV = new THREE.Vector3();
const tempV2 = new THREE.Vector3();
const tempBox = new THREE.Box3();

const drone = {
  root: new THREE.Group(),
  tilt: new THREE.Group(),
  visual: new THREE.Group(),
  vel: new THREE.Vector3(),
  yaw: 0,
  batterySeconds: 450,
  armed: false,
  health: 100,
  gimbalPitch: -18,
  everAirborne: false,
  groundStill: 0,
  modelLoaded: false,
  rotors: []
};

const audio = { ctx: null, osc: null, gain: null };
function initAudio() {
  if (audio.ctx) { audio.ctx.resume?.(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio.ctx = new AC();
    audio.osc = audio.ctx.createOscillator();
    audio.gain = audio.ctx.createGain();
    audio.osc.type = 'sawtooth';
    audio.osc.frequency.value = 86;
    audio.gain.gain.value = 0.018;
    audio.osc.connect(audio.gain).connect(audio.ctx.destination);
    audio.osc.start();
  } catch (_) {}
}
function updateAudio(speed, lift) {
  if (!audio.ctx || !audio.osc || !audio.gain) return;
  const t = audio.ctx.currentTime;
  audio.osc.frequency.setTargetAtTime(82 + speed * 6 + Math.abs(lift) * 24, t, 0.04);
  audio.gain.gain.setTargetAtTime(state === 'playing' && drone.armed ? 0.015 + Math.min(0.018, speed * 0.0016) : 0.0001, t, 0.08);
}

function showToast(text, tone = 'normal', seconds = 2.1) {
  ui.toast.textContent = text;
  ui.toast.style.color = tone === 'danger' ? '#ff9ca6' : tone === 'warn' ? '#ffe18a' : '#e8f8ff';
  ui.toast.classList.add('show');
  toastTimer = seconds;
}
function hideToast() { ui.toast.classList.remove('show'); toastTimer = 0; }
function setMissionUI(kind, title, text) {
  ui.missionKind.textContent = kind;
  ui.missionTitle.textContent = title;
  ui.missionText.textContent = text;
}
function setProgress(value = null) {
  if (value == null) { ui.missionProgress.style.display = 'none'; return; }
  ui.missionProgress.style.display = 'block';
  ui.missionProgressBar.style.width = `${clamp(value, 0, 100)}%`;
}
function flightModeName(){ return flightMode === 'sport' ? '일반' : '안정'; }
function setFlightMode(mode, quiet=false) {
  flightMode = mode === 'sport' ? 'sport' : 'stable';
  ui.modeBtn?.classList.toggle('sport', flightMode === 'sport');
  if (ui.modeBtn) ui.modeBtn.textContent = flightMode === 'sport' ? '일반 모드' : '안정 모드';
  if (!quiet) showToast(flightMode === 'sport' ? '일반 모드 · 관성과 바람의 영향을 더 크게 받습니다.' : '안정 모드 · 스틱을 놓으면 자동으로 감속합니다.');
}
function toggleFlightMode(){ setFlightMode(flightMode === 'stable' ? 'sport' : 'stable'); }
function setArmed(active, quiet=false) {
  active = !!active;
  if (active && drone.health <= 0) return;
  if (!active && drone.root.position.y > .68) {
    if (!quiet) showToast('비행 중에는 모터를 끌 수 없습니다. 먼저 착륙하세요.','warn');
    return;
  }
  drone.armed = active;
  if (!active) drone.groundStill = 0;
  ui.armBtn?.classList.toggle('armed', active);
  ui.armState?.classList.toggle('armed', active);
  if (ui.armBtn) ui.armBtn.textContent = active ? '모터 정지' : '모터 시작';
  if (ui.armState) ui.armState.textContent = active ? 'ARMED' : 'SAFE';
  if (!quiet) showToast(active ? '모터 시작 · 주변을 확인하고 천천히 이륙하세요.' : '모터 정지 · 기체가 안전 상태입니다.', active ? 'warn' : 'normal');
}
function adjustGimbal(delta) {
  drone.gimbalPitch = clamp(drone.gimbalPitch + delta, -75, 5);
  if (ui.gimbalReadout) ui.gimbalReadout.textContent = `CAM ${Math.round(drone.gimbalPitch)}°`;
}
function randomizeWind() {
  const a = Math.random() * TAU, mag = .6 + Math.random() * 1.6;
  windState.base.set(Math.cos(a) * mag, Math.sin(a) * mag);windState.current.copy(windState.base);windState.t = 0; windState.speed = mag;
}
function updateWind(dt) {
  windState.t += dt;
  const gx = Math.sin(windState.t * .73) * .48 + Math.sin(windState.t * 1.91 + 1.2) * .18;
  const gz = Math.sin(windState.t * .61 + 2.4) * .42 + Math.sin(windState.t * 1.43) * .16;
  windState.current.set(windState.base.x + gx, windState.base.y + gz);windState.speed = windState.current.length();
}
function applyDeadzone(v, dz=.12) {const a=Math.abs(v);if(a<=dz)return 0;return Math.sign(v)*(a-dz)/(1-dz)}
function getGamepad() {
  const list=navigator.getGamepads?.()||[];
  if(gamepadState.index>=0&&list[gamepadState.index])return list[gamepadState.index];
  for(const gp of list)if(gp){gamepadState.index=gp.index;return gp}
  return null;
}
function pollGamepadButtons() {
  const gp=getGamepad();if(!gp){gamepadState.connected=false;gamepadState.prev=[];return}
  if(!gamepadState.connected){gamepadState.connected=true;showToast('게임패드 연결 · 듀얼 스틱 조종을 사용할 수 있습니다.')}
  const edge=i=>!!gp.buttons[i]?.pressed&&!gamepadState.prev[i];
  if(edge(0))setArmed(!drone.armed);if(edge(1))toggleFlightMode();if(edge(2))tryAction();if(edge(3))setRTH(!rth.active);
  gamepadState.prev=gp.buttons.map(b=>!!b.pressed);
}
function signalStrength() {const d=Math.hypot(drone.root.position.x-HOME.x,drone.root.position.z-HOME.z);return Math.round(clamp(100-d/(WORLD_HALF*1.08)*72,22,100))}
function cameraAimError(target) {
  const p=drone.root.position,dx=target.x-p.x,dz=target.z-p.z,hd=Math.max(.01,Math.hypot(dx,dz));
  const desiredPitch=THREE.MathUtils.radToDeg(Math.atan2((target.y||0)-p.y,hd));
  return {yaw:facingTarget(target),pitch:Math.abs(desiredPitch-drone.gimbalPitch)};
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x97d2f0);
  scene.fog = new THREE.Fog(0x97d2f0, 58, 145);
  camera = new THREE.PerspectiveCamera(60, innerWidth / Math.max(1, innerHeight), 0.05, 220);
  camera.position.set(0, 3.2, 7);
  renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.38 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  pipCamera = new THREE.PerspectiveCamera(72, 16 / 9, 0.04, 220);
  pipRenderer = new THREE.WebGLRenderer({ canvas: ui.pipCanvas, antialias: false, powerPreference: 'low-power' });
  pipRenderer.outputColorSpace = THREE.SRGBColorSpace;
  pipRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  pipRenderer.toneMappingExposure = 1.02;
  pipRenderer.shadowMap.enabled = false;

  scene.add(new THREE.HemisphereLight(0xdff6ff, 0x55734f, 2.05));
  sun = new THREE.DirectionalLight(0xfff1d5, 2.25);
  sun.position.set(32, 54, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -72; sun.shadow.camera.right = 72; sun.shadow.camera.top = 72; sun.shadow.camera.bottom = -72;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 130;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), new THREE.MeshStandardMaterial({ color: 0x73ad62, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  buildRoads();
  buildTrainingField();
  buildWorldFallbacks();
  buildDrone();
  scene.add(missionMeshes, dynamicMeshes, drone.root);
  loader = new GLTFLoader();
  resize();
}

function makeBox(w, h, d, color, x, y, z, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.84 }));
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m;
}
function makeFlat(w, d, color, x, z, y = 0.022) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, d), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
  m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m;
}
function buildRoads() {
  makeFlat(150, 9, 0x59636b, 0, 18);
  makeFlat(9, 150, 0x59636b, 20, 0);
  makeFlat(80, 7, 0x636d73, -24, -36);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1d467 });
  for (let x = -70; x <= 70; x += 9) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.026, 0.16), lineMat); l.position.set(x, 0.053, 18); scene.add(l);
  }
  for (let z = -70; z <= 70; z += 9) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.026, 4.2), lineMat); l.position.set(20, 0.053, z); scene.add(l);
  }
}
function buildTrainingField() {
  makeFlat(26, 26, 0x9bb4bb, 0, 0, 0.03);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x334c5d, roughness: 0.8 }));
  pad.position.set(0, 0.08, 0); pad.receiveShadow = true; scene.add(pad);
  const hMat = new THREE.MeshBasicMaterial({ color: 0xe9f6fb });
  const h1 = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.03, 0.38), hMat); h1.position.set(0, 0.13, 0); scene.add(h1);
  const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 3.1), hMat); h2.position.set(0, 0.13, 0); scene.add(h2);
  for (let i = 0; i < 10; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.62, 12), new THREE.MeshStandardMaterial({ color: 0xf08a35 }));
    const a = i / 10 * TAU; cone.position.set(Math.cos(a) * 7.5, 0.31, Math.sin(a) * 7.5); cone.castShadow = true; scene.add(cone);
  }
}

const buildingDefs = [
  { x: -42, z: -32, w: 15, d: 12, h: 8, color: 0xe9c899, asset: 'building-type-d.glb' },
  { x: -55, z: 18, w: 12, d: 10, h: 7, color: 0xd9a9a3, asset: 'building-type-a.glb' },
  { x: 43, z: 28, w: 14, d: 12, h: 8, color: 0xb5cbe0, asset: 'building-type-h.glb' },
  { x: 48, z: -40, w: 12, d: 10, h: 7, color: 0xe5d7a7, asset: 'building-type-g.glb' },
  { x: 4, z: -57, w: 18, d: 11, h: 6, color: 0xcbb9a7, asset: 'building-type-k.glb' },
  { x: -28, z: 48, w: 13, d: 11, h: 7, color: 0xd0b7dc, asset: 'building-type-c.glb' }
];
const treeDefs = [
  [-64,-8,4.8],[-58,-18,4.2],[-32,-58,4.8],[-17,-52,4.2],[-4,52,4.6],[11,58,4.2],[36,52,4.9],[58,7,4.7],[63,-12,4.3],[33,-59,4.5],[-60,47,4.6],[-45,55,4.2],[-14,35,4.4],[7,39,4.6]
];
const fallbackBuildings = new Map();
const fallbackTrees = [];
function buildWorldFallbacks() {
  for (const b of buildingDefs) {
    const body = makeBox(b.w, b.h, b.d, b.color, b.x, b.h / 2, b.z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(b.w, b.d) * .72, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0x6e5a52, roughness: .9 }));
    roof.position.set(b.x, b.h + 1, b.z); roof.rotation.y = Math.PI / 4; roof.castShadow = true; scene.add(roof);
    fallbackBuildings.set(b, [body, roof]);
    colliders.push({ type: 'box', x: b.x, z: b.z, w: b.w, d: b.d, h: b.h + 2 });
  }
  makeFlat(24, 18, 0x9a8252, -43, 46, 0.028);
  for (let i = 0; i < 6; i++) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(20, 0.16, 0.7), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x8e9e4f : 0x6d8f44 }));
    row.position.set(-43, 0.12, 40 + i * 2.1); scene.add(row);
  }
  for (const [x,z,h] of treeDefs) {
    const trunk = makeBox(.55, h*.48, .55, 0x75543d, x, h*.24, z);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(h*.36, 1), new THREE.MeshStandardMaterial({ color: 0x438856, roughness: .95 }));
    crown.position.set(x, h*.63, z); crown.castShadow = true; scene.add(crown);
    fallbackTrees.push([trunk,crown]);
    colliders.push({ type: 'circle', x, z, r: .85, h: h*.9 });
  }
  const tower = makeBox(2.2, 11, 2.2, 0x8b9ca8, 66, 5.5, 55);
  colliders.push({ type:'box', x:66, z:55, w:2.4, d:2.4, h:11 });
  for (let y = 2; y < 11; y += 2.1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(7, .14, .14), new THREE.MeshStandardMaterial({ color: 0xd0d8dd }));
    bar.position.set(66,y,55); bar.rotation.y = y % 4 > 2 ? .5 : -.5; scene.add(bar);
  }
  scenicObjects.push(tower);
}

async function loadWorldAssets() {
  const base = '../../assets/game/3d/city/kenney-city-kit-suburban/';
  let loaded = 0;
  const tasks = buildingDefs.map(async (b) => {
    const gltf = await loader.loadAsync(base + b.asset);
    const obj = gltf.scene;
    fitAndGround(obj, Math.max(b.w, b.d, b.h + 2));
    obj.position.x = b.x; obj.position.z = b.z;
    obj.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    const old = fallbackBuildings.get(b) || [];
    old.forEach(m => scene.remove(m));
    scene.add(obj); scenicObjects.push(obj); loaded++;
    ui.loadNote.textContent = `3D 에셋 ${loaded}/${buildingDefs.length + 2} 준비 중`;
  });
  const treeTask = (async () => {
    const gltf = await loader.loadAsync(base + 'tree-large.glb');
    const original = gltf.scene;
    treeDefs.forEach(([x,z,h], i) => {
      const obj = original.clone(true); fitAndGround(obj, h * 1.35); obj.position.x = x; obj.position.z = z;
      obj.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      const old = fallbackTrees[i] || []; old.forEach(m => scene.remove(m)); scene.add(obj); scenicObjects.push(obj);
    });
    loaded++; ui.loadNote.textContent = `3D 에셋 ${loaded}/${buildingDefs.length + 2} 준비 중`;
  })();
  const droneTask = loadDroneAsset().then(() => { loaded++; ui.loadNote.textContent = `3D 에셋 ${loaded}/${buildingDefs.length + 2} 준비 중`; });
  await Promise.allSettled([...tasks, treeTask, droneTask]);
}
function fitAndGround(obj, targetMax) {
  tempBox.setFromObject(obj);
  const size = tempBox.getSize(tempV);
  const max = Math.max(size.x, size.y, size.z) || 1;
  obj.scale.multiplyScalar(targetMax / max);
  tempBox.setFromObject(obj);
  obj.position.y -= tempBox.min.y;
}

function buildDrone() {
  drone.root.add(drone.tilt); drone.tilt.add(drone.visual);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x273c4b, metalness: .25, roughness: .55 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x4cc4ed, emissive: 0x0c3d4c, emissiveIntensity: .35, roughness: .45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05,.23,.72), bodyMat); body.castShadow = true; drone.visual.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(.42,.2,.28), accentMat); nose.position.set(0,-.03,-.48); nose.castShadow = true; drone.visual.add(nose);
  const armGeo = new THREE.BoxGeometry(1.45,.08,.1);
  for (const a of [Math.PI/4,-Math.PI/4]) { const arm = new THREE.Mesh(armGeo, bodyMat); arm.rotation.y = a; arm.castShadow = true; drone.visual.add(arm); }
  const rotorMat = new THREE.MeshBasicMaterial({ color: 0xc9f4ff, transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite:false });
  for (const [x,z] of [[.55,.55],[-.55,.55],[.55,-.55],[-.55,-.55]]) {
    const g = new THREE.Group(); g.position.set(x,.12,z);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.72,.015,.065), rotorMat); g.add(blade);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.08,12), bodyMat); hub.position.y=.015; g.add(hub);
    drone.visual.add(g); drone.rotors.push(g);
  }
  const cam = new THREE.Mesh(new THREE.SphereGeometry(.11,12,8), new THREE.MeshStandardMaterial({ color:0x111820, metalness:.45, roughness:.25 }));
  cam.position.set(0,-.18,-.43); drone.visual.add(cam);
  drone.root.position.copy(HOME);
}
async function loadDroneAsset() {
  try {
    const gltf = await loader.loadAsync('../../assets/game/3d/word-blaster/letter-drone.glb');
    const obj = gltf.scene; fitAndGroundCentered(obj, 1.65);
    obj.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    const preserved = drone.rotors.map(g => g.clone(true));
    drone.visual.clear(); drone.visual.add(obj); drone.rotors.length = 0;
    for (const g of preserved) { drone.visual.add(g); drone.rotors.push(g); }
    drone.modelLoaded = true;
  } catch (_) { drone.modelLoaded = false; }
}
function fitAndGroundCentered(obj, targetMax) {
  tempBox.setFromObject(obj); const size = tempBox.getSize(tempV); const max=Math.max(size.x,size.y,size.z)||1; obj.scale.multiplyScalar(targetMax/max);
  tempBox.setFromObject(obj); const center=tempBox.getCenter(tempV); obj.position.x -= center.x; obj.position.z -= center.z; obj.position.y -= center.y;
}

function clearMissionMeshes() { while (missionMeshes.children.length) missionMeshes.remove(missionMeshes.children[0]); while (dynamicMeshes.children.length) dynamicMeshes.remove(dynamicMeshes.children[0]); }
function makeGroundMarker(x,z,color=0x56d9ff) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1,.11,10,40), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.88 }));
  ring.rotation.x = Math.PI/2; ring.position.y=.12; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,5,8), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.22 }));
  beam.position.y=2.55; g.add(beam); g.position.set(x,0,z); missionMeshes.add(g); return g;
}
function makeRing(point,color=0x72e9ff) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.15,.13,12,44), new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:.45, roughness:.35 }));
  ring.position.set(point.x,point.y,point.z); ring.rotation.y = point.rot || 0; missionMeshes.add(ring); return ring;
}
function makePerson(x,z) {
  const g = new THREE.Group(); const shirt = new THREE.Mesh(new THREE.CapsuleGeometry(.32,.72,4,8),new THREE.MeshStandardMaterial({color:0xf17c68})); shirt.position.y=.78; g.add(shirt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.24,12,8),new THREE.MeshStandardMaterial({color:0xf2c8a0})); head.position.y=1.55; g.add(head); g.position.set(x,0,z); g.visible=false; dynamicMeshes.add(g); return g;
}

function resetDrone() {
  drone.root.position.copy(HOME); drone.vel.set(0,0,0); drone.yaw=0; drone.root.rotation.set(0,0,0); drone.tilt.rotation.set(0,0,0);
  drone.batterySeconds=450; drone.health=100; drone.gimbalPitch=-18; drone.everAirborne=false; drone.groundStill=0;
  rth.active=false; rth.phase='idle'; rth.hover=0; fpv=false; setArmed(false,true); setFlightMode('stable',true);
  ui.fpvBtn.classList.remove('active'); ui.fpvBtn.textContent='FPV 전체화면'; ui.rthBtn.classList.remove('active');
  adjustGimbal(0); focusDroneView(true);
}
function startGame(withTutorial) {
  initAudio(); state='playing'; ui.start.classList.remove('show'); ui.end.classList.remove('show'); hideToast();
  resetInputs(); resetDrone(); clearMissionMeshes(); randomizeWind(); flightTime=0; shiftRemaining=360; missionDelay=.4; mission=null; lastMissionType=''; endPending=false; impactCooldown=0; lowBatteryWarned=false; criticalBatteryWarned=false;
  Object.assign(stats,{missions:0,photos:0,collisions:0,score:0,distance:0});
  if (withTutorial) spawnTutorial(); else spawnMission(true);
  showToast('조종기에서 모터 시작을 길게 눌러 비행을 준비하세요.', 'warn', 3.2);
  lastTime=performance.now(); accumulator=0;
}
function endGame(reason='6분 비행 근무를 마쳤습니다.') {
  if (state!=='playing') return;
  state='ended'; resetInputs(); rth.active=false; ui.rthBtn.classList.remove('active'); ui.endTitle.textContent='오늘 비행 완료';
  ui.resultGrid.innerHTML=`<div><span>완료 임무</span><b>${stats.missions}</b></div><div><span>비행 거리</span><b>${Math.round(stats.distance)}m</b></div><div><span>충돌</span><b>${stats.collisions}</b></div><div><span>점수</span><b>${Math.round(stats.score)}</b></div>`;
  ui.endText.textContent=reason; ui.end.classList.add('show'); setMissionUI('근무 종료','비행 기록 저장 완료','다시 비행하면 새로운 임무 조합이 나옵니다.');
  if(audio.gain&&audio.ctx) audio.gain.gain.setTargetAtTime(.0001,audio.ctx.currentTime,.1);
}

function spawnTutorial() {
  clearMissionMeshes();
  mission={type:'tutorial',phase:'arm',index:0,time:0,max:145,rings:[new THREE.Vector3(0,6,-13),new THREE.Vector3(10,8,-25),new THREE.Vector3(-7,5,-36)]};
  lastMissionType='tutorial';
  setMissionUI('기초 훈련','① 모터 시작','조종기 중앙의 ‘모터 시작’을 길게 눌러 드론을 비행 가능 상태로 만드세요.');
  ui.cameraBtn.textContent='📷 촬영'; setProgress(0); makeGroundMarker(0,0,0x6fe7a9); showToast('먼저 모터를 시작하세요. Space 키로도 가능합니다.', 'normal', 3.4);
}
function tutorialUpdate(dt) {
  if (!mission || mission.type!=='tutorial') return;
  mission.time+=dt;
  const p=drone.root.position;
  if(mission.phase==='arm'){
    setProgress(drone.armed?100:0);ui.missionMeta.textContent=drone.armed?'ARMED · 이륙 준비 완료':'SAFE · 모터가 정지되어 있습니다.';
    if(drone.armed){mission.phase='takeoff';setMissionUI('기초 훈련','② 6m까지 상승','왼쪽 스틱을 위로 밀어 드론을 천천히 상승시키세요.');showToast('좋아요. 천천히 상승해 보세요.');}
  }else if(mission.phase==='takeoff'){
    const pct=clamp((p.y-.36)/5.65*100,0,100);setProgress(pct);ui.missionMeta.textContent=`현재 고도 ${p.y.toFixed(1)}m / 목표 6.0m`;
    if(p.y>=5.9){mission.phase='rings';mission.index=0;clearMissionMeshes();mission.rings.forEach((v,i)=>{const m=makeRing(v,i===0?0x74eeff:0x7c91a4);m.userData.courseIndex=i});setMissionUI('기초 훈련','③ 링 3개 통과','오른쪽 스틱으로 이동하고 왼쪽 스틱 좌우로 기체 방향을 돌려 보세요.');showToast('오른쪽 스틱으로 전후·좌우 이동');}
  }else if(mission.phase==='rings'){
    const t=mission.rings[mission.index];const d=p.distanceTo(t);setProgress(mission.index/3*100);ui.missionMeta.textContent=`링 ${mission.index+1}/3 · ${Math.max(0,d).toFixed(0)}m`;
    if(d<2.25){mission.index++;stats.score+=25;const rings=missionMeshes.children.filter(o=>o.geometry?.type==='TorusGeometry');rings.forEach((m,i)=>m.material.color.setHex(i===mission.index?0x74eeff:0x7c91a4));if(mission.index>=3){mission.phase='land';clearMissionMeshes();makeGroundMarker(0,0,0x73e8a9);setMissionUI('기초 훈련','④ 출발점에 착륙','H 표시 위로 돌아와 천천히 고도를 낮추세요.');showToast('착륙은 낮은 속도로!','warn');}}
  }else if(mission.phase==='land'){
    const hd=Math.hypot(p.x,p.z),sp=Math.hypot(drone.vel.x,drone.vel.z);setProgress(clamp((1-hd/25)*100,0,100));ui.missionMeta.textContent=`착륙장 ${hd.toFixed(0)}m · 속도 ${sp.toFixed(1)}m/s`;
    if(hd<2.8&&p.y<.62&&sp<1.05){finishMission(80,'기초 비행 훈련 완료! 이제 실제 임무가 시작됩니다.');missionDelay=1.8;}
  }
  if(mission&&mission.time>mission.max){showToast('훈련 시간이 연장되었습니다. 천천히 다시 해보세요.','warn',2.5);mission.time=80;}
}

const missionSites = {
  photo:[{x:-42,z:-32,y:11,label:'학교 옥상'},{x:43,z:28,y:10,label:'주택 지붕'},{x:4,z:-57,y:9,label:'창고 지붕'}],
  delivery:[{x:54,z:-22,label:'배송 지점 A'},{x:-52,z:36,label:'배송 지점 B'},{x:36,z:54,label:'배송 지점 C'}],
  search:[{x:-64,z:-8,label:'공원 가장자리'},{x:12,z:54,label:'주택 뒤편'},{x:-20,z:38,label:'농장 주변'}],
  inspect:[{x:66,z:55,label:'통신탑'},{x:-42,z:-32,label:'학교 외벽'}]
};
function choose(arr){return arr[Math.floor(Math.random()*arr.length)]}
function spawnMission(first=false){
  if(state!=='playing')return;clearMissionMeshes();
  let pool=['photo','inspect','delivery','search','course']; if(first) pool=['photo','course','delivery'];
  let type=choose(pool);if(type===lastMissionType) type=pool[(pool.indexOf(type)+1+Math.floor(Math.random()*(pool.length-1)))%pool.length];lastMissionType=type;
  if(type==='photo') spawnPhoto(); else if(type==='inspect') spawnInspect(); else if(type==='delivery') spawnDelivery(); else if(type==='search') spawnSearch(); else spawnCourse();
}
function spawnPhoto(){const s=choose(missionSites.photo);mission={type:'photo',site:s,time:0,max:68};makeGroundMarker(s.x,s.z,0x58cfff);setMissionUI('항공 촬영',`${s.label} 촬영`, '조종기 화면을 보며 거리를 맞추고 짐벌을 조절해 대상을 화면 중앙에 둔 뒤 촬영하세요.');ui.cameraBtn.textContent='📷 촬영';showToast('촬영 임무 수신 · 조종기 화면과 짐벌을 활용하세요.');}
function spawnInspect(){const s=choose(missionSites.inspect);let points;if(s.label==='통신탑')points=[new THREE.Vector3(60,5,55),new THREE.Vector3(66,9,49),new THREE.Vector3(72,6,55)];else points=[new THREE.Vector3(-34,5,-32),new THREE.Vector3(-42,9,-23),new THREE.Vector3(-51,6,-32)];mission={type:'inspect',site:s,points,index:0,time:0,max:70};points.forEach((p,i)=>{const m=makeRing(p,i===0?0x78f1c4:0x708b89);m.userData.courseIndex=i});setMissionUI('시설 점검',`${s.label} 3면 점검`,'빛나는 점검 위치를 순서대로 가까이 지나가세요.');ui.cameraBtn.textContent='📷 촬영';showToast('시설 점검 임무 수신');}
function spawnDelivery(){const s=choose(missionSites.delivery);mission={type:'delivery',site:s,time:0,max:70};makeGroundMarker(s.x,s.z,0xffc85c);setMissionUI('긴급 배송',`${s.label}에 물품 전달`,'표시된 착륙장에 속도를 줄여 부드럽게 착륙하세요.');ui.cameraBtn.textContent='📦 배송 중';showToast('배송 물품 탑재 완료');}
function spawnSearch(){const s=choose(missionSites.search);const person=makePerson(s.x,s.z);mission={type:'search',site:s,person,time:0,max:84,revealed:false};setMissionUI('실종자 수색',`${s.label} 수색`,'마지막 목격 지점 주변을 낮은 속도로 훑어보세요. 육안과 조종기 화면을 번갈아 확인합니다.');ui.cameraBtn.textContent='🔍 확인';showToast('수색 임무 수신 · 천천히 구역을 훑어보세요.');}
function spawnCourse(){const base=choose([{x:18,z:-12},{x:-16,z:24},{x:35,z:6}]);const points=[new THREE.Vector3(base.x,4.5,base.z),new THREE.Vector3(base.x+12,7,base.z-10),new THREE.Vector3(base.x+2,9,base.z-21),new THREE.Vector3(base.x-12,5.5,base.z-12)];mission={type:'course',points,index:0,time:0,max:60};points.forEach((p,i)=>{const m=makeRing(p,i===0?0x75edff:0x718694);m.userData.courseIndex=i});setMissionUI('장애물 비행','정밀 코스 통과','높이가 다른 링을 순서대로 통과하세요. 급하게 꺾기보다 속도를 줄여 정확히 지나가면 좋습니다.');ui.cameraBtn.textContent='📷 촬영';showToast('정밀 비행 코스 시작');}
function finishMission(points,msg){stats.missions++;stats.score+=points;mission=null;clearMissionMeshes();missionDelay=1.5;setMissionUI('임무 완료','다음 임무 수신 대기','주변을 안정적으로 비행하며 다음 요청을 기다리세요.');ui.missionMeta.textContent='';setProgress(null);showToast(msg);}
function failMission(msg){stats.score=Math.max(0,stats.score-15);mission=null;clearMissionMeshes();missionDelay=1.2;setMissionUI('임무 재배정','다음 임무 준비','시간이 지나 다른 임무로 넘어갑니다.');ui.missionMeta.textContent='';setProgress(null);showToast(msg,'warn');}
function currentMissionTarget(){
  if(!mission)return null;if(mission.type==='tutorial'){if(mission.phase==='rings')return mission.rings[mission.index]||HOME;if(mission.phase==='land')return HOME;return new THREE.Vector3(0,6,0)}
  if(mission.type==='photo'||mission.type==='delivery'||mission.type==='search')return new THREE.Vector3(mission.site.x,mission.site.y||0,mission.site.z);
  if(mission.type==='inspect'||mission.type==='course')return mission.points[mission.index]||null;return null;
}
function updateMission(dt){
  if(!mission){missionDelay-=dt;if(missionDelay<=0)spawnMission();return}
  if(mission.type==='tutorial'){tutorialUpdate(dt);return}
  if(!drone.armed && drone.root.position.y<=.45){ui.missionMeta.textContent='모터를 시작하면 임무 시간이 흐릅니다.';return}
  mission.time+=dt;if(mission.time>mission.max){failMission('임무 시간이 지나 다른 요청으로 넘어갑니다.');return}
  const p=drone.root.position;const target=currentMissionTarget();const hd=target?Math.hypot(target.x-p.x,target.z-p.z):0;ui.missionMeta.textContent=`목표 ${Math.max(0,Math.round(hd))}m · 남은 시간 ${Math.ceil(mission.max-mission.time)}초`;
  if(mission.type==='photo'){
    const altOk=p.y>6&&p.y<18;const near=hd<14;const aim=cameraAimError(target);const yawOk=aim.yaw<32,pitchOk=aim.pitch<28;
    const readiness=(near?35:0)+(altOk?25:0)+(yawOk?20:0)+(pitchOk?20:0);setProgress(readiness);
    ui.missionMeta.textContent+=` · ${near?'거리 OK':'더 접근'} · ${altOk?'고도 OK':'고도 6~18m'} · ${yawOk?'방향 OK':'기체 방향 조정'} · ${pitchOk?'카메라 OK':'짐벌 조정'}`;
  }else if(mission.type==='inspect'||mission.type==='course'){
    const t=mission.points[mission.index];const d=p.distanceTo(t);setProgress((mission.index/mission.points.length)*100);ui.missionMeta.textContent=`지점 ${mission.index+1}/${mission.points.length} · ${d.toFixed(0)}m`;
    if(d<2.3){mission.index++;stats.score+=12;const rings=missionMeshes.children;for(const m of rings){const i=m.userData.courseIndex;m.material?.color?.setHex(i===mission.index?0x75edff:0x718694)}if(mission.index>=mission.points.length)finishMission(mission.type==='course'?85:95,mission.type==='course'?'정밀 코스 통과 완료!':'시설 점검 완료!');}
  }else if(mission.type==='delivery'){
    const hsp=Math.hypot(drone.vel.x,drone.vel.z);const pct=(hd<8?45:Math.max(0,35-hd))+(p.y<2?25:0)+(hsp<1.4?30:0);setProgress(pct);ui.missionMeta.textContent+=` · 고도 ${p.y.toFixed(1)}m · 속도 ${hsp.toFixed(1)}m/s`;
    if(hd<2.9&&p.y<.62&&hsp<1.15)finishMission(100,'배송 성공! 부드럽게 착륙했습니다.');
  }else if(mission.type==='search'){
    if(hd<21&&!mission.revealed){mission.revealed=true;mission.person.visible=true;showToast('주변에서 사람을 발견했습니다. 가까이 가서 확인하세요!','warn',2.8)}
    const altOk=p.y>2.5&&p.y<13;setProgress(mission.revealed?clamp(100-hd*4,18,90):clamp((45-hd)*2,0,55));ui.missionMeta.textContent+=mission.revealed?` · 대상 발견 · 고도 ${altOk?'OK':'3~13m'}`:' · 주변을 천천히 살펴보세요';
  }
}
function facingTarget(target){const dx=target.x-drone.root.position.x,dz=target.z-drone.root.position.z;const desired=Math.atan2(dx,-dz);let d=(desired-drone.yaw)%(TAU);if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return Math.abs(d)*180/Math.PI}
function tryAction(){
  if(state!=='playing'||!mission)return;
  const p=drone.root.position;const target=currentMissionTarget();const hd=target?Math.hypot(target.x-p.x,target.z-p.z):999;
  if(mission.type==='photo'){
    const aim=cameraAimError(target);const ok=hd<14&&p.y>6&&p.y<18&&aim.yaw<32&&aim.pitch<28;
    if(ok){stats.photos++;stats.score+=20;flashPhoto();finishMission(110,'촬영 성공! 거리·고도·기체 방향·짐벌 구도가 모두 좋았습니다.')}else showToast(hd>=14?'촬영 대상에 조금 더 접근하세요.':p.y<=6||p.y>=18?'고도를 6~18m로 맞추세요.':aim.yaw>=32?'기체 앞쪽을 대상에 맞추세요.':'짐벌을 조절해 대상을 화면 중앙에 두세요.','warn');
  }else if(mission.type==='search'){
    const ok=mission.revealed&&hd<13&&p.y>2.5&&p.y<13;
    if(ok){stats.photos++;flashPhoto();finishMission(110,'실종자 위치 확인 완료! 구조팀에 좌표를 보냈습니다.')}else showToast(mission.revealed?'대상에 조금 더 가까이 접근하세요.':'먼저 수색 지역에서 대상을 찾아야 합니다.','warn');
  }else showToast('현재 임무는 촬영 버튼이 필요하지 않습니다.');
}
function flashPhoto(){const f=document.createElement('div');f.style.cssText='position:fixed;inset:0;background:white;z-index:40;opacity:.88;pointer-events:none;transition:opacity .22s';document.body.appendChild(f);requestAnimationFrame(()=>{f.style.opacity='0';setTimeout(()=>f.remove(),240)})}

function setRTH(active){
  if(state!=='playing')return;
  if(active){
    if(!drone.armed){showToast('자동귀환 전에 모터를 시작해야 합니다.','warn');return}
    rth.active=true;rth.phase='ascend';rth.safeY=Math.max(12,drone.root.position.y);rth.hover=0;
    ui.rthBtn.classList.add('active');ui.mode.textContent='귀환';showToast('자동귀환 시작 · 안전 고도로 이동합니다.','warn');
  }else{
    rth.active=false;rth.phase='idle';rth.hover=0;ui.rthBtn.classList.remove('active');showToast('자동귀환을 취소하고 조종권을 되찾았습니다.');
  }
}
function updateRTH(dt){
  if(!rth.active)return false;
  const p=drone.root.position;const toHome=tempV.set(-p.x,0,-p.z);const hd=toHome.length();
  if(rth.phase==='ascend'){
    desiredVelocity.set(0,Math.min(2.8,(rth.safeY-p.y)*1.1),0);if(p.y>=rth.safeY-.25)rth.phase='home';
  }else if(rth.phase==='home'){
    if(hd>0.05)toHome.normalize();desiredVelocity.set(toHome.x*5.2,clamp((rth.safeY-p.y)*1.4,-1.8,1.8),toHome.z*5.2);if(hd<2.2){rth.phase='hover';rth.hover=0;}
  }else if(rth.phase==='hover'){
    rth.hover+=dt;desiredVelocity.set(clamp(-p.x*1.2,-.8,.8),clamp((Math.min(rth.safeY,3.2)-p.y)*1.4,-1.8,1.8),clamp(-p.z*1.2,-.8,.8));
    if(p.y<=3.45&&rth.hover>.9){rth.phase='land';rth.hover=0;showToast('착륙 지점 확인 · 자동 착륙합니다.');}
  }else{
    desiredVelocity.set(clamp(-p.x*1.6,-1.2,1.2),p.y>.55?-1.25:0,clamp(-p.z*1.6,-1.2,1.2));
    if(hd<1.4&&p.y<=.48){rth.active=false;rth.phase='idle';ui.rthBtn.classList.remove('active');showToast('출발점 자동귀환 완료');if(endPending)endGame('근무 시간이 끝나 자동귀환 후 안전하게 착륙했습니다.');}
  }
  return true;
}

const desiredVelocity = new THREE.Vector3();
function getInputState(){
  const k=input.keys;let lx=input.left.x,ly=input.left.y,rx=input.right.x,ry=input.right.y;
  if(k.has('ArrowLeft'))lx-=1;if(k.has('ArrowRight'))lx+=1;if(k.has('ArrowUp'))ly-=1;if(k.has('ArrowDown'))ly+=1;
  if(k.has('KeyA'))rx-=1;if(k.has('KeyD'))rx+=1;if(k.has('KeyW'))ry-=1;if(k.has('KeyS'))ry+=1;
  const gp=getGamepad();if(gp){lx+=applyDeadzone(gp.axes[0]||0);ly+=applyDeadzone(gp.axes[1]||0);rx+=applyDeadzone(gp.axes[2]||0);ry+=applyDeadzone(gp.axes[3]||0)}
  const precision=k.has('ShiftLeft')||k.has('ShiftRight'),scale=precision?.42:1;
  return {yaw:clamp(lx,-1,1)*scale,lift:clamp(-ly,-1,1)*scale,strafe:clamp(rx,-1,1)*scale,forward:clamp(-ry,-1,1)*scale,precision};
}
function physicsStep(dt){
  if(state!=='playing')return;
  impactCooldown=Math.max(0,impactCooldown-dt);
  const c=getInputState();
  const sy=Math.sin(drone.yaw),cy=Math.cos(drone.yaw);
  drone.yaw += c.yaw * THREE.MathUtils.degToRad(100) * dt;
  if(drone.yaw>Math.PI)drone.yaw-=TAU;if(drone.yaw<-Math.PI)drone.yaw+=TAU;
  desiredVelocity.set(0,0,0);
  const usingRTH=updateRTH(dt);
  if(!usingRTH){
    const forwardSpeed=c.forward*6.8,strafeSpeed=c.strafe*5.2;
    desiredVelocity.x=sy*forwardSpeed+cy*strafeSpeed;desiredVelocity.z=-cy*forwardSpeed+sy*strafeSpeed;desiredVelocity.y=c.lift*3.0;
    if(drone.batterySeconds<=0){desiredVelocity.x=0;desiredVelocity.z=0;desiredVelocity.y=-1.1;}
  }
  const horizResponse=expFactor(3.15,dt),vertResponse=expFactor(4.0,dt);
  drone.vel.x=lerp(drone.vel.x,desiredVelocity.x,horizResponse);drone.vel.z=lerp(drone.vel.z,desiredVelocity.z,horizResponse);drone.vel.y=lerp(drone.vel.y,desiredVelocity.y,vertResponse);
  const prev=tempV2.copy(drone.root.position);drone.root.position.addScaledVector(drone.vel,dt);
  if(drone.root.position.y<.36){drone.root.position.y=.36;if(drone.vel.y<0)drone.vel.y=0;}
  if(drone.root.position.y>28){drone.root.position.y=28;if(drone.vel.y>0)drone.vel.y*=.3;showToast('훈련장 최대 고도 28m입니다.','warn',1.3)}
  enforceWorldBounds();
  checkCollisions(prev);
  const traveled=Math.hypot(drone.root.position.x-prev.x,drone.root.position.z-prev.z);stats.distance+=traveled;
  const hsp=Math.hypot(drone.vel.x,drone.vel.z);const drain=dt*(1+.26*clamp(hsp/6.8,0,1)+.18*Math.abs(c.lift));drone.batterySeconds=Math.max(0,drone.batterySeconds-drain);
  flightTime+=dt;shiftRemaining=Math.max(0,shiftRemaining-dt);
  if(shiftRemaining<=0&&!endPending){endPending=true;if(!rth.active)setRTH(true);setMissionUI('근무 종료','자동귀환 중','근무 시간이 끝났습니다. 출발점으로 안전하게 돌아갑니다.');mission=null;clearMissionMeshes();}
  const bat=drone.batterySeconds/450*100;
  if(bat<18&&!lowBatteryWarned){lowBatteryWarned=true;showToast('배터리 18% · 귀환을 준비하세요.','warn',3)}
  if(bat<7&&!criticalBatteryWarned){criticalBatteryWarned=true;showToast('배터리 위험 · 자동귀환을 시작합니다!','danger',3);setRTH(true)}
  if(bat<=0&&drone.root.position.y<=.45){endGame('배터리가 소진되어 비상 착륙했습니다. 다음 비행에서는 조금 일찍 귀환해 보세요.')}
  if(!endPending)updateMission(dt);
  const targetPitch=-c.forward*.21-clamp(drone.vel.z*cy-drone.vel.x*sy,-6,6)*.006;const targetRoll=-c.strafe*.23;
  drone.tilt.rotation.x=lerp(drone.tilt.rotation.x,targetPitch,expFactor(6,dt));drone.tilt.rotation.z=lerp(drone.tilt.rotation.z,targetRoll,expFactor(6,dt));drone.root.rotation.y=drone.yaw;
  for(const rotor of drone.rotors)rotor.rotation.y+=dt*(48+hsp*2.4+Math.abs(c.lift)*12);
  updateAudio(hsp,c.lift);
}
function enforceWorldBounds(){const p=drone.root.position;let hit=false;if(p.x<-WORLD_HALF){p.x=-WORLD_HALF;drone.vel.x=Math.max(0,drone.vel.x*.2);hit=true}else if(p.x>WORLD_HALF){p.x=WORLD_HALF;drone.vel.x=Math.min(0,drone.vel.x*.2);hit=true}if(p.z<-WORLD_HALF){p.z=-WORLD_HALF;drone.vel.z=Math.max(0,drone.vel.z*.2);hit=true}else if(p.z>WORLD_HALF){p.z=WORLD_HALF;drone.vel.z=Math.min(0,drone.vel.z*.2);hit=true}if(hit)showToast('훈련장 비행 구역을 벗어날 수 없습니다.','warn',1.5)}
function checkCollisions(prev){const p=drone.root.position;const radius=.58;for(const c of colliders){if(p.y>c.h+.45)continue;if(c.type==='box'){const minX=c.x-c.w/2-radius,maxX=c.x+c.w/2+radius,minZ=c.z-c.d/2-radius,maxZ=c.z+c.d/2+radius;if(p.x>minX&&p.x<maxX&&p.z>minZ&&p.z<maxZ){resolveImpact(prev);return}}else{const d=Math.hypot(p.x-c.x,p.z-c.z);if(d<c.r+radius){resolveImpact(prev);return}}}}
function resolveImpact(prev){drone.root.position.x=prev.x;drone.root.position.z=prev.z;drone.vel.x*=-.12;drone.vel.z*=-.12;if(impactCooldown<=0){impactCooldown=.8;stats.collisions++;stats.score=Math.max(0,stats.score-5);showToast('충격! 속도를 줄이고 기체를 안정화하세요.','danger',1.6)}}

function focusDroneView(immediate=false){
  if(!camera)return;
  const eye=operatorView.eye;
  const dx=drone.root.position.x-eye.x;
  const dy=(drone.root.position.y+.15)-eye.y;
  const dz=drone.root.position.z-eye.z;
  const flat=Math.hypot(dx,dz)||.001;
  operatorView.yaw=Math.atan2(dx,-dz);
  operatorView.pitch=clamp(Math.atan2(dy,flat),-.82,.88);
  if(immediate&&!fpv){
    camera.position.copy(eye);
    const cp=Math.cos(operatorView.pitch);
    tempV.set(Math.sin(operatorView.yaw)*cp,Math.sin(operatorView.pitch),-Math.cos(operatorView.yaw)*cp);
    camera.lookAt(tempV2.copy(eye).addScaledVector(tempV,30));
  }
}
function updateCamera(dt){
  const p=drone.root.position;
  const forward=tempV.set(Math.sin(drone.yaw),0,-Math.cos(drone.yaw));
  if(fpv){
    const desired=tempV2.copy(p).addScaledVector(forward,.48);desired.y+=.16;
    camera.position.lerp(desired,expFactor(14,dt));
    const look=desired.clone().addScaledVector(forward,20);look.y+=-drone.tilt.rotation.x*5;
    camera.lookAt(look);drone.visual.visible=false;camera.fov=73;
  }else{
    camera.position.lerp(operatorView.eye,expFactor(14,dt));
    const cp=Math.cos(operatorView.pitch);
    const lookDir=tempV.set(Math.sin(operatorView.yaw)*cp,Math.sin(operatorView.pitch),-Math.cos(operatorView.yaw)*cp);
    camera.lookAt(tempV2.copy(camera.position).addScaledVector(lookDir,30));
    drone.visual.visible=true;camera.fov=64;
  }
  camera.updateProjectionMatrix();
}
function updateMissionVisuals(time){
  missionMeshes.children.forEach((m,i)=>{if(m.geometry?.type==='TorusGeometry'){const pulse=1+Math.sin(time*3.2+i)*.035;m.scale.setScalar(pulse)}else if(m.isGroup){m.rotation.y+=.003;const ring=m.children[0];if(ring)ring.scale.setScalar(1+Math.sin(time*3.4)*.045)}});
}
function updateHUD(){
  const p=drone.root.position;const hsp=Math.hypot(drone.vel.x,drone.vel.z);const bat=clamp(drone.batterySeconds/450*100,0,100);
  ui.battery.textContent=`${Math.round(bat)}%`;ui.altitude.textContent=`${Math.max(0,p.y-.36).toFixed(1)} m`;ui.speed.textContent=`${hsp.toFixed(1)} m/s`;ui.mode.textContent=fpv?'드론':rth.active?'귀환':'조종사';
  ui.battery.classList.toggle('warn',bat<20&&bat>=8);ui.battery.classList.toggle('danger',bat<8);
  const deg=(THREE.MathUtils.radToDeg(drone.yaw)%360+360)%360;const dirs=['N','NE','E','SE','S','SW','W','NW'];ui.heading.textContent=dirs[Math.round(deg/45)%8];
  const t=currentMissionTarget();if(t){const dx=t.x-p.x,dz=t.z-p.z,dist=Math.hypot(dx,dz);ui.targetDistance.textContent=`${Math.round(dist)} m`;const desired=Math.atan2(dx,-dz);let rel=(desired-drone.yaw+TAU)%TAU;const arrows=['↑','↗','→','↘','↓','↙','←','↖'];ui.targetBearing.textContent=arrows[Math.round(rel/(TAU/8))%8]}else{ui.targetDistance.textContent='-- m';ui.targetBearing.textContent='•'}
  if(!mission&&!endPending)ui.missionMeta.textContent=`근무 ${Math.floor(shiftRemaining/60)}:${String(Math.ceil(shiftRemaining%60)).padStart(2,'0')} · 배터리 ${Math.round(bat)}%`;
  updateStickVisuals();
}
function updateStickVisuals(){const c=getInputState();const r=31;ui.leftKnob.style.transform=`translate(calc(-50% + ${c.yaw*r}px),calc(-50% + ${-c.lift*r}px))`;ui.rightKnob.style.transform=`translate(calc(-50% + ${c.strafe*r}px),calc(-50% + ${-c.forward*r}px))`;}

function loop(now){
  const frameDt=clamp((now-lastTime)/1000,0,.05);lastTime=now;accumulator+=frameDt;let steps=0;while(accumulator>=FIXED_DT&&steps<MAX_STEPS){physicsStep(FIXED_DT);accumulator-=FIXED_DT;steps++}if(steps===MAX_STEPS&&accumulator>=FIXED_DT)accumulator=0;
  if(toastTimer>0){toastTimer-=frameDt;if(toastTimer<=0)hideToast()}
  updateCamera(frameDt);updateMissionVisuals(now/1000);updateHUD();renderer.render(scene,camera);requestAnimationFrame(loop);
}

function installStick(el,key){
  const data=input[key];
  const update=(e)=>{const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,rad=Math.max(28,Math.min(r.width,r.height)*.38);const dx=e.clientX-cx,dy=e.clientY-cy,d=Math.hypot(dx,dy)||1,cap=Math.min(rad,d);data.x=clamp(dx/rad,-1,1);data.y=clamp(dy/rad,-1,1);if(d>rad){data.x=dx/d;data.y=dy/d}e.preventDefault()};
  el.addEventListener('pointerdown',e=>{if(data.pointer!==null)return;data.pointer=e.pointerId;try{el.setPointerCapture(e.pointerId)}catch(_){}update(e)});
  el.addEventListener('pointermove',e=>{if(e.pointerId===data.pointer)update(e)});
  const end=e=>{if(e.pointerId!==data.pointer)return;data.pointer=null;data.x=0;data.y=0};
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>el.addEventListener(type,end));
}
function resetInputs(){input.keys.clear();for(const side of [input.left,input.right]){side.x=0;side.y=0;side.pointer=null}updateStickVisuals()}
function installLookControls(){
  const canvas=ui.canvas;
  const begin=e=>{
    if(fpv||state!=='playing'||operatorView.pointer!==null)return;
    operatorView.pointer=e.pointerId;operatorView.lastX=e.clientX;operatorView.lastY=e.clientY;
    canvas.classList.add('looking');
    try{canvas.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault();
  };
  const move=e=>{
    if(e.pointerId!==operatorView.pointer||fpv)return;
    const dx=e.clientX-operatorView.lastX,dy=e.clientY-operatorView.lastY;
    operatorView.lastX=e.clientX;operatorView.lastY=e.clientY;
    const sensitivity=e.pointerType==='mouse'?.0042:.0056;
    operatorView.yaw-=dx*sensitivity;
    operatorView.pitch=clamp(operatorView.pitch-dy*sensitivity,-.82,.88);
    e.preventDefault();
  };
  const end=e=>{
    if(e.pointerId!==operatorView.pointer)return;
    operatorView.pointer=null;canvas.classList.remove('looking');
  };
  canvas.addEventListener('pointerdown',begin);
  canvas.addEventListener('pointermove',move);
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,end));
}
function installControls(){
  const allowed=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyC','KeyV','KeyR','KeyF']);
  addEventListener('keydown',e=>{if(!allowed.has(e.code)||e.repeat&&['KeyC','KeyV','KeyR','KeyF'].includes(e.code))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyC')tryAction();else if(e.code==='KeyV')toggleFPV();else if(e.code==='KeyR')setRTH(!rth.active);else if(e.code==='KeyF'){if(fpv)toggleFPV();focusDroneView();showToast('드론 방향을 다시 바라봅니다.')}else input.keys.add(e.code)});
  addEventListener('keyup',e=>input.keys.delete(e.code));
  addEventListener('blur',()=>{resetInputs();operatorView.pointer=null;ui.canvas.classList.remove('looking')});document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInputs();operatorView.pointer=null;ui.canvas.classList.remove('looking')}});
  installStick(ui.leftStick,'left');installStick(ui.rightStick,'right');installLookControls();
  ui.cameraBtn.addEventListener('click',tryAction);
  ui.focusBtn.addEventListener('click',()=>{if(fpv)toggleFPV();focusDroneView();showToast('드론 방향을 다시 바라봅니다.')});
  ui.fpvBtn.addEventListener('click',toggleFPV);ui.rthBtn.addEventListener('click',()=>setRTH(!rth.active));
  ui.tutorialBtn.addEventListener('click',()=>startGame(true));ui.workBtn.addEventListener('click',()=>startGame(false));ui.restartBtn.addEventListener('click',()=>{ui.end.classList.remove('show');ui.start.classList.add('show');state='menu';resetDrone();clearMissionMeshes();});
}
function toggleFPV(){if(state!=='playing')return;fpv=!fpv;ui.fpvBtn.classList.toggle('active',fpv);ui.fpvBtn.textContent=fpv?'조종사 화면':'드론 카메라';if(!fpv)focusDroneView();showToast(fpv?'드론 카메라로 전환':'지상 조종사 시점으로 복귀')}
function resize(){if(!renderer||!camera)return;camera.aspect=innerWidth/Math.max(1,innerHeight);camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.38:1.6))}
addEventListener('resize',resize);

async function boot(){
  try{initScene();installControls();requestAnimationFrame(loop);await loadWorldAssets();worldReady=true;ui.loadNote.textContent=drone.modelLoaded?'기존 키즈케이드 3D 에셋 연결 완료':'일부 에셋은 가벼운 대체 모델로 표시됩니다.';setTimeout(()=>ui.loading.classList.add('hide'),320)}
  catch(err){console.error(err);ui.loadNote.textContent='일부 3D 에셋 없이 기본 훈련장으로 시작합니다.';setTimeout(()=>ui.loading.classList.add('hide'),500)}
}
boot();