const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(ROOT, 'ui-visual-polish.js'), 'utf8');

function position(text) {
  const found = index.indexOf(text);
  assert.notEqual(found, -1, `missing ${text}`);
  return found;
}

test('visual polish layer loads after information architecture and before bootstrap', () => {
  const ia = position('ui-information-architecture.js');
  const polish = position('ui-visual-polish.js');
  const bootstrap = position('main-bootstrap.js');
  assert.ok(ia < polish, 'visual polish must layer on top of the IA pass');
  assert.ok(polish < bootstrap, 'visual polish must be ready before the async lobby bootstrap');
});

test('mobile play record can collapse secondary detail without removing totals', () => {
  assert.match(source, /kc-vp-record-toggle/);
  assert.match(source, /kc-vp-record-collapsed/);
  assert.match(source, /내가 많이 한 게임\|최근 플레이/);
  assert.match(source, /상세 기록 보기/);
  assert.match(source, /간단히 보기/);
});

test('second pass tightens profile, activity, ranking, and game card visuals', () => {
  assert.match(source, /\.kc-side-card\.avatar-shell/);
  assert.match(source, /#kc-activity-strip/);
  assert.match(source, /\.kc-popular-panel/);
  assert.match(source, /#game-list > \.game-card/);
  assert.match(source, /\.game-card\.kc-has-cover \.game-cover-shell/);
});

test('mobile navigation and modal keep safe viewport spacing', () => {
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /#main-app \{ padding-bottom:70px/);
  assert.match(source, /height:calc\(100dvh - 10px\)/);
});
