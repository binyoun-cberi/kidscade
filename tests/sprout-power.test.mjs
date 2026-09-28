import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kstWeekKey, rankRows } from '../worker/sprout-power.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('KST sprout-power week starts on Monday', () => {
  assert.equal(kstWeekKey(new Date('2026-09-14T00:10:00+09:00')), '2026-09-14');
  assert.equal(kstWeekKey(new Date('2026-09-20T23:59:59+09:00')), '2026-09-14');
  assert.equal(kstWeekKey(new Date('2026-09-21T00:00:00+09:00')), '2026-09-21');
});

test('sprout-power rankings sort descending and mark only the current student', () => {
  const ranked = rankRows([
    { student_id:'a', nickname:'감자왕', total_power:40 },
    { student_id:'b', nickname:'번개토끼', total_power:120 },
    { student_id:'c', nickname:'별빛', total_power:70 }
  ], 'total_power', 'c');
  assert.deepEqual(ranked.map(row => [row.rank, row.nickname, row.value, row.self]), [
    [1, '번개토끼', 120, false],
    [2, '별빛', 70, true],
    [3, '감자왕', 40, false]
  ]);
});

test('sprout-power migration and API routes are wired', () => {
  const migration = fs.readFileSync(path.join(ROOT, 'migrations', '0016_sprout_power.sql'), 'utf8');
  const main = fs.readFileSync(path.join(ROOT, 'worker', 'main.mjs'), 'utf8');
  const worker = fs.readFileSync(path.join(ROOT, 'worker', 'sprout-power.mjs'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS student_sprout_weekly/);
  assert.match(main, /handleSproutPowerRequest/);
  assert.match(worker, /\/api\/account\/sprout-power-earned/);
  assert.match(worker, /\/api\/account\/sprout-power-ranking/);
  assert.match(worker, /json_extract\(a\.state_json,'\$\.sproutPower'\)/);
});

test('teachers can view class sprout-power ranking without writing student weekly ledgers', () => {
  const worker = fs.readFileSync(path.join(ROOT, 'worker', 'sprout-power.mjs'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'sprout-power.js'), 'utf8');
  assert.match(worker, /authorizeTeacherAccess/);
  assert.match(worker, /requireRankingViewer/);
  assert.match(client, /isTeacher/);
  assert.match(client, /!isTeacher\(\)/);
});

test('student ranking UI uses non-spendable sprout power instead of seed balance', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'sprout-power.js'), 'utf8');
  assert.match(index, /sprout-power\.js/);
  assert.match(client, /우리 반 새싹력 랭킹/);
  assert.match(client, /이번 주/);
  assert.match(client, /누적/);
  assert.match(client, /씨앗처럼 소비되지 않아요/);
  assert.match(client, /\/api\/account\/sprout-power-earned/);
  assert.match(client, /\/api\/account\/sprout-power-ranking/);
  assert.doesNotMatch(client, /보유 씨앗 TOP/);
});

test('main play rewards add sprout power and no longer add pet experience', () => {
  const launcher = fs.readFileSync(path.join(ROOT, 'game-launcher.js'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'main-bootstrap.js'), 'utf8');
  assert.match(launcher, /rewardPower/);
  assert.match(launcher, /addSproutPower/);
  assert.doesNotMatch(launcher, /addPetExp/);
  assert.match(bootstrap, /KidscadeSproutPower\?\.earn/);
  assert.doesNotMatch(bootstrap, /addPetExp:/);
});
