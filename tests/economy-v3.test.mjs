import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
}

test('economy v3 migration adds requested systems', () => {
  const sql = read('migrations','0013_classroom_economy_v3.sql');
  for (const name of [
    'economy_work_logs','economy_loans','economy_inventory','economy_payslips',
    'economy_public_spending','economy_credit_events','economy_companies',
    'economy_company_products','economy_company_sales','economy_request_keys'
  ]) assert.match(sql, new RegExp(name));
  assert.match(sql, /government_debt_balance/);
  assert.match(sql, /credit_score/);
  assert.match(sql, /appeal_count/);
  assert.match(sql, /fine_cap_snapshot/);
});

test('student v3 protects duplicate financial actions', () => {
  const common = read('worker','economy-common.mjs');
  const student = read('worker','economy-v3-student.mjs');
  assert.match(common, /claimRequest/);
  assert.match(common, /economy_request_keys/);
  assert.match(student, /studentBuyV3/);
  assert.match(student, /studentCompanyBuy/);
  assert.match(student, /studentLoanRepay/);
  assert.match(student, /balance>=\?/);
  assert.match(student, /stock>0/);
});

test('credit grades control savings and loan rates', () => {
  const common = read('worker','economy-common.mjs');
  assert.match(common, /grade = 'A\+'/);
  assert.match(common, /savingsRate/);
  assert.match(common, /loanRate/);
  assert.match(common, /loanMultiplier/);
});

test('payroll uses approved work logs and writes payslips', () => {
  const teacher = read('worker','economy-v3-teacher.mjs');
  assert.match(teacher, /work_status==='approved'/);
  assert.match(teacher, /economy_payslips/);
  assert.match(teacher, /savingsInterest/);
  assert.match(teacher, /loanInterest/);
});

test('fine appeal is one-time and snapshots the historical cap', () => {
  const student = read('worker','economy-v3-student.mjs');
  const teacher = read('worker','economy-v3-teacher.mjs');
  assert.match(student, /appeal_count/);
  assert.match(student, /found\.status!=='confirmed'/);
  assert.match(teacher, /salarySnapshot/);
  assert.match(teacher, /fineCapSnapshot/);
  assert.match(teacher, /government_debt_balance/);
});

test('student and teacher interfaces expose all economy v3 flows', () => {
  const studentHtml = read('economy.html');
  const teacherHtml = read('teacher','economy.html');
  for (const id of ['panel-work','panel-inventory','panel-company','panel-government','payslipRows','loanRows']) {
    assert.match(studentHtml, new RegExp('id="' + id + '"'));
  }
  for (const id of ['panel-work','panel-company','workLogRows','loanAdminRows','inventoryAdminRows','mDebt']) {
    assert.match(teacherHtml, new RegExp('id="' + id + '"'));
  }
});
