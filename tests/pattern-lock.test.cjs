const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','low_pattern_lock');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');

test('Pattern Lock ships the campaign and free-pattern mode',()=>{
  assert.match(html,/<title>패턴 락<\/title>/);
  assert.match(html,/data-game-id="low_pattern_lock"/);
  assert.match(js,/const LEVELS=\[/);
  assert.match(js,/kind:'sequence'/);
  assert.match(js,/kind:'condition'/);
  assert.match(js,/kind:'repeat'/);
  assert.match(js,/free-create/);
  assert.match(js,/KidscadeStorage/);
});

test('Pattern Lock is registered with discovery metadata',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_pattern_lock');
  assert.ok(game);
  assert.equal(game.title,'패턴 락');
  assert.equal(game.href,'games/low_pattern_lock/index.html?v=1');
  assert.equal(game.subject,'thinking');
  assert.equal(game.genre,'puzzle');
  assert.deepEqual(game.ages,['low','high']);
  assert.equal(game.classroom,true);
});
