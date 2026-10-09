import * as THREE from 'three';
import { createPlayerCraft } from './craft.js';
import { makePrimeChase, startPrimeChase, activeEnemies, selectedEnemy, selectEnemy,
  firePrime, tickPrimeChase, roundStats, ROUND_SECONDS, WAVE_NUMBERS } from './prime-chase.mjs';
import { makePursuerScene } from './prime-chase-view.js';
import { drawPrimeRadar } from './prime-radar.js';
import { fighterSpec } from './prime-tactics.mjs';
import { safeMode, cameraPose } from './flight-view.mjs';
import { makeCollisionWorld, moveWithCollisions, guideAlongRoad, trafficPosition, intersectsWorld, safeChaseCamera } from './flight-physics.mjs';
import { CHUNK_SIZE, LOT_SIZE, ROAD_WIDTH, seedNumber, randomAt, createChunkData, chunkOf } from './city-core.mjs';

const $ = (id) => document.getElementById(id);
const canvas = $('city');
const mobile = window.matchMedia('(pointer: coarse)').matches;
const clamp = THREE.MathUtils.clamp;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
} catch (error) {
  $('intro').classList.add('hidden');
  $('errorPanel').classList.remove('hidden');
  $('errorMessage').textContent = 'WebGL을 시작하지 못했어요. Safari 또는 Chrome을 최신 버전으로 업데이트해 주세요.';
  throw error;
}
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  $('intro').classList.add('hidden');
  $('errorMessage').textContent = '그래픽 메모리가 부족해 3D 화면이 중단되었어요. 화질을 낮추고 다시 실행해 주세요.';
  $('errorPanel').classList.remove('hidden');
});
canvas.addEventListener('webglcontextrestored', () => window.location.reload());
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 1, 0.5, 2050);
camera.position.set(0, 200, 365);
camera.rotation.order = 'YXZ';
const pilotPosition = camera.position.clone();
const playerCraft = createPlayerCraft(scene);
const pursuitScene = makePursuerScene(scene);
let gameMode = 'explore';
let primeState = makePrimeChase();
const enemyRemovalQueue = [];
let bufferedShot = null;
let primeHudElapsed = 0, lastEnemyButtons = '', feedbackSeconds = 0;
let resultVisible = false;
let endCinematic = -1;
const enemyTotal = () => primeState.waves.flat().length;
let audioContext = null;
let engineAmbience = null;
let radarElapsed = 0;
let hitFlashSeconds = 0;
let rearView = false;
playerCraft.loadExterior();
let viewMode = 'chase';
let lookYaw = 0, lookPitch = 0, flightSpeed = 0, steeringVisual = 0;

const skyDay = new THREE.Color(0x87a9d0);
const skyNight = new THREE.Color(0x0b1832);
scene.background = skyDay.clone();
scene.fog = new THREE.FogExp2(skyDay, 0.00155);
const ambient = new THREE.HemisphereLight(0xb4d9ff, 0x1c2d45, 2.0);
const sun = new THREE.DirectionalLight(0xffedcc, 2.1);
sun.position.set(-350, 700, -430);
scene.add(ambient, sun);

const cube = new THREE.BoxGeometry(1, 1, 1);
const floorGeo = new THREE.PlaneGeometry(1, 1);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(5800, 5800), new THREE.MeshLambertMaterial({ color: 0x112135 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.4;
scene.add(ground);

const bodyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uFog: { value: skyDay.clone() },
    uNight: { value: 0.12 },
    uFogDensity: { value: 0.00155 }
  },
  vertexShader: [
    // Three.js supplies instanceColor under USE_INSTANCING_COLOR.
    'varying vec3 vColour;',
    'varying vec3 vWorld;',
    'varying vec3 vNormal;',
    'void main(){',
    '  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);',
    '  vWorld = world.xyz;',
    '  vNormal = normal;',
    '  vColour = instanceColor;',
    '  gl_Position = projectionMatrix * viewMatrix * world;',
    '}'
  ].join('\n'),
  fragmentShader: [
    'precision highp float;',
    'uniform vec3 uFog;',
    'uniform float uNight;',
    'uniform float uFogDensity;',
    'varying vec3 vColour;',
    'varying vec3 vWorld;',
    'varying vec3 vNormal;',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }',
    'void main(){',
    '  float sunlight = 0.44 + 0.28 * max(dot(vNormal, normalize(vec3(-0.5,0.85,0.5))),0.0);',
    '  vec3 base = vColour * sunlight * mix(1.7, 0.83, uNight);',
    '  float horizontal = vNormal.x * vNormal.x + vNormal.z * vNormal.z;',
    '  float u = abs(vNormal.x) > 0.5 ? vWorld.z : vWorld.x;',
    '  vec2 tile = vec2(u / 5.0, vWorld.y / 5.6);',
    '  vec2 grid = floor(tile);',
    '  vec2 uv = fract(tile);',
    '  float frame = step(0.15, uv.x) * step(uv.x, 0.86) * step(0.18, uv.y) * step(uv.y, 0.84);',
    '  float lit = step(0.35, hash(grid + floor(vWorld.xz * 0.003) * 17.0));',
    '  float windowOn = horizontal * frame * lit;',
    '  vec3 glass = mix(vec3(0.09,0.23,0.32), vec3(0.72,0.94,1.0), step(0.78,hash(grid+7.1)));',
    '  base = mix(base, mix(base*0.7, glass, uNight), windowOn * 0.85);',
    '  float dist = distance(vWorld, cameraPosition);',
    '  float fogFactor = clamp(1.0 - exp(-pow(dist * uFogDensity, 1.35)), 0.0, 1.0);',
    '  gl_FragColor = vec4(mix(base,uFog,fogFactor),1.0);',
    '}'
  ].join('\n')
});
const facadePalette = [
  0x496988, 0x42516f, 0x365b78, 0x516580, 0x38495b, 0x56738e, 0x445c86
].map(color => new THREE.Color(color));
const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x59839a, emissive: 0x071a2c, vertexColors: false });
const parkMaterial = new THREE.MeshLambertMaterial({ color: 0x244d50 });
const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x172333 });
const laneMaterial = new THREE.MeshBasicMaterial({ color: 0x2f778c });
const antennaMaterial = new THREE.MeshBasicMaterial({ color: 0x8ad8e2 });
const dummy = new THREE.Object3D();
const loaded = new Map();
const distantMaterial = new THREE.MeshLambertMaterial({ color: 0x3c5772, fog: true });
let distantMesh = null;

