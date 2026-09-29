const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const indexPath=path.join(root,'games','high_seed_futsal','index.html');
const gamePath=path.join(root,'games','high_seed_futsal','game.js');

test('Seed Futsal ships as a valid catalog game',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(item=>item.id==='high_seed_futsal');
  assert.ok(game);
  assert.equal(game.genre,'sports');
  assert.equal(game.href,'games/high_seed_futsal/index.html?v=1');
  assert.deepEqual(game.input,['touch','keyboard']);
});

test('Seed Futsal source parses and uses a horizontal 5v5 pitch',()=>{
  const source=fs.readFileSync(gamePath,'utf8');
  assert.doesNotThrow(()=>new vm.Script(source));
  assert.match(source,/FIELD_W=1500,FIELD_H=840/);
  assert.match(source,/GOAL_Y1=FIELD_H\/2-GOAL_HALF/);
  assert.match(source,/makePlayer\(HOME,4,'PIVOT'/);
  assert.match(source,/makePlayer\(AWAY,4,'PIVOT'/);
  assert.match(source,/team===HOME\?FIELD_W:0/);
  assert.match(source,/function switchPlayer\(/);
  assert.match(source,/function performPass\(/);
  assert.match(source,/function performShot\(/);
});

test('Seed Futsal is integrated with the shared game SDK',()=>{
  const html=fs.readFileSync(indexPath,'utf8');
  assert.match(html,/data-game-id="high_seed_futsal"/);
  assert.match(html,/data-orientation="landscape"/);
  assert.match(html,/data-action="pass"/);
  assert.match(html,/data-action="through"/);
  assert.match(html,/data-action="shoot"/);
});
