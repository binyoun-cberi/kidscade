const test = require('node:test');
const assert = require('node:assert/strict');
const frame = require('../game-frame-shell.js');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../game-frame-shell.js'), 'utf8');

test('common game frame formats concise start metadata', () => {
  assert.deepEqual(frame.formatMetadata({
    input:['touch','keyboard'],
    sessionMinutes:15,
    difficulty:'medium',
    players:['solo','local2']
  }), [
    { icon:'🎮', label:'터치 · 키보드' },
    { icon:'⏱️', label:'약 15분' },
    { icon:'◆', label:'보통' },
    { icon:'👥', label:'혼자 · 2인' }
  ]);
});

test('common game frame exposes start, retry, error and state APIs', () => {
  assert.equal(frame.LOAD_TIMEOUT_MS, 15000);
  for (const name of ['open','start','reload','showError','cancel','reset','isPending','isPlaying','getState']) {
    assert.equal(typeof frame[name], 'function', `${name} must be available`);
  }
  assert.equal(frame.getState().status, 'idle');
});


test('common game frame silences child and shared audio before iframe disposal', () => {
  assert.match(source, /function\s+silenceFrameAudio\s*\(/);
  assert.match(source, /kidscade:game-exit/);
  assert.match(source, /querySelectorAll\?\.\('audio,video'\)/);
  assert.match(source, /KidscadeAudio\?\.stopAll/);
  assert.match(source, /silenceFrameAudio\(refs\.iframe, 'reset'\)/);
  assert.match(source, /silenceFrameAudio\(refs\.iframe, 'reload'\)/);
});
