const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('index_base delegates persistent playtime state to playtime-state.js', () => {
  const html = read('index_base.html');
  assert.match(html, /<script src="playtime-state\.js"><\/script>/);
  assert.match(html, /window\.KidscadePlaytime\?\.addSeconds/);
  assert.match(html, /window\.KidscadePlaytime\?\.render\?\.\(\)/);
  assert.doesNotMatch(html, /function\s+loadPlayTimeSeconds\s*\(/);
  assert.doesNotMatch(html, /function\s+persistPlayTime\s*\(/);
  assert.doesNotMatch(html, /function\s+updatePlayTimeDisplay\s*\(/);
  assert.doesNotMatch(html, /\bupdatePlayTimeDisplay\s*\(/);
  assert.doesNotMatch(html, /function\s+syncPlayTimeFromStorage\s*\(/);
  assert.doesNotMatch(html, /\blet\s+totalPlayTimeSec\b/);
});

test('bootstrap cache-busts playtime-state.js with the shared runtime version', () => {
  const source = read('main-bootstrap.js');
  assert.match(source, /withVersion\('playtime-state\.js'\)/);
});
