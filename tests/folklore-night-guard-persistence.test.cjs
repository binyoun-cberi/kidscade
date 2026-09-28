'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'games/high_folklore_night_guard/index.html'), 'utf8');

test('Folklore Night Guard uses persistent ghost locations instead of spawn events', () => {
  assert.match(html, /function initializePersistentGhosts\(\)/);
  assert.match(html, /state\.roamers=\{reaper:null,wolf:null\}/);
  assert.match(html, /function movementRoll\(id\)/);
  assert.match(html, /function cameraFeedLive\(cam\)/);
  assert.doesNotMatch(html, /state\.corridor/);
  assert.doesNotMatch(html, /function spawn(?:Dokkaebi|Yuki|Maiden|Egg|Corridor)\(/);
});

test('Folklore Night Guard keeps resource pressure and random blackout survival', () => {
  assert.match(html, /var rates=\[\.018,\.050,\.110,\.205,\.345,\.560\]/);
  assert.match(html, /function beginBlackout\(\)/);
  assert.match(html, /blackoutKillAt=Math\.max\(3\.2,11\.5-hour\*\.85\+Math\.random\(\)\*7\.5\)/);
  assert.match(html, /if\(state\.elapsed>=state\.duration\)\{win\(\)/);
});

test('camera switching static blocks active tracking until the feed is live', () => {
  assert.match(html, /cam-switching/);
  assert.match(html, /var watching=cameraFeedLive\(loc\)/);
  assert.match(html, /var staring=cameraFeedLive\(e\.cam\)/);
  assert.match(html, /var watched=cameraFeedLive\(r\.location\)/);
});


test('Night Guard horror presentation uses staged atmosphere', () => {
  assert.match(html, /id="ambientLayer"/);
  assert.match(html, /id="presenceLayer"/);
  assert.match(html, /id="signalIntrusion"/);
  assert.match(html, /function nightVisualPhase\(\)/);
  assert.match(html, /function triggerSignalIntrusion\(\)/);
  assert.match(html, /function presenceAsset\(id,cam,stage\)/);
  assert.match(html, /room-scene\.night-phase-3/);
  assert.match(html, /ghost-wolf\.threat-0/);
  assert.match(html, /ghost-reaper\.pre/);
  assert.match(html, /ghost-yuki\.pre/);
});
