const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

test('Rule Lab files are present and scripts parse',()=>{
  for(const rel of [
    'games/high_rule_lab/index.html',
    'games/high_rule_lab/style.css',
    'games/high_rule_lab/levels.js',
    'games/high_rule_lab/game.js'
  ]) assert.ok(fs.existsSync(path.join(ROOT,rel)),rel);
  new vm.Script(read('games/high_rule_lab/levels.js'));
  new vm.Script(read('games/high_rule_lab/game.js'));
});

test('Rule Lab uses the Kidscade game SDK and safe game folder entrypoint',()=>{
  const html=read('games/high_rule_lab/index.html');
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/data-game-id="high_rule_lab"/);
  assert.match(html,/levels\.js/);
  assert.match(html,/game\.js/);
});

test('Rule Lab is registered as a featured thinking puzzle',()=>{
  const catalog=JSON.parse(read('data/games.json'));
  const game=catalog.games.find(g=>g.id==='high_rule_lab');
  assert.ok(game);
  assert.equal(game.href,'games/high_rule_lab/index.html?v=1');
  assert.equal(game.subject,'thinking');
  assert.equal(game.genre,'puzzle');
  assert.equal(game.qualityStatus,'featured');
  assert.deepEqual(game.input,['touch','keyboard']);
});

test('Rule Lab contains a substantial authored stage set and rule vocabulary',()=>{
  const levels=read('games/high_rule_lab/levels.js');
  const stageCount=(levels.match(/\nL\('/g)||[]).length;
  assert.ok(stageCount>=24,'expected at least 24 authored stages');
  for(const token of ['YOU','STOP','PUSH','WIN','DEFEAT','SINK','HOT','MELT','OPEN','SHUT']){
    assert.match(levels,new RegExp(token));
  }
});

test('Rule Lab shared sprite paths point to existing Kidscade assets',()=>{
  for(const rel of [
    'assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',
    'assets/game/2d/racing/kenney-racing-pack/objects/rock3.png',
    'assets/game/2d/platformer-art/base/tiles/brick-wall.png',
    'assets/game/2d/platformer-art/base/tiles/liquid-water-top-mid.png'
  ]) assert.ok(fs.existsSync(path.join(ROOT,rel)),rel);
});
