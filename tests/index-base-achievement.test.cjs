const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index_base.html', 'utf8');
const bootstrap = fs.readFileSync('main-bootstrap.js', 'utf8');

test('index_base loads the achievement state module', () => {
  assert.match(html, /<script src="achievement-state\.js"><\/script>/);
});

test('rank and score inspection delegates to the common achievement module', () => {
  assert.match(html, /KidscadeAchievements\?\.inspect/);
  assert.match(html, /KidscadeAchievements\?\.markRewardClaimed/);
  assert.doesNotMatch(html, /let claimedRanks = safeParseStorage\('kidscade_claimed_ranks'/);
});

test('bootstrap cache-busts achievement-state with the common runtime version', () => {
  assert.match(bootstrap, /withVersion\('achievement-state\.js'\)/);
});
