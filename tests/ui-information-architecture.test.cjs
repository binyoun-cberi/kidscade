const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'ui-information-architecture.js'), 'utf8');
const accountGate = fs.readFileSync(path.join(ROOT, 'account-profile-gate.js'), 'utf8');

function position(text) {
  const found = index.indexOf(text);
  assert.notEqual(found, -1, `missing ${text}`);
  return found;
}

test('information architecture and account profile gate load before bootstrap', () => {
  const ia = position('ui-information-architecture.js');
  const account = position('account-client.js');
  const gate = position('account-profile-gate.js');
  const bootstrap = position('main-bootstrap.js');
  assert.ok(ia < bootstrap, 'IA layer must start before the asynchronous lobby bootstrap');
  assert.ok(account < gate, 'profile gate needs the account client API first');
  assert.ok(gate < bootstrap, 'profile gate must survive the asynchronous lobby bootstrap');
});

test('mobile primary navigation exposes the four intended destinations', () => {
  assert.match(source, /data-mobile-nav=\"games\"/);
  assert.match(source, /data-mobile-nav=\"profile\"/);
  assert.match(source, /data-mobile-nav=\"growth\"/);
  assert.match(source, /data-mobile-nav=\"search\"/);
  assert.match(source, />내 프로필</);
  assert.match(source, />Cube Pets</);
  assert.match(source, />찾기</);
});

test('missions and recommendations are promoted to arcade activity tools', () => {
  assert.match(source, /kc-activity-strip/);
  assert.match(source, /🎯 오늘의 미션/);
  assert.match(source, /💬 게임 추천/);
  assert.match(source, /#sidebar-mission-card \{ display:none !important; \}/);
});

test('profile identity and play record have separate labels', () => {
  assert.match(source, /PROFILE/);
  assert.match(source, /내 프로필/);
  assert.match(source, /게스트 프로필/);
  assert.match(source, /PLAY RECORD/);
  assert.match(source, /나의 플레이 기록/);
  assert.match(source, /닉네임 수정/);
});

test('guest profile is reduced to a login gate and play records stay hidden', () => {
  assert.match(accountGate, /로그인하고 내 프로필 열기/);
  assert.match(accountGate, /학생 계정 로그인/);
  assert.match(accountGate, /게임은 게스트로 바로 즐길 수 있어요/);
  assert.match(accountGate, /data-kc-profile-access=\"guest\"/);
  assert.match(accountGate, /#kc-local-profile-card\{display:none!important\}/);
  assert.match(accountGate, /\.avatar-plaza/);
  assert.match(accountGate, /KidscadeAccount/);
  assert.match(accountGate, /\.login\?\.\(\)/);
});

test('guest mobile view defaults to games and profile navigation opens only the login gate', () => {
  assert.match(accountGate, /kcGuestMobileSection = 'games'/);
  assert.match(accountGate, /target === 'profile'/);
  assert.match(accountGate, /kcGuestMobileSection = 'profile'/);
  assert.match(accountGate, /data-kc-guest-mobile-section=\"games\"/);
  assert.match(accountGate, /data-kc-guest-mobile-section=\"profile\"/);
});

test('signed-in play record copy describes account synchronization', () => {
  assert.match(accountGate, /data-kc-profile-access=\"account\"/);
  assert.match(accountGate, /학생 계정에 동기화해요/);
});

test('growth modal no longer presents profile wording or tab duplication', () => {
  assert.match(source, /#pet-modal \.sook-main-tabs \{ display:none !important; \}/);
  assert.match(source, /room: \['🐾 Cube Pets 월드', 'Cube Pets 월드'\]/);
  assert.match(source, /missions: \['🎯 오늘의 미션', '오늘의 미션'\]/);
  assert.match(source, /recommend: \['💬 게임 추천', '게임 추천'\]/);
});
