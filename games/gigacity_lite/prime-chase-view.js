import * as THREE from 'three';
import { moveWithCollisions, intersectsWorld } from './flight-physics.mjs';
import { LOT_SIZE } from './city-core.mjs';

const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3657, metalness: 0.55, roughness: 0.42 });
const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x553448, metalness: 0.45, roughness: 0.44 });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x141d31, metalness: 0.38, roughness: 0.58 });
const thrusterMaterial = new THREE.MeshBasicMaterial({ color: 0xff7e50, toneMapped: false });
const aimingMaterial = new THREE.MeshBasicMaterial({ color: 0x80edfc, transparent: true, opacity: 0.88, depthTest: false, side: THREE.DoubleSide });
const box = new THREE.BoxGeometry(1, 1, 1);
const cone = new THREE.ConeGeometry(1.18, 5.8, 4);
cone.rotateX(-Math.PI / 2);
const ringGeometry = new THREE.RingGeometry(5.0, 5.5, 40);

function addPart(group, material, w, h, d, x, y, z, angle = 0) {
  const mesh = new THREE.Mesh(box, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = angle;
  mesh.scale.set(w, h, d);
  group.add(mesh);
  return mesh;
}
function labelTexture(number) {
  const surface = document.createElement('canvas');
  surface.width = 256;
  surface.height = 128;
  const c = surface.getContext('2d');
  c.clearRect(0, 0, 256, 128);
  c.fillStyle = 'rgba(4,15,35,0.94)';
  c.fillRect(15, 14, 226, 101);
  c.strokeStyle = '#ffb578';
  c.lineWidth = 5;
  c.strokeRect(17, 16, 222, 97);
  c.fillStyle = '#ffe0c5';
  c.font = 'bold 18px sans-serif';
  c.textAlign = 'center';
  c.fillText('합성수 전투기', 128, 39);
  c.fillStyle = '#ffffff';
  c.font = '900 64px sans-serif';
  c.fillText(String(number), 128, 98);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
function createEnemyScene(enemy) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  addPart(body, bodyMaterial, 4.3, 1.5, 6.9, 0, 0, 0);
  addPart(body, wingMaterial, 12.5, 0.3, 2.0, 0, 0, 0.4);
  addPart(body, darkMaterial, 2.8, 0.7, 3.1, 0, 0.99, 0.7);
  addPart(body, wingMaterial, 3.7, 1.4, 0.4, 0, 0.84, 2.4);
  const nose = new THREE.Mesh(cone, wingMaterial);
  nose.position.set(0, 0, -5.7);
  body.add(nose);
  for (const side of [-1, 1]) {
    addPart(body, thrusterMaterial, 0.55, 0.38, 0.15, side * 1.25, -0.28, 3.6);
    addPart(body, darkMaterial, 0.35, 1.10, 1.3, side * 5.0, 0.53, 0.5);
  }
  const reticle = new THREE.Mesh(ringGeometry, aimingMaterial);
  reticle.rotation.x = -Math.PI / 2;
  root.add(reticle);
  reticle.visible = false;
  const signMaterial = new THREE.SpriteMaterial({
    map: labelTexture(enemy.number), transparent: true,
    depthTest: false, depthWrite: false, toneMapped: false
  });
  const sign = new THREE.Sprite(signMaterial);
  sign.position.y = 8;
  sign.scale.set(23, 11.5, 1);
  root.add(sign);
  root.userData.enemyId = enemy.id;
  return { root, body, reticle, sign, number: enemy.number, hitPulse: 0 };
}
function disposeEnemy(entry) {
  entry.sign.material.map.dispose();
  entry.sign.material.dispose();
}
export function makePursuerScene(scene) {
  const visuals = new Map();
  const effects = [];
  let worldSeconds = 0;
  const beamColours = { 2: 0x79e8ff, 3: 0xab95ff, 5: 0xffe17e, 7: 0xff9ac3 };
  function addEnemy(enemy, craft, heading, world, order = 0) {
    const v = createEnemyScene(enemy);
    // Spawn along the nearest safe avenue in front of the player.
    const aheadX = craft.x - Math.sin(heading) * (72 + order * 10);
    const aheadZ = craft.z - Math.cos(heading) * (72 + order * 10);
    v.root.position.set(Math.round(aheadX / LOT_SIZE) * LOT_SIZE, craft.y + 4, aheadZ);
    if (intersectsWorld(v.root.position, world, 5.5)) {
      v.root.position.z = Math.round(v.root.position.z / LOT_SIZE) * LOT_SIZE;
    }
    scene.add(v.root);
    visuals.set(enemy.id, v);
  }
  function removeEnemy(id) {
    const v = visuals.get(id);
    if (!v) return;
    scene.remove(v.root);
    disposeEnemy(v);
    visuals.delete(id);
  }
  function markValue(enemy) {
    const v = visuals.get(enemy.id);
    if (!v) return;
    v.sign.material.map.dispose();
    v.sign.material.map = labelTexture(enemy.number);
    v.sign.material.needsUpdate = true;
    v.number = enemy.number;
    v.hitPulse = 0.65;
    // Layers peel away as prime factors are removed, but the large number stays legible.
    v.body.scale.setScalar(Math.max(0.68, 1 - 0.10 * enemy.divisionCount));
  }
  function beam(from, to, prime, blocked) {
    const colour = blocked ? 0xff875f : beamColours[prime] ?? 0x89ebff;
    const positions = new Float32Array([from.x, from.y, from.z, to.x, to.y, to.z]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 1, depthTest: false });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 8;
    scene.add(line);
    effects.push({ kind: 'beam', line, ttl: 0.26 });
  }
  function explosion(id) {
    const v = visuals.get(id);
    if (!v) return;
    const flash = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffcf84, transparent: true, opacity: .91, depthWrite: false })
    );
    flash.position.copy(v.root.position);
    scene.add(flash);
    effects.push({ kind: 'explosion', flash, ttl: .58 });
    v.body.visible = false;
    v.reticle.visible = false;
  }
  function enemyAttack(id, craft) {
    const v = visuals.get(id);
    if (!v) return;
    beam(v.root.position, new THREE.Vector3(craft.x, craft.y, craft.z), 0, true);
  }
  function update(dt, craft, heading, world, selectedId) {
    worldSeconds += dt;
    const distances = {};
    let order = 0;
    const forward = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
    const side = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    for (const [id, v] of visuals) {
      const slot = order++;
      const flank = slot === 0 ? 0 : (slot % 2 ? 1 : -1) * (15 + slot * 4);
      const target = new THREE.Vector3(craft.x, craft.y, craft.z)
        .addScaledVector(forward, 65 + Math.min(slot, 2) * 15)
        .addScaledVector(side, flank);
      target.y = craft.y + 5 + 2 * Math.sin(worldSeconds + id);
      const delta = target.sub(v.root.position);
      const distance = delta.length();
      if (distance > 1.5) {
        const step = delta.multiplyScalar(Math.min(1, (33 + slot * 3) * dt / distance));
        const result = moveWithCollisions(v.root.position, step, world, [], 4.2);
        v.root.position.set(result.position.x, result.position.y, result.position.z);
        if (result.hitBuilding) v.root.position.y += Math.min(6 * dt, 0.5);
      }
      const dx = craft.x - v.root.position.x;
      const dz = craft.z - v.root.position.z;
      v.root.rotation.y = Math.atan2(-dx, -dz);
      v.root.position.y += Math.sin(worldSeconds * 2.6 + id) * 0.014;
      v.reticle.visible = selectedId === id;
      if (v.reticle.visible) {
        v.reticle.rotation.z += dt * 0.7;
        const size = 1 + Math.sin(worldSeconds * 4) * 0.08;
        v.reticle.scale.set(size, size, size);
      }
      if (v.hitPulse > 0) {
        v.hitPulse = Math.max(0, v.hitPulse - dt);
        v.body.scale.multiplyScalar(1 + dt * 0.4 * Math.sin(worldSeconds * 27));
      }
      distances[id] = Math.hypot(dx, craft.y - v.root.position.y, dz);
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i];
      effect.ttl -= dt;
      if (effect.kind === 'beam') {
        effect.line.material.opacity = Math.max(0, effect.ttl / 0.26);
      } else {
        const progress = 1 - Math.max(0, effect.ttl) / .58;
        effect.flash.scale.setScalar(1 + 10 * progress);
        effect.flash.material.opacity = Math.max(0, .9 * (1 - progress));
      }
      if (effect.ttl <= 0) {
        const mesh = effect.kind === 'beam' ? effect.line : effect.flash;
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        effects.splice(i, 1);
      }
    }
    return distances;
  }
  function shootEffect(result, craft, heading) {
    const v = visuals.get(result.id);
    if (!v) return;
    const start = new THREE.Vector3(craft.x - Math.sin(heading) * 4.2, craft.y + 0.7, craft.z - Math.cos(heading) * 4.2);
    beam(start, v.root.position, result.prime, result.kind === 'blocked');
  }
  function clear() {
    for (const id of Array.from(visuals.keys())) removeEnemy(id);
    for (const effect of effects) {
      const mesh = effect.kind === 'beam' ? effect.line : effect.flash;
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    effects.length = 0;
  }
  return { visuals, addEnemy, removeEnemy, markValue, update, shootEffect, explosion, enemyAttack, clear };
}
