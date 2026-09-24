const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'games', 'toddler_traditional_play_yard', '우리나라 전통놀이 마당.html'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'games.json'), 'utf8'));
const game = catalog.games.find(item => item.id === 'toddler_traditional_play_yard');

test('traditional play yard stays registered as a toddler social game', () => {
  assert.ok(game);
  assert.equal(game.age, 'toddler');
  assert.equal(game.subject, 'social');
  assert.match(game.href, /toddler_traditional_play_yard\/우리나라 전통놀이 마당\.html\?v=2/);
});

test('traditional play yard keeps six distinct mini games and SDK integration', () => {
  for (const id of ['tuho','jegi','ddakji','hop','flower','yut']) {
    assert.match(html, new RegExp("id:'" + id + "'"));
  }
  assert.match(html, /kidscade-game-sdk\.js/);
  assert.match(html, /KidscadeGame\.exit\(\)/);
  assert.match(html, /kidscade_game_v1:toddler_traditional_play_yard:progress/);
});

test('jegi, ddakji and yut use distinct play interactions', () => {
  assert.match(html, /jegiHitLine/);
  assert.match(html, /var wave=\(Math\.sin\(phase\)\+1\)\/2/);
  assert.doesNotMatch(html, /id="jegiMarker"/);
  assert.match(html, /power>=42&&power<=78/);
  assert.match(html, /pointerdown',start/);
  assert.match(html, /function showFaces\(n\)/);
  assert.match(html, /id="yutResult"/);
});

test('traditional play inline runtime compiles', () => {
  const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(match, 'inline game script missing');
  assert.doesNotThrow(() => new Function(match[1]));
});