function instance(geometry, material, count, parent) {
  if (!count) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false; // Instances span a large chunk; avoid inaccurate per-object culling.
  mesh.count = count;
  parent.add(mesh);
  return mesh;
}
function matrixAt(mesh, index, x, y, z, width, height, depth, angle = 0) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, angle, 0);
  dummy.scale.set(width, height, depth);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}
function finish(mesh) {
  if (!mesh) return;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
function createChunk(cx, cz) {
  const data = createChunkData(cx, cz, worldSeed);
  const group = new THREE.Group();
  group.name = 'city ' + cx + ',' + cz;
  const body = instance(cube, bodyMaterial, data.buildings.length, group);
  const crowns = data.buildings.filter(b => b.crown);
  const roof = instance(cube, roofMaterial, crowns.length, group);
  const aerials = data.buildings.filter(b => b.antenna);
  const antennas = instance(cube, antennaMaterial, aerials.length, group);
  data.buildings.forEach((b, i) => {
    matrixAt(body, i, b.x, b.height / 2, b.z, b.width, b.height, b.depth);
    body.setColorAt(i, facadePalette[b.colour]);
  });
  crowns.forEach((b, i) => {
    matrixAt(roof, i, b.x, b.height + b.roofHeight * 0.5, b.z, b.width * 0.65, b.roofHeight, b.depth * 0.65);
  });
  aerials.forEach((b, i) => {
    matrixAt(antennas, i, b.x, b.height + (b.crown ? b.roofHeight : 0) + 10, b.z, 0.7, 20, 0.7);
  });
  const parks = instance(floorGeo, parkMaterial, data.parks.length, group);
  data.parks.forEach((p, i) => {
    dummy.position.set(p.x, 0.02, p.z);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.set(p.size, p.size, 1);
    dummy.updateMatrix();
    parks.setMatrixAt(i, dummy.matrix);
  });

  // Streets use two batched instance meshes per tile, not thousands of individual draws.
  const roads = instance(floorGeo, roadMaterial, 10, group);
  const lines = instance(floorGeo, laneMaterial, 10, group);
  for (let i = 0; i < 5; i++) {
    const offset = -CHUNK_SIZE / 2 + i * LOT_SIZE;
    const x = cx * CHUNK_SIZE + offset;
    const z = cz * CHUNK_SIZE + offset;
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.position.set(x, 0.04, cz * CHUNK_SIZE);
    dummy.scale.set(ROAD_WIDTH, CHUNK_SIZE + ROAD_WIDTH, 1);
    dummy.updateMatrix();
    roads.setMatrixAt(i, dummy.matrix);
    dummy.position.set(cx * CHUNK_SIZE, 0.04, z);
    dummy.scale.set(CHUNK_SIZE + ROAD_WIDTH, ROAD_WIDTH, 1);
    dummy.updateMatrix();
    roads.setMatrixAt(i + 5, dummy.matrix);

    dummy.position.set(x, 0.065, cz * CHUNK_SIZE);
    dummy.scale.set(0.4, CHUNK_SIZE + ROAD_WIDTH, 1);
    dummy.updateMatrix();
    lines.setMatrixAt(i, dummy.matrix);
    dummy.position.set(cx * CHUNK_SIZE, 0.065, z);
    dummy.scale.set(CHUNK_SIZE + ROAD_WIDTH, 0.4, 1);
    dummy.updateMatrix();
    lines.setMatrixAt(i + 5, dummy.matrix);
  }
  [body, roof, antennas, parks, roads, lines].forEach(finish);
  scene.add(group);
  return { group, count: data.buildings.length };
}
// One distant LOD batch hides the edge of the nine nearby detailed chunks.
function rebuildSkyline(cx, cz, radius) {
  if (distantMesh) {
    scene.remove(distantMesh);
    distantMesh.dispose();
    distantMesh = null;
  }
  const shapes = [];
  const farRadius = quality === 'high' ? 6 : 5;
  for (let x = cx - farRadius; x <= cx + farRadius; x++) {
    for (let z = cz - farRadius; z <= cz + farRadius; z++) {
      if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) <= radius) continue;
      const data = createChunkData(x, z, worldSeed);
      for (let i = 0; i < data.buildings.length; i += 3) shapes.push(data.buildings[i]);
    }
  }
  distantMesh = instance(cube, distantMaterial, shapes.length, scene);
  shapes.forEach((b, i) => matrixAt(distantMesh, i, b.x, b.height / 2, b.z, b.width, b.height, b.depth));
  finish(distantMesh);
}
function unloadChunk(key) {
  const old = loaded.get(key);
  if (!old) return;
  scene.remove(old.group);
  old.group.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
  loaded.delete(key);
}

const vehicleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: false });
const vehicleGeometry = new THREE.BoxGeometry(1, 1, 1);
let vehicles = null;
let vehicleCount = 0;
let trafficSeed = 0;
let trafficPositions = [];
let vehicleGlows = null;
function rebuildTraffic() {
  if (vehicles) { scene.remove(vehicles); vehicles.dispose(); }
  if (vehicleGlows) { scene.remove(vehicleGlows); vehicleGlows.dispose(); }
  trafficPositions = [];
  vehicleCount = quality === 'high' ? 76 : quality === 'medium' ? 42 : 22;
  vehicles = instance(vehicleGeometry, vehicleMaterial, vehicleCount, scene);
  vehicleGlows = instance(vehicleGeometry, new THREE.MeshBasicMaterial({color:0x31cdef}), vehicleCount, scene);
  for (let i = 0; i < vehicleCount; i++) {
    const t = randomAt(trafficSeed, i, 0, 40);
    vehicles.setColorAt(i, new THREE.Color().setHSL(0.5 + t * 0.12, 0.9, 0.52));
  }
  finish(vehicles);
  finish(vehicleGlows);
}
function moveVehicles(seconds) {
  if (!vehicles) return;
  trafficPositions.length = 0;
  for (let i = 0; i < vehicleCount; i++) {
    const car = trafficPosition(i, seconds, trafficSeed, pilotPosition);
    trafficPositions.push(car);
    matrixAt(vehicles, i, car.x, car.y, car.z, 7, 1.9, 3.2, car.angle);
    // A slim glowing underbody makes passing flying traffic legible after dark.
    matrixAt(vehicleGlows, i, car.x, car.y - 1.02, car.z, 5.8, 0.11, 0.66, car.angle);
  }
  finish(vehicles);
  finish(vehicleGlows);
}

const touchAxis = { x: 0, y: 0 };
const held = new Set();
let dragging = null;
let yaw = -0.07;
let pitch = -0.3;
let active = false;
let autoFlight = true;
let night = false;
let qualitySetting = 'auto';
let quality = mobile ? 'low' : 'medium';
let pixelRatio = 1;
let worldSeed = seedNumber('NEON-01');
let collisionWorld = makeCollisionWorld(worldSeed);
let lastCollisionAt = -100;
let collidedRecently = false;
let lastChunkX = null;
let lastChunkZ = null;
let lastRadius = -1;
let lastTimestamp = 0;
let seconds = 0;
let frameCount = 0;
let fpsTime = 0;
let lowFpsCount = 0;
let cityReady = false;
let travelledMeters = 0;
let boostSeconds = 0;
const discoveries = new Set();
function discover(id) {
  if (!active || discoveries.has(id)) return;
  discoveries.add(id);
  window.KidscadeGame?.milestone?.(id, { uniqueKey: id });
}


