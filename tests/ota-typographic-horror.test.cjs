const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const R = require('../games/high_ota_typographic_horror/rules.js');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'games/high_ota_typographic_horror');

test('horror prologue requires discovery before monster chase', () => {
  const s = R.initialState();
  assert.equal(s.stage, 'console');
  assert.equal(R.triggerMonster(s, { x: 0, z: -16 }), false);
  assert.equal(R.inspectConsole(s, { x: 0, z: 5 }), false);
  assert.equal(R.inspectConsole(s, { x: -2.1, z: 2 }), true);
  assert.equal(R.objective(s), '복도에서 이상한 글자를 조사하세요');
  assert.equal(R.triggerMonster(s, { x: 0, z: -15 }), false);
  assert.equal(R.triggerMonster(s, { x: 0, z: -16 }), true);
  assert.equal(s.monster.active, true);
});

test('chase has a losing path, but locker prevents capture', () => {
  const p = { x: 0, z: -16 };
  const losing = R.initialState();
  R.inspectConsole(losing, R.CONSOLE);
  R.triggerMonster(losing, p);
  for (let i = 0; i < 250 && losing.stage === 'chase'; i++) R.stepEnemy(losing, .05, p);
  assert.equal(losing.stage, 'lost');
  assert.equal(losing.losses, 1);

  const s = R.initialState();
  R.inspectConsole(s, R.CONSOLE);
  R.triggerMonster(s, p);
  assert.equal(R.enterLocker(s, { x: 0, z: -17 }), false);
  assert.equal(R.enterLocker(s, R.LOCKERS[0]), true);
  assert.equal(s.hidden, true);
  assert.equal(R.leaveLocker(s), false);
  for (let i=0;i<95;i++) R.stepEnemy(s,.05,R.LOCKERS[0]);
  assert.equal(s.stage, 'door');
  assert.equal(s.monster.active, false);
  assert.equal(R.leaveLocker(s), true);
  assert.equal(s.hidden, false);
});

test('wrong words cannot open the door, but correct word changes collision and allows escape', () => {
  const s = R.initialState();
  R.inspectConsole(s, R.CONSOLE);
  R.triggerMonster(s, { x:0,z:-16 });
  R.enterLocker(s, R.LOCKERS[0]);
  for(let i=0;i<100;i++)R.stepEnemy(s,.05,R.LOCKERS[0]);
  R.leaveLocker(s);
  assert.equal(R.canMove(s,0,-30.15),false);
  assert.equal(R.repairDoor(s,'문',{x:2,z:-20}),false);
  assert.equal(R.repairDoor(s,'벽',R.DOOR),false);
  assert.equal(s.mistakes,1);
  assert.equal(R.repairDoor(s,'문',R.DOOR),true);
  assert.equal(s.doorFixed,true);
  assert.equal(R.canMove(s,0,-30.15),true);
  assert.equal(R.canMove(s,2.5,-30.15),false);
  assert.equal(R.tryFinish(s,{x:0,z:-31}),false);
  assert.equal(R.tryFinish(s,{x:0,z:-35.5}),true);
  assert.equal(s.stage,'won');
});

test('interaction prompts match the reachable objective', () => {
  const s=R.initialState();
  assert.equal(R.getInteraction(s,R.CONSOLE).type,'console');
  R.inspectConsole(s,R.CONSOLE);
  R.triggerMonster(s,{x:0,z:-16});
  assert.equal(R.getInteraction(s,R.LOCKERS[0]).type,'hide');
  R.enterLocker(s,R.LOCKERS[0]);
  for(let i=0;i<100;i++)R.stepEnemy(s,.05,R.LOCKERS[0]);
  assert.equal(R.getInteraction(s,R.LOCKERS[0]).type,'leave');
  R.leaveLocker(s);
  assert.equal(R.getInteraction(s,R.DOOR).type,'repair');
});

test('render code remains parseable, local-only and catalogued for older players', () => {
  const source=fs.readFileSync(path.join(dir,'game.js'),'utf8');
  new vm.Script(source.replace(/^import \* as THREE from 'three';/,''));
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  assert.match(html,/type="importmap"/);
  assert.match(html,/src="rules.js"/);
  assert.match(html,/src="game.js"/);
  assert.doesNotMatch(html,/(?:https?:)?\/\/cdn\./);
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/games.json'),'utf8'));
  const entry=catalog.games.find(game=>game.id==='high_ota_typographic_horror');
  assert.ok(entry);
  assert.equal(entry.age,'high');
  assert.equal(entry.classroom,false);
  assert.equal(entry.href,'games/high_ota_typographic_horror/index.html');
});
