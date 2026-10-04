const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sdk = require('../kidscade-game-sdk.js');

const ROOT = path.resolve(__dirname, '..');

test('Game SDK exposes the stable v1 contract', () => {
  assert.equal(sdk.VERSION, 1);
  for (const name of ['init','start','pause','resume','registerPauseHandlers','registerCleanup','dispose','sound','setMuted','score','result','milestone','gameOver','achievement','achievementProgress','achievementIncrement','restart','exit','state']) {
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


test('Game SDK exposes a fatal error channel without stack payloads', () => {
  assert.equal(sdk.ERROR_TYPE, 'kidscade:game-error');
  assert.equal(typeof sdk.reportError, 'function');
  const source = fs.readFileSync(path.join(ROOT, 'kidscade-game-sdk.js'), 'utf8');
  assert.match(source, /kidscade:game-error/);
  assert.match(source, /installErrorReporting/);
  assert.doesNotMatch(source, /stack:\s*error/);
});


test('Game SDK defers shell mounting when loaded before document.body exists', () => {
  const source = fs.readFileSync(path.join(ROOT, 'kidscade-game-sdk.js'), 'utf8');
  assert.match(source, /if \(!root\.document\.body\)/);
  assert.match(source, /DOMContentLoaded/);
  assert.match(source, /scheduleShellMount/);
});

test('Game SDK handles the shared game-exit cleanup lifecycle', () => {
  const source = fs.readFileSync(path.join(ROOT, 'kidscade-game-sdk.js'), 'utf8');
  assert.match(source, /kidscade:game-exit/);
  assert.match(source, /function registerCleanup\(/);
  assert.match(source, /function dispose\(/);
  assert.match(source, /cleanupHandlers\.clear\(\)/);
});


test('Game SDK achievement helpers use the common event channel', () => {
  const source = fs.readFileSync(path.join(ROOT, 'kidscade-game-sdk.js'), 'utf8');
  assert.match(source, /function achievement\(/);
  assert.match(source, /function achievementProgress\(/);
  assert.match(source, /function achievementIncrement\(/);
  assert.match(source, /emit\('achievement'/);
});


test('Game SDK exposes structured result and milestone events without redefining legacy gameOver', () => {
  const source = fs.readFileSync(path.join(ROOT, 'kidscade-game-sdk.js'), 'utf8');
  assert.match(source, /function result\(detail = \{\}\)/);
  assert.match(source, /function milestone\(name, detail = \{\}\)/);
  assert.match(source, /emit\('result'/);
  assert.match(source, /emit\('milestone'/);
  assert.match(source, /RESULT_SCOPES/);
  assert.match(source, /RESULT_STATUSES/);
  assert.match(source, /RESULT_OUTCOMES/);
  assert.match(source, /function gameOver\(detail = \{\}\)/);
});
