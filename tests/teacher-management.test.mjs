import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blankStudentState, summarizeStudentState, nextStudentNumber } from '../worker/teacher-admin.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('blank cloud state resets Kidscade shared progress without deleting the account', () => {
  const state = blankStudentState();
  assert.equal(state.profile.nickname, '새싹 게이머');
  assert.equal(state.seeds, 0);
  assert.deepEqual(state.avatarInventory, []);
  assert.deepEqual(state.playHistory.games, {});
  assert.deepEqual(state.gardenState, {});
});

test('teacher overview summary stays compact while preserving useful play totals', () => {
  const summary = summarizeStudentState({
    seeds: 1450,
    playHistory: {
      games: {
        math: { plays: 3, seconds: 210 },
        english: { plays: 2, seconds: 125 },
        untouched: { plays: 0, seconds: 0 }
      }
    },
    gardenState: { level: 4 },
    pet: { level: 3 }
  });
  assert.deepEqual(summary, {
    seeds: 1450,
    plays: 5,
    seconds: 335,
    gameCount: 2,
    gardenLevel: 4,
    petLevel: 3
  });
});

test('adding students continues after the highest issued class number', () => {
  assert.equal(nextStudentNumber(['KC-ABCDE-01', 'KC-ABCDE-02', 'KC-ABCDE-07'], 'ABCDE'), 8);
  assert.equal(nextStudentNumber(['KC-OTHER-99'], 'ABCDE'), 1);
});

test('management API is routed before the general account API', () => {
  const main = fs.readFileSync(path.join(ROOT, 'worker', 'main.mjs'), 'utf8');
  const admin = fs.readFileSync(path.join(ROOT, 'worker', 'teacher-admin.mjs'), 'utf8');
  assert.match(main, /handleTeacherManagementRequest/);
  assert.ok(main.indexOf('handleTeacherManagementRequest') < main.indexOf('handleAccountRequest(request'));
  for (const route of [
    '/api/teacher/overview', '/api/teacher/add-students', '/api/teacher/student-status',
    '/api/teacher/student-logout', '/api/teacher/class-logout', '/api/teacher/reset-progress',
    '/api/teacher/student', '/api/teacher/class-delete'
  ]) assert.match(admin, new RegExp(route.replaceAll('/', '\\/')));
});

test('teacher UI exposes lifecycle management and guarded destructive actions', () => {
  const html = fs.readFileSync(path.join(ROOT, 'teacher', 'index.html'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'teacher-accounts.js'), 'utf8');
  assert.match(html, /관리 현황/);
  assert.match(html, /student-search/);
  assert.match(html, /현황 CSV/);
  assert.match(client, /add-students/);
  assert.match(client, /toggle-status/);
  assert.match(client, /reset-progress/);
  assert.match(client, /delete-student/);
  assert.match(client, /delete-class/);
  assert.match(client, /prompt\(`\$\{loginId\}/);
});