function desiredQuality() {
  return qualitySetting === 'auto' ? (mobile ? 'low' : 'medium') : qualitySetting;
}
function setPixelRatio() {
  const cap = quality === 'high' ? 1.65 : quality === 'medium' ? 1.3 : 1;
  pixelRatio = Math.min(window.devicePixelRatio || 1, cap);
  renderer.setPixelRatio(pixelRatio);
  resize();
}
function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
function loadNearby(force = false) {
  const cx = chunkOf(pilotPosition.x);
  const cz = chunkOf(pilotPosition.z);
  const radius = quality === 'high' ? 2 : 1;
  if (!force && cx === lastChunkX && cz === lastChunkZ && radius === lastRadius) return;
  lastChunkX = cx;
  lastChunkZ = cz;
  lastRadius = radius;
  const keep = new Set();
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let z = cz - radius; z <= cz + radius; z++) {
      const key = x + ':' + z;
      keep.add(key);
      if (!loaded.has(key)) loaded.set(key, createChunk(x, z));
    }
  }
  for (const key of loaded.keys()) if (!keep.has(key)) unloadChunk(key);
  rebuildSkyline(cx, cz, radius);
  $('district').textContent = '동네 ' + cx + ' · ' + cz;
  let count = 0;
  for (const chunk of loaded.values()) count += chunk.count;
  $('count').textContent = '빌딩 ' + count + '채';
  cityReady = true;
}
function applyQuality() {
  quality = desiredQuality();
  setPixelRatio();
  for (const key of Array.from(loaded.keys())) unloadChunk(key);
  lastRadius = -1;
  loadNearby(true);
  rebuildTraffic();
}
function applySeed(value) {
  let chosen = value.trim().slice(0, 22);
  if (!chosen) chosen = 'NEON-01';
  $('seed').value = chosen;
  worldSeed = seedNumber(chosen);
  collisionWorld = makeCollisionWorld(worldSeed);
  trafficSeed = worldSeed;
  if (intersectsWorld(pilotPosition, collisionWorld)) {
    // Switching city seeds mid-flight can place a new tower around the player.
    // Return to the nearest safe avenue without interrupting the flight.
    pilotPosition.x = Math.round(pilotPosition.x / LOT_SIZE) * LOT_SIZE;
  }
  applyQuality();
}
function setViewMode(nextMode) {
  rearView = false;
  $('rearViewButton').setAttribute('aria-pressed', 'false');
  $('rearViewButton').textContent = '후방 보기';
  viewMode = safeMode(nextMode);
  lookYaw = 0;
  lookPitch = 0;
  playerCraft.setView(viewMode);
  document.querySelectorAll('[data-view-mode]').forEach(button => {
    const chosen = button.dataset.viewMode === viewMode;
    button.setAttribute('aria-pressed', String(chosen));
  });
  $('viewLabel').textContent = viewMode === 'cockpit' ? '운전석 안' : viewMode === 'chase' ? '자동차 뒤' : '자유 비행';
  $('chaseCameraButton').textContent = viewMode === 'cockpit' ? '자동차 뒤 보기' : '운전석 보기';
  updateCamera();
}
function setRearView(enabled) {
  rearView = !!enabled && gameMode === 'chase';
  $('rearViewButton').setAttribute('aria-pressed', String(rearView));
  $('rearViewButton').textContent = rearView ? '전방 복귀' : '후방 보기';
  playerCraft.setView(rearView ? 'chase' : viewMode);
  updateCamera();
}
function updateCamera() {
  if (rearView && gameMode === 'chase') {
    // A true 3D camera in front of the car looking back at the pursuing aircraft.
    // Unlike a minimap, this actually reveals enemy silhouettes and incoming lasers.
    const eye = {
      x: pilotPosition.x - Math.sin(yaw) * 20,
      y: pilotPosition.y + 8,
      z: pilotPosition.z - Math.cos(yaw) * 20
    };
    const safe = safeChaseCamera(eye, pilotPosition, collisionWorld);
    camera.position.set(safe.x, safe.y, safe.z);
    camera.lookAt(
      pilotPosition.x + Math.sin(yaw) * 48,
      pilotPosition.y + 4,
      pilotPosition.z + Math.cos(yaw) * 48
    );
    return;
  }
  const pose = cameraPose(viewMode, pilotPosition, yaw, pitch, lookYaw, lookPitch);
  const position = pose.target
    ? safeChaseCamera(pose.position, pilotPosition, collisionWorld)
    : pose.position;
  camera.position.set(position.x, position.y, position.z);
  if (pose.target) {
    if (gameMode === 'chase' && viewMode === 'chase') {
      const threat = pursuitScene.visuals.get(selectedEnemy(primeState)?.id);
      if (threat?.root && threat.body.visible) {
        // Subtle framing assist while the actual danger bearing stays on radar.
        const dx = threat.root.position.x - pilotPosition.x;
        const dz = threat.root.position.z - pilotPosition.z;
        pose.target.x += clamp(dx * .17, -15, 15);
        pose.target.z += clamp(dz * .17, -15, 15);
      }
    }
    camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  }
  else camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
}
function setAutoFlight(enabled) {
  autoFlight = enabled;
  $('autoButton').setAttribute('aria-pressed', String(enabled));
  $('autoButton').textContent = enabled ? '자동 구경 중' : '직접 비행 중';
}
function setTime(nightMode) {
  night = nightMode;
  $('timeButton').textContent = night ? '낮' : '밤';
  bodyMaterial.uniforms.uNight.value = night ? 1.0 : 0.11;
  scene.background.copy(night ? skyNight : skyDay);
  scene.fog.color.copy(night ? skyNight : skyDay);
  bodyMaterial.uniforms.uFog.value.copy(scene.fog.color);
  ambient.intensity = night ? 0.55 : 2.0;
  sun.intensity = night ? 0.14 : 2.1;
  laneMaterial.color.setHex(night ? 0x28b8ca : 0x2f778c);
  ground.material.color.setHex(night ? 0x081426 : 0x112135);
  if (night && active) discover('night_flight');
}
function bindPress(id, key) {
  const target = $(id);
  const release = (event) => {
    held.delete(key);
    try { target.releasePointerCapture(event.pointerId); } catch { /* capture may already be gone */ }
  };
  target.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    target.setPointerCapture(event.pointerId);
    held.add(key);
    setAutoFlight(false);
  });
  target.addEventListener('pointerup', release);
  target.addEventListener('pointercancel', release);
  target.addEventListener('lostpointercapture', () => held.delete(key));
}
bindPress('ascend', 'rise');
bindPress('descend', 'sink');
bindPress('boost', 'boost');

const stickSurface = $('stickSurface');
let stickPointer = null;
function updateStick(event) {
  const r = $('stickRing').getBoundingClientRect();
  const dx = event.clientX - (r.left + r.width / 2);
  const dy = event.clientY - (r.top + r.height / 2);
  const magnitude = Math.max(1, Math.hypot(dx, dy));
  const limit = Math.min(1, magnitude / 46);
  touchAxis.x = dx / magnitude * limit;
  touchAxis.y = dy / magnitude * limit;
  $('stickKnob').style.transform = 'translate(' + (touchAxis.x * 34) + 'px,' + (touchAxis.y * 34) + 'px)';
}
function resetStick() {
  touchAxis.x = 0;
  touchAxis.y = 0;
  $('stickKnob').style.transform = '';
  stickPointer = null;
}
stickSurface.addEventListener('pointerdown', event => {
  event.preventDefault();
  if (stickPointer !== null) return;
  stickPointer = event.pointerId;
  stickSurface.setPointerCapture(event.pointerId);
  updateStick(event);
  setAutoFlight(false);
});
stickSurface.addEventListener('pointermove', event => {
  if (stickPointer === event.pointerId) updateStick(event);
});
stickSurface.addEventListener('pointerup', event => {
  if (stickPointer === event.pointerId) resetStick();
});
stickSurface.addEventListener('pointercancel', event => {
  if (stickPointer === event.pointerId) resetStick();
});
stickSurface.addEventListener('lostpointercapture', resetStick);

