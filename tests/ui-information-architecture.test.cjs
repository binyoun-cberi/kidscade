const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'ui-information-architecture.js'), 'utf8');
const accountGate = fs.readFileSync(path.join(ROOT, 'account-profile-gate.js'), 'utf8');
const avatarIntegration = fs.readFileSync(path.join(ROOT, 'avatar-integration.js'), 'utf8');
const sessionSafety = fs.readFileSync(path.join(ROOT, 'account-session-safety.js'), 'utf8');

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

test('mobile primary navigation exposes only games profile and search', () => {
  assert.match(source, /data-mobile-nav=\"games\"/);
  assert.match(source, /data-mobile-nav=\"profile\"/);
  assert.match(source, /data-mobile-nav=\"search\"/);
  assert.doesNotMatch(source, /data-mobile-nav=\"growth\"/);
  assert.match(source, />내 프로필</);
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

test('guest profile keeps the avatar visible while play records stay account-only', () => {
  assert.match(accountGate, /게스트 아바타로 바로 체험 중/);
  assert.match(accountGate, /기본 아바타가 바로 제공돼요/);
  assert.match(accountGate, /학생 계정 로그인/);
  assert.match(accountGate, /\.avatar-plaza\{display:block!important\}/);
  assert.match(accountGate, /\.kc-profile-row\{display:none!important\}/);
  assert.match(accountGate, /#kc-local-profile-card\{display:none!important\}/);
  assert.match(accountGate, /shell\.querySelector\('\.avatar-plaza'\)/);
  assert.match(accountGate, /KidscadeAccount/);
  assert.match(accountGate, /\.login\?\.\(\)/);
});

test('guest receives a default v2 avatar without opening the heavy studio iframe', () => {
  assert.match(avatarIntegration, /GUEST_DEFAULT_CONFIG/);
  assert.match(avatarIntegration, /hairSet:'male', hairStyle:1, upper:1, lower:1/);
  assert.match(avatarIntegration, /AVATAR_RIG_RUNTIME_URL = 'pixel-avatar-renderer\.js\?v=12'/);
  assert.match(avatarIntegration, /function ensureGuestDefaultPreview/);
  assert.match(avatarIntegration, /api\.create\(canvas, \{ playing:false, config:guestConfigFromPixelState\(\) \}\)/);
  assert.match(avatarIntegration, /PREVIEW_VERSION = 'pixel-v2-rig-hairfit-2'/);
  assert.match(avatarIntegration, /localStorage\.removeItem\(PREVIEW_KEY\)/);
  assert.match(avatarIntegration, /guestConfigFromPixelState/);
  assert.match(avatarIntegration, /localStorage\.setItem\(PREVIEW_KEY, data\)/);
  assert.match(avatarIntegration, /localStorage\.setItem\(PREVIEW_VERSION_KEY, PREVIEW_VERSION\)/);
  assert.match(sessionSafety, /localStorage\.removeItem\('kidscade-pixel-avatar-v1'\)/);
  assert.match(sessionSafety, /localStorage\.removeItem\('kidscade-avatar-studio-preview'\)/);
  assert.match(sessionSafety, /localStorage\.removeItem\('kidscade-avatar-studio-preview-version'\)/);
});

test('guest mobile view defaults to games and profile navigation opens the guest avatar area', () => {
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
  assert.match(source, /room: \['🌱 씨앗 월드', '씨앗 월드'\]/);
  assert.match(source, /missions: \['🎯 오늘의 미션', '오늘의 미션'\]/);
  assert.match(source, /recommend: \['💬 게임 추천', '게임 추천'\]/);
});