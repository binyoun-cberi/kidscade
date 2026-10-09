// Deterministic, DOM-free city generation. One tile always uses the same world coordinates.
export const LOTS_PER_CHUNK = 4;
export const LOT_SIZE = 62;
export const CHUNK_SIZE = LOTS_PER_CHUNK * LOT_SIZE;
export const ROAD_WIDTH = 13;

export function seedNumber(input) {
  const value = String(input || 'NEON-01');
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function randomAt(seed, x, z, salt = 0) {
  let h = (seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(salt | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

export function createChunkData(cx, cz, seed) {
  const buildings = [];
  const parks = [];
  const blockStartX = cx * CHUNK_SIZE - CHUNK_SIZE * 0.5;
  const blockStartZ = cz * CHUNK_SIZE - CHUNK_SIZE * 0.5;
  const centre = 1 / (1 + Math.hypot(cx, cz) * 0.13);
  const neighbourhood = 0.28 + 0.72 * randomAt(seed, Math.floor(cx / 3), Math.floor(cz / 3), 10);
  for (let lz = 0; lz < LOTS_PER_CHUNK; lz++) {
    for (let lx = 0; lx < LOTS_PER_CHUNK; lx++) {
      const gx = cx * LOTS_PER_CHUNK + lx;
      const gz = cz * LOTS_PER_CHUNK + lz;
      const x = blockStartX + (lx + 0.5) * LOT_SIZE;
      const z = blockStartZ + (lz + 0.5) * LOT_SIZE;
      const type = randomAt(seed, gx, gz, 1);
      if (type < 0.095) {
        parks.push({ x, z, size: 28 + randomAt(seed, gx, gz, 2) * 12 });
        continue;
      }
      const width = 22 + randomAt(seed, gx, gz, 3) * 18;
      const depth = 22 + randomAt(seed, gx, gz, 4) * 18;
      const tower = Math.pow(randomAt(seed, gx, gz, 5), 1.45);
      const height = Math.round(20 + tower * (95 + centre * 185 * neighbourhood) + (type > 0.975 ? 115 : 0));
      const tier = randomAt(seed, gx, gz, 6);
      const colour = Math.floor(randomAt(seed, gx, gz, 7) * 7);
      const antenna = randomAt(seed, gx, gz, 8) > 0.81 && height > 95;
      buildings.push({
        x, z, width, depth, height, colour, antenna,
        crown: tier > 0.59 && height > 80,
        roofHeight: 3 + randomAt(seed, gx, gz, 9) * 5
      });
    }
  }
  return { cx, cz, buildings, parks };
}

export function chunkOf(value) {
  return Math.floor((value + CHUNK_SIZE * 0.5) / CHUNK_SIZE);
}
