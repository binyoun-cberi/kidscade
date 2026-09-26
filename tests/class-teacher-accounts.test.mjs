import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('class teacher account schema and auth routes are wired', () => {
  const migration = fs.readFileSync(path.join(ROOT,'migrations','0012_class_teacher_accounts.sql'),'utf8');
  const main = fs.readFileSync(path.join(ROOT,'worker','main.mjs'),'utf8');
  const auth = fs.readFileSync(path.join(ROOT,'worker','teacher-auth.mjs'),'utf8');
  assert.match(migration,/CREATE TABLE IF NOT EXISTS class_teacher_accounts/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS class_teacher_sessions/);
  assert.match(main,/handleTeacherAuthRequest/);
  assert.match(auth,/\/api\/teacher\/auth\/login/);
  assert.match(auth,/authorizeTeacherForClass/);
});

test('teacher passwords are reversible only through encrypted admin storage and verified by hash', () => {
  const auth = fs.readFileSync(path.join(ROOT,'worker','teacher-auth.mjs'),'utf8');
  assert.match(auth,/AES-GCM/);
  assert.match(auth,/password_hash/);
  assert.match(auth,/password_ciphertext/);
  assert.match(auth,/decryptTeacherPassword/);
  assert.doesNotMatch(auth,/password_plaintext/);
});

test('teacher management UI supports class login and global credential viewing', () => {
  const html = fs.readFileSync(path.join(ROOT,'teacher','index.html'),'utf8');
  const client = fs.readFileSync(path.join(ROOT,'teacher-accounts.js'),'utf8');
  assert.match(html,/id="teacher-login-id"/);
  assert.match(html,/id="teacher-login-password"/);
  assert.match(html,/전역 관리자 로그인/);
  assert.match(client,/authenticateTeacher/);
  assert.match(client,/teacherCredentialHtml/);
  assert.match(client,/reset-teacher/);
});

test('class teacher access is scoped across roster and economy routes', () => {
  const teacherAdmin = fs.readFileSync(path.join(ROOT,'worker','teacher-admin.mjs'),'utf8');
  const economyTeacher = fs.readFileSync(path.join(ROOT,'worker','economy-teacher.mjs'),'utf8');
  const accounts = fs.readFileSync(path.join(ROOT,'worker','accounts.mjs'),'utf8');
  assert.match(teacherAdmin,/authorizeTeacherForClass/);
  assert.match(economyTeacher,/authorizeTeacherForClass/);
  assert.match(accounts,/authorizeTeacherForClass/);
});

test('economy pages use Kidscade visual language', () => {
  const wallet = fs.readFileSync(path.join(ROOT,'economy.html'),'utf8');
  const teacher = fs.readFileSync(path.join(ROOT,'teacher','economy.html'),'utf8');
  assert.match(wallet,/Comic Sans MS/);
  assert.match(wallet,/#ff6b81/);
  assert.match(wallet,/#ffcc00/);
  assert.match(teacher,/--purple:#7c5cff/);
  assert.match(teacher,/background:#f6f7fb/);
});
