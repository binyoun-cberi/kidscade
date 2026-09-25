const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('blind elephant is registered as a short solo science quiz',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(process.cwd(),'data/games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='low_blind_elephant');
  assert.ok(game);
  assert.equal(game.href,'games/low_blind_elephant/index.html?v=1');
  assert.equal(game.subject,'science');
  assert.equal(game.genre,'quiz');
  assert.equal(game.sessionMinutes,3);
  assert.deepEqual(game.input,['touch','keyboard']);
  assert.deepEqual(game.players,['solo']);
});

test('blind elephant keeps the two-minute five-second clue loop and enough animals',()=>{
  const js=fs.readFileSync(path.join(process.cwd(),'games/low_blind_elephant/game.js'),'utf8');
  assert.match(js,/ROUND_MS=120000/);
  assert.match(js,/CLUE_MS=5000/);
  assert.match(js,/WRONG_PENALTY_MS=3000/);
  const animalCount=(js.match(/name:'/g)||[]).length;
  assert.ok(animalCount>=45,'expected at least 45 authored animals');
  assert.match(js,/mode==='easy'/);
  assert.match(js,/VALID_NAMES/);
});