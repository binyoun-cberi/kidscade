import { CHUNK_SIZE, LOT_SIZE, chunkOf, createChunkData } from './city-core.mjs';

// Lightweight collision model shared by the browser and Node simulations.
export const CRAFT_RADIUS = 2.75;
export const CRAFT_HALF_HEIGHT = 1.35;
export const MAX_STEP = 1.35;

export function buildingTop(b) {
  return b.height + (b.crown ? b.roofHeight : 0);
}
export function intersectsBuilding(p, b, radius = CRAFT_RADIUS, halfHeight = CRAFT_HALF_HEIGHT) {
  if (p.y - halfHeight >= buildingTop(b) || p.y + halfHeight <= 0) return false;
  return Math.abs(p.x - b.x) < b.width / 2 + radius &&
    Math.abs(p.z - b.z) < b.depth / 2 + radius;
}
export function makeCollisionWorld(seed) {
  const chunks = new Map();
  function chunk(cx, cz) {
    const key = cx + ',' + cz;
    if (!chunks.has(key)) {
      chunks.set(key, createChunkData(cx, cz, seed).buildings);
      if (chunks.size > 48) chunks.delete(chunks.keys().next().value);
    }
    return chunks.get(key);
  }
  function nearby(p, range = 65) {
    const found = [];
    for (let cx = chunkOf(p.x - range); cx <= chunkOf(p.x + range); cx++) {
      for (let cz = chunkOf(p.z - range); cz <= chunkOf(p.z + range); cz++) {
        for (const b of chunk(cx, cz)) {
          if (Math.abs(p.x - b.x) <= range + b.width / 2 &&
              Math.abs(p.z - b.z) <= range + b.depth / 2) found.push(b);
        }
      }
    }
    return found;
  }
  return { nearby, get cacheSize() { return chunks.size; } };
}
export function intersectsWorld(p, world, radius = CRAFT_RADIUS) {
  return world.nearby(p, radius + 23).some(b => intersectsBuilding(p, b, radius));
}
function hitsTraffic(p, traffic, radius = 4.25) {
  for (const other of traffic) {
    if (Math.abs(p.y - other.y) > 3.0) continue;
    if (Math.hypot(p.x - other.x, p.z - other.z) < radius) return true;
  }
  return false;
}

// Multiple substeps stop a boosted craft from tunnelling through narrow buildings.
// Resolve each axis independently so it can slide around walls and roof edges.
export function moveWithCollisions(start, motion, world, traffic = [], radius = CRAFT_RADIUS) {
  const distance = Math.hypot(motion.x, motion.y, motion.z);
  const steps = Math.max(1, Math.ceil(distance / MAX_STEP));
  const d = { x: motion.x / steps, y: motion.y / steps, z: motion.z / steps };
  const p = { x: start.x, y: start.y, z: start.z };
  let hitBuilding = false, hitTraffic = false, blockedHorizontal = false;
  for (let i = 0; i < steps; i++) {
    if (d.y) {
      const next = { ...p, y: Math.max(5, p.y + d.y) };
      if (!intersectsWorld(next, world, radius)) p.y = next.y;
      else hitBuilding = true;
    }
    for (const axis of ['x', 'z']) {
      if (!d[axis]) continue;
      const next = { ...p, [axis]: p[axis] + d[axis] };
      if (intersectsWorld(next, world, radius)) {
        hitBuilding = true;
        blockedHorizontal = true;
      } else if (hitsTraffic(next, traffic)) {
        hitTraffic = true;
        blockedHorizontal = true;
      } else p[axis] = next[axis];
    }
  }
  return { position: p, hitBuilding, hitTraffic, blockedHorizontal,
    travelled: Math.hypot(p.x - start.x, p.z - start.z) };
}

// Following an avenue, not a random heading, avoids all static building lots.
export function guideAlongRoad(p, dt, speed = 34) {
  const road = Math.round(p.x / LOT_SIZE) * LOT_SIZE;
  const error = road - p.x;
  return { x: Math.sign(error) * Math.min(Math.abs(error), 24 * dt), y: 0, z: -speed * dt };
}

// Fixed lane distribution. Opposite traffic directions use distinct sides of
// real city roads; positions are computed from elapsed time, never integrated.
export function trafficPosition(index, elapsed, seed, centre) {
  const axis = index % 2;
  const row = Math.floor(index / 2) % 11 - 5;
  const group = Math.floor(index / 22);
  const lane = group % 2 === 0 ? -2.65 : 2.65;
  const direction = group % 2 === 0 ? -1 : 1;
  const speed = 22 + ((index * 13 + (seed & 15)) % 27);
  const length = CHUNK_SIZE * 5;
  const phase = (index * 211 + (seed % 1999)) % length;
  const move = ((((elapsed * speed * direction + phase) % length) + length) % length) - length * 0.5;
  const anchorX = Math.round(centre.x / CHUNK_SIZE) * CHUNK_SIZE;
  const anchorZ = Math.round(centre.z / CHUNK_SIZE) * CHUNK_SIZE;
  const level = 56 + ((index * 7) % 5) * 30;
  const line = row * LOT_SIZE + lane;
  return axis === 0
    ? { x: anchorX + move, y: level, z: Math.round(centre.z / LOT_SIZE) * LOT_SIZE + line, angle: 0 }
    : { x: Math.round(centre.x / LOT_SIZE) * LOT_SIZE + line, y: level, z: anchorZ + move, angle: Math.PI / 2 };
}
