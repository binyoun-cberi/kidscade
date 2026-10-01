const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=rel=>fs.readFileSync(path.join(process.cwd(),rel),'utf8');

test('Wordris is registered as a solo language puzzle',()=>{
  const catalog=JSON.parse(read('data/games.json'));
  const game=catalog.games.find(g=>g.id==='low_wordris');
  assert.ok(game);
  assert.equal(game.href,'games/low_wordris/index.html?v=1');
  assert.equal(game.subject,'language');
  assert.equal(game.genre,'puzzle');
  assert.deepEqual(game.players,['solo']);
  assert.ok(game.input.includes('touch'));
  assert.ok(game.input.includes('keyboard'));
});

test('Wordris loads the SDK, dictionary, duplicate rule, gravity and combo loop',()=>{
  const html=read('games/low_wordris/index.html');
  const js=read('games/low_wordris/game.js');
  const words=read('games/low_wordris/words.js');
  assert.match(html,/data-game-id="low_wordris"/);
  assert.match(html,/words\.js\?v=1/);
  assert.match(html,/game\.js\?v=1/);
  assert.match(js,/used\.has\(c\.word\)/);
  assert.match(js,/applyGravity\(\)/);
  assert.match(js,/WORD COMBO/);
  assert.match(words,/WORDRIS_WORDS/);
  assert.match(words,/\['cat','고양이'\]/);
});