import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('student session query exposes class_id for classroom economy', () => {
  const accounts = fs.readFileSync(path.join(ROOT, 'worker/accounts.mjs'), 'utf8');
  assert.match(accounts, /a\.id AS student_id, a\.class_id, a\.login_id/);
});

test('economy wallet reuses Kidscade session instead of asking for a second login', () => {
  const html = fs.readFileSync(path.join(ROOT, 'economy.html'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'economy.js'), 'utf8');
  assert.doesNotMatch(html, /id="loginId"/);
  assert.doesNotMatch(html, /id="pin"/);
  assert.match(html, /KIDSCade 로그인 상태를 그대로 사용합니다/);
  assert.match(client, /response\.status === 401/);
  assert.match(client, /showServerError/);
  assert.doesNotMatch(client, /\/api\/account\/login/);
});
