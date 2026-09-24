const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sdk = require('../kidscade-game-sdk.js');

const ROOT = path.resolve(__dirname, '..');

test('Game SDK exposes the stable v1 contract', () => {
  assert.equal(sdk.VERSION, 1);
  for (const name of ['init','start','pause','resume','registerPauseHandlers','sound','setMuted','score','gameOver','restart','exit','state']) {
    assert.equal(typeof sdk[name], 'function', `${name} must be a function`);
  }
});

test('Game SDK creates registered namespaced storage keys', () => {
  assert.equal(sdk.cleanToken('High Disaster City!!'), 'high-disaster-city');
  assert.equal(
    sdk.storageKey('high_disaster_city', 'best score'),
    'kidscade_game_v1:high_disaster_city:best-score'
  );
  assert.throws(() => sdk.storageKey('', 'best'));
});

test('Game SDK source never broadcasts iframe messages with wildcard origin', () => {
  const source = fs.readFileSync(path.join(ROOT, 'kidscade-game-sdk.js'), 'utf8');
  assert.doesNotMatch(source, /postMessage\([^\n]+['"]\*['"]\)/);
  assert.match(source, /kidscade:close-game/);
  assert.match(source, /kidscade:game-event/);
});

test('storage registry owns the Game SDK dynamic namespace', () => {
  const storage = require('../kidscade-storage.js');
  assert.equal(storage.prefixes.gameSdkV1, 'kidscade_game_v1:');
  assert.equal(storage.isRegisteredPhysicalKey('kidscade_game_v1:high_disaster_city:best'), true);
});
