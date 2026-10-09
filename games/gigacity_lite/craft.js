import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// All cockpit meshes use vehicle-local coordinates: forward is -Z.
// The original Kenney race-future GLB contains only body and wheels.
// In the cockpit view we render a dedicated *open* interior, instead of
// placing the camera inside a closed exterior shell.
const paint = (color, metalness = 0.15, roughness = 0.5) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });
const glow = (color, intensity = 1.4) =>
  new THREE.MeshBasicMaterial({ color, toneMapped: false });
const MAT = {
  shell: paint(0x142741, 0.68, 0.31),
  dash: paint(0x111b2a, 0.27, 0.72),
  graphite: paint(0x0a1322, 0.2, 0.78),
  carbon: paint(0x202c3d, 0.4, 0.46),
  trim: paint(0x567388, 0.58, 0.34),
  chair: paint(0x243b55, 0.19, 0.82),
  headrest: paint(0x141f30, 0.15, 0.82),
  cyan: glow(0x67e7fb),
  pale: glow(0xb3f6ff),
  orange: glow(0xffb77b)
};
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const torusGeo = new THREE.TorusGeometry(0.36, 0.052, 8, 32);
const thrusterGeo = new THREE.CylinderGeometry(0.29, 0.42, 0.72, 12);
thrusterGeo.rotateX(Math.PI / 2);

function piece(parent, material, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const obj = new THREE.Mesh(boxGeo, material);
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  obj.scale.set(w, h, d);
  parent.add(obj);
  return obj;
}

function strut(parent, material, from, to, radius = 0.052) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const vec = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, vec.length(), 7), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec.normalize());
  parent.add(mesh);
  return mesh;
}

function makeFallbackCar(group) {
  const fallback = new THREE.Group();
  fallback.name = 'Future-car fallback (Kenney model not loaded)';
  piece(fallback, MAT.shell, 3.1, 0.8, 5.7, 0, 0, 0);
  piece(fallback, MAT.carbon, 2.64, 0.66, 2.45, 0, 0.5, 0.32);
  piece(fallback, MAT.trim, 2.55, 0.2, 3.5, 0, -0.3, -0.7);
  piece(fallback, MAT.cyan, 2.1, 0.07, 0.1, 0, -0.1, -2.89);
  piece(fallback, MAT.cyan, 0.09, 0.11, 2.9, -1.42, 0.05, -0.6);
  piece(fallback, MAT.cyan, 0.09, 0.11, 2.9, 1.42, 0.05, -0.6);
  group.add(fallback);
  return fallback;
}

function makeInterior(group) {
  // No opaque front wall or windshield: the panorama must remain visible.
  piece(group, MAT.graphite, 2.86, 0.17, 3.7, 0, -0.82, 0.05);
  piece(group, MAT.dash, 2.83, 0.54, 0.69, 0, -0.10, -1.36, 0.08);
  piece(group, MAT.carbon, 2.78, 0.10, 0.64, 0, 0.31, -1.34, -0.05);
  piece(group, MAT.cyan, 2.54, 0.018, 0.025, 0, 0.35, -1.63);
  piece(group, MAT.trim, 2.84, 0.17, 0.22, 0, 0.45, -1.72, -0.05);
  // Side doors and lower window ledges.
  for (const side of [-1, 1]) {
    piece(group, MAT.shell, 0.13, 0.5, 3.24, side * 1.38, -0.35, 0.12);
    piece(group, MAT.trim, 0.10, 0.09, 3.05, side * 1.37, -0.06, 0.13);
    strut(group, MAT.trim, [side * 1.36, 0.39, -1.69], [side * 1.15, 1.56, -1.78], 0.072);
    strut(group, MAT.shell, [side * 1.37, 0.38, 1.38], [side * 1.13, 1.57, 1.25], 0.078);
  }
  // Broad panoramic windshield; only the top crossbar is visible.
  strut(group, MAT.shell, [-1.15, 1.56, -1.78], [1.15, 1.56, -1.78], 0.094);
  strut(group, MAT.trim, [-1.15, 1.56, -1.77], [1.15, 1.56, -1.77], 0.023);
  piece(group, MAT.shell, 2.47, 0.14, 1.06, 0, 1.63, 0.68);
  // Two sculpted sports seats including visible passenger headrest.
  for (const sx of [-0.59, 0.71]) {
    piece(group, MAT.chair, 0.76, 0.20, 0.95, sx, -0.42, 0.84);
    piece(group, MAT.chair, 0.75, 0.98, 0.19, sx, 0.08, 1.32, -0.14);
    piece(group, MAT.headrest, 0.48, 0.39, 0.19, sx, 0.72, 1.36);
    piece(group, MAT.cyan, 0.055, 0.72, 0.04, sx - 0.23, 0.06, 1.208, -0.14);
  }
  // Lightweight floating centre console and physical steering wheel.
  piece(group, MAT.carbon, 0.53, 0.27, 1.35, 0.08, -0.49, 0.23);
  const steering = new THREE.Group();
  steering.position.set(-0.59, 0.08, -0.79);
  steering.rotation.x = -0.18;
  steering.add(new THREE.Mesh(torusGeo, MAT.graphite));
  piece(steering, MAT.trim, 0.60, 0.065, 0.070, 0, 0, 0);
  piece(steering, MAT.trim, 0.06, 0.33, 0.07, 0, -0.13, 0);
  piece(steering, MAT.cyan, 0.25, 0.055, 0.074, 0, -0.015, 0.005);
  group.add(steering);

  // A 256px screen in-world, not a flat HTML cockpit overlay.
  const display = document.createElement('canvas');
  display.width = 256;
  display.height = 128;
  const context = display.getContext('2d', { alpha: false });
  const texture = new THREE.CanvasTexture(display);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const screenMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.62), screenMat);
  screen.position.set(0.48, 0.13, -1.74);
  screen.rotation.x = -0.1;
  group.add(screen);
  piece(group, MAT.cyan, 1.28, 0.018, 0.02, 0.48, -0.20, -1.75);
  let elapsed = 0;
  function updateDashboard(dt, altitude, speed, steeringAngle) {
    steering.rotation.z = THREE.MathUtils.clamp(steeringAngle, -0.55, 0.55);
    elapsed += dt;
    if (elapsed < 0.15 || !context) return;
    elapsed = 0;
    context.fillStyle = '#091827';
    context.fillRect(0, 0, 256, 128);
    context.strokeStyle = '#55d1ee';
    context.strokeRect(4, 4, 248, 120);
    context.fillStyle = '#87eaff';
    context.font = 'bold 15px system-ui';
    context.fillText('GIGACITY  /  NAV', 13, 24);
    context.fillStyle = '#e7faff';
    context.font = 'bold 34px system-ui';
    context.fillText(String(Math.round(Math.max(0, speed))).padStart(3, '0'), 14, 69);
    context.font = '13px system-ui';
    context.fillText('km/h', 91, 68);
    context.fillStyle = '#7ac9dd';
    context.fillText('ALT', 153, 47);
    context.fillStyle = '#e7faff';
    context.font = 'bold 23px system-ui';
    context.fillText(String(Math.round(altitude)), 152, 70);
    context.fillStyle = '#2b6574';
    context.fillRect(13, 89, 229, 8);
    context.fillStyle = '#61e8fb';
    context.fillRect(13, 89, Math.min(229, Math.max(8, speed * 1.05)), 8);
    context.fillStyle = '#a9b9d2';
    context.font = '11px system-ui';
    context.fillText('FLIGHT CONTROL   •   AUTO / MANUAL', 13, 115);
    texture.needsUpdate = true;
  }
  return { updateDashboard, texture, screenMat };
}

