import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
}

test('economy job capability migration adds duty ledgers and automatic work activity fields', () => {
  const sql = read('migrations','0014_job_capabilities.sql');
  for (const name of [
    'economy_job_capabilities',
    'economy_clean_plate_records',
    'economy_credit_book_records',
    'economy_job_activity'
  ]) assert.match(sql, new RegExp(name));
  assert.match(sql, /ADD COLUMN activity_count/);
  assert.match(sql, /ADD COLUMN activity_summary/);
  assert.match(sql, /UNIQUE \(class_id, target_student_id, record_date\)/);
});

test('job permissions are capability based instead of job-name based', () => {
  const desk = read('worker','economy-jobdesk.mjs');
  assert.match(desk, /stats\.clean_plate/);
  assert.match(desk, /credit\.learning_ledger/);
  assert.match(desk, /requireCapability/);
  assert.match(desk, /economy_job_capabilities/);
  assert.doesNotMatch(desk, /job\.name\s*===\s*['"]통계청['"]/);
  assert.doesNotMatch(desk, /job\.name\s*===\s*['"]신용평가사['"]/);
});

test('clean plate and learning credit ledgers require assigned capability and record job activity', () => {
  const desk = read('worker','economy-jobdesk.mjs');
  assert.match(desk, /studentCleanPlateRecord/);
  assert.match(desk, /studentCreditBookRecord/);
  assert.match(desk, /recordActivity/);
  assert.match(desk, /클린식판 기록/);
  assert.match(desk, /학습 신용장부 기록/);
  assert.match(desk, /claimRequest/);
  assert.match(desk, /completeRequest/);
});

test('learning credit records cannot directly change student credit before teacher review', () => {
  const desk = read('worker','economy-jobdesk.mjs');
  const studentStart = desk.indexOf('export async function studentCreditBookRecord');
  const teacherStart = desk.indexOf('export async function teacherCreditBookDecision');
  assert.ok(studentStart >= 0 && teacherStart > studentStart);
  const studentSection = desk.slice(studentStart, teacherStart);
  const teacherSection = desk.slice(teacherStart);
  assert.match(studentSection, /review_status/);
  assert.doesNotMatch(studentSection, /UPDATE economy_accounts SET credit_score/);
  assert.match(teacherSection, /review_status='pending'/);
  assert.match(teacherSection, /UPDATE economy_accounts SET credit_score/);
  assert.match(teacherSection, /economy_credit_events/);
});

test('automatic duty activity is copied into submitted work logs', () => {
  const student = read('worker','economy-v3-student.mjs');
  assert.match(student, /economy_job_activity/);
  assert.match(student, /activity_count/);
  assert.match(student, /activity_summary/);
  assert.match(student, /GROUP BY action_label/);
});

test('economy router exposes job duty and teacher review endpoints', () => {
  const router = read('worker','economy.mjs');
  for (const route of [
    '/api/economy/job-duty/clean-plate',
    '/api/economy/job-duty/credit-record',
    '/api/teacher/economy/job-capabilities',
    '/api/teacher/economy/credit-record-decision'
  ]) assert.ok(router.includes(route), 'missing route: ' + route);
});

test('student and teacher UIs expose the capability workbench', () => {
  const studentHtml = read('economy.html');
  const studentJs = read('economy.js');
  const teacherHtml = read('teacher','economy.html');
  const teacherJs = read('teacher-economy.js');

  for (const id of [
    'jobDeskTab','panel-jobdesk','cleanPlateTool','creditLedgerTool',
    'cleanPlateStudent','creditLedgerStudent','jobActivityRows'
  ]) assert.match(studentHtml, new RegExp('id="' + id + '"'));

  assert.match(studentJs, /renderJobDesk/);
  assert.match(studentJs, /saveCleanPlateRecord/);
  assert.match(studentJs, /saveCreditLedgerRecord/);

  for (const id of [
    'jobCapCleanPlate','jobCapCreditLedger','cleanPlateAdminRows','creditBookAdminRows'
  ]) assert.match(teacherHtml, new RegExp('id="' + id + '"'));

  assert.match(teacherJs, /data-save-job-caps/);
  assert.match(teacherJs, /credit-record-decision/);
});
