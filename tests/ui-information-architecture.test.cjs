const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const bootstrap = fs.readFileSync(path.join(ROOT, 'main-bootstrap.js'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'ui-information-architecture.js'), 'utf8');
const accountGate = fs.readFileSync(path.join(ROOT, 'account-profile-gate.js'), 'utf8');
const avatarIntegration = fs.readFileSync(path.join(ROOT, 'avatar-integration.js'), 'utf8');
const sessionSafety = fs.readFileSync(path.join(ROOT, 'account-session-safety.js'), 'utf8');

function position(text, haystack = bootstrap) {
  const found = haystack.indexOf(text);
  assert.notEqual(found, -1, `missing ${text}`);
  return found;
}

test('information architecture and account profile gate load in final-document dependency order', () => {
  assert.doesNotMatch(index, /ui-information-architecture\.js|account-client\.js|account-profile-gate\.js/);
  assert.match(index, /main-bootstrap\.js/);
  const ia = position('ui-information-architecture.js');
  const account = position('account-client.js');
  const gate = position('account-profile-gate.js');
  assert.ok(ia >= 0);
  assert.ok(account < gate, 'profile gate needs the account client API first');
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
  assert.match(avatarIntegration, /hairId:'clean-01', upper:1, lower:1/);
  assert.match(avatarIntegration, /AVATAR_RIG_RUNTIME_URL = 'pixel-avatar-renderer\.js\?v=22'/);
  assert.match(avatarIntegration, /function ensureGuestDefaultPreview/);
  assert.match(avatarIntegration, /api\.create\(canvas, \{ playing:false, config:guestConfigFromPixelState\(\) \}\)/);
  assert.match(avatarIntegration, /PREVIEW_VERSION = 'pixel-v2-rig-haircatalog-1'/);
  assert.match(avatarIntegration, /localStorage\.removeItem\(PREVIEW_KEY\)/);
  assert.match(avatarIntegration, /guestConfigFromPixelState/);
  assert.match(avatarIntegration, /hairId:typeof pixel\.hairId === 'string'/);
  assert.doesNotMatch(avatarIntegration, /hairSet:pixel\.hairSet/);
  assert.match(avatarIntegration, /localStorage\.setItem\(PREVIEW_KEY, data\)/);
  assert.match(avatarIntegration, /localStorage\.setItem\(PREVIEW_VERSION_KEY, PREVIEW_VERSION\)/);
  assert.match(sessionSafety, /localStorage\.removeItem\('kidscade-pixel-avatar-v1'\)/);
  assert.match(sessionSafety, /localStorage\.removeItem\('kidscade-avatar-studio-preview'\)/);
  assert.match(sessionSafety, /localStorage\.removeItem\('kidscade-avatar-studio-preview-version'\)/);
});

test('profile avatar preview is static to avoid sub-pixel mobile jitter', () => {
  assert.match(avatarIntegration, /stable static main-card preview/);
  assert.match(avatarIntegration, /if \(liveRaf\) cancelAnimationFrame\(liveRaf\)/);
  assert.match(avatarIntegration, /liveImg\.style\.transform = 'translateX\(-50%\)'/);
  assert.doesNotMatch(avatarIntegration, /function startLivePreview\(\) \{\s*if \(!liveRaf\) liveRaf = requestAnimationFrame\(liveLoop\)/);
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