import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeLoginId,
  isValidLoginId,
  isValidPin,
  sanitizeNickname,
  sanitizeSyncState,
  hashPin,
  makeSessionCookie
} from '../worker/accounts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('student login IDs and PINs use the intended compact format', () => {
  assert.equal(normalizeLoginId(' kc-ab12c-01 '), 'KC-AB12C-01');
  assert.equal(isValidLoginId('KC-AB12C-01'), true);
  assert.equal(isValidLoginId('a'), false);
  assert.equal(isValidPin('123456'), true);
  assert.equal(isValidPin('12345'), false);
  assert.equal(isValidPin('12a456'), false);
});

test('PIN hashes are server-secret keyed and tied to the login ID', async () => {
  const first = await hashPin('KC-ABCDE-01', '123456', 'test-pepper');
  const again = await hashPin('kc-abcde-01', '123456', 'test-pepper');
  const otherStudent = await hashPin('KC-ABCDE-02', '123456', 'test-pepper');
  assert.equal(first, again);
  assert.notEqual(first, otherStudent);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test('student session cookie is HttpOnly, Secure and strict same-site', () => {
  const cookie = makeSessionCookie('a'.repeat(64));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
});

test('cloud sync state only keeps bounded Kidscade progress fields', () => {
  const state = sanitizeSyncState({
    profile: { nickname: '<b>번개토끼</b>' },
    seeds: 1234,
    avatarInventory: ['hat_1', 'shirt_2'],
    avatarEquipped: { hair: 'hair_1' },
    playHistory: { games: { math: { plays: 3 } } },
    inventory: { land: ['tree'] },
    equipped: { land: 'tree' },
    pet: { exp: 20 },
    petItems: { apple: 2 },
    gardenState: { level: 2 },
    ignoredSecret: 'nope'
  });
  assert.equal(state.profile.nickname, 'b번개토끼/b');
  assert.equal(state.seeds, 1234);
  assert.deepEqual(state.avatarInventory, ['hat_1', 'shirt_2']);
  assert.equal(Object.hasOwn(state, 'ignoredSecret'), false);
});

test('account feature is wired into deployment without exposing server code as static assets', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const wrangler = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
  const build = fs.readFileSync(path.join(ROOT, 'scripts', 'build-cloudflare.cjs'), 'utf8');
  const migration = fs.readFileSync(path.join(ROOT, 'migrations', '0002_student_accounts.sql'), 'utf8');
  assert.match(index, /account-client\.js/);
  assert.match(wrangler, /worker\/main\.mjs/);
  assert.match(build, /'worker'/);
  assert.match(build, /'migrations'/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS student_accounts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS student_sessions/);
});

test('nickname sanitizer removes markup delimiters and caps length', () => {
  assert.equal(sanitizeNickname('  번개토끼  '), '번개토끼');
  assert.ok(sanitizeNickname('12345678901234567890').length <= 12);
});
