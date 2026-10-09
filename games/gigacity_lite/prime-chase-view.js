import * as THREE from 'three';
import { moveWithCollisions, intersectsWorld } from './flight-physics.mjs';
import { LOT_SIZE } from './city-core.mjs';
import { fighterType, fighterSpec, pursuitSlot, damageStage } from './prime-tactics.mjs';

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
  const type = fighterType(enemy.original);
  const spec = fighterSpec(enemy.original);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  addPart(body, bodyMaterial, type === 'command' ? 5.7 : 4.3, 1.5, type === 'command' ? 8.9 : 6.9, 0, 0, 0);
  const armorPieces = [];
  addPart(body, wingMaterial, type === 'interceptor' ? 15.8 : type === 'armor' ? 10.9 : 12.5, .3, 2.0, 0, 0, .4);
  addPart(body, darkMaterial, 2.8, 0.7, 3.1, 0, 0.99, 0.7);
  addPart(body, wingMaterial, 3.7, 1.4, 0.4, 0, 0.84, 2.4);
  const nose = new THREE.Mesh(cone, wingMaterial);
  nose.position.set(0, 0, -5.7);
  body.add(nose);
  for (const side of [-1, 1]) {
    const engine = addPart(body, thrusterMaterial, .65, .42, .16, side * 1.25, -.28, 3.6);
    armorPieces.push(engine);
    const fin = addPart(body, darkMaterial, .36, 1.12, 1.3, side * (type === 'interceptor' ? 6.8 : 5.0), .53, .5);
    armorPieces.push(fin);
    if (type === 'armor' || type === 'command') {
      armorPieces.push(addPart(body, wingMaterial, 1.8, .45, 2.45, side * 2.85, .98, -.1));
      armorPieces.push(addPart(body, darkMaterial, .9, .7, 1.6, side * 1.65, 1.05, -1.25));
    }
    if (type === 'interceptor' || type === 'command') {
      armorPieces.push(addPart(body, thrusterMaterial, .33, .28, 1.2, side * 4.2, -.08, -.9));
    }
  }
  // Every correct prime shot physically removes a discrete model component.
  armorPieces.reverse();
  root.scale.setScalar(spec.hull);
  const reticle = new THREE.Mesh(ringGeometry, aimingMaterial);
  reticle.rotation.x = -Math.PI / 2;
  root.add(reticle);
  reticle.visible = false;
  const signMaterial = new THREE.SpriteMaterial({
    map: labelTexture(enemy.number), transparent: true,
    depthTest: false, depthWrite: false, toneMapped: false
  });
  const sign = new THREE.Sprite(signMaterial);
  // Enlarge only the hull, never the math label; 84/105 must remain legible.
  sign.position.y = 8 / spec.hull;
  sign.scale.set(23 / spec.hull, 11.5 / spec.hull, 1);
  root.add(sign);
  root.userData.enemyId = enemy.id;
  return { root, body, reticle, sign, number: enemy.number, hitPulse: 0,
    type, armorPieces, originalScale: spec.hull, damageCount: 0, warningLine: null };
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
    // Enemy squadrons enter from BEHIND the player, then flank and swoop.
    const aheadX = craft.x + Math.sin(heading) * (86 + order * 10);
    const aheadZ = craft.z + Math.cos(heading) * (86 + order * 10);
    v.root.position.set(Math.round(aheadX / LOT_SIZE) * LOT_SIZE, craft.y + 5, aheadZ);
    v.coverCacheTime = 0;
    v.covered = false;
    if (intersectsWorld(v.root.position, world, 5.5 * v.originalScale)) {
      v.root.position.z = Math.round(v.root.position.z / LOT_SIZE) * LOT_SIZE;
    }
    scene.add(v.root);
    visuals.set(enemy.id, v);
  }
  function removeEnemy(id) {
    const v = visuals.get(id);
    if (!v) return;
    scene.remove(v.root);
    if (v.warningLine) {
      scene.remove(v.warningLine);
      v.warningLine.geometry.dispose();
      v.warningLine.material.dispose();
    }
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
    v.hitPulse = 0.58;
    let remaining = enemy.original, totalFactors = 0;
    for (let i = 2; i <= remaining; i++) {
      while (remaining % i === 0) { totalFactors++; remaining /= i; }
    }
    const fraction = damageStage(enemy.divisionCount, totalFactors);
    v.body.scale.setScalar(Math.max(.82, 1 - fraction * .16));
    const piece = v.armorPieces.shift();
    if (piece && piece.parent) {
      const start = new THREE.Vector3();
      piece.getWorldPosition(start);
      piece.parent.remove(piece);
      const falling = new THREE.Mesh(box, wingMaterial);
      falling.position.copy(start);
      falling.scale.set(.9, .28, 1.25);
      scene.add(falling);
      effects.push({ kind: 'debris', mesh: falling, ttl: 1.25,
        vx: Math.sin(worldSeconds * 6 + enemy.id) * 8,
        vy: 5, vz: Math.cos(worldSeconds * 5 + enemy.id) * 8 });
    }
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
    // A few recognizable wing / engine fragments fall before the flash fades.
    for (let n = 0; n < 4; n++) {
      const fragment = new THREE.Mesh(box, n % 2 ? darkMaterial : wingMaterial);
      fragment.position.copy(v.root.position).add(new THREE.Vector3((n - 1.5) * 2, 0, n % 2 ? 2 : -2));
      fragment.scale.set(1.2, .22, 1.8);
      scene.add(fragment);
      effects.push({ kind: 'debris', mesh: fragment, ttl: 1.7,
        vx: (n - 1.5) * 8, vy: 9, vz: (n % 2 ? 8 : -8) });
    }
    v.body.visible = false;
    v.reticle.visible = false;
  }
  function warnAttack(id, aim, seconds = 2) {
    const v = visuals.get(id);
    if (!v) return;
    v.sign.material.color.setHex(0xff7258);
    v.sign.scale.set(25 / v.originalScale, 12.5 / v.originalScale, 1);
    v.warningTime = seconds;
    if (!aim) return;
    if (v.warningLine) {
      scene.remove(v.warningLine);
      v.warningLine.geometry.dispose();
      v.warningLine.material.dispose();
    }
    const geo = new THREE.BufferGeometry().setFromPoints([
      v.root.position.clone(), new THREE.Vector3(aim.x, aim.y, aim.z)
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xff4c65, transparent: true, opacity: .92, depthTest: false
    });
    v.warningLine = new THREE.Line(geo, mat);
    v.warningLine.renderOrder = 7;
    v.lockTarget = { ...aim };
    scene.add(v.warningLine);
  }
  function enemyAttack(id, aim) {
    const v = visuals.get(id);
    if (!v || !aim) return;
    beam(v.root.position, new THREE.Vector3(aim.x, aim.y, aim.z), 0, true);
    if (v.warningLine) {
      scene.remove(v.warningLine);
      v.warningLine.geometry.dispose();
      v.warningLine.material.dispose();
      v.warningLine = null;
    }
  }
  function update(dt, craft, heading, world, selectedId, pilotSpeed = 34) {
    worldSeconds += dt;
    const distances = {};
    let order = 0;
    const forward = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
    const side = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    for (const [id, v] of visuals) {
      const slot = order++;
      const plan = pursuitSlot(craft, heading, worldSeconds, id, slot, v.type, pilotSpeed);
      const target = new THREE.Vector3(plan.x, plan.y, plan.z);
      const delta = target.sub(v.root.position);
      const distance = delta.length();
      if (distance > 1.5) {
        const step = delta.multiplyScalar(Math.min(1, plan.speed * dt / distance));
        const result = moveWithCollisions(v.root.position, step, world, [], 4.2 * v.originalScale);
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
      if (v.warningTime > 0) {
        v.warningTime -= dt;
        if (v.warningTime <= 0) {
          v.sign.material.color.setHex(0xffffff);
          v.sign.scale.set(23 / v.originalScale, 11.5 / v.originalScale, 1);
        }
      }
      if (v.hitPulse > 0) {
        v.hitPulse = Math.max(0, v.hitPulse - dt);
        v.body.rotation.z = Math.sin(worldSeconds * 36) * .16 * (v.hitPulse / .58);
      } else v.body.rotation.z *= Math.max(0, 1 - dt * 8);
      if (v.warningLine) {
        const data = v.warningLine.geometry.attributes.position;
        data.setXYZ(0, v.root.position.x, v.root.position.y, v.root.position.z);
        data.needsUpdate = true;
        v.warningLine.material.opacity = .55 + .4 * Math.sin(worldSeconds * 16);
        if (v.warningTime <= 0) {
          scene.remove(v.warningLine);
          v.warningLine.geometry.dispose();
          v.warningLine.material.dispose();
          v.warningLine = null;
        }
      }
      v.coverCacheTime -= dt;
      if (v.coverCacheTime <= 0) {
        // Six samples along the laser line: towers offer meaningful cover.
        v.covered = false;
        for (let step = 1; step <= 6; step++) {
          const t = step / 7;
          if (intersectsWorld({
            x: v.root.position.x + dx * t,
            y: v.root.position.y + (craft.y - v.root.position.y) * t,
            z: v.root.position.z + dz * t
          }, world, 0.2)) { v.covered = true; break; }
        }
        v.coverCacheTime = 0.32;
      }
      distances[id] = { distance: Math.hypot(dx, craft.y - v.root.position.y, dz), covered: v.covered };
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i];
      effect.ttl -= dt;
      if (effect.kind === 'beam') {
        effect.line.material.opacity = Math.max(0, effect.ttl / .26);
      } else if (effect.kind === 'explosion') {
        const progress = 1 - Math.max(0, effect.ttl) / .58;
        effect.flash.scale.setScalar(1 + 10 * progress);
        effect.flash.material.opacity = Math.max(0, .9 * (1 - progress));
      } else {
        effect.mesh.position.x += effect.vx * dt;
        effect.mesh.position.y += effect.vy * dt;
        effect.mesh.position.z += effect.vz * dt;
        effect.vy -= 30 * dt;
        effect.mesh.rotation.x += 3.2 * dt;
        effect.mesh.rotation.z += 2.1 * dt;
      }
      if (effect.ttl <= 0) {
        const mesh = effect.kind === 'beam' ? effect.line : effect.kind === 'explosion' ? effect.flash : effect.mesh;
        scene.remove(mesh);
        if (effect.kind !== 'debris') {
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
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
      const mesh = effect.kind === 'beam' ? effect.line : effect.kind === 'explosion' ? effect.flash : effect.mesh;
      scene.remove(mesh);
      if (effect.kind !== 'debris') { mesh.geometry.dispose(); mesh.material.dispose(); }
    }
    effects.length = 0;
  }
  return { visuals, addEnemy, removeEnemy, markValue, update, shootEffect, explosion, enemyAttack, warnAttack, clear };
}
