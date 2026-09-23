const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','low_cleanup_squad');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'cleanup-squad.js'),'utf8');

test('Cleanup Squad files expose tutorial and local Three runtime',()=>{
  assert.match(html,/청소 특공대/);
  assert.match(html,/튜토리얼부터/);
  assert.match(html,/three-r160\/three\.module\.js/);
  assert.match(runtime,/function startTutorial\(/);
  assert.match(runtime,/function startGame\(/);
  assert.match(runtime,/function stunVillain\(/);
  assert.match(runtime,/assets\/game\/3d\/word-blaster\/blaster\.glb/);
  assert.match(runtime,/assets\/game\/food\/soda-can\.glb/);
});

test('Cleanup Squad is registered in game catalog',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_cleanup_squad');
  assert.ok(game);
  assert.equal(game.title,'청소 특공대');
  assert.match(game.href,/games\/low_cleanup_squad\/index\.html/);
  assert.equal(game.age,'low');
});
