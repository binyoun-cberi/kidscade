const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const gameDir=path.join(ROOT,'games','high_body_muscle_lab');
const html=fs.readFileSync(path.join(gameDir,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(gameDir,'game.js'),'utf8');
const css=fs.readFileSync(path.join(gameDir,'style.css'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data','games.json'),'utf8'));

test('keeps the stable Kidscade id and local Three r160 runtime',()=>{
  assert.match(html,/data-game-id="high_body_muscle_lab"/);
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/type="module" src="game\.js\?v=7"/);
  assert.doesNotMatch(html+runtime,/postMessage\([^\n]+['"]\*['"]\)/);
});

test('3D rework uses procedural articulated fighters and xray anatomy overlays',()=>{
  assert.match(runtime,/new THREE\.WebGLRenderer/);
  assert.match(runtime,/createFighter/);
  assert.match(runtime,/computeKinematics/);
  assert.match(runtime,/leftBiceps/);
  assert.match(runtime,/rightTriceps/);
  assert.match(runtime,/leftOblique/);
  assert.match(runtime,/대퇴사두근·둔근/);
  assert.match(runtime,/applyXray/);
  assert.match(html,/id="xrayBtn"/);
});

test('world time is derived from actual body motion instead of key presses',()=>{
  assert.match(runtime,/state\.prevPose=\{\.\.\.state\.pose\}/);
  assert.match(runtime,/const speed=realDt>0\?d\/realDt:0/);
  assert.match(runtime,/state\.worldScale=state\.impactBoost>0\?1:\(speed<\.035\?0:/);
  assert.match(runtime,/updateEnemy\(realDt\*state\.worldScale\)/);
  assert.match(html,/몸이 움직일 때만/);
});

test('muscles are press-to-contract release-to-relax with keyboard and touch',()=>{
  for(const key of ['q','w','e','r','a','d','s','f'])assert.match(html,new RegExp('data-key="'+key+'"'));
  assert.match(runtime,/pointerdown/);
  assert.match(runtime,/pointerup/);
  assert.match(runtime,/keydown/);
  assert.match(runtime,/keyup/);
  assert.match(css,/touch-action:none/);
});

test('combat actions are consequences of muscle-driven pose, not action buttons',()=>{
  assert.doesNotMatch(html,/data-action="(?:punch|guard|dodge)"/);
  assert.match(runtime,/guardFlex/);
  assert.match(runtime,/state\.pose\.crouch/);
  assert.match(runtime,/state\.pose\.lean/);
  assert.match(runtime,/resolvePlayerPunch/);
  assert.match(runtime,/resolveEnemyAttack/);
  assert.match(runtime,/flex<\.18&&speed>\.55/);
  assert.match(runtime,/state\.enemy\.phase==='recover'/);
});

test('first stage gives explicit guard-counter guidance and highlights the recommended muscle',()=>{
  assert.match(html,/id="firstGuide"/);
  assert.match(runtime,/firstRoundControls/);
  assert.match(runtime,/firstRoundRecommendation/);
  assert.match(runtime,/counterKey/);
  assert.match(css,/muscle\.recommended/);
});

test('camera is first-person from the player's head while self head and torso are hidden',()=>{
  assert.match(runtime,/PerspectiveCamera\(70/);
  assert.match(runtime,/playerVisual\.head\.visible=false/);
  assert.match(runtime,/playerVisual\.torso\.visible=false/);
  assert.match(runtime,/const eye=worldPos\(playerVisual\.root,playerVisual\.lastKin\.head\)/);
  assert.match(runtime,/camera\.lookAt\(target\)/);
});

test('progressively unlocks arms, trunk and legs across three opponents',()=>{
  assert.match(html,/data-unlock="0"/);
  assert.match(html,/data-unlock="1"/);
  assert.match(html,/data-unlock="2"/);
  assert.match(runtime,/팔의 길항근/);
  assert.match(runtime,/몸통 회피/);
  assert.match(runtime,/온몸 카운터/);
  assert.match(runtime,/feint:\.38/);
});

test('catalog describes the 3D slow-motion science action game',()=>{
  const game=catalog.games.find(x=>x.id==='high_body_muscle_lab');
  assert.ok(game);
  assert.equal(game.href,'games/high_body_muscle_lab/index.html?v=8');
  assert.equal(game.subject,'science');
  assert.equal(game.genre,'sports');
  assert.equal(game.classroom,true);
  assert.deepEqual(game.input,['touch','keyboard']);
  assert.match(game.description,/3D/);
  assert.match(game.description,/움직/);
  assert.match(game.description,/근육/);
});
