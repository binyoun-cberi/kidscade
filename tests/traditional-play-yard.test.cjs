const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'games', 'toddler_traditional_play_yard', '우리나라 전통놀이 마당.html'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'games.json'), 'utf8'));
const game = catalog.games.find(item => item.id === 'toddler_traditional_play_yard');

test('traditional play yard stays registered as an easy toddler social playground', () => {
  assert.ok(game);
  assert.equal(game.age, 'toddler');
  assert.equal(game.subject, 'social');
  assert.equal(game.genre, 'sports');
  assert.equal(game.difficulty, 'easy');
  assert.match(game.href, /toddler_traditional_play_yard\/우리나라 전통놀이 마당\.html\?v=3/);
});

test('reworked yard is an explorable space with Kidscade avatar support', () => {
  assert.match(html, /id="yard"/);
  assert.match(html, /id="player"/);
  assert.match(html, /kidscade-avatar-studio-preview/);
  assert.match(html, /function movePlayer\(/);
  assert.match(html, /data-game="tuho"/);
  assert.match(html, /data-game="jegi"/);
  assert.match(html, /data-game="hop"/);
});

test('first phase minigames use three different direct interactions', () => {
  assert.match(html, /function renderTuho\(/);
  assert.match(html, /pointerdown',down/);
  assert.match(html, /function renderJegi\(/);
  assert.match(html, /data-foot="L"/);
  assert.match(html, /data-foot="R"/);
  assert.match(html, /function renderHop\(/);
  assert.match(html, /stoneDown/);
  assert.match(html, /elementFromPoint/);
  assert.match(html, /돌이 있는 칸은 건너뛰어요/);
});

test('progression unlocks hopscotch after one stamp and grows yard rewards', () => {
  assert.match(html, /id!=='hop'\|\|state\.stamps\.length>=1/);
  assert.match(html, /state\.coins\+=3/);
  assert.match(html, /state\.coins\+=1/);
  assert.match(html, /decor1/);
  assert.match(html, /decor2/);
  assert.match(html, /decor3/);
});

test('traditional play inline runtime compiles', () => {
  const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(match, 'inline game script missing');
  assert.doesNotThrow(() => new Function(match[1]));
});
