import test from 'node:test';
import assert from 'node:assert/strict';
import { LOTS_PER_CHUNK, LOT_SIZE, ROAD_WIDTH, CHUNK_SIZE, chunkOf, createChunkData, randomAt, seedNumber } from '../games/gigacity_lite/city-core.mjs';
import { VIEW_MODES, safeMode, cameraPose, forwardOf, rotateXZ, CAMERA_EYE } from '../games/gigacity_lite/flight-view.mjs';
import { readFileSync } from 'node:fs';

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


test('all three Gigacity camera views are available and invalid views fall back safely', () => {
  assert.deepEqual(VIEW_MODES, ['free', 'chase', 'cockpit']);
  assert.equal(safeMode('cockpit'), 'cockpit');
  assert.equal(safeMode('free'), 'free');
  assert.equal(safeMode('unknown'), 'chase');
});

test('car camera stays forward-facing with a consistent local cockpit eye', () => {
  const position = { x: 21, y: 123, z: -8 };
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const eye = rotateXZ(CAMERA_EYE.x, CAMERA_EYE.z, heading);
    const cockpit = cameraPose('cockpit', position, heading);
    assert.ok(Math.abs(cockpit.position.x - position.x - eye.x) < 1e-9);
    assert.ok(Math.abs(cockpit.position.z - position.z - eye.z) < 1e-9);
    assert.ok(Math.abs(cockpit.position.y - position.y - CAMERA_EYE.y) < 1e-9);
    assert.equal(cockpit.target, null);
    assert.ok(Math.abs(cockpit.yaw - heading) < 1e-9);
    const forward = forwardOf(heading);
    assert.ok(Math.abs(Math.hypot(forward.x, forward.z) - 1) < 1e-9);
    const chase = cameraPose('chase', position, heading);
    assert.ok((chase.position.x - position.x) * forward.x + (chase.position.z - position.z) * forward.z < 0, 'chase cam stays behind');
    assert.ok((chase.target.x - position.x) * forward.x + (chase.target.z - position.z) * forward.z > 0, 'chase view looks ahead');
  }
});

test('cockpit head look is clamped so dashboard and windshield stay available', () => {
  const position = { x: 0, y: 145, z: 0 };
  const left = cameraPose('cockpit', position, 0, 0, -300, -300);
  const right = cameraPose('cockpit', position, 0, 0, 300, 300);
  assert.equal(left.yaw, -1.15);
  assert.equal(right.yaw, 1.15);
  assert.equal(left.pitch, -0.62);
  assert.equal(right.pitch, 0.65);
  assert.deepEqual(cameraPose('free', position, 1.3, -0.25).position, position);
});

test('Gigacity references the original Kenney future car and a separate 3D cockpit', () => {
  const craft = readFileSync(new URL('../games/gigacity_lite/craft.js', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../games/gigacity_lite/main.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../games/gigacity_lite/index.html', import.meta.url), 'utf8');
  assert.match(craft, /race-future\.glb/);
  assert.match(craft, /new GLTFLoader/);
  assert.match(craft, /exterior\.visible = mode === 'chase'/);
  assert.match(craft, /interior\.visible = mode === 'cockpit'/);
  assert.match(craft, /cameraEye: new THREE\.Vector3/);
  assert.match(craft, /updateDashboard/);
  assert.match(main, /setViewMode\('chase'\)/);
  assert.match(main, /playerCraft\.update\(/);
  for (const mode of VIEW_MODES) assert.match(html, new RegExp('data-view-mode="' + mode + '"'));
  assert.match(html, /three\/addons/);
});
