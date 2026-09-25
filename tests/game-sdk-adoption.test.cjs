const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const adopters = [
  ['high_folklore_night_guard', 'games/high_folklore_night_guard/index.html'],
  ['low_word_blaster', 'games/low_word_blaster/index.html'],
  ['high_bridge_builder', 'games/high_bridge_builder/index.html'],
  ['high_seed_volleyball', 'games/high_seed_volleyball/index.html']
];

test('first Game SDK adopters load the shared shell from source', () => {
  for (const [id, file] of adopters) {
    const html = read(file);
    assert.match(html, /kidscade-game-sdk\.js/, `${id} must load the SDK`);
    assert.match(html, new RegExp(`data-game-id=["']${id}["']`), `${id} must identify itself`);
    assert.match(html, /data-shell=["']true["']/, `${id} must enable the common shell`);
  }
});

test('Folklore Night Guard no longer broadcasts close requests to wildcard origins', () => {
  const html = read('games/high_folklore_night_guard/index.html');
  assert.doesNotMatch(html, /postMessage\(\{type:'kidscade:close-game'\},'\*'\)/);
  assert.match(html, /KidscadeGame\?\.exit/);
  assert.match(html, /KidscadeGame\?\.start/);
  assert.match(html, /KidscadeGame\?\.gameOver/);
});

test('Word Blaster reports lifecycle through the SDK', () => {
  const word = read('games/low_word_blaster/word-blaster.js');
  assert.match(word, /KidscadeGame\?\.start/);
  assert.match(word, /KidscadeGame\?\.gameOver/);
});

test('Emergency City stays on its standalone canvas runtime', () => {
  const html = read('games/high_disaster_city/index.html');
  const main = read('games/high_disaster_city/main.js');
  assert.doesNotMatch(html, /kidscade-game-sdk\.js/);
  assert.doesNotMatch(main, /KidscadeGame/);
});
