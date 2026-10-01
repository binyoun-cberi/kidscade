const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname,'..');
const gamePath = path.join(root,'games','job_takoyaki_simulator','빙글빙글 타코야키집.html');

test('takoyaki shop is available to preschool players',()=>{
  const catalog = JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game = catalog.games.find(item=>item.id==='job_takoyaki_simulator');
  assert.ok(game);
  assert.equal(game.age,'toddler');
  assert.deepEqual(game.ages,['toddler','job']);
  assert.equal(game.difficulty,'easy');
});

test('takoyaki shop unlocks exactly one hole from 1 through 12',()=>{
  const html = fs.readFileSync(gamePath,'utf8');
  const matches = [...html.matchAll(/\{day:(\d+), duration:\d+, holes:(\d+), queueMax:1/g)]
    .map(match=>({day:Number(match[1]),holes:Number(match[2])}));
  assert.equal(matches.length,12);
  for(let i=1;i<=12;i++){
    assert.deepEqual(matches[i-1],{day:i,holes:i});
  }
  assert.match(html,/kidscade_takoyaki_holes_v1/);
  assert.match(html,/game\.dayServed >= 1/);
  assert.match(html,/saveUnlockedHoles\(12\)/);
});