canvas.addEventListener('pointerdown', event => {
  if (!active || dragging || event.button !== 0) return;
  event.preventDefault();
  dragging = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!dragging || dragging.pointerId !== event.pointerId) return;
  const dx = event.clientX - dragging.x;
  const dy = event.clientY - dragging.y;
  dragging.x = event.clientX;
  dragging.y = event.clientY;
  if (Math.abs(dx) + Math.abs(dy) > 0 && viewMode !== 'cockpit') setAutoFlight(false);
  if (viewMode === 'cockpit') {
    lookYaw = clamp(lookYaw - dx * 0.0032, -1.15, 1.15);
    lookPitch = clamp(lookPitch - dy * 0.0029, -0.54, 0.72);
  } else {
    yaw -= dx * 0.0032;
    pitch = clamp(pitch - dy * 0.0029, -1.3, 1.25);
  }
});
function endLook(event) {
  if (dragging?.pointerId === event.pointerId) dragging = null;
}
canvas.addEventListener('pointerup', endLook);
canvas.addEventListener('pointercancel', endLook);
canvas.addEventListener('lostpointercapture', endLook);
document.addEventListener('keydown', event => {
  if (document.activeElement === $('seed') || document.activeElement === $('quality')) return;
  if (event.code === 'KeyR' && !event.repeat && active && gameMode === 'chase') {
    event.preventDefault(); setRearView(!rearView); return;
  }
  const prime = { Digit2: 2, Digit3: 3, Digit5: 5, Digit7: 7, Numpad2: 2, Numpad3: 3, Numpad5: 5, Numpad7: 7 }[event.code];
  if (prime && !event.repeat && gameMode === 'chase') { event.preventDefault(); shootPrime(prime); return; }
  if (/^(Key[WASDQE]|Arrow(Up|Down|Left|Right)|ShiftLeft|ShiftRight)$/.test(event.code)) {
    event.preventDefault();
    held.add(event.code);
    if (active) setAutoFlight(false);
  }
});
document.addEventListener('keyup', event => held.delete(event.code));
window.addEventListener('blur', () => {
  held.clear();
  resetStick();
  dragging = null;
});
$('autoButton').addEventListener('click', () => setAutoFlight(!autoFlight));
document.querySelectorAll('[data-view-mode]').forEach(button => {
  button.addEventListener('click', () => setViewMode(button.dataset.viewMode));
});
$('timeButton').addEventListener('click', () => setTime(!night));
$('quality').addEventListener('change', event => {
  qualitySetting = event.target.value;
  applyQuality();
});
let selectedSeed = 'NEON-01';
$('generate').addEventListener('click', () => {
  let newSeed = $('seed').value.trim();
  if (newSeed === selectedSeed) {
    newSeed = 'CITY-' + Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  }
  selectedSeed = newSeed || 'NEON-01';
  applySeed(selectedSeed);
  discover('different_city');
});
$('seed').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    $('seed').blur();
    // Enter applies the current seed exactly; the button produces a fresh one when unchanged.
    selectedSeed = $('seed').value.trim() || 'NEON-01';
    applySeed(selectedSeed);
    discover('different_city');
  }
});


