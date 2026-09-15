import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { computeClassroomWarScore, rankGameRecordRows } from '../worker/game-records.mjs';

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

test('game record migration and Classroom War integration are included in the Cloudflare artifact', () => {
  const migration = fs.readFileSync(path.join(root, 'migrations/0004_game_records.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS game_records/);
  const builtGame = fs.readFileSync(path.join(root, 'dist/classroom_war_3d.html'), 'utf8');
  assert.match(builtGame, /classroom-war-records\.js\?v=20260916-1/);
  assert.match(builtGame, /classroom-war-records-observer\.js\?v=20260916-1/);
  assert.ok(fs.existsSync(path.join(root, 'dist/classroom-war-records.js')));
  assert.ok(fs.existsSync(path.join(root, 'dist/classroom-war-records-observer.js')));
});
