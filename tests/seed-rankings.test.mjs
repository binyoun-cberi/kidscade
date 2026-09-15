import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kstWeekKey, rankRows } from '../worker/seed-rankings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('KST seed week starts on Monday', () => {
  assert.equal(kstWeekKey(new Date('2026-09-14T00:10:00+09:00')), '2026-09-14');
  assert.equal(kstWeekKey(new Date('2026-09-20T23:59:59+09:00')), '2026-09-14');
  assert.equal(kstWeekKey(new Date('2026-09-21T00:00:00+09:00')), '2026-09-21');
});

test('seed rankings sort descending and mark only the current student', () => {
  const ranked = rankRows([
    { student_id:'a', nickname:'감자왕', seed_balance:40 },
    { student_id:'b', nickname:'번개토끼', seed_balance:120 },
    { student_id:'c', nickname:'별빛', seed_balance:70 }
  ], 'seed_balance', 'c');
  assert.deepEqual(ranked.map(row => [row.rank, row.nickname, row.value, row.self]), [
    [1, '번개토끼', 120, false],
    [2, '별빛', 70, true],
    [3, '감자왕', 40, false]
  ]);
});

test('seed ranking migration and API routes are wired', () => {
  const migration = fs.readFileSync(path.join(ROOT, 'migrations', '0003_seed_rankings.sql'), 'utf8');
  const main = fs.readFileSync(path.join(ROOT, 'worker', 'main.mjs'), 'utf8');
  const worker = fs.readFileSync(path.join(ROOT, 'worker', 'seed-rankings.mjs'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS student_seed_weekly/);
  assert.match(main, /handleSeedRankingRequest/);
  assert.match(worker, /\/api\/account\/seed-earned/);
  assert.match(worker, /\/api\/account\/seed-ranking/);
  assert.match(worker, /json_extract\(a\.state_json, '\$\.seeds'\)/);
});

test('student ranking UI exposes only the requested seed views', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'seed-ranking.js'), 'utf8');
  assert.match(index, /seed-ranking\.js/);
  assert.match(client, /보유 씨앗/);
  assert.match(client, /이번 주 획득/);
  assert.match(client, /우리 반 씨앗 랭킹/);
  assert.match(client, /\/api\/account\/seed-earned/);
  assert.match(client, /\/api\/account\/seed-ranking/);
  assert.doesNotMatch(client, /loginId.*innerHTML/);
});
