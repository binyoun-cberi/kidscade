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
  encryptStudentPin,
  decryptStudentPin,
  makeSessionCookie
} from '../worker/accounts.mjs';
import {
  createQrToken,
  isValidQrToken,
  hashQrToken,
  encryptQrToken,
  decryptQrToken
} from '../worker/qr-login.mjs';

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

test('student PIN encryption can be decrypted by the server with the account secret', async () => {
  const encrypted = await encryptStudentPin('654321', 'test-pepper');
  assert.notEqual(encrypted.ciphertext, '654321');
  assert.ok(encrypted.iv);
  assert.equal(await decryptStudentPin(encrypted.ciphertext, encrypted.iv, 'test-pepper'), '654321');
});

test('QR login credentials are random, hashable and encrypted at rest', async () => {
  const token = createQrToken();
  assert.equal(isValidQrToken(token), true);
  assert.match(token, /^[0-9a-f]{64}$/);
  const hash = await hashQrToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, token);
  const encrypted = await encryptQrToken(token, 'test-pepper');
  assert.notEqual(encrypted.ciphertext, token);
  assert.ok(encrypted.iv);
  assert.equal(await decryptQrToken(encrypted.ciphertext, encrypted.iv, 'test-pepper'), token);
});

test('student session cookie is long-lived, HttpOnly, Secure and strict same-site', () => {
  const cookie = makeSessionCookie('a'.repeat(64));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=34560000/);
});

test('cloud sync state only keeps bounded Kidscade progress fields', () => {
  const state = sanitizeSyncState({
    profile: { nickname: '<b>번개토끼</b>' },
    seeds: 1234,
    sproutPower: 87,
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
  assert.equal(state.sproutPower, 87);
  assert.deepEqual(state.avatarInventory, ['hat_1', 'shirt_2']);
  assert.equal(Object.hasOwn(state, 'pet'), false);
  assert.equal(Object.hasOwn(state, 'petItems'), false);
  assert.equal(Object.hasOwn(state, 'gardenState'), false);
  assert.equal(Object.hasOwn(state, 'ignoredSecret'), false);
});

test('account feature is wired into deployment without exposing server code as static assets', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'main-bootstrap.js'), 'utf8');
  const wrangler = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
  const build = fs.readFileSync(path.join(ROOT, 'scripts', 'build-cloudflare.cjs'), 'utf8');
  const migration = fs.readFileSync(path.join(ROOT, 'migrations', '0002_student_accounts.sql'), 'utf8');
  const pinMigration = fs.readFileSync(path.join(ROOT, 'migrations', '0017_student_pin_encryption.sql'), 'utf8');
  const qrMigration = fs.readFileSync(path.join(ROOT, 'migrations', '0018_student_qr_login.sql'), 'utf8');
  assert.doesNotMatch(index, /account-client\.js/);
  assert.match(bootstrap, /['"]account-client\.js['"]/);
  assert.match(wrangler, /worker\/main\.mjs/);
  assert.match(build, /'worker'/);
  assert.match(build, /'migrations'/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS student_accounts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS student_sessions/);
  assert.match(pinMigration, /pin_ciphertext/);
  assert.match(pinMigration, /pin_iv/);
  assert.match(qrMigration, /qr_token_hash/);
  assert.match(qrMigration, /qr_token_ciphertext/);
  assert.match(qrMigration, /idx_student_accounts_qr_token_hash/);
});

test('student login supports QR camera scan and QR-link auto login without removing PIN login', () => {
  const server = fs.readFileSync(path.join(ROOT, 'worker', 'accounts.mjs'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'account-client.js'), 'utf8');
  assert.match(server, /\/api\/account\/qr-login/);
  assert.match(server, /async function qrLogin/);
  assert.match(server, /WHERE a\.qr_token_hash = \?/);
  assert.match(client, /QR 카드로 빠른 로그인/);
  assert.match(client, /BarcodeDetector/);
  assert.match(client, /takeQrTokenFromLocation/);
  assert.match(client, /\/api\/account\/qr-login/);
  assert.match(client, /ID · PIN으로 로그인/);
});

test('account login modal keeps its overlay styling after lobby bootstrap replacement', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const bootstrap = fs.readFileSync(path.join(ROOT, 'main-bootstrap.js'), 'utf8');
  const runtime = fs.readFileSync(path.join(ROOT, 'account-ui-runtime.js'), 'utf8');
  assert.doesNotMatch(index, /account-ui-runtime\.js/);
  assert.match(bootstrap, /['"]account-ui-runtime\.js['"]/);
  assert.match(runtime, /#kc-account-modal\{position:fixed!important/);
  assert.match(runtime, /place-items:end center!important/);
  assert.match(runtime, /safe-area-inset-bottom/);
  assert.match(runtime, /kc-profile-identity/);
});

test('nickname sanitizer removes markup delimiters and caps length', () => {
  assert.equal(sanitizeNickname('  번개토끼  '), '번개토끼');
  assert.ok(sanitizeNickname('12345678901234567890').length <= 12);
});


test('profile account card promotes classroom economy with a lightweight live summary', () => {
  const client = fs.readFileSync(path.join(ROOT, 'account-client.js'), 'utf8');
  const runtime = fs.readFileSync(path.join(ROOT, 'account-ui-runtime.js'), 'utf8');
  const router = fs.readFileSync(path.join(ROOT, 'worker', 'economy.mjs'), 'utf8');
  const student = fs.readFileSync(path.join(ROOT, 'worker', 'economy-v3-student.mjs'), 'utf8');

  assert.match(client, /kca-economy-card/);
  assert.match(client, />학급경제 </);
  assert.match(client, /\/api\/economy\/summary/);
  assert.match(client, /근무일지 제출 필요/);
  assert.match(client, /직업 전용 업무가 열려 있어요/);
  assert.doesNotMatch(client, />💰 지갑</);
  assert.match(runtime, /kca-economy-card/);

  assert.match(router, /\/api\/economy\/summary/);
  assert.match(router, /studentEconomySummary/);
  assert.match(student, /export async function studentEconomySummary/);
  assert.match(student, /economy_job_capabilities/);
  assert.match(student, /workLogDue/);
});

test('student sessions renew lazily and account sync is deduplicated across open tabs', () => {
  const server = fs.readFileSync(path.join(ROOT, 'worker', 'accounts.mjs'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'account-client.js'), 'utf8');

  assert.match(server, /SESSION_MAX_AGE_SEC = 400 \* 24 \* 60 \* 60/);
  assert.match(server, /SESSION_REFRESH_WINDOW_SEC = 180 \* 24 \* 60 \* 60/);
  assert.match(server, /refreshStudentSessionIfNeeded/);
  assert.match(server, /DELETE FROM student_sessions WHERE expires_at <= \?/);
  assert.match(server, /set-cookie': makeSessionCookie\(auth\.token\)/);

  assert.match(client, /SHARED_SYNC_META_KEY/);
  assert.match(client, /SYNC_LOCK_NAME/);
  assert.match(client, /navigator\.locks\?\.request/);
  assert.match(client, /claimFallbackSyncLease/);
  assert.match(client, /stateSignature/);
});

