import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

test('real estate migration adds classroom properties, leases, rent payments, and teacher-entered loan metadata', () => {
  const sql = read('migrations','0015_classroom_real_estate.sql');
  for (const name of ['economy_properties','economy_property_leases','economy_rent_payments']) {
    assert.match(sql, new RegExp(name));
  }
  for (const column of ['source_type','purpose','occurred_at','property_id']) {
    assert.match(sql, new RegExp(column));
  }
  assert.match(sql, /WHERE status = 'active'/);
  assert.match(sql, /UNIQUE \(lease_id, period_id\)/);
});

test('teacher economy exposes property, rent, and existing loan actions', () => {
  const teacher = read('worker','economy-v3-teacher.mjs');
  const router = read('worker','economy.mjs');
  for (const fn of ['teacherLoanRecord','teacherPropertySave','teacherLeaseCreate','teacherLeaseClose','teacherRentCollect']) {
    assert.match(teacher, new RegExp('export async function ' + fn));
    assert.match(router, new RegExp(fn));
  }
  for (const route of ['loan-record','property','lease','lease-close','rent-collect']) {
    assert.match(router, new RegExp('/api/teacher/economy/' + route));
  }
  assert.match(teacher, /source_type/);
  assert.match(teacher, /property-purchase/);
  assert.match(teacher, /rent-income/);
  assert.match(teacher, /잔액 부족/);
});

test('teacher interface supports real estate ownership and government rent workflows', () => {
  const html = read('teacher','economy.html');
  const js = read('teacher-economy.js');
  for (const id of [
    'panel-property','propertyRows','leaseRows','rentPaymentRows',
    'propertyOwnerType','propertyOwnerStudent','propertySettlePurchase',
    'recordLoanStudent','recordLoanDeposit','recordLoanProperty'
  ]) assert.match(html, new RegExp('id="' + id + '"'));
  assert.match(html, /정부\(미분양\)/);
  assert.match(html, /매매대금도 실제 정산/);
  assert.match(js, /renderProperties/);
  assert.match(js, /recordLoan/);
  assert.match(js, /collectRent/);
});
