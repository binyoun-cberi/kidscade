const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'ui-information-architecture.js'), 'utf8');

function position(text) {
  const found = index.indexOf(text);
  assert.notEqual(found, -1, `missing ${text}`);
  return found;
}

test('information architecture layer loads before the bootstrap rewrites the lobby', () => {
  const ia = position('ui-information-architecture.js');
  const bootstrap = position('main-bootstrap.js');
  assert.ok(ia < bootstrap, 'IA layer must start before the asynchronous lobby bootstrap');
});

test('mobile primary navigation exposes the four intended destinations', () => {
  assert.match(source, /data-mobile-nav=\"games\"/);
  assert.match(source, /data-mobile-nav=\"profile\"/);
  assert.match(source, /data-mobile-nav=\"growth\"/);
  assert.match(source, /data-mobile-nav=\"search\"/);
  assert.match(source, />내 프로필</);
  assert.match(source, />쑥쑥랜드</);
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

test('growth modal no longer presents profile wording or tab duplication', () => {
  assert.match(source, /#pet-modal \.sook-main-tabs \{ display:none !important; \}/);
  assert.match(source, /room: \['🌱 쑥쑥랜드', '쑥쑥랜드'\]/);
  assert.match(source, /missions: \['🎯 오늘의 미션', '오늘의 미션'\]/);
  assert.match(source, /recommend: \['💬 게임 추천', '게임 추천'\]/);
});