function startPrimeEngine() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === 'suspended') audioContext.resume();
    if (engineAmbience) return;
    const oscillator = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 73;
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    gain.gain.value = .008;
    oscillator.connect(filter).connect(gain).connect(audioContext.destination);
    oscillator.start();
    engineAmbience = { oscillator, gain, filter };
  } catch { /* Audio is optional on Safari and muted school tablets. */ }
}
function stopPrimeEngine() {
  if (!engineAmbience) return;
  try {
    engineAmbience.oscillator.stop();
    engineAmbience.oscillator.disconnect();
    engineAmbience.filter.disconnect();
    engineAmbience.gain.disconnect();
  } catch {}
  engineAmbience = null;
}
function playPrimeSound(kind, prime = 2) {
  try {
    const AudioConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioConstructor) return;
    if (!audioContext) audioContext = new AudioConstructor();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime, osc = audioContext.createOscillator(), gain = audioContext.createGain();
    const pitch = kind === 'warning' ? 750 : kind === 'hit' ? 92 : kind === 'dodge' ? 570 : kind === 'blocked' ? 130 : kind === 'destroyed' ? 470 : 310 + prime * 55;
    osc.type = kind === 'hit' ? 'sawtooth' : kind === 'warning' || kind === 'blocked' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'destroyed' ? 95 : Math.max(75, pitch * .59), now + .18);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.065, now + .016);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .23);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(now); osc.stop(now + .24);
  } catch { /* Sound should never prevent a shot or a math result. */ }
}
function announcePrime(message, error = false) {
  $('primeFeedback').textContent = message;
  $('primeFeedback').classList.toggle('error', error);
  $('primeFeedback').classList.add('visible');
  feedbackSeconds = 1.65;
}
function renderPrimeHUD() {
  if (gameMode !== 'chase') return;
  const state = primeState;
  const enemy = selectedEnemy(state);
  const time = Math.ceil(state.remaining);
  $('chaseTimer').textContent = Math.floor(time / 60) + ':' + String(time % 60).padStart(2, '0');
  $('chaseTimeBonus').textContent = state.bonusSeconds ? '+' + state.bonusSeconds + '초 보상' : '정확히 쏘면 시간 추가';
  $('chaseWave').textContent = (state.waveIndex + 1) + ' / ' + state.waves.length + '파';
  $('chaseKills').textContent = state.destroyed + ' / ' + enemyTotal() + ' 격추';
  $('chaseShield').textContent = Math.round(state.shield) + '%';
  $('chaseShieldFill').style.width = state.shield + '%';
  $('chaseScore').textContent = state.score.toLocaleString('ko-KR') + '점';
  $('chaseTargetNumber').textContent = enemy ? String(enemy.number) : '···';
  $('chaseTargetText').textContent = enemy ? fighterSpec(enemy.original).name + ' ' + (activeEnemies(state).indexOf(enemy) + 1) + '/' + activeEnemies(state).length : '다음 추격대 접근 중';
  const signature = activeEnemies(state).map(e => e.id + ':' + e.number).join('|') + '/' + state.selectedId;
  if (lastEnemyButtons !== signature) {
    lastEnemyButtons = signature;
    const row = $('chaseEnemyChoices');
    row.replaceChildren();
    for (const e of activeEnemies(state)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = e.number;
      button.setAttribute('aria-label', fighterSpec(e.original).name + ' ' + e.number + '번 전투기 선택');
      button.setAttribute('aria-pressed', String(e.id === enemy?.id));
      button.addEventListener('click', () => { selectEnemy(primeState, e.id); renderPrimeHUD(); });
      row.appendChild(button);
    }
  }
  for (const button of document.querySelectorAll('[data-prime]')) {
    button.disabled = state.status !== 'playing' || !enemy;
  }
}
function enterExplore() {
  gameMode = 'explore';
  primeState.status = 'ready';
  pursuitScene.clear();
  stopPrimeEngine();
  enemyRemovalQueue.length = 0;
  bufferedShot = null;
  document.body.classList.remove('chase-mode');
  $('chaseHUD').classList.add('hidden');
  $('chaseResult').classList.add('hidden');
  $('intro').classList.add('hidden');
  resultVisible = false;
  rearView = false;
  active = true;
  setViewMode('chase');
  setAutoFlight(true);
  lastTimestamp = performance.now();
  window.KidscadeGame?.start?.();
}
function enterPrimeChase(mode = 'standard') {
  gameMode = 'chase';
  primeState = startPrimeChase(makePrimeChase(), mode);
  enemyRemovalQueue.length = 0;
  bufferedShot = null;
  endCinematic = -1;
  pursuitScene.clear();
  pilotPosition.set(0, 200, 365);
  yaw = 0; pitch = -0.28;
  primeHudElapsed = 0; lastEnemyButtons = ''; feedbackSeconds = 0;
  resultVisible = false;
  rearView = false;
  $('chaseResult').classList.add('hidden');
  $('intro').classList.add('hidden');
  document.body.classList.add('chase-mode');
  $('chaseHUD').classList.remove('hidden');
  $('primeLockMessage').classList.remove('visible');
  hitFlashSeconds = 0;
  radarElapsed = 0;
  startPrimeEngine();
  $('primeFeedback').classList.remove('visible');
  active = true;
  setViewMode('chase');
  setAutoFlight(true);
  loadNearby(true);
  for (const e of activeEnemies(primeState)) pursuitScene.addEnemy(e, pilotPosition, yaw, collisionWorld);
  renderPrimeHUD();
  announcePrime(primeState.mode === 'practice' ? '연습전! 6을 2와 3으로 나누어 봐!' : '6을 소수 2와 3으로 나누어 봐!');
  lastTimestamp = performance.now();
  window.KidscadeGame?.start?.();
}
function showPrimeResult() {
  if (resultVisible) return;
  resultVisible = true;
  bufferedShot = null;
  const success = primeState.status === 'won';
  if (success) discover('prime_chase_victory');
  active = false;
  stopPrimeEngine();
  $('chaseHUD').classList.add('hidden');
  $('chaseResultTitle').textContent = success ? '추격대를 모두 격추했어!' : '다시 도전해 봐!';
  $('chaseResultReason').textContent = primeState.reason;
  const stats = roundStats(primeState);
  $('chaseResultStats').textContent = '격추 ' + stats.destroyed + '/' + enemyTotal() + ' · 회피 ' + stats.dodges + '회 · 시간 보상 +' + stats.bonusSeconds + '초 · 정확도 ' + stats.accuracy + '% · 점수 ' + stats.score.toLocaleString('ko-KR') + '점';
  $('chaseResult').classList.remove('hidden');
}
function shootPrime(prime) {
  if (gameMode !== 'chase' || !active) return;
  const result = firePrime(primeState, prime);
  if (result.kind === 'cooldown') {
    bufferedShot = { prime, targetId: selectedEnemy(primeState)?.id, ttl: 1.7 };
    return;
  }
  if (!['blocked','divided','destroyed'].includes(result.kind)) return;
  bufferedShot = null;
  pursuitScene.shootEffect(result, pilotPosition, yaw);
  playPrimeSound(result.kind, prime);
  if (result.kind === 'blocked') {
    announcePrime('나누어떨어지지 않아! ' + result.oldValue + ' ÷ ' + prime, true);
  } else {
    const target = primeState.enemies.find(e => e.id === result.id);
    if (target) pursuitScene.markValue(target);
    if (result.kind === 'destroyed') {
      announcePrime(result.oldValue + ' ÷ ' + prime + ' = 1 · 격추! 시간 +' + result.timeBonus + '초');
      pursuitScene.explosion(result.id);
      enemyRemovalQueue.push({ id: result.id, time: 0.65 });
    } else {
      announcePrime(result.oldValue + ' ÷ ' + prime + ' = ' + result.newValue + '! 시간 +' + result.timeBonus + '초');
    }
  }
  renderPrimeHUD();
  if (primeState.status !== 'playing') endCinematic = 1.15;
}
function updatePrimeCombat(dt, gameDt = dt) {
  if (gameMode !== 'chase') return;
  const distances = pursuitScene.update(dt, pilotPosition, yaw, collisionWorld, selectedEnemy(primeState)?.id, flightSpeed || 34);
  const events = primeState.status === 'playing'
    ? tickPrimeChase(primeState, gameDt, distances, pilotPosition)
    : { newEnemies: [], attacks: [], warnings: [] };
  if (bufferedShot && primeState.status === 'playing') {
    bufferedShot.ttl -= gameDt;
    const current = selectedEnemy(primeState);
    if (bufferedShot.ttl <= 0 || !current || current.id !== bufferedShot.targetId) {
      bufferedShot = null;
    } else if (primeState.cooldown <= 0) {
      const queued = bufferedShot.prime;
      bufferedShot = null;
      shootPrime(queued);
    }
  }
  for (let i = enemyRemovalQueue.length - 1; i >= 0; i--) {
    const entry = enemyRemovalQueue[i];
    entry.time -= gameDt;
    if (entry.time <= 0) { pursuitScene.removeEnemy(entry.id); enemyRemovalQueue.splice(i, 1); }
  }
  for (let i = 0; i < events.newEnemies.length; i++) {
    pursuitScene.addEnemy(events.newEnemies[i], pilotPosition, yaw, collisionWorld, i);
  }
  if (events.newEnemies.length) announcePrime('새로운 합성수 추격대가 나타났어!');
  for (const warning of events.warnings) {
    pursuitScene.warnAttack(warning.id, warning.lockedAt, warning.seconds);
    playPrimeSound('warning');
  }
  if (events.warnings.length) announcePrime('적이 조준 중! 방향을 바꾸거나 건물 뒤로 피하세요!', true);
  if (events.attacks.length) {
    const hits = events.attacks.filter(event => event.hit);
    for (const event of events.attacks) pursuitScene.enemyAttack(event.id, event.aim);
    if (hits.length) {
      announcePrime('피격! 방어막 -' + hits.reduce((n,x)=>n+x.damage,0) + '%', true);
      playPrimeSound('hit');
      hitFlashSeconds = .37;
      document.body.classList.remove('prime-impact');
      void $('city').offsetWidth;
      document.body.classList.add('prime-impact');
    } else {
      announcePrime('회피 성공! 레이저가 빗나갔어!', false);
      playPrimeSound('dodge');
    }
  }
  const locked = activeEnemies(primeState).some(enemy => enemy.preparing);
  $('primeLockMessage').classList.toggle('visible', locked);
  radarElapsed += gameDt;
  if (radarElapsed >= .10) {
    radarElapsed = 0;
    const threat = drawPrimeRadar($('primeRadar'), pilotPosition, yaw,
      pursuitScene.visuals, selectedEnemy(primeState)?.id);
    const closest = threat?.closest;
    $('radarReadout').textContent = closest
      ? (closest.behind ? '후방 ' : '전방 ') + Math.round(closest.distance) + 'm'
      : '적 탐색 중';
  }
  if (hitFlashSeconds > 0) {
    hitFlashSeconds -= gameDt;
    if (hitFlashSeconds <= 0) document.body.classList.remove('prime-impact');
  }
  primeHudElapsed += gameDt;
  if (primeHudElapsed >= 0.19 || events.newEnemies.length || events.attacks.length || events.warnings.length) {
    primeHudElapsed = 0;
    renderPrimeHUD();
  }
  if (feedbackSeconds > 0) {
    feedbackSeconds -= gameDt;
    if (feedbackSeconds <= 0) $('primeFeedback').classList.remove('visible');
  }
  if (primeState.status !== 'playing') {
    if (endCinematic < 0) endCinematic = .85;
    endCinematic -= gameDt;
    if (endCinematic <= 0) showPrimeResult();
  }
}

