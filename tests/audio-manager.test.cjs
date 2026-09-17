const test = require('node:test');
const assert = require('node:assert/strict');
const audio = require('../audio-manager.js');

test('audio manager exposes stable semantic aliases', () => {
  assert.equal(audio.resolveKey('jump'), 'movement.jump');
  assert.equal(audio.resolveKey('correct'), 'success.cheer_yay');
  assert.equal(audio.resolveKey('victory'), 'success.victory_fanfare');
  assert.equal(audio.resolveKey('combat.impact_heavy'), 'combat.impact_heavy');
});

test('audio catalog normalization accepts arrays and single paths', () => {
  const normalized = audio.normalizeCatalog({
    version: 3,
    basePath: 'assets/audio/',
    sounds: {
      jump: ['a.mp3', '', null],
      hit: 'b.mp3'
    }
  });
  assert.equal(normalized.version, 3);
  assert.deepEqual(normalized.sounds.jump, ['a.mp3']);
  assert.deepEqual(normalized.sounds.hit, ['b.mp3']);
});

test('audio variant chooser is deterministic with injected random source', () => {
  const variants = ['a', 'b', 'c'];
  assert.equal(audio.choose(variants, () => 0), 'a');
  assert.equal(audio.choose(variants, () => 0.5), 'b');
  assert.equal(audio.choose(variants, () => 0.999), 'c');
  assert.equal(audio.choose([], () => 0.5), '');
});

test('audio settings have safe defaults outside a browser', () => {
  assert.deepEqual(audio.getSettings(), { muted: false, volume: 0.82 });
});
