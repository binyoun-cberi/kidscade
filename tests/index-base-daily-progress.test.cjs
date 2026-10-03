const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('index_base loads daily state and daily UI after the shared wallet state', () => {
  const html = read('index_base.html');
  const wallet = html.indexOf('<script src="seed-wallet.js"></script>');
  const daily = html.indexOf('<script src="daily-progress.js"></script>');
  const dailyUi = html.indexOf('<script src="daily-ui.js"></script>');
  assert.ok(wallet >= 0, 'seed-wallet.js script tag is missing');
  assert.ok(daily > wallet, 'daily-progress.js must load after seed-wallet.js');
  assert.ok(dailyUi > daily, 'daily-ui.js must load after daily-progress.js');
});

test('mission UI and rewards delegate to KidscadeDailyUI', () => {
  const html = read('index_base.html');
  assert.match(html, /KidscadeDailyUI\.renderDailyMissions/);
  assert.match(html, /KidscadeDailyUI\.updateMissionProgress/);
  assert.doesNotMatch(html, /function\s+getTodayMissionState\s*\(/);
  assert.doesNotMatch(html, /function\s+buildTodayMissionState\s*\(/);
  assert.doesNotMatch(html, /function\s+saveTodayMissionState\s*\(/);
  assert.doesNotMatch(html, /mission\.progress \+= 1/);
});

test('daily reward and attendance UI delegate to KidscadeDailyUI', () => {
  const html = read('index_base.html');
  assert.match(html, /KidscadeDailyUI\.claimDailyReward/);
  assert.match(html, /KidscadeDailyUI\.checkAttendance/);
  assert.doesNotMatch(html, /attendanceRewardPending/);
  assert.doesNotMatch(html, /localStorage\.setItem\('kidscade_attendance'/);
  assert.doesNotMatch(html, /localStorage\.setItem\('kidscade_daily_reward_claimed'/);
});

test('bootstrap cache-busts daily state and UI modules', () => {
  const bootstrap = read('main-bootstrap.js');
  assert.match(bootstrap, /withVersion\('daily-progress\.js'\)/);
  assert.match(bootstrap, /withVersion\('daily-ui\.js'\)/);
});