document.querySelectorAll('[data-prime]').forEach(button => {
  button.addEventListener('click', () => shootPrime(Number(button.dataset.prime)));
});
$('chaseCameraButton').addEventListener('click', () =>
  setViewMode(viewMode === 'cockpit' ? 'chase' : 'cockpit'));
$('rearViewButton').addEventListener('click', () => setRearView(!rearView));
$('start').addEventListener('click', () => enterPrimeChase('standard'));
$('practiceStart').addEventListener('click', () => enterPrimeChase('practice'));
$('exploreStart').addEventListener('click', enterExplore);
$('chaseRetry').addEventListener('click', () => enterPrimeChase(primeState.mode));
$('chaseExplore').addEventListener('click', enterExplore);

$('retry').addEventListener('click', () => location.reload());
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

function updateMovement(dt) {
  if (!active) return;
  if (held.has('ArrowLeft')) {
    if (viewMode === 'cockpit') lookYaw = clamp(lookYaw + dt * 1.4, -1.15, 1.15);
    else yaw += dt * 1.4;
  }
  if (held.has('ArrowRight')) {
    if (viewMode === 'cockpit') lookYaw = clamp(lookYaw - dt * 1.4, -1.15, 1.15);
    else yaw -= dt * 1.4;
  }
  if (held.has('ArrowUp')) {
    if (viewMode === 'cockpit') lookPitch = clamp(lookPitch + dt * 0.85, -0.54, 0.72);
    else pitch = clamp(pitch + dt * 0.85, -1.3, 1.25);
  }
  if (held.has('ArrowDown')) {
    if (viewMode === 'cockpit') lookPitch = clamp(lookPitch - dt * 0.85, -0.54, 0.72);
    else pitch = clamp(pitch - dt * 0.85, -1.3, 1.25);
  }
  let forward = (held.has('KeyW') ? 1 : 0) - (held.has('KeyS') ? 1 : 0) - touchAxis.y;
  // Manual steering in combat keeps the craft cruising even with a lateral-only joystick.
  if (gameMode === 'chase' && !autoFlight && forward === 0) forward = 1;
  let side = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0) + touchAxis.x;
  const altitude = (held.has('KeyE') || held.has('rise') ? 1 : 0) - (held.has('KeyQ') || held.has('sink') ? 1 : 0);
  const origin = { x: pilotPosition.x, y: pilotPosition.y, z: pilotPosition.z };
  let desired;
  if (autoFlight) {
    steeringVisual = 0;
    yaw = Math.sin(seconds * 0.09) * 0.13;
    pitch = -0.28 + Math.sin(seconds * 0.13) * 0.045;
    const guided = guideAlongRoad(origin, dt, 34);
    const targetY = 200 + Math.sin(seconds * 0.24) * 8;
    desired = { x: guided.x, z: guided.z,
      y: clamp(targetY - pilotPosition.y, -19 * dt, 32 * dt) };
  } else {
    steeringVisual = side;
    if (viewMode !== 'free') {
      yaw -= side * dt * 1.18;
      side = 0;
    }
    const length = Math.max(1, Math.hypot(forward, side));
    forward /= length;
    side /= length;
    const speed = (held.has('ShiftLeft') || held.has('ShiftRight') || held.has('boost') ? 145 : 70) * dt;
    desired = {
      x: (-Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed,
      z: (-Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed,
      y: altitude * speed * 0.8
    };
    if (held.has('boost') || held.has('ShiftLeft') || held.has('ShiftRight')) {
      boostSeconds += dt;
      if (boostSeconds > 8) discover('speed_flight');
    }
  }
  // Buildings and passing aircraft share one collision response. No teleporting through walls.
  desired.y = clamp(origin.y + desired.y, 18, 880) - origin.y;
  const moved = moveWithCollisions(origin, desired, collisionWorld,
    viewMode === 'free' ? [] : trafficPositions);
  pilotPosition.set(moved.position.x, moved.position.y, moved.position.z);
  flightSpeed = moved.travelled / Math.max(dt, 0.001);
  travelledMeters += moved.travelled;
  if (travelledMeters > 1800) discover('far_explorer');
  if (pilotPosition.y > 500) discover('sky_explorer');
  const hit = moved.hitBuilding || moved.hitTraffic;
  if (hit && seconds - lastCollisionAt > 0.75) {
    lastCollisionAt = seconds;
    collidedRecently = true;
    $('flightWarning').textContent = moved.hitTraffic ? '앞에 비행차가 있어요' : '건물이 가까워요 · 방향을 바꿔보세요';
    $('flightWarning').classList.add('visible');
  }
  if (collidedRecently && seconds - lastCollisionAt > 1.6) {
    collidedRecently = false;
    $('flightWarning').classList.remove('visible');
  }
  playerCraft.update(dt, pilotPosition, yaw, pilotPosition.y, flightSpeed * 3.6, steeringVisual);
  updateCamera();
  $('altitude').textContent = Math.round(pilotPosition.y) + 'm';
  $('speedReadout').textContent = Math.round(flightSpeed * 3.6) + 'km/h';
}
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) { lastTimestamp = now; return; }
  const gameDt = Math.min(0.25, Math.max(0, (now - (lastTimestamp || now)) / 1000));
  lastTimestamp = now;
  seconds += active ? gameDt : 0;
  if (active) {
    moveVehicles(seconds);
    // Keep travel distance and combat time identical even at 10–15 FPS.
    const movementSteps = Math.max(1, Math.ceil(gameDt / .05));
    const movementDt = gameDt / movementSteps;
    for (let i = 0; i < movementSteps; i++) updateMovement(movementDt);
    if (gameMode === 'chase') updatePrimeCombat(gameDt, gameDt);
    loadNearby();
    frameCount++;
    fpsTime += gameDt;
    if (fpsTime >= 1.25) {
      const fps = Math.round(frameCount / fpsTime);
      $('fps').textContent = '화면 ' + fps + 'fps';
      frameCount = 0;
      fpsTime = 0;
      // In AUTO mode, prefer a steady image to full-resolution overheating.
      if (qualitySetting === 'auto') {
        lowFpsCount = fps < 25 ? lowFpsCount + 1 : 0;
        if (lowFpsCount >= 3 && pixelRatio > 0.81) {
          pixelRatio = Math.max(0.8, pixelRatio - 0.15);
          renderer.setPixelRatio(pixelRatio);
          resize();
          lowFpsCount = 0;
        }
      }
    }
  }
  ground.position.x = pilotPosition.x;
  ground.position.z = pilotPosition.z;
  renderer.render(scene, camera);
}
window.KidscadeGame?.registerPauseHandlers?.({
  pause() { active = false; },
  resume() { if ($('intro').classList.contains('hidden')) active = true; lastTimestamp = performance.now(); }
});
window.KidscadeGame?.registerCleanup?.(() => { active = false; stopPrimeEngine(); });
applySeed(selectedSeed);
setViewMode('chase');
setTime(false);
resize();
requestAnimationFrame(frame);
