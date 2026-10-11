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
  assert.equal(R.objective(s), '복도 안쪽으로 이동해 이상한 「사람」을 확인하세요');
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
  assert.equal(s.stage, 'distortion');
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
  assert.equal(R.leaveLocker(s),true);
  assert.equal(R.canMove(s,0,-25.85),false);
  assert.equal(R.repairCorridor(s,'문',{x:2.9,z:-10}),false);
  assert.equal(R.repairCorridor(s,'통로',R.CORRIDOR),true);
  assert.equal(s.stage,'door');
  assert.equal(s.corridorFixed,true);
  assert.equal(R.canMove(s,0,-25.85),true);
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
  assert.equal(R.getInteraction(s,R.CORRIDOR).type,'corridor');
  assert.equal(R.getInteraction(s,R.DOOR),null);
  R.repairCorridor(s,'통로',R.CORRIDOR);
  assert.equal(R.getInteraction(s,R.DOOR).type,'repair');
});

test('shifting wall cannot be bypassed at the edges and errors never advance the state',()=>{
  const s=R.initialState();
  R.inspectConsole(s,R.CONSOLE);
  R.triggerMonster(s,{x:0,z:-16});
  R.enterLocker(s,R.LOCKERS[0]);
  for(let i=0;i<100;i++)R.stepEnemy(s,.05,R.LOCKERS[0]);
  R.leaveLocker(s);
  for(const x of [-2.8,-1,0,1,2.8])assert.equal(R.canMove(s,x,-25.85),false);
  assert.equal(R.repairCorridor(s,'벽',R.CORRIDOR),false);
  assert.equal(s.stage,'distortion');
  assert.equal(s.mistakes,1);
  assert.equal(R.repairCorridor(s,'통로',R.CORRIDOR),true);
  assert.equal(R.canMove(s,0,-25.85),true);
  for(const x of [-2.8,2.8])assert.equal(R.canMove(s,x,-25.85),false);
});
test('the Echo hears sprinting but not walking or standing still',()=>{
  const make=()=>{const s=R.initialState();s.stage='distortion';R.repairCorridor(s,'통로',R.CORRIDOR);return s;};
  const walking=make();
  for(let i=0;i<220;i++)R.stepEcho(walking,.05,{moving:true,running:false});
  assert.equal(walking.stage,'door');
  assert.equal(walking.echo.alert,0);
  const caught=make();
  for(let i=0;i<180&&caught.stage!=='lost';i++)R.stepEcho(caught,.05,{moving:true,running:true});
  assert.equal(caught.stage,'lost');
  assert.equal(caught.losses,1);
  const stopped=make();
  for(let i=0;i<35;i++)R.stepEcho(stopped,.05,{moving:true,running:true});
  assert.ok(stopped.echo.alert>0,'sprinting raises alert');
  for(let i=0;i<100;i++)R.stepEcho(stopped,.05,{moving:false,running:false});
  assert.equal(stopped.echo.alert,0,'stopping clears alert');
  assert.equal(stopped.stage,'door');
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


test('void rendering hides room grids while corrupted words flicker',()=>{
  const source=fs.readFileSync(path.join(dir,'game.js'),'utf8');
  assert.match(source,/scene\.background = new THREE\.Color\(0x000000\)/);
  assert.match(source,/scene\.fog = new THREE\.FogExp2\(0x000000/);
  assert.doesNotMatch(source,/stamp\(['"](?:벽|바닥|천장)/);
  assert.doesNotMatch(source,/trimMat/);
  assert.match(source,/function hauntedLabel\(/);
  assert.match(source,/updateHauntedWords\(elapsed,corruptorSource/);
  assert.match(source,/hauntedLabel\('아무것도 없다'[^\n]*'여기 있다'/);
});
