const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=rel=>fs.readFileSync(path.join(process.cwd(),rel),'utf8');

test('Wordris v2 is registered as a solo language puzzle',()=>{
  const catalog=JSON.parse(read('data/games.json'));
  const game=catalog.games.find(g=>g.id==='low_wordris');
  assert.ok(game);
  assert.equal(game.href,'games/low_wordris/index.html?v=2');
  assert.equal(game.subject,'language');
  assert.equal(game.genre,'puzzle');
  assert.deepEqual(game.players,['solo']);
  assert.ok(game.input.includes('touch'));
  assert.ok(game.input.includes('keyboard'));
});

test('Wordris v2 uses manual clearing, hold, prefix hints and duplicate blocking',()=>{
  const html=read('games/low_wordris/index.html');
  const js=read('games/low_wordris/game.js');
  const words=read('games/low_wordris/words.js');
  assert.match(html,/data-game-id="low_wordris"/);
  assert.match(html,/words\.js\?v=2/);
  assert.match(html,/game\.js\?v=2/);
  assert.match(html,/id="holdBtn"/);
  assert.match(html,/id="readyWords"/);
  assert.match(html,/id="prefixHints"/);
  assert.match(js,/function clearWord\(item\)/);
  assert.match(js,/function holdCurrent\(\)/);
  assert.match(js,/prefixNext/);
  assert.match(js,/boardVowelRatio\(\)/);
  assert.match(js,/used\.has\(item\.word\)/);
  assert.match(js,/chainEligible/);
  assert.match(js,/applyGravity\(\)/);
  assert.match(js,/LENGTH_MULTIPLIER/);
  assert.match(js,/rerolls=Math\.min\(3,rerolls\+1\)/);
  assert.match(words,/WORDRIS_WORD_COUNT/);
});

test('Wordris student dictionary is substantially expanded',()=>{
  const words=read('games/low_wordris/words.js');
  const pairs=[...words.matchAll(/\["([a-z]+)","([^"]*)"\]/g)];
  assert.ok(pairs.length>=550,'expected at least 550 curated words');
  const keys=new Set(pairs.map(m=>m[1]));
  for(const word of ['cat','apple','school','teacher','science','penguin','computer','birthday']){
    assert.ok(keys.has(word),word+' should be in Wordris dictionary');
  }
});
