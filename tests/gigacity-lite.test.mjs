import test from 'node:test';
import assert from 'node:assert/strict';
import { LOTS_PER_CHUNK, LOT_SIZE, ROAD_WIDTH, CHUNK_SIZE, chunkOf, createChunkData, randomAt, seedNumber } from '../games/gigacity_lite/city-core.mjs';

test('gigacity seed generates stable, reproducible chunks', () => {
  const seed = seedNumber('NEON-01');
  const first = createChunkData(-3, 4, seed);
  assert.deepEqual(first, createChunkData(-3, 4, seed));
  assert.notDeepEqual(first, createChunkData(-3, 4, seedNumber('NEON-02')));
  assert.equal(first.buildings.length + first.parks.length, LOTS_PER_CHUNK ** 2);
});

test('gigacity tile positions are global, grid aligned, and inside roads', () => {
  const seed = seedNumber('LAYOUT-01');
  for (const [cx, cz] of [[0, 0], [1, 0], [-1, -1], [13, -9]]) {
    const chunk = createChunkData(cx, cz, seed);
    for (const b of chunk.buildings) {
      const localX = b.x - cx * CHUNK_SIZE + CHUNK_SIZE / 2;
      const localZ = b.z - cz * CHUNK_SIZE + CHUNK_SIZE / 2;
      assert.ok(Math.abs(localX / LOT_SIZE - Math.round(localX / LOT_SIZE - 0.5) - 0.5) < 1e-8);
      assert.ok(Math.abs(localZ / LOT_SIZE - Math.round(localZ / LOT_SIZE - 0.5) - 0.5) < 1e-8);
      assert.ok(b.width < LOT_SIZE - ROAD_WIDTH);
      assert.ok(b.depth < LOT_SIZE - ROAD_WIDTH);
      assert.ok(b.height >= 20 && b.height <= 420);
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.z));
      assert.ok(b.colour >= 0 && b.colour <= 6);
    }
  }
});

test('gigacity negative coordinate chunk boundaries never skip a tile', () => {
  assert.equal(chunkOf(0), 0);
  assert.equal(chunkOf(CHUNK_SIZE / 2 - 0.01), 0);
  assert.equal(chunkOf(CHUNK_SIZE / 2), 1);
  assert.equal(chunkOf(-CHUNK_SIZE / 2), 0);
  assert.equal(chunkOf(-CHUNK_SIZE / 2 - 0.01), -1);
  for (let k = -10; k <= 10; k++) assert.equal(chunkOf(k * CHUNK_SIZE), k);
});

test('gigacity pseudo-random output stays finite in large negative and positive positions', () => {
  const seed = seedNumber('WIDE-CITY');
  for (let k = -300; k <= 300; k += 17) {
    const value = randomAt(seed, k, -k * 19, 7);
    assert.ok(value >= 0 && value < 1);
    const data = createChunkData(k, k - 1, seed);
    assert.equal(data.buildings.length + data.parks.length, 16);
  }
});