export function createPlayerCraft(scene) {
  const root = new THREE.Group();
  root.name = 'Player craft';
  const exterior = new THREE.Group();
  exterior.name = 'Exterior shell';
  const interior = new THREE.Group();
  interior.name = '3D cockpit';
  root.add(exterior, interior);
  scene.add(root);
  const fallback = makeFallbackCar(exterior);
  const beams = new THREE.Group();
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(thrusterGeo, MAT.shell);
    pod.position.set(side * 1.50, -0.36, 1.50);
    beams.add(pod);
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.24, 16), MAT.cyan);
    lamp.position.set(side * 1.50, -0.36, 1.92);
    beams.add(lamp);
  }
  exterior.add(beams);
  const cockpit = makeInterior(interior);
  exterior.visible = false;
  interior.visible = false;
  let ready = false;

  async function loadExterior() {
    const loader = new GLTFLoader();
    // Repo-owned CC0 Kenney race-future.glb: one copy for the player only.
    const src = '../../assets/game/3d/vehicles/kenney-car-kit/race-future.glb';
    try {
      const model = await loader.loadAsync(new URL(src, import.meta.url).href);
      const visual = model.scene;
      visual.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(visual);
      const size = bounds.getSize(new THREE.Vector3());
      if (!(size.x > 0 && size.y > 0 && size.z > 0)) throw new Error('Invalid car mesh bounds');
      // Kenney models commonly use a Z-forward vehicle. Normalize both scale and pivot.
      const longAxis = size.z >= size.x ? size.z : size.x;
      if (size.x > size.z) visual.rotation.y = Math.PI / 2;
      visual.scale.multiplyScalar(7.2 / longAxis);
      visual.updateMatrixWorld(true);
      bounds.setFromObject(visual);
      const middle = bounds.getCenter(new THREE.Vector3());
      visual.position.set(-middle.x, -bounds.min.y - 0.80, -middle.z);
      visual.traverse(obj => { if (obj.isMesh) obj.castShadow = false; });
      exterior.add(visual);
      exterior.remove(fallback);
      ready = true;
    } catch (error) {
      // Keep the cockpit usable even when the GLB is blocked or unavailable.
      console.warn('[Gigacity] 차량 모델을 불러오지 못해 기본 차체를 표시합니다.', error);
    }
  }

  function setView(mode) {
    root.visible = mode !== 'free';
    exterior.visible = mode === 'chase';
    interior.visible = mode === 'cockpit';
  }

  function update(dt, position, heading, altitude, speed, steering) {
    root.position.copy(position);
    root.rotation.set(0, heading, THREE.MathUtils.clamp(-steering * 0.035, -0.065, 0.065));
    if (interior.visible) cockpit.updateDashboard(dt, altitude, speed, steering * 0.35);
  }

  return { root, exterior, interior, setView, update, loadExterior, cockpitEye: new THREE.Vector3(-0.59, 1.01, 0.33), get loaded() { return ready; } };
}
