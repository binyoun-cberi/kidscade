import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { computeClassroomWarScore, normalizeExact10Details, rankGameRecordRows } from '../worker/game-records.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('Classroom War score is recomputed from bounded run details', () => {
  const score = computeClassroomWarScore({
    survivalTenths: 1234,
    kills: 10,
    bossKills: 1,
    hazardsDestroyed: 2,
    maxArmy: 100
  });
  assert.equal(score, 1829);
  assert.equal(computeClassroomWarScore({ survivalTenths: 10, kills: 1, bossKills: 2, hazardsDestroyed: 0, maxArmy: 1 }), null);
});

test('exact 10 second records only accept a literal 10.00 classic result', () => {
  assert.deepEqual(normalizeExact10Details({ targetHundredths: 1000, elapsedHundredths: 1000 }), {
    targetHundredths: 1000,
    elapsedHundredths: 1000
  });
  assert.equal(normalizeExact10Details({ targetHundredths: 1000, elapsedHundredths: 999 }), null);
  assert.equal(normalizeExact10Details({ targetHundredths: 900, elapsedHundredths: 1000 }), null);
});

test('class game records rank high scores and mark the current student', () => {
  const rows = rankGameRecordRows([
    { student_id:'s2', nickname:'감자왕', value:800, details_json:'{"survivalTenths":300}', achieved_at:'2026-09-16T00:02:00.000Z' },
    { student_id:'s1', nickname:'번개토끼', value:1000, details_json:'{"survivalTenths":420}', achieved_at:'2026-09-16T00:03:00.000Z' },
    { student_id:'s3', nickname:'푸른용', value:1000, details_json:'{"survivalTenths":400}', achieved_at:'2026-09-16T00:01:00.000Z' }
  ], 's1');
  assert.equal(rows[0].nickname, '푸른용');
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[1].nickname, '번개토끼');
  assert.equal(rows[1].self, true);
  assert.equal(rows[2].value, 800);
});

test('game record migration and game integrations are included in the Cloudflare artifact', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/0004_game_records.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS game_records/);

  const builtClassroomWar = fs.readFileSync(path.join(root, 'dist/classroom_war_3d.html'), 'utf8');
  assert.match(builtClassroomWar, /classroom-war-records\.js\?v=20260916-1/);
  assert.match(builtClassroomWar, /classroom-war-records-observer\.js\?v=20260916-1/);
  assert.ok(fs.existsSync(path.join(root, 'dist/classroom-war-records.js')));
  assert.ok(fs.existsSync(path.join(root, 'dist/classroom-war-records-observer.js')));

  const builtTiming = fs.readFileSync(path.join(root, 'dist/딱! 타임 LCD.html'), 'utf8');
  assert.match(builtTiming, /timing-exact10-records\.js\?v=20260916-1/);
  assert.ok(fs.existsSync(path.join(root, 'dist/timing-exact10-records.js')));
});

test('timing client records only classic 10.00 results and uses cumulative metric', () => {
  const client = fs.readFileSync(path.join(root, 'timing-exact10-records.js'), 'utf8');
  assert.match(client, /exact_10_hits/);
  assert.match(client, /activeMode !== 'classic'/);
  assert.match(client, /match\[1\] !== '10\.00'/);
  assert.match(client, /elapsedHundredths: 1000/);

  const worker = fs.readFileSync(path.join(root, 'worker/game-records.mjs'), 'utf8');
  assert.match(worker, /strategy: 'sum'/);
  assert.match(worker, /game_records\.value \+ excluded\.value/);
  assert.match(worker, /TIMING_EXACT_COOLDOWN_MS = 8000/);
});
