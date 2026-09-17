const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('index_base loads daily-progress after shared wallet state', () => {
  const html = read('index_base.html');
  const wallet = html.indexOf('<script src="seed-wallet.js"></script>');
  const daily = html.indexOf('<script src="daily-progress.js"></script>');
  assert.ok(wallet >= 0, 'seed-wallet.js script tag is missing');
  assert.ok(daily > wallet, 'daily-progress.js must load after seed-wallet.js');
});

test('mission persistence and progress delegate to KidscadeDaily', () => {
  const html = read('index_base.html');
  assert.match(html, /KidscadeDaily\?\.getMissionState/);
  assert.match(html, /KidscadeDaily\?\.saveMissionState/);
  assert.match(html, /KidscadeDaily\?\.advanceMissions/);
  assert.doesNotMatch(html, /let completedCount = 0;/);
});

test('daily reward and attendance date state delegate to KidscadeDaily', () => {
  const html = read('index_base.html');
  assert.match(html, /KidscadeDaily\?\.isDailyRewardClaimed/);
  assert.match(html, /KidscadeDaily\?\.markDailyRewardClaimed/);
  assert.match(html, /KidscadeDaily\?\.isAttendanceClaimed/);
  assert.match(html, /KidscadeDaily\?\.markAttendanceClaimed/);
  assert.doesNotMatch(html, /const lastAttendance = localStorage\.getItem\('kidscade_attendance'\)/);
});

test('bootstrap cache-busts daily-progress.js', () => {
  const bootstrap = read('main-bootstrap.js');
  assert.match(bootstrap, /withVersion\('daily-progress\.js'\)/);
});
