import * as THREE from 'three';
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
camera.position.set(0, 270, 365);
camera.rotation.order = 'YXZ';

const skyDay = new THREE.Color(0x87a9d0);
const skyNight = new THREE.Color(0x071023);
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
    '  vec3 base = vColour * sunlight * mix(1.7, 0.52, uNight);',
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
function rebuildTraffic() {
  if (vehicles) {
    scene.remove(vehicles);
    vehicles.dispose();
  }
  vehicleCount = quality === 'high' ? 76 : quality === 'medium' ? 42 : 22;
  vehicles = instance(vehicleGeometry, vehicleMaterial, vehicleCount, scene);
  for (let i = 0; i < vehicleCount; i++) {
    const t = randomAt(trafficSeed, i, 0, 40);
    vehicles.setColorAt(i, new THREE.Color().setHSL(0.5 + t * 0.12, 0.9, 0.52));
  }
  finish(vehicles);
}
function moveVehicles(seconds) {
  if (!vehicles) return;
  const span = CHUNK_SIZE * 5;
  const roadX = Math.round(camera.position.x / LOT_SIZE) * LOT_SIZE;
  const roadZ = Math.round(camera.position.z / LOT_SIZE) * LOT_SIZE;
  for (let i = 0; i < vehicleCount; i++) {
    const horizontal = i % 2 === 0;
    const line = Math.floor(randomAt(trafficSeed, i, 0, 1) * 13) - 6;
    const speed = 19 + randomAt(trafficSeed, i, 0, 2) * 39;
    const direction = randomAt(trafficSeed, i, 0, 3) > 0.5 ? 1 : -1;
    const phase = randomAt(trafficSeed, i, 0, 4) * span;
    const progress = ((((seconds * speed * direction + phase) % span) + span) % span) - span * 0.5;
    const level = 54 + Math.floor(randomAt(trafficSeed, i, 0, 5) * 5) * 30;
    const x = horizontal ? roadX + progress : roadX + line * LOT_SIZE + 4;
    const z = horizontal ? roadZ + line * LOT_SIZE + 4 : roadZ + progress;
    const angle = horizontal ? 0 : Math.PI * 0.5;
    matrixAt(vehicles, i, x, level, z, 7, 1.9, 3.2, angle);
  }
  finish(vehicles);
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
  const cx = chunkOf(camera.position.x);
  const cz = chunkOf(camera.position.z);
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
  trafficSeed = worldSeed;
  applyQuality();
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
  if (Math.abs(dx) + Math.abs(dy) > 0) setAutoFlight(false);
  yaw -= dx * 0.0032;
  pitch = clamp(pitch - dy * 0.0029, -1.3, 1.25);
});
function endLook(event) {
  if (dragging?.pointerId === event.pointerId) dragging = null;
}
canvas.addEventListener('pointerup', endLook);
canvas.addEventListener('pointercancel', endLook);
canvas.addEventListener('lostpointercapture', endLook);
document.addEventListener('keydown', event => {
  if (document.activeElement === $('seed') || document.activeElement === $('quality')) return;
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
$('start').addEventListener('click', () => {
  active = true;
  $('intro').classList.add('hidden');
  lastTimestamp = performance.now();
  window.KidscadeGame?.start?.();
});
$('retry').addEventListener('click', () => location.reload());
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

function updateMovement(dt) {
  if (!active) return;
  if (held.has('ArrowLeft')) yaw += dt * 1.4;
  if (held.has('ArrowRight')) yaw -= dt * 1.4;
  if (held.has('ArrowUp')) pitch = clamp(pitch + dt * 0.85, -1.3, 1.25);
  if (held.has('ArrowDown')) pitch = clamp(pitch - dt * 0.85, -1.3, 1.25);
  let forward = (held.has('KeyW') ? 1 : 0) - (held.has('KeyS') ? 1 : 0) - touchAxis.y;
  let side = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0) + touchAxis.x;
  const altitude = (held.has('KeyE') || held.has('rise') ? 1 : 0) - (held.has('KeyQ') || held.has('sink') ? 1 : 0);
  if (autoFlight) {
    const speed = 34;
    camera.position.x += (Math.round(camera.position.x / LOT_SIZE) * LOT_SIZE - camera.position.x) * Math.min(1, dt * 0.9);
    camera.position.z -= speed * dt;
    yaw = Math.sin(seconds * 0.09) * 0.13;
    pitch = -0.28 + Math.sin(seconds * 0.13) * 0.045;
    camera.position.y = 270 + Math.sin(seconds * 0.24) * 12;
  } else {
    const oldX = camera.position.x, oldZ = camera.position.z;
    const length = Math.max(1, Math.hypot(forward, side));
    forward /= length;
    side /= length;
    const speed = (held.has('ShiftLeft') || held.has('ShiftRight') || held.has('boost') ? 145 : 70) * dt;
    camera.position.x += (-Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed;
    camera.position.z += (-Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed;
    camera.position.y += altitude * speed * 0.8;
    camera.position.y = clamp(camera.position.y, 18, 880);
    travelledMeters += Math.hypot(camera.position.x - oldX, camera.position.z - oldZ);
    if (travelledMeters > 1800) discover('far_explorer');
    if (camera.position.y > 500) discover('sky_explorer');
    if (held.has('boost') || held.has('ShiftLeft') || held.has('ShiftRight')) {
      boostSeconds += dt;
      if (boostSeconds > 8) discover('speed_flight');
    }
  }
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  $('altitude').textContent = Math.round(camera.position.y) + 'm';
}
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) { lastTimestamp = now; return; }
  const dt = Math.min(0.05, Math.max(0, (now - (lastTimestamp || now)) / 1000));
  lastTimestamp = now;
  seconds += active ? dt : 0;
  if (active) {
    updateMovement(dt);
    loadNearby();
    moveVehicles(seconds);
    frameCount++;
    fpsTime += dt;
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
  ground.position.x = camera.position.x;
  ground.position.z = camera.position.z;
  renderer.render(scene, camera);
}
window.KidscadeGame?.registerPauseHandlers?.({
  pause() { active = false; },
  resume() { if ($('intro').classList.contains('hidden')) active = true; lastTimestamp = performance.now(); }
});
window.KidscadeGame?.registerCleanup?.(() => { active = false; });
applySeed(selectedSeed);
setTime(false);
resize();
requestAnimationFrame(frame);
