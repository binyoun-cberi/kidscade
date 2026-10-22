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

test('takoyaki shop grows by four-hole rows, then unlocks a second recipe pan',()=>{
  const html = fs.readFileSync(gamePath,'utf8');
  const matches = [...html.matchAll(/\{day:(\d+), duration:\d+, holes:(\d+), queueMax:(\d+)/g)]
    .map(match=>({day:Number(match[1]),holes:Number(match[2]),queueMax:Number(match[3])}));
  // The special pan is a fourth stage with its own four cooking positions.
  assert.deepEqual(matches,[{day:1,holes:4,queueMax:1},{day:2,holes:8,queueMax:2},{day:3,holes:12,queueMax:2}]);
  assert.match(html,/\{day:4, duration:130, holes:12, specialHoles:4, queueMax:2/);
  assert.match(html,/kidscade_takoyaki_holes_v1/);
  assert.match(html,/game\.dayServed >= 1/);
  assert.match(html,/saveProgress\(12,true\)/);
  assert.match(html,/type==='shrimp'\|\|type==='corn'/);
  assert.match(html,/panTabs/);
  assert.match(html,/slotAssistToggle/);
  assert.match(html,/function selectOrder\(id\)/);
  assert.match(html,/function showDeliveryFeedback\(/);
});
